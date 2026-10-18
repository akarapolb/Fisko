// Fisko Finance round 46: non-budget money (เงินนอกงบประมาณ), the full cycle chosen in decision D-FN-04.
// - Funds (S.nbFunds): the kinds of non-budget money an agency may keep by law, with the money held at the treasury
//   (ฝากคลัง, clause 101 (5)) and in the agency's non-budget account (clause 20 (1)).
// - Spending plans (S.nbPlans) per fund and year: lines, drafted by Finance and approved by the head of the agency.
//   Spending is only from an approved plan line (R-FN-07); Fisko Budget sees the plans read-only (M06, FR-B-18).
// - Money in: receipts of kind "nonbudget" name their fund (66e); cash is deposited at the treasury by the remittance.
// - Withdrawals from the treasury deposit (S.nbWd) against the plan, approved by the head of the agency; withdrawn
//   money must be paid out or deposited back within 15 working days (clause 101 (5)).
// - Money out: vouchers and advances that name a plan line (66c, 66d). Fund vouchers skip the GFMIS request: on approval
//   they wait as "nbready" and are paid from the non-budget account (e-Payment batch or cheque).
// The figures are simulated; there is no link to GFMIS or a bank.
let NB_FUND = null;
VST.nbready = [["พร้อมจ่ายจากบัญชีเงินนอกงบ", "Ready to pay from the non-budget account"], "p-info", "V4"];
const NB_CAT = { ope: ["ใช้สอยและวัสดุ", "Operating"], inv: ["ครุภัณฑ์และสิ่งก่อสร้าง", "Assets and works"], train: ["พัฒนาบุคลากร", "Staff development"], other: ["อื่น ๆ", "Other"] };
const NBP_ST = { draft: [["ร่าง", "Draft"], "p-mute"], submitted: [["รออนุมัติ", "Awaiting approval"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], returned: [["ส่งกลับแก้ไข", "Returned"], "p-bad"] };
const NBW_ST = { pending: [["รออนุมัติ", "Awaiting approval"], "p-warn"], done: [["ถอนแล้ว", "Withdrawn"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"], back: [["ฝากคืนแล้ว", "Deposited back"], "p-mute"] };
const nbFunds = () => S.nbFunds || [];
const nbFund = id => nbFunds().find(f => f.id === id);
const nbPlan = (fid, fy = FAM_FY) => (S.nbPlans || []).find(p => p.fund === fid && p.fy === fy);
const nbLineOf = (fid, lid) => { const p = nbPlan(fid); return p ? p.lines.find(l => l.id === lid) : null; };
// Plan-line use: approved fund vouchers and advances that name the line.
const NB_VC_USED = ["ready", "nbready", "posted", "paid"], NB_ADV_USED = ["approved", "paid", "clearing", "objected", "cleared"];
function nbUsed(fid, lid) {
  const v = sumv((S.vouchers || []).filter(x => x.fund === fid && (!lid || x.nbLine === lid) && NB_VC_USED.includes(x.state)).map(x => x.gross - (x.penalty || 0)));
  const a = sumv((S.advances || []).filter(x => x.fund === fid && (!lid || x.nbLine === lid) && NB_ADV_USED.includes(x.state)).map(x => (x.state === "cleared" ? Math.min(x.clearing.spent, x.approvedAmt || x.amount) : x.approvedAmt || x.amount)));
  return v + a;
}
const nbLineLeft = (fid, lid) => { const l = nbLineOf(fid, lid); return l ? l.amount - nbUsed(fid, lid) : 0; };
// Balances: what came in, what went to and from the treasury, and what was paid out.
function nbBal(f) {
  const R = (S.receipts || []).filter(r => !r.cancelled && r.fund === f.id);
  const income = sumv(R.map(r => r.amount)), deposited = sumv(R.filter(r => r.remit).map(r => r.amount));
  const withdrawn = sumv((S.nbWd || []).filter(w => w.fund === f.id && ["done", "back"].includes(w.status)).map(w => w.amount)) - sumv((S.nbWd || []).filter(w => w.fund === f.id && w.status === "back").map(w => w.backAmt || 0));
  const paidV = sumv((S.vouchers || []).filter(v => v.fund === f.id && v.state === "paid").map(v => vCalc(v).net + vCalc(v).wht));
  const paidA = sumv((S.advances || []).filter(a => a.fund === f.id && a.paid).map(a => a.approvedAmt || a.amount)) - sumv((S.advances || []).filter(a => a.fund === f.id && a.cashBack).map(a => a.cashBack.amount));
  const treasury = f.openT + deposited - withdrawn, agency = f.openA + income - deposited + withdrawn - paidV - paidA;
  return { income, deposited, withdrawn, spent: paidV + paidA, treasury, agency, total: treasury + agency };
}
// Options for the voucher and advance forms: "fund|line" for every line of an approved plan this year.
function nbLineOptions() {
  return nbFunds().flatMap(f => { const p = nbPlan(f.id); return p && p.status === "approved" ? p.lines.map(l => `<option value="${f.id}|${l.id}">${f.id} · ${esc(tx(l.name))} · ${L("คงเหลือ", "left")} ${fmt(nbLineLeft(f.id, l.id))}</option>`) : []; }).join("");
}
// R-FN-07, used by vRules (66c) for a fund voucher.
function nbRule(v, add) {
  const f = nbFund(v.fund), p = nbPlan(v.fund), l = nbLineOf(v.fund, v.nbLine), x = vCalc(v), own = NB_VC_USED.includes(v.state) ? x.spend : 0;
  add("R-FN-07", !!(p && p.status === "approved"), p && p.status === "approved" ? L(`แผนการใช้เงิน ${p.id} อนุมัติแล้ว`, `Spending plan ${p.id} is approved`) : L("กองทุนนี้ยังไม่มีแผนการใช้เงินที่อนุมัติ", "This fund has no approved spending plan"));
  add("R-FN-07", !!l && x.spend <= nbLineLeft(v.fund, v.nbLine) + own, l ? L(`ไม่เกินยอดคงเหลือของ “${tx(l.name)}” (${fmt(nbLineLeft(v.fund, v.nbLine) + own)} บาท)`, `Within what is left on “${tx(l.name)}” (${fmt(nbLineLeft(v.fund, v.nbLine) + own)} baht)`) : L("ไม่พบรายการในแผน", "Plan line not found"));
  if (f && v.state !== "paid") { const b = nbBal(f); if (x.net > b.agency) add("R-FN-07", false, L(`เงินในบัญชีเงินนอกงบประมาณของ ${f.id} มี ${fmt(b.agency)} บาท ต้องถอนเงินฝากคลังก่อนจ่าย`, `${f.id} has ${fmt(b.agency)} baht in the non-budget account; withdraw from the treasury deposit before paying`), true); }
}
// Fund vouchers wait to be paid from the non-budget account once approved (no GFMIS request).
{
  const base = vcAct;
  vcAct = function (v, a) {
    const r = base(v, a);
    if (a === "approve" && v.fund && v.state === "ready") {
      v.state = "nbready"; v.funded = { t: nowIso(), nb: true };
      vLog(v, ["พร้อมจ่ายจากบัญชีเงินนอกงบประมาณ", "Ready to pay from the non-budget account"], v.fund);
      commit(); renderShell(); route(); toast(L("อนุมัติแล้ว · จ่ายจากบัญชีเงินนอกงบประมาณ ไม่ต้องส่ง GFMIS", "Approved · paid from the non-budget account; no GFMIS request"));
    }
    return r;
  };
}
// A non-budget advance must fit its plan line (R-FN-07), on top of the clause 58 to 64 checks.
{
  const base = advChecks;
  advChecks = function (a) {
    const out = base(a);
    if (a.source === "nonbudget" && a.fund) { const l = nbLineOf(a.fund, a.nbLine), own = NB_ADV_USED.includes(a.state) ? advAmt(a) : 0; out.push({ id: "R-FN-07", ok: !!l && a.amount <= nbLineLeft(a.fund, a.nbLine) + own, text: l ? L(`ไม่เกินยอดคงเหลือของ ${a.fund} “${tx(l.name)}”`, `Within what is left on ${a.fund} “${tx(l.name)}”`) : L("ไม่พบรายการในแผนเงินนอกงบประมาณ", "Non-budget plan line not found") }); }
    return out;
  };
}
// The non-budget bank account in the reconciliation (66f): withdrawals in, fund vouchers out.
{
  const base = bookLines;
  bookLines = function (acct, m) {
    if (acct !== "nonbudget") return base(acct, m);
    const out = [], add = (d, ref, amt, desc) => { if (d.slice(0, 7) === m) out.push({ d, ref, amt, desc }); };
    (S.nbWd || []).filter(w => w.done).forEach(w => add(w.done.t.slice(0, 10), w.done.doc, w.amount, [`ถอนเงินฝากคลัง ${w.id} (${w.fund})`, `Treasury withdrawal ${w.id} (${w.fund})`]));
    (S.vouchers || []).filter(v => v.fund && v.paid).forEach(v => add(v.paid.t.slice(0, 10), v.paid.ref, -vCalc(v).net, [`จ่าย ${v.id} ${tx(v.payee.name)}`, `Paid ${v.id} to ${tx(v.payee.name)}`]));
    (S.bookAdj || []).filter(x => x.acct === acct).forEach(x => add(x.d, x.ref, x.amt, x.desc));
    return out.sort((a, b) => (a.d < b.d ? -1 : 1));
  };
}

// ---------- sections ----------
FS.nbKpis = () => {
  const B = nbFunds().map(nbBal), P = nbFunds().map(f => nbPlan(f.id)).filter(p => p && p.status === "approved");
  return `<section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("เงินนอกงบประมาณทั้งหมด", "All non-budget money")}</span><span class="v">${fmt(sumv(B.map(b => b.total)))}</span><span class="d sub">${nbFunds().length} ${L("กองทุน", "funds")}</span></div>
    <div class="kpi"><span class="l">${L("ฝากคลัง", "At the treasury")}</span><span class="v">${fmt(sumv(B.map(b => b.treasury)))}</span></div>
    <div class="kpi"><span class="l">${L("ในบัญชีของหน่วยงาน", "In the agency account")}</span><span class="v">${fmt(sumv(B.map(b => b.agency)))}</span></div>
    <div class="kpi"><span class="l">${L("แผนที่อนุมัติ / ใช้ไป", "Approved plans / used")}</span><span class="v">${fmt(sumv(P.flatMap(p => p.lines.map(l => l.amount))))}</span><span class="d sub">${L("ใช้ไป", "used")} ${fmt(sumv(P.map(p => nbUsed(p.fund))))}</span></div>
  </section>`;
};
FS.nbFunds = () => {
  const F = nbFunds(), cur = nbFund(NB_FUND) || F[0];
  return `<section class="panel"><header><h2>${L("กองทุนเงินนอกงบประมาณ", "Non-budget funds")}</h2><span class="sp"></span><span class="sub">${L("เก็บไว้ใช้จ่ายได้ตามกฎหมาย ไม่ต้องนำส่งคลัง (ข้อ 4)", "Kept and spent as the law allows, not remitted (clause 4)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th style="min-width:220px">${L("กองทุน", "Fund")}</th><th class="n">${L("รับเข้า", "In")}</th><th class="n">${L("จ่ายไป", "Out")}</th><th class="n">${L("ฝากคลัง", "Treasury")}</th><th class="n">${L("ในบัญชี", "Account")}</th><th class="n">${L("รวม", "Total")}</th><th>${L("แผนปีนี้", "This year's plan")}</th><th></th></tr></thead>
      <tbody>${F.map(f => { const b = nbBal(f), p = nbPlan(f.id); return `<tr${cur && cur.id === f.id ? ' style="background:var(--tint)"' : ""}><td><span class="mono">${f.id}</span> <b style="font-weight:600">${esc(tx(f.name))}</b><div class="sub">${esc(tx(f.basis))}</div></td><td class="n">${fmt(b.income)}</td><td class="n">${fmt(b.spent)}</td><td class="n">${fmt(b.treasury)}</td><td class="n">${fmt(b.agency)}</td><td class="n"><b>${fmt(b.total)}</b></td>
        <td>${p ? stTag(NBP_ST, p.status) : tag(L("ยังไม่มีแผน", "No plan"), "p-warn")}</td><td><button class="btn ghost" type="button" data-nbf="${f.id}">${L("รายการเคลื่อนไหว", "Movements")}</button></td></tr>`; }).join("") || `<tr><td colspan="8" class="sub">—</td></tr>`}</tbody></table></div></section>
    ${cur ? nbStatement(cur) : ""}`;
};
function nbStatement(f) {
  const rows = [];
  (S.receipts || []).filter(r => !r.cancelled && r.fund === f.id).forEach(r => { rows.push({ d: r.date, what: `${L("รับเงิน", "Received")} ${rcNo(r)} · ${tx(r.payer)}`, inA: r.amount }); if (r.remit) { const m = (S.remits || []).find(x => x.id === r.remit); rows.push({ d: m ? m.t.slice(0, 10) : r.date, what: `${L("ฝากคลัง", "Deposited at the treasury")} ${r.remit}`, inA: -r.amount, inT: r.amount }); } });
  (S.nbWd || []).filter(w => w.fund === f.id && w.done).forEach(w => rows.push({ d: w.done.t.slice(0, 10), what: `${L("ถอนเงินฝากคลัง", "Treasury withdrawal")} ${w.id}`, inA: w.amount, inT: -w.amount }));
  (S.vouchers || []).filter(v => v.fund === f.id && v.state === "paid").forEach(v => rows.push({ d: v.paid.t.slice(0, 10), what: `${L("จ่าย", "Paid")} ${v.id} · ${tx(v.payee.name)}`, inA: -(vCalc(v).net + vCalc(v).wht) }));
  (S.advances || []).filter(a => a.fund === f.id && a.paid).forEach(a => rows.push({ d: a.paid.t.slice(0, 10), what: `${L("จ่ายเงินยืม", "Advance paid")} ${a.id}`, inA: -(a.approvedAmt || a.amount) }));
  rows.sort((a, b) => (a.d < b.d ? -1 : 1));
  let A = f.openA, T = f.openT;
  return `<section class="panel"><header><h2>${L("รายการเคลื่อนไหว", "Movements")} · <span class="mono">${f.id}</span> ${esc(tx(f.name))}</h2><span class="sp"></span><span class="sub">${L("ยกมา 1 ต.ค.", "Brought forward 1 Oct")}: ${L("บัญชี", "account")} ${fmt(f.openA)} · ${L("คลัง", "treasury")} ${fmt(f.openT)}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("วันที่", "Date")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("บัญชีหน่วยงาน", "Agency account")}</th><th class="n">${L("ฝากคลัง", "Treasury")}</th></tr></thead>
      <tbody>${rows.map(r => { A += r.inA || 0; T += r.inT || 0; return `<tr><td class="sub">${fdate(r.d)}</td><td>${esc(r.what)}</td><td class="n">${r.inA ? (r.inA > 0 ? "+" : "") + fmt(r.inA) : ""}<div class="sub">${fmt(A)}</div></td><td class="n">${r.inT ? (r.inT > 0 ? "+" : "") + fmt(r.inT) : ""}<div class="sub">${fmt(T)}</div></td></tr>`; }).join("") || `<tr><td colspan="4" class="sub">${L("ยังไม่มีรายการในปีนี้", "No movements this year")}</td></tr>`}</tbody></table></div></section>`;
}
FS.nbPlans = () => {
  const F = nbFunds(), cur = nbFund(NB_FUND) || F[0];
  if (!cur) return `<section class="panel"><div class="body sub">—</div></section>`;
  const p = nbPlan(cur.id), maker = ROLE === "fin", head = canSpend() && ROLE !== "fin" && ROLE !== "finhead", ed = maker && (!p || ["draft", "returned"].includes(p.status));
  return `<div style="margin:0 0 12px">${segBar(F.map(f => [f.id, `${f.id} ${esc(tx(f.name))}`]), cur.id, "nbf")}</div>
  <section class="panel"><header><h2>${L("แผนการใช้จ่ายเงินนอกงบประมาณ", "Non-budget spending plan")} ${fyLabel(FAM_FY)} · <span class="mono">${cur.id}</span></h2><span class="sp"></span>${p ? stTag(NBP_ST, p.status) : ""}</header>
    ${p ? `<div class="tbl-wrap"><table><thead><tr><th style="min-width:220px">${L("รายการ", "Line")}</th><th>${L("หมวด", "Category")}</th><th class="n">${L("วงเงิน", "Planned")}</th><th class="n">${L("ใช้ไป", "Used")}</th><th class="n">${L("คงเหลือ", "Left")}</th><th style="width:140px"></th></tr></thead>
      <tbody>${p.lines.map(l => { const u = nbUsed(cur.id, l.id); return `<tr><td><span class="mono sub">${l.id}</span> ${esc(tx(l.name))}</td><td class="sub">${tx(NB_CAT[l.cat])}</td><td class="n">${fmt(l.amount)}</td><td class="n">${fmt(u)}</td><td class="n">${fmt(l.amount - u)}</td><td><div class="bar"><i style="width:${l.amount ? Math.min(100, u / l.amount * 100) : 0}%"></i></div></td></tr>`; }).join("")}</tbody>
      <tfoot><tr><td colspan="2">${L("รวม", "Total")} · ${L("คาดรายรับ", "income expected")} ${fmt(p.income)}</td><td class="n">${fmt(sumv(p.lines.map(l => l.amount)))}</td><td class="n">${fmt(nbUsed(cur.id))}</td><td class="n">${fmt(sumv(p.lines.map(l => l.amount)) - nbUsed(cur.id))}</td><td></td></tr></tfoot></table></div>` : `<div class="body sub">${L("ยังไม่มีแผนของปีนี้", "No plan for this year yet")}</div>`}
    ${p && p.approved ? `<div class="body sub">${L("อนุมัติโดย", "Approved by")} ${esc(userName(p.approved.by))} · ${fdate(p.approved.t, true)}</div>` : ""}
    ${p && p.note ? `<div class="body sub" style="color:var(--bad)">${L("เหตุผลที่ส่งกลับ", "Returned because")}: ${esc(p.note)}</div>` : ""}
    <div class="body">
      ${ed ? `<form class="inline-form" id="nbl-form"><div class="f" style="flex:2 1 240px"><label for="nbl-n">${L("รายการ", "Line")}</label><input type="text" id="nbl-n" required></div>
        <div class="f" style="flex:0 1 180px"><label for="nbl-c">${L("หมวด", "Category")}</label><select id="nbl-c">${Object.keys(NB_CAT).map(k => `<option value="${k}">${tx(NB_CAT[k])}</option>`).join("")}</select></div>
        <div class="f" style="flex:0 1 150px"><label for="nbl-a">${L("วงเงิน (บาท)", "Amount (baht)")}</label><input type="number" id="nbl-a" min="1" step="1" required></div>
        <div class="f" style="flex:0 1 160px"><label for="nbl-i">${L("คาดรายรับทั้งปี (บาท)", "Income expected (baht)")}</label><input type="number" id="nbl-i" min="0" step="1" value="${p ? p.income : 0}"></div>
        <button class="btn" type="submit">+ ${L("เพิ่มรายการ", "Add line")}</button></form>
        ${p && p.lines.length ? `<button class="btn primary" type="button" id="nbp-sub" style="margin-top:8px">${L("เสนอหัวหน้าส่วนราชการอนุมัติ", "Send to the head of the agency")}</button>` : ""}` : ""}
      ${head && p && p.status === "submitted" ? `<div class="row" style="flex-wrap:wrap"><button class="btn primary" type="button" id="nbp-ok">${L("อนุมัติแผน", "Approve the plan")}</button><input type="text" id="nbp-why" placeholder="${L("เหตุผลถ้าส่งกลับ", "Reason to return")}" style="min-width:220px;flex:1" aria-label="${L("เหตุผล", "Reason")}"><button class="btn danger" type="button" id="nbp-no">${L("ส่งกลับแก้ไข", "Return")}</button></div>` : ""}
      <p class="sub" style="margin:8px 0 0">${L("จ่ายจากเงินนอกงบประมาณได้เฉพาะรายการในแผนที่อนุมัติแล้วและไม่เกินวงเงิน (R-FN-07) · กองแผนและผู้บริหารเห็นแผนนี้ใน Fisko Budget (M06)", "Non-budget money is spent only on lines of an approved plan, within the amount (R-FN-07) · Planning and executives see this plan in Fisko Budget (M06)")}</p>
    </div></section>`;
};
FS.nbWd = () => {
  const W = (S.nbWd || []).slice().reverse(), maker = ROLE === "fin", head = canSpend() && ROLE !== "fin" && ROLE !== "finhead", c = fcfg();
  const F = nbFunds().filter(f => { const p = nbPlan(f.id); return p && p.status === "approved"; });
  return `<section class="panel"><header><h2>${L("ถอนเงินฝากคลัง", "Withdrawals from the treasury deposit")}</h2><span class="sp"></span><span class="sub">${L("ถอนตามแผนที่อนุมัติ จ่ายหรือฝากคืนภายใน", "Against an approved plan; pay out or deposit back within")} ${c.refundDays} ${L("วันทำการ (ข้อ 101 (5))", "working days (clause 101 (5))")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("กองทุน / วัตถุประสงค์", "Fund / purpose")}</th><th class="n">${L("บาท", "Baht")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ต้องจ่ายหรือฝากคืนภายใน", "Pay or deposit back by")}</th><th></th></tr></thead>
      <tbody>${W.map(w => { const due = w.done ? addWorkdays(w.done.t.slice(0, 10), c.refundDays) : null, used = w.done ? nbWdUsed(w) : 0; return `<tr><td class="mono">${w.id}</td><td><span class="mono">${w.fund}</span> ${esc(tx(nbFund(w.fund).name))}<div class="sub">${esc(w.why)}</div></td><td class="n">${fmt(w.amount)}</td>
        <td>${stTag(NBW_ST, w.status)}${w.done ? `<div class="sub mono">${esc(w.done.doc)}</div>` : ""}</td>
        <td>${w.status === "done" ? (used >= w.amount ? `${dotI("ok")}<span class="sub">${L("จ่ายครบแล้ว", "All paid out")}</span>` : `${dotI(clockDot(due))}${clockTxt(due)}<div class="sub">${L("ยังไม่ได้จ่าย", "not paid yet")} ${fmt(w.amount - used)}</div>`) : "—"}</td>
        <td><div class="row" style="flex-wrap:nowrap">${head && w.status === "pending" ? `<button class="btn primary" type="button" data-nbwok="${w.id}">${L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-nbwno="${w.id}">${L("ไม่อนุมัติ", "Reject")}</button>` : ""}${maker && w.status === "done" && used < w.amount && daysUntil(due) < 3 ? `<button class="btn" type="button" data-nbwback="${w.id}">${L("ฝากคืนส่วนที่ไม่ได้จ่าย", "Deposit back what wasn't paid")}</button>` : ""}</div></td></tr>`; }).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มี", "None yet")}</td></tr>`}</tbody></table></div>
    ${maker && F.length ? `<div class="body"><form class="inline-form" id="nbw-form"><div class="f" style="flex:1 1 220px"><label for="nbw-f">${L("กองทุน", "Fund")}</label><select id="nbw-f">${F.map(f => `<option value="${f.id}">${f.id} · ${esc(tx(f.name))} · ${L("ฝากคลัง", "treasury")} ${fmt(nbBal(f).treasury)}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 150px"><label for="nbw-a">${L("จำนวน (บาท)", "Amount (baht)")}</label><input type="number" id="nbw-a" min="1" step="1" required></div>
      <div class="f" style="flex:2 1 240px"><label for="nbw-w">${L("ใช้จ่ายสำหรับ", "To pay for")}</label><input type="text" id="nbw-w" required></div>
      <button class="btn primary" type="submit">${L("ขอถอนเงินฝากคลัง", "Ask to withdraw")}</button></form></div>` : maker ? `<div class="body sub">${L("ต้องมีแผนที่อนุมัติก่อนจึงขอถอนได้", "A plan must be approved before any withdrawal")}</div>` : ""}</section>`;
};
// How much of a withdrawal has been paid out since it was made (fund vouchers and advances paid after it).
function nbWdUsed(w) {
  const t0 = w.done.t;
  return sumv((S.vouchers || []).filter(v => v.fund === w.fund && v.paid && v.paid.t >= t0).map(v => vCalc(v).net)) + sumv((S.advances || []).filter(a => a.fund === w.fund && a.paid && a.paid.t >= t0).map(a => a.approvedAmt || a.amount));
}

// ---------- page ----------
FIN_PAGES.splice(FIN_PAGES.findIndex(p => p.id === "cash") + 1, 0, { id: "nb", code: "F11", group: "receive", label: ["เงินนอกงบประมาณ", "Non-budget money"], roles: ["fin", "finhead", "exec", "plan", "audit"],
  sub: ["กองทุน แผนการใช้จ่าย การฝากและถอนเงินคลัง และรายการเคลื่อนไหว (ข้อ 4, 20, 60, 101)", "Funds, spending plans, treasury deposits and withdrawals, and movements (clauses 4, 20, 60 and 101)"],
  top: ["nbKpis"], tabs: [
    { id: "funds", label: ["กองทุนและยอดคงเหลือ", "Funds and balances"], secs: ["nbFunds"] },
    { id: "plans", label: ["แผนการใช้จ่าย", "Spending plans"], secs: ["nbPlans"] },
    { id: "wd", label: ["ถอนเงินฝากคลัง", "Treasury withdrawals"], secs: ["nbWd"] }] });
NAV_ICON.nb = "layers";
{
  const n = NAV.find(x => x.id === "finance");
  n.tabs = FIN_PAGES.map(p => [p.id, p.label, p.code, FIN_GROUPS[p.group], p.roles]);
}
FIN_BINDS.push(() => {
  if (FIN_TAB !== "nb") return;
  const done = msg => { commit(); renderShell(); route(); if (msg) toast(msg); };
  $$("[data-nbf]").forEach(b => (b.onclick = () => { NB_FUND = b.dataset.nbf; route(); }));
  const cur = () => nbFund(NB_FUND) || nbFunds()[0];
  const lf = $("#nbl-form");
  if (lf) lf.onsubmit = e => {
    e.preventDefault();
    const f = cur(); let p = nbPlan(f.id);
    if (!p) { p = { id: `NP-${FAM_FY}-${String((S.nbPlans || []).length + 1).padStart(2, "0")}`, fund: f.id, fy: FAM_FY, income: 0, lines: [], status: "draft", by: me().id, t: nowIso(), log: [] }; (S.nbPlans = S.nbPlans || []).push(p); }
    const nm = $("#nbl-n").value.trim(); p.lines.push({ id: `${f.id}-${p.lines.length + 1}`, name: [nm, nm], cat: $("#nbl-c").value, amount: Math.round(Number($("#nbl-a").value)) });
    p.income = Math.round(Number($("#nbl-i").value) || 0);
    audit(["เพิ่มรายการในแผนเงินนอกงบประมาณ", "Added a non-budget plan line"], `${p.id} · ${nm}`); done(L("เพิ่มแล้ว", "Added"));
  };
  const ps = $("#nbp-sub");
  if (ps) ps.onclick = () => { const p = nbPlan(cur().id); p.status = "submitted"; p.note = ""; p.log.push({ t: nowIso(), by: me().id, act: "submit" }); audit(["เสนอแผนเงินนอกงบประมาณ", "Sent a non-budget plan for approval"], p.id); notify(["exec"], [`แผนการใช้จ่ายเงินนอกงบประมาณ ${p.id} รออนุมัติ`, `Non-budget spending plan ${p.id} is waiting for approval`], "fnc-nb:plans"); done(L("เสนอแล้ว", "Sent")); };
  const ok = $("#nbp-ok");
  if (ok) ok.onclick = () => { const p = nbPlan(cur().id); if (p.by === me().id) { toast(L("ผู้จัดทำอนุมัติแผนของตนเองไม่ได้", "The maker can't approve their own plan")); return; } p.status = "approved"; p.approved = { by: me().id, t: nowIso() }; p.log.push({ t: nowIso(), by: me().id, act: "approve" }); audit(["อนุมัติแผนเงินนอกงบประมาณ", "Approved a non-budget plan"], p.id); notify(["fin", "plan"], [`แผนเงินนอกงบประมาณ ${p.id} อนุมัติแล้ว`, `Non-budget plan ${p.id} is approved`], "fnc-nb:plans"); done(L("อนุมัติแล้ว", "Approved")); };
  const no = $("#nbp-no");
  if (no) no.onclick = () => { const p = nbPlan(cur().id), why = $("#nbp-why").value.trim(); if (why.length < 5) { toast(L("ระบุเหตุผลอย่างน้อย 5 ตัวอักษร", "Give a reason of at least 5 characters")); return; } p.status = "returned"; p.note = why; p.log.push({ t: nowIso(), by: me().id, act: "return", note: why }); audit(["ส่งกลับแผนเงินนอกงบประมาณ", "Returned a non-budget plan"], `${p.id} · ${why}`); notify(["fin"], [`แผน ${p.id} ถูกส่งกลับ: ${why}`, `Plan ${p.id} was returned: ${why}`], "fnc-nb:plans"); done(L("ส่งกลับแล้ว", "Returned")); };
  const wf = $("#nbw-form");
  if (wf) wf.onsubmit = e => {
    e.preventDefault();
    const f = nbFund($("#nbw-f").value), amt = Math.round(Number($("#nbw-a").value)), b = nbBal(f), p = nbPlan(f.id), left = sumv(p.lines.map(l => l.amount)) - nbUsed(f.id);
    if (!(amt > 0) || amt > b.treasury) { toast(L(`ถอนได้ไม่เกินยอดฝากคลัง ${fmt(b.treasury)} บาท`, `At most the treasury balance, ${fmt(b.treasury)} baht`)); return; }
    if (amt > left) { toast(L(`เกินวงเงินคงเหลือของแผน ${fmt(left)} บาท (R-FN-07)`, `More than the plan has left, ${fmt(left)} baht (R-FN-07)`)); return; }
    const w = { id: `WD-${FAM_FY}-${String((S.nbWd || []).length + 1).padStart(2, "0")}`, fund: f.id, amount: amt, why: $("#nbw-w").value.trim(), status: "pending", by: me().id, t: nowIso(), done: null };
    (S.nbWd = S.nbWd || []).push(w); audit(["ขอถอนเงินฝากคลัง (เงินนอกงบประมาณ)", "Asked to withdraw non-budget money from the treasury"], `${w.id} · ${fmt(amt)}`);
    notify(["exec"], [`ขอถอนเงินฝากคลัง ${w.id} ${fmt(amt)} บาท รออนุมัติ`, `Treasury withdrawal ${w.id} (${fmt(amt)} baht) is waiting for approval`], "fnc-nb:wd"); done(L("ส่งขออนุมัติแล้ว", "Sent for approval"));
  };
  $$("[data-nbwok]").forEach(b => (b.onclick = () => { const w = S.nbWd.find(x => x.id === b.dataset.nbwok); if (!sodCheck("SD-11", sodActors("exec", "spend"), [w.by], w.id)) return; S.gfSeq = (S.gfSeq || 3600000400) + 1; w.status = "done"; w.approver = { by: me().id, t: nowIso() }; w.done = { t: nowIso(), doc: `GF-WD-${S.gfSeq}` }; audit(["อนุมัติถอนเงินฝากคลัง", "Approved a treasury withdrawal"], w.id); notify(["fin"], [`ถอนเงินฝากคลัง ${w.id} แล้ว จ่ายหรือฝากคืนภายใน ${fcfg().refundDays} วันทำการ`, `Withdrawal ${w.id} is done; pay out or deposit back within ${fcfg().refundDays} working days`], "fnc-nb:wd"); done(L("อนุมัติและถอนแล้ว (จำลอง)", "Approved and withdrawn (simulated)")); }));
  $$("[data-nbwno]").forEach(b => (b.onclick = () => { const w = S.nbWd.find(x => x.id === b.dataset.nbwno); w.status = "rejected"; audit(["ไม่อนุมัติถอนเงินฝากคลัง", "Rejected a treasury withdrawal"], w.id); done(L("บันทึกแล้ว", "Saved")); }));
  $$("[data-nbwback]").forEach(b => (b.onclick = () => { const w = S.nbWd.find(x => x.id === b.dataset.nbwback); w.backAmt = w.amount - nbWdUsed(w); w.status = "back"; audit(["ฝากคืนเงินที่ถอนแต่ไม่ได้จ่าย", "Deposited back unpaid withdrawn money"], `${w.id} · ${fmt(w.backAmt)}`); done(L("ฝากคืนแล้ว", "Deposited back")); }));
});
// Clocks and tasks: withdrawn money not paid out within 15 working days; plans and withdrawals waiting for the head.
{
  const base = finClocks;
  finClocks = function () {
    const out = base(), c = fcfg();
    (S.nbWd || []).filter(w => w.status === "done" && nbWdUsed(w) < w.amount).forEach(w => out.push({ due: addWorkdays(w.done.t.slice(0, 10), c.refundDays), title: `${L("จ่ายหรือฝากคืนเงินที่ถอนจากคลัง", "Pay out or deposit back withdrawal")} ${w.id}`, sub: `${w.fund} · ${fmt(w.amount - nbWdUsed(w))} ${L("บาท", "baht")}`, link: "fnc-nb:wd", src: L("ข้อ 101 (5)", "cl. 101 (5)") }));
    return out.sort((x, y) => (x.due < y.due ? -1 : 1));
  };
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments), R = (title, sub, due, link, cls) => t.unshift({ title, sub, due, link, cls });
    if (canSpend() && ROLE !== "fin" && ROLE !== "finhead") {
      (S.nbPlans || []).filter(p => p.status === "submitted").forEach(p => R(`${L("อนุมัติแผนเงินนอกงบประมาณ", "Approve the non-budget plan")} ${p.id}`, tx(nbFund(p.fund).name), TODAY, "fnc-nb:plans", "p-warn"));
      (S.nbWd || []).filter(w => w.status === "pending").forEach(w => R(`${L("อนุมัติถอนเงินฝากคลัง", "Approve treasury withdrawal")} ${w.id}`, `${w.fund} · ${fmt(w.amount)} ${L("บาท", "baht")}`, TODAY, "fnc-nb:wd", "p-warn"));
    }
    return t.filter(x => !(x.cls === "p-mute" && t.length > 1));
  };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "nb") { const k = canSpend() && ROLE !== "fin" && ROLE !== "finhead" ? (S.nbPlans || []).filter(p => p.status === "submitted").length + (S.nbWd || []).filter(w => w.status === "pending").length : 0; return k ? `<span class="badge">${k}</span>` : ""; }
    return tb(nid, tab);
  };
}

