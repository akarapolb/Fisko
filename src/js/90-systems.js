// Multi-system shell (round 62, after the Fabor console design): a system rail on the far left, a launcher that lists
// every system (live and planned) with pinning, a short sidebar per system, breadcrumbs Organization / System / Page,
// a pin button for the current page and a recently viewed list. Budget, Procurement and Finance keep their own menus
// (66-apps.js); this file adds Workspace, Administration and the planned systems around them.
Object.assign(ICONS, {
  grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  play: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m10 8 5 2.5-5 2.5z"/><path d="M8 21h8M12 17v4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
});

// Every system on the platform. "planned" systems are not built in this prototype: the launcher shows them and each
// has one page saying what it will cover and how it joins the live systems.
const SYSTEMS = {
  workspace: { grp: "everyday", icon: "home", name: ["พื้นที่ทำงาน", "Workspace"], desc: ["งานของคุณจากทุกระบบ", "Your work across every system"] },
  budget: { grp: "core", icon: "pie", app: true },
  procurement: { grp: "core", icon: "folder", app: true },
  finance: { grp: "core", icon: "wallet", app: true },
  admin: { grp: "platform", icon: "settings", name: ["ผู้ดูแลระบบ", "Administration"], desc: ["ผู้ใช้ สิทธิ์ Workflow กฎ และการเชื่อมต่อ", "Users, roles, workflow, rules and interfaces"] },
  assets: { grp: "planned", icon: "building", planned: true, name: ["Fisko Assets", "Fisko Assets"], desc: ["พัสดุ ครุภัณฑ์ และค่าเสื่อมราคา", "Stock, equipment and depreciation"],
    covers: [["ทะเบียนพัสดุและครุภัณฑ์ รับเข้าจากการตรวจรับใน Fisko Procurement", "Stock and equipment register, fed by acceptance in Fisko Procurement"], ["เบิกจ่ายพัสดุ โอนย้าย ตรวจนับประจำปี และจำหน่าย", "Issues, transfers, the annual count and disposal"], ["ค่าเสื่อมราคาและรายงานสินทรัพย์ส่ง GFMIS", "Depreciation and asset reports for GFMIS"]],
    joins: [["รับรายการจากใบตรวจรับของ Procurement", "Takes items from Procurement's acceptance certificates"], ["ส่งค่าเสื่อมราคาให้ Finance ลงบัญชี", "Sends depreciation to Finance for the books"]] },
  hr: { grp: "planned", icon: "users", planned: true, name: ["Fisko HR", "Fisko HR"], desc: ["อัตรากำลัง เงินเดือน และค่าตอบแทน", "Positions, payroll and allowances"],
    covers: [["กรอบอัตรากำลังและตำแหน่งว่าง", "Establishment and vacant posts"], ["เงินเดือน ค่าจ้าง และเงินเพิ่ม", "Salaries, wages and allowances"], ["ค่าใช้จ่ายบุคลากรรายปีเพื่อจัดทำคำขอ", "Personnel cost per year for budget requests"]],
    joins: [["ส่งงบบุคลากรเข้าคำขอใน Budget (แท็บเงินเดือน)", "Feeds personnel cost into Budget requests (payroll tab)"], ["ส่งรายการจ่ายเงินเดือนให้ Finance", "Sends the payroll run to Finance"]] },
  saraban: { grp: "planned", icon: "send", planned: true, name: ["Fisko e-Saraban", "Fisko e-Saraban"], desc: ["หนังสือราชการและการลงนามอิเล็กทรอนิกส์", "Official letters and e-signing"],
    covers: [["รับ ส่ง และลงทะเบียนหนังสือราชการ", "Receive, send and register official letters"], ["เสนอแฟ้มและลงนามอิเล็กทรอนิกส์", "Route files for e-signature"], ["เลขที่หนังสือและการเก็บรักษาตามระเบียบงานสารบรรณ", "Letter numbers and retention under the records rules"]],
    joins: [["ใช้เลขหนังสือและลายมือชื่อเดียวกับบันทึกใน Budget Procurement และ Finance", "One numbering and signature for memos in Budget, Procurement and Finance"]] },
  audit: { grp: "planned", icon: "shield", planned: true, name: ["Fisko Audit", "Fisko Audit"], desc: ["ตรวจสอบภายในและบริหารความเสี่ยง", "Internal audit and risk"],
    covers: [["แผนการตรวจสอบตามความเสี่ยง", "Risk-based audit plan"], ["กระดาษทำการ ข้อตรวจพบ และการติดตามแก้ไข", "Working papers, findings and follow-up"], ["ทะเบียนความเสี่ยงและการควบคุมภายใน", "Risk register and internal control"]],
    joins: [["อ่านบันทึกการใช้งานและข้อสังเกตจาก AI ของทุกระบบ", "Reads the audit log and AI flags of every system"]] },
  revenue: { grp: "planned", icon: "coins", planned: true, name: ["Fisko Revenue", "Fisko Revenue"], desc: ["รายได้แผ่นดินและค่าธรรมเนียม", "Government revenue and fees"],
    covers: [["อัตราค่าธรรมเนียมและการออกใบแจ้งหนี้", "Fee schedules and invoices"], ["ชำระผ่าน QR และ e-Payment", "Payment by QR and e-Payment"], ["ประมาณการรายได้และรายงานการจัดเก็บ", "Revenue estimates and collection reports"]],
    joins: [["ส่งใบเสร็จให้ Finance บันทึกรับและนำส่ง", "Sends receipts to Finance for recording and remittance"]] },
};
const SYS_GROUPS = [["everyday", ["ทุกวัน", "Everyday"]], ["core", ["ระบบหลัก", "Core systems"]], ["platform", ["แพลตฟอร์ม", "Platform"]], ["planned", ["อยู่ในแผน", "Planned"]]];
const SYS_IDS = Object.keys(SYSTEMS);
const sysName = id => (SYSTEMS[id].app ? APPS[id].name : SYSTEMS[id].name);
const sysDesc = id => (SYSTEMS[id].app ? APPS[id].desc : SYSTEMS[id].desc);
let SYS = "workspace";

