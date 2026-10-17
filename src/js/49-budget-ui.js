// Fisko Budget, design system v2 (round 25). Two parts:
// 1. uiDecorate(view) runs after every page render (from route): it gives the page heading an icon chip and
//    upgrades legacy KPI tiles (.kpis > .kpi) with an icon chosen from the label and an accent colour, so
//    every Budget screen shares the look of the new stat cards without rewriting each module.
// 2. Deeper redesigns for the busiest Budget screens: a status board for budget requests (M02) and a round
//    visual for review and approval (M04).
const KPI_ICON = [
  [/ความเสี่ยง|เสี่ยง|เลย|ล่าช้า|ต่ำกว่า|risk|overdue|late|behind|below|anomal|ผิดปกติ/i, "alert", "bad"],
  [/รอ|ค้าง|pending|waiting|open|in review|ระหว่าง/i, "clock", "warn"],
  [/อนุมัติ|เห็นชอบ|ผ่าน|approved|passed|done|เสร็จ|ครบ/i, "checksq", "ok"],
  [/เบิก|จ่าย|spend|paid|pay|disburs/i, "wallet", "info"],
  [/ตัวชี้วัด|kpi|เป้า|target|ผลสัมฤทธิ์|outcome/i, "target", "violet"],
  [/คำขอ|request/i, "inbox", "info"],
  [/โครงการ|project|แผนงาน|program/i, "folder", "info"],
  [/หน่วย|unit|กอง|สำนัก|division/i, "building", "info"],
  [/วงเงิน|งบ|บาท|amount|budget|baht|ล้าน|million|ceiling|กรอบ/i, "coins", "ok"],
  [/AI|ปัญญา|agent/i, "sparkle", "violet"],
];
function uiDecorate(view) {
  const h = view.querySelector(":scope > .head");
  if (h && !h.querySelector(".headico")) { const nm = NAV_ICON[CUR] || (CUR === "request" ? "inbox" : CUR === "delegation" ? "users" : CUR === "demo" ? "sparkle" : null); if (nm) h.insertAdjacentHTML("afterbegin", `<span class="headico">${svgI(nm)}</span>`); }
  view.querySelectorAll(".kpis > .kpi:not([data-ui])").forEach((k, i) => {
    k.dataset.ui = "1"; const lbl = (k.querySelector(".l") || {}).textContent || "", m = KPI_ICON.find(([re]) => re.test(lbl)) || [null, "chart", "info"];
    k.style.setProperty("--kc", `var(--c-${(i % 6) + 1})`);
    if (!k.classList.contains("hl")) k.insertAdjacentHTML("afterbegin", `<span class="kico ${m[2]}">${svgI(m[1])}</span>`);
  });
}

// ---------- M02: requests as a status board ----------
let REQ_VIEW = "board";
const REQ_COLS = [["work", ["จัดทำและแก้ไข", "Drafting and fixing"], "var(--faint)", ["draft", "returned"]], ["plan", ["กองแผนกลั่นกรอง", "Planning review"], "var(--info)", ["plan"]],
  ["committee", ["คณะกรรมการ", "Committee"], "var(--amber)", ["committee"]], ["done", ["ผลการพิจารณา", "Decided"], "var(--accent)", ["approved", "rejected"]]];
