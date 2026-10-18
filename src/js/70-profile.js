// Fisko Procurement round 36 (T1 of design v0.3, chapter 18): the agency profile and feature switches (FR-PR-63),
// automatic document numbers (FR-PR-80), public hearing of the TOR (FR-PR-64, R-25), RFQ and invitation letters
// (FR-PR-65), extra item fields with VAT and ERP references (FR-PR-67) and price extras (FR-PR-68).
// Government and state-enterprise agencies use the same product; what differs is a profile in M10.
// E-mail, vendor replies and price index files are simulated (D-P17). The small-budget method (FR-PR-85) is deferred.

const PROF_TYPES = { gov: ["ส่วนราชการ", "Government agency"], soe: ["รัฐวิสาหกิจ", "State enterprise"] };
const PROF_FEATS = [
  { k: "hearing", round: "T1", gov: false, soe: true, th: "รับฟังความคิดเห็น TOR", en: "Public hearing of the TOR", tor: "ผนวก 12 s.2", built: true },
  { k: "rfq", round: "T1", gov: true, soe: true, th: "ใบสอบถามราคาและหนังสือเชิญ", en: "RFQ and invitation letters", tor: "ผนวก 12 s.1", built: true },
  { k: "erpRef", round: "T1", gov: false, soe: true, th: "รหัสอ้างอิง ERP (WBS ใบขอซื้อ ใบสั่งซื้อ)", en: "ERP reference codes (WBS, PR, PO)", tor: "5.2", built: true },
  { k: "vendorPortal", round: "T2", gov: false, soe: true, th: "ผู้ขายเข้าระบบ (Vendor portal)", en: "Vendor portal", tor: "5.1.7" },
  { k: "smeMit", round: "T2", gov: true, soe: true, th: "สิทธิพิเศษ SME และสินค้า MiT", en: "SME and MiT preference", tor: "ผนวก 12 s.3.1.1.1.4–6" },
  { k: "bidSec", round: "T2", gov: true, soe: true, th: "หลักประกันการเสนอราคา", en: "Bid security", tor: "5.1.16" },
  { k: "sampleTest", round: "T2", gov: false, soe: true, th: "ตัวอย่างและทดสอบ (Type Test)", en: "Samples and type tests", tor: "ผนวก 12 s.4.5–4.7" },
  { k: "drawing", round: "T3", gov: false, soe: true, th: "อนุมัติแบบ", en: "Drawing approval", tor: "ผนวก 12 s.4.2" },
  { k: "commFee", round: "T3", gov: true, soe: true, th: "ค่าตอบแทนกรรมการ", en: "Committee fees", tor: "5.1.6" },
  { k: "smallBudget", round: "deferred", gov: false, soe: true, th: "วิธีวงเงินเล็กน้อยตามระเบียบ (MR-06)", en: "Small-budget method (MR-06)", tor: "ผนวก 12 s.2" },
];
const PROF_DEFAULT_P = { hearingMin: 5000000, hearingDays: 7, rfqMin: 3, rfqDays: 3, vatPct: 7 };
const DOC_TYPES = { rfq: ["ใบสอบถามราคา / หนังสือเชิญ", "RFQ / invitation letter"], hear: ["ประกาศรับฟังความคิดเห็น TOR", "Hearing notice"] };
const feat = k => !!(S.prof && S.prof.sw && S.prof.sw[k]);
const profType = () => (S.prof ? S.prof.type : "gov");

function profDefaults(type) { const sw = {}; PROF_FEATS.forEach(f => (sw[f.k] = !!f[type])); return sw; }

// ---------- document numbers (FR-PR-80) ----------
function docNoFmt(type, n, unitId) {
  const f = S.docno.fmt[type], u = f.unit && unitId ? (unitOf(unitId).code || "") : "";
  return `${f.pfx}${u ? "-" + u : ""}/${String(n).padStart(f.pad, "0")}/${FAM_FY}`;
}
function docNo(type, unitId, ref) {
  const f = S.docno.fmt[type], key = `${type}|${FAM_FY}|${f.unit && unitId ? unitId : ""}`;
  const n = (S.docno.ctr[key] || 0) + 1; S.docno.ctr[key] = n;
  const no = docNoFmt(type, n, unitId);
  S.docno.log.unshift({ no, type, t: nowIso(), by: me().id, ref: ref || "" }); if (S.docno.log.length > 300) S.docno.log.length = 300;
  return no;
}

// ---------- seed ----------
function seedProfile(s) {
  s.prof = { type: "gov", sw: profDefaults("gov"), p: { ...PROF_DEFAULT_P } };
  s.docno = { fmt: { rfq: { pfx: "พด", pad: 3, unit: true }, hear: { pfx: "รพ", pad: 3, unit: false } }, ctr: {}, log: [] };
  s.priceIdx = [
    { k: "oil", name: ["ราคาน้ำมันดีเซล (บาท/ลิตร)", "Diesel price (baht/litre)"], date: "2026-09-30", value: 31.2 }, { k: "oil", name: ["ราคาน้ำมันดีเซล (บาท/ลิตร)", "Diesel price (baht/litre)"], date: "2026-10-15", value: 32.1 },
    { k: "cu", name: ["ทองแดง LME (ดอลลาร์/ตัน)", "LME copper (USD/tonne)"], date: "2026-09-30", value: 9480 }, { k: "cu", name: ["ทองแดง LME (ดอลลาร์/ตัน)", "LME copper (USD/tonne)"], date: "2026-10-15", value: 9710 },
    { k: "fx", name: ["อัตราแลกเปลี่ยน USD/THB", "USD/THB"], date: "2026-09-30", value: 34.9 }, { k: "fx", name: ["อัตราแลกเปลี่ยน USD/THB", "USD/THB"], date: "2026-10-15", value: 35.2 },
  ];
}

