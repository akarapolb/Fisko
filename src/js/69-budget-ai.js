// Fisko Budget round B6: AI and analytics for the Budget module (design chapters 10 and 11).
// - Budget agents as multi-step runs (FR, chapter 10.1): an agent plans steps from a template, runs read and
//   draft steps on the real data, and stops for a person at every step that changes data or notifies people.
//   Simulated (D-P09): no model is called; each step runs an existing rule or calculation.
// - Forecasts FC-B1 to 3, what-if WI-B1 to 4 (nothing is changed), KPI-B01 to 10 and warning signals BF-01 to 06.
const B_AG = {
  "AG-02": { goal: ["ตรวจคำขอที่รอกองแผนทั้งหมด", "Check every request waiting for Planning"], plan: () => [["req.read"], ["rules.run"], ["unit.notify"]] },
  "AG-03": { goal: ["วิเคราะห์ 3R และเสนอวงเงินรอบ 2", "Run 3R and propose round-2 amounts"], plan: () => [["req.read"], ["exec.read"], ["r3.compute"], ["review.write"]] },
  "AG-04": { goal: ["หาชุดคำขอที่ดีที่สุดภายใต้กรอบ", "Find the best set of requests under the ceiling"], plan: () => [["req.read"], ["optimise"], ["options.draft"]] },
  "AG-05": { goal: ["เฝ้าการเบิกจ่ายปีนี้และแจ้งกองที่เสี่ยง", "Watch this year's spending and alert units at risk"], plan: () => [["lines.read"], ["forecast.run"], ["signals.read"], ["task.create"]] },
  "AG-15": { goal: ["หาแหล่งเงินให้รายการที่ต้องการเพิ่ม", "Find money for a line that needs more"], plan: () => [["lines.read"], ["sources.find"], ["transfer.classify"], ["transfer.draft"]] },
  "AG-17": { goal: ["รวบรวมรายงานไตรมาส 4 และติดตามกองที่ยังไม่ส่ง", "Collect Q4 reports and chase late units"], plan: () => [["reports.read"], ["report.draft"], ["unit.remind"]] },
};
const B_TOOL = {
  "req.read": ["read", ["อ่านคำขอ", "Read requests"]], "rules.run": ["read", ["ตรวจกฎ BR ทุกข้อ", "Run every BR rule"]], "unit.notify": ["write", ["แจ้งกองที่มีประเด็น", "Notify units with issues"]],
  "exec.read": ["read", ["อ่านผลเบิกจ่ายปีก่อนและเงินกัน", "Read last year's spending and carry-overs"]], "r3.compute": ["propose", ["คำนวณ Review Redeploy Replace", "Compute Review, Redeploy, Replace"]], "review.write": ["write", ["บันทึกเป็นวงเงินรอบ 2", "Write round-2 amounts"]],
  "optimise": ["propose", ["เลือกชุดคำขอ 3 แบบ", "Choose three sets of requests"]], "options.draft": ["draft", ["ร่างทางเลือกเสนอผู้บริหาร", "Draft the options for the executive"]],
  "lines.read": ["read", ["อ่านยอด 4 ระดับของทุกบรรทัด", "Read four-level balances"]], "forecast.run": ["propose", ["พยากรณ์เบิกจ่ายสิ้นปี (FC-B1)", "Forecast year-end spending (FC-B1)"]], "signals.read": ["read", ["อ่านสัญญาณเตือน BF", "Read BF warning signals"]], "task.create": ["write", ["สร้างงานให้กองที่เสี่ยง", "Create tasks for units at risk"]],
  "sources.find": ["propose", ["หาบรรทัดที่มีเงินเหลือหรือช้ากว่าแผน", "Find lines with savings or slow spending"]], "transfer.classify": ["read", ["จัดประเภทการโอน (R-B-01)", "Classify the transfer (R-B-01)"]], "transfer.draft": ["write", ["ยื่นคำขอโอน (รออนุมัติตามอำนาจ)", "File the transfer (awaits approval)"]],
  "reports.read": ["read", ["อ่านสถานะรายงานไตรมาส", "Read quarterly report status"]], "report.draft": ["draft", ["ร่างสรุปผลรายไตรมาส", "Draft the quarterly summary"]], "unit.remind": ["write", ["เตือนกองที่ยังไม่ส่ง", "Remind units that haven't reported"]],
};
const bAgName = id => { const a = (S.agents || []).find(x => x.id === id); return a ? tx(a.name) : id; };
let B_RUN_OPEN = null, B_AG_GOAL = {};

