// Fisko Procurement round 23 (Q6 of design v0.2): agentic AI, simulated (chapter 11; FR-PR-58, 59; D-P09).
// An agent takes a goal, plans steps from a template, calls tools from a register, and stops for a person at
// every step that writes data. Nothing here calls a model: each step runs an existing rule function, so the
// results are real for the sample data but the "planning" is a fixed template. Agents have no tool to score
// bids, award, sign, approve or pay, so they can't do those even if asked.
let RUN_OPEN = null, AG_GOAL = {};
const AG_LEVELS = { L0: ["แนะนำ", "Suggest"], L1: ["ร่าง", "Draft"], L2: ["ทำเมื่ออนุมัติ", "Act with approval"], L3: ["ทำเองในขอบเขต", "Act within scope"] };
const KIND_TAG = { read: ["อ่าน", "Read", "p-mute"], draft: ["ร่าง", "Draft", "p-info"], propose: ["เสนอ", "Propose", "p-info"], write: ["เขียนเมื่ออนุมัติ", "Write on approval", "p-warn"], notify: ["แจ้งเตือนและสร้างงาน", "Notify and create task", "p-ok"] };
const ST_ICON = { pending: ["รอ", "Pending", "p-mute"], done: ["เสร็จ", "Done", "p-ok"], await: ["รออนุมัติ", "Waiting for you", "p-warn"], approved: ["อนุมัติแล้ว", "Approved", "p-ok"], edited: ["แก้แล้วอนุมัติ", "Edited and approved", "p-ok"], skipped: ["ข้าม", "Skipped", "p-mute"], suggested: ["เสนอเท่านั้น (ตามระดับ)", "Suggested only (level)", "p-info"], blocked: ["ทำไม่ได้", "Can't do", "p-bad"], stopped: ["หยุด", "Stopped", "p-mute"] };
const AGENTS_Q6 = [
  ["AG-11", ["Case Copilot", "Case Copilot"], ["เตรียมแฟ้มที่อนุมัติหลักการแล้วให้พร้อมประกาศ", "Gets an approved case ready for the notice"], "L2"],
  ["AG-12", ["Contract Watch", "Contract Watch"], ["ตรวจสัญญาทุกฉบับ ร่างหนังสือเร่งรัด และสร้างงาน", "Checks every contract, drafts reminders and creates tasks"], "L3"],
  ["AG-13", ["Compliance Reporter", "Compliance Reporter"], ["จัดทำรายงานสรุปผลรายเดือนและเสนอให้หัวหน้าพัสดุตรวจ", "Prepares the monthly summary for the head to check"], "L1"],
];
// ---------- tool register (FR-PR-59) ----------
const TOOLS = {
  "case.read": ["read", "อ่านแฟ้ม ใบขอซื้อ และตารางเกณฑ์", "Read the case, requisition and rules", ["AG-11", "AG-10"]],
  "method.propose": ["propose", "เสนอวิธีจัดซื้อจากตารางเกณฑ์ (R-01)", "Propose the method from the rules (R-01)", ["AG-11"]],
  "method.write": ["write", "บันทึกวิธีจัดซื้อ", "Record the method", ["AG-11"]],
  "case.move": ["write", "เลื่อนแฟ้มไปขั้นถัดไป", "Move the case to the next step", ["AG-11"]],
  "ref.propose": ["propose", "เสนอราคากลางพร้อมหลักฐาน (AI-03)", "Propose a reference price with evidence (AI-03)", ["AG-11"]],
  "ref.write": ["write", "บันทึกราคากลาง", "Record the reference price", ["AG-11"]],
  "tor.draft": ["draft", "ร่าง TOR จากคลังแม่แบบ (AI-02)", "Draft the TOR from the library (AI-02)", ["AG-11"]],
  "tor.check": ["read", "ตรวจข้อความล็อกสเปก (AI-04)", "Check for spec-locking wording (AI-04)", ["AG-11"]],
  "tor.write": ["write", "แนบ TOR เข้าแฟ้ม", "Attach the TOR to the case", ["AG-11"]],
  "committee.propose": ["propose", "เสนอรายชื่อกรรมการที่ไม่ขัด SD-06", "Propose committee members clear of SD-06", ["AG-11"]],
  "committee.write": ["write", "บันทึกคำสั่งแต่งตั้ง (ร่าง)", "Record the appointment (draft order)", ["AG-11"]],
  "criteria.write": ["write", "บันทึกเกณฑ์พิจารณา", "Record the evaluation criteria", ["AG-11"]],
  "pack.draft": ["draft", "สร้างชุดข้อมูลสำหรับ e-GP", "Build the e-GP data pack", ["AG-11"]],
  "rfq.draft": ["draft", "ร่างหนังสือขอใบเสนอราคา", "Draft a request for quotation", ["AG-11"]],
  "contracts.read": ["read", "อ่านสัญญา งวด หลักประกัน และค่าปรับ", "Read contracts, phases, guarantees and penalties", ["AG-12"]],
  "delay.assess": ["read", "ประเมินความเสี่ยงล่าช้า (AI-07)", "Assess delivery risk (AI-07)", ["AG-12"]],
  "letter.draft": ["draft", "ร่างหนังสือเร่งรัด (ยังไม่ส่ง)", "Draft a reminder letter (not sent)", ["AG-12"]],
  "task.create": ["notify", "สร้างงานในพื้นที่ทำงาน", "Create a task in My Workspace", ["AG-12", "AG-13"]],
  "user.notify": ["notify", "ส่งการแจ้งเตือนภายใน", "Send an internal notification", ["AG-12", "AG-13"]],
  "report.read": ["read", "อ่านแฟ้มที่ประกาศผู้ชนะในเดือน", "Read cases with a winner in the month", ["AG-13"]],
  "report.draft": ["draft", "ร่างรายงานสรุปผลรายเดือน", "Draft the monthly summary", ["AG-13"]],
  "flags.read": ["read", "อ่านสัญญาณเตือนที่เปิดอยู่", "Read open red flags", ["AG-13", "AG-10"]],
  "report.publish": ["write", "เผยแพร่รายงาน (หัวหน้าพัสดุ)", "Publish the report (head of procurement)", ["AG-13"]],
  "kpi.read": ["read", "อ่านตัวชี้วัดจากชั้นความหมาย", "Read KPIs from the semantic layer", ["AG-10"]],
  "forecast.read": ["read", "อ่านผลพยากรณ์", "Read forecasts", ["AG-10"]],
  "answer.compose": ["draft", "เรียบเรียงคำตอบพร้อมแหล่งที่มา", "Compose the answer with sources", ["AG-10"]],
};
const NOT_IN_REGISTER = [["ให้คะแนนหรือจัดอันดับข้อเสนอ", "Score or rank bids"], ["ประกาศผู้ชนะ", "Announce a winner"], ["สร้างหรือลงนามสัญญา", "Create or sign a contract"], ["อนุมัติใด ๆ", "Approve anything"], ["เบิกจ่าย", "Pay"]];
const agLevel = id => (S.agentLevels || {})[id] || "L0";
const agName = id => { const a = S.agents.find(x => x.id === id); return a ? tx(a.name) : id; };

