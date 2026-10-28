// Fisko Procurement pages (round 44: information architecture), the same way 66h-fin-pages.js lays out Finance.
// Every page, its menu group, who sees it, the feature switch it needs and its tabs are declared here. Each tab
// lists its sections (PROC entries) top to bottom and a `key`: the page id the earlier rounds used. Opening a tab
// sets PROC_TAB to that key, so the binders added by rounds 11 to T4 (guards such as PROC_TAB === "gantt"),
// CASE_OPEN, jump("case:...") and old `prc-<key>` links keep working. A pair [a, b] puts two sections side by side.
// Moving something to another page means editing this table.
let PROC_PAGE = "today", CON_OPEN = null, PR_ROW = null;
// One form row at a time instead of inputs on every row (round 45), like rowBtn / rowForm in Finance.
const prRowBtn = (key, label) => `<button class="btn ghost" type="button" data-prow="${esc(key)}" aria-expanded="${PR_ROW === key}">${label}</button>`;
const prRowForm = (cols, inner) => `<tr class="fn-rowform"><td colspan="${cols}"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">${inner}<button class="btn ghost" type="button" data-prow="">${L("ปิด", "Close")}</button></div></td></tr>`;
PROC_TAB = "today";
const PROC_ST = {};
const PR_ALL = ["proc", "prochead", "div", "divhead", "plan", "exec", "fin", "finhead", "audit"];
const PR_WORK = ["proc", "prochead", "div", "divhead", "plan", "exec", "audit"];
const PR_OFF = ["proc", "prochead", "audit"];
const PROC_GROUPS = { today: ["จัดซื้อจัดจ้าง", "Procurement"], plan: ["วางแผน", "Planning"], run: ["ดำเนินการจัดซื้อ", "Sourcing"], con: ["สัญญาและผู้ขาย", "Contracts and suppliers"], more: ["วิเคราะห์และรายงาน", "Insight and reports"] };
const PROC_PAGES = [
  { id: "today", code: "P1", group: "today", label: ["งานวันนี้", "Today"], roles: PR_ALL,
    sub: ["งานของคุณ สิ่งที่รออนุมัติ และงวดงานกับหลักประกันที่ครบกำหนดใน 60 วัน · ขั้นตอนทางการยังทำใน e-GP", "Your work, what waits for approval, and phases and guarantees due in 60 days · the official steps stay in e-GP"],
    tabs: [{ id: "main", key: "today", secs: ["todayKpis", "today", "todayDue"] }] },
  { id: "plan", code: "P2", group: "plan", label: ["แผนจัดซื้อ", "Procurement plan"], roles: PR_WORK,
    sub: ["แผนจัดซื้อจัดจ้างประจำปีที่ผูกกับรายการจัดสรร ฉบับที่ประกาศ และความต้องการที่ยังไม่อยู่ในแผน", "The yearly plan tied to allocation lines, its published versions, and needs not yet in the plan"],
    tabs: [{ id: "plan", key: "plan", label: ["แผนและฉบับ", "Plan and versions"], secs: ["planMain"] },
      { id: "demand", key: "plan", label: ["ความต้องการนอกแผน", "Needs not in the plan"], secs: ["demand"] }] },
  { id: "reqn", code: "P3", group: "plan", label: ["ใบขอซื้อขอจ้าง", "Requisitions"], roles: PR_WORK,
    sub: ["ขอซื้อขอจ้างตามแผน อนุมัติภายในวงเงินคงเหลือ และตรวจการแบ่งซื้อ", "Requisitions from the plan, approval within the room left, and the split-purchase check"],
    tabs: [{ id: "main", key: "reqn", secs: ["reqn"] }] },
  { id: "cases", code: "P4", group: "run", label: ["แฟ้มจัดซื้อ", "Case files"], roles: PR_WORK,
    sub: ["แฟ้มจัดซื้อ 12 ขั้นตั้งแต่ขอซื้อถึงปิดงาน และไทม์ไลน์ของทุกแฟ้ม", "The 12-step case file from requisition to close, and a timeline of every case"],
    tabs: [{ id: "cases", key: "cases", label: ["แฟ้ม", "Cases"], secs: ["cases"] },
      { id: "gantt", key: "gantt", label: ["ไทม์ไลน์", "Timeline"], secs: ["gantt"] }] },
  { id: "tor", code: "P5", group: "run", label: ["คลัง TOR", "TOR library"], roles: PR_OFF,
    sub: ["ขอบเขตงานที่หัวหน้าพัสดุอนุมัติ ใช้ซ้ำได้พร้อมฉบับ", "Approved terms of reference to reuse, with versions"],
    tabs: [{ id: "main", key: "tor", secs: ["tor"] }] },
  { id: "docs", code: "P6", group: "run", label: ["เอกสาร", "Documents"], roles: PR_OFF,
    sub: ["แบบฟอร์ม อีเมล และการอ่านเอกสารที่ได้รับ (จำลอง)", "Forms, e-mails and reading documents received (simulated)"],
    tabs: [{ id: "forms", key: "forms", feat: "forms", label: ["แบบฟอร์มและอีเมล", "Forms and e-mail"], secs: ["forms"] },
      { id: "ocr", key: "docs", label: ["รับเอกสาร (OCR)", "Document intake (OCR)"], secs: ["docs"] }] },
  { id: "contracts", code: "P7", group: "con", label: ["สัญญาและงวดงาน", "Contracts and phases"], roles: ["proc", "prochead", "div", "divhead", "plan", "exec", "fin", "finhead", "audit"],
    sub: ["สัญญา งวดส่งมอบ ตรวจรับ ค่าปรับ การแก้ไขสัญญา และหลักประกัน", "Contracts, deliveries, acceptance, penalties, changes and guarantees"],
    tabs: [{ id: "main", key: "contracts", secs: () => (CON_OPEN && famCon(CON_OPEN) ? ["conDetail"] : ["conCreate", "conList", "conInvoices"]) }] },
  { id: "fees", code: "P8", group: "con", label: ["ค่าตอบแทนกรรมการ", "Committee fees"], feat: "commFee", roles: ["proc", "prochead", "exec", "fin", "finhead", "audit"],
    sub: ["ค่าตอบแทนคณะกรรมการตามอัตรา การอนุมัติตามวงเงิน และการส่งให้การเงิน", "Committee fees by rate, approval by amount, and passing them to Finance"],
    tabs: [{ id: "main", key: "fees", secs: ["fees"] }] },
  { id: "suppliers", code: "P9", group: "con", label: ["ผู้ขาย", "Suppliers"], roles: ["proc", "prochead", "fin", "finhead", "audit"],
    sub: ["ทะเบียนผู้ขายและประวัติ รายชื่อผู้ทิ้งงาน และการตรวจนิติบุคคล", "Supplier register and history, the abandoned-work list, and the legal-entity check"],
    top: ["supKpis"],
    tabs: [{ id: "reg", key: "suppliers", label: ["ทะเบียน", "Register"], secs: ["supRegister"] },
      { id: "bl", key: "suppliers", label: ["รายชื่อผู้ทิ้งงาน", "Abandoned-work list"], secs: ["supBlacklist"] },
      { id: "entity", key: "suppliers", feat: "entity", label: ["ตรวจนิติบุคคล", "Legal-entity check"], secs: ["supEntity"] }] },
  { id: "insight", code: "P10", group: "more", label: ["วิเคราะห์", "Analytics"], roles: ["proc", "prochead", "plan", "exec", "fin", "finhead", "audit"],
    sub: ["ตัวชี้วัด สัญญาณเตือน พยากรณ์ และจำลองสถานการณ์", "KPIs, red flags, forecasts and what-ifs"],
    tabs: [{ id: "kpi", key: "analytics", label: ["ตัวชี้วัด", "KPIs"], secs: ["analytics"] },
      { id: "flags", key: "flags", label: ["สัญญาณเตือน", "Red flags"], secs: ["flags"] },
      { id: "forecast", key: "forecast", label: ["พยากรณ์", "Forecast"], secs: ["forecast"] },
      { id: "whatif", key: "whatif", label: ["จำลองสถานการณ์", "What-if"], secs: ["whatif"] }] },
  { id: "reports", code: "P11", group: "more", label: ["รายงาน", "Reports"], roles: ["proc", "prochead", "exec", "audit"],
    sub: ["รายงานสรุปผลการจัดซื้อประจำเดือน และรายงานผลประโยชน์ทับซ้อน", "The monthly procurement summary and the conflict-of-interest report"],
    tabs: [{ id: "month", key: "reports", label: ["รายงานประจำเดือน", "Monthly report"], secs: ["reports"] },
      { id: "coi", key: "coi", feat: "coiRep", label: ["ผลประโยชน์ทับซ้อน", "Conflicts of interest"], secs: ["coi"] }] },
  { id: "egp", code: "P12", group: "more", label: ["e-GP และ OCDS", "e-GP and OCDS"], roles: PR_OFF,
    sub: ["นำเข้าไฟล์สถานะจาก e-GP และส่งออกข้อมูลเปิดตามมาตรฐาน OCDS", "Import status files from e-GP and export open data in OCDS"],
    tabs: [{ id: "egp", key: "egp", label: ["ไฟล์จาก e-GP", "e-GP file"], secs: ["egp"] },
      { id: "ocds", key: "ocds", label: ["ส่งออก OCDS", "OCDS export"], secs: ["ocds"] }] },
  { id: "ai", code: "P13", group: "more", label: ["AI และเอเจนต์", "AI and agents"], roles: ["proc", "prochead", "exec", "audit"],
    sub: ["ผู้ช่วย AI ทีละเครื่องมือ และเอเจนต์ที่หยุดให้คนอนุมัติทุกขั้นที่เขียนข้อมูล (จำลอง)", "The AI assistant one tool at a time, and agents that stop for a person at every write (simulated)"],
    tabs: [{ id: "assist", key: "ai", label: ["ผู้ช่วย AI", "AI assistant"], secs: ["ai"] },
      { id: "agents", key: "agents", label: ["เอเจนต์อัตโนมัติ", "Agents"], secs: ["agents"] }] },
];

