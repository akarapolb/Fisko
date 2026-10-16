// M02 Budget Preparation: request list and request form. Checks read the M10 business rules;
// the approval route reads the M10 workflow.
const rule = id => S.rules.find(r => r.id === id);
// Equipment needs a specification; construction can use its drawings instead.
const SPEC_DOC = /คุณลักษณะ|spec|แบบรูป|แบบก่อสร้าง|drawing/i;
const editable = r => ROLE === "div" && r.unit === me().unit && (r.status === "draft" || r.status === "returned");
const itemTotal = it => (Number(it.qty) || 0) * (Number(it.price) || 0);

function lineage(actId) {
  const st = S.structure[2571] || [], out = [];
  let n = st.find(x => x.id === actId);
  while (n) { out.unshift(n); n = st.find(x => x.id === n.parent); }
  return out;
}

function checks(r) {
  const out = [], add = (ruleId, ok, title, okText, badText) => {
    const ru = ruleId ? rule(ruleId) : null;
    if (ru && !ru.on) return;
    const bad = ru ? (ru.effect === "block" ? "no" : "wa") : "no";
    out.push({ s: ok ? "ok" : bad, title, d: ok ? okText : badText, id: ruleId });
  };
  const reason = tx(r.reason).trim(), kpi = tx(r.kpi).trim();
  add("BR-01", !!r.act && !!kpi, L("ตัวชี้วัดและกิจกรรม", "KPI and activity"), L("ผูกกับกิจกรรมและตัวชี้วัดแล้ว", "Linked to an activity and KPI"), L("ยังไม่ระบุตัวชี้วัด", "No KPI yet"));
  const min = (rule("BR-02") || {}).param || 0;
  add("BR-02", reason.length >= min, L("เหตุผลความจำเป็น", "Justification"), L("กรอกครบ", "Complete"), `${L("ต้องมีอย่างน้อย", "Needs at least")} ${min} ${L("ตัวอักษร (ตอนนี้", "characters (now")} ${reason.length})`);
  add(null, r.items.length > 0 && r.items.every(i => tx(i.name).trim() && itemTotal(i) > 0), L("รายการงบประมาณ", "Budget lines"), L("ทุกรายการมีจำนวนและราคาต่อหน่วย", "Every line has a quantity and unit price"), L("มีรายการที่ยังไม่ครบ", "Some lines are incomplete"));
  add(null, r.docs.length > 0, L("เอกสารประกอบ", "Supporting documents"), `${r.docs.length} ${L("ไฟล์", "files")}`, L("ยังไม่มีเอกสารแนบ", "Nothing attached"));
  const inv = r.items.some(i => i.type === "inv"), spec = r.docs.some(d => SPEC_DOC.test(d));
  if (inv) add("BR-03", spec, L("คุณลักษณะเฉพาะครุภัณฑ์", "Equipment specification"), L("แนบแล้ว", "Attached"), L("มีงบลงทุน ต้องแนบคุณลักษณะเฉพาะ", "Investment lines need a specification"));
  if (r.prev > 0) {
    const d = (r.amount / r.prev - 1) * 100, lim = (rule("BR-04") || {}).param || 0;
    add("BR-04", d <= lim, L("เทียบปีก่อน", "Change from last year"), `${d >= 0 ? "+" : ""}${fmt(d, 1)}% ${L("จาก", "from")} ${mb(r.prev)} ${L("ล้านบาท", "M baht")}`, `${d >= 0 ? "+" : ""}${fmt(d, 1)}% ${L("เกินเกณฑ์", "is above")} ${lim}% ${L("· ต้องอธิบายส่วนเพิ่ม", "· explain the increase")}`);
  }
  const over = r.items.filter(i => {
    const nm = Array.isArray(i.name) ? i.name[0] : i.name;
    const sp = S.prices.find(p => p.name[0] === nm || p.name[1] === nm);
    return sp && Number(i.price) > sp.price;
  });
  add("BR-05", !over.length, L("ราคามาตรฐาน", "Standard prices"), L("ไม่เกินราคามาตรฐาน", "Within standard prices"), `${over.length} ${L("รายการสูงกว่าราคามาตรฐาน", "lines above the standard price")}`);
  add("BR-06", TODAY >= cal("c1").date && TODAY <= cal("c2").date, L("ช่วงเวลารับคำขอ", "Request window"), `${L("เปิดถึง", "Open until")} ${fdate(cal("c2").date)}`, L("อยู่นอกช่วงปฏิทินงบประมาณ", "Outside the budget calendar window"));
  if (r.multi && r.years) {
    const ys = Object.values(r.years).reduce((a, b) => a + Number(b || 0), 0);
    add(null, Math.abs(ys - r.amount) < 1, L("แบ่งวงเงินรายปี", "Multi-year split"), L("ผลรวมรายปีเท่ากับวงเงินรวม", "Yearly amounts add up to the total"), `${L("ผลรวมรายปี", "Yearly total")} ${fmt(ys)} ≠ ${fmt(r.amount)} · ${L("แก้ที่แท็บผูกพันหลายปี", "fix it in the Multi-year tab")}`);
  }
  if ((r.comments || []).length) {
    const open = openComments(r).length;
    add(null, !open, L("ความเห็นผู้พิจารณา", "Reviewer comments"), L("แก้ครบทุกข้อแล้ว", "All resolved"), `${L("ยังค้าง", "Still open:")} ${open} ${L("ข้อ", "")}`);
  }
  const invLines = r.items.filter(i => i.type === "inv");
  if (invLines.length) {
    const miss = invLines.filter(i => !i.detail || !String(i.detail.spec || "").trim()).length;
    out.push({ s: miss ? "wa" : "ok", title: L("รายละเอียดครุภัณฑ์ / สิ่งก่อสร้าง", "Equipment and construction detail"), d: miss ? `${miss} ${L("รายการยังไม่กรอกคุณลักษณะโดยย่อ", "lines have no short specification")}` : L("กรอกครบ", "Complete") });
  }
  return out;
}

