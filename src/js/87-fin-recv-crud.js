// Finance CRUD round FC5 (Fisko_Finance_CRUD_Design.html, chapters 6.5 and 6.8): receipts, remittances and audit queries
// on the shared list. A receipt is never edited (clause 76): it is cancelled with a reason, and "cancel and reissue"
// opens a new receipt filled from the old one. Each receipt is recorded in GFMIS on its own (FR-FC-27). A remittance
// takes the receipts picked from one type of money; its bank reference can be corrected, or the whole remittance
// reversed, until GFMIS shows it (FR-FC-28). Audit queries keep a draft answer until it is sent; after that only a
// further explanation is added (FR-FC-39), with the answer clock from M10 (FX-09).
let RC_DRAFT = null, RM_CLS = null;
const RC_ST = { open: [["รอบันทึก GFMIS", "Not in GFMIS yet"], "p-warn"], rec: [["รอนำส่ง", "To be remitted"], "p-info"], done: [["นำส่งแล้ว", "Remitted"], "p-ok"], off: [["ยกเลิก", "Cancelled"], "p-mute"] };
const rcSt = r => (r.cancelled ? "off" : r.remit ? "done" : r.recorded ? "rec" : "open");
function rcCancel(r, why) {
  r.cancelled = { t: nowIso(), by: me().id, why }; if (r.adv) { const a = advOf(r.adv); if (a && a.cashBack) delete a.cashBack.rc; }
  audit(["ยกเลิกใบเสร็จรับเงิน", "Cancelled a receipt"], `${r.id} · ${rcNo(r)} · ${why}`);
}
CRUD.def("fnRc", {
  noun: ["ใบเสร็จรับเงิน", "Receipt"], st: RC_ST, list: () => (S.receipts = S.receipts || []), id: r => r.id, title: r => rcNo(r), sub: r => `${esc(tx(r.payer))} · ${fmt(r.amount, 2)} ${L("บาท", "baht")}`,
  status: rcSt, gone: r => !!r.cancelled, search: r => `${r.id} ${rcNo(r)} ${tx(r.payer)} ${tx(r.desc)} ${r.adv || ""} ${r.voucher || ""}`,
  filters: [{ id: "cls", label: ["ประเภทเงิน", "Type of money"], opts: () => Object.keys(REV_T).map(k => [k, tx(REV_T[k])]), get: rcClass },
    { id: "m", label: ["วิธีรับ", "Method"], opts: () => Object.keys(RC_M).map(k => [k, tx(RC_M[k])]), get: r => r.method },
    { id: "st", label: ["สถานะ", "Status"], opts: () => ["open", "rec", "done"].map(k => [k, tx(RC_ST[k][0])]), get: rcSt }],
  cols: [{ h: ["เล่ม / เลขที่", "Book / no."], sort: r => r.id, c: r => `<span class="mono">${rcNo(r)}</span>` }, { h: ["วันที่", "Date"], sort: r => r.t, c: r => `<span class="sub">${fdate(r.date)}</span>` },
    { h: ["ผู้ชำระ / รายการ", "Payer / item"], c: r => `${esc(tx(r.payer))}<div class="sub">${esc(tx(r.desc))}${r.adv ? ` · <span class="mono">${r.adv}</span>` : ""}${r.voucher ? ` · <span class="mono">${r.voucher}</span>` : ""}</div>` },
    { h: ["ประเภท", "Type"], c: r => `<span class="sub">${tx(REV_T[rcClass(r)])} · ${tx(RC_M[r.method])}</span>` }, { h: ["บาท", "Baht"], n: true, sort: r => r.amount, c: r => fmt(r.amount, 2) },
    { h: ["นำส่ง", "Remittance"], c: r => (r.cancelled ? `<span class="sub">${esc(r.cancelled.why)}</span>` : r.remit ? `<span class="mono">${r.remit}</span>` : `${dotI(clockDot(rcDue(r)))}<span class="sub">${clockTxt(rcDue(r))} · ${rcDueSrc(r)}</span>`) }],
  fields: () => {
    const f = RC_DRAFT || {};
    return [
      ...(typeof nbFunds === "function" && nbFunds().length ? [{ id: "fund", label: ["กองทุน (ถ้าเป็นเงินนอกงบประมาณ)", "Fund (for non-budget money)"], type: "select", blank: "—", value: f.fund || "", opts: nbFunds().map(x => [x.id, `${x.id} · ${tx(x.name)}`]) }] : []),
      { id: "kind", label: ["ประเภทเงิน", "Type of money"], type: "select", req: true, value: f.kind || "revenue", opts: Object.keys(RC_KIND).filter(k => k !== "advback").map(k => [k, tx(RC_KIND[k])]) },
      { id: "payer", label: ["ชื่อผู้ชำระเงิน", "Payer"], req: true, wide: true, value: f.payer || "" },
      { id: "desc", label: ["รายการ (รับเงินค่าอะไร)", "What the money is for"], req: true, wide: true, value: f.desc || "" },
      { id: "amount", label: ["จำนวนเงิน (บาท)", "Amount (baht)"], type: "number", req: true, min: 0.01, value: f.amount || "" },
      { id: "method", label: ["วิธีรับ", "Method"], type: "select", value: f.method || "cash", opts: Object.keys(RC_M).map(k => [k, tx(RC_M[k])]) },
      { id: "_n", label: ["ใบเสร็จ", "Receipt"], type: "info", wide: true, html: `<span class="sub">${f.replaces ? L(`ออกแทนใบที่ยกเลิก ${f.replaces} · `, `Replaces cancelled ${f.replaces} · `) : ""}${L("ใช้เล่มและเลขที่ถัดไปที่คุณถือ ใบเสร็จแก้ไขไม่ได้หลังออก (ข้อ 76)", "Uses the next number of the book you hold; a receipt can't be edited once issued (clause 76)")}</span>` },
    ];
  },
  check: v => [!(Number(v.amount) > 0) && { f: "amount", m: L("ต้องมากกว่าศูนย์", "Must be above zero") },
    v.kind === "nonbudget" && typeof nbFunds === "function" && nbFunds().length && !v.fund && { f: "fund", m: L("เลือกกองทุนของเงินนอกงบประมาณ", "Pick the fund for non-budget money") }].filter(Boolean),
  create: { can: () => ROLE === "fin", label: ["ออกใบเสร็จ", "Issue a receipt"], run: v => {
    const r = rcIssue({ fund: v.kind === "nonbudget" ? v.fund || null : null, kind: v.kind, payer: [v.payer, v.payer], desc: [v.desc, v.desc], amount: r2(Number(v.amount)), method: v.method, replaces: RC_DRAFT && RC_DRAFT.replaces || undefined });
    RC_DRAFT = null; return r; } },
  acts: r => {
    if (ROLE !== "fin" || r.cancelled) return [];
    const out = [];
    if (!r.recorded) out.push({ id: "rec", label: L("บันทึกรับเงินใน GFMIS", "Record in GFMIS"), kind: "primary", undo: false, num: { label: ["เลขเอกสาร GFMIS (จำลอง เติมให้แล้ว)", "GFMIS document no. (simulated, filled in)"], min: 0, max: 9999999999, value: (S.gfSeq || 3600000400) + 1 },
      impact: () => (r.date < TODAY ? L(`บันทึกช้ากว่าวันที่รับ (${fdate(r.date)}) ข้อ 81 ให้บันทึกภายในวัน`, `Later than the day received (${fdate(r.date)}); clause 81 asks for the same day`) : L("บันทึกภายในวันที่รับ (ข้อ 81)", "Recorded on the day received (clause 81)")),
      run: (_, __, n) => { if (!gfOk("record")) return ""; S.gfSeq = Math.max(S.gfSeq || 0, n); r.recorded = { t: nowIso(), by: me().id, doc: String(n) }; audit(["บันทึกรับเงินในระบบ GFMIS", "Recorded receipts in GFMIS"], `${r.id} · ${n}${r.date < TODAY ? ` · ${L("ช้า", "late")}` : ""}`); return L("บันทึกแล้ว", "Recorded"); } });
    if (!r.remit) {
      out.push({ id: "re", label: L("ยกเลิกและออกใหม่", "Cancel and reissue"), why: true, impact: () => L("ใบเดิมยกเลิกและยังอยู่ในเล่ม เปิดแบบฟอร์มใบใหม่ที่เติมจากใบเดิมให้แก้ก่อนออก", "The old receipt is cancelled and stays in the book; a new form opens filled from it, to fix before issuing"),
        run: (_, why) => { rcCancel(r, why); RC_DRAFT = { fund: r.fund || "", kind: r.kind === "advback" ? "refund" : r.kind, payer: tx(r.payer), desc: tx(r.desc), amount: r.amount, method: r.method, replaces: rcNo(r) }; crOpen("fnRc", "", "edit"); return L("ยกเลิกแล้ว · แก้แล้วออกใบใหม่", "Cancelled · fix it and issue the new one"); } });
      out.push({ id: "cx", label: L("ยกเลิก", "Cancel"), kind: "danger", why: true, impact: () => L("ใบเดิมยังอยู่ในทะเบียนและเล่ม เลขที่ไม่นำกลับมาใช้", "The receipt stays in the register and the book; its number isn't reused"), run: (_, why) => { rcCancel(r, why); return L("ยกเลิกแล้ว", "Cancelled"); } });
    }
    return out;
  },
  view: r => kv([[L("เล่ม / เลขที่", "Book / no."), `<span class="mono">${rcNo(r)}</span> · ${r.id}`], [L("วันที่", "Date"), fdate(r.date)], [L("ผู้ชำระ", "Payer"), esc(tx(r.payer))], [L("รายการ", "Item"), esc(tx(r.desc))],
    [L("ประเภท", "Type"), `${tx(REV_T[rcClass(r)])} · ${tx(RC_M[r.method])}${r.fund ? ` · ${r.fund}` : ""}`], [L("จำนวนเงิน", "Amount"), `${fmt(r.amount, 2)} ${L("บาท", "baht")}`],
    [L("GFMIS", "GFMIS"), r.recorded ? `<span class="mono">${esc(r.recorded.doc)}</span> · ${fdate(r.recorded.t, true)}` : L("ยังไม่บันทึก", "Not recorded yet")],
    [L("นำส่ง", "Remittance"), r.remit ? `<span class="mono">${r.remit}</span>` : r.cancelled ? "—" : `${clockTxt(rcDue(r))} · ${rcDueSrc(r)}`],
    r.voucher && [L("เงินคืนของใบขอเบิก", "Refund on voucher"), `<span class="mono">${r.voucher}</span>`], r.replaces && [L("ออกแทน", "Replaces"), r.replaces],
    r.cancelled && [L("ยกเลิก", "Cancelled"), `${esc(userName(r.cancelled.by))} · ${fdate(r.cancelled.t, true)} · ${esc(r.cancelled.why)}`]])
    + `<p class="sub">${L("ใบเสร็จแก้ไขหรือลบไม่ได้ ยกเลิกได้ทั้งฉบับพร้อมเหตุผลและออกฉบับใหม่ (ข้อ 76)", "Receipts can't be edited or deleted; cancel the whole receipt with a reason and issue a new one (clause 76)")}</p>`,
  hist: r => r.id,
});
FS.receipts = () => {
  const R = S.receipts || [], maker = ROLE === "fin", unrec = R.filter(r => rcLive(r) && !r.recorded), advBack = (S.advances || []).filter(a => a.cashBack && !a.cashBack.rc);
  return crudList("fnRc", { head: `<h2>${L("ใบเสร็จรับเงิน", "Receipts")}</h2><span class="sp"></span>${maker && unrec.length ? `<button class="btn" type="button" id="rc-rec">${L("จำลอง: บันทึกทุกใบใน GFMIS", "Simulate: record all in GFMIS")} (${unrec.length})</button>` : ""}`,
    after: maker && advBack.length ? `<div class="body"><div class="alert" style="margin:0"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("เงินยืมเหลือคืนที่ยังไม่ออกใบเสร็จ", "Advance cash returned without a receipt")}</b>${advBack.map(a => `<div style="margin-top:4px"><span class="mono">${a.id}</span> ${esc(userName(a.borrower))} · ${fmt(a.cashBack.amount, 2)} <button class="btn" type="button" data-rcadv="${a.id}">${L("ออกใบเสร็จ", "Issue the receipt")}</button></div>`).join("")}</div></div></div>` : "",
    empty: L("ยังไม่มีใบเสร็จ", "No receipts yet") });
};
// A form a receipt-cancel opens stays open (the shared list closes a drawer whose record is gone).
{ const p = CRUD.defs.fnRc; p.prefill = () => RC_DRAFT || null; }
FIN_BINDS.push(() => { if (!CR_OPEN || CR_OPEN.key !== "fnRc" || CR_OPEN.id) RC_DRAFT = null; }); // a reissue form that was closed leaves nothing behind

