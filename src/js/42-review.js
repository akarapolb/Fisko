// M04 Review & Approval: amounts per round, saved as new versions with a reason; history never overwritten.
VIEWS.review = () => {
  const can1 = ROLE === "plan", can2 = ROLE === "exec", can = can1 || can2;
  const s = k => S.review.reduce((a, r) => a + Number(r[k]), 0);
  const M = L("ล้านบาท", "M baht");
  return `
  <div class="head"><div><div class="eyebrow">M04 · Budget Review &amp; Approval</div><h1>${L("กลั่นกรองคำของบประมาณ", "Review budget requests")}</h1>
    <p>${L("แต่ละรอบเก็บเป็นเวอร์ชันใหม่ ไม่เขียนทับวงเงินเดิม และทุกการปรับต้องระบุเหตุผล", "Each round is a new version. Earlier amounts are never overwritten and every change needs a reason.")}</p></div></div>
  ${revTabsBar()}
  ${REV_TAB !== "rounds" ? REV_PANELS[REV_TAB]() : `
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("รอบ 1 · คำขอเริ่มต้น", "Round 1 · Requested")}</span><span class="v">${fmt(s("r0"), 1)}<small>${M}</small></span></div>
    <div class="kpi"><span class="l">${L("รอบ 2 · กองแผนเสนอ", "Round 2 · Planning proposal")}</span><span class="v">${fmt(s("r1"), 1)}<small>${M}</small></span><span class="d sub">${fmt((s("r1") / s("r0") - 1) * 100, 1)}% ${L("จากคำขอ", "vs request")}</span></div>
    <div class="kpi hl"><span class="l">${L("รอบ 3 · ผู้บริหารเห็นชอบ", "Round 3 · Executive decision")}</span><span class="v">${fmt(s("r2"), 1)}<small>${M}</small></span><span class="d" style="color:var(--rail-ink)">${fmt((s("r2") / s("r0") - 1) * 100, 1)}% ${L("จากคำขอ", "vs request")}</span></div>
  </section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("วงเงินแต่ละรอบ (ล้านบาท)", "Amount per round (million baht)")}</h2><span class="sp"></span>
      ${tag(can1 ? L("คุณแก้ไขรอบ 2 ได้", "You can edit round 2") : can2 ? L("คุณแก้ไขรอบ 3 ได้", "You can edit round 3") : L("ดูอย่างเดียว", "View only"), can ? "p-ok" : "p-mute")}</header>
      <div class="tbl-wrap"><table class="rounds"><thead><tr><th>${L("โครงการ", "Project")}</th><th class="n">${L("คำขอเริ่มต้น", "Requested")}</th><th class="n">${L("กองแผนเสนอ", "Planning")}</th><th class="n">${L("ผู้บริหารเห็นชอบ", "Executive")}</th></tr></thead>
        <tbody>${S.review.map((r, i) => `<tr><td><b style="font-weight:600">${esc(tx(r.name))}</b><div class="sub"><span class="mono">${r.id}</span> · ${unitName(r.unit)}</div></td>
          <td class="n">${fmt(r.r0, 1)}</td>
          <td class="n"><input type="number" step="0.5" min="0" id="r1-${i}" data-i="${i}" data-k="r1" value="${r.r1}" ${can1 ? "" : "disabled"} aria-label="${L("กองแผนเสนอ", "Planning")} ${esc(tx(r.name))}"><div class="delta ${r.r1 < r.r0 ? "dn" : ""}">${r.r1 === r.r0 ? L("เท่าคำขอ", "Same as request") : fmt(r.r1 - r.r0, 1)}</div></td>
          <td class="n"><input type="number" step="0.5" min="0" id="r2-${i}" data-i="${i}" data-k="r2" value="${r.r2}" ${can2 ? "" : "disabled"} aria-label="${L("ผู้บริหารเห็นชอบ", "Executive")} ${esc(tx(r.name))}"><div class="delta ${r.r2 < r.r1 ? "dn" : ""}">${r.r2 === r.r1 ? L("เท่ารอบ 2", "Same as round 2") : fmt(r.r2 - r.r1, 1)}</div></td></tr>`).join("")}</tbody>
        <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(s("r0"), 1)}</td><td class="n">${fmt(s("r1"), 1)}</td><td class="n">${fmt(s("r2"), 1)}</td></tr></tfoot></table></div>
      <div class="body form-grid">
        <div class="f full"><label for="why">${L("เหตุผลการปรับวงเงิน", "Reason for the change")}</label><input type="text" id="why" placeholder="${L("เช่น ปรับตามราคากลาง หรือแบ่งดำเนินการเป็นระยะ", "e.g. aligned to standard prices, or phased delivery")}" ${can ? "" : "disabled"}></div>
        <div class="f full"><div class="row">
          <button class="btn primary" type="button" id="rv-save" ${can ? "" : "disabled"}>${L("บันทึกเป็นเวอร์ชันใหม่", "Save as new version")}</button>
          <button class="btn" type="button" id="rv-fwd" ${can ? "" : "disabled"}>${can2 ? L("เห็นชอบและส่งจัดทำคำขอระดับหน่วยรับงบฯ", "Approve and send for agency-level request") : L("เสนอคณะกรรมการ / ผู้บริหาร", "Send to committee / executives")}</button>
          <button class="btn danger" type="button" id="rv-ret" ${can ? "" : "disabled"}>${L("ส่งกลับแก้ไข", "Return for revision")}</button></div>
          ${can ? "" : `<span class="hint">${L("สลับบทบาทเป็น “กองแผนงาน” หรือ “ผู้บริหาร” เพื่อทดลองปรับวงเงิน", "Switch role to Planning Division or Executive to try changing amounts")}</span>`}</div>
      </div></section>
    <section class="panel"><header><h2>${L("ประวัติการเปลี่ยนแปลง", "Change history")}</h2><span class="sp"></span><span class="sub">${S.log.length} ${L("เวอร์ชัน", "versions")}</span></header>
      <div class="body"><ul class="log">${S.log.map(l => `<li class="${l.isNew ? "new" : ""}"><b style="font-weight:600">${esc(tx(l.text))}</b><small>${tx(ROLES[l.role])} · ${fdate(l.t, true)}</small><span class="sub">${L("เหตุผล", "Reason")}: ${esc(tx(l.why))}</span></li>`).join("")}</ul></div></section>
  </div>`}`;
};
BIND.review = () => {
  $$("[data-vtab]").forEach(b => (b.onclick = () => { REV_TAB = b.dataset.vtab; route(); }));
  if (REV_TAB !== "rounds") { (REV_BIND[REV_TAB] || (() => {}))(); return; }
  $$(".rounds input").forEach(inp => (inp.oninput = () => inp.classList.toggle("changed", Number(inp.value) !== S.review[inp.dataset.i][inp.dataset.k])));
  $("#rv-save").onclick = () => {
    const changed = $$(".rounds input.changed");
    if (!changed.length) { toast(L("ยังไม่มีวงเงินที่เปลี่ยน", "No amounts changed yet")); return; }
    const why = $("#why").value.trim();
    if (!why) { toast(L("ระบุเหตุผลการปรับวงเงินก่อนบันทึก", "Enter a reason before saving")); $("#why").focus(); return; }
    changed.forEach(inp => {
      const r = S.review[inp.dataset.i], k = inp.dataset.k, old = r[k], nv = Number(inp.value), rd = k === "r1" ? 2 : 3;
      const nm = Array.isArray(r.name) ? r.name : [r.name, r.name];
      const text = [`รอบ ${rd} · ${nm[0].split(" · ")[0]} ปรับจาก ${old} เป็น ${nv} ล้านบาท`, `Round ${rd} · ${nm[1].split(" · ")[0]} changed from ${old} to ${nv} million baht`];
      S.log.unshift({ t: nowIso(), role: ROLE, text, why: [why, why], isNew: true });
      audit(["ปรับวงเงินระหว่างพิจารณา", "Changed a budget amount in review"], text[LANG === "en" ? 1 : 0]);
      r[k] = nv;
    });
    notify(["audit"], ["มีการปรับวงเงินระหว่างพิจารณา", "A budget amount was changed during review"], "review");
    commit(); route(); toast(L("บันทึกเวอร์ชันใหม่แล้ว · วงเงินเดิมยังอยู่ในประวัติ", "New version saved · earlier amounts stay in history"));
  };
  $("#rv-fwd").onclick = () => {
    audit(ROLE === "exec" ? ["เห็นชอบวงเงินรอบที่ 3", "Approved round 3 amounts"] : ["เสนอวงเงินรอบที่ 2 ต่อคณะกรรมการ", "Sent round 2 to the committee"], "M04");
    notify([ROLE === "exec" ? "plan" : "exec"], ROLE === "exec" ? ["ผู้บริหารเห็นชอบวงเงินรอบที่ 3 แล้ว", "Executives approved round 3"] : ["กองแผนงานเสนอวงเงินรอบที่ 2 รอพิจารณา", "Planning sent round 2 for your decision"], "review");
    commit(); toast(ROLE === "exec" ? L("เห็นชอบแล้ว · แจ้งกองแผนงาน", "Approved · Planning notified") : L("เสนอแล้ว · แจ้งผู้บริหาร", "Sent · executives notified"));
  };
  $("#rv-ret").onclick = () => {
    audit(["ส่งคำขอกลับแก้ไข", "Returned a request for revision"], "M04");
    notify(["div"], ["มีคำขอถูกส่งกลับแก้ไขจากการกลั่นกรอง", "A request was returned for revision"], "requests");
    commit(); toast(L("ส่งกลับแก้ไขแล้ว · แจ้งผู้จัดทำในระบบและอีเมล", "Returned · requester notified in-app and by email"));
  };
};
