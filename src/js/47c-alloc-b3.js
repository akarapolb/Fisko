// Fisko Budget round B3, allocation (M06): FY2571 allocation lines from the appropriation act (FR-B-26).
// When the bill is in force, each line takes its amount from parliament (after cuts and restored appeals); before
// that, from the Budget Bureau result in M05. Every line keeps its request id, and its monthly plan comes from the
// request's quarterly plan scaled to the amount (each quarter spread over its three months).
function actAmount(r) {
  const P = S.parl, done = P && P.stage >= PARL_STEPS.length;
  if (done && typeof parlItems === "function") { const it = parlItems().find(x => x.id === r.id); if (it) return Math.round(parlFinal(it) * 1e6); }
  return S.submission.results[r.id];
}
function planFromQ(r, amount) {
  const q = (r.qplan && sumv(r.qplan.map(Number)) > 0) ? r.qplan.map(Number) : qplanFill(r), t = sumv(q) || 1, out = [];
  q.forEach(v => { const m = Math.round(amount * v / t / 3); out.push(m, m, m); });
  out[11] += amount - sumv(out);
  return out;
}
{
  const bv = ALLOC.appropriation;
  ALLOC.appropriation = () => {
    let html = bv();
    const P = S.parl, done = P && P.stage >= PARL_STEPS.length;
    if (ALLOC_FY === CUR_FY && !S.allocs[FORM_FY]) if (done) html = html.replace(L(`สร้างร่างการจัดสรรปี ${FORM_FY} จากผลพิจารณา`, `Create the FY${FORM_FY} draft from the results`), L(`สร้างบรรทัดจัดสรรปี ${FORM_FY} ตาม พ.ร.บ.`, `Create FY${FORM_FY} lines from the appropriation act`));
    if (ALLOC_FY === FORM_FY && S.allocs[FORM_FY]) {
      const A = S.allocs[FORM_FY], linked = A.lines.filter(l => l.req).length;
      html = `<div class="alert"><div class="ic">i</div><div><b>${A.fromAct ? L(`บรรทัดจัดสรรสร้างจาก พ.ร.บ. งบประมาณรายจ่ายประจำปี ${FORM_FY}`, `Lines created from the FY${FORM_FY} appropriation act`) : L("ร่างการจัดสรรจากผลพิจารณาของสำนักงบประมาณ", "Draft allocation from the Budget Bureau result")}</b><p>${linked}/${A.lines.length} ${L("บรรทัดผูกกับคำขอ · แผนรายเดือนมาจากแผนรายไตรมาสของคำขอ", "lines linked to a request · monthly plans come from the request's quarterly plan")}${A.fromAct ? "" : ` · ${L("เมื่อ พ.ร.บ. มีผลใช้บังคับ ปรับวงเงินตามกฎหมายได้ที่ปุ่มด้านล่าง", "once the act is in force, update to the law's amounts with the button below")}`}</p>
        ${!A.fromAct && done && (canAlloc() || ROLE === "plan") ? `<div class="row" style="margin-top:8px"><button class="btn primary" type="button" id="act-sync">${L("ปรับวงเงินตาม พ.ร.บ.", "Update to the act's amounts")}</button></div>` : ""}</div></div>` + html;
    }
    return html;
  };
  const bb = BIND.allocation;
  BIND.allocation = () => {
    bb();
    const mk = $(`#mk-${FORM_FY}`);
    if (mk) mk.onclick = () => {
      const rs = S.requests.filter(r => actAmount(r) != null), done = S.parl && S.parl.stage >= PARL_STEPS.length;
      if (!rs.length) { toast(L("ยังไม่มีผลพิจารณา", "No results yet")); return; }
      const lines = rs.map((r, i) => {
        const by = {}; r.items.forEach(it => (by[it.type] = (by[it.type] || 0) + itemTotal(it)));
        const type = Object.keys(by).sort((a, b) => by[b] - by[a])[0], amount = actAmount(r);
        return { id: "N" + (i + 1), req: r.id, unit: r.unit, name: r.name, type, amount, act: r.act, plan: planFromQ(r, amount) };
      });
      const byType = {}; BUDGET_TYPES.forEach(t => (byType[t.id] = sumv(lines.filter(l => l.type === t.id).map(l => l.amount))));
      S.allocs[FORM_FY] = { fy: FORM_FY, draft: !done, fromAct: done, act: done ? [`พ.ร.บ. งบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. ${FORM_FY}`, `FY${FORM_FY} Appropriation Act`] : [`ร่างการจัดสรรปี ${FORM_FY} จากผลพิจารณาของสำนักงบประมาณ`, `FY${FORM_FY} draft allocation from the Budget Bureau result`], date: TODAY, total: sumv(lines.map(l => l.amount)), byType, lines, transfers: [], releases: [] };
      rs.forEach(r => (r.inAct = done));
      ALLOC_FY = FORM_FY;
      audit([done ? `สร้างบรรทัดจัดสรรปี ${FORM_FY} ตาม พ.ร.บ.` : `สร้างร่างการจัดสรรปี ${FORM_FY} จากผลพิจารณา`, done ? `Created FY${FORM_FY} lines from the act` : `Created the FY${FORM_FY} draft allocation from the result`], `${lines.length} ${L("รายการ", "lines")}`); commit(); route();
      toast(done ? L("สร้างบรรทัดจัดสรรตาม พ.ร.บ. แล้ว", "Lines created from the act") : L(`สร้างร่างการจัดสรรปี ${FORM_FY} แล้ว`, `FY${FORM_FY} draft allocation created`));
    };
    const as = $("#act-sync");
    if (as) as.onclick = () => {
      const A = S.allocs[FORM_FY]; let n = 0;
      A.lines.forEach(l => { const r = l.req && S.requests.find(x => x.id === l.req); if (!r) return; const amt = actAmount(r); if (amt != null && amt !== l.amount) { l.amount = amt; l.plan = planFromQ(r, amt); n++; } r.inAct = true; });
      BUDGET_TYPES.forEach(t => (A.byType[t.id] = sumv(A.lines.filter(l => l.type === t.id).map(l => l.amount))));
      A.total = sumv(A.lines.map(l => l.amount)); A.fromAct = true; A.draft = false; A.act = [`พ.ร.บ. งบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. ${FORM_FY}`, `FY${FORM_FY} Appropriation Act`];
      audit(["ปรับวงเงินจัดสรรตาม พ.ร.บ.", "Updated allocations to the act"], `${n}`); commit(); route(); toast(L(`ปรับตาม พ.ร.บ. แล้ว ${n} บรรทัด`, `Updated ${n} lines to the act`));
    };
  };
}
