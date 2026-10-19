// B8 Monitoring and B9 Performance on the year being spent (round C4, Budget CRUD design chapters 9 and 10).
// - S.dash, which every B8/B9 screen reads, is rebuilt on each route from the FY2570 allocation lines (one project per
//   line): plan to date from the line's monthly plan, actual from the imported GFMIS disbursement (S.disb) or what
//   Finance has paid, whichever is higher. FY2569 stays as read-only history in S.y2569 (its dashboard, progress
//   reports, procurement milestones, outputs, quarterly reports, unit costs and GFMIS rows); the "FY2569" tab and old
//   evaluations read it.
// - "As of month" moves the demo date (TODAY) to the end of a month of the year; going forward imports simulated
//   GFMIS disbursement for the months that have none (SIM-04). A banner shows on every page while the date is moved.
// - Quarter, forecast month and targets come from the date and the M10 settings instead of fixed values.
const ACT_F_2569 = ACT_F.slice(); // the FY2569 sample shape, for the history tab
const monthIdx = () => { const [y, m] = TODAY.split("-").map(Number); return Math.max(0, Math.min(11, (y - (CUR_FY - 544)) * 12 + (m - 10))); };
// Deterministic "random" factor so a simulated import gives the same figures every time.
const simF = (id, m) => { let h = 0; for (const c of `${id}|${m}`) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 0.7 + (h % 36) / 100; };
const lineActual = (l, mi) => { const d = (S.disb || {})[l.id], imp = d ? sumv(d.slice(0, mi + 1).map(x => x || 0)) : 0; return Math.max(imp, typeof linePaid === "function" ? linePaid(l.id) : 0); };

function liveDash() {
  const A = S.allocs && S.allocs[CUR_FY]; if (!A) return S.dash;
  const mi = monthIdx(), L2 = A.lines.filter(l => !l.cancelled && l.amount > 0);
  const projects = L2.map(l => ({ id: l.id, line: l.id, unit: l.unit, name: l.name, type: l.type, alloc: l.amount / 1e6, plan: sumv((l.plan || []).slice(0, mi + 1)) / 1e6, actual: lineActual(l, mi) / 1e6 }));
  const units = [...new Set(projects.map(p => p.unit))].map(u => { const ps = projects.filter(p => p.unit === u), sum = k => sumv(ps.map(p => p[k]));
    const risk = ps.map(p => S.progress[p.id]).find(pr => pr && pr.status === "risk");
    return { unit: u, alloc: sum("alloc"), plan: sum("plan"), actual: sum("actual"), reason: risk ? risk.issue : undefined }; });
  return { fy: CUR_FY, asOf: TODAY, live: true, month: mi + 1, units, projects };
}
function syncDash() {
  if (!S || !S.allocs || !S.allocs[CUR_FY] || !S.y2569) return;
  S.dash = liveDash();
  const mi = monthIdx(); CUR_Q = Math.floor(mi / 3) + 1; SNAP_M = mi + 1;
  if (typeof spendT === "function") { const T = spendT(); CAB = { all: T.q, inv: CAB.inv }; }
  // The forecast scales past months by the cumulative actual shape (ACT_F); for the live year that shape is the real one.
  const A = S.allocs[CUR_FY], cum = Array.from({ length: mi + 1 }, (_, m) => sumv(A.lines.filter(l => !l.cancelled).map(l => lineActual(l, m))));
  ACT_F.length = 0; cum.forEach((v, m) => ACT_F.push(cum[mi] ? Math.max(0.0001, v / cum[mi]) * PLAN_F[mi] : PLAN_F[m]));
  // Every KPI can take a result this year, including ones created in B2 (FR-C-37).
  if (S.perf && typeof allKpis === "function") allKpis().forEach(({ k }) => { if (!S.perf.kpis[k.id]) S.perf.kpis[k.id] = { target: k.targets[0], result: null, t: "" }; });
}
{
  const br = route;
  route = function () { TODAY = (S && S.asOf) || REAL_TODAY; syncDash(); const r = br.apply(this, arguments); asOfBanner(); return r; };
}
// Seeding always starts from the real date.
Object.keys(SEEDS).forEach(k => { const sd = SEEDS[k].seed; SEEDS[k].seed = function () { TODAY = REAL_TODAY; return sd.apply(this, arguments); }; });

// ---------- simulated GFMIS import (SIM-04) ----------
function simDisb(toIdx) {
  const A = S.allocs[CUR_FY]; S.disb = S.disb || {}; let n = 0;
  A.lines.filter(l => !l.cancelled && l.plan).forEach(l => { const d = (S.disb[l.id] = S.disb[l.id] || Array(12).fill(null));
    for (let m = 0; m <= toIdx; m++) if (d[m] == null) { d[m] = Math.round(l.plan[m] * simF(l.id, m)); n++; } });
  // reconciliation rows: one per unit for the latest month, one of them off by a posting-period difference
  const units = [...new Set(A.lines.filter(l => !l.cancelled).map(l => l.unit))];
  S.gfmis = units.map((u, i) => { const gf = sumv(A.lines.filter(l => l.unit === u && S.disb[l.id]).map(l => S.disb[l.id][toIdx] || 0)), off = i === 1 ? Math.round(gf * 0.04) : 0;
    return { id: "G" + (i + 1), code: `${unitOf(u).code || u}-${CUR_FY}-M${String(toIdx + 1).padStart(2, "0")}`, unit: u, gf, fk: gf - off, ok: !off, reason: off ? "" : "timing" }; });
  const g = S.integrations.find(i => i.id === "IF-02"); if (g) { g.last = `${TODAY}T06:00`; g.records = (g.records || 0) + n; g.status = S.gfmis.some(x => !x.ok) ? "warn" : "ok"; }
  return n;
}

