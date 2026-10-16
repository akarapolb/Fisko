// M09 tabs (round 5): multi-year trends, What-if simulation, AI agents and their activity log.
let INTEL_TAB = "ask";
const INTEL = {}, INTEL_BIND = {};
const WI = { cut: 15, locks: null };
const agentOn = id => { const a = (S.agents || []).find(x => x.id === id); return !a || a.on; };
function intelTabsBar() {
  const t = [["ask", L("ถาม AI", "Ask AI")], ["trends", L("แนวโน้มหลายปี", "Multi-year trends")], ["whatif", L("จำลองสถานการณ์", "What-if")], ["agents", L("AI Agents และการกำกับ", "AI agents and governance")]];
  return `<div class="tabs" role="tablist">${t.map(([id, l]) => `<button class="tab ${id === INTEL_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === INTEL_TAB}" data-itab="${id}">${l}</button>`).join("")}</div>`;
}

// ---- trends ----
function trendRows() {
  const A = S.allocs[2570], perShare = A ? A.byType.per / A.total : 0.4;
  const rows = S.trend.map(([fy, total, rate, inv]) => { const sh = { per: perShare, inv, sub: 0.02, oth: 0.01 }; sh.ope = 1 - sh.per - sh.inv - sh.sub - sh.oth; return { fy, total, rate, sh }; });
  const U = S.cons.units, tot = sumv(U.map(u => sumv(u.v)));
  const sh = {}; BUDGET_TYPES.forEach((t, i) => (sh[t.id] = sumv(U.map(u => u.v[i])) / tot));
  rows.push({ fy: 2571, total: tot, rate: null, sh, req: true });
  return rows;
}
function trendChart(rows) {
  const W = 720, H = 300, Lp = 54, R = 46, T = 16, B = 34, iw = W - Lp - R, ih = H - T - B;
  const max = Math.ceil(Math.max(...rows.map(r => r.total)) * 1.1 / 100) * 100, bw = iw / rows.length * 0.56;
  const x = i => Lp + iw / rows.length * (i + 0.5), y = v => T + ih - v / max * ih, yr = v => T + ih - (v - 80) / 20 * ih;
  let g = "";
  for (let v = 0; v <= max; v += max / 4) g += `<line x1="${Lp}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${Lp - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  [80, 90, 100].forEach(v => (g += `<text x="${W - R + 6}" y="${yr(v) + 4}">${v}%</text>`));
  rows.forEach((r, i) => {
    let base = 0;
    BUDGET_TYPES.forEach((t, k) => { const v = r.total * r.sh[t.id]; if (v > 0) { g += `<rect x="${x(i) - bw / 2}" y="${y(base + v)}" width="${bw}" height="${y(base) - y(base + v)}" class="c${k + 1}" ${r.req ? 'fill-opacity=".45"' : ""}><title>${r.fy} ${tx(t.name)} ${fmt(v)}</title></rect>`; base += v; } });
    g += `<text x="${x(i)}" y="${H - 16}" text-anchor="middle">${r.fy}</text>${r.req ? `<text x="${x(i)}" y="${H - 3}" text-anchor="middle">${L("คำขอ", "request")}</text>` : ""}<text x="${x(i)}" y="${y(r.total) - 6}" text-anchor="middle" style="font-weight:600;fill:var(--ink-2)">${fmt(r.total)}</text>`;
  });
  const pts = rows.map((r, i) => (r.rate == null ? null : [x(i), yr(r.rate)])).filter(Boolean);
  g += `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("")}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>` + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L("งบประมาณรายปีตามงบรายจ่ายและอัตราเบิกจ่าย", "Budget by year and type, with disbursement rate")}">${g}</svg>`;
}
INTEL.trends = () => {
  const rows = trendRows(), first = rows[0], last = rows[rows.length - 2], yrs = last.fy - first.fy;
  const cagr = (Math.pow(last.total / first.total, 1 / yrs) - 1) * 100, rates = rows.filter(r => r.rate != null);
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("เติบโตเฉลี่ยต่อปี", "Average yearly growth")} ${first.fy}–${last.fy}</span><span class="v">${fmt(cagr, 1)}%</span></div>
    <div class="kpi"><span class="l">${L("สัดส่วนงบลงทุน", "Investment share")} ${last.fy}</span><span class="v">${fmt(last.sh.inv * 100, 1)}%</span><span class="d sub">${L("จาก", "from")} ${fmt(first.sh.inv * 100, 1)}% ${L("ในปี", "in")} ${first.fy}</span></div>
    <div class="kpi"><span class="l">${L("อัตราเบิกจ่ายทั้งปีเฉลี่ย", "Average full-year disbursement")}</span><span class="v">${fmt(sumv(rates.map(r => r.rate)) / rates.length, 1)}%</span></div>
    <div class="kpi hl"><span class="l">${L("คำขอปี 2571 เทียบปี 2570", "FY2571 request vs FY2570")}</span><span class="v">${fmt((rows[rows.length - 1].total / last.total - 1) * 100, 1)}%</span></div>
  </section>
  <section class="panel chart"><header><h2>${L("งบประมาณรายปีแยกตามงบรายจ่าย", "Budget by year and budget type")}</h2><span class="sp"></span>
    <div class="legend">${BUDGET_TYPES.map((t, i) => `<span><span class="sw c${i + 1}"></span>${tx(t.name)}</span>`).join("")}<span><i style="background:var(--accent)"></i>${L("อัตราเบิกจ่ายทั้งปี (แกนขวา)", "Full-year disbursement (right axis)")}</span></div></header>
    <div class="body">${trendChart(rows)}<div class="sub">${L("ล้านบาท · ปี 2566–2569 ข้อมูลตัวอย่าง · ปี 2570 ตามพระราชบัญญัติ (M06) · ปี 2571 ตามคำขอ (M03)", "Million baht · 2566–2569 sample data · 2570 appropriation (M06) · 2571 requests (M03)")}</div></div></section>
  <section class="panel"><div class="tbl-wrap"><table><thead><tr><th>${L("ปีงบประมาณ", "Fiscal year")}</th><th class="n">${L("วงเงิน (ลบ.)", "Budget (M)")}</th><th class="n">${L("เปลี่ยนแปลง", "Change")}</th><th class="n">${L("งบลงทุน", "Investment")}</th><th class="n">${L("เบิกจ่ายทั้งปี", "Full-year disbursement")}</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr><td>${r.fy}${r.req ? ` <span class="sub">(${L("คำขอ", "request")})</span>` : ""}</td><td class="n">${fmt(r.total, 1)}</td><td class="n">${i ? `${r.total >= rows[i - 1].total ? "+" : ""}${fmt((r.total / rows[i - 1].total - 1) * 100, 1)}%` : "—"}</td><td class="n">${fmt(r.sh.inv * 100, 1)}%</td><td class="n">${r.rate == null ? "—" : fmt(r.rate, 1) + "%"}</td></tr>`).join("")}</tbody></table></div></section>`;
};

