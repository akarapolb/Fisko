// Fisko Finance round FN2 (Finance design v0.1, chapter 6.2): payment vouchers, withholding tax and payment.
// - Voucher types and evidence (FR-FN-07, 08), payment route (FR-FN-09, R-FN-02), withholding tax and the
//   50 ทวิ certificate (FR-FN-10, R-FN-03), request clocks (FR-FN-11), approval with duty checks (FR-FN-12, SD-11),
//   GFMIS files out and results in (FR-FN-13, 14), payment from the agency account (FR-FN-15), the daily payment
//   check (FR-FN-16) and supplier bank-account changes (FR-FN-17, SD-14).
// States: draft V1 → check V2 → approve V3 → ready V4 → posted V5 → paid V6 (→ V7 when matched in reconciliation).
// A procurement voucher writes an approved payment (S.payreqs) when it is approved, so Procurement, Budget and
// the analytics keep reading payments as before. All files and payments here are simulated (no real GFMIS or bank).
let VC_OPEN = null, VC_F = "open", VC_NEW = false, GF_OUT = null;

const VT = {
  proc: { name: ["ซื้อ จ้าง เช่า (สัญญาจัดซื้อ)", "Buy, hire, rent (procurement contract)"], ev: [] },
  service: { name: ["ค่าเช่าและบริการตามข้อตกลง", "Rent and services under an agreement"], ev: [["inv", ["ใบแจ้งหนี้", "Invoice"]], ["acc", ["หลักฐานการรับบริการของเดือน", "Proof the service was received"]]] },
  utility: { name: ["สาธารณูปโภค", "Utilities"], ev: [["bill", ["ใบแจ้งหนี้ค่าสาธารณูปโภค", "Utility bill"]]] },
  travel: { name: ["ค่าเดินทางไปราชการ", "Official travel"], ev: [["order", ["คำสั่งเดินทาง", "Travel order"]], ["report", ["รายงานการเดินทาง", "Travel report"]], ["rcpt", ["ใบเสร็จหรือใบรับรองการจ่าย (ข้อ 46–48)", "Receipts or payment certificate (cl. 46–48)"]]] },
  comp: { name: ["ค่าตอบแทนและสวัสดิการ", "Compensation and welfare"], ev: [["order", ["คำสั่งหรือหนังสืออนุมัติ", "Order or approval"]], ["sign", ["ใบสำคัญรับเงินหรือหลักฐานการปฏิบัติงาน", "Receipt voucher or work record"]]] },
  refund: { name: ["คืนเงินและรายการอื่น", "Refunds and others"], ev: [["doc", ["หนังสือหรือเอกสารประกอบ", "Supporting letter"]]] },
};
const VST = {
  draft: [["ร่าง", "Draft"], "p-mute", "V1"], returned: [["ส่งกลับแก้ไข", "Returned"], "p-bad", "V1"], check: [["ตรวจหลักฐาน", "Evidence check"], "p-info", "V2"],
  approve: [["รออนุมัติ", "Awaiting approval"], "p-warn", "V3"], ready: [["พร้อมส่ง GFMIS", "Ready for GFMIS"], "p-info", "V4"], posted: [["บันทึกใน GFMIS แล้ว", "Posted in GFMIS"], "p-info", "V5"],
  paid: [["จ่ายเงินแล้ว", "Paid"], "p-ok", "V6"], recon: [["กระทบยอดแล้ว", "Reconciled"], "p-ok", "V7"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute", "—"],
};
const ROUTE = { direct: ["กรมบัญชีกลางจ่ายตรงเจ้าหนี้", "Paid by the Comptroller General straight to the payee"], agency: ["เข้าบัญชีหน่วยงานแล้วจ่ายต่อ", "Into the agency account, then paid on"] };
const PAYEE_K = { corp: ["นิติบุคคล", "Company"], person: ["บุคคลธรรมดา", "Individual"], gov: ["หน่วยงานของรัฐ", "Government body"] };
const METHOD = { epay: ["e-Payment", "e-Payment"], cheque: ["เช็ค", "Cheque"], cash: ["เงินสด", "Cash"] };

const vcOf = id => (S.vouchers || []).find(v => v.id === id);
const vcCon = v => (v.contract ? famCon(v.contract) : null);
const vcPh = v => { const c = vcCon(v); return c ? c.phases.find(x => x.n === v.phase) : null; };
const vcCommit = v => (v.commit ? (S.fcommit || []).find(c => c.id === v.commit) : null);
const vcPay = v => (v.pay ? S.payreqs.find(p => p.id === v.pay) : null);
// V7 is derived: a paid voucher whose payment matched (or was explained) in reconciliation.
function vState(v) {
  if (v.state === "paid") { const p = vcPay(v); if (p && p.recon && ["matched", "explained"].includes(p.recon.state)) return "recon"; if (v.recon && v.recon.state === "matched") return "recon"; }
  return v.state;
}
const vTag = v => { const k = vState(v); return tag(`${VST[k][2]} · ${tx(VST[k][0])}`, VST[k][1]); };
const r2 = n => Math.round(n * 100) / 100;
// The whole order decides the tax and the route, not the phase (R-FN-02, R-FN-03).
function vOrder(v) { const c = vcCon(v), m = vcCommit(v); return c ? c.amount : m ? m.amount : v.gross; }
function whtRate(v) {
  const c = fcfg();
  if (v.payee.kind === "gov") return { rate: 0, why: L("ผู้รับเป็นหน่วยงานของรัฐ", "Payee is a government body") };
  if (v.type === "proc" || v.type === "service") return vOrder(v) >= c.whtMin ? { rate: c.whtPct, why: L(`ใบสั่งซื้อหรือข้อตกลงทั้งใบ ${fmt(vOrder(v))} บาท ≥ ${fmt(c.whtMin)}`, `Whole order ${fmt(vOrder(v))} ≥ ${fmt(c.whtMin)}`) } : { rate: 0, why: L(`ทั้งใบต่ำกว่า ${fmt(c.whtMin)} บาท`, `Whole order below ${fmt(c.whtMin)}`) };
  if (v.type === "comp") return { rate: 0, why: L("เงินได้บุคคลธรรมดาตามประเภท ใช้ตารางที่หน่วยงานยืนยัน (ยังไม่ตั้ง)", "Personal income by type; uses the agency's confirmed table (not set yet)") };
  return { rate: 0, why: L("ไม่ใช่เงินได้ที่ต้องหัก", "Not income subject to withholding") };
}
function vCalc(v) {
  const base = v.vat ? r2(v.gross / 1.07) : v.gross, w = whtRate(v), wht = r2(base * w.rate / 100), pen = v.penalty || 0;
  return { base, vat: r2(v.gross - base), wht, rate: w.rate, why: w.why, pen, net: r2(v.gross - pen - wht - (v.other || 0)), spend: r2(v.gross - pen) };
}
function vRoute(v) {
  const c = fcfg(), big = vOrder(v) >= c.poMin;
  if (v.type === "proc" || v.type === "service") return big ? { r: "direct", src: "ข้อ 28 (1)", po: true } : { r: "agency", src: "ข้อ 28 (2)", po: false };
  if (v.type === "utility") return v.contrib ? { r: "agency", src: "ข้อ 29 (1)", po: false } : { r: "direct", src: "ข้อ 29", po: false };
  if (v.type === "comp") return { r: "agency", src: "ข้อ 29 (2)", po: false };
  return { r: "direct", src: "ข้อ 29", po: false };
}
const vHasPo = v => { const c = vcCon(v), m = vcCommit(v); return !!((c && c.gfPo) || (m && m.gfPo)); };
function vEvidence(v) {
  if (v.type === "proc") {
    const c = vcCon(v), ph = vcPh(v); if (!c || !ph) return [];
    return payGate(c, ph).checks.map(k => ({ k: "", label: k.label, ok: k.ok, auto: true }));
  }
  return VT[v.type].ev.map(([k, label]) => ({ k, label: tx(label), ok: !!(v.ev || {})[k], auto: false }));
}
// R-FN-01 to R-FN-03 as checks; "warn" checks never stop the voucher.
function vRules(v) {
  const out = [], c = fcfg(), rt = vRoute(v), m = vcCommit(v), x = vCalc(v), add = (id, ok, text, warn) => out.push({ id, ok, text, warn: !!warn });
  if (v.type === "proc") add("R-FN-01", true, L("ผูกพันตามสัญญาแล้ว ไม่เกินวงเงินสัญญา", "Within the contract commitment"));
  else if (m) add("R-FN-01", x.spend <= fcLeft(finCommits().find(y => y.id === m.id)) + (v.state === "paid" ? x.spend : 0), L(`ไม่เกินยอดผูกพันคงค้างของ ${m.id}`, `Within what is left on ${m.id}`));
  else add("R-FN-01", x.spend <= famHeadroom(v.line), L("ไม่เกินวงเงินคงเหลือของรายการจัดสรร (ข้อ 18)", "Within the line's free amount (clause 18)"));
  if (v.due && daysUntil(v.due) > c.aheadDays && !["paid", "cancelled"].includes(v.state)) add("R-FN-01", false, L(`ขอเบิกก่อนถึงกำหนดจ่ายเกิน ${c.aheadDays} วัน (ข้อ 22)`, `Requested more than ${c.aheadDays} days before due (clause 22)`), true);
  add("R-FN-02", !rt.po || vHasPo(v), rt.po ? (vHasPo(v) ? L("มีใบสั่งซื้อใน GFMIS · จ่ายตรงเจ้าหนี้", "GFMIS PO recorded · paid straight to the payee") : L("ต้องมีใบสั่งซื้อใน GFMIS ก่อน (ข้อ 28 (1))", "Needs a GFMIS PO first (clause 28 (1))")) : `${tx(ROUTE[rt.r])} (${rt.src})`);
  if (v.method !== "epay") add("R-FN-02", !!(v.methodWhy || "").trim(), L("จ่ายเช็คหรือเงินสดต้องมีเหตุผล (ข้อ 52)", "Cheque or cash needs a reason (clause 52)"));
  add("R-FN-03", true, x.rate ? L(`หักภาษี ${x.rate}% ของ ${fmt(x.base, 2)} = ${fmt(x.wht, 2)} บาท · ${x.why}`, `Withhold ${x.rate}% of ${fmt(x.base, 2)} = ${fmt(x.wht, 2)} · ${x.why}`) : `${L("ไม่หักภาษี", "No withholding")} · ${x.why}`);
  const vc = v.payee.vendor && (S.vendorChanges || []).find(ch => ch.vendor === v.payee.vendor && ch.status === "confirmed" && daysUntil(ch.done.t.slice(0, 10)) >= -30);
  if (vc) add("SG-F03", false, L(`จ่ายครั้งแรกภายใน 30 วันหลังแก้บัญชีธนาคารผู้ขาย (${vc.id}) ควรตรวจ`, `First payment within 30 days of a bank-account change (${vc.id}); check it`), true);
  return out;
}
const vReady = v => vEvidence(v).every(e => e.ok) && vRules(v).every(r => r.ok || r.warn);
const vLog = (v, act, note) => (v.log = v.log || []).push({ t: nowIso(), by: me().id, role: ROLE, act, note: note || "" });
const nextVc = () => `VC-${FAM_FY}-${String(Math.max(0, ...(S.vouchers || []).map(v => Number(v.id.split("-")[2]) || 0)) + 1).padStart(3, "0")}`;
const vcCanApprove = () => canSpend();
const vcIsMaker = v => v.maker === me().id;

// ---------- duty rules SD-11 and SD-14 ----------
SOD_RULES.push(["SD-11", ["ผู้จัดทำหรือผู้ตรวจใบขอเบิก อนุมัติใบนั้นไม่ได้", "Whoever prepared or checked a voucher can't approve it"]],
  ["SD-14", ["ผู้ขอแก้บัญชีธนาคารของผู้ขาย ยืนยันการแก้นั้นไม่ได้", "Whoever asked for a supplier bank-account change can't confirm it"]]);
SOD_STEPS.push([["จัดทำหรือตรวจใบขอเบิก", "Prepare or check a voucher"], ["อนุมัติจ่าย", "Approve the payment"], "SD-11"],
  [["ขอแก้บัญชีธนาคารผู้ขาย", "Ask to change a supplier's bank account"], ["ยืนยันการแก้", "Confirm the change"], "SD-14"]);

// ---------- views ----------
function vcDetail(v) {
  const x = vCalc(v), rt = vRoute(v), ev = vEvidence(v), rules = vRules(v), st = vState(v), fin = isFinRole();
  const evEdit = fin && ["draft", "returned", "check"].includes(v.state) && !ev.every(e => e.auto);
  const c = vcCon(v), ph = vcPh(v), m = vcCommit(v);
  const act = [];
  if (ROLE === "fin" && vcIsMaker(v) && ["draft", "returned"].includes(v.state)) act.push(`<button class="btn primary" type="button" data-vc="submit">${L("ส่งตรวจ", "Send for checking")}</button>`, `<button class="btn ghost" type="button" data-vc="cancel">${L("ยกเลิก", "Cancel")}</button>`);
  if (fin && v.state === "check") act.push(`<button class="btn primary" type="button" data-vc="checked">${L("ตรวจผ่าน ส่งอนุมัติ", "Checked · send for approval")}</button>`, `<button class="btn danger" type="button" data-vc="return">${L("ส่งกลับแก้ไข", "Return")}</button>`);
  if (vcCanApprove() && v.state === "approve") act.push(`<button class="btn primary" type="button" data-vc="approve">${onBehalf("exec", "spend") ? L("อนุมัติจ่ายแทน", "Approve on behalf") : L("อนุมัติจ่าย", "Approve payment")}</button>`, `<button class="btn danger" type="button" data-vc="reject">${L("ไม่อนุมัติ ส่งกลับ", "Reject and return")}</button>`);
  if (ROLE === "fin" && v.state === "posted" && rt.r === "agency" && v.funded && v.method !== "epay") act.push(`<button class="btn primary" type="button" data-vc="paycash">${L("บันทึกการจ่าย", "Record the payment")} (${tx(METHOD[v.method])})</button>`);
  if (fin && v.state === "paid" && v.cert && !v.cert.sent) act.push(`<button class="btn" type="button" data-vc="cert">${L("ส่งหนังสือรับรองภาษีให้ผู้รับเงิน", "Send the tax certificate to the payee")}</button>`);
  const needReason = ["return", "reject", "cancel"];
  return `<section class="panel" id="vc-detail"><header><h2><span class="mono">${v.id}</span> · ${tx(VT[v.type].name)}</h2><span class="sp"></span>${vTag(v)}${historyBtn(v.id, v.id)}<button class="btn ghost" type="button" id="vc-close">${L("ปิด", "Close")}</button></header>
    <div class="body">
      <div class="grid2" style="gap:16px">
        <div>
          <h3 style="margin:0 0 6px;font-size:15px">${L("ผู้รับเงินและรายการ", "Payee and item")}</h3>
          <p style="margin:0 0 4px"><b style="font-weight:600">${esc(tx(v.payee.name))}</b> <span class="sub">${tx(PAYEE_K[v.payee.kind])}${v.payee.taxId ? ` · ${L("เลขผู้เสียภาษี", "Tax ID")} <span class="mono">${esc(v.payee.taxId)}</span>` : ""}</span></p>
          <p class="sub" style="margin:0 0 4px">${esc(tx(v.desc))}${c ? ` · <span class="mono">${c.id}</span> ${ph ? tx(ph.name) : ""}` : ""}${m ? ` · <span class="mono">${m.id}</span>` : ""} · <span class="mono">${v.line}</span> ${esc(lineLabel(famLine(v.line)))}</p>
          <p class="sub" style="margin:0">${L("ทางจ่าย", "Route")}: ${tx(ROUTE[rt.r])} (${rt.src}) · ${L("วิธีจ่าย", "Method")}: ${tx(METHOD[v.method])}${v.methodWhy ? ` · ${esc(v.methodWhy)}` : ""}</p>
          ${v.due && !["paid", "cancelled"].includes(v.state) ? `<p class="sub" style="margin:4px 0 0">${dotI(clockDot(v.due))}${v.type === "proc" ? L("ส่งขอเบิกเข้า GFMIS ภายใน", "Send to GFMIS by") : L("ครบกำหนดจ่าย", "Due")} ${clockTxt(v.due)}${v.type === "proc" ? ` (${L("ข้อ 28", "cl. 28")})` : ""}</p>` : ""}
        </div>
        <div>
          <h3 style="margin:0 0 6px;font-size:15px">${L("ยอดและรายการหัก (บาท)", "Amount and deductions (baht)")}</h3>
          <table style="width:100%"><tbody>
            <tr><td>${L("ยอดรวม", "Gross")}${v.vat ? ` <span class="sub">(${L("รวม VAT", "incl. VAT")} ${fmt(x.vat, 2)})</span>` : ""}</td><td class="n">${fmt(v.gross, 2)}</td></tr>
            ${x.pen ? `<tr><td>${L("หักค่าปรับ", "Less penalty")}</td><td class="n">−${fmt(x.pen, 2)}</td></tr>` : ""}
            <tr><td>${L("หักภาษี ณ ที่จ่าย", "Less withholding tax")} ${x.rate ? `${x.rate}% × ${fmt(x.base, 2)}` : ""}</td><td class="n">${x.wht ? "−" + fmt(x.wht, 2) : "0.00"}</td></tr>
            <tr><td><b>${L("จ่ายผู้รับเงิน", "Paid to the payee")}</b></td><td class="n"><b>${fmt(x.net, 2)}</b></td></tr>
          </tbody></table>
          ${x.pen || x.wht ? `<div class="sub">${L("ค่าปรับและภาษีที่หักเป็นรายได้แผ่นดินที่ต้องกระทบยอด (ข้อ 19)", "Penalty and tax withheld are state revenue to be matched (clause 19)")}</div>` : ""}
        </div>
      </div>
      <div class="grid2" style="gap:16px;margin-top:12px">
        <div><h3 style="margin:0 0 6px;font-size:15px">${L("หลักฐาน", "Evidence")}${v.type === "proc" ? ` <span class="sub">(${L("จากประตูเบิกจ่าย R-11", "from payment gate R-11")})</span>` : ""}</h3>
          ${ev.map(e => `<div style="margin:2px 0">${e.auto || !evEdit ? `${dotI(e.ok ? "ok" : "bad")}${esc(e.label)}` : `<label><input type="checkbox" data-vcev="${e.k}" ${e.ok ? "checked" : ""}> ${esc(e.label)}</label>`}</div>`).join("") || `<span class="sub">—</span>`}</div>
        <div><h3 style="margin:0 0 6px;font-size:15px">${L("กฎ", "Rules")}</h3>
          ${rules.map(r => `<div style="margin:2px 0">${dotI(r.ok ? "ok" : r.warn ? "warn" : "bad")}<span class="mono">${r.id}</span> ${esc(r.text)}</div>`).join("")}</div>
      </div>
      ${v.gf ? `<p class="sub" style="margin:10px 0 0">GFMIS: <span class="mono">${esc(v.gf.doc)}</span> · ${fdate(v.gf.t, true)}${v.paid ? ` · ${L("จ่ายแล้ว", "paid")} ${fdate(v.paid.t)} · <span class="mono">${esc(v.paid.ref)}</span>` : ""}</p>` : ""}
      ${v.cert ? `<div class="callout" style="margin:10px 0 0"><b>${L("หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)", "Withholding tax certificate (50 Tawi)")} <span class="mono">${v.cert.no}</span></b>${esc(tx(S.org))} → ${esc(tx(v.payee.name))} · ${L("ฐาน", "base")} ${fmt(x.base, 2)} · ${L("ภาษี", "tax")} ${fmt(x.wht, 2)} · ${fdate(v.paid.t)} · ${v.cert.sent ? `${L("ส่งแล้ว", "sent")} ${fdate(v.cert.sent.t, true)}` : L("ยังไม่ส่ง", "not sent yet")}</div>` : ""}
      ${v.approver ? `<p class="sub" style="margin:8px 0 0">${L("อนุมัติโดย", "Approved by")} ${esc(userName(v.approver.by))}${v.approver.via ? ` · ${L("แทน", "for")} ${esc(userName(v.approver.holder))} (${v.approver.via})` : ""} · ${L("อำนาจ", "authority")} ${v.approver.auth} · ${fdate(v.approver.t, true)}</p>` : ""}
      ${(v.log || []).length ? `<details style="margin-top:8px"><summary class="sub">${L("ประวัติ", "History")} (${v.log.length})</summary>${v.log.slice().reverse().map(l => `<div class="sub">${fdate(l.t, true)} · ${esc(userName(l.by))} · ${esc(tx(l.act))}${l.note ? ` · ${esc(l.note)}` : ""}</div>`).join("")}</details>` : ""}
      ${act.length ? `<div class="row" style="margin-top:12px;flex-wrap:wrap">${act.join("")}${act.some(a => needReason.some(k => a.includes(`data-vc="${k}"`))) ? `<input type="text" id="vc-why" placeholder="${L("เหตุผล (เมื่อส่งกลับ ไม่อนุมัติ หรือยกเลิก)", "Reason (to return, reject or cancel)")}" style="min-width:240px;flex:1" aria-label="${L("เหตุผล", "Reason")}">` : ""}</div>` : ""}
    </div></section>`;
}

FIN.pay = () => {
  const V = S.vouchers || [], fin = isFinRole(), maker = ROLE === "fin", acc = famAcceptedUnpaid(), c = fcfg();
  const groups = { open: ["draft", "returned", "check", "approve"], gf: ["ready", "posted"], paid: ["paid"], all: null };
  const GL = { open: L("กำลังดำเนินการ", "In progress"), gf: L("อยู่กับ GFMIS", "With GFMIS"), paid: L("จ่ายแล้ว", "Paid"), all: L("ทั้งหมด", "All") };
  const list = V.filter(v => !groups[VC_F] || groups[VC_F].includes(v.state)).slice().reverse();
  const ready = V.filter(v => v.state === "ready"), posted = V.filter(v => v.state === "posted"), out = (S.gfOut || []).filter(f => f.state === "sent");
  const agencyDue = V.filter(v => v.state === "posted" && vRoute(v).r === "agency" && v.funded && v.method === "epay");
  const today = V.filter(v => v.state === "paid" && !v.dayCheck);
  const open = VC_OPEN && vcOf(VC_OPEN);
  const fcs = (S.fcommit || []).filter(m => fcLeft(finCommits().find(y => y.id === m.id)) > 0);
  return `
  ${open ? vcDetail(open) : ""}
  ${maker && acc.length ? `<section class="panel"><header><h2>${L("งวดที่ตรวจรับแล้ว รอทำใบขอเบิก", "Accepted phases waiting for a voucher")}</h2><span class="sp"></span><span class="sub">${L("ต้องส่งขอเบิกเข้า GFMIS ภายใน", "Must reach GFMIS within")} ${c.reqDays} ${L("วันทำการหลังตรวจรับ (ข้อ 28)", "working days of acceptance (clause 28)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา / งวด", "Contract / phase")}</th><th class="n">${L("ยอดงวด (บาท)", "Phase (baht)")}</th><th>${L("ตรวจรับ", "Accepted")}</th><th>${L("ครบกำหนด", "Due")}</th><th>${L("ประตู R-11", "Gate R-11")}</th><th></th></tr></thead>
      <tbody>${acc.map(({ c: k, ph }) => { const g = payGate(k, ph); return `<tr><td><span class="mono">${k.id}</span> ${tx(ph.name)}<div class="sub">${esc(tx(k.vendor))}</div></td><td class="n">${fmt(ph.amount)}</td><td class="sub">${fdate(accDate(ph))}</td><td>${dotI(clockDot(reqDue(ph)))}${clockTxt(reqDue(ph))}</td>
        <td>${g.ok ? tag(L("ผ่าน", "Passed"), "p-ok") : `${tag(L("ไม่ผ่าน", "Not passed"), "p-bad")}<div class="sub">${g.checks.filter(x => !x.ok).map(x => esc(x.label)).join(" · ")}</div>`}</td>
        <td><button class="btn ${g.ok ? "primary" : ""}" type="button" data-vcmk="${k.id}|${ph.n}">${L("ทำใบขอเบิก", "Make voucher")}</button></td></tr>`; }).join("")}</tbody></table></div></section>` : ""}
  <section class="panel"><header><h2>${L("ใบขอเบิก", "Vouchers")}</h2><span class="sp"></span>
    <div class="row" style="gap:6px;flex-wrap:wrap">${Object.keys(groups).map(k => `<button class="btn ${VC_F === k ? "primary" : "ghost"}" type="button" data-vcf="${k}">${GL[k]} (${V.filter(v => !groups[k] || groups[k].includes(v.state)).length})</button>`).join("")}
    ${maker ? `<button class="btn" type="button" id="vc-new">${VC_NEW ? L("ปิดแบบฟอร์ม", "Close form") : L("ใบขอเบิกอื่น", "Other voucher")}</button>` : ""}</div></header>
    ${maker && VC_NEW ? `<div class="body"><form class="inline-form" id="vc-form">
      <div class="f" style="flex:1 1 200px"><label for="vf-type">${L("ประเภท", "Type")}</label><select id="vf-type">${["service", "utility", "comp", "travel", "refund"].map(k => `<option value="${k}">${tx(VT[k].name)}</option>`).join("")}</select></div>
      <div class="f" style="flex:2 1 260px"><label for="vf-commit">${L("วงเงินผูกพัน (ถ้ามี)", "Commitment (if any)")}</label><select id="vf-commit"><option value="">${L("— ไม่มี ใช้รายการจัดสรร —", "— none, use an allocation line —")}</option>${fcs.map(m => `<option value="${m.id}">${m.id} · ${esc(tx(m.name))}</option>`).join("")}</select></div>
      <div class="f" style="flex:2 1 240px"><label for="vf-line">${L("รายการจัดสรร", "Allocation line")}</label><select id="vf-line">${famLines().filter(l => l.type === "ope" || l.type === "inv").map(l => `<option value="${l.id}">${esc(lineLabel(l))}</option>`).join("")}</select></div>
      <div class="f" style="flex:2 1 220px"><label for="vf-desc">${L("รายการ", "Description")}</label><input type="text" id="vf-desc" required></div>
      <div class="f" style="flex:2 1 200px"><label for="vf-payee">${L("ผู้รับเงิน", "Payee")}</label><input type="text" id="vf-payee" required></div>
      <div class="f" style="flex:0 1 150px"><label for="vf-kind">${L("ประเภทผู้รับ", "Payee type")}</label><select id="vf-kind">${Object.keys(PAYEE_K).map(k => `<option value="${k}">${tx(PAYEE_K[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 150px"><label for="vf-tax">${L("เลขผู้เสียภาษี", "Tax ID")}</label><input type="text" id="vf-tax" inputmode="numeric" maxlength="13"></div>
      <div class="f" style="flex:0 1 140px"><label for="vf-amt">${L("ยอดรวม (บาท)", "Gross (baht)")}</label><input type="number" id="vf-amt" min="1" step="0.01" required></div>
      <div class="f" style="flex:0 1 160px"><label for="vf-due">${L("ครบกำหนดจ่าย", "Due")}</label><input type="date" id="vf-due" value="${addDays(TODAY, 7)}" required></div>
      <div class="f" style="flex:0 1 150px"><label for="vf-method">${L("วิธีจ่าย", "Method")}</label><select id="vf-method">${Object.keys(METHOD).map(k => `<option value="${k}">${tx(METHOD[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:1 1 200px"><label for="vf-mwhy">${L("เหตุผลถ้าไม่ใช่ e-Payment", "Reason if not e-Payment")}</label><input type="text" id="vf-mwhy"></div>
      <div class="f" style="flex:1 1 100%"><label><input type="checkbox" id="vf-vat"> ${L("ยอดรวม VAT", "Amount includes VAT")}</label> <label style="margin-left:12px"><input type="checkbox" id="vf-contrib"> ${L("มีเงินสมทบจากผู้อื่น (สาธารณูปโภค ข้อ 29 (1))", "Others contribute (utilities, clause 29 (1))")}</label></div>
      <button class="btn primary" type="submit">${L("สร้างใบขอเบิก", "Create voucher")}</button></form>
      <p class="sub" style="margin:8px 0 0">${L("เงินเดือนและค่าจ้างประจำมาจากไฟล์ระบบบุคลากร ไม่ทำใบขอเบิกใน Fisko (ประเด็น D-FN-03)", "Salaries and regular wages come as a file from the HR system; no voucher in Fisko (decision D-FN-03)")}</p></div>` : ""}
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ประเภท / ผู้รับเงิน", "Type / payee")}</th><th class="n">${L("จ่ายสุทธิ (บาท)", "Net (baht)")}</th><th>${L("ทางจ่าย", "Route")}</th><th>${L("นาฬิกา", "Clock")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${list.map(v => `<tr${VC_OPEN === v.id ? ' style="background:var(--tint)"' : ""}><td class="mono">${v.id}</td><td>${esc(tx(v.payee.name))}<div class="sub">${tx(VT[v.type].name)} · ${esc(tx(v.desc))}</div></td><td class="n">${fmt(vCalc(v).net, 2)}</td><td class="sub">${tx(ROUTE[vRoute(v).r])}</td>
        <td>${v.due && !["paid", "cancelled"].includes(v.state) ? `${dotI(clockDot(v.due))}<span class="sub">${clockTxt(v.due)}</span>` : "—"}</td><td>${vTag(v)}</td><td><button class="btn ghost" type="button" data-vcopen="${v.id}">${L("เปิด", "Open")}</button></td></tr>`).join("")
        || `<tr><td colspan="7" class="sub">${L("ไม่มีใบขอเบิกในกลุ่มนี้", "No vouchers in this group")}</td></tr>`}</tbody></table></div></section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("ส่งข้อมูลเข้า GFMIS", "Send to GFMIS")}</h2><span class="sp"></span><span class="sub">${L("ไฟล์จำลอง (ประเด็น D-F05, D-FN-07)", "Simulated files (decisions D-F05, D-FN-07)")}</span></header>
      <div class="body">
        <p>${dotI(ready.length ? "warn" : "ok")}${ready.filter(v => !v.gfFile).length} ${L("ใบพร้อมส่ง", "ready to send")} · ${ready.filter(v => v.gfFile).length} ${L("ใบส่งแล้วรอผลบันทึก", "sent, waiting for the posting result")} · ${posted.length} ${L("ใบรอผลการจ่าย", "waiting for the payment result")}</p>
        ${maker ? `<div class="row" style="flex-wrap:wrap">
          <button class="btn" type="button" id="gf-make" ${ready.some(v => !v.gfFile) ? "" : "disabled"}>${L("สร้างไฟล์ขอเบิก", "Create the request file")}</button>
          <button class="btn" type="button" id="gf-post" ${out.length ? "" : "disabled"}>${L("นำเข้าผลบันทึก (ตัวอย่าง)", "Import posting result (sample)")}</button>
          <button class="btn" type="button" id="gf-paid" ${posted.some(v => vRoute(v).r === "direct" || !v.funded) ? "" : "disabled"}>${L("นำเข้าผลการจ่าย (ตัวอย่าง)", "Import payment result (sample)")}</button></div>` : `<p class="sub">${L("เจ้าหน้าที่การเงินส่งไฟล์และนำเข้าผล", "Finance officers send files and import results")}</p>`}
        ${GF_OUT ? `<pre class="mono" style="white-space:pre-wrap;font-size:12px;background:var(--tint);padding:8px;border-radius:8px;margin-top:8px">${esc(GF_OUT)}</pre>` : ""}
      </div></section>
    <section class="panel"><header><h2>${L("จ่ายจากบัญชีหน่วยงาน", "Pay from the agency account")}</h2><span class="sp"></span><span class="sub">${L("ข้อ 28 (2), 29 · ไม่ได้จ่ายภายใน", "Clauses 28 (2), 29 · unpaid within")} ${c.refundDays} ${L("วันทำการต้องส่งคืน (ข้อ 99)", "working days must be returned (clause 99)")}</span></header>
      <div class="body">
        ${V.filter(v => v.state === "posted" && vRoute(v).r === "agency" && v.funded).map(v => { const due = addWorkdays(v.funded.t.slice(0, 10), c.refundDays); return `<div style="margin:3px 0">${dotI(clockDot(due))}<span class="mono">${v.id}</span> ${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)} · ${tx(METHOD[v.method])} · <span class="sub">${L("ต้องจ่ายหรือส่งคืนภายใน", "pay or return by")} ${clockTxt(due)}</span></div>`; }).join("") || `<p class="sub">${L("ไม่มีเงินรอจ่ายในบัญชีหน่วยงาน", "No money waiting in the agency account")}</p>`}
        ${maker && agencyDue.length ? `<button class="btn primary" type="button" id="ep-batch" style="margin-top:8px">${L("สร้างไฟล์ e-Payment และจ่าย", "Create the e-Payment file and pay")} (${agencyDue.length})</button>` : ""}
      </div></section>
  </div>
  ${ROLE === "finhead" || ROLE === "audit" ? `<section class="panel"><header><h2>${L("ตรวจการจ่ายประจำวัน (ข้อ 43)", "Daily payment check (clause 43)")}</h2><span class="sp"></span><span class="sub">${L("หัวหน้าการเงินตรวจการจ่ายกับหลักฐานทุกสิ้นวัน", "The head of finance checks payments against evidence every day")}</span></header>
    <div class="body">${today.length ? `${today.map(v => `<div style="margin:2px 0">${dotI("warn")}<span class="mono">${v.id}</span> ${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)} · ${fdate(v.paid.t)} · ${tx(METHOD[v.method])}</div>`).join("")}
      ${ROLE === "finhead" ? `<button class="btn primary" type="button" id="day-check" style="margin-top:8px">${L("ตรวจกับหลักฐานแล้ว ลงนาม", "Checked against evidence · sign")} (${today.length})</button>` : ""}` : `<p class="sub">${dotI("ok")}${L("ตรวจการจ่ายครบแล้ว", "All payments checked")}${(S.payChecks || [])[0] ? ` · ${L("ล่าสุด", "last")} ${fdate(S.payChecks[0].t, true)} ${esc(userName(S.payChecks[0].by))}` : ""}</p>`}</div></section>` : ""}
  ${vendorPanel()}`;
};

// ---------- supplier bank-account changes (FR-FN-17) ----------
const BANKS = ["ธนาคารกรุงไทย", "ธนาคารออมสิน", "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", "ธนาคารกรุงเทพ", "ธนาคารกสิกรไทย"];
const maskAcct = a => (a ? `xxx-x-x${String(a).slice(-4, -1)}-${String(a).slice(-1)}` : "—");
function vendorPanel() {
  if (!isFinRole() && ROLE !== "audit") return "";
  const C = S.vendorChanges || [], maker = ROLE === "fin";
  return `<section class="panel"><header><h2>${L("ข้อมูลหลักผู้ขาย: บัญชีธนาคาร", "Supplier master data: bank accounts")}</h2><span class="sp"></span><span class="sub">${L("ส่งให้กรมบัญชีกลางสร้างข้อมูลหลักผู้ขาย (ข้อ 20 (2)) · ผู้ขอยืนยันเองไม่ได้ (SD-14)", "Sent to the Comptroller General's vendor master (clause 20 (2)) · the requester can't confirm (SD-14)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ผู้ขาย", "Supplier")}</th><th>${L("บัญชีใหม่", "New account")}</th><th>${L("ผู้ขอ", "Requested by")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${C.map(ch => { const vd = (S.vendors || []).find(x => x.id === ch.vendor) || { name: ch.vendor }; return `<tr><td class="mono">${ch.id}</td><td>${esc(tx(vd.name))}</td><td class="sub">${esc(ch.bank)} · <span class="mono">${maskAcct(ch.acct)}</span></td><td>${esc(userName(ch.by))}<div class="sub">${fdate(ch.t, true)}</div></td>
        <td>${ch.status === "pending" ? tag(L("รอยืนยัน", "Waiting to confirm"), "p-warn") : tag(L("ยืนยันแล้ว ส่งกรมบัญชีกลาง", "Confirmed · sent to the Comptroller General"), "p-ok")}${ch.done ? `<div class="sub">${esc(userName(ch.done.by))} · ${fdate(ch.done.t, true)}</div>` : ""}</td>
        <td>${ch.status === "pending" && isFinRole() ? `<button class="btn primary" type="button" data-vdok="${ch.id}">${L("ยืนยัน", "Confirm")}</button>` : ""}</td></tr>`; }).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มีคำขอ", "No requests yet")}</td></tr>`}</tbody></table></div>
    ${maker ? `<div class="body"><form class="inline-form" id="vd-chg">
      <div class="f" style="flex:2 1 220px"><label for="vc-vendor">${L("ผู้ขาย", "Supplier")}</label><select id="vc-vendor">${(S.vendors || []).map(x => `<option value="${x.id}">${esc(tx(x.name))}</option>`).join("")}</select></div>
      <div class="f" style="flex:1 1 200px"><label for="vc-bank">${L("ธนาคาร", "Bank")}</label><select id="vc-bank">${BANKS.map(b => `<option>${b}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 160px"><label for="vc-acct">${L("เลขที่บัญชี (10 หลัก)", "Account no. (10 digits)")}</label><input type="text" id="vc-acct" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" required></div>
      <div class="f" style="flex:1 1 100%"><label><input type="checkbox" id="vc-book" required> ${L("แนบสำเนาหน้าสมุดบัญชีและหนังสือแจ้งจากผู้ขายแล้ว", "Bank book page and the supplier's letter are attached")}</label></div>
      <button class="btn" type="submit">${L("ส่งคำขอแก้บัญชี", "Request the change")}</button></form></div>` : ""}</section>`;
}

// ---------- actions ----------
function vcMake(cid, n) {
  const c = famCon(cid), ph = c.phases.find(x => x.n === n), g = payGate(c, ph);
  if (g.noPo) { toast(L("สัญญานี้ยังไม่มีเลขที่ใบสั่งซื้อ (PO) ใน GFMIS · บันทึกที่หน้า วงเงินผูกพันและใบสั่งซื้อ ก่อน (ข้อ 28)", "This contract has no GFMIS purchase order yet · record it on Commitments and POs first (clause 28)")); return; }
  if (!g.ok) {
    if (!ph.hold) { ph.hold = { by: me().id, t: nowIso(), fails: g.checks.filter(x => !x.ok).map(x => x.label).join("; ") }; audit(["ประตูเบิกจ่ายพักรายการ", "The payment gate held a request"], `${c.id} ${tx(ph.name)}`); notify(["prochead", "exec"], [`${c.id} ${ph.name[0]} ไม่ผ่านประตูเบิกจ่าย รอปลดข้อยกเว้น`, `${c.id} ${ph.name[1]} did not pass the payment gate and waits for a release`], "prc-contracts"); commit(); }
    toast(L("ไม่ผ่านประตูเบิกจ่าย (R-11): พักเป็นข้อยกเว้นให้หัวหน้าพัสดุปลด", "Payment gate not passed (R-11): held as an exception for release")); return;
  }
  const vd = vendorBy(c.vendor[0]);
  const v = { id: nextVc(), type: "proc", contract: c.id, phase: ph.n, commit: null, line: c.line, desc: [`${famPlan(c.plan).name[0]} ${ph.name[0]}`, `${famPlan(c.plan).name[1]} ${ph.name[1]}`],
    payee: { name: c.vendor, kind: "corp", taxId: vd ? vd.taxId : "", vendor: vd ? vd.id : null }, gross: ph.result === "partial" ? ph.okAmount : ph.amount, vat: true, penalty: g.penalty, other: 0,
    method: "epay", methodWhy: "", due: reqDue(ph), ev: {}, state: "draft", maker: me().id, t: nowIso(), log: [] };
  vLog(v, ["สร้างใบขอเบิกจากงวดที่ตรวจรับ", "Created from the accepted phase"], `${c.id} ${tx(ph.name)}`);
  (S.vouchers = S.vouchers || []).push(v); VC_OPEN = v.id; VC_F = "open";
  audit(["สร้างใบขอเบิก", "Created a voucher"], `${v.id} · ${c.id} ${tx(ph.name)}`);
  commit(); renderShell(); route(); toast(L("สร้างใบขอเบิกแล้ว · ตรวจยอดและภาษี แล้วส่งตรวจ", "Voucher created · check the amounts and tax, then send for checking"));
}
function vcAct(v, a) {
  const why = ($("#vc-why") || { value: "" }).value.trim(), done = (msg, roles, text) => { if (roles) notify(roles, text, "fnc-pay"); commit(); renderShell(); route(); toast(msg); };
  if (["return", "reject", "cancel"].includes(a) && why.length < 5) { toast(L("ระบุเหตุผลอย่างน้อย 5 ตัวอักษร", "Give a reason of at least 5 characters")); return; }
  if (a === "submit") {
    if (!vRules(v).every(r => r.ok || r.warn)) { toast(L("ยังมีกฎที่ไม่ผ่าน ดูหัวข้อ กฎ", "A rule is not met; see Rules")); return; }
    v.state = "check"; vLog(v, ["ส่งตรวจ", "Sent for checking"]); audit(["ส่งใบขอเบิกให้ตรวจ", "Sent a voucher for checking"], v.id);
    return done(L("ส่งตรวจแล้ว", "Sent for checking"), ["finhead"], [`ใบขอเบิก ${v.id} รอตรวจหลักฐาน`, `Voucher ${v.id} is waiting for an evidence check`]);
  }
  if (a === "checked") {
    if (v.maker === me().id) { toast(L("ผู้จัดทำตรวจใบของตนเองไม่ได้ ต้องเป็นคนที่สอง (P-F05)", "The maker can't check their own voucher; a second person must (P-F05)")); return; }
    if (!vReady(v)) { toast(L("หลักฐานหรือกฎยังไม่ครบ", "Evidence or rules are not complete")); return; }
    v.state = "approve"; v.checker = me().id; vLog(v, ["ตรวจผ่าน ส่งอนุมัติ", "Checked and sent for approval"]); audit(["ตรวจใบขอเบิกผ่าน", "Checked a voucher"], v.id);
    return done(L("ส่งให้ผู้มีอำนาจอนุมัติแล้ว", "Sent to the approver"), ["exec"], [`ใบขอเบิก ${v.id} ${fmt(vCalc(v).net, 2)} บาท รออนุมัติจ่าย`, `Voucher ${v.id} (${fmt(vCalc(v).net, 2)} baht) is waiting for approval`]);
  }
  if (a === "return") { v.state = "returned"; vLog(v, ["ส่งกลับแก้ไข", "Returned"], why); audit(["ส่งใบขอเบิกกลับแก้ไข", "Returned a voucher"], `${v.id} · ${why}`); return done(L("ส่งกลับแล้ว", "Returned"), ["fin"], [`ใบขอเบิก ${v.id} ถูกส่งกลับ: ${why}`, `Voucher ${v.id} was returned: ${why}`]); }
  if (a === "cancel") { v.state = "cancelled"; vLog(v, ["ยกเลิก", "Cancelled"], why); audit(["ยกเลิกใบขอเบิก", "Cancelled a voucher"], `${v.id} · ${why}`); VC_OPEN = null; return done(L("ยกเลิกแล้ว", "Cancelled")); }
  if (a === "approve" || a === "reject") {
    const actors = sodActors("exec", "spend"), au = famAuth(), x = vCalc(v);
    if (a === "approve") {
      if (!sodCheck("SD-11", actors, [v.maker, v.checker].filter(Boolean), v.id)) return;
      const c = vcCon(v);
      if (c && !sodCheck("SD-04", actors, [...new Set([...c.inspectors, ...phaseSigners(c)])], v.id)) return;
      const row = fcfg().auth.find(r => r.role === "exec" && (r.max === 0 || x.spend <= r.max)) || fcfg().auth[0];
      v.state = "ready"; v.approver = { by: me().id, holder: au.holder, via: au.via, t: nowIso(), auth: `${row.id} ${tx(row.pos)}` };
      if (c) { const p = { id: nextId("PY", S.payreqs), contract: c.id, phase: v.phase, amount: x.spend, by: v.maker, status: "approved", t: v.t, decided: { by: me().id, holder: au.holder, via: au.via, t: nowIso() }, recon: null, voucher: v.id }; S.payreqs.push(p); v.pay = p.id; }
      vLog(v, ["อนุมัติจ่าย", "Approved"], onBehalf("exec", "spend").replace(/^ · /, "")); audit(["อนุมัติจ่ายตามใบขอเบิก", "Approved a voucher"], `${v.id} · ${fmt(x.net, 2)}${onBehalf("exec", "spend")}`);
      return done(L("อนุมัติแล้ว · การเงินส่งข้อมูลเข้า GFMIS", "Approved · Finance sends it to GFMIS"), ["fin"], [`ใบขอเบิก ${v.id} อนุมัติแล้ว ส่งเข้า GFMIS`, `Voucher ${v.id} is approved; send it to GFMIS`]);
    }
    v.state = "returned"; vLog(v, ["ไม่อนุมัติ ส่งกลับ", "Rejected and returned"], why); audit(["ไม่อนุมัติใบขอเบิก", "Rejected a voucher"], `${v.id} · ${why}`);
    return done(L("ส่งกลับแล้ว", "Returned"), ["fin", "finhead"], [`ใบขอเบิก ${v.id} ไม่ได้รับอนุมัติ: ${why}`, `Voucher ${v.id} was not approved: ${why}`]);
  }
  if (a === "paycash") { vPaid(v, `${v.method === "cheque" ? "CHQ" : "CASH"}-${v.id.slice(-3)}`); return done(L("บันทึกการจ่ายแล้ว", "Payment recorded")); }
  if (a === "cert") { v.cert.sent = { t: nowIso(), by: me().id }; vLog(v, ["ส่งหนังสือรับรองภาษี", "Sent the tax certificate"], v.cert.no); audit(["ส่งหนังสือรับรองการหักภาษี ณ ที่จ่าย", "Sent a withholding tax certificate"], `${v.id} · ${v.cert.no}`); return done(L("บันทึกการส่งแล้ว", "Marked as sent")); }
}
function vPaid(v, ref) {
  const x = vCalc(v);
  v.state = "paid"; v.paid = { t: nowIso(), ref };
  if (x.wht > 0 && !v.cert) { S.whtSeq = (S.whtSeq || 0) + 1; v.cert = { no: `WHT-${FAM_FY}-${String(S.whtSeq).padStart(4, "0")}`, t: nowIso(), sent: null }; }
  const m = vcCommit(v); if (m) m.paid = (m.paid || 0) + x.spend;
  vLog(v, ["จ่ายเงินแล้ว", "Paid"], ref);
}

{
  const bind = BIND.finance;
  BIND.finance = () => {
    bind();
    $$("[data-vcf]").forEach(b => (b.onclick = () => { VC_F = b.dataset.vcf; route(); }));
    $$("[data-vcopen]").forEach(b => (b.onclick = () => { VC_OPEN = b.dataset.vcopen; route(); }));
    const cl = $("#vc-close"); if (cl) cl.onclick = () => { VC_OPEN = null; route(); };
    const nw = $("#vc-new"); if (nw) nw.onclick = () => { VC_NEW = !VC_NEW; route(); };
    $$("[data-vcmk]").forEach(b => (b.onclick = () => { const [cid, n] = b.dataset.vcmk.split("|"); vcMake(cid, Number(n)); }));
    const v = VC_OPEN && vcOf(VC_OPEN);
    if (v) {
      $$("[data-vc]").forEach(b => (b.onclick = () => vcAct(v, b.dataset.vc)));
      $$("[data-vcev]").forEach(cb => (cb.onchange = () => { v.ev = Object.assign({}, v.ev, { [cb.dataset.vcev]: cb.checked }); vLog(v, [cb.checked ? "บันทึกหลักฐาน" : "เอาหลักฐานออก", cb.checked ? "Marked evidence" : "Unmarked evidence"], cb.dataset.vcev); commit(); route(); }));
    }
    const vf = $("#vc-form");
    if (vf) {
      const syncLine = () => { const m = (S.fcommit || []).find(x => x.id === $("#vf-commit").value); if (m) { $("#vf-line").value = m.line; $("#vf-payee").value = tx(m.vendor); $("#vf-desc").value = tx(m.name); } };
      $("#vf-commit").onchange = syncLine;
      vf.onsubmit = e => {
        e.preventDefault();
        const type = $("#vf-type").value, mid = $("#vf-commit").value, method = $("#vf-method").value, tax = $("#vf-tax").value.trim();
        if (tax && !taxOk(tax)) { toast(L("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง", "The tax ID is not valid")); return; }
        if (method !== "epay" && $("#vf-mwhy").value.trim().length < 5) { toast(L("จ่ายเช็คหรือเงินสดต้องมีเหตุผล (ข้อ 52)", "Cheque or cash needs a reason (clause 52)")); return; }
        const d = $("#vf-desc").value.trim(), nv = { id: nextVc(), type, contract: null, phase: null, commit: mid || null, line: $("#vf-line").value, desc: [d, d],
          payee: { name: $("#vf-payee").value.trim(), kind: $("#vf-kind").value, taxId: tax, vendor: null }, gross: r2(Number($("#vf-amt").value)), vat: $("#vf-vat").checked, contrib: $("#vf-contrib").checked,
          penalty: 0, other: 0, method, methodWhy: $("#vf-mwhy").value.trim(), due: $("#vf-due").value, ev: {}, state: "draft", maker: me().id, t: nowIso(), log: [] };
        vLog(nv, ["สร้างใบขอเบิก", "Created"]); (S.vouchers = S.vouchers || []).push(nv); VC_OPEN = nv.id; VC_NEW = false; VC_F = "open";
        audit(["สร้างใบขอเบิก", "Created a voucher"], `${nv.id} · ${tx(VT[type].name)} · ${fmt(nv.gross, 2)}`);
        commit(); renderShell(); route(); toast(L("สร้างใบขอเบิกแล้ว · ทำเครื่องหมายหลักฐาน แล้วส่งตรวจ", "Voucher created · mark the evidence, then send for checking"));
      };
    }
    const gm = $("#gf-make");
    if (gm) gm.onclick = () => {
      const rows = (S.vouchers || []).filter(v => v.state === "ready" && !v.gfFile), f = { id: `GO-${FAM_FY}-${String((S.gfOut || []).length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, rows: rows.map(v => v.id), state: "sent" };
      rows.forEach(v => { v.gfFile = f.id; vLog(v, ["อยู่ในไฟล์ส่ง GFMIS", "Included in the GFMIS file"], f.id); });
      (S.gfOut = S.gfOut || []).push(f);
      GF_OUT = [`# ${f.id} · ${L("ไฟล์ขอเบิกเงิน (จำลอง)", "Payment request file (simulated)")} · ${tx(S.org)}`, "voucher,type,budget_line,payee,tax_id,po,gross,penalty,wht,net,route",
        ...rows.map(v => { const x = vCalc(v), c = vcCon(v), m = vcCommit(v); return [v.id, v.type, v.line, `"${tx(v.payee.name)}"`, v.payee.taxId || "", (c && c.gfPo ? c.gfPo.no : m && m.gfPo ? m.gfPo.no : ""), v.gross.toFixed(2), x.pen.toFixed(2), x.wht.toFixed(2), x.net.toFixed(2), vRoute(v).r].join(","); })].join("\n");
      audit(["สร้างไฟล์ขอเบิกส่ง GFMIS", "Created a GFMIS request file"], `${f.id} · ${rows.length}`); commit(); route(); toast(L("สร้างไฟล์แล้ว · บันทึกใน GFMIS แล้วนำเข้าผล", "File created · post it in GFMIS, then import the result"));
    };
    const gp = $("#gf-post");
    if (gp) gp.onclick = () => {
      (S.gfOut || []).filter(f => f.state === "sent").forEach(f => {
        f.state = "posted"; f.posted = nowIso();
        f.rows.forEach((id, i) => { const v = vcOf(id); if (!v || v.state !== "ready") return; S.gfSeq = (S.gfSeq || 3600000400) + 1; v.gf = { doc: String(S.gfSeq), t: nowIso(), file: f.id }; v.state = "posted"; if (vRoute(v).r === "agency") v.funded = null; vLog(v, ["GFMIS บันทึกขอเบิกแล้ว", "Posted in GFMIS"], v.gf.doc); });
      });
      GF_OUT = null; audit(["นำเข้าผลบันทึกขอเบิกจาก GFMIS", "Imported the GFMIS posting result"], ""); commit(); renderShell(); route(); toast(L("นำเข้าผลบันทึกแล้ว", "Posting result imported"));
    };
    const gd = $("#gf-paid");
    if (gd) gd.onclick = () => {
      let n = 0;
      (S.vouchers || []).filter(v => v.state === "posted").forEach(v => {
        if (vRoute(v).r === "direct") { vPaid(v, `CGD-${v.gf.doc.slice(-6)}`); n++; }
        else if (!v.funded) { v.funded = { t: nowIso() }; vLog(v, ["เงินเข้าบัญชีหน่วยงานแล้ว", "Money reached the agency account"], v.gf.doc); n++; }
      });
      audit(["นำเข้าผลการจ่ายจาก GFMIS", "Imported the GFMIS payment result"], String(n)); commit(); renderShell(); route(); toast(L("นำเข้าผลการจ่ายแล้ว", "Payment result imported"));
    };
    const eb = $("#ep-batch");
    if (eb) eb.onclick = () => {
      const rows = (S.vouchers || []).filter(v => v.state === "posted" && vRoute(v).r === "agency" && v.funded && v.method === "epay"), id = `EP-${FAM_FY}-${String((S.epay || []).length + 1).padStart(2, "0")}`;
      rows.forEach(v => vPaid(v, `${id}/${v.id.slice(-3)}`));
      (S.epay = S.epay || []).push({ id, t: nowIso(), by: me().id, rows: rows.map(v => v.id), total: sumv(rows.map(v => vCalc(v).net)) });
      audit(["จ่ายจากบัญชีหน่วยงานผ่าน e-Payment", "Paid from the agency account by e-Payment"], `${id} · ${rows.length}`); commit(); renderShell(); route(); toast(L("สร้างไฟล์ e-Payment และบันทึกการจ่ายแล้ว", "e-Payment file created and payments recorded"));
    };
    const dc = $("#day-check");
    if (dc) dc.onclick = () => {
      const rows = (S.vouchers || []).filter(v => v.state === "paid" && !v.dayCheck); rows.forEach(v => (v.dayCheck = { t: nowIso(), by: me().id }));
      (S.payChecks = S.payChecks || []).unshift({ t: nowIso(), by: me().id, ids: rows.map(v => v.id) });
      audit(["ตรวจการจ่ายประจำวันกับหลักฐาน", "Checked the day's payments against evidence"], `${rows.length}`); commit(); renderShell(); route(); toast(L("ลงนามตรวจการจ่ายประจำวันแล้ว", "Daily payment check signed"));
    };
    const vc = $("#vd-chg");
    if (vc) vc.onsubmit = e => {
      e.preventDefault();
      const acct = $("#vc-acct").value.trim(); if (!/^\d{10}$/.test(acct)) { toast(L("เลขที่บัญชีต้องเป็นตัวเลข 10 หลัก", "The account number must be 10 digits")); return; }
      const ch = { id: `VB-${FAM_FY}-${String((S.vendorChanges || []).length + 1).padStart(2, "0")}`, vendor: $("#vc-vendor").value, bank: $("#vc-bank").value, acct, by: me().id, t: nowIso(), status: "pending", done: null };
      (S.vendorChanges = S.vendorChanges || []).push(ch);
      audit(["ขอแก้บัญชีธนาคารผู้ขาย", "Asked to change a supplier bank account"], `${ch.id} · ${ch.vendor}`); notify(["finhead"], [`คำขอแก้บัญชีธนาคารผู้ขาย ${ch.id} รอยืนยัน`, `Supplier bank change ${ch.id} is waiting to be confirmed`], "fnc-pay");
      commit(); renderShell(); route(); toast(L("ส่งคำขอแล้ว · คนที่สองต้องยืนยัน", "Requested · a second person must confirm"));
    };
    $$("[data-vdok]").forEach(b => (b.onclick = () => {
      const ch = (S.vendorChanges || []).find(x => x.id === b.dataset.vdok);
      if (!sodCheck("SD-14", [me().id], [ch.by], ch.id)) return;
      const vd = (S.vendors || []).find(x => x.id === ch.vendor); if (vd) vd.bank = { bank: ch.bank, acct: ch.acct, t: nowIso() };
      ch.status = "confirmed"; ch.done = { by: me().id, t: nowIso() };
      audit(["ยืนยันการแก้บัญชีธนาคารผู้ขาย", "Confirmed a supplier bank change"], ch.id); commit(); renderShell(); route(); toast(L("ยืนยันแล้ว · ส่งข้อมูลให้กรมบัญชีกลาง", "Confirmed · sent to the Comptroller General"));
    }));
  };
}

// ---------- clocks, badges, tasks ----------
{
  const base = finClocks;
  finClocks = function () {
    const out = base(), c = fcfg();
    (S.vouchers || []).forEach(v => {
      if (v.type === "proc" && ["draft", "returned", "check", "approve", "ready"].includes(v.state)) out.push({ due: v.due, title: `${L("ส่งขอเบิกเข้า GFMIS", "Send to GFMIS")} ${v.id}`, sub: `${tx(v.payee.name)} · ${VST[v.state][2]} ${tx(VST[v.state][0])}`, link: "fnc-pay", src: L("ข้อ 28", "cl. 28") });
      else if (v.type !== "proc" && v.due && ["draft", "returned", "check", "approve", "ready"].includes(v.state)) out.push({ due: v.due, title: `${L("ครบกำหนดจ่าย", "Due")} ${v.id}`, sub: `${tx(v.payee.name)} · ${tx(VT[v.type].name)}`, link: "fnc-pay", src: v.type === "utility" ? L("ข้อ 31", "cl. 31") : L("ข้อ 22", "cl. 22") });
      if (v.state === "posted" && v.funded) out.push({ due: addWorkdays(v.funded.t.slice(0, 10), c.refundDays), title: `${L("จ่ายต่อหรือส่งคืน", "Pay on or return")} ${v.id}`, sub: tx(v.payee.name), link: "fnc-pay", src: L("ข้อ 99", "cl. 99") });
    });
    return out.sort((a, b) => (a.due < b.due ? -1 : 1));
  };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "pay") {
      const V = S.vouchers || [];
      let n = 0;
      if (ROLE === "fin") n = famAcceptedUnpaid().length + V.filter(v => v.state === "returned" || (v.state === "ready" && !v.gfFile)).length;
      if (ROLE === "finhead") n = V.filter(v => v.state === "check").length + V.filter(v => v.state === "paid" && !v.dayCheck).length + (S.vendorChanges || []).filter(x => x.status === "pending").length;
      if (ROLE !== "fin" && ROLE !== "finhead" && canSpend()) n = V.filter(v => v.state === "approve").length;
      return n ? `<span class="badge">${n}</span>` : "";
    }
    return tb(nid, tab);
  };
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments), V = S.vouchers || [], R = (title, sub, due, link, cls) => t.unshift({ title, sub, due, link, cls });
    if (ROLE === "fin") {
      V.filter(v => v.state === "returned").forEach(v => R(`${L("แก้ไขใบขอเบิก", "Fix voucher")} ${v.id}`, esc(tx(v.payee.name)), v.due || TODAY, "fnc-pay", "p-bad"));
      if (V.some(v => v.state === "ready" && !v.gfFile)) R(L("ส่งใบขอเบิกที่อนุมัติแล้วเข้า GFMIS", "Send approved vouchers to GFMIS"), `${V.filter(v => v.state === "ready" && !v.gfFile).length} ${L("ใบ", "vouchers")}`, TODAY, "fnc-pay", "p-warn");
    }
    if (ROLE === "finhead") {
      V.filter(v => v.state === "check").forEach(v => R(`${L("ตรวจหลักฐานใบขอเบิก", "Check voucher evidence")} ${v.id}`, `${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)}`, v.due || TODAY, "fnc-pay", "p-info"));
      (S.vendorChanges || []).filter(x => x.status === "pending").forEach(x => R(`${L("ยืนยันการแก้บัญชีผู้ขาย", "Confirm a supplier bank change")} ${x.id}`, "", TODAY, "fnc-pay", "p-warn"));
      if (V.some(v => v.state === "paid" && !v.dayCheck)) R(L("ตรวจการจ่ายประจำวัน (ข้อ 43)", "Daily payment check (clause 43)"), `${V.filter(v => v.state === "paid" && !v.dayCheck).length} ${L("รายการ", "payments")}`, TODAY, "fnc-pay", "p-warn");
    }
    if (canSpend() && ROLE !== "fin" && ROLE !== "finhead") V.filter(v => v.state === "approve").forEach(v => R(`${L("อนุมัติจ่าย", "Approve payment")} ${v.id}`, `${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)} ${L("บาท", "baht")}`, v.due || TODAY, "fnc-pay", "p-warn"));
    return t.filter(x => !(x.cls === "p-mute" && t.length > 1));
  };
}

