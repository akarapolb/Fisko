// My Workspace, design system v2 (round 24): hero, stat cards across the three apps, tasks with filters,
// the budget calendar as a date strip, notifications and app tiles. Replaces VIEWS.home from 30-home.js;
// the task and notification links keep the same data attributes, so the old binder logic is reused.
let HOME_F = "all";
const MONTH_S = { th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const dayBox = iso => { const [, m, d] = iso.split("-").map(Number); return `<div class="d"><b>${d}</b><span>${MONTH_S[LANG === "en" ? "en" : "th"][m - 1]}</span></div>`; };
function homeStats() {
  const out = [], tasks = myTasks(), can = id => typeof allowed === "function" ? allowed(id) : true;
  const over = tasks.filter(t => t.due && daysUntil(t.due) < 0).length;
  out.push(statCard({ label: L("งานของฉัน", "My tasks"), value: tasks.length, icon: "checksq", tone: over ? "bad" : "info", trend: over ? { dir: "down", text: `${over} ${L("เลยกำหนด", "overdue")}` } : { dir: "flat", text: L("ไม่มีงานเลยกำหนด", "nothing overdue") } }));
  if (S.allocs && S.allocs[FAM_FY]) {
    const lines = famLines(), tot = sumv(lines.map(l => l.amount)), com = sumv(lines.map(l => famCommitted(l.id) + famReserved(l.id)));
    out.push(statCard({ label: L("งบปี", "FY") + ` ${FAM_FY} ` + L("ผูกพันและจองแล้ว", "committed or reserved"), value: mb(com), unit: L("ลบ.", "M"), ring: tot ? com / tot : 0, link: can("allocation") ? "allocation" : null, sub: `${L("จาก", "of")} ${mb(tot)} ${L("ลบ.", "M")}` }));
  }
  if (S.cases) {
    const open = S.cases.filter(c => !c.cancelled && caseState(c) < 12), byStep = Array.from({ length: 12 }, (_, i) => S.cases.filter(c => !c.cancelled && caseState(c) === i + 1).length);
    out.push(statCard({ label: L("แฟ้มจัดซื้อที่เปิดอยู่", "Open procurement cases"), value: open.length, icon: "folder", tone: "ok", spark: byStep, link: can("procurement") ? "prc-cases" : null, sub: "" }));
  }
  if (S.payreqs && typeof monthly === "function") {
    const m = monthly().rows, paid = sumv(S.payreqs.filter(p => p.status === "approved").map(p => p.amount));
    out.push(statCard({ label: L("เบิกจ่ายแล้ว ปีนี้", "Paid this year"), value: mb(paid), unit: L("ลบ.", "M"), color: "var(--info)", spark: m.map(r => r.payAct + r.payFc), link: can("finance") ? "fnc-pay" : null, sub: "" }));
  }
  return out.join("");
}
VIEWS.home = () => {
  const u = me(), tasks = myTasks(), story = S.requests.find(r => r.id === S.story), next = S.calendar.filter(c => c.date >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1));
  const appOf = t => appOfLink(t.link), counts = { all: tasks.length }; tasks.forEach(t => (counts[appOf(t)] = (counts[appOf(t)] || 0) + 1));
  const shown = tasks.filter(t => HOME_F === "all" || appOf(t) === HOME_F), over = tasks.filter(t => t.due && daysUntil(t.due) < 0).length;
  const appName = a => (APPS[a] ? tx(APPS[a].name) : L("ทั่วไป", "General")), appColor = a => (APPS[a] ? APPS[a].color : "var(--muted)");
  const hour = new Date().getHours(), greet = hour < 12 ? L("สวัสดีตอนเช้า", "Good morning") : hour < 17 ? L("สวัสดีตอนบ่าย", "Good afternoon") : L("สวัสดีตอนเย็น", "Good evening");
  return `
  <section class="hero">
    <div style="position:relative;z-index:1"><h1>${greet}, ${esc(tx(u.name).split(" ")[0])}</h1><p>${tx(ROLES[ROLE])} · ${unitName(u.unit)} · ${fdate(TODAY)}</p>
      <div class="hero-meta"><span>${esc(tx(S.org))}</span><span>${L("ปีงบประมาณ", "Fiscal year")} ${FAM_FY}</span>${next[0] ? `<span>${L("กำหนดถัดไป", "Next deadline")}: ${esc(tx(next[0].name))}</span>` : ""}</div></div>
    <div class="hero-stats"><div class="hstat"><b>${tasks.length}</b><span>${L("งานที่ต้องทำ", "tasks to do")}</span></div><div class="hstat"><b>${over}</b><span>${L("เลยกำหนด", "overdue")}</span></div><div class="hstat"><b>${next.length ? daysUntil(next[0].date) : "–"}</b><span>${L("วันถึงกำหนดถัดไป", "days to next deadline")}</span></div></div>
  </section>
  <section class="stats">${homeStats()}</section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("งานของฉัน", "My tasks")}</h2><span class="sp"></span>
      <div class="filterbar">${["all", "budget", "procurement", "finance", "all2"].filter(a => a !== "all2" && (a === "all" || counts[a])).map(a => `<button type="button" class="fchip ${HOME_F === a ? "on" : ""}" data-hf="${a}">${a === "all" ? L("ทั้งหมด", "All") : appName(a).replace("Fisko ", "")}<b>${counts[a] || 0}</b></button>`).join("")}</div></header>
      <ul class="tlist">${shown.map(k => { const a = appOf(k); return `<li><span class="prio ${k.cls}"></span><div style="min-width:0"><a href="#" data-link="${k.link}">${esc(k.title)}</a><div class="meta"><span class="appdot" style="--c:${appColor(a)}">${a === "all" ? L("ทั่วไป", "General") : appName(a)}</span>${k.sub ? `<span class="sub">${esc(k.sub)}</span>` : ""}</div></div>${dueText(k.due)}</li>`; }).join("") || `<li><span></span><div class="empty" style="grid-column:2 / -1">${L("ไม่มีงานค้างในกลุ่มนี้", "Nothing waiting in this group")}</div></li>`}</ul></section>
    <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
      <section class="panel"><header><h2>${L("ปฏิทินงบประมาณ ปี 2571", "FY2571 budget calendar")}</h2><span class="sp"></span><span class="pill p-warn">${L("ตัวอย่าง", "Sample")}</span></header>
        <ul class="cal">${next.slice(0, 5).map(c => `<li class="${c.role === ROLE ? "mine" : ""}">${dayBox(c.date)}<div style="min-width:0"><b style="font-weight:600;font-size:13.5px">${tx(c.name)}</b><div class="sub">${tx(ROLES[c.role])} · ${dueText(c.date)}</div></div></li>`).join("")}</ul></section>
      <section class="panel"><header><h2>${L("การแจ้งเตือนล่าสุด", "Latest notifications")}</h2><span class="sp"></span><button class="btn ghost" type="button" onclick="event.stopPropagation();toggleNotes(true)">${L("ดูทั้งหมด", "See all")}</button></header>
        <ul class="tlist">${myNotes().slice(0, 4).map(n => `<li><span class="prio ${n.read.includes(ROLE) ? "" : "p-ok"}"></span><div style="min-width:0"><a href="#" data-note="${n.id}" style="font-weight:${n.read.includes(ROLE) ? 500 : 650}">${esc(tx(n.text))}</a></div><span class="sub">${fdate(n.t)}</span></li>`).join("") || `<li><span></span><div class="empty" style="grid-column:2 / -1">${L("ไม่มีการแจ้งเตือน", "No notifications")}</div></li>`}</ul></section>
    </div>
  </div>
  <section><div class="sub" style="margin:0 0 8px;font-weight:600">${L("แอปในตระกูล Fisko", "Fisko apps")}</div><div class="apptiles">${APP_IDS.map(a => { const A = APPS[a], ok = appAllowed(a); return `<button type="button" class="apptile" data-app="${a}" style="--c:${A.color}" ${ok ? "" : "disabled"}><span class="am">${A.mark}</span><div style="min-width:0"><b>${tx(A.name)}</b><span class="sub">${tx(A.desc)}</span></div><span class="cnt">${counts[a] || 0}</span></button>`; }).join("")}</div></section>
  ${story ? `<section class="panel"><header>${chipIco("target", "info")}<h2>${L("โครงการตัวอย่างตลอดวงจร", "Storyline project")}</h2><span class="sp"></span>${pill(story.status)}</header>
    <div class="body" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center"><div><b style="font-size:16px">${tx(story.name)}</b><div class="sub"><span class="mono">${story.id}</span> · ${unitName(story.unit)} · ${L("วงเงินที่ขอ", "Requested")} <b class="num">${mb(story.amount)}</b> ${L("ลบ.", "M")} · ${tx(story.kpi)}</div></div>
      <button class="btn primary" type="button" onclick="openReq('${story.id}')">${L("เปิดคำขอ", "Open request")} ${icon("arrow", 14)}</button></div></section>` : ""}`;
};
{
  const base = BIND.home;
  BIND.home = () => {
    base();
    $$("[data-hf]").forEach(b => (b.onclick = () => { HOME_F = b.dataset.hf; route(); }));
    $$("[data-app]").forEach(b => (b.onclick = () => { if (typeof switchApp === "function") switchApp(b.dataset.app); }));
  };
}
