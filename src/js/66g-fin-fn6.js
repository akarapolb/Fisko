// Fisko Finance round FN6 (Finance design v0.1, chapters 10 and 11): AI and analytics for Finance, on F9.
// - Finance agents AG-18 to AG-22 (chapter 10.1) as multi-step runs, like the Budget agents: an agent plans steps
//   from a template, runs read and draft steps on the real data, and stops for a person at every step that writes
//   or notifies. Simulated (D-P09): no model is called; each step runs an existing rule or calculation.
// - Forecasts F-FN-01 to 04, what-ifs W-FN-01 to 04 (nothing changes; scenarios can be saved and compared),
//   KPI-F01 to 10 and warning signals SG-F01 to 07 with a triage (ask, explain, decide, count false positives).
let FAI_TAB = "agents", F_RUN_OPEN = null, FWI = null;
const F_AG = {
  "AG-18": { name: ["ผู้ตรวจใบขอเบิก", "Voucher Checker"], goal: ["ตรวจใบขอเบิกที่ยังไม่อนุมัติทั้งหมด", "Check every voucher not yet approved"], plan: [["vc.read"], ["vc.check"], ["vc.flag"]], who: ["fin", "finhead"] },
  "AG-19": { name: ["ผู้ติดตามเงินยืม", "Advance Chaser"], goal: ["ติดตามเงินยืมที่ใกล้หรือเลยกำหนด", "Chase advances that are due soon or late"], plan: [["adv.read"], ["adv.rank"], ["adv.remind"], ["demand.draft"]], who: ["fin", "finhead"] },
  "AG-20": { name: ["ผู้กระทบยอด", "Reconciler"], goal: ["เสนอคู่และคำอธิบายรายการที่ยังไม่ตรงในบัญชีธนาคาร", "Propose matches and notes for unmatched bank items"], plan: [["rec.read"], ["rec.propose"], ["rec.note"]], who: ["finhead"] },
  "AG-21": { name: ["ผู้ช่วยปิดงวด", "Close Assistant"], goal: ["ตรวจความพร้อมปิดวันและปิดงวดเดือนก่อน", "Check readiness for the daily and last month's close"], plan: [["close.check"], ["close.who"], ["close.draft"]], who: ["finhead"] },
  "AG-22": { name: ["ผู้พยากรณ์การเบิกจ่าย", "Disbursement Forecaster"], goal: ["พยากรณ์การเบิกจ่ายถึงสิ้นปีและแจ้งรายการที่เสี่ยง", "Forecast spending to year end and flag lines at risk"], plan: [["fc.read"], ["fc.run"], ["fc.task"]], who: ["fin", "exec"] },
};
const F_TOOL = {
  "vc.read": ["read", ["อ่านใบขอเบิกที่ยังไม่อนุมัติ", "Read vouchers not yet approved"]], "vc.check": ["propose", ["ตรวจหลักฐาน กฎ และใบแจ้งหนี้ซ้ำ", "Check evidence, rules and duplicate invoices"]], "vc.flag": ["write", ["แจ้งผู้จัดทำให้แก้", "Tell the maker what to fix"]],
  "adv.read": ["read", ["อ่านทะเบียนเงินยืม", "Read the advance register"]], "adv.rank": ["propose", ["จัดลำดับตามโอกาสเลยกำหนด (F-FN-02)", "Rank by chance of being late (F-FN-02)"]], "adv.remind": ["write", ["ส่งเตือนผู้ยืม", "Remind borrowers"]], "demand.draft": ["draft", ["ร่างหนังสือเรียกชดใช้ (ข้อ 68)", "Draft repayment demands (clause 68)"]],
  "rec.read": ["read", ["อ่านรายการเดินบัญชีเดือนนี้", "Read this month's statement"]], "rec.propose": ["propose", ["เสนอคู่และความมั่นใจ", "Propose matches with confidence"]], "rec.note": ["write", ["บันทึกคำอธิบายรายการระหว่างทาง", "Record notes on items in transit"]],
  "close.check": ["read", ["รันรายการตรวจปิดวันและปิดเดือน", "Run the daily and monthly checks"]], "close.who": ["propose", ["บอกว่าใครต้องทำอะไร", "Say who must do what"]], "close.draft": ["draft", ["ร่างบันทึกปิดงวด", "Draft the close memo"]],
  "fc.read": ["read", ["อ่านผูกพัน งวดสัญญา และการจ่าย", "Read commitments, phases and payments"]], "fc.run": ["propose", ["พยากรณ์ F-FN-01 และ F-FN-03", "Run F-FN-01 and F-FN-03"]], "fc.task": ["write", ["สร้างงานให้รายการที่เสี่ยง", "Create tasks for lines at risk"]],
};
// Finance agents join the M09 agent list (switches and autonomy) when the seed runs.
function seedFinanceFN6(s) {
  Object.keys(F_AG).forEach(id => { if (!s.agents.some(a => a.id === id)) s.agents.push({ id, on: true, uses: 0, name: F_AG[id].name, what: F_AG[id].goal }); });
  s.fRuns = []; s.fSig = {}; s.fWhatifs = [];
  // A water bill keyed twice, for SG-F01.
  const w = (s.vouchers || []).find(v => v.id === `VC-2570-006`);
  if (w) s.vouchers.push(Object.assign(JSON.parse(JSON.stringify(w)), { id: `VC-2570-008`, t: "2026-10-16T11:20", desc: ["ค่าน้ำประปา เดือนกันยายน 2569 (สำนักงานสาขา)", "Water, September 2026 (branch office)"], log: [] }));
  // An earlier advance cleared late by the same Planning user, for SG-F04.
  const pl = s.users.find(u => u.role === "plan" && u.primary);
  if (pl && s.advances) s.advances.unshift({ id: "AD-2569-041", borrower: pl.id, unit: pl.unit, type: "other", purpose: ["ประชุมเชิงปฏิบัติการไตรมาส 3", "Q3 workshop"], start: "2026-06-10", end: "2026-06-11", returned: null, items: [{ k: "material", amt: 15000 }], amount: 15000, approvedAmt: 15000, source: "budget", line: s.advances[1].line, temp: false, collateral: "", contract: { no: "สย.041/2569", t: "2026-06-01T10:00" }, state: "cleared", t: "2026-06-01T10:00", paid: { t: "2026-06-05T10:00", ref: "EP-ADV-041" }, clearing: { t: "2026-07-20T10:00", spent: 15000, note: "", receipts: true }, receipt: { no: "RB-2569-088", t: "2026-07-21T10:00" }, log: [] });
}

