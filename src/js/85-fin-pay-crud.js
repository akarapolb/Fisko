// Finance CRUD round FC3 (Fisko_Finance_CRUD_Design.html, chapters 6.3 and 8): GFMIS request files and e-Payment
// batches become records on the shared list (FR-FC-15 to 17). The officer picks the vouchers when making a file or a
// batch; the record's form is where the result comes back (SIM-F01 to F03), one row per voucher, and "Simulate"
// fills it for checking first. Until a result is recorded a voucher can be taken out of a file, and a whole file or
// batch can be cancelled with a reason. Also here: the daily payment check voucher by voucher with notes (FR-FC-18),
// cancelling and reissuing a 50 Tawi certificate (FR-FC-19) and money paid back on a paid voucher (FR-FC-14).
const rowsOf = ids => ids.map(vcOf).filter(Boolean);
const vcLine = v => `${v.id} · ${tx(v.payee.name)} · ${fmt(vCalc(v).net, 2)} ${L("บาท", "baht")}`;
const resTxt = r => (!r ? "—" : r.ok ? `${tag(L("ผ่าน", "OK"), "p-ok")} <span class="mono">${esc(r.doc || "")}</span>` : `${tag(L("ไม่ผ่าน", "Failed"), "p-bad")} <span class="sub">${esc(r.why || "")}</span>`);