// ---------- list ----------
VIEWS.requests = () => {
  const list = ROLE === "div" ? S.requests.filter(r => r.unit === me().unit) : S.requests;
  const tot = list.reduce((s, r) => s + r.amount, 0), c2 = cal("c2");
  return `
  <div class="head"><div><div class="eyebrow">M02 · Budget Preparation</div><h1>${L("คำของบประมาณ ปี 2571", "FY2571 budget requests")}</h1>
    <p>${L("กำหนดส่งกองแผนงาน", "Due to Planning")} ${fdate(c2.date)} · ${L("เหลือ", "")} ${daysUntil(c2.date)} ${L("วัน", "days left")}${ROLE === "div" ? ` · ${unitName(me().unit)}` : ""}</p></div>
    <div class="sp"></div>${ROLE === "div" ? `<button class="btn primary" type="button" id="new-req">+ ${L("สร้างคำขอใหม่", "New request")}</button>` : ""}</div>
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("คำขอทั้งหมด", "Requests")}</span><span class="v">${list.length}</span></div>
    <div class="kpi"><span class="l">${L("วงเงินที่ขอรวม", "Total requested")}</span><span class="v">${mb(tot)}<small>${L("ล้านบาท", "M baht")}</small></span></div>
    <div class="kpi"><span class="l">${L("ร่าง / ส่งกลับแก้ไข", "Draft / returned")}</span><span class="v">${list.filter(r => r.status === "draft" || r.status === "returned").length}</span></div>
    <div class="kpi"><span class="l">${L("อยู่ระหว่างพิจารณา", "In review")}</span><span class="v">${list.filter(r => r.status === "plan" || r.status === "committee").length}</span></div>
  </section>
  <section class="panel"><header><h2>${L("รายการคำขอ", "Requests")}</h2><span class="sp"></span>
    <label class="field-inline" for="flt">${L("สถานะ", "Status")} <select id="flt"><option value="">${L("ทั้งหมด", "All")}</option>${Object.keys(STATUS).map(k => `<option value="${k}">${tx(STATUS[k][0])}</option>`).join("")}</select></label></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("โครงการ / รายการ", "Project")}</th><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("วงเงินที่ขอ (บาท)", "Requested (baht)")}</th><th class="n">${L("เทียบปีก่อน", "vs last year")}</th><th>${L("สถานะ", "Status")}</th><th>${L("แก้ไขล่าสุด", "Updated")}</th></tr></thead>
      <tbody id="req-body"></tbody></table></div></section>`;
};
function reqRows(f) {
  const list = (ROLE === "div" ? S.requests.filter(r => r.unit === me().unit) : S.requests).filter(r => !f || r.status === f);
  const lim = (rule("BR-04") || {}).param || 20;
  return list.map(r => {
    const d = r.prev ? (r.amount / r.prev - 1) * 100 : null;
    const dt = d === null ? tag(L("โครงการใหม่", "New"), "p-info") : `<span style="color:${d > lim ? "var(--warn)" : "var(--ink-2)"}">${d >= 0 ? "+" : ""}${fmt(d, 1)}%</span>`;
    return `<tr class="click" tabindex="0" data-id="${r.id}"><td class="mono">${r.id}${r.id === S.story ? " ★" : ""}</td><td>${esc(tx(r.name))}</td><td class="sub">${unitName(r.unit)}</td><td class="n">${fmt(r.amount)}</td><td class="n">${dt}</td><td>${pill(r.status)}</td><td class="sub">${fdate(r.updated)}</td></tr>`;
  }).join("") || `<tr><td colspan="7" class="sub">${L("ไม่มีคำขอในสถานะนี้", "No requests with this status")}</td></tr>`;
}
BIND.requests = () => {
  const body = $("#req-body"); body.innerHTML = reqRows("");
  $("#flt").onchange = e => (body.innerHTML = reqRows(e.target.value));
  body.onclick = e => { const tr = e.target.closest("tr[data-id]"); if (tr) openReq(tr.dataset.id); };
  body.onkeydown = e => { if (e.key === "Enter") body.onclick(e); };
  const nb = $("#new-req");
  if (nb) nb.onclick = () => {
    const n = S.requests.length + 30, id = `REQ-2571-${String(n).padStart(3, "0")}`;
    S.requests.unshift({ id, unit: me().unit, act: "", prev: 0, status: "draft", updated: TODAY, name: [L("คำขอใหม่", "New request"), L("คำขอใหม่", "New request")], kpi: "", reason: "", docs: [], items: [{ type: "ope", name: "", qty: 1, unitName: L("งาน", "job"), price: 0 }], amount: 0, versions: [], comments: [] });
    snapshot(S.requests[0], ["สร้างคำขอ", "Created the request"], true);
    audit(["สร้างคำขอใหม่", "Created a request"], id); commit(); openReq(id);
  };
};

