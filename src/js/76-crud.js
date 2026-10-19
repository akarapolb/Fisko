// Shared list + drawer for create, read, update and delete (round C1, Budget CRUD design chapter 4).
// A record type is declared once with CRUD.def(key, spec); crudList(key) renders the toolbar, the table and, when
// a record is open, the drawer. Clicks and form submits are handled here for every page, so a page only renders.
//
// spec: {
//   noun: [th, en], list: () => records, id: r => id, title: r => text, sub: r => text,
//   st: { key: [[th, en], pillClass] }, status: r => key, gone: r => true when cancelled/withdrawn (hidden by default),
//   cols: [{ h: label, c: r => html, n: true for numbers }], search: r => text,
//   filters: [{ id, label, opts: () => [[value, label]], get: r => value }],
//   fields: (r | null, vals) => [{ id, label, type: text|money|number|select|date|textarea|check|info, opts, req, min, max, lock, hint, wide }],
//   check: (vals, r | null) => [{ f: fieldId | null, m: message }],
//   create: { can: () => bool, label: [th, en], run: vals => record },   // run returns the new record
//   edit: { can: r => bool, run: (r, vals, why) => void, why: r => bool },  // why: ask for a reason when saving
//   acts: r => [{ id, label, kind: primary|danger|ghost, why: bool, whyLabel, whyMin, confirm: text, impact: () => text, undo: false, run: (r, why) => toastText }],
//   view: r => html (the details tab), tabs: r => [[id, label, html]], hist: r => history key,
//   prefill: () => vals (for a new record),
// }
const CRUD = { defs: {}, def(key, spec) { this.defs[key] = spec; return spec; } };
// The open drawer: { key, id ("" for new), mode: "view" | "edit", tab, draft: values typed so far, ask: action waiting for a reason, err }
let CR_OPEN = null;
const CR_F = {}; // per list: { q, show, filters }
let CR_UNDO = null; // { snap, label, timer }

const crSpec = k => CRUD.defs[k];
const crRec = (k, id) => (crSpec(k).list() || []).find(r => String(crSpec(k).id(r)) === String(id));
const crMoney = v => (v == null || v === "" ? "" : (Number(v) / 1e6).toFixed(2));
const crVal = (fd, vals) => (vals && vals[fd.id] !== undefined ? vals[fd.id] : fd.value);

function crOpen(key, id, mode) { CR_OPEN = { key, id: id || "", mode: mode || (id ? "view" : "edit"), tab: "view", draft: null, ask: null, err: null }; }
function crClose() { CR_OPEN = null; }

