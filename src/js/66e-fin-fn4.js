// Fisko Finance round FN4 (Finance design v0.1, chapters 6.4 and 6.5): receipts, cash custody and remittance.
// - Electronic receipts with book and number control, cancel but never edit (FR-FN-25, clauses 69–77) and the
//   receipt-book register with the yearly report due 31 October (FR-FN-26, clause 74).
// - Recording receipts in the system within the day and closing the day's takings (FR-FN-27, clauses 81–83).
// - Money types and the refund classification by date (FR-FN-28, clause 100); remittance clocks (FR-FN-29, R-FN-06,
//   clause 101); tax and penalties withheld on vouchers (FR-FN-30).
// - Cash committee (FR-FN-31, clauses 86–88) and the daily cash report counted and signed by each member, with
//   differences reported (FR-FN-32, clauses 92–95), duty rule SD-13. Key handover (FR-FN-33) is not built.
// All bank and GFMIS references are simulated.
let DC_D = null; // the day the daily cash panels show; reports made late for a missed day are counted here too
const dcDay = () => (DC_D && dcOf(DC_D) ? DC_D : TODAY);
// Working days in the last two weeks that had cash or cheques but no report (clause 92).
const dcMissed = () => { const out = []; for (let i = 1; i <= 14; i++) { const d = addDays(TODAY, -i), w = new Date(d + "T00:00:00Z").getUTCDay(); if (w !== 0 && w !== 6 && !(S.holidays || []).includes(d) && dcNeeded(d) && !dcOf(d)) out.push(d); } return out; };
// The days still open for counting or acknowledgement, to pick from.
const dcPicker = () => { const ds = [...new Set([TODAY, ...(S.dailyCash || []).filter(r => r.date < TODAY && (r.status === "counting" || !r.ack) && r.late).map(r => r.date)])].sort().reverse();
  return ds.length > 1 ? `<div class="fn-filter" style="margin:0 0 10px"><span class="sub">${L("วันที่", "Day")}</span>${segBar(ds.map(d => [d, `${fdate(d)}${d !== TODAY ? ` · ${L("ย้อนหลัง", "late")}` : ""}`]), dcDay(), "dcd")}</div>` : ""; };