// ---------- request form ----------
function curReq() { return S.requests.find(r => r.id === CUR_REQ) || S.requests.find(r => r.id === S.story); }
VIEWS.request = () => {
  const r = curReq(), ed = editable(r), lin = lineage(r.act), ds = ed ? "" : "disabled";
  const acts = (S.structure[2571] || []).filter(x => x.lvl === "activity");
  return `
  <div class="head"><div><div class="eyebrow">M02 · Budget Preparation · <span class="mono">${r.id}</span></div>
    ${ed ? `<input type="text" id="rname" value="${esc(tx(r.name))}" aria-label="${L("ชื่อโครงการ", "Project name")}" style="font-size:22px;font-weight:700;width:min(640px,100%)">` : `<h1>${esc(tx(r.name))}</h1>`}
    <div class="row" style="margin-top:8px">${pill(r.status)}<span class="sub">${unitName(r.unit)}${r.multi ? " · " + L("คำขอผูกพันต่อเนื่อง 2 ปี (2571–2572)", "2-year commitment (2571–2572)") : ""}</span></div></div>
    <div class="sp"></div><div class="row"><button class="btn" type="button" onclick="go('requests')">${L("กลับรายการ", "Back to list")}</button>${reviewButtons(r)}
      ${ed ? `<button class="btn" type="button" id="save">${L("บันทึกร่าง", "Save draft")}</button><button class="btn primary" type="button" id="submit">${L("ส่งให้กองแผนงาน", "Send to Planning")}</button>` : ""}</div></div>
  ${ed ? "" : `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("โหมดดูอย่างเดียว", "View only")}</b><p>${ROLE !== "div" ? L("แก้ไขได้เฉพาะผู้จัดทำคำขอของหน่วยงาน", "Only the requesting unit can edit") : L("คำขอนี้ส่งแล้วหรือไม่ใช่ของหน่วยงานคุณ", "This request is submitted or belongs to another unit")}</p></div></div>`}
  <div class="hier" aria-label="${L("โครงสร้างงบประมาณ", "Budget structure")}"><span>${fyLabel(2571)}</span><em>›</em><span>${esc(tx(S.org))}</span>${lin.map(n => `<em>›</em><span>${esc(tx(n.name))}</span>`).join("")}</div>
  ${reqTabsBar(r)}
  <div class="grid-form">
    <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
    ${REQ_TAB !== "main" ? REQ_PANELS[REQ_TAB](r, ed) : `
      <section class="panel"><header><h2>${L("รายการงบประมาณ", "Budget lines")}</h2><span class="sp"></span><span class="sub">${L("จำนวน × ราคาต่อหน่วย = วงเงินรวม", "Quantity × unit price = total")}</span></header>
        <div class="tbl-wrap"><table class="items"><thead><tr><th style="width:150px">${L("งบรายจ่าย", "Budget type")}</th><th>${L("รายการ", "Item")}</th><th class="n" style="width:90px">${L("จำนวน", "Qty")}</th><th style="width:90px">${L("หน่วยนับ", "Unit")}</th><th class="n" style="width:140px">${L("ราคาต่อหน่วย", "Unit price")}</th><th class="n" style="width:130px">${L("วงเงินรวม", "Total")}</th><th style="width:40px"></th></tr></thead>
          <tbody id="items"></tbody><tfoot><tr><td colspan="5">${L("รวมวงเงินที่ขอ (บาท)", "Total requested (baht)")}</td><td class="n" id="tot"></td><td></td></tr></tfoot></table></div>
        <div class="body" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between">
          ${ed ? `<button class="btn" type="button" id="add">+ ${L("เพิ่มรายการ", "Add line")}</button>` : "<span></span>"}<div class="row sub" id="bytype"></div></div></section>
      ${generalComments(r)}
      <section class="panel"><header><h2>${L("เหตุผลและตัวชี้วัด", "Justification and KPIs")}</h2></header><div class="body form-grid">
        <div class="f full"><label for="reason">${L("เหตุผลความจำเป็น", "Justification")}</label>
          <textarea id="reason" rows="5" ${ds} placeholder="${L("อธิบายปัญหา ความจำเป็น และผลที่ประชาชนจะได้รับ", "Explain the problem, the need and the benefit to citizens")}" class="${r.aiDraft ? "ai-draft" : ""}">${esc(tx(r.reason))}</textarea>
          <span class="hint" id="reason-hint">${r.aiDraft ? L("ร่างโดย AI · ตรวจทานและแก้ไขก่อนส่ง", "Drafted by AI · review and edit before sending") : L("ใช้ผู้ช่วย AI ทางขวาช่วยร่างได้", "The AI assistant on the right can draft this")}</span></div>
        <div class="f"><label for="kpi">${L("ตัวชี้วัด / ค่าเป้าหมาย", "KPI / target")}</label><input type="text" id="kpi" ${ds} value="${esc(tx(r.kpi))}"></div>
        <div class="f"><label for="act">${L("กิจกรรมตามโครงสร้างงบประมาณ", "Activity in the budget structure")}</label><select id="act" ${ds}><option value="">${L("— เลือกกิจกรรม —", "— Choose an activity —")}</option>${acts.map(a => `<option value="${a.id}" ${a.id === r.act ? "selected" : ""}>${a.code} · ${esc(tx(a.name))}</option>`).join("")}</select>
          <span class="hint">${kpisForAct(r.act).length ? `${L("ตัวชี้วัดใน M01", "M01 KPIs")}: ${kpisForAct(r.act).map(x => `${x.k.id} ${esc(tx(x.k.name))}`).join(" · ")}` : L("กิจกรรมนี้ยังไม่ผูกตัวชี้วัดใน M01", "This activity has no M01 KPI yet")}</span></div>
        <div class="f full"><label>${L("เอกสารประกอบ", "Supporting documents")}</label><div class="row" id="docs"></div>
          ${ed ? `<div class="row"><button class="btn" type="button" id="attach">+ ${L("แนบคุณลักษณะเฉพาะครุภัณฑ์", "Attach equipment specification")}</button></div>` : ""}</div>
      </div></section>`}
    </div>
    <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
      <section class="ai-box" aria-label="${L("ผู้ช่วย AI", "AI assistant")}"><h3>${L("ผู้ช่วย AI", "AI assistant")}</h3><p>${L("ช่วยร่างและตรวจสอบคำขอจากข้อมูลโครงการและคำขอย้อนหลัง", "Drafts and checks requests using project data and past requests")}</p>
        ${ed ? `<button class="btn" type="button" id="ai-draft">${L("ร่างเหตุผลความจำเป็น", "Draft justification")}</button>` : ""}
        <button class="btn" type="button" id="ai-check">${L("ตรวจสอบคำขอก่อนส่ง", "Check before sending")}</button>
        <div id="ai-out"></div><span class="ai-note">${L("AI เสนอเท่านั้น ผู้จัดทำเป็นผู้ตรวจทานและส่งคำขอ", "AI only suggests. The requester reviews and sends.")}</span></section>
      <section class="panel"><header><h2>${L("ตรวจความครบถ้วน", "Completeness check")}</h2><span class="sp"></span><span id="chk-sum"></span></header><div class="body"><ul class="check" id="checks"></ul>
        <div class="sub" style="margin-top:10px">${L("กฎตั้งค่าได้ที่ M10 · กฎทางธุรกิจ", "Rules are set in M10 · Business rules")}</div></div></section>
      <section class="panel"><header><h2>${L("เส้นทางอนุมัติ", "Approval route")}</h2></header><div class="body"><ol class="timeline" id="tl"></ol>
        <div class="sub">${L("ตั้งค่าได้ที่ M10 · Workflow", "Set in M10 · Workflow")}</div></div></section>
    </div>
  </div>`;
};
function renderItems() {
  const r = curReq(), ds = editable(r) ? "" : "disabled";
  $("#items").innerHTML = r.items.map((it, i) => `<tr>
    <td><select data-i="${i}" data-k="type" aria-label="${L("งบรายจ่าย", "Budget type")}" ${ds}>${BUDGET_TYPES.map(t => `<option value="${t.id}" ${t.id === it.type ? "selected" : ""}>${tx(t.name)}</option>`).join("")}</select></td>
    <td><input type="text" data-i="${i}" data-k="name" value="${esc(tx(it.name))}" aria-label="${L("รายการ", "Item")}" ${ds}></td>
    <td><input type="number" min="0" data-i="${i}" data-k="qty" value="${it.qty}" aria-label="${L("จำนวน", "Qty")}" ${ds}></td>
    <td><input type="text" data-i="${i}" data-k="unitName" value="${esc(tx(it.unitName))}" aria-label="${L("หน่วยนับ", "Unit")}" ${ds}></td>
    <td><input type="number" min="0" step="100" data-i="${i}" data-k="price" value="${it.price}" aria-label="${L("ราคาต่อหน่วย", "Unit price")}" ${ds}></td>
    <td class="n" id="t${i}">${fmt(itemTotal(it))}</td>
    <td>${ds ? (canReview(r) ? `<button class="btn ghost" type="button" data-cmt="${i}" aria-label="${L("ใส่ความเห็นรายการนี้", "Comment on this line")}" title="${L("ใส่ความเห็น", "Comment")}" style="padding:4px 8px">✎</button>` : "") : `<button class="btn ghost danger" type="button" data-del="${i}" aria-label="${L("ลบรายการ", "Delete line")}" style="padding:4px 8px">×</button>`}</td></tr>
    ${lineCommentRows(r, it, i)}`).join("");
  renderTotals();
}
function renderTotals() {
  const r = curReq();
  r.items.forEach((it, i) => { const c = $("#t" + i); if (c) c.textContent = fmt(itemTotal(it)); });
  r.amount = reqAmount(r);
  $("#tot").textContent = fmt(r.amount);
  const by = {}; r.items.forEach(it => (by[it.type] = (by[it.type] || 0) + itemTotal(it)));
  $("#bytype").innerHTML = Object.keys(by).map(t => `<span>${typeName(t)} <b class="num">${mb(by[t])}</b> ${L("ลบ.", "M")}</span>`).join("<span>·</span>");
  renderChecks();
}
function renderChecks() {
  const r = curReq(), c = checks(r), bad = c.filter(x => x.s === "no").length, warn = c.filter(x => x.s === "wa").length;
  $("#checks").innerHTML = c.map(x => `<li><span class="m ${x.s}">${x.s === "ok" ? "✓" : x.s === "no" ? "×" : "!"}</span><div><b style="font-weight:600">${x.title}</b>${x.id ? ` <span class="mono sub">${x.id}</span>` : ""}<div class="sub">${x.d}</div></div></li>`).join("");
  $("#chk-sum").innerHTML = bad ? tag(`${L("ขาด", "Missing")} ${bad}`, "p-bad") : warn ? tag(`${L("ข้อสังเกต", "Notes")} ${warn}`, "p-warn") : tag(L("พร้อมส่ง", "Ready"), "p-ok");
  const docs = $("#docs");
  if (docs) docs.innerHTML = r.docs.map(d => tag(esc(d), "p-mute")).join("") || `<span class="sub">${L("ยังไม่มีไฟล์", "No files")}</span>`;
}
function routeSteps(r) { return S.workflow.filter(w => w.cond === "always" || r.amount >= (w.amount || 0)); }
function renderTimeline() {
  const r = curReq(), steps = routeSteps(r);
  let idx = 0;
  if (r.status === "plan") idx = Math.max(0, steps.findIndex(s => s.role === "plan"));
  if (r.status === "committee") idx = Math.max(0, steps.findIndex(s => s.cond === "amount"));
  if (r.status === "approved") idx = steps.length;
  $("#tl").innerHTML = steps.map((s, i) => `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><span class="dot"></span><div>${tx(s.name)}<small>${tx(ROLES[s.role])}${s.sla ? ` · ${L("ภายใน", "within")} ${s.sla} ${L("วัน", "days")}` : ""}${s.cond === "amount" ? ` · ${L("เมื่อวงเงิน ≥", "if amount ≥")} ${mb(s.amount)} ${L("ลบ.", "M")}` : ""}</small></div></li>`).join("");
}
BIND.request = () => {
  const r = curReq();
  renderTimeline(); renderChecks();
  $$("[data-rtab]").forEach(b => (b.onclick = () => { REQ_TAB = b.dataset.rtab; route(); }));
  (REQ_BIND[REQ_TAB] || (() => {}))(r);
  bindReviewMode(r);
  const items = $("#items");
  if (items) {
    renderItems();
    items.oninput = e => { const el = e.target, i = el.dataset.i; if (i === undefined) return; r.items[i][el.dataset.k] = el.type === "number" ? Number(el.value) : el.value; renderTotals(); renderTimeline(); save(); };
    items.onchange = items.oninput;
    items.onclick = e => {
      const b = e.target.closest("[data-del]"); if (b) { r.items.splice(Number(b.dataset.del), 1); renderItems(); save(); return; }
      lineCommentClick(r, e);
    };
  }
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("input", fn); };
  on("#rname", e => { r.name = e.target.value; save(); });
  on("#reason", e => { r.reason = e.target.value; renderChecks(); save(); });
  on("#kpi", e => { r.kpi = e.target.value; renderChecks(); save(); });
  const act = $("#act"); if (act) act.onchange = e => { r.act = e.target.value; save(); route(); };
  const add = $("#add"); if (add) add.onclick = () => { r.items.push({ type: "ope", name: "", qty: 1, unitName: L("งาน", "job"), price: 0 }); renderItems(); save(); $(`#items tr:last-child input[data-k="name"]`).focus(); };
  const att = $("#attach"); if (att) att.onclick = () => {
    if (!r.docs.some(d => /คุณลักษณะ|spec/i.test(d))) { r.docs.push(L("คุณลักษณะเฉพาะครุภัณฑ์.pdf", "Equipment specification.pdf")); audit(["แนบเอกสาร", "Attached a document"], r.id); commit(); renderChecks(); toast(L("แนบไฟล์แล้ว", "File attached")); }
  };
  const ad = $("#ai-draft"); if (ad) ad.onclick = () => {
    if (!agentOn("AG-01")) { toast(L("Budget Preparation Agent ถูกปิดใช้งานใน M09", "The Budget Preparation Agent is switched off in M09")); return; }
    S.aiLog.unshift({ t: nowIso(), agent: "AG-01", user: me().id, action: ["ร่างเหตุผลความจำเป็น", "Drafted a justification"], target: r.id, sources: 3, ok: true });
    r.reason = r.aiText ? r.aiText.slice() : [L("ร่างเหตุผล: ", "Draft: ") + tx(r.name), L("ร่างเหตุผล: ", "Draft: ") + tx(r.name)];
    r.aiDraft = true; audit(["ใช้ AI ร่างเหตุผลความจำเป็น", "Used AI to draft the justification"], r.id); commit();
    if (REQ_TAB !== "main") { REQ_TAB = "main"; route(); toast(L("ร่างเหตุผลแล้ว", "Justification drafted")); return; }
    const ta = $("#reason"); ta.value = tx(r.reason); ta.classList.add("ai-draft");
    $("#reason-hint").textContent = L("ร่างโดย AI · ตรวจทานและแก้ไขก่อนส่ง", "Drafted by AI · review and edit before sending");
    $("#ai-out").innerHTML = `<div class="ai-out"><b>${L("ร่างเหตุผลแล้ว", "Justification drafted")}</b><span>${L("อ้างอิง: สถิติการให้บริการ แผนปฏิบัติราชการ และคำขอโครงการคล้ายกันปีก่อน", "Sources: service statistics, the action plan and similar requests from last year")}</span></div>`;
    renderChecks();
  };
  $("#ai-check").onclick = () => {
    if (!agentOn("AG-02")) { toast(L("Budget Validation Agent ถูกปิดใช้งานใน M09", "The Budget Validation Agent is switched off in M09")); return; }
    S.aiLog.unshift({ t: nowIso(), agent: "AG-02", user: me().id, action: ["ตรวจคำขอก่อนส่ง", "Checked a request before sending"], target: r.id, sources: 2, ok: true });
    const list = checks(r).filter(x => x.s !== "ok").map(x => `${x.title}: ${x.d}`);
    r.items.filter(i => i.type === "inv" && i.price > 1e6).forEach(i => list.push(`“${esc(tx(i.name))}” ${L("ราคาต่อหน่วย", "unit price")} ${fmt(i.price)} ${L("บาท ควรแนบราคาอ้างอิง 3 ราย", "baht: attach 3 reference quotes")}`));
    audit(["ใช้ AI ตรวจคำขอ", "Used AI to check the request"], r.id); commit();
    $("#ai-out").innerHTML = `<div class="ai-out"><b>${list.length ? `${L("พบ", "Found")} ${list.length} ${L("ประเด็น", "issues")}` : L("ไม่พบประเด็นที่ต้องแก้ไข", "No issues found")}</b>${list.length ? `<ul style="margin:0;padding:0">${list.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}</div>`;
  };
  const sv = $("#save"); if (sv) sv.onclick = () => {
    r.updated = TODAY;
    const v = snapshot(r, ["บันทึกร่าง", "Saved draft"]);
    audit(["บันทึกร่างคำขอ", "Saved a request draft"], r.id); commit(); route();
    toast(v ? L(`บันทึกร่างแล้ว · เวอร์ชัน ${v}`, `Draft saved · version ${v}`) : L("บันทึกร่างแล้ว · ไม่มีรายการเปลี่ยน", "Draft saved · no line changes"));
  };
  const sb = $("#submit"); if (sb) sb.onclick = () => {
    if (checks(r).some(x => x.s === "no")) { toast(L("ยังส่งไม่ได้ · แก้รายการที่มีเครื่องหมาย × ก่อน", "Can't send yet · fix the items marked ×")); $("#checks").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    r.status = "plan"; r.updated = TODAY;
    snapshot(r, ["ส่งให้กองแผนงาน", "Sent to Planning"], true);
    audit(["ส่งคำขอให้กองแผนงาน", "Submitted a request to Planning"], r.id);
    const nm = Array.isArray(r.name) ? r.name : [r.name, r.name];
    notify(["plan"], [`คำขอใหม่ ${r.id} ${nm[0]} รอกลั่นกรอง`, `New request ${r.id} ${nm[1]} is waiting for review`], "requests");
    commit(); renderShell(); route(); toast(L("ส่งคำขอให้กองแผนงานแล้ว", "Request sent to Planning"));
  };
};
