// Fisko Budget round B1, review and consolidation screens.
// - M04 rounds: a waterfall from the amount requested to the executive decision (UX-04). The rows now come from
//   the requests (syncBudget in 41d), so the waterfall and the table always match the request form.
// - M03 overview: totals against last year's amounts for the same requests, the 20% cap (BR-11) and how much of
//   the increase is investment (Budget Bureau FY2570 manual), plus a note that totals are computed from requests.
function waterfallSvg(steps, o = {}) {
  // steps: [{ label, v, kind: "total" | "delta" }]; deltas are negative cuts
  const W = o.w || 640, H = o.h || 220, pad = 34, bw = (W - pad * 2) / steps.length * 0.56, gap = (W - pad * 2) / steps.length;
  const mx = Math.max(1, ...steps.filter(s => s.kind === "total").map(s => s.v)), y = v => H - 34 - v / mx * (H - 70);
  let run = 0, g = "";
  steps.forEach((s, i) => {
    const x = pad + i * gap + (gap - bw) / 2;
    let top, bot, fill;
    if (s.kind === "total") { run = s.v; top = y(s.v); bot = y(0); fill = i === steps.length - 1 ? "var(--ch-1)" : "var(--ch-2)"; }
    else { const from = run; run = run + s.v; top = y(Math.max(from, run)); bot = y(Math.min(from, run)); fill = s.v < 0 ? "var(--ch-4)" : "var(--ch-3)"; }
    g += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2, bot - top).toFixed(1)}" rx="3" fill="${fill}"><title>${esc(s.label)} ${fmt(s.v, 1)}</title></rect>`;
    if (i < steps.length - 1) g += `<line x1="${(x + bw).toFixed(1)}" x2="${(x + gap).toFixed(1)}" y1="${y(run).toFixed(1)}" y2="${y(run).toFixed(1)}" stroke="var(--line-2)" stroke-dasharray="3 3"/>`;
    g += `<text x="${(x + bw / 2).toFixed(1)}" y="${(top - 6).toFixed(1)}" text-anchor="middle" style="font-size:12px;font-weight:600;fill:var(--ink)">${s.kind === "delta" ? (s.v < 0 ? "−" : "+") + fmt(Math.abs(s.v), 1) : fmt(s.v, 1)}</text>`;
    g += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 14}" text-anchor="middle" style="font-size:11.5px;fill:var(--muted)">${esc(s.label)}</text>`;
  });
  return `<svg class="wfall" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}"><line x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>${g}</svg>`;
}
{
  const base = VIEWS.review;
  VIEWS.review = () => {
    let html = base();
    if (REV_TAB !== "rounds") return html;
    const s = k => S.review.reduce((a, r) => a + Number(r[k]), 0), r0 = s("r0"), r1 = s("r1"), r2 = s("r2");
    const cuts = S.review.filter(r => r.r2 < r.r0).sort((a, b) => (a.r2 - a.r0) - (b.r2 - b.r0)).slice(0, 4);
    const wf = `<section class="panel"><header>${chipIco("chart", "info")}<h2>${L("จากวงเงินที่ขอถึงที่ผู้บริหารเห็นชอบ", "From requested to the executive decision")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท · คำนวณจากคำขอที่อยู่ในการพิจารณา", "M baht · from the requests in review")} (${S.review.length})</span></header>
      <div class="body" style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:18px;align-items:start">
        ${waterfallSvg([{ label: L("ขอ", "Requested"), v: r0, kind: "total" }, { label: L("กองแผนปรับ", "Planning"), v: r1 - r0, kind: "delta" }, { label: L("ผู้บริหารปรับ", "Executive"), v: r2 - r1, kind: "delta" }, { label: L("เห็นชอบ", "Decided"), v: r2, kind: "total" }], { aria: L("กราฟน้ำตกวงเงิน", "Amount waterfall") })}
        <div style="min-width:0"><div class="sub" style="font-weight:600;margin-bottom:6px">${L("คำขอที่ถูกปรับลดมากที่สุด", "Largest cuts")}</div>
          ${cuts.length ? `<ul class="tlist">${cuts.map(r => `<li><span class="prio p-warn"></span><div style="min-width:0"><a href="#" data-link="req:${r.id}">${esc(tx(r.name))}</a><div class="sub"><span class="mono">${r.id}</span> · ${unitName(r.unit)}</div></div><span class="num">${fmt(r.r2 - r.r0, 1)}</span></li>`).join("")}</ul>` : `<span class="sub">${L("ยังไม่มีการปรับลด", "No cuts yet")}</span>`}
          <p class="sub" style="margin:10px 0 0">${L("ทุกการปรับมีเหตุผลในบันทึกการปรับวงเงินด้านล่าง", "Every change has a reason in the change log below")}</p></div></div></section>`;
    const at = html.indexOf('<div class="grid2">');
    return at >= 0 ? html.slice(0, at) + wf + html.slice(at) : html + wf;
  };
}
{
  const base = VIEWS.consolidation;
  VIEWS.consolidation = () => {
    let html = base();
    if (CONS_TAB !== "overview") return html;
    const live = S.requests.filter(r => r.status !== "rejected"), now = sumv(live.map(r => r.amount)), prev = sumv(live.map(r => r.prev || 0)), cap = (rule("BR-11") || {}).param || 20;
    const g = prev ? (now / prev - 1) * 100 : 0, inc = sumv(live.map(r => Math.max(0, r.amount - (r.prev || 0)))), incInv = sumv(live.map(r => Math.min(Math.max(0, r.amount - (r.prev || 0)), sumv(r.items.filter(i => i.type === "inv").map(itemTotal)))));
    const capV = prev * (1 + cap / 100), w = Math.min(100, now / Math.max(capV, now) * 100), mark = capV / Math.max(capV, now) * 100;
    const strip = `<section class="panel"><header>${chipIco("scale", "info")}<h2>${L("เทียบปีก่อนและเพดานร้อยละ", "Against last year and the")} ${cap}${L("", "% cap")}</h2><span class="sp"></span><span class="mono sub">BR-11</span></header>
      <div class="body" style="display:flex;flex-direction:column;gap:12px">
        <div class="row" style="gap:22px;flex-wrap:wrap"><span>${L("คำขอปี 2571", "FY2571 requests")} <b class="num">${mb(now)}</b> ${L("ลบ.", "M")}</span><span>${L("ปีก่อน (รายการเดียวกัน)", "Last year (same items)")} <b class="num">${mb(prev)}</b> ${L("ลบ.", "M")}</span>
          <span>${L("เปลี่ยน", "Change")} <b class="num" style="color:${g > cap ? "var(--bad)" : "var(--ink)"}">${g >= 0 ? "+" : ""}${fmt(g, 1)}%</b></span><span>${L("ส่วนเพิ่มที่เป็นงบลงทุน", "Increase that is investment")} <b class="num">${fmt(inc ? incInv / inc * 100 : 0, 0)}%</b></span></div>
        <div class="capbar" title="${L("เพดาน", "Cap")} ${mb(capV)}"><i style="width:${w}%"></i><b style="left:calc(${Math.min(mark, 100)}% - 2px)"></b></div>
        <span class="sub">${L("ยอดทุกตัวในหน้านี้คำนวณจากคำขอจริงใน M02 · คู่มือสำนักงบประมาณปี 2570: ภาพรวมเพิ่มไม่เกินร้อยละ 20 ของปีก่อน และส่วนที่เพิ่มให้เป็นรายจ่ายลงทุน เว้นแต่ข้อผูกพันตามกฎหมาย สัญญา หรือสิทธิ", "Every figure on this page is computed from the M02 requests · Budget Bureau FY2570 manual: total growth at most 20% over last year, and the increase should be investment unless it is a legal, contractual or entitlement obligation")}</span></div></section>`;
    const at = html.indexOf('<section class="kpis"');
    return at >= 0 ? html.slice(0, at) + strip + html.slice(at) : html + strip;
  };
}
