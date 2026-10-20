// Fisko Finance round FN5 (Finance design v0.1, chapters 6.6 and 6.7): GFMIS, reconciliation and closing.
// - Register of people assigned to work in GFMIS (FR-FN-34, clauses 10–12); making request files and remitting check it.
// - GFMIS files in (FR-FN-35): the revenue and remittance report and the monthly trial balance (posting and payment
//   results stay on F3). Remittances are matched with the report.
// - Bank statements of the agency accounts, three-way matching and the monthly bank reconciliation (FR-FN-36, 37),
//   prepared by someone who did not record that month's money (SD-15).
// - Daily close (FR-FN-38, clause 108), month close with the R-FN-06 checklist and reopening by someone else (FR-FN-39,
//   SD-16), year-end list, audit queries with the clause-109 clock (FR-FN-40), and actual spending to M06/M07 (FR-FN-41).
let BK_ACCT = "budget", BK_MONTH = null, PER_OPEN = null;
const BK_A = { budget: ["บัญชีเงินงบประมาณ", "Budget account"], nonbudget: ["บัญชีเงินนอกงบประมาณ", "Non-budget account"] };
const GF_DUTY = { record: ["บันทึกขอเบิกและรับเงิน", "Record requests and receipts"], approve: ["อนุมัติในระบบ", "Approve in the system"], remit: ["นำเงินส่งคลัง", "Remit to the treasury"] };
const curMonth = () => TODAY.slice(0, 7);
const prevMonth = m => { const [y, k] = m.split("-").map(Number); return k === 1 ? `${y - 1}-12` : `${y}-${String(k - 1).padStart(2, "0")}`; };

// ---------- GFMIS user register (FR-FN-34) ----------
function gfOk(duty) {
  const g = (S.gfUsers || []).find(x => x.user === me().id && x.duties.includes(duty) && x.until >= TODAY);
  if (g) return true;
  toast(L(`คุณยังไม่มีคำสั่งมอบหมายให้${tx(GF_DUTY[duty])}ใน GFMIS (ข้อ 12) · ดู F10`, `You have no written assignment to ${tx(GF_DUTY[duty]).toLowerCase()} in GFMIS (clause 12) · see F10`));
  audit(["ระบบกันรายการ: ไม่มีคำสั่งมอบหมายใน GFMIS", "Blocked: no GFMIS assignment"], duty);
  return false;
}

// ---------- agency bank accounts ----------
// Money through the agency accounts: advances (funded by GFMIS, then paid to the borrower) and agency-route vouchers.
function bookLines(acct, m) {
  if (acct !== "budget") return [];
  const out = [], add = (d, ref, amt, desc) => { if (d.slice(0, 7) === m) out.push({ d, ref, amt, desc }); };
  (S.advances || []).filter(a => a.paid && a.source === "budget").forEach(a => { add(a.paid.t.slice(0, 10), `GF-FUND-${a.id}`, advAmt(a), [`เงินเข้าจาก GFMIS สำหรับเงินยืม ${a.id}`, `Funds from GFMIS for advance ${a.id}`]); add(a.paid.t.slice(0, 10), a.paid.ref, -advAmt(a), [`จ่ายเงินยืม ${a.id} ${userName(a.borrower)}`, `Advance ${a.id} paid to ${userName(a.borrower)}`]); });
  (S.vouchers || []).filter(v => v.funded).forEach(v => { add(v.funded.t.slice(0, 10), `GF-FUND-${v.id}`, vCalc(v).net, [`เงินเข้าจาก GFMIS สำหรับ ${v.id}`, `Funds from GFMIS for ${v.id}`]); if (v.paid) add(v.paid.t.slice(0, 10), v.paid.ref, -vCalc(v).net, [`จ่าย ${v.id} ${tx(v.payee.name)}`, `Paid ${v.id} to ${tx(v.payee.name)}`]); });
  (S.bookAdj || []).filter(x => x.acct === acct).forEach(x => add(x.d, x.ref, x.amt, x.desc));
  return out.sort((a, b) => (a.d < b.d ? -1 : 1));
}
const bkOpen = (acct, m) => { const o = ((S.bankAccts || {})[acct] || { open: {} }).open; if (o[m] != null) return o[m]; const p = prevMonth(m); return p < "2026-09" ? 0 : bkOpen(acct, p) + sumv(bookLines(acct, p).map(l => l.amt)); };
const bkBook = (acct, m) => bkOpen(acct, m) + sumv(bookLines(acct, m).map(l => l.amt));
const stmtOf = (acct, m) => (S.bankStmts || []).find(s => s.acct === acct && s.month === m);
const recOf = (acct, m) => (S.bankRecs || []).find(r => r.acct === acct && r.month === m);
// Three-way: a Fisko line matches a bank line with the same reference and amount.
function bkMatch(acct, m) {
  const book = bookLines(acct, m), st = stmtOf(acct, m), bank = st ? st.lines : [];
  const bookOnly = book.filter(b => !bank.some(x => x.ref === b.ref && x.amt === b.amt)), bankOnly = bank.filter(x => !book.some(b => b.ref === x.ref && b.amt === x.amt));
  const matched = book.length - bookOnly.length;
  const bankClose = st ? st.open + sumv(bank.map(x => x.amt)) : null, bookBal = bkBook(acct, m);
  const diff = st ? Math.round(((bankClose + sumv(bookOnly.map(b => b.amt))) - (bookBal + sumv(bankOnly.map(x => x.amt)))) * 100) / 100 : null;
  return { book, bank, bookOnly, bankOnly, matched, bankClose, bookBal, diff, st };
}
// People who recorded money in a month can't prepare its bank reconciliation (SD-15).
const monthRecorders = m => [...new Set([...(S.receipts || []).filter(r => r.date.slice(0, 7) === m).map(r => r.by), ...(S.vouchers || []).filter(v => v.paid && v.paid.t.slice(0, 7) === m).map(v => v.maker), ...(S.advances || []).filter(a => a.paid && a.paid.t.slice(0, 7) === m).map(() => (S.users.find(u => u.role === "fin") || {}).id)])].filter(Boolean);
SOD_RULES.push(["SD-15", ["ผู้บันทึกรับหรือจ่ายเงินของงวด จัดทำงบพิสูจน์ยอดเงินฝากของงวดนั้นไม่ได้", "Whoever recorded money in a period can't prepare its bank reconciliation"]],
  ["SD-16", ["เปิดงวดที่ปิดแล้วต้องเป็นคนละคนกับผู้ปิด", "A closed period is reopened by someone other than the person who closed it"]]);