function reqCard(r) {
  const lim = (rule("BR-04") || {}).param || 20, d = r.prev ? (r.amount / r.prev - 1) * 100 : null, steps = ["draft", "plan", "committee", "approved"], si = Math.max(0, steps.indexOf(r.status === "returned" ? "draft" : r.status === "rejected" ? "approved" : r.status));
  return `<div class="card" data-rq="${r.id}" role="button" tabindex="0" aria-label="${r.id} ${esc(tx(r.name))}">
    <div class="cm"><span class="mono">${r.id}${r.id === S.story ? " ★" : ""}</span>${pill(r.status)}</div>
    <div class="ct">${esc(tx(r.name))}</div>
    <div class="cm"><span class="amt">${mb(r.amount)} <span class="sub">${L("ลบ.", "M")}</span></span>${d === null ? tag(L("ใหม่", "New"), "p-info") : `<span class="trend ${d > lim ? "down" : d >= 0 ? "up" : "flat"}">${d >= 0 ? "▲" : "▼"} ${fmt(Math.abs(d), 1)}%</span>`}</div>
    <div class="segbar">${steps.map((s, i) => `<i class="${r.status === "rejected" && i === 3 ? "bad" : r.status === "returned" && i === 0 ? "warn" : i < si ? "ok" : i === si ? "now" : ""}"></i>`).join("")}</div>
    <div class="cm"><span class="sub">${esc(unitName(r.unit))}</span>${(r.comments || []).filter(c => !c.resolved).length ? `<span class="sub">💬 ${(r.comments || []).filter(c => !c.resolved).length}</span>` : ""}</div></div>`;
}
{
  const base = VIEWS.requests;
  VIEWS.requests = () => {
    let html = base();
    const list = ROLE === "div" ? S.requests.filter(r => r.unit === me().unit) : S.requests, tot = sumv(list.map(r => r.amount)), byS = s => list.filter(r => s.includes(r.status));
    const stats = `<section class="stats">
      ${statCard({ label: L("คำขอทั้งหมด", "Requests"), value: list.length, icon: "inbox", tone: "info", sub: `${byS(["approved"]).length} ${L("เห็นชอบแล้ว", "approved")}` })}
      ${statCard({ label: L("วงเงินที่ขอรวม", "Total requested"), value: mb(tot), unit: L("ลบ.", "M"), icon: "coins", tone: "ok", spark: list.map(r => r.amount).sort((a, b) => a - b), sub: "" })}
      ${statCard({ label: L("ร่าง / ส่งกลับแก้ไข", "Draft / returned"), value: byS(["draft", "returned"]).length, icon: "file", tone: byS(["returned"]).length ? "bad" : "", trend: byS(["returned"]).length ? { dir: "down", text: `${byS(["returned"]).length} ${L("ส่งกลับ", "returned")}` } : null, sub: "" })}
      ${statCard({ label: L("ผ่านการพิจารณาแล้ว", "Through review"), value: pc(list.length ? byS(["committee", "approved"]).length / list.length : 0), ring: list.length ? byS(["committee", "approved"]).length / list.length : 0, sub: `${byS(["committee", "approved"]).length}/${list.length}` })}</section>`;
    html = html.replace(/<section class="kpis"[\s\S]*?<\/section>/, stats);
    const toggle = `<div class="viewtoggle" role="group" aria-label="${L("มุมมอง", "View")}"><button type="button" data-rview="board" class="${REQ_VIEW === "board" ? "on" : ""}">${svgI("kanban")}${L("บอร์ด", "Board")}</button><button type="button" data-rview="table" class="${REQ_VIEW === "table" ? "on" : ""}">${svgI("list")}${L("ตาราง", "Table")}</button></div>`;
    html = html.replace(`<section class="panel"><header><h2>${L("รายการคำขอ", "Requests")}</h2><span class="sp"></span>`, `<section class="panel" ${REQ_VIEW === "board" ? "hidden" : ""}><header><h2>${L("รายการคำขอ", "Requests")}</h2><span class="sp"></span>${toggle}`);
    if (REQ_VIEW === "board") html += `<section class="panel"><header>${chipIco("kanban", "info")}<h2>${L("คำขอตามขั้นตอน", "Requests by stage")}</h2><span class="sp"></span>${toggle}</header>
      <div class="body"><div class="board">${REQ_COLS.map(([k, nm, color, st]) => { const cs = byS(st); return `<div class="col" style="--c:${color}"><div class="col-h">${tx(nm)}<span class="n">${cs.length}</span></div>${cs.map(reqCard).join("") || `<div class="empty">${L("ไม่มีคำขอ", "No requests")}</div>`}</div>`; }).join("")}</div></div></section>`;
    return html;
  };
  const bb = BIND.requests;
  BIND.requests = () => {
    bb();
    $$("[data-rview]").forEach(b => (b.onclick = () => { REQ_VIEW = b.dataset.rview; route(); }));
    $$(".card[data-rq]").forEach(el => { el.onclick = () => openReq(el.dataset.rq); el.onkeydown = e => { if (e.key === "Enter") openReq(el.dataset.rq); }; });
  };
}

// ---------- M04: the three rounds as a step-down visual ----------
{
  const base = VIEWS.review;
  VIEWS.review = () => {
    let html = base();
    if (REV_TAB !== "rounds") return html;
    const s = k => S.review.reduce((a, r) => a + Number(r[k]), 0), r0 = s("r0"), r1 = s("r1"), r2 = s("r2"), mx = Math.max(r0, r1, r2, 1);
    const col = (lbl, v, prev, color, hl) => `<div class="rcol ${hl ? "hl" : ""}"><div class="rv">${fmt(v, 1)}<small>${L("ลบ.", "M")}</small></div>${prev != null ? `<span class="trend ${v < prev ? "down" : v > prev ? "up" : "flat"}">${v < prev ? "▼" : v > prev ? "▲" : "●"} ${fmt(Math.abs(v - prev), 1)} (${fmt(prev ? Math.abs(v / prev - 1) * 100 : 0, 1)}%)</span>` : `<span class="trend flat">${L("ตั้งต้น", "baseline")}</span>`}
      <div class="rbar"><i style="height:${(v / mx) * 100}%;background:${color}"></i></div><div class="rl">${lbl}</div></div>`;
    const vis = `<section class="panel"><header>${chipIco("layers", "info")}<h2>${L("วงเงินแต่ละรอบ", "Amount per round")}</h2><span class="sp"></span><span class="sub">${S.review.length} ${L("โครงการ", "projects")}</span></header>
      <div class="body rounds3">${col(L("รอบ 1 · คำขอเริ่มต้น", "Round 1 · Requested"), r0, null, "var(--ch-2)")}${col(L("รอบ 2 · กองแผนเสนอ", "Round 2 · Planning"), r1, r0, "var(--ch-3)")}${col(L("รอบ 3 · ผู้บริหารเห็นชอบ", "Round 3 · Executive"), r2, r1, "var(--ch-1)", true)}</div></section>`;
    return html.replace(/<section class="kpis"[\s\S]*?<\/section>/, vis);
  };
}
