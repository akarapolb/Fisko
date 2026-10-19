// M05 Budget Submission (round 3): the package of internally approved requests, checked, previewed,
// exported and tracked through the Budget Bureau's review. Planning Division acts; others read.
let SUB_TAB = "checks";
const SUB_TABS = [
  { id: "checks", label: ["ตรวจก่อนส่ง", "Pre-submission checks"] },
  { id: "form", label: ["ตัวอย่างแบบฟอร์ม", "Form preview"] },
  { id: "export", label: ["ส่งออกไฟล์", "Export"] },
  { id: "status", label: ["สถานะและผลพิจารณา", "Status and results"] },
];
const SUB_STEPS = [
  ["preparing", ["เตรียมชุดข้อมูล", "Preparing the package"]], ["submitted", ["ส่งสำนักงบประมาณแล้ว", "Sent to the Budget Bureau"]],
  ["reviewing", ["สำนักงบประมาณพิจารณา", "Budget Bureau reviewing"]], ["result", ["ได้รับผลพิจารณา", "Result received"]], ["closed", ["ส่งต่อการจัดสรร (M06)", "Handed to allocation (M06)"]],
];
const pkg = () => S.requests.filter(r => r.status === "approved" || (r.sub && S.submission.status !== "preparing"));
const subAmt = r => (r.decided != null ? r.decided : r.amount);
function budgetCode(r) {
  const lin = lineage(r.act), act = lin[lin.length - 1];
  return act ? `${S.units[0].code}${unitOf(r.unit).code}-${act.code}` : "—";
}
function subChecks(r) {
  const lin = lineage(r.act), out = [];
  const add = (ok, warnOnly, t, bad) => out.push({ s: ok ? "ok" : warnOnly ? "wa" : "no", t, bad });
  add(lin.length > 0, false, L("รหัสงบประมาณ", "Budget code"), L("ยังไม่ระบุกิจกรรม", "No activity"));
  add(lin.length > 0 && lin[0].lvl === "program", false, L("โครงสร้างแผนงาน", "Programme structure"), L("ไม่อยู่ใต้แผนงาน", "Not under a programme"));
  add(isPersonnel(r) || kpisForAct(r.act).length > 0, true, L("ตัวชี้วัด (M01)", "KPI (M01)"), L("ยังไม่ผูกตัวชี้วัด", "No KPI linked"));
  add(r.items.length && r.items.every(i => i.type && itemTotal(i) > 0), false, L("งบรายจ่าย", "Budget types"), L("มีรายการไม่ครบ", "Incomplete lines"));
  const ys = r.multi && r.years ? Object.values(r.years).reduce((a, b) => a + Number(b || 0), 0) : r.amount;
  add(!r.multi || Math.abs(ys - r.amount) < 1, false, L("ผูกพันหลายปี", "Multi-year"), L("ผลรวมรายปีไม่ตรง", "Years don't add up"));
  const inv = r.items.some(i => i.type === "inv"), spec = r.docs.some(d => SPEC_DOC.test(d));
  add(r.docs.length > 0 && (!inv || spec), false, L("เอกสารประกอบ", "Documents"), L("ขาดเอกสาร", "Missing documents"));
  add(r.decided == null || Math.abs(r.decided - r.amount) < 1, true, L("วงเงินตามมติ", "Resolved amount"), `${L("ใช้วงเงินตามมติ", "Uses the resolved amount")} ${mb(r.decided || 0)} ${L("ลบ.", "M")}`);
  return out;
}

