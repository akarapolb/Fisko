// Fisko Procurement round 22 (Q5 of design v0.2): forecasts F-01..F-05 and what-if scenarios W-01..W-06
// (chapter 13; FR-PR-26, 60, 61, 62). Every forecast shows its range, sample size and assumptions. Scenarios
// never change real data: they run the same functions with different parameters.
let WIP = null, WI_LOCK = new Set(), WI_NAME = "", FC_CUT = null;
const CUTS = () => [[S.pcfg.signCutoff, ["สิ้นปีงบประมาณ", "End of the fiscal year"]], ["2027-03-31", ["สิ้นไตรมาส 2 (เป้าเร่งรัดเบิกจ่าย ตัวอย่าง)", "End of Q2 (sample spending-acceleration target)"]], ["2026-12-31", ["สิ้นไตรมาส 1", "End of Q1"]]];
const cutSel = (id, v) => `<select id="${id}" aria-label="${L("วันตัดลงนาม", "Signing cut-off")}">${CUTS().map(([d, n]) => `<option value="${d}" ${d === v ? "selected" : ""}>${tx(n)} · ${fdate(d)}</option>`).join("")}</select>`;
const PFY_END = "2027-09-30", PFY_MONTHS = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(2026, 9 + i, 1)); return d.toISOString().slice(0, 7); });
const STAGE_NM = { start: ["รอถึงกำหนดในแผน", "Waiting for the planned date"], approve: ["อนุมัติใบขอซื้อ", "Requisition approval"], prep: ["TOR ราคากลาง และประกาศ", "TOR, reference price and notice"], small: ["หาผู้เสนอราคา (เส้นทางเล็ก)", "Quotations (small path)"],
  sourcing: ["รับข้อเสนอใน e-GP", "Bidding in e-GP"], eval: ["พิจารณาผล", "Evaluation"], appeal: ["ช่วงอุทธรณ์", "Appeal window"], contract: ["ทำสัญญา", "Contracting"] };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashId = s => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

// ---------- durations: the case history when there is enough of it, otherwise the SLA defaults in M10 ----------
function stageSamples() {
  const span = (c, a, b) => (evDate(c, a) && evDate(c, b) ? dayDiff(evDate(c, a), evDate(c, b)) : null), out = { approve: [], prep: [], sourcing: [], eval: [], contract: [], small: [] };
  S.cases.forEach(c => {
    const push = (k, v) => v != null && v >= 0 && out[k].push(v);
    push("approve", span(c, "requested", "approved"));
    if (c.method === "specific") push("small", span(c, "approved", "award")); else { push("prep", span(c, "approved", "sourcing")); push("sourcing", span(c, "sourcing", "bidders")); push("eval", span(c, "bidders", "award")); }
    push("contract", span(c, "appeal_elapsed", "contract") ?? span(c, "award", "contract"));
  });
  return out;
}
function makeSampler(opt) {
  const emp = stageSamples(), sla = S.pcfg.fcSla, minN = S.pcfg.fcMinN, delay = opt.delay || {}, speed = opt.speed || 1;
  return (stage, r) => {
    const a = emp[stage] || [], base = a.length >= minN ? a[Math.floor(r() * a.length)] * (0.85 + 0.3 * r()) : sla[stage] * (0.7 + 0.6 * r());
    return Math.max(0, Math.round(base * speed + (delay[stage] || 0)));
  };
}
const usesDefaults = () => { const e = stageSamples(); return Object.keys(S.pcfg.fcSla).filter(k => k !== "start" && (e[k] || []).length < S.pcfg.fcMinN); };

// ---------- F-02 chance of signing before the cut-off, per open case ----------
function caseMethod(c, opt) { const p = famPlan(c.plan); if (opt.methods && opt.methods[c.id]) return opt.methods[c.id]; return c.method || p.method; }
function remainingStages(c, opt) {
  const n = caseState(c), comp = caseMethod(c, opt) !== "specific", st = [];
  if (n <= 1) st.push("start");
  if (n <= 2) st.push("approve");
  if (comp) { if (n <= 4) st.push("prep"); if (n <= 5) st.push("sourcing"); if (n <= 6) st.push("eval"); if (n <= 7) st.push("appeal"); } else if (n <= 4) st.push("small");
  if (n <= 8) st.push("contract");
  return st;
}
function simCase(c, opt = {}) {
  const N = S.pcfg.fcRuns, r = rng(hashId(c.id) + CUR_FY), sample = makeSampler(opt), p = famPlan(c.plan), stages = remainingStages(c, opt), cut = opt.cutoff || FC_CUT || S.pcfg.signCutoff;
  const dates = [], stageSum = {};
  for (let i = 0; i < N; i++) {
    let d = TODAY;
    for (const s of stages) {
      const before = d;
      if (s === "start") { const st = addDays(p.month, -S.pcfg.fcLead); if (st > d) d = st; }
      else if (s === "sourcing" && c.egp && c.egp.close && caseState(c) === 5 && !c.closeElapsed && c.egp.close > d) d = addDays(c.egp.close, delayOf(opt, "sourcing"));
      else if (s === "appeal") d = c.award && c.award.appealEnd && !c.appealElapsed && caseState(c) === 7 ? (c.award.appealEnd > d ? c.award.appealEnd : d) : addWorkdays(d, S.pcfg.appealDays);
      else d = addDays(d, sample(s, r));
      stageSum[s] = (stageSum[s] || 0) + dayDiff(before, d);
    }
    dates.push(d);
  }
  dates.sort();
  const slow = Object.keys(stageSum).sort((a, b) => stageSum[b] - stageSum[a])[0];
  return { c, dates, p: dates.filter(d => d <= cut).length / N, med: dates[Math.floor(N * 0.5)], p10: dates[Math.floor(N * 0.1)], p90: dates[Math.floor(N * 0.9) - 1], slow, stages, amount: caseReq(c) ? caseReq(c).amount : p.est };
}
const delayOf = (opt, s) => (opt.delay && opt.delay[s]) || 0;
const openCases = () => S.cases.filter(c => !c.cancelled && caseState(c) <= 8);
const simAll = (opt = {}) => openCases().map(c => simCase(c, opt));

