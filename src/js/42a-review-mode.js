// M04 review mode on the request form (round 3): reviewers comment on single budget lines or the
// whole request, then send it back or forward. Requesters see the comments and mark them resolved.
let CMT_OPEN = null; // index of the line whose comment box is open
const lineKey = it => it.type + "|" + nameKey(it.name);
const canReview = r => (r.status === "unit" && ROLE === "divhead" && r.unit === me().unit) || (r.status === "plan" && acting("plan", "review")) || ((r.status === "committee" || r.status === "exec") && acting("exec", "committee"));
const reviewBy = r => (r.status === "unit" ? "" : r.status === "plan" ? onBehalf("plan", "review") : onBehalf("exec", "committee"));
const openComments = r => (r.comments || []).filter(c => !c.resolved);

function cmtHtml(r, c) {
  const mine = editable(r) && !c.resolved;
  return `<div class="cmt ${c.resolved ? "done" : ""}"><span class="cmt-who">${esc(userName(c.by))} · ${tx(ROLES[c.role])} · ${fdate(c.t, true)}</span>
    <span>${esc(tx(c.text))}</span>${c.resolved ? tag(L("แก้แล้ว", "Resolved"), "p-ok") : mine ? `<button class="btn ghost" type="button" data-resolve="${c.id}" style="padding:2px 8px;font-size:12.5px">${L("ทำเครื่องหมายว่าแก้แล้ว", "Mark resolved")}</button>` : tag(L("รอแก้ไข", "Open"), "p-warn")}</div>`;
}
function lineCommentRows(r, it, i) {
  const list = (r.comments || []).filter(c => c.line === lineKey(it));
  const box = CMT_OPEN === i && canReview(r) ? `<div class="row"><input type="text" id="cmt-in" style="flex:1" placeholder="${L("ความเห็นสำหรับรายการนี้", "Comment on this line")}" aria-label="${L("ความเห็นสำหรับรายการนี้", "Comment on this line")}">
    <button class="btn primary" type="button" data-addcmt="${i}">${L("เพิ่มความเห็น", "Add comment")}</button></div>` : "";
  if (!list.length && !box) return "";
  return `<tr class="cmt-row"><td colspan="7">${list.map(c => cmtHtml(r, c)).join("")}${box}</td></tr>`;
}
function generalComments(r) {
  const list = (r.comments || []).filter(c => c.line == null), rev = canReview(r);
  if (!list.length && !rev) return "";
  return `<section class="panel"><header><h2>${L("ความเห็นจากผู้พิจารณา", "Reviewer comments")}</h2><span class="sp"></span>
      ${openComments(r).length ? tag(`${openComments(r).length} ${L("รอแก้ไข", "open")}`, "p-warn") : tag(L("ไม่มีความเห็นค้าง", "Nothing open"), "p-ok")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:8px">${list.map(c => cmtHtml(r, c)).join("") || `<span class="sub">${L("ยังไม่มีความเห็นภาพรวม ใส่ความเห็นรายบรรทัดได้ที่ปุ่ม ✎ ในตารางรายการ", "No overall comments yet. Use ✎ in the lines table for line comments.")}</span>`}
      ${rev ? `<div class="row"><input type="text" id="gcmt-in" style="flex:1" placeholder="${L("ความเห็นภาพรวมของคำขอ", "Overall comment on the request")}" aria-label="${L("ความเห็นภาพรวม", "Overall comment")}"><button class="btn" type="button" id="gcmt-add">${L("เพิ่มความเห็น", "Add comment")}</button></div>` : ""}</div></section>`;
}
function reviewButtons(r) {
  if (!canReview(r)) return "";
  return `<button class="btn danger" type="button" id="rv-return">${L("ส่งกลับแก้ไข", "Return for revision")}</button>
    <button class="btn primary" type="button" id="rv-pass">${r.status === "unit" ? L("เห็นชอบและส่งกองแผนงาน", "Approve and send to Planning") : r.status === "committee" || r.status === "exec" ? L("เห็นชอบคำขอ", "Approve request") : L("ผ่านการกลั่นกรอง · เสนอต่อ", "Pass review · send on")}${reviewBy(r) ? ` (${L("แทน", "on behalf")})` : ""}</button>`;
}
function addComment(r, line, text) {
  r.comments = r.comments || [];
  r.comments.push({ id: `${r.id}-c${Date.now()}`, line, by: me().id, role: ROLE, t: nowIso(), text, resolved: false });
  audit(["ใส่ความเห็นในคำขอ", "Commented on a request"], `${r.id}${line ? " · " + line.split("|")[1] : ""}`);
  commit();
}
function lineCommentClick(r, e) {
  const c = e.target.closest("[data-cmt]");
  if (c) { CMT_OPEN = CMT_OPEN === Number(c.dataset.cmt) ? null : Number(c.dataset.cmt); renderItems(); const inp = $("#cmt-in"); if (inp) inp.focus(); return; }
  const a = e.target.closest("[data-addcmt]");
  if (a) {
    const v = $("#cmt-in").value.trim();
    if (!v) { toast(L("พิมพ์ความเห็นก่อน", "Type a comment first")); return; }
    addComment(r, lineKey(r.items[Number(a.dataset.addcmt)]), v); CMT_OPEN = null; renderItems(); renderChecks(); refreshCommentPanel(r);
    return;
  }
  resolveClick(r, e);
}
function resolveClick(r, e) {
  const b = e.target.closest("[data-resolve]");
  if (!b) return;
  const c = r.comments.find(x => x.id === b.dataset.resolve);
  c.resolved = true;
  audit(["แก้ไขตามความเห็นผู้พิจารณา", "Resolved a reviewer comment"], r.id); commit(); route();
}
function refreshCommentPanel(r) { route(); }
function bindReviewMode(r) {
  $$(".panel [data-resolve]").forEach(b => (b.onclick = e => resolveClick(r, e)));
  const g = $("#gcmt-add");
  if (g) g.onclick = () => { const v = $("#gcmt-in").value.trim(); if (!v) { toast(L("พิมพ์ความเห็นก่อน", "Type a comment first")); return; } addComment(r, null, v); route(); };
  const ret = $("#rv-return");
  if (ret) ret.onclick = () => {
    if (!openComments(r).length) { toastErr(L("ใส่ความเห็นอย่างน้อย 1 ข้อก่อนส่งกลับ เพื่อให้ผู้จัดทำรู้ว่าต้องแก้อะไร", "Add at least one comment first so the requester knows what to fix")); return; }
    const by = reviewBy(r);
    r.status = "returned"; r.updated = TODAY;
    audit(["ส่งคำขอกลับแก้ไข", "Returned a request for revision"], r.id + by);
    notify(["div"], [`คำขอ ${r.id} ถูกส่งกลับแก้ไข มีความเห็น ${openComments(r).length} ข้อ`, `Request ${r.id} was returned with ${openComments(r).length} comments`], "requests");
    commit(); renderShell(); route(); toast(L("ส่งกลับแก้ไขแล้ว · แจ้งผู้จัดทำในระบบและอีเมล", "Returned · requester notified in-app and by email"));
  };
  const pass = $("#rv-pass");
  if (pass) pass.onclick = () => {
    // B1 (FR-B-12, FR-B-20): division director → Planning → committee (only when w3 applies) or executive → approved
    const from = r.status, by = reviewBy(r), next = from === "unit" ? "plan" : from === "plan" ? (needsCommittee(r) ? "committee" : "exec") : "approved";
    r.status = next; r.updated = TODAY;
    if (from === "unit") snapshot(r, ["ผู้อำนวยการกองเห็นชอบ", "Division director approved"], true);
    const A = { plan: [["ผู้อำนวยการกองเห็นชอบและส่งกองแผนงาน", "Division director approved and sent to Planning"], ["plan"], [`คำขอ ${r.id} รอกองแผนกลั่นกรอง`, `Request ${r.id} is waiting for Planning review`], L("ส่งกองแผนงานแล้ว", "Sent to Planning")],
      committee: [["ผ่านการกลั่นกรองและเสนอคณะกรรมการ", "Passed review and sent to the committee"], ["exec"], [`คำขอ ${r.id} เข้าวาระคณะกรรมการ`, `Request ${r.id} is on the committee agenda`], L("เสนอคณะกรรมการแล้ว", "Sent to the committee")],
      exec: [["ผ่านการกลั่นกรองและเสนอผู้บริหาร", "Passed review and sent to the executive"], ["exec"], [`คำขอ ${r.id} รอผู้บริหารเห็นชอบ (ไม่เข้าเกณฑ์คณะกรรมการ)`, `Request ${r.id} awaits executive approval (below the committee threshold)`], L("เสนอผู้บริหารแล้ว · ไม่เข้าเกณฑ์คณะกรรมการ", "Sent to the executive · below the committee threshold")],
      approved: [["เห็นชอบคำขอ", "Approved a request"], ["plan", "div"], [`ผู้บริหารเห็นชอบคำขอ ${r.id}`, `Request ${r.id} was approved`], L("เห็นชอบแล้ว · พร้อมรวมในชุดส่งสำนักงบประมาณ", "Approved · ready for the Budget Bureau package")] }[next];
    audit(A[0], r.id + by); notify(A[1], A[2], "requests");
    commit(); renderShell(); route(); toast(A[3]);
  };
}
