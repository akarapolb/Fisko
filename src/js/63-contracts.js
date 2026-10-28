// Fisko Procurement round 14 (P2 of the detailed design): contract guarantee, delivery notice and acceptance
// timing (R-10), penalties (R-09), contract variations by approval ladder with versions (R-08, SD-08),
// the three-way payment gate before Fisko Finance (R-11) and closing the case (R-12).
// All rates, ladders and day counts are settings in S.pcfg (M10 → Procurement rules), not fixed numbers.
const utcDay = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((utcDay(b) - utcDay(a)) / 864e5);
// Extra sections and binders for the contract panel, added by later rounds (63b-contract-late.js).
const CON_PANELS = [], CON_BINDS = [];
const GUAR_TYPE = { bank: ["หนังสือค้ำประกันธนาคาร", "Bank guarantee"], cash: ["เงินสด", "Cash"], bond: ["พันธบัตรรัฐบาล", "Government bond"] };
const EXT_CODE = { force: ["เหตุสุดวิสัย", "Force majeure"], owner: ["ผู้ว่าจ้างเป็นเหตุ", "Employer's fault"], vendor: ["ผู้ขายเป็นเหตุ", "Supplier's fault"] };
const VAR_ST = { withdrawn: [["ถอน", "Withdrawn"], "p-mute"], pending: [["รออนุมัติ", "Pending"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"] };
const conCase = c => caseByPlan(c.plan);
const phDue = ph => addDays(ph.due, (ph.ext || 0) + (ph.extV || 0));
// Days late for penalty: from the due date plus forgiven extension days (employer's fault or force majeure) to delivery, or to today if not yet delivered.
function phLate(ph) {
  const from = addDays(ph.due, ph.ext || 0), to = ph.delivered || (ph.cancelled && ph.cancelled.date) || TODAY;
  return Math.max(0, dayDiff(from, to));
}
// Late penalty (clause 162 of the 2560 procurement regulation): a daily rate by contract kind on the value not yet
// delivered, and for services and construction at least a minimum amount a day. The rates and the minimum are the
// tenant's procurement settings; data saved before round 66 has only the one rate (penaltyPct) and no minimum.
const PEN_KEY = { goods: "penGoods", service: "penService", construction: "penCons" };
const penKind = c => ((c && c.plan && famPlan(c.plan)) || {}).kind || "goods";
const penRate = c => { const r = S.pcfg[PEN_KEY[penKind(c)] || "penGoods"]; return r != null ? r : S.pcfg.penaltyPct; };
const penMin = c => (penKind(c) === "goods" ? 0 : S.pcfg.penaltyMin || 0);
const penDaily = (c, ph) => Math.max(penMin(c), Math.round(penRate(c) / 100 * ph.amount));
const penRule = c => `${penRate(c)}%${penMin(c) ? ` · ${L("ขั้นต่ำ", "at least")} ${fmt(penMin(c))} ${L("บาท/วัน", "baht a day")}` : ""}`;
const phPenaltyRaw = (c, ph) => { const d = phLate(ph); return d ? penDaily(c, ph) * d : 0; };
const phPenalty = (c, ph) => Math.max(0, phPenaltyRaw(c, ph) - (ph.waive && ph.waive.status === "approved" ? ph.waive.amount : 0));
const conPenalty = c => c.phases.reduce((a, ph) => a + phPenalty(c, ph), 0);
const penaltyWarn = c => conPenalty(c) > S.pcfg.penaltyCapPct / 100 * c.amount;
const acceptDue = (c, ph) => {
  if (!ph.delivered) return null;
  const k = (conCase(c) || {}).kind, last = ph.n === c.phases.length;
  return addWorkdays(ph.delivered, k === "construction" ? (last ? S.pcfg.acceptWdLast : S.pcfg.acceptWd) : 0);
};
const openDissent = ph => (ph.dissent || []).some(d => !d.resolved);
const phPaid = (c, ph) => S.payreqs.some(p => p.contract === c.id && p.phase === ph.n && p.status === "approved");
const phNet = (c, ph) => Math.max(0, (ph.result === "partial" ? ph.okAmount : ph.amount) - phPenalty(c, ph));
function guarSt(c) {
  const g = c.guarantee; if (!g) return "none";
  if (g.status === "returned") return "returned";
  if (g.status === "forfeited") return "forfeited";
  if (g.expires < TODAY) return "expired";
  return dayDiff(TODAY, g.expires) <= S.pcfg.guaranteeWarnDays ? "expiring" : "held";
}
const GUAR_TAG = { none: [["ไม่มีหลักประกัน", "No guarantee"], "p-bad"], held: [["มีผล", "In force"], "p-ok"], expiring: [["ใกล้หมดอายุ", "Expiring"], "p-warn"], expired: [["หมดอายุ", "Expired"], "p-bad"], returned: [["คืนแล้ว", "Returned"], "p-mute"], forfeited: [["ริบแล้ว", "Forfeited"], "p-bad"] };

// ---------- R-11: three-way payment gate ----------
function payGate(c, ph) {
  const inv = ph.invoice, tol = S.pcfg.invoiceTol, ok = (v, th, en) => ({ ok: !!v, label: L(th, en) }), gs = guarSt(c);
  const checks = [
    ok(phaseAccepted(ph) && (ph.result === "ok" || ph.result === "partial") && ph.cert && !openDissent(ph), "คณะกรรมการตรวจรับครบ มีใบตรวจรับ และไม่มีความเห็นแย้งค้าง", "Committee accepted, certificates issued, no open dissent"),
    ok(inv, "มีใบแจ้งหนี้ของงวดนี้", "An invoice is recorded for this phase"),
    ok(inv && inv.contract === c.no && inv.vendor === tx(c.vendor) && Math.abs(inv.amount - (ph.result === "partial" ? ph.okAmount : ph.amount)) <= tol, "ใบแจ้งหนี้ตรงกับสัญญา ผู้ขาย และยอดที่ตรวจรับ", "The invoice matches the contract, supplier and accepted amount"),
    ok(gs === "held" || gs === "expiring" || gs === "returned" && c.phases.every(x => phPaid(c, x) || x.n === ph.n), "หลักประกันสัญญายังมีผล", "The contract guarantee is in force"),
  ];
  const net = phNet(c, ph), released = !!ph.release, pass = checks.every(x => x.ok);
  return { checks, net, penalty: phPenalty(c, ph), rejected: ph.result === "partial" ? ph.amount - ph.okAmount : 0, pass, released, ok: pass || released };
}
const gateBox = (c, ph) => {
  const g = payGate(c, ph);
  return `<div class="callout" style="margin:0"><b>${L("ประตูเบิกจ่าย (R-11)", "Payment gate (R-11)")}</b>
    <ul class="check" style="margin-top:6px">${g.checks.map(x => `<li><span class="m ${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "×"}</span><div>${esc(x.label)}</div></li>`).join("")}</ul>
    <div class="sub" style="margin-top:6px">${L("ยอดที่ขอได้", "Payable")} = ${fmt(ph.result === "partial" ? ph.okAmount : ph.amount)} − ${L("ค่าปรับ", "penalty")} ${fmt(g.penalty)} = <b>${fmt(g.net)}</b> ${L("บาท", "baht")}${g.rejected ? ` · ${L("ส่วนที่ไม่ผ่านตรวจรับ", "not accepted")} ${fmt(g.rejected)}` : ""}</div>
    ${g.noPo ? `<div class="sub">${L("ยังไม่มีเลขที่ใบสั่งซื้อ (PO) ใน GFMIS: บันทึกที่ Fisko Finance → วงเงินผูกพันและใบสั่งซื้อ ข้อนี้ปลดเป็นข้อยกเว้นไม่ได้", "No GFMIS purchase order yet: record it in Fisko Finance → Commitments and POs. This check can't be released as an exception.")}</div>` : g.released ? `<div class="sub">${L("ปลดข้อยกเว้นโดย", "Exception released by")} ${esc(userName(ph.release.by))}: ${esc(ph.release.reason)}</div>` : !g.pass ? `<div class="sub">${L("ไม่ผ่านประตู: การเงินส่งคำขอไม่ได้ ระบบจะพักเป็นข้อยกเว้นให้หัวหน้าพัสดุหรือผู้บริหารปลด", "The gate is not passed: Finance can't send the request. It is held as an exception for the head of procurement or the executive to release.")}</div>` : ""}</div>`;
};

// ---------- the contract panel ----------
const canVary = () => isProcRole();
// The ladder is cumulative: approved changes of the same kind add up, so a series of small changes still reaches the executive.
const varCum = (c, v) => { const done = (c.vars || []).filter(x => x !== v && x.status === "approved" && x.kind === v.kind); return v.kind === "time" ? sumv(done.map(x => x.days)) + v.days : sumv(done.map(x => Math.abs(x.delta))) + Math.abs(v.delta); };
const varWho = (c, v) => (v.kind === "time" ? (varCum(c, v) <= S.pcfg.extDaysHead ? "prochead" : "exec") : (varCum(c, v) / c.base <= S.pcfg.ladderPct / 100 ? "prochead" : "exec"));
const canDecideVar = v => (v.who === "exec" ? canSpend() : ROLE === "prochead");
function conPanel(c, part) {
  const l = famLine(c.line), locked = phaseSigners(c).length > 0, me_ = me().id, people = famPeople().filter(u => u.id !== me_), isProc = isProcRole(), cs = conCase(c);
  const gs = guarSt(c), pen = conPenalty(c), vars = c.vars || [], head = ROLE === "prochead" || canSpend();
  const prevOk = ph => ph.n === 1 || phaseAccepted(c.phases[ph.n - 2]);
  // Round 45: named parts, so the contract detail can show them as tabs; with no part it is the full panel as before.
  const P = {
    head: () => `<header><h2><span class="mono">${c.id}</span> · ${esc(tx(famPlan(c.plan).name))}</h2><span class="sp"></span>${historyBtn(c.id, c.id)}${(c.ver || 1) > 1 ? tag(`${L("ฉบับที่", "Version")} ${c.ver}`, "p-info") : ""}${pen ? tag(`${L("ค่าปรับสะสม", "Penalty")} ${fmt(pen)}`, penaltyWarn(c) ? "p-bad" : "p-warn") : ""}${tag(`${L("วงเงินสัญญา", "Contract")} ${mb(c.amount)} ${L("ลบ.", "M")}`, "p-info")}</header>
    ${phaseTrack(c)}
    <div class="body row"><span>${esc(tx(c.vendor))}</span><span class="sub">·</span><span class="mono sub">${esc(c.no)}</span><span class="sub">·</span><span class="sub">${L("ลงนาม", "Signed")} ${fdate(c.signed)}</span><span class="sub">·</span><span class="sub">${esc(lineLabel(l))}</span>${typeof conPoTag === "function" ? conPoTag(c) : ""}
      ${famPlan(c.plan).egp ? `<span class="sub">·</span><span class="sub mono">${famPlan(c.plan).egp.no}</span>` : ""}${cs ? `<span class="sub">·</span><button class="btn ghost" type="button" data-copen2="${cs.id}">${cs.id}</button>` : ""}</div>
    <div class="body" style="padding-top:0"><span class="sub">${L("คณะกรรมการตรวจรับ", "Acceptance committee")}:</span> ${c.inspectors.map(id => esc(userName(id))).join(", ")}
      ${isProc ? (locked ? `<span class="sub"> · ${L("เปลี่ยนกรรมการไม่ได้หลังมีการลงนามตรวจรับ", "can't change after a signature")}</span>` : `<details style="margin-top:8px"><summary class="sub" style="cursor:pointer">${L("เปลี่ยนกรรมการ", "Change committee")}</summary>
        <div class="row" style="margin-top:6px">${people.map(u => `<label class="field-inline"><input type="checkbox" name="cc-${c.id}" value="${u.id}" ${c.inspectors.includes(u.id) ? "checked" : ""}> ${esc(tx(u.name))}</label>`).join("")}<button class="btn" type="button" data-ccsave="${c.id}">${L("บันทึก", "Save")}</button></div></details>`) : ""}</div>`,
    guar: () => `
    <div class="body" style="padding-top:0"><div class="row"><b style="font-weight:600">${L("หลักประกันสัญญา", "Guarantee")}</b> ${tag(tx(GUAR_TAG[gs][0]), GUAR_TAG[gs][1])}
      ${c.guarantee ? `<span class="sub">${tx(GUAR_TYPE[c.guarantee.type])}${c.guarantee.ref ? ` · <span class="mono">${esc(c.guarantee.ref)}</span>` : ""} · ${fmt(c.guarantee.amount)} ${L("บาท", "baht")} · ${L("หมดอายุ", "expires")} ${fdate(c.guarantee.expires)}${(c.guarantee.ext || []).length ? ` · ${L("ต่ออายุ", "extended")} ${c.guarantee.ext.length}` : ""}</span>` : ""}
      ${isProc && c.guarantee && !["returned", "forfeited"].includes(c.guarantee.status) && conLive(c) ? `<span class="row" style="display:inline-flex"><input type="date" id="gx-${c.id}" min="${addDays(c.guarantee.expires, 1)}" value="${addDays(c.guarantee.expires, 90)}" aria-label="${L("วันหมดอายุใหม่", "New expiry date")}"><button class="btn ghost" type="button" data-gext="${c.id}">${L("ต่ออายุ", "Extend")}</button></span>` : ""}
      ${isProc && c.guarantee && c.guarantee.status === "held" && canReturnGuar(c) ? `<button class="btn" type="button" data-gret="${c.id}">${L("บันทึกการคืนหลักประกัน", "Record the return")}</button>` : ""}</div>
      ${isProc && !c.guarantee ? `<form class="inline-form" data-gform="${c.id}" style="margin-top:6px"><div class="f" style="flex:0 1 190px"><label>${L("ชนิด", "Type")}</label><select name="type">${Object.keys(GUAR_TYPE).map(k => `<option value="${k}">${tx(GUAR_TYPE[k])}</option>`).join("")}</select></div>
        <div class="f" style="flex:0 1 170px"><label>${L("เลขที่หนังสือหรือเอกสาร", "Document no.")}</label><input type="text" name="ref"></div>
        <div class="f" style="flex:0 1 150px"><label>${L("วงเงิน (บาท)", "Amount (baht)")}</label><input type="number" name="amt" min="1" step="1" value="${Math.round(c.amount * S.pcfg.guaranteePct / 100)}" required></div>
        <div class="f" style="flex:0 1 170px"><label>${L("หมดอายุ", "Expires")}</label><input type="date" name="exp" value="${addDays(c.phases[c.phases.length - 1].due, 90)}" required></div><button class="btn ghost" type="button" data-gsim="${c.id}">${L("จำลอง", "Simulate")}</button><button class="btn" type="submit">${L("บันทึกหลักประกัน", "Record the guarantee")}</button></form>` : ""}</div>`,
    phases: () => `
    <div class="tbl-wrap"><table><thead><tr><th>${L("งวด", "Phase")}</th><th>${L("กำหนดส่งมอบ", "Due")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th>${L("ส่งมอบและค่าปรับ", "Delivery and penalty")}</th><th>${L("ตรวจรับ", "Acceptance")}</th><th>${L("ใบแจ้งหนี้และเบิกจ่าย", "Invoice and payment")}</th></tr></thead>
      <tbody>${c.phases.map(ph => { const pay = S.payreqs.find(p => p.contract === c.id && p.phase === ph.n && p.status !== "rejected"), acc = phaseAccepted(ph), late = phLate(ph), pn = phPenalty(c, ph), ad = acceptDue(c, ph), od = openDissent(ph);
        const mySign = c.inspectors.includes(me_) && !acc && prevOk(ph) && !ph.signs.some(s => s.by === me_) && ph.delivered && !od && !ph.cancelled;
        return `<tr><td>${tx(ph.name)}${ph.cancelled ? ` ${tag(L("ยกเลิกจากการบอกเลิก", "Cancelled by termination"), "p-mute")}` : ""}</td>
          <td>${fdate(phDue(ph))}${(ph.ext || 0) + (ph.extV || 0) ? `<div class="sub">${L("เดิม", "was")} ${fdate(ph.due)} · +${(ph.ext || 0) + (ph.extV || 0)} ${L("วัน", "d")}</div>` : ""}${!ph.delivered && !acc && phDue(ph) < TODAY ? ` ${tag(L("เลยกำหนด", "Overdue"), "p-bad")}` : ""}</td><td class="n">${mb(ph.amount)}</td>
          <td>${ph.delivered ? `${L("ส่งมอบ", "Delivered")} ${fdate(ph.delivered)}${ph.dRef ? ` · <span class="mono sub">${esc(ph.dRef)}</span>` : ""}` : `<span class="sub">${L("ยังไม่แจ้งส่งมอบ", "No delivery notice")}</span>`}
            ${late ? `<div>${tag(`${late} ${L("วันล่าช้า", "days late")} · ${L("ค่าปรับ", "penalty")} ${fmt(pn)}`, "p-warn")}</div>` : ""}
            ${isProc && !ph.delivered && !acc && prevOk(ph) && !ph.cancelled ? `<form class="inline-form" data-dlform="${c.id}|${ph.n}" style="margin-top:6px"><div class="f" style="flex:0 1 150px"><input type="date" name="d" value="${TODAY}" aria-label="${L("วันส่งมอบ", "Delivery date")}" required></div><div class="f" style="flex:1 1 130px"><input type="text" name="ref" placeholder="${L("เลขที่หนังสือส่งมอบ", "Delivery notice no.")}" aria-label="${L("เลขที่หนังสือส่งมอบ", "Delivery notice no.")}"></div><button class="btn ghost" type="button" data-dlsim="${c.id}|${ph.n}">${L("จำลอง", "Simulate")}</button><button class="btn" type="submit">${L("บันทึกแจ้งส่งมอบ", "Record delivery")}</button></form>` : ""}</td>
          <td>${phaseSignText(c, ph)}${!acc && ph.signs.some(s => s.by === me_) ? ` <button class="btn ghost" type="button" data-sgwd="${c.id}|${ph.n}">${L("ถอนลายมือชื่อ", "Withdraw my signature")}</button>` : ""} ${acc ? tag(ph.result === "partial" ? L("รับบางส่วน", "Partly accepted") : L("ตรวจรับแล้ว", "Accepted"), ph.result === "partial" ? "p-warn" : "p-ok") : ""}
            ${ph.result === "partial" ? `<div class="sub">${L("รับ", "accepted")} ${fmt(ph.okAmount)} ${L("บาท", "baht")}</div>` : ""}${ad ? `<div class="sub">${L("ตรวจรับภายใน", "Accept by")} ${fdate(ad)}${!acc && ad < TODAY ? ` ${tag(L("เกินกำหนด", "Late"), "p-bad")}` : ""}</div>` : ""}${ph.cert ? `<div class="sub">${L("ใบตรวจรับ", "Certificates")} ${ph.cert.n} ${L("ฉบับ", "copies")}</div>` : ""}
            ${(ph.dissent || []).map((d, i) => `<div class="sub" style="color:var(--${d.resolved ? "muted" : "bad"})">${L("ความเห็นแย้ง", "Dissent")}: ${esc(userName(d.by))} · ${esc(d.note)}${d.resolved ? ` · ${L("สั่งการแล้ว", "resolved")}: ${esc(d.resolved.note)}` : ""}</div>${!d.resolved && head ? `<div class="row" style="flex-wrap:nowrap;margin-top:4px"><input type="text" id="dsn-${c.id}-${ph.n}-${i}" placeholder="${L("คำสั่งการ", "Instruction")}" style="min-width:140px"><button class="btn" type="button" data-dsres="${c.id}|${ph.n}|${i}">${L("สั่งการ", "Resolve")}</button></div>` : ""}`).join("")}
            ${mySign ? `<form class="inline-form" data-sgform="${c.id}|${ph.n}" style="margin-top:6px"><div class="f" style="flex:0 1 150px"><select name="res" aria-label="${L("ผลตรวจรับ", "Result")}"><option value="ok">${L("ถูกต้องครบถ้วน", "Accept in full")}</option><option value="partial">${L("รับบางส่วน", "Partly accept")}</option><option value="dissent">${L("ไม่รับ (ความเห็นแย้ง)", "Dissent")}</option></select></div>
              <div class="f" style="flex:0 1 120px"><input type="number" name="amt" min="1" step="1" placeholder="${L("ยอดที่รับ (บาท)", "Accepted (baht)")}" aria-label="${L("ยอดที่รับ", "Accepted amount")}"></div><div class="f" style="flex:1 1 140px"><input type="text" name="note" placeholder="${L("หมายเหตุ", "Note")}" aria-label="${L("หมายเหตุ", "Note")}"></div><button class="btn primary" type="submit">${L("ลงนาม", "Sign")}</button></form>` : ""}</td>
          <td>${ph.invoice ? `<span class="mono sub">${esc(ph.invoice.no)}</span> ${fmt(ph.invoice.amount)}` : acc ? `<span class="sub">${L("ยังไม่มีใบแจ้งหนี้", "No invoice yet")}</span>` : "—"}
            ${typeof phVoucher === "function" ? phVoucher(c, ph) : ""}
            ${pay ? `<div><span class="mono sub">${pay.id}</span> ${tag(pay.status === "approved" ? L("อนุมัติแล้ว", "Approved") : L("รออนุมัติ", "Pending"), pay.status === "approved" ? "p-ok" : "p-warn")}</div>` : ""}
            ${acc && !ph.invoice && !pay && (isProc || ROLE === "fin") ? `<form class="inline-form" data-ivform="${c.id}|${ph.n}" style="margin-top:6px"><div class="f" style="flex:1 1 110px"><input type="text" name="no" placeholder="${L("เลขที่ใบแจ้งหนี้", "Invoice no.")}" aria-label="${L("เลขที่ใบแจ้งหนี้", "Invoice no.")}" required></div><div class="f" style="flex:0 1 120px"><input type="number" name="amt" min="1" step="1" value="${ph.result === "partial" ? ph.okAmount : ph.amount}" aria-label="${L("ยอดใบแจ้งหนี้", "Invoice amount")}" required></div><button class="btn ghost" type="button" data-ivsim="${c.id}|${ph.n}">${L("จำลอง", "Simulate")}</button><button class="btn" type="submit">${L("บันทึก", "Save")}</button></form>` : ""}
            ${ph.invoice && !pay && !phPayStarted(c, ph) && (isProc || ROLE === "fin") ? `<div class="row" style="flex-wrap:nowrap;margin-top:4px"><input type="text" id="ivr-${c.id}-${ph.n}" placeholder="${L("เหตุผลที่ส่งคืน", "Why it is returned")}" aria-label="${L("เหตุผลที่ส่งคืนใบแจ้งหนี้", "Why the invoice is returned")}" style="min-width:140px"><button class="btn ghost" type="button" data-ivret="${c.id}|${ph.n}">${L("ส่งคืนใบแจ้งหนี้", "Return the invoice")}</button></div>` : ""}
            ${ph.hold && !ph.release && !pay ? `<div class="sub" style="color:var(--bad)">${L("พักเป็นข้อยกเว้น", "Held as an exception")}: ${esc(ph.hold.fails)}</div>${head ? `<div class="row" style="flex-wrap:nowrap;margin-top:4px"><input type="text" id="rel-${c.id}-${ph.n}" placeholder="${L("เหตุผลที่ปลด", "Reason for release")}" style="min-width:140px"><button class="btn" type="button" data-release="${c.id}|${ph.n}">${L("ปลดข้อยกเว้น", "Release")}</button></div>` : ""}` : ""}</td></tr>`; }).join("")}</tbody></table></div>`,
    vars: () => `
    <div class="body"><div class="row"><b style="font-weight:600">${L("การแก้ไขสัญญา", "Contract changes")}</b><span class="sub">${L("ทุกการแก้ไขสร้างฉบับใหม่ ฉบับเดิมยังเรียกดูได้ ระดับอนุมัติตามสัดส่วนที่เปลี่ยน (R-08)", "Each change makes a new version and keeps the old one. The approval level follows the size of the change (R-08).")}</span></div>
      ${(c.versions || []).length > 1 ? `<div class="sub">${c.versions.map(v => `v${v.v}: ${mb(v.amount)} ${L("ลบ.", "M")} (${fdate(v.t)})`).join(" → ")}</div>` : ""}
      ${vars.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("การแก้ไข", "Change")}</th><th>${L("เหตุผล", "Reason")}</th><th>${L("ผู้อนุมัติ", "Approver")}</th><th>${L("สถานะ", "Status")}</th></tr></thead><tbody>${vars.map(v => `<tr><td class="mono">${v.id}</td>
        <td>${v.kind === "time" ? `${L("ขยายเวลา", "Extension")} +${v.days} ${L("วัน", "d")}${v.cum != null ? ` (${L("สะสม", "cumulative")} ${v.cum})` : ""} · ${tx(c.phases.find(p => p.n === v.phase).name)} · ${tx(EXT_CODE[v.code])}` : `${L("เปลี่ยนวงเงิน", "Amount")} ${v.delta > 0 ? "+" : ""}${fmt(v.delta)} ${L("บาท", "baht")} (${fmt(Math.abs(v.delta) / c.base * 100, 1)}%${v.cum != null ? ` · ${L("สะสม", "cumulative")} ${fmt(v.cum / c.base * 100, 1)}%` : ""})`}<div class="sub">${esc(userName(v.by))} · ${fdate(v.t, true)}</div></td>
        <td class="sub">${esc(v.why)}</td><td class="sub">${v.who === "exec" ? L("ผู้บริหาร", "Executive") : L("หัวหน้าพัสดุ", "Head of procurement")}${v.decided ? `<div>${esc(userName(v.decided.by))}</div>` : ""}</td>
        <td>${stTag(VAR_ST, v.status)}${v.status === "pending" && v.by === me().id ? `<div class="row" style="margin-top:4px"><button class="btn ghost" type="button" data-vwd="${c.id}|${v.id}">${L("ถอน", "Withdraw")}</button></div>` : ""}${v.status === "pending" && canDecideVar(v) ? `<div class="row" style="margin-top:4px"><button class="btn primary" type="button" data-vok="${c.id}|${v.id}">${L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-vno="${c.id}|${v.id}">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${canVary() ? `<form class="inline-form" data-vform="${c.id}" style="margin-top:8px"><div class="f" style="flex:0 1 160px"><label>${L("ชนิด", "Kind")}</label><select name="kind"><option value="amount">${L("เปลี่ยนวงเงิน", "Change amount")}</option><option value="time">${L("ขยายเวลา", "Extend time")}</option></select></div>
        <div class="f" style="flex:0 1 140px"><label>${L("ส่วนต่างวงเงิน (บาท ลบได้)", "Amount change (baht)")}</label><input type="number" name="delta" step="1"></div>
        <div class="f" style="flex:0 1 150px"><label>${L("งวด (ขยายเวลา)", "Phase (time)")}</label><select name="phase">${c.phases.filter(p => !phaseAccepted(p)).map(p => `<option value="${p.n}">${tx(p.name)}</option>`).join("")}</select></div>
        <div class="f" style="flex:0 1 100px"><label>${L("วัน", "Days")}</label><input type="number" name="days" min="1" step="1"></div>
        <div class="f" style="flex:0 1 170px"><label>${L("เหตุผลของการขยาย", "Cause (time)")}</label><select name="code">${Object.keys(EXT_CODE).map(k => `<option value="${k}">${tx(EXT_CODE[k])}</option>`).join("")}</select></div>
        <div class="f" style="flex:2 1 220px"><label>${L("เหตุผล", "Reason")}</label><input type="text" name="why" required></div><button class="btn" type="submit">${L("เสนอแก้ไขสัญญา", "Propose a change")}</button></form>` : ""}</div>`,
  };
  if (part) return P[part] ? P[part]() : "";
  return `<section class="panel">${P.head()}${P.guar()}${P.phases()}${P.vars()}${CON_PANELS.map(f => f(c)).join("")}</section>`;
}

// ---------- closing the case (R-12) ----------
function closeChecks(cs) {
  const c = caseCon(cs), ok = (v, th, en) => ({ ok: !!v, label: L(th, en) });
  return [ok(c.phases.every(ph => phaseAccepted(ph)), "ตรวจรับครบทุกงวด", "Every phase accepted"), ok(c.phases.every(ph => phPaid(c, ph)), "เบิกจ่ายครบทุกงวด", "Every phase paid"),
    ok(!c.guarantee || c.guarantee.status === "returned", "คืนหลักประกันแล้ว", "The guarantee is returned"),
    ok(!(c.vars || []).some(v => v.status === "pending") && !c.phases.some(openDissent), "ไม่มีการแก้ไขสัญญาหรือความเห็นแย้งค้าง", "No pending change or dissent")];
}
function closePanel(cs, con) {
  if (cs.close) return `<div class="callout" style="margin:0"><b>${L("ปิดแฟ้มแล้ว", "Closed")}</b> · ${esc(userName(cs.close.by))} · ${fdate(cs.close.t)}<div class="sub">${L("บทเรียน", "Lessons")}: ${esc(cs.close.lessons)}</div><div class="sub">${L("คะแนนผู้ขาย", "Supplier score")}: ${cs.close.score}/5</div></div>`;
  const n = caseState(cs); if (n < 9) return "";
  const chk = closeChecks(cs), all = chk.every(x => x.ok);
  return `<div><b style="font-weight:600">${L("ปิดแฟ้ม (R-12)", "Close the case (R-12)")}</b><ul class="check" style="margin-top:6px">${chk.map(x => `<li><span class="m ${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "×"}</span><div>${esc(x.label)}</div></li>`).join("")}</ul>
    ${isProcRole() ? `<form class="inline-form" id="close-form" style="margin-top:8px"><div class="f" style="flex:2 1 280px"><label for="cl-les">${L("บทเรียนที่ได้", "Lessons learned")}</label><input type="text" id="cl-les" ${all ? "" : "disabled"}></div>
      <div class="f" style="flex:0 1 130px"><label for="cl-sc">${L("คะแนนผู้ขาย", "Supplier score")}</label><select id="cl-sc" ${all ? "" : "disabled"}>${[5, 4, 3, 2, 1].map(x => `<option>${x}</option>`).join("")}</select></div><button class="btn primary" type="submit" ${all ? "" : "disabled"}>${L("ปิดแฟ้ม", "Close the case")}</button></form>` : ""}</div>`;
}

// ---------- actions ----------
function bindContracts() {
  const done = msg => { commit(); renderShell(); route(); if (msg) toast(msg); };
  const two = v => v.split("|"), ph_ = (cid, n) => famCon(cid).phases.find(x => x.n === Number(n));
  $$("[data-copen2]").forEach(b => (b.onclick = () => { CASE_OPEN = b.dataset.copen2; PROC_TAB = "cases"; route(); }));
  $$("[data-gform]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const c = famCon(f.dataset.gform), fd = new FormData(f);
    const amt = Math.round(Number(fd.get("amt"))), min = Math.round(c.amount * S.pcfg.guaranteePct / 100), last = c.phases[c.phases.length - 1].due;
    if (amt < min) { toast(L(`วงเงินหลักประกันต้องไม่น้อยกว่า ${fmt(min)} บาท (ร้อยละ ${S.pcfg.guaranteePct})`, `The guarantee must be at least ${fmt(min)} baht (${S.pcfg.guaranteePct}%)`)); return; }
    if (fd.get("exp") < last) { toastErr(L("หลักประกันต้องมีผลถึงงวดสุดท้ายเป็นอย่างน้อย", "The guarantee must last at least until the last phase")); return; }
    c.guarantee = { type: fd.get("type"), ref: String(fd.get("ref") || "").trim(), amount: amt, expires: fd.get("exp"), status: "held", t: nowIso(), by: me().id };
    audit(["บันทึกหลักประกันสัญญา", "Recorded a contract guarantee"], `${c.id} ${fmt(c.guarantee.amount)}`); done(L("บันทึกหลักประกันแล้ว", "Guarantee recorded")); }));
  $$("[data-gsim]").forEach(b => (b.onclick = () => { const f = b.closest("form"), c = famCon(b.dataset.gsim); f.type.value = "bank"; f.ref.value = `BG-${FAM_FY}-${String(4000 + S.contracts.indexOf(c) * 13).slice(-4)}`; f.amt.value = Math.round(c.amount * S.pcfg.guaranteePct / 100); f.exp.value = addDays(c.phases[c.phases.length - 1].due, 30 * Math.max(3, c.warrantyMonths || 0)); f.ref.focus(); toast(L("เติมค่าจำลองแล้ว ตรวจก่อนบันทึก", "Simulated values filled in; check them before saving")); }));
  $$("[data-gext]").forEach(b => (b.onclick = () => { const c = famCon(b.dataset.gext), d = $("#gx-" + c.id).value; if (!d || d <= c.guarantee.expires) { toast(L("วันหมดอายุใหม่ต้องหลังวันเดิม", "The new expiry must be after the current one")); return; }
    (c.guarantee.ext = c.guarantee.ext || []).push({ from: c.guarantee.expires, to: d, t: nowIso(), by: me().id }); c.guarantee.expires = d; audit(["ต่ออายุหลักประกันสัญญา", "Extended a contract guarantee"], `${c.id} → ${d}`); done(L("ต่ออายุแล้ว", "Extended")); }));
  $$("[data-gret]").forEach(b => (b.onclick = () => { const c = famCon(b.dataset.gret); c.guarantee.status = "returned"; audit(["คืนหลักประกันสัญญา", "Returned a contract guarantee"], c.id); done(L("บันทึกการคืนหลักประกันแล้ว", "Return recorded")); }));
  $$("[data-dlform]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const [cid, n] = two(f.dataset.dlform), c = famCon(cid), ph = ph_(cid, n), d = new FormData(f).get("d");
    if (d < c.signed) { toast(L("วันส่งมอบต้องไม่ก่อนวันลงนามสัญญา", "Delivery can't be before the contract was signed")); return; }
    ph.delivered = d; ph.dRef = String(new FormData(f).get("ref") || "").trim() || null; const late = phLate(ph);
    audit(["บันทึกการแจ้งส่งมอบ", "Recorded a delivery notice"], `${c.id} ${tx(ph.name)}${late ? ` · ${late} วัน` : ""}`);
    notify(c.inspectors, [`${c.id} ${ph.name[0]} แจ้งส่งมอบแล้ว ตรวจรับภายใน ${fdate(acceptDue(c, ph))}`, `${c.id} ${ph.name[1]} was delivered; accept by ${fdate(acceptDue(c, ph))}`], "prc-contracts");
    if (penaltyWarn(c)) notify(["exec", "prochead"], [`สัญญา ${c.id} ค่าปรับสะสมเกินเกณฑ์เตือน พิจารณาบอกเลิกสัญญา`, `Contract ${c.id}: penalties passed the warning limit; consider termination`], "prc-contracts");
    done(late ? L(`บันทึกแล้ว ล่าช้า ${late} วัน ค่าปรับ ${fmt(phPenalty(c, ph))} บาท`, `Saved: ${late} days late, penalty ${fmt(phPenalty(c, ph))} baht`) : L("บันทึกการส่งมอบแล้ว", "Delivery recorded")); }));
  $$("[data-sgform]").forEach(f => (f.onsubmit = e => {
    e.preventDefault(); const [cid, n] = two(f.dataset.sgform), c = famCon(cid), ph = ph_(cid, n), fd = new FormData(f), res = fd.get("res"), note = String(fd.get("note") || "").trim(), amt = Math.round(Number(fd.get("amt")) || 0);
    if (!c.inspectors.includes(me().id)) { toast(L("คุณไม่ได้เป็นกรรมการตรวจรับสัญญานี้", "You're not on this contract's committee")); return; }
    if (!ph.delivered) { toast(L("ต้องบันทึกการแจ้งส่งมอบก่อน", "Record the delivery first")); return; }
    if (ph.n > 1 && !phaseAccepted(c.phases[ph.n - 2])) { toast(L("ต้องตรวจรับงวดก่อนหน้าให้ครบก่อน", "Accept the previous phase first")); return; }
    if (openDissent(ph)) { toast(L("มีความเห็นแย้งค้าง รอหัวหน้าสั่งการ", "A dissent is open; wait for the instruction")); return; }
    if (!sodCheck("SD-02", [me().id], [c.by], c.id)) return;
    if (res === "dissent") {
      if (note.length < 5) { toastErr(L("ระบุเหตุผลของความเห็นแย้ง", "Give the reason for the dissent")); return; }
      (ph.dissent = ph.dissent || []).push({ by: me().id, note, t: nowIso(), resolved: null });
      audit(["บันทึกความเห็นแย้งในการตรวจรับ", "Recorded an acceptance dissent"], `${c.id} ${tx(ph.name)}`);
      notify(["exec", "prochead"], [`${c.id} ${ph.name[0]} กรรมการไม่รับงาน รอสั่งการ`, `${c.id} ${ph.name[1]}: a member did not accept, instruction needed`], "prc-contracts"); done(L("บันทึกความเห็นแย้งแล้ว เสนอหัวหน้าสั่งการ", "Dissent recorded and sent for instruction")); return;
    }
    const want = res === "partial" ? amt : ph.amount;
    if (res === "partial" && (!(amt > 0) || amt >= ph.amount || note.length < 3)) { toast(L("รับบางส่วน: ระบุยอดที่รับ (น้อยกว่ายอดงวด) และหมายเหตุ", "Partial: give the accepted amount (below the phase amount) and a note")); return; }
    if (ph.signs.length && ph.okAmount !== want) { toast(L("ผลตรวจรับต้องตรงกับกรรมการท่านก่อนหน้า", "The result must match what earlier members signed")); return; }
    ph.result = res === "partial" ? "partial" : "ok"; ph.okAmount = want; if (note) ph.note = note;
    ph.signs.push({ by: me().id, t: nowIso() });
    audit(["ลงนามตรวจรับงาน", "Signed an acceptance"], `${c.id} ${tx(ph.name)}`);
    if (phaseAccepted(ph)) {
      ph.cert = { n: 2, t: nowIso() }; const ad = acceptDue(c, ph), late = ad && TODAY > ad;
      audit(["ตรวจรับงานครบองค์ประชุม", "Phase accepted"], `${c.id} ${tx(ph.name)}${late ? " · เกินกำหนดตรวจรับ" : ""}`);
      notify(["fin", "proc"], [`${c.id} ${ph.name[0]} ตรวจรับแล้ว บันทึกใบแจ้งหนี้และขอเบิกจ่ายได้`, `${c.id} ${ph.name[1]} is accepted; record the invoice and request payment`], "fnc-pay");
    }
    done(phaseAccepted(ph) ? L("ตรวจรับครบแล้ว ออกใบตรวจรับ 2 ฉบับ", "Accepted; 2 certificates issued") : L("ลงนามแล้ว รอกรรมการท่านอื่น", "Signed, waiting for the other members")); }));
  $$("[data-dsres]").forEach(b => (b.onclick = () => { const [cid, n, i] = b.dataset.dsres.split("|"), c = famCon(cid), ph = ph_(cid, n), note = ($(`#dsn-${cid}-${n}-${i}`).value || "").trim();
    if (note.length < 5) { toastErr(L("ระบุคำสั่งการ", "Write the instruction")); return; }
    ph.dissent[Number(i)].resolved = { by: me().id, note, t: nowIso() }; audit(["สั่งการความเห็นแย้งในการตรวจรับ", "Resolved an acceptance dissent"], `${c.id} ${tx(ph.name)}`); done(L("บันทึกคำสั่งการแล้ว", "Instruction recorded")); }));
  $$("[data-ivform]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const [cid, n] = two(f.dataset.ivform), c = famCon(cid), ph = ph_(cid, n), fd = new FormData(f);
    ph.invoice = { no: String(fd.get("no")).trim(), amount: Math.round(Number(fd.get("amt"))), date: TODAY, vendor: tx(c.vendor), contract: c.no, by: me().id };
    audit(["บันทึกใบแจ้งหนี้", "Recorded an invoice"], `${c.id} ${tx(ph.name)} ${ph.invoice.no}`); done(L("บันทึกใบแจ้งหนี้แล้ว", "Invoice recorded")); }));
  $$("[data-release]").forEach(b => (b.onclick = () => { const [cid, n] = two(b.dataset.release), c = famCon(cid), ph = ph_(cid, n), reason = ($(`#rel-${cid}-${n}`).value || "").trim();
    if (reason.length < 10) { toastErr(L("ระบุเหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters")); return; }
    ph.release = { by: me().id, reason, t: nowIso() }; audit(["ปลดข้อยกเว้นประตูเบิกจ่าย", "Released a payment-gate exception"], `${c.id} ${tx(ph.name)}`);
    notify(["audit", "fin"], [`${c.id} ${ph.name[0]} ปลดข้อยกเว้นประตูเบิกจ่ายโดย ${userName(me().id)}`, `${c.id} ${ph.name[1]}: gate exception released by ${userName(me().id)}`], "fnc-pay"); done(L("ปลดข้อยกเว้นแล้ว การเงินส่งคำขอได้", "Released; Finance can send the request")); }));
  $$("[data-vform]").forEach(f => (f.onsubmit = e => {
    e.preventDefault(); const c = famCon(f.dataset.vform), fd = new FormData(f), kind = fd.get("kind"), why = String(fd.get("why")).trim();
    const v = { id: `${c.id}-V${(c.vars || []).length + 1}`, kind, why, by: me().id, t: nowIso(), status: "pending", decided: null };
    if (kind === "time") { v.days = Math.round(Number(fd.get("days"))); v.phase = Number(fd.get("phase")); v.code = fd.get("code"); if (!(v.days > 0) || !v.phase) { toastErr(L("ระบุงวดและจำนวนวัน", "Give the phase and the days")); return; } }
    else { v.delta = Math.round(Number(fd.get("delta"))); if (!v.delta) { toastErr(L("ระบุส่วนต่างวงเงิน", "Give the amount change")); return; }
      if (c.amount + v.delta <= 0) { toast(L("วงเงินใหม่ต้องมากกว่าศูนย์", "The new amount must be above zero")); return; }
      if (v.delta > 0 && v.delta > famHeadroom(c.line)) { toast(L(`เกินวงเงินคงเหลือของรายการจัดสรร (${mb(famHeadroom(c.line))} ลบ.)`, `More than the room left on the line (${mb(famHeadroom(c.line))} M)`)); return; } }
    v.cum = varCum(c, v); v.who = varWho(c, v); (c.vars = c.vars || []).push(v);
    audit(["เสนอแก้ไขสัญญา", "Proposed a contract change"], `${c.id} ${v.id}`);
    notify([v.who], [`${c.id} มีการเสนอแก้ไขสัญญา รออนุมัติ`, `${c.id} has a proposed change waiting for approval`], "prc-contracts"); done(L("ส่งขออนุมัติแล้ว", "Sent for approval")); }));
  const vdec = (cid, vid, ok) => {
    const c = famCon(cid), v = c.vars.find(x => x.id === vid);
    if (ok) {
      if (!sodCheck("SD-08", v.who === "exec" ? sodActors("exec", "spend") : [me().id], [v.by], v.id)) return;
      if (v.kind === "amount") {
        if (v.delta > famHeadroom(c.line)) { toast(L("เกินวงเงินคงเหลือของรายการจัดสรร", "More than the room left on the line")); return; }
        const open = c.phases.filter(p => !phaseAccepted(p)), tgt = open[open.length - 1];
        if (!tgt || tgt.amount + v.delta <= 0) { toast(L("ปรับงวดที่ยังไม่ตรวจรับไม่ได้", "No open phase can take this change")); return; }
        tgt.amount += v.delta; c.amount += v.delta;
      } else { const ph = c.phases.find(p => p.n === v.phase); if (v.code === "vendor") ph.extV = (ph.extV || 0) + v.days; else ph.ext = (ph.ext || 0) + v.days; }
      c.ver = (c.ver || 1) + 1; (c.versions = c.versions || []).push({ v: c.ver, amount: c.amount, t: nowIso(), by: me().id, why: v.id });
    }
    v.status = ok ? "approved" : "rejected"; v.decided = { by: me().id, t: nowIso() };
    audit([ok ? "อนุมัติแก้ไขสัญญา" : "ไม่อนุมัติแก้ไขสัญญา", ok ? "Approved a contract change" : "Rejected a contract change"], `${c.id} ${v.id}`);
    notify(["proc", "fin"], [`${c.id} ${ok ? "แก้ไขสัญญาได้รับอนุมัติ" : "การแก้ไขสัญญาไม่ได้รับอนุมัติ"}${ok && v.kind === "amount" ? ` ภาระผูกพันเปลี่ยน ${v.delta > 0 ? "+" : ""}${fmt(v.delta)} บาท` : ""}`, `${c.id}: change ${ok ? "approved" : "rejected"}${ok && v.kind === "amount" ? `, commitment ${v.delta > 0 ? "+" : ""}${fmt(v.delta)} baht` : ""}`], "fnc-chain");
    done(ok ? L("อนุมัติแล้ว สร้างฉบับสัญญาใหม่", "Approved; new version created") : L("ไม่อนุมัติ", "Rejected"));
  };
  $$("[data-vwd]").forEach(b => (b.onclick = () => { const [cid, vid] = b.dataset.vwd.split("|"), c = famCon(cid), v = c.vars.find(x => x.id === vid), snap = crSnap(); v.status = "withdrawn"; v.decided = { by: me().id, t: nowIso() }; audit(["ถอนการเสนอแก้ไขสัญญา", "Withdrew a proposed contract change"], `${c.id} ${v.id}`); done(); crUndoOffer(snap, L("ถอนแล้ว", "Withdrawn")); }));
  $$("[data-vok]").forEach(b => (b.onclick = () => vdec(...b.dataset.vok.split("|"), true)));
  $$("[data-vno]").forEach(b => (b.onclick = () => vdec(...b.dataset.vno.split("|"), false)));
  CON_BINDS.forEach(f => f(done));
}
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "contracts") bindContracts(); if (PROC_TAB === "cases") bindClose(); };
}
function bindClose() {
  const f = $("#close-form"); if (!f) return;
  f.onsubmit = e => {
    e.preventDefault(); const cs = caseOf(CASE_OPEN), les = $("#cl-les").value.trim();
    if (!closeChecks(cs).every(x => x.ok)) { toast(L("ยังปิดแฟ้มไม่ได้", "Can't close yet")); return; }
    if (les.length < 10) { toastErr(L("บันทึกบทเรียนอย่างน้อย 10 ตัวอักษร", "Write the lessons, at least 10 characters")); return; }
    cs.close = { lessons: les, score: Number($("#cl-sc").value), by: me().id, t: nowIso() }; caseLog(cs, "closed_case", `${cs.close.score}/5`);
    const con = caseCon(cs); if (con && con.status === "active") { con.status = "closed"; con.closed = { by: me().id, t: nowIso() }; } famPlan(cs.plan).status = "closed"; audit(["ปิดแฟ้มจัดซื้อ", "Closed a procurement case"], cs.id);
    commit(); renderShell(); route(); toast(L("ปิดแฟ้มแล้ว", "Case closed"));
  };
}

