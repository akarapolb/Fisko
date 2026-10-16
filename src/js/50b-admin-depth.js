// M10 deeper features (round 10): notification templates with a live preview, SLA reminders and
// escalation per workflow step, and data retention with backup and restore-test status.
ADMIN_TABS.push({ id: "notify", roles: ["admin"], label: ["การแจ้งเตือนและ SLA", "Notifications & SLAs"] }, { id: "data", roles: ["admin", "audit"], label: ["เก็บรักษาและสำรองข้อมูล", "Retention & backup"] });
let TPL_OPEN = "T-01";
const TPL_SAMPLE = () => LANG === "en"
  ? { no: "REQ-2571-014", project: "Online service platform", name: "Somjai Jaidee", count: "3", due: fdate(addDays(TODAY, 5)), days: "2", task: "Planning review", escalate_to: "Executive", unit: "Infrastructure Bureau", pct: "59", date: fdate(TODAY) }
  : { "เลขที่": "REQ-2571-014", "โครงการ": "แพลตฟอร์มบริการออนไลน์", "ชื่อ": "สมใจ ใจดี", "จำนวน": "3", "กำหนด": fdate(addDays(TODAY, 5)), "วัน": "2", "งาน": "กองแผนงานกลั่นกรอง", "ผู้รับยกระดับ": "ผู้บริหาร", "หน่วยงาน": "สำนักโครงสร้างพื้นฐาน", "ร้อยละ": "59", "วันที่": fdate(TODAY) };
const fillTpl = (s, v) => String(s).replace(/\{([^}]+)\}/g, (m, k) => (v[k] != null ? `<mark>${esc(v[k])}</mark>` : esc(m)));
// Requests waiting at a workflow step, with their due date from the step's SLA.
function slaItems() {
  const step = st => S.workflow.find(w => (st === "plan" ? w.id === "w2" : w.id === "w3"));
  return S.requests.filter(r => r.status === "plan" || r.status === "committee").map(r => { const w = step(r.status), due = addDays(r.updated, w.sla || 0); return { r, w, due, left: daysUntil(due) }; });
}

