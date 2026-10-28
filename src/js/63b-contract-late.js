// Fisko Procurement round 19 (Q2 of design v0.2): the late stage of a contract and the supplier side.
// Supervisor weekly reports and the 50% / 75% / due-date checkpoints (FR-PR-19), termination (FR-PR-46, R-15),
// warranty period and defect claims (FR-PR-47, R-16), letters from templates with the sent date (FR-PR-48),
// the supplier register with tax-ID check (FR-PR-50), the abandoned-work list check (FR-PR-51, R-17) and
// supplier history (FR-PR-52). Plugs into the contract panel through CON_PANELS / CON_BINDS (63-contracts.js).
let BL_ROWS = null, LETTER_DRAFT = null;
const VTYPE = { company: ["บริษัทจำกัด", "Company"], partnership: ["ห้างหุ้นส่วน", "Partnership"], person: ["บุคคลธรรมดา", "Individual"] };
const ASSESS_RES = { ok: [["เป็นไปตามแผน", "On track"], "p-ok"], warn: [["ล่าช้า เร่งรัด", "Behind, chase"], "p-warn"], terminate: [["เสนอพิจารณาบอกเลิก", "Consider termination"], "p-bad"] };
const LETTER_T = { remind: ["หนังสือเร่งรัดการส่งมอบ", "Delivery reminder"], penalty: ["หนังสือแจ้งค่าปรับ", "Penalty notice"], reject: ["หนังสือแจ้งผลตรวจรับไม่ถูกต้อง", "Notice of rejected work"], defect: ["หนังสือแจ้งซ่อมในระยะรับประกัน", "Defect repair notice"], terminate: ["หนังสือบอกเลิกสัญญา", "Termination letter"] };

