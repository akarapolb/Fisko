// B10/B11 records and the end-to-end demo (round C6, Budget CRUD design 6.9 and chapter 11, FR-C-42 to FR-C-44).
// - Saved scenarios: a what-if (the ceiling cut, or the four in-year what-ifs) can be saved with a name, reopened,
//   renamed and deleted. Opening one only sets the what-if screen; what-ifs never change real data.
// - Anomalies that were explained or escalated can be reopened by the auditor with a reason.
// - Agent runs that are running or waiting for a person can be cancelled with a reason.
// - The demo guide gets the end-to-end script E-01 to E-16 as its own part, with a filter.

// ---------- saved scenarios (FR-C-42) ----------
const SC_KIND = { cut: [["ลดวงเงินคำขอ", "Ceiling cut"], "p-info"], inyear: [["จำลองระหว่างปี", "In-year what-ifs"], "p-warn"] };
const scNow = () => (INTEL_TAB === "bwhatif" ? { kind: "inyear", params: JSON.parse(JSON.stringify(WI_B)) } : { kind: "cut", params: { cut: WI.cut, locks: WI.locks ? [...WI.locks] : null } });
const scSum = s => (s.kind === "cut" ? `${L("ลด", "cut")} ${s.params.cut}%${s.params.locks ? ` · ${s.params.locks.length} ${L("รายการคงไว้", "kept")}` : ""}` : `${L("กรอบลด", "ceiling")} −${s.params.cut}% · ${L("เลื่อน", "slip")} ${s.params.delay} · ${L("โอน", "move")} ${s.params.tr.from}→${s.params.tr.to} ${s.params.tr.amt}`);
CRUD.def("wiSc", {
  noun: ["สถานการณ์จำลองที่บันทึก", "Saved scenario"], st: SC_KIND,
  list: () => (S.scenarios || []).slice().reverse(), id: s => s.id, title: s => s.name, sub: s => `${tx(SC_KIND[s.kind][0])} · ${scSum(s)}`, status: s => s.kind,
  cols: [{ h: ["ชื่อ", "Name"], c: s => `<b style="font-weight:600">${esc(s.name)}</b><div class="sub">${esc(scSum(s))}</div>` }, { h: ["โดย", "By"], c: s => `<span class="sub">${esc(userName(s.by))} · ${fdate(s.t)}</span>` }],
  fields: s => [
    { id: "name", label: ["ชื่อสถานการณ์", "Scenario name"], req: true, wide: true, value: s ? s.name : "" },
    ...(s ? [] : [{ id: "_what", label: ["จะบันทึก", "What is saved"], type: "info", wide: true, html: (() => { const n = scNow(); return `${tx(SC_KIND[n.kind][0])} · ${esc(scSum(n))}`; })() }]),
    { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: s ? s.note || "" : "" },
  ],
  create: { can: () => ["plan", "exec", "fin"].includes(ROLE), label: ["บันทึกสถานการณ์นี้", "Save this scenario"],
    run: v => { S.scenarios = S.scenarios || []; const n = scNow(), s = { id: `SC-${String(maxNo(S.scenarios.map(x => x.id), /-(\d+)$/) + 1).padStart(3, "0")}`, name: v.name, note: v.note, kind: n.kind, params: n.params, by: me().id, t: nowIso() };
      S.scenarios.push(s); audit(["บันทึกสถานการณ์จำลอง", "Saved a what-if scenario"], `${s.id} ${v.name}`); return s; } },
  edit: { can: s => s.by === me().id || ROLE === "plan", run: (s, v) => { s.name = v.name; s.note = v.note; audit(["แก้ไขสถานการณ์จำลอง", "Edited a what-if scenario"], s.id); } },
  acts: s => [
    { id: "open", label: L("เปิดสถานการณ์นี้", "Open this scenario"), kind: "primary", undo: false, run: () => {
      if (s.kind === "cut") { WI.cut = s.params.cut; WI.locks = s.params.locks ? new Set(s.params.locks) : null; INTEL_TAB = "whatif"; }
      else { Object.assign(WI_B, JSON.parse(JSON.stringify(s.params))); INTEL_TAB = "bwhatif"; }
      crClose(); return `${L("เปิด", "Opened")} ${s.name}`; } },
    (s.by === me().id || ROLE === "plan") && { id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบสถานการณ์นี้? ไม่กระทบข้อมูลจริง", "Delete this scenario? Real data isn't affected."), run: () => { S.scenarios = S.scenarios.filter(x => x !== s); audit(["ลบสถานการณ์จำลอง", "Deleted a what-if scenario"], s.id); return L("ลบแล้ว", "Deleted"); } },
  ],
  view: s => kv([[L("ชนิด", "Kind"), tx(SC_KIND[s.kind][0])], [L("สมมติฐาน", "Assumptions"), esc(scSum(s))], s.note && [L("หมายเหตุ", "Note"), esc(s.note)], [L("บันทึกโดย", "Saved by"), `${esc(userName(s.by))} · ${fdate(s.t, true)}`]])
    + `<p class="sub">${L("การเปิดสถานการณ์ตั้งค่าหน้าจำลองเท่านั้น ไม่เปลี่ยนข้อมูลจริง", "Opening a scenario only sets the what-if screen; real data doesn't change")}</p>`,
});
["whatif", "bwhatif"].forEach(k => { const p = INTEL[k]; INTEL[k] = () => p() + crudList("wiSc", { head: `<h2>${L("สถานการณ์ที่บันทึกไว้", "Saved scenarios")}</h2><span class="sp"></span><span class="sub">${L("บันทึกค่าที่ตั้งไว้ด้านบนเพื่อเปิดใช้ภายหลัง", "Save the settings above to open them again later")}</span>`, empty: L("ยังไม่มีสถานการณ์ที่บันทึก", "No saved scenarios yet") }); });

// ---------- reopening anomalies (FR-C-43) ----------
CRUD.def("anDone", {
  noun: ["ความผิดปกติที่ปิดแล้ว", "Closed anomaly"], st: AN_ST,
  list: () => (S.anoms || []).filter(a => a.status !== "new"), id: a => a.id, title: a => `${tx(AN_KIND[a.kind])} · ${unitName(a.unit)}`, sub: a => `${L("ความเสี่ยง", "risk")} ${a.risk}`, status: a => a.status,
  cols: [{ h: ["รายการ", "Item"], c: a => `<span class="mono sub">${a.id}</span> ${tx(AN_KIND[a.kind])} · ${unitName(a.unit)}` }, { h: ["ผลการตรวจ", "Review"], c: a => `<span class="sub">${esc(clip(tx(a.note || ["–", "–"]), 70))}</span>` }],
  acts: a => (ROLE !== "audit" ? [] : [{ id: "reopen", label: L("เปิดใหม่", "Reopen"), kind: "primary", why: true, impact: () => L("กลับเป็น “รอตรวจ” ผลการตรวจเดิมเก็บในประวัติ", "Back to “to review”; the earlier review stays in the history"),
    run: (_, why) => { a.reopened = (a.reopened || []).concat({ t: nowIso(), by: me().id, why, was: a.status, note: a.note }); a.status = "new"; a.note = null; audit(["เปิดรายการความผิดปกติใหม่", "Reopened an anomaly"], `${a.id} · ${why}`); return L("เปิดใหม่แล้ว", "Reopened"); } }]),
  view: a => kv([[L("รายละเอียด", "Detail"), esc(tx(a.detail))], [L("ผลการตรวจ", "Review"), esc(tx(a.note || ["–", "–"]))], a.reopened && [L("เคยเปิดใหม่", "Reopened before"), a.reopened.map(x => `${fdate(x.t)} · ${esc(x.why)}`).join("<br>")]]),
  hist: a => a.id,
});
{ const p = INTEL.anoms; INTEL.anoms = () => p() + crudList("anDone", { head: `<h2>${L("รายการที่ปิดแล้ว", "Closed items")}</h2><span class="sp"></span><span class="sub">${L("ผู้ตรวจสอบเปิดใหม่ได้พร้อมเหตุผล", "Audit can reopen them with a reason")}</span>`, empty: L("ยังไม่มีรายการที่ปิด", "Nothing closed yet") }); }

// ---------- cancelling agent runs (FR-C-44) ----------
const RUN_ST = { running: [["กำลังทำงาน", "Running"], "p-info"], waiting: [["รอคนอนุมัติ", "Waiting for a person"], "p-warn"], stopped: [["หยุด", "Stopped"], "p-bad"], done: [["เสร็จ", "Done"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
CRUD.def("agRun", {
  noun: ["งานของเอเจนต์", "Agent run"], st: RUN_ST,
  list: () => (S.bRuns || []).slice().reverse(), id: r => r.id, title: r => `${r.id} · ${bAgName(r.agent)}`, sub: r => `${esc(userName(r.by))} · ${fdate(r.t, true)}`, status: r => r.status, gone: r => r.status === "cancelled",
  cols: [{ h: ["งาน", "Run"], c: r => `<span class="mono">${r.id}</span> ${bAgName(r.agent)}` }, { h: ["ขั้น", "Step"], n: true, c: r => `${Math.min(r.ptr + 1, r.steps.length)}/${r.steps.length}` }, { h: ["เริ่มโดย", "Started by"], c: r => `<span class="sub">${esc(userName(r.by))}</span>` }],
  acts: r => (["running", "waiting"].includes(r.status) && (r.by === me().id || ["plan", "fin", "exec"].includes(ROLE)) ? [
    { id: "show", label: L("เปิดในหน้าเอเจนต์", "Show it on the page"), undo: false, run: () => { B_RUN_OPEN = r.id; crClose(); return ""; } },
    { id: "cancel", label: L("ยกเลิกงาน", "Cancel the run"), kind: "danger", why: true, impact: () => L("ขั้นที่ยังไม่ทำจะไม่ทำ สิ่งที่อนุมัติไปแล้วยังมีผล", "Steps not yet done won't run; steps already approved stay in effect"),
      run: (_, why) => { const s = r.steps[r.ptr]; if (s && s.status === "await") s.status = "skipped"; /* the agent page knows "skipped" */ r.status = "cancelled"; r.cancelled = { t: nowIso(), by: me().id, why }; audit(["ยกเลิกงานของเอเจนต์", "Cancelled an agent run"], `${r.id} · ${why}`); return L("ยกเลิกงานแล้ว", "Run cancelled"); } },
  ] : [{ id: "show", label: L("เปิดในหน้าเอเจนต์", "Show it on the page"), undo: false, run: () => { B_RUN_OPEN = r.id; crClose(); return ""; } }]),
  view: r => `<ol class="plain">${r.steps.map((s, i) => `<li><span class="mono sub">${i + 1}. ${s.tool}</span> ${s.status ? tag(s.status, s.status === "approved" || s.status === "done" ? "p-ok" : s.status === "await" ? "p-warn" : "p-mute") : ""}</li>`).join("")}</ol>${r.cancelled ? kv([[L("ยกเลิกเมื่อ", "Cancelled"), `${fdate(r.cancelled.t)} · ${esc(userName(r.cancelled.by))} · ${esc(r.cancelled.why)}`]]) : ""}`,
});
{ const p = INTEL.bagents; INTEL.bagents = () => p() + crudList("agRun", { head: `<h2>${L("งานของเอเจนต์ทั้งหมด", "All agent runs")}</h2>`, empty: L("ยังไม่มีงาน", "No runs yet") }); }

// ---------- the end-to-end demo (design chapter 11) ----------
const E2E = [
  ["admin", "admin-fiscal", ["เปิดปีงบประมาณและข้อมูลหลัก", "Open the year and its master data"], ["ทุกปีเริ่มจากโครงสร้างและปฏิทินของปีนั้น ผู้ดูแลระบบเปิดปีถัดไปแล้วระบบคัดลอกโครงสร้างงบประมาณให้", "Each year starts from its structure and calendar. The administrator opens the next year and the budget structure is copied."], ["ปีงบประมาณและปฏิทิน → “เปิดปีงบประมาณถัดไป” → โครงสร้างงบประมาณ → “เพิ่มรายการโครงสร้าง” กิจกรรมใหม่หนึ่งรายการ", "Fiscal years & calendar → Open the next fiscal year → Budget structure → Add a node (one new activity)"]],
  ["plan", "strat-kpis", ["เป้าประสงค์และตัวชี้วัดใหม่", "A new goal and KPI"], ["แผนยุทธศาสตร์แก้ได้ในระบบ ทุกตัวชี้วัดมีค่าเป้าหมาย 5 ปีและเจ้าของ", "The strategy is edited in the system; every KPI has five-year targets and an owner."], ["แผนผังยุทธศาสตร์ → “เพิ่มยุทธศาสตร์หรือเป้าประสงค์” → แท็บตัวชี้วัด → “เพิ่มตัวชี้วัด” ใส่เป้า 5 ปี", "Strategy map → Add a strategy or goal → KPIs → Add KPI with five targets"]],
  ["div", "strat-bank", ["เสนอแนวคิดโครงการจนเป็นคำขอ", "From an idea to a request"], ["หน่วยงานเสนอแนวคิด กองแผนงานให้คะแนนและรับเข้าแผน แล้วแปลงเป็นร่างคำขอได้ทันที", "A unit proposes an idea; Planning scores and accepts it; it becomes a draft request at once."], ["“เสนอแนวคิดโครงการ” → สลับเป็นกองแผนงาน เปิดแนวคิด “แก้ไข” ให้คะแนน → “รับเข้าแผน” → “สร้างร่างคำขอ (B3)”", "Propose an idea → as Planning, open it, Edit to score → Accept → Create a B3 draft"]],
  ["plan", "cons-ceilings", ["ตั้งและออกกรอบวงเงิน", "Set and issue the ceilings"], ["กองแผนงานตั้งกรอบของกรม แบ่งให้หน่วยงาน และออกกรอบ หน่วยงานเห็นกรอบในหน้าคำขอทันที", "Planning sets the department ceiling, splits it by unit and issues it; units see it on their requests page."], ["“ตั้งและออกกรอบ” → ออกกรอบใหม่ (ฉบับที่ 2) พร้อมเหตุผล → ชี้ตารางกรอบรายหน่วย", "Set and issue → Reissue (version 2) with a reason → point at the unit table"]],
  ["div", "requests", ["จัดทำ ส่ง ถอน และส่งใหม่", "Prepare, send, withdraw, send again"], ["คำขอที่ส่งแล้วถอนกลับมาแก้ได้ ทุกครั้งมีเหตุผลและประวัติ ร่างที่ไม่เคยส่งลบได้", "A sent request can be withdrawn to edit, always with a reason and history; an unsent draft can be deleted."], ["เปิดคำขอในรายการ → “ถอนคำขอกลับมาแก้” → เปิดแบบฟอร์มเต็ม แก้แล้วส่งใหม่ → ตอบรับกรอบวงเงินด้านบน", "Open a request → Withdraw to edit → open the full form, fix and send again → accept the ceiling above"]],
  ["plan", "rev-rounds", ["กลั่นกรองและส่งต่อ", "Review and send on"], ["กองแผนงานปรับวงเงินรอบ 2 ส่งกลับคำขอที่ต้องแก้พร้อมเหตุผล และส่งคำขอทั้งหมดที่ผ่านต่อในคลิกเดียว", "Planning sets round 2, returns a request with a reason, and sends every passing request on in one click."], ["ปรับวงเงินรอบ 2 ใส่เหตุผล “บันทึก” → เลือกคำขอแล้ว “ส่งกลับแก้ไข” → “เสนอคณะกรรมการ / ผู้บริหาร”", "Change a round 2 amount with a reason, Save → pick a request, Return for revision → Send to committee / executives"]],
  ["plan", "rev-meetings", ["ตั้งการประชุมและบันทึกมติ", "Schedule the meeting and record resolutions"], ["การประชุมตั้ง เลื่อน หรือยกเลิกได้ มติไหลเป็นวงเงินที่เห็นชอบซึ่งใช้ในชุดส่ง", "Meetings can be scheduled, moved or cancelled; resolutions become the decided amounts the package uses."], ["“ตั้งการประชุม” (ถ้ายังไม่มี) → ติ๊กองค์ประชุม เลือกมติ “บันทึกมติและปิดการประชุม” → รับรองรายงานการประชุม", "Schedule a meeting (if none) → tick attendance, choose resolutions, record and close → certify the minutes"]],
  ["plan", "sub-status", ["ส่งสำนักงบประมาณเป็นชุด", "Send to the Budget Bureau in batches"], ["ชุดส่งเลือกคำขอที่ผ่านการตรวจ ผลพิจารณาบันทึกรายคำขอ ปุ่มจำลองเติมให้ตรวจก่อนบันทึก", "A batch takes the requests that pass the checks; results are recorded per request; Simulate fills them for checking."], ["บันทึกความเห็นชอบรัฐมนตรี → “สร้างชุดส่ง” → “ส่ง” → “รับเรื่อง” → “จำลองผลพิจารณา” แก้หนึ่งแถว “บันทึก” → คำขอปรับปรุง ตอบ → “รับผลและส่งต่อการจัดสรร”", "Record the minister's approval → New batch → Send → Received → Simulate the result, change a row, Save → answer the revision → Accept and hand to allocation"]],
  ["plan", "sub-parliament", ["ร่าง พ.ร.บ. ในรัฐสภา", "The bill in parliament"], ["ทุกขั้นบันทึกวันที่จริง ย้อนได้พร้อมเหตุผล การตัดลดและแปรญัตติเป็นรายการที่แก้ได้", "Each stage records its real date and can step back with a reason; cuts and appeals are editable lists."], ["“บันทึกว่าขั้นนี้เสร็จ” ถึงขั้นกรรมาธิการ → “จำลองการปรับลด” → ขั้นถัดไป “ยื่นแปรญัตติขอคืน” → ขั้นถัดไป บันทึกผลได้คืน → เดินจนประกาศใช้", "Record stages up to the committee → Simulate the cuts → next, File an appeal → next, record the restored amount → walk to the Gazette"]],
  ["fin", "alloc-appropriation", ["จาก พ.ร.บ. ถึงบรรทัดจัดสรรปีหน้า", "From the act to next year's lines"], ["วงเงินตาม พ.ร.บ. ต่อคำขอกลายเป็นบรรทัดจัดสรรพร้อมแผนรายเดือน", "Each request's appropriated amount becomes an allocation line with a monthly plan."], [`“สร้างบรรทัดจัดสรรปี ${FORM_FY} ตาม พ.ร.บ.” → เปิดปี ${FORM_FY} ดูบรรทัด`, `Create FY${FORM_FY} lines from the act → open FY${FORM_FY} and look at the lines`]],
  ["fin", "alloc-allocate", ["บรรทัดจัดสรรและงวดเงินปีนี้", "This year's lines and releases"], ["ร่างบรรทัดยืนยันแล้วจึงนับ ร่างลบได้ บรรทัดที่ยังไม่ใช้ยกเลิกได้พร้อมเหตุผล", "A draft line counts only once confirmed; drafts can be deleted; unused lines can be cancelled with a reason."], ["“เพิ่มบรรทัดจัดสรร” → “ยืนยันการจัดสรร” → “เลิกทำ” แล้วยืนยันอีกครั้ง → งวดเงิน “ขออนุมัติงวดเงิน” → “บันทึกผล: สำนักงบประมาณอนุมัติ”", "Add allocation line → Confirm → Undo, then confirm again → Releases: Request release → Record: Budget Bureau approved"]],
  ["fin", "alloc-transfers", ["โอนเปลี่ยนแปลง ถอน และอนุมัติ", "Transfer, withdraw, approve"], ["ระบบจัดประเภทการโอนและผู้อนุมัติ คำขอที่ยังรออนุมัติแก้หรือถอนได้", "The system classifies the transfer and its approver; a pending request can be edited or withdrawn."], ["“ขอโอนเปลี่ยนแปลง” → “ถอนคำขอ” พร้อมเหตุผล → ยื่นใหม่ → สลับเป็นผู้บริหาร “อนุมัติ”", "Request transfer → Withdraw with a reason → file again → as the executive, Approve"]],
  ["div", "mon-live", ["เลื่อนเวลาไปเดือนมีนาคม", "Move the clock to March"], ["ตัวเลือก “ข้อมูล ณ” เลื่อนวันที่สาธิตทั้งระบบ และนำเข้าผลเบิกจ่ายจำลองถึงเดือนนั้น", "“Figures as of” moves the demo date everywhere and imports simulated disbursement up to that month."], ["เลือก “มี.ค.” ในตัวเลือกข้อมูล ณ → แท็บรายงานความก้าวหน้า ส่งรายงาน → สลับเป็นกองแผนงาน แท็บการแจ้งเตือน “รับทราบ”", "Pick March in Figures as of → Progress reports, send one → as Planning, Alerts, Acknowledge"]],
  ["div", "perf-quarter", ["ผลตัวชี้วัดและรายงานรายไตรมาส", "KPI results and the quarterly report"], ["ตัวชี้วัดทุกตัวรวมที่สร้างใหม่บันทึกผลได้ รายงานรายไตรมาสเปิดตามไตรมาสของวันที่สาธิต", "Every KPI, including the new one, takes a result; the quarterly report opens on the demo quarter."], ["รายงานรายไตรมาส กรอกผลผลิต ส่ง → สลับเป็นกองแผนงาน รับและรับรอง → แท็บตัวชี้วัด กรอกผลตัวชี้วัดใหม่", "Quarterly reports: fill in outputs, submit → as Planning, accept and certify → KPIs tab: enter the new KPI's result"]],
  ["fin", "alloc-carry", ["กันเงินเหลื่อมปี", "Carry-over"], ["ปลายปีกองคลังขอกันเงินพร้อมหลักฐานสัญญา ผู้บริหารอนุมัติหรือไม่อนุมัติพร้อมเหตุผล", "At year end Finance asks to carry money over with the contract evidence; the executive approves or declines with a reason."], ["เลื่อนข้อมูล ณ เป็น ก.ย. (หน้า B8) → “ยื่นคำขอกันเงิน” → สลับเป็นผู้บริหาร “อนุมัติ”", "Move Figures as of to September (B8) → File carry-over request → as the executive, Approve"]],
  ["plan", "perf-recs", ["ประเมินผลและส่งต่อปีหน้า", "Evaluate and carry into next year"], ["ข้อเสนอแนะที่นำไปใช้กลายเป็นแนวคิดในคลังโครงการปีถัดไป ปิดวงจรงบประมาณ", "A recommendation that is acted on becomes an idea in next year's project bank, closing the cycle."], ["ปรับสถานะข้อเสนอแนะเป็น “กำลังแก้ไข” → “สร้างแนวคิดในคลังโครงการ” → เปิด B2 คลังโครงการ ชี้แนวคิดใหม่ → “กลับวันจริง”", "Set a recommendation to In progress → Create an idea in the project bank → open the B2 bank and point at it → Back to today"]],
];
E2E.forEach(([role, link, title, say, doo], i) => DEMO.push({ t: `E-${String(i + 1).padStart(2, "0")}`, part: "e2e", role, link, title, say, do: doo }));
let DEMO_F = "all"; // the filter starts on every step; "e2e" shows only E-01 to E-16
{
  const v = VIEWS.demo;
  VIEWS.demo = () => {
    const h = v(), seg = `<div class="row" style="margin:0 0 14px;gap:10px;flex-wrap:wrap"><span class="sub">${L("แสดง", "Show")}</span>${segBar([["e2e", `${L("ครบวงจร E-01 ถึง E-16 (ประมาณ 45 นาที)", "End to end, E-01 to E-16 (about 45 min)")}`], ["fin", L("การเงิน E-F01 ถึง E-F15 (ประมาณ 35 นาที)", "Finance, E-F01 to E-F15 (about 35 min)")], ["pe2e", L("จัดซื้อครบวงจร P-E01 ถึง P-E15 (ประมาณ 35 นาที)", "Procurement end to end, P-E01 to P-E15 (about 35 min)")], ["all", L("ทุกขั้นตอน", "Every step")], ["old", L("เส้นเรื่องเดิม", "The original storyline")]], DEMO_F, "demof")}</div>`;
    const keep = s => DEMO_F === "all" || (DEMO_F === "old" ? !s.part : s.part === DEMO_F);
    return h.replace('<ol class="demo">', `${seg}<ol class="demo">`).replace(/<li class="panel">([\s\S]*?)data-step="(\d+)"([\s\S]*?)<\/li>/g, (m, a, i, b) => (keep(DEMO[Number(i)]) ? m : ""));
  };
  const b = BIND.demo;
  BIND.demo = () => { b(); $$("[data-demof]").forEach(x => (x.onclick = () => { DEMO_F = x.dataset.demof; route(); })); };
}