// ---------- case helpers ----------
const canProf = c => isProcRole() && !c.cancelled;
const planEst = c => (c.ref ? c.ref.amount : famPlan(c.plan).est);
const hearingReq = c => feat("hearing") && needsCompetition(c) && !!c.method && !!((c.extra && c.extra.hearing) || planEst(c) >= S.prof.p.hearingMin);
const hearingDone = c => !!(c.hearing && c.hearing.closedAt && !(c.hearing.rev && c.hearing.rev.status === "pending"));
const rfqInvited = c => new Set((c.rfq || []).flatMap(r => r.rows.map(x => x.v))).size;
Object.assign(CASE_EV, {
  hearing_open: ["เปิดรับฟังความคิดเห็น TOR", "TOR hearing opened"], hearing_comment: ["บันทึกความคิดเห็น", "Hearing comment recorded"], hearing_done: ["สรุปผลรับฟังความคิดเห็น", "Hearing concluded"],
  hearing_rev: ["เสนอแก้ TOR หลังรับฟัง", "TOR revision proposed after the hearing"], hearing_rev_ok: ["อนุมัติ TOR ฉบับแก้", "Revised TOR approved"], hearing_again: ["เปิดรับฟังซ้ำ", "Hearing reopened"],
  rfq_sent: ["ส่งใบสอบถามราคา / หนังสือเชิญ", "RFQ or invitation sent"], rfq_reply: ["ผู้ขายตอบกลับ", "Supplier replied"], extra: ["แก้ข้อมูลเพิ่มเติมของรายการ", "Item details edited"],
});

// extra checks (R-25 and the invitation minimum)
{
  const base = caseChecks;
  caseChecks = c => {
    const out = base(c), n = caseState(c), ok = (v, th, en) => ({ ok: !!v, label: L(th, en) });
    if (c.cancelled) return out;
    if (n === 4 && hearingReq(c)) out.push(ok(hearingDone(c), "สรุปผลรับฟังความคิดเห็น TOR ก่อนประกาศเชิญชวน (R-25)", "Conclude the TOR hearing before the announcement (R-25)"));
    if (n === 4 && feat("rfq") && c.method === "selective") out.push(ok(rfqInvited(c) >= S.prof.p.rfqMin, `ส่งหนังสือเชิญผู้ขายอย่างน้อย ${S.prof.p.rfqMin} ราย`, `Invite at least ${S.prof.p.rfqMin} suppliers`));
    return out;
  };
}
// tasks: RFQ replies that are due
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.cases || !feat("rfq") || !isProcRole()) return;
    S.cases.filter(c => !c.cancelled).forEach(c => (c.rfq || []).forEach(r => { const open = r.rows.filter(x => !x.reply).length; if (open && r.due <= addDays(TODAY, 1)) R(`${L("ติดตามคำตอบ RFQ", "Chase RFQ replies")} ${r.no}`, `${c.id} · ${open} ${L("ราย", "suppliers")}`, r.due, "case:" + c.id, r.due < TODAY ? "p-bad" : "p-warn"); }));
  };
}

