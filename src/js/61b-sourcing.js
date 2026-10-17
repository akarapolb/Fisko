// Fisko Procurement round 18 (Q1 of design v0.2): sourcing in depth. TOR library with versions and approval
// (FR-PR-39), market research log (FR-PR-40), conflict-of-interest declarations with rule SD-07 (FR-PR-41, R-13),
// the evaluation matrix where committee members enter their own scores and the system only adds them up
// (FR-PR-42, R-14), Q&A during the announcement (FR-PR-43), an e-GP data pack (FR-PR-44) and status sync with
// the e-GP file (FR-PR-45, R-19). Plugs into the case page through CASE_PANELS and CASE_BINDS (61-cases.js).
let TOR_OPEN = null, PACK_FOR = null;
Object.assign(BASIS, { market: ["การสำรวจตลาด", "Market research"] });
Object.assign(CASE_EV, { coi: ["แจ้งผลประโยชน์ทับซ้อน", "Conflict-of-interest declaration"], coi_swap: ["เปลี่ยนกรรมการที่มีส่วนได้เสีย", "Replaced a conflicted member"], criteria: ["กำหนดเกณฑ์พิจารณา", "Evaluation criteria set"],
  bid: ["บันทึกผู้ยื่นข้อเสนอ", "Bidder recorded"], score: ["บันทึกคะแนนของกรรมการ", "Committee member scores"], market: ["บันทึกการสำรวจตลาด", "Market research entry"], qa: ["บันทึกคำถามคำตอบ", "Q&A recorded"], amend: ["แก้ไขประกาศ", "Announcement amended"] });
const CRIT_PRESET = {
  lowest: [{ k: "price", name: ["ราคา", "Price"], w: 100 }],
  pp: [{ k: "price", name: ["ราคา", "Price"], w: 70 }, { k: "quality", name: ["คุณภาพและคุณสมบัติ", "Quality and specification"], w: 20 }, { k: "delivery", name: ["ระยะเวลาส่งมอบ", "Delivery time"], w: 10 }],
};
const MR_SRC = { phone: ["โทรสอบถาม", "Phone"], web: ["เว็บไซต์ผู้ขาย", "Supplier website"], catalog: ["แคตตาล็อกหรือ e-market", "Catalogue or e-market"], visit: ["ผู้ขายเสนอเป็นลายลักษณ์อักษร", "Written offer"] };
const EGP_RANK = { "Invitation": 5, "Winner announced": 7, "Contract signed": 9 };

// ---------- TOR library ----------
const torLatest = t => t.versions.filter(v => v.status === "approved").sort((a, b) => b.v - a.v)[0];
function torTpl(id) { const t = S.torLib.find(x => x.id === id); const v = t && torLatest(t); return v ? { id: t.id, v: v.v, text: v.text } : null; }
function torPicker(c) {
  const list = S.torLib.filter(t => torLatest(t)).sort((a, b) => (a.kind === c.kind ? -1 : 0) - (b.kind === c.kind ? -1 : 0));
  return `<span class="row" style="display:inline-flex"><select id="tor-tpl" aria-label="${L("แม่แบบ TOR", "TOR template")}">${list.map(t => `<option value="${t.id}">${t.id} · ${esc(tx(t.name))} v${torLatest(t).v}${t.kind === c.kind ? " ★" : ""}</option>`).join("")}</select><button class="btn" type="button" id="tor-attach">+ ${L("สร้าง TOR จากแม่แบบ", "Create the TOR from the template")}</button></span>`;
}
PROC.tor = () => {
  const head = ROLE === "prochead", pr = isProcRole(), T = S.torLib, open = T.find(t => t.id === TOR_OPEN);
  return `
  <section class="panel"><header><h2>${L("คลัง TOR และแม่แบบ", "TOR library")}</h2><span class="sp"></span><span class="sub">${L("เจ้าหน้าที่พัสดุเสนอฉบับใหม่ หัวหน้าพัสดุอนุมัติ แฟ้มใช้ฉบับที่อนุมัติล่าสุด", "Officers propose a new version, the head approves it, and cases use the latest approved version")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "ID")}</th><th>${L("แม่แบบ", "Template")}</th><th>${L("ชนิดงาน", "Kind")}</th><th>${L("ฉบับใช้งาน", "In use")}</th><th>${L("รออนุมัติ", "Pending")}</th><th>${L("ใช้ในแฟ้ม", "Used by")}</th><th></th></tr></thead>
      <tbody>${T.map(t => { const lv = torLatest(t), pend = t.versions.filter(v => v.status === "draft"), used = S.cases.filter(c => c.tor && c.tor.tpl === t.id).map(c => c.id);
        return `<tr><td class="mono">${t.id}</td><td>${esc(tx(t.name))}</td><td class="sub">${tx(KINDS[t.kind])}</td><td>${lv ? `v${lv.v} <span class="sub">${fdate(lv.appr.t)}</span>` : "—"}</td><td>${pend.length ? tag(`v${pend.map(v => v.v).join(", v")}`, "p-warn") : "—"}</td><td class="sub">${used.join(", ") || "—"}</td>
          <td><button class="btn" type="button" data-toropen="${t.id}">${TOR_OPEN === t.id ? L("ปิด", "Close") : L("เปิด", "Open")}</button></td></tr>`; }).join("")}</tbody></table></div></section>
  ${open ? `<section class="panel"><header><h2><span class="mono">${open.id}</span> · ${esc(tx(open.name))}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:12px">
    ${open.versions.slice().reverse().map(v => `<div class="callout" style="margin:0"><b>v${v.v}</b> ${tag(v.status === "approved" ? L("อนุมัติแล้ว", "Approved") : L("รออนุมัติ", "Pending"), v.status === "approved" ? "p-ok" : "p-warn")} <span class="sub">${esc(userName(v.by))} · ${fdate(v.t, true)}${v.appr ? ` · ${L("อนุมัติโดย", "approved by")} ${esc(userName(v.appr.by))}` : ""}${v.why ? ` · ${esc(v.why)}` : ""}</span>
      <pre style="margin:8px 0 0;white-space:pre-wrap;font-family:var(--font);font-size:13px">${esc(v.text)}</pre>
      ${head && v.status === "draft" ? `<div class="row" style="margin-top:8px"><button class="btn primary" type="button" data-torok="${open.id}|${v.v}">${L("อนุมัติฉบับนี้", "Approve this version")}</button></div>` : ""}</div>`).join("")}
    ${pr && !open.versions.some(v => v.status === "draft") ? `<form id="tor-new" style="display:flex;flex-direction:column;gap:8px"><label for="tor-text">${L("เสนอฉบับใหม่", "Propose a new version")}</label><textarea id="tor-text" rows="7">${esc(torLatest(open) ? torLatest(open).text : "")}</textarea><input type="text" id="tor-why" placeholder="${L("เหตุผลที่แก้", "Why it changed")}" aria-label="${L("เหตุผลที่แก้", "Why it changed")}"><div><button class="btn" type="submit">${L("ส่งให้หัวหน้าพัสดุอนุมัติ", "Send to the head for approval")}</button></div></form>` : ""}</div></section>` : ""}`;
};
function bindTor() {
  const done = m => { commit(); renderShell(); route(); if (m) toast(m); };
  $$("[data-toropen]").forEach(b => (b.onclick = () => { TOR_OPEN = TOR_OPEN === b.dataset.toropen ? null : b.dataset.toropen; route(); }));
  const f = $("#tor-new"); if (f) f.onsubmit = e => { e.preventDefault(); const t = S.torLib.find(x => x.id === TOR_OPEN), why = $("#tor-why").value.trim(); if (why.length < 5) { toast(L("ระบุเหตุผลที่แก้", "Say why it changed")); return; }
    const v = Math.max(...t.versions.map(x => x.v)) + 1; t.versions.push({ v, text: $("#tor-text").value, status: "draft", by: me().id, t: nowIso(), why, appr: null });
    audit(["เสนอแม่แบบ TOR ฉบับใหม่", "Proposed a new TOR template version"], `${t.id} v${v}`); notify(["prochead"], [`แม่แบบ ${t.id} ฉบับ v${v} รออนุมัติ`, `Template ${t.id} v${v} needs approval`], "prc-tor"); done(L("ส่งให้หัวหน้าพัสดุแล้ว", "Sent to the head")); };
  $$("[data-torok]").forEach(b => (b.onclick = () => { const [id, v] = b.dataset.torok.split("|"), t = S.torLib.find(x => x.id === id), ver = t.versions.find(x => x.v === Number(v));
    if (ver.by === me().id) { toast(L("ผู้เสนอฉบับนี้อนุมัติเองไม่ได้", "Whoever proposed it can't approve it")); return; }
    ver.status = "approved"; ver.appr = { by: me().id, t: nowIso() }; audit(["อนุมัติแม่แบบ TOR", "Approved a TOR template"], `${id} v${v}`); done(L("อนุมัติแล้ว แฟ้มใหม่จะใช้ฉบับนี้", "Approved; new cases use this version")); }));
}

