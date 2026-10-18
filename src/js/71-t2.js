// Fisko Procurement round 38 (T2 of design v0.3, chapter 18): bid security (FR-PR-71, R-20), samples and type tests
// (FR-PR-72, R-21), SME and MiT preference with bidder details and supplier history (FR-PR-69, 70, 73, R-26),
// appeals forwarded to the central body (FR-PR-74, R-22) and a supplier portal role (FR-PR-66, simulated).
// Every part sits behind a profile switch from 70-profile.js. Sending and the supplier's own sign-in are simulated (D-P17).

["bidSec", "sampleTest", "smeMit", "vendorPortal"].forEach(k => { const f = PROF_FEATS.find(x => x.k === k); if (f) f.built = true; });
PROF_FEATS.splice(PROF_FEATS.findIndex(f => f.k === "bidSec") + 1, 0, { k: "appealFwd", round: "T2", gov: true, soe: true, th: "อุทธรณ์ส่งหน่วยงานกลาง (แบบ อธ.1)", en: "Appeal forwarded to the central body", tor: "ผนวก 12 s.3.4", built: true });
DOC_TYPES.ap1 = ["แบบ อธ.1 ส่งหน่วยงานกลาง", "Appeal form to the central body"];
Object.assign(CASE_EV, {
  bsec_add: ["รับหลักประกันการเสนอราคา", "Bid security received"], bsec_ext: ["ขยายอายุหลักประกันการเสนอราคา", "Bid security extended"], bsec_ret: ["คืนหลักประกันการเสนอราคา", "Bid security returned"], bsec_forf: ["ริบหลักประกันการเสนอราคา", "Bid security forfeited"],
  test_add: ["ขอตัวอย่างทดสอบ", "Sample test requested"], test_upd: ["บันทึกความคืบหน้าการทดสอบ", "Test progress recorded"], test_res: ["บันทึกผลทดสอบ", "Test result recorded"],
  bid_det: ["บันทึกรายละเอียดข้อเสนอ", "Bid details recorded"], appeal_fwd: ["ส่งอุทธรณ์ถึงหน่วยงานกลาง (อธ.1)", "Appeal forwarded to the central body"], appeal_fwd_res: ["บันทึกผลจากหน่วยงานกลาง", "Central body result recorded"],
});

function seedT2(s) {
  s.prof.p2 = { bidSecReturnDays: 15, bidSecWarnDays: 7, smePct: 5, mitPct: 5, appealFwdDays: 30, central: "กรมบัญชีกลาง" };
  s.prof.testCats = []; s.docno.fmt.ap1 = { pfx: "อธ1", pad: 3, unit: false }; s.vinv = [];
  s.vendors.forEach((v, i) => { v.mit = i % 3 === 1; v.mitCert = v.mit ? "2027-06-30" : ""; v.smeCert = v.sme ? "2027-03-31" : ""; });
  const own = s.contracts.length ? s.vendors.find(v => normName(v.name) === normName(tx(s.contracts[0].vendor))) : null, sv = own || s.vendors[0];
  s.users.push({ id: "u90", role: "vendor", unit: "", vendor: sv.id, primary: true, mfa: true, active: true, name: [sv.name, sv.name] });
}
const P2 = () => S.prof.p2;
const norm = normName;
const winnerOf = c => (c.award ? tx(c.award.winner) : "");
const bidderNames = c => (c.bids || []).map(b => b.name);
const certOk = d => !!d && d >= TODAY;

// ---------- bid security ----------
const BS_TYPE = { cash: ["เงินสด", "Cash"], cheque: ["เช็คที่ธนาคารสั่งจ่าย", "Bank cheque"], bg: ["หนังสือค้ำประกันธนาคาร", "Bank guarantee"], bond: ["พันธบัตรรัฐบาล", "Government bond"] };
const BS_ST = { held: [["ถือไว้", "Held"], "p-info"], returned: [["คืนแล้ว", "Returned"], "p-ok"], forfeited: [["ริบ", "Forfeited"], "p-bad"] };
const needBS = c => feat("bidSec") && !!(c.extra && c.extra.bs) && needsCompetition(c);
function bsRetDue(c, b) {
  if (!c.award) return null;
  if (norm(b.who) !== norm(winnerOf(c))) return addDays(c.award.date, P2().bidSecReturnDays);
  const k = S.contracts.find(x => x.plan === c.plan); return k ? addDays(k.signed || k.start || c.award.date, P2().bidSecReturnDays) : null;
}
const bsOverdue = (c, b) => { const d = bsRetDue(c, b); return b.status === "held" && !!d && d < TODAY; };

// ---------- samples and type tests ----------
const TEST_STAGES = [["recv", "ได้รับตัวอย่าง", "Sample received"], ["sent", "ส่งทดสอบ", "Sent to test"], ["start", "เริ่มทดสอบ", "Test started"], ["end", "ทดสอบเสร็จ", "Test finished"], ["notified", "แจ้งผล", "Result notified"], ["replied", "ตอบกลับผู้ขาย", "Replied to supplier"]];
const testReq = c => feat("sampleTest") && needsCompetition(c) && !!c.method && !!((c.extra && c.extra.test) || (S.prof.testCats || []).includes(famPlan(c.plan).cat));
const testsOk = c => !testReq(c) || ((c.tests || []).length > 0 && c.tests.every(t => t.result));
const winnerTested = c => !testReq(c) || !c.award || (c.tests || []).some(t => norm(t.vendor) === norm(winnerOf(c)) && t.result === "pass");

// ---------- checks and tasks ----------
{
  const base = caseChecks;
  caseChecks = c => {
    const out = base(c), n = caseState(c), ok = (v, th, en) => ({ ok: !!v, label: L(th, en) });
    if (c.cancelled) return out;
    if (n === 6 && needBS(c)) out.push(ok((c.bids || []).length && bidderNames(c).every(b => (c.bsec || []).some(x => norm(x.who) === norm(b))), "ผู้ยื่นทุกรายมีหลักประกันการเสนอราคา (R-20)", "Every bidder has a bid security (R-20)"));
    if (n === 6 && testReq(c)) { out.push(ok(testsOk(c), "ผลทดสอบตัวอย่างครบทุกรายการ (R-21)", "Every sample has a test result (R-21)")); if (c.award) out.push(ok(winnerTested(c), "ผู้ชนะต้องมีผลทดสอบ “ผ่าน” (R-21)", "The winner needs a passing test (R-21)")); }
    return out;
  };
}
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.cases || !isProcRole()) return;
    S.cases.filter(c => !c.cancelled).forEach(c => {
      if (needBS(c)) (c.bsec || []).filter(b => bsOverdue(c, b)).forEach(b => R(`${L("คืนหลักประกันการเสนอราคา", "Return a bid security")} ${c.id}`, `${b.who} · ${fmt(b.amount)}`, bsRetDue(c, b), "case:" + c.id, "p-bad"));
      if (feat("appealFwd") && c.appeal && c.appeal.fwd && !c.appeal.fwd.result && dayDiff(TODAY, c.appeal.fwd.due) <= 7) R(`${L("ติดตามผลอุทธรณ์จากหน่วยงานกลาง", "Chase the central body's appeal result")} ${c.id}`, c.appeal.fwd.no, c.appeal.fwd.due, "case:" + c.id, "p-warn");
    });
    if (feat("vendorPortal") && (S.vinv || []).some(v => v.status === "submitted")) R(L("ตรวจใบแจ้งหนี้ที่ผู้ขายส่งมา", "Check invoices sent by suppliers"), `${S.vinv.filter(v => v.status === "submitted").length} ${L("ฉบับ", "invoices")}`, TODAY, "prc-contracts", "p-info");
  };
}