// ---------- helpers ----------
const prPage = id => PROC_PAGES.find(p => p.id === id);
const prOn = x => (!x.feat || feat(x.feat)) && (!x.roles || x.roles.includes(ROLE));
const prTabs = p => p.tabs.filter(prOn);
const prSees = p => prOn(p) && prTabs(p).length > 0;
const prSecs = t => (typeof t.secs === "function" ? t.secs() : t.secs);
// The first visible tab carrying an old page key.
function prOwner(key) {
  for (const p of PROC_PAGES) if (prSees(p)) { const t = prTabs(p).find(x => x.key === key); if (t) return { p, t }; }
  return null;
}
// The page and tab on screen. Older code sets PROC_TAB directly (for example "contracts" or "cases"); follow it.
function prCur() {
  let p = prPage(PROC_PAGE);
  if (!p || !prSees(p)) p = PROC_PAGES.find(prSees);
  let T = prTabs(p), t = T.find(x => x.id === PROC_ST[p.id]) || T[0];
  if (t.key !== PROC_TAB) {
    const o = prOwner(PROC_TAB);
    if (o && !(o.p.id === p.id && T.some(x => x.key === PROC_TAB))) { p = o.p; t = o.t; }
    else if (o) t = T.find(x => x.key === PROC_TAB);
  }
  PROC_PAGE = p.id; PROC_ST[p.id] = t.id; PROC_TAB = t.key;
  return { p, t };
}
// "contracts", "insight:flags" or an old key such as "gantt". A deep link names a key first (prc-docs is the OCR tab);
// a menu click (keep) names a page and returns to the tab you were on.
function procSet(v, keep) {
  const [a, b] = String(v).split(":");
  const page = prPage(a), own = !b && !(keep && page) ? prOwner(a) : null;
  if (own) { PROC_PAGE = own.p.id; PROC_ST[own.p.id] = own.t.id; PROC_TAB = own.t.key; return PROC_TAB; }
  if (page) {
    PROC_PAGE = page.id;
    const T = prTabs(page), t = T.find(x => x.id === b) || (keep ? T.find(x => x.id === PROC_ST[page.id]) : null) || T[0];
    if (t) { PROC_ST[page.id] = t.id; PROC_TAB = t.key; }
    return PROC_TAB;
  }
  PROC_PAGE = "today"; PROC_TAB = "today"; return PROC_TAB;
}
const prSec = id => { const f = PROC[id]; return f ? f() : ""; };
function prBlock(x) {
  if (!Array.isArray(x)) return prSec(x);
  const [a, b] = x.map(prSec);
  return a.trim() && b.trim() ? `<div class="grid2">${a}${b}</div>` : a + b;
}
// Badges: the work waiting for this role under the old keys, on the menu (summed per page) and on the tabs.
const prKeyBadge = key => { const m = String(PROC_KEY_BADGE(key)).match(/>(\d+)</); return m ? Number(m[1]) : 0; };
let PROC_KEY_BADGE = () => "";

