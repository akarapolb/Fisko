// Fisko Finance (round 11, light version): commitments and the chain from allocation to payment,
// payment requests with approval, and GFMIS reconciliation by file import (files only, per D-F05).
// Official recording and payment stay in GFMIS; Fisko controls the commitment and matches the result.
let FIN_TAB = "chain", GF_ROWS = null;
const RECON_ST = { matched: [["ตรงกับ GFMIS", "Matches GFMIS"], "p-ok"], diff: [["ผลต่าง", "Difference"], "p-bad"], explained: [["ชี้แจงแล้ว", "Explained"], "p-info"], none: [["รอไฟล์ GFMIS", "Waiting for a file"], "p-mute"] };
const payPaid = lineId => sumv(S.payreqs.filter(p => p.status === "approved" && famCon(p.contract).line === lineId).map(p => p.amount));
const acceptedValue = lineId => sumv(S.contracts.filter(c => c.line === lineId).flatMap(c => c.phases.filter(phaseAccepted).map(ph => ph.amount)));
const reconState = p => (p.recon ? p.recon.state : "none");
// Finance sections: each entry renders one or more panels. 66h-fin-pages.js arranges them into pages and tabs,
// so where a section shows is decided in one place. FIN_BINDS wire events after every Finance render; they look
// elements up by selector, so they are safe on any page.
const FS = {}, FIN_BINDS = [];
// Finance drawers (vouchers, advances) keep their own markup but behave like the shared drawer (Finance CRUD UI-F6, F9):
// an action that needs a reason opens one reason box (.cr-ask markup, CR_WHY_MIN), and a History tab lists the record's
// steps. FIN_ASK_RUN[key](act, why) runs the action and returns an error to show in the box, or nothing.
let FIN_ASK = null; // { key, act, err }
const FIN_DTAB = {}, FIN_ASK_RUN = {};
const finAskBtn = (key, act, label, kind) => `<button class="btn ${kind || ""}" type="button" data-fask="${key}|${act}">${label}</button>`;
function finAskForm(key, act, label, o = {}) {
  const need = o.need !== false, err = FIN_ASK && FIN_ASK.err;
  return `<form class="cr-ask" id="fn-ask" data-fask-key="${key}" data-fask-act="${act}" data-need="${need ? 1 : 0}"><b>${label}</b>${o.impact ? `<div class="sub">${o.impact}</div>` : ""}${o.extra || ""}
    <label for="fn-why">${o.whyLabel || (need ? L(`เหตุผล (อย่างน้อย ${CR_WHY_MIN} ตัวอักษร)`, `Reason (at least ${CR_WHY_MIN} characters)`) : L("หมายเหตุ (ถ้ามี)", "Note (optional)"))}</label><textarea id="fn-why" rows="2"${err ? ' aria-invalid="true" aria-describedby="fn-why-err"' : ""}>${esc((FIN_ASK && FIN_ASK.why) || "")}</textarea>
    ${err ? `<div class="cr-err" id="fn-why-err" role="alert">${esc(err)}</div>` : ""}
    <div class="row"><button class="btn ${o.danger ? "danger" : "primary"}" type="submit">${L("ยืนยัน", "Confirm")}</button><button class="btn ghost" type="button" data-fask="">${L("ย้อนกลับ", "Back")}</button></div></form>`;
}
// Tabs at the top of a Finance drawer: [[id, label, html]]; the current one is kept per drawer key.
function finDrTabs(key, tabs) {
  const cur = tabs.find(t => t[0] === FIN_DTAB[key]) || tabs[0];
  return `<div class="tabs cr-tabs" role="tablist">${tabs.map(t => `<button class="tab ${t === cur ? "on" : ""}" type="button" role="tab" aria-selected="${t === cur}" data-fdtab="${key}|${t[0]}">${t[1]}</button>`).join("")}</div>${cur[2]}`;
}
// A record's own steps as a timeline, newest first; the History button opens every audit entry that names it.
const finLogHtml = (log, id) => (log || []).length ? `<ol class="timeline">${log.slice().reverse().map(l => `<li class="done"><span class="dot"></span><div><b style="font-weight:600">${esc(tx(l.act))}</b><small>${esc(userName(l.by))}${l.role ? " · " + tx(ROLES[l.role]) : ""} · ${fdate(l.t, true)}</small>${l.note ? `<div class="sub">${esc(l.note)}</div>` : ""}</div></li>`).join("")}</ol><div style="margin-top:8px">${historyBtn(id, id)}</div>`
  : `<span class="sub">${L("ยังไม่มีประวัติ", "No history yet")}</span>`;
