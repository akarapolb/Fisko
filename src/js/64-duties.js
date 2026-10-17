// Segregation of duties (round 11): rules that stop one person doing consecutive steps on the same item
// across Fisko Procurement and Fisko Finance. Delegation never bypasses them: the signed-in user and the
// person whose authority they hold are both checked. Rules can be switched off in M10 (admin only).
const SOD_RULES = [
  ["SD-01", ["ผู้ขอซื้อขอจ้างต้องไม่เป็นผู้อนุมัติใบขอซื้อรายการเดียวกัน", "A requester can't approve their own requisition"]],
  ["SD-02", ["ผู้ดำเนินการจัดซื้อต้องไม่เป็นกรรมการตรวจรับสัญญาเดียวกัน", "The procurement officer can't sit on the acceptance committee of the same contract"]],
  ["SD-03", ["ผู้ขอเบิกจ่ายต้องไม่เป็นผู้อนุมัติเบิกจ่ายรายการเดียวกัน", "A payment's requester can't approve it"]],
  ["SD-04", ["ผู้อนุมัติเบิกจ่ายต้องไม่เป็นกรรมการตรวจรับสัญญาเดียวกัน", "A payment's approver can't be on the contract's acceptance committee"]],
  ["SD-05", ["ผู้กระทบยอดต้องไม่เป็นผู้อนุมัติเบิกจ่ายรายการนั้น", "The person reconciling can't be the one who approved the payment"]],
  ["SD-07", ["กรรมการที่แจ้งว่ามีส่วนได้เสียกับผู้ยื่นรายใด ห้ามร่วมพิจารณาแฟ้มนั้น และต้องแจ้งก่อนพิจารณา", "A committee member who declares a conflict with a bidder can't take part in that case, and everyone must declare before the evaluation"]],
  ["SD-08", ["ผู้เสนอแก้ไขสัญญาต้องไม่เป็นผู้อนุมัติการแก้ไขนั้น", "Whoever proposes a contract change can't approve it"]],
  ["SD-06", ["กรรมการพิจารณาผลหรือกรรมการซื้อจ้างต้องไม่เป็นกรรมการตรวจรับของสัญญาเดียวกัน", "A member of the evaluation or purchasing committee can't sit on the acceptance committee of the same contract"]],
];
const SOD_STEPS = [
  [["ขอซื้อ / ขอจ้าง", "Raise a requisition"], ["อนุมัติใบขอซื้อ", "Approve the requisition"], "SD-01"],
  [["ดำเนินการจัดซื้อและสร้างสัญญา", "Run the procurement and create the contract"], ["ตรวจรับงาน", "Accept the work"], "SD-02"],
  [["ขออนุมัติเบิกจ่าย", "Request the payment"], ["อนุมัติเบิกจ่าย", "Approve the payment"], "SD-03"],
  [["ตรวจรับงาน", "Accept the work"], ["อนุมัติเบิกจ่าย", "Approve the payment"], "SD-04"],
  [["อนุมัติเบิกจ่าย", "Approve the payment"], ["กระทบยอดกับ GFMIS", "Reconcile with GFMIS"], "SD-05"],
  [["พิจารณาผลหรือซื้อจ้างเป็นกรรมการ", "Sit on the evaluation or purchasing committee"], ["ตรวจรับงาน", "Accept the work"], "SD-06"],
  [["แจ้งส่วนได้เสียกับผู้ยื่น", "Declare a conflict with a bidder"], ["พิจารณาข้อเสนอของแฟ้มนั้น", "Evaluate that case"], "SD-07"],
  [["เสนอแก้ไขสัญญา", "Propose a contract change"], ["อนุมัติการแก้ไขสัญญา", "Approve the change"], "SD-08"],
];
const sodOn = id => { const r = ((S.sod || {}).rules || []).find(x => x.id === id); return !r || r.on; };
// The people acting on a step: the signed-in user, plus the person whose authority they hold when acting by delegation.
function sodActors(role, scope) { const ids = [me().id]; if (ROLE !== role) { const d = delegFor(role, scope); if (d) ids.push(d.from); } return ids; }
function sodCheck(rule, actors, others, item) {
  if (!sodOn(rule)) return true;
  const clash = actors.find(a => others.includes(a));
  if (!clash) return true;
  const txt = SOD_RULES.find(r => r[0] === rule)[1], by = me().id;
  S.sod.blocks.unshift({ t: nowIso(), by, role: ROLE, rule, item, who: clash });
  if (S.sod.blocks.length > 100) S.sod.blocks.length = 100;
  audit(["ระบบกันรายการตามกฎแยกหน้าที่", "Blocked by a duty-separation rule"], `${item} · ${rule} · ${userName(clash)}${clash !== by ? ` (${L("ผู้มอบอำนาจ", "delegator")})` : ""}`);
  commit();
  toast(`${rule}: ${tx(txt)} · ${userName(clash)}`);
  return false;
}

