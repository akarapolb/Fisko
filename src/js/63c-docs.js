// Fisko Procurement round 21 (Q4 of design v0.2): document intake with simulated OCR (D-P10).
// Upload or pick a sample → classify → extract fields with a confidence each → check rules V-01..V-07 →
// match to a contract, phase or case → a person verifies every low-confidence field and fixes what's wrong →
// confirm → the data is used: invoice → three-way gate, delivery note → delivery date, bank guarantee →
// guarantee register, quotation → case quotations or market research (FR-PR-56, FR-PR-57).
// No real OCR runs: sample documents have fixed extraction results, one field misread on purpose.
let DOC_OPEN = null;
const DOC_TYPE = { inv: ["ใบแจ้งหนี้ / ใบกำกับภาษี", "Invoice / tax invoice"], dn: ["ใบส่งของ / หนังสือแจ้งส่งมอบ", "Delivery note"], bg: ["หนังสือค้ำประกันธนาคาร", "Bank guarantee"], qt: ["ใบเสนอราคา", "Quotation"] };
const DOC_F = {
  inv: [["vendor", "ผู้ขาย", "Supplier"], ["taxId", "เลขประจำตัวผู้เสียภาษี", "Tax ID"], ["no", "เลขที่", "Number"], ["date", "วันที่", "Date"], ["contract", "เลขที่สัญญา", "Contract no."], ["phase", "งวด", "Phase"], ["subtotal", "ยอดก่อนภาษี", "Subtotal"], ["vat", "ภาษีมูลค่าเพิ่ม", "VAT"], ["total", "ยอดรวม", "Total"]],
  dn: [["vendor", "ผู้ขาย", "Supplier"], ["no", "เลขที่", "Number"], ["date", "วันที่ส่งมอบ", "Delivery date"], ["contract", "เลขที่สัญญา", "Contract no."], ["phase", "งวด", "Phase"], ["items", "รายการ", "Items"]],
  bg: [["bank", "ธนาคาร", "Bank"], ["no", "เลขที่", "Number"], ["amount", "วงเงิน", "Amount"], ["start", "วันเริ่ม", "Starts"], ["expiry", "วันหมดอายุ", "Expires"], ["contract", "เลขที่สัญญา", "Contract no."], ["beneficiary", "ผู้รับประโยชน์", "Beneficiary"]],
  qt: [["vendor", "ผู้เสนอราคา", "Supplier"], ["taxId", "เลขประจำตัวผู้เสียภาษี", "Tax ID"], ["date", "วันที่", "Date"], ["items", "รายการ", "Items"], ["total", "ยอดรวม", "Total"], ["validUntil", "ยืนราคาถึง", "Valid until"]],
};
const NUMF = ["subtotal", "vat", "total", "amount", "phase"], DATEF = ["date", "start", "expiry", "validUntil"];
const CONF_MIN = 0.8;

