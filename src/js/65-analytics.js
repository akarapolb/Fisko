// Fisko Procurement round 15 (P3 of the detailed design): analytics with KPI definitions in one place
// (the "semantic layer"), the red-flag library RF-01..10 with the triage workflow, and an OCDS export of
// published data only. Signals say "should be checked", never "wrong": a single signal proves nothing.
const med = a => { const s = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pctile = (a, p) => { const s = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] : null; };
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const pc = (x, d = 0) => (x == null ? "—" : `${fmt(x * 100, d)}%`);
const dnum = (x, d = 1) => (x == null ? "—" : fmt(x, d));
const evOf = (c, type) => S.caseEvents.filter(e => e.case === c.id && e.type === type).sort((a, b) => (a.t < b.t ? -1 : 1))[0];
const evDate = (c, type) => { const e = evOf(c, type); return e ? e.t.slice(0, 10) : null; };
const compCases = () => S.cases.filter(c => !c.cancelled && c.method && c.method !== "specific");
const contractCase = con => caseByPlan(con.plan);
const awardedCases = () => S.cases.filter(c => !c.cancelled && c.award);
const vname = c => tx(c.award ? c.award.winner : ["-", "-"]);
const share = (items, key, val) => { const m = {}; items.forEach(x => (m[key(x)] = (m[key(x)] || 0) + val(x))); const tot = sumv(Object.values(m)); const v = Object.values(m).sort((a, b) => b - a); return { tot, top3: tot ? sumv(v.slice(0, 3)) / tot : null, hhi: tot ? sumv(v.map(x => (x / tot * 100) ** 2)) : null, n: v.length }; };

