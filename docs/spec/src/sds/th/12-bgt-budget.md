# การออกแบบโมดูลงบประมาณ {#bgt}

> [!NOTE] Fisko ยังไม่มีโค้ดสำหรับใช้งานจริง ต้นแบบเป็น JavaScript บนเบราว์เซอร์และใช้แสดงพฤติกรรมเท่านั้น ทุกสิ่งในบทนี้เป็นข้อเสนอเพื่อสร้าง แพ็กเกจ คลาส ตาราง endpoint เหตุการณ์ และชื่อการทดสอบด้านล่างยังไม่มีอยู่จริง เทคโนโลยีมาจาก ADR ที่อนุมัติแล้วใน `docs/adr/` ซึ่งบทนี้นำมาใช้โดยไม่เปิดประเด็นใหม่

## วัตถุประสงค์ ขอบเขต และการตามรอย {#bgt-purpose}

<!-- covers: BPA 25; BPA 26; BPA 35; BPA 36; BPA 40; BPA 43; BMR 9; BMR 21; BMR 25; BMR 29; BMR 34 -->

บทนี้ออกแบบโมดูลงบประมาณสำหรับใช้งานจริง ทั้งโครงสร้าง ข้อมูล ส่วนเชื่อมต่อ และพฤติกรรม โดยตอบบทงบประมาณของ SRS และใช้โครงสร้างเดียวกับบทจัดซื้อจัดจ้าง

โมดูลนี้ครอบคลุมยุทธศาสตร์ คำขอ การรวบรวม การกลั่นกรอง คณะกรรมการ การส่ง ร่าง พ.ร.บ. รายการจัดสรร แผนการใช้จ่าย บัญชีแยกประเภท การโอน เงินกันเหลื่อมปี การติดตาม ผลสัมฤทธิ์ และ AI งบประมาณ การตัดสินของสำนักงบประมาณ คณะรัฐมนตรี และรัฐสภาอยู่ภายนอก (BGT-CR-001) Fisko จัดเตรียม ส่งออก และบันทึกผล

นอกขอบเขตบทนี้ กลไกกฎแยกหน้าที่ การมอบอำนาจ สายอนุมัติ ปีงบประมาณ และ Audit log เป็นของ `platform` แผนและสัญญาเป็นของ `procurement` ใบสำคัญ การจ่าย และ GFMIS เป็นของ `finance` บทนี้ระบุเฉพาะสิ่งที่งบประมาณต้องใช้จากส่วนเหล่านั้น

ทุกกลุ่มข้อกำหนดของ SRS เชื่อมกับหัวข้อการออกแบบด้านล่าง

| กลุ่มใน SRS | ข้อกำหนด | หัวข้อการออกแบบ | แพ็กเกจหลัก |
| --- | --- | --- | --- |
| กฎทางธุรกิจ | BR-BGT-01 to BR-BGT-39 | แบบจำลองโดเมน | ทั้งหมด |
| งานวันนี้และผังหน้า | BGT-FR-001 to BGT-FR-003 | การออกแบบส่วนเชื่อมต่อ | `web` |
| ยุทธศาสตร์และตัวชี้วัด | BGT-FR-004 to BGT-FR-016 | แบบจำลองโดเมน การออกแบบข้อมูล | `strategy` |
| คำของบประมาณ | BGT-FR-017 to BGT-FR-038 | สถานะและการเปลี่ยนสถานะ แบบจำลองโดเมน | `request` |
| การรวบรวมคำขอ | BGT-FR-039 to BGT-FR-054 | แบบจำลองโดเมน | `consolidation` |
| การกลั่นกรองและอนุมัติ | BGT-FR-055 to BGT-FR-066 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `review` |
| คณะกรรมการและการชี้แจง | BGT-FR-067 to BGT-FR-075 | พฤติกรรมเชิงพลวัต การออกแบบความมั่นคงปลอดภัย | `review` |
| การส่งสำนักงบประมาณ | BGT-FR-076 to BGT-FR-086 | สถานะและการเปลี่ยนสถานะ การออกแบบส่วนเชื่อมต่อ | `submission` |
| รัฐสภา | BGT-FR-087 to BGT-FR-093 | พฤติกรรมเชิงพลวัต | `parliament` |
| วงเงินและรายการจัดสรร | BGT-FR-094 to BGT-FR-104 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `allocation` |
| แผนการใช้จ่ายและงวดเงิน | BGT-FR-105 to BGT-FR-111 | แบบจำลองโดเมน | `plan` |
| ยอดคงเหลือ | BGT-FR-112 to BGT-FR-114 | ภาพรวมการออกแบบ พฤติกรรมเชิงพลวัต | `ledger` |
| การโอนเปลี่ยนแปลง | BGT-FR-115 to BGT-FR-125 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `transfer` |
| เงินกันเหลื่อมปีและเงินเหลือจ่าย | BGT-FR-126 to BGT-FR-132 | แบบจำลองโดเมน | `carryover` |
| การติดตามการใช้จ่าย | BGT-FR-133 to BGT-FR-141 | องค์ประกอบ การออกแบบที่ไม่ใช่ฟังก์ชัน | `monitoring` |
| ผลสัมฤทธิ์ | BGT-FR-142 to BGT-FR-155 | แบบจำลองโดเมน | `performance` |
| การตั้งค่างบประมาณ | BGT-FR-156 to BGT-FR-161 | ภาพรวมการออกแบบ แบบจำลองโดเมน | `settings` |
| การวิเคราะห์และ AI | BGT-FR-162 to BGT-FR-174 | องค์ประกอบ การออกแบบความมั่นคงปลอดภัย | `assistant` |
| ความต้องการด้านข้อมูล | BGT-DR-001 to BGT-DR-010 | การออกแบบข้อมูล | ทั้งหมด |
| กฎสถานะ | ตารางสถานะใน SRS | สถานะและการเปลี่ยนสถานะ | `request`, `submission`, `allocation`, `transfer` |
| ความต้องการด้านการเชื่อมต่อ | BGT-IR-001 to BGT-IR-007 | การออกแบบส่วนเชื่อมต่อ | `api`, `exchange` |
| ความต้องการที่ไม่ใช่ฟังก์ชัน | BGT-NFR-001 to BGT-NFR-007 | การออกแบบที่ไม่ใช่ฟังก์ชัน การออกแบบความมั่นคงปลอดภัย | ทั้งหมด |
| ข้อจำกัด | BGT-CR-001 to BGT-CR-006 | ภาพรวมการออกแบบ | ทั้งหมด |
| หลักฐานการทดสอบ | Sweep walk ใน SRS | การออกแบบการทดสอบ | การทดสอบ |
| ประเด็นที่ยังเปิดอยู่ | OI-BGT-01 to OI-BGT-14 | ช่องว่างที่ทราบและประเด็นที่ยังเปิดอยู่ | ทั้งหมด |

## ภาพรวมการออกแบบและการตัดสินใจ {#bgt-decisions}

โมดูลงบประมาณเป็นโมดูลหนึ่งของ modular monolith (ADR-0002, BGT-CR-005) และพึ่งพาเฉพาะ `platform` คำขอจากเว็บหนึ่งครั้งเรียกหนึ่งคำสั่งในหนึ่งธุรกรรม PostgreSQL ธุรกรรมนั้นบันทึก aggregate แถว outbox และ Audit พร้อมกัน Procurement และ Finance เรียกบัญชีแยกประเภทในธุรกรรมของตน เครื่องสถานะและข้อจำกัดตามกฎหมายเป็นโค้ด Java (ADR-0007) ส่วนสิ่งที่ tenant เลือกเป็นข้อมูล

| การตัดสินใจ | เหตุผล | ทางเลือกที่ไม่ใช้ | ที่มา |
| --- | --- | --- | --- |
| ตารางบัญชีแยกประเภทเดียวเก็บยอดจอง ผูกพัน และการจ่าย พร้อมแถวยอดคงเหลือต่อรายการ | ต้นแบบคำนวณจากข้อมูลของโมดูลอื่นซึ่งขอบเขตโมดูลไม่อนุญาต และ BPA 40 ต้องการการตรวจเข้มงวดจุดเดียว | อ่านตารางของ Procurement และ Finance ทุกครั้ง หรือเก็บยอดผ่านเหตุการณ์อย่างเดียวซึ่งเกิดช่องว่างของเวลา | BGT-FR-113, BGT-IR-001, ADR-0002 |
| การโอนกันยอดในบัญชีตั้งแต่ขอจนจบ | ต้นแบบไม่กันยอดที่สถานะ `bb` เงินจึงถูกใช้ซ้ำได้ (OI-BGT-05) | กันยอดเฉพาะขณะรออนุมัติตามต้นแบบ | BR-BGT-25, BGT-FR-117 |
| คำขอคงสถานะ `approved` หลังเห็นชอบภายใน และค่า `track` แยกต่างหากบอกว่ายื่นแล้ว รับแล้ว อยู่ใน พ.ร.บ. หรือจัดสรรแล้ว | การเห็นชอบภายในเป็นจุดสิ้นสุดของกระบวนการภายใน ข้อเท็จจริงหลังจากนั้นเป็นของชุดส่งและร่าง พ.ร.บ. | เพิ่มสถานะตอนท้ายตามเอกสารออกแบบในเครื่องสถานะเดียว ซึ่งปนเจ้าของสองฝ่าย | DG-BGT-01 |
| วงเงินรายรอบอยู่ใน `review_row` เดียว พร้อมตาราง `amount_change` แบบเพิ่มอย่างเดียว | หลัก P-05 ของเอกสารออกแบบ ทุกการเปลี่ยนวงเงินต้องมีเหตุผล ผู้ทำ เวลา และรอบ | เขียนทับวงเงินและพึ่ง Audit log ซึ่งไม่เก็บข้อความอิสระ | BGT-DR-001, ADR-0015 |
| ข้อจำกัดตามกฎหมายและตารางการโอนอยู่ใน `BudgetRuleSet` ซึ่งเป็นชุดกฎในโค้ดตามวันที่มีผล ส่วนค่าของ tenant อยู่ใน `budget_setting` รายปีงบประมาณ | Tenant ตั้งกระบวนการที่ผิดกฎหมายไม่ได้ และปีที่ปิดแล้วคงกฎเดิม | ทุกค่าเป็นกฎของ tenant ตามต้นแบบ | ADR-0007, BGT-CR-002, BGT-FR-161 |
| การตรวจระดับ block และ warn ทำงานจาก `RequestRulebook` เดียว และผลเดียวกันนี้ใช้กับจุดสถานะของขั้น | รายการกฎเดียวใช้ทั้งหน้าจอ คำสั่งส่ง และ AG-02 | ตรวจแยกกันที่เบราว์เซอร์และเซิร์ฟเวอร์ | BGT-FR-030, BGT-CR-004 |
| ยอดรวมคำนวณเสมอ ไม่พิมพ์เอง และการรวบรวมอ่าน projection ของคำขอปัจจุบัน | หลัก P-01 ของเอกสารออกแบบ ตัวเลขเดียว ที่มาเดียว | คัดลอกยอดทุกขั้น ตามที่ `syncBudget` สร้างใหม่ทุก route | BGT-DR-003, BGT-FR-039 |
| ผลจากภายนอกบันทึกโดยคนผ่านฟอร์ม และ adapter แลกเปลี่ยนข้อมูลอยู่หลัง port โดยเริ่มจาก file adapter | ยังไม่ทราบรูปแบบไฟล์ และตรรกะการตัดสินต้องไม่เปลี่ยนเมื่อมี API | แปลงรูปแบบที่เดาไว้ในตรรกะของชุดส่ง | BGT-IR-003, ADR-0008 |
| งบประมาณไม่มี adapter ของ GFMIS Finance นำเข้า GFMIS และเขียนผลเบิกจ่ายผ่าน `LineLedger` | GFMIS เป็นของ Finance และ `budget` พึ่งพา `finance` ไม่ได้ | นำเข้า GFMIS ซ้ำในงบประมาณตามที่ต้นแบบมีใน B8 | BGT-IR-005, DG-BGT-05 |
| การติดตามอ่าน projection ที่สร้างใหม่ได้ ตามรายการและเดือน | B8 ถูกอ่านบ่อยและพีกช่วงสิ้นปี | คำนวณใหม่ทุกครั้งที่อ่านตาม `liveDash` | BGT-FR-133, ADR-0009 |
| ปีมาจาก `FiscalCalendar` และเวลามาจาก clock เดียวที่ inject | ปีที่ฝังในโค้ดทำให้ต้องแก้ซ้ำในต้นแบบ และวันที่สาธิตต้องไม่มีในระบบจริง | วันที่เลื่อนได้ระดับ tenant | BGT-NFR-005, PLT-IR-004 |