const SUB = {};
SUB.checks = () => {
  const P = pkg(), others = S.requests.filter(r => !P.includes(r));
  const res = P.map(r => ({ r, c: subChecks(r) })), blocked = res.filter(x => x.c.some(c => c.s === "no")).length;
  const heads = res.length ? res[0].c.map(c => c.t) : [];
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("คำขอในชุดส่ง", "Requests in the package")}</span><span class="v">${P.length}</span><span class="d sub">${L("เฉพาะที่ผ่านการเห็นชอบภายในแล้ว", "Internally approved only")}</span></div>
    <div class="kpi"><span class="l">${L("วงเงินรวม", "Total")}</span><span class="v">${mb(P.reduce((s, r) => s + subAmt(r), 0))}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("ผ่านการตรวจ", "Passing checks")}</span><span class="v" style="color:var(--${blocked ? "bad" : "accent"})">${P.length - blocked} / ${P.length}</span></div>
    <div class="kpi"><span class="l">${L("ยังไม่เข้าชุดส่ง", "Not in the package")}</span><span class="v">${others.length}</span><span class="d sub">${L("อยู่ระหว่างจัดทำหรือพิจารณา", "Still in preparation or review")}</span></div>
  </section>
  <section class="panel"><header><h2>${L("ผลตรวจรายคำขอ", "Checks by request")}</h2><span class="sp"></span>${blocked ? tag(`${blocked} ${L("รายการต้องแก้ก่อนส่ง", "must be fixed before sending")}`, "p-bad") : tag(L("พร้อมส่ง", "Ready to send"), "p-ok")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("รหัสงบประมาณ", "Budget code")}</th>${heads.map(h => `<th class="c">${h}</th>`).join("")}</tr></thead>
      <tbody>${res.map(x => `<tr><td><a href="#" data-req="${x.r.id}" class="mono">${x.r.id}</a> ${esc(tx(x.r.name))}<div class="sub">${mb(subAmt(x.r))} ${L("ลบ.", "M")}</div></td><td class="mono">${budgetCode(x.r)}</td>
        ${x.c.map(c => `<td class="c" title="${esc(c.s === "ok" ? "" : c.bad)}"><span class="m ${c.s}" style="display:inline-grid">${c.s === "ok" ? "✓" : c.s === "no" ? "×" : "!"}</span>${c.s === "ok" ? "" : `<div class="sub" style="font-size:11.5px">${esc(c.bad)}</div>`}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="9" class="sub">${L("ยังไม่มีคำขอที่ผ่านการเห็นชอบภายใน", "No internally approved requests yet")}</td></tr>`}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("คำขอที่ยังไม่เข้าชุดส่ง", "Requests not yet in the package")}</h2></header>
    <div class="tbl-wrap"><table><tbody>${others.map(r => `<tr><td><a href="#" data-req="${r.id}" class="mono">${r.id}</a> ${esc(tx(r.name))}</td><td>${pill(r.status)}</td><td class="n">${mb(r.amount)} ${L("ลบ.", "M")}</td></tr>`).join("") || `<tr><td class="sub">${L("ทุกคำขออยู่ในชุดส่งแล้ว", "Every request is in the package")}</td></tr>`}</tbody></table></div></section>`;
};

SUB.form = () => {
  const P = pkg(), progs = (S.structure[FORM_FY] || []).filter(n => n.lvl === "program");
  const byType = r => { const f = r.amount ? subAmt(r) / r.amount : 1, o = {}; BUDGET_TYPES.forEach(t => (o[t.id] = 0)); r.items.forEach(i => (o[i.type] += itemTotal(i) * f)); return o; };
  const sumT = rs => { const o = {}; BUDGET_TYPES.forEach(t => (o[t.id] = rs.reduce((s, r) => s + byType(r)[t.id], 0))); return o; };
  const cells = o => BUDGET_TYPES.map(t => `<td class="n">${o[t.id] ? mb(o[t.id]) : "—"}</td>`).join("") + `<td class="n"><b>${mb(Object.values(o).reduce((a, b) => a + b, 0))}</b></td>`;
  return `
  <section class="panel doc-form"><div class="body">
    <div class="doc-head"><b>${L(`แบบสรุปคำของบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. ${FORM_FY}`, `Summary of FY${FORM_FY} budget requests`)}</b>
      <span>${esc(tx(S.org))}</span><span class="sub">${L("รูปแบบตัวอย่าง ปรับตามแบบฟอร์มที่สำนักงบประมาณกำหนดในปีนั้น · หน่วย ล้านบาท", "Sample layout, to be matched to the Budget Bureau's form for the year · million baht")}</span></div>
    <div class="tbl-wrap"><table class="doc-table"><thead><tr><th>${L("แผนงาน / กิจกรรม / รายการ", "Programme / activity / request")}</th>${BUDGET_TYPES.map(t => `<th class="n">${tx(t.name)}</th>`).join("")}<th class="n">${L("รวม", "Total")}</th></tr></thead>
      <tbody>${progs.map(p => { const rs = P.filter(r => (lineage(r.act)[0] || {}).id === p.id); if (!rs.length) return "";
        return `<tr class="lv1"><td>${p.code} ${esc(tx(p.name))}</td>${cells(sumT(rs))}</tr>` + rs.map(r => `<tr><td style="padding-left:28px"><span class="mono sub">${budgetCode(r)}</span> ${esc(tx(r.name))}${r.multi ? ` <span class="sub">(${L("ผูกพันถึงปี", "committed to")} ${Object.keys(r.years || {}).sort().pop()})</span>` : ""}</td>${cells(byType(r))}</tr>`).join(""); }).join("")}</tbody>
      <tfoot><tr><td>${L("รวมทั้งสิ้น", "Grand total")}</td>${cells(sumT(P))}</tr></tfoot></table></div>
    <div class="row sub" style="margin-top:12px"><span>${L("จัดทำโดย", "Prepared by")} ${esc(tx(me().name))} · ${unitName(me().unit)}</span><span>·</span><span>${fdate(TODAY)}</span></div>
  </div></section>`;
};

SUB.export = () => {
  const ed = ROLE === "plan", ex = S.submission.exports;
  const K = [
    ["xlsx", L("Excel สรุปคำของบประมาณ", "Excel request summary"), L("แยกตามแผนงาน กิจกรรม และงบรายจ่าย", "By programme, activity and budget type")],
    ["pdf", L("PDF แบบฟอร์มพร้อมลงนาม", "PDF form for signature"), L("ตามรูปแบบในแท็บตัวอย่างแบบฟอร์ม", "As shown in the form preview")],
    ["data", L("ไฟล์ข้อมูลสำหรับแลกเปลี่ยน (IF-01)", "Data exchange file (IF-01)"), L("ตามรูปแบบที่สำนักงบประมาณกำหนด · ช่องทางรอยืนยัน", "In the Budget Bureau's format · channel awaiting confirmation")],
  ];
  return `
  <div class="grid3">${K.map(([k, t, d]) => `<section class="panel"><div class="body" style="display:flex;flex-direction:column;gap:10px">
    <b style="font-size:16px">${t}</b><span class="sub">${d}</span>
    <div><button class="btn ${k === "pdf" ? "primary" : ""}" type="button" data-exp="${k}" ${ed ? "" : "disabled"}>${L("สร้างไฟล์", "Create file")}</button></div></div></section>`).join("")}</div>
  <section class="panel"><header><h2>${L("ประวัติการส่งออก", "Export history")}</h2><span class="sp"></span><span class="sub">${L("ต้นแบบนี้จำลองการสร้างไฟล์ ระบบจริงดาวน์โหลดไฟล์ได้ทันที", "Files are simulated here; the real system downloads them")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "Time")}</th><th>${L("ไฟล์", "File")}</th><th>${L("โดย", "By")}</th><th class="n">${L("คำขอ", "Requests")}</th></tr></thead>
      <tbody>${ex.slice().reverse().map(e => `<tr><td class="sub">${fdate(e.t, true)}</td><td class="mono">${esc(e.file)}</td><td>${esc(userName(e.by))}</td><td class="n">${e.count}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">${L("ยังไม่มีการส่งออก", "No exports yet")}</td></tr>`}</tbody></table></div></section>`;
};

SUB.status = () => {
  const sb = S.submission, idx = SUB_STEPS.findIndex(s => s[0] === sb.status), ed = ROLE === "plan", P = pkg();
  const blocked = P.some(r => subChecks(r).some(c => c.s === "no"));
  const batch = sb.batches[sb.batches.length - 1], inBatch = batch ? S.requests.filter(r => r.sub === batch.id) : [];
  let action = "";
  if (ed && sb.status === "preparing") action = `<button class="btn primary" type="button" id="sub-send" ${P.length && !blocked ? "" : "disabled"}>${L("ส่งชุดข้อมูลถึงสำนักงบประมาณ", "Send the package to the Budget Bureau")}</button>
    ${!P.length ? `<span class="sub">${L("ยังไม่มีคำขอในชุดส่ง", "The package is empty")}</span>` : blocked ? `<span class="sub" style="color:var(--bad)">${L("แก้รายการที่ไม่ผ่านในแท็บตรวจก่อนส่งก่อน", "Fix the failing checks first")}</span>` : ""}`;
  if (ed && sb.status === "submitted") action = `<button class="btn" type="button" id="sub-sim1">${L("จำลอง: สำนักงบประมาณรับเรื่องและเริ่มพิจารณา", "Demo: the Budget Bureau starts its review")}</button>`;
  if (ed && sb.status === "reviewing") action = `<button class="btn" type="button" id="sub-sim2">${L("จำลอง: ได้รับผลพิจารณาจากสำนักงบประมาณ", "Demo: results arrive from the Budget Bureau")}</button>`;
  if (ed && sb.status === "result") action = `<button class="btn primary" type="button" id="sub-close" ${sb.revisions.some(v => !v.closed) ? "disabled" : ""}>${L("รับผลและส่งต่อการจัดสรร (M06)", "Accept results and hand to allocation (M06)")}</button>
    ${sb.revisions.some(v => !v.closed) ? `<span class="sub">${L("ตอบคำขอปรับปรุงให้ครบก่อน", "Answer every revision request first")}</span>` : ""}`;
  return `
  <section class="panel"><header><h2>${L(`สถานะการส่งคำของบประมาณ ปี ${FORM_FY}`, `FY${FORM_FY} submission status`)}</h2><span class="sp"></span><span class="sub">${L("กำหนดส่งตามปฏิทิน", "Calendar deadline")} ${fdate(cal("c6").date)}</span></header>
    <div class="body"><ol class="hsteps">${SUB_STEPS.map(([k, n], i) => `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><span class="dot"></span>${tx(n)}</li>`).join("")}</ol>
      <div class="row" style="margin-top:16px">${action || (ed ? "" : `<span class="sub">${L("กองแผนงานเป็นผู้ดำเนินการ", "Planning Division takes these actions")}</span>`)}</div></div></section>
  ${batch ? `<section class="panel"><header><h2>${L("ชุดข้อมูลที่ส่ง", "Package sent")} <span class="mono">${batch.id}</span></h2><span class="sp"></span><span class="sub">${fdate(batch.t, true)} · ${esc(userName(batch.by))} · ${tx(batch.method)}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th class="n">${L("ขอ (ลบ.)", "Requested (M)")}</th><th class="n" style="width:150px">${L("ผลพิจารณา (ลบ.)", "Result (M)")}</th><th class="n">${L("ผลต่าง", "Difference")}</th></tr></thead>
      <tbody>${inBatch.map(r => { const rs = sb.results[r.id]; return `<tr><td><span class="mono sub">${r.id}</span> ${esc(tx(r.name))}</td><td class="n">${mb(subAmt(r))}</td>
        <td class="n">${rs == null ? `<span class="sub">${L("รอผล", "Pending")}</span>` : `<input type="number" min="0" step="0.1" data-resamt="${r.id}" value="${(rs / 1e6).toFixed(2)}" ${ed && sb.status === "result" ? "" : "disabled"} aria-label="${L("ผลพิจารณา", "Result")} ${r.id}">`}</td>
        <td class="n" style="color:var(--${rs != null && rs < subAmt(r) ? "bad" : "ink-2"})">${rs == null ? "—" : fmt((rs - subAmt(r)) / 1e6, 2)}</td></tr>`; }).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${mb(inBatch.reduce((s, r) => s + subAmt(r), 0))}</td><td class="n">${Object.keys(sb.results).length ? mb(inBatch.reduce((s, r) => s + (sb.results[r.id] || 0), 0)) : "—"}</td><td></td></tr></tfoot></table></div></section>` : ""}
  ${sb.revisions.length ? `<section class="panel"><header><h2>${L("คำขอปรับปรุงจากสำนักงบประมาณ", "Revision requests from the Budget Bureau")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("ประเด็น", "Issue")}</th><th>${L("ตอบภายใน", "Reply by")}</th><th>${L("คำตอบ", "Reply")}</th><th></th></tr></thead>
      <tbody>${sb.revisions.map((v, i) => `<tr><td class="mono">${v.req}</td><td>${esc(tx(v.issue))}</td><td>${dueText(v.due)}</td>
        <td>${v.closed ? esc(v.reply) : `<input type="text" id="rv-${i}" ${ed ? "" : "disabled"} placeholder="${L("สรุปคำตอบหรือเอกสารที่ส่ง", "Summary of the reply or documents sent")}" aria-label="${L("คำตอบ", "Reply")}">`}</td>
        <td>${v.closed ? tag(L("ตอบแล้ว", "Answered"), "p-ok") : ed ? `<button class="btn" type="button" data-rvclose="${i}">${L("ส่งคำตอบ", "Send reply")}</button>` : tag(L("รอตอบ", "Open"), "p-warn")}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};

VIEWS.submission = () => `
  <div class="head"><div><div class="eyebrow">M05 · Budget Submission</div><h1>${L("ส่งคำของบประมาณถึงสำนักงบประมาณ", "Submit requests to the Budget Bureau")}</h1>
    <p>${L("ชุดข้อมูลประกอบด้วยคำขอที่ผ่านการเห็นชอบภายในหน่วยงานแล้ว", "The package holds requests already approved inside the agency")}</p></div></div>
  <div class="tabs" role="tablist">${SUB_TABS.map(t => `<button class="tab ${t.id === SUB_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${t.id === SUB_TAB}" data-sbtab="${t.id}">${tx(t.label)}</button>`).join("")}</div>
  ${SUB[SUB_TAB]()}`;

BIND.submission = () => {
  const sb = S.submission;
  $$("[data-sbtab]").forEach(b => (b.onclick = () => { SUB_TAB = b.dataset.sbtab; route(); }));
  $$("[data-req]").forEach(a => (a.onclick = e => { e.preventDefault(); openReq(a.dataset.req); }));
  $$("[data-exp]").forEach(b => (b.onclick = () => {
    const k = b.dataset.exp, n = sb.exports.length + 1;
    const file = k === "xlsx" ? `FY${FORM_FY}_requests_summary_${n}.xlsx` : k === "pdf" ? `FY${FORM_FY}_request_form_${n}.pdf` : `FY${FORM_FY}_budget_exchange_${n}.xml`;
    sb.exports.push({ t: nowIso(), by: me().id, kind: k, file, count: pkg().length });
    audit(["ส่งออกไฟล์คำของบประมาณ", "Exported a request file"], file); commit(); route();
    toast(L(`สร้างไฟล์ ${file} แล้ว (จำลอง)`, `Created ${file} (simulated)`));
  }));
  const send = $("#sub-send");
  if (send) send.onclick = () => {
    const P = pkg(), id = `SUB-${FORM_FY}-${String(sb.batches.length + 1).padStart(2, "0")}`;
    const ch = S.integrations.find(i => i.id === "IF-01");
    sb.batches.push({ id, t: nowIso(), by: me().id, count: P.length, amount: P.reduce((s, r) => s + subAmt(r), 0), method: ch && ch.status === "ok" ? ["ส่งผ่านช่องทาง IF-01", "Sent through IF-01"] : ["ส่งเป็นไฟล์ตามรูปแบบที่กำหนด", "Sent as a file in the prescribed format"] });
    P.forEach(r => (r.sub = id));
    sb.status = "submitted";
    audit(["ส่งชุดคำของบประมาณถึงสำนักงบประมาณ", "Sent the request package to the Budget Bureau"], `${id} · ${P.length}`);
    notify(["exec", "plan"], [`ส่งคำของบประมาณ ${id} ถึงสำนักงบประมาณแล้ว`, `Request package ${id} sent to the Budget Bureau`], "submission");
    commit(); route(); toast(L("ส่งชุดข้อมูลแล้ว", "Package sent"));
  };
  const s1 = $("#sub-sim1"); if (s1) s1.onclick = () => { sb.status = "reviewing"; audit(["บันทึกสถานะ: สำนักงบประมาณเริ่มพิจารณา", "Status: Budget Bureau review started"], "M05"); commit(); route(); };
  const s2 = $("#sub-sim2");
  if (s2) s2.onclick = () => {
    const b = sb.batches[sb.batches.length - 1], rs = S.requests.filter(r => r.sub === b.id);
    rs.forEach(r => (sb.results[r.id] = isPersonnel(r) ? subAmt(r) : Math.round(subAmt(r) * 0.92 / 1e5) * 1e5));
    const target = rs.find(r => r.id === S.story) || rs.find(r => r.items.some(i => i.type === "inv")) || rs[0];
    if (target) sb.revisions.push({ req: target.id, issue: ["ขอรายละเอียดราคากลางและแบบรูปรายการเพิ่มเติม", "Send the standard-price breakdown and detailed drawings"], due: addDays(TODAY, 14), closed: false, reply: "" });
    sb.status = "result";
    audit(["บันทึกผลพิจารณาจากสำนักงบประมาณ", "Recorded the Budget Bureau result"], b.id);
    notify(["plan", "exec", "fin"], ["ได้รับผลพิจารณาคำของบประมาณจากสำนักงบประมาณแล้ว", "The Budget Bureau's result has arrived"], "submission");
    commit(); renderShell(); route();
  };
  $$("[data-resamt]").forEach(inp => (inp.onchange = () => { sb.results[inp.dataset.resamt] = Number(inp.value) * 1e6; audit(["แก้ไขผลพิจารณา", "Edited a result"], inp.dataset.resamt); commit(); route(); }));
  $$("[data-rvclose]").forEach(b => (b.onclick = () => {
    const i = Number(b.dataset.rvclose), v = sb.revisions[i], reply = $("#rv-" + i).value.trim();
    if (!reply) { toast(L("พิมพ์คำตอบก่อนส่ง", "Type a reply first")); return; }
    v.closed = true; v.reply = reply;
    audit(["ตอบคำขอปรับปรุงจากสำนักงบประมาณ", "Answered a Budget Bureau revision request"], v.req); commit(); route();
  }));
  const cl = $("#sub-close");
  if (cl) cl.onclick = () => {
    sb.status = "closed";
    audit(["รับผลพิจารณาและส่งต่อการจัดสรร", "Accepted the result and handed it to allocation"], "M05 → M06");
    notify(["fin"], ["ผลพิจารณางบประมาณพร้อมสำหรับการจัดสรร (M06)", "Budget results are ready for allocation (M06)"], "allocation");
    commit(); route(); toast(L("ส่งต่อการจัดสรรแล้ว · โมดูล M06 อยู่ในรอบที่ 4", "Handed to allocation · M06 arrives in round 4"));
  };
};
