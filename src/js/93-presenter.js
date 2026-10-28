// Presenter mode (round 62, after the Fabor console's presenter route). The demo guide's steps play one at a time
// from a bar at the bottom of the screen: each step sets its own role and opens its page, and the bar shows what to
// say. Five routes: the original storyline, Budget, Procurement and Finance end to end, and a seven-step executive
// cut across the systems. PageDown / PageUp (or Alt+→ / Alt+←) move between steps, as a presentation clicker does.
DEMO.push(
  { t: "W-01", part: "ws", role: "exec", link: "inbox", title: ["พื้นที่ทำงาน: รออนุมัติจากทุกระบบ", "Workspace: approvals from every system"],
    say: ["ผู้บริหารเห็นทุกเรื่องที่รอการตัดสินใจจากงบประมาณ จัดซื้อ และการเงินในกล่องเดียว เรียงจากที่ค้างนานที่สุด", "The executive sees every decision waiting for them from Budget, Procurement and Finance in one inbox, oldest first."],
    do: ["ชี้ตัวกรองตามระบบ → เปิดเรื่องแรก ระบบพาไปหน้าของเรื่องนั้นในแอปที่ถูกต้อง", "Point at the system filter → open the first item; it lands on its own page in the right app"] },
  { t: "W-02", part: "ws", role: "exec", link: "exceptions", title: ["ศูนย์รายการผิดปกติ", "The exception centre"],
    say: ["สิ่งที่ล่าช้า ล้มเหลว หรือต่ำกว่าแผนในทุกระบบอยู่ในหน้าเดียว พร้อมผู้ดูแลแต่ละเรื่อง", "What is late, failing or behind plan in every system is on one page, each with its owner."],
    do: ["ชี้งวดงานที่ส่งมอบล่าช้าและการเชื่อมต่อ e-GP ที่ล้มเหลว → กรองเฉพาะ Finance", "Point at the late contract phase and the failed e-GP interface → filter to Finance"] },
);
const PRES_ROUTES = [
  ["exec", ["ฉบับผู้บริหาร 7 ขั้น", "Executive cut · 7 steps"]],
  ["story", ["เรื่องเล่าหลัก", "Storyline"]],
  ["e2e", ["งบประมาณครบวงจร", "Budget end to end"]],
  ["pe2e", ["จัดซื้อจัดจ้างครบวงจร", "Procurement end to end"]],
  ["fin", ["การเงินครบวงจร", "Finance end to end"]],
];
// The executive cut: one platform, the inbox and the exception centre, then one strong moment from each app.
function presSteps(rt) {
  const idx = DEMO.map((s, i) => i);
  if (rt === "story") return idx.filter(i => !DEMO[i].part);
  if (rt === "exec") {
    const pick = [i => !DEMO[i].part && DEMO[i].link === "home", i => DEMO[i].t === "W-01", i => DEMO[i].t === "W-02", i => !DEMO[i].part && DEMO[i].link === "mon-forecast",
      i => DEMO[i].part === "pe2e", i => DEMO[i].part === "fin", i => !DEMO[i].part && DEMO[i].link === "intel-anoms"];
    return pick.map(f => idx.find(f)).filter(i => i != null);
  }
  return idx.filter(i => DEMO[i].part === rt);
}
let PRES = (() => { try { return JSON.parse(sessionStorage.getItem("fisko-pres") || "null"); } catch (e) { return null; } })(); // { rt, i, open }
const presSave = () => { try { sessionStorage.setItem("fisko-pres", JSON.stringify(PRES)); } catch (e) {} };
function presStart(rt) { PRES = { rt: rt || "exec", i: 0, open: true }; presSave(); presGo(0); }
function presStop() { PRES = null; presSave(); renderPresBar(); toast(L("ออกจากโหมดนำเสนอ", "Presenter mode off")); }
function presGo(i) {
  const steps = presSteps(PRES.rt);
  if (!steps.length) return;
  PRES.i = Math.max(0, Math.min(steps.length - 1, i)); presSave();
  const s = DEMO[steps[PRES.i]];
  ROLE = s.role; store.set("fisko-role", ROLE);
  if (SESSION) { SESSION.user = me().id; store.set("fisko-session", JSON.stringify(SESSION)); }
  renderShell();
  jump(s.link.replace("STORY", S.story));
  renderPresBar();
}
function renderPresBar() {
  let el = $("#presbar");
  if (!PRES) { if (el) el.remove(); document.body.classList.remove("presenting"); return; }
  if (!el) { el = document.createElement("div"); el.id = "presbar"; el.className = "presbar"; el.setAttribute("role", "region"); document.body.appendChild(el); }
  document.body.classList.add("presenting");
  el.setAttribute("aria-label", L("โหมดนำเสนอ", "Presenter mode"));
  const steps = presSteps(PRES.rt), s = DEMO[steps[PRES.i]], sys = sysOfView(linkPage(s.link) || "home");
  el.innerHTML = `<div class="pb-top"><span class="pb-tag">${svgI("play")}${L("นำเสนอ", "Presenting")}</span>
      <select id="pb-rt" aria-label="${L("เส้นทาง", "Route")}">${PRES_ROUTES.map(([k, l]) => `<option value="${k}" ${k === PRES.rt ? "selected" : ""}>${tx(l)}</option>`).join("")}</select>
      <span class="pb-n">${PRES.i + 1} / ${steps.length}</span>
      <div class="pb-dots" aria-hidden="true">${steps.map((x, j) => `<i class="${j === PRES.i ? "on" : j < PRES.i ? "done" : ""}"></i>`).join("")}</div>
      <span class="sp"></span>
      <button type="button" class="btn ghost" id="pb-say" aria-expanded="${PRES.open}">${PRES.open ? L("ซ่อนบท", "Hide notes") : L("แสดงบท", "Show notes")}</button>
      <button type="button" class="btn" id="pb-prev" ${PRES.i ? "" : "disabled"} aria-label="${L("ขั้นก่อนหน้า", "Previous step")}">${svgI("chevL")}</button>
      <button type="button" class="btn primary" id="pb-next" ${PRES.i < steps.length - 1 ? "" : "disabled"}>${L("ถัดไป", "Next")} ${svgI("chevR")}</button>
      <button type="button" class="btn ghost" id="pb-x" aria-label="${L("ออกจากโหมดนำเสนอ", "Exit presenter mode")}">${svgI("x")}</button></div>
    <div class="pb-step"><span class="mono sub">${esc(s.t)}</span>${sysChip(sys)}<b>${esc(tx(s.title))}</b><span class="sub">· ${tx(ROLES[s.role])}</span></div>
    ${PRES.open ? `<div class="pb-say"><p>${esc(tx(s.say))}</p>${s.do ? `<p class="sub"><b>${L("ทำ", "Do")}:</b> ${esc(tx(s.do))}</p>` : ""}</div>` : ""}`;
  $("#pb-prev").onclick = () => presGo(PRES.i - 1);
  $("#pb-next").onclick = () => presGo(PRES.i + 1);
  $("#pb-x").onclick = presStop;
  $("#pb-say").onclick = () => { PRES.open = !PRES.open; presSave(); renderPresBar(); };
  $("#pb-rt").onchange = e => { PRES = { rt: e.target.value, i: 0, open: PRES.open }; presGo(0); };
}
document.addEventListener("keydown", e => {
  if (!PRES || e.target.closest("input, textarea, select, [contenteditable]")) return;
  if (e.key === "PageDown" || (e.altKey && e.key === "ArrowRight")) { e.preventDefault(); presGo(PRES.i + 1); }
  if (e.key === "PageUp" || (e.altKey && e.key === "ArrowLeft")) { e.preventDefault(); presGo(PRES.i - 1); }
});
// The bar follows language changes and survives a reload; the demo guide gets a button to start it.
{
  const bs = renderShell; renderShell = function () { bs.apply(this, arguments); if (PRES && SESSION) renderPresBar(); };
  const v = VIEWS.demo, b = BIND.demo;
  VIEWS.demo = () => v().replace('<ol class="demo">', `<section class="panel"><header>${chipIco("play")}<h2>${L("โหมดนำเสนอ", "Presenter mode")}</h2><span class="sp"></span>${PRES_ROUTES.map(([k, l]) => `<button class="btn ${k === "exec" ? "primary" : ""}" type="button" data-presrt="${k}">${tx(l)} · ${presSteps(k).length}</button>`).join("")}</header>
    <div class="body sub">${L("เล่นทีละขั้นจากแถบด้านล่าง แต่ละขั้นสลับบทบาทและเปิดหน้าให้เอง ใช้ PageDown / PageUp หรือรีโมตนำเสนอเพื่อเลื่อนขั้น", "Plays one step at a time from a bar at the bottom; each step switches the role and opens its page. Use PageDown / PageUp or a presentation clicker.")}</div></section><ol class="demo">`);
  BIND.demo = () => { b && b(); $$("[data-presrt]").forEach(x => (x.onclick = () => presStart(x.dataset.presrt))); };
}
