# การออกแบบโมดูลแพลตฟอร์ม {#plt}

> [!NOTE] Fisko ยังไม่มีโค้ดสำหรับใช้งานจริง ต้นแบบเป็น JavaScript บนเบราว์เซอร์และใช้แสดงพฤติกรรมเท่านั้น ทุกอย่างในบทนี้เป็นข้อเสนอสำหรับการสร้าง แพ็กเกจ คลาส ตาราง endpoint เหตุการณ์ และชื่อการทดสอบด้านล่างยังไม่มีอยู่จริง เทคโนโลยีมาจาก ADR ที่ยอมรับแล้วใน `docs/adr/` ซึ่งบทนี้นำมาใช้และไม่เปิดประเด็นใหม่

## วัตถุประสงค์ ขอบเขต และการสอบย้อน {#plt-purpose}

<!-- covers: PDPA 23; PDPA 24; PDPA 30; PDPA 32; PDPA 33; PDPA 34; PDPA 37; PDPA 39; PDPA 40; PDPA 41 -->

บทนี้ออกแบบโมดูล Platform สำหรับใช้งานจริง ทั้งโครงสร้าง ข้อมูล ส่วนเชื่อมต่อ และพฤติกรรม โดยตอบบท Platform ของ SRS และตอบคำขอที่บท Procurement ระบุไว้ใน DG-PRC-08

Platform เป็นโมดูลที่ทุกโมดูลพึ่งพา และไม่พึ่งพาโมดูลธุรกิจ (ADR-0002, PLT-CR-003) กฎคุณภาพระดับแพลตฟอร์ม การติดตั้ง Keycloak และการออกแบบ cell อยู่ในบท cross-cutting และบทการติดตั้ง บทนี้เก็บความสามารถและส่วนเชื่อมต่อที่เปิดเผย

กลุ่มข้อกำหนดทุกกลุ่มใน SRS จับคู่กับหัวข้อการออกแบบด้านล่าง

| กลุ่มใน SRS | ข้อกำหนด | หัวข้อการออกแบบ | แพ็กเกจหลัก |
| --- | --- | --- | --- |
| กฎทางธุรกิจ | BR-PLT-01 ถึง BR-PLT-26 | แบบจำลองโดเมน | ทั้งหมด |
| tenant และค่าตั้งของหน่วยงาน | PLT-FR-001 ถึง PLT-FR-008 | ภาพรวมการออกแบบ การออกแบบความมั่นคงปลอดภัย | `tenancy` |
| การยืนยันตัวตนและการเข้าสู่ระบบ | PLT-FR-009 ถึง PLT-FR-021 | พฤติกรรมเชิงพลวัต การออกแบบความมั่นคงปลอดภัย | `identity` |
| องค์กรและผู้ใช้ | PLT-FR-022 ถึง PLT-FR-030 | สถานะและการเปลี่ยนสถานะ การออกแบบข้อมูล | `org` |
| บทบาทและสิทธิ์ | PLT-FR-031 ถึง PLT-FR-037 | การออกแบบความมั่นคงปลอดภัย | `access` |
| การแยกหน้าที่ | PLT-FR-038 ถึง PLT-FR-046 | พฤติกรรมเชิงพลวัต การออกแบบความมั่นคงปลอดภัย | `sod` |
| การมอบอำนาจและการทำแทน | PLT-FR-047 ถึง PLT-FR-061 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `delegation` |
| สายอนุมัติ | PLT-FR-062 ถึง PLT-FR-068 | ภาพรวมการออกแบบ สถานะและการเปลี่ยนสถานะ | `approval` |
| การแจ้งเตือน | PLT-FR-069 ถึง PLT-FR-078 | พฤติกรรมเชิงพลวัต การออกแบบส่วนเชื่อมต่อ | `notification` |
| งานและงานของฉัน | PLT-FR-079 ถึง PLT-FR-086 | องค์ประกอบ การออกแบบข้อมูล | `work` |
| บันทึกการใช้งานและประวัติรายการ | PLT-FR-087 ถึง PLT-FR-096 | การออกแบบความมั่นคงปลอดภัย การออกแบบข้อมูล | `audit` |
| ข้อมูลหลักที่ใช้ร่วมกัน | PLT-FR-097 ถึง PLT-FR-104 | แบบจำลองโดเมน การออกแบบข้อมูล | `masterdata`, `calendar` |
| หน้านโยบายและข้อมูลพื้นฐานของเว็บไซต์ | PLT-FR-105 ถึง PLT-FR-108 | องค์ประกอบ การออกแบบข้อมูล | `site` |
| ความสามารถด้าน PDPA | PLT-FR-109 ถึง PLT-FR-119 | พฤติกรรมเชิงพลวัต การออกแบบข้อมูล | `privacy` |
| ระบบ ตัวสลับ และการค้นหา | PLT-FR-120 ถึง PLT-FR-126 | องค์ประกอบ | `web`, `search` |
| ผู้ช่วย AI | PLT-FR-127 ถึง PLT-FR-136 | องค์ประกอบ การออกแบบความมั่นคงปลอดภัย | `ai` |
| การดูแลระบบ | PLT-FR-137 ถึง PLT-FR-143 | องค์ประกอบ การออกแบบส่วนเชื่อมต่อ | `admin` |
| ความต้องการด้านข้อมูล | PLT-DR-001 ถึง PLT-DR-007 | การออกแบบข้อมูล | ทั้งหมด |
| กฎสถานะ | ตารางสถานะใน SRS | สถานะและการเปลี่ยนสถานะ | `delegation`, `org`, `masterdata` |
| ความต้องการด้านการเชื่อมต่อ | PLT-IR-001 ถึง PLT-IR-006 | การออกแบบส่วนเชื่อมต่อ | `api`, `web` |
| ความต้องการที่ไม่ใช่ฟังก์ชัน | PLT-NFR-001 ถึง PLT-NFR-006 | การออกแบบที่ไม่ใช่ฟังก์ชัน | ทั้งหมด |
| ข้อจำกัด | PLT-CR-001 ถึง PLT-CR-008 | ภาพรวมการออกแบบ | ทั้งหมด |
| หลักฐานการทดสอบ | การตรวจใน sweep ของ SRS | การออกแบบการทดสอบ | tests |
| ประเด็นที่ยังเปิดอยู่ | OI-PLT-01 ถึง OI-PLT-15 | ช่องว่างที่ทราบและประเด็นค้าง | ทั้งหมด |

## ภาพรวมการออกแบบและการตัดสินใจ {#plt-decisions}

Platform เป็นโมดูลหนึ่งของ modular monolith (ADR-0002) ส่วนเชื่อมต่อที่เปิดเผยทำงานภายในธุรกรรมของผู้เรียก คำสั่งธุรกิจ บันทึก รายการงาน และการแจ้งเตือนจึง commit พร้อมกัน Keycloak พิสูจน์ว่าผู้ใช้คือใคร (ADR-0006) ส่วนสิ่งที่ผู้ใช้ทำได้อยู่ใน Platform และตรวจที่เซิร์ฟเวอร์

| การตัดสินใจ | เหตุผล | ทางเลือกที่ไม่ใช้ | แหล่งที่มา |
| --- | --- | --- | --- |
| tenant ตัวตน บทบาท หน้าที่ การมอบอำนาจ บันทึก การแจ้งเตือน และ PDPA เป็นโมดูลเดียวที่ไม่พึ่งพาโมดูลธุรกิจ | ทุกโมดูลต้องใช้ และ Spring Modulith ไม่ยอมรับวงจรการพึ่งพา | ไลบรารีร่วม ซึ่งเป็นเจ้าของตารางหรือธุรกรรมไม่ได้ | ADR-0002, PLT-CR-003 |
| tenant มาจากโทเค็น และผูกด้วย `SET LOCAL app.tenant_id` ในทุกธุรกรรม | row-level security จึงยังคุ้มครองแม้คำสั่งลืมตัวกรอง | รหัส tenant ใน path หรือ body | ADR-0005, PLT-FR-002 |
| กฎแยกหน้าที่เป็นแคตตาล็อกในโค้ดพร้อมสวิตช์ของ tenant และกฎที่ผูกกับกฎหมายมีการล็อก | กฎต้องมีโค้ด ณ จุดบังคับใช้ และ tenant ต้องปิดขีดจำกัดตามกฎหมายไม่ได้ | กฎเป็นข้อมูลอิสระของ tenant ซึ่งไม่มีโค้ดบังคับใช้ อย่างที่เกิดกับ SD-03 | ADR-0007, PLT-CR-006, OI-PLT-03 |
| `Delegations` คืนการมอบอำนาจที่มีผลทุกรายการ และ `ActorSet` เก็บไว้ทั้งหมด | ต้นแบบใช้รายการแรก ผู้มอบคนที่สองจึงรอดการตรวจหน้าที่ (PLT-FR-042) | ผู้มอบหนึ่งคนต่อการทำรายการ | PLT-FR-041, PLT-FR-042 |
| สถานะการมอบอำนาจคำนวณจากวันที่ ไม่เก็บและไม่ใช้งานอัตโนมัติเปลี่ยน | การเริ่มหรือสิ้นสุดจึงมีผลตรงวันแม้งานอัตโนมัติล่าช้า | ช่องสถานะที่ปรับทุกคืน | PLT-NFR-002 |
| สายอนุมัติเป็นข้อมูลของ tenant มีฉบับ ส่วนเครื่องสถานะตามกฎหมายอยู่ในโมดูล | ผู้อนุมัติต่างกันตามหน่วยงาน แต่ขั้นตอนตามกฎหมายไม่ต่าง | BPMN engine (ADR-0007 ไม่ใช้) สายอนุมัติฝังในโค้ดต่อเอกสาร | ADR-0007, PLT-FR-066 |
| อินสแตนซ์ตรึงฉบับของสายที่เริ่มใช้ | การแก้สายต้องไม่กระทบคำขอที่อยู่ระหว่างทาง (PLT-FR-065) | อ่านสายล่าสุดทุกขั้น ซึ่งการตรวจ SLA ของต้นแบบทำอยู่ | PLT-FR-065 |
| งานของฉันเป็นตาราง `work_item` ที่โมดูลเติมผ่าน `WorkItems` ในธุรกรรมของตน | รายการข้ามห้าโมดูลทุกครั้งที่เข้าสู่ระบบเรียกทุกโมดูลไม่ได้ และรายการต้องเกิดและปิดพร้อมสาเหตุ | ให้แต่ละโมดูลตอบตอนอ่านแบบ `myTasks` หรือจับคำในชื่องานแบบหน้ารออนุมัติ | PLT-FR-079, PLT-FR-082 |
| การแจ้งเตือนเป็นรหัสแม่แบบและพารามิเตอร์ แปลงเป็นภาษาของผู้อ่าน | แม่แบบของต้นแบบไม่ถูกใช้ และข้อความตายตัวมีชื่อบุคคลที่ลบไม่ได้ | ข้อความอิสระในแต่ละจุด | PLT-FR-073, ADR-0015 |
| บันทึกการใช้งานเพิ่มอย่างเดียว เชื่อมด้วย hash ราย tenant ใช้รหัสอ้างอิงแทนตัวบุคคล และไม่มีข้อความอิสระ | การลบข้อมูลต้องไม่ทำให้ห่วงโซ่ขาด | ตารางที่แก้ไขได้ ข้อมูลส่วนบุคคลในบันทึก บล็อกเชน (ADR-0015 ไม่ใช้ทั้งหมด) | ADR-0015, PLT-CR-005 |
| การเลิกทำเป็นคำสั่งชดเชยที่เพิ่มบันทึก | การกู้คืนภาพข้อมูลลบบันทึก อย่างที่เกิดในต้นแบบ (OI-PLT-09) | กู้คืนภาพข้อมูล | BR-PLT-19, PLT-FR-143 |
| วันอ้างอิงและวันหยุดอยู่ใน Platform พร้อม `WorkingCalendar` เดียว | ทุกโมดูลนับวันทำการแบบเดียวกัน | รายการวันหยุดในแต่ละโมดูล | BR-PLT-22, PLT-FR-101 |
| สิทธิของเจ้าของข้อมูลทำงานผ่านคิว โดยแต่ละโมดูลติดตั้ง SPI `RetentionHold` | Platform ไม่รู้หน้าที่การเก็บรายการของแต่ละโมดูล และต้องไม่พึ่งพาโมดูล | รายการข้อยกเว้นกลางใน Platform | ADR-0014, PLT-FR-112 |
| รายการระบบ เมนู และการปักหมุดเป็น read model สิทธิ์เท่านั้นเป็นตัวตัดสินการเข้าถึง | การซ่อนเมนูไม่ใช่ตัวควบคุม (ADR-0006) | รายการบทบาทต่อหน้าแบบต้นแบบ | PLT-FR-036, PLT-FR-123 |

> [!LAW] การแยกขีดจำกัดตามกฎหมายออกจากทางเลือกของ tenant ใช้กับกฎแยกหน้าที่ด้วย `SodRule.lockedOn` เก็บวันที่ที่กฎเริ่มปิดไม่ได้ พร้อมมาตราที่กำหนด ค่านี้ว่างสำหรับทุกกฎจนกว่าผู้เชี่ยวชาญตอบ OI-PLT-03 กฎทุกข้อจึงยังปิดได้เหมือนต้นแบบ และการปิดทุกครั้งต้องมีเหตุผลและแจ้งผู้ตรวจสอบ

