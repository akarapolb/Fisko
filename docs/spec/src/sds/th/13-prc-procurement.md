# การออกแบบโมดูลจัดซื้อจัดจ้าง {#prc}

> [!NOTE] Fisko ยังไม่มีโค้ดสำหรับใช้งานจริง ต้นแบบเป็น JavaScript บนเบราว์เซอร์และใช้แสดงพฤติกรรมเท่านั้น ทุกสิ่งในบทนี้เป็นข้อเสนอเพื่อการพัฒนา แพ็กเกจ คลาส ตาราง endpoint เหตุการณ์ และชื่อการทดสอบด้านล่างยังไม่มีอยู่จริง เทคโนโลยีมาจาก ADR ที่ยอมรับแล้วใน `docs/adr/` บทนี้นำมาใช้และไม่เปิดประเด็นใหม่

## วัตถุประสงค์ ขอบเขต และการสอบย้อน {#prc-purpose}

<!-- covers: PPA 11; PPA 56; PPR 162; PPR 175; PPR 176 -->

บทนี้ออกแบบโมดูล Procurement สำหรับระบบใช้งานจริง ครอบคลุมโครงสร้าง ข้อมูล ส่วนเชื่อมต่อ และพฤติกรรม โดยตอบบทจัดซื้อจัดจ้างของ SRS และเป็นบทนำร่องให้บทของโมดูลอื่นใช้โครงสร้างและระดับความละเอียดเดียวกัน

โมดูลครอบคลุมแผนประจำปี ใบขอซื้อขอจ้าง แฟ้มจัดซื้อ 12 ขั้น สัญญา งวดงาน การตรวจรับ ค่าปรับ หลักประกัน และการส่งต่อให้ Finance ขั้นตอนทางการของการจัดซื้อยังอยู่ใน e-GP (PRC-CR-001) ส่วน Fisko ทำหน้าที่เตรียม ตรวจ บันทึก และติดตาม

สิ่งที่อยู่นอกบทนี้ ได้แก่ กลไกแยกหน้าที่ การมอบอำนาจ และ Audit Log ซึ่งเป็นของ `platform` รายการจัดสรรซึ่งเป็นของ `budget` และใบสำคัญ การจ่าย และ GFMIS ซึ่งเป็นของ `finance` บทนี้ระบุเฉพาะสิ่งที่ Procurement ต้องการจากโมดูลเหล่านั้น

กลุ่มข้อกำหนดทุกกลุ่มของ SRS เชื่อมโยงกับหัวข้อการออกแบบตามตารางนี้

| กลุ่มใน SRS | ข้อกำหนด | หัวข้อการออกแบบ | แพ็กเกจหลัก |
| --- | --- | --- | --- |
| กฎธุรกิจ | BR-PRC-01 ถึง BR-PRC-34 | แบบจำลองโดเมน | ทั้งหมด |
| แผนและฉบับของแผน | PRC-FR-001 ถึง PRC-FR-011 | แบบจำลองโดเมน สถานะและการเปลี่ยนสถานะ การออกแบบข้อมูล | `plan` |
| ใบขอซื้อขอจ้าง | PRC-FR-012 ถึง PRC-FR-025 | สถานะและการเปลี่ยนสถานะ การออกแบบความมั่นคงปลอดภัย | `requisition` |
| แฟ้มและขั้นตอน | PRC-FR-026 ถึง PRC-FR-035 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `casefile` |
| การเลือกวิธีและตารางกฎ | PRC-FR-036 ถึง PRC-FR-045 | ภาพรวมการออกแบบ แบบจำลองโดเมน | `method`, `settings` |
| TOR และการสำรวจตลาด | PRC-FR-046 ถึง PRC-FR-053 | องค์ประกอบ การออกแบบข้อมูล | `sourcing` |
| ประกาศ e-GP และข้อเสนอ | PRC-FR-054 ถึง PRC-FR-061 | การออกแบบส่วนเชื่อมต่อ การออกแบบความมั่นคงปลอดภัย | `sourcing`, `egp` |
| การพิจารณาข้อเสนอ | PRC-FR-062 ถึง PRC-FR-068 | แบบจำลองโดเมน การออกแบบความมั่นคงปลอดภัย | `evaluation` |
| การอุทธรณ์ | PRC-FR-069 ถึง PRC-FR-075 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `evaluation` |
| การประกาศผลและหนังสือ | PRC-FR-076 ถึง PRC-FR-080 | พฤติกรรมเชิงพลวัต องค์ประกอบ | `evaluation`, `documents` |
| คณะกรรมการและผลประโยชน์ทับซ้อน | PRC-FR-081 ถึง PRC-FR-091 | แบบจำลองโดเมน การออกแบบความมั่นคงปลอดภัย | `committee` |
| หลักประกันการเสนอราคา | PRC-FR-092 ถึง PRC-FR-096 | แบบจำลองโดเมน การออกแบบข้อมูล | `sourcing` |
| สัญญาและงวดงาน | PRC-FR-097 ถึง PRC-FR-106 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `contract` |
| การส่งมอบและการตรวจรับ | PRC-FR-107 ถึง PRC-FR-119 | พฤติกรรมเชิงพลวัต การออกแบบส่วนเชื่อมต่อ | `acceptance` |
| ค่าปรับ | PRC-FR-120 ถึง PRC-FR-126 | แบบจำลองโดเมน | `penalty` |
| หลักประกันและการรับประกัน | PRC-FR-127 ถึง PRC-FR-132 | แบบจำลองโดเมน การออกแบบข้อมูล | `contract` |
| การแก้ไขและการบอกเลิกสัญญา | PRC-FR-133 ถึง PRC-FR-142 | สถานะและการเปลี่ยนสถานะ การออกแบบความมั่นคงปลอดภัย | `contract` |
| รายงานการควบคุมงาน | PRC-FR-143 ถึง PRC-FR-148 | องค์ประกอบ การออกแบบข้อมูล | `contract` |
| ผู้ขายและรายชื่อผู้ทิ้งงาน | PRC-FR-149 ถึง PRC-FR-154 | การออกแบบข้อมูล การออกแบบความมั่นคงปลอดภัย | `supplier` |
| เลขที่เอกสารและแบบฟอร์ม | PRC-FR-155 ถึง PRC-FR-163 | องค์ประกอบ การออกแบบข้อมูล | `documents` |
| รายงานแผนและการวิเคราะห์ | PRC-FR-164 ถึง PRC-FR-170 | ภาพรวมการออกแบบ การออกแบบที่ไม่ใช่ฟังก์ชัน | `reporting` |
| สัญญาณเตือน | PRC-FR-171 ถึง PRC-FR-175 | องค์ประกอบ การออกแบบความมั่นคงปลอดภัย | `reporting` |
| โปรไฟล์จัดซื้อ | PRC-FR-176 ถึง PRC-FR-179 | ภาพรวมการออกแบบ แบบจำลองโดเมน | `settings` |
| การช่วยงานด้วย AI | PRC-FR-180 ถึง PRC-FR-189 | องค์ประกอบ การออกแบบความมั่นคงปลอดภัย | `assistant` |
| ข้อกำหนดด้านข้อมูล | PRC-DR-001 ถึง PRC-DR-010 | การออกแบบข้อมูล | ทั้งหมด |
| กฎสถานะ | ตารางสถานะใน SRS | สถานะและการเปลี่ยนสถานะ | `casefile`, `requisition`, `plan`, `contract` |
| ข้อกำหนดส่วนเชื่อมต่อ | PRC-IR-001 ถึง PRC-IR-018 | การออกแบบส่วนเชื่อมต่อ | `egp`, `api`, `web` |
| ข้อกำหนดที่ไม่ใช่ฟังก์ชัน | PRC-NFR-001 ถึง PRC-NFR-008 | การออกแบบที่ไม่ใช่ฟังก์ชัน การออกแบบความมั่นคงปลอดภัย | ทั้งหมด |
| ข้อจำกัด | PRC-CR-001 ถึง PRC-CR-006 | ภาพรวมการออกแบบ | ทั้งหมด |
| หลักฐานการทดสอบ | การเดินทดสอบใน SRS | การออกแบบการทดสอบ | การทดสอบ |
| ประเด็นค้าง | OI-PRC-01 ถึง OI-PRC-17 | ช่องว่างที่ทราบและประเด็นค้าง | ทั้งหมด |

## ภาพรวมการออกแบบและการตัดสินใจ {#prc-decisions}

Procurement เป็นโมดูลหนึ่งของ modular monolith (ADR-0002, PRC-CR-005) คำขอจากเว็บหนึ่งรายการทำงานหนึ่งคำสั่งในหนึ่งธุรกรรม PostgreSQL ธุรกรรมนั้นบันทึก aggregate เหตุการณ์ของแฟ้ม และแถว outbox พร้อมกัน และรวมการเรียกบัญชีวงเงินของ Budget ได้ สถานะตามกฎหมายเขียนเป็นโค้ด Java (ADR-0007, PRC-CR-004) ส่วนทางเลือกของหน่วยงานเป็นข้อมูล

| การตัดสินใจ | เหตุผล | ทางเลือกที่ไม่ใช้ | ที่มา |
| --- | --- | --- | --- |
| สถานะตามกฎหมายเป็น enum ของ Java พร้อมตารางเปลี่ยนสถานะและเมธอดตรวจเงื่อนไข | ขั้นตอนมาจากกฎหมายและเปลี่ยนด้วยการออกรุ่น การทดสอบจึงไล่ได้ครบทุกคู่สถานะ | BPMN engine (ADR-0007 ไม่เลือก) และ framework ของ state machine ซึ่งเพิ่ม dependency เพื่อตารางขนาดเล็ก | ADR-0007, PRC-CR-004 |
| ขีดจำกัดตามกฎหมายอยู่ในโค้ดเป็นชุดกฎที่มีวันที่มีผล และค่าของหน่วยงานอยู่ในข้อมูล | หน่วยงานตั้งค่าขัดกฎหมายไม่ได้ และแฟ้มเก่าใช้กฎเดิม | ให้ทุกตัวเลขเป็นค่าตั้งอิสระของหน่วยงานตามที่ต้นแบบทำ | ADR-0007 |
| สัญญาคัดลอกอัตราค่าปรับและค่าขั้นต่ำไว้เมื่อลงนาม | การแก้ค่าตั้งภายหลังต้องไม่กระทบสัญญาที่ดำเนินอยู่ ต้นแบบอ่านค่าปัจจุบัน จึงเป็นการเปลี่ยนพฤติกรรม (DG-PRC-10) | อ่านค่าตั้งปัจจุบันทุกครั้งที่คำนวณ | ADR-0007 |
| `ProcurementCase` และ `SourcingRound` เป็นสอง aggregate โดยใช้ version ของแฟ้มคุมทั้งคู่ | การดำเนินการใหม่ปิดรอบเดิมและเปิดรอบใหม่ (PRC-DR-002) ขณะที่แฟ้มยังเป็นระเบียนเดียว | aggregate เดียวที่ถือทุกรอบ และการคัดลอกรอบที่จบเป็น JSON ตามต้นแบบ | PRC-FR-030, PRC-DR-002 |
| ขั้น 1 ถึง 9 บันทึกไว้ ขั้น 10 ถึง 12 คำนวณแล้วคัดลอกลง `display_step` ในธุรกรรมเดียวกัน | รายการและบอร์ดต้องมีคอลัมน์สำหรับกรอง (PRC-FR-028) และกฎการคำนวณยังมีที่เดียว | คำนวณทุกครั้งที่อ่านซึ่งต้องใช้ข้อมูล Finance ทุกแถว และบันทึกทุกขั้นเองซึ่งอาจคลาดเคลื่อน | PRC-FR-026 |
| การเรียก Budget ทำแบบ synchronous ในธุรกรรมเดียวกัน | การจองหรือผูกพันต้องสำเร็จหรือล้มเหลวพร้อมการเปลี่ยนแปลงทางธุรกิจ ทุกโมดูลของหน่วยงานใช้ฐานข้อมูล cell เดียวกัน | saga ผ่านเหตุการณ์ ซึ่งมีช่วงเวลาที่ยังไม่มีการจอง | ADR-0002, ADR-0005 |
| `finance` ขึ้นกับ `procurement.api` และ Procurement อ่านข้อเท็จจริงของการเงินผ่าน SPI ที่ `finance` ติดตั้ง | Spring Modulith ไม่ยอมรับการพึ่งพาแบบวงกลม และประตูเบิกจ่ายต้องได้คำตอบทันที | เรียกสองทาง (เกิดวงกลม) และใช้เหตุการณ์อย่างเดียว (ประตูรอไม่ได้) | ADR-0002, PRC-CR-005 |
| Fisko เก็บสรุปข้อเสนอที่กรอกหลังปิดรับ และปิดผนึกเฉพาะคำตอบ RFQ ผ่าน portal | การยื่นข้อเสนอยังอยู่ใน e-GP (PRC-CR-001, PRC-DR-007) ข้อเสนอของ e-GP ที่ยังไม่เปิดจึงไม่เข้าสู่ Fisko คำตอบผ่าน portal เป็นข้อเสนอที่ยังไม่เปิดเพียงอย่างเดียวที่ Fisko ถือไว้ | ปิดผนึกทุกแถวของข้อเสนอ ซึ่งไม่ได้ป้องกันสิ่งใดก่อนปิดรับและขัดขวางการคำนวณคะแนนราคา | ADR-0013, PRC-NFR-007 |
| ไทม์ไลน์ของแฟ้มและ Audit Log แยกเป็นสองที่เก็บ | ไทม์ไลน์แสดงเหตุผลและอาจมีข้อมูลส่วนบุคคล แต่ hash chain มีไม่ได้ (ADR-0015) | ใช้บันทึกร่วมกัน ซึ่งลบข้อมูลไม่ได้หากไม่ทำให้ chain เสีย | ADR-0015, PRC-CR-006 |
| ใช้ optimistic locking กับ aggregate พร้อม `If-Match` บน API และใช้ row lock เฉพาะบัญชีวงเงินของ Budget | การชนกันบนแฟ้มเดียวเกิดน้อย ส่วนบัญชีวงเงินต้องเรียงลำดับเคร่งครัดในช่วงพีค 30 กันยายน | ใช้ pessimistic lock ทุกคำสั่ง | ADR-0005 |
| e-GP อยู่หลัง port โดยเริ่มจาก adapter แบบไฟล์ | ยังไม่ทราบสัญญาการเชื่อมต่อ และตรรกะของแฟ้มต้องไม่เปลี่ยนเมื่อ API เปิด (PRC-IR-005) | อ่านไฟล์ในตรรกะของแฟ้มโดยตรง | ADR-0008, PRC-IR-005 |
| ฟังก์ชันเสริมถูกคุมฝั่งเซิร์ฟเวอร์ด้วย `FeatureGuard` และโค้ดไม่แยกทางตามชนิดหน่วยงาน | สวิตช์ในโปรไฟล์เป็นตัวแบกความต่าง (PRC-CR-003) และ PRC-NFR-008 ทดสอบการปิดทีละสวิตช์ | แยกเส้นทางโค้ดตามชนิดหน่วยงาน | PRC-FR-178, PRC-CR-003 |
| การวิเคราะห์อ่านจาก projection ที่สร้างใหม่ได้ และการพยากรณ์ใช้ตัวสุ่มที่กำหนด seed | การอ่านหนักไม่กระทบตารางคำสั่ง และข้อมูลเดียวกันให้ผลพยากรณ์เดียวกัน (PRC-NFR-004) | คิวรีตารางจริงทุกครั้งที่เปิดหน้า | ADR-0009, PRC-NFR-004 |

> [!LAW] อัตราค่าปรับเป็นตัวอย่างการแบ่งขีดจำกัดตามกฎหมายกับทางเลือกของหน่วยงาน ช่วงอัตราที่อนุญาตของสัญญาแต่ละชนิดอยู่ใน `PenaltyLimits` โดยอ้าง PPR 162 ส่วนอัตราที่หน่วยงานเลือกอยู่ใน `procurement_setting` เซิร์ฟเวอร์ปฏิเสธการบันทึกค่านอกช่วง ช่วงอัตราเป็นไปตาม BR-PRC-12 และผู้เชี่ยวชาญด้านพัสดุต้องยืนยัน (OI-PRC-01, OI-PRC-06)

```java
// Proposal. Limits are code; the chosen rate is tenant data checked against them.
public record PenaltyLimits(LocalDate effectiveFrom, Map<ContractKind, RateRange> rates) {
    public void check(ContractKind kind, BigDecimal chosenPercentPerDay) {
        if (!rates.get(kind).contains(chosenPercentPerDay)) {
            throw new SettingOutOfRange("penalty-rate", kind);
        }
    }
}
```

## องค์ประกอบ {#prc-components}

Procurement เป็นโมดูล Spring Modulith ชื่อ `procurement` ภายใต้ base package ที่เลือกเมื่อเริ่มพัฒนา เฉพาะ `api` และแพ็กเกจย่อย `api.events` เป็น named interface ส่วนแพ็กเกจอื่นเป็นภายในทั้งหมด และการทดสอบขอบเขตทำงานใน CI (ADR-0002)

{{fig:prc-component | องค์ประกอบของโมดูล procurement และโมดูลข้างเคียง}}