ADMIN_TABS.push({ id: "duties", roles: ["admin", "audit"], label: ["การแยกหน้าที่", "Duty separation"] });
ADMIN.duties = () => {
  const ad = isAdmin(), B = S.sod.blocks;
  return `
  <section class="panel"><header><h2>${L("กฎการแยกหน้าที่", "Duty-separation rules")}</h2><span class="sp"></span>${tag(ad ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), ad ? "p-ok" : "p-mute")}</header>
    <div class="tbl-wrap"><table><thead><tr><th class="c" style="width:70px">${L("ใช้งาน", "On")}</th><th>${L("รหัส", "ID")}</th><th>${L("ขั้นแรก", "First step")}</th><th>${L("ขั้นถัดไป", "Next step")}</th><th>${L("กฎ", "Rule")}</th></tr></thead>
      <tbody>${SOD_STEPS.map(([a, b, id]) => `<tr><td class="c">${sw("sod-" + id, sodOn(id), !ad)}</td><td class="mono">${id}</td><td>${tx(a)}</td><td>${tx(b)}</td><td class="sub">${tx(SOD_RULES.find(r => r[0] === id)[1])}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("ตรวจกับตัวผู้ทำรายการและผู้ที่มอบอำนาจให้ทุกครั้ง การปิดกฎต้องมีเหตุผลและแจ้งผู้ตรวจสอบ · ค่าเริ่มต้นนี้เป็นข้อเสนอ (ประเด็น D-F04) หน่วยงานปรับตามนโยบายควบคุมภายในได้", "Each rule checks the person acting and anyone who delegated to them. Switching a rule off is recorded and visible to Audit. These defaults are a proposal (decision D-F04); an agency adjusts them to its internal-control policy.")}</div></section>
  <section class="panel"><header><h2>${L("รายการที่ระบบกันไว้", "Attempts the system blocked")}</h2><span class="sp"></span><span class="sub">${B.length} ${L("รายการ", "entries")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "Time")}</th><th>${L("รายการ", "Item")}</th><th>${L("กฎ", "Rule")}</th><th>${L("ผู้พยายาม", "Attempted by")}</th><th>${L("ติดกฎเพราะ", "Blocked because of")}</th></tr></thead>
      <tbody>${B.map(b => `<tr><td class="sub" style="white-space:nowrap">${fdate(b.t, true)}</td><td class="mono">${esc(b.item)}</td><td class="mono">${b.rule}</td><td>${esc(userName(b.by))}<div class="sub">${tx(ROLES[b.role])}</div></td><td>${esc(userName(b.who))}${b.who !== b.by ? `<div class="sub">${L("ผู้มอบอำนาจ", "delegator")}</div>` : ""}</td></tr>`).join("")
        || `<tr><td colspan="5" class="sub">${L("ยังไม่มีรายการที่ถูกกัน", "Nothing has been blocked yet")}</td></tr>`}</tbody></table></div></section>`;
};
BIND_ADMIN.duties = () => SOD_RULES.forEach(([id]) => {
  const el = $("#sod-" + id); if (!el || el.disabled) return;
  el.onchange = () => {
    const r = S.sod.rules.find(x => x.id === id); r.on = el.checked;
    audit([el.checked ? "เปิดกฎแยกหน้าที่" : "ปิดกฎแยกหน้าที่", el.checked ? "Switched a duty-separation rule on" : "Switched a duty-separation rule off"], id);
    if (!el.checked) notify(["audit"], [`ผู้ดูแลระบบปิดกฎแยกหน้าที่ ${id}`, `An administrator switched off duty rule ${id}`], "admin-duties");
    commit(); route(); toast(L("บันทึกแล้ว", "Saved"));
  };
});

// ---- search: plan items, contracts and payments ----
Object.assign(STYPE, { plan: ["แผนจัดซื้อ", "Plan item"], contract: ["สัญญา", "Contract"], payment: ["คำขอเบิกจ่าย", "Payment"] });
{
  const base = searchItems;
  searchItems = () => {
    const out = base(), add = (type, page, label, sub, run, hay) => { if (allowed(page)) out.push({ type, label, sub, run, hay: (label + " " + sub + " " + hay).toLowerCase() }); };
    (S.pplan || []).forEach(p => add("plan", "procurement", `${p.id} ${tx(p.name)}`, tx(PLAN_ST[p.status][0]), () => jump("prc-plan"), p.name.join(" ")));
    (S.contracts || []).forEach(c => add("contract", "procurement", `${c.id} ${c.no}`, `${tx(c.vendor)} · ${mb(c.amount)} ${L("ลบ.", "M")}`, () => jump("prc-contracts"), c.vendor.join(" ") + " " + famPlan(c.plan).name.join(" ")));
    (S.payreqs || []).forEach(p => add("payment", "finance", p.id, `${p.contract} · ${mb(p.amount)} ${L("ลบ.", "M")}`, () => jump("fnc-pay"), p.contract));
    return out;
  };
}

NAV.push(
  { id: "procurement", code: "PR", group: "procurement", app: "procurement", jumpPrefix: "prc", roles: ["proc", "prochead", "div", "exec", "plan", "fin", "audit"], label: ["Fisko Procurement · จัดซื้อจัดจ้าง", "Fisko Procurement"],
    tabs: [["cases", ["แฟ้มจัดซื้อ", "Case files"], "P1"], ["plan", ["แผนจัดซื้อ", "Procurement plan"], "P2"], ["reqn", ["ใบขอซื้อขอจ้าง", "Requisitions"], "P3"], ["tor", ["คลัง TOR", "TOR library"], "P4"], ["contracts", ["สัญญาและงวดงาน", "Contracts and phases"], "P5"], ["docs", ["รับเอกสาร (OCR)", "Document intake (OCR)"], "P6"], ["suppliers", ["ผู้ขาย", "Suppliers"], "P7"], ["gantt", ["ไทม์ไลน์แฟ้ม", "Case timeline"], "P8"], ["egp", ["ไฟล์จาก e-GP", "e-GP file"], "P9"], ["analytics", ["วิเคราะห์และตัวชี้วัด", "Analytics and KPIs"], "P10"], ["reports", ["รายงานประจำเดือน", "Monthly report"], "P11"], ["flags", ["สัญญาณเตือน", "Red flags"], "P12"], ["ocds", ["ส่งออก OCDS", "OCDS export"], "P13"], ["ai", ["ผู้ช่วย AI", "AI assistant"], "P14"]],
    tabGet: () => PROC_TAB, tabSet: v => (PROC_TAB = v) },
  { id: "finance", code: "FN", group: "finance", app: "finance", jumpPrefix: "fnc", roles: ["fin", "exec", "plan", "audit"], label: ["Fisko Finance · ผูกพันและเบิกจ่าย", "Fisko Finance"],
    tabs: [["chain", ["สายงบประมาณถึงการจ่าย", "Allocation to payment"], "F1"], ["pay", ["ขออนุมัติเบิกจ่าย", "Payments"], "F2"], ["recon", ["กระทบยอด GFMIS", "GFMIS reconciliation"], "F3"]],
    tabGet: () => FIN_TAB, tabSet: v => (FIN_TAB = v) },
);
