// Reference data and seed parts shared by every sample organization.
const BUDGET_TYPES = [
  { id: "per", code: "1", name: ["งบบุคลากร", "Personnel"] },
  { id: "ope", code: "2", name: ["งบดำเนินงาน", "Operating"] },
  { id: "inv", code: "3", name: ["งบลงทุน", "Investment"] },
  { id: "sub", code: "4", name: ["งบเงินอุดหนุน", "Subsidies"] },
  { id: "oth", code: "5", name: ["งบรายจ่ายอื่น", "Other expenditure"] },
];
const typeName = id => tx((BUDGET_TYPES.find(t => t.id === id) || { name: ["-", "-"] }).name);
const FY_STATUS = {
  closed: [["ปิดปีแล้ว", "Closed"], "p-mute"], execution: [["ใช้จ่ายงบประมาณ", "In execution"], "p-ok"],
  request: [["จัดทำคำของบประมาณ", "Request preparation"], "p-info"], setup: [["เตรียมโครงสร้าง", "Structure setup"], "p-warn"],
};
const LEVELS = { program: ["แผนงาน", "Programme"], output: ["ผลผลิต / โครงการ", "Output / Project"], activity: ["กิจกรรม", "Activity"] };
const COND = { always: ["ทุกคำขอ", "Every request"], amount: ["เมื่อวงเงิน ≥", "When amount ≥"] };
// The six strategies of Thailand's 20-year National Strategy (2018–2037).
const NATIONAL = [
  { id: "N1", name: ["ด้านความมั่นคง", "National security"] },
  { id: "N2", name: ["ด้านการสร้างความสามารถในการแข่งขัน", "National competitiveness"] },
  { id: "N3", name: ["ด้านการพัฒนาและเสริมสร้างศักยภาพทรัพยากรมนุษย์", "Human capital development"] },
  { id: "N4", name: ["ด้านการสร้างโอกาสและความเสมอภาคทางสังคม", "Social opportunity and equality"] },
  { id: "N5", name: ["ด้านการสร้างการเติบโตบนคุณภาพชีวิตที่เป็นมิตรต่อสิ่งแวดล้อม", "Eco-friendly growth and quality of life"] },
  { id: "N6", name: ["ด้านการปรับสมดุลและพัฒนาระบบการบริหารจัดการภาครัฐ", "Public sector rebalancing and development"] },
];
const natName = id => tx((NATIONAL.find(n => n.id === id) || { name: ["-", "-"] }).name);
const PLAN_YEARS = [0, 1, 2, 3, 4].map(i => FORM_FY + i); // the five-year plan starts with the year being formulated

