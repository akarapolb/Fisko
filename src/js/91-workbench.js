// Workspace across systems (round 62, after the Fabor console's workbench): one approvals inbox for every system,
// an exception centre that lists what is late, failing or behind plan anywhere on the platform, a page of pinned and
// recently viewed pages, and a strip on My Workspace with what each system needs from you today.
// Fisko never decides for anyone: every row opens the record where a person acts.
const APPROVAL_RE = /อนุมัติ|เห็นชอบ|พิจารณา|ตัดสิน|ลงนาม|ตรวจรับ|approve|decide|decision|review|sign|accept|committee/i;
const inboxItems = () => (typeof myTasks === "function" ? myTasks() : []).filter(t => t.link && APPROVAL_RE.test(t.title));
// The page a jump link lands on, so a row can say whether this role may open it.
function linkPage(l) {
  if (!l) return null;
  if (l.startsWith("req:")) return "requests";
  if (l.startsWith("case:")) return "procurement";
  if (l.startsWith("admin-")) return "admin";
  const [a, t] = l.split("-");
  if (t && typeof JUMP_TABS !== "undefined" && JUMP_TABS[a]) return JUMP_TABS[a][0];
  return l;
}
const linkOk = l => { const p = linkPage(l); if (!p) return false; if (p === "admin" && l.startsWith("admin-")) { const t = ADMIN_TABS.find(x => x.id === l.slice(6)); return allowed("admin") && (!t || !t.roles || t.roles.includes(ROLE)); } return allowed(p); };
const sysChip = id => (SYSTEMS[id] ? `<span class="appdot" style="--c:${SYSTEMS[id].app ? APPS[id].color : "var(--muted)"}">${esc(tx(sysName(id)))}</span>` : "");
const sysOfLink = l => { const a = appOfLink(l); return a === "all" ? (l && l.startsWith("admin") ? "admin" : "workspace") : a; };

// ---------- exceptions ----------
// Each item: { sev: "bad" | "warn", sys, what, sub, since (ISO date), link, owner (role key) }
function exceptionItems() {
  const out = [], add = o => out.push(o), tryAdd = fn => { try { fn(); } catch (e) { /* a source missing in this organization's data adds nothing */ } };
  tryAdd(() => (typeof myTasks === "function" ? myTasks() : []).filter(t => t.due && daysUntil(t.due) < 0 && t.link).forEach(t =>
    add({ sev: "bad", sys: sysOfLink(t.link), what: t.title, sub: `${L("งานของคุณเลยกำหนด", "Your task is overdue")}${t.sub ? " · " + t.sub : ""}`, since: t.due, link: t.link, owner: ROLE })));
  tryAdd(() => S.integrations.filter(g => g.status === "error" || g.status === "warn").forEach(g =>
    add({ sev: g.status === "error" ? "bad" : "warn", sys: "admin", what: `${g.sys} · ${g.id}`, sub: `${tx(g.msg)} · ${tx(g.dir)} · ${tx(g.freq)}`, since: g.last ? g.last.slice(0, 10) : TODAY, link: "admin-integrations", owner: "admin" })));
  tryAdd(() => (S.dash.units || []).forEach(u => { const st = unitState(u); if (st[1] !== "p-bad") return;
    add({ sev: "warn", sys: "budget", what: `${L("เบิกจ่ายต่ำกว่าแผน", "Spending behind plan")}: ${unitName(u.unit)}`, sub: `${L("จ่ายแล้ว", "Paid")} ${fmt(u.actual, 1)} ${L("จากแผน", "of planned")} ${fmt(u.plan, 1)} ${L("ลบ.", "M")} (${Math.round(st[2])}%)${u.reason ? " · " + tx(u.reason) : ""}`, since: TODAY, link: "mon-alerts", owner: "exec" }); }));
  tryAdd(() => (S.contracts || []).filter(c => c.status === "active").forEach(c => (c.phases || []).filter(p => p.due < TODAY && !p.delivered).forEach(p =>
    add({ sev: "bad", sys: "procurement", what: `${c.id} · ${tx(p.name)} ${L("ส่งมอบล่าช้า", "delivery late")}`, sub: `${esc(tx(c.vendor))} · ${L("กำหนดส่ง", "due")} ${fdate(p.due)} · ${L("ล่าช้า", "late by")} ${-daysUntil(p.due)} ${L("วัน", "days")}`, since: p.due, link: "prc-contracts", owner: "proc" }))));
  tryAdd(() => { if (typeof dayChecks !== "function") return; dayChecks(TODAY).filter(c => c.ok === false && !c.soft).forEach(c =>
    add({ sev: "warn", sys: "finance", what: c.t, sub: L("การตรวจประจำวันยังไม่ผ่าน", "Today's daily check has not passed"), since: TODAY, link: "fnc-cash", owner: "fin" })); });
  tryAdd(() => ((S.carry && S.carry.prev) || []).filter(c => c.status === "open" && c.paid < c.amount && daysUntil(c.due) <= 180).forEach(c =>
    add({ sev: daysUntil(c.due) <= 60 ? "bad" : "warn", sys: "finance", what: `${c.id} · ${tx(c.name)}`, sub: `${L("กันเงินเหลื่อมปีเหลือ", "Carry-over left")} ${mb(c.amount - c.paid)} ${L("ลบ.", "M")} · ${L("สิ้นสุด", "ends")} ${fdate(c.due)}`, since: c.t ? c.t.slice(0, 10) : TODAY, link: allowed("allocation") ? "alloc-carry" : "fnc-chain", owner: "fin" })));
  return out.sort((a, b) => (a.sev === b.sev ? (a.since < b.since ? -1 : 1) : a.sev === "bad" ? -1 : 1));
}