let DC_EDIT = false; // a committee member changing their own count before everyone has counted (FR-FC-30)
const REV_T = { revenue: ["รายได้แผ่นดิน", "State revenue"], nonbudget: ["เงินนอกงบประมาณ", "Non-budget money"], over: ["เงินเบิกเกินส่งคืน", "Over-drawn money returned"], old: ["เงินเหลือจ่ายปีเก่าส่งคืน", "Prior-year balance returned"] };
const RC_KIND = { revenue: ["รายได้แผ่นดิน (ค่าขายเอกสาร ค่าปรับ ขายทรัพย์สิน ฯลฯ)", "State revenue (document sales, fines, asset sales, etc.)"], nonbudget: ["เงินนอกงบประมาณ", "Non-budget money"], refund: ["เงินคืนจากการจ่าย", "Money paid out and returned"], advback: ["เงินยืมเหลือคืน", "Unspent advance returned"] };
const RC_M = { cash: ["เงินสด", "Cash"], cheque: ["เช็ค", "Cheque"], epay: ["e-Payment", "e-Payment"] };
const rcOf = id => (S.receipts || []).find(r => r.id === id);
const rcLive = r => !r.cancelled;
// Clause 100: returned before the year end (or the carry-over end) is over-drawn money, after it a prior-year balance.
function rcClass(r) {
  if (r.kind === "revenue") return "revenue";
  if (r.kind === "nonbudget") return "nonbudget";
  return r.date <= (r.fyEnd || FY_END) ? "over" : "old";
}
const rcBook = r => (S.rbooks || []).find(b => b.id === r.book) || { no: "—" };
// Numbers used in a book (older books carry a count) and the last usable number (a voided tail is not usable).
const rbUsed = b => (S.receipts || []).filter(r => r.book === b.id).length || b.used || 0;
const rbCap = b => (b.void ? b.void.from - 1 : b.to);
const rcNo = r => `${rcBook(r).no} · ${String(r.n).padStart(3, "0")}`;
const rcRemit = r => (r.remit ? (S.remits || []).find(m => m.id === r.remit) : null);
// Money in the safe on a date: cash and cheques received by then and not remitted by then.
const inSafe = (d, m) => (S.receipts || []).filter(r => rcLive(r) && r.method === m && r.date <= d && !(rcRemit(r) && rcRemit(r).t.slice(0, 10) <= d));
const monthEnd = d => { const [y, m] = d.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
// R-FN-06: remittance due date per receipt (clause 101).
function rcDue(r) {
  const c = fcfg(), cl = rcClass(r);
  if (r.method === "cheque") return addWorkdays(r.date, 1);
  if (cl === "over" || cl === "old") return addWorkdays(r.date, c.refundDays);
  if (cl === "revenue" && r.method === "cash") {
    const day = sumv((S.receipts || []).filter(x => rcLive(x) && x.date === r.date && x.method === "cash" && rcClass(x) === "revenue").map(x => x.amount));
    return day > c.remitCash ? addWorkdays(r.date, c.remitDays) : monthEnd(r.date);
  }
  return monthEnd(r.date);
}
const rcDueSrc = r => (r.method === "cheque" ? "ข้อ 101 (1)" : ["over", "old"].includes(rcClass(r)) ? "ข้อ 101 (4)" : rcClass(r) === "revenue" ? (r.method === "epay" ? "ข้อ 101 (3)" : "ข้อ 101 (2)") : "ข้อ 101 (5)");
const rcOpen = () => (S.receipts || []).filter(r => rcLive(r) && !r.remit);
// Cash committee appointments are dated orders (Finance CRUD FR-FC-46); the latest order started by a date applies.
// Older saved data has one S.cashCmte object, which becomes the first order.
function cashOrders() {
  if (!S.cashOrders) { const c = S.cashCmte || { order: "", members: [], subs: [] }; S.cashOrders = c.members.length ? [{ id: "CO-01", order: c.order, members: c.members, subs: c.subs || [], from: `${CUR_FY - 545}-10-01`, by: null, t: null }] : []; }
  return S.cashOrders;
}
const cashC = d => cashOrders().filter(o => !o.cancelled && o.from <= (d || TODAY)).sort((a, b) => (a.from + a.id < b.from + b.id ? 1 : -1))[0] || { order: "", members: [], subs: [] };
const isCounter = () => cashC().members.includes(me().id) || cashC().subs.includes(me().id);
const dcOf = d => (S.dailyCash || []).find(x => x.date === d);
// System figures for a day's report: money in the safe at the end of the day, by type.
function dcSys(d) {
  const cash = inSafe(d, "cash"), chq = inSafe(d, "cheque"), by = {};
  [...cash, ...chq].forEach(r => { const k = rcClass(r); by[k] = (by[k] || 0) + r.amount; });
  return { cash: sumv(cash.map(r => r.amount)), cheque: sumv(chq.map(r => r.amount)), by };
}
const dcNeeded = d => (S.receipts || []).some(r => rcLive(r) && r.date === d && r.method !== "epay") || inSafe(d, "cash").length + inSafe(d, "cheque").length > 0;

SOD_RULES.push(["SD-13", ["ผู้รับหรือจ่ายเงินของวันนั้น เป็นกรรมการที่ตรวจนับเงินวันเดียวกันไม่ได้", "Whoever received or paid out money that day can't count it as a committee member"]]);
SOD_STEPS.push([["รับหรือจ่ายเงินของวัน", "Receive or pay money that day"], ["ตรวจนับเงินในฐานะกรรมการเก็บรักษาเงิน", "Count the money as a cash committee member"], "SD-13"]);

// ---------- F5 receipts and remittance ----------
FS.rcKpis = () => {
  const R = S.receipts || [], open = rcOpen(), today = R.filter(r => r.date === TODAY), unrec = R.filter(r => rcLive(r) && !r.recorded);
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("รับเงินวันนี้", "Received today")}</span><span class="v">${fmt(sumv(today.filter(rcLive).map(r => r.amount)))}</span><span class="d sub">${today.filter(rcLive).length} ${L("ใบ", "receipts")}</span></div>
    <div class="kpi hl"><span class="l">${L("ยังไม่บันทึกในระบบ", "Not recorded yet")}</span><span class="v">${unrec.length}</span><span class="d" style="color:var(--rail-ink)">${L("ต้องบันทึกภายในวัน (ข้อ 81)", "Record within the day (cl. 81)")}</span></div>
    <div class="kpi"><span class="l">${L("รอนำส่ง", "Waiting to be remitted")}</span><span class="v">${fmt(sumv(open.map(r => r.amount)))}</span><span class="d sub">${open.filter(r => daysUntil(rcDue(r)) < 0).length} ${L("เลยกำหนด", "overdue")}</span></div>
    <div class="kpi"><span class="l">${L("เงินสดในตู้นิรภัยตอนนี้", "Cash in the safe now")}</span><span class="v">${fmt(sumv(inSafe(TODAY, "cash").map(r => r.amount)))}</span><span class="d sub">${L("เช็ค", "cheques")} ${fmt(sumv(inSafe(TODAY, "cheque").map(r => r.amount)))}</span></div>
  </section>`;
};
// FS.receipts and FS.remit are shared lists in 87-fin-recv-crud.js (Finance CRUD FR-FC-26, 28).
// FS.rbooks (the receipt-book register) is a shared list in 84-fin-crud.js (FR-FC-47).
FS.wht = () => {
  const V = (S.vouchers || []).filter(v => v.state === "paid"), wht = V.filter(v => vCalc(v).wht > 0), pen = V.filter(v => (v.penalty || 0) > 0);
  return `
    <section class="panel"><header><h2>${L("ภาษีหัก ณ ที่จ่ายและค่าปรับจากใบขอเบิก", "Tax and penalties withheld on vouchers")}</h2><span class="sp"></span><span class="sub">${L("เป็นรายได้แผ่นดินในคำขอเบิก (ข้อ 19)", "State revenue inside the payment request (cl. 19)")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ใบขอเบิก", "Voucher")}</th><th>${L("ผู้ถูกหัก", "Payee")}</th><th class="n">${L("ภาษี", "Tax")}</th><th class="n">${L("ค่าปรับ", "Penalty")}</th><th>50 ทวิ</th></tr></thead>
        <tbody>${[...new Set([...wht, ...pen])].map(v => { const x = vCalc(v); return `<tr><td class="mono">${v.id}</td><td>${esc(tx(v.payee.name))}<div class="sub">${fdate(v.paid.t)}</div></td><td class="n">${fmt(x.wht, 2)}</td><td class="n">${fmt(x.pen, 2)}</td><td class="sub">${v.cert ? `${v.cert.no} · ${v.cert.sent ? L("ส่งแล้ว", "sent") : L("ยังไม่ส่ง", "not sent")}` : "—"}</td></tr>`; }).join("") || `<tr><td colspan="5" class="sub">—</td></tr>`}</tbody>
        <tfoot><tr><td colspan="2">${L("รวม", "Total")}</td><td class="n">${fmt(sumv(wht.map(v => vCalc(v).wht)), 2)}</td><td class="n">${fmt(sumv(pen.map(v => vCalc(v).pen)), 2)}</td><td></td></tr></tfoot></table></div></section>`;
};

// ---------- F6 daily cash report ----------
function dcPanel(d, where) {
  const r = dcOf(d), sys = r ? r.sys : dcSys(d), C = cashC(d), mine = isCounter(), c = r && r.counts[me().id];
  const st = !r ? null : r.status === "signed" ? tag(L("ลงนามครบ เก็บในตู้นิรภัยแล้ว", "Signed by all · in the safe"), "p-ok") : r.status === "diff" ? tag(L("ยอดนับไม่ตรง รายงานหัวหน้าส่วนราชการแล้ว", "Count differs · reported to the head"), "p-bad") : tag(L("รอกรรมการตรวจนับ", "Waiting for the committee"), "p-warn");
  return `<section class="panel"><header><h2>${L("รายงานเงินคงเหลือประจำวัน", "Daily cash report")} ${fdate(d)}</h2><span class="sp"></span>${r && r.late ? tag(L("ทำย้อนหลัง", "Made late"), "p-warn") : ""}${st || ""}</header>${r && r.late ? `<div class="body sub" style="padding-bottom:0">${L("เหตุผลที่ทำย้อนหลัง", "Why it is late")}: ${esc(r.late.why)} · ${esc(userName(r.by))} ${fdate(r.t, true)}</div>` : ""}
    <div class="body">
      ${!r && !dcNeeded(d) ? `<p class="sub">${L("วันนี้ไม่มีรับจ่ายเงินสดหรือเช็ค ไม่ต้องทำรายงาน แต่หมายเหตุในรายงานของวันถัดไป (ข้อ 92)", "No cash or cheques today; no report is needed, but note it in the next day's report (clause 92)")}</p>` : `
      <table style="width:100%;max-width:520px"><tbody>
        ${Object.keys(sys.by).map(k => `<tr><td>${tx(REV_T[k])}</td><td class="n">${fmt(sys.by[k], 2)}</td></tr>`).join("")}
        <tr><td><b>${L("เงินสดตามระบบ", "Cash per system")}</b></td><td class="n"><b>${fmt(sys.cash, 2)}</b></td></tr>
        <tr><td><b>${L("เช็คตามระบบ", "Cheques per system")}</b></td><td class="n"><b>${fmt(sys.cheque, 2)}</b></td></tr>
      </tbody></table>
      ${r ? `<div style="margin-top:10px">${C.members.map(u => { const k = r.counts[u]; return `<div style="margin:2px 0">${dotI(k ? (k.cash === sys.cash && k.cheque === sys.cheque ? "ok" : "bad") : "warn")}${esc(userName(u))} · ${k ? `${L("นับได้", "counted")} ${fmt(k.cash, 2)} / ${fmt(k.cheque, 2)} · ${L("ลงนาม", "signed")} ${fdate(k.t, true)}` : L("ยังไม่ตรวจนับ", "not counted yet")}</div>`; }).join("")}</div>` : ""}
      ${r && r.status === "diff" ? `<p style="color:var(--bad);margin:8px 0 0">${L("บันทึกยอดที่นับได้ไว้ในรายงาน ลงนามโดยกรรมการและเจ้าหน้าที่การเงินผู้นำส่ง และรายงานหัวหน้าส่วนราชการทันที (ข้อ 95)", "The counted amount is recorded, signed by the committee and the finance officer, and reported to the head at once (clause 95)")}</p>` : ""}
      ${r && r.ack ? `<p class="sub" style="margin:8px 0 0">${L("หัวหน้าส่วนราชการรับทราบ", "Acknowledged by the head")} ${esc(userName(r.ack.by))} · ${fdate(r.ack.t, true)} (${L("ข้อ 94", "cl. 94")})</p>` : ""}
      <div class="row" style="margin-top:10px;flex-wrap:wrap">
        ${!r && ROLE === "fin" && where === "fin" ? `<button class="btn primary" type="button" id="dc-make">${L("จัดทำรายงานและส่งมอบให้กรรมการ", "Prepare the report and hand over to the committee")}</button>` : ""}
        ${r && r.status === "counting" && mine && c && !DC_EDIT ? `<button class="btn ghost" type="button" id="dc-edit">${L("แก้ยอดนับของฉัน", "Change my count")}</button>` : ""}
        ${r && r.status !== "counting" && !r.ack && ROLE === "finhead" ? (FIN_ROW === "dcre" ? `<div class="row fn-rowform" style="gap:8px;flex-wrap:wrap;flex:1 1 100%"><input type="text" id="dcre-why" placeholder="${L(`เหตุผลที่สั่งนับใหม่ (อย่างน้อย ${CR_WHY_MIN} ตัวอักษร)`, `Why count again (at least ${CR_WHY_MIN} characters)`)}" aria-label="${L("เหตุผล", "Reason")}" style="min-width:240px;flex:1"><button class="btn primary" type="button" id="dc-recount">${L("สั่งนับใหม่", "Count again")}</button><button class="btn ghost" type="button" data-frow="">${L("ปิด", "Close")}</button></div>` : rowBtn("dcre", L("สั่งนับใหม่…", "Count again…"))) : ""}
        ${r && (r.recounts || []).length ? `<p class="sub" style="flex:1 1 100%;margin:4px 0 0">${r.recounts.map(x => `${L("สั่งนับใหม่", "Recounted")} ${fdate(x.t, true)} · ${esc(userName(x.by))} · ${esc(x.why)}`).join("<br>")}</p>` : ""}
        ${r && r.status === "counting" && mine && (!c || DC_EDIT) ? `<input type="number" id="dc-cash" min="0" step="0.01" value="${c ? c.cash : ""}" placeholder="${L("เงินสดที่นับได้", "Cash counted")}" style="width:150px" aria-label="${L("เงินสดที่นับได้", "Cash counted")}"><input type="number" id="dc-chq" min="0" step="0.01" placeholder="${L("เช็คที่นับได้", "Cheques counted")}" style="width:150px" aria-label="${L("เช็คที่นับได้", "Cheques counted")}"><button class="btn primary" type="button" id="dc-count">${L("ยืนยันยอดนับและลงนาม", "Confirm the count and sign")}</button>` : ""}
        ${r && r.status !== "counting" && !r.ack && ROLE === "exec" ? `<button class="btn" type="button" id="dc-ack">${L("รับทราบรายงาน", "Acknowledge the report")}</button>` : ""}
      </div>`}
    </div></section>`;
}
FS.cashToday = () => { const miss = ROLE === "fin" ? dcMissed() : [];
  return dcPicker() + dcPanel(dcDay(), "fin") + (miss.length ? `<section class="panel"><header><h2>${L("วันที่ยังไม่มีรายงาน", "Days without a report")}</h2><span class="sp"></span><span class="sub">${L("มีเงินสดหรือเช็คแต่ไม่ได้ทำรายงาน (ข้อ 92)", "Cash or cheques but no report (clause 92)")}</span></header>
    <div class="tbl-wrap"><table><tbody>${miss.map(d => `<tr><td>${dotI("warn")}${fdate(d)}</td><td class="n">${fmt(dcSys(d).cash, 2)}</td><td>${rowBtn("dcl:" + d, L("ทำรายงานย้อนหลัง…", "Make it late…"))}</td></tr>
      ${FIN_ROW === "dcl:" + d ? rowForm(3, `<input type="text" id="dcl-why-${d}" placeholder="${L("เหตุผลที่ทำย้อนหลัง", "Why it is late")}" aria-label="${L("เหตุผล", "Reason")}" style="min-width:240px;flex:1"><button class="btn primary" type="button" data-dclate="${d}">${L("ทำรายงานและส่งมอบให้กรรมการ", "Prepare it and hand over to the committee")}</button>`) : ""}`).join("")}</tbody></table></div></section>` : ""); };
// FS.cashCmte (dated appointment orders) is a shared list in 84-fin-crud.js (FR-FC-46).
FS.cashHist = () => {
  const D = (S.dailyCash || []).slice().reverse();
  return `
    <section class="panel"><header><h2>${L("รายงานย้อนหลัง", "Earlier reports")}</h2></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("วันที่", "Date")}</th><th class="n">${L("เงินสด", "Cash")}</th><th class="n">${L("เช็ค", "Cheques")}</th><th>${L("สถานะ", "Status")}</th></tr></thead>
        <tbody>${D.filter(x => x.date !== TODAY).map(x => `<tr><td class="sub">${fdate(x.date)}</td><td class="n">${fmt(x.sys.cash, 2)}</td><td class="n">${fmt(x.sys.cheque, 2)}</td><td>${x.status === "signed" ? tag(L("ลงนามครบ", "Signed"), "p-ok") : x.status === "diff" ? tag(L("ยอดไม่ตรง", "Differs"), "p-bad") : tag(L("รอตรวจนับ", "Counting"), "p-warn")}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">—</td></tr>`}</tbody></table></div></section>`;
};
// Committee members who have no Finance menu count from this page, reached from My Workspace.
VIEWS.cashcount = () => `
  <div class="head"><div><div class="eyebrow">${L("พื้นที่ทำงานของฉัน", "My Workspace")}</div><h1>${L("ตรวจนับเงินประจำวัน", "Daily cash count")}</h1>
    <p>${L("กรรมการเก็บรักษาเงินตรวจนับตัวเงินและเอกสารแทนตัวเงินกับรายงาน แล้วลงนาม (ข้อ 93)", "Cash committee members count the cash and cheques against the report and sign (clause 93)")}</p></div></div>
  ${isCounter() ? dcPicker() + dcPanel(dcDay(), "me") : `<section class="panel"><div class="body sub">${L("คุณไม่ได้อยู่ในคำสั่งแต่งตั้งกรรมการเก็บรักษาเงิน", "You are not on the cash committee order")}</div></section>`}`;

// ---------- actions ----------
function rcIssue(o) {
  const mine = (S.rbooks || []).filter(x => x.holder === me().id && !x.returned && x.fy === FAM_FY), b = mine.find(x => rbUsed(x) < rbCap(x));
  if (!b) { toast(mine.length ? L("เล่มเต็มแล้ว ขอเล่มใหม่จากหัวหน้าการเงิน (F10)", "The book is full; ask the finance head for a new one (F10)") : L("ไม่มีเล่มใบเสร็จที่ใช้ได้ ขอหัวหน้าการเงินออกเล่ม (F10)", "No receipt book available; ask the finance head to issue one (F10)")); return null; }
  const n = rbUsed(b) + 1;
  const r = Object.assign({ id: `RC-${FAM_FY}-${String((S.receipts || []).length + 1).padStart(4, "0")}`, book: b.id, n, date: TODAY, t: nowIso(), by: me().id, recorded: null, remit: null, cancelled: null }, o);
  (S.receipts = S.receipts || []).push(r);
  audit(["ออกใบเสร็จรับเงิน", "Issued a receipt"], `${rcNo(r)} · ${fmt(r.amount, 2)}`);
  return r;
}
const bindRecv = () => {
  const done = msg => { commit(); renderShell(); route(); toast(msg); };
  $$("[data-rcadv]").forEach(b => (b.onclick = () => {
    const a = advOf(b.dataset.rcadv), u = S.users.find(x => x.id === a.borrower);
    const r = rcIssue({ kind: "advback", payer: u.name, desc: [`เงินยืมเหลือคืน ${a.id}`, `Unspent advance returned, ${a.id}`], amount: a.cashBack.amount, method: "cash", adv: a.id });
    if (!r) return; a.cashBack.rc = r.id;
    done(L(`ออกใบเสร็จ ${rcNo(r)} แล้ว · เงินเบิกเกินส่งคืน นำส่งภายใน 15 วันทำการ`, `Receipt ${rcNo(r)} issued · over-drawn money, remit within 15 working days`));
  }));
  const rec = $("#rc-rec");
  if (rec) rec.onclick = () => {
    const xs = (S.receipts || []).filter(r => rcLive(r) && !r.recorded), late = xs.filter(r => r.date < TODAY).length;
    xs.forEach(r => { S.gfSeq = (S.gfSeq || 3600000400) + 1; r.recorded = { t: nowIso(), by: me().id, doc: String(S.gfSeq) }; });
    audit(["บันทึกรับเงินในระบบ GFMIS", "Recorded receipts in GFMIS"], `${xs.length}${late ? ` · ${late} ${L("รายการบันทึกช้า", "late")}` : ""}`);
    done(late ? L(`บันทึกแล้ว ${xs.length} รายการ · ${late} รายการช้ากว่าวันที่รับ (ข้อ 81)`, `Recorded ${xs.length} · ${late} later than the day received (clause 81)`) : L(`บันทึกแล้ว ${xs.length} รายการ`, `Recorded ${xs.length}`));
  };
  const rb = $("#rb-report");
  if (rb) rb.onclick = () => { (S.rbookReports = S.rbookReports || []).push({ fy: FAM_FY - 1, t: nowIso(), by: me().id }); audit(["ส่งรายงานใบเสร็จรับเงินประจำปี", "Sent the yearly receipt-book report"], `${FAM_FY - 1}`); done(L("ส่งรายงานแล้ว", "Report sent")); };
};
const bindCash = () => {
  const done = msg => { commit(); renderShell(); route(); toast(msg); };
  $$("[data-dcd]").forEach(b => (b.onclick = () => { DC_D = b.dataset.dcd; DC_EDIT = false; route(); }));
  $$("[data-dclate]").forEach(b => (b.onclick = () => {
    const d = b.dataset.dclate, why = ($(`#dcl-why-${d}`) || { value: "" }).value.trim(); if (why.length < CR_WHY_MIN) { toast(L(`ระบุเหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร`, `Give a reason of at least ${CR_WHY_MIN} characters`)); return; }
    (S.dailyCash = S.dailyCash || []).push({ date: d, by: me().id, t: nowIso(), sys: dcSys(d), counts: {}, status: "counting", ack: null, late: { why } }); DC_D = d; FIN_ROW = null;
    audit(["จัดทำรายงานเงินคงเหลือย้อนหลัง", "Prepared a late daily cash report"], `${d} · ${why}`);
    notify(["plan", "divhead"], [`รายงานเงินคงเหลือของวันที่ ${fdate(d)} (ทำย้อนหลัง) รอกรรมการตรวจนับ`, `The late daily cash report for ${fdate(d)} is waiting for the committee's count`], "cashcount");
    done(L("ทำรายงานย้อนหลังแล้ว · ส่งมอบให้กรรมการ", "Late report prepared · handed over to the committee"));
  }));
  const mk = $("#dc-make");
  if (mk) mk.onclick = () => {
    (S.dailyCash = S.dailyCash || []).push({ date: TODAY, by: me().id, t: nowIso(), sys: dcSys(TODAY), counts: {}, status: "counting", ack: null });
    audit(["จัดทำรายงานเงินคงเหลือประจำวัน", "Prepared the daily cash report"], TODAY);
    notify(["plan", "divhead"], [`รายงานเงินคงเหลือประจำวัน ${fdate(TODAY)} รอกรรมการตรวจนับ`, `Daily cash report ${fdate(TODAY)} is waiting for the committee's count`], "cashcount");
    done(L("ส่งมอบให้กรรมการเก็บรักษาเงินแล้ว", "Handed over to the cash committee"));
  };
  const ct = $("#dc-count");
  if (ct) ct.onclick = () => {
    const r = dcOf(dcDay()), cash = Number($("#dc-cash").value), chq = Number($("#dc-chq").value || 0);
    if ($("#dc-cash").value === "") { toast(L("ใส่ยอดเงินสดที่นับได้", "Enter the cash counted")); return; }
    const handlers = [...new Set((S.receipts || []).filter(x => x.date === dcDay()).map(x => x.by).concat((S.vouchers || []).filter(v => v.paid && v.paid.t.slice(0, 10) === dcDay() && v.method !== "epay").map(v => v.maker)))];
    if (!sodCheck("SD-13", [me().id], handlers, `DC ${dcDay()}`)) return;
    if (r.counts[me().id]) audit(["แก้ยอดนับเงินของตน", "Changed own cash count"], `${dcDay()} · ${fmt(r.counts[me().id].cash, 2)} → ${fmt(cash, 2)}`);
    r.counts[me().id] = { cash, cheque: chq, t: nowIso() }; DC_EDIT = false;
    audit(["ตรวจนับเงินและลงนามรายงานเงินคงเหลือ", "Counted the cash and signed the daily report"], `${dcDay()} · ${fmt(cash, 2)} / ${fmt(chq, 2)}`);
    const C = cashC(dcDay()), all = C.members.every(u => r.counts[u]);
    if (all) {
      const ok = C.members.every(u => r.counts[u].cash === r.sys.cash && r.counts[u].cheque === r.sys.cheque);
      r.status = ok ? "signed" : "diff";
      if (!ok) { audit(["ยอดเงินที่นับไม่ตรงกับรายงาน", "The count differs from the report"], dcDay()); notify(["exec", "finhead", "audit"], [`ยอดเงินที่กรรมการนับวันที่ ${fdate(dcDay())} ไม่ตรงกับรายงานเงินคงเหลือ (ข้อ 95)`, `The cash count on ${fdate(dcDay())} differs from the daily report (clause 95)`], "fnc-cash"); }
      else notify(["exec"], [`รายงานเงินคงเหลือประจำวัน ${fdate(dcDay())} ลงนามครบแล้ว`, `Daily cash report ${fdate(dcDay())} is signed by all`], "fnc-cash");
      return done(ok ? L("ลงนามครบ เก็บเงินในตู้นิรภัยแล้ว", "Signed by all · money is in the safe") : L("ยอดไม่ตรง · บันทึกยอดที่นับได้และรายงานหัวหน้าส่วนราชการแล้ว (ข้อ 95)", "Count differs · the counted amount is recorded and reported to the head (clause 95)"));
    }
    done(L("ลงนามแล้ว · รอกรรมการคนอื่น", "Signed · waiting for the other members"));
  };
  const de = $("#dc-edit"); if (de) de.onclick = () => { DC_EDIT = true; route(); const x = $("#dc-cash"); if (x) x.focus(); };
  const rc = $("#dc-recount");
  if (rc) rc.onclick = () => {
    const r = dcOf(dcDay()), why = $("#dcre-why").value.trim(); if (why.length < CR_WHY_MIN) { toast(L(`ระบุเหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร`, `Give a reason of at least ${CR_WHY_MIN} characters`)); return; }
    (r.recounts = r.recounts || []).push({ t: nowIso(), by: me().id, why, counts: r.counts, status: r.status }); r.counts = {}; r.status = "counting"; FIN_ROW = null;
    audit(["สั่งตรวจนับเงินใหม่", "Asked the committee to count again"], `${dcDay()} · ${why}`);
    notify([...new Set(cashC().members.concat(cashC().subs).map(id => (S.users.find(u => u.id === id) || {}).role).filter(Boolean))], [`หัวหน้าการเงินสั่งนับเงินวันที่ ${fdate(dcDay())} ใหม่: ${why}`, `The finance head asked for the ${fdate(dcDay())} cash to be counted again: ${why}`], "cashcount");
    done(L("สั่งนับใหม่แล้ว · การนับเดิมเก็บในประวัติ", "Counting again · the earlier count is kept in the history"));
  };
  const ak = $("#dc-ack"); if (ak) ak.onclick = () => { const r = dcOf(dcDay()); r.ack = { by: me().id, t: nowIso() }; audit(["รับทราบรายงานเงินคงเหลือประจำวัน", "Acknowledged the daily cash report"], dcDay()); done(L("รับทราบแล้ว", "Acknowledged")); };
};
{
  FIN_BINDS.push(bindRecv, bindCash);
  BIND.cashcount = bindCash;
}

