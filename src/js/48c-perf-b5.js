// Fisko Budget round B5: results (M08). Budget design chapter 6.5.
// - Quarterly reports with deadlines (FR-B-35, BR-18: 15 days after each quarter, annual report 45 days after
//   the year), results with problems and fixes, evidence that the auditor certifies (FR-B-36).
// - Cost per output against the plan and last year, the 3E view (FR-B-37).
// - Evaluation at three moments plus impact for chosen projects (FR-B-38, section 46).
// - Recommendations to act on with deadlines (FR-B-39, section 48) and a public summary (FR-B-40, section 47).
// Data year: FY2569, the year shown in M07 and M08.
PERF_TABS.push({ id: "quarter", label: ["รายงานรายไตรมาส", "Quarterly reports"] }, { id: "cost", label: ["ต้นทุนต่อผลผลิต", "Cost per output"] }, { id: "stages", label: ["ประเมิน 3 จังหวะ", "Three-stage evaluation"] }, { id: "recs", label: ["ข้อเสนอแนะ", "Recommendations"] }, { id: "public", label: ["เผยแพร่", "Public page"] });
const QR_ROUNDS = () => [
  { id: "Q1", label: L("ไตรมาส 1 (ต.ค.–ธ.ค. 2568)", "Q1 (Oct–Dec 2025)"), end: "2025-12-31", days: 15 },
  { id: "Q2", label: L("ไตรมาส 2 (ม.ค.–มี.ค. 2569)", "Q2 (Jan–Mar 2026)"), end: "2026-03-31", days: 15 },
  { id: "Q3", label: L("ไตรมาส 3 (เม.ย.–มิ.ย. 2569)", "Q3 (Apr–Jun 2026)"), end: "2026-06-30", days: 15 },
  { id: "Q4", label: L("ไตรมาส 4 (ก.ค.–ก.ย. 2569)", "Q4 (Jul–Sep 2026)"), end: "2026-09-30", days: 15 },
  { id: "Y", label: L("รายงานประจำปี 2569", "Annual report FY2569"), end: "2026-09-30", days: 45 },
].map(x => Object.assign(x, { due: addDays(x.end, x.days) }));
let QR_ROUND = "Q4", QR_UNIT = null;
const PERF_BIND_B5 = {};
const qrUnits = () => [...new Set(Object.values(S.perf.outputs).length ? S.dash.projects.map(p => p.unit) : [])];
const qrItems = u => S.dash.projects.filter(p => p.unit === u && S.perf.outputs[p.id]).map(p => ({ id: p.id, o: S.perf.outputs[p.id], p }));
const qrOf = (rid, u) => ((S.qrep || {})[rid] || {})[u];
const QR_ST = { draft: [["ร่าง", "Draft"], "p-mute"], submitted: [["ส่งแล้ว", "Submitted"], "p-info"], accepted: [["กองแผนรับแล้ว", "Accepted"], "p-ok"], returned: [["ส่งกลับ", "Returned"], "p-bad"] };