// ---------- semantic layer: every KPI is defined once ----------
const KPIS = [
  ["KPI-01", ["อัตราดำเนินการตามแผน", "Plan execution rate"], () => { const due = S.pplan.filter(p => p.month <= TODAY), done = S.cases.filter(c => !c.cancelled && c.state >= 8); return { v: `${done.length}/${S.pplan.length}`, n: S.pplan.length, note: [`ถึงกำหนดในแผนแล้ว ${due.length} รายการ`, `${due.length} plan items are due`] }; }],
  ["KPI-02", ["ความล่าช้าเทียบแผน (วัน)", "Delay against plan (days)"], () => { const d = S.cases.filter(c => c.reqn).map(c => dayDiff(famPlan(c.plan).month, famReq(c.reqn).t.slice(0, 10))); return { v: `${dnum(med(d), 0)} / P90 ${dnum(pctile(d, 0.9), 0)}`, n: d.length, note: ["ค่าลบ = ขอซื้อก่อนเดือนกำหนด", "Negative means raised before the planned date"] }; }],
  ["KPI-03", ["เวลาแต่ละขั้น", "Time in each step"], () => ({ v: L("ดูตารางด้านล่าง", "see the table below"), n: S.caseEvents.length, note: ["วันตามปฏิทิน ยังไม่ตัดวันรอ e-GP", "Calendar days; waiting on e-GP is not removed yet"] })],
  ["KPI-04", ["เวลาจากอนุมัติถึงลงนามสัญญา (วัน)", "Approval to contract (days)"], () => { const f = m => S.cases.filter(c => c.contract && (m === "small" ? c.method === "specific" : c.method !== "specific")).map(c => dayDiff(evDate(c, "approved"), evDate(c, "contract"))); return { v: `${L("เล็ก", "small")} ${dnum(med(f("small")), 0)} · ${L("แข่งขัน", "competitive")} ${dnum(med(f("comp")), 0)}`, n: f("small").length + f("comp").length, note: ["ค่ากลาง แยกตามเส้นทาง", "Median by path"] }; }],
  ["KPI-05", ["สัดส่วนการแข่งขัน", "Competition share"], () => { const cs = S.cases.filter(c => !c.cancelled && c.method && caseReq(c)), v = c => caseReq(c).amount, tot = sumv(cs.map(v)); return { v: tot ? `${L("มูลค่า", "value")} ${pc(sumv(cs.filter(c => c.method !== "specific").map(v)) / tot)} · ${L("จำนวน", "count")} ${pc(cs.filter(c => c.method !== "specific").length / cs.length)}` : "—", n: cs.length, note: ["วิธีแข่งขันเทียบเฉพาะเจาะจง ดูแนวโน้ม", "Competitive versus specific; read as a trend"] }; }],
  ["KPI-06", ["อัตราผู้ยื่นรายเดียว", "Single-bidder rate"], () => { const c = compCases().filter(x => x.egp && x.egp.bidders != null); return { v: c.length ? pc(c.filter(x => x.egp.bidders === 1).length / c.length) : "—", n: c.length, note: ["ตัวแทนความเสี่ยง ไม่ใช่ข้อพิสูจน์", "A risk proxy, not proof"] }; }],
  ["KPI-07", ["ผู้ยื่นเฉลี่ยต่อแฟ้ม", "Average bidders per case"], () => { const c = compCases().filter(x => x.egp && x.egp.bidders != null); return { v: dnum(avg(c.map(x => x.egp.bidders))), n: c.length, note: ["เฉพาะแฟ้มแข่งขัน", "Competitive cases only"] }; }],
  ["KPI-08", ["ราคาผู้ชนะเทียบราคากลาง", "Winning price against reference"], () => { const c = awardedCases().filter(x => x.ref); const r = c.map(x => x.award.price / x.ref.amount); return { v: pc(avg(r), 1), n: c.length, note: ["ต่ำกว่า 100% คือส่วนประหยัด ต้องมีหลักฐานราคากลาง", "Below 100% is saving; the reference needs evidence"] }; }],
  ["KPI-09", ["การเติบโตของสัญญา", "Contract growth"], () => { const g = S.contracts.map(c => c.amount / (c.base || c.amount) - 1); return { v: `${pc(avg(g), 1)} · max ${pc(g.length ? Math.max(...g) : null, 1)}`, n: g.length, note: ["วงเงินล่าสุดเทียบตอนลงนาม", "Latest amount against signing"] }; }],
  ["KPI-10", ["การส่งมอบตรงเวลา", "On-time delivery"], () => { const p = S.contracts.flatMap(c => c.phases.filter(ph => ph.delivered || phDue(ph) < TODAY).map(ph => ({ c, ph }))); const late = p.map(x => phLate(x.ph)); return { v: p.length ? `${pc(late.filter(x => x === 0).length / p.length)} · ${dnum(avg(late.filter(x => x > 0)), 1)} ${L("วันเฉลี่ยที่ล่าช้า", "avg days late")}` : "—", n: p.length, note: ["หักวันที่ได้รับการขยายโดยเหตุที่ไม่ใช่ความผิดผู้ขาย", "Net of extensions granted for reasons that are not the supplier's fault"] }; }],
  ["KPI-11", ["สัดส่วนค่าปรับ", "Penalty share"], () => { const tot = sumv(S.contracts.map(c => c.amount)); const pen = sumv(S.contracts.map(conPenalty)); return { v: tot ? pc(pen / tot, 3) : "—", n: S.contracts.length, note: [`ค่าปรับสะสม ${fmt(pen)} บาท`, `Accrued ${fmt(pen)} baht`] }; }],
  ["KPI-12", ["เวลาตรวจรับ (วัน)", "Acceptance time (days)"], () => { const d = S.contracts.flatMap(c => c.phases.filter(ph => ph.delivered && phaseAccepted(ph)).map(ph => dayDiff(ph.delivered, ph.signs[ph.signs.length - 1].t.slice(0, 10)))); return { v: dnum(med(d), 0), n: d.length, note: ["แจ้งส่งมอบถึงตรวจรับเสร็จ", "From the delivery notice to the last signature"] }; }],
  ["KPI-13", ["การกระจุกตัวของผู้ขาย", "Supplier concentration"], () => { const s = share(S.contracts, c => tx(c.vendor), c => c.amount); return { v: `Top 3 ${pc(s.top3)} · HHI ${dnum(s.hhi, 0)}`, n: s.n, note: [`${s.n} ราย (ตัวอย่างน้อย อ่านด้วยความระวัง)`, `${s.n} suppliers (small sample, read with care)`] }; }],
  ["KPI-14", ["ความครบถ้วนของแฟ้มและข้อมูล e-GP", "Case completeness and e-GP freshness"], () => { const c = S.cases.filter(x => !x.cancelled && x.state >= 4), ok = c.filter(x => x.method && x.ref && (x.method === "specific" ? x.quotes.length || x.state >= 7 : x.tor && x.egp && x.egp.no)); const last = (S.egpImports[0] || {}).t; return { v: `${c.length ? pc(ok.length / c.length) : "—"} · e-GP ${last ? fdate(last) : L("ยังไม่เคยนำเข้า", "never imported")}`, n: c.length, note: ["ใช้ดูคุณภาพข้อมูลก่อนเชื่อ KPI อื่น", "Check data quality before trusting the other KPIs"] }; }],
];
function stepTimes() {
  const pairs = [["requested", "approved", ["ขอซื้อ → อนุมัติ", "Request → approval"]], ["approved", "sourcing", ["อนุมัติ → ประกาศใน e-GP", "Approval → e-GP announcement"]], ["sourcing", "bidders", ["ประกาศ → ปิดรับและนับผู้ยื่น", "Announcement → bidders counted"]],
    ["bidders", "award", ["นับผู้ยื่น → ประกาศผู้ชนะ", "Bidders → winner announced"]], ["award", "contract", ["ประกาศผู้ชนะ → ลงนามสัญญา", "Winner → contract signed"]]];
  return pairs.map(([a, b, name]) => { const d = S.cases.map(c => (evDate(c, a) && evDate(c, b) ? dayDiff(evDate(c, a), evDate(c, b)) : null)).filter(x => x != null); return { name, n: d.length, med: med(d), p90: pctile(d, 0.9) }; });
}

