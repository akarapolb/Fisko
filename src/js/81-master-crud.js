// Strategy and master data on the shared list + drawer (round C5, Budget CRUD design 6.1, 6.8 and 6.10,
// FR-C-01 to FR-C-05, FR-C-38, FR-C-45 to FR-C-52, FL-10, R-C-04 and R-C-06).
// Master data that is already used is never deleted: it is retired (`retired`) and keeps showing under its old name.
const RET_ST = { live: [["ใช้งาน", "In use"], "p-ok"], retired: [["เลิกใช้", "Retired"], "p-mute"] };
const maxNo = (ids, re) => Math.max(0, ...ids.map(x => Number((String(x).match(re) || [])[1]) || 0));
const retireAct = (what, used, onDel) => r => {
  if (r.retired) return [{ id: "unretire", label: L("กลับมาใช้", "Use again"), kind: "ghost", run: () => { delete r.retired; audit([`กลับมาใช้${what[0]}`, `Brought back a ${what[1]}`], r.id || r.code); return L("กลับมาใช้แล้ว", "In use again"); } }];
  return used(r) ? [{ id: "retire", label: L("เลิกใช้", "Retire"), kind: "danger", why: true, impact: () => L("ข้อมูลเดิมที่อ้างถึงยังแสดงชื่อเดิม แต่จะเลือกใช้ใหม่ไม่ได้", "Records that use it keep its name, but it can't be picked again"), run: (_, why) => { r.retired = { t: nowIso(), why }; audit([`เลิกใช้${what[0]}`, `Retired a ${what[1]}`], `${r.id || r.code} · ${why}`); return L("เลิกใช้แล้ว", "Retired"); } }]
    : [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ยังไม่มีข้อมูลใดใช้รายการนี้ ลบได้", "Nothing uses this yet, so it can be deleted"), run: () => { onDel(r); audit([`ลบ${what[0]}`, `Deleted a ${what[1]}`], r.id || r.code); return L("ลบแล้ว", "Deleted"); } }];
};
const fyStatus = fy => ((S.fyList || []).find(f => f.fy === fy) || {}).status;
const fyOpen = fy => fyStatus(fy) !== "closed"; // R-C-04

// ---------- B2 strategies and goals ----------
const stAll = () => S.strategy.items.flatMap(st => [st, ...st.goals]);
const isSt = n => Array.isArray(n.goals);
const stOf = g => S.strategy.items.find(st => st.goals.includes(g));
CRUD.def("stNode", {
  noun: ["ยุทธศาสตร์และเป้าประสงค์", "Strategy or goal"], st: RET_ST, live: true,
  list: () => stAll(), id: n => n.id, title: n => tx(n.name), sub: n => (isSt(n) ? `${L("ยุทธศาสตร์", "Strategy")} · ${natName(n.nat)}` : `${L("เป้าประสงค์ภายใต้", "Goal under")} ${stOf(n).id}`),
  status: n => (n.retired ? "retired" : "live"), gone: n => !!n.retired,
  cols: [{ h: ["รหัส", "Code"], c: n => `<span class="mono">${n.id}</span>` }, { h: ["ชื่อ", "Name"], c: n => `${isSt(n) ? "" : `<span style="display:inline-block;width:18px"></span>`}${isSt(n) ? `<b style="font-weight:600">${esc(tx(n.name))}</b>` : esc(tx(n.name))}` },
    { h: ["ระดับ", "Level"], c: n => (isSt(n) ? L("ยุทธศาสตร์", "Strategy") : L("เป้าประสงค์", "Goal")) }, { h: ["ตัวชี้วัด", "KPIs"], n: true, c: n => (isSt(n) ? sumv(n.goals.map(g => g.kpis.length)) : n.kpis.length) }],
  fields: (n, v) => {
    const kind = n ? (isSt(n) ? "st" : "goal") : v.kind || "goal";
    return [
      { id: "kind", label: ["ระดับ", "Level"], type: "select", req: true, value: kind, lock: !!n, show: n && (kind === "st" ? L("ยุทธศาสตร์", "Strategy") : L("เป้าประสงค์", "Goal")), opts: [["st", L("ยุทธศาสตร์ของหน่วยงาน", "Agency strategy")], ["goal", L("เป้าประสงค์", "Goal")]] },
      ...(kind === "goal" ? [{ id: "parent", label: ["ภายใต้ยุทธศาสตร์", "Under strategy"], type: "select", req: true, value: n ? stOf(n).id : "", lock: !!n, show: n && stOf(n).id, opts: S.strategy.items.filter(st => !st.retired).map(st => [st.id, `${st.id} · ${tx(st.name)}`]) }]
        : [{ id: "nat", label: ["ยุทธศาสตร์ชาติ", "National strategy"], type: "select", req: true, value: n ? n.nat : "", opts: NATIONAL.map(x => [x.id, tx(x.name)]) },
          { id: "mp", label: ["แผนแม่บท", "Master plan"], type: "select", blank: "—", value: n ? n.mp || "" : "", opts: MASTER.filter(m => !m.retired && (!v.nat && !n ? true : m.nat === (v.nat || (n && n.nat)))).map(m => [m.id, tx(m.name)]) }]),
      { id: "th", label: ["ชื่อ (ภาษาไทย)", "Name (Thai)"], req: true, wide: true, value: n ? n.name[0] : "" },
      { id: "en", label: ["ชื่อ (ภาษาอังกฤษ)", "Name (English)"], wide: true, value: n ? n.name[1] : "" },
    ];
  },
  create: { can: () => ROLE === "plan", label: ["เพิ่มยุทธศาสตร์หรือเป้าประสงค์", "Add a strategy or goal"],
    run: v => { const name = [v.th, v.en || v.th];
      if (v.kind === "st") { const st = { id: "S" + (maxNo(S.strategy.items.map(x => x.id), /^S(\d+)/) + 1), nat: v.nat, mp: v.mp || "", name, goals: [] }; S.strategy.items.push(st); audit(["เพิ่มยุทธศาสตร์", "Added a strategy"], `${st.id} ${v.th}`); return st; }
      const g = { id: "G" + (maxNo(stAll().filter(x => !isSt(x)).map(x => x.id), /^G(\d+)/) + 1), name, kpis: [] }; S.strategy.items.find(st => st.id === v.parent).goals.push(g); audit(["เพิ่มเป้าประสงค์", "Added a goal"], `${g.id} ${v.th}`); return g; } },
  edit: { can: n => ROLE === "plan" && !n.retired, run: (n, v) => { n.name = [v.th, v.en || v.th]; if (isSt(n)) { n.nat = v.nat; n.mp = v.mp || ""; } audit(["แก้ไขยุทธศาสตร์หรือเป้าประสงค์", "Edited a strategy or goal"], `${n.id} ${v.th}`); } },
  acts: n => (ROLE !== "plan" ? [] : retireAct(["ยุทธศาสตร์หรือเป้าประสงค์", "strategy or goal"], x => (isSt(x) ? x.goals.length > 0 : x.kpis.length > 0), x => { if (isSt(x)) S.strategy.items = S.strategy.items.filter(s => s !== x); else { const st = stOf(x); st.goals = st.goals.filter(g => g !== x); } })(n)),
  view: n => kv([[L("ระดับ", "Level"), isSt(n) ? L("ยุทธศาสตร์ของหน่วยงาน", "Agency strategy") : `${L("เป้าประสงค์ภายใต้", "Goal under")} ${stOf(n).id} ${esc(tx(stOf(n).name))}`],
    isSt(n) && [L("ยุทธศาสตร์ชาติ", "National strategy"), natName(n.nat)], isSt(n) && [L("แผนแม่บท", "Master plan"), n.mp ? esc(tx((MASTER.find(m => m.id === n.mp) || { name: [n.mp, n.mp] }).name)) : "–"],
    [isSt(n) ? L("เป้าประสงค์", "Goals") : L("ตัวชี้วัด", "KPIs"), (isSt(n) ? n.goals.map(g => `${g.id} ${esc(tx(g.name))}`) : n.kpis.map(k => `${k.id} ${esc(tx(k.name))}`)).join("<br>") || "–"],
    n.retired && [L("เลิกใช้เมื่อ", "Retired"), `${fdate(n.retired.t)} · ${esc(n.retired.why)}`]]),
});

// ---------- B2 KPIs ----------
const kpiUsed = k => k.acts.length > 0 || ((S.perf.kpis[k.id] || {}).result != null) || (S.ideas || []).some(i => i.kpi === k.id) || (S.planRevs || []).some(v => v.kpi === k.id);
CRUD.def("stKpi", {
  noun: ["ตัวชี้วัด", "KPI"], st: RET_ST,
  list: () => allKpis().map(x => x.k), id: k => k.id, title: k => tx(k.name), sub: k => `${unitName(k.owner)} · ${tx(k.unit)}`,
  status: k => (k.retired ? "retired" : "live"), gone: k => !!k.retired,
  search: k => `${k.id} ${k.name.join(" ")}`,
  filters: [{ id: "owner", label: ["เจ้าของ", "Owner"], opts: () => [...new Set(allKpis().map(x => x.k.owner))].map(u => [u, unitName(u)]), get: k => k.owner }],
  cols: [{ h: ["ตัวชี้วัด", "KPI"], c: k => `<span class="mono sub">${(allKpis().find(x => x.k === k) || { st: {} }).st.id}·${k.id}</span> ${esc(tx(k.name))}` }, { h: ["หน่วย", "Unit"], c: k => `<span class="sub">${tx(k.unit)}</span>` },
    { h: ["ฐาน", "Baseline"], n: true, c: k => fmtv(k.base) }, { h: [`เป้า ${PLAN_YEARS[0]}`, `${PLAN_YEARS[0]} target`], n: true, c: k => `<b>${fmtv(k.targets[0])}</b>` },
    { h: [`เป้า ${PLAN_YEARS[4]}`, `${PLAN_YEARS[4]} target`], n: true, c: k => fmtv(k.targets[4]) }, { h: ["เจ้าของ", "Owner"], c: k => `<span class="sub">${unitName(k.owner)}</span>` }],
  fields: k => [
    { id: "goal", label: ["ภายใต้เป้าประสงค์", "Under goal"], type: "select", req: true, wide: true, lock: !!k, show: k && (() => { const x = allKpis().find(y => y.k === k); return `${x.st.id} · ${tx(x.g.name)}`; })(), value: "", opts: S.strategy.items.flatMap(st => st.goals.filter(g => !g.retired).map(g => [g.id, `${st.id} · ${g.id} ${tx(g.name)}`])) },
    { id: "th", label: ["ชื่อตัวชี้วัด", "KPI name"], req: true, wide: true, value: k ? k.name[0] : "" },
    { id: "en", label: ["ชื่อภาษาอังกฤษ", "English name"], wide: true, value: k ? k.name[1] : "" },
    { id: "unit", label: ["หน่วยนับ", "Unit of measure"], req: true, value: k ? k.unit[0] : "" },
    { id: "owner", label: ["หน่วยงานเจ้าของ", "Owning unit"], type: "select", req: true, value: k ? k.owner : me().unit, opts: unitOpts() },
    { id: "base", label: ["ค่าฐาน", "Baseline"], type: "number", req: true, min: 0, value: k ? k.base : 0 },
    ...PLAN_YEARS.map((y, i) => ({ id: "t" + i, label: [`เป้าปี ${y}`, `${y} target`], type: "number", req: true, min: 0, value: k ? k.targets[i] : "" })),
    { id: "formula", label: ["สูตรคำนวณ / นิยาม", "Formula or definition"], type: "textarea", wide: true, value: k ? k.formula || "" : "" },
  ],
  create: { can: () => ROLE === "plan", label: ["เพิ่มตัวชี้วัด", "Add KPI"],
    run: v => { const g = stAll().find(x => x.id === v.goal), k = { id: "K" + (maxNo(allKpis().map(x => x.k.id), /^K(\d+)/) + 1), owner: v.owner, unit: [v.unit, v.unit], base: v.base, targets: PLAN_YEARS.map((_, i) => v["t" + i]), acts: [], name: [v.th, v.en || v.th], formula: v.formula };
      g.kpis.push(k); audit(["เพิ่มตัวชี้วัด", "Added a KPI"], `${k.id} ${v.th}`); return k; } },
  edit: { can: k => ROLE === "plan" && !k.retired, run: (k, v) => { const old = k.targets.join("/"); Object.assign(k, { name: [v.th, v.en || v.th], unit: [v.unit, v.unit], owner: v.owner, base: v.base, targets: PLAN_YEARS.map((_, i) => v["t" + i]), formula: v.formula });
    audit(["แก้ไขตัวชี้วัด", "Edited a KPI"], `${k.id}${old !== k.targets.join("/") ? ` · ${old} → ${k.targets.join("/")}` : ""}`); } },
  acts: k => (ROLE !== "plan" ? [] : retireAct(["ตัวชี้วัด", "KPI"], kpiUsed, x => { const g = allKpis().find(y => y.k === x).g; g.kpis = g.kpis.filter(y => y !== x); delete S.perf.kpis[x.id]; })(k)),
  view: k => kv([[L("ภายใต้", "Under"), (() => { const x = allKpis().find(y => y.k === k); return `${x.st.id} · ${esc(tx(x.g.name))}`; })()], [L("หน่วยนับ", "Unit"), tx(k.unit)], [L("ค่าฐาน", "Baseline"), fmtv(k.base)],
    [L("ค่าเป้าหมาย", "Targets"), PLAN_YEARS.map((y, i) => `${y}: <b>${fmtv(k.targets[i])}</b>`).join(" · ")], [L("เจ้าของ", "Owner"), unitName(k.owner)], k.formula && [L("สูตร", "Formula"), esc(k.formula)],
    [L("กิจกรรมที่ผูก", "Linked activities"), k.acts.map(actLabel).map(esc).join("<br>") || "–"], k.retired && [L("เลิกใช้เมื่อ", "Retired"), `${fdate(k.retired.t)} · ${esc(k.retired.why)}`]])
    + (kpiUsed(k) && ROLE === "plan" && !k.retired ? `<p class="sub">${L("ลบไม่ได้เพราะมีการผูกกิจกรรม ผลตัวชี้วัด แนวคิดโครงการ หรือการทบทวนแผน ใช้ “เลิกใช้” แทน", "Can't be deleted: it has activities, results, ideas or revisions. Retire it instead.")}</p>` : ""),
});
{
  const mp = STRAT.map;
  STRAT.map = () => mp() + crudList("stNode", { head: `<h2>${L("ยุทธศาสตร์และเป้าประสงค์", "Strategies and goals")}</h2><span class="sp"></span><span class="sub">${L("กองแผนงานเพิ่ม แก้ไข และเลิกใช้", "Planning adds, edits and retires")}</span>` });
  STRAT.kpis = () => crudList("stKpi", { head: `<h2>${L("ตัวชี้วัดและค่าเป้าหมาย 5 ปี", "KPIs and 5-year targets")}</h2><span class="sp"></span>${tag(ROLE === "plan" ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), ROLE === "plan" ? "p-ok" : "p-mute")}` });
}

// ---------- B2 project ideas ----------
IDEA_ST.withdrawn = [["ถอนแล้ว", "Withdrawn"], "p-mute"];
const ideaMine = i => ROLE === "div" && i.unit === me().unit;
CRUD.def("stIdea", {
  noun: ["แนวคิดโครงการ", "Project idea"], st: IDEA_ST,
  list: () => (S.ideas || []).slice().sort((a, b) => (ideaScore(b) ?? -1) - (ideaScore(a) ?? -1)), id: i => i.id, title: i => tx(i.name), sub: i => `${unitName(i.unit)} · ${fmt(i.est, 1)} ${L("ลบ.", "M")} · ${i.years} ${L("ปี", "yr")}`,
  status: i => i.status, gone: i => i.status === "withdrawn",
  search: i => `${i.id} ${i.name.join(" ")}`, filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(IDEA_ST).map(k => [k, tx(IDEA_ST[k][0])]), get: i => i.status }],
  cols: [{ h: ["เลขที่", "No."], c: i => `<span class="mono">${i.id}</span>` }, { h: ["แนวคิดโครงการ", "Idea"], c: i => `<b style="font-weight:600">${esc(tx(i.name))}</b><div class="sub">${unitName(i.unit)}${i.rec ? ` · ${L("จากข้อเสนอแนะ", "from recommendation")} ${i.rec}` : ""}</div>` },
    { h: ["ตัวชี้วัด", "KPI"], c: i => `<span class="sub">${i.kpi}</span>` }, { h: ["ประมาณการ (ลบ.)", "Estimate (M)"], n: true, c: i => fmt(i.est, 1) },
    { h: ["คะแนน", "Score"], n: true, c: i => (ideaScore(i) == null ? "–" : `${ideaScore(i)}`) }],
  fields: i => {
    if (i && ROLE === "plan") return CRIT.map((c, n) => ({ id: "s" + n, label: [`${c[0][0]} (${c[1]}%)`, `${c[0][1]} (${c[1]}%)`], type: "select", req: true, value: String(i.scores ? i.scores[n] : 3), opts: [1, 2, 3, 4, 5].map(x => [String(x), String(x)]) }))
      .concat([{ id: "note", label: ["หมายเหตุ (ใช้เป็นเหตุผลเมื่อไม่รับ)", "Note (used as the reason if declined)"], type: "textarea", wide: true, value: i.note ? tx(i.note) : "" }]);
    return [
      { id: "name", label: ["ชื่อแนวคิดโครงการ", "Idea name"], req: true, wide: true, value: i ? tx(i.name) : "" },
      { id: "kpi", label: ["ตัวชี้วัดที่รองรับ", "KPI it serves"], type: "select", req: true, wide: true, value: i ? i.kpi : "", opts: allKpis().filter(x => !x.k.retired).map(x => [x.k.id, `${x.k.id} · ${tx(x.k.name)}`]) },
      { id: "est", label: ["ประมาณการ (ล้านบาท)", "Estimate (million baht)"], type: "number", req: true, min: 0.1, value: i ? i.est : "" },
      { id: "years", label: ["จำนวนปี", "Years"], type: "select", req: true, value: String(i ? i.years : 1), opts: [["1", "1"], ["2", "2"], ["3", "3"]] },
    ];
  },
  create: { can: () => ROLE === "div" || ROLE === "plan", label: ["เสนอแนวคิดโครงการ", "Propose an idea"],
    run: v => { const i = { id: `PB-2571-${String(maxNo((S.ideas || []).map(x => x.id), /-(\d+)$/) + 1).padStart(3, "0")}`, unit: me().unit, kpi: v.kpi, name: [v.name, v.name], est: Number(v.est), years: Number(v.years), status: "proposed", scores: null, note: null, by: me().id, t: nowIso(), req: null };
      S.ideas.push(i); audit(["เสนอแนวคิดโครงการ", "Proposed a project idea"], `${i.id} ${v.name}`); notify(["plan"], [`แนวคิดโครงการใหม่ ${i.id} รอกลั่นกรอง`, `New project idea ${i.id} is waiting for screening`], "strat-bank"); return i; } },
  edit: { can: i => (ROLE === "plan" && ["proposed", "screened"].includes(i.status)) || (ideaMine(i) && i.status === "proposed"),
    run: (i, v) => {
      if (ROLE === "plan") { i.scores = CRIT.map((_, n) => Number(v["s" + n])); i.status = "screened"; i.note = v.note ? [v.note, v.note] : null; audit(["ให้คะแนนแนวคิดโครงการ", "Scored a project idea"], `${i.id} · ${ideaScore(i)}/100`); return; }
      Object.assign(i, { name: [v.name, v.name], kpi: v.kpi, est: Number(v.est), years: Number(v.years) }); audit(["แก้ไขแนวคิดโครงการ", "Edited a project idea"], i.id); } },
  acts: i => {
    const out = [], pl = ROLE === "plan";
    if (pl && i.status === "screened") {
      out.push({ id: "acc", label: L("รับเข้าแผน", "Accept"), kind: "primary", run: () => { i.status = "accepted"; audit(["รับแนวคิดโครงการเข้าแผน", "Accepted a project idea"], i.id); notify(["div"], [`แนวคิดโครงการ ${i.id} ได้รับเข้าแผน จัดทำคำขอได้แล้ว`, `Project idea ${i.id} was accepted; you can now prepare a request`], "strat-bank"); return L("รับเข้าแผนแล้ว", "Accepted"); } });
      out.push({ id: "rej", label: L("ไม่รับ", "Decline"), kind: "danger", why: true, run: (_, why) => { i.status = "rejected"; i.note = [why, why]; audit(["ไม่รับแนวคิดโครงการ", "Declined a project idea"], `${i.id} · ${why}`); notify(["div"], [`แนวคิดโครงการ ${i.id} ไม่ได้รับเข้าแผน: ${why}`, `Project idea ${i.id} was not taken: ${why}`], "strat-bank"); return L("บันทึกแล้ว", "Saved"); } });
    }
    if ((ideaMine(i) || pl) && i.status === "accepted") out.push({ id: "conv", label: L("สร้างร่างคำขอ (B3)", "Create a B3 draft"), kind: "primary", undo: false, run: () => { crClose(); STRAT_TAB = "bank"; route(); const real = $(`[data-iconv="${i.id}"]`); if (real) real.click(); return ""; } });
    if (ideaMine(i) && ["proposed", "screened"].includes(i.status)) out.push({ id: "wd", label: L("ถอนแนวคิด", "Withdraw the idea"), kind: "ghost", why: true, run: (_, why) => { i.status = "withdrawn"; i.note = [why, why]; audit(["ถอนแนวคิดโครงการ", "Withdrew a project idea"], `${i.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    return out;
  },
  view: i => { const k = findKpi(i.kpi), sc = ideaScore(i);
    return kv([[L("หน่วยงาน", "Unit"), `${unitName(i.unit)}${i.by ? ` · ${esc(userName(i.by))}` : ""}`], [L("ตัวชี้วัด", "KPI"), k ? `${k.id} ${esc(tx(k.name))}` : i.kpi], [L("ประมาณการ", "Estimate"), `${fmt(i.est, 1)} ${L("ล้านบาท", "M baht")} · ${i.years} ${L("ปี", "years")}`],
      [L("คะแนน", "Score"), sc == null ? L("ยังไม่ให้คะแนน", "Not scored yet") : `${sc} / 100 · ${CRIT.map((c, n) => `${tx(c[0])} ${i.scores[n]}`).join(" · ")}`], i.note && [L("หมายเหตุ", "Note"), esc(tx(i.note))], i.req && [L("คำขอ", "Request"), `<span class="mono">${i.req}</span>`], i.rec && [L("ที่มา", "Source"), `${L("ข้อเสนอแนะ", "Recommendation")} ${i.rec}`]]); },
});
{
  const bk = STRAT.bank;
  // keep the KPI cards and the conversion button wiring; the table and form become the list
  STRAT.bank = () => { const h = bk(), i = h.indexOf('<section class="panel">'); return (i > 0 ? h.slice(0, i) : "") + crudList("stIdea", { head: `<h2>${L("คลังโครงการ ปีงบประมาณ 2571", "FY2571 project bank")}</h2><span class="sp"></span><span class="sub">${L("เกณฑ์", "Criteria")}: ${CRIT.map(c => `${tx(c[0])} ${c[1]}%`).join(" · ")}</span>` })
    + `<div hidden>${(S.ideas || []).filter(x => x.status === "accepted").map(x => `<button type="button" data-iconv="${x.id}"></button>`).join("")}</div>`; };
}

// ---------- B2 plan revisions ----------
REV_ST.withdrawn = [["ถอนแล้ว", "Withdrawn"], "p-mute"];
CRUD.def("stRev", {
  noun: ["คำขอทบทวนค่าเป้าหมาย", "Target revision"], st: REV_ST,
  list: () => S.planRevs || [], id: v => v.id, title: v => { const k = findKpi(v.kpi); return k ? `${k.id} ${tx(k.name)}` : v.kpi; }, sub: v => `${PLAN_YEARS[v.y]} · ${fmtv(v.from)} → ${fmtv(v.to)}`,
  status: v => v.status, gone: v => v.status === "withdrawn",
  cols: [{ h: ["เลขที่", "No."], c: v => `<span class="mono">${v.id}</span>` }, { h: ["ตัวชี้วัด", "KPI"], c: v => `<span class="mono sub">${v.kpi}</span>` }, { h: ["ปี", "Year"], n: true, c: v => PLAN_YEARS[v.y] },
    { h: ["เดิม → ใหม่", "From → to"], n: true, c: v => `${fmtv(v.from)} → <b>${fmtv(v.to)}</b>` }],
  fields: v => [
    { id: "kpi", label: ["ตัวชี้วัด", "KPI"], type: "select", req: true, wide: true, value: v ? v.kpi : "", lock: !!v, show: v && v.kpi, opts: allKpis().filter(x => !x.k.retired).map(x => [x.k.id, `${x.k.id} · ${tx(x.k.name)}`]) },
    { id: "y", label: ["ปี", "Year"], type: "select", req: true, value: String(v ? v.y : 0), opts: PLAN_YEARS.map((y, i) => [String(i), String(y)]) },
    { id: "to", label: ["ค่าเป้าหมายใหม่", "New target"], type: "number", req: true, min: 0, value: v ? v.to : "" },
    { id: "why", label: ["เหตุผล", "Reason"], type: "textarea", req: true, wide: true, value: v ? tx(v.why) : "" },
  ],
  check: (x, v) => { const k = findKpi(v ? v.kpi : x.kpi); return k && Number(x.to) === k.targets[Number(x.y)] ? [{ f: "to", m: L("ค่าใหม่เท่ากับค่าเดิม", "The new value equals the current one") }] : []; },
  create: { can: () => ROLE === "plan", label: ["เสนอทบทวนค่าเป้าหมาย", "Propose a target revision"],
    run: x => { const k = findKpi(x.kpi), y = Number(x.y), v = { id: `PR-2571-${String(maxNo((S.planRevs || []).map(r => r.id), /-(\d+)$/) + 1).padStart(3, "0")}`, kpi: k.id, y, from: k.targets[y], to: Number(x.to), why: [x.why, x.why], by: me().id, t: nowIso(), status: "pending" };
      S.planRevs.unshift(v); audit(["เสนอทบทวนค่าเป้าหมายตัวชี้วัด", "Proposed a KPI target revision"], `${v.id} ${k.id}`); notify(["exec"], [`คำขอทบทวนค่าเป้าหมาย ${v.id} (${k.id}) รอพิจารณา`, `Target revision ${v.id} (${k.id}) is waiting for you`], "strat-revise"); return v; } },
  edit: { can: v => ROLE === "plan" && v.status === "pending", run: (v, x) => { const k = findKpi(v.kpi); v.y = Number(x.y); v.from = k.targets[v.y]; v.to = Number(x.to); v.why = [x.why, x.why]; audit(["แก้ไขคำขอทบทวนค่าเป้าหมาย", "Edited a target revision"], v.id); } },
  acts: v => {
    const out = [];
    const decide = (ok, why) => { v.status = ok ? "approved" : "rejected"; v.decided = nowIso(); v.dBy = me().id; if (why) v.dWhy = why; const k = findKpi(v.kpi); if (ok && k) k.targets[v.y] = v.to;
      audit(ok ? ["อนุมัติการทบทวนค่าเป้าหมาย", "Approved a target revision"] : ["ไม่อนุมัติการทบทวนค่าเป้าหมาย", "Rejected a target revision"], `${v.id}${why ? " · " + why : ""}`); notify(["plan"], [`${v.id} ${ok ? "อนุมัติแล้ว" : "ไม่อนุมัติ"}`, `${v.id} was ${ok ? "approved" : "rejected"}`], "strat-revise"); return ok ? L("อนุมัติแล้ว · ค่าเป้าหมายในแผนปรับแล้ว", "Approved · the target is updated") : L("ไม่อนุมัติแล้ว", "Rejected"); };
    if (ROLE === "exec" && v.status === "pending") out.push({ id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", run: () => decide(true) }, { id: "no", label: L("ไม่อนุมัติ", "Reject"), kind: "danger", why: true, run: (_, why) => decide(false, why) });
    if (ROLE === "plan" && v.status === "pending") out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw"), kind: "ghost", why: true, run: (_, why) => { v.status = "withdrawn"; v.dWhy = why; audit(["ถอนคำขอทบทวนค่าเป้าหมาย", "Withdrew a target revision"], `${v.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    return out;
  },
  view: v => kv([[L("ตัวชี้วัด", "KPI"), (() => { const k = findKpi(v.kpi); return k ? `${k.id} ${esc(tx(k.name))}` : v.kpi; })()], [L("ปี", "Year"), PLAN_YEARS[v.y]], [L("ค่าเป้าหมาย", "Target"), `${fmtv(v.from)} → <b>${fmtv(v.to)}</b>`],
    [L("เหตุผล", "Reason"), esc(tx(v.why))], [L("เสนอโดย", "Proposed by"), `${esc(userName(v.by))} · ${fdate(v.t)}`], v.decided && [L("ผล", "Decision"), `${esc(userName(v.dBy))} · ${fdate(v.decided)}`], v.dWhy && [L("เหตุผล", "Reason"), esc(v.dWhy)]]),
});
{
  const rv = STRAT.revise;
  STRAT.revise = () => { const h = rv(), i = h.indexOf('<section class="panel">'); return (i > 0 ? h.slice(0, i) : "") + crudList("stRev", { head: `<h2>${L("คำขอทบทวนค่าเป้าหมาย", "Target revision requests")}</h2>`, empty: L("ยังไม่มีคำขอทบทวน", "No revision requests yet") }); };
}

// ---------- B9 outputs (FR-C-38) ----------
const outRows = () => Object.keys(S.perf.outputs || {}).map(id => Object.assign(S.perf.outputs[id], { id }));
const outUsed = o => o.result != null || Object.values(S.qrep || {}).some(q => Object.values(q).some(r => r.items && r.items[o.id]));
CRUD.def("pfOut", {
  noun: ["ผลผลิต", "Output"], st: RET_ST,
  list: () => outRows().filter(o => S.dash.projects.some(p => p.id === o.id) || o.retired), id: o => o.id, title: o => tx(o.name), sub: o => { const p = S.dash.projects.find(x => x.id === o.id); return p ? `${p.id} · ${unitName(p.unit)}` : o.id; },
  status: o => (o.retired ? "retired" : "live"), gone: o => !!o.retired,
  cols: [{ h: ["ผลผลิต", "Output"], c: o => `${esc(tx(o.name))}<div class="sub mono">${o.id}</div>` }, { h: ["เป้า", "Target"], n: true, c: o => `${fmtv(o.target)} <span class="sub">${tx(o.unit)}</span>` }, { h: ["ผล", "Result"], n: true, c: o => (o.result == null ? "–" : fmtv(o.result)) }],
  fields: o => [
    { id: "line", label: ["บรรทัดจัดสรร / โครงการ", "Allocation line or project"], type: "select", req: true, wide: true, lock: !!o, show: o && o.id, value: "", opts: S.dash.projects.filter(p => !S.perf.outputs[p.id]).map(p => [p.id, `${p.id} · ${tx(p.name)} · ${unitName(p.unit)}`]) },
    { id: "th", label: ["ชื่อผลผลิต", "Output name"], req: true, wide: true, value: o ? o.name[0] : "" },
    { id: "unit", label: ["หน่วยนับ", "Unit"], req: true, value: o ? o.unit[0] : "" },
    { id: "target", label: [`เป้าหมายปี ${CUR_FY}`, `FY${CUR_FY} target`], type: "number", req: true, min: 0, value: o ? o.target : "" },
    { id: "kpi", label: ["ตัวชี้วัดที่รองรับ", "KPI it serves"], type: "select", blank: "—", value: o ? o.kpi || "" : "", opts: allKpis().filter(x => !x.k.retired).map(x => [x.k.id, `${x.k.id} · ${tx(x.k.name)}`]) },
  ],
  create: { can: () => ROLE === "plan" && S.dash.projects.some(p => !S.perf.outputs[p.id]), label: ["เพิ่มผลผลิต", "Add an output"],
    run: v => { S.perf.outputs[v.line] = { name: [v.th, v.th], unit: [v.unit, v.unit], target: Number(v.target), result: null, kpi: v.kpi || null }; audit(["เพิ่มผลผลิต", "Added an output"], `${v.line} · ${v.th}`); return Object.assign(S.perf.outputs[v.line], { id: v.line }); } },
  edit: { can: o => ROLE === "plan" && !o.retired, run: (o, v) => { Object.assign(S.perf.outputs[o.id], { name: [v.th, v.th], unit: [v.unit, v.unit], target: Number(v.target), kpi: v.kpi || null }); audit(["แก้ไขผลผลิต", "Edited an output"], o.id); } },
  acts: o => (ROLE !== "plan" ? [] : retireAct(["ผลผลิต", "output"], outUsed, x => delete S.perf.outputs[x.id])(o)),
  view: o => kv([[L("บรรทัด", "Line"), o.id], [L("หน่วยนับ", "Unit"), tx(o.unit)], [L("เป้าหมาย", "Target"), fmtv(o.target)], [L("ผล", "Result"), o.result == null ? L("ยังไม่รายงาน (รายงานรายไตรมาส)", "Not reported (quarterly reports)") : fmtv(o.result)], o.kpi && [L("ตัวชี้วัด", "KPI"), o.kpi]]),
});
{
  const pk = PERF.kpis;
  PERF.kpis = () => pk() + crudList("pfOut", { head: `<h2>${L("ผลผลิตและค่าเป้าหมายปี", "Outputs and targets, FY")} ${CUR_FY}</h2><span class="sp"></span><span class="sub">${L("ผลรายงานผ่านรายงานรายไตรมาส", "Results come in through the quarterly reports")}</span>`, empty: L("ยังไม่มีผลผลิต", "No outputs yet") });
}

// ---------- FL-10: a recommendation becomes an idea for next year ----------
{
  const rc = PERF.recs;
  PERF.recs = () => { const R = (S.recs || []).filter(x => x.status !== "open");
    return rc() + (ROLE === "plan" && R.length ? `<section class="panel"><header>${chipIco("share", "info")}<h2>${L("นำข้อเสนอแนะไปใช้ปีถัดไป", "Carry recommendations into next year")}</h2><span class="sp"></span><span class="mono sub">FL-10</span></header>
      <div class="tbl-wrap"><table><tbody>${R.map(x => `<tr><td><span class="mono sub">${x.id}</span> ${esc(tx(x.text))}</td><td>${x.idea ? `${L("อยู่ในคลังโครงการแล้ว", "In the project bank")} <span class="mono">${x.idea}</span>` : `<button class="btn" type="button" data-recidea="${x.id}">${L("สร้างแนวคิดในคลังโครงการ", "Create an idea in the project bank")}</button>`}</td></tr>`).join("")}</tbody></table></div></section>` : ""); };
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-recidea]"); if (!b) return;
  const x = S.recs.find(r => r.id === b.dataset.recidea), snap = crSnap(), k = allKpis().find(y => y.k.owner === x.unit) || allKpis()[0];
  const i = { id: `PB-2571-${String(maxNo((S.ideas || []).map(y => y.id), /-(\d+)$/) + 1).padStart(3, "0")}`, unit: x.unit || me().unit, kpi: k ? k.k.id : "", name: x.text.slice(), est: 1, years: 1, status: "proposed", scores: null, note: [`จากข้อเสนอแนะ ${x.id}`, `From recommendation ${x.id}`], by: me().id, t: nowIso(), req: null, rec: x.id };
  S.ideas.push(i); x.idea = i.id; audit(["สร้างแนวคิดโครงการจากข้อเสนอแนะ", "Created a project idea from a recommendation"], `${x.id} → ${i.id}`);
  notify(["div", "plan"], [`ข้อเสนอแนะ ${x.id} เข้าคลังโครงการเป็น ${i.id}`, `Recommendation ${x.id} is now idea ${i.id}`], "strat-bank"); commit(); route(); crUndoOffer(snap, `${L("สร้าง", "Created")} ${i.id}`);
});

// ---------- M10 master data ----------
// Master plans become data (S.masterPlans) and MASTER mirrors them, so B2 keeps reading MASTER.
const MASTER_SEED = MASTER.map(m => Object.assign({}, m));
{
  const br = route;
  route = function () { if (S && S.masterPlans) { MASTER.length = 0; MASTER.push(...S.masterPlans); } return br.apply(this, arguments); };
}
const ADM_MD = ["admin", "plan"];
ADMIN_TABS.push({ id: "bmaster", roles: ["admin", "plan", "audit"], label: ["ข้อมูลหลักงบประมาณ", "Budget master data"] });
NAV.forEach(n => { if (n.id === "admin" && !n.roles.includes("plan")) n.roles.push("plan"); });
CRUD.def("adMp", {
  noun: ["แผนแม่บท", "Master plan"], st: RET_ST, list: () => S.masterPlans || [], id: m => m.id, title: m => tx(m.name), sub: m => natName(m.nat),
  status: m => (m.retired ? "retired" : "live"), gone: m => !!m.retired,
  cols: [{ h: ["รหัส", "Code"], c: m => `<span class="mono">${m.id}</span>` }, { h: ["แผนแม่บท", "Master plan"], c: m => esc(tx(m.name)) }, { h: ["ยุทธศาสตร์ชาติ", "National strategy"], c: m => `<span class="sub">${natName(m.nat)}</span>` }],
  fields: m => [{ id: "id", label: ["รหัส", "Code"], req: true, value: m ? m.id : "", lock: !!m }, { id: "nat", label: ["ยุทธศาสตร์ชาติ", "National strategy"], type: "select", req: true, value: m ? m.nat : "", opts: NATIONAL.map(x => [x.id, tx(x.name)]) },
    { id: "th", label: ["ชื่อ (ไทย)", "Name (Thai)"], req: true, wide: true, value: m ? m.name[0] : "" }, { id: "en", label: ["ชื่อ (อังกฤษ)", "Name (English)"], wide: true, value: m ? m.name[1] : "" }],
  check: (v, m) => (!m && (S.masterPlans || []).some(x => x.id === v.id) ? [{ f: "id", m: L("รหัสนี้มีอยู่แล้ว", "That code is already used") }] : []),
  create: { can: () => ADM_MD.includes(ROLE), label: ["เพิ่มแผนแม่บท", "Add a master plan"], run: v => { const m = { id: v.id, nat: v.nat, name: [v.th, v.en || v.th] }; S.masterPlans.push(m); audit(["เพิ่มแผนแม่บท", "Added a master plan"], v.id); return m; } },
  edit: { can: m => ADM_MD.includes(ROLE) && !m.retired, run: (m, v) => { m.nat = v.nat; m.name = [v.th, v.en || v.th]; audit(["แก้ไขแผนแม่บท", "Edited a master plan"], m.id); } },
  acts: m => (ADM_MD.includes(ROLE) ? retireAct(["แผนแม่บท", "master plan"], x => S.strategy.items.some(st => st.mp === x.id), x => (S.masterPlans = S.masterPlans.filter(y => y !== x)))(m) : []),
  view: m => kv([[L("รหัส", "Code"), m.id], [L("ยุทธศาสตร์ชาติ", "National strategy"), natName(m.nat)], [L("ยุทธศาสตร์ที่ผูก", "Strategies linked"), S.strategy.items.filter(st => st.mp === m.id).map(st => st.id).join(", ") || "–"]]),
});
// Committee: members are users; one settings record for chair, secretary and quorum.
const cmteUsers = () => S.users.filter(u => u.active !== false && ["exec", "fin", "plan", "committee", "div", "divhead"].includes(u.role));
CRUD.def("adCm", {
  noun: ["กรรมการพิจารณางบประมาณ", "Committee member"], list: () => cmte().members.map(id => S.users.find(u => u.id === id)).filter(Boolean), id: u => u.id, title: u => tx(u.name), sub: u => `${tx(ROLES[u.role])} · ${unitName(u.unit)}`,
  cols: [{ h: ["ชื่อ", "Name"], c: u => `${esc(tx(u.name))}${u.id === cmte().chair ? ` ${tag(L("ประธาน", "Chair"), "p-info")}` : ""}` }, { h: ["บทบาท", "Role"], c: u => `<span class="sub">${tx(ROLES[u.role])}</span>` }, { h: ["หน่วยงาน", "Unit"], c: u => `<span class="sub">${unitName(u.unit)}</span>` }],
  fields: () => [{ id: "user", label: ["ผู้ใช้", "User"], type: "select", req: true, wide: true, value: "", opts: cmteUsers().filter(u => !cmte().members.includes(u.id) && u.id !== cmte().secretary).map(u => [u.id, `${tx(u.name)} · ${tx(ROLES[u.role])}`]) }],
  create: { can: () => ADM_MD.includes(ROLE), label: ["แต่งตั้งกรรมการ", "Appoint a member"], run: v => { S.committee = S.committee || { members: [], quorum: 50 }; S.committee.members.push(v.user); audit(["แต่งตั้งกรรมการพิจารณางบประมาณ", "Appointed a committee member"], userName(v.user)); return S.users.find(u => u.id === v.user); } },
  acts: u => (!ADM_MD.includes(ROLE) ? [] : [
    u.id !== cmte().chair && { id: "chair", label: L("ตั้งเป็นประธาน", "Make chair"), run: () => { S.committee.chair = u.id; audit(["ตั้งประธานคณะกรรมการ", "Set the committee chair"], userName(u.id)); return L("ตั้งประธานแล้ว", "Chair set"); } },
    { id: "out", label: L("พ้นตำแหน่ง", "Leaves the committee"), kind: "danger", why: true, impact: () => `${L("องค์ประชุมจะเป็น", "Quorum becomes")} ${Math.ceil((cmte().members.length - 1) * (cmte().quorum || 50) / 100)} ${L("จาก", "of")} ${cmte().members.length - 1}`,
      run: (_, why) => { S.committee.members = S.committee.members.filter(x => x !== u.id); if (S.committee.chair === u.id) S.committee.chair = S.committee.members[0] || ""; const m = meetScheduled && meetScheduled(); if (m && m.present) m.present = m.present.filter(x => x !== u.id);
        audit(["กรรมการพ้นตำแหน่ง", "A member left the committee"], `${userName(u.id)} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } },
  ]),
  view: u => kv([[L("บทบาทในระบบ", "System role"), tx(ROLES[u.role])], [L("หน่วยงาน", "Unit"), unitName(u.unit)], [L("ตำแหน่ง", "Position"), u.id === cmte().chair ? L("ประธาน", "Chair") : L("กรรมการ", "Member")], [L("งดออกเสียงเมื่อ", "Abstains on"), L("คำขอของหน่วยงานตนเอง (SD-10)", "requests from their own unit (SD-10)")]]),
});
CRUD.def("adCs", {
  noun: ["องค์ประชุมและเลขานุการ", "Quorum and secretary"], list: () => [cmte()], id: () => "cmte", title: () => L("การตั้งค่าคณะกรรมการ", "Committee settings"), cols: [],
  fields: () => [{ id: "quorum", label: ["องค์ประชุม (ร้อยละของกรรมการ)", "Quorum (% of members)"], type: "number", req: true, min: 1, max: 100, value: cmte().quorum || 50 },
    { id: "secretary", label: ["เลขานุการ (ไม่ออกเสียง)", "Secretary (no vote)"], type: "select", req: true, value: cmte().secretary || "", opts: S.users.filter(u => u.role === "plan").map(u => [u.id, tx(u.name)]) }],
  edit: { can: () => ADM_MD.includes(ROLE), run: (_, v) => { S.committee.quorum = Number(v.quorum); S.committee.secretary = v.secretary; audit(["ตั้งค่าคณะกรรมการ", "Changed committee settings"], `${v.quorum}% · ${userName(v.secretary)}`); } },
  view: () => kv([[L("องค์ประชุม", "Quorum"), `${cmte().quorum || 50}% · ${quorumN()} ${L("จาก", "of")} ${cmte().members.length}`], [L("ประธาน", "Chair"), userName(cmte().chair)], [L("เลขานุการ", "Secretary"), userName(cmte().secretary)]]),
});
ADMIN.bmaster = () => `<section class="panel"><header><h2>${L("คณะกรรมการพิจารณางบประมาณ", "Budget committee")}</h2><span class="sp"></span><span class="sub">${L("องค์ประชุม", "Quorum")} ${cmte().quorum || 50}% · ${L("เลขานุการ", "secretary")} ${esc(userName(cmte().secretary))}</span><button class="btn" type="button" data-cropen="adCs|cmte">${L("ตั้งค่า", "Settings")}</button></header></section>
  ${crHere("adCs")}${crudList("adCm", { head: `<h2>${L("กรรมการ", "Members")}</h2>` })}${crudList("adMp", { head: `<h2>${L("แผนแม่บทภายใต้ยุทธศาสตร์ชาติ", "Master plans under the national strategy")}</h2>` })}`;

// Units, standard prices, fiscal years, calendar and budget structure (admin).
CRUD.def("adUnit", {
  noun: ["หน่วยงาน", "Unit"], st: RET_ST, list: () => S.units, id: u => u.id, title: u => tx(u.name), sub: u => `${u.code}${u.parent ? " · " + unitName(u.parent) : ""}`,
  status: u => (u.retired ? "retired" : "live"), gone: u => !!u.retired, search: u => `${u.code} ${u.name.join(" ")}`,
  cols: [{ h: ["รหัส", "Code"], c: u => `<span class="mono">${u.code}</span>` }, { h: ["ชื่อหน่วยงาน", "Name"], c: u => esc(tx(u.name)) }, { h: ["สังกัด", "Parent"], c: u => `<span class="sub">${u.parent ? unitName(u.parent) : "—"}</span>` }, { h: ["ผู้ใช้", "Users"], n: true, c: u => S.users.filter(x => x.unit === u.id).length }],
  fields: u => [{ id: "code", label: ["รหัส", "Code"], req: true, value: u ? u.code : "" }, { id: "th", label: ["ชื่อภาษาไทย", "Thai name"], req: true, wide: true, value: u ? u.name[0] : "" }, { id: "en", label: ["ชื่อภาษาอังกฤษ", "English name"], wide: true, value: u ? u.name[1] : "" },
    { id: "parent", label: ["สังกัด", "Parent"], type: "select", value: u ? u.parent || "" : S.units[0].id, blank: "—", opts: S.units.filter(x => !u || x.id !== u.id).map(x => [x.id, tx(x.name)]) }],
  check: (v, u) => (S.units.some(x => x.code === v.code && x !== u) ? [{ f: "code", m: L("รหัสนี้มีอยู่แล้ว", "That code is already used") }] : []),
  create: { can: () => isAdmin(), label: ["เพิ่มหน่วยงาน", "Add a unit"], run: v => { const u = { id: "X" + v.code, code: v.code, parent: v.parent || null, name: [v.th, v.en || v.th] }; S.units.push(u); audit(["เพิ่มหน่วยงาน", "Added a unit"], `${v.code} ${v.th}`); return u; } },
  edit: { can: u => isAdmin() && !u.retired, run: (u, v) => { Object.assign(u, { code: v.code, name: [v.th, v.en || v.th], parent: v.parent || null }); audit(["แก้ไขหน่วยงาน", "Edited a unit"], `${v.code} ${v.th}`); } },
  acts: u => (isAdmin() ? retireAct(["หน่วยงาน", "unit"], x => !x.parent || S.users.some(y => y.unit === x.id) || S.requests.some(r => r.unit === x.id) || Object.values(S.allocs).some(A => A.lines.some(l => l.unit === x.id)), x => (S.units = S.units.filter(y => y !== x)))(u) : []),
  view: u => kv([[L("รหัส", "Code"), u.code], [L("สังกัด", "Parent"), u.parent ? unitName(u.parent) : "—"], [L("ผู้ใช้", "Users"), S.users.filter(x => x.unit === u.id).map(x => esc(tx(x.name))).join(", ") || "–"]]),
});
CRUD.def("adPrice", {
  noun: ["ราคามาตรฐาน", "Standard price"], st: RET_ST, list: () => S.prices, id: p => p.id, title: p => tx(p.name), sub: p => `${fmt(p.price)} ${L("บาท /", "baht /")} ${tx(p.unit)}`,
  status: p => (p.retired ? "retired" : "live"), gone: p => !!p.retired, search: p => `${p.id} ${p.name.join(" ")}`,
  cols: [{ h: ["รหัส", "Code"], c: p => `<span class="mono">${p.id}</span>` }, { h: ["รายการ", "Item"], c: p => esc(tx(p.name)) }, { h: ["หน่วย", "Unit"], c: p => `<span class="sub">${tx(p.unit)}</span>` }, { h: ["ราคา (บาท)", "Price (baht)"], n: true, c: p => fmt(p.price) }],
  fields: p => [{ id: "th", label: ["รายการ", "Item"], req: true, wide: true, value: p ? p.name[0] : "" }, { id: "en", label: ["ชื่อภาษาอังกฤษ", "English name"], wide: true, value: p ? p.name[1] : "" },
    { id: "type", label: ["งบรายจ่าย", "Budget type"], type: "select", req: true, value: p ? p.type : "inv", opts: typeOpts() }, { id: "unit", label: ["หน่วยนับ", "Unit"], req: true, value: p ? p.unit[0] : "" },
    { id: "price", label: ["ราคา (บาท)", "Price (baht)"], type: "number", req: true, min: 0, value: p ? p.price : "" }],
  create: { can: () => isAdmin() || ROLE === "fin", label: ["เพิ่มราคามาตรฐาน", "Add a standard price"], run: v => { const p = { id: `SP-${String(maxNo(S.prices.map(x => x.id), /-(\d+)$/) + 1).padStart(3, "0")}`, type: v.type, name: [v.th, v.en || v.th], unit: [v.unit, v.unit], price: Number(v.price) }; S.prices.push(p); audit(["เพิ่มราคามาตรฐาน", "Added a standard price"], `${p.id} ${v.th}`); return p; } },
  edit: { can: p => (isAdmin() || ROLE === "fin") && !p.retired, run: (p, v) => { const old = p.price; Object.assign(p, { type: v.type, name: [v.th, v.en || v.th], unit: [v.unit, v.unit], price: Number(v.price) }); audit(["แก้ไขราคามาตรฐาน", "Changed a standard price"], `${p.id}: ${fmt(old)} → ${fmt(p.price)}`); } },
  acts: p => (isAdmin() || ROLE === "fin" ? retireAct(["ราคามาตรฐาน", "standard price"], () => true, () => {})(p) : []),
  view: p => kv([[L("รหัส", "Code"), p.id], [L("งบรายจ่าย", "Budget type"), typeName(p.type)], [L("ราคา", "Price"), `${fmt(p.price)} ${L("บาท /", "baht /")} ${tx(p.unit)}`], [L("ใช้กับ", "Used by"), L("กฎ BR-05 ในแบบฟอร์มคำขอ", "rule BR-05 in the request form")]]),
});
CRUD.def("adFy", {
  noun: ["ปีงบประมาณ", "Fiscal year"], st: FY_STATUS, list: () => S.fyList.slice().sort((a, b) => b.fy - a.fy), id: f => f.fy, title: f => `${L("ปีงบประมาณ", "FY")} ${f.fy}`, sub: f => `${fdate(f.start)} – ${fdate(f.end)}`, status: f => f.status,
  cols: [{ h: ["ปี", "Year"], c: f => `<b>${f.fy}</b>` }, { h: ["ช่วงเวลา", "Period"], c: f => `<span class="sub">${fdate(f.start)} – ${fdate(f.end)}</span>` }, { h: ["โครงสร้าง", "Structure"], n: true, c: f => (S.structure[f.fy] || []).length }],
  fields: f => (f ? [{ id: "status", label: ["สถานะ", "Status"], type: "select", req: true, value: f.status, opts: Object.keys(FY_STATUS).map(k => [k, tx(FY_STATUS[k][0])]) }]
    : [{ id: "_new", label: ["ปีที่จะเปิด", "Year to open"], type: "info", wide: true, html: `${L("ปีงบประมาณ", "FY")} ${Math.max(...S.fyList.map(x => x.fy)) + 1} · ${L("สถานะเตรียมโครงสร้าง · คัดลอกโครงสร้างงบประมาณจากปีล่าสุด", "structure setup · the latest budget structure is copied")}` }]),
  create: { can: () => isAdmin(), label: ["เปิดปีงบประมาณถัดไป", "Open the next fiscal year"],
    run: () => { const last = Math.max(...S.fyList.map(f => f.fy)), fy = last + 1, ce = fy - 543, f = { fy, status: "setup", start: `${ce - 1}-10-01`, end: `${ce}-09-30` };
      S.fyList.push(f); const src = S.structure[last] || S.structure[2571] || [], pre = `${String(fy).slice(2)}-`, strip = id => String(id).replace(/^\d\d-/, "");
      S.structure[fy] = src.map(n => Object.assign({}, n, { id: pre + strip(n.id), parent: n.parent ? pre + strip(n.parent) : null }));
      audit(["เปิดปีงบประมาณใหม่", "Opened a new fiscal year"], `${fy} · ${S.structure[fy].length} ${L("รายการโครงสร้างคัดลอกจาก", "structure nodes copied from")} ${last}`); return f; } },
  edit: { can: () => isAdmin(), why: () => true, run: (f, v, why) => { const old = f.status; f.status = v.status; audit(["เปลี่ยนสถานะปีงบประมาณ", "Changed fiscal year status"], `${f.fy}: ${old} → ${v.status} · ${why}`); } },
  view: f => kv([[L("ช่วงเวลา", "Period"), `${fdate(f.start)} – ${fdate(f.end)}`], [L("สถานะ", "Status"), tx(FY_STATUS[f.status][0])], [L("โครงสร้าง", "Structure"), `${(S.structure[f.fy] || []).length} ${L("รายการ", "nodes")}`]])
    + `<p class="sub">${L("ปีที่ปิดแล้วสร้างหรือแก้บรรทัดจัดสรรไม่ได้ (R-C-04) การเปิดปีถัดไปคัดลอกโครงสร้างงบประมาณจากปีล่าสุด", "A closed year takes no new or changed allocation lines (R-C-04). Opening the next year copies the latest budget structure.")}</p>`,
});
CRUD.def("adCal", {
  noun: ["ปฏิทินงบประมาณ", "Budget calendar"], list: () => S.calendar.slice().sort((a, b) => (a.date < b.date ? -1 : 1)), id: c => c.id, title: c => tx(c.name), sub: c => `${fdate(c.date)} · ${tx(ROLES[c.role])}`,
  cols: [{ h: ["วันที่", "Date"], c: c => fdate(c.date) }, { h: ["กิจกรรม", "Milestone"], c: c => esc(tx(c.name)) }, { h: ["ผู้รับผิดชอบ", "Owner"], c: c => `<span class="sub">${tx(ROLES[c.role])}</span>` }],
  fields: c => [{ id: "th", label: ["กิจกรรม", "Milestone"], req: true, wide: true, value: c ? c.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: c ? c.name[1] : "" },
    { id: "date", label: ["วันที่", "Date"], type: "date", req: true, value: c ? c.date : TODAY }, { id: "role", label: ["ผู้รับผิดชอบ", "Owner"], type: "select", req: true, value: c ? c.role : "plan", opts: ["admin", "div", "divhead", "plan", "exec", "fin"].map(r => [r, tx(ROLES[r])]) }],
  create: { can: () => isAdmin(), label: ["เพิ่มกำหนดการ", "Add a milestone"], run: v => { const c = { id: "c" + (maxNo(S.calendar.map(x => x.id), /^c(\d+)/) + 1), custom: true, date: v.date, role: v.role, name: [v.th, v.en || v.th] }; S.calendar.push(c); audit(["เพิ่มกำหนดการในปฏิทินงบประมาณ", "Added a budget calendar milestone"], `${c.id} ${v.th}`); return c; } },
  edit: { can: () => isAdmin(), run: (c, v) => { Object.assign(c, { date: v.date, role: v.role, name: [v.th, v.en || v.th] }); audit(["แก้ไขปฏิทินงบประมาณ", "Changed the budget calendar"], `${tx(c.name)} → ${fdate(c.date)}`); } },
  acts: c => (isAdmin() && c.custom ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบกำหนดการนี้?", "Delete this milestone?"), run: () => { S.calendar = S.calendar.filter(x => x !== c); audit(["ลบกำหนดการ", "Deleted a milestone"], c.id); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: c => kv([[L("วันที่", "Date"), dueText(c.date)], [L("ผู้รับผิดชอบ", "Owner"), tx(ROLES[c.role])], [L("ใช้กับ", "Used by"), c.custom ? L("แสดงในปฏิทิน", "Shown in the calendar") : L("กำหนดส่งในงานของฉันและกฎ BR-06 (ลบไม่ได้ แก้วันได้)", "Deadlines in My Workspace and rule BR-06 (can't be deleted; the date can change)")]]),
});
const nodeUsed = n => S.requests.some(r => r.act === n.id) || Object.values(S.allocs).some(A => A.lines.some(l => l.act === n.id)) || (S.structure[STRUCT_FY] || []).some(x => x.parent === n.id) || allKpis().some(x => x.k.acts.includes(n.id));
CRUD.def("adNode", {
  noun: ["โครงสร้างงบประมาณ", "Budget structure node"], st: RET_ST, list: () => S.structure[STRUCT_FY] || [], id: n => n.id, title: n => `${n.code} ${tx(n.name)}`, sub: n => tx(LEVELS[n.lvl]),
  status: n => (n.retired ? "retired" : "live"), gone: n => !!n.retired, search: n => `${n.code} ${n.name.join(" ")}`,
  filters: [{ id: "lvl", label: ["ระดับ", "Level"], opts: () => Object.keys(LEVELS).map(k => [k, tx(LEVELS[k])]), get: n => n.lvl }],
  cols: [{ h: ["รหัส", "Code"], c: n => `<span class="mono">${n.code}</span>` }, { h: ["ชื่อ", "Name"], c: n => `<span class="lvl ${n.lvl}">${tx(LEVELS[n.lvl])}</span> ${esc(tx(n.name))}` }, { h: ["คำขอ", "Requests"], n: true, c: n => (n.lvl === "activity" ? S.requests.filter(r => r.act === n.id).length : "") }],
  fields: (n, v) => { const lvl = n ? n.lvl : v.lvl || "activity", up = { output: "program", activity: "output" }[lvl], st = S.structure[STRUCT_FY] || [];
    return [{ id: "lvl", label: ["ระดับ", "Level"], type: "select", req: true, value: lvl, lock: !!n, show: n && tx(LEVELS[n.lvl]), opts: Object.keys(LEVELS).map(k => [k, tx(LEVELS[k])]) },
      ...(up ? [{ id: "parent", label: ["ภายใต้", "Under"], type: "select", req: true, value: n ? n.parent : "", lock: !!n, show: n && n.parent, opts: st.filter(x => (x.lvl === up || (lvl === "activity" && x.lvl === "program")) && !x.retired).map(x => [x.id, `${x.code} · ${tx(x.name)}`]) }] : []),
      { id: "code", label: ["รหัส", "Code"], req: true, value: n ? n.code : "" }, { id: "th", label: ["ชื่อ", "Name"], req: true, wide: true, value: n ? n.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: n ? n.name[1] : "" }]; },
  check: (v, n) => ((S.structure[STRUCT_FY] || []).some(x => x.code === v.code && x !== n) ? [{ f: "code", m: L("รหัสนี้มีอยู่แล้ว", "That code is already used") }] : []),
  create: { can: () => isAdmin() && fyOpen(STRUCT_FY), label: ["เพิ่มรายการโครงสร้าง", "Add a node"], run: v => { const st = S.structure[STRUCT_FY] = S.structure[STRUCT_FY] || [], pre = st[0] && /^\d\d-/.test(st[0].id) ? st[0].id.slice(0, 3) : "";
    const n = { id: pre + v.code.replace(/\./g, "-"), lvl: v.lvl, code: v.code, parent: v.parent || null, name: [v.th, v.en || v.th] }; st.push(n); audit(["เพิ่มรายการในโครงสร้างงบประมาณ", "Added to the budget structure"], `${STRUCT_FY} · ${v.code} ${v.th}`); return n; } },
  edit: { can: n => isAdmin() && fyOpen(STRUCT_FY) && !n.retired, run: (n, v) => { Object.assign(n, { code: v.code, name: [v.th, v.en || v.th] }); audit(["แก้ไขโครงสร้างงบประมาณ", "Edited the budget structure"], `${STRUCT_FY} · ${v.code}`); } },
  acts: n => (isAdmin() && fyOpen(STRUCT_FY) ? retireAct(["รายการโครงสร้าง", "structure node"], nodeUsed, x => (S.structure[STRUCT_FY] = S.structure[STRUCT_FY].filter(y => y !== x)))(n) : []),
  view: n => kv([[L("ระดับ", "Level"), tx(LEVELS[n.lvl])], [L("รหัส", "Code"), n.code], n.parent && [L("ภายใต้", "Under"), (() => { const p = (S.structure[STRUCT_FY] || []).find(x => x.id === n.parent); return p ? `${p.code} ${esc(tx(p.name))}` : n.parent; })()],
    n.lvl === "activity" && [L("คำขอ", "Requests"), S.requests.filter(r => r.act === n.id).map(r => r.id).join(", ") || "–"]]),
});
{
  const am = ADMIN.master;
  ADMIN.master = () => { const h = am(); return crudList("adUnit", { head: `<h2>${L("หน่วยงาน", "Organization units")}</h2>` }) + `<div class="grid2">${(h.match(/<section class="panel"><header><h2>[^<]*(งบรายจ่าย|Budget types)[\s\S]*?<\/section>/) || [""])[0]}</div>` + crudList("adPrice", { head: `<h2>${L("ราคามาตรฐาน", "Standard prices")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง", "Sample"), "p-warn")}` }); };
  BIND_ADMIN.master = () => {}; BIND_ADMIN.fiscal = () => {};
  ADMIN.fiscal = () => crudList("adFy", { head: `<h2>${L("ปีงบประมาณ", "Fiscal years")}</h2><span class="sp"></span><span class="sub">${L("ปีงบประมาณเริ่ม 1 ตุลาคม สิ้นสุด 30 กันยายน", "Fiscal years run from 1 October to 30 September")}</span>` })
    + crudList("adCal", { head: `<h2>${L("ปฏิทินงบประมาณ", "Budget calendar")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง", "Sample"), "p-warn")}` });
  const as = ADMIN.structure;
  ADMIN.structure = () => { const h = as(), m = h.match(/<section class="panel"><header><h2>[^<]*(การจับคู่รหัส|Code mapping)[\s\S]*?<\/section>/);
    return `<div class="row" style="margin:0 0 12px"><label class="field-inline" for="sfy">${L("ปี", "Year")} <select id="sfy">${Object.keys(S.structure).sort().reverse().map(y => `<option ${Number(y) === STRUCT_FY ? "selected" : ""}>${y}</option>`).join("")}</select></label>${fyOpen(STRUCT_FY) ? "" : tag(L("ปีที่ปิดแล้ว แก้ไขไม่ได้", "Closed year: read-only"), "p-mute")}</div>`
      + crudList("adNode", { head: `<h2>${L("โครงสร้างงบประมาณ", "Budget structure")} ${STRUCT_FY}</h2>` }) + (m ? m[0] : ""); };
}
// R-C-04: no new or changed allocation lines in a closed year.
{
  const d = CRUD.defs.alLine, cc = d.create.can, ec = d.edit.can;
  d.create.can = () => cc() && fyOpen(ALLOC_FY); d.edit.can = l => ec(l) && fyOpen(ALLOC_FY);
}
// ---------- seed ----------
function seedMasterData(s) { if (!s.masterPlans) s.masterPlans = MASTER_SEED.map(m => Object.assign({}, m)); }
