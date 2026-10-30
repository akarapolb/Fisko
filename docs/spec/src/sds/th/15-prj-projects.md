# การออกแบบโมดูลทะเบียนโครงการ {#prj}

> [!NOTE] Fisko ยังไม่มีโค้ดของระบบจริง ต้นแบบเป็น JavaScript บนเบราว์เซอร์และแสดงได้เพียงพฤติกรรม ทุกอย่างในบทนี้เป็นข้อเสนอเพื่อการสร้าง แพ็กเกจ คลาส ตาราง endpoint เหตุการณ์ และชื่อการทดสอบด้านล่างยังไม่มีอยู่จริง เทคโนโลยีมาจาก ADR ที่อนุมัติแล้วใน `docs/adr/` ซึ่งบทนี้นำมาใช้และไม่เปิดประเด็นใหม่

## วัตถุประสงค์ ขอบเขต และการสอบย้อน {#prj-purpose}

บทนี้ออกแบบโมดูล Projects ของระบบจริง และตอบบททะเบียนโครงการใน SRS โมดูลนี้มีขนาดเล็ก ทำหน้าที่เชื่อมระเบียนที่โมดูลอื่นเป็นเจ้าของ ให้รหัสที่คงอยู่แก่แต่ละโครงการ แลกเปลี่ยนข้อมูลกับระบบ PM ของหน่วยงาน และกำกับการแชร์ข้อมูล

สิ่งที่อยู่นอกบทนี้ ได้แก่ `budget` เป็นเจ้าของรายการจัดสรร การโอน งวดเงิน คำขอ และเงินกัน `procurement` เป็นเจ้าของแผน แฟ้ม สัญญา และการตรวจรับ `finance` เป็นเจ้าของการจ่ายเงิน ก่อหนี้อื่น และ GFMIS และ `platform` เป็นเจ้าของบทบาท เส้นทางอนุมัติ Audit งาน และสถานะการเชื่อมต่อ

| กลุ่มใน SRS | ข้อกำหนด | หัวข้อการออกแบบ | แพ็กเกจหลัก |
| --- | --- | --- | --- |
| กฎธุรกิจ | BR-PRJ-01 ถึง BR-PRJ-18 | แบบจำลองโดเมน | ทั้งหมด |
| ทะเบียนโครงการ | PRJ-FR-001 ถึง PRJ-FR-011 | แบบจำลองโดเมน การออกแบบข้อมูล | `registry` |
| วงจร 8 ขั้น | PRJ-FR-012 ถึง PRJ-FR-017 | พฤติกรรมเชิงพลวัต | `cycle` |
| ตัวเลขของโครงการ | PRJ-FR-018 ถึง PRJ-FR-022 | แบบจำลองโดเมน | `cycle` |
| Project 360 | PRJ-FR-023 ถึง PRJ-FR-029 | องค์ประกอบ การออกแบบส่วนเชื่อมต่อ | `web`, `cycle` |
| การส่งออก | PRJ-FR-030 ถึง PRJ-FR-040 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `exchange` |
| การรับเข้า | PRJ-FR-041 ถึง PRJ-FR-047 | พฤติกรรมเชิงพลวัต การออกแบบส่วนเชื่อมต่อ | `exchange` |
| การแชร์ข้อมูล | PRJ-FR-048 ถึง PRJ-FR-055 | สถานะและการเปลี่ยนสถานะ การออกแบบความมั่นคงปลอดภัย | `sharing` |
| พื้นที่ทำงาน | PRJ-FR-056 ถึง PRJ-FR-059 | องค์ประกอบ | `exchange`, `sharing` |
| แผนผังโมดูลและหน้าที่ | PRJ-FR-060 ถึง PRJ-FR-062 | องค์ประกอบ | `tormap` |
| ค่าตั้ง | PRJ-FR-063 ถึง PRJ-FR-065 | แบบจำลองโดเมน | `settings` |
| ความต้องการด้านข้อมูล | PRJ-DR-001 ถึง PRJ-DR-008 | การออกแบบข้อมูล | ทั้งหมด |
| ความต้องการด้านการเชื่อมต่อ | PRJ-IR-001 ถึง PRJ-IR-009 | การออกแบบส่วนเชื่อมต่อ | `api`, `exchange`, `sharing` |
| ความต้องการที่ไม่ใช่ฟังก์ชัน | PRJ-NFR-001 ถึง PRJ-NFR-005 | การออกแบบที่ไม่ใช่ฟังก์ชัน | ทั้งหมด |
| ข้อจำกัด | PRJ-CR-001 ถึง PRJ-CR-005 | ภาพรวมการออกแบบ | ทั้งหมด |
| ประเด็นที่ยังเปิด | OI-PRJ-01 ถึง OI-PRJ-18 | ช่องว่างที่ทราบและประเด็นค้าง | ทั้งหมด |

## ภาพรวมการออกแบบและการตัดสินใจ {#prj-decisions}

Projects อยู่เหนือเส้นทางการเงิน `budget` `procurement` และ `finance` ไม่รับรู้ถึงโมดูลนี้ (PRJ-CR-001) และมีเพียง `review` ที่อ่านจากโมดูลนี้ โมดูลมี aggregate ของตนเองเพียงไม่กี่ตัว และอ่านข้อมูลที่เหลือจากโมดูลอื่น

| การตัดสินใจ | เหตุผล | ทางเลือกที่ไม่ใช้ | ที่มา |
| --- | --- | --- | --- |
| เก็บรหัสโครงการและเชื่อมกับระเบียนต้นทางด้วยแถว `project_link` | รหัสที่สร้างจากระเบียนต้นทางอยู่รอดไม่ได้เมื่อคำขอกลายเป็นรายการจัดสรร (PRJ-FR-002) ต้นแบบทำเช่นนั้น รหัสจึงไม่ต่อเนื่องตลอดวงจร | คำนวณรหัสทุกครั้งที่อ่านตามต้นแบบ | PRJ-DR-001, BR-PRJ-01 |
| ตัวเลขคำนวณจากส่วนเชื่อมต่อของเจ้าของ และเก็บแคชใน `project_summary` ที่สร้างใหม่ได้ | รายการหลายโครงการเรียกสามโมดูลต่อแถวไม่ได้ และแคชไม่ใช่ข้อมูลต้นทาง | อ่านสดทุกครั้ง หรือเก็บตัวเลขเป็นข้อมูลของทะเบียน | BR-PRJ-02, PRJ-DR-002, XC-DAT-001 |
| ขั้นเป็นฟังก์ชันล้วน `StepPolicy` ไม่มี state machine | ขั้นสะท้อนโมดูลอื่นและถอยได้ และไม่มีคำสั่งใดเลื่อนขั้นโดยตรง | เก็บขั้นพร้อมการเปลี่ยนสถานะ ซึ่งอาจคลาดเคลื่อน | BR-PRJ-03, PRJ-FR-013 |
| เปรียบเทียบ 12 รายการเป็นค่ามาตรฐานที่ไม่ขึ้นกับภาษา | ต้นแบบเปรียบเทียบข้อความที่แสดงผล การสลับภาษาจึงดูเหมือนข้อมูลเปลี่ยน | คำนวณ hash จากฟิลด์ที่แสดงผล | PRJ-DR-005, OI-PRJ-14 |
| การส่งเริ่มจากเหตุการณ์และทำงานบนเส้นทาง delivery ของบท Integration | การส่งต้องผ่านช่วงปลายทางล่ม ลองใหม่ได้อย่างปลอดภัย และไม่ต้องมีผู้ใช้สั่ง | ปุ่มส่งเป็นทางหลัก หรืองาน batch รายคืน | ADR-0008, PRJ-FR-035, XC-INT-004 |
| ข้อความจากระบบ PM เป็นระเบียนพร้อมงาน และไม่เรียกโมดูลล่าง | BR-PRJ-13 ให้การเปลี่ยนแปลงเงินทุกอย่างอยู่ใต้กฎของเจ้าของ และการพึ่งพาเป็นทางเดียว | นำข้อความต้นทุนไปปรับยอดก่อหนี้โดยตรง | BR-PRJ-13, ADR-0002 |
| ผู้รับข้อมูลเป็นระเบียนที่มีวงจรชีวิต ค่าตั้งของหน่วยงานเก็บเพียงชื่อเรียก | คำขอ การตัดสินใจ และการยุติต้องมีประวัติ ซึ่งไฟล์ค่าตั้งเก็บไม่ได้ | `consumers` เป็นค่าตั้งตามต้นแบบ | PRJ-FR-053, PRJ-FR-055 |
| การแชร์ภายนอกใช้ `ApprovalRoutes` โดยเส้นทางเริ่มต้นไปที่ผู้บริหาร | ผู้อนุมัติต่างกันตามหน่วยงาน และ Platform มีเส้นทางและการมอบอำนาจอยู่แล้ว | กำหนดบทบาทในโค้ด | PLT-FR-062, BR-PRJ-14 |
| ทะเบียนการส่งเพิ่มได้อย่างเดียวที่ระดับฐานข้อมูล | กฎที่อยู่เฉพาะในแอปพลิเคชันถูกข้ามได้ | ตารางทั่วไปที่ไม่มีหน้าจอลบ | BR-PRJ-15, PRJ-DR-003 |

