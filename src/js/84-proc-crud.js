// Procurement CRUD round PC1 (Fisko_Procurement_CRUD_Design.html): P2 plan items and plan versions, and P3
// requisitions move onto the shared list + drawer (76-crud.js). A plan item can be edited before it is
// requisitioned, deleted while it is a draft nobody has seen, and cancelled with a reason after that. A requisition
// is saved as a draft, sent, withdrawn, returned for changes, rejected with a reason, or cancelled once approved.
// Next year's budget requests become draft items of next year's plan (FL-PC-02).
let PP_FY = FAM_FY, PC_RQ_PLAN = null;
const ppNext = () => (S.pplanNext = S.pplanNext || []);
const ppMine = p => !!p && famLine(p.line).unit === me().unit && (ROLE === "div" || ROLE === "divhead");
const ppEverListed = p => S.planDoc.versions.some(v => v.items.some(x => x.id === p.id));
const ppLiveReq = p => S.reqn.find(r => r.plan === p.id && ["draft", "pending", "returned", "approved", "contracted"].includes(r.status));
const ppLiveCon = p => S.contracts.find(c => c.plan === p.id && c.status !== "terminated");
const ppSt = p => (p.cancelled ? "cancelled" : p.fy && p.fy !== FAM_FY ? "draft" : p.status === "planned" && !inPublishedPlan(p) ? "draft" : p.status);
// Who may raise a requisition for a plan item: the owning unit (division staff or director), or procurement on its behalf (D-PC-03).
const ppCanRaise = p => !p.cancelled && !p.fy && p.status === "planned" && inPublishedPlan(p) && !ppLiveReq(p) && (isProcRole() || ppMine(p));
const ppAuto = est => (est <= S.pcfg.specificMax ? "specific" : "ebid");
const PP_ST = { draft: [["ร่าง", "Draft"], "p-mute"], planned: [["อยู่ในแผน", "Planned"], "p-info"], requisitioned: [["ขอซื้อแล้ว", "Requisitioned"], "p-info"], contracted: [["ทำสัญญาแล้ว", "Contracted"], "p-ok"], closed: [["ปิด", "Closed"], "p-mute"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
Object.assign(PV_ST, { published: [["ประกาศแล้ว", "Published"], "p-ok"], withdrawn: [["ถอน", "Withdrawn"], "p-mute"] });
Object.assign(REQ_ST, { cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] });
const pcDel = id => { S.delIds = S.delIds || []; if (!S.delIds.includes(id)) S.delIds.push(id); };

// ---------- P2 plan items (FR-PC-01, FR-PC-04) ----------
CRUD.def("ppItem", {
  noun: ["รายการในแผนจัดซื้อ", "Plan item"], st: PP_ST, live: true,
  list: () => (PP_FY === FAM_FY ? S.pplan : ppNext()), id: p => p.id, title: p => tx(p.name),
  sub: p => (p.fy ? `${fyLabel(p.fy)} · ${L("จากคำขอ", "from request")} ${p.req}` : `${esc(lineLabel(famLine(p.line)))} · <span class="mono">${p.line}</span>`),
  status: ppSt, gone: p => !!p.cancelled, search: p => `${p.id} ${p.name.join(" ")} ${p.line || ""}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(PP_ST).map(k => [k, tx(PP_ST[k][0])]), get: ppSt },
    { id: "unit", label: ["หน่วยงาน", "Unit"], opts: () => S.units.map(u => [u.id, tx(u.name)]), get: p => (p.fy ? p.unit : famLine(p.line).unit) }],
  cols: [{ h: ["เลขที่", "No."], c: p => `<span class="mono">${p.id}</span>` },
    { h: ["รายการ", "Item"], c: p => `<b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub">${p.fy ? `${unitName(p.unit)} · ${p.req}` : esc(lineLabel(famLine(p.line)))} · ${catName(p.cat)}</div>` },
    { h: ["วิธี", "Method"], c: p => `<span class="sub">${tx(PMETHOD[p.method] || ["–", "–"])}</span>` },
    { h: ["ประมาณการ (ลบ.)", "Estimate (M)"], n: true, c: p => mb(p.est) }, { h: ["กำหนด", "Planned"], c: p => `<span class="sub">${fdate(p.month)}</span>` }],
  fields: (p, v) => {
    const line = v.line || (p && p.line) || "", est = v.est || (p && p.est) || 0;
    const lines = famLines().filter(l => l.type === "inv" || l.type === "ope");
    return [
      p && p.fy ? { id: "_src", label: ["ที่มา", "Source"], type: "info", wide: true, html: `${L("คำของบประมาณ", "Budget request")} <span class="mono">${p.req}</span> · ${unitName(p.unit)}` }
        : { id: "line", label: ["รายการจัดสรร (B7)", "Allocation line (B7)"], type: "select", req: true, wide: true, value: line, blank: L("— เลือกรายการจัดสรร —", "— choose an allocation line —"), opts: lines.map(l => [l.id, `${lineLabel(l)} · ${mb(l.amount)}`]),
          hint: line ? `${L("วงเงินคงเหลือ", "Room left")} ${mb(famHeadroom(line))} ${L("ลบ.", "M")}` : "" },
      { id: "name", label: ["รายการจัดซื้อจัดจ้าง", "Item to buy"], req: true, wide: true, value: p ? tx(p.name) : "" },
      { id: "est", label: ["ประมาณการ (ล้านบาท)", "Estimate (million baht)"], type: "money", req: true, min: 1000, value: p ? p.est : "" },
      { id: "month", label: ["กำหนดดำเนินการ", "Planned date"], type: "date", req: true, value: p ? p.month : addDays(TODAY, 60) },
      { id: "cat", label: ["หมวดพัสดุ", "Category"], type: "select", req: true, value: p ? p.cat || "" : (S.pcat[0] || {}).id, opts: (S.pcat || []).map(c => [c.id, tx(c.name)]) },
      { id: "method", label: ["วิธีที่วางแผน", "Planned method"], type: "select", req: true, value: v.method || (p ? p.method : ppAuto(est)), opts: Object.keys(PMETHOD).map(k => [k, tx(PMETHOD[k])]),
        hint: `${L("แนะนำตามวงเงิน", "Suggested by value")}: ${tx(PMETHOD[ppAuto(est)])} (${L("เพดานเฉพาะเจาะจง", "specific ceiling")} ${fmt(S.pcfg.specificMax)} ${L("บาท", "baht")})` },
      ...(p && !p.fy && inPublishedPlan(p) ? [{ id: "_note", label: ["หมายเหตุ", "Note"], type: "info", wide: true, html: L("รายการนี้อยู่ในแผนที่ประกาศแล้ว การแก้ไขจะอยู่ในแผนฉบับถัดไป (R-PC-01)", "This item is in the published plan; the change goes into the next plan version (R-PC-01)") }] : []),
    ];
  },
  check: v => (v.est > 0 ? [] : [{ f: "est", m: L("ใส่ประมาณการ", "Enter an estimate") }]),
  create: { can: () => isProcRole() && PP_FY === FAM_FY, label: ["เพิ่มรายการในแผน", "Add a plan item"], run: v => {
    const p = { id: nextId("PP", S.pplan), line: v.line, name: [v.name, v.name], est: v.est, method: v.method, month: v.month, by: me().id, status: "planned", egp: null, cat: v.cat };
    p.kind = ((S.pcat || []).find(c => c.id === p.cat) || {}).kind || guessKind(famLine(p.line), p.name);
    S.pplan.push(p); caseNew(p); audit(["เพิ่มรายการในแผนจัดซื้อ", "Added a procurement plan item"], `${p.id} ${v.name}`); return p; } },
  edit: { can: p => isProcRole() && !p.cancelled && (p.fy ? true : p.status === "planned" && !ppLiveReq(p)), run: (p, v) => {
    const old = `${mb(p.est)}/${p.method}`; p.name = [v.name, v.name]; p.est = v.est; p.month = v.month; p.cat = v.cat; p.method = v.method;
    if (!p.fy && v.line && v.line !== p.line) { p.line = v.line; const c = caseByPlan(p.id); if (c) c.line = v.line; }
    p.kind = ((S.pcat || []).find(c => c.id === p.cat) || {}).kind || p.kind;
    audit(["แก้ไขรายการในแผนจัดซื้อ", "Edited a procurement plan item"], `${p.id}: ${old} → ${mb(p.est)}/${p.method}`); } },
  acts: p => {
    if (!isProcRole() || p.cancelled) return [];
    const canDel = p.fy ? true : p.status === "planned" && !ppEverListed(p) && !S.reqn.some(r => r.plan === p.id);
    if (canDel) return [{ id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", confirm: L("ลบรายการนี้และแฟ้มจัดซื้อที่ผูกอยู่ เลขที่จะไม่ถูกนำกลับมาใช้", "Delete this item and its case file. The number is not reused."), run: () => {
      if (p.fy) S.pplanNext = ppNext().filter(x => x !== p);
      else { S.pplan = S.pplan.filter(x => x !== p); const c = caseByPlan(p.id); if (c) { S.cases = S.cases.filter(x => x !== c); pcDel(c.id); } }
      pcDel(p.id); audit(["ลบร่างรายการในแผนจัดซื้อ", "Deleted a draft plan item"], p.id); return L("ลบแล้ว", "Deleted"); } }];
    if (ppLiveCon(p) || p.status === "contracted" || p.status === "closed") return [];
    return [{ id: "cancel", label: L("ยกเลิกรายการ", "Cancel item"), kind: "danger", why: true,
      impact: () => { const r = ppLiveReq(p); return `${L("ตัดออกในแผนฉบับถัดไป แฟ้มจัดซื้อถูกยกเลิก", "Removed in the next plan version; the case file is cancelled")}${r ? ` · ${L("ใบขอ", "requisition")} ${r.id} ${L("ถูกยกเลิกและคืนวงเงินที่จอง", "is cancelled and its reservation released")}` : ""}`; },
      run: (_, why) => {
        const c = caseByPlan(p.id);
        if (c && !c.cancelled) { if (caseState(c) >= 2) caseCancel(c, why); else { c.cancelled = { why, by: me().id, t: nowIso() }; caseLog(c, "cancelled", why); } }
        S.reqn.filter(r => r.plan === p.id && ["draft", "returned", "pending", "approved"].includes(r.status)).forEach(r => (r.status = "cancelled"));
        p.cancelled = { why, by: me().id, t: nowIso() }; p.status = "cancelled";
        audit(["ยกเลิกรายการในแผนจัดซื้อ", "Cancelled a procurement plan item"], `${p.id} · ${why}`); return L("ยกเลิกแล้ว", "Cancelled"); } }];
  },
  view: p => {
    const c = !p.fy && caseByPlan(p.id), r = !p.fy && ppLiveReq(p), l = famLine(p.line);
    return kv([p.fy ? [L("ปีงบประมาณ", "Fiscal year"), fyLabel(p.fy)] : [L("รายการจัดสรร", "Allocation line"), `${esc(lineLabel(l))} <span class="mono sub">${l.id}</span>`],
      p.fy ? [L("คำของบประมาณ", "Budget request"), `<span class="mono">${p.req}</span> · ${unitName(p.unit)}`] : [L("วงเงินคงเหลือของรายการ", "Room left on the line"), `${mb(famHeadroom(p.line))} ${L("ลบ.", "M")}`],
      [L("ประมาณการ", "Estimate"), `${fmt(p.est)} ${L("บาท", "baht")}`], [L("วิธีที่วางแผน", "Planned method"), tx(PMETHOD[p.method] || ["–", "–"])], [L("กำหนดดำเนินการ", "Planned date"), fdate(p.month)], [L("หมวดพัสดุ", "Category"), catName(p.cat)],
      !p.fy && [L("แผนที่ประกาศ", "Published plan"), inPublishedPlan(p) ? L("อยู่ในฉบับที่ประกาศ", "In the published version") : L("ยังไม่อยู่ในฉบับที่ประกาศ ต้องเสนอแผนฉบับใหม่ก่อนขอซื้อ", "Not in the published version yet; propose a new plan version before raising a requisition")],
      r && [L("ใบขอซื้อขอจ้าง", "Requisition"), `<span class="mono">${r.id}</span> ${stTag(REQ_ST, r.status)}`],
      c && [L("แฟ้มจัดซื้อ", "Case file"), `<span class="mono">${c.id}</span> · ${L("ขั้น", "step")} ${caseState(c)}`],
      p.cancelled && [L("เหตุผลที่ยกเลิก", "Why cancelled"), `${esc(p.cancelled.why)} <span class="sub">${esc(userName(p.cancelled.by))} · ${fdate(p.cancelled.t, true)}</span>`]])
      + (p.fy ? `<p class="sub">${L(`เป็นร่างของแผนปี ${p.fy} เสนอและขอซื้อได้เมื่อปีนั้นมีรายการจัดสรร`, `A draft of the FY${p.fy} plan; it can be proposed and requisitioned once that year has allocation lines`)}</p>` : "")
      + `<div class="row">${ppCanRaise(p) ? `<button class="btn primary" type="button" data-ppraise="${p.id}">${L("ขอซื้อขอจ้าง", "Raise a requisition")}</button>` : ""}${c && isProcRole() ? `<button class="btn" type="button" data-rqcase="${c.id}">${L("เปิดแฟ้มจัดซื้อ", "Open the case")}</button>` : ""}</div>`;
  },
  hist: p => p.id,
});