// ---------- seed (called from the shared seed builder) ----------
function seedFinanceFN2(s) {
  const FN = (s.users.find(u => u.role === "fin") || {}).id, FH = (s.users.find(u => u.role === "finhead") || {}).id, EX = (s.users.find(u => u.role === "exec") || {}).id;
  const c0 = s.contracts[0], ph0 = c0.phases[0], p0 = s.payreqs[0], vend = n => (s.vendors || []).find(v => v.name === n);
  const ap = t => ({ by: EX, holder: EX, via: null, t, auth: "A1" });
  const base = (o) => Object.assign({ contract: null, phase: null, commit: null, penalty: 0, other: 0, vat: false, method: "epay", methodWhy: "", ev: {}, maker: FN, log: [] }, o);
  const m1 = s.fcommit[0], m2 = s.fcommit[1], m3 = s.fcommit[2];
  const vd0 = vend(c0.vendor[0]);
  s.vouchers = [
    base({ id: "VC-2570-001", type: "proc", contract: c0.id, phase: ph0.n, line: c0.line, desc: [`${c0.id} งวดที่ 1`, `${c0.id} phase 1`], payee: { name: c0.vendor, kind: "corp", taxId: vd0 ? vd0.taxId : "", vendor: vd0 ? vd0.id : null },
      gross: ph0.amount, vat: true, due: "2026-10-21", state: "paid", checker: FH, approver: ap("2026-10-15T10:00"), pay: p0.id, t: "2026-10-14T15:00", gf: { doc: "GF-70-000417", t: "2026-10-15T14:00", file: "GO-2570-01" }, paid: { t: "2026-10-16T09:00", ref: "CGD-000417" }, dayCheck: { t: "2026-10-16T16:30", by: FH } }),
    base({ id: "VC-2570-002", type: "utility", commit: m1.id, line: m1.line, desc: ["ค่าไฟฟ้า เดือนกันยายน 2569", "Electricity, September 2026"], payee: { name: m1.vendor, kind: "gov", taxId: "" }, gross: 150000, due: "2026-10-15", ev: { bill: true }, state: "paid", checker: FH, approver: ap("2026-10-08T11:00"), t: "2026-10-05T10:00", gf: { doc: "3600000391", t: "2026-10-09T10:00", file: "GO-2570-01" }, paid: { t: "2026-10-12T10:00", ref: "CGD-000391" }, dayCheck: { t: "2026-10-12T16:00", by: FH } }),
    base({ id: "VC-2570-003", type: "service", commit: m3.id, line: m3.line, desc: ["บำรุงรักษาระบบ ไตรมาส 1", "System maintenance, quarter 1"], payee: { name: m3.vendor, kind: "corp", taxId: vd0 ? vd0.taxId : "", vendor: vd0 ? vd0.id : null }, gross: 300000, vat: true, due: "2026-10-15", ev: { inv: true, acc: true }, state: "paid", checker: FH, approver: ap("2026-10-09T11:00"), t: "2026-10-06T10:00", gf: { doc: "3600000398", t: "2026-10-10T10:00", file: "GO-2570-01" }, paid: { t: "2026-10-14T10:00", ref: "CGD-000398" }, cert: { no: "WHT-2570-0001", t: "2026-10-14T10:00", sent: null } }),
    base({ id: "VC-2570-004", type: "comp", line: m1.line, desc: ["ค่าตอบแทนวิทยากร อบรมการจัดทำงบประมาณ", "Speaker fees, budget preparation training"], payee: { name: ["นางสาวตัวอย่าง วิทยากร", "Ms Tuayang Witthayakon"], kind: "person", taxId: "" }, gross: 12000, due: "2026-10-23", ev: { order: true, sign: true }, state: "approve", checker: FH, t: "2026-10-15T09:00" }),
    base({ id: "VC-2570-005", type: "service", commit: m2.id, line: m2.line, desc: ["ค่าเช่าอาคารสาขา เดือนตุลาคม 2569", "Branch rent, October 2026"], payee: { name: m2.vendor, kind: "corp", taxId: "" }, gross: 80000, vat: true, due: "2026-10-30", ev: { inv: true, acc: true }, state: "check", t: "2026-10-16T09:30" }),
    base({ id: "VC-2570-006", type: "utility", line: m1.line, desc: ["ค่าน้ำประปา เดือนกันยายน 2569", "Water, September 2026"], payee: { name: ["การประปานครหลวง", "Metropolitan Waterworks Authority"], kind: "gov", taxId: "" }, gross: 18500, due: "2026-11-15", state: "draft", t: "2026-10-16T10:00" }),
  ];
  s.vouchers.forEach(v => v.log.push({ t: v.t, by: FN, role: "fin", act: ["สร้างใบขอเบิก", "Created"], note: "" }));
  p0.voucher = "VC-2570-001";
  s.whtSeq = 1; s.gfSeq = 3600000400;
  m3.paid = 300000; m1.paid = 150000;
  s.gfOut = [{ id: "GO-2570-01", t: "2026-10-09T09:00", by: FN, rows: ["VC-2570-002", "VC-2570-003", "VC-2570-001"], state: "posted", posted: "2026-10-15T14:00" }];
  s.epay = []; s.payChecks = [{ t: "2026-10-16T16:30", by: FH, ids: ["VC-2570-001"] }];
  s.vendorChanges = [];
  ["SD-11", "SD-14"].forEach(id => { if (!s.sod.rules.some(r => r.id === id)) s.sod.rules.push({ id, on: true }); });
}
