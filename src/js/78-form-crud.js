// Formulation FY2571 on the shared list + drawer (round C2, Budget CRUD design 6.2 to 6.4, FR-C-06 to FR-C-20,
// FL-01 to FL-03 and FL-11). Requests can be deleted while they are unsent drafts, withdrawn back to draft after
// sending, or cancelled; Planning sets and issues the department ceiling; duplicates can be marked by hand and a
// merge cuts the merged request; the amount the reviewers settle on becomes the request's decided amount, which
// the submission uses; meetings and hearings are set up, moved and cancelled from lists.
STATUS.cancelled = [["ยกเลิกคำขอ", "Cancelled"], "p-mute"];
const RQ_SENT = ["unit", "plan", "committee", "exec"];
// Sent at least once: the number has gone to reviewers, so the request can only be cancelled, not deleted (R-C-01).
const wasSent = r => !!(r.sentOnce || r.withdrawn || r.status !== "draft");
const isOwner = r => ROLE === "div" && r.unit === me().unit;
const revRow = r => (S.review || []).find(x => x.id === r.id);
const nextNo = (list, pre) => `${pre}${String(Math.max(0, ...list.map(x => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1).padStart(2, "0")}`;
const reqOpts = f => S.requests.filter(f || (() => true)).map(r => [r.id, `${r.id} · ${tx(r.name)}`]);

