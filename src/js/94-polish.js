// Polish for the multi-system shell (round 63). The system rail took 60 px from every page, so the top bar and the
// pages get room back: the organization and role selectors fold into one context chip with a small panel (the Fabor
// console's tenant switcher), the sidebar footer is one row, and page eyebrows drop the app name the sidebar and the
// breadcrumb already show.
function renderCtx() {
  const org = $("#org"), role = $("#role");
  let b = $("#ctx"), p = $("#ctxpop");
  if (!b) {
    b = document.createElement("button"); b.type = "button"; b.id = "ctx"; b.className = "ctxbtn";
    b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "ctxpop");
    org.before(b);
    p = document.createElement("div"); p.id = "ctxpop"; p.className = "npanel ctxpop"; p.hidden = true; $("#npanel").before(p);
    p.innerHTML = `<label class="ctx-f" id="ctx-orgf"><span id="ctx-orgl"></span></label><label class="ctx-f"><span id="ctx-rolel"></span></label><p class="sub" id="ctx-note"></p>`;
    $("#ctx-orgf").appendChild(org); $("#ctx-rolel").after(role);
    b.onclick = e => { e.stopPropagation(); toggleNotes(false); toggleUserMenu(false); toggleCtx(); };
    document.addEventListener("click", e => { if (!p.hidden && !e.target.closest("#ctxpop")) toggleCtx(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !p.hidden) { toggleCtx(false); b.focus(); } });
    org.addEventListener("change", () => toggleCtx(false)); role.addEventListener("change", () => toggleCtx(false));
  }
  $("#ctx-orgf").hidden = org.hidden;
  $("#ctx-orgl").textContent = L("หน่วยงาน", "Organization"); $("#ctx-rolel").textContent = L("บทบาท (ทางลัดสำหรับการสาธิต)", "Role (a demo shortcut)");
  $("#ctx-note").textContent = L("การสลับบทบาทจะเข้าสู่ระบบเป็นผู้ใช้ตัวอย่างของบทบาทนั้น", "Switching role signs in as that role's sample user");
  b.innerHTML = `<span class="ctx-o">${esc(tx(S.org))}</span><span class="ctx-r">${esc(tx(ROLES[ROLE]))}</span><span class="brand-caret" aria-hidden="true">▾</span>`;
  b.setAttribute("aria-label", `${L("หน่วยงานและบทบาท", "Organization and role")}: ${tx(S.org)} · ${tx(ROLES[ROLE])}`);
  b.title = `${tx(S.org)} · ${tx(ROLES[ROLE])}`;
  p.hidden = true; b.setAttribute("aria-expanded", "false");
}
function toggleCtx(show) {
  const p = $("#ctxpop"), b = $("#ctx"), s = show === undefined ? p.hidden : show;
  p.hidden = !s; b.setAttribute("aria-expanded", String(s));
  if (!s) return;
  const r = b.getBoundingClientRect();
  p.style.top = r.bottom + 8 + "px"; p.style.left = Math.max(12, Math.min(r.left, innerWidth - p.offsetWidth - 12)) + "px"; p.style.right = "auto";
  const f = p.querySelector("select:not([hidden])"); if (f) f.focus();
}
{
  const base = renderShell;
  renderShell = function () {
    base.apply(this, arguments);
    renderCtx();
    // One row at the foot of the sidebar: the demo guide also sits in Workspace.
    $("#rail-foot").innerHTML = `<div class="rf-row"><span>${L("ข้อมูลตัวอย่าง", "Sample data")}</span><span class="sp"></span><button class="btn" type="button" id="demo-guide">${L("คู่มือ", "Guide")}</button><button class="btn" type="button" id="reset">${L("รีเซ็ต", "Reset")}</button></div>`;
    $("#rail-foot").title = L("ต้นแบบเพื่อการหารือ ข้อมูลทั้งหมดเป็นตัวอย่าง", "Discussion prototype. All data is sample data.");
    $("#demo-guide").onclick = () => go("demo"); $("#reset").onclick = resetDemo;
  };
  const baseRoute = route;
  route = function () {
    const r = baseRoute.apply(this, arguments);
    // "Fisko Finance · F1 · Finance" → "F1 · Finance": the app is already named in the sidebar and the breadcrumb.
    $$("#view .head .eyebrow").forEach(e => { e.innerHTML = e.innerHTML.replace(/^\s*Fisko (Budget|Procurement|Finance) · /, ""); });
    return r;
  };
}
// Two-column pages stack when the page itself is under 900 px wide (the rail and the sidebar take 308 px of the window).
if (typeof ResizeObserver === "function") new ResizeObserver(es => es.forEach(e => e.target.classList.toggle("narrow", e.contentRect.width < 900))).observe($("#view"));