> [!NOTE] รายการแพ็กเกจ ชื่อ interface และชื่อเมธอดในหัวข้อนี้เป็นข้อเสนอ

### แพ็กเกจภายใน {#prc-packages}

| แพ็กเกจ | หน้าที่ | คลาสหลัก |
| --- | --- | --- |
| `web` | REST controller, request record, การแปลงเป็น Problem Details และเส้นทาง portal ของผู้ขาย | `CaseController`, `ContractController`, `PortalController` |
| `plan` | รายการในแผน ฉบับของแผน สำเนา ความต้องการจากรายการจัดสรรและคำขอตั้งงบประมาณ | `PlanItem`, `PlanVersion`, `PlanDiff` |
| `requisition` | ใบขอซื้อขอจ้าง การตรวจวงเงินคงเหลือ และการตรวจแตกซื้อ | `Requisition`, `SplitRiskPolicy` |
| `casefile` | แฟ้ม ขั้นตอน เงื่อนไขของแต่ละขั้น ไทม์ไลน์ สิ่งที่ต้องทำต่อ และชุดเอกสารของแฟ้ม | `ProcurementCase`, `CaseStep`, `StepChecks`, `CaseEvent` |
| `method` | กฎเลือกวิธี คำแนะนำ และการตัดสินเลือกวิธี | `MethodAdvisor`, `MethodRule`, `MethodDecision` |
| `sourcing` | คลัง TOR ราคากลาง การสำรวจตลาด การรับฟังความคิดเห็น ประกาศ e-GP ข้อเสนอ ใบเสนอราคา RFQ หลักประกันการเสนอราคา และการทดสอบตัวอย่าง | `SourcingRound`, `ReferencePrice`, `Hearing`, `Rfq`, `BidSecurity`, `SampleTest` |
| `evaluation` | เกณฑ์ คะแนน ผลการตัดสิน อุทธรณ์ และการส่งอุทธรณ์ต่อ | `Criteria`, `ScoreSheet`, `Award`, `Appeal` |
| `committee` | คำสั่งแต่งตั้ง กรรมการ การแจ้งส่วนได้เสีย การประชุม และค่าตอบแทน | `Committee`, `Declaration`, `FeeClaim` |
| `contract` | สัญญา งวด ฉบับ การแก้ไข หลักประกัน การรับประกัน ความชำรุด การบอกเลิก การควบคุมงาน แบบ BOQ และหมายเลขเครื่อง | `Contract`, `Phase`, `Variation`, `Guarantee`, `Termination` |
| `acceptance` | การส่งมอบ ลายมือชื่อ ความเห็นแย้ง ใบตรวจรับ ใบแจ้งหนี้ และประตูเบิกจ่าย | `AcceptanceService`, `PaymentGateService`, `GateResult` |
| `penalty` | วันล่าช้า ค่าปรับรายวัน เกณฑ์เตือน และการงดหรือลดค่าปรับ | `PenaltyCalculator`, `Waiver` |
| `supplier` | ทะเบียนผู้ขาย รายชื่อผู้ทิ้งงาน การปลดรายการที่ตรง และการตรวจสถานะนิติบุคคล | `Supplier`, `AbandonedWorkList`, `BlacklistPolicy` |
| `documents` | เลขที่เอกสาร แบบฟอร์ม หนังสือ การเตือน เอกสารขาเข้าและการตรวจเอกสาร | `NumberSeries`, `FormDocument`, `SupplierLetter`, `IncomingDocument` |
| `settings` | โปรไฟล์ สวิตช์ฟังก์ชัน ค่าตั้งของหน่วยงาน ชุดกฎตามกฎหมาย และหมวดพัสดุ | `ProcurementProfile`, `FeatureGuard`, `LegalRuleSet`, `SettingRange` |
| `reporting` | รายงานประจำเดือน ไทม์ไลน์รวม KPI การพยากรณ์ การจำลองสถานการณ์ สัญญาณเตือน และการส่งออก OCDS | `MonthlySummary`, `KpiCatalogue`, `ForecastEngine`, `RedFlagDetector`, `OcdsExporter` |
| `assistant` | เครื่องมือ AI ของเอเจนต์ AG-10 ถึง AG-13 และทะเบียนเครื่องมือ ส่วนการรันและการหยุดรอคนทุกครั้งที่เขียนข้อมูลอยู่ใน `AgentRuntime` ของ `platform.ai` (ข้อเสนอ DG-REV-01) | `ToolRegister` |
| `egp` | port ของ e-GP, adapter แบบไฟล์ การเทียบสถานะ และชุดข้อมูลสำหรับคีย์ | `EgpStatusSource`, `EgpFileAdapter`, `EgpPackBuilder` |

### ส่วนเชื่อมต่อที่เปิดเผย {#prc-published}

| Interface | ผู้ใช้ | วัตถุประสงค์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `AcceptedPhaseQuery` | `finance` | งวดที่ตรวจรับแล้วและยังไม่มีการจ่ายที่ยังมีผล พร้อมยอดสุทธิ ค่าปรับ และผลประตูเบิกจ่าย | PRC-IR-008 |
| `PaymentGate` | `finance` | `evaluate(contractId, phaseNo)` คืนผลการตรวจ ยอดสุทธิ และสถานะการพัก | PRC-FR-118, BR-PRC-15 |
| `PhasePayment` | `finance` | การเรียก `started`, `approved` และ `rejected` เพื่อตั้งสถานะ Paid กันการแก้ไขการลดค่าปรับ และปล่อยงวดงานเมื่อใบสำคัญถูกปฏิเสธหรือยกเลิก | PRC-FR-126, PRC-FR-117 |
| `ContractLookup` | `finance`, `projects`, `review` | สรุปสัญญาโดยไม่มีฟิลด์ข้อมูลส่วนบุคคล | PRC-CR-005 |
| `SupplierDirectory` | `finance` | ข้อมูลระบุตัวและสถานะของผู้ขายเพื่อการจ่าย | PRC-IR-012 |
| `FinanceFacts` (SPI) | `finance` เป็นผู้ติดตั้ง | `purchaseOrderRecorded(contractId)`, `paymentStarted(contractId, phaseNo)` วงเงินคงเหลือมาจาก `LineLedger` SPI นี้จึงไม่มีภาระผูกพัน | PRC-IR-009, BR-PRC-15 |
| `BankChangeIntake` (SPI) | `finance` เป็นผู้ติดตั้ง | `submit(supplierId, sealedRequest)` ส่งคำขอเปลี่ยนบัญชีธนาคารจาก portal และบัญชีไม่ผ่านไปในเหตุการณ์ | PRC-IR-012, FIN-FR-057 |
| เหตุการณ์ใน `api.events` | ทุกโมดูล และ RabbitMQ ผ่าน outbox | ตารางเหตุการณ์ในหัวข้อส่วนเชื่อมต่อ | ADR-0008 |

### การพึ่งพาโมดูลอื่น {#prc-dependencies}