document.addEventListener("click", e => {
  const t = e.target.closest("[data-fask],[data-fdtab]");
  if (!t || !$("#view").contains(t)) return;
  if (t.dataset.fdtab) { const [k, id] = t.dataset.fdtab.split("|"); FIN_DTAB[k] = id; FIN_ASK = null; route(); return; }
  const v = t.dataset.fask; FIN_ASK = v ? { key: v.split("|")[0], act: v.split("|")[1], err: null } : null; route();
  const w = $("#fn-why"); if (w) w.focus();
});
document.addEventListener("submit", e => {
  if (e.target.id !== "fn-ask") return;
  e.preventDefault();
  const f = e.target, key = f.dataset.faskKey, act = f.dataset.faskAct, why = $("#fn-why").value.trim();
  if (f.dataset.need === "1" && why.length < CR_WHY_MIN) { FIN_ASK = { key, act, why, err: L(`ใส่เหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร`, `Give a reason of at least ${CR_WHY_MIN} characters`) }; route(); const w = $("#fn-why"); if (w) w.focus(); return; }
  FIN_ASK = null; // the action re-renders the page itself; the box closes unless it hands back an error
  const err = FIN_ASK_RUN[key] && FIN_ASK_RUN[key](act, why);
  if (err) { FIN_ASK = { key, act, why, err }; route(); const w = $("#fn-why"); if (w) w.focus(); return; }
  if ($("#fn-ask")) route();
});
window.addEventListener("hashchange", () => { FIN_ASK = null; });

// A row action that needs input (release, cancel) opens one form row under its row: "<kind>:<id>".
let FIN_ROW = null;
const rowBtn = (key, label) => `<button class="btn ghost" type="button" data-frow="${esc(key)}" aria-expanded="${FIN_ROW === key}">${label}</button>`;
const rowForm = (cols, inner) => `<tr class="fn-rowform"><td colspan="${cols}"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">${inner}<button class="btn ghost" type="button" data-frow="">${L("ปิด", "Close")}</button></div></td></tr>`;