> [!LAW] กฎการโอนแสดงการแบ่งระหว่างข้อจำกัดตามกฎหมายกับสิ่งที่ tenant เลือก `BudgetRuleSet` เก็บตาราง T1 ถึง T6 ตามวันที่มีผลและอ้างข้อกฎหมายทุกแถว ได้แก่ BPA 35 BPA 36 BMR 26 BMR 27 BMR 28 และ BMR 29 ส่วน tenant เลือกผู้อนุมัติภายในของแต่ละประเภทภายในตารางนั้น ชุดกฎแรกใช้เลขข้อของฉบับ 2562 จากเอกสารออกแบบ และผู้เชี่ยวชาญงบประมาณต้องยืนยันกับฉบับแก้ไขที่ 2 พ.ศ. 2567 ก่อนใช้งาน (OI-BGT-02)

```java
// Proposal. The transfer table is code by effective date; the internal approver is tenant data within it.
public record TransferRule(TransferType type, boolean bureauAgreement, boolean cabinet,
                           boolean selfReport, int reportDays, List<String> clauses) {}

public TransferType classify(Line from, Line to) {
    if (!from.agency().equals(to.agency())) return T5;
    if (from.extended()) return T6;
    if (to.newProject() || to.secretFund()) return T4;
    if (!from.programme().equals(to.programme())) return T3;
    if (!from.output().equals(to.output())) return T2;
    return T1;
}
```

## องค์ประกอบ {#bgt-components}

งบประมาณคือโมดูล Spring Modulith ชื่อ `budget` ภายใต้แพ็กเกจหลักที่เลือกตอนเริ่มสร้าง มีเฉพาะ `api` และแพ็กเกจย่อย `api.events` เป็นส่วนเชื่อมต่อที่เปิดเผย แพ็กเกจอื่นเป็นภายในทั้งหมด และการทดสอบขอบเขตทำงานใน CI (ADR-0002)

{{fig:bgt-component | องค์ประกอบของโมดูล budget และโมดูลข้างเคียง}}

> [!NOTE] รายการแพ็กเกจ ชื่อส่วนเชื่อมต่อ และชื่อเมธอดในหัวข้อนี้เป็นข้อเสนอ

### แพ็กเกจภายใน {#bgt-packages}

| แพ็กเกจ | หน้าที่ | คลาสหลัก |
| --- | --- | --- |
| `web` | REST controller, request record, การแปลงเป็น Problem Details และหน้างานวันนี้ | `RequestController`, `TransferController`, `TodayController` |
| `strategy` | ยุทธศาสตร์ เป้าประสงค์ ตัวชี้วัด ความเชื่อมโยง คลังโครงการ การทบทวนค่าเป้าหมาย | `Strategy`, `Kpi`, `ProjectIdea`, `TargetRevision` |
| `request` | คำขอ รายการ แผน ความพร้อม เอกสาร ฉบับ ความเห็น และชุดกฎ | `BudgetRequest`, `RequestRulebook`, `RequiredDocuments`, `ReadinessScore` |
| `consolidation` | กรอบวงเงิน คำตอบ ลำดับความสำคัญ รายการซ้ำ 3R ฐานศูนย์ ประมาณการล่วงหน้า | `CeilingIssue`, `PriorityScore`, `ThreeRPolicy`, `DuplicateMark`, `ForwardEstimate` |
| `review` | การส่งต่อ วงเงินรายรอบ การประชุม การลงความเห็น รายงานการประชุม การชี้แจง ผลกระทบการตัด | `ReviewRow`, `CommitteeRouter`, `Meeting`, `Hearing`, `CutImpact` |
| `submission` | ความเห็นชอบของรัฐมนตรี ชุดส่ง ผล คำขอแก้ไข ชุดเอกสาร | `SubmissionBatch`, `MinisterApproval`, `RevisionRequest`, `PackBuilder` |
| `parliament` | ขั้นตอน ร่าง พ.ร.บ. การตัดลด การแปรญัตติ | `BudgetBill`, `BillCut`, `BillAppeal` |
| `allocation` | วงเงินตาม พ.ร.บ. รายการจัดสรร การสร้างรายการจาก พ.ร.บ. | `Appropriation`, `AllocationLine`, `LinesFromAct` |
| `plan` | แผนการใช้จ่าย ฉบับแผน งวดเงิน เงินจัดสรรส่วนภูมิภาค | `SpendingPlan`, `Release`, `RegionalAllotment` |
| `ledger` | รายการบัญชี ยอดคงเหลือ การล็อก และ `LineLedger` | `LedgerService`, `LedgerEntry`, `LineBalance` |
| `transfer` | การโอน การจำแนก เส้นทางอนุมัติ การรายงาน | `Transfer`, `TransferClassifier`, `TransferRoute` |
| `carryover` | คำขอกันเงิน เงินกัน การขยายเวลา เงินเหลือจ่าย | `CarryOver`, `CarriedFund`, `Saving` |
| `monitoring` | projection สด เป้าหมาย รายงานความก้าวหน้า การแจ้งเตือน | `LineMonth`, `ProgressReport`, `SpendAlert` |
| `performance` | ผลตัวชี้วัด ผลผลิต รายงานรายไตรมาส ต้นทุนต่อผลผลิต การประเมิน ข้อเสนอแนะ สรุปสาธารณะ | `Output`, `QuarterReport`, `Evaluation`, `Recommendation` |
| `settings` | ชุดกฎ ค่าของ tenant สวิตช์กฎ โครงสร้างงบประมาณ คณะกรรมการ แผนแม่บท | `BudgetRuleSet`, `BudgetSetting`, `StructureNode`, `CommitteeRoster` |
| `assistant` | เครื่องมือ AI เอเจนต์ พยากรณ์ What-if KPI สัญญาณ ความผิดปกติ | `ToolRegister`, `AgentRunner`, `YearForecast`, `SignalDetector` |
| `exchange` | Port และ file adapter ของ e-Budgeting BBL และ BB EvMIS | `BudgetBureauExchange`, `EvmisExport` |

### ส่วนเชื่อมต่อที่เปิดเผย {#bgt-published}

ตารางนี้ตอบคำขอในบทจัดซื้อจัดจ้าง (DG-PRC-08) และบทโมดูล `LineLedger` และ `BudgetRequestQuery` ได้รับการยืนยันตามเมธอดที่ Procurement ขอ พร้อมส่วนเพิ่มด้านล่าง

| ส่วนเชื่อมต่อ | ผู้ใช้ | วัตถุประสงค์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `LineLedger` | `procurement`, `finance` | อ่านรายการ `room` `reserve` `release` `commit` `adjustCommitment` และสำหรับ Finance `recordCommitment` `recordPayment` `recordDisbursement` | BGT-IR-001, BR-PRC-04, BR-BGT-30 |
| `BudgetRequestQuery` | `procurement` | รายการคำขอที่ผ่านการพิจารณาสำหรับความต้องการและแผนปีถัดไป | BGT-IR-002, PRC-FR-009, PRC-FR-010 |
| `AllocationQuery` | `procurement`, `finance`, `projects`, `review` | รายการจัดสรรของปีพร้อมวงเงินและโครงสร้าง ไม่มีข้อมูลส่วนบุคคล | BGT-IR-001, PRC-IR-006 |
| `BudgetReadModel` | `projects`, `review` | ยุทธศาสตร์ คำขอ ผลตัวชี้วัด การใช้จ่ายต่อรายการ | BGT-IR-006 |
| เหตุการณ์ใน `api.events` | ทุกโมดูล และ RabbitMQ ผ่าน outbox | รายการเหตุการณ์ในหัวข้อส่วนเชื่อมต่อ | ADR-0008 |

### การพึ่งพาโมดูลอื่น {#bgt-dependencies}

| โมดูล | ส่วนเชื่อมต่อที่ต้องใช้ | ใช้สำหรับ | ข้อกำหนด |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `SodGuard` | การผูก tenant สิทธิ์ การทำแทน SD-09 และ SD-10 | ADR-0006, BGT-FR-124 |
| `platform` | `AuditLog`, `Notifier`, `WorkingCalendar`, `FiscalCalendar` | Audit งาน การนับวัน ปีและสถานะการเปิด | BGT-NFR-001, BGT-NFR-003, BR-BGT-36 |
| `platform` | `ApprovalRoutes`, `StandardPrices` | ขั้น `w3` ของสายอนุมัติและการตรวจราคา | BR-BGT-14, BR-BGT-05 |
| `platform` | `DocumentService`, `FileStore`, `AiGateway`, `SearchIndexer` | ชุดเอกสารและรายงานการประชุม ไฟล์พร้อมการสแกน การเรียก AI การค้นหา | BGT-DR-007, ADR-0010, ADR-0016 |
| `procurement`, `finance` | ไม่มีตอนคอมไพล์ | สองโมดูลนี้พึ่งพา `budget.api` ข้อเท็จจริงเข้ามาผ่านการเรียกบัญชีและเหตุการณ์ | BGT-CR-005 |

ข้อนี้ยืนยันทิศทางที่บทโมดูลเสนอ `budget` พึ่งพาเฉพาะ `platform` และ `procurement` กับ `finance` พึ่งพา `budget`

## แบบจำลองโดเมน {#bgt-domain}

<!-- covers: BPA 26; BPA 35; BPA 36; BPA 40; BPA 43; BMR 9; BMR 15; BMR 16; BMR 25 -->

คลาสโดเมนเป็น Java ธรรมดา ไม่นำเข้า Spring หรือ JPA แต่ละคำสั่งโหลดหนึ่ง aggregate เรียกเมธอดที่ตรวจกฎ แล้วบันทึก ชื่อตามฟิลด์ของต้นแบบเมื่อฟิลด์นั้นยังใช้ต่อ

{{fig:bgt-class | aggregate ของงบประมาณและส่วนประกอบ}}

> [!NOTE] aggregate ชื่อคลาส และรหัสข้อผิดพลาดในหัวข้อนี้เป็นข้อเสนอ

### Aggregate และเงื่อนไขคงที่ {#bgt-aggregates}

| Aggregate | ส่วนประกอบ | เงื่อนไขคงที่ที่รักษา |
| --- | --- | --- |
| `Strategy` | เป้าประสงค์ ตัวชี้วัด ความเชื่อมโยง | ลบได้เมื่อว่าง นอกนั้นเลิกใช้ และยังคงชื่อในที่ใช้อยู่ |
| `ProjectIdea`, `TargetRevision` | คะแนน การตัดสิน | หน่วยงานเจ้าของแก้ได้เฉพาะขณะเสนอ และการทบทวนที่อนุมัติเปลี่ยนค่าเป้าหมายครั้งเดียว |
| `BudgetRequest` | รายการ แผนรายไตรมาส ความพร้อม ความเสี่ยง เอกสาร ฉบับ ความเห็น | แก้ได้เฉพาะร่างหรือส่งคืน เลขไม่ใช้ซ้ำ คำขอที่ส่งแล้วไม่ถูกลบ และแผนรายไตรมาสรวมเท่ายอดก่อนส่ง |
| `CeilingIssue` | เพดานรายหน่วย คำตอบ | แก้ได้จนกว่าจะออก ฉบับใหม่ล้างคำตอบ ถอนได้เมื่อไม่มีคำตอบ |
| `ReviewRow` | การเปลี่ยนวงเงิน | หนึ่งแถวต่อคำขอที่กลั่นกรอง ทุกการแก้เพิ่มแถวพร้อมเหตุผล |
| `Meeting` | ผู้เข้าประชุม การลงความเห็น มติ รายงาน | ตั้งได้ทีละครั้ง จัดได้เมื่อครบองค์ประชุม และรายงานที่รับรองแล้วไม่เปลี่ยน |
| `SubmissionBatch` | คำขอ ผล คำขอแก้ไข | เตรียมได้ทีละชุด คำขออยู่ในชุดที่มีผลชุดเดียว ผลไม่เกินยอดที่ส่ง และปิดได้เมื่อไม่มีคำขอแก้ไขค้าง |
| `BudgetBill` | ขั้นตอน รายการ การตัดลด การแปรญัตติ | หนึ่งร่างต่อปีงบประมาณ รายการตรึงที่ขั้นกรรมาธิการ การตัดไม่เกินรายการ การแปรญัตติไม่เกินยอดตัด และยอดคืนไม่เกินยอดที่ขอ |
| `Appropriation`, `AllocationLine` | รายการ แผน | รายการที่มีผลอยู่ภายในงบรายจ่าย วงเงินไม่ต่ำกว่าขั้นต่ำ และรายการในปีที่ปิดไม่เปลี่ยน |
| `SpendingPlan` | ยอดรายเดือน ฉบับ | รายเดือนรวมเท่าวงเงิน แต่ละฉบับเปลี่ยนไม่ได้และระบุเหตุผล |
| `LineBalance` | รายการบัญชี | ยอดจอง ผูกพัน และกันไว้ไม่เกินวงเงิน และรายการบัญชีเพิ่มได้อย่างเดียว |
| `Transfer` | บันทึกการตัดสิน | กันยอดจนจบ ประเภทคำนวณจากรายการทุกครั้งที่แก้ และผู้จัดทำไม่อนุมัติ |
| `CarryOver`, `CarriedFund` | การจ่าย การขยายเวลา | เป็นไปตาม BR-BGT-32 ขยายได้ครั้งเดียว และยอดจ่ายไม่เกินวงเงิน |
| `QuarterReport` | รายการ หลักฐาน | หนึ่งรายงานต่อรอบและหน่วยงาน ส่งได้เมื่อมีผลครบ และรายงานที่รับแล้วไม่เปลี่ยน |