// ---------- suppliers and the abandoned-work list ----------
function taxOk(id) { if (!/^\d{13}$/.test(id)) return false; let s = 0; for (let i = 0; i < 12; i++) s += Number(id[i]) * (13 - i); return (11 - (s % 11)) % 10 === Number(id[12]); }
const normName = n => String(n || "").replace(/บริษัท|จำกัด|\(มหาชน\)|ห้างหุ้นส่วนจำกัด|ห้างหุ้นส่วนสามัญ|co\.,?|ltd\.?|limited|partnership|\s|\.|,/gi, "").toLowerCase();
const vendorBy = name => (S.vendors || []).find(v => normName(v.name) === normName(name));
function blHit(name) {
  if (!name) return null; const v = vendorBy(name);
  return ((S.blacklist || {}).rows || []).find(r => (v && v.taxId && r.taxId === v.taxId) || normName(r.name) === normName(name)) || null;
}
const blBlocked = (c, name) => !!blHit(name) && !(c && c.blOverride && c.blOverride.names.includes(name));
function vendorHist(name) {
  const cons = S.contracts.filter(c => normName(tx(c.vendor)) === normName(name)), cs = cons.map(c => caseByPlan(c.plan)).filter(Boolean);
  const scores = cs.filter(x => x.close).map(x => x.close.score);
  return { n: cons.length, value: sumv(cons.map(c => c.amount)), late: sumv(cons.flatMap(c => c.phases.map(phLate))), pen: sumv(cons.map(conPenalty)), dissent: cons.flatMap(c => c.phases.flatMap(ph => ph.dissent || [])).length,
    terminated: cons.filter(c => c.status === "terminated").length, score: scores.length ? avg(scores) : null, bids: S.cases.filter(x => (x.bids || []).some(b => normName(b.name) === normName(name))).length };
}
PROC.supKpis = () => {
  const V = S.vendors, B = S.blacklist, pr = isProcRole();
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("ผู้ขายในทะเบียน", "Suppliers registered")}</span><span class="v">${V.length}</span></div>
    <div class="kpi"><span class="l">${L("SME", "SMEs")}</span><span class="v">${V.filter(v => v.sme).length}</span></div>
    <div class="kpi"><span class="l">${L("รายชื่อผู้ทิ้งงาน", "Abandoned-work list")}</span><span class="v">${B.rows.length}</span></div>
    <div class="kpi"><span class="l">${L("นำเข้ารายชื่อล่าสุด", "Last list import")}</span><span class="v" style="font-size:18px">${B.imports[0] ? fdate(B.imports[0].t) : "—"}</span></div>
  </section>`;
};
PROC.supRegister = () => {
  const V = S.vendors, B = S.blacklist, pr = isProcRole();
  return `
  <section class="panel"><header><h2>${L("ทะเบียนผู้ขาย", "Supplier register")}</h2><span class="sp"></span><span class="sub">${L("ประวัติรวมจากทุกสัญญา ใช้ประกอบการจัดซื้อครั้งถัดไป (FR-PR-52) ไม่ใช่การจัดอันดับ", "History across all contracts, shown when buying next time (FR-PR-52). Not a ranking.")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th style="min-width:200px">${L("ผู้ขาย", "Supplier")}</th><th>${L("เลขประจำตัวผู้เสียภาษี", "Tax ID")}</th><th>${L("ประเภท", "Type")}</th><th class="n">${L("สัญญา", "Contracts")}</th><th class="n">${L("มูลค่า (ลบ.)", "Value (M)")}</th><th class="n">${L("วันล่าช้า", "Late days")}</th><th class="n">${L("ค่าปรับ (บาท)", "Penalties (baht)")}</th><th class="n">${L("คะแนนเฉลี่ย", "Avg score")}</th><th>${L("สถานะ", "Status")}</th></tr></thead>
      <tbody>${V.map(v => { const h = vendorHist(v.name), bl = blHit(v.name);
        return `<tr><td><b style="font-weight:600">${esc(v.name)}</b><div class="sub">${v.sme ? "SME" : ""}${v.sme && v.local ? " · " : ""}${v.local ? L("ในพื้นที่", "local") : ""}${v.contact ? ` · ${esc(v.contact)}` : ""}</div></td>
          <td class="mono">${esc(v.taxId)} ${taxOk(v.taxId) ? "" : tag(L("เลขไม่ถูกต้อง", "Invalid"), "p-bad")}</td><td class="sub">${tx(VTYPE[v.type])}</td><td class="n">${h.n}</td><td class="n">${mb(h.value)}</td><td class="n">${h.late}</td><td class="n">${fmt(h.pen)}</td><td class="n">${h.score == null ? "—" : fmt(h.score, 1)}</td>
          <td>${bl ? tag(L("อยู่ในรายชื่อผู้ทิ้งงาน", "On the list"), "p-bad") : v.status === "proposed" ? tag(L("เสนอพิจารณาผู้ทิ้งงาน", "Proposed for the list"), "p-warn") : tag(L("ปกติ", "Active"), "p-ok")}</td></tr>`; }).join("")}</tbody></table></div>
    ${pr ? `<div class="body"><form class="inline-form" id="vd-form"><div class="f" style="flex:2 1 220px"><label for="vd-n">${L("ชื่อผู้ขาย", "Supplier name")}</label><input type="text" id="vd-n" required></div>
      <div class="f" style="flex:0 1 170px"><label for="vd-t">${L("เลขประจำตัวผู้เสียภาษี 13 หลัก", "13-digit tax ID")}</label><input type="text" id="vd-t" inputmode="numeric" maxlength="13" required></div>
      <div class="f" style="flex:0 1 150px"><label for="vd-ty">${L("ประเภท", "Type")}</label><select id="vd-ty">${Object.keys(VTYPE).map(k => `<option value="${k}">${tx(VTYPE[k])}</option>`).join("")}</select></div>
      <label class="field-inline"><input type="checkbox" id="vd-sme"> SME</label><label class="field-inline"><input type="checkbox" id="vd-loc"> ${L("ในพื้นที่", "Local")}</label>
      <div class="f" style="flex:1 1 160px"><label for="vd-c">${L("ผู้ติดต่อ", "Contact")}</label><input type="text" id="vd-c"></div><button class="btn" type="submit">+ ${L("เพิ่ม", "Add")}</button></form></div>` : ""}</section>`;
};
PROC.supBlacklist = () => {
  const V = S.vendors, B = S.blacklist, pr = isProcRole();
  return `
  <section class="panel"><header><h2>${L("รายชื่อผู้ทิ้งงาน", "Abandoned-work list")}</h2><span class="sp"></span>${pr ? `<button class="btn" type="button" id="bl-sample">${L("สร้างไฟล์ตัวอย่าง", "Create a sample file")}</button>` : ""}</header>
    <div class="body sub">${L("นำเข้าจากไฟล์ที่หน่วยงานได้รับ ระบบตรวจชื่อและเลขประจำตัวผู้เสียภาษีก่อนบันทึกผู้ชนะและก่อนทำสัญญา (R-17) ปลดได้เฉพาะหัวหน้าพัสดุเมื่อยืนยันว่าเป็นคนละราย", "Imported from the file the agency receives. Names and tax IDs are checked before a winner is recorded and before a contract (R-17). Only the head of procurement can release a match, after confirming it's a different entity.")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ชื่อ", "Name")}</th><th>${L("เลขประจำตัวผู้เสียภาษี", "Tax ID")}</th><th>${L("ตั้งแต่", "Since")}</th><th>${L("อ้างอิง", "Reference")}</th></tr></thead><tbody>${B.rows.map(r => `<tr><td>${esc(r.name)}</td><td class="mono">${esc(r.taxId)}</td><td class="sub">${fdate(r.since)}</td><td class="sub">${esc(r.ref)}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">—</td></tr>`}</tbody></table></div>
    ${BL_ROWS ? `<div class="body"><b>${L("ตัวอย่างไฟล์ที่จะนำเข้า", "File to import")}</b> <span class="sub">${BL_ROWS.length} ${L("แถว แทนที่รายชื่อเดิมทั้งหมด", "rows; replaces the current list")}</span><div class="row" style="margin-top:6px"><button class="btn primary" type="button" id="bl-go">${L("นำเข้า", "Import")}</button><button class="btn ghost" type="button" id="bl-clear">${L("ล้าง", "Clear")}</button></div></div>` : ""}</section>`;
};
PROC.suppliers = () => PROC.supKpis() + PROC.supRegister() + PROC.supBlacklist();
function bindSuppliers() {
  const done = m => { commit(); renderShell(); route(); if (m) toast(m); };
  const f = $("#vd-form"); if (f) f.onsubmit = e => { e.preventDefault(); const name = $("#vd-n").value.trim(), taxId = $("#vd-t").value.trim();
    if (!taxOk(taxId)) { toast(L("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง (13 หลักและหลักตรวจสอบ)", "The tax ID isn't valid (13 digits with a check digit)")); return; }
    if (S.vendors.some(v => v.taxId === taxId || normName(v.name) === normName(name))) { toast(L("มีผู้ขายรายนี้แล้ว", "This supplier is already registered")); return; }
    S.vendors.push({ id: "V-" + String(S.vendors.length + 1).padStart(3, "0"), name, taxId, type: $("#vd-ty").value, sme: $("#vd-sme").checked, local: $("#vd-loc").checked, contact: $("#vd-c").value.trim(), status: "active" });
    audit(["เพิ่มผู้ขายในทะเบียน", "Registered a supplier"], `${name} ${taxId}`); done(blHit(name) ? L("เพิ่มแล้ว ผู้ขายรายนี้อยู่ในรายชื่อผู้ทิ้งงาน", "Added; this supplier is on the abandoned-work list") : L("เพิ่มแล้ว", "Added")); };
  const sm = $("#bl-sample"); if (sm) sm.onclick = () => { BL_ROWS = S.blacklist.rows.map(r => ({ ...r })).concat([{ name: "ห้างหุ้นส่วนจำกัด ตัวอย่างไม่ส่งมอบ", taxId: "0103559012340", since: "2026-09-20", ref: "หนังสือแจ้งเวียน (ตัวอย่าง) 9/2569" }]).map(r => ({ ...r, taxId: r.taxId.slice(0, 12) + ((11 - ([...r.taxId.slice(0, 12)].reduce((a, d, i) => a + Number(d) * (13 - i), 0) % 11)) % 10) })); route(); };
  const go = $("#bl-go"); if (go) go.onclick = () => { S.blacklist.rows = BL_ROWS; S.blacklist.imports.unshift({ id: `BL-${FAM_FY}-${String(S.blacklist.imports.length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, n: BL_ROWS.length }); BL_ROWS = null;
    audit(["นำเข้ารายชื่อผู้ทิ้งงาน", "Imported the abandoned-work list"], `${S.blacklist.rows.length}`); done(L("นำเข้าแล้ว", "Imported")); };
  const cl = $("#bl-clear"); if (cl) cl.onclick = () => { BL_ROWS = null; route(); };
}
// R-17 at the award, the small-path award and the contract (the contract form checks blBlocked in 60-procurement.js)
{
  const base = awardGuard;
  awardGuard = (c, winner, price, why) => (blBlocked(c, winner) ? L("ผู้ชนะอยู่ในรายชื่อผู้ทิ้งงาน (R-17) บันทึกไม่ได้", "The winner is on the abandoned-work list (R-17)") : base(c, winner, price, why));
  const baseMove = caseMove;
  caseMove = c => { if (caseState(c) === 4 && !needsCompetition(c)) { const q = c.quotes.find(x => x.win); if (q && blBlocked(c, tx(q.vendor))) { toast(L("ผู้เสนอราคาที่เลือกอยู่ในรายชื่อผู้ทิ้งงาน (R-17)", "The chosen supplier is on the abandoned-work list (R-17)")); return false; } } return baseMove(c); };
}
CASE_PANELS.push(c => {
  const names = [...new Set([...(c.bids || []).map(b => b.name), ...(c.quotes || []).map(q => tx(q.vendor)), ...(c.award ? [tx(c.award.winner)] : [])])], hits = names.filter(n => blHit(n));
  if (!hits.length) return "";
  const head = ROLE === "prochead", ov = c.blOverride;
  return `<div class="alert"><div class="ic" style="background:var(--bad-soft);color:var(--bad)">!</div><div><b>${L("พบชื่อในรายชื่อผู้ทิ้งงาน (R-17)", "Name found on the abandoned-work list (R-17)")}</b>
    <p>${hits.map(n => `${esc(n)} ↔ ${esc(blHit(n).name)} (${esc(blHit(n).ref)})${ov && ov.names.includes(n) ? ` · ${L("ปลดแล้วโดย", "released by")} ${esc(userName(ov.by))}: ${esc(ov.note)}` : ""}`).join("<br>")}</p>
    ${head && hits.some(n => !(ov && ov.names.includes(n))) ? `<div class="row" style="margin-top:6px"><input type="text" id="bl-note" placeholder="${L("หลักฐานว่าเป็นคนละราย", "Evidence it's a different entity")}" style="min-width:220px"><button class="btn" type="button" id="bl-release">${L("ยืนยันว่าเป็นคนละราย", "Confirm a different entity")}</button></div>` : ""}</div></div>`;
});
CASE_BINDS.push((c, done) => {
  const b = $("#bl-release"); if (b) b.onclick = () => { const note = $("#bl-note").value.trim(); if (note.length < 10) { toastErr(L("ระบุหลักฐานอย่างน้อย 10 ตัวอักษร", "Give evidence of at least 10 characters")); return; }
    const names = [...new Set([...(c.bids || []).map(x => x.name), ...(c.quotes || []).map(q => tx(q.vendor)), ...(c.award ? [tx(c.award.winner)] : [])])].filter(n => blHit(n));
    c.blOverride = { by: me().id, note, t: nowIso(), names }; audit(["ปลดการตรวจพบรายชื่อผู้ทิ้งงาน", "Released an abandoned-work match"], `${c.id} ${names.join(", ")}`); notify(["audit"], [`แฟ้ม ${c.id} ปลดการตรวจพบรายชื่อผู้ทิ้งงาน`, `Case ${c.id}: an abandoned-work match was released`], `case:${c.id}`); done(L("บันทึกแล้ว แจ้งผู้ตรวจสอบแล้ว", "Recorded; Audit notified")); };
});

// ---------- supervision and checkpoints ----------
const conEnd = c => c.phases.filter(ph => !ph.cancelled).reduce((m, ph) => (phDue(ph) > m ? phDue(ph) : m), c.signed);
const plannedPct = (c, d) => { const span = Math.max(1, dayDiff(c.signed, conEnd(c))); return Math.max(0, Math.min(100, Math.round(dayDiff(c.signed, d) / span * 100))); };
const checkpoints = c => { const span = dayDiff(c.signed, conEnd(c)); return [["50", addDays(c.signed, Math.round(span * 0.5))], ["75", addDays(c.signed, Math.round(span * 0.75))], ["due", conEnd(c)]].map(([k, d]) => ({ k, d, a: (c.supervision.assess || []).find(x => x.at === k) })); };
const lastReport = c => (c.supervision.reports || []).slice(-1)[0];
function suggestAssess(c, k, actual) { const plan = plannedPct(c, TODAY); if (k === "due" && (actual < S.pcfg.dueProgressMin || penaltyWarn(c))) return "terminate"; return plan - actual > S.pcfg.progressGap ? "warn" : "ok"; }
CON_PANELS.push(c => {
  const pr = isProcRole() && c.status !== "terminated", sv = c.supervision;
  if (!sv) return pr ? `<div class="body" style="padding-top:0"><button class="btn ghost" type="button" data-supon="${c.id}">${L("กำหนดให้มีผู้ควบคุมงานและรายงานรายสัปดาห์", "Add a supervisor and weekly reports")}</button></div>` : "";
  const R = sv.reports || [], lr = lastReport(c), cps = checkpoints(c);
  return `<div class="body" style="border-top:1px solid var(--line)"><div class="row"><b style="font-weight:600">${L("ผู้ควบคุมงานและความก้าวหน้า", "Supervision and progress")}</b><span class="sub">${L("ผู้ควบคุมงาน", "Supervisor")}: ${esc(sv.who || "—")}</span><span class="sub">· ${L("แผน ณ วันนี้", "planned today")} ${plannedPct(c, TODAY)}% · ${L("ล่าสุด", "latest")} ${lr ? lr.actual + "%" : "—"}</span></div>
    ${R.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("สัปดาห์", "Week of")}</th><th class="n">${L("ทำได้", "Actual")}</th><th class="n">${L("ตามแผน", "Planned")}</th><th>${L("หมายเหตุ", "Note")}</th></tr></thead><tbody>${R.map(r => `<tr><td>${fdate(r.d)}</td><td class="n">${r.actual}%</td><td class="n">${plannedPct(c, r.d)}%${plannedPct(c, r.d) - r.actual > S.pcfg.progressGap ? ` ${tag(L("ช้ากว่าแผน", "Behind"), "p-warn")}` : ""}</td><td class="sub">${esc(r.note)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${pr ? `<form class="inline-form" data-supform="${c.id}" style="margin-top:6px"><div class="f" style="flex:1 1 160px"><input type="text" name="who" value="${esc(sv.who || "")}" placeholder="${L("ชื่อผู้ควบคุมงาน", "Supervisor name")}" aria-label="${L("ผู้ควบคุมงาน", "Supervisor")}"></div><div class="f" style="flex:0 1 110px"><input type="number" name="actual" min="0" max="100" step="1" placeholder="%" aria-label="${L("ความก้าวหน้า", "Progress")}" required></div><div class="f" style="flex:2 1 200px"><input type="text" name="note" placeholder="${L("สรุปรายงานประจำสัปดาห์", "Weekly summary")}" aria-label="${L("หมายเหตุ", "Note")}"></div><button class="btn" type="submit">${L("บันทึกรายงาน", "Save the report")}</button></form>` : ""}
    <div style="margin-top:8px"><b style="font-weight:600">${L("จุดประเมิน", "Checkpoints")}</b></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("จุด", "Point")}</th><th>${L("วันที่", "Date")}</th><th>${L("ผล", "Result")}</th><th></th></tr></thead><tbody>${cps.map(p => `<tr><td>${p.k === "due" ? L("ครบกำหนดสัญญา", "Contract end") : p.k + "%"}</td><td>${fdate(p.d)}</td>
      <td>${p.a ? `${stTag(ASSESS_RES, p.a.result)} <span class="sub">${p.a.actual}% · ${esc(p.a.note)}</span>` : p.d <= TODAY ? tag(L("ถึงแล้ว รอประเมิน", "Due, not assessed"), "p-warn") : `<span class="sub">${L("ยังไม่ถึง", "Not yet")}</span>`}</td>
      <td>${pr && !p.a ? `<div class="row" style="flex-wrap:nowrap">${p.d > TODAY ? `<button class="btn ghost" type="button" data-cpdemo="${c.id}|${p.k}">${L("จำลอง: ถึงจุดนี้", "Demo: reach this point")}</button>` : `<select data-cpres="${c.id}|${p.k}" aria-label="${L("ผล", "Result")}">${Object.keys(ASSESS_RES).map(k => `<option value="${k}" ${k === suggestAssess(c, p.k, lr ? lr.actual : 0) ? "selected" : ""}>${tx(ASSESS_RES[k][0])}</option>`).join("")}</select><input type="text" id="cpn-${c.id}-${p.k}" placeholder="${L("บันทึกการประเมิน", "Assessment note")}" style="min-width:140px"><button class="btn" type="button" data-cpsave="${c.id}|${p.k}">${L("บันทึก", "Save")}</button>`}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>
    <div class="sub">${L("ครบกำหนดแล้วความก้าวหน้าต่ำกว่า", "At the end, progress under")} ${S.pcfg.dueProgressMin}% ${L("หรือค่าปรับเกินเพดาน ระบบเสนอให้พิจารณาบอกเลิก (ค่าตั้ง ระดับ B)", "or penalties over the cap suggest considering termination (settings, level B)")}</div></div>`;
});
CON_BINDS.push(done => {
  $$("[data-supon]").forEach(b => (b.onclick = () => { const c = famCon(b.dataset.supon); c.supervision = { who: "", reports: [], assess: [] }; audit(["กำหนดให้มีผู้ควบคุมงาน", "Added supervision"], c.id); done(); }));
  $$("[data-supform]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const c = famCon(f.dataset.supform), fd = new FormData(f), a = Math.round(Number(fd.get("actual")));
    if (!(a >= 0 && a <= 100)) { toast(L("ใส่ร้อยละ 0 ถึง 100", "Enter 0 to 100")); return; }
    c.supervision.who = String(fd.get("who") || "").trim(); c.supervision.reports.push({ d: TODAY, actual: a, note: String(fd.get("note") || "").trim(), by: me().id });
    audit(["บันทึกรายงานผู้ควบคุมงาน", "Recorded a supervisor report"], `${c.id} ${a}%`); done(plannedPct(c, TODAY) - a > S.pcfg.progressGap ? L("บันทึกแล้ว งานช้ากว่าแผน", "Saved; work is behind plan") : L("บันทึกแล้ว", "Saved")); }));
  $$("[data-cpdemo]").forEach(b => (b.onclick = () => { const [cid, k] = b.dataset.cpdemo.split("|"), c = famCon(cid), lr = lastReport(c), res = suggestAssess(c, k, lr ? lr.actual : 0);
    c.supervision.assess.push({ at: k, d: TODAY, actual: lr ? lr.actual : 0, result: res, note: L("จำลองการถึงจุดประเมิน", "Demo checkpoint"), by: me().id, demo: true }); done(); }));
  $$("[data-cpsave]").forEach(b => (b.onclick = () => { const [cid, k] = b.dataset.cpsave.split("|"), c = famCon(cid), lr = lastReport(c), res = $(`[data-cpres="${cid}|${k}"]`).value, note = $(`#cpn-${cid}-${k}`).value.trim();
    if (note.length < 5) { toastErr(L("บันทึกการประเมินอย่างน้อย 5 ตัวอักษร", "Write an assessment note")); return; }
    c.supervision.assess.push({ at: k, d: TODAY, actual: lr ? lr.actual : 0, result: res, note, by: me().id });
    audit(["บันทึกการประเมินความก้าวหน้า", "Recorded a progress assessment"], `${c.id} ${k} ${res}`);
    if (res === "terminate") notify(["exec", "prochead"], [`สัญญา ${c.id} ผลประเมินเสนอพิจารณาบอกเลิก`, `Contract ${c.id}: the assessment suggests termination`], "prc-contracts");
    done(); }));
});

// ---------- termination (R-15) ----------
const termReasons = c => { const r = []; if (penaltyWarn(c)) r.push(L("ค่าปรับสะสมเกินเพดานเตือน", "penalties over the warning cap")); const a = c.supervision && (c.supervision.assess || []).find(x => x.result === "terminate"); if (a) r.push(L("ผลประเมินเสนอบอกเลิก", "an assessment suggests termination")); if (c.phases.some(ph => !ph.cancelled && !phaseAccepted(ph) && phLate(ph) > 0)) r.push(L("มีงวดเลยกำหนด", "a phase is overdue")); return r; };
CON_PANELS.push(c => {
  if (c.status === "terminated") return `<div class="body" style="border-top:1px solid var(--line)"><div class="alert" style="margin:0"><div class="ic" style="background:var(--bad-soft);color:var(--bad)">!</div><div><b>${L("บอกเลิกสัญญาแล้ว", "Contract terminated")}</b><p>${esc(c.term.why)} · ${L("อนุมัติโดย", "approved by")} ${esc(userName(c.term.decided.by))} · ${fdate(c.term.decided.t)} · ${L("ริบหลักประกัน", "guarantee forfeited")} ${c.guarantee ? fmt(c.guarantee.amount) : "—"} ${L("บาท", "baht")}</p></div></div></div>`;
  const pr = isProcRole(), t = c.term, rs = termReasons(c);
  if (t && t.status === "pending") return `<div class="body" style="border-top:1px solid var(--line)"><b style="font-weight:600">${L("เสนอบอกเลิกสัญญา", "Termination proposed")}</b> ${tag(L("รอผู้บริหารอนุมัติ", "Waiting for the executive"), "p-warn")}<div class="sub">${esc(t.why)} · ${esc(userName(t.by))}</div>
    ${canSpend() ? `<div class="row" style="margin-top:6px"><button class="btn danger" type="button" data-termok="${c.id}">${L("อนุมัติบอกเลิก", "Approve the termination")}</button><button class="btn" type="button" data-termno="${c.id}">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}</div>`;
  if (!pr) return "";
  return `<div class="body" style="border-top:1px solid var(--line)"><details><summary class="sub" style="cursor:pointer">${L("บอกเลิกสัญญา (R-15)", "Terminate the contract (R-15)")}${rs.length ? ` · ${tag(rs.join(" · "), "p-warn")}` : ""}</summary>
    <div class="row" style="margin-top:6px"><input type="text" id="term-why-${c.id}" placeholder="${L("เหตุแห่งการบอกเลิก", "Grounds for termination")}" style="min-width:260px"><button class="btn danger" type="button" data-termask="${c.id}">${L("เสนอผู้บริหาร", "Propose to the executive")}</button></div>
    <div class="sub" style="margin-top:4px">${L("เมื่ออนุมัติ: ริบหลักประกัน ยกเลิกงวดที่ยังไม่ตรวจรับ ลดภาระผูกพันเหลือส่วนที่ตรวจรับแล้ว และเสนอชื่อผู้ขายเข้ากระบวนการพิจารณาผู้ทิ้งงาน (ระดับ B)", "On approval: the guarantee is forfeited, unaccepted phases are cancelled, the commitment drops to the accepted work, and the supplier is proposed for the abandoned-work list (level B)")}</div></details></div>`;
});
CON_BINDS.push(done => {
  $$("[data-termask]").forEach(b => (b.onclick = () => { const c = famCon(b.dataset.termask), why = $(`#term-why-${c.id}`).value.trim(); if (why.length < 10) { toastErr(L("ระบุเหตุอย่างน้อย 10 ตัวอักษร", "Give the grounds, at least 10 characters")); return; }
    c.term = { status: "pending", why, by: me().id, t: nowIso() }; audit(["เสนอบอกเลิกสัญญา", "Proposed a contract termination"], c.id); notify(["exec"], [`สัญญา ${c.id} เสนอบอกเลิก รออนุมัติ`, `Contract ${c.id}: termination proposed`], "prc-contracts"); done(L("ส่งผู้บริหารแล้ว", "Sent to the executive")); }));
  $$("[data-termno]").forEach(b => (b.onclick = () => { const c = famCon(b.dataset.termno); c.term.status = "rejected"; c.term.decided = { by: me().id, t: nowIso() }; const old = c.term; c.term = null; (c.termLog = c.termLog || []).push(old); audit(["ไม่อนุมัติบอกเลิกสัญญา", "Rejected a termination"], c.id); done(); }));
  $$("[data-termok]").forEach(b => (b.onclick = () => {
    const c = famCon(b.dataset.termok);
    if (!sodCheck("SD-08", sodActors("exec", "spend"), [c.term.by], c.id)) return;
    const acc = c.phases.filter(ph => phaseAccepted(ph));
    c.phases.filter(ph => !phaseAccepted(ph)).forEach(ph => (ph.cancelled = { date: TODAY }));
    const newAmt = sumv(acc.map(ph => ph.amount)), delta = newAmt - c.amount; c.amount = newAmt; c.ver = (c.ver || 1) + 1; (c.versions = c.versions || []).push({ v: c.ver, amount: c.amount, t: nowIso(), by: me().id, why: "terminated" });
    if (c.guarantee && c.guarantee.status === "held") c.guarantee.status = "forfeited";
    c.status = "terminated"; c.term.status = "approved"; c.term.decided = { by: me().id, t: nowIso() };
    const v = vendorBy(tx(c.vendor)); if (v) v.status = "proposed";
    (c.letters = c.letters || []).push({ id: `${c.id}-L${c.letters.length + 1}`, type: "terminate", text: letterText(c, "terminate"), t: nowIso(), by: me().id, sent: null });
    const cs = caseByPlan(c.plan); if (cs) caseLog(cs, "contract", `${L("บอกเลิก", "terminated")} · ${fmt(delta)}`);
    audit(["อนุมัติบอกเลิกสัญญา", "Approved a contract termination"], `${c.id} ${fmt(delta)}`);
    notify(["fin", "proc", "audit"], [`สัญญา ${c.id} บอกเลิกแล้ว ภาระผูกพันลด ${fmt(-delta)} บาท`, `Contract ${c.id} terminated; commitment down ${fmt(-delta)} baht`], "fnc-chain");
    done(L("บอกเลิกแล้ว ร่างหนังสือบอกเลิกรอส่ง", "Terminated; the termination letter is drafted"));
  }));
});