// ---------- shared row ----------
const wsRow = (dot, title, sub, sys, link, right) => `<li><span class="prio ${dot}"></span><div style="min-width:0">${link && linkOk(link) ? `<a href="#" data-wslink="${esc(link)}">${esc(title)}</a>` : `<b style="font-weight:600">${esc(title)}</b>`}
  <div class="meta">${sysChip(sys)}${sub ? `<span class="sub">${sub}</span>` : ""}</div></div>${right || ""}</li>`;
const bindWsLinks = () => $$("#view [data-wslink]").forEach(a => (a.onclick = e => { e.preventDefault(); jump(a.dataset.wslink.replace("STORY", S.story)); }));
const sysFilter = (items, cur, attr) => { const c = { all: items.length }; items.forEach(x => (c[x.sys] = (c[x.sys] || 0) + 1));
  return `<div class="filterbar">${["all", ...SYS_IDS.filter(id => c[id])].map(id => `<button type="button" class="fchip ${cur === id ? "on" : ""}" data-${attr}="${id}">${id === "all" ? L("ทั้งหมด", "All") : esc(tx(sysName(id)).replace("Fisko ", ""))}<b>${c[id]}</b></button>`).join("")}</div>`; };

// ---------- Approvals inbox ----------
let INBOX_F = "all", INBOX_T = "appr";
VIEWS.inbox = () => {
  const all = (typeof myTasks === "function" ? myTasks() : []).filter(t => t.link).map(t => ({ ...t, sys: sysOfLink(t.link) }));
  const base = INBOX_T === "appr" ? all.filter(t => APPROVAL_RE.test(t.title)) : all;
  const shown = base.filter(t => INBOX_F === "all" || t.sys === INBOX_F).sort((a, b) => ((a.due || "9") < (b.due || "9") ? -1 : 1));
  return `<div class="head"><div><div class="eyebrow">${L("พื้นที่ทำงาน", "Workspace")}</div><h1>${INBOX_T === "appr" ? L("รออนุมัติจากคุณ", "Approvals waiting for you") : L("งานทั้งหมดของฉัน", "All my tasks")}</h1>
    <p>${L("เรื่องที่รอการตัดสินใจของคุณจากทุกระบบ เรียงจากที่ค้างนานที่สุด กดเพื่อเปิดเรื่องและตัดสินใจในหน้านั้น", "What waits for your decision in every system, oldest first. Open one to decide on its own page.")}</p></div></div>
  <section class="panel"><header>${segBar([["appr", `${L("รออนุมัติ", "Approvals")} · ${all.filter(t => APPROVAL_RE.test(t.title)).length}`], ["all", `${L("งานทั้งหมด", "All tasks")} · ${all.length}`]], INBOX_T, "inboxt")}<span class="sp"></span>${sysFilter(base, INBOX_F, "inboxf")}</header>
    <ul class="tlist">${shown.map(t => wsRow(t.cls, t.title, t.sub ? esc(t.sub) : "", t.sys, t.link, t.due ? dueText(t.due) : "<span></span>")).join("") || `<li><span></span><div class="empty" style="grid-column:2 / -1">${L("ไม่มีเรื่องรอคุณในกลุ่มนี้", "Nothing waits for you in this group")}</div></li>`}</ul>
    <div class="body sub">${L("ผู้ช่วย AI เตรียมข้อมูลได้ แต่ไม่อนุมัติ ไม่ลงนาม และไม่จ่ายเงินแทนคุณ", "AI agents prepare the facts; they never approve, sign or pay for you.")}</div></section>`;
};
BIND.inbox = () => {
  bindWsLinks();
  $$("[data-inboxf]").forEach(b => (b.onclick = () => { INBOX_F = b.dataset.inboxf; route(); }));
  $$("[data-inboxt]").forEach(b => (b.onclick = () => { INBOX_T = b.dataset.inboxt; INBOX_F = "all"; route(); }));
};

