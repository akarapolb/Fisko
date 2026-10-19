// M07 tabs (round 4): drill-down, monthly progress reports, GFMIS import and reconciliation, alerts.
let MON_TAB = "overview", DRILL_U = null, DRILL_P = null, SHOW_ACK = false, STAGED = null;
const MON_PANELS = {}, MON_BIND = {};
function monTabsBar() {
  const n = monAlerts().filter(a => !S.acks.includes(a.id)).length;
  const t = [["overview", L("ภาพรวม", "Overview")], ["drill", L("เจาะลึก", "Drill-down")], ["progress", L("รายงานความก้าวหน้า", "Progress reports")], ["import", L("นำเข้าผลเบิกจ่าย", "Disbursement import")], ["alerts", `${L("การแจ้งเตือน", "Alerts")} (${n})`], ["forecast", L("คาดการณ์สิ้นปี", "Year-end forecast")], ["procure", L("ขั้นตอนจัดซื้อจัดจ้าง", "Procurement")]];
  return `<div class="tabs" role="tablist">${t.map(([id, l]) => `<button class="tab ${id === MON_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === MON_TAB}" data-mtab="${id}">${l}</button>`).join("")}</div>`;
}
const pct = (a, b) => (b ? a / b * 100 : 0);
const stateCell = (a, p) => { const v = pct(a, p); return tag(`${fmt(v, 1)}%`, v < 70 ? "p-bad" : v < 90 ? "p-warn" : "p-ok"); };