// ---------- Fisko Budget M06: the non-budget plans, read-only (FR-B-18) ----------
ALLOC_TABS.push({ id: "nb", label: ["เงินนอกงบประมาณ", "Non-budget money"] });
ALLOC.nb = () => {
  if (ALLOC_FY !== FAM_FY) return `<section class="panel"><div class="body sub">${L("แผนเงินนอกงบประมาณใช้กับปีงบประมาณที่กำลังใช้จ่าย", "Non-budget plans apply to the year being spent")} (${FAM_FY})</div></section>`;
  const F = nbFunds();
  return `<section class="panel"><header><h2>${L("เงินนอกงบประมาณ", "Non-budget money")} · ${fyLabel(FAM_FY)}</h2><span class="sp"></span><span class="sub">${L("ดูอย่างเดียว · การเงินจัดทำแผนใน Fisko Finance และหัวหน้าส่วนราชการอนุมัติ", "View only · Finance drafts the plans in Fisko Finance and the head of the agency approves")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th style="min-width:220px">${L("กองทุน", "Fund")}</th><th>${L("แผน", "Plan")}</th><th class="n">${L("วงเงินตามแผน", "Planned")}</th><th class="n">${L("ใช้ไป", "Used")}</th><th class="n">${L("รับเข้าปีนี้", "In this year")}</th><th class="n">${L("คงเหลือทั้งหมด", "Total held")}</th></tr></thead>
      <tbody>${F.map(f => { const p = nbPlan(f.id), b = nbBal(f); return `<tr><td><span class="mono">${f.id}</span> ${esc(tx(f.name))}</td><td>${p ? stTag(NBP_ST, p.status) : "—"}</td><td class="n">${p ? fmt(sumv(p.lines.map(l => l.amount))) : "—"}</td><td class="n">${fmt(nbUsed(f.id))}</td><td class="n">${fmt(b.income)}</td><td class="n">${fmt(b.total)}</td></tr>`; }).join("") || `<tr><td colspan="6" class="sub">—</td></tr>`}</tbody></table></div>
    ${allowed("finance") ? `<div class="body"><button class="btn ghost" type="button" data-jump="fnc-nb:plans">${L("เปิดใน Fisko Finance", "Open in Fisko Finance")}</button></div>` : ""}</section>`;
};
{
  const bb = BIND.allocation;
  BIND.allocation = () => { if (bb) bb(); if (ALLOC_TAB === "nb") $$("#view [data-jump]").forEach(b => (b.onclick = () => jump(b.dataset.jump))); };
}

