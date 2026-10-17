// AI co-work (round 27): a Claude/ChatGPT-style chat that works with people in every module.
// Two surfaces share one engine: a side panel that opens from any page (it knows the page and record you
// are on) and a full page (#cowork) with conversation history and an agent directory. You can talk to the
// general Fisko Assistant, which routes the question, or pick a specialist agent from M09.
// Files: real picker, drag-and-drop and paste; text and CSV files are read in the browser, images and PDFs
// get a simulated reading (D-P10). Voice: the browser's speech recognition when it is allowed, otherwise a
// simulated recording. Answers come from rules and the prototype data, not a model (D-P09). Agents never
// approve, award, sign, pay or change amounts; anything that writes data is a button the person presses.
let CW_OPEN = false, CW_AGENT = "FA", CW_PAGE_TAB = "chats", CW_Q = "", CW_BUSY = false, CW_REC = null, CW_CTX = true;
const CW_FILES = [], CW_RECS = [], CW_URLS = {};
ICONS.mic = '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>';

// ---------- agents ----------
const CW_GENERAL = { id: "FA", app: "all", icon: "sparkle", name: ["ผู้ช่วย Fisko", "Fisko Assistant"], what: ["ตอบคำถามทั่วไปและส่งต่อให้ผู้ช่วยเฉพาะทางที่เหมาะสม", "Answers general questions and hands them to the right specialist"], level: "L0",
  can: [["ค้นหาและสรุปข้อมูลข้ามแอป", "Find and summarise data across apps"], ["ส่งต่อให้ผู้ช่วยเฉพาะทาง", "Hand off to a specialist"], ["พาไปยังหน้าที่เกี่ยวข้อง", "Take you to the right page"]] };
const CW_META = {
  "AG-01": ["budget", "pen", "L1", [["ร่างเหตุผลความจำเป็นของคำขอ", "Draft a request's justification"], ["เสนอตัวชี้วัดและรายการ", "Suggest KPIs and lines"]]],
  "AG-02": ["budget", "checksq", "L1", [["ตรวจคำขอตามกฎ BR", "Check a request against the BR rules"], ["หาเอกสารที่ยังขาด", "Find missing documents"]]],
  "AG-03": ["budget", "chart", "L0", [["สรุปคำขอตามสถานะและงบรายจ่าย", "Summarise requests by status and type"], ["เทียบกับปีก่อน", "Compare with last year"]]],
  "AG-04": ["budget", "sliders", "L1", [["จำลองการลดกรอบวงเงิน", "Model a cut to the ceiling"], ["เสนอทางเลือกจัดสรร", "Propose allocation options"]]],
  "AG-05": ["budget", "activity", "L2", [["หน่วยงานที่เบิกจ่ายช้ากว่าแผน", "Units behind their spending plan"], ["ความผิดปกติในการใช้จ่าย", "Spending anomalies"]]],
  "AG-06": ["budget", "user", "L0", [["ตอบคำถามผู้บริหาร", "Answer executive questions"], ["สรุปภาพรวมงบประมาณ", "Budget overview"]]],
  "AG-16": ["budget", "book", "L1", [["เตรียมชุดชี้แจงและคำตอบร่าง", "Prepare the briefing pack and draft answers"]]],
  "AG-07": ["procurement", "file", "L1", [["ร่าง TOR คำสั่ง และหนังสือ", "Draft TORs, orders and letters"]]],
  "AG-08": ["procurement", "clock", "L2", [["สัญญาและงวดงานที่ล่าช้า", "Late contracts and phases"], ["หลักประกันใกล้หมดอายุ", "Guarantees near expiry"]]],
  "AG-10": ["procurement", "chart", "L0", [["ตอบจากตัวชี้วัด KPI-01 ถึง 14", "Answer from KPI-01 to 14"], ["สรุปผลงานผู้ขาย", "Summarise a supplier record"]]],
  "AG-11": ["procurement", "folder", "L2", [["สถานะแฟ้มจัดซื้อ", "Case status"], ["เตรียมแฟ้มให้พร้อมประกาศ", "Get a case ready for the notice"]]],
  "AG-12": ["procurement", "shield", "L3", [["ตรวจสัญญาทุกฉบับ", "Check every contract"], ["ร่างหนังสือเร่งรัด", "Draft reminder letters"]]],
  "AG-13": ["procurement", "list", "L1", [["สรุปผลรายเดือน (สขร.1)", "Monthly summary (สขร.1)"]]],
  "AG-14": ["procurement", "scan", "L1", [["อ่านใบแจ้งหนี้ ใบส่งของ หลักประกัน", "Read invoices, delivery notes, guarantees"], ["ตรวจกับสัญญา", "Check against the contract"]]],
};
function cwAgents() {
  const out = [CW_GENERAL];
  (S.agents || []).forEach(a => { const m = CW_META[a.id]; if (m && appAllowed(m[0])) out.push({ id: a.id, app: m[0], icon: m[1], level: m[2], can: m[3], name: a.name, what: a.what, on: a.on }); });
  return out;
}
const cwAgent = id => cwAgents().find(a => a.id === id) || CW_GENERAL;
const cwAv = (a, size = 30) => `<span class="cw-av ${a.id === "FA" ? "fa" : ""}" style="width:${size}px;height:${size}px">${svgI(a.icon)}</span>`;
const cwAppName = a => (a.app === "all" ? L("ทุกแอป", "All apps") : tx(APPS[a.app].name));

// ---------- threads ----------
function cwState() {
  if (!S.cowork) S.cowork = { threads: [], cur: null };
  return S.cowork;
}
function cwThread(create) {
  const st = cwState();
  let t = st.threads.find(x => x.id === st.cur && x.user === me().id);
  if (!t && create) {
    t = { id: "CW-" + Date.now().toString(36), user: me().id, title: "", agent: CW_AGENT, msgs: [], t: nowIso(), pin: false };
    st.threads.unshift(t); st.cur = t.id;
  }
  return t;
}
function cwNew(agent) { cwState().cur = null; if (agent) CW_AGENT = agent; CW_FILES.length = 0; CW_RECS.length = 0; cwRender(); }

// ---------- context ----------
function cwContext() {
  const n = NAV.find(x => x.id === CUR), out = { page: CUR, label: n ? `${n.code ? n.code + " · " : ""}${tx(n.label)}` : CUR === "request" ? L("คำขอ", "Request") : CUR === "home" ? L("พื้นที่ทำงานของฉัน", "My Workspace") : CUR };
  if (CUR === "request" && typeof curReq === "function") { const r = curReq(); if (r) { out.rec = { kind: "req", id: r.id, name: tx(r.name) }; } }
  if (CUR === "procurement" && typeof CASE_OPEN !== "undefined" && CASE_OPEN) { const c = S.cases.find(x => x.id === CASE_OPEN); if (c) out.rec = { kind: "case", id: c.id, name: caseName(c) }; }
  return out;
}
const CW_SUGGEST = {
  request: [["ตรวจคำขอนี้ก่อนส่ง", "Check this request before I send it"], ["ร่างเหตุผลความจำเป็นให้หน่อย", "Draft the justification for me"], ["คำขอนี้เพิ่มจากปีก่อนเท่าไร", "How much did this request grow from last year?"]],
  requests: [["สรุปคำขอทั้งหมดตามสถานะ", "Summarise all requests by status"], ["คำขอไหนเพิ่มเกินเกณฑ์", "Which requests grew past the threshold?"]],
  dashboard: [["หน่วยงานไหนเบิกจ่ายช้ากว่าแผน", "Which units are behind their spending plan?"], ["มีความผิดปกติในการใช้จ่ายไหม", "Any spending anomalies?"]],
  review: [["ถ้ากรอบลดลง 10% จะกระทบอะไร", "What if the ceiling drops 10%?"]],
  consolidation: [["ถ้ากรอบลดลง 15% จะกระทบอะไร", "What if the ceiling drops 15%?"], ["สรุปคำขอตามงบรายจ่าย", "Summarise requests by budget type"]],
  procurement: [["แฟ้มไหนติดอยู่นานที่สุด", "Which cases are stuck the longest?"], ["สัญญาไหนล่าช้า", "Which contracts are late?"], ["สัดส่วนการแข่งขันเป็นเท่าไร", "What is the share of competitive cases?"]],
  finance: [["สรุปการเบิกจ่ายปีนี้", "Summarise payments this year"]],
  home: [["วันนี้ฉันควรทำอะไรก่อน", "What should I do first today?"], ["สรุปภาพรวมงบประมาณ", "Give me a budget overview"]],
};
function cwSuggest() {
  const s = CW_SUGGEST[CUR] || (APP === "procurement" ? CW_SUGGEST.procurement : APP === "finance" ? CW_SUGGEST.finance : CW_SUGGEST.home);
  return s.map(x => tx(x));
}