PERF.quarter = () => {
  const R = QR_ROUNDS(), rd = R.find(x => x.id === QR_ROUND) || R[3], units = qrUnits(), past = TODAY > rd.due;
  const myU = unitRole() ? me().unit : null, sel = myU || QR_UNIT;
  const rows = units.map(u => { const q = qrOf(rd.id, u), st = q ? q.status : null, late = (!q || q.status === "draft") && past, lateSub = q && q.t && q.t.slice(0, 10) > rd.due;
    return `<tr class="click" data-qru="${u}" tabindex="0"><td>${unitName(u)}</td><td>${st ? tag(tx(QR_ST[st][0]), QR_ST[st][1]) : tag(L("ยังไม่เริ่ม", "Not started"), "p-mute")}${late ? ` ${tag(L("เลยกำหนด", "Late"), "p-bad")}` : ""}</td><td class="sub">${q && q.t ? fdate(q.t) + (lateSub ? ` · ${L("ส่งช้า", "late")}` : "") : "–"}</td><td class="sub">${q && (q.evidence || []).length ? `${q.evidence.length} ${L("ไฟล์", "files")}${q.certified ? ` · ${L("รับรองแล้ว", "certified")}` : ""}` : "–"}</td></tr>`; }).join("");
  const done = units.filter(u => ["submitted", "accepted"].includes((qrOf(rd.id, u) || {}).status)).length;
  return `<section class="panel"><header>${chipIco("cal", "info")}<h2>${L("รอบรายงาน", "Reporting round")}</h2><span class="sp"></span><span class="mono sub">BR-18 · ${L("ข้อ 34", "clause 34")}</span></header>
      <div class="body"><div class="seg" role="group" aria-label="${L("รอบรายงาน", "Round")}">${R.map(x => `<button type="button" data-qrr="${x.id}" class="${x.id === rd.id ? "on" : ""}">${x.id === "Y" ? L("ประจำปี", "Annual") : x.id}</button>`).join("")}</div>
        <div class="row" style="margin-top:10px;gap:14px;flex-wrap:wrap"><b>${rd.label}</b><span>${L("กำหนดส่ง", "Due")} ${fdate(rd.due)} (${rd.days} ${L("วันหลังสิ้นงวด", "days after the period")})</span>${dueText(rd.due)}<span class="sub">${done}/${units.length} ${L("หน่วยงานส่งแล้ว", "units have reported")}</span></div></div></section>
    <div class="grid2">
      <section class="panel"><header><h2>${L("สถานะรายหน่วยงาน", "Status by unit")}</h2></header>
        <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ส่งเมื่อ", "Sent")}</th><th>${L("หลักฐาน", "Evidence")}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      ${sel ? qrForm(rd, sel) : `<section class="panel"><div class="body sub">${L("เลือกหน่วยงานเพื่อดูรายงาน", "Pick a unit to see its report")}</div></section>`}</div>`;
};
function qrForm(rd, u) {
  const q = qrOf(rd.id, u) || { status: null, items: {}, evidence: [] }, items = qrItems(u);
  const ed = unitRole() && me().unit === u && (!q.status || q.status === "draft" || q.status === "returned") && rd.id !== "Q1" && rd.id !== "Q2" && rd.id !== "Q3";
  const pl = ROLE === "plan" && q.status === "submitted", au = ROLE === "audit" && (q.evidence || []).length && !q.certified;
  const val = (id, k) => { const it = (q.items || {})[id]; if (it && it[k] != null) return it[k]; if (k === "result" && rd.id === "Q2") return S.perf.outputs[id].result; return ""; };
  return `<section class="panel"><header><h2>${unitName(u)} · ${rd.id === "Y" ? L("ประจำปี", "Annual") : rd.id}</h2><span class="sp"></span>${q.status ? tag(tx(QR_ST[q.status][0]), QR_ST[q.status][1]) : ""}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:12px">
      ${items.map(({ id, o, p }) => `<div class="qr-item"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><b>${esc(tx(o.name))}</b><span class="sub">${L("เป้า", "Target")} ${fmtv(o.target)} ${tx(o.unit)} · ${L("ใช้จ่าย", "Spent")} ${fmt(p.actual, 1)}/${fmt(p.plan, 1)} ${L("ลบ.", "M")}</span></div>
        <div class="form-grid"><div class="f"><label for="qr-r-${id}">${L("ผล (ปริมาณ)", "Result (quantity)")}</label><input type="number" step="any" id="qr-r-${id}" data-qr="${id}" data-k="result" value="${val(id, "result")}" ${ed ? "" : "disabled"}></div>
          <div class="f"><label for="qr-p-${id}">${L("ปัญหาอุปสรรค", "Problems")}</label><input type="text" id="qr-p-${id}" data-qr="${id}" data-k="problem" value="${esc(val(id, "problem"))}" ${ed ? "" : "disabled"}></div>
          <div class="f full"><label for="qr-f-${id}">${L("แนวทางแก้ไข", "What we'll do")}</label><input type="text" id="qr-f-${id}" data-qr="${id}" data-k="fix" value="${esc(val(id, "fix"))}" ${ed ? "" : "disabled"}></div></div></div>`).join("") || `<span class="sub">${L("หน่วยงานนี้ไม่มีผลผลิตที่ต้องรายงาน", "This unit has no outputs to report")}</span>`}
      <div><b>${L("หลักฐาน", "Evidence")}</b> <span class="mono sub">FR-B-36</span><div class="row" style="margin-top:6px">${(q.evidence || []).map(e => tag(esc(e), "p-mute")).join("") || `<span class="sub">${L("ยังไม่มี", "None")}</span>`}${q.certified ? tag(`${L("ผู้ตรวจรับรอง", "Certified by audit")} · ${fdate(q.certified)}`, "p-ok") : ""}</div>
        ${ed ? `<div class="row" style="margin-top:6px"><button class="btn" type="button" id="qr-ev">${L("แนบหลักฐาน", "Attach evidence")}</button><button class="btn ghost" type="button" id="qr-evs">${L("ใช้รูปตัวอย่าง", "Use a sample photo")}</button><input type="file" id="qr-evf" hidden multiple></div>` : ""}</div>
      <div class="row">${ed ? `<button class="btn" type="button" id="qr-save">${L("บันทึกร่าง", "Save draft")}</button><button class="btn primary" type="button" id="qr-send">${L("ส่งรายงาน", "Send report")}</button>` : ""}
        ${pl ? `<button class="btn primary" type="button" id="qr-ok">${L("รับรายงาน", "Accept")}</button><button class="btn danger" type="button" id="qr-ret">${L("ส่งกลับ", "Return")}</button>` : ""}
        ${au ? `<button class="btn primary" type="button" id="qr-cert">${L("รับรองว่ามีหลักฐานครบ", "Certify the evidence")}</button>` : ""}</div>
    </div></section>`;
}
PERF_BIND_B5.quarter = () => {
  const R = QR_ROUNDS(), rd = R.find(x => x.id === QR_ROUND) || R[3], u = unitRole() ? me().unit : QR_UNIT;
  $$("[data-qrr]").forEach(b => (b.onclick = () => { QR_ROUND = b.dataset.qrr; route(); }));
  $$("[data-qru]").forEach(tr => { const f = () => { QR_UNIT = tr.dataset.qru; route(); }; tr.onclick = f; tr.onkeydown = e => { if (e.key === "Enter") f(); }; });
  if (!u) return;
  S.qrep = S.qrep || {}; S.qrep[rd.id] = S.qrep[rd.id] || {};
  const q = () => (S.qrep[rd.id][u] = S.qrep[rd.id][u] || { status: "draft", items: {}, evidence: [] });
  $$("[data-qr]").forEach(inp => (inp.onchange = () => { const it = (q().items[inp.dataset.qr] = q().items[inp.dataset.qr] || {}); it[inp.dataset.k] = inp.type === "number" ? (inp.value === "" ? null : Number(inp.value)) : inp.value; save(); }));
  const ev = $("#qr-ev"), evf = $("#qr-evf"), evs = $("#qr-evs");
  if (ev) ev.onclick = () => evf.click();
  if (evf) evf.onchange = () => { Array.from(evf.files).forEach(f => q().evidence.push(f.name)); evf.value = ""; audit(["แนบหลักฐานรายงานผล", "Attached report evidence"], `${u} ${rd.id}`); commit(); route(); };
  if (evs) evs.onclick = () => { q().evidence.push(L("ภาพถ่ายการส่งมอบงาน.jpg", "Delivery photo.jpg")); commit(); route(); };
  const sv = $("#qr-save"); if (sv) sv.onclick = () => { q().status = "draft"; audit(["บันทึกร่างรายงานผล", "Saved a report draft"], `${u} ${rd.id}`); commit(); route(); toast(L("บันทึกร่างแล้ว", "Draft saved")); };
  const sd = $("#qr-send"); if (sd) sd.onclick = () => {
    const x = q(), miss = qrItems(u).filter(({ id }) => !x.items[id] || x.items[id].result == null);
    if (miss.length) { toast(L(`ยังไม่ได้กรอกผล ${miss.length} รายการ`, `${miss.length} results still missing`)); return; }
    x.status = "submitted"; x.t = nowIso(); x.by = me().id;
    notify(["plan"], [`${unitName(u)} ส่งรายงานผล ${rd.id}`, `${unitName(u)} sent its ${rd.id} report`], "perf-quarter");
    audit(["ส่งรายงานผลการปฏิบัติงาน", "Sent a results report"], `${u} ${rd.id}`); commit(); route(); toast(TODAY > rd.due ? L("ส่งแล้ว · ช้ากว่ากำหนด", "Sent · after the deadline") : L("ส่งแล้ว", "Sent"));
  };
  const ok = $("#qr-ok"); if (ok) ok.onclick = () => { q().status = "accepted"; audit(["รับรายงานผล", "Accepted a results report"], `${u} ${rd.id}`); commit(); route(); };
  const rt = $("#qr-ret"); if (rt) rt.onclick = () => { q().status = "returned"; notify(["div"], [`กองแผนส่งรายงาน ${rd.id} กลับให้แก้ไข`, `Planning returned your ${rd.id} report`], "perf-quarter"); audit(["ส่งรายงานผลกลับ", "Returned a results report"], `${u} ${rd.id}`); commit(); route(); };
  const ce = $("#qr-cert"); if (ce) ce.onclick = () => { q().certified = TODAY; audit(["รับรองหลักฐานรายงานผล", "Certified report evidence"], `${u} ${rd.id}`); commit(); route(); };
};