// ---------- menu, clocks, badges, tasks ----------
NAV_ICON.recv = "coins"; NAV_ICON.cash = "shield";
{
  const base = finClocks;
  finClocks = function () {
    const out = base();
    const unrec = (S.receipts || []).filter(r => rcLive(r) && !r.recorded);
    if (unrec.length) out.push({ due: unrec.map(r => r.date).sort()[0], title: L(`บันทึกรับเงินในระบบ ${unrec.length} รายการ`, `Record ${unrec.length} receipts in the system`), sub: fmt(sumv(unrec.map(r => r.amount)), 2), link: "fnc-recv", src: L("ข้อ 81", "cl. 81") });
    Object.keys(REV_T).forEach(k => { const xs = rcOpen().filter(r => rcClass(r) === k); if (xs.length) out.push({ due: xs.map(rcDue).sort()[0], title: `${L("นำส่ง", "Remit")} ${tx(REV_T[k])}`, sub: `${xs.length} ${L("ใบ", "receipts")} · ${fmt(sumv(xs.map(r => r.amount)), 2)} ${L("บาท", "baht")}`, link: "fnc-recv:remit", src: L("ข้อ 101", "cl. 101") }); });
    if (dcNeeded(TODAY) && !(dcOf(TODAY) && dcOf(TODAY).status !== "counting")) out.push({ due: TODAY, title: dcOf(TODAY) ? L("กรรมการตรวจนับเงินประจำวัน", "Committee counts today's cash") : L("จัดทำรายงานเงินคงเหลือประจำวัน", "Prepare today's cash report"), sub: fmt(dcSys(TODAY).cash, 2), link: "fnc-cash", src: L("ข้อ 92–93", "cl. 92–93") });
    if (!(S.rbookReports || []).some(x => x.fy === FAM_FY - 1)) out.push({ due: `${FAM_FY - 544}-10-31`, title: L(`รายงานใบเสร็จรับเงินปี ${FAM_FY - 1}`, `FY${FAM_FY - 1} receipt-book report`), sub: "", link: "fnc-reg:books", src: L("ข้อ 74", "cl. 74") });
    return out.sort((x, y) => (x.due < y.due ? -1 : 1));
  };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "recv" && ROLE === "fin") { const k = (S.receipts || []).filter(r => rcLive(r) && !r.recorded).length + rcOpen().filter(r => daysUntil(rcDue(r)) <= 0).length; return k ? `<span class="badge">${k}</span>` : ""; }
    if (nid === "finance" && tab === "cash") { const r = dcOf(TODAY); const k = ROLE === "fin" ? (dcNeeded(TODAY) && !r ? 1 : 0) : (r && r.status === "counting" && isCounter() && !r.counts[me().id] ? 1 : 0) + (ROLE === "exec" && r && r.status !== "counting" && !r.ack ? 1 : 0); return k ? `<span class="badge">${k}</span>` : ""; }
    return tb(nid, tab);
  };
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments), R = (title, sub, due, link, cls) => t.unshift({ title, sub, due, link, cls }), r = dcOf(TODAY);
    if (r && r.status === "counting" && isCounter() && !r.counts[me().id]) R(L("ตรวจนับเงินและลงนามรายงานเงินคงเหลือประจำวัน", "Count the cash and sign today's report"), `${L("เงินสด", "Cash")} ${fmt(r.sys.cash, 2)} · ${L("เช็ค", "cheques")} ${fmt(r.sys.cheque, 2)}`, TODAY, "cashcount", "p-warn");
    if (ROLE === "fin") {
      if ((S.receipts || []).some(x => rcLive(x) && !x.recorded)) R(L("บันทึกรับเงินในระบบภายในวัน", "Record today's receipts in the system"), "", TODAY, "fnc-recv", "p-warn");
      rcOpen().filter(x => daysUntil(rcDue(x)) <= 1).slice(0, 3).forEach(x => R(`${L("นำส่ง", "Remit")} ${rcNo(x)}`, `${tx(REV_T[rcClass(x)])} · ${fmt(x.amount, 2)}`, rcDue(x), "fnc-recv:remit", daysUntil(rcDue(x)) < 0 ? "p-bad" : "p-warn"));
      if (dcNeeded(TODAY) && !r) R(L("จัดทำรายงานเงินคงเหลือประจำวัน", "Prepare today's cash report"), "", TODAY, "fnc-cash", "p-info");
    }
    if (ROLE === "exec" && r && r.status !== "counting" && !r.ack) R(L("รับทราบรายงานเงินคงเหลือประจำวัน", "Acknowledge today's cash report"), r.status === "diff" ? L("ยอดนับไม่ตรง", "count differs") : "", TODAY, "fnc-cash", r.status === "diff" ? "p-bad" : "p-info");
    return t.filter(x => !(x.cls === "p-mute" && t.length > 1));
  };
}

