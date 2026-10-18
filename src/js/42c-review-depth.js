// M04 deeper features (round 9): budget hearings with units (questions sent ahead, answered on the
// unit's M02 page, accepted or followed up by Planning) and the KPI impact of proposed cuts.
const HQ_ST = q => (q.ok === true ? [["ยอมรับคำชี้แจง", "Accepted"], "p-ok"] : q.ok === false ? [["ขอข้อมูลเพิ่ม", "Follow-up asked"], "p-mute"] : q.ans ? [["รอกองแผนตรวจ", "Awaiting Planning"], "p-info"] : [["รอหน่วยงานตอบ", "Awaiting the unit"], "p-warn"]);
const openQs = h => h.qs.filter(q => !q.ans);

REV_PANELS.hearings = () => {
  const pl = ROLE === "plan", H = (S.hearings || []).filter(h => h.status !== "cancelled");
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("การชี้แจงงบประมาณภายในกรม", "Internal budget hearings")}</b>
    <p>${L("กองแผนงานส่งคำถามล่วงหน้า หน่วยงานตอบในหน้าคำของบประมาณ (M02) ก่อนวันประชุมชี้แจง", "Planning sends questions ahead; units answer on their M02 requests page before the hearing")}</p></div></div>
  ${H.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map(h => `
  <section class="panel"><header><h2>${unitName(h.unit)}</h2><span class="sub">${fdate(h.date)} · ${h.time} ${L("น.", "")}</span><span class="sp"></span>
      ${historyBtn(h.id, `${h.id} ${unitName(h.unit)}`)}${tag(h.status === "held" ? L("ชี้แจงแล้ว", "Held") : `${L("นัดชี้แจง", "Scheduled")} · ${daysUntil(h.date)} ${L("วัน", "days")}`, h.status === "held" ? "p-ok" : "p-info")}</header>
    <div class="tbl-wrap"><table><thead><tr><th style="width:34%">${L("คำถาม", "Question")}</th><th>${L("คำชี้แจงของหน่วยงาน", "Unit's answer")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${h.qs.map(q => `<tr><td>${esc(tx(q.q))}${q.follow ? ` <span class="sub">(${L("ถามเพิ่ม", "follow-up")})</span>` : ""}</td>
        <td>${q.ans ? `${esc(tx(q.ans))}<div class="sub">${q.by ? esc(userName(q.by)) + " · " : ""}${fdate(q.t, true)}</div>` : `<span class="sub">—</span>`}</td>
        <td>${tag(tx(HQ_ST(q)[0]), HQ_ST(q)[1])}</td>
        <td>${pl && q.ans && q.ok == null ? `<div class="row" style="flex-wrap:nowrap"><button class="btn primary" type="button" data-hok="${h.id}|${q.id}">${L("ยอมรับ", "Accept")}</button><button class="btn" type="button" data-hfu="${h.id}|${q.id}">${L("ถามเพิ่ม", "Follow up")}</button></div>` : ""}</td></tr>`).join("")}</tbody></table></div>
    ${pl && h.status !== "held" ? `<div class="body"><form class="inline-form" data-hadd="${h.id}"><div class="f" style="flex:2 1 260px"><label for="hq-${h.id}">${L("เพิ่มคำถามหรือคำถามติดตาม", "Add a question or follow-up")}</label><input type="text" id="hq-${h.id}" required></div>
      <button class="btn" type="submit">${L("ส่งคำถาม", "Send question")}</button>
      <button class="btn primary" type="button" data-hheld="${h.id}">${L("บันทึกว่าชี้แจงแล้ว", "Mark hearing held")}</button></form></div>` : ""}</section>`).join("")}
  ${pl ? `<section class="panel"><header><h2>${L("นัดหมายการชี้แจงใหม่", "Schedule a hearing")}</h2></header><div class="body"><form class="inline-form" id="h-new">
    <div class="f"><label for="hn-unit">${L("หน่วยงาน", "Unit")}</label><select id="hn-unit">${S.units.filter(u => u.parent).map(u => `<option value="${u.id}">${esc(tx(u.name))}</option>`).join("")}</select></div>
    <div class="f" style="flex:0 1 170px"><label for="hn-date">${L("วันที่", "Date")}</label><input type="date" id="hn-date" min="${TODAY}" value="${addDays(TODAY, 7)}" required></div>
    <div class="f" style="flex:0 1 120px"><label for="hn-time">${L("เวลา", "Time")}</label><input type="time" id="hn-time" value="09:30" required></div>
    <button class="btn primary" type="submit">${L("นัดหมายและแจ้งหน่วยงาน", "Schedule and notify the unit")}</button></form></div></section>` : ""}`;
};
REV_BIND.hearings = () => {
  const find = v => { const [hid, qid] = v.split("|"), h = S.hearings.find(x => x.id === hid); return { h, q: h.qs.find(x => x.id === qid) }; };
  $$("[data-hok]").forEach(b => (b.onclick = () => { const { h, q } = find(b.dataset.hok); q.ok = true; audit(["ยอมรับคำชี้แจงของหน่วยงาน", "Accepted a unit's answer"], `${h.id} ${q.id}`); commit(); route(); }));
  $$("[data-hfu]").forEach(b => (b.onclick = () => {
    const { h, q } = find(b.dataset.hfu); q.ok = false;
    const id = `${h.id}-Q${h.qs.length + 1}`, t = [`ขอข้อมูลเพิ่มเติม: ${q.q[0]}`, `More detail please: ${q.q[1]}`];
    h.qs.push({ id, q: t, ans: null, ok: null, t: null, by: null, follow: true });
    audit(["ขอข้อมูลเพิ่มเติมจากหน่วยงาน", "Asked a unit for more detail"], `${h.id} ${q.id}`);
    notify(["div"], [`กองแผนงานขอข้อมูลเพิ่มเติมสำหรับการชี้แจง ${h.id}`, `Planning asked for more detail for hearing ${h.id}`], "requests");
    commit(); route(); toast(L("ส่งคำถามติดตามแล้ว", "Follow-up sent"));
  }));
  $$("[data-hadd]").forEach(f => (f.onsubmit = e => {
    e.preventDefault();
    const h = S.hearings.find(x => x.id === f.dataset.hadd), v = $("#hq-" + h.id).value.trim();
    h.qs.push({ id: `${h.id}-Q${h.qs.length + 1}`, q: [v, v], ans: null, ok: null, t: null, by: null });
    audit(["ส่งคำถามล่วงหน้าให้หน่วยงาน", "Sent a question ahead to a unit"], h.id);
    notify(["div"], [`มีคำถามใหม่สำหรับการชี้แจง ${h.id} วันที่ ${fdate(h.date)}`, `New question for hearing ${h.id} on ${fdate(h.date)}`], "requests");
    commit(); route(); toast(L("ส่งคำถามแล้ว", "Question sent"));
  }));
  $$("[data-hheld]").forEach(b => (b.onclick = () => {
    const h = S.hearings.find(x => x.id === b.dataset.hheld);
    if (openQs(h).length) { toast(L(`ยังมีคำถามที่หน่วยงานยังไม่ตอบ ${openQs(h).length} ข้อ`, `${openQs(h).length} questions still have no answer`)); return; }
    h.status = "held"; if (h.date > TODAY) h.date = TODAY;
    audit(["บันทึกการประชุมชี้แจงงบประมาณ", "Recorded a budget hearing"], `${h.id} ${unitName(h.unit)}`); commit(); route();
  }));
  const f = $("#h-new");
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const id = `H-${String(S.hearings.length + 3).padStart(2, "0")}`, unit = $("#hn-unit").value;
    S.hearings.push({ id, unit, date: $("#hn-date").value, time: $("#hn-time").value, status: "scheduled", qs: [] });
    audit(["นัดหมายการชี้แจงงบประมาณ", "Scheduled a budget hearing"], `${id} ${unitName(unit)}`);
    notify(["div"], [`นัดชี้แจงงบประมาณ ${unitName(unit)} วันที่ ${fdate($("#hn-date").value)}`, `Budget hearing for ${unitName(unit)} on ${fdate($("#hn-date").value)}`], "requests");
    commit(); route(); toast(L("นัดหมายแล้ว · เพิ่มคำถามล่วงหน้าได้ในการ์ดของหน่วยงาน", "Scheduled · add questions in the unit's card"));
  };
};

// The unit's side: answer Planning's questions on the M02 requests page.
function hearingBanner() {
  const H = (S.hearings || []).filter(h => h.unit === me().unit && !["held", "cancelled"].includes(h.status));
  if (!H.length) return "";
  return H.map(h => `<section class="panel" id="hear-${h.id}"><header><h2>${L("ชี้แจงงบประมาณกับกองแผนงาน", "Budget hearing with Planning")}</h2><span class="sub">${fdate(h.date)} · ${h.time} ${L("น.", "")}</span><span class="sp"></span>
      ${openQs(h).length ? tag(`${openQs(h).length} ${L("คำถามรอตอบ", "to answer")}`, "p-warn") : tag(L("ตอบครบแล้ว", "All answered"), "p-ok")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:12px">${h.qs.map(q => `<div class="f"><label for="ha-${q.id}"><b style="font-weight:600">${esc(tx(q.q))}</b></label>
      ${q.ans ? `<div>${esc(tx(q.ans))} ${tag(tx(HQ_ST(q)[0]), HQ_ST(q)[1])}</div>` : `<div class="row" style="flex-wrap:nowrap"><input type="text" id="ha-${q.id}" style="flex:1" placeholder="${L("พิมพ์คำชี้แจง", "Type your answer")}"><button class="btn primary" type="button" data-hans="${h.id}|${q.id}">${L("ส่งคำชี้แจง", "Send")}</button></div>`}</div>`).join("")}</div></section>`).join("");
}
function bindHearingBanner() {
  $$("[data-hans]").forEach(b => (b.onclick = () => {
    const [hid, qid] = b.dataset.hans.split("|"), h = S.hearings.find(x => x.id === hid), q = h.qs.find(x => x.id === qid), v = $("#ha-" + qid).value.trim();
    if (!v) { toast(L("พิมพ์คำชี้แจงก่อน", "Type an answer first")); return; }
    Object.assign(q, { ans: [v, v], ok: null, t: nowIso(), by: me().id });
    audit(["ตอบคำถามการชี้แจงงบประมาณ", "Answered a hearing question"], `${h.id} ${q.id}`);
    notify(["plan"], [`${unitName(h.unit)} ตอบคำถามการชี้แจง ${h.id}`, `${unitName(h.unit)} answered a question for hearing ${h.id}`], "rev-hearings");
    commit(); route(); toast(L("ส่งคำชี้แจงแล้ว", "Answer sent"));
  }));
}