SOD_STEPS.push([["บันทึกรับหรือจ่ายเงิน", "Record money in or out"], ["จัดทำงบพิสูจน์ยอดเงินฝาก", "Prepare the bank reconciliation"], "SD-15"], [["ปิดงวด", "Close a period"], ["เปิดงวดนั้นใหม่", "Reopen it"], "SD-16"]);

// ---------- F7 reconciliation and the GFMIS user register ----------
const BK_MONTHS = ["2026-09", "2026-10"];
{
  // FS.gfUsers (the GFMIS assignment register) is a shared list in 84-fin-crud.js (FR-FC-44).
  // One month picker for every reconciliation tab, and an account picker where it applies.
  FS.bkMonth = () => `<div class="fn-filter"><span class="sub">${L("เดือน", "Month")}</span>${segBar(BK_MONTHS.map(k => [k, monthLabel(k)]), BK_MONTH || curMonth(), "bkm")}</div>`;
  FS.bkPicker = () => `<div class="fn-filter"><span class="sub">${L("เดือน", "Month")}</span>${segBar(BK_MONTHS.map(k => [k, monthLabel(k)]), BK_MONTH || curMonth(), "bkm")}<span class="sub">${L("บัญชี", "Account")}</span>${segBar(Object.keys(BK_A).map(k => [k, tx(BK_A[k])]), BK_ACCT, "bka")}</div>`;
  FS.bank = () => {
    const m = BK_MONTH || curMonth(), acct = BK_ACCT, x = bkMatch(acct, m), rec = recOf(acct, m), fin = isFinRole(), maker = ROLE === "fin";
    return `
    <section class="panel"><header><h2>${L("รายการเดินบัญชีและการจับคู่", "Bank statement and matching")} · ${tx(BK_A[acct])} · ${monthLabel(m)}</h2><span class="sp"></span>
      ${maker && !x.st ? `<button class="btn primary" type="button" id="bk-imp">${L("นำเข้ารายการเดินบัญชี (ตัวอย่าง)", "Import the bank statement (sample)")}</button>` : ""}</header>
      ${x.st ? `<div class="tbl-wrap"><table><thead><tr><th>${L("วันที่", "Date")}</th><th>${L("อ้างอิง", "Reference")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("ใน Fisko", "In Fisko")}</th><th class="n">${L("ในธนาคาร", "At the bank")}</th><th>${L("ผล", "Result")}</th><th></th></tr></thead>
        <tbody>${[...x.book.map(b => ({ b, k: x.bank.find(y => y.ref === b.ref && y.amt === b.amt) })), ...x.bankOnly.map(k => ({ b: null, k }))].map(({ b, k }) => { const r = b || k, adj = !b && (S.bookAdj || []).some(a => a.ref === k.ref); return `<tr><td class="sub">${fdate(r.d)}</td><td class="mono">${esc(r.ref)}</td><td>${esc(tx(r.desc))}</td><td class="n">${b ? fmt(b.amt, 2) : "—"}</td><td class="n">${k ? fmt(k.amt, 2) : "—"}</td>
          <td>${b && k ? `${dotI("ok")}${L("ตรงกัน", "Matched")}` : b ? `${dotI("warn")}${L("ระหว่างทาง (ยังไม่ผ่านธนาคาร)", "In transit (not at the bank yet)")}` : `${dotI("bad")}${L("มีเฉพาะในธนาคาร", "Only at the bank")}`}</td>
          <td>${!b && fin && !adj && !(rec && rec.status === "signed") ? `<button class="btn ghost" type="button" data-bkadj="${esc(k.ref)}">${L("บันทึกเข้าบัญชี", "Record in the books")}</button>` : ""}</td></tr>`; }).join("") || `<tr><td colspan="7" class="sub">${L("ไม่มีรายการในเดือนนี้", "No movements this month")}</td></tr>`}</tbody></table></div>
        <div class="body"><div class="grid2" style="gap:16px">
          <table><tbody>
            <tr><td>${L("ยอดตามรายการเดินบัญชี", "Balance per bank")}</td><td class="n">${fmt(x.bankClose, 2)}</td></tr>
            <tr><td>${L("บวก/หัก รายการระหว่างทางใน Fisko", "± items in transit in Fisko")}</td><td class="n">${fmt(sumv(x.bookOnly.map(b => b.amt)), 2)}</td></tr>
            <tr><td><b>${L("ยอดธนาคารที่ปรับแล้ว", "Adjusted bank balance")}</b></td><td class="n"><b>${fmt(x.bankClose + sumv(x.bookOnly.map(b => b.amt)), 2)}</b></td></tr>
          </tbody></table>
          <table><tbody>
            <tr><td>${L("ยอดตามบัญชี (Fisko)", "Balance per books (Fisko)")}</td><td class="n">${fmt(x.bookBal, 2)}</td></tr>
            <tr><td>${L("บวก/หัก รายการที่มีเฉพาะในธนาคาร", "± items only at the bank")}</td><td class="n">${fmt(sumv(x.bankOnly.map(k => k.amt)), 2)}</td></tr>
            <tr><td><b>${L("ยอดบัญชีที่ปรับแล้ว", "Adjusted book balance")}</b></td><td class="n"><b>${fmt(x.bookBal + sumv(x.bankOnly.map(k => k.amt)), 2)}</b></td></tr>
          </tbody></table></div>
          <p style="margin:10px 0 0">${dotI(x.diff === 0 ? "ok" : "bad")}${L("ผลต่าง", "Difference")} ${fmt(x.diff, 2)} · ${x.bankOnly.length ? L(`ยังมีรายการเฉพาะในธนาคาร ${x.bankOnly.length} รายการต้องบันทึกเข้าบัญชีก่อนลงนาม`, `${x.bankOnly.length} bank-only items must be recorded in the books before signing`) : L("ไม่มีรายการเฉพาะในธนาคารค้าง", "No bank-only items left")}</p>
          ${rec && rec.status === "signed" ? `<p class="sub" style="margin:6px 0 0">${dotI("ok")}${L("งบพิสูจน์ยอดเงินฝากลงนามแล้ว", "Bank reconciliation signed")} · ${esc(userName(rec.by))} · ${fdate(rec.t, true)}</p>` : fin ? `<button class="btn primary" type="button" id="bk-sign" style="margin-top:8px" ${x.diff === 0 && !x.bankOnly.length ? "" : "disabled"}>${L("ลงนามงบพิสูจน์ยอดเงินฝาก", "Sign the bank reconciliation")}</button> <span class="sub">${L("ผู้บันทึกรับจ่ายของเดือนนี้ลงนามไม่ได้ (SD-15)", "Whoever recorded this month's money can't sign (SD-15)")}</span>` : ""}
        </div>` : `<div class="body sub">${L("ยังไม่ได้นำเข้ารายการเดินบัญชีของเดือนนี้", "This month's statement isn't imported yet")}</div>`}</section>`;
  };
  FS.gfRemit = () => {
    const maker = ROLE === "fin", rem = S.remits || [];
    return `
      <section class="panel"><header><h2>${L("นำส่งเงิน ↔ รายงาน GFMIS", "Remittances ↔ GFMIS report")}</h2><span class="sp"></span>${maker && rem.some(r => !r.gf) ? `<button class="btn" type="button" id="gfr-imp">${L("นำเข้ารายงานรายได้ (ตัวอย่าง)", "Import the revenue report (sample)")}</button>` : ""}</header>
        <div class="tbl-wrap"><table><thead><tr><th>${L("นำส่ง", "Remittance")}</th><th class="n">${L("บาท", "Baht")}</th><th>GFMIS</th></tr></thead>
          <tbody>${rem.map(r => `<tr><td class="mono">${r.id}<div class="sub">${tx(REV_T[r.cls])}</div></td><td class="n">${fmt(r.amount, 2)}</td><td>${r.gf ? `${dotI("ok")}<span class="mono">${esc(r.gf.doc)}</span>` : `${dotI("warn")}<span class="sub">${L("ยังไม่พบในรายงาน", "Not in a report yet")}</span>`}</td></tr>`).join("") || `<tr><td colspan="3" class="sub">—</td></tr>`}</tbody></table></div></section>`;
  };
  FS.tb = () => {
    const m = BK_MONTH || curMonth(), maker = ROLE === "fin", tb = (S.tbs || []).find(t => t.month === m);
    return `
      <section class="panel"><header><h2>${L("งบทดลองจาก GFMIS", "GFMIS trial balance")} · ${monthLabel(m)}</h2><span class="sp"></span>${maker && !tb ? `<button class="btn" type="button" id="tb-imp">${L("นำเข้างบทดลอง (ตัวอย่าง)", "Import the trial balance (sample)")}</button>` : ""}</header>
        ${tb ? `<div class="tbl-wrap"><table><thead><tr><th>${L("บัญชี", "Account")}</th><th class="n">${L("เดบิต", "Debit")}</th><th class="n">${L("เครดิต", "Credit")}</th></tr></thead>
          <tbody>${tb.rows.map(r => `<tr><td><span class="mono">${r.code}</span> ${esc(tx(r.name))}</td><td class="n">${r.dr ? fmt(r.dr, 2) : ""}</td><td class="n">${r.cr ? fmt(r.cr, 2) : ""}</td></tr>`).join("")}</tbody>
          <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(sumv(tb.rows.map(r => r.dr)), 2)}</td><td class="n">${fmt(sumv(tb.rows.map(r => r.cr)), 2)}</td></tr></tfoot></table></div>
          <div class="body sub">${dotI(tb.ok ? "ok" : "bad")}${tb.ok ? L("เดบิตเท่ากับเครดิต และเงินฝากธนาคารตรงกับยอดตามบัญชีใน Fisko", "Debits equal credits and the bank balance matches the Fisko books") : L("ไม่ตรงกับยอดใน Fisko ตรวจสอบ", "Doesn't match the Fisko books; check")} · ${L("นำเข้า", "imported")} ${fdate(tb.t, true)}</div>` : `<div class="body sub">${L("ยังไม่ได้นำเข้า", "Not imported yet")}</div>`}</section>`;
  };
}