// ---------- as of month ----------
const FY_MONTH_ENDS = () => Array.from({ length: 12 }, (_, i) => { const y = CUR_FY - 544 + (i >= 3 ? 1 : 0), m = ((i + 9) % 12) + 1, last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return `${y}-${String(m).padStart(2, "0")}-${last}`; });
const asOfOpts = () => FY_MONTH_ENDS().map((d, i) => [i === 0 ? REAL_TODAY : d, `${FY_MONTHS[LANG][i]} ${i < 3 ? CUR_FY - 1 : CUR_FY}`]);
function setAsOf(iso) {
  const snap = crSnap(), was = TODAY;
  S.asOf = iso === REAL_TODAY ? null : iso; TODAY = S.asOf || REAL_TODAY; syncDash();
  if (typeof QR_ROUND !== "undefined") QR_ROUND = "Q" + CUR_Q; // the quarterly report opens on the quarter the demo is in
  const n = TODAY > was ? simDisb(monthIdx()) : 0;
  audit(["เปลี่ยนวันที่สาธิต", "Moved the demo date"], `${was} → ${TODAY}${n ? ` · ${L("นำเข้าผลเบิกจ่ายจำลอง", "simulated disbursement imported")} ${n}` : ""}`);
  commit(); renderShell(); route(); crUndoOffer(snap, `${L("ณ", "As of")} ${fdate(TODAY)}`);
}
function asOfBanner() {
  const v = $("#view"); if (!v || !S.asOf || v.querySelector(".asof-bar")) return;
  const b = document.createElement("div"); b.className = "asof-bar"; b.setAttribute("role", "status");
  b.innerHTML = `<span>${svgI("cal")} <b>${L("โหมดสาธิต", "Demo mode")}</b> · ${L("ข้อมูล ณ", "as of")} ${fdate(TODAY)} (${L("เดือนที่", "month")} ${monthIdx() + 1}/12 ${L("ของปี", "of FY")} ${CUR_FY})</span><span class="sp"></span><button class="btn ghost" type="button" data-asof-reset>${L("กลับวันจริง", "Back to today")} (${fdate(REAL_TODAY)})</button>`;
  v.prepend(b);
}
document.addEventListener("click", e => { if (e.target.closest("[data-asof-reset]")) setAsOf(REAL_TODAY); const s = e.target.closest("[data-simgf]"); if (s) { const snap = crSnap(), n = simDisb(monthIdx()); audit(["นำเข้าไฟล์ผลเบิกจ่ายจำลอง", "Imported a simulated disbursement file"], `${n}`); commit(); renderShell(); route(); crUndoOffer(snap, `${L("นำเข้าแล้ว", "Imported")} ${n} ${L("รายการ", "rows")}`); } });
document.addEventListener("change", e => { if (e.target.id === "asof-sel") setAsOf(e.target.value); });

// B8 shows the control; the FY2569 tab reads the history.
{
  const v = VIEWS.dashboard, b = BIND.dashboard;
  const hist = fn => { if (MON_TAB !== "overview" || !S.y2569) return fn(); const live = S.dash, af = ACT_F.slice(); S.dash = S.y2569.dash; ACT_F.length = 0; ACT_F.push(...ACT_F_2569); try { return fn(); } finally { S.dash = live; ACT_F.length = 0; ACT_F.push(...af); } };
  VIEWS.dashboard = () => {
    const h = hist(v), sel = `<div class="asof"><label for="asof-sel">${svgI("cal")} ${L("ข้อมูล ณ", "Figures as of")}</label><select id="asof-sel">${asOfOpts().map(([d, l]) => `<option value="${d}" ${d === TODAY || (d === REAL_TODAY && !S.asOf) ? "selected" : ""}>${l}</option>`).join("")}</select><span class="sub">${L("เลื่อนเดือนเพื่อสาธิต · ไปข้างหน้าจะนำเข้าผลเบิกจ่ายจำลอง", "Move the month for a demo · going forward imports simulated disbursement")}</span></div>`;
    return MON_TAB === "overview" ? h.replace(/(<div class="head">[\s\S]*?<\/div><\/div>)/, `$1<div class="alert"><div class="ic">i</div><div><b>${L("ข้อมูลปี", "FY")} ${CUR_FY - 1} · ${L("ประวัติ อ่านอย่างเดียว", "history, read-only")}</b></div></div>`) : h.replace(/(<div class="head">[\s\S]*?<\/div>)(\s*<div class="tabs")/, `$1${sel}$2`).replace(/<p>[\s\S]*?<\/p>/, `<p>${fyLabel(CUR_FY)} · ${L("ข้อมูลสะสม ณ", "Cumulative to")} ${fdate(TODAY)} (${L("เดือนที่", "month")} ${monthIdx() + 1} ${L("จาก 12", "of 12")}) · ${L("จากบรรทัดจัดสรร B7 และผลเบิกจ่าย GFMIS", "from the B7 allocation lines and GFMIS disbursement")}</p>`);
  };
  BIND.dashboard = () => hist(b);
}
// The import tab gets the simulated file.
{
  const im = MON_PANELS.import;
  MON_PANELS.import = () => im() + (ROLE === "fin" || ROLE === "plan" ? `<section class="panel"><header><h2>${L("จำลองไฟล์ GFMIS", "Simulated GFMIS file")}</h2><span class="sp"></span><span class="mono sub">SIM-04</span></header>
    <div class="body row" style="flex-wrap:wrap;gap:10px"><span class="sub">${L("สร้างผลเบิกจ่ายรายบรรทัดถึงเดือนปัจจุบัน ตามแผนรายเดือน × 70–105%", "Creates disbursement per line up to this month: the monthly plan × 70–105%")}</span><button class="btn" type="button" data-simgf>${L("นำเข้าไฟล์จำลองถึง", "Import a simulated file to")} ${FY_MONTHS[LANG][monthIdx()]}</button></div></section>` : "");
}

