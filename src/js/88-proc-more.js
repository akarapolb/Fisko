// Round 59: the Procurement CRUD items left open after round PC4. Evaluation criteria become editable rows (FR-PC-14);
// the e-GP notice can be corrected after it is announced, with a reason, until bids close (FR-PC-15); delivery
// notices get a number with Simulate (SIM-PC-05). The cumulative change ladder is in 63-contracts.js (varCum) and
// replacing committee members with a reason after declarations start is in 85-case-crud.js (csCm).
Object.assign(CASE_EV, { egp_edit: ["แก้ไขประกาศ e-GP", "e-GP notice corrected"], criteria_row: ["แก้เกณฑ์พิจารณา", "Criteria changed"] });

// ---------- evaluation criteria rows (FR-PC-14) ----------
// Price is always one of the criteria (critOk); other rows can be added, renamed, reweighted and removed until the
// announcement. The total must be 100 before the case can move on, as before.
const ctEd = c => !!c && canEditCase(c) && caseState(c) === 4 && needsCompetition(c);
CRUD.def("csCrit", {
  noun: ["เกณฑ์พิจารณา", "Criterion"], list: () => { const c = csCase(); return c && c.criteria ? c.criteria : []; }, id: k => k.k, title: k => tx(k.name), sub: k => `${L("น้ำหนัก", "weight")} ${k.w}`,
  cols: [{ h: ["เกณฑ์", "Criterion"], c: k => `${esc(tx(k.name))}${k.k === "price" ? ` <span class="sub">(${L("บังคับ", "required")})</span>` : ""}` }, { h: ["น้ำหนัก", "Weight"], n: true, c: k => k.w }],
  fields: k => [k && k.k === "price" ? { id: "th", label: ["ชื่อเกณฑ์", "Name"], lock: true, value: tx(k.name) } : { id: "th", label: ["ชื่อเกณฑ์ (ไทย)", "Name (Thai)"], req: true, wide: true, value: k ? k.name[0] : "" },
    ...(k && k.k === "price" ? [] : [{ id: "en", label: ["ชื่อเกณฑ์ (อังกฤษ)", "Name (English)"], wide: true, value: k ? k.name[1] : "" }]),
    { id: "w", label: ["น้ำหนัก (0 ถึง 100)", "Weight (0 to 100)"], type: "number", req: true, min: 0, max: 100, value: k ? k.w : 10, hint: L("น้ำหนักรวมทุกเกณฑ์ต้องเท่ากับ 100 ก่อนประกาศ", "All weights must add up to 100 before the announcement") }],
  check: (v, k) => { const c = csCase(), others = sumv(c.criteria.filter(x => x !== k).map(x => x.w)), e = [];
    if (!(v.w >= 0 && v.w <= 100)) e.push({ f: "w", m: L("ใส่ 0 ถึง 100", "Enter 0 to 100") }); else if (others + v.w > 100) e.push({ f: "w", m: L(`รวมแล้วเกิน 100 (เกณฑ์อื่นรวม ${others})`, `The total would pass 100 (the others add up to ${others})`) });
    if (!k && c.criteria.some(x => tx(x.name) === v.th)) e.push({ f: "th", m: L("มีเกณฑ์ชื่อนี้แล้ว", "Already a criterion") }); return e; },
  create: { can: () => ctEd(csCase()) && (csCase().criteria || []).length > 0, label: ["เพิ่มเกณฑ์", "Add a criterion"], run: v => {
    const c = csCase(), k = { k: "c" + (maxNo(c.criteria.map(x => x.k), /^c(\d+)/) + 1), name: [v.th, v.en || v.th], w: Math.round(v.w) }; c.criteria.push(k); caseLog(c, "criteria_row", `+ ${v.th} ${k.w}`); return k; } },
  edit: { can: () => ctEd(csCase()), run: (k, v) => { const c = csCase(); if (k.k !== "price") k.name = [v.th, v.en || v.th]; k.w = Math.round(v.w); caseLog(c, "criteria_row", `${tx(k.name)} ${k.w}`); } },
  acts: k => (ctEd(csCase()) && k.k !== "price" ? [{ id: "del", label: L("ลบเกณฑ์", "Delete"), kind: "danger", confirm: L("ลบเกณฑ์นี้ แล้วปรับน้ำหนักเกณฑ์อื่นให้รวมเป็น 100", "Delete this criterion, then reweight the others to 100"),
    run: () => { const c = csCase(); c.criteria = c.criteria.filter(x => x !== k); caseLog(c, "criteria_row", `− ${tx(k.name)}`); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: k => kv([[L("น้ำหนัก", "Weight"), k.w], [L("รวมทุกเกณฑ์", "All criteria"), sumv(((csCase() || {}).criteria || []).map(x => x.w))]]),
  hist: () => (csCase() ? csCase().id : ""),
});

// ---------- correcting the e-GP notice after the announcement (FR-PC-15) ----------
CASE_PANELS.push(c => {
  if (!canEditCase(c) || caseState(c) !== 5 || !c.egp || c.closeElapsed || c.egp.close <= TODAY) return "";
  const A = c.egp.amends || [];
  return `<section class="panel"><header><h2>${L("แก้ไขประกาศ e-GP", "Correct the e-GP notice")}</h2><span class="sp"></span><span class="sub">${L("ก่อนปิดรับข้อเสนอ ทุกครั้งต้องมีเหตุผลและเก็บค่าเดิมไว้", "Before bids close; every change needs a reason and keeps the old values")}</span></header>
    ${A.length ? `<div class="body sub">${A.map(a => `${fdate(a.t, true)} · ${esc(userName(a.by))} · ${esc(a.from.no)} ${fdate(a.from.close)} → ${esc(a.to.no)} ${fdate(a.to.close)} · ${esc(a.why)}`).join("<br>")}</div>` : ""}
    <div class="body"><form class="inline-form" id="egp-edit"><div class="f" style="flex:1 1 180px"><label for="ege-no">${L("รหัสโครงการ e-GP", "e-GP project no.")}</label><input type="text" id="ege-no" value="${esc(c.egp.no)}" required></div>
      <div class="f" style="flex:0 1 170px"><label for="ege-close">${L("วันสุดท้ายยื่นข้อเสนอ", "Closing date")}</label><input type="date" id="ege-close" value="${c.egp.close}" min="${TODAY}" required></div>
      <div class="f" style="flex:2 1 240px"><label for="ege-why">${L("เหตุผลที่แก้ไข", "Why it changes")}</label><input type="text" id="ege-why" required></div>
      <button class="btn" type="submit">${L("บันทึกการแก้ไข", "Save the correction")}</button></form></div></section>`;
});
CASE_BINDS.push((c, done) => {
  const f = $("#egp-edit"); if (!f) return;
  f.onsubmit = e => { e.preventDefault(); const no = $("#ege-no").value.trim(), close = $("#ege-close").value, why = $("#ege-why").value.trim();
    if (why.length < 10) { toast(L("ระบุเหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters")); return; }
    if (!no || !close || close < c.egp.announce) { toast(L("วันปิดรับต้องไม่ก่อนวันประกาศ", "The closing date can't be before the announcement")); return; }
    if (no === c.egp.no && close === c.egp.close) { toast(L("ยังไม่มีอะไรเปลี่ยน", "Nothing changed")); return; }
    (c.egp.amends = c.egp.amends || []).push({ from: { no: c.egp.no, close: c.egp.close }, to: { no, close }, why, by: me().id, t: nowIso() });
    c.egp.no = no; c.egp.close = close; c.closeElapsed = false; const p = famPlan(c.plan); if (p.egp) p.egp.no = no;
    audit(["แก้ไขประกาศ e-GP", "Corrected the e-GP notice"], `${c.id} ${no} · ${why}`); caseLog(c, "egp_edit", `${no} · ${fdate(close)} · ${why}`); done(L("บันทึกการแก้ไขแล้ว", "Correction saved")); };
});

// ---------- delivery notice numbers (SIM-PC-05) ----------
CON_BINDS.push(() => {
  $$("[data-dlsim]").forEach(b => (b.onclick = () => { const [cid, n] = b.dataset.dlsim.split("|"), c = famCon(cid), ph = c.phases.find(x => x.n === Number(n)), f = b.closest("form");
    f.ref.value = `DN-${FAM_FY % 100}-${c.id.slice(-3)}${ph.n}`; f.d.value = TODAY < phDue(ph) ? TODAY : phDue(ph) < c.signed ? c.signed : TODAY; f.ref.focus(); toast(L("เติมหนังสือส่งมอบจำลองจากผู้ขายแล้ว ตรวจก่อนบันทึก", "Simulated delivery notice from the supplier filled in; check it before saving")); }));
});
