// M10 · Budget AI and signals: the settings that rounds B4 to B6 used to keep in code. Spending targets
// (per year, from the Cabinet resolution), the forecast assumptions (FC-B1, FC-B2) and the warning-signal
// thresholds (BF-01 to BF-06, and the zero-based "rolled over" band). The administrator edits; finance and the
// auditor read. Every change is in the audit log. Values carry their confidence level (B or C).
const BCFG_DEFAULT = () => ({
  targets: { q: [32, 54, 77, 100], end: { all: 94, inv: 80, ope: 98 } },
  fc: { p: { per: 100, ope: 90, inv: 62, sub: 95, oth: 85 }, res: 80, invCarry: 25 },
  sig: { sept: 25, rollBand: 5, lyRate: 70, spend: 80, out: 50, eqMin: 3 },
});
function bcfg() {
  const d = BCFG_DEFAULT(), c = (S && S.bcfg) || {};
  return { targets: Object.assign({}, d.targets, S && S.spendTargets, c.targets), fc: { p: Object.assign({}, d.fc.p, (c.fc || {}).p), res: (c.fc || {}).res != null ? c.fc.res : d.fc.res, invCarry: (c.fc || {}).invCarry != null ? c.fc.invCarry : d.fc.invCarry }, sig: Object.assign({}, d.sig, c.sig) };
}
ADMIN_TABS.push({ id: "bcfg", label: ["ตั้งค่างบประมาณ (AI และสัญญาณ)", "Budget AI and signals"], roles: ["admin", "fin", "audit"] });
ADMIN.bcfg = () => {
  const c = bcfg(), ed = ROLE === "admin", ds = ed ? "" : "disabled";
  const num = (path, v, o = {}) => `<input type="number" data-bc="${path}" value="${v}" min="${o.min != null ? o.min : 0}" max="${o.max != null ? o.max : 100}" step="${o.step || 1}" ${ds} style="width:80px" aria-label="${path}">`;
  const row = (label, input, unit, lvl, note) => `<tr><td>${label}${note ? `<div class="sub">${note}</div>` : ""}</td><td class="n">${input} ${unit}</td><td>${tag(lvl, lvl === "B" ? "p-info" : "p-mute")}</td></tr>`;
  const P = { per: L("งบบุคลากร", "Personnel"), ope: L("งบดำเนินงาน", "Operating"), inv: L("งบลงทุน", "Investment"), sub: L("งบเงินอุดหนุน", "Subsidies"), oth: L("งบรายจ่ายอื่น", "Other") };
  const sec = (title, sub, rows) => `<section class="panel"><header><h2>${title}</h2><span class="sp"></span><span class="sub">${sub}</span></header><div class="tbl-wrap"><table><thead><tr><th>${L("ค่า", "Setting")}</th><th class="n">${L("ตั้งไว้", "Value")}</th><th>${L("ระดับ", "Level")}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return `${ed ? "" : `<div class="alert"><div class="ic">i</div><div><b>${L("ดูอย่างเดียว", "View only")}</b><p>${L("ผู้ดูแลระบบเป็นผู้แก้ไข", "The administrator edits these")}</p></div></div>`}
    <div class="grid2">
      ${sec(L("เป้าหมายการเบิกจ่ายของปี (BR-21)", "Spending targets for the year (BR-21)"), L("ตามมติ ครม. ของปีนั้น", "From that year's Cabinet resolution"),
        [0, 1, 2, 3].map(i => row(`${L("สะสมสิ้นไตรมาส", "Cumulative end of Q")}${i + 1}`, num(`targets.q.${i}`, c.targets.q[i]), "%", "B")).join("") +
        row(L("ภาพรวมสิ้นปี", "Total, year end"), num("targets.end.all", c.targets.end.all), "%", "B") + row(L("รายจ่ายลงทุนสิ้นปี", "Investment, year end"), num("targets.end.inv", c.targets.end.inv), "%", "B") + row(L("รายจ่ายประจำสิ้นปี", "Recurrent, year end"), num("targets.end.ope", c.targets.end.ope), "%", "B"))}
      ${sec(L("สมมติฐานพยากรณ์ (FC-B1, FC-B2)", "Forecast assumptions (FC-B1, FC-B2)"), L("ใช้ที่ M09 พยากรณ์ปีนี้ และ Agent AG-05", "Used by M09 forecast and agent AG-05"),
        Object.keys(P).map(k => row(`${L("โอกาสเบิกจ่ายส่วนที่ยังว่าง", "Chance the free amount is spent")} · ${P[k]}`, num(`fc.p.${k}`, c.fc.p[k]), "%", "C")).join("") +
        row(L("ส่วนของยอดจองที่จะเบิกจ่ายในปี", "Share of reservations spent in the year"), num("fc.res", c.fc.res), "%", "C") +
        row(L("ส่วนของงบลงทุนที่ยังว่างที่จะกันเหลื่อมปี", "Share of free investment carried over"), num("fc.invCarry", c.fc.invCarry), "%", "C"))}
    </div>
    ${sec(L("เกณฑ์สัญญาณเตือน (BF-01 ถึง BF-06)", "Warning-signal thresholds (BF-01 to BF-06)"), L("ใช้ที่ M09 ตัวชี้วัดและสัญญาณ และ M03 มุมมองฐานศูนย์", "Used by M09 KPIs and signals, and the M03 zero-based view"),
      row(`BF-01 · ${L("แผนใช้เดือนกันยายนเกิน", "September share of the plan above")}`, num("sig.sept", c.sig.sept), "%", "C", L("งบดำเนินงาน", "Operating lines")) +
      row(`BF-04 · ${L("ยกยอด = เปลี่ยนจากปีก่อนไม่เกิน", "Rolled over = within")}`, num("sig.rollBand", c.sig.rollBand, { max: 50 }), "%", "C", L("ใช้ทั้ง BF-04 และมุมมองฐานศูนย์", "Also used by the zero-based view")) +
      row(`BF-04 · ${L("ปีก่อนกองเบิกจ่ายต่ำกว่า", "Unit spent under, last year")}`, num("sig.lyRate", c.sig.lyRate), "%", "C") +
      row(`BF-05 · ${L("ใช้เงินเกิน", "Spent more than")}`, num("sig.spend", c.sig.spend), "%", "C") +
      row(`BF-05 · ${L("แต่ผลผลิตต่ำกว่า", "but output below")}`, num("sig.out", c.sig.out), "%", "C") +
      row(`BF-06 · ${L("จำนวนคำขอขั้นต่ำที่ตัดเท่ากัน", "Minimum requests cut equally")}`, num("sig.eqMin", c.sig.eqMin, { min: 2, max: 20 }), L("คำขอ", "requests"), "C"))}
    ${ed ? `<div class="row"><button class="btn ghost" type="button" id="bc-reset">${L("คืนค่าตั้งต้น", "Restore defaults")}</button><span class="sub">${L("ระดับ B มาจากข่าวหรือแหล่งรอง ต้องยืนยันกับมติ ครม. · ระดับ C เป็นข้อเสนอการออกแบบ", "Level B comes from news or secondary sources and needs the Cabinet resolution · level C is a design proposal")}</span></div>` : ""}`;
};
BIND_ADMIN.bcfg = () => {
  $$("[data-bc]").forEach(inp => (inp.onchange = () => {
    const cfg = JSON.parse(JSON.stringify(bcfg())), path = inp.dataset.bc.split("."), v = Number(inp.value);
    let o = cfg; path.slice(0, -1).forEach(k => (o = o[k]));
    const old = o[path[path.length - 1]]; o[path[path.length - 1]] = v; S.bcfg = cfg;
    audit(["ปรับค่าตั้งงบประมาณ (AI และสัญญาณ)", "Changed a budget AI and signals setting"], `${inp.dataset.bc}: ${old} → ${v}`); commit(); route();
  }));
  const r = $("#bc-reset"); if (r) r.onclick = () => { S.bcfg = {}; delete S.spendTargets; audit(["คืนค่าตั้งต้นงบประมาณ (AI และสัญญาณ)", "Restored budget AI and signals defaults"], ""); commit(); route(); };
};