// ---------- warranty and defects (R-16) ----------
const lastAcceptDate = c => { const live = c.phases.filter(ph => !ph.cancelled); if (!live.length || !live.every(phaseAccepted)) return null; return live.map(ph => ph.signs[ph.signs.length - 1].t.slice(0, 10)).sort().slice(-1)[0]; };
const addMonths = (iso, m) => { const [y, mo, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, mo - 1 + m, d)).toISOString().slice(0, 10); };
const warrantyEnd = c => { const a = lastAcceptDate(c); return a ? addMonths(a, c.warrantyMonths || 0) : null; };
const warrantyOver = c => !c.warrantyMonths || c.warrantyDemoOver || (warrantyEnd(c) && warrantyEnd(c) <= TODAY);
const openDefects = c => (c.defects || []).filter(d => d.status === "open");
const canReturnGuar = c => c.status !== "terminated" && c.phases.filter(ph => !ph.cancelled).every(ph => phPaid(c, ph)) && warrantyOver(c) && !openDefects(c).length;
CON_PANELS.push(c => {
  if (c.status === "terminated") return "";
  const pr = isProcRole(), we = warrantyEnd(c), D = c.defects || [];
  return `<div class="body" style="border-top:1px solid var(--line)"><div class="row"><b style="font-weight:600">${L("ระยะรับประกันความชำรุดบกพร่อง", "Warranty period")}</b><span class="sub">${c.warrantyMonths || 0} ${L("เดือน", "months")}</span>
      ${!c.warrantyMonths ? tag(L("ไม่มี", "None"), "p-mute") : we ? (warrantyOver(c) ? tag(L("พ้นระยะแล้ว", "Ended"), "p-ok") : tag(`${L("ถึง", "until")} ${fdate(we)}`, "p-info")) : `<span class="sub">${L("เริ่มนับเมื่อตรวจรับงวดสุดท้าย", "starts when the last phase is accepted")}</span>`}
      ${pr && we && !warrantyOver(c) ? `<button class="btn ghost" type="button" data-wdemo="${c.id}">${L("จำลอง: พ้นระยะรับประกัน", "Demo: the warranty ends")}</button>` : ""}</div>
    ${D.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("การแจ้งซ่อม", "Defect")}</th><th>${L("แจ้ง", "Reported")}</th><th>${L("ต้องแก้ภายใน", "Fix by")}</th><th>${L("สถานะ", "Status")}</th></tr></thead><tbody>${D.map((d, i) => `<tr><td>${esc(d.desc)}</td><td class="sub">${fdate(d.t)}</td><td class="sub">${fdate(d.due)}${d.status === "open" && d.due < TODAY ? ` ${tag(L("เลยกำหนด", "Overdue"), "p-bad")}` : ""}</td><td>${d.status === "open" ? (pr ? `<button class="btn" type="button" data-dfix="${c.id}|${i}">${L("บันทึกว่าแก้แล้ว", "Mark fixed")}</button>` : tag(L("รอแก้", "Open"), "p-warn")) : tag(L("แก้แล้ว", "Fixed"), "p-ok")}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${pr && we ? `<form class="inline-form" data-dform="${c.id}" style="margin-top:6px"><div class="f" style="flex:2 1 220px"><input type="text" name="desc" placeholder="${L("อาการชำรุดที่พบ", "What is defective")}" aria-label="${L("การแจ้งซ่อม", "Defect")}" required></div><div class="f" style="flex:0 1 110px"><input type="number" name="days" min="1" step="1" value="15" aria-label="${L("วันให้แก้", "Days to fix")}"></div><button class="btn" type="submit">${L("แจ้งซ่อม", "Report a defect")}</button></form>` : ""}
    <div class="sub">${L("คืนหลักประกันได้เมื่อจ่ายครบ พ้นระยะรับประกัน และไม่มีการแจ้งซ่อมค้าง", "The guarantee can be returned once fully paid, the warranty has ended and no defect is open")}</div></div>`;
});
CON_BINDS.push(done => {
  $$("[data-wdemo]").forEach(b => (b.onclick = () => { const c = famCon(b.dataset.wdemo); c.warrantyDemoOver = true; done(L("จำลอง: พ้นระยะรับประกันแล้ว", "Demo: the warranty has ended")); }));
  $$("[data-dform]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const c = famCon(f.dataset.dform), fd = new FormData(f), days = Math.max(1, Math.round(Number(fd.get("days")) || 15));
    (c.defects = c.defects || []).push({ desc: String(fd.get("desc")).trim(), t: TODAY, due: addDays(TODAY, days), status: "open", by: me().id });
    (c.letters = c.letters || []).push({ id: `${c.id}-L${c.letters.length + 1}`, type: "defect", text: letterText(c, "defect"), t: nowIso(), by: me().id, sent: null });
    audit(["แจ้งซ่อมในระยะรับประกัน", "Reported a defect under warranty"], c.id); done(L("บันทึกแล้ว ร่างหนังสือแจ้งซ่อมรอส่ง", "Saved; a repair notice is drafted")); }));
  $$("[data-dfix]").forEach(b => (b.onclick = () => { const [cid, i] = b.dataset.dfix.split("|"), c = famCon(cid); c.defects[Number(i)].status = "fixed"; c.defects[Number(i)].fixed = TODAY; audit(["บันทึกการแก้ไขชำรุด", "Recorded a defect fixed"], cid); done(); }));
});

// ---------- letters (FR-PR-48) ----------
function letterText(c, type) {
  const p = famPlan(c.plan), ph = c.phases.find(x => !x.cancelled && !phaseAccepted(x)), pen = conPenalty(c), head = `เรียน ${tx(c.vendor)}\nเรื่อง ${LETTER_T[type][0]} สัญญาเลขที่ ${c.no} (${tx(p.name)})\n`;
  const body = { remind: `ตามสัญญา กำหนดส่งมอบ${ph ? ` ${tx(ph.name)} ภายใน ${fdate(phDue(ph))}` : ""} ขอให้ส่งมอบตามกำหนด มิฉะนั้นจะคิดค่าปรับตามสัญญา`,
    penalty: `งานส่งมอบล่าช้ากว่ากำหนด ค่าปรับสะสม ณ วันที่ ${fdate(TODAY)} เป็นเงิน ${fmt(pen)} บาท ซึ่งจะหักจากเงินค่างวด`,
    reject: `คณะกรรมการตรวจรับพบว่างานที่ส่งมอบไม่ถูกต้องหรือไม่ครบถ้วน (รับบางส่วนหรือมีความเห็นแย้ง) ขอให้แก้ไขและส่งมอบใหม่`,
    defect: `พบความชำรุดบกพร่องภายในระยะรับประกัน ขอให้ซ่อมแก้ไขให้แล้วเสร็จภายในกำหนดในหนังสือนี้`,
    terminate: `เนื่องจาก${c.term ? c.term.why : "ผู้ขายผิดสัญญา"} จึงบอกเลิกสัญญา และริบหลักประกันสัญญาตามเงื่อนไขในสัญญา` }[type];
  return `${head}\n${body}\n\nลงวันที่ ${fdate(TODAY)}\n[ร่างจากแม่แบบ ตรวจก่อนลงนาม]`;
}
const rejectDue = c => c.phases.filter(ph => (ph.result === "partial" || (ph.dissent || []).length) && ph.signs.length).map(ph => ({ ph, due: addWorkdays((ph.signs[0] || { t: nowIso() }).t.slice(0, 10), S.pcfg.rejectNoticeWd) })).filter(x => !(c.letters || []).some(l => l.type === "reject" && l.sent));
CON_PANELS.push(c => {
  const pr = isProcRole(), Ls = c.letters || [], rd = rejectDue(c);
  if (!pr && !Ls.length) return "";
  return `<div class="body" style="border-top:1px solid var(--line)"><div class="row"><b style="font-weight:600">${L("หนังสือถึงผู้ขาย", "Letters to the supplier")}</b>${rd.length ? tag(`${L("ต้องแจ้งผลตรวจรับไม่ถูกต้องภายใน", "Rejection notice due by")} ${fdate(rd[0].due)}`, rd[0].due < TODAY ? "p-bad" : "p-warn") : ""}</div>
    ${Ls.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ชนิด", "Type")}</th><th>${L("ร่างเมื่อ", "Drafted")}</th><th>${L("ส่งแล้ว", "Sent")}</th></tr></thead><tbody>${Ls.map((l, i) => `<tr><td class="mono">${l.id}</td><td>${tx(LETTER_T[l.type])}<details><summary class="sub" style="cursor:pointer">${L("ดูข้อความ", "View")}</summary><pre style="white-space:pre-wrap;font-family:var(--font);font-size:12.5px;margin:6px 0 0">${esc(l.text)}</pre></details></td><td class="sub">${fdate(l.t, true)}</td><td>${l.sent ? fdate(l.sent) : pr ? `<button class="btn" type="button" data-lsent="${c.id}|${i}">${L("บันทึกว่าส่งแล้ว", "Mark as sent")}</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${pr ? `<div class="row" style="margin-top:6px"><select id="lt-${c.id}" aria-label="${L("ชนิดหนังสือ", "Letter type")}">${["remind", "penalty", "reject"].map(k => `<option value="${k}">${tx(LETTER_T[k])}</option>`).join("")}</select><button class="btn" type="button" data-lnew="${c.id}">${L("ร่างจากแม่แบบ", "Draft from the template")}</button></div>` : ""}</div>`;
});
CON_BINDS.push(done => {
  $$("[data-lnew]").forEach(b => (b.onclick = () => { const c = famCon(b.dataset.lnew), type = $(`#lt-${c.id}`).value;
    if (type === "penalty" && !conPenalty(c)) { toast(L("ยังไม่มีค่าปรับ", "No penalty yet")); return; }
    (c.letters = c.letters || []).push({ id: `${c.id}-L${c.letters.length + 1}`, type, text: letterText(c, type), t: nowIso(), by: me().id, sent: null }); audit(["ร่างหนังสือถึงผู้ขาย", "Drafted a letter to the supplier"], `${c.id} ${type}`); done(L("ร่างแล้ว", "Drafted")); }));
  $$("[data-lsent]").forEach(b => (b.onclick = () => { const [cid, i] = b.dataset.lsent.split("|"), c = famCon(cid), l = c.letters[Number(i)]; l.sent = TODAY; audit(["ส่งหนังสือถึงผู้ขาย", "Sent a letter to the supplier"], `${cid} ${l.id}`); done(L("บันทึกวันส่งแล้ว", "Sent date recorded")); }));
});

// ---------- case closing now also needs warranty and defects settled ----------
closeChecks = cs => {
  const c = caseCon(cs), ok = (v, th, en) => ({ ok: !!v, label: L(th, en) }), live = c.phases.filter(ph => !ph.cancelled);
  return [ok(live.every(phaseAccepted), "ตรวจรับครบทุกงวด (ไม่นับงวดที่ยกเลิกจากการบอกเลิก)", "Every phase accepted (cancelled phases excluded)"), ok(live.every(ph => phPaid(c, ph)), "เบิกจ่ายครบทุกงวด", "Every phase paid"),
    ok(!c.guarantee || c.guarantee.status !== "held", "คืนหรือริบหลักประกันแล้ว", "The guarantee is returned or forfeited"), ok(c.status === "terminated" || (warrantyOver(c) && !openDefects(c).length), "พ้นระยะรับประกันและไม่มีการแจ้งซ่อมค้าง", "Warranty ended with no open defect"),
    ok(!(c.vars || []).some(v => v.status === "pending") && !c.phases.some(openDissent) && !(c.term && c.term.status === "pending"), "ไม่มีการแก้ไขสัญญา ความเห็นแย้ง หรือการบอกเลิกค้าง", "No pending change, dissent or termination")];
};

{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "suppliers") bindSuppliers(); };
}
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.vendors) return;
    if (isProcRole()) S.contracts.filter(conLive).forEach(c => {
      if (c.supervision) { checkpoints(c).filter(p => p.d <= TODAY && !p.a).forEach(p => R(`${L("ประเมินความก้าวหน้า", "Assess progress")} ${c.id} ${p.k === "due" ? L("ครบกำหนด", "end") : p.k + "%"}`, fdate(p.d), p.d, "prc-contracts", "p-warn"));
        const lr = lastReport(c); if (!lr || dayDiff(lr.d, TODAY) > S.pcfg.supReportDays) R(`${L("รับรายงานผู้ควบคุมงาน", "Get the supervisor's report")} ${c.id}`, lr ? `${L("ล่าสุด", "last")} ${fdate(lr.d)}` : "", TODAY, "prc-contracts", "p-info"); }
      rejectDue(c).forEach(x => R(`${L("ส่งหนังสือแจ้งผลตรวจรับไม่ถูกต้อง", "Send the rejection notice")} ${c.id} ${tx(x.ph.name)}`, `${L("ภายใน", "by")} ${fdate(x.due)}`, x.due, "prc-contracts", x.due < TODAY ? "p-bad" : "p-warn"));
      openDefects(c).filter(d => d.due < TODAY).forEach(d => R(`${L("ติดตามการแก้ชำรุด", "Chase a defect repair")} ${c.id}`, d.desc, d.due, "prc-contracts", "p-bad"));
    });
    if (canSpend()) S.contracts.filter(c => c.term && c.term.status === "pending").forEach(c => R(`${L("พิจารณาบอกเลิกสัญญา", "Decide a termination")} ${c.id}`, c.term.why, TODAY, "prc-contracts", "p-bad"));
  };
}

