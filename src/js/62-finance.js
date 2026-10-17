// Fisko Finance (round 11, light version): commitments and the chain from allocation to payment,
// payment requests with approval, and GFMIS reconciliation by file import (files only, per D-F05).
// Official recording and payment stay in GFMIS; Fisko controls the commitment and matches the result.
let FIN_TAB = "chain", PAY_FORM = null, GF_ROWS = null;
const PAY_ST = { pending: [["รออนุมัติ", "Pending"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"] };
const RECON_ST = { matched: [["ตรงกับ GFMIS", "Matches GFMIS"], "p-ok"], diff: [["ผลต่าง", "Difference"], "p-bad"], explained: [["ชี้แจงแล้ว", "Explained"], "p-info"], none: [["รอไฟล์ GFMIS", "Waiting for a file"], "p-mute"] };
const payPaid = lineId => sumv(S.payreqs.filter(p => p.status === "approved" && famCon(p.contract).line === lineId).map(p => p.amount));
const acceptedValue = lineId => sumv(S.contracts.filter(c => c.line === lineId).flatMap(c => c.phases.filter(phaseAccepted).map(ph => ph.amount)));
const reconState = p => (p.recon ? p.recon.state : "none");
const FIN = {};

FIN.chain = () => {
  const ids = [...new Set([...S.pplan.map(p => p.line), ...S.contracts.map(c => c.line)])];
  const rows = ids.map(id => ({ l: famLine(id), planned: sumv(S.pplan.filter(p => p.line === id).map(p => p.est)), com: famCommitted(id), acc: acceptedValue(id), paid: payPaid(id) }));
  const T = k => sumv(rows.map(r => r[k])), alloc = sumv(rows.map(r => r.l.amount));
  const overdue = S.contracts.flatMap(c => c.phases.filter(ph => !phaseAccepted(ph) && ph.due < TODAY).map(ph => ({ c, ph })));
  const top = rows.slice().sort((a, b) => b.com - a.com)[0];
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("วงเงินจัดสรร (รายการที่มีแผนจัดซื้อ)", "Allocated (lines with a plan)")}</span><span class="v">${mb(alloc)}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("ผูกพันแล้ว (สัญญา)", "Committed (contracts)")}</span><span class="v">${mb(T("com"))}</span><span class="d sub">${fmt(alloc ? T("com") / alloc * 100 : 0, 1)}%</span></div>
    <div class="kpi"><span class="l">${L("ตรวจรับแล้ว", "Accepted")}</span><span class="v">${mb(T("acc"))}</span></div>
    <div class="kpi hl"><span class="l">${L("อนุมัติเบิกจ่ายแล้ว", "Payments approved")}</span><span class="v">${mb(T("paid"))}</span><span class="d" style="color:var(--rail-ink)">${fmt(T("com") ? T("paid") / T("com") * 100 : 0, 1)}% ${L("ของวงเงินผูกพัน", "of committed")}</span></div>
  </section>
  <section class="panel"><header><h2>${L("สายจากวงเงินจัดสรรถึงการเบิกจ่าย", "From allocation to payment")} · ${fyLabel(FAM_FY)}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท · ทุกขั้นอ้างรหัสรายการจัดสรร (M06) เดียวกัน", "M baht · every step refers to the same M06 allocation line")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รายการจัดสรร", "Allocation line")}</th><th class="n">${L("จัดสรร", "Allocated")}</th><th class="n">${L("ในแผนจัดซื้อ", "Planned")}</th><th class="n">${L("ผูกพัน", "Committed")}</th><th class="n">${L("ตรวจรับ", "Accepted")}</th><th class="n">${L("เบิกจ่าย", "Paid")}</th><th style="width:150px">${L("ผูกพันของจัดสรร", "Committed / allocated")}</th><th class="n">${L("ยังไม่ผูกพัน", "Not committed")}</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td><b style="font-weight:600">${esc(tx(r.l.name))}</b><div class="sub">${unitName(r.l.unit)} · <span class="mono">${r.l.id}</span></div></td><td class="n">${mb(r.l.amount)}</td><td class="n">${mb(r.planned)}</td><td class="n">${mb(r.com)}</td><td class="n">${mb(r.acc)}</td><td class="n">${mb(r.paid)}</td>
        <td><div class="bar"><i style="width:${Math.min(100, r.l.amount ? r.com / r.l.amount * 100 : 0)}%"></i></div><span class="sub">${fmt(r.l.amount ? r.com / r.l.amount * 100 : 0, 0)}%</span></td><td class="n">${mb(famHeadroom(r.l.id))}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${mb(alloc)}</td><td class="n">${mb(T("planned"))}</td><td class="n">${mb(T("com"))}</td><td class="n">${mb(T("acc"))}</td><td class="n">${mb(T("paid"))}</td><td></td><td class="n">${mb(sumv(rows.map(r => famHeadroom(r.l.id))))}</td></tr></tfoot></table></div>
    ${top ? `<div class="body"><div class="callout" style="margin:0"><b>${L("ตอบได้ในที่เดียว", "Answered in one place")}</b> ${esc(tx(top.l.name))}: ${L("จัดสรร", "allocated")} ${mb(top.l.amount)} · ${L("ผูกพัน", "committed")} ${mb(top.com)} · ${L("จ่ายแล้ว", "paid")} ${mb(top.paid)} · ${L("ยังไม่ผูกพัน", "not committed")} ${mb(famHeadroom(top.l.id))} ${L("ล้านบาท", "M baht")} · ${overdue.length ? `${overdue.length} ${L("งวดเลยกำหนดและยังไม่ตรวจรับ", "overdue phases are not accepted yet")}` : L("ไม่มีงวดเลยกำหนด", "no overdue phases")}</div></div>` : ""}</section>
  ${overdue.length ? `<section class="panel"><header><h2>${L("งวดที่เลยกำหนดและยังไม่ตรวจรับ", "Overdue phases not yet accepted")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา", "Contract")}</th><th>${L("งวด", "Phase")}</th><th>${L("กำหนด", "Due")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th></tr></thead>
    <tbody>${overdue.map(x => `<tr><td><span class="mono">${x.c.id}</span> ${esc(tx(famPlan(x.c.plan).name))}</td><td>${tx(x.ph.name)}</td><td>${dueText(x.ph.due)}</td><td class="n">${mb(x.ph.amount)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};

FIN.pay = () => {
  const accepted = famAcceptedUnpaid(), viaTxt = onBehalf("exec", "spend"), auth = canSpend(), isFin = ROLE === "fin";
  return `
  ${auth && viaTxt ? `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("คุณกำลังอนุมัติแทนผู้บริหาร", "You are approving on the executive's behalf")}</b><p>${viaTxt.replace(/^ · /, "")} · ${L("ผู้ขอเบิกจ่ายและกรรมการตรวจรับของรายการนั้นอนุมัติไม่ได้ (SD-03, SD-04)", "The payment's requester and the contract's committee members can't approve it (SD-03, SD-04)")}</p></div></div>` : ""}
  ${isFin ? `<section class="panel"><header><h2>${L("ขออนุมัติเบิกจ่าย", "Request a payment")}</h2><span class="sp"></span><span class="sub">${L("ขอได้เฉพาะงวดที่คณะกรรมการตรวจรับครบแล้ว", "Only for phases the committee has fully accepted")}</span></header>
    ${accepted.length ? `<div class="body"><form class="inline-form" id="py-form">
      <div class="f" style="flex:2 1 280px"><label for="py-ph">${L("งวดที่ตรวจรับแล้ว", "Accepted phase")}</label><select id="py-ph">${accepted.map(x => `<option value="${x.c.id}|${x.ph.n}" ${PAY_FORM === x.c.id + "|" + x.ph.n ? "selected" : ""}>${x.c.id} · ${esc(tx(x.c.vendor))} · ${tx(x.ph.name)} · ${mb(x.ph.amount)}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 170px"><label for="py-amt">${L("ยอดที่ขอ (บาท)", "Amount (baht)")}</label><input type="number" id="py-amt" min="1" step="1" required></div>
      <div id="py-gate" style="flex:1 1 100%"></div>
      <button class="btn primary" type="submit">${L("ส่งขออนุมัติ", "Send for approval")}</button></form></div>`
      : `<div class="body sub">${L("ไม่มีงวดที่ตรวจรับแล้วและยังไม่ได้ขอเบิก", "No accepted phase is waiting for a payment request")}</div>`}</section>` : ""}
  <section class="panel"><header><h2>${L("คำขออนุมัติเบิกจ่าย", "Payment requests")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("สัญญา / งวด", "Contract / phase")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th>${L("ผู้ขอ", "Requested by")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${S.payreqs.slice().reverse().map(p => { const c = famCon(p.contract), ph = c.phases.find(x => x.n === p.phase);
        return `<tr><td class="mono">${p.id}</td><td><span class="mono">${c.id}</span> ${esc(tx(c.vendor))}<div class="sub">${tx(ph.name)} · ${esc(tx(famPlan(c.plan).name))}</div></td><td class="n">${mb(p.amount)}</td><td>${esc(userName(p.by))}<div class="sub">${fdate(p.t, true)}</div></td>
          <td>${stTag(PAY_ST, p.status)}${p.decided ? `<div class="sub">${esc(userName(p.decided.by))}${p.decided.via ? ` · ${L("แทน", "for")} ${esc(userName(p.decided.holder))} (${p.decided.via})` : ""}</div>` : ""}</td>
          <td><div class="row" style="flex-wrap:nowrap">${p.status === "pending" && auth ? `<button class="btn primary" type="button" data-pyok="${p.id}">${viaTxt ? L("อนุมัติแทน", "Approve on behalf") : L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-pyno="${p.id}">${L("ไม่อนุมัติ", "Reject")}</button>` : ""}${historyBtn(p.id, p.id)}</div></td></tr>`; }).join("")
        || `<tr><td colspan="6" class="sub">${L("ยังไม่มีคำขอ", "No requests yet")}</td></tr>`}</tbody></table></div></section>`;
};

FIN.recon = () => {
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
          <td>${isFin && st === "diff" ? `<div class="row" style="flex-wrap:nowrap"><input type="text" id="rn-${p.id}" placeholder="${L("คำชี้แจงผลต่าง", "Explain the difference")}" style="min-width:160px"><button class="btn" type="button" data-rexp="${p.id}">${L("บันทึกคำชี้แจง", "Save")}</button></div>` : ""}${historyBtn(p.id, p.id)}</td></tr>`; }).join("")
        || `<tr><td colspan="6" class="sub">${L("ยังไม่มีรายการที่อนุมัติเบิกจ่าย", "No approved payments yet")}</td></tr>`}</tbody></table></div></section>
  ${files.length ? `<section class="panel"><header><h2>${L("ประวัติการนำเข้าไฟล์", "File import log")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("ไฟล์", "File")}</th><th>${L("เวลา", "Time")}</th><th>${L("ผู้นำเข้า", "By")}</th><th class="n">${L("แถว", "Rows")}</th><th class="n">${L("ไม่ตรง", "Not matching")}</th></tr></thead>
    <tbody>${files.map(g => `<tr><td class="mono">${g.id}</td><td class="sub">${fdate(g.t, true)}</td><td>${esc(userName(g.by))}</td><td class="n">${g.rows.length}</td><td class="n">${g.rows.filter(r => r.state !== "matched").length}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};

VIEWS.finance = () => {
  if (!FIN[FIN_TAB]) FIN_TAB = "chain";
  const pend = S.payreqs.filter(p => p.status === "pending").length;
  const tabs = [["chain", L("สายงบประมาณถึงการจ่าย", "Allocation to payment")], ["pay", `${L("ขออนุมัติเบิกจ่าย", "Payments")}${pend ? ` (${pend})` : ""}`], ["recon", L("กระทบยอด GFMIS", "GFMIS reconciliation")]];
  return `
  <div class="head"><div><div class="eyebrow">Fisko Finance · ${L("เวอร์ชันเบา", "light version")}</div><h1>${L("วงเงินผูกพันและการเบิกจ่าย", "Commitments and payments")}</h1>
    <p>${L("ควบคุมวงเงินผูกพันจากสัญญา และกระทบยอดกับ GFMIS การบันทึกบัญชีและการจ่ายเงินทางการยังทำใน GFMIS", "Control commitments from contracts and match results with GFMIS. Official recording and payment stay in GFMIS.")} · ${fyLabel(FAM_FY)}</p></div></div>
  <div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button class="tab ${id === FIN_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === FIN_TAB}" data-fntab="${id}">${l}</button>`).join("")}</div>
  ${FIN[FIN_TAB]()}`;
};

BIND.finance = () => {
  $$("[data-fntab]").forEach(b => (b.onclick = () => { FIN_TAB = b.dataset.fntab; route(); }));
  const pf = $("#py-form");
  if (pf) {
    const fill = () => { const [cid, n] = $("#py-ph").value.split("|"), c = famCon(cid), ph = c.phases.find(x => x.n === Number(n)); $("#py-amt").value = payGate(c, ph).net; $("#py-gate").innerHTML = gateBox(c, ph); };
    $("#py-ph").onchange = fill; fill();
    pf.onsubmit = e => {
      e.preventDefault();
      const [cid, n] = $("#py-ph").value.split("|"), c = famCon(cid), ph = c.phases.find(x => x.n === Number(n)), amount = Math.round(Number($("#py-amt").value)), g = payGate(c, ph);
      if (!g.ok) {
        if (!ph.hold) { ph.hold = { by: me().id, t: nowIso(), fails: g.checks.filter(x => !x.ok).map(x => x.label).join("; ") }; audit(["ประตูเบิกจ่ายพักรายการ", "The payment gate held a request"], `${c.id} ${tx(ph.name)}`); notify(["prochead", "exec"], [`${c.id} ${ph.name[0]} ไม่ผ่านประตูเบิกจ่าย รอปลดข้อยกเว้น`, `${c.id} ${ph.name[1]} did not pass the payment gate and waits for a release`], "prc-contracts"); commit(); }
        toast(L("ไม่ผ่านประตูเบิกจ่าย (R-11): พักเป็นข้อยกเว้นให้หัวหน้าพัสดุปลด", "Payment gate not passed (R-11): held as an exception for release")); return;
      }
      if (amount !== g.net) { toast(L(`ยอดที่ขอต้องเท่ากับยอดงวดหักค่าปรับและส่วนที่ไม่ผ่านตรวจรับ (${fmt(g.net)} บาท)`, `The amount must equal the phase amount less penalty and rejected work (${fmt(g.net)} baht)`)); return; }
      const p = { id: nextId("PY", S.payreqs), contract: c.id, phase: ph.n, amount, by: me().id, status: "pending", t: nowIso(), decided: null, recon: null, gate: { penalty: g.penalty, rejected: g.rejected, released: g.released && !g.pass } };
      S.payreqs.push(p);
      audit(["ขออนุมัติเบิกจ่าย", "Requested a payment approval"], `${p.id} ${c.id}`);
      notify(["exec"], [`คำขอเบิกจ่าย ${p.id} รออนุมัติ`, `Payment request ${p.id} is waiting for approval`], "fnc-pay");
      commit(); renderShell(); route(); toast(L("ส่งขออนุมัติเบิกจ่ายแล้ว", "Sent for approval"));
    };
  }
  const decide = (id, ok) => {
    const p = S.payreqs.find(x => x.id === id), c = famCon(p.contract), au = famAuth();
    if (ok) {
      const actors = sodActors("exec", "spend");
      if (!sodCheck("SD-03", actors, [p.by], p.id)) return;
      if (!sodCheck("SD-04", actors, [...new Set([...c.inspectors, ...phaseSigners(c)])], p.id)) return;
    }
    p.status = ok ? "approved" : "rejected"; p.decided = { by: me().id, holder: au.holder, via: au.via, t: nowIso() };
    audit(ok ? ["อนุมัติเบิกจ่าย", "Approved a payment"] : ["ไม่อนุมัติเบิกจ่าย", "Rejected a payment"], `${p.id} ${c.id}${onBehalf("exec", "spend")}`);
    notify(["fin"], ok ? [`${p.id} อนุมัติแล้ว บันทึกใน GFMIS และนำเข้าไฟล์กระทบยอด`, `${p.id} is approved; record it in GFMIS and import the file to reconcile`] : [`${p.id} ไม่ได้รับอนุมัติ`, `${p.id} was not approved`], "fnc-recon");
    commit(); renderShell(); route(); toast(ok ? L("อนุมัติเบิกจ่ายแล้ว", "Payment approved") : L("ไม่อนุมัติ", "Rejected"));
  };
  $$("[data-pyok]").forEach(b => (b.onclick = () => decide(b.dataset.pyok, true)));
  $$("[data-pyno]").forEach(b => (b.onclick = () => decide(b.dataset.pyno, false)));
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
    GF_ROWS.filter(r => r.pay).forEach(r => { const p = S.payreqs.find(x => x.id === r.pay); p.recon = { state: r.state === "matched" ? "matched" : "diff", doc: r.doc, file: g.id, t: g.t, diff: r.amount - r.expect }; });
    S.gfmisFiles.unshift(g); GF_ROWS = null;
    audit(["นำเข้าไฟล์ GFMIS และกระทบยอด", "Imported a GFMIS file and reconciled"], `${g.id} · ${g.rows.length}`);
    commit(); renderShell(); route(); toast(L("นำเข้าไฟล์แล้ว", "File imported"));
  };
  const clr = $("#gf-clear"); if (clr) clr.onclick = () => { GF_ROWS = null; route(); };
  $$("[data-rexp]").forEach(b => (b.onclick = () => {
    const p = S.payreqs.find(x => x.id === b.dataset.rexp), note = $("#rn-" + p.id).value.trim();
    if (!note) { toast(L("พิมพ์คำชี้แจงก่อน", "Type an explanation first")); return; }
    if (!sodCheck("SD-05", [me().id], [p.decided.by, p.decided.holder], p.id)) return;
    p.recon = Object.assign({}, p.recon, { state: "explained", note, by: me().id });
    audit(["ชี้แจงผลต่างจากการกระทบยอด", "Explained a reconciliation difference"], `${p.id} · ${note}`);
    commit(); route(); toast(L("บันทึกคำชี้แจงแล้ว", "Explanation saved"));
  }));
};
