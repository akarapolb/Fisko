// App shell: navigation by role, top bar controls, notification centre, upcoming-module pages.
const ALL = ["div", "plan", "exec", "fin", "audit", "admin"];
NAV.push(
  { id: "home", code: "", group: "overview", roles: ALL, label: ["พื้นที่ทำงานของฉัน", "My Workspace"] },
  { id: "strategy", code: "M01", group: "form", roles: ["plan", "exec", "div", "audit"], label: ["แผนยุทธศาสตร์", "Strategic Planning"],
    plan: [["แผนผังยุทธศาสตร์ตั้งแต่ยุทธศาสตร์ชาติถึงตัวชี้วัด", "Strategy tree from national strategy to KPIs"], ["แก้ไขโครงสร้างแผนงาน ผลผลิต โครงการ กิจกรรม", "Plan structure editor"], ["ค่าเป้าหมายตัวชี้วัด 5 ปี", "5-year KPI targets"], ["รายงานความสอดคล้องแผนกับคำขอ", "Plan-to-request alignment report"]] },
  { id: "requests", code: "M02", group: "form", roles: ["div", "plan", "exec", "fin", "audit"], label: ["คำของบประมาณ", "Budget Requests"] },
  { id: "consolidation", code: "M03", group: "form", roles: ["plan", "exec", "audit"], label: ["รวบรวมคำขอระดับกรม", "Consolidation"] },
  { id: "review", code: "M04", group: "form", roles: ["plan", "exec", "audit"], label: ["กลั่นกรองและอนุมัติ", "Review & Approval"] },
  { id: "submission", code: "M05", group: "form", roles: ["plan", "exec", "audit"], label: ["ส่งสำนักงบประมาณ", "Submission"],
    plan: [["ตรวจรหัสและโครงสร้างข้อมูลก่อนส่ง", "Pre-submission code and structure checks"], ["ตัวอย่างแบบฟอร์มคำขอ", "Request form preview"], ["ส่งออก Excel / PDF", "Excel / PDF export"], ["ติดตามสถานะและบันทึกผลพิจารณา", "Status tracking and Budget Bureau results"]] },
  { id: "allocation", code: "M06", group: "exec", roles: ["fin", "plan", "exec", "audit"], label: ["จัดสรรงบประมาณ", "Budget Allocation"],
    plan: [["บันทึกวงเงินตามพระราชบัญญัติงบประมาณ", "Record the appropriation"], ["จัดสรรรายหน่วยงานและโครงการ", "Allocate by unit and project"], ["แผนการใช้จ่ายรายเดือน", "Monthly spending plan"], ["โอนเปลี่ยนแปลงผ่าน Workflow", "Budget transfers through the workflow"]] },
  { id: "dashboard", code: "M07", group: "exec", roles: ["exec", "plan", "fin", "audit", "div"], label: ["ติดตามการใช้จ่าย", "Execution Monitoring"] },
  { id: "performance", code: "M08", group: "exec", roles: ["plan", "exec", "div", "audit"], label: ["ผลสัมฤทธิ์", "Performance"],
    plan: [["บันทึกผลตัวชี้วัด", "Enter KPI results"], ["ห่วงโซ่ผลลัพธ์รายโครงการ", "Results chain per project"], ["Scorecard งบประมาณกับผลลัพธ์", "Budget vs outcome scorecard"], ["รายงานประเมินผล", "Evaluation report"]] },
  { id: "assistant", code: "M09", group: "intel", roles: ["exec", "plan", "fin", "div", "audit"], label: ["ผู้ช่วย AI งบประมาณ", "AI Budget Assistant"] },
  { id: "admin", code: "M10", group: "sys", roles: ["admin", "audit", "fin"], label: ["ผู้ดูแลระบบ", "System Administration"] },
);

function navBadge(id) {
  if (id === "requests") {
    const n = ROLE === "div" ? S.requests.filter(r => r.unit === me().unit && (r.status === "draft" || r.status === "returned")).length
      : ROLE === "plan" ? S.requests.filter(r => r.status === "plan").length : 0;
    return n ? `<span class="badge">${n}</span>` : "";
  }
  if (id === "review" && (ROLE === "plan" || ROLE === "exec")) return `<span class="badge">${S.review.length}</span>`;
  if (id === "admin" && ROLE === "admin") { const n = S.integrations.filter(i => i.status === "error").length; return n ? `<span class="badge">${n}</span>` : ""; }
  return "";
}

function renderShell() {
  document.documentElement.lang = LANG;
  $("#brand-sub").textContent = L("แพลตฟอร์มงบประมาณ (AEBMS)", "Budget platform (AEBMS)");
  let html = "";
  Object.keys(GROUPS).forEach(g => {
    const items = NAV.filter(n => n.group === g && n.roles.includes(ROLE));
    if (!items.length) return;
    html += `<div class="nav-h">${tx(GROUPS[g])}</div>`;
    items.forEach(n => {
      html += `<a href="#${n.id}" data-v="${n.id}"><span class="code">${n.code}</span>${tx(n.label)}${n.soon ? `<span class="soon">${L("รอบ", "R")} ${n.soon}</span>` : navBadge(n.id)}</a>`;
    });
  });
  $("#nav").innerHTML = html;
  $("#rail-foot").innerHTML = `${L("ต้นแบบเพื่อการหารือ ข้อมูลทั้งหมดเป็นตัวอย่าง", "Discussion prototype. All data is sample data.")}<br>
    <div class="row" style="gap:6px"><button class="btn" type="button" id="demo-guide">${L("คู่มือการสาธิต", "Demo guide")}</button><button class="btn" type="button" id="reset">${L("รีเซ็ตข้อมูล", "Reset data")}</button></div>`;
  $("#demo-guide").onclick = () => go("demo");
  $("#reset").onclick = resetDemo;
  $("#sample-tag").textContent = L("ข้อมูลตัวอย่าง", "Sample data");
  const orgs = Object.keys(SEEDS);
  const org = $("#org");
  org.innerHTML = orgs.map(o => `<option value="${o}" ${o === ORG ? "selected" : ""}>${esc(tx(SEEDS[o].name))}</option>`).join("");
  org.hidden = orgs.length < 2;
  $("#role").innerHTML = Object.keys(ROLES).map(r => `<option value="${r}" ${r === ROLE ? "selected" : ""}>${tx(ROLES[r])}</option>`).join("");
  $$("#top .seg button").forEach(b => b.classList.toggle("on", b.dataset.lang === LANG));
  $("#bell-label").textContent = L("แจ้งเตือน", "Alerts");
  $("#theme").textContent = L("ธีม", "Theme");
  $("#gsearch").placeholder = L("ค้นหา (Ctrl+K)", "Search (Ctrl+K)");
  renderUserChip();
  updateBell();
  $("#npanel").hidden = true;
  $("#umenu").hidden = true;
}