| โมดูล | Interface ที่ต้องการ | ใช้เพื่อ | ข้อกำหนด |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations` | ผูกหน่วยงาน ตรวจสิทธิ์ และการปฏิบัติแทน ซึ่งส่งเป็น `ActorSet` | ADR-0006, BR-PRC-08 |
| `platform` | `SodGuard` | ตรวจการแยกหน้าที่ด้วย `ActorSet` และบันทึกความพยายามที่ถูกกัน | PRC-NFR-002 |
| `platform` | `AuditLog`, `Notifier`, `WorkItems`, `WorkingCalendar` | รายการ Audit การแจ้งเตือนด้วย template key และพารามิเตอร์ งาน และการนับวันทำการแบบเดียว | PRC-NFR-001, PRC-NFR-003 |
| `platform` | `DocumentService`, `FileStore`, `FieldCrypto` | PDF และ PAdES ไฟล์ S3 พร้อมการสแกน การเข้ารหัสฟิลด์ และ blind index | ADR-0010, ADR-0011, ADR-0013 |
| `platform` | `RetentionRegistry`, `SubjectDirectory` และ SPI `RetentionHold` ซึ่งโมดูลนี้ติดตั้ง | คีย์การเก็บรักษาและการเก็บตามกฎหมาย ชื่อที่อยู่หลังคอลัมน์ `*_ref` | PLT-FR-110, PLT-FR-112 |
| `platform` | `AiGateway`, `SearchIndexer` | การเรียก AI ทั้งหมด และเอกสารค้นหาที่ไม่มีข้อมูล Restricted | ADR-0016, ADR-0009 |
| `platform` | `AgentRuntime`, `AgentCatalogue` (ข้อเสนอ DG-REV-01) | การรัน ขั้นตอน สวิตช์ และระดับของเอเจนต์ | PRC-FR-187, REV-FR-036 |
| `budget` | `LineLedger` | อ่านรายการ `room`, `reserve`, `release`, `commit`, `adjustCommitment` | BR-PRC-04, PRC-IR-006, PRC-IR-007, PRC-FR-138 |
| `budget` | `AllocationQuery` | รายการจัดสรรของปีพร้อมวงเงินและโครงสร้าง | PRC-IR-006 |
| `budget` | `BudgetRequestQuery` | รายการคำขอตั้งงบที่ทบทวนแล้ว สำหรับความต้องการและแผนปีถัดไป | PRC-FR-009, PRC-FR-010 |
| `finance` | ไม่มีในเวลาคอมไพล์ | `finance` ขึ้นกับ `procurement.api` และติดตั้ง `FinanceFacts` และ `BankChangeIntake` | PRC-CR-005 |

> [!NOTE] Platform ตอบคำขอเหล่านี้แล้วใน[ตารางคำตอบ](#plt-dg-prc) ได้แก่ ผู้เรียกส่ง `ActorSet` การแจ้งเตือนใช้ template key และพารามิเตอร์ งานผ่าน `WorkItems` และ Procurement ติดตั้ง `RetentionHold` ส่วน Budget และ Finance เผยแพร่ interface ข้างต้นในบทของตน บทนี้ยึดตามคำตอบเหล่านั้น (DG-PRC-08)

## แบบจำลองโดเมน {#prc-domain}

<!-- covers: PPA 11; PPA 56; PPR 162; PPR 175; PPR 176 -->

คลาสโดเมนเป็น Java ธรรมดา ไม่ import Spring หรือ JPA แต่ละคำสั่งโหลด aggregate หนึ่งตัว เรียกเมธอดที่ตรวจกฎ แล้วบันทึก ชื่อใช้ตามฟิลด์ของต้นแบบเมื่อฟิลด์นั้นคงอยู่ ตารางข้อมูลใน SRS จึงยังเทียบกันได้

{{fig:prc-class | aggregate ของ Procurement และส่วนประกอบ}}

> [!NOTE] aggregate ชื่อคลาส และรหัสข้อผิดพลาดในหัวข้อนี้เป็นข้อเสนอ

### Aggregate และเงื่อนไขคงที่ {#prc-aggregates}

| Aggregate | ส่วนประกอบ | เงื่อนไขคงที่ที่รักษา |
| --- | --- | --- |
| `PlanItem` | ไม่มี | แก้ไขได้เฉพาะเมื่ออยู่ในแผนและไม่มีใบขอที่ยังมีผล ลบได้เฉพาะเมื่อไม่เคยอยู่ในฉบับที่เสนอ และไม่ใช้เลขซ้ำ |
| `PlanVersion` | สำเนาที่แก้ไขไม่ได้ | มีฉบับที่รอพิจารณาได้ครั้งละหนึ่งฉบับ ผู้เสนอไม่เป็นผู้อนุมัติ และสำเนาไม่เปลี่ยนแปลง (PRC-DR-001) |
| `Requisition` | บันทึกการตัดสิน | สร้างได้จากรายการที่ประกาศแล้วเท่านั้น (PPA 11) ยอดที่รออนุมัติหรืออนุมัติแล้วถือการจองบนรายการจัดสรร |
| `ProcurementCase` | การตัดสินวิธี ราคากลาง TOR คณะกรรมการ รายการสำรวจตลาด การรับฟังความคิดเห็น การปิดแฟ้ม | หนึ่งแฟ้มต่อหนึ่งรายการในแผน ขั้นเปลี่ยนได้เมื่อผ่านเงื่อนไขเท่านั้น และการยกเลิกหรือดำเนินการใหม่เก็บบันทึกรอบไว้เสมอ |
| `SourcingRound` | ประกาศ e-GP ข้อเสนอ คะแนน ใบเสนอราคา ผลการตัดสิน อุทธรณ์ RFQ หลักประกันการเสนอราคา การทดสอบตัวอย่าง | หนึ่งแฟ้มมีรอบที่เปิดอยู่รอบเดียว รอบที่จบแล้วอ่านได้อย่างเดียว (PRC-DR-002) ข้อเสนอล็อกเมื่อมีคะแนนแรก และเกณฑ์ล็อกเมื่อประกาศ |
| `Contract` | งวด ลายมือชื่อ ความเห็นแย้ง ใบแจ้งหนี้ การลดค่าปรับ หลักประกัน การแก้ไข ฉบับ การบอกเลิก ความชำรุด หนังสือ การควบคุมงาน | ผู้ขายคือผู้ชนะ ผลรวมงวดเท่ากับวงเงิน วงเงินที่ลงนามไม่เปลี่ยน และการแก้ไขที่อนุมัติแต่ละครั้งเพิ่มฉบับใหม่ (PRC-DR-003) |
| `Supplier` | ใบรับรอง การตรวจสถานะนิติบุคคล | ผู้ขายที่ใช้งานอยู่มีได้หนึ่งรายต่อเลขผู้เสียภาษีและต่อชื่อที่ปรับรูปแบบแล้ว |
| `AbandonedWorkList` | แถวรายชื่อ การนำเข้า การปลด | การนำเข้าไฟล์แทนที่แถวเดิมและเก็บบันทึก การปลดผูกกับหนึ่งแฟ้มและหนึ่งชื่อ |
| `MethodRule`, `ProcurementProfile`, `ProcurementSetting` | ไม่มี | ค่าอยู่ใน `SettingRange` และกฎไม่มีผลก่อนวันที่มีผล |
| `FeeClaim`, `FormDocument`, `IncomingDocument`, `RedFlag` | แถว สถานะลายมือชื่อ ฟิลด์ | แต่ละตัวถือกฎสถานะของตนตาม SRS และเอกสารที่ลงนามแล้วไม่เปลี่ยนแปลง (ADR-0011) |

### Value object และ enumeration {#prc-values}

| ชนิด | ค่า | หมายเหตุ |
| --- | --- | --- |
| `Money` | `BigDecimal` สกุลบาท | ADR-0003 จำนวนเต็มบาทตาม PRC-DR-006 ดู DG-PRC-02 |
| `CaseStep` | `PLANNED`, `REQUESTED`, `APPROVED`, `SPECIFYING`, `SOURCING`, `EVALUATING`, `AWARDED`, `CONTRACTING`, `IN_DELIVERY`, `ACCEPTED`, `PAYMENT`, `CLOSED` | หมายเลข 1 ถึง 12 การยกเลิกเป็นฟิลด์แยกและแสดงเป็น 0 |
| `ProcurementMethod` | `specific`, `ebid`, `selective`, `emarket` | PRC-FR-037 ส่วน `smallBudget` เพิ่มผ่านสวิตช์โปรไฟล์ (PRC-FR-045) |
| `ContractKind` | `goods`, `service`, `construction`, `consult` | PRC-FR-037 อัตราค่าปรับของ `consult` ยังเปิดอยู่ (DG-PRC-01) |
| `SpecialReason` | `urgent`, `sole`, `repeat` | PRC-FR-038 |
| `CommitteeType` | `tor`, `eval`, `buy` | คณะกรรมการตรวจรับอยู่กับสัญญา |
| `GuaranteeState` | `none`, `held`, `expiring`, `expired`, `returned`, `forfeited` | คำนวณบางส่วนจากวันหมดอายุ PRC-FR-129 |
| `ExtensionCause` | `force`, `owner`, `vendor` | เฉพาะ `force` และ `owner` ยกเว้นวันค่าปรับ PRC-FR-123 |

### ตำแหน่งที่บังคับใช้กฎธุรกิจแต่ละข้อ {#prc-rule-map}

เซิร์ฟเวอร์บังคับใช้ทุกกฎด้านล่าง หน้าจออาจตรวจซ้ำเพื่อช่วยผู้ใช้ แต่ไม่ใช่กลไกควบคุม (ADR-0006, PRC-CR-004) รหัสข้อผิดพลาดกำหนดในหัวข้อส่วนเชื่อมต่อ

| กฎ | เรื่อง | บังคับใช้ที่ | รหัสข้อผิดพลาด |
| --- | --- | --- | --- |
| BR-PRC-01 | วิธีที่แนะนำ | `MethodAdvisor.advise` | ไม่มี เป็นคำแนะนำเท่านั้น |
| BR-PRC-02 | วิธีที่ต่างจากคำแนะนำต้องมีเหตุผลและหัวหน้า | `MethodDecision.choose`, `approve` | `PRC_REASON_REQUIRED`, `PRC_SOD_BLOCKED` |
| BR-PRC-03 | ความเสี่ยงแตกซื้อ | `SplitRiskPolicy.assess`, called by `Requisition.send` | `PRC_SPLIT_EXPLANATION_REQUIRED` |
| BR-PRC-04 | วงเงินคงเหลือของรายการ | `budget` `LineLedger.room`, called by `Requisition.send`, `approve` and `Variation.propose`, `approve` | `PRC_LINE_ROOM_EXCEEDED` |
| BR-PRC-05 | แหล่งอ้างอิงของราคากลาง | `ReferencePrice.of` | `PRC_INVALID_INPUT` |
| BR-PRC-06 | องค์ประกอบคณะกรรมการ | `Committee.appoint` | `PRC_COMMITTEE_INCOMPLETE` |
| BR-PRC-07 | ขนาดคณะกรรมการตรวจรับและลายมือชื่อ | `Contract.draft`, `Phase.need` | `PRC_COMMITTEE_INCOMPLETE` |
| BR-PRC-08 | การแยกหน้าที่ | `SodGuard` ในแต่ละคำสั่ง ดูหัวข้อความมั่นคงปลอดภัย | `PRC_SOD_BLOCKED` |
| BR-PRC-09 | ระยะอุทธรณ์ | `Award.record` with `WorkingCalendar` | ไม่มี เป็นค่าที่คำนวณ |
| BR-PRC-10 | ผู้ชนะ เพดานวงเงิน งวด | `Contract.draft`, `Contract.sign` | `PRC_CONTRACT_INVALID` |
| BR-PRC-11 | ผู้ตัดสินตามยอดสะสม | `Variation.propose` with `ChangeLadder` | ไม่มี ใช้กำหนดเส้นทางการตัดสิน |
| BR-PRC-12 | ค่าปรับรายวัน | `PenaltyCalculator.daily` with `PenaltyLimits` | `PRC_SETTING_OUT_OF_RANGE` |
| BR-PRC-13 | เกณฑ์เตือน | `PenaltyCalculator.overLimit`, on delivery | ไม่มี เป็นการแจ้งเตือน |
| BR-PRC-14 | วันต้องตรวจรับและวันแจ้งไม่รับ | `AcceptanceDue.compute` with `WorkingCalendar` | ไม่มี เป็นการทำเครื่องหมายว่าล่าช้า |
| BR-PRC-15 | ประตูเบิกจ่าย | `PaymentGateService.evaluate`, `release` | `PRC_GATE_NOT_PASSED`, `PRC_GATE_PO_MISSING` |
| BR-PRC-16 | การปิดแฟ้ม | `ProcurementCase.close` with `CloseChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-17 | วงเงินและอายุหลักประกัน | `Guarantee.record`, `extend` | `PRC_GUARANTEE_INVALID` |
| BR-PRC-18 | เกณฑ์และคะแนนราคา | `Criteria.validate`, `ScoreSheet.total` | `PRC_INVALID_INPUT` |
| BR-PRC-19 | การแจ้งส่วนได้เสียก่อนพิจารณา | `StepChecks`, `Award.record` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-20 | ผลของการบอกเลิก | `Contract.approveTermination` | `PRC_SOD_BLOCKED` |
| BR-PRC-21 | การรับประกันและการคืนหลักประกัน | `Contract.returnGuarantee` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-22 | รายชื่อผู้ทิ้งงาน | `BlacklistPolicy.check` เรียกเมื่อประกาศผล เลือกใบเสนอราคา เชิญ RFQ และทำสัญญา | `PRC_SUPPLIER_BLOCKED` |
| BR-PRC-23 | รายงานประจำเดือน | `MonthlySummary.publish` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-24 | สถานะ e-GP ไม่ตรง | `EgpComparison` งานประจำวัน | ไม่มี แสดงคำเตือนและเพิ่มงาน |
| BR-PRC-25 | หลักประกันการเสนอราคา | `BidSecurity.record`, `returnTo`, `forfeit`, `StepChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-26 | การทดสอบตัวอย่าง | `SampleTest.record`, `StepChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-27 | อุทธรณ์ที่ส่งต่อ | `Appeal.forward`, `Appeal.decide` | `PRC_STATE_CONFLICT` |
| BR-PRC-28 | การอนุมัติแบบ | `Phase.sign`, `DrawingRound` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-29 | ค่าตอบแทนกรรมการ | `FeeClaim.prepare` | `PRC_INVALID_INPUT` |
| BR-PRC-30 | การรับฟังความคิดเห็น TOR | `Hearing.conclude`, `StepChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-31 | สิทธิพิเศษ SME และ MiT | `PreferenceView` อ่านอย่างเดียว | ไม่มี ใช้แสดงผลเท่านั้น |
| BR-PRC-32 | จำนวนผู้ได้รับเชิญขั้นต่ำ | `StepChecks` with `Rfq` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-33 | เลขไม่ถูกใช้ซ้ำ | `NumberSeries.next` ตัวนับที่ล็อกแถวและการลบไม่ทำให้ย้อนกลับ | ไม่มี |
| BR-PRC-34 | ขอบเขตของ AI | `ToolRegister` ซึ่งไม่มีเครื่องมือให้คะแนน ประกาศผล ทำสัญญา อนุมัติ หรือจ่าย | `PRC_AI_NOT_ALLOWED` |

### ขีดจำกัดในโค้ดและค่าตั้งของหน่วยงาน {#prc-limits}

ค่าตั้งแต่ละรายการมีช่วงใน `SettingRange` และมีค่าใน `procurement_setting` พร้อมวันที่มีผล ค่ามาจากกฎธุรกิจใน SRS ตารางแสดงการแบ่งของรายการหลัก `LegalRuleSet` มีรุ่นตามวันที่มีผล และ `method_decision` กับ `contract` เก็บรุ่นที่ใช้ (PRC-FR-044, ADR-0007)

| ค่าตั้ง | ช่วงในโค้ด | ค่าเริ่มต้นในข้อมูลหน่วยงาน | กฎ |
| --- | --- | --- | --- |
| `penGoods`, `penService` | 0.01 ถึง 0.20 เปอร์เซ็นต์ต่อวัน | 0.10 | BR-PRC-12 |
| `penCons` | 0.01 ถึง 0.10 เปอร์เซ็นต์ต่อวัน | 0.10 | BR-PRC-12 |
| `penaltyMin` | ตั้งแต่ 0 บาทต่อวันขึ้นไป | 100 | BR-PRC-12 |
| `specificMax` | อย่างน้อย 1 บาท | 500,000 | BR-PRC-01, OI-PRC-02 |
| `minMembers` | อย่างน้อย 2 | 3 | BR-PRC-06 |
| `appealDays` | ตั้งแต่ 0 วันทำการขึ้นไป | 7 | BR-PRC-09 |
| `guaranteePct` | ตั้งแต่ 0 เปอร์เซ็นต์ขึ้นไป | 5 | BR-PRC-17 |
| `ladderPct`, `extDaysHead` | ตั้งแต่ 0 ขึ้นไป | 10, 30 | BR-PRC-11 |
| `invoiceTol` | ตั้งแต่ 0 บาทขึ้นไป | 0 | BR-PRC-15 |
| `smePct`, `mitPct` | 0 ถึง 50 | 5 | BR-PRC-31, OI-PRC-10 |
| ค่าที่เก็บไว้: `warrantyMonths`, `rejectNoticeWd`, `syncDays`, `dueProgressMin`, `progressGap`, `supReportDays` | ยังเปิดอยู่ OI-PRC-07 | ตาม SRS | หลายข้อ |

## สถานะและการเปลี่ยนสถานะ {#prc-states}

ชื่อสถานะเป็นไปตาม SRS การเปลี่ยนสถานะแต่ละรายการเป็นเมธอดของ aggregate เมธอดตรวจสถานะปัจจุบันกับตารางการเปลี่ยนสถานะ ตรวจเงื่อนไข และบันทึก `case_event` หนึ่งรายการ การเปลี่ยนที่ถูกปฏิเสธจะตอบด้วยเงื่อนไขแรกที่ยังไม่ผ่าน (PRC-FR-027)

### แฟ้มจัดซื้อ {#prc-state-case}

{{fig:prc-state-case | สถานะของแฟ้มจัดซื้อ}}

| จาก | ไป | คำสั่ง | เงื่อนไข | เหตุการณ์ |
| --- | --- | --- | --- | --- |
| 1 PLANNED | 2 REQUESTED | `Requisition.send` | รายการอยู่ในแผนที่ประกาศ มีวงเงินคงเหลือ และ BR-PRC-03 | `requisition.sent` |
| 2 REQUESTED | 3 APPROVED | `Requisition.approve` | SD-01 และมีวงเงินคงเหลือ | `requisition.approved` |
| 2 REQUESTED | 1 PLANNED | `reject`, `return`, `withdraw` | มีเหตุผลเมื่อ SRS กำหนด | `requisition.closed` |
| 3 APPROVED | 4 SPECIFYING | `ProcurementCase.move` | เลือกวิธีแล้ว และหัวหน้าอนุมัติเมื่อเข้า BR-PRC-02 | `case.step-changed` |
| 4 SPECIFYING | 5 SOURCING | `ProcurementCase.move` | ราคากลาง TOR คณะกรรมการ ข้อมูล e-GP เกณฑ์ การรับฟังความคิดเห็น และการเชิญ | `case.step-changed` |
| 4 SPECIFYING | 7 AWARDED | `ProcurementCase.move` | วิธีเฉพาะเจาะจง ใบเสนอราคาที่เลือกไม่เกินวงเงินอนุมัติ และ BR-PRC-22 | `award.recorded` |
| 5 SOURCING | 6 EVALUATING | `ProcurementCase.move` | ถึงวันปิดรับ และบันทึกจำนวนผู้ยื่นมากกว่าศูนย์ | `case.step-changed` |
| 6 EVALUATING | 7 AWARDED | `SourcingRound.recordAward` | PRC-FR-065, PRC-FR-076 to PRC-FR-078, BR-PRC-25, BR-PRC-26 | `award.recorded` |
| 7 AWARDED | 8 CONTRACTING | งานประจำวัน หรือ `ProcurementCase.move` | พ้นระยะอุทธรณ์และไม่มีอุทธรณ์ค้าง วิธีที่ไม่มีการอุทธรณ์ไม่มีระยะนี้ | `case.step-changed` |
| 7 AWARDED | 6 EVALUATING | `Appeal.uphold`, `Award.withdraw` | หัวหน้า เหตุผลอย่างน้อย 10 ตัวอักษร และคะแนนยังอยู่ | `award.withdrawn` |
| 4 to 7 | 4 SPECIFYING | `ProcurementCase.fail` | มีเหตุผล รอบปิดเป็นล้มเหลว และกรณีไม่มีผู้ยื่นก็ดำเนินการใหม่ | `case.failed` |
| 2 to 8 | 0 cancelled | `ProcurementCase.cancel` | มีเหตุผล เก็บรอบไว้ ยกเลิกใบขอ และคืนวงเงินที่จอง | `case.cancelled` |
| 0 cancelled | 2 REQUESTED | `Requisition.send` | ใบขอใหม่ล้างการยกเลิก โดยเริ่มจากวิธีและราคาที่ว่าง | `requisition.sent` |
| 8 CONTRACTING | 9 IN DELIVERY | `Contract.sign` | ดูตารางสัญญา | `contract.signed` |
| 9 IN DELIVERY | 10 ACCEPTED | คำนวณ | ทุกงวดที่ยังมีผลตรวจรับแล้ว | `case.step-changed` |
| 10 ACCEPTED | 11 PAYMENT | คำนวณเมื่อ `PhasePayment.started` | มีการจ่าย | `case.step-changed` |
| 11 PAYMENT | 12 CLOSED | `ProcurementCase.close` | BR-PRC-16 และคะแนนผู้ขาย 1 ถึง 5 | `case.closed` |

> [!NOTE] สัญญาที่ถูกบอกเลิกโดยไม่มีงวดที่ตรวจรับจะไม่มีงวดที่ยังมีผล การคำนวณจึงคงไว้ที่ขั้น 11 และปิดแฟ้มได้ตาม BR-PRC-16 เหมือนต้นแบบ ขั้น 11 ขึ้นกับสถานะการจ่ายของ Finance บท FIN จึงต้องรักษาความเชื่อมโยงนี้ให้ตรงกัน

### สัญญา {#prc-state-contract}

{{fig:prc-state-contract | สถานะของสัญญา}}

| จาก | ไป | คำสั่ง | เงื่อนไข | ผล |
| --- | --- | --- | --- | --- |
| (ไม่มี) | draft | `Contract.draft` | แฟ้มอยู่ขั้น 8; BR-PRC-10, BR-PRC-07, BR-PRC-22; SD-02, SD-06 | ออกเลข และยังไม่ผูกพันวงเงิน (PRC-IR-007) |
| draft | (ลบแล้ว) | `Contract.deleteDraft` | ยังไม่เคยลงนาม | แฟ้มอยู่ขั้น 8 และเก็บเลขไว้ |
| draft | active | `Contract.sign` | วันลงนามไม่อยู่ในอนาคต มีหลักประกันเมื่อกำหนด (PRC-FR-128) และผลรวมงวดเท่ากับวงเงิน | `LineLedger.commit` คัดลอกอัตรา ใบขอเป็น contracted และแฟ้มเป็นขั้น 9 |
| active | active | `Variation.approve` | SD-08 ผู้ตัดสินตาม BR-PRC-11 และมีวงเงินคงเหลือเมื่อเพิ่มยอด | เพิ่มฉบับใหม่ `adjustCommitment` และวงเงินที่ลงนามคงเดิม |
| active | closed | `ProcurementCase.close` | BR-PRC-16 | ปิดสัญญาและรายการในแผน |
| active | terminated | `Contract.approveTermination` | ผู้มีอำนาจอนุมัติ; SD-08 | BR-PRC-20: ยกเลิกงวดที่ยังไม่ตรวจรับ ลดวงเงินเหลือเท่างวดที่ตรวจรับ ริบหลักประกัน เสนอชื่อผู้ขายเข้ารายชื่อ และร่างหนังสือ |

### งวดงาน {#prc-state-phase}

{{fig:prc-state-phase | สถานะของงวดงาน}}

งวดไม่มีคอลัมน์สถานะ `Phase.state()` คำนวณตามลำดับใน SRS คือ Cancelled, Paid, Accepted, Delivered, Waiting ส่วน `Overdue` เป็นเครื่องหมายบนงวดที่ยังไม่ส่งมอบและเลยกำหนด การถอนลายมือชื่อก่อนครบทำให้งวดยังเป็น Delivered (PRC-FR-112)

| จาก | ไป | คำสั่ง | เงื่อนไข |
| --- | --- | --- | --- |
| Waiting | Delivered | `Contract.recordDelivery` | ตามลำดับงวด และวันที่ไม่ก่อนวันลงนาม (PRC-FR-107) |
| Delivered | Accepted | ลงนามบนงวด | กรรมการ งวดก่อนหน้าตรวจรับแล้ว ไม่มีความเห็นแย้งค้าง SD-02 ยอดตรงกับกรรมการก่อนหน้า และ BR-PRC-28 |
| Accepted | Paid | `PhasePayment.approved` | Finance เป็นผู้เรียก |
| Accepted | Accepted | `PhasePayment.rejected` | Finance เป็นผู้เรียกเมื่อใบสำคัญถูกปฏิเสธหรือยกเลิก งวดงานจึงว่างสำหรับใบสำคัญใหม่ (OI-FIN-10) |
| Waiting, Delivered | Cancelled | `Contract.approveTermination` | การนับค่าปรับหยุดที่วันยกเลิก |

### ใบขอ รายการในแผน และฉบับของแผน {#prc-state-others}

| ระเบียน | สถานะ | บังคับใช้ที่ | หมายเหตุ |
| --- | --- | --- | --- |
| ใบขอ | draft, pending, returned, approved, rejected, contracted, cancelled | `Requisition` | ตารางใน SRS คือตารางการเปลี่ยนสถานะ การเข้าสู่ pending เรียก `reserve` และการออกไปสู่สถานะสิ้นสุดเรียก `release` |
| รายการในแผน | planned, requisitioned, contracted, closed, cancelled, and draft (derived) | `PlanItem` | draft คำนวณจากฉบับที่ประกาศตาม SRS |
| ฉบับของแผน | submitted, approved, rejected, withdrawn, and published (derived) | `PlanVersion` | published หมายถึงอนุมัติแล้วและมีเลขประกาศ e-GP (PPA 11) |

## พฤติกรรมเชิงพลวัต {#prc-dynamic}

<!-- covers: PPR 175; PPR 176 -->

### แฟ้มตั้งแต่แผนถึงการปิด {#prc-activity}

แผนภาพแสดงเส้นทางปกติ ช่วงระหว่างการเลือกวิธีกับผู้ชนะมีสองเส้นทาง วิธีเฉพาะเจาะจงใช้ใบเสนอราคา ส่วนวิธีแข่งขันดำเนินการใน e-GP แล้วนำข้อมูลกลับมาบันทึก การดำเนินการใหม่และการยกเลิกอยู่ในตารางสถานะ

{{fig:prc-activity-case | แฟ้มจัดซื้อตั้งแต่ต้นจนจบ}}

### จากการประกาศผลถึงการลงนามสัญญา {#prc-seq-award}

การบันทึกผลและการลงนามสัญญาเป็นคนละคำสั่ง ระหว่างนั้นมีระยะอุทธรณ์ และการลงนามคือจุดที่ผูกพันวงเงิน ร่างสัญญายังไม่ผูกพันสิ่งใด

{{fig:prc-seq-award | จากการประกาศผลถึงการลงนามสัญญา}}

- การประกาศผลของวิธีแข่งขันใช้ราคาจากข้อเสนอของผู้ชนะ (PRC-FR-076) ปฏิเสธราคาที่สูงกว่าวงเงินอนุมัติ (PRC-FR-077) และต้องมีเหตุผลเมื่อผู้ชนะไม่ได้คะแนนรวมสูงสุด (PRC-FR-078)
- วันสิ้นสุดอุทธรณ์เก็บไว้กับผลการตัดสิน งานประจำวันใช้แทนปุ่มจำลองของต้นแบบ (PRC-NFR-006) และคำถามว่างานนี้ย้ายแฟ้มโดยไม่มีคนได้หรือไม่อยู่ที่ DG-PRC-09
- การลงนามทำในธุรกรรมเดียว `LineLedger.commit` เปลี่ยนการจองเป็นภาระผูกพัน สัญญาเป็น active ใบขอเป็น contracted และแฟ้มถึงขั้น 9 ถ้าบัญชีวงเงินปฏิเสธจะไม่มีการบันทึกใด ๆ
- PDF ของสัญญาที่ลงนามแล้วเก็บครั้งเดียวและไม่เปลี่ยนแปลง (ADR-0011) การแก้ไขสร้างฉบับใหม่

### จากการส่งมอบถึงการตรวจรับและคำขอเบิกจ่าย {#prc-seq-accept}

Procurement รับผิดชอบทุกอย่างจนถึงประตูเบิกจ่าย ส่วน Finance รับผิดชอบคำขอเบิกจ่ายและสถานะหลังจากนั้น ประตูทำงานใน Procurement และ Finance เป็นผู้เรียก จึงมีชุดกฎเดียวที่ตัดสินว่างวดไปต่อได้หรือไม่ (PRC-IR-008, PRC-IR-009)

{{fig:prc-seq-accept-pay | จากการส่งมอบถึงการตรวจรับและคำขอเบิกจ่าย ข้ามไปยัง Finance}}

- ลายมือชื่อแต่ละรายการเป็นหนึ่งธุรกรรม version แบบ optimistic กันไม่ให้กรรมการสองคนทำให้งวดครบจากข้อมูลเก่า
- เมื่อครบ ระบบบันทึกใบตรวจรับ 2 ฉบับ (PRC-FR-115) `DocumentService` สร้าง PDF และลงนาม PAdES การสร้างทำหลัง commit จากเหตุการณ์ใน outbox ความล้มเหลวของการลงนามจึงไม่ย้อนการตรวจรับ และผู้ใช้เห็นสถานะได้ (ADR-0008)
- ประตูตรวจการตรวจรับ ใบแจ้งหนี้ ความตรงกันภายใน `invoiceTol` หลักประกัน และใบสั่งซื้อ GFMIS ผ่าน `FinanceFacts` ยอดที่จ่ายได้คือยอดที่ตรวจรับหักค่าปรับ (PRC-FR-118)
- เมื่อไม่ผ่านประตู ระบบเก็บการพักไว้ หัวหน้าหรือผู้มีอำนาจอนุมัติปลดได้ด้วยเหตุผลอย่างน้อย 10 ตัวอักษร และแจ้งผู้ตรวจสอบกับ Finance (PRC-FR-119) ส่วน `PRC_GATE_PO_MISSING` ปลดไม่ได้ (BR-PRC-15)
- เมื่อเรียก `PhasePayment.started` แล้ว ระบบปฏิเสธการลดค่าปรับและการคืนใบแจ้งหนี้ของงวดนั้น (PRC-FR-117, PRC-FR-126) `PhasePayment.rejected` ปล่อยงวดงานอีกครั้งเมื่อ Finance ปฏิเสธหรือยกเลิกใบสำคัญ และใบสำคัญถัดไปอ่านค่าปรับปัจจุบัน

> [!OPEN] สัญญาที่บอกเลิกตาม BR-PRC-20 มีหลักประกันที่ถูกริบ งวดที่ตรวจรับแล้วแต่ยังไม่จ่ายจึงไม่ผ่านการตรวจหลักประกันและต้องปลดข้อยกเว้น ผู้เชี่ยวชาญด้านพัสดุต้องระบุว่าการตรวจนี้ใช้หลังการบอกเลิกหรือไม่ (DG-PRC-03)

### งานตามกำหนดเวลา {#prc-jobs}

งานทำงานต่อ cell และทำทีละหน่วยงาน โดยผูกหน่วยงานเช่นเดียวกับคำขอจากเว็บ แต่ละงานรันซ้ำได้อย่างปลอดภัย และมี lock ให้ทำงานครั้งละหนึ่ง instance

| งาน | ทำอะไร | ข้อกำหนด |
| --- | --- | --- |
| ระยะอุทธรณ์ | ทำเครื่องหมายว่าพ้นระยะ และย้ายแฟ้มเมื่อไม่มีอุทธรณ์ค้าง | PRC-FR-070, BR-PRC-09 |
| การเปิด RFQ | เปิดคำตอบที่ปิดผนึกหลังวันตอบ และปิด portal ของ RFQ นั้น | PRC-IR-010, ADR-0013 |
| การสร้างงาน | เปิดงานผ่าน `WorkItems` สำหรับหลักประกันหมดอายุ การส่งมอบใกล้กำหนด การแจ้งไม่รับ ความชำรุด การคืนหลักประกันการเสนอราคา วันผลอุทธรณ์ และรายงานควบคุมงานที่ค้าง | PRC-FR-080, PRC-FR-095, PRC-FR-129, PRC-FR-132, PRC-FR-075, PRC-FR-145 |
| การเทียบ e-GP | เทียบขั้นที่นำเข้ากับขั้นของแฟ้ม และเพิ่มงานเมื่อเกิน `syncDays` | PRC-IR-003, BR-PRC-24 |
| การตรวจสัญญาณเตือน | ทำงานกับสัญญาณ RF-01 ถึง RF-10 และปรับคิว | PRC-FR-171, PRC-FR-172 |
| การเก็บรักษา | ใช้ตารางของ ADR-0014 กับระเบียนที่สิ้นสุดแล้ว | PRC-DR-010 |

## การออกแบบข้อมูล {#prc-data}

<!-- covers: PDPA 39 -->

ตารางอยู่ใน schema `procurement` ของคลัสเตอร์ PostgreSQL ใน cell (ADR-0005) โมดูลอื่นไม่อ่านตารางเหล่านี้โดยตรงแต่ใช้ `procurement.api` การเปลี่ยน schema ใช้แบบ expand and contract เพื่อให้รุ่นเก่าและใหม่ทำงานร่วมกันระหว่าง rolling upgrade

> [!NOTE] ตาราง คอลัมน์ ชนิดข้อมูล และดัชนีทั้งหมดในหัวข้อนี้เป็นข้อเสนอ ตารางเหล่านี้เป็นการออกแบบเชิงตรรกะ และบทพจนานุกรมข้อมูลจะเก็บคอลัมน์ฉบับสุดท้าย

{{fig:prc-er | ตารางหลักของ procurement รายการครบอยู่ถัดไป}}

### กฎของทุกตาราง {#prc-data-rules}

- ตารางของหน่วยงานทุกตารางมี `tenant_id` เป็นคอลัมน์แรกในคีย์หลักและคีย์นอก แถวจึงชี้ข้ามหน่วยงานไม่ได้
- เปิดและบังคับ row-level security ทุกตาราง และ CI ทดสอบทีละตาราง (ADR-0005) role ของแอปพลิเคชันไม่มีสิทธิ์ข้าม
- คอลัมน์ร่วมคือ `tenant_id`, `id` (UUID), `created_at`, `created_by_ref`, `updated_at` และ `version` ที่ aggregate root คอลัมน์ `*_ref` เก็บรหัสอ้างอิงบุคคลแบบแฝงจาก `platform`
- เลขทางธุรกิจ เช่น เลขแผน ใบขอ แฟ้ม และสัญญา เป็นคอลัมน์แยกจาก `id` และไม่ซ้ำภายในหน่วยงานและปีงบประมาณ (PRC-DR-004)
- คอลัมน์เงินใช้ `numeric` แมปกับ `BigDecimal` (ADR-0003) ส่วน scale ยังเปิดอยู่ (DG-PRC-02)
- ระเบียนที่มีสถานะไม่ถูกลบจริง ลบได้เฉพาะร่างที่ไม่เคยส่ง และเลขยังอยู่ใน `number_log`

```sql
-- Proposal: the pattern applied to every tenant-owned table.
ALTER TABLE procurement.contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement.contract FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON procurement.contract
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

