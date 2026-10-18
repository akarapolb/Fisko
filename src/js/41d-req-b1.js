// Fisko Budget round B1 (Budget design v0.1, chapter 12): one data spine and a step-by-step request form.
// - Division director role and approval before Planning (FR-B-12); Planning passes to the committee only when
//   the w3 condition applies, otherwise to the executive (FR-B-20).
// - Request steps with a status dot each (FR-B-07): lines and justification, quarterly plan (FR-B-08),
//   readiness and risks (FR-B-09), documents required by condition (FR-B-11), plus multi-year, equipment
//   (now with location, GPS and price source: FR-B-10), payroll and versions.
// - Rules BR-07 to BR-13 (chapter 7.1), parameters in M10.
// - M03 unit totals and M04 round rows come from the requests themselves (FR-B-13, FR-B-19).
const unitRole = () => ROLE === "div" || ROLE === "divhead";
ROLES.divhead = ["ผู้อำนวยการกอง (เห็นชอบคำขอ)", "Division director (approves requests)"];
STATUS.unit = [["รอ ผอ.กองเห็นชอบ", "Director approval"], "p-info"];
STATUS.exec = [["รอผู้บริหารเห็นชอบ", "Executive approval"], "p-warn"];

// ---------- committee condition (w3) ----------
function needsCommittee(r) {
  const w = (S.workflow || []).find(x => x.id === "w3");
  if (!w) return false;
  return r.amount >= (w.amount || 0) || (w.newProj !== false && !r.prev) || (w.invest && r.items.some(i => i.type === "inv"));
}

// ---------- quarterly plan ----------
const Q_PATTERN = { per: [25, 25, 25, 25], ope: [20, 25, 30, 25], inv: [10, 25, 40, 25], sub: [25, 25, 25, 25], oth: [25, 25, 25, 25] };
function qplanFill(r) {
  const q = [0, 0, 0, 0];
  r.items.forEach(it => { const t = itemTotal(it), p = Q_PATTERN[it.type] || Q_PATTERN.oth; p.forEach((x, i) => (q[i] += t * x / 100)); });
  const out = q.map(v => Math.round(v / 1000) * 1000), diff = reqAmount(r) - out.reduce((a, b) => a + b, 0);
  out[3] += diff;
  return out;
}
const qSum = r => (r.qplan || []).reduce((a, b) => a + Number(b || 0), 0);

// ---------- readiness ----------
const SITE = { ready: [["พร้อมดำเนินการทันที", "Ready now"], 5], prep: [["อยู่ระหว่างเตรียมการ", "Being prepared"], 3], study: [["อยู่ระหว่างศึกษาความเหมาะสม", "Under study"], 1] };
const LVL5 = [["ต่ำมาก", "Very low"], ["ต่ำ", "Low"], ["ปานกลาง", "Medium"], ["สูง", "High"], ["สูงมาก", "Very high"]];
const RISK_T = { pol: ["การเมืองและสังคม", "Political and social"], law: ["กฎหมาย", "Legal"], ops: ["การดำเนินการ", "Operational"], fin: ["การเงินและเศรษฐกิจ", "Financial"], tech: ["เทคโนโลยี", "Technology"], env: ["สิ่งแวดล้อม", "Environmental"] };
const EVALS = { pre: ["ก่อนดำเนินการ", "Before"], process: ["ระหว่างดำเนินการ", "During"], post: ["เมื่อสิ้นสุด", "After"], impact: ["ผลกระทบ", "Impact"] };
function readiness(r) {
  const d = r.ready; if (!d) return 0;
  const v = [d.site ? SITE[d.site][1] : 0, d.staff, d.mgmt, d.mat].map(Number);
  return v.every(x => x > 0) ? v.reduce((a, b) => a + b, 0) / 4 : 0;
}

