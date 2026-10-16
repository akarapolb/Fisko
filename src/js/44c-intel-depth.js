// M09 deeper features (round 10): spending anomalies flagged by the monitoring agent for Audit to
// review, and a quality score for each request's justification with suggestions.
const AN_KIND = { split: ["แบ่งซื้อแบ่งจ้าง", "Split purchases"], spike: ["เบิกจ่ายกระจุกปลายปี", "Year-end spending spike"], early: ["จ่ายเงินก่อนตรวจรับ", "Paid before inspection"], vendor: ["ผู้ขายรายเดียวครองสัดส่วนสูง", "Supplier concentration"] };
const AN_ST = { new: [["รอตรวจ", "To review"], "p-warn"], explained: [["มีคำชี้แจงแล้ว", "Explained"], "p-ok"], escalated: [["ส่งตรวจสอบเพิ่มเติม", "Escalated"], "p-bad"] };

INTEL.anoms = () => {
  const A = S.anoms || [], au = ROLE === "audit", on = agentOn("AG-05");
  const recs = a => a.kind === "spike" ? a.recs.map(r => `<tr><td>${r[0]}</td><td class="n">${fmt(r[1], 1)}%</td></tr>`).join("")
    : a.kind === "vendor" ? `<tr><td>${esc(tx(a.vendor))}</td><td class="n">${a.recs[0][0]}</td></tr>`
    : a.recs.map(r => `<tr><td>${fdate(r[0])}</td><td class="n">${fmt(r[1])}</td></tr>`).join("");
  return `
  ${on ? "" : `<div class="alert"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${L("Budget Monitoring Agent ปิดอยู่", "The Budget Monitoring Agent is off")}</b><p>${L("จะไม่มีการตรวจหาความผิดปกติใหม่จนกว่าจะเปิดในแท็บ AI Agents", "No new anomalies are flagged until it is switched on in the AI agents tab")}</p></div></div>`}
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("รายการผิดปกติรอตรวจ", "Anomalies to review")}</span><span class="v" style="color:var(--${A.some(a => a.status === "new") ? "warn" : "accent"})">${A.filter(a => a.status === "new").length}</span></div>
    <div class="kpi"><span class="l">${L("ความเสี่ยงสูง (≥ 70)", "High risk (≥ 70)")}</span><span class="v">${A.filter(a => a.risk >= 70 && a.status !== "explained").length}</span></div>
    <div class="kpi"><span class="l">${L("ตรวจล่าสุดโดย AG-05", "Last scan by AG-05")}</span><span class="v" style="font-size:20px">${fdate(A.reduce((m, a) => (a.t > m ? a.t : m), ""), true)}</span></div>
  </section>
  ${A.slice().sort((a, b) => (a.status === "new" ? 0 : 1) - (b.status === "new" ? 0 : 1) || b.risk - a.risk).map(a => `
  <section class="panel"><header><h2>${tx(AN_KIND[a.kind])} · ${unitName(a.unit)}</h2><span class="sp"></span><span class="mono sub">${a.id}</span>${historyBtn(a.id, a.id)}${tag(tx(AN_ST[a.status][0]), AN_ST[a.status][1])}</header>
    <div class="body an-body">
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span>${esc(tx(a.detail))}</span>
        <div class="row"><span class="sub">${L("คะแนนความเสี่ยง", "Risk score")}</span><div class="bar" style="width:140px"><i style="width:${a.risk}%;background:var(--${a.risk >= 70 ? "bad" : a.risk >= 50 ? "warn" : "info"})"></i></div><b class="num">${a.risk}</b></div>
        ${a.vendor && a.kind !== "vendor" ? `<span class="sub">${L("ผู้ขาย", "Supplier")}: ${esc(tx(a.vendor))}</span>` : ""}
        ${a.note ? `<div class="sub">${L("ผลการตรวจ", "Review")}: ${esc(tx(a.note))}</div>` : ""}
        ${au && a.status === "new" ? `<div class="row" style="flex-wrap:nowrap"><input type="text" id="an-${a.id}" style="flex:1" placeholder="${L("บันทึกผลการตรวจหรือคำชี้แจงของหน่วยงาน", "Record what you found or the unit's explanation")}">
          <button class="btn" type="button" data-anok="${a.id}">${L("มีคำชี้แจง · ปิด", "Explained · close")}</button><button class="btn danger" type="button" data-anesc="${a.id}">${L("ส่งตรวจสอบเพิ่มเติม", "Escalate")}</button></div>` : ""}</div>
      <div class="tbl-wrap"><table><thead><tr><th>${a.kind === "spike" ? L("เดือน", "Month") : a.kind === "vendor" ? L("ผู้ขาย", "Supplier") : L("วันที่", "Date")}</th><th class="n">${a.kind === "spike" ? L("% ของทั้งปี", "% of year") : a.kind === "vendor" ? L("สัดส่วน", "Share") : L("บาท", "Baht")}</th></tr></thead><tbody>${recs(a)}</tbody></table></div>
    </div></section>`).join("")}
  <p class="sub">${L("AI ชี้รายการที่ควรตรวจเท่านั้น ผู้ตรวจสอบเป็นผู้ตัดสิน ทุกการตัดสินบันทึกในบันทึกการใช้งาน", "AI only points to what to check; the auditor decides, and every decision is in the audit log")}</p>`;
};
INTEL_BIND.anoms = () => {
  const act = (id, ok) => {
    const a = S.anoms.find(x => x.id === id), v = $("#an-" + id).value.trim();
    if (!v) { toast(L("บันทึกผลการตรวจก่อน", "Record what you found first")); $("#an-" + id).focus(); return; }
    a.status = ok ? "explained" : "escalated"; a.note = [v, v];
    audit(ok ? ["ปิดรายการผิดปกติ (มีคำชี้แจง)", "Closed an anomaly (explained)"] : ["ส่งรายการผิดปกติตรวจสอบเพิ่มเติม", "Escalated an anomaly"], `${a.id} · ${unitName(a.unit)}`);
    if (!ok) notify(["exec", "fin"], [`ผู้ตรวจสอบส่ง ${a.id} (${AN_KIND[a.kind][0]}) ตรวจสอบเพิ่มเติม`, `Audit escalated ${a.id} (${AN_KIND[a.kind][1]})`], "intel-anoms");
    commit(); route(); toast(ok ? L("ปิดรายการแล้ว", "Closed") : L("ส่งตรวจสอบเพิ่มเติมแล้ว · แจ้งผู้บริหารและกองคลัง", "Escalated · executive and Finance notified"));
  };
  $$("[data-anok]").forEach(b => (b.onclick = () => act(b.dataset.anok, true)));
  $$("[data-anesc]").forEach(b => (b.onclick = () => act(b.dataset.anesc, false)));
};

