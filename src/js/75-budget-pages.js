// Fisko Budget pages (round 47: information architecture), the same way 66h-fin-pages.js and 74-proc-pages.js lay
// out Finance and Procurement. The pages are renumbered B1 to B11 (the old module code stays on the eyebrow, for
// example "B7 · M06"), grouped by the budget cycle: formulation for FY2571, execution for FY2570, and results and
// analysis. M09 is split into two pages: analytics and forecasts (B10) and the AI assistant and agents (B11).
// Each tab lists the old tab keys it holds. Opening a tab sets the module's variable (STRAT_TAB, MON_TAB and so on) to
// a key, so the panels and binders from rounds 1 to B5 and old links such as "alloc-carry" keep working. A tab with
// more than one key shows a segment bar for them. The old tab bar is still rendered by each module and is swapped
// for the new one here, so its role filter and its counts carry over. Moving a tab means editing this table.
const B_ALL = ["div", "plan", "exec", "fin", "audit"];
const BUD_MOD = {
  strategy: { get: () => STRAT_TAB, set: v => (STRAT_TAB = v) },
  consolidation: { get: () => CONS_TAB, set: v => (CONS_TAB = v) },
  review: { get: () => REV_TAB, set: v => (REV_TAB = v) },
  submission: { get: () => SUB_TAB, set: v => (SUB_TAB = v) },
  allocation: { get: () => ALLOC_TAB, set: v => (ALLOC_TAB = v) },
  dashboard: { get: () => MON_TAB, set: v => (MON_TAB = v) },
  performance: { get: () => PERF_TAB, set: v => (PERF_TAB = v) },
  intel: { get: () => INTEL_TAB, set: v => (INTEL_TAB = v) },
};
Object.assign(GROUPS, { bud: ["งบประมาณ", "Budget"], form: [`จัดทำงบประมาณ ปี ${CUR_FY + 1}`, `Formulation, FY${CUR_FY + 1}`], exec: [`บริหารงบประมาณ ปี ${CUR_FY}`, `Execution, FY${CUR_FY}`], intel: ["ผลสัมฤทธิ์และวิเคราะห์", "Results and analysis"] });
APPS.budget.groups = ["bud", "form", "exec", "intel"];
// A tab is an old key, or { id, label, keys, roles } for several keys behind one tab.
const BUD_PAGES = [
  { id: "btoday", code: "B1", group: "bud", label: ["งานงบประมาณวันนี้", "Budget today"], roles: B_ALL },
  { id: "strategy", code: "B2", m: "M01", group: "form", mod: "strategy",
    tabs: [{ id: "map", roles: [...B_ALL] }, { id: "kpis" }, { id: "linkage", label: ["ความเชื่อมโยง", "Linkage"], keys: ["links", "link"], roles: ["plan", "exec", "audit"] },
      { id: "align", roles: ["plan", "exec", "audit"] }, { id: "bank" }, { id: "revise", roles: ["plan", "exec", "audit"] }] },
  { id: "requests", code: "B3", m: "M02", group: "form" },
  { id: "consolidation", code: "B4", m: "M03", group: "form", mod: "consolidation",
    tabs: ["overview", "priority", { id: "ceil", label: ["เพดานวงเงินและคำตอบหน่วยงาน", "Ceilings and replies"], keys: ["ceilings", "responses"] }, "programme",
      { id: "analysis", label: ["วิเคราะห์ 3 ปีและฐานศูนย์", "Three-year and zero-base"], keys: ["r3", "zbb"] }, "forward"] },
  { id: "review", code: "B5", m: "M04", group: "form", mod: "review", tabs: ["queue", "rounds", "meetings", "compare", "hearings", "impact"] },
  { id: "submission", code: "B6", m: "M05", group: "form", mod: "submission",
    tabs: ["checks", { id: "pack", label: ["ชุดคำขอและแบบฟอร์ม", "Pack and forms"], keys: ["pack", "form", "export"] },
      { id: "status", label: ["สถานะและรัฐสภา", "Status and Parliament"], keys: ["status", "parliament"] }, "brief"] },
  { id: "allocation", code: "B7", m: "M06", group: "exec", mod: "allocation",
    tabs: [{ id: "money", label: ["วงเงินและการจัดสรร", "Appropriation and allocation"], keys: ["appropriation", "allocate"] }, "plan", "balance", "transfers", "releases",
      { id: "carry", label: ["กันเงินและเงินเหลือจ่าย", "Carry-over and savings"], keys: ["carry", "savings"] }, "nb"] },
  { id: "dashboard", code: "B8", m: "M07", group: "exec", mod: "dashboard",
    tabs: ["live", "drill", "forecast", "alerts", "progress", "procure", { id: "import", roles: ["plan", "exec", "fin", "audit"] }, { id: "overview", label: [`ปี ${CUR_FY - 1}`, `FY${CUR_FY - 1}`] }] },
  { id: "performance", code: "B9", m: "M08", group: "intel", mod: "performance",
    tabs: [{ id: "kpis", label: ["ตัวชี้วัดและบัตรคะแนน", "KPIs and scorecard"], keys: ["kpis", "scorecard"] }, "chain", "quarter", { id: "cost", roles: ["plan", "exec", "audit"] },
      { id: "evals", label: ["รายงานและประเมินผล", "Reports and evaluation"], keys: ["report", "evaluate", "stages"], roles: ["plan", "exec", "audit"] }, "recs", { id: "public", roles: ["plan", "exec", "audit"] }] },
  { id: "insight", code: "B10", m: "M09", group: "intel", mod: "intel", view: "assistant", roles: ["plan", "exec", "fin", "audit"],
    label: ["วิเคราะห์และพยากรณ์", "Analytics and forecasts"], h1: ["วิเคราะห์และพยากรณ์งบประมาณ", "Budget analytics and forecasts"],
    tabs: ["bfore", { id: "sim", label: ["จำลองสถานการณ์", "What-if"], keys: ["bwhatif", "whatif"] }, "trends",
      { id: "signals", label: ["สัญญาณและคุณภาพ", "Signals and quality"], keys: ["bkpi", "anoms", "quality"] }] },
  { id: "assistant", code: "B11", m: "M09", group: "intel", mod: "intel",
    label: ["ผู้ช่วย AI และเอเจนต์", "AI assistant and agents"], h1: ["ผู้ช่วย AI และเอเจนต์งบประมาณ", "Budget AI assistant and agents"],
    tabs: ["ask", { id: "bagents", roles: ["plan", "exec", "fin", "audit"] }, { id: "agents", roles: ["plan", "exec", "fin", "audit"] }] },
];
BUD_PAGES.forEach(p => (p.tabs = (p.tabs || []).map(t => (typeof t === "string" ? { id: t } : t)).map(t => ({ ...t, keys: t.keys || [t.id] }))));
const bPage = id => BUD_PAGES.find(p => p.id === id);
// The division director sees what the division sees.
const bTabs = p => p.tabs.filter(t => !t.roles || t.roles.includes(ROLE) || (ROLE === "divhead" && t.roles.includes("div")));
const bSees = p => allowed(p.id) && (!p.tabs.length || bTabs(p).length > 0);
const bTabOf = (p, k) => bTabs(p).find(t => t.keys.includes(k));
// The visible page that holds an old key of a module (the M09 keys live on B10 or B11).
const bOwner = (mod, k) => BUD_PAGES.find(p => p.mod === mod && bSees(p) && bTabOf(p, k));
const BUD_SEEN = {}, BUD_KEY = {}, BUD_SUB = {};
let BUD_ON = null; // the Budget page on screen