// ---------- remittances (FR-FC-28) ----------
const RM_ST = { sent: [["นำส่งแล้ว รอรายงาน GFMIS", "Remitted · waiting for the GFMIS report"], "p-info"], done: [["ตรงกับรายงาน GFMIS", "In the GFMIS report"], "p-ok"], off: [["กลับรายการ", "Reversed"], "p-mute"] };
const rmSt = m => (m.reversed ? "off" : m.gf ? "done" : "sent");
const rmOpenOf = k => rcOpen().filter(r => rcClass(r) === k);
CRUD.def("fnRm", {
  noun: ["การนำส่งเงิน", "Remittance"], st: RM_ST, list: () => (S.remits = S.remits || []), id: m => m.id, title: m => `${m.id} · ${tx(REV_T[m.cls])}`, sub: m => `${fmt(m.amount, 2)} ${L("บาท", "baht")} · ${m.rows.length} ${L("ใบ", "receipts")}`,
  status: rmSt, gone: m => !!m.reversed, search: m => `${m.id} ${m.ref} ${m.rows.join(" ")}`,
  cols: [{ h: ["นำส่ง", "Remittance"], sort: m => m.id, c: m => `<span class="mono">${m.id}</span><div class="sub">${tx(REV_T[m.cls])}</div>` }, { h: ["วันที่", "Date"], sort: m => m.t, c: m => `<span class="sub">${fdate(m.t, true)}</span>` },
    { h: ["อ้างอิงธนาคาร", "Bank ref"], c: m => `<span class="mono">${esc(m.ref)}</span>` }, { h: ["บาท", "Baht"], n: true, sort: m => m.amount, c: m => `${fmt(m.amount, 2)}${m.late ? `<div class="sub" style="color:var(--bad)">${m.late} ${L("ใบช้า", "late")}</div>` : ""}` }],
  live: true,
  fields: (m, v) => {
    if (m) return [{ id: "ref", label: ["เลขอ้างอิงธนาคาร", "Bank reference"], req: true, value: m.ref }, { id: "date", label: ["วันที่นำส่ง", "Remitted on"], type: "date", req: true, value: m.t.slice(0, 10), max: TODAY }];
    const ks = Object.keys(REV_T).filter(k => rmOpenOf(k).length), k = v.cls || RM_CLS || ks[0] || "revenue", xs = rmOpenOf(k);
    return [{ id: "cls", label: ["ประเภทเงิน", "Type of money"], type: "select", req: true, value: k, opts: ks.map(x => [x, `${tx(REV_T[x])} (${rmOpenOf(x).length})`]) },
      ...xs.map(r => ({ id: "r_" + r.id, label: [`${rcNo(r)} · ${tx(r.payer)} · ${fmt(r.amount, 2)}`, `${rcNo(r)} · ${tx(r.payer)} · ${fmt(r.amount, 2)}`], type: "check", wide: true, value: !!r.recorded,
        hint: r.recorded ? `${L("ครบกำหนด", "due")} ${fdate(rcDue(r))} · ${rcDueSrc(r)}` : L("ยังไม่บันทึกใน GFMIS นำส่งไม่ได้", "Not recorded in GFMIS yet; can't be remitted") })),
      { id: "ref", label: ["เลขอ้างอิงธนาคาร", "Bank reference"], req: true, value: `KTB-${TODAY.replace(/-/g, "").slice(2)}${String((S.remits || []).length + 1).padStart(3, "0")}`, hint: L("จำลอง เติมให้แล้ว", "Simulated, filled in") }];
  },
  check: (v, m) => { if (m) return []; const xs = rmOpenOf(v.cls).filter(r => v["r_" + r.id]);
    return [!xs.length && { f: null, m: L("เลือกใบเสร็จอย่างน้อยหนึ่งใบ", "Pick at least one receipt") }, xs.some(r => !r.recorded) && { f: null, m: L("ใบที่ยังไม่บันทึกใน GFMIS นำส่งไม่ได้", "Receipts not recorded in GFMIS can't be remitted") }].filter(Boolean); },
  create: { can: () => isFinRole() && rcOpen().some(r => r.recorded), label: ["นำส่งเงิน", "Remit money"], run: v => {
    if (typeof gfOk === "function" && !gfOk("remit")) return null;
    const xs = rmOpenOf(v.cls).filter(r => v["r_" + r.id]), M = S.remits = S.remits || [], id = `RM-${FAM_FY}-${String(maxNo(M.map(x => x.id), new RegExp(`^RM-${FAM_FY}-(\\d+)`)) + 1).padStart(3, "0")}`, late = xs.filter(r => daysUntil(rcDue(r)) < 0).length;
    const m = { id, cls: v.cls, rows: xs.map(r => r.id), amount: sumv(xs.map(r => r.amount)), t: nowIso(), by: me().id, ref: v.ref, late };
    xs.forEach(r => (r.remit = id)); M.push(m); RM_CLS = null;
    audit(["นำเงินส่งคลัง", "Remitted money to the treasury"], `${id} · ${tx(REV_T[v.cls])} · ${fmt(m.amount, 2)}${late ? ` · ${late} ${L("รายการช้า", "late")}` : ""}`);
    if (late) notify(["finhead"], [`นำส่ง ${id} มี ${late} รายการช้ากว่ากำหนด (ข้อ 101)`, `Remittance ${id} has ${late} late items (clause 101)`], "fnc-recv:remit");
    return m; } },
  edit: { can: m => isFinRole() && !m.reversed && !m.gf, why: () => true, run: (m, v, why) => {
    const old = `${m.ref}/${m.t.slice(0, 10)}`; m.ref = v.ref; m.t = `${v.date}${m.t.slice(10)}`; audit(["แก้ไขข้อมูลการนำส่ง", "Corrected a remittance"], `${m.id} · ${old} → ${m.ref}/${v.date} · ${why}`); } },
  acts: m => (isFinRole() && !m.reversed && !m.gf ? [{ id: "rev", label: L("กลับรายการนำส่ง", "Reverse the remittance"), kind: "danger", why: true,
    impact: () => L(`ใบเสร็จ ${m.rows.length} ใบกลับเป็นรอนำส่ง นาฬิกานำส่งเดินต่อจากวันที่รับเงิน`, `${m.rows.length} receipts go back to waiting; their remittance clocks keep running from the day received`),
    run: (_, why) => { m.rows.forEach(id => { const r = rcOf(id); if (r && r.remit === m.id) r.remit = null; }); m.reversed = { by: me().id, t: nowIso(), why };
      audit(["กลับรายการนำส่งเงิน", "Reversed a remittance"], `${m.id} · ${why}`); notify(["finhead"], [`กลับรายการนำส่ง ${m.id}: ${why}`, `Remittance ${m.id} reversed: ${why}`], "fnc-recv:remit"); return L("กลับรายการแล้ว", "Reversed"); } }] : []),
  view: m => `${kv([[L("ประเภทเงิน", "Type of money"), tx(REV_T[m.cls])], [L("อ้างอิงธนาคาร", "Bank ref"), `<span class="mono">${esc(m.ref)}</span>`], [L("นำส่งโดย", "By"), `${esc(userName(m.by))} · ${fdate(m.t, true)}`],
      [L("GFMIS", "GFMIS"), m.gf ? `<span class="mono">${esc(m.gf.doc)}</span>` : L("ยังไม่พบในรายงาน (F7)", "Not in the report yet (F7)")], m.reversed && [L("กลับรายการ", "Reversed"), `${esc(userName(m.reversed.by))} · ${esc(m.reversed.why)}`]])}
    <div class="tbl-wrap"><table><tbody>${m.rows.map(id => { const r = rcOf(id); return r ? `<tr><td class="mono">${rcNo(r)}</td><td>${esc(tx(r.payer))}</td><td class="n">${fmt(r.amount, 2)}</td><td>${daysUntil(rcDue(r)) < 0 && !m.reversed ? tag(L("ช้า", "Late"), "p-bad") : ""}</td></tr>` : ""; }).join("")}</tbody></table></div>`,
  hist: m => m.id,
});
FS.remit = () => {
  const fin = isFinRole(), open = rcOpen();
  const groups = Object.keys(REV_T).map(k => { const xs = open.filter(r => rcClass(r) === k); return { k, xs, due: xs.map(rcDue).sort()[0] }; }).filter(g => g.xs.length);
  return `<section class="panel"><header><h2>${L("เงินรอนำส่ง", "Money waiting to be remitted")}</h2><span class="sp"></span><span class="sub">${L("ตามประเภทเงินและกำหนดเวลาในข้อ 101 (R-FN-06 นำส่ง)", "By type of money and the clause-101 deadline (R-FN-06, remittance)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ประเภท", "Type")}</th><th class="n">${L("ใบ", "Receipts")}</th><th class="n">${L("บาท", "Baht")}</th><th>${L("ครบกำหนดเร็วสุด", "Earliest due")}</th><th></th></tr></thead>
      <tbody>${groups.map(g => `<tr><td>${tx(REV_T[g.k])}${g.xs.some(r => !r.recorded) ? `<div class="sub">${g.xs.filter(r => !r.recorded).length} ${L("ใบยังไม่บันทึก GFMIS", "not recorded in GFMIS")}</div>` : ""}</td><td class="n">${g.xs.length}</td><td class="n">${fmt(sumv(g.xs.map(r => r.amount)), 2)}</td><td>${dotI(clockDot(g.due))}${clockTxt(g.due)}</td>
        <td>${fin && g.xs.some(r => r.recorded) ? `<button class="btn ${daysUntil(g.due) <= 0 ? "primary" : ""}" type="button" data-rmnew="${g.k}">${L("นำส่ง…", "Remit…")}</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="5" class="sub">${L("ไม่มีเงินรอนำส่ง", "Nothing waiting to be remitted")}</td></tr>`}</tbody></table></div></section>
  ${crudList("fnRm", { head: `<h2>${L("การนำส่งเงิน", "Remittances")}</h2>`, empty: L("ยังไม่มีการนำส่ง", "No remittances yet") })}`;
};
FIN_BINDS.push(() => { $$("[data-rmnew]").forEach(b => (b.onclick = () => { RM_CLS = b.dataset.rmnew; crOpen("fnRm", "", "edit"); route(); const f = $("#cr-form input, #cr-form select"); if (f) f.focus(); })); });

// ---------- audit queries (FR-FC-39, clause 109) ----------
const AQ_ST = { open: [["รอชี้แจง", "To answer"], "p-warn"], draft: [["ร่างคำชี้แจง", "Answer drafted"], "p-info"], sent: [["ชี้แจงแล้ว", "Answered"], "p-ok"], off: [["ลบแล้ว", "Deleted"], "p-mute"] };
const aqSt = q => (q.deleted ? "off" : q.answer ? "sent" : q.draft ? "draft" : "open");
CRUD.def("fnAq", {
  noun: ["ข้อทักท้วง", "Audit query"], st: AQ_ST, list: () => (S.auditQs = S.auditQs || []), id: q => q.id, title: q => tx(q.subject), sub: q => `${esc(q.from)} · ${L("รับแจ้ง", "received")} ${fdate(q.date)}`,
  status: aqSt, gone: q => !!q.deleted, search: q => `${q.id} ${q.subject.join(" ")} ${q.from}`,
  cols: [{ h: ["เลขที่", "No."], sort: q => q.id, c: q => `<span class="mono">${q.id}</span><div class="sub">${esc(q.from)}</div>` }, { h: ["เรื่อง", "Subject"], c: q => esc(tx(q.subject)) },
    { h: ["กำหนดชี้แจง", "Answer by"], sort: q => q.due, c: q => (q.answer ? `<span class="sub">${fdate(q.answer.t)}</span>` : `${dotI(clockDot(q.due))}${clockTxt(q.due)}`) }],
  fields: q => [
    { id: "from", label: ["จากหน่วยงาน", "From"], req: true, value: q ? q.from : L("สตง.", "SAO"), lock: !!(q && q.answer) },
    { id: "th", label: ["เรื่อง", "Subject"], req: true, wide: true, value: q ? q.subject[0] : "", lock: !!(q && q.answer), show: q && esc(q.subject[0]) },
    { id: "date", label: ["วันที่ได้รับแจ้ง", "Received on"], type: "date", req: true, max: TODAY, value: q ? q.date : TODAY, lock: !!(q && q.answer), hint: L(`ต้องชี้แจงภายใน ${fcfg().aqDays} วัน (ข้อ 109 ตั้งใน M10)`, `Answer within ${fcfg().aqDays} days (clause 109, set in M10)`) },
    ...(q ? [{ id: "draft", label: ["ร่างคำชี้แจง", "Draft answer"], type: "textarea", wide: true, value: q.draft || "" }] : []),
  ],
  create: { can: () => ROLE === "finhead", label: ["บันทึกข้อทักท้วง", "Record a query"], run: v => {
    const Q = S.auditQs = S.auditQs || [], q = { id: `AQ-${FAM_FY}-${String(maxNo(Q.map(x => x.id), new RegExp(`^AQ-${FAM_FY}-(\\d+)`)) + 1).padStart(2, "0")}`, from: v.from, subject: [v.th, v.th], date: v.date, due: addDays(v.date, fcfg().aqDays), answer: null };
    Q.push(q); audit(["บันทึกข้อทักท้วง", "Recorded an audit query"], `${q.id} · ${v.th}`); return q; } },
  edit: { can: q => ROLE === "finhead" && !q.deleted && !q.answer, run: (q, v) => {
    q.from = v.from; q.subject = [v.th, v.th]; q.date = v.date; q.due = addDays(v.date, fcfg().aqDays); q.draft = v.draft || "";
    audit(["แก้ไขข้อทักท้วงหรือร่างคำชี้แจง", "Edited an audit query or its draft answer"], q.id); } },
  acts: q => {
    if (ROLE !== "finhead" || q.deleted) return [];
    if (q.answer) return [{ id: "more", label: L("ชี้แจงเพิ่มเติม", "Add a further explanation"), why: true, whyLabel: L("คำชี้แจงเพิ่มเติม", "Further explanation"),
      run: (_, why) => { (q.more = q.more || []).push({ text: why, by: me().id, t: nowIso() }); audit(["ชี้แจงข้อทักท้วงเพิ่มเติม", "Added to an audit answer"], q.id); return L("บันทึกแล้ว", "Saved"); } }];
    const out = [];
    if ((q.draft || "").trim().length >= CR_WHY_MIN) out.push({ id: "send", label: L("ส่งคำชี้แจง", "Send the answer"), kind: "primary", confirm: L("ส่งแล้วแก้ไม่ได้ เพิ่มได้เฉพาะคำชี้แจงเพิ่มเติม", "Once sent it can't be changed; you can only add a further explanation"),
      impact: () => (TODAY > q.due ? L(`ช้ากว่ากำหนด ${fdate(q.due)}`, `Later than the due date ${fdate(q.due)}`) : L(`ภายในกำหนด ${fdate(q.due)}`, `Within the due date ${fdate(q.due)}`)),
      run: () => { q.answer = { text: q.draft.trim(), by: me().id, t: nowIso() }; q.draft = ""; audit(["ชี้แจงข้อทักท้วง", "Answered an audit query"], q.id); notify(["exec", "audit"], [`ส่งคำชี้แจงข้อทักท้วง ${q.id} แล้ว`, `Answer to audit query ${q.id} sent`], "fnc-close:audit"); return L("ส่งคำชี้แจงแล้ว", "Answer sent"); } });
    if (!(q.draft || "").trim()) out.push({ id: "del", label: L("ลบข้อที่บันทึกผิด", "Delete (entered by mistake)"), kind: "danger", why: true, run: (_, why) => { q.deleted = { by: me().id, t: nowIso(), why }; audit(["ลบข้อทักท้วงที่บันทึกผิด", "Deleted an audit query entered by mistake"], `${q.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } });
    return out;
  },
  view: q => kv([[L("เรื่อง", "Subject"), esc(tx(q.subject))], [L("จาก", "From"), esc(q.from)], [L("รับแจ้ง", "Received"), fdate(q.date)], [L("กำหนดชี้แจง", "Answer by"), `${fdate(q.due)} (${L("ข้อ 109", "cl. 109")})`],
    q.draft && [L("ร่างคำชี้แจง", "Draft answer"), esc(q.draft)], q.answer && [L("คำชี้แจง", "Answer"), `${esc(q.answer.text)}<div class="sub">${esc(userName(q.answer.by))} · ${fdate(q.answer.t, true)}</div>`],
    (q.more || []).length && [L("ชี้แจงเพิ่มเติม", "Further explanations"), q.more.map(x => `${esc(x.text)} <span class="sub">${fdate(x.t, true)}</span>`).join("<br>")],
    q.deleted && [L("ลบ", "Deleted"), `${esc(userName(q.deleted.by))} · ${esc(q.deleted.why)}`]]),
  hist: q => q.id,
});
FS.auditQ = () => {
  const diff = (S.dailyCash || []).filter(d => d.status === "diff");
  return crudList("fnAq", { head: `<h2>${L("ข้อทักท้วงและเหตุการณ์", "Audit queries and incidents")}</h2><span class="sp"></span><span class="sub">${L(`ชี้แจงภายใน ${fcfg().aqDays} วัน (ข้อ 109)`, `Answer within ${fcfg().aqDays} days (clause 109)`)}</span>`,
    after: diff.length ? `<div class="body">${diff.map(d => `<div>${dotI("bad")}<span class="mono">DC ${d.date}</span> ${L("ยอดเงินที่นับไม่ตรงกับรายงานเงินคงเหลือ (ข้อ 95)", "Cash count differed from the daily report (clause 95)")}</div>`).join("")}</div>` : "", empty: L("ไม่มีข้อทักท้วง", "No audit queries") });
};
