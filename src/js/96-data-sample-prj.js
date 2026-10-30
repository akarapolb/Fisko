// The sample organization's project registry setup (round 64): who receives its shared data. Every name is sample data.
PRJ_CFG.sample = {
  log: [
    { t: "2026-10-16T07:00", to: "exec", rows: 214, asOf: "2026-10-15", by: "system", ok: null },
    { t: "2026-10-15T22:00", to: "ai", rows: 1260, asOf: "2026-10-15", by: "system", ok: null },
    { t: "2026-10-05T10:00", to: "bb", rows: 13, asOf: "2026-09-30", by: "u2", ok: "u3" },
  ],
  consumers: [
    { id: "exec", kind: "int", name: ["แดชบอร์ดผู้บริหาร", "Executive dashboard"], data: [["สถานะงบ ก่อหนี้ เบิกจ่าย", "Budget, commitment and payment status"]], mode: "API", status: "active", last: "2026-10-16T07:00" },
    { id: "ai", kind: "int", name: ["AI งบประมาณ", "Budget AI"], data: [["เงินกัน–เงินพับ และคำอธิบายข้อมูล", "Carry-over, lapse and the data dictionary"]], mode: "API", status: "active", last: "2026-10-15T22:00" },
    { id: "units", kind: "int", name: ["ทุกหน่วยงาน (เห็นของตนเอง)", "Every unit (its own data)"], data: [["คำขอ วงเงิน และการเบิกจ่ายของหน่วยงาน", "The unit's requests, budget and payments"]], mode: "Portal", status: "active", last: "2026-10-16T08:00" },
    { id: "bb", kind: "ext", name: ["สำนักงบประมาณ", "Budget Bureau"], data: [["ผลการใช้จ่ายรายเดือน", "Monthly spending results"]], mode: ["ไฟล์", "File"], status: "active", last: "2026-10-05T10:00" },
    { id: "cgd", kind: "ext", name: ["กรมบัญชีกลาง", "Comptroller General's Department"], data: [["การก่อหนี้และเงินกันเหลื่อมปี", "Commitments and carry-over"]], mode: ["ไฟล์", "File"], status: "active", last: "2026-10-01T09:00" },
    { id: "parl", kind: "ext", name: ["คณะกรรมาธิการงบประมาณ รัฐสภา", "Parliament budget committee"], data: [["เอกสารชี้แจงและผลการเบิกจ่าย", "Briefing documents and spending results"]], mode: ["ไฟล์", "File"], status: "pending", last: "",
      ask: { by: "plan", t: "2026-10-15T14:00", due: "2026-10-20", why: ["คณะกรรมาธิการขอผลเบิกจ่ายรายโครงการก่อนการพิจารณาวาระแรก", "The committee asked for spending by project before the first reading"] } },
  ],
};