// ---------- case panels ----------
const rowTag = (st, map) => tag(tx(map[st][0]), map[st][1]);
CASE_PANELS.push(c => {
  if (!needBS(c) || caseState(c) < 4) return "";
  const n = caseState(c), ed = canProf(c) && n <= 8, B = c.bsec || [], head = ROLE === "prochead", warn = P2().bidSecWarnDays, names = bidderNames(c);
  return `<section class="panel"><header><h2>${L("หลักประกันการเสนอราคา", "Bid security")}</h2><span class="sp"></span><span class="mono sub">FR-PR-71 · R-20</span></header>
    ${B.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ผู้ยื่น", "Bidder")}</th><th>${L("ชนิด", "Type")}</th><th class="n">${L("จำนวน (บาท)", "Amount")}</th><th>${L("มีผลถึง", "Valid to")}</th><th>${L("สถานะ", "Status")}</th><th>${L("กำหนดคืน", "Return by")}</th><th></th></tr></thead><tbody>${B.map((b, i) => { const rd = bsRetDue(c, b), soon = b.status === "held" && dayDiff(TODAY, b.to) <= warn;
      return `<tr><td>${esc(b.who)}</td><td class="sub">${tx(BS_TYPE[b.type])}</td><td class="n">${fmt(b.amount)}</td><td class="sub">${fdate(b.to)}${soon ? ` ${tag(L("ใกล้หมดอายุ", "Expiring"), "p-warn")}` : ""}${(b.ext || []).length ? ` <span class="sub">(${L("ขยาย", "extended")} ${b.ext.length})</span>` : ""}</td>
        <td>${rowTag(b.status, BS_ST)}${b.status === "returned" ? `<div class="sub">${fdate(b.ret.d)} · ${esc(b.ret.reason)}</div>` : ""}${b.status === "forfeited" ? `<div class="sub">${esc(b.forf.reason)}</div>` : ""}</td>
        <td class="sub">${rd ? fdate(rd) : "—"}${bsOverdue(c, b) ? ` ${tag(L("เลยกำหนด", "Overdue"), "p-bad")}` : ""}</td>
        <td>${b.status === "held" && ed ? `<div class="row"><input type="text" id="bs-x-${i}" placeholder="${L("เหตุผล", "Reason")}" style="width:130px"><input type="date" id="bs-d-${i}" value="${b.to}" style="width:140px"><button class="btn" type="button" data-bsa="ext|${i}">${L("ขยาย", "Extend")}</button><button class="btn" type="button" data-bsa="ret|${i}">${L("คืน", "Return")}</button>${head ? `<button class="btn" type="button" data-bsa="forf|${i}">${L("ริบ", "Forfeit")}</button>` : ""}</div>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่ได้รับหลักประกัน", "No bid security received yet")}</div>`}
    ${ed && n <= 6 ? `<div class="body"><form class="inline-form" id="bs-form"><div class="f" style="flex:2 1 200px"><label for="bs-w">${L("ผู้ยื่น", "Bidder")}</label>${names.length ? `<select id="bs-w">${names.map(x => `<option>${esc(x)}</option>`).join("")}</select>` : `<input type="text" id="bs-w" required>`}</div>
      <div class="f" style="flex:0 1 210px"><label for="bs-t">${L("ชนิด", "Type")}</label><select id="bs-t">${Object.keys(BS_TYPE).map(k => `<option value="${k}">${tx(BS_TYPE[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 150px"><label for="bs-a">${L("จำนวน (บาท)", "Amount")}</label><input type="number" id="bs-a" min="1" step="1" required></div><div class="f" style="flex:0 1 160px"><label for="bs-v">${L("มีผลถึง", "Valid to")}</label><input type="date" id="bs-v" value="${addDays(TODAY, 90)}" required></div>
      <button class="btn" type="submit">+ ${L("รับหลักประกัน", "Receive")}</button></form><div class="sub">${L("คืนได้เมื่อประกาศผลแล้ว (ผู้ชนะคืนหลังทำสัญญา) ภายใน", "Returnable after the award (the winner's after the contract) within")} ${P2().bidSecReturnDays} ${L("วัน ริบต้องให้หัวหน้าพัสดุและต้องระบุเหตุผล", "days; forfeiting needs the head of procurement and a reason")}</div></div>` : ""}</section>`;
});

CASE_PANELS.push(c => {
  if (!testReq(c) || caseState(c) < 4) return "";
  const n = caseState(c), ed = canProf(c) && n <= 8, T = c.tests || [], names = bidderNames(c);
  const dt = (t, i, k) => `<input type="date" id="ts-${k}-${i}" value="${t[k] || ""}" ${ed ? "" : "disabled"} style="width:132px" aria-label="${k}">`;
  return `<section class="panel"><header><h2>${L("ตัวอย่างและทดสอบ (Type Test)", "Samples and type tests")}</h2><span class="sp"></span>${testsOk(c) ? tag(L("ผลครบ", "All results in"), "p-ok") : tag(L("ผลยังไม่ครบ", "Results missing"), "p-warn")}<span class="mono sub">FR-PR-72 · R-21</span></header>
    ${T.length ? T.map((t, i) => `<div class="body"><div class="row"><b>${esc(t.vendor)}</b><span class="sub">${esc(t.item)}</span>${t.result ? tag(t.result === "pass" ? L("ผ่าน", "Pass") : L("ไม่ผ่าน", "Fail"), t.result === "pass" ? "p-ok" : "p-bad") : tag(L("ยังไม่มีผล", "No result"), "p-mute")}</div>
      <div class="inline-form" style="margin-top:6px">${TEST_STAGES.map(([k, th, en]) => `<div class="f" style="flex:0 1 150px"><label for="ts-${k}-${i}">${L(th, en)}</label>${dt(t, i, k)}</div>`).join("")}
        <div class="f" style="flex:0 1 160px"><label for="ts-lab-${i}">${L("ห้องทดสอบ", "Laboratory")}</label><input type="text" id="ts-lab-${i}" value="${esc(t.lab || "")}" ${ed ? "" : "disabled"}></div>
        <div class="f" style="flex:0 1 150px"><label for="ts-report-${i}">${L("เลขที่รายงาน", "Report no.")}</label><input type="text" id="ts-report-${i}" value="${esc(t.report || "")}" ${ed ? "" : "disabled"}></div>
        <div class="f" style="flex:0 1 140px"><label for="ts-result-${i}">${L("ผล", "Result")}</label><select id="ts-result-${i}" ${ed ? "" : "disabled"}><option value="">—</option><option value="pass" ${t.result === "pass" ? "selected" : ""}>${L("ผ่าน", "Pass")}</option><option value="fail" ${t.result === "fail" ? "selected" : ""}>${L("ไม่ผ่าน", "Fail")}</option></select></div>
        ${ed ? `<button class="btn" type="button" data-tssave="${i}">${L("บันทึก", "Save")}</button>` : ""}</div></div>`).join("") : `<div class="body sub">${L("ยังไม่มีการขอตัวอย่าง", "No sample requested yet")}</div>`}
    ${ed ? `<div class="body"><form class="inline-form" id="ts-form"><div class="f" style="flex:2 1 200px"><label for="ts-v">${L("ผู้ยื่น", "Bidder")}</label>${names.length ? `<select id="ts-v">${names.map(x => `<option>${esc(x)}</option>`).join("")}</select>` : `<input type="text" id="ts-v" required>`}</div>
      <div class="f" style="flex:2 1 200px"><label for="ts-i">${L("รายการที่ทดสอบ", "Item to test")}</label><input type="text" id="ts-i" required></div><button class="btn" type="submit">+ ${L("ขอตัวอย่าง", "Request a sample")}</button></form>
      <div class="sub">${L("วันที่ต้องเรียงตามลำดับ ได้รับ → ส่งทดสอบ → เริ่ม → เสร็จ → แจ้งผล → ตอบกลับ · บันทึกผลได้เมื่อมีวันทดสอบเสร็จ เลขที่รายงาน และวันแจ้งผล · ผู้ชนะต้องมีผล “ผ่าน”", "Dates must run in order. Received, sent, started, finished, notified, replied. A result needs the finish date, a report number and the notification date. The winner needs a pass.")}</div></div>` : ""}</section>`;
});

const vNow = name => (S.vendors || []).find(v => norm(v.name) === norm(name)) || null;
const calBal = name => sumv(S.contracts.filter(k => norm(tx(k.vendor)) === norm(name) && String(k.signed || k.start || TODAY).slice(0, 4) === TODAY.slice(0, 4)).map(k => k.amount));
const prefOf = (c, v) => { if (!feat("smeMit") || !v) return { pct: 0, sme: false, mit: false }; const x = c.extra || {}, sme = !!(x.sme && v.sme && certOk(v.smeCert)), mit = !!(x.mit && v.mit && certOk(v.mitCert)); return { pct: Math.max(sme ? P2().smePct : 0, mit ? P2().mitPct : 0), sme, mit }; };
CASE_PANELS.push(c => {
  if (caseState(c) < 6 || !(c.bids || []).length) return "";
  if (!feat("smeMit") && !feat("bidSec") && !feat("sampleTest") && !feat("vendorPortal")) return "";
  const ed = canProf(c) && caseState(c) <= 8, rows = c.bids.map((b, i) => { const v = vNow(b.name), p = prefOf(c, v), h = v ? vendorHist(v.name) : null; return { b, i, v, p, h, adj: Math.round(b.price * (1 - p.pct / 100)) }; });
  const rank = [...rows].sort((a, z) => a.adj - z.adj).map(r => r.i), D = c.bidDet || {};
  return `<section class="panel"><header><h2>${L("ข้อเสนอของผู้ยื่น: รายละเอียด สิทธิพิเศษ และประวัติ", "Bids: details, preference and history")}</h2><span class="sp"></span><span class="mono sub">FR-PR-69, 70, 73 · R-26</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ลำดับ", "Rank")}</th><th>${L("ผู้ยื่น", "Bidder")}</th><th class="n">${L("ราคาที่เสนอ", "Price offered")}</th>${feat("smeMit") ? `<th>SME / MiT</th><th class="n">${L("แต้มต่อ", "Preference")}</th><th class="n">${L("ราคาหลังแต้มต่อ", "After preference")}</th>` : ""}<th>${L("ประวัติจากสัญญาก่อน", "History")}</th><th></th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${rank.indexOf(r.i) + 1}</td><td>${esc(r.b.name)}</td><td class="n">${fmt(r.b.price)}</td>${feat("smeMit") ? `<td class="sub">${r.v ? `${r.v.sme ? tag("SME" + (certOk(r.v.smeCert) ? "" : " ✕"), certOk(r.v.smeCert) ? "p-ok" : "p-warn") : ""} ${r.v.mit ? tag("MiT" + (certOk(r.v.mitCert) ? "" : " ✕"), certOk(r.v.mitCert) ? "p-ok" : "p-warn") : ""}` : L("ไม่อยู่ในทะเบียน", "Not registered")}<div>${L("สัญญาสะสมปีนี้", "Contracts this year")} ${fmt(calBal(r.b.name))}</div></td><td class="n">${r.p.pct ? r.p.pct + "%" : "—"}</td><td class="n">${fmt(r.adj)}</td>` : ""}
        <td class="sub">${r.h ? `${r.h.n} ${L("สัญญา", "contracts")} · ${L("ล่าช้า", "late")} ${r.h.late} ${L("วัน", "days")} · ${L("ค่าปรับ", "penalty")} ${fmt(r.h.pen)} · ${L("แจ้งชำรุด", "defects")} ${S.contracts.filter(k => norm(tx(k.vendor)) === norm(r.b.name)).reduce((a, k) => a + (k.defects || []).length, 0)}` : "—"}</td>
        <td>${ed ? `<button class="btn ghost" type="button" data-bdopen="${r.i}">${L("รายละเอียด", "Details")}</button>` : ""}</td></tr>
        <tr id="bd-row-${r.i}" hidden><td colspan="8"><form class="inline-form" data-bdform="${r.i}">${[["maker", "ผู้ผลิต", "Maker"], ["country", "ประเทศผู้ผลิต", "Country"], ["brand", "ยี่ห้อ", "Brand"], ["model", "รุ่น", "Model"], ["cat", "Catalog / Drawing no.", "Catalog or drawing no."]].map(([k, th, en]) => `<div class="f" style="flex:1 1 150px"><label>${L(th, en)}</label><input type="text" name="${k}" value="${esc((D[r.b.name] || {})[k] || "")}"></div>`).join("")}
          <div class="f" style="flex:2 1 260px"><label>${L("ส่วนที่แตกต่างจากข้อกำหนด (Deviation)", "Deviation from the specification")}</label><input type="text" name="dev" value="${esc((D[r.b.name] || {}).dev || "")}"></div>
          ${r.v ? `<div class="f" style="flex:1 1 100%"><label class="field-inline"><input type="checkbox" name="sme" ${r.v.sme ? "checked" : ""}> SME</label><label class="field-inline"><input type="date" name="smeCert" value="${r.v.smeCert || ""}" aria-label="SME cert"> ${L("ใบรับรอง SME ถึง", "SME certificate until")}</label><label class="field-inline"><input type="checkbox" name="mit" ${r.v.mit ? "checked" : ""}> MiT</label><label class="field-inline"><input type="date" name="mitCert" value="${r.v.mitCert || ""}" aria-label="MiT cert"> ${L("ใบรับรอง MiT ถึง", "MiT certificate until")}</label></div>` : ""}
          <button class="btn primary" type="submit">${L("บันทึก", "Save")}</button></form></td></tr>`).join("")}</tbody></table></div>
    <div class="body sub">${feat("smeMit") ? `${L("แต้มต่อ: SME", "Preference: SME")} ${P2().smePct}% · MiT ${P2().mitPct}% ${L("(ใช้ค่าที่สูงกว่า ตามค่าตั้ง ระดับ C) ต้องติดธง SME หรือ MiT ที่รายการและใบรับรองยังไม่หมดอายุ แสดงเพื่อประกอบเท่านั้น ไม่เปลี่ยนราคาที่ผู้ยื่นเสนอ ไม่เลือกผู้ชนะแทนกรรมการ (R-26)", "(the higher of the two, a level C setting). The item must carry the flag and the certificate must be valid. Shown as evidence only; it does not change the offered price or pick a winner (R-26).")}` : ""}</div></section>`;
});

CASE_PANELS.push(c => {
  const a = c.appeal; if (!feat("appealFwd") || !a || (a.status !== "open" && !a.fwd)) return "";
  const f = a.fwd, ed = isProcRole() && !c.cancelled, left = f && !f.result ? dayDiff(TODAY, f.due) : null;
  return `<section class="panel"><header><h2>${L("อุทธรณ์: ส่งหน่วยงานกลาง", "Appeal: forwarded to the central body")}</h2><span class="sp"></span>${!f ? tag(L("ยังไม่ส่ง", "Not forwarded"), "p-mute") : f.result ? tag(f.result === "upheld" ? L("ฟังขึ้น", "Upheld") : L("ฟังไม่ขึ้น", "Dismissed"), f.result === "upheld" ? "p-warn" : "p-ok") : tag(L("รอผล", "Waiting for the result"), "p-info")}<span class="mono sub">FR-PR-74 · R-22</span></header>
    <div class="body">${!f ? `${ed && a.status === "open" ? `<button class="btn primary" type="button" id="af-send">${L("ไม่เห็นด้วยกับผู้อุทธรณ์: สร้างแบบ อธ.1 และส่ง", "Disagree with the appellant: create form อธ.1 and send")} ${esc(P2().central)}</button><div class="sub" style="margin-top:6px">${L("เมื่อส่งแล้วจะยกหรือรับอุทธรณ์เองไม่ได้ ต้องบันทึกผลจากหน่วยงานกลางก่อน (R-22)", "Once sent, the agency cannot dismiss or uphold it itself; the central body's result must be recorded first (R-22)")}</div>` : `<span class="sub">${L("ยังไม่ได้ส่ง", "Not forwarded")}</span>`}`
      : `<div class="row"><b class="mono">${esc(f.no)}</b><span class="sub">${L("ส่งถึง", "To")} ${esc(f.to)} · ${fdate(f.sent)} · ${L("คาดว่าจะได้ผลภายใน", "result expected by")} ${fdate(f.due)}</span>${left != null && left <= 3 ? tag(L("ใกล้ครบ 3 วัน", "3 days or less"), "p-bad") : left != null && left <= 7 ? tag(L("ใกล้ครบ 7 วัน", "7 days or less"), "p-warn") : ""}</div>
      ${f.result ? `<div class="sub">${L("ผล", "Result")}: <b>${f.result === "upheld" ? L("ฟังขึ้น", "upheld") : L("ฟังไม่ขึ้น", "dismissed")}</b> · ${L("เลขที่หนังสือ", "ref.")} ${esc(f.ref)} · ${fdate(f.resultDate)} · ${L("แจ้งผู้อุทธรณ์", "appellant told")} ${fdate(f.notified)}</div>`
      : ed ? `<form class="inline-form" id="af-res" style="margin-top:8px"><div class="f" style="flex:0 1 180px"><label for="af-r">${L("ผลจากหน่วยงานกลาง", "Central body's result")}</label><select id="af-r"><option value="dismissed">${L("ฟังไม่ขึ้น", "Dismissed")}</option><option value="upheld">${L("ฟังขึ้น", "Upheld")}</option></select></div>
        <div class="f" style="flex:0 1 160px"><label for="af-d">${L("วันที่ได้ผล", "Result date")}</label><input type="date" id="af-d" value="${TODAY}" required></div><div class="f" style="flex:1 1 180px"><label for="af-n">${L("เลขที่หนังสือ", "Letter no.")}</label><input type="text" id="af-n" required></div>
        <div class="f" style="flex:0 1 170px"><label for="af-t">${L("แจ้งผู้อุทธรณ์เมื่อ", "Appellant told on")}</label><input type="date" id="af-t" value="${TODAY}" required></div><button class="btn primary" type="submit">${L("บันทึกผล", "Record the result")}</button></form>` : ""}`}</div></section>`;
});

// ---------- binders ----------
CASE_BINDS.push((c, done) => {
  const bs = $("#bs-form"); if (bs) bs.onsubmit = e => { e.preventDefault(); const who = $("#bs-w").value.trim(), amt = Math.round(Number($("#bs-a").value)), to = $("#bs-v").value;
    if ((c.bsec || []).some(x => norm(x.who) === norm(who) && x.status === "held")) { toast(L("ผู้ยื่นรายนี้มีหลักประกันที่ถือไว้แล้ว", "This bidder already has a held security")); return; }
    if (to <= TODAY) { toast(L("วันที่มีผลต้องหลังวันนี้", "The valid-to date must be after today")); return; }
    (c.bsec = c.bsec || []).push({ who, type: $("#bs-t").value, amount: amt, from: TODAY, to, status: "held", ext: [] }); caseLog(c, "bsec_add", `${who} · ${fmt(amt)}`); done(L("รับหลักประกันแล้ว", "Received")); };
  $$("[data-bsa]").forEach(b => (b.onclick = () => { const [act, i] = b.dataset.bsa.split("|"), x = c.bsec[Number(i)], why = ($("#bs-x-" + i).value || "").trim(), d = $("#bs-d-" + i).value;
    if (act === "ext") { if (d <= x.to) { toast(L("วันที่ใหม่ต้องหลังวันเดิม", "The new date must be after the old one")); return; } x.ext.push({ to: x.to, t: TODAY }); x.to = d; caseLog(c, "bsec_ext", `${x.who} → ${d}`); audit(["ขยายอายุหลักประกันการเสนอราคา", "Extended a bid security"], `${c.id} ${x.who}`); done(L("ขยายแล้ว", "Extended")); return; }
    if (why.length < 3) { toast(L("ระบุเหตุผลอย่างน้อย 3 ตัวอักษร", "Give a reason of at least 3 characters")); return; }
    if (act === "ret") { if (!c.award) { toast(L("คืนได้หลังประกาศผู้ชนะ", "Returns come after the award")); return; } if (norm(x.who) === norm(winnerOf(c)) && !S.contracts.some(k => k.plan === c.plan)) { toast(L("ผู้ชนะคืนได้หลังทำสัญญา", "The winner's security is returned after the contract")); return; }
      x.status = "returned"; x.ret = { d: TODAY, reason: why, by: me().id }; caseLog(c, "bsec_ret", x.who); audit(["คืนหลักประกันการเสนอราคา", "Returned a bid security"], `${c.id} ${x.who}`); done(L("คืนแล้ว", "Returned")); return; }
    if (why.length < 10) { toast(L("ริบหลักประกันต้องมีเหตุผลอย่างน้อย 10 ตัวอักษร", "Forfeiting needs a reason of at least 10 characters")); return; }
    x.status = "forfeited"; x.forf = { d: TODAY, reason: why, by: me().id }; caseLog(c, "bsec_forf", `${x.who} · ${why}`); audit(["ริบหลักประกันการเสนอราคา", "Forfeited a bid security"], `${c.id} ${x.who}`); done(L("ริบแล้ว", "Forfeited")); }));

  const ts = $("#ts-form"); if (ts) ts.onsubmit = e => { e.preventDefault(); const n = (c.tests || []).length + 1; (c.tests = c.tests || []).push({ id: "T" + n, vendor: $("#ts-v").value.trim(), item: $("#ts-i").value.trim(), recv: "", sent: "", start: "", end: "", notified: "", replied: "", lab: "", report: "", result: null });
    caseLog(c, "test_add", `${$("#ts-v").value.trim()} · ${$("#ts-i").value.trim()}`); done(L("บันทึกแล้ว", "Recorded")); };
  $$("[data-tssave]").forEach(b => (b.onclick = () => { const i = Number(b.dataset.tssave), t = c.tests[i], v = {}; TEST_STAGES.forEach(([k]) => (v[k] = $(`#ts-${k}-${i}`).value));
    const filled = TEST_STAGES.map(([k]) => v[k]).filter(Boolean); if (filled.some((d, j) => j && d < filled[j - 1])) { toast(L("วันที่ต้องเรียงตามลำดับ ได้รับ → ส่ง → เริ่ม → เสร็จ → แจ้งผล → ตอบกลับ", "Dates must run in order")); return; }
    const res = $(`#ts-result-${i}`).value, rep = $(`#ts-report-${i}`).value.trim();
    if (res && !(v.end && rep && v.notified)) { toast(L("บันทึกผลได้เมื่อมีวันทดสอบเสร็จ เลขที่รายงาน และวันแจ้งผล", "A result needs the finish date, a report number and the notification date")); return; }
    Object.assign(t, v, { lab: $(`#ts-lab-${i}`).value.trim(), report: rep, result: res || null }); caseLog(c, res ? "test_res" : "test_upd", `${t.vendor}${res ? " · " + res : ""}`); done(L("บันทึกแล้ว", "Saved")); }));

  $$("[data-bdopen]").forEach(b => (b.onclick = () => { const r = $("#bd-row-" + b.dataset.bdopen); r.hidden = !r.hidden; }));
  $$("[data-bdform]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const i = Number(f.dataset.bdform), nm = c.bids[i].name, fd = new FormData(f), v = vNow(nm);
    (c.bidDet = c.bidDet || {})[nm] = { maker: fd.get("maker").trim(), country: fd.get("country").trim(), brand: fd.get("brand").trim(), model: fd.get("model").trim(), cat: fd.get("cat").trim(), dev: fd.get("dev").trim() };
    if (v) { v.sme = fd.get("sme") === "on"; v.mit = fd.get("mit") === "on"; v.smeCert = fd.get("smeCert") || ""; v.mitCert = fd.get("mitCert") || ""; }
    caseLog(c, "bid_det", nm); audit(["บันทึกรายละเอียดข้อเสนอและสถานะ SME/MiT", "Recorded bid details and SME/MiT status"], `${c.id} ${nm}`); done(L("บันทึกแล้ว", "Saved")); }));

  const sa = $("#af-send"); if (sa) sa.onclick = () => { const f = { no: docNo("ap1", "", c.id), to: P2().central, sent: TODAY, due: addDays(TODAY, P2().appealFwdDays), by: me().id, result: null }; c.appeal.fwd = f;
    caseLog(c, "appeal_fwd", f.no); audit(["ส่งอุทธรณ์ถึงหน่วยงานกลาง (จำลอง)", "Forwarded an appeal to the central body (simulated)"], `${c.id} ${f.no}`); done(`${L("ส่งแล้ว เลขที่", "Sent, no.")} ${f.no}`); };
  const ar = $("#af-res"); if (ar) ar.onsubmit = e => { e.preventDefault(); const f = c.appeal.fwd, res = $("#af-r").value; Object.assign(f, { result: res, resultDate: $("#af-d").value, ref: $("#af-n").value.trim(), notified: $("#af-t").value });
    caseLog(c, "appeal_fwd_res", `${f.no} · ${res}`); audit(["บันทึกผลอุทธรณ์จากหน่วยงานกลาง", "Recorded the central body's appeal result"], `${c.id} ${res}`);
    if (res === "dismissed") { c.appeal.status = "dismissed"; c.appealElapsed = true; caseLog(c, "appeal_dismissed"); done(L("บันทึกแล้ว อุทธรณ์ฟังไม่ขึ้น", "Recorded; the appeal is dismissed")); }
    else { c.appeal.status = "upheld"; const aw = c.award; c.award = null; c.appealElapsed = false; setState(c, 6, "appeal_upheld", aw ? fmt(aw.price) : ""); done(L("บันทึกแล้ว อุทธรณ์ฟังขึ้น กลับไปพิจารณาผลใหม่", "Recorded; upheld, back to evaluation")); } };
  if (c.appeal && c.appeal.fwd && !c.appeal.fwd.result) ["ap-dismiss", "ap-uphold"].forEach(id => { const b = $("#" + id); if (b) { b.disabled = true; b.title = L("ส่งหน่วยงานกลางแล้ว ต้องบันทึกผลจากหน่วยงานกลางก่อน (R-22)", "Forwarded: record the central body's result first (R-22)"); } });
});

