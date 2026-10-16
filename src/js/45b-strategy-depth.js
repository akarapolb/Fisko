// M01 deeper features (round 8): the project bank (ideas scored by Planning, accepted ideas become
// draft M02 requests) and mid-term plan revision (KPI target changes approved by the executive).
STRAT_TABS.push({ id: "bank", label: ["คลังโครงการ", "Project bank"] }, { id: "revise", label: ["ทบทวนแผน", "Plan revision"] });
const STRAT_BIND = {};
const IDEA_ST = {
  proposed: [["รอกลั่นกรอง", "Awaiting screening"], "p-info"], screened: [["ให้คะแนนแล้ว", "Scored"], "p-warn"],
  accepted: [["รับเข้าแผน", "Accepted"], "p-ok"], rejected: [["ไม่รับ", "Not taken"], "p-bad"], converted: [["เป็นคำขอแล้ว", "Now a request"], "p-mute"],
};
const CRIT = [[["สอดคล้องยุทธศาสตร์", "Strategic fit"], 30], [["ความพร้อมดำเนินการ", "Readiness"], 20], [["ประโยชน์ต่อประชาชน", "Public value"], 30], [["ความเสี่ยงต่ำ", "Low risk"], 20]];
const ideaScore = i => (i.scores ? Math.round(i.scores.reduce((s, v, n) => s + v / 5 * CRIT[n][1], 0)) : null);
const findKpi = id => (allKpis().find(x => x.k.id === id) || {}).k;
let IDEA_OPEN = null; // idea being scored
const nextReqId = () => `REQ-2571-${String(Math.max(0, ...S.requests.map(r => Number(r.id.split("-")[2]) || 0)) + 1).padStart(3, "0")}`;