// ---------- planning from templates ----------
function planCopilot(c) {
  const n = caseState(c), comp = needsCompetition(c) || (!c.method && famPlan(c.plan).method !== "specific"), st = [["case.read"]];
  if (n === 3 && !c.method) st.push(["method.propose"], ["method.write"]);
  if (n === 3) st.push(["case.move"]);
  if (!c.ref) st.push(["ref.propose"], ["ref.write"]);
  if (comp) { if (!c.tor) st.push(["tor.draft"], ["tor.check"], ["tor.write"]); if (!c.committees.tor) st.push(["committee.propose"], ["committee.write"]); if (!c.criteria) st.push(["criteria.write"]); st.push(["pack.draft"]); }
  else st.push(["rfq.draft"]);
  return st;
}
function planWatch() {
  const st = [["contracts.read"], ["delay.assess"]];
  S.contracts.filter(conLive).forEach(c => { const worst = c.phases.filter(ph => !phaseAccepted(ph) && !ph.cancelled).map(ph => aiDelay(c, ph).s).sort((a, b) => b - a)[0] || 0; if (worst >= S.pcfg.watchRisk) st.push(["letter.draft", c.id], ["task.create", c.id]); });
  S.contracts.filter(c => ["expiring", "expired"].includes(guarSt(c))).forEach(c => st.push(["task.create", c.id, "guar"]));
  S.contracts.filter(c => penaltyWarn(c)).forEach(c => st.push(["user.notify", c.id, "pen"]));
  return st;
}
const planReporter = () => [["report.read"], ["report.draft"], ["flags.read"], ["report.publish"]];
const planInsight = () => [["kpi.read"], ["forecast.read"], ["flags.read"], ["answer.compose"]];
function startRun(agent, target) {
  const steps = (agent === "AG-11" ? planCopilot(caseOf(target)) : agent === "AG-12" ? planWatch() : agent === "AG-13" ? planReporter() : planInsight()).slice(0, S.pcfg.agentMaxSteps)
    .map(([tool, ref, sub], i) => ({ i, tool, ref: ref || null, sub: sub || null, status: "pending", out: "", change: null, value: null }));
  const run = { id: "RUN-" + String(S.agentRuns.length + 1).padStart(3, "0"), agent, target, by: me().id, t: nowIso(), level: agLevel(agent), status: "running", ptr: 0, steps };
  S.agentRuns.push(run); if (agent === "AG-12") S.agentTasks = S.agentTasks.filter(x => x.agent !== "AG-12");
  advance(run); return run;
}