// ---------- F-01 commitments and payments by month ----------
function payLags() { const lags = S.payreqs.filter(p => p.status === "approved" && p.decided).map(p => { const c = famCon(p.contract), ph = c && c.phases.find(x => x.n === p.phase); return ph && ph.signs.length ? dayDiff(ph.signs[ph.signs.length - 1].t.slice(0, 10), p.decided.t.slice(0, 10)) : null; }).filter(x => x != null && x >= 0); return lags; }
function monthly(opt = {}, sims) {
  sims = sims || simAll(opt);
  const N = S.pcfg.fcRuns, lags = payLags(), lag = lags.length >= S.pcfg.fcMinN ? med(lags) : S.pcfg.payLag, mi = m => PFY_MONTHS.indexOf(m);
  const rows = PFY_MONTHS.map(m => ({ m, comAct: 0, comFc: 0, lo: 0, hi: 0, payAct: 0, payFc: 0 }));
  S.contracts.forEach(c => { const i = mi(c.signed.slice(0, 7)); if (i >= 0) rows[i].comAct += c.amount; });
  S.payreqs.filter(p => p.status === "approved" && p.decided).forEach(p => { const i = mi(p.decided.t.slice(0, 7)); if (i >= 0) rows[i].payAct += p.amount; });
  S.contracts.filter(c => c.status !== "terminated").forEach(c => c.phases.filter(ph => !ph.cancelled && !S.payreqs.some(p => p.contract === c.id && p.phase === ph.n && p.status === "approved")).forEach(ph => {
    let d = addDays(phDue(ph) > TODAY ? phDue(ph) : TODAY, lag); const i = mi(d.slice(0, 7)); if (i >= 0) rows[i].payFc += (ph.result === "partial" ? ph.okAmount : ph.amount);
  }));
  const per = PFY_MONTHS.map(() => new Array(N).fill(0));
  sims.forEach(s => s.dates.forEach((d, k) => { const i = mi(d.slice(0, 7)); if (i >= 0) { per[i][k] += s.amount; [45, 90, 135].forEach(off => { const j = mi(addDays(d, off + lag).slice(0, 7)); if (j >= 0) rows[j].payFc += s.amount / 3 / N; }); } }));
  per.forEach((arr, i) => { const s = arr.slice().sort((a, b) => a - b); rows[i].comFc = avg(arr); rows[i].lo = s[Math.floor(N * 0.1)]; rows[i].hi = s[Math.floor(N * 0.9) - 1]; });
  return { rows, lag, lagN: lags.length };
}

// ---------- F-03 price trend by category ----------
function priceTrend() {
  const idx = S.pcfg.priceIndexPct / 100, out = {};
  S.contracts.forEach(c => { const p = famPlan(c.plan); (out[p.cat] = out[p.cat] || []).push((c.base || c.amount) / p.est); });
  return S.pcat.map(k => { const r = out[k.id] || []; return { cat: k, n: r.length, med: med(r), lo: r.length ? Math.min(...r) : null, hi: r.length ? Math.max(...r) : null, idx }; }).filter(x => x.n || S.pplan.some(p => p.cat === x.cat.id));
}

// ---------- F-04 carry-over risk ----------
const carryRisk = sims => (sims || simAll()).filter(s => s.p < S.pcfg.carryRisk);
const cutNow = () => FC_CUT || S.pcfg.signCutoff;

// ---------- F-05 workload ----------
function workload(opt = {}) {
  const H = S.pcfg.stageHours, weeks = Array.from({ length: 12 }, (_, i) => ({ w: addDays(TODAY, i * 7), h: 0 })), officers = opt.officers || S.users.filter(u => u.role === "proc" && u.active).length || 1;
  openCases().forEach(c => { const n = caseState(c), h = H[n] || 0; [0, 1].forEach(k => (weeks[k].h += h / 2));
    if (n <= 1) { const st = addDays(famPlan(c.plan).month, -S.pcfg.fcLead), wk = Math.floor(dayDiff(TODAY, st) / 7); if (wk >= 0 && wk < 12) weeks[wk].h += (H[2] || 0) + (H[3] || 0) + (H[4] || 0); } });
  const cap = officers * S.pcfg.weekHours, peak = Math.max(...weeks.map(w => w.h));
  return { weeks, cap, officers, peak, load: peak / cap };
}