// ---------- agent steps ----------
const F_EXEC = {
  "vc.read": (r, s) => { const v = (S.vouchers || []).filter(x => ["draft", "returned", "check"].includes(x.state)); r.memo.v = v.map(x => x.id); s.out = L(`${v.length} ใบรอการตรวจหรือแก้`, `${v.length} vouchers to check or fix`); return "done"; },
  "vc.check": (r, s) => { const dups = sgDup(); r.memo.iss = (r.memo.v || []).map(id => { const v = vcOf(id), bad = [...vEvidence(v).filter(e => !e.ok).map(e => e.label), ...vRules(v).filter(k => !k.ok && !k.warn).map(k => `${k.id} ${k.text}`), ...dups.filter(d => d.ids.includes(id)).map(d => `SG-F01 ${d.text}`)]; return { id, maker: v.maker, bad }; });
    s.out = r.memo.iss.map(x => `${x.id}: ${x.bad.length ? x.bad.map(esc).join(" · ") : L("ผ่าน", "passes")}`).join("<br>") || L("ไม่มีใบที่รอ", "Nothing waiting"); return "done"; },
  "vc.flag": (r, s) => { const b = (r.memo.iss || []).filter(x => x.bad.length); if (!b.length) { s.out = L("ไม่มีใบที่ต้องแจ้ง", "Nothing to flag"); return "skipped"; } s.change = b.map(x => `${x.id} · ${x.bad.length} ${L("ประเด็น", "issues")}`).join("<br>"); return "await"; },
  "adv.read": (r, s) => { const o = (S.advances || []).filter(a => OPEN_ADV.includes(a.state)); s.out = L(`ค้าง ${o.length} รายการ · เลยกำหนด ${o.filter(advOverdue).length}`, `${o.length} open · ${o.filter(advOverdue).length} overdue`); return "done"; },
  "adv.rank": (r, s) => { const k = fcAdvRisk(); r.memo.rank = k; s.out = k.map(x => `${x.a.id} ${esc(userName(x.a.borrower))} · ${fmt(x.p * 100, 0)}% · ${x.why}`).join("<br>") || L("ไม่มีเงินยืมค้าง", "No open advance"); return "done"; },
  "adv.remind": (r, s) => { const k = (r.memo.rank || []).filter(x => x.p >= 0.4 && !advOverdue(x.a)); if (!k.length) { s.out = L("ไม่มีรายที่ต้องเตือนก่อน", "No one to remind early"); return "skipped"; } s.change = k.map(x => `${x.a.id} → ${esc(userName(x.a.borrower))} · ${L("ส่งใช้ภายใน", "clear by")} ${fdate(advDue(x.a))}`).join("<br>"); return "await"; },
  "demand.draft": (r, s) => { const o = (S.advances || []).filter(a => advOverdue(a) && !a.demand); s.out = o.map(a => `<b>${L("ร่างหนังสือเรียกชดใช้", "Draft demand")} ${a.id}</b><br>${L(`เรียน ${userName(a.borrower)} ตามสัญญายืมเงิน ${a.contract.no} จำนวน ${fmt(advAmt(a))} บาท ครบกำหนดส่งใช้วันที่ ${fdate(advDue(a))} บัดนี้ยังไม่ได้ส่งใช้ จึงขอให้ชดใช้ภายในวันที่ ${fdate(addDays(advDue(a), fcfg().demandDays))} (ข้อ 68)`, `Dear ${userName(a.borrower)}, under loan contract ${a.contract.no} for ${fmt(advAmt(a))} baht, clearing was due on ${fdate(advDue(a))} and has not been made. Please repay by ${fdate(addDays(advDue(a), fcfg().demandDays))} (clause 68).`)}`).join("<br><br>") || L("ไม่มีรายที่ต้องเรียกชดใช้", "No demand needed");
    if (o.length) s.out += `<br><span class="sub">${L("ร่างเท่านั้น หัวหน้าการเงินออกหนังสือเองที่ F4", "Draft only; the head of finance issues it on F4")}</span>`; return "done"; },
  "rec.read": (r, s) => { const m = curMonth(), x = bkMatch("budget", m); r.memo.x = x; s.out = x.st ? L(`จับคู่แล้ว ${x.matched} · ระหว่างทาง ${x.bookOnly.length} · เฉพาะธนาคาร ${x.bankOnly.length}`, `${x.matched} matched · ${x.bookOnly.length} in transit · ${x.bankOnly.length} bank-only`) : L("ยังไม่ได้นำเข้ารายการเดินบัญชีเดือนนี้", "This month's statement isn't imported yet"); return x.st ? "done" : "blocked"; },
  "rec.propose": (r, s) => { const x = r.memo.x; r.memo.notes = [...x.bookOnly.map(b => ({ ref: b.ref, text: L(`${esc(tx(b.desc))} ยังไม่ผ่านธนาคาร คาดว่าเข้าในรอบถัดไป`, `${esc(tx(b.desc))} hasn't cleared the bank yet; expected next cycle`), conf: 0.8 })), ...x.bankOnly.map(k => ({ ref: k.ref, text: /^FEE/.test(k.ref) ? L("ค่าธรรมเนียมธนาคาร ควรบันทึกเข้าบัญชี", "Bank fee; record it in the books") : L("ไม่พบรายการคู่ใน Fisko ตรวจสอบกับเอกสาร", "No partner in Fisko; check the documents"), conf: /^FEE/.test(k.ref) ? 0.95 : 0.4 }))];
    s.out = r.memo.notes.map(n => `<span class="mono">${esc(n.ref)}</span> · ${n.text} · ${L("ความมั่นใจ", "confidence")} ${fmt(n.conf * 100, 0)}%`).join("<br>") || L("ทุกรายการตรงกันแล้ว", "Everything matches"); return "done"; },
  "rec.note": (r, s) => { const n = r.memo.notes || []; if (!n.length) { s.out = L("ไม่มีคำอธิบายที่ต้องบันทึก", "No notes to record"); return "skipped"; } s.change = n.map(x => `${esc(x.ref)} · ${x.text}`).join("<br>"); return "await"; },
  "close.check": (r, s) => { const pm = prevMonth(curMonth()), d = dayChecks(TODAY), m = monthChecks(pm); r.memo.d = d; r.memo.m = m; r.memo.pm = pm;
    s.out = `<b>${L("ปิดวัน", "Daily close")}</b>: ${d.filter(c => c.ok).length}/${d.length} · <b>${L("ปิดงวด", "Month close")} ${monthLabel(pm)}</b>: ${m.filter(c => c.ok).length}/${m.length}`; return "done"; },
  "close.who": (r, s) => { const who = { 1: "fin", 2: "fin", 3: "fin", 4: "finhead", 5: "fin", 6: "finhead" };
    s.out = [...(r.memo.d || []).filter(c => !c.ok).map(c => `${esc(c.t)} → ${tx(ROLES.fin)}`), ...(r.memo.m || []).filter(c => !c.ok).map(c => `${c.k}. ${esc(c.t)} → ${tx(ROLES[who[c.k]])}`)].join("<br>") || L("ทุกข้อผ่าน พร้อมปิด", "Every check passes; ready to close"); return "done"; },
  "close.draft": (r, s) => { const m = r.memo.m || [], bad = m.filter(c => !c.ok);
    s.out = `<b>${L("ร่างบันทึกปิดงวด", "Draft close memo")} ${monthLabel(r.memo.pm)}</b><br>${L(`ผลการตรวจปิดงวดผ่าน ${m.length - bad.length} จาก ${m.length} ข้อ`, `${m.length - bad.length} of ${m.length} close checks pass`)}${bad.length ? `<br>${L("ข้อที่ยังไม่ผ่าน", "Not yet passing")}: ${bad.map(c => esc(c.t)).join("; ")}` : ""}<br><span class="sub">${L("ร่างเท่านั้น หัวหน้าการเงินปิดงวดเองที่ F8", "Draft only; the head of finance closes the period on F8")}</span>`; return "done"; },
  "fc.read": (r, s) => { s.out = L(`ผูกพันคงค้าง ${mb(sumv(finCommits().map(fcLeft)))} ลบ. · จ่ายแล้ว ${mb(sumv(famLines().map(l => linePaid(l.id))))} ลบ.`, `${mb(sumv(finCommits().map(fcLeft)))} M committed and unpaid · ${mb(sumv(famLines().map(l => linePaid(l.id))))} M paid`); return "done"; },
  "fc.run": (r, s) => { const f = fcMonths(), c = fcCarry(); r.memo.risk = f.lines.filter(x => x.gap > 0).slice(0, 4); s.out = L(`คาดเบิกจ่ายสิ้นปี ${fmt(f.end50, 1)}% (P10 ${fmt(f.end10, 1)} – P90 ${fmt(f.end90, 1)}) · เป้า ${spendT().end.all}% · คาดกันเหลื่อมปี ${mb(c.total)} ลบ.`, `Year end expected ${fmt(f.end50, 1)}% (P10 ${fmt(f.end10, 1)} – P90 ${fmt(f.end90, 1)}) · target ${spendT().end.all}% · carry-over ${mb(c.total)} M`) + (r.memo.risk.length ? `<br>${r.memo.risk.map(x => `${x.l.id} ${esc(tx(x.l.name))} · ${L("ขาดจากเป้า", "short of target")} ${mb(x.gap)} ${L("ลบ.", "M")}`).join("<br>")}` : ""); return "done"; },
  "fc.task": (r, s) => { const k = r.memo.risk || []; if (!k.length) { s.out = L("ไม่มีรายการที่เสี่ยง", "No line at risk"); return "skipped"; } r.memo.tasks = k.map(x => ({ role: "div", unit: x.l.unit, title: `${L("เร่งเบิกจ่าย", "Speed up spending on")} ${x.l.id} ${tx(x.l.name)}`, link: "fnc-ai" })); s.change = r.memo.tasks.map(t => `${unitName(t.unit)} · ${esc(t.title)}`).join("<br>"); return "await"; },
};
function fApply(r, s) {
  switch (s.tool) {
    case "vc.flag": (r.memo.iss || []).filter(x => x.bad.length).forEach(x => notify(["fin"], [`${r.agent}: ใบขอเบิก ${x.id} มี ${x.bad.length} ประเด็นต้องแก้`, `${r.agent}: voucher ${x.id} has ${x.bad.length} issues to fix`], "fnc-pay")); break;
    case "adv.remind": (r.memo.rank || []).filter(x => x.p >= 0.4 && !advOverdue(x.a)).forEach(x => { const u = S.users.find(y => y.id === x.a.borrower); notify([u.role], [`${r.agent}: เงินยืม ${x.a.id} ครบกำหนดส่งใช้ ${fdate(advDue(x.a))}`, `${r.agent}: advance ${x.a.id} is due ${fdate(advDue(x.a))}`], "advances"); }); break;
    case "rec.note": (S.recNotes = S.recNotes || []).push(...(r.memo.notes || []).map(n => ({ ref: n.ref, text: n.text, agent: r.agent, by: me().id, t: nowIso() }))); break;
    case "fc.task": S.agentTasks = S.agentTasks || []; (r.memo.tasks || []).forEach(t => S.agentTasks.push(Object.assign({ agent: r.agent, run: r.id, due: addDays(TODAY, 7) }, t))); break;
  }
}
function fAdvance(r) {
  while (r.ptr < r.steps.length && r.status === "running") {
    const s = r.steps[r.ptr];
    s.status = F_EXEC[s.tool](r, s); s.at = nowIso();
    S.aiLog.unshift({ t: nowIso(), agent: r.agent, user: me().id, action: F_TOOL[s.tool][1], target: r.id, sources: 1, ok: s.status !== "blocked", ver: "finance-agent-sim-1" });
    if (s.status === "await") { r.status = "waiting"; return; }
    if (s.status === "blocked") { r.status = "stopped"; return; }
    r.ptr++;
  }
  if (r.ptr >= r.steps.length && r.status === "running") r.status = "done";
}
function fStart(agent) {
  S.fRuns = S.fRuns || [];
  const r = { id: "FRUN-" + String(S.fRuns.length + 1).padStart(3, "0"), agent, by: me().id, t: nowIso(), status: "running", ptr: 0, memo: {}, steps: F_AG[agent].plan.map(([tool]) => ({ tool, status: "pending", out: "" })) };
  S.fRuns.push(r); fAdvance(r); F_RUN_OPEN = r.id;
  const a = (S.agents || []).find(x => x.id === agent); if (a) a.uses = (a.uses || 0) + 1;
  return r;
}