// ---------- F8 closing and reports ----------
function dayChecks(d) {
  const R = (S.receipts || []).filter(r => r.date === d && !r.cancelled), dc = dcOf(d), paid = (S.vouchers || []).filter(v => v.paid && v.paid.t.slice(0, 10) === d), due = finClocks().filter(k => k.due <= d);
  return [
    { ok: R.every(r => r.recorded), t: L(`บันทึกรับเงินของวันในระบบครบ (${R.length} ใบ) · ข้อ 81`, `The day's receipts are recorded (${R.length}) · cl. 81`) },
    { ok: !dcNeeded(d) || (dc && dc.status !== "counting"), t: L("รายงานเงินคงเหลือประจำวันลงนามครบ · ข้อ 92–93", "The daily cash report is signed · cl. 92–93") },
    { ok: paid.every(v => v.dayCheck), t: L(`ตรวจการจ่ายของวันกับหลักฐานแล้ว (${paid.length} รายการ) · ข้อ 43`, `The day's payments are checked (${paid.length}) · cl. 43`) },
    { ok: !due.length, t: L(`ไม่มีงานที่ครบกำหนดค้าง (${due.length} รายการ)`, `Nothing on the clock is due (${due.length})`), soft: true },
  ];
}
function monthChecks(m) {
  const per = (S.periods || []).find(p => p.month === m) || {};
  const days = [...new Set((S.receipts || []).filter(r => r.date.slice(0, 7) === m && !r.cancelled && r.method !== "epay").map(r => r.date))];
  const lateRemit = (S.receipts || []).filter(r => !r.cancelled && !r.remit && r.date.slice(0, 7) <= m && rcDue(r) < TODAY && rcDue(r).slice(0, 7) <= m);
  return [
    { k: 1, ok: (S.vouchers || []).filter(v => v.paid && v.paid.t.slice(0, 7) === m).every(v => v.gf), t: L("ใบขอเบิกที่จ่ายในเดือนมีเลขที่เอกสาร GFMIS ครบ", "Every voucher paid in the month has a GFMIS document") },
    { k: 2, ok: days.every(d => { const x = dcOf(d); return x && x.status !== "counting"; }), t: L(`รายงานเงินคงเหลือทุกวันที่มีเงินสดลงนามครบ (${days.length} วัน)`, `Daily cash reports signed for every cash day (${days.length})`) },
    { k: 3, ok: !lateRemit.length, t: L(`ไม่มีเงินที่เลยกำหนดนำส่ง (${lateRemit.length})`, `No money past its remittance date (${lateRemit.length})`) },
    { k: 4, ok: Object.keys(BK_A).every(a => (recOf(a, m) || {}).status === "signed"), t: L("งบพิสูจน์ยอดเงินฝากทุกบัญชีลงนามแล้ว ผลต่างเป็นศูนย์", "Bank reconciliations for every account are signed with no difference") },
    { k: 5, ok: !!(S.tbs || []).find(t => t.month === m && t.ok), t: L("นำเข้างบทดลองของเดือนจาก GFMIS แล้วและตรงกัน", "The month's GFMIS trial balance is imported and agrees") },
    { k: 6, ok: !!per.advReviewed, t: L("ทบทวนทะเบียนเงินยืมค้างและเลยกำหนดแล้ว", "Open and overdue advances reviewed"), tick: true },
  ];
}
FS.dayClose = () => {
  const head = ROLE === "finhead", dch = dayChecks(TODAY), dclose = (S.dayCloses || []).find(x => x.date === TODAY);
  return `
  <section class="panel"><header><h2>${L("ปิดวัน", "Daily close")} · ${fdate(TODAY)}</h2><span class="sp"></span>${dclose ? tag(`${L("ปิดแล้ว", "Closed")} · ${esc(userName(dclose.by))}`, "p-ok") : ""}</header>
    <div class="body">${dch.map(c => `<div style="margin:2px 0">${dotI(c.ok ? "ok" : c.soft ? "warn" : "bad")}${esc(c.t)}</div>`).join("")}
      ${head && !dclose ? `<div class="row" style="margin-top:10px;flex-wrap:wrap"><input type="text" id="dcl-why" placeholder="${L("เหตุผล ถ้ามีข้อที่ไม่ผ่าน", "Reason, if a check fails")}" style="min-width:240px;flex:1" aria-label="${L("เหตุผล", "Reason")}"><button class="btn primary" type="button" id="dcl-go">${L("ปิดวันและลงนาม (ข้อ 108)", "Close the day and sign (clause 108)")}</button></div>` : ""}
      ${dclose && dclose.why ? `<p class="sub" style="margin:6px 0 0">${L("ข้อยกเว้น", "Exceptions")}: ${esc(dclose.why)}</p>` : ""}</div></section>`;
};
FS.monthClose = () => {
  const head = ROLE === "finhead", P = S.periods || [];
  const m = PER_OPEN || P.find(p => p.status !== "closed")?.month || curMonth(), per = P.find(p => p.month === m) || { month: m, status: "open" }, mch = monthChecks(m);
  return `
  <section class="panel"><header><h2>${L("ปิดเดือน", "Month close")}</h2><span class="sp"></span>
    ${segBar(BK_MONTHS.map(k => { const p = P.find(x => x.month === k) || { status: "open" }; return [k, `${monthLabel(k)} · ${p.status === "closed" ? L("ปิดแล้ว", "closed") : L("เปิด", "open")}`]; }), m, "perm")}</header>
    <div class="body">${mch.map(c => `<div style="margin:3px 0">${dotI(c.ok ? "ok" : "bad")}${c.k}. ${esc(c.t)}${c.tick && !c.ok && head && per.status !== "closed" ? ` <button class="btn ghost" type="button" id="per-adv">${L("ทบทวนแล้ว", "Reviewed")}</button>` : ""}</div>`).join("")}
      ${per.status === "closed" ? `<p style="margin:8px 0 0">${dotI("ok")}${L("ปิดงวดแล้ว", "Period closed")} · ${esc(userName(per.by))} · ${fdate(per.t, true)}${per.why ? ` · ${L("ข้อยกเว้น", "exceptions")}: ${esc(per.why)}` : ""}</p>
        ${head || ROLE === "exec" ? `<div class="row" style="margin-top:8px"><input type="text" id="per-rwhy" placeholder="${L("เหตุผลที่เปิดงวดใหม่", "Why reopen")}" style="min-width:240px;flex:1" aria-label="${L("เหตุผล", "Reason")}"><button class="btn danger" type="button" id="per-reopen">${L("เปิดงวดใหม่ (SD-16)", "Reopen (SD-16)")}</button></div>` : ""}`
      : head ? `<div class="row" style="margin-top:10px;flex-wrap:wrap"><input type="text" id="per-why" placeholder="${L("เหตุผลยกเว้นสำหรับข้อที่ไม่ผ่าน", "Reason for any failed check")}" style="min-width:240px;flex:1" aria-label="${L("เหตุผล", "Reason")}"><button class="btn primary" type="button" id="per-close">${L("ปิดงวด", "Close the period")} ${monthLabel(m)}</button></div>` : `<p class="sub" style="margin:8px 0 0">${L("หัวหน้าการเงินเป็นผู้ปิดงวด", "The head of finance closes periods")}</p>`}
      ${(per.log || []).length ? `<details style="margin-top:8px"><summary class="sub">${L("ประวัติ", "History")}</summary>${per.log.map(l => `<div class="sub">${fdate(l.t, true)} · ${esc(userName(l.by))} · ${esc(tx(l.act))}${l.note ? ` · ${esc(l.note)}` : ""}</div>`).join("")}</details>` : ""}</div></section>`;
};
FS.yearEnd = () => {
  const nfy = `${FAM_FY - 543}-09-30`;
  return `
    <section class="panel"><header><h2>${L("ก่อนปิดปีงบประมาณ", "Before the year end")} ${FAM_FY}</h2><span class="sp"></span><span class="sub">${fdate(nfy)}</span></header>
      <div class="body">
        <div>${dotI(carryCands().every(x => carrySent(x.id)) ? "ok" : "warn")}${L("เสนอกันเงินเหลื่อมปีครบทุกรายการที่เข้าเกณฑ์", "Every carry-over candidate is proposed")} (${carryCands().filter(x => !carrySent(x.id)).length} ${L("ค้าง", "left")}) · ${L("ข้อ 106", "cl. 106")}</div>
        <div>${dotI((S.advances || []).filter(a => OPEN_ADV.includes(a.state)).length ? "warn" : "ok")}${L("เงินยืมค้างที่จะคาบเกี่ยวปี", "Advances that will run into the new year")} ${(S.advances || []).filter(a => OPEN_ADV.includes(a.state)).length} · ${L("ข้อ 62", "cl. 62")}</div>
        <div>${dotI("warn")}${L("เปลี่ยนเล่มใบเสร็จและรายงานใบเสร็จภายใน 31 ต.ค.", "New receipt books, and the receipt report by 31 Oct")} · ${L("ข้อ 74–75", "cl. 74–75")}</div>
        <div>${dotI("warn")}${L("งบทดลองสิ้นปีและชุดเอกสารประกอบรายงานการเงิน (ร่าง)", "Year-end trial balance and the financial statement pack (draft)")}</div>
      </div></section>`;
};
FS.auditQ = () => {
  const head = ROLE === "finhead", Q = S.auditQs || [];
  return `
    <section class="panel"><header><h2>${L("ข้อทักท้วงและเหตุการณ์", "Audit queries and incidents")}</h2><span class="sp"></span><span class="sub">${L("ชี้แจงภายใน 15 วัน (ข้อ 109)", "Answer within 15 days (clause 109)")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("เรื่อง", "Subject")}</th><th>${L("กำหนด", "Due")}</th><th></th></tr></thead>
        <tbody>${Q.map(q => `<tr><td class="mono">${q.id}<div class="sub">${esc(q.from)}</div></td><td>${esc(tx(q.subject))}${q.answer ? `<div class="sub">${L("ชี้แจง", "Answer")}: ${esc(q.answer.text)}</div>` : ""}</td><td>${q.answer ? tag(L("ชี้แจงแล้ว", "Answered"), "p-ok") : `${dotI(clockDot(q.due))}${clockTxt(q.due)}`}</td>
          <td>${head && !q.answer ? rowBtn("aq:" + q.id, L("ชี้แจง", "Answer")) : ""}</td></tr>
          ${head && !q.answer && FIN_ROW === "aq:" + q.id ? rowForm(4, `<b style="font-weight:600">${L("คำชี้แจง", "Answer")} ${q.id}</b><input type="text" id="aq-${q.id}" placeholder="${L("คำชี้แจง", "Answer")}" style="min-width:260px;flex:1" aria-label="${L("คำชี้แจง", "Answer")}"><button class="btn primary" type="button" data-aq="${q.id}">${L("ส่ง", "Send")}</button>`) : ""}`).join("")}
          ${(S.dailyCash || []).filter(d => d.status === "diff").map(d => `<tr><td class="mono">DC ${d.date}</td><td>${L("ยอดเงินที่นับไม่ตรงกับรายงานเงินคงเหลือ (ข้อ 95)", "Cash count differed from the daily report (clause 95)")}</td><td>${d.ack ? tag(L("หัวหน้ารับทราบ", "Acknowledged"), "p-info") : tag(L("รอรับทราบ", "To acknowledge"), "p-warn")}</td><td></td></tr>`).join("")}</tbody></table></div>
      ${head ? `<div class="body"><form class="inline-form" id="aq-form"><div class="f" style="flex:2 1 220px"><label for="aq-sub">${L("ข้อทักท้วงใหม่ จาก สตง.", "New query from the State Audit Office")}</label><input type="text" id="aq-sub" required></div><div class="f" style="flex:0 1 160px"><label for="aq-date">${L("วันที่ได้รับ", "Received on")}</label><input type="date" id="aq-date" value="${TODAY}" required></div><button class="btn" type="submit">${L("บันทึก", "Add")}</button></form></div>` : ""}</section>`;
};
FS.budgetFeed = () => {
  const spend = famLines().map(l => ({ l, paid: linePaid(l.id) })).filter(x => x.paid > 0);
  return `
  <section class="panel"><header><h2>${L("ยอดเบิกจ่ายที่ส่งให้ Fisko Budget (M06, M07)", "Spending sent to Fisko Budget (M06, M07)")}</h2><span class="sp"></span><span class="sub">${L("คำนวณจากการจ่ายจริงใน Fisko Finance ทันทีที่จ่าย", "Worked out from what Fisko Finance has actually paid, as soon as it is paid")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รายการจัดสรร", "Allocation line")}</th><th class="n">${L("จัดสรร (ลบ.)", "Allocated (M)")}</th><th class="n">${L("เบิกจ่ายจริง (ลบ.)", "Spent (M)")}</th><th class="n">%</th></tr></thead>
      <tbody>${spend.map(x => `<tr><td>${esc(lineLabel(x.l))} <span class="mono sub">${x.l.id}</span></td><td class="n">${mb(x.l.amount)}</td><td class="n">${mb(x.paid)}</td><td class="n">${fmt(x.l.amount ? x.paid / x.l.amount * 100 : 0, 1)}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">—</td></tr>`}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${mb(sumv(spend.map(x => x.l.amount)))}</td><td class="n">${mb(sumv(spend.map(x => x.paid)))}</td><td></td></tr></tfoot></table></div></section>`;
};