// ---------- B3 requests ----------
CRUD.def("rqReq", {
  noun: ["คำของบประมาณ", "Budget request"], st: STATUS,
  list: () => (unitRole() ? S.requests.filter(r => r.unit === me().unit) : S.requests), id: r => r.id, title: r => tx(r.name),
  sub: r => `${unitName(r.unit)} · ${mb(r.amount)} ${L("ลบ.", "M")}`,
  status: r => r.status, gone: r => r.status === "cancelled",
  search: r => `${r.id} ${[].concat(r.name).join(" ")} ${unitName(r.unit)}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(STATUS).map(k => [k, tx(STATUS[k][0])]), get: r => r.status },
    { id: "unit", label: ["หน่วยงาน", "Unit"], opts: () => (unitRole() ? [] : [...new Set(S.requests.map(r => r.unit))].map(u => [u, unitName(u)])), get: r => r.unit }],
  cols: [
    { h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>${r.id === S.story ? " ★" : ""}` },
    { h: ["โครงการ / รายการ", "Project"], c: r => `${esc(tx(r.name))}${(r.comments || []).some(c => !c.resolved) ? ` ${tag(`${openComments(r).length} ${L("ความเห็น", "comments")}`, "p-warn")}` : ""}` },
    { h: ["หน่วยงาน", "Unit"], c: r => `<span class="sub">${unitName(r.unit)}</span>` },
    { h: ["วงเงินที่ขอ (ลบ.)", "Requested (M)"], n: true, c: r => mb(r.amount) },
    { h: ["เทียบปีก่อน", "vs last year"], n: true, c: r => (r.prev ? `${r.amount >= r.prev ? "+" : ""}${fmt((r.amount / r.prev - 1) * 100, 1)}%` : tag(L("ใหม่", "New"), "p-info")) },
    { h: ["ปรับปรุง", "Updated"], c: r => `<span class="sub">${fdate(r.updated)}</span>` },
  ],
  fields: () => [
    { id: "name", label: ["ชื่อโครงการ / รายการ", "Project or item name"], req: true, wide: true, value: "" },
    { id: "act", label: ["กิจกรรม (รหัสงบประมาณ)", "Activity (budget code)"], type: "select", req: true, blank: L("— เลือกกิจกรรม —", "— choose an activity —"), opts: actOpts(), value: "" },
    { id: "type", label: ["งบรายจ่ายของรายการแรก", "Budget type of the first line"], type: "select", opts: typeOpts(), value: "ope" },
  ],
  create: { can: () => ROLE === "div", label: ["สร้างคำขอใหม่", "New request"],
    run: v => {
      const id = nextReqId();
      const r = { id, unit: me().unit, act: v.act, prev: 0, status: "draft", updated: TODAY, name: [v.name, v.name], kpi: "", reason: "", docs: [], items: [{ type: v.type, name: "", qty: 1, unitName: L("งาน", "job"), price: 0 }], amount: 0, versions: [], comments: [] };
      S.requests.unshift(r); snapshot(r, ["สร้างคำขอ", "Created the request"], true);
      audit(["สร้างคำขอใหม่", "Created a request"], id); return r;
    } },
  acts: r => {
    const out = [], own = isOwner(r);
    if (own && !wasSent(r) && r.id !== S.story) out.push({ id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", confirm: L("ลบคำขอนี้ทั้งหมด รวมรายการและเอกสาร? เลขที่จะไม่ถูกนำกลับมาใช้", "Delete this request with its lines and documents? Its number won't be reused."),
      run: () => { S.requests = S.requests.filter(x => x !== r); audit(["ลบร่างคำขอ", "Deleted a draft request"], r.id); return L("ลบร่างแล้ว", "Draft deleted"); } });
    if (own && RQ_SENT.includes(r.status)) out.push({ id: "wd", label: L("ถอนคำขอกลับมาแก้", "Withdraw to edit"), kind: "ghost", why: true, impact: () => L("คำขอจะกลับเป็นร่างและออกจากการพิจารณา ต้องส่งใหม่ตามขั้นตอน", "The request goes back to draft and leaves review; it must be sent again"),
      run: (_, why) => { const from = r.status; r.status = "draft"; r.updated = TODAY; r.withdrawn = { t: nowIso(), from, why }; r.sentOnce = true;
        snapshot(r, ["ถอนคำขอกลับมาแก้ไข", "Withdrew the request to edit"], true); audit(["ถอนคำขอกลับมาแก้ไข", "Withdrew a request"], `${r.id} · ${why}`);
        notify([from === "unit" ? "divhead" : from === "plan" ? "plan" : "exec"], [`${unitName(r.unit)} ถอนคำขอ ${r.id} กลับไปแก้ไข: ${why}`, `${unitName(r.unit)} withdrew ${r.id}: ${why}`], "requests"); return L("ถอนคำขอแล้ว · กลับเป็นร่าง", "Withdrawn · back to draft"); } });
    if (own && ["draft", "returned"].includes(r.status) && r.id !== S.story && wasSent(r)) out.push({ id: "cancel", label: L("ยกเลิกคำขอ", "Cancel request"), kind: "danger", why: true, impact: () => `${L("ยอดคำขอของหน่วยงานจะลด", "Your unit's total drops by")} ${mb(r.amount)} ${L("ลบ.", "M")}`,
      run: (_, why) => { r.status = "cancelled"; r.updated = TODAY; r.cancelled = { t: nowIso(), why }; audit(["ยกเลิกคำขอ", "Cancelled a request"], `${r.id} · ${why}`); notify(["plan"], [`${unitName(r.unit)} ยกเลิกคำขอ ${r.id}`, `${unitName(r.unit)} cancelled ${r.id}`], "requests"); return L("ยกเลิกคำขอแล้ว", "Request cancelled"); } });
    return out;
  },
  view: r => {
    const ch = checks(r), red = ch.filter(x => x.s === "no").length, v = revRow(r);
    return kv([[L("หน่วยงาน", "Unit"), unitName(r.unit)], [L("กิจกรรม", "Activity"), (lineage(r.act).map(n => `<span class="mono">${n.code}</span> ${esc(tx(n.name))}`).join("<br>")) || "–"],
      [L("วงเงินที่ขอ", "Requested"), `${fmt(r.amount)} ${L("บาท", "baht")} · ${r.items.length} ${L("รายการ", "lines")}`],
      v && [L("วงเงินรอบพิจารณา", "Review rounds"), `${fmt(v.r0, 1)} → ${fmt(v.r1, 1)} → <b>${fmt(v.r2, 1)}</b> ${L("ลบ.", "M")}`],
      r.decided != null && [L("วงเงินที่เห็นชอบ", "Decided amount"), `<b>${mb(r.decided)}</b> ${L("ลบ. · ใช้ในชุดส่งสำนักงบประมาณ", "M · used in the Budget Bureau package")}`],
      [L("ตรวจก่อนส่ง", "Checks"), red ? tag(`${red} ${L("ข้อยังไม่ผ่าน", "not passed")}`, "p-bad") : tag(L("ผ่านทุกข้อ", "All passed"), "p-ok")],
      [L("เอกสาร", "Documents"), `${r.docs.length} ${L("ไฟล์", "files")}`], [L("ความเห็นค้าง", "Open comments"), openComments(r).length || "–"],
      r.withdrawn && [L("ถอนล่าสุด", "Last withdrawn"), `${fdate(r.withdrawn.t)} · ${esc(r.withdrawn.why)}`], r.cancelled && [L("ยกเลิกเมื่อ", "Cancelled"), `${fdate(r.cancelled.t)} · ${esc(r.cancelled.why)}`]])
      + `<div class="row" style="margin-top:12px"><button class="btn primary" type="button" data-reqfull="${r.id}">${editable(r) ? L("เปิดแบบฟอร์มเต็มเพื่อแก้ไข", "Open the full form to edit") : canReview(r) ? L("เปิดเพื่อพิจารณา", "Open to review") : L("เปิดแบบฟอร์มเต็ม", "Open the full form")}</button></div>`;
  },
  tabs: r => [["docs", L("เอกสาร", "Documents"), r.docs.length ? `<ul class="plain">${r.docs.map((d, i) => `<li class="row" style="justify-content:space-between;flex-wrap:nowrap"><span style="min-width:0;overflow-wrap:anywhere">${esc(d)}</span>${editable(r) ? `<button class="btn ghost" type="button" data-docdel="${r.id}|${i}">${L("ลบ", "Remove")}</button>` : ""}</li>`).join("")}</ul>` : `<span class="sub">${L("ยังไม่มีไฟล์", "No files")}</span>`]],
});
// Removing a document (FR-C-08), from the drawer or the full form's documents step.
function docDel(id, i) {
  const r = S.requests.find(x => x.id === id), snap = crSnap(), name = r.docs[i];
  if (!r || !editable(r) || name == null) return;
  r.docs.splice(i, 1); audit(["ลบเอกสารแนบ", "Removed a document"], `${r.id}: ${name}`); commit(); route(); crUndoOffer(snap, `${L("ลบ", "Removed")} ${name}`);
}
{
  const dv = REQ_PANELS.docs;
  REQ_PANELS.docs = (r, ed) => dv(r, ed) + (ed && r.docs.length ? `<section class="panel"><header><h2>${L("ไฟล์ที่แนบแล้ว", "Attached files")}</h2></header><ul class="plain body">${r.docs.map((d, i) => `<li class="row" style="justify-content:space-between;flex-wrap:nowrap"><span style="min-width:0;overflow-wrap:anywhere">${esc(d)}</span><button class="btn ghost" type="button" data-docdel="${r.id}|${i}">${L("ลบ", "Remove")}</button></li>`).join("")}</ul></section>` : "");
}
document.addEventListener("click", e => { const b = e.target.closest("[data-docdel]"); if (!b) return; const [id, i] = b.dataset.docdel.split("|"); docDel(id, Number(i)); });
document.addEventListener("click", e => { const b = e.target.closest("[data-reqfull]"); if (!b) return; crClose(); openReq(b.dataset.reqfull); });
{
  const v = VIEWS.requests;
  VIEWS.requests = () => {
    const h = v(), i = h.indexOf(`<section class="panel"><header><h2>${L("รายการคำขอ", "Requests")}`);
    const base = (i > 0 ? h.slice(0, i) : h).replace(/<button class="btn primary" type="button" id="new-req">[\s\S]*?<\/button>/, "");
    return base + crudList("rqReq", { head: `<h2>${L("รายการคำขอ", "Requests")}</h2>`, empty: ROLE === "div" ? L("ยังไม่มีคำขอ เริ่มจากสร้างคำขอใหม่ หรือแปลงจากคลังโครงการ (B2)", "No requests yet. Create one, or convert an idea from the project bank (B2)") : L("ยังไม่มีคำขอ", "No requests yet") });
  };
  BIND.requests = () => { bindCeilingBanner(); bindHearingBanner(); };
}
// A request that has been sent once can no longer be deleted, only cancelled (R-C-01).
{
  const bb = BIND.request;
  BIND.request = () => {
    bb();
    const r = curReq(), sb = $("#submit");
    if (sb) { const o = sb.onclick; sb.onclick = e => { o(e); if (r.status === "unit") { r.sentOnce = true; save(); } }; }
    // FL-03: the executive's approval on the form fixes the decided amount from round 3.
    const pass = $("#rv-pass");
    if (pass) { const o = pass.onclick; pass.onclick = e => { const was = r.status; o(e); if (r.status === "approved" && was !== "approved") { const v = revRow(r); r.decided = v ? Math.round(v.r2 * 1e6) : reqAmount(r); r.decision = r.decision || [L("ผู้บริหารเห็นชอบตามรอบ 3", "Approved at the round 3 amount"), L("ผู้บริหารเห็นชอบตามรอบ 3", "Approved at the round 3 amount")]; commit(); route(); } }; }
  };
}