// ---------- documents by condition (FR-B-11) ----------
const ICT_RE = /ระบบ|คอมพิวเตอร์|ซอฟต์แวร์|เครือข่าย|แม่ข่าย|คลาวด์|server|software|system|computer|network|cloud/i;
const BUILD_RE = /ก่อสร้าง|อาคาร|สิ่งก่อสร้าง|ปรับปรุงอาคาร|construction|building|renovat/i;
function reqDocs(r) {
  const inv = r.items.filter(i => i.type === "inv"), invAmt = sumv(inv.map(itemTotal)), names = [tx(r.name), ...r.items.map(i => tx(i.name))].join(" ");
  const p = id => (rule(id) || {}).param, out = [];
  const add = (key, label, why, ruleId, re) => out.push({ key, label, why, rule: ruleId, re, has: r.docs.some(d => re.test(d)) });
  if (inv.length) add("spec", L("คุณลักษณะเฉพาะครุภัณฑ์", "Equipment specification"), L("มีรายการงบลงทุน", "Has investment lines"), "BR-03", /คุณลักษณะ|spec/i);
  if (inv.some(i => BUILD_RE.test(tx(i.name)))) add("draw", L("แบบรูปรายการก่อสร้าง", "Construction drawings"), L("มีรายการก่อสร้างหรือปรับปรุง", "Has construction or renovation"), "BR-03", /แบบรูป|drawing/i);
  if (inv.some(i => Number(i.price) > 1e6)) add("quotes", L("ใบเสนอราคาอ้างอิง 3 ราย", "Three reference quotations"), L("ราคาต่อหน่วยเกิน 1 ล้านบาท", "Unit price above 1 million baht"), "BR-12", /ใบเสนอราคา|quotation/i);
  if (ICT_RE.test(names)) {
    const big = r.amount > (p("BR-10") || 200) * 1e6;
    add("ict", big ? L("ความเห็นชอบของคณะกรรมการจัดหาระบบคอมพิวเตอร์ของรัฐ", "Approval of the state computer procurement committee") : L("ความเห็นชอบของผู้บริหารเทคโนโลยีสารสนเทศระดับสูง (CIO)", "Approval of the chief information officer (CIO)"),
      `${L("โครงการ ICT", "ICT project")} ${big ? ">" : "≤"} ${p("BR-10") || 200} ${L("ล้านบาท", "M baht")}`, "BR-10", big ? /คณะกรรมการจัดหาระบบ|computer procurement committee/i : /CIO|ผู้บริหารเทคโนโลยี/i);
  }
  if (invAmt >= 500e6) add("risk", L("ผลประเมินความเสี่ยงการทุจริตเชิงนโยบาย", "Policy corruption risk assessment"), L("งบลงทุนตั้งแต่ 500 ล้านบาท", "Investment of 500 M baht or more"), "BR-10", /ทุจริต|corruption/i);
  if (r.multi && r.amount >= (p("BR-09") || 1000) * 1e6) add("cab", L("มติคณะรัฐมนตรีอนุมัติก่อหนี้ผูกพัน", "Cabinet approval to commit across years"), `${L("ผูกพันใหม่ตั้งแต่", "New commitment from")} ${fmt(p("BR-09") || 1000)} ${L("ล้านบาท (มาตรา 26)", "M baht (section 26)")}`, "BR-09", /มติคณะรัฐมนตรี|cabinet/i);
  return out;
}

// ---------- extra checks: BR-07 to BR-13, and a step for every check ----------
{
  const base = checks;
  checks = function (r) {
    const out = base(r);
    const stepOf = x => {
      if (x.step) return x.step;
      if (x.id === "BR-03" || x.title === L("เอกสารประกอบ", "Supporting documents")) return "docs";
      if (x.title === L("แบ่งวงเงินรายปี", "Multi-year split")) return "years";
      if (x.title === L("รายละเอียดครุภัณฑ์ / สิ่งก่อสร้าง", "Equipment and construction detail")) return "equip";
      return "main";
    };
    const add = (ruleId, ok, title, okText, badText, step) => {
      const ru = rule(ruleId); if (ru && !ru.on) return;
      out.push({ s: ok ? "ok" : ru && ru.effect === "warn" ? "wa" : "no", title, d: ok ? okText : badText, id: ruleId, step });
    };
    const lin = lineage(r.act);
    add("BR-07", lin.length >= 3, L("ความเชื่อมโยงโครงสร้างงบประมาณ", "Budget structure link"), lin.map(n => n.code).join(" › "), L("ต้องเชื่อมกิจกรรม ผลผลิต/โครงการ และแผนงาน", "Must link an activity, output or project, and programme"), "main");
    if (r.multi && r.years) {
      const ys = Object.keys(r.years), max = (rule("BR-08") || {}).param || 5;
      add("BR-08", ys.length <= max && ys.every(y => Number(r.years[y]) > 0), L("ระยะเวลาผูกพัน", "Commitment period"), `${ys.length} ${L("ปี ทุกปีมีวงเงิน", "years, each with an amount")}`, `${L("ต้องไม่เกิน", "Must be at most")} ${max} ${L("ปี และทุกปีต้องมีวงเงิน", "years with an amount every year")}`, "years");
    }
    reqDocs(r).filter(d => d.rule === "BR-09" || d.rule === "BR-10").forEach(d => add(d.rule, d.has, d.label, L("แนบแล้ว", "Attached"), `${L("ต้องแนบ", "Must attach")} · ${d.why}`, "docs"));
    if (r.unit) {
      const mine = S.requests.filter(x => x.unit === r.unit && x.status !== "rejected"), now = sumv(mine.map(x => x.amount)), prev = sumv(mine.map(x => x.prev || 0)), cap = (rule("BR-11") || {}).param || 20;
      if (prev > 0) {
        const g = (now / prev - 1) * 100;
        add("BR-11", g <= cap, L("ภาพรวมของกองเทียบปีก่อน", "Division total vs last year"), `${g >= 0 ? "+" : ""}${fmt(g, 1)}% (${L("เพดาน", "cap")} ${cap}%)`, `${g >= 0 ? "+" : ""}${fmt(g, 1)}% ${L("เกินเพดาน", "over the")} ${cap}% ${L("· ส่วนเพิ่มต้องเป็นงบลงทุน หรือระบุข้อยกเว้น", "cap · the increase should be investment, or flag an exception")}`, "main");
      }
    }
    const inv = r.items.filter(i => i.type === "inv");
    if (inv.length) {
      const noLoc = inv.filter(i => !i.detail || !String(i.detail.loc || "").trim()).length, yrs = (rule("BR-12") || {}).param || 2;
      const old = inv.filter(i => i.detail && i.detail.srcDate && (new Date(TODAY) - new Date(i.detail.srcDate)) / 864e5 > yrs * 365).length;
      add("BR-12", !noLoc && !old, L("สถานที่ พิกัด และแหล่งราคา", "Location, GPS and price source"), L("ครบทุกรายการลงทุน", "Complete for every investment line"), noLoc ? `${noLoc} ${L("รายการยังไม่ระบุสถานที่", "lines have no location")}` : `${old} ${L("รายการใช้ราคาเก่ากว่า", "lines use prices older than")} ${yrs} ${L("ปี", "years")}`, "equip");
    }
    const qs = qSum(r), amt = reqAmount(r);
    add("BR-13", r.qplan && Math.abs(qs - amt) < 1, L("แผนรายไตรมาส", "Quarterly plan"), L("รวมเท่ากับวงเงินที่ขอ", "Adds up to the amount requested"), r.qplan ? `${L("รวม", "Total")} ${fmt(qs)} ≠ ${fmt(amt)} · ${L("ต่าง", "off by")} ${fmt(amt - qs)}` : L("ยังไม่ได้ทำแผนรายไตรมาส", "No quarterly plan yet"), "plan");
    const rd = readiness(r), min = (rule("BR-13") || {}).param || 3;
    out.push({ s: !rd ? "no" : inv.length && rd < min ? "wa" : "ok", title: L("ความพร้อมของโครงการ", "Project readiness"), d: rd ? `${L("คะแนน", "Score")} ${fmt(rd, 1)} / 5${inv.length && rd < min ? ` · ${L("งบลงทุนควรไม่ต่ำกว่า", "investment should be at least")} ${min}` : ""}` : L("ยังประเมินความพร้อมไม่ครบ", "Readiness not assessed yet"), id: "BR-13", step: "ready" });
    out.forEach(x => (x.step = stepOf(x)));
    return out;
  };
}