// ---------- seed (called from the shared seed builder) ----------
function seedFinanceFN4(s) {
  const U = r => s.users.find(u => u.role === r && u.primary) || s.users.find(u => u.role === r) || {}, FN = U("fin").id, FH = U("finhead").id, dv = U("div");
  s.cashCmte = { order: "คำสั่งที่ 15/2569", members: [U("plan").id, U("divhead").id], subs: [] };
  s.rbooks = [
    { id: `BK-2570-01`, no: `1/2570`, fy: CUR_FY, from: 1, to: 100, holder: FN, issued: "2026-10-01", returned: null },
    { id: "BK-2569-07", no: "7/2569", fy: 2569, from: 1, to: 100, holder: FN, issued: "2026-06-01", returned: "2026-09-30", used: 64 },
    { id: "BK-2569-08", no: "8/2569", fy: 2569, from: 1, to: 50, holder: null, unit: dv.unit, issued: "2026-08-01", returned: null, used: 23 },
  ];
  const rec = (d, t) => ({ t: `${d}T${t}`, by: FN, doc: "" });
  const mk = (n, o) => Object.assign({ id: `RC-${CUR_FY}-000${n}`, book: `BK-2570-01`, n, by: FN, recorded: rec(o.date, "16:30"), remit: null, cancelled: null, t: `${o.date}T10:00` }, o);
  s.receipts = [
    mk(1, { date: "2026-10-02", kind: "revenue", payer: ["บริษัท ตัวอย่างก่อสร้าง จำกัด", "Sample Construction Co., Ltd."], desc: ["ค่าขายเอกสารประกวดราคา", "Sale of bid documents"], amount: 3500, method: "cash" }),
    mk(2, { date: "2026-10-09", kind: "revenue", payer: ["ห้างหุ้นส่วนจำกัด ตัวอย่างพัสดุ", "Sample Supplies Ltd. Partnership"], desc: ["ค่าปรับผิดสัญญาที่ผู้ขายนำมาชำระ", "Contract penalty paid by the supplier"], amount: 12400, method: "cash", remit: `RM-2570-001` }),
    mk(3, { date: "2026-10-14", kind: "refund", payer: ["นายตัวอย่าง คืนเงิน", "Mr Tuayang Khuenngoen"], desc: ["คืนเงินค่าตอบแทนที่จ่ายเกิน", "Return of an overpaid fee"], amount: 8000, method: "cheque" }),
    mk(4, { date: TODAY, kind: "nonbudget", payer: ["มูลนิธิตัวอย่าง", "Sample Foundation"], desc: ["ค่าธรรมเนียมใช้ห้องประชุม", "Meeting room fee"], amount: 2000, method: "cash", recorded: null }),
    mk(5, { date: TODAY, kind: "revenue", payer: ["นายตัวอย่าง ประมูล", "Mr Tuayang Pramun"], desc: ["ขายครุภัณฑ์ชำรุดตามมติคณะกรรมการ", "Sale of written-off equipment"], amount: 9000, method: "cash", recorded: null }),
  ];
  s.remits = [{ id: `RM-2570-001`, cls: "revenue", rows: [`RC-2570-0002`], amount: 12400, t: "2026-10-13T11:00", by: FN, ref: "KTB-001261013", late: 0 }];
  // Reports signed on the days with money in the safe before today.
  const sys = (cash, chq, by) => ({ cash, cheque: chq, by });
  const signed = (d, s_) => ({ date: d, by: FN, t: `${d}T16:00`, sys: s_, counts: { [s.cashCmte.members[0]]: { cash: s_.cash, cheque: s_.cheque, t: `${d}T16:20` }, [s.cashCmte.members[1]]: { cash: s_.cash, cheque: s_.cheque, t: `${d}T16:25` } }, status: "signed", ack: { by: U("exec").id, t: `${d}T17:00` } });
  s.dailyCash = [signed("2026-10-14", sys(3500, 8000, { revenue: 3500, over: 8000 })), signed("2026-10-15", sys(3500, 8000, { revenue: 3500, over: 8000 }))];
  s.rbookReports = [];
  (s.advances || []).forEach(a => { if (a.cashBack) a.cashBack.rc = "7/2569 · 064"; });
  if (!s.sod.rules.some(r => r.id === "SD-13")) s.sod.rules.push({ id: "SD-13", on: true });
  void FH;
}
