// Finance CRUD round FC4 (Fisko_Finance_CRUD_Design.html, chapter 6.2): commitments outside procurement on the shared
// list (FR-FC-02). A commitment with no voucher yet can be changed in full; once a voucher uses it only the last
// payment date changes, with a reason. Releasing part of it asks how much; cancelling releases what no voucher holds
// (R-FC-04: not while a voucher is between checking and payment). One never used, with no PO, can be deleted.
const FCM_ST = { open: [["มีผล", "Open"], "p-ok"], used: [["ใช้ครบแล้ว", "Used up"], "p-mute"], off: [["ยกเลิก", "Cancelled"], "p-mute"] };
const fcmVcs = c => (S.vouchers || []).filter(v => v.commit === c.id && !["cancelled", "rejected"].includes(v.state));
const fcmX = c => finCommits().find(y => y.id === c.id);
const fcmSt = c => (c.cancelled ? "off" : fcLeft(fcmX(c)) > 0 ? "open" : "used");
const fcmLines = () => famLines().filter(l => l.type === "ope" || l.type === "inv");
CRUD.def("fnCm", {
  noun: ["วงเงินผูกพันนอกการจัดซื้อ", "Commitment outside procurement"], st: FCM_ST, list: () => (S.fcommit = S.fcommit || []), id: c => c.id, title: c => tx(c.name), sub: c => `${tx(FC_KIND[c.kind])} · ${esc(tx(c.vendor))} · <span class="mono">${c.line}</span>`,
  status: fcmSt, gone: c => !!c.cancelled, search: c => `${c.id} ${c.name.join(" ")} ${c.vendor.join(" ")} ${c.line}`,
  filters: [{ id: "kind", label: ["ประเภท", "Kind"], opts: () => ["utility", "rent", "service", "travel"].map(k => [k, tx(FC_KIND[k])]), get: c => c.kind }],
  cols: [{ h: ["เลขที่", "No."], sort: c => c.id, c: c => `<span class="mono">${c.id}</span>` }, { h: ["รายการ", "Item"], c: c => `${esc(tx(c.name))}<div class="sub">${tx(FC_KIND[c.kind])} · ${esc(tx(c.vendor))} · ${L("ถึง", "to")} ${fdate(c.due)}</div>` },
    { h: ["ผูกพัน (บาท)", "Committed (baht)"], n: true, sort: c => c.amount, c: c => fmt(c.amount - (c.released || 0)) }, { h: ["จ่ายแล้ว", "Paid"], n: true, c: c => fmt(c.paid || 0) },
    { h: ["คงค้าง", "Left"], n: true, sort: c => fcLeft(fcmX(c)), c: c => `${fmt(fcLeft(fcmX(c)))}${vcReserved(y => y.commit === c.id) ? `<div class="sub">${L("จองโดยใบขอเบิก", "held by vouchers")} ${fmt(vcReserved(y => y.commit === c.id))}</div>` : ""}` }],
  fields: (c, v) => {
    const used = c && fcmVcs(c).length > 0, line = v.line || (c ? c.line : (fcmLines()[0] || {}).id);
    const cap = famHeadroom(line) + (c && c.line === line ? c.amount - (c.released || 0) : 0);
    return [
      { id: "kind", label: ["ประเภท", "Kind"], type: "select", req: true, value: c ? c.kind : "utility", lock: used, show: c && tx(FC_KIND[c.kind]), opts: ["utility", "rent", "service", "travel"].map(k => [k, tx(FC_KIND[k])]) },
      { id: "th", label: ["รายการ (ไทย)", "Item (Thai)"], req: true, wide: true, value: c ? c.name[0] : "", lock: used, show: c && esc(c.name[0]) },
      { id: "en", label: ["รายการ (อังกฤษ)", "Item (English)"], wide: true, value: c ? c.name[1] : "", lock: used, show: c && esc(c.name[1]) },
      { id: "vendor", label: ["เจ้าหนี้", "Payee"], req: true, value: c ? tx(c.vendor) : "", lock: used, show: c && esc(tx(c.vendor)) },
      { id: "line", label: ["รายการจัดสรร", "Allocation line"], type: "select", req: true, wide: true, value: line, lock: used, show: c && `<span class="mono">${c.line}</span> ${esc(lineLabel(famLine(c.line)))}`, opts: fcmLines().map(l => [l.id, `${lineLabel(l)} · ${L("ว่าง", "free")} ${fmt(famHeadroom(l.id))}`]) },
      { id: "amount", label: ["วงเงิน (บาท)", "Amount (baht)"], type: "number", req: true, min: 1, value: c ? c.amount : "", lock: used, show: c && fmt(c.amount), hint: used ? L("มีใบขอเบิกใช้แล้ว แก้วงเงินไม่ได้ ใช้ “คืนวงเงิน” แทน", "Vouchers use it, so the amount can't change; use Release instead") : `${L("ไม่เกิน", "At most")} ${fmt(cap)} ${L("บาท (ข้อ 18)", "baht (clause 18)")}` },
      { id: "due", label: ["จ่ายงวดสุดท้าย", "Last payment"], type: "date", req: true, value: c ? c.due : FY_END },
    ];
  },
  live: true,
  check: (v, c) => { const used = c && fcmVcs(c).length > 0; if (used) return []; const cap = famHeadroom(v.line) + (c && c.line === v.line ? c.amount - (c.released || 0) : 0);
    return [v.amount > cap && { f: "amount", m: L(`เกินวงเงินคงเหลือของรายการจัดสรร ${fmt(cap)} บาท (ข้อ 18)`, `More than the line has left, ${fmt(cap)} baht (clause 18)`) }].filter(Boolean); },
  create: { can: () => ROLE === "fin", label: ["บันทึกผูกพัน", "Add a commitment"], run: v => {
    const F = S.fcommit = S.fcommit || []; S.fcSeq = Math.max(S.fcSeq || 0, maxNo(F.map(x => x.id), new RegExp(`^CM-${FAM_FY}-(\\d+)`))) + 1;
    const c = { id: `CM-${FAM_FY}-${String(S.fcSeq).padStart(3, "0")}`, kind: v.kind, name: [v.th, v.en || v.th], vendor: [v.vendor, v.vendor], line: v.line, amount: Math.round(v.amount), released: 0, paid: 0, signed: TODAY, due: v.due, gfPo: null, by: me().id, t: nowIso(), log: [] };
    F.push(c); audit(["บันทึกวงเงินผูกพัน", "Added a commitment"], `${c.id} · ${fmt(c.amount)}`); return c; } },
  edit: { can: c => ROLE === "fin" && !c.cancelled, why: c => fcmVcs(c).length > 0, run: (c, v, why) => {
    const used = fcmVcs(c).length > 0, old = `${fmt(c.amount)}/${c.line}/${c.due}`;
    if (!used) { c.kind = v.kind; c.name = [v.th, v.en || v.th]; c.vendor = [v.vendor, v.vendor]; c.line = v.line; c.amount = Math.round(v.amount); }
    c.due = v.due; (c.log = c.log || []).push({ t: nowIso(), by: me().id, edit: true, why: why || "" });
    audit(["แก้ไขวงเงินผูกพัน", "Edited a commitment"], `${c.id} · ${old} → ${fmt(c.amount)}/${c.line}/${c.due}${why ? " · " + why : ""}`); } },
  acts: c => {
    if (ROLE !== "fin" || c.cancelled) return [];
    const free = fcFree(fcmX(c)), held = vcReserved(y => y.commit === c.id), out = [];
    if (free > 0) out.push({ id: "rel", label: L("คืนวงเงินบางส่วน", "Release part"), why: true, num: { label: ["ยอดที่คืน (บาท)", "Amount to release (baht)"], max: free, value: free },
      impact: () => L(`คืนได้ไม่เกิน ${fmt(free)} บาท (ยอดที่ใบขอเบิกจองไว้ ${fmt(held)} บาทคืนไม่ได้) วงเงินกลับไปที่รายการ ${c.line}`, `Up to ${fmt(free)} baht (the ${fmt(held)} baht vouchers hold can't be released); it goes back to line ${c.line}`),
      run: (_, why, amt) => { c.released = (c.released || 0) + Math.round(amt); (c.log = c.log || []).push({ t: nowIso(), by: me().id, amt: Math.round(amt), why });
        audit(["คืนวงเงินผูกพัน", "Released a commitment"], `${c.id} · ${fmt(amt)} · ${why}`); notify(["plan"], [`การเงินคืนวงเงินผูกพัน ${c.id} ${fmt(amt)} บาท ไปที่รายการ ${c.line}`, `Finance released ${fmt(amt)} baht of ${c.id} back to line ${c.line}`], "alloc-lines"); return L("คืนวงเงินแล้ว", "Released"); } });
    if (!held && !(c.paid > 0) && !fcmVcs(c).length && !c.gfPo) out.push({ id: "del", label: L("ลบรายการที่บันทึกผิด", "Delete (entered by mistake)"), kind: "danger", why: true, impact: () => L("ยังไม่เคยมีใบขอเบิกหรือ PO เลขที่นี้จะไม่นำกลับมาใช้", "No voucher or PO ever used it; its number won't be reused"),
      run: (_, why) => { S.fcommit = S.fcommit.filter(x => x !== c); audit(["ลบวงเงินผูกพันที่บันทึกผิด", "Deleted a commitment entered by mistake"], `${c.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } });
    else if (fcLeft(fcmX(c)) > 0) out.push({ id: "off", label: L("ยกเลิกยอดที่เหลือ", "Cancel what is left"), kind: "danger", why: true,
      impact: () => (held ? L(`ยังมีใบขอเบิกจองอยู่ ${fmt(held)} บาท ต้องจ่ายหรือยกเลิกใบก่อน (R-FC-04)`, `Vouchers still hold ${fmt(held)} baht; pay or cancel them first (R-FC-04)`) : L(`คืน ${fmt(fcLeft(fcmX(c)))} บาทให้รายการ ${c.line} และปิดผูกพันนี้`, `Gives ${fmt(fcLeft(fcmX(c)))} baht back to line ${c.line} and closes this commitment`)),
      run: (_, why) => { if (vcReserved(y => y.commit === c.id)) { toast(L("ยังมีใบขอเบิกจองอยู่ (R-FC-04)", "Vouchers still hold part of it (R-FC-04)")); return null; }
        const amt = fcLeft(fcmX(c)); c.released = (c.released || 0) + amt; c.cancelled = { t: nowIso(), by: me().id, why, amt }; (c.log = c.log || []).push({ t: nowIso(), by: me().id, amt, why, cancel: true });
        audit(["ยกเลิกวงเงินผูกพันที่เหลือ", "Cancelled what was left of a commitment"], `${c.id} · ${fmt(amt)} · ${why}`); return L("ยกเลิกแล้ว", "Cancelled"); } });
    return out;
  },
  view: c => { const x = fcmX(c), V = fcmVcs(c);
    return kv([[L("รายการ", "Item"), `${esc(tx(c.name))} · ${tx(FC_KIND[c.kind])}`], [L("เจ้าหนี้", "Payee"), esc(tx(c.vendor))], [L("รายการจัดสรร", "Allocation line"), `<span class="mono">${c.line}</span> ${esc(lineLabel(famLine(c.line)))}`],
      [L("วงเงิน", "Amount"), `${fmt(c.amount)} · ${L("คืนแล้ว", "released")} ${fmt(c.released || 0)} · ${L("จ่ายแล้ว", "paid")} ${fmt(c.paid || 0)} · ${L("ว่าง", "free")} ${fmt(fcFree(x))}`],
      [L("จ่ายงวดสุดท้าย", "Last payment"), fdate(c.due)], [L("PO ใน GFMIS", "GFMIS PO"), c.gfPo ? `<span class="mono">${esc(c.gfPo.no)}</span>` : poKind(x) && c.amount >= fcfg().poMin ? L("ยังไม่มี (บันทึกที่แท็บ ทุกรายการและ PO)", "None yet (record it on the All and POs tab)") : "—"],
      [L("ใบขอเบิก", "Vouchers"), V.map(v => `<span class="mono">${v.id}</span> ${tx(VST[vState(v)][0])} ${fmt(vCalc(v).spend)}`).join("<br>") || "—"],
      c.cancelled && [L("ยกเลิก", "Cancelled"), `${esc(userName(c.cancelled.by))} · ${fdate(c.cancelled.t, true)} · ${esc(c.cancelled.why)}`]])
      + ((c.log || []).filter(l => l.amt).length ? `<h3 style="font-size:14px;margin:12px 0 4px">${L("การคืนวงเงิน", "Releases")}</h3>${c.log.filter(l => l.amt).map(l => `<div class="sub">${fdate(l.t, true)} · ${esc(userName(l.by))} · ${fmt(l.amt)} · ${esc(l.why)}</div>`).join("")}` : ""); },
  hist: c => c.id,
});
FS.commitOther = () => crudList("fnCm", { head: `<h2>${L("ผูกพันที่ไม่ใช่การจัดซื้อ", "Commitments outside procurement")}</h2><span class="sp"></span><span class="sub">${L("กันวงเงินจากรายการจัดสรร (ข้อ 18) · สาธารณูปโภค ค่าเช่า บริการ เดินทาง", "Reserves the allocation line (clause 18) · utilities, rent, services, travel")}</span>`, empty: L("ยังไม่มี", "None yet") });