// ---------- case panels ----------
CASE_PANELS.push(c => {
  const n = caseState(c); if (!hearingReq(c) && !c.hearing) return ""; if (n < 3) return "";
  const h = c.hearing, ed = canProf(c) && n <= 4, head = ROLE === "prochead", need = hearingReq(c), P = S.prof.p;
  const st = !h ? tag(L("ยังไม่เปิดรับฟัง", "Not opened"), need ? "p-warn" : "p-mute") : hearingDone(c) ? tag(L("สรุปผลแล้ว", "Concluded"), "p-ok") : h.rev && h.rev.status === "pending" ? tag(L("รออนุมัติ TOR ฉบับแก้", "Revised TOR awaiting approval"), "p-warn") : h.closedAt ? tag(L("สรุปผลแล้ว", "Concluded"), "p-ok") : tag(L("เปิดรับฟังอยู่", "Open"), "p-info");
  const form = !h ? (ed ? `<form class="inline-form" id="hr-open"><div class="f" style="flex:0 1 160px"><label for="hr-s">${L("เริ่มรับฟัง", "From")}</label><input type="date" id="hr-s" value="${TODAY}" required></div>
      <div class="f" style="flex:0 1 160px"><label for="hr-e">${L("ถึง", "To")}</label><input type="date" id="hr-e" value="${addDays(TODAY, P.hearingDays)}" required></div><button class="btn" type="submit">${L("เปิดรับฟังความคิดเห็น", "Open the hearing")}</button></form>` : `<span class="sub">${L("ยังไม่ได้เปิดรับฟัง", "Not opened yet")}</span>`)
    : `<div class="row"><span class="mono sub">${esc(h.docNo)}</span><span class="sub">${fdate(h.start)} – ${fdate(h.end)}</span>${h.round > 1 ? tag(`${L("ครั้งที่", "Round")} ${h.round}`, "p-mute") : ""}</div>
      ${h.comments.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ผู้ให้ความเห็น", "From")}</th><th>${L("ความเห็น", "Comment")}</th><th>${L("การตอบ", "Response")}</th><th>${L("วันที่", "Date")}</th></tr></thead><tbody>${h.comments.map(k => `<tr><td>${esc(k.who)}</td><td>${esc(k.text)}</td><td class="sub">${esc(k.resp || "—")}</td><td class="sub">${fdate(k.t)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="sub">${L("ยังไม่มีความเห็น", "No comments yet")}</div>`}
      ${h.summary ? `<div class="callout" style="margin:8px 0 0"><b>${L("สรุปผล", "Conclusion")}</b>${esc(h.summary)}${h.revised ? `<div class="sub">${L("มีการแก้ TOR", "The TOR was changed")}${h.rev ? ` · ${h.rev.status === "pending" ? L("รอหัวหน้าพัสดุอนุมัติ", "waiting for the head of procurement") : L("อนุมัติแล้ว", "approved")}` : ""}</div>` : ""}</div>` : ""}
      ${ed && !h.closedAt ? `<form class="inline-form" id="hr-cm" style="margin-top:8px"><div class="f" style="flex:0 1 180px"><label for="hr-w">${L("ผู้ให้ความเห็น", "From")}</label><input type="text" id="hr-w" required></div><div class="f" style="flex:2 1 220px"><label for="hr-t">${L("ความเห็น", "Comment")}</label><input type="text" id="hr-t" required></div><div class="f" style="flex:1 1 200px"><label for="hr-r">${L("การตอบ", "Response")}</label><input type="text" id="hr-r"></div><button class="btn" type="submit">+ ${L("เพิ่ม", "Add")}</button></form>
        <form class="inline-form" id="hr-close" style="margin-top:8px"><div class="f" style="flex:2 1 280px"><label for="hr-sum">${L("สรุปผลการรับฟัง", "Conclusion")}</label><input type="text" id="hr-sum" required></div>
          <div class="f" style="flex:0 1 200px"><label class="field-inline"><input type="checkbox" id="hr-rev"> ${L("ต้องแก้ TOR", "The TOR must change")}</label></div>
          ${h.end > TODAY ? `<div class="f" style="flex:1 1 220px"><label for="hr-early">${L("เหตุผลปิดก่อนครบกำหนด", "Reason for closing early")}</label><input type="text" id="hr-early" placeholder="${L("ยังไม่ถึง", "Ends")} ${fdate(h.end)}"></div>` : ""}<button class="btn primary" type="submit">${L("สรุปผล", "Conclude")}</button></form>` : ""}
      ${h.rev && h.rev.status === "pending" ? (head ? `<div class="body"><button class="btn primary" type="button" id="hr-revok">${L("อนุมัติ TOR ฉบับแก้ (สร้างเวอร์ชันใหม่)", "Approve the revised TOR (new version)")}</button></div>` : `<div class="sub">${L("รอหัวหน้าพัสดุอนุมัติ", "Waiting for the head of procurement")}</div>`) : ""}
      ${ed && h.closedAt && h.revised && h.rev && h.rev.status === "approved" ? `<div class="body"><button class="btn" type="button" id="hr-again">${L("เปิดรับฟังซ้ำ", "Reopen the hearing")}</button></div>` : ""}`;
  return `<section class="panel"><header><h2>${L("รับฟังความคิดเห็น TOR", "Public hearing of the TOR")}</h2><span class="sp"></span>${st}<span class="mono sub">FR-PR-64 · R-25</span></header>
    <div class="body">${need ? `<div class="sub">${L("โปรไฟล์กำหนดให้รับฟัง: วงเงินตั้งแต่", "Required by the profile: value from")} ${fmt(P.hearingMin)} ${L("บาท หรือรายการที่ติดธงรับฟัง", "baht, or an item flagged for hearing")}</div>` : `<div class="sub">${L("ไม่บังคับสำหรับแฟ้มนี้ แต่ทำได้", "Not required for this case, but allowed")}</div>`}${form}</div></section>`;
});

CASE_PANELS.push(c => {
  const n = caseState(c); if (!feat("rfq") || n < 3 || !c.method) return "";
  const R = c.rfq || [], ed = canProf(c) && n >= 3 && n <= 6, P = S.prof.p, V = S.vendors || [];
  return `<section class="panel"><header><h2>${L("ใบสอบถามราคาและหนังสือเชิญ", "RFQ and invitation letters")}</h2><span class="sp"></span><span class="sub">${L("ผู้ได้รับเชิญแล้ว", "Invited")} ${rfqInvited(c)}${c.method === "selective" ? ` / ${P.rfqMin} ${L("ขั้นต่ำ", "minimum")}` : ""}</span><span class="mono sub">FR-PR-65 · ${L("จำลองการส่ง", "send is simulated")}</span></header>
    ${R.length ? R.map((r, ri) => `<div class="body"><div class="row"><b class="mono">${esc(r.no)}</b><span class="sub">${L("ส่งเมื่อ", "Sent")} ${fdate(r.sent)} · ${L("ตอบภายใน", "reply by")} ${fdate(r.due)}</span>${r.rows.some(x => !x.reply) && r.due < TODAY ? tag(L("เลยกำหนด", "Overdue"), "p-bad") : ""}</div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ผู้ขาย", "Supplier")}</th><th>${L("สถานะ", "Status")}</th><th class="n">${L("ราคา (บาท)", "Price (baht)")}</th><th></th></tr></thead><tbody>${r.rows.map((x, xi) => `<tr><td>${esc(x.v)}</td><td>${x.reply ? tag(`${L("ตอบแล้ว", "Replied")} ${fdate(x.reply.d)}`, "p-ok") : tag(L("รอคำตอบ", "Waiting"), "p-warn")}</td>
        <td class="n">${x.reply ? (x.reply.price ? fmt(x.reply.price) : L("ไม่เสนอ", "declined")) : ed ? `<input type="number" min="0" step="1" id="rq-p-${ri}-${xi}" style="width:130px" aria-label="${L("ราคา", "Price")}">` : "—"}</td>
        <td>${!x.reply && ed ? `<button class="btn" type="button" data-rqrep="${ri}|${xi}">${L("บันทึกคำตอบ", "Record reply")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div></div>`).join("") : `<div class="body sub">${L("ยังไม่ได้ส่ง", "None sent yet")}</div>`}
    ${ed ? `<div class="body"><form id="rq-form"><div class="sub" style="margin-bottom:6px">${L("เลือกผู้ขาย (ผู้ทิ้งงานเลือกไม่ได้)", "Pick suppliers (anyone on the abandoned-work list is blocked)")}</div>
      <div class="row" style="flex-wrap:wrap">${V.map((v, i) => { const bl = blHit(v.name); return `<label class="field-inline" style="min-width:230px"><input type="checkbox" name="rq-v" value="${i}" ${bl ? "disabled" : ""}> ${esc(v.name)}${bl ? ` ${tag(L("ผู้ทิ้งงาน", "Blocked"), "p-bad")}` : ""}</label>`; }).join("")}</div>
      <div class="inline-form" style="margin-top:8px"><div class="f" style="flex:0 1 170px"><label for="rq-d">${L("ตอบภายใน", "Reply by")}</label><input type="date" id="rq-d" value="${addDays(TODAY, P.rfqDays)}" required></div><button class="btn primary" type="submit">${L("ออกเลขที่และส่งหนังสือ", "Issue a number and send")}</button></div></form></div>` : ""}</section>`;
});

const VAT_CALC = (est, mode) => { const r = S.prof.p.vatPct / 100; return mode === "in" ? { inc: est, ex: Math.round(est / (1 + r)), vat: est - Math.round(est / (1 + r)) } : { ex: est, vat: Math.round(est * r), inc: est + Math.round(est * r) }; };
CASE_PANELS.push(c => {
  const n = caseState(c); if (n < 1) return "";
  const x = c.extra || {}, ed = canProf(c) && n <= 8, est = planEst(c), v = VAT_CALC(est, x.vatMode || "ex"), erp = feat("erpRef");
  const inp = (id, lbl, val, type, w) => `<div class="f" style="flex:${w || "1 1 180px"}"><label for="${id}">${lbl}</label><input type="${type || "text"}" id="${id}" value="${esc(val || "")}" ${ed ? "" : "disabled"}></div>`;
  return `<section class="panel"><header><h2>${L("ข้อมูลเพิ่มเติมของรายการ", "Item details")}</h2><span class="sp"></span><span class="mono sub">FR-PR-67</span></header>
    <div class="body"><form class="inline-form" id="ex-form">
      <div class="f" style="flex:1 1 100%"><label class="field-inline"><input type="checkbox" id="ex-hear" ${x.hearing ? "checked" : ""} ${ed ? "" : "disabled"}> ${L("ติดธงรับฟังความคิดเห็น", "Flag for public hearing")}</label>
        <label class="field-inline"><input type="checkbox" id="ex-sme" ${x.sme ? "checked" : ""} ${ed ? "" : "disabled"}> ${L("เน้นผู้ประกอบการ SME", "Favour SMEs")}</label><label class="field-inline"><input type="checkbox" id="ex-mit" ${x.mit ? "checked" : ""} ${ed ? "" : "disabled"}> ${L("สินค้าผลิตในประเทศ (MiT)", "Made in Thailand (MiT)")}</label></div>
      ${inp("ex-std", L("มาตรฐานคุณภาพ (มอก. ISO)", "Quality standard"), x.std)}${inp("ex-spec", L("เลขอ้างอิง Spec / Drawing", "Spec or drawing no."), x.spec)}
      ${inp("ex-short", L("ผู้ขายที่ควรสอบถาม (Short list)", "Short list of suppliers"), x.short, "text", "2 1 260px")}
      ${inp("ex-deliv", L("กำหนดส่งมอบ", "Delivery date"), x.deliv, "date", "0 1 170px")}${inp("ex-place", L("สถานที่ส่งมอบ", "Delivery place"), x.place)}
      <div class="f" style="flex:0 1 200px"><label for="ex-vat">${L("วงเงินที่บันทึกเป็น", "Amount is")}</label><select id="ex-vat" ${ed ? "" : "disabled"}><option value="ex" ${x.vatMode !== "in" ? "selected" : ""}>${L("ไม่รวมภาษีมูลค่าเพิ่ม", "Excluding VAT")}</option><option value="in" ${x.vatMode === "in" ? "selected" : ""}>${L("รวมภาษีมูลค่าเพิ่ม", "Including VAT")}</option></select></div>
      ${erp ? `${inp("ex-wbs", L("WBS", "WBS"), x.wbs, "text", "0 1 150px")}${inp("ex-pr", L("เลขที่ใบขอซื้อ (ERP)", "PR no. (ERP)"), x.pr, "text", "0 1 170px")}${inp("ex-po", L("เลขที่ใบสั่งซื้อ (ERP)", "PO no. (ERP)"), x.po, "text", "0 1 170px")}` : ""}
      ${ed ? `<button class="btn" type="submit">${L("บันทึก", "Save")}</button>` : ""}</form>
      <div class="sub" style="margin-top:8px">${L("วงเงิน", "Amount")}: ${L("ไม่รวมภาษี", "ex VAT")} <b>${fmt(v.ex)}</b> · ${L("ภาษี", "VAT")} ${S.prof.p.vatPct}% <b>${fmt(v.vat)}</b> · ${L("รวมภาษี", "inc VAT")} <b>${fmt(v.inc)}</b> ${L("บาท", "baht")}${erp ? ` · ${tag(L("รหัส ERP เป็นช่องอ้างอิง ยังไม่แลกเปลี่ยนข้อมูล", "ERP codes are references only; nothing is exchanged"), "p-mute")}` : ""}</div></div></section>`;
});

// price extras: against the last purchase in the same category, and the imported index values (FR-PR-68)
function lastPurchase(c) {
  const cat = famPlan(c.plan).cat; if (!cat) return null;
  const prev = S.contracts.filter(k => k.plan !== c.plan && famPlan(k.plan).cat === cat).sort((a, b) => (b.signed || b.start || "").localeCompare(a.signed || a.start || ""))[0];
  return prev ? { id: prev.id, amount: prev.amount } : null;
}
CASE_PANELS.push(c => {
  const n = caseState(c); if (n < 3 || n > 8) return "";
  const lp = lastPurchase(c), ref = c.ref && c.ref.amount, I = S.priceIdx || [], ed = isProcRole();
  const keys = [...new Set(I.map(i => i.k))], latest = k => I.filter(i => i.k === k).sort((a, b) => b.date.localeCompare(a.date)), pct = (a, b) => (b ? ((a - b) / b) * 100 : 0);
  return `<section class="panel"><header><h2>${L("ราคากลาง: เทียบและดัชนีราคา", "Reference price: comparison and indices")}</h2><span class="sp"></span><span class="mono sub">FR-PR-68</span></header>
    <div class="body"><div class="sub">${L("เทียบกับการซื้อครั้งล่าสุดในหมวดเดียวกัน", "Against the last purchase in the same category")}: ${lp && ref ? `<b>${lp.id}</b> ${fmt(lp.amount)} ${L("บาท", "baht")} → ${L("ราคากลางนี้", "this reference price")} ${fmt(ref)} <b>${pct(ref, lp.amount) >= 0 ? "+" : ""}${pct(ref, lp.amount).toFixed(1)}%</b>` : L("ยังไม่มีข้อมูลเทียบ (ต้องมีราคากลางและสัญญาก่อนหน้าในหมวดเดียวกัน)", "No comparison yet (needs a reference price and an earlier contract in the same category)")}</div>
      ${keys.length ? `<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>${L("ดัชนี", "Index")}</th><th class="n">${L("ล่าสุด", "Latest")}</th><th>${L("วันที่", "Date")}</th><th class="n">${L("เปลี่ยน", "Change")}</th></tr></thead><tbody>${keys.map(k => { const L2 = latest(k); return `<tr><td>${tx(L2[0].name)}</td><td class="n">${fmt(L2[0].value, 2)}</td><td class="sub">${fdate(L2[0].date)}</td><td class="n">${L2[1] ? `${pct(L2[0].value, L2[1].value) >= 0 ? "+" : ""}${pct(L2[0].value, L2[1].value).toFixed(1)}%` : "—"}</td></tr>`; }).join("")}</tbody></table></div>` : ""}
      ${ed ? `<div class="body" style="padding-left:0"><div class="sub">${L("นำเข้าดัชนีราคาเป็นข้อความ (ชื่อดัชนี, วันที่ YYYY-MM-DD, ค่า) บรรทัดละรายการ", "Import index values as text (name, date YYYY-MM-DD, value), one per line")}</div><textarea id="ix-t" rows="3" style="width:100%" placeholder="ทองแดง LME, 2026-10-16, 9740"></textarea>
        <div class="row" style="margin-top:6px"><button class="btn" type="button" id="ix-add">${L("นำเข้า", "Import")}</button><button class="btn ghost" type="button" id="ix-smp">${L("ใส่ข้อมูลตัวอย่าง", "Fill a sample")}</button></div></div>` : ""}</div></section>`;
});

// ---------- binders ----------
CASE_BINDS.push((c, done) => {
  const P = S.prof.p, uid = famLine(c.line).unit;
  const ho = $("#hr-open"); if (ho) ho.onsubmit = e => { e.preventDefault(); const s = $("#hr-s").value, en = $("#hr-e").value;
    if (en < s) { toast(L("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", "The end date can't be before the start")); return; }
    c.hearing = { docNo: docNo("hear", uid, c.id), start: s, end: en, comments: [], summary: "", revised: false, rev: null, closedAt: null, round: 1, by: me().id };
    caseLog(c, "hearing_open", `${c.hearing.docNo} · ${s} – ${en}`); audit(["เปิดรับฟังความคิดเห็น TOR", "Opened a TOR hearing"], `${c.id} ${c.hearing.docNo}`); done(L("เปิดรับฟังแล้ว", "Hearing opened")); };
  const hc = $("#hr-cm"); if (hc) hc.onsubmit = e => { e.preventDefault(); c.hearing.comments.push({ who: $("#hr-w").value.trim(), text: $("#hr-t").value.trim(), resp: $("#hr-r").value.trim(), t: TODAY });
    caseLog(c, "hearing_comment", c.hearing.comments[c.hearing.comments.length - 1].who); done(); };
  const hx = $("#hr-close"); if (hx) hx.onsubmit = e => { e.preventDefault(); const sum = $("#hr-sum").value.trim(), early = $("#hr-early") ? $("#hr-early").value.trim() : "";
    if (sum.length < 5) { toast(L("สรุปผลอย่างน้อย 5 ตัวอักษร", "Write a conclusion of at least 5 characters")); return; }
    if (c.hearing.end > TODAY && early.length < 5) { toast(L("ยังไม่ถึงวันสิ้นสุด ต้องระบุเหตุผลปิดก่อนกำหนด", "The hearing has not ended; give a reason for closing early")); return; }
    const rev = $("#hr-rev").checked; if (rev && !c.tor) { toast(L("ยังไม่ได้แนบ TOR ที่จะแก้", "There is no attached TOR to change")); return; }
    Object.assign(c.hearing, { summary: sum + (early ? ` (ปิดก่อนกำหนด: ${early})` : ""), revised: rev, rev: rev ? { status: "pending", by: me().id, t: nowIso() } : null, closedAt: nowIso() });
    caseLog(c, "hearing_done", sum); if (rev) { caseLog(c, "hearing_rev", c.hearing.docNo); notify(["prochead"], [`แฟ้ม ${c.id} เสนอแก้ TOR หลังรับฟังความคิดเห็น รออนุมัติ`, `Case ${c.id}: a TOR change after the hearing is waiting for approval`], "case:" + c.id); }
    audit(["สรุปผลรับฟังความคิดเห็น TOR", "Concluded a TOR hearing"], c.id); done(rev ? L("สรุปแล้ว รอหัวหน้าพัสดุอนุมัติ TOR ฉบับแก้", "Concluded; waiting for the head to approve the revised TOR") : L("สรุปผลแล้ว", "Concluded")); };
  const rk = $("#hr-revok"); if (rk) rk.onclick = () => { if (c.hearing.rev.by === me().id) { toast(L("ผู้เสนอแก้ TOR กับผู้อนุมัติต้องเป็นคนละคน", "The person who proposed the change cannot approve it")); return; }
    c.hearing.rev = { ...c.hearing.rev, status: "approved", approvedBy: me().id, t: nowIso() }; c.tor = { ...c.tor, rev: (c.tor.rev || 1) + 1, doc: c.tor.doc.replace(/(?:([-_])v\d+)?\.pdf$/, (m, sep) => `${sep || "_"}v${(c.tor.rev || 1) + 1}.pdf`), t: nowIso(), by: me().id };
    caseLog(c, "hearing_rev_ok", c.tor.doc); audit(["อนุมัติ TOR ฉบับแก้หลังรับฟัง", "Approved a revised TOR after the hearing"], `${c.id} ${c.tor.doc}`); done(L("อนุมัติแล้ว สร้างเวอร์ชันใหม่ของ TOR", "Approved; a new TOR version was created")); };
  const ha = $("#hr-again"); if (ha) ha.onclick = () => { Object.assign(c.hearing, { round: c.hearing.round + 1, closedAt: null, summary: "", revised: false, rev: null, start: TODAY, end: addDays(TODAY, P.hearingDays) });
    caseLog(c, "hearing_again", `รอบ ${c.hearing.round}`); done(L("เปิดรับฟังซ้ำแล้ว", "Hearing reopened")); };

  const rf = $("#rq-form"); if (rf) rf.onsubmit = e => { e.preventDefault(); const V = S.vendors, picks = $$("[name=rq-v]:checked").map(i => V[Number(i.value)].name), due = $("#rq-d").value;
    if (!picks.length) { toast(L("เลือกผู้ขายอย่างน้อย 1 ราย", "Pick at least one supplier")); return; } if (due < TODAY) { toast(L("วันตอบกลับต้องไม่ก่อนวันนี้", "The reply date can't be in the past")); return; }
    const r = { no: docNo("rfq", uid, c.id), sent: TODAY, due, by: me().id, rows: picks.map(v => ({ v, reply: null })) }; (c.rfq = c.rfq || []).push(r);
    caseLog(c, "rfq_sent", `${r.no} · ${picks.length}`); audit(["ส่งใบสอบถามราคา / หนังสือเชิญ (จำลอง)", "Sent an RFQ or invitation (simulated)"], `${c.id} ${r.no}`); done(`${L("ออกเลขที่", "Issued")} ${r.no}`); };
  $$("[data-rqrep]").forEach(b => (b.onclick = () => { const [ri, xi] = b.dataset.rqrep.split("|").map(Number), row = c.rfq[ri].rows[xi], pr = Math.round(Number($(`#rq-p-${ri}-${xi}`).value) || 0);
    row.reply = { d: TODAY, price: pr, by: me().id }; caseLog(c, "rfq_reply", `${row.v} · ${pr ? fmt(pr) : "ไม่เสนอ"}`);
    if (pr && !needsCompetition(c) && !c.quotes.some(q => tx(q.vendor) === row.v)) c.quotes.push({ vendor: [row.v, row.v], price: pr, win: false });
    done(pr && !needsCompetition(c) ? L("บันทึกแล้ว และเพิ่มเป็นใบเสนอราคา", "Recorded and added as a quotation") : L("บันทึกแล้ว", "Recorded")); }));

  const ef = $("#ex-form"); if (ef) ef.onsubmit = e => { e.preventDefault(); const g = id => ($("#" + id) ? $("#" + id).value.trim() : "");
    c.extra = { hearing: $("#ex-hear").checked, sme: $("#ex-sme").checked, mit: $("#ex-mit").checked, std: g("ex-std"), spec: g("ex-spec"), short: g("ex-short"), deliv: g("ex-deliv"), place: g("ex-place"), vatMode: $("#ex-vat").value, wbs: g("ex-wbs"), pr: g("ex-pr"), po: g("ex-po") };
    caseLog(c, "extra", ""); audit(["แก้ข้อมูลเพิ่มเติมของรายการจัดซื้อ", "Edited item details"], c.id); done(L("บันทึกแล้ว", "Saved")); };

  const sm = $("#ix-smp"); if (sm) sm.onclick = () => { $("#ix-t").value = "ราคาน้ำมันดีเซล (บาท/ลิตร), 2026-10-16, 32.4\nทองแดง LME (ดอลลาร์/ตัน), 2026-10-16, 9740\nอัตราแลกเปลี่ยน USD/THB, 2026-10-16, 35.1"; };
  const ia = $("#ix-add"); if (ia) ia.onclick = () => { const rows = $("#ix-t").value.split("\n").map(l => l.split(",").map(x => x.trim())).filter(r => r.length === 3 && r[0]); let n = 0, bad = 0;
    rows.forEach(([name, d, v]) => { const val = Number(v); if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !(val > 0)) { bad++; return; } const ex = S.priceIdx.find(i => tx(i.name) === name || i.name.includes(name)); S.priceIdx.push({ k: ex ? ex.k : "x-" + normName(name).slice(0, 8), name: ex ? ex.name : [name, name], date: d, value: val }); n++; });
    if (!n) { toast(L("ไม่มีบรรทัดที่ใช้ได้ (รูปแบบ: ชื่อ, วันที่, ค่า)", "No usable lines (format: name, date, value)")); return; }
    audit(["นำเข้าดัชนีราคา", "Imported price indices"], `${n}${bad ? ` (ข้าม ${bad})` : ""}`); done(`${L("นำเข้า", "Imported")} ${n}${bad ? ` · ${L("ข้าม", "skipped")} ${bad}` : ""}`); };
});

