# กระบวนการตั้งแต่ต้นจนจบ {#end-to-end}

บทนี้ติดตามเงินหนึ่งบาทตั้งแต่ พ.ร.บ. งบประมาณถึงเดือนที่ปิดแล้ว และแสดงว่าโมดูลใดเป็นเจ้าของแต่ละขั้น และสิ่งใดข้ามระหว่างโมดูล บทนี้ไม่เพิ่มการออกแบบใหม่ interface และเหตุการณ์ทุกรายการมาจากบทโมดูล ส่วนสิ่งที่โมดูลหนึ่งขอและเจ้าของยังไม่ตกลงจะระบุว่าเป็นคำขอ

> [!NOTE] เนื้อหาทั้งหมดเป็นข้อเสนอสำหรับการสร้าง ต้นแบบแสดงเส้นทางเดียวกันในหน้าเว็บเดียว ขั้นตอนสาธิตเพียงเปิดหน้าของแต่ละขั้นและไม่ตรวจผล จึงไม่ใช่หลักฐานว่าวงจรทำงานได้

## ภาพรวมของวงจร {#e2e-glance}

Budget สร้างรายการจัดสรร Procurement กันเงินและก่อภาระผูกพันบนรายการนั้น แล้วส่งงานที่ตรวจรับแล้วให้ Finance ผ่านประตูเบิกจ่าย Finance จ่ายเงิน กระทบยอดกับ GFMIS และปิดงวด ส่วนการกันเงินเหลื่อมปีกลับไปที่ Budget หมายเลขในรูปคือขั้นตอนในหัวข้อถัดไป

{{fig:e2e-map | แผนที่วงจรจากงบประมาณถึงการปิดงวด}}

## เจ้าของแต่ละขั้น {#e2e-steps}

เจ้าของถือระเบียนและกฎของขั้นนั้น โมดูลอื่นไม่เขียนระเบียนนั้น คอลัมน์ผ่านทางแสดงสิ่งที่ข้ามขอบเขตโมดูล

