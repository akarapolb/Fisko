// Fisko Budget round B4: live in-year management (Budget design chapter 6.4 and 7.2–7.3).
// - Four-level balance per line (FR-B-30): allotted, reserved (approved requisitions), committed (contracts),
//   paid (approved payments); available = allotted − reserved − committed. Data from Procurement and Finance.
// - Allotment status and distribution to regional offices within 15 days (FR-B-28, BR-16).
// - Transfers classified by the regulation (R-B-01, FR-B-29): T1 within an output (report within 15 days),
//   T2 across outputs in a programme and T3 across programmes (Budget Bureau agreement), T4 new project
//   (Cabinet, not in the system), T6 extended money (Budget Bureau first). Reasons from clause 25.
// - Spending plan versions with the clause-15 reasons and the "15 days before the year" check (FR-B-27, BR-14).
// - Savings from contracts below the estimate (FR-B-33), carry-over rule banner (BR-17), live monitoring of
//   FY2570 against quarterly targets that are settings (FR-B-31, BR-20, BR-21).
const B4_FY = CUR_FY;
const lineStruct = l => { const lin = lineage(l.act); return { prog: (lin[0] || {}).id || "", out: (lin.find(n => n.lvl === "output") || {}).id || "" }; };
// Actual spending of a line: approved contract payments, plus (Fisko Finance FN5) paid vouchers outside contracts
// and budget advances (lent until cleared, then what was spent), so M06 and M07 show what Finance paid.
const linePaid = id => sumv(S.payreqs.filter(p => p.status === "approved" && (S.contracts.find(c => c.id === p.contract) || {}).line === id).map(p => p.amount))
  + sumv((S.vouchers || []).filter(v => v.line === id && !v.contract && v.state === "paid").map(v => v.gross - (v.penalty || 0)))
  + sumv((S.advances || []).filter(a => a.line === id && a.source === "budget" && ["paid", "clearing", "objected", "cleared"].includes(a.state)).map(a => (a.state === "cleared" ? Math.min(a.clearing.spent, a.approvedAmt || a.amount) : a.approvedAmt || a.amount)));