### Value object และ enum {#bgt-values}

| ชนิด | ค่า | หมายเหตุ |
| --- | --- | --- |
| `Money` | `BigDecimal` หน่วยบาท | บาทเต็มตาม BGT-DR-006 ดู DG-BGT-02 |
| `BudgetType` | `per`, `ope`, `inv`, `sub`, `oth` | อยู่ที่ `platform` ตาม PLT-FR-102 |
| `RequestStatus` | `draft`, `unit`, `plan`, `committee`, `exec`, `approved`, `returned`, `rejected`, `cancelled` | ตารางสถานะใน SRS |
| `RequestTrack` | `none`, `filed`, `received`, `in_act`, `allocated` | ตั้งจากเหตุการณ์ของชุดส่ง ร่าง และรายการ ดู DG-BGT-01 |
| `TransferType` | `T1`, `T2`, `T3`, `T4`, `T5`, `T6` | T5 เป็นของใหม่ ปฏิเสธเว้นแต่อ้าง พ.ร.บ. |
| `TransferReason` | `fix`, `eff`, `qual`, `staff`, `tech` | BMR 25 |
| `PlanChangeReason` | `target`, `transfer`, `policy` | BMR 15 |
| `LedgerKind` | `reserve`, `release`, `commit`, `uncommit`, `hold`, `unhold`, `payment`, `disbursement` | `hold` คือการกันยอดของการโอน |
| `VoteChoice` | `approve`, `reduce`, `defer`, `reject` | การลงความเห็นและมติ |

### ตำแหน่งที่บังคับใช้กฎทางธุรกิจ {#bgt-rule-map}

เซิร์ฟเวอร์บังคับทุกกฎด้านล่าง หน้าจออาจตรวจซ้ำเพื่อช่วยผู้ใช้แต่ไม่เป็นตัวควบคุม (ADR-0006, BGT-CR-004) กฎที่มีสวิตช์อ่าน `budget_setting` และข้อจำกัดตามกฎหมายอ่าน `BudgetRuleSet`

| กฎ | เรื่อง | บังคับใช้ที่ | รหัสข้อผิดพลาด |
| --- | --- | --- | --- |
| BR-BGT-01 to BR-BGT-13 | การตรวจคำขอ | `RequestRulebook.run`, `BudgetRequest.send` | `BGT_CHECK_FAILED` |
| BR-BGT-14 | เส้นทางคณะกรรมการ | `CommitteeRouter.next` | ไม่มี กำหนดเส้นทาง |
| BR-BGT-15, BR-BGT-16 | องค์ประชุมและการงดออกเสียง | `Meeting.resolve`, `Meeting.vote`, `SodGuard` | `BGT_NO_QUORUM`, `BGT_SOD_BLOCKED` |
| BR-BGT-17 | ผลกระทบการตัด | `CutImpact.of` | ไม่มี คำนวณ |
| BR-BGT-18, BR-BGT-19 | ลำดับความสำคัญและความพร้อม | `PriorityScore`, `ReadinessScore` | ไม่มี คำนวณ |
| BR-BGT-20 to BR-BGT-22 | 3R และการยกยอด | `ThreeRPolicy.assess` | ไม่มี เป็นคำแนะนำ |
| BR-BGT-23 | รัฐมนตรีก่อนส่ง | `SubmissionBatch.send` | `BGT_MINISTER_REQUIRED` |
| BR-BGT-24 | ยอดในร่าง | `BudgetBill.start`, `BudgetBill.finalAmount` | `BGT_STATE_CONFLICT` |
| BR-BGT-25, BR-BGT-30 | ยอดใช้ได้ | `LedgerService`, row lock on `line_balance` | `BGT_LINE_ROOM_EXCEEDED` |
| BR-BGT-26 to BR-BGT-28 | ประเภท เส้นทาง และเหตุผลการโอน | `TransferClassifier`, `TransferRoute`, `Transfer.request` | `BGT_TRANSFER_NOT_ALLOWED` |
| BR-BGT-29 | กำหนดส่งแผนและเหตุผล | `SpendingPlan.send`, `SpendingPlan.newVersion` | ไม่มี เตือน |
| BR-BGT-31 | เงินจัดสรรส่วนภูมิภาค | `RegionalAllotment`, task sweep | ไม่มี เพิ่มงาน |
| BR-BGT-32 | เงินกันเหลื่อมปี | `CarryOver.file`, `CarriedFund.extend` | `BGT_CARRYOVER_INVALID` |
| BR-BGT-33 | กำหนดส่งรายงาน | `ReportRound.open` | ไม่มี ทำเครื่องหมาย |
| BR-BGT-34 | ลบ ถอน ยกเลิก | แต่ละ aggregate | `BGT_REASON_REQUIRED`, `BGT_STATE_CONFLICT` |
| BR-BGT-35 | รายการที่ถูกใช้ | `AllocationLine.cancel`, `LedgerService.floor` | `BGT_LINE_IN_USE` |
| BR-BGT-36 | ปีที่ปิด | `FiscalCalendar.isOpen`, in each allocation command | `PLT_YEAR_CLOSED` |
| BR-BGT-37 | เลขไม่ใช้ซ้ำ | `NumberSeries.next` ตัวนับล็อกแถวที่การลบไม่ย้อนกลับ | ไม่มี |
| BR-BGT-38 | การเลิกใช้ข้อมูลหลัก | `Strategy`, `Kpi`, `Output`, `StructureNode` | `BGT_IN_USE` |
| BR-BGT-39 | ข้อจำกัด AI | `ToolRegister` ซึ่งไม่มีเครื่องมืออนุมัติ ลงมติ หรือส่งออก | `BGT_AI_NOT_ALLOWED` |

### ข้อจำกัดในโค้ดและค่าตั้งของ tenant {#bgt-limits}

แต่ละค่าตั้งมีช่วงใน `SettingRange` และมีค่าใน `budget_setting` ตามปีงบประมาณ ค่าเหล่านี้มาจากกฎทางธุรกิจของ SRS `BudgetRuleSet` มีรุ่นตามวันที่มีผล และคำขอกับการโอนเก็บรุ่นที่ใช้ (BGT-FR-161, ADR-0007) ช่วงที่ระบุว่าเป็นข้อเสนอให้ผู้เชี่ยวชาญงบประมาณยืนยัน (OI-BGT-03)

| ค่าตั้ง | ที่เก็บและช่วง | ค่าเริ่มต้น | กฎ |
| --- | --- | --- | --- |
| `BR-09` | ชุดกฎ อ้างวงเงินกับ BPA 26 | 1,000 ล้านบาท | BR-BGT-09 |
| `BR-10`, `corruptionRiskMin` | ชุดกฎ ข้อเสนอ | 200 และ 500 ล้านบาท | BR-BGT-10 |
| `planDaysBefore`, `regionalDays`, `reportDays`, `quarterReportDays`, `annualReportDays` | ชุดกฎ อ้าง BMR 9 BMR 21 BMR 29 BMR 34 | 15, 15, 15, 15, 45 | BR-BGT-27, BR-BGT-29, BR-BGT-31, BR-BGT-33 |
| `carryMonths`, `extendMonths` | ชุดกฎ อ้าง BPA 43 | 6, 6 | BR-BGT-32 |
| `BR-02` | Tenant 0 ขึ้นไป ข้อเสนอ | 40 | BR-BGT-02 |
| `BR-04`, `BR-11` | Tenant ร้อยละ 0 ถึง 100 ข้อเสนอ | 20, 20 | BR-BGT-04, BR-BGT-11 |
| `BR-08`, `BR-12`, `BR-13` | Tenant ข้อเสนอ: 1 ปีขึ้นไป 1 ปีขึ้นไป 1 ถึง 5 | 5, 2, 3 | BR-BGT-08, BR-BGT-12, BR-BGT-13 |
| `w3Amount`, `quorum` | Tenant: 0 บาทขึ้นไปในสายอนุมัติ ร้อยละ 1 ถึง 100 ข้อเสนอ | 10,000,000 และ 50 | BR-BGT-14, BR-BGT-15 |
| น้ำหนักเกณฑ์ | Tenant แต่ละค่า 0 ถึง 100 ข้อเสนอ: รวม 100 | 25, 20, 20, 20, 15 | BR-BGT-18 |
| `r3.*`, `sig.*`, `fc.*`, `targets.*` | Tenant 0 ถึง 100 ตามหน้าจอ | ตาม SRS | BR-BGT-20, BR-BGT-22, BGT-FR-160 |

## สถานะและการเปลี่ยนสถานะ {#bgt-states}

ชื่อสถานะตาม SRS แต่ละการเปลี่ยนคือเมธอดบน aggregate เมธอดตรวจสถานะปัจจุบันกับตารางการเปลี่ยน ตรวจเงื่อนไข และบันทึกเหตุการณ์

### คำของบประมาณ {#bgt-state-request}

{{fig:bgt-state-request | สถานะของคำของบประมาณ}}

| จาก | ไป | คำสั่ง | เงื่อนไข | เหตุการณ์ |
| --- | --- | --- | --- | --- |
| draft, returned | unit | `BudgetRequest.send` | เจ้าของ ไม่มีข้อ block ที่ไม่ผ่าน | `request.sent` |
| unit | plan | `directorApprove` | ผู้อำนวยการกองของหน่วยงานเดียวกัน บันทึกฉบับ | `request.director-approved` |
| plan | committee, exec | `forward` | กองแผน ตาม BR-BGT-14 | `request.forwarded` |
| committee | approved | `Meeting.resolve` | ครบองค์ประชุม มติเห็นชอบหรือตัดลด เก็บวงเงินที่ตัดสิน | `request.approved` |
| exec | approved | `approve` | ผู้บริหาร วงเงินที่ตัดสินจากรอบที่ 3 | `request.approved` |
| unit, plan, committee, exec | returned | `returnForRevision` | มีความเห็นค้าง หรือมติเลื่อน | `request.returned` |
| committee | rejected | `Meeting.resolve` | มติไม่เห็นชอบ | `request.rejected` |
| unit, plan, committee, exec | draft | `withdraw` | เจ้าของ มีเหตุผล ปิดแถวการกลั่นกรอง | `request.withdrawn` |
| draft, returned | cancelled | `cancel` | เจ้าของ เคยส่งแล้ว มีเหตุผล | `request.cancelled` |
| draft | (ลบ) | `deleteDraft` | เจ้าของ ไม่เคยส่ง คงเลขไว้ | ไม่มี |

> [!NOTE] ผู้บริหารอาจต้องไม่เห็นชอบคำขอด้วย ต้นแบบไม่มีปุ่มไม่เห็นชอบที่ `exec` และตาราง SRS ยึดตามต้นแบบ DG-BGT-03 ถามว่าต้องมีเส้นทางนี้หรือไม่

### ชุดส่ง {#bgt-state-batch}

{{fig:bgt-state-batch | สถานะของชุดส่ง}}

| จาก | ไป | คำสั่ง | เงื่อนไข | เหตุการณ์ |
| --- | --- | --- | --- | --- |
| (ไม่มี) | prep | `SubmissionBatch.prepare` | ไม่มีชุดที่กำลังเตรียม คำขอผ่านการตรวจ | ไม่มี |
| prep | sent | `send` | บันทึกความเห็นชอบของรัฐมนตรีแล้ว (BPA 25) | `batch.sent` |
| prep | cancelled | `cancel` | มีเหตุผล คำขอกลับไปรอ | ไม่มี |
| sent | reviewing | `recordReceipt` | กองแผน | ไม่มี |
| reviewing | result | `saveResults` | ผลแต่ละรายการไม่เกินยอดที่ส่ง | `batch.result-recorded` |
| result | closed | `close` | ไม่มีคำขอแก้ไขค้าง | `batch.closed` |