// ---------- actions ----------
{
  FIN_BINDS.push(() => {
    const done = msg => { commit(); renderShell(); route(); toast(msg); };
    {
      const m = BK_MONTH || curMonth(), acct = BK_ACCT;
      $$("[data-bkm]").forEach(b => (b.onclick = () => { BK_MONTH = b.dataset.bkm; route(); }));
      $$("[data-bka]").forEach(b => (b.onclick = () => { BK_ACCT = b.dataset.bka; route(); }));
      const bi = $("#bk-imp");
      if (bi) bi.onclick = () => {
        const book = bookLines(acct, m), lines = book.slice(0, Math.max(0, book.length - 1)).map(l => Object.assign({}, l));
        if (acct === "budget") lines.push({ d: `${m}-${m === curMonth() ? TODAY.slice(8) : "28"}`, ref: `FEE-${m.replace("-", "")}`, amt: -25, desc: ["ค่าธรรมเนียมธนาคาร", "Bank fee"] });
        const st = { acct, month: m, open: bkOpen(acct, m), lines, t: nowIso(), by: me().id };
        (S.bankStmts = S.bankStmts || []).push(st);
        audit(["นำเข้ารายการเดินบัญชีธนาคาร", "Imported a bank statement"], `${acct} · ${m} · ${lines.length}`); done(L("นำเข้าแล้ว · ตรวจรายการที่ไม่ตรง", "Imported · review the unmatched items"));
      };
      $$("[data-bkadj]").forEach(b => (b.onclick = () => {
        const k = stmtOf(acct, m).lines.find(x => x.ref === b.dataset.bkadj);
        (S.bookAdj = S.bookAdj || []).push({ acct, d: k.d, ref: k.ref, amt: k.amt, desc: k.desc, by: me().id, t: nowIso() });
        audit(["บันทึกรายการจากธนาคารเข้าบัญชี", "Recorded a bank-only item in the books"], `${k.ref} · ${fmt(k.amt, 2)}`); done(L("บันทึกเข้าบัญชีแล้ว", "Recorded in the books"));
      }));
      const bs = $("#bk-sign");
      if (bs) bs.onclick = () => {
        if (!sodCheck("SD-15", [me().id], monthRecorders(m), `${acct} ${m}`)) return;
        const r = { acct, month: m, status: "signed", by: me().id, t: nowIso(), diff: bkMatch(acct, m).diff };
        S.bankRecs = (S.bankRecs || []).filter(x => !(x.acct === acct && x.month === m)); S.bankRecs.push(r);
        audit(["ลงนามงบพิสูจน์ยอดเงินฝากธนาคาร", "Signed a bank reconciliation"], `${acct} · ${m}`); done(L("ลงนามแล้ว", "Signed"));
      };
      const gr = $("#gfr-imp");
      if (gr) gr.onclick = () => { (S.remits || []).filter(r => !r.gf).forEach(r => { S.gfSeq = (S.gfSeq || 3600000400) + 1; r.gf = { doc: String(S.gfSeq), t: nowIso() }; }); audit(["นำเข้ารายงานรายได้จาก GFMIS", "Imported the GFMIS revenue report"], ""); done(L("นำเข้าแล้ว · การนำส่งตรงกับ GFMIS", "Imported · remittances match GFMIS")); };
      const ti = $("#tb-imp");
      if (ti) ti.onclick = () => {
        const bank = bkBook("budget", m), nb = bkBook("nonbudget", m), spent = sumv(famLines().map(l => linePaid(l.id)));
        const rows = [
          { code: "1101020501", name: ["เงินฝากธนาคาร บัญชีเงินงบประมาณ", "Bank deposit, budget account"], dr: bank, cr: 0 },
          { code: "1101020603", name: ["เงินฝากธนาคาร บัญชีเงินนอกงบประมาณ", "Bank deposit, non-budget account"], dr: nb, cr: 0 },
          { code: "5100000000", name: ["ค่าใช้จ่ายจากงบประมาณ (สะสม)", "Expenses from the budget (to date)"], dr: spent, cr: 0 },
          { code: "4307010103", name: ["รายได้จากงบประมาณ (สะสม)", "Revenue from the budget (to date)"], dr: 0, cr: spent },
          { code: "3101010101", name: ["ทุนและเงินฝากยกมา", "Equity and deposits brought forward"], dr: 0, cr: bank + nb },
        ];
        (S.tbs = S.tbs || []).push({ month: m, rows, t: nowIso(), by: me().id, ok: true });
        audit(["นำเข้างบทดลองจาก GFMIS", "Imported the GFMIS trial balance"], m); done(L("นำเข้างบทดลองแล้ว · ตรงกับยอดใน Fisko", "Trial balance imported · agrees with Fisko"));
      };
    }
    {
      const P = (S.periods = S.periods || []), m = PER_OPEN || (P.find(p => p.status !== "closed") || {}).month || curMonth();
      const per = () => { let p = P.find(x => x.month === m); if (!p) { p = { month: m, status: "open", log: [] }; P.push(p); } return p; };
      $$("[data-perm]").forEach(b => (b.onclick = () => { PER_OPEN = b.dataset.perm; route(); }));
      const dg = $("#dcl-go");
      if (dg) dg.onclick = () => { const bad = dayChecks(TODAY).filter(c => !c.ok && !c.soft), why = $("#dcl-why").value.trim(); if (bad.length && why.length < 5) { toast(L("มีข้อที่ไม่ผ่าน ระบุเหตุผลอย่างน้อย 5 ตัวอักษร", "A check fails; give a reason of at least 5 characters")); return; }
        (S.dayCloses = S.dayCloses || []).push({ date: TODAY, by: me().id, t: nowIso(), why: bad.length ? why : "" }); audit(["ปิดวัน", "Closed the day"], `${TODAY}${bad.length ? ` · ${why}` : ""}`); done(L("ปิดวันแล้ว", "Day closed")); };
      const pa = $("#per-adv"); if (pa) pa.onclick = () => { const p = per(); p.advReviewed = { by: me().id, t: nowIso() }; (p.log = p.log || []).push({ t: nowIso(), by: me().id, act: ["ทบทวนทะเบียนเงินยืม", "Reviewed advances"] }); audit(["ทบทวนทะเบียนเงินยืมก่อนปิดงวด", "Reviewed advances before the close"], m); done(L("บันทึกแล้ว", "Saved")); };
      const pc = $("#per-close");
      if (pc) pc.onclick = () => { const bad = monthChecks(m).filter(c => !c.ok), why = $("#per-why").value.trim(); if (bad.length && why.length < 10) { toast(L(`ยังไม่ผ่าน ${bad.length} ข้อ ระบุเหตุผลยกเว้นอย่างน้อย 10 ตัวอักษร`, `${bad.length} checks fail; give a reason of at least 10 characters`)); return; }
        const p = per(); Object.assign(p, { status: "closed", by: me().id, t: nowIso(), why: bad.length ? `${bad.map(c => c.k).join(", ")}: ${why}` : "" }); (p.log = p.log || []).push({ t: nowIso(), by: me().id, act: ["ปิดงวด", "Closed"], note: p.why });
        audit(["ปิดงวดบัญชี", "Closed a period"], `${m}${p.why ? ` · ${p.why}` : ""}`); notify(["exec", "audit"], [`การเงินปิดงวด ${monthLabel(m)} แล้ว`, `Finance closed ${monthLabel(m)}`], "fnc-close:month"); done(L("ปิดงวดแล้ว", "Period closed")); };
      const pr = $("#per-reopen");
      if (pr) pr.onclick = () => { const p = per(), why = $("#per-rwhy").value.trim(); if (why.length < 10) { toast(L("ระบุเหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters")); return; }
        if (!sodCheck("SD-16", [me().id], [p.by], `${L("งวด", "period")} ${m}`)) return;
        p.status = "open"; (p.log = p.log || []).push({ t: nowIso(), by: me().id, act: ["เปิดงวดใหม่", "Reopened"], note: why }); audit(["เปิดงวดบัญชีใหม่", "Reopened a period"], `${m} · ${why}`); notify(["audit"], [`เปิดงวด ${monthLabel(m)} ใหม่: ${why}`, `${monthLabel(m)} was reopened: ${why}`], "fnc-close:month"); done(L("เปิดงวดใหม่แล้ว", "Period reopened")); };
      $$("[data-aq]").forEach(b => (b.onclick = () => { const q = S.auditQs.find(x => x.id === b.dataset.aq), t = $("#aq-" + q.id).value.trim(); if (t.length < 5) { toast(L("พิมพ์คำชี้แจง", "Type the answer")); return; }
        q.answer = { text: t, by: me().id, t: nowIso() }; audit(["ชี้แจงข้อทักท้วง", "Answered an audit query"], q.id); done(L("บันทึกคำชี้แจงแล้ว", "Answer saved")); }));
      const af = $("#aq-form");
      if (af) af.onsubmit = e => { e.preventDefault(); const s = $("#aq-sub").value.trim(), d = $("#aq-date").value, q = { id: `AQ-${FAM_FY}-${String((S.auditQs || []).length + 1).padStart(2, "0")}`, from: L("สตง.", "SAO"), subject: [s, s], date: d, due: addDays(d, 15), answer: null };
        (S.auditQs = S.auditQs || []).push(q); audit(["บันทึกข้อทักท้วง", "Recorded an audit query"], q.id); done(L("บันทึกแล้ว · ชี้แจงภายใน 15 วัน", "Saved · answer within 15 days")); };
    }
  });
}