ADMIN.notify = () => {
  const t = S.tpl.find(x => x.id === TPL_OPEN) || S.tpl[0], v = TPL_SAMPLE(), items = slaItems();
  return `
  <div class="grid2">
    <section class="panel"><header><h2>${L("แม่แบบข้อความแจ้งเตือน", "Notification templates")}</h2></header>
      <div class="body" style="display:flex;flex-direction:column;gap:12px">
        <div class="f"><label for="tpl-sel">${L("เหตุการณ์", "Event")}</label><select id="tpl-sel">${S.tpl.map(x => `<option value="${x.id}" ${x.id === t.id ? "selected" : ""}>${x.id} · ${esc(tx(x.ev))}</option>`).join("")}</select></div>
        <div class="row">${[["app", L("ในระบบ", "In-app")], ["mail", L("อีเมล", "Email")], ["line", "LINE"]].map(([k, l]) => `<label class="field-inline"><input type="checkbox" data-tch="${k}" ${t.ch[k] ? "checked" : ""}> ${l}</label>`).join("")}</div>
        <div class="f"><label for="tpl-subj">${L("หัวเรื่อง", "Subject")} (${LANG.toUpperCase()})</label><input type="text" id="tpl-subj" value="${esc(tx(t.subj))}"></div>
        <div class="f"><label for="tpl-body">${L("ข้อความ", "Message")} (${LANG.toUpperCase()})</label><textarea id="tpl-body" rows="5">${esc(tx(t.body))}</textarea>
          <span class="hint">${L("ตัวแปรที่ใช้ได้", "Placeholders")}: ${Object.keys(v).map(k => `<span class="mono">{${k}}</span>`).join(" ")}</span></div>
        <div class="row"><button class="btn primary" type="button" id="tpl-save">${L("บันทึกแม่แบบ", "Save template")}</button></div></div></section>
    <section class="panel"><header><h2>${L("ตัวอย่างข้อความ", "Preview")}</h2><span class="sp"></span><span class="sub">${L("แทนค่าด้วยข้อมูลตัวอย่าง", "Filled with sample values")}</span></header>
      <div class="body"><div class="tpl-prev" id="tpl-prev"><b>${fillTpl(tx(t.subj), v)}</b><p>${fillTpl(tx(t.body), v).replace(/\n/g, "<br>")}</p></div></div></section>
  </div>
  <section class="panel"><header><h2>${L("SLA การแจ้งเตือนล่วงหน้า และการยกระดับ", "SLA reminders and escalation")}</h2><span class="sp"></span>
      <button class="btn" type="button" id="sla-run">${L("ตรวจและส่งแจ้งเตือนตอนนี้", "Check and notify now")}</button></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ขั้นตอน (M10 · Workflow)", "Step (M10 · Workflow)")}</th><th class="n">${L("SLA (วัน)", "SLA (days)")}</th><th class="n">${L("เตือนก่อน (วัน)", "Remind before (days)")}</th><th>${L("ยกระดับถึง", "Escalate to")}</th><th class="n">${L("หลังเกินกำหนด (วัน)", "After overdue (days)")}</th><th class="n">${L("ใกล้ครบ / เกินกำหนด", "Due soon / overdue")}</th></tr></thead>
      <tbody>${S.workflow.filter(w => w.sla).map(w => { const e = S.escal[w.id] || { remind: 1, to: "exec", after: 1 }, its = items.filter(x => x.w.id === w.id);
        return `<tr><td>${tx(w.name)}<div class="sub">${tx(ROLES[w.role])}</div></td><td class="n"><input type="number" min="1" max="60" data-wsla="${w.id}" value="${w.sla}" style="width:70px" aria-label="SLA"></td>
          <td class="n"><input type="number" min="0" max="30" data-esc="${w.id}|remind" value="${e.remind}" style="width:70px" aria-label="${L("เตือนก่อน", "Remind before")}"></td>
          <td><select data-esc="${w.id}|to" aria-label="${L("ยกระดับถึง", "Escalate to")}">${Object.keys(ROLES).filter(r => r !== "admin").map(r => `<option value="${r}" ${r === e.to ? "selected" : ""}>${tx(ROLES[r])}</option>`).join("")}</select></td>
          <td class="n"><input type="number" min="0" max="30" data-esc="${w.id}|after" value="${e.after}" style="width:70px" aria-label="${L("หลังเกินกำหนด", "After overdue")}"></td>
          <td class="n">${its.filter(x => x.left >= 0 && x.left <= e.remind).length} / <span style="color:var(--${its.some(x => x.left < 0) ? "bad" : "ink-2"})">${its.filter(x => x.left < 0).length}</span></td></tr>`; }).join("")}</tbody></table></div>
    <div class="body sub">${L("ส่งข้อความตามแม่แบบ T-02 (ใกล้ครบกำหนด) และ T-03 (เกินกำหนด) · ระบบจริงตรวจทุกเช้า 07:00 น.", "Uses templates T-02 (due soon) and T-03 (overdue) · the live system checks every morning at 07:00")}</div></section>`;
};
BIND_ADMIN.notify = () => {
  const t = () => S.tpl.find(x => x.id === TPL_OPEN) || S.tpl[0];
  $("#tpl-sel").onchange = e => { TPL_OPEN = e.target.value; route(); };
  const prev = () => { const v = TPL_SAMPLE(); $("#tpl-prev").innerHTML = `<b>${fillTpl($("#tpl-subj").value, v)}</b><p>${fillTpl($("#tpl-body").value, v).replace(/\n/g, "<br>")}</p>`; };
  $("#tpl-subj").oninput = prev; $("#tpl-body").oninput = prev;
  $("#tpl-save").onclick = () => {
    const x = t(), i = LANG === "en" ? 1 : 0;
    x.subj[i] = $("#tpl-subj").value; x.body[i] = $("#tpl-body").value;
    $$("[data-tch]").forEach(c => (x.ch[c.dataset.tch] = c.checked));
    audit(["แก้ไขแม่แบบการแจ้งเตือน", "Changed a notification template"], `${x.id} ${tx(x.ev)}`); commit(); toast(L("บันทึกแม่แบบแล้ว", "Template saved"));
  };
  $$("[data-wsla]").forEach(inp => (inp.onchange = () => { const w = S.workflow.find(x => x.id === inp.dataset.wsla), old = w.sla; w.sla = Number(inp.value); audit(["แก้ไข SLA ขั้นตอน", "Changed a step SLA"], `${tx(w.name)}: ${old} → ${w.sla}`); commit(); route(); }));
  $$("[data-esc]").forEach(inp => (inp.onchange = () => {
    const [id, k] = inp.dataset.esc.split("|"); S.escal[id] = S.escal[id] || { remind: 1, to: "exec", after: 1 };
    S.escal[id][k] = k === "to" ? inp.value : Number(inp.value);
    audit(["แก้ไขกติกาการยกระดับ", "Changed an escalation rule"], `${id} ${k}: ${inp.value}`); commit(); route();
  }));
  $("#sla-run").onclick = () => {
    let soon = 0, over = 0;
    slaItems().forEach(x => {
      const e = S.escal[x.w.id] || { remind: 1, to: "exec", after: 1 };
      if (x.left < 0 && -x.left >= e.after) { over++; notify([e.to, x.w.role], [`เกินกำหนด ${-x.left} วัน: ${x.w.name[0]} คำขอ ${x.r.id}`, `${-x.left} days overdue: ${x.w.name[1]} for ${x.r.id}`], `req:${x.r.id}`); }
      else if (x.left >= 0 && x.left <= e.remind) { soon++; notify([x.w.role], [`เหลือ ${x.left} วัน: ${x.w.name[0]} คำขอ ${x.r.id}`, `${x.left} days left: ${x.w.name[1]} for ${x.r.id}`], `req:${x.r.id}`); }
    });
    audit(["สั่งตรวจ SLA และส่งแจ้งเตือน", "Ran the SLA check"], `${soon} / ${over}`); commit(); renderShell(); route();
    toast(`${L("ส่งเตือนใกล้ครบกำหนด", "Due-soon reminders")} ${soon} · ${L("ยกระดับเกินกำหนด", "overdue escalations")} ${over}`);
  };
};