// ---------- engine ----------
const CW_NO = /(อนุมัติให้|อนุมัติคำขอ|ตัดงบ|ลดวงเงินให้|เพิ่มวงเงินให้|ลงนาม|จ่ายเงิน|ประกาศผู้ชนะ|เลือกผู้ขาย|ให้คะแนนข้อเสนอ|approve (it|this|the)|sign the|pay the|award|pick the winner|score the bid|cut the budget for|change the amount)/i;
const CW_ROUTE = [
  [/ตรวจ|ก่อนส่ง|ครบไหม|check|validate|missing/i, "AG-02"], [/ร่าง|เขียน|draft|write|justif/i, "AG-01"],
  [/ลด.*%|ลดลง|กรอบ|what.?if|cut|ceiling|จำลอง/i, "AG-04"], [/ช้ากว่าแผน|เบิกจ่าย|ผิดปกติ|behind|anomal|spend/i, "AG-05"],
  [/สรุปคำขอ|ตามสถานะ|งบรายจ่าย|ปีก่อน|เกินเกณฑ์|summar|by status|by type|last year|threshold/i, "AG-03"],
  [/ใบแจ้งหนี้|ใบส่งของ|หลักประกัน|เอกสาร|สแกน|invoice|delivery note|guarantee|document|scan|ocr/i, "AG-14"],
  [/สัญญา|ล่าช้า|ค่าปรับ|contract|late|penalt/i, "AG-08"], [/แฟ้ม|ติดอยู่|ขั้น|case|stuck|step/i, "AG-11"],
  [/แข่งขัน|รายเดียว|ผู้ยื่น|ราคากลาง|ตรงเวลา|ผู้ขาย|competi|single|bidder|reference|supplier|vendor|kpi/i, "AG-10"],
  [/ภาพรวม|ผู้บริหาร|overview|executive/i, "AG-06"],
];
function cwPick(text, files) {
  if (files.some(f => f.kind === "img" || f.kind === "pdf")) return "AG-14";
  const hit = CW_ROUTE.find(([re, id]) => re.test(text) && cwAgents().some(a => a.id === id));
  return hit ? hit[1] : "FA";
}
const cwReqOf = (text, recs) => {
  const m = text.match(/REQ-\d{4}-\d{3}/i), byText = m && S.requests.find(r => r.id.toUpperCase() === m[0].toUpperCase());
  const rec = recs.find(x => x.kind === "req"), ctx = cwContext().rec;
  return byText || (rec && S.requests.find(r => r.id === rec.id)) || (ctx && ctx.kind === "req" && S.requests.find(r => r.id === ctx.id)) || null;
};
const cwTable = (head, rows) => `<div class="tbl-wrap"><table><thead><tr>${head.map(h => `<th${h[1] ? ' class="n"' : ""}>${h[0]}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${head[i][1] ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const cwAct = (label, kind, arg, primary) => ({ label, kind, arg, primary });

function cwAnswer(agentId, text, files, recs) {
  const t = text.toLowerCase(), step = (tool, d) => ({ tool, d }), steps = [];
  if (CW_NO.test(text)) return { agent: agentId, steps: [step("guard", L("ตรวจขอบเขตของ AI", "Checked the AI's limits"))], html: `<p>${L("ส่วนนี้ AI ทำแทนไม่ได้ การอนุมัติ การปรับวงเงิน การลงนาม การจ่ายเงิน และการเลือกผู้ขาย เป็นหน้าที่ของผู้มีอำนาจตามระเบียบ", "That's not something AI can do for you. Approvals, amount changes, signing, payment and supplier selection belong to the authorised officials.")}</p><p>${L("ฉันช่วยเตรียมข้อมูล ตรวจความครบถ้วน หรือร่างเอกสารประกอบการตัดสินใจได้", "I can prepare the data, check completeness or draft the papers for the decision.")}</p>`, actions: [] };
  let id = agentId;
  if (id === "FA") { id = cwPick(text, files); if (id !== "FA") steps.push(step("route", `${L("ส่งต่อให้", "Handed to")} ${tx(cwAgent(id).name)}`)); }
  const a = cwAgent(id);
  if (id !== "FA" && a.on === false) return { agent: id, steps, html: `<p>${tx(a.name)} ${L("ถูกปิดใช้งานใน M09 · ผู้บริหารเปิดได้ที่แท็บ AI Agents", "is switched off in M09. An executive can turn it on in the AI agents tab.")}</p>`, actions: [cwAct(L("เปิด M09", "Open M09"), "go", "assistant")] };
  // files first
  if (files.length) {
    const parts = files.map(f => {
      if (f.kind === "csv" || f.kind === "text") {
        steps.push(step("file.read", `${L("อ่านไฟล์", "Read")} ${esc(f.name)}`));
        if (f.kind === "csv" && f.table) {
          const [hd, ...rows] = f.table, sums = hd.map((_, i) => rows.every(r => r[i] === undefined || r[i] === "" || !isNaN(Number(String(r[i]).replace(/,/g, "")))) && rows.length ? sumv(rows.map(r => Number(String(r[i] || 0).replace(/,/g, "")))) : null);
          return `<p><b>${esc(f.name)}</b> · ${rows.length} ${L("แถว", "rows")} × ${hd.length} ${L("คอลัมน์", "columns")}</p>${cwTable(hd.map((h, i) => [esc(h), sums[i] != null]), rows.slice(0, 5).map(r => hd.map((_, i) => esc(r[i] ?? ""))))}
            ${sums.some(x => x != null) ? `<p class="sub">${L("ผลรวมคอลัมน์ตัวเลข", "Numeric column totals")}: ${hd.map((h, i) => sums[i] != null ? `${esc(h)} <b class="num">${fmt(sums[i])}</b>` : "").filter(Boolean).join(" · ")}</p>` : ""}`;
        }
        return `<p><b>${esc(f.name)}</b> · ${fmt((f.text || "").length)} ${L("ตัวอักษร", "characters")}</p><blockquote>${esc((f.text || "").slice(0, 280))}${(f.text || "").length > 280 ? "…" : ""}</blockquote>`;
      }
      steps.push(step("doc.read", `${L("อ่านเอกสาร (จำลอง)", "Read the document (simulated)")} ${esc(f.name)}`));
      const ty = /guar|ค้ำ|หลักประกัน/i.test(f.name) ? "bg" : /deliv|ส่งของ|dn/i.test(f.name) ? "dn" : /quot|เสนอราคา/i.test(f.name) ? "qt" : "inv", sd = typeof sampleDocs === "function" ? sampleDocs()[ty] : null;
      const flds = sd ? Object.entries(sd.fields).slice(0, 6) : [];
      return `<p><b>${esc(f.name)}</b> · ${L("ดูเหมือน", "Looks like")} <b>${ty === "bg" ? L("หนังสือค้ำประกัน", "a bank guarantee") : ty === "dn" ? L("ใบส่งของ", "a delivery note") : ty === "qt" ? L("ใบเสนอราคา", "a quotation") : L("ใบแจ้งหนี้", "an invoice")}</b></p>
        ${flds.length ? cwTable([[L("ช่อง", "Field")], [L("ค่าที่อ่านได้", "Value read")], [L("ความมั่นใจ", "Confidence"), 1]], flds.map(([k, v]) => [esc(k), esc(v.v), `${Math.round(v.conf * 100)}%`])) : ""}
        <p class="sub">${L("ต้นแบบนี้จำลองการอ่าน (D-P10) ช่องที่ความมั่นใจต่ำต้องให้คนตรวจในหน้ารับเอกสาร", "This prototype simulates the reading (D-P10). Low-confidence fields need a person to check them on the document intake page.")}</p>`;
    });
    const acts = files.some(f => f.kind === "img" || f.kind === "pdf") && appAllowed("procurement") ? [cwAct(L("เปิดหน้ารับเอกสาร", "Open document intake"), "jump", "prc-docs", true)] : [];
    return { agent: id, steps, html: parts.join("") + (text.trim() ? `<p class="sub">${L("คำถามของคุณ", "Your question")}: “${esc(text)}” ${L("· ถามต่อได้เลย ฉันจำไฟล์นี้ในบทสนทนา", "· ask a follow-up; I keep this file in the conversation")}</p>` : ""), actions: acts };
  }
  const r = cwReqOf(text, recs);
  if (id === "AG-02" || (id === "AG-01" && !r && /ตรวจ|check/i.test(t))) {
    if (!r) return { agent: id, steps, html: `<p>${L("บอกเลขคำขอ (เช่น REQ-2571-014) หรือเปิดคำขอแล้วถามจากหน้านั้น หรือแนบคำขอด้วยปุ่ม +", "Tell me the request number (e.g. REQ-2571-014), open the request and ask from there, or attach it with the + button.")}</p>`, actions: [cwAct(L("ไปที่คำขอ", "Go to requests"), "go", "requests")] };
    steps.push(step("rules.run", `${L("ตรวจกฎ BR กับ", "Ran the BR rules on")} ${r.id}`));
    const c = checks(r), bad = c.filter(x => x.s !== "ok");
    return { agent: id, steps, html: `<p><b>${r.id}</b> ${esc(tx(r.name))} · ${bad.length ? `${L("พบ", "found")} ${bad.length} ${L("ประเด็น", "issues")}` : L("ผ่านทุกข้อ พร้อมส่ง", "passes every check and is ready to send")}</p>
      ${bad.length ? `<ul>${bad.map(x => `<li><span class="cw-dot ${x.s === "no" ? "bad" : "warn"}"></span><b>${x.title}</b>${x.id ? ` <span class="mono sub">${x.id}</span>` : ""}: ${x.d}</li>`).join("")}</ul>` : ""}
      <p class="sub">${L("กฎตั้งค่าได้ที่ M10 · ระดับ ×  ต้องแก้ก่อนส่ง ระดับ ! ส่งได้พร้อมคำอธิบาย", "Rules are set in M10. Items marked as blocking must be fixed before sending; warnings can be sent with an explanation.")}</p>`, actions: [cwAct(L("เปิดคำขอ", "Open the request"), "req", r.id, true)] };
  }
  if (id === "AG-01") {
    if (!r) return { agent: id, steps, html: `<p>${L("ฉันร่างเหตุผลความจำเป็นให้คำขอได้ เปิดคำขอแล้วถามจากหน้านั้น หรือบอกเลขคำขอ", "I can draft a request's justification. Open the request and ask from there, or tell me its number.")}</p>`, actions: [] };
    steps.push(step("request.read", `${L("อ่านคำขอและคำขอปีก่อน", "Read the request and last year's")} ${r.id}`), step("draft", L("ร่างเหตุผลความจำเป็น", "Drafted the justification")));
    const kpis = typeof kpisForAct === "function" ? kpisForAct(r.act) : [], draft = r.aiText ? tx(r.aiText) : `${tx(r.name)}: ${L("ดำเนินการเพื่อแก้ปัญหาการให้บริการที่ยังไม่ทั่วถึง ลดระยะเวลารอคอย และยกระดับคุณภาพบริการให้ประชาชน สอดคล้องกับแผนปฏิบัติราชการและตัวชี้วัด", "to close gaps in service coverage, cut waiting times and raise service quality for citizens, in line with the action plan and the KPI")} ${kpis[0] ? tx(kpis[0].k.name) : tx(r.kpi) || ""}`;
    CW_DRAFTS[r.id] = draft;
    return { agent: id, steps, html: `<p>${L("ร่างเหตุผลความจำเป็นสำหรับ", "Draft justification for")} <b>${r.id}</b>:</p><blockquote>${esc(draft)}</blockquote><p class="sub">${L("อ้างอิง: คำขอปีก่อน แผนปฏิบัติราชการ และตัวชี้วัด M01 · ตรวจทานก่อนใช้", "Sources: last year's request, the action plan and M01 KPIs · review before use")}</p>`,
      actions: editable(r) ? [cwAct(L("ใส่ร่างนี้ในคำขอ", "Put this draft in the request"), "applyDraft", r.id, true), cwAct(L("เปิดคำขอ", "Open the request"), "req", r.id)] : [cwAct(L("เปิดคำขอ", "Open the request"), "req", r.id)] };
  }
  if (id === "AG-04") {
    const pct = Number((text.match(/(\d+(?:\.\d+)?)\s*%/) || [0, 10])[1]), list = S.requests.filter(x => x.status !== "rejected"), tot = sumv(list.map(x => x.amount)), cut = tot * pct / 100;
    steps.push(step("requests.read", `${L("อ่านคำขอ", "Read")} ${list.length} ${L("รายการ", "requests")}`), step("optimise", `${L("จำลองลดกรอบ", "Modelled a cut of")} ${pct}%`));
    const prot = list.filter(x => x.status === "approved" || x.multi), flex = list.filter(x => !prot.includes(x)), flexTot = sumv(flex.map(x => x.amount));
    const rows = flex.slice().sort((x, y) => y.amount - x.amount).slice(0, 5).map(x => [esc(tx(x.name)), mb(x.amount), mb(flexTot ? x.amount - cut * x.amount / flexTot : x.amount)]);
    return { agent: id, steps, html: `<p>${L("ถ้ากรอบลดลง", "If the ceiling drops")} <b>${pct}%</b> (${mb(cut)} ${L("ลบ. จาก", "M of")} ${mb(tot)} ${L("ลบ.", "M")}) ${L("และปกป้องคำขอที่เห็นชอบแล้วหรือผูกพันหลายปี", "while protecting approved and multi-year requests")} (${prot.length} ${L("รายการ", "requests")}):</p>
      ${cwTable([[L("คำขอ", "Request")], [L("ขอ (ลบ.)", "Asked (M)"), 1], [L("หลังลด (ลบ.)", "After cut (M)"), 1]], rows)}
      <p class="sub">${L("ตัดตามสัดส่วนในคำขอที่ปรับได้ · ทางเลือกอื่น: ตัดตามลำดับคะแนน (M03) · เป็นข้อเสนอ การปรับจริงทำใน M04", "Cut in proportion across the flexible requests · alternative: cut by priority score (M03) · a proposal only; real changes happen in M04")}</p>`, actions: [cwAct(L("เปิด What-if ใน M09", "Open What-if in M09"), "jump", "intel-whatif", true)] };
  }
  if (id === "AG-05" || id === "AG-06" && /ช้า|behind/i.test(t)) {
    if (/ผิดปกติ|anomal/i.test(t) && S.anoms) {
      steps.push(step("anomalies.read", L("อ่านสัญญาณความผิดปกติ", "Read the anomaly signals")));
      return { agent: id, steps, html: `<p>${L("สัญญาณความผิดปกติที่ยังเปิดอยู่", "Open anomaly signals")}:</p><ul>${S.anoms.map(x => `<li><span class="mono">${x.id}</span> ${esc(tx(x.title || x.what || x.kind))} · ${esc(String(x.status))}</li>`).join("")}</ul>`, actions: [cwAct(L("เปิดความผิดปกติ", "Open anomalies"), "jump", "intel-anoms", true)] };
    }
    steps.push(step("execution.read", L("อ่านแผนและผลการเบิกจ่าย M07", "Read M07 plan and spending")));
    return { agent: id, steps, html: answer(0), actions: [cwAct(L("เปิดติดตามการใช้จ่าย", "Open execution monitoring"), "go", "dashboard", true)] };
  }
  if (id === "AG-03") {
    steps.push(step("requests.read", L("อ่านคำขอปี 2571", "Read the FY2571 requests")));
    if (/เกินเกณฑ์|threshold|ปีก่อน|last year/i.test(t)) return { agent: id, steps, html: r ? `<p><b>${r.id}</b> ${r.prev ? `${L("เปลี่ยนจากปีก่อน", "changed from last year by")} <b>${fmt((r.amount / r.prev - 1) * 100, 1)}%</b> (${mb(r.prev)} → ${mb(r.amount)} ${L("ลบ.", "M")})` : L("เป็นโครงการใหม่ ไม่มีวงเงินปีก่อน", "is a new project with no amount last year")}</p>` : answer(2), actions: [] };
    const by = {}, byT = {}; S.requests.forEach(x => { by[x.status] = (by[x.status] || 0) + x.amount; x.items.forEach(i => (byT[i.type] = (byT[i.type] || 0) + itemTotal(i))); });
    return { agent: id, steps, html: `<p>${L("คำขอ", "Requests")} ${S.requests.length} ${L("รายการ รวม", "totalling")} <b>${mb(sumv(S.requests.map(x => x.amount)))}</b> ${L("ลบ.", "M")}</p>
      ${cwTable([[L("สถานะ", "Status")], [L("ลบ.", "M"), 1]], Object.keys(by).map(k => [pill(k), mb(by[k])]))}${cwTable([[L("งบรายจ่าย", "Budget type")], [L("ลบ.", "M"), 1]], Object.keys(byT).map(k => [typeName(k), mb(byT[k])]))}`, actions: [cwAct(L("เปิดคำของบประมาณ", "Open budget requests"), "go", "requests", true)] };
  }
  if (id === "AG-06") {
    steps.push(step("overview", L("รวบรวมภาพรวมจาก M02 M06 M07", "Pulled the overview from M02, M06 and M07")));
    const lines = typeof famLines === "function" && S.allocs && S.allocs[FAM_FY] ? famLines() : [], al = sumv(lines.map(l => l.amount));
    return { agent: id, steps, html: `<ul><li>${L("คำขอปี 2571", "FY2571 requests")}: ${S.requests.length} ${L("รายการ", "")} · ${mb(sumv(S.requests.map(x => x.amount)))} ${L("ลบ.", "M")} · ${S.requests.filter(x => x.status === "plan" || x.status === "committee").length} ${L("รอพิจารณา", "in review")}</li>
      ${al ? `<li>${L("งบปี", "FY")} ${FAM_FY} ${L("จัดสรรแล้ว", "allocated")}: ${mb(al)} ${L("ลบ.", "M")}</li>` : ""}<li>${L("เบิกจ่ายสะสมถึง", "Spent to")} ${fdate(S.dash.asOf)}: ${fmt(sumv(S.dash.units.map(u => u.actual)) / Math.max(1, sumv(S.dash.units.map(u => u.alloc))) * 100, 1)}% ${L("ของวงเงิน", "of the budget")}</li></ul>`, actions: [cwAct(L("เปิดติดตามการใช้จ่าย", "Open execution monitoring"), "go", "dashboard")] };
  }
  if (id === "AG-08" || id === "AG-12") {
    steps.push(step("contracts.read", L("อ่านสัญญาและงวดงาน", "Read contracts and phases")), step("delay.assess", L("ประเมินความล่าช้า", "Assessed delays")));
    const rows = (S.contracts || []).flatMap(c => c.phases.filter(ph => !ph.cancelled && phLate(ph) > 0).map(ph => [c.no || c.id, esc(tx(c.vendor)), `${L("งวด", "Phase")} ${ph.no || ""}`, `${phLate(ph)} ${L("วัน", "days")}`]));
    return { agent: id, steps, html: rows.length ? `<p>${L("งวดงานที่ล่าช้า", "Late phases")}: ${rows.length}</p>${cwTable([[L("สัญญา", "Contract")], [L("ผู้ขาย", "Supplier")], [L("งวด", "Phase")], [L("ล่าช้า", "Late"), 1]], rows)}` : `<p>${L("ไม่มีงวดงานที่ล่าช้าในขณะนี้", "No late phases right now")}</p>`, actions: [cwAct(L("เปิดสัญญา", "Open contracts"), "jump", "prc-contracts", true)] };
  }
  if (id === "AG-11") {
    steps.push(step("case.read", L("อ่านแฟ้มจัดซื้อ", "Read the case files")));
    const open = (S.cases || []).filter(c => !c.cancelled && caseState(c) < 12).sort((x, y) => caseState(x) - caseState(y));
    return { agent: id, steps, html: `<p>${L("แฟ้มที่เปิดอยู่", "Open cases")}: ${open.length}</p>${cwTable([[L("แฟ้ม", "Case")], [L("ชื่อ", "Name")], [L("ขั้น", "Step"), 1]], open.slice(0, 6).map(c => [`<span class="mono">${c.id}</span>`, esc(caseName(c)), `${caseState(c)}/12`]))}<p class="sub">${L("ให้ Case Copilot เตรียมแฟ้มได้ที่แท็บ AI Agents ของจัดซื้อ ทุกขั้นที่เขียนข้อมูลรอคุณอนุมัติ", "Case Copilot can prepare a case from the procurement AI agents tab; every step that writes data waits for you.")}</p>`, actions: [cwAct(L("เปิดแฟ้มจัดซื้อ", "Open case files"), "jump", "prc-cases", true)] };
  }
  if (id === "AG-10" && typeof aiAnswer === "function") {
    steps.push(step("kpi.query", L("ค้นจากชั้นตัวชี้วัด", "Queried the KPI layer")));
    const res = aiAnswer(text);
    return { agent: id, steps, html: `<p>${esc(res.text)}</p>${res.note ? `<p class="sub">${esc(res.note)}</p>` : ""}${res.src && res.src.length ? `<p class="sub">${L("แหล่ง", "Source")}: ${res.src.join(", ")}</p>` : ""}`, actions: [cwAct(L("เปิด Analytics", "Open analytics"), "jump", "prc-analytics")] };
  }
  if (id === "AG-07" || id === "AG-13" || id === "AG-14") {
    return { agent: id, steps, html: `<p>${tx(a.what)}</p><p class="sub">${id === "AG-14" ? L("แนบไฟล์ใบแจ้งหนี้ ใบส่งของ หรือหนังสือค้ำประกันด้วยปุ่ม + หรือวางไฟล์ลงในช่องแชท", "Attach an invoice, delivery note or guarantee with the + button, or drop the file into the chat.") : L("เปิดหน้าที่เกี่ยวข้องเพื่อเริ่มงาน ฉันจะร่างและรอให้คุณตรวจ", "Open the related page to start; I'll draft and wait for you to check.")}</p>`, actions: [cwAct(L("เปิดผู้ช่วย AI จัดซื้อ", "Open procurement AI"), "jump", id === "AG-14" ? "prc-docs" : "prc-ai", true)] };
  }
  // general assistant
  if (/วันนี้|ทำอะไรก่อน|today|first|งานของฉัน|my task/i.test(t)) {
    steps.push(step("tasks.read", L("อ่านงานของฉัน", "Read my tasks")));
    const tasks = myTasks();
    return { agent: id, steps, html: tasks.length ? `<p>${L("งานที่รออยู่", "Waiting for you")} ${tasks.length} ${L("รายการ เรียงตามกำหนด", "tasks, by due date")}:</p><ol>${tasks.slice(0, 5).map(k => `<li>${esc(k.title)}${k.due ? ` · <span class="sub">${fdate(k.due)}</span>` : ""}</li>`).join("")}</ol>` : `<p>${L("ไม่มีงานค้าง", "Nothing waiting for you")}</p>`, actions: tasks[0] ? [cwAct(L("ทำงานแรก", "Do the first task"), "jump", tasks[0].link, true)] : [] };
  }
  if (/เบิก|จ่ายเงิน|payment|paid/i.test(t) && S.payreqs) {
    steps.push(step("payments.read", L("อ่านคำขอเบิกจ่าย", "Read payment requests")));
    const ap = S.payreqs.filter(p => p.status === "approved"), wait = S.payreqs.filter(p => p.status !== "approved" && p.status !== "rejected");
    return { agent: id, steps, html: `<p>${L("เบิกจ่ายอนุมัติแล้ว", "Approved payments")} ${ap.length} ${L("รายการ", "")} · <b>${mb(sumv(ap.map(p => p.amount)))}</b> ${L("ลบ.", "M")} · ${L("รออนุมัติ", "waiting")} ${wait.length}</p>`, actions: appAllowed("finance") ? [cwAct(L("เปิดการเบิกจ่าย", "Open payments"), "go", "finance", true)] : [] };
  }
  const ag = cwAgents().filter(x => x.id !== "FA");
  return { agent: id, steps, html: `<p>${L("ฉันช่วยได้หลายเรื่อง ลองถามแบบนี้ หรือเลือกผู้ช่วยเฉพาะทาง", "I can help with lots of things. Try one of these, or pick a specialist.")}</p><ul>${cwSuggest().map(s => `<li>${esc(s)}</li>`).join("")}</ul><p class="sub">${L("ผู้ช่วยที่คุณใช้ได้", "Specialists you can use")}: ${ag.map(x => tx(x.name)).join(" · ")}</p>`, actions: [cwAct(L("ดูผู้ช่วยทั้งหมด", "See all agents"), "agents", "", true)] };
}
const CW_DRAFTS = {};

function cwSend(text) {
  if (CW_BUSY) return;
  text = (text || "").trim();
  if (!text && !CW_FILES.length && !CW_RECS.length) return;
  const th = cwThread(true), mention = text.match(/@([A-Za-z]{2}-\d{2})/);
  if (mention && cwAgents().some(a => a.id === mention[1].toUpperCase())) { CW_AGENT = mention[1].toUpperCase(); th.agent = CW_AGENT; }
  if (!th.title) th.title = (text || CW_FILES.map(f => f.name).join(", ") || CW_RECS.map(r => r.id).join(", ")).slice(0, 60);
  const ctx = CW_CTX ? cwContext() : null, files = CW_FILES.splice(0), recs = CW_RECS.splice(0);
  th.msgs.push({ role: "u", text, files: files.map(f => ({ name: f.name, size: f.size, kind: f.kind, key: f.key })), recs, ctx: ctx ? { label: ctx.label, rec: ctx.rec } : null, t: nowIso() });
  th.t = nowIso();
  const prevFiles = files.length ? files : [], res = cwAnswer(th.agent, text, prevFiles, recs.concat(ctx && ctx.rec ? [ctx.rec] : []));
  const msg = { role: "a", agent: res.agent, html: "", steps: res.steps.map(s => ({ ...s, done: false })), actions: res.actions, t: nowIso(), pending: true };
  th.msgs.push(msg); CW_BUSY = true; cwRender();
  const ag = cwAgent(res.agent);
  S.aiLog.unshift({ t: nowIso(), agent: res.agent === "FA" ? "AG-06" : res.agent, user: me().id, action: ["ตอบในแชตร่วมทำงาน", "Answered in co-work chat"], target: (text || files.map(f => f.name).join(", ")).slice(0, 60), sources: res.steps.length, ok: true });
  let i = 0;
  const tick = () => {
    if (i < msg.steps.length) { msg.steps[i].done = true; i++; cwRender(); setTimeout(tick, 260); return; }
    msg.html = res.html; msg.pending = false; CW_BUSY = false; commit(); cwRender();
    if (ag.id !== "FA") void 0;
  };
  setTimeout(tick, 300);
}

function cwDo(act) {
  const [kind, arg] = [act.kind, act.arg];
  if (kind === "go") { go(arg); return; }
  if (kind === "jump") { jump(arg); return; }
  if (kind === "req") { openReq(arg); return; }
  if (kind === "agents") { CW_PAGE_TAB = "agents"; cwOpen(false); go("cowork"); return; }
  if (kind === "applyDraft") {
    const r = S.requests.find(x => x.id === arg), d = CW_DRAFTS[arg];
    if (!r || !d) { toast(L("ร่างนี้หมดอายุแล้ว ขอร่างใหม่อีกครั้ง", "This draft has expired; ask for a new one")); return; }
    if (!editable(r)) { toast(L("คำขอนี้แก้ไขไม่ได้ในบทบาทนี้", "You can't edit this request in this role")); return; }
    r.reason = d; r.aiDraft = true; r.updated = TODAY;
    audit(["ใส่ร่างจากแชต AI ในคำขอ", "Put an AI chat draft into the request"], r.id); commit();
    toast(L("ใส่ร่างแล้ว · ตรวจทานในคำขอก่อนส่ง", "Draft added · review it in the request before sending"));
    if (CUR === "request") route(); else openReq(r.id);
  }
}

// ---------- files and records ----------
function cwKind(f) {
  if (/^image\//.test(f.type)) return "img";
  if (/pdf$/.test(f.type) || /\.pdf$/i.test(f.name)) return "pdf";
  if (/csv/.test(f.type) || /\.csv$/i.test(f.name)) return "csv";
  if (/^text\//.test(f.type) || /\.(txt|md|json)$/i.test(f.name)) return "text";
  return "file";
}
function cwAddFiles(list) {
  Array.from(list || []).slice(0, 6).forEach(file => {
    if (file.size > 15 * 1024 * 1024) { toast(L("ไฟล์ใหญ่เกิน 15 MB", "File is larger than 15 MB")); return; }
    const key = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), f = { key, name: file.name, size: file.size, type: file.type, kind: cwKind(file) };
    try { CW_URLS[key] = URL.createObjectURL(file); } catch (e) { /* preview only */ }
    CW_FILES.push(f);
    if (f.kind === "csv" || f.kind === "text") {
      const rd = new FileReader();
      rd.onload = () => { f.text = String(rd.result || "").slice(0, 200000); if (f.kind === "csv") f.table = f.text.split(/\r?\n/).filter(Boolean).slice(0, 2000).map(l => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim())); cwRenderTray(); };
      rd.readAsText(file);
    }
  });
  cwRenderTray();
}
function cwRecChoices() {
  const out = [], ctx = cwContext().rec;
  if (ctx) out.push(ctx);
  if (appAllowed("budget")) S.requests.slice(0, 6).forEach(r => out.push({ kind: "req", id: r.id, name: tx(r.name) }));
  if (appAllowed("procurement") && S.cases) S.cases.slice(0, 4).forEach(c => out.push({ kind: "case", id: c.id, name: caseName(c) }));
  return out.filter((x, i, a) => a.findIndex(y => y.id === x.id) === i);
}

// ---------- voice ----------
function cwVoice(btn, ta) {
  if (CW_REC) { try { CW_REC.stop(); } catch (e) { /* ignore */ } return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const simulate = () => {
    btn.classList.add("rec"); ta.placeholder = L("กำลังฟัง… (จำลอง)", "Listening… (simulated)");
    CW_REC = { stop() {} };
    setTimeout(() => { btn.classList.remove("rec"); CW_REC = null; ta.value = (ta.value ? ta.value + " " : "") + cwSuggest()[0]; ta.placeholder = cwPlaceholder(); ta.focus(); ta.dispatchEvent(new Event("input")); toast(L("ไมโครโฟนใช้ไม่ได้ในหน้านี้ จึงจำลองข้อความให้", "The microphone isn't available here, so a sample transcript was used")); }, 1800);
  };
  if (!SR) { simulate(); return; }
  try {
    const rec = new SR(); rec.lang = LANG === "en" ? "en-US" : "th-TH"; rec.interimResults = true; rec.continuous = false;
    const base = ta.value ? ta.value + " " : ""; let got = false;
    rec.onresult = e => { got = true; ta.value = base + Array.from(e.results).map(x => x[0].transcript).join(""); ta.dispatchEvent(new Event("input")); };
    rec.onerror = ev => { btn.classList.remove("rec"); CW_REC = null; if (!got && (ev.error === "not-allowed" || ev.error === "service-not-allowed" || ev.error === "audio-capture")) simulate(); };
    rec.onend = () => { btn.classList.remove("rec"); CW_REC = null; ta.placeholder = cwPlaceholder(); };
    CW_REC = rec; btn.classList.add("rec"); ta.placeholder = L("กำลังฟัง… พูดได้เลย", "Listening… go ahead"); rec.start();
  } catch (e) { CW_REC = null; simulate(); }
}

// ---------- rendering ----------
const cwPlaceholder = () => `${L("ถาม", "Ask")} ${tx(cwAgent(cwThread() ? cwThread().agent : CW_AGENT).name)}… ${L("(@ เพื่อเรียกผู้ช่วยอื่น)", "(@ to call another agent)")}`;
const cwSize = n => n > 1048576 ? `${fmt(n / 1048576, 1)} MB` : `${fmt(Math.max(1, n / 1024), 0)} KB`;
function cwFileChip(f, removable) {
  const url = CW_URLS[f.key];
  return `<span class="cw-file">${f.kind === "img" && url ? `<img src="${url}" alt="">` : `<span class="cw-fi">${svgI(f.kind === "csv" ? "list" : f.kind === "pdf" ? "file" : "file")}</span>`}<span><b>${esc(f.name)}</b><small>${f.kind.toUpperCase()} · ${cwSize(f.size)}</small></span>${removable ? `<button type="button" data-cwrm="${f.key}" aria-label="${L("เอาออก", "Remove")}">×</button>` : ""}</span>`;
}
function cwMsg(m, mi) {
  if (m.role === "u") return `<div class="cw-m u"><div class="cw-bub">${m.ctx ? `<div class="cw-ctxline">${svgI("dot")} ${esc(m.ctx.label)}${m.ctx.rec ? ` · ${esc(m.ctx.rec.id)}` : ""}</div>` : ""}${(m.files || []).length ? `<div class="cw-files">${m.files.map(f => cwFileChip(f)).join("")}</div>` : ""}${(m.recs || []).length ? `<div class="cw-files">${m.recs.map(r => `<span class="cw-rec">${svgI(r.kind === "req" ? "inbox" : "folder")}<b>${esc(r.id)}</b></span>`).join("")}</div>` : ""}${m.text ? `<div>${esc(m.text).replace(/\n/g, "<br>")}</div>` : ""}</div></div>`;
  const a = cwAgent(m.agent);
  return `<div class="cw-m a">${cwAv(a, 28)}<div class="cw-body"><div class="cw-who"><b>${tx(a.name)}</b><span class="sub">${a.id !== "FA" ? a.id + " · " : ""}${cwAppName(a)}</span></div>
    ${m.steps && m.steps.length ? `<details class="cw-steps" ${m.pending ? "open" : ""}><summary>${m.pending ? L("กำลังทำงาน…", "Working…") : `${m.steps.length} ${L("ขั้นตอนที่ทำ", "steps taken")}`}</summary><ol>${m.steps.map(s => `<li class="${s.done ? "done" : ""}"><span class="mono">${esc(s.tool)}</span> ${s.d}</li>`).join("")}</ol></details>` : ""}
    ${m.pending ? `<div class="cw-typing"><i></i><i></i><i></i></div>` : `<div class="cw-ans">${m.html}</div>
    ${(m.actions || []).length ? `<div class="cw-acts">${m.actions.map((x, i) => `<button type="button" class="btn ${x.primary ? "primary" : ""}" data-cwact="${mi}:${i}">${x.label}</button>`).join("")}</div>` : ""}
    <div class="cw-tools"><button type="button" data-cwcopy="${mi}" title="${L("คัดลอก", "Copy")}" aria-label="${L("คัดลอก", "Copy")}">${svgI("clipboard")}</button><button type="button" data-cwfb="${mi}:1" class="${m.fb === 1 ? "on" : ""}" aria-label="${L("มีประโยชน์", "Helpful")}">👍</button><button type="button" data-cwfb="${mi}:-1" class="${m.fb === -1 ? "on" : ""}" aria-label="${L("ไม่มีประโยชน์", "Not helpful")}">👎</button><span class="sub">${L("AI อาจผิดพลาด ตรวจก่อนใช้", "AI can be wrong; check before use")}</span></div>`}</div></div>`;
}
function cwChatHTML(full) {
  const th = cwThread(), ag = cwAgent(th ? th.agent : CW_AGENT), ctx = cwContext();
  const empty = `<div class="cw-empty">${cwAv(ag, 44)}<h3>${tx(ag.name)}</h3><p>${tx(ag.what)}</p><div class="cw-sugg">${cwSuggest().map(s => `<button type="button" class="cw-chip" data-cwsugg="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>`;
  return `<div class="cw-msgs" data-cwmsgs>${th && th.msgs.length ? th.msgs.map(cwMsg).join("") : empty}</div>
    <div class="cw-composer" data-cwdrop>
      <div class="cw-tray" data-cwtray></div>
      <div class="cw-ctx">${CW_CTX && !full ? `<button type="button" class="cw-chip on" data-cwctx title="${L("ส่งบริบทของหน้านี้ไปด้วย", "Send this page's context")}">${svgI("dot")} ${esc(ctx.label)}${ctx.rec ? ` · ${esc(ctx.rec.id)}` : ""} ×</button>` : !full ? `<button type="button" class="cw-chip" data-cwctx>+ ${L("ใส่บริบทของหน้านี้", "Add this page's context")}</button>` : ""}</div>
      <textarea data-cwinput rows="1" placeholder="${esc(cwPlaceholder())}" aria-label="${L("ข้อความถึงผู้ช่วย AI", "Message to the AI assistant")}"></textarea>
      <div class="cw-bar">
        <div class="cw-menuwrap"><button type="button" class="cw-ib" data-cwplus aria-haspopup="menu" aria-label="${L("แนบ", "Attach")}" title="${L("แนบไฟล์หรือรายการ", "Attach a file or record")}">+</button>
          <div class="cw-menu" data-cwmenu hidden role="menu"><button type="button" role="menuitem" data-cwupload>${svgI("download")} ${L("อัปโหลดไฟล์ (รูป PDF CSV ข้อความ)", "Upload a file (image, PDF, CSV, text)")}</button><div class="cw-mh">${L("แนบรายการจาก Fisko", "Attach a Fisko record")}</div>${cwRecChoices().map(r => `<button type="button" role="menuitem" data-cwrec="${r.kind}|${r.id}">${svgI(r.kind === "req" ? "inbox" : "folder")} <span class="mono">${esc(r.id)}</span> ${esc(r.name).slice(0, 34)}</button>`).join("")}</div></div>
        <button type="button" class="cw-agentbtn" data-cwagentbtn aria-haspopup="menu">${cwAv(ag, 20)}<span>${tx(ag.name)}</span>▾</button>
        <div class="cw-menu cw-agmenu" data-cwagmenu hidden role="menu">${cwAgents().map(a => `<button type="button" role="menuitem" data-cwag="${a.id}" class="${a.id === ag.id ? "on" : ""}">${cwAv(a, 22)}<span><b>${tx(a.name)}</b><small>${a.id !== "FA" ? a.id + " · " : ""}${cwAppName(a)}${a.on === false ? " · " + L("ปิดอยู่", "off") : ""}</small></span></button>`).join("")}</div>
        <span class="sp"></span>
        <button type="button" class="cw-ib" data-cwmic aria-label="${L("พูด", "Voice input")}" title="${L("พูดแทนพิมพ์", "Speak instead of typing")}">${svgI("mic")}</button>
        <button type="button" class="cw-send" data-cwsend aria-label="${L("ส่ง", "Send")}">${svgI("send")}</button>
      </div>
      <input type="file" data-cwfile multiple hidden accept="image/*,.pdf,.csv,.txt,.md,.json,text/*">
      <div class="cw-dz" data-cwdz hidden>${L("วางไฟล์ที่นี่", "Drop files here")}</div>
    </div>`;
}
function cwRenderTray() {
  $$("[data-cwtray]").forEach(el => (el.innerHTML = CW_FILES.map(f => cwFileChip(f, true)).join("") + CW_RECS.map((r, i) => `<span class="cw-rec">${svgI(r.kind === "req" ? "inbox" : "folder")}<b>${esc(r.id)}</b><button type="button" data-cwrrm="${i}" aria-label="${L("เอาออก", "Remove")}">×</button></span>`).join("")));
  $$("[data-cwrm]").forEach(b => (b.onclick = () => { const i = CW_FILES.findIndex(f => f.key === b.dataset.cwrm); if (i >= 0) CW_FILES.splice(i, 1); cwRenderTray(); }));
  $$("[data-cwrrm]").forEach(b => (b.onclick = () => { CW_RECS.splice(Number(b.dataset.cwrrm), 1); cwRenderTray(); }));
}
function cwBindChat(root) {
  const ta = root.querySelector("[data-cwinput]"), msgs = root.querySelector("[data-cwmsgs]");
  if (!ta) return;
  const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(180, ta.scrollHeight) + "px"; };
  ta.oninput = grow; ta.value = CW_Q; grow();
  ta.addEventListener("input", () => (CW_Q = ta.value));
  ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); CW_Q = ""; cwSend(ta.value); } };
  root.querySelector("[data-cwsend]").onclick = () => { CW_Q = ""; cwSend(ta.value); };
  root.querySelectorAll("[data-cwsugg]").forEach(b => (b.onclick = () => cwSend(b.dataset.cwsugg)));
  const fi = root.querySelector("[data-cwfile]"), menu = root.querySelector("[data-cwmenu]"), agm = root.querySelector("[data-cwagmenu]");
  const closeMenus = () => { menu.hidden = true; agm.hidden = true; };
  root.querySelector("[data-cwplus]").onclick = e => { e.stopPropagation(); agm.hidden = true; menu.hidden = !menu.hidden; };
  root.querySelector("[data-cwagentbtn]").onclick = e => { e.stopPropagation(); menu.hidden = true; agm.hidden = !agm.hidden; };
  root.querySelector("[data-cwupload]").onclick = () => { closeMenus(); fi.click(); };
  fi.onchange = () => { cwAddFiles(fi.files); fi.value = ""; ta.focus(); };
  root.querySelectorAll("[data-cwrec]").forEach(b => (b.onclick = () => { const [kind, id] = b.dataset.cwrec.split("|"), c = cwRecChoices().find(x => x.id === id); if (c && !CW_RECS.some(x => x.id === id)) CW_RECS.push({ kind, id, name: c.name }); closeMenus(); cwRenderTray(); ta.focus(); }));
  root.querySelectorAll("[data-cwag]").forEach(b => (b.onclick = () => { CW_AGENT = b.dataset.cwag; const th = cwThread(); if (th) th.agent = CW_AGENT; closeMenus(); save(); cwRender(); }));
  root.onclick = e => { if (!e.target.closest(".cw-menuwrap") && !e.target.closest("[data-cwagentbtn]") && !e.target.closest("[data-cwagmenu]")) closeMenus(); };
  const ctxb = root.querySelector("[data-cwctx]"); if (ctxb) ctxb.onclick = () => { CW_CTX = !CW_CTX; cwRender(); };
  root.querySelector("[data-cwmic]").onclick = e => cwVoice(e.currentTarget, ta);
  const dropz = root.querySelector("[data-cwdrop]"), dz = root.querySelector("[data-cwdz]");
  dropz.ondragover = e => { e.preventDefault(); dz.hidden = false; };
  dropz.ondragleave = e => { if (!dropz.contains(e.relatedTarget)) dz.hidden = true; };
  dropz.ondrop = e => { e.preventDefault(); dz.hidden = true; cwAddFiles(e.dataTransfer.files); };
  ta.onpaste = e => { const fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) { e.preventDefault(); cwAddFiles(fs); } };
  const th = cwThread();
  root.querySelectorAll("[data-cwact]").forEach(b => (b.onclick = () => { const [mi, i] = b.dataset.cwact.split(":").map(Number); cwDo(th.msgs[mi].actions[i]); }));
  root.querySelectorAll("[data-cwcopy]").forEach(b => (b.onclick = () => {
    const el = b.closest(".cw-body").querySelector(".cw-ans"), txt = el ? el.innerText : "";
    const done = () => toast(L("คัดลอกแล้ว", "Copied"));
    try { navigator.clipboard.writeText(txt).then(done, () => { const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(el); s.removeAllRanges(); s.addRange(rg); toast(L("เลือกข้อความแล้ว กด Ctrl+C", "Text selected; press Ctrl+C")); }); } catch (e2) { done(); }
  }));
  root.querySelectorAll("[data-cwfb]").forEach(b => (b.onclick = () => { const [mi, v] = b.dataset.cwfb.split(":").map(Number); th.msgs[mi].fb = th.msgs[mi].fb === v ? 0 : v; save(); cwRender(); }));
  cwRenderTray();
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// ---------- side panel ----------
function cwPanelHTML() {
  const st = cwState(), th = cwThread();
  return `<header class="cw-head"><b>${L("ผู้ช่วย AI", "AI co-work")}</b><span class="sub">${th && th.title ? esc(th.title) : L("บทสนทนาใหม่", "New conversation")}</span><span class="sp"></span>
    <button type="button" class="cw-ib" data-cwnew title="${L("แชตใหม่", "New chat")}" aria-label="${L("แชตใหม่", "New chat")}">${svgI("pen")}</button>
    <div class="cw-menuwrap"><button type="button" class="cw-ib" data-cwhist title="${L("ประวัติ", "History")}" aria-label="${L("ประวัติ", "History")}">${svgI("clock")}</button>
      <div class="cw-menu cw-hist" data-cwhistmenu hidden>${st.threads.filter(t => t.user === me().id).length ? st.threads.filter(t => t.user === me().id).slice(0, 12).map(t => `<button type="button" data-cwthr="${t.id}" class="${t.id === st.cur ? "on" : ""}"><span><b>${esc(t.title || L("ไม่มีชื่อ", "Untitled"))}</b><small>${tx(cwAgent(t.agent).name)} · ${fdate(t.t)}</small></span></button>`).join("") : `<div class="cw-mh">${L("ยังไม่มีบทสนทนา", "No conversations yet")}</div>`}</div></div>
    <button type="button" class="cw-ib" data-cwfull title="${L("เปิดเต็มจอ", "Open full screen")}" aria-label="${L("เปิดเต็มจอ", "Open full screen")}">${svgI("share")}</button>
    <button type="button" class="cw-ib" data-cwclose title="${L("ปิด", "Close")}" aria-label="${L("ปิด", "Close")}">×</button></header>${cwChatHTML(false)}`;
}
function cwOpen(on) {
  CW_OPEN = on; let p = $("#cw-panel");
  if (!p) { p = document.createElement("aside"); p.id = "cw-panel"; p.className = "cw-panel"; p.setAttribute("aria-label", "AI co-work"); document.body.appendChild(p); }
  p.hidden = !on || CUR === "cowork"; document.body.classList.toggle("cw-on", on && CUR !== "cowork");
  const b = $("#cw-launch"); if (b) b.setAttribute("aria-expanded", String(on));
  if (on) cwRender();
  if (on) { const ta = p.querySelector("[data-cwinput]"); if (ta) setTimeout(() => ta.focus(), 30); }
}
function cwRender() {
  const p = $("#cw-panel");
  if (p && !p.hidden) {
    p.innerHTML = cwPanelHTML(); cwBindChat(p);
    p.querySelector("[data-cwclose]").onclick = () => cwOpen(false);
    p.querySelector("[data-cwnew]").onclick = () => cwNew();
    p.querySelector("[data-cwfull]").onclick = () => { CW_PAGE_TAB = "chats"; cwOpen(false); go("cowork"); };
    const hm = p.querySelector("[data-cwhistmenu]");
    p.querySelector("[data-cwhist]").onclick = e => { e.stopPropagation(); hm.hidden = !hm.hidden; };
    p.querySelectorAll("[data-cwthr]").forEach(b => (b.onclick = () => { cwState().cur = b.dataset.cwthr; const t = cwThread(); if (t) CW_AGENT = t.agent; cwRender(); }));
  }
  const pg = $("#cw-page");
  if (pg && CUR === "cowork") { pg.innerHTML = cwPageInner(); cwBindPage(pg); }
}

// ---------- full page ----------
function cwPageInner() {
  const st = cwState(), q = (CW_PAGE_Q || "").toLowerCase(), th = cwThread(), ag = cwAgent(th ? th.agent : CW_AGENT), mine = st.threads.filter(t => t.user === me().id);
  const list = mine.filter(t => !q || (t.title || "").toLowerCase().includes(q) || t.msgs.some(m => (m.text || "").toLowerCase().includes(q)));
  const today = TODAY, grp = [[L("ปักหมุด", "Pinned"), list.filter(t => t.pin)], [L("วันนี้", "Today"), list.filter(t => !t.pin && String(t.t).slice(0, 10) >= today)], [L("ก่อนหน้า", "Earlier"), list.filter(t => !t.pin && String(t.t).slice(0, 10) < today)]];
  const side = `<aside class="cw-side"><button type="button" class="btn primary" data-cwnew style="width:100%">${svgI("pen")} ${L("แชตใหม่", "New chat")}</button>
    <div class="cw-seg"><button type="button" data-cwtab="chats" class="${CW_PAGE_TAB === "chats" ? "on" : ""}">${L("บทสนทนา", "Chats")}</button><button type="button" data-cwtab="agents" class="${CW_PAGE_TAB === "agents" ? "on" : ""}">${L("ผู้ช่วย", "Agents")} (${cwAgents().length})</button></div>
    ${CW_PAGE_TAB === "chats" ? `<input type="search" data-cwsearch placeholder="${L("ค้นหาบทสนทนา", "Search chats")}" value="${esc(CW_PAGE_Q)}" aria-label="${L("ค้นหาบทสนทนา", "Search chats")}">
      ${grp.map(([lbl, ts]) => ts.length ? `<div class="cw-mh">${lbl}</div>${ts.map(t => `<div class="cw-thr ${t.id === st.cur ? "on" : ""}"><button type="button" data-cwthr="${t.id}">${cwAv(cwAgent(t.agent), 22)}<span><b>${esc(t.title || L("ไม่มีชื่อ", "Untitled"))}</b><small>${tx(cwAgent(t.agent).name)} · ${t.msgs.length} ${L("ข้อความ", "messages")}</small></span></button><button type="button" class="cw-ib" data-cwpin="${t.id}" aria-label="${L("ปักหมุด", "Pin")}" title="${L("ปักหมุด", "Pin")}">${t.pin ? "★" : "☆"}</button><button type="button" class="cw-ib" data-cwdel="${t.id}" aria-label="${L("ลบ", "Delete")}" title="${L("ลบ", "Delete")}">×</button></div>`).join("")}` : "").join("") || `<p class="sub">${q ? L("ไม่พบ", "Nothing found") : L("ยังไม่มีบทสนทนา เริ่มพิมพ์ทางขวาได้เลย", "No conversations yet. Start typing on the right.")}</p>`}`
      : `<p class="sub">${L("ผู้ช่วยตามสิทธิ์ของบทบาท", "Agents available to your role")} “${tx(ROLES[ROLE])}”</p>`}</aside>`;
  const center = CW_PAGE_TAB === "agents" ? `<div class="cw-agents">${cwAgents().map(a => `<div class="cw-agcard">${cwAv(a, 38)}<div style="min-width:0"><b>${tx(a.name)}</b><div class="sub">${a.id !== "FA" ? a.id + " · " : ""}${cwAppName(a)} · ${L("ระดับ", "Level")} ${a.level} ${tx(AG_LEVELS[a.level] || ["", ""])}</div><p>${tx(a.what)}</p><ul>${a.can.map(c => `<li>${tx(c)}</li>`).join("")}</ul>
      <div class="row">${a.on === false ? tag(L("ปิดใน M09", "Off in M09"), "p-mute") : tag(L("พร้อมใช้", "Available"), "p-ok")}<span class="sp"></span><button type="button" class="btn primary" data-cwchat="${a.id}" ${a.on === false ? "disabled" : ""}>${L("แชตกับผู้ช่วยนี้", "Chat with this agent")}</button></div></div></div>`).join("")}</div>`
    : `<div class="cw-main">${cwChatHTML(true)}</div>`;
  const right = CW_PAGE_TAB === "chats" ? `<aside class="cw-info">${cwAv(ag, 40)}<b>${tx(ag.name)}</b><span class="sub">${ag.id !== "FA" ? ag.id + " · " : ""}${cwAppName(ag)}</span><p>${tx(ag.what)}</p>
    <div class="cw-mh">${L("ทำอะไรได้", "What it can do")}</div><ul>${ag.can.map(c => `<li>${tx(c)}</li>`).join("")}</ul>
    <div class="cw-mh">${L("ขอบเขต", "Limits")}</div><p class="sub">${L("ไม่อนุมัติ ไม่ปรับวงเงิน ไม่ลงนาม ไม่จ่ายเงิน และไม่เลือกผู้ขาย สิ่งที่เขียนข้อมูลเป็นปุ่มที่คุณกดเอง ทุกคำตอบบันทึกใน M09", "Never approves, changes amounts, signs, pays or picks suppliers. Anything that writes data is a button you press. Every answer is logged in M09.")}</p>
    <div class="cw-mh">${L("แนบได้", "You can attach")}</div><p class="sub">${L("รูปภาพ PDF CSV ข้อความ (สูงสุด 15 MB) รายการจาก Fisko และพูดแทนพิมพ์", "Images, PDF, CSV, text (up to 15 MB), Fisko records, and voice")}</p></aside>` : "";
  return `<div class="cw-page">${side}${center}${right}</div>`;
}
let CW_PAGE_Q = "";
function cwBindPage(pg) {
  pg.querySelector("[data-cwnew]").onclick = () => { CW_PAGE_TAB = "chats"; cwNew(); };
  pg.querySelectorAll("[data-cwtab]").forEach(b => (b.onclick = () => { CW_PAGE_TAB = b.dataset.cwtab; cwRender(); }));
  const s = pg.querySelector("[data-cwsearch]"); if (s) s.oninput = () => { CW_PAGE_Q = s.value; const pos = s.selectionStart; cwRender(); const n = $("#cw-page [data-cwsearch]"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
  pg.querySelectorAll("[data-cwthr]").forEach(b => (b.onclick = () => { cwState().cur = b.dataset.cwthr; const t = cwThread(); if (t) CW_AGENT = t.agent; cwRender(); }));
  pg.querySelectorAll("[data-cwpin]").forEach(b => (b.onclick = () => { const t = cwState().threads.find(x => x.id === b.dataset.cwpin); t.pin = !t.pin; save(); cwRender(); }));
  pg.querySelectorAll("[data-cwdel]").forEach(b => (b.onclick = () => { const st = cwState(); st.threads = st.threads.filter(x => x.id !== b.dataset.cwdel); if (st.cur === b.dataset.cwdel) st.cur = null; save(); cwRender(); }));
  pg.querySelectorAll("[data-cwchat]").forEach(b => (b.onclick = () => { CW_PAGE_TAB = "chats"; cwNew(b.dataset.cwchat); }));
  const main = pg.querySelector(".cw-main"); if (main) cwBindChat(main);
}
VIEWS.cowork = () => `<div class="head"><div><div class="eyebrow">${L("ผู้ช่วย AI", "AI co-work")}</div><h1>${L("ทำงานร่วมกับผู้ช่วย AI", "Work with AI assistants")}</h1>
  <p>${L("ถาม สั่งงาน แนบไฟล์ หรือพูด กับผู้ช่วยทั่วไปหรือผู้ช่วยเฉพาะทางของแต่ละโมดูล · AI ในต้นแบบนี้จำลองจากกฎและข้อมูลตัวอย่าง", "Ask, delegate, attach files or speak, with the general assistant or each module's specialists · AI in this prototype is simulated from rules and sample data")}</p></div></div>
  <section id="cw-page"></section>`;
BIND.cowork = () => { if (CW_OPEN) { CW_OPEN = false; cwOpen(false); } cwRender(); };

// ---------- shell hook ----------
{
  const baseShell = renderShell;
  renderShell = function () {
    baseShell.apply(this, arguments);
    if (!$("#cw-launch")) {
      const b = document.createElement("button"); b.type = "button"; b.id = "cw-launch"; b.className = "iconbtn cw-launch"; b.setAttribute("aria-haspopup", "dialog"); b.setAttribute("aria-expanded", "false");
      const bell = $("#bell"); bell.parentNode.insertBefore(b, bell);
      b.onclick = () => (CUR === "cowork" ? null : cwOpen(!CW_OPEN));
    }
    const b = $("#cw-launch"); b.innerHTML = `${svgI("sparkle")}<span>${L("ผู้ช่วย AI", "AI")}</span>`; b.title = L("ผู้ช่วย AI (Ctrl+J)", "AI co-work (Ctrl+J)");
    if (CW_OPEN) cwRender();
  };
  const baseRoute = route;
  route = function () {
    baseRoute.apply(this, arguments);
    const p = $("#cw-panel");
    if (p) { p.hidden = !CW_OPEN || CUR === "cowork"; document.body.classList.toggle("cw-on", CW_OPEN && CUR !== "cowork"); if (!p.hidden) cwRender(); }
  };
  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) { e.preventDefault(); if (CUR !== "cowork") cwOpen(!CW_OPEN); } if (e.key === "Escape" && CW_OPEN && !e.target.closest(".cw-menu")) cwOpen(false); });
}