```java
// Proposal. The rule catalogue is code; the switch is tenant data checked against it.
public record SodRule(String id, Optional<LocalDate> lockedOn, Optional<String> clause) {
    public void assertSwitchable(LocalDate today) {
        if (lockedOn.filter(from -> !today.isBefore(from)).isPresent()) {
            throw new RuleLocked(id, clause);
        }
    }
}
```

## องค์ประกอบ {#plt-components}

Platform คือโมดูล Spring Modulith ชื่อ `platform` ภายใต้แพ็กเกจฐานที่เลือกตอนเริ่มสร้าง เฉพาะ `api` และแพ็กเกจย่อย `api.events` เป็น named interface แพ็กเกจอื่นเป็นภายใน และการทดสอบขอบเขตรันใน CI (ADR-0002)

{{fig:plt-component | องค์ประกอบของโมดูล platform และส่วนที่อยู่ข้างเคียง}}

> [!NOTE] รายการแพ็กเกจ ชื่อ interface และชื่อเมธอดในหัวข้อนี้เป็นข้อเสนอ

### แพ็กเกจภายใน {#plt-packages}

| แพ็กเกจ | หน้าที่ | คลาสหลัก |
| --- | --- | --- |
| `web` | REST controller, request record, การแปลง Problem Details รายการระบบและเมนู | `AdminController`, `DelegationController`, `WorkController`, `ShellController` |
| `tenancy` | ระเบียน tenant ค่าตั้ง การผูกต่อคำขอ การรับ tenant ใหม่ การส่งออก การกู้คืน | `Tenant`, `TenantBinding`, `Onboarding`, `TenantExport` |
| `identity` | ตรวจโทเค็น กฎเซสชันที่ส่งให้ Keycloak เหตุการณ์เข้าสู่ระบบ การแจ้งเมื่อบัญชีถูกกัน | `SessionPolicy`, `SignInEvents` |
| `org` | หน่วยงาน บัญชีผู้ใช้ การระงับ | `Unit`, `UserAccount`, `UnitTree` |
| `access` | บทบาท สิทธิ์ การให้สิทธิ์ตามบทบาท ขอบเขตหน่วยงาน ตารางสิทธิ์ | `Role`, `AuthorityCheck`, `UnitScope`, `PermissionMatrix` |
| `sod` | แคตตาล็อกกฎ สวิตช์ ตัวตรวจ การพยายามที่ถูกกัน | `SodCatalogue`, `SodGuardImpl`, `SodBlock` |
| `delegation` | การมอบอำนาจ ขอบเขต นโยบายการทับซ้อน ชุดผู้กระทำ | `Delegation`, `DelegationScope`, `OverlapPolicy`, `ActorSet` |
| `approval` | สาย ขั้น อินสแตนซ์ การตัดสิน | `ApprovalChain`, `ApprovalInstance`, `StepDecision` |
| `notification` | แม่แบบ การแจ้งเตือน ช่องทาง กฎ SLA และการยกระดับ | `NoticeTemplate`, `Notice`, `EscalationRule`, `SlaSweep` |
| `work` | รายการงาน หน้ารออนุมัติ ศูนย์รายการผิดปกติ การปักหมุดและหน้าล่าสุด | `WorkItem`, `ExceptionFeed`, `PagePin` |
| `audit` | รายการบันทึก ตัวเชื่อมห่วงโซ่ จุดตรวจ ประวัติรายการ การส่ง SIEM | `AuditEntry`, `CommandAudit`, `Chainer`, `ChainVerifier`, `RecordHistory` |
| `masterdata` | ปีงบประมาณ งบรายจ่าย ราคามาตรฐาน กำหนดการปฏิทิน | `FiscalYear`, `StandardPrice`, `Milestone` |
| `calendar` | วันหยุดและการนับวันทำการ | `WorkingCalendarImpl`, `Holiday` |
| `site` | หน้านโยบาย ข้อมูลส่วนท้าย ประกาศความเป็นส่วนตัว | `PolicyPage`, `PolicyVersion` |
| `privacy` | พจนานุกรมข้อมูล การเก็บรักษา คำขอของเจ้าของข้อมูล เหตุละเมิด ROPA ความยินยอม | `DataDictionary`, `RetentionSchedule`, `DataSubjectRequest`, `BreachCase`, `RopaExport` |
| `ai` | เกตเวย์โมเดล เธรดผู้ช่วย AI การส่งต่อเครื่องมือ และ runtime เอเจนต์ร่วมตามข้อเสนอ | `AiGatewayImpl`, `CoworkThread`, `AssistantRouter` |
| `documents`, `files`, `crypto`, `search` | PDF และ PAdES ไฟล์ S3 พร้อมการสแกน การเข้ารหัสฟิลด์และกุญแจ การทำดัชนี OpenSearch บท cross-cutting เก็บการออกแบบของส่วนเหล่านี้ | `DocumentServiceImpl`, `FileStoreImpl`, `FieldCryptoImpl`, `SearchIndexerImpl` |
| `admin` | สถานะการเชื่อมต่อ สถานะการสำรองข้อมูล แท็บผู้ดูแลระบบ | `InterfaceStatus`, `BackupStatus` |
| `outbox` | ตาราง outbox และตัวส่งต่อ | `OutboxWriter`, `OutboxRelay` |

### ส่วนเชื่อมต่อที่เปิดเผย {#plt-published}