// ---------- B4 department ceiling and issuing it (FR-C-10, FR-C-12) ----------
const consS = () => S.cons;
const csResponded = () => Object.values(consS().resp || {}).some(x => x.st && x.st !== "pending");
CRUD.def("csCeil", {
  noun: ["กรอบวงเงินของกรม", "Department ceiling"], list: () => [consS()], id: () => "dept", title: () => `${L(`กรอบวงเงินปี ${FORM_FY}`, `FY${FORM_FY} ceiling`)} ${fmt(consS().ceiling)} ${L("ลบ.", "M")}`,
  st: { draft: [["ยังไม่ออกกรอบ", "Not issued"], "p-mute"], issued: [["ออกกรอบแล้ว", "Issued"], "p-ok"] }, status: () => (consS().issued ? "issued" : "draft"), cols: [],
  fields: () => [
    { id: "ceiling", label: ["กรอบวงเงินรวมของกรม (ล้านบาท)", "Department ceiling (million baht)"], type: "number", req: true, min: 1, value: consS().ceiling },
    { id: "due", label: ["กำหนดให้หน่วยงานตอบรับ", "Units reply by"], type: "date", value: consS().due || addDays(TODAY, 7) },
    { id: "note", label: ["หมายเหตุถึงหน่วยงาน", "Note to units"], type: "textarea", wide: true, value: consS().note || "" },
  ],
  edit: { can: () => ROLE === "plan" && !consS().issued, run: (_, v) => { const was = consS().ceiling; Object.assign(consS(), { ceiling: v.ceiling, due: v.due, note: v.note }); audit(["ตั้งกรอบวงเงินของกรม", "Set the department ceiling"], `${fmt(was)} → ${fmt(v.ceiling)} M`); } },
  acts: () => {
    if (ROLE !== "plan") return [];
    const C = consS(), tot = sumv(Object.values(C.unitCeil || {})), gap = Math.round((tot - C.ceiling) * 10) / 10;
    const issue = (ver, why) => { C.issued = TODAY; C.due = C.due && C.due > TODAY ? C.due : addDays(TODAY, 7); C.ver = ver; C.resp = {};
      audit([ver > 1 ? "ออกกรอบวงเงินใหม่" : "ออกกรอบวงเงินให้หน่วยงาน", ver > 1 ? "Reissued the ceilings" : "Issued the ceilings to units"], `${L("ฉบับที่", "version")} ${ver}${why ? " · " + why : ""}`);
      notify(["div", "divhead"], [`กองแผนงานแจ้งกรอบวงเงินปี ${FORM_FY} ${ver > 1 ? `ฉบับที่ ${ver} ` : ""}ตอบรับภายใน ${fdate(C.due)}`, `Planning issued the FY${FORM_FY} ceilings${ver > 1 ? ` (version ${ver})` : ""}; reply by ${fdate(C.due)}`], "requests"); };
    const warn = Math.abs(gap) >= 0.1 ? `${L("กรอบรายหน่วยรวม", "Unit ceilings add up to")} ${fmt(tot, 1)} ${L("ไม่เท่ากรอบกรม", "and don't match the department's")} ${fmt(C.ceiling)} (${gap > 0 ? "+" : ""}${fmt(gap, 1)})` : `${L("กรอบรายหน่วยรวมเท่ากรอบกรม", "Unit ceilings match the department")} ${fmt(C.ceiling)} ${L("ลบ.", "M")}`;
    if (!C.issued) return [{ id: "issue", label: L("ออกกรอบวงเงินให้หน่วยงาน", "Issue ceilings to units"), kind: "primary", impact: () => warn, confirm: L("หน่วยงานจะเห็นกรอบในหน้าคำขอ (B3) และตอบรับหรือขอทบทวน", "Units will see their ceiling on B3 and accept or appeal"), run: () => { issue(1); return L("ออกกรอบวงเงินแล้ว · แจ้งหน่วยงาน", "Ceilings issued · units notified"); } }];
    const out = [{ id: "reissue", label: `${L("ออกกรอบใหม่ (ฉบับที่", "Reissue (version")} ${(C.ver || 1) + 1})`, why: true, impact: () => `${warn} · ${L("คำตอบเดิมของหน่วยงานจะถูกล้าง", "units' earlier replies are cleared")}`, run: (_, why) => { issue((C.ver || 1) + 1, why); return L("ออกกรอบใหม่แล้ว", "Ceilings reissued"); } }];
    if (!csResponded()) out.push({ id: "unissue", label: L("ยกเลิกการออกกรอบ", "Withdraw the ceilings"), kind: "danger", why: true, run: (_, why) => { C.issued = null; audit(["ยกเลิกการออกกรอบวงเงิน", "Withdrew the issued ceilings"], why); notify(["div"], ["กองแผนงานยกเลิกกรอบวงเงินที่แจ้งไว้ จะแจ้งใหม่ภายหลัง", "Planning withdrew the ceilings; new ones will follow"], "requests"); return L("ยกเลิกการออกกรอบแล้ว", "Ceilings withdrawn"); } });
    return out;
  },
  view: () => { const C = consS(), tot = sumv(Object.values(C.unitCeil || {})), R = Object.values(C.resp || {});
    return kv([[L("กรอบวงเงินของกรม", "Department ceiling"), `<b>${fmt(C.ceiling)}</b> ${L("ล้านบาท", "M baht")}`], [L("กรอบรายหน่วยรวม", "Unit ceilings total"), `${fmt(tot, 1)} ${L("ลบ.", "M")}`],
      [L("ออกกรอบ", "Issued"), C.issued ? `${fdate(C.issued)}${C.ver > 1 ? ` · ${L("ฉบับที่", "version")} ${C.ver}` : ""}` : L("ยังไม่ออก", "Not yet")], C.issued && [L("ตอบรับภายใน", "Reply by"), C.due ? dueText(C.due) : "–"],
      C.issued && [L("การตอบรับ", "Replies"), `${R.filter(x => x.st === "accepted").length} ${L("ยอมรับ", "accepted")} · ${R.filter(x => x.st === "appeal").length} ${L("ขอทบทวน", "appealed")}`], C.note && [L("หมายเหตุ", "Note"), esc(C.note)]])
      + (C.issued && ROLE === "plan" ? `<p class="sub">${L("แก้กรอบของกรมได้หลังยกเลิกการออกกรอบ หรือออกกรอบใหม่", "To change the department ceiling, withdraw the ceilings or reissue them")}</p>` : ""); },
  hist: () => "กรอบวงเงิน|ceiling",
});
{
  const cp = CONS_PANELS.ceilings;
  CONS_PANELS.ceilings = () => { const C = consS();
    return `<section class="panel"><header>${chipIco("target", "info")}<h2>${L("กรอบวงเงินของกรม", "Department ceiling")} · ${fmt(C.ceiling)} ${L("ลบ.", "M")}</h2><span class="sp"></span>${tag(C.issued ? `${L("ออกกรอบแล้ว", "Issued")} ${fdate(C.issued)}${C.ver > 1 ? ` · v${C.ver}` : ""}` : L("ยังไม่ออกกรอบ", "Not issued"), C.issued ? "p-ok" : "p-warn")}<button class="btn" type="button" data-cropen="csCeil|dept">${ROLE === "plan" ? L("ตั้งและออกกรอบ", "Set and issue") : L("รายละเอียด", "Details")}</button></header></section>` + cp() + crHere("csCeil"); };
  // Splitting pro rata no longer tells units the ceilings are out; issuing does.
  const cb = CONS_BIND.ceilings;
  CONS_BIND.ceilings = () => { cb(); const p = $("#uc-prop"); if (p) { const o = p.onclick; p.onclick = () => { const n = S.notes.length; o(); if (!consS().issued && S.notes.length > n) { S.notes.shift(); save(); } }; } };
}
// A unit can take back its reply while Planning hasn't decided (FR-C-13).
{
  const cb = ceilingBanner;
  ceilingBanner = function () {
    const h = cb(); if (!h) return h;
    const r = consResp(me().unit);
    return ["accepted", "appeal"].includes(r.st) && ROLE === "div" ? h.replace(/<\/div><\/section>$/, `<div><button class="btn ghost" type="button" id="ceil-undo">${r.st === "appeal" ? L("ถอนคำขอทบทวน (แก้แล้วส่งใหม่ได้)", "Withdraw the appeal (edit and send again)") : L("ถอนการยอมรับ", "Take back the acceptance")}</button></div></div></section>`) : h;
  };
  const bb = bindCeilingBanner;
  bindCeilingBanner = function () {
    bb();
    const u = $("#ceil-undo"); if (u) u.onclick = () => { const snap = crSnap(), unit = me().unit, was = consResp(unit).st; delete S.cons.resp[unit];
      audit(["ถอนคำตอบกรอบวงเงิน", "Took back a ceiling reply"], `${unitName(unit)} · ${was}`); if (was === "appeal") notify(["plan"], [`${unitName(unit)} ถอนคำขอทบทวนกรอบวงเงิน`, `${unitName(unit)} withdrew its ceiling appeal`], "cons-responses");
      commit(); route(); crUndoOffer(snap, L("ถอนคำตอบแล้ว", "Reply taken back")); };
  };
}

