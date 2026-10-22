// Fisko Finance pages (round 43: information architecture). Every Finance page, its menu group, who sees it and its
// tabs are declared here; each tab lists the sections (FS, registered by rounds 11 and FN1 to FN6) it shows, top to
// bottom. A pair [a, b] puts two sections side by side. "top" sections show above the tabs, and "drawer" names the
// section that opens as a side panel when a row is opened. Moving something to another page means editing this table.
const FIN_ROLES = ["fin", "finhead", "exec", "plan", "audit"];
const FIN_GROUPS = { today: ["การเงิน", "Finance"], spend: ["จ่ายเงิน", "Spending"], receive: ["รับเงิน", "Receiving"], books: ["บัญชีและปิดงวด", "Books and close"], more: ["วิเคราะห์และตั้งค่า", "Insight and setup"] };
const FIN_PAGES = [
  { id: "home", code: "F1", group: "today", label: ["งานวันนี้", "Today"],
    sub: ["งานของคุณ นาฬิกาตามระเบียบ และภาพรวมวงเงินผูกพัน · GFMIS เป็นระบบบันทึกบัญชีและจ่ายเงินทางการ", "Your work, the regulation clocks and commitments at a glance · GFMIS stays the official books and payment channel"],
    tabs: [{ id: "main", secs: ["homeKpis", ["inbox", "kpiOff"], "clocks", "byKind"] }] },
  { id: "chain", code: "F2", group: "spend", label: ["วงเงินผูกพัน", "Commitments"],
    sub: ["วงเงินผูกพันทุกแหล่ง ใบสั่งซื้อใน GFMIS และการกันเงินเหลื่อมปี", "Every commitment, GFMIS purchase orders and carry-over"],
    tabs: [
      { id: "po", label: ["ทุกรายการและ PO", "All and POs"], secs: ["po"] },
      { id: "other", label: ["ผูกพันนอกการจัดซื้อ", "Outside procurement"], secs: ["commitOther"] },
      { id: "carry", label: ["กันเงินเหลื่อมปี", "Carry-over"], secs: ["carry"] },
      { id: "flow", label: ["สายงบถึงการจ่าย", "Allocation to payment"], secs: ["chainKpis", "chain", "chainOverdue"] }] },
  { id: "pay", code: "F3", group: "spend", label: ["ใบขอเบิกและการจ่าย", "Vouchers and payment"], drawer: "vcDetail",
    sub: ["ใบขอเบิกทุกประเภท การส่ง GFMIS การจ่าย และภาษีหัก ณ ที่จ่าย", "Vouchers of every type, sending to GFMIS, payment and withholding tax"],
    tabs: [
      { id: "vouchers", label: ["ใบขอเบิก", "Vouchers"], secs: ["vcAccepted", "vouchers"] },
      { id: "gfmis", label: ["ส่ง GFMIS และจ่าย", "GFMIS and payment"], secs: [["gfSend", "agencyPay"]] },
      { id: "check", label: ["ตรวจการจ่ายประจำวัน", "Daily payment check"], secs: ["dayCheck"], roles: ["finhead", "audit"] },
      { id: "tax", label: ["ภาษีและค่าปรับ", "Tax and penalties"], secs: ["wht"] }] },
  { id: "adv", code: "F4", group: "spend", label: ["เงินยืม", "Advances"], drawer: "advDetail",
    sub: ["ทะเบียนคุมเงินยืม อนุมัติ จ่าย ตรวจใบสำคัญ และเรียกชดใช้", "Advance register: approve, pay, check clearings and demand repayment"],
    top: ["advKpis"], tabs: [{ id: "main", secs: ["advRegister", "advAge"] }] },
  { id: "recv", code: "F5", group: "receive", label: ["รับเงินและนำส่ง", "Receipts and remittance"],
    sub: ["ใบเสร็จรับเงิน การบันทึกรับเงิน และการนำส่งตามกำหนดเวลา", "Receipts, recording them and remitting on time"],
    top: ["rcKpis"], tabs: [
      { id: "receipts", label: ["ใบเสร็จรับเงิน", "Receipts"], secs: ["receipts"] },
      { id: "remit", label: ["นำส่งเงิน", "Remittance"], secs: ["remit"] }] },
  { id: "cash", code: "F6", group: "receive", label: ["เงินคงเหลือประจำวัน", "Daily cash"],
    sub: ["รายงานเงินคงเหลือประจำวันและการตรวจนับของกรรมการ", "The daily cash report and the committee's count"],
    tabs: [{ id: "main", secs: ["cashToday", "cashHist"] }] },
  { id: "recon", code: "F7", group: "books", label: ["กระทบยอด", "Reconciliation"],
    sub: ["งบพิสูจน์ยอดเงินฝาก รายงานจาก GFMIS และไฟล์ผลการจ่าย", "Bank reconciliation, GFMIS reports and payment result files"],
    tabs: [
      { id: "bank", label: ["ธนาคาร", "Bank"], secs: ["bkPicker", "bank"] },
      { id: "gfmis", label: ["รายงาน GFMIS", "GFMIS reports"], secs: ["bkMonth", ["gfRemit", "tb"]] },
      { id: "payfile", label: ["ไฟล์ผลการจ่าย", "Payment files"], secs: ["payfile"] }] },
  { id: "close", code: "F8", group: "books", label: ["ปิดงวด", "Close"],
    sub: ["ปิดวัน ปิดเดือน ปิดปี ข้อทักท้วง และยอดเบิกจ่ายที่ส่งให้ Fisko Budget", "Daily, monthly and yearly close, audit queries, and spending sent to Fisko Budget"],
    tabs: [
      { id: "day", label: ["ปิดวัน", "Day"], secs: ["dayClose"] },
      { id: "month", label: ["ปิดเดือน", "Month"], secs: ["monthClose"] },
      { id: "year", label: ["สิ้นปี", "Year end"], secs: ["yearEnd"] },
      { id: "audit", label: ["ข้อทักท้วง", "Audit queries"], secs: ["auditQ"] },
      { id: "budget", label: ["ส่งให้ Fisko Budget", "To Fisko Budget"], secs: ["budgetFeed"] }] },
  { id: "ai", code: "F9", group: "more", label: ["AI และ Analytics", "AI and analytics"], get: () => FAI_TAB, set: v => (FAI_TAB = v),
    sub: ["Agent การเงิน พยากรณ์ จำลองสถานการณ์ ตัวชี้วัด และสัญญาณเตือน", "Finance agents, forecasts, what-ifs, KPIs and warning signals"],
    tabs: [
      { id: "agents", label: ["Agent การเงิน", "Finance agents"], secs: ["aiAgents"] },
      { id: "fc", label: ["พยากรณ์", "Forecasts"], secs: ["aiFc"] },
      { id: "wi", label: ["จำลองสถานการณ์", "What-if"], secs: ["aiWi"] },
      { id: "kpi", label: ["ตัวชี้วัดและสัญญาณ", "KPIs and signals"], secs: ["aiKpi"] }] },
  { id: "reg", code: "F10", group: "more", label: ["ทะเบียนและตั้งค่า", "Registers and setup"], roles: ["fin", "finhead", "exec", "audit"],
    sub: ["ผู้มีสิทธิใช้ GFMIS บัญชีธนาคารผู้ขาย กรรมการเก็บรักษาเงิน และเล่มใบเสร็จ · กฎและนาฬิกาอยู่ใน M10", "GFMIS users, supplier bank accounts, the cash committee and receipt books · rules and clocks live in M10"],
    tabs: [
      { id: "gfusers", label: ["ผู้ใช้ GFMIS", "GFMIS users"], secs: ["gfUsers"] },
      { id: "vendors", label: ["บัญชีธนาคารผู้ขาย", "Supplier bank accounts"], secs: ["vendors"] },
      { id: "committee", label: ["กรรมการเก็บรักษาเงิน", "Cash committee"], secs: ["cashCmte"] },
      { id: "books", label: ["เล่มใบเสร็จ", "Receipt books"], secs: ["rbooks"] }] },
];
FS.aiAgents = () => FAI.agents(); FS.aiFc = () => FAI.fc(); FS.aiWi = () => FAI.wi(); FS.aiKpi = () => FAI.kpi();

