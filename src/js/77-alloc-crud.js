// B7 allocation on the shared list + drawer (round C1, Budget CRUD design 6.6, FR-C-27 to FR-C-33).
// Allocation lines start as drafts (A.drafts) that Finance confirms into A.lines; a confirmed line is never deleted:
// cancelling keeps it with amount 0 so transfers, contracts and history that name it still resolve (R-C-01, R-C-03).
// Transfers, releases and carry-over requests can be edited or withdrawn while they wait; numbers are never reused (R-C-05).
const CR_ST = {
  draft: [["ร่าง", "Draft"], "p-mute"], active: [["จัดสรรแล้ว", "Allocated"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-bad"],
  pending: [["รออนุมัติ", "Pending"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"], withdrawn: [["ถอนแล้ว", "Withdrawn"], "p-mute"],
};
const crSeq = (A, k) => { A.seq = A.seq || {}; A.seq[k] = (A.seq[k] || 0) + 1; return A.seq[k]; };
const crNo = (A, k, pre, w = 3) => `${pre}-${ALLOC_FY}-${String(crSeq(A, k)).padStart(w, "0")}`;
const actOpts = () => (S.structure[2571] || []).filter(n => n.lvl === "activity").map(n => [n.id, `${n.code} · ${tx(n.name)}`]);
const unitOpts = () => S.units.filter(u => u.parent).map(u => [u.id, tx(u.name)]);
const typeOpts = () => BUDGET_TYPES.map(t => [t.id, tx(t.name)]);
const typeRoom = t => (AL().byType[t] || 0) - allocated(t);
const liveLines = () => AL().lines.filter(l => !l.cancelled);
const actCode = l => (lineage(l.act).pop() || { code: "—" }).code;
const kv = rows => `<dl class="cr-kv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
const clip = (a, n) => (String(a).length > n ? String(a).slice(0, n) + "…" : String(a));

// ---------- allocation lines ----------
const lineFloor = l => { const b = ALLOC_FY === B4_FY ? bal(l) : { res: 0, com: 0 }; return b.res + b.com + pendingOut(l.id); };
const lineUsed = l => ALLOC_FY === B4_FY && (lineFloor(l) > 0 || AL().transfers.some(t => t.status === "pending" && (t.from === l.id || t.to === l.id)));
CRUD.def("alLine", {
  noun: ["บรรทัดจัดสรร", "Allocation line"], st: CR_ST, live: true,
  list: () => [...(AL().drafts || []), ...AL().lines], id: l => l.id, title: l => tx(l.name),
  sub: l => `${unitName(l.unit)} · ${typeName(l.type)} · <span class="mono">${actCode(l)}</span>`,
  status: l => (l.draft ? "draft" : l.cancelled ? "cancelled" : "active"), gone: l => !!l.cancelled,
  search: l => `${l.id} ${l.name.join(" ")} ${unitName(l.unit)}`,
  filters: [{ id: "unit", label: ["หน่วยงาน", "Unit"], opts: () => [...new Set(AL().lines.map(l => l.unit))].map(u => [u, unitName(u)]), get: l => l.unit },
    { id: "type", label: ["งบรายจ่าย", "Budget type"], opts: typeOpts, get: l => l.type }],
  cols: [
    { h: ["บรรทัด", "Line"], c: l => `<b style="font-weight:600">${esc(tx(l.name))}</b><div class="sub"><span class="mono">${l.id}</span> · ${unitName(l.unit)}</div>` },
    { h: ["งบรายจ่าย", "Type"], c: l => typeName(l.type) },
    { h: ["กิจกรรม", "Activity"], c: l => `<span class="mono sub">${actCode(l)}</span>` },
    { h: ["วงเงิน (ลบ.)", "Amount (M)"], n: true, c: l => (l.cancelled ? `<s class="sub">${mb(l.cancelled.amount)}</s>` : mb(l.amount)) },
    { h: ["รอโอนออก", "Pending out"], n: true, c: l => (l.draft ? "–" : pendingOut(l.id) ? mb(pendingOut(l.id)) : "–") },
  ],
  fields: (l, v) => {
    const type = v.type || (l && l.type) || "ope", act = !!(l && !l.draft);
    const max = act ? l.amount + typeRoom(type) : typeRoom(type), min = act ? lineFloor(l) : 100000;
    return [
      { id: "unit", label: ["หน่วยงาน", "Unit"], type: "select", opts: unitOpts(), req: true, value: l ? l.unit : "", lock: act, show: l && unitName(l.unit) },
      { id: "name", label: ["ชื่อรายการ", "Line name"], req: true, value: l ? tx(l.name) : "", wide: true },
      { id: "type", label: ["งบรายจ่าย", "Budget type"], type: "select", opts: typeOpts(), req: true, value: l ? l.type : "ope", lock: act, show: l && typeName(l.type) },
      { id: "act", label: ["กิจกรรม (รหัสงบประมาณ)", "Activity (budget code)"], type: "select", opts: actOpts(), req: true, blank: L("— เลือกกิจกรรม —", "— choose an activity —"), value: l ? l.act : "" },
      { id: "amount", label: ["วงเงิน (ล้านบาท)", "Amount (million baht)"], type: "money", req: true, value: l ? l.amount : "", min, max,
        hint: `${L("ยังไม่จัดสรรใน", "Unallocated")} ${typeName(type)} ${mb(typeRoom(type))} ${L("ลบ.", "M")}${act && min ? ` · ${L("ต่ำสุด", "lowest")} ${mb(min)} (${L("จอง ผูกพัน และรอโอน", "reserved, committed and pending out")})` : ""}` },
      { id: "newProj", label: ["โครงการใหม่ (การโอนเข้าต้องเสนอ ครม. · T4)", "New project (moving money in needs the Cabinet · T4)"], type: "check", value: l ? !!l.newProj : false },
      { id: "extended", label: ["เงินที่ขยายเวลาเบิกจ่ายแล้ว (T6)", "Money with an extended spending period (T6)"], type: "check", value: l ? !!l.extended : false },
    ];
  },
  create: { can: () => canAlloc(), label: ["เพิ่มบรรทัดจัดสรร", "Add allocation line"],
    run: v => { const A = AL(); A.drafts = A.drafts || [];
      const l = { id: crNo(A, "al", "AL"), draft: true, unit: v.unit, name: [v.name, v.name], type: v.type, act: v.act, amount: v.amount, newProj: v.newProj, extended: v.extended, by: me().id, t: nowIso() };
      A.drafts.push(l); audit(["สร้างร่างบรรทัดจัดสรร", "Drafted an allocation line"], `${l.id} · ${v.name} · ${mb(v.amount)}`); return l; } },
  edit: { can: l => canAlloc() && !l.cancelled, why: l => !l.draft,
    run: (l, v, why) => {
      const was = l.amount;
      l.name = [v.name, v.name]; l.act = v.act; l.newProj = v.newProj; l.extended = v.extended;
      if (l.draft) { l.unit = v.unit; l.type = v.type; l.amount = v.amount; audit(["แก้ไขร่างบรรทัดจัดสรร", "Edited a draft allocation line"], `${l.id}`); return; }
      if (v.amount !== was) { l.amount = v.amount; scalePlan(l, v.amount); }
      audit(["แก้ไขบรรทัดจัดสรร", "Edited an allocation line"], `${l.id}${v.amount !== was ? ` · ${mb(was)} → ${mb(v.amount)}` : ""} · ${why}`);
      if (v.amount !== was) notify(["div"], [`กองคลังปรับวงเงิน ${tx(l.name)} เป็น ${mb(v.amount)} ลบ.`, `Finance changed ${tx(l.name)} to ${mb(v.amount)} M`], "alloc-allocate");
    } },
  check: (v, l) => (v.amount > (l && !l.draft ? l.amount : 0) + typeRoom(v.type || l.type) ? [{ f: "amount", m: L("เกินวงเงินที่ยังไม่จัดสรรของงบรายจ่ายนี้", "More than this budget type has left") }] : []),
  acts: l => {
    if (!canAlloc() || l.cancelled) return [];
    if (l.draft) return [
      { id: "confirm", label: L("ยืนยันการจัดสรร", "Confirm allocation"), kind: "primary", impact: () => `${L("จัดสรรแล้วจะเพิ่มเป็น", "Allocated will become")} ${mb(allocated() + l.amount)} / ${mb(AL().total)} ${L("ลบ.", "M")}`,
        run: l2 => { const A = AL();
          if (l2.amount > typeRoom(l2.type)) return L("วงเงินไม่พอแล้ว แก้วงเงินก่อนยืนยัน", "Not enough room left; change the amount first");
          A.drafts = A.drafts.filter(x => x !== l2); delete l2.draft;
          l2.plan = monthShape(l2.type).map(f => Math.round(l2.amount * f)); l2.plan[11] += l2.amount - sumv(l2.plan);
          l2.allot = { status: "approved", t: TODAY }; A.lines.push(l2);
          audit(["จัดสรรงบประมาณ", "Allocated budget"], `${l2.id} · ${unitName(l2.unit)} · ${tx(l2.name)} · ${mb(l2.amount)}`);
          notify(["div"], [`กองคลังจัดสรรงบประมาณ ${tx(l2.name)} ${mb(l2.amount)} ลบ.`, `Finance allocated ${mb(l2.amount)} M for ${tx(l2.name)}`], "alloc-allocate");
          return L("ยืนยันการจัดสรรแล้ว", "Allocation confirmed"); } },
      { id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", confirm: L("ลบร่างนี้? เลขที่จะไม่ถูกนำกลับมาใช้", "Delete this draft? Its number won't be reused."),
        run: l2 => { const A = AL(); A.drafts = A.drafts.filter(x => x !== l2); audit(["ลบร่างบรรทัดจัดสรร", "Deleted a draft allocation line"], l2.id); return L("ลบร่างแล้ว", "Draft deleted"); } },
    ];
    if (lineUsed(l)) return [];
    return [{ id: "cancel", label: L("ยกเลิกบรรทัด", "Cancel line"), kind: "danger", why: true, impact: () => `${L("ยอดจัดสรรจะลด", "Allocated will drop by")} ${mb(l.amount)} ${L("ลบ.", "M")}`,
      run: (l2, why) => { l2.cancelled = { t: nowIso(), by: me().id, why, amount: l2.amount }; l2.amount = 0; l2.plan = l2.plan.map(() => 0);
        audit(["ยกเลิกบรรทัดจัดสรร", "Cancelled an allocation line"], `${l2.id} · ${why}`); return L("ยกเลิกบรรทัดแล้ว", "Line cancelled"); } }];
  },
  view: l => {
    const lin = lineage(l.act), b = !l.draft && ALLOC_FY === B4_FY ? bal(l) : null;
    return kv([[L("หน่วยงาน", "Unit"), unitName(l.unit)], [L("งบรายจ่าย", "Budget type"), typeName(l.type)],
      [L("โครงสร้างงบประมาณ", "Budget structure"), lin.length ? lin.map(n => `<span class="mono">${n.code}</span> ${esc(tx(n.name))}`).join("<br>") : `<span class="sub">${L("ยังไม่ผูกกิจกรรม", "No activity yet")}</span>`],
      [L("วงเงิน", "Amount"), `${mb(l.cancelled ? l.cancelled.amount : l.amount)} ${L("ลบ.", "M")}`],
      b && [L("ยอด 4 ระดับ", "Four levels"), `${L("จอง", "Reserved")} ${mb(b.res)} · ${L("ผูกพัน", "committed")} ${mb(b.com)} · ${L("เบิกจ่าย", "paid")} ${mb(b.paid)} · <b>${L("ใช้ได้", "available")} ${mb(b.avail)}</b>`],
      (l.newProj || l.extended) && [L("ป้าย", "Flags"), [l.newProj && tag(L("โครงการใหม่", "New project"), "p-info"), l.extended && tag(L("ขยายเวลาแล้ว", "Extended"), "p-warn")].filter(Boolean).join(" ")],
      l.req && [L("จากคำขอ", "From request"), `<span class="mono">${l.req}</span>`],
      l.cancelled && [L("ยกเลิกเมื่อ", "Cancelled"), `${fdate(l.cancelled.t)} · ${esc(l.cancelled.why)}`],
    ]) + (!l.draft && !l.cancelled && canAlloc() && lineUsed(l) ? `<p class="sub">${L("ยกเลิกไม่ได้: มีการจอง ผูกพัน หรือการโอนที่รออยู่ (R-C-03) ลดวงเงินได้ถึงยอดที่ใช้แล้ว", "Can't be cancelled: it has reservations, commitments or pending transfers (R-C-03). You can lower it to what is already used.")}</p>` : "")
      + (l.draft ? `<p class="sub">${L("ร่างยังไม่นับในยอดจัดสรร ยืนยันเพื่อจัดสรรและสร้างแผนรายเดือน", "A draft isn't counted yet. Confirm it to allocate and create its monthly plan.")}</p>` : "");
  },
  tabs: l => (l.draft ? [] : [
    ["plan", L("แผนรายเดือน", "Monthly plan"), `<div class="tbl-wrap"><table><tbody>${(l.plan || []).map((v, i) => `<tr><td>${FY_MONTHS[LANG][i]}</td><td class="n">${mb(v)}</td></tr>`).join("")}</tbody><tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${mb(sumv(l.plan || []))}</td></tr></tfoot></table></div>`],
    ["tr", L("การโอน", "Transfers"), (() => { const T = AL().transfers.filter(t => t.from === l.id || t.to === l.id); return T.length ? `<ul class="plain">${T.map(t => `<li><span class="mono">${t.id}</span> ${t.from === l.id ? L("โอนออก", "out") : L("โอนเข้า", "in")} ${mb(t.amount)} ${tag(tx((CR_ST[t.status] || TR_ST[t.status] || [[t.status, t.status]])[0]), (CR_ST[t.status] || TR_ST[t.status] || [0, "p-mute"])[1])}</li>`).join("")}</ul>` : `<span class="sub">${L("ไม่มีการโอน", "No transfers")}</span>`; })()],
  ]),
});

// ---------- transfers ----------
const trTy = t => t.type || classifyTransfer(t);
const trApprover = t => TR_TYPE[trTy(t)][1];
CRUD.def("alTr", {
  noun: ["การโอนเปลี่ยนแปลง", "Budget transfer"], live: true, st: { ...CR_ST, bb: TR_ST.bb, blocked: TR_ST.blocked },
  list: () => AL().transfers.slice().reverse(), id: t => t.id,
  title: t => `${lineOf(t.from) ? tx(lineOf(t.from).name) : t.from} → ${lineOf(t.to) ? tx(lineOf(t.to).name) : t.to}`,
  sub: t => `${mb(t.amount)} ${L("ลบ.", "M")} · <b class="mono">${trTy(t)}</b> ${tx(TR_TYPE[trTy(t)][0])}`,
  status: t => (trTy(t) === "T4" && t.status === "pending" ? "blocked" : t.status), gone: t => t.status === "withdrawn",
  search: t => `${t.id} ${tx(t.why)} ${lineOf(t.from) ? tx(lineOf(t.from).name) : ""} ${lineOf(t.to) ? tx(lineOf(t.to).name) : ""}`,
  filters: [{ id: "type", label: ["ประเภท", "Type"], opts: () => Object.keys(TR_TYPE).map(k => [k, `${k} ${tx(TR_TYPE[k][0])}`]), get: trTy }],
  cols: [
    { h: ["เลขที่", "No."], c: t => `<span class="mono">${t.id}</span><div class="sub">${fdate(t.t)}</div>` },
    { h: ["โอนจาก", "From"], c: t => (lineOf(t.from) ? esc(lineLabel(lineOf(t.from))) : t.from) },
    { h: ["โอนไป", "To"], c: t => `${lineOf(t.to) ? esc(lineLabel(lineOf(t.to))) : t.to}<div class="sub">${esc(clip(tx(t.why), 60))}</div>` },
    { h: ["ลบ.", "M"], n: true, c: t => mb(t.amount) },
    { h: ["ประเภท", "Type"], c: t => `<b class="mono">${trTy(t)}</b>` },
  ],
  prefill: () => (B4_PREFILL ? { from: B4_PREFILL.from, amount: B4_PREFILL.amount, why: B4_PREFILL.why } : {}),
  fields: (t, v) => {
    const L2 = liveLines(), from = v.from || (t && t.from) || (L2[0] || {}).id, to = v.to || (t && t.to) || (L2[1] || {}).id, fl = lineOf(from);
    const avail = fl ? (ALLOC_FY === B4_FY ? bal(fl).avail : fl.amount) - pendingOut(from) + (t && t.from === from ? t.amount : 0) : 0, ty = classifyTransfer({ from, to });
    return [
      { id: "from", label: ["โอนจาก", "From"], type: "select", req: true, value: from, wide: true, opts: L2.map(l => [l.id, `${lineLabel(l)} (${L("ใช้ได้", "avail.")} ${mb((ALLOC_FY === B4_FY ? bal(l).avail : l.amount) - pendingOut(l.id))})`]) },
      { id: "to", label: ["โอนไป", "To"], type: "select", req: true, value: to, wide: true, opts: L2.map(l => [l.id, lineLabel(l)]) },
      { id: "amount", label: ["วงเงิน (ล้านบาท)", "Amount (million baht)"], type: "money", req: true, value: t ? t.amount : v.amount ?? "", min: 10000, max: Math.max(0, avail), hint: `${L("โอนได้ไม่เกิน", "At most")} ${mb(Math.max(0, avail))} ${L("ลบ. (หักจอง ผูกพัน และที่รอโอน)", "M (after reservations, commitments and pending transfers)")}` },
      { id: "reason", label: ["เหตุผลตามข้อ 25", "Reason (clause 25)"], type: "select", req: true, value: t ? t.reason : "eff", opts: Object.keys(TR_WHY).map(k => [k, tx(TR_WHY[k])]) },
      { id: "why", label: ["รายละเอียด", "Details"], type: "textarea", req: true, value: t ? tx(t.why) : v.why || "", wide: true },
      { id: "_ty", label: ["ประเภทและผู้อนุมัติ", "Type and approver"], type: "info", wide: true, html: `<b class="mono">${ty}</b> ${tx(TR_TYPE[ty][0])} · ${TR_TYPE[ty][1] === "fin" ? L("ผอ.กองคลัง", "Finance director") : TR_TYPE[ty][1] === "cabinet" ? `${tag(L("ต้องเสนอ ครม.", "Needs Cabinet"), "p-bad")}` : L("ผู้บริหาร", "Executive")}${TR_TYPE[ty][2] && TR_TYPE[ty][1] !== "cabinet" ? ` → ${L("สำนักงบประมาณ", "Budget Bureau")}` : ""} · ${tx(TR_TYPE[ty][3])}` },
    ];
  },
  check: v => (v.from === v.to ? [{ f: "to", m: L("เลือกรายการต้นทางและปลายทางที่ต่างกัน", "Choose different source and destination lines") }] : []),
  create: { can: () => canAlloc(), label: ["ขอโอนเปลี่ยนแปลง", "Request transfer"],
    run: v => { const A = AL(), t = { id: crNo(A, "tr", "TR"), from: v.from, to: v.to, amount: v.amount, why: [v.why, v.why], reason: v.reason, status: "pending", t: nowIso(), by: me().id };
      // keep numbering past the transfers made before round C1
      while (A.transfers.some(x => x.id === t.id)) t.id = crNo(A, "tr", "TR");
      t.type = classifyTransfer(t); A.transfers.push(t); B4_PREFILL = null;
      audit(["ขอโอนเปลี่ยนแปลงงบประมาณ", "Requested a budget transfer"], `${t.id} · ${t.type} · ${mb(t.amount)}`);
      notify([TR_TYPE[t.type][1] === "fin" ? "fin" : "exec"], [`มีคำขอโอน ${t.id} (${t.type}) รออนุมัติ`, `Transfer ${t.id} (${t.type}) is waiting for approval`], "alloc-transfers"); return t; } },
  edit: { can: t => canAlloc() && t.status === "pending",
    run: (t, v) => { Object.assign(t, { from: v.from, to: v.to, amount: v.amount, reason: v.reason, why: [v.why, v.why] }); t.type = classifyTransfer(t); audit(["แก้ไขคำขอโอนเปลี่ยนแปลง", "Edited a transfer request"], `${t.id} · ${mb(t.amount)}`); } },
  acts: t => {
    const ty = trTy(t), out = [], A = AL();
    const apply = () => { const a = lineOf(t.from), b = lineOf(t.to); a.amount -= t.amount; b.amount += t.amount; scalePlan(a, a.amount); scalePlan(b, b.amount); if (a.type !== b.type) { A.byType[a.type] -= t.amount; A.byType[b.type] = (A.byType[b.type] || 0) + t.amount; } };
    if (t.status === "pending" && ty !== "T4" && acting(trApprover(t) === "fin" ? "fin" : "exec", "transfer")) {
      out.push({ id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", impact: () => (TR_TYPE[ty][2] ? L("อนุมัติภายในแล้วส่งสำนักงบประมาณ", "Approve internally, then it goes to the Budget Bureau") : `${L("ปรับวงเงินทั้งสองบรรทัดทันที", "Both lines change now")}: −${mb(t.amount)} / +${mb(t.amount)}`),
        run: () => { if (TR_TYPE[ty][2]) { t.status = "bb"; notify(["plan", "fin"], [`${t.id} อนุมัติภายในแล้ว รอตกลงสำนักงบประมาณ`, `${t.id} approved internally; waiting for the Budget Bureau`], "alloc-transfers"); } else { t.status = "approved"; t.reportDue = addDays(TODAY, 15); apply(); }
          audit(["อนุมัติการโอนเปลี่ยนแปลง", "Approved a transfer"], `${t.id} · ${ty}`); return L("อนุมัติแล้ว", "Approved"); } });
      out.push({ id: "no", label: L("ไม่อนุมัติ", "Reject"), kind: "danger", why: true,
        run: (_, why) => { t.status = "rejected"; t.decision = why; audit(["ไม่อนุมัติการโอนเปลี่ยนแปลง", "Rejected a transfer"], `${t.id} · ${why}`); notify(["fin"], [`${t.id} ไม่อนุมัติ: ${why}`, `${t.id} rejected: ${why}`], "alloc-transfers"); return L("ไม่อนุมัติแล้ว", "Rejected"); } });
    }
    if (t.status === "bb" && (ROLE === "plan" || canAlloc())) {
      out.push({ id: "bbok", label: L("บันทึกว่าสำนักงบประมาณเห็นชอบ", "Record Budget Bureau agreement"), kind: "primary", run: () => { t.status = "approved"; t.bbAgreed = TODAY; apply(); audit(["บันทึกความเห็นชอบของสำนักงบประมาณต่อการโอน", "Recorded the Budget Bureau's agreement to a transfer"], t.id); return L("บันทึกแล้ว · การโอนมีผล", "Recorded · the transfer is in effect"); } });
      out.push({ id: "bbno", label: L("บันทึกว่าสำนักงบประมาณไม่เห็นชอบ", "Record Budget Bureau refusal"), kind: "danger", why: true, run: (_, why) => { t.status = "rejected"; t.decision = why; audit(["สำนักงบประมาณไม่เห็นชอบการโอน", "The Budget Bureau refused a transfer"], `${t.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } });
    }
    if (t.status === "pending" && canAlloc()) out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw"), kind: "ghost", why: true, run: (_, why) => { t.status = "withdrawn"; t.decision = why; audit(["ถอนคำขอโอนเปลี่ยนแปลง", "Withdrew a transfer request"], `${t.id} · ${why}`); return L("ถอนคำขอแล้ว", "Withdrawn"); } });
    if (t.status === "approved" && ty === "T1" && !t.reported && canAlloc()) out.push({ id: "rep", label: L("รายงานสำนักงบประมาณแล้ว", "Mark reported"), run: () => { t.reported = TODAY; audit(["รายงานการโอนต่อสำนักงบประมาณ", "Reported a transfer to the Budget Bureau"], t.id); return L("บันทึกแล้ว", "Recorded"); } });
    return out;
  },
  view: t => { const ty = trTy(t), T = TR_TYPE[ty];
    return kv([[L("โอนจาก", "From"), lineOf(t.from) ? esc(lineLabel(lineOf(t.from))) : t.from], [L("โอนไป", "To"), lineOf(t.to) ? esc(lineLabel(lineOf(t.to))) : t.to],
      [L("วงเงิน", "Amount"), `${mb(t.amount)} ${L("ลบ.", "M")}`], [L("ประเภท", "Type"), `<b class="mono">${ty}</b> ${tx(T[0])} · ${tx(T[3])}`],
      [L("เหตุผล", "Reason"), `${t.reason ? tx(TR_WHY[t.reason]) + " · " : ""}${esc(tx(t.why))}`], [L("ยื่นเมื่อ", "Requested"), `${fdate(t.t)} · ${userName(t.by)}`],
      t.status === "approved" && ty === "T1" && [L("รายงานสำนักงบประมาณ", "Report to the Budget Bureau"), t.reported ? `${L("รายงานแล้ว", "Reported")} ${fdate(t.reported)}` : dueText(t.reportDue || addDays(String(t.t).slice(0, 10), 15))],
      t.bbAgreed && [L("สำนักงบประมาณเห็นชอบ", "Budget Bureau agreed"), fdate(t.bbAgreed)],
      t.decision && [t.status === "withdrawn" ? L("เหตุผลที่ถอน", "Why withdrawn") : L("เหตุผลที่ไม่อนุมัติ", "Why rejected"), esc(t.decision)]]); },
});