// ---------- P1 Today ----------
// My work: the role's Procurement tasks, plus (for the officer and the head) the case files whose next step is theirs.
function prMine() {
  const t = myTasks().filter(x => x.cls !== "p-mute" && typeof x.link === "string" && (x.link.startsWith("prc-") || x.link.startsWith("case:")));
  // The officer also follows cases in contract management (step 9) and cases waiting on a date (bids closing, appeal window).
  const who = ROLE === "proc" ? ["proc", "con", "wait"] : ROLE === "prochead" ? ["head"] : [];
  (S.cases || []).filter(c => !c.cancelled && who.includes(caseNext(c).who) && caseState(c) < 10 && !t.some(x => x.link === "case:" + c.id)).forEach(c => {
    const n = caseNext(c), wait = n.who === "wait";
    t.push({ title: `${c.id} ${caseName(c)}`, sub: `${L("ขั้น", "Step")} ${caseState(c)} · ${n.raw ? esc(n.th) : L(n.th, n.en)}`, due: wait && c.egp && c.egp.close > TODAY ? c.egp.close : wait && c.award && c.award.appealEnd ? c.award.appealEnd : TODAY, link: "case:" + c.id, cls: n.who === "proc" || n.who === "head" ? "p-warn" : "p-info" });
  });
  return t.sort((a, b) => (a.due < b.due ? -1 : 1));
}
function prDue(days) {
  const lim = addDays(TODAY, days), out = [];
  (S.contracts || []).filter(conLive).forEach(c => {
    c.phases.filter(ph => !ph.cancelled && !phaseAccepted(ph) && ph.due <= lim).forEach(ph => out.push({ due: ph.due, kind: L("งวดส่งมอบ", "Phase due"), what: `${c.id} ${tx(ph.name)}`, sub: `${tx(c.vendor)} · ${mb(ph.amount)} ${L("ลบ.", "M")}`, link: "prc-contracts", con: c.id }));
    const g = c.guarantee, gx = g && g.expires;
    if (gx && gx <= lim && g.status !== "returned") out.push({ due: gx, kind: L("หลักประกันหมดอายุ", "Guarantee expires"), what: c.id, sub: tx(c.vendor), link: "prc-contracts", con: c.id });
  });
  return out.sort((a, b) => (a.due < b.due ? -1 : 1));
}
PROC.todayKpis = () => {
  const mine = prMine(), live = (S.cases || []).filter(c => !c.cancelled && caseState(c) < 12), due = prDue(60), late = due.filter(d => d.due < TODAY);
  return `<section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi hl"><span class="l">${L("งานของฉัน", "My work")}</span><span class="v">${mine.length}</span><span class="d" style="color:var(--rail-ink)">${mine.filter(x => x.due <= TODAY).length} ${L("ถึงกำหนดหรือเลยแล้ว", "due or overdue")}</span></div>
    <div class="kpi"><span class="l">${L("แฟ้มที่ดำเนินการอยู่", "Cases in progress")}</span><span class="v">${live.length}</span></div>
    <div class="kpi"><span class="l">${L("สัญญาที่ใช้อยู่", "Active contracts")}</span><span class="v">${(S.contracts || []).filter(c => conLive(c) && c.status !== "closed").length}</span></div>
    <div class="kpi"><span class="l">${L("ครบกำหนดใน 60 วัน", "Due in 60 days")}</span><span class="v">${due.length}</span><span class="d sub">${late.length} ${L("เลยกำหนด", "overdue")}</span></div>
  </section>`;
};
PROC.today = () => {
  const t = prMine();
  return `<section class="panel"><header><h2>${ROLE === "prochead" || canSpend() ? L("รอคุณดำเนินการหรืออนุมัติ", "Waiting for you to act or approve") : L("งานของฉัน", "My work")}</h2><span class="sp"></span><span class="sub">${t.length} ${L("รายการ", "items")}</span></header>
    ${t.length ? `<div class="tbl-wrap"><table><tbody>${t.slice(0, 12).map(x => `<tr><td>${dotI(x.cls === "p-bad" ? "bad" : x.cls === "p-warn" ? "warn" : "ok")}<b style="font-weight:600">${esc(x.title)}</b>${x.sub ? `<div class="sub">${x.sub}</div>` : ""}</td><td class="sub" style="white-space:nowrap">${clockTxt(x.due)}</td><td><button class="btn" type="button" data-jump="${x.link}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table></div>
      ${t.length > 12 ? `<div class="body"><button class="btn ghost" type="button" data-jump="home">${L("ดูทั้งหมดในพื้นที่ทำงานของฉัน", "See all in My Workspace")} (${t.length})</button></div>` : ""}`
      : `<div class="body sub">${dotI("ok")}${L("ไม่มีงานค้างในแอปจัดซื้อ", "Nothing waiting for you in Procurement")}</div>`}</section>`;
};
PROC.todayDue = () => {
  const d = prDue(60);
  return `<section class="panel"><header><h2>${L("งวดงานและหลักประกันที่ครบกำหนดใน 60 วัน", "Phases and guarantees due in 60 days")}</h2><span class="sp"></span><span class="sub">${L("เรียงตามวันครบกำหนด", "By due date")}</span></header>
    ${d.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("รายการ", "Item")}</th><th>${L("ประเภท", "Kind")}</th><th>${L("ครบกำหนด", "Due")}</th><th></th></tr></thead><tbody>${d.map(x => `<tr><td><span class="mono">${esc(x.what)}</span><div class="sub">${esc(x.sub)}</div></td><td class="sub">${x.kind}</td><td style="white-space:nowrap">${dotI(clockDot(x.due))}${clockTxt(x.due)}</td><td><button class="btn ghost" type="button" data-conopen="${x.con}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="body sub">${L("ไม่มีงวดหรือหลักประกันที่ครบกำหนด", "Nothing due")}</div>`}</section>`;
};

// ---------- P7 contracts: a list, and one contract at a time ----------
PROC.conList = () => {
  const C = (S.contracts || []).slice().reverse();
  if (!C.length) return `<section class="panel"><div class="body sub">${L("ยังไม่มีสัญญา", "No contracts yet")}</div></section>`;
  return `<section class="panel"><header><h2>${L("สัญญา", "Contracts")}</h2><span class="sp"></span><span class="sub">${C.length} ${L("สัญญา · กดเปิดเพื่อดูงวดงาน ตรวจรับ และการแก้ไข", "contracts · open one for phases, acceptance and changes")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th style="min-width:220px">${L("สัญญา", "Contract")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th style="width:140px">${L("ตรวจรับแล้ว", "Accepted")}</th><th>${L("งวดถัดไป", "Next phase")}</th><th>${L("ต้องดู", "Watch")}</th><th></th></tr></thead>
      <tbody>${C.map(c => {
        const live = c.phases.filter(ph => !ph.cancelled), acc = live.filter(phaseAccepted), accAmt = sumv(acc.map(ph => ph.amount)), nx = live.find(ph => !phaseAccepted(ph));
        const gs = guarSt(c), pen = conPenalty(c), chg = (c.vars || []).filter(v => v.status === "pending").length;
        const flags = [pen ? tag(`${L("ค่าปรับ", "Penalty")} ${fmt(pen)}`, "p-warn") : "", chg ? tag(`${chg} ${L("รออนุมัติแก้ไข", "change pending")}`, "p-info") : "", ["none", "expiring", "expired"].includes(gs) ? tag(tx(GUAR_TAG[gs][0]), GUAR_TAG[gs][1]) : "", c.status === "terminated" ? tag(L("บอกเลิกแล้ว", "Terminated"), "p-bad") : ""].filter(Boolean).join(" ");
        return `<tr><td><span class="mono">${c.id}</span> <span class="sub">${esc(c.no)}</span><div style="font-weight:600">${esc(tx(famPlan(c.plan).name))}</div><div class="sub">${esc(tx(c.vendor))}</div></td><td class="n">${mb(c.amount)}</td>
          <td><div class="bar"><i style="width:${c.amount ? Math.min(100, accAmt / c.amount * 100) : 0}%"></i></div><span class="sub">${acc.length}/${live.length} ${L("งวด", "phases")}</span></td>
          <td>${nx ? `${tx(nx.name)} <div class="sub">${dueText(nx.due)}</div>` : `<span class="sub">${L("ครบทุกงวด", "All accepted")}</span>`}</td><td>${flags || `<span class="sub">—</span>`}</td>
          <td><button class="btn" type="button" data-conopen="${c.id}">${L("เปิด", "Open")}</button></td></tr>`; }).join("")}</tbody></table></div></section>`;
};
// One contract, in tabs (round 45): phases and acceptance · changes · supervision · guarantee and warranty · letters ·
// drawings and BOQ. The parts come from conPanel(c, part) (63), the late-stage panels (CON_PANELS, 63b) and t3Panel (72).
let CON_TAB = "phases";
const CON_TABS = [
  ["phases", ["งวดงานและตรวจรับ", "Phases and acceptance"]], ["vars", ["การแก้ไขสัญญา", "Changes"]], ["supervise", ["ควบคุมงาน", "Supervision"]],
  ["guar", ["หลักประกันและรับประกัน", "Guarantee and warranty"]], ["letters", ["หนังสือ", "Letters"]], ["boq", ["แบบและ BOQ", "Drawings and BOQ"]],
];
// The late-stage panels in the order 63b registers them: supervision, termination, warranty and defects, letters.
const conLate = (c, tab) => CON_PANELS.filter((f, i) => (f.tab || ["supervise", "supervise", "guar", "letters"][i] || "supervise") === tab).map(f => f(c)).join("");
function conTabBody(c, k) {
  if (k === "phases") return conPanel(c, "phases");
  if (k === "vars") return conPanel(c, "vars");
  if (k === "supervise") return conLate(c, "supervise");
  if (k === "guar") return conPanel(c, "guar") + conLate(c, "guar");
  if (k === "letters") return conLate(c, "letters");
  if (k === "boq") return typeof t3Panel === "function" ? t3Panel(c) : "";
  return "";
}
PROC.conDetail = () => {
  const c = famCon(CON_OPEN), bodies = CON_TABS.map(([k, l]) => [k, l, conTabBody(c, k)]).filter(([k, , h]) => k === "phases" || h.replace(/<[^>]+>/g, "").trim());
  if (!bodies.some(x => x[0] === CON_TAB)) CON_TAB = "phases";
  const cur = bodies.find(x => x[0] === CON_TAB), pend = (c.vars || []).filter(v => v.status === "pending").length;
  const bar = `<div class="tabs fn-tabs" role="tablist" aria-label="${esc(c.id)}" style="margin:0 16px">${bodies.map(([k, l]) => `<button class="tab ${k === CON_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${k === CON_TAB}" data-ctab="${k}">${tx(l)}${k === "vars" && pend ? ` <span class="badge">${pend}</span>` : ""}</button>`).join("")}</div>`;
  // drawings and BOQ are a panel of their own (72-t3); the other tabs sit inside the contract panel
  const inPanel = CON_TAB !== "boq";
  return `<div class="row" style="margin:0 0 10px"><button class="btn ghost" type="button" data-conback>← ${L("สัญญาทั้งหมด", "All contracts")}</button></div>
    <section class="panel">${conPanel(c, "head")}${bar}${inPanel ? cur[2] : ""}</section>${inPanel ? "" : cur[2]}${prSec("conInvoices")}`;
};
// Fisko Finance on the contract (round 45): the GFMIS PO next to the supplier, and the voucher on each phase.
function conPoTag(c) {
  if (typeof fcfg !== "function") return "";
  if (c.gfPo) return `<span class="sub">·</span><span class="mono sub">PO ${esc(c.gfPo.no)}</span>`;
  if (c.amount < fcfg().poMin) return "";
  return `<span class="sub">·</span>${tag(L("ยังไม่มี PO ใน GFMIS", "No GFMIS PO yet"), "p-warn")}${allowed("finance") ? ` <button class="btn ghost" type="button" data-jump="fnc-chain">${L("บันทึก PO", "Record the PO")}</button>` : ""}`;
}
function phVoucher(c, ph) {
  const v = (S.vouchers || []).find(x => x.contract === c.id && x.phase === ph.n && x.state !== "cancelled");
  if (!v || typeof vTag !== "function") return "";
  return `<div>${vTag(v)} ${allowed("finance") ? `<button class="btn ghost" type="button" data-vcgo="${v.id}">${v.id}</button>` : `<span class="mono sub">${v.id}</span>`}</div>`;
}

// ---------- the page ----------
VIEWS.procurement = () => {
  const { p, t } = prCur(), T = prTabs(p);
  // An open case file is a page of its own (it has its own heading and back link).
  if (t.key === "cases" && CASE_OPEN && caseOf(CASE_OPEN)) return prSec("cases");
  const body = prSecs(t).map(prBlock).join("");
  const tb = x => { const first = T.find(y => y.key === x.key) === x, n = first ? prKeyBadge(x.key) : 0; return n ? ` <span class="badge">${n}</span>` : ""; };
  return `
  <div class="head"><div><div class="eyebrow">Fisko Procurement · ${p.code} · ${tx(PROC_GROUPS[p.group])}</div><h1>${tx(p.label)}</h1>
    <p>${tx(p.sub)} · ${fyLabel(FAM_FY)}</p></div></div>
  ${(p.top || []).map(prBlock).join("")}
  ${T.length > 1 ? `<div class="tabs fn-tabs" role="tablist" aria-label="${esc(tx(p.label))}">${T.map(x => `<button class="tab ${x.id === t.id ? "on" : ""}" type="button" role="tab" aria-selected="${x.id === t.id}" data-psub="${x.id}">${tx(x.label)}${tb(x)}</button>`).join("")}</div>` : ""}
  ${body.trim() ? body : `<section class="panel"><div class="body sub">${L("ไม่มีรายการสำหรับบทบาทนี้", "Nothing here for this role")}</div></section>`}`;
};
{
  const bind = BIND.procurement;
  BIND.procurement = () => {
    bind();
    $$("[data-psub]").forEach(b => (b.onclick = () => { procSet(`${PROC_PAGE}:${b.dataset.psub}`); route(); }));
    $$("[data-conopen]").forEach(b => (b.onclick = () => { CON_OPEN = b.dataset.conopen; CON_TAB = "phases"; procSet("contracts:main"); route(); }));
    $$("[data-conback]").forEach(b => (b.onclick = () => { CON_OPEN = null; route(); }));
    $$("[data-ctab]").forEach(b => (b.onclick = () => { CON_TAB = b.dataset.ctab; route(); }));
    $$("[data-prow]").forEach(b => (b.onclick = () => { PR_ROW = b.dataset.prow && PR_ROW !== b.dataset.prow ? b.dataset.prow : null; route(); const f = PR_ROW && $(".fn-rowform input"); if (f) f.focus(); }));
    $$("[data-vcgo]").forEach(b => (b.onclick = () => { VC_OPEN = b.dataset.vcgo; jump("fnc-pay"); }));
    $$("#view [data-jump]").forEach(b => { if (!b.onclick) b.onclick = () => jump(b.dataset.jump); });
  };
}

// ---------- menu ----------
Object.assign(NAV_ICON, { today: "home", insight: "chart", suppliers: "users", fees: "coins", reports: "cal", egp: "download", ai: "sparkle", docs: "scan", cases: "folder", contracts: "pen" });
{
  const n = NAV.find(x => x.id === "procurement");
  // [id, label, code, group, roles]: the menu shows a heading per group and only the pages a role may see.
  Object.defineProperty(n, "tabs", { get: () => PROC_PAGES.filter(p => (!p.feat || feat(p.feat)) && prTabs(p).length).map(p => [p.id, p.label, p.code, PROC_GROUPS[p.group], p.roles]), configurable: true });
  n.tabGet = () => PROC_PAGE;
  n.tabSet = v => procSet(v, true);
  JUMP_TABS.prc = ["procurement", v => procSet(v)];
  // Deep links (prc-flags) are routed by procSet; the old "case:" link still opens the case file.
  const tb = tabBadge;
  PROC_KEY_BADGE = key => tb("procurement", key);
  tabBadge = function (nid, tab) {
    if (nid !== "procurement") return tb(nid, tab);
    const p = prPage(tab);
    if (!p) return tb(nid, tab);
    const k = p.id === "today" ? prMine().filter(x => x.due <= TODAY).length : sumv([...new Set(prTabs(p).map(x => x.key))].map(prKeyBadge));
    return k ? `<span class="badge">${k}</span>` : "";
  };
}
