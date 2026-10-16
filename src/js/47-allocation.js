// M06 Budget Allocation (round 4): the appropriation, allocation lines by unit and project,
// monthly spending plans, and budget transfers approved at the right level of authority.
let ALLOC_TAB = "appropriation", ALLOC_FY = 2570, PLAN_UNIT = "";
const OPEN_UNIT = new Set();
const ALLOC_TABS = [
  { id: "appropriation", label: ["วงเงินที่ได้รับ", "Appropriation"] },
  { id: "allocate", label: ["จัดสรรรายหน่วยงาน", "Allocation by unit"] },
  { id: "plan", label: ["แผนการใช้จ่ายรายเดือน", "Monthly spending plan"] },
  { id: "transfers", label: ["โอนเปลี่ยนแปลง", "Budget transfers"] },
];
const canAlloc = () => ROLE === "fin";
const AL = () => S.allocs[ALLOC_FY];
const sumv = a => a.reduce((x, y) => x + y, 0);
const allocated = t => sumv(AL().lines.filter(l => !t || l.type === t).map(l => l.amount));
const lineOf = id => AL().lines.find(l => l.id === id);
const lineLabel = l => `${unitName(l.unit)} · ${tx(l.name)}`;
const pendingOut = id => sumv(AL().transfers.filter(t => t.status === "pending" && t.from === id).map(t => t.amount));
function scalePlan(l, newAmt) {
  const old = sumv(l.plan) || 1;
  l.plan = l.plan.map(v => Math.round(v * newAmt / old));
  l.plan[11] += newAmt - sumv(l.plan);
}
const transferLevel = t => { const a = lineOf(t.from), b = lineOf(t.to);
  return a.type !== b.type ? ["cross", L("ผู้บริหาร · ต่างงบรายจ่าย แจ้งสำนักงบประมาณ", "Executive · across budget types, notify the Budget Bureau")]
    : a.unit !== b.unit ? ["unit", L("ผู้บริหาร · ข้ามหน่วยงาน", "Executive · across units")] : ["same", L("ผู้อำนวยการกองคลัง · ภายในหน่วยงาน", "Finance director · within the unit")]; };

