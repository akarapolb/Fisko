// M02 request form tabs (round 2): multi-year split, equipment detail, payroll estimate, versions.
let REQ_TAB = "main", VER_A = null, VER_B = null;
const nameKey = n => (Array.isArray(n) ? n[0] : n || "").trim();
function reqTabsBar(r) {
  const t = [["main", L("รายการและเหตุผล", "Lines and justification")], ["years", L("ผูกพันหลายปี", "Multi-year")]];
  if (r.items.some(i => i.type === "inv")) t.push(["equip", L("ครุภัณฑ์ / สิ่งก่อสร้าง", "Equipment & construction")]);
  if (r.items.some(i => i.type === "per") || r.payroll) t.push(["payroll", L("ประมาณการงบบุคลากร", "Payroll estimate")]);
  t.push(["versions", `${L("เวอร์ชัน", "Versions")} (${r.versions.length})`]);
  if (!t.find(x => x[0] === REQ_TAB)) REQ_TAB = "main";
  return `<div class="tabs" role="tablist">${t.map(([id, l]) => `<button class="tab ${id === REQ_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === REQ_TAB}" data-rtab="${id}">${l}</button>`).join("")}</div>`;
}
// Record a new version when the budget lines changed since the last one (or always, when forced).
function snapshot(r, note, force) {
  const last = r.versions[r.versions.length - 1], items = JSON.parse(JSON.stringify(r.items));
  if (!force && last && JSON.stringify(last.items) === JSON.stringify(items)) return 0;
  const v = (last ? last.v : 0) + 1;
  r.versions.push({ v, t: nowIso(), by: me().id, note, items, amount: reqAmount(r) });
  VER_A = VER_B = null;
  return v;
}

const REQ_PANELS = {}, REQ_BIND = {};

