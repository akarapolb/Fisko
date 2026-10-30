// Project registry (round 64). One project id joins every step of the budget cycle across Budget, Procurement and
// Finance: request, appropriation, allotment, procurement, commitment, acceptance, disbursement and carry-over. The
// registry is read from the live records (the allocation line is the shared key), so it never keeps a second copy.
// Around it: the two-way exchange with the agency's project management system (the PM system owns physical progress;
// Fisko owns budget, commitment and payment), governed data sharing with an append-only send log, and a map of the
// ToR modules and job duties to the pages that support them.
// Fisko is one product for every agency: anything that belongs to one agency (its PM system's name, scope and
// messages, who receives its data, its ToR map) is tenant data in PRJ_CFG[ORG], set by that tenant's data file.
// This file holds only neutral defaults.
Object.assign(ICONS, {
  hub: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="6" r="2"/><circle cx="19.5" cy="6" r="2"/><circle cx="4.5" cy="18" r="2"/><circle cx="19.5" cy="18" r="2"/><path d="m6.2 7.1 3.4 3M17.8 7.1l-3.4 3M6.2 16.9l3.4-3M17.8 16.9l-3.4-3"/>',
});
const PRJ_CFG = {};
const PRJ_DEF = {
  prefix: "PRJ",
  pmName: ["ระบบบริหารโครงการ (PM)", "the project management system (PM)"],
  pmShort: ["ระบบ PM", "PM system"],
  pmRef: ["ระบบ PM", "the PM system"], // the name inside a sentence
  hubName: ["คลังข้อมูลกลาง", "Central data warehouse"],
  aiName: ["AI งบประมาณ", "Budget AI"],
  userUnits: null, // null → the units in the organization chart
  pmScope: null, // allocation lines exchanged with the PM system; null → every investment line
  multi: [], // lines that are multi-year commitments
  loc: {}, // line → { area: [th, en], target: [n, [th, en]] }
  consumers: [], // who receives shared data: { id, kind: "int" | "ext", name, data, mode, status, last, ask }
  pmNote: null, // the tenant's own exchange scope rule: [short label, full rule], each [th, en]
  feed: {}, // the tenant's wording of the scripted PM messages, by dimension: [th, en] with {phase}
  modules: null, // the ToR module map; only organizations with a ToR sheet have one
  duties: null,
  log: [], // the send log the tenant starts with
};
const prjCfg = () => Object.assign({}, PRJ_DEF, PRJ_CFG[ORG] || {});
const pmN = () => tx(prjCfg().pmRef);

// The eight steps of the budget cycle. mods = ToR module numbers; x = where data enters or leaves (in: ←, out: →, both: ↔).
const PRJ_CYCLE = [
  { n: 1, name: ["ตั้งคำของบ", "Budget request"], own: "plan", mods: [2, 3], x: ["in", ["หน่วยงานเสนอคำขอ", "Units submit requests"]], link: "requests" },
  { n: 2, name: ["จัดสรร / พ.ร.บ.", "Appropriation Act"], own: "plan", mods: [3, 4], x: ["in", ["นำเข้าจากระบบงบประมาณของสำนักงบประมาณ", "Imported from the Budget Bureau system"]], link: "allocation" },
  { n: 3, name: ["โอนจัดสรร / งวดเงิน", "Allotment and transfers"], own: "both", mods: [4], x: ["out", ["ส่งข้อมูลตั้งต้นให้ {pm}", "Baseline sent to {pm}"]], link: "alloc-allocate" },
  { n: 4, name: ["จัดซื้อจัดจ้าง", "Procurement"], own: "fin", mods: [5], x: ["in", ["สถานะจาก e-GP", "Status from e-GP"]], link: "prc-cases" },
  { n: 5, name: ["ก่อหนี้ผูกพัน", "Commitment"], own: "fin", mods: [5, 6], x: ["in", ["สัญญาและการแก้ไขจาก {pm}", "Contracts and changes from {pm}"]], link: "prc-contracts" },
  { n: 6, name: ["ตรวจรับงาน", "Acceptance"], own: "fin", mods: [6, 10], x: ["in", ["ความก้าวหน้าและผลตรวจรับจาก {pm}", "Progress and acceptance from {pm}"]], link: "prc-contracts" },
  { n: 7, name: ["เบิกจ่าย", "Disbursement"], own: "fin", mods: [6, 7], x: ["both", ["สอบทานยอดกับ GFMIS", "Reconciled with GFMIS"]], link: "fnc-pay" },
  { n: 8, name: ["เงินกัน / เงินพับ", "Carry-over and lapse"], own: "fin", mods: [6], x: ["out", ["ส่งข้อมูลให้ {ai}", "Sent to {ai}"]], link: "alloc-carry" },
];
// Step owners come from the tenant's organization chart: the units of its primary planning and finance users.
const prjOwnUnit = role => { const u = S.users.find(x => x.role === role && x.primary) || S.users.find(x => x.role === role); return u ? unitName(u.unit) : role === "plan" ? L("ฝ่ายแผน", "Planning") : L("ฝ่ายการคลัง", "Finance"); };
const prjOwn = k => (k === "both" ? `${prjOwnUnit("plan")}–${prjOwnUnit("fin")}` : prjOwnUnit(k));
const prjX = s => tx(s.x[1]).replace("{pm}", pmN()).replace("{ai}", tx(prjCfg().aiName));
const prjArrow = k => (k === "out" ? "→" : k === "both" ? "↔" : "←");

// ---------- the registry, read from the live records ----------
const prjSum = a => a.reduce((x, y) => x + (y || 0), 0);
const pad4 = n => String(n).padStart(4, "0");
function prjGf(unit, act) { const u = S.units.find(x => x.id === unit); return `00${u ? u.code : "00"}-${String(act || "").replace(/-/g, ".")}`; }
const prjNo = (c, fy, n) => `${c.prefix}-${String(fy).slice(-2)}-${pad4(n)}`;
// A line from the Act is Ln; a line drafted in the allocation form is AL-yyyy-nnn and numbers from 5000, so the two never meet.
const prjLineNo = l => { const m = /(\d+)$/.exec(l.id); return (m ? Number(m[1]) : 0) + (/^L\d/.test(l.id) ? 0 : 5000); };
const PRJ_ENDED = ["rejected", "cancelled", "withdrawn"];
const prjYearEnd = () => `${CUR_FY - 543}-09-30`;
function prjList() {
  const c = prjCfg(), out = [], A = S.allocs && S.allocs[CUR_FY];
  const scope = c.pmScope || (A ? A.lines.filter(l => l.type === "inv").map(l => l.id) : []);
  if (A) A.lines.forEach(l => {
    const plan = (S.pplan || []).find(p => p.line === l.id), cs = (S.cases || []).find(x => x.line === l.id);
    const cons = (S.contracts || []).filter(x => x.line === l.id && x.status !== "draft"), cms = (S.fcommit || []).filter(x => x.line === l.id);
    const tr = (A.transfers || []).filter(t => t.status === "approved");
    const annual = l.amount + prjSum(tr.filter(t => t.to === l.id).map(t => t.amount)) - prjSum(tr.filter(t => t.from === l.id).map(t => t.amount));
    // the month's GFMIS figures lag approved payments by a few days; take whichever is further along
    const paid = Math.max(prjSum(((S.disb || {})[l.id] || []).filter(v => v != null)), prjSum((S.payreqs || []).filter(y => y.status === "approved" && cons.some(x => x.id === y.contract)).map(y => y.amount)));
    const committed = bal(l).com; // the same figure the line ledger shows
    const accepted = cons.some(x => (x.phases || []).some(phaseAccepted));
    const routine = l.type === "per" || (!plan && !cons.length && cms.length > 0);
    const allotted = l.allot && l.allot.status === "approved";
    let step = 3;
    if (allotted) step = 4;
    if (cons.length || cms.length) step = 5;
    if (accepted) step = 6;
    if (paid > 0 && (accepted || routine || !cons.length)) step = 7;
    if (routine && paid > 0) step = 7;
    out.push({ id: prjNo(c, CUR_FY, prjLineNo(l)), fy: CUR_FY, src: "line", ref: l.id, line: l, ended: !!l.cancelled, name: l.name, unit: l.unit, type: l.type, amount: annual, base: l.amount, paid, committed, step, routine,
      plan, cs, cons, cms, pm: scope.includes(l.id), gf: prjGf(l.unit, l.act), kind: c.multi.includes(l.id) ? "multi" : "single",
      wtype: cs ? cs.kind : routine ? "routine" : l.type === "inv" ? "construction" : "service", loc: c.loc[l.id] || null, allotT: allotted ? l.allot.t : null });
  });
  (S.requests || []).forEach(r => {
    const st = r.status === "approved" ? 2 : 1;
    out.push({ id: prjNo(c, FORM_FY, Number(r.id.split("-").pop())), fy: FORM_FY, src: "req", ref: r.id, req: r, ended: PRJ_ENDED.includes(r.status), name: r.name, unit: r.unit, type: (r.items[0] || {}).type || "ope", amount: r.amount, paid: 0, committed: 0, step: st,
      routine: (r.items[0] || {}).type === "per", pm: false, gf: prjGf(r.unit, r.act), kind: r.years && Object.keys(r.years).length > 1 ? "multi" : "single", wtype: (r.items[0] || {}).type === "inv" ? "construction" : "service", loc: null, cons: [], cms: [] });
  });
  ((S.carry && S.carry.prev) || []).forEach((k, i) => out.push({ id: prjNo(c, CUR_FY - 1, i + 1), fy: CUR_FY - 1, src: "carry", ref: k.id, carry: k, name: k.name, unit: k.unit, type: "inv", amount: k.amount, paid: k.paid, committed: k.amount, step: 8,
    routine: false, pm: false, gf: prjGf(k.unit, "C" + (i + 1)), kind: "carry", wtype: "construction", loc: null, cons: [], cms: [] }));
  return out;
}
const prjById = id => prjList().find(p => p.id === id);
const PRJ_KIND = { single: ["ปีเดียว", "Single-year"], multi: ["ผูกพันข้ามปี", "Multi-year"], carry: ["เงินกันเหลื่อมปี", "Carry-over"] };
const PRJ_WT = { construction: ["งานก่อสร้าง", "Construction"], goods: ["ซื้อ", "Goods"], service: ["จ้างบริการ", "Services"], consult: ["จ้างที่ปรึกษา", "Consultancy"], routine: ["รายจ่ายประจำ", "Routine spending"] };
const prjWt = k => tx(PRJ_WT[k] || PRJ_WT.service);
const prjStepName = n => tx(PRJ_CYCLE[n - 1].name);
const prjArea = p => (p.loc ? tx(p.loc.area) : L("ส่วนกลาง", "Head office"));
const prjTarget = p => (p.loc && p.loc.target ? `${fmt(p.loc.target[0], p.loc.target[0] % 1 ? 1 : 0)} ${tx(p.loc.target[1])}` : "–");