// ---------- conflict of interest (SD-07), criteria, bids and scores ----------
const coiOf = (c, key, uid) => ((c.coi || {})[key] || {})[uid];
const coiOk = (c, key) => { const cm = c.committees[key]; if (!cm) return false; return committeeMembers(cm).every(u => { const d = coiOf(c, key, u); return d && (!d.conflict || !sodOn("SD-07")); }); };
const critOk = c => c.criteria && c.criteria.length && sumv(c.criteria.map(x => x.w)) === 100 && c.criteria.some(x => x.k === "price");
const nonPrice = c => (c.criteria || []).filter(x => x.k !== "price");
const bidsOk = c => c.bids && c.egp && c.egp.bidders != null && c.bids.length === c.egp.bidders && c.bids.every(b => b.price > 0);
const evalMembers = c => committeeMembers(c.committees[evalKey(c)]);
const scored = (c, uid) => c.bids.every((b, i) => nonPrice(c).every(k => ((c.scores || {})[uid] || {})[i] && ((c.scores[uid][i][k.k]) != null)));
const scoresOk = c => !nonPrice(c).length || (bidsOk(c) && evalMembers(c).every(u => scored(c, u)));
function totals(c) {
  if (!c.bids || !c.bids.length || !c.criteria) return [];
  const lo = Math.min(...c.bids.map(b => b.price)), mem = evalMembers(c);
  return c.bids.map((b, i) => {
    const part = c.criteria.map(k => { if (k.k === "price") return { k: k.k, s: lo / b.price * 100 };
      const ss = mem.map(u => (((c.scores || {})[u] || {})[i] || {})[k.k]).filter(x => x != null); return { k: k.k, s: ss.length ? avg(ss) : null }; });
    return { i, name: b.name, price: b.price, part, total: part.every(p => p.s != null) ? sumv(c.criteria.map((k, j) => k.w * part[j].s / 100)) : null };
  });
}
function awardInputs(c) {
  if (!(needsCompetition(c) && c.bids && c.bids.length)) return `<div class="f" style="flex:2 1 220px"><label for="aw-v">${L("ผู้ชนะ", "Winner")}</label><input type="text" id="aw-v" required></div>
      <div class="f" style="flex:0 1 170px"><label for="aw-p">${L("ราคา (บาท)", "Price (baht)")}</label><input type="number" id="aw-p" min="1" step="1" required></div>`;
  const t = totals(c), top = t.filter(x => x.total != null).sort((a, b) => b.total - a.total)[0], pick = top || t[0];
  return `<div class="f" style="flex:2 1 220px"><label for="aw-v">${L("ผู้ชนะตามมติ", "Winner per the resolution")}</label><select id="aw-v">${c.bids.map(b => `<option value="${esc(b.name)}" data-p="${b.price}" ${pick && b.name === pick.name ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 170px"><label for="aw-p">${L("ราคาที่เสนอ (บาท)", "Offered price (baht)")}</label><input type="number" id="aw-p" value="${pick ? pick.price : ""}" readonly></div>`;
}
function awardGuard(c, winner, price, why) {
  if (!(needsCompetition(c) && c.bids && c.bids.length)) return "";
  const b = c.bids.find(x => x.name === winner);
  if (!b) return L("เลือกผู้ชนะจากรายชื่อผู้ยื่น", "Choose the winner from the bidders");
  if (price !== b.price) return L("ราคาต้องตรงกับที่ผู้ยื่นเสนอ", "The price must be the bidder's offered price");
  if (!coiOk(c, evalKey(c))) return L("กรรมการพิจารณาผลยังแจ้งผลประโยชน์ทับซ้อนไม่ครบ หรือมีผู้มีส่วนได้เสีย (SD-07)", "Not every evaluation member has declared, or one has a conflict (SD-07)");
  if (!bidsOk(c)) return L("จำนวนผู้ยื่นที่บันทึกไม่ตรงกับจำนวนใน e-GP", "The bidders recorded don't match the count from e-GP");
  if (!scoresOk(c)) return L("กรรมการยังบันทึกคะแนนไม่ครบทุกคน", "Not every member has entered scores");
  const t = totals(c), top = Math.max(...t.map(x => x.total)), mine = t.find(x => x.name === winner).total;
  if (mine < top - 1e-9 && why.length < 10) return L("ผู้ชนะไม่ใช่คะแนนรวมสูงสุดตามที่กรรมการให้ ต้องระบุเหตุผลอย่างน้อย 10 ตัวอักษร", "The winner is not the top total from the members' scores; give a reason of at least 10 characters");
  return "";
}
{
  const base = caseChecks;
  caseChecks = c => {
    const out = base(c), n = caseState(c), ok = (v, th, en) => ({ ok: !!v, label: L(th, en) });
    if (!needsCompetition(c) || c.cancelled) return out;
    if (n === 4) { out.push(ok(critOk(c), "กำหนดเกณฑ์พิจารณาและน้ำหนักรวม 100 ก่อนประกาศ (R-14)", "Set the evaluation criteria, weights adding to 100, before the announcement (R-14)"));
      if (requiredCommittees(c).includes("tor") && c.committees.tor) out.push(ok(coiOk(c, "tor"), "กรรมการ TOR แจ้งผลประโยชน์ทับซ้อนครบ และไม่มีผู้มีส่วนได้เสีย (SD-07)", "Every TOR committee member has declared, with no conflict (SD-07)")); }
    if (n === 6) out.splice(1, 0, ok(c.committees[evalKey(c)] && coiOk(c, evalKey(c)), "กรรมการพิจารณาผลแจ้งผลประโยชน์ทับซ้อนครบ และไม่มีผู้มีส่วนได้เสีย (SD-07)", "Every evaluation member has declared, with no conflict (SD-07)"),
      ok(bidsOk(c), "บันทึกผู้ยื่นและราคาครบตามจำนวนใน e-GP", "Record each bidder and price, matching the e-GP count"), ok(scoresOk(c), "กรรมการทุกคนบันทึกคะแนนครบ", "Every member has entered their scores"));
    return out;
  };
}

// ---------- e-GP status sync (R-19) ----------
function egpMismatch(c) {
  const p = famPlan(c.plan); if (!p.egp || !p.egp.stage || c.cancelled) return null;
  const rank = EGP_RANK[p.egp.stage[1]] || 0, n = caseState(c);
  if (rank <= n) return null;
  const age = dayDiff(p.egp.date, TODAY);
  return { stage: p.egp.stage, rank, n, age, late: age >= S.pcfg.syncDays };
}

// ---------- the case panels ----------
const canEditCase = c => isProcRole() && !c.cancelled && caseState(c) >= 3 && caseState(c) <= 8;
CASE_PANELS.push(c => {
  const m = egpMismatch(c);
  return m ? `<div class="alert"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${L("สถานะใน e-GP ล้ำหน้าแฟ้ม", "e-GP is ahead of this case")}</b><p>${L("ไฟล์ e-GP ระบุ", "The e-GP file says")} “${tx(m.stage)}” ${L("แต่แฟ้มอยู่ขั้น", "but the case is at step")} ${m.n} · ${m.age} ${L("วัน", "days")}${m.late ? ` · ${L("เกินเวลาที่ตั้ง สร้างงานให้เจ้าหน้าที่พัสดุแล้ว (R-19)", "past the set time; a task was created for the officer (R-19)")}` : ""}</p></div></div>` : "";
});
CASE_PANELS.push(c => {
  const n = caseState(c), ed = canEditCase(c) && n >= 3 && n <= 4, M = c.market || [];
  if (n < 3 || (!M.length && !ed)) return "";
  return `<section class="panel"><header><h2>${L("การสำรวจตลาด", "Market research")}</h2><span class="sp"></span><span class="sub">${L("หลักฐานประกอบราคากลาง (FR-PR-40)", "Evidence for the reference price (FR-PR-40)")}</span></header>
    ${M.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ผู้ขาย", "Supplier")}</th><th class="n">${L("ราคา (บาท)", "Price (baht)")}</th><th>${L("แหล่ง", "Source")}</th><th>${L("วันที่", "Date")}</th><th>${L("หมายเหตุ", "Note")}</th></tr></thead><tbody>${M.map(x => `<tr><td>${esc(x.vendor)}</td><td class="n">${fmt(x.price)}</td><td class="sub">${tx(MR_SRC[x.src])}</td><td class="sub">${fdate(x.date)}</td><td class="sub">${esc(x.note)}</td></tr>`).join("")}</tbody></table></div>
      <div class="body sub" style="padding-top:6px">${L("ค่ากลาง", "Median")} ${fmt(med(M.map(x => x.price)))} · ${L("ช่วง", "range")} ${fmt(Math.min(...M.map(x => x.price)))} – ${fmt(Math.max(...M.map(x => x.price)))} ${L("บาท", "baht")} (n=${M.length})</div>` : ""}
    ${ed ? `<div class="body"><form class="inline-form" id="mr-form"><div class="f" style="flex:2 1 200px"><label for="mr-v">${L("ผู้ขาย", "Supplier")}</label><input type="text" id="mr-v" required></div><div class="f" style="flex:0 1 150px"><label for="mr-p">${L("ราคา (บาท)", "Price (baht)")}</label><input type="number" id="mr-p" min="1" step="1" required></div>
      <div class="f" style="flex:0 1 190px"><label for="mr-s">${L("แหล่ง", "Source")}</label><select id="mr-s">${Object.keys(MR_SRC).map(k => `<option value="${k}">${tx(MR_SRC[k])}</option>`).join("")}</select></div><div class="f" style="flex:1 1 160px"><label for="mr-n">${L("หมายเหตุ", "Note")}</label><input type="text" id="mr-n"></div><button class="btn" type="submit">+ ${L("เพิ่ม", "Add")}</button></form></div>` : ""}</section>`;
});
CASE_PANELS.push(c => {
  const n = caseState(c); if (!needsCompetition(c) || n < 4) return "";
  const ed = canEditCase(c) && n === 4, C = c.criteria || [];
  return `<section class="panel"><header><h2>${L("เกณฑ์พิจารณาข้อเสนอ", "Evaluation criteria")}</h2><span class="sp"></span>${tag(n === 4 ? L("แก้ได้ก่อนประกาศ", "Editable until announced") : L("ล็อกตามที่ประกาศ", "Locked as announced"), n === 4 ? "p-warn" : "p-mute")}</header>
    <div class="body">${C.length ? `<div class="row">${C.map(k => `<span class="pill p-info">${tx(k.name)} ${k.w}</span>`).join("")}<span class="sub">${L("รวม", "total")} ${sumv(C.map(k => k.w))}</span></div>` : `<span class="sub">${L("ยังไม่ได้กำหนด", "Not set yet")}</span>`}
    ${ed ? `<form class="inline-form" id="cr-form" style="margin-top:8px"><div class="f" style="flex:0 1 230px"><label for="cr-pre">${L("รูปแบบ", "Basis")}</label><select id="cr-pre"><option value="lowest">${L("ราคาต่ำสุด", "Lowest price")}</option><option value="pp" ${C.length > 1 ? "selected" : ""}>${L("ราคาประกอบเกณฑ์อื่น", "Price and performance")}</option></select></div>
      ${CRIT_PRESET.pp.map(k => `<div class="f" style="flex:0 1 110px"><label for="cr-${k.k}">${tx(k.name)}</label><input type="number" id="cr-${k.k}" min="0" max="100" step="1" value="${(C.find(x => x.k === k.k) || k).w}"></div>`).join("")}
      <button class="btn" type="submit">${L("บันทึกเกณฑ์", "Save the criteria")}</button></form><div class="sub">${L("แบบราคาต่ำสุดใช้ราคาอย่างเดียว น้ำหนัก 100 · สูตรคะแนนราคา = ราคาต่ำสุด ÷ ราคาที่เสนอ × 100 (ค่าตั้ง ระดับ C)", "Lowest price uses price only, weight 100 · price score = lowest price ÷ offered price × 100 (a setting, level C)")}</div>` : ""}</div></section>`;
});
CASE_PANELS.push(c => {
  const keys = ["tor", "eval", "buy"].filter(k => c.committees[k]); if (!keys.length || caseState(c) < 4) return "";
  const n = caseState(c), ed = canEditCase(c), meId = me().id;
  return `<section class="panel"><header><h2>${L("แบบแจ้งผลประโยชน์ทับซ้อน", "Conflict-of-interest declarations")}</h2><span class="sp"></span><span class="mono sub">SD-07</span> ${sodOn("SD-07") ? "" : tag(L("ปิดกฎใน M10", "Rule off in M10"), "p-bad")}</header>
    <div class="body sub">${L("กรรมการทุกคนแจ้งก่อนพิจารณา ผู้ที่มีส่วนได้เสียกับผู้ยื่นรายใดต้องถูกแทนที่ก่อนบันทึกผล (R-13)", "Every member declares before the evaluation; a member with a conflict must be replaced before the result is recorded (R-13)")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คณะกรรมการ", "Committee")}</th><th>${L("กรรมการ", "Member")}</th><th>${L("การแจ้ง", "Declaration")}</th><th></th></tr></thead><tbody>${keys.map(k => committeeMembers(c.committees[k]).map(u => { const d = coiOf(c, k, u), id = `${k}-${u}`;
      return `<tr><td class="sub">${tx(COMMITTEES[k])}</td><td>${esc(userName(u))}</td><td>${d ? (d.conflict ? tag(`${L("มีส่วนได้เสียกับ", "Conflict with")} ${esc(d.with)}`, "p-bad") : tag(L("ไม่มีส่วนได้เสีย", "No conflict"), "p-ok")) + `<div class="sub">${fdate(d.t, true)}${d.paper ? ` · ${L("บันทึกจากแบบฟอร์มโดย", "recorded from the form by")} ${esc(userName(d.by))}` : ""}</div>` : tag(L("ยังไม่แจ้ง", "Not declared"), "p-warn")}</td>
        <td>${!d && (u === meId || ed) ? `<div class="row" style="flex-wrap:nowrap"><label class="field-inline"><input type="checkbox" id="coi-c-${id}"> ${L("มีส่วนได้เสีย", "Conflict")}</label><input type="text" id="coi-w-${id}" placeholder="${L("กับผู้ยื่นรายใด", "With which bidder")}" style="min-width:120px"><button class="btn" type="button" data-coi="${c.id}|${k}|${u}">${u === meId ? L("แจ้ง", "Declare") : L("บันทึกจากแบบฟอร์ม", "Record from the form")}</button></div>` : ""}
          ${d && d.conflict && ed && n <= 6 ? `<div class="row" style="flex-wrap:nowrap"><select id="coi-r-${id}" aria-label="${L("แทนที่ด้วย", "Replace with")}">${people().filter(p => !committeeMembers(c.committees[k]).includes(p.id)).map(p => `<option value="${p.id}">${esc(tx(p.name))}</option>`).join("")}</select><button class="btn danger" type="button" data-coiswap="${c.id}|${k}|${u}">${L("แทนที่", "Replace")}</button></div>` : ""}</td></tr>`; }).join("")).join("")}</tbody></table></div></section>`;
});
CASE_PANELS.push(c => {
  const n = caseState(c); if (!needsCompetition(c) || n < 6 || !c.criteria) return "";
  const ed = canEditCase(c) && n === 6, B = c.bids || [], NP = nonPrice(c), meId = me().id, mem = c.committees[evalKey(c)] ? evalMembers(c) : [], T = totals(c), top = T.filter(x => x.total != null).sort((a, b) => b.total - a.total)[0];
  const sheet = u => `<div class="callout" style="margin:0"><b>${L("ใบให้คะแนนของ", "Score sheet of")} ${esc(userName(u))}</b>${u !== meId ? ` <span class="sub">(${L("บันทึกจากใบให้คะแนนที่ลงนาม", "recorded from the signed sheet")})</span>` : ""}
    <div class="tbl-wrap"><table><thead><tr><th>${L("ผู้ยื่น", "Bidder")}</th>${NP.map(k => `<th class="n">${tx(k.name)} (0-100)</th>`).join("")}</tr></thead><tbody>${B.map((b, i) => `<tr><td>${esc(b.name)}</td>${NP.map(k => `<td class="n"><input type="number" min="0" max="100" step="1" style="width:80px" data-sc="${u}|${i}|${k.k}" value="${(((c.scores || {})[u] || {})[i] || {})[k.k] ?? ""}" aria-label="${esc(b.name)} ${tx(k.name)}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <button class="btn" type="button" data-scsave="${u}">${L("บันทึกคะแนน", "Save scores")}</button></div>`;
  return `<section class="panel"><header><h2>${L("ผู้ยื่นและคะแนนพิจารณา", "Bidders and evaluation scores")}</h2><span class="sp"></span><span class="sub">${L("ระบบรวมคะแนนตามที่กรรมการกรอก ไม่ให้คะแนนเอง (R-14)", "The system adds up what members enter and never scores (R-14)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ผู้ยื่น", "Bidder")}</th><th class="n">${L("ราคา (บาท)", "Price (baht)")}</th>${c.criteria.map(k => `<th class="n">${tx(k.name)} ×${k.w}</th>`).join("")}<th class="n">${L("รวม", "Total")}</th></tr></thead>
      <tbody>${T.map(r => `<tr><td>${esc(r.name)}${top && r.i === top.i ? ` ${tag(L("สูงสุด", "Top"), "p-ok")}` : ""}</td><td class="n">${fmt(r.price)}</td>${r.part.map(p => `<td class="n">${p.s == null ? "—" : fmt(p.s, 1)}</td>`).join("")}<td class="n"><b>${r.total == null ? "—" : fmt(r.total, 2)}</b></td></tr>`).join("") || `<tr><td colspan="${c.criteria.length + 3}" class="sub">${L("ยังไม่ได้บันทึกผู้ยื่น", "No bidders recorded")}</td></tr>`}</tbody></table></div>
    <div class="body" style="display:flex;flex-direction:column;gap:10px">
      <div class="sub">${L("ผู้ยื่นใน e-GP", "Bidders in e-GP")}: ${c.egp && c.egp.bidders != null ? c.egp.bidders : "—"} · ${L("บันทึกแล้ว", "recorded")} ${B.length} · ${L("กรรมการให้คะแนนแล้ว", "members scored")} ${mem.filter(u => !NP.length || (B.length && scored(c, u))).length}/${mem.length}</div>
      ${ed && B.length < (c.egp.bidders || 0) ? `<form class="inline-form" id="bid-add"><div class="f" style="flex:2 1 220px"><label for="bd-n">${L("ชื่อผู้ยื่น", "Bidder name")}</label><input type="text" id="bd-n" required></div><div class="f" style="flex:0 1 160px"><label for="bd-p">${L("ราคาที่เสนอ (บาท)", "Offered price (baht)")}</label><input type="number" id="bd-p" min="1" step="1" required></div><button class="btn" type="submit">+ ${L("เพิ่มผู้ยื่น", "Add bidder")}</button></form>` : ""}
      ${NP.length && B.length === (c.egp.bidders || 0) && n === 6 ? mem.filter(u => u === meId || ed).map(sheet).join("") : ""}
      ${ed ? `<div><button class="btn ghost" type="button" id="ev-demo">${L("จำลอง: กรรมการทุกคนส่งแบบแจ้งและใบให้คะแนน", "Demo: every member sends the declaration and score sheet")}</button></div>` : ""}</div></section>`;
});
CASE_PANELS.push(c => {
  const n = caseState(c); if (!needsCompetition(c) || n < 5) return "";
  const Q = c.qa || [], ed = canEditCase(c) && n === 5;
  if (!Q.length && !ed) return "";
  return `<section class="panel"><header><h2>${L("คำถามและคำตอบระหว่างประกาศ", "Questions and answers during the announcement")}</h2><span class="sp"></span><span class="sub">FR-PR-43</span></header>
    ${Q.length ? `<div class="body"><ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">${Q.map(x => `<li><b style="font-weight:600">${esc(x.q)}</b><div class="sub">${esc(x.a)} · ${fdate(x.t, true)}${x.amend ? ` · ${tag(L("แก้ไขประกาศ", "Amended"), "p-warn")}${x.newClose ? ` ${L("ปิดรับใหม่", "new close")} ${fdate(x.newClose)}` : ""}` : ""}</div></li>`).join("")}</ol></div>` : ""}
    ${ed ? `<div class="body"><form class="inline-form" id="qa-form"><div class="f" style="flex:2 1 220px"><label for="qa-q">${L("คำถาม", "Question")}</label><input type="text" id="qa-q" required></div><div class="f" style="flex:2 1 220px"><label for="qa-a">${L("คำตอบ", "Answer")}</label><input type="text" id="qa-a" required></div>
      <label class="field-inline"><input type="checkbox" id="qa-am"> ${L("แก้ไขประกาศ", "Amends the announcement")}</label><div class="f" style="flex:0 1 160px"><label for="qa-cl">${L("วันปิดรับใหม่ (ถ้ามี)", "New closing date")}</label><input type="date" id="qa-cl"></div><button class="btn" type="submit">+ ${L("บันทึก", "Record")}</button></form></div>` : ""}</section>`;
});
CASE_PANELS.push(c => {
  const n = caseState(c); if (!needsCompetition(c) || n < 4 || n > 5 || !isProcRole()) return "";
  return `<section class="panel"><header><h2>${L("ชุดข้อมูลสำหรับคีย์ใน e-GP", "Data pack for keying into e-GP")}</h2><span class="sp"></span><button class="btn" type="button" id="pack-gen">${L("สร้างชุดข้อมูล", "Build the pack")}</button></header>
    ${PACK_FOR === c.id ? `<div class="body"><pre id="pack-pre" style="margin:0;white-space:pre-wrap;font-family:var(--mono);font-size:12px">${esc(egpPack(c))}</pre><div class="row" style="margin-top:8px"><button class="btn" type="button" id="pack-copy">${L("คัดลอก", "Copy")}</button><span class="sub">${L("รูปแบบตามช่องของ e-GP ต้องยืนยันเมื่อทราบแบบที่ใช้จริง", "Field layout to be confirmed against the real e-GP form")}</span></div></div>` : ""}</section>`;
});
function egpPack(c) {
  const p = famPlan(c.plan), rq = caseReq(c), line = famLine(c.line), cm = k => (c.committees[k] ? `${c.committees[k].order} · ${committeeMembers(c.committees[k]).map(userName).join(", ")}` : "-");
  return [`โครงการ: ${tx(p.name)}`, `รหัสแฟ้ม Fisko: ${c.id} · แผน ${p.id}`, `วิธีจัดซื้อ: ${tx(PMETHOD[c.method])}`, `ประเภท: ${tx(KINDS[c.kind])}`,
    `วงเงินงบประมาณ: ${fmt(rq ? rq.amount : p.est)} บาท · รายการจัดสรร ${line.id} ${tx(line.name)}`, `ราคากลาง: ${c.ref ? fmt(c.ref.amount) + " บาท · แหล่ง " + c.ref.basis.map(b => tx(BASIS[b])).join(", ") : "-"}`,
    `TOR: ${c.tor ? c.tor.doc : "-"}`, `คณะกรรมการ TOR และราคากลาง: ${cm("tor")}`, `เกณฑ์พิจารณา: ${(c.criteria || []).map(k => `${tx(k.name)} ${k.w}`).join(", ") || "-"}`,
    `ประกาศ: ${c.egp ? fdate(c.egp.announce) : "-"} · ยื่นข้อเสนอถึง: ${c.egp ? fdate(c.egp.close) : "-"}`].join("\n");
}
CASE_BINDS.push((c, done) => {
  const mr = $("#mr-form"); if (mr) mr.onsubmit = e => { e.preventDefault(); (c.market = c.market || []).push({ vendor: $("#mr-v").value.trim(), price: Math.round(Number($("#mr-p").value)), src: $("#mr-s").value, date: TODAY, note: $("#mr-n").value.trim(), by: me().id });
    caseLog(c, "market", `${$("#mr-v").value.trim()} · ${fmt(Math.round(Number($("#mr-p").value)))}`); done(L("บันทึกแล้ว", "Recorded")); };
  const cr = $("#cr-form"); if (cr) cr.onsubmit = e => { e.preventDefault(); const pre = $("#cr-pre").value;
    const C = pre === "lowest" ? CRIT_PRESET.lowest.map(k => ({ ...k })) : CRIT_PRESET.pp.map(k => ({ ...k, w: Math.round(Number($("#cr-" + k.k).value)) }));
    if (sumv(C.map(k => k.w)) !== 100) { toast(L(`น้ำหนักรวมต้องเท่ากับ 100 (ตอนนี้ ${sumv(C.map(k => k.w))})`, `Weights must add to 100 (now ${sumv(C.map(k => k.w))})`)); return; }
    c.criteria = C; caseLog(c, "criteria", C.map(k => `${k.k} ${k.w}`).join(", ")); audit(["กำหนดเกณฑ์พิจารณาข้อเสนอ", "Set the evaluation criteria"], c.id); done(L("บันทึกเกณฑ์แล้ว", "Criteria saved")); };
  $$("[data-coi]").forEach(b => (b.onclick = () => { const [, k, u] = b.dataset.coi.split("|"), id = `${k}-${u}`, conflict = $("#coi-c-" + id).checked, w = $("#coi-w-" + id).value.trim();
    if (conflict && w.length < 2) { toast(L("ระบุผู้ยื่นที่มีส่วนได้เสีย", "Name the bidder")); return; }
    c.coi = c.coi || {}; c.coi[k] = c.coi[k] || {}; c.coi[k][u] = { conflict, with: w, t: nowIso(), by: me().id, paper: u !== me().id };
    caseLog(c, "coi", `${userName(u)} · ${conflict ? "มีส่วนได้เสีย " + w : "ไม่มี"}`); audit(["บันทึกแบบแจ้งผลประโยชน์ทับซ้อน", "Recorded a conflict-of-interest declaration"], `${c.id} ${userName(u)}`);
    if (conflict) notify(["prochead"], [`แฟ้ม ${c.id} มีกรรมการแจ้งส่วนได้เสีย ต้องแทนที่`, `Case ${c.id}: a member declared a conflict and must be replaced`], `case:${c.id}`);
    done(conflict ? L("บันทึกแล้ว ต้องแทนที่กรรมการรายนี้ก่อนบันทึกผล (SD-07)", "Recorded; replace this member before the result (SD-07)") : L("บันทึกแล้ว", "Recorded")); }));
  $$("[data-coiswap]").forEach(b => (b.onclick = () => { const [, k, u] = b.dataset.coiswap.split("|"), nu = $(`#coi-r-${k}-${u}`).value, cm = c.committees[k];
    if (cm.chair === u) cm.chair = nu; else cm.members = cm.members.map(x => (x === u ? nu : x));
    delete c.coi[k][u]; caseLog(c, "coi_swap", `${userName(u)} → ${userName(nu)}`); audit(["เปลี่ยนกรรมการที่มีส่วนได้เสีย", "Replaced a conflicted committee member"], `${c.id} ${userName(u)} → ${userName(nu)}`); done(L("แทนที่แล้ว กรรมการใหม่ต้องแจ้งด้วย", "Replaced; the new member must declare too")); }));
  const ba = $("#bid-add"); if (ba) ba.onsubmit = e => { e.preventDefault(); const nm = $("#bd-n").value.trim(); if ((c.bids || []).some(b => b.name === nm)) { toast(L("มีชื่อนี้แล้ว", "Already recorded")); return; }
    (c.bids = c.bids || []).push({ name: nm, price: Math.round(Number($("#bd-p").value)) }); caseLog(c, "bid", `${nm} · ${fmt(Math.round(Number($("#bd-p").value)))}`); done(); };
  $$("[data-scsave]").forEach(b => (b.onclick = () => { const u = b.dataset.scsave; let bad = false;
    $$(`[data-sc^="${u}|"]`).forEach(inp => { const [, i, k] = inp.dataset.sc.split("|"), v = inp.value === "" ? null : Number(inp.value); if (v != null && (v < 0 || v > 100)) bad = true;
      c.scores = c.scores || {}; c.scores[u] = c.scores[u] || {}; c.scores[u][i] = c.scores[u][i] || {}; c.scores[u][i][k] = v; });
    if (bad) { toast(L("คะแนนต้องอยู่ระหว่าง 0 ถึง 100", "Scores must be 0 to 100")); return; }
    caseLog(c, "score", userName(u)); audit(["บันทึกคะแนนพิจารณา", "Recorded evaluation scores"], `${c.id} ${userName(u)}`); done(L("บันทึกคะแนนแล้ว", "Scores saved")); }));
  const ed = $("#ev-demo"); if (ed) ed.onclick = () => {
    const k = evalKey(c), cm = c.committees[k];
    if (!cm) { toast(L("แต่งตั้งคณะกรรมการพิจารณาผลก่อน", "Appoint the evaluation committee first")); return; }
    c.coi = c.coi || {}; c.coi[k] = c.coi[k] || {};
    committeeMembers(cm).forEach(u => { if (!c.coi[k][u]) c.coi[k][u] = { conflict: false, with: "", t: nowIso(), by: me().id, paper: true }; });
    if (!c.bids || !c.bids.length) { const base = c.ref ? c.ref.amount : famPlan(c.plan).est; c.bids = Array.from({ length: c.egp.bidders || 1 }, (_, i) => ({ name: ["บริษัท ตัวอย่างผู้ยื่น ก จำกัด", "บริษัท ตัวอย่างผู้ยื่น ข จำกัด", "ห้างหุ้นส่วนจำกัด ตัวอย่างผู้ยื่น ค"][i % 3], price: Math.round(base * (0.97 + i * 0.02) / 1e3) * 1e3 })); }
    committeeMembers(cm).forEach((u, j) => { c.scores = c.scores || {}; c.scores[u] = {}; c.bids.forEach((b, i) => { c.scores[u][i] = {}; nonPrice(c).forEach(x => (c.scores[u][i][x.k] = 85 - i * 6 + j)); }); });
    caseLog(c, "score", L("ตัวอย่างสำหรับการสาธิต", "sample for the demo")); done(L("ใส่แบบแจ้งและคะแนนตัวอย่างแล้ว (จำลอง)", "Sample declarations and scores filled in (demo)"));
  };
  const qf = $("#qa-form"); if (qf) qf.onsubmit = e => { e.preventDefault(); const am = $("#qa-am").checked, nc = $("#qa-cl").value || null;
    if (nc && nc < c.egp.close) { toast(L("วันปิดรับใหม่ต้องไม่ก่อนวันเดิม", "The new closing date can't be earlier")); return; }
    (c.qa = c.qa || []).push({ q: $("#qa-q").value.trim(), a: $("#qa-a").value.trim(), t: nowIso(), by: me().id, amend: am, newClose: am ? nc : null });
    if (am && nc) { c.egp.close = nc; c.closeElapsed = false; caseLog(c, "amend", fdate(nc)); }
    caseLog(c, "qa", $("#qa-q").value.trim()); done(L("บันทึกแล้ว", "Recorded")); };
  const pg = $("#pack-gen"); if (pg) pg.onclick = () => { PACK_FOR = c.id; audit(["สร้างชุดข้อมูลสำหรับ e-GP", "Built an e-GP data pack"], c.id); commit(); route(); };
  const pc = $("#pack-copy"); if (pc) pc.onclick = () => { const fb = () => { const r = document.createRange(); r.selectNodeContents($("#pack-pre")); const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r); toast(L("เลือกข้อความแล้ว กด Ctrl+C", "Selected; press Ctrl+C")); };
    try { navigator.clipboard.writeText(egpPack(c)).then(() => toast(L("คัดลอกแล้ว", "Copied")), fb); } catch (e) { fb(); } };
  const av = $("#aw-v"); if (av && av.tagName === "SELECT") av.onchange = () => { $("#aw-p").value = av.selectedOptions[0].dataset.p; };
});
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "tor") bindTor(); };
}
// tasks: members to declare or score, the head to approve templates, officers to fix e-GP sync
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.torLib) return;
    const meId = me().id;
    S.cases.filter(c => !c.cancelled).forEach(c => {
      const n = caseState(c);
      ["tor", "eval", "buy"].forEach(k => { const cm = c.committees[k]; if (cm && n >= 4 && n <= 6 && committeeMembers(cm).includes(meId) && !coiOf(c, k, meId)) R(`${L("แจ้งผลประโยชน์ทับซ้อน", "Declare conflicts of interest")} ${c.id}`, tx(COMMITTEES[k]), TODAY, `case:${c.id}`, "p-warn"); });
      if (n === 6 && c.bids && nonPrice(c).length && c.committees[evalKey(c)] && evalMembers(c).includes(meId) && !scored(c, meId)) R(`${L("ให้คะแนนข้อเสนอ", "Score the bids")} ${c.id}`, caseName(c), TODAY, `case:${c.id}`, "p-info");
      const m = egpMismatch(c); if (m && m.late && isProcRole()) R(`${L("ปรับแฟ้มให้ตรงสถานะ e-GP", "Bring the case in line with e-GP")} ${c.id}`, tx(m.stage), TODAY, `case:${c.id}`, "p-warn");
    });
    if (ROLE === "prochead") S.torLib.forEach(t => t.versions.filter(v => v.status === "draft").forEach(v => R(`${L("อนุมัติแม่แบบ TOR", "Approve a TOR template")} ${t.id} v${v.v}`, tx(t.name), TODAY, "prc-tor", "p-warn")));
  };
}