// ---- multi-year ----
REQ_PANELS.years = (r, ed) => {
  if (!r.multi) return `<section class="panel"><div class="body" style="display:flex;flex-direction:column;gap:10px">
      <b>${L("คำขอนี้เป็นงบประมาณปีเดียว", "This is a single-year request")}</b>
      <span class="sub">${L("ใช้เมื่อโครงการต้องก่อหนี้ผูกพันข้ามปีงบประมาณ เช่น งานก่อสร้างหรือระบบที่ส่งมอบหลายงวด", "Use this when the project commits funds across fiscal years, such as construction or systems delivered in several instalments")}</span>
      ${ed ? `<div><button class="btn primary" type="button" id="make-multi">${L("เปลี่ยนเป็นคำขอผูกพันหลายปี", "Make it a multi-year request")}</button></div>` : ""}</div></section>`;
  const yrs = Object.keys(r.years).sort(), sum = yrs.reduce((s, y) => s + Number(r.years[y] || 0), 0), diff = r.amount - sum, ds = ed ? "" : "disabled";
  const ok = Math.abs(diff) < 1;
  return `<section class="panel"><header><h2>${L("แบ่งวงเงินตามปีงบประมาณ", "Amount by fiscal year")}</h2><span class="sp"></span>${tag(ok ? L("ผลรวมตรงกับวงเงินรวม", "Adds up to the total") : `${L("ต่าง", "Off by")} ${fmt(diff)}`, ok ? "p-ok" : "p-bad")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ปีงบประมาณ", "Fiscal year")}</th><th class="n" style="width:200px">${L("วงเงิน (บาท)", "Amount (baht)")}</th><th class="n">${L("สัดส่วน", "Share")}</th><th></th></tr></thead>
      <tbody>${yrs.map(y => `<tr><td><b>${y}</b> <span class="sub">${y === "2571" ? L("ปีที่ขอ", "request year") : L("ผูกพันปีถัดไป", "future commitment")}</span></td>
        <td class="n"><input type="number" min="0" step="1000" data-yr="${y}" value="${r.years[y]}" ${ds} aria-label="${y}"></td><td class="n">${fmt(r.amount ? Number(r.years[y]) / r.amount * 100 : 0, 1)}%</td>
        <td>${ed && y !== "2571" ? `<button class="btn ghost danger" type="button" data-rmyr="${y}" aria-label="${L("ลบปี", "Remove year")} ${y}" style="padding:4px 8px">×</button>` : ""}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(sum)}</td><td class="n">${L("วงเงินรวม", "Request total")} ${fmt(r.amount)}</td><td></td></tr></tfoot></table></div>
    <div class="body row">${ed && yrs.length < 4 ? `<button class="btn" type="button" id="add-yr">+ ${L("เพิ่มปี", "Add year")} ${Number(yrs[yrs.length - 1]) + 1}</button>` : ""}
      ${ed ? `<button class="btn" type="button" id="fill-yr">${L("ใส่ส่วนที่เหลือในปีสุดท้าย", "Put the remainder in the last year")}</button>` : ""}
      <span class="sub">${L("วงเงินปีถัดไปต้องได้รับอนุมัติก่อหนี้ผูกพันข้ามปีตามระเบียบ", "Future-year amounts need approval to commit funds across years")}</span></div></section>`;
};
REQ_BIND.years = r => {
  const re = () => { commit(); route(); };
  const mm = $("#make-multi"); if (mm) mm.onclick = () => { r.multi = true; r.years = { 2571: r.amount, 2572: 0 }; audit(["เปลี่ยนเป็นคำขอผูกพันหลายปี", "Made the request multi-year"], r.id); re(); };
  $$("[data-yr]").forEach(inp => (inp.onchange = () => { r.years[inp.dataset.yr] = Number(inp.value); re(); }));
  $$("[data-rmyr]").forEach(b => (b.onclick = () => { delete r.years[b.dataset.rmyr]; re(); }));
  const ay = $("#add-yr"); if (ay) ay.onclick = () => { const ys = Object.keys(r.years).sort(); r.years[Number(ys[ys.length - 1]) + 1] = 0; re(); };
  const fy = $("#fill-yr"); if (fy) fy.onclick = () => {
    const ys = Object.keys(r.years).sort(), last = ys[ys.length - 1];
    const others = ys.slice(0, -1).reduce((s, y) => s + Number(r.years[y] || 0), 0);
    r.years[last] = Math.max(0, r.amount - others); re();
  };
};

// ---- equipment and construction ----
const KIND = { new: ["จัดหาใหม่", "New"], replace: ["ทดแทนของเดิม", "Replacement"], add: ["เพิ่มเติมจากที่มี", "Additional"] };
REQ_PANELS.equip = (r, ed) => {
  const ds = ed ? "" : "disabled";
  return `<section class="panel"><header><h2>${L("รายละเอียดครุภัณฑ์และสิ่งก่อสร้าง", "Equipment and construction detail")}</h2><span class="sp"></span><span class="sub">${L("ใช้จัดทำแบบรายละเอียดประกอบคำขอ", "Feeds the detail forms attached to the request")}</span></header>
    <div class="body" style="display:flex;flex-direction:column;gap:14px">${r.items.map((it, i) => it.type !== "inv" ? "" : `
      <div class="card-line">
        <div class="row" style="justify-content:space-between"><b>${esc(tx(it.name))}</b><span class="sub">${fmt(it.qty)} ${esc(tx(it.unitName))} × ${fmt(it.price)} = <b class="num">${fmt(itemTotal(it))}</b> ${L("บาท", "baht")}</span></div>
        <div class="form-grid eq-grid">
          <div class="f"><label for="eq-k-${i}">${L("ลักษณะการจัดหา", "Type of purchase")}</label><select id="eq-k-${i}" data-eq="${i}" data-f="kind" ${ds}>${Object.keys(KIND).map(k => `<option value="${k}" ${it.detail.kind === k ? "selected" : ""}>${tx(KIND[k])}</option>`).join("")}</select></div>
          <div class="f"><label for="eq-q-${i}">${L("จำนวนที่มีอยู่เดิม", "Quantity already held")}</label><input type="number" min="0" id="eq-q-${i}" data-eq="${i}" data-f="qtyOld" value="${it.detail.qtyOld}" ${ds}></div>
          <div class="f"><label for="eq-a-${i}">${L("อายุการใช้งานของเดิม (ปี)", "Age of existing items (years)")}</label><input type="number" min="0" id="eq-a-${i}" data-eq="${i}" data-f="age" value="${it.detail.age}" ${ds}></div>
          <div class="f full"><label for="eq-s-${i}">${L("คุณลักษณะโดยย่อ", "Short specification")}</label><input type="text" id="eq-s-${i}" data-eq="${i}" data-f="spec" value="${esc(it.detail.spec)}" ${ds} placeholder="${L("เช่น CPU 8 คอร์ หน่วยความจำ 16 GB หรือพื้นที่ก่อสร้าง", "e.g. 8-core CPU, 16 GB memory, or the construction floor area")}"></div>
        </div>
        ${it.detail.kind === "replace" && Number(it.detail.age) > 0 && Number(it.detail.age) < 5 ? `<div class="sub" style="color:var(--warn)">${L("ของเดิมอายุไม่ถึง 5 ปี ควรอธิบายเหตุผลการทดแทน", "Existing items are under 5 years old. Explain why they need replacing.")}</div>` : ""}
      </div>`).join("")}</div></section>`;
};
REQ_BIND.equip = r => {
  $$("[data-eq]").forEach(el => (el.onchange = () => {
    const it = r.items[el.dataset.eq], f = el.dataset.f;
    it.detail[f] = el.type === "number" ? Number(el.value) : el.value;
    save();
    if (f === "kind" || f === "age") route(); else renderChecks();
  }));
};

// ---- payroll estimate ----
REQ_PANELS.payroll = (r, ed) => {
  const p = r.payroll || (r.payroll = { raise: 3, rows: [{ type: ["ข้าราชการ", "Civil servants"], count: 0, avg: 0 }] });
  const month = p.rows.reduce((s, x) => s + x.count * x.avg, 0), year = month * 12 * (1 + p.raise / 100);
  const cur = r.items.filter(i => i.type === "per").reduce((s, i) => s + itemTotal(i), 0), canEdit = ed || ROLE === "plan" || ROLE === "fin";
  const off = Math.abs(year - cur) / Math.max(cur, 1) > 0.02;
  return `<section class="panel"><header><h2>${L("ประมาณการงบบุคลากรจากอัตรากำลัง", "Payroll estimate from staffing")}</h2><span class="sp"></span><span class="sub">${L("อัตรากำลังนำเข้าจาก HR / Payroll (IF-05)", "Staffing imported from HR / Payroll (IF-05)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ประเภทบุคลากร", "Staff type")}</th><th class="n" style="width:130px">${L("อัตรา", "Positions")}</th><th class="n" style="width:160px">${L("เงินเดือนเฉลี่ย/เดือน", "Avg monthly pay")}</th><th class="n">${L("รวมต่อเดือน", "Monthly total")}</th></tr></thead>
      <tbody>${p.rows.map((x, i) => `<tr><td>${esc(tx(x.type))}</td><td class="n"><input type="number" min="0" data-pr="${i}" data-f="count" value="${x.count}" ${canEdit ? "" : "disabled"} aria-label="${L("อัตรา", "Positions")} ${esc(tx(x.type))}"></td>
        <td class="n"><input type="number" min="0" step="100" data-pr="${i}" data-f="avg" value="${x.avg}" ${canEdit ? "" : "disabled"} aria-label="${L("เงินเดือนเฉลี่ย", "Average pay")} ${esc(tx(x.type))}"></td><td class="n">${fmt(x.count * x.avg)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")} ${fmt(p.rows.reduce((s, x) => s + x.count, 0))} ${L("อัตรา", "positions")}</td><td></td><td></td><td class="n">${fmt(month)}</td></tr></tfoot></table></div>
    <div class="body" style="display:flex;flex-direction:column;gap:12px">
      <label class="field-inline" for="raise">${L("ปรับเงินเดือนประจำปี", "Annual pay rise")} <input type="number" min="0" step="0.5" id="raise" value="${p.raise}" ${canEdit ? "" : "disabled"} style="width:80px"> %</label>
      <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="kpi"><span class="l">${L("ประมาณการทั้งปี", "Estimated year")}</span><span class="v">${mb(year)}<small>${L("ลบ.", "M")}</small></span><span class="d sub">${L("รวมต่อเดือน × 12 × (1 + ปรับเงินเดือน)", "Monthly × 12 × (1 + pay rise)")}</span></div>
        <div class="kpi"><span class="l">${L("วงเงินในคำขอ", "In the request")}</span><span class="v">${mb(cur)}<small>${L("ลบ.", "M")}</small></span></div>
        <div class="kpi"><span class="l">${L("ผลต่าง", "Difference")}</span><span class="v" style="color:var(--${off ? "warn" : "accent"})">${year - cur >= 0 ? "+" : ""}${mb(year - cur)}<small>${L("ลบ.", "M")}</small></span></div>
      </div>
      ${ed ? `<div><button class="btn primary" type="button" id="apply-pay">${L("นำประมาณการไปใช้กับรายการงบบุคลากร", "Use this estimate for the personnel line")}</button></div>`
        : `<span class="sub">${canEdit ? L("ใช้จำลองตัวเลขได้ การนำไปใช้กับคำขอทำได้เฉพาะผู้จัดทำขณะเป็นร่าง", "You can model figures here. Only the requester can apply them while the request is a draft.") : L("ดูอย่างเดียว", "View only")}</span>`}
    </div></section>`;
};
REQ_BIND.payroll = r => {
  $$("[data-pr]").forEach(inp => (inp.onchange = () => { r.payroll.rows[inp.dataset.pr][inp.dataset.f] = Number(inp.value); save(); route(); }));
  const rs = $("#raise"); if (rs) rs.onchange = () => { r.payroll.raise = Number(rs.value); save(); route(); };
  const ap = $("#apply-pay"); if (ap) ap.onclick = () => {
    const p = r.payroll, year = Math.round(p.rows.reduce((s, x) => s + x.count * x.avg, 0) * 12 * (1 + p.raise / 100));
    const line = r.items.find(i => i.type === "per");
    if (line) { line.qty = 1; line.price = year; } else r.items.push({ type: "per", name: L("เงินเดือนและค่าจ้างประจำ", "Salaries and wages"), qty: 1, unitName: L("ปี", "year"), price: year });
    r.amount = reqAmount(r);
    audit(["นำประมาณการงบบุคลากรไปใช้", "Applied the payroll estimate"], `${r.id}: ${fmt(year)}`); commit(); route(); toast(L("ปรับรายการงบบุคลากรแล้ว", "Personnel line updated"));
  };
};

// ---- versions ----
function diffItems(a, b) {
  const key = i => i.type + "|" + nameKey(i.name);
  const ma = new Map(a.items.map(i => [key(i), i])), mbm = new Map(b.items.map(i => [key(i), i]));
  const rows = [];
  b.items.forEach(i => { const o = ma.get(key(i)); rows.push({ s: !o ? "add" : (o.qty !== i.qty || o.price !== i.price) ? "chg" : "same", o, n: i }); });
  a.items.forEach(i => { if (!mbm.has(key(i))) rows.push({ s: "del", o: i, n: null }); });
  return rows;
}
REQ_PANELS.versions = r => {
  const V = r.versions, n = V.length;
  if (VER_A == null || VER_A >= n || (VER_A === VER_B && n > 1)) VER_A = Math.max(0, n - 2);
  if (VER_B == null || VER_B >= n || VER_A === VER_B) VER_B = n - 1;
  const a = V[VER_A], b = V[VER_B], rows = diffItems(a, b), d = b.amount - a.amount;
  const LBL = { add: [L("เพิ่ม", "Added"), "p-ok"], del: [L("ลบ", "Removed"), "p-bad"], chg: [L("เปลี่ยน", "Changed"), "p-warn"], same: [L("คงเดิม", "Same"), "p-mute"] };
  const sel = (id, cur) => `<select id="${id}" aria-label="${L("เวอร์ชัน", "Version")}">${V.map((v, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>v${v.v} · ${fdate(v.t)}</option>`).join("")}</select>`;
  return `<section class="panel"><header><h2>${L("ประวัติเวอร์ชัน", "Version history")}</h2><span class="sp"></span><span class="sub">${L("ทุกเวอร์ชันเก็บไว้ ไม่เขียนทับ", "Every version is kept; nothing is overwritten")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เวอร์ชัน", "Version")}</th><th>${L("วันที่", "Date")}</th><th>${L("โดย", "By")}</th><th>${L("บันทึก", "Note")}</th><th class="n">${L("วงเงิน (บาท)", "Amount (baht)")}</th></tr></thead>
      <tbody>${V.slice().reverse().map(v => `<tr><td><b>v${v.v}</b></td><td class="sub">${fdate(v.t, true)}</td><td>${esc(userName(v.by))}</td><td>${esc(tx(v.note))}</td><td class="n">${fmt(v.amount)}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("เปรียบเทียบเวอร์ชัน", "Compare versions")}</h2><span class="sp"></span>${sel("ver-a", VER_A)}<span class="sub">→</span>${sel("ver-b", VER_B)}</header>
    <div class="body"><div class="row"><span>${L("วงเงินเปลี่ยน", "Amount change")}</span><b class="num" style="color:var(--${d > 0 ? "warn" : d < 0 ? "accent" : "ink"})">${d >= 0 ? "+" : ""}${fmt(d)} ${L("บาท", "baht")}</b>
      <span class="sub">(${fmt(a.amount)} → ${fmt(b.amount)})</span></div></div>
    <div class="tbl-wrap"><table class="vdiff"><thead><tr><th>${L("สถานะ", "Change")}</th><th>${L("รายการ", "Line")}</th><th class="n">${L("จำนวน", "Qty")}</th><th class="n">${L("ราคาต่อหน่วย", "Unit price")}</th><th class="n">${L("รวม", "Total")}</th></tr></thead>
      <tbody>${rows.map(x => { const it = x.n || x.o, cls = x.s === "same" ? "" : x.s;
        const cell = (k, f) => x.s === "chg" && x.o[k] !== x.n[k] ? `<span class="sub" style="text-decoration:line-through">${f(x.o[k])}</span> ${f(x.n[k])}` : f(it[k]);
        return `<tr><td class="${cls}">${tag(LBL[x.s][0], LBL[x.s][1])}</td><td class="${cls}">${esc(tx(it.name))}</td>
          <td class="n ${cls}">${cell("qty", v => fmt(v))}</td><td class="n ${cls}">${cell("price", v => fmt(v))}</td><td class="n ${cls}">${fmt(itemTotal(it))}</td></tr>`; }).join("")}</tbody></table></div></section>`;
};
REQ_BIND.versions = () => {
  $("#ver-a").onchange = e => { VER_A = Number(e.target.value); route(); };
  $("#ver-b").onchange = e => { VER_B = Number(e.target.value); route(); };
};