// ---------- persisted state: what was sent to the PM system, what came back, what was shared ----------
function prjState() {
  if (!S.prj) {
    const list = prjList().filter(p => p.pm);
    S.prj = { online: true, out: {}, inb: [], feed: 0, log: [], cons: {} };
    // Everything was sent when the budget was allotted; the last project waited in the buffer while the PM system was down.
    list.forEach((p, i) => (S.prj.out[p.id] = { h: prjHash(p), t: (p.allotT || fyStart(CUR_FY)) + "T18:00", st: i === list.length - 1 ? "queued" : "sent" }));
    S.prj.log = prjCfg().log.map(x => Object.assign({}, x));
  }
  // the exchange shows in Administration › Interfaces too
  if (S.integrations && !S.integrations.some(g => g.id === "IF-08")) S.integrations.push(
    { id: "IF-08", sys: (prjCfg().pmShort)[1], dir: [ "ส่งออก / นำเข้า", "Export / import"], method: ["API ตามมาตรฐานที่ระบบนี้กำหนด", "API to the standard this system sets"], freq: ["เมื่องบอนุมัติและทุกครั้งที่ข้อมูลเปลี่ยน", "On approval and on every change"], status: "ok", last: `${TODAY}T06:00`, records: 12, msg: ["สำเร็จ · ไม่มีข้อมูลค้างส่ง", "Succeeded · nothing waiting"] },
  );
  return S.prj;
}
// The twelve items sent to the PM system, keyed by the project id (never by the GFMIS code).
function prjOutFields(p) {
  const l = p.line, A = S.allocs[CUR_FY];
  const pend = (A.transfers || []).filter(t => t.status === "pending" && (t.to === p.ref || t.from === p.ref));
  return [
    [L("รหัสโครงการเดียว", "Project id"), `<b class="mono">${esc(p.id)}</b> <span class="sub">${L("(กุญแจเชื่อม)", "(the join key)")}</span>`, p.id],
    [L("รหัสงบประมาณ GFMIS", "GFMIS budget code"), `<span class="mono">${esc(p.gf)}</span>`, p.gf],
    [L("ชื่อโครงการตาม พ.ร.บ.", "Name in the Act"), esc(tx(p.name)), (p.name)[0]],
    [L("เป้าหมาย", "Target"), prjTarget(p), p.loc ? p.loc.target || null : null],
    [L("วงเงินรายปี", "Annual amount"), `${fmt(p.amount)} ${L("บาท", "baht")}${pend.length ? ` <span class="pill p-warn">${L("มีโอนรออนุมัติ", "transfer pending")}</span>` : ""}`, p.amount],
    [L("ลักษณะงบ", "Budget kind"), tx(PRJ_KIND[p.kind]), p.kind],
    [L("ปีงบประมาณ", "Fiscal year"), String(p.fy), p.fy],
    [L("หน่วยงานรับผิดชอบ", "Responsible unit"), esc(unitName(p.unit)), p.unit],
    [L("ประเภทงาน / ภาระงาน", "Work type"), prjWt(p.wtype), p.wtype],
    [L("พื้นที่ จังหวัด อำเภอ ตำบล", "Province, district, subdistrict"), esc(prjArea(p)), p.loc ? p.loc.area : null],
    [L("สถานะ / วันที่อนุมัติงบ", "Status / approval date"), l && l.allot ? `${l.allot.status === "approved" ? L("อนุมัติงวดเงินแล้ว", "Allotment approved") : L("รออนุมัติงวดเงิน", "Allotment pending")} · ${fdate(l.allot.t)}` : "–", l && l.allot ? l.allot.status + l.allot.t : ""],
    [L("งวดเงินที่ได้รับ", "Allotment received"), `${fmt(p.allotT ? p.amount : 0)} ${L("บาท", "baht")}`, p.allotT ? p.amount : 0],
  ];
}
const prjHash = p => JSON.stringify(prjOutFields(p).map(f => f[2]));
// Out state of a project: sent (and unchanged), changed since the last send, or waiting in the buffer.
function prjOut(p) {
  const o = prjState().out[p.id];
  if (!o) return { st: "new", t: null };
  if (o.st === "queued") return { st: "queued", t: o.t };
  return { st: o.h === prjHash(p) ? "sent" : "changed", t: o.t };
}
const PRJ_OUT = { sent: [["ส่งแล้ว ตรงกัน", "Sent, in step"], "p-ok"], changed: [["ข้อมูลเปลี่ยน รอส่งใหม่", "Changed, to resend"], "p-warn"], queued: [["พักในคิว รอระบบปลายทาง", "Held in the buffer"], "p-info"], new: [["ยังไม่เคยส่ง", "Never sent"], "p-mute"] };
const prjOutPill = st => tag(tx(PRJ_OUT[st][0]), PRJ_OUT[st][1]);
const PM_ROLES = ["plan", "fin", "admin"], PM_APPLY = ["fin", "finhead", "proc", "prochead"];

// What the PM system reports back, in four dimensions. Fisko reads it; it never edits physical progress.
function prjPmIn(p) {
  const c = p.cons[0];
  if (!c) return null;
  const ph = c.phases || [], tot = prjSum(ph.map(x => x.amount)) || 1;
  const planPct = Math.round(prjSum(ph.filter(x => x.due <= TODAY).map(x => x.amount)) / tot * 100);
  const actPct = Math.round(prjSum(ph.filter(x => x.delivered).map(x => x.amount)) / tot * 100);
  const st = prjState(), msgs = st.inb.filter(m => m.prj === p.id && m.applied);
  const ext = prjSum(msgs.filter(m => m.dim === "time").map(m => m.days)), chg = prjSum(msgs.filter(m => m.dim === "cost").map(m => m.amount));
  const last = (st.inb.filter(m => m.prj === p.id).map(m => m.t).sort().pop()) || (ph.filter(x => x.delivered).map(x => x.delivered + "T16:00").sort().pop()) || c.signed + "T16:00";
  const end = ph.length ? ph[ph.length - 1].due : c.signed;
  return { c, planPct, actPct, ext, chg, last, end, accepted: prjSum(ph.map(x => x.okAmount)), fixes: msgs.filter(m => m.dim === "quality").length, stale: daysUntil(last.slice(0, 10)) < -14 };
}
// A tenant's own wording for a scripted message: [th, en] with {phase} for the phase name.
const prjFeedText = (dim, ph, def) => { const t = prjCfg().feed[dim]; return t ? t.map((x, i) => x.replace("{phase}", ph.name[i])) : def; };
// A scripted feed: each press of "Receive from the PM system" brings the next message for the first contracted project.
function prjFeed() {
  const p = prjList().find(x => x.pm && x.cons.length);
  if (!p) return [];
  const c = p.cons[0], ph = c.phases || [], nx = ph.find(x => !x.delivered) || ph[ph.length - 1];
  return [
    { dim: "time", prj: p.id, days: 30, text: prjFeedText("time", nx, [`ขยายเวลา${nx.name[0]} 30 วัน ตามที่ผู้ควบคุมงานรับรอง`, `${nx.name[1]} extended by 30 days, certified by the supervisor`]),
      eff: ["ประเมินแผนเบิกจ่ายใหม่ · งวดนี้อาจเลื่อนข้ามไตรมาส พิจารณาเงินกันหากเลยสิ้นปีงบประมาณ", "Re-forecast payments: this phase may slip a quarter; consider carry-over if it passes year end"] },
    { dim: "cost", prj: p.id, amount: Math.round(c.amount * 0.016 / 1000) * 1000, text: prjFeedText("cost", nx, ["งานเพิ่มตามบันทึกแก้ไขสัญญาครั้งที่ 1 (รออนุมัติแก้ไขสัญญาในระบบจัดซื้อ)", "Extra work under contract change no. 1 (approval due in Procurement)"]),
      eff: ["ปรับยอดก่อหนี้เมื่อการแก้ไขสัญญาได้รับอนุมัติ · ยอดคงเหลือของบรรทัดงบลดลง", "Adjust the commitment once the change is approved; the line's balance goes down"] },
    { dim: "quality", prj: p.id, text: prjFeedText("quality", ph[0], [`ผลตรวจรับ${ph[0].name[0]}: แก้ไขรายการที่ต้องปรับปรุง 2 รายการแล้วเสร็จ`, `${ph[0].name[1]} acceptance: the 2 items to fix are done`]),
      eff: ["แนบเป็นหลักฐานประกอบการเบิกจ่ายงวดนั้น", "Attached as evidence for that phase's payment"] },
    { dim: "status", prj: p.id, text: prjFeedText("status", nx, ["สถานะโครงการ: กำลังดำเนินการ · ความก้าวหน้าจริงตามรายงาน", "Project status: in progress · actual progress as reported"]),
      eff: ["ยืนยันความเป็นปัจจุบันของข้อมูล", "Confirms the data is current"] },
  ];
}
const PRJ_DIM = { time: [["เวลา", "Time"], "clock"], cost: [["ต้นทุน", "Cost"], "coins"], quality: [["คุณภาพ", "Quality"], "checksq"], status: [["สถานะ", "Status"], "activity"] };

