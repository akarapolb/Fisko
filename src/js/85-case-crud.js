// Procurement CRUD round PC2 (Fisko_Procurement_CRUD_Design.html chapter 6.3): P4 case files on the shared list +
// drawer. The case file itself stays a full page (UI-PC1); inside it the market research, committees, bids and
// quotations become small lists whose rows can be edited and deleted until the next step uses them (R-PC-03).
// Reruns and cancellations keep the old round in c.rounds (caseArchive, 61-cases.js) and start clean (PC-P2).
Object.assign(CASE_EV, { tor_off: ["ถอด TOR", "TOR detached"], award_off: ["ถอนผลการพิจารณา", "Award withdrawn"], committee_off: ["ยกเลิกคำสั่งแต่งตั้ง", "Committee order cancelled"],
  coi_redo: ["แจ้งผลประโยชน์ทับซ้อนใหม่", "Declaration redone"], bid_edit: ["แก้ไขข้อเสนอ", "Bid corrected"], bid_del: ["ลบข้อเสนอ", "Bid removed"], market_del: ["ลบรายการสำรวจตลาด", "Market entry removed"], quote_del: ["ลบใบเสนอราคา", "Quotation removed"] });
const csCase = () => (CASE_OPEN ? caseOf(CASE_OPEN) : null);
const csScored = c => Object.values(c.scores || {}).some(u => Object.values(u || {}).some(b => Object.values(b || {}).some(v => v != null)));
// Rows get a stable id the first time they are listed, so the drawer can find them after others are deleted.
const csIds = (arr, pre) => { arr.forEach(x => { if (!x.id) x.id = pre + (maxNo(arr.map(y => y.id || ""), new RegExp(`^${pre}(\\d+)`)) + 1); }); return arr; };
const csVendors = () => (S.vendors || []).filter(v => !((S.blacklist && S.blacklist.rows) || []).some(b => b.name === v.name || b.taxId === v.taxId));
const csDel = (what, run) => ({ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: what, run });