// ---------- M10: procurement profile ----------
ADMIN_TABS.push({ id: "procprof", roles: ["admin", "audit", "proc", "prochead"], label: ["โปรไฟล์จัดซื้อ", "Procurement profile"] });
ADMIN.procprof = () => {
  const ad = isAdmin(), pf = S.prof, F = S.docno.fmt, num = (k, lbl, hint) => `<div class="f" style="flex:0 1 200px"><label for="pf-${k}">${lbl}</label><input type="number" id="pf-${k}" min="0" step="any" value="${pf.p[k]}" ${ad ? "" : "disabled"}><span class="sub">${hint}</span></div>`;
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("โปรไฟล์หน่วยงาน: ผลิตภัณฑ์เดียว ตั้งค่าได้ตามชนิดหน่วยงาน", "Agency profile: one product, configured for the kind of agency")}</b>
    <p>${L("ส่วนราชการและรัฐวิสาหกิจใช้ Fisko ตัวเดียวกัน ต่างกันที่สวิตช์ด้านล่าง ค่าตั้งต้นเป็นข้อเสนอจากการเทียบ TOR ต้องยืนยันกับฝ่ายกฎหมายและเจ้าหน้าที่พัสดุ", "Government agencies and state enterprises use the same Fisko; the switches below differ. The starting values come from the TOR comparison and must be confirmed with legal and procurement staff.")}</p></div></div>
  <section class="panel"><header><h2>${L("ชนิดหน่วยงาน", "Kind of agency")}</h2><span class="sp"></span>${tag(tx(PROF_TYPES[pf.type]), "p-info")}</header>
    <div class="body row">${Object.keys(PROF_TYPES).map(k => `<button class="btn ${pf.type === k ? "primary" : ""}" type="button" data-ptype="${k}" ${ad ? "" : "disabled"}>${tx(PROF_TYPES[k])}</button>`).join("")}<span class="sub">${L("เลือกแล้วระบบตั้งสวิตช์เป็นค่าตั้งต้นของชนิดนั้น แก้ทีละข้อได้ภายหลัง", "Choosing a kind sets the switches to its starting values; you can then change each one")}</span></div></section>
  <section class="panel"><header><h2>${L("สวิตช์ฟังก์ชัน", "Feature switches")}</h2><span class="sp"></span>${tag(ad ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), ad ? "p-ok" : "p-mute")}</header>
    <div class="tbl-wrap"><table><thead><tr><th class="c" style="width:70px">${L("เปิด", "On")}</th><th>${L("ฟังก์ชัน", "Feature")}</th><th>${L("ราชการ", "Gov")}</th><th>${L("รัฐวิสาหกิจ", "SOE")}</th><th>${L("อ้างอิง TOR", "TOR ref")}</th><th>${L("รอบ", "Round")}</th></tr></thead>
      <tbody>${PROF_FEATS.map(f => `<tr><td class="c">${sw("pf-sw-" + f.k, pf.sw[f.k], !ad)}</td><td>${tx([f.th, f.en])}</td><td class="c">${f.gov ? "✓" : "—"}</td><td class="c">${f.soe ? "✓" : "—"}</td><td class="sub">${f.tor}</td><td>${f.built ? tag(L("สร้างแล้ว", "Built") + " " + f.round, "p-ok") : tag(L("ยังไม่สร้าง", "Not built") + " · " + (f.round === "deferred" ? L("เลื่อน", "deferred") : f.round), "p-mute")}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("สวิตช์ของฟังก์ชันที่ยังไม่สร้างบันทึกไว้ก่อน ยังไม่มีผลต่อหน้าจอ ปิดสวิตช์แล้วต้นแบบทำงานเหมือนฉบับ 0.2", "Switches for features not built yet are stored but do nothing. With a switch off, the prototype behaves as in v0.2.")}</div></section>
  <section class="panel"><header><h2>${L("ค่าตั้งของฟังก์ชัน", "Feature settings")}</h2></header>
    <div class="body inline-form">
      ${num("hearingMin", L("รับฟังความคิดเห็นเมื่อวงเงินตั้งแต่ (บาท)", "Hearing from value (baht)"), CONF_TAG("C"))}${num("hearingDays", L("ระยะรับฟัง (วัน)", "Hearing period (days)"), CONF_TAG("C"))}
      ${num("rfqMin", L("เชิญผู้ขายอย่างน้อย (วิธีคัดเลือก)", "Invite at least (selective)"), CONF_TAG("B"))}${num("rfqDays", L("ตอบ RFQ ภายใน (วัน)", "RFQ reply within (days)"), CONF_TAG("C"))}${num("vatPct", L("ภาษีมูลค่าเพิ่ม (ร้อยละ)", "VAT (%)"), CONF_TAG("A"))}
      ${ad ? `<button class="btn primary" type="button" id="pf-save">${L("บันทึก", "Save")}</button>` : ""}</div></section>
  <section class="panel"><header><h2>${L("เลขที่เอกสารอัตโนมัติ", "Automatic document numbers")}</h2><span class="sp"></span><span class="mono sub">FR-PR-80</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ชนิดเอกสาร", "Document")}</th><th>${L("คำนำหน้า", "Prefix")}</th><th class="n">${L("จำนวนหลัก", "Digits")}</th><th class="c">${L("รหัสหน่วย", "Unit code")}</th><th>${L("ตัวอย่าง", "Example")}</th><th class="n">${L("ออกแล้วปีนี้", "Issued this year")}</th></tr></thead>
      <tbody>${Object.keys(DOC_TYPES).map(k => `<tr><td>${tx(DOC_TYPES[k])}</td><td><input type="text" id="dn-p-${k}" value="${esc(F[k].pfx)}" maxlength="8" style="width:90px" ${ad ? "" : "disabled"}></td><td class="n"><input type="number" id="dn-d-${k}" min="1" max="6" value="${F[k].pad}" style="width:70px" ${ad ? "" : "disabled"}></td><td class="c">${sw("dn-u-" + k, F[k].unit, !ad)}</td>
        <td class="mono">${docNoFmt(k, 1, "U02")}</td><td class="n">${sumv(Object.keys(S.docno.ctr).filter(x => x.startsWith(k + "|")).map(x => S.docno.ctr[x]))}</td></tr>`).join("")}</tbody></table></div>
    ${ad ? `<div class="body"><button class="btn" type="button" id="dn-save">${L("บันทึกรูปแบบ", "Save formats")}</button></div>` : ""}
    <div class="body sub">${L("เลขวิ่งต่อเนื่องแยกตามชนิด ปีงบประมาณ และหน่วย (ถ้าเปิดรหัสหน่วย) ไม่ซ้ำและไม่ข้ามเลข เปลี่ยนคำนำหน้าแล้วเลขที่ออกไปแล้วไม่เปลี่ยน", "Numbers run by type, fiscal year and unit (if unit code is on): no duplicates, no gaps. Changing a prefix does not change numbers already issued.")}</div>
    ${S.docno.log.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ชนิด", "Type")}</th><th>${L("แฟ้ม", "Case")}</th><th>${L("ออกโดย", "By")}</th><th>${L("เวลา", "Time")}</th></tr></thead><tbody>${S.docno.log.slice(0, 8).map(x => `<tr><td class="mono">${esc(x.no)}</td><td class="sub">${tx(DOC_TYPES[x.type])}</td><td class="mono sub">${esc(x.ref)}</td><td class="sub">${esc(userName(x.by))}</td><td class="sub">${fdate(x.t, true)}</td></tr>`).join("")}</tbody></table></div>` : ""}</section>`;
};
BIND_ADMIN.procprof = () => {
  $$("[data-ptype]").forEach(b => (b.onclick = () => { const k = b.dataset.ptype; if (S.prof.type === k) return; S.prof.type = k; S.prof.sw = profDefaults(k);
    audit(["เปลี่ยนชนิดหน่วยงานในโปรไฟล์จัดซื้อ", "Changed the agency kind in the procurement profile"], k); commit(); renderShell(); route(); toast(L("ตั้งสวิตช์เป็นค่าตั้งต้นแล้ว", "Switches set to the starting values")); }));
  PROF_FEATS.forEach(f => { const el = $("#pf-sw-" + f.k); if (el && !el.disabled) el.onchange = () => { S.prof.sw[f.k] = el.checked;
    audit([el.checked ? "เปิดฟังก์ชันจัดซื้อตามโปรไฟล์" : "ปิดฟังก์ชันจัดซื้อตามโปรไฟล์", el.checked ? "Switched a procurement feature on" : "Switched a procurement feature off"], f.k);
    if (!el.checked) notify(["audit", "prochead"], [`ผู้ดูแลระบบปิดฟังก์ชัน ${f.th}`, `An administrator switched off: ${f.en}`], "admin-procprof"); commit(); renderShell(); route(); toast(L("บันทึกแล้ว", "Saved")); }; });
  const sv = $("#pf-save"); if (sv) sv.onclick = () => { const v = {}; for (const k of Object.keys(PROF_DEFAULT_P)) v[k] = Number($("#pf-" + k).value);
    if (Object.values(v).some(x => !(x >= 0)) || v.rfqMin < 1 || v.vatPct > 30) { toast(L("ค่าไม่ถูกต้อง", "Check the values")); return; }
    Object.assign(S.prof.p, v); audit(["แก้ค่าตั้งโปรไฟล์จัดซื้อ", "Changed profile settings"], Object.entries(v).map(([k, x]) => `${k}=${x}`).join(" ")); commit(); route(); toast(L("บันทึกแล้ว", "Saved")); };
  const ds = $("#dn-save"); if (ds) ds.onclick = () => { const nf = {};
    for (const k of Object.keys(DOC_TYPES)) { const pfx = $("#dn-p-" + k).value.trim(), pad = Math.round(Number($("#dn-d-" + k).value)); if (!pfx || !(pad >= 1 && pad <= 6)) { toast(L("ตรวจคำนำหน้าและจำนวนหลัก", "Check the prefix and digits")); return; } nf[k] = { pfx, pad, unit: $("#dn-u-" + k).checked }; }
    Object.assign(S.docno.fmt, nf); audit(["แก้รูปแบบเลขที่เอกสาร", "Changed document number formats"], Object.entries(nf).map(([k, x]) => `${k}:${x.pfx}/${x.pad}${x.unit ? "/unit" : ""}`).join(" ")); commit(); route(); toast(L("บันทึกแล้ว", "Saved")); };
};