### ตาราง {#prc-data-tables}

ชั้นข้อมูลคือชั้นตาม ADR-0013 ของทั้งแถว ส่วนข้อยกเว้นรายฟิลด์อยู่ในตารางถัดไป คีย์การเก็บรักษาคือรายการในตารางของ ADR-0014 ไม่ระบุระยะเวลาเพราะ OI-PRC-14 ยังเปิดอยู่

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | คีย์การเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `plan_item` | `line_id`, `no`, `name`, `estimate`, `planned_on`, `category_id`, `kind`, `status` | Internal | `prc.plan` | PRC-FR-001 ถึง PRC-FR-005 |
| `plan_version` | `version_no`, `status`, `why`, `snapshot` (jsonb), `egp_notice_no`, `decided_by_ref` | Internal | `prc.plan` | PRC-DR-001, PRC-FR-006 ถึง PRC-FR-008 |
| `requisition` | `plan_item_id`, `no`, `amount`, `why`, `needed_on`, `status`, `split_why`, `for_unit_id`, `reservation_ref` | Internal | `prc.case` | PRC-FR-012 ถึง PRC-FR-025 |
| `procurement_case` | `plan_item_id`, `requisition_id`, `no`, `kind`, `method`, `stored_step`, `display_step`, `cancelled_why`, `closed_at`, `lessons`, `supplier_score` | Internal | `prc.case` | PRC-FR-026 ถึง PRC-FR-035 |
| `case_event` | `case_id`, `at`, `type`, `actor_ref`, `detail`, `step` | Confidential | `prc.case` | PRC-FR-029, PRC-DR-005 |
| `method_decision` | `case_id`, `advised`, `chosen`, `why`, `special`, `rule_id`, `rule_effective_on`, `rule_set_version`, `approval_status` | Internal | `prc.case` | PRC-FR-036 ถึง PRC-FR-044 |
| `reference_price`, `market_entry` | `case_id`, `amount`, `basis`, `note`; `vendor`, `price`, `source`, `date` | Internal | `prc.case` | PRC-FR-049 ถึง PRC-FR-051 |
| `tor_template`, `tor_template_version` | `kind`, `version_no`, `file_key`, `status`, `proposed_by_ref` | Internal | `prc.config` | PRC-FR-046 ถึง PRC-FR-048 |
| `hearing`, `hearing_comment` | `case_id`, `notice_no`, `from_on`, `to_on`, `conclusion`, `revision_no` | Public หลังเผยแพร่ | `prc.case` | PRC-FR-052, PRC-FR-053 |
| `sourcing_round` | `case_id`, `round_no`, `outcome`, `why`, `egp_no`, `announced_on`, `closes_on`, `bidders` | Public หลังประกาศ | `prc.case` | PRC-FR-030, PRC-FR-054, PRC-DR-002 |
| `bid`, `bid_detail` | `round_id`, `supplier_id`, `bidder_name`, `price`; ผู้ผลิต ประเทศ ยี่ห้อ รุ่น ความแตกต่าง | Confidential จนกว่าจะประกาศผล | `prc.bid` | PRC-FR-058, PRC-FR-059, PRC-FR-066, PRC-NFR-007 |
| `criterion`, `evaluation_score` | `round_id`, `name`, `weight`; `member_ref`, `bid_id`, `criterion_id`, `value` | Confidential | `prc.bid` | PRC-FR-062 ถึง PRC-FR-065 |
| `quotation` | `round_id`, `supplier_id`, `price`, `chosen` | Confidential จนกว่าจะประกาศผล | `prc.bid` | PRC-FR-060 |
| `rfq`, `rfq_reply` | `round_id`, `doc_no`, `reply_by`; `supplier_id`, `sealed_payload`, `sealing_key_ref`, `opened_at`, `price` | Confidential ปิดผนึกจนถึงวันตอบ | `prc.bid` | PRC-FR-061, PRC-IR-010 |
| `award`, `appeal`, `appeal_forward` | `round_id`, `supplier_id`, `price`, `awarded_on`, `resolution`, `appeal_end_on`; `appellant`, `grounds`, `status`, `decision_why`; `doc_no`, `result` | Public หลังประกาศ ยกเว้นเหตุผล | `prc.case` | PRC-FR-069 ถึง PRC-FR-078 |
| `committee`, `committee_member`, `declaration` | `case_id`, `type`, `order_no`, `order_on`; `subject_ref`, `role`; `round_id`, `conflict`, `bidder`, `entered_by_ref` | Confidential | `prc.case` | PRC-FR-081 ถึง PRC-FR-084 |
| `committee_meeting` | `committee_id`, `held_on`, `attendance`, `resolution` | Confidential | `prc.case` | PRC-FR-087 |
| `fee_claim`, `fee_claim_row` | `doc_no`, `case_id`, `status`, `total`; `subject_ref`, `dates`, `amount` | Confidential | `prc.fee` | PRC-FR-089 ถึง PRC-FR-091 |
| `bid_security` | `round_id`, `bidder_name`, `type`, `amount`, `valid_to`, `status`, `reason` | Internal | `prc.bid` | PRC-FR-092 ถึง PRC-FR-096 |
| `sample_test` | `bid_id` วันที่รับ ส่ง เริ่ม เสร็จ แจ้ง และตอบ `report_no`, `result` | Confidential | `prc.bid` | PRC-FR-068 |
| `contract` | `case_id`, `supplier_id`, `no`, `status`, `signed_on`, `signed_amount`, `amount`, `version_no`, `penalty_rate`, `penalty_min`, `rule_set_version`, `warranty_months`, `erp_refs` (jsonb) | Public หลังลงนาม | `prc.contract` | PRC-FR-097 ถึง PRC-FR-103, PRC-IR-015, PRC-DR-003 |
| `contract_version`, `variation`, `termination` | `version_no`, `amount`, `why`; `kind`, `delta`, `days`, `cause`, `decider`, `status`, `proposed_by_ref`, `decided_by_ref`; `grounds`, `status` | Internal | `prc.contract` | PRC-FR-133 ถึง PRC-FR-141 |
| `acceptance_committee` | `contract_id`, `subject_ref` | Confidential | `prc.acceptance` | PRC-FR-085, PRC-FR-086 |
| `phase` | `contract_id`, `phase_no`, `name`, `due_on`, `amount`, `need`, `ext_days`, `ext_days_vendor`, `delivered_on`, `delivery_ref`, `result`, `ok_amount`, `cancelled_on` | Internal | `prc.acceptance` | PRC-FR-100, PRC-FR-107 ถึง PRC-FR-114 |
| `acceptance_signature`, `acceptance_dissent`, `acceptance_certificate` | `phase_id`, `subject_ref`, `signed_at`; `note`, `resolved_by_ref`; `copies`, `file_key` | Confidential | `prc.acceptance` | PRC-FR-110 ถึง PRC-FR-115 |
| `invoice` | `phase_id`, `no`, `amount`, `issued_on`, `status`, `return_why` | Internal | `prc.acceptance` | PRC-FR-116, PRC-FR-117 |
| `gate_hold`, `waiver` | `phase_id`, `failures`, `released_by_ref`, `reason`; `amount`, `status`, `doc`, `why` | Internal | `prc.acceptance` | PRC-FR-119, PRC-FR-125, PRC-FR-126 |
| `guarantee`, `guarantee_extension` | `contract_id`, `type`, `ref`, `amount`, `expires_on`, `status`; `from_on`, `to_on` | Internal | `prc.contract` | PRC-FR-127 ถึง PRC-FR-131 |
| `defect`, `supplier_letter` | `contract_id`, `fix_by`, `status`; `type`, `text`, `sent_on` | Internal | `prc.contract` | PRC-FR-079, PRC-FR-132 |
| `supervision`, `supervision_report`, `assessment` | `contract_id`, `supervisor_ref`; `progress`, `note`; `checkpoint`, `result` | Confidential | `prc.contract` | PRC-FR-143 ถึง PRC-FR-148 |
| `drawing_round`, `boq_item`, `serial_no` | `contract_id`, `round_no`, `status`; `unit`, `quantity`, `unit_price`; `serial` | Internal | `prc.contract` | PRC-FR-104 ถึง PRC-FR-106 |
| `supplier` | `name`, `normal_name`, `type`, `sme`, `local`, `status`, `tax_id_enc`, `tax_id_bidx`, `contact_enc`, `sme_cert`, `mit_cert` | Confidential เลขผู้เสียภาษีเป็น Restricted | `prc.supplier` | PRC-FR-149, PRC-FR-150 |
| `abandoned_list_row`, `abandoned_import`, `blacklist_release` | `name`, `normal_name`, `tax_id_bidx`, `since_on`, `ref`; `file_key`, `rows`; `case_id`, `evidence` | Confidential | `prc.supplier` | PRC-FR-151 ถึง PRC-FR-153 |
| `entity_check` | `supplier_id`, `status`, `checked_at` | Internal | `prc.supplier` | PRC-FR-154 |
| `number_series`, `number_log` | `doc_type`, `fiscal_year`, `unit_code`, `last_no`, `format`; `no`, `ref`, `issued_by_ref` | Internal | `prc.config` | PRC-FR-155, PRC-FR-156, BR-PRC-33 |
| `form_document`, `reminder` | `template`, `case_id`, `no`, `text`, `sign_state`, `file_key`, `channel`; `target`, `sent_at` | Confidential | `prc.case` | PRC-FR-157 ถึง PRC-FR-160 |
| `incoming_document`, `incoming_field` | `type`, `source`, `status`, `file_key`; `name`, `value`, `original`, `confidence`, `checked` | Confidential | `prc.intake` | PRC-FR-161 ถึง PRC-FR-163 |
| `egp_import`, `egp_import_row` | `file_hash`, `imported_by_ref`, `ok_count`, `skipped_count`; `plan_no`, `egp_no`, `stage`, `stage_on` | Internal | `prc.plan` | PRC-IR-001, PRC-IR-002 |
| `monthly_summary`, `red_flag` | `month`, `rows` (jsonb), `published_at`; `signal`, `target`, `score`, `status`, `evidence`, `note` | Public หลังเผยแพร่; Confidential | `prc.report` | PRC-FR-164, PRC-FR-171 ถึง PRC-FR-175 |
| `procurement_setting`, `procurement_profile`, `method_rule`, `category` | `key`, `value`, `effective_from`; `kind`, `switches`; `rule_id`, `condition`, `method`, `ceiling`, `on`; `kind` | Internal | `prc.config` | PRC-FR-040 ถึง PRC-FR-042, PRC-FR-176 ถึง PRC-FR-179 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | สั้น กำหนดร่วมกับ platform | ADR-0008 |