## องค์ประกอบ {#prj-components}

Projects คือโมดูล Spring Modulith ชื่อ `projects` เปิดเผยเฉพาะ `api` และ `api.events` แพ็กเกจอื่นทั้งหมดเป็นภายใน (ADR-0002)

{{fig:prj-component | องค์ประกอบของโมดูล projects และโมดูลข้างเคียง}}

> [!NOTE] รายการแพ็กเกจ ชื่อส่วนเชื่อมต่อ และชื่อเมธอดในหัวข้อนี้เป็นข้อเสนอ

### แพ็กเกจภายใน {#prj-packages}

| แพ็กเกจ | หน้าที่ | คลาสหลัก |
| --- | --- | --- |
| `web` | REST controller การแปลงเป็น Problem Details และข้อมูลหน้า Project 360 | `ProjectController`, `PmController`, `ShareController` |
| `registry` | โครงการ ลิงก์ และการออกรหัส | `Project`, `ProjectLink`, `ProjectNumbers` |
| `cycle` | 8 ขั้น ตัวเลข เส้นเวลา และการอ่านโมดูลเจ้าของ | `CycleCatalogue`, `StepPolicy`, `ProjectFigures`, `TimelineReader` |
| `exchange` | สถานะการส่ง ข้อมูลที่ส่ง port ของ adapter และข้อความรับเข้า | `ExchangeRecord`, `OutboundPayload`, `ProjectSystemGateway`, `PmMessage` |
| `sharing` | ผู้รับข้อมูล คำขอ ทะเบียนการส่ง และชุดข้อมูล | `DataConsumer`, `ShareRequest`, `SendLog`, `DataSetBuilder` |
| `tormap` | แผนผังโมดูลและหน้าที่ซึ่งเป็นทางเลือก | `ModuleMap` |
| `settings` | ค่าตั้งของหน่วยงานและช่วงที่อนุญาต | `RegistrySettings`, `SettingRange` |
| `reporting` | projection ของรายการที่สร้างใหม่ได้ | `ProjectSummaryProjector` |

### ส่วนเชื่อมต่อที่เปิดเผย {#prj-published}

| ส่วนเชื่อมต่อ | ผู้ใช้ | วัตถุประสงค์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `ProjectLookup` | `review` | `byId` `byLine` `summaries(filter)` คืนรหัส ลิงก์ ขั้น และตัวเลขแบบอ่านอย่างเดียว (ชื่อตามที่ Review ขอ REV-IR-004) | PRJ-IR-009, REV-IR-004 |
| เหตุการณ์ใน `api.events` | ทุกโมดูล และ RabbitMQ ผ่าน outbox | รายการเหตุการณ์ในหัวข้อส่วนเชื่อมต่อ | ADR-0008 |
| `InterfaceReporter` (SPI) | `platform` | `projects` ติดตั้ง SPI ของ Platform สำหรับ adapter PM | PRJ-IR-007, PLT-IR-006 |
| `RetentionHold` (SPI) | `platform` | `projects` ติดตั้งสำหรับข้อความและทะเบียนการส่ง | PRJ-DR-008 |

### การพึ่งพาโมดูลอื่น {#prj-dependencies}

| โมดูล | ส่วนเชื่อมต่อที่ต้องการ | ใช้เพื่อ | ข้อกำหนด |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `AuditLog`, `Notifier`, `WorkItems`, `ApprovalRoutes` | tenant สิทธิ์ Audit การแจ้งเตือน งาน และการอนุมัติการแชร์ | PRJ-NFR-001, PRJ-FR-042, BR-PRJ-14 |
| `platform` | `FiscalCalendar`, `UnitDirectory`, `SubjectDirectory`, `RetentionRegistry` | ปีงบประมาณ ผู้รับผิดชอบขั้น ชื่อบุคคล และการเก็บรักษา | PRJ-CR-004, BR-PRJ-16 |
| `budget` | `BudgetRequestQuery`, `AllocationQuery`, `BudgetReadModel` | รายการจัดสรร การโอน งวดเงิน คำขอ เงินกัน ยอดเบิกจ่าย GFMIS รายรายการ และคำขอที่เป็นต้นทางของรายการ | PRJ-IR-001, PRJ-FR-026 |
| `procurement` | `ContractLookup` และ query ใหม่ตามรายการจัดสรร | รายการในแผน แฟ้ม ขั้น e-GP สัญญา งวดงาน | PRJ-IR-002 |
| `finance` | `LinePaymentQuery` | ก่อหนี้อื่น ยอดจ่าย เวลาของข้อมูล GFMIS ล่าสุด สถานะสอบทาน | PRJ-IR-003 |

> [!OPEN] Budget ตอบ query รายการจัดสรรด้วย `AllocationQuery` และ `BudgetReadModel` และ Finance ตอบด้วย `LinePaymentQuery` ส่วน query ของ Procurement ตามรายการจัดสรรยังเป็นคำขอ ผู้เขียนบท Procurement ต้องยืนยันหรือเปลี่ยนแปลง (DG-PRJ-01) บทนี้ยืนยันแถวของ `projects` ในตารางการพึ่งพาของบท Modules ว่าพึ่งพา `platform` `budget` `procurement.api` และ `finance.api` และมีเพียง `review` ที่พึ่งพาโมดูลนี้

## แบบจำลองโดเมน {#prj-domain}

คลาสโดเมนเป็น Java ธรรมดาที่ไม่ import Spring หรือ JPA ตัวเลขเป็น value object ที่สร้างเมื่ออ่าน และไม่บันทึกเป็นข้อมูลของทะเบียน

{{fig:prj-class | Aggregate ของ projects และส่วนประกอบ}}

> [!NOTE] Aggregate ชื่อคลาส และรหัสข้อผิดพลาดในหัวข้อนี้เป็นข้อเสนอ

### Aggregate และเงื่อนไขคงที่ {#prj-aggregates}

