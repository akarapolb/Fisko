// Submission and parliament on the shared list + drawer (round C3, Budget CRUD design 6.5 and chapter 8,
// FR-C-21 to FR-C-26, FL-04 to FL-06, SIM-01 to SIM-03).
// - The package goes in batches: a batch is prepared (pick approved requests), sent, reviewed, gets results per
//   request and is closed; a later batch takes requests approved after the first one went. S.submission.status
//   stays as the summary the older code reads (sbSync).
// - Budget Bureau results and revision requests are entered by hand; Simulate fills the result form for checking.
// - Parliament: each stage records its real date and can be stepped back with a reason; the committee's cuts and the
//   appeals are lists; the bill starts from the Budget Bureau results (FL-04) and its final amounts feed allocation
//   through actAmount (FL-05, FL-06).
const SB_ST = { prep: [["เตรียมชุด", "Preparing"], "p-mute"], sent: [["ส่งแล้ว", "Sent"], "p-info"], reviewing: [["สำนักงบประมาณพิจารณา", "Under review"], "p-info"],
  result: [["ได้รับผลพิจารณา", "Result received"], "p-warn"], closed: [["ส่งต่อการจัดสรรแล้ว", "Handed to allocation"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const SB_MAP = { prep: "preparing", sent: "submitted", reviewing: "reviewing", result: "result", closed: "closed" };
const sbS = () => S.submission;
const sbBatches = () => sbS().batches || [];
const sbReqs = b => (b.reqs || S.requests.filter(r => r.sub === b.id).map(r => r.id)).map(id => S.requests.find(r => r.id === id)).filter(Boolean);
// Older saved data had one batch and a status on the submission; give each batch its own status.
function sbSync() {
  const sb = sbS(), B = sbBatches();
  B.forEach((b, i) => { if (!b.status) b.status = i === B.length - 1 ? (Object.keys(SB_MAP).find(k => SB_MAP[k] === sb.status) || "sent") : "closed"; if (!b.reqs) b.reqs = S.requests.filter(r => r.sub === b.id).map(r => r.id); });
  const active = B.filter(b => ["sent", "reviewing", "result"].includes(b.status));
  sb.status = active.length ? SB_MAP[active[active.length - 1].status] : B.some(b => b.status === "closed") ? "closed" : "preparing";
}
const sbReady = () => S.requests.filter(r => r.status === "approved" && !(r.sub && sbBatches().some(b => b.id === r.sub && b.status !== "cancelled")));
const sbBlocked = r => subChecks(r).some(c => c.s === "no");
const sbSim = r => (isPersonnel(r) ? subAmt(r) : Math.round(subAmt(r) * 0.92 / 1000) * 1000);

CRUD.def("sbBatch", {
  noun: ["ชุดส่งสำนักงบประมาณ", "Budget Bureau batch"], st: SB_ST,
  list: () => sbBatches().slice().reverse(), id: b => b.id, title: b => `${L("ชุดส่ง", "Batch")} ${b.id}`,
  sub: b => `${sbReqs(b).length} ${L("คำขอ", "requests")} · ${mb(sumv(sbReqs(b).map(subAmt)))} ${L("ลบ.", "M")}`,
  status: b => b.status, gone: b => b.status === "cancelled",
  cols: [{ h: ["ชุด", "Batch"], c: b => `<span class="mono">${b.id}</span><div class="sub">${fdate(b.t)}</div>` }, { h: ["คำขอ", "Requests"], n: true, c: b => sbReqs(b).length },
    { h: ["ส่ง (ลบ.)", "Sent (M)"], n: true, c: b => mb(sumv(sbReqs(b).map(subAmt))) },
    { h: ["ผลพิจารณา (ลบ.)", "Result (M)"], n: true, c: b => (sbReqs(b).some(r => sbS().results[r.id] != null) ? mb(sumv(sbReqs(b).map(r => sbS().results[r.id] || 0))) : "–") }],
  fields: (b, v) => {
    if (b && ["reviewing", "result"].includes(b.status))
      return sbReqs(b).map(r => ({ id: "res_" + r.id, label: [`${r.id} (ขอ ${mb(subAmt(r))} ลบ.)`, `${r.id} (asked ${mb(subAmt(r))} M)`], type: "money", req: true, min: 0, max: subAmt(r), value: sbS().results[r.id] != null ? sbS().results[r.id] : "", hint: esc(tx(r.name)) }))
        .concat([{ id: "note", label: ["หมายเหตุผลพิจารณา", "Note on the result"], type: "textarea", wide: true, value: b.note || "" }]);
    const pool = [...(b ? sbReqs(b) : []), ...sbReady().filter(r => !b || !sbReqs(b).includes(r))];
    if (!pool.length) return [{ id: "_none", label: ["คำขอ", "Requests"], type: "info", wide: true, html: L("ยังไม่มีคำขอที่ผู้บริหารเห็นชอบและยังไม่อยู่ในชุดใด", "No approved request is waiting for a batch") }];
    return pool.map(r => ({ id: "in_" + r.id, type: "check", wide: true, label: [`${r.id} ${tx(r.name)} · ${mb(subAmt(r))} ลบ.${sbBlocked(r) ? " · ยังไม่ผ่านการตรวจ" : ""}`, `${r.id} ${tx(r.name)} · ${mb(subAmt(r))} M${sbBlocked(r) ? " · checks not passed" : ""}`], value: b ? sbReqs(b).includes(r) : !sbBlocked(r) }));
  },
  check: (v, b) => {
    if (b && ["reviewing", "result"].includes(b.status)) return [];
    const ids = Object.keys(v).filter(k => k.startsWith("in_") && v[k]).map(k => k.slice(3));
    if (!ids.length) return [{ f: null, m: L("เลือกคำขออย่างน้อยหนึ่งรายการ", "Pick at least one request") }];
    const bad = ids.filter(id => sbBlocked(S.requests.find(r => r.id === id)));
    return bad.length ? [{ f: null, m: `${L("ยังไม่ผ่านการตรวจก่อนส่ง", "Not passing the checks")}: ${bad.join(", ")} · ${L("แก้ที่แท็บตรวจก่อนส่ง", "fix them on the checks tab")}` }] : [];
  },
  create: { can: () => ROLE === "plan" && sbReady().length > 0 && !sbBatches().some(b => b.status === "prep"), label: ["สร้างชุดส่ง", "New batch"],
    run: v => { const sb = sbS(); sb.seq = Math.max(sb.seq || 0, sbBatches().length) + 1;
      const b = { id: `SUB-${FORM_FY}-${String(sb.seq).padStart(2, "0")}`, t: nowIso(), by: me().id, status: "prep", reqs: Object.keys(v).filter(k => k.startsWith("in_") && v[k]).map(k => k.slice(3)) };
      sb.batches.push(b); b.reqs.forEach(id => (S.requests.find(r => r.id === id).sub = b.id));
      audit(["เตรียมชุดส่งสำนักงบประมาณ", "Prepared a Budget Bureau batch"], `${b.id} · ${b.reqs.length}`); sbSync(); return b; } },
  edit: { can: b => ROLE === "plan" && ["prep", "reviewing", "result"].includes(b.status),
    run: (b, v) => {
      if (b.status === "prep") { sbReqs(b).forEach(r => (r.sub = null)); b.reqs = Object.keys(v).filter(k => k.startsWith("in_") && v[k]).map(k => k.slice(3)); b.reqs.forEach(id => (S.requests.find(r => r.id === id).sub = b.id)); audit(["แก้ไขชุดส่ง", "Edited a batch"], `${b.id} · ${b.reqs.length}`); return; }
      sbReqs(b).forEach(r => (sbS().results[r.id] = v["res_" + r.id]));
      b.note = v.note; const first = b.status === "reviewing"; b.status = "result"; b.resultT = b.resultT || nowIso(); if (CR_OPEN && CR_OPEN.sim) { b.simulated = true; CR_OPEN.sim = false; }
      audit([first ? "บันทึกผลพิจารณาจากสำนักงบประมาณ" : "แก้ไขผลพิจารณา", first ? "Recorded the Budget Bureau result" : "Edited the result"], `${b.id}${b.simulated ? " · " + L("จำลอง", "simulated") : ""}`);
      if (first) notify(["plan", "exec", "fin"], [`ได้รับผลพิจารณาชุด ${b.id} จากสำนักงบประมาณแล้ว`, `The Budget Bureau's result for ${b.id} has arrived`], "sub-status");
      sbSync();
    } },
  acts: b => {
    if (ROLE !== "plan") return [];
    const sb = sbS(), out = [], openRev = (sb.revisions || []).filter(v => !v.closed && sbReqs(b).some(r => r.id === v.req));
    if (b.status === "prep") {
      if (sb.minister) out.push({ id: "send", label: L("ส่งถึงสำนักงบประมาณ", "Send to the Budget Bureau"), kind: "primary", impact: () => `${sbReqs(b).length} ${L("คำขอ", "requests")} · ${mb(sumv(sbReqs(b).map(subAmt)))} ${L("ลบ.", "M")}`,
        run: () => { const ch = S.integrations.find(i => i.id === "IF-01"); b.status = "sent"; b.t = nowIso(); b.count = sbReqs(b).length; b.amount = sumv(sbReqs(b).map(subAmt));
          b.method = ch && ch.status === "ok" ? ["ส่งผ่านช่องทาง IF-01", "Sent through IF-01"] : ["ส่งเป็นไฟล์ตามรูปแบบที่กำหนด", "Sent as a file in the prescribed format"];
          audit(["ส่งชุดคำของบประมาณถึงสำนักงบประมาณ", "Sent the request package to the Budget Bureau"], `${b.id} · ${b.count}`); notify(["exec", "plan"], [`ส่งคำของบประมาณ ${b.id} ถึงสำนักงบประมาณแล้ว`, `Request package ${b.id} sent to the Budget Bureau`], "sub-status"); sbSync(); return L("ส่งชุดข้อมูลแล้ว", "Batch sent"); } });
      out.push({ id: "cancel", label: L("ยกเลิกชุดนี้", "Cancel this batch"), kind: "danger", why: true, run: (_, why) => { sbReqs(b).forEach(r => (r.sub = null)); b.status = "cancelled"; b.why = why; audit(["ยกเลิกชุดส่ง", "Cancelled a batch"], `${b.id} · ${why}`); sbSync(); return L("ยกเลิกชุดแล้ว · คำขอกลับไปรอส่ง", "Batch cancelled · its requests wait again"); } });
    }
    if (b.status === "sent") out.push({ id: "recv", label: L("บันทึกว่าสำนักงบประมาณรับเรื่องแล้ว", "Record that the Budget Bureau received it"), kind: "primary", run: () => { b.status = "reviewing"; b.recvT = nowIso(); audit(["บันทึกสถานะ: สำนักงบประมาณเริ่มพิจารณา", "Status: Budget Bureau review started"], b.id); sbSync(); return L("บันทึกแล้ว", "Recorded"); } });
    if (["reviewing", "result"].includes(b.status)) out.push({ id: "sim", label: L("จำลองผลพิจารณา (เติมแบบฟอร์ม)", "Simulate the result (fills the form)"), kind: "ghost", undo: false,
      impact: () => L("เติม 92% ของยอดส่ง ปัดเป็นพันบาท (ค่าบุคลากรเต็มจำนวน) ให้ตรวจและแก้ก่อนบันทึก", "Fills 92% of each amount, rounded to a thousand baht (personnel in full), for you to check and change before saving"),
      run: () => { const d = { note: L("ผลจำลอง", "Simulated result") }; sbReqs(b).forEach(r => (d["res_" + r.id] = sbSim(r))); CR_OPEN.mode = "edit"; CR_OPEN.draft = d; CR_OPEN.sim = true; return L("เติมผลจำลองแล้ว · ตรวจแล้วกดบันทึก", "Filled with simulated results · check, then save"); } });
    if (b.status === "result") out.push({ id: "close", label: L("รับผลและส่งต่อการจัดสรร (B7)", "Accept and hand to allocation (B7)"), kind: "primary", impact: () => (openRev.length ? `${openRev.length} ${L("คำขอปรับปรุงยังไม่ได้ตอบ", "revision requests still open")}` : `${L("ผลรวม", "Total")} ${mb(sumv(sbReqs(b).map(r => sb.results[r.id] || 0)))} ${L("ลบ.", "M")}`),
      run: () => { if (openRev.length) return L("ตอบคำขอปรับปรุงให้ครบก่อน", "Answer every revision request first"); b.status = "closed"; b.closedT = nowIso(); audit(["รับผลพิจารณาและส่งต่อการจัดสรร", "Accepted the result and handed it to allocation"], b.id);
        notify(["fin"], [`ผลพิจารณาชุด ${b.id} พร้อมสำหรับการจัดสรร (B7)`, `Results of ${b.id} are ready for allocation (B7)`], "allocation"); sbSync(); return L("ส่งต่อการจัดสรรแล้ว", "Handed to allocation"); } });
    return out;
  },
  view: b => { const sb = sbS(), R = sbReqs(b);
    return kv([[L("สถานะ", "Status"), tx(SB_ST[b.status][0])], b.method && [L("ช่องทาง", "Channel"), tx(b.method)], [L("โดย", "By"), `${userName(b.by)} · ${fdate(b.t, true)}`],
      b.note && [L("หมายเหตุ", "Note"), esc(b.note)], b.simulated && [L("ที่มาของผล", "Result source"), tag(L("จำลอง", "Simulated"), "p-warn")], b.why && [L("เหตุผลที่ยกเลิก", "Why cancelled"), esc(b.why)]])
      + `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th class="n">${L("ส่ง", "Sent")}</th><th class="n">${L("ผล", "Result")}</th><th class="n">${L("ต่าง", "Diff.")}</th></tr></thead><tbody>${R.map(r => { const x = sb.results[r.id];
        return `<tr><td><span class="mono sub">${r.id}</span> ${esc(tx(r.name))}</td><td class="n">${mb(subAmt(r))}</td><td class="n">${x == null ? "–" : mb(x)}</td><td class="n" style="color:var(--${x != null && x < subAmt(r) ? "bad" : "ink-2"})">${x == null ? "–" : fmt((x - subAmt(r)) / 1e6, 2)}</td></tr>`; }).join("")}</tbody></table></div>`
      + (b.status === "prep" && !sb.minister ? `<p class="sub" style="color:var(--bad)">${L("ต้องบันทึกความเห็นชอบของรัฐมนตรีก่อนส่ง (ด้านบน)", "Record the minister's approval (above) before sending")}</p>` : ""); },
});

// ---------- revision requests ----------
CRUD.def("sbRev", {
  noun: ["คำขอปรับปรุงจากสำนักงบประมาณ", "Budget Bureau revision request"], st: { open: [["รอตอบ", "Open"], "p-warn"], closed: [["ตอบแล้ว", "Answered"], "p-ok"] },
  list: () => (sbS().revisions || []).map((v, i) => { if (!v.id) v.id = `RV-${String(i + 1).padStart(2, "0")}`; return v; }).slice().reverse(), id: v => v.id, title: v => tx(v.issue), sub: v => `<span class="mono">${v.req}</span> · ${L("ตอบภายใน", "reply by")} ${fdate(v.due)}`,
  status: v => (v.closed ? "closed" : "open"),
  cols: [{ h: ["คำขอ", "Request"], c: v => `<span class="mono">${v.req}</span>` }, { h: ["ประเด็น", "Issue"], c: v => esc(clip(tx(v.issue), 70)) }, { h: ["ตอบภายใน", "Reply by"], c: v => (v.closed ? `<span class="sub">${fdate(v.due)}</span>` : dueText(v.due)) }],
  fields: v => [
    { id: "req", label: ["คำขอ", "Request"], type: "select", req: true, value: v ? v.req : "", opts: sbBatches().filter(b => ["sent", "reviewing", "result"].includes(b.status)).flatMap(sbReqs).map(r => [r.id, `${r.id} · ${tx(r.name)}`]) },
    { id: "due", label: ["ตอบภายใน", "Reply by"], type: "date", req: true, value: v ? v.due : addDays(TODAY, 14) },
    { id: "issue", label: ["ประเด็นที่ขอปรับปรุง", "What they ask for"], type: "textarea", req: true, wide: true, value: v ? tx(v.issue) : "" },
  ],
  create: { can: () => ROLE === "plan" && sbBatches().some(b => ["sent", "reviewing", "result"].includes(b.status)), label: ["บันทึกคำขอปรับปรุง", "Record a revision request"],
    run: x => { const sb = sbS(); sb.revSeq = Math.max(sb.revSeq || 0, (sb.revisions || []).length) + 1; const v = { id: `RV-${String(sb.revSeq).padStart(2, "0")}`, req: x.req, due: x.due, issue: [x.issue, x.issue], closed: false, reply: "", t: nowIso(), by: me().id };
      sb.revisions.push(v); audit(["บันทึกคำขอปรับปรุงจากสำนักงบประมาณ", "Recorded a Budget Bureau revision request"], `${v.id} · ${v.req}`); return v; } },
  edit: { can: v => ROLE === "plan" && !v.closed, run: (v, x) => { Object.assign(v, { req: x.req, due: x.due, issue: [x.issue, x.issue] }); audit(["แก้ไขคำขอปรับปรุง", "Edited a revision request"], v.id); } },
  acts: v => (ROLE !== "plan" || v.closed ? [] : [
    { id: "reply", label: L("ส่งคำตอบ", "Send the reply"), kind: "primary", why: true, whyMin: 3, whyLabel: L("สรุปคำตอบหรือเอกสารที่ส่ง", "Summary of the reply or documents sent"), run: (_, why) => { v.closed = true; v.reply = why; v.repliedT = nowIso(); audit(["ตอบคำขอปรับปรุงจากสำนักงบประมาณ", "Answered a Budget Bureau revision request"], `${v.id} · ${v.req}`); return L("ส่งคำตอบแล้ว", "Reply sent"); } },
    { id: "del", label: L("ลบ (บันทึกผิด)", "Delete (recorded by mistake)"), kind: "danger", confirm: L("ลบคำขอปรับปรุงนี้?", "Delete this revision request?"), run: () => { sbS().revisions = sbS().revisions.filter(x => x !== v); audit(["ลบคำขอปรับปรุงที่บันทึกผิด", "Deleted a mistaken revision request"], v.id); return L("ลบแล้ว", "Deleted"); } },
  ]),
  view: v => kv([[L("คำขอ", "Request"), `<span class="mono">${v.req}</span> ${esc(tx((S.requests.find(r => r.id === v.req) || { name: ["", ""] }).name))}`], [L("ประเด็น", "Issue"), esc(tx(v.issue))], [L("ตอบภายใน", "Reply by"), dueText(v.due)], v.closed && [L("คำตอบ", "Reply"), `${esc(v.reply)}${v.repliedT ? ` <span class="sub">· ${fdate(v.repliedT)}</span>` : ""}`]]),
});

// ---------- the status tab ----------
{
  const prev = SUB.status;
  SUB.status = () => {
    sbSync();
    const full = prev(), box = full.slice(0, full.indexOf("</section>") + 10), sb = sbS(), idx = SUB_STEPS.findIndex(s => s[0] === sb.status), ready = sbReady();
    return box + `<section class="panel"><header><h2>${L(`สถานะการส่งคำของบประมาณ ปี ${FORM_FY}`, `FY${FORM_FY} submission status`)}</h2><span class="sp"></span><span class="sub">${L("กำหนดส่งตามปฏิทิน", "Calendar deadline")} ${fdate(cal("c6").date)}</span></header>
      <div class="body"><ol class="hsteps">${SUB_STEPS.map(([k, n], i) => `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><span class="dot"></span>${tx(n)}</li>`).join("")}</ol>
      ${ready.length ? `<p class="sub" style="margin-top:12px">${ready.length} ${L("คำขอเห็นชอบแล้วแต่ยังไม่อยู่ในชุดส่ง", "approved requests are not in a batch yet")}: ${ready.map(r => `<span class="mono">${r.id}</span>`).join(", ")}</p>` : ""}</div></section>`
      + crudList("sbBatch", { head: `<h2>${L("ชุดส่งสำนักงบประมาณ", "Budget Bureau batches")}</h2><span class="sp"></span><span class="sub">${L("ส่งได้หลายชุด ชุดเพิ่มเติมรวมเฉพาะคำขอที่ยังไม่ส่ง", "Several batches; a later one takes only requests not sent yet")}</span>`, empty: L("ยังไม่มีชุดส่ง", "No batches yet") })
      + crudList("sbRev", { head: `<h2>${L("คำขอปรับปรุงจากสำนักงบประมาณ", "Revision requests from the Budget Bureau")}</h2>`, empty: L("ยังไม่มีคำขอปรับปรุง", "No revision requests") });
  };
}

// ---------- parliament ----------
// The bill starts from the Budget Bureau results of closed batches (FL-04); before any batch is closed it falls back to the old source.
{
  const pi = parlItems;
  parlItems = function () {
    const P = S.parl; if (P.items) return P.items;
    const done = sbBatches().filter(b => b.status === "closed").flatMap(sbReqs).filter(r => !isPersonnel(r) && sbS().results[r.id] != null);
    return done.length ? done.map(r => ({ id: r.id, name: r.name, amt: Math.round(sbS().results[r.id] / 1e5) / 10 })) : pi();
  };
}
const PL_CUT = 2, PL_APPEAL = 3;
const plDates = () => (S.parl.dates = S.parl.dates || {});
const plCutRows = () => Object.keys(S.parl.cuts).map(id => Object.assign(S.parl.cuts[id], { id }));
const plAppRows = () => Object.keys(S.parl.appeals).map(id => Object.assign(S.parl.appeals[id], { id }));
const plItem = id => parlItems().find(it => it.id === id) || { id, name: [id, id], amt: 0 };
const plOpen = () => S.parl.stage < PARL_STEPS.length;
CRUD.def("plCut", {
  noun: ["การปรับลดของกรรมาธิการ", "Committee cut"], list: () => plCutRows(), id: c => c.id, title: c => tx(plItem(c.id).name), sub: c => `−${fmt(c.amt, 1)} ${L("ลบ.", "M")}`,
  cols: [{ h: ["โครงการ", "Project"], c: c => `<span class="mono sub">${c.id}</span> ${esc(tx(plItem(c.id).name))}` }, { h: ["ในร่าง", "In bill"], n: true, c: c => fmt(plItem(c.id).amt, 1) },
    { h: ["ปรับลด", "Cut"], n: true, c: c => `<span style="color:var(--bad)">−${fmt(c.amt, 1)}</span>` }, { h: ["เหตุผล", "Reason"], c: c => `<span class="sub">${esc(clip(tx(c.why), 60))}</span>` }],
  fields: c => [
    { id: "item", label: ["โครงการในร่าง พ.ร.บ.", "Project in the bill"], type: "select", req: true, value: c ? c.id : "", lock: !!c, show: c && `${c.id} ${tx(plItem(c.id).name)}`, opts: parlItems().filter(it => !S.parl.cuts[it.id]).map(it => [it.id, `${it.id} · ${tx(it.name)} · ${fmt(it.amt, 1)}`]) },
    { id: "amt", label: ["ปรับลด (ล้านบาท)", "Cut (million baht)"], type: "number", req: true, min: 0.1, value: c ? c.amt : "" },
    { id: "why", label: ["เหตุผลของกรรมาธิการ", "The committee's reason"], type: "textarea", req: true, wide: true, value: c ? tx(c.why) : "" },
  ],
  check: (v, c) => { const it = plItem(c ? c.id : v.item); return v.amt > it.amt ? [{ f: "amt", m: `${L("ไม่เกินวงเงินในร่าง", "Not more than the bill amount")} ${fmt(it.amt, 1)}` }] : []; },
  create: { can: () => ROLE === "plan" && S.parl.stage === PL_CUT, label: ["บันทึกการปรับลด", "Record a cut"],
    run: v => { S.parl.cuts[v.item] = { amt: Number(v.amt), why: [v.why, v.why], t: nowIso(), by: me().id }; audit(["บันทึกการปรับลดของกรรมาธิการ", "Recorded a committee cut"], `${v.item} · ${fmt(v.amt, 1)} M`); return Object.assign(S.parl.cuts[v.item], { id: v.item }); } },
  edit: { can: c => ROLE === "plan" && [PL_CUT, PL_APPEAL].includes(S.parl.stage) && !S.parl.appeals[c.id], run: (c, v) => { Object.assign(S.parl.cuts[c.id], { amt: Number(v.amt), why: [v.why, v.why] }); audit(["แก้ไขการปรับลดของกรรมาธิการ", "Edited a committee cut"], `${c.id} · ${fmt(v.amt, 1)} M`); } },
  acts: c => (ROLE === "plan" && [PL_CUT, PL_APPEAL].includes(S.parl.stage) && !S.parl.appeals[c.id] ? [{ id: "del", label: L("ลบ (บันทึกผิด)", "Delete (recorded by mistake)"), kind: "danger", confirm: L("ลบการปรับลดนี้?", "Delete this cut?"), run: () => { delete S.parl.cuts[c.id]; audit(["ลบการปรับลดที่บันทึกผิด", "Deleted a mistaken cut"], c.id); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: c => kv([[L("โครงการ", "Project"), `<span class="mono">${c.id}</span> ${esc(tx(plItem(c.id).name))}`], [L("ในร่าง", "In the bill"), `${fmt(plItem(c.id).amt, 1)} ${L("ลบ.", "M")}`], [L("ปรับลด", "Cut"), `${fmt(c.amt, 1)} ${L("ลบ.", "M")}`], [L("เหตุผล", "Reason"), esc(tx(c.why))], S.parl.appeals[c.id] && [L("แปรญัตติ", "Appeal"), L("ยื่นแล้ว · ลบหรือแก้การปรับลดไม่ได้", "Filed · the cut can't be changed")]]),
  hist: c => c.id,
});
CRUD.def("plApp", {
  noun: ["คำแปรญัตติขอคืน", "Appeal to restore"], st: { pending: [["รอผล", "Pending"], "p-warn"], granted: [["ได้คืน", "Restored"], "p-ok"], none: [["ไม่ได้คืน", "Not restored"], "p-bad"], withdrawn: [["ถอนแล้ว", "Withdrawn"], "p-mute"] },
  list: () => plAppRows(), id: a => a.id, title: a => tx(plItem(a.id).name), sub: a => `${L("ขอคืน", "asks for")} ${fmt(a.amt, 1)} ${L("ลบ.", "M")}`,
  status: a => (a.withdrawn ? "withdrawn" : a.granted == null ? "pending" : a.granted > 0 ? "granted" : "none"), gone: a => !!a.withdrawn,
  cols: [{ h: ["โครงการ", "Project"], c: a => `<span class="mono sub">${a.id}</span> ${esc(tx(plItem(a.id).name))}` }, { h: ["ถูกตัด", "Cut"], n: true, c: a => fmt((S.parl.cuts[a.id] || { amt: 0 }).amt, 1) },
    { h: ["ขอคืน", "Asked"], n: true, c: a => fmt(a.amt, 1) }, { h: ["ได้คืน", "Restored"], n: true, c: a => (a.granted == null ? "–" : fmt(a.granted, 1)) }],
  fields: a => {
    const cut = a ? (S.parl.cuts[a.id] || { amt: 0 }).amt : null;
    return [
      { id: "item", label: ["โครงการที่ถูกปรับลด", "Project that was cut"], type: "select", req: true, value: a ? a.id : "", lock: !!a, show: a && `${a.id} ${tx(plItem(a.id).name)}`, opts: plCutRows().filter(c => !S.parl.appeals[c.id]).map(c => [c.id, `${c.id} · ${tx(plItem(c.id).name)} · −${fmt(c.amt, 1)}`]) },
      { id: "amt", label: ["ขอคืน (ล้านบาท)", "Restore (million baht)"], type: "number", req: true, min: 0.1, value: a ? a.amt : "", hint: cut != null ? `${L("ถูกตัด", "Cut")} ${fmt(cut, 1)}` : "" },
      { id: "why", label: ["เหตุผลขอคืน", "Why it should be restored"], type: "textarea", req: true, wide: true, value: a ? tx(a.why) : "" },
      ...(a && S.parl.stage > PL_APPEAL ? [{ id: "granted", label: ["ผล: ได้คืน (ล้านบาท · เว้นว่างถ้ายังไม่มีผล)", "Result: restored (million baht · blank if not decided)"], type: "number", min: 0, value: a.granted == null ? "" : a.granted }] : []),
    ];
  },
  check: (v, a) => { const id = a ? a.id : v.item, cut = (S.parl.cuts[id] || { amt: 0 }).amt, e = [];
    if (v.amt > cut) e.push({ f: "amt", m: `${L("ไม่เกินที่ถูกตัด", "Not more than the cut")} ${fmt(cut, 1)}` });
    if (v.granted !== "" && v.granted != null && v.granted > v.amt) e.push({ f: "granted", m: L("ได้คืนไม่เกินที่ขอ", "Can't restore more than asked") }); return e; },
  create: { can: () => ROLE === "plan" && S.parl.stage === PL_APPEAL && plCutRows().some(c => !S.parl.appeals[c.id]), label: ["ยื่นแปรญัตติขอคืน", "File an appeal"],
    run: v => { S.parl.appeals[v.item] = { amt: Number(v.amt), why: [v.why, v.why], t: nowIso(), by: me().id, granted: null }; audit(["ยื่นแปรญัตติขอคืนงบประมาณ", "Filed an appeal to restore a cut"], `${v.item} · ${fmt(v.amt, 1)} M`); return Object.assign(S.parl.appeals[v.item], { id: v.item }); } },
  edit: { can: a => ROLE === "plan" && !a.withdrawn && plOpen() && (a.granted == null || S.parl.stage > PL_APPEAL),
    run: (a, v) => { const A = S.parl.appeals[a.id]; A.amt = Number(v.amt); A.why = [v.why, v.why]; if ("granted" in v) { A.granted = v.granted === "" ? null : Number(v.granted); A.decidedT = A.granted == null ? null : nowIso(); }
      audit(["แก้ไขคำแปรญัตติ", "Edited an appeal"], `${a.id}${A.granted != null ? ` · ${L("ได้คืน", "restored")} ${fmt(A.granted, 1)}` : ""}`); } },
  acts: a => (ROLE === "plan" && a.granted == null && !a.withdrawn && plOpen() ? [{ id: "wd", label: L("ถอนคำแปรญัตติ", "Withdraw the appeal"), kind: "danger", why: true, run: (_, why) => { delete S.parl.appeals[a.id]; audit(["ถอนคำแปรญัตติ", "Withdrew an appeal"], `${a.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } }] : []),
  view: a => kv([[L("โครงการ", "Project"), `<span class="mono">${a.id}</span> ${esc(tx(plItem(a.id).name))}`], [L("ถูกตัด", "Cut"), `${fmt((S.parl.cuts[a.id] || { amt: 0 }).amt, 1)} ${L("ลบ.", "M")}`], [L("ขอคืน", "Asked"), `${fmt(a.amt, 1)} ${L("ลบ.", "M")} · ${esc(tx(a.why))}`],
    [L("ผล", "Result"), a.granted == null ? L("รอผล · บันทึกผลได้หลังขั้นแปรญัตติ", "Pending · the result is recorded after the appeals stage") : `${fmt(a.granted, 1)} ${L("ลบ.", "M")}`]]),
  hist: a => a.id,
});
SUB.parliament = () => {
  const P = S.parl, st = P.stage, pl = ROLE === "plan", items = parlItems(), D = plDates(), closed = sbBatches().some(b => b.status === "closed");
  const tot = k => items.reduce((s, it) => s + k(it), 0), cutT = tot(it => (P.cuts[it.id] ? P.cuts[it.id].amt : 0)), grT = tot(it => (P.appeals[it.id] && P.appeals[it.id].granted) || 0);
  const pend = plAppRows().filter(a => a.granted == null).length;
  const canNext = pl && st < PARL_STEPS.length && (st > 0 || closed);
  return `<section class="panel"><header><h2>${L(`ร่าง พ.ร.บ. งบประมาณรายจ่ายประจำปี ${FORM_FY} ในรัฐสภา`, `FY${FORM_FY} budget bill in parliament`)}</h2><span class="sp"></span>
      ${st >= PARL_STEPS.length ? tag(L("มีผลใช้บังคับ", "In force"), "p-ok") : tag(`${L("ขั้นปัจจุบัน", "Now")}: ${tx(PARL_STEPS[st][0])}`, "p-info")}</header>
    <div class="body"><ol class="hsteps parl">${PARL_STEPS.map(([n, d], i) => `<li class="${i < st ? "done" : i === st ? "now" : ""}"><span class="dot"></span>${tx(n)}<small class="sub">${D[i] ? `${fdate(D[i])} ✓` : `${L("กำหนด", "plan")} ${fdate(d)}`}</small></li>`).join("")}</ol>
      <div class="row" style="margin-top:14px;flex-wrap:wrap;gap:8px">
        ${pl && st < PARL_STEPS.length ? `<label class="field-inline" for="pl-date">${L("วันที่เสร็จจริง", "Done on")} <input type="date" id="pl-date" value="${TODAY}"></label><button class="btn primary" type="button" id="pl-next" ${canNext ? "" : "disabled"}>${L("บันทึกว่าขั้นนี้เสร็จ", "Record this stage as done")}: ${tx(PARL_STEPS[st][0])}</button>` : ""}
        ${pl && st > 0 ? `<button class="btn ghost" type="button" id="pl-back">${L("ย้อนกลับหนึ่งขั้น", "Step back one stage")}</button>` : ""}
        ${pl && st === PL_CUT && !plCutRows().length ? `<button class="btn ghost" type="button" id="pl-simcut">${L("จำลองการปรับลด", "Simulate the cuts")}</button>` : ""}
        ${pl && st > PL_APPEAL && pend && plOpen() ? `<button class="btn ghost" type="button" id="pl-simapp">${L("จำลองผลแปรญัตติ (คืน 50%)", "Simulate appeal results (50% back)")}</button>` : ""}
        ${!closed && st === 0 ? `<span class="sub" style="color:var(--bad)">${L("ต้องมีชุดส่งที่รับผลพิจารณาแล้วก่อน (แท็บสถานะ)", "A batch must be closed with results first (status tab)")}</span>` : ""}
        ${st === PL_APPEAL && pend ? `<span class="sub">${L("ผลแปรญัตติบันทึกได้หลังขั้นนี้", "Appeal results can be recorded after this stage")}</span>` : ""}</div>
      ${pl && st > 0 ? `<div class="row" id="pl-back-box" hidden style="margin-top:10px;gap:8px;flex-wrap:wrap"><input type="text" id="pl-back-why" placeholder="${L("เหตุผลที่ย้อนขั้น (อย่างน้อย 10 ตัวอักษร)", "Why step back (at least 10 characters)")}" style="flex:1;min-width:200px" aria-label="${L("เหตุผล", "Reason")}"><button class="btn danger" type="button" id="pl-back-ok">${L("ยืนยันย้อนขั้น", "Confirm")}</button></div>` : ""}</div></section>
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("วงเงินในร่าง พ.ร.บ. (โครงการ)", "In the bill (projects)")}</span><span class="v">${fmt(tot(it => it.amt), 1)}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("กรรมาธิการปรับลด", "Committee cuts")}</span><span class="v" style="color:var(--${cutT ? "bad" : "ink"})">${fmt(cutT, 1)}</span></div>
    <div class="kpi"><span class="l">${L("ได้รับคืนจากการแปรญัตติ", "Restored on appeal")}</span><span class="v" style="color:var(--${grT ? "accent" : "ink"})">${fmt(grT, 1)}</span></div>
    <div class="kpi hl"><span class="l">${L("วงเงินตาม พ.ร.บ.", "Appropriated")}</span><span class="v">${fmt(tot(parlFinal), 1)}<small>${L("ลบ.", "M")}</small></span></div></section>
  ${crudList("plCut", { head: `<h2>${L("การปรับลดของกรรมาธิการ", "Committee cuts")}</h2><span class="sp"></span><span class="sub">${L("บันทึกในขั้นกรรมาธิการ", "Recorded at the committee stage")}</span>`, empty: st < PL_CUT ? L("ยังไม่ถึงขั้นกรรมาธิการ", "Not at the committee stage yet") : L("ไม่มีการปรับลด", "No cuts") })}
  ${crudList("plApp", { head: `<h2>${L("แปรญัตติขอคืน", "Appeals to restore")}</h2><span class="sp"></span><span class="sub">${L("ยื่นในขั้นแปรญัตติ บันทึกผลหลังจากนั้น", "Filed at the appeals stage; results recorded after it")}</span>`, empty: st < PL_APPEAL ? L("ยื่นได้ในขั้นแปรญัตติ", "Opens at the appeals stage") : L("ยังไม่มีคำแปรญัตติ", "No appeals") })}
  <section class="panel"><header><h2>${L("ผลรายโครงการ", "Result by project")}</h2><span class="sp"></span><span class="sub">${L(`ล้านบาท · ใช้เป็นวงเงินตั้งต้นของการจัดสรรปี ${FORM_FY} (B7)`, `M baht · the starting point for the FY${FORM_FY} allocation (B7)`)}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("โครงการ", "Project")}</th><th class="n">${L("ในร่าง", "In bill")}</th><th class="n">${L("ปรับลด", "Cut")}</th><th class="n">${L("ได้คืน", "Restored")}</th><th class="n">${L("สุดท้าย", "Final")}</th></tr></thead>
      <tbody>${items.map(it => { const c = P.cuts[it.id], a = P.appeals[it.id]; return `<tr><td><span class="mono sub">${it.id}</span> ${esc(tx(it.name))}</td><td class="n">${fmt(it.amt, 1)}</td><td class="n" style="color:var(--${c ? "bad" : "ink-2"})">${c ? "−" + fmt(c.amt, 1) : "—"}</td><td class="n">${a && a.granted ? "+" + fmt(a.granted, 1) : "—"}</td><td class="n"><b>${fmt(parlFinal(it), 1)}</b></td></tr>`; }).join("")}</tbody></table></div></section>`;
};
function bindParl2() {
  const P = S.parl, nx = $("#pl-next");
  if (nx) nx.onclick = () => {
    const snap = crSnap(), d = $("#pl-date").value || TODAY, step = PARL_STEPS[P.stage][0];
    plDates()[P.stage] = d; P.stage += 1;
    if (P.stage === PL_CUT && !P.items) P.items = parlItems().map(x => Object.assign({}, x)); // the bill is fixed when the committee starts
    audit(["บันทึกขั้นตอนร่าง พ.ร.บ. งบประมาณ", "Recorded a budget bill stage"], `${tx(step)} · ${fdate(d)}`);
    if (P.stage === PL_CUT) notify(["plan", "exec"], ["ร่าง พ.ร.บ. เข้าสู่ขั้นกรรมาธิการ บันทึกการปรับลดเมื่อทราบผล", "The bill is with the scrutiny committee; record cuts as they come"], "sub-parliament");
    if (P.stage === PARL_STEPS.length) notify(["fin", "plan", "exec"], [`พ.ร.บ. งบประมาณปี ${FORM_FY} ประกาศใช้แล้ว พร้อมจัดสรร`, `The FY${FORM_FY} Budget Act is in force; ready to allocate`], "allocation");
    commit(); route(); crUndoOffer(snap, `${tx(step)} · ${L("บันทึกแล้ว", "recorded")}`);
  };
  const bk = $("#pl-back"); if (bk) bk.onclick = () => { $("#pl-back-box").hidden = false; $("#pl-back-why").focus(); };
  const bo = $("#pl-back-ok"); if (bo) bo.onclick = () => {
    const why = $("#pl-back-why").value.trim(); if (why.length < 10) { toast(L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters")); return; }
    const snap = crSnap(); P.stage -= 1; delete plDates()[P.stage]; if (P.stage < PL_CUT && !plCutRows().length) P.items = null;
    audit(["ย้อนขั้นตอนร่าง พ.ร.บ.", "Stepped the budget bill back"], `${tx(PARL_STEPS[P.stage][0])} · ${why}`); commit(); route(); crUndoOffer(snap, L("ย้อนขั้นแล้ว", "Stepped back"));
  };
  const sc = $("#pl-simcut"); if (sc) sc.onclick = () => {
    const snap = crSnap(), big = parlItems().slice().sort((a, b) => b.amt - a.amt);
    if (big[0]) P.cuts[big[0].id] = { amt: Math.round(big[0].amt * 0.08 * 10) / 10, why: ["ความพร้อมของแบบรูปรายการยังไม่ครบถ้วน ให้ทยอยดำเนินการ", "Drawings not ready; phase the work"], sim: true, t: nowIso() };
    if (big[1]) P.cuts[big[1].id] = { amt: Math.round(big[1].amt * 0.05 * 10) / 10, why: ["ราคาต่อหน่วยสูงกว่าราคากลาง", "Unit costs above the reference price"], sim: true, t: nowIso() };
    audit(["จำลองการปรับลดของกรรมาธิการ", "Simulated the committee cuts"], Object.keys(P.cuts).join(", ")); commit(); route(); crUndoOffer(snap, L("จำลองการปรับลดแล้ว · แก้ได้ในรายการ", "Cuts simulated · edit them in the list"));
  };
  const sa = $("#pl-simapp"); if (sa) sa.onclick = () => {
    const snap = crSnap(); Object.values(P.appeals).filter(a => a.granted == null).forEach(a => { a.granted = Math.round(a.amt * 0.5 * 10) / 10; a.sim = true; a.decidedT = nowIso(); });
    audit(["จำลองผลแปรญัตติ", "Simulated the appeal results"], "50%"); commit(); route(); crUndoOffer(snap, L("จำลองผลแปรญัตติแล้ว · แก้ได้ในรายการ", "Appeal results simulated · edit them in the list"));
  };
}
{
  const bb = BIND.submission;
  BIND.submission = () => { bb(); if (SUB_TAB === "parliament") bindParl2(); };
}