// ---------- forecasts ----------
const FY_MONTHS_F = () => { const out = []; let [y, m] = [FAM_FY - 544, 10]; for (let i = 0; i < 12; i++) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } } return out; };
// When money left the budget: approved contract payments, paid vouchers outside contracts, advances paid.
function paidByMonth() {
  const by = {}, add = (d, a) => { const k = d.slice(0, 7); by[k] = (by[k] || 0) + a; };
  S.payreqs.filter(p => p.status === "approved" && p.decided).forEach(p => add(p.decided.t, p.amount));
  (S.vouchers || []).filter(v => !v.contract && v.state === "paid" && v.paid).forEach(v => add(v.paid.t, v.gross - (v.penalty || 0)));
  (S.advances || []).filter(a => a.paid && a.source === "budget" && a.paid.t.slice(0, 10) >= `${FAM_FY - 544}-10-01`).forEach(a => add(a.paid.t, a.approvedAmt || a.amount));
  return by;
}
// F-FN-01: monthly spending to year end, with a range that widens with the horizon. Options let what-ifs shift things.
function fcMonths(o = {}) {
  const M = FY_MONTHS_F(), cur = curMonth(), pb = paidByMonth(), P = bcfg().fc.p, lag = o.lag != null ? o.lag : 7, slip = o.slip || 0;
  const exp = {}, put = (d, a) => { const k = d.slice(0, 7); if (k > M[11]) return; const key = k < cur ? cur : k; exp[key] = (exp[key] || 0) + a; };
  S.contracts.filter(conLive).forEach(c => c.phases.filter(ph => !ph.cancelled && !phPaid(c, ph)).forEach(ph => put(addDays(ph.due, lag + slip), ph.amount)));
  (S.fcommit || []).forEach(m => { const left = Math.max(0, m.amount - (m.released || 0) - (m.paid || 0)), ms = M.filter(k => k >= cur && k <= m.due.slice(0, 7)); ms.forEach(k => (exp[k] = (exp[k] || 0) + left / (ms.length || 1))); });
  const lines = famLines().map(l => { const com = famCommitted(l.id) + famOther(l.id) + famReserved(l.id), free = Math.max(0, l.amount - com), p = (P[l.type] != null ? P[l.type] : 85) / 100;
    return { l, free, p, paid: linePaid(l.id), expFree: free * p }; });
  const rest = M.filter(k => k >= cur), seas = rest.map((k, i) => 1 + i / rest.length);
  const free = sumv(lines.map(x => x.expFree)); rest.forEach((k, i) => (exp[k] = (exp[k] || 0) + free * seas[i] / sumv(seas)));
  const tot = sumv(famLines().map(l => l.amount)) || 1, rows = []; let cum = 0;
  M.forEach((k, i) => { const act = k < cur ? pb[k] || 0 : k === cur ? (pb[k] || 0) : 0, e = k >= cur ? exp[k] || 0 : 0; cum += act + e; const h = Math.max(0, rest.indexOf(k)); rows.push({ k, act, exp: e, cum, pct: cum / tot * 100, lo: Math.max(0, cum / tot * 100 - h * 1.6), hi: Math.min(100, cum / tot * 100 + h * 0.9) }); });
  const end = rows[11], T = spendT();
  const lineRows = lines.map(x => { const target = x.l.amount * (x.l.type === "inv" ? T.end.inv : T.end.ope) / 100, e = Math.min(x.l.amount, x.paid + (famCommitted(x.l.id) + famOther(x.l.id) - Math.min(x.paid, famCommitted(x.l.id) + famOther(x.l.id))) + x.expFree); return { l: x.l, exp: e, gap: Math.max(0, target - e) }; }).sort((a, b) => b.gap - a.gap);
  return { rows, end50: end.pct, end10: end.lo, end90: end.hi, tot, lines: lineRows };
}
// F-FN-02: chance each open advance is cleared late.
function fcAdvRisk(share) {
  return (S.advances || []).filter(a => OPEN_ADV.includes(a.state)).map(a => {
    const d = daysUntil(advDue(a)), hist = (S.advances || []).filter(x => x.borrower === a.borrower && x.id !== a.id && x.clearing && advDue(x) && x.clearing.t.slice(0, 10) > advDue(x)).length;
    let p = d < 0 ? 1 : d <= 3 ? 0.55 : d <= 7 ? 0.35 : 0.15; if (hist) p = Math.min(1, p + 0.25 * hist); if (a.state === "objected") p = Math.min(1, p + 0.2); if (share != null && d >= 0) p = Math.max(0, Math.min(1, p * (1 - share) / 0.3));
    const why = [d < 0 ? L("เลยกำหนดแล้ว", "already late") : L(`เหลือ ${d} วัน`, `${d} days left`), hist ? L(`เคยส่งช้า ${hist} ครั้ง`, `late ${hist} time(s) before`) : "", a.state === "objected" ? L("มีข้อทักท้วงค้าง", "objection open") : ""].filter(Boolean).join(" · ");
    return { a, p, why };
  }).sort((x, y) => y.p - x.p);
}
// F-FN-03: money likely carried into next year.
function fcCarry(slip = 0) {
  const items = [];
  S.contracts.filter(conLive).forEach(c => { const late = c.phases.filter(ph => !ph.cancelled && !phPaid(c, ph) && addDays(ph.due, slip) > FY_END); if (late.length) items.push({ id: c.id, name: famPlan(c.plan).name, amt: sumv(late.map(ph => ph.amount)) }); });
  (S.fcommit || []).filter(m => m.due > FY_END).forEach(m => items.push({ id: m.id, name: m.name, amt: Math.max(0, m.amount - (m.released || 0) - (m.paid || 0)) }));
  return { items, total: sumv(items.map(x => x.amt)) };
}
// F-FN-04: finance workload over the next six weeks.
function fcLoad() {
  const out = [];
  for (let w = 0; w < 6; w++) {
    const a = addDays(TODAY, w * 7), b = addDays(TODAY, w * 7 + 6), inW = d => d >= a && d <= b;
    const ph = S.contracts.reduce((n, c) => n + c.phases.filter(p => !p.cancelled && !phaseAccepted(p) && inW(p.due)).length, 0);
    const adv = (S.advances || []).filter(x => OPEN_ADV.includes(x.state) && inW(advDue(x))).length + (S.advances || []).filter(x => x.state === "request" && inW(x.start)).length;
    const util = [15, 16, 17, 18, 19, 20, 21].some(dd => inW(`${a.slice(0, 8)}${dd}`)) ? 4 : 1;
    out.push({ a, b, ph, adv, util, total: ph + adv + util });
  }
  return out;
}