// ---------- red-flag library ----------
const RF_DEF = {
  "RF-01": [["แบ่งซื้อแบ่งจ้างให้ต่ำกว่าเกณฑ์", "Split to stay under the threshold"], 40], "RF-02": [["ผู้ขายรายเดียวได้งานเฉพาะเจาะจงซ้ำใกล้เกณฑ์", "One supplier repeatedly wins near-threshold small purchases"], 40],
  "RF-03": [["ผู้ยื่นรายเดียวในงานแข่งขัน", "Single bidder in a competitive case"], 25], "RF-04": [["ผู้ชนะซ้ำในหมวดเดียวกัน", "Repeat winner in a category"], 25],
  "RF-05": [["ราคาชนะใกล้หรือสูงกว่าราคากลาง", "Winning price at or above the reference"], 25], "RF-06": [["สัญญาโตหลังลงนาม", "Contract grew after signing"], 40],
  "RF-07": [["ลำดับเวลาผิดปกติ", "Odd order of dates"], 40], "RF-08": [["ระยะประกาศสั้นผิดปกติ", "Unusually short announcement period"], 25],
  "RF-09": [["กรรมการชุดเดิมกับผู้ชนะรายเดิม", "Same committee and same winner"], 25], "RF-10": [["กระจุกตัวปลายปี", "Year-end clustering"], 10],
};
function detectFlags() {
  const out = [], T = S.pcfg.specificMax, add = (rf, ref, kind, ev, unit) => out.push({ key: rf + "|" + ref, rf, ref, kind, ev, unit: unit || null, w: RF_DEF[rf][1] });
  const cfg = S.pcfg, unitOfCase = c => famLine(c.line).unit;
  // RF-01: explained splits, and clusters among requisitions
  S.reqn.filter(r => r.splitWhy).forEach(r => add("RF-01", r.id, "reqn", [`${r.id}: ${r.splitWhy}`, `${r.id}: ${r.splitWhy}`], famLine(famPlan(r.plan).line).unit));
  const act = S.reqn.filter(r => !["rejected", "cancelled"].includes(r.status) && r.amount <= T), grp = {};
  act.forEach(r => { const p = famPlan(r.plan), k = p.kind + "|" + famLine(p.line).unit; (grp[k] = grp[k] || []).push(r); });
  Object.values(grp).forEach(g => { if (g.length >= 2 && sumv(g.map(r => r.amount)) > T && !g.some(r => r.splitWhy)) add("RF-01", g.map(r => r.id).join("+"), "reqn", [`${g.map(r => r.id).join(", ")}: ${fmt(sumv(g.map(r => r.amount)))} บาท รวมเกิน ${fmt(T)} ภายในหน่วยเดียวกัน`, `${g.map(r => r.id).join(", ")}: ${fmt(sumv(g.map(r => r.amount)))} baht together, above ${fmt(T)}, in one unit`], famLine(famPlan(g[0].plan).line).unit); });
  // RF-02: one supplier, several specific-method awards near the ceiling
  const near = S.cases.filter(c => c.award && c.method === "specific" && c.award.price >= cfg.rfNearPct / 100 * T), byV = {};
  near.forEach(c => (byV[vname(c)] = byV[vname(c)] || []).push(c));
  Object.entries(byV).forEach(([v, cs]) => { if (cs.length >= 2) add("RF-02", cs.map(c => c.id).join("+"), "case", [`${v}: ${cs.length} งานเฉพาะเจาะจงมูลค่า ≥ ${cfg.rfNearPct}% ของเพดาน`, `${v}: ${cs.length} specific-method awards at ≥ ${cfg.rfNearPct}% of the ceiling`], unitOfCase(cs[0])); });
  S.cases.filter(c => !c.cancelled).forEach(c => {
    const u = unitOfCase(c);
    if (c.method && c.method !== "specific" && c.egp && c.egp.bidders === 1) add("RF-03", c.id, "case", [`${c.id}: ผู้ยื่น 1 ราย`, `${c.id}: one bidder`], u);
    if (c.award && c.ref && c.award.price / c.ref.amount >= cfg.rfRatioPct / 100) add("RF-05", c.id, "case", [`${c.id}: ราคาชนะ ${pc(c.award.price / c.ref.amount, 1)} ของราคากลาง`, `${c.id}: winning price is ${pc(c.award.price / c.ref.amount, 1)} of the reference`], u);
    if (c.egp && c.method !== "specific" && c.egp.announce && c.egp.close && dayDiff(c.egp.announce, c.egp.close) < cfg.rfMinAnnounce) add("RF-08", c.id, "case", [`${c.id}: ประกาศถึงปิดรับ ${dayDiff(c.egp.announce, c.egp.close)} วัน (ขั้นต่ำที่ตั้ง ${cfg.rfMinAnnounce})`, `${c.id}: ${dayDiff(c.egp.announce, c.egp.close)} days from announcement to close (setting ${cfg.rfMinAnnounce})`], u);
  });
  // RF-04: the same supplier wins repeatedly in a category
  const wins = {}; awardedCases().forEach(c => { const k = c.kind + "|" + vname(c); (wins[k] = wins[k] || []).push(c); });
  Object.entries(wins).forEach(([k, cs]) => { if (cs.length >= Math.max(2, cfg.rfRepeatWins)) add("RF-04", cs.map(c => c.id).join("+"), "case", [`${k.split("|")[1]}: ชนะ ${cs.length} ครั้งในหมวด ${tx(KINDS[cs[0].kind])}`, `${k.split("|")[1]}: ${cs.length} wins in ${tx(KINDS[cs[0].kind])}`], unitOfCase(cs[0])); });
  // RF-06 contract growth, RF-07 order of dates
  S.contracts.forEach(c => {
    const g = c.amount / (c.base || c.amount) - 1, n = (c.vars || []).filter(v => v.status === "approved").length, u = famLine(c.line).unit;
    if (g * 100 > cfg.rfGrowthPct || n >= 3) add("RF-06", c.id, "contract", [`${c.id}: ${pc(g, 1)} จากตอนลงนาม · แก้ไข ${n} ครั้ง`, `${c.id}: ${pc(g, 1)} above signing · ${n} changes`], u);
    c.phases.forEach(ph => {
      const pays = S.payreqs.filter(p => p.contract === c.id && p.phase === ph.n), first = ph.signs[0] && ph.signs[0].t.slice(0, 10);
      if (ph.delivered && first && first < ph.delivered) add("RF-07", `${c.id}#${ph.n}`, "contract", [`${c.id} งวด ${ph.n}: ลงนามตรวจรับ ${first} ก่อนวันส่งมอบ ${ph.delivered}`, `${c.id} phase ${ph.n}: acceptance signed ${first}, before delivery ${ph.delivered}`], u);
      if (pays.some(p => p.t.slice(0, 10) < (first || "9999")) && !phaseAccepted(ph)) add("RF-07", `${c.id}#${ph.n}`, "contract", [`${c.id} งวด ${ph.n}: ขอเบิกจ่ายก่อนตรวจรับครบ`, `${c.id} phase ${ph.n}: payment requested before full acceptance`], u);
    });
  });
  // RF-09 same committee, same winner
  const grpC = {}; awardedCases().filter(c => c.committees.eval).forEach(c => { const k = [c.committees.eval.chair, ...c.committees.eval.members].sort().join(",") + "|" + vname(c); (grpC[k] = grpC[k] || []).push(c); });
  Object.values(grpC).forEach(cs => { if (cs.length >= 2) add("RF-09", cs.map(c => c.id).join("+"), "case", [`${cs.map(c => c.id).join(", ")}: คณะกรรมการชุดเดียวกัน ผู้ชนะรายเดียวกัน (${vname(cs[0])})`, `${cs.map(c => c.id).join(", ")}: same committee and same winner (${vname(cs[0])})`], unitOfCase(cs[0])); });
  // RF-10 year-end clustering
  const fyEnd = m => m === "08" || m === "09", signed = S.contracts.filter(c => c.signed);
  if (signed.length >= 4 && signed.filter(c => fyEnd(c.signed.slice(5, 7))).length / signed.length >= 0.5) add("RF-10", "FY", "contract", [`${signed.filter(c => fyEnd(c.signed.slice(5, 7))).length}/${signed.length} สัญญาลงนามใน 2 เดือนสุดท้ายของปี`, `${signed.filter(c => fyEnd(c.signed.slice(5, 7))).length}/${signed.length} contracts signed in the last two months of the year`], null);
  // score per case or contract = sum of weights, capped at 100
  const score = {}; out.forEach(f => { const k = f.ref.split(/[+#]/)[0]; score[k] = Math.min(100, (score[k] || 0) + f.w); });
  out.forEach(f => (f.score = score[f.ref.split(/[+#]/)[0]]));
  return out.sort((a, b) => b.score - a.score);
}
const RF_ST = { new: [["รอคัดกรอง", "New"], "p-warn"], asked: [["รอคำชี้แจง", "Waiting for an explanation"], "p-info"], explained: [["ชี้แจงแล้ว", "Explained"], "p-info"], closed: [["ปิด (รับคำชี้แจง)", "Closed (explained)"], "p-ok"], fixed: [["ปิด (แก้ข้อมูล)", "Closed (data fixed)"], "p-ok"], escalated: [["ส่งตรวจต่อ", "Escalated"], "p-bad"], fp: [["ผลบวกลวง", "False positive"], "p-mute"] };
const rfRev = k => S.rfRev[k] || { status: "new" };
const rfSeeAll = () => ROLE === "audit" || ROLE === "prochead";
const rfVisible = f => rfSeeAll() || (ROLE === "proc" && rfRev(f.key).status === "asked") || (ROLE === "div" && f.unit === me().unit && rfRev(f.key).status === "asked");

// ---------- OCDS (published data only) ----------
const OCDS_METHOD = { specific: "limited", ebid: "open", selective: "selective", emarket: "open" };
function ocdsRelease(c) {
  const p = famPlan(c.plan), rq = caseReq(c), con = caseCon(c), a = c.award, rel = { ocid: `ocds-fisko-${c.id}`, id: `${c.id}-${(con && con.ver) || 1}`, date: (S.caseEvents.find(e => e.case === c.id) || {}).t || nowIso(), tag: [], initiationType: "tender" };
  rel.planning = { budget: { id: c.line, description: tx(famLine(c.line).name), amount: { amount: p.est, currency: "THB" } } };
  if (c.egp && c.egp.announce) { rel.tag.push("tender"); rel.tender = { id: c.egp.no, title: tx(p.name), status: a ? "complete" : "active", procurementMethod: OCDS_METHOD[c.method] || "limited", mainProcurementCategory: c.kind === "goods" ? "goods" : c.kind === "construction" ? "works" : "services", value: c.ref ? { amount: c.ref.amount, currency: "THB" } : undefined, tenderPeriod: { startDate: c.egp.announce, endDate: c.egp.close }, numberOfTenderers: c.egp.bidders != null ? c.egp.bidders : undefined }; }
  else if (a) { rel.tag.push("tender"); rel.tender = { id: c.id, title: tx(p.name), status: "complete", procurementMethod: "limited", value: { amount: rq.amount, currency: "THB" } }; }
  if (a) { rel.tag.push("award"); rel.awards = [{ id: `${c.id}-A1`, status: "active", date: a.date, value: { amount: a.price, currency: "THB" }, suppliers: [{ name: tx(a.winner) }] }]; }
  if (con) {
    rel.tag.push("contract"); rel.contracts = [{ id: con.id, awardID: `${c.id}-A1`, title: tx(p.name), status: c.close ? "terminated" : "active", value: { amount: con.amount, currency: "THB" }, dateSigned: con.signed, period: { startDate: con.signed, endDate: con.phases[con.phases.length - 1].due },
      amendments: (con.vars || []).filter(v => v.status === "approved").map(v => ({ id: v.id, date: v.decided.t.slice(0, 10), rationale: v.kind === "time" ? `time extension ${v.days} days` : `amount change ${v.delta}` })) }];
    const tr = S.payreqs.filter(x => x.contract === con.id && x.status === "approved").map(x => ({ id: x.id, source: "Fisko Finance", date: (x.decided || {}).t ? x.decided.t.slice(0, 10) : x.t.slice(0, 10), value: { amount: x.amount, currency: "THB" } }));
    rel.tag.push("implementation"); rel.contracts[0].implementation = { transactions: tr };
  }
  return rel;
}
const ocdsCases = () => S.cases.filter(c => !c.cancelled && (c.award || (c.egp && c.egp.announce)));
const ocdsPackage = () => ({ uri: "(to be set by the agency)", version: "1.1", publishedDate: TODAY + "T00:00:00Z", publisher: { name: tx(S.org || ["หน่วยงานตัวอย่าง", "Sample agency"]) }, license: "(to be set)", releases: ocdsCases().map(ocdsRelease) });

// ---------- views ----------
PROC.analytics = () => {
  const funnel = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, k: S.cases.filter(c => caseState(c) === i + 1).length })), mx = Math.max(1, ...funnel.map(f => f.k)), steps = stepTimes();
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("ตัวชี้วัดนิยามไว้ที่เดียว", "Each KPI is defined once")}</b><p>${L("ทุกแดชบอร์ดและผู้ช่วย AI ใช้ตัวเลขชุดเดียวกัน ไม่คำนวณใหม่เอง แสดงขนาดตัวอย่าง (n) เสมอ ข้อมูลตัวอย่างนี้เล็ก จึงอ่านเป็นตัวอย่างวิธีคิด ไม่ใช่ข้อสรุป เป้าหมายตัวเลขหน่วยงานกำหนดเอง", "Every dashboard and the AI assistant use these same numbers and don't recompute them. The sample size (n) is always shown. This sample is small, so read it as an illustration of the method, not as a finding. Targets are set by the agency.")}</p></div></div>
  <section class="panel"><header><h2>${L("กรวยสถานะของแฟ้ม", "Case funnel by step")}</h2><span class="sp"></span><span class="sub">${S.cases.length} ${L("แฟ้ม", "cases")} · ${S.cases.filter(c => c.cancelled).length} ${L("ยกเลิก", "cancelled")}</span></header>
    <div class="body" style="display:flex;flex-direction:column;gap:6px">${funnel.map(f => `<div style="display:grid;grid-template-columns:150px 1fr 28px;gap:8px;align-items:center;font-size:13px"><span>${f.n}. ${tx([CASE_STATES[f.n].th, CASE_STATES[f.n].en])}</span><span style="background:var(--surface-2);border-radius:6px;height:14px;display:block"><span style="display:block;height:100%;width:${f.k / mx * 100}%;background:var(--ch-1);border-radius:6px"></span></span><b>${f.k}</b></div>`).join("")}</div></section>
  <section class="panel"><header><h2>${L("ตัวชี้วัด KPI-01 ถึง KPI-14", "KPI-01 to KPI-14")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "ID")}</th><th>${L("ตัวชี้วัด", "KPI")}</th><th>${L("ค่า", "Value")}</th><th class="n">n</th><th>${L("หมายเหตุ", "Note")}</th></tr></thead>
      <tbody>${KPIS.map(([id, name, f]) => { const r = f(); return `<tr><td class="mono">${id}</td><td>${tx(name)}</td><td><b style="font-weight:600">${esc(r.v)}</b></td><td class="n">${r.n}</td><td class="sub">${esc(tx(r.note))}</td></tr>`; }).join("")}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("เวลาแต่ละขั้น (KPI-03)", "Time in each step (KPI-03)")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ช่วง", "Stretch")}</th><th class="n">n</th><th class="n">${L("ค่ากลาง (วัน)", "Median (days)")}</th><th class="n">P90</th></tr></thead>
      <tbody>${steps.map(s => `<tr><td>${tx(s.name)}</td><td class="n">${s.n}</td><td class="n">${dnum(s.med, 0)}</td><td class="n">${dnum(s.p90, 0)}</td></tr>`).join("")}</tbody></table></div></section>`;
};
PROC.flags = () => {
  if (!(rfSeeAll() || ROLE === "proc" || ROLE === "div")) return `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("สัญญาณเตือนเห็นได้เฉพาะผู้ตรวจสอบและหัวหน้าพัสดุ", "Red flags are visible to Audit and the head of procurement")}</b><p>${L("หน่วยงานเจ้าของรายการเห็นเฉพาะรายการที่ถูกขอคำชี้แจง ไม่เผยแพร่ภายนอก", "The owning unit sees only the items it was asked to explain. Nothing is published outside.")}</p></div></div>`;
  const all = detectFlags(), list = all.filter(rfVisible), decided = Object.values(S.rfRev).filter(x => ["closed", "fixed", "escalated", "fp"].includes(x.status)), fp = decided.filter(x => x.status === "fp").length;
  return `
  <div class="alert"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${L("“ควรตรวจ” ไม่ใช่ “ผิด”", "“Should be checked”, not “wrong”")}</b><p>${L("สัญญาณเดี่ยวไม่พิสูจน์ความผิด ระบบรวมสัญญาณเป็นคะแนนต่อแฟ้มพร้อมหลักฐาน และไม่ระงับหรือลงโทษรายการใด ผู้ตรวจสอบเป็นผู้ตัดสิน ผลบวกลวงถูกนับเพื่อปรับเกณฑ์", "A single signal proves nothing. Signals are combined into a score per case with the evidence. The system never blocks or penalises anything. Audit decides, and false positives are counted to tune the thresholds.")}</p></div></div>
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("สัญญาณทั้งหมด", "Signals")}</span><span class="v">${all.length}</span></div>
    <div class="kpi"><span class="l">${L("รอคัดกรอง", "To triage")}</span><span class="v">${all.filter(f => rfRev(f.key).status === "new").length}</span></div>
    <div class="kpi"><span class="l">${L("ตัดสินแล้ว", "Decided")}</span><span class="v">${decided.length}</span></div>
    <div class="kpi"><span class="l">${L("ผลบวกลวง", "False positives")}</span><span class="v">${decided.length ? pc(fp / decided.length) : "—"}<small>${decided.length ? ` (${fp}/${decided.length})` : ""}</small></span></div>
  </section>
  <section class="panel"><header><h2>${L("คิวสัญญาณเตือน", "Red-flag queue")}</h2><span class="sp"></span><span class="sub">${L("เรียงตามคะแนน", "Sorted by score")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คะแนน", "Score")}</th><th>${L("สัญญาณ", "Signal")}</th><th>${L("หลักฐาน", "Evidence")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${list.map(f => { const r = rfRev(f.key), id = f.key.replace(/[^A-Za-z0-9]/g, "_"), open = ["new", "asked", "explained"].includes(r.status);
        return `<tr><td><b>${f.score}</b></td><td><span class="mono">${f.rf}</span> ${tx(RF_DEF[f.rf][0])}</td><td class="sub">${esc(tx(f.ev))}${r.ask ? `<div>${L("ขอให้ชี้แจง", "Asked")}: ${esc(r.ask)}</div>` : ""}${r.explain ? `<div>${L("คำชี้แจง", "Explanation")}: ${esc(r.explain)}</div>` : ""}${r.note ? `<div>${L("ผลตัดสิน", "Decision")}: ${esc(r.note)}</div>` : ""}</td><td>${stTag(RF_ST, r.status)}</td>
          <td>${rfSeeAll() && r.status === "new" ? `<div class="row" style="flex-wrap:nowrap"><input type="text" id="rfa-${id}" placeholder="${L("ข้อที่ต้องชี้แจง", "What to explain")}" style="min-width:150px"><button class="btn" type="button" data-rfask="${f.key}" data-rfid="${id}">${L("ขอคำชี้แจง", "Ask")}</button></div>` : ""}
            ${(ROLE === "proc" || ROLE === "div") && r.status === "asked" ? `<div class="row" style="flex-wrap:nowrap"><input type="text" id="rfx-${id}" placeholder="${L("คำชี้แจง", "Explanation")}" style="min-width:150px"><button class="btn primary" type="button" data-rfexp="${f.key}" data-rfid="${id}">${L("ส่งคำชี้แจง", "Send")}</button></div>` : ""}
            ${ROLE === "audit" && open ? `<div class="row" style="flex-wrap:nowrap;margin-top:4px"><input type="text" id="rfd-${id}" placeholder="${L("บันทึกผลตัดสิน", "Decision note")}" style="min-width:150px">${[["closed", L("รับคำชี้แจง", "Accept")], ["fixed", L("แก้ข้อมูล", "Fixed")], ["escalated", L("ส่งตรวจต่อ", "Escalate")], ["fp", L("ผลบวกลวง", "False +")]].map(([k, l]) => `<button class="btn ${k === "escalated" ? "danger" : ""}" type="button" data-rfdec="${f.key}|${k}" data-rfid="${id}">${l}</button>`).join("")}</div>` : ""}</td></tr>`; }).join("")
        || `<tr><td colspan="5" class="sub">${L("ไม่มีสัญญาณที่คุณเห็นได้", "No signals visible to you")}</td></tr>`}</tbody></table></div>
    <div class="body sub">${L("RF-01 ถึง RF-10 ตามบท 9.3 ของเอกสารออกแบบ เกณฑ์ตั้งได้ใน M10 · RF-04 ใช้จำนวนชนะซ้ำตามค่าตั้ง · การให้คะแนนรวมน้ำหนักสูง 40 กลาง 25 ต่ำ 10 สูงสุด 100", "RF-01 to RF-10 follow chapter 9.3 of the design document. Thresholds are set in M10. Score adds weights of 40 (high), 25 (medium) and 10 (low), capped at 100.")}</div></section>`;
};
PROC.ocds = () => {
  const cs = ocdsCases(), skip = S.cases.filter(c => !c.cancelled && !cs.includes(c));
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("ส่งออกเฉพาะข้อมูลที่ประกาศแล้ว", "Only published data is exported")}</b><p>${L("ไม่รวมข้อเสนอของผู้ยื่นที่ไม่ชนะ รายชื่อกรรมการ และเหตุผลภายใน รหัสแฟ้มใช้เป็น OCID ชั่วคราว คำนำหน้าที่จดทะเบียนและรูปแบบที่กรมบัญชีกลางใช้จริงต้องตรวจก่อนส่งออกจริง (ผลลัพธ์นี้เป็นตัวอย่างโครงสร้าง OCDS 1.1)", "Losing bids, committee names and internal reasons are left out. The case ID stands in as the OCID; the registered prefix and the format the Comptroller General's Department actually uses must be checked before a real export. This is a structure sample of OCDS 1.1.")}</p></div></div>
  <section class="panel"><header><h2>${L("แฟ้มที่ส่งออกได้", "Cases that can be exported")}</h2><span class="sp"></span><button class="btn primary" type="button" id="ocds-gen">${L("สร้าง JSON", "Build JSON")}</button></header>
    <div class="tbl-wrap"><table><thead><tr><th>OCID</th><th>${L("รายการ", "Item")}</th><th>${L("ขั้นที่ส่งออก", "Stages")}</th></tr></thead>
      <tbody>${cs.map(c => `<tr><td class="mono">ocds-fisko-${c.id}</td><td>${esc(caseName(c))}</td><td class="sub">${ocdsRelease(c).tag.join(" · ")}</td></tr>`).join("") || `<tr><td colspan="3" class="sub">—</td></tr>`}</tbody></table></div>
    ${skip.length ? `<div class="body sub">${L("ยังไม่ส่งออก (ยังไม่ประกาศ)", "Not exported yet (not announced)")}: ${skip.map(c => c.id).join(", ")}</div>` : ""}</section>
  ${OCDS_JSON ? `<section class="panel"><header><h2>${L("ผลลัพธ์", "Output")}</h2><span class="sp"></span><button class="btn" type="button" id="ocds-copy">${L("คัดลอก", "Copy")}</button><button class="btn" type="button" id="ocds-dl">${L("ดาวน์โหลดไฟล์", "Download")}</button></header>
    <div class="body"><pre id="ocds-pre" style="margin:0;max-height:420px;overflow:auto;font-family:var(--mono);font-size:12px;white-space:pre">${esc(OCDS_JSON)}</pre><div class="sub" style="margin-top:6px">${L("ปุ่มดาวน์โหลดทำงานในไฟล์ที่เปิดตรง ๆ ส่วนในหน้าที่เผยแพร่ให้ใช้ปุ่มคัดลอก", "Download works in the standalone file; on the published page use Copy.")}</div></div></section>` : ""}`;
};
let OCDS_JSON = "";