// ---------- allotment releases ----------
const relLeft = (type, skip) => allocated(type) - sumv((AL().releases || []).filter(r => r.type === type && r !== skip && !["rejected", "withdrawn"].includes(r.status)).map(r => r.amount));
CRUD.def("alRel", {
  noun: ["คำขออนุมัติงวดเงิน", "Release request"], st: CR_ST, live: true,
  list: () => (AL().releases || []).slice().reverse(), id: r => r.id, title: r => `${L("ไตรมาส", "Q")} ${r.q} · ${typeName(r.type)}`, sub: r => `${mb(r.amount)} ${L("ลบ.", "M")}`,
  status: r => r.status, gone: r => r.status === "withdrawn",
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` }, { h: ["ไตรมาส", "Quarter"], c: r => r.q }, { h: ["งบรายจ่าย", "Type"], c: r => typeName(r.type) },
    { h: ["วงเงิน (ลบ.)", "Amount (M)"], n: true, c: r => mb(r.amount) }, { h: ["ยื่นเมื่อ", "Requested"], c: r => `<span class="sub">${fdate(r.t)}</span>` }],
  fields: (r, v) => {
    const types = BUDGET_TYPES.filter(t => liveLines().some(l => l.type === t.id)), type = v.type || (r && r.type) || (types[0] || {}).id, q = Number(v.q || (r && r.q) || Math.min(4, CUR_Q + 1));
    const left = relLeft(type, r), plan = qPlan(liveLines().filter(l => l.type === type), q - 1);
    return [
      { id: "q", label: ["ไตรมาส", "Quarter"], type: "select", req: true, value: String(q), opts: [1, 2, 3, 4].map(x => [String(x), `${L("ไตรมาส", "Quarter")} ${x}`]) },
      { id: "type", label: ["งบรายจ่าย", "Budget type"], type: "select", req: true, value: type, opts: types.map(t => [t.id, tx(t.name)]) },
      { id: "amount", label: ["วงเงิน (ล้านบาท)", "Amount (million baht)"], type: "money", req: true, value: r ? r.amount : v.amount ?? Math.min(plan, left), min: 10000, max: Math.max(0, left), hint: `${L("แผนไตรมาสนี้", "Plan this quarter")} ${mb(plan)} · ${L("ขอได้อีกไม่เกิน", "Room left")} ${mb(left)} ${L("ลบ.", "M")}` },
      { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", value: r ? r.note || "" : "", wide: true },
    ];
  },
  create: { can: () => canAlloc() && !AL().draft, label: ["ขออนุมัติงวดเงิน", "Request release"],
    run: v => { const A = AL(); A.releases = A.releases || []; const r = { id: crNo(A, "rl", "RL", 2), q: Number(v.q), type: v.type, amount: v.amount, note: v.note, status: "pending", t: nowIso(), by: me().id };
      while (A.releases.some(x => x.id === r.id)) r.id = crNo(A, "rl", "RL", 2);
      A.releases.push(r); audit(["ขออนุมัติงวดเงิน", "Requested an allotment release"], `${r.id} · Q${r.q} · ${typeName(r.type)} · ${mb(r.amount)} M`); return r; } },
  edit: { can: r => canAlloc() && r.status === "pending", run: (r, v) => { Object.assign(r, { q: Number(v.q), type: v.type, amount: v.amount, note: v.note }); audit(["แก้ไขคำขออนุมัติงวดเงิน", "Edited a release request"], `${r.id} · ${mb(r.amount)} M`); } },
  acts: r => (r.status !== "pending" || !canAlloc() ? [] : [
    { id: "ok", label: L("บันทึกผล: สำนักงบประมาณอนุมัติ", "Record: Budget Bureau approved"), kind: "primary", impact: () => `${L("ได้รับงวดเงิน", "Release of")} ${mb(r.amount)} ${L("ลบ.", "M")}`,
      run: () => { r.status = "approved"; r.dt = nowIso(); audit(["บันทึกการอนุมัติงวดเงิน", "Recorded an allotment release"], `${r.id} · ${mb(r.amount)} M`); notify(["fin", "exec"], [`ได้รับอนุมัติงวดเงิน ${r.id} ${mb(r.amount)} ลบ.`, `Release ${r.id} of ${mb(r.amount)} M approved`], "alloc-releases"); return L("บันทึกการอนุมัติงวดเงินแล้ว", "Release recorded"); } },
    { id: "no", label: L("บันทึกผล: ไม่อนุมัติ", "Record: not approved"), kind: "danger", why: true, run: (_, why) => { r.status = "rejected"; r.decision = why; r.dt = nowIso(); audit(["สำนักงบประมาณไม่อนุมัติงวดเงิน", "The Budget Bureau declined a release"], `${r.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } },
    { id: "wd", label: L("ถอนคำขอ", "Withdraw"), kind: "ghost", why: true, run: (_, why) => { r.status = "withdrawn"; r.decision = why; audit(["ถอนคำขออนุมัติงวดเงิน", "Withdrew a release request"], `${r.id} · ${why}`); return L("ถอนคำขอแล้ว", "Withdrawn"); } },
  ]),
  view: r => kv([[L("ไตรมาส", "Quarter"), r.q], [L("งบรายจ่าย", "Budget type"), typeName(r.type)], [L("วงเงิน", "Amount"), `${mb(r.amount)} ${L("ลบ.", "M")}`], [L("ยื่นเมื่อ", "Requested"), `${fdate(r.t)}${r.by ? " · " + userName(r.by) : ""}`],
    r.note && [L("หมายเหตุ", "Note"), esc(r.note)], r.dt && [L("ผลเมื่อ", "Decided"), fdate(r.dt)], r.decision && [L("เหตุผล", "Reason"), esc(r.decision)]]),
});