// ---------- executing steps ----------
const wrLevel = run => (run.level === "L2" || run.level === "L3" ? "await" : "suggested");
const ntLevel = run => (run.level === "L3" ? "done" : run.level === "L2" ? "await" : "suggested");
const drLevel = run => (run.level === "L0" ? "suggested" : "done");
const EXEC = {
  "case.read": (run, s) => { const c = caseOf(run.target), rq = caseReq(c), p = famPlan(c.plan); s.out = L(`${c.id} · ${tx(p.name)} · ขั้น ${caseState(c)}/12 · ใบขอซื้อ ${rq ? rq.id + " " + fmt(rq.amount) + " บาท" : "—"} · ${tx(KINDS[c.kind])}`, `${c.id} · ${tx(p.name)} · step ${caseState(c)}/12 · requisition ${rq ? rq.id + " " + fmt(rq.amount) + " baht" : "—"} · ${tx(KINDS[c.kind])}`); return "done"; },
  "method.propose": (run, s) => { const c = caseOf(run.target), r = recommendMethod(c); run.memo = Object.assign(run.memo || {}, { method: r.method }); s.out = `${r.method ? tx(PMETHOD[r.method]) : "—"} · ${tx(r.why)}`; return "done"; },
  "method.write": (run, s) => { const c = caseOf(run.target), m = (run.memo || {}).method; if (!m) { s.out = L("ไม่มีวิธีที่เสนอ", "No method proposed"); return "blocked"; } s.change = { what: L("วิธีจัดซื้อ", "Method"), before: c.method ? tx(PMETHOD[c.method]) : "—", after: tx(PMETHOD[m]) }; return wrLevel(run); },
  "case.move": (run, s) => { const c = caseOf(run.target), n = caseState(c); s.change = { what: L("ขั้นของแฟ้ม", "Case step"), before: `${n}/12`, after: `${n + 1}/12` }; s.out = caseChecks(c).filter(x => !x.ok).map(x => x.label).join("; "); return wrLevel(run); },
  "ref.propose": (run, s) => { const c = caseOf(run.target), r = aiRefPrice(c), M = c.market || [], mid = r.n ? r.mid : M.length ? med(M.map(x => x.price)) : Math.round(famPlan(c.plan).est * 0.98 / 1e3) * 1e3; run.memo = Object.assign(run.memo || {}, { ref: Math.round(mid), basis: r.n ? ["contract"] : M.length ? ["market"] : ["std"] });
    s.out = r.n ? L(`ช่วง ${fmt(r.low)} – ${fmt(r.high)} ค่ากลาง ${fmt(r.mid)} จากสัญญาเดิม ${r.n} ฉบับ`, `range ${fmt(r.low)} – ${fmt(r.high)}, middle ${fmt(r.mid)} from ${r.n} past contracts`) : L(`ไม่มีสัญญาเดิม ใช้${M.length ? "การสำรวจตลาด" : "ร้อยละ 98 ของประมาณการ"} ${fmt(mid)}`, `no past contract; using ${M.length ? "market research" : "98% of the estimate"} ${fmt(mid)}`); return "done"; },
  "ref.write": (run, s) => { const c = caseOf(run.target), v = (run.memo || {}).ref; s.value = v; s.change = { what: L("ราคากลาง (บาท)", "Reference price (baht)"), before: c.ref ? fmt(c.ref.amount) : "—", after: fmt(v), editable: "number" }; return caseState(c) === 4 ? wrLevel(run) : (s.out = L("แฟ้มยังไม่อยู่ขั้น 4", "The case isn't at step 4"), "blocked"); },
  "tor.draft": (run, s) => { const c = caseOf(run.target), t = S.torLib.find(x => x.kind === c.kind && torLatest(x)) || S.torLib.find(x => torLatest(x)), v = torLatest(t); run.memo = Object.assign(run.memo || {}, { tpl: t.id, tplV: v.v, text: v.text }); s.out = `${t.id} v${v.v} · ${esc(tx(t.name))}`; return drLevel(run) === "suggested" ? "suggested" : "done"; },
  "tor.check": (run, s) => { const r = aiSpecCheck((run.memo || {}).text || ""); s.out = r.hits.length ? L(`พบ ${r.hits.length} จุดที่ควรตรวจ`, `${r.hits.length} points to check`) : L("ไม่พบข้อความล็อกสเปก", "No spec-locking wording"); return "done"; },
  "tor.write": (run, s) => { const c = caseOf(run.target), m = run.memo || {}; if (!m.tpl) { s.out = L("ไม่มีร่าง TOR", "No TOR draft"); return "blocked"; } s.change = { what: "TOR", before: c.tor ? c.tor.doc : "—", after: `TOR_${c.id}_${m.tpl}-v${m.tplV}.pdf` }; return caseState(c) === 4 ? wrLevel(run) : (s.out = L("แฟ้มยังไม่อยู่ขั้น 4", "The case isn't at step 4"), "blocked"); },
  "committee.propose": (run, s) => { const c = caseOf(run.target), pool = famPeople().filter(u => u.id !== me().id && !caseJudges(c).includes(u.id)).map(u => u.id).slice(0, S.pcfg.minMembers); run.memo = Object.assign(run.memo || {}, { cm: pool }); s.out = pool.map(userName).join(", ") + ` · ${L("กรรมการต้องแจ้งผลประโยชน์ทับซ้อนเอง Agent แจ้งแทนไม่ได้", "members must declare conflicts themselves; the agent can't")}`; return "done"; },
  "committee.write": (run, s) => { const c = caseOf(run.target), cm = (run.memo || {}).cm || []; if (cm.length < S.pcfg.minMembers) { s.out = L("รายชื่อไม่พอ", "Not enough people"); return "blocked"; } s.value = ""; s.change = { what: L("เลขที่คำสั่งแต่งตั้งกรรมการ TOR", "TOR committee order no."), before: "—", after: L("(ใส่เลขที่คำสั่งก่อนอนุมัติ)", "(enter the order number before approving)"), editable: "text" }; return caseState(c) === 4 ? wrLevel(run) : (s.out = L("แฟ้มยังไม่อยู่ขั้น 4", "The case isn't at step 4"), "blocked"); },
  "criteria.write": (run, s) => { const c = caseOf(run.target); s.change = { what: L("เกณฑ์พิจารณา", "Evaluation criteria"), before: c.criteria ? c.criteria.map(k => `${k.k} ${k.w}`).join(", ") : "—", after: CRIT_PRESET.pp.map(k => `${tx(k.name)} ${k.w}`).join(", ") }; return caseState(c) === 4 ? wrLevel(run) : (s.out = L("แฟ้มยังไม่อยู่ขั้น 4", "The case isn't at step 4"), "blocked"); },
  "pack.draft": (run, s) => { s.out = esc(egpPack(caseOf(run.target))).replace(/\n/g, "<br>"); return "done"; },
  "rfq.draft": (run, s) => { const c = caseOf(run.target); s.out = esc(`ร่างหนังสือขอใบเสนอราคา\nเรื่อง ขอเชิญเสนอราคา ${caseName(c)}\nวงเงิน ${fmt(caseReq(c) ? caseReq(c).amount : famPlan(c.plan).est)} บาท ขอให้เสนอราคาภายใน 7 วัน\n[ร่างจาก AG-11 ตรวจก่อนส่ง]`).replace(/\n/g, "<br>"); return "done"; },
  "contracts.read": (run, s) => { const A = S.contracts.filter(conLive); s.out = L(`${A.length} สัญญา · ${A.flatMap(c => c.phases.filter(ph => !phaseAccepted(ph) && !ph.cancelled)).length} งวดยังไม่ตรวจรับ · ค่าปรับสะสม ${fmt(sumv(A.map(conPenalty)))} บาท`, `${A.length} contracts · ${A.flatMap(c => c.phases.filter(ph => !phaseAccepted(ph) && !ph.cancelled)).length} phases open · penalties ${fmt(sumv(A.map(conPenalty)))} baht`); return "done"; },
  "delay.assess": (run, s) => { const r = S.contracts.filter(conLive).flatMap(c => c.phases.filter(ph => !phaseAccepted(ph) && !ph.cancelled).map(ph => ({ c, ph, r: aiDelay(c, ph) }))).sort((a, b) => b.r.s - a.r.s).slice(0, 4); s.out = r.map(x => `${x.c.id} ${tx(x.ph.name)} · ${x.r.s} · ${x.r.reasons.map(z => tx(z)).join(", ")}`).join("<br>") || "—"; return "done"; },
  "letter.draft": (run, s) => { const c = famCon(s.ref); s.out = `${c.id} · ${tx(LETTER_T.remind)}`; const lv = drLevel(run); if (lv === "done") { (c.letters = c.letters || []).push({ id: `${c.id}-L${c.letters.length + 1}`, type: "remind", text: letterText(c, "remind"), t: nowIso(), by: me().id, sent: null, agent: run.agent }); s.out += ` · ${L("บันทึกเป็นร่าง รอเจ้าหน้าที่ส่ง", "saved as a draft for the officer to send")}`; } return lv; },
  "task.create": (run, s) => { const c = famCon(s.ref); s.value = { role: "proc", title: s.sub === "guar" ? `${L("ต่ออายุหรือเรียกหลักประกัน", "Renew or call the guarantee")} ${c.id}` : `${L("ติดตามการส่งมอบตามคำแนะนำของ AG-12", "Follow up delivery, as AG-12 suggests")} ${c.id}`, link: "prc-contracts" };
    s.change = { what: L("งานใหม่ในพื้นที่ทำงาน", "New task in My Workspace"), before: "—", after: s.value.title }; const lv = ntLevel(run); if (lv === "done") applyStep(run, s); return lv; },
  "user.notify": (run, s) => { const c = famCon(s.ref); s.change = { what: L("แจ้งผู้บริหาร", "Notify the executive"), before: "—", after: L(`สัญญา ${c.id} ค่าปรับเกินเพดานเตือน`, `Contract ${c.id} penalties over the warning cap`) }; const lv = ntLevel(run); if (lv === "done") applyStep(run, s); return lv; },
  "report.read": (run, s) => { const m = run.target, rows = repRows(m); run.memo = { rows }; s.out = L(`${monthLabel(m)} · ${rows.length} แฟ้ม · ขาดข้อมูล ${rows.filter(r => r.miss.length).length}`, `${monthLabel(m)} · ${rows.length} cases · ${rows.filter(r => r.miss.length).length} with gaps`); return "done"; },
  "report.draft": (run, s) => { const rows = (run.memo || {}).rows || []; s.out = rows.map(r => `${r.no}. ${esc(r.item)} · ${esc(r.method)} · ${esc(r.winner)}${r.miss.length ? ` · <b>${L("ขาด", "missing")} ${r.miss.join(", ")}</b>` : ""}`).join("<br>") || L("ไม่มีรายการในเดือนนี้", "Nothing this month"); return drLevel(run); },
  "flags.read": (run, s) => { const f = detectFlags().filter(x => !["closed", "fixed", "fp"].includes(rfRev(x.key).status)); s.out = L(`สัญญาณเปิดอยู่ ${f.length}`, `${f.length} open signals`) + (f.length ? ": " + f.slice(0, 4).map(x => `${x.rf} ${x.ref}`).join(", ") : ""); return "done"; },
  "report.publish": (run, s) => { const rows = (run.memo || {}).rows || []; if (S.monthly.some(m => m.month === run.target)) { s.out = L("เผยแพร่แล้ว", "Already published"); return "skipped"; } if (!rows.length || rows.some(r => r.miss.length)) { s.out = L("มีช่องที่ขาดหรือไม่มีรายการ ต้องแก้ก่อน", "Gaps or nothing to publish; fix first"); return "blocked"; } s.change = { what: L("รายงานสรุปผลรายเดือน", "Monthly summary"), before: L("ยังไม่เผยแพร่", "Not published"), after: L("เผยแพร่", "Published") }; return wrLevel(run); },
  "kpi.read": (run, s) => { const q = String(run.target).toLowerCase(), picks = KPIS.filter(([id]) => (/(ช้า|late|delay|เบิก|pay)/.test(q) && ["KPI-10", "KPI-12"].includes(id)) || (/(แข่ง|bidder|ผู้ยื่น|compet)/.test(q) && ["KPI-05", "KPI-06", "KPI-07"].includes(id)) || (/(ราคา|price|saving|ประหยัด)/.test(q) && ["KPI-08", "KPI-09"].includes(id)) || (/(ค่าปรับ|penalt)/.test(q) && id === "KPI-11"));
    const use = picks.length ? picks : KPIS.filter(([id]) => ["KPI-01", "KPI-10"].includes(id)); run.memo = { kpis: use.map(([id, nm, f]) => ({ id, nm, r: f() })) }; s.out = run.memo.kpis.map(k => `${k.id} ${tx(k.nm)}: ${esc(k.r.v)} (n=${k.r.n})`).join("<br>"); return "done"; },
  "forecast.read": (run, s) => { const sims = simAll(), mon = monthly({}, sims), nxt = mon.rows.slice(PFY_MONTHS.indexOf(TODAY.slice(0, 7)) + 1).slice(0, 3); run.memo.fc = { risk: carryRisk(sims).length, pay3: sumv(nxt.map(r => r.payAct + r.payFc)) }; s.out = L(`แฟ้มเสี่ยงไม่ทันวันตัด ${run.memo.fc.risk} · คาดเบิกจ่าย 3 เดือนถัดไป ${mb(run.memo.fc.pay3)} ลบ.`, `${run.memo.fc.risk} cases at risk · expected payments next 3 months ${mb(run.memo.fc.pay3)} M`); return "done"; },
  "answer.compose": (run, s) => { const m = run.memo || {}; s.out = `<b>${esc(run.target)}</b><br>${(m.kpis || []).map(k => `• ${tx(k.nm)} ${esc(k.r.v)} [${k.id}]`).join("<br>")}${m.fc ? `<br>• ${L("พยากรณ์", "Forecast")}: ${L("เสี่ยง", "at risk")} ${m.fc.risk}, ${L("เบิกจ่าย 3 เดือน", "3-month payments")} ${mb(m.fc.pay3)} ${L("ลบ.", "M")} [F-01, F-02]`: ""}<br><span class="sub">${L("ข้อมูลตัวอย่างน้อย อ่านเป็นแนวโน้ม ไม่สรุปสาเหตุแทนคน", "Small sample; read as a pointer, it doesn't decide the cause")}</span>`; return "done"; },
};
function applyStep(run, s, edited) {
  const c = run.agent === "AG-11" ? caseOf(run.target) : null, tag2 = ` (${run.agent})`;
  switch (s.tool) {
    case "method.write": { const m = run.memo.method, rec = recommendMethod(c); c.method = m; c.methodWhy = rec.why; c.methodApproval = { status: "auto", t: nowIso(), by: me().id }; famPlan(c.plan).method = m; caseLog(c, "method", tx(PMETHOD[m]) + tag2); return ""; }
    case "case.move": return caseMove(c) ? "" : L("ยังไปต่อไม่ได้ ดูรายการตรวจของขั้น", "Can't move on yet; see the step's checks");
    case "ref.write": { const v = Math.round(Number(edited != null ? edited : s.value)); if (!(v > 0)) return L("ราคาต้องมากกว่าศูนย์", "The price must be above zero"); c.ref = { amount: v, basis: run.memo.basis, note: `${run.agent} ${AI_VER}`, by: me().id, t: nowIso() }; caseLog(c, "ref", fmt(v) + tag2); return ""; }
    case "tor.write": { const m = run.memo; c.tor = { doc: `TOR_${c.id}_${m.tpl}-v${m.tplV}.pdf`, tpl: m.tpl, tplV: m.tplV, t: nowIso(), by: me().id }; caseLog(c, "tor", c.tor.doc + tag2); return ""; }
    case "committee.write": { const no = String(edited || "").trim(); if (no.length < 3) return L("ใส่เลขที่คำสั่งแต่งตั้ง", "Enter the order number"); const cm = run.memo.cm; c.committees.tor = { order: no, date: TODAY, chair: cm[0], members: cm.slice(1), t: nowIso() }; caseLog(c, "committee", `${tx(COMMITTEES.tor)} · ${no}${tag2}`); notify(cm, [`คุณได้รับแต่งตั้งเป็นกรรมการ TOR แฟ้ม ${c.id} กรุณาแจ้งผลประโยชน์ทับซ้อน`, `You were appointed to the TOR committee of ${c.id}; please declare conflicts`], `case:${c.id}`); return ""; }
    case "criteria.write": c.criteria = CRIT_PRESET.pp.map(k => ({ ...k })); caseLog(c, "criteria", "pp" + tag2); return "";
    case "task.create": S.agentTasks.push(Object.assign({ agent: run.agent, run: run.id, due: TODAY }, s.value)); return "";
    case "user.notify": { const con = famCon(s.ref); notify(["exec", "prochead"], [`${run.agent}: สัญญา ${con.id} ค่าปรับเกินเพดานเตือน`, `${run.agent}: contract ${con.id} penalties over the warning cap`], "prc-contracts"); return ""; }
    case "report.publish": { if (ROLE !== "prochead") return L("หัวหน้าพัสดุเป็นผู้เผยแพร่", "Only the head of procurement can publish"); S.monthly.push({ month: run.target, rows: repRows(run.target).map(r => ({ ...r, miss: [] })), by: me().id, t: nowIso(), agent: run.agent }); return ""; }
  }
  return "";
}
// the person approving must be allowed to do the action themselves
const canApprove = (run, s) => (s.tool === "report.publish" ? ROLE === "prochead" : run.agent === "AG-11" ? isProcRole() : isProcRole() || canSpend());
function advance(run) {
  while (run.ptr < run.steps.length && run.status === "running") {
    const s = run.steps[run.ptr], t0 = performance.now();
    if (!TOOLS[s.tool][3].includes(run.agent)) { s.status = "blocked"; s.out = L("Agent นี้ไม่มีสิทธิ์ใช้เครื่องมือนี้", "This agent may not use this tool"); run.ptr++; continue; }
    s.status = EXEC[s.tool](run, s); s.ms = Math.round(performance.now() - t0); s.at = nowIso();
    S.aiLog.unshift({ t: nowIso(), agent: run.agent, user: me().id, action: [TOOLS[s.tool][1], TOOLS[s.tool][2]], target: `${run.id} ${run.target}`, sources: 1, ok: s.status !== "blocked", ver: "agent-sim-1" });
    if (s.status === "await") { s.awaitMs = Date.now(); run.status = "waiting"; return; }
    run.ptr++;
  }
  if (run.ptr >= run.steps.length && run.status === "running") run.status = "done";
}