> [!NOTE] บัญชีธนาคารของผู้ขายและใบสำคัญเป็นของ Finance จึงไม่มีตารางของ procurement เก็บบัญชีธนาคาร คำขอเปลี่ยนบัญชีจาก portal ส่งไปยัง Finance ผ่าน SPI `BankChangeIntake` โดยไม่เรียกคลาสของ Finance โดยตรง (PRC-IR-012)

> [!NOTE] ข้อมูลสองส่วนอยู่นอก schema นี้ รายการวันหยุดคือตาราง `holiday` ของ `platform` ภายใต้ `WorkingCalendar` (DG-PLT-02, PRC-FR-043) การรันเอเจนต์และการใช้ AI เป็นไปตาม runtime ร่วมที่เสนอใน DG-REV-01 โดย `agent_run` และ `ai_use` อยู่ใน `platform.ai` และ Procurement เก็บเครื่องมือของตนใน `ToolRegister` (PRC-FR-181, PRC-FR-185, PRC-FR-187)

### ฟิลด์ข้อมูลส่วนบุคคลและข้อมูล Restricted {#prc-data-fields}

ตารางนี้เป็นข้อมูลนำเข้าของพจนานุกรมข้อมูลและบันทึกกิจกรรมการประมวลผล (ADR-0014, PDPA 39, PRC-DR-009) ฐานทางกฎหมาย วัตถุประสงค์ และระยะเก็บรักษาบันทึกรายฟิลด์ไว้ที่นั่น ฐานทางกฎหมายของแต่ละฟิลด์ต้องให้เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลยืนยัน

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `supplier.tax_id_enc` | Restricted | เข้ารหัสฟิลด์ AES-256-GCM ผ่าน Tink คีย์แยกต่อหน่วยงาน และบันทึกการเปิดดู | เลขของบุคคลธรรมดาถูกปิดบังนอกบทบาทพัสดุ (PRC-DR-009) |
| `supplier.tax_id_bidx`, `abandoned_list_row.tax_id_bidx` | Restricted | blind index แบบมีคีย์และมีคีย์ของตนเอง | ใช้จับคู่ตรงตัวเท่านั้น สำหรับ PRC-FR-149 และ BR-PRC-22 |
| `supplier.contact_enc` | Confidential | เก็บแบบเข้ารหัส และเข้าถึงตามบทบาท | อีเมลและการติดต่อของผู้ขายบุคคลธรรมดา |
| คอลัมน์ `*_ref` | Confidential | รหัสแฝง ชื่อจริงอยู่ในตาราง subject ของ platform | รายงานแสดงตัวแทนเมื่อลบแล้ว (ADR-0015) |
| `declaration`, `evaluation_score` | Confidential | เข้าถึงตามบทบาท และไม่เข้าดัชนีค้นหาก่อนประกาศผล | ไม่ส่งออกใน OCDS (PRC-IR-014) |
| `rfq_reply.sealed_payload` | Confidential | ปิดผนึกตาม ADR-0013 ดูหัวข้อความมั่นคงปลอดภัย | อ่านไม่ได้ก่อนวันตอบ |
| ไฟล์ `incoming_document` | อาจเป็น Restricted | สแกน ClamAV คีย์แยกต่อหน่วยงาน และไม่ทำดัชนีข้อความก่อนยืนยัน | เอกสารอาจมีเลขบัตรหรือบัญชีธนาคาร |

### ไฟล์ การค้นหา และการเก็บรักษา {#prc-data-files}

- ไฟล์ TOR หลักประกัน ใบส่งมอบ ใบแจ้งหนี้ และใบตรวจรับที่ลงนามแล้วเป็น object ใน S3 API เชื่อมด้วย `file_key` (PRC-DR-008) ทุกการอัปโหลดถูกสแกนก่อนดาวน์โหลดได้ และเข้ารหัสด้วยคีย์ของหน่วยงาน (ADR-0010)
- ไม่เก็บไฟล์ข้อเสนอฉบับเต็ม (PRC-DR-007) ทั้งนี้ขึ้นกับ OI-PRC-13
- OpenSearch ทำดัชนีแฟ้ม รายการในแผน สัญญา และผู้ขายตามชื่อและเลขที่ ข้อมูล Restricted ไม่เข้าดัชนี และทุกคำค้นถูกกรองตามหน่วยงานที่เซิร์ฟเวอร์ (ADR-0009) PostgreSQL ยังเป็นแหล่งข้อมูลจริง
- คีย์การเก็บรักษาแต่ละรายการชี้แถวหนึ่งในตารางของ `platform` ซึ่งอ่านผ่าน `RetentionRegistry` ระเบียนที่กฎหมายกำหนดให้เก็บลบก่อนกำหนดไม่ได้ โดย `procurement` ติดตั้ง `RetentionHold` และเจ้าของข้อมูลเห็นเหตุผล (ADR-0014) ค่าตั้งและช่วงที่อนุญาตรอ OI-PRC-14

## การออกแบบส่วนเชื่อมต่อ {#prc-interfaces}

REST API อธิบายด้วย OpenAPI 3.1 (ADR-0003) และเหตุการณ์อธิบายด้วย AsyncAPI (ADR-0008) หน่วยงานมาจาก token และไม่มาจาก path คำขอที่เปลี่ยนสถานะส่ง `If-Match` พร้อม version ของ aggregate และการตอบกลับไม่มีฟิลด์ที่ผู้เรียกไม่มีสิทธิ์เห็น

### REST endpoint {#prc-rest}

> [!NOTE] รายการ endpoint นี้เป็นข้อเสนอ path อ้างอิงจาก `/api/v1/procurement` และชื่อสิทธิ์กำหนดในหัวข้อความมั่นคงปลอดภัย

| Method และ path | วัตถุประสงค์ | สิทธิ์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `GET, POST /plan-items`; `GET, PUT, DELETE /plan-items/{id}` | แสดง เพิ่ม แก้ไข ลบรายการในแผน | `prc.plan.write` | PRC-FR-001 ถึง PRC-FR-003 |
| `POST /plan-items/{id}/cancel` | ยกเลิกรายการพร้อมเหตุผล | `prc.plan.write` | PRC-FR-004, PRC-FR-005 |
| `GET, POST /plan-versions`; `POST /plan-versions/{id}/approve, reject, withdraw, publish` | วงจรของฉบับแผน | `prc.plan.write`, `prc.approve` | PRC-FR-006 ถึง PRC-FR-008 |
| `GET, POST /requisitions`; `GET, PUT, DELETE /requisitions/{id}` | ระเบียนใบขอ | `prc.req.write` | PRC-FR-012 ถึง PRC-FR-015, PRC-FR-025 |
| `POST /requisitions/{id}/send, withdraw` | การทำงานของผู้ขอ | `prc.req.write` | PRC-FR-016 ถึง PRC-FR-018, PRC-FR-024 |
| `POST /requisitions/{id}/approve, return, reject, cancel` | การทำงานของผู้อนุมัติ | `prc.approve` | PRC-FR-019 ถึง PRC-FR-023 |
| `GET /cases`; `GET /cases/{id}`; `GET /cases/{id}/timeline` | รายการแฟ้ม แฟ้ม และไทม์ไลน์ | `prc.read` | PRC-FR-026, PRC-FR-028, PRC-FR-029 |
| `POST /cases/{id}/move, fail, cancel, close` | คำสั่งเปลี่ยนขั้น | `prc.case.write` | PRC-FR-027, PRC-FR-030, PRC-FR-031, PRC-FR-142 |
| `GET /cases/{id}/method-advice`; `PUT /cases/{id}/method`; `POST /cases/{id}/method/approve, reject` | คำแนะนำและการเลือกวิธี | `prc.case.write`, `prc.head` | PRC-FR-036 ถึง PRC-FR-039 |
| `PUT /cases/{id}/reference-price`; `POST, PUT, DELETE /cases/{id}/market` | ราคากลางและการสำรวจตลาด | `prc.case.write` | PRC-FR-049, PRC-FR-050 |
| `GET, POST /tor-templates`; `POST /tor-templates/{id}/versions/{v}/approve, reject`; `PUT, DELETE /cases/{id}/tor` | คลัง TOR และการผูกกับแฟ้ม | `prc.case.write`, `prc.head` | PRC-FR-046 ถึง PRC-FR-048 |
| `POST, PUT /cases/{id}/hearing`; `POST /cases/{id}/hearing/close, reopen, approve-revision` | การรับฟังความคิดเห็น TOR | `prc.case.write`, `prc.head` | PRC-FR-052, PRC-FR-053 |
| `POST, PUT, DELETE /cases/{id}/committees`; `POST /committees/{id}/declarations`; `POST /committees/{id}/replace-member` | คณะกรรมการและการแจ้งส่วนได้เสีย | `prc.case.write`, `prc.committee` | PRC-FR-081 ถึง PRC-FR-084 |
| `PUT /cases/{id}/egp-notice`; `POST /cases/{id}/qa`; `PUT /cases/{id}/bidders` | ข้อมูล e-GP คำถาม และจำนวนผู้ยื่น | `prc.case.write` | PRC-FR-054 ถึง PRC-FR-057 |
| `POST, PUT, DELETE /cases/{id}/bids`; `POST, PUT, DELETE /cases/{id}/quotations` | สรุปข้อเสนอและใบเสนอราคา | `prc.bid.write` | PRC-FR-058 ถึง PRC-FR-060 |
| `POST /cases/{id}/rfqs`; `GET /rfqs/{id}` | RFQ และคำตอบที่เปิดแล้วเท่านั้น | `prc.bid.write` | PRC-FR-061 |
| `POST, PUT, DELETE /cases/{id}/criteria`; `PUT /cases/{id}/scores/{memberRef}` | เกณฑ์และคะแนน | `prc.case.write`, `prc.committee` | PRC-FR-062 ถึง PRC-FR-064 |
| `POST /cases/{id}/award`; `POST /cases/{id}/award/withdraw` | การประกาศผลและการถอนผล | `prc.case.write`, `prc.head` | PRC-FR-073, PRC-FR-076 ถึง PRC-FR-078 |
| `POST /cases/{id}/appeals`; `POST /appeals/{id}/dismiss, uphold, forward, record-result` | การอุทธรณ์ | `prc.case.write`, `prc.head` | PRC-FR-071, PRC-FR-072, PRC-FR-074 |
| `POST /cases/{id}/bid-securities`; `POST /bid-securities/{id}/extend, return, forfeit` | หลักประกันการเสนอราคา | `prc.case.write`, `prc.head` | PRC-FR-092 ถึง PRC-FR-096 |
| `POST, PUT /cases/{id}/sample-tests` | การทดสอบตัวอย่าง | `prc.case.write` | PRC-FR-068 |
| `GET, POST /contracts`; `GET, PUT, DELETE /contracts/{id}`; `POST /contracts/{id}/sign` | ร่าง ตารางงวด ลบ ลงนาม | `prc.contract.write` | PRC-FR-097 ถึง PRC-FR-103 |
| `PUT /contracts/{id}/committee` | เปลี่ยนคณะกรรมการตรวจรับก่อนลายมือชื่อแรก | `prc.contract.write` | PRC-FR-085, PRC-FR-086 |
| `POST /contracts/{id}/guarantee`; `POST /contracts/{id}/guarantee/extend, return` | หลักประกัน | `prc.contract.write` | PRC-FR-127 ถึง PRC-FR-131 |
| `POST /contracts/{id}/phases/{n}/delivery` | บันทึกการส่งมอบ | `prc.contract.write` | PRC-FR-107, PRC-FR-108 |
| `POST, DELETE /contracts/{id}/phases/{n}/signatures`; `POST /contracts/{id}/phases/{n}/dissents/{i}/resolve` | ลงนาม ถอน และสั่งการความเห็นแย้ง | `prc.accept`, `prc.head` | PRC-FR-110 ถึง PRC-FR-114 |
| `POST, DELETE /contracts/{id}/phases/{n}/invoice` | บันทึกหรือส่งคืนใบแจ้งหนี้ | `prc.invoice` | PRC-FR-116, PRC-FR-117 |
| `GET /contracts/{id}/phases/{n}/gate`; `POST /contracts/{id}/phases/{n}/gate/release` | แสดงประตู และปลดการพัก | `prc.read`, `prc.head` | PRC-FR-118, PRC-FR-119 |
| `POST, PUT /contracts/{id}/phases/{n}/waiver`; `POST .../waiver/approve, reject, withdraw, cancel` | การงดหรือลดค่าปรับ | `prc.contract.write`, `prc.approve` | PRC-FR-125, PRC-FR-126 |
| `POST /contracts/{id}/variations`; `POST /variations/{id}/approve, reject, withdraw` | การแก้ไขสัญญา | `prc.contract.write`, `prc.head`, `prc.approve` | PRC-FR-133 ถึง PRC-FR-138 |
| `POST /contracts/{id}/termination`; `POST /contracts/{id}/termination/approve, reject` | การบอกเลิกสัญญา | `prc.contract.write`, `prc.approve` | PRC-FR-139 ถึง PRC-FR-141 |
| `POST /contracts/{id}/defects, letters, supervision-reports, assessments, drawings, boq, serials` | ระเบียนติดตามสัญญา | `prc.contract.write` | PRC-FR-079, PRC-FR-104 ถึง PRC-FR-106, PRC-FR-132, PRC-FR-143 ถึง PRC-FR-147 |
| `GET, POST /suppliers`; `GET, PUT /suppliers/{id}`; `POST /suppliers/{id}/entity-check` | ทะเบียนผู้ขาย | `prc.supplier` | PRC-FR-149, PRC-FR-150, PRC-FR-154 |
| `POST /abandoned-list/imports`; `POST /cases/{id}/blacklist-releases` | นำเข้ารายชื่อและปลดรายการที่ตรง | `prc.supplier`, `prc.head` | PRC-FR-151 ถึง PRC-FR-153 |
| `POST /egp/imports`; `GET /cases/{id}/egp-pack` | ไฟล์ e-GP และชุดข้อมูล | `prc.case.write` | PRC-IR-001 ถึง PRC-IR-004 |
| `GET, POST /documents`; `POST /documents/{id}/request-signature, sign, send, publish`; `POST /incoming-documents`; `POST /incoming-documents/{id}/confirm` | แบบฟอร์มและการรับเอกสาร | `prc.doc` | PRC-FR-157 ถึง PRC-FR-163 |
| `GET, POST /fee-claims`; `POST /fee-claims/{id}/approve, reject` | ค่าตอบแทนกรรมการ | `prc.case.write`, `prc.head`, `prc.approve` | PRC-FR-089, PRC-FR-090 |
| `GET /reports/monthly`; `POST /reports/monthly/{month}/publish`; `GET /reports/kpis, forecast, timeline`; `POST /reports/what-if`; `GET /exports/ocds` | รายงานและการส่งออก | `prc.read`, `prc.head` | PRC-FR-164 ถึง PRC-FR-170, PRC-IR-014 |
| `GET /red-flags`; `POST /red-flags/{id}/ask, explain, decide` | คิวสัญญาณเตือน | `prc.flag` | PRC-FR-173, PRC-FR-174 |
| `GET, PUT /settings`; `GET, PUT /profile`; `GET, PUT /method-rules`; `GET, PUT /number-formats` | การดูแลระบบ | `prc.admin` | PRC-FR-040 ถึง PRC-FR-043, PRC-FR-156, PRC-FR-176 ถึง PRC-FR-179 |
| `POST /ai/{tool}`; `POST /agents/{agent}/runs`; `POST /agent-runs/{id}/steps/{n}/approve` | เครื่องมือ AI และขั้นตอนของเอเจนต์ ซึ่งส่งต่อให้ `AgentRuntime` (ข้อเสนอ DG-REV-01) | `prc.ai` และสิทธิ์ของการกระทำนั้น | PRC-FR-180 ถึง PRC-FR-188 |
| `GET /portal/rfqs`; `POST /portal/rfqs/{id}/reply, decline`; `GET /portal/contracts`; `POST /portal/contracts/{id}/phases/{n}/invoice`; `POST /portal/bank-change` | portal ของผู้ขาย เฉพาะระเบียนของตน | `prc.portal` | PRC-IR-010 ถึง PRC-IR-012 |