| Aggregate | ส่วนประกอบ | เงื่อนไขคงที่ |
| --- | --- | --- |
| `Project` | `ProjectLink` | หนึ่งเลขต่อหนึ่งโครงการและไม่ใช้ซ้ำ มีลิงก์อย่างน้อยหนึ่ง และระเบียนต้นทางหนึ่งระเบียนเชื่อมกับโครงการเดียว |
| `ExchangeRecord` | ไม่มี | หนึ่งแถวต่อโครงการในขอบเขต มี delivery ที่ยังทำงานได้ไม่เกินหนึ่ง และเป็น `sent` เมื่อระบบ PM รับแล้วเท่านั้น |
| `PmMessage` | ไม่มี | หนึ่งแถวต่อ `message_id` รับทราบครั้งเดียว และไม่มีผลต่อเงิน |
| `DataConsumer` | `ShareRequest` | ผู้รับภายนอกใช้งานได้จากคำขอที่อนุมัติเท่านั้น และผู้รับที่ยุติแล้วรับการส่งไม่ได้ |
| `SendLog` | แถว | เพิ่มแถวได้อย่างเดียว |
| `RegistrySettings`, `ModuleMap` | ไม่มี | ค่าอยู่ใน `SettingRange` และ `prefix` ล็อกเมื่อออกรหัสแรก |

### Value object และ enumeration {#prj-values}

| ชนิด | ค่า | หมายเหตุ |
| --- | --- | --- |
| `ProjectNumber` | prefix ปี เลขลำดับ | รูปแบบตาม PRJ-FR-001 ปีคือปีงบประมาณแรกและไม่เปลี่ยน (OI-PRJ-01) |
| `SourceType` | `request`, `line`, `carry` | ชนิดของ `ProjectLink` |
| `CycleStep` | 1 ถึง 8 | ชื่อและผู้รับผิดชอบอยู่ใน `CycleCatalogue` ไม่มีเลขโมดูล (PRJ-CR-005) |
| `BudgetKind` | `single`, `multi`, `carry` | PRJ-FR-009 |
| `WorkType` | `construction`, `goods`, `service`, `consult`, `routine` | PRJ-FR-010 |
| `ExchangeState` | `new`, `queued`, `sent`, `changed`, `failed` | การออกแบบนี้เพิ่ม `failed` |
| `Dimension` | `time`, `cost`, `quality`, `status` | PRJ-FR-041 |
| `ConsumerKind`, `ConsumerStatus` | `int`, `ext`; `pending`, `active`, `ended` | การออกแบบนี้เพิ่ม `ended` |

ข้อมูลมาตรฐานเก็บรหัสและจำนวนเงิน ข้อมูลเดียวกันจึงให้ hash เดียวกันในทุกภาษา

```java
// Proposal. Codes and numbers only; display text is never hashed.
public record OutboundPayload(ProjectNumber id, String gfmisCode, LocalizedName name, Target target,
                              BigDecimal annualAmount, BudgetKind kind, int fiscalYear, UUID unitId,
                              WorkType workType, AreaCode area, AllotmentState allotment,
                              BigDecimal allotmentReceived) {
    public String canonicalHash() { return Sha256.of(CanonicalJson.write(this)); }
}
```

### ตำแหน่งที่บังคับใช้กฎธุรกิจ {#prj-rule-map}

เซิร์ฟเวอร์บังคับใช้ทุกกฎด้านล่าง หน้าจออาจตรวจซ้ำเพื่อช่วยผู้ใช้ แต่ไม่ถือเป็นการควบคุม (ADR-0006)

| กฎ | เรื่อง | บังคับใช้ที่ | รหัสข้อผิดพลาด |
| --- | --- | --- | --- |
| BR-PRJ-01 | รหัสเดียว ไม่ใช้รหัส GFMIS | `ProjectNumbers.next`, `Project.link` | `PRJ_LINK_CONFLICT` |
| BR-PRJ-02 | ไม่มีสำเนาที่สอง | `ProjectFigures` และการทดสอบว่าไม่มีคำสั่งเขียนตัวเลข | ไม่มี |
| BR-PRJ-03 | ขั้นปัจจุบัน | `StepPolicy.of` | ไม่มี คำนวณ |
| BR-PRJ-04 | วงเงินรายปี | `ProjectFigures.annual` | ไม่มี คำนวณ |
| BR-PRJ-05 | ยอดก่อหนี้ | `ProjectFigures.committed` จากบัญชีคุมรายการ | ไม่มี คำนวณ |
| BR-PRJ-06 | ยอดเบิกจ่าย | `ProjectFigures.paid` | ไม่มี คำนวณ |
| BR-PRJ-07 | รายจ่ายประจำ | `ProjectFigures.routine` | ไม่มี คำนวณ |
| BR-PRJ-08 | ขอบเขตการแลกเปลี่ยน | `ExchangeScope.includes` | ไม่มี กรอง |
| BR-PRJ-09 | เจ้าของข้อมูล | `exchange` ไม่มีคำสั่งบันทึกความก้าวหน้า (PRJ-CR-003) | ไม่มี |
| BR-PRJ-10 | การตรวจการเปลี่ยนแปลง | `ExchangeRecord.markChanged` | ไม่มี |
| BR-PRJ-11 | ปลายทางล่ม | เส้นทาง delivery ของบท Integration | ไม่มี แสดงสถานะ |
| BR-PRJ-12 | ไม่เป็นปัจจุบัน | `StaleCheck` งานรายวัน | ไม่มี เพิ่มรายการผิดปกติ |
| BR-PRJ-13 | ผลของข้อความ | `PmMessage.acknowledge` | `PRJ_STATE_CONFLICT` |
| BR-PRJ-14 | การอนุมัติภายนอก | `DataConsumer.approve` | `PRJ_REASON_REQUIRED`, `PRJ_SOD_BLOCKED` |
| BR-PRJ-15 | ทะเบียนการส่ง | `SendLog.add` สิทธิ์ฐานข้อมูลและ trigger | `PRJ_LOG_IMMUTABLE` |
| BR-PRJ-16 | ผู้รับผิดชอบขั้น | `CycleCatalogue.owner` with `UnitDirectory` | ไม่มี |
| BR-PRJ-17 | เวลาข้อมูล GFMIS | `ProjectFigures.gfmisAsOf` คัดลอกไปยังแต่ละแถวในทะเบียนการส่ง | ไม่มี |
| BR-PRJ-18 | ค่าของหน่วยงาน | `RegistrySettings` และกฎ ArchUnit ห้ามแยกทางตามหน่วยงาน | `PRJ_SETTING_OUT_OF_RANGE` |

### ขีดจำกัดในโค้ดและค่าตั้งของหน่วยงาน {#prj-limits}

โมดูลนี้ไม่มีขีดจำกัดตามกฎหมาย `LegalRuleSet` จึงไม่มีรายการในส่วนนี้ (OI-PRJ-06) ตารางค่าตั้งใน SRS ระบุค่าทุกค่าของหน่วยงาน ค่าตั้งของต้นแบบย้ายมาดังนี้

| ค่าตั้ง | ช่วงในโค้ด | ค่าเริ่มต้น | กลายเป็น |
| --- | --- | --- | --- |
| `prefix` | ตัวพิมพ์ใหญ่หรือตัวเลข 2 ถึง 6 ตัว (ข้อเสนอ) | `PRJ` | `registry_setting` |
| `staleDays` | ตั้งแต่ 1 ขึ้นไป (ข้อเสนอ) | 14 | `registry_setting` |
| `pmName`, `pmShort`, `pmRef`, `hubName`, `aiName`, `pmNote` | ข้อความสองภาษา | ชื่อกลาง | `registry_setting` |
| `pmScope` | กฎ: รายการงบลงทุน หรือรายการที่ระบุ | รายการงบลงทุน | `registry_setting` และ `project.exchange_scope` |
| `multi` | ไม่มี | ไม่มี | อ่านจาก `budget` |
| `loc` | ไม่มี | ไม่มี | `project.area` `project.target` |
| `consumers` | ไม่มี | ไม่มี | `data_consumer` |
| `modules`, `duties` | ไม่มี | ไม่มี | `tor_module`, `tor_duty` |
| `userUnits`, `feed` | ไม่มี | ไม่มี | ไม่ย้ายมา |

## สถานะและการเปลี่ยนสถานะ {#prj-states}