// ---------- helpers ----------
const FIN_ST = {};
const finPage = id => FIN_PAGES.find(p => p.id === id);
const finSees = x => !x.roles || x.roles.includes(ROLE);
const finTabs = p => p.tabs.filter(finSees);
function finSub(p) {
  const T = finTabs(p), cur = p.get ? p.get() : FIN_ST[p.id];
  return T.some(t => t.id === cur) ? cur : T[0].id;
}
// "pay" or "pay:gfmis". A deep link without a tab opens the page's first tab; the menu keeps the tab you were on.
function finSet(v, keep) {
  const [id, t] = String(v).split(":"), p = finPage(id);
  if (!p) return (FIN_TAB = "home");
  FIN_TAB = id;
  if (typeof crClose === "function") crClose(); // a shared-list drawer never stays open on another page or tab
  const sub = t || (keep ? null : finTabs(p)[0].id);
  if (sub) p.set ? p.set(sub) : (FIN_ST[id] = sub);
  return FIN_TAB;
}
// A segmented control for filters and pickers; the buttons carry data-<attr>.
const segBar = (items, cur, attr) => `<div class="seg" role="group">${items.map(([k, l]) => `<button type="button" class="${k === cur ? "on" : ""}" aria-pressed="${k === cur}" data-${attr}="${esc(k)}">${l}</button>`).join("")}</div>`;
const finSec = id => { const f = FS[id]; return f ? f() : ""; };
function finBlock(x) {
  if (!Array.isArray(x)) return finSec(x);
  const [a, b] = x.map(finSec);
  return a.trim() && b.trim() ? `<div class="grid2">${a}${b}</div>` : a + b;
}

