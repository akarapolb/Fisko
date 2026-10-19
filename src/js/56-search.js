// Global search (round 7): one box across pages and records, filtered by what the current role may open.
let S_HITS = [], S_SEL = 0;
const STYPE = {
  page: ["หน้า", "Page"], request: ["คำขอ", "Request"], kpi: ["ตัวชี้วัด", "KPI"], strategy: ["ยุทธศาสตร์", "Strategy"],
  activity: ["กิจกรรม", "Activity"], project: ["โครงการที่ใช้จ่าย", "Project"], line: ["รายการจัดสรร", "Allocation line"],
  transfer: ["โอนเปลี่ยนแปลง", "Transfer"], meeting: ["การประชุม", "Meeting"], user: ["ผู้ใช้", "User"], rule: ["กฎ", "Rule"], delegation: ["การมอบอำนาจ", "Delegation"],
};
function searchItems() {
  const out = [], add = (type, page, label, sub, run, hay) => { if (allowed(page)) out.push({ type, label, sub, run, hay: (label + " " + sub + " " + (hay || "")).toLowerCase() }); };
  NAV.filter(n => n.roles.includes(ROLE)).forEach(n => add("page", n.id, tx(n.label), n.code, () => go(n.id), n.label.join(" ")));
  (ROLE === "div" ? S.requests.filter(r => r.unit === me().unit) : S.requests).forEach(r =>
    add("request", "requests", `${r.id} ${tx(r.name)}`, `${unitName(r.unit)} · ${tx(STATUS[r.status][0])}`, () => openReq(r.id), [].concat(r.name).join(" ") + " " + budgetCode(r)));
  allKpis().forEach(({ k, st }) => add("kpi", "strategy", `${k.id} ${tx(k.name)}`, `${st.id} · ${unitName(k.owner)}`, () => jump("strat-kpis"), k.name.join(" ")));
  S.strategy.items.forEach(st => add("strategy", "strategy", `${st.id} ${tx(st.name)}`, natName(st.nat), () => jump("strat-map"), st.name.join(" ")));
  (S.structure[FORM_FY] || []).filter(a => a.lvl === "activity").forEach(a => add("activity", "strategy", `${a.code} ${tx(a.name)}`, fyLabel(FORM_FY), () => jump("strat-links"), a.name.join(" ")));
  S.dash.projects.forEach(p => add("project", "dashboard", tx(p.name), unitName(p.unit), () => { MON_TAB = "drill"; DRILL_U = p.unit; DRILL_P = p.id; go("dashboard"); }, [].concat(p.name).join(" ")));
  Object.values(S.allocs).forEach(A => {
    A.lines.forEach(l => add("line", "allocation", `${l.id} ${tx(l.name)}`, `${unitName(l.unit)} · ${fyLabel(A.fy)}`, () => { ALLOC_FY = A.fy; ALLOC_TAB = "allocate"; OPEN_UNIT.add(l.unit); go("allocation"); }, [].concat(l.name).join(" ")));
    A.transfers.forEach(t => add("transfer", "allocation", t.id, `${mb(t.amount)} ${L("ลบ.", "M")} · ${tx(t.why)}`, () => { ALLOC_FY = A.fy; ALLOC_TAB = "transfers"; go("allocation"); }, t.why.join(" ")));
  });
  S.meetings.forEach(m => add("meeting", "review", `${L("การประชุม", "Meeting")} ${tx(m.no)}`, fdate(m.date), () => jump("rev-meetings"), m.no.join(" ")));
  if (ROLE === "admin") {
    S.users.forEach(u => add("user", "admin", tx(u.name), `${tx(ROLES[u.role])} · ${unitName(u.unit)}`, () => jump("admin-users"), u.name.join(" ")));
    S.rules.forEach(r => add("rule", "admin", `${r.id} ${tx(r.name)}`, r.on ? L("ใช้งาน", "On") : L("ปิด", "Off"), () => jump("admin-rules"), r.name.join(" ")));
  }
  S.delegations.filter(d => ROLE === "admin" || d.from === me().id || d.to === me().id).forEach(d => out.push({ type: "delegation", label: d.id, sub: `${tx(userById(d.from).name)} → ${tx(userById(d.to).name)}`, run: () => go("delegation"), hay: (d.id + " " + d.why.join(" ")).toLowerCase() }));
  return out;
}
function runSearch(q) {
  const p = $("#spanel"), inp = $("#gsearch");
  q = q.trim().toLowerCase();
  if (!q) { p.hidden = true; inp.setAttribute("aria-expanded", "false"); return; }
  const words = q.split(/\s+/);
  const hits = searchItems().filter(i => words.every(w => i.hay.includes(w)));
  const by = {}; hits.forEach(h => (by[h.type] = by[h.type] || []).push(h));
  S_HITS = []; let html = "";
  Object.keys(STYPE).forEach(t => { if (!by[t]) return;
    html += `<div class="sgroup">${tx(STYPE[t])} <span class="sub">${by[t].length}</span></div>`;
    by[t].slice(0, 6).forEach(h => { html += `<div class="sitem" role="option" id="sh-${S_HITS.length}" data-si="${S_HITS.length}"><b>${esc(h.label)}</b><small>${esc(h.sub)}</small></div>`; S_HITS.push(h); });
  });
  p.innerHTML = html || `<div class="sitem" style="cursor:default"><small>${L("ไม่พบผลลัพธ์ที่ตรงกับ", "Nothing matches")} “${esc(q)}”</small></div>`;
  p.hidden = false; inp.setAttribute("aria-expanded", "true");
  S_SEL = 0; markSel();
  $$("#spanel [data-si]").forEach(el => (el.onmousedown = e => { e.preventDefault(); pick(Number(el.dataset.si)); }));
}
function markSel() { $$("#spanel .sitem").forEach(el => el.classList.toggle("on", Number(el.dataset.si) === S_SEL)); const el = $("#sh-" + S_SEL); if (el) { el.scrollIntoView({ block: "nearest" }); $("#gsearch").setAttribute("aria-activedescendant", el.id); } }
function pick(i) { const h = S_HITS[i]; if (!h) return; $("#gsearch").value = ""; $("#spanel").hidden = true; $("#gsearch").blur(); h.run(); }
function bindSearch() {
  const inp = $("#gsearch");
  inp.oninput = () => runSearch(inp.value);
  inp.onfocus = () => { if (inp.value) runSearch(inp.value); };
  inp.onblur = () => setTimeout(() => ($("#spanel").hidden = true), 120);
  inp.onkeydown = e => {
    if (e.key === "ArrowDown") { e.preventDefault(); S_SEL = Math.min(S_HITS.length - 1, S_SEL + 1); markSel(); }
    if (e.key === "ArrowUp") { e.preventDefault(); S_SEL = Math.max(0, S_SEL - 1); markSel(); }
    if (e.key === "Enter") { e.preventDefault(); pick(S_SEL); }
    if (e.key === "Escape") { inp.value = ""; $("#spanel").hidden = true; inp.blur(); }
  };
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) { if ($("#signin").hidden) { e.preventDefault(); inp.focus(); } }
  });
}