// ---------- B4 duplicates (FR-C-14, FL-11) ----------
const DUP_ST = { open: [["รอยืนยัน", "To confirm"], "p-warn"], merge: [["รวมแล้ว", "Merged"], "p-ok"], keep: [["ไม่ซ้ำ", "Not a duplicate"], "p-mute"] };
// Merging cuts the merged request: its largest line loses the saving, and the request keeps a version and a note.
function mergeCut(d) {
  const r = d.reqB && S.requests.find(x => x.id === d.reqB); if (!r) return;
  const it = r.items.slice().sort((a, b) => itemTotal(b) - itemTotal(a))[0], cut = Math.min(d.save * 1e6, itemTotal(it));
  // whole baht per unit; when the quantity doesn't divide the cut, the unit price drops by the cut rounded up
  const before = reqAmount(r); it.price = Math.floor((itemTotal(it) - cut) / (Number(it.qty) || 1)); r.amount = reqAmount(r); r.updated = TODAY; const done = before - r.amount;
  r.merged = (r.merged || []).concat({ dup: d.id, cut: done, with: d.reqA }); snapshot(r, [`รวมรายการซ้ำกับ ${d.reqA || "-"} ลด ${fmt(done)} บาท`, `Merged with ${d.reqA || "-"}: cut ${fmt(done)} baht`], true);
  notify(["div"], [`กองแผนงานรวมรายการซ้ำ ${r.id} กับ ${d.reqA || "-"} ลดวงเงิน ${fmt(done)} บาท`, `Planning merged ${r.id} with ${d.reqA || "-"}: cut ${fmt(done)} baht`], "req:" + r.id);
}
CRUD.def("csDup", {
  noun: ["รายการที่อาจซ้ำซ้อน", "Possible duplicate"], st: DUP_ST, list: () => S.dupes, id: d => d.id, title: d => tx(d.title), sub: d => `${d.manual ? L("ทำเครื่องหมายโดยกองแผนงาน", "Marked by Planning") : L("ตรวจพบโดย AI", "Found by AI")} · ${L("ประหยัดได้", "saves")} ${fmt(d.save, 1)} ${L("ลบ.", "M")}`,
  status: d => d.done || "open",
  cols: [{ h: ["รายการ", "Item"], c: d => `<b style="font-weight:600">${esc(tx(d.title))}</b><div class="sub">${esc(clip(tx(d.desc), 90))}</div>` },
    { h: ["คำขอ", "Requests"], c: d => (d.reqA || d.reqB ? `<span class="mono sub">${[d.reqA, d.reqB].filter(Boolean).join(" · ")}</span>` : "–") },
    { h: ["ลบ.", "M"], n: true, c: d => fmt(d.save, 1) }, { h: ["ที่มา", "Source"], c: d => (d.manual ? L("กองแผนงาน", "Planning") : "AI") }],
  fields: d => [
    { id: "title", label: ["เรื่อง", "Title"], req: true, wide: true, value: d ? tx(d.title) : "" },
    { id: "reqA", label: ["คำขอที่คงไว้", "Request to keep"], type: "select", req: true, blank: "—", opts: reqOpts(r => !["cancelled", "rejected"].includes(r.status)), value: d ? d.reqA || "" : "" },
    { id: "reqB", label: ["คำขอที่ถูกรวม (ลดวงเงิน)", "Request merged in (cut)"], type: "select", req: true, blank: "—", opts: reqOpts(r => !["cancelled", "rejected"].includes(r.status)), value: d ? d.reqB || "" : "" },
    { id: "save", label: ["วงเงินที่ซ้ำ (ล้านบาท)", "Overlapping amount (million baht)"], type: "number", req: true, min: 0.1, value: d ? d.save : "" },
    { id: "desc", label: ["รายละเอียด", "Details"], type: "textarea", wide: true, value: d ? tx(d.desc) : "" },
  ],
  check: v => { const e = []; if (v.reqA && v.reqA === v.reqB) e.push({ f: "reqB", m: L("เลือกคำขอต่างกัน", "Choose two different requests") });
    const b = S.requests.find(r => r.id === v.reqB); if (b && v.save * 1e6 > reqAmount(b)) e.push({ f: "save", m: L("มากกว่าวงเงินของคำขอที่ถูกรวม", "More than the merged request") }); return e; },
  create: { can: () => ROLE === "plan", label: ["ทำเครื่องหมายรายการซ้ำ", "Mark a duplicate"],
    run: v => { const d = { id: nextNo(S.dupes, "d"), manual: true, title: [v.title, v.title], desc: [v.desc, v.desc], reqA: v.reqA, reqB: v.reqB, save: Number(v.save), by: me().id, t: nowIso() };
      S.dupes.push(d); audit(["ทำเครื่องหมายรายการที่อาจซ้ำซ้อน", "Marked a possible duplicate"], `${d.id} · ${v.reqA} · ${v.reqB}`); return d; } },
  edit: { can: d => ROLE === "plan" && !d.done, run: (d, v) => { Object.assign(d, { title: [v.title, v.title], desc: [v.desc, v.desc], reqA: v.reqA, reqB: v.reqB, save: Number(v.save) }); audit(["แก้ไขรายการที่อาจซ้ำซ้อน", "Edited a possible duplicate"], d.id); } },
  acts: d => (ROLE !== "plan" || d.done ? [] : [
    { id: "merge", label: L("รวมรายการ", "Merge"), kind: "primary", impact: () => (d.reqB ? `${d.reqB} ${L("ลดวงเงิน", "is cut by")} ${fmt(d.save, 1)} ${L("ลบ. และบันทึกเป็นเวอร์ชันใหม่", "M and saved as a new version")}` : L("ไม่ได้ระบุคำขอ บันทึกเฉพาะผล", "No request named; only the decision is recorded")),
      run: () => { d.done = "merge"; mergeCut(d); audit(["รวมรายการที่ซ้ำซ้อน", "Merged a duplicate"], `${tx(d.title)}${d.reqB ? " · " + d.reqB : ""}`); return L(`รวมรายการแล้ว · ลด ${fmt(d.save, 1)} ล้านบาท`, `Merged · saves ${fmt(d.save, 1)} M`); } },
    { id: "keep", label: L("ไม่ซ้ำ", "Not a duplicate"), kind: "ghost", why: true, run: (_, why) => { d.done = "keep"; d.why = why; audit(["ยืนยันว่ารายการไม่ซ้ำซ้อน", "Confirmed not a duplicate"], `${tx(d.title)} · ${why}`); return L("บันทึกว่าไม่ซ้ำแล้ว", "Recorded as not a duplicate"); } },
    d.manual && { id: "del", label: L("ลบเครื่องหมาย", "Remove mark"), kind: "danger", confirm: L("ลบรายการนี้?", "Remove this mark?"), run: () => { S.dupes = S.dupes.filter(x => x !== d); audit(["ลบเครื่องหมายรายการซ้ำ", "Removed a duplicate mark"], d.id); return L("ลบแล้ว", "Removed"); } },
  ]),
  view: d => kv([[L("รายละเอียด", "Details"), esc(tx(d.desc)) || "–"], (d.reqA || d.reqB) && [L("คำขอ", "Requests"), `${d.reqA ? `<span class="mono">${d.reqA}</span> ${L("คงไว้", "kept")}` : ""}${d.reqB ? ` · <span class="mono">${d.reqB}</span> ${L("ถูกรวม", "merged in")}` : ""}`],
    [L("วงเงินที่ซ้ำ", "Overlap"), `${fmt(d.save, 1)} ${L("ลบ.", "M")}`], d.why && [L("เหตุผลที่ไม่ซ้ำ", "Why not a duplicate"), esc(d.why)]]),
  hist: d => `${d.id}|${tx(d.title)}`,
});
{
  const v = VIEWS.consolidation;
  VIEWS.consolidation = () => {
    const h = v(), mark = `<section class="panel"><header><h2>${L("รายการที่อาจซ้ำซ้อน", "Possible duplicates")}`, i = h.indexOf(mark);
    if (i < 0) return h;
    const j = h.indexOf("</section>", i) + "</section>".length;
    return h.slice(0, i) + crudList("csDup", { head: `<h2>${L("รายการที่อาจซ้ำซ้อน", "Possible duplicates")}</h2><span class="sp"></span>${tag(L("AI ตรวจพบ · กองแผนงานยืนยันหรือทำเครื่องหมายเอง", "Found by AI · Planning confirms or marks its own"), "p-info")}`, empty: L("ไม่มีรายการซ้ำ", "No duplicates") }) + h.slice(j);
  };
}