// ---- what-if ----
function simulate() {
  const rs = S.requests.filter(r => r.status !== "rejected");
  if (!WI.locks) WI.locks = new Set(rs.filter(r => isPersonnel(r) || r.id === S.story).map(r => r.id));
  const total = sumv(rs.map(r => r.amount)), target = total * (1 - WI.cut / 100);
  const locked = rs.filter(r => WI.locks.has(r.id) || isPersonnel(r)), flex = rs.filter(r => !locked.includes(r));
  let need = total - target; const out = {};
  rs.forEach(r => (out[r.id] = r.amount));
  for (let pass = 0; pass < 4 && need > 1; pass++) {
    const open = flex.filter(r => out[r.id] > r.amount * 0.2 + 1);
    const W = sumv(open.map(r => (110 - scoreOf(r)) * out[r.id])); if (!W) break;
    let cutDone = 0;
    open.forEach(r => { const want = need * (110 - scoreOf(r)) * out[r.id] / W, can = out[r.id] - r.amount * 0.2, c = Math.min(want, can); out[r.id] -= c; cutDone += c; });
    need -= cutDone;
  }
  return { rs, total, target, out, short: Math.max(0, need), locked };
}
INTEL.whatif = () => {
  const sim = simulate(), after = sumv(Object.values(sim.out)), can = ROLE === "plan" || ROLE === "exec";
  const rows = sim.rs.slice().sort((a, b) => (sim.out[b.id] - b.amount) - (sim.out[a.id] - a.amount));
  return `
  <section class="panel"><header><h2>${L("จำลองการปรับลดวงเงิน", "Simulate a budget cut")}</h2><span class="sp"></span>${tag(L("AI Budget Optimization Agent · เสนอเท่านั้น", "AI Budget Optimization Agent · suggestion only"), "p-info")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:14px">
      <label class="field-inline" for="wi-cut" style="font-size:15px;color:var(--ink)">${L("ลดวงเงินรวม", "Cut the total by")} <input type="range" id="wi-cut" min="0" max="30" step="1" value="${WI.cut}" style="width:min(320px,60vw)"> <b class="num" id="wi-cut-v">${WI.cut}%</b></label>
      <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div class="kpi"><span class="l">${L("คำขอรวม", "Requested")}</span><span class="v">${mb(sim.total)}<small>${L("ลบ.", "M")}</small></span></div>
        <div class="kpi"><span class="l">${L("เป้าหมายหลังลด", "Target after the cut")}</span><span class="v">${mb(sim.target)}<small>${L("ลบ.", "M")}</small></span></div>
        <div class="kpi"><span class="l">${L("ล็อกไว้ไม่ลด", "Locked")}</span><span class="v">${mb(sumv(sim.locked.map(r => r.amount)))}<small>${L("ลบ.", "M")}</small></span><span class="d sub">${sim.locked.length} ${L("รายการ", "requests")}</span></div>
        <div class="kpi ${sim.short > 1 ? "" : "hl"}"><span class="l">${sim.short > 1 ? L("ลดไม่ถึงเป้า", "Short of the target") : L("ผลการจำลอง", "Result")}</span><span class="v" style="${sim.short > 1 ? "color:var(--bad)" : ""}">${sim.short > 1 ? mb(sim.short) : mb(after)}<small>${L("ลบ.", "M")}</small></span>${sim.short > 1 ? `<span class="d sub">${L("ปลดล็อกบางรายการ หรือลดสัดส่วนการตัด", "Unlock some requests or cut less")}</span>` : ""}</div>
      </div>
      <span class="sub">${L("ตัดตามลำดับความสำคัญจาก M03: คะแนนต่ำถูกตัดมากกว่า แต่ละรายการตัดได้ไม่เกิน 80% · งบบุคลากรล็อกเสมอ", "Cuts follow the M03 priority scores: lower scores lose more, no request loses more than 80% · personnel is always locked")}</span></div>
    <div class="tbl-wrap"><table><thead><tr><th class="c">${L("ล็อก", "Lock")}</th><th>${L("คำขอ", "Request")}</th><th class="n">${L("คะแนน", "Score")}</th><th class="n">${L("ก่อน (ลบ.)", "Before (M)")}</th><th class="n">${L("หลัง (ลบ.)", "After (M)")}</th><th class="n">${L("เปลี่ยน", "Change")}</th><th style="width:22%"></th></tr></thead>
      <tbody>${rows.map(r => { const per = isPersonnel(r), lk = per || WI.locks.has(r.id), d = sim.out[r.id] - r.amount;
        return `<tr><td class="c"><input type="checkbox" data-lock="${r.id}" ${lk ? "checked" : ""} ${per ? "disabled" : ""} aria-label="${L("ล็อก", "Lock")} ${r.id}"></td><td>${esc(tx(r.name))}${r.id === S.story ? " ★" : ""}<div class="sub">${unitName(r.unit)}</div></td>
          <td class="n">${per ? "—" : fmt(scoreOf(r), 0)}</td><td class="n">${mb(r.amount)}</td><td class="n"><b>${mb(sim.out[r.id])}</b></td><td class="n" style="color:var(--${d < -1 ? "bad" : "ink-2"})">${d < -1 ? fmt(d / r.amount * 100, 0) + "%" : "—"}</td>
          <td><div class="bar"><i style="width:${sim.out[r.id] / r.amount * 100}%"></i></div></td></tr>`; }).join("")}</tbody></table></div>
    ${can ? `<div class="body row"><button class="btn primary" type="button" id="wi-send">${L("ส่งเป็นข้อเสนอให้กองแผนงาน", "Send as a proposal to Planning")}</button><span class="sub">${L("ไม่ปรับวงเงินจริง การปรับต้องผ่านการกลั่นกรอง (M04)", "Amounts don't change. Real changes go through review (M04).")}</span></div>` : ""}</section>`;
};
INTEL_BIND.whatif = () => {
  const r = $("#wi-cut");
  r.oninput = () => { $("#wi-cut-v").textContent = r.value + "%"; };
  r.onchange = () => { WI.cut = Number(r.value); route(); };
  $$("[data-lock]").forEach(c => (c.onchange = () => { c.checked ? WI.locks.add(c.dataset.lock) : WI.locks.delete(c.dataset.lock); route(); }));
  const s = $("#wi-send");
  if (s) s.onclick = () => {
    if (!agentOn("AG-04")) { toast(L("Budget Optimization Agent ถูกปิดใช้งานอยู่", "The Budget Optimization Agent is switched off")); return; }
    S.aiLog.unshift({ t: nowIso(), agent: "AG-04", user: me().id, action: [`เสนอทางเลือกลดวงเงิน ${WI.cut}%`, `Proposed a ${WI.cut}% cut option`], target: "M09", sources: 2, ok: true });
    audit(["ส่งข้อเสนอจากการจำลองสถานการณ์", "Sent a what-if proposal"], `${WI.cut}%`);
    notify(["plan"], [`ข้อเสนอจำลองการลดวงเงิน ${WI.cut}% จากผู้ช่วย AI`, `AI what-if proposal: ${WI.cut}% cut`], "assistant");
    commit(); toast(L("ส่งข้อเสนอแล้ว · กองแผนงานได้รับแจ้งเตือน", "Proposal sent · Planning notified"));
  };
};