// Workspace and planned-system pages are NAV entries shared by every app ("all"), in groups the app menus do not show,
// so the router, search, permissions and the test sweep treat them like any other page.
const WS_ROLES = Object.keys(ROLES).filter(r => r !== "vendor");
NAV.push(
  { id: "inbox", code: "", group: "ws", app: "all", roles: WS_ROLES, label: ["รออนุมัติ", "Approvals"] },
  { id: "exceptions", code: "", group: "ws", app: "all", roles: WS_ROLES, label: ["ศูนย์รายการผิดปกติ", "Exception centre"] },
  { id: "pins", code: "", group: "ws", app: "all", roles: WS_ROLES, label: ["ปักหมุดและล่าสุด", "Pinned and recent"] },
  ...SYS_IDS.filter(id => SYSTEMS[id].planned).map(id => ({ id: "sys-" + id, code: "", group: "planned", app: "all", roles: WS_ROLES, label: SYSTEMS[id].name })),
);
Object.assign(NAV_ICON, { inbox: "checksq", exceptions: "alert", pins: "star", demo: "play", delegation: "users" });

const WS_PAGES = new Set(["home", "inbox", "exceptions", "pins", "demo", "delegation", "profile"]);
function sysOfView(v) {
  if (v.startsWith("sys-") && SYSTEMS[v.slice(4)]) return v.slice(4);
  if (v === "admin" || v.startsWith("admin-")) return "admin";
  if (WS_PAGES.has(v)) return "workspace";
  if (v === "cashcount") return "finance";
  const n = NAV.find(x => x.id === v);
  if (n && APPS[n.app]) return n.app;
  return APPS[APP] ? APP : "workspace";
}
const sysAllowed = id => {
  const s = SYSTEMS[id];
  if (s.app) return appAllowed(id);
  if (id === "admin") return allowed("admin") && NAV.some(n => n.id === "admin");
  return id === "workspace" || WS_ROLES.includes(ROLE);
};
// Tasks for the current role that belong to a system (Workspace counts the ones that belong to no app).
const sysTasks = (id, all) => (all || (typeof myTasks === "function" ? myTasks() : [])).filter(t => { const a = appOfLink(t.link); return id === "workspace" ? a === "all" : a === id; });