ขั้นของวงจรไม่มี state machine วงจรชีวิตสองชุดด้านล่างเป็น enum พร้อมตารางการเปลี่ยนสถานะตามแนวทางของ ADR-0007 ส่วนข้อความจากระบบ PM มีเพียงรับแล้วและรับทราบแล้ว

### สถานะการส่ง {#prj-state-exchange}

{{fig:prj-state-exchange | สถานะการส่งของโครงการไปยังระบบ PM}}

| จาก | ไป | เหตุ | เงื่อนไข | สถานะ delivery |
| --- | --- | --- | --- | --- |
| (ไม่มี) | new | โครงการเข้าขอบเขต | BR-PRJ-08 | ไม่มี |
| new, changed | queued | อนุมัติงวดเงิน รายการเปลี่ยน หรือเจ้าหน้าที่สั่งส่ง | ไม่มี delivery ที่ทำงานอยู่ของโครงการ | `pending`, `sending`, `retrying` |
| queued | sent | ระบบ PM รับแล้ว | hash ของ delivery เท่ากับ hash ปัจจุบัน | `delivered` |
| queued | changed | ระบบ PM รับข้อมูลรุ่นเก่า | hash ต่างกัน | `delivered` |
| sent | changed | รายการเปลี่ยน | BR-PRJ-10 | ไม่มี |
| queued | failed | ถูกปฏิเสธ หรือครบจำนวนครั้ง | กฎของบท Integration | `failed` |
| failed | queued | เจ้าหน้าที่สั่งส่งใหม่ | `prj.exchange.run` | delivery เดิม กุญแจเดิม |

> [!NOTE] delivery ที่ล้มเหลวจะสร้างงานให้เจ้าหน้าที่และรายการผิดปกติ ช่วงปลายทางล่มไม่นับจำนวนครั้ง โครงการจึงอยู่ที่ queued ซึ่งคือการพักในคิวตาม PRJ-FR-038

### ผู้รับข้อมูล {#prj-state-consumer}

{{fig:prj-state-consumer | สถานะของผู้รับข้อมูล}}

| จาก | ไป | คำสั่ง | เงื่อนไข | ผล |
| --- | --- | --- | --- | --- |
| (ไม่มี) | pending | `DataConsumer.request` | ภายนอก และมีเหตุผล | `ApprovalRoutes.start` |
| (ไม่มี) | active | `DataConsumer.register` | ภายใน | ไม่มี |
| pending | active | `DataConsumer.approve` | ผู้อนุมัติไม่ใช่ผู้ขอ และมีเหตุผลอย่างน้อย 10 ตัวอักษร | เพิ่มแถวในทะเบียน และเข้าคิวส่งครั้งแรก |
| pending | ended | `DataConsumer.refuse` | มีเหตุผล | ปิดคำขอ |
| active | ended | `DataConsumer.end` | `prj.share.approve` และมีเหตุผล | ไม่มีการส่งอีก |

## พฤติกรรมเชิงพลวัต {#prj-dynamic}

### การหาขั้นปัจจุบัน {#prj-activity}

`StepPolicy` รับแหล่งของโครงการและข้อเท็จจริงจากโมดูลเจ้าของ แล้วคืนขั้น โดยรวม BR-PRJ-03 ไว้ที่เดียว พร้อมเงื่อนไขการตรวจรับตาม PRJ-FR-014 และการลงนามตาม PRJ-FR-019

{{fig:prj-activity-step | การหาขั้นปัจจุบันของโครงการ}}

### การเกิดของโครงการ {#prj-linking}

ทะเบียนรับเหตุการณ์จากโมดูลเจ้าของ และไม่มีคำสั่งสร้างโครงการด้วยมือ

- คำของบใหม่สร้างโครงการและลิงก์ `request` (ขึ้นกับ OI-PRJ-01)
- รายการจัดสรรที่ยืนยันแล้วและระบุคำขอจะเพิ่มลิงก์ `line` ให้โครงการนั้น รายการที่ไม่มีคำขอจะสร้างโครงการใหม่
- เงินกันที่ระบุรายการจัดสรรจะเพิ่มลิงก์ `carry` ให้โครงการเดียวกัน
- แต่ละเหตุการณ์จะปรับ `project_summary` และอาจเข้าคิวการแลกเปลี่ยน

> [!NOTE] ตารางของ Budget มี `allocation_line.request_id` และ `carry_over.line_id` ซึ่งการเชื่อมนี้ต้องใช้ แต่ต้นแบบยังไม่มีทั้งสองช่อง หากไม่มีเลขอ้างอิง โครงการจะเริ่มใหม่ และต้องมีวิธีให้บุคคลเชื่อมเอง (DG-PRJ-02)

### การส่งเมื่อข้อมูลเปลี่ยน {#prj-seq-exchange}

{{fig:prj-seq-exchange | การส่งข้อมูลโครงการให้ระบบ PM เมื่อข้อมูลเปลี่ยน}}

- ตัวรับเหตุการณ์ของ `budget` และ `procurement` สร้างข้อมูลใหม่ หาก hash ไม่เปลี่ยนจะหยุด การโอนที่ไม่กระทบ 12 รายการจึงไม่ส่งข้อมูล
- แต่ละโครงการมี delivery ทำงานครั้งละหนึ่งรายการ และอ่านข้อมูลล่าสุดเมื่อเริ่มส่ง การเปลี่ยนแปลงถี่ ๆ จึงรวมเป็นการส่งครั้งเดียว
- การเว้นช่วง circuit breaker และ timeout เป็นไปตามบท Integration รายการเก่าสุดส่งก่อน (PRJ-FR-039)
- เจ้าหน้าที่ยังกดส่งโครงการที่ใหม่ ข้อมูลเปลี่ยน หรือล้มเหลวได้ โดยใช้เส้นทางเดียวกัน (PRJ-FR-036)

### การรับข้อมูลจากระบบ PM {#prj-seq-inbound}

{{fig:prj-seq-inbound | การรับข้อมูลจากระบบ PM}}

- ข้อความที่ `message_id` ซ้ำจะได้ 202 และไม่เปลี่ยนแปลงสิ่งใด (PRJ-IR-006)
- การรับทราบจะปิดงาน และไม่เรียกโมดูลล่าง (BR-PRJ-13) หน้าข้อความเชื่อมไปยังการแก้ไขสัญญาในงานจัดซื้อหรือเงินกันในงบประมาณ เพื่อให้ผู้ใช้ดำเนินการที่นั่น
- ความก้าวหน้าบน Project 360 มาจากข้อความที่เก็บไว้ (PRJ-FR-047)

### การอนุมัติการแชร์ภายนอก {#prj-seq-share}

{{fig:prj-seq-share | การอนุมัติและส่งข้อมูลให้ผู้รับภายนอก}}

การส่งครั้งต่อไปจะเพิ่มแถวในทะเบียนพร้อมเวลาข้อมูล GFMIS ล่าสุด ส่วนการส่งแต่ละครั้งต้องอนุมัติใหม่หรือไม่เป็นประเด็น OI-PRJ-05 ระหว่างนี้การอนุมัติครอบคลุมการส่งชุดข้อมูลเดิมครั้งต่อไป ตามที่โค้ดทำ

### งานตามกำหนดเวลา {#prj-jobs}

| งาน | หน้าที่ | ข้อกำหนด |
| --- | --- | --- |
| ตรวจความเป็นปัจจุบัน | รายวัน ระบุโครงการที่ไม่มีการปรับปรุงจากระบบ PM เกิน `staleDays` และเพิ่มรายการผิดปกติ | BR-PRJ-12, PRJ-FR-057 |
| สร้าง summary ใหม่ | รายคืน เทียบ `project_summary` กับเจ้าของและแก้ความต่าง | PRJ-DR-002, PRJ-NFR-002 |
| การแชร์ตามรอบ | ส่งชุดข้อมูลของผู้รับที่ใช้งานอยู่ตามรอบ โดยผู้ส่งเป็นระบบ | PRJ-IR-008 |
| การเก็บรักษา | ใช้ตารางเก็บรักษาตาม ADR-0014 | PRJ-DR-008 |