// ---------- B5 review: the rounds page moves requests on, and comments ----------
{
  const v = VIEWS.review;
  VIEWS.review = () => {
    const h = v(); if (REV_TAB !== "rounds") return h;
    const can = ROLE === "plan" || ROLE === "exec", at = ROLE === "plan" ? ["plan"] : ["committee", "exec"], R = S.requests.filter(r => at.includes(r.status));
    const sel = can ? `<label class="field-inline" for="rv-ret-req">${L("คำขอที่จะส่งกลับ", "Request to return")} <select id="rv-ret-req">${R.map(r => `<option value="${r.id}">${r.id} · ${esc(tx(r.name))}</option>`).join("") || `<option value="">—</option>`}</select></label>` : "";
    const fwdN = S.requests.filter(r => r.status === (ROLE === "plan" ? "plan" : "exec")).length;
    return h.replace(/(<button class="btn" type="button" id="rv-fwd"[^>]*>)([^<]*)(<\/button>)/, `$1$2 (${fwdN})$3`).replace(/<button class="btn danger" type="button" id="rv-ret"/, `${sel}<button class="btn danger" type="button" id="rv-ret"`);
  };
  const b = BIND.review;
  BIND.review = () => {
    b(); if (REV_TAB !== "rounds") return;
    const fw = $("#rv-fwd"), rt = $("#rv-ret");
    if (fw) fw.onclick = () => {
      const st = ROLE === "plan" ? "plan" : "exec", R = S.requests.filter(r => r.status === st);
      if (!R.length) { toast(ROLE === "plan" ? L("ไม่มีคำขอที่รอกองแผนพิจารณา", "No requests waiting for Planning") : L("ไม่มีคำขอที่รอผู้บริหารเห็นชอบ", "No requests waiting for the executive")); return; }
      const snap = crSnap();
      R.forEach(r => {
        if (st === "plan") r.status = needsCommittee(r) ? "committee" : "exec";
        else { const v2 = revRow(r); r.status = "approved"; r.decided = v2 ? Math.round(v2.r2 * 1e6) : reqAmount(r); r.decision = [L("ผู้บริหารเห็นชอบตามรอบ 3", "Approved at the round 3 amount"), L("ผู้บริหารเห็นชอบตามรอบ 3", "Approved at the round 3 amount")]; }
        r.updated = TODAY;
      });
      audit(st === "plan" ? ["เสนอคำขอที่ผ่านการกลั่นกรองต่อ", "Sent reviewed requests on"] : ["เห็นชอบคำขอตามวงเงินรอบที่ 3", "Approved requests at the round 3 amounts"], R.map(r => r.id).join(", "));
      notify(st === "plan" ? ["exec"] : ["plan", "div"], st === "plan" ? [`กองแผนงานเสนอคำขอ ${R.length} รายการ`, `Planning sent ${R.length} requests on`] : [`ผู้บริหารเห็นชอบคำขอ ${R.length} รายการ`, `The executive approved ${R.length} requests`], "review");
      commit(); renderShell(); route(); crUndoOffer(snap, st === "plan" ? `${L("เสนอต่อแล้ว", "Sent on")} ${R.length}` : `${L("เห็นชอบแล้ว", "Approved")} ${R.length}`);
    };
    if (rt) rt.onclick = () => {
      const id = $("#rv-ret-req") && $("#rv-ret-req").value, why = $("#why").value.trim(), r = S.requests.find(x => x.id === id);
      if (!r) { toast(L("ไม่มีคำขอที่ส่งกลับได้", "No request to return")); return; }
      if (why.length < 10) { toast(L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษรในช่องเหตุผล", "Put a reason of at least 10 characters in the reason box")); $("#why").focus(); return; }
      const snap = crSnap(); addComment(r, null, why); r.status = "returned"; r.updated = TODAY;
      audit(["ส่งคำขอกลับแก้ไข", "Returned a request for revision"], `${r.id} · ${why}`); notify(["div"], [`คำขอ ${r.id} ถูกส่งกลับแก้ไข: ${why}`, `Request ${r.id} was returned: ${why}`], "req:" + r.id);
      commit(); renderShell(); route(); crUndoOffer(snap, `${L("ส่งกลับ", "Returned")} ${r.id}`);
    };
  };
}
// Comments: the author can edit or delete one until it is resolved (FR-C-17).
let CMT_EDIT = null;
{
  const ch = cmtHtml;
  cmtHtml = function (r, c) {
    const h = ch(r, c), mine = c.by === me().id && !c.resolved;
    if (!mine) return h;
    if (CMT_EDIT === c.id) return `<div class="cmt"><span class="cmt-who">${L("แก้ไขความเห็น", "Edit comment")}</span><div class="row" style="flex-wrap:nowrap"><input type="text" id="cmt-ed" style="flex:1" value="${esc(tx(c.text))}" aria-label="${L("ความเห็น", "Comment")}"><button class="btn primary" type="button" data-cmtsave="${r.id}|${c.id}">${L("บันทึก", "Save")}</button><button class="btn ghost" type="button" data-cmtedit="">${L("ยกเลิก", "Cancel")}</button></div></div>`;
    return h.replace(/<\/div>$/, `<span class="row" style="gap:4px"><button class="btn ghost" type="button" data-cmtedit="${c.id}" style="padding:2px 8px;font-size:12.5px">${L("แก้ไข", "Edit")}</button><button class="btn ghost" type="button" data-cmtdel="${r.id}|${c.id}" style="padding:2px 8px;font-size:12.5px">${L("ลบ", "Delete")}</button></span></div>`);
  };
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-cmtedit],[data-cmtsave],[data-cmtdel]"); if (!t) return;
  if (t.dataset.cmtedit !== undefined) { CMT_EDIT = t.dataset.cmtedit || null; route(); const i = $("#cmt-ed"); if (i) i.focus(); return; }
  const [rid, cid] = (t.dataset.cmtsave || t.dataset.cmtdel).split("|"), r = S.requests.find(x => x.id === rid), c = r && (r.comments || []).find(x => x.id === cid);
  if (!c) return;
  if (t.dataset.cmtsave) { const v = $("#cmt-ed").value.trim(); if (!v) { toast(L("พิมพ์ความเห็นก่อน", "Type a comment first")); return; } c.text = [v, v]; c.edited = nowIso(); CMT_EDIT = null; audit(["แก้ไขความเห็น", "Edited a comment"], r.id); commit(); route(); return; }
  const snap = crSnap(); r.comments = r.comments.filter(x => x !== c); audit(["ลบความเห็น", "Deleted a comment"], r.id); commit(); route(); crUndoOffer(snap, L("ลบความเห็นแล้ว", "Comment deleted"));
});

