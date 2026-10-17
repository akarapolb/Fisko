// Fisko Budget round B2, consolidation (M03): Budget Bureau ways of reviewing requests.
// - Priority uses the five criteria from the FY2570 request manual (FR-B-15): obligation, urgent policy,
//   readiness, severity of the problem and beneficiaries. Obligation and readiness are filled from the request.
// - 3R analysis (FR-B-14): Review last year's spending, Redeploy from low-priority or slow-spending requests,
//   Replace into high-priority requests below the cut line; Planning can use the result as its round-2 proposal.
// - Zero-based view (FR-B-16): continuing requests rolled over from last year can be flagged "explain again".
// - MTEF (FR-B-17): the forward-estimates tab also shows how much of each future year is already locked.
const CRIT5 = [["k1", 25, ["ภาระผูกพัน", "Obligation"]], ["k2", 20, ["นโยบายสำคัญเร่งด่วน", "Urgent policy"]], ["k3", 20, ["ความพร้อม", "Readiness"]], ["k4", 20, ["ความรุนแรงของปัญหา", "Severity"]], ["k5", 15, ["จำนวนผู้ได้ประโยชน์", "Beneficiaries"]]];
function autoScore(r, old) {
  const o = old || [3, 3, 3, 3], ob = isPersonnel(r) || r.multi ? 5 : r.prev > 0 ? 4 : 2, rd = typeof readiness === "function" && readiness(r) ? Math.round(readiness(r)) : o[2];
  return [ob, o[0] || 3, rd || 3, o[1] || 3, o[3] || 3];
}
function ensureScores() {
  if (!S || !S.criteria || !S.requests) return;
  const n = S.criteria.length;
  S.requests.forEach(r => { const sc = S.scores[r.id]; if (!sc || sc.length !== n) S.scores[r.id] = n === 5 ? autoScore(r, sc) : (sc || []).concat([3, 3, 3, 3, 3]).slice(0, n); });
}
scoreOf = function (r) {
  const n = S.criteria.length, sc = S.scores[r.id] || Array(n).fill(3), W = S.criteria.reduce((s, c) => s + c.w, 0) || 1;
  return S.criteria.reduce((s, c, i) => s + (sc[i] || 3) * c.w, 0) / (5 * W) * 100;
};
{
  const br = route;
  route = function () { ensureScores(); return br.apply(this, arguments); };
}

// ---------- tabs ----------
{
  const base = consTabsBar;
  consTabsBar = function () {
    const html = base(), extra = [["r3", L("วิเคราะห์ 3R", "3R analysis")], ["zbb", L("มุมมองฐานศูนย์", "Zero-based view")]];
    return html.replace(/<\/div>\s*$/, extra.map(([id, l]) => `<button class="tab ${id === CONS_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === CONS_TAB}" data-ctab="${id}">${l}</button>`).join("") + "</div>");
  };
}