// ---------- tasks ----------
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.contracts || !isProcRole()) return;
    S.contracts.forEach(c => {
      const gs = guarSt(c); if (gs === "expiring" || gs === "expired") R(`${gs === "expired" ? L("หลักประกันหมดอายุ", "Guarantee expired") : L("หลักประกันใกล้หมดอายุ", "Guarantee expiring")} ${c.id}`, `${fdate(c.guarantee.expires)}`, c.guarantee.expires, "prc-contracts", gs === "expired" ? "p-bad" : "p-warn");
      c.phases.forEach(ph => { if (!phaseAccepted(ph) && !ph.delivered && phDue(ph) <= addDays(TODAY, 7) && (ph.n === 1 || phaseAccepted(c.phases[ph.n - 2]))) R(`${L("ติดตามการส่งมอบ", "Follow up delivery")} ${c.id} ${tx(ph.name)}`, `${L("กำหนด", "due")} ${fdate(phDue(ph))}`, phDue(ph), "prc-contracts", phDue(ph) < TODAY ? "p-bad" : "p-info"); });
      (c.vars || []).filter(v => v.status === "pending" && (v.who === "prochead" && ROLE === "prochead")).forEach(v => R(`${L("อนุมัติแก้ไขสัญญา", "Approve a contract change")} ${v.id}`, c.no, TODAY, "prc-contracts", "p-warn"));
    });
  };
  const base2 = famTasks;
  famTasks = R => { base2(R); if (canSpend() && S.contracts) S.contracts.forEach(c => (c.vars || []).filter(v => v.status === "pending" && v.who === "exec").forEach(v => R(`${L("อนุมัติแก้ไขสัญญา", "Approve a contract change")} ${v.id}`, c.no, TODAY, "prc-contracts", "p-warn"))); };
}