## การออกแบบข้อมูล {#prj-data}

ตารางอยู่ในสคีมา `projects` ของคลัสเตอร์ PostgreSQL ประจำ cell (ADR-0005) โมดูลอื่นไม่อ่านตารางเหล่านี้โดยตรงแต่ใช้ `projects.api` กฎของทุกตารางในบท Procurement มีผลเช่นกัน ได้แก่ `tenant_id` เป็นคอลัมน์แรกของทุกคีย์ row-level security แบบบังคับ คอลัมน์ร่วม และ migration แบบ expand and contract

> [!NOTE] ตาราง คอลัมน์ และดัชนีทั้งหมดในหัวข้อนี้เป็นข้อเสนอ `source_id` ใน `project_link` เป็นการอ้างอิงเชิงตรรกะ ไม่มี foreign key ข้ามสคีมา

{{fig:prj-er | ตารางหลักของ projects}}

### ตาราง {#prj-data-tables}

Class คือชั้นข้อมูลตาม ADR-0013 ส่วน Retention key คือรายการในตารางเก็บรักษาตาม ADR-0014 ไม่ระบุระยะเวลาเพราะ OI-PRJ-08 ยังเปิดอยู่

| ตาราง | คอลัมน์หลัก | Class | Retention key | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `project` | `project_no`, `first_fy`, `name`, `unit_id`, `area`, `target`, `exchange_scope`, `ended_at` | Internal | `prj.project` | PRJ-DR-001, PRJ-FR-001 to PRJ-FR-003 |
| `project_link` | `project_id`, `source_type`, `source_id`, `fiscal_year`, `linked_at` | Internal | `prj.project` | PRJ-DR-001 |
| `project_number` | `fiscal_year`, `last_no` | Internal | `prj.config` | PRJ-FR-003 |
| `project_summary` | `project_id`, `step`, `amount`, `base_amount`, `committed`, `paid`, `routine`, `gfmis_as_of`, `refreshed_at` | Internal | สร้างใหม่ได้ | PRJ-DR-002, PRJ-FR-005 |
| `exchange_record` | `project_id`, `state`, `last_hash`, `last_sent_at`, `delivery_id` | Internal | `prj.exchange` | PRJ-FR-032, PRJ-DR-005 |
| `delivery` | ตามบท Integration | Internal | `prj.exchange` | PRJ-IR-005 |
| `pm_message` | `message_id`, `project_id`, `dimension`, `text`, `days`, `amount`, `effect`, `received_at`, `acknowledged_at`, `acknowledged_by_ref` | Confidential | `prj.exchange` | PRJ-DR-006, PRJ-FR-041 to PRJ-FR-046 |
| `data_consumer` | `kind`, `name`, `data_sets`, `channel`, `status`, `schedule` | Internal | `prj.share` | PRJ-FR-048 |
| `share_request` | `consumer_id`, `asked_by_ref`, `why`, `decided_by_ref`, `reason`, `status` | Confidential | `prj.share` | PRJ-FR-051 to PRJ-FR-054 |
| `send_log` | `consumer_id`, `sent_at`, `rows`, `gfmis_as_of`, `sent_by_ref`, `approved_by_ref`, `reason`, `file_key` | Confidential | `prj.share` | PRJ-DR-003, PRJ-DR-004 |
| `registry_setting` | `key`, `value`, `effective_from` | Internal | `prj.config` | PRJ-FR-063, PRJ-FR-064 |
| `tor_module`, `tor_duty` | `no`, `name`, `status`, `ref`, `page`; `group`, `name`, `modules`, `external_flag` | Internal | `prj.config` | PRJ-FR-060, PRJ-FR-061 |
| `outbox_event`, `inbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | สั้น กำหนดร่วมกับ platform | ADR-0008, XC-API-005 |

```sql
-- Proposal: the send log takes rows and gives them up to no one.
REVOKE UPDATE, DELETE, TRUNCATE ON projects.send_log FROM app_role;
CREATE TRIGGER send_log_append_only BEFORE UPDATE OR DELETE ON projects.send_log
  FOR EACH ROW EXECUTE FUNCTION projects.refuse_change();