// ---------- Exception centre ----------
let EXC_F = "all";
VIEWS.exceptions = () => {
  const all = exceptionItems(), shown = all.filter(x => EXC_F === "all" || x.sys === EXC_F), bad = all.filter(x => x.sev === "bad").length;
  const bySys = SYS_IDS.filter(id => all.some(x => x.sys === id));
  return `<div class="head"><div><div class="eyebrow">${L("พื้นที่ทำงาน", "Workspace")}</div><h1>${L("ศูนย์รายการผิดปกติ", "Exception centre")}</h1>
    <p>${L("สิ่งที่ล่าช้า ล้มเหลว หรือต่ำกว่าแผนในทุกระบบ ในที่เดียว แต่ละรายการบอกว่าใครเป็นผู้ดูแลและเปิดไปยังหน้าที่แก้ไขได้", "What is late, failing or behind plan in any system, in one place. Each item names who owns it and opens the page where it is fixed.")}</p></div></div>
  <section class="stats">${statCard({ label: L("ต้องแก้ไขทันที", "Needs action now"), value: bad, icon: "alert", tone: bad ? "bad" : "ok", sub: "" })}${statCard({ label: L("เฝ้าระวัง", "Watch"), value: all.length - bad, icon: "clock", tone: "info", sub: "" })}${statCard({ label: L("ระบบที่มีรายการ", "Systems affected"), value: bySys.length, icon: "grid", tone: "info", sub: bySys.map(id => tx(sysName(id)).replace("Fisko ", "")).join(" · ") })}</section>
  <section class="panel"><header><h2>${L("รายการ", "Items")}</h2><span class="sp"></span>${sysFilter(all, EXC_F, "excf")}</header>
    <ul class="tlist">${shown.map(x => wsRow(x.sev === "bad" ? "p-bad" : "p-warn", x.what, `${x.sub} · ${L("ผู้ดูแล", "Owner")}: ${tx(ROLES[x.owner] || ["–", "–"])}`, x.sys, x.link, `<span class="sub">${x.since === TODAY ? L("วันนี้", "today") : fdate(x.since)}</span>`)).join("") || `<li><span></span><div class="empty" style="grid-column:2 / -1">${L("ไม่มีรายการผิดปกติ", "No exceptions")}</div></li>`}</ul>
    <div class="body sub">${L("รวบรวมจาก: งานที่เลยกำหนด การเชื่อมต่อระบบที่ล้มเหลว หน่วยงานที่เบิกจ่ายต่ำกว่าแผน งวดงานที่ส่งมอบล่าช้า การตรวจการเงินประจำวัน และเงินกันเหลื่อมปีที่ใกล้สิ้นสุด", "Collected from overdue tasks, failed interfaces, units behind their spending plan, late contract phases, the daily finance check and carry-over close to its end date.")}</div></section>`;
};
BIND.exceptions = () => { bindWsLinks(); $$("[data-excf]").forEach(b => (b.onclick = () => { EXC_F = b.dataset.excf; route(); })); };

