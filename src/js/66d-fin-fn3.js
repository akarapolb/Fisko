// Fisko Finance round FN3 (Finance design v0.1, chapter 6.3): advances (เงินยืม), clauses 55 to 68.
// - Every user asks for and clears their own advances from My Workspace → My advances (FR-FN-18, 21).
// - Checks before approval (FR-FN-19, R-FN-05): no open advance (clause 59), items the budget may lend for
//   (clause 63), travel at most 90 days (64), cross-year limits (62), non-budget money (60), collateral (58), SD-12.
// - Approval by the payment authority (56) and payment by e-Payment (57); the clock starts on payment (FR-FN-20).
// - Clearing with objections and a 15-day fix clock (65), a receipt for the evidence (66), cash back or a top-up voucher.
// - Overdue → demand within 30 days (68) → report to the head of the agency (FR-FN-22). Register with ageing (FR-FN-23).
// - Travel calculator from the M10 rates (FR-FN-24).
// States: request A1 → approved A2 → paid A3 → clearing A4 (objected loops back) → cleared A5; rejected, cancelled.
let ADV_OPEN = null, ADV_F = "open";
const ADV_T = { travel: ["เดินทางไปราชการ", "Official travel"], station: ["ไปประจำต่างสำนักงาน ต่างประเทศ หรือกลับภูมิลำเนา", "Posting elsewhere, abroad or returning home"], other: ["ปฏิบัติราชการอื่น", "Other official work"] };
const ADV_ST = {
  request: [["รออนุมัติ", "Awaiting approval"], "p-warn", "A1"], approved: [["อนุมัติแล้ว รอจ่าย", "Approved, to be paid"], "p-info", "A2"], paid: [["จ่ายแล้ว รอส่งใช้", "Paid, to be cleared"], "p-info", "A3"],
  clearing: [["ส่งใบสำคัญแล้ว รอตรวจ", "Evidence sent, being checked"], "p-info", "A4"], objected: [["ถูกทักท้วง รอแก้", "Objection to fix"], "p-bad", "A4"], cleared: [["ส่งใช้ครบ", "Cleared"], "p-ok", "A5"],
  rejected: [["ไม่อนุมัติ", "Not approved"], "p-mute", "—"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute", "—"],
};
// Items the budget may lend for (clause 63); equipment is listed only so the check can be shown.
const ADV_ITEMS = { perdiem: [["เบี้ยเลี้ยง", "Per diem"], true], hotel: [["ค่าที่พัก", "Accommodation"], true], transport: [["ค่าพาหนะ", "Transport"], true], material: [["ค่าใช้สอยและวัสดุ", "Services and materials"], true], temp: [["ค่าจ้างชั่วคราว", "Temporary hire"], true], fee: [["ค่าตอบแทน", "Compensation"], true], asset: [["ครุภัณฑ์", "Equipment"], false] };
const OPEN_ADV = ["paid", "clearing", "objected"];
const advOf = id => (S.advances || []).find(a => a.id === id);
const advAmt = a => a.approvedAmt || a.amount;
const advLeft = a => (a.state === "cleared" ? 0 : OPEN_ADV.includes(a.state) ? advAmt(a) : 0);
const nextAdv = () => `AD-${FAM_FY}-${String(Math.max(0, ...(S.advances || []).filter(a => a.id.startsWith(`AD-${FAM_FY}-`)).map(a => Number(a.id.split("-")[2]) || 0)) + 1).padStart(3, "0")}`;
const fyStart = fy => `${fy - 544}-10-01`;
// Due date to clear (R-FN-05, clause 65).
function advDue(a) {
  if (!a.paid) return null;
  const c = fcfg();
  if (a.type === "travel") return addDays(a.returned || a.end, c.advTravel);
  return addDays(a.paid.t.slice(0, 10), c.advOther);
}
const advOverdue = a => ["paid", "objected"].includes(a.state) && advDue(a) && daysUntil(advDue(a)) < 0;
function advAge(a) {
  if (!OPEN_ADV.includes(a.state)) return null;
  const d = -daysUntil(advDue(a));
  return d <= 0 ? "ok" : d <= 15 ? "d15" : d <= 30 ? "d30" : "d30p";
}
const AGE = { ok: ["ยังไม่ครบกำหนด", "Not yet due"], d15: ["เลย 1–15 วัน", "1–15 days late"], d30: ["เลย 16–30 วัน", "16–30 days late"], d30p: ["เลยเกิน 30 วัน", "Over 30 days late"] };
// Checks before approval (R-FN-05). "warn" never blocks.
function advChecks(a) {
  const out = [], add = (id, ok, text) => out.push({ id, ok, text });
  const open = (S.advances || []).filter(x => x.borrower === a.borrower && x.id !== a.id && OPEN_ADV.includes(x.state));
  add("ข้อ 59", !open.length, open.length ? L(`ยังมีเงินยืมค้าง ${open.map(x => x.id).join(", ")} ต้องส่งใช้ให้ครบก่อน`, `Still owes ${open.map(x => x.id).join(", ")}; clear it first`) : L("ไม่มีเงินยืมค้าง", "No open advance"));
  const bad = a.items.filter(i => !(ADV_ITEMS[i.k] || [0, false])[1]);
  add("ข้อ 63", !bad.length, bad.length ? L(`ยืมสำหรับ ${bad.map(i => tx(ADV_ITEMS[i.k][0])).join(", ")} ไม่ได้`, `Can't lend for ${bad.map(i => tx(ADV_ITEMS[i.k][0])).join(", ")}`) : L("ทุกรายการอยู่ในงบที่ยืมได้", "Every item is one the budget may lend for"));
  const days = dayDiff(a.start, a.end) + 1;
  if (a.type === "travel") add("ข้อ 64", days <= 90, L(`เดินทาง ${days} วัน (ไม่เกิน 90)`, `${days} travel days (at most 90)`));
  const nfy = fyStart(FAM_FY + 1);
  if (a.end >= nfy) { const into = dayDiff(nfy, a.end) + 1, lim = a.type === "travel" ? 90 : 30; add("ข้อ 62", into <= lim, L(`ใช้ในปีงบประมาณถัดไป ${into} วัน (ไม่เกิน ${lim})`, `${into} days into next year (at most ${lim})`)); }
  if (a.source === "nonbudget") add("ข้อ 60", true, L("เงินนอกงบประมาณ: หัวหน้าส่วนราชการอนุมัติ", "Non-budget money: the head of the agency approves"));
  if (a.temp) add("ข้อ 58", !!(a.collateral || "").trim(), (a.collateral || "").trim() ? L(`หลักประกัน: ${a.collateral}`, `Collateral: ${a.collateral}`) : L("ผู้ยืมไม่มีเงินที่หักได้ ต้องมีหลักทรัพย์หรือผู้ค้ำประกัน", "The borrower has no pay to deduct from; needs collateral or a guarantor"));
  if (a.source === "budget") add("ข้อ 18", a.amount <= famHeadroom(a.line) + (["approved", ...OPEN_ADV].includes(a.state) ? advAmt(a) : 0), L("ไม่เกินวงเงินคงเหลือของรายการจัดสรร", "Within the line's free amount"));
  return out;
}
const advLog = (a, act, note) => (a.log = a.log || []).push({ t: nowIso(), by: me().id, act, note: note || "" });
const advTag = a => tag(`${ADV_ST[a.state][2]} · ${tx(ADV_ST[a.state][0])}`, advOverdue(a) ? "p-bad" : ADV_ST[a.state][1]);
const advDueTxt = a => { const d = advDue(a); return d && OPEN_ADV.includes(a.state) ? `${dotI(clockDot(d))}${clockTxt(d)}` : "—"; };

SOD_RULES.push(["SD-12", ["ผู้ยืมอนุมัติเงินยืมของตนไม่ได้ และตรวจใบสำคัญส่งใช้ของตนไม่ได้", "A borrower can't approve their own advance or check their own clearing"]]);
SOD_STEPS.push([["ยืมเงิน", "Borrow"], ["อนุมัติหรือตรวจใบสำคัญของเงินยืมนั้น", "Approve the advance or check its clearing"], "SD-12"]);

// ---------- detail (shared by My advances and F4) ----------
function advDetail(a, where) {
  const mine = a.borrower === me().id, fin = isFinRole(), ch = advChecks(a), due = advDue(a);
  // [action, label, kind, opens the reason box] (Finance CRUD UI-F6): approving asks for the amount, with a reason when it is less.
  const act = [];
  if (where === "fin" && canSpend() && a.state === "request") act.push(["approve", L("อนุมัติ", "Approve"), "primary", true], ["reject", L("ไม่อนุมัติ", "Reject"), "danger", true]);
  if (where === "fin" && ROLE === "fin" && a.state === "approved") act.push(["pay", L("จ่ายเงินยืม (e-Payment)", "Pay the advance (e-Payment)"), "primary", false]);
  if (where === "fin" && fin && a.state === "clearing") act.push(["accept", L("ตรวจผ่าน รับใบสำคัญ", "Accept the clearing"), "primary", false], ["object", L("ทักท้วง", "Object"), "danger", true]);
  if (where === "fin" && ROLE === "finhead" && advOverdue(a) && !a.demand) act.push(["demand", L("ออกหนังสือเรียกชดใช้ (ข้อ 68)", "Issue a demand (clause 68)"), "primary", false]);
  if (where === "fin" && ROLE === "finhead" && a.demand && !a.reported && OPEN_ADV.includes(a.state)) act.push(["ddue", L("เปลี่ยนวันครบกำหนดเรียกชดใช้", "Change the demand's due date"), "", true]);
  if (where === "fin" && ROLE === "finhead" && a.demand && !a.reported && OPEN_ADV.includes(a.state) && daysUntil(a.demand.due) < 0) act.push(["report", L("รายงานหัวหน้าส่วนราชการ", "Report to the head of the agency"), "danger", false]);
  if ((mine || (where === "fin" && ROLE === "fin" && a.enteredBy)) && a.state === "request") act.push(["edit", L("แก้ไขคำขอ", "Edit the request"), "", false]);
  if (mine && ["request", "approved"].includes(a.state)) act.push(["cancel", a.state === "request" ? L("ยกเลิกคำขอ", "Cancel the request") : L("ยกเลิกเงินยืม (ยังไม่ได้รับเงิน)", "Cancel (not paid yet)"), "ghost", true]);
  else if (where === "fin" && ROLE === "fin" && a.state === "approved") act.push(["cancel", L("ยกเลิกเงินยืมที่ยังไม่จ่าย", "Cancel before payment"), "danger", true]);
  if (mine && a.state === "clearing") act.push(["crecall", L("ดึงใบสำคัญกลับมาแก้ไข", "Take the clearing back to fix"), "", true]);
  const ask = FIN_ASK && FIN_ASK.key === "adv" && act.find(x => x[0] === FIN_ASK.act);
  const dmax = a.demand && advDue(a) ? addDays(advDue(a), fcfg().demandDays) : null;
  const askHtml = ask && ask[0] === "ddue" ? finAskForm("adv", "ddue", ask[1], { impact: L(`ไม่เกิน ${fcfg().demandDays} วันนับจากวันครบกำหนดส่งใช้ (ข้อ 68) คือไม่เกิน ${fdate(dmax)}`, `At most ${fcfg().demandDays} days after the clear-by date (clause 68), so by ${fdate(dmax)}`),
      extra: `<label for="adv-ddue">${L("วันครบกำหนดใหม่", "New due date")}</label><input type="date" id="adv-ddue" value="${a.demand.due}" min="${TODAY}" max="${dmax}" style="max-width:200px">` })
    : ask ? finAskForm("adv", ask[0], ask[1], ask[0] === "approve"
      ? { need: false, whyLabel: L("เหตุผล (เมื่ออนุมัติน้อยกว่ายอดขอ ข้อ 59)", "Reason (when approving less than asked, clause 59)"), extra: `<label for="adv-amt">${L("ยอดอนุมัติ (บาท)", "Amount approved (baht)")}</label><input type="number" id="adv-amt" value="${a.amount}" min="1" max="${a.amount}" step="1" style="max-width:180px">` }
      : { danger: ask[2] === "danger", impact: ask[0] === "cancel" && a.state === "approved" ? L("คืนวงเงินที่อนุมัติให้รายการจัดสรร ผู้ยืมได้รับแจ้ง", "Gives the approved amount back to the line; the borrower is told") : ask[0] === "crecall" ? L("กลับไปแก้ใบสำคัญแล้วส่งใหม่ นาฬิกาส่งใช้เดินต่อ", "Fix the clearing and send it again; the clearing clock keeps running") : ask[0] === "object" ? L(`ผู้ยืมต้องแก้ภายใน ${fcfg().advFix} วัน`, `The borrower fixes it within ${fcfg().advFix} days`) : ask[0] === "cancel" ? L("คำขอนี้ยกเลิก ยังยื่นใหม่ได้", "This request is cancelled; you can ask again") : "" }) : "";
  const cl = a.clearing;
  return `<section class="panel" id="adv-detail"><header><h2><span class="mono">${a.id}</span> · ${esc(tx(a.purpose))}</h2><span class="sp"></span>${advTag(a)}<button class="btn ghost" type="button" id="adv-close">${L("ปิด", "Close")}</button></header>
    <div class="body">${finDrTabs("adv", [["view", L("รายละเอียด", "Details"), `
      <div class="grid2" style="gap:16px">
        <div>
          <p style="margin:0 0 4px"><b style="font-weight:600">${esc(userName(a.borrower))}</b> <span class="sub">${unitName(a.unit)} · ${tx(ADV_T[a.type])}</span></p>
          <p class="sub" style="margin:0 0 4px">${fdate(a.start)} – ${fdate(a.end)}${a.returned ? ` · ${L("กลับถึง", "back on")} ${fdate(a.returned)}` : ""} · ${a.source === "budget" ? `<span class="mono">${a.line}</span> ${esc(lineLabel(famLine(a.line)))}` : L("เงินนอกงบประมาณ", "Non-budget money")}</p>
          <p class="sub" style="margin:0">${L("สัญญายืมเงิน", "Loan contract")} <span class="mono">${a.contract ? a.contract.no : "—"}</span> ${L("(2 ฉบับ ข้อ 61)", "(2 copies, clause 61)")}${a.paid ? ` · ${L("จ่าย", "paid")} ${fdate(a.paid.t)} <span class="mono">${esc(a.paid.ref)}</span>` : ""}</p>
          ${due && OPEN_ADV.includes(a.state) ? `<p style="margin:6px 0 0">${L("ส่งใช้ภายใน", "Clear by")} ${advDueTxt(a)} <span class="sub">(${a.type === "travel" ? L("15 วันนับจากวันกลับ", "15 days from return") : L("30 วันนับจากวันรับเงิน", "30 days from payment")}, ${L("ข้อ 65", "clause 65")})</span></p>` : ""}
          ${a.objection && a.state === "objected" ? `<p style="margin:6px 0 0;color:var(--bad)">${L("ข้อทักท้วง", "Objection")}: ${esc(a.objection.why)} · ${L("แก้ภายใน", "fix by")} ${clockTxt(a.objection.due)}</p>` : ""}
          ${a.demand ? `<p class="sub" style="margin:6px 0 0">${L("หนังสือเรียกชดใช้", "Demand")} ${fdate(a.demand.t)} · ${L("ชดใช้ภายใน", "repay by")} ${fdate(a.demand.due)}${a.reported ? ` · ${L("รายงานหัวหน้าส่วนราชการแล้ว", "reported to the head of the agency")} ${fdate(a.reported.t)}` : ""}</p>` + (a.demand.moves || []).map(x => `<p class="sub" style="margin:2px 0 0">${L("เลื่อนวันครบกำหนด", "Due date moved")} ${fdate(x.from)} → ${fdate(x.to)} · ${esc(x.why)}</p>`).join("") + (a.demand.closed ? `<p class="sub" style="margin:2px 0 0">${dotI("ok")}${L("ปิดหนังสือเรียกชดใช้แล้ว ส่งใช้ครบ", "Demand closed: cleared in full")}</p>` : "") : ""}
        </div>
        <div>
          <table style="width:100%"><tbody>${a.items.map(i => `<tr><td>${tx(ADV_ITEMS[i.k][0])}</td><td class="n">${fmt(i.amt)}</td></tr>`).join("")}
            <tr><td><b>${L("ยอดขอยืม", "Requested")}</b></td><td class="n"><b>${fmt(a.amount)}</b></td></tr>
            ${a.approvedAmt && a.approvedAmt !== a.amount ? `<tr><td>${L("อนุมัติเท่าที่จำเป็น", "Approved as needed")}</td><td class="n">${fmt(a.approvedAmt)}</td></tr>` : ""}
            ${cl ? `<tr><td>${L("ใช้จ่ายจริง", "Actually spent")}</td><td class="n">${fmt(cl.spent)}</td></tr><tr><td>${cl.spent < advAmt(a) ? L("เงินเหลือคืน", "Cash returned") : L("จ่ายเพิ่ม", "Top-up due")}</td><td class="n">${fmt(Math.abs(advAmt(a) - cl.spent))}</td></tr>` : ""}
          </tbody></table>
          ${a.receipt ? `<div class="sub">${L("ใบรับใบสำคัญ", "Evidence receipt")} <span class="mono">${a.receipt.no}</span> · ${fdate(a.receipt.t)}${a.topup ? ` · ${L("ใบขอเบิกจ่ายเพิ่ม", "top-up voucher")} <span class="mono">${a.topup}</span>` : ""}</div>` : ""}
        </div>
      </div>
      ${["request", "approved"].includes(a.state) ? `<h3 style="margin:12px 0 6px;font-size:15px">${L("ตรวจก่อนอนุมัติ", "Checks before approval")}</h3>${ch.map(k => `<div style="margin:2px 0">${dotI(k.ok ? "ok" : "bad")}<span class="mono">${k.id}</span> ${esc(k.text)}</div>`).join("")}` : ""}
`], ["hist", `${L("ประวัติ", "History")} (${(a.log || []).length})`, finLogHtml(a.log, a.id)]])}
      ${askHtml || (act.length ? `<div class="row cr-acts" style="margin-top:12px;flex-wrap:wrap">${act.map(([k, l, kind, w]) => (w ? finAskBtn("adv", k, l, kind) : `<button class="btn ${kind}" type="button" data-adv="${k}">${l}</button>`)).join("")}</div>` : "")}
      ${mine && ["paid", "objected"].includes(a.state) ? clearForm(a) : ""}
    </div></section>`;
}
function clearForm(a) {
  return `<form class="inline-form" id="adv-clear" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
    <div class="f" style="flex:1 1 100%"><b>${L("ส่งใช้เงินยืม", "Clear this advance")}</b> <span class="sub">${L("ส่งใบสำคัญและเงินเหลือ (ถ้ามี) ข้อ 65", "Send the evidence and any cash left (clause 65)")}</span></div>
    ${a.type === "travel" ? `<div class="f" style="flex:0 1 170px"><label for="ac-back">${L("วันกลับถึง", "Back on")}</label><input type="date" id="ac-back" value="${a.returned || a.end}" required></div>` : ""}
    <div class="f" style="flex:0 1 160px"><label for="ac-spent">${L("ใช้จ่ายจริง (บาท)", "Spent (baht)")}</label><input type="number" id="ac-spent" min="0" step="1" value="${a.clearing ? a.clearing.spent : advAmt(a)}" required></div>
    <div class="f" style="flex:1 1 260px"><label for="ac-note">${L("หมายเหตุ", "Note")}</label><input type="text" id="ac-note" value="${esc(a.clearing ? a.clearing.note : "")}"></div>
    <div class="f" style="flex:1 1 100%"><label><input type="checkbox" id="ac-rcpt" required> ${L("แนบใบเสร็จหรือใบรับรองการจ่ายเงินครบแล้ว (ข้อ 46–48)", "Receipts or payment certificates are attached (clauses 46–48)")}</label></div>
    <button class="btn primary" type="submit">${L("ส่งใบสำคัญ", "Send the evidence")}</button></form>`;
}

// ---------- the request form: new, edited by the borrower, or entered by Finance for someone (FR-FC-21) ----------
let ADV_EDIT = null; // null, an advance id being edited, or "new" (Finance entering a request for someone)
const ADV_Q = { q: "", unit: "", sort: null };
const advItemRow = (k, amt) => `<div class="row" data-airow style="gap:8px;flex:1 1 100%;align-items:flex-end;flex-wrap:nowrap">
  <div class="f" style="flex:1 1 180px"><select data-aik aria-label="${L("รายการ", "Item")}"><option value="">—</option>${Object.keys(ADV_ITEMS).map(x => `<option value="${x}" ${x === k ? "selected" : ""}>${tx(ADV_ITEMS[x][0])}</option>`).join("")}</select></div>
  <div class="f" style="flex:0 1 130px"><input type="number" data-aia min="0" step="1" value="${amt || ""}" aria-label="${L("บาท", "Baht")}" placeholder="${L("บาท", "Baht")}"></div>
  <button class="btn ghost" type="button" data-airm aria-label="${L("ลบรายการนี้", "Remove this item")}">✕</button></div>`;
function advForm(a, forOther) {
  const who = a ? S.users.find(u => u.id === a.borrower) : me(), unitLines = famLines().filter(l => l.type === "ope" && l.unit === who.unit);
  const lines = forOther || !unitLines.length ? famLines().filter(l => l.type === "ope") : unitLines;
  const v = a || { type: "travel", purpose: ["", ""], start: addDays(TODAY, 7), end: addDays(TODAY, 9), source: "budget", fund: null, nbLine: null, line: (lines[0] || {}).id, items: [{ k: "perdiem" }, { k: "hotel" }, { k: "transport" }], temp: false, collateral: "" };
  const nb = v.fund ? `${v.fund}|${v.nbLine}` : "";
  return `<form class="inline-form" id="adv-form" data-edit="${a ? a.id : ""}" data-other="${forOther ? 1 : ""}">
      ${forOther && !a ? `<div class="f" style="flex:1 1 100%"><label for="af-who">${L("ผู้ยืม", "Borrower")}</label><select id="af-who">${S.users.filter(u => u.active !== false && u.role !== "admin").map(u => `<option value="${u.id}">${esc(userName(u.id))} · ${esc(unitName(u.unit))}</option>`).join("")}</select><div class="sub">${L("ผู้ยืมยังเป็นเจ้าของคำขอ ผู้บันทึกแทนอนุมัติคำขอนี้ไม่ได้ (SD-12)", "The borrower still owns the request; whoever enters it can't approve it (SD-12)")}</div></div>` : ""}
      <div class="f" style="flex:1 1 220px"><label for="af-type">${L("ประเภท", "Type")}</label><select id="af-type">${Object.keys(ADV_T).map(k => `<option value="${k}" ${v.type === k ? "selected" : ""}>${tx(ADV_T[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:2 1 260px"><label for="af-purpose">${L("วัตถุประสงค์", "Purpose")}</label><input type="text" id="af-purpose" value="${esc(tx(v.purpose))}" required></div>
      <div class="f" style="flex:0 1 160px"><label for="af-start">${L("ตั้งแต่", "From")}</label><input type="date" id="af-start" value="${v.start}" required></div>
      <div class="f" style="flex:0 1 160px"><label for="af-end">${L("ถึง", "To")}</label><input type="date" id="af-end" value="${v.end}" required></div>
      <div class="f" style="flex:0 1 170px"><label for="af-src">${L("แหล่งเงิน", "Source")}</label><select id="af-src"><option value="budget">${L("เงินงบประมาณ", "Budget")}</option><option value="nonbudget" ${v.source === "nonbudget" ? "selected" : ""}>${L("เงินนอกงบประมาณ", "Non-budget money")}</option></select></div>
      ${typeof nbLineOptions === "function" && nbLineOptions() ? `<div class="f" style="flex:2 1 260px"><label for="af-nb">${L("รายการในแผนเงินนอกงบประมาณ (ถ้าใช้)", "Non-budget plan line (if used)")}</label><select id="af-nb"><option value="">—</option>${nbLineOptions().replace(`value="${nb}"`, `value="${nb}" selected`)}</select></div>` : ""}
      <div class="f" style="flex:2 1 240px"><label for="af-line">${L("รายการจัดสรร", "Allocation line")}</label><select id="af-line">${lines.map(l => `<option value="${l.id}" ${v.line === l.id ? "selected" : ""}>${esc(lineLabel(l))}</option>`).join("")}</select></div>
      <div class="f" style="flex:1 1 100%"><span class="cr-lab">${L("รายการค่าใช้จ่าย", "Items")}</span><div id="af-items">${v.items.map(i => advItemRow(i.k, i.amt)).join("")}</div>
        <div class="row" style="gap:8px;margin-top:6px"><button class="btn ghost" type="button" id="af-addrow">+ ${L("เพิ่มรายการ", "Add an item")}</button><button class="btn ghost" type="button" id="af-calc">${L("คำนวณเบี้ยเลี้ยงและที่พักจากจำนวนวัน", "Work out per diem and accommodation from the dates")}</button></div></div>
      <div class="f" style="flex:1 1 100%"><label><input type="checkbox" id="af-temp" ${v.temp ? "checked" : ""}> ${L("ผู้ยืมไม่มีเงินเดือนที่หักส่งใช้ได้ (เช่น ลูกจ้างชั่วคราว)", "The borrower has no salary to deduct from (for example a temporary worker)")}</label></div>
      <div class="f" style="flex:1 1 280px"><label for="af-coll">${L("หลักประกันหรือผู้ค้ำประกัน (ข้อ 58)", "Collateral or guarantor (clause 58)")}</label><input type="text" id="af-coll" value="${esc(v.collateral || "")}"></div>
      <div class="row" style="gap:8px;flex:1 1 100%"><button class="btn primary" type="submit">${a ? L("บันทึกการแก้ไข", "Save the changes") : forOther ? L("บันทึกคำขอแทน", "Enter the request") : L("ส่งคำขอยืม", "Send the request")}</button>${a || forOther ? `<button class="btn ghost" type="button" data-afx>${L("ยกเลิก", "Cancel")}</button>` : ""}</div></form>`;
}
// Saves the form. vals: { who, type, purpose, start, end, src, nb, line, items, temp, coll }. Returns an error text or the advance.
function advSave(vals, a) {
  const items = vals.items.filter(i => i.k && i.amt > 0);
  if (!items.length) return L("ใส่อย่างน้อยหนึ่งรายการ", "Add at least one item");
  if (!vals.purpose) return L("ใส่วัตถุประสงค์", "Give the purpose");
  if (vals.end < vals.start) return L("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", "The end can't be before the start");
  if (vals.src === "nonbudget" && !vals.nb) return L("เลือกรายการในแผนเงินนอกงบประมาณ", "Pick the non-budget plan line");
  const set = x => Object.assign(x, { type: vals.type, purpose: [vals.purpose, vals.purpose], start: vals.start, end: vals.end, items, amount: sumv(items.map(i => i.amt)), source: vals.src, line: vals.line,
    fund: vals.src === "nonbudget" ? vals.nb.split("|")[0] : null, nbLine: vals.src === "nonbudget" ? vals.nb.split("|")[1] : null, temp: vals.temp, collateral: vals.coll });
  if (a) {
    const old = a.amount; set(a);
    advLog(a, ["แก้ไขคำขอ", "Edited the request"], old !== a.amount ? `${fmt(old)} → ${fmt(a.amount)}` : ""); audit(["แก้ไขคำขอยืมเงิน", "Edited an advance request"], `${a.id} · ${fmt(old)} → ${fmt(a.amount)}`);
    notify(["exec"], [`คำขอยืมเงิน ${a.id} ถูกแก้ไข ${fmt(a.amount)} บาท`, `Advance request ${a.id} was changed: ${fmt(a.amount)} baht`], "fnc-adv");
    return a;
  }
  const who = S.users.find(u => u.id === (vals.who || me().id));
  const n = set({ id: nextAdv(), borrower: who.id, unit: who.unit, returned: null, approvedAmt: null, state: "request", t: nowIso(), log: [] });
  if (who.id !== me().id) n.enteredBy = me().id;
  S.advSeqC = (S.advSeqC || 0) + 1; n.contract = { no: `สย.${String(S.advSeqC).padStart(3, "0")}/${FAM_FY}`, t: nowIso() };
  advLog(n, [n.enteredBy ? "การเงินบันทึกคำขอแทนผู้ยืม" : "ขอยืมเงิน", n.enteredBy ? "Entered by Finance for the borrower" : "Requested"], fmt(n.amount)); (S.advances = S.advances || []).push(n);
  audit(["ขอยืมเงิน", "Asked for an advance"], `${n.id} · ${fmt(n.amount)}${n.enteredBy ? ` · ${L("บันทึกแทน", "entered for")} ${userName(n.borrower)}` : ""}`);
  notify(["exec"], [`คำขอยืมเงิน ${n.id} ${fmt(n.amount)} บาท รออนุมัติ`, `Advance request ${n.id} (${fmt(n.amount)} baht) is waiting for approval`], "fnc-adv");
  return n;
}
function bindAdvForm() {
  const f = $("#adv-form"); if (!f) return;
  const c = fcfg(), rows = () => $$("#af-items [data-airow]");
  const bindRm = () => $$("[data-airm]").forEach(b => (b.onclick = () => { if (rows().length > 1) b.closest("[data-airow]").remove(); else toast(L("ต้องมีอย่างน้อยหนึ่งรายการ", "Keep at least one item")); }));
  const addRow = (k, amt) => { $("#af-items").insertAdjacentHTML("beforeend", advItemRow(k, amt)); bindRm(); };
  bindRm();
  $("#af-addrow").onclick = () => { addRow("", ""); const r = rows(); r[r.length - 1].querySelector("select").focus(); };
  $("#af-calc").onclick = () => { const d = Math.max(1, dayDiff($("#af-start").value, $("#af-end").value) + 1); while (rows().length < 2) addRow("", ""); const r = rows();
    r[0].querySelector("[data-aik]").value = "perdiem"; r[0].querySelector("[data-aia]").value = d * c.perDiem; r[1].querySelector("[data-aik]").value = "hotel"; r[1].querySelector("[data-aia]").value = Math.max(0, d - 1) * c.hotel; };
  const x = $("[data-afx]"); if (x) x.onclick = () => { ADV_EDIT = null; route(); };
  f.onsubmit = e => {
    e.preventDefault();
    const a = f.dataset.edit ? advOf(f.dataset.edit) : null;
    const vals = { who: $("#af-who") ? $("#af-who").value : null, type: $("#af-type").value, purpose: $("#af-purpose").value.trim(), start: $("#af-start").value, end: $("#af-end").value, src: $("#af-src").value, nb: $("#af-nb") ? $("#af-nb").value : "",
      line: $("#af-line").value, items: rows().map(r => ({ k: r.querySelector("[data-aik]").value, amt: Math.round(Number(r.querySelector("[data-aia]").value)) })), temp: $("#af-temp").checked, coll: $("#af-coll").value.trim() };
    const r = advSave(vals, a);
    if (typeof r === "string") { toast(r); return; }
    ADV_EDIT = null; ADV_OPEN = r.id; const bad = advChecks(r).filter(k => !k.ok);
    commit(); renderShell(); route();
    toast(bad.length ? L(`บันทึกแล้ว แต่ยังติด ${bad.map(k => k.id).join(", ")} ผู้อนุมัติจะอนุมัติไม่ได้จนกว่าจะแก้`, `Saved, but ${bad.map(k => k.id).join(", ")} is not met; it can't be approved until fixed`) : a ? L("บันทึกการแก้ไขแล้ว", "Changes saved") : L("ส่งคำขอแล้ว · รอผู้มีอำนาจอนุมัติ", "Request sent · waiting for approval"));
  };
}

// ---------- My advances (every user) ----------
VIEWS.advances = () => {
  const mine = (S.advances || []).filter(a => a.borrower === me().id), open = mine.filter(a => OPEN_ADV.includes(a.state)), c = fcfg();
  const det = ADV_OPEN && advOf(ADV_OPEN), showDet = det && det.borrower === me().id;
  const editing = ADV_EDIT && ADV_EDIT !== "new" && advOf(ADV_EDIT), mineEd = editing && editing.borrower === me().id && editing.state === "request" ? editing : null;
  return `
  <div class="head"><div><div class="eyebrow">${L("พื้นที่ทำงานของฉัน", "My Workspace")}</div><h1>${L("เงินยืมของฉัน", "My advances")}</h1>
    <p>${L("ขอยืมเงินเพื่อปฏิบัติราชการ และส่งใช้ภายในกำหนด ตามระเบียบกระทรวงการคลังฯ พ.ศ. 2562 หมวด 5", "Borrow for official work and clear it on time, under chapter 5 of the Finance Ministry regulation of 2562")}</p></div></div>
  ${showDet ? advDetail(det, "me") : ""}
  <section class="panel"><header><h2>${L("เงินยืมของฉัน", "My advances")}</h2><span class="sp"></span><span class="sub">${open.length ? `${L("ค้างส่งใช้", "Open")} ${fmt(sumv(open.map(advAmt)))} ${L("บาท", "baht")}` : L("ไม่มีเงินยืมค้าง", "Nothing open")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("วัตถุประสงค์", "Purpose")}</th><th class="n">${L("ยอด (บาท)", "Amount (baht)")}</th><th>${L("ส่งใช้ภายใน", "Clear by")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${mine.slice().reverse().map(a => `<tr><td class="mono">${a.id}</td><td>${esc(tx(a.purpose))}<div class="sub">${tx(ADV_T[a.type])} · ${fdate(a.start)}–${fdate(a.end)}</div></td><td class="n">${fmt(advAmt(a))}</td><td>${advDueTxt(a)}</td><td>${advTag(a)}</td><td><button class="btn ${["paid", "objected"].includes(a.state) ? "primary" : "ghost"}" type="button" data-advopen="${a.id}">${["paid", "objected"].includes(a.state) ? L("ส่งใช้", "Clear") : L("เปิด", "Open")}</button></td></tr>`).join("")
        || `<tr><td colspan="6" class="sub">${L("ยังไม่เคยยืม", "No advances yet")}</td></tr>`}</tbody></table></div></section>
  <section class="panel"><header><h2>${mineEd ? `${L("แก้ไขคำขอ", "Edit the request")} <span class="mono">${mineEd.id}</span>` : L("ขอยืมเงิน", "Ask for an advance")}</h2><span class="sp"></span><span class="sub">${L("ระบบสร้างสัญญายืมเงินตามแบบ (ข้อ 55)", "The system draws up the loan contract in the set form (clause 55)")}</span></header>
    ${!mineEd && open.length ? `<div class="body"><div class="alert" style="margin:0"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${L("ยังขอยืมใหม่ไม่ได้", "You can't ask for a new advance yet")}</b><p>${L(`มีเงินยืมค้าง ${open.map(a => a.id).join(", ")} ต้องส่งใช้ให้ครบก่อน (ข้อ 59)`, `${open.map(a => a.id).join(", ")} is still open; clear it first (clause 59)`)}</p></div></div></div>` : `<div class="body">${advForm(mineEd, false)}</div>`}</section>`;
};

// ---------- F4 register (finance) ----------
FS.advDetail = () => {
  const ed = ADV_EDIT === "new" ? null : ADV_EDIT && advOf(ADV_EDIT);
  if (ADV_EDIT === "new" || (ed && ed.enteredBy && ed.state === "request" && ROLE === "fin")) return `<section class="panel" id="adv-detail"><header><h2>${ed ? `${L("แก้ไขคำขอ", "Edit the request")} <span class="mono">${ed.id}</span>` : L("บันทึกคำขอยืมแทนผู้ยืม", "Enter a request for a borrower")}</h2><span class="sp"></span><button class="btn ghost" type="button" id="adv-close">${L("ปิด", "Close")}</button></header><div class="body">${advForm(ed || null, true)}</div></section>`;
  const det = ADV_OPEN && advOf(ADV_OPEN); return det ? advDetail(det, "fin") : "";
};
FS.advKpis = () => {
  const A = S.advances || [], open = A.filter(a => OPEN_ADV.includes(a.state)), over = A.filter(advOverdue);
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("เงินยืมค้างส่งใช้", "Open advances")}</span><span class="v">${open.length}</span><span class="d sub">${fmt(sumv(open.map(advAmt)))} ${L("บาท", "baht")}</span></div>
    <div class="kpi hl"><span class="l">${L("เลยกำหนด", "Overdue")}</span><span class="v">${over.length}</span><span class="d" style="color:var(--rail-ink)">${over.filter(a => !a.demand).length} ${L("ยังไม่เรียกชดใช้", "without a demand")}</span></div>
    <div class="kpi"><span class="l">${L("รออนุมัติ / รอจ่าย", "To approve / to pay")}</span><span class="v">${A.filter(a => a.state === "request").length} / ${A.filter(a => a.state === "approved").length}</span></div>
    <div class="kpi"><span class="l">${L("ใบสำคัญรอตรวจ", "Clearings to check")}</span><span class="v">${A.filter(a => a.state === "clearing").length}</span></div>
  </section>`;
};
FS.advRegister = () => {
  const A = S.advances || [], over = A.filter(advOverdue);
  const groups = { open: ["request", "approved", "paid", "clearing", "objected"], over: null, done: ["cleared", "rejected", "cancelled"], all: null };
  const GL = { open: L("กำลังดำเนินการ", "In progress"), over: L("เลยกำหนด", "Overdue"), done: L("ปิดแล้ว", "Closed"), all: L("ทั้งหมด", "All") };
  const Q = ADV_Q, base = k => (k === "over" ? over : groups[k] ? A.filter(a => groups[k].includes(a.state)) : A);
  const pick = k => { let xs = base(k); if (Q.unit) xs = xs.filter(a => a.unit === Q.unit); if (Q.q) { const q = Q.q.toLowerCase(); xs = xs.filter(a => `${a.id} ${userName(a.borrower)} ${tx(a.purpose)}`.toLowerCase().includes(q)); }
    return Q.sort ? xs.slice().sort((a, b) => ((advDue(a) || a.start) < (advDue(b) || b.start) ? -1 : 1) * Q.sort) : xs.slice().reverse(); };
  return `
  <section class="panel"><header><h2>${L("ทะเบียนคุมเงินยืม", "Advance register")}</h2><span class="sp"></span>
    ${segBar(Object.keys(GL).map(k => [k, `${GL[k]} (${pick(k).length})`]), ADV_F, "advf")}</header>
    <div class="cr-bar"><input type="search" class="cr-q" id="advq" value="${esc(Q.q)}" placeholder="${L("ค้นหาเลขที่ ผู้ยืม หรือวัตถุประสงค์", "Search number, borrower or purpose")}" aria-label="${L("ค้นหาเงินยืม", "Search advances")}">
      <select id="advq-unit" aria-label="${L("หน่วยงาน", "Unit")}"><option value="">${L("หน่วยงาน: ทั้งหมด", "Unit: all")}</option>${[...new Set(A.map(a => a.unit))].map(u => `<option value="${u}" ${Q.unit === u ? "selected" : ""}>${esc(unitName(u))}</option>`).join("")}</select>
      <button class="btn ghost" type="button" id="advq-sort" aria-pressed="${!!Q.sort}">${L("เรียงตามวันส่งใช้", "Sort by clear-by date")}${Q.sort ? (Q.sort > 0 ? " ▲" : " ▼") : ""}</button>
      <span class="sp"></span>${ROLE === "fin" ? `<button class="btn primary" type="button" id="adv-new">+ ${L("บันทึกคำขอแทนผู้ยืม", "Enter a request for someone")}</button>` : ""}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ผู้ยืม / วัตถุประสงค์", "Borrower / purpose")}</th><th class="n">${L("ยอด (บาท)", "Amount (baht)")}</th><th>${L("ส่งใช้ภายใน", "Clear by")}</th><th>${L("อายุหนี้", "Age")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${pick(ADV_F).map(a => `<tr${ADV_OPEN === a.id ? ' style="background:var(--tint)"' : ""}><td class="mono">${a.id}</td><td>${esc(userName(a.borrower))} <span class="sub">${unitName(a.unit)}</span><div class="sub">${esc(tx(a.purpose))} · ${tx(ADV_T[a.type])}</div></td><td class="n">${fmt(advAmt(a))}</td><td>${advDueTxt(a)}</td><td class="sub">${advAge(a) ? tx(AGE[advAge(a)]) : "—"}</td><td>${advTag(a)}${a.demand ? `<div class="sub">${L("เรียกชดใช้แล้ว", "Demand issued")}</div>` : ""}</td><td><button class="btn ghost" type="button" data-advopen="${a.id}">${L("เปิด", "Open")}</button></td></tr>`).join("")
        || `<tr><td colspan="7" class="sub">${L("ไม่มีรายการในกลุ่มนี้", "Nothing in this group")}</td></tr>`}</tbody></table></div></section>`;
};
FS.advAge = () => {
  const open = (S.advances || []).filter(a => OPEN_ADV.includes(a.state));
  const byAge = Object.keys(AGE).map(k => { const xs = open.filter(a => advAge(a) === k); return [k, xs.length, sumv(xs.map(advAmt))]; });
  return `
  <section class="panel"><header><h2>${L("อายุหนี้เงินยืมค้าง", "Ageing of open advances")}</h2><span class="sp"></span><span class="sub">${L("นับจากวันครบกำหนดส่งใช้", "From the clearing due date")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ช่วง", "Band")}</th><th class="n">${L("จำนวน", "Count")}</th><th class="n">${L("ยอด (บาท)", "Amount (baht)")}</th></tr></thead>
      <tbody>${byAge.map(([k, n, s]) => `<tr><td>${dotI(k === "ok" ? "ok" : k === "d15" ? "warn" : "bad")}${tx(AGE[k])}</td><td class="n">${n}</td><td class="n">${fmt(s)}</td></tr>`).join("")}</tbody></table></div></section>`;
};

// ---------- actions ----------
FIN_ASK_RUN.adv = (k, why) => { const a = ADV_OPEN && advOf(ADV_OPEN); return a ? advAct(a, k, why) : undefined; };
// Reason-needing actions return an error text for the reason box instead of acting.
function advAct(a, k, why0) {
  const why = String(why0 || "").trim(), done = (msg, roles, text, link) => { if (roles) notify(roles, text, link || "fnc-adv"); commit(); renderShell(); route(); toast(msg); };
  if (k === "edit") { ADV_EDIT = a.id; route(); const f = $("#adv-form input, #adv-form select"); if (f) f.focus(); return; }
  if (["reject", "object", "cancel", "crecall", "ddue"].includes(k) && why.length < CR_WHY_MIN) return L(`ใส่เหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร`, `Give a reason of at least ${CR_WHY_MIN} characters`);
  if (k === "approve") {
    if (!sodCheck("SD-12", sodActors("exec", "spend"), [a.borrower], a.id)) return;
    const bad = advChecks(a).filter(c => !c.ok); if (bad.length) { toast(`${L("ยังอนุมัติไม่ได้", "Can't approve yet")}: ${bad.map(c => c.id).join(", ")}`); return; }
    const amt = Math.round(Number(($("#adv-amt") || { value: a.amount }).value));
    if (!(amt > 0) || amt > a.amount) return L("ยอดอนุมัติต้องมากกว่าศูนย์และไม่เกินยอดขอ", "The approved amount must be above zero and within the request");
    if (amt < a.amount && why.length < CR_WHY_MIN) return L(`อนุมัติน้อยกว่ายอดขอต้องระบุเหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร (ข้อ 59 เท่าที่จำเป็น)`, `Approving less needs a reason of at least ${CR_WHY_MIN} characters (clause 59, only what is needed)`);
    const au = famAuth(); a.state = "approved"; a.approvedAmt = amt; a.approver = { by: me().id, holder: au.holder, via: au.via, t: nowIso() };
    advLog(a, ["อนุมัติเงินยืม", "Approved"], amt < a.amount ? `${fmt(amt)} · ${why}` : fmt(amt)); audit(["อนุมัติเงินยืม", "Approved an advance"], `${a.id} · ${fmt(amt)}${onBehalf("exec", "spend")}`);
    notify([S.users.find(u => u.id === a.borrower).role], [`เงินยืม ${a.id} อนุมัติแล้ว ${fmt(amt)} บาท`, `Advance ${a.id} approved: ${fmt(amt)} baht`], "advances");
    return done(L("อนุมัติแล้ว · การเงินจ่ายผ่าน e-Payment", "Approved · Finance pays by e-Payment"), ["fin"], [`เงินยืม ${a.id} อนุมัติแล้ว รอจ่าย`, `Advance ${a.id} is approved and waiting to be paid`]);
  }
  if (k === "reject") { a.state = "rejected"; advLog(a, ["ไม่อนุมัติ", "Rejected"], why); audit(["ไม่อนุมัติเงินยืม", "Rejected an advance"], `${a.id} · ${why}`); return done(L("บันทึกแล้ว", "Saved"), [S.users.find(u => u.id === a.borrower).role], [`เงินยืม ${a.id} ไม่ได้รับอนุมัติ: ${why}`, `Advance ${a.id} was not approved: ${why}`], "advances"); }
  if (k === "cancel") {
    if (!["request", "approved"].includes(a.state)) return;
    const was = a.state; a.state = "cancelled"; a.cancelled = { by: me().id, t: nowIso(), why, was };
    advLog(a, [was === "request" ? "ยกเลิกคำขอ" : "ยกเลิกเงินยืมที่อนุมัติแล้ว", was === "request" ? "Cancelled" : "Cancelled after approval"], why); audit(["ยกเลิกคำขอยืมเงิน", "Cancelled an advance request"], `${a.id} · ${why}`); ADV_OPEN = null;
    const bo = S.users.find(u => u.id === a.borrower);
    return done(L("ยกเลิกแล้ว", "Cancelled"), a.borrower === me().id ? (was === "approved" ? ["fin"] : null) : [bo.role], [`เงินยืม ${a.id} ถูกยกเลิก: ${why}`, `Advance ${a.id} was cancelled: ${why}`], a.borrower === me().id ? "fnc-adv" : "advances");
  }
  if (k === "crecall") {
    if (a.state !== "clearing" || a.borrower !== me().id) return;
    a.state = a.clearFrom || "paid"; advLog(a, ["ดึงใบสำคัญกลับมาแก้ไข", "Took the clearing back"], why); audit(["ดึงใบสำคัญส่งใช้เงินยืมกลับ", "Took an advance clearing back"], `${a.id} · ${why}`);
    return done(L("ดึงกลับแล้ว แก้แล้วส่งใหม่", "Taken back · fix it and send again"), ["fin"], [`ผู้ยืมดึงใบสำคัญ ${a.id} กลับไปแก้ไข`, `The borrower took the clearing of ${a.id} back to fix`]);
  }
  if (k === "pay") {
    if (!sodCheck("SD-12", [me().id], [a.borrower], a.id)) return; // the borrower doesn't pay themselves (FR-FC-23)
    a.state = "paid"; a.paid = { t: nowIso(), ref: `EP-ADV-${a.id.slice(-3)}` };
    advLog(a, ["จ่ายเงินยืมผ่าน e-Payment", "Paid by e-Payment"], a.paid.ref); audit(["จ่ายเงินยืม", "Paid an advance"], `${a.id} · ${fmt(advAmt(a))}`);
    return done(L(`จ่ายแล้ว · ต้องส่งใช้ภายใน ${fdate(advDue(a))}`, `Paid · to be cleared by ${fdate(advDue(a))}`), [S.users.find(u => u.id === a.borrower).role], [`ได้รับเงินยืม ${a.id} แล้ว ส่งใช้ภายใน ${fdate(advDue(a))}`, `Advance ${a.id} paid; clear it by ${fdate(advDue(a))}`], "advances");
  }
  if (k === "accept" || k === "object") {
    if (!sodCheck("SD-12", [me().id], [a.borrower], a.id)) return;
    if (k === "object") {
      a.state = "objected"; a.objection = { t: nowIso(), by: me().id, why, due: addDays(TODAY, fcfg().advFix) };
      advLog(a, ["ทักท้วงใบสำคัญ", "Objected"], why); audit(["ทักท้วงใบสำคัญส่งใช้เงินยืม", "Objected to an advance clearing"], `${a.id} · ${why}`);
      return done(L("ทักท้วงแล้ว · ผู้ยืมต้องแก้ภายใน 15 วัน", "Objection sent · the borrower fixes it within 15 days"), [S.users.find(u => u.id === a.borrower).role], [`ใบสำคัญเงินยืม ${a.id} ถูกทักท้วง: ${why} แก้ภายใน ${fdate(a.objection.due)}`, `Your clearing of ${a.id} has an objection: ${why}. Fix it by ${fdate(a.objection.due)}`], "advances");
    }
    const cl = a.clearing, amt = advAmt(a);
    S.advSeq = (S.advSeq || 0) + 1; a.receipt = { no: `RB-${FAM_FY}-${String(S.advSeq).padStart(3, "0")}`, t: nowIso(), by: me().id };
    if (cl.spent > amt) {
      const v = { id: nextVc(), type: "travel", contract: null, phase: null, commit: null, line: a.line, desc: [`จ่ายเพิ่มจากการส่งใช้เงินยืม ${a.id}`, `Top-up after clearing ${a.id}`], payee: { name: S.users.find(u => u.id === a.borrower).name, kind: "person", taxId: "" },
        gross: cl.spent - amt, vat: false, penalty: 0, other: 0, method: "epay", methodWhy: "", due: addDays(TODAY, 7), ev: { order: true, report: true, rcpt: true }, state: "draft", maker: (S.users.find(u => u.role === "fin") || me()).id, t: nowIso(), log: [], adv: a.id };
      vLog(v, ["สร้างจากการส่งใช้เงินยืม", "Created from an advance clearing"], a.id); S.vouchers.push(v); a.topup = v.id;
    } else if (cl.spent < amt) a.cashBack = { amount: amt - cl.spent, t: nowIso(), receipt: a.receipt.no };
    a.state = "cleared"; advLog(a, ["ตรวจผ่าน รับใบสำคัญ", "Clearing accepted"], a.receipt.no);
    if (a.demand && !a.demand.closed) { a.demand.closed = { t: nowIso(), by: me().id, why: "cleared" }; advLog(a, ["ปิดหนังสือเรียกชดใช้ ส่งใช้ครบแล้ว", "Demand closed: cleared in full"]); } // FR-FC-25
    audit(["รับใบสำคัญส่งใช้เงินยืม", "Accepted an advance clearing"], `${a.id} · ${a.receipt.no}${a.topup ? ` · ${a.topup}` : ""}`);
    return done(a.topup ? L(`รับใบสำคัญแล้ว · สร้างใบขอเบิกจ่ายเพิ่ม ${a.topup}`, `Accepted · top-up voucher ${a.topup} created`) : a.cashBack ? L(`รับใบสำคัญและเงินเหลือคืน ${fmt(a.cashBack.amount)} บาทแล้ว`, `Accepted with ${fmt(a.cashBack.amount)} baht returned`) : L("รับใบสำคัญแล้ว", "Clearing accepted"),
      [S.users.find(u => u.id === a.borrower).role], [`เงินยืม ${a.id} ส่งใช้ครบแล้ว ใบรับใบสำคัญ ${a.receipt.no}`, `Advance ${a.id} is cleared; evidence receipt ${a.receipt.no}`], "advances");
  }
  if (k === "demand") {
    a.demand = { t: nowIso(), by: me().id, due: addDays(advDue(a), fcfg().demandDays) };
    advLog(a, ["ออกหนังสือเรียกชดใช้", "Demand issued"], fdate(a.demand.due)); audit(["ออกหนังสือเรียกชดใช้เงินยืม", "Issued an advance repayment demand"], `${a.id} · ${a.demand.due}`);
    return done(L("ออกหนังสือเรียกชดใช้แล้ว", "Demand issued"), [S.users.find(u => u.id === a.borrower).role], [`หนังสือเรียกชดใช้เงินยืม ${a.id} ภายใน ${fdate(a.demand.due)}`, `Repayment demand for ${a.id}: repay by ${fdate(a.demand.due)}`], "advances");
  }
  // FR-FC-25: the finance head moves the demand's due date with a reason, within 30 days of the clear-by date (clause 68).
  if (k === "ddue") {
    const d = ($("#adv-ddue") || { value: "" }).value, max = addDays(advDue(a), fcfg().demandDays);
    if (!d || d < TODAY || d > max) return L(`วันที่ต้องไม่ก่อนวันนี้และไม่เกิน ${fdate(max)}`, `The date must be from today to ${fdate(max)}`);
    const old = a.demand.due; (a.demand.moves = a.demand.moves || []).push({ from: old, to: d, by: me().id, t: nowIso(), why }); a.demand.due = d;
    advLog(a, ["เปลี่ยนวันครบกำหนดเรียกชดใช้", "Moved the demand's due date"], `${fdate(old)} → ${fdate(d)} · ${why}`); audit(["เปลี่ยนวันครบกำหนดเรียกชดใช้", "Moved a demand's due date"], `${a.id} · ${old} → ${d} · ${why}`);
    return done(L("เปลี่ยนวันแล้ว", "Date changed"), [S.users.find(u => u.id === a.borrower).role], [`หนังสือเรียกชดใช้ ${a.id} ครบกำหนดใหม่ ${fdate(d)}`, `The demand on ${a.id} is now due ${fdate(d)}`], "advances");
  }
  if (k === "report") {
    a.reported = { t: nowIso(), by: me().id }; advLog(a, ["รายงานหัวหน้าส่วนราชการ", "Reported to the head of the agency"]); audit(["รายงานเงินยืมค้างต่อหัวหน้าส่วนราชการ", "Reported an unpaid advance to the head of the agency"], a.id);
    return done(L("รายงานแล้ว", "Reported"), ["exec"], [`เงินยืม ${a.id} ไม่ชดใช้ตามหนังสือเรียก พิจารณาสั่งการตามสัญญายืมเงิน (ข้อ 68)`, `Advance ${a.id} was not repaid after the demand; decide action under the loan contract (clause 68)`]);
  }
}
function bindAdvShared() {
  $$("[data-advopen]").forEach(b => (b.onclick = () => { ADV_OPEN = b.dataset.advopen; ADV_EDIT = null; FIN_ASK = null; route(); }));
  const q = $("#advq"); if (q) q.oninput = () => { const pos = q.selectionStart; ADV_Q.q = q.value; route(); const n = $("#advq"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
  const qu = $("#advq-unit"); if (qu) qu.onchange = () => { ADV_Q.unit = qu.value; route(); };
  const qs = $("#advq-sort"); if (qs) qs.onclick = () => { ADV_Q.sort = ADV_Q.sort === 1 ? -1 : ADV_Q.sort === -1 ? null : 1; route(); const b = $("#advq-sort"); if (b) b.focus(); };
  const nw = $("#adv-new"); if (nw) nw.onclick = () => { ADV_EDIT = "new"; ADV_OPEN = null; FIN_ASK = null; route(); const s = $("#af-who"); if (s) s.focus(); };
  const cl = $("#adv-close"); if (cl) cl.onclick = () => { ADV_OPEN = null; ADV_EDIT = null; FIN_ASK = null; route(); };
  bindAdvForm();
  const a = ADV_OPEN && advOf(ADV_OPEN);
  if (!a) return;
  $$("[data-adv]").forEach(b => (b.onclick = () => advAct(a, b.dataset.adv)));
  const cf = $("#adv-clear");
  if (cf) cf.onsubmit = e => {
    e.preventDefault();
    const spent = Math.round(Number($("#ac-spent").value)); if (!(spent >= 0)) return;
    if (a.type === "travel") { const back = $("#ac-back").value; if (back < a.start) { toast(L("วันกลับต้องไม่ก่อนวันเริ่มเดินทาง", "The return date can't be before the start")); return; } a.returned = back; }
    a.clearing = { t: nowIso(), spent, note: $("#ac-note").value.trim(), receipts: true };
    a.clearFrom = a.state; a.state = "clearing"; advLog(a, ["ส่งใบสำคัญ", "Sent the evidence"], `${fmt(spent)}`);
    audit(["ส่งใบสำคัญส่งใช้เงินยืม", "Sent an advance clearing"], `${a.id} · ${fmt(spent)}`);
    notify(["fin"], [`ใบสำคัญส่งใช้เงินยืม ${a.id} รอตรวจ`, `Clearing of ${a.id} is waiting to be checked`], "fnc-adv");
    commit(); renderShell(); route(); toast(spent < advAmt(a) ? L(`ส่งแล้ว · นำเงินเหลือ ${fmt(advAmt(a) - spent)} บาทคืนการเงิน`, `Sent · return ${fmt(advAmt(a) - spent)} baht to Finance`) : L("ส่งใบสำคัญแล้ว", "Evidence sent"));
  };
}
BIND.advances = () => bindAdvShared();
{
  FIN_BINDS.push(() => { bindAdvShared(); $$("[data-advf]").forEach(b => (b.onclick = () => { ADV_F = b.dataset.advf; route(); })); });
}

// ---------- menu, clocks, badges, tasks ----------
// Everyone borrows, so My advances sits in My Workspace, not in the finance officer's menu.
NAV.push({ id: "advances", code: "", group: "overview", app: "finance", roles: Object.keys(ROLES), label: ["เงินยืมของฉัน", "My advances"] });
NAV_ICON.advances = "wallet"; NAV_ICON.adv = "wallet";
{
  const n = NAV.find(x => x.id === "finance");
  const base = finClocks;
  finClocks = function () {
    const out = base();
    (S.advances || []).forEach(a => {
      if (["paid", "objected"].includes(a.state) && !a.demand) out.push({ due: a.state === "objected" ? a.objection.due : advDue(a), title: `${a.state === "objected" ? L("ผู้ยืมแก้ข้อทักท้วง", "Borrower fixes the objection") : L("ส่งใช้เงินยืม", "Advance to be cleared")} ${a.id}`, sub: `${userName(a.borrower)} · ${fmt(advAmt(a))} ${L("บาท", "baht")}`, link: "fnc-adv", src: L("ข้อ 65", "cl. 65") });
      if (a.state === "approved") out.push({ due: a.start, title: `${L("จ่ายเงินยืมก่อนวันเริ่ม", "Pay the advance before it starts")} ${a.id}`, sub: `${userName(a.borrower)} · ${fmt(advAmt(a))} ${L("บาท", "baht")}`, link: "fnc-adv", src: L("ข้อ 57", "cl. 57") });
      if (a.demand && OPEN_ADV.includes(a.state) && !a.reported) out.push({ due: a.demand.due, title: `${L("ครบกำหนดตามหนังสือเรียกชดใช้", "Demand falls due")} ${a.id}`, sub: userName(a.borrower), link: "fnc-adv", src: L("ข้อ 68", "cl. 68") });
    });
    return out.sort((x, y) => (x.due < y.due ? -1 : 1));
  };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "adv") {
      const A = S.advances || []; let k = 0;
      if (ROLE === "fin") k = A.filter(a => a.state === "approved" || a.state === "clearing").length;
      else if (ROLE === "finhead") k = A.filter(a => (advOverdue(a) && !a.demand) || (a.demand && !a.reported && OPEN_ADV.includes(a.state) && daysUntil(a.demand.due) < 0)).length;
      else if (canSpend()) k = A.filter(a => a.state === "request").length;
      return k ? `<span class="badge">${k}</span>` : "";
    }
    return tb(nid, tab);
  };
  const nb = navBadge;
  navBadge = function (id) {
    if (id === "advances") { const k = (S.advances || []).filter(a => a.borrower === me().id && (a.state === "objected" || (a.state === "paid" && daysUntil(advDue(a)) <= 3))).length; return k ? `<span class="badge">${k}</span>` : ""; }
    return nb(id);
  };
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments), A = S.advances || [], R = (title, sub, due, link, cls) => t.unshift({ title, sub, due, link, cls });
    A.filter(a => a.borrower === me().id && ["paid", "objected"].includes(a.state)).forEach(a => R(`${a.state === "objected" ? L("แก้ข้อทักท้วงเงินยืม", "Fix the objection on advance") : L("ส่งใช้เงินยืม", "Clear advance")} ${a.id}`, `${fmt(advAmt(a))} ${L("บาท", "baht")} · ${esc(tx(a.purpose))}`, a.state === "objected" ? a.objection.due : advDue(a), "advances", advOverdue(a) ? "p-bad" : "p-warn"));
    if (ROLE === "fin") A.filter(a => a.state === "approved" || a.state === "clearing").forEach(a => R(`${a.state === "approved" ? L("จ่ายเงินยืม", "Pay advance") : L("ตรวจใบสำคัญเงินยืม", "Check the clearing of")} ${a.id}`, userName(a.borrower), TODAY, "fnc-adv", "p-info"));
    if (ROLE === "finhead") A.filter(a => advOverdue(a) && !a.demand).forEach(a => R(`${L("เรียกชดใช้เงินยืม", "Demand repayment of")} ${a.id}`, `${userName(a.borrower)} · ${L("เลยกำหนด", "overdue since")} ${fdate(advDue(a))}`, advDue(a), "fnc-adv", "p-bad"));
    if (canSpend() && ROLE !== "fin" && ROLE !== "finhead") A.filter(a => a.state === "request").forEach(a => R(`${L("อนุมัติเงินยืม", "Approve advance")} ${a.id}`, `${userName(a.borrower)} · ${fmt(a.amount)} ${L("บาท", "baht")}`, a.start, "fnc-adv", "p-warn"));
    return t.filter(x => !(x.cls === "p-mute" && t.length > 1));
  };
}

// ---------- seed (called from the shared seed builder) ----------
function seedFinanceFN3(s) {
  const U = r => s.users.find(u => u.role === r && u.primary) || s.users.find(u => u.role === r) || {}, FN = U("fin").id, FH = U("finhead").id, EX = U("exec").id;
  const ope = s.allocs[CUR_FY].lines.filter(l => l.type === "ope"), lineOfUnit = u => (ope.find(l => l.unit === u) || ope[0]).id;
  const ap = t => ({ by: EX, holder: EX, via: null, t });
  const mk = (n, u, o) => Object.assign({ id: `AD-${CUR_FY}-00${n}`, borrower: u.id, unit: u.unit, returned: null, approvedAmt: null, source: "budget", line: lineOfUnit(u.unit), temp: false, collateral: "", contract: { no: `สย.00${n}/${CUR_FY}`, t: o.t }, log: [{ t: o.t, by: u.id, act: ["ขอยืมเงิน", "Requested"], note: "" }] }, o);
  const dv = U("div"), pl = U("plan"), dh = U("divhead"), pr = U("proc");
  s.advances = [
    mk(1, dv, { type: "travel", purpose: ["ตรวจติดตามโครงการพื้นที่ภาคเหนือ", "Project monitoring in the north"], start: "2026-10-03", end: "2026-10-06", returned: "2026-10-06", items: [{ k: "perdiem", amt: 960 }, { k: "hotel", amt: 4500 }, { k: "transport", amt: 13140 }], amount: 18600, approvedAmt: 18600, state: "paid", t: "2026-09-25T10:00", approver: ap("2026-09-26T09:00"), paid: { t: "2026-10-01T10:00", ref: "EP-ADV-001" } }),
    mk(2, pl, { type: "other", purpose: ["จัดประชุมเชิงปฏิบัติการจัดทำแผนปฏิบัติราชการ", "Workshop on the agency action plan"], start: "2026-09-15", end: "2026-09-16", items: [{ k: "material", amt: 22000 }, { k: "fee", amt: 6000 }], amount: 28000, approvedAmt: 28000, state: "paid", t: "2026-09-05T10:00", approver: ap("2026-09-07T09:00"), paid: { t: "2026-09-10T10:00", ref: "EP-ADV-002" } }),
    mk(3, dh, { type: "travel", purpose: ["ประชุมชี้แจงงบประมาณ จังหวัดขอนแก่น", "Budget briefing in Khon Kaen"], start: "2026-08-20", end: "2026-08-22", returned: "2026-08-22", items: [{ k: "perdiem", amt: 720 }, { k: "hotel", amt: 3000 }, { k: "transport", amt: 6280 }], amount: 10000, approvedAmt: 10000, state: "cleared", t: "2026-08-10T10:00", approver: ap("2026-08-12T09:00"), paid: { t: "2026-08-15T10:00", ref: "EP-ADV-003" }, clearing: { t: "2026-09-01T10:00", spent: 8750, note: "", receipts: true }, receipt: { no: `RB-2570-001`, t: "2026-09-02T10:00", by: FN }, cashBack: { amount: 1250, t: "2026-09-02T10:00", receipt: `RB-2570-001` } }),
    mk(4, pr, { type: "travel", purpose: ["ตรวจรับงานติดตั้งระบบ สำนักงานสาขาเชียงใหม่", "Acceptance of the system installation, Chiang Mai branch"], start: "2026-10-26", end: "2026-10-28", items: [{ k: "perdiem", amt: 720 }, { k: "hotel", amt: 3000 }, { k: "transport", amt: 3680 }], amount: 7400, state: "request", t: "2026-10-15T14:00" }),
    mk(5, dh, { type: "travel", purpose: ["ติดตามการเบิกจ่าย จังหวัดนครราชสีมา", "Spending follow-up in Nakhon Ratchasima"], start: "2026-10-07", end: "2026-10-09", returned: "2026-10-09", items: [{ k: "perdiem", amt: 720 }, { k: "hotel", amt: 3000 }, { k: "transport", amt: 8280 }], amount: 12000, approvedAmt: 12000, state: "clearing", t: "2026-10-02T10:00", approver: ap("2026-10-03T09:00"), paid: { t: "2026-10-05T10:00", ref: "EP-ADV-005" }, clearing: { t: "2026-10-14T10:00", spent: 9850, note: "", receipts: true } }),
  ];
  s.advSeq = 1; s.advSeqC = 5;
  if (!s.sod.rules.some(r => r.id === "SD-12")) s.sod.rules.push({ id: "SD-12", on: true });
  void FH;
}