// ---------- B5 committee meetings (FR-C-18, FR-C-19) ----------
const MEET_ST = { scheduled: [["กำหนดประชุม", "Scheduled"], "p-info"], held: [["ประชุมแล้ว", "Held"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const meetScheduled = () => (S.meetings || []).find(m => (m.status || "scheduled") === "scheduled");
const meetNo = () => { const fy = Number(String(TODAY).slice(0, 4)) + 543 + (Number(String(TODAY).slice(5, 7)) >= 10 ? 1 : 0), n = S.meetings.filter(m => String(tx(m.no)).includes("/" + fy) || String(m.no[0]).includes("/" + fy)).length + 1; return [`ครั้งที่ ${n}/${fy}`, `Meeting ${n}/${fy}`]; };
CRUD.def("rvMeet", {
  noun: ["การประชุมคณะกรรมการ", "Committee meeting"], st: MEET_ST,
  list: () => S.meetings.slice().reverse(), id: m => m.id, title: m => `${L("การประชุม", "Meeting")} ${tx(m.no)}`, sub: m => `${fdate(m.date)}${m.time ? ` · ${m.time}` : ""}${m.place ? ` · ${esc(m.place)}` : ""}`,
  status: m => m.status || "scheduled", gone: m => m.status === "cancelled",
  cols: [{ h: ["ครั้งที่", "Meeting"], c: m => `<b style="font-weight:600">${esc(tx(m.no))}</b>` }, { h: ["วันที่", "Date"], c: m => `${fdate(m.date)}${m.time ? ` <span class="sub">${m.time}</span>` : ""}` },
    { h: ["วาระ", "Items"], n: true, c: m => (m.status === "held" ? Object.keys(m.items || {}).length : S.requests.filter(r => r.status === "committee").length) },
    { h: ["รายงานการประชุม", "Minutes"], c: m => (m.minutes ? (m.certified ? tag(L("รับรองแล้ว", "Certified"), "p-ok") : tag(L("ร่าง", "Draft"), "p-warn")) : "–") }],
  fields: m => (m && m.status === "held" ? [{ id: "minutes", label: ["รายงานการประชุม (ร่าง)", "Minutes (draft)"], type: "textarea", wide: true, value: m.minutes ? tx(m.minutes) : "" }] : [
    { id: "no", label: ["ครั้งที่", "Meeting no."], req: true, value: m ? tx(m.no) : tx(meetNo()) },
    { id: "date", label: ["วันที่", "Date"], type: "date", req: true, min: TODAY, value: m ? m.date : addDays(TODAY, 7) },
    { id: "time", label: ["เวลา", "Time"], type: "time", value: m ? m.time || "09:30" : "09:30" },
    { id: "place", label: ["สถานที่", "Place"], value: m ? m.place || "" : L("ห้องประชุม 1 ชั้น 5", "Meeting room 1, 5th floor") },
    { id: "note", label: ["วาระเพิ่มเติม / หมายเหตุ", "Other items / note"], type: "textarea", wide: true, value: m ? m.note || "" : "" },
  ]),
  create: { can: () => ROLE === "plan" && !meetScheduled(), label: ["ตั้งการประชุม", "Schedule a meeting"],
    run: v => { const m = { id: nextNo(S.meetings, "M-"), no: [v.no, v.no], date: v.date, time: v.time, place: v.place, note: v.note, status: "scheduled", attendees: 0, docs: [], items: {}, present: cmte().members.slice(), votes: {} };
      S.meetings.push(m); audit(["ตั้งการประชุมคณะกรรมการ", "Scheduled a committee meeting"], `${m.id} ${v.no} · ${fdate(v.date)}`);
      notify(["exec", "committee"], [`นัดประชุมคณะกรรมการพิจารณางบประมาณ ${v.no} วันที่ ${fdate(v.date)}`, `Budget committee ${v.no} on ${fdate(v.date)}`], "rev-meetings"); return m; } },
  edit: { can: m => ROLE === "plan" && ((m.status || "scheduled") === "scheduled" || (m.status === "held" && m.minutes && !m.certified)), why: m => (m.status || "scheduled") === "scheduled" && false,
    run: (m, v) => {
      if (m.status === "held") { m.minutes = [v.minutes, v.minutes]; audit(["แก้ไขร่างรายงานการประชุม", "Edited the draft minutes"], `${m.id} ${tx(m.no)}`); return; }
      const moved = v.date !== m.date; Object.assign(m, { no: [v.no, v.no], date: v.date, time: v.time, place: v.place, note: v.note });
      audit([moved ? "เลื่อนการประชุมคณะกรรมการ" : "แก้ไขการประชุมคณะกรรมการ", moved ? "Moved a committee meeting" : "Edited a committee meeting"], `${m.id} ${v.no} · ${fdate(v.date)}`);
      if (moved) notify(["exec", "committee"], [`เลื่อนการประชุม ${v.no} เป็นวันที่ ${fdate(v.date)}`, `${v.no} moved to ${fdate(v.date)}`], "rev-meetings");
    } },
  acts: m => {
    const out = [], st = m.status || "scheduled";
    if (st === "scheduled" && ROLE === "plan") out.push({ id: "cancel", label: L("ยกเลิกการประชุม", "Cancel meeting"), kind: "danger", why: true, impact: () => L("ความเห็นที่กรรมการลงไว้จะยังอยู่ในประวัติ คำขอยังรอคณะกรรมการ", "Votes stay in the history; requests keep waiting for the committee"),
      run: (_, why) => { m.status = "cancelled"; m.cancelled = { t: nowIso(), why }; audit(["ยกเลิกการประชุมคณะกรรมการ", "Cancelled a committee meeting"], `${m.id} ${tx(m.no)} · ${why}`); notify(["exec", "committee"], [`ยกเลิกการประชุม ${m.no[0]}: ${why}`, `${m.no[1]} cancelled: ${why}`], "rev-meetings"); return L("ยกเลิกการประชุมแล้ว", "Meeting cancelled"); } });
    if (m.status === "held" && m.minutes && !m.certified && (ROLE === "exec" || ROLE === "plan")) out.push({ id: "cert", label: L("รับรองรายงานการประชุม", "Certify the minutes"), kind: "primary", confirm: L("รับรองแล้วแก้ไขรายงานไม่ได้", "Once certified the minutes can't be edited"),
      run: () => { m.certified = { t: nowIso(), by: me().id }; audit(["รับรองรายงานการประชุม", "Certified the minutes"], `${m.id} ${tx(m.no)}`); return L("รับรองแล้ว", "Certified"); } });
    return out;
  },
  view: m => kv([[L("วันที่", "Date"), `${fdate(m.date)}${m.time ? ` · ${m.time} ${L("น.", "")}` : ""}`], m.place && [L("สถานที่", "Place"), esc(m.place)], m.note && [L("หมายเหตุ", "Note"), esc(m.note)],
    m.status === "held" && [L("มติ", "Resolutions"), Object.keys(m.items || {}).map(k => `<span class="mono">${k}</span> ${tag(tx(RES[m.items[k].res][0]), RES[m.items[k].res][1])}`).join("<br>") || "–"],
    m.status !== "held" && m.status !== "cancelled" && [L("วาระ", "Agenda"), S.requests.filter(r => r.status === "committee").map(r => `<span class="mono">${r.id}</span> ${esc(tx(r.name))}`).join("<br>") || L("ยังไม่มีคำขอเข้าวาระ", "No requests on the agenda yet")],
    m.certified && [L("รับรองรายงาน", "Minutes certified"), `${fdate(m.certified.t)} · ${userName(m.certified.by)}`], m.cancelled && [L("ยกเลิกเมื่อ", "Cancelled"), `${fdate(m.cancelled.t)} · ${esc(m.cancelled.why)}`]])
    + (m.minutes ? `<pre class="minutes">${esc(tx(m.minutes))}</pre>` : ""),
  hist: m => `${m.id}|${m.no[0]}|${m.no[1]}`,
});
{
  const mp = REV_PANELS.meetings;
  REV_PANELS.meetings = () => {
    const wait = S.requests.filter(r => r.status === "committee").length;
    const hint = !meetScheduled() && wait ? `<div class="alert"><div class="ic">!</div><div><b>${wait} ${L("คำขอรอคณะกรรมการ แต่ยังไม่มีการประชุมที่กำหนดไว้", "requests wait for the committee, but no meeting is scheduled")}</b><p>${ROLE === "plan" ? L("กด “ตั้งการประชุม” ด้านล่าง", "Use “Schedule a meeting” below") : L("กองแผนงานเป็นผู้ตั้งการประชุม", "Planning schedules meetings")}</p></div></div>` : "";
    return hint + crudList("rvMeet", { head: `<h2>${L("การประชุมคณะกรรมการ", "Committee meetings")}</h2><span class="sp"></span><span class="sub">${L("ตั้งได้ครั้งละหนึ่งการประชุม", "One scheduled meeting at a time")}</span>`, empty: L("ยังไม่มีการประชุม", "No meetings yet") }) + mp();
  };
}

// ---------- B5 hearings (FR-C-20) ----------
const HEAR_ST = { scheduled: [["นัดชี้แจง", "Scheduled"], "p-info"], held: [["ชี้แจงแล้ว", "Held"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
CRUD.def("rvHear", {
  noun: ["การชี้แจงงบประมาณ", "Budget hearing"], st: HEAR_ST,
  list: () => (S.hearings || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)), id: h => h.id, title: h => unitName(h.unit), sub: h => `${fdate(h.date)} · ${h.time} ${L("น.", "")}`,
  status: h => h.status || "scheduled", gone: h => h.status === "cancelled",
  cols: [{ h: ["เลขที่", "No."], c: h => `<span class="mono">${h.id}</span>` }, { h: ["หน่วยงาน", "Unit"], c: h => unitName(h.unit) }, { h: ["วันที่", "Date"], c: h => `${fdate(h.date)} <span class="sub">${h.time}</span>` },
    { h: ["คำถาม", "Questions"], n: true, c: h => `${h.qs.filter(q => q.ans).length}/${h.qs.length}` }],
  fields: h => [
    { id: "unit", label: ["หน่วยงาน", "Unit"], type: "select", req: true, opts: unitOpts(), value: h ? h.unit : "", lock: !!(h && h.qs.length), show: h && unitName(h.unit) },
    { id: "date", label: ["วันที่", "Date"], type: "date", req: true, min: TODAY, value: h ? h.date : addDays(TODAY, 7) },
    { id: "time", label: ["เวลา", "Time"], type: "time", req: true, value: h ? h.time : "09:30" },
    { id: "who", label: ["ผู้ชี้แจงของหน่วยงาน", "Who presents for the unit"], value: h ? h.who || "" : "" },
  ],
  create: { can: () => ROLE === "plan", label: ["นัดหมายการชี้แจง", "Schedule a hearing"],
    run: v => { const h = { id: nextNo(S.hearings, "H-"), unit: v.unit, date: v.date, time: v.time, who: v.who, status: "scheduled", qs: [] };
      S.hearings.push(h); audit(["นัดหมายการชี้แจงงบประมาณ", "Scheduled a budget hearing"], `${h.id} ${unitName(v.unit)}`);
      notify(["div"], [`นัดชี้แจงงบประมาณ ${unitName(v.unit)} วันที่ ${fdate(v.date)}`, `Budget hearing for ${unitName(v.unit)} on ${fdate(v.date)}`], "requests"); return h; } },
  edit: { can: h => ROLE === "plan" && (h.status || "scheduled") === "scheduled",
    run: (h, v) => { const moved = v.date !== h.date || v.time !== h.time; if (!h.qs.length) h.unit = v.unit; Object.assign(h, { date: v.date, time: v.time, who: v.who });
      audit(["แก้ไขนัดชี้แจงงบประมาณ", "Changed a budget hearing"], `${h.id} · ${fdate(v.date)} ${v.time}`);
      if (moved) notify(["div"], [`เลื่อนการชี้แจง ${h.id} เป็น ${fdate(v.date)} ${v.time} น.`, `Hearing ${h.id} moved to ${fdate(v.date)} ${v.time}`], "requests"); } },
  acts: h => ((h.status || "scheduled") !== "scheduled" || ROLE !== "plan" ? [] : [{ id: "cancel", label: L("ยกเลิกการชี้แจง", "Cancel hearing"), kind: "danger", why: true,
    run: (_, why) => { h.status = "cancelled"; h.cancelled = { t: nowIso(), why }; audit(["ยกเลิกการชี้แจงงบประมาณ", "Cancelled a budget hearing"], `${h.id} · ${why}`); notify(["div"], [`ยกเลิกการชี้แจง ${h.id}: ${why}`, `Hearing ${h.id} cancelled: ${why}`], "requests"); return L("ยกเลิกแล้ว", "Cancelled"); } }]),
  view: h => kv([[L("หน่วยงาน", "Unit"), unitName(h.unit)], [L("วันเวลา", "When"), `${fdate(h.date)} · ${h.time} ${L("น.", "")}`], h.who && [L("ผู้ชี้แจง", "Presenter"), esc(h.who)],
    [L("คำถาม", "Questions"), h.qs.length ? h.qs.map(q => `${esc(tx(q.q))} ${tag(tx(HQ_ST(q)[0]), HQ_ST(q)[1])}`).join("<br>") : L("ยังไม่มีคำถาม · เพิ่มในการ์ดของหน่วยงานด้านล่าง", "No questions yet · add them in the unit's card below")],
    h.cancelled && [L("ยกเลิกเมื่อ", "Cancelled"), `${fdate(h.cancelled.t)} · ${esc(h.cancelled.why)}`]]),
  hist: h => h.id,
});
{
  const hp = REV_PANELS.hearings;
  REV_PANELS.hearings = () => {
    const h = hp(), i = h.indexOf(`<section class="panel"><header><h2>${L("นัดหมายการชี้แจงใหม่", "Schedule a hearing")}`);
    return crudList("rvHear", { head: `<h2>${L("นัดหมายการชี้แจง", "Hearings")}</h2>`, empty: L("ยังไม่มีการนัดชี้แจง", "No hearings yet") }) + (i > 0 ? h.slice(0, i) : h);
  };
}