// ---------- sample documents (fixed extraction results) ----------
function sampleDocs() {
  const c1 = famCon("CT-2570-001"), c2 = famCon("CT-2570-002"), v2 = vendorBy(tx(c2.vendor)), v1 = vendorBy(tx(c1.vendor)), p21 = c2.phases[0];
  const net = Math.round(p21.amount / 1.07), vat = p21.amount - net, c5 = caseByPlan("PP-2570-005");
  const f = (v, conf) => ({ v: String(v), conf, orig: String(v) });
  return {
    inv: { type: "inv", name: "scan_invoice_INV-70-0201.jpg", fields: { vendor: f(tx(c2.vendor), 0.97), taxId: f(v2 ? v2.taxId : "", 0.93), no: f("INV-70-0201", 0.95), date: f(TODAY, 0.9), contract: f(c2.no, 0.96), phase: f(1, 0.92), subtotal: f(net, 0.91), vat: f(vat, 0.9), total: { v: String(p21.amount + 6000), conf: 0.62, orig: String(p21.amount + 6000), truth: String(p21.amount) } } },
    dn: { type: "dn", name: "scan_delivery_DN-70-0412.jpg", fields: { vendor: f(tx(c1.vendor), 0.96), no: f("DN-70-0412", 0.94), date: { v: "2026-10-15", conf: 0.55, orig: "2026-10-15", truth: TODAY }, contract: f(c1.no, 0.95), phase: f(2, 0.93), items: f("ส่งมอบงานงวดที่ 2 ตามสัญญา", 0.88) } },
    bg: { type: "bg", name: "scan_bank_guarantee_BG-2569-0458.jpg", fields: { bank: f("ธนาคารตัวอย่าง จำกัด (มหาชน)", 0.95), no: f("BG-2569-0458", 0.94), amount: f(Math.round(c1.amount * 0.05), 0.9), start: f(c1.signed, 0.92), expiry: f("2027-12-31", 0.91), contract: f(c1.no, 0.96), beneficiary: f(tx(S.org), 0.85) } },
    qt: { type: "qt", name: "scan_quotation_Q-2569-1188.jpg", fields: { vendor: f("บริษัท ตัวอย่างครุภัณฑ์ จำกัด", 0.96), taxId: f(S.vendors[0] ? S.vendors[0].taxId : "", 0.7), date: f(TODAY, 0.93), items: f(tx(famPlan(c5 ? c5.plan : "").name), 0.86), total: f(390000, 0.94), validUntil: f(addDays(TODAY, 30), 0.9) } },
  };
}
function docSvg(d) {
  const F = d.fields, rows = DOC_F[d.type].map(([k, th]) => [th, F[k] ? F[k].v : ""]), title = DOC_TYPE[d.type][0];
  const lo = DOC_F[d.type].map(([k], i) => (F[k] && F[k].conf < CONF_MIN ? i : -1)).filter(i => i >= 0);
  return `<svg viewBox="0 0 420 520" role="img" aria-label="${esc(tx(DOC_TYPE[d.type]))}" style="width:100%;max-width:420px;height:auto;background:#fdfcf8;border:1px solid #d8d6cc;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.08)">
    <rect x="0" y="0" width="420" height="520" fill="#fdfcf8"/><text x="24" y="40" font-size="13" fill="#555" font-family="Tahoma, sans-serif">${esc(F.vendor ? F.vendor.v : F.bank ? F.bank.v : "")}</text>
    <text x="210" y="80" font-size="18" text-anchor="middle" fill="#222" font-family="Tahoma, sans-serif" font-weight="bold">${esc(title)}</text>
    <line x1="24" y1="96" x2="396" y2="96" stroke="#bbb"/>
    ${rows.map(([lbl, v], i) => `${lo.includes(i) ? `<rect x="20" y="${118 + i * 38 - 16}" width="380" height="24" fill="#fff3c4" stroke="#e0b100" stroke-dasharray="3 2"/>` : ""}<text x="28" y="${118 + i * 38}" font-size="11" fill="#777" font-family="Tahoma, sans-serif">${esc(lbl)}</text><text x="170" y="${118 + i * 38}" font-size="12.5" fill="#222" font-family="Tahoma, sans-serif">${esc(NUMF.includes(DOC_F[d.type][i][0]) && v !== "" && !isNaN(v) && DOC_F[d.type][i][0] !== "phase" ? fmt(Number(v)) : v)}</text>`).join("")}
    <text x="24" y="500" font-size="10" fill="#999" font-family="Tahoma, sans-serif">${L("ภาพเอกสารตัวอย่าง (จำลอง) · กรอบเหลือง = ความมั่นใจต่ำ", "Sample document image (simulated) · yellow = low confidence")}</text></svg>`;
}