### รายการจัดสรร {#bgt-state-line}

{{fig:bgt-state-line | สถานะของรายการจัดสรร}}

| จาก | ไป | คำสั่ง | เงื่อนไข | เหตุการณ์ |
| --- | --- | --- | --- | --- |
| (ไม่มี) | draft | `AllocationLine.draft`, `LinesFromAct.build` | ปีเปิดอยู่ ตามกฎวงเงิน | ไม่มี |
| draft | active | `confirm` | งบรายจ่ายมีวงเงินเหลือ | `line.confirmed` |
| draft | (ลบ) | `deleteDraft` | คงเลขไว้ | ไม่มี |
| active | active | `changeAmount` | มีเหตุผล อยู่ระหว่างขั้นต่ำกับวงเงินเหลือ ปรับแผนตามสัดส่วน | `line.changed` |
| active | cancelled | `cancel` | มีเหตุผล ขั้นต่ำเป็นศูนย์ วงเงินเป็น 0 เก็บข้อมูลไว้ | `line.cancelled` |

### การโอนเปลี่ยนแปลง {#bgt-state-transfer}

{{fig:bgt-state-transfer | สถานะของการโอนเปลี่ยนแปลง}}

| จาก | ไป | คำสั่ง | เงื่อนไข | เหตุการณ์ |
| --- | --- | --- | --- | --- |
| (ไม่มี) | pending | `Transfer.request` | คนละรายการ ไม่เกินยอดใช้ได้ เหตุผลตาม BMR 25 เขียน `hold` | `transfer.requested` |
| pending | approved | `approve`, T1 | ผู้อนุมัติของประเภท SD-09 ย้ายวงเงิน ตั้งวันรายงาน | `transfer.effective` |
| pending | bb | `approve`, T2, T3, T6 | ผู้อนุมัติของประเภท SD-09 `hold` คงอยู่ | `transfer.approved` |
| bb | approved | `recordAgreement` | ย้ายวงเงิน เขียน `unhold` | `transfer.effective` |
| pending, bb | rejected | `reject`, `recordRefusal` | มีเหตุผล เขียน `unhold` | `transfer.rejected` |
| pending | withdrawn | `withdraw` | มีเหตุผล เขียน `unhold` | ไม่มี |

T4 ไม่มีเมธอดอนุมัติ และ T5 ถูกปฏิเสธที่ `request` เว้นแต่คำขออ้าง พ.ร.บ. T4 ที่รออยู่แสดงเป็น blocked ตาม SRS การโอนย้ายวงเงินภายใน `LedgerService` เท่านั้น ซึ่งล็อกแถวยอดสองแถวตามลำดับรหัสรายการ การโอนสวนทางกันจึงไม่เกิด deadlock

| ข้อมูล | สถานะ | บังคับใช้ที่ | หมายเหตุ |
| --- | --- | --- | --- |
| ความคิดโครงการ การทบทวนค่าเป้าหมาย | ตาม SRS | `ProjectIdea`, `TargetRevision` | ตารางทั่วไป |
| การประชุม การชี้แจง | scheduled, held, cancelled | `Meeting`, `Hearing` | รายงานที่รับรองแล้วล็อก |
| งวดเงิน คำขอกันเงิน | pending, approved, rejected, withdrawn | `Release`, `CarryOver` | คำขอกันเงินที่อนุมัติสร้าง `CarriedFund` และรายการปีถัดไป |
| เงินกัน | open, extension, extended, closed | `CarriedFund` | วันครบกำหนดจาก `carryMonths` |
| รายงานรายไตรมาส | draft, submitted, accepted, returned | `QuarterReport` | การรับรองหลักฐานเป็นข้อเท็จจริงแยก |

## พฤติกรรมเชิงพลวัต {#bgt-dynamic}

<!-- covers: BPA 25; BPA 36; BMR 26; BMR 29 -->

### วงจรจากยุทธศาสตร์ถึงผลสัมฤทธิ์ {#bgt-activity}

แผนภาพแสดงเส้นทางปกติของงบประมาณหนึ่งปี ในเวลาใดก็ตามจะมีงานสามปีซ้อนกัน ทุกข้อมูลจึงมีปีงบประมาณ และไม่มีหน้าจอใดสมมติปีตายตัว

{{fig:bgt-activity-cycle | วงจรงบประมาณจากยุทธศาสตร์ถึงผลสัมฤทธิ์}}

### จากการส่งคำขอถึงมติ {#bgt-seq-review}

แต่ละขั้นเป็นคำสั่งแยกกัน และคำขอออกจากเส้นทางได้ทุกขั้นด้วยการส่งคืน การถอน หรือการไม่เห็นชอบ

{{fig:bgt-seq-review | จากการส่งคำขอถึงมติคณะกรรมการ}}

- `BudgetRequest.send` เรียก `RequestRulebook` และปฏิเสธพร้อมข้อ block แรกที่ไม่ผ่าน (BGT-FR-030) คำเตือนคงอยู่ในคำขอ
- แถวการกลั่นกรองเปิดเมื่อผู้อำนวยการกองเห็นชอบ กองแผนแก้รอบที่ 2 และผู้บริหารแก้รอบที่ 3 โดยแต่ละครั้งมีแถว `amount_change` (BGT-FR-059)
- การลงความเห็นบันทึกรายกรรมการ `Meeting.vote` ปฏิเสธกรรมการจากหน่วยงานผู้ขอผ่าน `SodGuard` ด้วย SD-10 และบันทึกไว้ ซึ่งต้นแบบยังไม่ทำ (OI-BGT-06)
- `Meeting.resolve` ทำงานในธุรกรรมเดียวทั้งวาระ ถ้าวาระหนึ่งล้มเหลวจะไม่บันทึกทั้งหมด การตัดลดเก็บ `cut_impact` และปรับแผนรายไตรมาสตามสัดส่วน (BR-BGT-17)
- รายงานการประชุมสร้างหลัง commit จากเหตุการณ์ outbox ผ่าน `DocumentService` และการรับรองล็อกข้อความ (BGT-FR-074)

### จากผลพิจารณาถึงรายการจัดสรร {#bgt-seq-act}

เจ้าหน้าที่บันทึกการตัดสินจากภายนอกทุกครั้ง ลำดับของวงเงินคือ วงเงินที่ตัดสิน ผลของชุดส่ง ยอดในร่าง ยอดสุดท้าย และวงเงินของรายการจัดสรร แต่ละขั้นอ่านเฉพาะขั้นก่อนหน้า (BR-BGT-24)

{{fig:bgt-seq-act-lines | จากผลพิจารณาของสำนักงบประมาณถึงรายการจัดสรร}}

- ร่าง พ.ร.บ. เริ่มหลังปิดชุดส่ง (BGT-FR-087) และรายการตรึงเมื่อเริ่มขั้นกรรมาธิการ
- `LinesFromAct.build` สร้างวงเงินตาม พ.ร.บ. รายการร่างหนึ่งรายการต่อคำขอภายใต้งบรายจ่ายที่มากที่สุด และแผนรายเดือนจากแผนรายไตรมาส (BGT-FR-095, BGT-FR-096) คำขอบุคลากรที่ไม่อยู่ในร่างใช้ผลของชุดส่ง
- คำขอที่มีหลายงบรายจ่ายกลายเป็นรายการเดียวในต้นแบบ ทำให้เสียการแยกงบรายจ่าย DG-BGT-04 เสนอให้แยกหนึ่งรายการต่อหนึ่งงบรายจ่าย
- คำสั่งนี้ทำซ้ำได้อย่างปลอดภัย รายการใช้คำขอและปีงบประมาณเป็นคีย์ และการปรับปรุงทำให้ร่างตรงยอดตาม พ.ร.บ. (BGT-FR-097)

### การโอนและบัญชีแยกประเภท {#bgt-seq-transfer}

{{fig:bgt-seq-transfer | การโอนเปลี่ยนแปลงกับบัญชีแยกประเภท}}

- การกันยอดนับใน `room` ตั้งแต่ขอโอน จึงแก้ OI-BGT-05 และ Procurement จองเงินที่กันไว้ไม่ได้
- `SodGuard` ตรวจ SD-09 กับผู้อนุมัติและผู้ที่มอบอำนาจให้ (BGT-FR-124) ร่างของเอเจนต์ระบุผู้อนุมัติขั้นนั้นเป็นผู้จัดทำ
- เมื่อมีผล วงเงินและแผนการใช้จ่ายทั้งสองรายการเปลี่ยนในธุรกรรมเดียว และเหตุการณ์แจ้ง Finance และ projection การติดตาม
- ถ้าสองรายการคนละงบรายจ่าย ยอดตามงบรายจ่ายของ พ.ร.บ. จะเปลี่ยนด้วย ผู้เชี่ยวชาญงบประมาณต้องยืนยันว่าทำได้เมื่อใด (DG-BGT-06)

### งานตามเวลา {#bgt-jobs}

งานทำงานต่อ cell ทีละ tenant โดยผูก tenant เหมือนคำขอจากเว็บ แต่ละงานรันซ้ำได้อย่างปลอดภัย และมี lock ให้ทำงานทีละ instance

| งาน | สิ่งที่ทำ | ข้อกำหนด |
| --- | --- | --- |
| ตรวจกำหนดเวลา | งานสำหรับการส่งแผน เงินจัดสรรส่วนภูมิภาค การรายงาน T1 เงินกัน และรอบรายงาน | BR-BGT-29, BR-BGT-31, BGT-FR-123, BGT-FR-128 |
| รอบรายงาน | เปิดรอบรายงานแต่ละไตรมาสจาก `FiscalCalendar` | BGT-FR-145 |
| ตรวจสัญญาณ | ตรวจ BF-01 ถึง BF-06 และปรับความผิดปกติ | BGT-FR-170, BGT-FR-171 |
| Projection การติดตาม | สร้าง `line_month` ใหม่หลังเหตุการณ์ และเมื่อสั่ง | BGT-FR-133 |
| การเก็บรักษา | ใช้ตารางของ ADR-0014 กับข้อมูลที่จบแล้ว | BGT-DR-010 |

## การออกแบบข้อมูล {#bgt-data}

<!-- covers: PDPA 39 -->

ตารางอยู่ใน schema `budget` ของ PostgreSQL cluster ของ cell (ADR-0005) โมดูลอื่นไม่อ่านตารางเหล่านี้โดยตรงแต่ใช้ `budget.api` กฎร่วมเป็นไปตามบทจัดซื้อจัดจ้าง ได้แก่ `tenant_id` อยู่แรกในทุกคีย์ row-level security แบบบังคับ คอลัมน์ `*_ref` สำหรับบุคคล เงินเป็น `numeric` และไม่ลบถาวรข้อมูลที่มีสถานะ

> [!NOTE] ทุกตาราง คอลัมน์ ชนิดข้อมูล และดัชนีในหัวข้อนี้เป็นข้อเสนอ ตารางเป็นการออกแบบเชิงตรรกะ และบทพจนานุกรมข้อมูลจะเก็บคอลัมน์สุดท้าย

{{fig:bgt-er | ตารางหลักของงบประมาณ รายการทั้งหมดอยู่ถัดไป}}

### ตาราง {#bgt-data-tables}

