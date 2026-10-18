// App switcher (round 12): Fisko Budget, Fisko Procurement and Fisko Finance as three apps on one platform.
// Each app shows only its own menu. My Workspace and System Administration are shared by every app.
// The page you open decides the current app, so deep links, tasks and notifications switch apps by themselves.
const APPS = {
  budget: { name: ["Fisko Budget", "Fisko Budget"], desc: ["วางแผนและบริหารงบประมาณ", "Plan and manage the budget"], groups: ["form", "exec", "intel"], mark: "B", color: "var(--app-b)" },
  procurement: { name: ["Fisko Procurement", "Fisko Procurement"], desc: ["เตรียมและติดตามการจัดซื้อจัดจ้าง", "Prepare and track procurement"], groups: ["procurement"], mark: "P", color: "var(--app-p)" },
  finance: { name: ["Fisko Finance", "Fisko Finance"], desc: ["วงเงินผูกพันและการเบิกจ่าย", "Commitments and payments"], groups: ["finance"], mark: "F", color: "var(--app-f)" },
};
const APP_LAST = {}; // last page opened in each app, so switching back returns you there
NAV.forEach(n => { if (!n.app) n.app = n.id === "home" || n.id === "admin" ? "all" : "budget"; });

const appItems = id => NAV.filter(n => n.app === id && n.roles.includes(ROLE));
const appAllowed = id => appItems(id).length > 0;
function ensureApp() {
  if (!APPS[APP]) APP = "budget";
  if (!appAllowed(APP)) { const a = APP_IDS.find(appAllowed); if (a) APP = a; }
}
function appOfLink(l) {
  if (!l) return "budget";
  if (l.startsWith("prc-") || l.startsWith("case:") || l === "procurement") return "procurement";
  if (l.startsWith("fnc-") || l === "finance") return "finance";
  if (l.startsWith("admin") || l === "home" || l === "delegation" || l === "advances" || l === "cashcount") return "all";
  return "budget";
}
const appChip = l => { const a = appOfLink(l); return a === "budget" || a === "all" ? "" : `<span class="appchip" style="--c:${APPS[a].color}">${esc(tx(APPS[a].name))}</span> `; };

// Menu badges for the pages inside the Procurement and Finance apps.
function tabBadge(nid, tab) {
  let n = 0;
  if (nid === "procurement" && tab === "reqn" && canSpend()) n = S.reqn.filter(r => r.status === "pending").length;
  if (nid === "procurement" && tab === "cases" && isProcRole()) n = S.cases.filter(c => { const s = caseState(c); return !c.cancelled && s >= 3 && s <= 8 && (ROLE === "prochead" ? (c.methodApproval && c.methodApproval.status === "pending") || (c.appeal && c.appeal.status === "open") : caseNext(c).who === "proc"); }).length;
  if (nid === "procurement" && tab === "contracts" && isProcRole()) n = S.cases.filter(c => caseState(c) === 8).length;
  if (nid === "procurement" && tab === "plan" && ROLE === "div") n = S.pplan.filter(p => p.status === "planned" && famLine(p.line).unit === me().unit).length;
  if (nid === "finance" && tab === "pay") n = (canSpend() ? S.payreqs.filter(p => p.status === "pending").length : 0) + (ROLE === "fin" ? famAcceptedUnpaid().length : 0);
  return n ? `<span class="badge">${n}</span>` : "";
}

function navForHash() {
  let v = (location.hash || "#home").slice(1);
  if (v.startsWith("admin-")) v = "admin";
  if (v === "request") v = "requests";
  return NAV.find(n => n.id === v) || null;
}
function markNav(n) {
  $$("#nav a").forEach(a => {
    const t = a.dataset.tab;
    a.classList.toggle("on", !!n && a.dataset.v === n.id && (!t || (n.tabGet && n.tabGet() === t)));
  });
}
function renderAppBrand() {
  const a = APPS[APP];
  if (!a) return;
  $("#brand-app").textContent = tx(a.name);
  $("#brand-sub").textContent = tx(a.desc);
  $("#brand-mark").style.background = a.color;
  document.body.dataset.app = APP;
  $("#appsw").setAttribute("aria-label", `${L("สลับแอป", "Switch app")}: ${tx(a.name)}`);
}
function renderNav() {
  ensureApp();
  const groups = ["overview", ...APPS[APP].groups, "sys"];
  let html = "";
  groups.forEach(g => {
    const items = NAV.filter(n => n.group === g && n.roles.includes(ROLE) && (n.app === "all" || n.app === APP));
    if (!items.length) return;
    // An app whose pages carry their own groups (Finance) shows those headings instead of the app's one.
    const own = items.length === 1 && items[0].tabs && items[0].tabs[0][3];
    if (!own) html += `<div class="nav-h">${tx(GROUPS[g])}</div>`;
    items.forEach(n => {
      let sub = null;
      if (n.tabs) n.tabs.filter(t => !t[4] || t[4].includes(ROLE)).forEach(([id, label, code, grp]) => (html += `${grp && grp !== sub ? `<div class="nav-h">${tx((sub = grp))}</div>` : ""}<a href="#${n.id}" data-v="${n.id}" data-tab="${id}" title="${code}"><span class="ni">${svgI(NAV_ICON[id] || "dot")}</span><span class="code">${code}</span><span class="nl">${tx(label)}</span>${tabBadge(n.id, id)}</a>`));
      else html += `<a href="#${n.id}" data-v="${n.id}" title="${n.code}"><span class="ni">${svgI(NAV_ICON[n.id] || "dot")}</span><span class="code">${n.code}</span><span class="nl">${tx(n.label)}</span>${n.soon ? `<span class="soon">${L("รอบ", "R")} ${n.soon}</span>` : navBadge(n.id)}</a>`;
    });
  });
  $("#nav").innerHTML = html;
  $$("#nav a[data-tab]").forEach(a => (a.onclick = e => { e.preventDefault(); const n = NAV.find(x => x.id === a.dataset.v); n.tabSet(a.dataset.tab); go(n.id); }));
  markNav(navForHash());
  renderAppBrand();
}
// Called by the router on every page change: the page's app becomes the current app.
function appSync(n) {
  if (n && n.app !== "all" && n.roles.includes(ROLE)) {
    APP_LAST[n.app] = n.id;
    if (n.app !== APP) { APP = n.app; store.set("fisko-app", APP); renderNav(); }
  }
  markNav(n);
}