// ---------- step execution ----------
const B_EXEC = {
  "req.read": (r, s) => { const q = S.requests.filter(x => x.status === "plan"); r.memo.reqs = q.map(x => x.id); s.out = L(`${S.requests.length} คำขอ · รอกองแผน ${q.length}`, `${S.requests.length} requests · ${q.length} waiting for Planning`); return "done"; },
  "rules.run": (r, s) => { const res = (r.memo.reqs || []).map(id => { const q = S.requests.find(x => x.id === id); return { id, unit: q.unit, bad: checks(q).filter(c => c.s !== "ok").map(c => c.title) }; }); r.memo.res = res; s.out = res.map(x => `${x.id}: ${x.bad.length ? x.bad.join(", ") : L("ผ่าน", "passes")}`).join("<br>") || L("ไม่มีคำขอที่รอ", "Nothing waiting"); return "done"; },
  "unit.notify": (r, s) => { const bad = (r.memo.res || []).filter(x => x.bad.length); if (!bad.length) { s.out = L("ไม่มีกองที่ต้องแจ้ง", "No unit to notify"); return "skipped"; } s.change = bad.map(x => `${unitName(x.unit)} · ${x.id} (${x.bad.length})`).join("<br>"); return "await"; },
  "exec.read": (r, s) => { const slow = (S.dash.units || []).filter(u => u.plan && u.actual / u.plan < 0.7); s.out = L(`ปีก่อน ${slow.length} กองเบิกจ่ายต่ำกว่า 70% ของแผน · เงินกันค้าง ${(S.carry.prev || []).filter(c => c.status !== "closed").length} รายการ`, `Last year ${slow.length} units spent under 70% of plan · ${(S.carry.prev || []).filter(c => c.status !== "closed").length} open carry-overs`); return "done"; },
  "r3.compute": (r, s) => { const t = threeR(); r.memo.r3 = t.rows.filter(x => x.d && x.r.status === "plan").map(x => ({ id: x.r.id, d: x.d, why: x.why })); s.out = L(`ลดได้ ${mb(t.pool)} ลบ. · นำไปใช้ ${mb(t.used)} ลบ.`, `Frees ${mb(t.pool)} M · moves ${mb(t.used)} M`); return "done"; },
  "review.write": (r, s) => { const m = r.memo.r3 || []; if (!m.length) { s.out = L("ไม่มีคำขอที่รอกองแผนให้ปรับ", "No requests in Planning review to change"); return "skipped"; } s.change = m.map(x => `${x.id}: ${x.d > 0 ? "+" : "−"}${mb(Math.abs(x.d))} ${L("ลบ.", "M")}`).join("<br>"); return "await"; },
  "optimise": (r, s) => {
    const cap = S.cons.projCeiling * 1e6, items = projReqs().filter(x => x.status !== "rejected").map(x => ({ r: x, s: scoreOf(x), a: x.amount }));
    const pick = order => { let left = cap; const out = []; order.forEach(x => { if (x.a <= left) { out.push(x); left -= x.a; } }); return out; };
    const A = pick(items.slice().sort((a, b) => b.s - a.s)), B = pick(items.slice().sort((a, b) => b.s / b.a - a.s / a.a)), C = pick([...items.filter(x => x.r.multi || x.r.prev > 0).sort((a, b) => b.s - a.s), ...items.filter(x => !(x.r.multi || x.r.prev > 0)).sort((a, b) => b.s - a.s)]);
    r.memo.opts = [[L("ตามคะแนนสูงสุด", "Highest score first"), A], [L("คะแนนต่อบาทสูงสุด", "Most score per baht"), B], [L("ปกป้องงานต่อเนื่องก่อน", "Continuing work first"), C]];
    s.out = r.memo.opts.map(([n, set]) => `${n}: ${set.length} ${L("คำขอ", "requests")} · ${L("คะแนนรวม", "total score")} ${fmt(sumv(set.map(x => x.s)), 0)} · ${mb(sumv(set.map(x => x.a)))} ${L("ลบ.", "M")}`).join("<br>"); return "done";
  },
  "options.draft": (r, s) => { s.out = (r.memo.opts || []).map(([n, set], i) => `<b>${L("ทางเลือก", "Option")} ${i + 1} · ${n}</b><br>${set.map(x => `${x.r.id} ${esc(tx(x.r.name))}`).join(", ")}`).join("<br><br>") + `<br><span class="sub">${L("เป็นข้อเสนอ ไม่ได้ตัดวงเงินจริง", "A proposal only; no amounts were changed")}</span>`; return "done"; },
  "lines.read": (r, s) => { const A = S.allocs[B4_FY]; r.memo.lines = A ? A.lines.map(l => ({ id: l.id, b: bal(l), l })) : []; s.out = L(`${r.memo.lines.length} บรรทัด · ใช้ได้รวม ${mb(sumv(r.memo.lines.map(x => x.b.avail)))} ลบ.`, `${r.memo.lines.length} lines · ${mb(sumv(r.memo.lines.map(x => x.b.avail)))} M available`); return "done"; },
  "forecast.run": (r, s) => { const f = fcYear(); r.memo.fc = f; s.out = L(`คาดเบิกจ่ายสิ้นปี ${fmt(f.p50, 1)}% (ช่วง ${fmt(f.p10, 1)}–${fmt(f.p90, 1)}%) · เป้า ${spendT().end.all}%`, `Year-end spend expected ${fmt(f.p50, 1)}% (range ${fmt(f.p10, 1)}–${fmt(f.p90, 1)}%) · target ${spendT().end.all}%`); return "done"; },
  "signals.read": (r, s) => { const f = bSignals(); r.memo.sig = f; s.out = f.length ? f.map(x => `${x.id} ${esc(x.text)}`).join("<br>") : L("ไม่มีสัญญาณ", "No signals"); return "done"; },
  "task.create": (r, s) => { const risky = (r.memo.lines || []).filter(x => x.l.type === "inv" && x.b.res + x.b.com === 0); if (!risky.length) { s.out = L("ไม่มีกองที่เสี่ยง", "No unit at risk"); return "skipped"; } r.memo.tasks = risky.map(x => ({ role: "div", unit: x.l.unit, title: `${L("เร่งก่อหนี้ผูกพันงบลงทุน", "Commit the investment line")} ${x.l.id} ${tx(x.l.name)}`, link: "alloc-balance" })); s.change = r.memo.tasks.map(t => `${unitName(t.unit)} · ${esc(t.title)}`).join("<br>"); return "await"; },
  "sources.find": (r, s) => { const need = r.memo.need || 1e6, src = (r.memo.lines || []).filter(x => x.id !== r.memo.to && x.b.avail > 0 && x.l.type !== "per").map(x => { const sav = S.contracts.filter(c => c.line === x.id).reduce((a, c) => a + Math.max(0, famPlan(c.plan).est - c.amount), 0); return { ...x, sav, score: sav ? 2 : x.l.type === "ope" ? 1 : 0 }; }).sort((a, b) => b.score - a.score || b.b.avail - a.b.avail);
    r.memo.src = src[0] || null; s.out = src.slice(0, 3).map(x => `${x.id} ${esc(tx(x.l.name))} · ${L("ใช้ได้", "avail.")} ${mb(x.b.avail)}${x.sav ? ` · ${L("เหลือจ่าย", "saving")} ${mb(x.sav)}` : ""}`).join("<br>") || L("ไม่พบแหล่งเงิน", "No source found"); return src.length ? "done" : "blocked"; },
  "transfer.classify": (r, s) => { if (!r.memo.src) return "blocked"; const ty = classifyTransfer({ from: r.memo.src.id, to: r.memo.to }); r.memo.ty = ty; s.out = `${ty} · ${tx(TR_TYPE[ty][0])} · ${tx(TR_TYPE[ty][3])}`; return "done"; },
  "transfer.draft": (r, s) => { if (!r.memo.src) return "blocked"; const amt = Math.min(r.memo.need, r.memo.src.b.avail); r.memo.amt = amt; s.change = `${r.memo.src.id} → ${r.memo.to} · ${mb(amt)} ${L("ลบ.", "M")} · ${r.memo.ty} · ${tx(TR_WHY.eff)}`; return "await"; },
  "reports.read": (r, s) => { const un = qrUnits(), miss = un.filter(u => !["submitted", "accepted"].includes((qrOf("Q4", u) || {}).status)); r.memo.miss = miss; s.out = L(`ส่งแล้ว ${un.length - miss.length}/${un.length} · ยังไม่ส่ง: ${miss.map(unitName).join(", ") || "-"}`, `${un.length - miss.length}/${un.length} sent · missing: ${miss.map(unitName).join(", ") || "-"}`); return "done"; },
  "report.draft": (r, s) => { const ok = qrUnits().filter(u => ["submitted", "accepted"].includes((qrOf("Q4", u) || {}).status)); s.out = ok.map(u => { const q = qrOf("Q4", u); return `<b>${unitName(u)}</b>: ${qrItems(u).map(({ id, o }) => `${esc(tx(o.name))} ${q.items[id] && q.items[id].result != null ? fmtv(q.items[id].result) : "–"}/${fmtv(o.target)}`).join(" · ")}`; }).join("<br>") || L("ยังไม่มีรายงาน", "No reports yet"); return "done"; },
  "unit.remind": (r, s) => { const m = r.memo.miss || []; if (!m.length) { s.out = L("ทุกกองส่งแล้ว", "Every unit has reported"); return "skipped"; } s.change = m.map(u => `${unitName(u)} · ${L("ไตรมาส 4 เลยกำหนด", "Q4 overdue")}`).join("<br>"); return "await"; },
};
function bApply(r, s) {
  switch (s.tool) {
    case "unit.notify": (r.memo.res || []).filter(x => x.bad.length).forEach(x => notify(["div"], [`${r.agent}: คำขอ ${x.id} มี ${x.bad.length} ประเด็นต้องแก้`, `${r.agent}: request ${x.id} has ${x.bad.length} issues to fix`], "req:" + x.id)); break;
    case "review.write": (r.memo.r3 || []).forEach(x => { const row = S.review.find(v => v.id === x.id), q = S.requests.find(v => v.id === x.id); if (!row || !q) return; const nv = Math.round((q.amount + x.d) / 1e5) / 10, old = row.r1; row.r1 = nv; if (row.r2 === old) row.r2 = nv; S.log.unshift({ t: nowIso(), role: "plan", text: [`รอบ 2 · ${tx(q.name)} ปรับจาก ${old} เป็น ${nv} ล้านบาท`, `Round 2 · ${tx(q.name)} changed from ${old} to ${nv} million baht`], why: [`${r.agent}: ${x.why.join(" · ")}`, `${r.agent}: ${x.why.join(" · ")}`] }); }); break;
    case "task.create": S.agentTasks = S.agentTasks || []; (r.memo.tasks || []).forEach(t => S.agentTasks.push(Object.assign({ agent: r.agent, run: r.id, due: addDays(TODAY, 7) }, t))); break;
    case "transfer.draft": { const A = S.allocs[B4_FY], t = { id: `TR-${B4_FY}-${String(A.transfers.length + 1).padStart(3, "0")}`, from: r.memo.src.id, to: r.memo.to, amount: r.memo.amt, why: [`เสนอโดย ${r.agent}`, `Proposed by ${r.agent}`], reason: "eff", status: "pending", t: nowIso(), by: me().id }; t.type = classifyTransfer(t); A.transfers.push(t); notify([TR_TYPE[t.type][1] === "fin" ? "fin" : "exec"], [`มีคำขอโอน ${t.id} (${t.type}) จาก ${r.agent} รออนุมัติ`, `Transfer ${t.id} (${t.type}) from ${r.agent} awaits approval`], "alloc-transfers"); break; }
    case "unit.remind": notify(["div"], [`${r.agent}: รายงานไตรมาส 4 เลยกำหนด กรุณาส่ง`, `${r.agent}: your Q4 report is overdue`], "perf-quarter"); break;
  }
}
function bAdvance(r) {
  while (r.ptr < r.steps.length && r.status === "running") {
    const s = r.steps[r.ptr];
    s.status = B_EXEC[s.tool](r, s); s.at = nowIso();
    S.aiLog.unshift({ t: nowIso(), agent: r.agent, user: me().id, action: B_TOOL[s.tool][1], target: r.id, sources: 1, ok: s.status !== "blocked", ver: "budget-agent-sim-1" });
    if (s.status === "await") { r.status = "waiting"; return; }
    if (s.status === "blocked") { r.status = "stopped"; return; }
    r.ptr++;
  }
  if (r.ptr >= r.steps.length && r.status === "running") r.status = "done";
}
function bStart(agent, opts) {
  S.bRuns = S.bRuns || [];
  const r = { id: "BRUN-" + String(S.bRuns.length + 1).padStart(3, "0"), agent, by: me().id, t: nowIso(), status: "running", ptr: 0, memo: Object.assign({}, opts || {}), steps: B_AG[agent].plan().map(([tool]) => ({ tool, status: "pending", out: "" })) };
  S.bRuns.push(r); bAdvance(r); B_RUN_OPEN = r.id; return r;
}
const bCanApprove = r => ({ "AG-02": ["plan"], "AG-03": ["plan"], "AG-05": ["fin", "exec"], "AG-15": ["fin"], "AG-17": ["plan"] }[r.agent] || []).includes(ROLE);