| Interface | ผู้ใช้ | วัตถุประสงค์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `TenantContext` | ทุกโมดูล | tenant ที่ผูกอยู่และค่าตั้งความสามารถ | PLT-FR-002, PLT-IR-002 |
| `Authorizer` | ทุกโมดูล | `require(authority)` `scope(unit)` และ `actors(role, scope)` ที่คืน `ActorSet` | PLT-FR-036, PLT-IR-002 |
| `Delegations` | `Authorizer` ทุกโมดูล | `activeFor(user, role, scope)` และ `onBehalf(actorSet)` สำหรับข้อความและเลขที่ | PLT-FR-050, PLT-FR-051 |
| `SodGuard` | ทุกโมดูล | `check(rule, actorSet, others, item)` | PLT-FR-039 ถึง PLT-FR-042, PRC-NFR-002 |
| `AuditLog` | ทุกโมดูล | `record(action, item)` ในธุรกรรมของผู้เรียก | PLT-FR-087, PLT-IR-003 |
| `Notifier` | ทุกโมดูล | `send(templateKey, params, audience)` | PLT-FR-071, PLT-FR-073, PLT-IR-003 |
| `WorkItems` | ทุกโมดูล | `open` `close` `reassign` งานของผู้ใช้ บทบาท หรือบทบาทในหน่วยงาน | PLT-FR-079, PLT-IR-003 |
| `ApprovalRoutes` | ทุกโมดูล | `start(chainKey, subject, context)` `decide` `returnTo` | PLT-FR-062 ถึง PLT-FR-068 |
| `WorkingCalendar`, `FiscalCalendar` | ทุกโมดูล | `addWorkingDays` `fiscalYearOf` `isOpen(year)` | PLT-IR-004, BR-PLT-21, BR-PLT-22 |
| `UnitDirectory`, `SubjectDirectory` | ทุกโมดูล | ผังหน่วยงานและชื่อ ชื่อหรือข้อความแทนของรหัสอ้างอิงบุคคล | PLT-FR-093 |
| `StandardPrices` | `budget`, `procurement` | รายการราคาที่ใช้งาน | PLT-FR-103 |
| `RetentionRegistry` | ทุกโมดูล | รหัสการเก็บรักษาและระยะเวลา | PLT-FR-110 |
| `DocumentService`, `FileStore`, `FieldCrypto`, `SearchIndexer`, `AiGateway` | ทุกโมดูล | บริการร่วมตาม ADR | ADR-0009, ADR-0010, ADR-0011, ADR-0013, ADR-0016 |
| `AgentRuntime`, `AgentCatalogue` | โมดูลที่มีเอเจนต์ และ `review` | ข้อเสนอ ดู[runtime เอเจนต์ร่วม](#plt-agent-runtime) (DG-REV-01) | REV-FR-036 |
| `AssistantRouter` | `review` | ข้อเสนอ ส่งต่อคำขอของผู้ช่วยไปยังเครื่องมือ และปฏิเสธคำขอตาม BR-PLT-25 ก่อนเรียกโมเดล | PLT-FR-129, REV-IR-005 |
| `RetentionHold`, `InterfaceReporter` (SPI) | โมดูลเป็นผู้ติดตั้ง | การเก็บตามกฎหมายของรายการของบุคคล สถานะของแต่ละ adapter | PLT-FR-112, PLT-IR-006 |
| Events in `api.events` | ทุกโมดูล และ RabbitMQ ผ่าน outbox | รายการเหตุการณ์ในหัวข้อส่วนเชื่อมต่อ | ADR-0008 |

### คำตอบต่อคำขอของ Procurement {#plt-dg-prc}

DG-PRC-08 ระบุสิ่งที่ Procurement ขอจาก Platform ตารางนี้ยืนยันหรือเปลี่ยนแปลงแต่ละคำขอ และบท Procurement นำการเปลี่ยนแปลงไปใช้แล้ว (DG-PLT-02)

| คำขอ | คำตอบ | การเปลี่ยนแปลง |
| --- | --- | --- |
| `TenantContext`, `Authorizer` | ยืนยัน | ไม่มี |
| `Delegations` | ยืนยัน และคืนการมอบอำนาจที่มีผลทั้งหมด | ผู้เรียกส่ง `ActorSet` และไม่สร้างรายการผู้กระทำเอง |
| `SodGuard.check(rule, actors, others, item)` | ยืนยัน โดยบันทึกการปฏิเสธในธุรกรรมของตนเอง | `actors` เปลี่ยนเป็น `ActorSet` และ SD-02, SD-06, SD-07 ทำงานผ่านตัวตรวจนี้ด้วย |
| `AuditLog` | ยืนยัน | รายการไม่มีข้อความอิสระ `CommandAudit` ส่งรหัสการกระทำและรหัสรายการ |
| `Notifier` | ยืนยัน รวมถึงอีเมล (PRC-IR-016) | ผู้เรียกส่งรหัสแม่แบบและพารามิเตอร์ ไม่ส่งข้อความ |
| `WorkingCalendar` | ยืนยัน | ตาราง `holiday` ย้ายจาก schema ของ Procurement มาที่ Platform |
| `DocumentService`, `FileStore`, `FieldCrypto`, `AiGateway`, `SearchIndexer` | ยืนยันเป็น interface ของ Platform | ไม่มี บท cross-cutting เก็บการออกแบบ |
| ตารางการเก็บรักษาเดียวใน `platform` | ยืนยันผ่าน `RetentionRegistry` | Procurement ติดตั้ง `RetentionHold` เพิ่ม |
| ตาราง subject และคอลัมน์ `*_ref` | ยืนยันผ่าน `SubjectDirectory` | ไม่มี |
| รายการงานของฉัน ซึ่งบทนั้นเรียกว่างาน | เพิ่มใหม่ | งานตรวจรายวันของ Procurement เรียก `WorkItems` |
| การเข้าสู่ระบบของผู้ขาย (DG-PRC-12) | ยืนยัน เป็นผู้ใช้ Keycloak ใต้ organization ของผู้ขาย | Platform ผูกผู้ใช้ ส่วน Procurement เป็นเจ้าของการตรวจเลขผู้เสียภาษี |

### runtime เอเจนต์ร่วม (ข้อเสนอ) {#plt-agent-runtime}

DG-REV-01 เสนอ runtime เอเจนต์ชุดเดียวใน `platform.ai` เพื่อให้เอเจนต์ทุกตัวของทุกโมดูลทำงานบนกรอบเดียวกัน (REV-FR-036) Budget, Procurement และ Finance ต่างมีเอเจนต์ และไม่มีโมดูลใดพึ่งพา `review` ได้ runtime จึงต้องอยู่ใน Platform แต่ละโมดูลเก็บเฉพาะเครื่องมือของตน

| ส่วน | เจ้าของ | เก็บอะไร | ข้อกำหนด |
| --- | --- | --- | --- |
| `AgentRuntime` | `platform.ai` | `start`, `nextStep`, `decide` และ `stop` ของการรัน | REV-FR-037, REV-FR-041 ถึง REV-FR-045 |
| `AgentCatalogue` | `platform.ai` | เอเจนต์ สวิตช์ และระดับต่อผู้เช่า | REV-FR-035, REV-FR-049, REV-FR-050 |
| `agent_profile`, `agent_run`, `agent_step` | Schema `platform` | ตารางที่บท Review ระบุ ภายใต้คีย์ `plt.ai.use` | REV-DR-001 |
| `ai_use` | Schema `platform` | ตารางในหัวข้อการออกแบบข้อมูล โดยเพิ่มคอลัมน์ของ Procurement ได้แก่ `tool`, `version`, `draft` และ `final_text` | PRC-FR-181, PRC-FR-185 |
| ทะเบียนเครื่องมือ | แต่ละโมดูล | เครื่องมือของโมดูลและ `ToolRegister` ของโมดูลนั้น | REV-FR-038 |

> [!OPEN] หัวหน้าทีมเทคนิคต้องตกลงข้อเสนอนี้กับเจ้าของบท Platform และบท Procurement (DG-REV-01) Budget และ Finance ยังมีตารางเอเจนต์ของตน และต้องทำตามการตัดสินเดียวกัน (DG-FIN-06) วิธีที่ `AgentRuntime` เรียกเครื่องมือของโมดูลโดยไม่พึ่งพาโมดูลนั้นยังไม่ได้ออกแบบ และต้องมี SPI ซึ่งการตัดสินเดียวกันต้องกำหนด

## แบบจำลองโดเมน {#plt-domain}

<!-- covers: PDPA 24; PDPA 33 -->

คลาสโดเมนเป็น Java ธรรมดา ไม่ import Spring หรือ JPA แต่ละคำสั่งโหลด aggregate หนึ่งตัว เรียกเมธอดที่ตรวจกฎ แล้วบันทึก ชื่อตามฟิลด์ในต้นแบบเมื่อฟิลด์นั้นยังใช้ต่อ

{{fig:plt-class | Aggregate ของ platform และส่วนประกอบ}}

> [!NOTE] Aggregate ชื่อคลาส และรหัสข้อผิดพลาดในหัวข้อนี้เป็นข้อเสนอ

### Aggregate และเงื่อนไขคงที่ {#plt-aggregates}

| Aggregate | ส่วนประกอบ | เงื่อนไขที่รักษา |
| --- | --- | --- |
| `Tenant` | ค่าตั้ง | ค่าอยู่ใน `SettingRange` อยู่บน cell เดียวในแต่ละเวลา |
| `Unit` | ไม่มี | รหัสไม่ซ้ำใน tenant ผังหน่วยงานไม่เป็นวง เลิกใช้เมื่อถูกใช้แล้ว |
| `UserAccount` | ระเบียนการระงับ | หนึ่งบทบาทและหนึ่งหน่วยงาน (OI-PLT-05) ไม่ถูกลบ |
| `Delegation` | ไม่มี | ผู้มอบถือบทบาทของขอบเขตโดยตรง ผู้รับมอบเป็นผู้ใช้อื่นที่ใช้งานอยู่ วันสิ้นสุดไม่ก่อนวันเริ่ม เลขที่ไม่ใช้ซ้ำ |
| `ApprovalChain` | ขั้น | อย่างน้อยหนึ่งขั้น การแก้สร้างฉบับใหม่ ขั้นที่ล็อกคงเงื่อนไขเดิม |
| `ApprovalInstance` | การตัดสิน | ตรึงกับฉบับเดียว แต่ละขั้นตัดสินครั้งเดียวต่อรอบ การตัดสินมีผู้ทำและผู้ถืออำนาจ |
| `NoticeTemplate` | คำแปล | มีครบสองภาษา ตัวแปรต้องเป็นของเหตุการณ์นั้น |
| `WorkItem` | ไม่มี | ปิดโดยสาเหตุ ไม่ปิดโดยผู้อ่าน |
| `FiscalYear` | กำหนดการ | หนึ่งระเบียนต่อเลขปี ช่วงเวลาตาม BR-PLT-21 |
| `StandardPrice`, `Holiday` | ไม่มี | ราคาตั้งแต่ 0 เลิกใช้แต่ไม่ลบ หนึ่งรายการต่อวันที่ |
| `RetentionRule` | ไม่มี | 1 ถึง 30 ปี ไม่ต่ำกว่าขั้นต่ำตามกฎหมายเมื่อกำหนดแล้ว |
| `DataSubjectRequest`, `BreachCase` | หลักฐาน นาฬิกา | กำหนดเสร็จตั้งตอนรับเรื่อง การปฏิเสธระบุเหตุผล |
| `CoworkThread` | ข้อความ ไฟล์แนบ | เป็นของผู้ใช้คนเดียว |

### Value object และ enumeration {#plt-values}

| ชนิด | ค่า | หมายเหตุ |
| --- | --- | --- |
| `RoleId` | `div`, `divhead`, `plan`, `exec`, `fin`, `finhead`, `proc`, `prochead`, `committee`, `audit`, `admin`, `vendor` | PLT-FR-031 โดย `dpo` เพิ่มตาม DG-PLT-09 |
| `DelegationScope` | `transfer`, `review`, `committee`, `spend` | BR-PLT-11 |
| `DelegationState` | `future`, `active`, `held`, `expired`, `revoked` | คำนวณ `held` เป็นค่าใหม่ PLT-FR-060 |
| `StepCondition` | `always`, `amountAtLeast` | รวม `committee` ซึ่งเป็นกฎที่ล็อกของ `needsCommittee` |
| `FiscalYearStatus` | `setup`, `request`, `execution`, `closed` | BR-PLT-21 |
| `Channel` | `app`, `mail` และ `sms` หรือ `line` เมื่อ OI-PLT-14 อนุญาต | ผู้ใช้เลือกช่องทางได้ ยกเว้นการแจ้งที่กฎหมายหรือกฎความมั่นคงปลอดภัยกำหนด |
| `Severity` | `bad`, `warn` | รายการผิดปกติ |
| `DataClass` | `Restricted`, `Confidential`, `Internal`, `Public` | ADR-0013 |
| `ActorSet` | ผู้ใช้ บทบาทที่ทำ และการมอบอำนาจที่มีผลทุกรายการ | ใช้แทน `sodActors` |

### ตำแหน่งที่บังคับใช้กฎธุรกิจแต่ละข้อ {#plt-rule-map}

เซิร์ฟเวอร์บังคับใช้ทุกกฎด้านล่าง หน้าจออาจตรวจซ้ำเพื่อช่วยผู้ใช้ แต่ไม่ใช่ตัวควบคุม (ADR-0006) รหัสข้อผิดพลาดกำหนดในหัวข้อส่วนเชื่อมต่อ

| กฎ | เรื่อง | บังคับใช้ที่ | รหัสข้อผิดพลาด |
| --- | --- | --- | --- |
| BR-PLT-01 | การแยก tenant | `TenantBinding` และ row-level security | `PLT_NOT_FOUND` |
| BR-PLT-02 | หนึ่งบทบาท หนึ่งหน่วยงาน | `UserAccount` | `PLT_INVALID_INPUT` |
| BR-PLT-03 | บัญชีใช้งานพร้อม MFA | required action ของ Keycloak และ `SessionPolicy` | `PLT_ACCOUNT_SUSPENDED` |
| BR-PLT-04 | การระงับ | `UserAccount.suspend` | `PLT_REASON_REQUIRED` |
| BR-PLT-05 | การหมดเวลา | ขีดจำกัดเซสชันของ Keycloak ตั้งจาก `tenant_setting` โดย `SessionPolicy` | 401 ไม่มีรหัสโมดูล |
| BR-PLT-06 | การเข้าถึงหน้าและการทำรายการ | `AuthorityCheck` | `PLT_FORBIDDEN` |
| BR-PLT-07 | ผู้ดูแลระบบไม่มีอำนาจอนุมัติ | การให้สิทธิ์ และ `ApprovalChain` ไม่รับ `admin` เป็นเจ้าของ | `PLT_INVALID_INPUT` |
| BR-PLT-08 | การตรวจหน้าที่ | `SodGuardImpl.check` | `PLT_SOD_BLOCKED` |
| BR-PLT-09 | การเปิดปิดกฎ | `SodCatalogue.setEnabled`, `SodRule.assertSwitchable` | `PLT_RULE_LOCKED`, `PLT_REASON_REQUIRED` |
| BR-PLT-10 | ฟิลด์และวันที่ของการมอบอำนาจ | `Delegation.create` | `PLT_INVALID_INPUT` |
| BR-PLT-11 | ขอบเขต | `DelegationScope` | `PLT_FORBIDDEN` |
| BR-PLT-12 | ผู้รับมอบ | `Delegation.create` | `PLT_DELEGATE_NOT_ALLOWED` |
| BR-PLT-13 | ไม่มอบต่อ | `Delegation.create`, `Delegations.activeFor` | `PLT_DELEGATE_NOT_ALLOWED` |
| BR-PLT-14 | ผู้มอบยังมีอำนาจ | `AuthorityCheck` | ไม่มี |
| BR-PLT-15 | รูปแบบสายอนุมัติ | `ApprovalChain.newVersion` | `PLT_INVALID_INPUT` |
| BR-PLT-16 | จำนวนขั้นต่ำและขั้นที่ล็อก | `ApprovalChain.newVersion` | `PLT_STEP_LOCKED` |
| BR-PLT-17 | SLA การเตือน การยกระดับ | `SlaSweep`, `EscalationRule` | `PLT_SETTING_OUT_OF_RANGE` |
| BR-PLT-18 | ความยาวเหตุผล | `ReasonText` | `PLT_REASON_REQUIRED` |
| BR-PLT-19 | บันทึกเพิ่มอย่างเดียว | `CommandAudit` และไม่ให้สิทธิ์ update หรือ delete | ไม่มี |
| BR-PLT-20 | เลิกใช้หรือลบ | `Retirable.retire` | `PLT_IN_USE` |
| BR-PLT-21 | ปีงบประมาณ | `FiscalYear`, `FiscalCalendar.isOpen` | `PLT_YEAR_CLOSED` |
| BR-PLT-22 | วันทำการ | `WorkingCalendarImpl` | ไม่มี |
| BR-PLT-23 | การเก็บรักษา | `RetentionRule` และงานเก็บรักษา | `PLT_SETTING_OUT_OF_RANGE` |
| BR-PLT-24 | ฐานทางกฎหมาย | `DataDictionary`, `ConsentRecord` | ไม่มี ตรวจใน CI |
| BR-PLT-25 | ขีดจำกัดของ AI | `AssistantRouter` และทะเบียนเครื่องมือ | `PLT_AI_NOT_ALLOWED` |
| BR-PLT-26 | ระบบไม่ตัดสินแทน | `WorkItem` มีลิงก์ ไม่มีการทำรายการ | ไม่มี |

### ขีดจำกัดในโค้ดและค่าตั้งของหน่วยงาน {#plt-limits}

ค่าตั้งแต่ละรายการมีช่วงใน `SettingRange` และค่าใน `tenant_setting` พร้อมวันที่มีผล ช่วงที่ระบุว่าเสนอไม่มีในโค้ดและรอประเด็นที่ระบุ

| ค่าตั้ง | ช่วงในโค้ด | ค่าเริ่มต้นในข้อมูล | กฎ |
| --- | --- | --- | --- |
| `idleMin` | 5 ถึง 60 นาที เสนอใน XC-SEC-008 และ OI-PLT-06 | 30 | BR-PLT-05 |
| `warnMin` | เสนอ: อย่างน้อย 1 และน้อยกว่า `idleMin` ตาม OI-PLT-06 | 5 | BR-PLT-05 |
| `slaDays` ของขั้น | 1 ถึง 60 | 5 สำหรับขั้นใหม่ | BR-PLT-15 |
| `remind`, `after` | 0 ถึง 30 วัน | 1 | BR-PLT-17 |
| `to` | ทุกบทบาทยกเว้น `admin` | `exec` | BR-PLT-17 |
| ปีการเก็บรักษา | 1 ถึง 30 | ตามตาราง PDPA ใน SRS | BR-PLT-23 |
| `delegationOverlap` | `warn` หรือ `forbid` ตาม OI-PLT-01 | `warn` | PLT-FR-061 |
| ขั้นต่ำของเหตุผล | 10 ตัวอักษร คงที่ | ไม่ใช่ค่าตั้ง | BR-PLT-18 |

## สถานะและการเปลี่ยนสถานะ {#plt-states}

ชื่อสถานะตาม SRS การเปลี่ยนแต่ละครั้งเป็นเมธอดบน aggregate ซึ่งตรวจสถานะปัจจุบันและเงื่อนไข

### การมอบอำนาจ {#plt-state-delegation}

{{fig:plt-state-delegation | สถานะของการมอบอำนาจ}}

การมอบอำนาจเก็บวันที่และ `revoked_at` เมธอด `Delegation.state(today, parties)` คำนวณสถานะ จึงไม่มีงานอัตโนมัติมาเปลี่ยน `held` เป็นสถานะใหม่ เนื่องจากต้นแบบยังให้การมอบอำนาจทำงานขณะผู้เกี่ยวข้องถูกระงับ (PLT-FR-060)

| จาก | เป็น | คำสั่ง | เงื่อนไข | เหตุการณ์ |
| --- | --- | --- | --- | --- |
| (ไม่มี) | future, active | `Delegation.create` | BR-PLT-10 ถึง BR-PLT-13 และนโยบายการทับซ้อน | `delegation.created` |
| future | active | คำนวณ | ถึงวันเริ่ม | ไม่มี |
| active | expired | คำนวณ | พ้นวันสิ้นสุด | ไม่มี |
| active | held | คำนวณ | ผู้เกี่ยวข้องถูกระงับหรือเปลี่ยนบทบาท | ไม่มี |
| held | active | คำนวณ | ผู้เกี่ยวข้องเปิดใช้งานภายในช่วงวันที่ | ไม่มี |
| future, active, held | revoked | `Delegation.revoke` | ผู้มอบหรือ `plt.delegation.admin` พร้อมเหตุผล | `delegation.revoked` |

### บัญชีผู้ใช้ {#plt-state-user}

{{fig:plt-state-user | สถานะของบัญชีผู้ใช้}}

| จาก | เป็น | คำสั่ง | เงื่อนไข | ผล |
| --- | --- | --- | --- | --- |
| (ไม่มี) | รอตั้งค่า MFA | `UserAccount.create` | หน่วยงานยังใช้งาน บทบาทถูกต้อง | ผู้ใช้ Keycloak พร้อม required action |
| รอตั้งค่า MFA | ใช้งาน | เหตุการณ์จาก Keycloak | มี credential ของ MFA | บันทึก |
| ใช้งาน | ระงับ | `UserAccount.suspend` | เหตุผลอย่างน้อย 10 ตัวอักษร | เซสชันทั้งหมดสิ้นสุด การมอบอำนาจถูกพัก งานที่ค้างย้ายไปยังบทบาท |
| ระงับ | ใช้งาน | `UserAccount.reactivate` | ไม่มี | บันทึก |

### ขั้นอนุมัติ {#plt-state-approval}

{{fig:plt-state-approval | สถานะของขั้นอนุมัติ}}

| จาก | เป็น | คำสั่ง | เงื่อนไข | ผล |
| --- | --- | --- | --- | --- |
| (ไม่มี) | ข้าม รอการตัดสิน | `ApprovalRoutes.start` | เงื่อนไขของขั้น | รายการงานของขั้นแรกที่รอ |
| รอการตัดสิน | อนุมัติ | `ApprovalRoutes.decide` | สิทธิ์ และ `SodGuard` | เปิดขั้นถัดไป และโมดูลเปลี่ยนสถานะของตนเมื่อจบขั้นสุดท้าย |
| รอการตัดสิน | ส่งกลับ | `ApprovalRoutes.returnTo` | เหตุผล และขั้นปลายทางอยู่ก่อนหน้า | เปิดขั้นที่เลือก |
| รอการตัดสิน | ไม่อนุมัติ | `ApprovalRoutes.decide` | เหตุผล | อินสแตนซ์จบ และโมดูลเปลี่ยนสถานะของตน |

### คำขอของเจ้าของข้อมูล {#plt-state-dsr}

{{fig:plt-state-privacy | สถานะของคำขอของเจ้าของข้อมูล}}

| จาก | เป็น | คำสั่ง | เงื่อนไข |
| --- | --- | --- | --- |
| (ไม่มี) | รับเรื่อง | `DataSubjectRequest.open` | ประเภทเป็นการเข้าถึง การแก้ไข การลบ หรือการคัดค้าน |
| รับเรื่อง | ยืนยันตัวผู้ขอแล้ว | `verify` | แนบหลักฐานยืนยันตัวตน |
| ยืนยันตัวผู้ขอแล้ว | กำลังดำเนินการ | `start` | มีผู้รับผิดชอบ |
| กำลังดำเนินการ | เสร็จสิ้น | `fulfil` | แนบหลักฐาน และ `RetentionHold` ว่างสำหรับการลบ |
| รับเรื่อง กำลังดำเนินการ | ปฏิเสธ | `refuse` | แจ้งเหตุผลแก่ผู้ขอ |

> [!NOTE] สถานะปีงบประมาณและสถานะการเชื่อมต่อใช้ตารางอย่างง่ายใน SRS โค้ดไม่บังคับลำดับของสถานะปีงบประมาณ และ OI-PLT-10 จะตัดสินว่าควรบังคับหรือไม่

## พฤติกรรมเชิงพลวัต {#plt-dynamic}

<!-- covers: PDPA 23; PDPA 33; PDPA 37 -->

### การเข้าสู่ระบบและการหมดเวลา {#plt-activity-signin}

บท cross-cutting เก็บขั้นตอนของโทเค็น Keycloak ทำการเข้าสู่ระบบและ MFA และบังคับขีดจำกัดเวลาไม่ใช้งาน จากนั้น Platform ตัดสินว่าเซสชันเริ่มได้หรือไม่

{{fig:plt-activity-signin | การเข้าสู่ระบบและการหมดเวลา}}

- ประกาศความเป็นส่วนตัวแสดงก่อนการส่งต่อ ผู้ใช้จึงอ่านได้ก่อนมีเซสชัน (PLT-FR-108)
- เบราว์เซอร์ต่ออายุโทเค็นเฉพาะหลังมีการใช้งาน (PLT-FR-015) ขีดจำกัดของ Keycloak จึงวัดการใช้งานจริง และแท็บที่ไม่ใช้งานหรือปิดแล้วทำให้เซสชันสิ้นสุด (PLT-FR-017) คำเตือนทำงานในเบราว์เซอร์
- การระงับผู้ใช้หรือเปลี่ยนบทบาทจะเรียก Keycloak ให้จบเซสชันทั้งหมดของผู้ใช้นั้น (PLT-FR-018)
- บัญชีที่ถูกกันมาเป็นเหตุการณ์จาก Keycloak และ `SignInEvents` แจ้งผู้ดูแลระบบและผู้ตรวจสอบ (PLT-FR-019)

### การสร้างการมอบอำนาจ {#plt-activity-delegation}

{{fig:plt-activity-delegation | การสร้างการมอบอำนาจ}}

การตรวจการทับซ้อนเทียบผู้มอบ ขอบเขต และช่วงวันที่กับการมอบอำนาจที่ยังไม่สิ้นสุด เมื่อใช้ `warn` ฟอร์มแสดงการทับซ้อนและขอการยืนยันพร้อมเหตุผล เมื่อใช้ `forbid` คำสั่งปฏิเสธ และ row lock บนการมอบอำนาจของผู้มอบกันไม่ให้สองคำสั่งแข่งกัน จนกว่า OI-PLT-01 จะได้ข้อยุติ ค่าเริ่มต้นคือ `warn` ซึ่งคงสิ่งที่ต้นแบบอนุญาตแต่ทำให้มองเห็นได้

```sql
-- Proposal: the overlap query. Date ranges are inclusive, so [start, end] uses daterange '[]'.
SELECT id, delegate_id, start_on, end_on
  FROM platform.delegation
 WHERE delegator_id = :delegator AND scope = :scope AND revoked_at IS NULL
   AND daterange(start_on, end_on, '[]') && daterange(:start, :end, '[]')
   FOR UPDATE;
```

### การทำแทนและการตรวจการแยกหน้าที่ {#plt-seq-acting}

{{fig:plt-seq-acting | การทำแทนและการตรวจการแยกหน้าที่}}

- `Authorizer.actors(role, scope)` ให้ `ActorSet` แก่โมดูล เมื่อผู้ใช้ถือบทบาทโดยตรง ชุดนี้มีเฉพาะผู้ใช้และไม่มีการมอบอำนาจ เหมือน `sodActors` ในปัจจุบัน
- เมื่อมีการมอบอำนาจที่มีผลมากกว่าหนึ่งรายการ ตัวตรวจจะตรวจผู้มอบทุกคน และการตัดสินบันทึกรายการที่ผู้ใช้เลือก ฟอร์มให้เลือกเมื่อมีมากกว่าหนึ่งรายการ
- การปฏิเสธทำงานใน `REQUIRES_NEW` แถว `sod_block` และบันทึกจึงคงอยู่แม้คำสั่งถูกย้อนกลับ (PLT-NFR-003)
- การตัดสินที่สำเร็จเก็บผู้ทำ ผู้ถืออำนาจ และเลขที่การมอบอำนาจ และส่ง `delegation.used` เพื่อแจ้งผู้มอบ (PLT-FR-054)

### ขั้นอนุมัติ การแจ้งเตือน และการยกระดับ {#plt-seq-approval}

{{fig:plt-seq-approval | ขั้นอนุมัติ การแจ้งเตือน และการยกระดับ}}

- `ApprovalRoutes.start` ตรึงฉบับของสาย การแก้สายภายหลังจึงไม่กระทบอินสแตนซ์ (PLT-FR-065)
- การแจ้งเตือนผ่าน outbox อีเมลที่ล้มเหลวจึงไม่ย้อนการเปลี่ยนแปลงทางธุรกิจ และแสดงสถานะให้ผู้ใช้เห็น (ADR-0008)
- `SlaSweep` ใช้แทนปุ่มของต้นแบบ และครอบคลุมทุกขั้นที่เปิดอยู่ของทุกสาย ขณะที่ต้นแบบครอบคลุมสองสถานะของคำของบประมาณ (PLT-FR-078)
- กำหนดเสร็จใช้วันปฏิทินตามโค้ด โดยอยู่ในเมธอดเดียว OI-PLT-11 จึงเปลี่ยนได้โดยไม่แก้ที่อื่น

### การลบข้อมูลบุคคล {#plt-seq-erasure}

{{fig:plt-seq-erasure | การลบข้อมูลบุคคลโดยไม่ทำให้ห่วงโซ่บันทึกขาด}}

การลบทำลายกุญแจรายบุคคล (ADR-0015) และเพิ่มรหัสอ้างอิงลงในรายการการลบที่บท cross-cutting อธิบายไว้สำหรับการกู้คืน บันทึกคงรหัสอ้างอิงเดิม ห่วงโซ่ยังถูกต้อง และ `SubjectDirectory` คืนข้อความแทนนับจากนั้น เมื่อโมดูลมีหน้าที่ตามกฎหมายต้องเก็บรายการ `RetentionHold` จะระบุรายการนั้น และผู้ขอเห็นเหตุผล (ADR-0014, PLT-FR-112)

### ขั้นตอนเหตุละเมิด {#plt-breach}

`BreachCase` เริ่มนับเวลาเมื่อมีการบันทึกการทราบเหตุที่สงสัย รายการแสดงเวลาที่เหลือเทียบกำหนด 72 ชั่วโมง กำหนดสูงสุด 15 วันสำหรับการแจ้งล่าช้า ขั้นตอนแจ้งผู้ได้รับผลกระทบเมื่อมีความเสี่ยงสูง และสำหรับ tenant แบบเช่าใช้คือการรายงานจากผู้ให้บริการถึงผู้ควบคุมภายใน 72 ชั่วโมง ขีดจำกัดเป็นข้อมูลกฎที่มีวันที่ อ้าง PDPA 37 และการทบทวนทางกฎหมายของ ADR-0014 ต้องยืนยัน (OI-PLT-12)

### งานตามกำหนดเวลา {#plt-jobs}

งานทำงานต่อ cell และทีละ tenant โดยผูก tenant เหมือนคำขอเว็บ แต่ละงานรันซ้ำได้อย่างปลอดภัย และมี lock ให้ทำงานครั้งละหนึ่ง instance

| งาน | หน้าที่ | ข้อกำหนด |
| --- | --- | --- |
| ตรวจ SLA 07:00 น. | เตือนและยกระดับขั้นที่เปิดอยู่ | PLT-FR-077, PLT-FR-078 |
| การเก็บรักษา รายวัน | แจ้งล่วงหน้า 30 วัน แล้วลบหรือทำให้ระบุตัวไม่ได้เมื่อไม่ติดการเก็บตามกฎหมาย | PLT-FR-110, PLT-FR-111 |
| การตรวจห่วงโซ่ | ทำงานตามบท cross-cutting และ Platform แสดงผลล่าสุด | PLT-FR-092 |
| ทบทวนบัญชีสิทธิ์สูง | เปิดรายการงานทุกไตรมาส | PLT-FR-020 |
| สถานะการสำรองข้อมูล | อ่านสถานะการสำรองและทดสอบกู้คืน | PLT-FR-140 |
| ตัวส่งต่อ outbox | ส่งเหตุการณ์และลองซ้ำ adapter | ADR-0008 |

## การออกแบบข้อมูล {#plt-data}

<!-- covers: PDPA 33; PDPA 39; PDPA 41 -->

ตารางอยู่ใน schema `platform` ของคลัสเตอร์ PostgreSQL ของ cell (ADR-0005) โมดูลอื่นไม่อ่านตารางเหล่านี้โดยตรง แต่ใช้ `platform.api` กฎของทุกตารางในบท Procurement ใช้ที่นี่ด้วย ได้แก่ `tenant_id` ขึ้นต้นทุกคีย์ เปิดและบังคับ row-level security คอลัมน์ร่วม และการย้ายแบบ expand and contract

> [!NOTE] ทุกตาราง คอลัมน์ ชนิด และดัชนีในหัวข้อนี้เป็นข้อเสนอ ตารางเป็นการออกแบบเชิงตรรกะ และบทพจนานุกรมข้อมูลจะเก็บคอลัมน์สุดท้าย

{{fig:plt-er | ตารางหลักของ platform รายการเต็มอยู่ถัดไป}}

### ตาราง {#plt-data-tables}

Class คือชั้นข้อมูลตาม ADR-0013 ของทั้งแถว ข้อยกเว้นรายฟิลด์อยู่ในตารางถัดไป Retention key คือรายการในตารางการเก็บรักษาตาม ADR-0014 ไม่ระบุระยะเวลาเกินค่าเริ่มต้นใน SRS เพราะ OI-PLT-13 ยังเปิดอยู่

| ตาราง | คอลัมน์หลัก | Class | Retention key | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `tenant` | `id`, `cell_id`, `status`, `name`, `kind` | Internal | `plt.tenant` | PLT-FR-001, PLT-FR-005 |
| `tenant_setting` | `key`, `value`, `effective_from` | Internal | `plt.tenant` | PLT-FR-003, PLT-FR-004 |
| `unit` | `code`, `parent_id`, `name_th`, `name_en`, `retired_on`, `retired_why` | Internal | `plt.org` | PLT-FR-022, PLT-FR-023 |
| `subject` | `subject_ref`, `details_enc`, `key_ref`, `erased_at` | Restricted | `plt.subject` | PLT-DR-003, PLT-FR-115 |
| `user_account` | `subject_ref`, `role_id`, `unit_id`, `status`, `suspended_at`, `suspended_why`, `version` | Confidential | `plt.org` | PLT-FR-024 ถึง PLT-FR-028 |
| `role`, `role_authority` | `id`, `name_th`, `name_en`; `authority` | Internal | `plt.org` | PLT-FR-031, PLT-FR-037 |
| `sod_switch` | `rule_id`, `enabled`, `why`, `changed_by_ref` | Internal | `plt.sod` | PLT-FR-043, PLT-FR-044 |
| `sod_block` | `at`, `actor_ref`, `role_id`, `rule_id`, `item`, `clash_ref`, `delegation_id` | Confidential | `plt.sod` | PLT-FR-040, PLT-FR-045 |
| `delegation` | `no`, `delegator_id`, `delegate_id`, `scope`, `start_on`, `end_on`, `why`, `overlap_why`, `revoked_at`, `revoked_why` | Confidential | `plt.delegation` | PLT-FR-047 ถึง PLT-FR-061, PLT-DR-001 |
| `approval_chain`, `approval_step` | `key`, `version`, `effective_from`; `seq`, `owner_role`, `sla_days`, `condition`, `amount`, `locked` | Internal | `plt.approval` | PLT-FR-062, PLT-FR-063, PLT-FR-066 |
| `approval_instance`, `step_decision` | `chain_id`, `subject_type`, `subject_id`, `current_seq`; `seq`, `decider_ref`, `holder_ref`, `delegation_id`, `result`, `why` | Confidential | `plt.approval` | PLT-FR-064, PLT-FR-065, PLT-FR-067, PLT-FR-068 |
| `notice_template` | `event_key`, `subject_th`, `subject_en`, `body_th`, `body_en`, `channels` | Internal | `plt.notice` | PLT-FR-072 |
| `escalation_rule` | `step_id`, `remind_days`, `after_days`, `to_role` | Internal | `plt.notice` | PLT-FR-076 |
| `notice`, `notice_read` | `template_key`, `params`, `audience`, `link`; `notice_id`, `user_id`, `read_at` | Confidential | `plt.notice` | PLT-FR-069 ถึง PLT-FR-071 |
| `work_item` | `kind`, `title_key`, `params`, `assignee_user`, `assignee_role`, `assignee_unit`, `due_on`, `link`, `severity`, `state`, `instance_id` | Internal | `plt.work` | PLT-FR-079 ถึง PLT-FR-085 |
| `page_pin`, `page_recent` | `user_id`, `link`, `label`, `at` | Internal | `plt.work` | PLT-FR-086 |
| `audit_entry` | `seq`, `at`, `subject_ref`, `role_id`, `action`, `item_type`, `item_id`, `outcome`, `delegation_no`, `prev_hash`, `hash` | Internal | `plt.audit` | PLT-FR-087 ถึง PLT-FR-094 |
| `audit_checkpoint` | `seq`, `hash`, `at`, `store_ref` | Internal | `plt.audit` | PLT-FR-092 |
| `fiscal_year` | `fy`, `status`, `start_on`, `end_on`, `status_why` | Internal | `plt.master` | PLT-FR-097 ถึง PLT-FR-099 |
| `calendar_milestone`, `holiday` | `fy`, `name`, `on_date`, `owner_role`, `custom`; `day`, `name` | Internal | `plt.master` | PLT-FR-100, PLT-FR-101 |
| `budget_type`, `standard_price` | `code`, `name`; `no`, `type_id`, `name`, `unit`, `price`, `retired_on` | Internal | `plt.master` | PLT-FR-102, PLT-FR-103 |
| `policy_page`, `policy_version` | `kind`; `version_no`, `body_th`, `body_en`, `published_on` | Public | `plt.site` | PLT-FR-105 ถึง PLT-FR-107 |
| `retention_rule` | `key`, `years`, `basis`, `legal_min_years` | Internal | `plt.privacy.case` | PLT-FR-109 ถึง PLT-FR-112 |
| `data_dictionary_entry` | `module`, `table_name`, `column_name`, `class`, `purpose`, `legal_basis`, `retention_key` | Internal | `plt.privacy.case` | PLT-FR-113 |
| `data_subject_request` | `kind`, `requester_ref`, `due_on`, `state`, `owner_ref`, `evidence_key`, `refusal_basis` | Confidential | `plt.privacy.case` | PLT-FR-114 |
| `breach_case` | `aware_at`, `risk`, `pdpc_told_at`, `subjects_told_at`, `controller_told_at`, `state` | Confidential | `plt.privacy.case` | PLT-FR-116 |
| `processing_activity` | `role`, `purpose`, `categories`, `recipients`, `retention_key` | Internal | `plt.privacy.case` | PLT-FR-117 |
| `consent_record` | `subject_ref`, `purpose`, `notice_version`, `given_at`, `withdrawn_at` | Confidential | `plt.privacy.case` | PLT-FR-119 |
| `ai_thread`, `ai_message`, `ai_use` | `user_id`, `title`, `agent`, `pinned`; `role`, `text_enc`, `steps`; `agent`, `user_ref`, `action`, `target`, `source_count` | Confidential | `plt.ai.use` | PLT-FR-127 ถึง PLT-FR-135, PLT-DR-007 |
| `interface_status`, `backup_status` | `interface_id`, `direction`, `method`, `status`, `last_run_at`, `row_count`; `full_at`, `incremental_at`, `restore_test_at` | Internal | `plt.ops` | PLT-FR-139, PLT-FR-140, PLT-IR-006 |
| `operator_access` | `operator_ref`, `tenant_id`, `reason`, `approved_by`, `from_at`, `to_at` | Confidential | `plt.audit` | ADR-0013 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | `plt.outbox` | ADR-0008 |

### ฟิลด์ข้อมูลส่วนบุคคลและข้อมูล Restricted {#plt-data-fields}

ตารางนี้ป้อนให้พจนานุกรมข้อมูลและบันทึกกิจกรรมการประมวลผล (ADR-0014, PDPA 39, PLT-DR-005) ฐานทางกฎหมายของแต่ละฟิลด์ให้เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลยืนยัน

| ฟิลด์ | Class | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `subject.details_enc` | Restricted | AES-256-GCM ผ่าน Tink ด้วยกุญแจรายบุคคลที่ห่อด้วยกุญแจ tenant | การทำลายกุญแจคือการลบบุคคล (ADR-0015) |
| คอลัมน์ `*_ref` | Confidential | รหัสอ้างอิงแทนตัวบุคคล | รายงานแสดงข้อความแทนหลังลบ |
| `delegation.why`, `user_account.suspended_why`, `step_decision.why` | Confidential | เข้ารหัสในที่เก็บ เข้าถึงตามบทบาท | อยู่ในรายการธุรกิจ ไม่อยู่ในบันทึก (PLT-DR-004) |
| `ai_message.text_enc` และไฟล์แนบ | Confidential และอาจเป็น Restricted | เข้ารหัสฟิลด์ เจ้าของเท่านั้น สแกนไฟล์ด้วย ClamAV | ระยะเวลาตามประเภทประวัติการสนทนา (PLT-DR-007) |
| `notice.params` | Confidential | รหัสอ้างอิง ไม่มีชื่อ | สร้างข้อความตอนอ่าน |
| `data_subject_request`, `breach_case` | Confidential | เข้าถึงตามบทบาทของเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล | ไฟล์หลักฐานใช้กุญแจ tenant |

### ไฟล์ การค้นหา และการเก็บรักษา {#plt-data-files}

- หลักฐานและไฟล์แนบของแชตเป็นวัตถุใน S3 API เชื่อมด้วยคีย์ สแกนก่อนดาวน์โหลด และเข้ารหัสด้วยกุญแจ tenant (ADR-0010)
- OpenSearch ทำดัชนีหน้า หน่วยงาน และข้อมูลหลักสำหรับช่องค้นหา โดยทุกคำค้นกรองตาม tenant และสิทธิ์ที่เซิร์ฟเวอร์ (ADR-0009) ข้อมูล Restricted ไม่ถูกทำดัชนี
- Retention key แต่ละรายการชี้ไปยังหนึ่งแถวของ `retention_rule` และทุกโมดูลลงทะเบียนคีย์ผ่าน `RetentionRegistry`

## การออกแบบส่วนเชื่อมต่อ {#plt-interfaces}

REST API อธิบายด้วย OpenAPI 3.1 (ADR-0003) และเหตุการณ์ด้วย AsyncAPI (ADR-0008) tenant มาจากโทเค็น ไม่ใช่ path คำสั่งที่เปลี่ยนสถานะใช้ `If-Match` พร้อมเวอร์ชันของ aggregate

### REST endpoint {#plt-rest}

> [!NOTE] รายการ endpoint นี้เป็นข้อเสนอ path อ้างอิงจาก `/api/v1/platform` และชื่อสิทธิ์กำหนดในหัวข้อความมั่นคงปลอดภัย

| เมธอดและ path | วัตถุประสงค์ | สิทธิ์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `GET /me`; `POST /me/sign-out` | ผู้ใช้ที่เข้าสู่ระบบ การออกจากระบบ | ทุกเซสชัน | PLT-FR-013 ถึง PLT-FR-017 |
| `GET, PUT /tenant/settings` | ค่าตั้งของ tenant | `plt.tenant.write` | PLT-FR-003, PLT-FR-004 |
| `GET, POST /units`; `GET, PUT /units/{id}`; `POST /units/{id}/retire, reinstate`; `DELETE /units/{id}` | หน่วยงาน | `plt.org.write` | PLT-FR-022, PLT-FR-023 |
| `GET, POST /users`; `GET, PUT /users/{id}`; `POST /users/{id}/suspend, reactivate` | ผู้ใช้ | `plt.org.write` | PLT-FR-024 ถึง PLT-FR-028 |
| `GET /roles`; `GET /permission-matrix` | บทบาทและตารางสิทธิ์ | `plt.org.read` | PLT-FR-031, PLT-FR-033, PLT-FR-034 |
| `GET /duty-rules`; `PUT /duty-rules/{id}`; `GET /duty-blocks` | กฎและการกัน | `plt.sod.read`, `plt.sod.write` | PLT-FR-038, PLT-FR-043 ถึง PLT-FR-045 |
| `GET, POST /delegations`; `POST /delegations/overlap-check`; `POST /delegations/{id}/revoke` | การมอบอำนาจ | `plt.delegation.give`, `plt.delegation.admin` | PLT-FR-047 ถึง PLT-FR-061 |
| `GET, POST /approval-chains`; `GET /approval-chains/{key}/versions/{v}` | สายและฉบับ | `plt.route.write` | PLT-FR-062, PLT-FR-063, PLT-FR-066 |
| `GET, PUT /notice-templates`; `POST /notice-templates/{id}/preview`; `GET, PUT /escalation-rules` | แม่แบบและ SLA | `plt.notice.write` | PLT-FR-072, PLT-FR-076 |
| `GET /notices`; `POST /notices/{id}/read`; `POST /notices/read-all` | การแจ้งเตือนของผู้ใช้ | ทุกเซสชัน | PLT-FR-069 ถึง PLT-FR-071 |
| `GET /work`; `GET /work/approvals`; `GET /work/exceptions`; `GET, POST, DELETE /work/pins`; `GET /work/recent` | งานของฉัน | ทุกเซสชัน โดยกรองแล้ว | PLT-FR-079 ถึง PLT-FR-086 |
| `GET /audit`; `GET /audit/export`; `GET /history/{type}/{id}` | บันทึก การส่งออก ประวัติรายการ | `plt.audit.read` และสิทธิ์อ่านของรายการนั้น | PLT-FR-089, PLT-FR-090, PLT-FR-096 |
| `GET, POST /fiscal-years`; `PUT /fiscal-years/{fy}/status` | ปีงบประมาณ | `plt.master.write` | PLT-FR-097, PLT-FR-098 |
| `GET, POST, PUT, DELETE /calendar-milestones`; `GET, POST, DELETE /holidays` | ปฏิทิน | `plt.master.write` | PLT-FR-100, PLT-FR-101 |
| `GET /budget-types`; `GET, POST, PUT /standard-prices`; `POST /standard-prices/{id}/retire, reinstate` | งบรายจ่ายและราคา | `plt.price.write` | PLT-FR-102 ถึง PLT-FR-104 |
| `GET /policies`; `GET /policies/{kind}`; `POST /policies/{kind}/versions` | หน้านโยบาย เปิดให้ทุกคนอ่าน | อ่านไม่ต้องมีสิทธิ์ เผยแพร่ใช้ `plt.site.write` | PLT-FR-106, PLT-FR-107 |
| `GET, PUT /retention`; `GET /privacy/dictionary`; `GET /privacy/ropa` | การเก็บรักษา พจนานุกรม ROPA | `plt.privacy.read`, `plt.retention.write` | PLT-FR-109, PLT-FR-113, PLT-FR-117 |
| `GET, POST /privacy/requests`; `POST /privacy/requests/{id}/verify, start, fulfil, refuse` | คำขอของเจ้าของข้อมูล | `plt.privacy.case` | PLT-FR-114, PLT-FR-115 |
| `GET, POST /privacy/breaches`; `POST /privacy/breaches/{id}/notify` | เหตุละเมิด | `plt.privacy.case` | PLT-FR-116 |
| `GET /systems`; `GET /search` | รายการระบบและการค้นหา | ทุกเซสชัน โดยกรองแล้ว | PLT-FR-120 ถึง PLT-FR-126 |
| `GET, POST, DELETE /cowork/threads`; `POST /cowork/threads/{id}/messages` | ผู้ช่วย AI | `plt.ai.use` เฉพาะเธรดของตน | PLT-FR-127 ถึง PLT-FR-136 |
| `GET /interfaces`; `POST /interfaces/{id}/run`; `GET /backup-status` | การเชื่อมต่อและสถานะการสำรอง | `plt.interface.read`, `plt.interface.run` | PLT-FR-139, PLT-FR-140 |

### รายการข้อผิดพลาด {#plt-errors}

> [!NOTE] รหัสเหล่านี้เป็นข้อเสนอและเป็นไปตามแบบจำลองข้อผิดพลาดในบท cross-cutting เซสชันที่สิ้นสุดตอบ 401 โดยไม่มีรหัสโมดูล

| รหัส | HTTP | ความหมาย | กฎหรือข้อกำหนด |
| --- | --- | --- | --- |
| `PLT_INVALID_INPUT` | 400 | ฟิลด์ไม่ผ่านการตรวจ | BR-PLT-10, BR-PLT-15 |
| `PLT_REASON_REQUIRED` | 400 | ไม่มีเหตุผลหรือสั้นเกินไป | BR-PLT-18, PLT-FR-044 |
| `PLT_ACCOUNT_SUSPENDED` | 403 | บัญชีถูกระงับ | BR-PLT-04, PLT-FR-012 |
| `PLT_FORBIDDEN` | 403 | ผู้ใช้ไม่มีสิทธิ์ | PLT-FR-036 |
| `PLT_SOD_BLOCKED` | 403 | กฎแยกหน้าที่ปฏิเสธบุคคลนี้ และบันทึกการพยายามแล้ว | BR-PLT-08, PLT-FR-040 |
| `PLT_AI_NOT_ALLOWED` | 403 | เครื่องมือปิดอยู่ หรือคำขออยู่นอกขีดจำกัดของ AI | BR-PLT-25, PLT-FR-129 |
| `PLT_NOT_FOUND` | 404 | ไม่มีรายการ หรือเป็นของ tenant อื่น | BR-PLT-01 |
| `PLT_VERSION_CONFLICT` | 409 | รายการเปลี่ยนหลังจากอ่าน | ADR-0005 |
| `PLT_DELEGATE_NOT_ALLOWED` | 409 | บุคคลนี้ให้หรือรับการมอบอำนาจนี้ไม่ได้ | BR-PLT-12, BR-PLT-13 |
| `PLT_DELEGATION_OVERLAP` | 409 | การมอบอำนาจทับซ้อนภายใต้นโยบาย `forbid` หรือต้องการการยืนยันภายใต้ `warn` | PLT-FR-061 |
| `PLT_RULE_LOCKED` | 409 | กฎแยกหน้าที่นี้ปิดไม่ได้ | BR-PLT-09, PLT-CR-006 |
| `PLT_STEP_LOCKED` | 409 | ขั้นนี้ลบหรือแก้ไม่ได้ | BR-PLT-16 |
| `PLT_IN_USE` | 409 | รายการถูกใช้แล้ว ให้เลิกใช้ | BR-PLT-20 |
| `PLT_YEAR_CLOSED` | 409 | ปีงบประมาณปิดแล้ว | BR-PLT-21 |
| `PLT_RETENTION_HOLD` | 409 | กฎหมายกำหนดให้เก็บรายการนี้ | PLT-FR-112 |
| `PLT_SETTING_OUT_OF_RANGE` | 422 | ค่าตั้งอยู่นอกช่วงที่อนุญาต | BR-PLT-17, BR-PLT-23 |

### รายการเหตุการณ์ {#plt-events}

> [!NOTE] รายการเหตุการณ์นี้เป็นข้อเสนอ แต่ละเหตุการณ์เขียนลง `outbox_event` ในธุรกรรมของการเปลี่ยนแปลง และตัวส่งต่อเผยแพร่ไปยัง RabbitMQ (ADR-0008) การติดตั้งขนาดเล็กประมวลผล outbox โดยไม่ใช้ RabbitMQ ผู้รับตัดรายการซ้ำด้วย `eventId` routing key ขึ้นต้นด้วย `platform.`

ทุกเหตุการณ์มี `eventId` `tenantId` `occurredAt` และ `aggregateId` และฟิลด์ด้านล่าง เนื้อหาเก็บรหัสอ้างอิง ไม่เก็บข้อมูลส่วนบุคคล

| เหตุการณ์ | ผู้ส่ง | ฟิลด์เพิ่มเติม | ผู้รับ |
| --- | --- | --- | --- |
| `tenant.onboarded`, `tenant.settings-changed` | `tenancy` | `key` | ทุกโมดูล |
| `user.suspended`, `user.role-changed` | `UserAccount` | `userId` | `identity`, `work`, `delegation` |
| `sod.rule-switched`, `sod.blocked` | `sod` | `ruleId`, `enabled` | การแจ้งเตือนถึงผู้ตรวจสอบ |
| `delegation.created`, `delegation.revoked`, `delegation.used` | `Delegation`, `Delegations` | `no`, `scope`, `delegatorId`, `delegateId` | การแจ้งเตือน และ `work` |
| `approval.step-opened`, `approval.step-decided`, `approval.finished` | `ApprovalInstance` | `chainKey`, `seq`, `result` | `work` และโมดูล |
| `notice.requested` | `Notifier` | `templateKey`, `channels` | adapter อีเมลและ LINE |
| `audit.chain-broken` | `ChainVerifier` | `seq` | การแจ้งเตือนถึงผู้ตรวจสอบ และ SIEM |
| `master.fiscal-year-opened`, `master.fiscal-year-status-changed` | `FiscalYear` | `fy`, `status` | `budget`, `finance` |
| `privacy.request-due`, `privacy.breach-clock` | `privacy` | `dueAt` | การแจ้งเตือนถึงเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| `subject.erased` | `privacy` | `subjectRef` | ทุกโมดูล |

### Adapter ภายนอก {#plt-adapters}

Adapter ทำงานบนเส้นทาง outbox ลองซ้ำได้อย่างปลอดภัย และแสดงสถานะให้ผู้ใช้เห็น (ADR-0008)

| Adapter | Port | การติดตั้งแรก | พฤติกรรม | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| ตัวตน | `IdentityAdmin` | Keycloak admin API และ event listener | สร้างผู้ใช้ จบเซสชัน รับเหตุการณ์เข้าสู่ระบบ | PLT-IR-001, PLT-CR-001 |
| อีเมล | `MailChannel` | SMTP ของ tenant | ส่งหลัง commit ไม่มีข้อมูล Restricted | PLT-FR-074 |
| SMS, LINE | `MessageChannel` | ไม่มีจนกว่า OI-PLT-14 จะตัดสิน | ข้อความอ้างอิงเท่านั้น ไม่มีข้อมูลส่วนบุคคล | PLT-FR-075 |
| SIEM | `AuditForwarder` | Syslog ผ่าน TLS เป็นข้อเสนอ | ส่งรายการที่มีเฉพาะรหัสอ้างอิง | PLT-FR-095, PLT-IR-005 |
| ผู้ให้บริการโมเดล | `AiGateway` | ราย tenant ปิดเป็นค่าเริ่มต้น | นำข้อมูลส่วนบุคคลออกและบันทึกทุกการเรียก (ADR-0016) | PLT-FR-136, PLT-CR-008 |
| ThaID | `CitizenIdentity` | ไม่มีจนกว่าจะยืนยันเงื่อนไขการเข้าร่วม | เชื่อมผ่าน Keycloak | PLT-FR-021 |

> [!OPEN] เงื่อนไขการเข้าร่วม ThaID สำหรับผลิตภัณฑ์ SaaS และการทดสอบภาระ Keycloak Organizations ที่ 500 tenant เป็นประเด็นค้างของ ADR-0006 กรมการปกครองต้องยืนยันเรื่องแรก และทีมพัฒนาต้องทดสอบเรื่องที่สองก่อนกำหนดขนาด cell

## การออกแบบความมั่นคงปลอดภัย {#plt-security}

<!-- covers: PDPA 37; PDPA 40 -->

Keycloak ทำการเข้าสู่ระบบ (ADR-0006) และ Platform ตัดสินเรื่องอื่นทั้งหมด ทุกคำขอตรวจโทเค็น ผูก tenant ด้วย `SET LOCAL app.tenant_id` ตรวจสิทธิ์ ตรวจหน้าที่ และตรวจกฎธุรกิจตามลำดับก่อนบันทึก Platform อยู่ที่ OWASP ASVS Level 2 (ADR-0017) คำสั่งด้านการเงินและการจ่ายเงินที่ Level 3 อาศัย `Authorizer` และ `SodGuard` ส่วนเชื่อมต่อทั้งสองจึงต้องทบทวนร่วมกับคำสั่งเหล่านั้น

### สิทธิ์ {#plt-authorities}

> [!NOTE] ชื่อสิทธิ์เป็นข้อเสนอ บทบาทจับคู่กับสิทธิ์เป็นข้อมูลของ tenant (PLT-FR-037) และค่าเริ่มต้นเหล่านี้ตามตารางผู้เกี่ยวข้องใน SRS

| สิทธิ์ | บทบาทเริ่มต้น | อนุญาต |
| --- | --- | --- |
| `plt.tenant.write` | `admin` | ค่าตั้งของ tenant |
| `plt.org.write`, `plt.org.read` | `admin`; `admin`, `audit` | หน่วยงานและผู้ใช้ การอ่าน |
| `plt.sod.write`, `plt.sod.read` | `admin`; `admin`, `audit` | สวิตช์กฎ การอ่านกฎและการกัน |
| `plt.delegation.give` | `exec` `plan` `fin` ตามขอบเขต | มอบอำนาจ |
| `plt.delegation.admin` | `admin` | เห็นทั้งหมดและยกเลิก |
| `plt.route.write`, `plt.notice.write` | `admin` | สาย แม่แบบ SLA |
| `plt.audit.read` | `admin`, `audit` | บันทึกและการส่งออก |
| `plt.master.write` | `admin` | ปีงบประมาณ ปฏิทิน วันหยุด |
| `plt.price.write` | `admin`, `fin` | ราคามาตรฐาน |
| `plt.site.write`, `plt.retention.write` | `admin` | ข้อความนโยบาย การเก็บรักษา |
| `plt.privacy.case`, `plt.privacy.read` | `dpo` และ `dpo` `audit` ดู DG-PLT-09 | คำขอ เหตุละเมิด การอ่านพจนานุกรมและ ROPA |
| `plt.interface.read`, `plt.interface.run` | `admin` `fin` ตามการเชื่อมต่อ | สถานะและการรัน |
| `plt.ai.use` | บทบาทที่ tenant อนุญาต เฉพาะเมื่อเปิด AI | ผู้ช่วย AI |

### กลไกการแยกหน้าที่ {#plt-sod}

`SodGuard` ไม่มีความรู้ทางธุรกิจ โมดูลที่เรียกระบุกฎและส่งกลุ่มที่เปรียบเทียบ และตัวตรวจเพิ่มผู้มอบ กฎทุกข้อในทะเบียนของ SRS เป็นรายการในแคตตาล็อกที่มีจุดบังคับใช้อย่างน้อยหนึ่งจุด และการทดสอบสถาปัตยกรรมจะไม่ผ่านเมื่อกฎไม่มีจุดบังคับใช้ ซึ่งปิดช่องว่าง SD-03 (PLT-FR-046) SD-07, SD-10 และเส้นทาง SD-06 ที่สองเข้าสู่ตัวตรวจเพื่อให้บันทึกการกัน ส่วน SD-09 เข้าตามการตัดสินของบท BGT

| กลุ่ม | กฎ | คำสั่งอยู่ใน |
| --- | --- | --- |
| จัดซื้อ | SD-01, SD-02, SD-06, SD-07, SD-08 | `procurement` ดูบท PRC |
| การเงิน | SD-03, SD-04, SD-05, SD-11, SD-12, SD-13, SD-14, SD-15, SD-16, P-F05 | `finance` ดูบท FIN |
| งบประมาณ | SD-09, SD-10 | `budget` ดูบท BGT |

```java
// Proposal. Every delegator in the set is compared, which the prototype's single match does not do.
public record ActorSet(UserId user, RoleId role, List<Delegation> via) {
    public Set<UserId> people() {
        var ids = new LinkedHashSet<UserId>(List.of(user));
        via.forEach(d -> ids.add(d.delegator()));
        return ids;
    }
}
```

### เซสชันและการแยก tenant {#plt-sessions}

- โทเค็นแต่ละใบระบุ organization ของ tenant `TenantBinding` ปฏิเสธโทเค็นที่ organization ไม่ได้อยู่บน cell นี้
- role ของแอปพลิเคชันไม่มีสิทธิ์ข้าม row-level security และ CI ทดสอบทุกตาราง (ADR-0005)
- `SessionPolicy` ส่ง `idleMin` ของ tenant ให้ Keycloak Keycloak เก็บเวลาไม่ใช้งานต่างกันราย organization ได้หรือไม่เป็น DG-PLT-03
- เจ้าหน้าที่ผู้ให้บริการอ่านข้อมูล tenant ไม่ได้หากไม่มีเหตุผลที่บันทึกและอนุมัติใน `operator_access` โดย row-level security บังคับช่วงเวลา (ADR-0013, DG-PLT-08)

### Audit {#plt-audit}

- บท cross-cutting เก็บเรื่องบันทึกเอง ได้แก่ สิทธิ์บนตาราง ตัวเชื่อมที่กำหนด `seq` และ `hash` ทันทีหลัง commit และจุดตรวจ
- `ChainVerifier` ส่ง `audit.chain-broken` เมื่อไม่ตรงกัน และหน้าบันทึกแสดงผลล่าสุด (PLT-FR-092)
- รายการเก็บรหัสอ้างอิงบุคคล รหัสการกระทำ และรหัสรายการ ไม่เก็บชื่อหรือข้อความอิสระ `RecordHistory` รวมบันทึก การใช้ AI เวอร์ชัน และความเห็นของรายการตอนอ่าน (PLT-FR-096)
- การเปิดดูฟิลด์ Restricted เขียนบันทึก (PLT-FR-094) บันทึกของแอปพลิเคชันและ telemetry ไม่มีข้อมูลส่วนบุคคล และมีการทดสอบตรวจ (ADR-0015, ADR-0017)

### การควบคุม AI {#plt-ai-security}

- การเรียก AI ทุกครั้งผ่าน `AiGateway` AI ปิดเป็นค่าเริ่มต้น และทุกความสามารถทำงานได้เมื่อปิด (ADR-0016, PLT-FR-136)
- `AssistantRouter` ปฏิเสธคำขอตาม BR-PLT-25 ก่อนเรียกโมเดล และทะเบียนเครื่องมือของโมดูลไม่มีเครื่องมือตัดสินใจ รายการคำในต้นแบบเป็นชุดทดสอบ และทะเบียนเป็นตัวควบคุม
- การเปลี่ยนแปลงที่เสนอเป็นปุ่มที่เรียกคำสั่งปกติ สิทธิ์และกฎแยกหน้าที่จึงมีผลกับผู้กด (PLT-FR-135)
- เกตเวย์นำข้อมูลส่วนบุคคลออก ใช้นโยบายของ tenant และบันทึกทุกการเรียก ข้อมูล Restricted ไม่ถูกส่ง (ADR-0016)

## การออกแบบที่ไม่ใช่ฟังก์ชัน {#plt-nfr}

ตารางแสดงวิธีตอบความต้องการที่ไม่ใช่ฟังก์ชันของ Platform เป้าหมายอื่นอยู่ในบท cross-cutting

| ข้อกำหนด | คำตอบการออกแบบ | ตรวจโดย |
| --- | --- | --- |
| PLT-NFR-001 | การแจ้งเตือนในระบบเป็นแถวที่เขียนในธุรกรรม กระดิ่งอ่านเมื่อ poll หรือ push ครั้งถัดไป | Integration test พร้อมนาฬิกา |
| PLT-NFR-002 | สถานะคำนวณจากวันที่ที่เซิร์ฟเวอร์ตามเขตเวลาของ tenant และฉีด `Clock` สำหรับการทดสอบ | `DelegationStateTest` |
| PLT-NFR-003 | `SodGuardImpl` เขียนใน `REQUIRES_NEW` | `SodRefusalIT` |
| PLT-NFR-004 | ความสามารถสำหรับการสาธิตไม่อยู่ใน build จริง และ test profile เก็บข้อมูลตัวอย่าง | การตรวจ build |
| PLT-NFR-005 | ไฟล์ข้อความและแม่แบบสองภาษา แม่แบบบันทึกไม่ได้เมื่อขาดภาษาใดภาษาหนึ่ง | Unit test และ Playwright สองภาษา |
| PLT-NFR-006 | adapter สำหรับทดสอบที่มีป้ายอยู่เฉพาะใน test profile | การตรวจ build |

### ภาระงานและความพร้อมใช้งาน {#plt-nfr-load}

- การตรวจของ Platform ทำงานทุกคำขอ การค้นสิทธิ์ การมอบอำนาจ และหน้าที่จึงต้องใช้ทรัพยากรน้อย `Delegations.activeFor` ใช้ดัชนีบนผู้รับมอบและวันที่ และการให้สิทธิ์เก็บแคชราย tenant โดยล้างเมื่อเปลี่ยนแปลง
- คำสั่งเขียนบันทึกโดยไม่มี lock ร่วม เพราะตัวเชื่อมทำงานหลัง commit สคริปต์ k6 ต้องวัดว่าตัวเชื่อมตามหลังเท่าใดช่วงพีควันที่ 30 กันยายน (ADR-0017)
- รายการ `work_item` แบ่งหน้าตามผู้รับงานและกำหนด งานของฉันจึงไม่สแกนโมดูล
- Keycloak เป็นสิ่งที่ต้องพึ่งเฉพาะตอนเข้าสู่ระบบ เซสชันที่ทำงานอยู่ใช้ต่อได้ระหว่าง Keycloak ขัดข้องชั่วคราวจนกว่าโทเค็นหมดอายุ

> [!OPEN] XC-PER-001 ถึง XC-PER-008 เป็นข้อเสนอ และการตรวจในทุกคำขออยู่ภายในเป้าหมาย API ตาม XC-PER-001 และ XC-PER-002 โดยไม่มีเป้าหมายของตนเอง เจ้าของผลิตภัณฑ์ต้องยืนยัน (OI-XC-01) ก่อนที่การทดสอบภาระจะตัดสินผ่านหรือไม่ผ่านได้ (DG-PLT-14)

## การออกแบบการทดสอบ {#plt-tests}

Sweep ใน `tests/sweep.js` ทำงานในหน้าต้นแบบและทดสอบเซิร์ฟเวอร์ไม่ได้ แต่การตรวจยังเป็นคำอธิบายพฤติกรรมที่ตั้งใจ แต่ละรายการจึงเป็นการทดสอบของระบบจริง การทดสอบทุกรายการระบุข้อกำหนดที่พิสูจน์ เพื่อวัดความครอบคลุมได้ (ADR-0017)

> [!NOTE] ชื่อคลาสทดสอบเป็นข้อเสนอ

### ระดับการทดสอบ {#plt-test-levels}

| ระดับ | เครื่องมือ | ครอบคลุม |
| --- | --- | --- |
| Unit | JUnit | `Delegation.state` ทุกกรณีวันที่และผู้เกี่ยวข้อง `OverlapPolicy` `ActorSet` `SettingRange` `WorkingCalendar` และ hash |
| สถาปัตยกรรม | Spring Modulith `verify`, ArchUnit | ไม่พึ่งพาโมดูลธุรกิจ ไม่คำนวณวันที่นอกปฏิทิน กฎทุกข้อมีจุดบังคับใช้ |
| Integration | JUnit กับ Testcontainers: PostgreSQL, RabbitMQ, Keycloak | คำสั่งผ่านชั้น REST row-level security ทุกตาราง ห่วงโซ่บันทึก การลบ |
| สถานการณ์ข้ามโมดูล | Spring Modulith `Scenario` | การอนุมัติแทนจากโมดูลธุรกิจ |
| End to end | Playwright | การเข้าสู่ระบบ คำเตือนหมดเวลา ตัวเปิดระบบ งานของฉัน ทั้งไทยและอังกฤษ |
| ภาระ | k6 | การเข้าสู่ระบบและการเขียนบันทึกช่วงพีควันที่ 30 กันยายน |
| ความมั่นคงปลอดภัย | OWASP ZAP, SonarQube, การทดสอบเจาะระบบ | ระดับ ASVS ตาม ADR-0017 |

### จากการตรวจใน sweep สู่การทดสอบของระบบจริง {#plt-test-walks}

| การตรวจใน sweep | การทดสอบของระบบจริง | ส่วนที่เพิ่มจากการตรวจ | ข้อกำหนด |
| --- | --- | --- | --- |
| FC1 walk และ `sodCheck` | `SodRefusalIT` | ทุกกฎ ทั้งบุคคลและผู้มอบ มีแถวบันทึก และสถานะไม่เปลี่ยน | PLT-FR-039 ถึง PLT-FR-042, PLT-NFR-003 |
| การตรวจหมดเวลารอบ 66 | `IdleTimeoutIT`; `idle.spec` | เซิร์ฟเวอร์จบเซสชันเมื่อปิดแท็บ คำเตือนและการใช้งานต่อ | PLT-FR-015 ถึง PLT-FR-017 |
| การตรวจเว็บไซต์รอบ 65 | `site.spec` | ค่าของ tenant เติมหน้า เก็บฉบับที่เผยแพร่ | PLT-FR-105 ถึง PLT-FR-107 |
| ขั้นตรวจทาน | `record-action.spec` | พิมพ์รหัสเมื่อเลิกทำไม่ได้ และการเลิกทำแบบชดเชย | PLT-FR-141 ถึง PLT-FR-143 |
| E2E walk E-01 | `FiscalYearOpenIT` | ปีที่ปิดปฏิเสธการแก้ไข สถานะต้องมีเหตุผล | PLT-FR-097 ถึง PLT-FR-099 |
| Sweep แบบเปิดหน้า | `role-matrix.spec` ทุกหน้าของทุกบทบาท ทั้งสองภาษา | ไม่ผ่านเมื่อมีข้อผิดพลาดในคอนโซลหรือข้อความเสีย | แถว Partial โดยทั่วไป |

### การทดสอบที่ไม่มีต้นทางใน sweep {#plt-test-new}

| การทดสอบ | ยืนยัน | ข้อกำหนด |
| --- | --- | --- |
| `DelegationOverlapIT` | การทับซ้อนของผู้รับมอบคนเดียวและสองคน ภายใต้ `warn` และ `forbid` การแข่งกันของสองคำสั่ง และการยกเลิกหนึ่งในสองรายการ | PLT-FR-061, OI-PLT-01 |
| `TwoDelegatorsSodIT` | ผู้ใช้ที่ถือขอบเขตจากสองคนถูกปฏิเสธเมื่อขัดกับคนที่สอง | PLT-FR-042 |
| `DelegationLifecycleIT` | ขอบเขตและวันที่มีผล ผู้เกี่ยวข้องที่ถูกระงับทำให้พักไว้ ไม่มีการมอบต่อ และทุกขอบเขตเข้างานของฉัน | PLT-FR-050, PLT-FR-058 ถึง PLT-FR-060 |
| `SignInIT` | ปฏิเสธบัญชีที่ระงับ บังคับ MFA และจบเซสชันเมื่อบทบาทเปลี่ยน | PLT-FR-009 ถึง PLT-FR-012, PLT-FR-018 |
| `TenantIsolationIT` | สร้างจาก schema ทุกตารางปฏิเสธการอ่านและเขียนข้าม tenant | BR-PLT-01, PLT-CR-004 |
| `AuditChainIT` | ตรวจพบการแก้ไข คำสั่งที่กำหนดมีหนึ่งบันทึกโดยไม่มีข้อมูลส่วนบุคคล และการเลิกทำเหลือทั้งสองบันทึก | PLT-FR-087, PLT-FR-092, PLT-FR-093, BR-PLT-19 |
| `ErasureIT` | กุญแจถูกทำลาย ห่วงโซ่ผ่าน รายงานแสดงข้อความแทน และการเก็บตามกฎหมายปฏิเสธ | PLT-FR-112, PLT-FR-115 |
| `BreachClockTest` | เวลาเทียบ 72 ชั่วโมงและ 15 วัน ด้วยนาฬิกาคงที่ | PLT-FR-116 |
| `NoticeTemplateIT` | การแจ้งเตือนมาจากแม่แบบเป็นภาษาของผู้อ่าน และอ่านแล้วรายผู้ใช้ | PLT-FR-071, PLT-FR-073 |
| `SlaSweepIT` | วันเตือนและยกระดับที่ขอบเขต และรันซ้ำได้อย่างปลอดภัย | PLT-FR-077, PLT-FR-078 |
| `DutyRuleCoverageTest` | กฎทุกข้อในแคตตาล็อกมีจุดบังคับใช้ | PLT-FR-046 |
| `AdminSeparationIT` | `admin` ถูกปฏิเสธในการอ่านและอนุมัติทางธุรกิจทุกจุด | PLT-FR-035, BR-PLT-07 |

## การย้ายจากต้นแบบ {#plt-migration}

ต้นแบบเป็นเพียงแหล่งอ้างอิง ไม่มีโค้ดย้ายมา เพราะเป็น JavaScript บนเบราว์เซอร์ที่เก็บสถานะในหน่วยความจำ สิ่งที่ย้ายมาคือความรู้ที่อยู่ในนั้น ไม่มีข้อมูลจริงให้ย้าย และข้อมูลตั้งต้นของ tenant เป็นเรื่องการรับ tenant ใหม่

| สิ่งที่ย้ายมา | วิธี | ที่มาในต้นแบบ |
| --- | --- | --- |
| บทบาทและป้ายชื่อ | ข้อมูลตั้งต้น | `00-core.js` ROLES |
| รหัสและข้อความกฎแยกหน้าที่ | `SodCatalogue` | `64-duties.js`, `66c-fin-fn2.js`, `66d-fin-fn3.js`, `66e-fin-fn4.js`, `66f-fin-fn5.js` |
| ขอบเขตและกฎสถานะของการมอบอำนาจ | เขียนใหม่พร้อมการทดสอบจาก SRS | `54-identity.js` |
| สายอนุมัติและค่าเริ่มต้น SLA | สายตั้งต้นเป็นข้อมูล | `83-admin-crud.js`, `50b-admin-depth.js` |
| แม่แบบการแจ้งเตือน | แม่แบบตั้งต้น | `06-seedhelp.js` |
| ข้อความนโยบาย | แม่แบบตั้งต้นหลังการทบทวนทางกฎหมาย | `95b-site.js` sitePolicy |
| รายการระบบและพฤติกรรมตัวเปิดระบบ | เขียนใหม่ด้วย React | `90-systems.js`, `91-workbench.js` |
| การรวมประวัติรายการ | `RecordHistory` | `58-history.js` |
| ป้ายไทยและอังกฤษ | ย้ายไปไฟล์ข้อความ | `L()` labels |

| สิ่งที่ไม่ย้าย | เหตุผล | แทนด้วย |
| --- | --- | --- |
| การสลับบทบาท บัญชีตัวอย่าง รหัสคงที่ | ไม่มีตัวตนจริง (PLT-NFR-004) | Keycloak และบทบาทของ `platform` |
| สถานะใน `localStorage` ต่อองค์กร | ผู้ใช้เดียว ไม่มีการแยก | PostgreSQL พร้อม row-level security |
| `delegFor` ที่ใช้รายการแรก และ `sodActors` ผู้มอบคนเดียว | ข้อบกพร่องที่ทราบ | `Delegations`, `ActorSet` |
| สถานะอ่านแล้วทั้งบทบาทและข้อความตายตัว | PLT-FR-071, PLT-FR-073 | `notice_read` และแม่แบบ |
| ขีดจำกัด 300 บันทึกและ 100 การกัน | ไม่ใช้กับระบบจริง | ไม่จำกัด ตามการเก็บรักษา |
| การเลิกทำด้วยภาพข้อมูล | ลบบันทึก (OI-PLT-09) | คำสั่งชดเชย |
| หน้ารออนุมัติจากคำในชื่องาน | เปราะบาง | `work_item.kind` |
| ข้อมูลตัวอย่างของหน่วยงาน | ไม่เป็นส่วนของผลิตภัณฑ์ทั่วไป | ข้อมูลของ tenant เท่านั้น |

## ช่องว่างที่ทราบและประเด็นค้าง {#plt-open}

### ประเด็นที่สืบมาจาก SRS {#plt-open-srs}

| ประเด็น | ผลต่อการออกแบบ | การออกแบบในตอนนี้ | ผู้ตัดสิน |
| --- | --- | --- | --- |
| OI-PLT-01 | การมอบอำนาจทับซ้อน | ค่าตั้ง `delegationOverlap` ค่าเริ่มต้น `warn` และตรวจผู้มอบทุกคน | เจ้าของผลิตภัณฑ์ ฝ่ายกฎหมาย |
| OI-PLT-02 | สิ่งที่มอบได้ | `DelegationScope` เป็นรายการในโค้ด และยังไม่กำหนดระยะเวลาสูงสุด | ผู้บริหาร ฝ่ายกฎหมาย |
| OI-PLT-03 | กฎที่ปิดไม่ได้ | `SodRule.lockedOn` ยังว่างอยู่ | ผู้เชี่ยวชาญ ฝ่ายกฎหมาย |
| OI-PLT-04 | กฎที่ยังไม่เชื่อม | `DutyRuleCoverageTest` ไม่ผ่านจนกว่าจะเชื่อมหรือนำออก | ทีมพัฒนา เจ้าของ FIN และ BGT |
| OI-PLT-05 | หลายบทบาทหรือหน่วยงาน | อย่างละหนึ่ง และย้าย `role_id` ไปตารางเชื่อมได้โดยไม่เปลี่ยน `Authorizer` | เจ้าของผลิตภัณฑ์ |
| OI-PLT-06 | ช่วงค่าการหมดเวลา | ช่วงที่เสนอในตารางขีดจำกัด | เจ้าของผลิตภัณฑ์ ผู้ตรวจด้านความมั่นคงปลอดภัย |
| OI-PLT-07 | MFA สำหรับใคร | ผู้ใช้ทุกคนตามโค้ด | เจ้าของผลิตภัณฑ์ ผู้ตรวจด้านความมั่นคงปลอดภัย |
| OI-PLT-08 | ใครมอบได้ | `plt.delegation.give` เป็นข้อมูลของ tenant ขยายรายการได้ | เจ้าของผลิตภัณฑ์ ฝ่ายกฎหมาย |
| OI-PLT-09 | การเลิกทำ | คำสั่งชดเชย | ทีมพัฒนา |
| OI-PLT-10 | การเปลี่ยนสถานะปีงบประมาณ | เปลี่ยนได้อิสระ พร้อมเหตุผลและบันทึก | ผู้เชี่ยวชาญด้านการเงิน เจ้าของผลิตภัณฑ์ |
| OI-PLT-11 | วันของ SLA | วันปฏิทินในเมธอดเดียว | เจ้าของผลิตภัณฑ์ |
| OI-PLT-12 | มาตรา PDPA | ขีดจำกัดเป็นข้อมูลที่มีวันที่และช่องมาตรา | นักกฎหมาย PDPA |
| OI-PLT-13 | ระยะเวลาเก็บรักษา | คีย์ต่อตาราง ค่าเริ่มต้นจาก SRS | เจ้าหน้าที่งานสารบรรณ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| OI-PLT-14 | ช่องทางอื่น | port `MessageChannel` ที่ยังไม่มี adapter | ฝ่าย IT เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| OI-PLT-15 | ข้อของมาตรฐาน | การหมดเวลาและหน้านโยบายตามโค้ด ไม่อ้างข้อ | ผู้ตรวจด้านความมั่นคงปลอดภัย ฝ่ายกฎหมาย |

### ประเด็นใหม่จากการออกแบบนี้ {#plt-open-new}

เลข DG-PLT ด้านล่างเป็นของบทนี้ ไม่ใช่รหัสใน SRS

| ประเด็น | คำถาม | การออกแบบในตอนนี้ | ผู้ตัดสิน |
| --- | --- | --- | --- |
| DG-PLT-01 | ผู้ใช้ที่มีการมอบอำนาจสองรายการในขอบเขตเดียวควรเลือกหนึ่งรายการต่อการทำรายการ หรือใช้ทั้งหมด | ผู้ใช้เลือก และตรวจหน้าที่ผู้มอบทุกคน | เจ้าของผลิตภัณฑ์ ฝ่ายกฎหมาย |
| DG-PLT-02 | บท Procurement นำตารางคำตอบไปใช้แล้ว และย้ายตาราง `holiday` ไปอยู่ที่ `platform` แล้ว เจ้าของผลิตภัณฑ์ยอมรับการเปลี่ยนแปลงเหล่านี้หรือไม่ | ตามตารางคำตอบ | ผู้เขียนบท Procurement เจ้าของผลิตภัณฑ์ |
| DG-PLT-03 | Keycloak Organizations เก็บเวลาไม่ใช้งานต่างกันราย tenant ได้หรือไม่ ตามที่บท cross-cutting สมมติไว้ หากไม่ได้ Fisko ต้องวัดการใช้งานเอง | ค่าอยู่ใน `tenant_setting` และ `SessionPolicy` เป็นผู้ส่ง | ทีมพัฒนา |
| DG-PLT-04 | รายการงานของบทบาท ผู้เปิดคนแรกรับไปหรือทุกคนเห็นจนกว่าจะปิด | ทุกคนเห็นตามต้นแบบ | เจ้าของผลิตภัณฑ์ |
| DG-PLT-05 | แถว outbox เก็บนานเท่าใดหลังเผยแพร่ ตารางข้อมูลของ Procurement ให้ Platform เป็นผู้กำหนด | คีย์ `plt.outbox` ยังไม่มีระยะเวลา | ทีมพัฒนา เจ้าของผลิตภัณฑ์ |
| DG-PLT-06 | tenant แก้ขั้นใดในสายจัดซื้อหรือการเงินได้ เมื่อกฎหมายกำหนดผู้อนุมัติบางขั้น | ขั้นที่ล็อกในสายตั้งต้น โดย PRC และ FIN ระบุ | ผู้เชี่ยวชาญด้านพัสดุและการเงิน |
| DG-PLT-07 | จุดตรวจห่วงโซ่เขียนบ่อยเท่าใด ปรับให้ตรงกันแล้ว: SDS บท cross-cutting เคยเสนอ 1 ชั่วโมง และตอนนี้ใช้ค่าของ XC-SEC-035 | อย่างน้อยทุก 24 ชั่วโมง ตาม XC-SEC-035 | ผู้ตรวจด้านความมั่นคงปลอดภัย |
| DG-PLT-08 | ใครอนุมัติการเข้าถึงข้อมูล tenant ของผู้ให้บริการ tenant หรือเจ้าหน้าที่ของผู้ให้บริการ | `operator_access` เก็บผู้อนุมัติ และเสนอให้ tenant อนุมัติ | เจ้าของผลิตภัณฑ์ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| DG-PLT-09 | เจ้าหน้าที่คุ้มครองข้อมูลไม่มีบทบาทในโค้ด ควรเพิ่ม `dpo` เป็นบทบาทที่สิบสาม หรือให้สิทธิ์แก่ผู้ใช้บทบาทอื่น | บทบาท `dpo` | เจ้าของผลิตภัณฑ์ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| DG-PLT-10 | ใครดูแล tenant ทั้ง cell ในการให้บริการแบบเช่าใช้ เมื่อ `admin` ของ tenant ต้องเห็นเพียง tenant เดียว | คอนโซลผู้ให้บริการที่แยกจากบทบาทของ tenant | เจ้าของผลิตภัณฑ์ |
| DG-PLT-11 | เมื่อผู้ใช้ย้ายหน่วยงาน การมอบอำนาจและงานที่เปิดอยู่ตามไปหรือไม่ | การมอบอำนาจคงอยู่ งานกลับไปที่บทบาท | เจ้าของผลิตภัณฑ์ |
| DG-PLT-12 | ข้อความนโยบายต้องผ่านการรับรองทางกฎหมายราย tenant ก่อนเผยแพร่หรือไม่ เนื่องจากแม่แบบอ้างมาตรา | ฉบับที่เผยแพร่บันทึกผู้อนุมัติ | เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| DG-PLT-13 | การมอบอำนาจของผู้มอบที่ถูกระงับควรพักไว้หรือสิ้นสุด การออกแบบให้พักไว้ | `held` กลับเป็น `active` เมื่อเปิดใช้งานภายในช่วงวันที่ | เจ้าของผลิตภัณฑ์ ฝ่ายกฎหมาย |
| DG-PLT-14 | XC-PER-001 ถึง XC-PER-008 เป็นเป้าหมายที่เสนอสำหรับทุกโมดูล การตรวจในทุกคำขอต้องมีเป้าหมายของตนเองหรือไม่ | การตรวจอยู่ภายใต้ XC-PER-001 และ XC-PER-002 | เจ้าของผลิตภัณฑ์ |

### ช่องว่างที่ทราบในฉบับนี้ {#plt-open-depth}

- ภายในของ `documents` `files` `crypto` `search` และเกตเวย์ AI ออกแบบในบท cross-cutting บทนี้เก็บเฉพาะส่วนเชื่อมต่อ
- การรับ tenant ใหม่ การจัดเส้นทาง cell การย้าย tenant และการกู้คืนระบุที่นี่ และออกแบบในบทการติดตั้ง
- แถว Planned ที่ไม่มีพฤติกรรมในต้นแบบมีเพียงตารางและ endpoint ได้แก่ PLT-FR-019, PLT-FR-020, PLT-FR-116, PLT-FR-117 และ PLT-FR-119
- ชนิดคอลัมน์ ดัชนี และข้อจำกัดรอบทพจนานุกรมข้อมูล