// ---------- 3R ----------
function lastYearRate(unit) {
  const u = (S.dash && S.dash.units || []).find(x => x.unit === unit);
  return u && u.plan ? u.actual / u.plan : null;
}
function threeR() {
  const G = typeof bcfg === "function" ? bcfg().r3 : { lowScore: 55, lowCut: 15, slowRate: 70, slowCut: 10, zbbCut: 10, highScore: 70, replaceMax: 50 };
  const live = S.requests.filter(r => r.status !== "rejected"), ranked = live.filter(r => !isPersonnel(r)).map(r => ({ r, s: scoreOf(r) })).sort((a, b) => b.s - a.s);
  let cum = 0; ranked.forEach(x => { cum += x.r.amount / 1e6; x.in = cum <= S.cons.projCeiling + 1e-9; });
  const rows = live.map(r => {
    const s = scoreOf(r), rate = lastYearRate(r.unit), rk = ranked.find(x => x.r === r), why = [];
    let kind = "keep", d = 0;
    if (isPersonnel(r)) why.push(L("ภาระผูกพันตามสิทธิ", "Entitlement obligation"));
    else {
      if (s < G.lowScore) { kind = "redeploy"; d = -Math.round(r.amount * G.lowCut / 100 / 1e5) * 1e5; why.push(`${L("คะแนนต่ำ", "Low score")} ${fmt(s, 0)}`); }
      else if (rate != null && rate < G.slowRate / 100 && r.prev > 0) { kind = "redeploy"; d = -Math.round(r.amount * G.slowCut / 100 / 1e5) * 1e5; why.push(`${L("ปีก่อนเบิกจ่าย", "Last year spent")} ${fmt(rate * 100, 0)}% ${L("ของแผน", "of plan")}`); }
      if (r.zbb) { kind = "redeploy"; d = Math.min(d, -Math.round(r.amount * G.zbbCut / 100 / 1e5) * 1e5); why.push(L("ยกยอดจากปีก่อน รอคำอธิบายใหม่", "Rolled over, awaiting a new explanation")); }
      if (kind === "keep" && rk && !rk.in && s >= G.highScore) { kind = "replace"; why.push(L("คะแนนสูงแต่อยู่ใต้เส้นกรอบ", "High score but below the ceiling line")); }
    }
    return { r, s, rate, kind, d, why };
  });
  const pool = -sumv(rows.filter(x => x.kind === "redeploy").map(x => x.d)), need = rows.filter(x => x.kind === "replace");
  let left = pool; need.sort((a, b) => b.s - a.s).forEach(x => { x.d = Math.min(left, Math.round(x.r.amount * (typeof bcfg === "function" ? bcfg().r3.replaceMax : 50) / 100 / 1e5) * 1e5); left -= x.d; });
  return { rows, pool, used: pool - left };
}
CONS_PANELS.r3 = () => {
  const { rows, pool, used } = threeR(), G = bcfg().r3, slow = [...new Set(rows.filter(x => x.rate != null && x.rate < G.slowRate / 100).map(x => x.r.unit))], ed = ROLE === "plan";
  const carry = (S.carry && S.carry.prev || []).filter(c => c.status !== "closed").length;
  const K = { keep: [L("คงไว้", "Keep"), "p-mute"], redeploy: [L("ลด / ยกเลิก", "Redeploy"), "p-warn"], replace: [L("เพิ่ม", "Replace"), "p-ok"] };
  return `<section class="stats">
      ${statCard({ label: L(`Review · กองที่ปีก่อนเบิกจ่ายต่ำกว่า ${G.slowRate}% ของแผน`, `Review · units below ${G.slowRate}% of plan last year`), value: slow.length, icon: "activity", sub: slow.map(unitName).join(", ") || L("ไม่มี", "None") })}
      ${statCard({ label: L("Review · เงินกันเหลื่อมปีที่ยังเปิด", "Review · open carry-overs"), value: carry, icon: "clock", sub: L("จาก M06", "From M06") })}
      ${statCard({ label: L("Redeploy · วงเงินที่ลดได้", "Redeploy · amount freed"), value: mb(pool), unit: L("ลบ.", "M"), icon: "sliders", sub: `${rows.filter(x => x.kind === "redeploy").length} ${L("คำขอ", "requests")}` })}
      ${statCard({ label: L("Replace · นำไปใช้กับงานจำเป็น", "Replace · moved to priority work"), value: mb(used), unit: L("ลบ.", "M"), icon: "target", ring: pool ? used / pool : 0, sub: `${rows.filter(x => x.kind === "replace").length} ${L("คำขอ", "requests")}` })}</section>
    <section class="panel"><header>${chipIco("layers", "info")}<h2>${L("ข้อเสนอ 3R รายคำขอ", "3R proposal per request")}</h2><span class="sp"></span><span class="sub">${L("Review Redeploy Replace ตามคู่มือสำนักงบประมาณ ปี 2570", "Review, Redeploy, Replace per the Budget Bureau FY2570 manual")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th class="n">${L("คะแนน", "Score")}</th><th class="n">${L("ปีก่อนเบิกจ่าย", "Last year spent")}</th><th>${L("ข้อเสนอ", "Proposal")}</th><th class="n">${L("ปรับ (ลบ.)", "Change (M)")}</th><th>${L("เหตุผล", "Why")}</th></tr></thead>
        <tbody>${rows.sort((a, b) => ({ redeploy: 0, replace: 1, keep: 2 }[a.kind] - { redeploy: 0, replace: 1, keep: 2 }[b.kind]) || b.s - a.s).map(x => `<tr><td><a href="#" data-link="req:${x.r.id}">${esc(tx(x.r.name))}</a><div class="sub"><span class="mono">${x.r.id}</span> · ${unitName(x.r.unit)} · ${mb(x.r.amount)} ${L("ลบ.", "M")}</div></td>
          <td class="n">${fmt(x.s, 0)}</td><td class="n">${x.rate == null ? "–" : fmt(x.rate * 100, 0) + "%"}</td><td>${tag(K[x.kind][0], K[x.kind][1])}</td><td class="n">${x.d ? (x.d > 0 ? "+" : "−") + mb(Math.abs(x.d)) : "–"}</td><td class="sub">${x.why.join(" · ") || "–"}</td></tr>`).join("")}</tbody></table></div>
      <div class="body row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><span class="sub">${L(`เกณฑ์: คะแนนต่ำกว่า ${G.lowScore} ลด ${G.lowCut}% · ปีก่อนเบิกจ่ายต่ำกว่า ${G.slowRate}% ลด ${G.slowCut}% · ยกยอดรอคำอธิบายลด ${G.zbbCut}% · คะแนน ${G.highScore} ขึ้นไปที่อยู่ใต้เส้นกรอบได้เพิ่มไม่เกิน ${G.replaceMax}% ของวงเงินที่ขอ · ตั้งค่าได้ที่ M10`, `Rules: score below ${G.lowScore} cut ${G.lowCut}% · last year under ${G.slowRate}% of plan cut ${G.slowCut}% · rolled over awaiting an answer cut ${G.zbbCut}% · score ${G.highScore}+ below the line gets up to ${G.replaceMax}% of its request · set in M10`)}</span>
        ${ed ? `<button class="btn primary" type="button" id="r3-apply">${L("ใช้เป็นข้อเสนอรอบ 2 ของกองแผน", "Use as Planning's round-2 proposal")}</button>` : ""}</div></section>`;
};
CONS_BIND.r3 = () => {
  const b = $("#r3-apply"); if (!b) return;
  b.onclick = () => {
    const { rows } = threeR(); let n = 0;
    rows.filter(x => x.d && x.r.status === "plan").forEach(x => {
      const row = S.review.find(v => v.id === x.r.id); if (!row) return;
      const nv = Math.round((x.r.amount + x.d) / 1e5) / 10, old = row.r1; if (nv === old) return;
      row.r1 = nv; if (row.r2 === old) row.r2 = nv; n++;
      S.log.unshift({ t: nowIso(), role: "plan", text: [`รอบ 2 · ${tx(x.r.name)} ปรับจาก ${old} เป็น ${nv} ล้านบาท`, `Round 2 · ${tx(x.r.name)} changed from ${old} to ${nv} million baht`], why: [`ข้อเสนอ 3R: ${x.why.join(" · ")}`, `3R proposal: ${x.why.join(" · ")}`] });
    });
    audit(["ใช้ข้อเสนอ 3R เป็นวงเงินรอบ 2", "Used the 3R proposal for round 2"], `${n}`); commit(); route();
    toast(n ? L(`ปรับวงเงินรอบ 2 แล้ว ${n} คำขอ · ดูได้ที่ M04`, `Round 2 updated for ${n} requests · see M04`) : L("ไม่มีคำขอที่รอกองแผนพิจารณาให้ปรับ", "No requests in Planning review to change"));
  };
};