// ---- agents and governance ----
INTEL.agents = () => {
  const log = S.aiLog, can = ROLE === "exec", runs = sumv(S.agents.map(a => a.uses)) + log.length;
  const last = id => { const e = log.find(x => x.agent === id); return e ? fdate(e.t, true) : "—"; };
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("การใช้งาน AI เดือนนี้", "AI uses this month")}</span><span class="v">${fmt(runs)}</span></div>
    <div class="kpi"><span class="l">${L("คำตอบที่มีแหล่งอ้างอิง", "Answers with sources")}</span><span class="v">${fmt(log.filter(x => x.ok).length ? log.filter(x => x.ok && x.sources > 0).length / log.filter(x => x.ok).length * 100 : 100, 0)}%</span></div>
    <div class="kpi"><span class="l">${L("ปฏิเสธเพราะเกินสิทธิ์ข้อมูล", "Declined beyond permissions")}</span><span class="v">${log.filter(x => !x.ok).length}</span></div>
    <div class="kpi"><span class="l">${L("เวลาตอบเฉลี่ย", "Average response time")}</span><span class="v">4.2<small>${L("วินาที", "s")}</small></span><span class="d sub">${L("ตัวอย่าง", "sample")}</span></div>
  </section>
  <section class="panel"><header><h2>${L("AI Agents", "AI agents")}</h2><span class="sp"></span><span class="sub">${can ? L("ผู้บริหารเปิด/ปิด Agent ได้ในต้นแบบนี้", "Executives can switch agents on or off in this prototype") : L("สลับเป็นบทบาทผู้บริหารเพื่อเปิด/ปิด Agent", "Switch to the Executive role to turn agents on or off")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th class="c">${L("ใช้งาน", "On")}</th><th>Agent</th><th>${L("หน้าที่", "Role")}</th><th class="n">${L("ใช้งานเดือนนี้", "Uses this month")}</th><th>${L("ล่าสุด", "Last run")}</th></tr></thead>
      <tbody>${S.agents.map((a, i) => `<tr><td class="c">${sw("ag-" + i, a.on, !can)}</td><td><span class="mono sub">${a.id}</span> ${tx(a.name)}</td><td class="sub">${tx(a.what)}</td><td class="n">${fmt(a.uses + log.filter(x => x.agent === a.id).length)}</td><td class="sub">${last(a.id)}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("บันทึกการทำงานของ AI", "AI activity log")}</h2><span class="sp"></span><span class="sub">${L("บันทึกทุกคำขอและคำตอบ เพื่อการตรวจสอบ", "Every request and answer is logged for audit")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "Time")}</th><th>Agent</th><th>${L("ผู้ใช้", "User")}</th><th>${L("การทำงาน", "Action")}</th><th>${L("รายการ", "Target")}</th><th class="n">${L("แหล่งอ้างอิง", "Sources")}</th><th>${L("ผล", "Outcome")}</th></tr></thead>
      <tbody>${log.slice(0, 40).map(x => `<tr><td class="sub" style="white-space:nowrap">${fdate(x.t, true)}</td><td class="mono">${x.agent}</td><td>${x.user === "system" ? `<span class="sub">${L("อัตโนมัติ", "Automatic")}</span>` : esc(userName(x.user))}</td><td>${tx(x.action)}</td><td class="sub">${esc(x.target)}</td><td class="n">${x.sources}</td><td>${x.ok ? tag(L("ตอบแล้ว", "Answered"), "p-ok") : tag(L("ปฏิเสธ", "Declined"), "p-warn")}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("หลักการกำกับ AI", "AI governance rules")}</h2></header><div class="body chips">
    ${[["เข้าถึงข้อมูลตามสิทธิ์ผู้ใช้", "Data access follows user permissions"], ["มนุษย์ตัดสินใจทุกครั้ง", "A person decides every time"], ["ไม่อนุมัติหรือปรับวงเงินอัตโนมัติ", "No automatic approvals or amount changes"], ["แสดงสมมติฐานและแหล่งอ้างอิง", "Assumptions and sources shown"], ["ปกปิดข้อมูลส่วนบุคคล", "Personal data masked"], ["บันทึกคำถามและคำตอบ", "Questions and answers logged"]].map(c => `<span class="chip">${tx(c)}</span>`).join("")}</div></section>`;
};
INTEL_BIND.agents = () => {
  S.agents.forEach((a, i) => { const el = $("#ag-" + i); if (el && !el.disabled) el.onchange = () => {
    a.on = el.checked; audit([a.on ? "เปิดใช้งาน AI Agent" : "ปิดใช้งาน AI Agent", a.on ? "Turned an AI agent on" : "Turned an AI agent off"], `${a.id} ${tx(a.name)}`); commit(); route();
    toast(a.on ? L(`เปิด ${a.id} แล้ว`, `${a.id} is on`) : L(`ปิด ${a.id} แล้ว · ฟังก์ชันที่ใช้ Agent นี้จะไม่ทำงาน`, `${a.id} is off · features using it are disabled`));
  }; });
};