// ---------- forecasts ----------
function fcYear() {
  const A = S.allocs[B4_FY]; if (!A) return { p10: 0, p50: 0, p90: 0, carry: 0, rows: [] };
  const C = bcfg().fc, P = Object.fromEntries(Object.entries(C.p).map(([k, v]) => [k, v / 100])), end = `${B4_FY - 543}-09-30`;
  const rows = A.lines.map(l => {
    const b = bal(l), cs = S.contracts.filter(c => c.line === l.id), dueIn = sumv(cs.flatMap(c => c.phases.filter(ph => !ph.cancelled && ph.due <= end).map(ph => ph.amount))), dueOut = sumv(cs.flatMap(c => c.phases.filter(ph => !ph.cancelled && ph.due > end).map(ph => ph.amount)));
    const free = Math.max(0, b.allot - b.com - b.res), exp = Math.min(b.allot, Math.max(b.paid, dueIn) + b.res * C.res / 100 + free * (P[l.type] != null ? P[l.type] : 0.85));
    return { l, b, exp, carry: dueOut + (l.type === "inv" ? free * C.invCarry / 100 : 0) };
  });
  const tot = sumv(rows.map(x => x.b.allot)) || 1, p50 = sumv(rows.map(x => x.exp)) / tot * 100, spread = Math.max(2, (sumv(rows.filter(x => x.l.type === "inv").map(x => x.b.allot)) / tot) * 25);
  return { p10: Math.max(0, p50 - spread), p50, p90: Math.min(100, p50 + spread * 0.6), carry: sumv(rows.map(x => x.carry)), rows };
}