// ---------- zero-based view ----------
const rolled = r => r.prev > 0 && Math.abs(r.amount / r.prev - 1) <= (typeof bcfg === "function" ? bcfg().sig.rollBand : 5) / 100;
CONS_PANELS.zbb = () => {
  const live = S.requests.filter(r => r.status !== "rejected" && !isPersonnel(r)), news = live.filter(r => !r.prev), cont = live.filter(r => r.prev > 0), roll = cont.filter(rolled), ed = ROLE === "plan";
  return `<section class="stats">
      ${statCard({ label: L("โครงการใหม่", "New projects"), value: news.length, icon: "sparkle", sub: `${mb(sumv(news.map(r => r.amount)))} ${L("ลบ.", "M")}` })}
      ${statCard({ label: L("ต่อเนื่องจากปีก่อน", "Continuing"), value: cont.length, icon: "layers", sub: `${mb(sumv(cont.map(r => r.amount)))} ${L("ลบ.", "M")}` })}
      ${statCard({ label: L("ยกยอดใกล้เคียงปีก่อน (±5%)", "Rolled over (±5%)"), value: roll.length, icon: "clock", tone: roll.length ? "warn" : "", sub: L("ควรอธิบายเหตุผลใหม่", "Should be explained afresh") })}
      ${statCard({ label: L("ขอให้อธิบายใหม่แล้ว", "Asked to explain again"), value: live.filter(r => r.zbb).length, icon: "inbox", sub: `${live.filter(r => r.zbb && (r.zbbNote || "").trim().length >= 40).length} ${L("ตอบแล้ว", "answered")}` })}</section>
    <section class="panel"><header>${chipIco("target", "info")}<h2>${L("ทุกคำขอเริ่มจากศูนย์", "Every request starts from zero")}</h2><span class="sp"></span><span class="sub">${L("นโยบายงบประมาณฐานศูนย์ ปี 2570", "FY2570 zero-based budgeting policy")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("ลักษณะ", "Type")}</th><th class="n">${L("ปีก่อน", "Last year")}</th><th class="n">${L("ปีนี้", "This year")}</th><th class="n">${L("เปลี่ยน", "Change")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
        <tbody>${live.map(r => { const g = r.prev ? (r.amount / r.prev - 1) * 100 : null; return `<tr><td><a href="#" data-link="req:${r.id}">${esc(tx(r.name))}</a><div class="sub"><span class="mono">${r.id}</span> · ${unitName(r.unit)}</div></td>
          <td>${!r.prev ? tag(L("ใหม่", "New"), "p-info") : rolled(r) ? tag(L("ยกยอด", "Rolled over"), "p-warn") : tag(L("ต่อเนื่อง", "Continuing"), "p-mute")}</td><td class="n">${r.prev ? mb(r.prev) : "–"}</td><td class="n">${mb(r.amount)}</td><td class="n">${g == null ? "–" : (g >= 0 ? "+" : "") + fmt(g, 1) + "%"}</td>
          <td>${r.zbb ? ((r.zbbNote || "").trim().length >= 40 ? tag(L("ตอบแล้ว", "Answered"), "p-ok") : tag(L("รอคำอธิบาย", "Awaiting"), "p-warn")) : "–"}</td>
          <td>${ed && r.prev ? `<button type="button" class="btn ${r.zbb ? "ghost" : ""}" data-zbb="${r.id}">${r.zbb ? L("ยกเลิกคำขอ", "Withdraw ask") : L("ขอให้อธิบายใหม่", "Ask to explain")}</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
      ${live.some(r => r.zbb && r.zbbNote) ? `<div class="body" style="display:flex;flex-direction:column;gap:8px">${live.filter(r => r.zbb && r.zbbNote).map(r => `<div class="callout" style="margin:0"><b>${r.id} · ${esc(tx(r.name))}</b>${esc(r.zbbNote)}</div>`).join("")}</div>` : ""}</section>`;
};
CONS_BIND.zbb = () => {
  $$("[data-zbb]").forEach(b => (b.onclick = () => {
    const r = S.requests.find(x => x.id === b.dataset.zbb); r.zbb = !r.zbb;
    if (r.zbb) notify(["div", "divhead"], [`กองแผนขอให้อธิบายเหตุผลของคำขอ ${r.id} ใหม่ตามหลักงบประมาณฐานศูนย์`, `Planning asked for a fresh explanation of ${r.id} (zero-based)`], "req:" + r.id);
    audit(r.zbb ? ["ขอให้อธิบายคำขอใหม่ (ฐานศูนย์)", "Asked for a zero-based explanation"] : ["ยกเลิกคำขอให้อธิบายใหม่", "Withdrew the zero-based ask"], r.id); commit(); route();
  }));
};
// the requester answers on the request page; a warning check until the answer is long enough
{
  const bc = checks;
  checks = function (r) {
    const out = bc(r);
    if (r.zbb) out.push({ s: (r.zbbNote || "").trim().length >= 40 ? "ok" : "wa", title: L("คำอธิบายใหม่ตามงบฐานศูนย์", "Zero-based explanation"), d: (r.zbbNote || "").trim().length >= 40 ? L("ตอบแล้ว", "Answered") : L("กองแผนขอให้อธิบายใหม่ว่าทำไมยังต้องใช้วงเงินนี้", "Planning asked why this amount is still needed"), id: "ZBB", step: "main" });
    return out;
  };
  const bv = VIEWS.request, bb = BIND.request;
  VIEWS.request = () => {
    const html = bv(), r = curReq();
    if (!r.zbb || REQ_TAB !== "main") return html;
    const ed = unitRole() && r.unit === me().unit && r.status !== "approved", box = `<section class="panel" style="margin-bottom:18px"><header>${chipIco("target", "warn")}<h2>${L("กองแผนขอให้อธิบายใหม่ (งบประมาณฐานศูนย์)", "Planning asks for a fresh explanation (zero-based)")}</h2></header>
      <div class="body form-grid"><div class="f full"><label for="zbb-note">${L("ทำไมยังต้องใช้วงเงินนี้ ถ้าไม่ได้รับจะเกิดอะไร และต่างจากปีก่อนอย่างไร", "Why this amount is still needed, what happens without it, and what differs from last year")}</label>
        <textarea id="zbb-note" rows="3" ${ed ? "" : "disabled"}>${esc(r.zbbNote || "")}</textarea><span class="hint">${L("อย่างน้อย 40 ตัวอักษร", "At least 40 characters")}</span></div></div></section>`;
    const at = html.indexOf('<div class="grid-form">');
    return at >= 0 ? html.slice(0, at) + box + html.slice(at) : html;
  };
  BIND.request = () => { bb(); const z = $("#zbb-note"), r = curReq(); if (z && !z.disabled) z.oninput = () => { r.zbbNote = z.value; save(); if ($("#checks")) renderChecks(); }; z && (z.onchange = () => { audit(["ตอบคำถามงบฐานศูนย์", "Answered the zero-based question"], r.id); commit(); }); };
}

// ---------- MTEF: what is already locked ----------
{
  const base = CONS_PANELS.forward;
  CONS_PANELS.forward = () => {
    const { total, ceil } = forwardRows(), a = S.fwd || { per: 3, ope: 2, ceil: 3 };
    const per0 = sumv(S.requests.filter(r => r.status !== "rejected").flatMap(r => r.items.filter(i => i.type === "per").map(itemTotal))) / 1e6;
    const locked = FWD_Y.map((y, n) => {
      const multi = sumv(S.requests.filter(r => r.multi && r.years && r.status !== "rejected").map(r => Number(r.years[y] || 0))) / 1e6;
      return { y, multi, per: per0 * Math.pow(1 + a.per / 100, n) };
    });
    return base() + `<section class="panel"><header>${chipIco("clock", "info")}<h2>${L("ภาระที่ล็อกไว้แล้วในแต่ละปี", "Already locked in each year")}</h2><span class="sp"></span><span class="sub">${L("ผูกพันข้ามปีจาก M02 + งบบุคลากร · ล้านบาท", "Multi-year commitments from M02 + personnel · M baht")}</span></header>
      <div class="tbl-wrap"><table><thead><tr><th></th>${FWD_Y.map(y => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
        <tr><td>${L("ผูกพันข้ามปี", "Multi-year commitments")}</td>${locked.map(x => `<td class="n">${fmt(x.multi, 1)}</td>`).join("")}</tr>
        <tr><td>${L("งบบุคลากร (ตามอัตราเพิ่ม)", "Personnel (at the growth rate)")}</td>${locked.map(x => `<td class="n">${fmt(x.per, 1)}</td>`).join("")}</tr>
        <tr><td><b>${L("ล็อกแล้ว / กรอบคาดการณ์", "Locked / expected ceiling")}</b></td>${locked.map((x, n) => `<td class="n"><b>${fmt(ceil[n] ? (x.multi + x.per) / ceil[n] * 100 : 0, 0)}%</b></td>`).join("")}</tr>
        <tr><td>${L("เหลือให้โครงการใหม่", "Left for new work")}</td>${locked.map((x, n) => { const d = ceil[n] - x.multi - x.per; return `<td class="n" style="color:var(--${d < 0 ? "bad" : "ink"})">${fmt(d, 1)}</td>`; }).join("")}</tr>
      </tbody></table></div><div class="body sub">${L("ช่วยตอบว่าปีหน้ามีที่ว่างให้โครงการใหม่เท่าไร ก่อนรับข้อเสนอโครงการผูกพันเพิ่ม", "Shows how much room is left for new work before taking on more multi-year projects")}${total.length ? "" : ""}</div></section>`;
  };
}