### รายการข้อผิดพลาด {#prc-errors}

> [!NOTE] รหัสเหล่านี้เป็นข้อเสนอ ข้อผิดพลาดอยู่ในรูป Problem Details พร้อมฟิลด์ `code` และเงื่อนไขแรกที่ยังไม่ผ่านเมื่อเปลี่ยนขั้นไม่สำเร็จ ข้อความเป็นภาษาของผู้ใช้

| รหัส | HTTP | ความหมาย | กฎหรือข้อกำหนด |
| --- | --- | --- | --- |
| `PRC_INVALID_INPUT` | 400 | ฟิลด์ไม่ผ่านการตรวจ | PRC-FR-013, BR-PRC-05, BR-PRC-18 |
| `PRC_REASON_REQUIRED` | 400 | ไม่มีเหตุผลหรือสั้นเกินไป | PRC-FR-033, BR-PRC-02 |
| `PRC_FORBIDDEN` | 403 | ผู้ใช้ไม่มีสิทธิ์ | ADR-0006 |
| `PRC_SOD_BLOCKED` | 403 | กฎแยกหน้าที่ปฏิเสธบุคคลนี้ และมีการบันทึกความพยายาม | BR-PRC-08, PRC-NFR-002 |
| `PRC_FEATURE_OFF` | 403 | สวิตช์ของฟังก์ชันนี้ปิดอยู่ | PRC-FR-178 |
| `PRC_AI_NOT_ALLOWED` | 403 | เครื่องมือปิดอยู่ หรือคำขออยู่นอกขอบเขต AI | BR-PRC-34, PRC-FR-181 |
| `PRC_NOT_FOUND` | 404 | ไม่พบระเบียน หรือเป็นของหน่วยงานหรือผู้ขายอื่น | ADR-0005, PRC-IR-010 |
| `PRC_VERSION_CONFLICT` | 409 | ระเบียนเปลี่ยนหลังจากอ่าน | ADR-0005 |
| `PRC_STATE_CONFLICT` | 409 | การกระทำนี้ใช้กับสถานะปัจจุบันไม่ได้ | PRC-CR-004, BR-PRC-27 |
| `PRC_STEP_CHECK_FAILED` | 409 | ยังไม่ผ่านเงื่อนไขของขั้น | PRC-FR-027, BR-PRC-16 |
| `PRC_LINE_ROOM_EXCEEDED` | 409 | เกินวงเงินคงเหลือของรายการ | BR-PRC-04, PRC-FR-017 |
| `PRC_SPLIT_EXPLANATION_REQUIRED` | 409 | ความเสี่ยงแตกซื้อต้องมีคำชี้แจง | PRC-FR-024 |
| `PRC_SUPPLIER_BLOCKED` | 409 | ผู้ขายอยู่ในรายชื่อผู้ทิ้งงาน | BR-PRC-22 |
| `PRC_COMMITTEE_INCOMPLETE` | 409 | คณะกรรมการไม่ครบตามกฎ | BR-PRC-06, BR-PRC-07 |
| `PRC_CONTRACT_INVALID` | 409 | ไม่ผ่านกฎผู้ชนะ วงเงิน งวด หรือวันลงนาม | BR-PRC-10, PRC-FR-103 |
| `PRC_GUARANTEE_INVALID` | 409 | วงเงินหรืออายุหลักประกันต่ำกว่ากฎ | BR-PRC-17, PRC-FR-128 |
| `PRC_GATE_NOT_PASSED` | 409 | ประตูเบิกจ่ายพักงวดนี้ | BR-PRC-15 |
| `PRC_GATE_PO_MISSING` | 409 | ไม่มีใบสั่งซื้อ GFMIS และปลดไม่ได้ | BR-PRC-15, PRC-IR-009 |
| `PRC_RFQ_CLOSED` | 409 | พ้นวันตอบแล้ว | PRC-IR-010 |
| `PRC_SETTING_OUT_OF_RANGE` | 422 | ค่าตั้งอยู่นอกช่วงที่อนุญาต | PRC-FR-042, PRC-FR-179 |
| `PRC_IMPORT_INVALID` | 422 | ไฟล์อ่านตามรูปแบบที่กำหนดไม่ได้ | PRC-IR-001, PRC-FR-151 |

### รายการเหตุการณ์ {#prc-events}

> [!NOTE] รายการเหตุการณ์นี้เป็นข้อเสนอ แต่ละเหตุการณ์เขียนลง `outbox_event` ในธุรกรรมของการเปลี่ยนแปลง และ relay ส่งไปยัง RabbitMQ (ADR-0008) การติดตั้งขนาดเล็กประมวลผล outbox โดยไม่ใช้ RabbitMQ ผู้รับตัดรายการซ้ำด้วย `eventId` และ routing key ขึ้นต้นด้วย `procurement.`

ทุกเหตุการณ์มี `eventId`, `tenantId`, `occurredAt` และ `aggregateId` พร้อมฟิลด์ด้านล่าง payload มีเฉพาะรหัสอ้างอิงและยอดเงิน ไม่มีข้อมูลส่วนบุคคล

| เหตุการณ์ | ผู้สร้าง | ฟิลด์เพิ่มเติม | ผู้รับ |
| --- | --- | --- | --- |
| `plan-version.published` | `PlanVersion.publish` | `versionNo`, `egpNoticeNo` | `review`, การค้นหา |
| `requisition.sent`, `requisition.approved`, `requisition.closed` | `Requisition` | `amount`, `lineId`, `outcome` | การแจ้งเตือน, `reporting` |
| `case.step-changed` | `ProcurementCase` | `fromStep`, `toStep` | `reporting`, การค้นหา |
| `case.failed`, `case.cancelled`, `case.closed` | `ProcurementCase` | `roundNo` | `reporting`, `projects` |
| `award.recorded`, `award.withdrawn` | `SourcingRound` | `supplierId`, `price`, `appealEndOn` | `reporting`, การเทียบ e-GP |
| `appeal.filed`, `appeal.decided` | `Appeal` | `result` | การแจ้งเตือน |
| `contract.signed` | `Contract.sign` | `lineId`, `amount`, `supplierId` | `finance`, `projects`, `reporting` |
| `contract.changed`, `contract.terminated` | `Contract` | `delta`, `versionNo` | `finance`, `reporting` |
| `phase.delivered`, `phase.accepted`, `phase.paid` | `Contract`, `PhasePayment` | `phaseNo`, `amount`, `late` | `finance`, `reporting` |
| `phase.gate-held`, `phase.gate-released` | `PaymentGateService` | `phaseNo`, `failures` | `finance`, การแจ้งเตือน |
| `penalty.waived` | `Waiver` | `phaseNo`, `amount` | `finance` |
| `guarantee.expiring` | งานสร้างรายการ | `expiresOn` | การแจ้งเตือน |
| `supplier.proposed-for-list` | `Contract.approveTermination` | `supplierId` | การแจ้งเตือน, `prc.head` |
| `settings.changed`, `profile.changed` | `settings` | `key`, `effectiveFrom` | แจ้งผู้ตรวจสอบและหัวหน้า |

### Adapter ภายนอก {#prc-adapters}

Adapter ทำงานบนเส้นทาง outbox ลองซ้ำได้อย่างปลอดภัย และแสดงสถานะให้ผู้ใช้เห็น (ADR-0008) ตรรกะของแฟ้มเห็นเฉพาะ port และส่วนควบคุมการจำลองไม่มีในหน่วยงานใช้งานจริง (PRC-NFR-006)

| Adapter | Port | รุ่นแรก | พฤติกรรม | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| e-GP status | `EgpStatusSource` | `EgpFileAdapter`: ไฟล์ที่เจ้าหน้าที่อัปโหลด | ตรวจแต่ละแถวกับแผน ข้ามแถวที่ไม่รู้จัก และบันทึกจำนวน ไฟล์เดิมให้ผลเดิมโดยใช้ `file_hash` และคีย์ของแถว | PRC-IR-001, PRC-IR-002, PRC-IR-005 |
| e-GP data pack | `EgpPackBuilder` | ข้อความภาษาไทยสำหรับคีย์ | สร้างจากแฟ้มขั้น 4 และ 5 และบันทึกทุกครั้ง | PRC-IR-004, PRC-NFR-005 |
| GFMIS | ไม่มีใน Procurement | อยู่ใน `finance` | Procurement เห็นเฉพาะข้อเท็จจริงของใบสั่งซื้อผ่าน `FinanceFacts` และไม่เรียก GFMIS | PRC-IR-009 |
| E-mail and e-signature | `Notifier`, `DocumentService` | บริการของ platform | ส่งหรือลงนามเมื่อกฎอนุญาตเท่านั้น | PRC-IR-016, PRC-FR-158, PRC-FR-159 |
| Legal-entity check | `EntityStatusSource` | ยังไม่มีจนกว่ามีช่องทางที่ได้รับอนุญาต | บันทึก active, dissolved, suspended หรือ not found | PRC-IR-017, PRC-FR-154 |
| Central appeals body | `AppealForwarding` | แบบฟอร์มมีเลข และบันทึกผลด้วยคน | ปิดการตัดสินภายในจนกว่าบันทึกผล | PRC-FR-074, BR-PRC-27 |
| OCDS export | `OcdsExporter` | OCDS 1.1 release package | ไม่รวมข้อเสนอที่แพ้ ชื่อกรรมการ และเหตุผลภายใน | PRC-IR-014 |
| ผลิตภัณฑ์ทรัพย์สิน | ยังไม่กำหนด | ไม่มี | รายการที่ตรวจรับและมีหมายเลขเครื่อง เมื่อมีส่วนเชื่อมต่อแล้ว | PRC-IR-018 |

> [!OPEN] ยังไม่ทราบสัญญาการเชื่อมต่อของ e-GP กรมบัญชีกลางต้องยืนยันรูปแบบและฟิลด์ของไฟล์ส่งออก การเปิด API ให้หน่วยงานและวิธีขอสิทธิ์ รูปแบบเลขประกาศแผน การลงนามและบริหารสัญญาใน e-GP วิธีรายงานการอุทธรณ์ และรูปแบบ OCDS กับคำนำหน้ารหัส (OI-PRC-03) ระหว่างนี้ `EgpFileAdapter` ไม่มีรูปแบบตายตัว จึงอ่านการแมปคอลัมน์ที่เก็บเป็นค่ากำหนดซึ่งไม่ผูกกับหน่วยงานใด

> [!OPEN] ยังไม่ทราบวิธีเชื่อมต่อ GFMIS และกรมบัญชีกลางต้องให้รายละเอียด (ADR-0008) เรื่องนี้กระทบ Procurement เฉพาะข้อเท็จจริงของใบสั่งซื้อ ส่วนคำถามว่า Fisko หรือ e-GP ถือข้อมูลหลักของสัญญาเมื่อ e-GP เปิดการบริหารสัญญา เจ้าของผลิตภัณฑ์เป็นผู้ตัดสินเมื่อได้คำตอบจากกรมดังกล่าว

## การออกแบบความมั่นคงปลอดภัย {#prc-security}

<!-- covers: PDPA 39; PDPA 40 -->

Keycloak ดูแลการเข้าสู่ระบบ (ADR-0006, XC-SEC-005) บทบาท กฎแยกหน้าที่ และการมอบอำนาจอยู่ใน `platform` และเซิร์ฟเวอร์ตรวจทุกการกระทำ (XC-SEC-003) แต่ละคำขอผูกหน่วยงานด้วย `SET LOCAL app.tenant_id` ในธุรกรรม row-level security จึงมีผลแม้คิวรีลืมกรอง Procurement อยู่ที่ OWASP ASVS Level 2 (XC-SEC-001) และเส้นทางประตูเบิกจ่ายตรวจที่ Level 3 ร่วมกับ Finance (ADR-0017, XC-SEC-002)

### สิทธิ์ {#prc-authorities}

> [!NOTE] ชื่อสิทธิ์เป็นข้อเสนอ การแมปบทบาทกับสิทธิ์เป็นข้อมูลของหน่วยงาน และค่าเริ่มต้นนี้เป็นไปตามตารางผู้เกี่ยวข้องใน SRS เซิร์ฟเวอร์ตรวจสิทธิ์ทุกการกระทำ (XC-SEC-003) และปฏิเสธคำขอที่ไม่มีบทบาทใดอนุญาตด้วย HTTP 403 พร้อมบันทึก log (XC-SEC-004)

| สิทธิ์ | บทบาทเริ่มต้น | อนุญาต |
| --- | --- | --- |
| `prc.read` | ทุกบทบาทของ Procurement ผู้ขอจำกัดตามหน่วยงาน | อ่านระเบียนที่บทบาทนั้นเห็นได้ |
| `prc.plan.write` | เจ้าหน้าที่พัสดุ หัวหน้า | รายการและฉบับของแผน |
| `prc.req.write` | ผู้ขอ เจ้าหน้าที่พัสดุ | สร้าง ส่ง ถอนใบขอ |
| `prc.approve` | ผู้มีอำนาจอนุมัติ โดยตรงหรือโดยการมอบอำนาจ | ฉบับแผน ใบขอ การแก้ไขขนาดใหญ่ การลดค่าปรับ การบอกเลิก |
| `prc.case.write`, `prc.contract.write` | เจ้าหน้าที่พัสดุ หัวหน้า | ดำเนินแฟ้มและสัญญา |
| `prc.bid.write` | เจ้าหน้าที่พัสดุ หัวหน้า | ข้อเสนอ ใบเสนอราคา RFQ |
| `prc.head` | หัวหน้าเจ้าหน้าที่พัสดุ | วิธี แม่แบบ การแก้ไขขนาดเล็ก อุทธรณ์ การริบ การปลด การเผยแพร่ |
| `prc.committee` | กรรมการของคณะนั้น ตรวจรายระเบียน | แจ้งส่วนได้เสียและให้คะแนน |
| `prc.accept` | กรรมการตรวจรับ ตรวจรายสัญญา | ลงนามตรวจรับ |
| `prc.invoice` | เจ้าหน้าที่พัสดุ เจ้าหน้าที่การเงิน | บันทึกและส่งคืนใบแจ้งหนี้ |
| `prc.supplier`, `prc.doc` | เจ้าหน้าที่พัสดุ หัวหน้า | ทะเบียนผู้ขาย เอกสาร |
| `prc.flag` | ผู้ตรวจสอบ หัวหน้า เจ้าหน้าที่และหน่วยงานเฉพาะรายการที่ถูกถาม | คิวสัญญาณเตือน PRC-FR-173 |
| `prc.admin` | ผู้ดูแลระบบ | กฎ ค่าตั้ง หมวดพัสดุ โปรไฟล์ ส่วนวันหยุดย้ายไปอยู่ที่ Platform พร้อมตาราง `holiday` |
| `prc.ai` | บทบาทที่หน่วยงานอนุญาต และเฉพาะเมื่อเครื่องมือเปิด | เครื่องมือ AI และเอเจนต์ |
| `prc.portal` | ผู้ใช้ภายนอกของผู้ขายที่ผูกกับเลขผู้เสียภาษีหนึ่งเลข | คำเชิญ สัญญา และใบแจ้งหนี้ของตน |

ผู้ตรวจสอบมีสิทธิ์ `prc.read` แต่ราคาข้อเสนอเป็นข้อยกเว้นจนกว่าจะบันทึกผล (PRC-NFR-007) read model คืนราคาให้เฉพาะบทบาทพัสดุและคณะกรรมการพิจารณาผล DG-PRC-07 บันทึกความขัดแย้งกับตารางผู้เกี่ยวข้องใน SRS

### การตรวจการแยกหน้าที่ {#prc-sod}

`SodGuard.check(rule, actorSet, others, item)` ทำงานภายในคำสั่ง หลังตรวจสิทธิ์และก่อนเปลี่ยนสถานะ `ActorSet` มีผู้กระทำและการมอบอำนาจทุกรายการที่มีผลอยู่ (`Delegations`) การปฏิเสธบันทึกในธุรกรรมของตนเอง บันทึกจึงคงอยู่แม้ธุรกรรมหลักย้อนกลับ พร้อมเวลา บุคคล บทบาท กฎ และรายการ รวมทั้งผู้มอบอำนาจ (PRC-NFR-002)