ชั้นข้อมูลคือชั้นตาม ADR-0013 ของทั้งแถว คีย์การเก็บรักษาคือรายการในตารางของ ADR-0014 ไม่ระบุระยะเวลาเพราะ OI-BGT-10 ยังเปิดอยู่

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | คีย์การเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `strategy`, `goal`, `kpi`, `kpi_target`, `kpi_activity` | `fy`, `name`, `nat`, `mp`, `min_share`, `retired_at`; `unit`, `owner_unit_id`, `base`, `formula`; `year`, `target` | ภายใน | `bgt.plan` | BGT-FR-004 to BGT-FR-009 |
| `project_idea`, `target_revision` | `no`, `unit_id`, `kpi_id`, `name`, `estimate`, `years`, `status`, `scores`; `year`, `from_value`, `to_value`, `why`, `status` | ภายใน | `bgt.plan` | BGT-FR-010 to BGT-FR-014 |
| `budget_request` | `fy`, `no`, `unit_id`, `activity_id`, `status`, `track`, `prev_amount`, `amount`, `decided`, `reason`, `kpi_text`, `multi`, `zbb_ask`, `zbb_note`, `sent_once`, `rule_set_version` | ภายใน | `bgt.request` | BGT-FR-017 to BGT-FR-036 |
| `request_line`, `request_year`, `request_quarter` | `type`, `name`, `qty`, `unit_name`, `price`, `location`, `lat`, `lng`, `price_source`, `price_date`; `year`, `amount`; `quarter`, `amount` | ภายใน | `bgt.request` | BGT-FR-020, BGT-FR-023, BGT-FR-025, BGT-FR-028 |
| `request_readiness`, `request_risk` | `site`, `staff`, `mgmt`, `mat`, `forest`, `eia`, `evals`; `type`, `level`, `fix` | ภายใน | `bgt.request` | BGT-FR-024 |
| `request_document` | `kind`, `file_key`, `name` | ลับ | `bgt.request` | BGT-FR-026, BGT-FR-027, BGT-DR-007 |
| `request_version`, `request_comment`, `request_payroll` | `version_no`, `snapshot` (jsonb), `why`; `line_key`, `text`, `author_ref`, `resolved_at`; `rows` (jsonb) | ลับ | `bgt.request` | BGT-DR-002, BGT-FR-029, BGT-FR-057 |
| `ceiling_issue`, `unit_ceiling`, `ceiling_reply` | `fy`, `ceiling`, `project_ceiling`, `issued_on`, `due_on`, `version_no`; `unit_id`, `amount`; `state`, `amount`, `why` | ภายใน | `bgt.request` | BGT-FR-040 to BGT-FR-045 |
| `priority_score`, `criterion`, `duplicate_mark` | `request_id`, `criterion_id`, `value`; `name`, `weight`; `keep_id`, `merge_id`, `overlap`, `state` | ภายใน | `bgt.request` | BGT-FR-046 to BGT-FR-049 |
| `review_row`, `amount_change` | `request_id`, `requested`, `round2`, `round3`; `round`, `from_amount`, `to_amount`, `why`, `actor_ref`, `at` | ภายใน | `bgt.request` | BGT-FR-059, BGT-DR-001 |
| `meeting`, `meeting_member`, `vote`, `resolution` | `no`, `held_on`, `place`, `status`, `minutes`, `certified_at`; `subject_ref`, `present`; `request_id`, `choice`, `abstained`; `amount`, `note`, `cut_impact` (jsonb) | ลับ | `bgt.meeting` | BGT-FR-067 to BGT-FR-074 |
| `hearing`, `hearing_question` | `unit_id`, `held_on`, `who`, `status`; `question`, `answer` | ภายใน | `bgt.meeting` | BGT-FR-075 |
| `minister_approval`, `submission_batch`, `batch_request`, `batch_result`, `revision_request` | `fy`, `letter_no`, `on_date`; `no`, `status`, `channel`, `simulated`; `request_id`, `amount`; `amount`; `no`, `due_on`, `issue`, `reply` | ภายใน | `bgt.submission` | BGT-FR-076 to BGT-FR-084 |
| `budget_bill`, `bill_stage`, `bill_item`, `bill_cut`, `bill_appeal` | `fy`, `stage`; `stage_no`, `on_date`; `request_id`, `amount`; `amount`, `why`; `amount`, `why`, `restored`, `withdrawn_at` | ภายใน | `bgt.submission` | BGT-FR-087 to BGT-FR-093 |
| `appropriation`, `appropriation_type` | `fy`, `act`, `act_on`, `from_act`; `type`, `amount` | ภายใน | `bgt.line` | BGT-FR-094 |
| `allocation_line` | `fy`, `no`, `unit_id`, `name`, `type`, `activity_id`, `request_id`, `amount`, `status`, `new_project`, `extended`, `secret_fund`, `cancel_amount`, `cancel_why` | ภายใน | `bgt.line` | BGT-FR-098 to BGT-FR-103, BGT-DR-004 |
| `spending_plan`, `plan_month`, `plan_sent` | `line_id`, `version_no`, `reason`, `note`; `month`, `amount`; `fy`, `sent_on` | ภายใน | `bgt.line` | BGT-FR-105 to BGT-FR-107 |
| `release`, `regional_allotment` | `no`, `quarter`, `type`, `amount`, `status`, `letter_no`; `line_id`, `due_on`, `sent_on` | ภายใน | `bgt.line` | BGT-FR-108 to BGT-FR-110 |
| `line_balance`, `ledger_entry` | `line_id`, `amount`, `reserved`, `committed`, `held`, `paid`; `kind`, `amount`, `source_module`, `source_ref`, `at` | ภายใน | `bgt.ledger` | BGT-FR-112 to BGT-FR-114, BGT-IR-001 |
| `line_disbursement` | `line_id`, `month`, `amount`, `source`, `import_ref` | ภายใน | `bgt.ledger` | BGT-IR-005 |
| `transfer` | `fy`, `no`, `from_line`, `to_line`, `amount`, `type`, `reason`, `why`, `status`, `report_due`, `reported_on`, `bureau_on`, `act_ref`, `prepared_by_ref`, `decided_by_ref`, `rule_set_version` | ภายใน | `bgt.line` | BGT-FR-115 to BGT-FR-125 |
| `carry_over`, `carried_fund`, `carried_payment`, `saving` | `no`, `line_id`, `amount`, `po`, `po_on`, `status`; `due_on`, `paid`, `status`; `amount`, `on_date`; `contract_ref`, `amount`, `use` | ภายใน | `bgt.line` | BGT-FR-126 to BGT-FR-132 |
| `progress_report`, `spend_alert` | `line_id`, `month`, `pct`, `status`, `issue`, `next_amount`; `kind`, `acknowledged_by_ref` | ภายใน | `bgt.result` | BGT-FR-137, BGT-FR-139 |
| `line_month` | `line_id`, `month`, `plan`, `actual`, `reserved`, `committed` | ภายใน | สร้างใหม่ได้ | BGT-FR-133 |
| `output`, `kpi_result`, `report_round`, `quarter_report`, `report_item`, `report_evidence` | `line_id`, `name`, `unit`, `target`, `retired_at`; `result`; `round`, `due_on`; `status`, `sent_at`, `certified_on`; `result`, `problem`, `fix`; `file_key` | ภายใน | `bgt.result` | BGT-FR-142 to BGT-FR-150 |
| `evaluation`, `recommendation`, `public_summary` | `no`, `proj`, `scores`, `findings`, `lessons`, `status`; `no`, `text`, `source`, `unit_id`, `due_on`, `status`, `action`, `idea_id`; `fy`, `approved_on` | ภายใน | `bgt.result` | BGT-FR-151 to BGT-FR-155 |
| `structure_node`, `committee_roster`, `master_plan`, `budget_setting`, `rule_switch` | `fy`, `level`, `code`, `name`, `parent_id`, `retired_at`; `subject_ref`, `role`; `name`; `key`, `value`, `fy`; `rule_id`, `on`, `effect` | ภายใน | `bgt.config` | BGT-FR-156 to BGT-FR-161 |
| `agent_run`, `ai_use`, `scenario`, `anomaly` | `agent`, `steps`, `status`; `tool`, `user_ref`, `target`, `version`; `name`, `kind`, `params` (jsonb), `owner_ref`; `kind`, `risk`, `status`, `note`, `reopened` (jsonb) | ลับ | `bgt.ai` | BGT-FR-163 to BGT-FR-171 |
| `number_series`, `number_log` | `doc_type`, `fy`, `last_no`; `no`, `ref` | ภายใน | `bgt.config` | BR-BGT-37, BGT-DR-005 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | ภายใน | สั้น กำหนดร่วมกับแพลตฟอร์ม | ADR-0008 |

### ฟิลด์ส่วนบุคคลและจำกัดการเข้าถึง {#bgt-data-fields}

ตารางนี้ส่งต่อไปยังพจนานุกรมข้อมูลและบันทึกการประมวลผล (ADR-0014, PDPA 39, BGT-DR-009) ฐานทางกฎหมายของแต่ละฟิลด์ให้เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลยืนยัน งบประมาณมีข้อมูลส่วนบุคคลไม่มาก ส่วนใหญ่เป็นชื่อเจ้าหน้าที่ในข้อมูล

| ฟิลด์ | ชั้นข้อมูล | การคุ้มครอง | กฎ |
| --- | --- | --- | --- |
| `*_ref` columns | ลับ | อ้างอิงแบบนามแฝง ชื่อจริงอยู่ในตาราง subject ของ platform | รายงานแสดงตัวแทนหลังการลบ (ADR-0015) |
| `vote.choice` | ลับ | จำกัดตามบทบาท ไม่ทำดัชนีค้นหา | BGT-NFR-007 |
| `request_payroll.rows` | ลับ อาจจำกัดการเข้าถึง | เก็บเฉพาะยอดสรุป ไม่มีเลขประจำตัวประชาชน | DG-BGT-07 |
| `report_evidence`, `request_document` files | อาจจำกัดการเข้าถึง | สแกนด้วย ClamAV ใช้กุญแจของ tenant ไม่ทำดัชนีข้อความ | ภาพหรือเอกสารอาจมีบุคคล |

### ไฟล์ การค้นหา และการเก็บรักษา {#bgt-data-files}

- เอกสารคำขอ หลักฐานรายงาน ชุดเอกสาร และรายงานการประชุมเป็นวัตถุใน S3 API เชื่อมด้วย `file_key` (BGT-DR-007, ADR-0010)
- OpenSearch ทำดัชนีคำขอ รายการจัดสรร และตัวชี้วัดตามชื่อและเลขที่ โดยกรอง tenant ที่เซิร์ฟเวอร์ทุกครั้ง (ADR-0009) และไม่ทำดัชนีการลงความเห็น
- คีย์การเก็บรักษาแต่ละตัวชี้ไปยังหนึ่งแถวของตารางใน `platform` ค่าตั้งของ tenant และช่วงที่ยอมรับรอ OI-BGT-10

## การออกแบบส่วนเชื่อมต่อ {#bgt-interfaces}

REST API อธิบายด้วย OpenAPI 3.1 (ADR-0003) และเหตุการณ์อธิบายด้วย AsyncAPI (ADR-0008) tenant มาจาก token ไม่ใช่ path และคำสั่งที่เปลี่ยนสถานะส่ง `If-Match` พร้อมรุ่นของ aggregate

### REST endpoint {#bgt-rest}

> [!NOTE] รายการ endpoint นี้เป็นข้อเสนอ path อ้างจาก `/api/v1/budget` และชื่อสิทธิ์นิยามในหัวข้อความมั่นคงปลอดภัย