// ---------- cost per output ----------
PERF.cost = () => {
  const rows = S.dash.projects.filter(p => S.perf.outputs[p.id]).map(p => { const o = S.perf.outputs[p.id], last = (S.lastCost || {})[p.id];
    const plan = o.target ? p.plan * 1e6 / o.target : null, act = o.result ? p.actual * 1e6 / o.result : null;
    return { p, o, plan, act, last, d: plan && act ? (act / plan - 1) * 100 : null }; });
  const cell = v => (v == null ? "–" : fmt(v, v < 100 ? 2 : 0));
  return `<div class="alert"><div class="ic">i</div><div><b>${L("ต้นทุนต่อหน่วยผลผลิต (3E)", "Cost per unit of output (3E)")}</b><p>${L("ต้นทุนจริง = เบิกจ่ายจริง ÷ ผลผลิตจริง · ต้นทุนตามแผน = แผนการใช้จ่าย ÷ เป้าหมาย ช่วงเดียวกัน · เทียบปีก่อนเพื่อดูความประหยัดและประสิทธิภาพตามคู่มือสำนักงบประมาณ", "Actual cost = spent ÷ actual output · planned cost = planned spend ÷ target, same period · compared with last year to show economy and efficiency, as in the Budget Bureau manual")}</p></div></div>
    <section class="panel"><header>${chipIco("coins", "info")}<h2>${L("ต้นทุนต่อหน่วย", "Unit cost")}</h2><span class="sp"></span><span class="sub">${L("บาทต่อหน่วย · ณ", "baht per unit · as of")} ${fdate(S.dash.asOf)}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ผลผลิต", "Output")}</th><th class="n">${L("เป้า / ผล", "Target / result")}</th><th class="n">${L("ตามแผน", "Planned")}</th><th class="n">${L("จริง", "Actual")}</th><th class="n">${L("ปีก่อน", "Last year")}</th><th>${L("ข้อสังเกต", "Note")}</th></tr></thead>
        <tbody>${rows.map(x => `<tr><td>${esc(tx(x.o.name))}<div class="sub">${unitName(x.p.unit)} · ${tx(x.o.unit)}</div></td><td class="n">${fmtv(x.o.target)} / ${x.o.result == null ? "–" : fmtv(x.o.result)}</td><td class="n">${cell(x.plan)}</td><td class="n"><b>${cell(x.act)}</b></td><td class="n">${cell(x.last)}</td>
          <td>${x.act == null ? tag(L("ยังไม่มีผลผลิต", "No output yet"), "p-warn") : x.d > 15 ? tag(`${L("สูงกว่าแผน", "Above plan")} ${fmt(x.d, 0)}%`, "p-bad") : x.d < -10 ? tag(`${L("ต่ำกว่าแผน", "Below plan")} ${fmt(-x.d, 0)}%`, "p-ok") : tag(L("ใกล้แผน", "Near plan"), "p-mute")}</td></tr>`).join("")}</tbody></table></div></section>`;
};