// ---------- what-if (W-01..W-06) ----------
const WI_DEFAULT = () => ({ cutoff: FC_CUT || S.pcfg.signCutoff, cut: 0, smax: S.pcfg.specificMax, stage: "eval", days: 0, price: 0, pen: S.pcfg.penaltyPct, ladder: S.pcfg.ladderPct, officers: S.users.filter(u => u.role === "proc" && u.active).length || 1 });
function runScenario(w) {
  const methods = {};
  openCases().filter(c => caseState(c) <= 3 && !(c.methodApproval && c.methodApproval.status === "approved" && c.special)).forEach(c => { const est = c.ref ? c.ref.amount : famPlan(c.plan).est; methods[c.id] = est * (1 + w.price / 100) <= w.smax ? "specific" : "ebid"; });
  const switched = Object.keys(methods).filter(id => methods[id] !== caseMethod(caseOf(id), {}));
  const wl = workload({ officers: w.officers }), speed = Math.max(1, wl.load);
  const opt = { methods, delay: w.days ? { [w.stage]: w.days } : {}, speed, cutoff: w.cutoff }, sims = simAll(opt), risk = carryRisk(sims), mon = monthly(opt, sims);
  // W-01: cut the plan by x% of what is not yet approved, latest planned items first, skipping locked items
  const cand = S.pplan.filter(p => { const c = caseByPlan(p.id); return c && !c.cancelled && caseState(c) <= 2 && !WI_LOCK.has(p.id); }).sort((a, b) => (a.month < b.month ? 1 : -1));
  const pool = sumv(S.pplan.filter(p => { const c = caseByPlan(p.id); return c && !c.cancelled && caseState(c) <= 2; }).map(p => p.est)), target = pool * w.cut / 100; let got = 0; const dropped = [];
  for (const p of cand) { if (got >= target) break; dropped.push(p); got += p.est; }
  // W-04: price rise on cases not yet announced
  const over = openCases().filter(c => caseState(c) <= 4).filter(c => { const p = famPlan(c.plan), rq = caseReq(c), base = c.ref ? c.ref.amount : p.est; return base * (1 + w.price / 100) > (rq ? rq.amount : p.est); });
  // W-05: penalty rate and the approval ladder
  const pens = S.contracts.map(c => ({ c, pen: sumv(c.phases.map(ph => Math.round(w.pen / 100 * ph.amount * phLate(ph)))) })), overCap = pens.filter(x => x.pen > S.pcfg.penaltyCapPct / 100 * x.c.amount);
  const vars = S.contracts.flatMap(c => (c.vars || []).filter(v => v.kind === "amount").map(v => ({ c, v }))), toExec = vars.filter(x => Math.abs(x.v.delta) / x.c.base > w.ladder / 100).length;
  return { w, sims, risk, carry: sumv(risk.map(s => s.amount)), atRisk: risk.length, comFY: sumv(mon.rows.map(r => r.comAct + r.comFc)), payFY: sumv(mon.rows.map(r => r.payAct + r.payFc)), switched, dropped, dropAmt: sumv(dropped.map(p => p.est)), over, overCap, toExec, wl, speed };
}