// ---------- menu, clocks, badges, tasks ----------
NAV_ICON.close = "check";
{
  const base = finClocks;
  finClocks = function () {
    const out = base();
    (S.auditQs || []).filter(q => !q.answer).forEach(q => out.push({ due: q.due, title: `${L("ชี้แจงข้อทักท้วง", "Answer audit query")} ${q.id}`, sub: tx(q.subject), link: "fnc-close:audit", src: L("ข้อ 109", "cl. 109") }));
    const pm = prevMonth(curMonth()), pp = (S.periods || []).find(p => p.month === pm);
    if (!pp || pp.status !== "closed") out.push({ due: addWorkdays(`${curMonth()}-01`, 4), title: `${L("ปิดงวด", "Close")} ${monthLabel(pm)}`, sub: `${monthChecks(pm).filter(c => !c.ok).length} ${L("ข้อยังไม่ผ่าน", "checks failing")}`, link: "fnc-close:month", src: L("ข้อเสนอ C", "proposal C") });
    return out.sort((x, y) => (x.due < y.due ? -1 : 1));
  };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "close" && ROLE === "finhead") { const k = (S.auditQs || []).filter(q => !q.answer).length + ((S.dayCloses || []).some(x => x.date === TODAY) ? 0 : 1); return k ? `<span class="badge">${k}</span>` : ""; }
    return tb(nid, tab);
  };
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments), R = (title, sub, due, link, cls) => t.unshift({ title, sub, due, link, cls });
    if (ROLE === "finhead") {
      (S.auditQs || []).filter(q => !q.answer).forEach(q => R(`${L("ชี้แจงข้อทักท้วง", "Answer audit query")} ${q.id}`, tx(q.subject), q.due, "fnc-close:audit", "p-warn"));
      if (!(S.dayCloses || []).some(x => x.date === TODAY)) R(L("ปิดวันและลงนาม (ข้อ 108)", "Close the day and sign (clause 108)"), "", TODAY, "fnc-close", "p-info");
      const pm = prevMonth(curMonth()), pp = (S.periods || []).find(p => p.month === pm); if (!pp || pp.status !== "closed") R(`${L("ปิดงวด", "Close")} ${monthLabel(pm)}`, "", addWorkdays(`${curMonth()}-01`, 4), "fnc-close:month", "p-warn");
    }
    return t.filter(x => !(x.cls === "p-mute" && t.length > 1));
  };
}

