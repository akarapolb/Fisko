// Fisko Finance round FN1 (Finance design v0.1, chapter 12): foundations.
// - Finance rules in M10 (P-F03): thresholds, regulation clocks and the payment-approval authority table (clause 36).
//   The administrator edits; finance, the head of finance and the auditor read. Every value carries its clause and level.
// - Head of finance role (finhead, D-FN-02): checks, escalations and later the period close.
// - Commitments register (FR-FN-01, 03, 04, 05): contracts from Procurement plus non-procurement commitments.
// - GFMIS purchase orders (FR-FN-02): contracts and agreements from 5,000 baht need a PO number before a payment request.
// - Carry-over candidates (FR-FN-06) sent to the M06 carry-over page.
// - F1 Finance overview with the regulation clocks.
ROLES.finhead = ["หัวหน้าการเงิน (ผู้อำนวยการกองคลัง)", "Head of finance"];
const isFinRole = () => ROLE === "fin" || ROLE === "finhead";
let FN_PO = null;

// ---------- finance rules (M10) ----------
const FCFG_DEFAULT = () => ({
  poMin: 5000, whtMin: 10000, whtPct: 1, carryMin: 100000, carryBy: "2027-09-30", aheadDays: 10,
  perDiem: 240, hotel: 1500, kmRate: 4,
  reqDays: 5, monthlyDay: 15, advTravel: 15, advOther: 30, advFix: 15, demandDays: 30, remitCash: 10000, remitDays: 3, refundDays: 15,
  auth: [
    { id: "A1", pos: ["หัวหน้าส่วนราชการระดับกรม", "Head of the department"], role: "exec", max: 0 },
    { id: "A2", pos: ["รองหัวหน้าส่วนราชการ (ได้รับมอบหมาย)", "Deputy head (by assignment)"], role: "exec", max: 10000000 },
    { id: "A3", pos: ["ผู้อำนวยการกองคลัง (ได้รับมอบหมาย ระดับชำนาญการขึ้นไป)", "Director of finance (by assignment, professional level or higher)"], role: "finhead", max: 1000000 },
  ],
});
function fcfg() {
  const d = FCFG_DEFAULT(), c = (S && S.fcfg) || {};
  return Object.assign(d, c, { auth: d.auth.map(a => Object.assign({}, a, ((c.auth || []).find(x => x.id === a.id) || {}))) });
}
// key: [label, unit, level, source]
const FCFG_ROWS = {
  limits: [
    ["poMin", ["ต้องลงใบสั่งซื้อ (PO) ใน GFMIS เมื่อวงเงินตั้งแต่", "A GFMIS purchase order is needed from"], ["บาท", "baht"], "A", "ข้อ 28 (1)"],
    ["whtMin", ["หักภาษี ณ ที่จ่าย เมื่อใบสั่งซื้อหรือสั่งจ้างตั้งแต่", "Withhold tax when the order is at least"], ["บาท", "baht"], "B", "S2"],
    ["whtPct", ["อัตราภาษีหัก ณ ที่จ่าย ซื้อและจ้างทำของ", "Withholding rate, goods and works"], ["%", "%"], "B", "S2"],
    ["carryMin", ["กันเงินเหลื่อมปีได้เมื่อวงเงินผูกพันตั้งแต่", "Carry-over allowed from a commitment of"], ["บาท", "baht"], "A", "ข้อ 105"],
    ["remitCash", ["นำส่งเร็วเมื่อรายได้แผ่นดินเงินสดในวันใดเกิน", "Remit early when cash revenue held in a day exceeds"], ["บาท", "baht"], "A", "ข้อ 101 (2)"],
  ],
  travel: [
    ["perDiem", ["เบี้ยเลี้ยงเดินทาง ต่อวัน", "Per diem, per day"], ["บาท", "baht"], "C", "—"],
    ["hotel", ["ค่าที่พัก ต่อคืน (เหมาจ่ายสูงสุด)", "Accommodation, per night (cap)"], ["บาท", "baht"], "C", "—"],
    ["kmRate", ["ค่ารถส่วนตัว ต่อกิโลเมตร", "Private car, per km"], ["บาท", "baht"], "C", "—"],
  ],
  clocks: [
    ["reqDays", ["ขอเบิกค่าซื้อ จ้าง เช่า หลังตรวจรับ ภายใน", "Request payment after acceptance within"], ["วันทำการ", "working days"], "A", "ข้อ 28"],
    ["monthlyDay", ["ขอเบิกรายการประจำเดือน ภายในวันที่", "Monthly items requested by day"], ["ของเดือน", "of the month"], "A", "ข้อ 31"],
    ["aheadDays", ["เตือนเมื่อขอเบิกก่อนถึงกำหนดจ่ายเกิน", "Warn when requesting earlier than due by"], ["วัน", "days"], "C", "ข้อ 22"],
    ["advTravel", ["ส่งใช้เงินยืมเดินทางไปราชการ นับจากวันกลับ", "Clear a travel advance, from the return date"], ["วัน", "days"], "A", "ข้อ 65 (2)"],
    ["advOther", ["ส่งใช้เงินยืมอื่นและไปประจำต่างสำนักงาน นับจากวันรับเงิน", "Clear other advances, from the payment date"], ["วัน", "days"], "A", "ข้อ 65 (1), (3)"],
    ["advFix", ["ผู้ยืมแก้ข้อทักท้วงภายใน", "Borrower fixes an objection within"], ["วัน", "days"], "A", "ข้อ 65"],
    ["demandDays", ["เรียกชดใช้เงินยืมภายใน นับจากวันครบกำหนด", "Demand repayment within, from the due date"], ["วัน", "days"], "A", "ข้อ 68"],
    ["remitDays", ["นำส่งรายได้เงินสดที่เกินเกณฑ์ภายใน", "Remit cash revenue above the limit within"], ["วันทำการ", "working days"], "A", "ข้อ 101 (2)"],
    ["refundDays", ["ส่งคืนเงินที่เบิกมาแต่ไม่ได้จ่ายภายใน", "Return money drawn but not paid within"], ["วันทำการ", "working days"], "A", "ข้อ 99, 101 (4)"],
  ],
};
ADMIN_TABS.push({ id: "fcfg", label: ["กฎการเงิน", "Finance rules"], roles: ["admin", "fin", "finhead", "audit"] });
ADMIN.fcfg = () => {
  const c = fcfg(), ed = ROLE === "admin", ds = ed ? "" : "disabled";
  const lvl = v => tag(v, v === "A" ? "p-ok" : v === "B" ? "p-info" : "p-mute");
  const rows = list => list.map(([k, label, unit, lv, src]) => `<tr><td>${tx(label)}</td><td class="n"><input type="number" data-fc="${k}" value="${c[k]}" min="0" step="1" ${ds} style="width:100px" aria-label="${esc(tx(label))}"> ${tx(unit)}</td><td>${lvl(lv)}</td><td class="sub">${src}</td></tr>`).join("");
  const sec = (title, sub, body) => `<section class="panel"><header><h2>${title}</h2><span class="sp"></span><span class="sub">${sub}</span></header><div class="tbl-wrap"><table><thead><tr><th>${L("ค่า", "Setting")}</th><th class="n">${L("ตั้งไว้", "Value")}</th><th>${L("ระดับ", "Level")}</th><th>${L("ที่มา", "Source")}</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
  return `${ed ? "" : `<div class="alert"><div class="ic">i</div><div><b>${L("ดูอย่างเดียว", "View only")}</b><p>${L("ผู้ดูแลระบบเป็นผู้แก้ไข การเงินและผู้ตรวจสอบเห็นค่าที่ระบบใช้", "The administrator edits these; finance and audit see the values the system uses")}</p></div></div>`}
    ${sec(L("วงเงินและเกณฑ์", "Amounts and thresholds"), L("ระเบียบกระทรวงการคลังว่าด้วยการเบิกเงินจากคลังฯ พ.ศ. 2562", "Finance Ministry regulation on treasury withdrawals, 2562"), rows(FCFG_ROWS.limits) +
      `<tr><td>${L("วันสุดท้ายที่ขอกันเงินไว้เบิกเหลื่อมปีใน GFMIS", "Last day to file carry-over in GFMIS")}</td><td class="n"><input type="date" data-fcd="carryBy" value="${c.carryBy}" ${ds} aria-label="${L("วันสุดท้ายที่ขอกันเงิน", "Carry-over filing date")}"></td><td>${lvl("B")}</td><td class="sub">ข้อ 106 · S5</td></tr>`)}
    ${sec(L("อัตราช่วยคำนวณค่าเดินทาง (FR-FN-24)", "Travel rates for the calculator (FR-FN-24)"), L("ค่าตัวอย่าง ต้องยืนยันกับอัตราที่ใช้จริงของหน่วยงาน", "Sample values; confirm with the agency's actual rates"), rows(FCFG_ROWS.travel))}
    ${sec(L("นาฬิกาตามระเบียบ", "Regulation clocks"), L("วันทำการไม่นับเสาร์ อาทิตย์ และวันหยุดใน กฎจัดซื้อจัดจ้าง", "Working days skip weekends and the holidays in Procurement rules"), rows(FCFG_ROWS.clocks))}
    <section class="panel"><header><h2>${L("ผู้มีอำนาจอนุมัติจ่าย (ข้อ 36)", "Payment approval authority (clause 36)")}</h2><span class="sp"></span><span class="sub">${L("ใช้ตรวจผู้อนุมัติใบขอเบิกและเงินยืม", "Used to check who approves vouchers and advances")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ตำแหน่ง", "Position")}</th><th>${L("บทบาทในระบบ", "Role in Fisko")}</th><th class="n">${L("อนุมัติได้ไม่เกิน (บาท · 0 = ไม่จำกัด)", "Up to (baht · 0 = no limit)")}</th><th>${L("ระดับ", "Level")}</th></tr></thead>
        <tbody>${c.auth.map(a => `<tr><td>${tx(a.pos)}</td><td class="sub">${tx(ROLES[a.role])}</td><td class="n"><input type="number" data-fca="${a.id}" value="${a.max}" min="0" step="1000" ${ds} style="width:130px" aria-label="${esc(tx(a.pos))}"></td><td>${lvl(a.id === "A1" ? "A" : "C")}</td></tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("หัวหน้าส่วนราชการระดับกรมเป็นผู้มีอำนาจตามข้อ 36 (1) ผู้ได้รับมอบหมายต้องดำรงตำแหน่งตามที่ข้อ 36 กำหนด วงเงินของผู้ได้รับมอบหมายเป็นตัวอย่าง ตั้งตามคำสั่งมอบหมายของหน่วยงาน", "The head of the department holds the authority under clause 36 (1). Assignees must hold the positions the clause sets. Assignee limits are examples; set them from the agency's assignment order.")}</div></section>
    ${ed ? `<div class="row"><button class="btn ghost" type="button" id="fc-reset">${L("คืนค่าตั้งต้น", "Restore defaults")}</button><span class="sub">${L("ระดับ A อ่านจากตัวบทระเบียบ · ระดับ B มาจากข้อหารือหรือข่าว ต้องยืนยัน · ระดับ C เป็นข้อเสนอการออกแบบ", "Level A is read from the regulation · level B comes from rulings or news and needs confirming · level C is a design proposal")}</span></div>` : ""}`;
};
BIND_ADMIN.fcfg = () => {
  const save_ = (key, old, v) => { audit(["ปรับกฎการเงิน", "Changed a finance rule"], `${key}: ${old} → ${v}`); commit(); route(); };
  $$("[data-fc]").forEach(inp => (inp.onchange = () => { const k = inp.dataset.fc, v = Number(inp.value), old = fcfg()[k]; S.fcfg = Object.assign({}, S.fcfg, { [k]: v }); save_(k, old, v); }));
  $$("[data-fcd]").forEach(inp => (inp.onchange = () => { const k = inp.dataset.fcd, old = fcfg()[k]; if (!inp.value) return; S.fcfg = Object.assign({}, S.fcfg, { [k]: inp.value }); save_(k, old, inp.value); }));
  $$("[data-fca]").forEach(inp => (inp.onchange = () => {
    const id = inp.dataset.fca, v = Number(inp.value), cur = Object.assign({}, S.fcfg), auth = (cur.auth || []).filter(a => a.id !== id);
    const old = fcfg().auth.find(a => a.id === id).max; auth.push({ id, max: v }); cur.auth = auth; S.fcfg = cur; save_(id, old, v);
  }));
  const r = $("#fc-reset"); if (r) r.onclick = () => { S.fcfg = {}; audit(["คืนค่าตั้งต้นกฎการเงิน", "Restored finance rule defaults"], ""); commit(); route(); };
};

// ---------- commitments register ----------
const FC_KIND = { contract: ["สัญญาจัดซื้อจัดจ้าง", "Procurement contract"], utility: ["ค่าสาธารณูปโภค", "Utilities"], rent: ["ค่าเช่า", "Rent"], service: ["สัญญาบริการ", "Service agreement"], travel: ["คำสั่งเดินทางไปราชการ", "Travel order"] };
const conPaid = c => sumv(S.payreqs.filter(p => p.contract === c.id && p.status === "approved").map(p => p.amount));
// One list for every commitment: contracts come live from Procurement, the others are kept by Finance.
function finCommits() {
  const fromCon = (S.contracts || []).map(c => ({ src: "contract", kind: "contract", id: c.id, name: famPlan(c.plan).name, line: c.line, vendor: c.vendor, amount: c.amount, released: 0,
    paid: conPaid(c), signed: c.signed, due: c.phases.map(ph => ph.due).sort().pop() || c.signed, gfPo: c.gfPo || null, ref: c }));
  const other = (S.fcommit || []).map(c => Object.assign({ src: "other", ref: c }, c, { paid: c.paid || 0, released: c.released || 0 }));
  return [...fromCon, ...other];
}
const fcLeft = x => Math.max(0, x.amount - x.released - x.paid);
// Clause 28 covers buying, hiring and renting under the procurement law; utilities and travel orders need no PO.
const poKind = x => ["contract", "rent", "service"].includes(x.kind);
const needsPo = x => poKind(x) && x.amount >= fcfg().poMin && !x.gfPo;
const fcRef = id => (S.contracts || []).find(c => c.id === id) || (S.fcommit || []).find(c => c.id === id);
// Carry-over candidates (FR-FN-06): signed by the year end, at least the carry-over amount still unpaid, last payment due after the year end.
const carryCands = () => finCommits().filter(x => x.signed <= FY_END && fcLeft(x) >= fcfg().carryMin && x.due > FY_END);
const carrySent = id => (S.carry && S.carry.reqs || []).some(r => r.src === id);
// The acceptance date of a phase is the last committee signature; the request clock (clause 28) starts from it.
const accDate = ph => ph.signs.map(s => s.t).sort().pop().slice(0, 10);
const reqDue = ph => addWorkdays(accDate(ph), fcfg().reqDays);

// ---------- regulation clocks ----------
function finClocks() {
  const out = [], add = (due, title, sub, link, src, who) => out.push({ due, title, sub, link, src, who });
  famAcceptedUnpaid().forEach(({ c, ph }) => add(reqDue(ph), `${L("ขอเบิก", "Request payment for")} ${c.id} ${tx(ph.name)}`, `${tx(c.vendor)} · ${fmt(ph.amount)} ${L("บาท", "baht")} · ${L("ตรวจรับ", "accepted")} ${fdate(accDate(ph))}`, "fnc-pay", L("ข้อ 28", "cl. 28"), "fin"));
  finCommits().filter(needsPo).forEach(x => add(x.signed, `${L("บันทึกเลขที่ PO ใน GFMIS", "Record the GFMIS PO for")} ${x.id}`, `${tx(x.vendor)} · ${fmt(x.amount)} ${L("บาท", "baht")}`, "fnc-chain", L("ข้อ 28 (1)", "cl. 28 (1)"), "fin"));
  const cc = carryCands().filter(x => !carrySent(x.id));
  if (cc.length) add(fcfg().carryBy, L(`เสนอกันเงินเหลื่อมปี ${cc.length} รายการ`, `Propose ${cc.length} commitments for carry-over`), `${mb(sumv(cc.map(fcLeft)))} ${L("ลบ.", "M")}`, "fnc-chain", L("ข้อ 105–106", "cl. 105–106"), "fin");
  return out.sort((a, b) => (a.due < b.due ? -1 : 1));
}
const clockDot = due => { const d = daysUntil(due); return d < 0 ? "bad" : d <= 2 ? "warn" : "ok"; };
const clockTxt = due => { const d = daysUntil(due); return d < 0 ? `<span style="color:var(--bad)">${L("เลยกำหนด", "Overdue")} ${-d} ${L("วัน", "d")}</span>` : d === 0 ? `<span style="color:var(--warn)">${L("วันนี้", "Today")}</span>` : `${fdate(due)} · ${L("อีก", "in")} ${d} ${L("วัน", "d")}`; };
const dotI = k => `<i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--${k === "ok" ? "accent" : k});margin-right:6px;vertical-align:middle"></i>`;

// ---------- F1 overview ----------
FIN.home = () => {
  const K = finClocks(), soon = K.filter(k => daysUntil(k.due) <= 2), all = finCommits();
  const left = sumv(all.map(fcLeft)), com = sumv(all.map(x => x.amount - x.released)), paid = sumv(all.map(x => x.paid));
  const pend = S.payreqs.filter(p => p.status === "pending"), diff = S.payreqs.filter(p => p.recon && p.recon.state === "diff");
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi hl"><span class="l">${L("ครบกำหนดภายใน 2 วัน", "Due within 2 days")}</span><span class="v">${soon.length}</span><span class="d" style="color:var(--rail-ink)">${K.filter(k => daysUntil(k.due) < 0).length} ${L("เลยกำหนด", "overdue")}</span></div>
    <div class="kpi"><span class="l">${L("รอเลขที่ PO ใน GFMIS", "Waiting for a GFMIS PO")}</span><span class="v">${all.filter(needsPo).length}</span></div>
    <div class="kpi"><span class="l">${L("ผูกพันที่ยังไม่จ่าย", "Committed, not paid")}</span><span class="v">${mb(left)}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("จ่ายแล้วต่อวงเงินผูกพัน", "Paid of committed")}</span><span class="v">${fmt(com ? paid / com * 100 : 0, 1)}<small>%</small></span></div>
  </section>
  <section class="panel"><header><h2>${L("นาฬิกาตามระเบียบ", "Regulation clocks")}</h2><span class="sp"></span><span class="sub">${L("เรียงตามวันครบกำหนด · จำนวนวันตั้งใน M10 → กฎการเงิน", "By due date · day counts are set in M10 → Finance rules")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("งาน", "Work")}</th><th>${L("ครบกำหนด", "Due")}</th><th>${L("ที่มา", "Source")}</th><th></th></tr></thead>
      <tbody>${K.map(k => `<tr><td>${dotI(clockDot(k.due))}<b style="font-weight:600">${esc(k.title)}</b><div class="sub">${esc(k.sub)}</div></td><td style="white-space:nowrap">${clockTxt(k.due)}</td><td class="sub">${k.src}</td><td><button class="btn" type="button" data-jump="${k.link}">${L("เปิด", "Open")}</button></td></tr>`).join("")
        || `<tr><td colspan="4" class="sub">${L("ไม่มีงานที่มีกำหนดเวลา", "Nothing on the clock")}</td></tr>`}</tbody></table></div></section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("รออนุมัติและรอกระทบยอด", "Waiting for approval or matching")}</h2></header>
      <div class="body">
        <p>${dotI(pend.length ? "warn" : "ok")}${pend.length} ${L("คำขอเบิกจ่ายรออนุมัติ", "payment requests waiting for approval")} ${pend.length ? `<button class="btn ghost" type="button" data-jump="fnc-pay">${L("ดู", "View")}</button>` : ""}</p>
        <p>${dotI(diff.length ? "bad" : "ok")}${diff.length} ${L("รายการมีผลต่างกับ GFMIS", "payments differ from GFMIS")} ${diff.length ? `<button class="btn ghost" type="button" data-jump="fnc-recon">${L("ดู", "View")}</button>` : ""}</p>
      </div></section>
    <section class="panel"><header><h2>${L("วงเงินผูกพันตามประเภท", "Commitments by kind")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท", "M baht")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ประเภท", "Kind")}</th><th class="n">${L("ผูกพัน", "Committed")}</th><th class="n">${L("จ่ายแล้ว", "Paid")}</th><th class="n">${L("คงค้าง", "Left")}</th></tr></thead>
        <tbody>${Object.keys(FC_KIND).map(k => { const xs = all.filter(x => x.kind === k); return xs.length ? `<tr><td>${tx(FC_KIND[k])} <span class="sub">(${xs.length})</span></td><td class="n">${mb(sumv(xs.map(x => x.amount - x.released)))}</td><td class="n">${mb(sumv(xs.map(x => x.paid)))}</td><td class="n">${mb(sumv(xs.map(fcLeft)))}</td></tr>` : ""; }).join("")}</tbody></table></div></section>
  </div>`;
};

// ---------- F2 commitments and POs (wraps the round-11 chain table) ----------
{
  const chain = FIN.chain;
  FIN.chain = () => {
    const all = finCommits(), fin = isFinRole(), maker = ROLE === "fin", c = fcfg(), noPo = all.filter(needsPo);
    const cc = carryCands(), lines = famLines().filter(l => l.type === "ope" || l.type === "inv");
    const poRow = x => {
      const open = FN_PO === x.id, l = famLine(x.line);
      return `<tr><td class="mono">${x.id}</td><td>${esc(tx(x.name))}<div class="sub">${tx(FC_KIND[x.kind])} · ${esc(tx(x.vendor))}</div></td><td class="n">${fmt(x.amount)}</td><td>${x.gfPo ? `<span class="mono">${esc(x.gfPo.no)}</span><div class="sub">${fdate(x.gfPo.t)}</div>` : poKind(x) && x.amount >= c.poMin ? tag(L("ยังไม่มี PO", "No PO yet"), "p-warn") : `<span class="sub">${L("ไม่ต้องมี", "Not needed")}</span>`}</td>
        <td>${maker && needsPo(x) ? `<button class="btn" type="button" data-fnpo="${x.id}">${open ? L("ปิด", "Close") : L("เตรียมข้อมูล PO", "Prepare PO data")}</button>` : ""}</td></tr>
        ${open ? `<tr><td colspan="5"><div class="callout" style="margin:0"><b>${L("ข้อมูลสำหรับลงใบสั่งซื้อใน GFMIS", "Data for the GFMIS purchase order")}</b>
          <div class="sub">${L("ผู้ขาย", "Supplier")}: ${esc(tx(x.vendor))} · ${L("รหัสงบประมาณ", "Budget code")}: <span class="mono">${x.line}</span> ${esc(lineLabel(l))} · ${L("วงเงิน", "Amount")}: ${fmt(x.amount)} ${L("บาท", "baht")} · ${L("ลงนาม", "Signed")} ${fdate(x.signed)}${x.ref.phases ? ` · ${x.ref.phases.length} ${L("งวด", "phases")}: ${x.ref.phases.map(ph => `${fdate(ph.due)} ${fmt(ph.amount)}`).join(" / ")}` : ""}</div>
          <form class="inline-form" data-poform="${x.id}" style="margin-top:8px"><div class="f" style="flex:0 1 220px"><label for="po-${x.id}">${L("เลขที่ PO จาก GFMIS (10 หลัก)", "GFMIS PO number (10 digits)")}</label><input type="text" id="po-${x.id}" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" required placeholder="7000000000"></div><button class="btn primary" type="submit">${L("บันทึกเลขที่ PO", "Save PO number")}</button></form></div></td></tr>` : ""}`;
    };
    return `
    <section class="panel"><header><h2>${L("ใบสั่งซื้อใน GFMIS", "Purchase orders in GFMIS")}</h2><span class="sp"></span><span class="sub">${L("ตั้งแต่", "From")} ${fmt(c.poMin)} ${L("บาท ต้องลง PO เพื่อจองงบประมาณก่อนขอเบิก (ข้อ 28 (1))", "baht a PO must reserve the budget before a payment request (clause 28 (1))")}</span></header>
      ${noPo.length ? `<div class="body" style="padding-bottom:0"><div class="alert" style="margin:0"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${noPo.length} ${L("รายการยังไม่มีเลขที่ PO", "commitments have no PO number yet")}</b><p>${L("ขอเบิกเงินของรายการเหล่านี้ไม่ได้จนกว่าจะบันทึกเลขที่ PO", "Payments for these can't be requested until the PO number is recorded")}</p></div></div></div>` : ""}
      <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("วงเงิน (บาท)", "Amount (baht)")}</th><th>${L("PO ใน GFMIS", "GFMIS PO")}</th><th></th></tr></thead>
        <tbody>${all.slice().sort((a, b) => (needsPo(b) - needsPo(a))).map(poRow).join("")}</tbody></table></div></section>
    ${chain()}
    <section class="panel"><header><h2>${L("ผูกพันที่ไม่ใช่การจัดซื้อ", "Commitments outside procurement")}</h2><span class="sp"></span><span class="sub">${L("กันวงเงินจากรายการจัดสรร คืนวงเงินได้พร้อมเหตุผล (FR-FN-03, 04)", "Reserve the allocation line; release with a reason (FR-FN-03, 04)")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("ผูกพัน (บาท)", "Committed (baht)")}</th><th class="n">${L("จ่ายแล้ว", "Paid")}</th><th class="n">${L("คืนแล้ว", "Released")}</th><th class="n">${L("คงค้าง", "Left")}</th><th></th></tr></thead>
        <tbody>${all.filter(x => x.src === "other").map(x => `<tr><td class="mono">${x.id}</td><td>${esc(tx(x.name))}<div class="sub">${tx(FC_KIND[x.kind])} · ${esc(tx(x.vendor))} · <span class="mono">${x.line}</span> · ${L("ถึง", "to")} ${fdate(x.due)}</div></td><td class="n">${fmt(x.amount)}</td><td class="n">${fmt(x.paid)}</td><td class="n">${fmt(x.released)}</td><td class="n">${fmt(fcLeft(x))}</td>
          <td>${maker && fcLeft(x) > 0 ? `<div class="row" style="flex-wrap:nowrap"><input type="number" id="rl-${x.id}" min="1" max="${fcLeft(x)}" step="1" style="width:110px" placeholder="${L("บาท", "baht")}" aria-label="${L("คืนวงเงิน (บาท)", "Release (baht)")}"><input type="text" id="rw-${x.id}" placeholder="${L("เหตุผล", "Reason")}" style="min-width:140px" aria-label="${L("เหตุผล", "Reason")}"><button class="btn" type="button" data-fnrel="${x.id}">${L("คืนวงเงิน", "Release")}</button></div>` : ""}${historyBtn(x.id, x.id)}</td></tr>`).join("")
          || `<tr><td colspan="7" class="sub">${L("ยังไม่มี", "None yet")}</td></tr>`}</tbody></table></div>
      ${maker ? `<div class="body"><form class="inline-form" id="fc-form">
        <div class="f" style="flex:0 1 170px"><label for="fc-kind">${L("ประเภท", "Kind")}</label><select id="fc-kind">${["utility", "rent", "service", "travel"].map(k => `<option value="${k}">${tx(FC_KIND[k])}</option>`).join("")}</select></div>
        <div class="f" style="flex:2 1 220px"><label for="fc-name">${L("รายการ", "Item")}</label><input type="text" id="fc-name" required></div>
        <div class="f" style="flex:1 1 160px"><label for="fc-vendor">${L("เจ้าหนี้", "Payee")}</label><input type="text" id="fc-vendor" required></div>
        <div class="f" style="flex:2 1 240px"><label for="fc-line">${L("รายการจัดสรร", "Allocation line")}</label><select id="fc-line">${lines.map(l => `<option value="${l.id}">${esc(lineLabel(l))} · ${L("คงเหลือ", "free")} ${mb(famHeadroom(l.id))}</option>`).join("")}</select></div>
        <div class="f" style="flex:0 1 140px"><label for="fc-amt">${L("วงเงิน (บาท)", "Amount (baht)")}</label><input type="number" id="fc-amt" min="1" step="1" required></div>
        <div class="f" style="flex:0 1 160px"><label for="fc-due">${L("จ่ายงวดสุดท้าย", "Last payment")}</label><input type="date" id="fc-due" value="${FY_END}" required></div>
        <button class="btn primary" type="submit">${L("บันทึกผูกพัน", "Add commitment")}</button></form></div>` : ""}</section>
    <section class="panel"><header><h2>${L("รายการเข้าเกณฑ์กันเงินเหลื่อมปี", "Carry-over candidates")}</h2><span class="sp"></span><span class="sub">${L("ผูกพันก่อนสิ้นปี คงค้างตั้งแต่", "Committed before the year end, at least")} ${fmt(c.carryMin)} ${L("บาท และจ่ายงวดสุดท้ายหลัง", "baht left, last payment after")} ${fdate(FY_END)} · ${L("ยื่นใน GFMIS ภายใน", "file in GFMIS by")} ${fdate(c.carryBy)} (${L("ข้อ 105–106", "clauses 105–106")})</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Item")}</th><th>${L("ลงนาม", "Signed")}</th><th>${L("งวดสุดท้าย", "Last payment")}</th><th class="n">${L("คงค้าง (บาท)", "Left (baht)")}</th><th></th></tr></thead>
        <tbody>${cc.map(x => `<tr><td class="mono">${x.id}</td><td>${esc(tx(x.name))}<div class="sub">${esc(tx(x.vendor))}</div></td><td class="sub">${fdate(x.signed)}</td><td class="sub">${fdate(x.due)}</td><td class="n">${fmt(fcLeft(x))}</td>
          <td>${carrySent(x.id) ? tag(L("ส่งให้ M06 แล้ว", "Sent to M06"), "p-ok") : maker ? `<button class="btn" type="button" data-fncf="${x.id}">${L("เสนอกันเงิน (M06)", "Propose carry-over (M06)")}</button>` : ""}</td></tr>`).join("")
          || `<tr><td colspan="6" class="sub">${L("ไม่มีรายการเข้าเกณฑ์", "No commitment meets the rule")}</td></tr>`}</tbody></table></div></section>`;
  };
}

// ---------- page and bindings ----------
// Subtitle of each Finance page; later rounds add their own.
const FIN_SUB = {
  home: () => L("งานที่มีกำหนดเวลาตามระเบียบ สิ่งที่รออนุมัติ และวงเงินผูกพัน", "Work on a regulation clock, what is waiting, and commitments"),
  chain: () => L("วงเงินผูกพันทุกแหล่ง ใบสั่งซื้อใน GFMIS และรายการกันเงินเหลื่อมปี", "Every commitment, GFMIS purchase orders and carry-over candidates"),
  pay: () => L("ใบขอเบิกทุกประเภท ภาษี ณ ที่จ่าย การอนุมัติ และการจ่าย", "Vouchers of every type, withholding tax, approval and payment"),
  recon: () => L("กระทบยอดการจ่ายกับไฟล์รายงานจาก GFMIS", "Match payments with GFMIS report files"),
};
VIEWS.finance = () => {
  const n = NAV.find(x => x.id === "finance");
  if (!FIN[FIN_TAB] || !n.tabs.some(t => t[0] === FIN_TAB)) FIN_TAB = "home";
  const t = n.tabs.find(x => x[0] === FIN_TAB);
  const sub = (FIN_SUB[FIN_TAB] || (() => ""))();
  return `
  <div class="head"><div><div class="eyebrow">Fisko Finance · ${t[2]}</div><h1>${tx(t[1])}</h1>
    <p>${sub} · ${L("GFMIS เป็นระบบบันทึกบัญชีและจ่ายเงินทางการ", "GFMIS stays the official books and payment channel")} · ${fyLabel(FAM_FY)}</p></div></div>
  ${FIN[FIN_TAB]()}`;
};
{
  const bind = BIND.finance;
  BIND.finance = () => {
    bind();
    $$("[data-jump]").forEach(b => (b.onclick = () => jump(b.dataset.jump)));
    $$("[data-fnpo]").forEach(b => (b.onclick = () => { FN_PO = FN_PO === b.dataset.fnpo ? null : b.dataset.fnpo; route(); }));
    $$("[data-poform]").forEach(f => (f.onsubmit = e => {
      e.preventDefault();
      const id = f.dataset.poform, no = $("#po-" + id).value.trim(), r = fcRef(id);
      if (!/^\d{10}$/.test(no)) { toast(L("เลขที่ PO ต้องเป็นตัวเลข 10 หลัก", "The PO number must be 10 digits")); return; }
      if (finCommits().some(x => x.gfPo && x.gfPo.no === no)) { toast(L("เลขที่ PO นี้ใช้กับรายการอื่นแล้ว", "This PO number is already used")); return; }
      r.gfPo = { no, t: nowIso(), by: me().id }; FN_PO = null;
      audit(["บันทึกเลขที่ใบสั่งซื้อจาก GFMIS", "Recorded a GFMIS purchase order"], `${id} · PO ${no}`);
      commit(); renderShell(); route(); toast(L("บันทึกเลขที่ PO แล้ว · ขอเบิกได้เมื่อตรวจรับ", "PO saved · payments can be requested after acceptance"));
    }));
    $$("[data-fnrel]").forEach(b => (b.onclick = () => {
      const id = b.dataset.fnrel, r = fcRef(id), x = finCommits().find(y => y.id === id), amt = Math.round(Number($("#rl-" + id).value)), why = $("#rw-" + id).value.trim();
      if (!(amt > 0) || amt > fcLeft(x)) { toast(L("ยอดคืนต้องมากกว่าศูนย์และไม่เกินยอดคงค้าง", "The release must be above zero and within what is left")); return; }
      if (why.length < 5) { toast(L("ระบุเหตุผลอย่างน้อย 5 ตัวอักษร", "Give a reason of at least 5 characters")); return; }
      r.released = (r.released || 0) + amt; (r.log = r.log || []).push({ t: nowIso(), by: me().id, amt, why });
      audit(["คืนวงเงินผูกพัน", "Released a commitment"], `${id} · ${fmt(amt)} · ${why}`);
      notify(["plan"], [`การเงินคืนวงเงินผูกพัน ${id} ${fmt(amt)} บาท ไปที่รายการ ${r.line}`, `Finance released ${fmt(amt)} baht of ${id} back to line ${r.line}`], "alloc-lines");
      commit(); route(); toast(L("คืนวงเงินแล้ว", "Released"));
    }));
    const ff = $("#fc-form");
    if (ff) ff.onsubmit = e => {
      e.preventDefault();
      const line = $("#fc-line").value, amount = Math.round(Number($("#fc-amt").value));
      if (amount > famHeadroom(line)) { toast(L("เกินวงเงินคงเหลือของรายการจัดสรร (ข้อ 18)", "More than the line has left (clause 18)")); return; }
      const id = `CM-${FAM_FY}-${String((S.fcommit || []).length + 1).padStart(3, "0")}`, nm = $("#fc-name").value.trim(), vd = $("#fc-vendor").value.trim();
      (S.fcommit = S.fcommit || []).push({ id, kind: $("#fc-kind").value, name: [nm, nm], vendor: [vd, vd], line, amount, released: 0, paid: 0, signed: TODAY, due: $("#fc-due").value, gfPo: null, by: me().id, t: nowIso() });
      audit(["บันทึกวงเงินผูกพัน", "Added a commitment"], `${id} · ${fmt(amount)}`);
      commit(); renderShell(); route(); toast(amount >= fcfg().poMin ? L("บันทึกแล้ว · ต้องบันทึกเลขที่ PO ใน GFMIS ก่อนขอเบิก", "Saved · record the GFMIS PO before any payment") : L("บันทึกแล้ว", "Saved"));
    };
    $$("[data-fncf]").forEach(b => (b.onclick = () => {
      const x = finCommits().find(y => y.id === b.dataset.fncf), C = S.carry;
      const c = { id: `CF-2570-${String(C.reqs.length + 1).padStart(2, "0")}`, line: x.line, amount: fcLeft(x), po: x.gfPo ? x.gfPo.no : x.id, poDate: x.signed, vendor: tx(x.vendor), status: "pending", t: nowIso(), by: me().id, src: x.id };
      const bad = cfChecks(c).filter(k => !k[0]);
      if (bad.length) { toast(`${L("ยังเสนอไม่ได้", "Can't propose yet")}: ${bad.map(k => k[1]).join(", ")}`); return; }
      C.reqs.push(c);
      audit(["เสนอกันเงินไว้เบิกเหลื่อมปีจากทะเบียนผูกพัน", "Proposed a carry-over from the commitments register"], `${c.id} · ${x.id} · ${fmt(c.amount)}`);
      notify(["exec", "plan"], [`การเงินเสนอกันเงินเหลื่อมปี ${c.id} (${x.id}) รออนุมัติ`, `Finance proposed carry-over ${c.id} (${x.id}) for approval`], "alloc-carry");
      commit(); renderShell(); route(); toast(L("ส่งให้ M06 กันเงินเหลื่อมปีแล้ว · รอผู้บริหารอนุมัติ", "Sent to M06 carry-over · waiting for executive approval"));
    }));
  };
}

// ---------- the PO check joins the payment gate (R-11) ----------
{
  const gate = payGate;
  payGate = function (c, ph) {
    const g = gate(c, ph);
    if (c.amount >= fcfg().poMin) {
      const ok = !!c.gfPo;
      g.checks.push({ ok, label: L("มีใบสั่งซื้อ (PO) ใน GFMIS แล้ว (ข้อ 28)", "A GFMIS purchase order is recorded (clause 28)") });
      if (!ok) { g.noPo = true; g.pass = false; g.ok = false; }
    }
    return g;
  };
}

// ---------- menu, role, tasks ----------
{
  const n = NAV.find(x => x.id === "finance");
  n.tabs = [["home", ["ภาพรวมการเงิน", "Finance overview"], "F1"], ["chain", ["วงเงินผูกพันและใบสั่งซื้อ", "Commitments and POs"], "F2"], ["pay", ["ใบขอเบิกและอนุมัติจ่าย", "Payment requests"], "F3"], ["recon", ["GFMIS และกระทบยอด", "GFMIS and reconciliation"], "F7"]];
  n.label = ["Fisko Finance · การเงิน", "Fisko Finance"];
  FIN_TAB = "home";
  APPS.finance.desc = ["ผูกพัน เบิกจ่าย และการเงินหน่วยงาน", "Commitments, payments and agency finance"];
  const rs = renderShell;
  renderShell = function () {
    NAV.forEach(x => { if (x.roles.includes("fin") && !x.roles.includes("finhead")) x.roles.push("finhead"); });
    if (typeof MATRIX !== "undefined" && !MATRIX.finhead) MATRIX.finhead = MATRIX.fin.slice();
    return rs.apply(this, arguments);
  };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "home" && isFinRole()) { const k = finClocks().filter(x => daysUntil(x.due) <= 2).length; return k ? `<span class="badge">${k}</span>` : ""; }
    if (nid === "finance" && tab === "chain" && ROLE === "fin") { const k = finCommits().filter(needsPo).length; return k ? `<span class="badge">${k}</span>` : ""; }
    return tb(nid, tab);
  };
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments);
    if (ROLE === "fin") finCommits().filter(needsPo).forEach(x => t.push({ title: `${L("บันทึกเลขที่ PO ใน GFMIS", "Record the GFMIS PO for")} ${x.id}`, sub: `${tx(x.vendor)} · ${fmt(x.amount)} ${L("บาท", "baht")}`, due: TODAY, link: "fnc-chain", cls: "p-warn" }));
    if (ROLE === "finhead") {
      finClocks().filter(k => daysUntil(k.due) <= 1).forEach(k => t.push({ title: `${L("ติดตาม", "Follow up")}: ${k.title}`, sub: `${k.sub} · ${k.src}`, due: k.due, link: k.link, cls: daysUntil(k.due) < 0 ? "p-bad" : "p-warn" }));
      if (!t.length) t.push({ title: L("ไม่มีงานค้าง", "Nothing waiting for you"), sub: "", due: TODAY, link: "fnc-home", cls: "p-mute" });
    }
    return t;
  };
}

// ---------- seed (called from the shared seed builder) ----------
function seedFinanceFN1(s) {
  const sample = (s.org[1] || "").startsWith("Sample"), fin = s.users.find(u => u.role === "fin");
  if (!s.users.some(u => u.role === "finhead")) s.users.push({ id: "u21", role: "finhead", unit: fin ? fin.unit : s.units[1].id, primary: true, mfa: true, active: true,
    name: sample ? ["ศิริพร คลังดี", "Siriporn Khlangdee"] : ["สมพร การคลัง", "Somporn Kankhlang"] });
  s.fcfg = {};
  // The two running contracts already have their POs; contracts created in the demo start without one.
  (s.contracts || []).forEach((c, i) => (c.gfPo = { no: String(7000012345 + i * 111), t: c.signed + "T15:00", by: fin ? fin.id : "" }));
  const ope = s.allocs[2570].lines.filter(l => l.type === "ope").sort((a, b) => b.amount - a.amount), L0 = ope[0], L1 = ope[1] || ope[0], L2 = ope[2] || ope[0];
  const by = fin ? fin.id : "";
  s.fcommit = [
    { id: "CM-2570-001", kind: "utility", name: ["ค่าไฟฟ้า ปีงบประมาณ 2570 (ประมาณการ)", "Electricity, FY2570 (estimate)"], vendor: ["การไฟฟ้านครหลวง", "Metropolitan Electricity Authority"], line: L0.id, amount: 1800000, released: 0, paid: 150000, signed: "2026-10-01", due: "2027-09-30", gfPo: null, by, t: "2026-10-01T09:00" },
    { id: "CM-2570-002", kind: "rent", name: ["ค่าเช่าอาคารสำนักงานสาขา 12 เดือน", "Branch office rent, 12 months"], vendor: ["บริษัท ตัวอย่างพร็อพเพอร์ตี้ จำกัด", "Sample Property Co., Ltd."], line: L1.id, amount: 960000, released: 0, paid: 0, signed: "2026-10-05", due: "2027-09-30", gfPo: null, by, t: "2026-10-05T10:00" },
    { id: "CM-2570-003", kind: "service", name: ["บำรุงรักษาระบบสารสนเทศ (สัญญาต่อเนื่อง)", "IT system maintenance (continuing agreement)"], vendor: ["บริษัท ตัวอย่างระบบ จำกัด", "Sample Systems Co., Ltd."], line: L2.id, amount: 1200000, released: 0, paid: 300000, signed: "2026-10-01", due: "2027-11-30", gfPo: { no: "7000012001", t: "2026-10-02T11:00", by }, by, t: "2026-10-01T09:30" },
    { id: "CM-2570-004", kind: "travel", name: ["คำสั่งเดินทางไปราชการ ตรวจติดตามโครงการภาคเหนือ", "Travel order: northern project monitoring"], vendor: ["ผู้เดินทางตามคำสั่ง", "Travellers on the order"], line: L0.id, amount: 4800, released: 0, paid: 0, signed: "2026-10-12", due: "2026-11-20", gfPo: null, by, t: "2026-10-12T14:00" },
  ];
}
