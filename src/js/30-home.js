// My Workspace: what this role needs to do next, upcoming budget-calendar deadlines, notifications.
let CUR_REQ = null;
function openReq(id) { if (id !== CUR_REQ) { REQ_TAB = "main"; VER_A = VER_B = null; } CUR_REQ = id; go("request"); }
const cal = id => S.calendar.find(c => c.id === id) || { date: TODAY };
// Deep links used by tasks, the demo guide and notifications: "req:<id>", "<area>-<tab>" or a plain route.
const JUMP_TABS = {
  mon: ["dashboard", v => (MON_TAB = v)], alloc: ["allocation", v => (ALLOC_TAB = v)], rev: ["review", v => (REV_TAB = v)],
  perf: ["performance", v => (PERF_TAB = v)], sub: ["submission", v => (SUB_TAB = v)], cons: ["consolidation", v => (CONS_TAB = v)],
  intel: ["assistant", v => (INTEL_TAB = v)], strat: ["strategy", v => (STRAT_TAB = v)],
  prc: ["procurement", v => (PROC_TAB = v)], fnc: ["finance", v => (FIN_TAB = v)],
};
function jump(l) {
  if (l.startsWith("req:")) return openReq(l.slice(4));
  const [area, tab] = l.split("-");
  if (JUMP_TABS[area] && tab) { JUMP_TABS[area][1](tab); return go(JUMP_TABS[area][0]); }
  go(l);
}