function renderAppMenu() {
  const m = $("#appmenu"), tasks = myTasks();
  m.innerHTML = `<div class="appmenu-h">${L("สลับแอป", "Switch app")}</div>` + APP_IDS.map(id => {
    const a = APPS[id], ok = appAllowed(id), cnt = tasks.filter(t => appOfLink(t.link) === id).length;
    return `<button type="button" role="menuitem" class="appitem ${id === APP ? "on" : ""}" data-app="${id}" ${ok ? "" : "disabled"}>
      <span class="appico" style="background:${a.color}">${a.mark}</span>
      <span class="appt"><b>${esc(tx(a.name))}</b><small>${ok ? esc(tx(a.desc)) : L("บทบาทนี้ไม่มีสิทธิ์ใช้แอปนี้", "This role has no access to this app")}</small></span>
      ${cnt ? `<span class="appcnt" title="${L("งานที่ต้องทำ", "Tasks to do")}">${cnt}</span>` : ""}${id === APP ? `<span class="appcur" aria-label="${L("แอปปัจจุบัน", "Current app")}">✓</span>` : ""}</button>`;
  }).join("") + `<div class="appmenu-f">${L("งานของฉันและผู้ดูแลระบบใช้ร่วมกันทุกแอป", "My Workspace and System Administration are shared by every app")}</div>`;
  $$("#appmenu .appitem").forEach(b => (b.onclick = () => switchApp(b.dataset.app)));
}
function toggleAppMenu(show) {
  const m = $("#appmenu"), b = $("#appsw"), s = show === undefined ? m.hidden : show;
  if (s) renderAppMenu();
  m.hidden = !s;
  b.setAttribute("aria-expanded", String(s));
  if (!s) return;
  const r = b.getBoundingClientRect();
  m.style.top = r.bottom + 8 + "px";
  m.style.left = Math.max(12, Math.min(r.left, innerWidth - m.offsetWidth - 12)) + "px";
  const f = m.querySelector(".appitem.on:not([disabled])") || m.querySelector(".appitem:not([disabled])");
  if (f) f.focus();
}
function switchApp(id) {
  if (!appAllowed(id)) return;
  toggleAppMenu(false);
  const items = appItems(id), target = items.find(n => n.id === APP_LAST[id]) || items[0];
  APP = id; store.set("fisko-app", id);
  renderNav();
  go(target.id);
  toast(`${L("เปิดแอป", "Opened")} ${tx(APPS[id].name)}`);
}
function bindApps() {
  $("#appsw").onclick = e => { e.stopPropagation(); toggleNotes(false); toggleUserMenu(false); toggleAppMenu(); };
  document.addEventListener("click", e => { if (!$("#appmenu").hidden && !e.target.closest("#appmenu")) toggleAppMenu(false); });
  document.addEventListener("keydown", e => {
    if ($("#appmenu").hidden) return;
    if (e.key === "Escape") { toggleAppMenu(false); $("#appsw").focus(); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const it = $$("#appmenu .appitem:not([disabled])"), i = it.indexOf(document.activeElement);
      it[(i + (e.key === "ArrowDown" ? 1 : -1) + it.length) % it.length].focus();
    }
  });
  window.addEventListener("resize", () => toggleAppMenu(false));
}

// Search: switch app, and jump to a page inside the Procurement or Finance apps.
STYPE.app = ["แอป", "App"];
{
  const base = searchItems;
  searchItems = () => {
    const out = base();
    APP_IDS.filter(appAllowed).forEach(id => out.push({ type: "app", label: tx(APPS[id].name), sub: tx(APPS[id].desc), run: () => switchApp(id), hay: (APPS[id].name.join(" ") + " " + APPS[id].desc.join(" ") + " switch app สลับแอป").toLowerCase() }));
    NAV.filter(n => n.tabs && n.roles.includes(ROLE)).forEach(n => n.tabs.filter(t => !t[4] || t[4].includes(ROLE)).forEach(([id, label]) => out.push({ type: "page", label: `${tx(APPS[n.app].name)} › ${tx(label)}`, sub: n.code, run: () => jump(`${n.jumpPrefix}-${id}`), hay: (label.join(" ") + " " + APPS[n.app].name[0]).toLowerCase() })));
    return out;
  };
}
