// In-app demo guide (round 6): the 15-minute storyline, each step one click away with the right role.
const DEMO = [
  { t: "0:00", role: "plan", link: "home", title: ["แพลตฟอร์มเดียว 6 บทบาท", "One platform, six roles"],
    say: ["Fisko รวมวงจรงบประมาณทั้งหมดไว้ในระบบเดียว แต่ละบทบาทเห็นเฉพาะงานของตนเอง พร้อมกำหนดส่งจากปฏิทินงบประมาณ", "Fisko holds the whole budget cycle. Each role sees only its own work, with deadlines from the budget calendar."],
    do: ["เข้าสู่ระบบด้วย SSO และรหัส MFA (246810) ชี้งานของฉันและปฏิทิน ลองค้นหาด้วย Ctrl+K สลับภาษา TH/EN", "Sign in with SSO and the MFA code (246810); point at My tasks and the calendar; try Ctrl+K search; switch TH/EN"] },
  { t: "0:45", role: "plan", link: "strat-bank", title: ["M01 คลังโครงการ", "M01 Project bank"],
    say: ["แนวคิดโครงการทุกเรื่องผูกกับตัวชี้วัดตั้งแต่ต้น กองแผนงานให้คะแนนตามเกณฑ์เดียวกัน และใช้บทเรียนจากการประเมินผลปีก่อนประกอบ", "Every project idea is tied to a KPI from the start. Planning scores them on the same criteria, informed by lessons from past evaluations."],
    do: ["“ให้คะแนน” แนวคิดที่รอกลั่นกรอง → “รับเข้าแผน” แนวคิดที่ให้คะแนนแล้ว → ชี้บทเรียนจาก M08 ด้านล่าง", "Score the idea awaiting screening → Accept a scored idea → point at the M08 lessons below"] },
  { t: "1:45", role: "div", link: "req:STORY", title: ["M02 จัดทำคำขอพร้อมผู้ช่วย AI", "M02 Preparing a request with AI"],
    say: ["ผู้จัดทำวางรายการจาก Excel ได้ทันที ระบบเทียบราคามาตรฐานและตรวจตามกฎ AI ช่วยร่างเหตุผลความจำเป็น แต่ผู้จัดทำเป็นคนตรวจและส่ง", "The requester pastes lines from Excel; the system checks them against standard prices and the rules. AI drafts the justification, but the requester reviews and sends."],
    do: ["“วางจาก Excel” → “ใส่ข้อมูลตัวอย่าง” → “เพิ่ม” → “ร่างเหตุผลความจำเป็น” → “แนบคุณลักษณะเฉพาะ” → “ส่งให้กองแผนงาน”", "Paste from Excel → Use sample rows → Add → Draft justification → Attach specification → Send to Planning"] },
  { t: "3:30", role: "plan", link: "rev-queue", title: ["M04 กลั่นกรองรายบรรทัด", "M04 Line-by-line review"],
    say: ["กองแผนงานเห็นคิวพร้อมกำหนดเวลาตาม SLA ใส่ความเห็นรายบรรทัด ส่งกลับหรือเสนอต่อได้ ทุกอย่างถูกบันทึก", "Planning sees the queue with SLA due dates, comments on single lines, and returns or sends on. Everything is recorded."],
    do: ["กด “พิจารณา” ที่โครงการตัวอย่าง → ปุ่ม ✎ ใส่ความเห็น → “ผ่านการกลั่นกรอง · เสนอต่อ”", "Click Review on the storyline project → ✎ to comment → Pass review · send on"] },
  { t: "4:30", role: "plan", link: "cons-responses", title: ["M03 กรอบวงเงินและประมาณการล่วงหน้า", "M03 Ceilings and forward estimates"],
    say: ["กองแผนงานแจ้งกรอบวงเงินรายหน่วยงาน หน่วยงานยอมรับหรือขอทบทวนพร้อมเหตุผล และเห็นผลต่อประมาณการรายจ่าย 4 ปี", "Planning issues unit ceilings; units accept or appeal with a reason, and the 4-year forward estimates show the effect."],
    do: ["“เพิ่มกรอบให้” หน่วยงานที่ขอทบทวน → แท็บประมาณการล่วงหน้า 4 ปี ปรับสมมติฐานหนึ่งช่อง", "Grant the appeal → Forward estimates tab, change one assumption"] },
  { t: "5:30", role: "plan", link: "rev-impact", title: ["M04 ผลกระทบของการปรับลด", "M04 Impact of cuts"],
    say: ["ก่อนคณะกรรมการตัดสิน ระบบชี้ว่าการปรับลดแต่ละโครงการทำให้ตัวชี้วัดใดเสี่ยงไม่บรรลุเป้า", "Before the committee decides, the system shows which KPI targets each cut puts at risk."],
    do: ["สลับ “รอบ 2 กองแผน” กับ “รอบ 3 ผู้บริหาร” ชี้ตัวชี้วัดที่เสี่ยงสูง", "Switch between Round 2 and Round 3; point at the high-risk KPIs"] },
  { t: "6:15", role: "exec", link: "rev-meetings", title: ["M04 มติคณะกรรมการ", "M04 Committee resolutions"],
    say: ["บันทึกมติรายวาระ ระบบปรับสถานะคำขอตามมติอัตโนมัติ และเก็บวงเงินที่มีมติไว้ใช้ส่งสำนักงบประมาณ", "Record a resolution per item; request statuses follow automatically and the resolved amount flows to submission."],
    do: ["เลือก “เห็นชอบโดยปรับลดวงเงิน” ใส่วงเงิน → “บันทึกมติและปิดการประชุม”", "Choose Approved, amount reduced, enter an amount → Record resolutions"] },
  { t: "7:00", role: "plan", link: "sub-checks", title: ["M05 ส่งสำนักงบประมาณ", "M05 Submitting to the Budget Bureau"],
    say: ["ก่อนส่ง ระบบตรวจรหัส โครงสร้าง เอกสาร และสร้างแบบฟอร์มให้อัตโนมัติ จากนั้นติดตามสถานะจนได้ผลพิจารณา", "Before sending, codes, structure and documents are checked and the form is generated, then status is tracked to the result."],
    do: ["ดูแท็บตัวอย่างแบบฟอร์ม → แท็บสถานะ: ส่ง → จำลองผล 2 ขั้น", "Open Form preview → Status: send → run the two demo steps"] },
  { t: "8:00", role: "plan", link: "sub-parliament", title: ["M05 ร่าง พ.ร.บ. ในรัฐสภา", "M05 The budget bill in parliament"],
    say: ["ติดตามร่าง พ.ร.บ. ทุกวาระ เห็นวงเงินที่กรรมาธิการปรับลดรายโครงการ ยื่นแปรญัตติขอคืน และได้วงเงินสุดท้ายสำหรับการจัดสรร", "Follow the bill through every reading: the committee's cut per project, the appeal to restore it, and the final amount for allocation."],
    do: ["กดปุ่มจำลอง 3 ครั้งจนถึงกรรมาธิการ → ยื่นขอคืนหนึ่งโครงการ → กดจำลองต่อ ชี้วงเงินที่ได้คืน", "Click the demo button 3 times to reach the committee → file one appeal → continue and point at the restored amount"] },
  { t: "9:00", role: "fin", link: "alloc-carry", title: ["M06 งวดเงินและกันเงินเหลื่อมปี", "M06 Releases and carry-over"],
    say: ["กองคลังขออนุมัติงวดเงินตามแผนรายไตรมาส และติดตามเงินกันเหลื่อมปีก่อนครบกำหนด พร้อมตรวจหลักฐานสัญญาก่อนยื่นกันเงินใหม่", "Finance requests quarterly releases against the plan and tracks carried-over funds before their deadline, checking contract evidence before new carry-overs."],
    do: ["“ขอขยายเวลา” รายการที่เบิกจ่ายต่ำ → สลับเป็นผู้บริหาร “อนุมัติขยายเวลา” → ชี้แท็บงวดเงิน", "Ask to extend a slow item → switch to Executive and approve the extension → show the Allotment releases tab"] },
  { t: "10:00", role: "exec", link: "mon-forecast", title: ["M07 คาดการณ์สิ้นปีและการจัดซื้อจัดจ้าง", "M07 Year-end forecast and procurement"],
    say: ["ผู้บริหารเห็นว่าหน่วยงานใดจะเบิกจ่ายไม่ถึงเป้าตามมติ ครม. ตั้งแต่วันนี้ และโครงการลงทุนใดติดขั้นตอนจัดซื้อจัดจ้าง", "Executives see now which units will miss the cabinet's spending targets, and which investment projects are stuck in procurement."],
    do: ["ชี้หน่วยงานที่เสี่ยงในตาราง → แท็บขั้นตอนจัดซื้อจัดจ้าง ชี้ช่องสีแดง", "Point at the at-risk units → Procurement tab, point at the red cells"] },
  { t: "11:00", role: "plan", link: "perf-evaluate", title: ["M08 ประเมินโครงการและบทเรียน", "M08 Project evaluation and lessons"],
    say: ["ประเมินโครงการตั้งแต่ปัจจัยนำเข้าถึงผลลัพธ์ด้วยเกณฑ์ 5 ด้าน บทเรียนที่ได้ส่งกลับเข้าคลังโครงการ M01 สำหรับปีถัดไป", "Projects are evaluated from inputs to outcomes on five criteria; lessons go back into the M01 project bank for next year."],
    do: ["ให้คะแนนครบ 5 ด้าน ใส่ข้อค้นพบและบทเรียน → “ประเมินเสร็จ · ส่งบทเรียนเข้าคลังโครงการ”", "Score all five criteria, add findings and a lesson → Finish · send lessons to the project bank"] },
  { t: "12:00", role: "audit", link: "intel-anoms", title: ["M09 AI ตรวจความผิดปกติ", "M09 AI flags anomalies"],
    say: ["AI ชี้รายการที่ควรตรวจ เช่น แบ่งซื้อแบ่งจ้าง หรือจ่ายก่อนตรวจรับ ผู้ตรวจสอบเป็นผู้ตัดสินและทุกการตัดสินถูกบันทึก", "AI points to what to check, such as split purchases or payment before inspection. The auditor decides, and every decision is logged."],
    do: ["พิมพ์ผลการตรวจในรายการแบ่งซื้อแบ่งจ้าง → “ส่งตรวจสอบเพิ่มเติม” → แท็บคุณภาพเหตุผลคำขอ", "Type a note on the split-purchase item → Escalate → Justification quality tab"] },
  { t: "13:00", role: "exec", link: "intel-ask", title: ["M09 ถาม AI และจำลองสถานการณ์", "M09 Ask AI and what-if"],
    say: ["ถามด้วยภาษาธรรมชาติ ได้คำตอบพร้อมแหล่งอ้างอิง และจำลองการลดวงเงินโดยล็อกโครงการสำคัญ AI เสนอเท่านั้น", "Ask in plain language and get sourced answers; simulate a cut while locking key projects. AI only suggests."],
    do: ["คลิกคำถามตัวอย่าง → แท็บจำลองสถานการณ์ เลื่อนตัวเลข", "Click a sample question → What-if, move the slider"] },
  { t: "14:00", role: "admin", link: "admin-notify", title: ["M10 ปรับได้โดยไม่แก้โค้ด และปิดท้าย", "M10 Configure without code, and close"],
    say: ["ข้อความแจ้งเตือน SLA กฎ และ Workflow ปรับได้โดยผู้ดูแลระบบ มีผลทันทีทุกโมดูล และทุกการกระทำมี Audit Trail", "Notifications, SLAs, rules and workflow are changed by the administrator, apply everywhere at once, and every action has an audit trail."],
    do: ["แก้ข้อความแม่แบบดูตัวอย่าง → “ตรวจและส่งแจ้งเตือนตอนนี้” → แท็บบันทึกการใช้งาน", "Edit a template and watch the preview → Check and notify now → Audit log tab"] },
  // Extension (round 17): Fisko Procurement and Fisko Finance, about 10 minutes, same sample organisation.
  { t: "15:00", role: "div", link: "prc-plan", title: ["ขอซื้อขอจ้าง และระบบตรวจการแตกซื้อ", "Raising requisitions and the split-purchase check"],
    say: ["แผนจัดซื้อผูกกับรายการจัดสรรของ M06 ผู้ขอซื้อส่งใบขอได้ในวงเงินที่เหลือ และระบบเตือนเมื่อรายการเล็กหลายรายการรวมกันเกินเพดานวิธีเฉพาะเจาะจง", "The procurement plan is tied to M06 allocation lines. The requester raises a requisition within the room left, and the system warns when several small items together pass the specific-method ceiling."],
    do: ["“ขอซื้อขอจ้าง” PP-2570-006 (0.35 ล้าน) → “ส่งขออนุมัติ” → ทำซ้ำกับ PP-2570-005 (0.4 ล้าน) ระบบขอคำชี้แจง → พิมพ์เหตุผล → ส่ง", "Raise PP-2570-006 (0.35 M) → Send → do the same for PP-2570-005 (0.4 M); the system asks for an explanation → type a reason → Send"] },
  { t: "16:00", role: "exec", link: "prc-reqn", title: ["อนุมัติใบขอซื้อ และการแยกหน้าที่", "Approving requisitions and duty separation"],
    say: ["ผู้บริหารอนุมัติได้เมื่อไม่เกินวงเงินคงเหลือ และผู้ขอไม่ใช่ผู้อนุมัติ (SD-01) ถ้าอนุมัติแทน ระบบตรวจทั้งตัวผู้อนุมัติและผู้มอบอำนาจ", "The executive approves within the room left, and never the requester's own request (SD-01). If approving by delegation, both the approver and the delegator are checked."],
    do: ["“อนุมัติ” RQ-2570-005 และ RQ-2570-006 → ชี้ว่าแฟ้มจัดซื้อเลื่อนเป็นขั้น 3 อนุมัติหลักการ", "Approve RQ-2570-005 and RQ-2570-006 → point out that the cases moved to step 3"] },
  { t: "17:00", role: "proc", link: "case:PC-2570-006", title: ["แฟ้มจัดซื้อ: เลือกวิธีที่ต่างจากคำแนะนำ", "Case file: choosing a method that differs from the advice"],
    say: ["ระบบแนะนำวิธีจากตารางเกณฑ์ใน M10 พร้อมกฎและระดับความมั่นใจ เจ้าหน้าที่เลือกต่างได้เมื่อระบุเหตุผล และหัวหน้าพัสดุต้องอนุมัติ", "The system advises a method from the M10 rules table with the rule and confidence level. The officer can choose differently with a reason, and the head of procurement must approve."],
    do: ["ที่แผงวิธีจัดซื้อ เลือก “ประกวดราคาอิเล็กทรอนิกส์” พิมพ์เหตุผล → “บันทึกวิธี”", "In the method panel choose E-bidding, type a reason → Save the method"] },
  { t: "18:00", role: "prochead", link: "case:PC-2570-006", title: ["หัวหน้าพัสดุอนุมัติวิธี", "The head of procurement approves the method"],
    say: ["ทุกการเลือกที่ต่างจากคำแนะนำผ่านหัวหน้าพัสดุ และอยู่ในไทม์ไลน์ของแฟ้ม ตารางเกณฑ์และตัวเลขแต่ละตัวมีระดับ A B C ให้หน่วยงานยืนยัน", "Every override goes through the head and appears in the case timeline. Each number in the rules table carries a level A, B or C for the agency to confirm."],
    do: ["“อนุมัติวิธีนี้” → เปิดหน้า ผู้ดูแลระบบ → กฎจัดซื้อจัดจ้าง เพื่อดูตารางเกณฑ์", "Approve this method → open System administration → Procurement rules to see the table"] },
  { t: "19:00", role: "proc", link: "case:PC-2570-003", title: ["ผู้ยื่น พิจารณาผล อุทธรณ์ และทำสัญญา", "Bids, evaluation, appeal window and contract"],
    say: ["ขั้นตอนทางการทำใน e-GP Fisko เก็บข้อมูล คุมลำดับ และกันการลงนามสัญญาก่อนพ้นช่วงอุทธรณ์ กรรมการพิจารณาผลเป็นกรรมการตรวจรับของสัญญาเดียวกันไม่ได้ (SD-06)", "The official steps run in e-GP. Fisko records, keeps the order and blocks the contract until the appeal window ends. An evaluation committee member can't sit on the same contract's acceptance committee (SD-06)."],
    do: ["“จำลอง: ถึงวันปิดรับข้อเสนอ” → ใส่ผู้ยื่น 1 ราย → ไปขั้นพิจารณาผล → แต่งตั้งกรรมการ → “จำลอง: กรรมการทุกคนส่งแบบแจ้งและใบให้คะแนน” ชี้ตารางคะแนนรวม → บันทึกผลและประกาศผู้ชนะ → “จำลอง: พ้นกำหนดโดยไม่มีผู้อุทธรณ์” → ไปขั้นทำสัญญา", "Demo: the closing date arrives → 1 bidder → move to evaluation → appoint the committee → Demo: every member sends the declaration and score sheet, point at the totals → record and announce → Demo: no appeal → move to contracting"] },
  { t: "20:30", role: "proc", link: "prc-contracts", title: ["สัญญา ค่าปรับ และใบแจ้งหนี้", "Contract, penalty and invoice"],
    say: ["งวดแรกของสัญญา CT-2570-002 ส่งมอบช้า 1 วัน ระบบคิดค่าปรับตามอัตราที่ตั้งใน M10 งวดที่ตรวจรับแล้วบันทึกใบแจ้งหนี้ได้ ส่วนการแก้ไขสัญญาและขยายเวลาต้องผ่านระดับอนุมัติตามสัดส่วน", "Phase 1 of CT-2570-002 was delivered one day late, and the system works out the penalty at the rate set in M10. An accepted phase can take an invoice, while contract changes and extensions follow an approval ladder."],
    do: ["เลื่อนหา CT-2570-002 งวดที่ 1 → ชี้ค่าปรับ → “บันทึก” ใบแจ้งหนี้ (ใส่เลขที่ ยอดตั้งต้นถูกต้องแล้ว)", "Find CT-2570-002 phase 1 → point at the penalty → enter an invoice number and Save (the amount is already right)"] },
  { t: "22:00", role: "fin", link: "fnc-pay", title: ["ประตูเบิกจ่ายสามทาง", "The three-way payment gate"],
    say: ["การเงินขอเบิกได้เมื่อ ตรวจรับ ใบแจ้งหนี้ และหลักประกันครบ ยอดที่ขอเท่ากับยอดงวดหักค่าปรับและส่วนที่ไม่ผ่านตรวจรับ ถ้าไม่ผ่านระบบพักเป็นข้อยกเว้นให้หัวหน้าพัสดุปลดพร้อมเหตุผล", "Finance can request payment only when acceptance, invoice and guarantee all hold. The amount is the phase less the penalty and any rejected work. If not, the system holds it as an exception for the head to release with a reason."],
    do: ["เลือก CT-2570-002 งวดที่ 1 → ชี้ผลตรวจทั้ง 4 ข้อและยอดสุทธิ → “ส่งขออนุมัติ”", "Choose CT-2570-002 phase 1 → point at the four checks and the net amount → Send for approval"] },
  { t: "23:30", role: "audit", link: "prc-flags", title: ["สัญญาณเตือนและตัวชี้วัด", "Red flags and KPIs"],
    say: ["ระบบรวมสัญญาณ RF-01 ถึง RF-10 เป็นคะแนนต่อแฟ้มพร้อมหลักฐาน และใช้คำว่า “ควรตรวจ” ผู้ตรวจสอบขอคำชี้แจง ตัดสิน และผลบวกลวงถูกนับเพื่อปรับเกณฑ์ ไม่มีรายการใดถูกระงับอัตโนมัติ", "Signals RF-01 to RF-10 are combined into a score per case with the evidence, worded as “should be checked”. Audit asks for explanations and decides, and false positives are counted to tune the thresholds. Nothing is blocked automatically."],
    do: ["“ขอคำชี้แจง” ที่ RF-03 ผู้ยื่นรายเดียว → สลับเป็นเจ้าหน้าที่พัสดุตอบ → กลับมาตัดสิน → เปิดแท็บ วิเคราะห์ เพื่อดู KPI-01 ถึง 14", "Ask for an explanation on RF-03, the single bidder → switch to the procurement officer to answer → return and decide → open Analytics for KPI-01 to 14"] },
  { t: "25:00", role: "exec", link: "prc-ai", title: ["ผู้ช่วย AI และข้อมูลเปิด OCDS", "AI assistant and OCDS open data"],
    say: ["AI อ่านและร่าง คนตัดสิน ตอบคำถามจากตัวชี้วัดที่นิยามไว้พร้อมแหล่งที่มา และปฏิเสธการให้คะแนนผู้ยื่นหรือเลือกผู้ขาย ข้อมูลที่ประกาศแล้วส่งออกเป็นรูปแบบ OCDS", "AI reads and drafts and a person decides. It answers from the defined KPIs with the source, and refuses to score bidders or pick a supplier. Published data exports in the OCDS format."],
    do: ["ถาม “มีผู้ยื่นรายเดียวกี่ส่วน” → ถาม “จัดอันดับผู้ยื่น” เพื่อดูการปฏิเสธ → แท็บส่งออก OCDS “สร้าง JSON”", "Ask how often there is a single bidder → ask it to rank the bidders to see the refusal → OCDS export tab, Build JSON"] },
];
VIEWS.demo = () => `
  <div class="head"><div><div class="eyebrow">${L("คู่มือการสาธิต", "Demo guide")}</div><h1>${L("สาธิต Fisko 15 นาที + ส่วนเสริมจัดซื้อและการเงิน", "Fisko in 15 minutes + the Procurement and Finance extension")}</h1>
    <p>${L("ทุกขั้นตอนเดินตามโครงการตัวอย่างเดียวกัน กด “ไปที่ขั้นนี้” เพื่อสลับบทบาทและเปิดหน้าที่ถูกต้อง", "Every step follows the same storyline project. Go to step switches the role and opens the right screen.")}</p></div>
    <div class="sp"></div><button class="btn" type="button" id="demo-reset">${L("เริ่มใหม่ด้วยข้อมูลตั้งต้น", "Start over with fresh data")}</button></div>
  <ol class="demo">${DEMO.map((s, i) => `<li class="panel"><div class="demo-t">${s.t}</div>
    <div class="demo-b"><b>${i + 1}. ${tx(s.title)}</b><span class="sub">${tx(ROLES[s.role])}</span>
      <p>“${tx(s.say)}”</p><p class="demo-do">${L("คลิก", "Click")}: ${tx(s.do)}</p></div>
    <div><button class="btn primary" type="button" data-step="${i}">${L("ไปที่ขั้นนี้", "Go to step")}</button></div></li>`).join("")}</ol>`;
BIND.demo = () => {
  $("#demo-reset").onclick = () => { store.del(key()); S = SEEDS[ORG].seed(); save(); resetUi(); renderShell(); route(); toast(L("รีเซ็ตข้อมูลแล้ว พร้อมเริ่มสาธิต", "Data reset · ready to demo")); };
  $$("[data-step]").forEach(b => (b.onclick = () => {
    const s = DEMO[Number(b.dataset.step)];
    ROLE = s.role; store.set("fisko-role", ROLE); renderShell();
    jump(s.link.replace("STORY", S.story));
    toast(`${L("ขั้นที่", "Step")} ${Number(b.dataset.step) + 1} · ${tx(ROLES[ROLE])}`);
  }));
};