```

### ฟิลด์ข้อมูลส่วนบุคคลและข้อมูลจำกัด {#prj-data-fields}

ทะเบียนไม่มีข้อมูลชั้น Restricted ตารางนี้ส่งต่อให้พจนานุกรมข้อมูล (ADR-0014) เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลต้องยืนยันฐานทางกฎหมายของแต่ละฟิลด์

| ฟิลด์ | Class | การคุ้มครอง | กฎ |
| --- | --- | --- | --- |
| คอลัมน์ `*_ref` | Confidential | อ้างอิงแบบนามแฝง | รายงานแสดงตัวแทนหลังการลบ (ADR-0015) |
| `share_request.why`, `send_log.reason`, `pm_message.text` | Confidential | เข้าถึงตามบทบาท ไม่เข้าระบบค้นหา | ข้อความอิสระอาจมีชื่อบุคคล |
| ชื่อผู้ขายบน Project 360 | Confidential | อ่านผ่าน `ContractLookup` และไม่เก็บที่นี่ | DG-PRJ-03 |
| ไฟล์ใน `send_log.file_key` | ตามชุดข้อมูล | เก็บใน S3 ด้วยกุญแจของหน่วยงาน (ADR-0010) | PRJ-DR-007 |

## การออกแบบส่วนเชื่อมต่อ {#prj-interfaces}

REST API อธิบายด้วย OpenAPI 3.1 และเหตุการณ์อธิบายด้วย AsyncAPI ค่า tenant มาจาก token และไม่รับจาก path คำขอที่เปลี่ยนสถานะต้องมี `If-Match` พร้อมเวอร์ชันของ aggregate

### REST endpoint {#prj-rest}

> [!NOTE] รายการ endpoint นี้เป็นข้อเสนอ path อ้างอิงจาก `/api/v1/projects`

| Method และ path | วัตถุประสงค์ | สิทธิ์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `GET /cycle` | ขั้นพร้อมจำนวน วงเงิน และผู้รับผิดชอบ | `prj.read` | PRJ-FR-012 to PRJ-FR-017 |
| `GET /register` | รายการ พร้อมตัวกรองปีงบประมาณและการค้นหา | `prj.read` | PRJ-FR-005 to PRJ-FR-007 |
| `GET /register/{id}` | Project 360: ตัวเลข เส้นเวลา การแลกเปลี่ยน | `prj.read` | PRJ-FR-023 to PRJ-FR-029 |
| `GET /pm/exchange`; `POST /pm/exchange/send` | สถานะการส่ง และส่งรายการที่ค้าง | `prj.read`, `prj.exchange.run` | PRJ-FR-032, PRJ-FR-036, PRJ-FR-037 |
| `POST /pm/messages` | ข้อความรับเข้า | client credentials ของระบบ PM ของหน่วยงาน | PRJ-FR-041, PRJ-IR-006 |
| `GET /pm/messages`; `POST /pm/messages/{id}/acknowledge` | แสดงรายการและรับทราบ | `prj.read`, `prj.exchange.ack` | PRJ-FR-043, PRJ-FR-044 |
| `GET, POST /consumers`; `POST /consumers/{id}/requests, send, end` | ผู้รับ คำขอ การส่ง และการยุติ | `prj.share.send`, `prj.share.approve` | PRJ-FR-048 to PRJ-FR-050, PRJ-FR-053, PRJ-FR-055 |
| `POST /share-requests/{id}/approve, refuse` | ตัดสินคำขอแชร์ | `prj.share.approve` | PRJ-FR-051, PRJ-FR-052, PRJ-FR-054 |
| `GET /send-log` | อ่านทะเบียน ไม่มีทางเขียน | `prj.read` | PRJ-DR-003 |
| `GET /module-map` | แผนผังโมดูลและหน้าที่ เมื่อหน่วยงานมี | `prj.read` | PRJ-FR-060 to PRJ-FR-062 |
| `GET, PUT /settings` | ค่าตั้งของทะเบียน | `prj.admin` | PRJ-FR-063, PRJ-FR-064 |

### รายการข้อผิดพลาด {#prj-errors}

| รหัส | HTTP | ความหมาย | ข้อกำหนด |
| --- | --- | --- | --- |
| `PRJ_REASON_REQUIRED` | 400 | ไม่มีเหตุผลหรือสั้นเกินไป | PRJ-FR-051, PRJ-FR-052 |
| `PRJ_FORBIDDEN` | 403 | ผู้ใช้ไม่มีสิทธิ์ | ADR-0006 |
| `PRJ_SOD_BLOCKED` | 403 | ผู้อนุมัติเป็นผู้ขอ | PRJ-FR-054 |
| `PRJ_NOT_FOUND` | 404 | ไม่พบระเบียน หรือเป็นของหน่วยงานอื่น | ADR-0005, PRJ-FR-011 |
| `PRJ_VERSION_CONFLICT` | 409 | ระเบียนเปลี่ยนหลังจากอ่าน | ADR-0005 |
| `PRJ_STATE_CONFLICT` | 409 | คำสั่งใช้กับสถานะปัจจุบันไม่ได้ | PRJ-FR-050 |
| `PRJ_LINK_CONFLICT` | 409 | ระเบียนต้นทางเชื่อมกับโครงการอื่นแล้ว | BR-PRJ-01 |
| `PRJ_LOG_IMMUTABLE` | 409 | ปฏิเสธการเปลี่ยนแปลงทะเบียนการส่ง | PRJ-DR-003 |
| `PRJ_UNKNOWN_PROJECT` | 422 | ข้อความจากระบบ PM ระบุรหัสที่ไม่รู้จัก | PRJ-IR-006 |
| `PRJ_SETTING_OUT_OF_RANGE` | 422 | ค่าตั้งอยู่นอกช่วงที่อนุญาต | PRJ-FR-064 |

### รายการเหตุการณ์ {#prj-events}

> [!NOTE] รายการเหตุการณ์นี้เป็นข้อเสนอ routing key ขึ้นต้นด้วย `projects.` ข้อมูลในเหตุการณ์มีเพียงเลขอ้างอิงและจำนวนเงิน ไม่มีข้อมูลส่วนบุคคล และผู้รับทิ้งรายการซ้ำด้วย `eventId` (ADR-0008)

| เหตุการณ์ | ผู้ออก | ฟิลด์เพิ่ม | ผู้รับ |
| --- | --- | --- | --- |
| `project.registered`, `project.linked` | `Project` | `projectNo`, `sourceType` | `reporting`, `review` |
| `project.step-changed` | `ProjectSummaryProjector` | `fromStep`, `toStep` | `review` |
| `exchange.queued`, `exchange.sent`, `exchange.failed` | `ExchangeRecord` | `deliveryId`, `hash` | adapter การแจ้งเตือน |
| `pm-message.received`, `pm-message.acknowledged` | `PmMessage` | `dimension` | การแจ้งเตือน |
| `share.requested`, `share.approved`, `share.sent`, `share.ended` | `DataConsumer`, `SendLog` | `consumerId`, `rows`, `gfmisAsOf` | adapter การแจ้งเตือนผู้ตรวจสอบ |

Projects รับเหตุการณ์ของงานจัดซื้อ ได้แก่ `contract.signed` `contract.changed` `contract.terminated` `phase.accepted` `phase.paid` `case.failed` `case.cancelled` และ `case.closed` และต้องการเหตุการณ์จาก `budget` สำหรับคำขอ รายการจัดสรร การโอน งวดเงิน และเงินกัน รวมทั้งจาก `finance` สำหรับการจ่ายเงินและการนำเข้า GFMIS บทของโมดูลเหล่านั้นเป็นผู้กำหนดชื่อ (DG-PRJ-01)

### Adapter ภายนอก {#prj-adapters}

| Adapter | Port | รุ่นแรก | พฤติกรรม | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| ส่งไประบบ PM | `ProjectSystemGateway` | มาตรฐานของ Fisko ผ่าน REST สำหรับหน่วยงานที่มีระบบ PM | ส่ง 12 รายการ โดยใช้ `delivery_id` เป็น idempotency key | PRJ-IR-004, PRJ-IR-005 |
| รับจากระบบ PM | `POST /pm/messages` | endpoint ของ Fisko ซึ่งระบบ PM เรียก | ตรวจผู้เรียก รหัสโครงการ และ `message_id` | PRJ-IR-006 |
| ผู้รับข้อมูล | `ShareChannel` | ไฟล์ใน S3 พร้อมลิงก์ลงนาม อ่านผ่าน API และหน้า portal ตามหน่วยงาน | สร้างชุดข้อมูลจาก `DataSetBuilder` และบันทึกการส่ง | PRJ-IR-008, PRJ-DR-004 |

> [!OPEN] ยังไม่มีข้อตกลงกับระบบ PM (OI-PRJ-03) และระบบ PM ของหน่วยงานอาจไม่รับมาตรฐานของ Fisko หากเป็นเช่นนั้น หน่วยงานนั้นต้องมี adapter ของตนเองภายใต้ `ProjectSystemGateway` ซึ่งเป็นต้นทุนที่เจ้าของผลิตภัณฑ์ต้องพิจารณา รายการ adapter ในบท Integration ระบุ port นี้เป็นข้อเสนอ และ OI-PRJ-10 ถือประเด็นรหัสการเชื่อมต่อ

## การออกแบบความมั่นคงปลอดภัย {#prj-security}

Keycloak ยืนยันตัวตนผู้ใช้ (ADR-0006) และเซิร์ฟเวอร์ตรวจบทบาททุกการกระทำ ทุกคำขอผูก tenant ทำให้ row-level security มีผล ระบบ PM ยืนยันตัวตนด้วย OIDC client credentials ต่อ adapter ตามข้อเสนอในบทการออกแบบร่วม และ client นี้เข้าถึงได้เฉพาะเส้นทางรับเข้า

### สิทธิ์ {#prj-authorities}

> [!NOTE] ชื่อสิทธิ์เป็นข้อเสนอ การจับคู่บทบาทกับสิทธิ์เป็นข้อมูลของหน่วยงาน และค่าเริ่มต้นนี้เป็นไปตาม SRS

| สิทธิ์ | บทบาทเริ่มต้น | อนุญาต |
| --- | --- | --- |
| `prj.read` | ทุกบทบาทของเจ้าหน้าที่ โดยจำกัดตามหน่วยงานสำหรับ `div` และ `divhead` | อ่านวงจร ทะเบียน Project 360 ข้อความ และทะเบียนการส่ง |
| `prj.exchange.run` | `plan`, `fin`, `admin` | ส่งและส่งใหม่ |
| `prj.exchange.ack` | `fin`, `finhead`, `proc`, `prochead` | รับทราบข้อความจากระบบ PM |
| `prj.share.send` | `plan`, `fin`, `admin` | ขอแชร์ และส่งให้ผู้รับที่ใช้งานอยู่ |
| `prj.share.approve` | `exec` | ตัดสินคำขอ และยุติผู้รับ |
| `prj.admin` | `admin` | ค่าตั้งของทะเบียน ทะเบียนผู้รับ และแผนผังโมดูล |

### การตรวจการแยกหน้าที่ {#prj-sod}

ทะเบียนกฎของ Platform ไม่มีกฎแยกหน้าที่สำหรับโมดูลนี้ `DataConsumer.approve` จึงตรวจบุคคลที่สอง เช่นเดียวกับที่บท Procurement ทำกับเอกสาร โดยผู้อนุมัติและผู้ที่ตนทำการแทนต้องไม่ใช่ผู้ขอ (PRJ-FR-054) การปฏิเสธบันทึกผ่าน `SodGuard` ส่วนจะกำหนดเป็นกฎมีเลขหรือไม่เป็นประเด็น DG-PRJ-04

### Audit และข้อมูลขาออก {#prj-audit}

- ทุกคำสั่งเขียนผ่าน `AuditLog` (PRJ-NFR-001) รายการมีเพียงเลขอ้างอิงและไม่มีข้อความอิสระ (ADR-0015) เหตุผลอยู่ในแถวข้อมูลธุรกิจ
- `DataSetBuilder` มีรายการชุดข้อมูลแบบปิด แต่ละชุดระบุฟิลด์ และการทดสอบจะปฏิเสธฟิลด์ข้อมูลส่วนบุคคลหากชุดนั้นยังไม่ได้รับอนุมัติ (PRJ-DR-007)
- การส่งออกไปได้เฉพาะปลายทางที่ระบุของแต่ละ adapter (บท Integration)
- ตัวควบคุมจำลองไม่มีในระบบจริง (PRJ-NFR-004)

## การออกแบบที่ไม่ใช่ฟังก์ชัน {#prj-nfr}

| ข้อกำหนด | คำตอบของการออกแบบ | ตรวจโดย |
| --- | --- | --- |
| PRJ-NFR-001 | aspect `CommandAudit` ในทุกคำสั่ง | การทดสอบ integration ต่อคำสั่ง |
| PRJ-NFR-002 | เหตุการณ์ปรับ `project_summary` และงานรายคืนแก้ความคลาดเคลื่อน | การทดสอบ scenario แบบจับเวลา |
| PRJ-NFR-003 | ไฟล์ข้อความสำหรับหน้าจอ และ `LocalizedName` ในข้อมูลที่ส่ง | Playwright ทั้งสองภาษา และการทดสอบข้อมูลที่ส่ง |
| PRJ-NFR-004 | test adapter อยู่เฉพาะโปรไฟล์ทดสอบ | การตรวจตอน build |
| PRJ-NFR-005 | `exchange` และ `sharing` ไม่ทำงานเมื่อไม่มี adapter หรือผู้รับ และเมนูไม่แสดง | `NoPmSystemIT` |

### ภาระงานและความพร้อมใช้งาน {#prj-nfr-load}

- รายการอ่าน `project_summary` แบบแบ่งหน้า (XC-API-009) ส่วน Project 360 เรียกส่วนเชื่อมต่อของเจ้าของสำหรับโครงการเดียว
- หากโมดูลล่างช้า รายการยังตอบจาก summary พร้อมแสดง `refreshed_at`
- เหตุการณ์จำนวนมากในช่วงวันที่ 30 กันยายนทำให้ summary และการแลกเปลี่ยนล่าช้าเท่านั้น และไม่ขวางคำสั่งของงบประมาณ จัดซื้อ หรือการเงิน เพราะไม่มีคำสั่งใดรอ `projects`

> [!OPEN] XC-PER-001 ถึง XC-PER-008 เป็นข้อเสนอ และไม่ได้ระบุปริมาณต่อหน่วยงานหรือจำนวนโครงการของโมดูลนี้ เจ้าของผลิตภัณฑ์ต้องยืนยัน (OI-XC-01) และระบุตัวเลขเหล่านั้นก่อนจึงจะตัดสินผลการทดสอบภาระงานได้ (DG-PRJ-05)

## การออกแบบการทดสอบ {#prj-tests}

Sweep ทดสอบเซิร์ฟเวอร์ไม่ได้ การเดินทดสอบรอบ 64 จึงกลายเป็นการทดสอบของระบบจริง ระดับการทดสอบเป็นไปตามบท Procurement ส่วนชื่อคลาสทดสอบเป็นข้อเสนอ

### จากการตรวจใน sweep สู่การทดสอบจริง {#prj-test-walks}

| การตรวจใน sweep | การทดสอบจริง | สิ่งที่เพิ่มจากเดิม | ข้อกำหนด |
| --- | --- | --- | --- |
| หน้าโครงการ | `project-360.spec` | แสดงทุกขั้น และลิงก์ข้ามโมดูล | PRJ-FR-023 to PRJ-FR-029 |
| การโอนที่อนุมัติ | `TransferToExchangeScenario` | hash ไม่เปลี่ยนไม่ส่ง และการโอนที่รออนุมัติไม่เปลี่ยนวงเงิน | PRJ-FR-018, PRJ-FR-033, PRJ-FR-034 |
| ปลายทางล่มและกลับมา | `PmOutageIT` | ส่งอัตโนมัติ รายการเก่าก่อน ไม่ซ้ำ และความล้มเหลวถาวรสร้างงาน | PRJ-FR-035 to PRJ-FR-039, XC-INT-004 |
| ข้อความจากระบบ PM | `PmMessageIT` | รหัสไม่รู้จัก ข้อความซ้ำ ผู้เรียกผิด การจำกัดบทบาท และไม่เปลี่ยนเงิน | PRJ-FR-041 to PRJ-FR-045, PRJ-IR-006 |
| การอนุมัติภายนอก | `ShareApprovalIT` | เหตุผลสั้น ปฏิเสธผู้ขอ และปฏิเสธผู้รับที่ยุติแล้ว | PRJ-FR-050 to PRJ-FR-055 |
| Sweep เปิดหน้า | `role-matrix.spec` | การจำกัดตามหน่วยงานของ `div` และ `divhead` | PRJ-FR-011 |

### การทดสอบที่ไม่มีต้นทางใน sweep {#prj-test-new}

| การทดสอบ | สิ่งที่ยืนยัน | ข้อกำหนด |
| --- | --- | --- |
| `StepPolicyTest` | ทุกเงื่อนไขของขั้น โดยร่างสัญญาและงวดที่ส่งมอบอย่างเดียวไม่นับ | BR-PRJ-03, PRJ-FR-014, PRJ-FR-019 |
| `ProjectLifeIT` | คำขอกลายเป็นรายการจัดสรรและเงินกันโดยใช้รหัสเดียว และรหัสไม่ถูกใช้ซ้ำ | PRJ-FR-002, PRJ-FR-003, PRJ-DR-001 |
| `FiguresMatchOwnersIT` | ตัวเลขแต่ละรายการตรงกับบัญชีคุมรายการและการเงิน | BR-PRJ-05, BR-PRJ-06, PRJ-DR-002 |
| `PayloadHashTest` | ข้อมูลเดียวกันให้ hash เดียวกันทั้งสองภาษา | PRJ-DR-005 |
| `SendLogImmutableIT` | บทบาทของแอปพลิเคชันแก้ไขหรือลบแถวไม่ได้ | PRJ-DR-003 |
| `DataSetFieldsTest` | ไม่มีฟิลด์ข้อมูลส่วนบุคคลในชุดข้อมูลที่ไม่ได้รับอนุมัติ | PRJ-DR-007 |
| `TenantIsolationIT` | สร้างจากสคีมาสำหรับทุกตาราง | ADR-0005 |
| `NoTenantBranchTest` | ไม่มีชื่อหน่วยงานหรือปีในโค้ดกลาง | PRJ-CR-002, PRJ-CR-004, PRJ-CR-005 |

## การย้ายจากต้นแบบ {#prj-migration}

ไม่มีการย้ายโค้ด สิ่งที่ย้ายคือความรู้ใน `95-projects.js` และไม่มีข้อมูลจริงให้ย้าย เมื่อหน่วยงานเริ่มใช้งาน งานตั้งต้นจะออกรหัสให้คำขอ รายการจัดสรร และเงินกันที่ยังเปิดอยู่

| สิ่งที่ย้าย | วิธี | ที่มาในต้นแบบ |
| --- | --- | --- |
| 8 ขั้นและตรรกะของขั้น | `CycleCatalogue` `StepPolicy` | `PRJ_CYCLE`, `prjList` |
| 12 รายการและ 4 มิติ | `OutboundPayload` `Dimension` | `prjOutFields`, `PRJ_DIM` |
| ค่าตั้ง | `registry_setting` และฟิลด์ในระเบียน | `PRJ_DEF` |
| การตรวจใน sweep | เขียนใหม่เป็นการทดสอบ | `tests/sweep.js` |
| ข้อความไทยและอังกฤษ | ย้ายไปไฟล์ข้อความ | `L()` |

| สิ่งที่ไม่ย้าย | เหตุผล | แทนด้วย |
| --- | --- | --- |
| รหัสที่สร้างจากรหัสระเบียน | ขัดกับ PRJ-FR-002 และ OI-PRJ-12 | `project`, `project_link` |
| hash จากข้อความที่แสดงผล | OI-PRJ-14 | `OutboundPayload.canonicalHash` |
| ตัวเลขที่ต่างจากเจ้าของ | OI-PRJ-13, OI-PRJ-15 | ส่วนเชื่อมต่อของเจ้าของ |
| สวิตช์ปลายทางล่มและบทข้อความ | PRJ-NFR-004 | adapter และ stub ในโปรไฟล์ทดสอบ |
| ปี วันที่ และทะเบียนตั้งต้นที่กำหนดตายตัว | OI-PRJ-17 | `FiscalCalendar` |
| ความก้าวหน้าที่คำนวณจากงวดงาน | PRJ-FR-047 | `pm_message` |
| ผู้รับข้อมูลในค่าตั้ง | PRJ-FR-053 | `data_consumer` |

## ช่องว่างที่ทราบและประเด็นค้าง {#prj-open}

### ประเด็นที่สืบมาจาก SRS {#prj-open-srs}

| ประเด็น | ผลต่อการออกแบบ | ที่ออกแบบไว้ขณะนี้ | ผู้ตัดสิน |
| --- | --- | --- | --- |
| OI-PRJ-01 | เวลาที่ออกรหัส | เมื่อมีเหตุการณ์แรกของคำขอ ร่างที่ถูกลบทำให้โครงการสิ้นสุดและเก็บเลขไว้ | เจ้าของผลิตภัณฑ์ |
| OI-PRJ-02 | จำนวนรายการต่อโครงการ | `project_link` รองรับหลายแถว โดยค่าเริ่มต้นเป็นหนึ่งรายการต่อปีงบประมาณ | เจ้าของผลิตภัณฑ์ ฝ่ายแผน |
| OI-PRJ-03 | ข้อตกลงกับระบบ PM | `ProjectSystemGateway` และมาตรฐานของ Fisko | แต่ละหน่วยงาน เจ้าของผลิตภัณฑ์ |
| OI-PRJ-04 | ระบบหลักของสัญญาและการตรวจรับ | งานจัดซื้อเป็นระบบหลัก ข้อความจากระบบ PM เป็นเพียงการแจ้ง | เจ้าของผลิตภัณฑ์ ผู้เชี่ยวชาญด้านพัสดุ |
| OI-PRJ-05 | ขอบเขตของการอนุมัติ | ต่อผู้รับและชุดข้อมูล | ผู้บริหารสนับสนุน ฝ่ายกฎหมาย |
| OI-PRJ-06 | กฎหมายการแชร์ | ไม่อ้างข้อกฎหมาย และ `DataSetBuilder` เป็นรายการปิด | ฝ่ายกฎหมาย เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| OI-PRJ-07 | ค่าที่เสนอ | เก็บใน `SettingRange` | เจ้าของผลิตภัณฑ์ |
| OI-PRJ-08 | การเก็บรักษา | มี key แต่ไม่มีระยะเวลา | ฝ่ายกฎหมาย เจ้าของผลิตภัณฑ์ |
| OI-PRJ-09 | รหัส GFMIS | อ่านจาก `finance` หรือ `budget` ไม่สร้างในโมดูลนี้ | กรมบัญชีกลาง |
| OI-PRJ-10 | รหัสการเชื่อมต่อ | `InterfaceReporter` ใช้ชื่อ adapter ไม่ใช้เลข | เจ้าของผลิตภัณฑ์ |
| OI-PRJ-11 | แผนผังโมดูล | ตารางทางเลือกและ endpoint อ่านหนึ่งรายการ | เจ้าของผลิตภัณฑ์ |
| OI-PRJ-12 ถึง OI-PRJ-18 | ข้อบกพร่องของต้นแบบ | ปิดด้วยการออกแบบตามตารางการย้าย | ทีมพัฒนา |

### ประเด็นใหม่จากการออกแบบนี้ {#prj-open-new}

เลข DG-PRJ ด้านล่างเป็นของบทนี้และไม่ใช่รหัสใน SRS

| ประเด็น | คำถาม | ที่ออกแบบไว้ขณะนี้ | ผู้ตัดสิน |
| --- | --- | --- | --- |
| DG-PRJ-01 | `budget` `procurement` และ `finance` จะให้ query เหตุการณ์ และเลขอ้างอิงตามที่บทนี้ขอหรือไม่ | ตามที่ระบุในองค์ประกอบและพฤติกรรมเชิงพลวัต | ผู้เขียนบทเหล่านั้น หัวหน้าทีมเทคนิค |
| DG-PRJ-02 | ใครเป็นผู้เชื่อมโครงการด้วยมือเมื่อไม่มีเลขอ้างอิง เช่น รายการที่นำเข้าเมื่อเริ่มใช้งาน | ยังไม่มีคำสั่งนี้ จะเริ่มโครงการใหม่ | เจ้าของผลิตภัณฑ์ ฝ่ายแผน |
| DG-PRJ-03 | `ContractLookup` ไม่มีฟิลด์ข้อมูลส่วนบุคคล แต่ Project 360 แสดงชื่อผู้ขาย ซึ่งอาจเป็นบุคคลธรรมดา จะแสดงได้หรือไม่ | แสดงผู้ขายเฉพาะเมื่อ API ส่งค่ามา | เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| DG-PRJ-04 | การตรวจการอนุมัติแชร์ควรเป็นกฎแยกหน้าที่ที่มีเลขในทะเบียนของ Platform หรือไม่ | การตรวจบุคคลที่สองโดยไม่มีเลข | เจ้าของ Platform |
| DG-PRJ-05 | XC-PER-001 ถึง XC-PER-008 เป็นเป้าหมายที่เสนอสำหรับทุกโมดูล ปริมาณต่อหน่วยงานและจำนวนโครงการที่ใช้กับโมดูลนี้เป็นเท่าใด | การทดสอบภาระงานใช้แถว XC-PER และยังไม่มีปริมาณเฉพาะของตน | เจ้าของผลิตภัณฑ์ |
| DG-PRJ-06 | ทะเบียนยังแสดงโครงการของปีงบประมาณที่ปิดแล้วหรือไม่ | ยังแสดง พร้อมตัวกรองปีงบประมาณ | เจ้าของผลิตภัณฑ์ |

### ช่องว่างที่ทราบในฉบับนี้ {#prj-open-depth}

- ยังไม่กำหนดชุดข้อมูลและฟิลด์ ซึ่งรอ OI-PRJ-05 OI-PRJ-06 และรายการผู้รับของแต่ละหน่วยงาน
- โครงสร้างข้อความจากระบบ PM ระบุเฉพาะฟิลด์ที่ต้นแบบใช้
- ชนิดคอลัมน์และดัชนีรอบทพจนานุกรมข้อมูล