// ---------- M10: T2 settings ----------
{
  const base = ADMIN.procprof, bb = BIND_ADMIN.procprof;
  ADMIN.procprof = () => {
    const ad = isAdmin(), p = P2(), num = (k, lbl, hint) => `<div class="f" style="flex:0 1 200px"><label for="p2-${k}">${lbl}</label><input type="number" id="p2-${k}" min="0" step="any" value="${p[k]}" ${ad ? "" : "disabled"}><span class="sub">${hint}</span></div>`;
    return base() + `<section class="panel"><header><h2>${L("ค่าตั้งรอบ T2", "Round T2 settings")}</h2></header><div class="body inline-form">
      ${num("bidSecReturnDays", L("คืนหลักประกันการเสนอราคาภายใน (วัน)", "Return bid security within (days)"), CONF_TAG("C"))}${num("bidSecWarnDays", L("เตือนก่อนหลักประกันหมดอายุ (วัน)", "Warn before expiry (days)"), CONF_TAG("C"))}
      ${num("smePct", L("แต้มต่อ SME (ร้อยละของราคา)", "SME preference (% of price)"), CONF_TAG("C"))}${num("mitPct", L("แต้มต่อ MiT (ร้อยละของราคา)", "MiT preference (% of price)"), CONF_TAG("C"))}${num("appealFwdDays", L("คาดว่าได้ผลอุทธรณ์ภายใน (วัน)", "Appeal result expected within (days)"), CONF_TAG("C"))}
      <div class="f" style="flex:0 1 240px"><label for="p2-central">${L("หน่วยงานกลางที่รับอุทธรณ์", "Central body for appeals")}</label><input type="text" id="p2-central" value="${esc(p.central)}" ${ad ? "" : "disabled"}></div></div>
      <div class="body"><div class="sub" style="margin-bottom:6px">${L("หมวดพัสดุที่ต้องทดสอบตัวอย่าง (ใช้เมื่อเปิดสวิตช์ “ตัวอย่างและทดสอบ”)", "Categories that need sample tests (when the sample-test switch is on)")}</div>
      <div class="row" style="flex-wrap:wrap">${(S.pcat || []).map(k => `<label class="field-inline" style="min-width:230px"><input type="checkbox" name="p2-cat" value="${k.id}" ${S.prof.testCats.includes(k.id) ? "checked" : ""} ${ad ? "" : "disabled"}> ${tx(k.name)}</label>`).join("")}</div></div>
      ${ad ? `<div class="body"><button class="btn primary" type="button" id="p2-save">${L("บันทึก", "Save")}</button></div>` : ""}</section>`;
  };
  BIND_ADMIN.procprof = () => {
    bb();
    const sv = $("#p2-save"); if (sv) sv.onclick = () => { const v = {}; for (const k of ["bidSecReturnDays", "bidSecWarnDays", "smePct", "mitPct", "appealFwdDays"]) v[k] = Number($("#p2-" + k).value);
      const central = $("#p2-central").value.trim(); if (Object.values(v).some(x => !(x >= 0)) || v.smePct > 50 || v.mitPct > 50 || !central) { toast(L("ค่าไม่ถูกต้อง", "Check the values")); return; }
      Object.assign(S.prof.p2, v, { central }); S.prof.testCats = $$("[name=p2-cat]:checked").map(x => x.value);
      audit(["แก้ค่าตั้งโปรไฟล์จัดซื้อ (รอบ T2)", "Changed profile settings (T2)"], Object.entries(v).map(([k, x]) => `${k}=${x}`).join(" ") + ` central=${central} testCats=${S.prof.testCats.join(",")}`); commit(); route(); toast(L("บันทึกแล้ว", "Saved")); };
  };
}

