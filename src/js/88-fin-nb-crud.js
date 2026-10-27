// Finance CRUD round FC6 (Fisko_Finance_CRUD_Design.html, chapters 6.9 and 6.11): non-budget money (F11) and saved
// what-ifs (F9) on the shared list.
// - Funds (FR-FC-48): add, rename, set the brought-forward balances until money moves, close an empty fund, delete one
//   never used.
// - Spending plans (FR-FC-49): lines are edited and deleted while the plan is a draft or returned; a submitted plan can
//   be withdrawn; an approved plan is amended as a new version, and the approved one stays in force (R-FN-07 keeps
//   reading it) until the amendment is approved. The approver is checked by SD-11 (FC-P5).
// - Treasury withdrawals (FR-FC-50): edited or withdrawn while pending; a refusal needs a reason and SD-11; unspent
//   money is deposited back at any time.
// - What-ifs (FR-FC-42): open a saved scenario back into the levers, rename it, change its levers, delete it.
const nbHead = () => canSpend() && ROLE !== "fin" && ROLE !== "finhead";
const nbMoved = f => (S.receipts || []).some(r => r.fund === f.id) || (S.nbWd || []).some(w => w.fund === f.id) || (S.vouchers || []).some(v => v.fund === f.id) || (S.advances || []).some(a => a.fund === f.id) || (S.nbPlans || []).some(p => p.fund === f.id && !p.deleted);