// The old bar's tabs: key → label (the label keeps its counts, for example "Alerts (3)").
function bOldBar(html) {
  const m = html.match(/<div class="tabs" role="tablist">[\s\S]*?<\/div>/);
  if (!m) return null;
  const L2 = {};
  m[0].replace(/<button[^>]*data-\w+="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g, (_, k, l) => (L2[k] = l));
  return { html: m[0], L: L2 };
}
const bCount = l => { const m = String(l).match(/\((\d+)\)\s*$/) || String(l).match(/class="badge">(\d+)</); return m ? Number(m[1]) : 0; };
const bPlain = l => String(l).replace(/\s*\(\d+\)\s*$/, "").replace(/\s*<span class="badge">\d+<\/span>/, "");

function bRender(p, base) {
  const mod = BUD_MOD[p.mod];
  let k = mod.get();
  const changed = k !== BUD_SEEN[p.mod];
  if (!bTabOf(p, k)) {
    // A key set on purpose (a deep link, or a button in another panel) opens the page that holds it.
    const q = changed ? bOwner(p.mod, k) : null;
    if (q && q.id !== p.id) return bRedirect(q, base);
    const last = BUD_KEY[p.id];
    mod.set(last && bTabOf(p, last) ? last : bTabs(p)[0].keys[0]);
  }
  let html = base(), bar = bOldBar(html);
  if (bar && !bar.L[mod.get()]) {
    const first = bTabs(p).map(t => t.keys.find(x => bar.L[x])).find(Boolean);
    if (first) { mod.set(first); html = base(); bar = bOldBar(html); }
  }
  k = mod.get(); BUD_SEEN[p.mod] = k; BUD_KEY[p.id] = k; BUD_ON = p.id;
  if (bar) {
    const T = bTabs(p).map(t => ({ ...t, keys: t.keys.filter(x => bar.L[x]) })).filter(t => t.keys.length), cur = T.find(t => t.keys.includes(k));
    if (cur) BUD_SUB[`${p.id}:${cur.id}`] = k;
    const lab = t => (t.label ? tx(t.label) : bPlain(bar.L[t.keys[0]]));
    const cnt = t => sumv(t.keys.map(x => bCount(bar.L[x])));
    const nb = `<div class="tabs" role="tablist" aria-label="${esc(tx(p.label || NAV.find(n => n.id === p.id).label))}" data-bbar>${T.map(t => `<button class="tab ${t === cur ? "on" : ""}" type="button" role="tab" aria-selected="${t === cur}" data-btab="${t.id}">${lab(t)}${cnt(t) ? ` <span class="badge">${cnt(t)}</span>` : ""}</button>`).join("")}</div>`
      + (cur && cur.keys.length > 1 ? `<div class="seg-scroll" style="margin:-4px 0 12px">${segBar(cur.keys.map(x => [x, bar.L[x]]), k, "bseg")}</div>` : "");
    html = html.replace(bar.html, nb);
  }
  return bHead(p, html);
}
// The eyebrow names the app, the new code and the old module code; B10 and B11 get their own heading.
function bHead(p, html) {
  html = html.replace(/<div class="eyebrow">M\d\d ·[^<]*/, `<div class="eyebrow">Fisko Budget · ${p.code}${p.m ? ` · ${p.m}` : ""} · ${tx(GROUPS[p.group])}`);
  if (p.h1) html = html.replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${tx(p.h1)}</h1>`);
  return html;
}
// Render another page in place of this one and fix the address, the crumb and the menu to match.
function bRedirect(q, base) {
  CUR = q.id;
  if (!window.FISKO_ROUTE && location.hash !== "#" + q.id) history.replaceState(null, "", "#" + q.id);
  const n = NAV.find(x => x.id === q.id);
  setTimeout(() => { markNav(n); $("#crumb").innerHTML = `${esc(tx(S.org))} · <b>${tx(n.label)}</b>`; });
  return bRender(q, base);
}

// ---------- wiring ----------
{
  const views = {}, binds = {};
  BUD_PAGES.filter(p => p.mod).forEach(p => { views[p.id] = VIEWS[p.view || p.id]; binds[p.id] = BIND[p.view || p.id] || (() => {}); });
  BUD_PAGES.filter(p => p.mod).forEach(p => {
    VIEWS[p.id] = () => bRender(p, views[p.view || p.id] || views[p.id]);
    BIND[p.id] = () => {
      binds[p.id]();
      const on = bPage(BUD_ON) || p, mod = BUD_MOD[on.mod];
      $$("[data-btab]").forEach(b => (b.onclick = () => { const t = bTabs(on).find(x => x.id === b.dataset.btab), s = BUD_SUB[`${on.id}:${t.id}`]; mod.set(s && t.keys.includes(s) ? s : t.keys[0]); route(); }));
      $$("[data-bseg]").forEach(b => (b.onclick = () => { mod.set(b.dataset.bseg); route(); }));
    };
  });
  ["requests", "request"].forEach(id => { const v = VIEWS[id]; if (v) VIEWS[id] = () => bHead(bPage("requests"), v()); });
  // B8 opens on this year; the FY2569 sample stays as the last tab.
  MON_TAB = "live";
  // The starting keys are defaults, not deep links: opening #insight fresh must not move you to B11.
  Object.keys(BUD_MOD).forEach(m => (BUD_SEEN[m] = BUD_MOD[m].get()));
  // "intel-bkpi" opens B10, "intel-ask" opens B11.
  const j = jump;
  jump = function (l) {
    if (typeof l === "string" && l.startsWith("intel-")) { const k = l.slice(6), q = bOwner("intel", k); INTEL_TAB = k; return go(q ? q.id : "assistant"); }
    return j(l);
  };
}

// ---------- B1 Budget today ----------
function bMine() { return myTasks().filter(t => t.cls !== "p-mute" && typeof t.link === "string" && appOfLink(t.link) === "budget"); }
function bAlerts() { return allowed("dashboard") && ROLE !== "div" ? monAlerts().filter(a => !S.acks.includes(a.id)) : []; }
VIEWS.btoday = () => {
  const t = bMine().sort((a, b) => (a.due < b.due ? -1 : 1)), next = S.calendar.filter(c => c.date >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1));
  const R = S.requests.filter(r => ROLE !== "div" || r.unit === me().unit), sent = R.filter(r => !["draft", "returned"].includes(r.status)), al = bAlerts();
  const p = bPage("btoday"), go2 = (l, txt) => `<button class="btn" type="button" data-bjump="${esc(l)}">${txt || L("เปิด", "Open")}</button>`;
  const pages = BUD_PAGES.filter(x => x.id !== "btoday" && bSees(x));
  return `
  <div class="head"><div><div class="eyebrow">Fisko Budget · ${p.code} · ${tx(GROUPS.bud)}</div><h1>${tx(p.label)}</h1>
    <p>${L("งานของคุณ กำหนดการในปฏิทินงบประมาณ และสิ่งที่ต้องดูในปีที่ใช้จ่ายอยู่", "Your work, the budget calendar, and what to watch in the year being spent")} · ${tx(ROLES[ROLE])}</p></div></div>
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi hl"><span class="l">${L("งานของฉัน", "My work")}</span><span class="v">${t.length}</span><span class="d" style="color:var(--rail-ink)">${t.filter(x => x.due <= TODAY).length} ${L("ถึงกำหนดหรือเลยแล้ว", "due or overdue")}</span></div>
    <div class="kpi"><span class="l">${L("กำหนดการถัดไป", "Next deadline")}</span><span class="v">${next.length ? daysUntil(next[0].date) : "–"}</span><span class="d sub">${next.length ? `${L("วัน", "days")} · ${esc(tx(next[0].name))}` : ""}</span></div>
    <div class="kpi"><span class="l">${ROLE === "div" ? L(`คำขอของหน่วยงาน ปี ${FORM_FY}`, `Your unit's FY${FORM_FY} requests`) : L(`คำขอ ปี ${FORM_FY} ที่ส่งแล้ว`, `FY${FORM_FY} requests sent`)}</span><span class="v">${sent.length}/${R.length}</span></div>
    <div class="kpi"><span class="l">${L(`การแจ้งเตือนการใช้จ่าย ปี ${CUR_FY}`, `FY${CUR_FY} spending alerts`)}</span><span class="v">${ROLE === "div" ? "–" : al.length}</span><span class="d sub">${ROLE === "div" ? L("ดูที่ B8", "See B8") : al.filter(a => a.lv === "bad").length + " " + L("รุนแรง", "serious")}</span></div>
  </section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("งานของฉันในแอปงบประมาณ", "My work in Budget")}</h2><span class="sp"></span><span class="sub">${t.length} ${L("รายการ", "items")}</span></header>
      ${t.length ? `<div class="tbl-wrap"><table><tbody>${t.slice(0, 10).map(x => `<tr><td>${dotI(x.cls === "p-bad" ? "bad" : x.cls === "p-warn" ? "warn" : "ok")}<b style="font-weight:600">${esc(x.title)}</b>${x.sub ? `<div class="sub">${esc(x.sub)}</div>` : ""}</td><td class="sub" style="white-space:nowrap">${clockTxt(x.due)}</td><td>${go2(x.link)}</td></tr>`).join("")}</tbody></table></div>`
        : `<div class="body sub">${dotI("ok")}${L("ไม่มีงานค้างในแอปงบประมาณ", "Nothing waiting for you in Budget")}</div>`}</section>
    <section class="panel"><header><h2>${L(`ปฏิทินงบประมาณ ปี ${FORM_FY}`, `FY${FORM_FY} budget calendar`)}</h2><span class="sp"></span><span class="pill p-warn">${L("ตัวอย่าง", "Sample")}</span></header>
      <ul class="tasks">${next.slice(0, 6).map(c => `<li><span class="pill ${c.role === ROLE ? "p-ok" : "p-mute"}" style="padding:2px 8px"></span>
        <div><b style="font-weight:600">${tx(c.name)}</b><div class="sub">${tx(ROLES[c.role])}</div></div>${dueText(c.date)}</li>`).join("") || `<li class="sub">${L("ไม่มีกำหนดการ", "No dates ahead")}</li>`}</ul></section>
  </div>
  ${al.length ? `<section class="panel"><header><h2>${L(`ต้องดูในปี ${CUR_FY}`, `To watch in FY${CUR_FY}`)}</h2><span class="sp"></span>${go2("mon-alerts", `${L("การแจ้งเตือนทั้งหมด", "All alerts")} (${al.length})`)}</header>
    <div class="tbl-wrap"><table><tbody>${al.slice(0, 5).map(a => `<tr><td>${dotI(a.lv === "bad" ? "bad" : a.lv === "warn" ? "warn" : "ok")}<b style="font-weight:600">${esc(a.t)}</b><div class="sub">${esc(a.d)}</div></td></tr>`).join("")}</tbody></table></div></section>` : ""}
  <section class="panel"><header><h2>${L("หน้าในแอปงบประมาณ", "Pages in Budget")}</h2></header>
    <div class="body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">${pages.map(x => { const n = NAV.find(y => y.id === x.id); return `<button class="btn ghost" type="button" data-bjump="${x.id}" style="justify-content:flex-start;text-align:left"><span class="mono">${x.code}</span>&nbsp;${esc(tx(x.label || n.label))}${x.m ? ` <span class="sub">· ${x.m}</span>` : ""}</button>`; }).join("")}</div></section>`;
};
BIND.btoday = () => $$("[data-bjump]").forEach(b => (b.onclick = () => jump(b.dataset.bjump)));

// ---------- menu ----------
{
  const i = NAV.findIndex(n => n.id === "home");
  NAV.splice(i + 1, 0, { id: "btoday", code: "B1", group: "bud", app: "budget", roles: B_ALL, label: bPage("btoday").label });
  const a = NAV.findIndex(n => n.id === "assistant"), as = NAV[a];
  NAV.splice(a, 0, { id: "insight", code: "B10", group: "intel", app: "budget", roles: bPage("insight").roles, label: bPage("insight").label });
  as.label = bPage("assistant").label;
  BUD_PAGES.forEach(p => { const n = NAV.find(x => x.id === p.id); if (n) { n.code = p.code; n.group = p.group; } });
  Object.assign(NAV_ICON, { btoday: "home", insight: "chart" });
  const nb = navBadge;
  navBadge = function (id) {
    if (id === "btoday") { const n = bMine().filter(x => x.due <= TODAY).length; return n ? `<span class="badge">${n}</span>` : ""; }
    if (id === "insight" && ["plan", "exec", "audit"].includes(ROLE)) { const n = (S.anoms || []).filter(x => x.status === "new").length; return n ? `<span class="badge">${n}</span>` : ""; }
    return nb(id);
  };
}
