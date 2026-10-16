// M07 Execution Monitoring: KPIs, plan vs actual curve, alerts and unit table, all derived from S.dash.
const PLAN_F = [0.05, 0.11, 0.18, 0.26, 0.35, 0.46, 0.6, 0.7, 0.79, 0.87, 0.94, 1];
const ACT_F = [0.035, 0.085, 0.14, 0.2, 0.29, 0.39, 0.52];
const FY_MONTHS = { th: ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."], en: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"] };

function dashTotals() {
  const u = S.dash.units;
  const alloc = u.reduce((s, x) => s + x.alloc, 0), plan = u.reduce((s, x) => s + x.plan, 0), actual = u.reduce((s, x) => s + x.actual, 0);
  return { alloc, plan, actual, rate: actual / alloc * 100, prog: actual / plan * 100, left: alloc - actual };
}
function unitState(x) {
  const p = x.actual / x.plan * 100;
  return p < 70 ? [L("เสี่ยงสูง", "High risk"), "p-bad", p] : p < 90 ? [L("ต้องติดตาม", "Watch"), "p-warn", p] : [L("ตามแผน", "On track"), "p-ok", p];
}

function chartSVG(T) {
  const W = 720, H = 260, Lp = 54, R = 16, Tp = 16, B = 30, iw = W - Lp - R, ih = H - Tp - B;
  const max = Math.ceil(T.alloc / 250) * 250;
  const planS = PLAN_F.map(f => f * T.alloc), actS = ACT_F.map(f => f / ACT_F[6] * T.actual);
  const x = i => Lp + (iw / 11) * i, y = v => Tp + ih - (v / max) * ih;
  const line = a => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  let g = "";
  const step = max / 4;
  for (let v = 0; v <= max; v += step) g += `<line x1="${Lp}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${Lp - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  FY_MONTHS[LANG].forEach((m, i) => (g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${m}</text>`));
  const li = 6;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L("แผนและผลการเบิกจ่ายสะสม ล้านบาท", "Cumulative plan and disbursement, million baht")}">${g}
    <path d="${line(actS)}L${x(li)},${y(0)}L${x(0)},${y(0)}Z" fill="var(--accent)" fill-opacity=".12"/>
    <path d="${line(planS)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="${line(actS)}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    <circle cx="${x(li)}" cy="${y(actS[li])}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
    <circle cx="${x(li)}" cy="${y(planS[li])}" r="4" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/>
    <text x="${x(li) + 10}" y="${y(actS[li]) + 16}" style="fill:var(--accent);font-weight:600;font-size:12px">${L("ผล", "Actual")} ${fmt(actS[li])}</text>
    <text x="${x(li) - 10}" y="${y(planS[li]) - 9}" text-anchor="end" style="fill:var(--ink-2);font-weight:600;font-size:12px">${L("แผน", "Plan")} ${fmt(planS[li])}</text></svg>`;
}

VIEWS.dashboard = () => {
  const T = dashTotals(), M = L("ล้านบาท", "M baht");
  const alerts = S.dash.units.filter(x => x.reason).map(x => ({ x, s: unitState(x) })).sort((a, b) => a.s[2] - b.s[2]);
  return `
  <div class="head"><div><div class="eyebrow">M07 · Budget Execution &amp; Monitoring</div><h1>${L("ภาพรวมการใช้จ่ายงบประมาณ", "Budget execution overview")}</h1>
    <p>${fyLabel(S.dash.fy)} · ${L("ภาพตัวอย่างข้อมูลสะสม ณ", "Sample snapshot as of")} ${fdate(S.dash.asOf)} (${L("เดือนที่ 7 จาก 12", "month 7 of 12")})</p></div></div>
  ${monTabsBar()}
  ${MON_TAB !== "overview" ? MON_PANELS[MON_TAB]() : `
  <section class="kpis">
    <div class="kpi"><span class="l">${L("งบประมาณที่ได้รับ", "Budget received")}</span><span class="v">${fmt(T.alloc)}<small>${M}</small></span></div>
    <div class="kpi"><span class="l">${L("แผนการใช้จ่ายสะสม", "Cumulative plan")}</span><span class="v">${fmt(T.plan)}<small>${M}</small></span><span class="d sub">${fmt(T.plan / T.alloc * 100, 0)}% ${L("ของวงเงิน", "of budget")}</span></div>
    <div class="kpi"><span class="l">${L("ผลการเบิกจ่ายสะสม", "Cumulative disbursed")}</span><span class="v">${fmt(T.actual)}<small>${M}</small></span><span class="d" style="color:var(--bad)">${L("ต่ำกว่าแผน", "Below plan by")} ${fmt(T.plan - T.actual)} ${M}</span></div>
    <div class="kpi hl"><span class="l">${L("อัตราการเบิกจ่าย", "Disbursement rate")}</span><span class="v">${fmt(T.rate, 1)}%</span><span class="d" style="color:var(--rail-ink)">${L("ของงบประมาณที่ได้รับ", "of budget received")}</span></div>
    <div class="kpi"><span class="l">${L("ความก้าวหน้าตามแผน", "Progress vs plan")}</span><span class="v">${fmt(T.prog, 1)}%</span><span class="d sub">${L("ผลเบิกจ่าย ÷ แผนสะสม", "Disbursed ÷ planned")}</span></div>
    <div class="kpi"><span class="l">${L("งบประมาณคงเหลือ", "Remaining budget")}</span><span class="v">${fmt(T.left)}<small>${M}</small></span><span class="d sub">${L("5 เดือนที่เหลือ", "5 months left")}</span></div>
  </section>
  <div class="grid2">
    <section class="panel chart"><header><h2>${L("แผนและผลการเบิกจ่ายสะสม", "Cumulative plan vs disbursement")}</h2><span class="sp"></span>
      <div class="legend"><span><i style="background:var(--accent)"></i>${L("ผลการเบิกจ่าย", "Disbursed")}</span><span><i style="background:var(--muted)"></i>${L("แผนการใช้จ่าย", "Plan")}</span></div></header>
      <div class="body">${chartSVG(T)}<div class="sub">${L("หน่วย: ล้านบาท", "Unit: million baht")}</div></div></section>
    <section class="panel"><header><h2>${L("สิ่งที่ต้องติดตาม", "Needs attention")}</h2><span class="sp"></span><span class="pill p-info">${L("จาก AI Monitoring Agent", "From the AI Monitoring Agent")}</span></header>
      <div class="body">${alerts.map(({ x, s }) => `<div class="alert"><div class="ic" style="background:var(--${s[1] === "p-ok" ? "accent" : s[1] === "p-bad" ? "bad" : "warn"}-soft);color:var(--${s[1] === "p-ok" ? "accent" : s[1] === "p-bad" ? "bad" : "warn"})">${s[1] === "p-ok" ? "✓" : "!"}</div>
        <div><b>${unitName(x.unit)} · ${s[2] >= 100 ? L("สูงกว่าแผน", "ahead of plan") : L("ต่ำกว่าแผน", "behind plan by") + " " + fmt(100 - s[2], 0) + "%"}</b><p>${tx(x.reason)}</p></div></div>`).join("")}
        <div class="row" style="margin-top:14px"><button class="btn" type="button" onclick="go('assistant')">${L("ถามผู้ช่วย AI เพิ่มเติม", "Ask the AI assistant")}</button></div></div></section>
  </div>
  <section class="panel"><header><h2>${L("สถานะรายหน่วยงาน", "Status by unit")}</h2><span class="sp"></span><span class="sub">${L("เส้นดำ = แผนสะสม · หน่วย ล้านบาท", "Black mark = cumulative plan · million baht")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("ได้รับจัดสรร", "Allocated")}</th><th class="n">${L("แผนสะสม", "Plan")}</th><th class="n">${L("ผลเบิกจ่าย", "Disbursed")}</th><th>${L("ความก้าวหน้า", "Progress")}</th><th class="n">${L("% ตามแผน", "% of plan")}</th><th>${L("สถานะ", "Status")}</th></tr></thead>
      <tbody>${S.dash.units.map(x => { const s = unitState(x); return `<tr><td>${unitName(x.unit)}</td><td class="n">${fmt(x.alloc)}</td><td class="n">${fmt(x.plan)}</td><td class="n">${fmt(x.actual)}</td>
        <td><div class="bar"><i style="width:${Math.min(100, x.actual / x.alloc * 100)}%"></i><b style="left:${x.plan / x.alloc * 100}%"></b></div></td><td class="n">${fmt(s[2], 1)}%</td><td>${tag(s[0], s[1])}</td></tr>`; }).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(T.alloc)}</td><td class="n">${fmt(T.plan)}</td><td class="n">${fmt(T.actual)}</td><td></td><td class="n">${fmt(T.prog, 1)}%</td><td></td></tr></tfoot></table></div></section>`}`;
};
BIND.dashboard = () => {
  $$("[data-mtab]").forEach(b => (b.onclick = () => { MON_TAB = b.dataset.mtab; route(); }));
  (MON_BIND[MON_TAB] || (() => {}))();
};