// ---------- list ----------
function crudList(key, opts = {}) {
  const sp = crSpec(key), F = (CR_F[key] = CR_F[key] || { q: "", show: false, f: {} });
  let rows = (sp.list() || []).slice();
  const goneN = sp.gone ? rows.filter(sp.gone).length : 0;
  if (sp.gone && !F.show) rows = rows.filter(r => !sp.gone(r));
  (sp.filters || []).forEach(f => { const v = F.f[f.id]; if (v) rows = rows.filter(r => String(f.get(r)) === v); });
  if (F.q && sp.search) { const q = F.q.toLowerCase(); rows = rows.filter(r => sp.search(r).toLowerCase().includes(q)); }
  const canNew = sp.create && sp.create.can();
  const bar = `<div class="cr-bar">
    ${sp.search ? `<input type="search" class="cr-q" id="crq-${key}" data-crq="${key}" value="${esc(F.q)}" placeholder="${L("ค้นหา", "Search")}" aria-label="${L("ค้นหา", "Search")} ${esc(tx(sp.noun))}">` : ""}
    ${(sp.filters || []).map(f => `<select id="crf-${key}-${f.id}" data-crf="${key}|${f.id}" aria-label="${esc(tx(f.label))}"><option value="">${esc(tx(f.label))}: ${L("ทั้งหมด", "all")}</option>${f.opts().map(([v, l]) => `<option value="${esc(v)}" ${F.f[f.id] === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`).join("")}
    ${goneN ? `<label class="field-inline" for="crs-${key}"><input type="checkbox" id="crs-${key}" data-crs="${key}" ${F.show ? "checked" : ""}> ${L("แสดงที่ยกเลิก", "Show cancelled")} (${goneN})</label>` : ""}
    <span class="sp"></span><span class="sub">${rows.length} ${L("รายการ", "records")}</span>
    ${canNew ? `<button class="btn primary" type="button" data-crnew="${key}">+ ${tx(sp.create.label)}</button>` : ""}</div>`;
  const table = rows.length ? `<div class="tbl-wrap"><table class="cr-tbl"><thead><tr>${sp.cols.map(c => `<th${c.n ? ` class="n"` : ""}>${tx(c.h)}</th>`).join("")}${sp.st ? `<th>${L("สถานะ", "Status")}</th>` : ""}</tr></thead>
    <tbody>${rows.map(r => { const id = sp.id(r), on = CR_OPEN && CR_OPEN.key === key && String(CR_OPEN.id) === String(id);
      return `<tr class="click ${sp.gone && sp.gone(r) ? "cr-gone" : ""} ${on ? "cr-on" : ""}" data-cropen="${key}|${esc(id)}" tabindex="0" aria-label="${L("เปิด", "Open")} ${esc(id)}">${sp.cols.map(c => `<td${c.n ? ` class="n"` : ""}>${c.c(r)}</td>`).join("")}${sp.st ? `<td>${crPill(sp, r)}</td>` : ""}</tr>`; }).join("")}</tbody>
    ${opts.foot ? `<tfoot>${opts.foot}</tfoot>` : ""}</table></div>`
    : `<div class="body sub cr-empty">${F.q || Object.values(F.f).some(Boolean) ? L("ไม่พบรายการที่ตรงกับตัวกรอง", "Nothing matches the filters") : opts.empty || L("ยังไม่มีรายการ", "Nothing here yet")}${canNew && !F.q ? ` · <button class="btn ghost" type="button" data-crnew="${key}">+ ${tx(sp.create.label)}</button>` : ""}</div>`;
  return `<section class="panel cr-list" data-crlist="${key}">${opts.head ? `<header>${opts.head}</header>` : ""}${bar}${table}${opts.after || ""}</section>${CR_OPEN && CR_OPEN.key === key ? crDrawer() : ""}`;
}
const crPill = (sp, r) => { const s = sp.st[sp.status(r)] || [[sp.status(r), sp.status(r)], "p-mute"]; return tag(tx(s[0]), s[1]); };

// ---------- drawer ----------
function crDrawer() {
  const o = CR_OPEN, sp = crSpec(o.key), r = o.id ? crRec(o.key, o.id) : null;
  if (o.id && !r) { CR_OPEN = null; return ""; }
  const isNew = !r, editing = o.mode === "edit";
  const head = `<header class="cr-head"><div style="min-width:0"><div class="eyebrow">${esc(tx(sp.noun))}${r ? ` · <span class="mono">${esc(sp.id(r))}</span>` : ""}</div>
      <h2 tabindex="-1" id="cr-title">${isNew ? `${tx(sp.create.label)}` : esc(sp.title(r))}</h2>${r && sp.sub ? `<div class="sub">${sp.sub(r)}</div>` : ""}</div>
    <span class="sp"></span>${r && sp.st ? crPill(sp, r) : ""}<button class="btn ghost" type="button" data-crclose aria-label="${L("ปิด", "Close")}">✕</button></header>`;
  let body;
  if (editing) body = crForm(sp, r);
  else {
    const tabs = [["view", L("รายละเอียด", "Details"), sp.view ? sp.view(r) : ""], ...(sp.tabs ? sp.tabs(r) : []), ["hist", L("ประวัติ", "History"), crHist(sp, r)]];
    const cur = tabs.find(t => t[0] === o.tab) || tabs[0];
    body = `<div class="tabs cr-tabs" role="tablist">${tabs.map(t => `<button class="tab ${t === cur ? "on" : ""}" type="button" role="tab" aria-selected="${t === cur}" data-crtab="${t[0]}">${t[1]}</button>`).join("")}</div>
      <div class="cr-body">${cur[2] || `<span class="sub">–</span>`}</div>${crActBar(sp, r)}`;
  }
  return `<div class="fn-scrim" data-crclose></div><aside class="fn-drawer cr-drawer" role="dialog" aria-modal="true" aria-labelledby="cr-title">${head}${body}</aside>`;
}
function crActBar(sp, r) {
  const o = CR_OPEN, acts = (sp.acts ? sp.acts(r) : []).filter(Boolean), canEd = sp.edit && sp.edit.can(r);
  if (o.ask) {
    const a = acts.find(x => x.id === o.ask);
    if (a) return `<form class="cr-ask" id="cr-ask"><b>${a.label}</b>${a.impact ? `<div class="sub">${a.impact()}</div>` : ""}${a.confirm ? `<div>${a.confirm}</div>` : ""}
      ${a.why ? `<label for="cr-why">${a.whyLabel || L("เหตุผล (อย่างน้อย 10 ตัวอักษร)", "Reason (at least 10 characters)")}</label><textarea id="cr-why" rows="2" required minlength="${a.whyMin || 10}"></textarea>${o.err ? `<div class="cr-err">${esc(o.err)}</div>` : ""}` : ""}
      <div class="row"><button class="btn ${a.kind === "danger" ? "danger" : "primary"}" type="submit">${L("ยืนยัน", "Confirm")}</button><button class="btn ghost" type="button" data-crask="">${L("ยกเลิก", "Back")}</button></div></form>`;
  }
  if (!acts.length && !canEd) return "";
  return `<div class="cr-acts">${canEd ? `<button class="btn" type="button" data-credit>${L("แก้ไข", "Edit")}</button>` : ""}${acts.map(a => `<button class="btn ${a.kind || ""}" type="button" data-crask="${a.id}">${a.label}</button>`).join("")}</div>`;
}
function crHist(sp, r) {
  const key = sp.hist ? sp.hist(r) : String(sp.id(r)), items = typeof historyItems === "function" ? historyItems(key) : [];
  return items.length ? `<ol class="timeline">${items.slice(0, 30).map(i => `<li class="done"><span class="dot"></span><div><b style="font-weight:600">${esc(i.what)}</b><small>${esc(i.who)}${i.role ? " · " + tx(ROLES[i.role]) : ""} · ${fdate(i.t, true)}</small>${i.detail ? `<div class="sub">${esc(i.detail)}</div>` : ""}</div></li>`).join("")}</ol>`
    : `<span class="sub">${L("ยังไม่มีประวัติ", "No history yet")}</span>`;
}
function crForm(sp, r) {
  const o = CR_OPEN, vals = o.draft || (r ? null : sp.prefill ? sp.prefill() : null), F = sp.fields(r, vals || {});
  const errs = o.err || [], eOf = id => errs.filter(e => e.f === id).map(e => `<div class="cr-err" id="cre-${id}">${esc(e.m)}</div>`).join("");
  const top = errs.filter(e => !e.f || !F.some(f => f.id === e.f));
  const field = f => {
    const v = crVal(f, vals), id = `crx-${f.id}`, req = f.req ? " required" : "", lab = `<label for="${id}">${tx(f.label)}${f.req ? ` <span class="cr-req" aria-hidden="true">*</span>` : ""}</label>`, hint = f.hint ? `<div class="sub">${f.hint}</div>` : "";
    const bad = errs.some(e => e.f === f.id) ? ` aria-invalid="true" aria-describedby="cre-${f.id}"` : "";
    if (f.type === "info") return `<div class="cr-f ${f.wide ? "wide" : ""}"><span class="cr-lab">${tx(f.label)}</span><div>${f.html}</div></div>`;
    if (f.lock) return `<div class="cr-f ${f.wide ? "wide" : ""}"><span class="cr-lab">${tx(f.label)}</span><div>${f.show || esc(String(v ?? "–"))}</div>${hint}</div>`;
    let inp;
    if (f.type === "select") inp = `<select id="${id}" name="${f.id}"${req}${bad}>${f.blank ? `<option value="">${f.blank}</option>` : ""}${f.opts.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    else if (f.type === "textarea") inp = `<textarea id="${id}" name="${f.id}" rows="3"${req}${bad}>${esc(v || "")}</textarea>`;
    else if (f.type === "check") return `<div class="cr-f ${f.wide ? "wide" : ""}"><label class="field-inline" for="${id}"><input type="checkbox" id="${id}" name="${f.id}" ${v ? "checked" : ""}> ${tx(f.label)}</label>${hint}</div>`;
    else if (f.type === "money") inp = `<input type="number" id="${id}" name="${f.id}" step="0.01" min="${f.min != null ? crMoney(f.min) : "0"}"${f.max != null ? ` max="${crMoney(f.max)}"` : ""} value="${typeof v === "number" ? crMoney(v) : esc(v ?? "")}" inputmode="decimal"${req}${bad}>`;
    else inp = `<input type="${f.type || "text"}" id="${id}" name="${f.id}" value="${esc(v ?? "")}"${f.min != null ? ` min="${f.min}"` : ""}${f.max != null ? ` max="${f.max}"` : ""}${req}${bad}>`;
    return `<div class="cr-f ${f.wide ? "wide" : ""}">${lab}${inp}${hint}${eOf(f.id)}</div>`;
  };
  const why = r && sp.edit && sp.edit.why && sp.edit.why(r);
  return `<form class="cr-form" id="cr-form" novalidate>
    ${top.length ? `<div class="cr-errsum" role="alert">${top.map(e => `<div>${esc(e.m)}</div>`).join("")}</div>` : errs.length ? `<div class="cr-errsum" role="alert">${L("แก้ช่องที่มีข้อผิดพลาดก่อนบันทึก", "Fix the fields marked below before saving")}</div>` : ""}
    <div class="cr-grid">${F.map(field).join("")}
    ${why ? `<div class="cr-f wide"><label for="crx-_why">${L("เหตุผลที่แก้ไข", "Reason for the change")} <span class="cr-req" aria-hidden="true">*</span></label><textarea id="crx-_why" name="_why" rows="2">${esc((vals && vals._why) || "")}</textarea>${eOf("_why")}</div>` : ""}</div>
    <div class="cr-acts"><button class="btn primary" type="submit">${r ? L("บันทึก", "Save") : tx(sp.create.label)}</button><button class="btn ghost" type="button" data-crcancel>${L("ยกเลิก", "Cancel")}</button></div></form>`;
}
// Read the form into values: money fields become baht, checkboxes booleans.
function crRead(sp, r) {
  const f = $("#cr-form"), out = {};
  if (!f) return out;
  sp.fields(r, CR_OPEN.draft || {}).forEach(fd => {
    const el = f.querySelector(`[name="${fd.id}"]`); if (!el || fd.lock || fd.type === "info") return;
    out[fd.id] = fd.type === "check" ? el.checked : fd.type === "money" ? (el.value === "" ? "" : Math.round(Number(el.value) * 1e6)) : fd.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value.trim();
  });
  const w = f.querySelector('[name="_why"]'); if (w) out._why = w.value.trim();
  return out;
}