| กฎ | คำสั่ง | ผู้กระทำ | เทียบกับ | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| SD-01 | `Requisition.approve` | ผู้อนุมัติและผู้มอบอำนาจ | ผู้ขอ | PRC-FR-021 |
| SD-02 | `Contract.draft` การเปลี่ยนคณะกรรมการ | ผู้สร้างสัญญา | กรรมการตรวจรับ | PRC-FR-085, PRC-FR-086 |
| SD-02 | การลงนามงวด | กรรมการผู้ลงนาม | ผู้สร้างสัญญา | PRC-FR-110 |
| SD-06 | `Contract.draft` การเปลี่ยนคณะกรรมการ | กรรมการตรวจรับ | กรรมการพิจารณาผลและกรรมการซื้อจ้าง | PRC-FR-085, PRC-FR-086 |
| SD-07 | การให้คะแนน, `recordAward` | กรรมการ | การแจ้งส่วนได้เสีย | BR-PRC-19, PRC-FR-084 |
| SD-08 | `Variation.approve`, `Waiver.approve`, `Contract.approveTermination` | ผู้ตัดสินและผู้มอบอำนาจ | ผู้เสนอ | PRC-FR-126, PRC-FR-136, PRC-FR-140 |
| การตรวจคนละคน | ฉบับแผน วิธี ฉบับ TOR TOR ที่แก้ไข รายงานส่วนได้เสีย ค่าตอบแทน ลายมือชื่อเอกสาร | ผู้ตัดสิน | ผู้เสนอหรือผู้ร่าง | PRC-FR-007, PRC-FR-046, PRC-FR-053, PRC-FR-088, PRC-FR-090, PRC-FR-158, BR-PRC-02 |
| SD-03, SD-04, SD-05 | คำสั่งของ Finance | ดูบท FIN | เช่นเดียวกัน | อยู่นอกบทนี้ |

> [!NOTE] ต้นแบบมีสองเส้นทางในการเปลี่ยนคณะกรรมการตรวจรับ และเส้นทางหนึ่งไม่มีการตรวจ SD-06 (OI-PRC-05) ระบบจริงมีคำสั่งเดียวคือ `Contract.changeCommittee` ที่ตรวจทั้ง SD-02 และ SD-06 SRS ระบุว่าไม่มีการตรวจกรณีกฎแยกหน้าที่ปฏิเสธใน sweep กฎเหล่านี้จึงมีการทดสอบใหม่ในการออกแบบการทดสอบ

### ข้อเสนอที่ปิดผนึก {#prc-sealed}

ADR-0013 กำหนดให้ข้อเสนอที่ปิดผนึกเข้ารหัสจนถึงเวลาเปิด เพื่อไม่ให้ผู้ใดอ่านก่อน รวมถึงผู้ปฏิบัติการ (XC-SEC-028) ข้อเสนอของ e-GP เข้าสู่ Fisko หลังปิดรับเท่านั้น การปิดผนึกด้านล่างจึงใช้กับคำตอบ RFQ ที่ส่งผ่าน portal (PRC-IR-010, OI-XC-11)

- RFQ แต่ละรายการมีคีย์ปิดผนึกของตนเอง ซึ่งห่อด้วยคีย์ของหน่วยงานใน KMS หรือ OpenBao (XC-SEC-021) โดย `rfq_reply.sealing_key_ref` ระบุคีย์นั้น
- แอปพลิเคชันเข้ารหัสคำตอบเมื่อรับด้วย AES-256-GCM ผ่าน Tink (XC-SEC-020) ราคาและเงื่อนไขอยู่ใน `sealed_payload` เท่านั้นจนกว่าจะเปิด คอลัมน์ `price` ว่างอยู่ และ log กับการค้นหาไม่เห็นข้อมูล
- role ของแอปพลิเคชันไม่มีสิทธิ์ถอดรหัสด้วยคีย์นั้นจนกว่าจะพ้นวันตอบ จากนั้นงานเปิด RFQ ขอสิทธิ์ เปิดคำตอบทั้งหมดของ RFQ พร้อมกัน และเขียน Audit ไม่มี endpoint ที่เปิดคำตอบรายเดียว
- ทุกการใช้คีย์ถูกบันทึก (ADR-0013, XC-SEC-023) การใช้ก่อนวันตอบทำให้เกิดการแจ้งเตือนถึงผู้ตรวจสอบ
- วันตอบบนเซิร์ฟเวอร์เป็นตัวตัดสิน ผู้ขายเห็นเวลาที่รับและไม่เห็นคำตอบของผู้ขายรายอื่น

สรุปข้อเสนอที่กรอกในขั้น 6 เป็น Confidential ใช้การควบคุมตามบทบาทและไม่เข้ารหัสฟิลด์ เพราะการคำนวณคะแนนราคาต้องใช้ (BR-PRC-18) หลังประกาศผล ราคาที่ชนะเป็นข้อมูลสาธารณะ

> [!OPEN] ผู้ปฏิบัติการที่คุมทั้งนโยบาย KMS และแอปพลิเคชันยังให้สิทธิ์ก่อนเวลาได้ และบันทึกจะแสดงเมื่อเกิดเหตุแล้วเท่านั้น ผู้ตรวจทานด้านความมั่นคงปลอดภัยและเจ้าของผลิตภัณฑ์ต้องตัดสินว่าสิ่งนี้เป็นไปตาม "รวมถึงผู้ปฏิบัติการ" ใน ADR-0013 หรือไม่ หรือการปล่อยคีย์ต้องมีคนที่สองนอกทีมปฏิบัติการ (DG-PRC-06)

### Audit {#prc-audit}

- การอนุมัติ ไม่อนุมัติ ยกเลิก ปลด เปลี่ยนค่าตั้ง และนำเข้าทุกครั้งเขียนรายการผ่าน `AuditLog` (PRC-NFR-001, PRC-CR-006, XC-SEC-032) aspect `CommandAudit` บนแต่ละคำสั่งทำให้รายการอยู่ในธุรกรรมเดียวกัน
- บันทึกเขียนต่อท้ายได้อย่างเดียวและเป็น hash chain ต่อหน่วยงาน (XC-SEC-033, XC-SEC-034) รายการมีรหัสอ้างอิงบุคคลแบบแฝงและรหัสรายการ ไม่มีชื่อหรือข้อความอิสระ (ADR-0015, XC-SEC-037)
- เหตุผลและหมายเหตุอยู่ในระเบียนทางธุรกิจ และรายการ Audit ชี้ไปที่ระเบียนนั้น การลบบุคคลคือการทำลายคีย์ของบุคคล และไทม์ไลน์แสดงตัวแทน (XC-SEC-039, XC-SEC-040)
- การเปิดดูฟิลด์ Restricted ถูกบันทึกเช่นกัน (ADR-0015, XC-SEC-027, XC-SEC-041) รวมทั้งการจัดทำชุดเอกสารของแฟ้มทุกครั้ง (PRC-FR-035)
- log ของแอปพลิเคชันและ telemetry ไม่มีข้อมูลส่วนบุคคล และมีการทดสอบตรวจ (ADR-0015, ADR-0017)

### การควบคุม AI {#prc-ai-security}

- การเรียก AI ทั้งหมดผ่าน `AiGateway` AI ปิดเป็นค่าเริ่มต้น และทุกฟังก์ชันทำงานได้เมื่อปิด (ADR-0016, PRC-FR-189)
- `ToolRegister` เป็นรายการปิดต่อเอเจนต์ ไม่มีเครื่องมือให้คะแนน ประกาศผู้ชนะ สร้างหรือลงนามสัญญา อนุมัติ หรือจ่าย (BR-PRC-34, PRC-FR-180)
- ขั้นตอนที่เขียนข้อมูลหยุดรอคนที่ระดับ L2 การอนุมัติเรียกคำสั่งปกติ สิทธิ์และกฎแยกหน้าที่จึงมีผลกับผู้อนุมัติ (PRC-FR-187, PRC-FR-188)
- ข้อมูล Restricted คำตอบที่ปิดผนึก และราคาข้อเสนอก่อนประกาศผลไม่ถูกส่งให้โมเดล

## การออกแบบที่ไม่ใช่ฟังก์ชัน {#prc-nfr}

ตารางแสดงวิธีตอบข้อกำหนดที่ไม่ใช่ฟังก์ชันของ Procurement แต่ละข้อ เป้าหมายด้านเวลาและปริมาณคือแถวข้อกำหนดร่วม XC-PER-001 ถึง XC-PER-008 ซึ่งเป็นข้อเสนอ (OI-XC-01)

| ข้อกำหนด | คำตอบในการออกแบบ | ทวนสอบด้วย |
| --- | --- | --- |
| PRC-NFR-001 | aspect `CommandAudit` บนทุกคำสั่ง | การทดสอบ integration ต่อคำสั่ง |
| PRC-NFR-002 | `SodGuard` บันทึกในธุรกรรมของตนเอง | การทดสอบการปฏิเสธในการออกแบบการทดสอบ |
| PRC-NFR-003 | `WorkingCalendar` เดียวใน `platform` และไม่มีการคำนวณวันที่อื่น ตรวจด้วย ArchUnit | การทดสอบหน่วยและกฎสถาปัตยกรรม |
| PRC-NFR-004 | `ForecastEngine` จำลองตาม `fcRuns` ค่าเริ่มต้น 400 โดยใช้ seed จากรหัสแฟ้ม | การทดสอบรันซ้ำ |
| PRC-NFR-005 | ข้อความ React ภาษาไทยและอังกฤษ แม่แบบหนังสือ แบบฟอร์ม และชุดข้อมูลเป็นภาษาไทย (ADR-0004, ADR-0011) | Playwright ทั้งสองภาษา |
| PRC-NFR-006 | ไม่มีโค้ดจำลองในระบบจริง การเรียกภายนอกอยู่หลัง adapter และ adapter ทดสอบที่ติดป้ายชัดเจนมีเฉพาะ profile ทดสอบ | การตรวจตอน build |
| PRC-NFR-007 | ตัวกรองฟิลด์ใน read model จนกว่าจะมี `award` | การทดสอบ integration ต่อบทบาท |
| PRC-NFR-008 | `FeatureGuard` บนทุกคำสั่งเสริมและการตรวจขั้น | ชุดทดสอบแบบพารามิเตอร์ ปิดทีละสวิตช์และทุกชนิดหน่วยงาน |

### ภาระงานและความพร้อมใช้งาน {#prc-nfr-load}

- วางแผนความจุตามช่วงพีค 30 กันยายน ซึ่งทุกหน่วยงานพีคพร้อมกัน (ADR-0005) สคริปต์ k6 ครอบคลุมการประกาศแผน การลงนาม และการตรวจรับในช่วงนั้น (ADR-0017, XC-PER-008)
- row lock ของบัญชีวงเงิน Budget เป็นจุดแย่งชิงที่คาดว่าจะเกิดในช่วงพีค แต่ละธุรกรรมจึงถือ lock เฉพาะช่วงเรียกบัญชีและ commit และการทดสอบโหลดต้องวัดจุดนี้
- รายการอ่านจาก `display_step` และคอลัมน์ที่มีดัชนี พร้อมการแบ่งหน้า ส่วนรายงานอ่านจาก projection
- ความล้มเหลวกระทบหนึ่ง cell และเมื่อ adapter ล้มเหลว เหตุการณ์จะรออยู่ใน outbox พร้อมแสดงสถานะให้ผู้ใช้เห็น (ADR-0005, ADR-0008) ตรรกะของแฟ้มไม่รอระบบภายนอก
- telemetry ติดป้ายตาม cell และหน่วยงาน และไม่มีข้อมูลส่วนบุคคล (ADR-0017)

> [!OPEN] XC-PER-001 ถึง XC-PER-008 เป็นข้อเสนอ และไม่ได้ระบุปริมาณข้อมูลต่อหน่วยงานของ Procurement เจ้าของผลิตภัณฑ์ต้องยืนยัน (OI-XC-01) และระบุปริมาณนั้นก่อนที่การทดสอบโหลดจะตัดสินผ่านหรือไม่ผ่านได้ (DG-PRC-11)

## การออกแบบการทดสอบ {#prc-tests}

sweep ใน `tests/sweep.js` ทำงานภายในหน้าต้นแบบและทดสอบเซิร์ฟเวอร์ไม่ได้ แต่การเดินทดสอบเหล่านั้นยังเป็นคำอธิบายพฤติกรรมที่ตั้งใจไว้ได้ดีที่สุด แต่ละการเดินจึงกลายเป็นการทดสอบของระบบจริง และทุกการทดสอบระบุข้อกำหนดที่พิสูจน์ เพื่อให้วัดความครอบคลุมได้ (ADR-0017)

> [!NOTE] ชื่อคลาสทดสอบเป็นข้อเสนอ

### ระดับการทดสอบ {#prc-test-levels}

| ระดับ | เครื่องมือ | ครอบคลุม |
| --- | --- | --- |
| หน่วย | JUnit | ตารางสถานะทุกคู่ `PenaltyCalculator`, `MethodAdvisor`, `SplitRiskPolicy`, `ChangeLadder`, `SettingRange` โดยไม่มี Spring context |
| สถาปัตยกรรม | Spring Modulith `verify`, ArchUnit | ขอบเขตโมดูล ไม่มีวงกลมกับ `finance` ไม่มี framework ในโดเมน และไม่ข้าม outbox |
| Integration | JUnit กับ Testcontainers: PostgreSQL, RabbitMQ, OpenSearch, ที่เก็บแบบ S3, Keycloak | คำสั่งผ่านชั้น REST, row-level security ต่อตาราง, outbox และคำตอบที่ปิดผนึก |
| สถานการณ์ข้ามโมดูล | Spring Modulith `Scenario` | Procurement ร่วมกับ `budget` และ `finance` ในธุรกรรมเดียว |
| ต้นจนจบ | Playwright | เส้นทางของแต่ละบทบาททั้งภาษาไทยและอังกฤษ และเมทริกซ์การเปิดหน้า |
| โหลด | k6 | ช่วงพีค 30 กันยายน |
| ความมั่นคงปลอดภัย | OWASP ZAP, SonarQube, penetration test | ระดับ ASVS ตาม ADR-0017 |

### จากการเดินทดสอบใน sweep สู่การทดสอบของระบบจริง {#prc-test-walks}

| การตรวจใน sweep | การทดสอบของระบบจริง | ส่วนที่เพิ่มจากการเดินเดิม | ข้อกำหนด |
| --- | --- | --- | --- |
| PC1 walk | `PlanToRequisitionIT` (JUnit, Testcontainers); `plan-requisition.spec` (Playwright) | การไม่อนุมัติ คำชี้แจงแตกซื้อ การปฏิเสธเพราะวงเงิน และการปฏิเสธ SD-01 พร้อมแถวบันทึก | PRC-FR-001, PRC-FR-003, PRC-FR-004, PRC-FR-008, PRC-FR-012, PRC-FR-016, PRC-FR-018 ถึง PRC-FR-023, PRC-DR-004 |
| PC2 walk | `CaseRoundIT` | แถวของรอบอ่านอย่างเดียวที่ API และการยกเลิกล้างฟิลด์ตามรายการ | PRC-FR-030 ถึง PRC-FR-032, PRC-FR-058, PRC-DR-002 |
| PC3 walk | `ContractDraftToSignIT`; `contract-sign.spec` | ความล้มเหลวของบัญชีวงเงินย้อนธุรกรรม ต้องมีหลักประกันเมื่อลงนาม และปฏิเสธวันในอนาคต | PRC-FR-097, PRC-FR-099, PRC-FR-101 ถึง PRC-FR-103, PRC-FR-111, PRC-FR-128, PRC-IR-007 |
| PC4 walk | `LatePenaltyWaiverIT`; `AcceptanceToPaymentScenario` | ประตูผ่าน พัก ปลด และการตรวจ PO ที่ปลดไม่ได้ | PRC-FR-112, PRC-FR-116, PRC-FR-118, PRC-FR-119, PRC-FR-121, PRC-FR-125 |
| R59 walk | `CaseCorrectionsIT` | เก็บค่า e-GP เดิม และคำสั่งเปลี่ยนคณะกรรมการเดียวที่ตรวจ SD-06 | PRC-FR-055, PRC-FR-062, PRC-FR-082, PRC-FR-086, PRC-FR-108, PRC-FR-135 |
| Round 66 check | `PenaltyCalculatorTest` | อัตราที่ขอบเขต ศูนย์วัน การปัดแบบ `HALF_UP` ตามต้นแบบ และทุกชนิดสัญญา | PRC-FR-120 ถึง PRC-FR-122 |
| Page-open sweep | `role-matrix.spec`: every page for every role, in both languages | ไม่ผ่านเมื่อมี console error หรือข้อความผิดรูป และเพิ่มการสแกนการเข้าถึง | แถว Partial โดยทั่วไป |

### การทดสอบที่ไม่มีต้นทางใน sweep {#prc-test-new}