| Method และ path | วัตถุประสงค์ | สิทธิ์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `GET /today` | งาน ปฏิทิน และการแจ้งเตือนตามบทบาท | `bgt.read` | BGT-FR-001 |
| `GET, POST, PUT, DELETE /strategies, /goals, /kpis`; `POST .../{id}/retire` | ต้นไม้ยุทธศาสตร์และตัวชี้วัด | `bgt.strategy` | BGT-FR-004 to BGT-FR-009 |
| `GET, POST, PUT /ideas`; `POST /ideas/{id}/score, accept, decline, withdraw, convert` | คลังโครงการ | `bgt.idea`, `bgt.strategy` | BGT-FR-010 to BGT-FR-012 |
| `GET, POST, PUT /target-revisions`; `POST /target-revisions/{id}/approve, reject, withdraw` | การทบทวนค่าเป้าหมาย | `bgt.strategy`, `bgt.approve` | BGT-FR-013, BGT-FR-014 |
| `GET, POST /requests`; `GET, PUT, DELETE /requests/{id}`; `GET /requests/{id}/checks` | ข้อมูลคำขอและผลการตรวจกฎ | `bgt.request` | BGT-FR-017 to BGT-FR-032 |
| `POST, DELETE /requests/{id}/documents` | เอกสาร | `bgt.request` | BGT-FR-026, BGT-FR-027 |
| `POST /requests/{id}/send, withdraw, cancel` | การกระทำของเจ้าของ | `bgt.request` | BGT-FR-033 to BGT-FR-036 |
| `POST /requests/{id}/director-approve, return, forward, approve` | การกระทำของผู้พิจารณา | `bgt.director`, `bgt.review`, `bgt.approve` | BGT-FR-037, BGT-FR-056, BGT-FR-058, BGT-FR-063 |
| `POST, PUT, DELETE /requests/{id}/comments` | ความเห็น | `bgt.review` | BGT-FR-057 |
| `GET, PUT /ceilings`; `POST /ceilings/issue, reissue, withdraw`; `POST /ceilings/replies`; `POST /ceilings/replies/{unit}/grant, decline` | กรอบวงเงินและคำตอบ | `bgt.consolidate`, `bgt.request` | BGT-FR-040 to BGT-FR-045 |
| `GET, PUT /priority`; `GET /three-r`; `POST /three-r/apply`; `GET, POST, PUT, DELETE /duplicates`; `POST /duplicates/{id}/merge, dismiss`; `POST /requests/{id}/zero-based-ask`; `GET /forward-estimates` | เครื่องมือรวบรวม | `bgt.consolidate` | BGT-FR-046 to BGT-FR-054 |
| `GET /review/queue`; `GET, PUT /review/rows`; `POST /review/forward-all`, `POST /review/approve-all` | คิวและวงเงินรายรอบ | `bgt.review`, `bgt.approve` | BGT-FR-055, BGT-FR-059 to BGT-FR-062 |
| `GET, POST, PUT /meetings`; `POST /meetings/{id}/cancel, resolve, certify`; `PUT /meetings/{id}/votes`, `PUT /meetings/{id}/attendance` | การประชุม | `bgt.meeting`, `bgt.vote` | BGT-FR-067 to BGT-FR-074 |
| `GET, POST, PUT /hearings`; `POST /hearings/{id}/cancel, answer` | การชี้แจง | `bgt.meeting`, `bgt.request` | BGT-FR-075 |
| `PUT /minister-approval`; `GET, POST, PUT /batches`; `POST /batches/{id}/send, cancel, record-receipt, close`; `PUT /batches/{id}/results` | ชุดส่ง | `bgt.submit` | BGT-FR-076 to BGT-FR-083 |
| `GET, POST, PUT, DELETE /revision-requests`; `POST /revision-requests/{id}/reply` | คำขอแก้ไข | `bgt.submit` | BGT-FR-082 |
| `GET /packs/{fy}`; `GET /exports/{kind}`; `GET /briefing/{fy}` | ชุดเอกสาร การส่งออก ชุดชี้แจง | `bgt.submit` | BGT-FR-084 to BGT-FR-086, BGT-IR-003 |
| `GET /bill`; `POST /bill/stages/next, back`; `POST, PUT, DELETE /bill/cuts`; `POST, PUT /bill/appeals`; `POST /bill/appeals/{id}/withdraw` | ร่าง พ.ร.บ. | `bgt.submit` | BGT-FR-087 to BGT-FR-093 |
| `GET, PUT /appropriations/{fy}`; `POST /appropriations/{fy}/lines-from-act, sync-to-act` | วงเงินตาม พ.ร.บ. | `bgt.allocate` | BGT-FR-094 to BGT-FR-097 |
| `GET, POST /lines`; `GET, PUT, DELETE /lines/{id}`; `POST /lines/{id}/confirm, cancel`; `GET /lines/{id}/balance` | รายการจัดสรรและยอดคงเหลือ | `bgt.allocate`, `bgt.read` | BGT-FR-098 to BGT-FR-103, BGT-FR-112 |
| `GET, POST /lines/{id}/plan-versions`; `DELETE /lines/{id}/plan-versions/latest`; `POST /plans/{fy}/send` | แผนการใช้จ่าย | `bgt.allocate`, `bgt.plan` | BGT-FR-105 to BGT-FR-107 |
| `GET, POST, PUT /releases`; `POST /releases/{id}/record, refuse, withdraw`; `POST /lines/{id}/regional-sent` | งวดเงินและเงินจัดสรรส่วนภูมิภาค | `bgt.allocate` | BGT-FR-108 to BGT-FR-110 |
| `GET, POST, PUT /transfers`; `POST /transfers/{id}/approve, reject, withdraw, record-agreement, record-refusal, mark-reported`; `POST /transfers/classify` | การโอนเปลี่ยนแปลง | `bgt.allocate`, `bgt.transfer.t1`, `bgt.approve` | BGT-FR-115 to BGT-FR-125 |
| `GET, POST, PUT /carry-overs`; `POST /carry-overs/{id}/approve, reject, withdraw`; `POST /carried/{id}/payments, ask-extension, approve-extension`; `GET /savings`; `POST /savings/{id}/keep, move, reverse` | เงินกันและเงินเหลือจ่าย | `bgt.allocate`, `bgt.approve` | BGT-FR-126 to BGT-FR-132 |
| `GET /monitoring/live, drill, forecast, alerts`; `POST /alerts/{id}/acknowledge`; `PUT /lines/{id}/progress` | การติดตาม | `bgt.read`, `bgt.report` | BGT-FR-133 to BGT-FR-140 |
| `GET, PUT /kpi-results`; `GET, POST, PUT /outputs`; `GET /report-rounds`; `PUT /reports/{round}/{unit}`; `POST /reports/{round}/{unit}/send, accept, return, certify` | ผลและรายงาน | `bgt.report`, `bgt.accept`, `bgt.certify` | BGT-FR-142 to BGT-FR-149 |
| `GET /cost-per-output`; `GET, POST, PUT /evaluations`; `GET, POST, PUT /recommendations`; `POST /recommendations/{id}/to-idea`; `POST /public-summary/approve` | การประเมินและข้อเสนอแนะ | `bgt.report`, `bgt.accept` | BGT-FR-150 to BGT-FR-155 |
| `GET, PUT /settings`; `GET, PUT /rules`; `GET, POST, PUT /structure`; `GET, PUT /master-data` | การดูแลระบบ | `bgt.admin` | BGT-FR-156 to BGT-FR-161 |
| `GET /analytics/forecast, kpis, signals`; `POST /what-if`; `GET, POST, PUT, DELETE /scenarios`; `POST /anomalies/{id}/close, escalate, reopen` | การวิเคราะห์ | `bgt.read`, `bgt.audit` | BGT-FR-167 to BGT-FR-172 |
| `POST /ai/{tool}`; `POST /agents/{agent}/runs`; `POST /agent-runs/{id}/steps/{n}/approve, reject`; `POST /agent-runs/{id}/cancel` | เครื่องมือ AI และเอเจนต์ | `bgt.ai` และสิทธิ์ของการกระทำนั้น | BGT-FR-162 to BGT-FR-166, BGT-FR-173 |

### รายการข้อผิดพลาด {#bgt-errors}

> [!NOTE] รหัสเหล่านี้เป็นข้อเสนอ ข้อผิดพลาดใช้ Problem Details ที่มีฟิลด์ `code` และเมื่อปฏิเสธการส่งจะมีข้อแรกที่ไม่ผ่าน ข้อความเป็นภาษาของผู้ใช้

| รหัส | HTTP | ความหมาย | กฎหรือข้อกำหนด |
| --- | --- | --- | --- |
| `BGT_INVALID_INPUT` | 400 | ฟิลด์ไม่ผ่านการตรวจ | BGT-FR-099 |
| `BGT_REASON_REQUIRED` | 400 | ไม่มีเหตุผลหรือสั้นเกินไป | BR-BGT-34, BGT-FR-060 |
| `BGT_FORBIDDEN` | 403 | ผู้ใช้ไม่มีสิทธิ์ | ADR-0006 |
| `BGT_SOD_BLOCKED` | 403 | กฎแยกหน้าที่ปฏิเสธผู้นี้และบันทึกความพยายาม | BGT-FR-124, BGT-FR-070 |
| `BGT_AI_NOT_ALLOWED` | 403 | เครื่องมือปิดอยู่หรือคำขออยู่นอกขอบเขต AI | BR-BGT-39 |
| `BGT_NOT_FOUND` | 404 | ไม่มีข้อมูลหรือเป็นของ tenant หรือหน่วยงานอื่น | ADR-0005, BGT-NFR-007 |
| `BGT_VERSION_CONFLICT` | 409 | ข้อมูลเปลี่ยนหลังการอ่าน | ADR-0005 |
| `BGT_STATE_CONFLICT` | 409 | การกระทำใช้กับสถานะปัจจุบันไม่ได้ | BGT-CR-004 |
| `BGT_CHECK_FAILED` | 409 | ข้อ block ไม่ผ่าน | BGT-FR-030 |
| `BGT_NO_QUORUM` | 409 | กรรมการเข้าประชุมไม่ครบ | BR-BGT-15 |
| `BGT_MINISTER_REQUIRED` | 409 | ไม่มีความเห็นชอบของรัฐมนตรี | BR-BGT-23 |
| `BGT_LINE_ROOM_EXCEEDED` | 409 | เกินยอดใช้ได้ | BR-BGT-25, BR-BGT-30 |
| `BGT_LINE_IN_USE` | 409 | รายการมียอดจอง ผูกพัน หรือกันไว้ | BR-BGT-35 |
| `BGT_IN_USE` | 409 | ข้อมูลหลักที่ถูกใช้แล้วทำได้เพียงเลิกใช้ | BR-BGT-38 |
| `BGT_TRANSFER_NOT_ALLOWED` | 409 | ประเภทนี้ต้องใช้คณะรัฐมนตรีหรือ พ.ร.บ. หรือเหตุผลไม่อยู่ในรายการ | BR-BGT-26 to BR-BGT-28 |
| `BGT_CARRYOVER_INVALID` | 409 | เงื่อนไขการกันเงินไม่ผ่าน | BR-BGT-32 |
| `BGT_SETTING_OUT_OF_RANGE` | 422 | ค่าตั้งอยู่นอกช่วงที่ยอมรับ | BGT-FR-156, BGT-FR-160 |
| `BGT_IMPORT_INVALID` | 422 | อ่านไฟล์ตามรูปแบบที่คาดไม่ได้ | BGT-IR-003 |

### รายการเหตุการณ์ {#bgt-events}

> [!NOTE] รายการเหตุการณ์นี้เป็นข้อเสนอ แต่ละเหตุการณ์เขียนลง `outbox_event` ในธุรกรรมของการเปลี่ยนแปลง และ relay ส่งไป RabbitMQ (ADR-0008) ผู้รับทิ้งรายการซ้ำตาม `eventId` และ routing key ขึ้นต้นด้วย `budget.`

ทุกเหตุการณ์มี `eventId` `tenantId` `occurredAt` และ `aggregateId` และฟิลด์ด้านล่าง payload มีเฉพาะการอ้างอิงและจำนวนเงิน ไม่มีข้อมูลส่วนบุคคล

| เหตุการณ์ | ผู้สร้าง | ฟิลด์เพิ่มเติม | ผู้รับ |
| --- | --- | --- | --- |
| `request.sent`, `request.director-approved`, `request.forwarded`, `request.returned`, `request.withdrawn` | `BudgetRequest` | `unitId`, `amount` | การแจ้งเตือน `reporting` |
| `request.approved`, `request.rejected`, `request.cancelled` | `BudgetRequest`, `Meeting` | `decided` | `projects`, `review`, `procurement` |
| `ceiling.issued` | `CeilingIssue` | `versionNo`, `dueOn` | การแจ้งเตือน |
| `meeting.resolved` | `Meeting` | `items` | การสร้างรายงานการประชุม การแจ้งเตือน |
| `batch.sent`, `batch.result-recorded`, `batch.closed` | `SubmissionBatch` | `count`, `amount` | สถานะติดตามคำขอ การแจ้งเตือน |
| `act.in-force` | `BudgetBill` | `fy` | การแจ้งเตือน `finance` |
| `lines.created`, `line.confirmed`, `line.changed`, `line.cancelled` | `allocation` | `lineId`, `fy`, `amount` | `procurement`, `finance`, `projects`, `monitoring` |
| `transfer.requested`, `transfer.approved`, `transfer.effective`, `transfer.rejected` | `Transfer` | `type`, `fromLine`, `toLine`, `amount` | `finance`, `monitoring`, `review` |
| `carry-over.approved` | `CarryOver` | `lineId`, `amount`, `dueOn` | `finance`, `monitoring` |
| `ledger.changed` | `LedgerService` | `lineId`, `kind`, `amount` | `monitoring` |
| `report.sent`, `report.accepted` | `QuarterReport` | `round`, `unitId` | การแจ้งเตือน `review` |
| `settings.changed` | `settings` | `key`, `fy` | แจ้งผู้ตรวจสอบ |

### Adapter ภายนอก {#bgt-adapters}

Adapter ทำงานบนเส้นทาง outbox ลองซ้ำได้อย่างปลอดภัย และแสดงสถานะให้ผู้ใช้ (ADR-0008) คำสั่งจำลองไม่มีใน tenant ที่ใช้งานจริง (BGT-NFR-005)