// ---------- carry-over requests ----------
CRUD.def("alCf", {
  noun: ["คำขอกันเงินเหลื่อมปี", "Carry-over request"], st: CR_ST,
  list: () => S.carry.reqs.slice().reverse(), id: c => c.id, title: c => (lineOf(c.line) ? tx(lineOf(c.line).name) : c.line), sub: c => `${mb(c.amount)} ${L("ลบ.", "M")} · <span class="mono">${esc(c.po)}</span>`,
  status: c => c.status, gone: c => c.status === "withdrawn",
  cols: [{ h: ["เลขที่", "No."], c: c => `<span class="mono">${c.id}</span>` }, { h: ["รายการ", "Line"], c: c => (lineOf(c.line) ? esc(lineLabel(lineOf(c.line))) : c.line) },
    { h: ["สัญญา", "Contract"], c: c => `<span class="mono sub">${esc(c.po)}</span> <span class="sub">${fdate(c.poDate)}</span>` }, { h: ["ขอกัน (ลบ.)", "Amount (M)"], n: true, c: c => mb(c.amount) },
    { h: ["ผลตรวจ", "Checks"], c: c => (cfChecks(c).every(x => x[0]) ? tag(L("ผ่านทุกข้อ", "All passed"), "p-ok") : tag(`${cfChecks(c).filter(x => !x[0]).length} ${L("ข้อไม่ผ่าน", "failed")}`, "p-bad")) }],
  fields: c => [
    { id: "line", label: ["รายการจัดสรร", "Allocation line"], type: "select", req: true, wide: true, value: c ? c.line : "", opts: liveLines().filter(l => l.type === "inv" || l.type === "ope").map(l => [l.id, `${lineLabel(l)} · ${mb(l.amount)}`]) },
    { id: "amount", label: ["ขอกัน (ล้านบาท)", "Amount (million baht)"], type: "money", req: true, value: c ? c.amount : "", min: 10000 },
    { id: "po", label: ["เลขที่สัญญา / PO", "Contract / PO no."], req: true, value: c ? c.po : "" },
    { id: "poDate", label: ["วันที่ลงนาม", "Signed on"], type: "date", req: true, value: c ? c.poDate : "" },
    { id: "vendor", label: ["คู่สัญญา", "Supplier"], value: c ? c.vendor : "" },
  ],
  check: v => cfChecks({ ...v }).filter(x => !x[0]).map(x => ({ f: null, m: x[1] })),
  create: { can: () => canAlloc() && ALLOC_FY === 2570, label: ["ยื่นคำขอกันเงิน", "File carry-over request"],
    run: v => { const C = S.carry; C.seq = (C.seq || C.reqs.length) + 1; const c = { id: `CF-${ALLOC_FY}-${String(C.seq).padStart(2, "0")}`, line: v.line, amount: v.amount, po: v.po, poDate: v.poDate, vendor: v.vendor, status: "pending", t: nowIso(), by: me().id };
      C.reqs.push(c); audit(["ยื่นคำขอกันเงินไว้เบิกเหลื่อมปี", "Filed a carry-over request"], `${c.id} · ${c.po} · ${mb(c.amount)} M`);
      notify(["exec"], [`คำขอกันเงินเหลื่อมปี ${c.id} รออนุมัติ`, `Carry-over ${c.id} is waiting for approval`], "alloc-carry"); return c; } },
  edit: { can: c => canAlloc() && c.status === "pending", run: (c, v) => { Object.assign(c, { line: v.line, amount: v.amount, po: v.po, poDate: v.poDate, vendor: v.vendor }); audit(["แก้ไขคำขอกันเงินเหลื่อมปี", "Edited a carry-over request"], `${c.id} · ${mb(c.amount)} M`); } },
  acts: c => {
    const out = [];
    if (c.status === "pending" && ROLE === "exec") {
      out.push({ id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", run: () => { c.status = "approved"; audit(["อนุมัติกันเงินไว้เบิกเหลื่อมปี", "Approved a carry-over"], `${c.id} · ${mb(c.amount)} M`); notify(["fin"], [`${c.id} อนุมัติแล้ว บันทึกใน GFMIS`, `${c.id} approved; record it in GFMIS`], "alloc-carry"); return L("อนุมัติแล้ว", "Approved"); } });
      out.push({ id: "no", label: L("ไม่อนุมัติ", "Reject"), kind: "danger", why: true, run: (_, why) => { c.status = "rejected"; c.decision = why; audit(["ไม่อนุมัติกันเงินเหลื่อมปี", "Rejected a carry-over"], `${c.id} · ${why}`); notify(["fin"], [`${c.id} ไม่อนุมัติ: ${why}`, `${c.id} rejected: ${why}`], "alloc-carry"); return L("ไม่อนุมัติแล้ว", "Rejected"); } });
    }
    if (c.status === "pending" && canAlloc()) out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw"), kind: "ghost", why: true, run: (_, why) => { c.status = "withdrawn"; c.decision = why; audit(["ถอนคำขอกันเงินเหลื่อมปี", "Withdrew a carry-over request"], `${c.id} · ${why}`); return L("ถอนคำขอแล้ว", "Withdrawn"); } });
    return out;
  },
  view: c => kv([[L("รายการจัดสรร", "Allocation line"), lineOf(c.line) ? esc(lineLabel(lineOf(c.line))) : c.line], [L("ขอกัน", "Amount"), `${mb(c.amount)} ${L("ลบ.", "M")}`],
    [L("สัญญา", "Contract"), `<span class="mono">${esc(c.po)}</span> · ${fdate(c.poDate)}${c.vendor ? ` · ${esc(c.vendor)}` : ""}`],
    [L("ผลตรวจ", "Checks"), cfChecks(c).map(x => `${dotI(x[0] ? "ok" : "bad")}${x[1]}`).join("<br>")], c.decision && [L("เหตุผล", "Reason"), esc(c.decision)]]),
});

// ---------- appropriation ----------
CRUD.def("alAp", {
  noun: ["วงเงินตาม พ.ร.บ.", "Appropriation"], list: () => [AL()], id: A => A.fy, title: A => tx(A.act), sub: A => `${mb(A.total)} ${L("ลบ.", "M")}`,
  cols: [],
  fields: A => [
    { id: "act", label: ["ชื่อ พ.ร.บ.", "Act"], req: true, value: tx(A.act), wide: true },
    { id: "date", label: ["วันที่มีผล", "In force from"], type: "date", value: A.date || "" },
    ...BUDGET_TYPES.map(t => ({ id: "t_" + t.id, label: [`${t.name[0]} (ล้านบาท)`, `${t.name[1]} (million baht)`], type: "money", value: A.byType[t.id] || 0, min: allocated(t.id), hint: `${L("จัดสรรแล้ว", "Allocated")} ${mb(allocated(t.id))}` })),
  ],
  edit: { can: () => canAlloc(), why: () => true,
    run: (A, v, why) => { const was = A.total; A.act = [v.act, v.act]; A.date = v.date || A.date; BUDGET_TYPES.forEach(t => (A.byType[t.id] = v["t_" + t.id] || 0)); A.total = sumv(Object.values(A.byType));
      audit(["แก้ไขวงเงินตาม พ.ร.บ.", "Edited the appropriation"], `${A.fy} · ${mb(was)} → ${mb(A.total)} · ${why}`); } },
  view: A => kv([[L("ชื่อ", "Act"), esc(tx(A.act))], [L("วันที่", "Date"), A.date ? fdate(A.date) : "–"], [L("รวม", "Total"), `${mb(A.total)} ${L("ลบ.", "M")}`],
    ...BUDGET_TYPES.filter(t => A.byType[t.id]).map(t => [typeName(t.id), `${mb(A.byType[t.id])} · ${L("จัดสรรแล้ว", "allocated")} ${mb(allocated(t.id))}`])]),
  hist: A => String(A.fy),
});
const crHere = key => (CR_OPEN && CR_OPEN.key === key ? crDrawer() : "");

// ---------- pages ----------
{
  const ap = ALLOC.appropriation;
  ALLOC.appropriation = () => {
    const h = ap(), btn = canAlloc() ? `<button class="btn" type="button" data-cropen="alAp|${ALLOC_FY}">${L("แก้ไขวงเงิน", "Edit appropriation")}</button>` : "";
    return h.replace(/(<section class="panel"><header><h2>[^<]*<\/h2><span class="sp"><\/span>)/, `$1${btn} `) + crHere("alAp");
  };
}
ALLOC.allocate = () => {
  const A = AL(), d = (A.drafts || []).length;
  return crudList("alLine", {
    head: `<h2>${L("บรรทัดจัดสรรรายหน่วยงานและโครงการ", "Allocation lines by unit and project")}</h2><span class="sp"></span><span class="sub">${L("จัดสรรแล้ว", "Allocated")} ${mb(allocated())} / ${mb(A.total)} ${L("ลบ.", "M")}${d ? ` · ${d} ${L("ร่าง", "drafts")}` : ""}</span>`,
    after: `<div class="body sub">${L("ยังไม่จัดสรรตามงบรายจ่าย", "Unallocated by type")}: ${BUDGET_TYPES.filter(t => A.byType[t.id]).map(t => `${tx(t.name)} ${mb(typeRoom(t.id))}`).join(" · ")}</div>`,
    empty: L("ยังไม่มีบรรทัดจัดสรร", "No allocation lines yet"),
  });
};
ALLOC.transfers = () => crudList("alTr", {
  head: `${chipIco("scale", "info")}<h2>${L("การโอนเปลี่ยนแปลงตามระเบียบ", "Transfers by the regulation")}</h2><span class="sp"></span><span class="mono sub">R-B-01</span>`,
  after: `<div class="body sub">${L("ระบบจัดประเภทการโอนจากโครงสร้างงบประมาณของบรรทัดต้นทางและปลายทาง: T1 ภายในผลผลิต (รายงานสำนักงบประมาณภายใน 15 วัน) · T2 ข้ามผลผลิต · T3 ข้ามแผนงาน (ต้องตกลงสำนักงบประมาณ) · T4 โครงการใหม่ (ต้องเสนอ ครม.) · T6 เงินที่ขยายเวลาแล้ว · คำขอที่รออนุมัติแก้ไขหรือถอนได้", "Transfers are classified from both lines' budget structure: T1 within an output (report within 15 days) · T2 across outputs · T3 across programmes (Budget Bureau agreement) · T4 new project (Cabinet) · T6 extended money · a pending request can be edited or withdrawn")}</div>`,
  empty: L("ยังไม่มีการโอน", "No transfers yet"),
});
{
  const rel = ALLOC.releases;
  // keep the quarterly plan table; the requests become a list with a drawer
  ALLOC.releases = () => { const h = rel().replace(/<div class="body"><form class="inline-form" id="rl-form">[\s\S]*?<\/form>\s*<p class="sub" id="rl-hint"><\/p><\/div>/, "");
    const i = h.indexOf(`<section class="panel"><header><h2>${L("รายการขออนุมัติงวดเงิน", "Release requests")}`);
    return (i > 0 ? h.slice(0, i) : h) + crudList("alRel", { head: `<h2>${L("คำขออนุมัติงวดเงิน", "Release requests")}</h2>`, empty: L("ยังไม่มีคำขอ", "No requests yet") }); };
}
{
  const cr = ALLOC.carry;
  ALLOC.carry = () => { const h = cr(); if (ALLOC_FY !== 2570) return h;
    const i = h.lastIndexOf(`<section class="panel"><header><h2>${L("ขอกันเงินปี 2570 ไว้เบิกเหลื่อมปี", "FY2570 carry-over requests")}`);
    return (i > 0 ? h.slice(0, i) : h) + crudList("alCf", { head: `<h2>${L("ขอกันเงินปี 2570 ไว้เบิกเหลื่อมปี", "FY2570 carry-over requests")}</h2><span class="sp"></span><span class="sub">${L("ยื่นได้ถึง", "File by")} ${fdate(FY_END)} · ${daysUntil(FY_END)} ${L("วัน", "days")}</span>`,
      after: `<div class="body sub">${L("ต้องมีสัญญาที่ลงนามภายในปีงบประมาณ และบันทึกในระบบ GFMIS ก่อนสิ้นปี", "Needs a contract signed within the fiscal year, recorded in GFMIS before year end")}</div>`, empty: L("ยังไม่มีคำขอกันเงิน", "No carry-over requests yet") }); };
}
// Savings: a decision can be reversed while no transfer has been made from it (FR-C-33).
const savTrOf = c => AL().transfers.find(t => t.from === c.line && t.saving === c.id && !["withdrawn", "rejected"].includes(t.status));
ALLOC.savings = () => {
  if (ALLOC_FY !== B4_FY) return `<section class="panel"><div class="body sub">${L("เงินเหลือจ่ายมีเฉพาะปีที่กำลังใช้จ่าย (2570)", "Savings exist for the year being spent (2570)")}</div></section>`;
  const rows = S.contracts.map(c => { const p = famPlan(c.plan), sav = (p.est || 0) - c.amount; return { c, p, sav, l: lineOf(c.line) }; }).filter(x => x.sav > 0);
  const opt = x => {
    if (x.c.savUse) { const t = savTrOf(x.c);
      return `${tag(x.c.savUse === "keep" ? L("คงไว้ในบรรทัด", "Kept in the line") : t ? `${L("โอนแล้ว", "Transfer")} ${t.id}` : L("เลือกโอน (ยังไม่ยื่น)", "Transfer chosen (not filed)"), "p-ok")}${canAlloc() && !t ? ` <button class="btn ghost" type="button" data-savundo="${x.c.id}">${L("กลับการตัดสินใจ", "Undo decision")}</button>` : ""}`; }
    return canAlloc() ? `<div class="row" style="flex-wrap:nowrap"><button class="btn" type="button" data-savtr="${x.c.id}">${L("โอนตามระเบียบ", "Transfer it")}</button><button class="btn ghost" type="button" data-savkeep="${x.c.id}">${L("คงไว้", "Keep")}</button></div>` : "–";
  };
  return `<section class="panel"><header>${chipIco("coins", "info")}<h2>${L("เงินเหลือจ่ายจากการจัดซื้อจัดจ้าง", "Savings from procurement")}</h2><span class="sp"></span><b class="num">${mb(sumv(rows.map(x => x.sav)))}</b>&nbsp;${L("ลบ.", "M")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา", "Contract")}</th><th>${L("บรรทัด", "Line")}</th><th class="n">${L("ประมาณการ", "Estimate")}</th><th class="n">${L("ราคาสัญญา", "Contract price")}</th><th class="n">${L("เหลือจ่าย", "Saving")}</th><th>${L("ทางเลือก", "Options")}</th></tr></thead>
      <tbody>${rows.map(x => `<tr><td><span class="mono">${x.c.id}</span><div class="sub">${esc(tx(x.c.vendor))}</div></td><td>${x.l ? esc(lineLabel(x.l)) : x.c.line}</td><td class="n">${mb(x.p.est)}</td><td class="n">${mb(x.c.amount)}</td><td class="n"><b>${mb(x.sav)}</b></td><td>${opt(x)}</td></tr>`).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มีเงินเหลือจ่าย", "No savings yet")}</td></tr>`}</tbody></table></div>
    <div class="body sub">${L("เงินเหลือจ่าย = ประมาณการในแผนจัดซื้อ − ราคาสัญญา · กลับการตัดสินใจได้จนกว่าจะยื่นโอน · งบกลางที่เหลือจ่ายต้องส่งคืนสำนักงบประมาณภายใน 15 วัน (ข้อ 33, BR-19)", "Saving = procurement plan estimate − contract price · a decision can be reversed until a transfer is filed · central-fund savings go back to the Budget Bureau within 15 days (clause 33, BR-19)")}</div></section>`;
};
// Plan versions: the latest version can be dropped (FR-C-29).
{
  const pl = ALLOC.plan;
  ALLOC.plan = () => { const A = AL(), pv = A.planVersions || [];
    const h = pl(); return pv.length > 1 && (canAlloc() || ROLE === "plan") ? h.replace(/(<button class="btn" type="button" id="pv-save">[^<]*<\/button>)/, `$1<button class="btn ghost" type="button" id="pv-drop">${L("ลบรุ่นล่าสุด", "Drop the latest version")} (v${pv[pv.length - 1].v})</button>`) : h; };
}
{
  const bb = BIND.allocation;
  BIND.allocation = () => {
    bb();
    $$("[data-savtr]").forEach(btn => (btn.onclick = () => { const c = S.contracts.find(x => x.id === btn.dataset.savtr), sav = famPlan(c.plan).est - c.amount; c.savUse = "transfer";
      B4_PREFILL = { from: c.line, amount: sav, why: L(`เงินเหลือจ่ายจากสัญญา ${c.id}`, `Saving from contract ${c.id}`), saving: c.id }; ALLOC_TAB = "transfers"; crOpen("alTr", "", "edit"); save(); route(); }));
    $$("[data-savundo]").forEach(btn => (btn.onclick = () => { const c = S.contracts.find(x => x.id === btn.dataset.savundo), snap = crSnap(); delete c.savUse; audit(["กลับการตัดสินใจเรื่องเงินเหลือจ่าย", "Reversed a savings decision"], c.id); commit(); route(); crUndoOffer(snap, L("กลับการตัดสินใจแล้ว", "Decision reversed")); }));
    const pd = $("#pv-drop"); if (pd) pd.onclick = () => { const A = AL(), snap = crSnap(), v = A.planVersions.pop(); audit(["ลบแผนการใช้จ่ายรุ่นล่าสุด", "Dropped the latest spending plan version"], `v${v.v}`); commit(); route(); crUndoOffer(snap, `${L("ลบรุ่น", "Dropped")} v${v.v}`); };
  };
}
// A transfer raised from a saving remembers it, so the saving's decision can't be reversed while the transfer stands.
{
  const sp = CRUD.defs.alTr, run = sp.create.run;
  sp.create.run = v => { const s = B4_PREFILL && B4_PREFILL.saving, t = run(v); if (s) t.saving = s; return t; };
}