// ---------- GFMIS request files (FR-FC-15, FR-FC-16) ----------
const GFO_ST = { sent: [["ส่งแล้ว รอผลบันทึก", "Sent · waiting for posting"], "p-warn"], posted: [["บันทึกแล้ว รอผลการจ่าย", "Posted · waiting for payment"], "p-info"], done: [["ได้ผลครบแล้ว", "All results in"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const gfoReady = () => (S.vouchers || []).filter(v => v.state === "ready" && !v.gfFile);
const gfoInFile = f => rowsOf(f.rows).filter(v => v.gfFile === f.id);
const gfoWaitPost = f => gfoInFile(f).filter(v => v.state === "ready");
const gfoWaitPay = f => gfoInFile(f).filter(v => v.state === "posted" && (vRoute(v).r === "direct" || !v.funded));
const gfoSt = f => (f.state === "cancelled" ? "cancelled" : gfoWaitPost(f).length ? "sent" : gfoWaitPay(f).length ? "posted" : "done");
function gfoCsv(f) {
  return [`# ${f.id} · ${L("ไฟล์ขอเบิกเงิน (จำลอง)", "Payment request file (simulated)")} · ${tx(S.org)}`, "voucher,type,budget_line,payee,tax_id,po,gross,penalty,wht,net,route",
    ...rowsOf(f.rows).map(v => { const x = vCalc(v), c = vcCon(v), m = vcCommit(v); return [v.id, v.type, v.line || v.fund || "", `"${tx(v.payee.name)}"`, v.payee.taxId || "", (c && c.gfPo ? c.gfPo.no : m && m.gfPo ? m.gfPo.no : ""), v.gross.toFixed(2), x.pen.toFixed(2), x.wht.toFixed(2), x.net.toFixed(2), vRoute(v).r].join(","); })].join("\n");
}
// What "Simulate" puts in the result form: every voucher passes and is paid the next working day.
function gfoSim(f) {
  const d = {};
  if (gfoSt(f) === "sent") gfoWaitPost(f).forEach((v, i) => { d["r_" + v.id] = "ok"; d["d_" + v.id] = String((S.gfSeq || 3600000400) + i + 1); d["w_" + v.id] = ""; });
  else gfoWaitPay(f).forEach(v => { d["r_" + v.id] = vRoute(v).r === "direct" ? "paid" : "funded"; d["d_" + v.id] = vRoute(v).r === "direct" ? `CGD-${addWorkdays(TODAY, 1).replace(/-/g, "").slice(2)}-${v.id.slice(-3)}` : ""; d["w_" + v.id] = ""; });
  return d;
}
CRUD.def("fnGfo", {
  noun: ["ไฟล์ขอเบิก GFMIS", "GFMIS request file"], st: GFO_ST, list: () => (S.gfOut = S.gfOut || []), id: f => f.id, title: f => f.id, sub: f => `${f.rows.length} ${L("ใบ", "vouchers")} · ${fdate(f.t, true)} · ${esc(userName(f.by))}`,
  status: gfoSt, gone: f => f.state === "cancelled", search: f => `${f.id} ${f.rows.join(" ")}`,
  cols: [{ h: ["ไฟล์", "File"], sort: f => f.id, c: f => `<span class="mono">${f.id}</span>` }, { h: ["ส่งเมื่อ", "Sent"], sort: f => f.t, c: f => `<span class="sub">${fdate(f.t, true)}</span>` },
    { h: ["ใบขอเบิก", "Vouchers"], c: f => `<span class="sub">${f.rows.join(", ") || "—"}</span>` }, { h: ["สุทธิ (บาท)", "Net (baht)"], n: true, c: f => fmt(sumv(rowsOf(f.rows).map(v => vCalc(v).net)), 2) }],
  fields: f => {
    if (!f) return [{ id: "_h", label: ["ใบที่พร้อมส่ง", "Vouchers ready to send"], type: "info", wide: true, html: `<span class="sub">${L("เลือกใบที่จะรวมในไฟล์นี้ ใบที่ไม่เลือกรอไฟล์ถัดไป", "Pick the vouchers for this file; the rest wait for the next one")}</span>` },
      ...gfoReady().map(v => ({ id: "v_" + v.id, label: [vcLine(v), vcLine(v)], type: "check", wide: true, value: true }))];
    if (!gfOk("record")) return [{ f: null, m: L("ไม่มีคำสั่งมอบหมายใน GFMIS", "No GFMIS assignment") }];
    const post = gfoSt(f) === "sent";
    return (post ? gfoWaitPost(f) : gfoWaitPay(f)).flatMap(v => [
      { id: "_" + v.id, label: [v.id, v.id], type: "info", wide: true, html: `<b style="font-weight:600">${esc(vcLine(v))}</b> <span class="sub">${tx(ROUTE[vRoute(v).r])}</span>` },
      { id: "r_" + v.id, label: ["ผล", "Result"], type: "select", value: post ? "ok" : vRoute(v).r === "direct" ? "paid" : "funded",
        opts: post ? [["ok", L("บันทึกผ่าน", "Posted")], ["fail", L("ไม่ผ่าน", "Rejected")]] : [[vRoute(v).r === "direct" ? "paid" : "funded", vRoute(v).r === "direct" ? L("จ่ายเงินแล้ว", "Paid") : L("เงินเข้าบัญชีหน่วยงานแล้ว", "Reached the agency account")], ["fail", L("จ่ายไม่สำเร็จ", "Payment failed")]] },
      { id: "d_" + v.id, label: post ? ["เลขเอกสาร GFMIS", "GFMIS document no."] : ["เลขอ้างอิงการจ่าย", "Payment reference"], value: "" },
      { id: "w_" + v.id, label: ["สาเหตุ (ถ้าไม่ผ่าน)", "Why (if it failed)"], value: "" }]);
  },
  check: (vals, f) => {
    if (!f) return gfoReady().some(v => vals["v_" + v.id]) ? [] : [{ f: null, m: L("เลือกใบขอเบิกอย่างน้อยหนึ่งใบ", "Pick at least one voucher") }];
    if (!gfOk("record")) return [{ f: null, m: L("ไม่มีคำสั่งมอบหมายใน GFMIS", "No GFMIS assignment") }];
    const post = gfoSt(f) === "sent";
    return (post ? gfoWaitPost(f) : gfoWaitPay(f)).flatMap(v => vals["r_" + v.id] === "fail" ? ((vals["w_" + v.id] || "").length < 5 ? [{ f: "w_" + v.id, m: L("ระบุสาเหตุ", "Say why") }] : [])
      : (post || vals["r_" + v.id] === "paid") && !vals["d_" + v.id] ? [{ f: "d_" + v.id, m: L("ต้องกรอก", "Required") }] : []);
  },
  create: { can: () => ROLE === "fin" && gfoReady().length > 0, label: ["สร้างไฟล์ขอเบิก", "Make a request file"], run: vals => {
    if (typeof gfOk === "function" && !gfOk("record")) return null;
    const F = S.gfOut = S.gfOut || [], rows = gfoReady().filter(v => vals["v_" + v.id]);
    const f = { id: `GO-${FAM_FY}-${pad2(maxNo(F.map(x => x.id), new RegExp(`^GO-${FAM_FY}-(\\d+)`)) + 1)}`, t: nowIso(), by: me().id, rows: rows.map(v => v.id), state: "sent", results: {} };
    rows.forEach(v => { v.gfFile = f.id; vLog(v, ["อยู่ในไฟล์ส่ง GFMIS", "Included in the GFMIS file"], f.id); });
    F.push(f); audit(["สร้างไฟล์ขอเบิกส่ง GFMIS", "Created a GFMIS request file"], `${f.id} · ${rows.map(v => v.id).join(", ")}`); return f; } },
  edit: { can: f => ROLE === "fin" && ["sent", "posted"].includes(gfoSt(f)), label: f => (gfoSt(f) === "sent" ? ["บันทึกผลจาก GFMIS", "Record the GFMIS result"] : ["บันทึกผลการจ่าย", "Record the payment result"]), run: (f, vals) => {
    const sim = !!(CR_OPEN && CR_OPEN.sim), tagSim = sim ? ` · ${L("จำลอง", "simulated")}` : "", post = gfoSt(f) === "sent"; if (CR_OPEN) CR_OPEN.sim = false;
    f.results = f.results || {}; f.payResults = f.payResults || {};
    (post ? gfoWaitPost(f) : gfoWaitPay(f)).forEach(v => {
      const r = vals["r_" + v.id], doc = vals["d_" + v.id], why = vals["w_" + v.id];
      if (post) {
        f.results[v.id] = { ok: r === "ok", doc, why, sim };
        if (r === "ok") { v.gf = { doc, t: nowIso(), file: f.id }; v.state = "posted"; if (vAgency(v)) v.funded = null; vLog(v, ["GFMIS บันทึกขอเบิกแล้ว", "Posted in GFMIS"], doc + tagSim); }
        else { v.gfFile = null; vLog(v, ["GFMIS ไม่รับรายการ กลับเป็นพร้อมส่ง", "GFMIS rejected it; back to ready"], why + tagSim); notify(["fin"], [`${v.id} ไม่ผ่านใน GFMIS: ${why}`, `${v.id} was rejected in GFMIS: ${why}`], "fnc-pay:vouchers"); }
      } else {
        f.payResults[v.id] = { ok: r !== "fail", doc, why, sim };
        if (r === "paid") vPaid(v, doc);
        else if (r === "funded") { v.funded = { t: nowIso() }; vLog(v, ["เงินเข้าบัญชีหน่วยงานแล้ว", "Money reached the agency account"], (v.gf ? v.gf.doc : "") + tagSim); }
        else { v.gfFile = null; v.gf = null; v.state = "ready"; vLog(v, ["จ่ายไม่สำเร็จ กลับเป็นพร้อมส่ง", "Payment failed; back to ready"], why + tagSim); notify(["fin"], [`${v.id} จ่ายไม่สำเร็จ: ${why}`, `${v.id} payment failed: ${why}`], "fnc-pay:vouchers"); }
      }
    });
    if (post) { f.state = "posted"; f.posted = nowIso(); }
    audit([post ? "นำเข้าผลบันทึกขอเบิกจาก GFMIS" : "นำเข้าผลการจ่ายจาก GFMIS", post ? "Recorded the GFMIS posting result" : "Recorded the GFMIS payment result"], `${f.id}${tagSim}`); } },
  acts: f => {
    if (ROLE !== "fin") return [];
    const st = gfoSt(f), out = [];
    if (["sent", "posted"].includes(st)) out.push({ id: "sim", label: st === "sent" ? L("จำลองผลบันทึก (เติมแบบฟอร์ม)", "Simulate the posting (fills the form)") : L("จำลองผลการจ่าย (เติมแบบฟอร์ม)", "Simulate the payment (fills the form)"), kind: "ghost", undo: false,
      run: () => { CR_OPEN.mode = "edit"; CR_OPEN.draft = gfoSim(f); CR_OPEN.sim = true; return L("เติมผลจำลองแล้ว ตรวจแล้วกดบันทึก", "Simulated result filled in; check it, then save"); } });
    if (st === "sent") {
      gfoWaitPost(f).forEach(v => out.push({ id: "rm_" + v.id, label: `${L("นำออกจากไฟล์", "Take out")} ${v.id}`, why: true, impact: () => L(`${v.id} กลับเป็นพร้อมส่ง รอไฟล์ถัดไป`, `${v.id} goes back to ready for the next file`),
        run: (_, why) => { v.gfFile = null; f.rows = f.rows.filter(id => id !== v.id); (f.removed = f.removed || []).push({ id: v.id, why, by: me().id, t: nowIso() }); if (!f.rows.length) f.state = "cancelled";
          vLog(v, ["นำออกจากไฟล์ GFMIS", "Taken out of the GFMIS file"], `${f.id} · ${why}`); audit(["นำใบขอเบิกออกจากไฟล์ GFMIS", "Took a voucher out of a GFMIS file"], `${f.id} · ${v.id} · ${why}`); return L("นำออกแล้ว", "Taken out"); } }));
      out.push({ id: "cancel", label: L("ยกเลิกไฟล์", "Cancel the file"), kind: "danger", why: true, impact: () => L(`ใบขอเบิก ${f.rows.length} ใบกลับเป็นพร้อมส่ง`, `${f.rows.length} vouchers go back to ready`),
        run: (_, why) => { gfoInFile(f).forEach(v => { v.gfFile = null; vLog(v, ["ยกเลิกไฟล์ GFMIS", "GFMIS file cancelled"], `${f.id} · ${why}`); }); f.state = "cancelled"; f.cancelled = { by: me().id, t: nowIso(), why };
          audit(["ยกเลิกไฟล์ขอเบิก GFMIS", "Cancelled a GFMIS request file"], `${f.id} · ${why}`); return L("ยกเลิกไฟล์แล้ว", "File cancelled"); } });
    }
    return out;
  },
  view: f => `<div class="tbl-wrap"><table><thead><tr><th>${L("ใบขอเบิก", "Voucher")}</th><th class="n">${L("สุทธิ", "Net")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ผลบันทึก", "Posting")}</th><th>${L("ผลการจ่าย", "Payment")}</th></tr></thead>
    <tbody>${rowsOf(f.rows).map(v => `<tr><td><span class="mono">${v.id}</span><div class="sub">${esc(tx(v.payee.name))} · ${tx(ROUTE[vRoute(v).r])}</div></td><td class="n">${fmt(vCalc(v).net, 2)}</td><td>${vTag(v)}</td>
      <td>${f.results && f.results[v.id] ? resTxt(f.results[v.id]) : v.gf && v.gf.file === f.id ? `<span class="mono">${esc(v.gf.doc)}</span>` : "—"}</td><td>${f.payResults && f.payResults[v.id] ? resTxt(f.payResults[v.id]) : v.paid ? `<span class="mono">${esc(v.paid.ref)}</span>` : "—"}</td></tr>`).join("")}</tbody></table></div>
    ${(f.removed || []).length ? `<p class="sub">${L("นำออกแล้ว", "Taken out")}: ${f.removed.map(x => `${x.id} (${esc(x.why)})`).join(", ")}</p>` : ""}
    ${f.cancelled ? `<p class="sub">${dotI("bad")}${L("ยกเลิก", "Cancelled")} · ${esc(userName(f.cancelled.by))} · ${esc(f.cancelled.why)}</p>` : ""}`,
  tabs: f => [["csv", L("ไฟล์", "File"), `<pre class="mono" style="white-space:pre-wrap;font-size:12px;background:var(--tint);padding:8px;border-radius:8px;margin:0">${esc(gfoCsv(f))}</pre>`]],
  hist: f => f.id,
});
FS.gfSend = () => {
  const V = S.vouchers || [], ready = gfoReady().length, posted = V.filter(v => v.state === "posted").length;
  return crudList("fnGfo", { head: `<h2>${L("ไฟล์ขอเบิกส่ง GFMIS", "GFMIS request files")}</h2><span class="sp"></span><span class="sub">${ready} ${L("ใบพร้อมส่ง", "ready to send")} · ${posted} ${L("ใบรอผลการจ่าย", "waiting for payment")} · ${L("ไฟล์จำลอง (D-FN-07)", "simulated files (D-FN-07)")}</span>`,
    empty: L("ยังไม่มีไฟล์", "No files yet") });
};

// ---------- e-Payment batches from the agency account (FR-FC-17, SIM-F03) ----------
const EP_ST = { sent: [["รอธนาคารยืนยัน", "Waiting for the bank"], "p-warn"], done: [["ธนาคารยืนยันแล้ว", "Confirmed by the bank"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const epSt = b => b.state || "done"; // batches from before round FC3 were paid at once
const epReady = () => (S.vouchers || []).filter(v => (v.state === "posted" || v.state === "nbready") && vAgency(v) && v.funded && v.method === "epay" && !v.epay);
const epWait = b => rowsOf(b.rows).filter(v => v.epay === b.id && v.state !== "paid");
CRUD.def("fnEp", {
  noun: ["ชุดจ่าย e-Payment", "e-Payment batch"], st: EP_ST, list: () => (S.epay = S.epay || []), id: b => b.id, title: b => b.id, sub: b => `${b.rows.length} ${L("รายการ", "payments")} · ${fmt(b.total, 2)} ${L("บาท", "baht")}`,
  status: epSt, gone: b => epSt(b) === "cancelled", search: b => `${b.id} ${b.rows.join(" ")}`,
  cols: [{ h: ["ชุด", "Batch"], sort: b => b.id, c: b => `<span class="mono">${b.id}</span>` }, { h: ["สร้างเมื่อ", "Made"], sort: b => b.t, c: b => `<span class="sub">${fdate(b.t, true)}</span>` },
    { h: ["รายการ", "Payments"], c: b => `<span class="sub">${b.rows.join(", ")}</span>` }, { h: ["ยอด (บาท)", "Total (baht)"], n: true, c: b => fmt(b.total, 2) }],
  fields: b => !b ? [{ id: "_h", label: ["รายการที่รอจ่ายจากบัญชีหน่วยงาน", "Payments waiting in the agency account"], type: "info", wide: true, html: `<span class="sub">${L("เลือกรายการที่จะรวมในชุดนี้", "Pick the payments for this batch")}</span>` },
      ...epReady().map(v => ({ id: "v_" + v.id, label: [vcLine(v), vcLine(v)], type: "check", wide: true, value: true }))]
    : epWait(b).flatMap(v => [{ id: "_" + v.id, label: [v.id, v.id], type: "info", wide: true, html: `<b style="font-weight:600">${esc(vcLine(v))}</b>` },
      { id: "r_" + v.id, label: ["ผลจากธนาคาร", "Bank result"], type: "select", value: "ok", opts: [["ok", L("โอนสำเร็จ", "Transferred")], ["back", L("ธนาคารคืนรายการ", "Returned by the bank")]] },
      { id: "w_" + v.id, label: ["สาเหตุ (ถ้าคืน)", "Why (if returned)"], value: "" }]),
  check: (vals, b) => (!b ? (epReady().some(v => vals["v_" + v.id]) ? [] : [{ f: null, m: L("เลือกอย่างน้อยหนึ่งรายการ", "Pick at least one payment") }])
    : epWait(b).filter(v => vals["r_" + v.id] === "back" && (vals["w_" + v.id] || "").length < 5).map(v => ({ f: "w_" + v.id, m: L("ระบุสาเหตุ", "Say why") }))),
  create: { can: () => ROLE === "fin" && epReady().length > 0, label: ["สร้างชุด e-Payment", "Make an e-Payment batch"], run: vals => {
    const B = S.epay = S.epay || [], rows = epReady().filter(v => vals["v_" + v.id]);
    const b = { id: `EP-${FAM_FY}-${pad2(maxNo(B.map(x => x.id), new RegExp(`^EP-${FAM_FY}-(\\d+)`)) + 1)}`, t: nowIso(), by: me().id, rows: rows.map(v => v.id), total: sumv(rows.map(v => vCalc(v).net)), state: "sent", results: {} };
    rows.forEach(v => { v.epay = b.id; vLog(v, ["อยู่ในชุด e-Payment", "In an e-Payment batch"], b.id); });
    B.push(b); audit(["สร้างชุดจ่าย e-Payment", "Made an e-Payment batch"], `${b.id} · ${rows.length} · ${fmt(b.total, 2)}`); return b; } },
  edit: { can: b => ROLE === "fin" && epSt(b) === "sent", label: () => ["บันทึกผลจากธนาคาร", "Record the bank result"], run: (b, vals) => {
    const sim = !!(CR_OPEN && CR_OPEN.sim), tagSim = sim ? ` · ${L("จำลอง", "simulated")}` : ""; if (CR_OPEN) CR_OPEN.sim = false;
    b.results = b.results || {};
    epWait(b).forEach(v => {
      const back = vals["r_" + v.id] === "back", why = vals["w_" + v.id];
      b.results[v.id] = { ok: !back, why, sim, doc: back ? "" : `${b.id}/${v.id.slice(-3)}` };
      if (back) { v.epay = null; vLog(v, ["ธนาคารคืนรายการ", "Returned by the bank"], `${b.id} · ${why}${tagSim}`); }
      else vPaid(v, `${b.id}/${v.id.slice(-3)}`);
    });
    b.state = "done"; b.total = sumv(rowsOf(b.rows).filter(v => v.state === "paid").map(v => vCalc(v).net));
    audit(["ธนาคารยืนยันชุด e-Payment", "Bank confirmed an e-Payment batch"], `${b.id}${tagSim}`); } },
  acts: b => (ROLE === "fin" && epSt(b) === "sent" ? [
    { id: "sim", label: L("จำลองผลจากธนาคาร (เติมแบบฟอร์ม)", "Simulate the bank result (fills the form)"), kind: "ghost", undo: false,
      run: () => { const d = {}; epWait(b).forEach(v => { d["r_" + v.id] = "ok"; d["w_" + v.id] = ""; }); CR_OPEN.mode = "edit"; CR_OPEN.draft = d; CR_OPEN.sim = true; return L("เติมผลจำลองแล้ว ตรวจแล้วกดบันทึก", "Simulated result filled in; check it, then save"); } },
    { id: "cancel", label: L("ยกเลิกชุด", "Cancel the batch"), kind: "danger", why: true, impact: () => L("รายการกลับไปรอจ่ายในบัญชีหน่วยงาน นาฬิกาส่งคืน (ข้อ 99) เดินต่อ", "The payments wait in the agency account again; the return clock (clause 99) keeps running"),
      run: (_, why) => { epWait(b).forEach(v => { v.epay = null; vLog(v, ["ยกเลิกชุด e-Payment", "e-Payment batch cancelled"], `${b.id} · ${why}`); }); b.state = "cancelled"; b.cancelled = { by: me().id, t: nowIso(), why };
        audit(["ยกเลิกชุดจ่าย e-Payment", "Cancelled an e-Payment batch"], `${b.id} · ${why}`); return L("ยกเลิกชุดแล้ว", "Batch cancelled"); } }] : []),
  view: b => `<div class="tbl-wrap"><table><thead><tr><th>${L("ใบขอเบิก", "Voucher")}</th><th class="n">${L("สุทธิ", "Net")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ผลจากธนาคาร", "Bank result")}</th></tr></thead>
    <tbody>${rowsOf(b.rows).map(v => `<tr><td><span class="mono">${v.id}</span><div class="sub">${esc(tx(v.payee.name))}</div></td><td class="n">${fmt(vCalc(v).net, 2)}</td><td>${vTag(v)}</td><td>${b.results && b.results[v.id] ? resTxt(b.results[v.id]) : v.paid && v.paid.ref.startsWith(b.id) ? `<span class="mono">${esc(v.paid.ref)}</span>` : "—"}</td></tr>`).join("")}</tbody></table></div>
    ${b.cancelled ? `<p class="sub">${dotI("bad")}${L("ยกเลิก", "Cancelled")} · ${esc(userName(b.cancelled.by))} · ${esc(b.cancelled.why)}</p>` : ""}`,
  hist: b => b.id,
});
FS.agencyPay = () => {
  const V = S.vouchers || [], c = fcfg();
  const clocks = V.filter(v => (v.state === "posted" || v.state === "nbready") && vAgency(v) && v.funded).map(v => { const due = addWorkdays(v.funded.t.slice(0, 10), c.refundDays); return `<div style="margin:3px 0">${dotI(clockDot(due))}<span class="mono">${v.id}</span> ${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)} · ${tx(METHOD[v.method])}${v.epay ? ` · <span class="mono">${v.epay}</span>` : ""} · <span class="sub">${L("ต้องจ่ายหรือส่งคืนภายใน", "pay or return by")} ${clockTxt(due)}</span></div>`; }).join("");
  return crudList("fnEp", { head: `<h2>${L("จ่ายจากบัญชีหน่วยงาน", "Pay from the agency account")}</h2><span class="sp"></span><span class="sub">${L("ข้อ 28 (2), 29 · ไม่ได้จ่ายภายใน", "Clauses 28 (2), 29 · unpaid within")} ${c.refundDays} ${L("วันทำการต้องส่งคืน (ข้อ 99)", "working days must be returned (clause 99)")}</span>`,
    after: `<div class="body">${clocks || `<p class="sub" style="margin:0">${L("ไม่มีเงินรอจ่ายในบัญชีหน่วยงาน", "No money waiting in the agency account")}</p>`}</div>`, empty: L("ยังไม่มีชุดจ่าย", "No batches yet") });
};

// ---------- daily payment check, voucher by voucher (FR-FC-18, clause 43) ----------
const DCK_SKIP = new Set();
const dckToday = () => (S.vouchers || []).filter(v => v.state === "paid" && !v.dayCheck);
// Note a payment that doesn't match its evidence; it stays unchecked and Finance is told.
function dckFlag(v, why) { v.dayFlag = { by: me().id, t: nowIso(), why }; vLog(v, ["ข้อสังเกตจากการตรวจการจ่ายประจำวัน", "Note from the daily payment check"], why); audit(["ตั้งข้อสังเกตการจ่าย", "Noted a payment in the daily check"], `${v.id} · ${why}`); notify(["fin"], [`ข้อสังเกตการจ่าย ${v.id}: ${why}`, `Payment note on ${v.id}: ${why}`], "fnc-pay:vouchers"); }
// Signs the ticked payments; every payment left unticked must carry a note.
function dckSign(ids) {
  const rows = dckToday().filter(v => ids.includes(v.id)), open = dckToday().filter(v => !ids.includes(v.id) && !v.dayFlag);
  if (!rows.length || open.length) return open.length ? L(`ยังไม่ได้ติ๊กหรือตั้งข้อสังเกต: ${open.map(v => v.id).join(", ")}`, `Not ticked and no note: ${open.map(v => v.id).join(", ")}`) : L("ไม่มีรายการที่ติ๊ก", "Nothing ticked");
  rows.forEach(v => { v.dayCheck = { t: nowIso(), by: me().id }; v.dayFlag = null; });
  (S.payChecks = S.payChecks || []).unshift({ t: nowIso(), by: me().id, ids: rows.map(v => v.id), flagged: dckToday().filter(v => v.dayFlag).map(v => v.id) });
  audit(["ตรวจการจ่ายประจำวันกับหลักฐาน", "Checked the day's payments against evidence"], `${rows.length}`);
  return null;
}
FS.dayCheck = () => {
  if (ROLE !== "finhead" && ROLE !== "audit") return "";
  const today = dckToday(), head = ROLE === "finhead", last = (S.payChecks || [])[0];
  return `<section class="panel"><header><h2>${L("ตรวจการจ่ายประจำวัน (ข้อ 43)", "Daily payment check (clause 43)")}</h2><span class="sp"></span><span class="sub">${L("ติ๊กรายการที่ตรงกับหลักฐาน รายการที่ไม่ตรงให้ตั้งข้อสังเกต", "Tick each payment that matches its evidence; note the ones that don't")}</span></header>
    ${today.length ? `<div class="tbl-wrap"><table><tbody>${today.map(v => `<tr><td>${head ? `<input type="checkbox" data-dck="${v.id}" ${DCK_SKIP.has(v.id) || v.dayFlag ? "" : "checked"} aria-label="${L("ตรงกับหลักฐาน", "Matches the evidence")} ${v.id}">` : ""}</td>
        <td><span class="mono">${v.id}</span> ${esc(tx(v.payee.name))}<div class="sub">${fmt(vCalc(v).net, 2)} · ${fdate(v.paid.t)} · ${tx(METHOD[v.method])}${v.dayFlag ? ` · ${dotI("warn")}${esc(v.dayFlag.why)}` : ""}</div></td>
        <td>${head ? rowBtn(`dck:${v.id}`, v.dayFlag ? L("แก้ข้อสังเกต…", "Change the note…") : L("ตั้งข้อสังเกต…", "Note…")) : ""}</td></tr>
        ${head && FIN_ROW === `dck:${v.id}` ? rowForm(3, `<label for="dck-${v.id}" class="sub">${L("ข้อสังเกต", "Note")}</label><input type="text" id="dck-${v.id}" value="${esc(v.dayFlag ? v.dayFlag.why : "")}" style="min-width:240px;flex:1"><button class="btn primary" type="button" data-dckflag="${v.id}">${L("บันทึกข้อสังเกต", "Save the note")}</button>`) : ""}`).join("")}</tbody></table></div>
      ${head ? `<div class="body"><button class="btn primary" type="button" id="day-check">${L("ลงนามรายการที่ติ๊ก", "Sign the ticked payments")} (${today.filter(v => !DCK_SKIP.has(v.id) && !v.dayFlag).length})</button></div>` : ""}`
      : `<div class="body"><p class="sub" style="margin:0">${dotI("ok")}${L("ตรวจการจ่ายครบแล้ว", "All payments checked")}${last ? ` · ${L("ล่าสุด", "last")} ${fdate(last.t, true)} ${esc(userName(last.by))}` : ""}</p></div>`}</section>`;
};
FIN_BINDS.push(() => {
  $$("[data-dck]").forEach(cb => (cb.onchange = () => { cb.checked ? DCK_SKIP.delete(cb.dataset.dck) : DCK_SKIP.add(cb.dataset.dck); route(); }));
  $$("[data-dckflag]").forEach(b => (b.onclick = () => { const v = vcOf(b.dataset.dckflag), why = ($(`#dck-${v.id}`).value || "").trim(); if (why.length < 5) { toastErr(L("ระบุข้อสังเกตอย่างน้อย 5 ตัวอักษร", "Write a note of at least 5 characters")); return; } dckFlag(v, why); DCK_SKIP.add(v.id); FIN_ROW = null; commit(); renderShell(); route(); toast(L("บันทึกข้อสังเกตแล้ว · แจ้งการเงิน", "Note saved · Finance is told")); }));
  const dc = $("#day-check");
  if (dc) dc.onclick = () => { const err = dckSign(dckToday().filter(v => !DCK_SKIP.has(v.id) && !v.dayFlag).map(v => v.id)); if (err) { toast(err); return; } commit(); renderShell(); route(); toast(L("ลงนามตรวจการจ่ายประจำวันแล้ว", "Daily payment check signed")); };
});

// ---------- 50 Tawi reissue (FR-FC-19) and money paid back on a paid voucher (FR-FC-14) ----------
function vcReissue(v, why) {
  const old = v.cert; S.whtSeq = (S.whtSeq || 0) + 1;
  (v.certs = v.certs || []).push(Object.assign({}, old, { cancelled: { by: me().id, t: nowIso(), why } }));
  v.cert = { no: `WHT-${FAM_FY}-${String(S.whtSeq).padStart(4, "0")}`, t: nowIso(), sent: null, replaces: old.no };
  vLog(v, ["ยกเลิกและออกหนังสือรับรองภาษีใหม่", "Cancelled and reissued the tax certificate"], `${old.no} → ${v.cert.no} · ${why}`); audit(["ออกหนังสือรับรองการหักภาษีใหม่", "Reissued a withholding tax certificate"], `${v.id} · ${old.no} → ${v.cert.no} · ${why}`);
}
const vcRefundable = v => r2(vCalc(v).net - (v.refunded || 0));
// The voucher is never changed: a receipt "money paid out and returned" records the refund and points back to it.
// Returned within the year (clause 100) it gives the amount back to the commitment or line (R-FC-07).
function vcRefund(v, amount, why) {
  if (!(amount > 0) || amount > vcRefundable(v)) return L(`ยอดคืนต้องมากกว่าศูนย์และไม่เกิน ${fmt(vcRefundable(v), 2)} บาท`, `The amount must be above zero and at most ${fmt(vcRefundable(v), 2)} baht`);
  const r = rcIssue({ kind: "refund", payer: v.payee.name, desc: [`เงินคืนจากใบขอเบิก ${v.id}: ${why}`, `Returned on voucher ${v.id}: ${why}`], amount, method: "epay", voucher: v.id });
  if (!r) return L("ออกใบเสร็จไม่ได้ ต้องมีเล่มใบเสร็จที่ถืออยู่ (F10)", "Couldn't issue a receipt; you need a receipt book (F10)");
  const inYear = rcClass(r) === "over";
  (v.refunds = v.refunds || []).push({ rc: r.id, amount, why, t: nowIso(), by: me().id, inYear }); v.refunded = r2((v.refunded || 0) + amount);
  if (inYear) { const m = vcCommit(v); if (m) m.paid = Math.max(0, (m.paid || 0) - amount); else if (!v.contract && !v.fund) v.lineBack = r2((v.lineBack || 0) + amount); }
  vLog(v, ["บันทึกรับเงินคืน", "Recorded money paid back"], `${rcNo(r)} · ${fmt(amount, 2)} · ${why}`); audit(["บันทึกรับเงินคืนจากการจ่าย", "Recorded money paid back"], `${v.id} · ${r.id} · ${fmt(amount, 2)}`);
  notify(["finhead"], [`รับเงินคืน ${fmt(amount, 2)} บาท จาก ${v.id} ต้องนำส่งภายใน ${fdate(rcDue(r))}`, `${fmt(amount, 2)} baht returned on ${v.id}; remit by ${fdate(rcDue(r))}`], "fnc-recv:receipts");
  return null;
}
{
  const base = vcActs;
  vcActs = v => {
    const out = base(v);
    if (ROLE === "fin" && v.state === "paid") { if (v.cert) out.push(["reissue", L("ยกเลิกและออก 50 ทวิ ใหม่", "Cancel and reissue the 50 Tawi"), "", true]); if (vcRefundable(v) > 0) out.push(["refund", L("บันทึกรับเงินคืน", "Record money paid back"), "", true]); }
    return out;
  };
  const imp = vcImpact;
  vcImpact = (v, a) => (a === "reissue" ? L(`ฉบับ ${v.cert.no} ถูกยกเลิกและเก็บไว้ ออกเลขใหม่ต่อเล่ม ต้องส่งให้ผู้รับเงินใหม่`, `${v.cert.no} is cancelled and kept; a new number is issued and must be sent again`)
    : a === "refund" ? L(`ออกใบเสร็จ “เงินคืนจากการจ่าย” อ้างถึง ${v.id} ใบขอเบิกไม่เปลี่ยน ถ้านำส่งภายในปีคืนวงเงินให้รายการ (R-FC-07) · นำส่งภายใน ${fcfg().refundDays} วันทำการ`, `Issues a “money paid out and returned” receipt pointing to ${v.id}; the voucher doesn't change. Returned within the year it gives the amount back (R-FC-07) · remit within ${fcfg().refundDays} working days`)
    : imp(v, a));
  vcAskExtra = (v, a) => (a === "refund" ? `<label for="vc-ramt">${L("ยอดที่ได้รับคืน (บาท)", "Amount paid back (baht)")}</label><input type="number" id="vc-ramt" min="0.01" step="0.01" max="${vcRefundable(v)}" value="${vcRefundable(v)}" style="max-width:200px" inputmode="decimal">` : "");
  const act = vcAct;
  vcAct = function (v, a, why) {
    if (a === "reissue" || a === "refund") {
      const w = String(why || "").trim(); if (w.length < CR_WHY_MIN) return L(`ใส่เหตุผลอย่างน้อย ${CR_WHY_MIN} ตัวอักษร`, `Give a reason of at least ${CR_WHY_MIN} characters`);
      if (a === "reissue") vcReissue(v, w);
      else { const err = vcRefund(v, r2(Number(($("#vc-ramt") || { value: 0 }).value)), w); if (err) return err; }
      commit(); renderShell(); route(); toast(a === "reissue" ? L("ออกหนังสือรับรองใหม่แล้ว", "Certificate reissued") : L("ออกใบเสร็จเงินคืนแล้ว", "Refund receipt issued")); return;
    }
    return act(v, a, why);
  };
}
