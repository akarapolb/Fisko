// M10 System Administration. Admin edits everything; auditors read the audit log; finance watches integrations.
let ADMIN_TAB = "master";
let STRUCT_FY = FORM_FY;
const ADMIN_TABS = [
  { id: "master", roles: ["admin"], label: ["ข้อมูลหลัก", "Master data"] },
  { id: "fiscal", roles: ["admin"], label: ["ปีงบประมาณและปฏิทิน", "Fiscal years & calendar"] },
  { id: "structure", roles: ["admin"], label: ["โครงสร้างงบประมาณ", "Budget structure"] },
  { id: "users", roles: ["admin"], label: ["ผู้ใช้และสิทธิ์", "Users & roles"] },
  { id: "workflow", roles: ["admin"], label: ["Workflow", "Workflow"] },
  { id: "rules", roles: ["admin"], label: ["กฎทางธุรกิจ", "Business rules"] },
  { id: "audit", roles: ["admin", "audit"], label: ["บันทึกการใช้งาน", "Audit log"] },
  { id: "integrations", roles: ["admin", "fin"], label: ["การเชื่อมต่อระบบ", "Integrations"] },
];
const MAP_TYPE = { same: [["คงเดิม", "Unchanged"], "p-mute"], renamed: [["เปลี่ยนชื่อ", "Renamed"], "p-info"], merged: [["รวม", "Merged"], "p-warn"], split: [["แยก", "Split"], "p-warn"], moved: [["ย้ายแผนงาน", "Moved"], "p-info"] };
const MATRIX = { // role -> M01..M10 rights
  exec: ["R", "R", "R", "A", "R", "A", "R", "R", "U", "–"], plan: ["CU", "R", "CU", "U", "CU", "R", "R", "CU", "U", "–"],
  div: ["R", "CU", "–", "R", "–", "R", "U", "U", "U", "–"], fin: ["–", "R", "–", "–", "–", "CU", "CU", "–", "U", "R"],
  audit: ["R", "R", "R", "R", "R", "R", "R", "R", "U", "R"], proc: ["–", "–", "–", "–", "–", "–", "R", "–", "–", "R"], prochead: ["–", "–", "–", "–", "–", "–", "R", "–", "–", "R"], admin: ["–", "–", "–", "–", "–", "–", "–", "–", "–", "CU"],
};
const isAdmin = () => ROLE === "admin";
const sw = (id, on, dis) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""} ${dis ? "disabled" : ""}><span></span></label>`;

const ADMIN = {};
ADMIN.master = () => `
  <div class="grid2">
    <section class="panel"><header><h2>${L("หน่วยงาน", "Organization units")}</h2><span class="sp"></span><span class="sub">${S.units.length} ${L("หน่วย", "units")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("ชื่อหน่วยงาน", "Name")}</th><th>${L("สังกัด", "Parent")}</th><th class="n">${L("ผู้ใช้", "Users")}</th></tr></thead>
        <tbody>${S.units.map(u => `<tr><td class="mono">${u.code}</td><td>${esc(tx(u.name))}</td><td class="sub">${u.parent ? unitName(u.parent) : "—"}</td><td class="n">${S.users.filter(x => x.unit === u.id).length}</td></tr>`).join("")}</tbody></table></div>
      <div class="body"><form class="inline-form" id="unit-form">
        <div class="f"><label for="u-code">${L("รหัส", "Code")}</label><input type="text" id="u-code" required maxlength="4"></div>
        <div class="f"><label for="u-th">${L("ชื่อภาษาไทย", "Thai name")}</label><input type="text" id="u-th" required></div>
        <div class="f"><label for="u-en">${L("ชื่อภาษาอังกฤษ", "English name")}</label><input type="text" id="u-en"></div>
        <button class="btn primary" type="submit">+ ${L("เพิ่มหน่วยงาน", "Add unit")}</button></form></div></section>
    <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
      <section class="panel"><header><h2>${L("งบรายจ่าย", "Budget types")}</h2></header>
        <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("งบรายจ่าย", "Type")}</th></tr></thead>
          <tbody>${BUDGET_TYPES.map(t => `<tr><td class="mono">${t.code}</td><td>${tx(t.name)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><header><h2>${L("ราคามาตรฐาน", "Standard prices")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง", "Sample"), "p-warn")}</header>
        <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("รายการ", "Item")}</th><th>${L("หน่วย", "Unit")}</th><th class="n" style="width:140px">${L("ราคา (บาท)", "Price (baht)")}</th></tr></thead>
          <tbody>${S.prices.map((p, i) => `<tr><td class="mono">${p.id}</td><td>${esc(tx(p.name))}</td><td class="sub">${tx(p.unit)}</td><td class="n"><input type="number" min="0" step="100" data-price="${i}" value="${p.price}" aria-label="${esc(tx(p.name))}"></td></tr>`).join("")}</tbody></table></div>
        <div class="body sub">${L("ใช้ตรวจกฎ BR-05 ในแบบฟอร์มคำขอ", "Used by rule BR-05 in the request form")}</div></section>
    </div>
  </div>`;
const BIND_ADMIN = {};
BIND_ADMIN.master = () => {
  $("#unit-form").onsubmit = e => {
    e.preventDefault();
    const code = $("#u-code").value.trim(), th = $("#u-th").value.trim(), en = $("#u-en").value.trim() || th;
    if (S.units.some(u => u.code === code)) { toast(L("รหัสนี้มีอยู่แล้ว ใช้รหัสอื่น", "That code is already used. Choose another.")); return; }
    S.units.push({ id: "X" + code, code, parent: S.units[0].id, name: [th, en] });
    audit(["เพิ่มหน่วยงาน", "Added a unit"], `${code} ${th}`); commit(); route(); toast(L("เพิ่มหน่วยงานแล้ว", "Unit added"));
  };
  $$("[data-price]").forEach(inp => (inp.onchange = () => {
    const p = S.prices[inp.dataset.price], old = p.price; p.price = Number(inp.value);
    audit(["แก้ไขราคามาตรฐาน", "Changed a standard price"], `${p.id}: ${fmt(old)} → ${fmt(p.price)}`); commit(); toast(L("บันทึกราคามาตรฐานแล้ว", "Standard price saved"));
  }));
};

ADMIN.fiscal = () => `
  <div class="grid2">
    <section class="panel"><header><h2>${L("ปีงบประมาณ", "Fiscal years")}</h2></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ปี", "Year")}</th><th>${L("ช่วงเวลา", "Period")}</th><th>${L("สถานะ", "Status")}</th><th style="width:200px">${L("เปลี่ยนสถานะ", "Change status")}</th></tr></thead>
        <tbody>${S.fyList.map((f, i) => `<tr><td><b>${f.fy}</b></td><td class="sub">${fdate(f.start)} – ${fdate(f.end)}</td><td>${tag(tx(FY_STATUS[f.status][0]), FY_STATUS[f.status][1])}</td>
          <td><select data-fy="${i}" aria-label="${L("สถานะปี", "Status for")} ${f.fy}">${Object.keys(FY_STATUS).map(k => `<option value="${k}" ${k === f.status ? "selected" : ""}>${tx(FY_STATUS[k][0])}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("ปีงบประมาณเริ่ม 1 ตุลาคม สิ้นสุด 30 กันยายน", "Fiscal years run from 1 October to 30 September")}</div></section>
    <section class="panel"><header><h2>${L(`ปฏิทินงบประมาณ ปี ${FORM_FY}`, `FY${FORM_FY} budget calendar`)}</h2><span class="sp"></span>${tag(L("ตัวอย่าง", "Sample"), "p-warn")}</header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("กิจกรรม", "Milestone")}</th><th>${L("ผู้รับผิดชอบ", "Owner")}</th><th style="width:170px">${L("วันที่", "Date")}</th></tr></thead>
        <tbody>${S.calendar.map((c, i) => `<tr><td>${tx(c.name)}</td><td class="sub">${tx(ROLES[c.role])}</td><td><input type="date" data-cal="${i}" value="${c.date}" aria-label="${esc(tx(c.name))}"></td></tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("กำหนดส่งใช้ในหน้าแรก งานของฉัน และกฎ BR-06", "Dates drive My Workspace deadlines and rule BR-06")}</div></section>
  </div>`;
BIND_ADMIN.fiscal = () => {
  $$("[data-fy]").forEach(s => (s.onchange = () => { const f = S.fyList[s.dataset.fy]; f.status = s.value; audit(["เปลี่ยนสถานะปีงบประมาณ", "Changed fiscal year status"], `${f.fy} → ${tx(FY_STATUS[f.status][0])}`); commit(); route(); }));
  $$("[data-cal]").forEach(inp => (inp.onchange = () => { const c = S.calendar[inp.dataset.cal]; c.date = inp.value; audit(["แก้ไขปฏิทินงบประมาณ", "Changed the budget calendar"], `${tx(c.name)} → ${fdate(c.date)}`); commit(); toast(L("บันทึกปฏิทินแล้ว", "Calendar saved")); }));
};

ADMIN.structure = () => {
  const st = S.structure[STRUCT_FY] || [];
  const order = [], walk = p => st.filter(n => n.parent === p).forEach(n => { order.push(n); walk(n.id); });
  walk(null);
  st.filter(n => !order.includes(n)).forEach(n => order.push(n));
  const depth = n => { let d = 0, p = st.find(x => x.id === n.parent); while (p) { d++; p = st.find(x => x.id === p.parent); } return d; };
  const outputs = (S.structure[FORM_FY] || []).filter(n => n.lvl === "output");
  const name = (fy, id) => { const n = (S.structure[fy] || []).find(x => x.id === id); return n ? `${n.code} · ${tx(n.name)}` : id; };
  return `
  <div class="grid2">
    <section class="panel"><header><h2>${L("โครงสร้างงบประมาณ", "Budget structure")}</h2><span class="sp"></span>
      <label class="field-inline" for="sfy">${L("ปี", "Year")} <select id="sfy">${Object.keys(S.structure).sort().reverse().map(y => `<option ${Number(y) === STRUCT_FY ? "selected" : ""}>${y}</option>`).join("")}</select></label></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("ชื่อ", "Name")}</th><th class="n">${L("คำขอ", "Requests")}</th></tr></thead>
        <tbody>${order.map(n => `<tr class="tree-row"><td class="mono">${n.code}</td><td><span style="display:inline-block;width:${depth(n) * 20}px"></span><span class="lvl ${n.lvl}">${tx(LEVELS[n.lvl])}</span>${esc(tx(n.name))}</td>
          <td class="n">${STRUCT_FY === FORM_FY && n.lvl === "activity" ? S.requests.filter(r => r.act === n.id).length : ""}</td></tr>`).join("")}</tbody></table></div>
      ${STRUCT_FY === FORM_FY ? `<div class="body"><form class="inline-form" id="act-form">
        <div class="f"><label for="a-parent">${L("ภายใต้ผลผลิต", "Under output")}</label><select id="a-parent">${outputs.map(o => `<option value="${o.id}">${o.code} · ${esc(tx(o.name))}</option>`).join("")}</select></div>
        <div class="f"><label for="a-name">${L("ชื่อกิจกรรมใหม่", "New activity name")}</label><input type="text" id="a-name" required></div>
        <button class="btn primary" type="submit">+ ${L("เพิ่มกิจกรรม", "Add activity")}</button></form></div>` : `<div class="body sub">${L("ปีที่ผ่านมาแก้ไขไม่ได้ เพื่อรักษาข้อมูลย้อนหลัง", "Past years are read-only to protect history")}</div>`}</section>
    <section class="panel"><header><h2>${L(`การจับคู่รหัสข้ามปี ${CUR_FY} → ${FORM_FY}`, `Code mapping ${CUR_FY} → ${FORM_FY}`)}</h2></header>
      <div class="tbl-wrap"><table><thead><tr><th>${CUR_FY}</th><th>${FORM_FY}</th><th>${L("ประเภท", "Type")}</th></tr></thead>
        <tbody>${S.mapping.map(m => `<tr><td class="sub">${esc(name(CUR_FY, m.from))}</td><td>${esc(name(FORM_FY, m.to))}</td><td>${tag(tx(MAP_TYPE[m.type][0]), MAP_TYPE[m.type][1])}</td></tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("ใช้เปรียบเทียบงบประมาณหลายปีแม้โครงสร้างเปลี่ยน", "Lets reports compare years even when the structure changes")}</div></section>
  </div>`;
};
BIND_ADMIN.structure = () => {
  $("#sfy").onchange = e => { STRUCT_FY = Number(e.target.value); route(); };
  const f = $("#act-form");
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const parent = $("#a-parent").value, nm = $("#a-name").value.trim(), st = S.structure[FORM_FY];
    const sibs = st.filter(n => n.parent === parent), p = st.find(n => n.id === parent);
    const id = `${parent}-A${sibs.length + 1}`;
    st.push({ id, lvl: "activity", code: `${p.code}.A${sibs.length + 1}`, parent, name: [nm, nm] });
    audit(["เพิ่มกิจกรรมในโครงสร้างงบประมาณ", "Added an activity to the budget structure"], `${p.code}.A${sibs.length + 1} ${nm}`);
    commit(); route(); toast(L("เพิ่มกิจกรรมแล้ว เลือกใช้ได้ในแบบฟอร์มคำขอ", "Activity added and available in the request form"));
  };
};

ADMIN.users = () => `
  <section class="panel"><header><h2>${L("ผู้ใช้งาน", "Users")}</h2><span class="sp"></span><span class="sub">${L("ยืนยันตัวตนผ่าน SSO ของหน่วยงาน", "Sign-in through the organization's SSO")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ชื่อ", "Name")}</th><th>${L("หน่วยงาน", "Unit")}</th><th style="width:220px">${L("บทบาท", "Role")}</th><th class="c">MFA</th><th class="c">${L("ใช้งาน", "Active")}</th></tr></thead>
      <tbody>${S.users.map((u, i) => `<tr><td>${esc(tx(u.name))} ${historyBtn(u.name[0] + "|" + u.name[1], tx(u.name))}${u.primary ? ` <span class="sub">(${L("ผู้ใช้ตัวอย่างของบทบาท", "demo user for role")})</span>` : ""}</td><td class="sub">${unitName(u.unit)}</td>
        <td><select data-urole="${i}" aria-label="${L("บทบาทของ", "Role of")} ${esc(tx(u.name))}" ${u.primary ? "disabled" : ""}>${Object.keys(ROLES).map(r => `<option value="${r}" ${r === u.role ? "selected" : ""}>${tx(ROLES[r])}</option>`).join("")}</select></td>
        <td class="c">${sw("mfa-" + i, u.mfa)}</td><td class="c">${sw("act-" + i, u.active, u.primary)}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("สิทธิ์ตามบทบาทและโมดูล", "Role and module permissions")}</h2><span class="sp"></span><span class="sub">C ${L("สร้าง", "create")} · U ${L("ใช้งาน/แก้ไข", "use/edit")} · R ${L("อ่าน", "read")} · A ${L("อนุมัติ", "approve")}</span></header>
    <div class="tbl-wrap"><table class="mx"><thead><tr><th>${L("บทบาท", "Role")}</th>${["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10"].map(m => `<th class="c">${m}</th>`).join("")}</tr></thead>
      <tbody>${Object.keys(MATRIX).map(r => `<tr><td>${tx(ROLES[r])}</td>${MATRIX[r].map(v => `<td class="c" style="color:var(--${v === "A" ? "accent" : v.includes("U") ? "info" : "muted"})">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("ผู้ดูแลระบบไม่มีสิทธิ์เห็นหรือแก้ไขข้อมูลงบประมาณ", "Administrators cannot see or change budget data")}</div></section>
  <section class="panel"><header><h2>${L("การมอบอำนาจ", "Delegations of authority")}</h2><span class="sp"></span>
      <button class="btn" type="button" onclick="go('delegation')">${L("จัดการการมอบอำนาจ", "Manage delegations")}</button></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ผู้มอบ", "From")}</th><th>${L("ผู้รับมอบ", "To")}</th><th>${L("ช่วงเวลา", "Period")}</th><th>${L("สถานะ", "Status")}</th></tr></thead>
      <tbody>${(S.delegations || []).map(d => `<tr><td class="mono">${d.id}</td><td>${esc(userName(d.from))}</td><td>${esc(userName(d.to))}</td><td class="sub">${fdate(d.start)} – ${fdate(d.end)}</td><td>${tag(tx(DSTATE[delegState(d)][0]), DSTATE[delegState(d)][1])}</td></tr>`).join("")}</tbody></table></div></section>`;
BIND_ADMIN.users = () => {
  $$("[data-urole]").forEach(s => (s.onchange = () => { const u = S.users[s.dataset.urole]; const old = u.role; u.role = s.value; audit(["เปลี่ยนบทบาทผู้ใช้", "Changed a user's role"], `${tx(u.name)}: ${tx(ROLES[old])} → ${tx(ROLES[u.role])}`); commit(); toast(L("บันทึกบทบาทแล้ว", "Role saved")); }));
  S.users.forEach((u, i) => {
    const m = $("#mfa-" + i); if (m) m.onchange = () => { u.mfa = m.checked; audit([u.mfa ? "เปิด MFA" : "ปิด MFA", u.mfa ? "Turned on MFA" : "Turned off MFA"], tx(u.name)); commit(); toast(L("บันทึกแล้ว", "Saved")); };
    const a = $("#act-" + i); if (a && !a.disabled) a.onchange = () => { u.active = a.checked; audit([u.active ? "เปิดใช้งานผู้ใช้" : "ระงับผู้ใช้", u.active ? "Activated a user" : "Suspended a user"], tx(u.name)); commit(); toast(L("บันทึกแล้ว", "Saved")); };
  });
};

ADMIN.workflow = () => `
  <section class="panel"><header><h2>${L("สายอนุมัติคำของบประมาณ", "Budget request approval route")}</h2><span class="sp"></span><span class="sub">${L("ใช้กับเส้นทางอนุมัติใน M02", "Drives the approval route in M02")}</span></header>
    <div class="body"><div class="steps">${S.workflow.map((w, i) => `<div class="step">
      <span class="no">${i + 1}</span>
      <input type="text" data-w="${i}" data-k="name" value="${esc(tx(w.name))}" aria-label="${L("ชื่อขั้นตอน", "Step name")} ${i + 1}">
      <select data-w="${i}" data-k="role" aria-label="${L("ผู้รับผิดชอบ", "Owner")} ${i + 1}">${Object.keys(ROLES).filter(r => r !== "admin").map(r => `<option value="${r}" ${r === w.role ? "selected" : ""}>${tx(ROLES[r])}</option>`).join("")}</select>
      <label class="field-inline"><input type="number" min="0" data-w="${i}" data-k="sla" value="${w.sla}" style="width:64px" aria-label="SLA ${i + 1}"> ${L("วัน", "days")}</label>
      <div class="row" style="flex-wrap:nowrap"><select data-w="${i}" data-k="cond" aria-label="${L("เงื่อนไข", "Condition")} ${i + 1}">${Object.keys(COND).map(c => `<option value="${c}" ${c === w.cond ? "selected" : ""}>${tx(COND[c])}</option>`).join("")}</select>
        ${w.cond === "amount" ? `<input type="number" min="0" step="1" data-w="${i}" data-k="amountM" value="${(w.amount || 0) / 1e6}" style="width:80px" aria-label="${L("วงเงินขั้นต่ำ ล้านบาท", "Minimum amount, million baht")}"><span class="sub">${L("ลบ.", "M")}</span>` : ""}</div>
      <div class="acts"><button class="btn ghost" type="button" data-mv="${i}" data-d="-1" ${i === 0 ? "disabled" : ""} aria-label="${L("เลื่อนขึ้น", "Move up")}">↑</button><button class="btn ghost" type="button" data-mv="${i}" data-d="1" ${i === S.workflow.length - 1 ? "disabled" : ""} aria-label="${L("เลื่อนลง", "Move down")}">↓</button><button class="btn ghost danger" type="button" data-rm="${i}" ${S.workflow.length < 3 ? "disabled" : ""} aria-label="${L("ลบขั้นตอน", "Remove step")}">×</button></div>
    </div>`).join("")}</div>
    <div class="row" style="margin-top:14px"><button class="btn" type="button" id="w-add">+ ${L("เพิ่มขั้นตอน", "Add step")}</button><button class="btn primary" type="button" id="w-save">${L("บันทึก Workflow", "Save workflow")}</button></div></div></section>
  <section class="panel"><header><h2>${L("ความสามารถของ Workflow", "Workflow features")}</h2></header>
    <div class="body chips">${[["Multi-Level Approval", "Multi-Level Approval"], ["มอบอำนาจชั่วคราว", "Delegation of Authority"], ["ส่งกลับแก้ไข", "Return for Revision"], ["Version Control", "Version Control"], ["แจ้งเตือนตามกำหนดเวลา", "Deadline reminders"], ["Audit Trail", "Audit Trail"]].map(c => `<span class="chip">${tx(c)}</span>`).join("")}</div></section>`;
BIND_ADMIN.workflow = () => {
  $$("[data-w]").forEach(el => (el.onchange = () => {
    const w = S.workflow[el.dataset.w], k = el.dataset.k;
    if (k === "name") w.name = el.value; else if (k === "sla") w.sla = Number(el.value); else if (k === "amountM") w.amount = Number(el.value) * 1e6;
    else { w[k] = el.value; if (k === "cond" && el.value === "amount" && !w.amount) w.amount = 10e6; route(); }
  }));
  $$("[data-mv]").forEach(b => (b.onclick = () => { const i = Number(b.dataset.mv), j = i + Number(b.dataset.d); [S.workflow[i], S.workflow[j]] = [S.workflow[j], S.workflow[i]]; route(); }));
  $$("[data-rm]").forEach(b => (b.onclick = () => { S.workflow.splice(Number(b.dataset.rm), 1); route(); }));
  $("#w-add").onclick = () => { S.workflow.push({ id: "w" + Date.now(), name: L("ขั้นตอนใหม่", "New step"), role: "plan", sla: 5, cond: "always" }); route(); };
  $("#w-save").onclick = () => { audit(["แก้ไข Workflow คำของบประมาณ", "Changed the request workflow"], `${S.workflow.length} ${L("ขั้นตอน", "steps")}`); commit(); toast(L("บันทึก Workflow แล้ว · ใช้กับคำขอทันที", "Workflow saved · applies to requests now")); };
};

ADMIN.rules = () => `
  <section class="panel"><header><h2>${L(`กฎทางธุรกิจปี ${FORM_FY}`, `FY${FORM_FY} business rules`)}</h2><span class="sp"></span><span class="sub">${L("ใช้ตรวจความครบถ้วนใน M02 ทันทีที่บันทึก", "Applied to M02 checks as soon as you save")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th class="c" style="width:70px">${L("ใช้งาน", "On")}</th><th>${L("รหัส", "ID")}</th><th>${L("กฎ", "Rule")}</th><th style="width:160px">${L("ค่ากำหนด", "Setting")}</th><th style="width:170px">${L("เมื่อไม่ผ่าน", "If it fails")}</th></tr></thead>
      <tbody>${S.rules.map((r, i) => `<tr><td class="c">${sw("rule-" + i, r.on)}</td><td class="mono">${r.id}</td><td>${tx(r.name)} ${historyBtn(r.id, r.id)}</td>
        <td>${r.param != null ? `<label class="field-inline"><input type="number" min="0" data-rp="${i}" value="${r.param}" style="width:80px" aria-label="${r.id}"> ${tx(r.unit)}</label>` : `<span class="sub">—</span>`}</td>
        <td><select data-re="${i}" aria-label="${r.id}"><option value="block" ${r.effect === "block" ? "selected" : ""}>${L("ห้ามส่ง", "Block sending")}</option><option value="warn" ${r.effect === "warn" ? "selected" : ""}>${L("ข้อสังเกต", "Warn only")}</option></select></td></tr>`).join("")}</tbody></table></div></section>`;
BIND_ADMIN.rules = () => {
  const log = (r, what) => { audit(["แก้ไขกฎทางธุรกิจ", "Changed a business rule"], `${r.id}: ${what}`); commit(); toast(L("บันทึกกฎแล้ว", "Rule saved")); };
  S.rules.forEach((r, i) => {
    $("#rule-" + i).onchange = e => { r.on = e.target.checked; log(r, r.on ? "on" : "off"); };
  });
  $$("[data-rp]").forEach(inp => (inp.onchange = () => { const r = S.rules[inp.dataset.rp]; r.param = Number(inp.value); log(r, String(r.param)); }));
  $$("[data-re]").forEach(s => (s.onchange = () => { const r = S.rules[s.dataset.re]; r.effect = s.value; log(r, r.effect); }));
};

let AUDIT_Q = "", AUDIT_ROLE = "";
ADMIN.audit = () => `
  <section class="panel"><header><h2>${L("บันทึกการใช้งาน", "Audit log")}</h2><span class="sp"></span>
    <label class="field-inline" for="aq-role">${L("บทบาท", "Role")} <select id="aq-role"><option value="">${L("ทั้งหมด", "All")}</option>${Object.keys(ROLES).map(r => `<option value="${r}" ${r === AUDIT_ROLE ? "selected" : ""}>${tx(ROLES[r])}</option>`).join("")}</select></label>
    <input type="text" id="aq" value="${esc(AUDIT_Q)}" placeholder="${L("ค้นหา", "Search")}" aria-label="${L("ค้นหาบันทึก", "Search the log")}">
    <button class="btn" type="button" id="aq-exp">${L("ส่งออก", "Export")}</button></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "Time")}</th><th>${L("ผู้ใช้", "User")}</th><th>${L("บทบาท", "Role")}</th><th>${L("การกระทำ", "Action")}</th><th>${L("รายการ", "Target")}</th></tr></thead>
      <tbody id="aq-body"></tbody></table></div>
    <div class="body sub">${L("บันทึกแบบเพิ่มอย่างเดียว แก้ไขหรือลบไม่ได้", "Append-only. Entries cannot be edited or deleted.")}</div></section>`;
function auditRows() {
  const q = AUDIT_Q.toLowerCase();
  const rows = S.audit.filter(a => (!AUDIT_ROLE || a.role === AUDIT_ROLE) && (!q || (tx(a.action) + " " + a.target + " " + userName(a.user)).toLowerCase().includes(q)));
  return rows.map(a => `<tr><td class="sub" style="white-space:nowrap">${fdate(a.t, true)}</td><td>${esc(userName(a.user))}</td><td class="sub">${tx(ROLES[a.role])}</td><td>${tx(a.action)}</td><td class="sub">${esc(a.target)}</td></tr>`).join("")
    || `<tr><td colspan="5" class="sub">${L("ไม่พบรายการ", "No matching entries")}</td></tr>`;
}
BIND_ADMIN.audit = () => {
  const body = $("#aq-body"); body.innerHTML = auditRows();
  $("#aq").oninput = e => { AUDIT_Q = e.target.value; body.innerHTML = auditRows(); };
  $("#aq-role").onchange = e => { AUDIT_ROLE = e.target.value; body.innerHTML = auditRows(); };
  $("#aq-exp").onclick = () => toast(L("ต้นแบบนี้จำลองการส่งออก · ระบบจริงส่งออก CSV ให้ผู้ตรวจสอบ", "Export is simulated here · the real system exports CSV for auditors"));
};

ADMIN.integrations = () => `
  <section class="panel"><header><h2>${L("สถานะการเชื่อมต่อระบบภายนอก", "External integration status")}</h2><span class="sp"></span><span class="sub">${L("ตาม Interface Catalog ในเอกสาร Solution Design บท 8", "Per the interface catalogue in Solution Design chapter 8")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "ID")}</th><th>${L("ระบบ", "System")}</th><th>${L("ทิศทาง / วิธี", "Direction / method")}</th><th>${L("ความถี่", "Frequency")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ล่าสุด", "Last run")}</th><th class="n">${L("รายการ", "Rows")}</th><th></th></tr></thead>
      <tbody>${S.integrations.map((g, i) => `<tr><td class="mono">${g.id}</td><td><b style="font-weight:600">${g.sys}</b><div class="sub">${tx(g.msg)}</div></td><td class="sub">${tx(g.dir)} · ${tx(g.method)}</td><td class="sub">${tx(g.freq)}</td>
        <td>${tag(tx(IF_STATUS[g.status][0]), IF_STATUS[g.status][1])}</td><td class="sub" style="white-space:nowrap">${g.last ? fdate(g.last, true) : "—"}</td><td class="n">${fmt(g.records)}</td>
        <td>${g.status === "pending" ? `<span class="sub">${L("รออนุญาต", "Awaiting approval")}</span>` : `<button class="btn" type="button" data-run="${i}">${g.status === "warn" ? L("กระทบยอด", "Reconcile") : g.status === "error" ? L("ลองใหม่", "Retry") : L("รันตอนนี้", "Run now")}</button>`}</td></tr>`).join("")}</tbody></table></div></section>`;
BIND_ADMIN.integrations = () => {
  $$("[data-run]").forEach(b => (b.onclick = () => {
    const g = S.integrations[b.dataset.run], was = g.status;
    g.status = "ok"; g.last = nowIso(); g.records = was === "error" ? 1920 : g.records + (was === "warn" ? 0 : 12);
    g.msg = was === "warn" ? ["กระทบยอดแล้ว ยอดตรงกัน", "Reconciled, totals match"] : ["สำเร็จ", "Succeeded"];
    audit([was === "warn" ? "กระทบยอดข้อมูลนำเข้า" : "สั่งรันการเชื่อมต่อ", was === "warn" ? "Reconciled an import" : "Ran an integration"], `${g.id} ${g.sys}`);
    commit(); renderShell(); route(); toast(`${g.id} · ${tx(g.msg)}`);
  }));
};

VIEWS.admin = () => {
  const tabs = ADMIN_TABS.filter(t => t.roles.includes(ROLE));
  if (!tabs.find(t => t.id === ADMIN_TAB)) ADMIN_TAB = tabs[0].id;
  return `
  <div class="head"><div><div class="eyebrow">M10 · System Administration</div><h1>${L("ผู้ดูแลระบบ", "System administration")}</h1>
    <p>${isAdmin() ? L("ตั้งค่าที่นี่มีผลกับทุกโมดูลทันที โดยไม่ต้องแก้โค้ด", "Settings here apply to every module at once, without code changes") : L("บทบาทของคุณเห็นเฉพาะส่วนที่เกี่ยวข้อง", "Your role sees only the relevant sections")}</p></div></div>
  <div class="tabs" role="tablist">${tabs.map(t => `<button class="tab ${t.id === ADMIN_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${t.id === ADMIN_TAB}" data-tab="${t.id}">${tx(t.label)}</button>`).join("")}</div>
  ${ADMIN[ADMIN_TAB]()}`;
};
BIND.admin = () => {
  $$("[data-tab]").forEach(b => (b.onclick = () => { ADMIN_TAB = b.dataset.tab; history.replaceState(null, "", "#admin-" + ADMIN_TAB); route(); }));
  (BIND_ADMIN[ADMIN_TAB] || (() => {}))();
};
