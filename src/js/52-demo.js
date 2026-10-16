// In-app demo guide (round 6): the 15-minute storyline, each step one click away with the right role.
const DEMO = [
  { t: "0:00", role: "plan", link: "home", title: ["แพลตฟอร์มเดียว 6 บทบาท", "One platform, six roles"],
    say: ["Fisko รวมวงจรงบประมาณทั้งหมดไว้ในระบบเดียว แต่ละบทบาทเห็นเฉพาะงานของตนเอง พร้อมกำหนดส่งจากปฏิทินงบประมาณ", "Fisko holds the whole budget cycle. Each role sees only its own work, with deadlines from the budget calendar."],
    do: ["เข้าสู่ระบบด้วย SSO และรหัส MFA (246810) ชี้งานของฉันและปฏิทิน ลองค้นหาด้วย Ctrl+K สลับภาษา TH/EN และสลับหน่วยงานตัวอย่าง", "Sign in with SSO and the MFA code (246810); point at My tasks and the calendar; try Ctrl+K search; switch TH/EN and the sample organization"] },
  { t: "1:00", role: "plan", link: "strat-align", title: ["M01 จากยุทธศาสตร์สู่คำขอ", "M01 From strategy to requests"],
    say: ["ทุกคำขอผูกกับกิจกรรมและตัวชี้วัด ระบบบอกได้ทันทีว่าวงเงินกี่เปอร์เซ็นต์สอดคล้องกับแผน และตัวชี้วัดใดยังไม่มีงบรองรับ", "Every request links to an activity and KPI, so you see at once how much budget follows the plan and which KPIs have no funding."],
    do: ["ชี้เส้นทางโครงการตัวอย่างด้านล่าง แล้วเปิดแท็บแผนผังยุทธศาสตร์", "Show the storyline trace at the bottom, then the Strategy map tab"] },
  { t: "2:30", role: "div", link: "req:STORY", title: ["M02 จัดทำคำขอพร้อมผู้ช่วย AI", "M02 Preparing a request with AI"],
    say: ["ผู้จัดทำกรอกรายการ ระบบคำนวณและตรวจตามกฎทันที AI ช่วยร่างเหตุผลความจำเป็นจากข้อมูลจริง แต่ผู้จัดทำเป็นคนตรวจและส่ง", "The requester enters lines; the system calculates and checks rules instantly. AI drafts the justification from real data, but the requester reviews and sends."],
    do: ["กด “ร่างเหตุผลความจำเป็น” → “แนบคุณลักษณะเฉพาะ” → ดูแท็บผูกพันหลายปีและเวอร์ชัน → “ส่งให้กองแผนงาน”", "Click Draft justification → Attach specification → show Multi-year and Versions tabs → Send to Planning"] },
  { t: "4:30", role: "plan", link: "rev-queue", title: ["M04 กลั่นกรองรายบรรทัด", "M04 Line-by-line review"],
    say: ["กองแผนงานเห็นคิวพร้อมกำหนดเวลาตาม SLA ใส่ความเห็นรายบรรทัด ส่งกลับหรือเสนอต่อได้ ทุกอย่างถูกบันทึก", "Planning sees the queue with SLA due dates, comments on single lines, and returns or sends on. Everything is recorded."],
    do: ["กด “พิจารณา” ที่โครงการตัวอย่าง → ปุ่ม ✎ ใส่ความเห็น → “ผ่านการกลั่นกรอง · เสนอต่อ”", "Click Review on the storyline project → ✎ to comment → Pass review · send on"] },
  { t: "6:00", role: "plan", link: "cons-priority", title: ["M03 จัดลำดับความสำคัญ", "M03 Prioritising"],
    say: ["เมื่อวงเงินไม่พอ ระบบจัดลำดับตามเกณฑ์ที่ปรับน้ำหนักได้ และแสดงเส้นตัดกรอบวงเงินให้เห็นชัด", "When money is short, projects rank by weighted criteria and the ceiling cut line is plain to see."],
    do: ["ปรับคะแนนหรือน้ำหนักหนึ่งรายการ แล้วดูเส้นประแดงเลื่อน", "Change one score or weight and watch the red cut line move"] },
  { t: "7:00", role: "exec", link: "rev-meetings", title: ["M04 มติคณะกรรมการ", "M04 Committee resolutions"],
    say: ["บันทึกมติรายวาระ ระบบปรับสถานะคำขอตามมติอัตโนมัติ และเก็บวงเงินที่มีมติไว้ใช้ส่งสำนักงบประมาณ", "Record a resolution per item; request statuses follow automatically and the resolved amount flows to submission."],
    do: ["เลือก “เห็นชอบโดยปรับลดวงเงิน” ใส่วงเงิน → “บันทึกมติและปิดการประชุม”", "Choose Approved, amount reduced, enter an amount → Record resolutions"] },
  { t: "8:00", role: "plan", link: "sub-checks", title: ["M05 ส่งสำนักงบประมาณ", "M05 Submitting to the Budget Bureau"],
    say: ["ก่อนส่ง ระบบตรวจรหัส โครงสร้าง เอกสาร และสร้างแบบฟอร์มให้อัตโนมัติ จากนั้นติดตามสถานะจนได้ผลพิจารณา", "Before sending, codes, structure and documents are checked and the form is generated, then status is tracked to the result."],
    do: ["ดูแท็บตัวอย่างแบบฟอร์ม → แท็บสถานะ: ส่ง → จำลองผล 2 ขั้น", "Open Form preview → Status: send → run the two demo steps"] },
  { t: "9:30", role: "fin", link: "alloc-transfers", title: ["M06 จัดสรรและโอนเปลี่ยนแปลง", "M06 Allocation and transfers"],
    say: ["กองคลังจัดสรรวงเงิน วางแผนรายเดือน และขอโอนเปลี่ยนแปลง ระบบส่งให้ผู้มีอำนาจที่ถูกต้องตามประเภทการโอน", "Finance allocates, plans monthly spending and requests transfers; the system routes each to the right authority."],
    do: ["ดูแท็บแผนการใช้จ่ายรายเดือน → สลับเป็นผู้บริหารแล้วอนุมัติรายการโอนที่รออยู่", "Show the Monthly plan tab → switch to Executive and approve the pending transfer"] },
  { t: "11:00", role: "exec", link: "mon-overview", title: ["M07 ติดตามการใช้จ่าย", "M07 Monitoring spending"],
    say: ["ผู้บริหารเห็นภาพรวม เจาะลึกจากหน่วยงานถึงหมวดรายจ่าย และได้รับแจ้งเตือนเชิงรุกจาก AI", "Executives see the overview, drill from unit to expense category, and get proactive alerts from AI."],
    do: ["แท็บเจาะลึก: คลิกหน่วยงาน → โครงการ → แท็บการแจ้งเตือน", "Drill-down: click a unit → a project → the Alerts tab"] },
  { t: "12:30", role: "plan", link: "perf-scorecard", title: ["M08 งบประมาณกับผลสัมฤทธิ์", "M08 Budget against results"],
    say: ["ทุกโครงการถูกวัดทั้งการใช้เงินและผลผลิต และร้อยเรียงถึงตัวชี้วัดและผลกระทบ รายงานประเมินผลร่างได้ด้วย AI", "Every project is measured on spending and output, linked to KPIs and impact; AI drafts the evaluation report."],
    do: ["ชี้กราฟ Scorecard → แท็บห่วงโซ่ผลลัพธ์ → แท็บรายงาน กด “ให้ AI ร่างข้อเสนอแนะ”", "Show the scorecard chart → Results chain → Report: Ask AI to draft recommendations"] },
  { t: "13:30", role: "exec", link: "intel-ask", title: ["M09 ถาม AI และจำลองสถานการณ์", "M09 Ask AI and what-if"],
    say: ["ถามด้วยภาษาธรรมชาติ ได้คำตอบพร้อมแหล่งอ้างอิง และจำลองการลดวงเงินโดยล็อกโครงการสำคัญ AI เสนอเท่านั้น", "Ask in plain language and get sourced answers; simulate a cut while locking key projects. AI only suggests."],
    do: ["คลิกคำถามตัวอย่าง → แท็บจำลองสถานการณ์ เลื่อนตัวเลข → แท็บ AI Agents", "Click a sample question → What-if, move the slider → AI agents tab"] },
  { t: "14:30", role: "admin", link: "admin-rules", title: ["M10 ปรับได้โดยไม่แก้โค้ด และปิดท้าย", "M10 Configure without code, and close"],
    say: ["กฎ Workflow และโครงสร้างงบประมาณปรับได้รายปีโดยผู้ดูแลระบบ มีผลทันทีทุกโมดูล และทุกการกระทำมี Audit Trail", "Rules, workflow and budget structure change yearly without code, apply everywhere at once, and every action has an audit trail."],
    do: ["ปรับเกณฑ์ BR-04 แล้วเปิดแท็บบันทึกการใช้งานให้เห็นประวัติ", "Change BR-04, then open the Audit log tab"] },
];
VIEWS.demo = () => `
  <div class="head"><div><div class="eyebrow">${L("คู่มือการสาธิต", "Demo guide")}</div><h1>${L("สาธิต Fisko ใน 15 นาที", "Fisko in 15 minutes")}</h1>
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