// ---------- pins and recents (kept per browser) ----------
const jget = (k, d) => { try { const v = JSON.parse(store.get(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
const jset = (k, v) => store.set(k, JSON.stringify(v));
const SYS_PIN_DEF = ["workspace", "budget", "procurement", "finance", "admin"];
const sysPins = () => jget("fisko-sys-pins", SYS_PIN_DEF).filter(id => SYSTEMS[id]);
function toggleSysPin(id) { const p = sysPins(), i = p.indexOf(id); if (i >= 0) p.splice(i, 1); else p.push(id); jset("fisko-sys-pins", p); renderSysRail(); }
const pagePins = () => jget("fisko-pins", []);
const recents = () => jget("fisko-recent", []);
// The current page as a jump link and a bilingual label: "fnc-pay", "req:RQ-1", "admin-users" or a plain route.
function curPage() {
  const v = CUR, n = NAV.find(x => x.id === v);
  if (v === "request" && typeof CUR_REQ !== "undefined" && CUR_REQ) { const r = S.requests.find(x => x.id === CUR_REQ); return { link: "req:" + CUR_REQ, label: r ? r.name : [CUR_REQ, CUR_REQ], sys: "budget", id: CUR_REQ }; }
  if (v === "admin") { const t = (typeof ADMIN_TABS !== "undefined" ? ADMIN_TABS : []).find(x => x.id === ADMIN_TAB); return { link: t ? "admin-" + t.id : "admin", label: t ? t.label : n.label, sys: "admin" }; }
  if (n && n.tabs && n.jumpPrefix) { const t = n.tabs.find(x => x[0] === n.tabGet()); if (t) return { link: `${n.jumpPrefix}-${t[0]}`, label: t[1], sys: sysOfView(v) }; }
  const extra = { demo: ["คู่มือการสาธิต", "Demo guide"], delegation: ["การมอบอำนาจ", "Delegation of authority"], cashcount: ["ตรวจนับเงินประจำวัน", "Daily cash count"], home: ["วันนี้", "Today"] };
  return { link: v, label: extra[v] || (n ? n.label : [v, v]), sys: sysOfView(v) };
}
const isPinned = link => pagePins().some(p => p.link === link);
function togglePagePin() {
  const c = curPage(), p = pagePins(), i = p.findIndex(x => x.link === c.link);
  if (i >= 0) { p.splice(i, 1); toast(L("เลิกปักหมุดแล้ว", "Unpinned")); } else { p.unshift({ link: c.link, label: c.label, sys: c.sys }); toast(`${L("ปักหมุดแล้ว", "Pinned")}: ${tx(c.label)}`); }
  jset("fisko-pins", p.slice(0, 24)); paintPinBtn();
}
function noteRecent() {
  if (window.FISKO_ROUTE || !SESSION) return; // the test sweep routes thousands of times; keep its visits out
  const c = curPage(), r = recents().filter(x => x.link !== c.link);
  r.unshift({ link: c.link, label: c.label, sys: c.sys, t: nowIso() });
  jset("fisko-recent", r.slice(0, 12));
}

// ---------- the system rail ----------
function renderSysRail() {
  let el = $("#sysrail");
  if (!el) { el = document.createElement("nav"); el.id = "sysrail"; el.className = "sysrail"; $(".app").prepend(el); }
  el.setAttribute("aria-label", L("ระบบ", "Systems"));
  const ids = sysPins().filter(sysAllowed), all = typeof myTasks === "function" ? myTasks() : [];
  if (!ids.includes(SYS) && SYSTEMS[SYS]) ids.push(SYS); // the system you are in always shows
  const btn = id => { const n = id === "workspace" ? 0 : sysTasks(id, all).length, cur = id === SYS;
    return `<button type="button" class="sr-btn ${cur ? "on" : ""}" data-sys="${id}" title="${esc(tx(sysName(id)))}" aria-label="${esc(tx(sysName(id)))}${n ? ` · ${n} ${L("งาน", "tasks")}` : ""}" ${cur ? 'aria-current="true"' : ""}>${svgI(SYSTEMS[id].icon)}${n ? `<span class="sr-cnt">${n > 99 ? "99+" : n}</span>` : ""}</button>`; };
  el.innerHTML = `<div class="sr-mark" aria-hidden="true">Fk</div>${ids.filter(id => !SYSTEMS[id].planned).map(btn).join("")}${ids.some(id => SYSTEMS[id].planned) ? `<span class="sr-sep"></span>${ids.filter(id => SYSTEMS[id].planned).map(btn).join("")}` : ""}
    <span class="sr-sp"></span><span class="sr-sep"></span>
    <button type="button" class="sr-btn" id="sr-launch" title="${L("ทุกระบบ", "All systems")}" aria-label="${L("ทุกระบบ", "All systems")}" aria-haspopup="dialog">${svgI("grid")}</button>`;
  $$("#sysrail [data-sys]").forEach(b => (b.onclick = () => switchSys(b.dataset.sys)));
  $("#sr-launch").onclick = e => { e.stopPropagation(); openLauncher(); };
}
function switchSys(id) {
  closeLauncher();
  if (!sysAllowed(id)) return toast(L("บทบาทนี้ไม่มีสิทธิ์ใช้ระบบนี้", "This role has no access to this system"));
  if (SYSTEMS[id].app) return switchApp(id);
  if (id === "admin") return go("admin");
  if (SYSTEMS[id].planned) return go("sys-" + id);
  go("home");
}

// ---------- the launcher (replaces the old app menu) ----------
let LAUNCH_Q = "";
function openLauncher() {
  let el = $("#launcher");
  if (!el) { el = document.createElement("div"); el.id = "launcher"; el.className = "launcher"; el.hidden = true; document.body.appendChild(el); }
  LAUNCH_Q = ""; el.hidden = false; renderLauncher();
  $("#appsw").setAttribute("aria-expanded", "true");
  const q = $("#ln-q"); if (q) q.focus();
}
function closeLauncher() { const el = $("#launcher"); if (el && !el.hidden) { el.hidden = true; $("#appsw").setAttribute("aria-expanded", "false"); } }
function renderLauncher() {
  const el = $("#launcher"), q = LAUNCH_Q.trim().toLowerCase(), pins = sysPins(), all = typeof myTasks === "function" ? myTasks() : [];
  const hit = id => !q || (sysName(id).join(" ") + " " + sysDesc(id).join(" ")).toLowerCase().includes(q);
  const card = id => { const s = SYSTEMS[id], ok = sysAllowed(id), n = s.planned || id === "workspace" ? 0 : sysTasks(id, all).length, pin = pins.includes(id);
    return `<div class="ln-card ${s.planned ? "planned" : ""} ${id === SYS ? "on" : ""} ${ok ? "" : "off"}">
      <button type="button" class="ln-open" data-lsys="${id}" ${ok ? "" : "disabled"}><span class="ln-ico">${svgI(s.icon)}</span><span class="ln-t"><b>${esc(tx(sysName(id)))}</b><small>${ok ? esc(tx(sysDesc(id))) : L("บทบาทนี้ไม่มีสิทธิ์ใช้ระบบนี้", "This role has no access")}</small>
        ${s.planned ? `<span class="pill p-mute">${L("อยู่ในแผน", "Planned")}</span>` : n ? `<span class="ln-n">${n} ${L("งานรอคุณ", "waiting for you")}</span>` : ""}</span></button>
      ${ok ? `<button type="button" class="ln-pin ${pin ? "on" : ""}" data-lpin="${id}" aria-pressed="${pin}" title="${pin ? L("เอาออกจากแถบระบบ", "Remove from the rail") : L("ปักไว้ที่แถบระบบ", "Pin to the rail")}" aria-label="${pin ? L("เอาออกจากแถบระบบ", "Remove from the rail") : L("ปักไว้ที่แถบระบบ", "Pin to the rail")}: ${esc(tx(sysName(id)))}">${svgI("star")}</button>` : ""}</div>`; };
  const groups = SYS_GROUPS.map(([g, gl]) => { const ids = SYS_IDS.filter(id => SYSTEMS[id].grp === g && hit(id)); return ids.length ? `<div class="ln-h">${tx(gl)}</div><div class="ln-grid">${ids.map(card).join("")}</div>` : ""; }).join("");
  el.innerHTML = `<div class="ln-scrim" data-lclose></div><div class="ln-panel" role="dialog" aria-modal="true" aria-label="${L("ทุกระบบ", "All systems")}">
    <div class="ln-search">${svgI("search")}<input type="search" id="ln-q" value="${esc(LAUNCH_Q)}" placeholder="${L("ไปที่ระบบ… งบประมาณ จัดซื้อ การเงิน พัสดุ", "Switch to… Budget, Procurement, Finance, Assets")}" aria-label="${L("ค้นหาระบบ", "Find a system")}" autocomplete="off"><button type="button" class="btn ghost" data-lclose aria-label="${L("ปิด", "Close")}">✕</button></div>
    <div class="ln-body">${groups || `<div class="empty">${L("ไม่พบระบบที่ตรงกับคำค้น", "No system matches")}</div>`}</div>
    <div class="ln-foot">${L("ระบบที่ปักหมุดจะแสดงบนแถบด้านซ้าย · งานของฉันและผู้ดูแลระบบใช้ร่วมกันทุกระบบ · ระบบที่อยู่ในแผนยังไม่ได้สร้างในต้นแบบนี้", "Pinned systems show on the left rail · Workspace and Administration are shared by every system · Planned systems are not built in this prototype")}</div></div>`;
  $$("#launcher [data-lclose]").forEach(b => (b.onclick = closeLauncher));
  $$("#launcher [data-lsys]").forEach(b => (b.onclick = () => switchSys(b.dataset.lsys)));
  $$("#launcher [data-lpin]").forEach(b => (b.onclick = () => { toggleSysPin(b.dataset.lpin); renderLauncher(); const x = $(`#launcher [data-lpin="${b.dataset.lpin}"]`); if (x) x.focus(); }));
  const qi = $("#ln-q");
  qi.oninput = () => { const pos = qi.selectionStart; LAUNCH_Q = qi.value; renderLauncher(); const n = $("#ln-q"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
  qi.onkeydown = e => { if (e.key === "Enter") { const f = $("#launcher [data-lsys]:not([disabled])"); if (f) f.click(); } };
}
document.addEventListener("keydown", e => {
  const el = $("#launcher");
  if (!el || el.hidden) return;
  if (e.key === "Escape") { closeLauncher(); $("#appsw").focus(); return; }
  if (e.key === "Tab") { const f = $$("#launcher button:not([disabled]), #launcher input"); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});
// The sidebar's system button now opens the launcher.
toggleAppMenu = function (show) { const el = $("#launcher"), open = el && !el.hidden; if (show === false || (show === undefined && open)) closeLauncher(); else openLauncher(); };

// ---------- the sidebar for the current system ----------
{
  const baseNav = renderNav, baseBrand = renderAppBrand;
  renderAppBrand = function () {
    if (SYSTEMS[SYS] && !SYSTEMS[SYS].app) {
      $("#brand-app").textContent = tx(sysName(SYS)); $("#brand-sub").textContent = tx(sysDesc(SYS));
      $("#brand-mark").style.background = ""; $("#brand-mark").innerHTML = svgI(SYSTEMS[SYS].icon); $("#brand-mark").classList.add("sys");
      document.body.dataset.app = SYS;
    } else { $("#brand-mark").classList.remove("sys"); baseBrand(); $("#brand-mark").textContent = APPS[APP] ? APPS[APP].mark : "Fk"; }
    $("#appsw").setAttribute("aria-label", `${L("ทุกระบบ", "All systems")}: ${tx(sysName(SYS))}`);
    $("#appsw").setAttribute("aria-haspopup", "dialog");
  };
  // No data-v here: the bell's refresh (updateBell) re-stamps a page's own badge on every link with that page id.
  const link = (href, v, ico, label, badge = "") => `<a href="#${href}" data-href="${href}"><span class="ni">${svgI(ico)}</span><span class="nl">${label}</span>${badge}</a>`;
  const cnt = n => (n ? `<span class="badge">${n}</span>` : "");
  renderNav = function () {
    if (SYSTEMS[SYS] && SYSTEMS[SYS].app) {
      baseNav();
      // In an app the rail already leads to My Workspace and Administration, so the app menu shows only its own pages.
      $$("#nav a[data-v=home], #nav a[data-v=admin]").forEach(a => { const h = a.previousElementSibling; a.remove(); if (h && h.classList.contains("nav-h") && (!h.nextElementSibling || h.nextElementSibling.classList.contains("nav-h"))) h.remove(); });
    } else {
      let h = "";
      if (SYS === "workspace") {
        const okp = id => allowed(id);
        h += `<div class="nav-h">${L("พื้นที่ทำงาน", "Workspace")}</div>` + link("home", "home", "home", L("วันนี้", "Today"), cnt(typeof myTasks === "function" ? myTasks().length : 0));
        if (okp("inbox")) h += link("inbox", "inbox", "checksq", L("รออนุมัติ", "Approvals"), cnt(inboxItems().length));
        if (okp("exceptions")) h += link("exceptions", "exceptions", "alert", L("รายการผิดปกติ", "Exceptions"), cnt(exceptionItems().filter(x => x.sev === "bad").length));
        if (okp("pins")) h += link("pins", "pins", "star", L("ปักหมุดและล่าสุด", "Pinned and recent"));
        if (WS_ROLES.includes(ROLE)) h += link("delegation", "delegation", "users", L("การมอบอำนาจ", "Delegation"));
        const pp = pagePins().slice(0, 6);
        if (pp.length) h += `<div class="nav-h">${L("ปักหมุด", "Pinned")}</div>` + pp.map(p => `<a href="#" data-pinlink="${esc(p.link)}"><span class="ni">${svgI(SYSTEMS[p.sys] ? SYSTEMS[p.sys].icon : "star")}</span><span class="nl">${esc(tx(p.label))}</span></a>`).join("");
        h += `<div class="nav-h">${L("การสาธิต", "Demo")}</div>` + link("demo", "demo", "book", L("คู่มือการสาธิต", "Demo guide")) + `<a href="#" data-presstart><span class="ni">${svgI("play")}</span><span class="nl">${L("โหมดนำเสนอ", "Presenter mode")}</span></a>`;
      } else if (SYS === "admin") {
        h += `<div class="nav-h">${L("ผู้ดูแลระบบ", "Administration")}</div>` + (typeof ADMIN_TABS !== "undefined" ? ADMIN_TABS.filter(t => !t.roles || t.roles.includes(ROLE)) : []).map(t => link("admin-" + t.id, "admin", NAV_ICON["admin-" + t.id] || "settings", tx(t.label), t.id === "integrations" ? cnt(S.integrations.filter(g => g.status === "error").length) : "")).join("");
      } else if (SYSTEMS[SYS] && SYSTEMS[SYS].planned) {
        h += `<div class="nav-h">${L("อยู่ในแผน", "Planned")}</div>` + link("sys-" + SYS, "sys-" + SYS, SYSTEMS[SYS].icon, L("ภาพรวมของระบบ", "What it will cover")) + link("home", "home", "home", L("กลับพื้นที่ทำงาน", "Back to Workspace"));
      }
      $("#nav").innerHTML = h;
      $$("#nav [data-pinlink]").forEach(a => (a.onclick = e => { e.preventDefault(); jump(a.dataset.pinlink); }));
      $$("#nav [data-presstart]").forEach(a => (a.onclick = e => { e.preventDefault(); if (typeof presStart === "function") presStart(); }));
      renderAppBrand();
    }
    markSysNav();
  };
}
function markSysNav() {
  if (!$("#nav") || (SYSTEMS[SYS] && SYSTEMS[SYS].app)) return;
  const want = CUR === "admin" ? "admin-" + ADMIN_TAB : CUR;
  $$("#nav a[data-href]").forEach(a => a.classList.toggle("on", a.dataset.href === want));
}

// ---------- breadcrumbs and the pin button ----------
function renderCrumb() {
  const c = curPage(), s = SYSTEMS[SYS] ? sysName(SYS) : null;
  // The organization is already in the selector beside it, so the crumb starts at the system.
  $("#crumb").innerHTML = `${s ? `<button type="button" class="cr-sys" data-crumbsys="${SYS}">${esc(tx(s))}</button><span class="cr-sep" aria-hidden="true">/</span>` : ""}<b title="${esc(tx(S.org))}">${esc(tx(c.label))}</b>`;
  const b = $("#crumb [data-crumbsys]"); if (b) b.onclick = () => switchSys(b.dataset.crumbsys);
}
function paintPinBtn() {
  let b = $("#pinbtn");
  if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "pinbtn"; b.className = "iconbtn pinbtn"; $("#bell").before(b); b.onclick = togglePagePin; }
  const on = isPinned(curPage().link);
  b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
  b.innerHTML = icon("star", 18); b.title = b.ariaLabel = on ? L("เลิกปักหมุดหน้านี้", "Unpin this page") : L("ปักหมุดหน้านี้", "Pin this page");
}

// ---------- hooks into the shell and the router ----------
{
  const baseShell = renderShell;
  renderShell = function () { baseShell.apply(this, arguments); renderSysRail(); paintPinBtn(); };
  const baseRoute = route;
  route = function () {
    const r = baseRoute.apply(this, arguments);
    closeLauncher(); // a page change (a link, a task, the presenter) always closes the launcher
    const s = sysOfView(CUR), changed = s !== SYS;
    SYS = s;
    if (changed) renderNav(); else markSysNav();
    renderSysRail(); renderCrumb(); paintPinBtn(); noteRecent();
    setTimeout(() => { if (sysOfView(CUR) === SYS) renderCrumb(); }); // pages that set the crumb a tick later (Budget) get it back
    return r;
  };
}

// ---------- the page of a planned system ----------
SYS_IDS.filter(id => SYSTEMS[id].planned).forEach(id => {
  const s = SYSTEMS[id];
  VIEWS["sys-" + id] = () => `<div class="head"><div><div class="eyebrow">${L("ระบบที่อยู่ในแผน", "Planned system")}</div><h1>${esc(tx(s.name))}</h1><p>${esc(tx(s.desc))}</p></div><span class="sp"></span><span class="pill p-mute">${L("ยังไม่ได้สร้างในต้นแบบนี้", "Not built in this prototype")}</span></div>
    <div class="grid2">
      <section class="panel"><header>${chipIco(s.icon)}<h2>${L("สิ่งที่ระบบจะครอบคลุม", "What it will cover")}</h2></header><ul class="tlist">${s.covers.map(c => `<li><span class="prio p-mute"></span><div>${esc(tx(c))}</div><span></span></li>`).join("")}</ul></section>
      <section class="panel"><header>${chipIco("link")}<h2>${L("เชื่อมกับระบบที่มีอยู่", "How it joins the live systems")}</h2></header><ul class="tlist">${s.joins.map(c => `<li><span class="prio p-info"></span><div>${esc(tx(c))}</div><span></span></li>`).join("")}</ul>
        <div class="body sub">${L("ใช้ผู้ใช้ สิทธิ์ บันทึกการใช้งาน และพื้นที่ทำงานเดียวกับทุกระบบ งานที่รอคุณจะเข้าหน้ารออนุมัติ และรายการผิดปกติเข้าศูนย์รายการผิดปกติ", "It uses the same users, roles, audit log and Workspace as every system: its approvals join the Approvals inbox and its exceptions join the Exception centre.")}</div></section>
    </div>`;
  BIND["sys-" + id] = () => {};
});