// ---- cut impact ----
let IMP_R = "r2";
function cutRows() {
  return S.review.map(v => {
    const rq = S.requests.find(r => r.id === v.id), ks = rq && rq.act ? kpisForAct(rq.act).map(x => x.k) : allKpis().filter(x => x.k.owner === v.unit).map(x => x.k);
    const ratio = v.r0 ? Math.min(1, v[IMP_R] / v.r0) : 1;
    // Assumes the KPI's planned gain over its baseline scales with the share of funding kept.
    const kp = ks.map(k => { const t = k.targets[0], proj = k.base + (t - k.base) * ratio, short = t ? Math.max(0, 1 - proj / t) : 0; return { k, t, proj, short }; });
    return { v, ratio, kp, risk: Math.max(0, ...kp.map(x => x.short)) };
  });
}
const riskTag = s => (s >= 0.15 ? tag(L("เสี่ยงสูง", "High risk"), "p-bad") : s >= 0.05 ? tag(L("เสี่ยงปานกลาง", "Medium risk"), "p-warn") : tag(L("ไม่กระทบมาก", "Low impact"), "p-ok"));
REV_PANELS.impact = () => {
  const rows = cutRows(), atRisk = rows.flatMap(r => r.kp).filter(x => x.short >= 0.05), cut = rows.reduce((s, r) => s + r.v.r0 - r.v[IMP_R], 0);
  return `
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("วงเงินที่ปรับลดจากคำขอ", "Cut from the requests")}</span><span class="v">${fmt(cut, 1)}<small>${L("ล้านบาท", "M baht")}</small></span></div>
    <div class="kpi"><span class="l">${L("ตัวชี้วัดที่เสี่ยงไม่บรรลุเป้าปี 2571", "KPIs at risk of missing 2571 targets")}</span><span class="v" style="color:var(--${atRisk.length ? "bad" : "accent"})">${atRisk.length}</span></div>
    <div class="kpi"><span class="l">${L("เปรียบเทียบกับ", "Compare")}</span><div class="seg" role="group" aria-label="${L("รอบ", "Round")}" style="margin-top:6px">
      <button type="button" data-imp="r1" class="${IMP_R === "r1" ? "on" : ""}">${L("รอบ 2 กองแผน", "Round 2 Planning")}</button><button type="button" data-imp="r2" class="${IMP_R === "r2" ? "on" : ""}">${L("รอบ 3 ผู้บริหาร", "Round 3 Executive")}</button></div></div>
  </section>
  <section class="panel"><header><h2>${L("ผลกระทบของการปรับลดต่อตัวชี้วัด", "Impact of cuts on KPIs")}</h2><span class="sp"></span><span class="sub">${L("สมมติว่าผลลัพธ์ที่เพิ่มขึ้นแปรผันตามสัดส่วนวงเงินที่ได้รับ", "Assumes the planned gain scales with the share of funding kept")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("โครงการ", "Project")}</th><th class="n">${L("คำขอ → รอบนี้ (ลบ.)", "Request → this round (M)")}</th><th>${L("ตัวชี้วัด", "KPI")}</th><th class="n">${L("เป้าปี 2571", "2571 target")}</th><th class="n">${L("คาดว่าทำได้", "Projected")}</th><th>${L("ความเสี่ยง", "Risk")}</th></tr></thead>
      <tbody>${rows.map(r => { const n = Math.max(1, r.kp.length); return r.kp.length ? r.kp.map((x, i) => `<tr>${i ? "" : `<td rowspan="${n}"><b style="font-weight:600">${esc(tx(r.v.name))}</b><div class="sub"><span class="mono">${r.v.id}</span> · ${unitName(r.v.unit)}</div></td>
          <td class="n" rowspan="${n}">${fmt(r.v.r0, 1)} → <b>${fmt(r.v[IMP_R], 1)}</b><div class="sub">${L("คงไว้", "kept")} ${fmt(r.ratio * 100, 0)}%</div></td>`}
          <td><span class="mono sub">${x.k.id}</span> ${esc(tx(x.k.name))}</td><td class="n">${fmt(x.t, x.t % 1 ? 1 : 0)} <span class="sub">${tx(x.k.unit)}</span></td><td class="n">${fmt(x.proj, 1)}</td><td>${riskTag(x.short)}${x.short ? ` <span class="sub">−${fmt(x.short * 100, 0)}%</span>` : ""}</td></tr>`).join("")
        : `<tr><td><b style="font-weight:600">${esc(tx(r.v.name))}</b><div class="sub">${unitName(r.v.unit)}</div></td><td class="n">${fmt(r.v.r0, 1)} → <b>${fmt(r.v[IMP_R], 1)}</b></td><td colspan="4" class="sub">${L("ยังไม่ผูกตัวชี้วัดใน M01", "No M01 KPI linked")}</td></tr>`; }).join("")}</tbody></table></div>
    <div class="body sub">${L("ใช้ประกอบการพิจารณาของคณะกรรมการก่อนเห็นชอบวงเงินรอบที่ 3 · ปรับวงเงินได้ที่แท็บวงเงินแต่ละรอบ", "For the committee before it settles round 3 · change amounts in the Amounts by round tab")}</div></section>`;
};
REV_BIND.impact = () => $$("[data-imp]").forEach(b => (b.onclick = () => { IMP_R = b.dataset.imp; route(); }));
