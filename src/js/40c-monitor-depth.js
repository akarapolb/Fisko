// M07 deeper features (round 10): year-end disbursement forecast against the cabinet's quarterly
// targets, and e-GP procurement milestones for investment projects. Both use the M07 snapshot.
let CAB = { all: [32, 54, 77, 100], inv: [25, 45, 65, 75] }; // sample cumulative % targets by quarter end
let SNAP_M = 7; // the month of the year the figures run to (round C4 sets it from the demo date)
// Remaining plan is assumed to be delivered at the same pace as so far (actual ÷ plan), capped at 105%.
function fcast(x, m) {
  const r = Math.min(1.05, x.plan ? x.actual / x.plan : 1), planAt = Math.min(x.alloc, x.plan * PLAN_F[m - 1] / PLAN_F[SNAP_M - 1]);
  return Math.min(x.alloc, Math.max(x.actual, x.actual + (planAt - x.plan) * r));
}
const fRisk = (v, t) => (v >= t ? tag(L("ถึงเป้า", "On target"), "p-ok") : v >= t - 5 ? tag(L("ต่ำกว่าเป้าเล็กน้อย", "Slightly below"), "p-warn") : tag(L("เสี่ยงไม่ถึงเป้า", "At risk"), "p-bad"));

MON_PANELS.forecast = () => {
  const U = S.dash.units, T = dashTotals(), tot = m => U.reduce((s, x) => s + fcast(x, m), 0);
  const q = [3, 6, 9, 12].map((m, i) => ({ m, t: CAB.all[i], past: m <= SNAP_M, f: (m <= SNAP_M ? T.actual * ACT_F[m - 1] / ACT_F[SNAP_M - 1] : tot(m)) / T.alloc * 100 }));
  const ye = tot(12) / T.alloc * 100, inv = S.dash.projects.filter(p => p.type === "inv");
  const invA = inv.reduce((s, p) => s + p.alloc, 0), invYe = invA ? inv.reduce((s, p) => s + fcast(p, 12), 0) / invA * 100 : 0;
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("เบิกจ่ายแล้ว ณ", "Spent as of")} ${fdate(S.dash.asOf)}</span><span class="v">${fmt(T.rate, 1)}%</span></div>
    <div class="kpi"><span class="l">${L("คาดการณ์สิ้นไตรมาส 3 · เป้า", "Forecast end of Q3 · target")} ${CAB.all[2]}%</span><span class="v" style="color:var(--${q[2].f >= CAB.all[2] ? "accent" : "bad"})">${fmt(q[2].f, 1)}%</span></div>
    <div class="kpi hl"><span class="l">${L("คาดการณ์สิ้นปี · เป้า", "Forecast year end · target")} ${CAB.all[3]}%</span><span class="v">${fmt(ye, 1)}%</span><span class="d" style="color:var(--rail-ink)">${L("ไม่ทันเบิก", "Unspent")} ${fmt(T.alloc - tot(12), 0)} ${L("ลบ.", "M")}</span></div>
    <div class="kpi"><span class="l">${L("งบลงทุน คาดการณ์สิ้นปี · เป้า", "Investment year end · target")} ${CAB.inv[3]}%</span><span class="v" style="color:var(--${invYe >= CAB.inv[3] ? "accent" : "bad"})">${fmt(invYe, 1)}%</span></div>
  </section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("เป้าหมายเบิกจ่ายสะสมตามมติ ครม. กับคาดการณ์", "Cabinet cumulative targets vs forecast")}</h2><span class="sp"></span>${tag(L("เป้าหมายตัวอย่าง", "Sample targets"), "p-warn")}</header>
      <div class="body"><div class="hbars">${q.map((x, i) => `<div class="hb"><span>${L("สิ้นไตรมาส", "End of Q")}${i + 1} · ${L("เป้า", "target")} ${x.t}%</span>
        <div style="display:flex;flex-direction:column;gap:3px"><div class="track"><i class="c5" style="width:${x.t}%"></i></div><div class="track"><i class="${x.f >= x.t ? "c2" : "c4"}" style="width:${Math.min(100, x.f)}%"></i></div></div>
        <span class="num" style="text-align:right">${fmt(x.f, 1)}%<div class="sub">${x.past ? L("ผลจริง", "actual") : L("คาดการณ์", "forecast")}</div></span></div>`).join("")}</div>
        <div class="row sub" style="margin-top:10px"><span><i class="c5 lg"></i>${L("เป้าหมาย", "Target")}</span><span><i class="c2 lg"></i>${L("ผลจริง / คาดการณ์ ถึงเป้า", "Actual / forecast on target")}</span><span><i class="c4 lg"></i>${L("ต่ำกว่าเป้า", "Below target")}</span></div></div></section>
    <section class="panel"><header><h2>${L("วิธีคาดการณ์", "How the forecast works")}</h2></header>
      <div class="body sub" style="display:flex;flex-direction:column;gap:8px">
        <p style="margin:0">${L("แผนที่เหลือจะเบิกจ่ายได้ในอัตราเดียวกับที่ผ่านมา (ผลเทียบแผน) ไม่เกินร้อยละ 105 และไม่เกินวงเงินที่ได้รับ", "The rest of the plan is spent at the pace so far (actual vs plan), capped at 105% and at the allocation")}</p>
        <p style="margin:0">${L("ใช้ประกอบการเร่งรัดเบิกจ่าย และพิจารณาโอนเปลี่ยนแปลงจากหน่วยที่คาดว่าจะใช้ไม่หมด (M06)", "Use it to chase spending and to move money from units unlikely to spend it all (M06)")}</p></div></section>
  </div>
  <section class="panel"><header><h2>${L("คาดการณ์รายหน่วยงาน", "Forecast by unit")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท", "M baht")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("ได้รับ", "Allocated")}</th><th class="n">${L("เบิกแล้ว", "Spent")}</th><th class="n">${L("คาด Q3", "Q3 forecast")}</th><th>${L("เทียบเป้า", "vs target")} ${CAB.all[2]}%</th><th class="n">${L("คาดสิ้นปี", "Year end")}</th><th class="n">${L("คาดว่าไม่ทันเบิก", "Likely unspent")}</th><th>${L("สิ้นปี", "Year end")}</th></tr></thead>
      <tbody>${U.slice().sort((a, b) => fcast(a, 12) / a.alloc - fcast(b, 12) / b.alloc).map(x => { const f3 = fcast(x, 9) / x.alloc * 100, fy = fcast(x, 12) / x.alloc * 100;
        return `<tr><td>${unitName(x.unit)}</td><td class="n">${fmt(x.alloc)}</td><td class="n">${fmt(x.actual)} <span class="sub">${fmt(x.actual / x.alloc * 100, 0)}%</span></td>
          <td class="n">${fmt(f3, 1)}%</td><td>${fRisk(f3, CAB.all[2])}</td><td class="n">${fmt(fy, 1)}%</td><td class="n">${fmt(x.alloc - fcast(x, 12), 1)}</td><td>${fRisk(fy, CAB.all[3] - 5)}</td></tr>`; }).join("")}</tbody></table></div></section>`;
};

// ---- procurement milestones ----
const STG = [["ประกาศแผนจัดซื้อ", "Plan published"], ["ประกาศเชิญชวน", "Invitation"], ["ประกาศผู้ชนะ", "Award"], ["ลงนามสัญญา", "Contract signed"], ["ตรวจรับงาน", "Delivery accepted"]];
const diffD = (a, b) => Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 864e5);
function procState(ms) {
  const asOf = S.dash.asOf, next = ms.findIndex(m => !m.actual);
  const late = next >= 0 && ms[next].plan < asOf ? diffD(asOf, ms[next].plan) : 0;
  const slip = Math.max(0, ...ms.filter(m => m.actual).map(m => diffD(m.actual, m.plan)));
  return { next, late, slip, lv: late > 30 ? "bad" : late > 0 || slip > 14 ? "warn" : "ok" };
}
MON_PANELS.procure = () => {
  const P = S.dash.projects.filter(p => S.proc && S.proc[p.id]), eg = S.integrations.find(i => i.id === "IF-04"), ed = ROLE === "fin" || ROLE === "div";
  const st = P.map(p => ({ p, ms: S.proc[p.id], s: procState(S.proc[p.id]) }));
  return `
  ${eg && eg.status !== "ok" ? `<div class="alert"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${L("การเชื่อมต่อ e-GP (IF-04) ขัดข้อง", "The e-GP link (IF-04) is down")}</b>
    <p>${L("ข้อมูลด้านล่างบันทึกโดยเจ้าหน้าที่ จะซิงก์อัตโนมัติเมื่อเชื่อมต่อได้ (ดู M10 · การเชื่อมต่อระบบ)", "Dates below were keyed in by staff and will sync once the link is back (see M10 · Integrations)")}</p></div></div>` : ""}
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("โครงการลงทุนที่ติดตาม", "Investment projects tracked")}</span><span class="v">${P.length}</span></div>
    <div class="kpi"><span class="l">${L("ลงนามสัญญาแล้ว", "Contracts signed")}</span><span class="v">${st.filter(x => x.ms[3].actual).length}<small>/ ${P.length}</small></span></div>
    <div class="kpi"><span class="l">${L("ล่าช้ากว่าแผน", "Behind schedule")}</span><span class="v" style="color:var(--${st.some(x => x.s.lv !== "ok") ? "bad" : "accent"})">${st.filter(x => x.s.lv !== "ok").length}</span></div>
  </section>
  <section class="panel"><header><h2>${L("ขั้นตอนจัดซื้อจัดจ้างโครงการลงทุน", "Investment procurement milestones")}</h2><span class="sp"></span><span class="sub">${L("ณ", "As of")} ${fdate(S.dash.asOf)} · ${L("วันที่แผน / วันที่จริง", "planned / actual")}</span></header>
    <div class="tbl-wrap"><table class="proc"><thead><tr><th>${L("โครงการ", "Project")}</th>${STG.map(s => `<th>${tx(s)}</th>`).join("")}<th>${L("สถานะ", "Status")}</th></tr></thead>
      <tbody>${st.map(({ p, ms, s }) => `<tr><td style="min-width:170px"><b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub">${unitName(p.unit)} · ${fmt(p.alloc, 1)} ${L("ลบ.", "M")}</div></td>
        ${ms.map((m, i) => { const sl = m.actual ? diffD(m.actual, m.plan) : 0, due = !m.actual && m.plan < S.dash.asOf;
          return `<td class="ms ${m.actual ? "done" : due ? "late" : ""}"><span class="sub">${fdate(m.plan)}</span>${m.actual ? `<div>${fdate(m.actual)}${sl > 0 ? ` <span style="color:var(--${sl > 14 ? "bad" : "warn"})">+${sl}</span>` : " ✓"}</div>`
            : i === s.next && ed ? `${due ? `<div style="color:var(--bad)">${L("ล่าช้า", "late")} ${diffD(S.dash.asOf, m.plan)} ${L("วัน", "d")}</div>` : ""}<div class="row" style="flex-wrap:nowrap;gap:4px"><input type="date" id="pd-${p.id}" value="${S.dash.asOf}" aria-label="${L("วันที่เสร็จ", "Done on")}" style="width:128px"><button class="btn" type="button" data-pdone="${p.id}">✓</button></div>`
            : due ? `<div style="color:var(--bad)">${L("ล่าช้า", "late")} ${diffD(S.dash.asOf, m.plan)} ${L("วัน", "d")}</div>` : ""}</td>`; }).join("")}
        <td>${tag(s.lv === "ok" ? L("ตามแผน", "On track") : s.lv === "warn" ? L("ล่าช้าเล็กน้อย", "Slipping") : L("ล่าช้ามาก", "Late"), s.lv === "ok" ? "p-ok" : s.lv === "warn" ? "p-warn" : "p-bad")}</td></tr>`).join("")
        || `<tr><td colspan="7" class="sub">${L("ไม่มีโครงการลงทุนในข้อมูลตัวอย่าง", "No investment projects in the sample")}</td></tr>`}</tbody></table></div>
    <div class="body sub">${L("+ ตัวเลข = จำนวนวันที่ช้ากว่าแผน · โครงการที่ยังไม่ลงนามสัญญาเสี่ยงต่อการกันเงินไม่ทันสิ้นปี (M06)", "+n = days later than planned · projects without a contract risk missing the year-end carry-over (M06)")}</div></section>`;
};
MON_BIND.procure = () => $$("[data-pdone]").forEach(b => (b.onclick = () => {
  const id = b.dataset.pdone, ms = S.proc[id], s = procState(ms), d = $("#pd-" + id).value;
  if (!d) return;
  ms[s.next].actual = d;
  const p = S.dash.projects.find(x => x.id === id);
  audit(["บันทึกขั้นตอนจัดซื้อจัดจ้าง", "Recorded a procurement milestone"], `${tx(p.name)} · ${tx(STG[s.next])} ${d}`);
  commit(); route(); toast(`${tx(STG[s.next])} · ${L("บันทึกแล้ว", "recorded")}`);
}));