function updateBell() {
  const n = unread(), c = $("#bell-cnt");
  c.textContent = n; c.hidden = !n;
  $$("#nav a").forEach(a => {
    const n = NAV.find(x => x.id === a.dataset.v);
    if (!n || n.soon) return;
    const old = a.querySelector(".badge"); if (old) old.remove();
    const h = navBadge(n.id); if (h) a.insertAdjacentHTML("beforeend", h);
  });
}

function renderNotes() {
  const list = myNotes();
  $("#npanel").innerHTML = `<header><b>${L("การแจ้งเตือน", "Notifications")}</b>
      <button class="btn ghost" type="button" id="n-all" style="padding:4px 8px;font-size:12.5px">${L("อ่านทั้งหมด", "Mark all read")}</button></header>
    ${list.length ? list.map(n => `<div class="nitem ${n.read.includes(ROLE) ? "" : "unread"}" data-id="${n.id}" tabindex="0"><i></i><div>${esc(tx(n.text))}<small>${fdate(n.t, true)}</small></div></div>`).join("")
      : `<div class="nitem"><i></i><div class="sub">${L("ไม่มีการแจ้งเตือน", "No notifications")}</div></div>`}`;
  $("#n-all").onclick = () => { myNotes().forEach(n => { if (!n.read.includes(ROLE)) n.read.push(ROLE); }); commit(); renderNotes(); };
  $$("#npanel .nitem[data-id]").forEach(el => {
    const open = () => {
      const n = S.notes.find(x => x.id === el.dataset.id);
      if (!n.read.includes(ROLE)) n.read.push(ROLE);
      commit(); toggleNotes(false);
      if (n.link) jump(n.link);
    };
    el.onclick = open;
    el.onkeydown = e => { if (e.key === "Enter") open(); };
  });
}
function toggleNotes(show) {
  const p = $("#npanel"), b = $("#bell");
  const s = show === undefined ? p.hidden : show;
  if (s) renderNotes();
  p.hidden = !s; b.setAttribute("aria-expanded", String(s));
}

VIEWS.soon = n => `
  <div class="head"><div><div class="eyebrow">${n.code} · ${L("อยู่ในแผนพัฒนารอบที่", "Planned for round")} ${n.soon}</div><h1>${tx(n.label)}</h1>
    <p>${L("โมดูลนี้จะสร้างในรอบถัดไป หน้าจอที่วางแผนไว้:", "This module is built in a later round. Planned screens:")}</p></div></div>
  <section class="panel"><div class="body soon-page">
    <ul class="soon-list">${(n.plan || []).map(p => `<li>${tx(p)}</li>`).join("")}</ul>
    <div class="sub">${L("ดูการออกแบบโมดูลนี้ได้ในเอกสาร Solution Design บทที่ 4", "See chapter 4 of the Solution Design document for this module's design.")}</div>
  </div></section>`;

function bindShell() {
  $("#org").onchange = e => { ORG = e.target.value; store.set("fisko-org", ORG); load(); resetUi(); renderShell(); go("home"); toast(tx(SEEDS[ORG].name)); };
  $$("#top .seg button").forEach(b => b.onclick = () => { LANG = b.dataset.lang; store.set("fisko-lang", LANG); renderShell(); route(); });
  $("#role").onchange = e => {
    ROLE = e.target.value; store.set("fisko-role", ROLE);
    if (SESSION) { SESSION.user = me().id; store.set("fisko-session", JSON.stringify(SESSION)); }
    renderShell(); route(); toast(`${L("สลับเป็นบทบาท", "Switched to")} ${tx(ROLES[ROLE])} · ${tx(me().name)}`);
  };
  $("#userchip").onclick = e => { e.stopPropagation(); toggleNotes(false); toggleUserMenu(); };
  document.addEventListener("click", e => { if (!$("#umenu").hidden && !e.target.closest("#umenu")) toggleUserMenu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#umenu").hidden) { toggleUserMenu(false); $("#userchip").focus(); } });
  bindSearch();
  bindHistory();
  $("#bell").onclick = e => { e.stopPropagation(); toggleNotes(); };
  document.addEventListener("click", e => { if (!$("#npanel").hidden && !e.target.closest("#npanel")) toggleNotes(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#npanel").hidden) { toggleNotes(false); $("#bell").focus(); } });
  $("#theme").onclick = () => {
    const r = document.documentElement, cur = r.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    r.dataset.theme = cur === "dark" ? "light" : "dark";
  };
  window.addEventListener("hashchange", route);
}
