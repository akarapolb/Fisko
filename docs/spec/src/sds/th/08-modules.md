# ภาพรวมการออกแบบโมดูล {#modules}

> [!NOTE] บทนี้ระบุสิ่งที่เหมือนกันในทุกโมดูล เพื่อไม่ให้บทโมดูลต้องกล่าวซ้ำ บท Procurement เป็นบทนำร่อง แต่ละบทโมดูลมีส่วนเชื่อมต่อของตนครบถ้วน และตารางด้านล่างแสดงสิ่งที่แต่ละโมดูลเผยแพร่

## รายการโมดูล {#mod-list}

| โมดูล | แพ็กเกจ | คำนำหน้าใน SRS | บท |
| --- | --- | --- | --- |
| Platform | `platform` | `PLT` | [Platform](#plt) |
| Budget | `budget` | `BGT` | [Budget](#bgt) |
| Procurement | `procurement` | `PRC` | [Procurement](#prc) |
| Finance | `finance` | `FIN` | [Finance](#fin) |
| Projects | `projects` | `PRJ` | [Projects](#prj) |
| การทบทวนและการวิเคราะห์ | `review` | `REV` | [Review](#rev) |

## ทุกโมดูลสร้างอย่างไร {#mod-anatomy}

แต่ละโมดูลเป็น Spring Modulith module ที่มีรูปร่างเหมือนกัน (ADR-0002)

| ส่วน | เก็บอะไร | กฎ |
| --- | --- | --- |
| `api` | ส่วนเชื่อมต่อที่เผยแพร่และ record ของส่วนนั้น | แพ็กเกจเดียวที่โมดูลอื่นใช้ได้ พร้อม `api.events` |
| `api.events` | record ของเหตุการณ์ | payload เก็บการอ้างอิงและจำนวนเงิน ไม่มีข้อมูลส่วนบุคคล |
| `web` | REST controller, record ของคำขอ, การแปลงเป็น Problem Details | ไม่มีกฎธุรกิจ เรียกหนึ่งคำสั่ง |
| แพ็กเกจตามงาน | aggregate คำสั่ง policy repository | ภายใน คลาสโดเมนไม่ import Spring หรือ JPA |
| `settings` | ค่าตั้งของผู้เช่า สวิตช์โปรไฟล์ ชุดกฎตามวันที่ | ขีดจำกัดอยู่ในโค้ด ค่าอยู่ในข้อมูล (ADR-0007) |
| แพ็กเกจ adapter | port และ adapter ไประบบภายนอก | ทำงานบนเส้นทาง outbox (ADR-0008) |
| `reporting` | projection และรายงานที่สร้างใหม่ได้ | การอ่านไม่แตะตารางคำสั่งเมื่อมีภาระสูง |

ทุกโมดูลยังมี:

- PostgreSQL หนึ่ง schema โดย `tenant_id` อยู่แรกสุดในทุกคีย์ และมี row-level security ทุกตาราง (ADR-0005)
- ตาราง `outbox_event` และ migration ที่ใช้แนวทาง expand และ contract
- รายการสิทธิ์ รายการข้อผิดพลาดพร้อมคำนำหน้าของโมดูล และรายการเหตุการณ์
- รายการกฎการแยกหน้าที่และคำสั่งที่ตรวจกฎ
- รายการในพจนานุกรมข้อมูลสำหรับทุกฟิลด์ส่วนบุคคล (ADR-0014)

## คำสั่งทำงานอย่างไร {#mod-command}

ทุกการเปลี่ยนสถานะเป็นไปตามขั้นตอนเดียวกัน เส้นทางของคำขอในบทสถาปัตยกรรมแสดงลำดับนี้

1. `web` ตรวจคำขอและเริ่มหนึ่งธุรกรรมโดยผูกผู้เช่า
2. `Authorizer` และ `SodGuard` ทำงาน
3. คำสั่งโหลดหนึ่ง aggregate และตรวจรุ่นกับ `If-Match`
4. เมธอดของ aggregate ตรวจสถานะและกฎ แล้วเปลี่ยนค่า
5. การเรียกแบบทันทีไปยังโมดูลล่างทำในธุรกรรมเดียวกัน เช่น `LineLedger.commit`
6. คำสั่งบันทึก aggregate `CommandAudit` เพิ่มรายการ Audit และเพิ่มแถว outbox
7. ธุรกรรม commit และงานอื่นทั้งหมดทำงานจากเหตุการณ์

เครื่องสถานะตามกฎหมายเป็น Java enum พร้อมตารางการเปลี่ยนสถานะและเมธอด guard (ADR-0007) กฎธุรกิจแต่ละข้ออ้างข้อกฎหมาย และ SRS สอบกลับไปยังข้อนั้น งานตามกำหนดเวลาใช้ขั้นตอนเดียวกัน โดยผูกผู้เช่าและใช้ผู้กระทำเป็นระบบ

## ส่วนเชื่อมต่อที่เผยแพร่ {#mod-interfaces}

| โมดูล | ส่วนเชื่อมต่อที่เผยแพร่ | ผู้ใช้ | สถานะ |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `SodGuard`, `AuditLog`, `Notifier`, `WorkItems`, `ApprovalRoutes`, `WorkingCalendar`, `FiscalCalendar`, `UnitDirectory`, `SubjectDirectory`, `StandardPrices`, `RetentionRegistry`, `DocumentService`, `FileStore`, `FieldCrypto`, `SearchIndexer`, `AiGateway` และ SPI `RetentionHold` กับ `InterfaceReporter` | ทุกโมดูล | ยืนยันใน[บท Platform](#plt) |
| `platform` | `AgentRuntime`, `AgentCatalogue` | โมดูลที่มีเอเจนต์ และ `review` | ข้อเสนอใน[บท Platform](#plt-agent-runtime) DG-REV-01 |
| `platform` | `AssistantRouter` | `review` | ข้อเสนอใน[บท Platform](#plt-published) |
| `budget` | `LineLedger`, `BudgetRequestQuery`, `AllocationQuery`, `BudgetReadModel` | `procurement`, `finance`, `projects`, `review` | ยืนยันใน[บท Budget](#bgt) ส่วน `CarryOverIntake` ยังเป็นคำขอจาก Finance |
| `procurement` | `AcceptedPhaseQuery`, `PaymentGate`, `PhasePayment`, `ContractLookup`, `SupplierDirectory` และ SPI `FinanceFacts` กับ `BankChangeIntake` | `finance`, `projects`, `review` | ยืนยันใน[บท Procurement](#prc) |
| `finance` | `LinePaymentQuery`, `PaidFacts`, `KpiSource`, `ForecastSource`, `SignalSource` และติดตั้ง `FinanceFacts` กับ `BankChangeIntake` | `projects`, `review` และ `procurement` สำหรับ SPI | ยืนยันใน[บท Finance](#fin) |
| `projects` | `ProjectLookup` และติดตั้ง SPI `InterfaceReporter` กับ `RetentionHold` | `review` | ยืนยันใน[บท Projects](#prj) |
| `review` | ไม่มี เผยแพร่เฉพาะเหตุการณ์ | ไม่มี | ยืนยันใน[บท Review](#rev) |

DG-PRC-08 บันทึกว่าบทเหล่านั้นตอบ Procurement อย่างไร Review ยังขอ `KpiSource`, `ForecastSource` และ `SignalSource` จาก `budget` และ `procurement` ซึ่งบทของทั้งสองไม่ได้เผยแพร่ (DG-REV-02) การเปลี่ยนส่วนเชื่อมต่อที่เผยแพร่ใช้กฎเดียวกับ API สาธารณะ: expand ก่อน และ contract ในรุ่นถัดไป

## ทิศทางการพึ่งพา {#mod-dependencies}

โมดูลพึ่งพากันในทิศทางเดียว และ Spring Modulith ปฏิเสธวงจร `finance` พึ่ง `procurement.api` และติดตั้ง SPI ที่ Procurement ประกาศ จึงไม่เกิดวงจร (บท Procurement)

{{fig:arch-modules | ทิศทางการพึ่งพาของโมดูล}}

| โมดูล | พึ่งได้ | เหตุผล |
| --- | --- | --- |
| `platform` | ไม่มี | ฐานของผลิตภัณฑ์ |
| `budget` | `platform` | รายการและ ledger ไม่ต้องใช้สิ่งใดที่อยู่สูงกว่า |
| `procurement` | `platform`, `budget` | การจองและการผูกพันอยู่ในธุรกรรมเดียว |
| `finance` | `platform`, `budget`, `procurement.api` | การจ่ายใช้ภาระผูกพันและงวดที่ตรวจรับแล้ว |
| `projects` | `platform`, `budget`, `procurement.api`, `finance.api` | โครงการอ่านสัญญาและการใช้จ่าย |
| `review` | `api` ของแต่ละโมดูล | การทบทวนอ่านข้ามโมดูล และไม่เขียนลงโมดูลใด |

กฎสำหรับข้อเท็จจริงที่ต้องส่งขึ้นบน:

1. หากโมดูลล่างต้องการคำตอบทันที ให้ประกาศ SPI ใน `api` ของตน และโมดูลบนเป็นผู้ติดตั้ง `FinanceFacts` เป็นตัวอย่าง
2. หากเพียงต้องรู้ภายหลัง ให้รับเหตุการณ์
3. โมดูลล่างไม่ import แพ็กเกจของโมดูลบน

> [!NOTE] แถวของ `projects` และ `review` ขยายจากที่บท Procurement กำหนด และบท Projects กับบท Review ยืนยันแถวเหล่านี้แล้ว

## การทดสอบโครงสร้าง {#mod-tests}

| การทดสอบ | ยืนยันว่า | ที่มา |
| --- | --- | --- |
| Spring Modulith `verify` | ใช้เฉพาะแพ็กเกจ `api` และไม่มีวงจร | ADR-0002 |
| กฎ ArchUnit | ไม่มีเฟรมเวิร์กในโดเมน ไม่เลี่ยง outbox ไม่เรียก AI โดยตรง ไม่คำนวณวันที่นอก `WorkingCalendar` | บท Procurement, ADR-0016 |
| `TenantIsolationIT` | ทุกตารางของทุกโมดูลปฏิเสธการเข้าถึงข้ามผู้เช่า | ADR-0005 |
| การทดสอบ `Scenario` ของโมดูล | การกระทำข้ามโมดูลอยู่ในธุรกรรมเดียว | บท Procurement |
| การทดสอบสัญญาเหตุการณ์ | เหตุการณ์ตรงกับ AsyncAPI และไม่มีฟิลด์ส่วนบุคคล | ADR-0008, ADR-0015 |

การทดสอบเหล่านี้ทำงานใน CI และต้องไม่ถูกปิด (ADR-0002)

## การแยกโมดูลในภายหลัง {#mod-split}

โมดูลแยกออกภายหลังได้หากภาระงานต้องการ (ADR-0002) โครงสร้างนี้คงความเป็นไปได้นั้น เพราะตารางของโมดูลถูกอ่านโดยโมดูลนั้นเท่านั้น และโมดูลข้างเคียงใช้ส่วนเชื่อมต่อและเหตุการณ์ ค่าใช้จ่ายอยู่ที่การเรียกแบบทันที ซึ่งต้องออกแบบธุรกรรมร่วมใหม่ การแยกต้องมี ADR ใหม่