// ---- drill-down ----
const EXP_SPLIT = {
  per: [[["เงินเดือน", "Salaries"], 0.9], [["ค่าจ้างประจำ", "Permanent wages"], 0.1]],
  ope: [[["ค่าตอบแทน", "Allowances"], 0.1], [["ค่าใช้สอย", "Services"], 0.55], [["ค่าวัสดุ", "Materials"], 0.2], [["ค่าสาธารณูปโภค", "Utilities"], 0.15]],
  inv: [[["ค่าครุภัณฑ์", "Equipment"], 0.6], [["ค่าที่ดินและสิ่งก่อสร้าง", "Land and buildings"], 0.4]],
  sub: [[["เงินอุดหนุนทั่วไป", "General subsidies"], 1]], oth: [[["รายจ่ายอื่น", "Other"], 1]],
};
function miniCurve(alloc, plan, actual) {
  const W = 360, H = 120, P = 8, iw = W - 2 * P, ih = H - 2 * P - 14, x = i => P + iw / 11 * i, y = v => P + ih - v / alloc * ih;
  const ps = PLAN_F.map(f => f * alloc * (plan / (0.6 * alloc))), as = ACT_F.map(f => f / ACT_F[6] * actual);
  const line = a => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Math.min(v, alloc)).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L("แผนและผลสะสม", "Cumulative plan and actual")}"><line x1="${P}" x2="${W - P}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>
    <path d="${line(ps)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 4"/><path d="${line(as)}" fill="none" stroke="var(--ch-1)" stroke-width="2.5"/>
    <text x="${P}" y="${H - 2}">${FY_MONTHS[LANG][0]}</text><text x="${W - P}" y="${H - 2}" text-anchor="end">${FY_MONTHS[LANG][11]}</text></svg>`;
}
MON_PANELS.drill = () => {
  if (DRILL_U && !S.dash.units.find(u => u.unit === DRILL_U)) DRILL_U = DRILL_P = null;
  if (DRILL_P && !S.dash.projects.find(p => p.id === DRILL_P && p.unit === DRILL_U)) DRILL_P = null;
  const crumbs = [`<a href="#" data-dl="0">${L("ทุกหน่วยงาน", "All units")}</a>`];
  let body = "";
  if (!DRILL_U) {
    body = `<div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("ได้รับจัดสรร", "Allocated")}</th><th class="n">${L("แผนสะสม", "Plan")}</th><th class="n">${L("ผลเบิกจ่าย", "Disbursed")}</th><th class="n">${L("% ตามแผน", "% of plan")}</th><th class="n">${L("โครงการ", "Projects")}</th></tr></thead>
      <tbody>${S.dash.units.map(u => `<tr class="prog-row" data-du="${u.unit}" tabindex="0"><td>${unitName(u.unit)}</td><td class="n">${fmt(u.alloc, 1)}</td><td class="n">${fmt(u.plan, 1)}</td><td class="n">${fmt(u.actual, 1)}</td><td class="n">${stateCell(u.actual, u.plan)}</td><td class="n">${S.dash.projects.filter(p => p.unit === u.unit).length}</td></tr>`).join("")}</tbody></table></div>`;
  } else {
    crumbs.push(DRILL_P ? `<a href="#" data-dl="1">${esc(unitName(DRILL_U))}</a>` : `<b>${esc(unitName(DRILL_U))}</b>`);
    if (!DRILL_P) {
      const ps = S.dash.projects.filter(p => p.unit === DRILL_U);
      body = `<div class="tbl-wrap"><table><thead><tr><th>${L("โครงการ / รายการ", "Project")}</th><th>${L("งบรายจ่าย", "Type")}</th><th class="n">${L("ได้รับจัดสรร", "Allocated")}</th><th class="n">${L("แผนสะสม", "Plan")}</th><th class="n">${L("ผลเบิกจ่าย", "Disbursed")}</th><th class="n">${L("% ตามแผน", "% of plan")}</th><th>${L("รายงานล่าสุด", "Latest report")}</th></tr></thead>
        <tbody>${ps.map(p => { const pr = S.progress[p.id]; return `<tr class="prog-row" data-dp="${p.id}" tabindex="0"><td>${esc(tx(p.name))}</td><td class="sub">${typeName(p.type)}</td><td class="n">${fmt(p.alloc, 1)}</td><td class="n">${fmt(p.plan, 1)}</td><td class="n">${fmt(p.actual, 1)}</td><td class="n">${stateCell(p.actual, p.plan)}</td><td>${pr ? tag(tx(PSTAT[pr.status][0]), PSTAT[pr.status][1]) : `<span class="sub">${L("ยังไม่รายงาน", "Not reported")}</span>`}</td></tr>`; }).join("")}</tbody></table></div>`;
    } else {
      const p = S.dash.projects.find(x => x.id === DRILL_P), sp = EXP_SPLIT[p.type], k = sp.map((s, i) => s[1] * (i === 0 ? 1.1 : 0.95)), ks = sumv(k), pr = S.progress[p.id];
      crumbs.push(`<b>${esc(tx(p.name))}</b>`);
      body = `<div class="grid2" style="padding:16px 18px"><div class="tbl-wrap" style="border:1px solid var(--line);border-radius:8px"><table><thead><tr><th>${L("หมวดรายจ่าย", "Expense category")}</th><th class="n">${L("ได้รับจัดสรร", "Allocated")}</th><th class="n">${L("แผนสะสม", "Plan")}</th><th class="n">${L("ผลเบิกจ่าย", "Disbursed")}</th><th class="n">${L("% ตามแผน", "% of plan")}</th></tr></thead>
        <tbody>${sp.map((s, i) => { const a = p.actual * k[i] / ks; return `<tr><td>${tx(s[0])}</td><td class="n">${fmt(p.alloc * s[1], 2)}</td><td class="n">${fmt(p.plan * s[1], 2)}</td><td class="n">${fmt(a, 2)}</td><td class="n">${stateCell(a, p.plan * s[1])}</td></tr>`; }).join("")}</tbody>
        <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(p.alloc, 2)}</td><td class="n">${fmt(p.plan, 2)}</td><td class="n">${fmt(p.actual, 2)}</td><td class="n">${stateCell(p.actual, p.plan)}</td></tr></tfoot></table></div>
        <div style="display:flex;flex-direction:column;gap:10px;min-width:0"><div class="chart">${miniCurve(p.alloc, p.plan, p.actual)}</div>
          <div class="legend"><span><i style="background:var(--ch-1)"></i>${L("ผลสะสม", "Actual")}</span><span><i style="background:var(--muted)"></i>${L("แผนสะสม", "Plan")}</span></div>
          ${pr ? `<div class="alert"><div class="ic" style="background:var(--${pr.status === "risk" ? "bad" : pr.status === "delay" ? "warn" : "accent"}-soft);color:var(--${pr.status === "risk" ? "bad" : pr.status === "delay" ? "warn" : "accent"})">!</div><div><b>${tx(PSTAT[pr.status][0])} · ${L("ความก้าวหน้า", "progress")} ${pr.pct}%</b><p>${esc(tx(pr.issue))}</p></div></div>` : `<span class="sub">${L("ยังไม่มีรายงานความก้าวหน้า", "No progress report yet")}</span>`}</div></div>`;
    }
  }
  return `<section class="panel"><header><h2>${L("เจาะลึกผลการใช้จ่าย", "Spending drill-down")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท", "M baht")}</span></header>
    <div class="body hier" style="font-size:14px">${crumbs.join("<em>›</em>")}</div>${body}</section>`;
};
MON_BIND.drill = () => {
  const act = (sel, fn) => $$(sel).forEach(el => { el.onclick = e => { e.preventDefault(); fn(el); route(); }; el.onkeydown = e => { if (e.key === "Enter") { fn(el); route(); } }; });
  act("[data-du]", el => { DRILL_U = el.dataset.du; DRILL_P = null; });
  act("[data-dp]", el => { DRILL_P = el.dataset.dp; });
  act("[data-dl]", el => { if (el.dataset.dl === "0") DRILL_U = null; DRILL_P = null; });
};

// ---- progress reports ----
const PSTAT = { on: [["ตามแผน", "On track"], "p-ok"], delay: [["ล่าช้า", "Delayed"], "p-warn"], risk: [["เสี่ยงไม่ทันปีงบประมาณ", "At risk this year"], "p-bad"] };
MON_PANELS.progress = () => {
  const mine = ROLE === "div", u = me().unit, ps = mine ? S.dash.projects.filter(p => p.unit === u) : S.dash.projects;
  const missing = S.dash.projects.filter(p => !S.progress[p.id]).length;
  if (mine) return `
  <section class="panel"><header><h2>${L("รายงานความก้าวหน้าประจำเดือน", "Monthly progress report")} · ${fdate(S.dash.asOf)}</h2><span class="sp"></span><span class="sub">${unitName(u)}</span></header>
    <div class="body" style="display:flex;flex-direction:column;gap:14px">${ps.map(p => { const pr = S.progress[p.id] || { pct: Math.round(pct(p.actual, p.alloc)), status: "on", issue: "", next: 0 };
      return `<div class="card-line"><div class="row" style="justify-content:space-between"><b>${esc(tx(p.name))}</b><span class="sub">${L("เบิกจ่าย", "Disbursed")} ${fmt(p.actual, 1)} / ${fmt(p.alloc, 1)} ${L("ลบ.", "M")} · ${L("ตามแผน", "of plan")} ${fmt(pct(p.actual, p.plan), 1)}%</span></div>
        <div class="form-grid eq-grid">
          <div class="f"><label for="pg-p-${p.id}">${L("ความก้าวหน้างาน (%)", "Work progress (%)")}</label><input type="number" min="0" max="100" id="pg-p-${p.id}" data-pg="${p.id}" data-f="pct" value="${pr.pct}"></div>
          <div class="f"><label for="pg-s-${p.id}">${L("สถานะ", "Status")}</label><select id="pg-s-${p.id}" data-pg="${p.id}" data-f="status">${Object.keys(PSTAT).map(k => `<option value="${k}" ${k === pr.status ? "selected" : ""}>${tx(PSTAT[k][0])}</option>`).join("")}</select></div>
          <div class="f"><label for="pg-n-${p.id}">${L("คาดเบิกจ่ายเดือนหน้า (ลบ.)", "Expected next month (M)")}</label><input type="number" min="0" step="0.1" id="pg-n-${p.id}" data-pg="${p.id}" data-f="next" value="${pr.next}"></div>
          <div class="f full"><label for="pg-i-${p.id}">${L("ปัญหาและแนวทางแก้ไข", "Issues and actions")}</label><input type="text" id="pg-i-${p.id}" data-pg="${p.id}" data-f="issue" value="${esc(tx(pr.issue))}"></div>
        </div></div>`; }).join("") || `<span class="sub">${L("หน่วยงานนี้ไม่มีโครงการในภาพตัวอย่าง", "This unit has no projects in the sample")}</span>`}
      ${ps.length ? `<div><button class="btn primary" type="button" id="pg-send">${L("ส่งรายงาน", "Submit report")}</button></div>` : ""}</div></section>`;
  return `
  <section class="panel"><header><h2>${L("รายงานความก้าวหน้าทุกโครงการ", "Progress reports, all projects")}</h2><span class="sp"></span>${missing ? tag(`${missing} ${L("โครงการยังไม่รายงาน", "projects not reported")}`, "p-warn") : tag(L("รายงานครบ", "All reported"), "p-ok")}
    ${ROLE === "plan" && missing ? `<button class="btn" type="button" id="pg-remind">${L("เตือนหน่วยงานที่ยังไม่รายงาน", "Remind units that haven't reported")}</button>` : ""}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th>${L("โครงการ", "Project")}</th><th class="n">${L("ความก้าวหน้า", "Progress")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ปัญหา", "Issue")}</th><th>${L("รายงานเมื่อ", "Reported")}</th></tr></thead>
      <tbody>${ps.map(p => { const pr = S.progress[p.id]; return `<tr><td class="sub">${unitName(p.unit)}</td><td>${esc(tx(p.name))}</td><td class="n">${pr ? pr.pct + "%" : "—"}</td>
        <td>${pr ? tag(tx(PSTAT[pr.status][0]), PSTAT[pr.status][1]) : tag(L("ยังไม่รายงาน", "Not reported"), "p-mute")}</td><td class="sub">${pr ? esc(tx(pr.issue)) : ""}</td><td class="sub">${pr ? fdate(pr.t) : ""}</td></tr>`; }).join("")}</tbody></table></div>
    ${ROLE !== "plan" ? `<div class="body sub">${L("สลับเป็นบทบาท “สำนัก / กอง” เพื่อทดลองส่งรายงาน", "Switch to the Division role to try submitting a report")}</div>` : ""}</section>`;
};
MON_BIND.progress = () => {
  const send = $("#pg-send");
  if (send) send.onclick = () => {
    const ids = [...new Set($$("[data-pg]").map(e => e.dataset.pg))];
    ids.forEach(id => {
      const get = f => $(`[data-pg="${id}"][data-f="${f}"]`).value;
      S.progress[id] = { pct: Number(get("pct")), status: get("status"), issue: get("issue"), next: Number(get("next")), t: nowIso(), by: me().id };
    });
    const risky = ids.filter(id => S.progress[id].status !== "on");
    audit(["ส่งรายงานความก้าวหน้า", "Submitted a progress report"], `${unitName(me().unit)} · ${ids.length}`);
    notify(["plan"].concat(risky.length ? ["exec"] : []), [`${unitName(me().unit)} ส่งรายงานความก้าวหน้า${risky.length ? ` (มี ${risky.length} โครงการล่าช้า/เสี่ยง)` : ""}`, `${unitOf(me().unit).name[1]} sent a progress report${risky.length ? ` (${risky.length} delayed or at risk)` : ""}`], "dashboard");
    commit(); route(); toast(L("ส่งรายงานแล้ว", "Report submitted"));
  };
  const rm = $("#pg-remind");
  if (rm) rm.onclick = () => { notify(["div"], ["กองแผนงานเตือนให้ส่งรายงานความก้าวหน้าประจำเดือน", "Planning reminds you to send this month's progress report"], "dashboard"); audit(["เตือนหน่วยงานส่งรายงาน", "Reminded units to report"], "M07"); commit(); toast(L("ส่งการเตือนแล้ว", "Reminder sent")); };
};

// ---- GFMIS import ----
const GREASON = { timing: ["บันทึกต่างงวด", "Different posting period"], code: ["รหัสงบประมาณไม่ตรง", "Budget code mismatch"], manual: ["บันทึกด้วยมือในระบบ", "Manual entry"], other: ["อื่น ๆ", "Other"] };
MON_PANELS.import = () => {
  const g = S.integrations.find(i => i.id === "IF-02"), open = S.gfmis.filter(x => !x.ok), ed = ROLE === "fin";
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("นำเข้าล่าสุด", "Last import")}</span><span class="v" style="font-size:18px">${g.last ? fdate(g.last, true) : "—"}</span><span class="d sub">New GFMIS Thai · IF-02</span></div>
    <div class="kpi"><span class="l">${L("รายการที่นำเข้า", "Rows imported")}</span><span class="v">${fmt(g.records)}</span></div>
    <div class="kpi"><span class="l">${L("ยอดไม่ตรง", "Not reconciled")}</span><span class="v" style="color:var(--${open.length ? "bad" : "accent"})">${open.length}</span></div>
    <div class="kpi"><span class="l">${L("สถานะการเชื่อมต่อ", "Connection")}</span><span class="v" style="font-size:18px">${tag(tx(IF_STATUS[g.status][0]), IF_STATUS[g.status][1])}</span></div>
  </section>
  <section class="panel"><header><h2>${L("กระทบยอดกับระบบบัญชีภาครัฐ", "Reconcile with the government accounting system")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท", "M baht")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รหัสงบประมาณ", "Budget code")}</th><th>${L("หน่วยงาน", "Unit")}</th><th class="n">GFMIS</th><th class="n">Fisko</th><th class="n">${L("ผลต่าง", "Difference")}</th><th style="width:200px">${L("สาเหตุ", "Cause")}</th><th></th></tr></thead>
      <tbody>${S.gfmis.map(x => `<tr><td class="mono">${x.code}</td><td class="sub">${unitName(x.unit)}</td><td class="n">${mb(x.gf)}</td><td class="n">${mb(x.fk)}</td><td class="n" style="color:var(--${x.ok ? "ink-2" : "bad"})">${mb(x.gf - x.fk)}</td>
        <td>${x.ok ? tx(GREASON[x.reason]) : `<select data-gr="${x.id}" ${ed ? "" : "disabled"} aria-label="${L("สาเหตุ", "Cause")} ${x.code}"><option value="">${L("— เลือกสาเหตุ —", "— Choose a cause —")}</option>${Object.keys(GREASON).map(k => `<option value="${k}">${tx(GREASON[k])}</option>`).join("")}</select>`}</td>
        <td>${x.ok ? tag(L("ปิดแล้ว", "Closed"), "p-ok") : ed ? `<button class="btn" type="button" data-gok="${x.id}">${L("ใช้ยอด GFMIS", "Use GFMIS figure")}</button>` : tag(L("รอกองคลัง", "Waiting for Finance"), "p-warn")}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("GFMIS เป็นแหล่งข้อมูลหลักของผลเบิกจ่าย ระบบปรับยอดตาม GFMIS และเก็บสาเหตุไว้ตรวจสอบ", "GFMIS is the source of truth for disbursement. Fisko adopts its figure and keeps the cause for audit.")}</div></section>
  ${ed ? `<section class="panel"><header><h2>${L("นำเข้าไฟล์รายงานผลเบิกจ่าย", "Import a disbursement report file")}</h2><span class="sp"></span><span class="sub">${L("ใช้ระหว่างรอช่องทางเชื่อมต่ออัตโนมัติ", "Used until the automatic channel is approved")}</span></header>
    <div class="body" style="display:flex;flex-direction:column;gap:12px">
      <label class="field-inline" for="gf-file">${L("เลือกไฟล์ (.csv, .xlsx, .txt)", "Choose a file (.csv, .xlsx, .txt)")} <input type="file" id="gf-file" accept=".csv,.xlsx,.xls,.txt"></label>
      ${STAGED ? `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${esc(STAGED.name)} · ${fmt(STAGED.size / 1024, 1)} KB</b>
        <p>${L("พักไว้ตรวจก่อนบันทึก: รูปแบบไฟล์ผ่าน · ประมาณ", "Staged for checking: format accepted · about")} ${fmt(STAGED.rows)} ${L("รายการ · ต้นแบบนี้ไม่ได้อ่านเนื้อหาไฟล์จริง", "rows · this prototype does not read the file contents")}</p></div></div>
        <div class="row"><button class="btn primary" type="button" id="gf-ok">${L("ยืนยันนำเข้า", "Confirm import")}</button><button class="btn ghost" type="button" id="gf-no">${L("ยกเลิก", "Cancel")}</button></div>` : ""}
    </div></section>` : ""}`;
};
MON_BIND.import = () => {
  const g = S.integrations.find(i => i.id === "IF-02");
  $$("[data-gok]").forEach(b => (b.onclick = () => {
    const x = S.gfmis.find(v => v.id === b.dataset.gok), r = $(`[data-gr="${x.id}"]`).value;
    if (!r) { toast(L("เลือกสาเหตุของผลต่างก่อน", "Choose the cause of the difference first")); return; }
    x.ok = true; x.reason = r; x.fk = x.gf;
    if (S.gfmis.every(v => v.ok)) { g.status = "ok"; g.msg = ["กระทบยอดแล้ว ยอดตรงกัน", "Reconciled, totals match"]; }
    audit(["กระทบยอดผลเบิกจ่ายกับ GFMIS", "Reconciled disbursement with GFMIS"], `${x.code} · ${tx(GREASON[r])}`); commit(); renderShell(); route();
  }));
  const f = $("#gf-file");
  if (f) f.onchange = () => { const file = f.files[0]; if (!file) return; STAGED = { name: file.name, size: file.size, rows: Math.max(1, Math.round(file.size / 120)) }; route(); };
  const ok = $("#gf-ok"); if (ok) ok.onclick = () => { g.last = nowIso(); g.records += STAGED.rows; audit(["นำเข้าไฟล์ผลเบิกจ่าย", "Imported a disbursement file"], STAGED.name); STAGED = null; commit(); route(); toast(L("นำเข้าแล้ว", "Imported")); };
  const no = $("#gf-no"); if (no) no.onclick = () => { STAGED = null; route(); };
};

// ---- alerts ----
function monAlerts() {
  const out = [];
  S.dash.projects.forEach(p => { const v = pct(p.actual, p.plan); if (v < 90) out.push({ id: "beh-" + p.id, lv: v < 70 ? "bad" : "warn", t: `${unitName(p.unit)} · ${tx(p.name)}`, d: `${L("เบิกจ่ายต่ำกว่าแผน", "Behind plan by")} ${fmt(100 - v, 0)}%`, go: () => { MON_TAB = "drill"; DRILL_U = p.unit; DRILL_P = p.id; } }); });
  Object.keys(S.progress).forEach(id => { const pr = S.progress[id], p = S.dash.projects.find(x => x.id === id); if (p && pr.status !== "on") out.push({ id: "rep-" + id + pr.t, lv: pr.status === "risk" ? "bad" : "warn", t: `${unitName(p.unit)} · ${tx(p.name)}`, d: `${tx(PSTAT[pr.status][0])}: ${tx(pr.issue)}`, go: () => { MON_TAB = "progress"; } }); });
  (S.allocs[CUR_FY] ? S.allocs[CUR_FY].transfers : []).filter(t => t.status === "pending").forEach(t => out.push({ id: "tr-" + t.id, lv: "info", t: `${L("โอนเปลี่ยนแปลงรออนุมัติ", "Transfer waiting for approval")} ${t.id}`, d: `${mb(t.amount)} ${L("ลบ.", "M")} · ${tx(t.why)}`, go: () => { ALLOC_TAB = "transfers"; go("allocation"); } }));
  const op = S.gfmis.filter(x => !x.ok).length;
  if (op) out.push({ id: "gf-open", lv: "warn", t: L("ผลเบิกจ่ายยังกระทบยอดไม่ครบ", "Disbursement not fully reconciled"), d: `${op} ${L("รายการต่างจาก GFMIS", "rows differ from GFMIS")}`, go: () => { MON_TAB = "import"; } });
  return out;
}
MON_PANELS.alerts = () => {
  const all = monAlerts(), list = all.filter(a => SHOW_ACK || !S.acks.includes(a.id));
  return `<section class="panel"><header><h2>${L("การแจ้งเตือนการใช้จ่าย", "Spending alerts")}</h2><span class="sp"></span>${tag(L("จาก AI Monitoring Agent และกฎของระบบ", "From the AI Monitoring Agent and system rules"), "p-info")}
      <label class="field-inline" for="show-ack"><input type="checkbox" id="show-ack" ${SHOW_ACK ? "checked" : ""}> ${L("แสดงที่รับทราบแล้ว", "Show acknowledged")}</label></header>
    <div class="body">${list.map(a => `<div class="alert"><div class="ic" style="background:var(--${a.lv}-soft);color:var(--${a.lv})">!</div><div><div class="row" style="justify-content:space-between"><b>${esc(a.t)}</b>
      <div class="row"><button class="btn ghost" type="button" data-ago="${a.id}" style="padding:4px 10px">${L("ดูรายละเอียด", "View")}</button>${S.acks.includes(a.id) ? tag(L("รับทราบแล้ว", "Acknowledged"), "p-mute") : `<button class="btn" type="button" data-ack="${a.id}" style="padding:4px 10px">${L("รับทราบ", "Acknowledge")}</button>`}</div></div><p>${esc(a.d)}</p></div></div>`).join("")
      || `<span class="sub">${L("ไม่มีการแจ้งเตือนค้าง", "No open alerts")}</span>`}</div></section>`;
};
MON_BIND.alerts = () => {
  const all = monAlerts();
  $("#show-ack").onchange = e => { SHOW_ACK = e.target.checked; route(); };
  $$("[data-ack]").forEach(b => (b.onclick = () => { S.acks.push(b.dataset.ack); audit(["รับทราบการแจ้งเตือน", "Acknowledged an alert"], b.dataset.ack); commit(); route(); }));
  $$("[data-ago]").forEach(b => (b.onclick = () => { const a = all.find(x => x.id === b.dataset.ago); a.go(); route(); }));
};