// ---------- the supplier portal (FR-PR-66, simulated) ----------
const VP_TABS = [["rfq", ["หนังสือเชิญและ RFQ", "Invitations and RFQs"], "V1"], ["contracts", ["สัญญาของฉัน", "My contracts"], "V2"], ["invoices", ["ใบแจ้งหนี้", "Invoices"], "V3"]];
let VP_TAB = "rfq";
ROLES.vendor = ["ผู้ขาย (ภายนอก)", "Supplier (external)"];
MATRIX.vendor = Array(10).fill("–");
{ const h = NAV.find(n => n.id === "home"); if (h) h.roles = [...h.roles, "vendor"]; }
NAV.push({ id: "vportal", code: "VP", group: "procurement", app: "procurement", jumpPrefix: "vp", roles: ["vendor"], label: ["พอร์ทัลผู้ขาย", "Supplier portal"], tabs: VP_TABS, tabGet: () => VP_TAB, tabSet: v => (VP_TAB = v) });
JUMP_TABS.vp = ["vportal", v => (VP_TAB = v)];
{ const base = appOfLink; appOfLink = l => ((l && l.startsWith("vp-")) || l === "vportal" ? "procurement" : base(l)); }
const vpMe = () => (S.vendors || []).find(v => v.id === me().vendor) || null;
const vpOn = () => feat("vendorPortal");
const vpOff = () => `<div class="panel"><div class="body"><h2 style="margin:0 0 6px">${L("พอร์ทัลผู้ขายปิดอยู่", "The supplier portal is off")}</h2><p class="sub">${L("เปิดได้ที่ M10 → โปรไฟล์จัดซื้อ", "It can be switched on in M10, Procurement profile")}</p></div></div>`;
const vpRfqs = v => S.cases.flatMap(c => (c.rfq || []).flatMap((r, ri) => r.rows.map((x, xi) => ({ c, r, ri, x, xi })).filter(o => norm(o.x.v) === norm(v.name))));
const vpCons = v => S.contracts.filter(k => norm(tx(k.vendor)) === norm(v.name));