// ---------- signals BF-01 to 06 ----------
function bSignals() {
  const out = [], A = S.allocs[B4_FY], G = bcfg().sig;
  if (A) {
    A.lines.filter(l => l.type === "ope" && l.amount && l.plan[11] / l.amount > G.sept / 100).forEach(l => out.push({ id: "BF-01", text: L(`${l.id} วางแผนใช้เดือนกันยายน ${fmt(l.plan[11] / l.amount * 100, 0)}%`, `${l.id} plans ${fmt(l.plan[11] / l.amount * 100, 0)}% in September`), link: "alloc-plan" }));
    const ap = A.transfers.filter(t => t.status === "approved"); A.lines.filter(l => ap.some(t => t.from === l.id) && ap.some(t => t.to === l.id)).forEach(l => out.push({ id: "BF-02", text: L(`${l.id} โอนออกและรับเข้าในปีเดียว`, `${l.id} moved money out and back in the same year`), link: "alloc-transfers" }));
    A.lines.filter(l => l.type === "inv" && bal(l).res + bal(l).com === 0).forEach(l => out.push({ id: "BF-03", text: L(`${l.id} ${tx(l.name)} ยังไม่มีการจองหรือผูกพัน`, `${l.id} ${tx(l.name)} has no reservation or commitment`), link: "alloc-balance" }));
  }
  S.requests.filter(r => typeof rolled === "function" && rolled(r) && (lastYearRate(r.unit) || 1) < G.lyRate / 100).forEach(r => out.push({ id: "BF-04", text: L(`${r.id} ยกยอดจากปีก่อน แต่ปีก่อนกองเบิกจ่าย ${fmt(lastYearRate(r.unit) * 100, 0)}%`, `${r.id} rolled over while the unit spent ${fmt(lastYearRate(r.unit) * 100, 0)}% last year`), link: "req:" + r.id }));
  S.dash.projects.filter(p => S.perf.outputs[p.id] && p.alloc && p.actual / p.alloc > G.spend / 100 && (S.perf.outputs[p.id].result || 0) / S.perf.outputs[p.id].target < G.out / 100).forEach(p => out.push({ id: "BF-05", text: L(`${tx(p.name)} ใช้เงิน ${fmt(p.actual / p.alloc * 100, 0)}% แต่ผลผลิตต่ำกว่าครึ่ง`, `${tx(p.name)} spent ${fmt(p.actual / p.alloc * 100, 0)}% but delivered under half`), link: "perf-cost" }));
  const cut = (S.review || []).filter(v => v.r1 < v.r0).map(v => Math.round(v.r1 / v.r0 * 100));
  if (cut.length >= G.eqMin && cut.every(x => x === cut[0])) out.push({ id: "BF-06", text: L(`ปรับลดทุกคำขอเท่ากัน ${100 - cut[0]}%`, `Every request cut by the same ${100 - cut[0]}%`), link: "rev-rounds" });
  return out;
}