// ---- justification quality ----
function jqScore(r) {
  const t = tx(r.reason).trim(), min = (rule("BR-02") || {}).param || 0;
  const c = [
    [t.length >= min, 25, L(`ยาวไม่น้อยกว่า ${min} ตัวอักษร`, `At least ${min} characters`), L("ขยายความให้ครบ ปัญหา ความจำเป็น และผลที่ได้", "Say more: the problem, the need and the result")],
    [/ปัญหา|เนื่องจาก|ปัจจุบัน|problem|because|currently/i.test(t), 20, L("ระบุปัญหาหรือสภาพปัจจุบัน", "States the problem"), L("เริ่มด้วยปัญหาหรือสภาพปัจจุบันที่ต้องแก้", "Open with the problem or current situation")],
    [/ประชาชน|ผู้รับบริการ|ผู้ใช้|ชุมชน|citizen|user|communit|people/i.test(t), 20, L("ระบุกลุ่มเป้าหมายผู้ได้รับประโยชน์", "Names who benefits"), L("ระบุว่าใครได้ประโยชน์และกี่คน", "Say who benefits and how many")],
    [/\d/.test(t), 20, L("มีตัวเลขเชิงปริมาณ", "Uses numbers"), L("ใส่ตัวเลข เช่น จำนวนผู้รับบริการ เวลาที่ลดลง", "Add numbers, e.g. people served or time saved")],
    [!!tx(r.kpi).trim() || kpisForAct(r.act).length > 0, 15, L("เชื่อมกับตัวชี้วัด", "Linked to a KPI"), L("ผูกกับตัวชี้วัดใน M01", "Link it to an M01 KPI")],
  ];
  return { score: c.reduce((s, x) => s + (x[0] ? x[1] : 0), 0), c };
}
INTEL.quality = () => {
  const list = (ROLE === "div" ? S.requests.filter(r => r.unit === me().unit) : S.requests).filter(r => !isPersonnel(r));
  const rows = list.map(r => ({ r, q: jqScore(r) })).sort((a, b) => a.q.score - b.q.score), avg = rows.length ? rows.reduce((s, x) => s + x.q.score, 0) / rows.length : 0;
  return `
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi hl"><span class="l">${L("คะแนนเฉลี่ย", "Average score")}</span><span class="v">${fmt(avg, 0)}<small>/ 100</small></span></div>
    <div class="kpi"><span class="l">${L("ต่ำกว่า 60 ควรปรับปรุง", "Below 60, needs work")}</span><span class="v" style="color:var(--${rows.some(x => x.q.score < 60) ? "bad" : "accent"})">${rows.filter(x => x.q.score < 60).length}</span></div>
    <div class="kpi"><span class="l">${L("คำขอที่ประเมิน", "Requests scored")}</span><span class="v">${rows.length}</span></div>
  </section>
  <section class="panel"><header><h2>${L("คุณภาพเหตุผลความจำเป็นของคำขอ", "Justification quality by request")}</h2><span class="sp"></span><span class="sub">${L("Budget Validation Agent (AG-02) · เกณฑ์จาก M10", "Budget Validation Agent (AG-02) · rules from M10")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("สถานะ", "Status")}</th><th style="width:150px">${L("คะแนน", "Score")}</th><th>${L("ข้อเสนอแนะ", "Suggestions")}</th><th></th></tr></thead>
      <tbody>${rows.map(({ r, q }) => `<tr><td><span class="mono sub">${r.id}</span> ${esc(tx(r.name))}<div class="sub">${unitName(r.unit)}</div></td><td>${pill(r.status)}</td>
        <td><div class="bar"><i style="width:${q.score}%;background:var(--${q.score >= 80 ? "accent" : q.score >= 60 ? "warn" : "bad"})"></i></div><span class="sub">${q.score} / 100</span></td>
        <td>${q.c.filter(x => !x[0]).map(x => `<div class="sub">• ${x[3]}</div>`).join("") || `<span class="sub">${L("ครบทุกเกณฑ์", "Meets every criterion")}</span>`}</td>
        <td><button class="btn" type="button" data-qopen="${r.id}">${L("เปิดคำขอ", "Open")}</button></td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("เกณฑ์", "Criteria")}: ${jqScore({ reason: "", kpi: "", act: "" }).c.map(x => `${x[2]} ${x[1]}`).join(" · ")}</div></section>`;
};
INTEL_BIND.quality = () => $$("[data-qopen]").forEach(b => (b.onclick = () => openReq(b.dataset.qopen)));