// ---------- the step bar replaces the tab bar ----------
const STEP_DEF = () => [["main", L("รายการและเหตุผล", "Lines and justification")], ["plan", L("แผนรายไตรมาส", "Quarterly plan")], ["ready", L("ความพร้อมและความเสี่ยง", "Readiness and risks")], ["docs", L("เอกสารแนบ", "Documents")]];
reqTabsBar = function (r) {
  const c = checks(r), st = id => { const xs = c.filter(x => x.step === id); return xs.some(x => x.s === "no") ? "bad" : xs.some(x => x.s === "wa") ? "warn" : "ok"; };
  const steps = STEP_DEF(), extra = [["years", L("ผูกพันหลายปี", "Multi-year")]];
  if (r.items.some(i => i.type === "inv")) extra.push(["equip", L("ครุภัณฑ์ / สิ่งก่อสร้าง", "Equipment & construction")]);
  if (r.items.some(i => i.type === "per") || r.payroll) extra.push(["payroll", L("ประมาณการงบบุคลากร", "Payroll estimate")]);
  extra.push(["versions", `${L("เวอร์ชัน", "Versions")} (${r.versions.length})`]);
  if (![...steps, ...extra].some(x => x[0] === REQ_TAB)) REQ_TAB = "main";
  const first = c.find(x => x.s === "no") || c.find(x => x.s === "wa");
  const stepBtn = ([id, l], i) => `<button type="button" role="tab" aria-selected="${id === REQ_TAB}" class="rstep ${id === REQ_TAB ? "on" : ""} s-${st(id)}" data-rtab="${id}"><span class="rn">${st(id) === "ok" ? "✓" : i + 1}</span><span>${l}</span></button>`;
  return `<div class="rsteps" role="tablist" aria-label="${L("ขั้นตอนคำขอ", "Request steps")}">${steps.map(stepBtn).join("")}<span class="rsep"></span>${extra.map(([id, l]) => `<button type="button" role="tab" aria-selected="${id === REQ_TAB}" class="rstep x ${id === REQ_TAB ? "on" : ""} ${["years", "equip"].includes(id) ? "s-" + st(id) : ""}" data-rtab="${id}"><span>${l}</span></button>`).join("")}</div>
    ${first && editable(r) ? `<div class="nextstep"><span class="cw-dot ${first.s === "no" ? "bad" : "warn"}"></span><b>${L("ขั้นต่อไป", "Next")}:</b> ${first.title} · <span class="sub">${first.d}</span>${first.step !== REQ_TAB ? `<button type="button" class="btn ghost" data-rtab="${first.step}">${L("ไปที่ขั้นนี้", "Go to this step")} →</button>` : ""}</div>` : ""}`;
};