// ---------- the system on the rail ----------
SYSTEMS.projects = { grp: "core", icon: "hub", name: ["ทะเบียนโครงการกลาง", "Project registry"], desc: ["รหัสโครงการเดียวตลอดวงจรงบประมาณ 8 ขั้น", "One project id across the 8-step budget cycle"] };
SYS_IDS.splice(SYS_IDS.indexOf("finance") + 1, 0, "projects");
const PRJ_PAGES = [
  ["prj-cycle", ["วงจรงบประมาณ 8 ขั้น", "The 8-step cycle"], "flag"],
  ["prj-registry", ["ทะเบียนโครงการ", "Project register"], "list"],
  ["prj-project", ["โครงการ 360°", "Project 360°"], "target"],
  ["prj-pm", ["แลกเปลี่ยนกับระบบ PM", "PM exchange"], "share"],
  ["prj-share", ["การแชร์ข้อมูล", "Data sharing"], "send"],
  ["prj-tor", ["โมดูลและหน้าที่ตาม ToR", "ToR modules and duties"], "layers"],
];
NAV.push(...PRJ_PAGES.map(([id, label]) => ({ id, code: "", group: "prj", app: "all", roles: WS_ROLES, label })));
PRJ_PAGES.forEach(([id, , ico]) => (NAV_ICON[id] = ico));
// Show the new system on the rail once, for browsers that kept the old pins.
if (!store.get("fisko-sys-pins-prj")) { const p = sysPins(); if (!p.includes("projects")) { p.splice(Math.max(0, p.indexOf("finance") + 1), 0, "projects"); jset("fisko-sys-pins", p); } store.set("fisko-sys-pins-prj", "1"); }
{
  const so = sysOfView; sysOfView = v => (v.startsWith("prj-") ? "projects" : so(v));
  const sw = switchSys; switchSys = id => { if (id === "projects") { closeLauncher(); return sysAllowed(id) ? go("prj-cycle") : toast(L("บทบาทนี้ไม่มีสิทธิ์ใช้ระบบนี้", "This role has no access to this system")); } return sw(id); };
  const ao = appOfLink; appOfLink = l => (l && (l.startsWith("prj-") || l.startsWith("prj:")) ? "all" : ao(l));
  const lp = linkPage; linkPage = l => (l && l.startsWith("prj:") ? "prj-project" : lp(l));
  const jp = jump; jump = l => { if (l.startsWith("prj:")) { PRJ_SEL = l.slice(4); return go("prj-project"); } return jp(l); };
  const rn = renderNav;
  renderNav = function () {
    if (SYS !== "projects") return rn.apply(this, arguments);
    const st = prjState(), list = prjList(), waiting = list.filter(p => p.pm && prjOut(p).st !== "sent").length, inb = st.inb.filter(m => !m.applied).length;
    const pend = prjCfg().consumers.filter(c => c.kind === "ext" && (st.cons[c.id] || c.status) === "pending").length;
    const cnt = n => (n ? `<span class="badge">${n}</span>` : "");
    const a = (id, label, ico, b = "") => `<a href="#${id}" data-href="${id}"><span class="ni">${svgI(ico)}</span><span class="nl">${label}</span>${b}</a>`;
    $("#nav").innerHTML = `<div class="nav-h">${L("ทะเบียนโครงการ", "Projects")}</div>${a("prj-cycle", L("วงจรงบประมาณ 8 ขั้น", "The 8-step cycle"), "flag")}${a("prj-registry", L("ทะเบียนโครงการ", "Project register"), "list", `<span class="badge" style="background:var(--surface-2);color:var(--muted)">${list.length}</span>`)}${a("prj-project", L("โครงการ 360°", "Project 360°"), "target")}
      <div class="nav-h">${L("เชื่อมต่อและแชร์", "Exchange and sharing")}</div>${a("prj-pm", tx(prjCfg().pmShort), "share", cnt(waiting + inb))}${a("prj-share", L("การแชร์ข้อมูล", "Data sharing"), "send", cnt(pend))}
      ${prjCfg().modules ? `<div class="nav-h">ToR</div>${a("prj-tor", L("โมดูลและหน้าที่ตาม JD", "Modules and JD duties"), "layers")}` : ""}`;
    renderAppBrand(); markSysNav();
  };
}
const prjHead = (title, sub, right = "") => `<div class="head"><div><div class="eyebrow">${esc(tx(prjCfg().hubName))}</div><h1>${title}</h1><p>${sub}</p></div><span class="sp"></span>${right}</div>`;
const prjLink = p => `<a href="#" data-prj="${esc(p.id)}" class="mono">${esc(p.id)}</a>`;
const bindPrj = () => {
  $$("#view [data-prj]").forEach(a => (a.onclick = e => { e.preventDefault(); jump("prj:" + a.dataset.prj); }));
  $$("#view [data-pjump]").forEach(a => (a.onclick = e => { e.preventDefault(); jump(a.dataset.pjump); }));
};
const pJump = (l, label) => (linkOk(l) ? `<a href="#" data-pjump="${esc(l)}">${label}</a>` : label);

// ---------- 1. the 8-step cycle ----------
let PRJ_STEP = 0;
VIEWS["prj-cycle"] = () => {
  const list = prjList(), c = prjCfg();
  const at = n => list.filter(p => p.step === n && !p.ended);
  const box = s => { const ps = at(s.n), amt = prjSum(ps.map(p => (s.n === 8 ? p.amount - p.paid : p.amount)));
    return `<li class="pc-step ${s.own} ${PRJ_STEP === s.n ? "on" : ""}"><button type="button" data-pstep="${s.n}" aria-pressed="${PRJ_STEP === s.n}"><span class="pc-n">${L("ขั้น", "Step")} ${s.n} · ${prjOwn(s.own)}</span><b>${tx(s.name)}</b>
      <span class="pc-v"><b>${ps.length}</b> ${L("โครงการ", "projects")} · ${mb(amt)} ${L("ลบ.", "M")}</span><span class="pc-m">${s.mods.map(m => `<i>${m}</i>`).join("")}</span></button>
      <span class="pc-x ${s.x[0]}">${prjArrow(s.x[0])} ${esc(prjX(s))}</span></li>`; };
  const shown = PRJ_STEP ? at(PRJ_STEP) : list;
  return `${prjHead(L("วงจรงบประมาณ 8 ขั้น", "The budget cycle in 8 steps"), L(`ทุกโครงการมีรหัสเดียวตั้งแต่ตั้งคำขอจนถึงเงินกัน ตัวเลขอ่านจากข้อมูลจริงในระบบงบประมาณ จัดซื้อ และการเงิน ไม่บันทึกซ้ำ · ผู้ใช้ ${fmt(c.userUnits || S.units.length)} หน่วยงาน`, `Every project keeps one id from request to carry-over. The figures are read from the live Budget, Procurement and Finance records, never typed twice · ${fmt(c.userUnits || S.units.length)} user units`),
    `<button class="btn" type="button" data-pjump="prj-registry">${L("ทะเบียนโครงการ", "Project register")} ${icon("arrow", 13)}</button>`)}
  <section class="panel"><header>${chipIco("flag")}<h2>${L("ขั้นตอนและผู้รับผิดชอบ", "Steps and owners")}</h2><span class="sp"></span><span class="sub">${L("เลขในวงกลม = โมดูลที่รองรับ · ป้าย = จุดแลกเปลี่ยนข้อมูลกับระบบอื่น", "Numbers = supporting modules · tags = where data is exchanged")}</span></header>
    <ol class="pcycle">${PRJ_CYCLE.map(box).join("")}</ol>
    <div class="body sub">${L("ทุกขั้นใช้ร่วม: ทะเบียนโครงการกลาง · ติดตามและเร่งรัด · รายงานและแดชบอร์ด | งานประจำนอกวงจรโครงการ: เงินเดือน · ทรัพย์สินและอาคาร · บริหารงานทั่วไป", "Shared by every step: the project register, monitoring and reports | Routine work outside the project cycle: payroll, assets and buildings, general administration")}</div></section>
  <section class="panel"><header>${chipIco("list")}<h2>${PRJ_STEP ? `${L("ขั้น", "Step")} ${PRJ_STEP} · ${prjStepName(PRJ_STEP)}` : L("ทุกโครงการ", "Every project")}</h2><span class="sp"></span>${PRJ_STEP ? `${pJump(PRJ_CYCLE[PRJ_STEP - 1].link, L("เปิดหน้างานของขั้นนี้", "Open this step's page"))} <button class="btn ghost" type="button" data-pstep="0">${L("ดูทั้งหมด", "Show all")}</button>` : ""}</header>
    ${prjTable(shown)}</section>`;
};
BIND["prj-cycle"] = () => { bindPrj(); $$("[data-pstep]").forEach(b => (b.onclick = () => { const n = Number(b.dataset.pstep); PRJ_STEP = PRJ_STEP === n ? 0 : n; route(); })); };
function prjTable(ps) {
  if (!ps.length) return `<div class="body empty">${L("ไม่มีโครงการในขั้นนี้", "No project at this step")}</div>`;
  return `<div class="tbl-wrap"><table><thead><tr><th>${L("รหัสโครงการ", "Project id")}</th><th>${L("โครงการ", "Project")}</th><th>${L("ขั้นปัจจุบัน", "Current step")}</th><th class="num">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th class="num">${L("ก่อหนี้", "Committed")}</th><th class="num">${L("เบิกจ่าย", "Paid")}</th><th>${pmN()}</th></tr></thead>
    <tbody>${ps.map(p => `<tr><td>${prjLink(p)}<div class="sub mono">${esc(p.gf)}</div></td><td><b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub">${esc(unitName(p.unit))} · ${tx(PRJ_KIND[p.kind])}${p.routine ? ` · ${prjWt("routine")}` : ""}</div></td>
      <td>${p.ended ? tag(L("สิ้นสุดแล้ว", "Ended"), "p-mute") : `<span class="pstep">${p.step}</span> ${prjStepName(p.step)}`}</td><td class="num">${mb(p.amount)}</td><td class="num">${p.committed ? mb(p.committed) : "–"}</td><td class="num">${p.paid ? mb(p.paid) : "–"}</td>
      <td>${p.pm ? prjOutPill(prjOut(p).st) : `<span class="sub">${L("ไม่แลกเปลี่ยน", "Not exchanged")}</span>`}</td></tr>`).join("")}</tbody></table></div>`;
}

