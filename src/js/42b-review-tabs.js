// M04 tabs (round 3): review queue, committee meetings with resolutions, side-by-side versions.
let REV_TAB = "queue", CMP_REQ = null;
const REV_PANELS = {}, REV_BIND = {};
const RES = {
  approve: [["เห็นชอบตามเสนอ", "Approved as proposed"], "p-ok"], reduce: [["เห็นชอบโดยปรับลดวงเงิน", "Approved, amount reduced"], "p-info"],
  defer: [["ให้ทบทวนและเสนอใหม่", "Revise and resubmit"], "p-warn"], reject: [["ไม่เห็นชอบ", "Not approved"], "p-bad"],
};
function revTabsBar() {
  const q = S.requests.filter(r => r.status === "plan" || r.status === "committee").length;
  const t = [["queue", `${L("คำขอรอพิจารณา", "Review queue")} (${q})`], ["rounds", L("วงเงินแต่ละรอบ", "Amounts by round")], ["meetings", L("การประชุมคณะกรรมการ", "Committee meetings")], ["compare", L("เปรียบเทียบเวอร์ชัน", "Compare versions")],
    ["hearings", `${L("การชี้แจงงบประมาณ", "Budget hearings")}${(() => { const n = (S.hearings || []).flatMap(h => h.qs).filter(q => q.ans && q.ok == null).length; return n ? ` (${n})` : ""; })()}`], ["impact", L("ผลกระทบต่อตัวชี้วัด", "Cut impact")]];
  return `<div class="tabs" role="tablist">${t.map(([id, l]) => `<button class="tab ${id === REV_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === REV_TAB}" data-vtab="${id}">${l}</button>`).join("")}</div>`;
}
// Calendar arithmetic in UTC so a viewer's time zone never shifts the date.
function addDays(iso, n) { const [y, m, dd] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); }

// ---- queue ----
REV_PANELS.queue = () => {
  const rows = S.requests.filter(r => ["plan", "committee", "returned"].includes(r.status));
  const step = st => S.workflow.find(w => (st === "plan" ? w.role === "plan" : st === "committee" ? w.cond === "amount" : w.role === "div")) || { sla: 0 };
  return `
  <section class="panel"><header><h2>${L("คำขอที่อยู่ระหว่างพิจารณา", "Requests in review")}</h2><span class="sp"></span><span class="sub">${L("กำหนดเวลาจาก SLA ใน M10 · ขั้นตอนงาน", "Due dates use the SLA in M10 · Workflow")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("โครงการ", "Project")}</th><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th>${L("สถานะ", "Status")}</th><th class="n">${L("ความเห็นค้าง", "Open comments")}</th><th>${L("ครบกำหนด", "Due")}</th><th></th></tr></thead>
      <tbody>${rows.map(r => { const s = step(r.status), due = addDays(r.updated, s.sla || 0), late = daysUntil(due) < 0, mine = canReview(r);
        return `<tr><td class="mono">${r.id}</td><td>${esc(tx(r.name))}</td><td class="sub">${unitName(r.unit)}</td><td class="n">${mb(r.amount)}</td><td>${pill(r.status)}</td>
          <td class="n">${openComments(r).length || "—"}</td><td>${s.sla ? `<span class="due" style="color:var(--${late ? "bad" : "ink-2"})">${fdate(due)}${late ? " · " + L("เลยกำหนด", "overdue") : ""}</span>` : "—"}</td>
          <td><button class="btn ${mine ? "primary" : ""}" type="button" data-open="${r.id}">${mine ? L("พิจารณา", "Review") : L("เปิด", "Open")}</button></td></tr>`; }).join("") || `<tr><td colspan="8" class="sub">${L("ไม่มีคำขอรอพิจารณา", "Nothing waiting for review")}</td></tr>`}</tbody></table></div>
    <div class="body sub">${ROLE === "plan" ? L("กองแผนงานพิจารณาคำขอสถานะ “รอกองแผนพิจารณา” · ใส่ความเห็นรายบรรทัด แล้วส่งกลับหรือเสนอต่อ", "Planning reviews requests marked Planning review · comment on lines, then return or send on")
      : ROLE === "exec" ? L("ผู้บริหารพิจารณาคำขอสถานะ “รอคณะกรรมการ” หรือบันทึกมติในแท็บการประชุม", "Executives decide requests marked Committee, or record resolutions in the Meetings tab") : L("ดูอย่างเดียว", "View only")}</div></section>`;
};
REV_BIND.queue = () => $$("[data-open]").forEach(b => (b.onclick = () => openReq(b.dataset.open)));