// ---------- views ----------
function fcChart(mon) {
  const W = 720, H = 220, pad = 34, rows = mon.rows, mx = Math.max(1, ...rows.map(r => Math.max(r.comAct + r.hi, r.payAct + r.payFc))), bw = (W - pad * 2) / 12, y = v => H - 24 - (v / mx) * (H - 44);
  return `<div class="tbl-wrap"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:560px;height:auto" role="img" aria-label="${L("กราฟภาระผูกพันและการเบิกจ่ายรายเดือน", "Monthly commitments and payments chart")}">
    ${rows.map((r, i) => { const x = pad + i * bw, ca = r.comAct, cf = r.comFc;
      return `<rect rx="3" x="${x + 4}" y="${y(ca)}" width="${bw / 2 - 6}" height="${H - 24 - y(ca)}" fill="var(--ch-1)"><title>${monthLabel(r.m)} · ${L("ผูกพันแล้ว", "committed")} ${mb(ca)}</title></rect>
        <rect rx="3" x="${x + 4}" y="${y(ca + cf)}" width="${bw / 2 - 6}" height="${Math.max(0, y(ca) - y(ca + cf))}" fill="var(--ch-1)" opacity=".35"><title>${L("คาดว่าจะผูกพัน", "expected")} ${mb(cf)} (P10 ${mb(r.lo)} – P90 ${mb(r.hi)})</title></rect>
        ${r.hi > 0 ? `<line x1="${x + bw / 4}" x2="${x + bw / 4}" y1="${y(ca + r.lo)}" y2="${y(ca + r.hi)}" stroke="var(--ink-2)" stroke-width="1.5"/>` : ""}
        <rect rx="3" x="${x + bw / 2}" y="${y(r.payAct + r.payFc)}" width="${bw / 2 - 6}" height="${H - 24 - y(r.payAct + r.payFc)}" fill="var(--ch-2)" opacity=".75"><title>${L("เบิกจ่าย", "payments")} ${mb(r.payAct)} + ${L("คาด", "expected")} ${mb(r.payFc)}</title></rect>
        <text x="${x + bw / 2}" y="${H - 8}" font-size="10" text-anchor="middle" fill="var(--muted)">${monthLabel(r.m).split(" ")[0].slice(0, LANG === "en" ? 3 : 4)}</text>`; }).join("")}
    ${[0.25, 0.5, 0.75, 1].map(f => `<line x1="${pad}" x2="${W - pad}" y1="${y(mx * f)}" y2="${y(mx * f)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${pad - 6}" y="${y(mx * f) + 3}" font-size="9.5" text-anchor="end" fill="var(--faint)">${mb(mx * f).replace(/\.\d+$/, "")}</text>`).join("")}
    <line x1="${pad}" x2="${W - pad}" y1="${H - 24}" y2="${H - 24}" stroke="var(--line)"/></svg></div>
  <div class="row sub" style="gap:14px"><span><span style="display:inline-block;width:12px;height:10px;background:var(--ch-1)"></span> ${L("ผูกพันแล้ว", "Committed")}</span><span><span style="display:inline-block;width:12px;height:10px;background:var(--ch-1);opacity:.35"></span> ${L("คาดว่าจะผูกพัน (เส้น = P10 ถึง P90)", "Expected commitment (line = P10 to P90)")}</span><span><span style="display:inline-block;width:12px;height:10px;background:var(--ch-2);opacity:.75"></span> ${L("เบิกจ่ายและคาดการณ์", "Payments and expected")}</span></div>`;
}
PROC.forecast = () => {
  const sims = simAll(), mon = monthly({}, sims), risk = carryRisk(sims), pt = priceTrend(), wl = workload(), def = usesDefaults();
  return `
  <section class="stats">
    ${statCard({ label: L("ผูกพันทั้งปี (คาด)", "Full-year commitment (expected)"), value: mb(sumv(mon.rows.map(r => r.comAct + r.comFc))), unit: L("ลบ.", "M"), spark: mon.rows.map(r => r.comAct + r.comFc), sub: "" })}
    ${statCard({ label: L("เบิกจ่ายทั้งปี (คาด)", "Full-year payments (expected)"), value: mb(sumv(mon.rows.map(r => r.payAct + r.payFc))), unit: L("ลบ.", "M"), color: "var(--ch-2)", spark: mon.rows.map(r => r.payAct + r.payFc), sub: "" })}
    ${statCard({ label: L("แฟ้มเสี่ยงไม่ทันวันตัด", "Cases at risk by the cut-off"), value: risk.length, icon: "alert", tone: risk.length ? "bad" : "ok", sub: `${mb(sumv(risk.map(s => s.amount)))} ${L("ลบ.", "M")}` })}
    ${statCard({ label: L("ภาระงานสูงสุดต่อกำลัง", "Peak workload vs capacity"), value: pc(wl.load), ring: Math.min(1, wl.load), color: wl.load > 1 ? "var(--bad)" : "var(--ch-1)", sub: `${fmt(wl.peak, 1)} / ${wl.cap} ${L("ชม.", "h")}` })}
  </section>
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("พยากรณ์จากข้อมูลน้อย อ่านเป็นช่วง ไม่ใช่ตัวเลขแน่นอน", "Forecasts from little data: read the range, not a single number")}</b><p>${L("จำลอง", "Simulated")} ${S.pcfg.fcRuns} ${L("รอบต่อแฟ้ม จากเวลาจริงของแฟ้มที่ผ่านมา", "runs per case from past case durations")}${def.length ? ` · ${L("ขั้นที่ข้อมูลไม่ถึง", "stages with fewer than")} ${S.pcfg.fcMinN} ${L("แฟ้มใช้ค่าตั้งต้น SLA ใน M10", "cases use the SLA defaults in M10")}: ${def.map(k => tx(STAGE_NM[k])).join(", ")}` : ""} </p><div class="row" style="margin-top:6px"><span class="sub">${L("วันตัดลงนาม", "Signing cut-off")}</span>${cutSel("fc-cut", cutNow())}<span class="sub">${L("เป้าลงนามตามมาตรการเร่งรัดเบิกจ่ายเปลี่ยนทุกปี ระดับ C ต้องยืนยัน", "Signing targets under spending measures change each year; level C, to confirm")}</span></div></div></div>
  <section class="panel"><header><h2>F-01 ${L("ภาระผูกพันและการเบิกจ่ายรายเดือน", "Monthly commitments and payments")} · ${fyLabel(FAM_FY)}</h2><span class="sp"></span><span class="sub">${L("เวลาตรวจรับถึงจ่าย", "Acceptance to payment")} ${mon.lag} ${L("วัน", "days")} (${mon.lagN >= S.pcfg.fcMinN ? `n=${mon.lagN}` : L("ค่าตั้งต้น", "default")})</span></header>
    <div class="body">${fcChart(mon)}</div>
    <div class="body sub" style="padding-top:0">${L("รวมทั้งปี", "Full year")}: ${L("ผูกพัน", "committed")} ${mb(sumv(mon.rows.map(r => r.comAct + r.comFc)))} ${L("ลบ.", "M")} · ${L("เบิกจ่าย", "paid")} ${mb(sumv(mon.rows.map(r => r.payAct + r.payFc)))} ${L("ลบ.", "M")} · ${L("ใช้ร่วมกับ Fisko Finance และ M07", "shared with Fisko Finance and M07")}</div></section>
  <section class="panel"><header><h2>F-02 ${L("โอกาสลงนามทันวันตัด", "Chance of signing before the cut-off")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("แฟ้ม", "Case")}</th><th>${L("ขั้นปัจจุบัน", "Now at")}</th><th class="n">${L("โอกาส", "Chance")}</th><th>${L("คาดว่าลงนาม (ค่ากลาง)", "Expected signing (median)")}</th><th>P90</th><th>${L("ขั้นที่ใช้เวลามากสุด", "Longest stage")}</th></tr></thead>
      <tbody>${sims.map(s => `<tr><td><span class="mono">${s.c.id}</span> ${esc(caseName(s.c))}</td><td class="sub">${caseState(s.c)}/12</td><td class="n">${tag(pc(s.p), s.p >= 0.8 ? "p-ok" : s.p >= S.pcfg.carryRisk ? "p-warn" : "p-bad")}</td><td>${fdate(s.med)}</td><td class="sub">${fdate(s.p90)}</td><td class="sub">${tx(STAGE_NM[s.slow] || ["—", "—"])}</td></tr>`).join("") || `<tr><td colspan="6" class="sub">—</td></tr>`}</tbody></table></div></section>
  <section class="panel"><header><h2>F-04 ${L("วงเงินเสี่ยงต้องกันเงินเหลื่อมปี", "Money at risk of carry-over")}</h2><span class="sp"></span>${risk.length && (ROLE === "prochead" || isProcRole()) ? `<button class="btn" type="button" id="fc-tell">${L("แจ้งการเงิน (M06)", "Tell Finance (M06)")}</button>` : ""}</header>
    <div class="body">${risk.length ? `<ul style="margin:0;padding-left:18px">${risk.map(s => `<li>${s.c.id} · ${esc(caseName(s.c))} · ${mb(s.amount)} ${L("ลบ.", "M")} · ${L("โอกาส", "chance")} ${pc(s.p)}</li>`).join("")}</ul><div class="sub" style="margin-top:6px">${L("รวม", "Total")} ${mb(sumv(risk.map(s => s.amount)))} ${L("ลบ.", "M")} · ${L("เกณฑ์โอกาสต่ำกว่า", "threshold below")} ${pc(S.pcfg.carryRisk)}</div>` : `<span class="sub">${L("ไม่มีแฟ้มที่โอกาสต่ำกว่าเกณฑ์", "No case below the threshold")}</span>`}</div></section>
  <section class="panel"><header><h2>F-03 ${L("แนวโน้มราคาต่อหมวด", "Price trend by category")}</h2><span class="sp"></span><span class="sub">${L("ดัชนีราคา", "Price index")} ${S.pcfg.priceIndexPct}% ${L("ต่อปี", "a year")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("หมวด", "Category")}</th><th class="n">n</th><th class="n">${L("ราคาสัญญาต่อประมาณการ", "Contract vs estimate")}</th><th>${L("ช่วงที่เสนอสำหรับรายการที่ยังไม่ประกาศ", "Suggested range for items not yet announced")}</th></tr></thead>
      <tbody>${pt.map(x => `<tr><td>${tx(x.cat.name)}</td><td class="n">${x.n}</td><td class="n">${x.n ? pc(x.med, 1) : "—"}</td><td class="sub">${S.pplan.filter(p => p.cat === x.cat.id && caseByPlan(p.id) && caseState(caseByPlan(p.id)) <= 4).map(p => `${p.id}: ${x.n ? `${fmt(p.est * x.lo * (1 + x.idx))} – ${fmt(p.est * x.hi * (1 + x.idx))}` : L("ไม่มีสัญญาเดิม ใช้ราคามาตรฐาน", "no past contract; use the standard price list")}`).join("<br>") || "—"}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("เป็นหลักฐานประกอบ ไม่ใช่ราคากลาง (R-04)", "Supporting evidence, not the reference price (R-04)")}</div></section>
  <section class="panel"><header><h2>F-05 ${L("ภาระงานเจ้าหน้าที่พัสดุ 12 สัปดาห์", "Procurement officer workload, 12 weeks")}</h2><span class="sp"></span><span class="sub">${wl.officers} ${L("คน ×", "officers ×")} ${S.pcfg.weekHours} ${L("ชม./สัปดาห์", "h/week")}</span></header>
    <div class="body" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;align-items:end;height:120px">${wl.weeks.map(w => `<div title="${fdate(w.w)} · ${fmt(w.h, 1)} ${L("ชม.", "h")}" style="height:${Math.min(100, w.h / Math.max(wl.cap, wl.peak) * 100)}%;background:${w.h > wl.cap ? "var(--bad)" : "var(--ch-2)"};border-radius:4px 4px 0 0;min-height:2px"></div>`).join("")}</div>
    <div class="body sub" style="padding-top:0">${L("สูงสุด", "Peak")} ${fmt(wl.peak, 1)} ${L("ชม. เทียบกำลัง", "h against capacity")} ${wl.cap} ${L("ชม.", "h")} · ${L("ชั่วโมงต่อขั้นเป็นค่าตั้ง ระดับ C", "hours per step are settings, level C")}</div></section>`;
};
const SCN_KEYS = [["atRisk", ["แฟ้มเสี่ยงไม่ทันปี", "Cases at risk"], v => v], ["carry", ["วงเงินเสี่ยงกันเงิน (ลบ.)", "Carry-over risk (M)"], v => mb(v)], ["comFY", ["ผูกพันทั้งปี (ลบ.)", "Full-year commitment (M)"], v => mb(v)], ["payFY", ["เบิกจ่ายทั้งปี (ลบ.)", "Full-year payments (M)"], v => mb(v)],
  ["switched", ["แฟ้มที่เปลี่ยนวิธี", "Cases changing method"], v => v.length], ["dropped", ["รายการที่หลุดจากแผน", "Items dropped"], v => v.length], ["over", ["แฟ้มเกินวงเงินจอง", "Cases over the reserve"], v => v.length], ["overCap", ["สัญญาค่าปรับเกินเพดาน", "Contracts over the penalty cap"], v => v.length], ["toExec", ["การแก้ไขที่ต้องถึงผู้บริหาร", "Changes needing the executive"], v => v], ["speed", ["ตัวคูณความล่าช้าจากภาระงาน", "Delay factor from workload"], v => fmt(v, 2)]];
PROC.whatif = () => {
  if (!WIP) WIP = WI_DEFAULT();
  const base = runScenario(WI_DEFAULT()), sc = runScenario(WIP), w = WIP, cell = (k, f) => { const a = f(base[k]), b = f(sc[k]); return `<td class="n">${a}</td><td class="n"><b style="${String(a) !== String(b) ? "color:var(--warn)" : ""}">${b}</b></td>`; };
  const slider = (id, lbl, min, max, step, v, unit) => `<div class="f" style="flex:1 1 200px"><label for="wi-${id}">${lbl}: <b>${v}${unit}</b></label><input type="range" id="wi-${id}" min="${min}" max="${max}" step="${step}" value="${v}" data-wi="${id}"></div>`;
  const cand = S.pplan.filter(p => { const c = caseByPlan(p.id); return c && !c.cancelled && caseState(c) <= 2; });
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("จำลองสถานการณ์ไม่แก้ข้อมูลจริง", "Scenarios never change real data")}</b><p>${L("ใช้ฟังก์ชันพยากรณ์ชุดเดียวกับหน้าพยากรณ์ เปลี่ยนเฉพาะตัวปรับ บันทึกเพื่อเทียบหลายสถานการณ์ได้", "They run the same forecast functions with different settings. Save one to compare several.")}</p></div></div>
  <section class="panel"><header><h2>${L("ตัวปรับ", "Levers")}</h2><span class="sp"></span><button class="btn ghost" type="button" id="wi-reset">${L("ค่าปัจจุบัน", "Reset to current")}</button></header>
    <div class="body inline-form">
      ${slider("cut", "W-01 " + L("ลดวงเงินแผนที่ยังไม่อนุมัติ", "Cut the not-yet-approved plan"), 0, 50, 5, w.cut, "%")}
      ${slider("smax", "W-02 " + L("เพดานวิธีเฉพาะเจาะจง", "Specific-method ceiling"), 100000, 2000000, 100000, w.smax, "")}
      <div class="f" style="flex:1 1 220px"><label for="wi-cut">${L("วันตัดลงนาม", "Signing cut-off")}</label>${cutSel("wi-cut", w.cutoff)}</div>
      <div class="f" style="flex:1 1 200px"><label for="wi-stage">W-03 ${L("ขั้นที่ช้าลง", "Slower stage")}</label><select id="wi-stage">${["approve", "prep", "sourcing", "eval", "contract", "small"].map(k => `<option value="${k}" ${k === w.stage ? "selected" : ""}>${tx(STAGE_NM[k])}</option>`).join("")}</select></div>
      ${slider("days", "W-03 " + L("ช้าลง", "Slower by"), 0, 240, 10, w.days, " " + L("วัน", "d"))}
      ${slider("price", "W-04 " + L("ราคาเพิ่ม", "Prices up"), 0, 30, 1, w.price, "%")}
      ${slider("pen", "W-05 " + L("ค่าปรับต่อวัน", "Penalty per day"), 0, 1, 0.05, w.pen, "%")}
      ${slider("ladder", "W-05 " + L("ระดับหัวหน้าพัสดุอนุมัติแก้ไขได้ถึง", "Head approves changes up to"), 1, 30, 1, w.ladder, "%")}
      ${slider("officers", "W-06 " + L("จำนวนเจ้าหน้าที่พัสดุ", "Procurement officers"), 1, 6, 1, w.officers, "")}</div>
    ${cand.length ? `<div class="body sub" style="padding-top:0">${L("ล็อกรายการสำคัญไม่ให้ถูกตัด (W-01)", "Lock key items against the cut (W-01)")}: ${cand.map(p => `<label class="field-inline"><input type="checkbox" data-wilock="${p.id}" ${WI_LOCK.has(p.id) ? "checked" : ""}> ${p.id}</label>`).join(" ")}</div>` : ""}</section>
  <section class="panel"><header><h2>${L("ผลเทียบกับปัจจุบัน", "Result against today")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ตัวชี้วัด", "Measure")}</th><th class="n">${L("ปัจจุบัน", "Today")}</th><th class="n">${L("สถานการณ์นี้", "This scenario")}</th>${S.scenarios.map(s => `<th class="n">${esc(s.name)}</th>`).join("")}</tr></thead>
      <tbody>${SCN_KEYS.map(([k, nm, f]) => `<tr><td>${tx(nm)}</td>${cell(k, f)}${S.scenarios.map(s => `<td class="n">${s.res[k]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="body" style="display:flex;flex-direction:column;gap:6px">
      ${sc.dropped.length ? `<div class="sub">W-01 ${L("หลุดจากแผน", "dropped")}: ${sc.dropped.map(p => `${p.id} (${mb(p.est)})`).join(", ")} · ${mb(sc.dropAmt)} ${L("ลบ.", "M")}</div>` : ""}
      ${sc.switched.length ? `<div class="sub">W-02 ${L("เปลี่ยนวิธี", "change method")}: ${sc.switched.join(", ")}</div>` : ""}
      ${sc.risk.length ? `<div class="sub">W-03 ${L("เสี่ยงไม่ทันปี", "at risk")}: ${sc.risk.map(s => `${s.c.id} ${pc(s.p)}`).join(", ")}</div>` : ""}
      ${sc.over.length ? `<div class="sub">W-04 ${L("เกินวงเงินจอง", "over the reserve")}: ${sc.over.map(c => c.id).join(", ")}</div>` : ""}
      ${sc.overCap.length ? `<div class="sub">W-05 ${L("ค่าปรับเกินเพดาน", "over the penalty cap")}: ${sc.overCap.map(x => x.c.id).join(", ")}</div>` : ""}
      <div class="row"><input type="text" id="wi-name" value="${esc(WI_NAME)}" placeholder="${L("ชื่อสถานการณ์", "Scenario name")}" style="min-width:200px"><button class="btn" type="button" id="wi-save">${L("บันทึกเพื่อเทียบ", "Save to compare")}</button>${S.scenarios.length ? `<button class="btn ghost" type="button" id="wi-clear">${L("ลบที่บันทึกไว้", "Clear saved")}</button>` : ""}</div></div></section>`;
};
function bindForecast() {
  const fc = $("#fc-cut"); if (fc) fc.onchange = () => { FC_CUT = fc.value; route(); };
  const t = $("#fc-tell"); if (t) t.onclick = () => { const r = carryRisk(); notify(["fin"], [`จัดซื้อ: ${r.length} แฟ้ม วงเงิน ${mb(sumv(r.map(s => s.amount)))} ลบ. เสี่ยงลงนามไม่ทันปี เตรียมกันเงิน`, `Procurement: ${r.length} cases, ${mb(sumv(r.map(s => s.amount)))} M, may not sign this year; prepare a carry-over`], "allocation"); audit(["แจ้งการเงินเรื่องวงเงินเสี่ยงกันเงิน", "Told Finance about carry-over risk"], r.map(s => s.c.id).join(" ")); commit(); renderShell(); toast(L("แจ้งการเงินแล้ว", "Finance notified")); };
}
function bindWhatif() {
  $$("[data-wi]").forEach(i => (i.onchange = () => { WIP[i.dataset.wi] = Number(i.value); route(); }));
  const st = $("#wi-stage"); if (st) st.onchange = () => { WIP.stage = st.value; route(); };
  const ct = $("#wi-cut"); if (ct) ct.onchange = () => { WIP.cutoff = ct.value; route(); };
  $$("[data-wilock]").forEach(i => (i.onchange = () => { i.checked ? WI_LOCK.add(i.dataset.wilock) : WI_LOCK.delete(i.dataset.wilock); route(); }));
  const rs = $("#wi-reset"); if (rs) rs.onclick = () => { WIP = WI_DEFAULT(); WI_LOCK.clear(); route(); };
  const sv = $("#wi-save"); if (sv) sv.onclick = () => { const name = $("#wi-name").value.trim() || `S${S.scenarios.length + 1}`, r = runScenario(WIP), res = {}; SCN_KEYS.forEach(([k, , f]) => (res[k] = f(r[k])));
    if (S.scenarios.length >= 4) S.scenarios.shift(); S.scenarios.push({ id: "WS-" + Date.now(), name, params: { ...WIP }, res, by: me().id, t: nowIso() }); WI_NAME = ""; audit(["บันทึกสถานการณ์จำลอง", "Saved a what-if scenario"], name); commit(); route(); toast(L("บันทึกแล้ว", "Saved")); };
  const cl = $("#wi-clear"); if (cl) cl.onclick = () => { S.scenarios = []; commit(); route(); };
}
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "forecast") bindForecast(); if (PROC_TAB === "whatif") bindWhatif(); };
}
// Forecast marker on the case timeline (61c-planreports.js calls this)
function fcMarker(c, x) { if (c.cancelled || caseState(c) > 8) return ""; const s = simCase(c); return `<span title="${L("คาดว่าลงนาม", "Expected signing")} ${fdate(s.med)} (P90 ${fdate(s.p90)}) · ${pc(s.p)}" style="position:absolute;top:9px;left:calc(${x(s.med)}% - 6px);width:12px;height:12px;transform:rotate(45deg);background:var(--surface);border:2px solid var(--accent)"></span><span style="position:absolute;top:14px;height:2px;left:${x(s.p10)}%;width:${Math.max(0.5, x(s.p90) - x(s.p10))}%;background:var(--accent);opacity:.5"></span>`; }