// ---------- seed ----------
function seedContracts(s, K) {
  Object.assign(s.pcfg, { penaltyPct: 0.1, penGoods: 0.1, penService: 0.1, penCons: 0.1, penaltyMin: 100, penaltyCapPct: 10, guaranteePct: 5, guaranteeWarnDays: 30, ladderPct: 10, extDaysHead: 30, invoiceTol: 0, acceptWd: 3, acceptWdLast: 5 });
  s.contracts.forEach((c, i) => {
    c.base = c.amount; c.ver = 1; c.versions = [{ v: 1, amount: c.amount, t: c.signed + "T14:00", by: K.PO, why: "" }]; c.vars = [];
    c.guarantee = { type: "bank", amount: Math.round(c.amount * 0.05), expires: "2027-04-30", status: "held", t: c.signed + "T15:00", by: K.PO };
    c.phases.forEach(ph => { ph.ext = 0; ph.extV = 0; ph.dissent = []; });
    const p1 = c.phases[0]; p1.delivered = i === 0 ? "2026-10-14" : "2026-10-16"; p1.result = "ok"; p1.okAmount = p1.amount; p1.cert = { n: 2, t: p1.signs[1].t };
    if (i === 1) p1.signs.forEach((sg, k) => (sg.t = "2026-10-16T" + (k ? "10:30" : "09:00")));
    if (i === 0) p1.invoice = { no: "INV-69-0412", amount: p1.amount, date: "2026-10-14", vendor: c.vendor[0], contract: c.no, by: K.FN };
  });
  s.contracts[0].vars.push({ id: s.contracts[0].id + "-V1", kind: "time", why: "ฝนตกหนักผิดปกติ ส่งวัสดุไม่ได้", by: K.PO, t: "2026-10-15T09:00", status: "pending", decided: null, days: 15, phase: 2, code: "force", who: "prochead" });
}