// ---------- seed ----------
function seedSourcing(s, K) {
  s.pcfg.syncDays = 3;
  const T = (id, kind, th, en, text) => ({ id, kind, name: [th, en], versions: [{ v: 1, text, status: "approved", by: K.PO, t: "2026-07-01T10:00", why: "ฉบับแรก", appr: { by: K.PH, t: "2026-07-03T10:00" } }] });
  s.torLib = [
    T("TPL-G", "goods", "ซื้อพัสดุทั่วไป", "General goods", "1. ความเป็นมา\n2. วัตถุประสงค์\n3. คุณสมบัติผู้เสนอราคา\n4. รายละเอียดคุณลักษณะเฉพาะ (ไม่ระบุยี่ห้อ ใช้ \"หรือเทียบเท่า\")\n5. ระยะเวลาส่งมอบ\n6. การรับประกันความชำรุดบกพร่อง\n7. เกณฑ์พิจารณา"),
    T("TPL-S", "service", "จ้างบริการ", "Services", "1. ความเป็นมา\n2. ขอบเขตงานบริการและระดับบริการ (SLA)\n3. คุณสมบัติผู้เสนอราคาและบุคลากร\n4. ระยะเวลาและงวดงาน\n5. การส่งมอบและตรวจรับรายงวด\n6. เกณฑ์พิจารณา"),
    T("TPL-C", "construction", "จ้างก่อสร้าง", "Construction", "1. ความเป็นมา\n2. แบบรูปและรายการ\n3. คุณสมบัติผู้เสนอราคา ผลงาน\n4. ระยะเวลาก่อสร้างและงวดงาน\n5. ผู้ควบคุมงานและการรายงานรายสัปดาห์\n6. การรับประกันความชำรุดบกพร่อง\n7. เกณฑ์พิจารณา"),
  ];
  s.torLib[1].versions.push({ v: 2, text: s.torLib[1].versions[0].text + "\n7. ข้อกำหนดด้านความมั่นคงปลอดภัยข้อมูล", status: "draft", by: K.PO, t: "2026-10-15T14:00", why: "เพิ่มข้อกำหนดความมั่นคงปลอดภัยข้อมูล", appr: null });
  const dec = (c, k, t) => { c.coi = c.coi || {}; c.coi[k] = {}; committeeMembers(c.committees[k]).forEach(u => (c.coi[k][u] = { conflict: false, with: "", t, by: u, paper: false })); };
  s.cases.forEach((c, i) => {
    if (!c.method || c.method === "specific") return;
    c.criteria = CRIT_PRESET.pp.map(k => ({ ...k }));
    if (c.tor) { c.tor.tpl = c.kind === "construction" ? "TPL-C" : c.kind === "goods" ? "TPL-G" : "TPL-S"; c.tor.tplV = 1; }
    if (c.committees.tor) dec(c, "tor", c.committees.tor.date + "T15:00");
    if (c.committees.eval && c.award) {
      dec(c, "eval", c.committees.eval.date + "T15:00");
      const others = ["บริษัท ทดสอบราคา จำกัด", "ห้างหุ้นส่วนจำกัด ตัวอย่างพัสดุ"];
      c.bids = [{ name: tx(c.award.winner), price: c.award.price }, ...others.slice(0, (c.egp.bidders || 1) - 1).map((nm, j) => ({ name: nm, price: Math.round(c.award.price * (1.04 + j * 0.03) / 1e3) * 1e3 }))];
      c.award.winner = [c.bids[0].name, c.bids[0].name];
      c.scores = {}; committeeMembers(c.committees.eval).forEach((u, j) => { c.scores[u] = {}; c.bids.forEach((b, bi) => (c.scores[u][bi] = { quality: 82 - bi * 4 + j, delivery: 80 - bi * 3 })); });
    }
    if (i === 2) {
      c.market = [{ vendor: "บริษัท ตัวอย่างอบรม จำกัด", price: Math.round(c.ref.amount * 1.02 / 1e3) * 1e3, src: "visit", date: "2026-09-08", note: "ใบเสนอราคาเลขที่ Q-0918", by: K.PO },
        { vendor: "สถาบันตัวอย่างพัฒนาบุคลากร", price: Math.round(c.ref.amount * 0.95 / 1e3) * 1e3, src: "web", date: "2026-09-09", note: "", by: K.PO }];
      c.ref.basis.push("market");
      c.qa = [{ q: "ต้องมีวิทยากรที่มีใบรับรองหรือไม่", a: "ต้องมีอย่างน้อย 2 คน ตามข้อ 3 ของ TOR", t: "2026-10-16T10:00", by: K.PO, amend: false, newClose: null }];
    }
  });
}
