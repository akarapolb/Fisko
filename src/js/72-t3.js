// Fisko Procurement round 39 (T3 of design v0.3, chapter 18): drawing approval (FR-PR-75, R-23), serial numbers and BOQ
// (FR-PR-76, 77), extra contract data and ERP reference codes (FR-PR-77), and committee fees (FR-PR-78, R-24).
// FR-PR-79 (supplier bank-account change) is covered by Fisko Finance round 38 (S.vendorChanges, SD-14); here the supplier
// portal gets a request form that feeds that same list. Every part sits behind a profile switch (70-profile.js).
// Committee fees prepare and check claims only; nothing is paid from here.

["drawing", "commFee"].forEach(k => { const f = PROF_FEATS.find(x => x.k === k); if (f) f.built = true; });
DOC_TYPES.mn = ["หนังสือแจ้งผลอนุมัติแบบ (MN)", "Drawing approval letter (MN)"];
DOC_TYPES.fee = ["ใบเบิกค่าตอบแทนกรรมการ", "Committee fee claim"];
COMMITTEES.accept = ["คณะกรรมการตรวจรับพัสดุ", "Acceptance committee"];

function seedT3(s) {
  s.prof.p3 = { drawingReplyDays: 45, feeMonthCap: 6000, feeLadder: 20000, feeCasePct: 1, feeMinAttendPct: 50, feeHolidayOk: false,
    fee: { tor: [1500, 1200], eval: [1500, 1200], buy: [1500, 1200], accept: [1000, 800] } };
  s.prof.drawCats = []; s.fees = [];
  s.docno.fmt.mn = { pfx: "MN", pad: 3, unit: false }; s.docno.fmt.fee = { pfx: "คต", pad: 3, unit: false };
  const k = s.contracts[0]; if (k) k.boq = [{ item: ["หม้อแปลงไฟฟ้า 500 kVA", "Transformer 500 kVA"], unit: ["เครื่อง", "unit"], qty: 20, price: 1000000, serial: true, kind: "material" }, { item: ["ค่าติดตั้งและทดสอบ", "Installation and testing"], unit: ["งาน", "job"], qty: 1, price: 4000000, serial: false, kind: "labour" }];
}
const P3 = () => S.prof.p3;
Object.assign(CASE_EV, {});
const conOf = id => S.contracts.find(k => k.id === id);

// ---------- drawing approval ----------
const drwReq = k => feat("drawing") && !!((k.drw && k.drw.on) || (S.prof.drawCats || []).includes(famPlan(k.plan).cat));
const drwApproved = k => !!(k.drw && (k.drw.rounds || []).some(r => r.status === "approved"));
const drwOpen = k => (k.drw && k.drw.rounds || []).find(r => r.status === "submitted");
const drwDue = r => addDays(r.recv, P3().drawingReplyDays);
const DRW_KIND = { loose: ["ชิ้นส่วนแยก (Loose Part)", "Loose part"], turnkey: ["Turnkey", "Turnkey"] };
const DRW_ST = { submitted: [["รอตอบ", "Waiting"], "p-info"], approved: [["อนุมัติ", "Approved"], "p-ok"], rejected: [["ส่งกลับแก้", "Sent back"], "p-warn"] };

// ---------- BOQ and serial numbers ----------
const boqTotal = k => sumv((k.boq || []).map(b => b.qty * b.price));
const serialsOf = (k, i) => (k.serials || []).filter(x => x.i === i);
const allSerials = () => new Set(S.contracts.flatMap(k => (k.serials || []).map(x => x.no.toUpperCase())));

// ---------- contract figures ----------
function capDate(k) {
  const cap = S.pcfg.penaltyCapPct / 100 * k.amount, pen = conPenalty(k); if (pen >= cap) return { passed: true };
  const daily = sumv(k.phases.filter(ph => !ph.delivered && !phaseAccepted(ph) && !ph.cancelled && phDue(ph) < TODAY).map(ph => S.pcfg.penaltyPct / 100 * ph.amount)); if (!daily) return null;
  return { date: addDays(TODAY, Math.ceil((cap - pen) / daily)), daily };
}
const accPct = k => Math.round(sumv(k.phases.filter(phaseAccepted).map(ph => (ph.result === "partial" ? ph.okAmount : ph.amount))) / k.amount * 100);