// ---------- P4 the case list (FR-PC-08) ----------
const csGroup = c => { const n = caseState(c); return n === 0 ? "cancel" : n <= 4 ? "early" : n <= 7 ? "source" : "contract"; };
const CS_ST = Object.fromEntries(CASE_STATES.map((s, i) => (s ? [String(i), [[s.th, s.en], i >= 9 ? "p-ok" : i >= 5 ? "p-info" : "p-mute"]] : ["0", [["ยกเลิก", "Cancelled"], "p-mute"]])));
CRUD.def("pcCase", {
  noun: ["แฟ้มจัดซื้อ", "Case file"], st: CS_ST, list: () => S.cases, id: c => c.id, title: c => caseName(c),
  sub: c => `${esc(lineLabel(famLine(c.line)))} · ${tx(KINDS[c.kind])}${c.method ? " · " + tx(PMETHOD[c.method]) : ""}`,
  status: c => String(caseState(c)), gone: c => !!c.cancelled, search: c => `${c.id} ${c.plan} ${caseName(c)} ${c.egp && c.egp.no || ""}`,
  filters: [{ id: "g", label: ["กลุ่ม", "Group"], opts: () => GROUPS_CASE.filter(g => g[0]).map(([k, f]) => [k, f(L)]), get: csGroup },
    { id: "unit", label: ["หน่วยงาน", "Unit"], opts: () => S.units.map(u => [u.id, tx(u.name)]), get: c => famLine(c.line).unit }],
  cols: [{ h: ["แฟ้ม", "Case"], c: c => `<span class="mono">${c.id}</span>` },
    { h: ["รายการ", "Item"], c: c => { const rq = caseReq(c); return `<b style="font-weight:600">${esc(caseName(c))}</b><div class="sub">${esc(lineLabel(famLine(c.line)))} · ${mb(rq ? rq.amount : famPlan(c.plan).est)} ${L("ลบ.", "M")}</div>`; } },
    { h: ["วิธี", "Method"], c: c => `<span class="sub">${c.method ? tx(PMETHOD[c.method]) : "—"}</span>` },
    { h: ["ต้องทำต่อ", "What's next"], c: c => { const nx = caseNext(c); return `${whoTag(nx.who)} <span class="sub">${esc(nx.raw ? nx.th : L(nx.th, nx.en))}</span>`; } },
    { h: ["e-GP", "e-GP"], c: c => (c.egp && c.egp.no ? `<span class="mono sub">${esc(c.egp.no)}</span>` : "—") }],
  acts: c => {
    const n = caseState(c), out = [];
    if (!isProcRole() || c.cancelled) return out;
    if (n >= 4 && n <= 7) out.push({ id: "fail", label: L("ล้มแล้วเริ่มใหม่", "Failed, rerun"), why: true, impact: () => L("กลับไปขั้นจัดทำ TOR ข้อเสนอ คะแนน ผลพิจารณา และประกาศ e-GP ของรอบนี้ย้ายไปเก็บเป็นประวัติรอบ", "Back to specifying; this round's e-GP notice, bids, scores and award move to the round history"),
      run: (_, why) => { caseFail(c, why); audit(["แฟ้มล้มเหลว ดำเนินการใหม่", "A case failed and restarts"], `${c.id} · ${why}`); return L("กลับไปขั้นจัดทำ TOR แล้ว", "Back to specifying"); } });
    if (n === 7 && c.award && !c.appealElapsed && !(c.appeal && c.appeal.status === "open") && ROLE === "prochead") out.push({ id: "unaward", label: L("ถอนผลการพิจารณา", "Withdraw the award"), kind: "danger", why: true,
      impact: () => L("กลับไปขั้นพิจารณาผล คะแนนของกรรมการยังอยู่", "Back to evaluation; the members' scores stay"), run: (_, why) => {
        const aw = c.award; c.award = null; setState(c, 6, "award_off", `${tx(aw.winner)} · ${why}`); audit(["ถอนผลการพิจารณา", "Withdrew an award"], `${c.id} · ${why}`); return L("ถอนผลแล้ว", "Award withdrawn"); } });
    if (n >= 2 && n <= 8) out.push({ id: "cancel", label: L("ยกเลิกการจัดซื้อ", "Cancel procurement"), kind: "danger", why: true, impact: () => L("ใบขอถูกยกเลิก คืนวงเงินที่จอง ขอใหม่แล้วเริ่มจากขั้นขอซื้อโดยไม่มีวิธีและราคากลางเดิม", "The requisition is cancelled and the reservation released; a new requisition starts without the old method and reference price"),
      run: (_, why) => { caseCancel(c, why); audit(["ยกเลิกการจัดซื้อ", "Cancelled a procurement"], `${c.id} · ${why}`); return L("ยกเลิกแล้ว", "Cancelled"); } });
    return out;
  },
  view: c => {
    const chk = caseState(c) >= 3 && caseState(c) <= 8 ? caseChecks(c) : [], rq = caseReq(c), con = caseCon(c);
    return kv([[L("ขั้นตอน", "Step"), `${caseState(c)} · ${caseStTag(c)}`], [L("รายการในแผน", "Plan item"), `<span class="mono">${c.plan}</span>`], rq && [L("ใบขอ", "Requisition"), `<span class="mono">${rq.id}</span> ${stTag(REQ_ST, rq.status)} · ${mb(rq.amount)} ${L("ลบ.", "M")}`],
      c.ref && [L("ราคากลาง", "Reference price"), `${fmt(c.ref.amount)} ${L("บาท", "baht")}`], c.egp && c.egp.no && [L("e-GP", "e-GP"), `<span class="mono">${esc(c.egp.no)}</span> · ${L("ปิดรับ", "closes")} ${fdate(c.egp.close)}`],
      c.award && [L("ผู้ชนะ", "Winner"), `${esc(tx(c.award.winner))} · ${fmt(c.award.price)} ${L("บาท", "baht")} · ${fdate(c.award.date)}`], con && [L("สัญญา", "Contract"), `<span class="mono">${con.id}</span>`],
      c.cancelled && [L("ยกเลิกเพราะ", "Cancelled because"), esc(c.cancelled.why)], (c.rounds || []).length && [L("รอบก่อนหน้า", "Earlier rounds"), `${c.rounds.length}`]])
      + (chk.length ? `<ul class="check">${chk.map(x => `<li><span class="m ${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "×"}</span><div>${esc(x.label)}</div></li>`).join("")}</ul>` : "")
      + `<div class="row"><button class="btn primary" type="button" data-copen="${c.id}">${L("เปิดแฟ้ม", "Open the case")}</button></div>`;
  },
  tabs: c => ((c.rounds || []).length ? [["rounds", L("รอบก่อนหน้า", "Earlier rounds"), `<div class="tbl-wrap"><table><thead><tr><th>${L("รอบ", "Round")}</th><th>${L("ผล", "Outcome")}</th><th>${L("เหตุผล", "Why")}</th><th class="n">${L("ข้อเสนอ", "Bids")}</th><th>${L("ผู้ชนะเดิม", "Earlier winner")}</th></tr></thead><tbody>${c.rounds.map(r => `<tr><td>${r.n}</td><td>${r.kind === "failed" ? L("ล้ม", "Failed") : L("ยกเลิก", "Cancelled")}<div class="sub">${fdate(r.t, true)} · ${esc(userName(r.by))}</div></td><td class="sub">${esc(r.why)}</td><td class="n">${r.bids.length || r.quotes.length}</td><td class="sub">${r.award ? `${esc(tx(r.award.winner))} · ${fmt(r.award.price)}` : "—"}</td></tr>`).join("")}</tbody></table></div>`]] : []),
  hist: c => c.id,
});

// ---------- market research rows (FR-PC-10) ----------
const csMktEd = c => !!c && canEditCase(c) && caseState(c) >= 3 && caseState(c) <= 4;
CRUD.def("csMkt", {
  noun: ["การสำรวจตลาด", "Market research entry"], list: () => { const c = csCase(); return c ? csIds(c.market = c.market || [], "M") : []; },
  id: m => m.id, title: m => m.vendor, sub: m => `${fmt(m.price)} ${L("บาท", "baht")} · ${tx(MR_SRC[m.src] || ["–", "–"])}`,
  cols: [{ h: ["ผู้ขาย", "Supplier"], c: m => esc(m.vendor) }, { h: ["ราคา (บาท)", "Price (baht)"], n: true, c: m => fmt(m.price) }, { h: ["แหล่ง", "Source"], c: m => `<span class="sub">${tx(MR_SRC[m.src] || ["–", "–"])}</span>` },
    { h: ["วันที่", "Date"], c: m => `<span class="sub">${fdate(m.date)}</span>` }, { h: ["หมายเหตุ", "Note"], c: m => `<span class="sub">${esc(m.note || "")}</span>` }],
  fields: m => [{ id: "vendor", label: ["ผู้ขาย", "Supplier"], req: true, wide: true, value: m ? m.vendor : "" }, { id: "price", label: ["ราคา (บาท)", "Price (baht)"], type: "number", req: true, min: 1, value: m ? m.price : "" },
    { id: "src", label: ["แหล่ง", "Source"], type: "select", req: true, value: m ? m.src : "phone", opts: Object.keys(MR_SRC).map(k => [k, tx(MR_SRC[k])]) }, { id: "date", label: ["วันที่", "Date"], type: "date", req: true, max: TODAY, value: m ? m.date : TODAY },
    { id: "note", label: ["หมายเหตุ", "Note"], wide: true, value: m ? m.note || "" : "" }],
  check: v => (v.price > 0 ? [] : [{ f: "price", m: L("ใส่ราคา", "Enter a price") }]),
  create: { can: () => csMktEd(csCase()), label: ["เพิ่มการสำรวจ", "Add an entry"], run: v => { const c = csCase(), m = { vendor: v.vendor, price: Math.round(v.price), src: v.src, date: v.date, note: v.note, by: me().id }; c.market.push(m); csIds(c.market, "M"); caseLog(c, "market", `${m.vendor} · ${fmt(m.price)}`); return m; } },
  edit: { can: () => csMktEd(csCase()), run: (m, v) => { const c = csCase(); Object.assign(m, { vendor: v.vendor, price: Math.round(v.price), src: v.src, date: v.date, note: v.note }); caseLog(c, "market", `${m.vendor} · ${fmt(m.price)}`); } },
  acts: m => (csMktEd(csCase()) ? [csDel(L("ลบรายการสำรวจนี้", "Delete this entry"), () => { const c = csCase(); c.market = c.market.filter(x => x !== m); caseLog(c, "market_del", m.vendor); return L("ลบแล้ว", "Deleted"); })] : []),
  view: m => kv([[L("ราคา", "Price"), `${fmt(m.price)} ${L("บาท", "baht")}`], [L("แหล่ง", "Source"), tx(MR_SRC[m.src] || ["–", "–"])], [L("วันที่", "Date"), fdate(m.date)], m.note && [L("หมายเหตุ", "Note"), esc(m.note)], m.by && [L("บันทึกโดย", "Recorded by"), esc(userName(m.by))]]),
  hist: m => (csCase() ? csCase().id : m.id),
});

// ---------- bids (FR-PC-16, SIM-PC-03) ----------
const csBidEd = c => !!c && canEditCase(c) && caseState(c) === 6 && !csScored(c);
CRUD.def("csBid", {
  noun: ["ข้อเสนอ", "Bid"], list: () => { const c = csCase(); return c ? csIds(c.bids = c.bids || [], "B") : []; }, id: b => b.id, title: b => b.name, sub: b => `${fmt(b.price)} ${L("บาท", "baht")}`,
  cols: [{ h: ["ผู้ยื่น", "Bidder"], c: b => esc(b.name) }, { h: ["ราคาที่เสนอ (บาท)", "Price offered (baht)"], n: true, c: b => fmt(b.price) },
    { h: ["เทียบราคากลาง", "vs reference"], n: true, c: b => { const c = csCase(); return c && c.ref ? `${fmt(b.price / c.ref.amount * 100, 1)}%` : "—"; } }],
  fields: (b, v) => { const c = csCase(), taken = (c ? c.bids : []).filter(x => x !== b).map(x => x.name);
    return [{ id: "vendor", label: ["ผู้ยื่นจากทะเบียนผู้ขาย", "Bidder from the supplier register"], type: "select", wide: true, blank: L("— ไม่อยู่ในทะเบียน (พิมพ์ชื่อด้านล่าง) —", "— not in the register (type the name below) —"), value: v.vendor !== undefined ? v.vendor : b && csVendors().some(x => x.name === b.name) ? b.name : "", opts: csVendors().filter(x => !taken.includes(x.name)).map(x => [x.name, x.name]), hint: L("ผู้ที่อยู่ในรายชื่อผู้ทิ้งงานไม่แสดง", "Suppliers on the abandoned-work list are left out") },
      { id: "other", label: ["หรือชื่อผู้ยื่นรายอื่น", "Or another bidder's name"], wide: true, value: b && !csVendors().some(x => x.name === b.name) ? b.name : "" },
      { id: "price", label: ["ราคาที่เสนอ (บาท)", "Price offered (baht)"], type: "number", req: true, min: 1, value: b ? b.price : "" }]; },
  check: (v, b) => { const c = csCase(), nm = (v.other || v.vendor || "").trim(), e = [];
    if (!nm) e.push({ f: "other", m: L("เลือกหรือพิมพ์ชื่อผู้ยื่น", "Choose or type the bidder") });
    else if (c.bids.some(x => x !== b && x.name === nm)) e.push({ f: "other", m: L("มีชื่อนี้แล้ว", "Already recorded") });
    if (!(v.price > 0)) e.push({ f: "price", m: L("ใส่ราคา", "Enter a price") }); return e; },
  create: { can: () => { const c = csCase(); return csBidEd(c) && c.bids.length < ((c.egp && c.egp.bidders) || 0); }, label: ["เพิ่มข้อเสนอ", "Add a bid"], run: v => {
    const c = csCase(), b = { name: (v.other || v.vendor).trim(), price: Math.round(v.price) }; c.bids.push(b); csIds(c.bids, "B"); caseLog(c, "bid", `${b.name} · ${fmt(b.price)}`); return b; } },
  edit: { can: () => csBidEd(csCase()), run: (b, v) => { const c = csCase(), old = `${b.name} ${fmt(b.price)}`; b.name = (v.other || v.vendor).trim(); b.price = Math.round(v.price); caseLog(c, "bid_edit", `${old} → ${b.name} ${fmt(b.price)}`); } },
  acts: b => (csBidEd(csCase()) ? [csDel(L("ลบข้อเสนอนี้ จำนวนข้อเสนอต้องตรงกับที่ปิดรับใน e-GP ก่อนให้คะแนน", "Delete this bid. The number of bids must match e-GP before scoring."), () => { const c = csCase(); c.bids = c.bids.filter(x => x !== b); caseLog(c, "bid_del", b.name); return L("ลบแล้ว", "Deleted"); })] : []),
  view: b => { const c = csCase(); return kv([[L("ราคาที่เสนอ", "Price offered"), `${fmt(b.price)} ${L("บาท", "baht")}`], c && c.ref && [L("เทียบราคากลาง", "vs reference"), `${fmt(b.price / c.ref.amount * 100, 1)}%`],
    [L("ทะเบียนผู้ขาย", "Supplier register"), csVendors().some(x => x.name === b.name) ? L("อยู่ในทะเบียน", "Registered") : L("ไม่อยู่ในทะเบียน", "Not registered")]]) + (csScored(c) ? `<p class="sub">${L("กรรมการเริ่มให้คะแนนแล้ว แก้ข้อเสนอได้ด้วยการล้มแล้วเริ่มใหม่เท่านั้น (R-PC-03)", "Members have started scoring; bids change only through a rerun (R-PC-03)")}</p>` : ""); },
  hist: () => (csCase() ? csCase().id : ""),
});
// SIM-PC-03: fill the missing bids from the supplier register, priced 85 to 99% of the reference price.
function csBidSim(c) {
  c.bids = c.bids || [];
  const base = c.ref ? c.ref.amount : famPlan(c.plan).est, need = (c.egp.bidders || 0) - c.bids.length, pool = csVendors().filter(v => !c.bids.some(b => b.name === v.name));
  const start = S.cases.indexOf(c);
  for (let i = 0; i < need && i < pool.length; i++) c.bids.push({ name: pool[(start + i) % pool.length].name, price: Math.round(base * (0.85 + ((i * 7 + 3) % 15) / 100) / 100) * 100, sim: true });
  csIds(c.bids, "B"); caseLog(c, "bid", L("ข้อเสนอจำลอง", "simulated bids"));
}

// ---------- quotations (FR-PC-17) ----------
const csQEd = c => !!c && canEditCase(c) && caseState(c) === 4;
CRUD.def("csQuote", {
  noun: ["ใบเสนอราคา", "Quotation"], st: { win: [["เลือก", "Chosen"], "p-ok"], open: [["รอเลือก", "Not chosen"], "p-mute"] }, status: q => (q.win ? "win" : "open"),
  list: () => { const c = csCase(); return c ? csIds(c.quotes = c.quotes || [], "Q") : []; }, id: q => q.id, title: q => tx(q.vendor), sub: q => `${fmt(q.price)} ${L("บาท", "baht")}`,
  cols: [{ h: ["ผู้เสนอราคา", "Supplier"], c: q => esc(tx(q.vendor)) }, { h: ["ราคา (บาท)", "Price (baht)"], n: true, c: q => fmt(q.price) }],
  fields: q => [{ id: "vendor", label: ["ผู้เสนอราคา", "Supplier"], req: true, wide: true, value: q ? tx(q.vendor) : "" }, { id: "price", label: ["ราคา (บาท)", "Price (baht)"], type: "number", req: true, min: 1, value: q ? q.price : "" }],
  check: v => (v.price > 0 ? [] : [{ f: "price", m: L("ใส่ราคา", "Enter a price") }]),
  create: { can: () => { const c = csCase(); return csQEd(c) && !c.quotes.some(q => q.win); }, label: ["เพิ่มใบเสนอราคา", "Add a quotation"], run: v => { const c = csCase(), q = { vendor: [v.vendor, v.vendor], price: Math.round(v.price), win: false }; c.quotes.push(q); csIds(c.quotes, "Q"); caseLog(c, "quote", `${v.vendor} · ${fmt(q.price)}`); return q; } },
  edit: { can: q => { const c = csCase(); return csQEd(c) && !c.quotes.some(x => x.win); }, run: (q, v) => { q.vendor = [v.vendor, v.vendor]; q.price = Math.round(v.price); caseLog(csCase(), "quote", `${v.vendor} · ${fmt(q.price)}`); } },
  acts: q => { const c = csCase(); if (!csQEd(c)) return []; const any = c.quotes.some(x => x.win);
    return [!any && { id: "win", label: L("เลือกรายนี้", "Choose this one"), kind: "primary", run: () => { c.quotes.forEach(x => (x.win = x === q)); audit(["เลือกผู้เสนอราคา", "Chose a quotation"], `${c.id} ${tx(q.vendor)}`); return L("เลือกแล้ว", "Chosen"); } },
      q.win && { id: "unwin", label: L("ยกเลิกการเลือก", "Unchoose"), run: () => { q.win = false; return L("ยกเลิกการเลือกแล้ว", "Unchosen"); } },
      !any && csDel(L("ลบใบเสนอราคานี้", "Delete this quotation"), () => { c.quotes = c.quotes.filter(x => x !== q); caseLog(c, "quote_del", tx(q.vendor)); return L("ลบแล้ว", "Deleted"); })]; },
  view: q => kv([[L("ราคา", "Price"), `${fmt(q.price)} ${L("บาท", "baht")}`], [L("สถานะ", "Status"), q.win ? L("เลือกแล้ว", "Chosen") : L("ยังไม่เลือก", "Not chosen")]]),
  hist: () => (csCase() ? csCase().id : ""),
});

// ---------- committees (FR-PC-12) ----------
// A committee can be appointed, changed or have its order cancelled until a member has declared (R-PC-03).
const csCmStarted = (c, key) => Object.keys((c.coi || {})[key] || {}).length > 0;
CRUD.def("csCm", {
  noun: ["คณะกรรมการ", "Committee"], st: { ok: [["แต่งตั้งแล้ว", "Appointed"], "p-ok"], part: [["ยังไม่ครบ", "Incomplete"], "p-warn"], none: [["ยังไม่แต่งตั้ง", "Not appointed"], "p-mute"] },
  list: () => { const c = csCase(); return c ? [...new Set([...requiredCommittees(c), ...Object.keys(c.committees || {})])].map(key => ({ key, x: c.committees[key] || null })) : []; },
  id: r => r.key, title: r => tx(COMMITTEES[r.key]), sub: r => (r.x ? `${L("คำสั่งที่", "Order")} ${esc(r.x.order)} · ${fdate(r.x.date)}` : L("ยังไม่แต่งตั้ง", "Not appointed")),
  status: r => (!r.x ? "none" : committeeOk(r.x) ? "ok" : "part"),
  cols: [{ h: ["คณะกรรมการ", "Committee"], c: r => esc(tx(COMMITTEES[r.key])) }, { h: ["คำสั่ง", "Order"], c: r => (r.x ? `${esc(r.x.order)} <span class="sub">${fdate(r.x.date)}</span>` : "—") },
    { h: ["ประธานและกรรมการ", "Chair and members"], c: r => (r.x ? `<span class="sub">${committeeMembers(r.x).map(u => esc(userName(u))).join(", ")}</span>` : "—") }],
  fields: r => { const x = r && r.x, P = people().filter(u => u.role !== "vendor"), sel = x ? x.members : [];
    const st = !!x && csCmStarted(csCase(), r.key);
    return [{ id: "order", label: ["เลขที่คำสั่ง", "Order no."], req: true, lock: st, value: x ? x.order : "" }, { id: "date", label: ["วันที่", "Date"], type: "date", req: true, max: TODAY, lock: st, show: x && fdate(x.date), value: x ? x.date : TODAY },
      ...(st ? [{ id: "_st", label: ["หมายเหตุ", "Note"], type: "info", wide: true, html: L("กรรมการเริ่มแจ้งส่วนได้เสียแล้ว เปลี่ยนตัวได้พร้อมเหตุผล ผู้ที่ให้คะแนนแล้วออกไม่ได้ ผู้ที่เข้าใหม่ต้องแจ้งส่วนได้เสียก่อนพิจารณา", "Members have started declaring: changes need a reason, members who have scored can't leave, and new members must declare first") }] : []),
      { id: "chair", label: ["ประธาน", "Chair"], type: "select", req: true, wide: true, value: x ? x.chair : (P[0] || {}).id, opts: P.map(u => [u.id, `${tx(u.name)} · ${tx(ROLES[u.role])}`]) },
      { id: "_m", label: ["กรรมการ", "Members"], type: "info", wide: true, html: `${L("อย่างน้อย", "At least")} ${S.pcfg.minMembers - 1} ${L("คนนอกจากประธาน", "besides the chair")}` },
      ...P.map(u => ({ id: "m_" + u.id, label: [`${u.name[0]} · ${ROLES[u.role][0]}`, `${u.name[1]} · ${ROLES[u.role][1]}`], type: "check", value: sel.includes(u.id) }))]; },
  check: (v, r) => { const n = Object.keys(v).filter(k => k.startsWith("m_") && v[k] && k.slice(2) !== v.chair).length, c = csCase(), e = [];
    if (n < S.pcfg.minMembers - 1) e.push({ f: null, m: L(`ต้องมีกรรมการอย่างน้อย ${S.pcfg.minMembers - 1} คนนอกจากประธาน`, `At least ${S.pcfg.minMembers - 1} members besides the chair`) });
    if (r && r.x && c) { const keep = new Set([v.chair, ...Object.keys(v).filter(k => k.startsWith("m_") && v[k]).map(k => k.slice(2))]);
      committeeMembers(r.x).filter(u => !keep.has(u) && c.scores && c.scores[u] && Object.keys(c.scores[u]).length).forEach(u => e.push({ f: null, m: L(`${userName(u)} ให้คะแนนแล้ว จึงออกจากคณะกรรมการไม่ได้`, `${userName(u)} has scored and can't leave the committee`) })); }
    return e; },
  edit: { can: r => { const c = csCase(); return !!c && canEditCase(c) && caseState(c) <= 6; }, why: r => { const c = csCase(); return !!r.x && csCmStarted(c, r.key); }, run: (r, v, why) => {
    const c = csCase(), members = Object.keys(v).filter(k => k.startsWith("m_") && v[k]).map(k => k.slice(2)).filter(id => id !== v.chair), was = !!r.x, st = was && csCmStarted(c, r.key);
    const keep = new Set([v.chair, ...members]), gone = was ? committeeMembers(r.x).filter(u => !keep.has(u)) : [];
    if (st) gone.forEach(u => { delete c.coi[r.key][u]; caseLog(c, "coi_swap", `${userName(u)} · ${why}`); });
    c.committees[r.key] = { order: st ? r.x.order : v.order, date: st ? r.x.date : v.date, chair: v.chair, members, t: nowIso() };
    audit([was ? "แก้ไขคำสั่งแต่งตั้งคณะกรรมการ" : "แต่งตั้งคณะกรรมการ", was ? "Changed a committee order" : "Appointed a committee"], `${c.id} ${tx(COMMITTEES[r.key])} · ${v.order}`); caseLog(c, "committee", `${tx(COMMITTEES[r.key])} · ${v.order}`); } },
  acts: r => { const c = csCase(); return r.x && c && canEditCase(c) && !csCmStarted(c, r.key) ? [{ id: "del", label: L("ยกเลิกคำสั่ง", "Cancel the order"), kind: "danger", why: true, run: (_, why) => {
    delete c.committees[r.key]; audit(["ยกเลิกคำสั่งแต่งตั้งคณะกรรมการ", "Cancelled a committee order"], `${c.id} ${tx(COMMITTEES[r.key])} · ${why}`); caseLog(c, "committee_off", `${tx(COMMITTEES[r.key])} · ${why}`); return L("ยกเลิกคำสั่งแล้ว", "Order cancelled"); } }] : []; },
  view: r => { const c = csCase(); return r.x ? kv([[L("คำสั่งที่", "Order"), `${esc(r.x.order)} · ${fdate(r.x.date)}`], [L("ประธาน", "Chair"), esc(userName(r.x.chair))], [L("กรรมการ", "Members"), r.x.members.map(u => esc(userName(u))).join(", ")],
      [L("การแจ้งส่วนได้เสีย", "Declarations"), `${Object.keys((c.coi || {})[r.key] || {}).length}/${committeeMembers(r.x).length}`]]) + (csCmStarted(c, r.key) ? `<p class="sub">${L("กรรมการเริ่มแจ้งส่วนได้เสียแล้ว เปลี่ยนตัวได้พร้อมเหตุผล และยกเลิกคำสั่งไม่ได้", "Members have started declaring; members can be replaced with a reason, and the order can't be cancelled")}</p>` : "")
      : `<p class="sub">${L("ยังไม่แต่งตั้ง กด “แก้ไข” เพื่อบันทึกคำสั่ง", "Not appointed yet; use Edit to record the order")}</p>`; },
  hist: () => (csCase() ? csCase().id : ""),
});

// ---------- pages and binders ----------
PROC.cases = () => {
  if (CASE_OPEN && caseOf(CASE_OPEN)) return caseDetail(caseOf(CASE_OPEN));
  const all = S.cases, cnt = g => all.filter(c => csGroup(c) === g).length;
  return `<section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("แฟ้มที่ดำเนินการ", "Cases in progress")}</span><span class="v">${all.length - cnt("cancel")}</span></div>
    <div class="kpi"><span class="l">${L("ก่อนดำเนินการ", "Before sourcing")}</span><span class="v">${cnt("early")}</span></div>
    <div class="kpi"><span class="l">${L("อยู่ใน e-GP", "In sourcing")}</span><span class="v">${cnt("source")}</span></div>
    <div class="kpi"><span class="l">${L("ขั้นสัญญาขึ้นไป", "Contract stage and on")}</span><span class="v">${cnt("contract")}</span></div></section>
  ${crudList("pcCase", { head: `<h2>${L("แฟ้มจัดซื้อจัดจ้าง", "Procurement cases")}</h2><span class="sp"></span><span class="sub">${L("แฟ้มสร้างจากรายการในแผน · กดแถวเพื่อดูสรุป หรือเปิดแฟ้มเพื่อทำงานรายขั้น", "Cases come from plan items · open a row for the summary, or the case to work step by step")}</span>` })}`;
};
CASE_BINDS.push((c, done) => {
  const bs = $("#bid-sim"); if (bs) bs.onclick = () => { const snap = crSnap(); csBidSim(c); done(); crUndoOffer(snap, L("ใส่ข้อเสนอจำลองแล้ว แก้หรือลบได้ก่อนให้คะแนน", "Simulated bids added; edit or delete them before scoring")); };
  $$("[data-coiredo]").forEach(b => (b.onclick = () => { const [k, u] = b.dataset.coiredo.split("|"), snap = crSnap(); delete c.coi[k][u]; caseLog(c, "coi_redo", userName(u)); audit(["ล้างแบบแจ้งผลประโยชน์ทับซ้อนเพื่อแจ้งใหม่", "Cleared a declaration to redo it"], `${c.id} ${userName(u)}`); done(); crUndoOffer(snap, L("ล้างแบบแจ้งแล้ว แจ้งใหม่ได้", "Declaration cleared; declare again")); }));
});
