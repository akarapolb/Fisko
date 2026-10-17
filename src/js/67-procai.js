// Fisko Procurement round 16 (P4 of the detailed design): AI use cases for procurement. The prototype uses
// rules and statistics only, with no model call (version "rules-1"). Every use is logged in the M09 AI log,
// respects the agent switches in M09, and follows the design's limits: AI reads and drafts, a person decides.
// It never scores or ranks bidders, never announces a winner or selects a supplier, and never approves anything.
let AI_CASE = null, AI_RES = {}, AI_TOR = "", AI_DOCT = "tor", AI_Q = "";
const AI_VER = "rules-1";
const AI_AGENTS = [["AG-07", ["Procurement Drafting Agent", "Procurement Drafting Agent"], ["ร่าง TOR คำสั่งแต่งตั้ง ใบตรวจรับ หนังสือ และเสนอราคากลางพร้อมหลักฐาน", "Drafts TORs, orders, certificates and letters, and proposes reference prices with evidence"]],
  ["AG-08", ["Contract Monitoring Agent", "Contract Monitoring Agent"], ["เตือนงานล่าช้า สัญญาและหลักประกันใกล้ครบกำหนด และร่างหนังสือเร่งรัด", "Warns of late work and contracts or guarantees nearing expiry, and drafts reminders"]],
  ["AG-10", ["Procurement Insight Agent", "Procurement Insight Agent"], ["ตอบคำถามและสรุปข้อมูลจัดซื้อจากชั้นความหมายของ Analytics และสรุปผลงานผู้ขาย", "Answers questions and summarises procurement data from the analytics layer and supplier record"]]];
function seedAI(s) {
  AI_AGENTS.forEach(([id, name, what]) => { if (!s.agents.some(a => a.id === id)) s.agents.push({ id, on: true, uses: 0, name, what }); });
  s.aiDrafts = [];
}
const aiLog = (agent, action, target, sources, ok = true) => S.aiLog.unshift({ t: nowIso(), agent, user: me().id, action, target, sources, ok, ver: AI_VER });
const aiOff = (id, name) => { if (agentOn(id)) return false; toast(L(`${name} ถูกปิดใช้งานใน M09`, `${name} is switched off in M09`)); return true; };
const bigrams = t => { const s = String(t).replace(/\s+/g, ""), g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; };
const jacc = (a, b) => { const A = bigrams(a), B = bigrams(b); let i = 0; A.forEach(x => B.has(x) && i++); return A.size + B.size - i ? i / (A.size + B.size - i) : 0; };

// ---------- the rules behind each use case ----------
function aiConsolidate() {
  const items = S.pplan.map(p => ({ p, n: tx(p.name), u: famLine(p.line).unit })), out = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j], sim = jacc(a.n, b.n);
    if (a.p.kind === b.p.kind && (sim >= 0.45 || a.u === b.u && a.p.kind === "goods")) out.push({ a: a.p, b: b.p, sim, same: a.u === b.u, total: a.p.est + b.p.est, over: a.p.est <= S.pcfg.specificMax && b.p.est <= S.pcfg.specificMax && a.p.est + b.p.est > S.pcfg.specificMax });
  }
  return out;
}
function aiRefPrice(c) {
  const p = famPlan(c.plan), peers = S.contracts.filter(x => { const cs = caseByPlan(x.plan); return cs && cs.kind === c.kind && x.plan !== c.plan; }).map(x => ({ id: x.id, name: tx(famPlan(x.plan).name), amount: x.base || x.amount, rel: (x.base || x.amount) / famPlan(x.plan).est }));
  const rels = peers.map(x => x.rel), center = med(rels), est = p.est;
  return { peers, n: peers.length, low: peers.length ? Math.round(est * Math.min(...rels) / 1e3) * 1e3 : null, mid: peers.length ? Math.round(est * center / 1e3) * 1e3 : null, high: peers.length ? Math.round(est * Math.max(...rels) / 1e3) * 1e3 : null, est, basis: peers.length ? ["contract"] : [] };
}
const SPEC_WORDS = /ยี่ห้อ|รุ่น|เฉพาะ.{0,6}เท่านั้น|เท่านั้น|brand|model no|only|exclusively|sole/gi, MODEL_CODE = /\b[A-Z][A-Za-z]{1,}[- ]?[A-Z]?\d{2,}[A-Za-z]?\b/g;
function aiSpecCheck(text) {
  const hits = [], add = (re, why) => { let m; re.lastIndex = 0; while ((m = re.exec(text))) hits.push({ at: m.index, frag: text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20).replace(/\s+/g, " "), why }); };
  add(SPEC_WORDS, ["คำที่อาจล็อกสเปก (ยี่ห้อ รุ่น เท่านั้น)", "Wording that may lock the spec (brand, model, only)"]); add(MODEL_CODE, ["รหัสรุ่นเฉพาะผู้ผลิต", "Manufacturer-specific model code"]);
  const equiv = /เทียบเท่า|equivalent|or equal/i.test(text);
  return { hits, equiv, ok: !hits.length || equiv && hits.length < 2 };
}
const DOCS_BY_METHOD = { specific: [["ใบขอซื้อขอจ้าง", "Requisition"], ["ใบเสนอราคา", "Quotation"], ["รายงานผลการพิจารณา", "Result report"]], ebid: [["TOR", "TOR"], ["ราคากลางพร้อมแหล่งอ้างอิง", "Reference price with basis"], ["คำสั่งแต่งตั้งคณะกรรมการ TOR", "TOR committee order"], ["ประกาศใน e-GP", "e-GP announcement"], ["คำสั่งแต่งตั้งคณะกรรมการพิจารณาผล", "Evaluation committee order"], ["รายงานผลและมติ", "Result report and resolution"]],
  selective: [["เหตุผลการใช้วิธีคัดเลือก", "Reason for the selective method"], ["คำสั่งแต่งตั้งคณะกรรมการซื้อหรือจ้าง", "Purchasing committee order"]], emarket: [["รายการในแคตตาล็อก", "Catalogue item"]] };