function myTasks() {
  const t = [], u = me();
  const R = (title, sub, due, link, cls) => t.push({ title, sub, due, link, cls });
  if (ROLE === "div") {
    S.requests.filter(r => r.unit === u.unit && (r.status === "draft" || r.status === "returned")).forEach(r =>
      R(`${r.status === "returned" ? L("แก้ไขและส่งใหม่", "Fix and resubmit") : L("จัดทำและส่ง", "Complete and submit")}: ${tx(r.name)}`, `${r.id} · ${mb(r.amount)} ${L("ล้านบาท", "M baht")}`, cal("c2").date, `req:${r.id}`, r.status === "returned" ? "p-bad" : "p-info"));
    const noRep = S.dash.projects.filter(p => p.unit === u.unit && !S.progress[p.id]);
    if (noRep.length) R(L("ส่งรายงานความก้าวหน้าประจำเดือน", "Send this month's progress report"), `${noRep.length} ${L("โครงการ", "projects")}`, "2026-10-20", "mon-progress", "p-warn");
    const myK = allKpis().filter(x => x.k.owner === u.unit && S.perf.kpis[x.k.id] && S.perf.kpis[x.k.id].result == null);
    if (myK.length) R(L("บันทึกผลตัวชี้วัดกลางปี", "Enter mid-year KPI results"), myK.map(x => x.k.id).join(", "), "2026-10-31", "perf-kpis", "p-info");
    if (!t.length) R(L("ไม่มีงานค้าง", "Nothing waiting for you"), "", cal("c2").date, "requests", "p-mute");
  }
  if (ROLE === "plan") {
    S.requests.filter(r => r.status === "plan").forEach(r => R(`${L("กลั่นกรองคำขอ", "Review request")}: ${tx(r.name)}`, `${r.id} · ${unitName(r.unit)}`, cal("c3").date, `req:${r.id}`, "p-info"));
    const dup = S.dupes.filter(d => !d.done).length;
    if (dup) R(L(`ยืนยันรายการที่อาจซ้ำซ้อน ${dup} รายการ`, `Confirm ${dup} possible duplicates`), L("ตรวจพบโดย AI", "Found by AI"), cal("c3").date, "consolidation", "p-warn");
    R(L("เสนอวงเงินรอบที่ 2", "Propose round 2 amounts"), `${S.review.length} ${L("โครงการ", "projects")}`, cal("c3").date, "rev-rounds", "p-info");
    const sb = S.submission;
    if (sb.status === "preparing") R(L("เตรียมชุดคำขอส่งสำนักงบประมาณ", "Prepare the Budget Bureau package"), `${pkg().length} ${L("คำขอผ่านการเห็นชอบแล้ว", "requests approved so far")}`, cal("c6").date, "sub-checks", "p-info");
    if (sb.revisions.some(v => !v.closed)) R(L("ตอบคำขอปรับปรุงจากสำนักงบประมาณ", "Answer the Budget Bureau's revision requests"), "", sb.revisions.find(v => !v.closed).due, "sub-status", "p-bad");
    const noK = allKpis().filter(x => S.perf.kpis[x.k.id] && S.perf.kpis[x.k.id].result == null).length;
    if (noK) R(L("ติดตามผลตัวชี้วัดที่ยังไม่รายงาน", "Chase KPI results not yet reported"), `${noK} ${L("ตัวชี้วัด", "KPIs")}`, "2026-10-31", "perf-kpis", "p-warn");
    if (!S.perf.report || !S.perf.report.sent) R(L("จัดทำรายงานประเมินผลกลางปี", "Prepare the mid-year evaluation report"), "", "2026-11-15", "perf-report", "p-info");
  }
  if (ROLE === "exec") {
    S.requests.filter(r => r.status === "committee").forEach(r => R(`${L("พิจารณาในคณะกรรมการ", "Committee decision")}: ${tx(r.name)}`, `${r.id} · ${mb(r.amount)} ${L("ล้านบาท", "M baht")}`, cal("c4").date, "rev-meetings", "p-warn"));
    R(L("เห็นชอบวงเงินรอบที่ 3", "Approve round 3 amounts"), `${S.review.length} ${L("โครงการ", "projects")}`, cal("c5").date, "rev-rounds", "p-info");
    const trs = Object.values(S.allocs).flatMap(A => A.transfers.filter(x => x.status === "pending").map(x => ({ x, A })));
    trs.filter(({ x, A }) => { const a = A.lines.find(l => l.id === x.from), b = A.lines.find(l => l.id === x.to); return a.type !== b.type || a.unit !== b.unit; })
      .forEach(({ x }) => R(`${L("อนุมัติการโอนเปลี่ยนแปลง", "Approve budget transfer")} ${x.id}`, `${mb(x.amount)} ${L("ลบ.", "M")} · ${tx(x.why)}`, TODAY, "alloc-transfers", "p-warn"));
    R(L("ติดตามหน่วยงานที่เบิกจ่ายต่ำกว่าแผน", "Follow up units behind their spending plan"), "", TODAY, "mon-alerts", "p-bad");
    if (S.perf.report && S.perf.report.sent) R(L("อ่านรายงานประเมินผลกลางปี", "Read the mid-year evaluation report"), "", TODAY, "perf-report", "p-info");
  }
  // Round 8: project bank, plan revisions and ceiling responses.
  const ideas = S.ideas || [], resp = S.cons.resp || {};
  if (ROLE === "plan") {
    const nIdea = ideas.filter(i => i.status === "proposed").length;
    if (nIdea) R(L("กลั่นกรองแนวคิดโครงการในคลังโครงการ", "Screen project ideas in the project bank"), `${nIdea} ${L("แนวคิด", "ideas")}`, cal("c2").date, "strat-bank", "p-info");
    Object.keys(resp).filter(u => resp[u].st === "appeal").forEach(u => R(`${L("พิจารณาคำขอทบทวนกรอบวงเงิน", "Decide a ceiling appeal")}: ${unitName(u)}`, `${fmt(resp[u].amt, 1)} ${L("ลบ.", "M")} · ${tx(resp[u].why)}`, TODAY, "cons-responses", "p-warn"));
  }
  if (ROLE === "exec") (S.planRevs || []).filter(v => v.status === "pending").forEach(v => R(`${L("อนุมัติการทบทวนค่าเป้าหมาย", "Approve a target revision")} ${v.id}`, `${v.kpi} ${PLAN_YEARS[v.y]}: ${v.from} → ${v.to}`, TODAY, "strat-revise", "p-warn"));
  if (ROLE === "div") {
    const u = me().unit;
    if (resp[u] && resp[u].st === "pending") R(L("ตอบรับกรอบวงเงินของหน่วยงาน", "Reply to your unit ceiling"), `${fmt(S.cons.unitCeil[u], 1)} ${L("ล้านบาท", "M baht")}`, cal("c2").date, "requests", "p-warn");
    ideas.filter(i => i.unit === u && i.status === "accepted").forEach(i => R(`${L("จัดทำคำขอจากแนวคิดที่รับเข้าแผน", "Prepare a request from an accepted idea")} ${i.id}`, tx(i.name), cal("c2").date, "strat-bank", "p-info"));
  }
  // Round 9: hearings, parliament appeals, releases and carry-over.
  const H = S.hearings || [], C = S.carry || { prev: [], reqs: [] };
  if (ROLE === "div") H.filter(h => h.unit === me().unit && !["held", "cancelled"].includes(h.status) && openQs(h).length).forEach(h => R(`${L("ตอบคำถามการชี้แจงงบประมาณ", "Answer budget hearing questions")} ${h.id}`, `${openQs(h).length} ${L("ข้อ", "questions")} · ${L("ประชุม", "hearing")} ${fdate(h.date)}`, h.date, "requests", "p-warn"));
  if (ROLE === "plan") {
    const toCheck = H.flatMap(h => h.qs).filter(q => q.ans && q.ok == null).length;
    if (toCheck) R(L("ตรวจคำชี้แจงของหน่วยงาน", "Check units' hearing answers"), `${toCheck} ${L("ข้อ", "answers")}`, TODAY, "rev-hearings", "p-info");
    if (S.parl && S.parl.stage === 3) R(L("ยื่นแปรญัตติขอคืนงบประมาณที่ถูกปรับลด", "File appeals to restore cuts"), Object.keys(S.parl.cuts).join(", "), PARL_STEPS[3][1], "sub-parliament", "p-warn");
  }
  if (ROLE === "fin") {
    C.prev.filter(c => c.status === "open" && c.paid / c.amount < 0.5).forEach(c => R(`${L("เร่งเบิกจ่ายหรือขอขยายเวลาเงินกัน", "Speed up or extend carried funds")} ${c.id}`, `${L("เบิกแล้ว", "Paid")} ${fmt(c.paid / c.amount * 100, 0)}%`, c.due, "alloc-carry", "p-warn"));
    const A70 = S.allocs[CUR_FY];
    if (A70 && A70.releases && !A70.releases.some(r => r.q === 2 && r.type === "inv")) R(L("ขออนุมัติงวดเงินไตรมาส 2 งบลงทุน", "Request the Q2 investment release"), "", "2026-12-15", "alloc-releases", "p-info");
  }
  if (ROLE === "exec") [...C.prev.filter(c => c.status === "extension"), ...C.reqs.filter(c => c.status === "pending")].forEach(c => R(`${L("อนุมัติเรื่องเงินกันเหลื่อมปี", "Decide a carry-over")} ${c.id}`, mb(c.amount) + " " + L("ลบ.", "M"), TODAY, "alloc-carry", "p-warn"));
  // Round 10: anomalies, evaluations, procurement slippage.
  if (ROLE === "audit") (S.anoms || []).filter(a => a.status === "new").forEach(a => R(`${L("ตรวจรายการผิดปกติ", "Review an anomaly")} ${a.id}: ${tx(AN_KIND[a.kind])}`, `${unitName(a.unit)} · ${L("ความเสี่ยง", "risk")} ${a.risk}`, TODAY, "intel-anoms", a.risk >= 70 ? "p-bad" : "p-warn"));
  if (ROLE === "plan") (S.evals || []).filter(e => e.status === "draft").forEach(e => R(`${L("ประเมินโครงการให้เสร็จ", "Finish a project evaluation")} ${e.id}`, tx((evProj(e) || { name: "" }).name), "2026-11-30", "perf-evaluate", "p-info"));
  if (ROLE === "fin" && S.proc) { const late = Object.values(S.proc).filter(ms => procState(ms).lv !== "ok").length; if (late) R(L("ติดตามโครงการลงทุนที่จัดซื้อจัดจ้างล่าช้า", "Chase investment projects behind on procurement"), `${late} ${L("โครงการ", "projects")}`, TODAY, "mon-procure", "p-warn"); }
  famTasks(R);
  if (isProcRole() && !t.length) R(L("ไม่มีงานค้าง", "Nothing waiting for you"), "", TODAY, "procurement", "p-mute");
  // Delegated work (round 7): cross-unit transfers this user may approve on an executive's behalf.
  const dg = ROLE !== "exec" && delegFor("exec", "transfer");
  if (dg) Object.values(S.allocs).forEach(A => A.transfers.filter(x => x.status === "pending").forEach(x => { const a = A.lines.find(l => l.id === x.from), b = A.lines.find(l => l.id === x.to);
    if (a.type !== b.type || a.unit !== b.unit) R(`${L("อนุมัติการโอนเปลี่ยนแปลงแทนผู้บริหาร", "Approve budget transfer for the executive")} ${x.id}`, `${mb(x.amount)} ${L("ลบ.", "M")} · ${L("ตามหนังสือมอบอำนาจ", "under delegation")} ${dg.id}`, dg.end, "alloc-transfers", "p-warn"); }));
  if (ROLE === "fin") {
    const open = S.gfmis.filter(g => !g.ok).length;
    if (open) R(L("กระทบยอดผลเบิกจ่ายกับ GFMIS", "Reconcile disbursement with GFMIS"), `${open} ${L("รายการไม่ตรง", "rows differ")}`, TODAY, "mon-import", "p-warn");
    S.integrations.filter(i => i.status === "error").forEach(i => R(`${L("ตรวจสอบการเชื่อมต่อ", "Check integration")} ${i.id} · ${i.sys}`, tx(i.msg), TODAY, "admin-integrations", "p-bad"));
    Object.values(S.allocs).forEach(A => A.transfers.filter(x => x.status === "pending").forEach(x => { const a = A.lines.find(l => l.id === x.from), b = A.lines.find(l => l.id === x.to);
      if (a.type === b.type && a.unit === b.unit) R(`${L("อนุมัติการโอนภายในหน่วยงาน", "Approve in-unit transfer")} ${x.id}`, `${mb(x.amount)} ${L("ลบ.", "M")}`, TODAY, "alloc-transfers", "p-warn"); }));
    if (S.submission.status === "closed" && !S.allocs[FORM_FY]) R(L(`สร้างร่างการจัดสรรปี ${FORM_FY} จากผลพิจารณา`, `Create the FY${FORM_FY} draft allocation`), "", TODAY, "alloc-appropriation", "p-info");
    R(L("ทบทวนแผนการใช้จ่ายรายเดือน", "Review the monthly spending plan"), fyLabel(CUR_FY), TODAY, "alloc-plan", "p-mute");
  }
  if (ROLE === "audit") {
    R(L("ตรวจประวัติการปรับวงเงินระหว่างพิจารณา", "Check amount changes made in review"), `${S.log.length} ${L("เวอร์ชัน", "versions")}`, TODAY, "review", "p-info");
    R(L("ทบทวนบันทึกการใช้งานระบบ", "Review the audit log"), `${S.audit.length} ${L("รายการ", "entries")}`, TODAY, "admin-audit", "p-mute");
  }
  if (ROLE === "admin") {
    S.users.filter(x => !x.mfa).forEach(x => R(`${L("เปิด MFA ให้ผู้ใช้", "Turn on MFA for")} ${tx(x.name)}`, unitName(x.unit), TODAY, "admin-users", "p-bad"));
    S.integrations.filter(i => i.status === "error").forEach(i => R(`${L("แก้ไขการเชื่อมต่อ", "Fix integration")} ${i.id} · ${i.sys}`, tx(i.msg), TODAY, "admin-integrations", "p-bad"));
    R(L(`เตรียมโครงสร้างงบประมาณปี ${FORM_FY + 1}`, `Prepare the FY${FORM_FY + 1} budget structure`), "", `${FORM_FY - 544}-06-30`, "admin-structure", "p-warn");
  }
  return t;
}