// ---------- actions ----------
function bindAnalytics() {
  const done = msg => { commit(); renderShell(); route(); if (msg) toast(msg); };
  const val = id => ($("#" + id).value || "").trim();
  $$("[data-rfask]").forEach(b => (b.onclick = () => { const k = b.dataset.rfask, t = val("rfa-" + b.dataset.rfid); if (t.length < 5) { toast(L("ระบุข้อที่ต้องชี้แจง", "Say what needs explaining")); return; }
    S.rfRev[k] = Object.assign(rfRev(k), { status: "asked", ask: t, askBy: me().id, t: nowIso() }); audit(["ขอคำชี้แจงสัญญาณเตือน", "Asked for a red-flag explanation"], k.replace("|", " "));
    notify(["proc"], [`ขอคำชี้แจงสัญญาณ ${k.split("|")[0]} ของ ${k.split("|")[1]}`, `Explanation requested for ${k.split("|")[0]} on ${k.split("|")[1]}`], "prc-flags"); done(L("ส่งขอคำชี้แจงแล้ว", "Request sent")); }));
  $$("[data-rfexp]").forEach(b => (b.onclick = () => { const k = b.dataset.rfexp, t = val("rfx-" + b.dataset.rfid); if (t.length < 5) { toast(L("เขียนคำชี้แจงอย่างน้อย 5 ตัวอักษร", "Write at least 5 characters")); return; }
    S.rfRev[k] = Object.assign(rfRev(k), { status: "explained", explain: t, explainBy: me().id }); audit(["ชี้แจงสัญญาณเตือน", "Explained a red flag"], k.replace("|", " "));
    notify(["audit"], [`มีคำชี้แจงสัญญาณ ${k.split("|")[0]} ของ ${k.split("|")[1]}`, `An explanation arrived for ${k.split("|")[0]} on ${k.split("|")[1]}`], "prc-flags"); done(L("ส่งคำชี้แจงแล้ว", "Explanation sent")); }));
  $$("[data-rfdec]").forEach(b => (b.onclick = () => { const dv = b.dataset.rfdec, k = dv.slice(0, dv.lastIndexOf("|")), st = dv.slice(dv.lastIndexOf("|") + 1), t = val("rfd-" + b.dataset.rfid); if (t.length < 5) { toast(L("บันทึกผลตัดสินอย่างน้อย 5 ตัวอักษร", "Write a decision note of at least 5 characters")); return; }
    S.rfRev[k] = Object.assign(rfRev(k), { status: st, note: t, decided: { by: me().id, t: nowIso() } }); audit(["ตัดสินสัญญาณเตือน", "Decided a red flag"], `${k.replace("|", " ")} ${st}`); done(L("บันทึกผลตัดสินแล้ว", "Decision recorded")); }));
  const g = $("#ocds-gen"); if (g) g.onclick = () => { OCDS_JSON = JSON.stringify(ocdsPackage(), null, 2); audit(["สร้างไฟล์ OCDS", "Built an OCDS export"], `${ocdsCases().length} releases`); commit(); route(); };
  const cp = $("#ocds-copy"); if (cp) cp.onclick = () => { const fb = () => { const r = document.createRange(); r.selectNodeContents($("#ocds-pre")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast(L("เลือกข้อความแล้ว กด Ctrl+C", "Selected; press Ctrl+C")); };
    try { navigator.clipboard.writeText(OCDS_JSON).then(() => toast(L("คัดลอกแล้ว", "Copied")), fb); } catch (e) { fb(); } };
  const dl = $("#ocds-dl"); if (dl) dl.onclick = () => { try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([OCDS_JSON], { type: "application/json" })); a.download = `fisko-ocds-${TODAY}.json`; a.click(); } catch (e) { toast(L("ดาวน์โหลดไม่ได้ในหน้านี้ ใช้ปุ่มคัดลอก", "Can't download on this page; use Copy")); } };
}
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (["analytics", "flags", "ocds"].includes(PROC_TAB)) bindAnalytics(); };
}
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.rfRev) return;
    const fl = detectFlags();
    if (ROLE === "audit") fl.filter(f => ["new", "explained"].includes(rfRev(f.key).status)).forEach(f => R(`${rfRev(f.key).status === "new" ? L("คัดกรองสัญญาณ", "Triage signal") : L("ตัดสินสัญญาณที่ชี้แจงแล้ว", "Decide an explained signal")} ${f.rf}`, f.ref, TODAY, "prc-flags", f.score >= 40 ? "p-bad" : "p-warn"));
    if (ROLE === "proc" || ROLE === "div") fl.filter(rfVisible).forEach(f => R(`${L("ชี้แจงสัญญาณเตือน", "Explain a red flag")} ${f.rf}`, f.ref, TODAY, "prc-flags", "p-warn"));
  };
}
function seedAnalytics(s) { Object.assign(s.pcfg, { rfMinAnnounce: 7, rfRatioPct: 98, rfGrowthPct: 10, rfRepeatWins: 2, rfNearPct: 80 }); s.rfRev = {}; }