function aiDelay(c, ph) {
  const reasons = []; let s = 0, d = dayDiff(TODAY, phDue(ph));
  if (d < 0) { s += 50; reasons.push([`เลยกำหนด ${-d} วัน`, `${-d} days overdue`]); } else if (d <= 7) { s += 30; reasons.push([`ครบกำหนดใน ${d} วัน`, `due in ${d} days`]); } else if (d <= 21) { s += 15; reasons.push([`ครบกำหนดใน ${d} วัน`, `due in ${d} days`]); }
  if (!ph.delivered && d <= 14) { s += 15; reasons.push(["ยังไม่มีการแจ้งส่งมอบ", "no delivery notice yet"]); }
  const prev = c.phases.filter(x => x.n < ph.n && phLate(x) > 0); if (prev.length) { s += 20; reasons.push([`งวดก่อนหน้าล่าช้า ${prev.length} งวด`, `${prev.length} earlier phase(s) were late`]); }
  const vh = S.contracts.filter(x => tx(x.vendor) === tx(c.vendor) && x.id !== c.id && conPenalty(x) > 0); if (vh.length) { s += 15; reasons.push(["ผู้ขายเคยถูกปรับในสัญญาอื่น", "the supplier was fined on another contract"]); }
  if (guarSt(c) === "expiring" || guarSt(c) === "expired") { s += 10; reasons.push(["หลักประกันใกล้หมดอายุ", "guarantee close to expiry"]); }
  return { s: Math.min(100, s), reasons };
}
function aiAnswer(q) {
  const t = q.toLowerCase(), no = /(ให้คะแนน|จัดอันดับ|ประกาศผู้ชนะ|เลือกผู้ขาย|อนุมัติ|rank|score the bid|pick the winner|select the supplier|approve|award)/.test(t);
  if (no) return { ok: false, text: L("AI ไม่ให้คะแนนหรือจัดอันดับข้อเสนอ ไม่เลือกผู้ขาย ไม่ประกาศผู้ชนะ และไม่อนุมัติ เป็นหน้าที่ของคณะกรรมการและผู้มีอำนาจ", "AI does not score or rank bids, pick a supplier, announce a winner or approve anything. That is for the committee and the authorised person."), src: [] };
  const map = [[/แข่งขัน|competi|เฉพาะเจาะจง|specific/, "KPI-05"], [/รายเดียว|single/, "KPI-06"], [/ผู้ยื่น|bidder/, "KPI-07"], [/ราคากลาง|ประหยัด|reference|saving/, "KPI-08"], [/โต|เพิ่มวงเงิน|growth|variation/, "KPI-09"], [/ตรงเวลา|ล่าช้า|on.?time|late|delay/, "KPI-10"], [/ค่าปรับ|penalt/, "KPI-11"], [/ตรวจรับ.*เวลา|acceptance time/, "KPI-12"], [/กระจุก|ผู้ขาย.*ส่วนแบ่ง|concentrat|hhi/, "KPI-13"], [/ครบถ้วน|e-gp|complete/, "KPI-14"], [/เวลา|นาน|step|days/, "KPI-03"], [/แผน|plan/, "KPI-01"]];
  const hit = map.find(([re]) => re.test(t)); if (!hit) return { ok: false, text: L("คำถามนี้ไม่อยู่ในตัวชี้วัดที่นิยามไว้ (KPI-01 ถึง 14) จึงไม่ตอบแทนการเดา", "This question isn't covered by the defined KPIs (KPI-01 to 14), so I won't guess."), src: [] };
  const k = KPIS.find(x => x[0] === hit[1]), r = k[2]();
  return { ok: true, text: `${tx(k[1])}: ${r.v}`, n: r.n, note: tx(r.note), src: [k[0]] };
}
function aiSupplier(name) {
  const cons = S.contracts.filter(c => tx(c.vendor) === name);
  return { name, n: cons.length, value: sumv(cons.map(c => c.amount)), pen: sumv(cons.map(conPenalty)), late: sumv(cons.flatMap(c => c.phases.map(phLate))), dissent: cons.flatMap(c => c.phases.flatMap(ph => ph.dissent || [])).length, closed: cons.map(c => caseByPlan(c.plan)).filter(cs => cs && cs.close).map(cs => cs.close.score), vars: cons.flatMap(c => c.vars || []).filter(v => v.status === "approved").length };
}
const DOC_T = { tor: [["ร่าง TOR", "TOR draft"]], order: [["ร่างคำสั่งแต่งตั้งคณะกรรมการ", "Committee order draft"]], cert: [["ร่างใบตรวจรับ", "Acceptance certificate draft"]], letter: [["ร่างหนังสือแจ้งผู้ขาย", "Supplier letter draft"]] };
function aiDraft(c, type) {
  const p = famPlan(c.plan), nm = tx(p.name), con = caseCon(c), amt = fmt(c.ref ? c.ref.amount : p.est);
  if (type === "tor") return `ร่างขอบเขตของงาน (TOR) ${nm}\n1. ความเป็นมา: ตามแผนจัดซื้อจัดจ้างปีงบประมาณ ${FAM_FY} รหัส ${p.id} รายการจัดสรร ${famLine(c.line).id}\n2. วัตถุประสงค์: [ระบุ]\n3. คุณสมบัติของผู้เสนอราคา: [ระบุ]\n4. ขอบเขตและรายละเอียดพัสดุ: [ระบุคุณลักษณะโดยไม่ระบุยี่ห้อ ให้ใช้ "หรือเทียบเท่า"]\n5. ระยะเวลาส่งมอบ: [ระบุ] วัน นับจากวันลงนามสัญญา\n6. วงเงินงบประมาณ: ${fmt(p.est)} บาท ราคากลาง ${amt} บาท\n7. การตรวจรับ: ตามคณะกรรมการตรวจรับที่แต่งตั้ง\n[ร่างจาก AI ต้องให้เจ้าหน้าที่และคณะกรรมการแก้ไขก่อนใช้]`;
  if (type === "order") return `ร่างคำสั่งแต่งตั้งคณะกรรมการ\nที่ [   ]/${FAM_FY}\nเรื่อง แต่งตั้งคณะกรรมการ ${nm} (${c.id})\nอาศัยอำนาจตามระเบียบที่เกี่ยวข้อง จึงแต่งตั้งบุคคลดังต่อไปนี้ เป็นประธาน 1 คน และกรรมการไม่น้อยกว่า 2 คน: [ระบุรายชื่อ]\nสั่ง ณ วันที่ ${fdate(TODAY)}\n[ร่างจาก AI ตรวจรายชื่อให้ไม่ขัดแย้งกับ SD-06 ก่อนลงนาม]`;
  if (type === "cert") return `ร่างใบตรวจรับพัสดุ\nสัญญาเลขที่ ${con ? con.no : "[   ]"} ${nm}\nผู้ขาย ${con ? tx(con.vendor) : "[   ]"}\nคณะกรรมการตรวจรับได้ตรวจรับงวดที่ [   ] แล้ว ผลการตรวจ: [ถูกต้องครบถ้วน / รับบางส่วน / ไม่รับ]\nจัดทำ 2 ฉบับ ลงนามโดยกรรมการตรวจรับ\n[ร่างจาก AI ผลตรวจรับต้องมาจากกรรมการ]`;
  const ph = con ? con.phases.find(x => !phaseAccepted(x)) : null;
  return `ร่างหนังสือแจ้งผู้ขาย\nเรื่อง เร่งรัดการส่งมอบ สัญญาเลขที่ ${con ? con.no : "[   ]"} ${nm}\nเรียน ${con ? tx(con.vendor) : "[ผู้ขาย]"}\nตามสัญญา กำหนดส่งมอบ${ph ? ` ${tx(ph.name)} ภายใน ${fdate(phDue(ph))}` : ""} ขอให้ดำเนินการส่งมอบตามกำหนด มิฉะนั้นจะคิดค่าปรับตามสัญญา\nวันที่ ${fdate(TODAY)}\n[ร่างจาก AI ต้องให้เจ้าหน้าที่ตรวจก่อนส่ง]`;
}