function bal(l) {
  const res = typeof famReserved === "function" ? famReserved(l.id) : 0, com = (typeof famCommitted === "function" ? famCommitted(l.id) : 0) + (typeof famOther === "function" ? famOther(l.id) : 0), paid = linePaid(l.id);
  return { allot: l.amount, res, com, paid, avail: l.amount - res - com };
}
const TR_WHY = { fix: ["แก้ไขปัญหาการปฏิบัติงาน", "Fix an operational problem"], eff: ["เพิ่มประสิทธิภาพการให้บริการ", "Make services more efficient"], qual: ["เพิ่มคุณภาพการให้บริการ", "Improve service quality"], staff: ["พัฒนาบุคลากร", "Develop staff"], tech: ["พัฒนาเทคโนโลยี", "Develop technology"] };
const TR_TYPE = {
  T1: [["ภายในผลผลิต/โครงการ", "Within an output or project"], "fin", false, ["ข้อ 28–29", "clauses 28–29"]],
  T2: [["ข้ามผลผลิตในแผนงานเดียวกัน", "Across outputs in one programme"], "exec", true, ["ข้อ 28 (ต้องยืนยันหลักเกณฑ์)", "clause 28 (rule to confirm)"]],
  T3: [["ข้ามแผนงาน", "Across programmes"], "exec", true, ["ข้อ 26 · มาตรา 36", "clause 26 · section 36"]],
  T4: [["แผนงานหรือโครงการใหม่", "New programme or project"], "cabinet", true, ["มาตรา 36", "section 36"]],
  T6: [["เงินที่ขยายเวลาเบิกจ่ายแล้ว", "Money with an extended spending period"], "exec", true, ["ข้อ 27", "clause 27"]],
};
function classifyTransfer(t) {
  const a = lineOf(t.from), b = lineOf(t.to); if (!a || !b) return "T1";
  if (a.extended) return "T6";
  if (b.newProj) return "T4";
  const sa = lineStruct(a), sb = lineStruct(b);
  if (sa.prog !== sb.prog) return "T3";
  if (sa.out !== sb.out) return "T2";
  return "T1";
}
const TR_ST = { pending: [["รออนุมัติภายใน", "Internal approval"], "p-warn"], bb: [["รอสำนักงบประมาณ", "With the Budget Bureau"], "p-info"], approved: [["มีผลแล้ว", "In effect"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"], blocked: [["ต้องเสนอ ครม.", "Needs Cabinet"], "p-bad"] };

// ---------- transfers ----------
ALLOC.transfers = () => {
  const A = AL(), ed = canAlloc(), pre = B4_PREFILL || {};
  const rows = A.transfers.slice().reverse().map(t => {
    const ty = t.type || classifyTransfer(t), T = TR_TYPE[ty], a = lineOf(t.from), b = lineOf(t.to), st = t.status;
    const canIn = st === "pending" && ty !== "T4" && (T[1] === "fin" ? acting("fin", "transfer") : acting("exec", "transfer")), canBB = st === "bb" && (ROLE === "plan" || canAlloc());
    const rep = st === "approved" && ty === "T1" ? (t.reported ? tag(L("รายงานแล้ว", "Reported"), "p-ok") : `${dueText(t.reportDue || addDays(String(t.t).slice(0, 10), 15))}${canAlloc() ? ` <button class="btn ghost" type="button" data-trrep="${t.id}">${L("รายงานแล้ว", "Mark reported")}</button>` : ""}`) : "";
    return `<tr><td class="mono">${t.id}<div class="sub">${fdate(t.t)}</div></td><td>${a ? esc(lineLabel(a)) : t.from}</td><td>${b ? esc(lineLabel(b)) : t.to}<div class="sub">${t.reason ? tx(TR_WHY[t.reason]) + " · " : ""}${esc(tx(t.why))}</div></td><td class="n">${mb(t.amount)}</td>
      <td><b class="mono">${ty}</b> <span class="sub">${tx(T[0])}</span><div class="sub">${T[1] === "fin" ? L("ผอ.กองคลัง (รับมอบอำนาจ)", "Finance director (delegated)") : T[1] === "cabinet" ? L("คณะรัฐมนตรี", "Cabinet") : L("ผู้บริหาร", "Executive")}${T[2] && T[1] !== "cabinet" ? ` → ${L("สำนักงบประมาณ", "Budget Bureau")}` : ""} · ${tx(T[3])}</div></td>
      <td>${tag(tx(TR_ST[ty === "T4" && st === "pending" ? "blocked" : st][0]), TR_ST[ty === "T4" && st === "pending" ? "blocked" : st][1])}${rep ? `<div class="sub">${L("รายงานภายใน", "Report by")} ${rep}</div>` : ""}</td>
      <td><div class="row" style="flex-wrap:nowrap">${canIn ? `<button class="btn primary" type="button" data-tap2="${t.id}">${L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-trj2="${t.id}">${L("ไม่อนุมัติ", "Reject")}</button>` : ""}
        ${canBB ? `<button class="btn primary" type="button" data-trbb="${t.id}">${L("บันทึกว่าสำนักงบประมาณเห็นชอบ", "Record Budget Bureau agreement")}</button>` : ""}</div></td></tr>`;
  }).join("");
  return `<section class="panel"><header>${chipIco("scale", "info")}<h2>${L("การโอนเปลี่ยนแปลงตามระเบียบ", "Transfers by the regulation")}</h2><span class="sp"></span><span class="mono sub">R-B-01</span></header>
    <div class="body sub">${L("ระบบจัดประเภทการโอนจากโครงสร้างงบประมาณของบรรทัดต้นทางและปลายทาง แล้วกำหนดผู้อนุมัติ: T1 ภายในผลผลิต (รายงานสำนักงบประมาณภายใน 15 วัน) · T2 ข้ามผลผลิต · T3 ข้ามแผนงาน (ต้องตกลงสำนักงบประมาณ) · T4 โครงการใหม่ (ต้องเสนอ ครม.) · T6 เงินที่ขยายเวลาแล้ว · การโอนข้ามหน่วยรับงบประมาณทำไม่ได้ (มาตรา 35)", "The system classifies each transfer from the budget structure of both lines and sets the approver: T1 within an output (report to the Budget Bureau within 15 days) · T2 across outputs · T3 across programmes (Budget Bureau agreement) · T4 new project (Cabinet) · T6 extended money · transfers to another agency are not possible (section 35)")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("โอนจาก", "From")}</th><th>${L("โอนไป", "To")}</th><th class="n">${L("ลบ.", "M")}</th><th>${L("ประเภทและผู้อนุมัติ", "Type and approver")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="sub">${L("ยังไม่มีการโอน", "No transfers yet")}</td></tr>`}</tbody></table></div>
    ${ed ? `<div class="body"><form class="inline-form" id="tr2-form">
      <div class="f"><label for="tr2-from">${L("โอนจาก", "From")}</label><select id="tr2-from">${A.lines.map(l => `<option value="${l.id}" ${pre.from === l.id ? "selected" : ""}>${esc(lineLabel(l))} (${L("ใช้ได้", "avail.")} ${mb(bal(l).avail - pendingOut(l.id))})</option>`).join("")}</select></div>
      <div class="f"><label for="tr2-to">${L("โอนไป", "To")}</label><select id="tr2-to">${A.lines.map((l, i) => `<option value="${l.id}" ${(pre.to ? pre.to === l.id : i === 1) ? "selected" : ""}>${esc(lineLabel(l))}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 110px"><label for="tr2-amt">${L("ลบ.", "M")}</label><input type="number" min="0.01" step="0.01" id="tr2-amt" value="${pre.amount ? (pre.amount / 1e6).toFixed(2) : ""}" required></div>
      <div class="f" style="flex:1 1 200px"><label for="tr2-reason">${L("เหตุผลตามข้อ 25", "Reason (clause 25)")}</label><select id="tr2-reason">${Object.keys(TR_WHY).map(k => `<option value="${k}">${tx(TR_WHY[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:2 1 220px"><label for="tr2-why">${L("รายละเอียด", "Details")}</label><input type="text" id="tr2-why" value="${esc(pre.why || "")}" required></div>
      <div class="f" style="flex:1 1 200px"><label>${L("ประเภท", "Type")}</label><div id="tr2-type" class="sub" style="padding-top:8px"></div></div>
      <button class="btn primary" type="submit">${L("ขอโอนเปลี่ยนแปลง", "Request transfer")}</button></form></div>` : ""}</section>`;
};
let B4_PREFILL = null;

// ---------- balances ----------
ALLOC_TABS.push({ id: "balance", label: ["ยอดคงเหลือ 4 ระดับ", "Four-level balances"] }, { id: "savings", label: ["เงินเหลือจ่าย", "Savings"] });
let BAL_OPEN = null;
ALLOC.balance = () => {
  if (ALLOC_FY !== B4_FY) return `<section class="panel"><div class="body sub">${L(`ยอดจอง ผูกพัน และเบิกจ่ายมีเฉพาะปีที่กำลังใช้จ่าย (2570)`, `Reservations, commitments and payments exist for the year being spent (2570)`)}</div></section>`;
  const A = AL(), L4 = A.lines.map(l => ({ l, b: bal(l) })), T = k => sumv(L4.map(x => x.b[k]));
  const bar = b => { const w = v => (b.allot ? v / b.allot * 100 : 0).toFixed(1); return `<div class="bal4" title=""><i class="p" style="width:${w(b.paid)}%"></i><i class="c" style="width:${w(b.com - b.paid)}%"></i><i class="r" style="width:${w(b.res)}%"></i></div>`; };
  const open = BAL_OPEN && A.lines.find(l => l.id === BAL_OPEN);
  return `<section class="stats">
      ${statCard({ label: L("จัดสรรแล้ว", "Allotted"), value: mb(T("allot")), unit: L("ลบ.", "M"), icon: "coins" })}
      ${statCard({ label: L("จองวงเงิน (ใบขอซื้อ)", "Reserved (requisitions)"), value: mb(T("res")), unit: L("ลบ.", "M"), icon: "inbox", sub: L("จาก Fisko Procurement", "From Fisko Procurement") })}
      ${statCard({ label: L("ผูกพัน (สัญญา)", "Committed (contracts)"), value: mb(T("com")), unit: L("ลบ.", "M"), icon: "file", ring: T("allot") ? T("com") / T("allot") : 0 })}
      ${statCard({ label: L("เบิกจ่ายแล้ว", "Paid"), value: mb(T("paid")), unit: L("ลบ.", "M"), icon: "wallet", sub: L("จาก Fisko Finance", "From Fisko Finance") })}</section>
    <section class="panel"><header>${chipIco("layers", "info")}<h2>${L("ยอดต่อบรรทัด", "Per line")}</h2><span class="sp"></span><span class="row sub" style="gap:10px"><span><i class="lg bal-p"></i>${L("เบิกจ่าย", "Paid")}</span><span><i class="lg bal-c"></i>${L("ผูกพัน", "Committed")}</span><span><i class="lg bal-r"></i>${L("จอง", "Reserved")}</span></span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("บรรทัด", "Line")}</th><th>${L("เงินจัดสรร", "Allotment")}</th><th class="n">${L("จัดสรร", "Allotted")}</th><th style="width:26%"></th><th class="n">${L("คงเหลือใช้ได้", "Available")}</th></tr></thead>
        <tbody>${L4.map(({ l, b }) => `<tr class="click" data-bal="${l.id}" tabindex="0"><td><b style="font-weight:500">${esc(tx(l.name))}</b><div class="sub"><span class="mono">${l.id}</span> · ${unitName(l.unit)} · ${typeName(l.type)}</div></td>
          <td>${allotCell(l)}</td><td class="n">${mb(b.allot)}</td><td>${bar(b)}</td><td class="n" style="color:var(--${b.avail < 0 ? "bad" : "ink"})"><b>${mb(b.avail)}</b></td></tr>
          ${open && open.id === l.id ? `<tr class="cmt-row"><td colspan="5">${balDetail(l)}</td></tr>` : ""}`).join("")}</tbody></table></div>
      <div class="body sub">${L("คงเหลือใช้ได้ = จัดสรร − จอง − ผูกพัน (การเบิกจ่ายอยู่ในยอดผูกพันแล้ว) · Fisko Procurement ไม่ให้จองหรือผูกพันเกินยอดนี้ (BR-15, มาตรา 40)", "Available = allotted − reserved − committed (payments sit inside commitments) · Fisko Procurement won't reserve or commit beyond it (BR-15, section 40)")}</div></section>`;
};
function allotCell(l) {
  const a = l.allot || { status: "approved" };
  if (a.regional && !a.sent) return `${tag(L("ต้องส่งต่อส่วนภูมิภาค", "Send to region"), "p-warn")}<div class="sub">${dueText(a.due)}${canAlloc() ? ` <button class="btn ghost" type="button" data-allsend="${l.id}">${L("ส่งต่อแล้ว", "Mark sent")}</button>` : ""}</div>`;
  return tag(a.regional ? L("ส่งต่อส่วนภูมิภาคแล้ว", "Sent to region") : L("อนุมัติเงินจัดสรรแล้ว", "Allotment approved"), "p-ok");
}
function balDetail(l) {
  const rq = S.reqn.filter(r => famPlan(r.plan).line === l.id), cs = S.contracts.filter(c => c.line === l.id), ps = S.payreqs.filter(p => cs.some(c => c.id === p.contract));
  const li = (id, t, amt, st) => `<li><span class="mono">${id}</span> ${t} <b class="num">${mb(amt)}</b> ${st}</li>`;
  return `<div class="grid2" style="gap:12px"><div><b>${L("ใบขอซื้อ", "Requisitions")}</b><ul class="plain">${rq.map(r => li(r.id, esc(tx(famPlan(r.plan).name)), r.amount, tag(r.status, "p-mute"))).join("") || `<li class="sub">–</li>`}</ul></div>
    <div><b>${L("สัญญาและการเบิกจ่าย", "Contracts and payments")}</b><ul class="plain">${cs.map(c => li(c.id, esc(tx(c.vendor)), c.amount, "")).join("")}${ps.map(p => li(p.id, L("เบิกจ่าย", "payment"), p.amount, tag(p.status, p.status === "approved" ? "p-ok" : "p-mute"))).join("") || (cs.length ? "" : `<li class="sub">–</li>`)}</ul></div></div>`;
}

// ---------- savings ----------
ALLOC.savings = () => {
  if (ALLOC_FY !== B4_FY) return `<section class="panel"><div class="body sub">${L(`เงินเหลือจ่ายมีเฉพาะปีที่กำลังใช้จ่าย (2570)`, `Savings exist for the year being spent (2570)`)}</div></section>`;
  const rows = S.contracts.map(c => { const p = famPlan(c.plan), sav = (p.est || 0) - c.amount; return { c, p, sav, l: lineOf(c.line) }; }).filter(x => x.sav > 0);
  return `<section class="panel"><header>${chipIco("coins", "info")}<h2>${L("เงินเหลือจ่ายจากการจัดซื้อจัดจ้าง", "Savings from procurement")}</h2><span class="sp"></span><b class="num">${mb(sumv(rows.map(x => x.sav)))}</b>&nbsp;${L("ลบ.", "M")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา", "Contract")}</th><th>${L("บรรทัด", "Line")}</th><th class="n">${L("ประมาณการ", "Estimate")}</th><th class="n">${L("ราคาสัญญา", "Contract price")}</th><th class="n">${L("เหลือจ่าย", "Saving")}</th><th>${L("ทางเลือก", "Options")}</th></tr></thead>
      <tbody>${rows.map(x => `<tr><td><span class="mono">${x.c.id}</span><div class="sub">${esc(tx(x.c.vendor))}</div></td><td>${x.l ? esc(lineLabel(x.l)) : x.c.line}</td><td class="n">${mb(x.p.est)}</td><td class="n">${mb(x.c.amount)}</td><td class="n"><b>${mb(x.sav)}</b></td>
        <td>${x.c.savUse ? tag(x.c.savUse === "keep" ? L("คงไว้ในบรรทัด", "Kept in the line") : L("ส่งเรื่องโอนแล้ว", "Transfer raised"), "p-ok") : canAlloc() ? `<div class="row" style="flex-wrap:nowrap"><button class="btn" type="button" data-savtr="${x.c.id}">${L("โอนตามระเบียบ", "Transfer it")}</button><button class="btn ghost" type="button" data-savkeep="${x.c.id}">${L("คงไว้", "Keep")}</button></div>` : "–"}</td></tr>`).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มีเงินเหลือจ่าย", "No savings yet")}</td></tr>`}</tbody></table></div>
    <div class="body sub">${L("เงินเหลือจ่าย = ประมาณการในแผนจัดซื้อ − ราคาสัญญา · งบกลางที่เหลือจ่ายต้องส่งคืนสำนักงบประมาณภายใน 15 วัน (ข้อ 33, BR-19)", "Saving = procurement plan estimate − contract price · central-fund savings go back to the Budget Bureau within 15 days (clause 33, BR-19)")}</div></section>`;
};

// ---------- plan versions ----------
const PLAN_WHY = { target: ["เป้าหมายหรือตัวชี้วัดเปลี่ยน", "Targets or KPIs changed"], transfer: ["โอนงบประมาณไปหน่วยงานอื่นตามกฎหมาย", "Budget moved to another agency by law"], policy: ["ครม. หรือรัฐมนตรีมีนโยบายใหม่", "New Cabinet or minister policy"] };
{
  const bp = ALLOC.plan;
  ALLOC.plan = () => {
    const A = AL(), pv = A.planVersions || [], start = `${ALLOC_FY - 1}-10-01`, due = addDays(start, -15), sent = A.planSent;
    const ok = sent && sent <= due, ed = canAlloc() || ROLE === "plan";
    const box = `<section class="panel"><header>${chipIco("cal", "info")}<h2>${L("แผนการปฏิบัติงานและแผนการใช้จ่ายที่ส่งสำนักงบประมาณ", "Work and spending plan sent to the Budget Bureau")}</h2><span class="sp"></span><span class="mono sub">BR-14</span></header>
      <div class="body" style="display:flex;flex-direction:column;gap:10px">
        <div class="row" style="flex-wrap:wrap;gap:14px">${sent ? `<span>${L("ส่งเมื่อ", "Sent on")} <b>${fdate(sent)}</b></span>${tag(ok ? L("ก่อนเริ่มปีไม่น้อยกว่า 15 วัน", "At least 15 days before the year") : L("ช้ากว่ากำหนด", "Later than required"), ok ? "p-ok" : "p-bad")}` : `<span>${L("ยังไม่ส่ง · กำหนด", "Not sent · due")} ${fdate(due)}</span>${ed ? `<button class="btn" type="button" id="pl-send">${L("บันทึกว่าส่งแล้ววันนี้", "Record it as sent today")}</button>` : ""}`}<span class="sub">${L("รุ่นของแผน", "Plan versions")}: ${pv.length || 1}</span></div>
        ${pv.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("รุ่น", "Version")}</th><th>${L("วันที่", "Date")}</th><th>${L("เหตุผล (ข้อ 15)", "Reason (clause 15)")}</th>${[1, 2, 3, 4].map(q => `<th class="n">Q${q}</th>`).join("")}</tr></thead><tbody>${pv.map(v => `<tr><td><b>v${v.v}</b></td><td class="sub">${fdate(v.t)}</td><td>${v.why ? tx(PLAN_WHY[v.why]) : L("แผนตั้งต้น", "Original plan")}${v.note ? ` · <span class="sub">${esc(v.note)}</span>` : ""}</td>${v.q.map(x => `<td class="n">${mb(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
        ${ed ? `<div class="inline-form"><div class="f" style="flex:1 1 220px"><label for="pv-why">${L("ปรับแผนเพราะ", "Revise because")}</label><select id="pv-why">${Object.keys(PLAN_WHY).map(k => `<option value="${k}">${tx(PLAN_WHY[k])}</option>`).join("")}</select></div><div class="f" style="flex:2 1 240px"><label for="pv-note">${L("รายละเอียด", "Details")}</label><input type="text" id="pv-note"></div><button class="btn" type="button" id="pv-save">${L("บันทึกเป็นรุ่นใหม่", "Save as a new version")}</button></div>
          <span class="sub">${L("ปรับแผนต้องเสนอรัฐมนตรีเห็นชอบแล้วส่งสำนักงบประมาณ (ข้อ 16) · การโอนที่ไม่ทำให้เป้าหมายเปลี่ยนไม่ต้องปรับแผน", "A revision goes to the minister, then the Budget Bureau (clause 16) · transfers that don't change targets need no revision")}</span>` : ""}</div></section>`;
    return box + bp();
  };
}
const qTotals = A => [0, 1, 2, 3].map(q => sumv(A.lines.map(l => sumv(l.plan.slice(q * 3, q * 3 + 3)))));

// ---------- carry-over banner ----------
{
  const bc = ALLOC.carry;
  ALLOC.carry = () => `<div class="alert"><div class="ic">i</div><div><b>${L("มาตรา 43 · BR-17", "Section 43 · BR-17")}</b><p>${L("กันเงินได้เฉพาะรายการที่ก่อหนี้ผูกพันก่อนสิ้นปี เบิกจ่ายได้อีก 6 เดือน (ถึง 31 มี.ค.) และขยายต่อได้ไม่เกิน 6 เดือนเมื่อตกลงกับกระทรวงการคลัง · การโอนเงินที่ขยายเวลาแล้วต้องตกลงสำนักงบประมาณก่อน (T6)", "Only money committed before the year ends can be carried over; it can be spent for 6 more months (to 31 March) and extended by up to 6 more with the Ministry of Finance · moving extended money needs the Budget Bureau first (T6)")}</p></div></div>` + bc();
}

// ---------- bindings ----------
{
  const bb = BIND.allocation;
  BIND.allocation = () => {
    bb();
    const A = AL(), re = () => { commit(); route(); };
    const showType = () => { const el = $("#tr2-type"); if (!el) return; const ty = classifyTransfer({ from: $("#tr2-from").value, to: $("#tr2-to").value }), T = TR_TYPE[ty]; el.innerHTML = `<b class="mono">${ty}</b> ${tx(T[0])}${ty === "T4" ? ` · ${tag(L("ต้องเสนอ ครม.", "Needs Cabinet"), "p-bad")}` : ""}`; };
    ["#tr2-from", "#tr2-to"].forEach(s => { const el = $(s); if (el) el.onchange = showType; }); showType();
    const f = $("#tr2-form");
    if (f) f.onsubmit = e => {
      e.preventDefault();
      const from = $("#tr2-from").value, to = $("#tr2-to").value, amount = Math.round(Number($("#tr2-amt").value) * 1e6), why = $("#tr2-why").value.trim(), reason = $("#tr2-reason").value;
      if (from === to) { toast(L("เลือกรายการต้นทางและปลายทางที่ต่างกัน", "Choose different source and destination lines")); return; }
      const avail = bal(lineOf(from)).avail - pendingOut(from);
      if (amount > avail) { toast(L(`โอนได้ไม่เกิน ${mb(avail)} ลบ. (หักจอง ผูกพัน และที่รอโอนแล้ว)`, `At most ${mb(avail)} M (after reservations, commitments and pending transfers)`)); return; }
      const t = { id: trNo(A, ALLOC_FY), from, to, amount, why: [why, why], reason, status: "pending", t: nowIso(), by: me().id };
      t.type = classifyTransfer(t); A.transfers.push(t); B4_PREFILL = null;
      audit(["ขอโอนเปลี่ยนแปลงงบประมาณ", "Requested a budget transfer"], `${t.id} · ${t.type} · ${mb(amount)}`);
      notify([TR_TYPE[t.type][1] === "fin" ? "fin" : "exec"], [`มีคำขอโอน ${t.id} (${t.type}) รออนุมัติ`, `Transfer ${t.id} (${t.type}) is waiting for approval`], "alloc-transfers"); re();
      toast(t.type === "T4" ? L("บันทึกแล้ว · การตั้งโครงการใหม่ต้องเสนอ ครม. นอกระบบ", "Recorded · a new project needs the Cabinet, outside the system") : L("ส่งคำขอโอนแล้ว", "Transfer requested"));
    };
    const apply = t => { const a = lineOf(t.from), b = lineOf(t.to); a.amount -= t.amount; b.amount += t.amount; scalePlan(a, a.amount); scalePlan(b, b.amount); if (a.type !== b.type) { A.byType[a.type] -= t.amount; A.byType[b.type] = (A.byType[b.type] || 0) + t.amount; } };
    $$("[data-tap2]").forEach(btn => (btn.onclick = () => {
      const t = A.transfers.find(x => x.id === btn.dataset.tap2), ty = t.type || classifyTransfer(t);
      if (!sodCheck("SD-09", sodActors(TR_TYPE[ty][1] === "fin" ? "fin" : "exec", "transfer"), [t.by], t.id)) return;
      if (TR_TYPE[ty][2]) { t.status = "bb"; notify(["plan", "fin"], [`${t.id} อนุมัติภายในแล้ว รอตกลงสำนักงบประมาณ`, `${t.id} approved internally; waiting for the Budget Bureau`], "alloc-transfers"); }
      else { t.status = "approved"; t.reportDue = addDays(TODAY, 15); apply(t); }
      audit(["อนุมัติการโอนเปลี่ยนแปลง", "Approved a transfer"], `${t.id} · ${ty}`); re();
    }));
    $$("[data-trj2]").forEach(btn => (btn.onclick = () => { const t = A.transfers.find(x => x.id === btn.dataset.trj2); t.status = "rejected"; audit(["ไม่อนุมัติการโอนเปลี่ยนแปลง", "Rejected a transfer"], t.id); re(); }));
    $$("[data-trbb]").forEach(btn => (btn.onclick = () => { const t = A.transfers.find(x => x.id === btn.dataset.trbb); if (!trRoom(t)) { trNoRoom(t); return; } t.status = "approved"; t.bbAgreed = TODAY; apply(t); audit(["บันทึกความเห็นชอบของสำนักงบประมาณต่อการโอน", "Recorded the Budget Bureau's agreement to a transfer"], t.id); re(); }));
    $$("[data-trrep]").forEach(btn => (btn.onclick = () => { const t = A.transfers.find(x => x.id === btn.dataset.trrep); t.reported = TODAY; audit(["รายงานการโอนต่อสำนักงบประมาณ", "Reported a transfer to the Budget Bureau"], t.id); re(); }));
    $$("[data-bal]").forEach(tr => { const t = () => { BAL_OPEN = BAL_OPEN === tr.dataset.bal ? null : tr.dataset.bal; route(); }; tr.onclick = e => { if (!e.target.closest("button")) t(); }; tr.onkeydown = e => { if (e.key === "Enter") t(); }; });
    $$("[data-allsend]").forEach(btn => (btn.onclick = () => { const l = lineOf(btn.dataset.allsend); l.allot.sent = TODAY; audit(["ส่งเงินจัดสรรต่อส่วนภูมิภาค", "Sent the allotment on to the region"], l.id); re(); }));
    $$("[data-savkeep]").forEach(btn => (btn.onclick = () => { const c = S.contracts.find(x => x.id === btn.dataset.savkeep); c.savUse = "keep"; audit(["คงเงินเหลือจ่ายไว้ในบรรทัด", "Kept a saving in its line"], c.id); re(); }));
    $$("[data-savtr]").forEach(btn => (btn.onclick = () => { const c = S.contracts.find(x => x.id === btn.dataset.savtr), sav = famPlan(c.plan).est - c.amount; c.savUse = "transfer"; B4_PREFILL = { from: c.line, amount: sav, why: L(`เงินเหลือจ่ายจากสัญญา ${c.id}`, `Saving from contract ${c.id}`) }; ALLOC_TAB = "transfers"; save(); route(); }));
    const ps = $("#pl-send"); if (ps) ps.onclick = () => { A.planSent = TODAY; audit(["ส่งแผนการใช้จ่ายให้สำนักงบประมาณ", "Sent the spending plan to the Budget Bureau"], `${ALLOC_FY}`); re(); };
    const pv = $("#pv-save"); if (pv) pv.onclick = () => {
      A.planVersions = A.planVersions || [{ v: 1, t: A.planSent || TODAY, q: qTotals(A) }];
      A.planVersions.push({ v: A.planVersions.length + 1, t: TODAY, why: $("#pv-why").value, note: $("#pv-note").value.trim(), q: qTotals(A) });
      audit(["บันทึกแผนการใช้จ่ายรุ่นใหม่", "Saved a new spending plan version"], `v${A.planVersions.length}`); re();
    };
  };
}

// ---------- live monitoring (M07) ----------
{
  const bm = monTabsBar;
  monTabsBar = function () { const h = bm(); return h.replace(/<\/div>\s*$/, `<button class="tab ${MON_TAB === "live" ? "on" : ""}" type="button" role="tab" aria-selected="${MON_TAB === "live"}" data-mtab="live">${L("ปีปัจจุบัน (สด)", "This year (live)")}</button></div>`); };
}
const spendT = () => (typeof bcfg === "function" ? bcfg().targets : S.spendTargets) || { q: [32, 54, 77, 100], end: { all: 94, inv: 80, ope: 98 } };
MON_PANELS.live = () => {
  const A = S.allocs[B4_FY]; if (!A) return `<section class="panel"><div class="body sub">–</div></section>`;
  const mIdx = Math.max(0, Math.min(11, (new Date(TODAY).getFullYear() - (B4_FY - 544)) * 12 + new Date(TODAY).getMonth() - 9)), qNow = Math.floor(mIdx / 3), T = spendT();
  const L4 = A.lines.map(l => ({ l, b: bal(l), planTo: sumv(l.plan.slice(0, mIdx + 1)) })), sum = (k, f = () => true) => sumv(L4.filter(x => f(x.l)).map(x => (k === "planTo" ? x.planTo : x.b[k])));
  const inv = x => x.type === "inv";
  const stuck = L4.filter(x => x.l.type === "inv" && x.b.res + x.b.com === 0);
  const units = [...new Set(A.lines.map(l => l.unit))].map(u => ({ u, allot: sum("allot", l => l.unit === u), com: sum("com", l => l.unit === u), paid: sum("paid", l => l.unit === u), plan: sum("planTo", l => l.unit === u) }));
  return `<div class="alert"><div class="ic">i</div><div><b>${L("ข้อมูลสดจากการจัดสรร จัดซื้อ และการเงินปี", "Live from allocation, procurement and finance, FY")} ${B4_FY}</b><p>${L("ณ", "As of")} ${fdate(TODAY)} · ${L("เดือนที่", "month")} ${mIdx + 1}/12 · ${L("เป้าหมายตั้งค่าได้ต่อปี (มติ ครม. ของปีนั้น · ระดับ B ต้องยืนยัน)", "targets are yearly settings (that year's Cabinet resolution · level B, to confirm)")}</p></div></div>
    <section class="stats">
      ${statCard({ label: L("เบิกจ่ายแล้ว / จัดสรร", "Paid / allotted"), value: fmt(sum("allot") ? sum("paid") / sum("allot") * 100 : 0, 1) + "%", icon: "wallet", sub: `${L("เป้าสิ้นไตรมาส", "Target end of Q")}${qNow + 1}: ${T.q[qNow]}%` })}
      ${statCard({ label: L("ผูกพันแล้ว / จัดสรร", "Committed / allotted"), value: fmt(sum("allot") ? sum("com") / sum("allot") * 100 : 0, 1) + "%", icon: "file", ring: sum("allot") ? sum("com") / sum("allot") : 0 })}
      ${statCard({ label: L("งบลงทุนผูกพันแล้ว", "Investment committed"), value: fmt(sum("allot", inv) ? sum("com", inv) / sum("allot", inv) * 100 : 0, 1) + "%", icon: "building", sub: `${L("ควรก่อหนี้ภายในไตรมาส 2 · เป้าสิ้นปี", "commit within Q2 · year-end target")} ${T.end.inv}%` })}
      ${statCard({ label: L("ลงทุนที่ยังไม่ขยับ", "Investment not moving"), value: stuck.length, icon: "alert", tone: stuck.length ? "warn" : "", sub: L("ไม่มีการจองหรือผูกพัน (BR-20)", "No reservation or commitment (BR-20)") })}</section>
    <section class="panel"><header>${chipIco("activity", "info")}<h2>${L("รายหน่วยงาน", "By unit")}</h2><span class="sp"></span><span class="sub">${L("ลบ.", "M")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("จัดสรร", "Allotted")}</th><th class="n">${L("แผนสะสมถึงเดือนนี้", "Plan to date")}</th><th class="n">${L("ผูกพัน", "Committed")}</th><th class="n">${L("เบิกจ่าย", "Paid")}</th><th class="n">${L("เบิกจ่ายเทียบแผน", "Paid vs plan")}</th></tr></thead>
        <tbody>${units.map(x => `<tr><td>${unitName(x.u)}</td><td class="n">${mb(x.allot)}</td><td class="n">${mb(x.plan)}</td><td class="n">${mb(x.com)}</td><td class="n">${mb(x.paid)}</td><td class="n">${x.plan ? stateCell(x.paid, x.plan) : "–"}</td></tr>`).join("")}</tbody></table></div></section>
    ${stuck.length ? `<section class="panel"><header>${chipIco("alert", "warn")}<h2>${L("งบลงทุนที่ยังไม่ก่อหนี้", "Investment not yet committed")}</h2><span class="sp"></span><span class="sub">${L("กำหนดก่อหนี้", "Commit by")} ${fdate(`${B4_FY - 543}-03-31`)}</span></header>
      <ul class="tlist">${stuck.map(x => `<li><span class="prio p-warn"></span><div style="min-width:0"><a href="#" data-link="alloc-balance">${esc(tx(x.l.name))}</a><div class="sub">${unitName(x.l.unit)} · ${mb(x.l.amount)} ${L("ลบ.", "M")}</div></div><span class="sub">${x.l.id}</span></li>`).join("")}</ul></section>` : ""}`;
};

// ---------- seed ----------
function seedBudgetB4(s) {
  const A = s.allocs && s.allocs[B4_FY]; if (!A) return;
  A.lines.forEach(l => (l.allot = { status: "approved", t: "2026-10-01" }));
  const reg = A.lines.filter(l => l.type === "ope" && l.unit === "U05")[0]; if (reg) reg.allot = { status: "approved", t: "2026-10-01", regional: true, due: "2026-10-16" };
  A.planSent = "2026-09-10";
  A.transfers.forEach(t => { const a = A.lines.find(x => x.id === t.from), b = A.lines.find(x => x.id === t.to); if (!a || !b) return; t.reason = t.reason || "eff"; if (t.status === "approved") { t.reportDue = addDays(String(t.t).slice(0, 10), 15); if (t.reportDue < "2026-10-16") t.reported = t.reportDue; } });
  s.spendTargets = { q: [32, 54, 77, 100], end: { all: 94, inv: 80, ope: 98 } };
}