// ---------- three-stage evaluation ----------
PERF.stages = () => {
  const ST = (ok, t) => tag(t, ok === true ? "p-ok" : ok === false ? "p-warn" : "p-mute");
  const rows = S.dash.projects.filter(p => S.perf.outputs[p.id]).map(p => {
    const o = S.perf.outputs[p.id], ev = (S.evals || []).find(e => e.proj === p.id), q = Object.keys(S.qrep || {}).filter(k => (S.qrep[k][p.unit] || {}).status === "accepted").length, imp = (S.impactSel || []).includes(p.id);
    const req = S.requests.find(r => r.unit === p.unit && r.ready);
    return `<tr><td>${esc(tx(p.name))}<div class="sub">${unitName(p.unit)}</div></td>
      <td>${req ? ST(readiness(req) >= 3, `${L("ความพร้อม", "Readiness")} ${fmt(readiness(req), 1)}`) : ST(null, L("ก่อนระบบใหม่", "Before the new form"))}</td>
      <td>${ST(pct(p.actual, p.plan) >= 90 && (o.result || 0) / o.target >= 0.8, `${L("ใช้จ่าย", "Spend")} ${fmt(pct(p.actual, p.plan), 0)}% · ${L("ผลผลิต", "Output")} ${fmt(achv(o.result, o.target) || 0, 0)}% · ${q} ${L("รายงาน", "reports")}`)}</td>
      <td>${ev ? ST(ev.status === "done", ev.status === "done" ? `${L("ประเมินแล้ว", "Evaluated")} ${ev.id}` : L("กำลังประเมิน", "In progress")) : ST(null, L("ยังไม่ประเมิน", "Not evaluated"))}</td>
      <td>${ROLE === "plan" ? `<label class="radio"><input type="checkbox" data-imp="${p.id}" ${imp ? "checked" : ""}> ${L("เลือกประเมินผลกระทบ", "Pick for impact")}</label>` : imp ? tag(L("อยู่ในแผนประเมินผลกระทบ", "In the impact plan"), "p-info") : "–"}</td></tr>`;
  }).join("");
  return `<section class="panel"><header>${chipIco("layers", "info")}<h2>${L("ประเมินก่อนจัดสรร ระหว่างใช้จ่าย และหลังใช้จ่าย", "Before funding, while spending and after spending")}</h2><span class="sp"></span><span class="mono sub">${L("มาตรา 46", "section 46")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("โครงการ", "Project")}</th><th>${L("ก่อน", "Before")}</th><th>${L("ระหว่าง", "During")}</th><th>${L("หลัง", "After")}</th><th>${L("ผลกระทบ", "Impact")}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="body sub">${L("ก่อน: ความพร้อมและความคุ้มค่าในคำขอ (M02) · ระหว่าง: ใช้จ่ายและผลผลิตเทียบแผน และรายงานรายไตรมาสที่รับแล้ว · หลัง: การประเมินโครงการ (แท็บประเมินโครงการ) · ผลกระทบ: กองแผนเลือกโครงการที่จะประเมินผลกระทบ", "Before: readiness and value in the request (M02) · During: spend and output against plan, and accepted quarterly reports · After: the project evaluation tab · Impact: Planning picks projects for an impact evaluation")}</div></section>`;
};
PERF_BIND_B5.stages = () => $$("[data-imp]").forEach(c => (c.onchange = () => { S.impactSel = S.impactSel || []; const i = S.impactSel.indexOf(c.dataset.imp); if (c.checked && i < 0) S.impactSel.push(c.dataset.imp); if (!c.checked && i >= 0) S.impactSel.splice(i, 1); audit(["เลือกโครงการประเมินผลกระทบ", "Picked a project for impact evaluation"], c.dataset.imp); commit(); route(); }));