// ---------- seed (called from the shared seed builder) ----------
function seedFinanceNB(s) {
  const U = r => s.users.find(u => u.role === r && u.primary) || s.users.find(u => u.role === r) || {}, FN = U("fin").id, EX = U("exec").id;
  s.nbFunds = [
    { id: "NB-01", name: ["เงินรายได้จากการให้บริการห้องประชุมและสถานที่", "Income from meeting rooms and venues"], basis: ["ได้รับอนุญาตจากกระทรวงการคลังให้เก็บไว้ใช้จ่ายเพื่อบำรุงรักษาสถานที่ (ตัวอย่าง)", "The Finance Ministry allows it to be kept for upkeep of the venues (sample)"], openA: 100000, openT: 250000 },
    { id: "NB-02", name: ["เงินบริจาคเพื่อพัฒนาบุคลากร", "Donations for staff development"], basis: ["เงินบริจาคที่ผู้บริจาคระบุวัตถุประสงค์ (ตัวอย่าง)", "Donations given for a stated purpose (sample)"], openA: 20000, openT: 60000 },
  ];
  s.nbPlans = [
    { id: "NP-2570-01", fund: "NB-01", fy: 2570, income: 200000, status: "approved", by: FN, t: "2026-09-20T10:00", approved: { by: EX, t: "2026-09-25T15:00" }, log: [],
      lines: [{ id: "NB-01-1", name: ["ซ่อมบำรุงห้องประชุมและระบบเสียง", "Meeting room and sound system upkeep"], cat: "ope", amount: 120000 }, { id: "NB-01-2", name: ["วัสดุและค่าสาธารณูปโภคของห้องประชุม", "Meeting room supplies and utilities"], cat: "ope", amount: 60000 }, { id: "NB-01-3", name: ["ครุภัณฑ์ห้องประชุม", "Meeting room equipment"], cat: "inv", amount: 150000 }] },
    { id: "NP-2570-02", fund: "NB-02", fy: 2570, income: 30000, status: "submitted", by: FN, t: "2026-10-12T10:00", log: [],
      lines: [{ id: "NB-02-1", name: ["ทุนฝึกอบรมบุคลากร", "Training grants"], cat: "train", amount: 60000 }, { id: "NB-02-2", name: ["ศึกษาดูงาน", "Study visits"], cat: "train", amount: 30000 }] },
  ];
  s.nbWd = [{ id: "WD-2570-01", fund: "NB-01", amount: 50000, why: "ซ่อมระบบเสียงห้องประชุมใหญ่", status: "done", by: FN, t: "2026-10-02T10:00", approver: { by: EX, t: "2026-10-05T10:00" }, done: { t: "2026-10-05T10:00", doc: "GF-WD-3600000350" } }];
  const rc = (s.receipts || []).find(r => r.kind === "nonbudget"); if (rc) rc.fund = "NB-01";
  const base = { contract: null, phase: null, commit: null, line: null, penalty: 0, other: 0, method: "epay", methodWhy: "", maker: FN, log: [], fund: "NB-01" };
  s.vouchers.push(
    Object.assign({}, base, { id: "VC-2570-009", type: "service", nbLine: "NB-01-1", desc: ["ซ่อมระบบเสียงห้องประชุมใหญ่", "Repair of the main hall sound system"], payee: { name: ["บริษัท ตัวอย่างเครื่องเสียง จำกัด", "Sample Audio Co., Ltd."], kind: "corp", taxId: "" }, gross: 32100, vat: true, due: "2026-10-12", ev: { inv: true, acc: true }, state: "paid", checker: U("finhead").id, approver: { by: EX, holder: EX, via: null, t: "2026-10-08T10:00", auth: "A1" }, t: "2026-10-06T10:00", funded: { t: "2026-10-08T10:00", nb: true }, paid: { t: "2026-10-09T10:00", ref: "EP-NB-001" } }),
    Object.assign({}, base, { id: "VC-2570-010", type: "utility", nbLine: "NB-01-2", desc: ["ค่าไฟฟ้าห้องประชุมให้เช่า เดือนกันยายน", "Electricity for the rented hall, September"], payee: { name: ["การไฟฟ้านครหลวง", "Metropolitan Electricity Authority"], kind: "gov", taxId: "" }, gross: 8400, vat: false, due: "2026-10-25", ev: { bill: true }, state: "draft", t: "2026-10-16T09:00" }),
  );
  s.vouchers.filter(v => v.fund).forEach(v => v.log.push({ t: v.t, by: FN, role: "fin", act: ["สร้างใบขอเบิก", "Created"], note: v.fund }));
}