// ---------- KPI-F and signals ----------
function kpiF() {
  const V = S.vouchers || [], proc = V.filter(v => v.type === "proc" && v.state !== "cancelled"), onTime = proc.filter(v => (v.gf ? v.gf.t.slice(0, 10) <= v.due : TODAY <= v.due));
  const paid = V.filter(v => v.state === "paid" && v.paid), days = paid.map(v => dayDiff(v.t.slice(0, 10), v.paid.t.slice(0, 10))).sort((a, b) => a - b), med = days.length ? days[Math.floor(days.length / 2)] : 0;
  const past = V.filter(v => v.state !== "draft"), ret = past.filter(v => (v.log || []).some(l => /Returned|Rejected/.test(tx(l.act)) || /Returned|Rejected/.test(l.act[1] || "")));
  const over = (S.advances || []).filter(advOverdue), rem = S.remits || [], appr = S.payreqs.filter(p => p.status === "approved"), match = appr.filter(p => p.recon && ["matched", "explained"].includes(p.recon.state));
  const closed = (S.periods || []).filter(p => p.status === "closed" && p.t), cdays = closed.map(p => { let n = 0, d = monthEnd(p.month + "-01"); while (d < p.t.slice(0, 10)) { d = addWorkdays(d, 1); n++; } return n; });
  const certs = paid.filter(v => v.cert), certDay = certs.filter(v => v.cert.sent && v.cert.sent.t.slice(0, 10) === v.paid.t.slice(0, 10));
  const allot = sumv(famLines().map(l => l.amount)), spent = sumv(famLines().map(l => linePaid(l.id))), T = spendT();
  return [
    ["KPI-F01", L("ขอเบิกทันเวลา", "Requests on time"), `${fmt(pct(onTime.length, proc.length), 0)}%`, L("ใบขอเบิกค่าซื้อจ้างที่ถึง GFMIS ภายใน 5 วันทำการหลังตรวจรับ (ข้อ 28)", "Procurement vouchers reaching GFMIS within 5 working days of acceptance (cl. 28)"), "100%", pct(onTime.length, proc.length) >= 100],
    ["KPI-F02", L("เวลาจากทำใบขอเบิกถึงจ่าย", "Voucher to payment"), `${med} ${L("วัน", "days")}`, L("มัธยฐานจากวันสร้างใบขอเบิกถึงวันจ่าย", "Median days from voucher to payment"), L("ตั้งได้", "settable"), med <= 10],
    ["KPI-F03", L("ใบขอเบิกถูกส่งกลับ", "Vouchers returned"), `${fmt(pct(ret.length, past.length), 0)}%`, L("ส่งกลับจากขั้นตรวจหรืออนุมัติ ÷ ที่ส่งตรวจแล้ว", "Returned at checking or approval ÷ sent"), "< 10%", pct(ret.length, past.length) < 10],
    ["KPI-F04", L("เงินยืมเลยกำหนด", "Overdue advances"), `${over.length} · ${fmt(sumv(over.map(advAmt)))} ${L("บาท", "baht")}`, L("จำนวนและยอดที่เลยกำหนดส่งใช้", "Count and amount past the clearing date"), "0", !over.length],
    ["KPI-F05", L("นำส่งเงินทันเวลา", "Remittances on time"), `${fmt(pct(rem.filter(m => !m.late).length, rem.length), 0)}%`, L("การนำส่งที่ไม่มีรายการช้ากว่าข้อ 101", "Remittances with no item past clause 101"), "100%", rem.every(m => !m.late)],
    ["KPI-F06", L("จับคู่ GFMIS ได้", "Matched with GFMIS"), `${fmt(pct(match.length, appr.length), 0)}%`, L("การจ่ายที่ตรงกับไฟล์ GFMIS หรือชี้แจงแล้ว", "Payments matched with GFMIS files or explained"), "> 98%", pct(match.length, appr.length) > 98],
    ["KPI-F07", L("วันปิดงวด", "Days to close"), cdays.length ? `${Math.max(...cdays)} ${L("วันทำการ", "working days")}` : "—", L("วันทำการหลังสิ้นเดือนถึงวันปิดงวด", "Working days from month end to close"), "≤ 5", !cdays.length || Math.max(...cdays) <= 5],
    ["KPI-F08", L("จ่ายด้วย e-Payment", "Paid by e-Payment"), `${fmt(pct(paid.filter(v => v.method === "epay").length, paid.length), 0)}%`, L("การจ่ายที่ไม่ใช่เช็คหรือเงินสด (ข้อ 52)", "Payments not by cheque or cash (cl. 52)"), "100%", paid.every(v => v.method === "epay")],
    ["KPI-F09", L("หนังสือรับรองภาษีทันที", "Tax certificates same day"), `${certDay.length}/${certs.length}`, L("50 ทวิ ที่ส่งภายในวันที่จ่าย", "50 Tawi sent on the day of payment"), "100%", certs.length === certDay.length],
    ["KPI-F10", L("เบิกจ่ายเทียบเป้า", "Spending vs target"), `${fmt(pct(spent, allot), 1)}% / ${T.q[0]}%`, L("เบิกจ่ายจริง ÷ จัดสรร เทียบเป้าไตรมาส 1 (นิยามเดียวกับ KPI-B01)", "Spent ÷ allotted vs the Q1 target (same as KPI-B01)"), `${T.q[0]}%`, pct(spent, allot) >= T.q[0]],
  ];
}
// SG-F01: the same payee and amount keyed more than once within 30 days.
function sgDup() {
  const V = (S.vouchers || []).filter(v => v.state !== "cancelled"), out = [];
  V.forEach((v, i) => V.slice(i + 1).forEach(w => { if (tx(v.payee.name) === tx(w.payee.name) && v.gross === w.gross && Math.abs(dayDiff(v.t.slice(0, 10), w.t.slice(0, 10))) <= 30 && !(v.contract && w.contract && v.phase !== w.phase)) out.push({ ids: [v.id, w.id], text: L(`${v.id} และ ${w.id} ผู้รับเงินและยอดเดียวกัน ${fmt(v.gross, 2)} บาท`, `${v.id} and ${w.id} have the same payee and amount, ${fmt(v.gross, 2)} baht`) }); }));
  return out;
}
function fSignals() {
  const out = [], add = (id, key, text, link) => out.push({ id, key: `${id}:${key}`, text, link }), c = fcfg(), V = (S.vouchers || []).filter(v => v.state !== "cancelled");
  sgDup().forEach(d => add("SG-F01", d.ids.join("+"), d.text, "fnc-pay"));
  const byPayee = {}; V.filter(v => v.gross < c.whtMin).forEach(v => (byPayee[tx(v.payee.name)] = byPayee[tx(v.payee.name)] || []).push(v));
  Object.entries(byPayee).forEach(([p, xs]) => { const s = sumv(xs.map(v => v.gross)); if (xs.length >= 2 && s >= c.whtMin) add("SG-F02", p, L(`${p} มี ${xs.length} ใบต่ำกว่า ${fmt(c.whtMin)} บาท รวม ${fmt(s, 2)} บาท`, `${p} has ${xs.length} vouchers under ${fmt(c.whtMin)} baht, ${fmt(s, 2)} in total`), "fnc-pay"); });
  (S.vendorChanges || []).filter(ch => ch.status === "confirmed").forEach(ch => V.filter(v => v.payee.vendor === ch.vendor && ["approve", "ready", "posted", "paid"].includes(v.state) && v.t >= ch.done.t && dayDiff(ch.done.t.slice(0, 10), v.t.slice(0, 10)) <= 30).forEach(v => add("SG-F03", v.id, L(`${v.id} จ่ายภายใน 30 วันหลังแก้บัญชี (${ch.id})`, `${v.id} paid within 30 days of a bank change (${ch.id})`), "fnc-pay")));
  const late = {}; (S.advances || []).forEach(a => { const lt = advOverdue(a) || (a.clearing && advDue(a) && a.clearing.t.slice(0, 10) > advDue(a)); if (lt && a.paid && a.paid.t >= addDays(TODAY, -365)) (late[a.borrower] = late[a.borrower] || []).push(a.id); });
  Object.entries(late).filter(([, ids]) => ids.length >= 2).forEach(([u, ids]) => add("SG-F04", u, L(`${userName(u)} ส่งใช้ช้า ${ids.length} ครั้งใน 12 เดือน (${ids.join(", ")})`, `${userName(u)} cleared late ${ids.length} times in 12 months (${ids.join(", ")})`), "fnc-adv"));
  (S.dailyCash || []).filter(d => d.status === "diff").forEach(d => add("SG-F05", d.date, L(`ยอดนับเงินสดไม่ตรง ${fdate(d.date)}`, `Cash count differed on ${fdate(d.date)}`), "fnc-cash"));
  const cashRev = inSafe(TODAY, "cash").filter(r => rcClass(r) === "revenue"), old = cashRev.filter(r => addWorkdays(r.date, 3) < TODAY);
  if (sumv(cashRev.map(r => r.amount)) > c.remitCash && old.length) add("SG-F05", "safe", L(`รายได้เงินสดในตู้ ${fmt(sumv(cashRev.map(r => r.amount)), 2)} บาท เกินเกณฑ์นานกว่า 3 วันทำการ`, `${fmt(sumv(cashRev.map(r => r.amount)), 2)} baht of cash revenue held over the limit for more than 3 working days`), "fnc-recv");
  const paid = V.filter(v => v.state === "paid"), byMaker = {}; paid.forEach(v => (byMaker[v.maker] = byMaker[v.maker] || []).push(v));
  Object.entries(byMaker).forEach(([u, xs]) => { const n = xs.filter(v => v.method !== "epay").length; if (n && n / xs.length > 0.3) add("SG-F06", u, L(`${userName(u)} จ่ายเช็คหรือเงินสด ${n} จาก ${xs.length} รายการ`, `${userName(u)} paid ${n} of ${xs.length} by cheque or cash`), "fnc-pay"); });
  const byCol = {}; (S.receipts || []).forEach(r => (byCol[r.by] = byCol[r.by] || []).push(r));
  Object.entries(byCol).forEach(([u, xs]) => { const n = xs.filter(r => r.cancelled).length; if (n >= 2 || (xs.length >= 5 && n / xs.length > 0.1)) add("SG-F07", u, L(`${userName(u)} ยกเลิกใบเสร็จ ${n} จาก ${xs.length} ใบ`, `${userName(u)} cancelled ${n} of ${xs.length} receipts`), "fnc-recv"); });
  return out;
}
const SIG_ST = { new: [["ใหม่", "New"], "p-warn"], asked: [["ขอคำชี้แจงแล้ว", "Explanation asked"], "p-info"], explained: [["ชี้แจงแล้ว", "Explained"], "p-info"], issue: [["ยืนยันเป็นประเด็น", "Confirmed issue"], "p-bad"], fp: [["ผลบวกลวง", "False positive"], "p-mute"] };
const sigSt = k => ((S.fSig || {})[k] || { status: "new" });