// ---------- recommendations ----------
const REC_SRC = { bb: ["สำนักงบประมาณ", "Budget Bureau"], audit: ["ผู้ตรวจสอบ", "Auditor"], cmte: ["กรรมาธิการ", "Scrutiny committee"] };
const REC_ST = { open: [["ยังไม่เริ่ม", "Not started"], "p-warn"], doing: [["กำลังแก้ไข", "In progress"], "p-info"], done: [["แก้ไขแล้ว", "Done"], "p-ok"] };
PERF.recs = () => {
  const R = S.recs || [], canAdd = ROLE === "plan" || ROLE === "audit";
  return `<section class="panel"><header>${chipIco("flag", "info")}<h2>${L("ข้อเสนอแนะที่ต้องแก้ไข", "Recommendations to act on")}</h2><span class="sp"></span><span class="mono sub">${L("มาตรา 48", "section 48")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ข้อเสนอแนะ", "Recommendation")}</th><th>${L("จาก", "From")}</th><th>${L("ผู้รับผิดชอบ", "Owner")}</th><th>${L("กำหนด", "Due")}</th><th>${L("สถานะ", "Status")}</th><th>${L("สิ่งที่ทำ", "Action taken")}</th></tr></thead>
      <tbody>${R.map((x, i) => { const mine = unitRole() && me().unit === x.unit, over = x.status !== "done" && TODAY > x.due;
        return `<tr><td>${esc(tx(x.text))}<div class="sub mono">${x.id}</div></td><td class="sub">${tx(REC_SRC[x.src])}</td><td class="sub">${unitName(x.unit)}</td><td>${dueText(x.due)}${over ? ` ${tag(L("เลยกำหนด", "Overdue"), "p-bad")}` : ""}</td>
          <td>${mine || ROLE === "plan" ? `<select data-recst="${i}" aria-label="${L("สถานะ", "Status")}">${Object.keys(REC_ST).map(k => `<option value="${k}" ${x.status === k ? "selected" : ""}>${tx(REC_ST[k][0])}</option>`).join("")}</select>` : tag(tx(REC_ST[x.status][0]), REC_ST[x.status][1])}</td>
          <td>${mine ? `<input type="text" data-recact="${i}" value="${esc(x.action || "")}" aria-label="${L("สิ่งที่ทำ", "Action taken")}" style="width:100%">` : `<span class="sub">${esc(x.action || "–")}</span>`}</td></tr>`; }).join("") || `<tr><td colspan="6" class="sub">${L("ไม่มี", "None")}</td></tr>`}</tbody></table></div>
    ${canAdd ? `<div class="body"><form class="inline-form" id="rec-form"><div class="f" style="flex:3 1 280px"><label for="rec-t">${L("ข้อเสนอแนะ", "Recommendation")}</label><input type="text" id="rec-t" required></div>
      <div class="f"><label for="rec-s">${L("จาก", "From")}</label><select id="rec-s">${Object.keys(REC_SRC).map(k => `<option value="${k}">${tx(REC_SRC[k])}</option>`).join("")}</select></div>
      <div class="f"><label for="rec-u">${L("ผู้รับผิดชอบ", "Owner")}</label><select id="rec-u">${S.units.filter(u => u.parent).map(u => `<option value="${u.id}">${esc(tx(u.name))}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 170px"><label for="rec-d">${L("กำหนดแก้ไข", "Due")}</label><input type="date" id="rec-d" value="${addDays(TODAY, 60)}"></div><button class="btn primary" type="submit">${L("เพิ่ม", "Add")}</button></form></div>` : ""}</section>`;
};
PERF_BIND_B5.recs = () => {
  $$("[data-recst]").forEach(s => (s.onchange = () => { const x = S.recs[s.dataset.recst]; x.status = s.value; audit(["ปรับสถานะข้อเสนอแนะ", "Updated a recommendation"], `${x.id}: ${s.value}`); commit(); route(); }));
  $$("[data-recact]").forEach(i => (i.onchange = () => { S.recs[i.dataset.recact].action = i.value; commit(); }));
  const f = $("#rec-form"); if (f) f.onsubmit = e => { e.preventDefault(); S.recs = S.recs || []; const x = { id: `RC-2569-${String(S.recs.length + 1).padStart(2, "0")}`, text: [$("#rec-t").value, $("#rec-t").value], src: $("#rec-s").value, unit: $("#rec-u").value, due: $("#rec-d").value, status: "open" }; S.recs.push(x); notify(["div"], [`ข้อเสนอแนะใหม่ ${x.id} รอการแก้ไข`, `New recommendation ${x.id} to act on`], "perf-recs"); audit(["เพิ่มข้อเสนอแนะ", "Added a recommendation"], x.id); commit(); route(); };
};

// ---------- public page ----------
PERF.public = () => {
  const T = dashTotals(), ks = allKpis().map(x => ({ ...x, p: S.perf.kpis[x.k.id] })).filter(x => x.p && x.p.result != null), met = ks.filter(x => achv(x.p.result, x.p.target) >= 100).length, pub = S.publicPub;
  return `<section class="panel"><header>${chipIco("share", "info")}<h2>${L("หน้าสรุปสำหรับประชาชน", "Public summary page")}</h2><span class="sp"></span><span class="mono sub">${L("มาตรา 47", "section 47")}</span>${pub ? tag(`${L("เผยแพร่แล้ว", "Published")} ${fdate(pub)}`, "p-ok") : tag(L("ยังไม่เผยแพร่", "Not published"), "p-mute")}</header>
    <div class="body"><div class="pubcard"><div class="eyebrow">${esc(tx(S.org))} · ${L("ปีงบประมาณ", "Fiscal year")} ${S.dash.fy}</div><h3>${L("เราใช้งบประมาณไปกับอะไร และได้ผลอย่างไร", "What we spent and what it achieved")}</h3>
      <div class="pubstats"><div><b class="num">${mb(T.alloc * 1e6)}</b><span>${L("ล้านบาท ได้รับจัดสรร", "M baht allotted")}</span></div><div><b class="num">${fmt(T.rate, 0)}%</b><span>${L("เบิกจ่ายแล้ว ณ", "spent as of")} ${fdate(S.dash.asOf)}</span></div><div><b class="num">${met}/${ks.length}</b><span>${L("ตัวชี้วัดบรรลุเป้า", "KPIs met")}</span></div></div>
      <ul>${S.dash.projects.filter(p => S.perf.outputs[p.id] && S.perf.outputs[p.id].result).slice(0, 5).map(p => { const o = S.perf.outputs[p.id]; return `<li><b>${fmtv(o.result)} ${tx(o.unit)}</b> ${esc(tx(o.name))} · ${fmt(p.actual, 1)} ${L("ลบ.", "M")}</li>`; }).join("")}</ul>
      <span class="sub">${L("ข้อมูลจากรายงานที่กองแผนรับแล้ว ไม่มีข้อมูลส่วนบุคคล", "From reports Planning has accepted; no personal data")}</span></div>
      ${ROLE === "plan" || ROLE === "exec" ? `<div class="row" style="margin-top:12px"><button class="btn primary" type="button" id="pub-go">${pub ? L("เผยแพร่ฉบับปรับปรุง", "Publish an update") : L("อนุมัติเผยแพร่", "Approve and publish")}</button><span class="sub">${L("ในต้นแบบเป็นการบันทึกว่าเผยแพร่ ยังไม่ได้สร้างเว็บไซต์จริง", "In the prototype this records the publication; no real website is created")}</span></div>` : ""}</div></section>`;
};
PERF_BIND_B5.public = () => { const b = $("#pub-go"); if (b) b.onclick = () => { S.publicPub = TODAY; audit(["อนุมัติเผยแพร่ผลการใช้จ่ายและผลสัมฤทธิ์", "Published the spending and results summary"], `${S.dash.fy}`); commit(); route(); toast(L("บันทึกการเผยแพร่แล้ว", "Publication recorded")); }; };
{
  const bb = BIND.performance;
  BIND.performance = () => { bb(); (PERF_BIND_B5[PERF_TAB] || (() => {}))(); };
}

// ---------- seed ----------
function seedBudgetB5(s) {
  const out = s.perf && s.perf.outputs; if (!out || !s.dash) return;
  const unitsOf = [...new Set(s.dash.projects.filter(p => out[p.id]).map(p => p.unit))], items = u => s.dash.projects.filter(p => p.unit === u && out[p.id]);
  const full = (u, k) => { const it = {}; items(u).forEach(p => (it[p.id] = { result: out[p.id].result, problem: "", fix: "" })); return it; };
  s.qrep = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };
  unitsOf.forEach(u => { ["Q1", "Q2", "Q3"].forEach((q, i) => (s.qrep[q][u] = { status: "accepted", items: full(u), evidence: [`${q}-evidence-${u}.pdf`], certified: ["2026-01-20", "2026-04-20", "2026-07-20"][i], t: ["2026-01-12T10:00", "2026-04-10T10:00", "2026-07-14T10:00"][i] })); });
  if (unitsOf[0]) s.qrep.Q4[unitsOf[0]] = { status: "accepted", items: full(unitsOf[0]), evidence: ["Q4-photos.zip"], t: "2026-10-12T10:00" };
  const div = s.users.find(u => u.role === "div" && u.primary), sub = unitsOf.find(u => u !== unitsOf[0] && (!div || u !== div.unit));
  if (sub) s.qrep.Q4[sub] = { status: "submitted", items: full(sub), evidence: ["Q4-delivery.jpg"], t: "2026-10-14T15:00" };
  if (div && unitsOf.includes(div.unit)) s.qrep.Q4[div.unit] = { status: "draft", items: {}, evidence: [] };
  s.lastCost = {}; s.dash.projects.forEach(p => { const o = out[p.id]; if (o && o.target) s.lastCost[p.id] = Math.round(p.plan * 1e6 / o.target * 0.95); });
  s.recs = [
    { id: "RC-2569-01", text: ["เร่งรัดการเบิกจ่ายงบลงทุนให้ได้ตามแผนไตรมาส", "Bring investment spending up to the quarterly plan"], src: "bb", unit: unitsOf[1] || "U05", due: "2026-09-30", status: "doing", action: ["ทำสัญญาแล้ว 2 ใน 4 รายการ", "2 of 4 contracts signed"][0] },
    { id: "RC-2569-02", text: ["ทบทวนตัวชี้วัดให้วัดผลลัพธ์ต่อประชาชน", "Revise KPIs to measure outcomes for citizens"], src: "cmte", unit: "U02", due: "2026-12-31", status: "open", action: "" },
    { id: "RC-2569-03", text: ["จัดเก็บหลักฐานการตรวจรับให้ครบทุกงวด", "Keep acceptance evidence for every phase"], src: "audit", unit: unitsOf[2] || "U03", due: "2026-08-31", status: "done", action: "แนบหลักฐานครบในระบบแล้ว" },
  ];
  s.impactSel = [s.dash.projects.find(p => p.unit === "U04" && out[p.id]) ? s.dash.projects.find(p => p.unit === "U04" && out[p.id]).id : null].filter(Boolean);
}