// ---------- undo ----------
function crSnap() { return JSON.stringify(S); }
function crUndoOffer(snap, label) {
  if (CR_UNDO) clearTimeout(CR_UNDO.timer);
  let el = $("#cr-undo");
  if (!el) { el = document.createElement("div"); el.id = "cr-undo"; el.className = "cr-undo"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(label)}</span><button class="btn" type="button" id="cr-undo-btn">${L("เลิกทำ", "Undo")}</button>`;
  el.hidden = false;
  CR_UNDO = { snap, label, timer: setTimeout(() => { el.hidden = true; CR_UNDO = null; }, 10000) };
  $("#cr-undo-btn").onclick = () => {
    if (!CR_UNDO) return;
    S = JSON.parse(CR_UNDO.snap); clearTimeout(CR_UNDO.timer);
    audit(["เลิกทำการเปลี่ยนแปลง", "Undid a change"], CR_UNDO.label); CR_UNDO = null; el.hidden = true; commit(); route(); toast(L("เลิกทำแล้ว", "Undone"));
  };
}

// ---------- events (one set for every page) ----------
function crDone(msg, snap) { commit(); route(); if (snap) crUndoOffer(snap, msg); else if (msg) toast(msg); const t = $("#cr-title"); if (t) t.focus(); }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-cropen],[data-crnew],[data-crclose],[data-crtab],[data-credit],[data-crcancel],[data-crask]");
  if (!t || !$("#view").contains(t)) return;
  if (t.dataset.cropen) { const [k, id] = t.dataset.cropen.split("|"); crOpen(k, id); route(); $("#cr-title") && $("#cr-title").focus(); return; }
  if (t.dataset.crnew) { crOpen(t.dataset.crnew, "", "edit"); route(); const f = $("#cr-form input, #cr-form select"); if (f) f.focus(); return; }
  if (t.hasAttribute("data-crclose")) { if (CR_OPEN && CR_OPEN.mode === "edit" && CR_OPEN.dirty && !CR_OPEN.leave) { CR_OPEN.leave = true; CR_OPEN.draft = crRead(crSpec(CR_OPEN.key), CR_OPEN.id ? crRec(CR_OPEN.key, CR_OPEN.id) : null); CR_OPEN.err = [{ f: null, m: L("ยังไม่ได้บันทึกการแก้ไข กดปิดอีกครั้งเพื่อทิ้ง หรือกดบันทึก", "Your changes aren't saved. Close again to discard them, or save.") }]; route(); return; } crClose(); route(); return; }
  if (t.dataset.crtab) { CR_OPEN.tab = t.dataset.crtab; route(); return; }
  if (t.hasAttribute("data-credit")) { CR_OPEN.mode = "edit"; CR_OPEN.draft = null; CR_OPEN.err = null; route(); const f = $("#cr-form input:not([type=hidden]), #cr-form select"); if (f) f.focus(); return; }
  if (t.hasAttribute("data-crcancel")) { if (CR_OPEN.id) { CR_OPEN.mode = "view"; CR_OPEN.draft = null; CR_OPEN.err = null; CR_OPEN.dirty = false; } else crClose(); route(); return; }
  if (t.dataset.crask !== undefined) {
    const sp = crSpec(CR_OPEN.key), r = crRec(CR_OPEN.key, CR_OPEN.id), a = t.dataset.crask && (sp.acts(r) || []).find(x => x && x.id === t.dataset.crask);
    if (a && !a.why && !a.confirm && !a.impact) return crRun(sp, r, a, "");
    CR_OPEN.ask = t.dataset.crask || null; CR_OPEN.err = null; route(); const w = $("#cr-why"); if (w) w.focus();
  }
});
function crRun(sp, r, a, why) {
  const snap = crSnap(), msg = a.run(r, why);
  if (CR_OPEN) { CR_OPEN.ask = null; CR_OPEN.err = null; }
  if (CR_OPEN && !crRec(CR_OPEN.key, CR_OPEN.id)) crClose();
  crDone(msg, a.undo === false ? null : snap);
}
document.addEventListener("submit", e => {
  if (!CR_OPEN || !e.target.closest("#view")) return;
  if (e.target.id === "cr-ask") {
    e.preventDefault();
    const sp = crSpec(CR_OPEN.key), r = crRec(CR_OPEN.key, CR_OPEN.id), a = (sp.acts(r) || []).find(x => x && x.id === CR_OPEN.ask), w = $("#cr-why"), why = w ? w.value.trim() : "";
    if (!a) return;
    if (a.why && why.length < (a.whyMin || 10)) { CR_OPEN.err = a.whyMin ? L("กรอกข้อความก่อนยืนยัน", "Fill this in before confirming") : L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters"); route(); const x = $("#cr-why"); if (x) { x.value = why; x.focus(); } return; }
    return crRun(sp, r, a, why);
  }
  if (e.target.id !== "cr-form") return;
  e.preventDefault();
  const sp = crSpec(CR_OPEN.key), r = CR_OPEN.id ? crRec(CR_OPEN.key, CR_OPEN.id) : null, vals = crRead(sp, r);
  const F = sp.fields(r, vals), errs = [];
  F.forEach(f => { if (f.req && !f.lock && f.type !== "info" && f.type !== "check" && (vals[f.id] === "" || vals[f.id] == null)) errs.push({ f: f.id, m: L("ต้องกรอก", "Required") });
    if (f.type === "money" && vals[f.id] !== "" && vals[f.id] != null && !f.lock) { if (f.min != null && vals[f.id] < f.min) errs.push({ f: f.id, m: `${L("ไม่น้อยกว่า", "At least")} ${mb(f.min)} ${L("ลบ.", "M")}` }); if (f.max != null && vals[f.id] > f.max) errs.push({ f: f.id, m: `${L("ไม่เกิน", "At most")} ${mb(f.max)} ${L("ลบ.", "M")}` }); } });
  if (r && sp.edit && sp.edit.why && sp.edit.why(r) && (vals._why || "").length < 10) errs.push({ f: "_why", m: L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters") });
  if (!errs.length && sp.check) errs.push(...sp.check(vals, r));
  if (errs.length) { CR_OPEN.draft = vals; CR_OPEN.err = errs; route(); const b = $('#cr-form [aria-invalid="true"]') || $(".cr-errsum"); if (b) b.focus && b.focus(); return; }
  const snap = crSnap();
  if (r) { sp.edit.run(r, vals, vals._why || ""); CR_OPEN.mode = "view"; CR_OPEN.draft = null; CR_OPEN.err = null; CR_OPEN.dirty = false; crDone(L("บันทึกแล้ว", "Saved"), null); return; }
  const n = sp.create.run(vals);
  if (n) { crOpen(CR_OPEN.key, sp.id(n), "view"); crDone(`${L("สร้างแล้ว", "Created")} ${sp.id(n)}`, snap); }
  else crDone("", null);
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.closest && t.closest("#cr-form") && CR_OPEN) { CR_OPEN.dirty = true; CR_OPEN.leave = false; return; }
  if (t.dataset && t.dataset.crq) { const k = t.dataset.crq, pos = t.selectionStart; CR_F[k].q = t.value; route(); const q = $("#crq-" + k); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} } }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.closest && t.closest("#cr-form") && CR_OPEN) {
    // Fields that depend on other fields (such as a hint) re-render with what has been typed so far.
    const sp = crSpec(CR_OPEN.key); if (!sp.live) return;
    CR_OPEN.draft = crRead(sp, CR_OPEN.id ? crRec(CR_OPEN.key, CR_OPEN.id) : null); CR_OPEN.dirty = true; route(); const el = $("#crx-" + t.name); if (el) el.focus(); return;
  }
  if (t.dataset && t.dataset.crf) { const [k, f] = t.dataset.crf.split("|"); CR_F[k].f[f] = t.value; route(); return; }
  if (t.dataset && t.dataset.crs) { CR_F[t.dataset.crs].show = t.checked; route(); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.cropen) { e.target.click(); return; }
  if (e.key === "Escape" && CR_OPEN && $(".cr-drawer")) { const c = $(".cr-drawer [data-crclose]"); if (c) c.click(); }
});
// Leaving the page closes the drawer.
window.addEventListener("hashchange", () => { CR_OPEN = null; });
