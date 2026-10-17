// Fisko Procurement (round 11, light version): a procurement plan tied to FY2570 allocation lines,
// requisitions, contracts with acceptance phases, and e-GP status by file import (files only, per D-F05).
// The official procurement steps stay in e-GP; Fisko prepares, checks and tracks.
let PROC_TAB = "cases", PLAN_SPLIT = false, PLAN_REQ = null, CT_FROM = null, EGP_ROWS = null;
const FAM_FY = 2570, PHASE_SIGNS = 2;
const famLines = () => (S.allocs[FAM_FY] || { lines: [] }).lines;
const famLine = id => famLines().find(l => l.id === id) || { id, name: ["-", "-"], unit: "", amount: 0, type: "ope" };
const famPlan = id => S.pplan.find(p => p.id === id) || { id, name: ["-", "-"], line: "", est: 0 };
const famReq = id => S.reqn.find(r => r.id === id);
const famCon = id => S.contracts.find(c => c.id === id);
const famCommitted = lineId => sumv(S.contracts.filter(c => c.line === lineId).map(c => c.amount));
const famReserved = lineId => sumv(S.reqn.filter(r => r.status === "approved" && famPlan(r.plan).line === lineId).map(r => r.amount));
const famHeadroom = lineId => famLine(lineId).amount - famCommitted(lineId) - famReserved(lineId);
const phaseAccepted = ph => ph.signs.length >= PHASE_SIGNS;
const phaseSigners = c => c.phases.flatMap(ph => ph.signs.map(s => s.by));
const famPeople = () => S.users.filter(u => u.active && u.role !== "admin" && u.role !== "proc" && u.role !== "prochead");
const PMETHOD = { specific: ["เฉพาะเจาะจง", "Specific selection"], ebid: ["ประกวดราคาอิเล็กทรอนิกส์", "E-bidding"] };
const PLAN_ST = { planned: [["อยู่ในแผน", "Planned"], "p-mute"], requisitioned: [["ขอซื้อแล้ว", "Requisitioned"], "p-info"], contracted: [["ทำสัญญาแล้ว", "Contracted"], "p-ok"] };
const REQ_ST = { pending: [["รออนุมัติ", "Pending"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"], contracted: [["ทำสัญญาแล้ว", "Contracted"], "p-mute"] };
const stTag = (m, k) => tag(tx(m[k][0]), m[k][1]);
// Authority for spend approvals: the executive, or a delegate. Returns who holds the authority and which delegation is used.
function famAuth() {
  if (ROLE === "exec") return { holder: me().id, via: null };
  const d = delegFor("exec", "spend");
  return { holder: d ? d.from : me().id, via: d ? d.id : null };
}
const canSpend = () => acting("exec", "spend");
const nextId = (prefix, list) => `${prefix}-${FAM_FY}-${String(Math.max(0, ...list.map(x => Number(x.id.split("-")[2]) || 0)) + 1).padStart(3, "0")}`;
const famAcceptedUnpaid = () => S.contracts.flatMap(c => c.phases.filter(ph => phaseAccepted(ph) && !S.payreqs.some(p => p.contract === c.id && p.phase === ph.n && p.status !== "rejected")).map(ph => ({ c, ph })));

function famTasks(R) {
  if (!S.pplan) return;
  if (canSpend()) {
    S.reqn.filter(r => r.status === "pending").forEach(r => R(`${L("อนุมัติขอซื้อขอจ้าง", "Approve a requisition")} ${r.id}`, `${mb(r.amount)} ${L("ลบ.", "M")} · ${tx(famPlan(r.plan).name)}`, TODAY, "prc-reqn", "p-warn"));
    S.payreqs.filter(p => p.status === "pending").forEach(p => R(`${L("อนุมัติเบิกจ่าย", "Approve a payment")} ${p.id}`, `${mb(p.amount)} ${L("ลบ.", "M")} · ${p.contract}`, TODAY, "fnc-pay", "p-warn"));
  }
  if (ROLE === "div") S.pplan.filter(p => p.status === "planned" && famLine(p.line).unit === me().unit).forEach(p => R(`${L("ขอซื้อขอจ้างตามแผน", "Raise a requisition")} ${p.id}`, tx(p.name), p.month, "prc-plan", "p-info"));
  if (ROLE === "fin") {
    famAcceptedUnpaid().forEach(x => R(`${L("ขออนุมัติเบิกจ่าย", "Request a payment")} ${x.c.id} ${tx(x.ph.name)}`, `${mb(x.ph.amount)} ${L("ลบ.", "M")}`, TODAY, "fnc-pay", "p-info"));
    S.payreqs.filter(p => p.recon && p.recon.state === "diff").forEach(p => R(`${L("ชี้แจงผลต่างจากไฟล์ GFMIS", "Explain a GFMIS file difference")} ${p.id}`, "", TODAY, "fnc-recon", "p-warn"));
  }
  S.contracts.filter(c => c.inspectors.includes(me().id)).forEach(c => c.phases.filter(ph => !phaseAccepted(ph) && ph.due <= addDays(TODAY, 30) && !ph.signs.some(s => s.by === me().id))
    .forEach(ph => R(`${L("ลงนามตรวจรับงาน", "Sign the acceptance")} ${c.id} ${tx(ph.name)}`, `${mb(ph.amount)} ${L("ลบ.", "M")}`, ph.due, "prc-contracts", "p-info")));
}

const PROC = {};
PROC.plan = () => {
  const P = S.pplan, isProc = isProcRole(), tot = sumv(P.map(p => p.est));
  const lines = famLines().filter(l => l.type === "inv" || l.type === "ope");
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("รายการในแผนจัดซื้อ", "Plan items")}</span><span class="v">${P.length}</span></div>
    <div class="kpi"><span class="l">${L("ประมาณการรวม", "Estimated total")}</span><span class="v">${mb(tot)}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("ขอซื้อแล้ว", "Requisitioned")}</span><span class="v">${P.filter(p => p.status === "requisitioned").length}</span></div>
    <div class="kpi"><span class="l">${L("ทำสัญญาแล้ว", "Contracted")}</span><span class="v">${P.filter(p => p.status === "contracted").length}</span></div>
  </section>
  <section class="panel"><header><h2>${L("แผนจัดซื้อจัดจ้าง", "Procurement plan")} · ${fyLabel(FAM_FY)}</h2><span class="sp"></span><span class="sub">${L("ทุกรายการผูกกับรายการจัดสรรของ M06 · วิธีจัดซื้อตามวงเงินเป็นค่าตัวอย่าง", "Every item links to an M06 allocation line · the method by amount is a sample rule")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Item")}</th><th>${L("วิธี", "Method")}</th><th class="n">${L("ประมาณการ (ลบ.)", "Estimate (M)")}</th><th>${L("กำหนด", "Planned")}</th><th>${L("สถานะ", "Status")}</th><th>e-GP</th><th></th></tr></thead>
      <tbody>${P.map(p => { const l = famLine(p.line), mine = ROLE === "div" && l.unit === me().unit;
        return `<tr><td class="mono">${p.id}</td><td><b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub">${esc(lineLabel(l))} · <span class="mono">${l.id}</span></div></td><td class="sub">${tx(PMETHOD[p.method])}</td>
          <td class="n">${mb(p.est)}</td><td class="sub">${fdate(p.month)}</td><td>${stTag(PLAN_ST, p.status)}</td>
          <td class="sub">${p.egp ? `<span class="mono">${p.egp.no}</span><div>${tx(p.egp.stage)} · ${fdate(p.egp.date)}</div>` : "—"}</td>
          <td><div class="row" style="flex-wrap:nowrap">${mine && p.status === "planned" ? `<button class="btn primary" type="button" data-preq="${p.id}">${L("ขอซื้อขอจ้าง", "Raise requisition")}</button>` : ""}${historyBtn(p.id, p.id)}</div></td></tr>
          ${PLAN_REQ === p.id ? `<tr class="cmt-row"><td colspan="8"><div class="row" style="align-items:flex-end">
            <div class="f" style="flex:0 1 150px"><label for="pr-amt">${L("วงเงิน (ล้านบาท)", "Amount (M baht)")}</label><input type="number" id="pr-amt" min="0.001" step="0.001" value="${(p.est / 1e6).toFixed(3)}"></div>
            <div class="f" style="flex:1 1 240px"><label for="pr-why">${L("เหตุผลความจำเป็น", "Justification")}</label><input type="text" id="pr-why" value="${esc(L("จำเป็นต่อการดำเนินงานตามแผนปีงบประมาณ 2570", "Needed to deliver the FY2570 work plan"))}"></div>
            ${PLAN_SPLIT || splitRisk(p, p.est).risk ? `<div class="f" style="flex:1 1 100%"><label for="pr-split">${L("คำชี้แจงการแตกซื้อ (R-02)", "Split-purchase explanation (R-02)")}</label><input type="text" id="pr-split" placeholder="${esc(L("มีรายการประเภทเดียวกันในหน่วยเดียวกันที่ขอซื้อภายใน " + S.pcfg.splitDays + " วัน และรวมกันเกินเพดานวิธีเฉพาะเจาะจง ระบุเหตุผลที่ต้องแยกซื้อ", "A request of the same kind in the same unit within " + S.pcfg.splitDays + " days brings the total past the specific-method ceiling. Say why they are bought separately"))}"></div>` : ""}
            <span class="sub">${L("วงเงินคงเหลือของรายการจัดสรร", "Room left on the line")} ${mb(famHeadroom(p.line))} ${L("ลบ.", "M")}</span>
            <button class="btn primary" type="button" id="pr-send">${L("ส่งขออนุมัติ", "Send for approval")}</button><button class="btn ghost" type="button" id="pr-cancel">${L("ยกเลิก", "Cancel")}</button></div></td></tr>` : ""}`; }).join("")}</tbody></table></div>
    ${isProc ? `<div class="body"><form class="inline-form" id="pp-form">
      <div class="f" style="flex:2 1 240px"><label for="pp-line">${L("รายการจัดสรร (M06)", "Allocation line (M06)")}</label><select id="pp-line">${lines.map(l => `<option value="${l.id}">${esc(lineLabel(l))} · ${mb(l.amount)}</option>`).join("")}</select></div>
      <div class="f" style="flex:2 1 220px"><label for="pp-name">${L("รายการจัดซื้อจัดจ้าง", "Item to buy")}</label><input type="text" id="pp-name" required></div>
      <div class="f" style="flex:0 1 130px"><label for="pp-est">${L("ประมาณการ (ลบ.)", "Estimate (M)")}</label><input type="number" id="pp-est" min="0.001" step="0.001" required></div>
      <div class="f" style="flex:0 1 160px"><label for="pp-month">${L("กำหนดดำเนินการ", "Planned date")}</label><input type="date" id="pp-month" value="${addDays(TODAY, 60)}" required></div>
      <button class="btn primary" type="submit">+ ${L("เพิ่มในแผน", "Add to plan")}</button></form></div>` : ""}</section>`;
};
PROC.reqn = () => {
  const R = S.reqn, auth = canSpend(), viaTxt = onBehalf("exec", "spend");
  return `
  ${auth && viaTxt ? `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("คุณกำลังอนุมัติแทนผู้บริหาร", "You are approving on the executive's behalf")}</b><p>${viaTxt.replace(/^ · /, "")} · ${L("ระบบตรวจกฎแยกหน้าที่กับตัวคุณและกับผู้มอบอำนาจ", "Duty-separation rules are checked against you and against the person who delegated")}</p></div></div>` : ""}
  <section class="panel"><header><h2>${L("ใบขอซื้อขอจ้าง", "Requisitions")}</h2><span class="sp"></span><span class="sub">${L("อนุมัติได้เมื่อไม่เกินวงเงินคงเหลือของรายการจัดสรร และผู้ขอไม่ใช่ผู้อนุมัติ (SD-01)", "Approved only within the room left on the line, and never by the requester (SD-01)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการในแผน", "Plan item")}</th><th>${L("ผู้ขอ", "Requester")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th class="n">${L("คงเหลือบนรายการ (ลบ.)", "Room on line (M)")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${R.slice().reverse().map(r => { const p = famPlan(r.plan);
        return `<tr><td class="mono">${r.id}</td><td><b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub"><span class="mono">${p.id}</span> · ${esc(tx(r.why))}</div></td><td>${esc(userName(r.by))}<div class="sub">${fdate(r.t, true)}</div></td>
          <td class="n">${mb(r.amount)}</td><td class="n">${mb(famHeadroom(p.line))}</td>
          <td>${stTag(REQ_ST, r.status)}${r.decided ? `<div class="sub">${esc(userName(r.decided.by))}${r.decided.via ? ` · ${L("แทน", "for")} ${esc(userName(r.decided.holder))} (${r.decided.via})` : ""}</div>` : ""}</td>
          <td><div class="row" style="flex-wrap:nowrap">
            ${r.status === "pending" && auth ? `<button class="btn primary" type="button" data-rqok="${r.id}">${viaTxt ? L("อนุมัติแทน", "Approve on behalf") : L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-rqno="${r.id}">${L("ไม่อนุมัติ", "Reject")}</button>` : ""}
            ${r.status === "approved" && isProcRole() ? `<button class="btn" type="button" data-rqcase="${caseByPlan(r.plan) ? caseByPlan(r.plan).id : ""}">${L("เปิดแฟ้มจัดซื้อ", "Open the case")}</button>` : ""}${historyBtn(r.id, r.id)}</div></td></tr>`; }).join("")
        || `<tr><td colspan="7" class="sub">${L("ยังไม่มีใบขอซื้อขอจ้าง", "No requisitions yet")}</td></tr>`}</tbody></table></div></section>`;
};
function phaseSignText(c, ph) {
  return `${ph.signs.map(s => esc(userName(s.by))).join(", ") || "—"} <span class="sub">(${ph.signs.length}/${PHASE_SIGNS})</span>`;
}
PROC.contracts = () => {
  const isProc = isProcRole(), open = S.cases.filter(c => caseState(c) === 8), me_ = me().id, people = famPeople().filter(u => u.id !== me_);
  const sel = open.find(c => c.id === CT_FROM) || open[0], judges = sel ? caseJudges(sel) : [];
  const defs = [S.users.find(u => u.role === "plan" && u.primary), S.users.find(u => u.role === "div" && u.primary)].filter(Boolean).map(u => u.id).filter(id => !judges.includes(id));
  return `
  ${isProc && open.length ? `<section class="panel"><header><h2>${L("สร้างสัญญา", "Create a contract")}</h2><span class="sp"></span><span class="sub">${L("วงเงินสัญญาเป็นภาระผูกพันของรายการจัดสรรทันที · สร้างได้เมื่อแฟ้มอยู่ขั้นทำสัญญา วงเงินไม่เกินราคาที่ประกาศ · กรรมการตรวจรับอย่างน้อย 2 คน (1 คนได้ถ้าไม่เกิน " + fmt(S.pcfg.singleInspectorMax) + " บาท) ห้ามซ้ำผู้พิจารณาผล (SD-06) และห้ามเป็นผู้จัดซื้อ (SD-02)", "The contract amount commits the allocation line at once · only for a case at the contracting step, within the announced price · at least 2 committee members (1 if up to " + fmt(S.pcfg.singleInspectorMax) + " baht), none from the evaluation committee (SD-06) and not the procurement officer (SD-02)")}</span></header>
    <div class="body"><form id="ct-form" style="display:flex;flex-direction:column;gap:12px">
      <div class="inline-form">
        <div class="f" style="flex:2 1 260px"><label for="ct-req">${L("แฟ้มจัดซื้อที่พร้อมทำสัญญา", "Case ready for a contract")}</label><select id="ct-req">${open.map(c => `<option value="${c.id}" ${sel && c.id === sel.id ? "selected" : ""}>${c.id} · ${esc(caseName(c))} · ${mb(c.award.price)}</option>`).join("")}</select></div>
        <div class="f" style="flex:1 1 200px"><label for="ct-vendor">${L("คู่สัญญา", "Supplier")}</label><input type="text" id="ct-vendor" value="${sel ? esc(tx(sel.award.winner)) : ""}" required></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-no">${L("เลขที่สัญญา", "Contract no.")}</label><input type="text" id="ct-no" value="CT-70/${String(S.contracts.length + 1).padStart(3, "0")}" required></div>
        <div class="f" style="flex:0 1 160px"><label for="ct-date">${L("วันที่ลงนาม", "Signed on")}</label><input type="date" id="ct-date" value="${TODAY}" required></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-amt">${L("วงเงินสัญญา (ลบ.)", "Amount (M)")}</label><input type="number" id="ct-amt" min="0.001" step="0.001" value="${sel ? (sel.award.price / 1e6).toFixed(3) : ""}" required></div>
        <div class="f" style="flex:0 1 100px"><label for="ct-ph">${L("จำนวนงวด", "Phases")}</label><select id="ct-ph">${[1, 2, 3, 4].map(n => `<option ${n === 3 ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
      <fieldset style="border:1px solid var(--line);border-radius:8px;padding:8px 12px"><legend class="sub">${L("คณะกรรมการตรวจรับ", "Acceptance committee")}</legend>
        <div class="row">${people.map(u => `<label class="field-inline"><input type="checkbox" name="ct-insp" value="${u.id}" ${defs.includes(u.id) ? "checked" : ""}> ${esc(tx(u.name))} <span class="sub">· ${tx(ROLES[u.role])}</span></label>`).join("")}</div></fieldset>
      <div><button class="btn primary" type="submit">${L("สร้างสัญญา", "Create contract")}</button></div></form></div></section>`
    : isProc ? `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("ยังไม่มีแฟ้มที่พร้อมทำสัญญา", "No case is ready for a contract")}</b><p>${L("แฟ้มที่ประกาศผู้ชนะและพ้นกำหนดอุทธรณ์แล้วจะปรากฏที่นี่", "Cases with a winner and a finished appeal period will appear here")}</p></div></div>` : ""}
  ${S.contracts.slice().reverse().map(conPanel).join("")
    || `<section class="panel"><div class="body sub">${L("ยังไม่มีสัญญา", "No contracts yet")}</div></section>`}`;
};
PROC.egp = () => {
  const log = S.egpImports || [];
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("รับสถานะจาก e-GP เป็นไฟล์", "e-GP status comes in as a file")}</b>
    <p>${L("ระหว่างรอยืนยันช่องทางเชื่อมต่อ (ประเด็น D-F05) ใช้ไฟล์ที่ส่งออกจาก e-GP ระบบตรวจรายการกับแผนจัดซื้อก่อนนำเข้า รายการที่ไม่พบจะไม่ถูกนำเข้า", "Until the access channel is confirmed (decision D-F05), a file exported from e-GP is used. Rows are checked against the plan first and unknown ones are left out.")}</p></div></div>
  <section class="panel"><header><h2>${L("นำเข้าไฟล์สถานะ e-GP", "Import an e-GP status file")}</h2><span class="sp"></span>${isProcRole() ? `<button class="btn" type="button" id="egp-sample">${L("สร้างไฟล์ตัวอย่าง", "Create a sample file")}</button>` : `<span class="sub">${L("เจ้าหน้าที่พัสดุนำเข้า", "Procurement officers import")}</span>`}</header>
    ${EGP_ROWS ? `<div class="tbl-wrap"><table><thead><tr><th>plan</th><th>egp_no</th><th>${L("ขั้นตอน", "Stage")}</th><th>${L("วันที่", "Date")}</th><th>${L("ผลตรวจ", "Check")}</th></tr></thead>
      <tbody>${EGP_ROWS.map(r => `<tr><td class="mono">${esc(r.plan)}</td><td class="mono">${esc(r.no)}</td><td>${tx(r.stage)}</td><td>${fdate(r.date)}</td><td>${r.ok ? tag(L("พร้อมนำเข้า", "Ready"), "p-ok") : tag(L("ไม่พบรายการในแผน", "Not in the plan"), "p-bad")}</td></tr>`).join("")}</tbody></table></div>
      <div class="body row"><button class="btn primary" type="button" id="egp-go" ${EGP_ROWS.some(r => r.ok) ? "" : "disabled"}>${L("นำเข้า", "Import")} ${EGP_ROWS.filter(r => r.ok).length} ${L("รายการ", "rows")}</button><button class="btn ghost" type="button" id="egp-clear">${L("ล้าง", "Clear")}</button></div>` : `<div class="body sub">${L("ยังไม่ได้เลือกไฟล์", "No file chosen")}</div>`}</section>
  ${log.length ? `<section class="panel"><header><h2>${L("ประวัติการนำเข้า", "Import log")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("เวลา", "Time")}</th><th>${L("ผู้นำเข้า", "By")}</th><th class="n">${L("นำเข้า", "Imported")}</th><th class="n">${L("ข้าม", "Skipped")}</th></tr></thead>
    <tbody>${log.map(g => `<tr><td class="mono">${g.id}</td><td class="sub">${fdate(g.t, true)}</td><td>${esc(userName(g.by))}</td><td class="n">${g.ok}</td><td class="n">${g.bad}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};

VIEWS.procurement = () => {
  if (!PROC[PROC_TAB]) PROC_TAB = "cases";
  const tabs = [["cases", L("แฟ้มจัดซื้อ", "Case files")], ["plan", L("แผนจัดซื้อ", "Procurement plan")], ["reqn", `${L("ใบขอซื้อขอจ้าง", "Requisitions")}${S.reqn.filter(r => r.status === "pending").length ? ` (${S.reqn.filter(r => r.status === "pending").length})` : ""}`], ["contracts", L("สัญญาและงวดงาน", "Contracts and phases")], ["egp", L("ไฟล์จาก e-GP", "e-GP file")], ["analytics", L("วิเคราะห์", "Analytics")], ["flags", L("สัญญาณเตือน", "Red flags")], ["ocds", L("ส่งออก OCDS", "OCDS export")]];
  return `
  <div class="head"><div><div class="eyebrow">Fisko Procurement · ${L("เวอร์ชันเบา", "light version")}</div><h1>${L("จัดซื้อจัดจ้าง", "Procurement")}</h1>
    <p>${L("เตรียมและติดตามการจัดซื้อที่ผูกกับรายการจัดสรร ขั้นตอนทางการยังทำใน e-GP", "Prepare and track procurement tied to allocation lines. The official steps stay in e-GP.")} · ${fyLabel(FAM_FY)}</p></div></div>
  <div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button class="tab ${id === PROC_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === PROC_TAB}" data-prtab="${id}">${l}</button>`).join("")}</div>
  ${PROC[PROC_TAB]()}`;
};

BIND.procurement = () => {
  $$("[data-prtab]").forEach(b => (b.onclick = () => { PROC_TAB = b.dataset.prtab; route(); }));
  $$("[data-preq]").forEach(b => (b.onclick = () => { PLAN_REQ = PLAN_REQ === b.dataset.preq ? null : b.dataset.preq; route(); }));
  const cancel = $("#pr-cancel"); if (cancel) cancel.onclick = () => { PLAN_REQ = null; PLAN_SPLIT = false; route(); };
  const send = $("#pr-send");
  if (send) send.onclick = () => {
    const p = famPlan(PLAN_REQ), amount = Math.round(Number($("#pr-amt").value) * 1e6 / 1e3) * 1e3, why = $("#pr-why").value.trim();
    if (!(amount > 0)) { toast(L("ใส่วงเงินก่อน", "Enter an amount")); return; }
    if (amount > famHeadroom(p.line)) { toast(L(`เกินวงเงินคงเหลือของรายการจัดสรร (${mb(famHeadroom(p.line))} ลบ.)`, `More than the room left on the line (${mb(famHeadroom(p.line))} M)`)); return; }
    const sp = splitRisk(p, amount), splitWhy = ($("#pr-split") ? $("#pr-split").value.trim() : "");
    if (sp.risk && splitWhy.length < 10) { PLAN_SPLIT = true; route(); toast(L(`ระบบพบรายการประเภทเดียวกันในหน่วยเดียวกัน รวม ${fmt(sp.total)} บาท เกินเพดานวิธีเฉพาะเจาะจง ต้องชี้แจง`, `Similar requests in the same unit total ${fmt(sp.total)} baht, above the specific-method ceiling. An explanation is needed`)); return; }
    const r = { id: nextId("RQ", S.reqn), plan: p.id, by: me().id, amount, why: [why || "-", why || "-"], status: "pending", t: nowIso(), decided: null };
    if (sp.risk) r.splitWhy = splitWhy;
    S.reqn.push(r); p.status = "requisitioned"; PLAN_REQ = null; PLAN_SPLIT = false;
    caseOnRaise(p, r);
    if (sp.risk) { audit(["ชี้แจงการแตกซื้อ", "Explained a split purchase"], `${r.id} ${p.id}`); const c = caseByPlan(p.id); if (c) caseLog(c, "split", splitWhy); notify(["prochead", "audit"], [`ใบขอซื้อ ${r.id} เข้าข่ายแตกซื้อ มีคำชี้แจง`, `Requisition ${r.id} may be a split purchase; an explanation was given`], "prc-reqn"); }
    audit(["ขอซื้อขอจ้าง", "Raised a requisition"], `${r.id} ${p.id}`);
    notify(["exec"], [`ใบขอซื้อขอจ้าง ${r.id} รออนุมัติ`, `Requisition ${r.id} is waiting for approval`], "prc-reqn");
    commit(); renderShell(); route(); toast(L("ส่งขออนุมัติแล้ว", "Sent for approval"));
  };
  const pf = $("#pp-form");
  if (pf) pf.onsubmit = e => {
    e.preventDefault();
    const est = Math.round(Number($("#pp-est").value) * 1e6 / 1e3) * 1e3, nm = $("#pp-name").value.trim();
    const p = { id: nextId("PP", S.pplan), line: $("#pp-line").value, name: [nm, nm], est, method: est <= 5e5 ? "specific" : "ebid", month: $("#pp-month").value, by: me().id, status: "planned", egp: null };
    S.pplan.push(p);
    audit(["เพิ่มรายการในแผนจัดซื้อ", "Added a procurement plan item"], `${p.id} ${nm}`); commit(); route(); toast(L("เพิ่มในแผนแล้ว", "Added to the plan"));
  };
  const decide = (id, ok) => {
    const rq = famReq(id), p = famPlan(rq.plan), au = famAuth();
    if (ok) {
      if (!sodCheck("SD-01", sodActors("exec", "spend"), [rq.by], rq.id)) return;
      if (rq.amount > famHeadroom(p.line)) { toast(L(`เกินวงเงินคงเหลือของรายการจัดสรร (${mb(famHeadroom(p.line))} ลบ.)`, `More than the room left on the line (${mb(famHeadroom(p.line))} M)`)); return; }
    }
    rq.status = ok ? "approved" : "rejected"; rq.decided = { by: me().id, holder: au.holder, via: au.via, t: nowIso() };
    if (!ok) p.status = "planned";
    caseOnDecide(p, rq, ok);
    audit(ok ? ["อนุมัติขอซื้อขอจ้าง", "Approved a requisition"] : ["ไม่อนุมัติขอซื้อขอจ้าง", "Rejected a requisition"], `${rq.id} ${p.id}${onBehalf("exec", "spend")}`);
    notify(ok ? ["proc", "div"] : ["div"], ok ? [`ใบขอซื้อ ${rq.id} อนุมัติแล้ว จัดทำสัญญาได้`, `Requisition ${rq.id} is approved; a contract can be created`] : [`ใบขอซื้อ ${rq.id} ไม่ได้รับอนุมัติ`, `Requisition ${rq.id} was not approved`], "prc-reqn");
    commit(); renderShell(); route(); toast(ok ? L("อนุมัติแล้ว", "Approved") : L("ไม่อนุมัติ", "Rejected"));
  };
  $$("[data-rqok]").forEach(b => (b.onclick = () => decide(b.dataset.rqok, true)));
  $$("[data-rqno]").forEach(b => (b.onclick = () => decide(b.dataset.rqno, false)));
  $$("[data-rqcase]").forEach(b => (b.onclick = () => { CASE_OPEN = b.dataset.rqcase; PROC_TAB = "cases"; route(); }));
  const cf = $("#ct-form");
  if (cf) {
    $("#ct-req").onchange = e => { CT_FROM = e.target.value; route(); };
    cf.onsubmit = e => {
      e.preventDefault();
      const cs = caseOf($("#ct-req").value), rq = famReq(cs.reqn), insp = $$('input[name="ct-insp"]:checked').map(x => x.value), amount = Math.round(Number($("#ct-amt").value) * 1e6 / 1e3) * 1e3;
      if (caseState(cs) !== 8) { toast(L("แฟ้มยังไม่ถึงขั้นทำสัญญา", "The case isn't at the contracting step")); return; }
      if (!(amount > 0) || amount > cs.award.price || amount > rq.amount) { toast(L("วงเงินสัญญาต้องไม่เกินราคาที่ประกาศและวงเงินในใบขอซื้อ", "The contract amount can't exceed the announced price or the requisition amount")); return; }
      if (insp.length < (amount <= S.pcfg.singleInspectorMax ? 1 : 2)) { toast(L("ต้องมีกรรมการตรวจรับอย่างน้อย 2 คน", "Choose at least 2 committee members")); return; }
      if (!sodCheck("SD-02", [me().id], insp, `${rq.id}`)) return;
      if (!sodCheck("SD-06", insp, caseJudges(cs), `${cs.id}`)) return;
      const p = famPlan(rq.plan), n = Number($("#ct-ph").value), signed = $("#ct-date").value, share = amount / n; let left = amount;
      const phases = Array.from({ length: n }, (_, i) => { const a = i < n - 1 ? Math.round(share / 1e3) * 1e3 : left; left -= a; return { n: i + 1, name: [`งวดที่ ${i + 1}`, `Phase ${i + 1}`], due: addDays(signed, 45 * (i + 1)), amount: a, signs: [] }; });
      const c = { id: nextId("CT", S.contracts), reqn: rq.id, plan: p.id, line: p.line, vendor: [$("#ct-vendor").value.trim(), $("#ct-vendor").value.trim()], no: $("#ct-no").value.trim(), signed, amount, by: me().id, inspectors: insp, status: "active", phases };
      S.contracts.push(c); rq.status = "contracted"; p.status = "contracted"; CT_FROM = null; caseOnContract(cs, c);
      audit(["สร้างสัญญา", "Created a contract"], `${c.id} ${rq.id}`);
      notify(["fin", "exec"], [`สัญญา ${c.id} ผูกพันวงเงิน ${mb(amount)} ล้านบาท`, `Contract ${c.id} commits ${mb(amount)} M`], "fnc-chain");
      commit(); renderShell(); route(); toast(L("สร้างสัญญาแล้ว · วงเงินผูกพันบนรายการจัดสรรแล้ว", "Contract created · the allocation line is committed"));
    };
  }
  $$("[data-ccsave]").forEach(b => (b.onclick = () => {
    const c = famCon(b.dataset.ccsave), insp = $$(`input[name="cc-${c.id}"]:checked`).map(x => x.value);
    if (insp.length < (c.amount <= S.pcfg.singleInspectorMax ? 1 : 2)) { toast(L("ต้องมีกรรมการตรวจรับอย่างน้อย 2 คน", "Choose at least 2 committee members")); return; }
    if (!sodCheck("SD-02", [me().id], insp, c.id)) return;
    const cs = caseByPlan(c.plan); if (cs && !sodCheck("SD-06", insp, caseJudges(cs), c.id)) return;
    c.inspectors = insp; audit(["เปลี่ยนกรรมการตรวจรับ", "Changed the acceptance committee"], c.id); commit(); route(); toast(L("บันทึกกรรมการแล้ว", "Committee saved"));
  }));
  const sample = $("#egp-sample");
  if (sample) sample.onclick = () => {
    const pick = S.pplan.filter(p => p.status !== "contracted").slice(0, 2);
    EGP_ROWS = pick.map((p, i) => ({ plan: p.id, no: `EGP-70-${String(110 + i)}`, stage: i ? [["ประกาศเชิญชวน", "Invitation"], ["ประกาศผู้ชนะ", "Winner announced"]][0] : ["ประกาศผู้ชนะ", "Winner announced"], date: TODAY, ok: true }));
    EGP_ROWS.push({ plan: "PP-2570-999", no: "EGP-70-199", stage: ["ประกาศเชิญชวน", "Invitation"], date: TODAY, ok: false });
    route();
  };
  const go_ = $("#egp-go");
  if (go_) go_.onclick = () => {
    const ok = EGP_ROWS.filter(r => famPlan(r.plan).line !== "" && r.ok);
    ok.forEach(r => { famPlan(r.plan).egp = { no: r.no, stage: r.stage, date: r.date }; const cs = caseByPlan(r.plan); if (cs && cs.egp) { cs.egp.no = r.no; cs.egp.stage = r.stage; caseLog(cs, "egp", `${r.no} · ${tx(r.stage)}`); } });
    const g = { id: `EG-${FAM_FY}-${String(S.egpImports.length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, ok: ok.length, bad: EGP_ROWS.length - ok.length };
    S.egpImports.unshift(g); EGP_ROWS = null;
    audit(["นำเข้าไฟล์สถานะ e-GP", "Imported an e-GP status file"], `${g.id} · ${g.ok}`); commit(); route(); toast(L("นำเข้าแล้ว", "Imported"));
  };
  const clr = $("#egp-clear"); if (clr) clr.onclick = () => { EGP_ROWS = null; route(); };
};