// ---------- dashboards by role (FR-PR-26) ----------
function roleCards() {
  const card = (l, v, sub, link) => `<div class="kpi" ${link ? `style="cursor:pointer" data-rcl="${link}"` : ""}><span class="l">${l}</span><span class="v">${v}</span>${sub ? `<span class="d sub">${sub}</span>` : ""}</div>`;
  let cards = [];
  if (ROLE === "proc") cards = [card(L("แฟ้มที่รอคุณ", "Cases waiting for you"), openCases().filter(c => caseNext(c).who === "proc").length, "", "prc-cases"), card(L("เอกสารรอตรวจ", "Documents to verify"), S.docs.filter(d => d.status === "extracted" || d.status === "manual").length, "", "prc-docs"), card(L("หนังสือรอส่ง", "Letters to send"), S.contracts.flatMap(c => (c.letters || []).filter(l => !l.sent)).length, "", "prc-contracts"), card(L("แฟ้มเสี่ยงไม่ทันปี", "Cases at risk this year"), carryRisk().length, "F-02", "prc-forecast")];
  else if (ROLE === "prochead") cards = [card(L("วิธีรออนุมัติ", "Methods to approve"), S.cases.filter(c => c.methodApproval && c.methodApproval.status === "pending").length, "", "prc-cases"), card(L("แม่แบบรออนุมัติ", "Templates to approve"), S.torLib.flatMap(t => t.versions.filter(v => v.status === "draft")).length, "", "prc-tor"), card(L("สัญญาณรอคัดกรอง", "Signals to triage"), detectFlags().filter(f => rfRev(f.key).status === "new").length, "", "prc-flags"), card(L("ภาระงานสูงสุด / กำลัง", "Peak load / capacity"), pc(workload().load), "F-05", "prc-forecast")];
  else if (ROLE === "exec") { const r = carryRisk(); cards = [card(L("แฟ้มเสี่ยงไม่ทันปี", "Cases at risk this year"), r.length, `${mb(sumv(r.map(s => s.amount)))} ${L("ลบ.", "M")}`, "prc-forecast"), card(L("ใบขอซื้อรออนุมัติ", "Requisitions to approve"), S.reqn.filter(x => x.status === "pending").length, "", "prc-reqn"), card(L("บอกเลิกหรือแก้ไขสัญญารอคุณ", "Terminations or changes for you"), S.contracts.filter(c => (c.term && c.term.status === "pending") || (c.vars || []).some(v => v.status === "pending" && v.who === "exec")).length, "", "prc-contracts"), card(L("ผูกพันทั้งปี (คาด)", "Full-year commitment (expected)"), mb(sumv(monthly().rows.map(x => x.comAct + x.comFc))), L("ลบ.", "M"), "prc-forecast")]; }
  else if (ROLE === "audit") cards = [card(L("สัญญาณใหม่", "New signals"), detectFlags().filter(f => rfRev(f.key).status === "new").length, "", "prc-flags"), card(L("ชี้แจงแล้วรอตัดสิน", "Explained, to decide"), detectFlags().filter(f => rfRev(f.key).status === "explained").length, "", "prc-flags"), card(L("การกันตามกฎแยกหน้าที่", "Duty-rule blocks"), S.sod.blocks.length, "", "admin-duties"), card(L("ปลดรายชื่อผู้ทิ้งงาน", "Abandoned-work releases"), S.cases.filter(c => c.blOverride).length, "", "prc-cases")];
  else if (ROLE === "fin") { const m = monthly().rows.slice(PFY_MONTHS.indexOf(TODAY.slice(0, 7))).slice(0, 3); cards = [card(L("คาดเบิกจ่าย 3 เดือน", "Expected payments, 3 months"), mb(sumv(m.map(x => x.payAct + x.payFc))), L("ลบ.", "M"), "prc-forecast"), card(L("ใบแจ้งหนี้รอตรวจ", "Invoices to verify"), S.docs.filter(d => d.type === "inv" && (d.status === "extracted" || d.status === "manual")).length, "", "prc-docs"), card(L("วงเงินเสี่ยงกันเงิน", "Carry-over risk"), mb(sumv(carryRisk().map(s => s.amount))), L("ลบ.", "M"), "prc-forecast"), card(L("ข้อยกเว้นประตูเบิกจ่าย", "Payment-gate exceptions"), S.contracts.flatMap(c => c.phases.filter(ph => ph.hold && !ph.release)).length, "", "prc-contracts")]; }
  if (!cards.length) return "";
  return `<section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">${cards.join("")}</section>`;
}
{
  const base = PROC.analytics;
  PROC.analytics = () => { const rc = roleCards(); return `${rc ? `<div class="sub" style="margin:0 0 6px">${L("สำหรับบทบาทของคุณ", "For your role")} · ${tx(ROLES[ROLE])}</div>${rc}` : ""}${base()}`; };
  const bb = BIND.procurement;
  BIND.procurement = () => { bb(); if (PROC_TAB === "analytics") $$("[data-rcl]").forEach(k => (k.onclick = () => jump(k.dataset.rcl))); };
}
function seedForecast(s) {
  Object.assign(s.pcfg, { signCutoff: PFY_END, fcRuns: 400, fcMinN: 3, fcLead: 45, carryRisk: 0.5, payLag: 15, priceIndexPct: 3, weekHours: 30,
    fcSla: { approve: 3, prep: 21, sourcing: 14, eval: 10, contract: 7, small: 10 }, stageHours: { 2: 1, 3: 3, 4: 12, 5: 3, 6: 10, 7: 1, 8: 5 } });
  s.scenarios = [];
}