// ---------- KPI-B ----------
function kpiB() {
  const A = S.allocs[B4_FY], L4 = A ? A.lines.map(l => ({ l, b: bal(l) })) : [], sum = (k, f = () => true) => sumv(L4.filter(x => f(x.l)).map(x => x.b[k])), inv = l => l.type === "inv";
  const T = spendT(), qi = 0, dp = S.dash.projects, units = qrUnits();
  const onTime = Object.keys(S.qrep || {}).flatMap(q => units.map(u => ({ q, u, x: qrOf(q, u) }))).filter(z => z.x && z.x.t), due = q => (QR_ROUNDS().find(x => x.id === q) || {}).due;
  const ks = allKpis().map(x => S.perf.kpis[x.k.id]).filter(p => p && p.result != null), invReq = S.requests.filter(r => r.items.some(i => i.type === "inv") && r.ready);
  const rev = S.review || [], cost = dp.filter(p => S.perf.outputs[p.id] && S.perf.outputs[p.id].result && S.perf.outputs[p.id].target).map(p => (p.actual / S.perf.outputs[p.id].result) / (p.plan / S.perf.outputs[p.id].target));
  const carry = (S.carry && S.carry.prev) || [];
  return [
    ["KPI-B01", L("อัตราเบิกจ่ายเทียบเป้า", "Spend rate vs target"), `${fmt(sum("allot") ? sum("paid") / sum("allot") * 100 : 0, 1)}% / ${T.q[qi]}%`, L("เบิกจ่ายสะสม ÷ จัดสรร เทียบเป้าไตรมาส", "Paid ÷ allotted vs the quarter target")],
    ["KPI-B02", L("อัตราก่อหนี้งบลงทุน", "Investment committed"), `${fmt(sum("allot", inv) ? sum("com", inv) / sum("allot", inv) * 100 : 0, 1)}%`, L("ผูกพันลงทุน ÷ จัดสรรลงทุน", "Investment committed ÷ allotted")],
    ["KPI-B03", L("ความแม่นของแผน (ปีก่อน)", "Plan accuracy (last year)"), `${fmt((1 - Math.abs(sumv(dp.map(p => p.actual)) - sumv(dp.map(p => p.plan))) / (sumv(dp.map(p => p.plan)) || 1)) * 100, 1)}%`, L("1 − |จริง − แผน| ÷ แผน", "1 − |actual − plan| ÷ plan")],
    ["KPI-B04", L("สัดส่วนการโอน", "Share transferred"), `${fmt(A ? sumv(A.transfers.filter(t => t.status === "approved").map(t => t.amount)) / (sum("allot") || 1) * 100 : 0, 2)}%`, L("วงเงินที่โอนแล้ว ÷ จัดสรร", "Approved transfers ÷ allotted")],
    ["KPI-B05", L("เงินกันเหลื่อมปีเบิกได้", "Carry-over spent"), `${fmt(sumv(carry.map(c => c.amount)) ? sumv(carry.map(c => c.paid)) / sumv(carry.map(c => c.amount)) * 100 : 0, 1)}%`, L("เบิกจ่ายเงินกัน ÷ ยอดกัน", "Carry-over paid ÷ carried")],
    ["KPI-B06", L("อัตราได้รับ (ในการพิจารณา)", "Amount kept in review"), `${fmt(sumv(rev.map(v => v.r0)) ? sumv(rev.map(v => v.r2)) / sumv(rev.map(v => v.r0)) * 100 : 0, 1)}%`, L("วงเงินผู้บริหารเห็นชอบ ÷ คำขอ", "Executive amount ÷ requested")],
    ["KPI-B07", L("ตัวชี้วัดที่บรรลุ", "KPIs met"), `${ks.filter(p => p.result >= p.target).length}/${ks.length}`, L("ตัวชี้วัดที่ได้ตามเป้า ÷ ที่รายงาน", "Met ÷ reported")],
    ["KPI-B08", L("ต้นทุนต่อหน่วยเทียบแผน", "Unit cost vs plan"), `${fmt(cost.length ? sumv(cost) / cost.length * 100 : 0, 0)}%`, L("เฉลี่ยของต้นทุนจริง ÷ ต้นทุนตามแผน", "Average of actual ÷ planned unit cost")],
    ["KPI-B09", L("รายงานส่งตรงเวลา", "Reports on time"), `${onTime.filter(z => z.x.t.slice(0, 10) <= due(z.q)).length}/${onTime.length}`, L("ส่งภายใน 15 วัน ÷ ที่ส่ง", "Sent within 15 days ÷ sent")],
    ["KPI-B10", L("ความพร้อมของคำขอลงทุน", "Investment request readiness"), `${fmt(invReq.length ? sumv(invReq.map(readiness)) / invReq.length : 0, 1)} · ${invReq.filter(r => r.ready.site === "ready").length}/${invReq.length} ${L("พร้อมทันที", "ready now")}`, L("คะแนนเฉลี่ย และสัดส่วนที่พร้อมทันที", "Average score, and share ready now")],
  ];
}

