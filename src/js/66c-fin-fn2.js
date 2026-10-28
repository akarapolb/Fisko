// Fisko Finance round FN2 (Finance design v0.1, chapter 6.2): payment vouchers, withholding tax and payment.
// - Voucher types and evidence (FR-FN-07, 08), payment route (FR-FN-09, R-FN-02), withholding tax and the
//   50 ทวิ certificate (FR-FN-10, R-FN-03), request clocks (FR-FN-11), approval with duty checks (FR-FN-12, SD-11),
//   GFMIS files out and results in (FR-FN-13, 14), payment from the agency account (FR-FN-15), the daily payment
//   check (FR-FN-16) and supplier bank-account changes (FR-FN-17, SD-14).
// States: draft V1 → check V2 → approve V3 → ready V4 → posted V5 → paid V6 (→ V7 when matched in reconciliation).
// A procurement voucher writes an approved payment (S.payreqs) when it is approved, so Procurement, Budget and
// the analytics keep reading payments as before. All files and payments here are simulated (no real GFMIS or bank).
let VC_OPEN = null, VC_F = "open";

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
  paid: [["จ่ายเงินแล้ว", "Paid"], "p-ok", "V6"], recon: [["กระทบยอดแล้ว", "Reconciled"], "p-ok", "V7"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute", "—"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad", "—"],
};
const ROUTE = { nb: ["จ่ายจากบัญชีเงินนอกงบประมาณของหน่วยงาน", "Paid from the agency's non-budget account"], direct: ["กรมบัญชีกลางจ่ายตรงเจ้าหนี้", "Paid by the Comptroller General straight to the payee"], agency: ["เข้าบัญชีหน่วยงานแล้วจ่ายต่อ", "Into the agency account, then paid on"] };
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
  // Non-budget money (round 46) is paid from the agency's non-budget account; it never goes through a GFMIS request.
  if (v.fund) return { r: "nb", src: "ข้อ 20 (1)", po: false };
  const c = fcfg(), big = vOrder(v) >= c.poMin;
  if (v.type === "proc" || v.type === "service") return big ? { r: "direct", src: "ข้อ 28 (1)", po: true } : { r: "agency", src: "ข้อ 28 (2)", po: false };
  if (v.type === "utility") return v.contrib ? { r: "agency", src: "ข้อ 29 (1)", po: false } : { r: "direct", src: "ข้อ 29", po: false };
  if (v.type === "comp") return { r: "agency", src: "ข้อ 29 (2)", po: false };
  return { r: "direct", src: "ข้อ 29", po: false };
}
const vAgency = v => ["agency", "nb"].includes(vRoute(v).r);
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
  if (v.fund && typeof nbRule === "function") nbRule(v, add);
  else if (v.type === "proc") add("R-FN-01", true, L("ผูกพันตามสัญญาแล้ว ไม่เกินวงเงินสัญญา", "Within the contract commitment"));
  // R-FC-03: vouchers already sent for checking hold their amount, so several open vouchers can't together pass the limit.
  else if (m) { const free = fcFree(finCommits().find(y => y.id === m.id), v.id) + (v.state === "paid" ? x.spend : 0); add("R-FN-01", x.spend <= free, L(`ไม่เกินยอดผูกพันที่ยังว่างของ ${m.id} (${fmt(free, 2)} บาท หลังหักใบที่จองไว้)`, `Within what is free on ${m.id} (${fmt(free, 2)} baht after vouchers holding it)`)); }
  else { const free = famHeadroom(v.line) - vcReserved(y => y.line === v.line && !y.contract && !y.commit && !y.fund && ["check", "approve"].includes(y.state), v.id) + (["ready", "posted", "paid"].includes(v.state) ? x.spend : 0);
    add("R-FN-01", x.spend <= free, L(`ไม่เกินวงเงินคงเหลือของรายการจัดสรร ${fmt(free, 2)} บาท (ข้อ 18)`, `Within the line's free amount, ${fmt(free, 2)} baht (clause 18)`)); }
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
// Vouchers sent for checking and not yet paid hold their amount on the commitment or line (R-FC-03).
const VC_RESV = ["check", "approve", "ready", "nbready", "posted"];
const vcReserved = (pred, except) => sumv((S.vouchers || []).filter(y => y.id !== except && VC_RESV.includes(y.state) && pred(y)).map(y => vCalc(y).spend));
const fcFree = (x, except) => (x ? fcLeft(x) - vcReserved(y => y.commit === x.id, except) : 0);
// Approval authority (FR-FC-13, FX-01): the lowest level of a role whose limit covers the amount (max 0 = no limit).
const authCap = r => (r.max === 0 ? Infinity : r.max);
const vcAuth = (spend, role) => fcfg().auth.filter(r => (!role || r.role === role) && spend <= authCap(r)).sort((a, b) => authCap(a) - authCap(b))[0] || null;
const vcNeedAuth = spend => vcAuth(spend);
const vcCanApprove = v => (canSpend() && !!vcAuth(vCalc(v).spend, "exec")) || (ROLE === "finhead" && !!vcAuth(vCalc(v).spend, "finhead"));
const vcIsMaker = v => v.maker === me().id;

// ---------- duty rules SD-11 and SD-14 ----------
SOD_RULES.push(["P-F05", ["ผู้จัดทำใบขอเบิก ตรวจหลักฐานใบนั้นเองไม่ได้ ต้องเป็นคนที่สอง", "Whoever prepared a voucher can't check its evidence; a second person must"]],
  ["SD-11", ["ผู้จัดทำหรือผู้ตรวจใบขอเบิก อนุมัติใบนั้นไม่ได้", "Whoever prepared or checked a voucher can't approve it"]],
  ["SD-14", ["ผู้ขอแก้บัญชีธนาคารของผู้ขาย ยืนยันการแก้นั้นไม่ได้", "Whoever asked for a supplier bank-account change can't confirm it"]]);
SOD_STEPS.push([["จัดทำใบขอเบิก", "Prepare a voucher"], ["ตรวจหลักฐาน", "Check the evidence"], "P-F05"],
  [["จัดทำหรือตรวจใบขอเบิก", "Prepare or check a voucher"], ["อนุมัติจ่าย", "Approve the payment"], "SD-11"],
  [["ขอแก้บัญชีธนาคารผู้ขาย", "Ask to change a supplier's bank account"], ["ยืนยันการแก้", "Confirm the change"], "SD-14"]);