| ขั้น | สิ่งที่เกิดขึ้น | เจ้าของ | ผู้ดำเนินการ | ผ่านทาง | ข้อกำหนด |
| --- | --- | --- | --- | --- | --- |
| 1 | คำขอและการกลั่นกรอง คำขอผ่านหน่วยงาน ฝ่ายแผน ผู้บริหาร และคณะกรรมการ | `budget` | เจ้าหน้าที่หน่วยงาน ฝ่ายแผน ผู้บริหาร คณะกรรมการ | `request.approved` และ `BudgetRequestQuery` สำหรับความต้องการจัดซื้อ | BGT-FR-017 to BGT-FR-036, BGT-FR-072 |
| 2 | พ.ร.บ. และรายการจัดสรร คนบันทึก พ.ร.บ. และ `LinesFromAct.build` สร้างรายการ | `budget` | เจ้าหน้าที่งบประมาณ | `act.in-force`, `lines.created`, `line.confirmed`, `AllocationQuery` | BGT-FR-094 to BGT-FR-098 |
| 3 | แผนการใช้จ่าย การจัดสรรงวดเงิน และการโอนเปลี่ยนแปลง | `budget` | เจ้าหน้าที่งบประมาณ การเงิน ผู้บริหาร | `transfer.effective`, `line.changed` | BGT-FR-105 to BGT-FR-110, BGT-FR-115 to BGT-FR-125 |
| 4 | แผนและใบขอซื้อขอจ้าง การส่งใบขอเป็นการกันเงินบนรายการ | `procurement` | เจ้าหน้าที่พัสดุ หน่วยงาน หัวหน้าพัสดุ | `AllocationQuery`, `LineLedger.room`, `LineLedger.reserve` | PRC-FR-001 to PRC-FR-025 |
| 5 | แฟ้ม วิธีจัดซื้อ และผู้ชนะ ขั้นตอนทางการยังอยู่ใน e-GP และ Fisko บันทึกผล | `procurement` | เจ้าหน้าที่พัสดุ คณะกรรมการ | `EgpStatusSource`, `EgpPackBuilder`, `award.recorded` | PRC-FR-026 to PRC-FR-078 |
| 6 | สัญญา การลงนามก่อภาระผูกพันบนรายการในธุรกรรมเดียว | `procurement` | เจ้าหน้าที่พัสดุ ผู้มีอำนาจลงนาม | `LineLedger.commit`, `contract.signed`, `ContractLookup` | PRC-FR-097 to PRC-FR-103, PRC-IR-007 |
| 7 | การส่งมอบและตรวจรับ กรรมการลงนามจนงวดงานผ่านการตรวจรับ | `procurement` | เจ้าหน้าที่พัสดุ คณะกรรมการตรวจรับ | `phase.delivered`, `phase.accepted`, `DocumentService` | PRC-FR-107 to PRC-FR-116 |
| 8 | ประตูเบิกจ่าย Procurement ตัดสินว่างวดงานไปต่อได้หรือไม่ และ Finance เป็นผู้เรียก | `procurement` | เจ้าหน้าที่การเงินเริ่ม หัวหน้าพัสดุหรือผู้อนุมัติปลดข้อยกเว้น | `AcceptedPhaseQuery`, `PaymentGate`, `FinanceFacts`, `phase.gate-held` | PRC-FR-118, PRC-FR-119, PRC-IR-008, PRC-IR-009, FIN-FR-015 |
| 9 | ใบขอเบิกและการอนุมัติ ใบขอเบิกเก็บผลจากประตูเบิกจ่าย และการอนุมัติบันทึกการจ่ายลงบัญชีคุม | `finance` | เจ้าหน้าที่การเงิน ผู้ตรวจ ผู้อนุมัติตาม `AuthorityTable` | `PhasePayment`, `LineLedger.recordPayment`, `voucher.approved`, `phase.paid` | FIN-FR-017 to FIN-FR-040 |
| 10 | ไฟล์ GFMIS และการจ่าย GFMIS ยังเป็นระบบทางการของการบันทึกและการจ่าย | `finance` | เจ้าหน้าที่การเงิน | `GfmisGateway`, `gfmis-file.created`, `voucher.paid` | FIN-FR-041 to FIN-FR-045, FIN-IR-006, FIN-IR-007 |
| 11 | กระทบยอดธนาคาร รายงาน GFMIS และไฟล์ผลการจ่าย | `finance` | เจ้าหน้าที่การเงิน และบุคคลที่สองผู้ลงนาม | `gfmis-report.imported`, `LineLedger.recordDisbursement` | FIN-FR-105 to FIN-FR-117 |
| 12 | การปิดงวดและการกันเงิน Finance เสนอ และ Budget ตรวจและตัดสิน | `finance` สำหรับการปิดงวด และ `budget` สำหรับการกันเงิน | เจ้าหน้าที่การเงิน หัวหน้าการเงิน ผู้บริหาร | `period.closed`, `CarryOverIntake` (คำขอ), `carry-over.approved` | FIN-FR-120 to FIN-FR-124, FIN-FR-128, FIN-FR-129, BGT-FR-126 to BGT-FR-132 |

## ลำดับการทำงานของวงจร {#e2e-seq}