// ---------- seed ----------
function seedLate(s, K) {
  Object.assign(s.pcfg, { warrantyMonths: 12, dueProgressMin: 85, progressGap: 10, rejectNoticeWd: 3, supReportDays: 7 });
  const tax = seed => { const d = String(seed).padStart(12, "0").slice(-12); let x = 0; for (let i = 0; i < 12; i++) x += Number(d[i]) * (13 - i); return d + ((11 - (x % 11)) % 10); };
  const names = [...new Set([...s.contracts.map(c => c.vendor[0]), ...s.cases.flatMap(c => (c.bids || []).map(b => b.name)), "บริษัท ตัวอย่างอบรม จำกัด", "สถาบันตัวอย่างพัฒนาบุคลากร"])];
  s.vendors = names.map((n, i) => ({ id: "V-" + String(i + 1).padStart(3, "0"), name: n, taxId: tax(10555000000 + i * 7919), type: /ห้างหุ้นส่วน/.test(n) ? "partnership" : /สถาบัน/.test(n) ? "person" : "company", sme: i % 2 === 1, local: i % 3 === 0, contact: "", status: "active" }));
  s.blacklist = { rows: [{ name: "บริษัท ทิ้งงานตัวอย่าง จำกัด", taxId: tax(10555999001), since: "2025-03-01", ref: "หนังสือแจ้งเวียน (ตัวอย่าง) 12/2568" }, { name: "ห้างหุ้นส่วนจำกัด ตัวอย่างละทิ้งงาน", taxId: tax(10555999002), since: "2026-01-15", ref: "หนังสือแจ้งเวียน (ตัวอย่าง) 3/2569" }],
    imports: [{ id: `BL-2570-01`, t: "2026-10-01T09:00", by: K.PO, n: 2 }] };
  s.contracts.forEach((c, i) => { c.warrantyMonths = 12 * (i + 1); c.defects = []; c.letters = []; c.supervision = null; });
  const c2 = s.contracts[1];
  if (c2) c2.supervision = { who: "นายช่างตัวอย่าง ใจดี", reports: [{ d: "2026-10-09", actual: 6, note: "เริ่มงานตามแผน", by: K.PO }, { d: "2026-10-16", actual: 9, note: "งานงวดแรกส่งมอบช้า 1 วัน", by: K.PO }], assess: [] };
}
