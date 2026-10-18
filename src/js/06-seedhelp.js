// Builds an organization's starting state from its config, adding the notifications
// and audit history a demo should open with.
// Typical monthly disbursement shape (Oct..Sep) by budget type; investment is back-loaded.
function monthShape(type) {
  if (type === "inv") return [0, 0, 0, 0.05, 0.05, 0.1, 0.1, 0.15, 0.15, 0.15, 0.15, 0.1];
  if (type === "per") return Array(12).fill(1 / 12);
  return [0.06, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.08];
}
const reqAmount = r => r.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

function buildOrg(cfg) {
  const s = Object.assign(sharedSeed(), cfg);
  const R = id => s.requests.find(r => r.id === id);
  const returned = s.requests.find(r => r.status === "returned");
  const inPlan = s.requests.filter(r => r.status === "plan");
  const worst = s.dash.units.slice().sort((a, b) => a.actual / a.plan - b.actual / b.plan)[0];
  const noMfa = s.users.find(u => !u.mfa);
  const story = R(s.story);
  const wn = s.units.find(u => u.id === worst.unit).name;
  const gap = Math.round((1 - worst.actual / worst.plan) * 100);
  const N = (to, text, link, t) => ({ id: "s" + Math.random().toString(36).slice(2, 9), t, to, text, link, read: [] });
  s.notes = [
    N(["div"], [`คำขอ ${returned.id} ถูกส่งกลับแก้ไข: ขอใบเสนอราคาอ้างอิง 3 ราย`, `Request ${returned.id} was returned: attach 3 reference quotations`], "requests", "2026-10-11T15:20"),
    N(["div"], [`เหลือ ${daysUntil("2026-11-30")} วันถึงกำหนดส่งคำขอให้กองแผนงาน`, `${daysUntil("2026-11-30")} days left to submit requests to Planning`], "requests", "2026-10-16T08:00"),
    N(["plan"], [`มีคำขอ ${inPlan.length} รายการรอกลั่นกรอง`, `${inPlan.length} requests are waiting for your review`], "requests", "2026-10-14T10:05"),
    N(["plan", "exec"], ["AI ตรวจพบรายการที่อาจซ้ำซ้อน " + s.dupes.length + " รายการในคำขอระดับกรม", "AI found " + s.dupes.length + " possible duplicates in the department-level requests"], "consolidation", "2026-10-15T09:30"),
    N(["exec", "plan"], [`${wn[0]} เบิกจ่ายต่ำกว่าแผน ${gap}%`, `${wn[1]} is ${gap}% behind its spending plan`], "dashboard", "2026-10-15T07:45"),
    N(["exec"], ["วงเงินรอบที่ 3 รอผู้บริหารพิจารณา " + s.review.length + " โครงการ", s.review.length + " projects are waiting for your round 3 decision"], "review", "2026-10-15T16:20"),
    N(["fin"], ["นำเข้าข้อมูลเบิกจ่าย (IF-02) มียอดไม่ตรง 3 รายการ", "Disbursement import (IF-02) has 3 rows that do not reconcile"], "admin", "2026-10-15T06:05"),
    N(["audit"], ["มีการปรับวงเงินระหว่างพิจารณา 3 ครั้งในสัปดาห์นี้", "3 budget amounts were changed during review this week"], "review", "2026-10-15T17:00"),
    N(["admin"], [`ผู้ใช้ ${noMfa.name[0]} ยังไม่เปิดการยืนยันตัวตนสองชั้น`, `${noMfa.name[1]} has not turned on two-factor sign-in`], "admin", "2026-10-16T08:10"),
    N(["admin", "fin"], ["การเชื่อมต่อ e-GP (IF-04) ล้มเหลว: หมดเวลาเชื่อมต่อ", "e-GP connection (IF-04) failed: timed out"], "admin", "2026-10-14T22:01"),
  ];
  const by = role => s.users.find(u => u.role === role && u.primary).id;
  s.audit = [
    ...s.log.map(l => ({ t: l.t, user: by(l.role), role: l.role, action: ["ปรับวงเงินระหว่างพิจารณา", "Changed a budget amount in review"], target: tx(l.text) })),
    { t: "2026-10-14T10:02", user: by("div"), role: "div", action: ["ส่งคำขอให้กองแผนงาน", "Submitted a request to Planning"], target: inPlan[0].id },
    { t: "2026-10-11T15:18", user: by("plan"), role: "plan", action: ["ส่งคำขอกลับแก้ไข", "Returned a request for revision"], target: returned.id },
    { t: "2026-10-10T09:00", user: by("admin"), role: "admin", action: ["แก้ไขกฎ BR-04 เกณฑ์ 25% เป็น 20%", "Changed rule BR-04 threshold from 25% to 20%"], target: "BR-04" },
    { t: "2026-10-01T08:00", user: by("admin"), role: "admin", action: ["เปิดปีงบประมาณ 2571 รับคำขอ", "Opened FY2571 for requests"], target: "FY2571" },
    { t: "2026-10-16T08:31", user: story ? by("div") : by("plan"), role: "div", action: ["บันทึกร่างคำขอ", "Saved a request draft"], target: s.story },
  ].sort((a, b) => (a.t < b.t ? 1 : -1));
  s.requests.forEach(r => (r.amount = reqAmount(r)));

  // round 2: equipment detail fields, version history, per-unit ceilings
  const clone = o => JSON.parse(JSON.stringify(o));
  s.requests.forEach(r => {
    r.items.forEach(it => { if (it.type === "inv" && !it.detail) it.detail = { kind: "new", qtyOld: 0, age: 0, spec: "" }; });
    if (!r.versions) {
      const owner = s.users.find(u => u.unit === r.unit) || s.users.find(u => u.role === "div");
      const hist = (r.history || []).map((h, i) => ({ v: i + 1, t: h.t, by: owner.id, note: h.note, items: h.items(clone(r.items)) }));
      hist.push({ v: hist.length + 1, t: r.updated + "T09:00", by: owner.id, note: hist.length ? ["ปรับรายการตามความเห็นผู้อำนวยการสำนัก", "Updated after the bureau director's comments"] : ["สร้างคำขอ", "Created the request"], items: clone(r.items) });
      hist.forEach(h => (h.amount = reqAmount(h)));
      r.versions = hist;
      delete r.history;
    }
  });
  // round 3: reviewer comments live on each request
  s.requests.forEach(r => {
    r.comments = ((s.comments || {})[r.id] || []).map((c, i) => Object.assign({ id: `${r.id}-c${i + 1}`, resolved: false }, c));
  });
  delete s.comments;
  const sum = a => a.reduce((x, y) => x + y, 0), total = sum(s.cons.units.map(u => sum(u.v)));
  s.cons.unitCeil = {};
  s.cons.units.forEach(u => (s.cons.unitCeil[u.unit] = Math.round(sum(u.v) * s.cons.ceiling / total * 10) / 10));

  // round 4: allocation lines with a monthly spending plan, transfers, project-level monitoring
  const A = s.alloc;
  A.lines = A.lines.map(([unit, name, type, amount, act], i) => ({ id: "L" + (i + 1), unit, name, type, amount, act, plan: monthShape(type).map(f => Math.round(amount * f)) }));
  A.lines.forEach(l => { const d = l.amount - sum(l.plan); l.plan[11] += d; });
  A.byType = {}; BUDGET_TYPES.forEach(t => (A.byType[t.id] = sum(A.lines.filter(l => l.type === t.id).map(l => l.amount))));
  A.byType.ope += A.total - sum(A.lines.map(l => l.amount)); // unallocated reserve sits in operating
  A.transfers = A.transfers.map((t, i) => Object.assign({ id: "TR-2570-" + String(i + 1).padStart(3, "0"), by: s.users.find(u => u.role === "fin").id }, t, { from: A.lines[t.from].id, to: A.lines[t.to].id }));
  s.allocs = { 2570: A };
  delete s.alloc;
  s.dash.projects = [];
  s.dash.units.forEach(u => {
    const ps = (s.dashProj || {})[u.unit] || [[["งานประจำ", "Routine work"], "ope", 1]];
    const raw = ps.map(p => p[2] * (p[1] === "inv" ? 0.8 : p[1] === "per" ? 1 : 1.15)), rs = sum(raw);
    ps.forEach((p, i) => s.dash.projects.push({ id: `${u.unit}-P${i + 1}`, unit: u.unit, name: p[0], type: p[1], alloc: u.alloc * p[2], plan: u.plan * p[2], actual: u.actual * raw[i] / rs }));
  });
  delete s.dashProj;
  s.progress = {};
  s.dash.projects.filter(p => p.actual / p.plan < 0.75 && p.unit !== s.users.find(u => u.role === "div" && u.primary).unit).forEach(p => {
    s.progress[p.id] = { pct: Math.round(p.actual / p.alloc * 100), status: "risk", issue: ["ยังไม่ลงนามสัญญา รอผลการเสนอราคา", "Contract not signed yet, awaiting bid results"], next: Math.round(p.plan * 0.1 * 10) / 10, t: "2026-05-05T10:00", by: s.users.find(u => u.unit === p.unit) ? s.users.find(u => u.unit === p.unit).id : "u1" };
  });
  s.gfmis = s.gfmis.map((g, i) => Object.assign({ id: "G" + (i + 1) }, g));
  s.acks = [];

  // round 5: mid-year KPI results and project outputs, AI activity log
  const pk = {}; Object.keys(s.perf.kpis).forEach(k => { const [target, result] = s.perf.kpis[k]; pk[k] = { target, result, t: result == null ? "" : "2026-05-08T10:00" }; });
  s.perf.kpis = pk;
  const po = {}; Object.keys(s.perf.outputs).forEach(id => { const [name, unit, target, result, kpi] = s.perf.outputs[id]; po[id] = { name, unit, target, result, kpi }; });
  s.perf.outputs = po;
  s.perf.report = null;
  const U = role => s.users.find(u => u.role === role && u.primary).id;
  s.aiLog = [
    { t: "2026-10-16T08:40", agent: "AG-01", user: U("div"), action: ["ร่างเหตุผลความจำเป็น", "Drafted a justification"], target: s.story, sources: 3, ok: true },
    { t: "2026-10-15T07:45", agent: "AG-05", user: "system", action: ["ตรวจพบหน่วยงานเบิกจ่ายต่ำกว่าแผน", "Flagged units behind plan"], target: "M07", sources: 2, ok: true },
    { t: "2026-10-15T09:30", agent: "AG-02", user: "system", action: ["ตรวจพบรายการที่อาจซ้ำซ้อน", "Flagged possible duplicates"], target: "M03", sources: 4, ok: true },
    { t: "2026-10-14T16:05", agent: "AG-06", user: U("exec"), action: ["ตอบคำถามผู้บริหาร", "Answered an executive question"], target: "M09", sources: 2, ok: true },
    { t: "2026-10-14T16:07", agent: "AG-06", user: U("div"), action: ["ปฏิเสธคำถามที่เกินสิทธิ์ข้อมูล", "Declined a question beyond data permissions"], target: "M09", sources: 0, ok: false },
  ];

  // round 7: delegation of authority — the executive is travelling and has delegated transfer approvals
  s.delegations = [
    { id: "D-2570-001", from: U("exec"), to: U("plan"), scopes: ["transfer", "spend"], start: "2026-10-14", end: "2026-10-24", status: "active", t: "2026-10-13T17:00",
      why: ["เดินทางไปราชการต่างประเทศ", "Official travel abroad"] },
    { id: "D-2569-014", from: U("fin"), to: (s.users.find(u => u.role === "fin" && !u.primary) || s.users.find(u => u.role === "plan" && !u.primary) || { id: U("plan") }).id, scopes: ["transfer"], start: "2026-08-01", end: "2026-08-05", status: "active", t: "2026-07-30T09:00",
      why: ["ลาพักผ่อน", "Annual leave"] },
    { id: "D-2570-002", from: U("exec"), to: U("fin"), scopes: ["spend"], start: "2026-10-14", end: "2026-10-24", status: "active", t: "2026-10-13T17:05",
      why: ["เดินทางไปราชการต่างประเทศ", "Official travel abroad"] },
  ];
  s.audit.unshift({ t: "2026-10-13T17:00", user: U("exec"), role: "exec", action: ["มอบอำนาจ", "Delegated authority"], target: "D-2570-001" });

  // round 8: project bank, plan revisions, ceiling responses, forward-estimate assumptions
  const divOf = unit => (s.users.find(u => u.role === "div" && u.unit === unit) || { id: null }).id; // null: no demo user in that unit
  s.ideas = (s.ideas || []).map(([unit, kpi, name, est, years, status, sc, note], i) => ({
    id: "PB-2571-" + String(i + 1).padStart(3, "0"), unit, kpi, name, est, years, status, scores: sc, note: note || null,
    by: divOf(unit), t: `2026-0${9 - (i % 3)}-1${i}T10:00`, req: null,
  }));
  const ks = [];
  s.strategy.items.forEach(st => st.goals.forEach(g => g.kpis.forEach(k => ks.push(k))));
  const kr = ks.find(k => k.acts.length) || ks[0], kd = ks.find(k => k !== kr && k.targets[2] > k.base) || ks[1];
  s.planRevs = [
    { id: "PR-2571-002", kpi: kr.id, y: 1, from: kr.targets[1], to: Math.round(kr.targets[1] * 1.2 * 10) / 10, by: U("plan"), t: "2026-10-15T14:20", status: "pending",
      why: ["ผลการดำเนินงานปี 2570 สูงกว่าเป้า จึงปรับค่าเป้าหมายให้ท้าทายขึ้น", "FY2570 results beat the target, so the target is raised"] },
    { id: "PR-2571-001", kpi: kd.id, y: 2, from: kd.targets[2], to: kd.targets[2], by: U("plan"), t: "2026-09-20T10:00", status: "approved", decided: "2026-09-25T09:30", dBy: U("exec"),
      why: ["ทบทวนกลางแผนตามมติ ครม. ยืนยันค่าเป้าหมายเดิม", "Mid-plan review: target confirmed unchanged"] },
  ];
  s.audit.push({ t: "2026-10-15T14:20", user: U("plan"), role: "plan", action: ["เสนอทบทวนค่าเป้าหมายตัวชี้วัด", "Proposed a KPI target revision"], target: `PR-2571-002 ${kr.id}` });
  // Ceilings were issued on 12 Oct; the unit asked to cut the most has appealed, two have accepted.
  const cut = u => { const r = sum(u.v); return r ? 1 - s.cons.unitCeil[u.unit] / r : 0; };
  const byCut = s.cons.units.slice().sort((a, b) => cut(b) - cut(a));
  s.cons.issued = "2026-10-12";
  s.cons.resp = {};
  byCut.forEach((u, i) => {
    const gap = Math.round((sum(u.v) - s.cons.unitCeil[u.unit]) * 10) / 10;
    if (i === 0) s.cons.resp[u.unit] = { st: "appeal", amt: Math.round(gap * 0.4 * 10) / 10, t: "2026-10-14T11:00", by: divOf(u.unit),
      why: ["วงเงินไม่พอสำหรับภาระผูกพันตามสัญญาเดิมและค่าสาธารณูปโภคที่ปรับขึ้น", "Not enough for existing contract obligations and higher utility costs"] };
    else if (i >= byCut.length - 2) s.cons.resp[u.unit] = { st: "accepted", t: "2026-10-13T09:" + (10 + i), by: divOf(u.unit) };
    else s.cons.resp[u.unit] = { st: "pending" };
  });
  s.fwd = { per: 3, ope: 2, ceil: 3 };

  // round 9: budget hearings, parliament stages, allotment releases, carry-over
  const Q = [
    ["ชี้แจงเหตุผลที่วงเงินเพิ่มขึ้นจากปีก่อน", "Explain why the amount is higher than last year"],
    ["แผนการจัดซื้อจัดจ้างและความพร้อมของแบบรูปรายการ", "Procurement plan and readiness of drawings"],
    ["ผลการดำเนินงานปีที่ผ่านมาเทียบกับตัวชี้วัด", "Last year's results against the KPI"],
    ["หากได้รับวงเงินลดลงร้อยละ 10 จะปรับแผนอย่างไร", "What would you change with 10% less?"],
  ];
  const hu = [...new Set([s.users.find(u => u.role === "div" && u.primary).unit, ...s.requests.filter(r => ["plan", "committee", "returned"].includes(r.status)).map(r => r.unit), ...s.cons.units.map(u => u.unit)])].slice(0, 3);
  const qa = (h, i, ans) => ({ id: `${h}-Q${i + 1}`, q: Q[i], ans: ans || null, ok: ans ? true : null, t: ans ? "2026-10-08T15:00" : null, by: ans ? divOf(hu[2]) : null });
  s.hearings = [
    { id: "H-03", unit: hu[2], date: "2026-10-09", time: "13:30", status: "held", qs: [qa("H-03", 0, ["ค่าบำรุงรักษาระบบเดิมสิ้นสุดสัญญา ต้องจัดหาใหม่", "The old maintenance contract ended and must be re-procured"]), qa("H-03", 2, ["บรรลุเป้า 2 จาก 3 ตัวชี้วัด", "Met 2 of 3 KPIs"])] },
    { id: "H-04", unit: hu[0], date: "2026-10-20", time: "09:30", status: "scheduled", qs: [qa("H-04", 0), qa("H-04", 3)] },
    { id: "H-05", unit: hu[1] || hu[0], date: "2026-10-22", time: "13:30", status: "scheduled", qs: [qa("H-05", 1)] },
  ];
  s.parl = { stage: 0, items: null, cuts: {}, appeals: {} };
  const A70 = s.allocs[2570], q = (l, n) => sum(l.plan.slice(n * 3, n * 3 + 3));
  A70.releases = [];
  BUDGET_TYPES.forEach(t => {
    const ls = A70.lines.filter(l => l.type === t.id); if (!ls.length) return;
    const q1 = sum(ls.map(l => q(l, 0))), q2 = sum(ls.map(l => q(l, 1)));
    if (q1) A70.releases.push({ id: "", q: 1, type: t.id, amount: q1, status: "approved", t: "2026-10-01T09:00", dt: "2026-10-03T10:00", by: U("fin") });
    if (q2 && (t.id === "per" || t.id === "ope")) A70.releases.push({ id: "", q: 2, type: t.id, amount: q2, status: "pending", t: "2026-10-15T14:00", by: U("fin") });
  });
  A70.releases.forEach((r, i) => (r.id = "RL-2570-" + String(i + 1).padStart(2, "0")));
  const invL = A70.lines.filter(l => l.type === "inv").slice(0, 3), paid = [0.82, 0.35, 0];
  s.carry = {
    prev: invL.map((l, i) => ({ id: "CF-2569-0" + (i + 1), unit: l.unit, name: [`${l.name[0]} (ผูกพันจากปี 2569)`, `${l.name[1]} (committed in FY2569)`], po: `PO-69-0${412 + i * 37}`,
      amount: Math.round(l.amount * 0.3 / 1e5) * 1e5, paid: 0, due: "2027-03-31", status: "open", t: "2026-09-28T10:00" })),
    reqs: [],
  };
  s.carry.prev.forEach((c, i) => (c.paid = Math.round(c.amount * paid[i] / 1e5) * 1e5));

  // round 10: procurement milestones (FY2569 snapshot), evaluations and lessons, spending anomalies,
  // notification templates, SLA escalation, data retention and backups
  const day = (iso, n) => { const [y, m, dd] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); };
  s.proc = {};
  s.dash.projects.filter(p => p.type === "inv").forEach((p, i) => {
    const slow = p.actual / p.plan < 0.75, done = slow ? 2 : 4, start = day("2025-10-20", i * 9);
    s.proc[p.id] = [0, 1, 2, 3, 4].map(n => {
      const plan = day(start, n * 50 + (n > 2 ? 30 : 0));
      return { plan, actual: n < done ? day(plan, slow ? 18 + n * 12 : (i + n) % 3 * 3) : null };
    });
  });
  const ev = s.dash.projects.filter(p => s.perf.outputs[p.id] && s.perf.outputs[p.id].kpi);
  s.evals = [];
  if (ev[0]) s.evals.push({ id: "EV-2569-01", proj: ev[0].id, status: "done", t: "2026-04-22T10:00", by: U("plan"), ratings: [5, 4, 3, 4, 3],
    findings: ["ผลผลิตเกิดขึ้นจริงแต่ล่าช้ากว่าแผน เนื่องจากขั้นตอนจัดซื้อจัดจ้างใช้เวลามากกว่าที่ประมาณไว้", "Outputs were delivered but late, because procurement took longer than estimated"],
    lessons: [["เริ่มจัดทำร่างขอบเขตงาน (TOR) ก่อนได้รับงบประมาณอย่างน้อย 3 เดือน", "Draft the terms of reference at least 3 months before funds arrive"], ["แบ่งสัญญาเป็นระยะเพื่อให้เบิกจ่ายได้ตามไตรมาส", "Split contracts into phases so payments follow the quarters"]] });
  if (ev[1]) s.evals.push({ id: "EV-2569-02", proj: ev[1].id, status: "draft", t: "2026-04-28T15:00", by: U("plan"), ratings: [4, 3, 0, 0, 0], findings: ["", ""], lessons: [] });
  s.lessons = s.evals.filter(e => e.status === "done").flatMap(e => e.lessons.map((l, i) => ({ id: `${e.id}-L${i + 1}`, eval: e.id, unit: s.dash.projects.find(p => p.id === e.proj).unit, text: l, t: e.t })));
  const du = s.dash.units.map(u => u.unit), V = ["บริษัท ตัวอย่างเทคโนโลยี จำกัด", "Sample Technology Co., Ltd."], V2 = ["ห้างหุ้นส่วนจำกัด ก่อสร้างตัวอย่าง", "Sample Construction Ltd. Partnership"];
  s.anoms = [
    { id: "AN-01", kind: "split", unit: du[1], risk: 82, status: "new", t: "2026-04-29T06:10", vendor: V,
      recs: [["2026-03-02", 495000], ["2026-03-06", 488000], ["2026-03-13", 492500]], detail: ["จัดซื้อจากผู้ขายรายเดียว 3 ครั้งใน 12 วัน แต่ละครั้งต่ำกว่าเกณฑ์ 500,000 บาท รวม 1,475,500 บาท", "3 purchases from one supplier in 12 days, each just under the 500,000 baht threshold; 1,475,500 baht in total"] },
    { id: "AN-02", kind: "spike", unit: du[2], risk: 64, status: "new", t: "2026-04-29T06:10",
      recs: [["2025-07", 6.1], ["2025-08", 7.4], ["2025-09", 41.2]], detail: ["เบิกจ่ายเดือน ก.ย. 2568 ร้อยละ 41 ของทั้งปี สูงกว่าค่าเฉลี่ยกรม 3.2 เท่า", "September 2025 disbursement was 41% of the year, 3.2× the department average"] },
    { id: "AN-03", kind: "early", unit: du[1], risk: 71, status: "explained", t: "2026-04-20T06:10", vendor: V2, note: ["ตรวจรับงวดที่ 2 แล้ว แต่บันทึกวันที่ตรวจรับในระบบผิด แก้ไขแล้ว", "Phase 2 was inspected; the inspection date was keyed wrongly and has been fixed"],
      recs: [["2026-02-10", 3200000]], detail: ["วันที่จ่ายเงินใน GFMIS (10 ก.พ.) ก่อนวันที่ตรวจรับพัสดุ (14 ก.พ.)", "GFMIS payment date (10 Feb) is before the goods inspection date (14 Feb)"] },
    { id: "AN-04", kind: "vendor", unit: du[3] || du[0], risk: 48, status: "new", t: "2026-04-29T06:10", vendor: V,
      recs: [["68%", 0]], detail: ["ผู้ขายรายเดียวได้รับร้อยละ 68 ของมูลค่าจัดซื้อของหน่วยงานในปี 2569", "One supplier won 68% of the unit's FY2569 purchases by value"] },
  ];
  s.tpl = [
    { id: "T-01", ev: ["คำขอถูกส่งกลับแก้ไข", "Request returned"], ch: { app: true, mail: true, line: false }, subj: ["คำขอ {เลขที่} ถูกส่งกลับแก้ไข", "Request {no} was returned"], body: ["เรียน {ชื่อ}\nคำขอ {เลขที่} {โครงการ} ถูกส่งกลับแก้ไข มีความเห็น {จำนวน} ข้อ กรุณาแก้ไขภายใน {กำหนด}", "Dear {name},\nRequest {no} {project} was returned with {count} comments. Please fix it by {due}."] },
    { id: "T-02", ev: ["ใกล้ครบกำหนด SLA", "SLA due soon"], ch: { app: true, mail: true, line: true }, subj: ["เหลือ {วัน} วัน: {งาน}", "{days} days left: {task}"], body: ["งาน {งาน} ของคำขอ {เลขที่} จะครบกำหนดในวันที่ {กำหนด}", "{task} for request {no} is due on {due}."] },
    { id: "T-03", ev: ["เกินกำหนด SLA (ยกระดับ)", "SLA overdue (escalation)"], ch: { app: true, mail: true, line: true }, subj: ["เกินกำหนด: {งาน}", "Overdue: {task}"], body: ["งาน {งาน} ของคำขอ {เลขที่} เกินกำหนด {วัน} วัน ระบบแจ้ง {ผู้รับยกระดับ} ตามที่กำหนดใน M10", "{task} for request {no} is {days} days overdue. Escalated to {escalate_to} as set in M10."] },
    { id: "T-04", ev: ["หน่วยงานเบิกจ่ายต่ำกว่าแผน", "Unit behind spending plan"], ch: { app: true, mail: false, line: false }, subj: ["{หน่วยงาน} เบิกจ่ายต่ำกว่าแผน {ร้อยละ}%", "{unit} is {pct}% behind plan"], body: ["{หน่วยงาน} เบิกจ่ายได้ {ร้อยละ}% ของแผน ณ {วันที่}", "{unit} has spent {pct}% of plan as of {date}."] },
  ];
  s.escal = { w2: { remind: 3, to: "exec", after: 2 }, w3: { remind: 2, to: "exec", after: 1 }, w4: { remind: 1, to: "exec", after: 1 } };
  s.retention = [
    { id: "R1", cls: ["บันทึกการใช้งาน (audit log)", "Audit log"], years: 10, basis: ["ระเบียบงานสารบรรณ / ตรวจสอบย้อนหลัง", "Records rules / audit trail"], size: 2.4 },
    { id: "R2", cls: ["คำของบประมาณและเวอร์ชัน", "Requests and versions"], years: 10, basis: ["หลักฐานทางการเงิน", "Financial records"], size: 18.6 },
    { id: "R3", cls: ["เอกสารแนบ", "Attachments"], years: 5, basis: ["หลักฐานประกอบ", "Supporting evidence"], size: 412 },
    { id: "R4", cls: ["บันทึกการทำงานของ AI", "AI activity log"], years: 2, basis: ["การกำกับดูแล AI", "AI governance"], size: 1.1 },
    { id: "R5", cls: ["ประวัติการสนทนากับผู้ช่วย AI", "AI assistant chats"], years: 1, basis: ["PDPA · เก็บเท่าที่จำเป็น", "PDPA · keep only what is needed"], size: 0.6 },
  ];
  s.backup = { full: "2026-10-12T01:00", incr: "2026-10-16T01:00", restore: "2026-07-20T10:00", rpo: 1, rto: 4, log: [] };

  // round 11: Fisko Procurement and Fisko Finance (light versions), built on the FY2570 allocation lines.
  // A procurement officer joins the demo users; two contracts are running, one payment is paid and matched.
  const sec = s.units.find(u => u.code === "01") || s.units[1];
  if (!s.users.some(u => u.role === "proc")) s.users.push({ id: "u10", role: "proc", unit: sec.id, primary: true, mfa: true, active: true,
    name: (s.org[1] || "").startsWith("Sample") ? ["สุรชัย จัดหา", "Surachai Jatha"] : ["สุรีย์ พัสดุดี", "Suree Phatsudee"] });
  // round 13: a head of procurement approves methods that differ from the advice and decides appeals.
  if (!s.users.some(u => u.role === "prochead")) s.users.push({ id: "u11", role: "prochead", unit: sec.id, primary: true, mfa: true, active: true,
    name: (s.org[1] || "").startsWith("Sample") ? ["วิชัย หัวหน้าพัสดุ", "Wichai Hua-na"] : ["วิไล หัวหน้าพัสดุ", "Wilai Huana"] });
  // The last two plan items sit on the demo requester's own unit, so that role can raise a requisition in the demo.
  const pool = A70.lines.filter(l => l.type === "inv" || l.type === "ope").sort((a, b) => b.amount - a.amount);
  const myUnit = s.users.find(u => u.role === "div" && u.primary).unit, mineL = pool.filter(l => l.unit === myUnit).slice(0, 2);
  const FL = [...pool.filter(l => !mineL.includes(l)).slice(0, 6 - mineL.length), ...mineL];
  const PO = U("proc"), reqBy = unit => divOf(unit) || U("div"), EX = U("exec"), FN = U("fin"), PL = U("plan"), DV = U("div");
  const months = ["2026-11-15", "2026-12-15", "2027-01-15", "2027-02-15", "2027-03-15", "2027-04-15"];
  s.pplan = FL.map((l, i) => {
    const est = Math.max(1e5, Math.round(l.amount * 0.5 / 1e5) * 1e5);
    return { id: "PP-2570-" + String(i + 1).padStart(3, "0"), line: l.id, name: l.name, est, method: est <= 5e5 ? "specific" : "ebid", month: months[i], by: PO, status: "planned", egp: null, kind: guessKind(l, l.name) };
  });
  // The last two items are small, same kind, same unit: raising both in a row trips the split-purchase check (R-02).
  [[s.pplan.length - 2, 4e5], [s.pplan.length - 1, 3.5e5]].forEach(([i, est]) => Object.assign(s.pplan[i], { est, method: "specific", kind: "goods" }));
  const why = ["จำเป็นต่อการดำเนินงานตามแผนปีงบประมาณ 2570", "Needed to deliver the FY2570 work plan"];
  const mkReq = (i, st, t) => ({ id: "RQ-2570-" + String(i + 1).padStart(3, "0"), plan: s.pplan[i].id, by: reqBy(FL[i].unit), amount: s.pplan[i].est, why, status: st, t,
    decided: st === "pending" ? null : { by: EX, holder: EX, via: null, t: t.slice(0, 10) + "T16:00" } });
  s.reqn = [mkReq(0, "contracted", "2026-08-03T09:00"), mkReq(1, "contracted", "2026-08-04T09:00"), mkReq(2, "approved", "2026-09-01T09:00"), mkReq(3, "pending", "2026-10-15T09:00")];
  [0, 1].forEach(i => (s.pplan[i].status = "contracted"));
  [2, 3].forEach(i => (s.pplan[i].status = "requisitioned"));
  s.pplan[0].egp = { no: "EGP-70-0101", stage: ["ลงนามสัญญา", "Contract signed"], date: "2026-10-06" };
  s.pplan[1].egp = { no: "EGP-70-0102", stage: ["ลงนามสัญญา", "Contract signed"], date: "2026-10-07" };
  s.pplan[2].egp = { no: "EGP-70-0103", stage: ["ประกาศเชิญชวน", "Invitation"], date: "2026-10-14" };
  const vend = [["บริษัท ตัวอย่างระบบ จำกัด", "Sample Systems Co., Ltd."], ["ห้างหุ้นส่วนจำกัด ตัวอย่างก่อสร้าง", "Sample Construction Ltd. Partnership"]];
  const mkPhases = (amount, dues, t) => {
    const share = [0.4, 0.3]; let left = amount;
    return dues.map((due, n) => {
      const a = n < 2 ? Math.round(amount * share[n] / 1e3) * 1e3 : left; left -= a;
      return { n: n + 1, name: [`งวดที่ ${n + 1}`, `Phase ${n + 1}`], due, amount: a, signs: n === 0 ? [{ by: PL, t }, { by: DV, t: t.slice(0, 10) + "T11:00" }] : [] };
    });
  };
  const mkCon = (i, vi, no, signed, dues, t) => {
    const r = s.reqn[i], amount = Math.round(r.amount * 0.97 / 1e3) * 1e3;
    return { id: "CT-2570-" + String(i + 1).padStart(3, "0"), reqn: r.id, plan: r.plan, line: s.pplan[i].line, vendor: vend[vi], no, signed, amount, by: PO, inspectors: [PL, DV], status: "active", phases: mkPhases(amount, dues, t) };
  };
  s.contracts = [mkCon(0, 0, "CT-70/001", "2026-10-06", ["2026-10-14", "2026-11-30", "2027-01-31"], "2026-10-14T10:00"),
    mkCon(1, 1, "CT-70/002", "2026-10-07", ["2026-10-15", "2026-12-15", "2027-02-28"], "2026-10-15T10:00")];
  s.payreqs = [{ id: "PY-2570-001", contract: "CT-2570-001", phase: 1, amount: s.contracts[0].phases[0].amount, by: FN, status: "approved", t: "2026-10-14T15:00",
    decided: { by: EX, holder: EX, via: null, t: "2026-10-15T10:00" }, recon: { state: "matched", file: "GF-2570-01", t: "2026-10-16T08:00" } }];
  s.gfmisFiles = [{ id: "GF-2570-01", t: "2026-10-16T08:00", by: FN, rows: [{ pay: "PY-2570-001", doc: "GF-70-000417", amount: s.payreqs[0].amount, date: "2026-10-16", state: "matched" }] }];
  s.egpImports = [];
  s.sod = { rules: ["SD-01", "SD-02", "SD-03", "SD-04", "SD-05", "SD-06", "SD-07", "SD-08"].map(id => ({ id, on: true })), blocks: [] };
  seedCases(s, { PO, PL, DV, EX, FN, vend });
  seedContracts(s, { PO, FN });
  seedAnalytics(s);
  seedAI(s);
  seedSourcing(s, { PO, PH: U("prochead") });
  seedLate(s, { PO });
  seedPlanReports(s, { PO, EX });
  seedDocs(s);
  seedForecast(s);
  seedAgents(s);
  seedProfile(s);
  seedBudgetB1(s);
  seedBudgetB2(s);
  seedBudgetB3(s);
  seedBudgetB3Sub(s);
  seedBudgetB4(s);
  seedBudgetB5(s);
  seedBudgetB6(s);
  seedFinanceFN1(s);
  s.audit.unshift(
    { t: "2026-10-15T10:00", user: EX, role: "exec", action: ["อนุมัติเบิกจ่าย", "Approved a payment"], target: "PY-2570-001 CT-2570-001" },
    { t: "2026-10-14T15:00", user: FN, role: "fin", action: ["ขออนุมัติเบิกจ่าย", "Requested a payment approval"], target: "PY-2570-001 CT-2570-001" },
    { t: "2026-10-14T11:00", user: DV, role: "div", action: ["ลงนามตรวจรับงาน", "Signed an acceptance"], target: "CT-2570-001 งวดที่ 1" },
    { t: "2026-10-06T14:00", user: PO, role: "proc", action: ["สร้างสัญญา", "Created a contract"], target: "CT-2570-001 RQ-2570-001" },
  );
  s.audit.sort((a, b) => (a.t < b.t ? 1 : -1));
  return s;
}