รูปแรกแสดงตั้งแต่รายการจัดสรรถึงสัญญาที่ลงนามแล้ว รูปที่สองแสดงตั้งแต่การตรวจรับถึงการปิดงวด ทั้งสองรูปละรายละเอียดที่อยู่ในบทโมดูล ได้แก่ [การประกาศผู้ชนะ](#prc-seq-award) [การตรวจรับ](#prc-seq-accept) [ใบขอเบิก](#fin-seq-accept) และ[ไฟล์ GFMIS](#fin-seq-gfmis-s)

{{fig:e2e-seq-cycle | จากรายการจัดสรรถึงการลงนามสัญญา}}

{{fig:e2e-seq-settle | จากการตรวจรับถึงการปิดงวด}}

มีสองจังหวะที่ทำงานข้ามโมดูลในธุรกรรมเดียว เพราะทุกโมดูลอยู่ในแอปพลิเคชันเดียวกัน (ADR-0002) ถ้าการเรียกใดล้มเหลวจะไม่มีการบันทึกใด ๆ

- การลงนาม: `LineLedger.commit` สัญญาเป็น active ใบขอเป็น contracted และแฟ้มถึงขั้น 9
- การอนุมัติ: กฎแยกหน้าที่ อำนาจอนุมัติ `LineLedger.recordPayment`, `PhasePayment.approved` และใบขอเบิกเป็นสถานะพร้อม

สิ่งอื่นทั้งหมดส่งเป็นเหตุการณ์หลัง commit ดังนั้นการล่มของผู้รับหรือระบบภายนอกจะไม่ย้อนการทำงานทางธุรกิจ (ADR-0008)

## เงินบนรายการจัดสรร {#e2e-ledger}

`LineLedger` ใน `budget` เป็นที่เดียวที่เก็บยอดคงเหลือของรายการ (BGT-IR-001) ตารางแสดงว่าใครเปลี่ยนยอดในแต่ละขั้น

| จังหวะ | ผู้เรียก | การเรียก | ผล |
| --- | --- | --- | --- |
| ใบขอเข้าสู่สถานะ pending | `procurement` | `reserve` | ยอดกันเพิ่มขึ้น room ลดลง |
| ใบขอออกจาก pending ไปสถานะสิ้นสุด | `procurement` | `release` | ยอดกันลดลง |
| ลงนามสัญญา | `procurement` | `commit` | ยอดกันแปลงเป็นภาระผูกพัน |
| อนุมัติการแก้ไขสัญญา | `procurement` | `adjustCommitment` | ภาระผูกพันเปลี่ยน |
| ภาระผูกพันนอกการจัดซื้อ | `finance` | `recordCommitment` | ยอดผูกพันเพิ่มขึ้น |
| ส่งใบขอเบิกที่ไม่มีภาระผูกพัน | `finance` | `reserve` (DG-FIN-04) | room ลดลง ถ้ามีภาระผูกพันจะใช้แถว `voucher_hold` และไม่เรียกบัญชีคุม |
| อนุมัติใบขอเบิก | `finance` | `recordPayment` | ยอดจ่ายเพิ่มขึ้น |
| นำเข้ายอดเบิกจ่ายจาก GFMIS | `finance` | `recordDisbursement` | ปรับ `line_disbursement` เพื่อเปรียบเทียบ |
| ขอโอนเปลี่ยนแปลง | `budget` | `hold` ภายใน Budget | เงินที่พักไว้ออกจาก room Procurement จึงกันเงินส่วนนี้ไม่ได้ |

## เหตุการณ์ที่ข้ามโมดูล {#e2e-events}

ผู้รับที่อยู่ในรายการเหตุการณ์ของเจ้าของถือว่าตกลงแล้ว ส่วนผู้รับในคอลัมน์สุดท้ายแจ้งว่าต้องการเหตุการณ์นั้น แต่รายการของเจ้าของยังไม่ได้ระบุ จึงเป็นคำขอ

{{fig:e2e-eventflow | เหตุการณ์ที่ข้ามโมดูล}}

| เหตุการณ์ | ประกาศโดย | ขั้น | ผู้รับในรายการของเจ้าของ | ผู้ขอ |
| --- | --- | --- | --- | --- |
| `request.approved`, `request.rejected`, `request.cancelled` | `budget` | 1 | `projects`, `review`, `procurement` | - |
| `act.in-force` | `budget` | 2 | การแจ้งเตือน, `finance` | - |
| `lines.created`, `line.confirmed`, `line.changed`, `line.cancelled` | `budget` | 2, 3 | `procurement`, `finance`, `projects`, `monitoring` | `review` (DG-REV-02) |
| `transfer.requested`, `transfer.approved`, `transfer.effective`, `transfer.rejected` | `budget` | 3 | `finance`, `monitoring`, `review` | `projects` (DG-PRJ-01) |
| `plan-version.published` | `procurement` | 4 | `review`, การค้นหา | - |
| `case.failed`, `case.cancelled`, `case.closed` | `procurement` | 5 | `reporting`, `projects` | - |
| `contract.signed` | `procurement` | 6 | `finance`, `projects`, `reporting` | `review` (DG-REV-02) |
| `contract.changed`, `contract.terminated` | `procurement` | 6 | `finance`, `reporting` | `projects` (DG-PRJ-01), `review` (DG-REV-02) |
| `phase.delivered` | `procurement` | 7 | `finance`, `reporting` | - |
| `phase.accepted`, `phase.paid` | `procurement` | 7, 9 | `finance`, `reporting` | `projects` (DG-PRJ-01), `review` (DG-REV-02) |
| `phase.gate-held`, `phase.gate-released` | `procurement` | 8 | `finance`, การแจ้งเตือน | - |
| `penalty.waived` | `procurement` | 8 | `finance` | - |
| `commitment.changed` | `finance` | 9 | `projects`, `reporting` | - |
| `voucher.paid` | `finance` | 10 | `projects`, `review`, `budget` | - |
| `gfmis-report.imported` | `finance` | 11 | `projects`, `reporting` | - |
| `period.closed`, `period.reopened` | `finance` | 12 | การแจ้งเตือน, `reporting` | - |
| `carry-over.approved` | `budget` | 12 | `finance`, `monitoring` | `projects` (DG-PRJ-01) |
| `project.registered`, `project.linked`, `project.step-changed` | `projects` | ทุกขั้น | `reporting`, `review` | - |
| `master.fiscal-year-opened`, `master.fiscal-year-status-changed` | `platform` | ทุกขั้น | `budget`, `finance` | - |
| `subject.erased` | `platform` | ทุกขั้น | ทุกโมดูล | - |

`reporting` และ `monitoring` เป็นแพ็กเกจภายในโมดูลเจ้าของ เหตุการณ์ที่ไปถึงเพียงสองแพ็กเกจนี้จึงไม่ข้ามโมดูล ทุกเหตุการณ์ผ่าน outbox ผู้รับตัดรายการซ้ำด้วย `eventId` และ payload มีเพียงการอ้างอิงและจำนวนเงิน ไม่มีข้อมูลส่วนบุคคล (ADR-0008)

## โมดูลที่ติดตามวงจร {#e2e-followers}

`projects` และ `review` อ่านวงจรและไม่แก้ไขระเบียนใดในวงจร ส่วน `platform` ให้บริการทุกขั้น

| โมดูล | อ่าน | การใช้ | บท |
| --- | --- | --- | --- |
| `projects` | `AllocationQuery`, `BudgetReadModel`, `ContractLookup`, `LinePaymentQuery` และเหตุการณ์ข้างต้น | รวมระเบียนภายใต้รหัสโครงการเดียว คำนวณขั้น และแลกเปลี่ยนข้อมูลกับระบบ PM | [ทะเบียนโครงการ](#prj-dynamic) |
| `review` | `AllocationQuery`, `BudgetReadModel`, `PaidFacts`, `ContractLookup`, `ProjectLookup` และแหล่งข้อมูลที่ขอไว้ | เติม projection สำหรับแดชบอร์ดและแจ้งความผิดปกติ ข้อเสนอใด ๆ ต้องผ่านคำสั่งปกติของโมดูลเจ้าของเสมอ | [ทบทวนและวิเคราะห์](#rev-dynamic) |
| `platform` | ถูกเรียกจากทุกขั้น | `Authorizer`, `SodGuard`, `Delegations`, `AuditLog`, `Notifier`, `WorkItems`, `DocumentService` | [แพลตฟอร์ม](#plt-published) |

## เมื่อขั้นตอนล้มเหลว {#e2e-failure}

| ขั้น | ความล้มเหลว | สิ่งที่เกิดขึ้น | เจ้าของ | ที่มา |
| --- | --- | --- | --- | --- |
| 4 | room บนรายการไม่พอ | ปฏิเสธใบขอด้วย `PRC_LINE_ROOM_EXCEEDED` | `procurement` | BR-PRC-04 |
| 5 | แฟ้มล้มเหลวหรือถูกยกเลิก | แฟ้มบันทึกเหตุการณ์ และการออกจาก pending ไปสถานะสิ้นสุดจะคืนวงเงินที่กัน | `procurement` | PRC-FR-030 |
| 6 | บัญชีคุมปฏิเสธขณะลงนาม | ไม่มีการบันทึกใด ๆ | `procurement` | PRC-IR-007 |
| 8 | ไม่ผ่านประตูเบิกจ่าย | บันทึกการพักไว้ใน Procurement หัวหน้าหรือผู้อนุมัติปลดได้โดยระบุเหตุผล แล้ว Finance ลองใหม่ ส่วน `PRC_GATE_PO_MISSING` ปลดไม่ได้ | `procurement` | PRC-FR-119, BR-PRC-15 |
| 9 | ใบขอเบิกถูกปฏิเสธหรือยกเลิก | `PhasePayment.rejected` ปลดงวดงาน และใบขอเบิกใบถัดไปอ่านค่าปรับปัจจุบัน | `finance` | FIN-FR-034, OI-FIN-10 |
| 10 | GFMIS ปฏิเสธรายการ | ระเบียนที่อนุมัติแล้วไม่เปลี่ยน ใบขอเบิกกลับเป็นสถานะพร้อม และเปิดงานให้เจ้าหน้าที่ | `finance` | BR-FIN-01 |
| 10 | การเรียก GFMIS หมดเวลา | ไม่ส่งซ้ำโดยไม่ตรวจ `delivery_id` เป็น idempotency key และผู้ใช้เห็นสถานะการส่ง | `finance` | FIN-IR-007 |
| 6 to 9 | สัญญาถูกบอกเลิก | งวดที่ตรวจรับแล้วแต่ยังไม่จ่ายไม่ผ่านการตรวจหลักประกันและต้องปลด เช่นเดียวกับต้นแบบ (DG-PRC-03) | `procurement` | BR-PRC-20 |
| 12 | การแก้ไขตกในงวดที่ปิดแล้ว | `PeriodGuard` ปฏิเสธ | `finance` | FIN-FR-124 |

## สิ่งที่ยังเป็นคำขอ {#e2e-requests}

วงจรขึ้นอยู่กับรายการด้านล่าง และเจ้าของยังไม่ตกลงทั้งหมด คอลัมน์การออกแบบในตอนนี้คือสิ่งที่บทนี้สมมติ

| รายการ | ผู้ขอ | เจ้าของ | การออกแบบในตอนนี้ | ประเด็น |
| --- | --- | --- | --- | --- |
| `CarryOverIntake` | `finance` | `budget` | Finance เสนอผ่าน interface นี้ ผู้เขียนบท Budget ต้องระบุการเรียกที่อยู่หลัง `CarryOver.file` | DG-BGT-09, DG-FIN-07 |
| `FinanceFacts` ที่แคบลง, `BankChangeIntake` และ `PhasePayment.rejected` | `finance` | `procurement` | ทั้งสองบทแสดงรายการเหล่านี้แล้ว และเจ้าของผลิตภัณฑ์ต้องยอมรับ | DG-FIN-01 |
| จังหวะที่งวดงานเป็น Paid | `finance` | `procurement` | ที่การอนุมัติ เช่นเดียวกับต้นแบบ ส่วน `voucher.paid` แสดงการจ่ายจริง | DG-FIN-03, OI-FIN-08 |
| ผู้เป็นเจ้าของหน้าจอนำเข้า GFMIS | `finance`, `budget` | `finance` | Finance นำเข้าและเขียนผ่าน `recordDisbursement` และ Budget เชื่อมไปยังผล | DG-BGT-05, DG-FIN-02 |
| query ของ Procurement ตามรายการ | `projects` | `procurement` | รายการแผน แฟ้ม สัญญา และงวดของรายการ `ContractLookup` ที่เผยแพร่แล้วไม่ครอบคลุมส่วนนี้ | DG-PRJ-01 |
| เหตุการณ์ในคอลัมน์สุดท้ายข้างต้น | `projects`, `review` | โมดูลที่ประกาศ | รายการเหตุการณ์เพิ่มผู้รับ | DG-PRJ-01, DG-REV-02 |
| `LineFacts`, `KpiSource`, `ForecastSource`, `SignalSource` | `review` | `budget`, `procurement` | Finance เผยแพร่ชุดของตนแล้ว แต่ Budget และ Procurement ยังไม่เผยแพร่ | DG-REV-02 |
| สัญญาการเชื่อมต่อ GFMIS และ e-GP | `finance`, `procurement` | กรมบัญชีกลาง | port พร้อม file adapter และใช้สถานะการส่งชุดเดิม | DG-XC-20, OI-PRC-03, OI-FIN-02 |

> [!OPEN] DG-PRJ-01 ขอการอ้างอิงคำขอบนรายการจัดสรรและการอ้างอิงรายการบนการกันเงิน ตารางของ Budget มี `allocation_line.request_id` และ `carry_over.line_id` อยู่แล้ว ผู้เขียนบท Projects และบท Budget ต้องยืนยันว่าส่วนนี้ของประเด็นปิดแล้ว
