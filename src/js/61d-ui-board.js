// Design system v2 (round 24): the procurement case list becomes a pipeline board with a funnel strip,
// with the previous table one click away; contracts get a phase track. Works on the same data and binders.
let CASE_VIEW = "board";
const BOARD_COLS = [
  ["prep", ["เตรียมการ", "Preparing"], "var(--info)", n => n >= 1 && n <= 4],
  ["src", ["ดำเนินการใน e-GP", "Sourcing in e-GP"], "var(--amber)", n => n >= 5 && n <= 7],
  ["con", ["สัญญาและส่งมอบ", "Contract and delivery"], "var(--accent)", n => n >= 8 && n <= 11],
  ["end", ["ปิดและยกเลิก", "Closed or cancelled"], "var(--faint)", n => n === 12 || n === 0],
];
const WHO_ICON = { proc: "user", head: "shield", exec: "checksq", req: "inbox", wait: "clock", con: "pen", none: "dot" };
function caseCard(c) {
  const n = caseState(c), p = famPlan(c.plan), rq = caseReq(c), nx = caseNext(c), people = [rq ? rq.by : null, c.methodApproval ? c.methodApproval.by : null, (caseCon(c) || {}).by].filter(Boolean);
  return `<div class="card" data-copen="${c.id}" role="button" tabindex="0" aria-label="${c.id} ${esc(caseName(c))}">
    <div class="cm"><span class="mono">${c.id}</span>${c.method ? `<span class="pill p-mute">${tx(PMETHOD[c.method])}</span>` : `<span class="pill p-mute">${tx(KINDS[c.kind])}</span>`}</div>
    <div class="ct">${esc(caseName(c))}</div>
    <div class="cm"><span class="amt">${mb(rq ? rq.amount : p.est)} <span class="sub">${L("ลบ.", "M")}</span></span><span>${n === 0 ? L("ยกเลิก", "Cancelled") : `${L("ขั้น", "Step")} ${n}/12`}</span></div>
    <div class="segbar">${Array.from({ length: 12 }, (_, i) => `<i class="${n === 0 ? "" : i + 1 < n ? "ok" : i + 1 === n ? "now" : ""}"></i>`).join("")}</div>
    ${n !== 0 && n < 12 ? `<div class="next">${svgI(WHO_ICON[nx.who] || "arrow")}<span>${esc(nx.raw ? nx.th : L(nx.th, nx.en))}</span></div>` : ""}
    <div class="cm"><span class="sub">${esc(lineLabel(famLine(c.line))).split(" · ")[0]}</span>${people.length ? avs(people) : ""}</div></div>`;
}
{
  const tableList = caseList;
  caseList = () => {
    const all = S.cases, byStep = Array.from({ length: 12 }, (_, i) => all.filter(c => caseState(c) === i + 1).length), mx = Math.max(1, ...byStep);
    const value = sumv(all.filter(c => !c.cancelled).map(c => (caseReq(c) ? caseReq(c).amount : famPlan(c.plan).est))), waiting = all.filter(c => !c.cancelled && ["proc", "head", "exec"].includes(caseNext(c).who) && caseState(c) < 9).length;
    const toggle = `<div class="viewtoggle" role="group" aria-label="${L("มุมมอง", "View")}"><button type="button" data-cview="board" class="${CASE_VIEW === "board" ? "on" : ""}">${svgI("kanban")}${L("บอร์ด", "Board")}</button><button type="button" data-cview="table" class="${CASE_VIEW === "table" ? "on" : ""}">${svgI("list")}${L("ตาราง", "Table")}</button></div>`;
    const top = `<section class="stats">
      ${statCard({ label: L("แฟ้มทั้งหมด", "All cases"), value: all.length, icon: "folder", tone: "info", sub: `${all.filter(c => c.cancelled).length} ${L("ยกเลิก", "cancelled")}` })}
      ${statCard({ label: L("มูลค่าในแฟ้มที่เปิดอยู่", "Value in open cases"), value: mb(value), unit: L("ลบ.", "M"), icon: "coins", tone: "ok", sub: "" })}
      ${statCard({ label: L("รอการดำเนินการจากคน", "Waiting for a person"), value: waiting, icon: "clock", tone: waiting ? "warn" : "", sub: L("เจ้าหน้าที่ หัวหน้า หรือผู้บริหาร", "officer, head or executive") })}
      ${statCard({ label: L("ลงนามสัญญาแล้ว", "Contracts signed"), value: all.filter(c => caseState(c) >= 9).length, ring: all.length ? all.filter(c => caseState(c) >= 9).length / all.length : 0, sub: "" })}</section>
      <section class="panel"><header>${chipIco("chart", "info")}<h2>${L("กรวยของแฟ้มตามขั้นตอน", "Cases by step")}</h2><span class="sp"></span>${toggle}</header>
        <div class="body"><div class="funnel">${byStep.map((k, i) => `<div class="${k ? "" : "zero"}" style="height:${k ? 12 + (k / mx) * 52 : 4}px" title="${i + 1}. ${tx([CASE_STATES[i + 1].th, CASE_STATES[i + 1].en])}: ${k}"></div>`).join("")}</div>
          <div class="funnel-l">${byStep.map((k, i) => `<span title="${tx([CASE_STATES[i + 1].th, CASE_STATES[i + 1].en])}">${i + 1}${k ? ` · <b style="color:var(--ink)">${k}</b>` : ""}</span>`).join("")}</div></div></section>`;
    if (CASE_VIEW === "table") return top + tableList().replace(/<section class="kpis"[\s\S]*?<\/section>/, "");
    return `${top}<div class="board">${BOARD_COLS.map(([k, nm, color, f]) => { const cs = all.filter(c => f(caseState(c)));
      return `<div class="col" style="--c:${color}"><div class="col-h">${tx(nm)}<span class="n">${cs.length}</span></div>${cs.map(caseCard).join("") || `<div class="empty">${L("ไม่มีแฟ้ม", "No cases")}</div>`}</div>`; }).join("")}</div>`;
  };
}
{
  const base = BIND.procurement;
  BIND.procurement = () => {
    base();
    if (PROC_TAB !== "cases" || CASE_OPEN) return;
    $$("[data-cview]").forEach(b => (b.onclick = () => { CASE_VIEW = b.dataset.cview; route(); }));
    $$(".card[data-copen]").forEach(el => (el.onkeydown = e => { if (e.key === "Enter") el.click(); }));
  };
}

// ---------- contracts: a phase track under the header ----------
function phaseTrack(c) {
  return `<div class="ptrack">${c.phases.map(ph => { const paid = phPaid(c, ph), acc = phaseAccepted(ph), late = !acc && !ph.cancelled && phDue(ph) < TODAY;
    const st = ph.cancelled ? ["var(--faint)", 100, L("ยกเลิก", "cancelled")] : paid ? ["var(--accent)", 100, L("จ่ายแล้ว", "paid")] : acc ? ["var(--accent-2)", 75, L("ตรวจรับแล้ว", "accepted")] : ph.delivered ? ["var(--info)", 50, L("ส่งมอบแล้ว", "delivered")] : late ? ["var(--bad)", 25, L("เลยกำหนด", "overdue")] : ["var(--line-2)", 10, fdate(phDue(ph))];
    return `<div class="ph" title="${tx(ph.name)} · ${st[2]}"><div class="bar2"><i style="width:${st[1]}%;background:${st[0]}"></i></div><span>${tx(ph.name)} · ${st[2]} · ${mb(ph.amount)}</span></div>`; }).join("")}</div>`;
}
