// M08 Budget Performance (round 5): mid-year evaluation for the year in the M07 snapshot.
// KPI results, the input-to-impact chain per project, a scorecard and the evaluation report.
let PERF_TAB = "kpis", CHAIN_P = null;
const PERF_TABS = [
  { id: "kpis", label: ["ผลตัวชี้วัด", "KPI results"] },
  { id: "chain", label: ["ห่วงโซ่ผลลัพธ์", "Results chain"] },
  { id: "scorecard", label: ["Scorecard", "Scorecard"] },
  { id: "report", label: ["รายงานประเมินผล", "Evaluation report"] },
];
const achv = (r, t) => (r == null || !t ? null : r / t * 100);
const achTag = v => v == null ? tag(L("ยังไม่รายงาน", "Not reported"), "p-mute") : v >= 100 ? tag(`${fmt(v, 0)}% · ${L("บรรลุ", "Met")}`, "p-ok") : v >= 80 ? tag(`${fmt(v, 0)}% · ${L("ใกล้เป้า", "Close")}`, "p-warn") : tag(`${fmt(v, 0)}% · ${L("ต่ำกว่าเป้า", "Below")}`, "p-bad");
const canEnterKpi = k => ROLE === "plan" || (ROLE === "div" && k.owner === me().unit);
const projOut = p => S.perf.outputs[p.id];
function projScore(p) {
  const o = projOut(p), spend = pct(p.actual, p.plan), out = o ? achv(o.result, o.target) : null;
  const k = o && o.kpi ? S.perf.kpis[o.kpi] : null, oc = k ? achv(k.result, k.target) : null;
  const score = 0.4 * Math.min(100, spend) + 0.6 * Math.min(100, out == null ? 0 : out);
  return { spend, out, oc, score, grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D" };
}
const GRADE = { A: "p-ok", B: "p-info", C: "p-warn", D: "p-bad" };
const fmtv = v => fmt(v, v % 1 ? 1 : 0);

const PERF = {};
PERF.kpis = () => {
  const ks = allKpis(), rows = ks.map(x => ({ ...x, p: S.perf.kpis[x.k.id] })), rep = rows.filter(r => r.p && r.p.result != null);
  const met = rep.filter(r => achv(r.p.result, r.p.target) >= 100).length, avg = rep.length ? rep.reduce((s, r) => s + Math.min(150, achv(r.p.result, r.p.target)), 0) / rep.length : 0;
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi hl"><span class="l">${L("ตัวชี้วัดที่บรรลุเป้า", "KPIs met")}</span><span class="v">${met} / ${rows.length}</span></div>
    <div class="kpi"><span class="l">${L("ผลสำเร็จเฉลี่ย", "Average achievement")}</span><span class="v">${fmt(avg, 0)}%</span></div>
    <div class="kpi"><span class="l">${L("ยังไม่รายงานผล", "Not reported")}</span><span class="v" style="color:var(--${rows.length - rep.length ? "warn" : "accent"})">${rows.length - rep.length}</span></div>
    <div class="kpi"><span class="l">${L("อัตราเบิกจ่ายช่วงเดียวกัน", "Disbursement, same period")}</span><span class="v">${fmt(dashTotals().rate, 1)}%</span></div>
  </section>
  <section class="panel"><header><h2>${L("ผลตัวชี้วัดกลางปี", "Mid-year KPI results")}</h2><span class="sp"></span><span class="sub">${L("เจ้าของตัวชี้วัดและกองแผนงานบันทึกผลได้", "KPI owners and Planning can enter results")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ตัวชี้วัด", "KPI")}</th><th>${L("เจ้าของ", "Owner")}</th><th class="n">${L("เป้ากลางปี", "Mid-year target")}</th><th class="n" style="width:150px">${L("ผล", "Result")}</th><th>${L("ผลสำเร็จ", "Achievement")}</th></tr></thead>
      <tbody>${rows.map(({ k, st, p }) => `<tr><td><span class="mono sub">${st.id}·${k.id}</span> ${esc(tx(k.name))}</td><td class="sub">${unitName(k.owner)}</td>
        <td class="n">${p ? fmtv(p.target) : "—"} <span class="sub">${tx(k.unit)}</span></td>
        <td class="n">${p ? (canEnterKpi(k) ? `<input type="number" step="any" min="0" data-kr="${k.id}" value="${p.result == null ? "" : p.result}" placeholder="${L("กรอกผล", "Enter")}" aria-label="${L("ผล", "Result")} ${esc(tx(k.name))}">` : p.result == null ? "—" : fmtv(p.result)) : `<span class="sub">${L("ตัวชี้วัดใหม่ปี 2571", "New for 2571")}</span>`}</td>
        <td>${p ? achTag(achv(p.result, p.target)) : ""}</td></tr>`).join("")}</tbody></table></div></section>`;
};

PERF.chain = () => {
  const ps = S.dash.projects.filter(p => projOut(p));
  const storyUnit = (S.requests.find(r => r.id === S.story) || {}).unit;
  if (!ps.find(p => p.id === CHAIN_P)) CHAIN_P = (ps.find(p => p.unit === storyUnit) || ps.find(p => p.unit === me().unit) || ps[0]).id;
  const p = ps.find(x => x.id === CHAIN_P), o = projOut(p), sc = projScore(p), pr = S.progress[p.id];
  const kx = o.kpi ? allKpis().find(x => x.k.id === o.kpi) : null, kp = o.kpi ? S.perf.kpis[o.kpi] : null, ed = ROLE === "plan" || (ROLE === "div" && p.unit === me().unit);
  const card = (cls, h, b, s) => `<div class="chain-card ${cls}"><span class="chain-h">${h}</span><b>${b}</b><span class="sub">${s}</span></div>`;
  return `
  <section class="panel"><header><h2>${L("ห่วงโซ่ผลลัพธ์", "Results chain")}</h2><span class="sp"></span>
    <label class="field-inline" for="ch-p">${L("โครงการ", "Project")} <select id="ch-p">${ps.map(x => `<option value="${x.id}" ${x.id === CHAIN_P ? "selected" : ""}>${esc(unitName(x.unit))} · ${esc(tx(x.name))}</option>`).join("")}</select></label></header>
    <div class="body"><div class="chain">
      ${card("", L("ปัจจัยนำเข้า", "Input"), `${fmt(p.actual, 1)} / ${fmt(p.alloc, 1)} ${L("ลบ.", "M")}`, `${L("เบิกจ่าย", "Spent")} ${fmt(pct(p.actual, p.alloc), 0)}% · ${L("ตามแผน", "of plan")} ${fmt(sc.spend, 0)}%`)}
      <span class="chain-ar" aria-hidden="true">→</span>
      ${card("", L("กิจกรรม", "Activities"), esc(tx(p.name)), pr ? `${tx(PSTAT[pr.status][0])} · ${L("ความก้าวหน้า", "progress")} ${pr.pct}%` : L("ยังไม่มีรายงานความก้าวหน้า", "No progress report yet"))}
      <span class="chain-ar" aria-hidden="true">→</span>
      ${card(sc.out != null && sc.out < 80 ? "warn" : "", L("ผลผลิต", "Output"), esc(tx(o.name)), `${fmtv(o.result)} / ${fmtv(o.target)} ${esc(tx(o.unit))} · ${sc.out == null ? "—" : fmt(sc.out, 0) + "%"}`)}
      <span class="chain-ar" aria-hidden="true">→</span>
      ${card(kp && achv(kp.result, kp.target) != null && achv(kp.result, kp.target) < 80 ? "warn" : "ok", L("ผลลัพธ์", "Outcome"), kx ? `${kx.k.id} ${esc(tx(kx.k.name))}` : L("ไม่ผูกตัวชี้วัด", "No KPI linked"), kp ? `${kp.result == null ? "—" : fmtv(kp.result)} / ${fmtv(kp.target)} ${tx(kx.k.unit)}` : L("งานประจำ", "Routine work"))}
      <span class="chain-ar" aria-hidden="true">→</span>
      ${card("impact", L("ผลกระทบ", "Impact"), kx ? esc(tx(kx.g.name)) : "—", kx ? `${kx.st.id} · ${esc(tx(kx.st.name))}` : "")}
    </div></div>
    ${ed ? `<div class="body inline-form" style="border-top:1px solid var(--line)"><div class="f" style="flex:0 1 200px"><label for="out-r">${L("บันทึกผลผลิตล่าสุด", "Update output result")} (${esc(tx(o.unit))})</label><input type="number" step="any" min="0" id="out-r" value="${o.result}"></div>
      <button class="btn primary" type="button" id="out-save">${L("บันทึก", "Save")}</button></div>` : ""}</section>`;
};

function scatter(rows) {
  const W = 560, H = 340, P = 44, iw = W - P - 16, ih = H - 24 - P, max = 140;
  const x = v => P + Math.min(max, v) / max * iw, y = v => 16 + ih - Math.min(max, v) / max * ih;
  let g = `<rect x="${x(100)}" y="${y(max)}" width="${x(max) - x(100)}" height="${y(100) - y(max)}" fill="var(--accent-soft)" opacity=".6"/>`;
  [0, 50, 100].forEach(v => { g += `<line x1="${x(v)}" x2="${x(v)}" y1="${y(0)}" y2="${y(max)}" stroke="var(--line)" ${v === 100 ? 'stroke-dasharray="4 4"' : ""}/><text x="${x(v)}" y="${H - 22}" text-anchor="middle">${v}%</text>`;
    g += `<line x1="${x(0)}" x2="${x(max)}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${v === 100 ? 'stroke-dasharray="4 4"' : ""}/><text x="${P - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`; });
  g += `<text x="${P + iw / 2}" y="${H - 4}" text-anchor="middle" style="font-weight:600">${L("ผลเบิกจ่ายเทียบแผน", "Disbursed vs plan")}</text>`;
  g += `<text x="12" y="${16 + ih / 2}" text-anchor="middle" transform="rotate(-90 12 ${16 + ih / 2})" style="font-weight:600">${L("ผลผลิตเทียบเป้า", "Output vs target")}</text>`;
  const col = { A: "var(--accent)", B: "var(--info)", C: "var(--warn)", D: "var(--bad)" };
  rows.forEach(r => { g += `<circle cx="${x(r.s.spend)}" cy="${y(r.s.out || 0)}" r="7" fill="${col[r.s.grade]}" stroke="var(--surface)" stroke-width="2"><title>${esc(tx(r.p.name))} · ${r.s.grade}</title></circle>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L("เทียบผลเบิกจ่ายกับผลผลิตรายโครงการ", "Disbursement versus output by project")}">${g}</svg>`;
}
PERF.scorecard = () => {
  const rows = S.dash.projects.filter(p => projOut(p)).map(p => ({ p, o: projOut(p), s: projScore(p) })).sort((a, b) => b.s.score - a.s.score);
  const n = g => rows.filter(r => r.s.grade === g).length;
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">${["A", "B", "C", "D"].map(g => `<div class="kpi"><span class="l">${L("ระดับ", "Grade")} ${g}</span><span class="v">${n(g)}</span><span class="d sub">${g === "A" ? L("ดีมาก", "Excellent") : g === "B" ? L("ดี", "Good") : g === "C" ? L("ต้องติดตาม", "Watch") : L("ต้องแก้ไขด่วน", "Act now")}</span></div>`).join("")}</section>
  <div class="grid2">
    <section class="panel chart"><header><h2>${L("งบประมาณกับผลงาน", "Budget against results")}</h2><span class="sp"></span><span class="sub">${L("มุมขวาบน = ใช้เงินตามแผนและได้ผลงานตามเป้า", "Top right = on plan and on target")}</span></header>
      <div class="body">${scatter(rows)}<div class="legend">${["A", "B", "C", "D"].map(g => `<span><i class="sw" style="border-radius:50%;background:var(--${g === "A" ? "accent" : g === "B" ? "info" : g === "C" ? "warn" : "bad"})"></i>${g}</span>`).join("")}</div></div></section>
    <section class="panel"><header><h2>${L("วิธีให้คะแนน", "How grades work")}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:8px;font-size:14px">
      <span>${L("คะแนน = 40% ผลเบิกจ่ายเทียบแผน + 60% ผลผลิตเทียบเป้า (แต่ละส่วนสูงสุด 100%)", "Score = 40% disbursed vs plan + 60% output vs target (each capped at 100%)")}</span>
      <span>A ≥ 90 · B ≥ 75 · C ≥ 60 · D &lt; 60</span>
      <span class="sub">${L("ผลลัพธ์ (ตัวชี้วัด) แสดงประกอบ ไม่นำมาคิดคะแนน เพราะเกิดจากหลายโครงการร่วมกัน", "Outcomes (KPIs) are shown for context but not scored, since several projects share them")}</span></div></section>
  </div>
  <section class="panel"><header><h2>${L("Scorecard รายโครงการ", "Project scorecard")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("โครงการ", "Project")}</th><th class="n">${L("ใช้เงิน (ลบ.)", "Spent (M)")}</th><th class="n">${L("% ตามแผน", "% of plan")}</th><th>${L("ผลผลิต", "Output")}</th><th class="n">${L("% เป้า", "% target")}</th><th class="n">${L("ต้นทุนต่อหน่วย (บาท)", "Cost per unit (baht)")}</th><th>${L("ผลลัพธ์", "Outcome")}</th><th class="c">${L("ระดับ", "Grade")}</th></tr></thead>
      <tbody>${rows.map(({ p, o, s }) => `<tr><td>${esc(tx(p.name))}<div class="sub">${unitName(p.unit)}</div></td><td class="n">${fmt(p.actual, 1)}</td><td class="n">${fmt(s.spend, 0)}%</td>
        <td class="sub">${esc(tx(o.name))}: ${fmtv(o.result)}/${fmtv(o.target)} ${esc(tx(o.unit))}</td><td class="n">${s.out == null ? "—" : fmt(s.out, 0) + "%"}</td>
        <td class="n">${o.result > 0 && tx(o.unit) !== "%" ? fmt(p.actual * 1e6 / o.result) : "—"}</td><td>${o.kpi ? achTag(s.oc) : `<span class="sub">—</span>`}</td><td class="c"><span class="pill ${GRADE[s.grade]}">${s.grade}</span></td></tr>`).join("")}</tbody></table></div></section>`;
};

function reportDraft() {
  const rows = S.dash.projects.filter(p => projOut(p)).map(p => ({ p, s: projScore(p) }));
  const weak = rows.filter(r => r.s.grade === "D" || r.s.grade === "C").sort((a, b) => a.s.score - b.s.score).slice(0, 3);
  const miss = allKpis().filter(x => { const p = S.perf.kpis[x.k.id]; return p && p.result != null && achv(p.result, p.target) < 80; });
  const th = [`1. เร่งรัดโครงการที่ได้ระดับต่ำ ได้แก่ ${weak.map(w => w.p.name[0]).join(", ") || "-"} โดยให้หน่วยงานเสนอแผนเร่งรัดการเบิกจ่ายภายใน 30 วัน`,
    `2. ทบทวนแนวทางของตัวชี้วัดที่ต่ำกว่าเป้า ได้แก่ ${miss.map(m => m.k.id + " " + m.k.name[0]).join(", ") || "-"} และพิจารณาปรับค่าเป้าหมายรอบ 12 เดือนหากจำเป็น`,
    "3. ใช้ผลการประเมินนี้ประกอบการจัดลำดับความสำคัญของคำของบประมาณปี 2571 ใน M03"].join("\n");
  const en = [`1. Speed up the lowest-graded projects: ${weak.map(w => w.p.name[1]).join(", ") || "-"}. Ask each unit for a recovery plan within 30 days.`,
    `2. Review the approach for KPIs below target: ${miss.map(m => m.k.id + " " + m.k.name[1]).join(", ") || "-"}, and adjust 12-month targets if needed.`,
    "3. Feed these results into FY2571 request prioritisation in M03."].join("\n");
  return [th, en];
}
PERF.report = () => {
  const T = dashTotals(), ks = allKpis().map(x => ({ ...x, p: S.perf.kpis[x.k.id] })).filter(x => x.p);
  const met = ks.filter(x => x.p.result != null && achv(x.p.result, x.p.target) >= 100), miss = ks.filter(x => x.p.result != null && achv(x.p.result, x.p.target) < 100), none = ks.filter(x => x.p.result == null);
  const rows = S.dash.projects.filter(p => projOut(p)).map(p => ({ p, s: projScore(p) })), weak = rows.filter(r => r.s.grade === "C" || r.s.grade === "D");
  const ed = ROLE === "plan", rep = S.perf.report;
  return `
  <section class="panel doc-form"><div class="body" style="display:flex;flex-direction:column;gap:14px">
    <div class="doc-head"><b>${L("รายงานผลการดำเนินงานและการใช้จ่ายงบประมาณ รอบกลางปี", "Mid-year performance and budget report")}</b><span>${esc(tx(S.org))} · ${fyLabel(S.dash.fy)}</span><span class="sub">${L("ข้อมูลถึง", "Data to")} ${fdate(S.dash.asOf)}</span></div>
    <h3 class="rep-h">1. ${L("ภาพรวม", "Overview")}</h3>
    <p>${L(`ได้รับงบประมาณ ${fmt(T.alloc)} ล้านบาท เบิกจ่ายแล้ว ${fmt(T.actual)} ล้านบาท (${fmt(T.rate, 1)}%) คิดเป็น ${fmt(T.prog, 1)}% ของแผน ตัวชี้วัดบรรลุเป้า ${met.length} จาก ${ks.length} ตัว และมีโครงการที่ต้องติดตาม ${weak.length} โครงการ`,
      `Budget received ${fmt(T.alloc)} M baht, disbursed ${fmt(T.actual)} M (${fmt(T.rate, 1)}%), ${fmt(T.prog, 1)}% of plan. ${met.length} of ${ks.length} KPIs met target; ${weak.length} projects need follow-up.`)}</p>
    <h3 class="rep-h">2. ${L("ตัวชี้วัด", "KPIs")}</h3>
    <ul>${met.map(x => `<li>${tag(L("บรรลุ", "Met"), "p-ok")} ${x.k.id} ${esc(tx(x.k.name))}</li>`).join("")}${miss.map(x => `<li>${tag(L("ยังไม่บรรลุ", "Not yet"), "p-warn")} ${x.k.id} ${esc(tx(x.k.name))} (${fmt(achv(x.p.result, x.p.target), 0)}%)</li>`).join("")}${none.map(x => `<li>${tag(L("ยังไม่รายงาน", "Not reported"), "p-mute")} ${x.k.id} ${esc(tx(x.k.name))}</li>`).join("")}</ul>
    <h3 class="rep-h">3. ${L("โครงการที่ต้องติดตาม", "Projects to follow up")}</h3>
    <ul>${weak.map(r => `<li><span class="pill ${GRADE[r.s.grade]}">${r.s.grade}</span> ${esc(unitName(r.p.unit))} · ${esc(tx(r.p.name))} — ${L("เบิกจ่าย", "spent")} ${fmt(r.s.spend, 0)}% ${L("ของแผน, ผลผลิต", "of plan, output")} ${r.s.out == null ? "—" : fmt(r.s.out, 0) + "%"}</li>`).join("") || `<li>${L("ไม่มี", "None")}</li>`}</ul>
    <h3 class="rep-h">4. ${L("ข้อเสนอแนะ", "Recommendations")}</h3>
    ${rep ? `<textarea id="rep-txt" rows="6" ${ed ? "" : "disabled"} class="${rep.ai ? "ai-draft" : ""}">${esc(tx(rep.text))}</textarea>${rep.ai ? `<span class="hint">${L("ร่างโดย AI จากข้อมูลในรายงาน · ตรวจทานก่อนส่ง", "Drafted by AI from this report's data · review before sending")}</span>` : ""}`
      : `<span class="sub">${L("ยังไม่มีข้อเสนอแนะ", "No recommendations yet")}</span>`}
    <div class="row">${ed ? `<button class="btn" type="button" id="rep-ai">${L("ให้ AI ร่างข้อเสนอแนะ", "Ask AI to draft recommendations")}</button>
      <button class="btn primary" type="button" id="rep-send" ${rep ? "" : "disabled"}>${L("ส่งรายงานต่อผู้บริหาร", "Send the report to executives")}</button>` : ""}
      <button class="btn" type="button" id="rep-pdf">${L("ส่งออก PDF", "Export PDF")}</button>${rep && rep.sent ? tag(`${L("ส่งแล้ว", "Sent")} ${fdate(rep.sent)}`, "p-ok") : ""}</div>
  </div></section>`;
};

VIEWS.performance = () => `
  <div class="head"><div><div class="eyebrow">M08 · Budget Performance</div><h1>${L("ผลสัมฤทธิ์ของงบประมาณ", "Budget performance")}</h1>
    <p>${L("ประเมินผลรอบกลางปี", "Mid-year evaluation")} ${fyLabel(S.dash.fy)} · ${L("ข้อมูลถึง", "data to")} ${fdate(S.dash.asOf)} · ${L("ใช้ภาพข้อมูลเดียวกับ M07", "same snapshot as M07")}</p></div></div>
  <div class="tabs" role="tablist">${PERF_TABS.map(t => `<button class="tab ${t.id === PERF_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${t.id === PERF_TAB}" data-ptab="${t.id}">${tx(t.label)}</button>`).join("")}</div>
  ${PERF[PERF_TAB]()}`;

BIND.performance = () => {
  $$("[data-ptab]").forEach(b => (b.onclick = () => { PERF_TAB = b.dataset.ptab; route(); }));
  $$("[data-kr]").forEach(inp => (inp.onchange = () => {
    const p = S.perf.kpis[inp.dataset.kr]; p.result = inp.value === "" ? null : Number(inp.value); p.t = nowIso();
    audit(["บันทึกผลตัวชี้วัด", "Entered a KPI result"], `${inp.dataset.kr}: ${inp.value}`); commit(); route();
  }));
  const cp = $("#ch-p"); if (cp) cp.onchange = () => { CHAIN_P = cp.value; route(); };
  const os = $("#out-save"); if (os) os.onclick = () => {
    const o = S.perf.outputs[CHAIN_P]; o.result = Number($("#out-r").value);
    audit(["บันทึกผลผลิตโครงการ", "Updated a project output"], `${CHAIN_P}: ${o.result}`); commit(); route(); toast(L("บันทึกผลผลิตแล้ว", "Output saved"));
  };
  const ai = $("#rep-ai"); if (ai) ai.onclick = () => {
    S.perf.report = { text: reportDraft(), ai: true };
    S.aiLog.unshift({ t: nowIso(), agent: "AG-03", user: me().id, action: ["ร่างข้อเสนอแนะรายงานประเมินผล", "Drafted evaluation recommendations"], target: "M08", sources: 3, ok: true });
    audit(["ใช้ AI ร่างข้อเสนอแนะรายงานประเมินผล", "Used AI to draft evaluation recommendations"], "M08"); commit(); route();
  };
  const tx_ = $("#rep-txt"); if (tx_) tx_.oninput = () => { S.perf.report.text = tx_.value; S.perf.report.ai = false; save(); };
  const sd = $("#rep-send"); if (sd) sd.onclick = () => {
    S.perf.report.sent = TODAY;
    audit(["ส่งรายงานประเมินผลต่อผู้บริหาร", "Sent the evaluation report to executives"], "M08");
    notify(["exec"], ["กองแผนงานส่งรายงานประเมินผลกลางปีแล้ว", "Planning sent the mid-year evaluation report"], "performance"); commit(); route(); toast(L("ส่งรายงานแล้ว", "Report sent"));
  };
  const pdf = $("#rep-pdf"); if (pdf) pdf.onclick = () => { audit(["ส่งออกรายงานประเมินผล", "Exported the evaluation report"], "PDF"); commit(); toast(L("สร้างไฟล์ PDF แล้ว (จำลอง)", "PDF created (simulated)")); };
};
