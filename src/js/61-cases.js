// Fisko Procurement round 13 (P0 + P1 of the detailed design): the procurement case file with its states,
// the method advisor driven by rules in M10, committees, reference price, e-GP sourcing, award, the appeal
// window, the contract gate and the split-purchase check. Rules and numbers come from S.mrules and S.pcfg.
let CASE_OPEN = null, CASE_GROUP = "";
// Extra panels and binders added by later rounds (61b-sourcing.js): each takes the case and returns HTML, or binds its controls.
const CASE_PANELS = [], CASE_BINDS = [];
const CASE_STATES = [null,
  { k: "PLANNED", th: "อยู่ในแผน", en: "Planned" }, { k: "REQUESTED", th: "ขอซื้อขอจ้าง", en: "Requested" }, { k: "APPROVED", th: "อนุมัติหลักการ", en: "Approved" },
  { k: "SPECIFYING", th: "TOR และราคากลาง", en: "Specifying" }, { k: "SOURCING", th: "ดำเนินการใน e-GP", en: "Sourcing" }, { k: "EVALUATING", th: "พิจารณาผล", en: "Evaluating" },
  { k: "AWARDED", th: "ประกาศผู้ชนะ", en: "Awarded" }, { k: "CONTRACTING", th: "ทำสัญญา", en: "Contracting" }, { k: "IN DELIVERY", th: "บริหารสัญญา", en: "In delivery" },
  { k: "ACCEPTED", th: "ตรวจรับครบ", en: "Accepted" }, { k: "PAYMENT", th: "เบิกจ่าย", en: "Payment" }, { k: "CLOSED", th: "ปิดแฟ้ม", en: "Closed" }];
const KINDS = { goods: ["ซื้อพัสดุ", "Goods"], service: ["จ้างบริการ", "Services"], construction: ["จ้างก่อสร้าง", "Construction"], consult: ["ที่ปรึกษาและออกแบบ", "Consulting and design"] };
const SPECIAL = { urgent: ["ฉุกเฉินที่ไม่อาจคาดหมาย", "Unforeseeable emergency"], sole: ["ผู้ผลิตหรือผู้ให้บริการรายเดียว", "Sole source"], repeat: ["ซื้อเพิ่มจากสัญญาเดิม", "Repeat purchase"] };
const BASIS = { std: ["บัญชีราคามาตรฐาน (M10)", "Standard price list (M10)"], contract: ["ราคาในสัญญาเดิม", "Price in a past contract"], quotes: ["ใบเสนอราคาหลายราย", "Several quotations"], egp: ["ราคากลางอิเล็กทรอนิกส์ e-GP", "e-GP electronic reference price"] };
const COMMITTEES = { tor: ["คณะกรรมการจัดทำ TOR และราคากลาง", "TOR and reference-price committee"], eval: ["คณะกรรมการพิจารณาผลการประกวดราคา", "Bid evaluation committee"], buy: ["คณะกรรมการซื้อหรือจ้าง (วิธีคัดเลือก)", "Purchasing committee (selective)"] };
const CASE_EV = { created: ["สร้างแฟ้ม", "Case created"], requested: ["ขอซื้อขอจ้าง", "Requisition raised"], approved: ["อนุมัติหลักการ", "Approved in principle"], rejected: ["ไม่อนุมัติ", "Rejected"],
  method: ["เลือกวิธีจัดซื้อ", "Method chosen"], method_ok: ["หัวหน้าพัสดุอนุมัติวิธี", "Head approved the method"], method_no: ["หัวหน้าพัสดุไม่อนุมัติวิธี", "Head rejected the method"], specifying: ["เริ่มจัดทำ TOR", "Specifying started"],
  committee: ["แต่งตั้งคณะกรรมการ", "Committee appointed"], ref: ["บันทึกราคากลาง", "Reference price recorded"], tor: ["แนบ TOR", "TOR attached"], egp: ["บันทึกข้อมูล e-GP", "e-GP details recorded"],
  sourcing: ["เข้าสู่การดำเนินการใน e-GP", "Sourcing started"], closed: ["ปิดรับข้อเสนอ", "Bids closed"], closed_case: ["ปิดแฟ้ม", "Case closed"], bidders: ["บันทึกจำนวนผู้ยื่น", "Bidders recorded"], quote: ["บันทึกใบเสนอราคา", "Quotation recorded"],
  award: ["ประกาศผู้ชนะ", "Winner announced"], failed: ["ล้มเหลว ดำเนินการใหม่", "Failed, rerun"], appeal_filed: ["มีการอุทธรณ์", "Appeal filed"], appeal_dismissed: ["ยกอุทธรณ์", "Appeal dismissed"],
  appeal_upheld: ["รับอุทธรณ์ กลับไปพิจารณาผล", "Appeal upheld, back to evaluation"], appeal_elapsed: ["พ้นกำหนดอุทธรณ์", "Appeal period over"], contracting: ["เข้าขั้นทำสัญญา", "Ready for contract"],
  contract: ["ลงนามสัญญา", "Contract signed"], cancelled: ["ยกเลิกการจัดซื้อ", "Procurement cancelled"], split: ["ชี้แจงการแตกซื้อ", "Split-purchase explanation"] };
Object.assign(PMETHOD, { selective: ["วิธีคัดเลือก", "Selective method"], emarket: ["e-market", "e-market"] });
Object.assign(REQ_ST, { cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] });

const isProcRole = () => ROLE === "proc" || ROLE === "prochead";
const caseOf = id => S.cases.find(c => c.id === id);
const caseByPlan = pid => S.cases.find(c => c.plan === pid);
const caseCon = c => (c.contract ? famCon(c.contract) : null);
const caseName = c => tx(famPlan(c.plan).name);
const caseReq = c => (c.reqn ? famReq(c.reqn) : null);
// Working days: weekends and the holiday list in M10 are skipped.
function addWorkdays(iso, n) {
  let d = iso;
  while (n > 0) { d = addDays(d, 1); const w = new Date(d + "T00:00:00Z").getUTCDay(); if (w !== 0 && w !== 6 && !(S.holidays || []).includes(d)) n--; }
  return d;
}
// The state shown for a case: after the contract is signed, delivery, acceptance and payment decide it.
function caseState(c) {
  if (c.cancelled) return 0;
  if (c.state < 9) return c.state;
  const con = caseCon(c);
  if (!con) return 9;
  const pays = S.payreqs.filter(p => p.contract === con.id && p.status !== "rejected");
  const live = con.phases.filter(ph => !ph.cancelled);
  if (!live.every(phaseAccepted)) return 9;
  if (live.every(ph => pays.some(p => p.phase === ph.n && p.status === "approved"))) return c.close ? 12 : 11;
  return pays.length ? 11 : 10;
}
const caseStTag = c => { const n = caseState(c); return n === 0 ? tag(L("ยกเลิก", "Cancelled"), "p-mute") : tag(`${n}/12 ${tx([CASE_STATES[n].th, CASE_STATES[n].en])}`, n >= 9 ? "p-ok" : n >= 5 ? "p-info" : "p-warn"); };
function caseLog(c, type, detail) {
  S.caseEvents.unshift({ t: nowIso(), case: c.id, type, by: me().id, detail: detail || "", state: caseState(c) });
  if (S.caseEvents.length > 1000) S.caseEvents.length = 1000;
}

// ---------- method rules (M10) ----------
const ruleFor = method => S.mrules.find(r => r.method === method && r.on !== false) || {};
const needsCompetition = c => c.method && c.method !== "specific";
function recommendMethod(c) {
  const rp = c.ref ? c.ref.amount : famPlan(c.plan).est;
  const live = S.mrules.filter(r => r.on !== false && r.effective <= TODAY && (r.kind === "any" || r.kind === c.kind));
  if (c.special) { const sr = live.find(r => r.type === "special"); if (sr) return { rule: sr, method: sr.method, head: true, why: [`เหตุพิเศษ: ${SPECIAL[c.special][0]} (กฎ ${sr.id})`, `Special case: ${SPECIAL[c.special][1]} (rule ${sr.id})`] }; }
  const hit = live.filter(r => r.type === "value" && (r.max == null || rp <= r.max)).sort((a, b) => (a.max == null ? 1e15 : a.max) - (b.max == null ? 1e15 : b.max))[0];
  if (!hit) return { rule: null, method: null, head: false, why: ["ไม่พบกฎที่ตรงกัน ตั้งค่าใน M10", "No matching rule. Set one in M10"] };
  return { rule: hit, method: hit.method, head: false, why: [hit.max == null ? `วงเงิน ${fmt(rp)} บาท สูงกว่าเกณฑ์ของวิธีเฉพาะเจาะจง (กฎ ${hit.id})` : `วงเงิน ${fmt(rp)} บาท ไม่เกิน ${fmt(hit.max)} บาท (กฎ ${hit.id})`, hit.max == null ? `${fmt(rp)} baht is above the specific-method limit (rule ${hit.id})` : `${fmt(rp)} baht is within ${fmt(hit.max)} baht (rule ${hit.id})`] };
}
const requiredCommittees = c => (ruleFor(c.method).committees || []);
const committeeOk = cm => !!cm && !!cm.order && !!cm.date && !!cm.chair && cm.members.length >= S.pcfg.minMembers - 1;
const committeeMembers = cm => (cm ? [cm.chair, ...cm.members] : []);
// People who sat on the evaluation or purchasing committee can't be on the acceptance committee (SD-06).
const caseJudges = c => [...committeeMembers(c.committees.eval), ...committeeMembers(c.committees.buy)];
const evalKey = c => (c.method === "selective" ? "buy" : "eval");
// Split-purchase check (R-02): several small requisitions of the same kind in one unit that together pass the limit.
function splitRisk(p, amount) {
  const T = S.pcfg.specificMax, since = addDays(TODAY, -S.pcfg.splitDays), unit = famLine(p.line).unit;
  const peers = S.reqn.filter(r => !["rejected", "cancelled"].includes(r.status) && r.plan !== p.id && r.t.slice(0, 10) >= since && famPlan(r.plan).kind === p.kind && famLine(famPlan(r.plan).line).unit === unit);
  const total = sumv(peers.map(r => r.amount)) + amount;
  return { risk: amount <= T && peers.filter(r => r.amount <= T).length >= 1 && total > T, peers, total, T, days: S.pcfg.splitDays };
}