STRAT.bank = () => {
  const ideas = S.ideas || [], canAdd = ROLE === "div" || ROLE === "plan", pl = ROLE === "plan";
  const live = ideas.filter(i => i.status !== "rejected"), est = live.reduce((s, i) => s + i.est, 0);
  const sorted = ideas.slice().sort((a, b) => (ideaScore(b) ?? -1) - (ideaScore(a) ?? -1));
  const opts = allKpis().map(x => `<option value="${x.k.id}">${x.k.id} · ${esc(tx(x.k.name))}</option>`).join("");
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("แนวคิดโครงการ", "Project ideas")}</span><span class="v">${ideas.length}</span></div>
    <div class="kpi"><span class="l">${L("ประมาณการรวม (ไม่รวมที่ไม่รับ)", "Estimate (excl. not taken)")}</span><span class="v">${fmt(est, 1)}<small>${L("ล้านบาท", "M baht")}</small></span></div>
    <div class="kpi"><span class="l">${L("รอกลั่นกรอง", "Awaiting screening")}</span><span class="v">${ideas.filter(i => i.status === "proposed").length}</span></div>
    <div class="kpi"><span class="l">${L("รับเข้าแผน / เป็นคำขอแล้ว", "Accepted / now requests")}</span><span class="v">${ideas.filter(i => i.status === "accepted").length}<small>/ ${ideas.filter(i => i.status === "converted").length}</small></span></div>
  </section>
  <section class="panel"><header><h2>${L("คลังโครงการ ปีงบประมาณ 2571", "FY2571 project bank")}</h2><span class="sp"></span>
      <span class="sub">${L("เกณฑ์", "Criteria")}: ${CRIT.map(c => `${tx(c[0])} ${c[1]}%`).join(" · ")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("แนวคิดโครงการ", "Idea")}</th><th>${L("ตัวชี้วัด", "KPI")}</th><th class="n">${L("ประมาณการ (ลบ.)", "Estimate (M)")}</th><th class="n">${L("ปี", "Years")}</th><th style="width:150px">${L("คะแนน", "Score")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${sorted.map(i => { const sc = ideaScore(i), k = findKpi(i.kpi), mine = ROLE === "div" && i.unit === me().unit;
        return `<tr><td class="mono">${i.id}</td><td><b style="font-weight:600">${esc(tx(i.name))}</b><div class="sub">${unitName(i.unit)}${i.by ? " · " + esc(userName(i.by)) : ""}</div>${i.note ? `<div class="sub">${esc(tx(i.note))}</div>` : ""}</td>
          <td class="sub">${k ? `${k.id} ${esc(tx(k.name))}` : i.kpi}</td><td class="n">${fmt(i.est, 1)}</td><td class="n">${i.years}</td>
          <td>${sc == null ? `<span class="sub">—</span>` : `<div class="bar"><i style="width:${sc}%"></i></div><span class="sub">${sc} / 100</span>`}</td>
          <td>${tag(tx(IDEA_ST[i.status][0]), IDEA_ST[i.status][1])}${i.req ? ` <a href="#" data-req="${i.req}" class="mono">${i.req}</a>` : ""}</td>
          <td><div class="row" style="flex-wrap:nowrap">
            ${pl && (i.status === "proposed" || i.status === "screened") ? `<button class="btn" type="button" data-score="${i.id}">${i.scores ? L("ปรับคะแนน", "Rescore") : L("ให้คะแนน", "Score")}</button>` : ""}
            ${pl && i.status === "screened" ? `<button class="btn primary" type="button" data-iacc="${i.id}">${L("รับเข้าแผน", "Accept")}</button><button class="btn danger" type="button" data-irej="${i.id}">${L("ไม่รับ", "Decline")}</button>` : ""}
            ${(mine || pl) && i.status === "accepted" ? `<button class="btn primary" type="button" data-iconv="${i.id}">${L("สร้างร่างคำขอ M02", "Create M02 draft")}</button>` : ""}
            ${historyBtn(i.id, i.id)}</div></td></tr>
          ${IDEA_OPEN === i.id ? `<tr class="cmt-row"><td colspan="8"><div class="row" style="align-items:flex-end">
            ${CRIT.map((c, n) => `<div class="f"><label for="sc-${n}">${tx(c[0])} (${c[1]}%)</label><select id="sc-${n}">${[1, 2, 3, 4, 5].map(v => `<option ${(i.scores ? i.scores[n] : 3) === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>`).join("")}
            <div class="f" style="flex:1 1 200px"><label for="sc-note">${L("หมายเหตุ (ใช้เมื่อไม่รับ)", "Note (used if declined)")}</label><input type="text" id="sc-note" value="${esc(tx(i.note))}"></div>
            <button class="btn primary" type="button" id="sc-save">${L("บันทึกคะแนน", "Save score")}</button><button class="btn ghost" type="button" id="sc-cancel">${L("ยกเลิก", "Cancel")}</button></div></td></tr>` : ""}`; }).join("")}</tbody></table></div>
    ${canAdd ? `<div class="body"><form class="inline-form" id="idea-form">
      <div class="f" style="flex:2 1 240px"><label for="id-name">${L("ชื่อแนวคิดโครงการ", "Idea name")}</label><input type="text" id="id-name" required></div>
      <div class="f"><label for="id-kpi">${L("ตัวชี้วัดที่รองรับ", "KPI it serves")}</label><select id="id-kpi">${opts}</select></div>
      <div class="f" style="flex:0 1 120px"><label for="id-est">${L("ประมาณการ (ลบ.)", "Estimate (M)")}</label><input type="number" id="id-est" min="0.1" step="0.1" required></div>
      <div class="f" style="flex:0 1 90px"><label for="id-yrs">${L("จำนวนปี", "Years")}</label><select id="id-yrs"><option>1</option><option>2</option><option>3</option></select></div>
      <button class="btn primary" type="submit">+ ${L("เสนอแนวคิด", "Propose idea")}</button></form></div>` : ""}</section>`;
};
STRAT_BIND.bank = () => {
  const idea = id => S.ideas.find(i => i.id === id);
  $$("[data-score]").forEach(b => (b.onclick = () => { IDEA_OPEN = IDEA_OPEN === b.dataset.score ? null : b.dataset.score; route(); }));
  const sc = $("#sc-save");
  if (sc) sc.onclick = () => {
    const i = idea(IDEA_OPEN), note = $("#sc-note").value.trim();
    i.scores = CRIT.map((c, n) => Number($("#sc-" + n).value)); i.status = "screened"; i.note = note ? [note, note] : null;
    audit(["ให้คะแนนแนวคิดโครงการ", "Scored a project idea"], `${i.id} · ${ideaScore(i)}/100`); IDEA_OPEN = null; commit(); route();
    toast(`${L("บันทึกคะแนนแล้ว", "Score saved")} · ${ideaScore(i)} / 100`);
  };
  const cn = $("#sc-cancel"); if (cn) cn.onclick = () => { IDEA_OPEN = null; route(); };
  $$("[data-iacc]").forEach(b => (b.onclick = () => {
    const i = idea(b.dataset.iacc); i.status = "accepted";
    audit(["รับแนวคิดโครงการเข้าแผน", "Accepted a project idea"], i.id);
    notify(["div"], [`แนวคิดโครงการ ${i.id} ได้รับเข้าแผน จัดทำคำขอได้แล้ว`, `Project idea ${i.id} was accepted; you can now prepare a request`], "strat-bank");
    commit(); route(); toast(L("รับเข้าแผนแล้ว · แจ้งหน่วยงานให้จัดทำคำขอ", "Accepted · the unit has been asked to prepare a request"));
  }));
  $$("[data-irej]").forEach(b => (b.onclick = () => {
    const i = idea(b.dataset.irej);
    if (!i.note) { IDEA_OPEN = i.id; route(); toast(L("ใส่หมายเหตุเหตุผลที่ไม่รับก่อน", "Add a note explaining why first")); return; }
    i.status = "rejected";
    audit(["ไม่รับแนวคิดโครงการ", "Declined a project idea"], `${i.id} · ${tx(i.note)}`);
    notify(["div"], [`แนวคิดโครงการ ${i.id} ไม่ได้รับเข้าแผน: ${i.note[0]}`, `Project idea ${i.id} was not taken: ${i.note[1]}`], "strat-bank");
    commit(); route(); toast(L("บันทึกแล้ว · แจ้งหน่วยงานพร้อมเหตุผล", "Saved · the unit has been told why"));
  }));
  $$("[data-iconv]").forEach(b => (b.onclick = () => {
    const i = idea(b.dataset.iconv), k = findKpi(i.kpi), id = nextReqId(), first = Math.round(i.est * 1e6 / i.years);
    const r = { id, unit: i.unit, act: k && k.acts[0] || "", prev: 0, status: "draft", updated: TODAY, name: i.name.slice(), kpi: k ? [`${k.id} ${k.name[0]}`, `${k.id} ${k.name[1]}`] : "",
      reason: "", docs: [], items: [{ type: "ope", name: ["ค่าใช้จ่ายโครงการ (ประมาณการจากคลังโครงการ)", "Project cost (estimate from the project bank)"], qty: 1, unitName: ["งาน", "job"], price: first }],
      amount: first, versions: [], comments: [], idea: i.id };
    if (i.years > 1) { r.multi = true; r.years = {}; for (let y = 0; y < i.years; y++) r.years[2571 + y] = y ? 0 : first; }
    S.requests.unshift(r); snapshot(r, ["สร้างจากคลังโครงการ", "Created from the project bank"], true);
    i.status = "converted"; i.req = id;
    audit(["สร้างร่างคำขอจากคลังโครงการ", "Created a draft request from the project bank"], `${i.id} → ${id}`); commit();
    toast(`${L("สร้างร่างคำขอ", "Created draft")} ${id}`); openReq(id);
  }));
  const f = $("#idea-form");
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const nm = $("#id-name").value.trim(), id = `PB-2571-${String(S.ideas.length + 1).padStart(3, "0")}`;
    S.ideas.push({ id, unit: me().unit, kpi: $("#id-kpi").value, name: [nm, nm], est: Number($("#id-est").value), years: Number($("#id-yrs").value), status: "proposed", scores: null, note: null, by: me().id, t: nowIso(), req: null });
    audit(["เสนอแนวคิดโครงการ", "Proposed a project idea"], `${id} ${nm}`);
    notify(["plan"], [`แนวคิดโครงการใหม่ ${id} รอกลั่นกรอง`, `New project idea ${id} is waiting for screening`], "strat-bank");
    commit(); route(); toast(L("เสนอแนวคิดแล้ว · กองแผนงานจะกลั่นกรองและให้คะแนน", "Idea proposed · Planning will screen and score it"));
  };
};

const REV_ST = { pending: [["รอผู้บริหาร", "Awaiting executive"], "p-warn"], approved: [["อนุมัติ", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"] };
STRAT.revise = () => {
  const revs = S.planRevs || [], pl = ROLE === "plan", ex = ROLE === "exec";
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("ทบทวนแผนกลางรอบ", "Mid-term plan revision")}</b>
    <p>${L("การเปลี่ยนค่าเป้าหมายหลังแผนประกาศใช้ต้องได้รับความเห็นชอบจากผู้บริหาร ค่าเป้าหมายจะเปลี่ยนเมื่ออนุมัติแล้วเท่านั้น", "Changing a target after the plan is in force needs the executive's approval. Targets change only once approved.")}</p></div></div>
  <section class="panel"><header><h2>${L("คำขอทบทวนค่าเป้าหมาย", "Target revision requests")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ตัวชี้วัด", "KPI")}</th><th class="n">${L("ปี", "Year")}</th><th class="n">${L("เดิม → ใหม่", "From → to")}</th><th>${L("เหตุผล", "Reason")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${revs.map(v => { const k = findKpi(v.kpi);
        return `<tr><td class="mono">${v.id}</td><td>${k ? `<span class="mono sub">${k.id}</span> ${esc(tx(k.name))}` : v.kpi}</td><td class="n">${PLAN_YEARS[v.y]}</td>
          <td class="n">${fmt(v.from, v.from % 1 ? 1 : 0)} → <b>${fmt(v.to, v.to % 1 ? 1 : 0)}</b>${k ? ` <span class="sub">${tx(k.unit)}</span>` : ""}</td>
          <td><span class="sub">${esc(tx(v.why))}</span><div class="sub">${esc(userName(v.by))} · ${fdate(v.t)}</div></td>
          <td>${tag(tx(REV_ST[v.status][0]), REV_ST[v.status][1])}${v.decided ? `<div class="sub">${esc(userName(v.dBy))} · ${fdate(v.decided)}</div>` : ""}</td>
          <td><div class="row" style="flex-wrap:nowrap">${ex && v.status === "pending" ? `<button class="btn primary" type="button" data-rvok="${v.id}">${L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-rvno="${v.id}">${L("ไม่อนุมัติ", "Reject")}</button>` : ""}${historyBtn(v.id, v.id)}</div></td></tr>`; }).join("")
        || `<tr><td colspan="7" class="sub">${L("ยังไม่มีคำขอทบทวน", "No revision requests yet")}</td></tr>`}</tbody></table></div>
    ${pl ? `<div class="body"><form class="inline-form" id="rev-form">
      <div class="f"><label for="rv-kpi">${L("ตัวชี้วัด", "KPI")}</label><select id="rv-kpi">${allKpis().map(x => `<option value="${x.k.id}">${x.k.id} · ${esc(tx(x.k.name))}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 100px"><label for="rv-y">${L("ปี", "Year")}</label><select id="rv-y">${PLAN_YEARS.map((y, i) => `<option value="${i}">${y}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 120px"><label for="rv-to">${L("ค่าเป้าหมายใหม่", "New target")}</label><input type="number" step="any" min="0" id="rv-to" required></div>
      <div class="f" style="flex:2 1 220px"><label for="rv-why">${L("เหตุผล", "Reason")}</label><input type="text" id="rv-why" required></div>
      <button class="btn primary" type="submit">${L("เสนอผู้บริหาร", "Send to executive")}</button></form>
      <p class="sub" id="rv-cur"></p></div>` : ""}</section>`;
};
STRAT_BIND.revise = () => {
  const rv = id => S.planRevs.find(v => v.id === id);
  const decide = (v, ok) => {
    v.status = ok ? "approved" : "rejected"; v.decided = nowIso(); v.dBy = me().id;
    const k = findKpi(v.kpi);
    if (ok && k) k.targets[v.y] = v.to;
    audit(ok ? ["อนุมัติการทบทวนค่าเป้าหมาย", "Approved a target revision"] : ["ไม่อนุมัติการทบทวนค่าเป้าหมาย", "Rejected a target revision"], `${v.id} ${v.kpi} ${PLAN_YEARS[v.y]}: ${v.from} → ${v.to}`);
    notify(["plan"], ok ? [`ผู้บริหารอนุมัติ ${v.id} ค่าเป้าหมาย ${v.kpi} ปรับแล้ว`, `The executive approved ${v.id}; ${v.kpi} target updated`] : [`ผู้บริหารไม่อนุมัติ ${v.id}`, `The executive rejected ${v.id}`], "strat-revise");
    commit(); route(); toast(ok ? L("อนุมัติแล้ว · ค่าเป้าหมายในแผนปรับแล้ว", "Approved · the plan target is updated") : L("ไม่อนุมัติ · ค่าเป้าหมายคงเดิม", "Rejected · the target stays as it was"));
  };
  $$("[data-rvok]").forEach(b => (b.onclick = () => decide(rv(b.dataset.rvok), true)));
  $$("[data-rvno]").forEach(b => (b.onclick = () => decide(rv(b.dataset.rvno), false)));
  const f = $("#rev-form");
  if (!f) return;
  const cur = () => { const k = findKpi($("#rv-kpi").value), y = Number($("#rv-y").value); $("#rv-cur").textContent = `${L("ค่าเป้าหมายปัจจุบัน", "Current target")}: ${fmt(k.targets[y], k.targets[y] % 1 ? 1 : 0)} ${tx(k.unit)}`; };
  $("#rv-kpi").onchange = cur; $("#rv-y").onchange = cur; cur();
  f.onsubmit = e => {
    e.preventDefault();
    const k = findKpi($("#rv-kpi").value), y = Number($("#rv-y").value), to = Number($("#rv-to").value), why = $("#rv-why").value.trim();
    if (to === k.targets[y]) { toast(L("ค่าใหม่เท่ากับค่าเดิม", "The new value equals the current one")); return; }
    const id = `PR-2571-${String(S.planRevs.length + 1).padStart(3, "0")}`;
    S.planRevs.unshift({ id, kpi: k.id, y, from: k.targets[y], to, why: [why, why], by: me().id, t: nowIso(), status: "pending" });
    audit(["เสนอทบทวนค่าเป้าหมายตัวชี้วัด", "Proposed a KPI target revision"], `${id} ${k.id}`);
    notify(["exec"], [`คำขอทบทวนค่าเป้าหมาย ${id} (${k.id}) รอพิจารณา`, `Target revision ${id} (${k.id}) is waiting for you`], "strat-revise");
    commit(); route(); toast(L("ส่งให้ผู้บริหารพิจารณาแล้ว", "Sent to the executive"));
  };
};
{
  const base = BIND.strategy;
  BIND.strategy = () => { base(); (STRAT_BIND[STRAT_TAB] || (() => {}))(); };
}
