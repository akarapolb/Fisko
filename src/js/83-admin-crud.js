// Round 54 follow-ups to the Budget CRUD design: a request's basics can be edited from its drawer, and the M10
// users, approval route and business rules move onto the shared list + drawer.

// ---------- B3: edit a request's basics in the drawer (the lines stay in the full form, D-C-01) ----------
{
  const d = CRUD.defs.rqReq, f0 = d.fields;
  d.fields = (r, v) => (!r ? f0(r, v) : [
    { id: "name", label: ["ชื่อโครงการ / รายการ", "Project or item name"], req: true, wide: true, value: tx(r.name) },
    { id: "act", label: ["กิจกรรม (รหัสงบประมาณ)", "Activity (budget code)"], type: "select", req: true, blank: L("— เลือกกิจกรรม —", "— choose an activity —"), opts: actOpts(), value: r.act },
    { id: "kpi", label: ["ตัวชี้วัดของโครงการ", "Project KPI"], wide: true, value: tx(r.kpi || "") },
    { id: "reason", label: ["เหตุผลความจำเป็น", "Justification"], type: "textarea", wide: true, value: tx(r.reason || "") },
    { id: "_lines", label: ["รายการงบประมาณ", "Budget lines"], type: "info", wide: true, html: `${r.items.length} ${L("รายการ", "lines")} · ${fmt(reqAmount(r))} ${L("บาท · แก้ในแบบฟอร์มเต็ม", "baht · edit them in the full form")}` },
  ]);
  d.edit = { can: r => editable(r), run: (r, v) => { r.name = [v.name, v.name]; r.act = v.act; r.kpi = [v.kpi, v.kpi]; r.reason = v.reason; r.updated = TODAY; snapshot(r, ["แก้ไขข้อมูลหลักของคำขอ", "Edited the request's basics"], true); audit(["แก้ไขคำขอ", "Edited a request"], r.id); } };
}