| Adapter | Port | รุ่นแรก | พฤติกรรม | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| e-Budgeting, BBL | `BudgetBureauExchange` | ไฟล์ต่อชุดส่ง และบันทึกผลด้วยมือ | ใช้การจับคู่คอลัมน์ที่ตั้งค่าได้ เพราะยังไม่มีรูปแบบที่ยืนยัน | BGT-IR-003, BGT-FR-085 |
| BB EvMIS | `EvmisExport` | ไฟล์แบบ 301 และ 302 และรายงาน | สร้างจากแผนการใช้จ่ายและรายงานรายไตรมาส | BGT-IR-004 |
| GFMIS | ไม่มีในงบประมาณ | อยู่ใน `finance` | งบประมาณรับผลเบิกจ่ายผ่าน `LineLedger.recordDisbursement` | BGT-IR-005 |
| หน้าสาธารณะ | `PublicSummaryPublisher` | ยังไม่มีจนกว่าจะเลือกช่องทาง | เผยแพร่เฉพาะสรุปที่อนุมัติ | BGT-IR-007 |

> [!OPEN] ยังไม่ทราบข้อกำหนดของ e-Budgeting BBL และ BB EvMIS สำนักงบประมาณต้องให้รูปแบบไฟล์และแจ้งว่าเปิด API ให้หน่วยงานหรือไม่ (OI-BGT-04) ระหว่างนี้ adapter ยังไม่มีรูปแบบตายตัว และอ่านการจับคู่คอลัมน์ที่เป็นกลางต่อ tenant จากค่าตั้ง

## การออกแบบความมั่นคงปลอดภัย {#bgt-security}

Keycloak ยืนยันตัวตนผู้ใช้ (ADR-0006) บทบาท กฎแยกหน้าที่ และการมอบอำนาจอยู่ใน `platform` และเซิร์ฟเวอร์ตรวจทุกการกระทำ การผูก tenant และ row-level security เป็นไปตามบทจัดซื้อจัดจ้าง งบประมาณอยู่ที่ OWASP ASVS ระดับ 2 (ADR-0017)

### สิทธิ์ {#bgt-authorities}

> [!NOTE] ชื่อสิทธิ์เป็นข้อเสนอ การจับคู่บทบาทกับสิทธิ์เป็นข้อมูลของ tenant และค่าเริ่มต้นเหล่านี้ตามตารางผู้เกี่ยวข้องใน SRS

| สิทธิ์ | บทบาทเริ่มต้น | อนุญาต |
| --- | --- | --- |
| `bgt.read` | ทุกบทบาทของงบประมาณ จำกัดตามหน่วยงานสำหรับเจ้าหน้าที่หน่วยงานและผู้อำนวยการกอง | อ่านข้อมูลที่บทบาทเห็นได้ |
| `bgt.strategy`, `bgt.consolidate`, `bgt.review`, `bgt.meeting`, `bgt.submit` | เจ้าหน้าที่กองแผน | งานจัดทำ โดย `bgt.review` มอบได้ตามขอบเขต `review` |
| `bgt.idea` | เจ้าหน้าที่หน่วยงาน เจ้าหน้าที่กองแผน | เสนอและแก้ไขความคิดโครงการ |
| `bgt.request` | เจ้าหน้าที่หน่วยงาน เฉพาะหน่วยงานตน | จัดทำ ส่ง ถอน ตอบ |
| `bgt.director` | ผู้อำนวยการกอง เฉพาะหน่วยงานตน | เห็นชอบและส่งคืนที่ `unit` |
| `bgt.approve` | ผู้บริหาร โดยตรงหรือผ่านการมอบอำนาจ | คำขอ การทบทวน การโอน T2 T3 T6 เงินกันเหลื่อมปี |
| `bgt.vote` | กรรมการในทะเบียน ตรวจรายการประชุม | ลงความเห็น |
| `bgt.allocate` | เจ้าหน้าที่การเงิน | วงเงิน รายการจัดสรร แผน งวดเงิน คำขอโอน คำขอกันเงิน |
| `bgt.transfer.t1` | หัวหน้าการเงินหรือหัวหน้าหน่วยงาน ตามขอบเขตการมอบอำนาจ `transfer` | อนุมัติ T1 |
| `bgt.plan` | เจ้าหน้าที่กองแผน เจ้าหน้าที่การเงิน | ฉบับแผนการใช้จ่าย |
| `bgt.report`, `bgt.accept` | เจ้าหน้าที่หน่วยงาน เจ้าหน้าที่กองแผน | ความก้าวหน้าและผล รับและส่งคืน |
| `bgt.certify`, `bgt.audit` | ผู้ตรวจสอบ | รับรองหลักฐาน ความผิดปกติ เพิ่มข้อเสนอแนะ |
| `bgt.admin` | ผู้ดูแลระบบ | กฎ ค่าตั้ง โครงสร้าง ไม่มีอำนาจอนุมัติงบประมาณ (BR-PLT-07) |
| `bgt.ai` | บทบาทที่ tenant อนุญาต เมื่อเปิดเครื่องมือ | เครื่องมือ AI และเอเจนต์ |

### การตรวจการแยกหน้าที่ {#bgt-sod}

`SodGuard` ทำงานในคำสั่งตามบท Platform ตารางนี้ระบุจุดบังคับใช้ของ SD-09 และ SD-10 ซึ่ง PLT มอบหมายให้บทนี้

| กฎ | คำสั่ง | ผู้กระทำ | เทียบกับ | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| SD-09 | `Transfer.approve` | ผู้อนุมัติและผู้มอบอำนาจ | ผู้จัดทำ รวมผู้อนุมัติขั้นของ AG-15 | BGT-FR-124 |
| SD-10 | `Meeting.vote`, `Meeting.resolve` | กรรมการผู้ลงความเห็น | หน่วยงานของคำขอ | BGT-FR-070, BR-BGT-16 |
| การตรวจโดยบุคคลที่สอง | การทบทวนค่าเป้าหมาย การกันเงิน ฉบับแผน | ผู้ตัดสิน | ผู้เสนอ | BGT-FR-014, BGT-FR-127 |

> [!NOTE] ต้นแบบยังไม่มีการตรวจพร้อมบันทึกของทั้งสองกฎ (OI-BGT-06, OI-PLT-04) SD-10 เป็นกฎที่กฎหมายอาจกำหนด DG-PRC-05 จึงใช้กับที่นี่ด้วย ว่ากฎใดปิดไม่ได้ยังเป็นประเด็นเปิด

### Audit {#bgt-audit}

- ทุกการอนุมัติ ปฏิเสธ ยกเลิก เปลี่ยนวงเงิน เปลี่ยนค่าตั้ง และนำเข้าเขียนรายการผ่าน `AuditLog` (BGT-NFR-001, BGT-CR-006) โดย aspect `CommandAudit` ในธุรกรรมเดียวกัน
- รายการมีเฉพาะการอ้างอิงนามแฝงและรหัสรายการ ไม่มีชื่อหรือข้อความอิสระ (ADR-0015) เหตุผลอยู่ในข้อมูลธุรกิจ เช่น `amount_change`
- Log ของแอปพลิเคชันและ telemetry ไม่มีข้อมูลส่วนบุคคล และมีการทดสอบตรวจ (ADR-0015, ADR-0017)

### การควบคุม AI {#bgt-ai-security}

- การเรียก AI ทั้งหมดผ่าน `AiGateway` AI ปิดโดยค่าเริ่มต้น และทุกฟีเจอร์ทำงานได้เมื่อปิด (ADR-0016, BGT-FR-174)
- `ToolRegister` เป็นรายการปิดต่อเอเจนต์ ไม่มีเครื่องมืออนุมัติคำขอหรือการโอน ลงมติ ส่งออกภายนอก หรือเปลี่ยนกฎ (BR-BGT-39)
- ขั้นที่เขียนข้อมูลหยุดให้คน และการอนุมัติเรียกคำสั่งปกติ สิทธิ์และกฎแยกหน้าที่จึงใช้กับบุคคลนั้น (BGT-FR-162, BGT-FR-163)

## การออกแบบที่ไม่ใช่ฟังก์ชัน {#bgt-nfr}

| ข้อกำหนด | คำตอบของการออกแบบ | ตรวจด้วย |
| --- | --- | --- |
| BGT-NFR-001 | aspect `CommandAudit` บนทุกคำสั่ง | การทดสอบ integration ต่อคำสั่ง |
| BGT-NFR-002 | ยอดรวมอ่านจาก aggregate หรือ projection ที่ปรับด้วยเหตุการณ์เดียวกัน | `ChainOfAmountsIT` |
| BGT-NFR-003 | กำหนดเวลาระบุข้อกฎหมายจาก `BudgetRuleSet` และใช้ `WorkingCalendar` เดียว | Unit test และกฎสถาปัตยกรรม |
| BGT-NFR-004 | ข้อความ React ทั้งไทยและอังกฤษ แม่แบบชุดเอกสารและรายงานการประชุมเป็นภาษาไทย | Playwright ทั้งสองภาษา |
| BGT-NFR-005 | ไม่มีโค้ดจำลองในระบบจริง ใช้ clock เดียวที่ inject และ adapter ทดสอบมีเฉพาะโปรไฟล์ทดสอบ | การตรวจตอน build |
| BGT-NFR-006 | `YearForecast` เป็นฟังก์ชันบริสุทธิ์ของยอดและค่าตั้ง | การทดสอบรันซ้ำ |
| BGT-NFR-007 | ขอบเขตหน่วยงานใน `Authorizer` และตัวกรองฟิลด์ของการลงความเห็น | การทดสอบ integration ต่อบทบาท |

### ภาระงานและความพร้อมใช้ {#bgt-nfr-load}

- วางแผนกำลังตามพีกวันที่ 30 กันยายน (ADR-0005) การล็อกแถวของ `line_balance` เป็นจุดแย่งชิงที่คาดไว้ การเรียกบัญชีจึงถือล็อกเฉพาะช่วงปรับยอดและ commit และ k6 วัดจุดนี้ก่อน (ADR-0017)
- คำขอพีกในช่วงส่ง และคำสั่งส่งตรวจชุดกฎบน aggregate เดียวโดยไม่สแกนตาราง
- B4 และ B8 อ่าน projection พร้อมการแบ่งหน้า ความล้มเหลวของ adapter ทำให้เหตุการณ์ค้างใน outbox และแสดงสถานะ (ADR-0008)

> [!OPEN] ยังไม่มีเป้าหมายเวลาตอบสนองและปริมาณเฉพาะงบประมาณนอกเหนือจากบทข้อกำหนดร่วม เจ้าของผลิตภัณฑ์ต้องระบุว่าการเรียกบัญชีและชุดกฎต้องมีเป้าหมายเฉพาะหรือไม่ (DG-BGT-08)

## การออกแบบการทดสอบ {#bgt-tests}

sweep ใน `tests/sweep.js` ทำงานในหน้าต้นแบบและทดสอบเซิร์ฟเวอร์ไม่ได้ แต่ walk เหล่านี้ยังเป็นคำอธิบายพฤติกรรมที่ตั้งใจได้ดีที่สุด แต่ละ walk จึงกลายเป็นการทดสอบของระบบจริง ระดับการทดสอบเป็นไปตามบทจัดซื้อจัดจ้าง

> [!NOTE] ชื่อคลาสทดสอบเป็นข้อเสนอ

### จาก sweep walk สู่การทดสอบของระบบจริง {#bgt-test-walks}

| การตรวจใน sweep | การทดสอบของระบบจริง | สิ่งที่เพิ่มจาก walk | ข้อกำหนด |
| --- | --- | --- | --- |
| E2E walk | `BudgetCycleScenario` (Spring Modulith `Scenario`); `budget-cycle.spec` (Playwright) | การปฏิเสธทุกจุดระหว่างทาง และคำขอที่ถอนส่งอีกครั้งผ่านเส้นทางจริง | BGT-FR-011, BGT-FR-035, BGT-FR-072, BGT-FR-100, BGT-FR-119, BGT-FR-127, BGT-FR-154 |
| C3 walk | `SubmissionToActIT` | การปิดถูกปฏิเสธเมื่อมีคำขอแก้ไขค้าง การส่งถูกปฏิเสธเมื่อไม่มีรัฐมนตรี การตัดเกินรายการถูกปฏิเสธ | BGT-FR-077, BGT-FR-082, BGT-FR-083, BGT-FR-090, BGT-FR-095 |
| รอบ C4 | `MonitoringProjectionIT` | clock เป็น fixture ของการทดสอบ และวันที่สาธิตไม่มีในระบบจริง | BGT-FR-133, BGT-NFR-005 |
| รอบหน้า Budget | `budget-pages.spec` | ล้มเหลวเมื่อมี console error และเพิ่มการสแกนการเข้าถึง | BGT-FR-002, BGT-FR-003 |
| Sweep เปิดหน้า | `role-matrix.spec` | ทุกหน้า ทุกบทบาท ทั้งสองภาษา | แถว Partial โดยทั่วไป |

### การทดสอบที่ไม่มีต้นทางใน sweep {#bgt-test-new}