// ---- meetings ----
const agendaName = id => { const x = S.review.find(v => v.id === id) || S.requests.find(v => v.id === id); return x ? tx(x.name) : id; };
REV_PANELS.meetings = () => {
  const canRec = ROLE === "plan" || acting("exec", "committee");
  return S.meetings.slice().reverse().map(m => {
    if (m.status === "cancelled") return "";
    if (m.status === "held") return `
    <section class="panel"><header><h2>${L("การประชุมคณะกรรมการพิจารณางบประมาณ", "Budget committee")} ${tx(m.no)}</h2><span class="sp"></span>${historyBtn(m.id + "|" + m.no[0] + "|" + m.no[1], tx(m.no))}${tag(L("ประชุมแล้ว", "Held"), "p-ok")}</header>
      <div class="body row"><span>${fdate(m.date)}</span><span class="sub">·</span><span>${L("ผู้เข้าประชุม", "Attendees")} ${m.attendees} ${L("คน", "")}</span><span class="sub">·</span>${m.docs.map(d => tag(esc(d), "p-mute")).join("")}</div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("วาระ", "Item")}</th><th>${L("มติ", "Resolution")}</th><th class="n">${L("วงเงินที่มีมติ (ลบ.)", "Resolved amount (M)")}</th><th>${L("หมายเหตุ", "Note")}</th></tr></thead>
        <tbody>${Object.keys(m.items).map(k => { const it = m.items[k]; return `<tr><td><span class="mono sub">${k}</span> ${esc(agendaName(k))}</td><td>${tag(tx(RES[it.res][0]), RES[it.res][1])}</td><td class="n">${it.amount != null ? fmt(it.amount, 1) : "—"}</td><td class="sub">${esc(tx(it.note))}</td></tr>`; }).join("")}</tbody></table></div></section>`;
    const agenda = S.requests.filter(r => r.status === "committee");
    return `
    <section class="panel"><header><h2>${L("การประชุมคณะกรรมการพิจารณางบประมาณ", "Budget committee")} ${tx(m.no)}</h2><span class="sp"></span>${historyBtn(m.id + "|" + m.no[0] + "|" + m.no[1], tx(m.no))}${tag(`${L("กำหนดประชุม", "Scheduled")} ${fdate(m.date)}`, "p-info")}</header>
      ${agenda.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("วาระ", "Item")}</th><th class="n">${L("วงเงินขอ (ลบ.)", "Requested (M)")}</th><th style="width:220px">${L("มติ", "Resolution")}</th><th class="n" style="width:130px">${L("วงเงินที่มีมติ", "Resolved (M)")}</th><th>${L("หมายเหตุ", "Note")}</th></tr></thead>
        <tbody>${agenda.map(r => `<tr><td><a href="#" data-req="${r.id}" class="mono">${r.id}</a> ${esc(tx(r.name))}</td><td class="n">${mb(r.amount)}</td>
          <td><select data-res="${r.id}" ${canRec ? "" : "disabled"} aria-label="${L("มติ", "Resolution")} ${r.id}">${Object.keys(RES).map(k => `<option value="${k}">${tx(RES[k][0])}</option>`).join("")}</select></td>
          <td class="n"><input type="number" min="0" step="0.1" data-ramt="${r.id}" value="${(r.amount / 1e6).toFixed(2)}" ${canRec ? "" : "disabled"} aria-label="${L("วงเงินที่มีมติ", "Resolved amount")} ${r.id}"></td>
          <td><input type="text" data-rnote="${r.id}" ${canRec ? "" : "disabled"} placeholder="${L("เหตุผลหรือเงื่อนไข", "Reason or condition")}" aria-label="${L("หมายเหตุ", "Note")} ${r.id}"></td></tr>`).join("")}</tbody></table></div>
        <div class="body inline-form"><div class="f" style="flex:0 1 160px"><label for="m-att">${L("ผู้เข้าประชุม (คน)", "Attendees")}</label><input type="number" min="1" id="m-att" value="9" ${canRec ? "" : "disabled"}></div>
          ${canRec ? `<button class="btn primary" type="button" id="m-save" data-m="${m.id}">${L("บันทึกมติและปิดการประชุม", "Record resolutions and close the meeting")}</button>` : `<span class="sub">${L("บันทึกมติได้เฉพาะกองแผนงาน (เลขานุการ) และผู้บริหาร", "Only Planning (secretary) and executives can record resolutions")}</span>`}</div>`
        : `<div class="body sub">${L("ยังไม่มีคำขอเข้าวาระ คำขอเข้าวาระเมื่อกองแผนงานกด “ผ่านการกลั่นกรอง · เสนอต่อ” ในแบบฟอร์มคำขอ", "No requests on the agenda yet. A request joins the agenda when Planning clicks “Pass review · send on” in the request form.")}</div>`}
    </section>`;
  }).join("");
};
REV_BIND.meetings = () => {
  $$("[data-req]").forEach(a => (a.onclick = e => { e.preventDefault(); openReq(a.dataset.req); }));
  $$("[data-res]").forEach(s => (s.onchange = () => { const amt = $(`[data-ramt="${s.dataset.res}"]`), r = S.requests.find(x => x.id === s.dataset.res); if (s.value === "approve") amt.value = (r.amount / 1e6).toFixed(2); if (s.value === "reject" || s.value === "defer") amt.value = 0; }));
  const b = $("#m-save");
  if (b) b.onclick = () => {
    const m = S.meetings.find(x => x.id === b.dataset.m), agenda = S.requests.filter(r => r.status === "committee");
    m.items = {};
    agenda.forEach(r => {
      const res = $(`[data-res="${r.id}"]`).value, amt = Number($(`[data-ramt="${r.id}"]`).value), note = $(`[data-rnote="${r.id}"]`).value.trim() || tx(RES[res][0]);
      m.items[r.id] = { res, amount: res === "approve" || res === "reduce" ? amt : null, note: [note, note] };
      if (res === "approve" || res === "reduce") { r.status = "approved"; r.decided = amt * 1e6; r.decision = [note, note]; }
      if (res === "defer") { r.status = "returned"; addComment(r, null, `${L("มติคณะกรรมการ", "Committee resolution")}: ${note}`); }
      if (res === "reject") r.status = "rejected";
      r.updated = TODAY;
    });
    m.status = "held"; m.attendees = Number($("#m-att").value) || m.attendees; m.date = m.date > TODAY ? TODAY : m.date;
    m.docs = [L(`รายงานการประชุม${tx(m.no)}.pdf`, `Minutes ${tx(m.no)}.pdf`)];
    // Round C2: the next meeting is set up by Planning in the meetings list (no automatic meeting with a fixed year).
    audit(["บันทึกมติคณะกรรมการพิจารณางบประมาณ", "Recorded budget committee resolutions"], `${m.id} ${tx(m.no)}${onBehalf("exec", "committee")} ·${agenda.length} ${L("วาระ", "items")}`);
    notify(["plan", "div"], [`บันทึกมติการประชุม ${m.no[0]} แล้ว`, `Resolutions for ${m.no[1]} are recorded`], "review");
    commit(); renderShell(); route(); toast(L("บันทึกมติแล้ว · ปรับสถานะคำขอตามมติ", "Resolutions recorded · request statuses updated"));
  };
};

// ---- compare versions side by side ----
REV_PANELS.compare = () => {
  const cands = S.requests.filter(r => r.versions && r.versions.length > 1);
  if (!cands.length) return `<section class="panel"><div class="body sub">${L("ยังไม่มีคำขอที่มีมากกว่า 1 เวอร์ชัน", "No request has more than one version yet")}</div></section>`;
  if (!cands.find(r => r.id === CMP_REQ)) CMP_REQ = (cands.find(r => r.id === S.story) || cands[0]).id;
  const r = S.requests.find(x => x.id === CMP_REQ), V = r.versions;
  const keys = []; V.forEach(v => v.items.forEach(i => { const k = lineKey(i); if (!keys.includes(k)) keys.push(k); }));
  const find = (v, k) => v.items.find(i => lineKey(i) === k);
  return `
  <section class="panel"><header><h2>${L("เปรียบเทียบทุกเวอร์ชันแบบเคียงข้าง", "All versions side by side")}</h2><span class="sp"></span>
    <label class="field-inline" for="cmp-req">${L("คำขอ", "Request")} <select id="cmp-req">${cands.map(c => `<option value="${c.id}" ${c.id === CMP_REQ ? "selected" : ""}>${c.id} · ${esc(tx(c.name))}</option>`).join("")}</select></label></header>
    <div class="tbl-wrap"><table class="vdiff side"><thead><tr><th>${L("รายการ", "Line")}</th>${V.map(v => `<th class="n">v${v.v}<div class="sub" style="font-weight:400">${fdate(v.t)}</div></th>`).join("")}</tr></thead>
      <tbody>${keys.map(k => `<tr><td>${esc(tx((V.map(v => find(v, k)).find(Boolean) || {}).name))}</td>${V.map((v, i) => {
        const it = find(v, k), prev = i ? find(V[i - 1], k) : it;
        const cls = !it ? (prev ? "del" : "") : !prev ? "add" : (prev.qty !== it.qty || prev.price !== it.price) ? "chg" : "";
        return `<td class="n ${i ? cls : ""}">${it ? `${fmt(itemTotal(it))}<div class="sub">${fmt(it.qty)} × ${fmt(it.price)}</div>` : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวม (บาท)", "Total (baht)")}</td>${V.map((v, i) => `<td class="n">${fmt(v.amount)}${i ? `<div class="sub" style="color:var(--${v.amount > V[i - 1].amount ? "warn" : "accent"})">${v.amount >= V[i - 1].amount ? "+" : ""}${fmt(v.amount - V[i - 1].amount)}</div>` : ""}</td>`).join("")}</tr></tfoot></table></div>
    <div class="body row"><span class="legend"><span><i style="background:var(--accent-soft);height:10px"></i>${L("เพิ่ม", "Added")}</span><span><i style="background:var(--warn-soft);height:10px"></i>${L("เปลี่ยน", "Changed")}</span><span><i style="background:var(--bad-soft);height:10px"></i>${L("ลบ", "Removed")}</span></span>
      <span class="sub">${L("เทียบแต่ละเวอร์ชันกับเวอร์ชันก่อนหน้า", "Each version is compared with the one before it")}</span></div></section>`;
};
REV_BIND.compare = () => { const s = $("#cmp-req"); if (s) s.onchange = () => { CMP_REQ = s.value; route(); }; };
