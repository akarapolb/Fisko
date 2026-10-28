// Procurement CRUD round PC4 (Fisko_Procurement_CRUD_Design.html chapters 6.4 and 11): the last contract pieces the
// end-to-end demo needs (penalty waivers, withdrawing an acceptance signature, returning an invoice, Simulate for the
// invoice) and the demo itself, P-E01 to P-E15 in the in-app guide.

// A phase has started payment once a live voucher or payment request exists for it.
const phPayStarted = (c, ph) => (S.vouchers || []).some(v => v.contract === c.id && v.phase === ph.n && v.state !== "cancelled") || S.payreqs.some(p => p.contract === c.id && p.phase === ph.n && p.status !== "rejected");

// ---------- penalty waivers (FR-PC-28, FL-PC-08) ----------
// Procurement proposes to waive or reduce a phase's penalty with a reason and a supporting document; the executive
// (or a spend delegate, never the proposer) approves. An approved waiver comes off the penalty in phNet, the payment
// gate and the voucher, and can be cancelled until the phase goes to payment.
const WV_ST = { none: [["ไม่มีคำขอ", "No request"], "p-mute"], pending: [["รออนุมัติ", "Pending"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"], withdrawn: [["ถอน", "Withdrawn"], "p-mute"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const wvCon = () => (CON_OPEN ? famCon(CON_OPEN) : null);
CRUD.def("pcWaive", {
  noun: ["การงดหรือลดค่าปรับ", "Penalty waiver"], st: WV_ST,
  list: () => { const c = wvCon(); return c ? c.phases.filter(ph => phPenaltyRaw(c, ph) > 0 || ph.waive) : []; }, id: ph => "P" + ph.n, title: ph => tx(ph.name),
  sub: ph => { const c = wvCon(); return `${phLate(ph)} ${L("วันล่าช้า", "days late")} · ${L("ค่าปรับ", "penalty")} ${fmt(phPenaltyRaw(c, ph))} ${L("บาท", "baht")}`; },
  status: ph => (ph.waive ? ph.waive.status : "none"),
  cols: [{ h: ["งวด", "Phase"], c: ph => tx(ph.name) }, { h: ["วันล่าช้า", "Days late"], n: true, c: ph => phLate(ph) },
    { h: ["ค่าปรับ (บาท)", "Penalty (baht)"], n: true, c: ph => fmt(phPenaltyRaw(wvCon(), ph)) },
    { h: ["ขอลด (บาท)", "Waiver (baht)"], n: true, c: ph => (ph.waive ? fmt(ph.waive.amount) : "–") }, { h: ["ค่าปรับสุทธิ (บาท)", "Net penalty (baht)"], n: true, c: ph => fmt(phPenalty(wvCon(), ph)) }],
  fields: ph => { const raw = phPenaltyRaw(wvCon(), ph), w = ph.waive && ph.waive.status === "pending" ? ph.waive : null;
    return [{ id: "_r", label: ["ค่าปรับตามสัญญา", "Penalty under the contract"], type: "info", html: `${fmt(raw)} ${L("บาท", "baht")} · ${phLate(ph)} ${L("วัน", "days")} × ${S.pcfg.penaltyPct}%` },
      { id: "amount", label: ["ยอดที่ของดหรือลด (บาท)", "Amount to waive (baht)"], type: "number", req: true, min: 1, max: raw, value: w ? w.amount : raw },
      { id: "doc", label: ["เอกสารประกอบ", "Supporting document"], wide: true, value: w ? w.doc : "", hint: L("เช่น หนังสือแจ้งเหตุสุดวิสัย หรือหลักฐานว่าความล่าช้าเกิดจากหน่วยงาน", "For example a force-majeure notice, or evidence the delay was the agency's") },
      { id: "why", label: ["เหตุผล", "Reason"], type: "textarea", req: true, wide: true, value: w ? w.why : "" }]; },
  check: (v, ph) => { const raw = phPenaltyRaw(wvCon(), ph), e = [];
    if (!(v.amount > 0) || v.amount > raw) e.push({ f: "amount", m: L(`ใส่ยอดระหว่าง 1 ถึง ${fmt(raw)} บาท`, `Enter 1 to ${fmt(raw)} baht`) });
    if ((v.why || "").length < 10) e.push({ f: "why", m: L("ระบุเหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters") }); return e; },
  edit: { can: ph => { const c = wvCon(), w = ph.waive; return !!c && isProcRole() && c.status === "active" && !phPayStarted(c, ph) && (!w || ["rejected", "withdrawn", "cancelled"].includes(w.status) || (w.status === "pending" && w.by === me().id)); },
    run: (ph, v) => { const c = wvCon(); ph.waive = { amount: Math.round(v.amount), doc: v.doc, why: v.why, status: "pending", by: me().id, t: nowIso() };
      audit(["เสนองดหรือลดค่าปรับ", "Proposed a penalty waiver"], `${c.id} ${tx(ph.name)} · ${fmt(ph.waive.amount)}`); notify(["exec"], [`${c.id} ขอลดค่าปรับ ${tx(ph.name)} รออนุมัติ`, `${c.id} asks to waive a penalty on ${tx(ph.name)}`], "prc-contracts"); } },
  acts: ph => { const c = wvCon(), w = ph.waive; if (!c || !w) return [];
    const out = [];
    if (w.status === "pending" && canSpend() && w.by !== me().id) out.push(
      { id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", impact: () => L(`ค่าปรับของงวดนี้เหลือ ${fmt(Math.max(0, phPenaltyRaw(c, ph) - w.amount))} บาท`, `The penalty on this phase becomes ${fmt(Math.max(0, phPenaltyRaw(c, ph) - w.amount))} baht`), run: () => {
        if (!sodCheck("SD-08", sodActors("exec", "spend"), [w.by], `${c.id}-${ph.n}`)) return "";
        w.status = "approved"; w.decided = { by: me().id, t: nowIso() }; audit(["อนุมัติงดหรือลดค่าปรับ", "Approved a penalty waiver"], `${c.id} ${tx(ph.name)} · ${fmt(w.amount)}${onBehalf("exec", "spend")}`); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Reject"), kind: "danger", why: true, run: (_, why) => { w.status = "rejected"; w.decided = { by: me().id, t: nowIso(), why }; audit(["ไม่อนุมัติงดหรือลดค่าปรับ", "Rejected a penalty waiver"], `${c.id} ${tx(ph.name)} · ${why}`); return L("ไม่อนุมัติแล้ว", "Rejected"); } });
    if (w.status === "pending" && w.by === me().id) out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw"), run: () => { w.status = "withdrawn"; audit(["ถอนคำของดค่าปรับ", "Withdrew a penalty waiver"], `${c.id} ${tx(ph.name)}`); return L("ถอนแล้ว", "Withdrawn"); } });
    if (w.status === "approved" && !phPayStarted(c, ph) && (canSpend() || isProcRole())) out.push({ id: "cancel", label: L("ยกเลิกการงด", "Cancel the waiver"), kind: "danger", why: true, run: (_, why) => {
      w.status = "cancelled"; w.cancelled = { by: me().id, t: nowIso(), why }; audit(["ยกเลิกการงดหรือลดค่าปรับ", "Cancelled a penalty waiver"], `${c.id} ${tx(ph.name)} · ${why}`); return L("ยกเลิกแล้ว ค่าปรับกลับเป็นตามสัญญา", "Cancelled; the full penalty applies again"); } });
    return out; },
  view: ph => { const c = wvCon(), w = ph.waive;
    return kv([[L("กำหนดส่งมอบ", "Due"), fdate(phDue(ph))], [L("ส่งมอบ", "Delivered"), ph.delivered ? fdate(ph.delivered) : "–"], [L("ค่าปรับตามสัญญา", "Penalty under the contract"), `${fmt(phPenaltyRaw(c, ph))} ${L("บาท", "baht")}`],
      w && [L("ขอลด", "Waiver asked"), `${fmt(w.amount)} ${L("บาท", "baht")} · ${esc(userName(w.by))} · ${fdate(w.t, true)}`], w && [L("เหตุผล", "Reason"), esc(w.why)], w && w.doc && [L("เอกสาร", "Document"), esc(w.doc)],
      w && w.decided && [L("ผล", "Decision"), `${esc(userName(w.decided.by))} · ${fdate(w.decided.t, true)}${w.decided.why ? ` · ${esc(w.decided.why)}` : ""}`],
      [L("ค่าปรับสุทธิ", "Net penalty"), `${fmt(phPenalty(c, ph))} ${L("บาท", "baht")}`]])
      + (phPayStarted(c, ph) ? `<p class="sub">${L("งวดนี้ส่งเบิกแล้ว เปลี่ยนการงดค่าปรับไม่ได้", "This phase has gone to payment; the waiver can't change")}</p>` : ""); },
  hist: () => (wvCon() ? wvCon().id : ""),
});
{
  const base = conTabBody;
  conTabBody = (c, k) => { const h = base(c, k); if (k !== "phases" || !c.phases.some(ph => phPenaltyRaw(c, ph) > 0 || ph.waive)) return h;
    return h + crudList("pcWaive", { head: `<h2>${L("งดหรือลดค่าปรับ", "Penalty waivers")}</h2><span class="sp"></span><span class="sub">${L("พัสดุเสนอพร้อมเหตุผลและเอกสาร ผู้บริหารอนุมัติ", "Procurement proposes with a reason and document; the executive approves")}</span>` }); };
}

// ---------- signatures and invoices on the phase rows (FR-PC-25, FR-PC-30, SIM-PC-05) ----------
CON_BINDS.push(done => {
  const two = v => v.split("|"), ph_ = (cid, n) => famCon(cid).phases.find(x => x.n === Number(n));
  $$("[data-sgwd]").forEach(b => (b.onclick = () => { const [cid, n] = two(b.dataset.sgwd), c = famCon(cid), ph = ph_(cid, n), snap = crSnap();
    if (phaseAccepted(ph)) { toast(L("ตรวจรับครบแล้ว ถอนไม่ได้", "The acceptance is complete; it can't be withdrawn")); return; }
    ph.signs = ph.signs.filter(s => s.by !== me().id); if (!ph.signs.length) { delete ph.result; delete ph.okAmount; }
    audit(["ถอนลายมือชื่อตรวจรับ", "Withdrew an acceptance signature"], `${c.id} ${tx(ph.name)}`); done(); crUndoOffer(snap, L("ถอนลายมือชื่อแล้ว ลงนามใหม่ได้", "Signature withdrawn; sign again")); }));
  $$("[data-ivsim]").forEach(b => (b.onclick = () => { const [cid, n] = two(b.dataset.ivsim), c = famCon(cid), ph = ph_(cid, n), f = b.closest("form");
    f.no.value = `INV-${FAM_FY % 100}-${c.id.slice(-3)}${ph.n}`; f.amt.value = ph.result === "partial" ? ph.okAmount : ph.amount; f.no.focus(); toast(L("เติมใบแจ้งหนี้จำลองจากพอร์ทัลผู้ขายแล้ว ตรวจก่อนบันทึก", "Simulated invoice from the supplier portal filled in; check it before saving")); }));
  $$("[data-ivret]").forEach(b => (b.onclick = () => { const [cid, n] = two(b.dataset.ivret), c = famCon(cid), ph = ph_(cid, n), why = ($("#ivr-" + cid + "-" + n) || {}).value || "";
    if (why.trim().length < 10) { toastErr(L("ระบุเหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters")); return; }
    if (phPayStarted(c, ph)) { toast(L("งวดนี้ส่งเบิกแล้ว", "This phase has gone to payment")); return; }
    (ph.invReturned = ph.invReturned || []).push(Object.assign({}, ph.invoice, { why: why.trim(), by: me().id, at: nowIso() })); delete ph.invoice; delete ph.hold;
    audit(["ส่งคืนใบแจ้งหนี้", "Returned an invoice"], `${c.id} ${tx(ph.name)} · ${why.trim()}`); done(L("ส่งคืนแล้ว บันทึกใบแจ้งหนี้ใหม่ได้", "Returned; record a new invoice")); }));
});

// ---------- the procurement end-to-end demo (design chapter 11) ----------
const PE2E = [
  ["proc", "prc-plan", ["รายการในแผน: เพิ่ม แก้ และลบร่าง", "Plan items: add, edit, delete a draft"], ["แผนจัดซื้อผูกกับรายการจัดสรร ร่างที่ยังไม่เคยเสนอลบได้ เลขที่ไม่นำกลับมาใช้", "The plan is tied to allocation lines; a draft never proposed can be deleted, and its number is not reused"],
    ["“+ เพิ่มรายการในแผน” บนรายการจัดสรรของหน่วยผู้สาธิต → แก้ประมาณการ → เพิ่มรายการผิดอีกหนึ่งรายการแล้ว “ลบร่าง”", "Add a plan item on the demo unit's line → edit the estimate → add a wrong one and delete the draft"]],
  ["proc", "prc-plan", ["เสนอ อนุมัติ และประกาศแผนฉบับใหม่", "Propose, approve and publish a version"], ["ฉบับใหม่แสดงรายการเพิ่ม แก้ และตัดออก ผู้เสนออนุมัติเองไม่ได้", "A new version shows what was added, changed and removed; the proposer can't approve it"],
    ["“เสนอแผนฉบับใหม่” → สลับเป็นผู้บริหาร “อนุมัติ” → กลับเป็นพัสดุ “บันทึกการประกาศใน e-GP” กด “จำลอง” แล้วยืนยัน", "Propose a new version → as the executive, approve → as procurement, record the e-GP notice with Simulate"]],
  ["div", "prc-reqn", ["ขอซื้อ ถอน แก้ และส่งใหม่", "Raise, withdraw, edit, send again"], ["หน่วยงานขอซื้อจากรายการที่ประกาศแล้ว บันทึกร่างก่อนส่ง ถอนกลับมาแก้ได้พร้อมเหตุผล", "The unit raises a requisition from a published item, saves a draft first, and can withdraw it with a reason"],
    ["“ขอซื้อขอจ้าง” เลือกรายการ → บันทึก → “ส่งขออนุมัติ” → “ถอนใบขอ” ใส่เหตุผล → แก้วงเงิน → ส่งใหม่", "Raise one → save → send → withdraw with a reason → change the amount → send again"]],
  ["exec", "prc-reqn", ["ส่งคืนแก้แล้วอนุมัติ", "Return for changes, then approve"], ["ผู้อนุมัติส่งคืนพร้อมเหตุผล หน่วยงานเห็นงานให้แก้ อนุมัติแล้ววงเงินคงเหลือของบรรทัดลดทันที", "The approver returns it with a reason, the unit gets a task to fix it, and approval reduces the room on the line at once"],
    ["“ส่งคืนแก้ไข” → หน่วยงานแก้เหตุผลความจำเป็นแล้วส่ง → ผู้บริหาร “อนุมัติ” ชี้วงเงินคงเหลือในรายการ", "Return for changes → the unit fixes the justification and sends → approve, point at the room left"]],
  ["proc", "prc-cases", ["เลือกวิธีจัดหาและแบ่งแยกหน้าที่", "Choose the method, with duty separation"], ["วิธีที่ต่างจากคำแนะนำต้องให้หัวหน้าพัสดุอนุมัติ และผู้เลือกอนุมัติเองไม่ได้", "A method that differs from the advice needs the head's approval, and whoever chose it can't approve it"],
    ["เปิดแฟ้มจากลิ้นชัก → เลือก e-bidding พร้อมเหตุผล → สลับเป็นหัวหน้าพัสดุ “อนุมัติวิธีนี้”", "Open the case from its drawer → choose e-bidding with a reason → as the head, approve the method"]],
  ["proc", "prc-cases", ["ราคากลาง TOR คณะกรรมการ และประกาศ", "Reference price, TOR, committee, announcement"], ["ทุกแถวแก้หรือลบได้จนขั้นถัดไปใช้ คำสั่งแต่งตั้งแก้ได้จนกรรมการเริ่มแจ้งส่วนได้เสีย", "Every row can change until the next step uses it; an appointment order can change until members start declaring"],
    ["เพิ่มการสำรวจตลาดแล้วลบแถวที่ผิด → บันทึกราคากลาง → แนบ TOR → ตั้งคณะกรรมการแล้วแก้กรรมการหนึ่งคน → กำหนดเกณฑ์ → ฟอร์ม e-GP กด “จำลอง” แล้วบันทึก", "Add market research and delete a wrong row → save the reference price → attach the TOR → appoint the committee and change one member → set the criteria → e-GP form, Simulate, save"]],
  ["proc", "prc-cases", ["ปิดรับและบันทึกข้อเสนอ", "Bids close and are recorded"], ["ข้อเสนอเลือกจากทะเบียนผู้ขาย ผู้ทิ้งงานไม่แสดง แก้หรือลบได้จนกรรมการให้คะแนน", "Bidders come from the supplier register without the abandoned-work list, and can change until a member scores"],
    ["“ข้อมูล ณ” เลื่อนถึงวันปิดรับ หรือ “จำลอง: ถึงวันปิดรับข้อเสนอ” → ใส่จำนวนผู้ยื่น → “จำลองข้อเสนอที่เหลือ” → แก้ราคาหนึ่งแถว ลบผู้ยื่นที่เอกสารไม่ครบ", "Move to the closing date → record the bidder count → simulate the remaining bids → correct one price, delete an incomplete bidder"]],
  ["prochead", "prc-cases", ["คะแนน ประกาศผล และอุทธรณ์", "Scores, award and appeal"], ["อุทธรณ์บันทึกเป็นฟอร์ม หัวหน้าพัสดุวินิจฉัยพร้อมเหตุผล ถอนผลพิจารณาได้ก่อนพ้นกำหนดอุทธรณ์", "The appeal is a form; the head decides with a reason and can withdraw an award before the appeal period ends"],
    ["พัสดุ “จำลอง: กรรมการทุกคนส่งแบบแจ้งและใบให้คะแนน” → บันทึกผลพร้อมวันที่ → ฟอร์มอุทธรณ์ “จำลอง” แล้วบันทึก → หัวหน้าพัสดุใส่เหตุผลแล้ว “ยกอุทธรณ์” → ไปขั้นทำสัญญา", "As procurement, simulate the score sheets → record the award with its date → appeal form, Simulate, record → as the head, dismiss with a reason → move to contracting"]],
  ["proc", "prc-contracts", ["ร่างสัญญาและตารางงวด", "Draft the contract and its phases"], ["คู่สัญญาคือผู้ชนะเสมอ งวดแก้ได้จนลงนาม ร่างยังไม่ผูกพันวงเงิน การลงนามจึงผูกพัน", "The supplier is always the winner, phases change until signing, and only signing commits the money"],
    ["“สร้างร่างสัญญา” จากแฟ้ม → ตั้ง 2 งวดยอดไม่เท่ากัน → บันทึก → “บันทึกการลงนาม” → ชี้ยอดผูกพันใน Fisko Budget B8", "Draft from the case → two uneven phases → save → record the signing → point at the commitment in Fisko Budget B8"]],
  ["proc", "prc-contracts", ["หลักประกันและส่งมอบงวดแรก", "Guarantee and the first delivery"], ["หลักประกันต้องไม่ต่ำกว่าร้อยละที่กำหนดและครอบคลุมงวดสุดท้าย ต่ออายุได้", "The guarantee must meet the minimum and cover the last phase, and can be extended"],
    ["เปิดสัญญา แท็บหลักประกัน “จำลอง” แล้วบันทึก → แท็บงวดงาน บันทึกแจ้งส่งมอบงวดที่ 1", "Open the contract, guarantee tab, Simulate and record → phases tab, record delivery of phase 1"]],
  ["plan", "prc-contracts", ["ตรวจรับบางส่วนและใบแจ้งหนี้", "Partial acceptance and the invoice"], ["กรรมการถอนลายมือชื่อที่ลงผิดได้ก่อนครบ ใบแจ้งหนี้ตั้งต้นเท่ายอดที่ตรวจรับและผ่านด่านตรวจ", "A member can take back a wrong signature before it is complete; the invoice starts at the accepted amount and passes the gate"],
    ["กรรมการคนแรกลงนาม “รับบางส่วน” → “ถอนลายมือชื่อ” → ลงนามใหม่ → กรรมการคนที่สองลงนาม → ใบแจ้งหนี้ “จำลอง” แล้วบันทึก", "The first member signs a partial acceptance → withdraws → signs again → the second member signs → invoice, Simulate, save"]],
  ["fin", "fnc-pay", ["ใบสำคัญและการจ่าย", "Voucher and payment"], ["ด่านตรวจก่อนจ่ายตรวจตรวจรับ ใบแจ้งหนี้ และหลักประกัน ยอดสุทธิหักค่าปรับ", "The payment gate checks acceptance, the invoice and the guarantee; the net amount is after the penalty"],
    ["การเงินทำใบสำคัญจากงวดที่ผ่านด่าน → ตรวจ → ผู้บริหารอนุมัติ → กลับไปที่สัญญาเห็นสถานะใบสำคัญบนงวดที่ 1", "Finance makes the voucher from the phase → checks it → the executive approves → back on the contract, see the voucher on phase 1"]],
  ["proc", "prc-contracts", ["ขยายเวลา ถอน และลดค่าปรับ", "Extension, withdrawal and a penalty waiver"], ["การแก้ไขสัญญาที่ยังรออนุมัติถอนได้ ค่าปรับที่ลดหลังอนุมัติไหลเข้าใบสำคัญ", "A pending change can be withdrawn; an approved waiver flows into the voucher"],
    ["เสนอขยายเวลางวดที่ 2 → “ถอน” → เสนอใหม่ หัวหน้าพัสดุอนุมัติ → “ข้อมูล ณ” เลื่อนให้ส่งมอบช้า เห็นค่าปรับ → “งดหรือลดค่าปรับ” แก้ไขแล้วผู้บริหารอนุมัติ", "Propose extending phase 2 → withdraw → propose again, the head approves → move the date so delivery is late, see the penalty → propose a waiver, the executive approves"]],
  ["proc", "prc-cases", ["ปิดสัญญาและแฟ้ม", "Close the contract and the case"], ["ปิดแฟ้มเมื่อตรวจรับและจ่ายครบ คืนหลักประกันแล้ว สัญญาปิดพร้อมกัน รายการในแผนเป็น “ปิด”", "The case closes when everything is accepted and paid and the guarantee is returned; the contract closes with it and the plan item shows closed"],
    ["ตรวจรับและจ่ายงวดที่ 2 → บันทึกการคืนหลักประกัน → แฟ้มขั้น 12 บันทึกบทเรียนแล้ว “ปิดแฟ้ม” → ดูสถานะสัญญาและแผน", "Accept and pay phase 2 → record the guarantee return → step 12, write the lessons, close the case → see the contract and plan status"]],
  ["proc", "prc-cases", ["ทางเลือก: ล้ม เริ่มใหม่ และยกเลิก", "Alternative: fail, rerun and cancel"], ["รอบเดิมเก็บไว้เป็นประวัติ รอบใหม่เริ่มสะอาด ยกเลิกแล้ววงเงินที่จองคืนบรรทัด", "The old round is kept as history and the new one starts clean; a cancellation releases the reservation"],
    ["แฟ้มที่ไม่มีผู้ยื่น → ลิ้นชัก “ล้มแล้วเริ่มใหม่” → แท็บรอบก่อนหน้า → “ยกเลิกการจัดซื้อ” ใส่เหตุผล → ดูใบขอเป็นยกเลิกและรายการกลับเป็นอยู่ในแผน", "A case with no bidders → Failed, rerun from its drawer → the earlier rounds tab → cancel with a reason → the requisition is cancelled and the item is planned again"]],
];
PE2E.forEach(([role, link, title, say, doo], i) => DEMO.push({ t: `P-E${String(i + 1).padStart(2, "0")}`, part: "pe2e", role, link, title, say, do: doo }));