// ---------- checks for the step the case is in ----------
function caseChecks(c) {
  const n = caseState(c), ok = (v, th, en) => ({ ok: !!v, label: L(th, en) }), cm = requiredCommittees(c), rq = caseReq(c), comp = needsCompetition(c);
  if (n === 3) return [ok(c.method, "เลือกวิธีจัดซื้อและบันทึกเหตุผล", "Choose the method and record why"), ok(c.methodApproval && c.methodApproval.status !== "pending", "หัวหน้าพัสดุอนุมัติวิธีที่ต่างจากข้อเสนอหรือเป็นเหตุพิเศษ", "The head of procurement approves a method that differs from the advice or a special case")];
  if (n === 4) {
    const out = [ok(c.ref && c.ref.amount > 0 && c.ref.basis.length, "บันทึกราคากลางพร้อมแหล่งอ้างอิง", "Record the reference price with its basis")];
    if (comp) {
      out.push(ok(c.tor, "แนบ TOR", "Attach the TOR"));
      if (cm.includes("tor")) out.push(ok(committeeOk(c.committees.tor), `แต่งตั้ง${COMMITTEES.tor[0]} (ประธาน 1 กรรมการอย่างน้อย ${S.pcfg.minMembers - 1})`, `Appoint the ${COMMITTEES.tor[1]} (a chair and at least ${S.pcfg.minMembers - 1} members)`));
      out.push(ok(c.egp && c.egp.no && c.egp.announce && c.egp.close && c.egp.close >= c.egp.announce, "บันทึกรหัสโครงการ e-GP วันที่ประกาศ และวันสุดท้ายยื่นข้อเสนอ", "Record the e-GP project no., announcement date and closing date"));
    } else out.push(ok(c.quotes.some(q => q.win), "บันทึกใบเสนอราคาและเลือกผู้เสนอราคา", "Record quotations and pick the winner"));
    return out;
  }
  if (n === 5) return [ok(c.closeElapsed || (c.egp && c.egp.close <= TODAY), "ถึงวันปิดรับข้อเสนอใน e-GP", "The closing date in e-GP has passed"), ok(c.egp && c.egp.bidders != null, "บันทึกจำนวนผู้ยื่นข้อเสนอ", "Record how many bidders submitted")];
  if (n === 6) return [ok(committeeOk(c.committees[evalKey(c)]), `แต่งตั้ง${COMMITTEES[evalKey(c)][0]}`, `Appoint the ${COMMITTEES[evalKey(c)][1]}`), ok(c.award && c.award.winner && c.award.price > 0, "บันทึกมติ ผู้ชนะ และราคา", "Record the resolution, winner and price")];
  if (n === 7) return ruleFor(c.method).appeal ? [ok(c.appealElapsed && !(c.appeal && c.appeal.status === "open"), "พ้นกำหนดอุทธรณ์และไม่มีอุทธรณ์ค้าง", "The appeal period is over and no appeal is open")] : [ok(true, "วิธีนี้ไม่มีช่วงอุทธรณ์ตามค่าตั้ง", "This method has no appeal period in the settings")];
  return [];
}
function caseNext(c) {
  const n = caseState(c);
  if (n === 0) return { who: "none", th: "ยกเลิกแล้ว", en: "Cancelled" };
  if (n === 1) return { who: "req", th: "ผู้ขอส่งใบขอซื้อขอจ้าง", en: "Requester raises the requisition" };
  if (n === 2) return { who: "exec", th: "ผู้มีอำนาจอนุมัติใบขอซื้อ", en: "The approver decides the requisition" };
  if (n >= 9) return { who: "con", th: n === 9 ? "บริหารสัญญาและตรวจรับ" : n === 10 ? "ขอเบิกจ่าย" : n === 11 ? "อนุมัติเบิกจ่ายและกระทบยอด" : "ปิดแฟ้ม", en: n === 9 ? "Manage the contract and accept the work" : n === 10 ? "Request payment" : n === 11 ? "Approve payments and reconcile" : "Close the case" };
  if (n === 8) return { who: "proc", th: "สร้างสัญญา", en: "Create the contract" };
  if (n === 3 && c.methodApproval && c.methodApproval.status === "pending") return { who: "head", th: "หัวหน้าพัสดุอนุมัติวิธี", en: "Head of procurement approves the method" };
  if (n === 7 && c.appeal && c.appeal.status === "open") return { who: "head", th: "ตัดสินอุทธรณ์", en: "Decide the appeal" };
  if (n === 7 && ruleFor(c.method).appeal && !c.appealElapsed) return { who: "wait", th: `รอพ้นกำหนดอุทธรณ์ ${c.award && c.award.appealEnd ? fdate(c.award.appealEnd) : ""}`, en: `Waiting for the appeal period to end ${c.award && c.award.appealEnd ? fdate(c.award.appealEnd) : ""}` };
  if (n === 5 && !(c.closeElapsed || (c.egp && c.egp.close <= TODAY))) return { who: "wait", th: `รอปิดรับข้อเสนอ ${c.egp ? fdate(c.egp.close) : ""}`, en: `Waiting for bids to close ${c.egp ? fdate(c.egp.close) : ""}` };
  const miss = caseChecks(c).find(x => !x.ok);
  return miss ? { who: "proc", th: miss.label, en: miss.label, raw: true } : { who: "proc", th: "ไปขั้นต่อไป", en: "Move to the next step", raw: true };
}

// ---------- moves between states ----------
function setState(c, n, type, detail) { c.state = n; const p = famPlan(c.plan); p.status = n >= 9 ? "contracted" : n >= 2 ? "requisitioned" : "planned"; caseLog(c, type, detail); }
function caseMove(c) {
  const n = caseState(c), chk = caseChecks(c), bad = chk.find(x => !x.ok);
  if (bad) { toast(`${L("ยังไปต่อไม่ได้", "Can't move on yet")}: ${bad.label}`); return false; }
  if (n === 3) setState(c, 4, "specifying");
  else if (n === 4) {
    if (!needsCompetition(c)) {
      const q = c.quotes.find(x => x.win), rq = caseReq(c);
      if (q.price > rq.amount) { toast(L("ราคาที่เลือกสูงกว่าวงเงินที่อนุมัติ", "The chosen price is above the approved amount")); return false; }
      c.award = { winner: q.vendor, price: q.price, date: TODAY, appealEnd: null, minutes: "", why: "" };
      setState(c, 7, "award", `${tx(q.vendor)} · ${mb(q.price)}`);
    } else setState(c, 5, "sourcing", c.egp.no);
  } else if (n === 5) setState(c, 6, "bidders", `${c.egp.bidders}`);
  else if (n === 7) setState(c, 8, "contracting");
  else return false;
  return true;
}
function caseFail(c, why) {
  c.egp = c.egp ? Object.assign(c.egp, { bidders: null }) : null; c.award = null; c.appeal = null; c.appealElapsed = false; c.closeElapsed = false;
  setState(c, 4, "failed", why);
}
function caseCancel(c, why) {
  const rq = caseReq(c); if (rq) rq.status = "cancelled";
  c.cancelled = { why, by: me().id, t: nowIso() }; famPlan(c.plan).status = "planned"; c.state = 1;
  caseLog(c, "cancelled", why);
}
// Called by the requisition steps in 60-procurement.js.
function caseOnRaise(p, r) { const c = caseByPlan(p.id); if (!c) return; c.reqn = r.id; c.cancelled = null; setState(c, 2, "requested", `${r.id} · ${mb(r.amount)}`); }
function caseOnDecide(p, r, ok) {
  const c = caseByPlan(p.id); if (!c) return;
  if (ok) setState(c, 3, "approved", r.id); else { c.reqn = null; setState(c, 1, "rejected", r.id); }
}
function caseOnContract(cs, con) { cs.contract = con.id; cs.state = 9; famPlan(cs.plan).status = "contracted"; caseLog(cs, "contract", `${con.id} · ${mb(con.amount)}`); }
function caseNew(p) {
  const c = { id: "PC-2570-" + String(S.cases.length + 1).padStart(3, "0"), plan: p.id, reqn: null, line: p.line, kind: p.kind, state: 1, method: null, methodWhy: null, special: null, methodApproval: null, committees: {}, ref: null, tor: null, egp: null, quotes: [], award: null, appeal: null, appealElapsed: false, closeElapsed: false, contract: null, cancelled: null };
  S.cases.push(c); caseLog(c, "created", p.id); return c;
}
function guessKind(line, name) { return line.type === "inv" ? (/ปรับปรุง|ก่อสร้าง|อาคาร|ซ่อม|เขื่อน|ตลิ่ง|ถนน|renovat|construct|building|repair|embank/i.test(name.join(" ")) ? "construction" : "goods") : "service"; }

// ---------- views ----------
const GROUPS_CASE = [["", L => L("ทั้งหมด", "All")], ["early", L => L("ก่อนดำเนินการ (1-4)", "Before sourcing (1-4)")], ["source", L => L("ใน e-GP (5-7)", "Sourcing (5-7)")], ["contract", L => L("สัญญา (8-12)", "Contract (8-12)")], ["cancel", L => L("ยกเลิก", "Cancelled")]];
const inGroup = (c, g) => { const n = caseState(c); return !g || (g === "early" && n >= 1 && n <= 4) || (g === "source" && n >= 5 && n <= 7) || (g === "contract" && n >= 8) || (g === "cancel" && n === 0); };
const whoTag = w => ({ proc: tag(L("เจ้าหน้าที่พัสดุ", "Procurement"), "p-info"), head: tag(L("หัวหน้าพัสดุ", "Head"), "p-warn"), exec: tag(L("ผู้อนุมัติ", "Approver"), "p-warn"), req: tag(L("ผู้ขอ", "Requester"), "p-mute"), wait: tag(L("รอ", "Waiting"), "p-mute"), con: tag(L("สัญญา", "Contract"), "p-ok"), none: "" }[w] || "");

