// Enter, review, confirm (round 62, after the Fabor console's action rule). Every record action in the shared
// CRUD drawer that asks for something (a reason, an amount, a confirmation) or that is a danger action now has a
// review step between entering and confirming. The review states the consequence in plain words and figures: the
// record, the action, the amount, the reason as it will be recorded, and whether it can be undone. An action that
// cannot be undone asks for the record id to be typed before it runs.
const crNeedsReview = a => a && (a.why || a.confirm || a.impact || a.num || a.kind === "danger");
const crIrreversible = a => a && a.undo === false;
const crSteps = n => `<ol class="cr-steps" aria-label="${L("ขั้นตอน", "Steps")}">${[L("กรอก", "Enter"), L("ตรวจทาน", "Review"), L("ยืนยัน", "Confirm")].map((s, i) => `<li class="${i < n ? "done" : i === n ? "on" : ""}" ${i === n ? 'aria-current="step"' : ""}><span>${i + 1}</span>${s}</li>`).join("")}</ol>`;
{
  const base = crActBar;
  crActBar = function (sp, r) {
    const o = CR_OPEN;
    if (!o || !o.ask) return base(sp, r);
    const a = (sp.acts ? sp.acts(r) : []).filter(Boolean).find(x => x.id === o.ask);
    if (!a) return base(sp, r);
    if (!o.rv) {
      // the enter step: the drawer's own form, with the steps on top and Review in place of Confirm
      const h = base(sp, r), conf = `type="submit">${L("ยืนยัน", "Confirm")}</button>`;
      return h.replace('<form class="cr-ask" id="cr-ask">', `<form class="cr-ask" id="cr-ask">${crSteps(0)}`).replace(conf, `type="submit">${L("ตรวจทาน", "Review")} ${icon("arrow", 13)}</button>`);
    }
    const id = String(sp.id(r)), irr = crIrreversible(a), rows = [
      [L("รายการ", "Record"), `${esc(tx(sp.noun))} · <span class="mono">${esc(id)}</span> · ${esc(sp.title(r))}`],
      [L("การดำเนินการ", "Action"), `<b>${a.label}</b>`],
      a.num ? [tx(a.num.label), `<b class="num">${fmt(o.rv.num)}</b>`] : null,
      o.rv.why ? [a.whyLabel ? L("ข้อความที่บันทึก", "Recorded text") : L("เหตุผลที่บันทึก", "Reason recorded"), `“${esc(o.rv.why)}”`] : null,
      a.impact || a.confirm ? [L("ผลที่จะเกิดขึ้น", "What happens"), `${a.impact ? a.impact() : ""}${a.impact && a.confirm ? "<br>" : ""}${a.confirm || ""}`] : null,
      [L("บันทึกในประวัติ", "History"), `${esc(tx(me().name))} · ${tx(ROLES[ROLE])} · ${fdate(TODAY)}`],
      [L("ย้อนกลับ", "Undo"), irr ? `<b style="color:var(--bad)">${L("ย้อนกลับไม่ได้", "This cannot be undone")}</b>` : L("ย้อนกลับได้ภายใน 10 วินาทีหลังยืนยัน", "You can undo for 10 seconds after confirming")],
    ].filter(Boolean);
    return `<form class="cr-ask cr-review" id="cr-review">${crSteps(1)}<b>${L("ตรวจทานก่อนยืนยัน", "Check before you confirm")}</b>
      <dl class="cr-rv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      ${irr ? `<label for="cr-type">${L("พิมพ์เลขที่รายการ", "Type the record id")} <span class="mono">${esc(id)}</span> ${L("เพื่อยืนยัน", "to confirm")}</label><input type="text" id="cr-type" autocomplete="off" spellcheck="false" style="max-width:240px">` : ""}
      ${o.err ? `<div class="cr-err" role="alert" style="color:var(--bad);font-size:13.5px">${o.err}</div>` : ""}
      <div class="row"><button class="btn ${a.kind === "danger" ? "danger" : "primary"}" type="submit">${L("ยืนยัน", "Confirm")} · ${a.label}</button><button class="btn ghost" type="button" data-crrvback>${L("กลับไปแก้ไข", "Back to edit")}</button></div></form>`;
  };
}
// A danger action with nothing to enter goes straight to the review.
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-crask],[data-crrvback]");
  if (!t || !CR_OPEN || !$("#view").contains(t)) return;
  if (t.hasAttribute("data-crrvback")) {
    const rv = CR_OPEN.rv; CR_OPEN.rv = null; CR_OPEN.err = null; route();
    const w = $("#cr-why"), n = $("#cr-num"); if (w && rv) w.value = rv.why; if (n && rv && rv.num != null) n.value = rv.num; (w || n || $("#cr-ask button[type=submit]") || { focus() {} }).focus();
    return;
  }
  CR_OPEN.rv = null;
  const sp = crSpec(CR_OPEN.key), r = crRec(CR_OPEN.key, CR_OPEN.id), a = t.dataset.crask && (sp.acts(r) || []).find(x => x && x.id === t.dataset.crask);
  if (a && a.kind === "danger" && !a.why && !a.confirm && !a.impact && !a.num) {
    e.stopImmediatePropagation();
    CR_OPEN.ask = a.id; CR_OPEN.rv = { why: "", num: undefined }; CR_OPEN.err = null; route(); const b = $("#cr-review button[type=submit]"); if (b) b.focus();
  }
}, true);
document.addEventListener("submit", e => {
  if (!CR_OPEN || !e.target.closest || !e.target.closest("#view")) return;
  const sp = crSpec(CR_OPEN.key), r = crRec(CR_OPEN.key, CR_OPEN.id), a = r && (sp.acts(r) || []).find(x => x && x.id === CR_OPEN.ask);
  if (e.target.id === "cr-ask") {
    if (!crNeedsReview(a)) return;
    const w = $("#cr-why"), why = w ? w.value.trim() : "";
    if (a.why && why.length < (a.whyMin || CR_WHY_MIN)) return; // the drawer's own handler says what is missing
    let num;
    if (a.num) { num = Number(($("#cr-num") || { value: "" }).value); if (!(num > (a.num.min ?? 0)) || num > a.num.max) return; }
    e.preventDefault(); e.stopImmediatePropagation();
    CR_OPEN.rv = { why, num }; CR_OPEN.err = null; route();
    const f = $("#cr-type") || $("#cr-review button[type=submit]"); if (f) f.focus();
    return;
  }
  if (e.target.id === "cr-review") {
    e.preventDefault(); e.stopImmediatePropagation();
    if (!a || !CR_OPEN.rv) return;
    if (crIrreversible(a)) { const typed = ($("#cr-type") || { value: "" }).value.trim(); if (typed !== String(sp.id(r))) { CR_OPEN.err = L("เลขที่รายการไม่ตรง ลองพิมพ์อีกครั้ง", "The id does not match. Type it again."); route(); const x = $("#cr-type"); if (x) { x.value = typed; x.focus(); } return; } }
    const rv = CR_OPEN.rv; CR_OPEN.rv = null;
    crRun(sp, r, a, rv.why, rv.num);
  }
}, true);
window.addEventListener("hashchange", () => { if (CR_OPEN) CR_OPEN.rv = null; });
