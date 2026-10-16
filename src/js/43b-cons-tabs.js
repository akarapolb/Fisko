// M03 consolidation tabs (round 2): priority scoring, per-unit ceilings, programme breakdown.
let CONS_TAB = "overview";
const OPEN_PROG = new Set();
const CONS_PANELS = {}, CONS_BIND = {};
function consTabsBar() {
  const t = [["overview", L("ภาพรวม", "Overview")], ["priority", L("จัดลำดับความสำคัญ", "Priority scoring")], ["ceilings", L("กรอบวงเงินรายหน่วยงาน", "Unit ceilings")], ["programme", L("ตามแผนงาน", "By programme")]];
  return `<div class="tabs" role="tablist">${t.map(([id, l]) => `<button class="tab ${id === CONS_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === CONS_TAB}" data-ctab="${id}">${l}</button>`).join("")}</div>`;
}
const projReqs = () => S.requests.filter(r => !isPersonnel(r));
function scoreOf(r) {
  const sc = S.scores[r.id] || [3, 3, 3, 3], W = S.criteria.reduce((s, c) => s + c.w, 0) || 1;
  return S.criteria.reduce((s, c, i) => s + sc[i] * c.w, 0) / (5 * W) * 100;
}

// ---- priority ----
CONS_PANELS.priority = () => {
  const ed = ROLE === "plan", W = S.criteria.reduce((s, c) => s + c.w, 0);
  const ranked = projReqs().map(r => ({ r, s: scoreOf(r) })).sort((a, b) => b.s - a.s);
  let cum = 0, cutAt = -1;
  ranked.forEach((x, i) => { cum += x.r.amount / 1e6; x.cum = cum; x.in = cum <= S.cons.projCeiling + 1e-9; if (!x.in && cutAt < 0) cutAt = i; });
  const fund = ranked.filter(x => x.in).reduce((s, x) => s + x.r.amount, 0) / 1e6;
  return `
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("กรอบวงเงินสำหรับโครงการ", "Project budget ceiling")}</span><span class="v">${fmt(S.cons.projCeiling)}<small>${L("ลบ.", "M")}</small></span>
      ${ed ? `<label class="field-inline" for="pc">${L("ปรับ", "Change")} <input type="number" id="pc" min="0" step="1" value="${S.cons.projCeiling}" style="width:90px"></label>` : ""}</div>
    <div class="kpi"><span class="l">${L("คำขอโครงการรวม", "Project requests")}</span><span class="v">${fmt(ranked.reduce((s, x) => s + x.r.amount, 0) / 1e6, 1)}<small>${L("ลบ.", "M")}</small></span><span class="d sub">${ranked.length} ${L("โครงการ (ไม่รวมงบบุคลากร)", "projects (excl. personnel)")}</span></div>
    <div class="kpi hl"><span class="l">${L("อยู่ในกรอบตามลำดับคะแนน", "Fits the ceiling by rank")}</span><span class="v">${ranked.filter(x => x.in).length} / ${ranked.length}</span><span class="d" style="color:var(--rail-ink)">${fmt(fund, 1)} ${L("ลบ.", "M")}</span></div>
  </section>
  <section class="panel"><header><h2>${L("เกณฑ์และน้ำหนัก", "Criteria and weights")}</h2><span class="sp"></span>${W === 100 ? tag(L("รวม 100%", "Totals 100%"), "p-ok") : tag(`${L("รวม", "Totals")} ${W}% · ${L("ควรเท่ากับ 100%", "should be 100%")}`, "p-warn")}</header>
    <div class="body row">${S.criteria.map((c, i) => `<label class="field-inline" for="cw-${i}">${tx(c.name)} <input type="number" min="0" max="100" id="cw-${i}" data-cw="${i}" value="${c.w}" ${ed ? "" : "disabled"} style="width:68px"> %</label>`).join("")}</div></section>
  <section class="panel"><header><h2>${L("ลำดับความสำคัญของโครงการ", "Project ranking")}</h2><span class="sp"></span><span class="sub">${L("คะแนน 1–5 ต่อเกณฑ์ · เส้นประแดง = กรอบวงเงิน", "Score 1–5 per criterion · red dashed line = ceiling")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("โครงการ", "Project")}</th>${S.criteria.map(c => `<th class="c">${tx(c.name)}</th>`).join("")}<th class="n">${L("คะแนน", "Score")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th class="n">${L("สะสม", "Cumulative")}</th></tr></thead>
      <tbody>${ranked.map((x, i) => `<tr class="${i === cutAt ? "cutline" : ""}"><td><span class="rank ${x.in ? "in" : "out"}">${i + 1}</span></td>
        <td><a href="#" data-req="${x.r.id}">${esc(tx(x.r.name))}</a><div class="sub">${unitName(x.r.unit)}</div></td>
        ${S.criteria.map((c, ci) => `<td class="c"><select class="score-in" data-sc="${x.r.id}" data-ci="${ci}" ${ed ? "" : "disabled"} aria-label="${tx(c.name)}">${[1, 2, 3, 4, 5].map(v => `<option ${(S.scores[x.r.id] || [3, 3, 3, 3])[ci] === v ? "selected" : ""}>${v}</option>`).join("")}</select></td>`).join("")}
        <td class="n"><b>${fmt(x.s, 0)}</b></td><td class="n">${mb(x.r.amount)}</td><td class="n" style="color:var(--${x.in ? "ink" : "bad"})">${fmt(x.cum, 1)}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("ข้อเสนอจากคะแนนเพื่อประกอบการพิจารณาของคณะกรรมการ ไม่ใช่การตัดสินแทน", "A score-based suggestion for the committee, not a decision")}</div></section>`;
};
CONS_BIND.priority = () => {
  $$("[data-req]").forEach(a => (a.onclick = e => { e.preventDefault(); openReq(a.dataset.req); }));
  const pc = $("#pc"); if (pc) pc.onchange = () => { S.cons.projCeiling = Number(pc.value); audit(["ปรับกรอบวงเงินโครงการ", "Changed the project ceiling"], `${pc.value} M`); commit(); route(); };
  $$("[data-cw]").forEach(inp => (inp.onchange = () => { const c = S.criteria[inp.dataset.cw]; c.w = Number(inp.value); audit(["ปรับน้ำหนักเกณฑ์", "Changed a criterion weight"], `${tx(c.name)} ${c.w}%`); commit(); route(); }));
  $$("[data-sc]").forEach(s => (s.onchange = () => {
    const id = s.dataset.sc; S.scores[id] = (S.scores[id] || [3, 3, 3, 3]).slice(); S.scores[id][Number(s.dataset.ci)] = Number(s.value);
    audit(["ให้คะแนนความสำคัญโครงการ", "Scored a project"], id); commit(); route();
  }));
};

// ---- unit ceilings ----
CONS_PANELS.ceilings = () => {
  const ed = ROLE === "plan", sum = a => a.reduce((x, y) => x + y, 0);
  const rows = S.cons.units.map(u => ({ u, req: sum(u.v), ceil: S.cons.unitCeil[u.unit] }));
  const tReq = sum(rows.map(r => r.req)), tCeil = sum(rows.map(r => r.ceil)), gap = tCeil - S.cons.ceiling;
  return `
  <section class="panel"><header><h2>${L("กรอบวงเงินรายหน่วยงาน (ล้านบาท)", "Ceiling per unit (million baht)")}</h2><span class="sp"></span>
    ${Math.abs(gap) < 0.05 ? tag(L("รวมเท่ากับกรอบของกรม", "Matches the department ceiling"), "p-ok") : tag(`${gap > 0 ? L("เกินกรอบกรม", "Over the department ceiling by") : L("ต่ำกว่ากรอบกรม", "Under the department ceiling by")} ${fmt(Math.abs(gap), 1)}`, gap > 0 ? "p-bad" : "p-warn")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("คำขอ", "Requested")}</th><th class="n" style="width:150px">${L("กรอบวงเงิน", "Ceiling")}</th><th class="n">${L("ต้องปรับลด", "Cut needed")}</th><th>${L("สัดส่วนที่ได้", "Share kept")}</th></tr></thead>
      <tbody>${rows.map(r => { const cut = r.req - r.ceil, keep = r.req ? r.ceil / r.req * 100 : 0; return `<tr><td>${unitName(r.u.unit)}</td><td class="n">${fmt(r.req, 1)}</td>
        <td class="n"><input type="number" min="0" step="0.1" data-uc="${r.u.unit}" value="${r.ceil}" ${ed ? "" : "disabled"} aria-label="${L("กรอบวงเงิน", "Ceiling")} ${esc(unitName(r.u.unit))}"></td>
        <td class="n" style="color:var(--${cut > 0 ? "bad" : "accent"})">${cut > 0 ? fmt(cut, 1) : "—"}</td>
        <td><div class="bar"><i style="width:${Math.min(100, keep)}%"></i></div><span class="sub">${fmt(keep, 1)}%</span></td></tr>`; }).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(tReq, 1)}</td><td class="n">${fmt(tCeil, 1)} / ${fmt(S.cons.ceiling)}</td><td class="n">${fmt(Math.max(0, tReq - tCeil), 1)}</td><td></td></tr></tfoot></table></div>
    <div class="body row">${ed ? `<button class="btn" type="button" id="uc-prop">${L("แบ่งตามสัดส่วนคำขอ", "Split pro rata to requests")}</button>` : ""}
      <span class="sub">${L("กรอบวงเงินจะแจ้งหน่วยงานเพื่อปรับคำขอในรอบถัดไป", "Ceilings are sent to units so they can adjust their requests")}</span></div></section>`;
};
CONS_BIND.ceilings = () => {
  $$("[data-uc]").forEach(inp => (inp.onchange = () => { S.cons.unitCeil[inp.dataset.uc] = Number(inp.value); audit(["ปรับกรอบวงเงินหน่วยงาน", "Changed a unit ceiling"], `${unitName(inp.dataset.uc)}: ${inp.value}`); commit(); route(); }));
  const p = $("#uc-prop"); if (p) p.onclick = () => {
    const sum = a => a.reduce((x, y) => x + y, 0), tot = sum(S.cons.units.map(u => sum(u.v)));
    S.cons.units.forEach(u => (S.cons.unitCeil[u.unit] = Math.round(sum(u.v) * S.cons.ceiling / tot * 10) / 10));
    audit(["แบ่งกรอบวงเงินตามสัดส่วนคำขอ", "Split ceilings pro rata"], `${S.cons.ceiling} M`);
    notify(["div"], ["กองแผนงานแจ้งกรอบวงเงินรายหน่วยงานแล้ว", "Planning has issued unit budget ceilings"], "requests");
    commit(); route(); toast(L("แบ่งกรอบวงเงินแล้ว และแจ้งหน่วยงาน", "Ceilings split and units notified"));
  };
};

// ---- by programme ----
CONS_PANELS.programme = () => {
  const progs = (S.structure[2571] || []).filter(n => n.lvl === "program");
  const rows = progs.map(p => { const rq = S.requests.filter(r => (lineage(r.act)[0] || {}).id === p.id); return { p, rq, amt: rq.reduce((s, r) => s + r.amount, 0), prev: rq.reduce((s, r) => s + (r.prev || 0), 0) }; });
  const none = S.requests.filter(r => !lineage(r.act).length);
  const tot = rows.reduce((s, x) => s + x.amt, 0) + none.reduce((s, r) => s + r.amount, 0);
  return `
  <section class="panel"><header><h2>${L("คำขอรายโครงการตามแผนงาน", "Project requests by programme")}</h2><span class="sp"></span><span class="sub">${L("คลิกแผนงานเพื่อดูคำขอ · ล้านบาท", "Click a programme to see its requests · million baht")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("แผนงาน", "Programme")}</th><th class="n">${L("คำขอ", "Requests")}</th><th class="n">${L("ปี 2570", "FY2570")}</th><th class="n">${L("ปี 2571", "FY2571")}</th><th class="n">${L("เปลี่ยนแปลง", "Change")}</th><th class="n">${L("สัดส่วน", "Share")}</th></tr></thead>
      <tbody>${rows.map(x => { const open = OPEN_PROG.has(x.p.id), ch = x.prev ? (x.amt / x.prev - 1) * 100 : null;
        return `<tr class="prog-row ${open ? "open" : ""}" data-prog="${x.p.id}" tabindex="0" aria-expanded="${open}"><td><b>${x.p.code}</b> ${esc(tx(x.p.name))}</td><td class="n">${x.rq.length}</td><td class="n">${mb(x.prev)}</td><td class="n"><b>${mb(x.amt)}</b></td>
          <td class="n">${ch == null ? "—" : `${ch >= 0 ? "+" : ""}${fmt(ch, 1)}%`}</td><td class="n">${fmt(tot ? x.amt / tot * 100 : 0, 1)}%</td></tr>
          ${open ? x.rq.map(r => `<tr class="sub-row"><td><a href="#" data-req="${r.id}" class="mono">${r.id}</a> ${esc(tx(r.name))}</td><td class="n">${pill(r.status)}</td><td class="n">${mb(r.prev || 0)}</td><td class="n">${mb(r.amount)}</td><td class="n"></td><td class="n"></td></tr>`).join("") || `<tr class="sub-row"><td colspan="6" class="sub">${L("ไม่มีคำขอ", "No requests")}</td></tr>` : ""}`; }).join("")}
        ${none.length ? `<tr><td class="sub">${L("ยังไม่ระบุกิจกรรม", "No activity chosen")}</td><td class="n">${none.length}</td><td></td><td class="n">${mb(none.reduce((s, r) => s + r.amount, 0))}</td><td></td><td></td></tr>` : ""}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${S.requests.length}</td><td class="n">${mb(rows.reduce((s, x) => s + x.prev, 0))}</td><td class="n">${mb(tot)}</td><td></td><td class="n">100%</td></tr></tfoot></table></div></section>`;
};
CONS_BIND.programme = () => {
  $$("[data-prog]").forEach(tr => {
    const t = () => { const id = tr.dataset.prog; OPEN_PROG.has(id) ? OPEN_PROG.delete(id) : OPEN_PROG.add(id); route(); };
    tr.onclick = e => { if (!e.target.closest("a")) t(); };
    tr.onkeydown = e => { if (e.key === "Enter") t(); };
  });
  $$("[data-req]").forEach(a => (a.onclick = e => { e.preventDefault(); e.stopPropagation(); openReq(a.dataset.req); }));
};