PROC.cases = () => CASE_OPEN && caseOf(CASE_OPEN) ? caseDetail(caseOf(CASE_OPEN)) : caseList();
function caseList() {
  const all = S.cases, list = all.filter(c => inGroup(c, CASE_GROUP)), cnt = g => all.filter(c => inGroup(c, g)).length;
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("แฟ้มทั้งหมด", "Cases")}</span><span class="v">${all.length}</span></div>
    <div class="kpi"><span class="l">${L("ก่อนดำเนินการ", "Before sourcing")}</span><span class="v">${cnt("early")}</span></div>
    <div class="kpi"><span class="l">${L("อยู่ใน e-GP", "In sourcing")}</span><span class="v">${cnt("source")}</span></div>
    <div class="kpi"><span class="l">${L("ขั้นสัญญาขึ้นไป", "Contract stage and on")}</span><span class="v">${cnt("contract")}</span></div>
  </section>
  <section class="panel"><header><h2>${L("แฟ้มจัดซื้อจัดจ้าง", "Procurement cases")}</h2><span class="sp"></span>
      <label class="field-inline" for="cs-grp">${L("แสดง", "Show")} <select id="cs-grp">${GROUPS_CASE.map(([k, f]) => `<option value="${k}" ${k === CASE_GROUP ? "selected" : ""}>${f(L)}</option>`).join("")}</select></label></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("แฟ้ม", "Case")}</th><th>${L("รายการ", "Item")}</th><th>${L("ชนิด · วิธี", "Kind · method")}</th><th>${L("ขั้นตอน", "Step")}</th><th>${L("สิ่งที่ต้องทำต่อ", "What's next")}</th><th>e-GP</th><th></th></tr></thead>
      <tbody>${list.map(c => { const nx = caseNext(c), p = famPlan(c.plan);
        return `<tr><td class="mono">${c.id}</td><td><b style="font-weight:600">${esc(caseName(c))}</b><div class="sub">${esc(lineLabel(famLine(c.line)))} · ${mb(caseReq(c) ? caseReq(c).amount : p.est)} ${L("ลบ.", "M")}</div></td>
          <td class="sub">${tx(KINDS[c.kind])}<div>${c.method ? tx(PMETHOD[c.method]) : "—"}</div></td><td>${caseStTag(c)}</td>
          <td>${whoTag(nx.who)} <span class="sub">${esc(nx.raw ? nx.th : L(nx.th, nx.en))}</span></td><td class="sub">${c.egp && c.egp.no ? `<span class="mono">${esc(c.egp.no)}</span>` : "—"}</td>
          <td><div class="row" style="flex-wrap:nowrap"><button class="btn primary" type="button" data-copen="${c.id}">${L("เปิดแฟ้ม", "Open")}</button>${historyBtn(c.id, c.id)}</div></td></tr>`; }).join("")
        || `<tr><td colspan="7" class="sub">${L("ไม่มีแฟ้มในกลุ่มนี้", "No cases in this group")}</td></tr>`}</tbody></table></div></section>`;
}
function stepper(c) {
  const n = caseState(c);
  return `<ol class="stepper" aria-label="${L("ขั้นตอนของแฟ้ม", "Case steps")}">${CASE_STATES.slice(1).map((s, i) => `<li class="${n === 0 ? "" : i + 1 < n ? "done" : i + 1 === n ? "now" : ""}"><span class="dot">${i + 1}</span><span class="nm">${tx([s.th, s.en])}</span></li>`).join("")}</ol>`;
}
const people = () => famPeople().filter(u => u.id !== me().id);
function memberPick(name, selected) { return people().map(u => `<label class="field-inline"><input type="checkbox" name="${name}" value="${u.id}" ${selected.includes(u.id) ? "checked" : ""}> ${esc(tx(u.name))} <span class="sub">· ${tx(ROLES[u.role])}</span></label>`).join(""); }

function caseDetail(c) {
  const n = caseState(c), p = famPlan(c.plan), rq = caseReq(c), edit = isProcRole() && !c.cancelled && n >= 3 && n <= 8, head = ROLE === "prochead", rec = recommendMethod(c);
  const chk = caseChecks(c), allOk = chk.length && chk.every(x => x.ok), nx = caseNext(c), cm = requiredCommittees(c), comp = needsCompetition(c), con = caseCon(c);
  const ev = S.caseEvents.filter(e => e.case === c.id);
  const sec = (min, title, body) => (n >= min ? `<section class="panel"><header><h2>${title}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:12px">${body}</div></section>` : "");
  const ro = (cond, html) => (cond ? html : "");
  const cmBlock = key => { const x = c.committees[key]; return `<div><b style="font-weight:600">${tx(COMMITTEES[key])}</b> ${x ? tag(L("แต่งตั้งแล้ว", "Appointed"), committeeOk(x) ? "p-ok" : "p-warn") : tag(L("ยังไม่แต่งตั้ง", "Not appointed"), "p-mute")}
      ${x ? `<div class="sub">${L("คำสั่งที่", "Order")} ${esc(x.order)} · ${fdate(x.date)} · ${L("ประธาน", "Chair")} ${esc(userName(x.chair))} · ${L("กรรมการ", "Members")} ${x.members.map(id => esc(userName(id))).join(", ")}</div>` : ""}
      ${edit && !x ? `<form class="inline-form" data-cmform="${key}" style="margin-top:6px"><div class="f" style="flex:0 1 150px"><label>${L("เลขที่คำสั่ง", "Order no.")}</label><input type="text" name="order" required></div>
        <div class="f" style="flex:0 1 160px"><label>${L("วันที่", "Date")}</label><input type="date" name="date" value="${TODAY}" required></div>
        <div class="f" style="flex:1 1 180px"><label>${L("ประธาน", "Chair")}</label><select name="chair">${people().map(u => `<option value="${u.id}">${esc(tx(u.name))}</option>`).join("")}</select></div>
        <div style="flex:1 1 100%"><span class="sub">${L("กรรมการ (อย่างน้อย", "Members (at least")} ${S.pcfg.minMembers - 1}${L(" คน และควรมีผู้ชำนาญการหรือผู้ทรงคุณวุฒิ)", ", ideally including an expert)")}</span><div class="row">${memberPick("cm-" + key, [])}</div></div>
        <button class="btn primary" type="submit">${L("บันทึกคำสั่งแต่งตั้ง", "Save the order")}</button></form>` : ""}</div>`; };
  return `
  <section class="panel"><div class="case-hero">${ring(n === 0 ? 0 : n / 12, { size: 76, stroke: 7, label: n === 0 ? "–" : `${n}/12`, fs: 17, color: n === 0 ? "var(--muted)" : n >= 9 ? "var(--accent)" : "var(--info)" })}
      <div style="min-width:0"><div class="row" style="gap:8px"><button class="btn ghost" type="button" id="case-back" style="height:28px;padding:0 10px">← ${L("กลับ", "Back")}</button><span class="mono sub">${c.id}</span>${caseStTag(c)}</div>
        <h2 style="margin-top:6px">${esc(caseName(c))}</h2>
        <div class="facts"><span class="fact">${svgI("building")}${esc(lineLabel(famLine(c.line)))}</span><span class="fact">${svgI("tag")}${tx(KINDS[c.kind])}${c.method ? " · " + tx(PMETHOD[c.method]) : ""}</span><span class="fact">${svgI("coins")}<b>${mb(rq ? rq.amount : p.est)}</b> ${L("ลบ.", "M")}</span>${rq ? `<span class="fact">${svgI("file")}<span class="mono">${rq.id}</span></span>` : ""}${con ? `<span class="fact">${svgI("pen")}<span class="mono">${con.id}</span></span>` : ""}
          ${rq && rq.splitWhy ? tag(L("มีคำชี้แจงการแตกซื้อ", "Split explained"), "p-warn") : ""}${c.egp && c.egp.bidders === 1 ? tag(L("ผู้ยื่นรายเดียว", "Single bidder"), "p-warn") : ""}</div></div>
      <div class="row">${historyBtn(c.id, c.id)}</div></div>
    <div class="body" style="padding-top:2px">${stepper(c)}</div></section>
  ${c.cancelled ? `<div class="alert"><div class="ic" style="background:var(--bad-soft);color:var(--bad)">!</div><div><b>${L("แฟ้มนี้ถูกยกเลิก", "This case was cancelled")}</b><p>${esc(c.cancelled.why)} · ${esc(userName(c.cancelled.by))} · ${fdate(c.cancelled.t, true)}</p></div></div>` : ""}
  <div class="case-grid"><div class="case-main">
  ${sec(3, L("วิธีจัดซื้อ", "Procurement method"), `
    <div class="row"><span class="sub">${L("ชนิดงาน", "Kind")}</span><b>${tx(KINDS[c.kind])}</b><span class="sub">·</span><span class="sub">${L("ระบบแนะนำ", "Advice")}</span><b>${rec.method ? tx(PMETHOD[rec.method]) : "—"}</b>${rec.rule ? tag(`${L("กฎ", "Rule")} ${rec.rule.id} · ${rec.rule.conf}`, rec.rule.conf === "A" ? "p-ok" : rec.rule.conf === "B" ? "p-info" : "p-mute") : ""}</div>
    <div class="sub">${esc(tx(rec.why))}</div>
    ${c.method ? `<div>${L("วิธีที่เลือก", "Chosen")}: <b>${tx(PMETHOD[c.method])}</b> ${c.methodApproval ? tag(c.methodApproval.status === "pending" ? L("รอหัวหน้าพัสดุอนุมัติ", "Waiting for the head") : c.methodApproval.status === "approved" ? L("หัวหน้าพัสดุอนุมัติแล้ว", "Head approved") : L("ตรงกับคำแนะนำ", "Matches the advice"), c.methodApproval.status === "pending" ? "p-warn" : "p-ok") : ""}
      ${c.special ? `<div class="sub">${L("เหตุพิเศษ", "Special reason")}: ${tx(SPECIAL[c.special])}</div>` : ""}<div class="sub">${esc(c.methodWhy ? tx(c.methodWhy) : "")}</div></div>` : ""}
    ${head && c.methodApproval && c.methodApproval.status === "pending" ? `<div class="row"><button class="btn primary" type="button" id="mt-ok">${L("อนุมัติวิธีนี้", "Approve this method")}</button><button class="btn danger" type="button" id="mt-no">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}
    ${edit && n === 3 && !(c.methodApproval && c.methodApproval.status === "pending") ? `<form class="inline-form" id="mt-form">
      <div class="f" style="flex:0 1 190px"><label for="mt-kind">${L("ชนิดงาน", "Kind")}</label><select id="mt-kind">${Object.keys(KINDS).map(k => `<option value="${k}" ${k === c.kind ? "selected" : ""}>${tx(KINDS[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 220px"><label for="mt-special">${L("เหตุพิเศษ (ถ้ามี)", "Special reason (if any)")}</label><select id="mt-special"><option value="">—</option>${Object.keys(SPECIAL).map(k => `<option value="${k}" ${k === c.special ? "selected" : ""}>${tx(SPECIAL[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 220px"><label for="mt-method">${L("วิธีจัดซื้อ", "Method")}</label><select id="mt-method">${Object.keys(PMETHOD).map(k => `<option value="${k}" ${(c.method || (rec && rec.method)) === k ? "selected" : ""}>${tx(PMETHOD[k])}${S.mrules.find(r => r.method === k) ? ` (${S.mrules.find(r => r.method === k).conf})` : ""}</option>`).join("")}</select></div>
      <div class="f" style="flex:2 1 260px"><label for="mt-why">${L("เหตุผล (บังคับเมื่อต่างจากคำแนะนำหรือมีเหตุพิเศษ)", "Reason (required when it differs from the advice or is a special case)")}</label><input type="text" id="mt-why" value="${esc(c.methodWhy ? tx(c.methodWhy) : "")}"></div>
      <button class="btn primary" type="submit">${L("บันทึกวิธี", "Save the method")}</button></form>` : ""}`)}
  ${sec(4, L("ราคากลางและ TOR", "Reference price and TOR"), `
    ${c.ref ? `<div>${L("ราคากลาง", "Reference price")}: <b>${fmt(c.ref.amount)}</b> ${L("บาท", "baht")} <span class="sub">· ${L("เทียบประมาณการในแผน", "vs the plan estimate")} ${fmt(p.est ? (c.ref.amount / p.est - 1) * 100 : 0, 1)}%</span><div class="sub">${c.ref.basis.map(b => tx(BASIS[b])).join(" · ")}${c.ref.note ? " · " + esc(c.ref.note) : ""}</div></div>` : `<span class="sub">${L("ยังไม่ได้บันทึกราคากลาง", "No reference price yet")}</span>`}
    ${edit && n === 4 ? `<form class="inline-form" id="ref-form"><div class="f" style="flex:0 1 160px"><label for="ref-amt">${L("ราคากลาง (บาท)", "Reference price (baht)")}</label><input type="number" id="ref-amt" min="1" step="1" value="${c.ref ? c.ref.amount : Math.round(p.est * 0.98 / 1e3) * 1e3}"></div>
      <div style="flex:2 1 320px"><span class="sub">${L("แหล่งอ้างอิง", "Basis")}</span><div class="row">${Object.keys(BASIS).map(k => `<label class="field-inline"><input type="checkbox" name="ref-b" value="${k}" ${c.ref && c.ref.basis.includes(k) ? "checked" : ""}> ${tx(BASIS[k])}</label>`).join("")}</div></div>
      <div class="f" style="flex:1 1 220px"><label for="ref-note">${L("หมายเหตุ", "Note")}</label><input type="text" id="ref-note" value="${esc(c.ref ? c.ref.note : "")}"></div>
      <button class="btn primary" type="submit">${L("บันทึกราคากลาง", "Save the reference price")}</button></form>` : ""}
    ${comp ? `<div>${L("TOR", "TOR")}: ${c.tor ? `<b>${esc(c.tor.doc)}</b> <span class="sub">${fdate(c.tor.t)}</span>` : `<span class="sub">${L("ยังไม่ได้แนบ", "Not attached yet")}</span>`} ${edit && n === 4 && !c.tor ? torPicker(c) : ""}</div>` : ""}`)}
  ${sec(3, L("คณะกรรมการ", "Committees"), (cm.length || c.committees.eval || c.committees.buy || c.committees.tor ? [...new Set([...cm, ...Object.keys(c.committees)])].map(cmBlock).join("") : `<span class="sub">${L("วิธีนี้ไม่ต้องมีคณะกรรมการจัดทำ TOR หรือพิจารณาผลตามค่าตั้ง (ผู้ตรวจรับตั้งตอนทำสัญญา)", "This method needs no TOR or evaluation committee under the settings (the acceptance committee is set with the contract)")}</span>`) + `<div class="sub">${L("กรรมการตรวจรับของสัญญาต้องไม่ซ้ำกรรมการพิจารณาผลหรือกรรมการซื้อจ้าง (SD-06)", "Acceptance committee members can't have sat on the evaluation or purchasing committee (SD-06)")}</div>`)}
  ${sec(4, comp ? L("การดำเนินการใน e-GP", "Sourcing in e-GP") : L("ใบเสนอราคา", "Quotations"), comp ? `
    <div class="sub">${L("ขั้นตอนทางการทำใน e-GP นำข้อมูลมาบันทึกที่นี่ (หรือนำเข้าไฟล์ในแท็บไฟล์จาก e-GP)", "The official steps run in e-GP. Record the details here (or import the e-GP file in the e-GP tab).")}</div>
    ${edit && n === 4 ? `<form class="inline-form" id="egp-form"><div class="f" style="flex:1 1 180px"><label for="eg-no">${L("รหัสโครงการ e-GP", "e-GP project no.")}</label><input type="text" id="eg-no" value="${esc(c.egp ? c.egp.no : "")}" required></div>
      <div class="f" style="flex:0 1 160px"><label for="eg-ann">${L("วันที่ประกาศ", "Announced")}</label><input type="date" id="eg-ann" value="${c.egp ? c.egp.announce : TODAY}" required></div>
      <div class="f" style="flex:0 1 160px"><label for="eg-close">${L("วันสุดท้ายยื่นข้อเสนอ", "Closing date")}</label><input type="date" id="eg-close" value="${c.egp ? c.egp.close : addDays(TODAY, 14)}" required></div>
      <button class="btn primary" type="submit">${L("บันทึกข้อมูล e-GP", "Save e-GP details")}</button></form>` : (c.egp ? `<div><span class="mono">${esc(c.egp.no)}</span> · ${L("ประกาศ", "announced")} ${fdate(c.egp.announce)} · ${L("ปิดรับ", "closes")} ${fdate(c.egp.close)} ${c.egp.bidders != null ? `· ${L("ผู้ยื่น", "bidders")} <b>${c.egp.bidders}</b>` : ""}</div>` : "")}
    ${edit && n === 5 ? `<div class="row">${c.closeElapsed || c.egp.close <= TODAY ? "" : `<button class="btn" type="button" id="case-close">${L("จำลอง: ถึงวันปิดรับข้อเสนอ", "Demo: the closing date arrives")}</button>`}
      ${c.closeElapsed || c.egp.close <= TODAY ? `<form class="inline-form" id="bid-form"><div class="f" style="flex:0 1 160px"><label for="bid-n">${L("จำนวนผู้ยื่นข้อเสนอ", "Bidders")}</label><input type="number" id="bid-n" min="0" step="1" value="${c.egp.bidders != null ? c.egp.bidders : ""}" required></div><button class="btn primary" type="submit">${L("บันทึก", "Save")}</button></form>` : ""}</div>` : ""}`
    : `${c.quotes.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ผู้เสนอราคา", "Supplier")}</th><th class="n">${L("ราคา (บาท)", "Price (baht)")}</th><th></th></tr></thead><tbody>${c.quotes.map((q, i) => `<tr><td>${esc(tx(q.vendor))}</td><td class="n">${fmt(q.price)}</td><td>${q.win ? tag(L("เลือก", "Chosen"), "p-ok") : edit && n === 4 ? `<button class="btn" type="button" data-qwin="${i}">${L("เลือกรายนี้", "Choose")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<span class="sub">${L("ยังไม่มีใบเสนอราคา", "No quotations yet")}</span>`}
      ${edit && n === 4 ? `<form class="inline-form" id="quote-form"><div class="f" style="flex:2 1 220px"><label for="q-v">${L("ผู้เสนอราคา", "Supplier")}</label><input type="text" id="q-v" required></div><div class="f" style="flex:0 1 160px"><label for="q-p">${L("ราคา (บาท)", "Price (baht)")}</label><input type="number" id="q-p" min="1" step="1" required></div><button class="btn" type="submit">+ ${L("เพิ่มใบเสนอราคา", "Add quotation")}</button></form>` : ""}`)}
  ${sec(6, L("การพิจารณาผลและประกาศผู้ชนะ", "Evaluation and award"), `
    ${comp && cm.concat(["x"]) && c.method ? cmBlock(evalKey(c)) : ""}
    ${c.award ? `<div>${L("ผู้ชนะ", "Winner")}: <b>${esc(tx(c.award.winner))}</b> · ${fmt(c.award.price)} ${L("บาท", "baht")} · ${fdate(c.award.date)} ${c.ref ? `<span class="sub">· ${L("เทียบราคากลาง", "vs reference")} ${fmt(c.award.price / c.ref.amount * 100, 1)}%</span>` : ""}${c.award.minutes ? `<div class="sub">${L("มติ", "Resolution")}: ${esc(c.award.minutes)}</div>` : ""}${c.award.why ? `<div class="sub">${L("เหตุผลราคาสูงกว่าราคากลาง", "Why above the reference price")}: ${esc(c.award.why)}</div>` : ""}</div>` : ""}
    ${edit && n === 6 ? `<form class="inline-form" id="award-form">${awardInputs(c)}
      <div class="f" style="flex:2 1 260px"><label for="aw-m">${L("มติของคณะกรรมการ", "Committee resolution")}</label><input type="text" id="aw-m" required></div>
      <div class="f" style="flex:2 1 240px"><label for="aw-w">${L("เหตุผล (ถ้าราคาสูงกว่าราคากลาง หรือผู้ชนะไม่ใช่คะแนนรวมสูงสุด)", "Why (if above the reference price, or not the top total score)")}</label><input type="text" id="aw-w"></div>
      <button class="btn primary" type="submit">${L("บันทึกผลและประกาศผู้ชนะ", "Record and announce")}</button></form>` : ""}`)}
  ${sec(7, L("อุทธรณ์", "Appeal"), ruleFor(c.method).appeal ? `
    <div>${L("กำหนดอุทธรณ์สิ้นสุด", "Appeal period ends")}: <b>${c.award && c.award.appealEnd ? fdate(c.award.appealEnd) : "—"}</b> <span class="sub">(${S.pcfg.appealDays} ${L("วันทำการ นับจากวันประกาศ ตามค่าตั้ง", "working days from the announcement, per the settings")})</span>
      ${c.appealElapsed ? tag(L("พ้นกำหนดแล้ว", "Over"), "p-ok") : c.appeal && c.appeal.status === "open" ? tag(L("มีอุทธรณ์ค้าง", "Appeal open"), "p-bad") : tag(L("อยู่ในช่วงอุทธรณ์", "Open for appeals"), "p-warn")}</div>
    ${edit && n === 7 && !c.appealElapsed && !(c.appeal && c.appeal.status === "open") ? `<div class="row"><button class="btn" type="button" id="ap-none">${L("จำลอง: พ้นกำหนดโดยไม่มีผู้อุทธรณ์", "Demo: the period ends with no appeal")}</button><button class="btn" type="button" id="ap-file">${L("จำลอง: มีผู้อุทธรณ์", "Demo: an appeal is filed")}</button></div>` : ""}
    ${c.appeal && c.appeal.status === "open" && (isProcRole() || ROLE === "exec") ? `<div class="row"><button class="btn primary" type="button" id="ap-dismiss">${L("ยกอุทธรณ์", "Dismiss the appeal")}</button><button class="btn danger" type="button" id="ap-uphold">${L("รับอุทธรณ์ กลับไปพิจารณาผล", "Uphold, back to evaluation")}</button></div>` : ""}
    ${c.appeal && c.appeal.status !== "open" ? `<div class="sub">${L("ผลอุทธรณ์", "Appeal result")}: ${c.appeal.status === "dismissed" ? L("ยก", "dismissed") : L("รับ", "upheld")}</div>` : ""}
    <div class="sub">${L("การอุทธรณ์ทำใน e-GP ภายใน 7 วันทำการ (ตามแหล่งที่ค้น ต้องยืนยัน) Fisko ติดตามกำหนดและกันการทำสัญญาก่อนพ้นกำหนด", "Appeals are filed in e-GP within 7 working days (per the sources found, to be confirmed). Fisko tracks the date and blocks the contract until it passes.")}</div>`
    : `<span class="sub">${L("วิธีนี้ไม่มีช่วงอุทธรณ์ตามค่าตั้งใน M10", "This method has no appeal period in the M10 settings")}</span>`)}
  ${sec(8, L("สัญญา", "Contract"), con ? `<div><span class="mono">${con.id}</span> · ${esc(tx(con.vendor))} · ${mb(con.amount)} ${L("ลบ.", "M")} <button class="btn" type="button" id="case-gocon">${L("เปิดสัญญา", "Open the contract")}</button></div>${closePanel(c, con)}` : `<span class="sub">${n === 8 ? L("พร้อมสร้างสัญญา วงเงินสัญญาต้องไม่เกินราคาที่ประกาศ", "Ready for the contract. Its amount can't exceed the announced price.") : ""}</span>`)}
  ${CASE_PANELS.map(f => f(c)).join("")}
  </div><aside class="case-side">
  ${n >= 1 && n <= 8 && !c.cancelled ? `<section class="panel nextcard"><header>${chipIco("arrow", "ok")}<h2>${L("ขั้นตอนนี้", "This step")}: ${tx([CASE_STATES[n].th, CASE_STATES[n].en])}</h2><span class="sp"></span>${whoTag(nx.who)}</header>
    <div class="body"><ul class="check">${chk.length ? chk.map(x => `<li><span class="m ${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "×"}</span><div>${esc(x.label)}</div></li>`).join("") : `<li class="sub">${esc(L(nx.th, nx.en))}</li>`}</ul>
      <div class="row" style="margin-top:10px">${edit && [3, 4, 5].includes(n) ? `<button class="btn primary" type="button" id="case-move" ${allOk ? "" : "disabled"}>${n === 3 ? L("ไปขั้นจัดทำ TOR และราคากลาง", "Move to TOR and reference price") : n === 4 ? (comp ? L("เข้าสู่การดำเนินการใน e-GP", "Move to e-GP sourcing") : L("ประกาศผู้เสนอราคาที่เลือก", "Award to the chosen supplier")) : L("เข้าสู่การพิจารณาผล", "Move to evaluation")}</button>` : ""}
        ${edit && n === 7 && !(c.appeal && c.appeal.status === "open") ? `<button class="btn primary" type="button" id="case-move" ${allOk ? "" : "disabled"}>${L("ไปขั้นทำสัญญา", "Move to contracting")}</button>` : ""}
        ${n === 8 && isProcRole() ? `<button class="btn primary" type="button" id="case-tocon">${L("สร้างสัญญา", "Create the contract")}</button>` : ""}
        ${(edit && n >= 4 && n <= 7) || (isProcRole() && n >= 2 && n <= 8) ? `<input type="text" id="case-reason" placeholder="${L("เหตุผล (สำหรับล้มเหลวหรือยกเลิก)", "Reason (for failed or cancel)")}" style="min-width:220px" aria-label="${L("เหตุผล", "Reason")}">` : ""}
        ${edit && n >= 4 && n <= 7 ? `<button class="btn" type="button" id="case-fail">${L("ล้มเหลว ดำเนินการใหม่", "Failed, rerun")}</button>` : ""}
        ${isProcRole() && n >= 2 && n <= 8 ? `<button class="btn danger" type="button" id="case-cancel">${L("ยกเลิกการจัดซื้อ", "Cancel procurement")}</button>` : ""}</div></div></section>` : ""}
  <section class="panel"><header><h2>${L("ไทม์ไลน์ของแฟ้ม", "Case timeline")}</h2><span class="sp"></span><span class="sub">${ev.length} ${L("เหตุการณ์", "events")}</span></header>
    <div class="body"><ol class="timeline">${ev.map(e => `<li class="done"><span class="dot"></span><div><b style="font-weight:600">${tx(CASE_EV[e.type] || [e.type, e.type])}</b><small>${esc(userName(e.by))} · ${fdate(e.t, true)}</small>${e.detail ? `<div class="sub">${esc(e.detail)}</div>` : ""}</div></li>`).join("") || `<li class="sub">—</li>`}</ol></div></section></aside></div>`;
}

// ---------- actions ----------
function bindCases() {
  const sel = $("#cs-grp"); if (sel) sel.onchange = () => { CASE_GROUP = sel.value; route(); };
  $$("[data-copen]").forEach(b => (b.onclick = () => { CASE_OPEN = b.dataset.copen; route(); }));
  const back = $("#case-back"); if (back) back.onclick = () => { CASE_OPEN = null; route(); };
  const c = CASE_OPEN ? caseOf(CASE_OPEN) : null;
  if (!c) return;
  const done = msg => { commit(); renderShell(); route(); if (msg) toast(msg); };
  const mv = $("#case-move"); if (mv) mv.onclick = () => { if (caseMove(c)) done(L("ไปขั้นต่อไปแล้ว", "Moved to the next step")); };
  const tc = $("#case-tocon"); if (tc) tc.onclick = () => { CT_FROM = c.id; PROC_TAB = "contracts"; route(); };
  const gc = $("#case-gocon"); if (gc) gc.onclick = () => { PROC_TAB = "contracts"; route(); };
  const fl = $("#case-fail"); if (fl) fl.onclick = () => {
    const why = ($("#case-reason").value || "").trim();
    if (why.length < 5) { toast(L("ระบุเหตุผลอย่างน้อย 5 ตัวอักษร", "Give a reason of at least 5 characters")); return; } caseFail(c, why); done(L("กลับไปขั้นจัดทำ TOR เพื่อดำเนินการใหม่", "Back to specifying to rerun"));
  };
  const cc = $("#case-cancel"); if (cc) cc.onclick = () => { const why = ($("#case-reason").value || "").trim(); if (why.length < 5) { toast(L("ระบุเหตุผลอย่างน้อย 5 ตัวอักษร", "Give a reason of at least 5 characters")); return; } caseCancel(c, why); CASE_OPEN = null; done(L("ยกเลิกแล้ว วงเงินที่จองถูกคืน", "Cancelled, the reserved amount is released")); };
  const mf = $("#mt-form");
  if (mf) mf.onsubmit = e => {
    e.preventDefault();
    c.kind = $("#mt-kind").value; c.special = $("#mt-special").value || null;
    const method = $("#mt-method").value, why = $("#mt-why").value.trim(), rec = recommendMethod(c), rp = c.ref ? c.ref.amount : famPlan(c.plan).est;
    if (method === "specific" && !c.special && rp > S.pcfg.specificMax) { toast(L(`วงเงินสูงกว่า ${fmt(S.pcfg.specificMax)} บาท ใช้วิธีเฉพาะเจาะจงได้เฉพาะมีเหตุพิเศษ`, `Above ${fmt(S.pcfg.specificMax)} baht the specific method needs a special reason`)); return; }
    const differs = method !== rec.method, needHead = differs || !!c.special;
    if (needHead && why.length < 10) { toast(L("ต้องมีเหตุผลอย่างน้อย 10 ตัวอักษรเมื่อต่างจากคำแนะนำหรือมีเหตุพิเศษ", "Give a reason of at least 10 characters when it differs from the advice or is a special case")); return; }
    c.method = method; c.methodWhy = [why || tx(rec.why), why || tx(rec.why)]; famPlan(c.plan).method = method;
    c.methodApproval = needHead ? { status: "pending", t: nowIso(), by: me().id } : { status: "auto", t: nowIso(), by: me().id };
    audit(["เลือกวิธีจัดซื้อ", "Chose the procurement method"], `${c.id} ${tx(PMETHOD[method])}${needHead ? " · รอหัวหน้าพัสดุ" : ""}`); caseLog(c, "method", `${tx(PMETHOD[method])}${needHead ? " (" + L("รอหัวหน้าพัสดุ", "waiting for the head") + ")" : ""}`);
    if (needHead) notify(["prochead"], [`แฟ้ม ${c.id} รออนุมัติวิธีจัดซื้อ`, `Case ${c.id} needs method approval`], `case:${c.id}`);
    done(needHead ? L("ส่งให้หัวหน้าพัสดุอนุมัติ", "Sent to the head of procurement") : L("บันทึกวิธีแล้ว", "Method saved"));
  };
  const head = ok => { c.methodApproval = { status: ok ? "approved" : "none", t: nowIso(), by: me().id }; if (!ok) { c.method = null; c.methodWhy = null; } audit([ok ? "อนุมัติวิธีจัดซื้อ" : "ไม่อนุมัติวิธีจัดซื้อ", ok ? "Approved a method" : "Rejected a method"], c.id); caseLog(c, ok ? "method_ok" : "method_no"); notify(["proc"], [`แฟ้ม ${c.id} ${ok ? "ได้รับอนุมัติวิธีแล้ว" : "ไม่ได้รับอนุมัติวิธี ต้องเลือกใหม่"}`, `Case ${c.id}: the method was ${ok ? "approved" : "rejected, choose again"}`], `case:${c.id}`); done(ok ? L("อนุมัติแล้ว", "Approved") : L("ไม่อนุมัติ", "Rejected")); };
  const mo = $("#mt-ok"); if (mo) mo.onclick = () => head(true);
  const mn = $("#mt-no"); if (mn) mn.onclick = () => head(false);
  const rf = $("#ref-form");
  if (rf) rf.onsubmit = e => {
    e.preventDefault();
    const amount = Math.round(Number($("#ref-amt").value)), basis = $$('input[name="ref-b"]:checked').map(x => x.value);
    if (!(amount > 0) || !basis.length) { toast(L("ใส่ราคากลางและเลือกแหล่งอ้างอิงอย่างน้อย 1 แหล่ง", "Enter the price and choose at least one basis")); return; }
    c.ref = { amount, basis, note: $("#ref-note").value.trim(), by: me().id, t: nowIso() };
    audit(["บันทึกราคากลาง", "Recorded a reference price"], `${c.id} ${fmt(amount)}`); caseLog(c, "ref", `${fmt(amount)} ${L("บาท", "baht")}`); done(L("บันทึกราคากลางแล้ว", "Reference price saved"));
  };
  const ta = $("#tor-attach"); if (ta) ta.onclick = () => { const tp = $("#tor-tpl") ? torTpl($("#tor-tpl").value) : null; c.tor = { doc: tp ? `TOR_${c.id}_${tp.id}-v${tp.v}.pdf` : `TOR_${c.id}_v1.pdf`, tpl: tp ? tp.id : null, tplV: tp ? tp.v : null, t: nowIso(), by: me().id }; audit(["แนบ TOR", "Attached a TOR"], c.id); caseLog(c, "tor", c.tor.doc); done(L("แนบ TOR แล้ว", "TOR attached")); };
  $$("[data-cmform]").forEach(f => (f.onsubmit = e => {
    e.preventDefault();
    const key = f.dataset.cmform, fd = new FormData(f), members = $$(`input[name="cm-${key}"]:checked`).map(x => x.value).filter(id => id !== fd.get("chair"));
    if (members.length < S.pcfg.minMembers - 1) { toast(L(`ต้องมีกรรมการอย่างน้อย ${S.pcfg.minMembers - 1} คนนอกจากประธาน`, `At least ${S.pcfg.minMembers - 1} members besides the chair`)); return; }
    if ((key === "eval" || key === "buy") && committeeMembers(c.committees.tor).length === 0 && false) return;
    c.committees[key] = { order: fd.get("order").trim(), date: fd.get("date"), chair: fd.get("chair"), members, t: nowIso() };
    audit(["แต่งตั้งคณะกรรมการ", "Appointed a committee"], `${c.id} ${tx(COMMITTEES[key])} · ${c.committees[key].order}`); caseLog(c, "committee", `${tx(COMMITTEES[key])} · ${c.committees[key].order}`); done(L("บันทึกคำสั่งแต่งตั้งแล้ว", "Order saved"));
  }));
  const ef = $("#egp-form");
  if (ef) ef.onsubmit = e => {
    e.preventDefault();
    const no = $("#eg-no").value.trim(), ann = $("#eg-ann").value, close = $("#eg-close").value;
    if (close < ann) { toast(L("วันปิดรับต้องไม่ก่อนวันประกาศ", "The closing date can't be before the announcement")); return; }
    c.egp = Object.assign(c.egp || {}, { no, announce: ann, close, stage: c.egp && c.egp.stage || [["ประกาศเชิญชวน", "Invitation"][0], "Invitation"], date: ann, bidders: c.egp ? c.egp.bidders : null });
    famPlan(c.plan).egp = { no, stage: c.egp.stage, date: ann };
    audit(["บันทึกข้อมูล e-GP ของแฟ้ม", "Recorded e-GP details for a case"], `${c.id} ${no}`); caseLog(c, "egp", `${no} · ${fdate(ann)} – ${fdate(close)}`); done(L("บันทึกข้อมูล e-GP แล้ว", "e-GP details saved"));
  };
  const cl = $("#case-close"); if (cl) cl.onclick = () => { c.closeElapsed = true; caseLog(c, "closed", c.egp.close); done(); };
  const bf = $("#bid-form");
  if (bf) bf.onsubmit = e => {
    e.preventDefault();
    c.egp.bidders = Math.max(0, Math.round(Number($("#bid-n").value))); caseLog(c, "bidders", `${c.egp.bidders}`);
    if (c.egp.bidders === 0) { caseFail(c, L("ไม่มีผู้ยื่นข้อเสนอ", "No bidders")); done(L("ไม่มีผู้ยื่น กลับไปดำเนินการใหม่", "No bidders, back to rerun")); return; }
    done(c.egp.bidders === 1 ? L("บันทึกแล้ว ผู้ยื่นรายเดียว ระบบติดสัญญาณเตือน RF-03", "Saved: a single bidder, flagged for RF-03") : L("บันทึกจำนวนผู้ยื่นแล้ว", "Bidders saved"));
  };
  const qf = $("#quote-form");
  if (qf) qf.onsubmit = e => { e.preventDefault(); const v = $("#q-v").value.trim(); c.quotes.push({ vendor: [v, v], price: Math.round(Number($("#q-p").value)), win: false }); caseLog(c, "quote", `${v} · ${fmt(c.quotes[c.quotes.length - 1].price)}`); done(); };
  $$("[data-qwin]").forEach(b => (b.onclick = () => { c.quotes.forEach((q, i) => (q.win = i === Number(b.dataset.qwin))); audit(["เลือกผู้เสนอราคา", "Chose a quotation"], c.id); done(); }));
  const af = $("#award-form");
  if (af) af.onsubmit = e => {
    e.preventDefault();
    const key = evalKey(c), price = Math.round(Number($("#aw-p").value)), why = $("#aw-w").value.trim(), rq = caseReq(c);
    if (!committeeOk(c.committees[key])) { toast(L("แต่งตั้งคณะกรรมการพิจารณาผลก่อน", "Appoint the evaluation committee first")); return; }
    if (price > rq.amount) { toast(L("ราคาที่ประกาศสูงกว่าวงเงินที่อนุมัติ", "The announced price is above the approved amount")); return; }
    if (c.ref && price > c.ref.amount && !why) { toast(L("ราคาสูงกว่าราคากลาง ต้องระบุเหตุผล", "The price is above the reference price; give a reason")); return; }
    const guard = awardGuard(c, $("#aw-v").value.trim(), price, why); if (guard) { toast(guard); return; }
    const v = $("#aw-v").value.trim(), date = TODAY, rule = ruleFor(c.method);
    c.award = { winner: [v, v], price, date, appealEnd: rule.appeal ? addWorkdays(date, S.pcfg.appealDays) : null, minutes: $("#aw-m").value.trim(), why };
    c.appealElapsed = false; c.appeal = null;
    setState(c, 7, "award", `${v} · ${fmt(price)}`); audit(["ประกาศผู้ชนะ", "Announced the winner"], `${c.id} ${v} ${fmt(price)}`);
    done(rule.appeal ? L(`ประกาศผู้ชนะแล้ว กำหนดอุทธรณ์สิ้นสุด ${fdate(c.award.appealEnd)}`, `Winner announced; appeals close ${fdate(c.award.appealEnd)}`) : L("ประกาศผู้ชนะแล้ว", "Winner announced"));
  };
  const an = $("#ap-none"); if (an) an.onclick = () => { c.appealElapsed = true; caseLog(c, "appeal_elapsed", fdate(c.award.appealEnd)); done(L("พ้นกำหนดอุทธรณ์แล้ว", "The appeal period is over")); };
  const af2 = $("#ap-file"); if (af2) af2.onclick = () => { c.appeal = { status: "open", t: nowIso() }; audit(["มีการอุทธรณ์ผลการพิจารณา", "An appeal was filed"], c.id); caseLog(c, "appeal_filed"); notify(["exec"], [`แฟ้ม ${c.id} มีการอุทธรณ์`, `Case ${c.id} has an appeal`], `case:${c.id}`); done(L("บันทึกการอุทธรณ์แล้ว ห้ามทำสัญญาจนกว่าจะมีผล", "Appeal recorded; no contract until it is decided")); };
  const ad = $("#ap-dismiss"); if (ad) ad.onclick = () => { c.appeal.status = "dismissed"; c.appealElapsed = true; audit(["ยกอุทธรณ์", "Dismissed an appeal"], c.id); caseLog(c, "appeal_dismissed"); done(L("ยกอุทธรณ์แล้ว", "Appeal dismissed")); };
  const au = $("#ap-uphold"); if (au) au.onclick = () => { c.appeal.status = "upheld"; const aw = c.award; c.award = null; c.appealElapsed = false; setState(c, 6, "appeal_upheld", aw ? fmt(aw.price) : ""); audit(["รับอุทธรณ์", "Upheld an appeal"], c.id); done(L("รับอุทธรณ์ กลับไปพิจารณาผลใหม่", "Upheld; back to evaluation")); };
  CASE_BINDS.forEach(f => f(c, done));
}
{
  const base = BIND.procurement;
  BIND.procurement = () => { base(); if (PROC_TAB === "cases") bindCases(); };
}
// Deep link "case:<id>" opens a case file.
{
  const baseJump = jump;
  jump = l => { if (typeof l === "string" && l.startsWith("case:")) { CASE_OPEN = l.slice(5); PROC_TAB = "cases"; return go("procurement"); } return baseJump(l); };
}

// ---------- tasks, search, M10 rules ----------
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.cases || !isProcRole()) return;
    S.cases.forEach(c => {
      const n = caseState(c), nx = caseNext(c);
      if (c.cancelled || n < 3 || n > 8) return;
      if (ROLE === "prochead" && c.methodApproval && c.methodApproval.status === "pending") R(`${L("อนุมัติวิธีจัดซื้อ", "Approve the method")} ${c.id}`, caseName(c), TODAY, `case:${c.id}`, "p-warn");
      else if (ROLE === "prochead" && c.appeal && c.appeal.status === "open") R(`${L("ตัดสินอุทธรณ์", "Decide the appeal")} ${c.id}`, caseName(c), TODAY, `case:${c.id}`, "p-bad");
      else if (nx.who === "proc") R(`${c.id} · ${nx.raw ? nx.th : L(nx.th, nx.en)}`, `${caseName(c)} · ${tx([CASE_STATES[n].th, CASE_STATES[n].en])}`, TODAY, `case:${c.id}`, "p-info");
    });
  };
  const sbase = searchItems;
  Object.assign(STYPE, { pcase: ["แฟ้มจัดซื้อ", "Procurement case"] });
  searchItems = () => {
    const out = sbase();
    if (allowed("procurement")) (S.cases || []).forEach(c => { const label = `${c.id} ${caseName(c)}`, sub = c.cancelled ? L("ยกเลิก", "Cancelled") : tx([CASE_STATES[caseState(c)].th, CASE_STATES[caseState(c)].en]); out.push({ type: "pcase", label, sub, run: () => jump("case:" + c.id), hay: (label + " " + sub + " " + famPlan(c.plan).name.join(" ") + " " + (c.egp ? c.egp.no : "")).toLowerCase() }); });
    return out;
  };
}

ADMIN_TABS.push({ id: "procrules", roles: ["admin", "audit", "proc", "prochead"], label: ["กฎจัดซื้อจัดจ้าง", "Procurement rules"] });
const CONF_TAG = c => tag(c, c === "A" ? "p-ok" : c === "B" ? "p-info" : "p-mute");
ADMIN.procrules = () => {
  const ad = isAdmin(), cfg = S.pcfg, num = (k, lbl, hint) => `<div class="f" style="flex:0 1 190px"><label for="pc-${k}">${lbl}</label><input type="number" id="pc-${k}" min="0" step="any" value="${cfg[k]}" ${ad ? "" : "disabled"}><span class="sub">${hint}</span></div>`;
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("ค่าตั้งเหล่านี้ไม่ใช่คำวินิจฉัยทางกฎหมาย", "These settings are not legal advice")}</b>
    <p>${L("ระดับ A คือข้อเท็จจริงที่ยืนยันกับตัวบทแล้ว ระดับ B และ C เป็นค่าตั้งต้นที่หน่วยงานต้องยืนยันกับระเบียบและหนังสือเวียนที่ใช้อยู่ก่อนใช้จริง", "Level A is confirmed against the text. Levels B and C are starting values the agency must confirm against the current rules and circulars before real use.")}</p></div></div>
  <section class="panel"><header><h2>${L("ตารางเลือกวิธีจัดซื้อ", "Method decision table")}</h2><span class="sp"></span>${tag(ad ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), ad ? "p-ok" : "p-mute")}</header>
    <div class="tbl-wrap"><table><thead><tr><th class="c" style="width:70px">${L("ใช้งาน", "On")}</th><th>${L("รหัส", "ID")}</th><th>${L("เงื่อนไข", "Condition")}</th><th>${L("วิธี", "Method")}</th><th>${L("คณะกรรมการ", "Committees")}</th><th class="c">${L("อุทธรณ์", "Appeal")}</th><th class="c">${L("ระดับ", "Level")}</th><th>${L("มีผลตั้งแต่", "Effective")}</th></tr></thead>
      <tbody>${S.mrules.map(r => `<tr><td class="c">${sw("mr-" + r.id, r.on !== false, !ad)}</td><td class="mono">${r.id}</td><td>${tx(r.cond)}</td><td>${tx(PMETHOD[r.method])}</td>
        <td class="sub">${(r.committees || []).map(k => tx(COMMITTEES[k])).join(", ") || "—"}</td><td class="c">${r.appeal ? "✓" : "—"}</td><td class="c">${CONF_TAG(r.conf)}</td><td class="sub">${fdate(r.effective)}</td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${L("ปิดกฎใดแล้ว ระบบจะไม่แนะนำวิธีนั้น และบันทึกในบันทึกการใช้งาน กฎมีวันที่มีผลเพื่อรองรับการแก้ระเบียบ", "Switching a rule off stops the advice for that method and is recorded. Rules have an effective date so a change of regulation can be added.")}</div></section>
  <section class="panel"><header><h2>${L("ค่าตั้งทั่วไป", "General settings")}</h2></header>
    <div class="body inline-form">
      ${num("specificMax", L("เพดานวิธีเฉพาะเจาะจง (บาท)", "Specific-method ceiling (baht)"), CONF_TAG("A"))}
      ${num("singleInspectorMax", L("ตรวจรับคนเดียวได้ไม่เกิน (บาท)", "Single inspector up to (baht)"), CONF_TAG("A"))}
      ${num("minMembers", L("กรรมการอย่างน้อย (รวมประธาน)", "Committee size (with chair)"), CONF_TAG("A"))}
      ${num("appealDays", L("ช่วงอุทธรณ์ (วันทำการ)", "Appeal period (working days)"), CONF_TAG("B"))}
      ${num("splitDays", L("ช่วงตรวจการแตกซื้อ (วัน)", "Split-purchase look-back (days)"), CONF_TAG("C"))}
      ${num("penaltyPct", L("ค่าปรับ (ร้อยละต่อวัน)", "Penalty (% per day)"), CONF_TAG("C"))}
      ${num("penaltyCapPct", L("เตือนเมื่อค่าปรับสะสมเกิน (ร้อยละของสัญญา)", "Warn when penalties pass (% of contract)"), CONF_TAG("B"))}
      ${num("guaranteePct", L("หลักประกันสัญญา (ร้อยละ)", "Contract guarantee (%)"), CONF_TAG("C"))}
      ${num("guaranteeWarnDays", L("เตือนก่อนหลักประกันหมดอายุ (วัน)", "Warn before the guarantee expires (days)"), CONF_TAG("C"))}
      ${num("ladderPct", L("แก้ไขวงเงินถึงร้อยละนี้ หัวหน้าพัสดุอนุมัติ", "Amount changes up to this % need the head"), CONF_TAG("C"))}
      ${num("extDaysHead", L("ขยายเวลาถึงกี่วัน หัวหน้าพัสดุอนุมัติ", "Extensions up to this many days need the head"), CONF_TAG("C"))}
      ${num("acceptWd", L("ตรวจรับงานก่อสร้าง งวดทั่วไป (วันทำการ)", "Construction acceptance, ordinary phase (working days)"), CONF_TAG("B"))}
      ${num("acceptWdLast", L("ตรวจรับงานก่อสร้าง งวดสุดท้าย (วันทำการ)", "Construction acceptance, last phase (working days)"), CONF_TAG("B"))}
      ${num("invoiceTol", L("ค่าเผื่อใบแจ้งหนี้ (บาท)", "Invoice tolerance (baht)"), CONF_TAG("C"))}
      ${num("rfMinAnnounce", L("RF-08 ระยะประกาศขั้นต่ำ (วัน)", "RF-08 shortest announcement (days)"), CONF_TAG("C"))}
      ${num("rfRatioPct", L("RF-05 ราคาชนะต่อราคากลาง (ร้อยละ)", "RF-05 winning price vs reference (%)"), CONF_TAG("C"))}
      ${num("rfGrowthPct", L("RF-06 สัญญาโตเกิน (ร้อยละ)", "RF-06 contract growth over (%)"), CONF_TAG("C"))}
      ${num("rfRepeatWins", L("RF-04 ชนะซ้ำตั้งแต่ (ครั้ง)", "RF-04 repeat wins from (count)"), CONF_TAG("C"))}
      ${num("rfNearPct", L("RF-02 ใกล้เพดาน (ร้อยละ)", "RF-02 near the ceiling (%)"), CONF_TAG("C"))}
      ${ad ? `<button class="btn primary" type="button" id="pc-save">${L("บันทึกค่าตั้ง", "Save settings")}</button>` : ""}</div></section>
  <section class="panel"><header><h2>${L("วันหยุดราชการ (ตัวอย่าง)", "Public holidays (sample)")}</h2><span class="sp"></span><span class="sub">${L("ใช้นับวันทำการของช่วงอุทธรณ์", "Used to count working days in the appeal period")}</span></header>
    <div class="body row">${S.holidays.map((h, i) => `<span class="pill p-mute">${fdate(h)}${ad ? ` <button class="btn ghost" type="button" data-hrm="${i}" aria-label="${L("ลบ", "Remove")} ${h}">×</button>` : ""}</span>`).join("") || "—"}</div>
    ${ad ? `<div class="body"><form class="inline-form" id="hol-form"><div class="f" style="flex:0 1 180px"><label for="hol-d">${L("เพิ่มวันหยุด", "Add a holiday")}</label><input type="date" id="hol-d" required></div><button class="btn" type="submit">+ ${L("เพิ่ม", "Add")}</button></form></div>` : ""}</section>`;
};
BIND_ADMIN.procrules = () => {
  S.mrules.forEach(r => { const el = $("#mr-" + r.id); if (el && !el.disabled) el.onchange = () => {
    r.on = el.checked; audit([el.checked ? "เปิดกฎเลือกวิธีจัดซื้อ" : "ปิดกฎเลือกวิธีจัดซื้อ", el.checked ? "Switched a method rule on" : "Switched a method rule off"], r.id);
    if (!el.checked) notify(["audit", "prochead"], [`ผู้ดูแลระบบปิดกฎเลือกวิธี ${r.id}`, `An administrator switched off method rule ${r.id}`], "admin-procrules");
    commit(); route(); toast(L("บันทึกแล้ว", "Saved")); }; });
  const sv = $("#pc-save");
  if (sv) sv.onclick = () => {
    const v = {}; for (const k of ["specificMax", "singleInspectorMax", "minMembers", "appealDays", "splitDays", "penaltyPct", "penaltyCapPct", "guaranteePct", "guaranteeWarnDays", "ladderPct", "extDaysHead", "acceptWd", "acceptWdLast", "invoiceTol", "rfMinAnnounce", "rfRatioPct", "rfGrowthPct", "rfRepeatWins", "rfNearPct"]) { const x = Number($("#pc-" + k).value); v[k] = k === "penaltyPct" ? x : Math.round(x); }
    if (Object.values(v).some(x => !(x >= 0)) || v.minMembers < 2 || v.specificMax < 1 || v.singleInspectorMax < 1) { toast(L("ค่าไม่ถูกต้อง", "Check the values")); return; }
    Object.assign(S.pcfg, v); S.mrules.filter(r => r.id === "MR-01").forEach(r => (r.max = v.specificMax));
    audit(["แก้ค่าตั้งจัดซื้อจัดจ้าง", "Changed procurement settings"], Object.entries(v).map(([k, x]) => `${k}=${x}`).join(" ")); commit(); route(); toast(L("บันทึกค่าตั้งแล้ว", "Settings saved"));
  };
  const hf = $("#hol-form");
  if (hf) hf.onsubmit = e => { e.preventDefault(); const d = $("#hol-d").value; if (!S.holidays.includes(d)) { S.holidays.push(d); S.holidays.sort(); audit(["เพิ่มวันหยุด", "Added a holiday"], d); commit(); } route(); };
  $$("[data-hrm]").forEach(b => (b.onclick = () => { const d = S.holidays.splice(Number(b.dataset.hrm), 1)[0]; audit(["ลบวันหยุด", "Removed a holiday"], d); commit(); route(); }));
};

// ---------- seed ----------
function seedCases(s, K) {
  const cond = (th, en) => [th, en];
  s.pcfg = { specificMax: 500000, singleInspectorMax: 100000, minMembers: 3, appealDays: 7, splitDays: 90 };
  s.holidays = ["2026-10-23", "2026-12-05", "2026-12-10", "2026-12-31"];
  s.mrules = [
    { id: "MR-01", type: "value", kind: "any", max: 500000, method: "specific", cond: cond("วงเงินไม่เกินเพดานวิธีเฉพาะเจาะจง", "Value within the specific-method ceiling"), committees: [], appeal: false, conf: "A", effective: "2017-08-23", on: true },
    { id: "MR-02", type: "value", kind: "any", max: null, method: "ebid", cond: cond("วงเงินสูงกว่าเพดานวิธีเฉพาะเจาะจง (ค่าตั้งต้น ต้องยืนยันเกณฑ์ตามประเภทงาน)", "Above the specific-method ceiling (starting value; confirm thresholds by kind of work)"), committees: ["tor", "eval"], appeal: true, conf: "B", effective: "2017-08-23", on: true },
    { id: "MR-03", type: "special", kind: "any", max: null, method: "specific", cond: cond("เหตุพิเศษ: ฉุกเฉิน ผู้ผลิตรายเดียว หรือซื้อเพิ่มจากสัญญาเดิม (ต้องมีหัวหน้าพัสดุอนุมัติ)", "Special case: emergency, sole source or repeat purchase (head must approve)"), committees: [], appeal: false, conf: "B", effective: "2017-08-23", on: true },
    { id: "MR-04", type: "alt", kind: "any", max: null, method: "selective", cond: cond("วิธีคัดเลือก ใช้เมื่อมีเหตุตามระเบียบเท่านั้น (เลือกเองได้โดยหัวหน้าพัสดุอนุมัติ)", "Selective method, only for the reasons the rules allow (head must approve)"), committees: ["buy"], appeal: false, conf: "C", effective: "2017-08-23", on: true },
    { id: "MR-05", type: "alt", kind: "any", max: null, method: "emarket", cond: cond("e-market สำหรับรายการในระบบ (ต้องยืนยันเงื่อนไข)", "e-market for catalogue items (confirm the conditions)"), committees: [], appeal: false, conf: "C", effective: "2017-08-23", on: true },
  ];
  const order = ["fin", "div", "plan", "exec"], cand = s.users.filter(u => u.active && order.includes(u.role) && u.id !== K.PL && u.id !== K.DV).sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).map(u => u.id);
  const cmt = (order_, date) => ({ order: order_, date, chair: cand[0], members: cand.slice(1, 3), t: date + "T10:00" });
  s.caseEvents = [];
  const ev = (c, t, type, by, detail) => s.caseEvents.push({ t, case: c.id, type, by, detail: detail || "", state: c.state });
  const states = [9, 9, 5, 2, 1, 1];
  s.cases = s.pplan.map((p, i) => {
    const n = states[i] || 1, rq = s.reqn[i], ct = s.contracts[i];
    const c = { id: "PC-2570-" + String(i + 1).padStart(3, "0"), plan: p.id, reqn: rq ? rq.id : null, line: p.line, kind: p.kind, state: n, method: null, methodWhy: null, special: null, methodApproval: null, committees: {}, ref: null, tor: null, egp: null, quotes: [], award: null, appeal: null, appealElapsed: false, closeElapsed: false, contract: null, cancelled: null };
    ev(c, "2026-07-15T09:00", "created", K.PO, p.id);
    if (n >= 2) ev(c, rq.t, "requested", rq.by, rq.id);
    if (n >= 3) ev(c, rq.decided.t, "approved", K.EX, rq.id);
    if (n >= 3) {
      c.method = p.est <= 5e5 ? "specific" : "ebid"; c.methodWhy = ["ตรงกับคำแนะนำของระบบ", "Matches the system advice"]; c.methodApproval = { status: "auto", t: rq.decided.t, by: K.PO };
      ev(c, rq.decided.t.slice(0, 10) + "T16:30", "method", K.PO, c.method);
    }
    if (n >= 4 && c.method === "ebid") {
      const mo = i < 2 ? "08" : "09";
      c.ref = { amount: Math.round(p.est * 0.98 / 1e3) * 1e3, basis: ["std", "quotes"], note: "", by: K.PO, t: `2026-${mo}-10T10:00` };
      c.tor = { doc: `TOR_${c.id}_v1.pdf`, t: `2026-${mo}-12T10:00`, by: K.PO }; c.committees.tor = cmt("ที่ 41/2569", `2026-${mo}-11`);
      ev(c, `2026-${mo}-10T10:00`, "ref", K.PO, fmt(c.ref.amount)); ev(c, `2026-${mo}-11T10:00`, "committee", K.PO, "TOR"); ev(c, `2026-${mo}-12T10:00`, "tor", K.PO, c.tor.doc);
    }
    if (n >= 5) {
      const live = i === 2;
      c.egp = { no: (p.egp && p.egp.no) || "EGP-70-01" + String(i + 1).padStart(2, "0"), announce: live ? "2026-10-14" : "2026-09-03", close: live ? "2026-10-30" : "2026-09-17", stage: p.egp ? p.egp.stage : [["ประกาศเชิญชวน", "Invitation"][0], "Invitation"], date: live ? "2026-10-14" : "2026-09-03", bidders: null };
      ev(c, c.egp.announce + "T09:00", "sourcing", K.PO, c.egp.no);
    }
    if (n >= 9) {
      c.egp.bidders = i === 1 ? 1 : 3; c.committees.eval = cmt("ที่ 52/2569", "2026-09-18");
      const awd = i === 0 ? "2026-09-24" : "2026-09-25", end = i === 0 ? "2026-10-05" : "2026-10-06";
      c.award = { winner: ct.vendor, price: ct.amount, date: awd, appealEnd: end, minutes: "มติเห็นชอบผู้เสนอราคาต่ำสุดที่ผ่านเกณฑ์", why: "" }; c.appealElapsed = true; c.closeElapsed = true; c.contract = ct.id; c.state = 9;
      ev(c, "2026-09-17T16:30", "bidders", K.PO, `${c.egp.bidders}`); ev(c, awd + "T14:00", "award", K.PO, `${ct.vendor[0]} · ${fmt(ct.amount)}`); ev(c, end + "T16:30", "appeal_elapsed", K.PO, end); ev(c, ct.signed + "T14:00", "contract", K.PO, `${ct.id} · ${mb(ct.amount)}`);
    }
    return c;
  });
  s.caseEvents.sort((a, b) => (a.t < b.t ? 1 : -1));
}
