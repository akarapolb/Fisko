// M03 deeper features (round 8): unit responses to the issued ceilings (accept, or appeal with an
// amount and reason that Planning grants or declines) and 4-year forward estimates.
const CRESP = { pending: [["รอตอบรับ", "Awaiting reply"], "p-mute"], accepted: [["ยอมรับกรอบ", "Accepted"], "p-ok"], appeal: [["ขอทบทวน", "Appealed"], "p-warn"],
  granted: [["อนุมัติเพิ่มกรอบ", "Appeal granted"], "p-info"], declined: [["คงกรอบเดิม", "Appeal declined"], "p-bad"] };
const sumV = a => a.reduce((x, y) => x + y, 0);
const consResp = unit => (S.cons.resp && S.cons.resp[unit]) || { st: "pending" };

CONS_PANELS.responses = () => {
  const pl = ROLE === "plan", rows = S.cons.units.map(u => ({ u, req: sumV(u.v), ceil: S.cons.unitCeil[u.unit], r: consResp(u.unit) }));
  const cnt = st => rows.filter(x => x.r.st === st).length, tCeil = sumV(rows.map(x => x.ceil)), asked = sumV(rows.filter(x => x.r.st === "appeal").map(x => x.r.amt));
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("แจ้งกรอบวงเงินเมื่อ", "Ceilings issued")}</span><span class="v" style="font-size:20px">${S.cons.issued ? fdate(S.cons.issued) : "—"}</span></div>
    <div class="kpi"><span class="l">${L("ยอมรับกรอบแล้ว", "Accepted")}</span><span class="v">${cnt("accepted")}<small>/ ${rows.length}</small></span></div>
    <div class="kpi"><span class="l">${L("ขอทบทวนรอพิจารณา", "Appeals to decide")}</span><span class="v" style="color:var(--${cnt("appeal") ? "warn" : "accent"})">${cnt("appeal")}</span>${asked ? `<span class="d">${fmt(asked, 1)} ${L("ลบ.", "M")}</span>` : ""}</div>
    <div class="kpi"><span class="l">${L("กรอบรวม / กรอบกรม", "Unit total / department")}</span><span class="v" style="font-size:20px;color:var(--${tCeil > S.cons.ceiling + 0.05 ? "bad" : "ink"})">${fmt(tCeil, 1)}<small>/ ${fmt(S.cons.ceiling)}</small></span></div>
  </section>
  <section class="panel"><header><h2>${L("การตอบรับกรอบวงเงินของหน่วยงาน", "Unit responses to ceilings")}</h2><span class="sp"></span><span class="sub">${L("หน่วยงานตอบรับในหน้า M02 คำของบประมาณ", "Units reply on the M02 requests page")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("คำขอ", "Requested")}</th><th class="n">${L("กรอบ", "Ceiling")}</th><th>${L("การตอบรับ", "Response")}</th><th class="n">${L("ขอเพิ่ม (ลบ.)", "Asked (M)")}</th><th>${L("เหตุผล", "Reason")}</th><th></th></tr></thead>
      <tbody>${rows.map(x => `<tr><td>${unitName(x.u.unit)}</td><td class="n">${fmt(x.req, 1)}</td><td class="n">${fmt(x.ceil, 1)}</td>
        <td>${tag(tx(CRESP[x.r.st][0]), CRESP[x.r.st][1])}${x.r.t ? `<div class="sub">${x.r.by ? esc(userName(x.r.by)) + " · " : ""}${fdate(x.r.t)}</div>` : ""}</td>
        <td class="n">${x.r.amt ? fmt(x.r.amt, 1) : "—"}</td><td class="sub">${x.r.why ? esc(tx(x.r.why)) : "—"}${x.r.note ? `<div>${L("ผลพิจารณา", "Decision")}: ${esc(tx(x.r.note))}</div>` : ""}</td>
        <td><div class="row" style="flex-wrap:nowrap">${pl && x.r.st === "appeal" ? `<button class="btn primary" type="button" data-cgrant="${x.u.unit}">${L("เพิ่มกรอบให้", "Grant")}</button><button class="btn danger" type="button" data-cdecl="${x.u.unit}">${L("คงกรอบเดิม", "Decline")}</button>` : ""}
          ${pl && x.r.st === "pending" ? `<button class="btn ghost" type="button" data-cremind="${x.u.unit}">${L("แจ้งเตือน", "Remind")}</button>` : ""}</div></td></tr>`).join("")}</tbody></table></div>
    ${pl ? `<div class="body sub">${L("การเพิ่มกรอบให้หน่วยหนึ่งทำให้กรอบรวมเกินกรอบกรม ให้ปรับลดหน่วยอื่นที่แท็บกรอบวงเงินรายหน่วยงาน", "Granting an appeal can push the total over the department ceiling; rebalance other units in the Unit ceilings tab")}</div>` : ""}</section>`;
};
CONS_BIND.responses = () => {
  const decide = (unit, ok) => {
    const r = consResp(unit), n = unitName(unit);
    if (ok) S.cons.unitCeil[unit] = Math.round((S.cons.unitCeil[unit] + r.amt) * 10) / 10;
    r.st = ok ? "granted" : "declined"; r.dt = nowIso(); r.note = ok ? ["เพิ่มกรอบตามที่ขอ", "Raised as asked"] : ["กรอบรวมของกรมไม่พอ ให้ปรับลำดับความสำคัญภายในหน่วย", "No room in the department total; reprioritise within the unit"];
    audit(ok ? ["อนุมัติคำขอทบทวนกรอบวงเงิน", "Granted a ceiling appeal"] : ["ไม่อนุมัติคำขอทบทวนกรอบวงเงิน", "Declined a ceiling appeal"], `${n} · ${fmt(r.amt, 1)} M`);
    notify(["div"], ok ? [`กองแผนงานเพิ่มกรอบวงเงิน ${n} อีก ${fmt(r.amt, 1)} ล้านบาท`, `Planning raised the ${n} ceiling by ${fmt(r.amt, 1)} M`] : [`กองแผนงานคงกรอบวงเงินเดิมของ ${n}`, `Planning kept the ${n} ceiling unchanged`], "requests");
    commit(); route(); toast(ok ? L("เพิ่มกรอบแล้ว · ตรวจกรอบรวมที่แท็บกรอบวงเงิน", "Granted · check the total in Unit ceilings") : L("คงกรอบเดิม · แจ้งหน่วยงานแล้ว", "Declined · the unit has been told"));
  };
  $$("[data-cgrant]").forEach(b => (b.onclick = () => decide(b.dataset.cgrant, true)));
  $$("[data-cdecl]").forEach(b => (b.onclick = () => decide(b.dataset.cdecl, false)));
  $$("[data-cremind]").forEach(b => (b.onclick = () => {
    notify(["div"], [`กรุณาตอบรับกรอบวงเงินของ ${unitName(b.dataset.cremind)}`, `Please reply to the ${unitName(b.dataset.cremind)} ceiling`], "requests");
    audit(["แจ้งเตือนให้ตอบรับกรอบวงเงิน", "Reminded a unit to reply to its ceiling"], unitName(b.dataset.cremind)); commit(); toast(L("ส่งแจ้งเตือนแล้ว", "Reminder sent"));
  }));
};

// Shown to a division on its M02 request list once ceilings are issued.
function ceilingBanner() {
  const u = S.cons.units.find(x => x.unit === me().unit);
  if (!u || !S.cons.issued) return "";
  const r = consResp(u.unit), req = sumV(u.v), ceil = S.cons.unitCeil[u.unit];
  return `<section class="panel" id="ceil-panel"><header><h2>${L(`กรอบวงเงินของหน่วยงาน ปี ${FORM_FY}`, `Your FY${FORM_FY} ceiling`)}</h2><span class="sp"></span>${tag(tx(CRESP[r.st][0]), CRESP[r.st][1])}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:10px">
      <div class="row"><span>${L("คำขอรวม", "Requested")} <b class="num">${fmt(req, 1)}</b></span><span>·</span><span>${L("กรอบที่ได้รับ", "Ceiling")} <b class="num">${fmt(ceil, 1)}</b> ${L("ล้านบาท", "M baht")}</span>
        ${req > ceil ? `<span>·</span><span style="color:var(--bad)">${L("ต้องปรับลด", "To cut")} ${fmt(req - ceil, 1)}</span>` : ""}<span class="sub">${L("แจ้งเมื่อ", "Issued")} ${fdate(S.cons.issued)}</span></div>
      ${r.st === "pending" ? `<div class="row"><button class="btn primary" type="button" id="ceil-ok">${L("ยอมรับกรอบวงเงิน", "Accept the ceiling")}</button><button class="btn" type="button" id="ceil-appeal">${L("ขอทบทวนกรอบ", "Appeal")}</button></div>
        <form class="inline-form" id="ceil-form" hidden><div class="f" style="flex:0 1 140px"><label for="ceil-amt">${L("ขอเพิ่ม (ล้านบาท)", "Extra (M baht)")}</label><input type="number" id="ceil-amt" min="0.1" step="0.1" required></div>
          <div class="f" style="flex:2 1 240px"><label for="ceil-why">${L("เหตุผลและผลกระทบหากไม่ได้รับ", "Reason and impact if not granted")}</label><input type="text" id="ceil-why" required></div>
          <button class="btn primary" type="submit">${L("ส่งคำขอทบทวน", "Send appeal")}</button></form>`
        : r.st === "appeal" ? `<span class="sub">${L("ขอเพิ่ม", "Asked for")} ${fmt(r.amt, 1)} ${L("ลบ. · รอกองแผนงานพิจารณา", "M · waiting for Planning")}</span>`
        : r.note ? `<span class="sub">${esc(tx(r.note))}</span>` : ""}</div></section>`;
}
function bindCeilingBanner() {
  const ok = $("#ceil-ok"); if (!ok) return;
  const u = me().unit, save = r => { S.cons.resp[u] = Object.assign({ t: nowIso(), by: me().id }, r); commit(); route(); };
  ok.onclick = () => { save({ st: "accepted" }); audit(["ยอมรับกรอบวงเงิน", "Accepted the unit ceiling"], unitName(u)); commit(); toast(L("ยอมรับกรอบแล้ว · ปรับคำขอให้อยู่ในกรอบ", "Accepted · bring your requests within it")); };
  $("#ceil-appeal").onclick = () => { $("#ceil-form").hidden = false; $("#ceil-amt").focus(); };
  $("#ceil-form").onsubmit = e => {
    e.preventDefault();
    const amt = Number($("#ceil-amt").value), why = $("#ceil-why").value.trim();
    save({ st: "appeal", amt, why: [why, why] });
    audit(["ขอทบทวนกรอบวงเงิน", "Appealed the unit ceiling"], `${unitName(u)} · ${fmt(amt, 1)} M`);
    notify(["plan"], [`${unitName(u)} ขอทบทวนกรอบวงเงิน เพิ่ม ${fmt(amt, 1)} ล้านบาท`, `${unitName(u)} appealed its ceiling for ${fmt(amt, 1)} M more`], "cons-responses");
    commit(); toast(L("ส่งคำขอทบทวนให้กองแผนงานแล้ว", "Appeal sent to Planning"));
  };
}

// ---------- forward estimates ----------
const FWD_Y = [0, 1, 2, 3].map(i => FORM_FY + i);
function forwardRows() {
  const a = S.fwd || { per: 3, ope: 2, ceil: 3 }, tot = i => sumV(S.cons.units.map(u => u.v[i]));
  const g = (base, pct, n) => base * Math.pow(1 + pct / 100, n);
  const multi = FWD_Y.map(y => sumV(S.requests.filter(r => r.multi && r.years && r.status !== "rejected").map(r => y > FORM_FY ? Number(r.years[y] || 0) / 1e6 : 0)));
  const bank = FWD_Y.map((y, n) => sumV((S.ideas || []).filter(i => ["proposed", "screened", "accepted"].includes(i.status)).map(i => (n >= 1 && n <= i.years ? i.est / i.years : 0))));
  const rows = [
    { k: "per", c: "c1", name: ["งบบุคลากร (ต่อเนื่อง)", "Personnel (continuing)"], v: FWD_Y.map((y, n) => g(tot(0), a.per, n)) },
    { k: "ope", c: "c3", name: ["งบดำเนินงาน อุดหนุน และอื่น ๆ (ต่อเนื่อง)", "Operating, subsidies and other (continuing)"], v: FWD_Y.map((y, n) => g(tot(1) + tot(3) + tot(4), a.ope, n)) },
    { k: "inv", c: "c2", name: [`งบลงทุนปี ${FORM_FY} และภาระผูกพันหลายปี`, `FY${FORM_FY} investment and multi-year commitments`], v: FWD_Y.map((y, n) => (n ? 0 : tot(2)) + multi[n]) },
    { k: "new", c: "c4", name: ["โครงการใหม่ในคลังโครงการ (ยังไม่เป็นคำขอ)", "New project-bank ideas (not yet requests)"], v: bank },
  ];
  const total = FWD_Y.map((y, n) => sumV(rows.map(r => r.v[n]))), ceil = FWD_Y.map((y, n) => g(S.cons.ceiling, a.ceil, n));
  return { rows, total, ceil, a };
}
CONS_PANELS.forward = () => {
  const { rows, total, ceil, a } = forwardRows(), pl = ROLE === "plan", max = Math.max(...total, ...ceil);
  return `
  <div class="grid2">
    <section class="panel"><header><h2>${L("ประมาณการรายจ่ายล่วงหน้า 4 ปี", "4-year forward estimates")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท", "M baht")}</span></header>
      <div class="body"><div class="fwd-chart">${FWD_Y.map((y, n) => `<div class="fwd-col"><div class="fwd-area"><div class="fwd-bar" style="height:${total[n] / max * 100}%">${rows.map(r => `<i class="${r.c}" style="height:${total[n] ? r.v[n] / total[n] * 100 : 0}%" title="${esc(tx(r.name))}: ${fmt(r.v[n], 1)}"></i>`).join("")}</div>
          <span class="fwd-ceil" style="bottom:${ceil[n] / max * 100}%" title="${L("กรอบวงเงินคาดการณ์", "Expected ceiling")}: ${fmt(ceil[n], 1)}"></span></div><b class="num">${fmt(total[n], 0)}</b><span class="sub">${y}</span></div>`).join("")}</div>
        <div class="row sub" style="margin-top:10px">${rows.map(r => `<span><i class="${r.c} lg"></i>${tx(r.name)}</span>`).join("")}<span><i class="lg ceil-lg"></i>${L("กรอบวงเงินคาดการณ์", "Expected ceiling")}</span></div></div></section>
    <section class="panel"><header><h2>${L("สมมติฐาน", "Assumptions")}</h2><span class="sp"></span>${tag(pl ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), pl ? "p-ok" : "p-mute")}</header>
      <div class="body" style="display:flex;flex-direction:column;gap:12px">
        ${[["per", L("งบบุคลากรเพิ่มขึ้นต่อปี (เลื่อนขั้นเงินเดือน)", "Personnel growth a year (salary steps)")], ["ope", L("งบดำเนินงานเพิ่มขึ้นต่อปี (เงินเฟ้อ)", "Operating growth a year (inflation)")], ["ceil", L("กรอบวงเงินของกรมเพิ่มขึ้นต่อปี", "Department ceiling growth a year")]].map(([k, l]) =>
          `<label class="field-inline" for="fw-${k}" style="justify-content:space-between"><span>${l}</span><span><input type="number" id="fw-${k}" data-fw="${k}" min="-10" max="20" step="0.5" value="${a[k]}" ${pl ? "" : "disabled"} style="width:76px"> %</span></label>`).join("")}
        <p class="sub" style="margin:0">${L("ภาระผูกพันหลายปีมาจากแท็บผูกพันหลายปีของคำขอ M02 · โครงการใหม่กระจายวงเงินตามจำนวนปีในคลังโครงการ M01", "Multi-year commitments come from the M02 Multi-year tab; new ideas are spread over their years from the M01 project bank")}</p></div></section>
  </div>
  <section class="panel"><header><h2>${L("ตารางประมาณการ", "Estimates table")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รายการ (ล้านบาท)", "Line (M baht)")}</th>${FWD_Y.map(y => `<th class="n">${y}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr><td><i class="${r.c} lg"></i>${tx(r.name)}</td>${r.v.map(v => `<td class="n">${fmt(v, 1)}</td>`).join("")}</tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวมรายจ่าย", "Total spending")}</td>${total.map(v => `<td class="n">${fmt(v, 1)}</td>`).join("")}</tr>
        <tr><td>${L("กรอบวงเงินคาดการณ์", "Expected ceiling")}</td>${ceil.map(v => `<td class="n">${fmt(v, 1)}</td>`).join("")}</tr>
        <tr><td>${L("พื้นที่การคลังคงเหลือ (+) / ส่วนขาด (−)", "Fiscal space (+) / shortfall (−)")}</td>${ceil.map((c, n) => { const d = c - total[n]; return `<td class="n" style="color:var(--${d < 0 ? "bad" : "accent"})">${d >= 0 ? "+" : "−"}${fmt(Math.abs(d), 1)}</td>`; }).join("")}</tr></tfoot></table></div>
    <div class="body sub">${L("ใช้ประกอบการจัดทำงบประมาณรายจ่ายล่วงหน้าระยะปานกลางที่ส่งสำนักงบประมาณ", "Supports the medium-term expenditure estimates sent to the Budget Bureau")}</div></section>`;
};
CONS_BIND.forward = () => {
  $$("[data-fw]").forEach(inp => (inp.onchange = () => {
    S.fwd = S.fwd || { per: 3, ope: 2, ceil: 3 };
    const old = S.fwd[inp.dataset.fw]; S.fwd[inp.dataset.fw] = Number(inp.value);
    audit(["ปรับสมมติฐานประมาณการล่วงหน้า", "Changed a forward-estimate assumption"], `${inp.dataset.fw}: ${old}% → ${inp.value}%`); commit(); route();
  }));
};
