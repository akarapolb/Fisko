// Document intake, design system v2 (round 25): drop zone and sample tiles, document cards, and a review
// screen with a four-step progress strip, a sticky document image, a confidence meter per field, hover
// links between a field and its spot on the image, a check summary and an action bar that says what's left.
// Overrides PROC.docs, docReview and docSvg from 63c-docs.js; the element ids and data attributes are kept.
const DOC_ICON = { inv: "file", dn: "download", bg: "shield", qt: "tag" };
const confTone = c => (c >= 0.9 ? "var(--accent)" : c >= CONF_MIN ? "var(--amber)" : "var(--bad)");
docSvg = d => {
  const F = d.fields, rows = DOC_F[d.type], title = DOC_TYPE[d.type][0];
  return `<svg class="docsvg" viewBox="0 0 420 540" role="img" aria-label="${esc(tx(DOC_TYPE[d.type]))}">
    <rect x="0" y="0" width="420" height="540" rx="6" fill="#fdfcf7"/><rect x="0" y="0" width="420" height="6" fill="#0F1238"/>
    <text x="24" y="40" font-size="12.5" fill="#666" font-family="Tahoma, sans-serif">${esc(F.vendor ? F.vendor.v : F.bank ? F.bank.v : "")}</text>
    <text x="396" y="40" font-size="10" fill="#999" text-anchor="end" font-family="Tahoma, sans-serif">${esc(d.name)}</text>
    <text x="210" y="84" font-size="18" text-anchor="middle" fill="#1a1a1a" font-family="Tahoma, sans-serif" font-weight="bold">${esc(title)}</text>
    <line x1="24" y1="100" x2="396" y2="100" stroke="#cfcfcf"/>
    ${rows.map(([k, lbl], i) => { const f = F[k], y = 128 + i * 40, low = f && f.conf < CONF_MIN && !f.checked, v = f ? f.v : "";
      return `<g data-dk="${k}"><rect class="hl" x="18" y="${y - 18}" width="384" height="28" rx="5" fill="${low ? "#fff3c4" : "transparent"}" stroke="${low ? "#e0b100" : "transparent"}" stroke-dasharray="${low ? "4 3" : "0"}"/>
        <text x="28" y="${y}" font-size="11" fill="#7a7a7a" font-family="Tahoma, sans-serif">${esc(lbl)}</text><text x="172" y="${y}" font-size="13" fill="#1a1a1a" font-family="Tahoma, sans-serif">${esc(NUMF.includes(k) && v !== "" && !isNaN(v) && k !== "phase" ? fmt(Number(v)) : v)}</text></g>`; }).join("")}
    <rect x="290" y="${128 + rows.length * 40 + 10}" width="100" height="44" rx="4" fill="none" stroke="#c9c9c9" stroke-dasharray="3 3"/><text x="340" y="${128 + rows.length * 40 + 37}" font-size="9.5" fill="#aaa" text-anchor="middle" font-family="Tahoma, sans-serif">${L("ลายมือชื่อ / ตราประทับ", "signature / stamp")}</text>
    <text x="24" y="524" font-size="9.5" fill="#a3a3a3" font-family="Tahoma, sans-serif">${L("ภาพเอกสารตัวอย่าง (จำลอง) · กรอบเหลือง = ความมั่นใจต่ำ", "Sample document image (simulated) · yellow = low confidence")}</text></svg>`;
};
function docSteps(d) {
  const n = d.status === "confirmed" ? 4 : d.status === "rejected" ? 0 : lowConf(d).length || !docChecks(d).every(x => x.ok) ? 3 : 3;
  const st = [["อัปโหลด", "Upload"], ["อ่านเอกสาร", "Read"], ["ตรวจและแก้", "Verify"], ["ยืนยันและนำไปใช้", "Confirm and use"]];
  return `<ol class="stepper doc-steps">${st.map((s, i) => `<li class="${d.status === "rejected" ? "" : i + 1 < n || n === 4 ? "done" : i + 1 === n ? "now" : ""}"><span class="dot">${i + 1 < n || n === 4 ? "✓" : i + 1}</span><span class="nm">${tx(s)}</span></li>`).join("")}</ol>`;
}
docReview = (d, pr) => {
  const ed = pr && (d.status === "extracted" || d.status === "manual"), chk = docChecks(d), lc = lowConf(d), use = docUseCheck(d), ready = chk.every(x => x.ok) && !lc.length && !use, sample = d.src.startsWith("sample"), m = docMatch(d);
  const confs = Object.values(d.fields).map(f => f.conf), avgC = sample ? avg(confs) : null, pass = chk.filter(x => x.ok).length;
  const left = [...chk.filter(x => !x.ok).map(x => x.label), ...lc.map(k => `${L("ตรวจช่อง", "Check")} ${L(DOC_F[d.type].find(x => x[0] === k)[1], DOC_F[d.type].find(x => x[0] === k)[2])}`), ...(use ? [use] : [])];
  return `<section class="panel docrev"><header>${chipIco(DOC_ICON[d.type], "info")}<div style="min-width:0"><h2><span class="mono sub" style="font-weight:600">${d.id}</span> · ${tx(DOC_TYPE[d.type])}</h2><div class="sub" style="font-size:12px">${esc(d.name)}${m.c ? ` · ${L("จับคู่กับ", "matched to")} <b>${m.c.id}</b>${m.ph ? ` ${tx(m.ph.name)}` : ""}` : m.cs ? ` · <b>${m.cs.id}</b>` : ""}</div></div><span class="sp"></span>${stTag(DOC_ST, d.status)}</header>
    <div class="body" style="padding-bottom:6px">${docSteps(d)}</div>
    <div class="docgrid">
      <div class="docimg">${sample ? docSvg(d) : `<div class="dropzone" style="cursor:default">${icon("file", 28)}<b>${esc(d.name)}</b><span class="sub">${L("ต้นแบบไม่เก็บและไม่อ่านไฟล์จริง กรอกข้อมูลจากเอกสารด้านขวา", "The prototype doesn't keep or read the file; type the details on the right")}</span></div>`}
        ${sample ? `<div class="row sub" style="gap:12px;margin-top:8px;font-size:12px"><span class="row" style="gap:5px"><i class="lg" style="background:#fff3c4;border:1px dashed #e0b100"></i>${L("ความมั่นใจต่ำ", "Low confidence")}</span><span class="row" style="gap:5px"><i class="lg" style="background:#dbe4ff;border:1px solid #4F46E5"></i>${L("ช่องที่ชี้อยู่", "Field under the pointer")}</span></div>` : ""}</div>
      <div class="docform">
        <div class="docsum">
          ${sample ? `<div class="row" style="gap:10px">${ring(avgC, { size: 54, stroke: 6, color: confTone(avgC) })}<div><b>${L("ความมั่นใจเฉลี่ย", "Average confidence")}</b><div class="sub">${confs.length} ${L("ช่อง", "fields")} · ${confs.filter(c => c < CONF_MIN).length} ${L("ช่องต่ำกว่า", "below")} ${fmt(CONF_MIN * 100)}%</div></div></div>` : `<div><b>${L("กรอกเอง", "Typed by hand")}</b><div class="sub">${L("ไม่มีค่าความมั่นใจ", "No confidence values")}</div></div>`}
          <div class="row" style="gap:10px">${ring(chk.length ? pass / chk.length : 0, { size: 54, stroke: 6, label: `${pass}/${chk.length}`, fs: 13, color: pass === chk.length ? "var(--accent)" : "var(--amber)" })}<div><b>${L("กฎตรวจ V-01 ถึง V-07", "Checks V-01 to V-07")}</b><div class="sub">${pass === chk.length ? L("ผ่านทุกข้อ", "all pass") : `${chk.length - pass} ${L("ข้อไม่ผ่าน", "failing")}`}</div></div></div></div>
        ${d.type === "qt" ? `<div class="f"><label for="doc-case">${L("แฟ้มที่ใช้ใบเสนอราคานี้", "Case this quotation is for")}</label><select id="doc-case" ${ed ? "" : "disabled"}><option value="">—</option>${S.cases.filter(c => !c.cancelled && caseState(c) >= 1 && caseState(c) <= 4).map(c => `<option value="${c.id}" ${d.caseId === c.id ? "selected" : ""}>${c.id} · ${esc(caseName(c))}</option>`).join("")}</select></div>` : ""}
        <div class="fields">${DOC_F[d.type].map(([k, th, en]) => { const f = d.fields[k], low = sample && f.conf < CONF_MIN, need = low && !f.checked, changed = f.v !== f.orig;
          return `<div class="frow ${need ? "need" : ""} ${changed ? "changed" : ""}" data-dk="${k}"><label for="df-${k}">${L(th, en)}</label>
            <div class="fin">${ed ? `<input id="df-${k}" type="${DATEF.includes(k) ? "date" : NUMF.includes(k) ? "number" : "text"}" data-dfield="${k}" value="${esc(f.v)}">` : `<div class="fval">${esc(f.v) || "—"}</div>`}
              ${changed ? `<div class="sub fchg">${icon("check", 12)} ${L("อ่านได้", "Read as")} <s>${esc(f.orig)}</s> → ${L("แก้แล้ว", "corrected")}</div>` : ""}
              ${ed && low ? `<label class="verify ${f.checked ? "on" : ""}"><input type="checkbox" data-dcheck="${k}" ${f.checked ? "checked" : ""}> ${f.checked ? L("ตรวจกับต้นฉบับแล้ว", "Checked against the original") : L("ตรวจกับต้นฉบับ", "Check against the original")}</label>` : ""}</div>
            <div class="fconf">${sample ? `<div class="meter"><i style="width:${Math.round(f.conf * 100)}%;background:${confTone(f.conf)}"></i></div><span style="color:${confTone(f.conf)}">${fmt(f.conf * 100)}%</span>` : `<span class="sub">—</span>`}</div></div>`; }).join("")}</div>
        <div class="chkgrid">${chk.map(x => `<span class="chk ${x.ok ? "ok" : "no"}" title="${esc(x.label)}">${x.ok ? icon("check", 13) : icon("alert", 13)}${esc(x.label)}</span>`).join("")}${lc.length ? `<span class="chk wa">${icon("alert", 13)}${L("ช่องความมั่นใจต่ำยังไม่ได้ตรวจ", "Low-confidence fields not checked")}: ${lc.map(k => L(DOC_F[d.type].find(x => x[0] === k)[1], DOC_F[d.type].find(x => x[0] === k)[2])).join(", ")}</span>` : ""}${use ? `<span class="chk no">${icon("alert", 13)}${esc(use)}</span>` : ""}</div>
        ${d.applied ? `<div class="callout" style="margin:0">${icon("check", 14)} ${L("นำไปใช้แล้ว", "Applied")}: <b>${esc(d.applied)}</b></div>` : ""}
      </div>
    </div>
    ${ed ? `<div class="actionbar"><div class="ab-status">${ready ? `<span class="chipico ok" style="width:28px;height:28px">${svgI("check")}</span><b>${L("พร้อมยืนยัน", "Ready to confirm")}</b>` : `<span class="chipico warn" style="width:28px;height:28px">${svgI("alert")}</span><div style="min-width:0"><b>${L("ยังยืนยันไม่ได้", "Not ready yet")}</b><div class="sub">${left.slice(0, 2).map(esc).join(" · ")}${left.length > 2 ? ` · +${left.length - 2}` : ""}</div></div>`}</div>
      <button class="btn ghost" type="button" id="doc-no">${L("ไม่ใช้เอกสารนี้", "Reject")}</button><button class="btn" type="button" id="doc-save">${L("บันทึกการแก้ไข", "Save edits")}</button><button class="btn primary" type="button" id="doc-ok" ${ready ? "" : "disabled"}>${icon("check", 14)} ${L("ยืนยันและนำไปใช้", "Confirm and use")}</button></div>` : ""}</section>`;
};
PROC.docs = () => {
  const pr = isProcRole() || ROLE === "fin", D = S.docs, d = D.find(x => x.id === DOC_OPEN), st = ocrStats();
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">${icon("scan", 16)}</div><div><b>${L("การอ่านเอกสารในต้นแบบเป็นการจำลอง", "Document reading in this prototype is simulated")}</b><p>${L("เอกสารตัวอย่างมีผลการอ่านกำหนดไว้ล่วงหน้า และตั้งใจให้อ่านผิดหนึ่งช่อง ส่วนกฎตรวจ V-01 ถึง V-07 การจับคู่ และการนำข้อมูลไปใช้ทำงานจริง (D-P10)", "Sample documents have fixed reading results with one field misread on purpose; checks V-01 to V-07, matching and using the data work for real (D-P10).")}</p></div></div>
  <section class="stats">
    ${statCard({ label: L("เอกสารทั้งหมด", "Documents"), value: D.length, icon: "file", tone: "info", sub: "" })}
    ${statCard({ label: L("รอตรวจ", "To verify"), value: D.filter(x => x.status === "extracted" || x.status === "manual").length, icon: "clock", tone: "warn", sub: "" })}
    ${statCard({ label: L("ยืนยันแล้ว", "Confirmed"), value: D.filter(x => x.status === "confirmed").length, icon: "check", tone: "ok", sub: "" })}
    ${statCard({ label: L("ช่องที่อ่านถูกโดยไม่ต้องแก้", "Fields right without edits"), value: st.fields ? pc(st.right / st.fields) : "—", ring: st.fields ? st.right / st.fields : 0, sub: st.fields ? `${st.right}/${st.fields}` : "" })}</section>
  ${pr ? `<section class="panel"><header>${chipIco("scan", "info")}<h2>${L("รับเอกสารเข้า", "Add a document")}</h2><span class="sp"></span><span class="mono sub">AG-14</span> ${agentOn("AG-14") ? "" : tag(L("ปิดอยู่ใน M09", "Off in M09"), "p-bad")}</header>
    <div class="body intake"><label class="dropzone">${icon("download", 26)}<b>${L("วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก", "Drop a file here, or click to choose")}</b><span class="sub">${L("ภาพหรือ PDF ของใบแจ้งหนี้ ใบส่งของ หนังสือค้ำประกัน หรือใบเสนอราคา", "Image or PDF of an invoice, delivery note, guarantee or quotation")}</span><input type="file" id="doc-up" accept="image/*,application/pdf" hidden></label>
      <div class="samples"><div class="sub" style="font-weight:600">${L("หรือลองเอกสารตัวอย่าง", "Or try a sample")}</div>${Object.keys(DOC_TYPE).map(k => `<button class="sample-tile" type="button" data-dsample="${k}">${chipIco(DOC_ICON[k], "info")}<span>${tx(DOC_TYPE[k])}</span>${icon("arrow", 14)}</button>`).join("")}</div></div></section>` : ""}
  ${D.length ? `<section class="panel"><header><h2>${L("เอกสาร", "Documents")}</h2><span class="sp"></span><span class="sub">${D.length}</span></header>
    <div class="doclist">${D.slice().reverse().map(x => { const mm = docMatch(x); return `<button type="button" class="docitem ${DOC_OPEN === x.id ? "on" : ""}" data-dopen="${x.id}">${chipIco(DOC_ICON[x.type], x.status === "confirmed" ? "ok" : x.status === "rejected" ? "" : "warn")}<div style="min-width:0;text-align:left"><b>${tx(DOC_TYPE[x.type])}</b><div class="sub">${x.id} · ${mm.c ? mm.c.id : mm.cs ? mm.cs.id : L("ยังไม่จับคู่", "not matched")}</div></div>${stTag(DOC_ST, x.status)}</button>`; }).join("")}</div></section>` : ""}
  ${d ? docReview(d, pr) : ""}`;
};
{
  const base = BIND.procurement;
  BIND.procurement = () => {
    base();
    if (PROC_TAB !== "docs") return;
    const svg = $(".docsvg"); if (!svg) return;
    $$(".frow[data-dk]").forEach(r => {
      const g = svg.querySelector(`g[data-dk="${r.dataset.dk}"]`); if (!g) return;
      const on = () => g.classList.add("hi"), off = () => g.classList.remove("hi");
      r.addEventListener("mouseenter", on); r.addEventListener("mouseleave", off); r.addEventListener("focusin", on); r.addEventListener("focusout", off);
    });
    $$("[data-dcheck]").forEach(c => c.addEventListener("change", () => { const b = $("#doc-save"); if (b) b.click(); }));
    const dz = $(".dropzone input#doc-up") && $(".dropzone");
    if (dz) { dz.ondragover = e => { e.preventDefault(); dz.classList.add("over"); }; dz.ondragleave = () => dz.classList.remove("over"); dz.ondrop = e => { e.preventDefault(); dz.classList.remove("over"); const f = e.dataTransfer.files[0]; if (!f) return; const inp = $("#doc-up"), dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.onchange(); }; }
  };
}
