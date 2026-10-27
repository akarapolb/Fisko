// Core runtime: i18n, formatting, per-organization state, roles, router, audit, notifications.
// TODAY is the demo date. Round C4 lets the demo move it ("as of month"); REAL_TODAY keeps the starting date.
let TODAY = "2026-10-16";
const REAL_TODAY = TODAY;
// Thai fiscal year (B.E.) of a date: October starts the next year. CUR_FY is the year being spent.
const fyOf = iso => { const [y, m] = String(iso).split("-").map(Number); return y + 543 + (m >= 10 ? 1 : 0); };
const CUR_FY = fyOf(TODAY);
// The year being formulated (requests, review, submission, parliament): the one after the year being spent.
const FORM_FY = CUR_FY + 1;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

// ---------- language ----------
let LANG = store.get("fisko-lang") === "en" ? "en" : "th";
const L = (th, en) => (LANG === "en" ? en : th);
const tx = v => (Array.isArray(v) ? v[LANG === "en" ? 1 : 0] : v == null ? "" : v);
const fmt = (n, d = 0) => Number(n).toLocaleString(LANG === "en" ? "en-US" : "th-TH", { minimumFractionDigits: d, maximumFractionDigits: d });
const mb = n => fmt(n / 1e6, 2);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MON = { th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
function fdate(iso, time) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const t = time && iso.length > 10 ? " " + iso.slice(11, 16) : "";
  return LANG === "en" ? `${d} ${MON.en[m - 1]} ${y}${t}` : `${d} ${MON.th[m - 1]} ${y + 543}${t}`;
}
function daysUntil(iso) { return Math.round((new Date(iso + "T00:00:00") - new Date(TODAY + "T00:00:00")) / 864e5); }
function nowIso() { const d = new Date(); return `${TODAY}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
const fyLabel = fy => L(`ปีงบประมาณ พ.ศ. ${fy}`, `FY${fy}`);

// ---------- organizations and state ----------
const SEEDS = {}; // id -> { name: [th, en], seed: () => state }, registered by data files
const DATA_V = 39; // bump when the seed shape changes so saved demo state is reseeded
let ORG = "sample";
let S = null;
const key = () => "fisko-v1-" + ORG;
function load() {
  if (!SEEDS[ORG]) ORG = "sample";
  const raw = store.get(key());
  if (raw) { try { S = JSON.parse(raw); if (S && S.v === DATA_V) return; } catch (e) {} }
  S = SEEDS[ORG].seed();
}
function save() { store.set(key(), JSON.stringify(S)); }
function resetDemo() { store.del(key()); S = SEEDS[ORG].seed(); save(); resetUi(); renderShell(); route(); toast(L("รีเซ็ตข้อมูลตัวอย่างแล้ว", "Demo data reset")); }
// Per-page selections that point at records; cleared when the organization or its data changes.
function resetUi() {
  CUR_REQ = null; REQ_TAB = "main"; VER_A = VER_B = null; CMP_REQ = null; CHAIN_P = null; CMT_OPEN = null;
  DRILL_U = DRILL_P = null; PLAN_UNIT = ""; ALLOC_FY = CUR_FY; WI.locks = null; STAGED = null;
  OPEN_PROG.clear(); OPEN_UNIT.clear(); IDEA_OPEN = null; PASTE_ROWS = []; PLAN_REQ = null; PLAN_SPLIT = false; CT_FROM = null; PAY_FORM = null; CASE_OPEN = null; CON_OPEN = null; AI_TOOL = "AI-01"; PR_ROW = null; NB_FUND = null; CON_TAB = "phases"; OCDS_JSON = ""; AI_CASE = null; AI_RES = {}; AI_TOR = ""; AI_Q = ""; TOR_OPEN = null; PACK_FOR = null; BL_ROWS = null; REP_MONTH = null; DOSSIER_FOR = null; DOC_OPEN = null; WIP = null; WI_LOCK.clear(); WI_NAME = ""; FC_CUT = null; RUN_OPEN = null; FN_PO = null; VC_OPEN = null; VC_EDIT = null; ADV_OPEN = null; ADV_EDIT = null; RC_NEW = false; BK_MONTH = null; BK_ACCT = "budget"; PER_OPEN = null; FAI_TAB = "agents"; F_RUN_OPEN = null; FWI = null;
}

// ---------- roles ----------
const ROLES = {
  div: ["สำนัก / กอง (ผู้จัดทำคำขอ)", "Division (requester)"],
  plan: ["กองแผนงาน", "Planning Division"],
  exec: ["ผู้บริหาร", "Executive"],
  fin: ["การเงินและบัญชี", "Finance & Accounting"],
  audit: ["ผู้ตรวจสอบ", "Auditor"],
  admin: ["ผู้ดูแลระบบ", "System Administrator"],
  proc: ["เจ้าหน้าที่พัสดุ", "Procurement officer"],
  prochead: ["หัวหน้าเจ้าหน้าที่พัสดุ", "Head of procurement"],
};
let ROLE = ROLES[store.get("fisko-role")] ? store.get("fisko-role") : "plan";
// Signed-in session (round 7). The role switcher still works as a demo shortcut: it moves the session
// to that role's demo user. me() is the signed-in user when their role matches the current role.
let SESSION = null;
try { SESSION = JSON.parse(store.get("fisko-session") || "null"); } catch (e) { SESSION = null; }
const me = () => {
  const su = SESSION && S && S.users.find(u => u.id === SESSION.user);
  if (su && su.role === ROLE) return su;
  return S.users.find(u => u.role === ROLE && u.primary) || S.users.find(u => u.role === ROLE) || S.users[0];
};
const unitOf = id => S.units.find(u => u.id === id) || { name: ["-", "-"] };
const unitName = id => tx(unitOf(id).name);
const userName = id => tx((S.users.find(u => u.id === id) || { name: ["-", "-"] }).name);

// ---------- status pills ----------
const STATUS = {
  draft: [["ร่าง", "Draft"], "p-mute"], returned: [["ส่งกลับแก้ไข", "Returned"], "p-bad"],
  plan: [["รอกองแผนพิจารณา", "Planning review"], "p-info"], committee: [["รอคณะกรรมการ", "Committee"], "p-warn"],
  approved: [["ผู้บริหารเห็นชอบ", "Approved"], "p-ok"], rejected: [["ไม่เห็นชอบ", "Not approved"], "p-bad"],
};
const pill = st => `<span class="pill ${STATUS[st][1]}">${tx(STATUS[st][0])}</span>`;
const tag = (text, cls) => `<span class="pill ${cls}">${text}</span>`;

// ---------- audit and notifications ----------
function audit(action, target) {
  S.audit.unshift({ t: nowIso(), user: me().id, role: ROLE, action, target: target || "" });
  if (S.audit.length > 300) S.audit.length = 300;
}
function notify(roles, text, link) {
  S.notes.unshift({ id: "n" + Date.now() + Math.floor(Math.random() * 1e4), t: nowIso(), to: roles, text, link: link || "", read: [] });
}
const myNotes = () => S.notes.filter(n => n.to.includes(ROLE));
const unread = () => myNotes().filter(n => !n.read.includes(ROLE)).length;
function commit() { save(); updateBell(); }

// ---------- toast ----------
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3400); }

// ---------- router ----------
const VIEWS = {}, BIND = {};
const NAV = []; // { id, code, group, label: [th,en], roles: [...], soon: round number }
const GROUPS = { overview: ["ภาพรวม", "Overview"], form: ["จัดทำงบประมาณ", "Budget formulation"], exec: ["บริหารและติดตาม", "Execution & results"], procurement: ["จัดซื้อจัดจ้าง", "Procurement"], finance: ["การเงิน", "Finance"], intel: ["วิเคราะห์", "Intelligence"], sys: ["ระบบ", "System"] };
let CUR = "home";
const APP_IDS = ["budget", "procurement", "finance"];
let APP = APP_IDS.includes(store.get("fisko-app")) ? store.get("fisko-app") : "budget";
function allowed(id) { const n = NAV.find(x => x.id === id); return !n || n.roles.includes(ROLE); }
function go(v) { if (location.hash === "#" + v) route(); else location.hash = v; }
function route() {
  // window.FISKO_ROUTE lets tests/sweep.js route without touching browser history, which browsers throttle
  let v = (window.FISKO_ROUTE || location.hash || "#home").slice(1);
  if (v.startsWith("admin-")) { ADMIN_TAB = v.slice(6); v = "admin"; }
  if (!VIEWS[v] && !NAV.find(n => n.id === v)) v = "home";
  CUR = v;
  const n = NAV.find(x => x.id === v) || (v === "request" ? NAV.find(x => x.id === "requests") : null);
  appSync(n);
  const extra = { demo: ["คู่มือการสาธิต", "Demo guide"], delegation: ["การมอบอำนาจ", "Delegation of authority"], cashcount: ["ตรวจนับเงินประจำวัน", "Daily cash count"] };
  const tabL = n && n.tabs ? (n.tabs.find(t => t[0] === n.tabGet()) || [])[1] : null;
  $("#crumb").innerHTML = `${esc(tx(S.org))} · ${n ? (tabL ? `${esc(tx(APPS[n.app] ? APPS[n.app].name : n.label))} · <b>${tx(tabL)}</b>` : `<b>${tx(n.label)}</b>`) : `<b>${extra[v] ? tx(extra[v]) : ""}</b>`}`;
  const view = $("#view");
  if (n && !n.roles.includes(ROLE)) {
    view.innerHTML = `<div class="panel"><div class="body"><h2 style="margin:0 0 6px">${L("ไม่มีสิทธิ์เข้าถึง", "No access")}</h2>
      <p class="sub">${L("บทบาท", "The role")} “${tx(ROLES[ROLE])}” ${L("ไม่มีสิทธิ์ใช้หน้านี้ ตามสิทธิ์ที่กำหนดใน M10", "cannot open this page under the permissions set in M10")}</p>
      <button class="btn" type="button" onclick="go('home')">${L("กลับหน้าแรก", "Back to My Workspace")}</button></div></div>`;
  } else if (n && n.soon) {
    view.innerHTML = VIEWS.soon(n);
  } else {
    view.innerHTML = VIEWS[v]();
    (BIND[v] || (() => {}))();
    if (typeof bindLinks === "function") bindLinks(view);
    if (typeof uiDecorate === "function") uiDecorate(view);
  }
  window.scrollTo(0, 0);
}