| การทดสอบ | ยืนยัน | ข้อกำหนด |
| --- | --- | --- |
| `SodRefusalIT` | กฎ SD แต่ละข้อปฏิเสธทั้งบุคคลและผู้มอบอำนาจ พร้อมแถวบันทึกและไม่เปลี่ยนสถานะ | BR-PRC-08, PRC-NFR-002 |
| `TenantIsolationIT` | สร้างจาก schema: ทุกตารางปฏิเสธการอ่านและเขียนข้ามหน่วยงาน | ADR-0005 |
| `SettingRangeTest` | ค่าตั้งแต่ละรายการปฏิเสธค่านอกช่วง และรับอัตราเช่น 0.10 ซึ่งฟอร์มของต้นแบบบันทึกไม่ได้ | PRC-FR-042, PRC-FR-179, OI-PRC-04 |
| `ProfileSwitchIT` | Procurement ทำงานได้เมื่อปิดทีละสวิตช์ และกับทุกชนิดหน่วยงาน | PRC-NFR-008, PRC-FR-178 |
| `SealedReplyIT` | ไม่มีบทบาทใดอ่านคำตอบก่อนวันตอบ เปิดพร้อมกันทั้งหมด และบันทึกการใช้คีย์ | ADR-0013, PRC-IR-010 |
| `BidPriceVisibilityIT` | ราคาถูกซ่อนจากบทบาทอื่นทุกบทบาทจนกว่าจะประกาศผล | PRC-NFR-007 |
| `EgpImportIT` | ข้ามแถวที่ไม่รู้จัก บันทึกจำนวน และไฟล์เดิมให้ข้อมูลเดิม | PRC-IR-001, PRC-IR-002 |
| `AiLimitsTest` | ทะเบียนไม่มีเครื่องมือต้องห้าม และทุกสวิตช์ที่ปิดปฏิเสธการใช้ | BR-PRC-34, PRC-FR-180, PRC-FR-181 |
| `AuditChainIT` | แต่ละคำสั่งในรายการทิ้งรายการ Audit หนึ่งรายการโดยไม่มีข้อมูลส่วนบุคคล | PRC-NFR-001, ADR-0015 |
| `OcdsExportTest` | ไม่มีข้อเสนอที่แพ้ ชื่อกรรมการ และเหตุผลภายใน | PRC-IR-014 |

## การย้ายจากต้นแบบ {#prc-migration}

ต้นแบบเป็นเอกสารอ้างอิงและไม่มีการย้ายโค้ด เพราะเป็น JavaScript บนเบราว์เซอร์ที่เก็บสถานะในหน่วยความจำ สิ่งที่สืบทอดคือความรู้ที่อยู่ในต้นแบบ ไม่มีข้อมูลจริงให้ย้าย และข้อมูลตั้งต้นของหน่วยงานเป็นเรื่องการเริ่มใช้งานที่แยกต่างหาก

| สิ่งที่สืบทอด | วิธี | ที่มาในต้นแบบ |
| --- | --- | --- |
| ชื่อสถานะและการเปลี่ยนสถานะ | เขียนใหม่เป็น enum และตารางของ Java | `61-cases.js` `CASE_STATES`, `caseState`; `86-con-crud.js` |
| กฎธุรกิจ | เขียนใหม่พร้อมการทดสอบจาก SRS | `61-cases.js`, `63-contracts.js`, `63b-contract-late.js`, `64-duties.js` |
| ตรรกะค่าปรับ ประตูเบิกจ่าย และการปิดแฟ้ม | เขียนใหม่เป็น `PenaltyCalculator`, `PaymentGateService`, `CloseChecks` | `63-contracts.js` `phPenaltyRaw`, `payGate`; `63b-contract-late.js` `closeChecks` |
| ชื่อฟิลด์ | คงไว้เมื่อเหมาะสม ในรูปแบบของฐานข้อมูล | `84-proc-crud.js`, `85-case-crud.js`, `86-con-crud.js` |
| หน้าจอและขั้นตอน | React ใช้หน้า รูปแบบรายการและ drawer และหน้าแฟ้มแบบเดียวกัน | `74-proc-pages.js`, `76-crud.js`, `61d-ui-board.js` |
| ป้ายข้อความไทยและอังกฤษ | ย้ายไปไฟล์ข้อความ | `L()` labels in `60` to `88` |
| การเดินทดสอบ | เขียนใหม่เป็นการทดสอบ | `tests/sweep.js` |
| ข้อความแบบฟอร์มและหนังสือ | กลายเป็นแม่แบบของหน่วยงาน | `73-t4.js` `FORM_T`; `63b-contract-late.js` `LETTER_T` |
| ค่าเริ่มต้น | กลายเป็นข้อมูลตั้งต้นของหน่วยงานภายในช่วง | `61-cases.js`, `63-contracts.js`, `70-profile.js` seeds |

| สิ่งที่ไม่สืบทอด | เหตุผล | แทนด้วย |
| --- | --- | --- |
| สถานะในเบราว์เซอร์และ `S` | ผู้ใช้คนเดียว ไม่มีเซิร์ฟเวอร์ | PostgreSQL ต่อ cell |
| การสลับบทบาทในหน้า | ไม่มีตัวตนจริง | Keycloak และบทบาทใน `platform` |
| ปุ่ม `Simulate` และไฟล์ตัวอย่าง | ต้องไม่มีในระบบจริง (PRC-NFR-006) | adapter และงานตามกำหนดเวลา |
| ข้อมูลหน่วยงานตัวอย่างและคอลัมน์อ้างอิงของรายการฟังก์ชัน | ไม่เป็นส่วนของผลิตภัณฑ์ทั่วไป | ข้อมูลของหน่วยงานเท่านั้น |
| การตรวจที่อยู่บนหน้าจอเท่านั้น | เซิร์ฟเวอร์ต้องเป็นผู้ตัดสิน (ADR-0006) | เมธอดของโดเมน |
| ขีดจำกัด 1,000 เหตุการณ์ของแฟ้ม | ไม่ใช้กับระบบจริง (PRC-DR-005) | `case_event` ไม่จำกัด |
| ตัวเลขที่ฝังในหนังสือและแบบฟอร์ม | PRC-CR-002 | ค่าตั้งและแม่แบบ |
| ตัวแทน AI และ OCR แบบกฎ | บริการจริงต่างออกไป | `AiGateway` และบริการสกัดข้อมูล ซึ่งมีการประเมินของตนเอง |
| การสร้างทั้งหน้าใหม่และการค้นหาในหน่วยความจำ | ไม่เหมาะกับผู้ใช้จำนวนมาก | React และ OpenSearch |
| ข้อบกพร่องของต้นแบบที่ทราบแล้ว | ฟอร์มค่าตั้งบันทึกไม่ได้ (OI-PRC-04) และเส้นทางเปลี่ยนคณะกรรมการอีกทางไม่ตรวจ SD-06 (OI-PRC-05) | แก้ด้วยการออกแบบและครอบคลุมด้วยการทดสอบ |

## ช่องว่างที่ทราบและประเด็นค้าง {#prc-open}

### ประเด็นที่สืบมาจาก SRS {#prc-open-srs}

| ประเด็น | ผลต่อการออกแบบนี้ | แนวทางปัจจุบัน | ผู้ตัดสิน |
| --- | --- | --- | --- |
| OI-PRC-01 | การอ้างข้อกฎหมายของขีดจำกัด | รายการใน `LegalRuleSet` มีฟิลด์ข้อกฎหมาย และเว้นว่างเมื่อยังไม่ยืนยัน | ผู้เชี่ยวชาญด้านพัสดุ |
| OI-PRC-02 | เพดานของวิธี | เพดานเป็นแถวใน `method_rule` พร้อมวันที่มีผล | ผู้เชี่ยวชาญด้านพัสดุ |
| OI-PRC-03 | สัญญาการเชื่อมต่อ e-GP | port `EgpStatusSource` และ adapter แบบไฟล์ | กรมบัญชีกลาง |
| OI-PRC-04 | ข้อบกพร่องของฟอร์มค่าตั้ง | อัตราเป็นทศนิยมใน `SettingRange` และ `SettingRangeTest` | ทีมพัฒนา |
| OI-PRC-05 | สองเส้นทางเปลี่ยนคณะกรรมการ | คำสั่งเดียวคือ `Contract.changeCommittee` | ทีมพัฒนา |
| OI-PRC-06 | ฐานค่าปรับ | `PenaltyCalculator` เก็บฐานไว้เมธอดเดียว และใช้ยอดงวดตามโค้ด | ผู้เชี่ยวชาญด้านพัสดุ |
| OI-PRC-07 | ช่วงของค่าที่เก็บไว้ | เก็บไว้โดยใช้ช่วงชั่วคราวตั้งแต่ 0 ขึ้นไป | ผู้เชี่ยวชาญด้านพัสดุ เจ้าของผลิตภัณฑ์ |
| OI-PRC-08 | ผู้รับผิดชอบกฎเลือกวิธี | แถวตั้งต้นมากับแต่ละรุ่น และหน่วยงานเปิดปิดกฎได้ | ฝ่ายกฎหมาย เจ้าของผลิตภัณฑ์ |
| OI-PRC-09 | รูปแบบรายงานประจำเดือน | `monthly_summary.rows` เป็น jsonb และรูปแบบเป็นแม่แบบ | ผู้เชี่ยวชาญด้านพัสดุ |
| OI-PRC-10 | อัตราสิทธิพิเศษและค่าตอบแทน | ค่าตั้งของหน่วยงานภายในช่วง | ผู้เชี่ยวชาญด้านพัสดุ |
| OI-PRC-11 | การมองเห็นและเวลาของสัญญาณเตือน | `prc.flag` และคิวตาม SRS | ผู้ตรวจสอบ เจ้าของผลิตภัณฑ์ |
| OI-PRC-12 | ขอบเขต AI และตำแหน่งของโมเดล | การเรียกทั้งหมดผ่าน `AiGateway` และปิดเป็นค่าเริ่มต้น | เจ้าของผลิตภัณฑ์ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| OI-PRC-13 | ไฟล์ข้อเสนอฉบับเต็ม | ไม่เก็บ หากเปลี่ยนในอนาคตจะเพิ่มชนิดไฟล์หนึ่งชนิดในเส้นทางเดิม | ฝ่ายกฎหมาย เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |
| OI-PRC-14 | ระยะเก็บรักษา | มีคีย์การเก็บรักษาต่อตาราง แต่ยังไม่มีระยะเวลา | ผู้เชี่ยวชาญด้านพัสดุ เจ้าของผลิตภัณฑ์ |
| OI-PRC-15 | อัตราค่าปรับของสัญญาที่ปรึกษาและออกแบบ | ปฏิเสธ `consult` เมื่อลงนามจนกว่าจะมีอัตรา (DG-PRC-01) | ผู้เชี่ยวชาญด้านพัสดุ |
| OI-PRC-16 | บาทเต็มหรือมีสตางค์ | คอลัมน์ `numeric` ทศนิยมสองตำแหน่งพร้อมการตรวจในโดเมน (DG-PRC-02) | ผู้เชี่ยวชาญด้านพัสดุ เจ้าของผลิตภัณฑ์ |
| OI-PRC-17 | การปิดผนึกการตอบ RFQ | หัวข้อการปิดผนึกข้อเสนอ ภายใต้ XC-SEC-028 (OI-XC-11) | เจ้าของผลิตภัณฑ์ ผู้ทบทวนด้านความมั่นคงปลอดภัย |

### ประเด็นใหม่จากการออกแบบนี้ {#prc-open-new}

เลข DG-PRC ด้านล่างเป็นของบทนี้และไม่ใช่รหัสใน SRS

| ประเด็น | คำถาม | แนวทางปัจจุบัน | ผู้ตัดสิน |
| --- | --- | --- | --- |
| DG-PRC-01 | BR-PRC-12 ระบุอัตราของสินค้า บริการ และก่อสร้าง แต่ PRC-FR-037 เพิ่มที่ปรึกษาและออกแบบ จะใช้อัตราและค่าขั้นต่ำใด | ต้นแบบใช้อัตราสินค้าพร้อมค่าขั้นต่ำของบริการ ส่วนการออกแบบนี้ปฏิเสธการลงนามสัญญา `consult` จนกว่าจะมีอัตรา | ผู้เชี่ยวชาญด้านพัสดุ |
| DG-PRC-02 | PRC-DR-006 เก็บเป็นจำนวนเต็มบาท แต่ใบแจ้งหนี้จริงมีสตางค์ และ `invoiceTol` มีค่าเริ่มต้น 0 ใบแจ้งหนี้เช่นนั้นจึงไม่ผ่านประตู จะเก็บสตางค์หรือไม่ | คอลัมน์ `numeric` ทศนิยมสองตำแหน่ง และการตรวจจำนวนเต็มบาทในโดเมนที่นำออกได้ด้วยการออกรุ่น | ผู้เชี่ยวชาญด้านพัสดุ เจ้าของผลิตภัณฑ์ |
| DG-PRC-03 | หลังบอกเลิก หลักประกันถูกริบ การตรวจหลักประกันของประตูยังใช้กับงวดที่ตรวจรับแล้วและยังไม่จ่ายหรือไม่ | ไม่ผ่านและต้องปลดข้อยกเว้นเหมือนต้นแบบ | ผู้เชี่ยวชาญด้านพัสดุ |
| DG-PRC-04 | เมื่อ `guaranteePct` เป็น 0 จะไม่ต้องมีหลักประกัน แต่ BR-PRC-15 ต้องมีหลักประกันที่มีผล มีข้อยกเว้นใดบ้าง | ประตูผ่านเมื่อค่าตั้งไม่กำหนดให้มีหลักประกัน ส่วนต้นแบบจะไม่ผ่าน | ผู้เชี่ยวชาญด้านพัสดุ |
| DG-PRC-05 | BR-PRC-08 ให้หน่วยงานปิดกฎแยกหน้าที่ใดก็ได้ แต่บางกฎอาจมาจากกฎหมาย และ ADR-0007 ไม่ให้หน่วยงานแก้ขีดจำกัดตามกฎหมาย กฎใดห้ามปิด ข้อนี้เป็นคำถามเดียวกับ OI-PLT-03 และคำตอบเดียวใช้ได้กับทั้งสองรายการ | ปิดได้ทั้งหมดตาม SRS และทุกการปิดแจ้งผู้ตรวจสอบ | ผู้เชี่ยวชาญด้านพัสดุ ฝ่ายกฎหมาย |
| DG-PRC-06 | การออกแบบการปล่อยคีย์เป็นไปตาม "รวมถึงผู้ปฏิบัติการ" ใน ADR-0013 หรือไม่ | งานเปิด RFQ เป็นผู้ให้สิทธิ์คีย์ และบันทึกทุกการใช้ | ผู้ตรวจทานด้านความมั่นคงปลอดภัย เจ้าของผลิตภัณฑ์ |
| DG-PRC-07 | ตารางผู้เกี่ยวข้องใน SRS ระบุว่าผู้ตรวจสอบอ่านได้ทุกอย่าง แต่ PRC-NFR-007 จำกัดราคาข้อเสนอก่อนประกาศผล ข้อใดมีผลเหนือกว่า | ใช้ PRC-NFR-007 | ผู้ตรวจสอบ เจ้าของผลิตภัณฑ์ |
| DG-PRC-08 | Platform ตอบแล้วใน[ตารางคำตอบ](#plt-dg-prc) และ Budget กับ Finance เผยแพร่ interface ของตนแล้ว เจ้าของผลิตภัณฑ์ยอมรับการเปลี่ยนแปลงต่อคำขอเหล่านั้นหรือไม่ | บทนี้ยึดตามคำตอบเหล่านั้น ตามรายการในหัวข้อองค์ประกอบ | ผู้เขียนบทเหล่านั้น เจ้าของผลิตภัณฑ์ |
| DG-PRC-09 | งานประจำวันย้ายแฟ้มจากขั้น 7 ไปขั้น 8 โดยไม่มีคนได้หรือไม่ เมื่อการอุทธรณ์ที่ยื่นมาจาก e-GP | งานเป็นผู้ย้ายและบันทึก `system` เป็นผู้กระทำ | เจ้าของผลิตภัณฑ์ ผู้เชี่ยวชาญด้านพัสดุ |
| DG-PRC-10 | การคัดลอกอัตราค่าปรับเมื่อลงนามต่างจากต้นแบบ กฎหมายคาดหมายให้สัญญาที่ดำเนินอยู่ใช้อัตราใด | อัตราเมื่อลงนาม | ผู้เชี่ยวชาญด้านพัสดุ |
| DG-PRC-11 | XC-PER-001 ถึง XC-PER-008 เป็นเป้าหมายที่เสนอสำหรับทุกโมดูล ปริมาณข้อมูลต่อหน่วยงานของ Procurement เป็นเท่าใด | การทดสอบโหลดใช้แถว XC-PER และยังไม่มีปริมาณเฉพาะของตน | เจ้าของผลิตภัณฑ์ |
| DG-PRC-12 | ผู้ขายเข้าสู่ระบบอย่างไร และผูกผู้ใช้กับเลขผู้เสียภาษีหนึ่งเลขอย่างไร (PRC-IR-013) | ผู้ใช้ Keycloak ภายใต้ organization ของผู้ขาย ผูกด้วย `tax_id_bidx` หลังเจ้าหน้าที่ตรวจ | เจ้าของผลิตภัณฑ์ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |

### ช่องว่างที่ทราบในฉบับนี้ {#prc-open-depth}

- การวิเคราะห์ การพยากรณ์ การจำลองสถานการณ์ และเอเจนต์ออกแบบถึงระดับองค์ประกอบและส่วนเชื่อมต่อเท่านั้น อัลกอริทึมเป็นไปตามต้นแบบและเอกสารออกแบบ Procurement และโมดูล review อาจรับบางส่วนไป
- แถว Planned ที่ไม่มีพฤติกรรมในต้นแบบมีเพียงตารางและ endpoint ได้แก่ PRC-FR-087, PRC-FR-091, PRC-FR-148 และ PRC-IR-018
- ชนิดคอลัมน์ ดัชนี และ constraint รอบทพจนานุกรมข้อมูล
