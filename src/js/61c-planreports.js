// Fisko Procurement round 20 (Q3 of design v0.2): the plan and the reports. Procurement categories
// (FR-PR-38), plan versions with approval and publication (FR-PR-03, FR-PR-37), demand intake from M06 lines
// and next year's M02 requests (FR-PR-36), the monthly procurement summary in the สขร.1 layout (FR-PR-53, R-18),
// an audit dossier per case (FR-PR-54) and a timeline of every case against the fiscal year (FR-PR-55).
let REP_MONTH = null, DOSSIER_FOR = null;
const PV_ST = { submitted: [["รออนุมัติ", "Waiting for approval"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"] };
const catName = id => { const c = (S.pcat || []).find(x => x.id === id); return c ? tx(c.name) : "—"; };

// ---------- plan versions ----------
const snap = p => ({ id: p.id, name: p.name, est: p.est, month: p.month, method: p.method, cat: p.cat || null, line: p.line });
const planApproved = () => (S.planDoc.versions.filter(v => v.status === "approved").sort((a, b) => b.v - a.v)[0]) || null;
const planPublished = () => (S.planDoc.versions.filter(v => v.status === "approved" && v.published).sort((a, b) => b.v - a.v)[0]) || null;
const inPublishedPlan = p => { const v = planPublished(); return !!v && v.items.some(x => x.id === p.id); };
function planDiff(base, cur) {
  const B = new Map((base ? base.items : []).map(x => [x.id, x])), C = new Map(cur.map(x => [x.id, x]));
  const added = cur.filter(x => !B.has(x.id)), removed = [...B.values()].filter(x => !C.has(x.id));
  const changed = cur.filter(x => B.has(x.id) && ["est", "month", "method", "cat"].some(k => JSON.stringify(B.get(x.id)[k]) !== JSON.stringify(x[k])));
  return { added, removed, changed, n: added.length + removed.length + changed.length };
}
const planTag = p => (inPublishedPlan(p) ? "" : ` ${tag(L("ยังไม่อยู่ในแผนที่ประกาศ", "Not in the published plan"), "p-warn")}`);
function planPanel() {
  const A = planApproved(), Pb = planPublished(), cur = S.pplan.map(snap), d = planDiff(A, cur), pend = S.planDoc.versions.find(v => v.status === "submitted"), pr = isProcRole();
  const row = (x, t, cls) => `<li><span class="mono">${x.id}</span> ${esc(tx(x.name))} ${tag(t, cls)}</li>`;
  return `<section class="panel"><header><h2>${L("ฉบับแผนจัดซื้อและการประกาศ", "Plan versions and publication")}</h2><span class="sp"></span><span class="sub">FR-PR-03 · FR-PR-37</span></header>
    <div class="body" style="display:flex;flex-direction:column;gap:10px">
      <div class="row">${A ? `<span>${L("ฉบับที่อนุมัติล่าสุด", "Latest approved")} <b>v${A.v}</b> ${fdate(A.appr.t)}</span>` : `<span class="sub">${L("ยังไม่มีฉบับที่อนุมัติ", "No approved version")}</span>`}
        ${Pb ? tag(`${L("ประกาศแล้ว", "Published")} ${fdate(Pb.published.date)} · ${esc(Pb.published.ref)}`, "p-ok") : tag(L("ยังไม่ประกาศ", "Not published"), "p-warn")}
        ${A && !A.published && pr ? `<input type="text" id="pv-ref" placeholder="${L("เลขที่ประกาศใน e-GP", "e-GP notice no.")}" style="min-width:160px"><button class="btn primary" type="button" id="pv-pub">${L("บันทึกว่าประกาศแล้ว", "Record as published")}</button>` : ""}</div>
      ${d.n ? `<div><b style="font-weight:600">${L("การเปลี่ยนแปลงที่ยังไม่อยู่ในฉบับที่อนุมัติ", "Changes not yet in the approved version")}</b><ul style="margin:6px 0 0;padding-left:18px">${d.added.map(x => row(x, L("เพิ่ม", "Added"), "p-info")).join("")}${d.changed.map(x => row(x, L("แก้ไข", "Changed"), "p-warn")).join("")}${d.removed.map(x => row(x, L("ตัดออก", "Removed"), "p-bad")).join("")}</ul></div>` : `<span class="sub">${L("แผนตรงกับฉบับที่อนุมัติ", "The plan matches the approved version")}</span>`}
      ${pend ? `<div class="callout" style="margin:0"><b>v${pend.v}</b> ${stTag(PV_ST, pend.status)} <span class="sub">${esc(userName(pend.by))} · ${fdate(pend.t, true)} · ${esc(pend.why)} · ${pend.items.length} ${L("รายการ", "items")} · ${mb(sumv(pend.items.map(x => x.est)))} ${L("ลบ.", "M")}</span>
        ${ROLE === "exec" ? `<div class="row" style="margin-top:6px"><button class="btn primary" type="button" id="pv-ok">${L("อนุมัติแผนฉบับนี้", "Approve this plan")}</button><button class="btn danger" type="button" id="pv-no">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}</div>`
        : d.n && pr ? `<div class="row"><input type="text" id="pv-why" placeholder="${L("เหตุผลที่ปรับแผน", "Why the plan changes")}" style="min-width:240px"><button class="btn" type="button" id="pv-sub">${L("เสนอแผนฉบับใหม่ให้ผู้บริหาร", "Send the new version to the executive")}</button></div>` : ""}
      <div class="sub">${L("ขอซื้อขอจ้างได้เฉพาะรายการที่อยู่ในแผนที่อนุมัติและประกาศแล้ว (ระดับ B ต้องยืนยันข้อยกเว้นตามระเบียบ)", "Requisitions are allowed only for items in the approved and published plan (level B; confirm the exceptions in the rules)")} · ${L("ฉบับทั้งหมด", "All versions")}: ${S.planDoc.versions.map(v => `v${v.v} ${tx(PV_ST[v.status][0])}`).join(" · ")}</div></div></section>`;
}

// ---------- demand intake ----------
function demand() {
  const used = new Set(S.pplan.map(p => p.line));
  const lines = famLines().filter(l => (l.type === "inv" || l.type === "ope") && !used.has(l.id));
  const items = S.requests.filter(r => ["approved", "committee"].includes(r.status)).flatMap(r => (r.items || []).map(it => ({ r, it, amount: it.qty * it.price })));
  const groups = []; items.forEach((x, i) => items.slice(i + 1).forEach(y => { if (x.r.id !== y.r.id && jacc(tx(x.it.name), tx(y.it.name)) >= 0.45) groups.push([x, y]); }));
  return { lines, items, groups };
}
function demandPanel() {
  const d = demand(), pr = isProcRole();
  return `<section class="panel"><header><h2>${L("ความต้องการที่ยังไม่อยู่ในแผน", "Demand not yet in the plan")}</h2><span class="sp"></span><span class="sub">FR-PR-36</span></header>
    <div class="body" style="display:flex;flex-direction:column;gap:10px">
      <div><b style="font-weight:600">${L("รายการจัดสรรปี", "FY")} ${FAM_FY} ${L("ที่ยังไม่มีรายการในแผน (M06)", "allocation lines with nothing in the plan (M06)")}</b>
        ${d.lines.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("รายการจัดสรร", "Allocation line")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th></th></tr></thead><tbody>${d.lines.map(l => `<tr><td>${esc(lineLabel(l))} <span class="mono sub">${l.id}</span></td><td class="n">${mb(l.amount)}</td><td>${pr ? `<button class="btn" type="button" data-dmadd="${l.id}">+ ${L("ร่างรายการในแผน", "Draft a plan item")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="sub">${L("ทุกรายการจัดสรรมีรายการในแผนแล้ว", "Every line already has a plan item")}</div>`}</div>
      <div><b style="font-weight:600">${L("คำของบประมาณปีหน้าที่ผ่านการพิจารณา (M02)", "Next year's reviewed budget requests (M02)")}</b> <span class="sub">${d.items.length} ${L("รายการ ใช้เตรียมแผนปีถัดไป", "items, for next year's plan")}</span>
        ${d.groups.length ? `<ul style="margin:6px 0 0;padding-left:18px">${d.groups.map(([x, y]) => `<li>${L("ควรรวมซื้อ", "Consider buying together")}: ${esc(tx(x.it.name))} (${x.r.id}) + ${esc(tx(y.it.name))} (${y.r.id}) · ${fmt(x.amount + y.amount)} ${L("บาท", "baht")}</li>`).join("")}</ul>` : `<div class="sub">${L("ไม่พบรายการที่ควรรวมซื้อข้ามคำขอ", "No items to combine across requests")}</div>`}</div></div></section>`;
}
{
  const base = PROC.plan;
  PROC.plan = () => planPanel() + base() + demandPanel();
}
function bindPlan2() {
  const done = m => { commit(); renderShell(); route(); if (m) toast(m); };
  const sb = $("#pv-sub"); if (sb) sb.onclick = () => { const why = $("#pv-why").value.trim(); if (why.length < 5) { toast(L("ระบุเหตุผลที่ปรับแผน", "Say why the plan changes")); return; }
    const v = Math.max(...S.planDoc.versions.map(x => x.v)) + 1; S.planDoc.versions.push({ v, t: nowIso(), by: me().id, why, status: "submitted", items: S.pplan.map(snap), appr: null, published: null });
    audit(["เสนอแผนจัดซื้อฉบับใหม่", "Proposed a new procurement plan version"], `v${v}`); notify(["exec"], [`แผนจัดซื้อฉบับ v${v} รออนุมัติ`, `Procurement plan v${v} needs approval`], "prc-plan"); done(L("ส่งผู้บริหารแล้ว", "Sent to the executive")); };
  const dec = ok => { const v = S.planDoc.versions.find(x => x.status === "submitted"); v.status = ok ? "approved" : "rejected"; v.appr = { by: me().id, t: nowIso() };
    audit([ok ? "อนุมัติแผนจัดซื้อ" : "ไม่อนุมัติแผนจัดซื้อ", ok ? "Approved the procurement plan" : "Rejected the procurement plan"], `v${v.v}`); notify(["proc", "prochead"], [`แผนจัดซื้อ v${v.v} ${ok ? "อนุมัติแล้ว ประกาศใน e-GP ได้" : "ไม่ได้รับอนุมัติ"}`, `Plan v${v.v} ${ok ? "approved; publish it in e-GP" : "was rejected"}`], "prc-plan"); done(); };
  const ok = $("#pv-ok"); if (ok) ok.onclick = () => dec(true);
  const no = $("#pv-no"); if (no) no.onclick = () => dec(false);
  const pb = $("#pv-pub"); if (pb) pb.onclick = () => { const ref = $("#pv-ref").value.trim(); if (ref.length < 3) { toast(L("ใส่เลขที่ประกาศ", "Enter the notice number")); return; }
    const A = planApproved(); A.published = { date: TODAY, ref, by: me().id }; audit(["บันทึกการประกาศแผนจัดซื้อ", "Recorded the plan publication"], `v${A.v} ${ref}`); done(L("บันทึกแล้ว ขอซื้อรายการในฉบับนี้ได้", "Recorded; items in this version can now be requisitioned")); };
  $$("[data-dmadd]").forEach(b => (b.onclick = () => { const l = famLine(b.dataset.dmadd), est = Math.max(1e5, Math.round(l.amount * 0.5 / 1e5) * 1e5), kind = guessKind(l, l.name);
    const p = { id: nextId("PP", S.pplan), line: l.id, name: l.name, est, method: est <= S.pcfg.specificMax ? "specific" : "ebid", month: addDays(TODAY, 60), by: me().id, status: "planned", egp: null, kind, cat: guessCat(kind, l.name) };
    S.pplan.push(p); caseNew(p); audit(["ร่างรายการในแผนจากรายการจัดสรร", "Drafted a plan item from an allocation line"], `${p.id} ${l.id}`); done(L("เพิ่มในแผนแล้ว ต้องเสนอแผนฉบับใหม่ก่อนขอซื้อ", "Added; propose a new plan version before requisitioning")); }));
}

// ---------- categories ----------
function guessCat(kind, name) {
  const t = (Array.isArray(name) ? name.join(" ") : String(name)).toLowerCase();
  if (kind === "construction") return /ถนน|เขื่อน|ตลิ่ง|road|embank|civil/.test(t) ? "C05" : "C04";
  if (/ระบบ|สารสนเทศ|ดิจิทัล|คอมพิวเตอร์|system|digital|it\b|software/.test(t)) return kind === "goods" ? "C01" : "C02";
  if (/อบรม|พัฒนาบุคลากร|training|capacity|personnel/.test(t)) return "C03";
  if (/ยานพาหนะ|รถ|vehicle/.test(t)) return "C06";
  if (/ที่ปรึกษา|ออกแบบ|consult|design/.test(t)) return "C08";
  return kind === "goods" ? "C07" : "C02";
}
ADMIN.procrules = (base => () => base() + `<section class="panel"><header><h2>${L("หมวดพัสดุ", "Procurement categories")}</h2><span class="sp"></span><span class="sub">FR-PR-38</span></header>
  <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "ID")}</th><th>${L("หมวด", "Category")}</th><th>${L("ชนิดงาน", "Kind")}</th><th class="n">${L("รายการในแผน", "Plan items")}</th></tr></thead><tbody>${S.pcat.map(c => `<tr><td class="mono">${c.id}</td><td>${tx(c.name)}</td><td class="sub">${tx(KINDS[c.kind])}</td><td class="n">${S.pplan.filter(p => p.cat === c.id).length}</td></tr>`).join("")}</tbody></table></div>
  ${isAdmin() ? `<div class="body"><form class="inline-form" id="pcat-form"><div class="f" style="flex:2 1 220px"><label for="pcat-n">${L("ชื่อหมวด", "Category name")}</label><input type="text" id="pcat-n" required></div><div class="f" style="flex:0 1 180px"><label for="pcat-k">${L("ชนิดงาน", "Kind")}</label><select id="pcat-k">${Object.keys(KINDS).map(k => `<option value="${k}">${tx(KINDS[k])}</option>`).join("")}</select></div><button class="btn" type="submit">+ ${L("เพิ่ม", "Add")}</button></form></div>` : ""}</section>`)(ADMIN.procrules);
BIND_ADMIN.procrules = (base => () => { base(); const f = $("#pcat-form"); if (f) f.onsubmit = e => { e.preventDefault(); const n = $("#pcat-n").value.trim(); S.pcat.push({ id: "C" + String(S.pcat.length + 1).padStart(2, "0"), name: [n, n], kind: $("#pcat-k").value }); audit(["เพิ่มหมวดพัสดุ", "Added a procurement category"], n); commit(); route(); toast(L("เพิ่มแล้ว", "Added")); }; })(BIND_ADMIN.procrules);

// ---------- monthly report (สขร.1 layout) ----------
const awardMonth = c => (c.award ? c.award.date.slice(0, 7) : null);
function repRows(month) {
  return S.cases.filter(c => !c.cancelled && awardMonth(c) === month).map((c, i) => {
    const p = famPlan(c.plan), rq = caseReq(c), con = caseCon(c), comp = needsCompetition(c);
    const offers = comp ? (c.bids || []).map(b => `${b.name} ${fmt(b.price)}`) : c.quotes.map(q => `${tx(q.vendor)} ${fmt(q.price)}`);
    const miss = []; if (!c.ref) miss.push(L("ราคากลาง", "reference price")); if (!offers.length) miss.push(L("ผู้เสนอราคา", "offers")); if (!c.award.minutes && comp) miss.push(L("เหตุผลที่คัดเลือก", "reason"));
    return { no: i + 1, id: c.id, item: tx(p.name), budget: rq ? rq.amount : p.est, ref: c.ref ? c.ref.amount : null, method: tx(PMETHOD[c.method]), offers, winner: `${tx(c.award.winner)} ${fmt(c.award.price)}`,
      why: comp ? (c.award.minutes || (c.criteria && c.criteria.length > 1 ? L("คะแนนรวมสูงสุดตามเกณฑ์ที่ประกาศ", "highest total under the published criteria") : L("ราคาต่ำสุดและผ่านคุณสมบัติ", "lowest price meeting the requirements"))) : L("ราคาต่ำสุดและผ่านคุณสมบัติ", "lowest price meeting the requirements"),
      contract: con ? `${con.no} ${fdate(con.signed)}` : L("อยู่ระหว่างทำสัญญา", "contract pending"), miss };
  });
}
const repMonths = () => [...new Set(S.cases.filter(c => c.award).map(awardMonth).concat([TODAY.slice(0, 7)]))].sort().reverse();
const monthLabel = m => { const [y, mo] = m.split("-").map(Number); return LANG === "en" ? new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) : `${["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"][mo - 1]} ${y + 543}`; };
PROC.reports = () => {
  const ms = repMonths(); if (!REP_MONTH || !ms.includes(REP_MONTH)) REP_MONTH = ms[0];
  const rows = repRows(REP_MONTH), pub = S.monthly.find(x => x.month === REP_MONTH), bad = rows.filter(r => r.miss.length), head = ROLE === "prochead";
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("สรุปผลการจัดซื้อจัดจ้างรายเดือน (แบบ สขร.1)", "Monthly procurement summary (สขร.1 layout)")}</b><p>${L("สร้างจากแฟ้มที่ประกาศผู้ชนะในเดือน ตรวจช่องที่ขาดก่อนเผยแพร่ และเก็บฉบับที่เผยแพร่ไว้ (R-18) คอลัมน์ตามแบบที่ใช้ทั่วไป ระดับ B ต้องยืนยันแบบที่หน่วยงานใช้จริง (D-P13)", "Built from cases with a winner announced that month. Gaps are checked before publishing and the published copy is kept (R-18). Columns follow the common layout; level B, confirm the agency's actual form (D-P13).")}</p></div></div>
  <section class="panel"><header><h2>${L("เดือน", "Month")}</h2><span class="sp"></span><select id="rep-m" aria-label="${L("เดือน", "Month")}">${ms.map(m => `<option value="${m}" ${m === REP_MONTH ? "selected" : ""}>${monthLabel(m)}</option>`).join("")}</select>
      ${pub ? tag(`${L("เผยแพร่แล้ว", "Published")} ${fdate(pub.t)} · ${esc(userName(pub.by))}`, "p-ok") : tag(L("ยังไม่เผยแพร่", "Not published"), "p-warn")}</header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ลำดับ", "No.")}</th><th>${L("งานที่จัดซื้อจัดจ้าง", "Item")}</th><th class="n">${L("วงเงิน", "Budget")}</th><th class="n">${L("ราคากลาง", "Reference")}</th><th>${L("วิธี", "Method")}</th><th>${L("ผู้เสนอราคาและราคาที่เสนอ", "Offers")}</th><th>${L("ผู้ได้รับคัดเลือกและราคาที่ตกลง", "Selected and agreed price")}</th><th>${L("เหตุผลที่คัดเลือก", "Why selected")}</th><th>${L("เลขที่และวันที่สัญญา", "Contract no. and date")}</th></tr></thead>
      <tbody>${(pub ? pub.rows : rows).map(r => `<tr><td>${r.no}</td><td>${esc(r.item)} <span class="mono sub">${r.id}</span>${r.miss && r.miss.length && !pub ? `<div>${tag(`${L("ขาด", "Missing")}: ${r.miss.join(", ")}`, "p-bad")}</div>` : ""}</td><td class="n">${fmt(r.budget)}</td><td class="n">${r.ref == null ? "—" : fmt(r.ref)}</td><td class="sub">${esc(r.method)}</td><td class="sub">${r.offers.map(esc).join("<br>") || "—"}</td><td>${esc(r.winner)}</td><td class="sub">${esc(r.why)}</td><td class="sub">${esc(r.contract)}</td></tr>`).join("") || `<tr><td colspan="9" class="sub">${L("ไม่มีการจัดซื้อจัดจ้างในเดือนนี้", "No procurement this month")}</td></tr>`}</tbody></table></div>
    <div class="body row">${!pub && rows.length && head ? `<button class="btn primary" type="button" id="rep-pub" ${bad.length ? "disabled" : ""}>${L("เผยแพร่รายงานเดือนนี้", "Publish this month's report")}</button>` : ""}${!pub && rows.length && !head ? `<span class="sub">${L("หัวหน้าพัสดุเป็นผู้เผยแพร่", "The head of procurement publishes it")}</span>` : ""}${bad.length && !pub ? `<span class="sub">${L("แก้ช่องที่ขาดก่อนเผยแพร่", "Fill the gaps before publishing")}</span>` : ""}
      ${rows.length || pub ? `<button class="btn" type="button" id="rep-copy">${L("คัดลอกเป็นตาราง", "Copy as a table")}</button>` : ""}</div></section>`;
};
function bindReports() {
  const s = $("#rep-m"); if (s) s.onchange = () => { REP_MONTH = s.value; route(); };
  const p = $("#rep-pub"); if (p) p.onclick = () => { const rows = repRows(REP_MONTH); S.monthly.push({ month: REP_MONTH, rows: rows.map(r => ({ ...r, miss: [] })), by: me().id, t: nowIso() }); audit(["เผยแพร่รายงานสรุปผลรายเดือน", "Published the monthly procurement summary"], REP_MONTH); commit(); renderShell(); route(); toast(L("เผยแพร่แล้ว", "Published")); };
  const c = $("#rep-copy"); if (c) c.onclick = () => { const pub = S.monthly.find(x => x.month === REP_MONTH), rows = pub ? pub.rows : repRows(REP_MONTH);
    const tsv = [["ลำดับ", "งานที่จัดซื้อจัดจ้าง", "วงเงิน", "ราคากลาง", "วิธี", "ผู้เสนอราคาและราคาที่เสนอ", "ผู้ได้รับคัดเลือกและราคาที่ตกลง", "เหตุผล", "สัญญา"].join("\t"), ...rows.map(r => [r.no, r.item, r.budget, r.ref == null ? "" : r.ref, r.method, r.offers.join("; "), r.winner, r.why, r.contract].join("\t"))].join("\n");
    try { navigator.clipboard.writeText(tsv).then(() => toast(L("คัดลอกแล้ว วางใน Excel ได้", "Copied; paste into Excel")), () => toast(L("คัดลอกไม่ได้ในหน้านี้", "Copy isn't available here"))); } catch (e) { toast(L("คัดลอกไม่ได้ในหน้านี้", "Copy isn't available here")); } };
}

// ---------- audit dossier per case ----------
function dossierText(c) {
  const p = famPlan(c.plan), rq = caseReq(c), con = caseCon(c), L2 = [], add = (h, ...xs) => { L2.push(`■ ${h}`); xs.filter(Boolean).forEach(x => L2.push(`  ${x}`)); };
  add(`${c.id} · ${tx(p.name)}`, `${L("แผน", "Plan")} ${p.id} · ${L("หมวด", "Category")} ${catName(p.cat)} · ${L("รายการจัดสรร", "Line")} ${c.line}`, `${L("ขั้นปัจจุบัน", "Current step")}: ${caseState(c)}/12${c.cancelled ? " · " + L("ยกเลิก", "cancelled") + ": " + c.cancelled.why : ""}`);
  if (rq) add(L("ใบขอซื้อขอจ้าง", "Requisition"), `${rq.id} · ${fmt(rq.amount)} · ${userName(rq.by)} · ${fdate(rq.t, true)}`, rq.decided ? `${L("อนุมัติ", "Decided")}: ${userName(rq.decided.by)}${rq.decided.via ? ` (${L("แทน", "for")} ${userName(rq.decided.holder)}, ${rq.decided.via})` : ""} · ${fdate(rq.decided.t, true)}` : "", rq.splitWhy ? `${L("คำชี้แจงแตกซื้อ", "Split explanation")}: ${rq.splitWhy}` : "");
  if (c.method) add(L("วิธีจัดซื้อ", "Method"), `${tx(PMETHOD[c.method])} · ${tx(c.methodWhy || ["", ""])}`, c.methodApproval ? `${L("การอนุมัติวิธี", "Method approval")}: ${c.methodApproval.status} · ${userName(c.methodApproval.by)}` : "");
  if (c.ref) add(L("ราคากลาง", "Reference price"), `${fmt(c.ref.amount)} · ${c.ref.basis.map(b => tx(BASIS[b])).join(", ")}`, (c.market || []).length ? `${L("สำรวจตลาด", "Market research")} ${c.market.length} ${L("ราย", "entries")}` : "");
  Object.keys(c.committees).forEach(k => { const cm = c.committees[k]; if (!cm) return; add(tx(COMMITTEES[k]), `${cm.order} · ${fdate(cm.date)}`, ...committeeMembers(cm).map(u => { const d = ((c.coi || {})[k] || {})[u]; return `${userName(u)}${u === cm.chair ? ` (${L("ประธาน", "chair")})` : ""} · ${d ? (d.conflict ? L("มีส่วนได้เสีย", "conflict") + " " + d.with : L("ไม่มีส่วนได้เสีย", "no conflict")) : L("ยังไม่แจ้ง", "not declared")}`; })); });
  if (c.egp) add("e-GP", `${c.egp.no} · ${fdate(c.egp.announce)} – ${fdate(c.egp.close)} · ${L("ผู้ยื่น", "bidders")} ${c.egp.bidders == null ? "—" : c.egp.bidders}`, ...(c.qa || []).map(q => `Q&A: ${q.q} → ${q.a}`));
  if (c.bids && c.bids.length) add(L("ผู้ยื่นและคะแนนรวม", "Bidders and totals"), ...totals(c).map(t => `${t.name} · ${fmt(t.price)} · ${t.total == null ? "—" : fmt(t.total, 2)}`));
  if (c.award) add(L("ผลการพิจารณา", "Award"), `${tx(c.award.winner)} · ${fmt(c.award.price)} · ${fdate(c.award.date)}`, c.award.minutes ? `${L("มติ", "Resolution")}: ${c.award.minutes}` : "", c.award.why ? `${L("เหตุผล", "Reason")}: ${c.award.why}` : "", c.appeal ? `${L("อุทธรณ์", "Appeal")}: ${c.appeal.status}` : "", c.blOverride ? `${L("ปลดรายชื่อผู้ทิ้งงาน", "Abandoned-work release")}: ${c.blOverride.note}` : "");
  if (con) { add(L("สัญญา", "Contract"), `${con.id} · ${con.no} · ${fdate(con.signed)} · ${fmt(con.amount)} (v${con.ver || 1})${con.status === "terminated" ? " · " + L("บอกเลิก", "terminated") : ""}`, `${L("กรรมการตรวจรับ", "Acceptance committee")}: ${con.inspectors.map(userName).join(", ")}`, con.guarantee ? `${L("หลักประกัน", "Guarantee")}: ${fmt(con.guarantee.amount)} · ${con.guarantee.status}` : "", ...(con.vars || []).map(v => `${L("แก้ไขสัญญา", "Change")} ${v.id}: ${v.status}`));
    add(L("งวดงาน", "Phases"), ...con.phases.map(ph => `${tx(ph.name)} · ${fmt(ph.amount)} · ${L("ส่งมอบ", "delivered")} ${ph.delivered ? fdate(ph.delivered) : "—"} · ${L("ตรวจรับ", "accepted")} ${ph.signs.map(s => userName(s.by)).join(", ") || "—"}${ph.result === "partial" ? ` (${L("บางส่วน", "partly")} ${fmt(ph.okAmount)})` : ""} · ${L("ค่าปรับ", "penalty")} ${fmt(phPenalty(con, ph))}${ph.cancelled ? " · " + L("ยกเลิก", "cancelled") : ""}`));
    add(L("การเบิกจ่าย", "Payments"), ...S.payreqs.filter(x => x.contract === con.id).map(x => `${x.id} · ${L("งวด", "phase")} ${x.phase} · ${fmt(x.amount)} · ${x.status}${x.decided ? " · " + userName(x.decided.by) : ""}`));
    if ((con.letters || []).length) add(L("หนังสือถึงผู้ขาย", "Letters"), ...con.letters.map(l => `${l.id} ${tx(LETTER_T[l.type])} · ${l.sent ? L("ส่ง", "sent") + " " + fdate(l.sent) : L("ยังไม่ส่ง", "not sent")}`)); }
  const fl = detectFlags().filter(f => f.ref.includes(c.id) || (con && f.ref.includes(con.id)));
  if (fl.length) add(L("สัญญาณเตือน", "Red flags"), ...fl.map(f => `${f.rf} · ${tx(f.ev)} · ${tx(RF_ST[rfRev(f.key).status][0])}`));
  add(L("ไทม์ไลน์", "Timeline"), ...S.caseEvents.filter(e => e.case === c.id).slice().reverse().map(e => `${fdate(e.t, true)} · ${tx(CASE_EV[e.type] || [e.type, e.type])} · ${userName(e.by)}${e.detail ? " · " + e.detail : ""}`));
  return L2.join("\n");
}
CASE_PANELS.push(c => {
  if (!(ROLE === "audit" || isProcRole())) return "";
  return `<section class="panel"><header><h2>${L("ชุดเอกสารสำหรับผู้ตรวจสอบ", "Audit dossier")}</h2><span class="sp"></span><span class="sub">FR-PR-54</span><button class="btn" type="button" id="dos-gen">${DOSSIER_FOR === c.id ? L("ซ่อน", "Hide") : L("รวบรวม", "Compile")}</button></header>
    ${DOSSIER_FOR === c.id ? `<div class="body"><pre id="dos-pre" style="margin:0;white-space:pre-wrap;font-family:var(--font);font-size:12.5px;line-height:1.6">${esc(dossierText(c))}</pre><div class="row" style="margin-top:8px"><button class="btn" type="button" id="dos-copy">${L("คัดลอก", "Copy")}</button><span class="sub">${L("รวมทุกขั้นจากข้อมูลในระบบ ไม่ใช่เอกสารต้นฉบับ", "Compiled from the system's records; not the original documents")}</span></div></div>` : ""}</section>`;
});
CASE_BINDS.push(c => {
  const g = $("#dos-gen"); if (g) g.onclick = () => { DOSSIER_FOR = DOSSIER_FOR === c.id ? null : c.id; if (DOSSIER_FOR) audit(["รวบรวมชุดเอกสารสำหรับผู้ตรวจสอบ", "Compiled an audit dossier"], c.id); commit(); route(); };
  const cp = $("#dos-copy"); if (cp) cp.onclick = () => { try { navigator.clipboard.writeText(dossierText(c)).then(() => toast(L("คัดลอกแล้ว", "Copied")), () => toast(L("คัดลอกไม่ได้ในหน้านี้", "Copy isn't available here"))); } catch (e) { toast(L("คัดลอกไม่ได้ในหน้านี้", "Copy isn't available here")); } };
});

// ---------- timeline of all cases (Gantt) ----------
PROC.gantt = () => {
  const start = "2026-07-01", end = "2027-09-30", span = dayDiff(start, end), x = d => Math.max(0, Math.min(100, dayDiff(start, d) / span * 100));
  const months = []; for (let m = 0; m < 15; m++) months.push(addMonths(start, m));
  const bar = (a, b, color, title) => (a && b && b >= a ? `<span title="${esc(title)}" style="position:absolute;top:8px;height:14px;left:${x(a)}%;width:${Math.max(0.6, x(b) - x(a))}%;background:${color};border-radius:4px"></span>` : "");
  const rows = S.cases.map(c => {
    const p = famPlan(c.plan), created = (S.caseEvents.filter(e => e.case === c.id && e.type === "created")[0] || { t: TODAY }).t.slice(0, 10), con = caseCon(c);
    const srcStart = c.egp && c.egp.announce ? c.egp.announce : null, awd = c.award ? c.award.date : null, prepEnd = srcStart || awd || TODAY;
    const live = !c.cancelled;
    return `<div style="display:grid;grid-template-columns:200px 1fr;gap:10px;align-items:center;border-top:1px solid var(--line);padding:4px 0">
      <div style="min-width:0"><button class="btn ghost" type="button" data-gopen="${c.id}" style="padding:2px 6px"><span class="mono">${c.id}</span></button><div class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(tx(p.name))}</div></div>
      <div style="position:relative;height:30px;background:var(--surface-2);border-radius:6px">
        ${live ? bar(created, prepEnd, "var(--info)", L("เตรียมการ", "Preparation")) + bar(srcStart, awd || TODAY, "var(--warn)", L("ดำเนินการใน e-GP และพิจารณาผล", "Sourcing and evaluation")) + (con ? bar(con.signed, conEnd(con), "var(--accent)", L("ช่วงสัญญา", "Contract period")) : "") : bar(created, TODAY, "var(--muted)", L("ยกเลิก", "Cancelled"))}
        ${live ? fcMarker(c, x) : ""}
        <span title="${L("เดือนที่กำหนดในแผน", "Planned month")}" style="position:absolute;top:2px;bottom:2px;left:${x(p.month)}%;width:2px;background:var(--ink)"></span></div></div>`;
  }).join("");
  return `<section class="panel"><header><h2>${L("ไทม์ไลน์แฟ้มทั้งหมด", "All cases on a timeline")}</h2><span class="sp"></span><span class="sub">FR-PR-55</span></header>
    <div class="body row" style="gap:14px"><span class="row" style="gap:6px"><span style="width:14px;height:10px;background:var(--info);border-radius:3px;display:inline-block"></span>${L("เตรียมการ", "Preparation")}</span><span class="row" style="gap:6px"><span style="width:14px;height:10px;background:var(--warn);border-radius:3px;display:inline-block"></span>${L("e-GP และพิจารณาผล", "Sourcing and evaluation")}</span><span class="row" style="gap:6px"><span style="width:14px;height:10px;background:var(--accent);border-radius:3px;display:inline-block"></span>${L("ช่วงสัญญา", "Contract period")}</span><span class="row" style="gap:6px"><span style="width:2px;height:12px;background:var(--ink);display:inline-block"></span>${L("เดือนในแผน", "Planned month")}</span><span class="row" style="gap:6px"><span style="width:2px;height:12px;background:var(--bad);display:inline-block"></span>${L("วันนี้", "Today")}</span></div>
    <div class="tbl-wrap"><div style="min-width:760px;padding:0 16px 12px">
      <div style="display:grid;grid-template-columns:200px 1fr;gap:10px"><div></div><div style="position:relative;height:22px">${months.map(m => `<span class="sub" style="position:absolute;left:${x(m)}%;font-size:11px">${monthLabel(m.slice(0, 7)).split(" ")[0].slice(0, LANG === "en" ? 3 : 4)}</span>`).join("")}</div></div>
      <div style="position:relative">${rows}
        <span style="position:absolute;top:0;bottom:0;left:calc(210px + (100% - 210px) * ${x(TODAY) / 100});width:2px;background:var(--bad)"></span>
        <span style="position:absolute;top:0;bottom:0;left:calc(210px + (100% - 210px) * ${x("2026-10-01") / 100});width:1px;background:var(--line);border-left:1px dashed var(--muted)" title="${L("เริ่มปีงบประมาณ", "Fiscal year starts")}"></span></div>
    </div></div>
    <div class="body sub">${L("รูปข้าวหลามตัด = วันที่คาดว่าลงนาม (ค่ากลาง) เส้นจาง = ช่วง P10 ถึง P90 จากพยากรณ์ F-02", "Diamond = expected signing date (median); faint line = P10 to P90 from forecast F-02")}</div></section>`;
};
function bindGantt() { $$("[data-gopen]").forEach(b => (b.onclick = () => { CASE_OPEN = b.dataset.gopen; PROC_TAB = "cases"; route(); })); }

{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "plan") bindPlan2(); if (PROC_TAB === "reports") bindReports(); if (PROC_TAB === "gantt") bindGantt(); };
}
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.planDoc) return;
    const sub = S.planDoc.versions.find(v => v.status === "submitted"), A = planApproved();
    if (sub && ROLE === "exec") R(`${L("อนุมัติแผนจัดซื้อ", "Approve the procurement plan")} v${sub.v}`, sub.why, TODAY, "prc-plan", "p-warn");
    if (A && !A.published && isProcRole()) R(`${L("ประกาศแผนจัดซื้อ", "Publish the procurement plan")} v${A.v}`, L("บันทึกเลขที่ประกาศใน e-GP", "record the e-GP notice"), TODAY, "prc-plan", "p-warn");
    const prev = addMonths(TODAY.slice(0, 7) + "-01", -1).slice(0, 7);
    if (ROLE === "prochead" && repRows(prev).length && !S.monthly.some(m => m.month === prev)) R(`${L("เผยแพร่รายงานสรุปผลเดือน", "Publish the monthly summary for")} ${monthLabel(prev)}`, "", TODAY, "prc-reports", "p-warn");
  };
}

// ---------- seed ----------
function seedPlanReports(s, K) {
  const C = (id, th, en, kind) => ({ id, name: [th, en], kind });
  s.pcat = [C("C01", "ครุภัณฑ์คอมพิวเตอร์และอุปกรณ์", "Computers and equipment", "goods"), C("C02", "บริการและระบบสารสนเทศ", "Services and information systems", "service"), C("C03", "ฝึกอบรมและพัฒนาบุคลากร", "Training", "service"),
    C("C04", "ก่อสร้างและปรับปรุงอาคาร", "Building works", "construction"), C("C05", "งานโยธา ถนน และเขื่อน", "Civil works", "construction"), C("C06", "ยานพาหนะ", "Vehicles", "goods"), C("C07", "วัสดุสำนักงาน", "Office supplies", "goods"), C("C08", "ที่ปรึกษาและออกแบบ", "Consulting and design", "consult")];
  s.pplan.forEach(p => (p.cat = guessCat(p.kind, p.name)));
  s.planDoc = { fy: FAM_FY, versions: [{ v: 1, t: "2026-09-25T10:00", by: K.PO, why: "แผนจัดซื้อจัดจ้างประจำปีงบประมาณ 2570", status: "approved", items: s.pplan.map(snap), appr: { by: K.EX, t: "2026-09-30T15:00" }, published: { date: "2026-10-01", ref: "EGP-PLAN-70-0001", by: K.PO } }] };
  s.monthly = [];
}