// ---------- panels on the contracts page ----------
{
  const base = conPanel;
  conPanel = c => base(c) + t3Panel(c);
}
function t3Panel(c) {
  const ed = isProcRole(), drw = drwReq(c), D = c.drw || { rounds: [] }, B = c.boq || [], cd = capDate(c), lr = c.supervision ? lastReport(c) : null, erp = feat("erpRef"), x = c.xref || {};
  const showDrw = feat("drawing"), open = drwOpen(c), reply = P3().drawingReplyDays;
  const drwHtml = showDrw ? `<details ${drw ? "open" : ""}><summary><b>${L("อนุมัติแบบ", "Drawing approval")}</b> ${drw ? (drwApproved(c) ? tag(L("อนุมัติแล้ว", "Approved"), "p-ok") : tag(L("ยังไม่อนุมัติ ตรวจรับงวดแรกไม่ได้", "Not approved: the first phase can't be accepted"), "p-warn")) : tag(L("ไม่ต้องส่งแบบ", "Not required"), "p-mute")} <span class="mono sub">FR-PR-75 · R-23</span></summary>
    <div class="body">${ed ? `<form class="inline-form" data-drwcfg="${c.id}"><label class="field-inline"><input type="checkbox" name="on" ${(c.drw && c.drw.on) || (S.prof.drawCats || []).includes(famPlan(c.plan).cat) ? "checked" : ""}> ${L("สัญญานี้ต้องส่งแบบ", "This contract needs drawings")}</label>
        <div class="f" style="flex:0 1 220px"><select name="kind">${Object.keys(DRW_KIND).map(k => `<option value="${k}" ${D.kind === k ? "selected" : ""}>${tx(DRW_KIND[k])}</option>`).join("")}</select></div>
        <div class="f" style="flex:0 1 170px"><label>${L("กำหนดส่งแบบครั้งแรก", "First drawing due")}</label><input type="date" name="first" value="${D.first || ""}"></div><button class="btn" type="submit">${L("บันทึก", "Save")}</button></form>` : ""}
      ${(D.rounds || []).length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ครั้งที่", "Round")}</th><th>${L("ได้รับแบบ", "Received")}</th><th>${L("หนังสือ MN", "Letter MN")}</th><th>${L("ตอบภายใน", "Reply by")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead><tbody>${D.rounds.map(r => `<tr><td>${r.n}</td><td class="sub">${fdate(r.recv)}</td><td class="mono sub">${esc(r.mn)}</td><td class="sub">${fdate(drwDue(r))}${r.status === "submitted" && drwDue(r) < TODAY ? ` ${tag(L("เลยกำหนด", "Overdue"), "p-bad")}` : ""}</td><td>${tag(tx(DRW_ST[r.status][0]), DRW_ST[r.status][1])}${r.note ? `<div class="sub">${esc(r.note)}</div>` : ""}${r.replied ? `<div class="sub">${fdate(r.replied)}</div>` : ""}</td>
        <td>${ed && r.status === "submitted" ? `<div class="row"><input type="text" id="dn-${c.id}-${r.n}" placeholder="${L("หมายเหตุ", "Note")}" style="width:140px"><button class="btn primary" type="button" data-drwdec="${c.id}|${r.n}|approved">${L("อนุมัติ", "Approve")}</button><button class="btn" type="button" data-drwdec="${c.id}|${r.n}|rejected">${L("ส่งกลับแก้", "Send back")}</button></div>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="sub">${L("ยังไม่ได้รับแบบ", "No drawings received yet")}</div>`}
      ${ed && drw && !open && !drwApproved(c) ? `<form class="inline-form" data-drwadd="${c.id}" style="margin-top:6px"><div class="f" style="flex:0 1 170px"><label>${L("วันที่ได้รับแบบ", "Received on")}</label><input type="date" name="d" value="${TODAY}" required></div><button class="btn" type="submit">${L("บันทึกการรับแบบ ออกเลข MN", "Record receipt, issue MN no.")}</button></form>` : ""}
      <div class="sub" style="margin-top:6px">${L("ตอบภายใน", "Reply within")} ${reply} ${L("วันนับจากวันที่ได้รับ เลยกำหนดแล้วแจ้งเตือนคณะกรรมการตรวจรับ ตรวจรับงวดแรกไม่ได้จนกว่าแบบจะอนุมัติ", "days of receipt; overdue replies alert the acceptance committee; the first phase can't be accepted until a drawing is approved")}</div></div></details>` : "";
  const bqHtml = `<details><summary><b>${L("BOQ และหมายเลขเครื่อง (Serial Number)", "BOQ and serial numbers")}</b> ${B.length ? tag(`${B.length} ${L("รายการ", "items")}`, "p-info") : tag(L("ยังไม่มี BOQ", "No BOQ"), "p-mute")} <span class="mono sub">FR-PR-76, 77</span></summary>
    <div class="body">${B.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("รายการ", "Item")}</th><th>${L("ชนิด", "Kind")}</th><th class="n">${L("จำนวน", "Qty")}</th><th class="n">${L("ราคาต่อหน่วย", "Unit price")}</th><th class="n">${L("รวม", "Total")}</th><th>${L("หมายเลขเครื่อง", "Serial numbers")}</th></tr></thead><tbody>${B.map((b, i) => { const S_ = serialsOf(c, i);
      return `<tr><td>${tx(b.item)}</td><td class="sub">${b.kind === "labour" ? L("ค่าแรง", "Labour") : L("วัสดุ", "Material")}</td><td class="n">${b.qty} ${tx(b.unit)}</td><td class="n">${fmt(b.price)}</td><td class="n">${fmt(b.qty * b.price)}</td>
        <td>${b.serial ? `<div>${tag(`${S_.length}/${b.qty}`, S_.length === b.qty ? "p-ok" : "p-warn")} ${S_.length ? `<span class="sub mono">${S_.slice(0, 3).map(x => esc(x.no)).join(", ")}${S_.length > 3 ? " …" : ""}</span>` : ""}</div>
          ${ed && S_.length < b.qty ? `<form class="inline-form" data-serf="${c.id}|${i}" style="margin-top:4px"><div class="f" style="flex:2 1 220px"><textarea name="no" rows="2" placeholder="${L("วางหมายเลขเครื่อง บรรทัดละ 1 หมายเลข (วางจาก Excel ได้)", "Paste serial numbers, one per line (from Excel works)")}" style="width:100%"></textarea></div><button class="btn" type="submit">${L("บันทึก", "Save")}</button></form>` : ""}` : `<span class="sub">—</span>`}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="sub">${L("รวม BOQ", "BOQ total")} ${fmt(boqTotal(c))} ${L("บาท", "baht")} · ${L("วงเงินสัญญา", "contract amount")} ${fmt(c.amount)} ${boqTotal(c) === c.amount ? tag(L("ตรงกัน", "Match"), "p-ok") : tag(L("ต่างกัน", "Differs"), "p-warn")} · ${L("บันทึกหมายเลขได้เมื่อมีการแจ้งส่งมอบแล้ว ซ้ำกับสัญญาใดก็บันทึกไม่ได้ พร้อมส่งต่อ Fisko Assets (ภายหลัง)", "serials can be saved once a delivery is noted; a number used on any contract is refused; ready to pass on to Fisko Assets later")}</div>` : ""}
      ${ed ? `<form class="inline-form" data-boqadd="${c.id}" style="margin-top:6px"><div class="f" style="flex:2 1 200px"><label>${L("รายการ", "Item")}</label><input type="text" name="item" required></div><div class="f" style="flex:0 1 110px"><label>${L("หน่วย", "Unit")}</label><input type="text" name="unit" value="${L("ชุด", "set")}" required></div><div class="f" style="flex:0 1 100px"><label>${L("จำนวน", "Qty")}</label><input type="number" name="qty" min="1" step="1" required></div><div class="f" style="flex:0 1 150px"><label>${L("ราคาต่อหน่วย", "Unit price")}</label><input type="number" name="price" min="0" step="1" required></div>
        <div class="f" style="flex:0 1 140px"><label>${L("ชนิด", "Kind")}</label><select name="kind"><option value="material">${L("วัสดุ", "Material")}</option><option value="labour">${L("ค่าแรง", "Labour")}</option></select></div><label class="field-inline"><input type="checkbox" name="serial"> ${L("มี Serial", "Has serials")}</label><button class="btn" type="submit">+ ${L("เพิ่ม", "Add")}</button></form>` : ""}</div></details>`;
  const exHtml = `<details><summary><b>${L("ข้อมูลเพิ่มเติมของสัญญา", "Extra contract data")}</b> <span class="mono sub">FR-PR-77</span></summary><div class="body">
      <div class="row"><span>${L("ร้อยละผลงานสะสม", "Cumulative progress")}: ${lr ? `<b>${lr.actual != null ? lr.actual : "—"}%</b> ${L("(รายงานผู้ควบคุมงานล่าสุด)", "(latest supervisor report)")}` : `<span class="sub">${L("ยังไม่มีรายงาน", "no report yet")}</span>`}</span><span class="sub">·</span><span>${L("ตรวจรับแล้วตามวงเงิน", "Accepted by value")}: <b>${accPct(c)}%</b></span></div>
      <div class="sub" style="margin-top:4px">${cd ? (cd.passed ? tag(L("ค่าปรับสะสมถึงเพดานแล้ว", "Penalties have reached the cap"), "p-bad") : `${L("ที่อัตราค่าปรับปัจจุบัน ค่าปรับจะครบเพดาน", "At the current rate, penalties reach the cap on")} ${S.pcfg.penaltyCapPct}% ${L("ในวันที่", "on")} <b>${fdate(cd.date)}</b> (${fmt(Math.round(cd.daily))} ${L("บาทต่อวัน", "baht a day")})`) : L("ไม่มีงวดเลยกำหนด จึงยังไม่คาดวันครบเพดานค่าปรับ", "No overdue phase, so no cap date is projected")}</div>
      ${erp ? `<form class="inline-form" data-xref="${c.id}" style="margin-top:8px">${[["wbs", "WBS", "WBS"], ["po", "เลขที่ใบสั่งซื้อ (ERP)", "PO no. (ERP)"], ["fund", "ที่มาของเงิน", "Source of funds"], ["asset", "รหัสครุภัณฑ์", "Asset code"]].map(([k, th, en]) => `<div class="f" style="flex:1 1 160px"><label>${L(th, en)}</label><input type="text" name="${k}" value="${esc(x[k] || "")}" ${ed ? "" : "disabled"}></div>`).join("")}${ed ? `<button class="btn" type="submit">${L("บันทึก", "Save")}</button>` : ""}</form>` : ""}</div></details>`;
  return `<section class="panel"><header><h2>${L("เพิ่มเติม (รอบ T3)", "More (round T3)")} · <span class="mono">${c.id}</span></h2></header><div class="body">${drwHtml}${bqHtml}${exHtml}</div></section>`;
}

// ---------- tasks ----------
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.contracts) return;
    if (isProcRole() && feat("drawing")) S.contracts.forEach(k => { const o = drwOpen(k); if (o && drwDue(o) <= addDays(TODAY, 7)) R(`${L("ตอบอนุมัติแบบ", "Reply on the drawings")} ${k.id}`, `${o.mn} · ${L("ตอบภายใน", "by")} ${fdate(drwDue(o))}`, drwDue(o), "prc-contracts", drwDue(o) < TODAY ? "p-bad" : "p-warn"); });
    if (feat("commFee") && (S.fees || []).length) (S.fees || []).filter(f => f.status === "pending").forEach(f => { if ((f.total <= P3().feeLadder && ROLE === "prochead") || (f.total > P3().feeLadder && canSpend())) R(`${L("อนุมัติค่าตอบแทนกรรมการ", "Approve a committee fee claim")} ${f.id}`, `${fmt(f.total)} ${L("บาท", "baht")}`, TODAY, "prc-fees", "p-warn"); });
  };
}

// ---------- binders for the contracts page ----------
{
  const bb = BIND.procurement;
  BIND.procurement = () => {
    bb();
    const redo = msg => { commit(); renderShell(); route(); if (msg) toast(msg); };
    $$("[data-drwcfg]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const k = conOf(f.dataset.drwcfg), fd = new FormData(f); k.drw = Object.assign(k.drw || { rounds: [] }, { on: fd.get("on") === "on", kind: fd.get("kind"), first: fd.get("first") || "" });
      audit(["ตั้งค่าการอนุมัติแบบของสัญญา", "Set the drawing approval for a contract"], `${k.id} ${k.drw.on ? "on" : "off"}`); redo(L("บันทึกแล้ว", "Saved")); }));
    $$("[data-drwadd]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const k = conOf(f.dataset.drwadd), d = new FormData(f).get("d"); k.drw = k.drw || { on: true, kind: "loose", rounds: [] };
      const r = { n: k.drw.rounds.length + 1, recv: d, mn: docNo("mn", "", k.id), status: "submitted", note: "", replied: null, by: me().id }; k.drw.rounds.push(r);
      notify(k.inspectors || [], [`สัญญา ${k.id} ได้รับแบบ ${r.mn} ตอบภายใน ${fdate(drwDue(r))}`, `Contract ${k.id}: drawings ${r.mn} received; reply by ${fdate(drwDue(r))}`], "prc-contracts"); audit(["บันทึกการรับแบบ", "Recorded receipt of drawings"], `${k.id} ${r.mn}`); redo(`${L("ออกเลข", "Issued")} ${r.mn}`); }));
    $$("[data-drwdec]").forEach(b => (b.onclick = () => { const [id, n, st] = b.dataset.drwdec.split("|"), k = conOf(id), r = k.drw.rounds.find(x => x.n === Number(n)), note = ($(`#dn-${id}-${n}`).value || "").trim();
      if (st === "rejected" && note.length < 3) { toast(L("ระบุเหตุผลที่ส่งกลับอย่างน้อย 3 ตัวอักษร", "Give a reason of at least 3 characters")); return; }
      r.status = st; r.note = note; r.replied = TODAY; audit([st === "approved" ? "อนุมัติแบบ" : "ส่งแบบกลับแก้", st === "approved" ? "Approved drawings" : "Sent drawings back"], `${k.id} ${r.mn}`); redo(L("บันทึกแล้ว", "Saved")); }));
    $$("[data-boqadd]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const k = conOf(f.dataset.boqadd), fd = new FormData(f), it = String(fd.get("item")).trim(); (k.boq = k.boq || []).push({ item: [it, it], unit: [String(fd.get("unit")).trim(), String(fd.get("unit")).trim()], qty: Math.round(Number(fd.get("qty"))), price: Math.round(Number(fd.get("price"))), serial: fd.get("serial") === "on", kind: fd.get("kind") });
      audit(["เพิ่มรายการ BOQ", "Added a BOQ item"], `${k.id} ${it}`); redo(L("เพิ่มแล้ว", "Added")); }));
    $$("[data-serf]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const [id, i] = f.dataset.serf.split("|"), k = conOf(id), idx = Number(i), b = k.boq[idx];
      if (!k.phases.some(ph => ph.delivered)) { toast(L("ต้องมีการแจ้งส่งมอบก่อนจึงบันทึกหมายเลขได้", "A delivery must be noted before serial numbers can be saved")); return; }
      const lines = String(new FormData(f).get("no")).split(/[\n\r\t,;]+/).map(x => x.trim()).filter(Boolean), have = allSerials(), seen = new Set(), dup = [];
      lines.forEach(n => { const u = n.toUpperCase(); if (have.has(u) || seen.has(u)) dup.push(n); seen.add(u); });
      if (!lines.length) { toast(L("ไม่มีหมายเลข", "No serial numbers")); return; }
      if (dup.length) { toast(`${L("หมายเลขซ้ำ ไม่บันทึก", "Duplicates, nothing saved")}: ${dup.slice(0, 3).join(", ")}${dup.length > 3 ? " …" : ""}`); return; }
      if (serialsOf(k, idx).length + lines.length > b.qty) { toast(L(`เกินจำนวนที่สั่ง (${b.qty})`, `More than the quantity ordered (${b.qty})`)); return; }
      const ph = k.phases.filter(p => p.delivered).slice(-1)[0]; lines.forEach(n => (k.serials = k.serials || []).push({ i: idx, no: n, phase: ph.n, t: nowIso(), by: me().id }));
      audit(["บันทึกหมายเลขเครื่อง", "Recorded serial numbers"], `${k.id} ${lines.length}`); redo(`${lines.length} ${L("หมายเลข บันทึกแล้ว", "serial numbers saved")}`); }));
    $$("[data-xref]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const k = conOf(f.dataset.xref), fd = new FormData(f); k.xref = { wbs: fd.get("wbs").trim(), po: fd.get("po").trim(), fund: fd.get("fund").trim(), asset: fd.get("asset").trim() }; audit(["บันทึกรหัสอ้างอิง ERP ของสัญญา", "Saved ERP references on a contract"], k.id); redo(L("บันทึกแล้ว", "Saved")); }));
    // R-23: the first phase can't be accepted until a drawing is approved
    S.contracts.filter(k => drwReq(k) && !drwApproved(k)).forEach(k => { const f = document.querySelector(`[data-sgform="${k.id}|1"]`); if (f) f.outerHTML = `<div class="sub" style="color:var(--bad)">${L("ตรวจรับไม่ได้ ยังไม่มีการอนุมัติแบบ (R-23)", "Can't accept: no drawing is approved yet (R-23)")}</div>`; });
  };
}