// The chain from allocation to payment, by allocation line that has a procurement plan or a contract.
function chainData() {
  const ids = [...new Set([...S.pplan.map(p => p.line), ...S.contracts.map(c => c.line)])];
  const rows = ids.map(id => ({ l: famLine(id), planned: sumv(S.pplan.filter(p => p.line === id).map(p => p.est)), com: famCommitted(id), acc: acceptedValue(id), paid: payPaid(id) }));
  const T = k => sumv(rows.map(r => r[k])), alloc = sumv(rows.map(r => r.l.amount));
  const overdue = S.contracts.flatMap(c => c.phases.filter(ph => !phaseAccepted(ph) && ph.due < TODAY).map(ph => ({ c, ph })));
  return { rows, T, alloc, overdue, top: rows.slice().sort((a, b) => b.com - a.com)[0] };
}
FS.chainKpis = () => {
  const { T, alloc } = chainData();
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("วงเงินจัดสรร (รายการที่มีแผนจัดซื้อ)", "Allocated (lines with a plan)")}</span><span class="v">${mb(alloc)}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("ผูกพันแล้ว (สัญญา)", "Committed (contracts)")}</span><span class="v">${mb(T("com"))}</span><span class="d sub">${fmt(alloc ? T("com") / alloc * 100 : 0, 1)}%</span></div>
    <div class="kpi"><span class="l">${L("ตรวจรับแล้ว", "Accepted")}</span><span class="v">${mb(T("acc"))}</span></div>
    <div class="kpi hl"><span class="l">${L("อนุมัติเบิกจ่ายแล้ว", "Payments approved")}</span><span class="v">${mb(T("paid"))}</span><span class="d" style="color:var(--rail-ink)">${fmt(T("com") ? T("paid") / T("com") * 100 : 0, 1)}% ${L("ของวงเงินผูกพัน", "of committed")}</span></div>
  </section>`;
};
FS.chain = () => {
  const { rows, T, alloc, overdue, top } = chainData();
  return `
  <section class="panel"><header><h2>${L("สายจากวงเงินจัดสรรถึงการเบิกจ่าย", "From allocation to payment")} · ${fyLabel(FAM_FY)}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท · ทุกขั้นอ้างรหัสรายการจัดสรร (M06) เดียวกัน", "M baht · every step refers to the same M06 allocation line")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รายการจัดสรร", "Allocation line")}</th><th class="n">${L("จัดสรร", "Allocated")}</th><th class="n">${L("ในแผนจัดซื้อ", "Planned")}</th><th class="n">${L("ผูกพัน", "Committed")}</th><th class="n">${L("ตรวจรับ", "Accepted")}</th><th class="n">${L("เบิกจ่าย", "Paid")}</th><th style="width:150px">${L("ผูกพันของจัดสรร", "Committed / allocated")}</th><th class="n">${L("ยังไม่ผูกพัน", "Not committed")}</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td><b style="font-weight:600">${esc(tx(r.l.name))}</b><div class="sub">${unitName(r.l.unit)} · <span class="mono">${r.l.id}</span></div></td><td class="n">${mb(r.l.amount)}</td><td class="n">${mb(r.planned)}</td><td class="n">${mb(r.com)}</td><td class="n">${mb(r.acc)}</td><td class="n">${mb(r.paid)}</td>
        <td><div class="bar"><i style="width:${Math.min(100, r.l.amount ? r.com / r.l.amount * 100 : 0)}%"></i></div><span class="sub">${fmt(r.l.amount ? r.com / r.l.amount * 100 : 0, 0)}%</span></td><td class="n">${mb(famHeadroom(r.l.id))}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${mb(alloc)}</td><td class="n">${mb(T("planned"))}</td><td class="n">${mb(T("com"))}</td><td class="n">${mb(T("acc"))}</td><td class="n">${mb(T("paid"))}</td><td></td><td class="n">${mb(sumv(rows.map(r => famHeadroom(r.l.id))))}</td></tr></tfoot></table></div>
    ${top ? `<div class="body"><div class="callout" style="margin:0"><b>${L("ตอบได้ในที่เดียว", "Answered in one place")}</b> ${esc(tx(top.l.name))}: ${L("จัดสรร", "allocated")} ${mb(top.l.amount)} · ${L("ผูกพัน", "committed")} ${mb(top.com)} · ${L("จ่ายแล้ว", "paid")} ${mb(top.paid)} · ${L("ยังไม่ผูกพัน", "not committed")} ${mb(famHeadroom(top.l.id))} ${L("ล้านบาท", "M baht")} · ${overdue.length ? `${overdue.length} ${L("งวดเลยกำหนดและยังไม่ตรวจรับ", "overdue phases are not accepted yet")}` : L("ไม่มีงวดเลยกำหนด", "no overdue phases")}</div></div>` : ""}</section>`;
};
FS.chainOverdue = () => {
  const { overdue } = chainData();
  return `${overdue.length ? `<section class="panel"><header><h2>${L("งวดที่เลยกำหนดและยังไม่ตรวจรับ", "Overdue phases not yet accepted")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา", "Contract")}</th><th>${L("งวด", "Phase")}</th><th>${L("กำหนด", "Due")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th></tr></thead>
    <tbody>${overdue.map(x => `<tr><td><span class="mono">${x.c.id}</span> ${esc(tx(famPlan(x.c.plan).name))}</td><td>${tx(x.ph.name)}</td><td>${dueText(x.ph.due)}</td><td class="n">${mb(x.ph.amount)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};

// Round-11 matching of approved payments with a GFMIS report file.
FS.payfile = () => {
  const appr = S.payreqs.filter(p => p.status === "approved"), isFin = ROLE === "fin", files = S.gfmisFiles || [];
  const open = appr.filter(p => reconState(p) === "none" || reconState(p) === "diff").length;
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("กระทบยอดกับไฟล์รายงานจาก GFMIS", "Reconcile with a GFMIS report file")}</b>
    <p>${L("ระหว่างรอยืนยันช่องทางเชื่อมต่อ (ประเด็น D-F05) ใช้ไฟล์รายงานที่ส่งออกจาก GFMIS ระบบเทียบรายการจ่ายกับที่อนุมัติใน Fisko ผู้กระทบยอดต้องไม่ใช่ผู้อนุมัติรายการนั้น (SD-05)", "Until the access channel is confirmed (decision D-F05), a report file exported from GFMIS is used. Payments are matched with what was approved in Fisko; the person reconciling can't be the one who approved it (SD-05).")}</p></div></div>
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("อนุมัติเบิกจ่ายแล้ว", "Approved payments")}</span><span class="v">${appr.length}</span></div>
    <div class="kpi"><span class="l">${L("ตรงกับ GFMIS / ชี้แจงแล้ว", "Matched / explained")}</span><span class="v">${appr.filter(p => ["matched", "explained"].includes(reconState(p))).length}</span></div>
    <div class="kpi"><span class="l">${L("รอไฟล์หรือมีผลต่าง", "Waiting or different")}</span><span class="v" style="color:var(--${open ? "warn" : "accent"})">${open}</span></div>
  </section>
  <section class="panel"><header><h2>${L("นำเข้าไฟล์ GFMIS", "Import a GFMIS file")}</h2><span class="sp"></span>${isFin ? `<button class="btn" type="button" id="gf-sample">${L("สร้างไฟล์ตัวอย่าง", "Create a sample file")}</button>` : `<span class="sub">${L("เจ้าหน้าที่การเงินนำเข้า", "Finance officers import")}</span>`}</header>
    ${GF_ROWS ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่คำขอ", "Request")}</th><th>${L("เลขที่เอกสาร GFMIS", "GFMIS document")}</th><th class="n">${L("วงเงินในไฟล์ (บาท)", "File amount (baht)")}</th><th>${L("วันที่", "Date")}</th><th>${L("ผลตรวจ", "Check")}</th></tr></thead>
      <tbody>${GF_ROWS.map(r => `<tr><td class="mono">${esc(r.pay || "—")}</td><td class="mono">${esc(r.doc)}</td><td class="n">${fmt(r.amount)}</td><td class="sub">${fdate(r.date)}</td><td>${r.state === "matched" ? tag(L("ตรงกัน", "Matches"), "p-ok") : r.state === "diff" ? tag(`${L("ผลต่าง", "Difference")} ${fmt(r.amount - r.expect)}`, "p-bad") : tag(L("ไม่พบในระบบ", "Not in Fisko"), "p-warn")}</td></tr>`).join("")}</tbody></table></div>
      <div class="body row"><button class="btn primary" type="button" id="gf-go">${L("นำเข้าไฟล์", "Import file")}</button><button class="btn ghost" type="button" id="gf-clear">${L("ล้าง", "Clear")}</button></div>`
      : `<div class="body sub">${isFin ? L("กด “สร้างไฟล์ตัวอย่าง” เพื่อสร้างไฟล์จากรายการที่อนุมัติแล้วและยังไม่ตรงกับ GFMIS", "Press “Create a sample file” to build one from approved payments that haven't been matched yet") : L("ยังไม่ได้เลือกไฟล์", "No file chosen")}</div>`}</section>
  <section class="panel"><header><h2>${L("ผลกระทบยอดรายการเบิกจ่าย", "Reconciliation by payment")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("สัญญา", "Contract")}</th><th class="n">${L("วงเงิน (บาท)", "Amount (baht)")}</th><th>${L("ผู้อนุมัติ", "Approved by")}</th><th>${L("ผล", "Result")}</th><th></th></tr></thead>
      <tbody>${appr.map(p => { const st = reconState(p);
        return `<tr><td class="mono">${p.id}</td><td class="mono">${p.contract}</td><td class="n">${fmt(p.amount)}</td><td>${esc(userName(p.decided.by))}${p.decided.via ? `<div class="sub">${L("แทน", "for")} ${esc(userName(p.decided.holder))}</div>` : ""}</td>
          <td>${stTag(RECON_ST, st)}${p.recon && p.recon.doc ? `<div class="sub mono">${esc(p.recon.doc)}</div>` : ""}${p.recon && p.recon.note ? `<div class="sub">${esc(p.recon.note)}</div>` : ""}</td>
          <td><div class="row" style="flex-wrap:nowrap">${isFin && st === "diff" ? rowBtn("rn:" + p.id, L("ชี้แจง", "Explain")) : isFin && st === "explained" && !pfClosed(p.recon.t) ? rowBtn("rn:" + p.id, L("แก้คำชี้แจง", "Edit the explanation")) : ""}${historyBtn(p.id, p.id)}</div></td></tr>
          ${isFin && (st === "diff" || (st === "explained" && !pfClosed(p.recon.t))) && FIN_ROW === "rn:" + p.id ? rowForm(6, `<b style="font-weight:600">${L("คำชี้แจงผลต่าง", "Explain the difference")} ${p.id}</b><input type="text" id="rn-${p.id}" placeholder="${L("คำชี้แจงผลต่าง", "Explain the difference")}" style="min-width:260px;flex:1" aria-label="${L("คำชี้แจงผลต่าง", "Explain the difference")}"><button class="btn primary" type="button" data-rexp="${p.id}">${L("บันทึกคำชี้แจง", "Save")}</button>`) : ""}`; }).join("")
        || `<tr><td colspan="6" class="sub">${L("ยังไม่มีรายการที่อนุมัติเบิกจ่าย", "No approved payments yet")}</td></tr>`}</tbody></table></div></section>
  ${files.length ? `<section class="panel"><header><h2>${L("ประวัติการนำเข้าไฟล์", "File import log")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("ไฟล์", "File")}</th><th>${L("เวลา", "Time")}</th><th>${L("ผู้นำเข้า", "By")}</th><th class="n">${L("แถว", "Rows")}</th><th class="n">${L("ไม่ตรง", "Not matching")}</th></tr></thead>
    <tbody>${files.map(g => `<tr${g.undone ? ' style="opacity:.55"' : ""}><td class="mono">${g.id}</td><td class="sub">${fdate(g.t, true)}</td><td>${esc(userName(g.by))}${g.undone ? `<div class="sub">${L("ยกเลิกการนำเข้า", "Import undone")} · ${esc(g.undone.why)}</div>` : ""}</td><td class="n">${g.rows.length}</td><td class="n">${g.rows.filter(r => !["matched", "manual"].includes(r.state)).length}</td>
      <td>${isFin && pfCanUndo(g) ? rowBtn("pfu:" + g.id, L("ยกเลิกการนำเข้า…", "Undo the import…")) : ""}</td></tr>
      ${isFin && pfCanUndo(g) && FIN_ROW === "pfu:" + g.id ? rowForm(6, `<b style="font-weight:600">${L("ยกเลิกการนำเข้า", "Undo the import")} ${g.id}</b><span class="sub">${L("ผลกระทบยอดของรายการในไฟล์กลับเป็นก่อนนำเข้า", "The results of its rows go back to before the import")}</span><input type="text" id="pfu-why" placeholder="${L("เหตุผล", "Reason")}" aria-label="${L("เหตุผล", "Reason")}" style="min-width:220px;flex:1"><button class="btn danger" type="button" data-pfundo="${g.id}">${L("ยกเลิกการนำเข้า", "Undo")}</button>`) : ""}
      ${!g.undone ? g.rows.map((r, i) => r.state === "extra" ? `<tr><td></td><td colspan="4" class="sub">${dotI("warn")}${L("ไม่พบใน Fisko", "Not in Fisko")} · <span class="mono">${esc(r.doc)}</span> · ${fmt(r.amount)} ${L("บาท", "baht")}</td><td>${isFin && !pfClosed(g.t) ? rowBtn(`pfm:${g.id}:${i}`, L("จับคู่เอง…", "Match by hand…")) : ""}</td></tr>
        ${isFin && FIN_ROW === `pfm:${g.id}:${i}` ? rowForm(6, `<label class="sub" for="pfm-p">${L("คำขอที่ตรงกัน", "Matching payment")}</label><select id="pfm-p">${S.payreqs.filter(p => p.status === "approved" && ["none", "diff"].includes(reconState(p))).map(p => `<option value="${p.id}">${p.id} · ${p.contract} · ${fmt(p.amount)}</option>`).join("")}</select><input type="text" id="pfm-why" placeholder="${L("เหตุผลที่จับคู่เอง", "Why it matches")}" aria-label="${L("เหตุผล", "Reason")}" style="min-width:200px;flex:1"><button class="btn primary" type="button" data-pfmatch="${g.id}:${i}">${L("จับคู่", "Match")}</button>`) : ""}` : r.state === "manual" ? `<tr><td></td><td colspan="5" class="sub">${dotI("ok")}${L("จับคู่เอง", "Matched by hand")} · <span class="mono">${esc(r.doc)}</span> → <span class="mono">${esc(r.pay)}</span></td></tr>` : "").join("") : ""}`).join("")}</tbody></table></div></section>` : ""}`;
};
// FR-FC-35: a month that is closed keeps its matching as it is (R-FC-02).
const pfClosed = t => ((S.periods || []).find(p => p.month === String(t).slice(0, 7)) || {}).status === "closed";
// Only the latest import still in force can be undone, and only while its month is open.
const pfCanUndo = g => !g.undone && !pfClosed(g.t) && (S.gfmisFiles || []).find(x => !x.undone) === g;

