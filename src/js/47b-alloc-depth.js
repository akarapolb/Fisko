// M06 deeper features (round 9): quarterly allotment releases requested by Finance, and carry-over of
// committed funds into the next fiscal year (with contract evidence and deadline checks).
ALLOC_TABS.push({ id: "releases", label: ["งวดเงิน", "Allotment releases"] }, { id: "carry", label: ["กันเงินเหลื่อมปี", "Carry-over"] });
// The quarter of the fiscal year being spent (1 to 4); round C4 moves it with the demo date.
let CUR_Q = 1;
const qPlan = (lines, n) => sumv(lines.map(l => sumv(l.plan.slice(n * 3, n * 3 + 3))));
const REL_ST = { approved: [["อนุมัติแล้ว", "Released"], "p-ok"], pending: [["รออนุมัติ", "Pending"], "p-warn"] };

ALLOC.releases = () => {
  const A = AL(), R = A.releases || [], ed = canAlloc() && !A.draft;
  const types = BUDGET_TYPES.filter(t => A.lines.some(l => l.type === t.id));
  const rel = (t, q, st) => sumv(R.filter(r => r.type === t && r.q === q && (!st || r.status === st)).map(r => r.amount));
  const relT = sumv(R.filter(r => r.status === "approved").map(r => r.amount));
  return `
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("วงเงินจัดสรรแล้ว", "Allocated")}</span><span class="v">${mb(allocated())}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi hl"><span class="l">${L("ได้รับอนุมัติงวดเงินแล้ว", "Released so far")}</span><span class="v">${mb(relT)}<small>${L("ลบ.", "M")}</small></span><span class="d" style="color:var(--rail-ink)">${fmt(allocated() ? relT / allocated() * 100 : 0, 1)}%</span></div>
    <div class="kpi"><span class="l">${L("คำของวดเงินรออนุมัติ", "Release requests pending")}</span><span class="v">${R.filter(r => r.status === "pending").length}</span></div>
  </section>
  <section class="panel"><header><h2>${L("แผนและการอนุมัติงวดเงินรายไตรมาส", "Quarterly plan and releases")} · ${fyLabel(ALLOC_FY)}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท · แผนจากแผนการใช้จ่ายรายเดือน", "M baht · plan from the monthly spending plan")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("งบรายจ่าย", "Budget type")}</th><th class="n">${L("ทั้งปี", "Year")}</th>${[1, 2, 3, 4].map(q => `<th class="n">${L("ไตรมาส", "Q")} ${q}${q === CUR_Q && ALLOC_FY === CUR_FY ? ` <span class="sub">(${L("ปัจจุบัน", "now")})</span>` : ""}</th>`).join("")}</tr></thead>
      <tbody>${types.map(t => { const ls = A.lines.filter(l => l.type === t.id);
        return `<tr><td>${typeName(t.id)}</td><td class="n">${mb(allocated(t.id))}</td>${[0, 1, 2, 3].map(n => { const ok = rel(t.id, n + 1, "approved"), pe = rel(t.id, n + 1, "pending");
          return `<td class="n">${mb(qPlan(ls, n))}<div>${ok ? tag(`${L("ได้รับ", "Released")} ${mb(ok)}`, "p-ok") : pe ? tag(`${L("รอ", "Pending")} ${mb(pe)}`, "p-warn") : `<span class="sub">${L("ยังไม่ขอ", "Not requested")}</span>`}</div></td>`; }).join("")}</tr>`; }).join("")}</tbody></table></div>
    ${ed ? `<div class="body"><form class="inline-form" id="rl-form">
      <div class="f" style="flex:0 1 120px"><label for="rl-q">${L("ไตรมาส", "Quarter")}</label><select id="rl-q">${[1, 2, 3, 4].map(q => `<option value="${q}" ${q === CUR_Q + 1 ? "selected" : ""} ${q > CUR_Q + 1 ? "disabled" : ""}>${q}</option>`).join("")}</select></div>
      <div class="f"><label for="rl-type">${L("งบรายจ่าย", "Budget type")}</label><select id="rl-type">${types.map(t => `<option value="${t.id}">${typeName(t.id)}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 150px"><label for="rl-amt">${L("วงเงิน (ลบ.)", "Amount (M)")}</label><input type="number" id="rl-amt" min="0.01" step="0.01" required></div>
      <button class="btn primary" type="submit">${L("ขออนุมัติงวดเงิน", "Request release")}</button></form>
      <p class="sub" id="rl-hint"></p></div>` : ""}</section>
  ${R.length ? `<section class="panel"><header><h2>${L("รายการขออนุมัติงวดเงิน", "Release requests")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ไตรมาส", "Quarter")}</th><th>${L("งบรายจ่าย", "Type")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th>${L("ยื่นเมื่อ", "Requested")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${R.slice().reverse().map(r => `<tr><td class="mono">${r.id}</td><td>${r.q}</td><td>${typeName(r.type)}</td><td class="n">${mb(r.amount)}</td><td class="sub">${fdate(r.t)}</td>
        <td>${tag(tx(REL_ST[r.status][0]), REL_ST[r.status][1])}${r.dt ? `<div class="sub">${fdate(r.dt)}</div>` : ""}</td>
        <td>${ed && r.status === "pending" ? `<button class="btn" type="button" data-rlok="${r.id}">${L("จำลอง: สำนักงบประมาณอนุมัติ", "Demo: Budget Bureau approves")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};
function bindReleases() {
  const A = AL(), f = $("#rl-form");
  $$("[data-rlok]").forEach(b => (b.onclick = () => {
    const r = A.releases.find(x => x.id === b.dataset.rlok); r.status = "approved"; r.dt = nowIso();
    audit(["บันทึกการอนุมัติงวดเงิน", "Recorded an allotment release"], `${r.id} · ${mb(r.amount)} M`);
    notify(["fin", "exec"], [`ได้รับอนุมัติงวดเงิน ${r.id} ${mb(r.amount)} ลบ.`, `Release ${r.id} of ${mb(r.amount)} M approved`], "alloc-releases");
    commit(); route(); toast(L("บันทึกการอนุมัติงวดเงินแล้ว", "Release recorded"));
  }));
  if (!f) return;
  const hint = () => {
    const q = Number($("#rl-q").value), t = $("#rl-type").value, ls = A.lines.filter(l => l.type === t);
    const used = sumv((A.releases || []).filter(r => r.type === t).map(r => r.amount)), left = allocated(t) - used;
    $("#rl-amt").value = (Math.min(qPlan(ls, q - 1), left) / 1e6).toFixed(2);
    $("#rl-hint").textContent = `${L("แผนไตรมาสนี้", "Plan this quarter")} ${mb(qPlan(ls, q - 1))} · ${L("ขอได้อีกไม่เกิน", "Room left")} ${mb(left)} ${L("ลบ.", "M")}`;
  };
  $("#rl-q").onchange = hint; $("#rl-type").onchange = hint; hint();
  f.onsubmit = e => {
    e.preventDefault();
    const q = Number($("#rl-q").value), t = $("#rl-type").value, amount = Math.round(Number($("#rl-amt").value) * 1e6);
    const used = sumv((A.releases || []).filter(r => r.type === t).map(r => r.amount)), left = allocated(t) - used;
    if (amount > left) { toast(L(`เกินวงเงินที่ยังไม่ได้ขอ (${mb(left)} ลบ.)`, `More than the room left (${mb(left)} M)`)); return; }
    A.releases = A.releases || [];
    const id = `RL-${ALLOC_FY}-${String(A.releases.length + 1).padStart(2, "0")}`;
    A.releases.push({ id, q, type: t, amount, status: "pending", t: nowIso(), by: me().id });
    audit(["ขออนุมัติงวดเงิน", "Requested an allotment release"], `${id} · Q${q} · ${typeName(t)} · ${mb(amount)} M`);
    commit(); route(); toast(L("ส่งคำขออนุมัติงวดเงินแล้ว", "Release requested"));
  };
}

// ---------- carry-over ----------
const FY_END = `${CUR_FY - 543}-09-30`;
const CF_ST = { open: [["อยู่ระหว่างเบิกจ่าย", "Being paid"], "p-info"], extension: [["ขอขยายเวลา", "Extension requested"], "p-warn"], extended: [["ขยายเวลาแล้ว", "Extended"], "p-ok"],
  closed: [["เบิกจ่ายครบ", "Fully paid"], "p-mute"], pending: [["รออนุมัติ", "Awaiting approval"], "p-warn"], approved: [["อนุมัติกันเงิน", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"] };
const cfChecks = c => [
  [!!(c.po || "").trim(), L("มีเลขที่สัญญา / ใบสั่งซื้อ", "Contract or PO number")],
  [!!c.poDate && c.poDate <= FY_END, L(`ลงนามสัญญาภายใน 30 ก.ย. ${CUR_FY}`, `Signed by 30 Sep ${CUR_FY - 543}`)],
  [c.amount > 0 && c.amount <= (lineOf(c.line) || { amount: 0 }).amount, L("ไม่เกินวงเงินของรายการ", "Within the line's amount")],
  [TODAY <= FY_END, L("ยื่นก่อนสิ้นปีงบประมาณ", "Filed before the fiscal year ends")],
];
ALLOC.carry = () => {
  if (ALLOC_FY !== CUR_FY) return `<section class="panel"><div class="body sub">${L(`การกันเงินเหลื่อมปีใช้กับปีงบประมาณที่กำลังใช้จ่าย (2570)`, `Carry-over applies to the year being spent (FY2570)`)}</div></section>`;
  const C = S.carry, fin = canAlloc(), ex = ROLE === "exec";
  const lines = AL().lines.filter(l => l.type === "inv" || l.type === "ope");
  return `
  <section class="panel"><header><h2>${L(`เงินกันเหลื่อมปีจากปี ${CUR_FY - 1}`, `Funds carried over from FY${CUR_FY - 1}`)}</h2><span class="sp"></span><span class="sub">${L(`ต้องเบิกจ่ายภายใน 31 มี.ค. 2570 หากไม่ขยายเวลา`, "Must be paid by 31 Mar 2027 unless extended")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Item")}</th><th>${L("สัญญา", "Contract")}</th><th class="n">${L("กันไว้ (ลบ.)", "Carried (M)")}</th><th style="width:150px">${L("เบิกจ่ายแล้ว", "Paid")}</th><th>${L("กำหนด", "Deadline")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${C.prev.map(c => { const p = c.amount ? c.paid / c.amount : 0, left = c.amount - c.paid;
        return `<tr><td class="mono">${c.id}</td><td>${esc(tx(c.name))}<div class="sub">${unitName(c.unit)}</div></td><td class="mono sub">${c.po}</td><td class="n">${mb(c.amount)}</td>
          <td><div class="bar"><i style="width:${p * 100}%"></i></div><span class="sub">${mb(c.paid)} · ${fmt(p * 100, 0)}%</span></td>
          <td>${dueText(c.due)}</td><td>${tag(tx(CF_ST[c.status][0]), CF_ST[c.status][1])}</td>
          <td><div class="row" style="flex-wrap:nowrap">${fin && left > 0 && c.status !== "closed" ? `<input type="number" min="0.01" step="0.01" id="cp-${c.id}" style="width:84px" aria-label="${L("เบิกจ่าย (ลบ.)", "Payment (M)")}" placeholder="${L("ลบ.", "M")}"><button class="btn" type="button" data-cpay="${c.id}">${L("บันทึกเบิกจ่าย", "Record payment")}</button>` : ""}
            ${fin && c.status === "open" && p < 0.5 ? `<button class="btn" type="button" data-cext="${c.id}">${L("ขอขยายเวลา", "Ask to extend")}</button>` : ""}
            ${ex && c.status === "extension" ? `<button class="btn primary" type="button" data-cextok="${c.id}">${L("อนุมัติขยายเวลา", "Approve extension")}</button>` : ""}${historyBtn(c.id, c.id)}</div></td></tr>`; }).join("")}</tbody></table></div></section>
  <section class="panel"><header><h2>${L(`ขอกันเงินปี ${CUR_FY} ไว้เบิกเหลื่อมปี`, `FY${CUR_FY} carry-over requests`)}</h2><span class="sp"></span><span class="sub">${L("ยื่นได้ถึง", "File by")} ${fdate(FY_END)} · ${daysUntil(FY_END)} ${L("วัน", "days")}</span></header>
    ${C.reqs.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Line")}</th><th>${L("สัญญา", "Contract")}</th><th class="n">${L("ขอกัน (ลบ.)", "Amount (M)")}</th><th>${L("ผลตรวจ", "Checks")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${C.reqs.map(c => { const l = lineOf(c.line), ch = cfChecks(c);
        return `<tr><td class="mono">${c.id}</td><td>${l ? esc(lineLabel(l)) : c.line}</td><td class="sub"><span class="mono">${esc(c.po)}</span> · ${fdate(c.poDate)}${c.vendor ? `<div>${esc(c.vendor)}</div>` : ""}</td><td class="n">${mb(c.amount)}</td>
          <td>${ch.every(x => x[0]) ? tag(L("ผ่านทุกข้อ", "All passed"), "p-ok") : ch.filter(x => !x[0]).map(x => tag(x[1], "p-bad")).join(" ")}</td><td>${tag(tx(CF_ST[c.status][0]), CF_ST[c.status][1])}</td>
          <td>${ex && c.status === "pending" ? `<div class="row" style="flex-wrap:nowrap"><button class="btn primary" type="button" data-cfok="${c.id}">${L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-cfno="${c.id}">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีคำขอกันเงิน", "No carry-over requests yet")}</div>`}
    ${fin ? `<div class="body"><form class="inline-form" id="cf-form">
      <div class="f" style="flex:2 1 260px"><label for="cf-line">${L("รายการจัดสรร", "Allocation line")}</label><select id="cf-line">${lines.map(l => `<option value="${l.id}">${esc(lineLabel(l))} · ${mb(l.amount)}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 120px"><label for="cf-amt">${L("ขอกัน (ลบ.)", "Amount (M)")}</label><input type="number" id="cf-amt" min="0.01" step="0.01" required></div>
      <div class="f" style="flex:0 1 150px"><label for="cf-po">${L("เลขที่สัญญา / PO", "Contract / PO no.")}</label><input type="text" id="cf-po" placeholder="PO-70-0001"></div>
      <div class="f" style="flex:0 1 160px"><label for="cf-date">${L("วันที่ลงนาม", "Signed on")}</label><input type="date" id="cf-date"></div>
      <div class="f" style="flex:1 1 160px"><label for="cf-vendor">${L("คู่สัญญา", "Supplier")}</label><input type="text" id="cf-vendor"></div>
      <button class="btn primary" type="submit">${L("ยื่นคำขอกันเงิน", "File request")}</button></form>
      <p class="sub">${L("ต้องมีสัญญาที่ลงนามภายในปีงบประมาณ และบันทึกในระบบ GFMIS ก่อนสิ้นปี", "Needs a contract signed within the fiscal year, recorded in GFMIS before year end")}</p></div>` : ""}</section>`;
};
function bindCarry() {
  const C = S.carry, cf = id => C.prev.find(c => c.id === id) || C.reqs.find(c => c.id === id);
  $$("[data-cpay]").forEach(b => (b.onclick = () => {
    const c = cf(b.dataset.cpay), v = Math.round(Number($("#cp-" + c.id).value) * 1e6);
    if (!(v > 0)) { toast(L("ใส่ยอดเบิกจ่ายก่อน", "Enter an amount first")); return; }
    c.paid = Math.min(c.amount, c.paid + v); if (c.paid >= c.amount) c.status = "closed";
    audit(["บันทึกเบิกจ่ายเงินกันเหลื่อมปี", "Recorded a carried-over payment"], `${c.id} · ${mb(v)} M`); commit(); route();
  }));
  $$("[data-cext]").forEach(b => (b.onclick = () => {
    const c = cf(b.dataset.cext); c.status = "extension";
    audit(["ขอขยายเวลาเบิกจ่ายเงินกันเหลื่อมปี", "Asked to extend a carry-over deadline"], c.id);
    notify(["exec"], [`ขอขยายเวลาเบิกจ่ายเงินกัน ${c.id} ถึง 30 ก.ย. ${CUR_FY}`, `Request to extend ${c.id} to 30 Sep ${CUR_FY - 543}`], "alloc-carry");
    commit(); route(); toast(L("ส่งคำขอขยายเวลาแล้ว", "Extension requested"));
  }));
  $$("[data-cextok]").forEach(b => (b.onclick = () => {
    const c = cf(b.dataset.cextok); c.status = "extended"; c.due = FY_END;
    audit(["อนุมัติขยายเวลาเบิกจ่ายเงินกันเหลื่อมปี", "Approved a carry-over extension"], c.id);
    notify(["fin"], [`อนุมัติขยายเวลา ${c.id} ถึง 30 ก.ย. ${CUR_FY}`, `${c.id} extended to 30 Sep ${CUR_FY - 543}`], "alloc-carry"); commit(); route();
  }));
  const dec = (id, ok) => {
    const c = cf(id); c.status = ok ? "approved" : "rejected";
    audit([ok ? "อนุมัติกันเงินไว้เบิกเหลื่อมปี" : "ไม่อนุมัติกันเงินเหลื่อมปี", ok ? "Approved a carry-over" : "Rejected a carry-over"], `${c.id} · ${mb(c.amount)} M`);
    notify(["fin"], [`${c.id} ${ok ? "อนุมัติแล้ว บันทึกใน GFMIS" : "ไม่อนุมัติ"}`, `${c.id} ${ok ? "approved; record it in GFMIS" : "was rejected"}`], "alloc-carry"); commit(); route();
  };
  $$("[data-cfok]").forEach(b => (b.onclick = () => dec(b.dataset.cfok, true)));
  $$("[data-cfno]").forEach(b => (b.onclick = () => dec(b.dataset.cfno, false)));
  const f = $("#cf-form");
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const c = { id: `CF-${CUR_FY}-${String(C.reqs.length + 1).padStart(2, "0")}`, line: $("#cf-line").value, amount: Math.round(Number($("#cf-amt").value) * 1e6), po: $("#cf-po").value.trim(), poDate: $("#cf-date").value, vendor: $("#cf-vendor").value.trim(), status: "pending", t: nowIso(), by: me().id };
    const bad = cfChecks(c).filter(x => !x[0]);
    if (bad.length) { toast(`${L("ยังยื่นไม่ได้", "Can't file yet")}: ${bad.map(x => x[1]).join(", ")}`); return; }
    C.reqs.push(c);
    audit(["ยื่นคำขอกันเงินไว้เบิกเหลื่อมปี", "Filed a carry-over request"], `${c.id} · ${c.po} · ${mb(c.amount)} M`);
    notify(["exec"], [`คำขอกันเงินเหลื่อมปี ${c.id} รออนุมัติ`, `Carry-over ${c.id} is waiting for approval`], "alloc-carry");
    commit(); route(); toast(L("ยื่นคำขอกันเงินแล้ว · รอผู้บริหารอนุมัติ", "Filed · waiting for executive approval"));
  };
}
{
  const base = BIND.allocation;
  BIND.allocation = () => { base(); if (ALLOC_TAB === "releases") bindReleases(); if (ALLOC_TAB === "carry") bindCarry(); };
}