// ---------- 2. the register ----------
let PRJ_Q = "", PRJ_FY = "all";
VIEWS["prj-registry"] = () => {
  const all = prjList(), q = PRJ_Q.trim().toLowerCase();
  const ps = all.filter(p => (PRJ_FY === "all" || String(p.fy) === PRJ_FY) && (!q || `${p.id} ${p.gf} ${p.ref} ${tx(p.name)} ${unitName(p.unit)}`.toLowerCase().includes(q)));
  const fys = [["all", `${L("ทุกปี", "All years")} · ${all.length}`], ...[FORM_FY, CUR_FY, CUR_FY - 1].map(fy => [String(fy), `${fy} · ${all.filter(p => p.fy === fy).length}`])];
  return `${prjHead(L("ทะเบียนโครงการกลาง", "Central project register"), L("หนึ่งโครงการ หนึ่งรหัส ใช้เชื่อมทุกระบบ ห้ามใช้รหัส GFMIS เป็นกุญแจ เพราะรหัสงบเปลี่ยนได้เมื่อโอนหรือปรับโครงสร้าง", "One project, one id, used to join every system. The GFMIS code is never the key: it changes with transfers and restructuring."))}
  <section class="stats">${statCard({ label: L("โครงการในทะเบียน", "Projects registered"), value: all.filter(p => !p.ended).length, icon: "list", sub: L("3 ปีงบประมาณ", "3 fiscal years") })}${statCard({ label: L("แลกเปลี่ยนกับระบบ PM", "Exchanged with the PM system"), value: all.filter(p => p.pm).length, icon: "share", tone: "info", sub: tx(prjCfg().pmShort) })}${statCard({ label: L(`วงเงินปี ${CUR_FY}`, `FY${CUR_FY} budget`), value: mb(prjSum(all.filter(p => p.fy === CUR_FY && !p.ended).map(p => p.amount))), unit: L("ลบ.", "M"), icon: "wallet", sub: "" })}${statCard({ label: L("เบิกจ่ายแล้ว", "Paid so far"), value: mb(prjSum(all.filter(p => p.fy === CUR_FY && !p.ended).map(p => p.paid))), unit: L("ลบ.", "M"), icon: "coins", tone: "ok", sub: L("ตาม GFMIS ล่าสุด", "per the latest GFMIS") })}</section>
  <section class="panel"><header>${segBar(fys, PRJ_FY, "pfy")}<span class="sp"></span><input type="search" id="prj-q" value="${esc(PRJ_Q)}" placeholder="${L("ค้นหารหัส ชื่อ หน่วยงาน หรือรหัส GFMIS", "Search id, name, unit or GFMIS code")}" aria-label="${L("ค้นหาโครงการ", "Search projects")}" style="max-width:300px"></header>
    ${prjTable(ps)}<div class="body sub">${L("ข้อมูลอยู่ฐานเดียว ระบบอื่นเรียกใช้ ไม่ทำสำเนา · ทุกรายงานบอกวันเวลาข้อมูล GFMIS ล่าสุด", "One copy of the data; other systems read it, never copy it · every report states the time of the latest GFMIS data")}: ${prjAsOf()}</div></section>`;
};
BIND["prj-registry"] = () => {
  bindPrj();
  $$("[data-pfy]").forEach(b => (b.onclick = () => { PRJ_FY = b.dataset.pfy; route(); }));
  const q = $("#prj-q"); if (q) q.oninput = () => { const pos = q.selectionStart; PRJ_Q = q.value; route(); const n = $("#prj-q"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
};
// The time of the latest GFMIS data: the newest file not undone, or today when no file has come in.
const prjGfT = () => (S.gfmisFiles || []).filter(x => !x.undone).map(x => x.t).sort().pop() || TODAY;
const prjAsOf = () => { const f = prjGfT(); return f.length > 10 ? fdate(f.slice(0, 10)) + " " + f.slice(11, 16) : fdate(f); };

// ---------- 3. one project across the cycle ----------
let PRJ_SEL = null;
function prjTimeline(p) {
  const l = p.line, A = S.allocs[CUR_FY], tr = l ? (A.transfers || []).filter(t => t.from === l.id || t.to === l.id) : [];
  const ph = prjSum(p.cons.map(c => (c.phases || []).length)), acc = prjSum(p.cons.map(c => (c.phases || []).filter(phaseAccepted).length));
  const pays = (S.payreqs || []).filter(y => p.cons.some(c => c.id === y.contract));
  const ev = {
    1: p.req ? [`${p.req.id} · ${tx(STATUS[p.req.status] ? STATUS[p.req.status][0] : [p.req.status, p.req.status])}`, "req:" + p.req.id] : p.carry ? [L(`คำขอปี ${p.fy}`, `FY${p.fy} request`), null] : [L(`คำขอปี ${p.fy} ผ่านการพิจารณาแล้ว`, `FY${p.fy} request approved`), "requests"],
    2: l ? [`${L("บรรทัด", "Line")} ${l.id} · ${mb(l.amount)} ${L("ลบ.", "M")} · ${tx(A.act)}`, "allocation"] : p.req && p.req.status === "approved" ? [L("รอ พ.ร.บ. งบประมาณ", "Waiting for the Act"), "allocation"] : null,
    3: l ? [`${p.allotT ? L("อนุมัติงวดเงิน", "Allotment approved") + " " + fdate(p.allotT) : L("รออนุมัติงวดเงิน", "Allotment pending")}${tr.length ? ` · ${tr.map(t => `${t.id} ${mb(t.amount)} ${L("ลบ.", "M")} (${t.status === "approved" ? L("อนุมัติ", "approved") : L("รออนุมัติ", "pending")})`).join(", ")}` : ""}`, "alloc-allocate"] : null,
    4: p.plan ? [`${p.plan.id}${p.cs ? ` · ${p.cs.id}` : ""}${p.plan.egp ? ` · e-GP ${esc(p.plan.egp.no)}: ${tx(p.plan.egp.stage)}` : ""}`, p.cs ? "case:" + p.cs.id : "prc-plan"] : p.routine ? [L("รายจ่ายประจำ ไม่ต้องจัดซื้อ", "Routine spending, no procurement"), null] : l ? [L("ยังไม่มีแผนจัดซื้อจัดจ้าง", "No procurement plan yet"), "prc-plan"] : null,
    5: p.cons.length || p.cms.length ? [[...p.cons.map(c => `${c.id} · ${esc(tx(c.vendor))} · ${mb(c.amount)} ${L("ลบ.", "M")}`), ...p.cms.map(c => `${c.id} · ${mb(c.amount)} ${L("ลบ.", "M")}`)].join("<br>"), p.cons.length ? "prc-contracts" : "fnc-chain"] : null,
    6: ph ? [`${L("ตรวจรับแล้ว", "Accepted")} ${acc} / ${ph} ${L("งวด", "phases")}`, "prc-contracts"] : null,
    7: p.paid ? [`${L("จ่ายแล้ว", "Paid")} ${mb(p.paid)} ${L("ลบ.", "M")}${pays.length ? ` · ${pays.map(y => `${y.id} ${y.recon && y.recon.state === "matched" ? L("ตรงกับ GFMIS", "matches GFMIS") : L("รอสอบทาน GFMIS", "awaiting GFMIS")}`).join(", ")}` : ""}`, "fnc-pay"] : null,
    8: p.carry ? [`${p.carry.id} · ${L("เหลือ", "left")} ${mb(p.carry.amount - p.carry.paid)} ${L("ลบ.", "M")} · ${L("สิ้นสุด", "ends")} ${fdate(p.carry.due)}`, "alloc-carry"] : l ? [`${L("พิจารณาเงินกันเมื่อสิ้นปีงบประมาณ", "Carry-over is decided at year end,")} ${fdate(prjYearEnd())}`, "alloc-carry"] : null,
  };
  return PRJ_CYCLE.map(s => ({ s, st: s.n < p.step ? "done" : s.n === p.step ? "now" : "todo", ev: ev[s.n] }));
}
VIEWS["prj-project"] = () => {
  const list = prjList(), p = list.find(x => x.id === PRJ_SEL) || list.find(x => x.pm && x.cons.length) || list[0];
  if (!p) return prjHead(L("โครงการ 360°", "Project 360°"), L("ยังไม่มีโครงการ", "No projects yet"));
  PRJ_SEL = p.id;
  const tl = prjTimeline(p), pin = p.pm ? prjPmIn(p) : null, o = p.pm ? prjOut(p) : null;
  const pick = `<select id="prj-pick" aria-label="${L("เลือกโครงการ", "Choose a project")}" style="max-width:340px">${list.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${esc(x.id)} · ${esc(tx(x.name))}</option>`).join("")}</select>`;
  return `${prjHead(esc(tx(p.name)), `<span class="mono">${esc(p.id)}</span> · GFMIS <span class="mono">${esc(p.gf)}</span> · ${esc(unitName(p.unit))} · ${tx(PRJ_KIND[p.kind])} · ${prjWt(p.wtype)}`, pick)}
  <section class="stats">${statCard({ label: L("วงเงิน", "Budget"), value: mb(p.amount), unit: L("ลบ.", "M"), icon: "wallet", sub: p.base && p.base !== p.amount ? `${L("ตาม พ.ร.บ.", "in the Act")} ${mb(p.base)}` : `${L("ปีงบประมาณ", "FY")} ${p.fy}` })}${statCard({ label: L("ก่อหนี้ผูกพัน", "Committed"), value: mb(p.committed), unit: L("ลบ.", "M"), icon: "pen", sub: p.amount ? `${Math.round(p.committed / p.amount * 100)}%` : "" })}${statCard({ label: L("เบิกจ่าย", "Paid"), value: mb(p.paid), unit: L("ลบ.", "M"), icon: "coins", tone: "ok", sub: p.amount ? `${Math.round(p.paid / p.amount * 100)}%` : "" })}${statCard({ label: L("ขั้นปัจจุบัน", "Current step"), value: p.step, unit: "/ 8", icon: "flag", tone: "info", sub: prjStepName(p.step) })}</section>
  <div class="grid2">
    <section class="panel"><header>${chipIco("flag")}<h2>${L("เส้นทางของโครงการในวงจรงบประมาณ", "The project through the cycle")}</h2></header>
      <ol class="ptl">${tl.map(({ s, st, ev }) => `<li class="${st}"><span class="ptl-n">${st === "done" ? icon("check", 13) : s.n}</span><div><b>${tx(s.name)}</b> <span class="sub">· ${prjOwn(s.own)}</span>
        <div class="sub">${ev ? (ev[1] ? pJump(ev[1], ev[0]) : ev[0]) : st === "todo" ? L("ยังไม่ถึงขั้นนี้", "Not reached yet") : "–"}</div>${s.x ? `<div class="pc-x ${s.x[0]}">${prjArrow(s.x[0])} ${esc(prjX(s))}</div>` : ""}</div></li>`).join("")}</ol></section>
    <div>
      <section class="panel"><header>${chipIco("share")}<h2>${L("ข้อมูลที่ส่งให้", "Sent to")} ${esc(pmN())}</h2><span class="sp"></span>${o ? prjOutPill(o.st) : ""}</header>
        ${p.pm ? `<dl class="cr-rv pkv">${prjOutFields(p).map(([k, v], i) => `<dt>${i + 1}. ${k}</dt><dd>${v}</dd>`).join("")}</dl><div class="body sub">${o.t ? `${L("ส่งล่าสุด", "Last sent")} ${fdate(o.t, true)} · ` : ""}${L("ส่งเมื่องบอนุมัติ และทุกครั้งที่ข้อมูลเปลี่ยน พร้อมแจ้งผู้รับผิดชอบตามภาระงานและพื้นที่", "Sent on approval and on every change, with an alert to the owners by duty and area")} · ${pJump("prj-pm", L("ไปหน้าแลกเปลี่ยน", "Open the exchange"))}</div>`
          : `<div class="body sub">${p.src === "req" ? L("ส่งเมื่อได้รับอนุมัติงบประมาณ (ขั้น 3)", "Sent once the budget is allotted (step 3)") : p.routine ? L("รายจ่ายประจำ ไม่มีงานที่ต้องติดตามในระบบ PM", "Routine spending: nothing for the PM system to track") : L("โครงการนี้ไม่อยู่ในขอบเขตการแลกเปลี่ยน", "Outside the exchange scope")}</div>`}</section>
      ${pin ? `<section class="panel"><header>${chipIco("activity")}<h2>${L("ข้อมูลที่รับจาก", "Received from")} ${esc(pmN())}</h2><span class="sp"></span>${pin.stale ? tag(L("ข้อมูลไม่เป็นปัจจุบัน", "Not current"), "p-warn") : tag(L("เป็นปัจจุบัน", "Current"), "p-ok")}</header>
        <dl class="cr-rv pkv"><dt>${tx(PRJ_DIM.time[0])}</dt><dd>${L("สัญญา", "Contract")} ${fdate(pin.c.signed)} – ${fdate(pin.end)}${pin.ext ? ` · ${L("ขยาย", "extended")} ${pin.ext} ${L("วัน", "days")}` : ""}<br>${L("ความก้าวหน้า แผน", "Progress, plan")} ${pin.planPct}% · ${L("จริง", "actual")} ${pin.actPct}%</dd>
          <dt>${tx(PRJ_DIM.cost[0])}</dt><dd>${L("ค่างานตามสัญญา", "Contract value")} ${mb(pin.c.amount)} ${L("ลบ.", "M")}${pin.chg ? ` · ${L("งานเพิ่ม", "change orders")} +${mb(pin.chg)}` : ""} · ${L("ตรวจรับแล้ว", "accepted")} ${mb(pin.accepted)}</dd>
          <dt>${tx(PRJ_DIM.quality[0])}</dt><dd>${pin.fixes ? `${pin.fixes} ${L("รายการแก้ไขแล้วเสร็จ", "fixes done")}` : L("ไม่มีรายการค้างแก้ไข", "Nothing to fix")}</dd>
          <dt>${tx(PRJ_DIM.status[0])}</dt><dd>${L("ปรับปรุงล่าสุด", "Last updated")} ${fdate(pin.last.slice(0, 10))}</dd></dl>
        <div class="body sub">${L(`${pmN()} เป็นเจ้าของความก้าวหน้ากายภาพ ระบบนี้เป็นเจ้าของงบ ก่อหนี้ และเบิกจ่าย ไม่บันทึกซ้ำสองระบบ`, `${pmN()[0].toUpperCase() + pmN().slice(1)} owns physical progress; this system owns budget, commitment and payment. Nothing is typed twice.`)}</div></section>` : ""}
    </div>
  </div>`;
};
BIND["prj-project"] = () => { bindPrj(); const s = $("#prj-pick"); if (s) s.onchange = () => { PRJ_SEL = s.value; route(); }; };

// ---------- 4. the exchange with the PM system ----------
VIEWS["prj-pm"] = () => {
  const st = prjState(), c = prjCfg(), ps = prjList().filter(p => p.pm), can = PM_ROLES.includes(ROLE), canApply = PM_APPLY.includes(ROLE);
  const waiting = ps.filter(p => prjOut(p).st !== "sent"), feed = prjFeed(), next = feed[st.feed];
  return `${prjHead(L(`แลกเปลี่ยนข้อมูลกับ${tx(c.pmName)}`, `Exchange with ${(c.pmName)[1]}`), L("ระบบนี้กำหนดมาตรฐานการเชื่อมต่อ ส่ง 12 รายการต่อโครงการ รับกลับ 4 มิติ เชื่อมด้วยรหัสโครงการเดียว", "This system sets the interface standard: 12 items out per project, 4 dimensions back, joined by the one project id"),
    `<span class="pill ${st.online ? "p-ok" : "p-bad"}">${st.online ? L("ปลายทางพร้อมรับ", "PM system online") : L("ปลายทางไม่พร้อม · พักข้อมูลในคิว", "PM system offline · buffering")}</span>${can ? ` <button class="btn ghost" type="button" id="pm-online">${st.online ? L("จำลองปลายทางล่ม", "Simulate an outage") : L("ปลายทางกลับมาแล้ว", "Bring it back online")}</button>` : ""}`)}
  <section class="stats">${statCard({ label: L("โครงการที่แลกเปลี่ยน", "Projects exchanged"), value: ps.length, icon: "share", sub: prjCfg().pmNote ? tx(prjCfg().pmNote[0]) : "" })}${statCard({ label: L("รอส่ง", "Waiting to send"), value: waiting.length, icon: "send", tone: waiting.length ? "warn" : "ok", sub: L("เปลี่ยนแปลง หรือพักในคิว", "changed or buffered") })}${statCard({ label: L("รับเข้ารอดำเนินการ", "Received, to act on"), value: st.inb.filter(m => !m.applied).length, icon: "inbox", tone: "info", sub: "" })}${statCard({ label: L("ข้อมูลไม่เป็นปัจจุบัน", "Not current"), value: ps.filter(p => { const i = prjPmIn(p); return i && i.stale; }).length, icon: "clock", sub: L("เกิน 14 วันไม่มีการปรับปรุง", "no update for 14 days") })}</section>
  <div class="grid2">
    <section class="panel"><header>${chipIco("send")}<h2>${L("ส่งออก: 12 รายการต่อโครงการ", "Out: 12 items per project")}</h2><span class="sp"></span>${can && waiting.length ? `<button class="btn primary" type="button" id="pm-send">${L("ส่งที่ค้างทั้งหมด", "Send everything waiting")} · ${waiting.length}</button>` : ""}</header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("โครงการ", "Project")}</th><th>${L("สถานะการส่ง", "Send status")}</th><th>${L("ส่งล่าสุด", "Last sent")}</th></tr></thead><tbody>${ps.map(p => { const o = prjOut(p);
        return `<tr><td>${prjLink(p)}<div class="sub">${esc(tx(p.name))}</div></td><td>${prjOutPill(o.st)}</td><td class="sub">${o.t ? fdate(o.t, true) : "–"}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="body sub">${L("ส่งเมื่องบอนุมัติและทุกครั้งที่ข้อมูลเปลี่ยน เช่น โอนเงินงบประมาณที่อนุมัติแล้ว · ปลายทางไม่พร้อม ระบบพักข้อมูลไว้ไม่สูญหาย แล้วส่งตามลำดับเมื่อกลับมา", "Sent on approval and on every change, such as an approved budget transfer · if the PM system is down, the data waits in the buffer and goes out in order when it is back")}</div></section>
    <section class="panel"><header>${chipIco("inbox")}<h2>${L("รับเข้า: 4 มิติ", "In: 4 dimensions")}</h2><span class="sp"></span>${can && next ? `<button class="btn" type="button" id="pm-recv">${L("รับข้อมูลจากปลายทาง", "Receive from the PM system")}</button>` : ""}</header>
      <ul class="tlist">${st.inb.slice().reverse().map(m => `<li><span class="prio ${m.applied ? "p-ok" : "p-info"}"></span><div style="min-width:0"><b style="font-weight:600">${svgI(PRJ_DIM[m.dim][1])} ${tx(PRJ_DIM[m.dim][0])} · ${prjLink({ id: m.prj })}</b><div class="sub">${esc(tx(m.text))}${m.amount ? ` · +${fmt(m.amount)} ${L("บาท", "baht")}` : ""}</div><div class="sub">→ ${esc(tx(m.eff))}</div></div>
        ${m.applied ? `<span class="sub">${L("ดำเนินการแล้ว", "Done")} ${fdate(m.applied, true)}</span>` : canApply ? `<button class="btn" type="button" data-pmapply="${m.id}">${L("รับทราบและปรับ", "Acknowledge and apply")}</button>` : `<span class="sub">${L("รอกองคลัง", "Waiting for Finance")}</span>`}</li>`).join("") || `<li><span></span><div class="empty" style="grid-column:2 / -1">${L("ยังไม่มีข้อมูลรับเข้าในรอบนี้", "Nothing received in this round yet")}</div></li>`}</ul>
      <dl class="cr-rv pkv">${[["time", ["วันเริ่ม–สิ้นสุดสัญญา แผนตามงวด ความก้าวหน้า ขยายเวลา งด/ลดค่าปรับ", "Contract dates, phase plan, progress, extensions, waived fines"], ["ประเมินเบิกจ่ายตามแผน · พิจารณาเงินกัน", "Re-forecast payments · consider carry-over"]],
        ["cost", ["ค่างานตามสัญญา แก้ไขสัญญาที่กระทบวงเงิน งานเพิ่ม/ลด ค่าปรับ มูลค่าที่ตรวจรับแล้ว", "Contract value, changes that affect it, extra or less work, fines, value accepted"], ["ปรับยอดก่อหนี้ เบิกจ่าย คงเหลือ", "Adjust commitment, payment and balance"]],
        ["quality", ["ผลตรวจรับรายงวด รายการที่ต้องแก้ไข สถานะการแก้ไข", "Phase acceptance results, items to fix, fix status"], ["ประกอบการเบิกจ่ายรายงวด", "Evidence for each phase payment"]],
        ["status", ["สถานะโครงการ วันเวลาปรับปรุงล่าสุด", "Project status, time of the last update"], ["ตรวจความเป็นปัจจุบัน", "Check the data is current"]]].map(([d, w, e]) => `<dt>${tx(PRJ_DIM[d][0])}</dt><dd>${tx(w)}<div class="sub">→ ${tx(e)}</div></dd>`).join("")}</dl></section>
  </div>
  <section class="callout"><b>${L("กติกา", "Rules")}:</b> ${L(`เชื่อมด้วยรหัสโครงการเดียว ห้ามใช้รหัส GFMIS เป็นกุญแจ · เจ้าของข้อมูล: ${tx(c.pmShort)} = ความก้าวหน้ากายภาพ/วิศวกรรม, ระบบนี้ = งบ ก่อหนี้ เบิกจ่าย ไม่บันทึกซ้ำสองระบบ · ปลายทางยังไม่พร้อม ระบบพักข้อมูลไว้ไม่สูญหาย`, `Join on the one project id, never on the GFMIS code · data owners: ${c.pmRef[1]} owns physical and engineering progress; this system owns budget, commitment and payment, and nothing is typed in both · if the PM system is not ready, the data waits and is never lost`)}${c.pmNote ? ` · ${esc(tx(c.pmNote[1]))}` : ""}</section>`;
};
BIND["prj-pm"] = () => {
  bindPrj();
  const st = prjState();
  const on = $("#pm-online"); if (on) on.onclick = () => { st.online = !st.online; audit(st.online ? ["ระบบ PM กลับมาพร้อมรับ", "PM system back online"] : ["ระบบ PM ไม่พร้อม เริ่มพักข้อมูล", "PM system offline; buffering"], "IF-08");
    const g = S.integrations.find(x => x.id === "IF-08"); if (g) { g.status = st.online ? "ok" : "error"; g.msg = st.online ? ["สำเร็จ", "Succeeded"] : ["ปลายทางไม่ตอบสนอง · พักข้อมูลในคิว", "No response · buffering"]; }
    save(); renderNav(); route(); };
  const sd = $("#pm-send"); if (sd) sd.onclick = () => {
    const ps = prjList().filter(p => p.pm && prjOut(p).st !== "sent");
    ps.forEach(p => (st.out[p.id] = { h: prjHash(p), t: nowIso(), st: st.online ? "sent" : "queued" }));
    audit(st.online ? ["ส่งข้อมูลโครงการให้ระบบ PM", "Sent project data to the PM system"] : ["พักข้อมูลโครงการในคิว", "Buffered project data"], ps.map(p => p.id).join(", "));
    save(); renderNav(); route(); toast(st.online ? `${L("ส่งแล้ว", "Sent")} ${ps.length} ${L("โครงการ", "projects")}` : L("ปลายทางไม่พร้อม ข้อมูลพักในคิวแล้ว จะส่งเมื่อกลับมา", "PM system offline: held in the buffer until it is back"));
  };
  const rv = $("#pm-recv"); if (rv) rv.onclick = () => {
    const m = prjFeed()[st.feed]; if (!m) return;
    st.inb.push(Object.assign({ id: "PM-" + (st.inb.length + 1), t: nowIso(), applied: null }, m)); st.feed++;
    audit(["รับข้อมูลจากระบบ PM", "Received data from the PM system"], `${m.prj} · ${(PRJ_DIM[m.dim][0])[1]}`);
    notify(["fin"], [`ระบบ PM แจ้ง${(PRJ_DIM[m.dim][0])[0]}: ${m.prj}`, `PM system reported ${(PRJ_DIM[m.dim][0])[1].toLowerCase()}: ${m.prj}`], "prj-pm");
    save(); renderNav(); route();
  };
  $$("[data-pmapply]").forEach(b => (b.onclick = () => { const m = st.inb.find(x => x.id === b.dataset.pmapply); if (!m) return; m.applied = nowIso(); m.by = me().id;
    audit(["รับทราบข้อมูลจากระบบ PM และปรับข้อมูลงบ", "Acknowledged PM data and applied it"], `${m.prj} · ${m.id}`); save(); renderNav(); route(); toast(L("บันทึกแล้ว", "Recorded")); }));
};

// ---------- 5. data sharing ----------
VIEWS["prj-share"] = () => {
  const st = prjState(), cs = prjCfg().consumers, cstat = c => st.cons[c.id] || c.status;
  const canShare = PM_ROLES.includes(ROLE), canApprove = ROLE === "exec";
  const row = c => `<tr><td><b style="font-weight:600">${esc(tx(c.name))}</b><div class="sub">${c.data.map(d => esc(tx(d))).join(" · ")}</div></td><td>${c.kind === "ext" ? tag(L("ภายนอก", "External"), "p-warn") : tag(L("ภายใน", "Internal"), "p-info")}</td><td>${esc(typeof c.mode === "string" ? c.mode : tx(c.mode))}</td>
    <td>${cstat(c) === "active" ? tag(L("ใช้งาน", "Active"), "p-ok") : tag(L("รออนุมัติ", "Waiting for approval"), "p-warn")}${cstat(c) === "pending" && c.ask ? `<div class="sub">${esc(tx(c.ask.why))}</div>` : ""}</td>
    <td>${cstat(c) === "active" ? (canShare ? `<button class="btn" type="button" data-share="${c.id}">${L("ส่งข้อมูลตอนนี้", "Send now")}</button>` : `<span class="sub">${st.log.find(x => x.to === c.id) ? fdate(st.log.find(x => x.to === c.id).t, true) : "–"}</span>`) : canApprove ? `<button class="btn primary" type="button" data-shareok="${c.id}">${L("อนุมัติการส่ง", "Approve")}</button>` : `<span class="sub">${L("รอผู้บริหารอนุมัติ", "Waiting for the executive")}</span>`}</td></tr>`;
  return `${prjHead(L("การแชร์ข้อมูลจากคลังข้อมูลกลาง", "Sharing from the central data warehouse"), L("ข้อมูลอยู่ฐานเดียว ระบบอื่นเรียกใช้ตามสิทธิ์ ไม่ทำสำเนา ทุกการส่งถูกบันทึกและลบไม่ได้", "One copy of the data; others read it by permission, never copy it. Every send is recorded and cannot be deleted."))}
  <section class="panel"><header>${chipIco("send")}<h2>${L("ผู้รับข้อมูล", "Who receives data")}</h2><span class="sp"></span><span class="sub">${L("ข้อมูล GFMIS ล่าสุด", "Latest GFMIS data")}: ${prjAsOf()}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ผู้รับ", "Receiver")}</th><th>${L("ประเภท", "Kind")}</th><th>${L("ช่องทาง", "Channel")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead><tbody>${cs.map(row).join("")}</tbody></table></div>
    ${canApprove && cs.some(c => cstat(c) === "pending") ? `<div class="body"><label for="share-why">${L("เหตุผลการอนุมัติ (บันทึกในทะเบียนการส่ง)", "Reason for approval (kept in the send log)")}</label><textarea id="share-why" rows="2" style="width:100%"></textarea></div>` : ""}</section>
  <div class="grid2">
    <section class="panel"><header>${chipIco("history")}<h2>${L("ทะเบียนการส่งข้อมูล", "Send log")}</h2><span class="sp"></span>${tag(L("ลบไม่ได้", "Cannot be deleted"), "p-mute")}</header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "Time")}</th><th>${L("ผู้รับ", "Receiver")}</th><th class="num">${L("แถว", "Rows")}</th><th>${L("ข้อมูล ณ", "Data as of")}</th><th>${L("ผู้ส่ง / ผู้อนุมัติ", "Sent / approved by")}</th></tr></thead>
        <tbody>${st.log.map(x => { const c = cs.find(y => y.id === x.to); const who = id => (id === "system" ? L("อัตโนมัติ", "Automatic") : id.startsWith("role:") ? tx(ROLES[id.slice(5)]) : esc(tx((S.users.find(u => u.id === id) || { name: [id, id] }).name)));
          return `<tr><td class="sub">${fdate(x.t, true)}</td><td>${c ? esc(tx(c.name)) : esc(x.to)}</td><td class="num">${fmt(x.rows)}</td><td>${fdate(x.asOf, x.asOf.length > 10)}</td><td class="sub">${who(x.by)}${x.ok ? ` / ${who(x.ok)}` : ""}${x.why ? `<div>“${esc(x.why)}”</div>` : ""}</td></tr>`; }).join("")}</tbody></table></div></section>
    <section class="panel"><header>${chipIco("shield")}<h2>${L("หลักการแชร์", "Sharing principles")}</h2></header><ul class="tlist">${[
      ["ข้อมูลอยู่ฐานเดียว ระบบอื่นเรียกใช้ ไม่ทำสำเนา", "One copy; other systems read it and never copy it"],
      ["ส่งตามสิทธิ์และบันทึกร่องรอยทุกครั้ง", "Sent by permission, with a trail every time"],
      ["ส่งภายนอกต้องอนุมัติก่อน และทะเบียนการส่งลบไม่ได้", "External sends need approval first; the send log cannot be deleted"],
      ["คืนข้อมูลให้ทุกหน่วยงานเห็นของตนเอง", "Every unit gets its own data back"],
      ["ทุกรายงานบอกวันเวลาข้อมูล GFMIS ล่าสุด", "Every report states the time of the latest GFMIS data"],
    ].map(t => `<li><span class="prio p-info"></span><div>${tx(t)}</div><span></span></li>`).join("")}</ul></section>
  </div>`;
};
BIND["prj-share"] = () => {
  const st = prjState(), cs = prjCfg().consumers;
  $$("[data-share]").forEach(b => (b.onclick = () => { const c = cs.find(x => x.id === b.dataset.share);
    st.log.unshift({ t: nowIso(), to: c.id, rows: prjList().length * (c.kind === "ext" ? 1 : 12), asOf: prjGfT(), by: me().id, ok: null });
    audit(["ส่งข้อมูลจากคลังข้อมูลกลาง", "Shared data from the warehouse"], (c.name)[1]); save(); route(); toast(`${L("ส่งแล้ว", "Sent")}: ${tx(c.name)}`); }));
  $$("[data-shareok]").forEach(b => (b.onclick = () => { const c = cs.find(x => x.id === b.dataset.shareok), w = $("#share-why"), why = w ? w.value.trim() : "";
    if (why.length < 10) { toastErr(L("ระบุเหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters")); if (w) w.focus(); return; }
    st.cons[c.id] = "active"; st.log.unshift({ t: nowIso(), to: c.id, rows: prjList().length, asOf: prjGfT(), by: `role:${c.ask ? c.ask.by : "plan"}`, ok: me().id, why });
    audit(["อนุมัติการส่งข้อมูลให้หน่วยงานภายนอก", "Approved an external data share"], (c.name)[1]); save(); renderNav(); route(); toast(L("อนุมัติและส่งแล้ว บันทึกในทะเบียนการส่ง", "Approved and sent; recorded in the send log")); }));
};

// ---------- 6. ToR modules and job duties ----------
let PRJ_TORF = "all";
VIEWS["prj-tor"] = () => {
  const c = prjCfg();
  if (!c.modules) return `${prjHead(L("โมดูลและหน้าที่ตาม ToR", "ToR modules and duties"), L("หน่วยงานนี้ยังไม่มีแผนผังโมดูลตามร่างขอบเขตของงาน", "This organization has no ToR module map yet"))}`;
  const TOR = { tor: [["มีใน ToR", "In the ToR"], "p-ok"], ext: [["ต้องขยาย", "To extend"], "p-warn"], new: [["ต้องเพิ่มใหม่", "To add"], "p-bad"] };
  const pageOf = m => c.modules.find(x => x.n === m);
  const live = l => !l.startsWith("sys-");
  const mchip = m => { const x = pageOf(m); return `<span class="pmod ${x.tor}" title="${esc(tx(x.name))}">${m}</span>`; };
  const duties = c.duties.filter(d => PRJ_TORF === "all" || (PRJ_TORF === "gf" ? d.gf : PRJ_TORF === "planned" ? !live(d.page || pageOf(d.mods[0]).page) : String(d.mods[0]) === PRJ_TORF));
  const groups = [...new Set(c.duties.map(d => tx(d.grp)))];
  const nLive = c.duties.filter(d => live(d.page || pageOf(d.mods[0]).page)).length;
  return `${prjHead(L("โมดูลและหน้าที่ตาม JD เทียบร่าง ToR", "Modules and JD duties against the draft ToR"), L(`${c.duties.length} หน้าที่ตามคำบรรยายลักษณะงาน → ${c.modules.length} โมดูล ครบทุกข้อ · แต่ละหน้าที่เปิดไปยังหน้าที่รองรับในต้นแบบนี้`, `${c.duties.length} job-description duties → ${c.modules.length} modules, all covered · each duty opens the page that supports it in this prototype`))}
  <section class="stats">${statCard({ label: L("มีใน ToR", "In the ToR"), value: c.modules.filter(m => m.tor === "tor").length, icon: "check", tone: "ok", sub: L("โมดูล", "modules") })}${statCard({ label: L("ต้องขยาย", "To extend"), value: c.modules.filter(m => m.tor === "ext").length, icon: "sliders", tone: "warn", sub: c.modules.filter(m => m.tor === "ext").map(m => m.n).join(" ") })}${statCard({ label: L("ต้องเพิ่มใหม่", "To add"), value: c.modules.filter(m => m.tor === "new").length, icon: "alert", tone: "bad", sub: c.modules.filter(m => m.tor === "new").map(m => m.n).join(" ") })}${statCard({ label: L("หน้าที่ที่มีหน้าจอในต้นแบบ", "Duties with a working page"), value: `${nLive}/${c.duties.length}`, icon: "layers", tone: "info", sub: L("ที่เหลืออยู่ในระบบที่อยู่ในแผน", "the rest are in planned systems") })}</section>
  <section class="panel"><header>${chipIco("layers")}<h2>${L(`${c.modules.length} โมดูล`, `${c.modules.length} modules`)}</h2><span class="sp"></span><span class="sub">${L("ต้องทบทวนวงเงินและเวลาก่อนปรับ ToR", "Review the budget and timeline before revising the ToR")}</span></header>
    <div class="pmods">${c.modules.map(m => `<div class="pmodc ${m.tor}"><span class="pmod ${m.tor}">${m.n}</span><div><b>${esc(tx(m.name))}</b><div class="sub">${tag(tx(TOR[m.tor][0]), TOR[m.tor][1])} ${m.ref ? `ToR ${esc(m.ref)}` : ""}</div>
      <div class="sub">${pJump(m.page, live(m.page) ? L("เปิดในต้นแบบ", "Open in the prototype") : L("ระบบที่อยู่ในแผน", "Planned system"))} · ${c.duties.filter(d => d.mods.includes(m.n)).length} ${L("หน้าที่", "duties")}</div></div></div>`).join("")}</div></section>
  <section class="panel"><header>${chipIco("list")}<h2>${L("หน้าที่ตาม JD และโมดูลที่รองรับ", "JD duties and their modules")}</h2><span class="sp"></span>
    <div class="filterbar">${[["all", L("ทั้งหมด", "All"), c.duties.length], ["gf", L("◆ ทำใน GFMIS / e-GP", "◆ Done in GFMIS / e-GP"), c.duties.filter(d => d.gf).length], ["planned", L("ในระบบที่อยู่ในแผน", "In planned systems"), c.duties.length - nLive]].map(([k, l, n]) => `<button type="button" class="fchip ${PRJ_TORF === k ? "on" : ""}" data-torf="${k}">${l}<b>${n}</b></button>`).join("")}</div></header>
    ${groups.map(g => { const ds = duties.filter(d => tx(d.grp) === g); return ds.length ? `<div class="ptor-g">${esc(g)}</div><ul class="tlist">${ds.map(d => { const pg = d.page || pageOf(d.mods[0]).page;
      return `<li><span class="prio ${live(pg) ? "p-ok" : "p-mute"}"></span><div style="min-width:0">${pJump(pg, esc(tx(d.name)))}${d.gf ? ` <span class="pgf" title="${L("ทำใน GFMIS / e-GP / ระบบกรมบัญชีกลาง ระบบนี้รับข้อมูลมาควบคุม ติดตาม รายงาน ไม่บันทึกซ้ำ", "Done in GFMIS / e-GP; this system takes the data to control, track and report, never retyped")}">◆</span>` : ""}</div><span class="pmods-i">${d.mods.map(mchip).join("")}</span></li>`; }).join("")}</ul>` : ""; }).join("")}
    <div class="body sub">◆ = ${L("ทำใน GFMIS / e-GP / ระบบกรมบัญชีกลาง ระบบนี้รับข้อมูลมาควบคุม ติดตาม รายงาน ไม่บันทึกซ้ำ", "done in GFMIS / e-GP / the Comptroller General's systems; this system takes the data to control, track and report, never retyped")}</div></section>`;
};
BIND["prj-tor"] = () => { bindPrj(); $$("[data-torf]").forEach(b => (b.onclick = () => { PRJ_TORF = b.dataset.torf; route(); })); };

// ---------- Workspace: approvals and exceptions from the registry ----------
{
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments);
    try {
      const st = prjState();
      if (ROLE === "exec") prjCfg().consumers.filter(c => c.kind === "ext" && (st.cons[c.id] || c.status) === "pending").forEach(c =>
        t.push({ title: `${L("อนุมัติการส่งข้อมูลให้", "Approve a data share with")} ${tx(c.name)}`, sub: c.ask ? tx(c.ask.why) : "", due: (c.ask && c.ask.due) || TODAY, link: "prj-share", cls: "p-warn" }));
      if (PM_APPLY.includes(ROLE)) st.inb.filter(m => !m.applied).forEach(m => t.push({ title: `${L("พิจารณาข้อมูลจากระบบ PM", "Review data from the PM system")}: ${tx(PRJ_DIM[m.dim][0])} · ${m.prj}`, sub: tx(m.text), due: TODAY, link: "prj-pm", cls: "p-info" }));
    } catch (e) { /* no allocation in this organization's data */ }
    return t;
  };
  const ex = exceptionItems;
  exceptionItems = function () {
    const out = ex.apply(this, arguments);
    try {
      const st = prjState(), ps = prjList().filter(p => p.pm);
      ps.filter(p => prjOut(p).st === "queued").forEach(p => out.push({ sev: st.online ? "warn" : "bad", sys: "projects", what: `${p.id} · ${L("ข้อมูลพักในคิว ยังไม่ถึงระบบ PM", "held in the buffer, not yet in the PM system")}`, sub: tx(p.name), since: (st.out[p.id].t || TODAY).slice(0, 10), link: "prj-pm", owner: "plan" }));
      ps.filter(p => prjOut(p).st === "changed").forEach(p => out.push({ sev: "warn", sys: "projects", what: `${p.id} · ${L("ข้อมูลงบเปลี่ยน ยังไม่ส่งให้ระบบ PM", "budget data changed, not yet sent to the PM system")}`, sub: tx(p.name), since: TODAY, link: "prj-pm", owner: "plan" }));
      ps.forEach(p => { const i = prjPmIn(p); if (i && i.stale) out.push({ sev: "warn", sys: "projects", what: `${p.id} · ${L("ข้อมูลความก้าวหน้าไม่เป็นปัจจุบัน", "progress data is not current")}`, sub: `${L("ปรับปรุงล่าสุด", "Last updated")} ${fdate(i.last.slice(0, 10))}`, since: i.last.slice(0, 10), link: "prj:" + p.id, owner: "fin" }); });
    } catch (e) { /* no allocation in this organization's data */ }
    return out.sort((a, b) => (a.sev === b.sev ? (a.since < b.since ? -1 : 1) : a.sev === "bad" ? -1 : 1));
  };
}