const ALLOC = {};
ALLOC.appropriation = () => {
  const A = AL(), closed = S.submission.status === "closed";
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi hl"><span class="l">${L("วงเงินตามพระราชบัญญัติ", "Appropriated")}</span><span class="v">${mb(A.total)}<small>${L("ลบ.", "M")}</small></span><span class="d" style="color:var(--rail-ink)">${A.draft ? L("ร่าง · รอพระราชบัญญัติ", "Draft · awaiting the act") : fdate(A.date)}</span></div>
    <div class="kpi"><span class="l">${L("จัดสรรแล้ว", "Allocated")}</span><span class="v">${mb(allocated())}<small>${L("ลบ.", "M")}</small></span><span class="d sub">${fmt(allocated() / A.total * 100, 1)}%</span></div>
    <div class="kpi"><span class="l">${L("คงเหลือยังไม่จัดสรร", "Not yet allocated")}</span><span class="v">${mb(A.total - allocated())}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("รายการจัดสรร", "Allocation lines")}</span><span class="v">${A.lines.length}</span><span class="d sub">${new Set(A.lines.map(l => l.unit)).size} ${L("หน่วยงาน", "units")}</span></div>
  </section>
  <section class="panel"><header><h2>${esc(tx(A.act))}</h2><span class="sp"></span>${A.draft ? tag(L("ร่าง", "Draft"), "p-warn") : tag(L("บันทึกแล้ว", "Recorded"), "p-ok")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("งบรายจ่าย", "Budget type")}</th><th class="n">${L("ได้รับ (ลบ.)", "Appropriated (M)")}</th><th class="n">${L("จัดสรรแล้ว", "Allocated")}</th><th class="n">${L("คงเหลือ", "Remaining")}</th><th>${L("สัดส่วนที่จัดสรร", "Share allocated")}</th></tr></thead>
      <tbody>${BUDGET_TYPES.map(t => { const ap = A.byType[t.id] || 0, al = allocated(t.id); return ap || al ? `<tr><td>${tx(t.name)}</td><td class="n">${mb(ap)}</td><td class="n">${mb(al)}</td><td class="n" style="color:var(--${ap - al < 0 ? "bad" : "ink"})">${mb(ap - al)}</td>
        <td><div class="bar"><i style="width:${ap ? Math.min(100, al / ap * 100) : 0}%"></i></div></td></tr>` : ""; }).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${mb(A.total)}</td><td class="n">${mb(allocated())}</td><td class="n">${mb(A.total - allocated())}</td><td></td></tr></tfoot></table></div></section>
  ${ALLOC_FY === 2570 ? `<section class="panel"><header><h2>${L("ปีงบประมาณ 2571", "FY2571")}</h2></header><div class="body row">
    ${S.allocs[2571] ? `<span>${L("สร้างร่างการจัดสรรปี 2571 แล้ว", "The FY2571 draft allocation exists")}</span><button class="btn" type="button" data-fy="2571">${L("เปิดปี 2571", "Open FY2571")}</button>`
      : closed ? `<span>${L("ผลพิจารณาจากสำนักงบประมาณพร้อมแล้ว", "The Budget Bureau's results are ready")}</span>${canAlloc() || ROLE === "plan" ? `<button class="btn primary" type="button" id="mk-2571">${L("สร้างร่างการจัดสรรปี 2571 จากผลพิจารณา", "Create the FY2571 draft from the results")}</button>` : ""}`
      : `<span class="sub">${L("ปี 2571 จะเปิดเมื่อกองแผนงานส่งต่อผลพิจารณาจาก M05", "FY2571 opens once Planning hands over the results from M05")}</span>`}</div></section>` : ""}`;
};

ALLOC.allocate = () => {
  const A = AL(), ed = canAlloc(), units = [...new Set(A.lines.map(l => l.unit))];
  return `
  <section class="panel"><header><h2>${L("การจัดสรรรายหน่วยงานและโครงการ", "Allocation by unit and project")}</h2><span class="sp"></span><span class="sub">${L("คลิกหน่วยงานเพื่อดูรายการ · ล้านบาท", "Click a unit to see its lines · million baht")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน / รายการ", "Unit / line")}</th><th>${L("งบรายจ่าย", "Type")}</th><th>${L("กิจกรรม", "Activity")}</th><th class="n" style="width:150px">${L("วงเงิน", "Amount")}</th><th class="n">${L("รอโอนออก", "Pending out")}</th></tr></thead>
      <tbody>${units.map(u => { const ls = A.lines.filter(l => l.unit === u), open = OPEN_UNIT.has(u);
        return `<tr class="prog-row ${open ? "open" : ""}" data-unit="${u}" tabindex="0" aria-expanded="${open}"><td><b>${unitName(u)}</b> <span class="sub">${ls.length} ${L("รายการ", "lines")}</span></td><td></td><td></td><td class="n"><b>${mb(sumv(ls.map(l => l.amount)))}</b></td><td></td></tr>
        ${open ? ls.map(l => `<tr class="sub-row"><td>${esc(tx(l.name))} <span class="mono sub">${l.id}</span></td><td>${typeName(l.type)}</td><td class="mono sub">${(lineage(l.act).pop() || { code: "—" }).code}</td>
          <td class="n">${ed ? `<input type="number" min="0" step="0.1" data-lamt="${l.id}" value="${(l.amount / 1e6).toFixed(2)}" aria-label="${L("วงเงิน", "Amount")} ${esc(tx(l.name))}">` : mb(l.amount)}</td><td class="n">${pendingOut(l.id) ? mb(pendingOut(l.id)) : "—"}</td></tr>`).join("") : ""}`; }).join("")}</tbody>
      <tfoot><tr><td>${L("จัดสรรแล้ว / วงเงินที่ได้รับ", "Allocated / appropriated")}</td><td></td><td></td><td class="n">${mb(allocated())} / ${mb(A.total)}</td><td></td></tr></tfoot></table></div>
    ${ed ? `<div class="body"><form class="inline-form" id="al-form">
      <div class="f"><label for="al-unit">${L("หน่วยงาน", "Unit")}</label><select id="al-unit">${S.units.filter(u => u.parent).map(u => `<option value="${u.id}">${esc(tx(u.name))}</option>`).join("")}</select></div>
      <div class="f"><label for="al-name">${L("รายการ", "Line")}</label><input type="text" id="al-name" required></div>
      <div class="f" style="flex:0 1 150px"><label for="al-type">${L("งบรายจ่าย", "Type")}</label><select id="al-type">${BUDGET_TYPES.map(t => `<option value="${t.id}" ${t.id === "ope" ? "selected" : ""}>${tx(t.name)}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 120px"><label for="al-amt">${L("วงเงิน (ลบ.)", "Amount (M)")}</label><input type="number" min="0.1" step="0.1" id="al-amt" required></div>
      <button class="btn primary" type="submit">+ ${L("จัดสรร", "Allocate")}</button></form>
      <div class="sub" id="al-hint" style="margin-top:6px">${L("คงเหลือตามงบรายจ่าย", "Remaining by type")}: ${BUDGET_TYPES.map(t => `${tx(t.name)} ${mb((A.byType[t.id] || 0) - allocated(t.id))}`).join(" · ")}</div></div>` : ""}</section>`;
};

function planChart(lines) {
  const W = 720, H = 200, Lp = 50, R = 12, T = 12, B = 26, iw = W - Lp - R, ih = H - T - B;
  const m = Array(12).fill(0).map((_, i) => sumv(lines.map(l => l.plan[i])));
  const tot = sumv(m) || 1, cum = m.map((_, i) => sumv(m.slice(0, i + 1)) / tot * 100), maxM = Math.max(...m, 1);
  const x = i => Lp + iw / 12 * (i + 0.5), bw = iw / 12 * 0.6;
  let g = "";
  [0, 50, 100].forEach(v => (g += `<line x1="${Lp}" x2="${W - R}" y1="${T + ih - v / 100 * ih}" y2="${T + ih - v / 100 * ih}" stroke="var(--line)"/><text x="${Lp - 6}" y="${T + ih - v / 100 * ih + 4}" text-anchor="end">${v}%</text>`));
  m.forEach((v, i) => (g += `<rect x="${x(i) - bw / 2}" y="${T + ih - v / maxM * ih * 0.5}" width="${bw}" height="${v / maxM * ih * 0.5}" fill="var(--info)" fill-opacity=".35" rx="2"/><text x="${x(i)}" y="${H - 6}" text-anchor="middle">${FY_MONTHS[LANG][i]}</text>`));
  const path = cum.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${(T + ih - v / 100 * ih).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L("แผนการใช้จ่ายรายเดือนและสะสม", "Monthly and cumulative spending plan")}">${g}<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    <circle cx="${x(5)}" cy="${T + ih - cum[5] / 100 * ih}" r="4" fill="var(--accent)"/><text x="${x(5) + 8}" y="${T + ih - cum[5] / 100 * ih + 14}" style="fill:var(--accent);font-weight:600;font-size:12px">${L("ครึ่งปี", "Half year")} ${fmt(cum[5], 0)}%</text></svg>`;
}
ALLOC.plan = () => {
  const A = AL(), ed = canAlloc(), lines = A.lines.filter(l => !PLAN_UNIT || l.unit === PLAN_UNIT);
  const units = [...new Set(A.lines.map(l => l.unit))];
  return `
  <section class="panel chart"><header><h2>${L("แผนการใช้จ่าย", "Spending plan")}</h2><span class="sp"></span>
    <label class="field-inline" for="pu">${L("หน่วยงาน", "Unit")} <select id="pu"><option value="">${L("ทั้งหมด", "All")}</option>${units.map(u => `<option value="${u}" ${u === PLAN_UNIT ? "selected" : ""}>${esc(unitName(u))}</option>`).join("")}</select></label>
    <div class="legend"><span><i style="background:var(--info)"></i>${L("รายเดือน", "Monthly")}</span><span><i style="background:var(--accent)"></i>${L("สะสม %", "Cumulative %")}</span></div></header>
    <div class="body">${planChart(lines)}</div></section>
  <section class="panel"><header><h2>${L("แผนรายเดือนรายรายการ (ล้านบาท)", "Monthly plan by line (million baht)")}</h2><span class="sp"></span>
    ${ed ? `<button class="btn" type="button" id="plan-auto">${L("กระจายอัตโนมัติตามประเภทงบ", "Spread automatically by budget type")}</button>` : ""}</header>
    <div class="tbl-wrap"><table class="plan-grid"><thead><tr><th>${L("รายการ", "Line")}</th>${FY_MONTHS[LANG].map(m => `<th class="n">${m}</th>`).join("")}<th class="n">${L("รวม", "Total")}</th><th></th></tr></thead>
      <tbody>${lines.map(l => { const ok = Math.abs(sumv(l.plan) - l.amount) < 1000;
        return `<tr><td><b style="font-weight:600">${esc(tx(l.name))}</b><div class="sub">${unitName(l.unit)} · ${typeName(l.type)} · ${mb(l.amount)}</div></td>
          ${l.plan.map((v, i) => `<td class="n">${ed ? `<input type="number" min="0" step="0.01" data-pl="${l.id}" data-m="${i}" value="${(v / 1e6).toFixed(2)}" aria-label="${esc(tx(l.name))} ${FY_MONTHS[LANG][i]}">` : (v / 1e6).toFixed(2)}</td>`).join("")}
          <td class="n"><b>${mb(sumv(l.plan))}</b></td><td>${ok ? tag("✓", "p-ok") : tag(`${L("ต่าง", "Off")} ${mb(l.amount - sumv(l.plan))}`, "p-bad")}</td></tr>`; }).join("")}</tbody>
      <tfoot><tr><td>${L("รวมรายเดือน", "Monthly total")}</td>${Array(12).fill(0).map((_, i) => `<td class="n">${(sumv(lines.map(l => l.plan[i])) / 1e6).toFixed(1)}</td>`).join("")}<td class="n">${mb(sumv(lines.map(l => sumv(l.plan))))}</td><td></td></tr></tfoot></table></div>
    <div class="body sub">${L("แผนนี้เป็นฐานเทียบผลเบิกจ่ายใน M07", "This plan is the baseline M07 compares disbursement against")}</div></section>`;
};

ALLOC.transfers = () => {
  const A = AL(), ed = canAlloc();
  const ST = { pending: [L("รออนุมัติ", "Pending"), "p-warn"], approved: [L("อนุมัติแล้ว", "Approved"), "p-ok"], rejected: [L("ไม่อนุมัติ", "Rejected"), "p-bad"] };
  return `
  <section class="panel"><header><h2>${L("รายการโอนเปลี่ยนแปลง", "Budget transfers")}</h2><span class="sp"></span><span class="sub">${L("ผู้อนุมัติตามอำนาจ: ภายในหน่วยงานโดยผู้อำนวยการกองคลัง · ข้ามหน่วยงานหรือต่างงบรายจ่ายโดยผู้บริหาร", "Approval by authority: within a unit by the finance director; across units or budget types by an executive")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("โอนจาก", "From")}</th><th>${L("โอนไป", "To")}</th><th class="n">${L("ลบ.", "M")}</th><th>${L("ผู้อนุมัติ", "Approver")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${A.transfers.slice().reverse().map(t => { const lv = transferLevel(t), canAp = t.status === "pending" && ((lv[0] === "same" && acting("fin", "transfer")) || (lv[0] !== "same" && acting("exec", "transfer")));
        const by = lv[0] === "same" ? onBehalf("fin", "transfer") : onBehalf("exec", "transfer");
        return `<tr><td class="mono">${t.id}<div class="sub">${fdate(t.t)}</div></td><td>${esc(lineLabel(lineOf(t.from)))}</td><td>${esc(lineLabel(lineOf(t.to)))}<div class="sub">${esc(tx(t.why))}</div></td><td class="n">${mb(t.amount)}</td>
          <td class="sub">${lv[1]}</td><td>${tag(ST[t.status][0], ST[t.status][1])}</td>
          <td><div class="row" style="flex-wrap:nowrap">${canAp ? `<button class="btn primary" type="button" data-tap="${t.id}">${by ? L("อนุมัติแทน", "Approve on behalf") : L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-trj="${t.id}">${L("ไม่อนุมัติ", "Reject")}</button>` : ""}${historyBtn(t.id, t.id)}</div>
            ${canAp && by ? `<div class="sub" style="margin-top:4px">${by.slice(3)}</div>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
    ${ed ? `<div class="body"><form class="inline-form" id="tr-form">
      <div class="f"><label for="tr-from">${L("โอนจาก", "From")}</label><select id="tr-from">${A.lines.map(l => `<option value="${l.id}">${esc(lineLabel(l))} (${mb(l.amount - pendingOut(l.id))})</option>`).join("")}</select></div>
      <div class="f"><label for="tr-to">${L("โอนไป", "To")}</label><select id="tr-to">${A.lines.map((l, i) => `<option value="${l.id}" ${i === 1 ? "selected" : ""}>${esc(lineLabel(l))}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 110px"><label for="tr-amt">${L("ลบ.", "M")}</label><input type="number" min="0.01" step="0.01" id="tr-amt" required></div>
      <div class="f"><label for="tr-why">${L("เหตุผล", "Reason")}</label><input type="text" id="tr-why" required></div>
      <button class="btn primary" type="submit">${L("ขอโอนเปลี่ยนแปลง", "Request transfer")}</button></form></div>` : ""}</section>`;
};

VIEWS.allocation = () => {
  if (!S.allocs[ALLOC_FY]) ALLOC_FY = 2570;
  const fys = Object.keys(S.allocs).map(Number).sort();
  return `
  <div class="head"><div><div class="eyebrow">M06 · Budget Allocation</div><h1>${L("จัดสรรงบประมาณ", "Budget allocation")} ${fyLabel(ALLOC_FY)}</h1>
    <p>${L("กองคลังจัดสรรวงเงินที่ได้รับให้หน่วยงานและโครงการ จัดทำแผนการใช้จ่าย และบริหารการโอนเปลี่ยนแปลง", "Finance allocates the appropriation to units and projects, sets spending plans and manages transfers")}</p></div>
    <div class="sp"></div>${fys.length > 1 ? `<div class="seg" role="group" aria-label="${L("ปีงบประมาณ", "Fiscal year")}">${fys.map(y => `<button type="button" data-fy="${y}" class="${y === ALLOC_FY ? "on" : ""}">${y}</button>`).join("")}</div>` : ""}</div>
  <div class="tabs" role="tablist">${ALLOC_TABS.map(t => `<button class="tab ${t.id === ALLOC_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${t.id === ALLOC_TAB}" data-atab="${t.id}">${tx(t.label)}</button>`).join("")}</div>
  ${ALLOC[ALLOC_TAB]()}`;
};

BIND.allocation = () => {
  const A = AL(), re = () => { commit(); route(); };
  $$("[data-atab]").forEach(b => (b.onclick = () => { ALLOC_TAB = b.dataset.atab; route(); }));
  $$("[data-fy]").forEach(b => (b.onclick = () => { ALLOC_FY = Number(b.dataset.fy); route(); }));
  const mk = $("#mk-2571");
  if (mk) mk.onclick = () => {
    const rs = S.requests.filter(r => S.submission.results[r.id] != null);
    const lines = rs.map((r, i) => {
      const by = {}; r.items.forEach(it => (by[it.type] = (by[it.type] || 0) + itemTotal(it)));
      const type = Object.keys(by).sort((a, b) => by[b] - by[a])[0], amount = S.submission.results[r.id];
      return { id: "N" + (i + 1), unit: r.unit, name: r.name, type, amount, act: r.act, plan: monthShape(type).map(f => Math.round(amount * f)) };
    });
    lines.forEach(l => (l.plan[11] += l.amount - sumv(l.plan)));
    const byType = {}; BUDGET_TYPES.forEach(t => (byType[t.id] = sumv(lines.filter(l => l.type === t.id).map(l => l.amount))));
    S.allocs[2571] = { fy: 2571, draft: true, act: ["ร่างการจัดสรรปี 2571 จากผลพิจารณาของสำนักงบประมาณ", "FY2571 draft allocation from the Budget Bureau result"], date: TODAY, total: sumv(lines.map(l => l.amount)), byType, lines, transfers: [] };
    ALLOC_FY = 2571;
    audit(["สร้างร่างการจัดสรรปี 2571 จากผลพิจารณา", "Created the FY2571 draft allocation from the result"], `${lines.length} ${L("รายการ", "lines")}`); re();
    toast(L("สร้างร่างการจัดสรรปี 2571 แล้ว", "FY2571 draft allocation created"));
  };
  $$("[data-unit]").forEach(tr => { const t = () => { const u = tr.dataset.unit; OPEN_UNIT.has(u) ? OPEN_UNIT.delete(u) : OPEN_UNIT.add(u); route(); };
    tr.onclick = e => { if (!e.target.closest("input")) t(); }; tr.onkeydown = e => { if (e.key === "Enter") t(); }; });
  $$("[data-lamt]").forEach(inp => (inp.onchange = () => {
    const l = lineOf(inp.dataset.lamt), nv = Math.round(Number(inp.value) * 1e6), room = (A.byType[l.type] || 0) - allocated(l.type) + l.amount;
    if (nv > room) { toast(L(`เกินวงเงิน${typeName(l.type)}ที่เหลือ (${mb(room)} ลบ.)`, `More than the ${typeName(l.type)} left (${mb(room)} M)`)); inp.value = (l.amount / 1e6).toFixed(2); return; }
    audit(["ปรับวงเงินจัดสรร", "Changed an allocation"], `${l.id}: ${mb(l.amount)} → ${mb(nv)}`);
    l.amount = nv; scalePlan(l, nv); re();
  }));
  const af = $("#al-form");
  if (af) af.onsubmit = e => {
    e.preventDefault();
    const type = $("#al-type").value, amount = Math.round(Number($("#al-amt").value) * 1e6), room = (A.byType[type] || 0) - allocated(type);
    if (amount > room) { toast(L(`เกินวงเงิน${typeName(type)}ที่ยังไม่จัดสรร (${mb(room)} ลบ.)`, `More than the unallocated ${typeName(type)} (${mb(room)} M)`)); return; }
    const nm = $("#al-name").value.trim(), unit = $("#al-unit").value;
    const l = { id: "L" + (A.lines.length + 1), unit, name: [nm, nm], type, amount, act: "", plan: monthShape(type).map(f => Math.round(amount * f)) };
    l.plan[11] += amount - sumv(l.plan); A.lines.push(l); OPEN_UNIT.add(unit);
    audit(["จัดสรรงบประมาณ", "Allocated budget"], `${unitName(unit)} · ${nm} · ${mb(amount)}`);
    notify(["div"], [`กองคลังจัดสรรงบประมาณ ${nm} ${mb(amount)} ลบ.`, `Finance allocated ${mb(amount)} M for ${nm}`], "allocation"); re();
  };
  const pu = $("#pu"); if (pu) pu.onchange = () => { PLAN_UNIT = pu.value; route(); };
  $$("[data-pl]").forEach(inp => (inp.onchange = () => { const l = lineOf(inp.dataset.pl); l.plan[Number(inp.dataset.m)] = Math.round(Number(inp.value) * 1e6); save(); route(); }));
  const pa = $("#plan-auto"); if (pa) pa.onclick = () => {
    A.lines.filter(l => !PLAN_UNIT || l.unit === PLAN_UNIT).forEach(l => { l.plan = monthShape(l.type).map(f => Math.round(l.amount * f)); l.plan[11] += l.amount - sumv(l.plan); });
    audit(["กระจายแผนการใช้จ่ายอัตโนมัติ", "Spread the spending plan automatically"], PLAN_UNIT ? unitName(PLAN_UNIT) : L("ทุกหน่วยงาน", "All units")); re();
  };
  const tf = $("#tr-form");
  if (tf) tf.onsubmit = e => {
    e.preventDefault();
    const from = $("#tr-from").value, to = $("#tr-to").value, amount = Math.round(Number($("#tr-amt").value) * 1e6), why = $("#tr-why").value.trim();
    if (from === to) { toast(L("เลือกรายการต้นทางและปลายทางที่ต่างกัน", "Choose different source and destination lines")); return; }
    const avail = lineOf(from).amount - pendingOut(from);
    if (amount > avail) { toast(L(`โอนได้ไม่เกิน ${mb(avail)} ลบ. (หักรายการที่รอโอนแล้ว)`, `You can move at most ${mb(avail)} M (after pending transfers)`)); return; }
    const t = { id: `TR-${ALLOC_FY}-${String(A.transfers.length + 1).padStart(3, "0")}`, from, to, amount, why: [why, why], status: "pending", t: nowIso(), by: me().id };
    A.transfers.push(t);
    const lv = transferLevel(t);
    audit(["ขอโอนเปลี่ยนแปลงงบประมาณ", "Requested a budget transfer"], `${t.id} · ${mb(amount)}`);
    notify(lv[0] === "same" ? ["fin"] : ["exec"], [`มีคำขอโอนเปลี่ยนแปลง ${t.id} รออนุมัติ`, `Transfer ${t.id} is waiting for approval`], "allocation"); re();
    toast(L("ส่งคำขอโอนแล้ว · ", "Transfer requested · ") + lv[1]);
  };
  const decide = (id, ok) => {
    const t = A.transfers.find(x => x.id === id);
    t.status = ok ? "approved" : "rejected";
    if (ok) {
      const a = lineOf(t.from), b = lineOf(t.to);
      a.amount -= t.amount; b.amount += t.amount; scalePlan(a, a.amount); scalePlan(b, b.amount);
      if (a.type !== b.type) { A.byType[a.type] -= t.amount; A.byType[b.type] = (A.byType[b.type] || 0) + t.amount; }
    }
    const lv = transferLevel(t), by = lv[0] === "same" ? onBehalf("fin", "transfer") : onBehalf("exec", "transfer");
    audit([ok ? "อนุมัติการโอนเปลี่ยนแปลง" : "ไม่อนุมัติการโอนเปลี่ยนแปลง", ok ? "Approved a transfer" : "Rejected a transfer"], t.id + by);
    if (by) notify([lv[0] === "same" ? "fin" : "exec"], [`${userName(me().id)} ${ok ? "อนุมัติ" : "ไม่อนุมัติ"} ${t.id} แทนคุณตามการมอบอำนาจ`, `${userName(me().id)} ${ok ? "approved" : "rejected"} ${t.id} on your behalf`], "allocation");
    notify(["fin"], [`${t.id} ${ok ? "อนุมัติแล้ว" : "ไม่อนุมัติ"}`, `${t.id} was ${ok ? "approved" : "rejected"}`], "allocation"); re();
    toast(ok ? L("อนุมัติแล้ว · ปรับวงเงินและแผนการใช้จ่ายของทั้งสองรายการ", "Approved · both lines' amounts and plans updated") : L("ไม่อนุมัติแล้ว", "Rejected"));
  };
  $$("[data-tap]").forEach(b => (b.onclick = () => decide(b.dataset.tap, true)));
  $$("[data-trj]").forEach(b => (b.onclick = () => decide(b.dataset.trj, false)));
};