// ---------- page ----------
PROC.agents = () => {
  const exec = ROLE === "exec", run = S.agentRuns.find(r => r.id === RUN_OPEN), dec = S.agentRuns.flatMap(r => r.steps.filter(s => s.decidedMs != null)), secs = dec.map(s => s.decidedMs / 1000), fast = secs.filter(x => x < S.pcfg.fastApproveSec).length;
  const openCases11 = S.cases.filter(c => !c.cancelled && [3, 4].includes(caseState(c)));
  const goal = (id, body) => `<div class="callout" style="margin:0;display:flex;flex-direction:column;gap:8px"><div class="row"><b>${agName(id)}</b><span class="mono sub">${id}</span>${tag(`${agLevel(id)} ${tx(AG_LEVELS[agLevel(id)])}`, "p-info")}${agentOn(id) ? "" : tag(L("ปิดอยู่ใน M09", "Off in M09"), "p-bad")}</div>${body}</div>`;
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">AI</div><div><b>${L("Agent แบบจำลอง: วางแผนจากแม่แบบ เรียกเครื่องมือจริง หยุดรอคนทุกจุดที่เขียนข้อมูล", "Simulated agents: plans come from templates, tools are real, and every write waits for a person")}</b><p>${L("ไม่เรียกโมเดลภาษา ผลแต่ละขั้นมาจากกฎที่มีอยู่ (D-P09) ไม่มีปุ่มอนุมัติทั้งหมด และ Agent ไม่มีเครื่องมือให้คะแนนข้อเสนอ ประกาศผู้ชนะ ทำสัญญา อนุมัติ หรือเบิกจ่าย", "No language model is called; each step's result comes from existing rules (D-P09). There is no approve-all, and agents have no tool to score bids, announce a winner, sign, approve or pay.")}</p></div></div>
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("การทำงานทั้งหมด", "Runs")}</span><span class="v">${S.agentRuns.length}</span></div>
    <div class="kpi"><span class="l">${L("รอคุณอนุมัติ", "Waiting for a person")}</span><span class="v">${S.agentRuns.filter(r => r.status === "waiting").length}</span></div>
    <div class="kpi"><span class="l">${L("เวลาก่อนอนุมัติ (ค่ากลาง)", "Time before approving (median)")}</span><span class="v">${secs.length ? fmt(med(secs), 1) : "—"}<small>${secs.length ? L(" วินาที", " s") : ""}</small></span></div>
    <div class="kpi"><span class="l">${L("อนุมัติเร็วผิดปกติ", "Unusually fast approvals")}</span><span class="v">${fast}<small>${dec.length ? ` / ${dec.length}` : ""}</small></span><span class="d sub">&lt; ${S.pcfg.fastApproveSec} ${L("วินาที", "s")}</span></div>
  </section>
  <section class="panel"><header><h2>${L("สั่งงาน Agent", "Give an agent a goal")}</h2></header><div class="body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px">
    ${goal("AG-11", `<span class="sub">${L("เป้าหมาย: เตรียมแฟ้มให้พร้อมประกาศ", "Goal: get the case ready for the notice")}</span><select id="ag11-case" aria-label="${L("แฟ้ม", "Case")}">${openCases11.map(c => `<option value="${c.id}">${c.id} · ${esc(caseName(c))} (${caseState(c)}/12)</option>`).join("") || `<option value="">${L("ไม่มีแฟ้มที่ขั้น 3 หรือ 4", "No case at step 3 or 4")}</option>`}</select><button class="btn primary" type="button" data-agrun="AG-11" ${openCases11.length && isProcRole() ? "" : "disabled"}>${L("เริ่ม", "Start")}</button>`)}
    ${goal("AG-12", `<span class="sub">${L("เป้าหมาย: ตรวจสัญญาทุกฉบับวันนี้", "Goal: check every contract today")}</span><button class="btn primary" type="button" data-agrun="AG-12" ${isProcRole() || canSpend() ? "" : "disabled"}>${L("เริ่ม", "Start")}</button>`)}
    ${goal("AG-13", `<span class="sub">${L("เป้าหมาย: รายงานสรุปผลรายเดือน", "Goal: monthly summary")}</span><select id="ag13-m" aria-label="${L("เดือน", "Month")}">${repMonths().map(m => `<option value="${m}">${monthLabel(m)}</option>`).join("")}</select><button class="btn primary" type="button" data-agrun="AG-13" ${isProcRole() ? "" : "disabled"}>${L("เริ่ม", "Start")}</button>`)}
    ${goal("AG-10", `<span class="sub">${L("คำถามที่ต้องหลายขั้น (อ่านอย่างเดียว)", "A multi-step question (read only)")}</span><input type="text" id="ag10-q" value="${L("ทำไมการส่งมอบและเบิกจ่ายช้า", "Why are deliveries and payments slow")}" aria-label="${L("คำถาม", "Question")}"><button class="btn primary" type="button" data-agrun="AG-10">${L("ถาม", "Ask")}</button>`)}
  </div></section>
  ${run ? runView(run) : ""}
  <section class="panel"><header><h2>${L("การทำงานล่าสุด", "Recent runs")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "Run")}</th><th>Agent</th><th>${L("เป้าหมาย", "Goal")}</th><th>${L("ระดับ", "Level")}</th><th>${L("ความคืบหน้า", "Progress")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${S.agentRuns.slice().reverse().slice(0, 12).map(r => `<tr><td class="mono">${r.id}</td><td>${agName(r.agent)}</td><td class="sub">${esc(r.target)}</td><td>${r.level}</td><td class="sub">${r.steps.filter(s => s.status !== "pending" && s.status !== "await").length}/${r.steps.length}</td><td>${tag(tx({ running: ["ทำงาน", "Running"], waiting: ["รอคน", "Waiting"], done: ["เสร็จ", "Done"], stopped: ["หยุด", "Stopped"] }[r.status]), r.status === "waiting" ? "p-warn" : r.status === "done" ? "p-ok" : "p-mute")}</td><td><button class="btn" type="button" data-runopen="${r.id}">${RUN_OPEN === r.id ? L("ปิด", "Close") : L("เปิด", "Open")}</button></td></tr>`).join("") || `<tr><td colspan="7" class="sub">${L("ยังไม่มี", "None yet")}</td></tr>`}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("ทะเบียนเครื่องมือและระดับความเป็นอิสระ", "Tool register and autonomy levels")}</h2><span class="sp"></span><span class="sub">FR-PR-59 · ${L("ผู้บริหารตั้งระดับ", "the executive sets levels")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>Agent</th><th>${L("ระดับ", "Level")}</th><th>${L("เครื่องมือ", "Tools")}</th></tr></thead><tbody>${[...AGENTS_Q6.map(a => a[0]), "AG-10"].map(id => `<tr><td>${agName(id)} <span class="mono sub">${id}</span></td>
      <td>${exec && id !== "AG-10" ? `<div class="row" style="flex-wrap:nowrap"><select data-aglvl="${id}" aria-label="${L("ระดับ", "Level")}">${Object.keys(AG_LEVELS).filter(k => k !== "L3" || id === "AG-12").map(k => `<option value="${k}" ${agLevel(id) === k ? "selected" : ""}>${k} ${tx(AG_LEVELS[k])}</option>`).join("")}</select><input type="text" id="aglw-${id}" placeholder="${L("เหตุผล", "Reason")}" style="min-width:110px"><button class="btn" type="button" data-aglset="${id}">${L("ตั้ง", "Set")}</button></div>` : `${agLevel(id)} ${tx(AG_LEVELS[agLevel(id)])}`}</td>
      <td class="sub">${Object.keys(TOOLS).filter(k => TOOLS[k][3].includes(id)).map(k => `${tag(tx([KIND_TAG[TOOLS[k][0]][0], KIND_TAG[TOOLS[k][0]][1]]), KIND_TAG[TOOLS[k][0]][2])} ${tx([TOOLS[k][1], TOOLS[k][2]])}`).join("<br>")}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("ไม่มีในทะเบียน", "Not in the register")}: ${NOT_IN_REGISTER.map(x => tx(x)).join(" · ")} · ${L("L3 ใช้ได้เฉพาะงานที่ไม่เปลี่ยนข้อมูลธุรกรรม (AG-12)", "L3 is only for work that changes no transaction data (AG-12)")}</div></section>`;
};
function runView(run) {
  const cur = run.steps[run.ptr];
  return `<section class="panel"><header><h2><span class="mono">${run.id}</span> · ${agName(run.agent)} · ${esc(run.target)}</h2><span class="sp"></span>${tag(`${run.level} ${tx(AG_LEVELS[run.level])}`, "p-info")}${run.status === "waiting" || run.status === "running" ? `<button class="btn danger" type="button" id="run-stop">${L("หยุดทั้งแผน", "Stop the plan")}</button>` : ""}</header>
    <div class="body"><ol class="timeline">${run.steps.map((s, i) => { const t = TOOLS[s.tool], k = KIND_TAG[t[0]], st = ST_ICON[s.status];
      return `<li class="${["done", "approved", "edited"].includes(s.status) ? "done" : i === run.ptr && run.status === "waiting" ? "now" : ""}"><span class="dot"></span><div style="min-width:0"><b style="font-weight:600">${i + 1}. ${tx([t[1], t[2]])}</b> ${tag(tx([k[0], k[1]]), k[2])} ${tag(tx([st[0], st[1]]), st[2])}${s.ms != null ? ` <span class="sub">${s.ms} ms</span>` : ""}
        ${s.out ? `<div class="sub" style="margin-top:4px">${s.out}</div>` : ""}
        ${s.change ? `<div class="callout" style="margin:6px 0 0;padding:8px 10px"><span class="sub">${esc(s.change.what)}</span><div>${esc(s.change.before)} → <b>${esc(s.change.after)}</b></div>
          ${s.status === "await" && i === run.ptr ? (canApprove(run, s) ? `<div class="row" style="margin-top:6px">${s.change.editable ? `<input type="${s.change.editable}" id="step-val" value="${esc(s.value ?? "")}" style="min-width:140px" aria-label="${esc(s.change.what)}">` : ""}<button class="btn primary" type="button" id="step-ok">${L("อนุมัติขั้นนี้", "Approve this step")}</button><button class="btn" type="button" id="step-skip">${L("ข้าม", "Skip")}</button></div>` : `<div class="sub" style="margin-top:6px">${L("ผู้อนุมัติต้องเป็นผู้มีสิทธิ์ทำรายการนี้เอง", "Only someone allowed to do this action can approve it")}</div>`) : ""}
          ${s.decidedBy ? `<div class="sub">${esc(userName(s.decidedBy))} · ${fmt(s.decidedMs / 1000, 1)} ${L("วินาที", "s")}</div>` : ""}</div>` : ""}</div></li>`; }).join("")}</ol>
      ${run.status === "done" ? `<div class="callout" style="margin:8px 0 0"><b>${L("สรุป", "Summary")}</b> ${run.steps.filter(s => ["done", "approved", "edited"].includes(s.status)).length} ${L("ขั้นเสร็จ", "steps done")} · ${run.steps.filter(s => s.status === "suggested").length} ${L("ขั้นเสนอเท่านั้น", "suggested only")} · ${run.steps.filter(s => s.status === "skipped").length} ${L("ข้าม", "skipped")} · ${run.steps.filter(s => s.status === "blocked").length} ${L("ทำไม่ได้", "couldn't be done")}${run.agent === "AG-11" ? `<div class="sub">${L("ที่เหลือเป็นงานของคน: กรรมการแจ้งผลประโยชน์ทับซ้อน และบันทึกการประกาศใน e-GP", "Left for people: committee members declare conflicts, and the e-GP notice is recorded")}</div>` : ""}</div>` : ""}</div></section>`;
}
function bindAgents() {
  const done = m => { commit(); renderShell(); route(); if (m) toast(m); };
  $$("[data-agrun]").forEach(b => (b.onclick = () => {
    const id = b.dataset.agrun; if (!agentOn(id)) { toast(L(`${agName(id)} ถูกปิดใช้งานใน M09`, `${agName(id)} is switched off in M09`)); return; }
    const target = id === "AG-11" ? $("#ag11-case").value : id === "AG-13" ? $("#ag13-m").value : id === "AG-10" ? $("#ag10-q").value.trim() : "ALL";
    if (!target) return; const r = startRun(id, target); RUN_OPEN = r.id; audit(["สั่งงาน Agent", "Started an agent"], `${r.id} ${id} ${target}`); done(r.status === "waiting" ? L("Agent หยุดรอคุณอนุมัติ", "The agent is waiting for your approval") : L("Agent ทำงานเสร็จ", "The agent finished"));
  }));
  $$("[data-runopen]").forEach(b => (b.onclick = () => { RUN_OPEN = RUN_OPEN === b.dataset.runopen ? null : b.dataset.runopen; route(); }));
  $$("[data-aglset]").forEach(b => (b.onclick = () => { const id = b.dataset.aglset, lv = $(`[data-aglvl="${id}"]`).value, why = $(`#aglw-${id}`).value.trim();
    if (lv === agLevel(id)) return; if (why.length < 5) { toast(L("ระบุเหตุผลการเปลี่ยนระดับ", "Give a reason for the change")); return; }
    if (lv === "L3" && id !== "AG-12") { toast(L("L3 ใช้ได้เฉพาะ AG-12", "L3 is only for AG-12")); return; }
    const old = agLevel(id); S.agentLevels[id] = lv; audit(["เปลี่ยนระดับความเป็นอิสระของ Agent", "Changed an agent's autonomy level"], `${id} ${old} → ${lv} · ${why}`);
    notify(["audit"], [`${id} เปลี่ยนระดับ ${old} → ${lv}`, `${id} level changed ${old} → ${lv}`], "prc-agents"); done(L("บันทึกแล้ว แจ้งผู้ตรวจสอบแล้ว", "Saved; Audit notified")); }));
  const run = S.agentRuns.find(r => r.id === RUN_OPEN); if (!run) return;
  const st = $("#run-stop"); if (st) st.onclick = () => { run.steps.slice(run.ptr).forEach(s => { if (s.status === "pending" || s.status === "await") s.status = "stopped"; }); run.status = "stopped"; audit(["หยุดแผนของ Agent", "Stopped an agent's plan"], run.id); done(); };
  const decide = ok => { const s = run.steps[run.ptr]; if (!canApprove(run, s)) { toast(L("คุณไม่มีสิทธิ์ทำรายการนี้", "You aren't allowed to do this")); return; }
    const val = $("#step-val") ? $("#step-val").value : null;
    if (ok) { const err = applyStep(run, s, val); if (err) { toast(err); return; } s.status = val != null && String(val) !== String(s.value ?? "") ? "edited" : "approved"; }
    else s.status = "skipped";
    s.decidedBy = me().id; s.decidedMs = Date.now() - (s.awaitMs || Date.now());
    audit([ok ? "อนุมัติขั้นของ Agent" : "ข้ามขั้นของ Agent", ok ? "Approved an agent step" : "Skipped an agent step"], `${run.id} ${run.steps.indexOf(s) + 1} ${s.tool}`);
    run.ptr++; run.status = "running"; advance(run); done();
  };
  const ok = $("#step-ok"); if (ok) ok.onclick = () => decide(true);
  const sk = $("#step-skip"); if (sk) sk.onclick = () => decide(false);
}
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "agents") bindAgents(); };
}
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.agentRuns) return;
    S.agentTasks.filter(t => (t.role === ROLE || (t.role === "proc" && isProcRole()) || (ROLE === "divhead" && t.role === "div")) && (!t.unit || t.unit === me().unit)).forEach(t => R(`${t.title}`, `${t.agent} · ${t.run}`, t.due, t.link, "p-info"));
    S.agentRuns.filter(r => r.status === "waiting" && canApprove(r, r.steps[r.ptr])).forEach(r => R(`${L("Agent รออนุมัติ", "An agent is waiting for you")} ${r.id}`, `${agName(r.agent)} · ${tx([TOOLS[r.steps[r.ptr].tool][1], TOOLS[r.steps[r.ptr].tool][2]])}`, TODAY, "prc-agents", "p-warn"));
  };
}
function seedAgents(s) {
  AGENTS_Q6.forEach(([id, name, what]) => { if (!s.agents.some(a => a.id === id)) s.agents.push({ id, on: true, uses: 0, name, what }); });
  s.agentLevels = Object.fromEntries(AGENTS_Q6.map(a => [a[0], a[3]]).concat([["AG-10", "L0"]]));
  s.agentRuns = []; s.agentTasks = [];
  Object.assign(s.pcfg, { agentMaxSteps: 14, watchRisk: 20, fastApproveSec: 3 });
}