// ---------- panels ----------
REQ_PANELS.plan = (r, ed) => {
  const q = r.qplan || [0, 0, 0, 0], amt = reqAmount(r), tot = q.reduce((a, b) => a + Number(b || 0), 0), mx = Math.max(1, ...q.map(Number)), ds = ed ? "" : "disabled", diff = amt - tot;
  const QL = [L("ต.ค.–ธ.ค.", "Oct–Dec"), L("ม.ค.–มี.ค.", "Jan–Mar"), L("เม.ย.–มิ.ย.", "Apr–Jun"), L("ก.ค.–ก.ย.", "Jul–Sep")];
  return `<section class="panel"><header><h2>${L("แผนการปฏิบัติงานและแผนการใช้จ่ายรายไตรมาส", "Quarterly work and spending plan")}</h2><span class="sp"></span>${tag(r.qplan && Math.abs(diff) < 1 ? L("รวมเท่ากับวงเงินที่ขอ", "Adds up to the request") : `${L("ต่าง", "Off by")} ${fmt(diff)}`, r.qplan && Math.abs(diff) < 1 ? "p-ok" : "p-warn")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:14px">
      <p class="sub" style="margin:0">${L("ตามแนวแบบ สงป.301 และ สงป.302 ที่ยื่นพร้อมคำขอ เมื่อได้รับงบประมาณ แผนนี้จะกลายเป็นแผนการใช้จ่ายใน M06", "Follows forms สงป.301 and สงป.302 submitted with the request. Once funded, this becomes the spending plan in M06.")}</p>
      <div class="qbars">${q.map((v, i) => `<div class="qb"><div class="qbar"><i style="height:${Math.round(Number(v) / mx * 100)}%"></i></div><b class="num">${mb(v)}</b><span class="sub">${L("ไตรมาส", "Q")}${i + 1} · ${QL[i]}</span></div>`).join("")}</div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ไตรมาส", "Quarter")}</th><th class="n" style="width:200px">${L("วงเงิน (บาท)", "Amount (baht)")}</th><th class="n">${L("สัดส่วน", "Share")}</th><th class="n">${L("สะสม", "Cumulative")}</th></tr></thead>
        <tbody>${q.map((v, i) => `<tr><td>${L("ไตรมาส", "Quarter")} ${i + 1} <span class="sub">${QL[i]}</span></td><td class="n"><input type="number" min="0" step="1000" data-q="${i}" value="${Number(v)}" ${ds} aria-label="${L("ไตรมาส", "Quarter")} ${i + 1}"></td><td class="n">${fmt(amt ? Number(v) / amt * 100 : 0, 1)}%</td><td class="n">${fmt(amt ? q.slice(0, i + 1).reduce((a, b) => a + Number(b || 0), 0) / amt * 100 : 0, 1)}%</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(tot)}</td><td class="n" colspan="2">${L("วงเงินที่ขอ", "Requested")} ${fmt(amt)}</td></tr></tfoot></table></div>
      ${ed ? `<div class="row"><button class="btn" type="button" id="q-fill">${L("เติมตามรูปแบบการใช้จ่ายของงบรายจ่าย", "Fill from the budget-type spending pattern")}</button><button class="btn ghost" type="button" id="q-rest">${L("ใส่ส่วนต่างในไตรมาส 4", "Put the difference in Q4")}</button></div>` : ""}
      <span class="sub">${L("รูปแบบตั้งต้น: งบลงทุน 10/25/40/25% งบดำเนินงาน 20/25/30/25% งบบุคลากร 25% ทุกไตรมาส", "Default patterns: investment 10/25/40/25%, operating 20/25/30/25%, personnel 25% each quarter")}</span></div></section>`;
};
REQ_BIND.plan = r => {
  $$("[data-q]").forEach(inp => (inp.onchange = () => { r.qplan = r.qplan || [0, 0, 0, 0]; r.qplan[inp.dataset.q] = Number(inp.value); save(); route(); }));
  const f = $("#q-fill"); if (f) f.onclick = () => { r.qplan = qplanFill(r); audit(["เติมแผนรายไตรมาส", "Filled the quarterly plan"], r.id); commit(); route(); };
  const g = $("#q-rest"); if (g) g.onclick = () => { r.qplan = r.qplan || [0, 0, 0, 0]; r.qplan[3] = Math.max(0, Number(r.qplan[3]) + reqAmount(r) - qSum(r)); save(); route(); };
};
REQ_PANELS.ready = (r, ed) => {
  const d = r.ready || {}, ds = ed ? "" : "disabled", rd = readiness(r), risks = r.risks || [];
  const lvl = (k, label) => `<div class="f"><label for="rd-${k}">${label}</label><select id="rd-${k}" data-rd="${k}" ${ds}><option value="0">—</option>${LVL5.map((x, i) => `<option value="${i + 1}" ${Number(d[k]) === i + 1 ? "selected" : ""}>${i + 1} · ${tx(x)}</option>`).join("")}</select></div>`;
  return `<section class="panel"><header><h2>${L("ความพร้อมของโครงการ", "Project readiness")}</h2><span class="sp"></span>${rd ? `${ring(rd / 5, { size: 44, stroke: 5, label: fmt(rd, 1) })}` : tag(L("ยังไม่ครบ", "Incomplete"), "p-warn")}</header>
    <div class="body form-grid">
      <div class="f full"><label>${L("ความพร้อมของพื้นที่ดำเนินการ", "Site readiness")}</label><div class="row">${Object.keys(SITE).map(k => `<label class="radio"><input type="radio" name="rd-site" value="${k}" ${d.site === k ? "checked" : ""} ${ds}> ${tx(SITE[k][0])}</label>`).join("")}</div></div>
      ${lvl("staff", L("ความพร้อมของบุคลากร/ทีมงาน", "Staff and team"))}${lvl("mgmt", L("ความพร้อมของการบริหารจัดการ", "Management"))}${lvl("mat", L("ความพร้อมของวัสดุ เครื่องมือ อุปกรณ์", "Materials and equipment"))}
      <div class="f full"><label>${L("เอกสารอนุญาตและการศึกษา", "Permits and studies")}</label><div class="row"><label class="radio"><input type="checkbox" data-rdb="forest" ${d.forest ? "checked" : ""} ${ds}> ${L("มีหนังสืออนุญาตใช้พื้นที่ป่าไม้ (ถ้าเกี่ยวข้อง)", "Forest-area permit (if relevant)")}</label><label class="radio"><input type="checkbox" data-rdb="eia" ${d.eia ? "checked" : ""} ${ds}> ${L("ศึกษาผลกระทบสิ่งแวดล้อมแล้ว (ถ้าเกี่ยวข้อง)", "Environmental study done (if relevant)")}</label></div></div>
      <div class="f full"><label>${L("แนวทางการประเมินผล", "How it will be evaluated")}</label><div class="row">${Object.keys(EVALS).map(k => `<label class="radio"><input type="checkbox" data-ev="${k}" ${(d.evals || []).includes(k) ? "checked" : ""} ${ds}> ${tx(EVALS[k])}</label>`).join("")}</div></div>
    </div></section>
  <section class="panel"><header><h2>${L("ความเสี่ยงที่อาจเกิดขึ้น", "Risks")}</h2><span class="sp"></span><span class="sub">${L("6 ด้านตามคู่มือสำนักงบประมาณ", "Six areas from the Budget Bureau manual")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ด้าน", "Area")}</th><th>${L("ระดับ", "Level")}</th><th>${L("แนวทางแก้ไข", "Mitigation")}</th><th></th></tr></thead>
      <tbody>${risks.map((x, i) => `<tr><td><select data-rk="${i}" data-f="type" ${ds} aria-label="${L("ด้าน", "Area")}">${Object.keys(RISK_T).map(k => `<option value="${k}" ${x.type === k ? "selected" : ""}>${tx(RISK_T[k])}</option>`).join("")}</select></td>
        <td><select data-rk="${i}" data-f="lvl" ${ds} aria-label="${L("ระดับ", "Level")}">${["L", "M", "H"].map(k => `<option value="${k}" ${x.lvl === k ? "selected" : ""}>${k === "L" ? L("ต่ำ", "Low") : k === "M" ? L("กลาง", "Medium") : L("สูง", "High")}</option>`).join("")}</select></td>
        <td><input type="text" data-rk="${i}" data-f="fix" value="${esc(x.fix || "")}" ${ds} aria-label="${L("แนวทางแก้ไข", "Mitigation")}" style="width:100%"></td><td>${ed ? `<button type="button" class="btn ghost danger" data-rkdel="${i}" style="padding:4px 8px" aria-label="${L("ลบ", "Delete")}">×</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">${L("ยังไม่ระบุความเสี่ยง", "No risks listed")}</td></tr>`}</tbody></table></div>
    ${ed ? `<div class="body"><button class="btn" type="button" id="rk-add">+ ${L("เพิ่มความเสี่ยง", "Add a risk")}</button></div>` : ""}</section>`;
};
REQ_BIND.ready = r => {
  const d = () => (r.ready = r.ready || { site: "", staff: 0, mgmt: 0, mat: 0, evals: [] });
  $$("[name=rd-site]").forEach(x => (x.onchange = () => { d().site = x.value; save(); route(); }));
  $$("[data-rd]").forEach(x => (x.onchange = () => { d()[x.dataset.rd] = Number(x.value); save(); route(); }));
  $$("[data-rdb]").forEach(x => (x.onchange = () => { d()[x.dataset.rdb] = x.checked; save(); }));
  $$("[data-ev]").forEach(x => (x.onchange = () => { const e = d().evals = d().evals || []; const i = e.indexOf(x.dataset.ev); if (x.checked && i < 0) e.push(x.dataset.ev); if (!x.checked && i >= 0) e.splice(i, 1); save(); }));
  $$("[data-rk]").forEach(x => (x.onchange = () => { r.risks[x.dataset.rk][x.dataset.f] = x.value; save(); }));
  $$("[data-rkdel]").forEach(b => (b.onclick = () => { r.risks.splice(Number(b.dataset.rkdel), 1); save(); route(); }));
  const a = $("#rk-add"); if (a) a.onclick = () => { (r.risks = r.risks || []).push({ type: "ops", lvl: "M", fix: "" }); save(); route(); };
};
REQ_PANELS.docs = (r, ed) => {
  const req = reqDocs(r), extra = r.docs.filter(dn => !req.some(x => x.re.test(dn)));
  return `<section class="panel"><header><h2>${L("เอกสารที่ต้องแนบตามเงื่อนไข", "Documents required by condition")}</h2><span class="sp"></span>${tag(`${req.filter(x => x.has).length}/${req.length}`, req.every(x => x.has) ? "p-ok" : "p-warn")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:8px">
      ${req.map(x => `<div class="docreq ${x.has ? "ok" : ""}"><span class="cw-dot ${x.has ? "" : "warn"}" style="${x.has ? "background:var(--ok-dot,var(--ok))" : ""}"></span><div style="min-width:0;flex:1"><b>${x.label}</b> <span class="mono sub">${x.rule}</span><div class="sub">${x.why}${x.has ? ` · ${esc(r.docs.find(dn => x.re.test(dn)))}` : ""}</div></div>
        ${ed && !x.has ? `<button type="button" class="btn" data-dpick="${x.key}">${L("เลือกไฟล์", "Choose file")}</button><button type="button" class="btn ghost" data-dsample="${x.key}">${L("ใช้ไฟล์ตัวอย่าง", "Use a sample")}</button>` : ""}</div>`).join("") || `<span class="sub">${L("คำขอนี้ไม่มีเอกสารที่ต้องแนบตามเงื่อนไข", "No documents are required by condition for this request")}</span>`}
      <input type="file" id="d-file" hidden>
    </div></section>
  <section class="panel"><header><h2>${L("เอกสารประกอบอื่น", "Other supporting documents")}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:8px">
    <div class="row">${extra.map(dn => tag(esc(dn), "p-mute")).join("") || `<span class="sub">${L("ยังไม่มี", "None yet")}</span>`}</div>
    ${ed ? `<div><button type="button" class="btn" data-dpick="other">+ ${L("แนบไฟล์อื่น", "Attach another file")}</button></div>` : ""}
    <span class="sub">${L("ต้นแบบเก็บเฉพาะชื่อไฟล์", "The prototype keeps the file name only")}</span></div></section>`;
};
REQ_BIND.docs = r => {
  const fi = $("#d-file"); let want = null;
  const label = k => { const x = reqDocs(r).find(d => d.key === k); return x ? x.label : ""; };
  const push = name => { r.docs.push(name); audit(["แนบเอกสาร", "Attached a document"], `${r.id}: ${name}`); commit(); route(); toast(L("แนบไฟล์แล้ว", "File attached")); };
  $$("[data-dpick]").forEach(b => (b.onclick = () => { want = b.dataset.dpick; fi.click(); }));
  if (fi) fi.onchange = () => { const f = fi.files[0]; if (f) push(want === "other" ? f.name : `${label(want)} · ${f.name}`); fi.value = ""; };
  $$("[data-dsample]").forEach(b => (b.onclick = () => push(`${label(b.dataset.dsample)}.pdf`)));
};
// equipment: location, GPS and price source (FR-B-10)
const PSRC = { bb: ["ราคามาตรฐานสำนักงบประมาณ", "Budget Bureau standard price"], central: ["เกณฑ์ราคาหน่วยงานกลาง", "Central agency price"], approved: ["ราคาที่เคยอนุมัติ (ไม่เกิน 2 ปี)", "Previously approved price (≤ 2 years)"], quote: ["ใบเสนอราคา", "Quotations"] };
{
  const base = REQ_PANELS.equip, bb = REQ_BIND.equip;
  REQ_PANELS.equip = (r, ed) => {
    const ds = ed ? "" : "disabled", inv = r.items.map((it, i) => [it, i]).filter(([it]) => it.type === "inv");
    return base(r, ed) + `<section class="panel"><header><h2>${L("สถานที่ พิกัด และแหล่งราคา", "Location, GPS and price source")}</h2><span class="sp"></span><span class="mono sub">BR-12</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("รายการ", "Item")}</th><th>${L("สถานที่ (ตำบล อำเภอ จังหวัด)", "Location (sub-district, district, province)")}</th><th>${L("ละติจูด, ลองจิจูด", "Lat, long")}</th><th>${L("แหล่งราคา", "Price source")}</th><th>${L("วันที่ราคา", "Price date")}</th></tr></thead>
        <tbody>${inv.map(([it, i]) => { const d = it.detail || {}; return `<tr><td>${esc(tx(it.name))}</td><td><input type="text" data-loc="${i}" data-f="loc" value="${esc(d.loc || "")}" ${ds} placeholder="${L("เช่น ต.บางกระสอ อ.เมือง จ.นนทบุรี", "e.g. Bang Krasor, Mueang, Nonthaburi")}" aria-label="${L("สถานที่", "Location")}" style="width:100%"></td>
          <td><input type="text" data-loc="${i}" data-f="gps" value="${esc(d.lat ? d.lat + ", " + d.lng : "")}" ${ds} placeholder="13.86, 100.51" aria-label="GPS" style="width:130px"></td>
          <td><select data-loc="${i}" data-f="src" ${ds} aria-label="${L("แหล่งราคา", "Price source")}"><option value="">—</option>${Object.keys(PSRC).map(k => `<option value="${k}" ${d.src === k ? "selected" : ""}>${tx(PSRC[k])}</option>`).join("")}</select></td>
          <td><input type="date" data-loc="${i}" data-f="srcDate" value="${d.srcDate || ""}" ${ds} aria-label="${L("วันที่ราคา", "Price date")}"></td></tr>`; }).join("")}</tbody></table></div></section>`;
  };
  REQ_BIND.equip = r => {
    bb(r);
    $$("[data-loc]").forEach(el => (el.onchange = () => {
      const it = r.items[el.dataset.loc]; it.detail = it.detail || { kind: "new", qtyOld: 0, age: 0, spec: "" };
      if (el.dataset.f === "gps") { const m = el.value.split(",").map(x => Number(x.trim())); if (m.length === 2 && m.every(x => !isNaN(x))) { it.detail.lat = m[0]; it.detail.lng = m[1]; } else { delete it.detail.lat; delete it.detail.lng; } }
      else it.detail[el.dataset.f] = el.value;
      save(); route();
    }));
  };
}

// ---------- request page: send to the director; the director's view ----------
{
  const bv = VIEWS.request, bb = BIND.request;
  VIEWS.request = () => {
    let html = bv();
    html = html.replace(L("ส่งให้กองแผนงาน", "Send to Planning"), L("ส่งให้ ผอ.กองเห็นชอบ", "Send to the division director"));
    return html;
  };
  BIND.request = () => {
    bb();
    const r = curReq(), sb = $("#submit");
    if (sb) sb.onclick = () => {
      if (checks(r).some(x => x.s === "no")) { const f = checks(r).find(x => x.s === "no"); REQ_TAB = f.step || "main"; route(); toast(L("ยังส่งไม่ได้ · แก้รายการที่มีจุดแดงก่อน", "Can't send yet · fix the items with a red dot first")); return; }
      r.status = "unit"; r.updated = TODAY;
      snapshot(r, ["ส่งให้ผู้อำนวยการกองเห็นชอบ", "Sent to the division director"], true);
      audit(["ส่งคำขอให้ผู้อำนวยการกองเห็นชอบ", "Sent a request to the division director"], r.id);
      const nm = Array.isArray(r.name) ? r.name : [r.name, r.name];
      notify(["divhead"], [`คำขอ ${r.id} ${nm[0]} รอท่านเห็นชอบ`, `Request ${r.id} ${nm[1]} is waiting for your approval`], "req:" + r.id);
      commit(); renderShell(); route(); toast(L("ส่งให้ ผอ.กองแล้ว", "Sent to the division director"));
    };
  };
}

// ---------- tasks, badges, menu roles ----------
{
  const bt = myTasks;
  myTasks = function () {
    const t = bt.apply(this, arguments);
    if (ROLE === "divhead") S.requests.filter(r => r.status === "unit" && r.unit === me().unit).forEach(r => t.unshift({ title: `${L("เห็นชอบคำขอ", "Approve request")} ${r.id} ${tx(r.name)}`, sub: `${mb(r.amount)} ${L("ลบ.", "M")}`, link: "req:" + r.id, due: cal("c2").date, cls: "p-warn" }));
    return t;
  };
  const nb = navBadge;
  navBadge = function (id) {
    if (id === "requests" && ROLE === "divhead") { const n = S.requests.filter(r => r.unit === me().unit && r.status === "unit").length; return n ? `<span class="badge">${n}</span>` : ""; }
    return nb(id);
  };
  const rs = renderShell;
  renderShell = function () {
    NAV.forEach(n => { if (n.roles.includes("div") && !n.roles.includes("divhead")) n.roles.push("divhead"); });
    if (typeof MATRIX !== "undefined" && !MATRIX.divhead) MATRIX.divhead = ["R", "A", "–", "R", "–", "R", "R", "U", "U", "–"];
    return rs.apply(this, arguments);
  };
}

// ---------- one data spine: M03 unit totals and M04 rounds from the requests ----------
const TYPE_ORDER = ["per", "ope", "inv", "sub", "oth"];
function syncBudget() {
  if (!S || !S.requests || !S.cons) return;
  const live = S.requests.filter(r => !["rejected", "cancelled"].includes(r.status)), by = {};
  live.forEach(r => { const v = by[r.unit] || (by[r.unit] = [0, 0, 0, 0, 0]); r.items.forEach(it => { const k = TYPE_ORDER.indexOf(it.type); if (k >= 0) v[k] += itemTotal(it) / 1e6; }); });
  S.cons.units = Object.keys(by).map(u => ({ unit: u, v: by[u].map(x => Math.round(x * 10) / 10) })).sort((a, b) => sumv(b.v) - sumv(a.v));
  const inRev = S.requests.filter(r => ["plan", "committee", "exec", "approved"].includes(r.status)), old = {};
  (S.review || []).forEach(x => (old[x.id] = x));
  S.review = inRev.map(r => {
    const r0 = Math.round(reqAmount(r) / 1e5) / 10, o = old[r.id];
    return { id: r.id, unit: r.unit, name: r.name, r0, r1: o ? o.r1 : r0, r2: o ? o.r2 : r0 };
  });
}
{
  const br = route;
  route = function () { syncBudget(); return br.apply(this, arguments); };
}

// ---------- seed (called from the shared seed builder) ----------
function seedBudgetB1(s) {
  const U = s.users.find(u => u.role === "div" && u.primary) || s.users.find(u => u.role === "div");
  if (!s.users.some(u => u.role === "divhead")) s.users.push({ id: "u20", role: "divhead", unit: U ? U.unit : "U04", primary: true, mfa: true, active: true, name: ["วิภา นำทาง", "Wipa Namtang"] });
  const w1 = s.workflow.findIndex(w => w.id === "w1");
  if (!s.workflow.some(w => w.id === "w1b")) s.workflow.splice(w1 + 1, 0, { id: "w1b", name: ["ผู้อำนวยการกองเห็นชอบ", "Division director approval"], role: "divhead", sla: 3, cond: "always" });
  const w3 = s.workflow.find(w => w.id === "w3"); if (w3) { w3.newProj = true; w3.name = ["คณะกรรมการพิจารณางบประมาณ (≥ วงเงิน หรือโครงการใหม่)", "Budget committee (amount threshold or new project)"]; }
  [["BR-07", "block", null, null, ["ทุกบรรทัดต้องเชื่อมกิจกรรม ผลผลิต/โครงการ และแผนงาน", "Every line links an activity, output or project, and programme"]],
   ["BR-08", "warn", 5, ["ปี", "years"], ["รายการผูกพันข้ามปีมีวงเงินทุกปีและไม่เกินระยะเวลาที่กำหนด", "Multi-year items have an amount every year and stay within the period"]],
   ["BR-09", "block", 1000, ["ล้านบาท", "M baht"], ["ผูกพันใหม่ตั้งแต่วงเงินนี้ต้องแนบมติคณะรัฐมนตรี (มาตรา 26)", "New commitments from this amount need a Cabinet resolution (section 26)"]],
   ["BR-10", "block", 200, ["ล้านบาท", "M baht"], ["เอกสารตามเงื่อนไข: ICT (CIO หรือคณะกรรมการ) และความเสี่ยงทุจริตเชิงนโยบาย (ลงทุน ≥ 500 ล้านบาท)", "Conditional documents: ICT (CIO or committee) and policy corruption risk (investment ≥ 500 M)"]],
   ["BR-11", "warn", 20, ["%", "%"], ["ภาพรวมของกองเพิ่มจากปีก่อนไม่เกินเพดาน ส่วนเพิ่มควรเป็นงบลงทุน", "Division total grows within the cap; the increase should be investment"]],
   ["BR-12", "block", 2, ["ปี", "years"], ["รายการลงทุนต้องมีสถานที่และพิกัด ราคาอ้างแหล่งที่ไม่เก่ากว่าที่กำหนด", "Investment lines need a location and GPS, and a price source within the age limit"]],
   ["BR-13", "block", 3, ["คะแนน", "score"], ["แผนรายไตรมาสรวมเท่ายอดขอ และความพร้อมของงบลงทุนไม่ต่ำกว่าเกณฑ์", "Quarterly plan adds up to the request; investment readiness at least the threshold"]],
  ].forEach(([id, effect, param, unit, name]) => { if (!s.rules.some(x => x.id === id)) s.rules.push(Object.assign({ id, on: true, effect, name }, param != null ? { param, unit } : {})); });
  const done = r => !["draft", "returned"].includes(r.status);
  s.requests.forEach((r, n) => {
    if (done(r)) {
      r.qplan = qplanFill(r);
      r.ready = { site: n % 3 ? "ready" : "prep", staff: 4, mgmt: 4, mat: n % 2 ? 4 : 3, forest: false, eia: false, evals: ["process", "post"] };
      r.risks = [{ type: "ops", lvl: "M", fix: ["ติดตามความก้าวหน้ารายเดือน", "Track progress monthly"][LANG === "en" ? 1 : 0] }];
      r.items.forEach(it => { if (it.type === "inv") { it.detail = it.detail || { kind: "new", qtyOld: 0, age: 0, spec: "" }; it.detail.loc = it.detail.loc || "สำนักงานใหญ่ อ.เมือง จ.นนทบุรี"; it.detail.lat = 13.86; it.detail.lng = 100.51; it.detail.src = "bb"; it.detail.srcDate = "2026-06-30"; } });
    }
  });
  const story = s.requests.find(r => r.id === s.story);
  if (story) { story.risks = []; delete story.qplan; delete story.ready; }
  // review rows now come from the requests; replace the three stand-alone sample projects
  const map = { "REQ-2571-021": "REQ-2571-006", "REQ-2571-022": "REQ-2571-009", "REQ-2571-023": "REQ-2571-003" };
  (s.meetings || []).forEach(m => { if (!m.items) return; Object.keys(m.items).forEach(k => { if (map[k] && s.requests.some(r => r.id === map[k])) { m.items[map[k]] = m.items[k]; delete m.items[k]; } }); });
  const saved = { "REQ-2571-006": [45, 45], "REQ-2571-003": [13.5, 13.5], "REQ-2571-002": [17.2, 17] };
  s.review = s.requests.filter(r => ["plan", "committee", "exec", "approved"].includes(r.status)).map(r => { const r0 = Math.round(reqAmount(r) / 1e5) / 10, sv = saved[r.id]; return { id: r.id, unit: r.unit, name: r.name, r0, r1: sv ? sv[0] : r0, r2: sv ? sv[1] : r0 }; });
  const nm = id => { const r = s.requests.find(x => x.id === id); return r ? r.name : [id, id]; };
  s.log = [
    { t: "2026-10-15T16:20", role: "exec", text: [`รอบ 3 · ${nm("REQ-2571-002")[0]} ปรับจาก 17.2 เป็น 17 ล้านบาท`, `Round 3 · ${nm("REQ-2571-002")[1]} changed from 17.2 to 17 million baht`], why: ["ปัดตามราคากลางปีล่าสุด", "Rounded to the latest reference prices"] },
    { t: "2026-10-13T10:05", role: "plan", text: [`รอบ 2 · ${nm("REQ-2571-003")[0]} ปรับจาก 15 เป็น 13.5 ล้านบาท`, `Round 2 · ${nm("REQ-2571-003")[1]} changed from 15 to 13.5 million baht`], why: ["ลดค่าที่ปรึกษาให้ตรงขอบเขตงาน", "Cut consultancy to match the scope"] },
    { t: "2026-10-13T09:40", role: "plan", text: [`รอบ 2 · ${nm("REQ-2571-006")[0]} ปรับจาก 50 เป็น 45 ล้านบาท`, `Round 2 · ${nm("REQ-2571-006")[1]} changed from 50 to 45 million baht`], why: ["แบ่งดำเนินการเป็น 2 ระยะ", "Split into two phases"] },
  ];
  // M03: unit totals from the requests; ceilings at 95% of each unit's request
  const by = {};
  s.requests.filter(r => r.status !== "rejected").forEach(r => (by[r.unit] = (by[r.unit] || 0) + reqAmount(r) / 1e6));
  const tot = Object.values(by).reduce((a, b) => a + b, 0);
  s.cons.ceiling = Math.round(tot * 0.95);
  s.cons.unitCeil = {}; Object.keys(by).forEach(u => (s.cons.unitCeil[u] = Math.round(by[u] * 0.95 * 10) / 10));
  if (s.cons.resp) Object.keys(s.cons.resp).forEach(u => { if (!by[u]) delete s.cons.resp[u]; });
}