// ---------- F9 sections (the page's tabs are agents, fc, wi and kpi; FAI_TAB holds the open one) ----------
const FAI = {};
FAI.agents = () => {
  const runs = (S.fRuns || []).slice().reverse(), open = runs.find(r => r.id === F_RUN_OPEN) || runs[0];
  const ST = { pending: ["–", "p-mute"], done: [L("เสร็จ", "Done"), "p-ok"], await: [L("รอคุณอนุมัติ", "Waiting for you"), "p-warn"], approved: [L("อนุมัติแล้ว", "Approved"), "p-ok"], rejected: [L("ไม่อนุมัติ", "Rejected"), "p-bad"], skipped: [L("ข้าม", "Skipped"), "p-mute"], blocked: [L("ทำต่อไม่ได้", "Blocked"), "p-bad"] };
  return `<div class="alert"><div class="ic">i</div><div><b>${L("Agent ตรวจ จับคู่ เตือน และร่าง แต่ไม่จ่ายเงิน", "Agents check, match, remind and draft, but never pay")}</b><p>${L("จำลองตาม D-P09 · ไม่อนุมัติ ไม่สั่งจ่าย ไม่แก้ยอดเงินหรือบัญชีธนาคาร ไม่ลงนามแทนกรรมการ ไม่ปิดงวด และไม่ส่งหนังสือออก · ทุกขั้นบันทึกใน M09", "Simulated per D-P09 · never approves, pays, changes amounts or bank accounts, signs for the committee, closes periods or sends letters · every step is logged in M09")}</p></div></div>
    <div class="brief-grid">${Object.keys(F_AG).map(id => { const on = agentOn(id), g = F_AG[id];
      return `<section class="panel"><header>${chipIco("bot", "info")}<h2>${tx(g.name)}</h2><span class="sp"></span><span class="mono sub">${id}</span></header><div class="body" style="display:flex;flex-direction:column;gap:8px"><span>${tx(g.goal)}</span>
        <span class="sub">${g.plan.map(([t]) => tx(F_TOOL[t][1])).join(" → ")}</span>
        <div><button class="btn primary" type="button" data-fstart="${id}" ${on ? "" : "disabled"}>${on ? L("เริ่มงาน", "Start") : L("ปิดใน M09", "Off in M09")}</button></div></div></section>`; }).join("")}</div>
    ${open ? `<section class="panel"><header>${chipIco("list", "info")}<h2>${open.id} · ${tx(F_AG[open.agent].name)}</h2><span class="sp"></span>${tag(open.status, open.status === "done" ? "p-ok" : open.status === "waiting" ? "p-warn" : open.status === "stopped" ? "p-bad" : "p-info")}${runs.length > 1 ? `<select data-fopen aria-label="${L("งานอื่น", "Other runs")}">${runs.map(r => `<option value="${r.id}" ${r.id === open.id ? "selected" : ""}>${r.id} · ${r.agent}</option>`).join("")}</select>` : ""}</header>
      <div class="body"><ol class="agsteps">${open.steps.map((s, i) => `<li class="${i === open.ptr && open.status === "waiting" ? "now" : ""}"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span><span class="mono sub">${s.tool}</span> ${tx(F_TOOL[s.tool][1])} ${tag(F_TOOL[s.tool][0], "p-mute")}</span>${tag(ST[s.status][0], ST[s.status][1])}</div>
        ${s.out ? `<div class="sub">${s.out}</div>` : ""}${s.change ? `<div class="agchange"><b>${L("สิ่งที่จะเปลี่ยน", "What will change")}</b><div>${s.change}</div></div>` : ""}
        ${s.status === "await" ? (F_AG[open.agent].who.includes(ROLE) ? `<div class="row" style="gap:6px;margin-top:6px"><button class="btn primary" type="button" data-fok="${open.id}">${L("อนุมัติขั้นนี้", "Approve this step")}</button><button class="btn" type="button" data-fno="${open.id}">${L("ไม่อนุมัติ", "Reject")}</button></div>` : `<div class="sub" style="margin-top:6px">${L("รอผู้รับผิดชอบขั้นนี้", "Waiting for the person who owns this step")}: ${F_AG[open.agent].who.map(r => tx(ROLES[r])).join(", ")}</div>`) : ""}</li>`).join("")}</ol></div></section>` : ""}`;
};
FAI.fc = () => {
  const f = fcMonths(), T = spendT(), c = fcCarry(), risk = fcAdvRisk(), load = fcLoad(), mx = Math.max(...f.rows.map(r => r.act + r.exp), 1);
  const qEnd = { "12": 0, "03": 1, "06": 2, "09": 3 };
  return `<section class="stats">
      ${statCard({ label: L("F-FN-01 · เบิกจ่ายสิ้นปีที่คาด", "F-FN-01 · Year-end spending expected"), value: fmt(f.end50, 1) + "%", icon: "trend", tone: f.end50 >= T.end.all ? "ok" : "warn", sub: `P10 ${fmt(f.end10, 1)}% · P90 ${fmt(f.end90, 1)}% · ${L("เป้า", "target")} ${T.end.all}%` })}
      ${statCard({ label: L("F-FN-02 · เงินยืมที่น่าจะช้า", "F-FN-02 · Advances likely late"), value: String(risk.filter(x => x.p >= 0.5).length), icon: "wallet", tone: risk.some(x => x.p >= 0.5) ? "warn" : "ok", sub: L(`จาก ${risk.length} รายที่ค้าง`, `of ${risk.length} open`) })}
      ${statCard({ label: L("F-FN-03 · คาดกันเหลื่อมปี", "F-FN-03 · Likely carry-over"), value: mb(c.total), unit: L("ลบ.", "M"), icon: "clock", sub: `${c.items.length} ${L("รายการ", "items")}` })}
      ${statCard({ label: L("F-FN-04 · งานสัปดาห์หน้า", "F-FN-04 · Work next week"), value: String(load[1].total), icon: "list", sub: L(`สัปดาห์นี้ ${load[0].total}`, `this week ${load[0].total}`) })}</section>
    <section class="panel"><header>${chipIco("trend", "info")}<h2>${L("F-FN-01 การเบิกจ่ายรายเดือนถึงสิ้นปี", "F-FN-01 Monthly spending to year end")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท · จริง = จ่ายแล้ว · คาด = งวดสัญญา ผูกพัน และส่วนที่ยังว่างตามความน่าจะเป็นใน M10", "M baht · actual = paid · expected = contract phases, commitments and the free amount by the M10 probabilities")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("เดือน", "Month")}</th><th style="width:40%">${L("จริง / คาด", "Actual / expected")}</th><th class="n">${L("สะสม %", "Cumulative %")}</th><th class="n">P10–P90</th><th class="n">${L("เป้า", "Target")}</th></tr></thead>
        <tbody>${f.rows.map(r => { const q = qEnd[r.k.slice(5)]; return `<tr><td class="sub">${monthLabel(r.k)}</td><td><div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--surface-3)"><i style="width:${r.act / mx * 100}%;background:var(--ch-1)"></i><i style="width:${r.exp / mx * 100}%;background:color-mix(in srgb, var(--ch-1) 40%, transparent)"></i></div><span class="sub">${mb(r.act)} / ${mb(r.exp)}</span></td><td class="n">${fmt(r.pct, 1)}</td><td class="n sub">${fmt(r.lo, 0)}–${fmt(r.hi, 0)}</td><td class="n">${q != null ? `${T.q[q]}%` : ""}</td></tr>`; }).join("")}</tbody></table></div></section>
    <div class="grid2">
      <section class="panel"><header><h2>${L("F-FN-02 โอกาสส่งใช้เงินยืมช้า", "F-FN-02 Chance an advance is cleared late")}</h2></header>
        <div class="tbl-wrap"><table><thead><tr><th>${L("เงินยืม", "Advance")}</th><th class="n">${L("โอกาส", "Chance")}</th><th>${L("เหตุ", "Why")}</th></tr></thead>
          <tbody>${risk.map(x => `<tr><td class="mono">${x.a.id}<div class="sub">${esc(userName(x.a.borrower))}</div></td><td class="n">${fmt(x.p * 100, 0)}%</td><td class="sub">${esc(x.why)}</td></tr>`).join("") || `<tr><td colspan="3" class="sub">—</td></tr>`}</tbody></table></div></section>
      <section class="panel"><header><h2>${L("F-FN-03 คาดกันเงินเหลื่อมปี", "F-FN-03 Expected carry-over")}</h2><span class="sp"></span><span class="sub">${L("งวดหรือผูกพันที่ครบหลัง", "Due after")} ${fdate(FY_END)}</span></header>
        <div class="tbl-wrap"><table><thead><tr><th>${L("รายการ", "Item")}</th><th class="n">${L("ลบ.", "M")}</th></tr></thead><tbody>${c.items.map(x => `<tr><td><span class="mono">${x.id}</span> ${esc(tx(x.name))}</td><td class="n">${mb(x.amt)}</td></tr>`).join("") || `<tr><td colspan="2" class="sub">—</td></tr>`}</tbody></table></div></section>
    </div>
    <section class="panel"><header><h2>${L("F-FN-04 ปริมาณงานของการเงิน 6 สัปดาห์", "F-FN-04 Finance workload, next 6 weeks")}</h2></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("สัปดาห์", "Week")}</th><th class="n">${L("ใบขอเบิกจากงวดสัญญา", "Contract vouchers")}</th><th class="n">${L("เงินยืม", "Advances")}</th><th class="n">${L("รายการประจำเดือน", "Monthly items")}</th><th class="n">${L("รวม", "Total")}</th></tr></thead>
        <tbody>${load.map(w => `<tr><td class="sub">${fdate(w.a)} – ${fdate(w.b)}</td><td class="n">${w.ph}</td><td class="n">${w.adv}</td><td class="n">${w.util}</td><td class="n"><b>${w.total}</b></td></tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("วิธีในต้นแบบเป็นกฎและสถิติอย่างง่าย อ่านเป็นช่วงไม่ใช่ตัวเลขแน่นอน (D-P09)", "The prototype uses simple rules and statistics; read the results as ranges, not exact figures (D-P09)")}</div></section>`;
};
const WI_DEF = () => ({ lag: 7, slip: 0, target: spendT().end.all, share: 70 });
function wiCalc(w) {
  const f = fcMonths({ lag: w.lag, slip: w.slip }), c = fcCarry(w.slip), r = fcAdvRisk(w.share / 100);
  const gaps = f.lines.map(x => ({ l: x.l, gap: Math.max(0, x.l.amount * w.target / 100 - x.exp) })).filter(x => x.gap > 0).sort((a, b) => b.gap - a.gap);
  return { end: f.end50, q2: f.rows[5].pct, carry: c.total, gap: sumv(gaps.map(x => x.gap)), top: gaps.slice(0, 3), late: r.filter(x => x.p >= 0.5).length, demands: Math.round(r.length * (1 - w.share / 100)) };
}
FAI.wi = () => {
  const w = FWI || WI_DEF(), base = wiCalc(WI_DEF()), x = wiCalc(w), saved = S.fWhatifs || [];
  const row = (label, a, b, unit, better) => `<tr><td>${label}</td><td class="n">${a}${unit}</td><td class="n"><b>${b}</b>${unit}</td></tr>`;
  return `<div class="alert"><div class="ic">i</div><div><b>${L("จำลองเท่านั้น ข้อมูลจริงไม่เปลี่ยน", "Simulation only; real data never changes")}</b><p>${L("ปรับคันโยกแล้วเทียบกับฐาน บันทึกเป็นสถานการณ์เพื่อเทียบกันได้", "Move the levers and compare with the baseline; save a scenario to compare later")}</p></div></div>
    <section class="panel"><header><h2>${L("คันโยก", "Levers")}</h2></header><div class="body"><form class="inline-form" id="wi-form">
      <div class="f" style="flex:1 1 200px"><label for="wi-lag">W-FN-01 · ${L("วันจากตรวจรับถึงจ่าย", "Days from acceptance to payment")}</label><input type="number" id="wi-lag" min="0" max="60" value="${w.lag}"></div>
      <div class="f" style="flex:1 1 200px"><label for="wi-slip">W-FN-02 · ${L("งวดส่งมอบเลื่อน (วัน)", "Delivery slips (days)")}</label><input type="number" id="wi-slip" min="0" max="180" value="${w.slip}"></div>
      <div class="f" style="flex:1 1 200px"><label for="wi-target">W-FN-03 · ${L("เป้าเบิกจ่ายสิ้นปี (%)", "Year-end target (%)")}</label><input type="number" id="wi-target" min="50" max="100" value="${w.target}"></div>
      <div class="f" style="flex:1 1 200px"><label for="wi-share">W-FN-04 · ${L("ส่งใช้เงินยืมตรงเวลา (%)", "Advances cleared on time (%)")}</label><input type="number" id="wi-share" min="0" max="100" value="${w.share}"></div>
      <button class="btn primary" type="submit">${L("คำนวณ", "Work it out")}</button><button class="btn ghost" type="button" id="wi-reset">${L("กลับค่าฐาน", "Back to baseline")}</button></form></div></section>
    <section class="panel"><header><h2>${L("ผลเทียบกับฐาน", "Result against the baseline")}</h2><span class="sp"></span><input type="text" id="wi-name" placeholder="${L("ชื่อสถานการณ์", "Scenario name")}" style="width:180px" aria-label="${L("ชื่อสถานการณ์", "Scenario name")}"><button class="btn" type="button" id="wi-save">${L("บันทึกสถานการณ์", "Save scenario")}</button></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ผล", "Result")}</th><th class="n">${L("ฐาน", "Baseline")}</th><th class="n">${L("สถานการณ์นี้", "This scenario")}</th></tr></thead><tbody>
        ${row(L("เบิกจ่ายสะสมสิ้นไตรมาส 2", "Spent by end of Q2"), fmt(base.q2, 1), fmt(x.q2, 1), "%")}
        ${row(L("เบิกจ่ายสิ้นปี", "Spent by year end"), fmt(base.end, 1), fmt(x.end, 1), "%")}
        ${row(L("คาดกันเหลื่อมปี (ลบ.)", "Expected carry-over (M)"), mb(base.carry), mb(x.carry), "")}
        ${row(L("ขาดจากเป้ารวม (ลบ.)", "Total short of target (M)"), mb(base.gap), mb(x.gap), "")}
        ${row(L("เงินยืมที่น่าจะช้า", "Advances likely late"), base.late, x.late, "")}
        ${row(L("หนังสือเรียกชดใช้ที่คาด", "Demands expected"), base.demands, x.demands, "")}
      </tbody></table></div>
      ${x.top.length ? `<div class="body sub">${L("รายการที่ขาดจากเป้ามากสุด", "Lines furthest from target")}: ${x.top.map(t => `${t.l.id} ${esc(tx(t.l.name))} ${mb(t.gap)}`).join(" · ")}</div>` : ""}</section>
    ${saved.length ? `<section class="panel"><header><h2>${L("สถานการณ์ที่บันทึกไว้", "Saved scenarios")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("ชื่อ", "Name")}</th><th class="n">W1</th><th class="n">W2</th><th class="n">W3</th><th class="n">W4</th><th class="n">${L("สิ้นปี %", "Year end %")}</th><th class="n">${L("กันเงิน (ลบ.)", "Carry-over (M)")}</th></tr></thead>
      <tbody>${saved.map(s => `<tr><td>${esc(s.name)}<div class="sub">${esc(userName(s.by))} · ${fdate(s.t, true)}</div></td><td class="n">${s.w.lag}</td><td class="n">${s.w.slip}</td><td class="n">${s.w.target}</td><td class="n">${s.w.share}</td><td class="n">${fmt(s.r.end, 1)}</td><td class="n">${mb(s.r.carry)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};
FAI.kpi = () => {
  const K = kpiF(), G = fSignals(), canAsk = ROLE === "audit" || ROLE === "finhead", fin = ROLE === "fin", fp = Object.values(S.fSig || {}).filter(x => x.status === "fp").length, dec = Object.values(S.fSig || {}).filter(x => ["fp", "issue"].includes(x.status)).length;
  return `<section class="panel"><header><h2>${L("ตัวชี้วัดการเงิน KPI-F", "Finance KPIs")}</h2><span class="sp"></span><span class="sub">${L("นิยามครั้งเดียว ใช้ทั้ง F1 F9 และแชต AI", "Defined once; used on F1, F9 and in the AI chat")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "ID")}</th><th>${L("ตัวชี้วัด", "KPI")}</th><th class="n">${L("ค่า", "Value")}</th><th>${L("เป้า", "Target")}</th><th>${L("นิยาม", "Definition")}</th></tr></thead>
        <tbody>${K.map(([id, n, v, d, t, ok]) => `<tr><td class="mono">${id}</td><td>${dotI(ok ? "ok" : "warn")}${n}</td><td class="n"><b>${v}</b></td><td class="sub">${t}</td><td class="sub">${d}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="panel"><header><h2>${L("สัญญาณเตือน SG-F", "Warning signals")}</h2><span class="sp"></span><span class="sub">${L("สิ่งที่ควรตรวจ ไม่ใช่ข้อกล่าวหา", "Things to check, not accusations")} · ${L("ผลบวกลวง", "false positives")} ${fp}/${dec}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "ID")}</th><th>${L("สัญญาณ", "Signal")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
        <tbody>${G.map(g => { const s = sigSt(g.key); return `<tr><td class="mono">${g.id}</td><td>${esc(g.text)}${s.note ? `<div class="sub">${L("คำชี้แจง", "Explanation")}: ${esc(s.note)}</div>` : ""}</td><td>${tag(tx(SIG_ST[s.status][0]), SIG_ST[s.status][1])}</td>
          <td><div class="row" style="flex-wrap:wrap;gap:4px"><button class="btn ghost" type="button" data-jump="${g.link}">${L("เปิด", "Open")}</button>
            ${canAsk && s.status === "new" ? `<button class="btn" type="button" data-sg="ask" data-sgk="${esc(g.key)}">${L("ขอคำชี้แจง", "Ask")}</button>` : ""}
            ${fin && s.status === "asked" ? `<input type="text" id="sgn-${esc(g.key).replace(/[^\w-]/g, "_")}" placeholder="${L("คำชี้แจง", "Explanation")}" style="width:150px" aria-label="${L("คำชี้แจง", "Explanation")}"><button class="btn" type="button" data-sg="explain" data-sgk="${esc(g.key)}">${L("ชี้แจง", "Explain")}</button>` : ""}
            ${canAsk && ["asked", "explained", "new"].includes(s.status) ? `<button class="btn ghost" type="button" data-sg="issue" data-sgk="${esc(g.key)}">${L("เป็นประเด็น", "Issue")}</button><button class="btn ghost" type="button" data-sg="fp" data-sgk="${esc(g.key)}">${L("ผลบวกลวง", "False positive")}</button>` : ""}</div></td></tr>`; }).join("") || `<tr><td colspan="4" class="sub">${L("ไม่มีสัญญาณ", "No signals")}</td></tr>`}</tbody></table></div></section>`;
};

// ---------- bindings ----------
{
  FIN_BINDS.push(() => {
    const done = msg => { commit(); renderShell(); route(); if (msg) toast(msg); };
    $$("[data-fstart]").forEach(b => (b.onclick = () => { fStart(b.dataset.fstart); audit(["เริ่มงาน Agent การเงิน", "Started a finance agent"], b.dataset.fstart); done(); }));
    $$("[data-fopen]").forEach(s => (s.onchange = () => { F_RUN_OPEN = s.value; route(); }));
    $$("[data-fok]").forEach(b => (b.onclick = () => { const r = S.fRuns.find(x => x.id === b.dataset.fok), s = r.steps[r.ptr]; fApply(r, s); s.status = "approved"; s.by = me().id; audit(["อนุมัติขั้นตอนของ Agent", "Approved an agent step"], `${r.id} ${s.tool}`); r.ptr++; r.status = "running"; fAdvance(r); done(); }));
    $$("[data-fno]").forEach(b => (b.onclick = () => { const r = S.fRuns.find(x => x.id === b.dataset.fno), s = r.steps[r.ptr]; s.status = "rejected"; audit(["ไม่อนุมัติขั้นตอนของ Agent", "Rejected an agent step"], `${r.id} ${s.tool}`); r.ptr++; r.status = "running"; fAdvance(r); done(); }));
    const wf = $("#wi-form");
    if (wf) wf.onsubmit = e => { e.preventDefault(); FWI = { lag: Number($("#wi-lag").value), slip: Number($("#wi-slip").value), target: Number($("#wi-target").value), share: Number($("#wi-share").value) }; route(); };
    const wr = $("#wi-reset"); if (wr) wr.onclick = () => { FWI = null; route(); };
    const ws = $("#wi-save");
    if (ws) ws.onclick = () => { const w = FWI || WI_DEF(), name = $("#wi-name").value.trim() || L(`สถานการณ์ ${(S.fWhatifs || []).length + 1}`, `Scenario ${(S.fWhatifs || []).length + 1}`); (S.fWhatifs = S.fWhatifs || []).push({ name, w, r: wiCalc(w), by: me().id, t: nowIso() }); audit(["บันทึกสถานการณ์จำลองการเงิน", "Saved a finance what-if scenario"], name); done(L("บันทึกแล้ว", "Saved")); };
    $$("[data-sg]").forEach(b => (b.onclick = () => {
      const k = b.dataset.sgk, a = b.dataset.sg, cur = sigSt(k); S.fSig = S.fSig || {};
      if (a === "explain") { const el = $("#sgn-" + k.replace(/[^\w-]/g, "_")), note = el ? el.value.trim() : ""; if (note.length < 5) { toast(L("พิมพ์คำชี้แจง", "Type the explanation")); return; } S.fSig[k] = Object.assign({}, cur, { status: "explained", note, by: me().id, t: nowIso() }); notify(["audit", "finhead"], [`ชี้แจงสัญญาณ ${k} แล้ว`, `Signal ${k} has been explained`], "fnc-ai:kpi"); }
      else { S.fSig[k] = Object.assign({}, cur, { status: a === "ask" ? "asked" : a, by: me().id, t: nowIso() }); if (a === "ask") notify(["fin"], [`ขอคำชี้แจงสัญญาณ ${k}`, `Please explain signal ${k}`], "fnc-ai:kpi"); }
      audit(["คัดกรองสัญญาณเตือนการเงิน", "Triaged a finance warning signal"], `${k} · ${a}`); done();
    }));
  });
}

// ---------- menu, overview, tasks, demo ----------
NAV_ICON.ai = NAV_ICON.ai || "sparkle";
{
  // F1 shows the KPIs that are off target.
  FS.kpiOff = () => { const k = kpiF().filter(x => !x[5]); return k.length ? `<section class="panel"><header><h2>${L("ตัวชี้วัดที่ยังไม่ถึงเป้า", "KPIs off target")}</h2><span class="sp"></span><button class="btn ghost" type="button" data-jump="fnc-ai:kpi">${L("ดูทั้งหมด", "See all")}</button></header><div class="body">${k.map(([id, nm, v]) => `<div style="margin:2px 0">${dotI("warn")}<span class="mono">${id}</span> ${nm} · <b>${v}</b></div>`).join("")}</div></section>` : ""; };
  const tb = tabBadge;
  tabBadge = function (nid, tab) {
    if (nid === "finance" && tab === "ai") { const k = (S.fRuns || []).filter(r => r.status === "waiting" && F_AG[r.agent].who.includes(ROLE)).length + ((ROLE === "audit" || ROLE === "finhead") ? fSignals().filter(g => sigSt(g.key).status === "new").length : ROLE === "fin" ? fSignals().filter(g => sigSt(g.key).status === "asked").length : 0); return k ? `<span class="badge">${k}</span>` : ""; }
    return tb(nid, tab);
  };
  const mt = myTasks;
  myTasks = function () {
    const t = mt.apply(this, arguments), R = (title, sub, due, link, cls) => t.unshift({ title, sub, due, link, cls });
    (S.fRuns || []).filter(r => r.status === "waiting" && F_AG[r.agent].who.includes(ROLE)).forEach(r => R(`${L("อนุมัติขั้นตอนของ", "Approve a step of")} ${tx(F_AG[r.agent].name)}`, `${r.id} · ${r.steps[r.ptr].tool}`, TODAY, "fnc-ai", "p-warn"));
    if (ROLE === "fin") fSignals().filter(g => sigSt(g.key).status === "asked").forEach(g => R(`${L("ชี้แจงสัญญาณ", "Explain signal")} ${g.id}`, g.text, TODAY, "fnc-ai:kpi", "p-warn"));
    return t.filter(x => !(x.cls === "p-mute" && t.length > 1));
  };
}
// Finance demo steps, appended after the steps the other rounds own.
DEMO.push(
  { t: "52:00", role: "fin", link: "fnc-home", title: ["Fisko Finance: นาฬิกาตามระเบียบ", "Fisko Finance: regulation clocks"],
    say: ["ทุกกำหนดเวลาในระเบียบกระทรวงการคลังฯ 2562 เป็นนาฬิกา ขอเบิก 5 วันทำการหลังตรวจรับ ส่งใช้เงินยืม 15 หรือ 30 วัน นำส่งเงินเกิน 1 หมื่นบาทภายใน 3 วันทำการ พร้อมเลขข้อ", "Every deadline in the 2562 Finance Ministry regulation is a clock: request payment within 5 working days of acceptance, clear advances in 15 or 30 days, remit over 10,000 baht within 3 working days, each with its clause."],
    do: [`ชี้นาฬิกาที่เลยกำหนด → เปิด F2 → “เตรียมข้อมูล PO” ของ CM-2570-002 → ใส่เลข 10 หลัก → บันทึก`, `Point at the overdue clocks → open F2 → Prepare PO data for CM-2570-002 → enter 10 digits → Save`] },
  { t: "53:00", role: "div", link: "advances", title: ["เงินยืมของฉัน", "My advances"],
    say: ["พนักงานขอยืมและส่งใช้เองได้ ระบบกันการยืมใหม่เมื่อยังมีเงินยืมค้าง ตามข้อ 59 โดยไม่มีปุ่มข้ามกฎ", "Staff borrow and clear by themselves. The system blocks a new advance while one is open (clause 59), with no override."],
    do: [`ชี้ข้อความ “ยังขอยืมใหม่ไม่ได้” → “ส่งใช้” AD-2570-001 → ใส่ยอดใช้จริงและติ๊กใบเสร็จ → ส่งใบสำคัญ`, `Point at “You can't ask for a new advance yet” → Clear AD-2570-001 → enter the amount spent and tick receipts → Send the evidence`] },
  { t: "54:00", role: "finhead", link: "fnc-adv", title: ["ทะเบียนเงินยืมและการเรียกชดใช้", "Advance register and demands"],
    say: ["หัวหน้าการเงินเห็นอายุหนี้ ออกหนังสือเรียกชดใช้ภายใน 30 วันตามข้อ 68 และรายงานหัวหน้าส่วนราชการเมื่อไม่ชดใช้", "The head of finance sees the ageing, issues a demand within 30 days (clause 68) and reports to the head of the agency if it isn't repaid."],
    do: [`กรอง “เลยกำหนด” → เปิด AD-2570-002 → “ออกหนังสือเรียกชดใช้”`, `Filter Overdue → open AD-2570-002 → Issue a demand`] },
  { t: "55:00", role: "fin", link: "fnc-recv", title: ["รับเงิน นำส่ง และเงินคงเหลือประจำวัน", "Receipts, remittance and the daily cash report"],
    say: ["ใบเสร็จมีเลขเล่มเลขที่ แก้ไม่ได้ ยกเลิกได้พร้อมเหตุผล นำส่งตามข้อ 101 และกรรมการเก็บรักษาเงินนับและลงนามรายคน ยอดไม่ตรงรายงานหัวหน้าทันที", "Receipts carry book and number, can't be edited, only cancelled with a reason. Money is remitted per clause 101, and each cash committee member counts and signs; a difference goes to the head at once."],
    do: ["“บันทึกรับเงินในระบบ” → “นำส่ง” เงินเบิกเกินส่งคืนที่เลยกำหนด → เปิด F6 → “จัดทำรายงานและส่งมอบให้กรรมการ”", "Record in the system → Remit the overdue refund → open F6 → Prepare the report and hand over"] },
  { t: "56:00", role: "finhead", link: "fnc-recon", title: ["งบพิสูจน์ยอดเงินฝากและการปิดงวด", "Bank reconciliation and period close"],
    say: ["จับคู่สามทาง Fisko GFMIS และธนาคาร ผู้บันทึกรับจ่ายของเดือนลงนามงบพิสูจน์ยอดไม่ได้ และปิดงวดด้วยรายการตรวจ 6 ข้อ", "Three-way matching of Fisko, GFMIS and the bank. Whoever recorded the month's money can't sign the reconciliation, and the period closes on a six-point checklist."],
    do: ["(เป็นการเงิน) นำเข้ารายการเดินบัญชี → “บันทึกเข้าบัญชี” ค่าธรรมเนียม → (เป็นหัวหน้าการเงิน) ลงนาม → F8 ปิดงวดกันยายน", "(As finance) import the statement → Record the fee in the books → (as head of finance) sign → F8 close September"] },
  { t: "57:00", role: "finhead", link: "fnc-ai", title: ["Agent การเงินและพยากรณ์", "Finance agents and forecasts"],
    say: ["Agent ตรวจใบขอเบิก ติดตามเงินยืม เสนอคู่กระทบยอด ช่วยปิดงวด และพยากรณ์ แต่หยุดให้คนอนุมัติทุกขั้นที่เขียนข้อมูล และไม่จ่ายเงินเอง", "Agents check vouchers, chase advances, propose matches, help close and forecast, but stop for a person at every write and never pay."],
    do: ["เริ่ม “ผู้ช่วยปิดงวด” → อ่านร่างบันทึก → แท็บพยากรณ์ → แท็บตัวชี้วัด “ขอคำชี้แจง” สัญญาณใบแจ้งหนี้ซ้ำ", "Start the Close Assistant → read the draft memo → Forecasts tab → KPIs tab, Ask about the duplicate invoice signal"] },
);