// ---------- the presenter: the project cycle end to end ----------
DEMO.push(
  { t: "N-01", part: "na", role: "plan", link: "prj-cycle", title: ["วงจรงบประมาณ 8 ขั้นด้วยรหัสโครงการเดียว", "The 8-step cycle on one project id"],
    say: ["ทุกโครงการมีรหัสเดียวตั้งแต่ตั้งคำขอถึงเงินกัน ตัวเลขทุกขั้นอ่านจากระบบงบประมาณ จัดซื้อ และการเงินที่ใช้งานจริง ไม่มีใครพิมพ์ซ้ำ", "Every project keeps one id from request to carry-over. Each step's figures come from the live Budget, Procurement and Finance records; nobody retypes them."],
    do: ["กดขั้น 5 ก่อหนี้ผูกพัน → เห็นโครงการที่ลงนามสัญญาแล้ว", "Press step 5, Commitment → the signed contracts show"] },
  { t: "N-02", part: "na", role: "fin", link: "prj-project", title: ["โครงการ 360°: จากคำขอถึงการเบิกจ่าย", "Project 360°: from request to payment"],
    say: ["หน้าเดียวเห็นทั้งเส้นทาง: บรรทัดงบ งวดเงิน e-GP สัญญา ตรวจรับ จ่ายเงิน และสอบทาน GFMIS พร้อมสิ่งที่ส่งและรับกับระบบบริหารโครงการ", "One page shows the whole path: budget line, allotment, e-GP, contract, acceptance, payment and the GFMIS check, plus what goes to and comes from the project management system."],
    do: ["ชี้ 12 รายการที่ส่ง และ 4 มิติที่รับกลับ", "Point at the 12 items sent and the 4 dimensions received"] },
  { t: "N-03", part: "na", role: "plan", link: "prj-pm", title: ["แลกเปลี่ยนสองทางกับระบบบริหารโครงการ", "Two-way exchange with the project system"],
    say: ["ระบบนี้กำหนดมาตรฐานการเชื่อมต่อ ปลายทางล่มข้อมูลไม่หาย พักในคิวแล้วส่งตามลำดับ", "This system sets the interface. If the other side is down, nothing is lost: it waits in the buffer and goes out in order."],
    do: ["กดจำลองปลายทางล่ม → ส่งที่ค้าง → กลับมาแล้ว → ส่งอีกครั้ง → รับข้อมูลจากปลายทาง", "Simulate an outage → send → bring it back → send again → receive from the PM system"] },
  { t: "N-04", part: "na", role: "exec", link: "prj-share", title: ["แชร์ข้อมูลตามสิทธิ์ ส่งภายนอกต้องอนุมัติ", "Share by permission; external sends need approval"],
    say: ["ข้อมูลอยู่ฐานเดียว ทุกการส่งบันทึกและลบไม่ได้ ผู้บริหารอนุมัติการส่งให้หน่วยงานภายนอกพร้อมเหตุผล", "One copy of the data; every send is logged and cannot be deleted. The executive approves an external send with a reason."],
    do: ["พิมพ์เหตุผล → อนุมัติการส่ง → ดูทะเบียนการส่ง", "Type a reason → approve → see the send log"] },
  { t: "N-05", part: "na", role: "plan", link: "prj-tor", title: ["ทุกหน้าที่ตาม JD มีโมดูลรองรับ", "Every JD duty has a module"],
    say: ["ทุกหน้าที่ตามคำบรรยายลักษณะงานผูกกับโมดูลตามร่าง ToR และเปิดไปยังหน้าที่รองรับในต้นแบบได้ทันที", "Every job-description duty maps to a ToR module and opens the page that supports it."],
    do: ["กรอง ◆ ทำใน GFMIS → เปิดหน้าที่ด้านการเบิกจ่าย", "Filter ◆ GFMIS → open a payment duty"], when: () => !!prjCfg().modules },
);
PRES_ROUTES.splice(1, 0, ["na", ["วงจรโครงการ 8 ขั้น", "Project cycle · 8 steps"]]);
// a step whose tenant has nothing to show (no ToR map) drops out of the presenter
{ const ps = presSteps; presSteps = rt => ps(rt).filter(i => !DEMO[i].when || DEMO[i].when()); }