// ---------- seed (called from the shared seed builder) ----------
function seedFinanceFN5(s) {
  const U = r => s.users.find(u => u.role === r && u.primary) || s.users.find(u => u.role === r) || {}, FN = U("fin").id, FH = U("finhead").id, EX = U("exec").id;
  s.gfUsers = [{ user: FN, duties: ["record", "remit"], order: "คำสั่งที่ 3/2569", until: "2027-09-30" }, { user: FH, duties: ["approve", "remit"], order: "คำสั่งที่ 3/2569", until: "2027-09-30" }, { user: EX, duties: ["approve"], order: "คำสั่งที่ 3/2569", until: "2027-09-30" }];
  s.bankAccts = { budget: { no: "xxx-x-x1234-5", open: { "2026-09": 50000 } }, nonbudget: { no: "xxx-x-x6789-0", open: { "2026-09": 120000 } } };
  s.bookAdj = [];
  // September: the statement and the reconciliation are done; the trial balance is not imported yet.
  const a2 = s.advances.find(a => a.id === `AD-2570-002`), d2 = a2.paid.t.slice(0, 10);
  s.bankStmts = [
    { acct: "budget", month: "2026-09", open: 50000, lines: [{ d: d2, ref: `GF-FUND-${a2.id}`, amt: 28000, desc: ["เงินเข้าจาก GFMIS", "Funds from GFMIS"] }, { d: d2, ref: a2.paid.ref, amt: -28000, desc: ["จ่ายเงินยืม", "Advance paid"] }], t: "2026-10-02T10:00", by: FN },
    { acct: "nonbudget", month: "2026-09", open: 120000, lines: [], t: "2026-10-02T10:05", by: FN },
  ];
  s.bankRecs = [{ acct: "budget", month: "2026-09", status: "signed", by: FH, t: "2026-10-05T15:00", diff: 0 }, { acct: "nonbudget", month: "2026-09", status: "signed", by: FH, t: "2026-10-05T15:05", diff: 0 }];
  s.tbs = [];
  s.periods = [{ month: "2026-09", status: "open", log: [] }, { month: "2026-10", status: "open", log: [] }];
  s.dayCloses = [{ date: "2026-10-15", by: FH, t: "2026-10-15T17:30", why: "" }];
  s.auditQs = [{ id: `AQ-2570-01`, from: "สตง.", subject: ["การจ่ายเงินยืมรายใหม่ก่อนส่งใช้รายเดิม ปีงบประมาณ 2569", "New advances paid before earlier ones were cleared, FY2569"], date: "2026-10-08", due: "2026-10-23", answer: null }];
  (s.remits || []).forEach(r => (r.gf = { doc: "3600000377", t: "2026-10-14T09:00" }));
  void EX;
}