// ---------- M09 tabs ----------
{
  const bt = intelTabsBar;
  intelTabsBar = function () { const h = bt(), x = [["bagents", L("เอเจนต์งบประมาณ", "Budget agents")], ["bfore", L("พยากรณ์ปีนี้", "This year's forecast")], ["bwhatif", L("จำลอง 4 สถานการณ์", "Four what-ifs")], ["bkpi", L("ตัวชี้วัดและสัญญาณ", "KPIs and signals")]];
    return h.replace(/<\/div>\s*$/, x.map(([id, l]) => `<button class="tab ${id === INTEL_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === INTEL_TAB}" data-itab="${id}">${l}</button>`).join("") + "</div>"); };
}
INTEL.bagents = () => {
  const runs = (S.bRuns || []).slice().reverse(), open = runs.find(r => r.id === B_RUN_OPEN) || runs[0], A = S.allocs[B4_FY];
  const ST = { pending: ["–", "p-mute"], done: [L("เสร็จ", "Done"), "p-ok"], await: [L("รอคุณอนุมัติ", "Waiting for you"), "p-warn"], approved: [L("อนุมัติแล้ว", "Approved"), "p-ok"], rejected: [L("ไม่อนุมัติ", "Rejected"), "p-bad"], skipped: [L("ข้าม", "Skipped"), "p-mute"], blocked: [L("ทำต่อไม่ได้", "Blocked"), "p-bad"] };
  return `<div class="alert"><div class="ic">i</div><div><b>${L("เอเจนต์วางแผน เรียกเครื่องมือ และหยุดให้คนอนุมัติทุกขั้นที่เปลี่ยนข้อมูลหรือแจ้งผู้อื่น", "Agents plan, call tools, and stop for a person at every step that changes data or notifies people")}</b><p>${L("จำลองตาม D-P09 · ไม่อนุมัติคำขอ ไม่ตัดวงเงินจริงโดยไม่มีคน ไม่ลงมติ และไม่อนุมัติการโอน · ทุกขั้นบันทึกใน M09", "Simulated per D-P09 · never approves requests, changes amounts without a person, votes or approves transfers · every step is logged in M09")}</p></div></div>
    <div class="brief-grid">${Object.keys(B_AG).map(id => { const on = agentOn(id), g = B_AG[id];
      return `<section class="panel"><header>${cwAv(cwAgent(id) || CW_GENERAL, 28)}<h2>${bAgName(id)}</h2><span class="sp"></span><span class="mono sub">${id}</span></header><div class="body" style="display:flex;flex-direction:column;gap:8px"><span>${tx(g.goal)}</span>
        <span class="sub">${g.plan().map(([t]) => tx(B_TOOL[t][1])).join(" → ")}</span>
        ${id === "AG-15" && A ? `<div class="row" style="gap:6px;flex-wrap:wrap"><select data-agto aria-label="${L("บรรทัดที่ต้องการเพิ่ม", "Line that needs more")}">${A.lines.filter(l => l.type !== "per").map(l => `<option value="${l.id}" ${(B_AG_GOAL.to || "L14") === l.id ? "selected" : ""}>${l.id} ${esc(tx(l.name)).slice(0, 26)}</option>`).join("")}</select><input type="number" data-agneed min="0.1" step="0.1" value="${B_AG_GOAL.need || 1}" style="width:80px" aria-label="${L("ลบ.", "M")}"> ${L("ลบ.", "M")}</div>` : ""}
        <div><button class="btn primary" type="button" data-bstart="${id}" ${on ? "" : "disabled"}>${on ? L("เริ่มงาน", "Start") : L("ปิดใน M09", "Off in M09")}</button></div></div></section>`; }).join("")}</div>
    ${open ? `<section class="panel"><header>${chipIco("list", "info")}<h2>${open.id} · ${bAgName(open.agent)}</h2><span class="sp"></span>${tag(open.status, open.status === "done" ? "p-ok" : open.status === "waiting" ? "p-warn" : open.status === "stopped" ? "p-bad" : "p-info")}${runs.length > 1 ? `<select data-bopen aria-label="${L("งานอื่น", "Other runs")}">${runs.map(r => `<option value="${r.id}" ${r.id === open.id ? "selected" : ""}>${r.id} · ${r.agent}</option>`).join("")}</select>` : ""}</header>
      <div class="body"><ol class="agsteps">${open.steps.map((s, i) => `<li class="${i === open.ptr && open.status === "waiting" ? "now" : ""}"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span><span class="mono sub">${s.tool}</span> ${tx(B_TOOL[s.tool][1])} ${tag(B_TOOL[s.tool][0], "p-mute")}</span>${tag(ST[s.status][0], ST[s.status][1])}</div>
        ${s.out ? `<div class="sub">${s.out}</div>` : ""}${s.change ? `<div class="agchange"><b>${L("สิ่งที่จะเปลี่ยน", "What will change")}</b><div>${s.change}</div></div>` : ""}
        ${s.status === "await" ? (bCanApprove(open) ? `<div class="row" style="gap:6px;margin-top:6px"><button class="btn primary" type="button" data-bok="${open.id}">${L("อนุมัติขั้นนี้", "Approve this step")}</button><button class="btn" type="button" data-bno="${open.id}">${L("ไม่อนุมัติ", "Reject")}</button></div>` : `<div class="sub" style="margin-top:6px">${L("รอผู้มีอำนาจของขั้นนี้", "Waiting for the person who owns this step")}</div>`) : ""}</li>`).join("")}</ol></div></section>` : ""}`;
};
INTEL_BIND.bagents = () => {
  $$("[data-bstart]").forEach(b => (b.onclick = () => { const id = b.dataset.bstart, o = id === "AG-15" ? { to: ($("[data-agto]") || {}).value || "L14", need: Math.round(Number(($("[data-agneed]") || {}).value || 1) * 1e6) } : {}; if (id === "AG-15") B_AG_GOAL = { to: o.to, need: o.need / 1e6 }; bStart(id, o); commit(); route(); }));
  $$("[data-bopen]").forEach(s => (s.onchange = () => { B_RUN_OPEN = s.value; route(); }));
  $$("[data-bok]").forEach(b => (b.onclick = () => { const r = S.bRuns.find(x => x.id === b.dataset.bok), s = r.steps[r.ptr]; bApply(r, s); s.status = "approved"; s.by = me().id; audit(["อนุมัติขั้นตอนของเอเจนต์", "Approved an agent step"], `${r.id} ${s.tool}`); r.ptr++; r.status = "running"; bAdvance(r); commit(); route(); }));
  $$("[data-bno]").forEach(b => (b.onclick = () => { const r = S.bRuns.find(x => x.id === b.dataset.bno), s = r.steps[r.ptr]; s.status = "rejected"; audit(["ไม่อนุมัติขั้นตอนของเอเจนต์", "Rejected an agent step"], `${r.id} ${s.tool}`); r.ptr++; r.status = "running"; bAdvance(r); commit(); route(); }));
};
INTEL.bfore = () => {
  const f = fcYear(), T = spendT(), A = S.allocs[B4_FY], mx = 100;
  const lockedNext = sumv(S.requests.filter(r => r.multi && r.years && r.status !== "rejected").map(r => Number(r.years[String(B4_FY + 2)] || 0)));
  return `<section class="stats">
      ${statCard({ label: L("FC-B1 · เบิกจ่ายสิ้นปีที่คาด", "FC-B1 · Year-end spend expected"), value: fmt(f.p50, 1) + "%", icon: "trend", tone: f.p50 >= T.end.all ? "ok" : "warn", sub: `P10 ${fmt(f.p10, 1)}% · P90 ${fmt(f.p90, 1)}% · ${L("เป้า", "target")} ${T.end.all}%` })}
      ${statCard({ label: L("FC-B2 · เงินที่จะต้องกันเหลื่อมปี", "FC-B2 · Likely carry-over"), value: mb(f.carry), unit: L("ลบ.", "M"), icon: "clock", sub: L("งวดที่ครบหลัง 30 ก.ย. + ลงทุนที่ยังไม่ผูกพันบางส่วน", "Phases due after 30 Sep + part of uncommitted investment") })}
      ${statCard({ label: L("FC-B3 · ภาระผูกพันที่ล็อกไว้ปีถัดไป", "FC-B3 · Locked for next year"), value: mb(lockedNext), unit: L("ลบ.", "M"), icon: "layers", sub: L("จากคำขอผูกพันข้ามปี · ดูเพิ่มที่ M03 ประมาณการล่วงหน้า", "From multi-year requests · more in M03 forward estimates"), link: "cons-forward" })}</section>
    <section class="panel"><header>${chipIco("trend", "info")}<h2>${L("ช่วงพยากรณ์เทียบเป้าสิ้นปี", "Forecast range vs the year-end target")}</h2></header>
      <div class="body"><div class="fcband"><i class="band" style="left:${f.p10}%;width:${Math.max(1, f.p90 - f.p10)}%"></i><i class="mid" style="left:${f.p50}%"></i><i class="tgt" style="left:${T.end.all / mx * 100}%"></i></div>
        <div class="row sub" style="justify-content:space-between"><span>0%</span><span>${L("แถบ = P10–P90 · เส้นเข้ม = P50 · เส้นแดง = เป้า", "band = P10–P90 · dark line = P50 · red line = target")}</span><span>100%</span></div></div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("บรรทัด", "Line")}</th><th class="n">${L("จัดสรร", "Allotted")}</th><th class="n">${L("คาดเบิกจ่าย", "Expected spend")}</th><th class="n">%</th><th class="n">${L("คาดกันเหลื่อมปี", "Expected carry-over")}</th></tr></thead>
        <tbody>${f.rows.filter(x => x.l.type !== "per").map(x => `<tr><td>${esc(tx(x.l.name))}<div class="sub">${x.l.id} · ${unitName(x.l.unit)} · ${typeName(x.l.type)}</div></td><td class="n">${mb(x.b.allot)}</td><td class="n">${mb(x.exp)}</td><td class="n">${fmt(x.b.allot ? x.exp / x.b.allot * 100 : 0, 0)}%</td><td class="n">${x.carry ? mb(x.carry) : "–"}</td></tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("วิธีในต้นแบบ: เบิกจ่ายแล้ว หรืองวดสัญญาที่ครบภายในปี (เลือกค่าที่มากกว่า) + ส่วนหนึ่งของยอดจอง + ส่วนที่ยังว่างคูณความน่าจะเป็นตามงบรายจ่าย (ตั้งค่าได้ที่ M10) · อ่านเป็นช่วง", "Prototype method: paid, or contract phases due within the year (whichever is larger) + a share of reservations + the free amount times a probability by budget type (set in M10) · read it as a range")}</div></section>`;
};
let WI_B = { cut: 10, how: "rank", delay: "L3", tr: { from: "L10", to: "L14", amt: 1.95 }, sc: { id: "", amt: 1 } };
INTEL.bwhatif = () => {
  const W = WI_B, A = S.allocs[B4_FY], reqs = S.requests.filter(r => ["plan", "committee", "exec", "approved"].includes(r.status) && !isPersonnel(r)), tot = sumv(reqs.map(r => r.amount)), cut = tot * W.cut / 100;
  const ranked = reqs.map(r => ({ r, s: scoreOf(r) })).sort((a, b) => a.s - b.s), prot = r => r.multi || r.status === "approved";
  let left = cut; const hit = [];
  if (W.how === "prop") reqs.forEach(r => hit.push({ r, d: r.amount * W.cut / 100 }));
  else (W.how === "protect" ? ranked.filter(x => !prot(x.r)) : ranked).forEach(x => { if (left <= 0) return; const d = Math.min(left, x.r.amount); hit.push({ r: x.r, d }); left -= d; });
  const l1 = A && A.lines.find(l => l.id === W.delay), b1 = l1 && bal(l1), shift = l1 ? sumv(l1.plan.slice(9, 12)) : 0, f = fcYear(), fAll = A ? sumv(A.lines.map(l => l.amount)) : 1;
  const trT = A ? classifyTransfer({ from: W.tr.from, to: W.tr.to }) : "T1", sr = S.requests.find(r => r.id === W.sc.id) || reqs[0];
  const sel = (id, v, opts) => `<select data-wib="${id}" aria-label="${id}">${opts.map(([k, l]) => `<option value="${k}" ${String(v) === String(k) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const lineOpts = A ? A.lines.map(l => [l.id, `${l.id} ${tx(l.name).slice(0, 24)}`]) : [];
  const card = (id, title, ctrl, body) => `<section class="panel"><header><span class="mono sub">${id}</span><h2>${title}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:8px;flex-wrap:wrap">${ctrl}</div>${body}</div></section>`;
  return `<div class="alert"><div class="ic">i</div><div><b>${L("จำลองไม่แก้ข้อมูลจริง", "What-ifs never change real data")}</b><p>${L("ทุกผลแสดงสมมติฐาน และเป็นข้อมูลประกอบการตัดสินใจ", "Every result shows its assumptions and is decision support only")}</p></div></div>
    <div class="brief-grid">
    ${card("WI-B1", L("ถ้ากรอบลดลง", "If the ceiling drops"), `<input type="number" data-wib="cut" value="${W.cut}" min="1" max="50" style="width:70px"> % ${sel("how", W.how, [["rank", L("ตัดตามลำดับคะแนน", "By rank")], ["prop", L("ตามสัดส่วน", "In proportion")], ["protect", L("ปกป้องผูกพันและที่เห็นชอบ", "Protect commitments and approved")]])}`,
      `<span>${L("ต้องลด", "Cut needed")} <b>${mb(cut)}</b> ${L("ลบ. จาก", "M of")} ${mb(tot)}</span><ul class="plain">${hit.slice(0, 5).map(x => `<li><span class="mono">${x.r.id}</span> −${mb(x.d)} · <span class="sub">${impactText(x.r, x.r.amount - x.d)}</span></li>`).join("")}</ul>${W.how === "prop" && hit.length >= 3 ? `<span class="sub" style="color:var(--warn)">${L("การตัดเท่ากันทุกคำขอจะทำให้เกิดสัญญาณ BF-06", "Cutting everything equally raises signal BF-06")}</span>` : ""}`)}
    ${card("WI-B2", L("ถ้าเลื่อนรายการลงทุนไป 1 ไตรมาส", "If an investment line slips a quarter"), sel("delay", W.delay, lineOpts.filter(([k]) => (A.lines.find(l => l.id === k) || {}).type === "inv")),
      l1 ? `<span>${L("แผนไตรมาส 4 ของบรรทัดนี้", "This line's Q4 plan")} <b>${mb(shift)}</b> ${L("ลบ. จะเลื่อนไปปีหน้า", "M would slip into next year")}</span><span>${L("เบิกจ่ายสิ้นปีคาด", "Year-end spend expected")} ${fmt(f.p50, 1)}% → <b>${fmt(f.p50 - shift / fAll * 100, 1)}%</b> · ${L("เงินกันเพิ่ม", "carry-over up by")} ${mb(shift)} ${L("ลบ.", "M")}</span>${b1 && b1.res + b1.com === 0 ? `<span class="sub" style="color:var(--warn)">${L("ยังไม่ก่อหนี้ เสี่ยงไม่ได้ขยายเวลาหากเกินไตรมาส 2", "Not committed yet; risks losing the extension after Q2")}</span>` : ""}` : "–")}
    ${card("WI-B3", L("ถ้าโอนเงินเหลือจ่าย", "If savings are moved"), `${sel("trfrom", W.tr.from, lineOpts)} → ${sel("trto", W.tr.to, lineOpts)} <input type="number" data-wib="tramt" value="${W.tr.amt}" step="0.05" min="0.05" style="width:80px"> ${L("ลบ.", "M")}`,
      `<span><b class="mono">${trT}</b> ${tx(TR_TYPE[trT][0])} · ${L("ผู้อนุมัติ", "approver")}: ${TR_TYPE[trT][1] === "fin" ? L("ผอ.กองคลัง", "Finance director") : TR_TYPE[trT][1] === "cabinet" ? L("ครม.", "Cabinet") : L("ผู้บริหาร", "Executive")}${TR_TYPE[trT][2] && TR_TYPE[trT][1] !== "cabinet" ? ` + ${L("สำนักงบประมาณ", "Budget Bureau")}` : ""}</span><span class="sub">${L("เวลาที่ใช้โดยประมาณ", "Rough time")}: ${trT === "T1" ? L("1–3 วัน และรายงานภายใน 15 วัน", "1–3 days, report within 15") : trT === "T4" ? L("ต้องเสนอ ครม.", "needs the Cabinet") : L("2–4 สัปดาห์", "2–4 weeks")} · ${L("ใช้ได้ที่ต้นทาง", "available at source")} ${A ? mb(bal(A.lines.find(l => l.id === W.tr.from) || A.lines[0]).avail) : "–"} ${L("ลบ.", "M")}</span>`)}
    ${card("WI-B4", L("ถ้ากรรมาธิการตัดคำขอ", "If the scrutiny committee cuts a request"), `${sel("scid", sr ? sr.id : "", reqs.map(r => [r.id, `${r.id} ${tx(r.name).slice(0, 22)}`]))} −<input type="number" data-wib="scamt" value="${W.sc.amt}" step="0.5" min="0.5" style="width:70px"> ${L("ลบ.", "M")}`,
      sr ? `<span class="sub">${impactText(sr, Math.max(0, sr.amount - W.sc.amt * 1e6))}</span><div class="agchange"><b>${L("ร่างคำขอแปรญัตติคืน", "Draft appeal to restore")}</b><div>${L(`ขอคืนงบประมาณ ${fmt(W.sc.amt, 1)} ล้านบาท ของ${tx(sr.name)} เนื่องจาก${kpisForAct(sr.act).length ? `จะทำให้ตัวชี้วัด ${kpisForAct(sr.act).map(x => x.k.id).join(", ")} ลดลง` : "กระทบผลผลิต"} และโครงการมีความพร้อมดำเนินการ`, `We ask to restore ${fmt(W.sc.amt, 1)} M baht to ${tx(sr.name)}, because ${kpisForAct(sr.act).length ? `KPI ${kpisForAct(sr.act).map(x => x.k.id).join(", ")} would fall` : "outputs would fall"} and the project is ready to go`)}</div></div>` : "–")}
    </div>`;
};
INTEL_BIND.bwhatif = () => $$("[data-wib]").forEach(el => (el.onchange = () => {
  const k = el.dataset.wib, v = el.value;
  if (k === "cut") WI_B.cut = Math.max(1, Math.min(50, Number(v))); if (k === "how") WI_B.how = v; if (k === "delay") WI_B.delay = v;
  if (k === "trfrom") WI_B.tr.from = v; if (k === "trto") WI_B.tr.to = v; if (k === "tramt") WI_B.tr.amt = Number(v); if (k === "scid") WI_B.sc.id = v; if (k === "scamt") WI_B.sc.amt = Number(v);
  route();
}));
INTEL.bkpi = () => {
  const ks = kpiB(), sg = bSignals();
  return `<section class="panel"><header>${chipIco("chart", "info")}<h2>${L("ตัวชี้วัดงบประมาณ (นิยามไว้ที่เดียว)", "Budget KPIs (defined once)")}</h2><span class="sp"></span><span class="sub">${L("ใช้ร่วมกับแดชบอร์ดและผู้ช่วย AI", "Shared by dashboards and the AI assistant")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("ตัวชี้วัด", "KPI")}</th><th class="n">${L("ค่า", "Value")}</th><th>${L("นิยาม", "Definition")}</th></tr></thead><tbody>${ks.map(k => `<tr><td class="mono">${k[0]}</td><td>${k[1]}</td><td class="n"><b>${k[2]}</b></td><td class="sub">${k[3]}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="panel"><header>${chipIco("alert", "warn")}<h2>${L("สัญญาณเตือนด้านงบประมาณ", "Budget warning signals")}</h2><span class="sp"></span>${tag(`${sg.length}`, sg.length ? "p-warn" : "p-ok")}</header>
      <ul class="tlist">${sg.map(x => `<li><span class="prio p-warn"></span><div style="min-width:0"><a href="#" data-link="${x.link}">${esc(x.text)}</a><div class="sub mono">${x.id}</div></div><span class="sub">${{ "BF-01": L("เร่งใช้ปลายปี", "Year-end rush"), "BF-02": L("โอนวนกลับ", "Round-trip transfer"), "BF-03": L("ลงทุนไม่ขยับ", "Investment not moving"), "BF-04": L("คำขอยกยอด", "Rolled-over request"), "BF-05": L("ตัวชี้วัดไม่ขยับ", "Results not moving"), "BF-06": L("ตัดเท่ากันทุกคำขอ", "Equal cuts") }[x.id]}</span></li>`).join("") || `<li><span></span><div class="sub">${L("ไม่มีสัญญาณ", "No signals")}</div></li>`}</ul>
      <div class="body sub">${L("เกณฑ์ตั้งค่าได้ที่ M10 · ตั้งค่างบประมาณ (AI และสัญญาณ)", "Thresholds are set in M10 · Budget AI and signals")}</div></section>`;
};

// ---------- seed ----------
function seedBudgetB6(s) {
  [["AG-15", ["Transfer Helper Agent", "Transfer Helper Agent"], ["หาแหล่งเงิน จัดประเภทการโอน และร่างคำขอโอน", "Finds sources, classifies and drafts transfers"]], ["AG-17", ["Report Collector Agent", "Report Collector Agent"], ["รวบรวมรายงานรายไตรมาสและติดตามกองที่ยังไม่ส่ง", "Collects quarterly reports and chases late units"]]].forEach(([id, name, what]) => { if (!s.agents.some(a => a.id === id)) s.agents.push({ id, on: true, uses: 0, name, what }); });
  s.bRuns = [];
}