function sharedSeed() {
  return {
    v: DATA_V,
    criteria: [
      { id: "c1", w: 30, name: ["ความสอดคล้องกับยุทธศาสตร์", "Strategic fit"] },
      { id: "c2", w: 25, name: ["ความเร่งด่วน", "Urgency"] },
      { id: "c3", w: 20, name: ["ความพร้อมดำเนินการ", "Readiness"] },
      { id: "c4", w: 25, name: ["ผลกระทบต่อประชาชน", "Impact on citizens"] },
    ],
    fyList: [
      { fy: 2569, status: "closed", start: "2025-10-01", end: "2026-09-30" },
      { fy: CUR_FY, status: "execution", start: "2026-10-01", end: "2027-09-30" },
      { fy: FORM_FY, status: "request", start: "2027-10-01", end: "2028-09-30" },
      { fy: 2572, status: "setup", start: "2028-10-01", end: "2029-09-30" },
    ],
    calendar: [
      { id: "c1", date: "2026-10-01", role: "admin", name: [`เปิดระบบรับคำของบประมาณปี ${FORM_FY}`, `FY${FORM_FY} request window opens`] },
      { id: "c2", date: "2026-11-30", role: "div", name: ["สำนัก / กอง ส่งคำขอให้กองแผนงาน", "Divisions submit requests to Planning"] },
      { id: "c3", date: "2026-12-18", role: "plan", name: ["กองแผนงานกลั่นกรองรอบที่ 2 แล้วเสร็จ", "Planning completes review round 2"] },
      { id: "c4", date: "2027-01-08", role: "exec", name: ["คณะกรรมการพิจารณางบประมาณ", "Budget committee meeting"] },
      { id: "c5", date: "2027-01-22", role: "exec", name: ["ผู้บริหารเห็นชอบคำของบประมาณ", "Executive approval of requests"] },
      { id: "c6", date: "2027-02-05", role: "plan", name: ["ส่งคำของบประมาณถึงสำนักงบประมาณ", "Submit requests to the Budget Bureau"] },
    ],
    rules: [
      { id: "BR-01", on: true, effect: "block", name: ["คำขอต้องผูกกับกิจกรรมและตัวชี้วัด", "Request must link to an activity and a KPI"] },
      { id: "BR-02", on: true, effect: "block", param: 40, unit: ["ตัวอักษร", "characters"], name: ["ความยาวขั้นต่ำของเหตุผลความจำเป็น", "Minimum justification length"] },
      { id: "BR-03", on: true, effect: "block", name: ["รายการงบลงทุนต้องแนบคุณลักษณะเฉพาะ", "Investment items need a specification document"] },
      { id: "BR-04", on: true, effect: "warn", param: 20, unit: ["%", "%"], name: ["วงเงินเพิ่มจากปีก่อนเกินเกณฑ์ต้องอธิบาย", "Increase over last year above threshold needs explanation"] },
      { id: "BR-05", on: true, effect: "warn", name: ["ราคาต่อหน่วยเกินราคามาตรฐาน", "Unit price above the standard price"] },
      { id: "BR-06", on: true, effect: "block", name: ["ส่งคำขอได้เฉพาะในช่วงปฏิทินงบประมาณ", "Submit only within the budget calendar window"] },
    ],
    workflow: [
      { id: "w1", name: ["จัดทำคำขอ", "Prepare request"], role: "div", sla: 0, cond: "always" },
      { id: "w2", name: ["กองแผนงานกลั่นกรอง", "Planning review"], role: "plan", sla: 10, cond: "always" },
      { id: "w3", name: ["คณะกรรมการพิจารณางบประมาณ", "Budget committee"], role: "exec", sla: 7, cond: "amount", amount: 10e6 },
      { id: "w4", name: ["ผู้บริหารเห็นชอบ", "Executive approval"], role: "exec", sla: 5, cond: "always" },
    ],
    integrations: [
      { id: "IF-01", sys: "New e-Budgeting", dir: ["ส่งออก / นำเข้า", "Export / import"], method: ["ไฟล์ตามรูปแบบที่กำหนด", "File in the prescribed format"], freq: ["ตามรอบงบประมาณ", "Per budget cycle"], status: "pending", last: "", records: 0, msg: ["รอสำนักงบประมาณยืนยันช่องทาง", "Waiting for the Budget Bureau to confirm the channel"] },
      { id: "IF-02", sys: "New GFMIS Thai", dir: ["นำเข้า", "Import"], method: ["ไฟล์รายงาน", "Report file"], freq: ["รายวัน", "Daily"], status: "warn", last: "2026-10-15T06:00", records: 1284, msg: ["ยอดไม่ตรง 3 รายการ รอตรวจ", "3 rows do not reconcile, awaiting review"] },
      { id: "IF-03", sys: "ERP / Financial", dir: ["นำเข้า", "Import"], method: ["API", "API"], freq: ["รายวัน", "Daily"], status: "ok", last: "2026-10-16T05:30", records: 342, msg: ["สำเร็จ", "Succeeded"] },
      { id: "IF-04", sys: "e-GP", dir: ["นำเข้า", "Import"], method: ["ข้อมูลที่เปิดให้ใช้งาน", "Published data"], freq: ["รายสัปดาห์", "Weekly"], status: "error", last: "2026-10-14T22:00", records: 0, msg: ["หมดเวลาเชื่อมต่อ", "Connection timed out"] },
      { id: "IF-05", sys: "HR / Payroll", dir: ["นำเข้า", "Import"], method: ["API (ข้อมูลสรุป)", "API (summary data)"], freq: ["รายเดือน", "Monthly"], status: "ok", last: "2026-10-01T02:00", records: 58, msg: ["สำเร็จ", "Succeeded"] },
      { id: "IF-06", sys: "Identity Provider (SSO)", dir: ["ยืนยันตัวตน", "Authentication"], method: ["OpenID Connect", "OpenID Connect"], freq: ["ทุกการเข้าสู่ระบบ", "Every sign-in"], status: "ok", last: "2026-10-16T09:12", records: 211, msg: ["สำเร็จ", "Succeeded"] },
      { id: "IF-07", sys: "Email (SMTP)", dir: ["ส่งออก", "Outbound"], method: ["SMTP", "SMTP"], freq: ["ตามเหตุการณ์", "On event"], status: "ok", last: "2026-10-16T09:20", records: 37, msg: ["สำเร็จ", "Succeeded"] },
    ],
    prices: [
      { id: "SP-001", type: "inv", name: ["เครื่องคอมพิวเตอร์ตั้งโต๊ะ", "Desktop computer"], unit: ["ชุด", "set"], price: 22000 },
      { id: "SP-002", type: "inv", name: ["เครื่องคอมพิวเตอร์โน้ตบุ๊ก", "Notebook computer"], unit: ["เครื่อง", "unit"], price: 24000 },
      { id: "SP-003", type: "inv", name: ["เครื่องแม่ข่าย", "Server"], unit: ["ชุด", "set"], price: 650000 },
      { id: "SP-004", type: "ope", name: ["ค่าอบรมต่อคน", "Training per person"], unit: ["คน", "person"], price: 2500 },
      { id: "SP-005", type: "ope", name: ["ค่าจ้างที่ปรึกษาต่อเดือน", "Consultant per month"], unit: ["คน-เดือน", "person-month"], price: 120000 },
    ],
    chat: [],
    submission: { status: "preparing", batches: [], exports: [], results: {}, revisions: [] },
    agents: [
      { id: "AG-01", on: true, uses: 214, name: ["Budget Preparation Agent", "Budget Preparation Agent"], what: ["ร่างคำขอและเหตุผลความจำเป็น", "Drafts requests and justifications"] },
      { id: "AG-02", on: true, uses: 389, name: ["Budget Validation Agent", "Budget Validation Agent"], what: ["ตรวจความครบถ้วนและความผิดปกติ", "Checks completeness and anomalies"] },
      { id: "AG-03", on: true, uses: 96, name: ["Budget Analysis Agent", "Budget Analysis Agent"], what: ["วิเคราะห์แนวโน้มและเปรียบเทียบ", "Analyses trends and comparisons"] },
      { id: "AG-04", on: true, uses: 41, name: ["Budget Optimization Agent", "Budget Optimization Agent"], what: ["เสนอทางเลือกจัดสรรภายใต้ข้อจำกัด", "Proposes allocation options under limits"] },
      { id: "AG-05", on: true, uses: 152, name: ["Budget Monitoring Agent", "Budget Monitoring Agent"], what: ["แจ้งเตือนโครงการเสี่ยงเบิกจ่ายล่าช้า", "Flags projects at risk of slow spending"] },
      { id: "AG-06", on: true, uses: 177, name: ["Executive Budget Assistant", "Executive Budget Assistant"], what: ["ตอบคำถามผู้บริหารจากข้อมูลที่ได้รับอนุญาต", "Answers executives from permitted data"] },
    ],
  };
}

// Status of an integration as a pill
const IF_STATUS = { ok: [["ปกติ", "Healthy"], "p-ok"], warn: [["ต้องตรวจสอบ", "Needs review"], "p-warn"], error: [["ล้มเหลว", "Failed"], "p-bad"], pending: [["รออนุญาต", "Awaiting approval"], "p-mute"] };