// ---------- My work on F1: the tasks of this role that live in the Finance app ----------
FS.inbox = () => {
  const t = myTasks().filter(x => x.cls !== "p-mute" && !x.clk && typeof x.link === "string" && x.link.startsWith("fnc-")).sort((a, b) => (a.due < b.due ? -1 : 1));
  return `<section class="panel"><header><h2>${ROLE === "finhead" || canSpend() ? L("รอคุณตรวจหรืออนุมัติ", "Waiting for you to check or approve") : L("งานของฉัน", "My work")}</h2><span class="sp"></span><span class="sub">${t.length} ${L("รายการ", "items")}</span></header>
    ${t.length ? `<div class="tbl-wrap"><table><tbody>${t.slice(0, 8).map(x => `<tr><td>${dotI(x.cls === "p-bad" ? "bad" : x.cls === "p-warn" ? "warn" : "ok")}<b style="font-weight:600">${esc(x.title)}</b>${x.sub ? `<div class="sub">${x.sub}</div>` : ""}</td><td class="sub" style="white-space:nowrap">${clockTxt(x.due)}</td><td><button class="btn" type="button" data-jump="${x.link}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table></div>
      ${t.length > 8 ? `<div class="body"><button class="btn ghost" type="button" data-jump="home">${L("ดูทั้งหมดในพื้นที่ทำงานของฉัน", "See all in My Workspace")} (${t.length})</button></div>` : ""}`
      : `<div class="body sub">${dotI("ok")}${L("ไม่มีงานค้างในแอปการเงิน", "Nothing waiting for you in Finance")}</div>`}</section>`;
};

// ---------- the page ----------
VIEWS.finance = () => {
  const p = finPage(FIN_TAB) && finSees(finPage(FIN_TAB)) ? finPage(FIN_TAB) : FIN_PAGES[0];
  FIN_TAB = p.id;
  const T = finTabs(p), cur = finSub(p), tab = T.find(t => t.id === cur);
  const body = tab.secs.map(finBlock).join("");
  const dr = p.drawer ? finSec(p.drawer) : "";
  return `
  <div class="head"><div><div class="eyebrow">Fisko Finance · ${p.code} · ${tx(FIN_GROUPS[p.group])}</div><h1>${tx(p.label)}</h1>
    <p>${tx(p.sub)} · ${fyLabel(FAM_FY)}</p></div>${p.id === "reg" ? `<div class="row"><button class="btn ghost" type="button" data-jump="admin-fcfg">${L("กฎการเงิน (M10)", "Finance rules (M10)")}</button></div>` : ""}</div>
  ${(p.top || []).map(finBlock).join("")}
  ${T.length > 1 ? `<div class="tabs fn-tabs" role="tablist" aria-label="${esc(tx(p.label))}">${T.map(t => `<button class="tab ${t.id === cur ? "on" : ""}" type="button" role="tab" aria-selected="${t.id === cur}" data-fsub="${t.id}">${tx(t.label)}${finTabBadge(p.id, t.id)}</button>`).join("")}</div>` : ""}
  ${body.trim() ? body : `<section class="panel"><div class="body sub">${L("ไม่มีรายการสำหรับบทบาทนี้", "Nothing here for this role")}</div></section>`}
  ${dr.trim() ? `<div class="fn-scrim" data-fdclose></div><aside class="fn-drawer" role="dialog" aria-modal="true" aria-labelledby="fn-dr-title">${dr}</aside>` : ""}`;
};
BIND.finance = () => {
  FIN_BINDS.forEach(f => f());
  $$("[data-fsub]").forEach(b => (b.onclick = () => { const p = finPage(FIN_TAB); p.set ? p.set(b.dataset.fsub) : (FIN_ST[p.id] = b.dataset.fsub); if (typeof crClose === "function") crClose(); route(); }));
  $$("[data-jump]").forEach(b => (b.onclick = () => jump(b.dataset.jump)));
  $$("[data-frow]").forEach(b => (b.onclick = () => { FIN_ROW = b.dataset.frow && FIN_ROW !== b.dataset.frow ? b.dataset.frow : null; route(); const f = FIN_ROW && $(".fn-rowform input"); if (f) f.focus(); }));
  // The scrim and Escape close the side panel through its own close button (any button whose id ends in -close),
  // so each page keeps its close logic. Drawers of the shared list (.cr-drawer) close themselves.
  $$("[data-fdclose]").forEach(b => (b.onclick = finShut));
  const dr = $(".fn-drawer:not(.cr-drawer)");
  if (dr) { const h = dr.querySelector("h2"); if (h) { h.id = "fn-dr-title"; h.tabIndex = -1; h.focus({ preventScroll: true }); } }
};
const finShut = () => { const c = $('.fn-drawer:not(.cr-drawer) [id$="-close"]'); if (c) c.click(); };
document.addEventListener("keydown", e => {
  // A form row under a table row (rowForm): Enter runs its first action, Escape closes it and returns to its button.
  const row = e.target.closest && e.target.closest(".fn-rowform"), fr = row && row.querySelector("[data-frow]") ? row : null; // Finance rows only (Procurement has its own)
  if (fr && e.key === "Escape") { e.stopPropagation(); const k = FIN_ROW; FIN_ROW = null; route(); const b = k && $(`[data-frow="${CSS.escape(k)}"]`); if (b) b.focus(); return; }
  if (fr && e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); const go = fr.querySelector("button:not([data-frow])"); if (go) go.click(); return; }
  if (e.key === "Enter" && e.target.tagName === "TR" && e.target.dataset.vcopen) { e.target.click(); return; } // voucher rows open like shared-list rows
  if (e.key === "Escape" && FIN_ASK) { FIN_ASK = null; route(); return; } // a reason box closes before its drawer
  if (e.key === "Escape" && CUR === "finance" && $(".fn-drawer:not(.cr-drawer)")) finShut();
});

// Counts on the tabs inside a page: work waiting for this role.
function finTabBadge(pid, tid) {
  const V = S.vouchers || [];
  let n = 0;
  if (pid === "chain" && tid === "po" && ROLE === "fin") n = finCommits().filter(needsPo).length;
  if (pid === "chain" && tid === "carry" && ROLE === "fin") n = carryCands().filter(x => !carrySent(x.id)).length;
  if (pid === "pay" && tid === "vouchers") n = ROLE === "fin" ? famAcceptedUnpaid().length + V.filter(v => v.state === "returned").length : ROLE === "finhead" ? V.filter(v => v.state === "check").length : canSpend() ? V.filter(v => v.state === "approve").length : 0;
  if (pid === "pay" && tid === "gfmis" && ROLE === "fin") n = V.filter(v => v.state === "ready" && !v.gfFile).length;
  if (pid === "pay" && tid === "check" && ROLE === "finhead") n = V.filter(v => v.state === "paid" && !v.dayCheck).length;
  if (pid === "recv" && tid === "remit" && isFinRole()) n = rcOpen().filter(r => daysUntil(rcDue(r)) <= 1).length;
  if (pid === "close" && tid === "audit" && ROLE === "finhead") n = (S.auditQs || []).filter(q => !q.answer).length;
  if (pid === "reg" && tid === "vendors" && isFinRole()) n = (S.vendorChanges || []).filter(x => x.status === "pending" && x.by !== me().id).length;
  return n ? ` <span class="badge">${n}</span>` : "";
}

// ---------- menu ----------
NAV_ICON.home = NAV_ICON.home || "home"; NAV_ICON.reg = "list";
{
  const n = NAV.find(x => x.id === "finance");
  n.roles = [...new Set([...n.roles, ...FIN_ROLES])];
  // [id, label, code, group, roles]: the menu shows a heading per group and only the pages a role may see.
  n.tabs = FIN_PAGES.map(p => [p.id, p.label, p.code, FIN_GROUPS[p.group], p.roles]);
  n.tabSet = v => finSet(v, true);
  JUMP_TABS.fnc = ["finance", v => finSet(v)];
  FIN_TAB = "home";
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "reg") { const k = isFinRole() ? (S.vendorChanges || []).filter(x => x.status === "pending" && x.by !== me().id).length : 0; return k ? `<span class="badge">${k}</span>` : ""; }
    return tb(nid, tab);
  };
}