// ---------- Pinned and recent ----------
VIEWS.pins = () => {
  const pins = pagePins(), rec = recents(), sp = sysPins();
  const row = (p, act) => `<li><span class="prio p-mute"></span><div style="min-width:0"><a href="#" data-wslink="${esc(p.link)}">${esc(tx(p.label))}</a><div class="meta">${sysChip(p.sys)}${p.t ? `<span class="sub">${fdate(p.t, true)}</span>` : ""}</div></div>${act}</li>`;
  return `<div class="head"><div><div class="eyebrow">${L("พื้นที่ทำงาน", "Workspace")}</div><h1>${L("ปักหมุดและล่าสุด", "Pinned and recent")}</h1>
    <p>${L("กดดาวที่แถบด้านบนเพื่อปักหมุดหน้าใดก็ได้ หน้าที่ปักหมุดจะแสดงในเมนูพื้นที่ทำงานด้วย", "Press the star in the top bar to pin any page. Pinned pages also show in the Workspace menu.")}</p></div></div>
  <div class="grid2">
    <section class="panel"><header>${chipIco("star")}<h2>${L("หน้าที่ปักหมุด", "Pinned pages")}</h2><span class="sp"></span><span class="sub">${pins.length}</span></header>
      <ul class="tlist">${pins.map(p => row(p, `<button class="btn ghost" type="button" data-unpin="${esc(p.link)}">${L("เลิกปักหมุด", "Unpin")}</button>`)).join("") || `<li><span></span><div class="empty" style="grid-column:2 / -1">${L("ยังไม่มีหน้าที่ปักหมุด", "No pinned pages yet")}</div></li>`}</ul></section>
    <section class="panel"><header>${chipIco("history")}<h2>${L("ดูล่าสุด", "Recently viewed")}</h2><span class="sp"></span>${rec.length ? `<button class="btn ghost" type="button" id="rec-clear">${L("ล้าง", "Clear")}</button>` : ""}</header>
      <ul class="tlist">${rec.map(p => row(p, "")).join("") || `<li><span></span><div class="empty" style="grid-column:2 / -1">${L("ยังไม่มีหน้าที่เปิดดู", "Nothing viewed yet")}</div></li>`}</ul></section>
  </div>
  <section class="panel"><header>${chipIco("grid")}<h2>${L("ระบบบนแถบด้านซ้าย", "Systems on the left rail")}</h2></header>
    <div class="body row" style="gap:8px;flex-wrap:wrap">${SYS_IDS.filter(sysAllowed).map(id => `<label class="field-inline"><input type="checkbox" data-syspin="${id}" ${sp.includes(id) ? "checked" : ""}> ${esc(tx(sysName(id)))}</label>`).join("")}</div></section>`;
};
BIND.pins = () => {
  bindWsLinks();
  $$("[data-unpin]").forEach(b => (b.onclick = () => { jset("fisko-pins", pagePins().filter(p => p.link !== b.dataset.unpin)); renderNav(); route(); }));
  const c = $("#rec-clear"); if (c) c.onclick = () => { jset("fisko-recent", []); route(); };
  $$("[data-syspin]").forEach(b => (b.onchange = () => { toggleSysPin(b.dataset.syspin); }));
};

// ---------- My Workspace: what each system needs today ----------
function sysDeck() {
  const tasks = typeof myTasks === "function" ? myTasks() : [], exc = exceptionItems(), appr = inboxItems();
  const card = (ico, sys, n, label, sub, act, tone) => `<button type="button" class="sdcard" data-deck="${act}"><span class="sd-sys">${svgI(ico)}${esc(sys)}</span><b class="sd-n ${tone || ""}">${n}</b><span class="sd-l">${label}</span><span class="sub">${sub || "&nbsp;"}</span><span class="sd-go">${L("เปิด", "Open")} ${icon("arrow", 13)}</span></button>`;
  const cards = [];
  if (allowed("inbox")) cards.push(card("checksq", L("พื้นที่ทำงาน", "Workspace"), appr.length, L("เรื่องรออนุมัติจากคุณ", "approvals waiting for you"), appr[0] ? appr[0].title : L("ไม่มีเรื่องค้าง", "nothing waiting"), "go:inbox", appr.length ? "warn" : ""));
  if (allowed("exceptions")) { const b = exc.filter(x => x.sev === "bad"); cards.push(card("alert", L("ทุกระบบ", "Every system"), b.length, L("รายการผิดปกติที่ต้องแก้", "exceptions to fix"), b[0] ? b[0].what : L("ไม่มีรายการเร่งด่วน", "nothing urgent"), "go:exceptions", b.length ? "bad" : "")); }
  APP_IDS.filter(appAllowed).forEach(id => { const t = sysTasks(id, tasks), over = t.filter(x => x.due && daysUntil(x.due) < 0).length;
    cards.push(card(SYSTEMS[id].icon, tx(APPS[id].name), t.length, L("งานของคุณในระบบนี้", "tasks for you here"), over ? `${over} ${L("เลยกำหนด", "overdue")}` : t[0] ? t[0].title : L("ไม่มีงานค้าง", "nothing waiting"), "sys:" + id)); });
  return `<section class="sysdeck" aria-label="${L("วันนี้ในทุกระบบ", "Today across systems")}">${cards.join("")}</section>`;
}
{
  const v = VIEWS.home, b = BIND.home;
  VIEWS.home = () => {
    let h = v();
    if (ROLE === "vendor" || !h.includes('class="hero"')) return h;
    // The app tiles at the bottom give way to the rail and the launcher; the deck goes right under the greeting.
    const t = h.indexOf('<div class="apptiles">');
    if (t > 0) { const s = h.lastIndexOf("<section>", t), e = h.indexOf("</section>", t); if (s >= 0 && e > t) h = h.slice(0, s) + h.slice(e + 10); }
    const i = h.indexOf("</section>");
    return i > 0 ? h.slice(0, i + 10) + sysDeck() + h.slice(i + 10) : h;
  };
  BIND.home = () => { b && b(); $$("[data-deck]").forEach(x => (x.onclick = () => { const [k, id] = x.dataset.deck.split(":"); if (k === "go") go(id); else switchSys(id); })); };
}