VIEWS.vportal = () => {
  const v = vpMe(); if (!v) return `<div class="panel"><div class="body">${L("บัญชีนี้ไม่ได้ผูกกับผู้ขาย", "This account is not linked to a supplier")}</div></div>`;
  if (!vpOn()) return vpOff();
  const head = `<div class="head"><div><div class="eyebrow">Fisko Procurement · ${L("พอร์ทัลผู้ขาย (จำลอง)", "Supplier portal (simulated)")}</div><h1>${tx((VP_TABS.find(t => t[0] === VP_TAB) || VP_TABS[0])[1])}</h1><p>${esc(v.name)} · ${L("เห็นเฉพาะข้อมูลของตนเอง", "you see only your own data")}</p></div></div>`;
  if (VP_TAB === "contracts") { const K = vpCons(v);
    return head + `<section class="panel"><div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา", "Contract")}</th><th>${L("งาน", "Work")}</th><th class="n">${L("วงเงิน (บาท)", "Amount")}</th><th>${L("งวดงาน", "Phases")}</th></tr></thead><tbody>${K.map(k => `<tr><td class="mono">${esc(k.no)}</td><td>${tx(famPlan(k.plan).name)}</td><td class="n">${fmt(k.amount)}</td><td class="sub">${k.phases.map(ph => `${tx(ph.name)} · ${fdate(ph.due)} · ${phaseAccepted(ph) ? tag(L("ตรวจรับแล้ว", "Accepted"), "p-ok") : tag(L("ยังไม่ตรวจรับ", "Open"), "p-mute")}${ph.invoice ? ` · ${L("ใบแจ้งหนี้", "invoice")} ${esc(ph.invoice.no)}` : ""}`).join("<br>")}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">${L("ยังไม่มีสัญญา", "No contracts yet")}</td></tr>`}</tbody></table></div></section>`; }
  if (VP_TAB === "invoices") {
    const due = vpCons(v).flatMap(k => k.phases.filter(ph => phaseAccepted(ph) && !ph.invoice && !(S.vinv || []).some(x => x.contract === k.id && x.phase === ph.n && x.status === "submitted")).map(ph => ({ k, ph }))), mine = (S.vinv || []).filter(x => x.vendor === v.id);
    return head + `<section class="panel"><header><h2>${L("งวดที่ตรวจรับแล้วและยังไม่มีใบแจ้งหนี้", "Accepted phases without an invoice")}</h2></header>${due.length ? due.map((o, i) => `<div class="body"><form class="inline-form" data-vinvf="${o.k.id}|${o.ph.n}"><div class="f" style="flex:1 1 230px"><label>${L("งวด", "Phase")}</label><div><b>${esc(o.k.no)}</b> ${tx(o.ph.name)}</div></div><div class="f" style="flex:0 1 170px"><label>${L("เลขที่ใบแจ้งหนี้", "Invoice no.")}</label><input type="text" name="no" required></div><div class="f" style="flex:0 1 160px"><label>${L("วันที่", "Date")}</label><input type="date" name="d" value="${TODAY}" required></div><div class="f" style="flex:0 1 160px"><label>${L("จำนวนเงิน (บาท)", "Amount (baht)")}</label><input type="number" name="amt" value="${o.ph.amount}" min="1" step="1" required></div><button class="btn primary" type="submit">${L("ส่งใบแจ้งหนี้", "Send the invoice")}</button></form></div>`).join("") : `<div class="body sub">${L("ไม่มีงวดที่รอใบแจ้งหนี้", "No phase is waiting for an invoice")}</div>`}</section>
      <section class="panel"><header><h2>${L("ใบแจ้งหนี้ที่ส่งแล้ว", "Invoices sent")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("สัญญา", "Contract")}</th><th class="n">${L("จำนวนเงิน", "Amount")}</th><th>${L("สถานะ", "Status")}</th></tr></thead><tbody>${mine.map(x => `<tr><td class="mono">${esc(x.no)}</td><td class="sub">${esc(x.contract)} · ${L("งวด", "phase")} ${x.phase}</td><td class="n">${fmt(x.amount)}</td><td>${tag(x.status === "submitted" ? L("รอเจ้าหน้าที่ตรวจ", "Waiting for a check") : x.status === "confirmed" ? L("ยืนยันแล้ว", "Confirmed") : L("ส่งคืน", "Returned"), x.status === "confirmed" ? "p-ok" : x.status === "submitted" ? "p-info" : "p-bad")}${x.note ? `<div class="sub">${esc(x.note)}</div>` : ""}</td></tr>`).join("") || `<tr><td colspan="4" class="sub">—</td></tr>`}</tbody></table></div></section>`;
  }
  const R = vpRfqs(v);
  return head + `<section class="panel"><div class="tbl-wrap"><table><thead><tr><th>RFQ</th><th>${L("รายการ", "Item")}</th><th>${L("ส่งเมื่อ", "Sent")}</th><th>${L("ตอบภายใน", "Reply by")}</th><th>${L("คำตอบของท่าน", "Your reply")}</th></tr></thead><tbody>${R.map(o => { const id = `${o.c.id}-${o.ri}-${o.xi}`, late = o.r.due < TODAY;
    return `<tr><td class="mono">${esc(o.r.no)}</td><td>${tx(famPlan(o.c.plan).name)}</td><td class="sub">${fdate(o.r.sent)}</td><td class="sub">${fdate(o.r.due)} ${late && !o.x.reply ? tag(L("เลยกำหนด", "Overdue"), "p-bad") : ""}</td>
      <td>${o.x.reply ? tag(`${L("ส่งแล้ว", "Sent")} ${fdate(o.x.reply.d)} · ${o.x.reply.price ? fmt(o.x.reply.price) : L("ไม่เสนอราคา", "declined")}`, "p-ok") : late ? `<span class="sub">${L("ปิดรับคำตอบแล้ว", "Closed")}</span>` : `<div class="row"><input type="number" min="1" step="1" id="vp-p-${id}" placeholder="${L("ราคา (บาท)", "Price (baht)")}" style="width:140px"><button class="btn primary" type="button" data-vprep="${id}">${L("ส่งราคา", "Send price")}</button><button class="btn" type="button" data-vpdec="${id}">${L("ไม่เสนอราคา", "Decline")}</button></div>`}</td></tr>`; }).join("") || `<tr><td colspan="5" class="sub">${L("ยังไม่มีหนังสือเชิญ", "No invitations yet")}</td></tr>`}</tbody></table></div></section>`;
};
BIND.vportal = () => {
  const reply = (key, decline) => { const [cid, ri, xi] = [key.slice(0, key.indexOf("-", 8)), ...key.slice(key.indexOf("-", 8) + 1).split("-")].map((x, i) => (i ? Number(x) : x)), c = caseOf(cid), x = c.rfq[ri].rows[xi];
    const pr = decline ? 0 : Math.round(Number($("#vp-p-" + key).value) || 0); if (!decline && pr < 1) { toast(L("ระบุราคา", "Enter a price")); return; }
    x.reply = { d: TODAY, price: pr, by: me().id, via: "portal" }; caseLog(c, "rfq_reply", `${x.v} · ${pr ? fmt(pr) : "ไม่เสนอ"} (portal)`);
    if (pr && !needsCompetition(c) && !c.quotes.some(q => tx(q.vendor) === x.v)) c.quotes.push({ vendor: [x.v, x.v], price: pr, win: false });
    notify(["proc", "prochead"], [`${x.v} ตอบ RFQ ${c.rfq[ri].no}`, `${x.v} replied to RFQ ${c.rfq[ri].no}`], "case:" + c.id); audit(["ผู้ขายตอบ RFQ ผ่านพอร์ทัล (จำลอง)", "A supplier replied to an RFQ in the portal (simulated)"], `${c.id} ${c.rfq[ri].no}`); commit(); route(); toast(L("ส่งคำตอบแล้ว", "Sent")); };
  $$("[data-vprep]").forEach(b => (b.onclick = () => reply(b.dataset.vprep, false))); $$("[data-vpdec]").forEach(b => (b.onclick = () => reply(b.dataset.vpdec, true)));
  $$("[data-vinvf]").forEach(f => (f.onsubmit = e => { e.preventDefault(); const [kid, pn] = f.dataset.vinvf.split("|"), fd = new FormData(f), v = vpMe();
    (S.vinv = S.vinv || []).push({ id: "VI-" + String(S.vinv.length + 1).padStart(3, "0"), vendor: v.id, contract: kid, phase: Number(pn), no: String(fd.get("no")).trim(), date: fd.get("d"), amount: Math.round(Number(fd.get("amt"))), status: "submitted", t: nowIso() });
    notify(["proc"], [`ผู้ขาย ${v.name} ส่งใบแจ้งหนี้ ${fd.get("no")}`, `${v.name} sent invoice ${fd.get("no")}`], "prc-contracts"); audit(["ผู้ขายส่งใบแจ้งหนี้ผ่านพอร์ทัล (จำลอง)", "A supplier sent an invoice in the portal (simulated)"], `${kid} ${fd.get("no")}`); commit(); route(); toast(L("ส่งใบแจ้งหนี้แล้ว", "Invoice sent")); }));
};
const vendorHome = () => { const v = vpMe(), R = v ? vpRfqs(v).filter(o => !o.x.reply && o.r.due >= TODAY) : [], I = v ? (S.vinv || []).filter(x => x.vendor === v.id && x.status === "submitted") : [];
  return `<div class="head"><div><div class="eyebrow">${L("พื้นที่ทำงานของผู้ขาย", "Supplier workspace")}</div><h1>${v ? esc(v.name) : ""}</h1><p>${L("ผู้ขายภายนอก เห็นเฉพาะข้อมูลของตน (จำลอง)", "An external supplier sees only its own data (simulated)")}</p></div></div>
  <div class="kpis"><div class="kpi"><span class="l">${L("RFQ ที่รอคำตอบ", "RFQs waiting for you")}</span><span class="v">${R.length}</span></div><div class="kpi"><span class="l">${L("ใบแจ้งหนี้รอตรวจ", "Invoices being checked")}</span><span class="v">${I.length}</span></div><div class="kpi"><span class="l">${L("สัญญา", "Contracts")}</span><span class="v">${v ? vpCons(v).length : 0}</span></div></div>
  <section class="panel"><div class="body row">${vpOn() ? VP_TABS.map(t => `<button class="btn" type="button" data-vpgo="${t[0]}">${tx(t[1])}</button>`).join("") : `<span class="sub">${L("พอร์ทัลปิดอยู่ในโปรไฟล์", "The portal is off in the profile")}</span>`}</div></section>`; };
{ const bh = VIEWS.home, bb = BIND.home; VIEWS.home = () => (ROLE === "vendor" ? vendorHome() : bh()); BIND.home = () => { if (ROLE === "vendor") { $$("[data-vpgo]").forEach(b => (b.onclick = () => { VP_TAB = b.dataset.vpgo; go("vportal"); })); return; } bb && bb(); }; }

// officers check the invoices suppliers send, on the contracts page
{
  const base = PROC.contracts;
  PROC.contracts = () => {
    const Q = (S.vinv || []).filter(x => x.status === "submitted"), html = base();
    if (!vpOn() || !Q.length || !isProcRole()) return html;
    return html + `<section class="panel"><header><h2>${L("ใบแจ้งหนี้ที่ผู้ขายส่งมาทางพอร์ทัล", "Invoices sent by suppliers in the portal")}</h2><span class="sp"></span><span class="mono sub">FR-PR-66</span></header><div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ผู้ขาย", "Supplier")}</th><th>${L("สัญญา", "Contract")}</th><th class="n">${L("จำนวนเงิน", "Amount")}</th><th></th></tr></thead><tbody>${Q.map(x => { const k = S.contracts.find(y => y.id === x.contract), ph = k && k.phases.find(p => p.n === x.phase), match = ph && Math.abs(ph.amount - x.amount) <= S.pcfg.invoiceTol;
      return `<tr><td class="mono">${esc(x.no)}</td><td>${esc((S.vendors.find(v => v.id === x.vendor) || {}).name || "")}</td><td class="sub">${esc(x.contract)} · ${L("งวด", "phase")} ${x.phase}</td><td class="n">${fmt(x.amount)} ${match ? "" : tag(L("ไม่ตรงงวด", "Differs from the phase"), "p-warn")}</td>
        <td><button class="btn primary" type="button" data-vinvok="${x.id}">${L("ยืนยันเป็นใบแจ้งหนี้ของงวด", "Confirm as the phase invoice")}</button> <input type="text" id="vinv-n-${x.id}" placeholder="${L("เหตุผลที่ส่งคืน", "Reason")}" style="width:150px"> <button class="btn" type="button" data-vinvno="${x.id}">${L("ส่งคืน", "Return")}</button></td></tr>`; }).join("")}</tbody></table></div></section>`;
  };
  const bb = BIND.procurement;
  BIND.procurement = () => {
    bb();
    $$("[data-vinvok]").forEach(b => (b.onclick = () => { const x = S.vinv.find(y => y.id === b.dataset.vinvok), k = S.contracts.find(y => y.id === x.contract), ph = k.phases.find(p => p.n === x.phase);
      ph.invoice = { no: x.no, amount: x.amount, date: x.date, vendor: tx(k.vendor), contract: k.no, by: me().id, via: "portal" }; x.status = "confirmed"; audit(["ยืนยันใบแจ้งหนี้จากพอร์ทัลผู้ขาย", "Confirmed an invoice from the supplier portal"], `${k.id} ${x.no}`); commit(); route(); toast(L("ยืนยันแล้ว เข้าตรวจสามทางได้", "Confirmed; it feeds the three-way check")); }));
    $$("[data-vinvno]").forEach(b => (b.onclick = () => { const why = ($("#vinv-n-" + b.dataset.vinvno).value || "").trim(); if (why.length < 3) { toast(L("ระบุเหตุผลอย่างน้อย 3 ตัวอักษร", "Give a reason of at least 3 characters")); return; } const x = S.vinv.find(y => y.id === b.dataset.vinvno); x.status = "returned"; x.note = why;
      audit(["ส่งคืนใบแจ้งหนี้ของผู้ขาย", "Returned a supplier invoice"], `${x.contract} ${x.no}`); commit(); route(); }));
  };
}