ADMIN.data = () => {
  const B = S.backup, ad = isAdmin(), ago = d => -daysUntil(d.slice(0, 10)), rt = ago(B.restore);
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("สำรองเต็มล่าสุด", "Last full backup")}</span><span class="v" style="font-size:18px">${fdate(B.full, true)}</span></div>
    <div class="kpi"><span class="l">${L("สำรองส่วนเพิ่มล่าสุด", "Last incremental")}</span><span class="v" style="font-size:18px">${fdate(B.incr, true)}</span></div>
    <div class="kpi"><span class="l">${L("ทดสอบกู้คืนล่าสุด", "Last restore test")}</span><span class="v" style="font-size:18px;color:var(--${rt > 90 ? "bad" : "ink"})">${fdate(B.restore)}</span><span class="d sub">${rt} ${L("วันที่แล้ว · ควรทดสอบทุก 90 วัน", "days ago · test every 90 days")}</span></div>
    <div class="kpi"><span class="l">RPO / RTO</span><span class="v" style="font-size:18px">${B.rpo} ${L("ชม.", "h")} / ${B.rto} ${L("ชม.", "h")}</span></div>
  </section>
  ${ad ? `<div class="row"><button class="btn" type="button" id="bk-now">${L("สำรองข้อมูลตอนนี้", "Back up now")}</button><button class="btn" type="button" id="bk-test">${L("จำลอง: ทดสอบกู้คืนบนเครื่องทดสอบ", "Demo: test a restore on the test server")}</button></div>` : ""}
  ${B.log.length ? `<section class="panel"><header><h2>${L("ประวัติการสำรองและกู้คืน", "Backup and restore log")}</h2></header><div class="body"><ul class="log">${B.log.map(l => `<li><b style="font-weight:600">${esc(tx(l.what))}</b><small>${fdate(l.t, true)} · ${esc(userName(l.by))}</small></li>`).join("")}</ul></div></section>` : ""}
  <section class="panel"><header><h2>${L("ระยะเวลาเก็บรักษาข้อมูล", "Data retention")}</h2><span class="sp"></span>${tag(ad ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), ad ? "p-ok" : "p-mute")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ประเภทข้อมูล", "Data class")}</th><th class="n">${L("เก็บ (ปี)", "Keep (years)")}</th><th>${L("เหตุผล / อ้างอิง", "Basis")}</th><th class="n">${L("ขนาด (GB)", "Size (GB)")}</th></tr></thead>
      <tbody>${S.retention.map(r => `<tr><td>${tx(r.cls)}</td><td class="n"><input type="number" min="1" max="30" data-ret="${r.id}" value="${r.years}" ${ad ? "" : "disabled"} style="width:70px" aria-label="${esc(tx(r.cls))}"></td><td class="sub">${tx(r.basis)}</td><td class="n">${fmt(r.size, 1)}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("ข้อมูลที่ครบกำหนดจะแจ้งเจ้าของข้อมูลก่อนลบ 30 วัน · บันทึกการใช้งานแก้ไขไม่ได้ตลอดอายุการเก็บ", "Owners are told 30 days before data is deleted · the audit log can't be changed while it is kept")}</div></section>`;
};
BIND_ADMIN.data = () => {
  const B = S.backup, log = what => { B.log.unshift({ t: nowIso(), by: me().id, what }); };
  $$("[data-ret]").forEach(inp => (inp.onchange = () => { const r = S.retention.find(x => x.id === inp.dataset.ret), old = r.years; r.years = Number(inp.value); audit(["แก้ไขระยะเวลาเก็บรักษาข้อมูล", "Changed a retention period"], `${tx(r.cls)}: ${old} → ${r.years}`); commit(); toast(L("บันทึกแล้ว", "Saved")); }));
  const bn = $("#bk-now"); if (bn) bn.onclick = () => { B.incr = nowIso(); log(["สำรองข้อมูลส่วนเพิ่มสำเร็จ 1.8 GB", "Incremental backup succeeded, 1.8 GB"]); audit(["สั่งสำรองข้อมูล", "Ran a backup"], "M10"); commit(); route(); toast(L("สำรองข้อมูลแล้ว (จำลอง)", "Backed up (simulated)")); };
  const bt = $("#bk-test"); if (bt) bt.onclick = () => { B.restore = nowIso(); log(["ทดสอบกู้คืนสำเร็จ ใช้เวลา 2 ชม. 10 นาที ภายใน RTO", "Restore test succeeded in 2 h 10 min, within the RTO"]); audit(["ทดสอบกู้คืนข้อมูล", "Tested a restore"], "M10"); commit(); route(); toast(L("ทดสอบกู้คืนสำเร็จ (จำลอง)", "Restore test passed (simulated)")); };
};