// ---------- committee fees ----------
{
  const nav = NAV.find(n => n.id === "procurement"), all = [...nav.tabs, ["fees", ["ค่าตอบแทนกรรมการ", "Committee fees"], "P18"]];
  Object.defineProperty(nav, "tabs", { get: () => all.filter(t => t[0] !== "fees" || feat("commFee")), configurable: true });
  const bv = VIEWS.procurement;
  VIEWS.procurement = () => { const h = bv(); return PROC_TAB === "fees" ? h.replace(/<h1>[^<]*<\/h1>/, `<h1>${tx(["ค่าตอบแทนกรรมการ", "Committee fees"])}</h1>`) : h; };
}
const feeOn = () => feat("commFee");
const isOff = d => { const g = new Date(d + "T00:00:00").getDay(); return g === 0 || g === 6 || (S.holidays || []).includes(d); };
const feeCommittees = c => ({ tor: c.committees && c.committees.tor, eval: c.committees && c.committees.eval, buy: c.committees && c.committees.buy });
function feeMembers(c, kind) {
  if (kind === "accept") { const k = S.contracts.find(x => x.plan === c.plan); return k ? k.inspectors.map(u => ({ u, pos: "member" })) : []; }
  const cm = (c.committees || {})[kind]; return cm ? [{ u: cm.chair, pos: "chair" }, ...cm.members.map(u => ({ u, pos: "member" }))] : [];
}
const feeUsed = (u, month, skip) => sumv((S.fees || []).filter(f => f.id !== skip && f.status !== "rejected" && f.dates[0].slice(0, 7) === month).flatMap(f => f.rows.filter(r => r.u === u).map(r => r.net)));
function feeCalc(d) {
  const c = caseOf(d.caseId), P = P3(), month = d.dates[0].slice(0, 7), rates = P.fee[d.kind], out = [], estimate = planEst(c);
  d.members.forEach(m => {
    const att = d.dates.filter(dt => (d.att[m.u] || {})[dt]), notes = [], paid = [];
    att.forEach(dt => { if (isOff(dt) && !P.feeHolidayOk) notes.push(`${fdate(dt)}: ${L("วันหยุด ไม่จ่ายตามค่าตั้ง", "day off, not paid by the settings")}`);
      else if ((S.fees || []).some(f => f.status !== "rejected" && f.case === c.id && f.kind === d.kind && f.dates.includes(dt) && f.rows.some(r => r.u === m.u && r.dates.includes(dt)))) notes.push(`${fdate(dt)}: ${L("เบิกซ้ำ ตัดออก", "already claimed, removed")}`); else paid.push(dt); });
    const rate = rates[m.pos === "chair" ? 0 : 1], needN = Math.ceil(d.dates.length * P.feeMinAttendPct / 100), under = att.length < needN;
    if (under) notes.push(`${L("เข้าประชุมน้อยกว่าเกณฑ์", "Below the attendance rule")} ${att.length}/${d.dates.length} (${P.feeMinAttendPct}%)`);
    const gross = under ? 0 : paid.length * rate, room = Math.max(0, P.feeMonthCap - feeUsed(m.u, month)), net = Math.min(gross, room); if (net < gross) notes.push(`${L("เกินเพดานรายเดือน ลดเหลือ", "Over the monthly cap, cut to")} ${fmt(net)}`);
    out.push({ u: m.u, pos: m.pos, n: paid.length, dates: paid, rate, gross, net, notes });
  });
  const total = sumv(out.map(r => r.net)), caseUsed = sumv((S.fees || []).filter(f => f.case === c.id && f.status !== "rejected").map(f => f.total)), caseCap = Math.round(P.feeCasePct / 100 * estimate);
  return { rows: out, total, caseUsed, caseCap, over: caseUsed + total > caseCap };
}
let FEE_DRAFT = null;
const FEE_ST = { pending: [["รออนุมัติ", "Pending"], "p-info"], approved: [["อนุมัติ", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"] };
PROC.fees = () => {
  if (!feeOn()) return `<div class="panel"><div class="body"><h2 style="margin:0 0 6px">${L("ค่าตอบแทนกรรมการปิดอยู่", "Committee fees are off")}</h2><p class="sub">${L("เปิดได้ที่ M10 → โปรไฟล์จัดซื้อ", "It can be switched on in M10, Procurement profile")}</p></div></div>`;
  const ed = isProcRole(), F = S.fees || [], P = P3(), d = FEE_DRAFT, pend = F.filter(f => f.status === "pending"), month = TODAY.slice(0, 7), mthTot = sumv(F.filter(f => f.status === "approved" && f.dates[0].slice(0, 7) === month).map(f => f.total));
  const cases = S.cases.filter(c => !c.cancelled && (["tor", "eval", "buy"].some(k => (c.committees || {})[k]) || S.contracts.some(x => x.plan === c.plan)));
  const prev = d && d.preview;
  return `<div class="kpis"><div class="kpi"><span class="l">${L("รออนุมัติ", "Pending")}</span><span class="v">${pend.length}</span></div><div class="kpi"><span class="l">${L("อนุมัติเดือนนี้ (บาท)", "Approved this month (baht)")}</span><span class="v">${fmt(mthTot)}</span></div><div class="kpi"><span class="l">${L("เพดานต่อคนต่อเดือน", "Cap per person a month")}</span><span class="v">${fmt(P.feeMonthCap)}</span></div></div>
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("เตรียมและตรวจรายการเบิกเท่านั้น ไม่จ่ายเงินจากที่นี่", "This prepares and checks claims; nothing is paid from here")}</b><p>${L("อัตรา เพดาน และเกณฑ์เข้าประชุมเป็นค่าตั้งใน M10 → โปรไฟล์จัดซื้อ (ระดับ C ต้องยืนยันกับระเบียบของหน่วยงาน) ตัวเลขทั้งหมดเป็นตัวอย่าง", "Rates, caps and the attendance rule are settings in M10, Procurement profile (level C, confirm against the agency's rules). All figures are samples.")}</p></div></div>
  ${ed ? `<section class="panel"><header><h2>${L("เบิกค่าตอบแทนใหม่", "New claim")}</h2><span class="sp"></span><span class="mono sub">FR-PR-78 · R-24</span></header><div class="body">
    <form class="inline-form" id="fee-start"><div class="f" style="flex:2 1 260px"><label for="fee-c">${L("แฟ้มจัดซื้อ", "Case")}</label><select id="fee-c">${cases.map(c => `<option value="${c.id}" ${d && d.caseId === c.id ? "selected" : ""}>${c.id} · ${esc(caseName(c))}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 250px"><label for="fee-k">${L("คณะกรรมการ", "Committee")}</label><select id="fee-k">${["tor", "eval", "buy", "accept"].map(k => `<option value="${k}" ${d && d.kind === k ? "selected" : ""}>${tx(COMMITTEES[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:1 1 200px"><label for="fee-d">${L("วันที่ประชุม (บรรทัดละ 1 วัน)", "Meeting dates (one per line)")}</label><textarea id="fee-d" rows="2" style="width:100%">${d ? d.dates.join("\n") : TODAY}</textarea></div><button class="btn" type="submit">${L("สร้างตารางเข้าประชุม", "Build the attendance grid")}</button></form>
    ${d ? `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>${L("กรรมการ", "Member")}</th>${d.dates.map(x => `<th class="c">${fdate(x)}${isOff(x) ? `<div class="sub">${L("วันหยุด", "day off")}</div>` : ""}</th>`).join("")}</tr></thead><tbody>${d.members.map(m => `<tr><td>${esc(userName(m.u))} <span class="sub">${m.pos === "chair" ? L("ประธาน", "chair") : L("กรรมการ", "member")}</span></td>${d.dates.map(x => `<td class="c"><input type="checkbox" data-fatt="${m.u}|${x}" ${(d.att[m.u] || {})[x] ? "checked" : ""} aria-label="${esc(userName(m.u))} ${x}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="row" style="margin-top:8px"><button class="btn" type="button" id="fee-calc">${L("คำนวณ", "Calculate")}</button>${prev ? `<button class="btn primary" type="button" id="fee-send" ${prev.over || !prev.total ? "disabled" : ""}>${L("ส่งขออนุมัติ", "Send for approval")}</button>` : ""}</div>` : ""}
    ${prev ? `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>${L("กรรมการ", "Member")}</th><th class="n">${L("ครั้งที่เบิกได้", "Paid meetings")}</th><th class="n">${L("อัตรา", "Rate")}</th><th class="n">${L("ก่อนเพดาน", "Before cap")}</th><th class="n">${L("ยอดเบิก", "Claim")}</th><th>${L("หมายเหตุ", "Notes")}</th></tr></thead><tbody>${prev.rows.map(r => `<tr><td>${esc(userName(r.u))}</td><td class="n">${r.n}</td><td class="n">${fmt(r.rate)}</td><td class="n">${fmt(r.gross)}</td><td class="n"><b>${fmt(r.net)}</b></td><td class="sub">${r.notes.map(esc).join("<br>") || "—"}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="4"><b>${L("รวม", "Total")}</b></td><td class="n"><b>${fmt(prev.total)}</b></td><td class="sub">${L("เบิกแล้วของแฟ้มนี้", "Already claimed on this case")} ${fmt(prev.caseUsed)} / ${L("เพดาน", "cap")} ${fmt(prev.caseCap)} ${prev.over ? tag(L("เกินเพดานของแฟ้ม ส่งไม่ได้", "Over the case cap: can't be sent"), "p-bad") : ""}</td></tr></tfoot></table></div>` : ""}</div></section>` : ""}
  <section class="panel"><header><h2>${L("รายการเบิก", "Claims")}</h2></header>${F.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("แฟ้ม", "Case")}</th><th>${L("คณะกรรมการ", "Committee")}</th><th class="n">${L("ยอดรวม (บาท)", "Total")}</th><th>${L("ผู้อนุมัติตามวงเงิน", "Approver by amount")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead><tbody>${F.map(f => { const who = f.total <= P.feeLadder ? "prochead" : "exec", can = f.status === "pending" && ((who === "prochead" && ROLE === "prochead") || (who === "exec" && canSpend()));
    return `<tr><td class="mono">${esc(f.docNo)}</td><td class="sub">${f.case}</td><td class="sub">${tx(COMMITTEES[f.kind])}<div>${f.dates.map(fdate).join(", ")}</div></td><td class="n">${fmt(f.total)}</td><td class="sub">${who === "prochead" ? L("หัวหน้าพัสดุ", "Head of procurement") : L("ผู้บริหาร", "Executive")}</td><td>${tag(tx(FEE_ST[f.status][0]), FEE_ST[f.status][1])}${f.decided ? `<div class="sub">${esc(userName(f.decided.by))}${f.decided.note ? " · " + esc(f.decided.note) : ""}</div>` : ""}</td>
      <td>${can ? `<div class="row"><input type="text" id="fn-${f.id}" placeholder="${L("หมายเหตุ", "Note")}" style="width:120px"><button class="btn primary" type="button" data-fok="${f.id}">${L("อนุมัติ", "Approve")}</button><button class="btn" type="button" data-fno="${f.id}">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีรายการเบิก", "No claims yet")}</div>`}</section>`;
};
{
  const bb = BIND.procurement;
  BIND.procurement = () => {
    bb();
    const redo = msg => { commit(); renderShell(); route(); if (msg) toast(msg); };
    const fs = $("#fee-start"); if (fs) fs.onsubmit = e => { e.preventDefault(); const caseId = $("#fee-c").value, kind = $("#fee-k").value, c = caseOf(caseId), dates = [...new Set($("#fee-d").value.split(/[\n\r,;]+/).map(x => x.trim()).filter(Boolean))].sort();
      if (!dates.length || dates.some(x => !/^\d{4}-\d{2}-\d{2}$/.test(x))) { toast(L("วันที่ต้องเป็นรูปแบบ YYYY-MM-DD", "Dates must be YYYY-MM-DD")); return; }
      if (new Set(dates.map(x => x.slice(0, 7))).size > 1) { toast(L("หนึ่งใบเบิกครอบคลุมเดือนเดียว", "One claim covers one month")); return; }
      const members = feeMembers(c, kind); if (!members.length) { toast(L("แฟ้มนี้ยังไม่มีคณะกรรมการชุดนี้", "This case has no such committee")); return; }
      FEE_DRAFT = { caseId, kind, dates, members, att: Object.fromEntries(members.map(m => [m.u, Object.fromEntries(dates.map(x => [x, true]))])), preview: null }; route(); };
    $$("[data-fatt]").forEach(b => (b.onchange = () => { const [u, dt] = b.dataset.fatt.split("|"); FEE_DRAFT.att[u][dt] = b.checked; FEE_DRAFT.preview = null; route(); }));
    const fc = $("#fee-calc"); if (fc) fc.onclick = () => { FEE_DRAFT.preview = feeCalc(FEE_DRAFT); route(); };
    const fsd = $("#fee-send"); if (fsd) fsd.onclick = () => { const d = FEE_DRAFT, pv = feeCalc(d); if (pv.over || !pv.total) { toast(L("ส่งไม่ได้", "Can't send")); return; }
      const f = { id: `FC-${FAM_FY}-${String((S.fees || []).length + 1).padStart(3, "0")}`, docNo: docNo("fee", "", d.caseId), case: d.caseId, kind: d.kind, dates: d.dates, rows: pv.rows, total: pv.total, by: me().id, t: nowIso(), status: "pending", decided: null };
      (S.fees = S.fees || []).push(f); FEE_DRAFT = null; notify([f.total <= P3().feeLadder ? "prochead" : "exec"], [`ใบเบิกค่าตอบแทนกรรมการ ${f.docNo} รออนุมัติ ${fmt(f.total)} บาท`, `Committee fee claim ${f.docNo} is waiting: ${fmt(f.total)} baht`], "prc-fees");
      audit(["ส่งใบเบิกค่าตอบแทนกรรมการ", "Sent a committee fee claim"], `${f.id} ${fmt(f.total)}`); redo(`${L("ส่งแล้ว เลขที่", "Sent, no.")} ${f.docNo}`); };
    const decide = (id, ok) => { const f = S.fees.find(x => x.id === id), note = ($("#fn-" + id).value || "").trim(); if (f.by === me().id) { toast(L("ผู้เบิกกับผู้อนุมัติต้องเป็นคนละคน", "The person who raised the claim cannot approve it")); return; }
      if (!ok && note.length < 3) { toast(L("ระบุเหตุผลอย่างน้อย 3 ตัวอักษร", "Give a reason of at least 3 characters")); return; }
      f.status = ok ? "approved" : "rejected"; f.decided = { by: me().id, t: nowIso(), note }; audit([ok ? "อนุมัติใบเบิกค่าตอบแทนกรรมการ" : "ไม่อนุมัติใบเบิกค่าตอบแทนกรรมการ", ok ? "Approved a committee fee claim" : "Rejected a committee fee claim"], `${f.id} ${fmt(f.total)}`); redo(L("บันทึกแล้ว", "Saved")); };
    $$("[data-fok]").forEach(b => (b.onclick = () => decide(b.dataset.fok, true))); $$("[data-fno]").forEach(b => (b.onclick = () => decide(b.dataset.fno, false)));
  };
}

// ---------- supplier portal: ask for a bank-account change (FR-PR-79, feeds Finance's list) ----------
VP_TABS.push(["bank", ["บัญชีธนาคาร", "Bank account"], "V4"]);
{
  const base = VIEWS.vportal;
  VIEWS.vportal = () => {
    if (VP_TAB !== "bank" || !vpMe() || !vpOn()) return base();
    const v = vpMe(), C = (S.vendorChanges || []).filter(x => x.vendor === v.id), B = typeof BANKS !== "undefined" ? BANKS : ["ธนาคารกรุงไทย"];
    return `<div class="head"><div><div class="eyebrow">Fisko Procurement · ${L("พอร์ทัลผู้ขาย (จำลอง)", "Supplier portal (simulated)")}</div><h1>${L("บัญชีธนาคาร", "Bank account")}</h1><p>${esc(v.name)}</p></div></div>
    <section class="panel"><header><h2>${L("บัญชีปัจจุบัน", "Current account")}</h2></header><div class="body">${v.bank ? `${esc(v.bank.bank)} · <span class="mono">${esc(v.bank.acct)}</span> <span class="sub">${fdate(v.bank.t)}</span>` : `<span class="sub">${L("ยังไม่มีข้อมูล", "None on record")}</span>`}</div></section>
    <section class="panel"><header><h2>${L("ขอเปลี่ยนบัญชี", "Ask to change the account")}</h2><span class="sp"></span><span class="mono sub">FR-PR-79</span></header><div class="body"><form class="inline-form" id="vb-form"><div class="f" style="flex:1 1 220px"><label for="vb-bank">${L("ธนาคาร", "Bank")}</label><select id="vb-bank">${B.map(b => `<option>${b}</option>`).join("")}</select></div><div class="f" style="flex:0 1 200px"><label for="vb-acct">${L("เลขที่บัญชี (10 หลัก)", "Account no. (10 digits)")}</label><input type="text" id="vb-acct" inputmode="numeric" required></div>
      <div class="f" style="flex:1 1 100%"><label class="field-inline"><input type="checkbox" id="vb-book" required> ${L("แนบสำเนาหน้าสมุดบัญชี (จำลอง)", "Copy of the bank book attached (simulated)")}</label></div><button class="btn primary" type="submit">${L("ส่งคำขอ", "Send the request")}</button></form>
      <div class="sub" style="margin-top:6px">${L("เจ้าหน้าที่การเงินอีกคนต้องยืนยันก่อนบัญชีใหม่มีผล (SD-14)", "A second person in Finance must confirm before the new account takes effect (SD-14)")}</div></div></section>
    <section class="panel"><header><h2>${L("คำขอที่ส่งแล้ว", "Requests sent")}</h2></header><div class="tbl-wrap"><table><tbody>${C.map(x => `<tr><td class="mono">${esc(x.id)}</td><td>${esc(x.bank)} · ${esc(x.acct)}</td><td>${tag(x.status === "confirmed" ? L("ยืนยันแล้ว", "Confirmed") : L("รอยืนยัน", "Waiting"), x.status === "confirmed" ? "p-ok" : "p-info")}</td></tr>`).join("") || `<tr><td class="sub">—</td></tr>`}</tbody></table></div></section>`;
  };
  const bb = BIND.vportal;
  BIND.vportal = () => {
    bb();
    const f = $("#vb-form"); if (f) f.onsubmit = e => { e.preventDefault(); const acct = $("#vb-acct").value.trim(), v = vpMe(); if (!/^\d{10}$/.test(acct)) { toast(L("เลขที่บัญชีต้องเป็นตัวเลข 10 หลัก", "The account number must be 10 digits")); return; }
      const ch = { id: `VB-${FAM_FY}-${String((S.vendorChanges || []).length + 1).padStart(2, "0")}`, vendor: v.id, bank: $("#vb-bank").value, acct, by: me().id, t: nowIso(), status: "pending", done: null, via: "portal" }; (S.vendorChanges = S.vendorChanges || []).push(ch);
      notify(["finhead", "fin"], [`ผู้ขาย ${v.name} ขอแก้บัญชีธนาคาร ${ch.id} รอยืนยัน`, `${v.name} asks to change its bank account ${ch.id}`], "fnc-pay"); audit(["ผู้ขายขอแก้บัญชีธนาคารผ่านพอร์ทัล (จำลอง)", "A supplier asked to change its bank account in the portal (simulated)"], `${ch.id} ${v.id}`); commit(); route(); toast(L("ส่งคำขอแล้ว", "Request sent")); };
  };
}

// ---------- M10: T3 settings ----------
{
  const base = ADMIN.procprof, bb = BIND_ADMIN.procprof;
  ADMIN.procprof = () => {
    const ad = isAdmin(), p = P3(), num = (id, lbl, val, hint) => `<div class="f" style="flex:0 1 190px"><label for="${id}">${lbl}</label><input type="number" id="${id}" min="0" step="any" value="${val}" ${ad ? "" : "disabled"}><span class="sub">${hint}</span></div>`;
    return base() + `<section class="panel"><header><h2>${L("ค่าตั้งรอบ T3", "Round T3 settings")}</h2></header><div class="body inline-form">
      ${num("p3-drawingReplyDays", L("ตอบอนุมัติแบบภายใน (วัน)", "Reply on drawings within (days)"), p.drawingReplyDays, CONF_TAG("C"))}${num("p3-feeMonthCap", L("เพดานค่าตอบแทนต่อคนต่อเดือน (บาท)", "Fee cap per person a month (baht)"), p.feeMonthCap, CONF_TAG("C"))}${num("p3-feeLadder", L("ถึงวงเงินนี้ หัวหน้าพัสดุอนุมัติ (บาท)", "Up to this the head approves (baht)"), p.feeLadder, CONF_TAG("C"))}
      ${num("p3-feeCasePct", L("เพดานค่าตอบแทนต่อแฟ้ม (ร้อยละของวงเงิน)", "Fee cap per case (% of value)"), p.feeCasePct, CONF_TAG("C"))}${num("p3-feeMinAttendPct", L("เกณฑ์เข้าประชุมขั้นต่ำ (ร้อยละ)", "Minimum attendance (%)"), p.feeMinAttendPct, CONF_TAG("C"))}
      <div class="f" style="flex:1 1 100%"><label class="field-inline"><input type="checkbox" id="p3-feeHolidayOk" ${p.feeHolidayOk ? "checked" : ""} ${ad ? "" : "disabled"}> ${L("จ่ายค่าตอบแทนสำหรับวันหยุดได้", "Allow fees for meetings on days off")}</label></div></div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("คณะกรรมการ", "Committee")}</th><th class="n">${L("ประธาน (บาทต่อครั้ง)", "Chair (baht a meeting)")}</th><th class="n">${L("กรรมการ (บาทต่อครั้ง)", "Member (baht a meeting)")}</th></tr></thead><tbody>${["tor", "eval", "buy", "accept"].map(k => `<tr><td>${tx(COMMITTEES[k])}</td><td class="n"><input type="number" id="p3-fee-${k}-0" min="0" value="${p.fee[k][0]}" style="width:110px" ${ad ? "" : "disabled"}></td><td class="n"><input type="number" id="p3-fee-${k}-1" min="0" value="${p.fee[k][1]}" style="width:110px" ${ad ? "" : "disabled"}></td></tr>`).join("")}</tbody></table></div>
      <div class="body"><div class="sub" style="margin-bottom:6px">${L("หมวดพัสดุที่ต้องส่งแบบ (เมื่อเปิดสวิตช์ “อนุมัติแบบ”)", "Categories that need drawings (when the drawing switch is on)")}</div><div class="row" style="flex-wrap:wrap">${(S.pcat || []).map(k => `<label class="field-inline" style="min-width:230px"><input type="checkbox" name="p3-cat" value="${k.id}" ${S.prof.drawCats.includes(k.id) ? "checked" : ""} ${ad ? "" : "disabled"}> ${tx(k.name)}</label>`).join("")}</div></div>
      ${ad ? `<div class="body"><button class="btn primary" type="button" id="p3-save">${L("บันทึก", "Save")}</button></div>` : ""}</section>`;
  };
  BIND_ADMIN.procprof = () => {
    bb();
    const sv = $("#p3-save"); if (sv) sv.onclick = () => { const v = {}; for (const k of ["drawingReplyDays", "feeMonthCap", "feeLadder", "feeCasePct", "feeMinAttendPct"]) v[k] = Number($("#p3-" + k).value);
      const fee = {}; for (const k of ["tor", "eval", "buy", "accept"]) fee[k] = [Number($(`#p3-fee-${k}-0`).value), Number($(`#p3-fee-${k}-1`).value)];
      if (Object.values(v).some(x => !(x >= 0)) || v.feeMinAttendPct > 100 || Object.values(fee).flat().some(x => !(x >= 0))) { toast(L("ค่าไม่ถูกต้อง", "Check the values")); return; }
      Object.assign(S.prof.p3, v, { fee, feeHolidayOk: $("#p3-feeHolidayOk").checked }); S.prof.drawCats = $$("[name=p3-cat]:checked").map(x => x.value);
      audit(["แก้ค่าตั้งโปรไฟล์จัดซื้อ (รอบ T3)", "Changed profile settings (T3)"], Object.entries(v).map(([k, x]) => `${k}=${x}`).join(" ") + ` drawCats=${S.prof.drawCats.join(",")}`); commit(); route(); toast(L("บันทึกแล้ว", "Saved")); };
  };
}