| การทดสอบ | สิ่งที่ตรวจ | ข้อกำหนด |
| --- | --- | --- |
| `RequestRulebookTest` | กฎ block หยุดการส่ง กฎ warn ไม่หยุด และกฎที่ปิดถูกข้าม | BGT-FR-030, BR-BGT-01 to BR-BGT-13 |
| `RequiredDocumentsTest` | แต่ละเงื่อนไขขอเอกสารถูกต้องที่วงเงินขอบเขต | BGT-FR-026 |
| `TransferClassifierTest` | ทุกคู่ของชนิดรายการให้ประเภทถูกต้อง และ T5 กับเงินราชการลับถูกปฏิเสธ | BR-BGT-26, BGT-FR-122 |
| `LedgerConcurrencyIT` | การจองและการโอนพร้อมกันไม่เกินวงเงิน และการโอนสวนทางไม่เกิด deadlock | BR-BGT-30, BGT-FR-113, BGT-FR-117 |
| `SodRefusalIT` | SD-09 และ SD-10 ปฏิเสธบุคคลและผู้มอบอำนาจ พร้อมแถวบันทึกและสถานะไม่เปลี่ยน | BGT-FR-070, BGT-FR-124 |
| `NumberSeriesIT` | เลขของร่างที่ลบไม่ถูกออกซ้ำ | BR-BGT-37, BGT-DR-005 |
| `ChainOfAmountsIT` | การเปลี่ยนในแต่ละขั้นไปถึงขั้นถัดไป ตั้งแต่วงเงินที่ตัดสินถึงวงเงินของรายการ | BGT-NFR-002, BR-BGT-24 |
| `RuleSetByDateTest` | ข้อมูลคงรุ่นกฎที่ใช้ และทุกกฎอ้างข้อกฎหมาย | BGT-FR-161, BGT-CR-002 |
| `TenantIsolationIT` | สร้างจาก schema ทุกตารางปฏิเสธการอ่านและเขียนข้าม tenant | ADR-0005 |
| `AiLimitsTest` | ทะเบียนไม่มีเครื่องมือต้องห้าม และสวิตช์ปิดปฏิเสธได้ | BR-BGT-39, BGT-FR-164 |

## การย้ายจากต้นแบบ {#bgt-migration}

ต้นแบบเป็นเพียงแหล่งอ้างอิง ไม่มีโค้ดย้ายมา สิ่งที่ส่งต่อคือความรู้ในต้นแบบ ไม่มีข้อมูลจริงให้ย้าย และข้อมูลเริ่มต้นของ tenant เป็นเรื่องการเริ่มใช้งานที่แยกต่างหาก

| สิ่งที่ส่งต่อ | วิธี | ที่มาในต้นแบบ |
| --- | --- | --- |
| ชื่อสถานะและการเปลี่ยนสถานะ | เขียนใหม่เป็น enum และตาราง Java | `41d-req-b1.js`, `78-form-crud.js`, `79-sub-crud.js`, `77-alloc-crud.js` |
| การตรวจกฎ | เขียนใหม่เป็น `RequestRulebook` พร้อมการทดสอบ | `41-requests.js` checks, `41d-req-b1.js` |
| ตรรกะการโอน | เขียนใหม่เป็น `TransferClassifier` และชุดกฎ | `47d-alloc-b4.js` classifyTransfer, TR_TYPE |
| 3R ลำดับความสำคัญ พยากรณ์ สัญญาณ | เขียนใหม่ด้วยพารามิเตอร์เดิม | `43d-cons-b2.js`, `69-budget-ai.js`, `69b-budget-settings.js` |
| หน้าจอและขั้นตอน | React ใช้หน้าเดียวกันและรูปแบบรายการกับลิ้นชัก | `75-budget-pages.js`, `76-crud.js` |
| Sweep walk | เขียนใหม่เป็นการทดสอบ | `tests/sweep.js` |
| ค่าเริ่มต้น | ข้อมูลเริ่มต้นของ tenant ภายในช่วงที่กำหนด | `05-shared.js`, `41d-req-b1.js`, `69b-budget-settings.js` |

| สิ่งที่ไม่ส่งต่อ | เหตุผล | แทนด้วย |
| --- | --- | --- |
| สถานะในเบราว์เซอร์ `syncBudget` `liveDash` | ผู้ใช้เดียว สร้างใหม่ทุก route | PostgreSQL บัญชีแยกประเภท และ projection |
| วันที่สาธิตและ `simDisb` | ต้องไม่มีในระบบจริง (BGT-NFR-005) | clock ที่ inject และการนำเข้าจริง |
| ปุ่มจำลอง | BGT-NFR-005 | ฟอร์มที่กรอกจากผลจริง |
| ข้อมูลตัวอย่างของหน่วยงานและรหัสตัวอย่างในโค้ด | ไม่ใช่ส่วนของผลิตภัณฑ์ทั่วไป | ข้อมูล tenant เท่านั้น |
| ตาราง `FY2569` เดิมและเส้นทางการโอนสองทาง | คงไว้สำหรับลิงก์เดิมในต้นแบบ | หนึ่งคำสั่งต่อหนึ่งการกระทำ |
| ข้อบกพร่องที่ทราบของต้นแบบ | OI-BGT-05 ถึง OI-BGT-09 | แก้ด้วยการออกแบบและมีการทดสอบ |

## ช่องว่างที่ทราบและประเด็นที่ยังเปิดอยู่ {#bgt-open}

### ประเด็นจาก SRS {#bgt-open-srs}

| ประเด็น | ผลต่อการออกแบบ | สิ่งที่ออกแบบไว้ขณะนี้ | ผู้ตัดสิน |
| --- | --- | --- | --- |
| OI-BGT-01 | การอ้างข้อกฎหมายของข้อจำกัด | รายการ `BudgetRuleSet` มีฟิลด์ข้อกฎหมาย | ผู้เชี่ยวชาญงบประมาณ |
| OI-BGT-02 | เลขข้อของระเบียบและฉบับแก้ไขที่ 2 พ.ศ. 2567 | ชุดกฎแรกอิงฉบับ 2562 และใช้งานจริงไม่ได้จนกว่าจะยืนยัน | ผู้เชี่ยวชาญงบประมาณ |
| OI-BGT-03 | การแบ่งข้อจำกัดกับค่าตั้ง และตารางการโอน | ชุดกฎในโค้ด และช่วงค่าระบุว่าเป็นข้อเสนอ | ผู้เชี่ยวชาญงบประมาณ เจ้าของผลิตภัณฑ์ |
| OI-BGT-04 | รูปแบบไฟล์ภายนอก | Port พร้อมการจับคู่คอลัมน์ | สำนักงบประมาณ กรมบัญชีกลาง |
| OI-BGT-05 | การกันยอดที่ `bb` | `hold` คงอยู่จนการโอนจบ | ทีมพัฒนา |
| OI-BGT-06 | SD-09 และ SD-10 | ทั้งสองกฎทำงานผ่าน `SodGuard` | ทีมพัฒนา |
| OI-BGT-07 | การใช้เลขซ้ำ | `NumberSeries` สำหรับทุกชุดเลข | ทีมพัฒนา |
| OI-BGT-08 | ปีของกิจกรรมในรายการ | ตัวเลือกอ่านปีงบประมาณของรายการ | ทีมพัฒนา |
| OI-BGT-09 | ข้อความและเป้าหมายตายตัว | ทั้งหมดมาจากค่าตั้งและชุดกฎ | ทีมพัฒนา |
| OI-BGT-10 | ระยะเวลาเก็บรักษา | คีย์การเก็บรักษาต่อตาราง ไม่มีระยะเวลา | ผู้เชี่ยวชาญงบประมาณ เจ้าของผลิตภัณฑ์ |
| OI-BGT-11 | ค่ารายปี | `budget_setting` ต่อปีงบประมาณ | ผู้เชี่ยวชาญงบประมาณ เจ้าของผลิตภัณฑ์ |
| OI-BGT-12 | บาทเต็มหรือสตางค์ | ดู DG-BGT-02 | ผู้เชี่ยวชาญงบประมาณ เจ้าของผลิตภัณฑ์ |
| OI-BGT-13 | ผู้อนุมัติ T2 และ T1 | tenant เลือกภายในชุดกฎ | ผู้เชี่ยวชาญงบประมาณ ฝ่ายกฎหมาย |
| OI-BGT-14 | ขอบเขต AI | ทุกการเรียกผ่าน `AiGateway` และปิดโดยค่าเริ่มต้น | เจ้าของผลิตภัณฑ์ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |

### ประเด็นใหม่จากการออกแบบนี้ {#bgt-open-new}

เลข DG-BGT ด้านล่างเป็นของบทนี้และไม่ใช่รหัสใน SRS

| ประเด็น | คำถาม | สิ่งที่ออกแบบไว้ขณะนี้ | ผู้ตัดสิน |
| --- | --- | --- | --- |
| DG-BGT-01 | เอกสารออกแบบระบุสถานะคำขอถึงจัดสรรแล้ว แต่โค้ดจบที่ approved ผู้ใช้ควรเห็นแบบใด | `status` และค่า `track` แสดงร่วมกัน | เจ้าของผลิตภัณฑ์ |
| DG-BGT-02 | BGT-DR-006 เก็บบาทเต็ม แต่ GFMIS และบัญชีได้รับสตางค์จาก Finance จะเก็บสตางค์หรือไม่ | `numeric` ทศนิยมสองตำแหน่งในบัญชี และบาทเต็มในคำขอ | ผู้เชี่ยวชาญงบประมาณ เจ้าของผลิตภัณฑ์ |
| DG-BGT-03 | ผู้บริหารไม่เห็นชอบที่ `exec` ได้หรือไม่ โค้ดไม่มีเส้นทางนี้ | ส่งคืนเท่านั้นตามต้นแบบ | ผู้เชี่ยวชาญงบประมาณ |
| DG-BGT-04 | คำขอหลายงบรายจ่ายกลายเป็นรายการเดียว ควรแยกหนึ่งรายการต่อหนึ่งงบรายจ่ายหรือไม่ | หนึ่งรายการต่อหนึ่งงบรายจ่าย ซึ่งต่างจากต้นแบบ | ผู้เชี่ยวชาญงบประมาณ เจ้าของผลิตภัณฑ์ |
| DG-BGT-05 | Finance เป็นเจ้าของ GFMIS แต่ B8 มีแท็บนำเข้าและกระทบยอด ใครเป็นเจ้าของหน้าจอ | `finance` เป็นเจ้าของการนำเข้า B8 เชื่อมไปและอ่านผล | ผู้เขียนบท FIN เจ้าของผลิตภัณฑ์ |
| DG-BGT-06 | การโอนข้ามงบรายจ่ายเปลี่ยนยอดตามงบรายจ่ายของ พ.ร.บ. ทำได้เมื่อใด | ทำได้ตามต้นแบบ และเก็บยอดเดิมตาม พ.ร.บ. แยกไว้ | ผู้เชี่ยวชาญงบประมาณ |
| DG-BGT-07 | ประมาณการบุคลากรต้องมีชื่อบุคคลหรือใช้ยอดรวมเท่านั้น | ยอดรวมตามตำแหน่งเท่านั้น | เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล ผู้เชี่ยวชาญงบประมาณ |
| DG-BGT-08 | การเรียกบัญชีและชุดกฎต้องมีเป้าหมายเฉพาะหรือไม่ | ใช้เป้าหมายของบทข้อกำหนดร่วม | เจ้าของผลิตภัณฑ์ |
| DG-BGT-09 | การกันเงินที่อนุมัติสร้างรายการปีถัดไป แต่ยอดมาจากภาระผูกพันใน Finance ใครเป็นผู้เริ่ม ระหว่าง `finance` หรือ `budget` | `budget` สร้างและแจ้ง `finance` ผ่านเหตุการณ์ | ผู้เขียนบท FIN ผู้เชี่ยวชาญงบประมาณ |

### ช่องว่างที่ทราบในฉบับนี้ {#bgt-open-depth}

- พยากรณ์การติดตาม What-if สัญญาณ และเอเจนต์ออกแบบเพียงระดับองค์ประกอบและส่วนเชื่อมต่อ ตรรกะเป็นไปตามต้นแบบและเอกสารออกแบบ และโมดูล review อาจรับบางส่วนไป
- แถว Planned ที่ไม่มีพฤติกรรมในต้นแบบมีเพียงตารางหรือ endpoint ได้แก่ BGT-FR-015 BGT-FR-016 BGT-FR-038 BGT-FR-104 BGT-FR-111 BGT-FR-148
- ชนิดคอลัมน์ ดัชนี และข้อจำกัดรอบทพจนานุกรมข้อมูล
