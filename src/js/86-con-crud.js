// Procurement CRUD round PC3 (Fisko_Procurement_CRUD_Design.html chapter 6.4): P7 contracts on the shared list +
// drawer. A contract is created as a draft from a case at the contracting step, with the supplier fixed to the
// winner (R-PC-04) and a phase schedule that can be edited until it is signed (R-PC-05). Signing commits the
// allocation line and moves the case to step 9; a draft can be deleted. The open contract stays a full page (UI-PC2).
const CON_ST = { draft: [["ร่าง", "Draft"], "p-mute"], active: [["มีผล", "In force"], "p-ok"], closed: [["ปิด", "Closed"], "p-mute"], terminated: [["บอกเลิก", "Terminated"], "p-bad"] };
const conReady = () => S.cases.filter(cs => caseState(cs) === 8 && cs.award && !cs.draftCon);
const conCaseOf = c => caseByPlan(c.plan);
const conCapOf = cs => Math.min(cs.award.price, (caseReq(cs) || { amount: cs.award.price }).amount);
// The schedule a form describes: n phases, each with an amount and a due date (defaults: equal split, 45 days apart).
function conSched(v, r, amount, signed) {
  const n = Number(v.n || (r ? r.phases.length : 3)), share = amount / n;
  return Array.from({ length: n }, (_, i) => {
    const old = r && r.phases[i], a = v["a" + i] !== undefined && v["a" + i] !== "" ? v["a" + i] : old ? old.amount : i < n - 1 ? Math.round(share / 1e3) * 1e3 : amount - Math.round(share / 1e3) * 1e3 * (n - 1);
    return { amount: a, due: v["d" + i] || (old ? old.due : addDays(signed || TODAY, 45 * (i + 1))) };
  });
}
const conInspN = amount => (amount <= S.pcfg.singleInspectorMax ? 1 : 2);
CRUD.def("pcCon", {
  noun: ["สัญญา", "Contract"], st: CON_ST, live: true,
  list: () => S.contracts.slice().reverse(), id: c => c.id, title: c => tx(famPlan(c.plan).name), sub: c => `${esc(c.no)} · ${esc(tx(c.vendor))}`,
  status: c => c.status || "active", search: c => `${c.id} ${c.no} ${tx(c.vendor)} ${famPlan(c.plan).name.join(" ")}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(CON_ST).map(k => [k, tx(CON_ST[k][0])]), get: c => c.status || "active" }],
  cols: [{ h: ["สัญญา", "Contract"], c: c => `<span class="mono">${c.id}</span><div class="sub">${esc(c.no)}</div>` },
    { h: ["รายการ · คู่สัญญา", "Item · supplier"], c: c => `<b style="font-weight:600">${esc(tx(famPlan(c.plan).name))}</b><div class="sub">${esc(tx(c.vendor))}</div>` },
    { h: ["วงเงิน (ลบ.)", "Amount (M)"], n: true, c: c => mb(c.amount) },
    { h: ["ตรวจรับ", "Accepted"], c: c => { const live = c.phases.filter(ph => !ph.cancelled); return `${live.filter(phaseAccepted).length}/${live.length} ${L("งวด", "phases")}`; } },
    { h: ["งวดถัดไป", "Next phase"], c: c => { const nx = c.status === "active" && c.phases.find(ph => !ph.cancelled && !phaseAccepted(ph)); return nx ? `${tx(nx.name)} <div class="sub">${dueText(nx.due)}</div>` : "—"; } }],
  prefill: () => { const cs = caseOf(CT_FROM || "") || conReady()[0]; return cs ? { cs: cs.id } : null; },
  fields: (r, v) => {
    const P = famPeople().filter(u => u.id !== me().id && u.role !== "vendor"), active = r && r.status !== "draft";
    if (active) return [{ id: "_i", label: ["หมายเหตุ", "Note"], type: "info", wide: true, html: L("สัญญาที่ลงนามแล้วเปลี่ยนวงเงินหรือเวลาผ่าน “แก้ไขสัญญา” ในหน้าสัญญา ที่นี่เปลี่ยนได้เฉพาะกรรมการตรวจรับก่อนเริ่มลงนามตรวจรับ", "A signed contract changes amount or time through a contract change on its page; here only the acceptance committee can change, before anyone signs an acceptance") },
      ...P.map(u => ({ id: "i_" + u.id, label: [`${u.name[0]} · ${ROLES[u.role][0]}`, `${u.name[1]} · ${ROLES[u.role][1]}`], type: "check", value: r.inspectors.includes(u.id) }))];
    const cs = r ? conCaseOf(r) : caseOf(v.cs || "") || conReady()[0];
    if (!cs) return [{ id: "_n", label: ["แฟ้มจัดซื้อ", "Case file"], type: "info", wide: true, html: L("ยังไม่มีแฟ้มที่พร้อมทำสัญญา", "No case is ready for a contract") }];
    const cap = conCapOf(cs), amount = v.amount !== undefined && v.amount !== "" ? v.amount : r ? r.amount : cs.award.price, signed = v.signed || (r ? r.signed : TODAY);
    const sched = conSched(v, r, amount, signed), judges = caseJudges(cs), defs = r ? r.inspectors : [S.users.find(u => u.role === "plan" && u.primary), S.users.find(u => u.role === "div" && u.primary)].filter(Boolean).map(u => u.id).filter(id => !judges.includes(id));
    return [
      r ? { id: "cs", label: ["แฟ้มจัดซื้อ", "Case file"], lock: true, wide: true, value: cs.id, show: `<span class="mono">${cs.id}</span> ${esc(caseName(cs))}` }
        : { id: "cs", label: ["แฟ้มที่พร้อมทำสัญญา", "Case ready for a contract"], type: "select", req: true, wide: true, value: cs.id, opts: conReady().map(x => [x.id, `${x.id} · ${caseName(x)} · ${mb(x.award.price)}`]) },
      { id: "_v", label: ["คู่สัญญา (ผู้ชนะตามผลพิจารณา)", "Supplier (the winner)"], type: "info", wide: true, html: `<b>${esc(tx(cs.award.winner))}</b> <span class="sub">· ${L("ราคาที่ชนะ", "winning price")} ${fmt(cs.award.price)} ${L("บาท", "baht")}</span>` },
      { id: "no", label: ["เลขที่สัญญา", "Contract no."], req: true, value: r ? r.no : `${FAM_FY % 100}/${String(S.contracts.length + 1).padStart(3, "0")}` },
      { id: "signed", label: ["วันที่ลงนาม", "Signing date"], type: "date", req: true, value: signed },
      { id: "amount", label: ["วงเงินสัญญา (ล้านบาท)", "Contract amount (million baht)"], type: "money", req: true, min: 1000, max: cap, value: amount, hint: `${L("ไม่เกิน", "Up to")} ${mb(cap)} ${L("ลบ. (ราคาที่ชนะและวงเงินที่ขอ)", "M (winning price and requisition)")}` },
      { id: "war", label: ["รับประกันความชำรุด (เดือน)", "Warranty (months)"], type: "number", min: 0, value: r ? r.warrantyMonths || 0 : cs.kind === "service" ? 0 : S.pcfg.warrantyMonths },
      { id: "n", label: ["จำนวนงวด", "Phases"], type: "select", req: true, wide: true, value: String(sched.length), opts: [1, 2, 3, 4, 5, 6].map(x => [String(x), String(x)]) },
      ...sched.flatMap((s, i) => [{ id: "a" + i, label: [`งวดที่ ${i + 1}: ยอด (ล้านบาท)`, `Phase ${i + 1}: amount (million baht)`], type: "money", req: true, min: 1000, value: s.amount },
        { id: "d" + i, label: [`งวดที่ ${i + 1}: กำหนดส่งมอบ`, `Phase ${i + 1}: due`], type: "date", req: true, value: s.due }]),
      { id: "_s", label: ["ยอดงวดรวม", "Phases total"], type: "info", html: `${mb(sumv(sched.map(s => Number(s.amount) || 0)))} / ${mb(amount)} ${L("ลบ.", "M")}` },
      { id: "_c", label: ["คณะกรรมการตรวจรับ", "Acceptance committee"], type: "info", wide: true, html: `${L("อย่างน้อย", "At least")} ${conInspN(amount)} ${L("คน ไม่ซ้ำกรรมการพิจารณาผล (SD-06) และไม่ใช่ผู้จัดซื้อ (SD-02)", "people, none from the evaluation committee (SD-06) and not the buyer (SD-02)")}` },
      ...P.map(u => ({ id: "i_" + u.id, label: [`${u.name[0]} · ${ROLES[u.role][0]}${judges.includes(u.id) ? " (กรรมการพิจารณาผล)" : ""}`, `${u.name[1]} · ${ROLES[u.role][1]}${judges.includes(u.id) ? " (evaluation committee)" : ""}`], type: "check", value: v["i_" + u.id] !== undefined ? v["i_" + u.id] : defs.includes(u.id) })),
    ];
  },
  check: (v, r) => {
    const insp = Object.keys(v).filter(k => k.startsWith("i_") && v[k]).map(k => k.slice(2)), e = [];
    if (r && r.status !== "draft") { if (insp.length < conInspN(r.amount)) e.push({ f: null, m: L("กรรมการตรวจรับไม่ครบ", "Not enough acceptance committee members") });
      const rc = conCaseOf(r); if (rc && sodOn("SD-06") && insp.some(id => caseJudges(rc).includes(id))) e.push({ f: null, m: L("กรรมการตรวจรับซ้ำกับกรรมการพิจารณาผล (SD-06)", "An acceptance member sat on the evaluation committee (SD-06)") });
      return e; }
    const cs = r ? conCaseOf(r) : caseOf(v.cs); if (!cs) return [{ f: "cs", m: L("เลือกแฟ้ม", "Choose a case") }];
    if (!(v.amount > 0) || v.amount > conCapOf(cs)) e.push({ f: "amount", m: L("วงเงินต้องไม่เกินราคาที่ชนะและวงเงินที่ขอ", "Can't exceed the winning price or the requisition") });
    const sched = conSched(v, r, v.amount, v.signed);
    if (Math.abs(sumv(sched.map(s => Number(s.amount) || 0)) - v.amount) > 0.5) e.push({ f: null, m: L(`ยอดงวดรวม ${mb(sumv(sched.map(s => Number(s.amount) || 0)))} ลบ. ไม่เท่ากับวงเงินสัญญา ${mb(v.amount)} ลบ. (R-PC-05)`, `The phases add up to ${mb(sumv(sched.map(s => Number(s.amount) || 0)))} M, not the contract amount ${mb(v.amount)} M (R-PC-05)`) });
    sched.forEach((s, i) => { if (s.due < v.signed || (i && s.due < sched[i - 1].due)) e.push({ f: "d" + i, m: L("กำหนดส่งมอบต้องไม่ก่อนวันลงนามและเรียงตามงวด", "Due dates follow the signing date and each other") }); });
    if (insp.length < conInspN(v.amount)) e.push({ f: null, m: L(`ต้องมีกรรมการตรวจรับอย่างน้อย ${conInspN(v.amount)} คน`, `Choose at least ${conInspN(v.amount)} acceptance committee members`) });
    if (insp.some(id => caseJudges(cs).includes(id)) && sodOn("SD-06")) e.push({ f: null, m: L("กรรมการตรวจรับซ้ำกับกรรมการพิจารณาผล (SD-06)", "An acceptance member sat on the evaluation committee (SD-06)") });
    if (blBlocked(cs, tx(cs.award.winner))) e.push({ f: null, m: L("คู่สัญญาอยู่ในรายชื่อผู้ทิ้งงาน (R-17)", "The supplier is on the abandoned-work list (R-17)") });
    return e;
  },
  create: { can: () => isProcRole() && conReady().length > 0, label: ["สร้างร่างสัญญา", "Draft a contract"], run: v => {
    const cs = caseOf(v.cs), rq = caseReq(cs), p = famPlan(cs.plan), insp = Object.keys(v).filter(k => k.startsWith("i_") && v[k]).map(k => k.slice(2)), need = Math.min(2, insp.length);
    const phases = conSched(v, null, v.amount, v.signed).map((s, i) => ({ n: i + 1, name: [`งวดที่ ${i + 1}`, `Phase ${i + 1}`], due: s.due, amount: s.amount, signs: [], need }));
    const c = { id: nextId("CT", S.contracts), reqn: rq.id, plan: p.id, line: p.line, vendor: [tx(cs.award.winner), tx(cs.award.winner)], no: v.no, signed: v.signed, amount: v.amount, by: me().id, inspectors: insp, status: "draft", phases,
      base: v.amount, ver: 1, versions: [{ v: 1, amount: v.amount, t: nowIso(), by: me().id, why: "" }], vars: [], guarantee: null, warrantyMonths: Math.max(0, Math.round(v.war || 0)),
      supervision: cs.kind === "construction" ? { who: "", reports: [], assess: [] } : null, defects: [], letters: [] };
    S.contracts.push(c); cs.draftCon = c.id; CT_FROM = null; caseLog(cs, "contract_draft", c.id); audit(["ร่างสัญญา", "Drafted a contract"], `${c.id} ${cs.id}`); return c; } },
  edit: { can: c => isProcRole() && (c.status === "draft" || (c.status === "active" && !c.phases.some(ph => ph.signs.length))), run: (c, v) => {
    const insp = Object.keys(v).filter(k => k.startsWith("i_") && v[k]).map(k => k.slice(2)), need = Math.min(2, insp.length);
    if (c.status === "draft") {
      const sched = conSched(v, c, v.amount, v.signed);
      Object.assign(c, { no: v.no, signed: v.signed, amount: v.amount, base: v.amount, warrantyMonths: Math.max(0, Math.round(v.war || 0)), inspectors: insp });
      c.versions = [{ v: 1, amount: v.amount, t: nowIso(), by: me().id, why: "" }];
      c.phases = sched.map((s, i) => ({ n: i + 1, name: [`งวดที่ ${i + 1}`, `Phase ${i + 1}`], due: s.due, amount: s.amount, signs: [], need }));
    } else { c.inspectors = insp; c.phases.filter(ph => !phaseAccepted(ph)).forEach(ph => (ph.need = need)); }
    audit(["แก้ไขสัญญา", "Edited a contract"], `${c.id}${c.status === "draft" ? ` · ${mb(c.amount)} · ${c.phases.length}` : ""}`); } },
  acts: c => {
    if (!isProcRole() || c.status !== "draft") return [];
    const cs = conCaseOf(c);
    return [{ id: "sign", label: L("บันทึกการลงนาม", "Record the signing"), kind: "primary", impact: () => L(`ผูกพันวงเงิน ${mb(c.amount)} ลบ. บนรายการจัดสรร แฟ้มไปขั้นบริหารสัญญา แก้งวดได้ผ่านการแก้ไขสัญญาเท่านั้น`, `Commits ${mb(c.amount)} M on the allocation line; the case moves to contract management; phases change only through contract changes`), run: () => {
        if (c.signed > TODAY) { toast(L("วันที่ลงนามยังไม่ถึง แก้วันที่ก่อน", "The signing date is in the future; change it first")); return ""; }
        const rq = famReq(c.reqn), p = famPlan(c.plan); c.status = "active"; c.signedBy = me().id; if (cs) { cs.draftCon = null; caseOnContract(cs, c); } if (rq) rq.status = "contracted"; p.status = "contracted";
        audit(["ลงนามสัญญา", "Signed a contract"], `${c.id} ${c.no}`); notify(["fin", "exec"], [`สัญญา ${c.id} ผูกพันวงเงิน ${mb(c.amount)} ล้านบาท`, `Contract ${c.id} commits ${mb(c.amount)} M`], "fnc-chain"); return L("ลงนามแล้ว · ผูกพันวงเงินแล้ว", "Signed · the line is committed"); } },
      { id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", confirm: L("ลบร่างสัญญานี้ แฟ้มกลับไปขั้นทำสัญญา เลขที่จะไม่ถูกนำกลับมาใช้", "Delete this draft. The case goes back to the contracting step; the number is not reused."), run: () => {
        S.contracts = S.contracts.filter(x => x !== c); if (cs) cs.draftCon = null; pcDel(c.id); audit(["ลบร่างสัญญา", "Deleted a draft contract"], c.id); return L("ลบแล้ว", "Deleted"); } }];
  },
  view: c => {
    const cs = conCaseOf(c), gs = guarSt(c);
    return kv([[L("คู่สัญญา", "Supplier"), esc(tx(c.vendor))], [L("เลขที่สัญญา", "Contract no."), esc(c.no)], [c.status === "draft" ? L("กำหนดลงนาม", "To be signed") : L("ลงนาม", "Signed"), fdate(c.signed)],
      [L("วงเงิน", "Amount"), `${fmt(c.amount)} ${L("บาท", "baht")}${c.base && c.base !== c.amount ? ` <span class="sub">(${L("เดิม", "was")} ${fmt(c.base)})</span>` : ""}`], [L("กรรมการตรวจรับ", "Acceptance committee"), c.inspectors.map(u => esc(userName(u))).join(", ")],
      c.status !== "draft" && [L("หลักประกัน", "Guarantee"), tag(tx(GUAR_TAG[gs][0]), GUAR_TAG[gs][1])], cs && [L("แฟ้มจัดซื้อ", "Case file"), `<span class="mono">${cs.id}</span> · ${L("ขั้น", "step")} ${caseState(cs)}`]])
      + `<div class="tbl-wrap"><table><thead><tr><th>${L("งวด", "Phase")}</th><th>${L("กำหนดส่งมอบ", "Due")}</th><th class="n">${L("ยอด (บาท)", "Amount (baht)")}</th><th>${L("สถานะ", "Status")}</th></tr></thead><tbody>${c.phases.map(ph => `<tr><td>${tx(ph.name)}</td><td class="sub">${fdate(ph.due)}</td><td class="n">${fmt(ph.amount)}</td><td class="sub">${ph.cancelled ? L("ยกเลิก", "Cancelled") : phPaid(c, ph) ? L("จ่ายแล้ว", "Paid") : phaseAccepted(ph) ? L("ตรวจรับแล้ว", "Accepted") : ph.delivered ? L("ส่งมอบแล้ว", "Delivered") : L("รอส่งมอบ", "Waiting")}</td></tr>`).join("")}</tbody></table></div>`
      + (c.status !== "draft" ? `<div class="row"><button class="btn primary" type="button" data-conopen="${c.id}">${L("เปิดสัญญา", "Open the contract")}</button></div>` : "");
  },
  hist: c => c.id,
});
PROC.conCreate = () => "";
PROC.conList = () => crudList("pcCon", { head: `<h2>${L("สัญญา", "Contracts")}</h2><span class="sp"></span><span class="sub">${L("ร่างสัญญาจากแฟ้มที่ถึงขั้นทำสัญญา แก้งวดได้จนลงนาม", "Draft from a case at the contracting step; phases can change until signed")}</span>`,
  empty: L("ยังไม่มีสัญญา · แฟ้มที่ประกาศผู้ชนะและพ้นกำหนดอุทธรณ์แล้วสร้างร่างสัญญาได้", "No contracts yet · cases with a winner and a finished appeal period can draft one") });
Object.assign(CASE_EV, { contract_draft: ["ร่างสัญญา", "Contract drafted"] });