function dueText(iso) {
  const d = daysUntil(iso);
  if (d < 0) return `<span class="due" style="color:var(--bad)">${L("เลยกำหนด", "Overdue")} ${-d} ${L("วัน", "d")}</span>`;
  if (d === 0) return `<span class="due" style="color:var(--warn)">${L("วันนี้", "Today")}</span>`;
  return `<span class="due sub">${fdate(iso)} · ${L("อีก", "in")} ${d} ${L("วัน", "days")}</span>`;
}

VIEWS.home = () => {
  const u = me(), tasks = myTasks(), story = S.requests.find(r => r.id === S.story);
  const next = S.calendar.filter(c => c.date >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1));
  return `
  <section class="welcome">
    <div><h1>${L("สวัสดี", "Hello")} ${esc(tx(u.name))}</h1><p>${tx(ROLES[ROLE])} · ${unitName(u.unit)} · ${fdate(TODAY)}</p></div>
    <div class="sp"></div>
    <div class="stat"><b>${tasks.length}</b><span>${L("งานที่ต้องทำ", "tasks to do")}</span></div>
    <div class="stat"><b>${next.length ? daysUntil(next[0].date) : "-"}</b><span>${L("วันถึงกำหนดถัดไป", "days to next deadline")}</span></div>
  </section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("งานของฉัน", "My tasks")}</h2><span class="sp"></span><span class="sub">${tx(ROLES[ROLE])}</span></header>
      <ul class="tasks">${tasks.map(k => `<li><span class="pill ${k.cls}" style="padding:2px 8px"></span>
        <div>${appChip(k.link)}<a href="#" data-link="${k.link}">${esc(k.title)}</a>${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ""}</div>${dueText(k.due)}</li>`).join("")}</ul></section>
    <section class="panel"><header><h2>${L(`ปฏิทินงบประมาณ ปี ${FORM_FY}`, `FY${FORM_FY} budget calendar`)}</h2><span class="sp"></span><span class="pill p-warn">${L("ตัวอย่าง", "Sample")}</span></header>
      <ul class="tasks">${next.slice(0, 5).map(c => `<li><span class="pill ${c.role === ROLE ? "p-ok" : "p-mute"}" style="padding:2px 8px"></span>
        <div><b style="font-weight:600">${tx(c.name)}</b><div class="sub">${tx(ROLES[c.role])}</div></div>${dueText(c.date)}</li>`).join("")}</ul></section>
  </div>
  <div class="grid2">
    <section class="panel"><header><h2>${L("โครงการตัวอย่างตลอดวงจร", "Storyline project")}</h2><span class="sp"></span>${story ? pill(story.status) : ""}</header>
      ${story ? `<div class="body" style="display:flex;flex-direction:column;gap:10px">
        <div><b style="font-size:17px">${tx(story.name)}</b><div class="sub"><span class="mono">${story.id}</span> · ${unitName(story.unit)}</div></div>
        <div class="row"><span>${L("วงเงินที่ขอ", "Requested")} <b class="num">${mb(story.amount)}</b> ${L("ล้านบาท", "M baht")}</span><span class="sub">·</span><span>${tx(story.kpi)}</span></div>
        <div class="sub">${L("ติดตามโครงการนี้ได้ตั้งแต่แผนยุทธศาสตร์ (M01) จนถึงผลสัมฤทธิ์ (M08) ในทุกรอบของต้นแบบ", "Follow this project from strategy (M01) to results (M08) across every round of the prototype.")}</div>
        <div><button class="btn primary" type="button" onclick="openReq('${story.id}')">${L("เปิดคำขอ", "Open request")}</button></div></div>` : ""}</section>
    <section class="panel"><header><h2>${L("การแจ้งเตือนล่าสุด", "Latest notifications")}</h2><span class="sp"></span>
      <button class="btn ghost" type="button" onclick="event.stopPropagation();toggleNotes(true)">${L("ดูทั้งหมด", "See all")}</button></header>
      <ul class="tasks">${myNotes().slice(0, 4).map(n => `<li><span class="pill ${n.read.includes(ROLE) ? "p-mute" : "p-ok"}" style="padding:2px 8px"></span>
        <div><a href="#" data-note="${n.id}">${esc(tx(n.text))}</a></div><span class="due sub">${fdate(n.t)}</span></li>`).join("") || `<li><span></span><span class="sub">${L("ไม่มีการแจ้งเตือน", "No notifications")}</span><span></span></li>`}</ul></section>
  </div>`;
};
BIND.home = () => {
  $$("[data-link]").forEach(a => a.onclick = e => {
    e.preventDefault();
    jump(a.dataset.link);
  });
  $$("[data-note]").forEach(a => a.onclick = e => {
    e.preventDefault();
    const n = S.notes.find(x => x.id === a.dataset.note);
    if (!n.read.includes(ROLE)) n.read.push(ROLE);
    commit();
    if (n.link) jump(n.link); else route();
  });
};