// ---------- checks V-01..V-07 and matching ----------
const docVal = (d, k) => (d.fields[k] ? d.fields[k].v.trim() : "");
const docNum = (d, k) => Number(String(docVal(d, k)).replace(/,/g, ""));
function docMatch(d) {
  if (d.type === "qt") { const c = caseOf(d.caseId) || null; return { c: null, ph: null, cs: c }; }
  const c = S.contracts.find(x => x.no === docVal(d, "contract")) || null, ph = c && d.type !== "bg" ? c.phases.find(p => p.n === docNum(d, "phase")) : null;
  return { c, ph, cs: c ? caseByPlan(c.plan) : null };
}
function docChecks(d) {
  const ok = (id, v, th, en) => ({ id, ok: !!v, label: `${id} ${L(th, en)}` }), m = docMatch(d), out = [];
  if (d.type === "inv" || d.type === "qt") out.push(ok("V-01", taxOk(docVal(d, "taxId")), "เลขประจำตัวผู้เสียภาษี 13 หลักผ่านหลักตรวจสอบ", "Tax ID has 13 digits and a valid check digit"));
  if (d.type === "inv") out.push(ok("V-02", Math.abs(docNum(d, "subtotal") + docNum(d, "vat") - docNum(d, "total")) <= 1, "ยอดก่อนภาษี + ภาษี = ยอดรวม", "Subtotal + VAT = total"));
  const dt = docVal(d, d.type === "bg" ? "expiry" : "date");
  out.push(ok("V-03", /^\d{4}-\d{2}-\d{2}$/.test(dt) && (d.type === "bg" || dt <= TODAY) && (!m.c || d.type === "qt" || docVal(d, d.type === "bg" ? "start" : "date") >= m.c.signed), "วันที่อ่านได้และสมเหตุสมผล", "Dates are readable and plausible"));
  if (d.type === "inv" || d.type === "dn") out.push(ok("V-04", m.c && normName(docVal(d, "vendor")) === normName(tx(m.c.vendor)), "ชื่อผู้ขายตรงกับคู่สัญญา", "Supplier matches the contract party"));
  if (d.type === "qt") out.push(ok("V-05", !!m.cs, "เลือกแฟ้มที่ใบเสนอราคานี้ใช้", "A case is chosen for this quotation"));
  else out.push(ok("V-05", m.c && (d.type === "bg" || m.ph), "เลขที่สัญญาและงวดมีอยู่ในระบบ", "The contract number and phase exist"));
  if (d.type === "bg") out.push(ok("V-06", m.c && docNum(d, "amount") >= Math.round(m.c.amount * S.pcfg.guaranteePct / 100) && docVal(d, "expiry") >= conEnd(m.c), `วงเงินไม่ต่ำกว่าร้อยละ ${S.pcfg.guaranteePct} และไม่หมดอายุก่อนสิ้นสัญญา`, `At least ${S.pcfg.guaranteePct}% and valid past the contract end`));
  out.push(ok("V-07", !S.docs.some(x => x !== d && x.status === "confirmed" && x.type === d.type && docVal(x, "no") && docVal(x, "no") === docVal(d, "no") && normName(docVal(x, "vendor") || docVal(x, "bank")) === normName(docVal(d, "vendor") || docVal(d, "bank"))), "ไม่ใช่เอกสารซ้ำ", "Not a duplicate"));
  return out;
}
const lowConf = d => Object.keys(d.fields).filter(k => d.fields[k].conf < CONF_MIN && !d.fields[k].checked);
function docUseCheck(d) {
  const m = docMatch(d);
  if (d.type === "inv") { if (m.ph && m.ph.invoice) return L("งวดนี้มีใบแจ้งหนี้แล้ว", "This phase already has an invoice"); if (m.ph && !phaseAccepted(m.ph)) return L("งวดนี้ยังตรวจรับไม่ครบ", "This phase isn't accepted yet"); }
  if (d.type === "dn" && m.ph && m.ph.delivered) return L("งวดนี้บันทึกการส่งมอบแล้ว", "This phase already has a delivery date");
  return "";
}