// ---------- views ----------
const aiCases = () => S.cases.filter(c => !c.cancelled);
PROC.ai = () => {
  const cs = aiCases(), c = caseOf(AI_CASE) || cs[0], off = id => (agentOn(id) ? "" : tag(L("ปิดอยู่ใน M09", "Off in M09"), "p-bad")), pr = isProcRole() || ROLE === "audit";
  const sec = (title, ag, sub, body) => `<section class="panel"><header><h2>${title}</h2><span class="sp"></span><span class="mono sub">${ag}</span> ${off(ag)}</header><div class="body" style="display:flex;flex-direction:column;gap:10px">${sub ? `<div class="sub">${sub}</div>` : ""}${body}</div></section>`;
  const res = k => (AI_RES[k] ? `<div class="callout" style="margin:0">${AI_RES[k]}</div>` : "");
  const risk = S.contracts.flatMap(x => x.phases.filter(ph => !phaseAccepted(ph)).map(ph => ({ x, ph, r: aiDelay(x, ph) }))).sort((a, b) => b.r.s - a.r.s);
  const stat = S.aiDrafts.length ? `${S.aiDrafts.filter(d => d.edit < 0.3).length}/${S.aiDrafts.length}` : "—";
  const vendors = [...new Set(S.contracts.map(x => tx(x.vendor)))];
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">AI</div><div><b>${L("AI อ่านและร่าง คนตัดสิน", "AI reads and drafts; a person decides")}</b>
    <p>${L("ต้นแบบนี้ใช้กฎและสถิติ ไม่เรียกโมเดลภายนอก (รุ่น rules-1) ทุกการใช้บันทึกใน M09 และปิดเปิดแต่ละ Agent ได้ที่นั่น AI ไม่ให้คะแนนหรือจัดอันดับข้อเสนอ ไม่เลือกผู้ขาย ไม่ประกาศผู้ชนะ ไม่อนุมัติ ไม่เขียนสถานะ 6 ถึง 8 และไม่ส่งข้อมูลลับออกนอกหน่วยงาน", "This prototype uses rules and statistics and calls no outside model (version rules-1). Every use is logged in M09 and each agent can be switched there. AI never scores or ranks bids, selects a supplier, announces a winner, approves, writes in steps 6 to 8 or sends confidential data out.")}</p></div></div>
  <section class="panel"><header><h2>${L("เลือกแฟ้ม", "Choose a case")}</h2></header><div class="body row"><select id="ai-case" aria-label="${L("แฟ้ม", "Case")}">${cs.map(x => `<option value="${x.id}" ${c && x.id === c.id ? "selected" : ""}>${x.id} · ${esc(caseName(x))}</option>`).join("")}</select>${c ? caseStTag(c) : ""}</div></section>
  ${sec(L("AI-01 เสนอรวมความต้องการและเตือนแตกซื้อ", "AI-01 Consolidation and split-purchase watch"), "AG-05", L("เทียบชื่อรายการและหน่วยงานในแผน เสนอรวมซื้อ ไม่ตัดสินว่าผิด", "Compares item names and units in the plan and suggests buying together. It does not judge anyone."), `<div><button class="btn" type="button" id="ai-01" ${pr ? "" : "disabled"}>${L("สแกนแผนจัดซื้อ", "Scan the plan")}</button></div>${res("a01")}`)}
  ${sec(L("AI-03 เสนอราคากลางพร้อมหลักฐาน", "AI-03 Reference price with evidence"), "AG-07", L("อ่านอย่างเดียว ใช้สัญญาเดิมชนิดเดียวกัน ผู้ใช้ต้องกดยืนยันก่อนบันทึกเป็นราคากลาง", "Read-only. Uses past contracts of the same kind. The user must confirm before it becomes the reference price."), `<div><button class="btn" type="button" id="ai-03" ${pr && c ? "" : "disabled"}>${L("เสนอราคากลาง", "Suggest a price")}</button></div>${res("a03")}`)}
  ${sec(L("AI-04 ตรวจความครบถ้วนและข้อความล็อกสเปก", "AI-04 Completeness and spec-lock check"), "AG-02", L("วางข้อความ TOR ระบบชี้ข้อความที่ระบุยี่ห้อหรือรุ่นเฉพาะ เป็นการแนะนำ ไม่ห้าม", "Paste TOR text. It points at wording that names a brand or model. Advice only; nothing is blocked."),
    `<textarea id="ai-tor" rows="4" placeholder="${L("วางข้อความ TOR ที่นี่", "Paste TOR text here")}" style="width:100%">${esc(AI_TOR)}</textarea><div class="row"><button class="btn" type="button" id="ai-04" ${pr ? "" : "disabled"}>${L("ตรวจ TOR และแฟ้ม", "Check the TOR and case")}</button><button class="btn ghost" type="button" id="ai-04s">${L("ใส่ข้อความตัวอย่าง", "Insert sample text")}</button></div>${res("a04")}`)}
  ${sec(L("AI-05 แนะนำวิธีจัดซื้อและเอกสารที่ต้องมี", "AI-05 Method advice and required documents"), "AG-02", L("ใช้กฎจากตารางใน M10 ไม่ใช้โมเดลเรียนรู้", "Uses the rules table in M10; no learned model."), `<div><button class="btn" type="button" id="ai-05" ${pr && c ? "" : "disabled"}>${L("แนะนำวิธี", "Advise the method")}</button></div>${res("a05")}`)}
  ${sec(L("AI-07 เตือนความเสี่ยงงานล่าช้า", "AI-07 Late-delivery risk"), "AG-08", L("คะแนน 0-100 พร้อมเหตุผล จากกำหนดส่งมอบ ประวัติงวดและผู้ขาย", "A 0-100 score with reasons, from due dates and the phase and supplier history."),
    `<div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา / งวด", "Contract / phase")}</th><th class="n">${L("ความเสี่ยง", "Risk")}</th><th>${L("เหตุผล", "Why")}</th><th></th></tr></thead><tbody>${risk.map(({ x, ph, r }) => `<tr><td><span class="mono">${x.id}</span> ${tx(ph.name)}<div class="sub">${esc(tx(x.vendor))}</div></td><td class="n"><b>${r.s}</b></td><td class="sub">${r.reasons.map(z => tx(z)).join(" · ") || "—"}</td><td>${pr && r.s >= 15 ? `<button class="btn" type="button" data-ailtr="${x.id}">${L("ร่างหนังสือเร่งรัด", "Draft reminder")}</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">—</td></tr>`}</tbody></table></div>${res("a07")}`)}
  ${sec(L("AI-02 / AI-11 ร่างเอกสาร", "AI-02 / AI-11 Draft documents"), "AG-07", L("ร่างให้คนแก้ ระบบเก็บร่างของ AI และฉบับสุดท้ายเพื่อวัดว่าแก้มากแค่ไหน", "Drafts for a person to edit. The AI draft and the final text are both kept so the amount of editing can be measured."),
    `<div class="row"><select id="ai-dt" aria-label="${L("ชนิดเอกสาร", "Document")}">${Object.keys(DOC_T).map(k => `<option value="${k}" ${k === AI_DOCT ? "selected" : ""}>${tx(DOC_T[k][0])}</option>`).join("")}</select><button class="btn" type="button" id="ai-02" ${pr && c ? "" : "disabled"}>${L("สร้างร่าง", "Create a draft")}</button></div>
    ${AI_RES.draft ? `<textarea id="ai-draft" rows="9" style="width:100%">${esc(AI_RES.draft)}</textarea><div class="row"><button class="btn primary" type="button" id="ai-use">${L("ยืนยันใช้ฉบับนี้", "Confirm and use this version")}</button><span class="sub">${L("แก้ไขได้ก่อนกดยืนยัน", "Edit before confirming")}</span></div>` : ""}
    <div class="sub">${L("ใช้ร่างโดยไม่แก้มาก", "Drafts used with little editing")}: <b>${stat}</b> · ${S.aiDrafts.length} ${L("ฉบับที่ยืนยันแล้ว", "confirmed drafts")}</div>`)}
  ${sec(L("AI-09 ถามข้อมูลจัดซื้อ", "AI-09 Ask about procurement data"), "AG-10", L("ตอบจากตัวชี้วัดที่นิยามไว้เท่านั้น พร้อมแหล่งที่มา ไม่คำนวณเอง", "Answers only from the defined KPIs, with the source. It doesn't calculate on its own."),
    `<div class="row"><input type="text" id="ai-q" value="${esc(AI_Q)}" placeholder="${L("เช่น มีผู้ยื่นรายเดียวกี่ส่วน", "For example: how often is there a single bidder?")}" style="flex:1 1 260px"><button class="btn" type="button" id="ai-09">${L("ถาม", "Ask")}</button></div>${res("a09")}`)}
  ${sec(L("AI-10 สรุปผลงานผู้ขาย", "AI-10 Supplier record summary"), "AG-10", L("สรุปจากข้อมูลที่ยืนยันแล้ว ไม่ตัดสินและไม่จัดอันดับผู้ขาย", "Summarises confirmed data. It does not judge or rank suppliers."),
    `<div class="row"><select id="ai-v" aria-label="${L("ผู้ขาย", "Supplier")}">${vendors.map(v => `<option>${esc(v)}</option>`).join("")}</select><button class="btn" type="button" id="ai-10" ${vendors.length ? "" : "disabled"}>${L("สรุป", "Summarise")}</button></div>${res("a10")}`)}`;
};

// ---------- actions ----------
function bindAI() {
  const c = () => caseOf($("#ai-case").value) || aiCases()[0], show = (k, html) => { AI_RES[k] = html; route(); };
  const sel = $("#ai-case"); if (sel) sel.onchange = () => { AI_CASE = sel.value; AI_RES = {}; route(); };
  const keep = () => { const t = $("#ai-tor"); if (t) AI_TOR = t.value; };
  const run = (id, name, fn) => { if (aiOff(id, name)) return; fn(); commit(); };
  const b01 = $("#ai-01"); if (b01) b01.onclick = () => run("AG-05", "Budget Monitoring Agent", () => { const r = aiConsolidate(); aiLog("AG-05", ["สแกนหารายการควรรวมซื้อและแตกซื้อ", "Scanned for items to combine and split purchases"], "PLAN", r.length);
    show("a01", r.length ? `<ul class="check">${r.map(x => `<li><span class="m ${x.over ? "no" : "wa"}">${x.over ? "!" : "~"}</span><div>${x.a.id} + ${x.b.id} · ${esc(tx(x.a.name))} / ${esc(tx(x.b.name))}<div class="sub">${L("คล้ายกัน", "similarity")} ${fmt(x.sim * 100)}% · ${x.same ? L("หน่วยเดียวกัน", "same unit") : L("ต่างหน่วย", "different units")} · ${L("รวม", "together")} ${fmt(x.total)} ${L("บาท", "baht")}${x.over ? ` · <b>${L("แต่ละรายการไม่เกินเพดาน แต่รวมเกิน เสนอรวมซื้อหรือชี้แจง (R-02)", "each is under the ceiling but together they pass it; consider combining or explaining (R-02)")}</b>` : ""}</div></div></li>`).join("")}</ul>` : `<span class="sub">${L("ไม่พบรายการที่ควรรวม", "Nothing to combine")}</span>`); });
  const b03 = $("#ai-03"); if (b03) b03.onclick = () => run("AG-07", "Procurement Drafting Agent", () => { const k = c(), r = aiRefPrice(k); aiLog("AG-07", ["เสนอราคากลางพร้อมหลักฐาน", "Suggested a reference price with evidence"], k.id, r.n);
    show("a03", r.n ? `<div>${L("ช่วงราคาที่เสนอ", "Suggested range")}: <b>${fmt(r.low)} – ${fmt(r.high)}</b> ${L("บาท", "baht")} · ${L("ค่ากลาง", "middle")} <b>${fmt(r.mid)}</b> <span class="sub">(${L("ประมาณการในแผน", "plan estimate")} ${fmt(r.est)})</span></div><div class="sub">${L("หลักฐาน (สัญญาชนิดเดียวกัน)", "Evidence (contracts of the same kind)")}: ${r.peers.map(x => `${x.id} ${fmt(x.rel * 100, 1)}%`).join(" · ")}</div><div class="sub">${L("ความมั่นใจ ต่ำ: ตัวอย่างน้อย ผู้ใช้ต้องตรวจและบันทึกเอง", "Low confidence: small sample, the user must check and record it")}</div>${isProcRole() && caseState(k) === 4 ? `<div class="row"><button class="btn primary" type="button" id="ai-03use" data-v="${r.mid}">${L("ยืนยันใช้ค่ากลางเป็นราคากลาง", "Confirm: use the middle value as the reference price")}</button></div>` : ""}` : `<span class="sub">${L("ยังไม่มีสัญญาเดิมชนิดเดียวกัน ใช้บัญชีราคามาตรฐานหรือใบเสนอราคา", "No past contract of this kind. Use the standard price list or quotations.")}</span>`); });
  const u03 = $("#ai-03use"); if (u03) u03.onclick = () => { const k = c(); k.ref = { amount: Number(u03.dataset.v), basis: ["contract"], note: `AI-03 ${AI_VER}, confirmed by ${userName(me().id)}`, by: me().id, t: nowIso() }; caseLog(k, "ref", `AI-03 ${fmt(k.ref.amount)}`); audit(["ยืนยันราคากลางที่ AI เสนอ", "Confirmed an AI-suggested reference price"], k.id); AI_RES = {}; commit(); renderShell(); route(); toast(L("บันทึกราคากลางแล้ว", "Reference price recorded")); };
  const b04 = $("#ai-04"); if (b04) b04.onclick = () => { keep(); run("AG-02", "Budget Validation Agent", () => { const k = c(), s = aiSpecCheck(AI_TOR), miss = caseChecks(k).filter(x => !x.ok); aiLog("AG-02", ["ตรวจ TOR และความครบถ้วนของแฟ้ม", "Checked a TOR and case completeness"], k.id, s.hits.length + miss.length);
    show("a04", `<div><b>${L("ข้อความ TOR", "TOR text")}</b></div>${AI_TOR.trim() ? (s.hits.length ? `<ul class="check">${s.hits.slice(0, 8).map(h => `<li><span class="m wa">!</span><div>“${esc(h.frag)}”<div class="sub">${tx(h.why)}</div></div></li>`).join("")}</ul><div class="sub">${s.equiv ? L("มีคำว่า “หรือเทียบเท่า” อยู่ในข้อความ", "The text contains “or equivalent”") : L("ไม่พบคำว่า “หรือเทียบเท่า” ควรเพิ่ม", "No “or equivalent” found; consider adding it")} · ${L("แจ้งคณะกรรมการก่อนส่ง", "tell the committee before it goes out")}</div>` : `<span class="sub">${L("ไม่พบข้อความที่ล็อกสเปก", "No spec-locking wording found")}</span>`) : `<span class="sub">${L("ยังไม่ได้วางข้อความ TOR", "No TOR text pasted")}</span>`}
      <div style="margin-top:6px"><b>${L("ความครบถ้วนของแฟ้มในขั้นนี้", "Case completeness for this step")}</b></div>${miss.length ? `<ul class="check">${miss.map(x => `<li><span class="m no">×</span><div>${esc(x.label)}</div></li>`).join("")}</ul>` : `<span class="sub">${L("ครบตามรายการตรวจของขั้นนี้", "Complete for this step")}</span>`}`); }); };
  const s04 = $("#ai-04s"); if (s04) s04.onclick = () => { AI_TOR = "ขอบเขตงาน: จัดหาเครื่องแม่ข่ายยี่ห้อ Dellon รุ่น PX-4420 เท่านั้น ติดตั้งภายใน 30 วัน"; route(); };
  const b05 = $("#ai-05"); if (b05) b05.onclick = () => run("AG-02", "Budget Validation Agent", () => { const k = c(), r = recommendMethod(k), docs = DOCS_BY_METHOD[r.method] || []; aiLog("AG-02", ["แนะนำวิธีจัดซื้อ", "Advised a procurement method"], k.id, 1);
    show("a05", r.method ? `<div>${L("วิธีที่แนะนำ", "Advised method")}: <b>${tx(PMETHOD[r.method])}</b> ${tag(`${L("กฎ", "Rule")} ${r.rule.id} · ${r.rule.conf}`, r.rule.conf === "A" ? "p-ok" : "p-info")}</div><div class="sub">${esc(tx(r.why))}</div><div class="sub">${L("เอกสารที่ต้องมี", "Documents needed")}: ${docs.map(d => tx(d)).join(" · ")}</div><div class="sub">${L("คำแนะนำเท่านั้น หัวหน้าพัสดุอนุมัติหากเลือกต่างออกไป", "Advice only; the head approves a different choice")}</div>` : `<span class="sub">${esc(tx(r.why))}</span>`); });
  $$("[data-ailtr]").forEach(b => (b.onclick = () => run("AG-08", "Contract Monitoring Agent", () => { const con = famCon(b.dataset.ailtr), k = caseByPlan(con.plan); aiLog("AG-08", ["ร่างหนังสือเร่งรัดการส่งมอบ", "Drafted a delivery reminder"], con.id, 1); AI_DOCT = "letter"; AI_CASE = k.id; AI_RES = { draft: aiDraft(k, "letter") }; route(); })));
  const dt = $("#ai-dt"); if (dt) dt.onchange = () => { AI_DOCT = dt.value; };
  const b02 = $("#ai-02"); if (b02) b02.onclick = () => { AI_DOCT = $("#ai-dt").value; run("AG-07", "Procurement Drafting Agent", () => { const k = c(); aiLog("AG-07", [`สร้าง${tx(DOC_T[AI_DOCT][0])}`, `Created a ${tx(DOC_T[AI_DOCT][0])}`], k.id, 1); AI_RES = { draft: aiDraft(k, AI_DOCT), orig: aiDraft(k, AI_DOCT) }; route(); }); };
  const use = $("#ai-use"); if (use) use.onclick = () => { const k = c(), fin = $("#ai-draft").value, orig = AI_RES.orig || aiDraft(k, AI_DOCT), ow = orig.split(/\s+/), fw = new Set(fin.split(/\s+/)), edit = ow.filter(w => !fw.has(w)).length / Math.max(1, ow.length);
    S.aiDrafts.unshift({ id: "AD-" + String(S.aiDrafts.length + 1).padStart(3, "0"), case: k.id, type: AI_DOCT, draft: orig, final: fin, by: me().id, t: nowIso(), edit: Math.round(edit * 100) / 100, ver: AI_VER });
    audit(["ยืนยันใช้ร่างจาก AI", "Confirmed an AI draft"], `${k.id} ${AI_DOCT} · แก้ ${Math.round(edit * 100)}%`); AI_RES = {}; commit(); route(); toast(L(`บันทึกแล้ว ส่วนที่แก้ ${Math.round(edit * 100)}%`, `Saved; ${Math.round(edit * 100)}% of the draft was edited`)); };
  const b09 = $("#ai-09"); if (b09) b09.onclick = () => { AI_Q = $("#ai-q").value; if (!AI_Q.trim()) return; run("AG-10", "Procurement Insight Agent", () => { const a = aiAnswer(AI_Q); aiLog("AG-10", a.ok ? ["ตอบคำถามข้อมูลจัดซื้อ", "Answered a procurement question"] : ["ปฏิเสธคำถามนอกขอบเขต", "Declined a question outside scope"], "PROC", a.src.length, a.ok);
    show("a09", a.ok ? `<b>${esc(a.text)}</b><div class="sub">${L("แหล่งที่มา", "Source")}: ${a.src.join(", ")} · n=${a.n} · ${esc(a.note)}</div>` : `<span style="color:var(--warn)">${esc(a.text)}</span>`); }); };
  const b10 = $("#ai-10"); if (b10) b10.onclick = () => run("AG-10", "Procurement Insight Agent", () => { const s = aiSupplier($("#ai-v").value); aiLog("AG-10", ["สรุปผลงานผู้ขาย", "Summarised a supplier record"], s.name, s.n);
    show("a10", `<div><b>${esc(s.name)}</b></div><div class="sub">${s.n} ${L("สัญญา", "contracts")} · ${mb(s.value)} ${L("ลบ.", "M")} · ${L("วันล่าช้ารวม", "late days")} ${s.late} · ${L("ค่าปรับ", "penalties")} ${fmt(s.pen)} ${L("บาท", "baht")} · ${L("ความเห็นแย้งตรวจรับ", "acceptance dissents")} ${s.dissent} · ${L("แก้ไขสัญญา", "contract changes")} ${s.vars}${s.closed.length ? ` · ${L("คะแนนหลังปิดงาน", "score after closing")} ${s.closed.join(", ")}/5` : ""}</div><div class="sub">${L("สรุปจากข้อมูลที่ยืนยันแล้ว ไม่ใช่การจัดอันดับ ใช้ประกอบการประเมินของเจ้าหน้าที่", "A summary of confirmed data, not a ranking. It supports the officer's own assessment.")}</div>`); });
}
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "ai") bindAI(); };
}
