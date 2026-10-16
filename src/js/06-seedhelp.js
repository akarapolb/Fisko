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
  return s;
}