// ---------- page ----------
const DOC_ST = { extracted: [["รอตรวจ", "To verify"], "p-warn"], manual: [["กรอกเอง", "Manual entry"], "p-info"], confirmed: [["ยืนยันแล้ว", "Confirmed"], "p-ok"], rejected: [["ไม่ใช้", "Rejected"], "p-mute"] };
function ocrStats() { const done = S.docs.filter(d => d.status === "confirmed" && d.src.startsWith("sample")); const all = done.flatMap(d => Object.values(d.fields)); return { n: done.length, fields: all.length, right: all.filter(f => f.v === f.orig).length }; }
PROC.docs = () => {
  const pr = isProcRole() || ROLE === "fin", D = S.docs, d = D.find(x => x.id === DOC_OPEN), st = ocrStats();
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("การอ่านเอกสารในต้นแบบเป็นการจำลอง", "Document reading in this prototype is simulated")}</b><p>${L("เอกสารตัวอย่างมีผลการอ่านกำหนดไว้ล่วงหน้า และตั้งใจให้อ่านผิดหนึ่งช่อง ส่วนกฎตรวจ V-01 ถึง V-07 การจับคู่ และการนำข้อมูลไปใช้ทำงานจริง ไฟล์ที่อัปโหลดเองจะเป็นแบบฟอร์มว่างให้กรอก (D-P10)", "Sample documents have fixed reading results, with one field misread on purpose. Checks V-01 to V-07, matching and using the data work for real. Your own uploads open as an empty form to fill (D-P10).")}</p></div></div>
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("เอกสารทั้งหมด", "Documents")}</span><span class="v">${D.length}</span></div>
    <div class="kpi"><span class="l">${L("รอตรวจ", "To verify")}</span><span class="v">${D.filter(x => x.status === "extracted" || x.status === "manual").length}</span></div>
    <div class="kpi"><span class="l">${L("ยืนยันแล้ว", "Confirmed")}</span><span class="v">${D.filter(x => x.status === "confirmed").length}</span></div>
    <div class="kpi"><span class="l">${L("ช่องที่อ่านถูกโดยไม่ต้องแก้", "Fields right without edits")}</span><span class="v">${st.fields ? pc(st.right / st.fields) : "—"}<small>${st.fields ? ` (${st.right}/${st.fields})` : ""}</small></span></div>
  </section>
  ${pr ? `<section class="panel"><header><h2>${L("รับเอกสารเข้า", "Add a document")}</h2><span class="sp"></span><span class="mono sub">AG-14</span> ${agentOn("AG-14") ? "" : tag(L("ปิดอยู่ใน M09", "Off in M09"), "p-bad")}</header>
    <div class="body row">${Object.keys(DOC_TYPE).map(k => `<button class="btn" type="button" data-dsample="${k}">+ ${L("ตัวอย่าง", "Sample")}: ${tx(DOC_TYPE[k])}</button>`).join("")}
      <label class="btn ghost" style="cursor:pointer">${L("อัปโหลดไฟล์ของคุณ", "Upload your file")}<input type="file" id="doc-up" accept="image/*,application/pdf" hidden></label></div></section>` : ""}
  <section class="panel"><header><h2>${L("เอกสาร", "Documents")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "ID")}</th><th>${L("ชนิด", "Type")}</th><th>${L("ไฟล์", "File")}</th><th>${L("จับคู่กับ", "Matched to")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${D.slice().reverse().map(x => { const m = docMatch(x); return `<tr><td class="mono">${x.id}</td><td>${tx(DOC_TYPE[x.type])}</td><td class="sub">${esc(x.name)}</td><td class="sub">${m.c ? `${m.c.id}${m.ph ? " · " + tx(m.ph.name) : ""}` : m.cs ? m.cs.id : "—"}</td><td>${stTag(DOC_ST, x.status)}${x.applied ? `<div class="sub">${esc(x.applied)}</div>` : ""}</td><td><button class="btn" type="button" data-dopen="${x.id}">${DOC_OPEN === x.id ? L("ปิด", "Close") : L("เปิด", "Open")}</button></td></tr>`; }).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มีเอกสาร", "No documents yet")}</td></tr>`}</tbody></table></div></section>
  ${d ? docReview(d, pr) : ""}`;
};
function docReview(d, pr) {
  const ed = pr && (d.status === "extracted" || d.status === "manual"), chk = docChecks(d), lc = lowConf(d), use = docUseCheck(d), ready = chk.every(x => x.ok) && !lc.length && !use;
  return `<section class="panel"><header><h2><span class="mono">${d.id}</span> · ${tx(DOC_TYPE[d.type])}</h2><span class="sp"></span>${stTag(DOC_ST, d.status)}</header>
    <div class="body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px;align-items:start">
      <div>${d.src.startsWith("sample") ? docSvg(d) : `<div class="callout" style="margin:0">${L("ไฟล์ของคุณ", "Your file")}: <b>${esc(d.name)}</b><div class="sub">${L("ต้นแบบไม่เก็บไฟล์และไม่อ่านไฟล์จริง กรอกข้อมูลจากเอกสารด้านขวา", "The prototype doesn't keep or read the file; type the details on the right")}</div></div>`}</div>
      <div style="min-width:0;display:flex;flex-direction:column;gap:10px">
        ${d.type === "qt" ? `<div class="f"><label for="doc-case">${L("แฟ้มที่ใช้ใบเสนอราคานี้", "Case this quotation is for")}</label><select id="doc-case" ${ed ? "" : "disabled"}><option value="">—</option>${S.cases.filter(c => !c.cancelled && caseState(c) >= 1 && caseState(c) <= 4).map(c => `<option value="${c.id}" ${d.caseId === c.id ? "selected" : ""}>${c.id} · ${esc(caseName(c))}</option>`).join("")}</select></div>` : ""}
        <div class="tbl-wrap"><table><thead><tr><th>${L("ช่อง", "Field")}</th><th>${L("ค่า", "Value")}</th><th class="n">${L("ความมั่นใจ", "Confidence")}</th></tr></thead><tbody>${DOC_F[d.type].map(([k, th, en]) => { const f = d.fields[k], low = f.conf < CONF_MIN;
          return `<tr style="${low && !f.checked ? "background:var(--warn-soft)" : ""}"><td>${L(th, en)}</td><td>${ed ? `<input type="${DATEF.includes(k) ? "date" : NUMF.includes(k) ? "number" : "text"}" data-dfield="${k}" value="${esc(f.v)}" style="width:100%" aria-label="${L(th, en)}">` : esc(f.v)}${f.v !== f.orig ? `<div class="sub">${L("อ่านได้", "Read as")} ${esc(f.orig)} → ${L("แก้แล้ว", "corrected")}</div>` : ""}${ed && low ? `<label class="field-inline sub"><input type="checkbox" data-dcheck="${k}" ${f.checked ? "checked" : ""}> ${L("ตรวจกับต้นฉบับแล้ว", "Checked against the original")}</label>` : ""}</td>
            <td class="n">${d.src.startsWith("sample") ? `${fmt(f.conf * 100)}%` : "—"}</td></tr>`; }).join("")}</tbody></table></div>
        <ul class="check">${chk.map(x => `<li><span class="m ${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "×"}</span><div>${esc(x.label)}</div></li>`).join("")}${lc.length ? `<li><span class="m wa">!</span><div>${L("ช่องความมั่นใจต่ำยังไม่ได้ตรวจ", "Low-confidence fields not checked yet")}: ${lc.map(k => L(DOC_F[d.type].find(x => x[0] === k)[1], DOC_F[d.type].find(x => x[0] === k)[2])).join(", ")}</div></li>` : ""}${use ? `<li><span class="m no">×</span><div>${esc(use)}</div></li>` : ""}</ul>
        ${ed ? `<div class="row"><button class="btn" type="button" id="doc-save">${L("บันทึกการแก้ไข", "Save edits")}</button><button class="btn primary" type="button" id="doc-ok" ${ready ? "" : "disabled"}>${L("ยืนยันและนำไปใช้", "Confirm and use")}</button><button class="btn ghost" type="button" id="doc-no">${L("ไม่ใช้เอกสารนี้", "Reject")}</button></div>` : ""}</div></div></section>`;
}
function bindDocs() {
  const done = m => { commit(); renderShell(); route(); if (m) toast(m); };
  const add = d => { d.id = "DOC-" + String(S.docs.length + 1).padStart(3, "0"); d.t = nowIso(); d.by = me().id; S.docs.push(d); DOC_OPEN = d.id; };
  $$("[data-dsample]").forEach(b => (b.onclick = () => {
    if (!agentOn("AG-14")) { toast(L("Document Intake Agent ถูกปิดใช้งานใน M09", "The Document Intake Agent is switched off in M09")); return; }
    const s = JSON.parse(JSON.stringify(sampleDocs()[b.dataset.dsample])); add(Object.assign(s, { src: "sample:" + s.type, status: "extracted" }));
    S.aiLog.unshift({ t: nowIso(), agent: "AG-14", user: me().id, action: ["อ่านเอกสาร (จำลอง)", "Read a document (simulated)"], target: s.id, sources: 1, ok: true, ver: "sim-1" });
    done(L("อ่านเอกสารแล้ว ตรวจช่องที่ไฮไลต์", "Read; check the highlighted fields")); }));
  const up = $("#doc-up"); if (up) up.onchange = () => { const f = up.files[0]; if (!f) return; const type = /quot|เสนอ/i.test(f.name) ? "qt" : /guar|ค้ำ/i.test(f.name) ? "bg" : /deliv|ส่ง/i.test(f.name) ? "dn" : "inv";
    const fields = {}; DOC_F[type].forEach(([k]) => (fields[k] = { v: "", conf: 1, orig: "" })); add({ type, name: f.name, src: "upload", status: "manual", fields }); done(L("เพิ่มไฟล์แล้ว กรอกข้อมูลจากเอกสาร", "Added; type the details from the document")); };
  $$("[data-dopen]").forEach(b => (b.onclick = () => { DOC_OPEN = DOC_OPEN === b.dataset.dopen ? null : b.dataset.dopen; route(); }));
  const d = S.docs.find(x => x.id === DOC_OPEN); if (!d) return;
  const pull = () => { $$("[data-dfield]").forEach(i => (d.fields[i.dataset.dfield].v = i.value.trim())); $$("[data-dcheck]").forEach(i => (d.fields[i.dataset.dcheck].checked = i.checked)); const cs = $("#doc-case"); if (cs) d.caseId = cs.value || null; };
  const sv = $("#doc-save"); if (sv) sv.onclick = () => { pull(); done(L("บันทึกแล้ว", "Saved")); };
  const cs = $("#doc-case"); if (cs) cs.onchange = () => { pull(); done(); };
  const no = $("#doc-no"); if (no) no.onclick = () => { d.status = "rejected"; audit(["ไม่ใช้เอกสารที่รับเข้า", "Rejected an incoming document"], d.id); done(); };
  const ok = $("#doc-ok"); if (ok) ok.onclick = () => {
    pull(); const chk = docChecks(d), use = docUseCheck(d);
    if (!chk.every(x => x.ok) || lowConf(d).length || use) { done(L("ยังยืนยันไม่ได้ ดูรายการตรวจ", "Can't confirm yet; see the checks")); return; }
    const m = docMatch(d);
    if (d.type === "inv") { m.ph.invoice = { no: docVal(d, "no"), amount: docNum(d, "total"), date: docVal(d, "date"), vendor: tx(m.c.vendor), contract: m.c.no, by: me().id, doc: d.id }; d.applied = `${m.c.id} ${tx(m.ph.name)} ${L("ใบแจ้งหนี้", "invoice")}`; }
    if (d.type === "dn") { m.ph.delivered = docVal(d, "date"); notify(m.c.inspectors, [`${m.c.id} ${m.ph.name[0]} แจ้งส่งมอบแล้ว (จากเอกสาร ${d.id})`, `${m.c.id} ${m.ph.name[1]} was delivered (document ${d.id})`], "prc-contracts"); d.applied = `${m.c.id} ${tx(m.ph.name)} ${L("วันส่งมอบ", "delivery date")}`; }
    if (d.type === "bg") { m.c.guarantee = { type: "bank", amount: docNum(d, "amount"), expires: docVal(d, "expiry"), status: "held", t: nowIso(), by: me().id, doc: d.id, no: docVal(d, "no"), bank: docVal(d, "bank") }; d.applied = `${m.c.id} ${L("หลักประกัน", "guarantee")}`; }
    if (d.type === "qt") { const c = m.cs, v = docVal(d, "vendor"), price = docNum(d, "total");
      if (caseState(c) === 4 && !needsCompetition(c)) { c.quotes.push({ vendor: [v, v], price, win: false, doc: d.id }); caseLog(c, "quote", `${v} · ${fmt(price)} (${d.id})`); d.applied = `${c.id} ${L("ใบเสนอราคา", "quotation")}`; }
      else { (c.market = c.market || []).push({ vendor: v, price, src: "visit", date: docVal(d, "date"), note: d.id, by: me().id }); caseLog(c, "market", `${v} · ${fmt(price)} (${d.id})`); d.applied = `${c.id} ${L("การสำรวจตลาด", "market research")}`; } }
    d.status = "confirmed"; d.confirmed = { by: me().id, t: nowIso() };
    audit(["ยืนยันข้อมูลจากเอกสารและนำไปใช้", "Confirmed document data and used it"], `${d.id} ${d.applied}`); done(L("ยืนยันแล้ว นำข้อมูลไปใช้แล้ว", "Confirmed and applied"));
  };
}
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "docs") bindDocs(); };
}
{
  const base = famTasks;
  famTasks = R => { base(R); if (!S.docs) return; if (isProcRole() || ROLE === "fin") S.docs.filter(d => d.status === "extracted" || d.status === "manual").forEach(d => R(`${L("ตรวจเอกสารที่รับเข้า", "Verify an incoming document")} ${d.id}`, tx(DOC_TYPE[d.type]), TODAY, "prc-docs", "p-warn")); };
}
function seedDocs(s) {
  if (!s.agents.some(a => a.id === "AG-14")) s.agents.push({ id: "AG-14", on: true, uses: 0, name: ["Document Intake Agent", "Document Intake Agent"], what: ["อ่านเอกสาร สกัดข้อมูล และให้คนยืนยัน (จำลอง)", "Reads documents and extracts fields for a person to confirm (simulated)"] });
  s.docs = [];
}