// ---------- funds ----------
CRUD.def("fnFund", {
  noun: ["กองทุนเงินนอกงบประมาณ", "Non-budget fund"], st: { on: [["ใช้งาน", "Active"], "p-ok"], off: [["ปิดกองทุน", "Closed"], "p-mute"] }, list: () => (S.nbFunds = S.nbFunds || []).filter(f => !f.deleted), id: f => f.id, title: f => tx(f.name), sub: f => esc(tx(f.basis)),
  status: f => (f.closed ? "off" : "on"), gone: f => !!f.closed, search: f => `${f.id} ${f.name.join(" ")} ${f.basis.join(" ")}`,
  cols: [{ h: ["กองทุน", "Fund"], sort: f => f.id, c: f => `<span class="mono">${f.id}</span> <b style="font-weight:600">${esc(tx(f.name))}</b><div class="sub">${esc(tx(f.basis))}</div>` },
    { h: ["รับเข้า", "In"], n: true, c: f => fmt(nbBal(f).income) }, { h: ["จ่ายไป", "Out"], n: true, c: f => fmt(nbBal(f).spent) },
    { h: ["ฝากคลัง", "Treasury"], n: true, sort: f => nbBal(f).treasury, c: f => fmt(nbBal(f).treasury) }, { h: ["ในบัญชี", "Account"], n: true, sort: f => nbBal(f).agency, c: f => fmt(nbBal(f).agency) },
    { h: ["แผนปีนี้", "This year's plan"], c: f => { const p = nbPlan(f.id); return p && !p.deleted ? stTag(NBP_ST, p.status) : tag(L("ยังไม่มีแผน", "No plan"), "p-warn"); } }],
  fields: f => { const moved = f && nbMoved(f);
    return [{ id: "th", label: ["ชื่อกองทุน (ไทย)", "Fund name (Thai)"], req: true, wide: true, value: f ? f.name[0] : "" }, { id: "en", label: ["ชื่อกองทุน (อังกฤษ)", "Fund name (English)"], wide: true, value: f ? f.name[1] : "" },
      { id: "basis", label: ["กฎหมายหรือมติที่ให้เก็บไว้ใช้จ่ายได้", "Law or resolution that lets the agency keep it"], req: true, wide: true, value: f ? f.basis[0] : "" },
      { id: "openA", label: ["ยกมา: บัญชีหน่วยงาน (บาท)", "Brought forward: agency account (baht)"], type: "number", min: 0, value: f ? f.openA : 0, lock: moved, show: f && fmt(f.openA), hint: moved ? L("มีรายการเคลื่อนไหวแล้ว แก้ยอดยกมาไม่ได้", "Money has moved; the brought-forward balance can't change") : "" },
      { id: "openT", label: ["ยกมา: ฝากคลัง (บาท)", "Brought forward: treasury deposit (baht)"], type: "number", min: 0, value: f ? f.openT : 0, lock: moved, show: f && fmt(f.openT) }]; },
  create: { can: () => isFinRole(), label: ["เพิ่มกองทุน", "Add a fund"], run: v => {
    const F = S.nbFunds = S.nbFunds || [], f = { id: `NB-${pad2(maxNo(F.map(x => x.id), /^NB-(\d+)/) + 1)}`, name: [v.th, v.en || v.th], basis: [v.basis, v.basis], openA: Number(v.openA) || 0, openT: Number(v.openT) || 0, by: me().id, t: nowIso() };
    F.push(f); audit(["เพิ่มกองทุนเงินนอกงบประมาณ", "Added a non-budget fund"], `${f.id} · ${v.th}`); return f; } },
  edit: { can: f => isFinRole() && !f.closed, run: (f, v) => { f.name = [v.th, v.en || v.th]; f.basis = [v.basis, v.basis]; if (!nbMoved(f)) { f.openA = Number(v.openA) || 0; f.openT = Number(v.openT) || 0; } audit(["แก้ไขกองทุนเงินนอกงบประมาณ", "Edited a non-budget fund"], f.id); } },
  acts: f => { if (!isFinRole() || f.closed) return []; const b = nbBal(f);
    return [!nbMoved(f) && { id: "del", label: L("ลบกองทุนที่บันทึกผิด", "Delete (entered by mistake)"), kind: "danger", why: true, run: (_, why) => { f.deleted = { by: me().id, t: nowIso(), why }; audit(["ลบกองทุนเงินนอกงบประมาณ", "Deleted a non-budget fund"], `${f.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } },
      nbMoved(f) && b.total === 0 && { id: "close", label: L("ปิดกองทุน", "Close the fund"), kind: "danger", why: true, impact: () => L("ยอดคงเหลือเป็นศูนย์ ไม่รับหรือจ่ายเพิ่ม รายการเดิมยังดูได้", "Its balance is zero; nothing more comes in or goes out; its records stay"),
        run: (_, why) => { f.closed = { by: me().id, t: nowIso(), why }; audit(["ปิดกองทุนเงินนอกงบประมาณ", "Closed a non-budget fund"], `${f.id} · ${why}`); return L("ปิดแล้ว", "Closed"); } }]; },
  view: f => { const b = nbBal(f); return kv([[L("ฐานอำนาจ", "Basis"), esc(tx(f.basis))], [L("ยกมา 1 ต.ค.", "Brought forward 1 Oct"), `${L("บัญชี", "account")} ${fmt(f.openA)} · ${L("คลัง", "treasury")} ${fmt(f.openT)}`],
    [L("คงเหลือ", "Balance"), `${L("ฝากคลัง", "treasury")} ${fmt(b.treasury)} · ${L("ในบัญชี", "account")} ${fmt(b.agency)} · ${L("รวม", "total")} ${fmt(b.total)}`], f.closed && [L("ปิด", "Closed"), `${esc(userName(f.closed.by))} · ${esc(f.closed.why)}`]]); },
  tabs: f => [["mv", L("รายการเคลื่อนไหว", "Movements"), nbStatement(f)]],
  hist: f => f.id,
});
FS.nbFunds = () => crudList("fnFund", { head: `<h2>${L("กองทุนเงินนอกงบประมาณ", "Non-budget funds")}</h2><span class="sp"></span><span class="sub">${L("เก็บไว้ใช้จ่ายได้ตามกฎหมาย ไม่ต้องนำส่งคลัง (ข้อ 4)", "Kept and spent under the law; not remitted (clause 4)")}</span>`, empty: L("ยังไม่มีกองทุน", "No funds yet") });

// ---------- spending plans ----------
const nbTarget = p => (p.status === "approved" && p.amend ? p.amend : p);
const nbOpenSt = t => ["draft", "returned"].includes(t.status);
const nbPlanSt = p => (p.status === "approved" && p.amend ? `amend_${p.amend.status}` : p.status);
const NBP_ST2 = Object.assign({}, NBP_ST, { amend_draft: [["อนุมัติแล้ว · กำลังปรับแผน", "Approved · amendment drafted"], "p-info"], amend_submitted: [["อนุมัติแล้ว · การปรับรออนุมัติ", "Approved · amendment waiting"], "p-warn"], amend_returned: [["อนุมัติแล้ว · การปรับถูกส่งกลับ", "Approved · amendment returned"], "p-bad"], gone: [["ลบแล้ว", "Deleted"], "p-mute"] });
const nbPlLog = (p, act, note) => (p.log = p.log || []).push({ t: nowIso(), by: me().id, role: ROLE, act, note: note || "" });
CRUD.def("fnPlan", {
  noun: ["แผนการใช้จ่ายเงินนอกงบประมาณ", "Non-budget spending plan"], st: NBP_ST2, list: () => (S.nbPlans = S.nbPlans || []).filter(p => p.fy === FAM_FY), id: p => p.id, title: p => `${p.fund} · ${tx((nbFund(p.fund) || { name: ["", ""] }).name)}`, sub: p => `${fyLabel(p.fy)} · ${p.lines.length} ${L("รายการ", "lines")}`,
  status: p => (p.deleted ? "gone" : nbPlanSt(p)), gone: p => !!p.deleted, search: p => `${p.id} ${p.fund} ${p.lines.map(l => tx(l.name)).join(" ")}`,
  cols: [{ h: ["แผน", "Plan"], sort: p => p.id, c: p => `<span class="mono">${p.id}</span> · <span class="mono">${p.fund}</span> ${esc(tx((nbFund(p.fund) || { name: ["", ""] }).name))}` },
    { h: ["วงเงิน", "Planned"], n: true, c: p => fmt(sumv(p.lines.map(l => l.amount))) }, { h: ["ใช้ไป", "Used"], n: true, c: p => fmt(nbUsed(p.fund)) }, { h: ["คาดรายรับ", "Income expected"], n: true, c: p => fmt(p.income) }],
  fields: (p, v) => {
    if (!p) return [{ id: "fund", label: ["กองทุน", "Fund"], type: "select", req: true, value: "", blank: L("— เลือกกองทุน —", "— choose a fund —"), opts: nbFunds().filter(f => !f.closed && !f.deleted && !(S.nbPlans || []).some(x => x.fund === f.id && x.fy === FAM_FY && !x.deleted)).map(f => [f.id, `${f.id} · ${tx(f.name)}`]) },
      { id: "income", label: ["คาดรายรับทั้งปี (บาท)", "Income expected for the year (baht)"], type: "number", min: 0, value: 0 }];
    const t = nbTarget(p);
    return [{ id: "income", label: ["คาดรายรับทั้งปี (บาท)", "Income expected for the year (baht)"], type: "number", min: 0, value: t.income },
      ...t.lines.flatMap(l => { const u = nbUsed(p.fund, l.id);
        return [{ id: "_" + l.id, label: [l.id, l.id], type: "info", wide: true, html: `<b style="font-weight:600">${l.id}</b> <span class="sub">${L("ใช้ไป", "used")} ${fmt(u)}</span>` },
          { id: "n_" + l.id, label: ["รายการ", "Line"], req: true, value: tx(l.name) }, { id: "c_" + l.id, label: ["หมวด", "Category"], type: "select", value: l.cat, opts: Object.keys(NB_CAT).map(k => [k, tx(NB_CAT[k])]) },
          { id: "a_" + l.id, label: ["วงเงิน (บาท)", "Amount (baht)"], type: "number", req: true, min: u, value: l.amount, hint: u ? `${L("ไม่ต่ำกว่าที่ใช้ไป", "Not below what is used")} ${fmt(u)}` : "" },
          ...(u ? [] : [{ id: "x_" + l.id, label: ["ลบรายการนี้", "Delete this line"], type: "check", value: false }])]; }),
      { id: "_new", label: ["รายการใหม่", "New line"], type: "info", wide: true, html: `<span class="sub">${L("เว้นว่างถ้าไม่เพิ่ม", "Leave empty to add none")}</span>` },
      { id: "n_new", label: ["รายการ", "Line"], value: "" }, { id: "c_new", label: ["หมวด", "Category"], type: "select", value: "ope", opts: Object.keys(NB_CAT).map(k => [k, tx(NB_CAT[k])]) }, { id: "a_new", label: ["วงเงิน (บาท)", "Amount (baht)"], type: "number", min: 0, value: "" }];
  },
  check: (v, p) => { if (!p) return []; const t = nbTarget(p), e = [];
    t.lines.forEach(l => { const u = nbUsed(p.fund, l.id); if (Number(v["a_" + l.id]) < u) e.push({ f: "a_" + l.id, m: `${L("ไม่ต่ำกว่าที่ใช้ไป", "Not below what is used")} ${fmt(u)}` }); });
    if ((v.n_new || "") !== "" && !(Number(v.a_new) > 0)) e.push({ f: "a_new", m: L("ใส่วงเงินของรายการใหม่", "Give the new line an amount") });
    if (t.lines.every(l => v["x_" + l.id]) && !v.n_new) e.push({ f: null, m: L("แผนต้องมีอย่างน้อยหนึ่งรายการ", "A plan needs at least one line") });
    return e; },
  create: { can: () => ROLE === "fin" && nbFunds().some(f => !f.closed && !(S.nbPlans || []).some(x => x.fund === f.id && x.fy === FAM_FY && !x.deleted)), label: ["ทำแผน", "Start a plan"], run: v => {
    const P = S.nbPlans = S.nbPlans || [], p = { id: `NP-${FAM_FY}-${pad2(maxNo(P.map(x => x.id), new RegExp(`^NP-${FAM_FY}-(\\d+)`)) + 1)}`, fund: v.fund, fy: FAM_FY, income: Number(v.income) || 0, lines: [], status: "draft", by: me().id, t: nowIso(), log: [] };
    P.push(p); nbPlLog(p, "create"); audit(["เริ่มแผนเงินนอกงบประมาณ", "Started a non-budget plan"], `${p.id} · ${p.fund}`); return p; } },
  edit: { can: p => ROLE === "fin" && !p.deleted && nbOpenSt(nbTarget(p)), label: p => (p.amend ? ["แก้การปรับแผน", "Edit the amendment"] : ["แก้ไขแผนและรายการ", "Edit the plan and lines"]), run: (p, v) => {
    const t = nbTarget(p);
    t.lines = t.lines.filter(l => !v["x_" + l.id]).map(l => Object.assign({}, l, { name: [v["n_" + l.id], v["n_" + l.id]], cat: v["c_" + l.id], amount: Math.round(Number(v["a_" + l.id])) }));
    if (v.n_new) { const all = p.lines.concat(t.lines, p.amend ? p.amend.lines : []); t.lines.push({ id: `${p.fund}-${maxNo(all.map(l => l.id), new RegExp(`^${p.fund}-(\\d+)`)) + 1}`, name: [v.n_new, v.n_new], cat: v.c_new, amount: Math.round(Number(v.a_new)) }); }
    t.income = Math.round(Number(v.income) || 0); nbPlLog(p, p.amend ? "amend-edit" : "edit");
    audit([p.amend ? "แก้การปรับแผนเงินนอกงบประมาณ" : "แก้ไขแผนเงินนอกงบประมาณ", p.amend ? "Edited a plan amendment" : "Edited a non-budget plan"], `${p.id} · ${fmt(sumv(t.lines.map(l => l.amount)))}`); } },
  acts: p => {
    if (p.deleted) return [];
    const t = nbTarget(p), out = [], am = !!(p.status === "approved" && p.amend);
    if (ROLE === "fin") {
      if (nbOpenSt(t) && t.lines.length) out.push({ id: "sub", label: am ? L("เสนอการปรับแผน", "Send the amendment") : L("เสนอหัวหน้าส่วนราชการอนุมัติ", "Send to the head of the agency"), kind: "primary", confirm: L(`วงเงินรวม ${fmt(sumv(t.lines.map(l => l.amount)))} บาท`, `Total ${fmt(sumv(t.lines.map(l => l.amount)))} baht`),
        run: () => { t.status = "submitted"; t.note = ""; nbPlLog(p, am ? "amend-submit" : "submit"); audit(["เสนอแผนเงินนอกงบประมาณ", "Sent a non-budget plan for approval"], `${p.id}${am ? " · amendment" : ""}`); notify(["exec"], [`แผนการใช้จ่ายเงินนอกงบประมาณ ${p.id}${am ? " (ปรับแผน)" : ""} รออนุมัติ`, `Non-budget plan ${p.id}${am ? " (amendment)" : ""} is waiting for approval`], "fnc-nb:plans"); return L("ส่งแล้ว", "Sent"); } });
      if (t.status === "submitted") out.push({ id: "wd", label: L("ถอนกลับมาแก้ไข", "Withdraw to edit"), why: true, run: (_, why) => { t.status = "draft"; nbPlLog(p, "withdraw", why); audit(["ถอนแผนเงินนอกงบประมาณ", "Withdrew a non-budget plan"], `${p.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
      if (p.status === "approved" && !p.amend) out.push({ id: "amend", label: L("ปรับแผน", "Amend the plan"), why: true, impact: () => L("ทำฉบับใหม่จากแผนที่อนุมัติ แผนเดิมยังใช้จ่ายได้จนกว่าฉบับใหม่ได้รับอนุมัติ", "Starts a new version from the approved plan; the approved one stays in force until the new one is approved"),
        run: (_, why) => { p.amend = { lines: p.lines.map(l => Object.assign({}, l)), income: p.income, status: "draft", by: me().id, t: nowIso(), why }; nbPlLog(p, "amend", why); audit(["เริ่มปรับแผนเงินนอกงบประมาณ", "Started amending a non-budget plan"], `${p.id} · ${why}`); return L("เริ่มปรับแผนแล้ว แก้รายการแล้วเสนอ", "Amendment started · edit the lines, then send it"); } });
      if (am && nbOpenSt(p.amend)) out.push({ id: "drop", label: L("ยกเลิกการปรับแผน", "Drop the amendment"), kind: "danger", why: true, run: (_, why) => { delete p.amend; nbPlLog(p, "amend-drop", why); audit(["ยกเลิกการปรับแผนเงินนอกงบประมาณ", "Dropped a plan amendment"], `${p.id} · ${why}`); return L("ยกเลิกแล้ว แผนที่อนุมัติยังใช้อยู่", "Dropped · the approved plan stays"); } });
      if (p.status === "draft" && !(p.log || []).some(l => l.act === "submit")) out.push({ id: "del", label: L("ลบแผนร่าง", "Delete the draft"), kind: "danger", why: true, run: (_, why) => { p.deleted = { by: me().id, t: nowIso(), why }; audit(["ลบแผนเงินนอกงบประมาณที่เป็นร่าง", "Deleted a draft non-budget plan"], `${p.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } });
    }
    if (nbHead() && t.status === "submitted") out.push(
      { id: "ok", label: am ? L("อนุมัติการปรับแผน", "Approve the amendment") : L("อนุมัติแผน", "Approve the plan"), kind: "primary", undo: false,
        run: () => { if (!sodCheck("SD-11", sodActors("exec", "spend"), [p.by, am ? p.amend.by : null].filter(Boolean), p.id)) return null;
          if (am) { (p.versions = p.versions || []).push({ lines: p.lines, income: p.income, approved: p.approved }); p.lines = p.amend.lines; p.income = p.amend.income; delete p.amend; }
          p.status = "approved"; p.approved = { by: me().id, t: nowIso() }; nbPlLog(p, am ? "amend-approve" : "approve");
          audit([am ? "อนุมัติการปรับแผนเงินนอกงบประมาณ" : "อนุมัติแผนเงินนอกงบประมาณ", am ? "Approved a plan amendment" : "Approved a non-budget plan"], p.id); notify(["fin"], [`แผน ${p.id} อนุมัติแล้ว`, `Plan ${p.id} is approved`], "fnc-nb:plans"); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "ret", label: L("ส่งกลับแก้ไข", "Return"), kind: "danger", why: true, run: (_, why) => { if (!sodCheck("SD-11", sodActors("exec", "spend"), [p.by], p.id)) return null; t.status = "returned"; t.note = why; nbPlLog(p, am ? "amend-return" : "return", why); audit(["ส่งแผนเงินนอกงบประมาณกลับ", "Returned a non-budget plan"], `${p.id} · ${why}`); notify(["fin"], [`แผน ${p.id} ถูกส่งกลับ: ${why}`, `Plan ${p.id} was returned: ${why}`], "fnc-nb:plans"); return L("ส่งกลับแล้ว", "Returned"); } });
    return out;
  },
  view: p => { const lt = (ls, cmp) => `<div class="tbl-wrap"><table><thead><tr><th>${L("รายการ", "Line")}</th><th>${L("หมวด", "Category")}</th><th class="n">${L("วงเงิน", "Planned")}</th><th class="n">${L("ใช้ไป", "Used")}</th><th class="n">${L("คงเหลือ", "Left")}</th></tr></thead>
      <tbody>${ls.map(l => { const u = nbUsed(p.fund, l.id), o = cmp && cmp.find(x => x.id === l.id); return `<tr><td><span class="mono sub">${l.id}</span> ${esc(tx(l.name))}${cmp && !o ? ` ${tag(L("ใหม่", "New"), "p-info")}` : ""}</td><td class="sub">${tx(NB_CAT[l.cat])}</td><td class="n">${fmt(l.amount)}${o && o.amount !== l.amount ? `<div class="sub">${L("เดิม", "was")} ${fmt(o.amount)}</div>` : ""}</td><td class="n">${fmt(u)}</td><td class="n">${fmt(l.amount - u)}</td></tr>`; }).join("") || `<tr><td colspan="5" class="sub">${L("ยังไม่มีรายการ แก้ไขแผนเพื่อเพิ่ม", "No lines yet; edit the plan to add them")}</td></tr>`}</tbody></table></div>`;
    return `${lt(p.lines)}${p.amend ? `<h3 style="font-size:14px;margin:12px 0 4px">${L("การปรับแผน (ยังไม่มีผล)", "Amendment (not in force yet)")} · ${tx(NBP_ST[p.amend.status][0])}</h3><p class="sub">${esc(p.amend.why || "")}</p>${lt(p.amend.lines, p.lines)}` : ""}
      ${kv([[L("คาดรายรับ", "Income expected"), fmt(p.income)], p.approved && [L("อนุมัติโดย", "Approved by"), `${esc(userName(p.approved.by))} · ${fdate(p.approved.t, true)}`], nbTarget(p).note && [L("เหตุผลที่ส่งกลับ", "Returned because"), esc(nbTarget(p).note)], (p.versions || []).length && [L("ฉบับก่อนหน้า", "Earlier versions"), `${p.versions.length}`]])}
      <p class="sub">${L("จ่ายจากเงินนอกงบประมาณได้เฉพาะรายการในแผนที่อนุมัติแล้วและไม่เกินวงเงิน (R-FN-07)", "Non-budget money is spent only on lines of an approved plan, within their amounts (R-FN-07)")}</p>`; },
  hist: p => p.id,
});
FS.nbPlans = () => crudList("fnPlan", { head: `<h2>${L("แผนการใช้จ่ายเงินนอกงบประมาณ", "Non-budget spending plans")} ${fyLabel(FAM_FY)}</h2><span class="sp"></span><span class="sub">${L("หัวหน้าส่วนราชการอนุมัติ (ข้อ 60)", "Approved by the head of the agency (clause 60)")}</span>`, empty: L("ยังไม่มีแผน", "No plans yet") });

// ---------- treasury withdrawals ----------
const NBW_ST2 = Object.assign({}, NBW_ST, { withdrawn: [["ถอนคำขอ", "Request withdrawn"], "p-mute"] });
const nbWdLeft = f => { const p = nbPlan(f.id); return p ? sumv(p.lines.map(l => l.amount)) - nbUsed(f.id) : 0; };
CRUD.def("fnWd", {
  noun: ["ถอนเงินฝากคลัง", "Treasury withdrawal"], st: NBW_ST2, list: () => (S.nbWd = S.nbWd || []), id: w => w.id, title: w => `${w.id} · ${fmt(w.amount)} ${L("บาท", "baht")}`, sub: w => `${w.fund} · ${esc(w.why)}`,
  status: w => w.status, gone: w => ["withdrawn", "rejected"].includes(w.status), search: w => `${w.id} ${w.fund} ${w.why}`,
  cols: [{ h: ["เลขที่", "No."], sort: w => w.id, c: w => `<span class="mono">${w.id}</span>` }, { h: ["กองทุน / ใช้จ่ายสำหรับ", "Fund / to pay for"], c: w => `<span class="mono">${w.fund}</span> ${esc(tx((nbFund(w.fund) || { name: ["", ""] }).name))}<div class="sub">${esc(w.why)}</div>` },
    { h: ["บาท", "Baht"], n: true, sort: w => w.amount, c: w => fmt(w.amount) },
    { h: ["จ่ายหรือฝากคืนภายใน", "Pay or deposit back by"], c: w => { if (w.status !== "done") return "—"; const due = addWorkdays(w.done.t.slice(0, 10), fcfg().refundDays), used = nbWdUsed(w); return used >= w.amount ? `${dotI("ok")}<span class="sub">${L("จ่ายครบแล้ว", "All paid out")}</span>` : `${dotI(clockDot(due))}${clockTxt(due)}<div class="sub">${L("ยังไม่ได้จ่าย", "not paid yet")} ${fmt(w.amount - used)}</div>`; } }],
  fields: w => [
    { id: "fund", label: ["กองทุน", "Fund"], type: "select", req: true, value: w ? w.fund : "", lock: !!w, show: w && w.fund, blank: L("— เลือกกองทุน —", "— choose a fund —"), opts: nbFunds().filter(f => !f.closed && nbPlan(f.id) && nbPlan(f.id).status === "approved").map(f => [f.id, `${f.id} · ${tx(f.name)} · ${L("ฝากคลัง", "treasury")} ${fmt(nbBal(f).treasury)} · ${L("แผนคงเหลือ", "plan left")} ${fmt(nbWdLeft(f))}`]) },
    { id: "amount", label: ["จำนวน (บาท)", "Amount (baht)"], type: "number", req: true, min: 1, value: w ? w.amount : "" },
    { id: "why", label: ["ใช้จ่ายสำหรับ", "To pay for"], req: true, wide: true, value: w ? w.why : "" }],
  check: (v, w) => { const f = nbFund(v.fund || (w && w.fund)); if (!f) return [];
    const b = nbBal(f), left = nbWdLeft(f), a = Number(v.amount);
    return [a > b.treasury && { f: "amount", m: L(`ถอนได้ไม่เกินยอดฝากคลัง ${fmt(b.treasury)} บาท`, `At most the treasury balance, ${fmt(b.treasury)} baht`) }, a > left && { f: "amount", m: L(`เกินวงเงินคงเหลือของแผน ${fmt(left)} บาท (R-FN-07)`, `More than the plan has left, ${fmt(left)} baht (R-FN-07)`) }].filter(Boolean); },
  create: { can: () => ROLE === "fin" && nbFunds().some(f => nbPlan(f.id) && nbPlan(f.id).status === "approved"), label: ["ขอถอนเงินฝากคลัง", "Ask to withdraw"], run: v => {
    const W = S.nbWd = S.nbWd || [], w = { id: `WD-${FAM_FY}-${pad2(maxNo(W.map(x => x.id), new RegExp(`^WD-${FAM_FY}-(\\d+)`)) + 1)}`, fund: v.fund, amount: Math.round(Number(v.amount)), why: v.why, status: "pending", by: me().id, t: nowIso(), done: null };
    W.push(w); audit(["ขอถอนเงินฝากคลัง (เงินนอกงบประมาณ)", "Asked to withdraw non-budget money from the treasury"], `${w.id} · ${fmt(w.amount)}`);
    notify(["exec"], [`ขอถอนเงินฝากคลัง ${w.id} ${fmt(w.amount)} บาท รออนุมัติ`, `Treasury withdrawal ${w.id} (${fmt(w.amount)} baht) is waiting for approval`], "fnc-nb:wd"); return w; } },
  edit: { can: w => ROLE === "fin" && w.status === "pending", run: (w, v) => { const old = w.amount; w.amount = Math.round(Number(v.amount)); w.why = v.why; audit(["แก้คำขอถอนเงินฝากคลัง", "Changed a withdrawal request"], `${w.id} · ${fmt(old)} → ${fmt(w.amount)}`); } },
  acts: w => {
    const out = [];
    if (ROLE === "fin" && w.status === "pending") out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw the request"), kind: "danger", why: true, run: (_, why) => { w.status = "withdrawn"; w.withdrawn = { by: me().id, t: nowIso(), why }; audit(["ถอนคำขอถอนเงินฝากคลัง", "Withdrew a withdrawal request"], `${w.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    if (ROLE === "fin" && w.status === "done" && w.amount - nbWdUsed(w) > 0) out.push({ id: "back", label: L("ฝากคืนคลัง", "Deposit back"), confirm: L(`ฝากคืน ${fmt(w.amount - nbWdUsed(w))} บาทที่ยังไม่ได้จ่าย`, `Deposit back the ${fmt(w.amount - nbWdUsed(w))} baht not paid out`),
      run: () => { w.backAmt = w.amount - nbWdUsed(w); w.status = "back"; audit(["ฝากคืนเงินที่ถอนแต่ไม่ได้จ่าย", "Deposited back unpaid withdrawn money"], `${w.id} · ${fmt(w.backAmt)}`); return L("ฝากคืนแล้ว", "Deposited back"); } });
    if (nbHead() && w.status === "pending") out.push(
      { id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", undo: false, run: () => { if (!sodCheck("SD-11", sodActors("exec", "spend"), [w.by], w.id)) return null; S.gfSeq = (S.gfSeq || 3600000400) + 1; w.status = "done"; w.approver = { by: me().id, t: nowIso() }; w.done = { t: nowIso(), doc: `GF-WD-${S.gfSeq}` };
        audit(["อนุมัติถอนเงินฝากคลัง", "Approved a treasury withdrawal"], `${w.id} · ${fmt(w.amount)}`); notify(["fin"], [`ถอนเงินฝากคลัง ${w.id} แล้ว จ่ายหรือฝากคืนภายใน ${fcfg().refundDays} วันทำการ`, `Withdrawal ${w.id} done; pay out or deposit back within ${fcfg().refundDays} working days`], "fnc-nb:wd"); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Reject"), kind: "danger", why: true, run: (_, why) => { if (!sodCheck("SD-11", sodActors("exec", "spend"), [w.by], w.id)) return null; w.status = "rejected"; w.rejected = { by: me().id, t: nowIso(), why }; audit(["ไม่อนุมัติถอนเงินฝากคลัง", "Rejected a treasury withdrawal"], `${w.id} · ${why}`); notify(["fin"], [`คำขอถอน ${w.id} ไม่อนุมัติ: ${why}`, `Withdrawal ${w.id} was rejected: ${why}`], "fnc-nb:wd"); return L("บันทึกแล้ว", "Saved"); } });
    return out;
  },
  view: w => kv([[L("กองทุน", "Fund"), `${w.fund} · ${esc(tx((nbFund(w.fund) || { name: ["", ""] }).name))}`], [L("ใช้จ่ายสำหรับ", "To pay for"), esc(w.why)], [L("ขอโดย", "Asked by"), `${esc(userName(w.by))} · ${fdate(w.t, true)}`],
    w.done && [L("ถอนแล้ว", "Withdrawn"), `<span class="mono">${esc(w.done.doc)}</span> · ${fdate(w.done.t, true)} · ${L("จ่ายไปแล้ว", "paid out")} ${fmt(nbWdUsed(w))}`], w.backAmt && [L("ฝากคืน", "Deposited back"), fmt(w.backAmt)],
    w.rejected && [L("ไม่อนุมัติ", "Rejected"), `${esc(userName(w.rejected.by))} · ${esc(w.rejected.why)}`], w.withdrawn && [L("ถอนคำขอ", "Withdrawn"), esc(w.withdrawn.why)]])
    + `<p class="sub">${L("เงินที่ถอนต้องจ่ายหรือฝากคืนภายใน", "Withdrawn money is paid out or deposited back within")} ${fcfg().refundDays} ${L("วันทำการ (ข้อ 101 (5))", "working days (clause 101 (5))")}</p>`,
  hist: w => w.id,
});
FS.nbWd = () => crudList("fnWd", { head: `<h2>${L("ถอนเงินฝากคลัง", "Withdrawals from the treasury deposit")}</h2><span class="sp"></span><span class="sub">${L("ถอนตามแผนที่อนุมัติ", "Against an approved plan")}</span>`, empty: L("ยังไม่มีคำขอ", "No requests yet") });

// ---------- saved what-ifs (F9) ----------
const wiList = () => { const W = (S.fWhatifs = S.fWhatifs || []); W.forEach(s => { if (!s.id) s.id = `WI-${pad2(maxNo(W.map(x => x.id || ""), /^WI-(\d+)/) + 1)}`; }); return W; };
const WI_F = [["lag", ["W-FN-01 วันจากตรวจรับถึงจ่าย", "W-FN-01 Days from acceptance to payment"], 0, 60], ["slip", ["W-FN-02 งวดส่งมอบเลื่อน (วัน)", "W-FN-02 Delivery slips (days)"], 0, 180], ["target", ["W-FN-03 เป้าเบิกจ่ายสิ้นปี (%)", "W-FN-03 Year-end target (%)"], 50, 100], ["share", ["W-FN-04 ส่งใช้เงินยืมตรงเวลา (%)", "W-FN-04 Advances cleared on time (%)"], 0, 100]];
CRUD.def("fnWi", {
  noun: ["สถานการณ์จำลอง", "What-if scenario"], list: wiList, id: s => s.id, title: s => s.name, sub: s => `${esc(userName(s.by))} · ${fdate(s.t, true)}`, search: s => `${s.id} ${s.name}`,
  cols: [{ h: ["ชื่อ", "Name"], sort: s => s.name, c: s => `${esc(s.name)}<div class="sub">${esc(userName(s.by))} · ${fdate(s.t, true)}</div>` }, ...WI_F.map(([k], i) => ({ h: [`W${i + 1}`, `W${i + 1}`], n: true, c: s => s.w[k] })),
    { h: ["สิ้นปี %", "Year end %"], n: true, sort: s => s.r.end, c: s => fmt(s.r.end, 1) }, { h: ["กันเงิน (ลบ.)", "Carry-over (M)"], n: true, c: s => mb(s.r.carry) }],
  fields: s => { const w = s ? s.w : FWI || WI_DEF(); return [{ id: "name", label: ["ชื่อสถานการณ์", "Scenario name"], req: true, wide: true, value: s ? s.name : "" }, ...WI_F.map(([k, label, min, max]) => ({ id: k, label, type: "number", req: true, min, max, value: w[k] }))]; },
  check: v => WI_F.filter(([k, , min, max]) => !(Number(v[k]) >= min && Number(v[k]) <= max)).map(([k, , min, max]) => ({ f: k, m: `${min}–${max}` })),
  create: { can: () => ["fin", "finhead", "exec"].includes(ROLE), label: ["บันทึกสถานการณ์", "Save a scenario"], run: v => {
    const W = wiList(), w = Object.fromEntries(WI_F.map(([k]) => [k, Number(v[k])])), s = { id: `WI-${pad2(maxNo(W.map(x => x.id), /^WI-(\d+)/) + 1)}`, name: v.name, w, r: wiCalc(w), by: me().id, t: nowIso() };
    W.push(s); audit(["บันทึกสถานการณ์จำลองการเงิน", "Saved a finance what-if"], `${s.id} · ${s.name}`); return s; } },
  edit: { can: s => s.by === me().id || ROLE === "finhead", run: (s, v) => { s.name = v.name; s.w = Object.fromEntries(WI_F.map(([k]) => [k, Number(v[k])])); s.r = wiCalc(s.w); audit(["แก้ไขสถานการณ์จำลองการเงิน", "Edited a finance what-if"], s.id); } },
  acts: s => [{ id: "open", label: L("เปิดในคันโยก", "Open in the levers"), kind: "primary", undo: false, run: () => { FWI = Object.assign({}, s.w); crClose(); return L("โหลดค่าเข้าคันโยกแล้ว", "Loaded into the levers"); } },
    (s.by === me().id || ROLE === "finhead") && { id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบสถานการณ์นี้", "Delete this scenario"), run: () => { S.fWhatifs = S.fWhatifs.filter(x => x !== s); audit(["ลบสถานการณ์จำลองการเงิน", "Deleted a finance what-if"], s.id); return L("ลบแล้ว", "Deleted"); } }].filter(Boolean),
  view: s => kv([...WI_F.map(([k, label]) => [tx(label), s.w[k]]), [L("เบิกจ่ายสิ้นปี", "Spent by year end"), `${fmt(s.r.end, 1)}%`], [L("คาดกันเหลื่อมปี", "Expected carry-over"), `${mb(s.r.carry)} ${L("ลบ.", "M")}`], [L("ขาดจากเป้ารวม", "Short of target"), `${mb(s.r.gap)} ${L("ลบ.", "M")}`]])
    + `<p class="sub">${L("ค่าผลคำนวณตอนบันทึก แก้คันโยกแล้วคำนวณใหม่", "Results are worked out when saved; changing the levers works them out again")}</p>`,
  hist: s => s.id,
});

// ---------- the Finance demo (design chapter 11, E-F01 to E-F15) ----------
const FE2E = [
  ["finhead", "fnc-reg:books", ["เตรียมทะเบียน", "Set up the registers"], ["หัวหน้าการเงินออกเล่มใบเสร็จ แก้หน้าที่ผู้ใช้ GFMIS และแต่งตั้งกรรมการเก็บรักษาเงินชุดใหม่แบบมีวันเริ่มผล", "The finance head issues a receipt book, changes a GFMIS user's duties and appoints a new cash committee from a date"], ["ออกเล่มใหม่ แก้ผู้ใช้ GFMIS แล้วแต่งตั้งกรรมการ", "Issue a book, edit a GFMIS user, then appoint the committee"]],
  ["fin", "fnc-chain:other", ["ผูกพันและเลข PO", "Commitments and the PO"], ["ผูกพันค่าเช่าแก้ได้ครบจนกว่ามีใบขอเบิก เลข PO ที่พิมพ์ผิดแก้ได้จนกว่าจะอยู่ในไฟล์ GFMIS", "A rent commitment can be changed in full until a voucher uses it; a mistyped PO can be fixed until it is in a GFMIS file"], ["สร้างผูกพัน แก้วงเงิน แล้วไปแท็บ ทุกรายการและ PO แก้เลข PO", "Create a commitment, change its amount, then correct a PO on the All and POs tab"]],
  ["fin", "fnc-pay:vouchers", ["ใบขอเบิกและยอดจอง", "Vouchers hold their amount"], ["ใบที่ส่งตรวจแล้วจองวงเงินผูกพัน ใบที่สองที่เกินยอดว่างส่งไม่ได้", "A voucher sent for checking holds the commitment; a second one above what is free can't be sent"], ["ทำใบขอเบิกอื่นจากผูกพัน ดูตรวจสด แล้วส่งตรวจ", "Make an other voucher from the commitment, watch the live check, send it"]],
  ["finhead", "fnc-pay:vouchers", ["ส่งคืน แก้ แล้วส่งใหม่", "Return, fix, send again"], ["ส่งคืนต้องมีเหตุผลในกล่องเดียวกันทุกที่ ผู้จัดทำแก้ยอดในลิ้นชักแล้วส่งใหม่", "Returning needs a reason in the same box everywhere; the maker fixes the amount in the drawer and sends it again"], ["ส่งคืนพร้อมเหตุผล แล้วเปลี่ยนเป็นการเงินแก้และส่งใหม่", "Return it with a reason, then switch to Finance to fix and resend"]],
  ["exec", "fnc-pay:vouchers", ["อำนาจอนุมัติและการแยกหน้าที่", "Authority and duty separation"], ["ระดับอำนาจเลือกจากยอด หัวหน้าการเงินอนุมัติได้ไม่เกิน 1 ล้านถ้าไม่ได้เป็นผู้ตรวจ (SD-11)", "The authority level comes from the amount; the finance head approves up to 1 million if they didn't check it (SD-11)"], ["อนุมัติใบที่ตรวจแล้ว ดูระดับอำนาจในลิ้นชัก", "Approve a checked voucher and see the authority level in the drawer"]],
  ["fin", "fnc-pay:gfmis", ["ไฟล์ GFMIS และผลจำลอง", "The GFMIS file and simulated results"], ["เลือกใบเข้าไฟล์ นำใบออกได้ก่อนได้ผล ปุ่มจำลองเติมแบบฟอร์มให้ตรวจก่อนบันทึก", "Pick vouchers for the file, take one out before a result, and Simulate fills the form to check before saving"], ["สร้างไฟล์ จำลองผลบันทึกและผลการจ่าย", "Make a file, simulate the posting and payment results"]],
  ["fin", "fnc-pay:vouchers", ["เงินคืนหลังจ่าย", "Money paid back"], ["ใบที่จ่ายแล้วไม่แก้ บันทึกรับเงินคืนเป็นใบเสร็จที่อ้างถึงใบขอเบิก ถ้าภายในปีคืนวงเงินให้รายการ", "A paid voucher isn't changed; money paid back is a receipt that points to it, and within the year it gives the amount back"], ["เปิดใบที่จ่ายแล้ว บันทึกรับเงินคืน", "Open a paid voucher and record money paid back"]],
  ["div", "advances", ["เงินยืม แก้ ยกเลิก และส่งใช้", "Advances: edit, cancel, clear"], ["ผู้ยืมแก้คำขอได้ก่อนอนุมัติ ยกเลิกได้ก่อนรับเงิน และดึงใบสำคัญกลับมาแก้ได้ก่อนการเงินตรวจ", "The borrower edits a request before approval, cancels before payment, and takes a clearing back before Finance checks it"], ["ขอยืม แก้คำขอ แล้วดูปุ่มตามสถานะ", "Ask for an advance, edit it, and see the buttons by state"]],
  ["fin", "fnc-recv:receipts", ["ใบเสร็จและการนำส่ง", "Receipts and remittance"], ["ใบเสร็จไม่แก้ ยกเลิกแล้วออกใหม่ บันทึก GFMIS ทีละใบ นำส่งเลือกใบได้และกลับรายการได้ก่อน GFMIS เห็น", "Receipts aren't edited but cancelled and reissued, recorded in GFMIS one by one; a remittance picks receipts and can be reversed before GFMIS shows it"], ["ออกใบเสร็จ ยกเลิกและออกใหม่ แล้วนำส่ง", "Issue a receipt, cancel and reissue it, then remit"]],
  ["finhead", "fnc-cash", ["เงินคงเหลือและการนับใหม่", "Daily cash and a recount"], ["ยอดนับไม่ตรงสั่งนับใหม่ได้ก่อนผู้บริหารรับทราบ การนับเดิมเก็บไว้", "When the count differs the head asks for a recount before the executive acknowledges; the earlier count is kept"], ["สั่งนับใหม่พร้อมเหตุผล", "Ask for a recount with a reason"]],
  ["fin", "fnc-recon:bank", ["กระทบยอดธนาคาร", "Bank reconciliation"], ["นำเข้าผิดลบแล้วนำเข้าใหม่ได้ ปรับปรุงบัญชีกลับรายการได้ก่อนลงนาม", "A wrong import is deleted and imported again; an adjustment is reversed before signing"], ["นำเข้า ปรับปรุงค่าธรรมเนียม แล้วกลับรายการ", "Import, record the fee, then reverse it"]],
  ["exec", "fnc-close:month", ["ปิดและเปิดงวด", "Close and reopen"], ["เปิดงวด วัน หรืองบพิสูจน์ที่ปิดแล้วต้องเป็นคนละคนกับผู้ปิดหรือผู้บริหาร (SD-16)", "A closed period, day or reconciliation is reopened by someone other than whoever closed it, or the executive (SD-16)"], ["ผู้บริหารเปิดงวดใหม่พร้อมเหตุผล", "The executive reopens a period with a reason"]],
  ["fin", "fnc-nb:plans", ["เงินนอกงบประมาณ", "Non-budget money"], ["แผนที่อนุมัติปรับเป็นฉบับใหม่ได้ ฉบับเดิมยังใช้จ่ายได้จนกว่าฉบับใหม่ได้รับอนุมัติ", "An approved plan is amended as a new version; the old one stays in force until the new one is approved"], ["เปิดแผนที่อนุมัติ ปรับแผน เพิ่มรายการ แล้วเสนอ", "Open an approved plan, amend it, add a line, send it"]],
  ["audit", "fnc-ai:kpi", ["ผู้ตรวจสอบและสัญญาณ", "The auditor and the signals"], ["ยืนยันประเด็นหรือผลบวกลวงต้องมีเหตุผล เปิดใหม่ได้ งาน Agent หยุดได้พร้อมเหตุผล", "Confirming an issue or a false positive needs a reason and can be reopened; an agent run can be stopped with a reason"], ["ตั้งสัญญาณเป็นประเด็น แล้วเปิดประวัติใบขอเบิก", "Mark a signal as an issue, then open a voucher's history"]],
  ["plan", "mon-live", ["ยอดเบิกจ่ายใน Fisko Budget", "Spending in Fisko Budget"], ["การจ่ายและเงินคืนจากขั้นก่อนหน้าเห็นในการติดตามปีนี้ทันที", "The payments and refunds from the earlier steps show in this year's tracking at once"], ["ดูยอดเบิกจ่ายของรายการที่ใช้", "Look at the spending of the lines used"]],
];
FE2E.forEach(([role, link, title, say, doo], i) => DEMO.push({ t: `E-F${String(i + 1).padStart(2, "0")}`, part: "fin", role, link, title, say, do: doo }));