// ---------- views ----------
// The drawer's buttons by state and role (Finance CRUD 5.1): [act, label, kind, needs a reason].
// Who would approve (the user, and the executive they act for) already made or checked the voucher: SD-11 refuses
// the approval, so the button is not offered and the drawer says why (round 66).
function vcSodClash(v) {
  if (!sodOn("SD-11")) return false;
  const actors = canSpend() ? sodActors("exec", "spend") : [me().id];
  return actors.some(a => a === v.maker || a === v.checker);
}
function vcActs(v) {
  const fin = isFinRole(), maker = ROLE === "fin" && vcIsMaker(v), out = [];
  if (maker && ["draft", "returned"].includes(v.state)) out.push(["edit", L("แก้ไข", "Edit"), "", false], ["submit", L("ส่งตรวจ", "Send for checking"), "primary", false], ["cancel", L("ยกเลิก", "Cancel"), "danger", true]);
  if (maker && ["check", "approve"].includes(v.state)) out.push(["recall", L("ดึงกลับมาแก้ไข", "Recall to edit"), "", true]);
  if (fin && v.state === "check") out.push(["checked", L("ตรวจผ่าน ส่งอนุมัติ", "Checked · send for approval"), "primary", false], ["return", L("ส่งกลับแก้ไข", "Return"), "danger", true]);
  if (v.state === "approve" && vcCanApprove(v) && !vcSodClash(v)) out.push(["approve", onBehalf("exec", "spend") && ROLE !== "finhead" ? L("อนุมัติจ่ายแทน", "Approve on behalf") : L("อนุมัติจ่าย", "Approve payment"), "primary", false], ["return", L("ส่งคืนแก้ไข", "Return to fix"), "", true], ["reject", L("ไม่อนุมัติ", "Reject"), "danger", true]);
  if (ROLE === "finhead" && (["check", "approve", "nbready"].includes(v.state) || (v.state === "ready" && !v.gfFile))) out.push(["hcancel", L("ยกเลิกใบขอเบิก", "Cancel the voucher"), "danger", true]);
  if (ROLE === "fin" && (v.state === "posted" || v.state === "nbready") && vAgency(v) && v.funded && v.method !== "epay") out.push(["paycash", `${L("บันทึกการจ่าย", "Record the payment")} (${tx(METHOD[v.method])})`, "primary", false]);
  if (fin && v.state === "paid" && v.cert && !v.cert.sent) out.push(["cert", L("ส่งหนังสือรับรองภาษีให้ผู้รับเงิน", "Send the tax certificate to the payee"), "", false]);
  return out;
}
// What a reason-needing action does, shown in the reason box before confirming.
function vcImpact(v, a) {
  const x = vCalc(v), m = vcCommit(v), held = VC_RESV.includes(v.state), adv = (S.advances || []).find(y => y.topup === v.id);
  const back = held ? L(`คืนยอดจอง ${fmt(x.spend, 2)} บาทให้ ${m ? m.id : v.fund ? v.fund : v.line}`, `Gives ${fmt(x.spend, 2)} baht back to ${m ? m.id : v.fund ? v.fund : v.line}`) : "";
  if (a === "recall") return L("ผู้ตรวจและผู้อนุมัติเดิมถูกล้าง ต้องตรวจและอนุมัติใหม่ทั้งหมด นาฬิกาเดินต่อจากเดิม", "The checker and approver are cleared; it is checked and approved again. The clock keeps running");
  if (a === "return") return L(`ผู้จัดทำแก้แล้วส่งใหม่ · ส่งคืนมาแล้ว ${v.returns || 0} ครั้ง${(v.returns || 0) >= 2 ? " ครั้งนี้แจ้งหัวหน้าการเงิน" : ""}`, `The maker fixes it and sends it again · returned ${v.returns || 0} times so far${(v.returns || 0) >= 2 ? "; this time the finance head is told" : ""}`);
  if (a === "reject") return L("สถานะสุดท้าย ไม่นับในยอด ถ้าต้องเบิกอีกให้ทำใบใหม่", "Final; it no longer counts. A new voucher is needed to claim again");
  return [back, vcPay(v) && L("การอนุมัติจ่ายใน Procurement ถูกยกเลิกด้วย", "The payment approval in Procurement is cancelled too"), adv && L(`เงินยืม ${adv.id} กลับเป็น “ยังไม่ได้เบิกส่วนเกิน”`, `Advance ${adv.id} goes back to “top-up not claimed”`)].filter(Boolean).join(" · ");
}
function vcDetail(v) {
  const x = vCalc(v), rt = vRoute(v), ev = vEvidence(v), rules = vRules(v), fin = isFinRole();
  const evEdit = fin && ["draft", "returned", "check"].includes(v.state) && !ev.every(e => e.auto);
  const c = vcCon(v), ph = vcPh(v), m = vcCommit(v), acts = vcActs(v), ask = FIN_ASK && FIN_ASK.key === "vc" && acts.find(a => a[0] === FIN_ASK.act);
  const need = v.state === "approve" ? vcNeedAuth(x.spend) : null;
  const details = `
      <div class="grid2" style="gap:16px">
        <div>
          <h3 style="margin:0 0 6px;font-size:15px">${L("ผู้รับเงินและรายการ", "Payee and item")}</h3>
          <p style="margin:0 0 4px"><b style="font-weight:600">${esc(tx(v.payee.name))}</b> <span class="sub">${tx(PAYEE_K[v.payee.kind])}${v.payee.taxId ? ` · ${L("เลขผู้เสียภาษี", "Tax ID")} <span class="mono">${esc(v.payee.taxId)}</span>` : ""}</span></p>
          <p class="sub" style="margin:0 0 4px">${esc(tx(v.desc))}${c ? ` · <span class="mono">${c.id}</span> ${ph ? tx(ph.name) : ""}` : ""}${m ? ` · <span class="mono">${m.id}</span>` : ""}${v.line ? ` · <span class="mono">${v.line}</span> ${esc(lineLabel(famLine(v.line)))}` : ""}</p>
          <p class="sub" style="margin:0">${L("ทางจ่าย", "Route")}: ${tx(ROUTE[rt.r])} (${rt.src}) · ${L("วิธีจ่าย", "Method")}: ${tx(METHOD[v.method])}${v.methodWhy ? ` · ${esc(v.methodWhy)}` : ""}</p>
          ${v.due && !["paid", "cancelled", "rejected"].includes(v.state) ? `<p class="sub" style="margin:4px 0 0">${dotI(clockDot(v.due))}${v.type === "proc" ? L("ส่งขอเบิกเข้า GFMIS ภายใน", "Send to GFMIS by") : L("ครบกำหนดจ่าย", "Due")} ${clockTxt(v.due)}${v.type === "proc" ? ` (${L("ข้อ 28", "cl. 28")})` : ""}</p>` : ""}
        </div>
        <div>
          <h3 style="margin:0 0 6px;font-size:15px">${L("ยอดและรายการหัก (บาท)", "Amount and deductions (baht)")}</h3>
          <table style="width:100%"><tbody>
            <tr><td>${L("ยอดรวม", "Gross")}${v.vat ? ` <span class="sub">(${L("รวม VAT", "incl. VAT")} ${fmt(x.vat, 2)})</span>` : ""}</td><td class="n">${fmt(v.gross, 2)}</td></tr>
            ${x.pen ? `<tr><td>${L("หักค่าปรับ", "Less penalty")}</td><td class="n">−${fmt(x.pen, 2)}</td></tr>` : ""}
            ${v.other ? `<tr><td>${L("หักอื่น", "Other deductions")}</td><td class="n">−${fmt(v.other, 2)}</td></tr>` : ""}
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
      ${need ? `<p class="sub" style="margin:10px 0 0">${dotI("warn")}${L("ต้องอนุมัติโดยระดับอำนาจ", "Needs approval at authority level")} ${need.id} ${tx(need.pos)} ${L("ขึ้นไป", "or higher")} (${L("ยอด", "amount")} ${fmt(x.spend, 2)} ${L("บาท", "baht")})</p>` : ""}
      ${v.gf ? `<p class="sub" style="margin:10px 0 0">GFMIS: <span class="mono">${esc(v.gf.doc)}</span> · ${fdate(v.gf.t, true)}${v.paid ? ` · ${L("จ่ายแล้ว", "paid")} ${fdate(v.paid.t)} · <span class="mono">${esc(v.paid.ref)}</span>` : ""}</p>` : ""}
      ${v.cert ? `<div class="callout" style="margin:10px 0 0"><b>${L("หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)", "Withholding tax certificate (50 Tawi)")} <span class="mono">${v.cert.no}</span></b>${esc(tx(S.org))} → ${esc(tx(v.payee.name))} · ${L("ฐาน", "base")} ${fmt(x.base, 2)} · ${L("ภาษี", "tax")} ${fmt(x.wht, 2)} · ${fdate(v.paid.t)} · ${v.cert.sent ? `${L("ส่งแล้ว", "sent")} ${fdate(v.cert.sent.t, true)}` : L("ยังไม่ส่ง", "not sent yet")}</div>` : ""}
      ${v.approver ? `<p class="sub" style="margin:8px 0 0">${L("อนุมัติโดย", "Approved by")} ${esc(userName(v.approver.by))}${v.approver.via ? ` · ${L("แทน", "for")} ${esc(userName(v.approver.holder))} (${v.approver.via})` : ""} · ${L("อำนาจ", "authority")} ${v.approver.auth} · ${fdate(v.approver.t, true)}</p>` : ""}
      ${(v.refunds || []).length ? `<p class="sub" style="margin:8px 0 0">${dotI("warn")}${L("มีเงินคืน", "Money paid back")} ${fmt(v.refunded, 2)} ${L("บาท", "baht")} · ${v.refunds.map(f => `<span class="mono">${f.rc}</span> ${fmt(f.amount, 2)}${f.inYear ? "" : ` (${L("ปีเก่า เป็นรายได้แผ่นดิน", "old year, state revenue")})`}`).join(", ")} · ${L("สุทธิหลังคืน", "net after refunds")} ${fmt(r2(x.net - v.refunded), 2)}</p>` : ""}
      ${(v.certs || []).length ? `<p class="sub" style="margin:4px 0 0">${L("หนังสือรับรองที่ยกเลิก", "Cancelled certificates")}: ${v.certs.map(c => `<span class="mono">${c.no}</span> (${esc(c.cancelled.why)})`).join(", ")}</p>` : ""}
      ${v.rejected ? `<p class="sub" style="margin:8px 0 0">${dotI("bad")}${L("ไม่อนุมัติโดย", "Rejected by")} ${esc(userName(v.rejected.by))} · ${fdate(v.rejected.t, true)} · ${esc(v.rejected.why)}</p>` : ""}`;
  const bar = ask ? finAskForm("vc", ask[0], ask[1], { impact: vcImpact(v, ask[0]), danger: ask[2] === "danger", extra: vcAskExtra(v, ask[0]) })
    : (v.state === "approve" && vcCanApprove(v) && vcSodClash(v) ? `<p class="sub" style="margin:12px 0 0">${dotI("warn")}${L(`คุณ${v.maker === me().id ? "จัดทำ" : "ตรวจ"}ใบนี้ จึงอนุมัติใบนี้ไม่ได้ (SD-11) ผู้มีอำนาจคนอื่นต้องอนุมัติ`, `You ${v.maker === me().id ? "made" : "checked"} this voucher, so you can't approve it (SD-11); another approver must`)}</p>` : "") + (acts.length ? `<div class="row cr-acts" style="margin-top:12px;flex-wrap:wrap">${acts.map(([a, l, k, w]) => (w ? finAskBtn("vc", a, l, k) : `<button class="btn ${k}" type="button" data-vc="${a}">${l}</button>`)).join("")}</div>` : "");
  return `<section class="panel" id="vc-detail"><header><h2><span class="mono">${v.id}</span> · ${tx(VT[v.type].name)}</h2><span class="sp"></span>${vTag(v)}<button class="btn ghost" type="button" id="vc-close">${L("ปิด", "Close")}</button></header>
    <div class="body">${finDrTabs("vc", [["view", L("รายละเอียด", "Details"), details], ["hist", `${L("ประวัติ", "History")} (${(v.log || []).length})`, finLogHtml(v.log, v.id)]])}${bar}</div></section>`;
}
// Extra inputs inside a reason box (85-fin-pay-crud.js adds the refund amount).
function vcAskExtra() { return ""; }
FIN_ASK_RUN.vc = (a, why) => { const v = VC_OPEN && vcOf(VC_OPEN); return v ? vcAct(v, a, why) : undefined; };

// ---------- create and edit in the drawer (FR-FC-08, FR-FC-09) ----------
// VC_EDIT is "new" or the id being edited; VC_DRAFT holds what has been typed when the form re-renders.
let VC_EDIT = null, VC_DRAFT = null, VC_ERR = [], VC_DIRTY = false;
const vcVals = v => (v ? { type: v.type, commit: v.commit || "", nb: v.fund ? `${v.fund}|${v.nbLine}` : "", line: v.line || "", desc: tx(v.desc), vendor: v.payee.vendor || "", payee: tx(v.payee.name), kind: v.payee.kind, tax: v.payee.taxId || "",
  gross: v.gross, vat: !!v.vat, contrib: !!v.contrib, penalty: v.penalty || 0, other: v.other || 0, due: v.due || "", method: v.method, mwhy: v.methodWhy || "" }
  : { type: "service", commit: "", nb: "", line: (famLines().find(l => l.type === "ope" || l.type === "inv") || {}).id || "", desc: "", vendor: "", payee: "", kind: "corp", tax: "", gross: "", vat: false, contrib: false, penalty: 0, other: 0, due: addDays(TODAY, 7), method: "epay", mwhy: "" });
// Writes form values onto a voucher (or a copy used to preview the rules). A procurement voucher's amount and payee
// come from the contract, so only its deductions, due date and payment method change.
function vcApply(t, f) {
  t.due = f.due; t.method = f.method; t.methodWhy = f.method === "epay" ? "" : f.mwhy;
  if (t.type === "proc") { t.penalty = r2(Number(f.penalty) || 0); t.other = r2(Number(f.other) || 0); return t; }
  const nb = f.nb ? f.nb.split("|") : null, m = f.commit ? (S.fcommit || []).find(x => x.id === f.commit) : null, vd = f.vendor ? (S.vendors || []).find(x => x.id === f.vendor) : null;
  t.type = f.type; t.commit = nb ? null : m ? m.id : null; t.fund = nb ? nb[0] : null; t.nbLine = nb ? nb[1] : null; t.line = nb ? null : m ? m.line : f.line;
  t.desc = [f.desc, f.desc]; t.payee = { name: [f.payee, f.payee], kind: f.kind, taxId: f.tax, vendor: vd ? vd.id : null };
  t.gross = r2(Number(f.gross) || 0); t.vat = !!f.vat; t.contrib = !!f.contrib;
  return t;
}
function vcCheck(f, v) {
  const e = [], add = (k, m) => e.push({ f: k, m }), proc = v && v.type === "proc";
  if (!f.due) add("due", L("ต้องกรอก", "Required"));
  if (f.method !== "epay" && (f.mwhy || "").trim().length < 5) add("mwhy", L("จ่ายเช็คหรือเงินสดต้องมีเหตุผล (ข้อ 52)", "Cheque or cash needs a reason (clause 52)"));
  if (proc) { if (Number(f.penalty) < 0 || Number(f.penalty) >= v.gross) add("penalty", L("ค่าปรับต้องไม่ติดลบและน้อยกว่ายอดรวม", "The penalty must be zero or more and below the gross")); if (Number(f.other) < 0) add("other", L("ต้องไม่ติดลบ", "Can't be negative")); return e; }
  if (!f.desc.trim()) add("desc", L("ต้องกรอก", "Required"));
  if (!f.payee.trim()) add("payee", L("ต้องกรอก", "Required"));
  if (!(Number(f.gross) > 0)) add("gross", L("ยอดรวมต้องมากกว่าศูนย์", "The gross must be above zero"));
  if (f.tax && !taxOk(f.tax)) add("tax", L("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง", "The tax ID is not valid"));
  if (!f.nb && !f.commit && !f.line) add("line", L("เลือกรายการจัดสรร", "Pick an allocation line"));
  return e;
}
// Saves the form: a new draft, or the changes to a draft or returned voucher. Returns { errs } or { v }.
function vcSave(f, v) {
  const errs = vcCheck(f, v);
  if (errs.length) return { errs };
  if (v) {
    const before = { gross: v.gross, payee: tx(v.payee.name), due: v.due, src: v.commit || v.fund || v.line, method: v.method, penalty: v.penalty || 0 };
    vcApply(v, f);
    const after = { gross: v.gross, payee: tx(v.payee.name), due: v.due, src: v.commit || v.fund || v.line, method: v.method, penalty: v.penalty || 0 };
    const note = Object.keys(before).filter(k => before[k] !== after[k]).map(k => `${k}: ${typeof before[k] === "number" ? fmt(before[k], 2) : before[k]} → ${typeof after[k] === "number" ? fmt(after[k], 2) : after[k]}`).join(" · ");
    vLog(v, ["แก้ไขใบขอเบิก", "Edited"], note); audit(["แก้ไขใบขอเบิก", "Edited a voucher"], `${v.id}${note ? " · " + note : ""}`);
    return { v };
  }
  const nv = vcApply({ id: nextVc(), type: f.type, contract: null, phase: null, penalty: 0, other: 0, ev: {}, state: "draft", maker: me().id, t: nowIso(), log: [] }, f);
  vLog(nv, ["สร้างใบขอเบิก", "Created"]); (S.vouchers = S.vouchers || []).push(nv);
  audit(["สร้างใบขอเบิก", "Created a voucher"], `${nv.id} · ${tx(VT[nv.type].name)} · ${fmt(nv.gross, 2)}`);
  return { v: nv };
}
function vcRead() {
  const f = $("#vc-form"), g = n => { const el = f && f.querySelector(`[name="${n}"]`); return !el ? undefined : el.type === "checkbox" ? el.checked : el.value.trim(); };
  const out = {}; ["type", "commit", "nb", "line", "desc", "vendor", "payee", "kind", "tax", "gross", "vat", "contrib", "penalty", "other", "due", "method", "mwhy"].forEach(k => { const x = g(k); if (x !== undefined) out[k] = x; });
  return out;
}
function vcForm() {
  const v = VC_EDIT !== "new" ? vcOf(VC_EDIT) : null, proc = v && v.type === "proc", f = Object.assign(vcVals(v), VC_DRAFT || {}), errs = VC_ERR || [];
  const eOf = k => errs.filter(e => e.f === k).map(e => `<div class="cr-err" id="vce-${k}">${esc(e.m)}</div>`).join(""), bad = k => (errs.some(e => e.f === k) ? ` aria-invalid="true" aria-describedby="vce-${k}"` : "");
  const fld = (k, label, inp, o = {}) => `<div class="cr-f ${o.wide ? "wide" : ""}"><label for="vcx-${k}">${label}${o.req ? ` <span class="cr-req" aria-hidden="true">*</span>` : ""}</label>${inp}${o.hint ? `<div class="sub">${o.hint}</div>` : ""}${eOf(k)}</div>`;
  const sel = (k, opts, o = {}) => `<select id="vcx-${k}" name="${k}"${bad(k)}>${o.blank ? `<option value="">${o.blank}</option>` : ""}${opts.map(([a, b]) => `<option value="${esc(a)}" ${String(f[k]) === String(a) ? "selected" : ""}>${esc(b)}</option>`).join("")}</select>`;
  const inp = (k, type, o = {}) => `<input type="${type}" id="vcx-${k}" name="${k}" value="${esc(f[k] ?? "")}"${o.attrs || ""}${bad(k)}>`;
  const chk = (k, label) => `<div class="cr-f wide"><label class="field-inline" for="vcx-${k}"><input type="checkbox" id="vcx-${k}" name="${k}" ${f[k] ? "checked" : ""}> ${label}</label></div>`;
  const fcs = (S.fcommit || []).filter(m => m.id === f.commit || fcFree(finCommits().find(y => y.id === m.id)) > 0);
  const t = vcApply(v ? JSON.parse(JSON.stringify(v)) : { id: "", type: f.type, contract: null, phase: null, penalty: 0, other: 0, ev: {}, state: "draft", maker: me().id }, f);
  const x = vCalc(t), rules = vRules(t);
  const fields = proc ? [
    fld("_c", L("สัญญาและงวด", "Contract and phase"), `<div>${esc(tx(v.payee.name))} · <span class="mono">${v.contract}</span> ${vcPh(v) ? tx(vcPh(v).name) : ""} · ${fmt(v.gross, 2)} ${L("บาท", "baht")}</div>`, { wide: true, hint: L("ยอดและผู้รับมาจากสัญญา แก้ที่ Procurement", "The amount and payee come from the contract; change them in Procurement") }),
    fld("penalty", L("หักค่าปรับ (บาท)", "Penalty (baht)"), inp("penalty", "number", { attrs: ' min="0" step="0.01" inputmode="decimal"' })),
    fld("other", L("หักอื่น (บาท)", "Other deductions (baht)"), inp("other", "number", { attrs: ' min="0" step="0.01" inputmode="decimal"' })),
  ] : [
    fld("type", L("ประเภท", "Type"), sel("type", ["service", "utility", "comp", "travel", "refund"].map(k => [k, tx(VT[k].name)])), { req: true }),
    fld("commit", L("วงเงินผูกพัน (ถ้ามี)", "Commitment (if any)"), sel("commit", fcs.map(m => [m.id, `${m.id} · ${tx(m.name)} · ${L("ว่าง", "free")} ${fmt(fcFree(finCommits().find(y => y.id === m.id)))}`]), { blank: L("— ไม่มี ใช้รายการจัดสรร —", "— none, use an allocation line —") })),
    ...(typeof nbLineOptions === "function" && nbLineOptions() ? [fld("nb", L("หรือจ่ายจากเงินนอกงบประมาณ", "Or pay from non-budget money"), `<select id="vcx-nb" name="nb"><option value="">${L("— ไม่ใช้ —", "— not used —")}</option>${nbLineOptions().replace(`value="${f.nb}"`, `value="${f.nb}" selected`)}</select>`)] : []),
    ...(f.nb || f.commit ? [] : [fld("line", L("รายการจัดสรร", "Allocation line"), sel("line", famLines().filter(l => l.type === "ope" || l.type === "inv").map(l => [l.id, `${lineLabel(l)} · ${L("ว่าง", "free")} ${fmt(famHeadroom(l.id))}`])), { req: true, wide: true })]),
    fld("desc", L("รายการ", "Description"), inp("desc", "text"), { req: true, wide: true }),
    fld("vendor", L("เลือกจากทะเบียนผู้ขาย", "Pick from the supplier register"), sel("vendor", (S.vendors || []).map(x => [x.id, tx(x.name)]), { blank: L("— พิมพ์ผู้รับเองด้านล่าง —", "— type the payee below —") }), { hint: L("ผู้ขายจากทะเบียนได้รับการเตือน 30 วันหลังแก้บัญชี (SG-F03)", "A registered supplier gets the 30-day bank-change warning (SG-F03)") }),
    fld("payee", L("ผู้รับเงิน", "Payee"), inp("payee", "text"), { req: true }),
    fld("kind", L("ประเภทผู้รับ", "Payee type"), sel("kind", Object.keys(PAYEE_K).map(k => [k, tx(PAYEE_K[k])]))),
    fld("tax", L("เลขผู้เสียภาษี", "Tax ID"), inp("tax", "text", { attrs: ' inputmode="numeric" maxlength="13"' })),
    fld("gross", L("ยอดรวม (บาท)", "Gross (baht)"), inp("gross", "number", { attrs: ' min="0" step="0.01" inputmode="decimal"' }), { req: true }),
    chk("vat", L("ยอดรวม VAT", "Amount includes VAT")), chk("contrib", L("มีเงินสมทบจากผู้อื่น (สาธารณูปโภค ข้อ 29 (1))", "Others contribute (utilities, clause 29 (1))")),
  ];
  fields.push(fld("due", proc ? L("ส่งขอเบิกภายใน", "Send by") : L("ครบกำหนดจ่าย", "Due"), inp("due", "date"), { req: true }),
    fld("method", L("วิธีจ่าย", "Method"), sel("method", Object.keys(METHOD).map(k => [k, tx(METHOD[k])]))),
    ...(f.method !== "epay" ? [fld("mwhy", L("เหตุผลที่ไม่ใช้ e-Payment (ข้อ 52)", "Why not e-Payment (clause 52)"), inp("mwhy", "text"), { req: true, wide: true })] : []));
  const top = errs.filter(e => !e.f);
  return `<section class="panel" id="vc-detail"><header><h2>${v ? `${L("แก้ไข", "Edit")} <span class="mono">${v.id}</span>` : L("ใบขอเบิกใหม่", "New voucher")}</h2><span class="sp"></span>${v ? vTag(v) : ""}<button class="btn ghost" type="button" id="vc-close">${L("ปิด", "Close")}</button></header>
    <div class="body"><form class="cr-form" id="vc-form" novalidate>
      ${top.length ? `<div class="cr-errsum" role="alert">${top.map(e => `<div>${esc(e.m)}</div>`).join("")}</div>` : errs.length ? `<div class="cr-errsum" role="alert">${L("แก้ช่องที่มีข้อผิดพลาดก่อนบันทึก", "Fix the fields marked below before saving")}</div>` : ""}
      <div class="cr-grid">${fields.join("")}</div>
      <div class="callout" style="margin:10px 0"><b>${L("ตรวจสด", "Live check")} · ${L("จ่ายสุทธิ", "net")} ${fmt(x.net, 2)} ${L("บาท", "baht")}</b>${rules.map(r => `<div style="margin:2px 0">${dotI(r.ok ? "ok" : r.warn ? "warn" : "bad")}<span class="mono">${r.id}</span> ${esc(r.text)}</div>`).join("")}</div>
      <div class="cr-acts"><button class="btn primary" type="submit">${v ? L("บันทึก", "Save") : L("สร้างใบขอเบิก", "Create voucher")}</button><button class="btn ghost" type="button" data-vcx>${L("ยกเลิก", "Cancel")}</button></div>
      ${v ? "" : `<p class="sub" style="margin:8px 0 0">${L("เงินเดือนและค่าจ้างประจำมาจากไฟล์ระบบบุคลากร ไม่ทำใบขอเบิกใน Fisko (ประเด็น D-FN-03)", "Salaries and regular wages come as a file from the HR system; no voucher in Fisko (decision D-FN-03)")}</p>`}
    </form></div></section>`;
}

// The open voucher (or the form) shows in the side panel of whichever Payments tab is open.
FS.vcDetail = () => { if (typeof CR_OPEN !== "undefined" && CR_OPEN) return ""; if (VC_EDIT) return vcForm(); const open = VC_OPEN && vcOf(VC_OPEN); return open ? vcDetail(open) : ""; };
FS.vcAccepted = () => {
  const maker = ROLE === "fin", acc = famAcceptedUnpaid(), c = fcfg();
  return `
  ${maker && acc.length ? `<section class="panel"><header><h2>${L("งวดที่ตรวจรับแล้ว รอทำใบขอเบิก", "Accepted phases waiting for a voucher")}</h2><span class="sp"></span><span class="sub">${L("ต้องส่งขอเบิกเข้า GFMIS ภายใน", "Must reach GFMIS within")} ${c.reqDays} ${L("วันทำการหลังตรวจรับ (ข้อ 28)", "working days of acceptance (clause 28)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา / งวด", "Contract / phase")}</th><th class="n">${L("ยอดงวด (บาท)", "Phase (baht)")}</th><th>${L("ตรวจรับ", "Accepted")}</th><th>${L("ครบกำหนด", "Due")}</th><th>${L("ประตู R-11", "Gate R-11")}</th><th></th></tr></thead>
      <tbody>${acc.map(({ c: k, ph }) => { const g = payGate(k, ph); return `<tr><td><span class="mono">${k.id}</span> ${tx(ph.name)}<div class="sub">${esc(tx(k.vendor))}</div></td><td class="n">${fmt(ph.amount)}</td><td class="sub">${fdate(accDate(ph))}</td><td>${dotI(clockDot(reqDue(ph)))}${clockTxt(reqDue(ph))}</td>
        <td>${g.ok ? tag(L("ผ่าน", "Passed"), "p-ok") : `${tag(L("ไม่ผ่าน", "Not passed"), "p-bad")}<div class="sub">${g.checks.filter(x => !x.ok).map(x => esc(x.label)).join(" · ")}</div>`}</td>
        <td><button class="btn ${g.ok ? "primary" : ""}" type="button" data-vcmk="${k.id}|${ph.n}">${L("ทำใบขอเบิก", "Make voucher")}</button></td></tr>`; }).join("")}</tbody></table></div></section>` : ""}`;
};
// The voucher list (FR-FC-07, UI-F10): status groups, search, type and route filters, cancelled and rejected
// hidden unless asked for, sortable number, net and due.
const VC_GROUPS = { open: ["draft", "returned", "check", "approve"], gf: ["ready", "nbready", "posted"], paid: ["paid"], all: null };
const VC_GONE = ["cancelled", "rejected"];
const VC_Q = { q: "", type: "", route: "", show: false, sort: null };
FS.vouchers = () => {
  const V = S.vouchers || [], maker = ROLE === "fin", groups = VC_GROUPS, Q = VC_Q;
  const GL = { open: L("กำลังดำเนินการ", "In progress"), gf: L("อยู่กับ GFMIS", "With GFMIS"), paid: L("จ่ายแล้ว", "Paid"), all: L("ทั้งหมด", "All") };
  const inGroup = (v, k) => (groups[k] ? groups[k].includes(v.state) : Q.show || !VC_GONE.includes(v.state));
  let list = V.filter(v => inGroup(v, VC_F));
  const goneN = VC_F === "all" ? V.filter(v => VC_GONE.includes(v.state)).length : 0;
  if (Q.type) list = list.filter(v => v.type === Q.type);
  if (Q.route) list = list.filter(v => vRoute(v).r === Q.route);
  if (Q.q) { const q = Q.q.toLowerCase(); list = list.filter(v => `${v.id} ${tx(v.payee.name)} ${tx(v.desc)} ${v.commit || ""} ${v.contract || ""}`.toLowerCase().includes(q)); }
  const key = { id: v => v.id, net: v => vCalc(v).net, due: v => v.due || "9999" };
  list = Q.sort ? list.slice().sort((a, b) => { const x = key[Q.sort.k](a), y = key[Q.sort.k](b); return (x < y ? -1 : x > y ? 1 : 0) * Q.sort.d; }) : list.slice().reverse();
  const th = (k, label, n) => { const on = Q.sort && Q.sort.k === k; return `<th${n ? ' class="n"' : ""} aria-sort="${on ? (Q.sort.d > 0 ? "ascending" : "descending") : "none"}"><button class="cr-sort" type="button" data-vcsort="${k}">${label}<span aria-hidden="true">${on ? (Q.sort.d > 0 ? " ▲" : " ▼") : " ↕"}</span></button></th>`; };
  return `
  <section class="panel cr-list"><header><h2>${L("ใบขอเบิก", "Vouchers")}</h2><span class="sp"></span>
    ${segBar(Object.keys(groups).map(k => [k, `${GL[k]} (${V.filter(v => inGroup(v, k)).length})`]), VC_F, "vcf")}</header>
    <div class="cr-bar">
      <input type="search" class="cr-q" id="vcq" data-vcq value="${esc(Q.q)}" placeholder="${L("ค้นหาเลขที่ ผู้รับ หรือรายการ", "Search number, payee or item")}" aria-label="${L("ค้นหาใบขอเบิก", "Search vouchers")}">
      <select data-vcqf="type" aria-label="${L("ประเภท", "Type")}"><option value="">${L("ประเภท: ทั้งหมด", "Type: all")}</option>${Object.keys(VT).map(k => `<option value="${k}" ${Q.type === k ? "selected" : ""}>${esc(tx(VT[k].name))}</option>`).join("")}</select>
      <select data-vcqf="route" aria-label="${L("ทางจ่าย", "Route")}"><option value="">${L("ทางจ่าย: ทั้งหมด", "Route: all")}</option>${Object.keys(ROUTE).map(k => `<option value="${k}" ${Q.route === k ? "selected" : ""}>${esc(tx(ROUTE[k]))}</option>`).join("")}</select>
      ${goneN ? `<label class="field-inline" for="vcq-show"><input type="checkbox" id="vcq-show" data-vcqf="show" ${Q.show ? "checked" : ""}> ${L("แสดงที่ยกเลิกและไม่อนุมัติ", "Show cancelled and rejected")} (${goneN})</label>` : ""}
      <span class="sp"></span><span class="sub">${list.length} ${L("ใบ", "vouchers")}</span>
      ${maker ? `<button class="btn primary" type="button" id="vc-new">+ ${L("ใบขอเบิกอื่น", "Other voucher")}</button>` : ""}</div>
    <div class="tbl-wrap"><table class="cr-tbl"><thead><tr>${th("id", L("เลขที่", "No."))}<th>${L("ประเภท / ผู้รับเงิน", "Type / payee")}</th>${th("net", L("จ่ายสุทธิ (บาท)", "Net (baht)"), true)}<th>${L("ทางจ่าย", "Route")}</th>${th("due", L("นาฬิกา", "Clock"))}<th>${L("สถานะ", "Status")}</th></tr></thead>
      <tbody>${list.map(v => `<tr class="click ${VC_GONE.includes(v.state) ? "cr-gone" : ""} ${VC_OPEN === v.id ? "cr-on" : ""}" data-vcopen="${v.id}" tabindex="0" aria-label="${L("เปิด", "Open")} ${v.id}"><td class="mono">${v.id}</td><td>${esc(tx(v.payee.name))}<div class="sub">${tx(VT[v.type].name)} · ${esc(tx(v.desc))}</div></td><td class="n">${fmt(vCalc(v).net, 2)}</td><td class="sub">${tx(ROUTE[vRoute(v).r])}</td>
        <td>${v.due && !["paid", ...VC_GONE].includes(v.state) ? `${dotI(clockDot(v.due))}<span class="sub">${clockTxt(v.due)}</span>` : "—"}</td><td>${vTag(v)}</td></tr>`).join("")
        || `<tr><td colspan="6" class="sub">${Q.q || Q.type || Q.route ? L("ไม่พบใบขอเบิกที่ตรงกับตัวกรอง", "No vouchers match the filters") : L("ไม่มีใบขอเบิกในกลุ่มนี้", "No vouchers in this group")}</td></tr>`}</tbody></table></div></section>`;
};
// GFMIS files, e-Payment batches and the daily payment check are shared lists in 85-fin-pay-crud.js (round FC3).

// ---------- supplier bank-account changes (FR-FN-17) ----------
const BANKS = ["ธนาคารกรุงไทย", "ธนาคารออมสิน", "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", "ธนาคารกรุงเทพ", "ธนาคารกสิกรไทย"];
const maskAcct = a => (a ? `xxx-x-x${String(a).slice(-4, -1)}-${String(a).slice(-1)}` : "—");
// The register itself is a shared list (84-fin-crud.js, Finance CRUD FR-FC-45).

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
// Every step of a voucher after it is made. Actions that need a reason get it from the drawer's reason box and
// return an error text instead of acting when it is missing (the box shows it).
function vcAct(v, a, why0) {
  const why = String(why0 || "").trim(), done = (msg, roles, text) => { if (roles) notify(roles, text, "fnc-pay"); commit(); renderShell(); route(); toast(msg); };
  if (["return", "reject", "cancel", "hcancel", "recall"].includes(a) && why.length < CR_WHY_MIN) return L(`ใส่เหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร`, `Give a reason of at least ${CR_WHY_MIN} characters`);
  if (a === "edit") { VC_EDIT = v.id; VC_DRAFT = null; VC_ERR = []; VC_DIRTY = false; route(); const f = $("#vc-form input, #vc-form select"); if (f) f.focus(); return; }
  if (a === "submit") {
    if (!vRules(v).every(r => r.ok || r.warn)) { toast(L("ยังมีกฎที่ไม่ผ่าน ดูหัวข้อ กฎ", "A rule is not met; see Rules")); return; }
    v.state = "check"; vLog(v, ["ส่งตรวจ", "Sent for checking"]); audit(["ส่งใบขอเบิกให้ตรวจ", "Sent a voucher for checking"], v.id);
    return done(L("ส่งตรวจแล้ว", "Sent for checking"), ["finhead"], [`ใบขอเบิก ${v.id} รอตรวจหลักฐาน`, `Voucher ${v.id} is waiting for an evidence check`]);
  }
  // FR-FC-10: the maker takes a voucher back from checking or approval; whoever checked or approved it starts again (FC-P2).
  if (a === "recall") {
    if (!vcIsMaker(v) || !["check", "approve"].includes(v.state)) return;
    const was = v.state; v.state = "draft"; v.checker = null; v.approver = null;
    vLog(v, ["ดึงกลับมาแก้ไข", "Recalled to edit"], why); audit(["ดึงใบขอเบิกกลับมาแก้ไข", "Recalled a voucher"], `${v.id} · ${why}`);
    return done(L("ดึงกลับเป็นร่างแล้ว", "Back to draft"), was === "check" ? ["finhead"] : ["finhead", "exec"], [`ใบขอเบิก ${v.id} ถูกดึงกลับไปแก้ไข: ${why}`, `Voucher ${v.id} was recalled to edit: ${why}`]);
  }
  if (a === "checked") {
    if (!sodCheck("P-F05", [me().id], [v.maker], v.id)) return;
    if (!vReady(v)) { toast(L("หลักฐานหรือกฎยังไม่ครบ", "Evidence or rules are not complete")); return; }
    v.state = "approve"; v.checker = me().id; vLog(v, ["ตรวจผ่าน ส่งอนุมัติ", "Checked and sent for approval"]); audit(["ตรวจใบขอเบิกผ่าน", "Checked a voucher"], v.id);
    const need = vcNeedAuth(vCalc(v).spend);
    return done(L("ส่งให้ผู้มีอำนาจอนุมัติแล้ว", "Sent to the approver"), need && need.role === "finhead" ? ["exec", "finhead"] : ["exec"], [`ใบขอเบิก ${v.id} ${fmt(vCalc(v).net, 2)} บาท รออนุมัติจ่าย`, `Voucher ${v.id} (${fmt(vCalc(v).net, 2)} baht) is waiting for approval`]);
  }
  // Returned from checking or from approval; the third return is reported to the finance head.
  if (a === "return") {
    v.state = "returned"; v.checker = null; v.returns = (v.returns || 0) + 1;
    vLog(v, ["ส่งกลับแก้ไข", "Returned"], why); audit(["ส่งใบขอเบิกกลับแก้ไข", "Returned a voucher"], `${v.id} · ${why}`);
    if (v.returns >= 3) notify(["finhead"], [`ใบขอเบิก ${v.id} ถูกส่งกลับครั้งที่ ${v.returns}`, `Voucher ${v.id} has been returned ${v.returns} times`], "fnc-pay");
    return done(L("ส่งกลับแล้ว", "Returned"), ["fin"], [`ใบขอเบิก ${v.id} ถูกส่งกลับ: ${why}`, `Voucher ${v.id} was returned: ${why}`]);
  }
  // FR-FC-12: not approved is final.
  if (a === "reject") {
    v.state = "rejected"; v.rejected = { by: me().id, t: nowIso(), why };
    vLog(v, ["ไม่อนุมัติ", "Rejected"], why); audit(["ไม่อนุมัติใบขอเบิก", "Rejected a voucher"], `${v.id} · ${why}`);
    return done(L("บันทึกไม่อนุมัติแล้ว", "Rejected"), ["fin", "finhead"], [`ใบขอเบิก ${v.id} ไม่ได้รับอนุมัติ: ${why}`, `Voucher ${v.id} was not approved: ${why}`]);
  }
  // FR-FC-11: the maker cancels a draft or returned voucher; the finance head cancels one up to "ready" before a GFMIS file.
  if (a === "cancel" || a === "hcancel") {
    const okState = a === "cancel" ? vcIsMaker(v) && ["draft", "returned"].includes(v.state) : ROLE === "finhead" && (["check", "approve", "nbready"].includes(v.state) || (v.state === "ready" && !v.gfFile));
    if (!okState) return;
    const p = vcPay(v); if (p) { p.status = "cancelled"; p.cancelled = { by: me().id, t: nowIso(), why }; v.pay = null; }
    const adv = (S.advances || []).find(y => y.topup === v.id); if (adv) { adv.topup = null; advLog(adv, ["ยกเลิกใบขอเบิกจ่ายเพิ่ม", "Top-up voucher cancelled"], `${v.id} · ${why}`); }
    v.state = "cancelled"; v.cancelled = { by: me().id, t: nowIso(), why };
    vLog(v, ["ยกเลิก", "Cancelled"], why); audit(["ยกเลิกใบขอเบิก", "Cancelled a voucher"], `${v.id} · ${why}`); VC_OPEN = null;
    return done(L("ยกเลิกแล้ว", "Cancelled"), a === "hcancel" ? ["fin"] : null, [`ใบขอเบิก ${v.id} ถูกยกเลิก: ${why}`, `Voucher ${v.id} was cancelled: ${why}`]);
  }
  if (a === "approve") {
    if (!vcCanApprove(v)) return;
    if (!vRules(v).every(r => r.ok || r.warn)) { toast(L("ยังมีกฎที่ไม่ผ่าน (เช่น วงเงินถูกใช้ไปแล้ว) ดูหัวข้อ กฎ", "A rule is no longer met (for example the amount is used up); see Rules")); return; }
    const head = !canSpend(), actors = head ? [me().id] : sodActors("exec", "spend"), au = head ? { holder: null, via: null } : famAuth(), x = vCalc(v);
    if (!sodCheck("SD-11", actors, [v.maker, v.checker].filter(Boolean), v.id)) return;
    const c = vcCon(v);
    if (c && !sodCheck("SD-04", actors, [...new Set([...c.inspectors, ...phaseSigners(c)])], v.id)) return;
    const row = vcAuth(x.spend, head ? "finhead" : "exec");
    v.state = "ready"; v.approver = { by: me().id, holder: au.holder, via: au.via, t: nowIso(), auth: `${row.id} ${tx(row.pos)}` };
    if (c) { const p = { id: nextId("PY", S.payreqs), contract: c.id, phase: v.phase, amount: x.spend, by: v.maker, status: "approved", t: v.t, decided: { by: me().id, holder: au.holder, via: au.via, t: nowIso() }, recon: null, voucher: v.id }; S.payreqs.push(p); v.pay = p.id; }
    const via = head ? "" : onBehalf("exec", "spend");
    vLog(v, ["อนุมัติจ่าย", "Approved"], `${row.id}${via ? " " + via.replace(/^ · /, "") : ""}`); audit(["อนุมัติจ่ายตามใบขอเบิก", "Approved a voucher"], `${v.id} · ${fmt(x.net, 2)} · ${row.id}${via}`);
    return done(L("อนุมัติแล้ว · การเงินส่งข้อมูลเข้า GFMIS", "Approved · Finance sends it to GFMIS"), ["fin"], [`ใบขอเบิก ${v.id} อนุมัติแล้ว ส่งเข้า GFMIS`, `Voucher ${v.id} is approved; send it to GFMIS`]);
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
  FIN_BINDS.push(() => {
    const show = id => { VC_OPEN = id; VC_EDIT = null; VC_DRAFT = null; VC_ERR = []; FIN_ASK = null; route(); };
    $$("[data-vcf]").forEach(b => (b.onclick = () => { VC_F = b.dataset.vcf; route(); }));
    $$("[data-vcopen]").forEach(b => (b.onclick = () => show(VC_OPEN === b.dataset.vcopen && !VC_EDIT ? null : b.dataset.vcopen)));
    $$("[data-vcsort]").forEach(b => (b.onclick = () => { const k = b.dataset.vcsort, s = VC_Q.sort; VC_Q.sort = s && s.k === k ? (s.d > 0 ? { k, d: -1 } : null) : { k, d: 1 }; route(); const x = $(`[data-vcsort="${k}"]`); if (x) x.focus(); }));
    const q = $("#vcq"); if (q) q.oninput = () => { const pos = q.selectionStart; VC_Q.q = q.value; route(); const n = $("#vcq"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
    $$("[data-vcqf]").forEach(el => (el.onchange = () => { VC_Q[el.dataset.vcqf] = el.type === "checkbox" ? el.checked : el.value; route(); }));
    // Closing an edited form asks once (UI-C3); a second close discards it.
    const cl = $("#vc-close");
    if (cl) cl.onclick = () => {
      if (VC_EDIT && VC_DIRTY && !VC_ERR.some(e => e.leave)) { VC_DRAFT = vcRead(); VC_ERR = [{ f: null, leave: true, m: L("ยังไม่ได้บันทึกการแก้ไข กดปิดอีกครั้งเพื่อทิ้ง หรือกดบันทึก", "Your changes aren't saved. Close again to discard them, or save.") }]; route(); return; }
      const back = VC_EDIT && VC_EDIT !== "new" ? VC_EDIT : null; VC_DIRTY = false; show(back);
    };
    const nw = $("#vc-new"); if (nw) nw.onclick = () => { VC_OPEN = null; VC_EDIT = "new"; VC_DRAFT = null; VC_ERR = []; VC_DIRTY = false; FIN_ASK = null; route(); const f = $("#vc-form select"); if (f) f.focus(); };
    $$("[data-vcmk]").forEach(b => (b.onclick = () => { const [cid, n] = b.dataset.vcmk.split("|"); vcMake(cid, Number(n)); }));
    const v = VC_OPEN && vcOf(VC_OPEN);
    if (v && !VC_EDIT) {
      $$("[data-vc]").forEach(b => (b.onclick = () => vcAct(v, b.dataset.vc)));
      $$("[data-vcev]").forEach(cb => (cb.onchange = () => { v.ev = Object.assign({}, v.ev, { [cb.dataset.vcev]: cb.checked }); vLog(v, [cb.checked ? "บันทึกหลักฐาน" : "เอาหลักฐานออก", cb.checked ? "Marked evidence" : "Unmarked evidence"], cb.dataset.vcev); commit(); route(); }));
    }
    const vf = $("#vc-form");
    if (vf) {
      const ed = VC_EDIT !== "new" ? vcOf(VC_EDIT) : null;
      vf.oninput = () => { VC_DIRTY = true; };
      // A changed choice re-renders the form: picking a commitment or a supplier fills the payee, and the live check updates.
      vf.onchange = e => {
        const n = e.target.name, f = vcRead();
        if (n === "commit" && f.commit) { const m = (S.fcommit || []).find(x => x.id === f.commit); if (m) { f.payee = tx(m.vendor); f.desc = f.desc || tx(m.name); f.nb = ""; } }
        if (n === "nb" && f.nb) f.commit = "";
        if (n === "vendor" && f.vendor) { const vd = (S.vendors || []).find(x => x.id === f.vendor); if (vd) { f.payee = tx(vd.name); f.tax = vd.taxId || ""; f.kind = "corp"; } }
        VC_DRAFT = f; VC_DIRTY = true; VC_ERR = VC_ERR.filter(x => !x.leave); route(); const el = $(`#vcx-${n}`); if (el) el.focus();
      };
      vf.onsubmit = e => {
        e.preventDefault();
        const f = vcRead(), r = vcSave(f, ed);
        if (r.errs) { VC_DRAFT = f; VC_ERR = r.errs; route(); const b = $('#vc-form [aria-invalid="true"]') || $(".cr-errsum"); if (b) b.focus(); return; }
        VC_EDIT = null; VC_DRAFT = null; VC_ERR = []; VC_DIRTY = false; VC_OPEN = r.v.id; VC_F = "open";
        commit(); renderShell(); route(); toast(ed ? L("บันทึกแล้ว · กฎตรวจใหม่ตามยอดที่แก้", "Saved · the rules are checked again") : L("สร้างใบขอเบิกแล้ว · ทำเครื่องหมายหลักฐาน แล้วส่งตรวจ", "Voucher created · mark the evidence, then send for checking"));
      };
      const x = $("[data-vcx]"); if (x) x.onclick = () => { const id = ed && ed.id; VC_DIRTY = false; show(id || null); };
    }
  });
}

// ---------- clocks, badges, tasks ----------
{
  const base = finClocks;
  finClocks = function () {
    const out = base(), c = fcfg();
    (S.vouchers || []).forEach(v => {
      if (v.type === "proc" && ["draft", "returned", "check", "approve", "ready"].includes(v.state)) out.push({ due: v.due, title: `${L("ส่งขอเบิกเข้า GFMIS", "Send to GFMIS")} ${v.id}`, sub: `${tx(v.payee.name)} · ${VST[v.state][2]} ${tx(VST[v.state][0])}`, link: "fnc-pay", src: L("ข้อ 28", "cl. 28") });
      else if (v.type !== "proc" && v.due && ["draft", "returned", "check", "approve", "ready"].includes(v.state)) out.push({ due: v.due, title: `${L("ครบกำหนดจ่าย", "Due")} ${v.id}`, sub: `${tx(v.payee.name)} · ${tx(VT[v.type].name)}`, link: "fnc-pay", src: v.type === "utility" ? L("ข้อ 31", "cl. 31") : L("ข้อ 22", "cl. 22") });
      if ((v.state === "posted" || v.state === "nbready") && v.funded) out.push({ due: addWorkdays(v.funded.t.slice(0, 10), c.refundDays), title: `${L("จ่ายต่อหรือส่งคืน", "Pay on or return")} ${v.id}`, sub: tx(v.payee.name), link: "fnc-pay:gfmis", src: L("ข้อ 99", "cl. 99") });
    });
    return out.sort((a, b) => (a.due < b.due ? -1 : 1));
  };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "pay") {
      const V = S.vouchers || [];
      let n = 0;
      if (ROLE === "fin") n = famAcceptedUnpaid().length + V.filter(v => v.state === "returned" || (v.state === "ready" && !v.gfFile)).length;
      if (ROLE === "finhead") n = V.filter(v => v.state === "check" || (v.state === "approve" && v.checker !== me().id && vcCanApprove(v))).length + V.filter(v => v.state === "paid" && !v.dayCheck).length;
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
      if (V.some(v => v.state === "ready" && !v.gfFile)) R(L("ส่งใบขอเบิกที่อนุมัติแล้วเข้า GFMIS", "Send approved vouchers to GFMIS"), `${V.filter(v => v.state === "ready" && !v.gfFile).length} ${L("ใบ", "vouchers")}`, TODAY, "fnc-pay:gfmis", "p-warn");
    }
    if (ROLE === "finhead") {
      V.filter(v => v.state === "approve" && v.checker !== me().id && vcCanApprove(v)).forEach(v => R(`${L("อนุมัติจ่าย (A3)", "Approve payment (A3)")} ${v.id}`, `${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)}`, v.due || TODAY, "fnc-pay", "p-warn"));
      V.filter(v => v.state === "check").forEach(v => R(`${L("ตรวจหลักฐานใบขอเบิก", "Check voucher evidence")} ${v.id}`, `${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)}`, v.due || TODAY, "fnc-pay", "p-info"));
      (S.vendorChanges || []).filter(x => x.status === "pending").forEach(x => R(`${L("ยืนยันการแก้บัญชีผู้ขาย", "Confirm a supplier bank change")} ${x.id}`, "", TODAY, "fnc-reg:vendors", "p-warn"));
      if (V.some(v => v.state === "paid" && !v.dayCheck)) R(L("ตรวจการจ่ายประจำวัน (ข้อ 43)", "Daily payment check (clause 43)"), `${V.filter(v => v.state === "paid" && !v.dayCheck).length} ${L("รายการ", "payments")}`, TODAY, "fnc-pay:check", "p-warn");
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
    base({ id: `VC-2570-001`, type: "proc", contract: c0.id, phase: ph0.n, line: c0.line, desc: [`${c0.id} งวดที่ 1`, `${c0.id} phase 1`], payee: { name: c0.vendor, kind: "corp", taxId: vd0 ? vd0.taxId : "", vendor: vd0 ? vd0.id : null },
      gross: ph0.amount, vat: true, due: "2026-10-21", state: "paid", checker: FH, approver: ap("2026-10-15T10:00"), pay: p0.id, t: "2026-10-14T15:00", gf: { doc: "GF-70-000417", t: "2026-10-15T14:00", file: `GO-2570-01` }, paid: { t: "2026-10-16T09:00", ref: "CGD-000417" }, dayCheck: { t: "2026-10-16T16:30", by: FH } }),
    base({ id: `VC-2570-002`, type: "utility", commit: m1.id, line: m1.line, desc: ["ค่าไฟฟ้า เดือนกันยายน 2569", "Electricity, September 2026"], payee: { name: m1.vendor, kind: "gov", taxId: "" }, gross: 150000, due: "2026-10-15", ev: { bill: true }, state: "paid", checker: FH, approver: ap("2026-10-08T11:00"), t: "2026-10-05T10:00", gf: { doc: "3600000391", t: "2026-10-09T10:00", file: `GO-2570-01` }, paid: { t: "2026-10-12T10:00", ref: "CGD-000391" }, dayCheck: { t: "2026-10-12T16:00", by: FH } }),
    base({ id: `VC-2570-003`, type: "service", commit: m3.id, line: m3.line, desc: ["บำรุงรักษาระบบ ไตรมาส 1", "System maintenance, quarter 1"], payee: { name: m3.vendor, kind: "corp", taxId: vd0 ? vd0.taxId : "", vendor: vd0 ? vd0.id : null }, gross: 300000, vat: true, due: "2026-10-15", ev: { inv: true, acc: true }, state: "paid", checker: FH, approver: ap("2026-10-09T11:00"), t: "2026-10-06T10:00", gf: { doc: "3600000398", t: "2026-10-10T10:00", file: `GO-2570-01` }, paid: { t: "2026-10-14T10:00", ref: "CGD-000398" }, cert: { no: `WHT-2570-0001`, t: "2026-10-14T10:00", sent: null } }),
    base({ id: `VC-2570-004`, type: "comp", line: m1.line, desc: ["ค่าตอบแทนวิทยากร อบรมการจัดทำงบประมาณ", "Speaker fees, budget preparation training"], payee: { name: ["นางสาวตัวอย่าง วิทยากร", "Ms Tuayang Witthayakon"], kind: "person", taxId: "" }, gross: 12000, due: "2026-10-23", ev: { order: true, sign: true }, state: "approve", checker: FH, t: "2026-10-15T09:00" }),
    base({ id: `VC-2570-005`, type: "service", commit: m2.id, line: m2.line, desc: ["ค่าเช่าอาคารสาขา เดือนตุลาคม 2569", "Branch rent, October 2026"], payee: { name: m2.vendor, kind: "corp", taxId: "" }, gross: 80000, vat: true, due: "2026-10-30", ev: { inv: true, acc: true }, state: "check", t: "2026-10-16T09:30" }),
    base({ id: `VC-2570-006`, type: "utility", line: m1.line, desc: ["ค่าน้ำประปา เดือนกันยายน 2569", "Water, September 2026"], payee: { name: ["การประปานครหลวง", "Metropolitan Waterworks Authority"], kind: "gov", taxId: "" }, gross: 18500, due: "2026-11-15", state: "draft", t: "2026-10-16T10:00" }),
  ];
  s.vouchers.forEach(v => v.log.push({ t: v.t, by: FN, role: "fin", act: ["สร้างใบขอเบิก", "Created"], note: "" }));
  p0.voucher = `VC-2570-001`;
  s.whtSeq = 1; s.gfSeq = 3600000400;
  m3.paid = 300000; m1.paid = 150000;
  s.gfOut = [{ id: `GO-2570-01`, t: "2026-10-09T09:00", by: FN, rows: [`VC-2570-002`, `VC-2570-003`, `VC-2570-001`], state: "posted", posted: "2026-10-15T14:00" }];
  s.epay = []; s.payChecks = [{ t: "2026-10-16T16:30", by: FH, ids: [`VC-2570-001`] }];
  s.vendorChanges = [];
  ["P-F05", "SD-11", "SD-14"].forEach(id => { if (!s.sod.rules.some(r => r.id === id)) s.sod.rules.push({ id, on: true }); });
}