// ---------- P2 plan versions (FR-PC-02, FR-PC-03) ----------
const pvSt = v => (v.status === "approved" && v.published ? "published" : v.status);
const pvDiffHtml = d => `<ul style="margin:4px 0 0;padding-left:18px">${[...d.added.map(x => [x, L("เพิ่ม", "Added"), "p-ok"]), ...d.changed.map(x => [x, L("แก้ไข", "Changed"), "p-info"]), ...d.removed.map(x => [x, L("ตัดออก", "Removed"), "p-bad"])]
  .map(([x, t, cls]) => `<li><span class="mono">${x.id}</span> ${esc(tx(x.name))} ${tag(t, cls)}</li>`).join("")}</ul>`;
CRUD.def("pvVer", {
  noun: ["แผนจัดซื้อฉบับ", "Plan version"], st: PV_ST,
  list: () => S.planDoc.versions.slice().reverse(), id: v => "v" + v.v, title: v => `${L("แผนจัดซื้อจัดจ้าง", "Procurement plan")} ${fyLabel(S.planDoc.fy)} v${v.v}`,
  sub: v => `${esc(userName(v.by))} · ${fdate(v.t, true)}`, status: pvSt, gone: v => v.status === "withdrawn",
  cols: [{ h: ["ฉบับ", "Version"], c: v => `<b>v${v.v}</b>` }, { h: ["เหตุผล", "Why"], c: v => `<span class="sub">${esc(v.why)}</span>` },
    { h: ["รายการ", "Items"], n: true, c: v => v.items.length }, { h: ["รวม (ลบ.)", "Total (M)"], n: true, c: v => mb(sumv(v.items.map(x => x.est))) },
    { h: ["ประกาศ", "Notice"], c: v => (v.published ? `<span class="mono sub">${esc(v.published.ref)}</span>` : "–") }],
  fields: () => [{ id: "_d", label: ["การเปลี่ยนแปลงจากฉบับที่อนุมัติ", "Changes from the approved version"], type: "info", wide: true, html: pvDiffHtml(planDiff(planApproved(), planLive().map(snap))) },
    { id: "why", label: ["เหตุผลที่ปรับแผน", "Why the plan changes"], type: "textarea", req: true, wide: true, value: "" }],
  check: v => (v.why.length < 5 ? [{ f: "why", m: L("ระบุเหตุผลอย่างน้อย 5 ตัวอักษร", "Give a reason of at least 5 characters") }] : []),
  create: { can: () => isProcRole() && planDiff(planApproved(), planLive().map(snap)).n > 0 && !S.planDoc.versions.some(x => x.status === "submitted"), label: ["เสนอแผนฉบับใหม่", "Propose a new version"], run: v => {
    const n = Math.max(...S.planDoc.versions.map(x => x.v)) + 1, ver = { v: n, t: nowIso(), by: me().id, why: v.why, status: "submitted", items: planLive().map(snap), appr: null, published: null };
    S.planDoc.versions.push(ver); audit(["เสนอแผนจัดซื้อฉบับใหม่", "Proposed a new procurement plan version"], `v${n}`);
    notify(["exec"], [`แผนจัดซื้อฉบับ v${n} รออนุมัติ`, `Procurement plan v${n} needs approval`], "prc-plan"); return ver; } },
  acts: v => {
    const out = [];
    if (v.status === "submitted") {
      if ((ROLE === "exec" || canSpend()) && v.by !== me().id) out.push(
        { id: "ok", label: L("อนุมัติแผนฉบับนี้", "Approve this version"), kind: "primary", impact: () => L("เมื่อประกาศแล้ว ขอซื้อได้เฉพาะรายการในฉบับนี้", "Once published, only the items in this version can be requisitioned"), run: () => {
          v.status = "approved"; v.appr = { by: me().id, t: nowIso() }; audit(["อนุมัติแผนจัดซื้อ", "Approved the procurement plan"], `v${v.v}${onBehalf("exec", "spend")}`);
          notify(["proc", "prochead"], [`แผนจัดซื้อ v${v.v} อนุมัติแล้ว รอประกาศ`, `Procurement plan v${v.v} is approved and waiting to be published`], "prc-plan"); return L("อนุมัติแล้ว", "Approved"); } },
        { id: "no", label: L("ไม่อนุมัติ", "Reject"), kind: "danger", why: true, run: (_, why) => {
          v.status = "rejected"; v.appr = { by: me().id, t: nowIso(), why }; audit(["ไม่อนุมัติแผนจัดซื้อ", "Rejected the procurement plan"], `v${v.v} · ${why}`);
          notify(["proc", "prochead"], [`แผนจัดซื้อ v${v.v} ไม่ได้รับอนุมัติ`, `Procurement plan v${v.v} was rejected`], "prc-plan"); return L("ไม่อนุมัติแล้ว", "Rejected"); } });
      if (isProcRole()) out.push({ id: "wd", label: L("ถอนฉบับนี้", "Withdraw"), why: true, run: (_, why) => {
        v.status = "withdrawn"; v.withdrawn = { by: me().id, t: nowIso(), why }; audit(["ถอนแผนจัดซื้อฉบับที่เสนอ", "Withdrew a proposed plan version"], `v${v.v} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    }
    if (v.status === "approved" && !v.published && isProcRole() && planApproved() === v) out.push({ id: "pub", label: L("บันทึกการประกาศใน e-GP", "Record the e-GP notice"), kind: "primary", why: true, whyMin: 3,
      whyLabel: L("เลขที่ประกาศใน e-GP", "e-GP notice number"), sim: () => `EGP-PLAN-${FAM_FY % 100}-${String(S.planDoc.versions.filter(x => x.published).length + 1).padStart(4, "0")}`, run: (_, ref) => {
        v.published = { date: TODAY, ref, by: me().id }; audit(["บันทึกการประกาศแผนจัดซื้อ", "Recorded the plan publication"], `v${v.v} ${ref}`); return L("ประกาศแล้ว ขอซื้อรายการในฉบับนี้ได้", "Published; items in this version can now be requisitioned"); } });
    return out;
  },
  view: v => kv([[L("เสนอโดย", "Proposed by"), `${esc(userName(v.by))} · ${fdate(v.t, true)}`], [L("เหตุผล", "Why"), esc(v.why)],
    v.appr && [v.status === "rejected" ? L("ไม่อนุมัติโดย", "Rejected by") : L("อนุมัติโดย", "Approved by"), `${esc(userName(v.appr.by))} · ${fdate(v.appr.t, true)}${v.appr.why ? ` · ${esc(v.appr.why)}` : ""}`],
    v.withdrawn && [L("ถอนโดย", "Withdrawn by"), `${esc(userName(v.withdrawn.by))} · ${esc(v.withdrawn.why)}`],
    v.published && [L("ประกาศ", "Published"), `${esc(v.published.ref)} · ${fdate(v.published.date)}`]])
    + `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("ประมาณการ (ลบ.)", "Estimate (M)")}</th></tr></thead><tbody>${v.items.map(x => `<tr><td class="mono">${x.id}</td><td>${esc(tx(x.name))}</td><td class="n">${mb(x.est)}</td></tr>`).join("")}</tbody></table></div>`,
  hist: v => `v${v.v}`,
});

// ---------- P3 requisitions (FR-PC-05 to FR-PC-07) ----------
const rqMine = r => r.by === me().id || isProcRole() || ppMine(famPlan(r.plan));
function rqProblem(r) {
  const p = famPlan(r.plan);
  if (!inPublishedPlan(p)) return L("รายการนี้ไม่อยู่ในแผนที่ประกาศแล้ว", "This item isn't in the published plan");
  if (r.amount > famHeadroom(p.line)) return L(`เกินวงเงินคงเหลือของรายการจัดสรร (${mb(famHeadroom(p.line))} ลบ.)`, `More than the room left on the line (${mb(famHeadroom(p.line))} M)`);
  if (splitRisk(p, r.amount).risk && (r.splitWhy || "").length < 10) return L("เข้าข่ายแบ่งซื้อ (R-02) แก้ไขใบขอแล้วกรอกคำชี้แจง", "May be a split purchase (R-02); edit the requisition and explain");
  return "";
}
const rqCase = r => caseByPlan(r.plan);
CRUD.def("pcReq", {
  noun: ["ใบขอซื้อขอจ้าง", "Requisition"], st: REQ_ST, live: true,
  list: () => S.reqn.slice().reverse(), id: r => r.id, title: r => tx(famPlan(r.plan).name), sub: r => `<span class="mono">${r.plan}</span> · ${esc(userName(r.by))}${r.forUnit ? ` · ${L("ขอแทน", "for")} ${unitName(r.forUnit)}` : ""}`,
  status: r => r.status, gone: r => ["rejected", "cancelled"].includes(r.status), search: r => `${r.id} ${r.plan} ${famPlan(r.plan).name.join(" ")}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(REQ_ST).map(k => [k, tx(REQ_ST[k][0])]), get: r => r.status },
    { id: "unit", label: ["หน่วยงาน", "Unit"], opts: () => S.units.map(u => [u.id, tx(u.name)]), get: r => famLine(famPlan(r.plan).line).unit }],
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` },
    { h: ["รายการในแผน", "Plan item"], c: r => `<b style="font-weight:600">${esc(tx(famPlan(r.plan).name))}</b><div class="sub"><span class="mono">${r.plan}</span> · ${unitName(famLine(famPlan(r.plan).line).unit)}</div>` },
    { h: ["ผู้ขอ", "Requester"], c: r => `${esc(userName(r.by))}<div class="sub">${fdate(r.t, true)}</div>` },
    { h: ["วงเงิน (ลบ.)", "Amount (M)"], n: true, c: r => mb(r.amount) }, { h: ["คงเหลือบนรายการ (ลบ.)", "Room on line (M)"], n: true, c: r => mb(famHeadroom(famPlan(r.plan).line)) }],
  prefill: () => { const p = famPlan(PC_RQ_PLAN || ""); return PC_RQ_PLAN ? { plan: p.id, amount: p.est, need: p.month } : null; },
  fields: (r, v) => {
    const opts = S.pplan.filter(ppCanRaise), pid = r ? r.plan : v.plan || (opts[0] || {}).id || "", p = famPlan(pid), amount = v.amount !== undefined && v.amount !== "" ? v.amount : r ? r.amount : p.est;
    const sp = pid ? splitRisk(p, amount || 0) : { risk: false };
    return [
      r ? { id: "plan", label: ["รายการในแผน", "Plan item"], lock: true, wide: true, value: pid, show: `<span class="mono">${pid}</span> ${esc(tx(p.name))}` }
        : { id: "plan", label: ["รายการในแผน (ฉบับที่ประกาศ)", "Plan item (published version)"], type: "select", req: true, wide: true, value: pid, blank: opts.length ? "" : L("— ไม่มีรายการที่ขอได้ —", "— nothing you can requisition —"), opts: opts.map(x => [x.id, `${x.id} · ${tx(x.name)} · ${mb(x.est)}`]) },
      { id: "_room", label: ["วงเงินคงเหลือของรายการจัดสรร", "Room left on the allocation line"], type: "info", html: pid ? `${mb(famHeadroom(p.line))} ${L("ลบ.", "M")} · ${esc(lineLabel(famLine(p.line)))}` : "–" },
      { id: "amount", label: ["วงเงิน (ล้านบาท)", "Amount (million baht)"], type: "money", req: true, min: 1000, value: amount },
      { id: "need", label: ["วันที่ต้องการใช้", "Needed by"], type: "date", req: true, value: r ? r.need || p.month : p.month },
      { id: "why", label: ["เหตุผลความจำเป็น", "Justification"], type: "textarea", req: true, wide: true, value: r ? tx(r.why) : L(`จำเป็นต่อการดำเนินงานตามแผนปีงบประมาณ ${FAM_FY}`, `Needed to deliver the FY${FAM_FY} work plan`) },
      ...(sp.risk || (r && r.splitWhy) ? [{ id: "splitWhy", label: ["คำชี้แจงการแบ่งซื้อ (R-02)", "Split-purchase explanation (R-02)"], type: "textarea", wide: true, value: r ? r.splitWhy || "" : "",
        hint: sp.risk ? L(`มีรายการประเภทเดียวกันในหน่วยเดียวกันภายใน ${sp.days} วัน รวม ${fmt(sp.total)} บาท เกินเพดานวิธีเฉพาะเจาะจง`, `Similar requests in the same unit within ${sp.days} days total ${fmt(sp.total)} baht, above the specific-method ceiling`) : "" }] : []),
    ];
  },
  check: (v, r) => {
    const p = famPlan(r ? r.plan : v.plan), e = [];
    if (!p.line) return [{ f: "plan", m: L("เลือกรายการในแผน", "Choose a plan item") }];
    if (v.amount > famHeadroom(p.line)) e.push({ f: "amount", m: L(`เกินวงเงินคงเหลือ ${mb(famHeadroom(p.line))} ลบ.`, `More than the room left, ${mb(famHeadroom(p.line))} M`) });
    if (splitRisk(p, v.amount || 0).risk && (v.splitWhy || "").length < 10) e.push({ f: "splitWhy", m: L("ชี้แจงอย่างน้อย 10 ตัวอักษร", "Explain in at least 10 characters") });
    return e;
  },
  create: { can: () => S.pplan.some(ppCanRaise), label: ["ขอซื้อขอจ้าง", "Raise a requisition"], run: v => {
    const p = famPlan(v.plan), r = { id: nextId("RQ", S.reqn), plan: p.id, by: me().id, amount: v.amount, why: [v.why, v.why], need: v.need, status: "draft", t: nowIso(), decided: null };
    if (v.splitWhy) r.splitWhy = v.splitWhy;
    if (isProcRole()) r.forUnit = famLine(p.line).unit;
    S.reqn.push(r); PC_RQ_PLAN = null; audit(["ร่างใบขอซื้อขอจ้าง", "Drafted a requisition"], `${r.id} ${p.id}`); return r; } },
  edit: { can: r => ["draft", "returned"].includes(r.status) && rqMine(r), run: (r, v) => {
    r.amount = v.amount; r.why = [v.why, v.why]; r.need = v.need; if (v.splitWhy !== undefined) r.splitWhy = v.splitWhy;
    audit(["แก้ไขใบขอซื้อขอจ้าง", "Edited a requisition"], `${r.id} · ${mb(r.amount)}`); } },
  acts: r => {
    const p = famPlan(r.plan), c = rqCase(r), out = [], mine = rqMine(r), auth = canSpend();
    if (["draft", "returned"].includes(r.status) && mine) {
      if (!rqProblem(r)) out.push({ id: "send", label: L("ส่งขออนุมัติ", "Send for approval"), kind: "primary", impact: () => L(`จองวงเงิน ${mb(r.amount)} ลบ. บนรายการจัดสรร และแฟ้ม ${c ? c.id : ""} ไปขั้นรออนุมัติ`, `Reserves ${mb(r.amount)} M on the allocation line and moves case ${c ? c.id : ""} to approval`), run: () => {
        r.status = "pending"; r.sent = true; r.t = nowIso(); r.returned = null; p.status = "requisitioned"; caseOnRaise(p, r);
        if (r.splitWhy && splitRisk(p, r.amount).risk) { audit(["ชี้แจงการแตกซื้อ", "Explained a split purchase"], `${r.id} ${p.id}`); if (c) caseLog(c, "split", r.splitWhy); notify(["prochead", "audit"], [`ใบขอซื้อ ${r.id} เข้าข่ายแตกซื้อ มีคำชี้แจง`, `Requisition ${r.id} may be a split purchase; an explanation is attached`], "prc-reqn"); }
        audit(["ขอซื้อขอจ้าง", "Raised a requisition"], `${r.id} ${p.id}`); notify(["exec"], [`ใบขอซื้อขอจ้าง ${r.id} รออนุมัติ`, `Requisition ${r.id} is waiting for approval`], "prc-reqn");
        return L("ส่งขออนุมัติแล้ว", "Sent for approval"); } });
      if (r.status === "draft" && !r.sent) out.push({ id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", confirm: L("ลบใบขอนี้ เลขที่จะไม่ถูกนำกลับมาใช้", "Delete this requisition. The number is not reused."), run: () => {
        S.reqn = S.reqn.filter(x => x !== r); pcDel(r.id); audit(["ลบร่างใบขอซื้อขอจ้าง", "Deleted a draft requisition"], r.id); return L("ลบแล้ว", "Deleted"); } });
    }
    if (r.status === "pending" && mine) out.push({ id: "wd", label: L("ถอนใบขอ", "Withdraw"), why: true, impact: () => L("กลับเป็นร่าง คืนวงเงินที่จอง แก้แล้วส่งใหม่ได้", "Back to draft; the reservation is released; edit and send again"), run: (_, why) => {
      r.status = "draft"; r.withdrawn = { why, by: me().id, t: nowIso() }; p.status = "planned"; if (c) { c.reqn = null; setState(c, 1, "withdrawn", `${r.id} · ${why}`); }
      audit(["ถอนใบขอซื้อขอจ้าง", "Withdrew a requisition"], `${r.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    if (r.status === "pending" && auth) {
      const via = onBehalf("exec", "spend");
      out.push({ id: "ok", label: via ? L("อนุมัติแทน", "Approve on behalf") : L("อนุมัติ", "Approve"), kind: "primary", impact: () => `${L("แฟ้มไปขั้นเลือกวิธีจัดหา", "The case moves to choosing the method")}${via}`, run: () => {
        if (!sodCheck("SD-01", sodActors("exec", "spend"), [r.by], r.id)) return "";
        if (famHeadroom(p.line) < 0) { toast(L("เกินวงเงินคงเหลือของรายการจัดสรร", "More than the room left on the line")); return ""; }
        const au = famAuth(); r.status = "approved"; r.decided = { by: me().id, holder: au.holder, via: au.via, t: nowIso() }; caseOnDecide(p, r, true);
        audit(["อนุมัติขอซื้อขอจ้าง", "Approved a requisition"], `${r.id} ${p.id}${via}`);
        notify(["proc", "div"], [`ใบขอซื้อ ${r.id} อนุมัติแล้ว แฟ้มไปขั้นเลือกวิธีจัดหา`, `Requisition ${r.id} is approved; the case moves to choosing the method`], "prc-reqn"); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "ret", label: L("ส่งคืนแก้ไข", "Return for changes"), why: true, run: (_, why) => {
        r.status = "returned"; r.returned = { why, by: me().id, t: nowIso() }; p.status = "planned"; if (c) { c.reqn = null; setState(c, 1, "returned", `${r.id} · ${why}`); }
        audit(["ส่งคืนใบขอซื้อขอจ้างให้แก้ไข", "Returned a requisition for changes"], `${r.id} · ${why}`); notify(["div"], [`ใบขอซื้อ ${r.id} ถูกส่งคืนให้แก้ไข`, `Requisition ${r.id} was returned for changes`], "prc-reqn"); return L("ส่งคืนแล้ว", "Returned"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Reject"), kind: "danger", why: true, run: (_, why) => {
        const au = famAuth(); r.status = "rejected"; r.decided = { by: me().id, holder: au.holder, via: au.via, t: nowIso(), why }; p.status = "planned"; caseOnDecide(p, r, false);
        audit(["ไม่อนุมัติขอซื้อขอจ้าง", "Rejected a requisition"], `${r.id} · ${why}`); notify(["div"], [`ใบขอซื้อ ${r.id} ไม่ได้รับอนุมัติ`, `Requisition ${r.id} was not approved`], "prc-reqn"); return L("ไม่อนุมัติแล้ว", "Rejected"); } });
    }
    if (r.status === "approved" && (auth || ROLE === "prochead") && !ppLiveCon(p)) out.push({ id: "cancel", label: L("ยกเลิกใบขอ", "Cancel requisition"), kind: "danger", why: true,
      impact: () => L(`แฟ้ม ${c ? c.id : ""} ถูกยกเลิก คืนวงเงินที่จอง ${mb(r.amount)} ลบ. รายการในแผนกลับเป็น “อยู่ในแผน”`, `Case ${c ? c.id : ""} is cancelled, the ${mb(r.amount)} M reservation is released, and the plan item goes back to planned`), run: (_, why) => {
        if (c && !c.cancelled) caseCancel(c, why); r.status = "cancelled"; r.cancelled = { why, by: me().id, t: nowIso() }; p.status = "planned";
        audit(["ยกเลิกใบขอซื้อขอจ้าง", "Cancelled a requisition"], `${r.id} · ${why}`); notify(["div", "proc"], [`ใบขอซื้อ ${r.id} ถูกยกเลิก`, `Requisition ${r.id} was cancelled`], "prc-reqn"); return L("ยกเลิกแล้ว", "Cancelled"); } });
    return out;
  },
  view: r => {
    const p = famPlan(r.plan), c = rqCase(r), prob = ["draft", "returned"].includes(r.status) ? rqProblem(r) : "", why = (o, lab) => o && [lab, `${esc(o.why)} <span class="sub">${esc(userName(o.by))} · ${fdate(o.t, true)}</span>`];
    return (prob ? `<div class="alert"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${L("ยังส่งไม่ได้", "Can't send yet")}</b><p>${prob}</p></div></div>` : "")
      + kv([[L("รายการในแผน", "Plan item"), `<span class="mono">${p.id}</span> ${esc(tx(p.name))}`], [L("รายการจัดสรร", "Allocation line"), `${esc(lineLabel(famLine(p.line)))} <span class="mono sub">${p.line}</span>`],
        [L("ผู้ขอ", "Requester"), `${esc(userName(r.by))}${r.forUnit ? ` · ${L("ขอแทน", "on behalf of")} ${unitName(r.forUnit)}` : ""}`], [L("วงเงิน", "Amount"), `${fmt(r.amount)} ${L("บาท", "baht")}`],
        [L("วงเงินคงเหลือของรายการ", "Room left on the line"), `${mb(famHeadroom(p.line))} ${L("ลบ.", "M")}`], r.need && [L("วันที่ต้องการใช้", "Needed by"), fdate(r.need)], [L("เหตุผลความจำเป็น", "Justification"), esc(tx(r.why))],
        r.splitWhy && [L("คำชี้แจงการแบ่งซื้อ", "Split-purchase explanation"), esc(r.splitWhy)],
        r.decided && [r.status === "rejected" ? L("ไม่อนุมัติโดย", "Rejected by") : L("อนุมัติโดย", "Approved by"), `${esc(userName(r.decided.by))}${r.decided.via ? ` · ${L("แทน", "for")} ${esc(userName(r.decided.holder))} (${r.decided.via})` : ""}${r.decided.why ? ` · ${esc(r.decided.why)}` : ""}`],
        why(r.returned, L("ส่งคืนแก้ไขเพราะ", "Returned because")), why(r.withdrawn, L("ถอนครั้งล่าสุดเพราะ", "Last withdrawn because")), why(r.cancelled, L("ยกเลิกเพราะ", "Cancelled because")),
        c && [L("แฟ้มจัดซื้อ", "Case file"), `<span class="mono">${c.id}</span> · ${L("ขั้น", "step")} ${caseState(c)}`]])
      + (c && isProcRole() && ["approved", "contracted"].includes(r.status) ? `<div class="row"><button class="btn" type="button" data-rqcase="${c.id}">${L("เปิดแฟ้มจัดซื้อ", "Open the case")}</button></div>` : "");
  },
  hist: r => r.id,
});

// ---------- pages ----------
PROC.planMain = () => {
  const P = planLive(), A = planApproved(), Pb = planPublished(), d = planDiff(A, P.map(snap)), nx = ppNext();
  const fySel = `<label class="field-inline" for="pp-fy">${L("ปี", "Year")} <select id="pp-fy" data-ppfy>${[FAM_FY, FORM_FY].map(y => `<option value="${y}" ${y === PP_FY ? "selected" : ""}>${y}${y === FORM_FY ? ` (${L("ร่างแผนปีถัดไป", "next year's draft")})` : ""}</option>`).join("")}</select></label>`;
  const kpis = PP_FY === FAM_FY ? `<section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("รายการในแผน", "Plan items")}</span><span class="v">${P.length}</span></div>
    <div class="kpi"><span class="l">${L("ประมาณการรวม", "Estimated total")}</span><span class="v">${mb(sumv(P.map(p => p.est)))}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("ขอซื้อแล้ว", "Requisitioned")}</span><span class="v">${P.filter(p => p.status === "requisitioned").length}</span></div>
    <div class="kpi"><span class="l">${L("ทำสัญญาแล้ว", "Contracted")}</span><span class="v">${P.filter(p => p.status === "contracted").length}</span></div></section>` : "";
  const items = crudList("ppItem", { head: `<h2>${L("แผนจัดซื้อจัดจ้าง", "Procurement plan")} · ${fyLabel(PP_FY)}</h2><span class="sp"></span>${fySel}`,
    empty: PP_FY === FAM_FY ? L("ยังไม่มีรายการในแผน", "No plan items yet") : L("ยังไม่มีร่างแผนปีถัดไป · สร้างจากคำของบประมาณในแท็บ “ความต้องการนอกแผน”", "No draft for next year yet · create items from budget requests on the “Needs not in the plan” tab") });
  if (PP_FY !== FAM_FY) return items;
  const head = `<h2>${L("ฉบับแผนและการประกาศ", "Plan versions and publication")}</h2><span class="sp"></span>${Pb ? tag(`${L("ประกาศแล้ว", "Published")} v${Pb.v} · ${esc(Pb.published.ref)}`, "p-ok") : tag(L("ยังไม่ประกาศ", "Not published"), "p-warn")}`;
  const after = d.n ? `<div class="body"><b style="font-weight:600">${L("การเปลี่ยนแปลงที่ยังไม่อยู่ในฉบับที่อนุมัติ", "Changes not yet in the approved version")} (${d.n})</b>${pvDiffHtml(d)}</div>` : "";
  return kpis + items + crudList("pvVer", { head, after: `${after}<div class="body sub">${L("ขอซื้อขอจ้างได้เฉพาะรายการที่อยู่ในแผนที่อนุมัติและประกาศแล้ว", "Requisitions only for items in the approved, published plan")}${nx.length ? ` · ${L("ร่างแผนปีถัดไป", "Next year's draft")} ${nx.length} ${L("รายการ", "items")}` : ""}</div>` });
};
PROC.reqn = () => {
  const via = canSpend() && onBehalf("exec", "spend");
  return `${via ? `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("คุณกำลังอนุมัติแทนผู้บริหาร", "You are approving on the executive's behalf")}</b><p>${via.replace(/^ · /, "")}</p></div></div>` : ""}
    ${crudList("pcReq", { head: `<h2>${L("ใบขอซื้อขอจ้าง", "Requisitions")}</h2><span class="sp"></span><span class="sub">${L("อนุมัติได้เมื่อไม่เกินวงเงินคงเหลือ และผู้ขอไม่ใช่ผู้อนุมัติ (SD-01)", "Approved within the room left, by someone other than the requester (SD-01)")}</span>`,
      empty: L("ยังไม่มีใบขอซื้อขอจ้าง · ขอได้จากรายการในแผนที่ประกาศแล้ว", "No requisitions yet · raise one from a published plan item") })}`;
};
// Next year's budget requests (Budget B3) become draft items of next year's plan (FL-PC-02).
function ppNextPanel() {
  const its = S.requests.filter(r => ["approved", "committee"].includes(r.status)).flatMap(r => (r.items || []).map((it, i) => ({ r, it, i, key: `${r.id}|${i}` }))).filter(x => x.it.type !== "per");
  if (!its.length) return "";
  return `<section class="panel"><header><h2>${L(`ร่างแผนจัดซื้อปี ${FORM_FY} จากคำของบประมาณ`, `Drafting the FY${FORM_FY} plan from budget requests`)}</h2><span class="sp"></span><span class="sub">FL-PC-02</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th></th></tr></thead><tbody>${its.map(x => {
      const done = ppNext().find(p => p.src === x.key), nm = Array.isArray(x.it.name) ? x.it.name : [x.it.name, x.it.name];
      return `<tr><td class="mono">${x.r.id}</td><td>${esc(tx(nm))}<div class="sub">${unitName(x.r.unit)}</div></td><td class="n">${mb(x.it.qty * x.it.price)}</td>
        <td>${done ? `<span class="mono sub">${done.id}</span>` : isProcRole() ? `<button class="btn" type="button" data-ppnext="${esc(x.key)}">${L("ใส่ในแผนปีถัดไป", "Add to next year's plan")}</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div></section>`;
}
{ const d0 = PROC.demand; PROC.demand = () => d0() + ppNextPanel(); }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-ppraise],[data-ppnext]");
  if (!t || !$("#view").contains(t)) return;
  if (t.dataset.ppraise) { PC_RQ_PLAN = t.dataset.ppraise; procSet("reqn"); crOpen("pcReq", "", "edit"); route(); const f = $("#cr-form select, #cr-form input"); if (f) f.focus(); return; }
  const [rid, i] = t.dataset.ppnext.split("|"), rq = S.requests.find(x => x.id === rid), it = rq && rq.items[Number(i)];
  if (!it) return;
  const nm = Array.isArray(it.name) ? it.name : [it.name, it.name], est = it.qty * it.price, kind = it.type === "inv" ? "goods" : "service";
  const p = { id: nextId("PP", ppNext(), FORM_FY), fy: FORM_FY, src: t.dataset.ppnext, req: rid, unit: rq.unit, line: null, name: nm, est, method: ppAuto(est), month: `${FORM_FY - 544}-12-15`, by: me().id, status: "planned", egp: null, kind, cat: guessCat(kind, nm) };
  ppNext().push(p); audit(["ร่างรายการในแผนปีถัดไปจากคำของบประมาณ", "Drafted a next-year plan item from a budget request"], `${p.id} ${rid}`);
  commit(); route(); toast(`${L("เพิ่มในร่างแผนปี", "Added to the draft plan for FY")} ${FORM_FY}: ${p.id}`);
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t && t.dataset && t.dataset.ppfy !== undefined) { PP_FY = Number(t.value); if (CR_OPEN && CR_OPEN.key === "ppItem") crClose(); route(); const s = $("#pp-fy"); if (s) s.focus(); }
});
// My Workspace: a returned requisition goes back to whoever raised it.
{
  const ft = famTasks;
  famTasks = R => { ft(R); if (S.reqn) S.reqn.filter(r => r.status === "returned" && r.by === me().id).forEach(r => R(`${L("แก้ใบขอซื้อที่ถูกส่งคืน", "Fix a returned requisition")} ${r.id}`, r.returned ? r.returned.why : "", TODAY, "prc-reqn", "p-warn")); };
}
