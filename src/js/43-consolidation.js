// M03 Consolidation: department-level view of requests against the ceiling, plus AI-flagged duplicates.
VIEWS.consolidation = () => {
  const U = S.cons.units, sum = a => a.reduce((x, y) => x + y, 0);
  const tot = sum(U.map(u => sum(u.v))), byT = BUDGET_TYPES.map((t, i) => sum(U.map(u => u.v[i])));
  const max = Math.max(...U.map(u => sum(u.v))), over = tot - S.cons.ceiling, M = L("ล้านบาท", "M baht");
  const open = S.dupes.filter(d => !d.done);
  return `
  <div class="head"><div><div class="eyebrow">M03 · Budget Consolidation</div><h1>${L(`ภาพรวมคำขอระดับกรม ปี ${FORM_FY}`, `Department-level requests, FY${FORM_FY}`)}</h1>
    <p>${L("รวมจาก", "From")} ${U.length} ${L("หน่วยงาน เทียบกับกรอบวงเงินเบื้องต้น", "units, against the initial ceiling of")} ${fmt(S.cons.ceiling)} ${M}</p></div></div>
  ${consTabsBar()}
  ${CONS_TAB !== "overview" ? CONS_PANELS[CONS_TAB]() : `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("คำขอรวม", "Total requested")}</span><span class="v">${fmt(tot, 1)}<small>${M}</small></span></div>
    <div class="kpi"><span class="l">${L("กรอบวงเงินเบื้องต้น", "Initial ceiling")}</span><span class="v">${fmt(S.cons.ceiling)}<small>${M}</small></span></div>
    <div class="kpi"><span class="l">${over > 0 ? L("เกินกรอบ", "Over ceiling") : L("ต่ำกว่ากรอบ", "Under ceiling")}</span><span class="v" style="color:var(--${over > 0 ? "bad" : "accent"})">${fmt(Math.abs(over), 1)}<small>${M}</small></span>${over > 0 ? `<span class="d sub">${L("ต้องปรับลด", "Cut needed")} ${fmt(over / tot * 100, 1)}%</span>` : ""}</div>
    <div class="kpi"><span class="l">${L("รายการที่อาจซ้ำซ้อน", "Possible duplicates")}</span><span class="v">${open.length}</span><span class="d sub">${L("ตรวจพบโดย AI", "Found by AI")}</span></div>
  </section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("คำขอรายหน่วยงาน แยกตามงบรายจ่าย", "Requests by unit and budget type")}</h2><span class="sp"></span>
      <div class="legend">${BUDGET_TYPES.map((t, i) => `<span><span class="sw c${i + 1}"></span>${tx(t.name)}</span>`).join("")}</div></header>
      <div class="body"><div class="hbars">${U.map(u => { const s = sum(u.v);
        return `<div class="hb"><span>${unitName(u.unit)}</span><div class="track" style="width:${s / max * 100}%">${u.v.map((v, i) => (v ? `<i class="c${i + 1}" style="width:${v / s * 100}%"></i>` : "")).join("")}</div><span class="num" style="text-align:right">${fmt(s, 1)}</span></div>`; }).join("")}</div>
        <div class="sub" style="margin-top:10px">${L("หน่วย: ล้านบาท", "Unit: million baht")}</div></div></section>
    <section class="panel"><header><h2>${L("สรุปตามงบรายจ่าย", "By budget type")}</h2></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("งบรายจ่าย", "Budget type")}</th><th class="n">${L("ล้านบาท", "M baht")}</th><th class="n">${L("สัดส่วน", "Share")}</th></tr></thead>
        <tbody>${BUDGET_TYPES.map((t, i) => `<tr><td><span class="sw c${i + 1}"></span> ${tx(t.name)}</td><td class="n">${fmt(byT[i], 1)}</td><td class="n">${fmt(byT[i] / tot * 100, 1)}%</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(tot, 1)}</td><td class="n">100%</td></tr></tfoot></table></div></section>
  </div>
  <section class="panel"><header><h2>${L("รายการที่อาจซ้ำซ้อน", "Possible duplicates")}</h2><span class="sp"></span>${tag(L("ตรวจพบโดย AI · รอผู้พิจารณายืนยัน", "Found by AI · awaiting confirmation"), "p-info")}</header>
    <div class="body">${S.dupes.map(d => `<div class="dupe"><div><b style="font-weight:600">${tx(d.title)}</b><p>${tx(d.desc)}</p></div>
      <div class="row">${d.done ? tag(d.done === "merge" ? L(`รวมแล้ว · ลด ${fmt(d.save, 1)} ลบ.`, `Merged · saves ${fmt(d.save, 1)} M`) : L("ยืนยันว่าไม่ซ้ำ", "Confirmed not a duplicate"), d.done === "merge" ? "p-ok" : "p-mute")
        : ROLE === "plan" ? `<button class="btn" type="button" data-d="${d.id}" data-a="merge">${L("รวมรายการ", "Merge")}</button><button class="btn ghost" type="button" data-d="${d.id}" data-a="keep">${L("ไม่ซ้ำ", "Not a duplicate")}</button>`
        : `<span class="sub">${L("รอกองแผนงานยืนยัน", "Waiting for Planning")}</span>`}</div></div>`).join("")}</div></section>`}`;
};
BIND.consolidation = () => {
  $$("[data-ctab]").forEach(b => (b.onclick = () => { CONS_TAB = b.dataset.ctab; route(); }));
  (CONS_BIND[CONS_TAB] || (() => {}))();
  $$("[data-d]").forEach(b => (b.onclick = () => {
    const d = S.dupes.find(x => x.id === b.dataset.d);
    d.done = b.dataset.a;
    audit(d.done === "merge" ? ["รวมรายการที่ซ้ำซ้อน", "Merged a duplicate"] : ["ยืนยันว่ารายการไม่ซ้ำซ้อน", "Confirmed not a duplicate"], tx(d.title));
    commit(); route();
    toast(d.done === "merge" ? L(`รวมรายการแล้ว · ลด ${fmt(d.save, 1)} ล้านบาท`, `Merged · saves ${fmt(d.save, 1)} million baht`) : L("บันทึกว่าไม่ซ้ำซ้อนแล้ว", "Recorded as not a duplicate"));
  }));
};