// ---------- M10 users ----------
const USR_ST = { on: [["ใช้งาน", "Active"], "p-ok"], off: [["ระงับ", "Suspended"], "p-mute"] };
CRUD.def("adUser", {
  noun: ["ผู้ใช้งาน", "User"], st: USR_ST, list: () => S.users, id: u => u.id, title: u => tx(u.name), sub: u => `${tx(ROLES[u.role])} · ${unitName(u.unit)}`,
  status: u => (u.active === false ? "off" : "on"), gone: u => u.active === false, search: u => `${u.id} ${u.name.join(" ")}`,
  filters: [{ id: "role", label: ["บทบาท", "Role"], opts: () => Object.keys(ROLES).map(r => [r, tx(ROLES[r])]), get: u => u.role }, { id: "unit", label: ["หน่วยงาน", "Unit"], opts: () => S.units.map(x => [x.id, tx(x.name)]), get: u => u.unit }],
  cols: [{ h: ["ชื่อ", "Name"], c: u => `${esc(tx(u.name))}${u.primary ? ` <span class="sub">(${L("ผู้ใช้ตัวอย่างของบทบาท", "demo user for role")})</span>` : ""}` }, { h: ["บทบาท", "Role"], c: u => `<span class="sub">${tx(ROLES[u.role])}</span>` },
    { h: ["หน่วยงาน", "Unit"], c: u => `<span class="sub">${unitName(u.unit)}</span>` }, { h: ["MFA", "MFA"], c: u => (u.mfa ? tag(L("เปิด", "On"), "p-ok") : tag(L("ปิด", "Off"), "p-warn")) }],
  fields: u => [
    { id: "th", label: ["ชื่อ-สกุล (ไทย)", "Name (Thai)"], req: true, wide: true, value: u ? u.name[0] : "" }, { id: "en", label: ["ชื่อ-สกุล (อังกฤษ)", "Name (English)"], wide: true, value: u ? u.name[1] : "" },
    { id: "role", label: ["บทบาท", "Role"], type: "select", req: true, value: u ? u.role : "div", lock: !!(u && u.primary), show: u && tx(ROLES[u.role]), opts: Object.keys(ROLES).map(r => [r, tx(ROLES[r])]), hint: u && u.primary ? L("ผู้ใช้ตัวอย่างของบทบาทเปลี่ยนบทบาทไม่ได้", "A role's demo user keeps its role") : "" },
    { id: "unit", label: ["หน่วยงาน", "Unit"], type: "select", req: true, value: u ? u.unit : "", opts: S.units.filter(x => !x.retired).map(x => [x.id, tx(x.name)]) },
    { id: "mfa", label: ["ใช้การยืนยันตัวตนสองชั้น (MFA)", "Two-factor sign-in (MFA)"], type: "check", value: u ? !!u.mfa : true },
  ],
  create: { can: () => isAdmin(), label: ["เพิ่มผู้ใช้", "Add a user"], run: v => { const u = { id: "u" + (maxNo(S.users.map(x => x.id), /^u(\d+)/) + 1), role: v.role, unit: v.unit, primary: false, mfa: v.mfa, active: true, name: [v.th, v.en || v.th] }; S.users.push(u); audit(["เพิ่มผู้ใช้", "Added a user"], `${u.id} ${v.th}`); return u; } },
  edit: { can: () => isAdmin(), run: (u, v) => { const old = u.role; u.name = [v.th, v.en || v.th]; if (!u.primary) u.role = v.role; u.unit = v.unit; u.mfa = v.mfa; audit(["แก้ไขผู้ใช้", "Edited a user"], `${tx(u.name)}${old !== u.role ? `: ${tx(ROLES[old])} → ${tx(ROLES[u.role])}` : ""}`); } },
  acts: u => (!isAdmin() || u.primary ? [] : u.active === false
    ? [{ id: "on", label: L("เปิดใช้งาน", "Reactivate"), kind: "primary", run: () => { u.active = true; audit(["เปิดใช้งานผู้ใช้", "Activated a user"], tx(u.name)); return L("เปิดใช้งานแล้ว", "Reactivated"); } }]
    : [{ id: "off", label: L("ระงับการใช้งาน", "Suspend"), kind: "danger", why: true, impact: () => L("เข้าสู่ระบบไม่ได้ ข้อมูลและประวัติที่ผู้ใช้ทำไว้ยังอยู่", "They can't sign in; what they did stays in the records and history"), run: (_, why) => { u.active = false; u.suspended = { t: nowIso(), why }; audit(["ระงับผู้ใช้", "Suspended a user"], `${tx(u.name)} · ${why}`); return L("ระงับแล้ว", "Suspended"); } }]),
  view: u => kv([[L("บทบาท", "Role"), tx(ROLES[u.role])], [L("หน่วยงาน", "Unit"), unitName(u.unit)], [L("MFA", "MFA"), u.mfa ? L("เปิด", "On") : L("ปิด", "Off")], [L("การมอบอำนาจ", "Delegations"), (S.delegations || []).filter(d => d.from === u.id || d.to === u.id).map(d => d.id).join(", ") || "–"], u.suspended && [L("ระงับเมื่อ", "Suspended"), `${fdate(u.suspended.t)} · ${esc(u.suspended.why)}`]]),
  hist: u => `${u.name[0]}|${u.name[1]}`,
});

