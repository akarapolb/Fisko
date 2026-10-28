// M08 deeper feature (round 10): project evaluation on a logframe with five criteria. Lessons from a
// finished evaluation are shown to Planning in the M01 project bank when it scores new ideas.
PERF_TABS.push({ id: "evaluate", label: ["ประเมินโครงการ", "Project evaluation"] });
const EV_CRIT = [["ความสอดคล้อง", "Relevance"], ["ประสิทธิผล", "Effectiveness"], ["ประสิทธิภาพ", "Efficiency"], ["ผลกระทบ", "Impact"], ["ความยั่งยืน", "Sustainability"]];
let EV_OPEN = null;
const evScore = e => { const r = e.ratings.filter(Boolean); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null; };
// An evaluation can be of last year's project (round C4 keeps FY2569 in S.y2569).
const evProj = e => S.dash.projects.find(p => p.id === e.proj) || ((S.y2569 || {}).dash || { projects: [] }).projects.find(p => p.id === e.proj);

PERF.evaluate = () => {
  const E = S.evals || [], pl = ROLE === "plan";
  if (!E.find(e => e.id === EV_OPEN)) EV_OPEN = (E.find(e => e.status === "draft") || E[0] || {}).id || null;
  const e = E.find(x => x.id === EV_OPEN), free = S.dash.projects.filter(p => p.type !== "per" && !E.some(x => x.proj === p.id));
  return `
  <section class="panel"><header><h2>${L("การประเมินโครงการ", "Project evaluations")}</h2><span class="sp"></span><span class="sub">${L("เกณฑ์ 5 ด้าน คะแนน 1–5", "Five criteria, scored 1–5")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("โครงการ", "Project")}</th><th class="n">${L("คะแนนเฉลี่ย", "Average")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${E.map(x => { const p = evProj(x), sc = evScore(x); return `<tr class="${x.id === EV_OPEN ? "sel" : ""}"><td class="mono">${x.id}</td><td>${p ? esc(tx(p.name)) : x.proj}<div class="sub">${p ? unitName(p.unit) : ""}</div></td>
        <td class="n">${sc ? fmt(sc, 1) + " / 5" : "—"}</td><td>${x.status === "done" ? tag(L("เสร็จสิ้น", "Done"), "p-ok") : tag(L("ร่าง", "Draft"), "p-warn")}</td>
        <td><div class="row" style="flex-wrap:nowrap"><button class="btn" type="button" data-evopen="${x.id}">${L("เปิด", "Open")}</button>${historyBtn(x.id, x.id)}</div></td></tr>`; }).join("") || `<tr><td colspan="5" class="sub">${L("ยังไม่มีการประเมิน", "No evaluations yet")}</td></tr>`}</tbody></table></div>
    ${pl && free.length ? `<div class="body"><form class="inline-form" id="ev-new"><div class="f" style="flex:2 1 260px"><label for="ev-proj">${L("เริ่มประเมินโครงการ", "Start an evaluation")}</label>
      <select id="ev-proj">${free.map(p => `<option value="${p.id}">${unitName(p.unit)} · ${esc(tx(p.name))}</option>`).join("")}</select></div><button class="btn primary" type="submit">${L("สร้างแบบประเมิน", "Create")}</button></form></div>` : ""}</section>
  ${e ? evDetail(e, pl && e.status === "draft") : ""}`;
};
function evDetail(e, ed) {
  const p = evProj(e), o = p && S.perf.outputs[p.id], k = o && o.kpi ? S.perf.kpis[o.kpi] : null, kk = o && o.kpi ? findKpi(o.kpi) : null, ms = S.proc && S.proc[p.id];
  const done = ms ? ms.filter(m => m.actual).length : null, ds = ed ? "" : "disabled";
  const row = (lvl, cls, what, plan, act, note) => `<tr><td><span class="lvl ${cls}">${lvl}</span></td><td>${what}</td><td class="n">${plan}</td><td class="n">${act}</td><td class="sub">${note || ""}</td></tr>`;
  return `
  <section class="panel"><header><h2>${e.id} · ${p ? esc(tx(p.name)) : ""}</h2><span class="sp"></span><span class="sub">${p ? unitName(p.unit) : ""} · ${fyLabel(S.dash.fy)}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th style="width:110px">${L("ระดับ", "Level")}</th><th>${L("ตัวชี้วัด / สิ่งที่วัด", "Measure")}</th><th class="n">${L("แผน / เป้า", "Plan / target")}</th><th class="n">${L("ผล", "Result")}</th><th>${L("หมายเหตุ", "Note")}</th></tr></thead>
      <tbody>${row(L("ปัจจัยนำเข้า", "Input"), "input", L("งบประมาณ (ลบ.)", "Budget (M baht)"), fmt(p.alloc, 1), fmt(p.actual, 1), `${fmt(pct(p.actual, p.plan), 0)}% ${L("ของแผน ณ วันที่ข้อมูล", "of plan to date")}`)}
        ${row(L("กิจกรรม", "Activity"), "activity", ms ? L("ขั้นตอนจัดซื้อจัดจ้าง", "Procurement milestones") : L("ดำเนินงานตามแผน", "Work to plan"), ms ? "5" : "—", ms ? String(done) : "—", ms ? `${L("จาก M07", "from M07")}` : "")}
        ${o ? row(L("ผลผลิต", "Output"), "output", esc(tx(o.name)), `${fmtv(o.target)} ${tx(o.unit)}`, o.result == null ? "—" : fmtv(o.result), achTag(achv(o.result, o.target))) : ""}
        ${k && kk ? row(L("ผลลัพธ์", "Outcome"), "outcome", `${kk.id} ${esc(tx(kk.name))}`, `${fmtv(k.target)} ${tx(kk.unit)}`, k.result == null ? "—" : fmtv(k.result), achTag(achv(k.result, k.target))) : ""}</tbody></table></div>
    <div class="body" style="display:flex;flex-direction:column;gap:14px">
      <div class="ev-grid">${EV_CRIT.map((c, i) => `<div class="f"><label for="evr-${i}">${tx(c)}</label><select id="evr-${i}" data-evr="${i}" ${ds}><option value="0">—</option>${[1, 2, 3, 4, 5].map(v => `<option ${e.ratings[i] === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>`).join("")}</div>
      <div class="f"><label for="ev-find">${L("ข้อค้นพบ", "Findings")}</label><textarea id="ev-find" rows="3" ${ds}>${esc(tx(e.findings))}</textarea></div>
      <div class="f"><label>${L("บทเรียน (ส่งต่อคลังโครงการ M01)", "Lessons (passed to the M01 project bank)")}</label>
        <ul class="check">${e.lessons.map(l => `<li><span class="m ok">✓</span><div>${esc(tx(l))}</div></li>`).join("") || `<li class="sub">${L("ยังไม่มีบทเรียน", "No lessons yet")}</li>`}</ul>
        ${ed ? `<div class="row" style="flex-wrap:nowrap"><input type="text" id="ev-lesson" style="flex:1" placeholder="${L("เช่น เริ่มทำ TOR ก่อนได้รับงบประมาณ", "e.g. start the TOR before funds arrive")}"><button class="btn" type="button" id="ev-addl">+ ${L("เพิ่มบทเรียน", "Add lesson")}</button></div>` : ""}</div>
      ${ed ? `<div class="row"><button class="btn" type="button" id="ev-save">${L("บันทึกร่าง", "Save draft")}</button><button class="btn primary" type="button" id="ev-done">${L("ประเมินเสร็จ · ส่งบทเรียนเข้าคลังโครงการ", "Finish · send lessons to the project bank")}</button></div>` : ""}</div></section>`;
}
function bindEvaluate() {
  $$("[data-evopen]").forEach(b => (b.onclick = () => { EV_OPEN = b.dataset.evopen; route(); }));
  const nf = $("#ev-new");
  if (nf) nf.onsubmit = ev => {
    ev.preventDefault();
    const fy = fyOf(TODAY), id = `EV-${fy}-${String(S.evals.filter(x => String(x.id).startsWith(`EV-${fy}-`)).length + 1).padStart(2, "0")}`;
    S.evals.push({ id, proj: $("#ev-proj").value, status: "draft", t: nowIso(), by: me().id, ratings: [0, 0, 0, 0, 0], findings: ["", ""], lessons: [] });
    EV_OPEN = id; audit(["สร้างแบบประเมินโครงการ", "Started a project evaluation"], id); commit(); route();
  };
  const e = (S.evals || []).find(x => x.id === EV_OPEN);
  if (!e || e.status !== "draft") return;
  const grab = () => { e.ratings = EV_CRIT.map((c, i) => Number($("#evr-" + i).value)); const f = $("#ev-find").value; e.findings = [f, f]; };
  const al = $("#ev-addl");
  if (al) al.onclick = () => { const v = $("#ev-lesson").value.trim(); if (!v) return; grab(); e.lessons.push([v, v]); save(); route(); };
  const sv = $("#ev-save"); if (sv) sv.onclick = () => { grab(); audit(["บันทึกร่างการประเมินโครงการ", "Saved an evaluation draft"], e.id); commit(); toast(L("บันทึกร่างแล้ว", "Draft saved")); };
  const dn = $("#ev-done");
  if (dn) dn.onclick = () => {
    grab();
    if (e.ratings.some(r => !r)) { toast(L("ให้คะแนนให้ครบทั้ง 5 ด้านก่อน", "Score all five criteria first")); return; }
    if (!tx(e.findings).trim() || !e.lessons.length) { toastErr(L("ใส่ข้อค้นพบและบทเรียนอย่างน้อย 1 ข้อ", "Add findings and at least one lesson")); return; }
    e.status = "done"; e.t = nowIso();
    const unit = evProj(e).unit;
    e.lessons.forEach((l, i) => S.lessons.push({ id: `${e.id}-L${i + 1}`, eval: e.id, unit, text: l, t: e.t }));
    audit(["ประเมินโครงการเสร็จสิ้น", "Finished a project evaluation"], `${e.id} · ${fmt(evScore(e), 1)}/5`);
    notify(["plan", "exec"], [`ประเมินโครงการ ${e.id} เสร็จแล้ว มีบทเรียน ${e.lessons.length} ข้อในคลังโครงการ`, `Evaluation ${e.id} is done; ${e.lessons.length} lessons are in the project bank`], "strat-bank");
    commit(); route(); toast(L("ประเมินเสร็จ · บทเรียนแสดงในคลังโครงการ M01", "Done · lessons now show in the M01 project bank"));
  };
}
{
  const base = BIND.performance;
  BIND.performance = () => { base(); if (PERF_TAB === "evaluate") bindEvaluate(); };
  // M01 project bank: lessons from finished evaluations, shown while Planning scores ideas.
  const bank = STRAT.bank;
  STRAT.bank = () => {
    const ls = S.lessons || [];
    return bank() + (ls.length ? `<section class="panel"><header><h2>${L("บทเรียนจากการประเมินโครงการ (M08)", "Lessons from project evaluations (M08)")}</h2><span class="sp"></span><span class="sub">${L("ใช้ประกอบการให้คะแนนความพร้อมและความเสี่ยง", "Use them when scoring readiness and risk")}</span></header>
      <div class="body"><ul class="check">${ls.map(l => `<li><span class="m wa">!</span><div>${esc(tx(l.text))}<div class="sub">${unitName(l.unit)} · <span class="mono">${l.eval}</span> · ${fdate(l.t)}</div></div></li>`).join("")}</ul></div></section>` : "");
  };
}