// ---------- seed: FY2569 into history, FY2570 records per allocation line ----------
function seedLiveYear(s) {
  const A = s.allocs && s.allocs[CUR_FY]; if (!A || !s.dash) return;
  s.y2569 = { fy: s.dash.fy, dash: s.dash, progress: s.progress, proc: s.proc, outputs: s.perf.outputs, qrep: s.qrep, lastCost: s.lastCost, gfmis: s.gfmis };
  const L2 = A.lines.filter(l => !l.cancelled);
  s.progress = {}; s.proc = {}; s.lastCost = {}; s.qrep = { Q1: {}, Q2: {}, Q3: {}, Q4: {}, Y: {} }; s.asOf = null;
  // last year's unit costs carry over where the line continues an earlier project of the same unit and type
  s.perf.outputs = {};
  L2.filter(l => l.type !== "per").forEach(l => {
    const inv = l.type === "inv", t = inv ? 100 : Math.max(10, Math.round(l.amount / 1e6 * 120));
    s.perf.outputs[l.id] = { name: inv ? [`ความก้าวหน้าของงาน ${l.name[0]}`, `Progress of ${l.name[1]}`] : [`ผู้รับบริการจาก ${l.name[0]}`, `People served by ${l.name[1]}`], unit: inv ? ["ร้อยละ", "%"] : ["ราย", "people"], target: t, result: null, kpi: null };
    const old = (s.y2569.dash.projects || []).find(p => p.unit === l.unit && p.type === l.type), oc = old && s.y2569.lastCost && s.y2569.lastCost[old.id];
    if (oc && !inv) s.lastCost[l.id] = Math.round(l.amount / t * 0.97);
  });
  // investment lines: e-GP milestones from early October, two already started
  const day = (iso, n) => { const [y, m, dd] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); };
  L2.filter(l => l.type === "inv").forEach((l, i) => { const start = day(`${CUR_FY - 544}-10-01`, i * 5);
    s.proc[l.id] = [0, 1, 2, 3, 4].map(n => { const plan = day(start, n * 45 + (n > 2 ? 30 : 0)); return { plan, actual: n === 0 && i < 2 ? day(plan, i * 3) : null }; }); });
  // October so far: about half a month of the plan, as an imported GFMIS file
  s.disb = {}; L2.forEach(l => { const d = (s.disb[l.id] = Array(12).fill(null)); d[0] = Math.round((l.plan ? l.plan[0] : 0) * (0.35 + (l.id.length % 3) * 0.1)); });
  const units = [...new Set(L2.map(l => l.unit))];
  s.gfmis = units.map((u, i) => { const gf = sumv(L2.filter(l => l.unit === u).map(l => s.disb[l.id][0] || 0)), off = i === 1 ? Math.round(gf * 0.05) : 0;
    return { id: "G" + (i + 1), code: `${u}-${CUR_FY}-M01`, unit: u, gf, fk: gf - off, ok: !off, reason: off ? "" : "timing" }; });
  // one unit has already reported progress on a line, with a risk
  const inv = L2.find(l => l.type === "inv");
  if (inv) s.progress[inv.id] = { pct: 4, status: "risk", issue: ["ร่าง TOR ยังไม่ผ่านการพิจารณา คาดประกาศเชิญชวนช้ากว่าแผน 3 สัปดาห์", "The TOR draft isn't approved; the invitation will be about three weeks late"], next: Math.round((inv.plan ? inv.plan[1] : 0) / 1e5) / 10, t: `${TODAY}T09:00`, by: (s.users.find(u => u.role === "div") || {}).id };
}
// B9 quarterly reports open on the current quarter of the year being spent.
QR_ROUND = "Q1";
