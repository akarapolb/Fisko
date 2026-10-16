// Record history drawer (round 7): every audit entry, AI action and version that mentions a record.
// Any element with data-hist="<key>" opens it; historyBtn() renders the standard button.
const historyBtn = (key, title) => `<button class="btn ghost hist-btn" type="button" data-hist="${esc(key)}" data-hist-title="${esc(title || key)}" aria-label="${L("ประวัติของ", "History of")} ${esc(title || key)}">${L("ประวัติ", "History")}</button>`;
function historyItems(key) {
  // A key may list alternatives separated by "|" (for example a record's Thai and English names).
  // Whole-token match, so "K1" does not also pick up "K12".
  const res = key.split("|").filter(Boolean).map(k => new RegExp(`(^|[^A-Za-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z0-9])`, "i"));
  const hit = s => res.some(re => re.test(s || "")), out = [];
  key = key.split("|")[0];
  S.audit.forEach(a => { if (hit(a.target)) out.push({ t: a.t, who: userName(a.user), role: a.role, what: tx(a.action), detail: a.target, kind: "audit" }); });
  (S.aiLog || []).forEach(a => { if (hit(a.target)) out.push({ t: a.t, who: a.user === "system" ? L("ระบบอัตโนมัติ", "Automatic") : userName(a.user), role: null, what: `${a.agent} · ${tx(a.action)}`, detail: a.ok ? `${a.sources} ${L("แหล่งอ้างอิง", "sources")}` : L("ปฏิเสธ", "Declined"), kind: "ai" }); });
  const r = S.requests.find(x => x.id === key);
  if (r) {
    (r.versions || []).forEach(v => out.push({ t: v.t, who: userName(v.by), role: null, what: `${L("บันทึกเวอร์ชัน", "Saved version")} v${v.v}`, detail: `${tx(v.note)} · ${fmt(v.amount)} ${L("บาท", "baht")}`, kind: "version" }));
    (r.comments || []).forEach(c => out.push({ t: c.t, who: userName(c.by), role: c.role, what: c.resolved ? L("ความเห็น (แก้แล้ว)", "Comment (resolved)") : L("ความเห็น", "Comment"), detail: tx(c.text), kind: "comment" }));
  }
  const seen = new Set();
  return out.filter(i => { const s = i.t + i.what + i.detail; if (seen.has(s)) return false; seen.add(s); return true; }).sort((a, b) => (a.t < b.t ? 1 : -1));
}
const HKIND = { audit: ["บันทึกการใช้งาน", "Audit"], ai: ["AI", "AI"], version: ["เวอร์ชัน", "Version"], comment: ["ความเห็น", "Comment"] };
let H_LAST = null;
function openHistory(key, title, opener) {
  const d = $("#hdrawer"), items = historyItems(key);
  H_LAST = opener || document.activeElement;
  d.innerHTML = `<header><div><div class="eyebrow">${L("ประวัติการเปลี่ยนแปลง", "Change history")}</div><b>${esc(title)}</b></div><span class="sp"></span>
      <button class="btn ghost" type="button" id="h-close" aria-label="${L("ปิด", "Close")}">✕</button></header>
    <div class="h-body">${items.length ? `<ol class="timeline">${items.map(i => `<li class="done"><span class="dot"></span><div><b style="font-weight:600">${esc(i.what)}</b> ${tag(tx(HKIND[i.kind]), i.kind === "ai" ? "p-info" : i.kind === "comment" ? "p-warn" : "p-mute")}
        <small>${esc(i.who)}${i.role ? " · " + tx(ROLES[i.role]) : ""} · ${fdate(i.t, true)}</small>${i.detail ? `<div class="sub">${esc(i.detail)}</div>` : ""}</div></li>`).join("")}</ol>`
      : `<span class="sub">${L("ยังไม่มีประวัติของรายการนี้", "No history for this record yet")}</span>`}
      <p class="sub" style="margin-top:12px">${L("ดึงจากบันทึกการใช้งานแบบแก้ไขไม่ได้ (M10)", "Drawn from the append-only audit log (M10)")}</p></div>`;
  d.hidden = false;
  $("#h-close").onclick = closeHistory;
  $("#h-close").focus();
}
function closeHistory() { $("#hdrawer").hidden = true; if (H_LAST && H_LAST.focus) H_LAST.focus(); }
function bindHistory() {
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-hist]");
    if (b) { e.preventDefault(); e.stopPropagation(); openHistory(b.dataset.hist, b.dataset.histTitle || b.dataset.hist, b); return; }
    const d = $("#hdrawer");
    if (!d.hidden && !e.target.closest("#hdrawer")) closeHistory();
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#hdrawer").hidden) closeHistory(); });
}