FIN_BINDS.push(() => {
  const sample = $("#gf-sample");
  if (sample) sample.onclick = () => {
    const todo = S.payreqs.filter(p => p.status === "approved" && ["none", "diff"].includes(reconState(p)));
    GF_ROWS = todo.map((p, i) => ({ pay: p.id, doc: `GF-70-${String(430 + i).padStart(6, "0")}`, amount: i === 0 ? p.amount - 1000 : p.amount, expect: p.amount, date: TODAY, state: i === 0 ? "diff" : "matched" }));
    GF_ROWS.push({ pay: "", doc: "GF-70-000499", amount: 250000, expect: 0, date: TODAY, state: "extra" });
    if (!todo.length) toast(L("ไม่มีรายการอนุมัติที่รอกระทบยอด จึงมีเฉพาะแถวที่ไม่พบในระบบ", "No approved payment is waiting, so the file only has a row that isn't in Fisko"));
    route();
  };
  const go_ = $("#gf-go");
  if (go_) go_.onclick = () => {
    const g = { id: `GF-${FAM_FY}-${String(S.gfmisFiles.length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, rows: GF_ROWS.map(r => ({ pay: r.pay, doc: r.doc, amount: r.amount, date: r.date, state: r.state })) };
    g.prev = {}; GF_ROWS.filter(r => r.pay).forEach(r => { const p = S.payreqs.find(x => x.id === r.pay); g.prev[p.id] = p.recon || null; p.recon = { state: r.state === "matched" ? "matched" : "diff", doc: r.doc, file: g.id, t: g.t, diff: r.amount - r.expect }; });
    S.gfmisFiles.unshift(g); GF_ROWS = null;
    audit(["นำเข้าไฟล์ GFMIS และกระทบยอด", "Imported a GFMIS file and reconciled"], `${g.id} · ${g.rows.length}`);
    commit(); renderShell(); route(); toast(L("นำเข้าไฟล์แล้ว", "File imported"));
  };
  const clr = $("#gf-clear"); if (clr) clr.onclick = () => { GF_ROWS = null; route(); };
  const pfWhy = id => { const w = ($(id) || { value: "" }).value.trim(); if (w.length < CR_WHY_MIN) { toast(L(`ระบุเหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร`, `Give a reason of at least ${CR_WHY_MIN} characters`)); return null; } return w; };
  $$("[data-pfundo]").forEach(b => (b.onclick = () => {
    const g = S.gfmisFiles.find(x => x.id === b.dataset.pfundo), w = pfWhy("#pfu-why"); if (!w) return;
    g.rows.filter(r => r.pay).forEach(r => { const p = S.payreqs.find(x => x.id === r.pay); if (p) p.recon = (g.prev || {})[r.pay] || null; });
    g.undone = { by: me().id, t: nowIso(), why: w }; FIN_ROW = null;
    audit(["ยกเลิกการนำเข้าไฟล์ผลการจ่าย", "Undid a payment-result file import"], `${g.id} · ${w}`); commit(); renderShell(); route(); toast(L("ยกเลิกการนำเข้าแล้ว", "Import undone"));
  }));
  $$("[data-pfmatch]").forEach(b => (b.onclick = () => {
    const [gid, i] = b.dataset.pfmatch.split(":"), g = S.gfmisFiles.find(x => x.id === gid), r = g.rows[Number(i)], p = S.payreqs.find(x => x.id === ($("#pfm-p") || {}).value), w = pfWhy("#pfm-why"); if (!w || !p) return;
    if (!sodCheck("SD-05", [me().id], [p.decided.by, p.decided.holder], p.id)) return;
    (g.prev = g.prev || {})[p.id] = p.recon || null;
    p.recon = { state: r.amount === p.amount ? "matched" : "diff", doc: r.doc, file: g.id, t: nowIso(), diff: r.amount - p.amount, manual: { by: me().id, why: w } }; r.state = "manual"; r.pay = p.id; FIN_ROW = null;
    audit(["จับคู่รายการผลการจ่ายเอง", "Matched a payment-result row by hand"], `${g.id} · ${r.doc} → ${p.id} · ${w}`); commit(); renderShell(); route(); toast(r.amount === p.amount ? L("จับคู่แล้ว ยอดตรงกัน", "Matched · amounts agree") : L("จับคู่แล้ว มีผลต่าง ต้องชี้แจง", "Matched · there is a difference to explain"));
  }));
  $$("[data-rexp]").forEach(b => (b.onclick = () => {
    const p = S.payreqs.find(x => x.id === b.dataset.rexp), note = $("#rn-" + p.id).value.trim();
    if (!note) { toast(L("พิมพ์คำชี้แจงก่อน", "Type an explanation first")); return; }
    if (!sodCheck("SD-05", [me().id], [p.decided.by, p.decided.holder], p.id)) return;
    const was = p.recon.state === "explained" ? p.recon.note : null; p.recon = Object.assign({}, p.recon, { state: "explained", note, by: me().id, edits: was ? [...(p.recon.edits || []), { note: was, t: nowIso() }] : p.recon.edits }); FIN_ROW = null;
    audit(["ชี้แจงผลต่างจากการกระทบยอด", "Explained a reconciliation difference"], `${p.id} · ${note}`);
    commit(); route(); toast(L("บันทึกคำชี้แจงแล้ว", "Explanation saved"));
  }));
});