// ---------- M10 approval route ----------
const WF_LOCKED = ["w3"]; // the committee step is read by needsCommittee()
CRUD.def("adWf", {
  noun: ["ขั้นตอนอนุมัติ", "Approval step"], list: () => S.workflow, id: w => w.id, title: w => tx(w.name), sub: w => `${tx(ROLES[w.role])} · SLA ${w.sla} ${L("วัน", "days")}`,
  cols: [{ h: ["#", "#"], n: true, c: w => S.workflow.indexOf(w) + 1 }, { h: ["ขั้นตอน", "Step"], c: w => esc(tx(w.name)) }, { h: ["ผู้รับผิดชอบ", "Owner"], c: w => `<span class="sub">${tx(ROLES[w.role])}</span>` },
    { h: ["SLA", "SLA"], n: true, c: w => `${w.sla} ${L("วัน", "d")}` }, { h: ["เงื่อนไข", "Condition"], c: w => `<span class="sub">${tx(COND[w.cond] || ["–", "–"])}${w.cond === "amount" ? ` ${mb(w.amount || 0)} ${L("ลบ.", "M")}` : ""}</span>` }],
  fields: (w, v) => { const cond = v.cond || (w && w.cond) || "always";
    return [{ id: "name", label: ["ชื่อขั้นตอน", "Step name"], req: true, wide: true, value: w ? tx(w.name) : "" },
      { id: "role", label: ["ผู้รับผิดชอบ", "Owner"], type: "select", req: true, value: w ? w.role : "plan", opts: Object.keys(ROLES).filter(r => r !== "admin").map(r => [r, tx(ROLES[r])]) },
      { id: "sla", label: ["SLA (วัน)", "SLA (days)"], type: "number", req: true, min: 0, value: w ? w.sla : 5 },
      { id: "cond", label: ["เงื่อนไข", "Condition"], type: "select", req: true, value: cond, lock: !!(w && WF_LOCKED.includes(w.id)), show: w && tx(COND[w.cond] || ["–", "–"]), opts: Object.keys(COND).map(c => [c, tx(COND[c])]) },
      ...(cond === "amount" ? [{ id: "amount", label: ["วงเงินขั้นต่ำ (ล้านบาท)", "Minimum amount (million baht)"], type: "money", req: true, min: 0, value: w ? w.amount || 10e6 : 10e6 }] : [])]; },
  create: { can: () => isAdmin(), label: ["เพิ่มขั้นตอน", "Add a step"], run: v => { const w = { id: "w" + (maxNo(S.workflow.map(x => x.id), /^w(\d+)/) + 1), name: [v.name, v.name], role: v.role, sla: v.sla, cond: v.cond, amount: v.cond === "amount" ? v.amount : undefined }; S.workflow.push(w); audit(["เพิ่มขั้นตอนอนุมัติ", "Added an approval step"], `${w.id} ${v.name}`); return w; } },
  edit: { can: () => isAdmin(), run: (w, v) => { w.name = [v.name, v.name]; w.role = v.role; w.sla = v.sla; if (!WF_LOCKED.includes(w.id)) w.cond = v.cond; if (w.cond === "amount") w.amount = v.amount; audit(["แก้ไขขั้นตอนอนุมัติ", "Edited an approval step"], `${w.id} ${v.name}`); } },
  acts: w => { if (!isAdmin()) return []; const i = S.workflow.indexOf(w), mv = d => () => { const j = i + d; [S.workflow[i], S.workflow[j]] = [S.workflow[j], S.workflow[i]]; audit(["เรียงขั้นตอนอนุมัติใหม่", "Reordered the approval route"], w.id); return L("เรียงใหม่แล้ว", "Reordered"); };
    return [i > 0 && { id: "up", label: L("เลื่อนขึ้น", "Move up"), run: mv(-1) }, i < S.workflow.length - 1 && { id: "down", label: L("เลื่อนลง", "Move down"), run: mv(1) },
      !WF_LOCKED.includes(w.id) && S.workflow.length > 1 && { id: "del", label: L("ลบขั้นตอน", "Delete step"), kind: "danger", why: true, impact: () => L("คำขอที่ส่งใหม่จะไม่ผ่านขั้นนี้ คำขอที่อยู่ระหว่างทางไม่เปลี่ยน", "New requests skip this step; requests already on their way don't change"), run: (_, why) => { S.workflow.splice(i, 1); audit(["ลบขั้นตอนอนุมัติ", "Deleted an approval step"], `${w.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }]; },
  view: w => kv([[L("ลำดับ", "Order"), S.workflow.indexOf(w) + 1], [L("ผู้รับผิดชอบ", "Owner"), tx(ROLES[w.role])], [L("SLA", "SLA"), `${w.sla} ${L("วัน", "days")}`], [L("เงื่อนไข", "Condition"), `${tx(COND[w.cond] || ["–", "–"])}${w.cond === "amount" ? ` ${mb(w.amount || 0)} ${L("ลบ.", "M")}` : ""}`],
    WF_LOCKED.includes(w.id) && [L("หมายเหตุ", "Note"), L("ขั้นคณะกรรมการใช้ตัดสินว่าคำขอต้องเข้าคณะกรรมการหรือไม่ ลบหรือเปลี่ยนเงื่อนไขไม่ได้", "The committee step decides which requests go to the committee; it can't be deleted or its condition changed")]]),
});

// ---------- M10 business rules ----------
const RULE_ST = { on: [["ใช้งาน", "On"], "p-ok"], off: [["ปิด", "Off"], "p-mute"] };
const RULE_EFF = { block: ["ห้ามส่ง", "Block sending"], warn: ["ข้อสังเกต", "Warning"] };
CRUD.def("adRule", {
  noun: ["กฎทางธุรกิจ", "Business rule"], st: RULE_ST, list: () => S.rules, id: r => r.id, title: r => `${r.id} · ${tx(r.name)}`, sub: r => tx(RULE_EFF[r.effect] || ["–", "–"]), status: r => (r.on ? "on" : "off"),
  search: r => `${r.id} ${r.name.join(" ")}`,
  cols: [{ h: ["รหัส", "ID"], c: r => `<span class="mono">${r.id}</span>` }, { h: ["กฎ", "Rule"], c: r => esc(tx(r.name)) }, { h: ["ค่ากำหนด", "Setting"], n: true, c: r => (r.param != null ? `${fmt(r.param)} <span class="sub">${tx(r.unit)}</span>` : "–") }, { h: ["ผล", "Effect"], c: r => `<span class="sub">${tx(RULE_EFF[r.effect] || ["–", "–"])}</span>` }],
  fields: r => [{ id: "on", label: ["ใช้กฎนี้", "Rule is on"], type: "check", value: !!r.on },
    ...(r.param != null ? [{ id: "param", label: [`ค่ากำหนด (${r.unit ? r.unit[0] : ""})`, `Setting (${r.unit ? r.unit[1] : ""})`], type: "number", req: true, min: 0, value: r.param }] : []),
    { id: "effect", label: ["เมื่อไม่ผ่าน", "When it fails"], type: "select", req: true, value: r.effect, opts: Object.keys(RULE_EFF).map(k => [k, tx(RULE_EFF[k])]) }],
  edit: { can: () => isAdmin(), why: () => true, run: (r, v, why) => { const old = `${r.on ? "on" : "off"}/${r.param ?? "-"}/${r.effect}`; r.on = v.on; if (r.param != null) r.param = Number(v.param); r.effect = v.effect; audit(["แก้ไขกฎทางธุรกิจ", "Changed a business rule"], `${r.id}: ${old} → ${r.on ? "on" : "off"}/${r.param ?? "-"}/${r.effect} · ${why}`); } },
  acts: r => (isAdmin() ? [{ id: "tog", label: r.on ? L("ปิดกฎ", "Turn off") : L("เปิดกฎ", "Turn on"), why: r.on, run: (_, why) => { r.on = !r.on; audit(["แก้ไขกฎทางธุรกิจ", "Changed a business rule"], `${r.id}: ${r.on ? "on" : "off"}${why ? " · " + why : ""}`); return r.on ? L("เปิดกฎแล้ว", "Rule on") : L("ปิดกฎแล้ว", "Rule off"); } }] : []),
  view: r => kv([[L("กฎ", "Rule"), esc(tx(r.name))], [L("สถานะ", "Status"), r.on ? L("ใช้งาน", "On") : L("ปิด", "Off")], r.param != null && [L("ค่ากำหนด", "Setting"), `${fmt(r.param)} ${tx(r.unit)}`], [L("เมื่อไม่ผ่าน", "When it fails"), tx(RULE_EFF[r.effect] || ["–", "–"])], [L("ใช้ที่", "Used in"), L("ตรวจความครบถ้วนของคำขอ (B3) ทันทีที่บันทึก", "The request checks (B3), as soon as it's saved")]])
    + `<p class="sub">${L("กฎผูกกับการตรวจในระบบ จึงเพิ่มหรือลบไม่ได้ ปิดได้เมื่อไม่ใช้", "Rules are tied to checks in the system, so they can't be added or deleted; switch one off when it doesn't apply")}</p>`,
  hist: r => r.id,
});
{
  const au = ADMIN.users;
  ADMIN.users = () => { const h = au(), i = h.indexOf("</section>") + "</section>".length; return crudList("adUser", { head: `<h2>${L("ผู้ใช้งาน", "Users")}</h2><span class="sp"></span><span class="sub">${L("ยืนยันตัวตนผ่าน SSO ของหน่วยงาน", "Sign-in through the organization's SSO")}</span>` }) + h.slice(i); };
  const aw = ADMIN.workflow;
  ADMIN.workflow = () => { const h = aw(), i = h.indexOf("</section>") + "</section>".length; return crudList("adWf", { head: `<h2>${L("สายอนุมัติคำของบประมาณ", "Budget request approval route")}</h2><span class="sp"></span><span class="sub">${L("ใช้กับคำขอที่ส่งใหม่", "Applies to requests sent from now on")}</span>` }) + h.slice(i); };
  ADMIN.rules = () => crudList("adRule", { head: `<h2>${L(`กฎทางธุรกิจปี ${FORM_FY}`, `FY${FORM_FY} business rules`)}</h2><span class="sp"></span><span class="sub">${L("ใช้ตรวจความครบถ้วนของคำขอทันทีที่บันทึก", "Used by the request checks as soon as they're saved")}</span>` });
  BIND_ADMIN.users = () => {}; BIND_ADMIN.workflow = () => {}; BIND_ADMIN.rules = () => {};
}
