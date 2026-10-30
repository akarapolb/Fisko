# การออกแบบโมดูลการเงิน {#fin}

> [!NOTE] Fisko ยังไม่มีโค้ดสำหรับใช้งานจริง ต้นแบบเป็น JavaScript บนเบราว์เซอร์และใช้แสดงพฤติกรรมเท่านั้น ทุกสิ่งในบทนี้เป็นข้อเสนอเพื่อการพัฒนา แพ็กเกจ คลาส ตาราง endpoint เหตุการณ์ และชื่อการทดสอบด้านล่างยังไม่มีอยู่จริง เทคโนโลยีมาจาก ADR ที่ยอมรับแล้วใน `docs/adr/` บทนี้นำมาใช้และไม่เปิดประเด็นใหม่

## วัตถุประสงค์ ขอบเขต และการสอบย้อน {#fin-purpose}

<!-- covers: TRR 18; TRR 28; TRR 36; TRR 101 -->

บทนี้ออกแบบโมดูล Finance สำหรับระบบใช้งานจริง ครอบคลุมโครงสร้าง ข้อมูล ส่วนเชื่อมต่อ และพฤติกรรม โดยตอบบทการเงินของ SRS และใช้โครงสร้างตามบทจัดซื้อจัดจ้าง

โมดูลครอบคลุมวงเงินผูกพันนอกงานจัดซื้อจัดจ้าง PO ของ GFMIS ใบขอเบิกและการอนุมัติ การจ่ายเงิน บัญชีธนาคารของผู้ขาย เงินยืม ใบเสร็จรับเงิน การนำส่งเงิน เงินคงเหลือประจำวัน เงินนอกงบประมาณ การกระทบยอด การปิดงวด ข้อเสนอการกันเงินไว้เบิกเหลื่อมปี ข้อทักท้วง รวมทั้งการวิเคราะห์และเอเจนต์การเงิน GFMIS ยังเป็นบัญชีแยกประเภททางการ (FIN-CR-001) ส่วน Finance ทำหน้าที่เตรียม ตรวจ อนุมัติ ติดตาม และจับคู่

สิ่งที่อยู่นอกบทนี้ ได้แก่ กลไกแยกหน้าที่ การมอบอำนาจ งาน และ Audit Log ซึ่งเป็นของ `platform` รายการจัดสรรและการตัดสินเรื่องการกันเงินไว้เบิกเหลื่อมปีซึ่งเป็นของ `budget` และสัญญา การตรวจรับ ค่าปรับ และประตูเบิกจ่ายซึ่งเป็นของ `procurement` กฎที่ใช้ร่วมกันอยู่ในบทของตนเอง และบทนี้อ้างถึงเท่านั้น

| กลุ่มใน SRS | ข้อกำหนด | หัวข้อการออกแบบ | แพ็กเกจหลัก |
| --- | --- | --- | --- |
| กฎธุรกิจ | BR-FIN-01 ถึง BR-FIN-31 | แบบจำลองโดเมน | ทั้งหมด |
| ค่าตั้งและนาฬิกาตามระเบียบ | FIN-FR-001 ถึง FIN-FR-007, FIN-FR-141 | แบบจำลองโดเมน พฤติกรรมเชิงพลวัต | `settings`, `clocks` |
| วงเงินผูกพันและ PO | FIN-FR-008 ถึง FIN-FR-016 | แบบจำลองโดเมน การออกแบบข้อมูล | `commitment` |
| ใบขอเบิก | FIN-FR-017 ถึง FIN-FR-040 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `voucher` |
| ไฟล์ GFMIS และการจ่ายเงิน | FIN-FR-041 ถึง FIN-FR-052 | พฤติกรรมเชิงพลวัต การออกแบบส่วนเชื่อมต่อ | `payment`, `gfmis` |
| บัญชีธนาคารของผู้ขาย | FIN-FR-053 ถึง FIN-FR-061 | พฤติกรรมเชิงพลวัต การออกแบบความมั่นคงปลอดภัย | `supplierbank` |
| เงินยืม | FIN-FR-062 ถึง FIN-FR-077 | สถานะและการเปลี่ยนสถานะ แบบจำลองโดเมน | `advance` |
| ใบเสร็จรับเงินและการนำส่งเงิน | FIN-FR-078 ถึง FIN-FR-086 | แบบจำลองโดเมน การออกแบบข้อมูล | `receipt` |
| เงินคงเหลือประจำวัน | FIN-FR-087 ถึง FIN-FR-095 | แบบจำลองโดเมน การออกแบบความมั่นคงปลอดภัย | `cash` |
| เงินนอกงบประมาณ | FIN-FR-096 ถึง FIN-FR-104 | แบบจำลองโดเมน การออกแบบข้อมูล | `nonbudget` |
| การกระทบยอด | FIN-FR-105 ถึง FIN-FR-119 | พฤติกรรมเชิงพลวัต การออกแบบข้อมูล | `reconcile` |
| การปิดงวด | FIN-FR-120 ถึง FIN-FR-126 | สถานะและการเปลี่ยนสถานะ พฤติกรรมเชิงพลวัต | `closing` |
| การกันเงินไว้เบิกเหลื่อมปี | FIN-FR-127 ถึง FIN-FR-129 | องค์ประกอบ พฤติกรรมเชิงพลวัต | `commitment` |
| ข้อทักท้วง | FIN-FR-130 ถึง FIN-FR-132 | แบบจำลองโดเมน การออกแบบข้อมูล | `auditquery` |
| AI และการวิเคราะห์ | FIN-FR-133 ถึง FIN-FR-140 | องค์ประกอบ การออกแบบความมั่นคงปลอดภัย | `assistant`, `reporting` |
| ข้อกำหนดด้านข้อมูล | FIN-DR-001 ถึง FIN-DR-007 | การออกแบบข้อมูล | ทั้งหมด |
| ข้อกำหนดส่วนเชื่อมต่อ | FIN-IR-001 ถึง FIN-IR-011 | การออกแบบส่วนเชื่อมต่อ | `api`, `gfmis` |
| ข้อกำหนดที่ไม่ใช่ฟังก์ชัน | FIN-NFR-001 ถึง FIN-NFR-006 | การออกแบบที่ไม่ใช่ฟังก์ชัน การออกแบบความมั่นคงปลอดภัย | ทั้งหมด |
| ข้อจำกัด | FIN-CR-001 ถึง FIN-CR-005 | ภาพรวมการออกแบบ | ทั้งหมด |
| หลักฐานการทดสอบ | การเดินทดสอบ sweep FC1 ถึง FC7 | การออกแบบการทดสอบ | การทดสอบ |
| ประเด็นค้าง | OI-FIN-01 ถึง OI-FIN-23 | ช่องว่างที่ทราบและประเด็นค้าง | ทั้งหมด |

## ภาพรวมการออกแบบและการตัดสินใจ {#fin-decisions}

Finance เป็นโมดูลหนึ่งของ modular monolith (ADR-0002, FIN-CR-002) คำขอจากเว็บหนึ่งรายการทำงานหนึ่งคำสั่งในหนึ่งธุรกรรม PostgreSQL ธุรกรรมนั้นบันทึก aggregate แถว outbox และการเรียกบัญชีวงเงินของ Budget หรือการเรียก Procurement พร้อมกัน สถานะตามกฎหมายเขียนเป็นโค้ด Java (ADR-0007, FIN-CR-003) ส่วนทางเลือกของหน่วยงานเป็นข้อมูล

| การตัดสินใจ | เหตุผล | ทางเลือกที่ไม่ใช้ | ที่มา |
| --- | --- | --- | --- |
| `finance` ขึ้นกับ `procurement.api` และติดตั้ง SPI `FinanceFacts` | ทิศทางกำหนดไว้แล้ว และประตูเบิกจ่ายต้องได้ข้อเท็จจริงของ PO ทันที | เรียกสองทาง (เกิดวงกลม) และใช้เหตุการณ์อย่างเดียว (ประตูรอไม่ได้) | ADR-0002, PRC-CR-005 |
| SPI ตัวที่สองคือ `BankChangeIntake` โดย Procurement ประกาศและ Finance ติดตั้ง | พอร์ทัลผู้ขายอยู่ใน `procurement` และบัญชีธนาคารต้องไม่เดินทางไปกับเหตุการณ์ เพราะ payload ของเหตุการณ์ไม่มีข้อมูลส่วนบุคคล | เหตุการณ์ที่มีเลขที่บัญชี และพอร์ทัลภายใน Finance | PRC-IR-012, ADR-0008 |
| Fisko ไม่มีบัญชีแยกประเภท Finance เก็บระเบียนเชิงปฏิบัติการ และการอ้างอิง GFMIS ชี้ไปยังรายการทางการ | บัญชีแยกประเภทสองชุดจะคลาดเคลื่อนจากกัน (BR-FIN-01) | ระบบบัญชีคู่เต็มรูปแบบ | D-FN-01, FIN-CR-001 |
| ใบขอเบิกตามสัญญานำยอดรวมและค่าปรับจากสแนปช็อตประตูเบิกจ่ายครั้งเดียว และอ่านได้อย่างเดียวใน Finance | ชุดกฎเดียวตัดสินยอดที่จ่ายได้ และค่าปรับเปลี่ยนได้เฉพาะการงดหรือลดค่าปรับใน Procurement | ให้ Finance แก้ค่าปรับตามที่ต้นแบบทำ | BR-FIN-08, FIN-FR-019 |
| ภาษี ยอดสุทธิ และเส้นทางการจ่ายคำนวณด้วย pure function เก็บเมื่ออนุมัติ และไม่อ่านจากแบบฟอร์ม | ข้อมูลเดียวกันให้ผลเดียวกัน (FIN-NFR-004) และตัวเลขที่อนุมัติคือสิ่งที่ออกจากหน่วยงาน | เชื่อการคำนวณบนหน้าจอ | ADR-0006 |
| การตรวจการใช้จ่ายใช้ `LineLedger` ในธุรกรรมเดียวกัน | การจอง การผูกพัน หรือการจ่ายเงินต้องสำเร็จหรือล้มเหลวพร้อมการเปลี่ยนแปลงทางธุรกิจ | saga ผ่านเหตุการณ์ | ADR-0002, ADR-0005 |
| ตัวเลขตามกฎหมายแต่ละค่าเป็นรายการใน `FinanceRuleSet` ที่มีวันที่มีผล และค่าของหน่วยงานแต่ละค่าเป็นแถวใน `finance_setting` | หน่วยงานตั้งกระบวนการที่ขัดกฎหมายไม่ได้ และระเบียนเก่าใช้กฎเดิม (FIN-FR-002) ต้นแบบแก้ทั้งสองอย่างในแบบฟอร์มเดียว | ให้ทุกตัวเลขเป็นค่าตั้งอิสระ | ADR-0007 |
| ใบขอเบิกเก็บรุ่นของชุดกฎที่ใช้เมื่ออนุมัติ | ผู้อ่านภายหลังเห็นได้ว่าใช้กฎใด | อ่านกฎปัจจุบันทุกครั้งที่แสดงผล | ADR-0007 |
| GFMIS และธนาคารอยู่หลัง port บนเส้นทาง outbox และผลกลับมาเป็นคำสั่ง | ยังไม่ทราบสัญญาการเชื่อมต่อ (DG-XC-20) และตรรกะของใบขอเบิกต้องไม่เปลี่ยนเมื่อทราบแล้ว | อ่านไฟล์ในตรรกะของใบขอเบิกโดยตรง | ADR-0008, FIN-IR-006 |
| `PeriodGuard` ตัวเดียวถูกเรียกจากทุกคำสั่งที่เปลี่ยนระเบียนเงินที่มีวันที่ | BR-FIN-13 จึงมีผลทุกจุด ต้นแบบตรวจเพียงสองจุด | ตรวจแยกในแต่ละหน้า | R-FC-02, FIN-FR-124 |
| การเกินกำหนด V7 และวันครบกำหนดนำส่งเงินคำนวณทุกครั้งที่อ่าน | สำเนาที่จัดเก็บจะคลาดเคลื่อน และเอกสารออกแบบระบุเช่นนี้สำหรับการเกินกำหนด | คอลัมน์สถานะที่งานตามกำหนดเวลาปรับให้ | BR-FIN-18 |
| บัญชีธนาคารอยู่ใน Finance แบบเข้ารหัสและมีช่วงเวลาที่มีผล ใบขอเบิกจึงระบุแถวบัญชีที่จ่าย | ประวัติยังถูกต้อง และการเปลี่ยนบัญชีไม่เขียนทับการจ่ายเงินในอดีต | ฟิลด์ `bank` บนผู้ขายตามที่ต้นแบบมี | BR-FIN-30, ข้อกำหนดด้านข้อมูลของ PRC |
| การพยากรณ์อ่านจาก projection ที่สร้างใหม่ได้ และใช้ตัวสุ่มที่กำหนด seed | การอ่านหนักไม่กระทบตารางคำสั่ง (FIN-NFR-006) | คิวรีตารางจริงทุกครั้งที่เปิดหน้า | ADR-0009 |

> [!LAW] ภาษีหัก ณ ที่จ่ายเป็นตัวอย่างการแบ่งขีดจำกัดตามกฎหมายกับทางเลือกของหน่วยงาน `whtMin` และ `whtPct` เป็นรายการใน `FinanceRuleSet` ที่มีฟิลด์ข้อกฎหมายและวันที่มีผล และหน่วยงานเปลี่ยนไม่ได้ ที่มาของค่าเหล่านี้อยู่ระดับ B และไม่มีข้อ TRR ฟิลด์ข้อกฎหมายจึงเว้นว่างจนกว่าผู้เชี่ยวชาญด้านการเงินจะยืนยัน (OI-FIN-01) เพดานของผู้รับมอบหมายในตารางอำนาจเป็นข้อมูลของหน่วยงาน เพราะมาจากคำสั่งมอบหมายของหน่วยงานเอง (BR-FIN-10)

```java
// Proposal. Pure calculation; the rule set is passed in, never read from a global.
public VoucherAmounts calculate(VoucherInput in, FinanceRuleSet rules) {
    Money base = in.vatIncluded() ? rules.beforeVat(in.gross()) : in.gross();
    Percent rate = rules.withholdingRate(in.payeeKind(), in.type(), in.wholeOrder());
    Money tax = base.percent(rate).round(2, HALF_UP);
    Money spend = in.gross().minus(in.penalty());
    return new VoucherAmounts(base, tax, spend, spend.minus(tax).minus(in.other()));
}
```

## องค์ประกอบ {#fin-components}

Finance เป็นโมดูล Spring Modulith ชื่อ `finance` เฉพาะ `api` และแพ็กเกจย่อย `api.events` เป็น named interface ส่วนแพ็กเกจอื่นเป็นภายในทั้งหมด และการทดสอบขอบเขตทำงานใน CI (ADR-0002)

{{fig:fin-component | องค์ประกอบของโมดูล finance และโมดูลข้างเคียง}}

> [!NOTE] รายการแพ็กเกจ ชื่อ interface และชื่อเมธอดในหัวข้อนี้เป็นข้อเสนอ

### แพ็กเกจภายใน {#fin-packages}

| แพ็กเกจ | หน้าที่ | คลาสหลัก |
| --- | --- | --- |
| `web` | REST controller, request record และการแปลงเป็น Problem Details | `VoucherController`, `AdvanceController`, `CloseController` |
| `commitment` | วงเงินผูกพันนอกงานจัดซื้อจัดจ้าง ทะเบียนรวม PO และรายการที่อาจกันเงินไว้เบิกเหลื่อมปี | `Commitment`, `PurchaseOrder`, `CommitmentRegister`, `CarryOverPolicy` |
| `voucher` | ใบขอเบิก หลักฐาน กฎ การคำนวณ เส้นทางการจ่าย อำนาจ และบันทึก | `Voucher`, `VoucherCalculator`, `RoutePolicy`, `AuthorityTable`, `EvidenceList` |
| `payment` | ไฟล์ GFMIS ชุดการจ่ายเงิน หนังสือรับรอง การตรวจการจ่ายเงินประจำวัน และเงินคืน | `GfmisFile`, `PaymentBatch`, `TaxCertificate`, `DailyPaymentCheck`, `Refund` |
| `supplierbank` | บัญชีธนาคารและคำขอเปลี่ยนบัญชี | `SupplierBankAccount`, `BankChange` |
| `advance` | เงินยืม การตรวจ การส่งใช้ หนังสือทวง และอายุหนี้ | `Advance`, `AdvancePolicy`, `Clearing`, `Demand` |
| `receipt` | ใบเสร็จรับเงิน สมุดใบเสร็จรับเงิน การนำส่งเงิน ประเภทเงิน และกำหนดเวลา | `Receipt`, `ReceiptBook`, `Remittance`, `RemitPolicy` |
| `cash` | คำสั่งกรรมการ เงินคงเหลือประจำวัน และการส่งมอบกุญแจ | `CashOrder`, `DailyCash` |
| `nonbudget` | กองทุน แผนการใช้จ่าย และการถอนเงินฝากคลัง | `Fund`, `SpendingPlan`, `TreasuryWithdrawal` |
| `reconcile` | รายการเดินบัญชี รายการฝั่งบัญชี การจับคู่ รายงาน GFMIS ไฟล์การจ่ายเงิน และการมอบหมาย | `BankStatement`, `BookLines`, `BankReconciliation`, `PaymentFileMatch`, `GfmisAssignment` |
| `closing` | การปิดวันและเดือน รายการสิ้นปี และการป้องกันงวด | `Period`, `DayClose`, `CloseChecks`, `PeriodGuard` |
| `auditquery` | ข้อทักท้วงจากหน่วยงานตรวจเงินแผ่นดิน | `AuditQuery` |
| `clocks` | รายการนาฬิกาตามระเบียบ การแจ้งเตือน และการยกระดับ | `ClockCatalogue`, `ClockSweep` |
| `settings` | ชุดกฎตามกฎหมาย ค่าตั้งของหน่วยงาน และตารางอำนาจ | `FinanceRuleSet`, `FinanceSetting` |
| `reporting` | KPI การพยากรณ์ การจำลองสถานการณ์ สัญญาณเตือน และข้อมูลส่งให้ Budget | `KpiCatalogue`, `ForecastEngine`, `SignalDetector` |
| `assistant` | เอเจนต์ AG-18 ถึง AG-22 และทะเบียนเครื่องมือ | `FinanceToolRegister` |
| `gfmis`, `bankfile` | port และ adapter ไปยังระบบภายนอก | `GfmisGateway`, `BankFileGateway`, `FileMapping` |

### ส่วนเชื่อมต่อที่เปิดเผย {#fin-published}

ส่วนเชื่อมต่อเหล่านี้ตอบคำขอในบท Procurement, Projects และ Review

| Interface | ผู้ใช้ | วัตถุประสงค์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `FinanceFacts` (SPI ที่ประกาศใน `procurement.api`) | `procurement` | `purchaseOrderRecorded(contractId)`, `paymentStarted(contractId, phaseNo)` | FIN-FR-015, FIN-IR-002 |
| `BankChangeIntake` (SPI ที่ประกาศใน `procurement.api`) | `procurement` | `submit(supplierId, sealedRequest)` จากพอร์ทัล | FIN-FR-057, PRC-IR-012 |
| `LinePaymentQuery` | `projects` | วงเงินผูกพันอื่น ยอดจ่าย เวลาของข้อมูล GFMIS ล่าสุด และสถานะการกระทบยอดแยกตามรายการจัดสรร | FIN-IR-011, PRJ-IR-003 |
| `PaidFacts`, `KpiSource`, `ForecastSource`, `SignalSource` | `review` | การจ่ายเงินต่อรายการจัดสรรและสัญญา ค่า KPI-F การพยากรณ์ และสัญญาณเตือน | FIN-IR-011, REV-IR-002 |
| เหตุการณ์ใน `api.events` | ทุกโมดูล และ RabbitMQ ผ่าน outbox | ตารางเหตุการณ์ในหัวข้อส่วนเชื่อมต่อ | ADR-0008 |

บท Procurement ตัดวงเงินผูกพันอื่นออกจาก `FinanceFacts` แล้ว Finance บันทึกรายการเหล่านั้นลง `LineLedger` อยู่แล้ว วงเงินคงเหลือจึงรวมรายการเหล่านั้น (DG-FIN-01)

### การพึ่งพาโมดูลอื่น {#fin-dependencies}

| โมดูล | Interface ที่ต้องการ | ใช้เพื่อ | ข้อกำหนด |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `SodGuard` | ผูกหน่วยงาน ตรวจสิทธิ์ การปฏิบัติแทน และการตรวจกฎแยกหน้าที่ | PLT-FR-039, FIN-NFR-002 |
| `platform` | `AuditLog`, `Notifier`, `WorkItems`, `WorkingCalendar`, `FiscalCalendar` | Audit การแจ้งเตือน งาน และการนับวัน | FIN-NFR-001, BR-PLT-22 |
| `platform` | `DocumentService`, `FileStore`, `FieldCrypto`, `RetentionRegistry`, `AiGateway`, `SearchIndexer` | หนังสือรับรอง ไฟล์ การเข้ารหัส การเก็บรักษา AI และการค้นหา | ADR-0010, ADR-0011, ADR-0013, ADR-0016 |
| `platform` | `SubjectDirectory`, `UnitDirectory` | ชื่อผู้ยืมและกรรมการ | PLT-FR-093 |
| `budget` | `LineLedger` | อ่านรายการและวงเงินคงเหลือ จอง ปล่อยคืน ผูกพัน ปรับวงเงินผูกพัน `recordCommitment`, `recordPayment`, `recordDisbursement` | FIN-IR-004, BGT-IR-001 |
| `budget` | `CarryOverIntake` (ขอให้จัดทำ) | เสนอและถอนการกันเงินไว้เบิกเหลื่อมปี และอ่านสถานะ | FIN-FR-128, FIN-FR-129 |
| `procurement.api` | `AcceptedPhaseQuery`, `PaymentGate`, `PhasePayment` | งวดงานที่รอ ประตูเบิกจ่าย และสถานะการจ่ายเงิน | FIN-IR-001, FIN-IR-003 |
| `procurement.api` | `ContractLookup`, `SupplierDirectory` | สรุปสัญญา ข้อมูลระบุตัวและสถานะของผู้ขาย | FIN-FR-008, PRC-IR-012 |

> [!OPEN] บท SDS ของ Budget ยืนยัน `LineLedger` และยืนยันว่า Finance เป็นผู้นำเข้า GFMIS และบันทึกการเบิกจ่ายผ่านส่วนเชื่อมต่อนี้ `CarryOverIntake` ยังเป็นคำขอ ผู้เขียนบท Budget ต้องระบุการเรียกที่อยู่หลัง `CarryOver.file` ส่วน BGT-IR-005 ใน SRS ของ Budget กำหนดให้ Finance เป็นผู้นำเข้าแล้ว และ Budget อ่านผลลัพธ์ (DG-FIN-02)

## แบบจำลองโดเมน {#fin-domain}

<!-- covers: TRR 36; TRR 59; TRR 65; TRR 100; TRR 101 -->

คลาสโดเมนเป็น Java ธรรมดา ไม่ import Spring หรือ JPA แต่ละคำสั่งโหลด aggregate หนึ่งตัว เรียกเมธอดที่ตรวจกฎ แล้วบันทึก

{{fig:fin-class | aggregate ของ Finance และส่วนประกอบ}}

> [!NOTE] aggregate ชื่อคลาส และรหัสข้อผิดพลาดในหัวข้อนี้เป็นข้อเสนอ

### Aggregate และเงื่อนไขคงที่ {#fin-aggregates}

| Aggregate | ส่วนประกอบ | เงื่อนไขคงที่ที่รักษา |
| --- | --- | --- |
| `Commitment` | PO ประวัติ PO การปล่อยคืน | ยอดจ่ายรวมยอดปล่อยคืนไม่เกินยอดเงิน ยอดเงิน รายการจัดสรร ชนิด และผู้รับเงินล็อกเมื่อใช้งานครั้งแรก และยกเลิกได้เฉพาะเมื่อไม่มีการจอง |
| `Voucher` | หลักฐาน บันทึก สแนปช็อตประตูเบิกจ่าย หนังสือรับรอง เงินคืน | งวดงานหนึ่งของสัญญามีใบขอเบิกที่ยังมีผลได้หนึ่งใบ ตัวเลขที่อนุมัติแล้วไม่เปลี่ยน สถานะไม่อนุมัติและยกเลิกเป็นสถานะสุดท้าย และผู้อนุมัติต้องไม่ใช่ผู้จัดทำหรือผู้ตรวจ |
| `GfmisFile`, `PaymentBatch` | แถวและผล | แถวออกจากไฟล์ได้เฉพาะก่อนมีผล และผลที่บันทึกแล้วไม่เปลี่ยน (BR-FIN-12) |
| `BankChange` | บัญชีที่เข้ารหัส การอ้างอิงหลักฐาน | ตัดสินได้ครั้งเดียว และผู้ตัดสินต้องไม่ใช่ผู้ขอ |
| `SupplierBankAccount` | ไม่มี | ผู้ขายหนึ่งรายมีบัญชีที่มีผลได้หนึ่งบัญชี และเก็บบัญชีเดิมพร้อมเวลาสิ้นสุด |
| `Advance` | รายการ สัญญาการยืมเงิน การส่งใช้ การทักท้วง หนังสือทวง | ผู้ยืมหนึ่งคนมีเงินยืมค้างได้หนึ่งรายการ ยอดอนุมัติอยู่ภายในยอดที่ขอ และวันที่ในหนังสือทวงอยู่ภายในเพดาน |
| `Receipt` | ไม่มี | เลขที่ไม่ซ้ำในสมุด ไม่มีการแก้ไข และยกเลิกได้ทั้งใบเฉพาะก่อนนำส่งเงิน |
| `ReceiptBook` | ช่วงเลขที่ยกเลิก | เลขที่เรียงตามลำดับ และเลขที่ท้ายเล่มที่ยกเลิกแล้วไม่ถูกออก |
| `Remittance` | แถว | มีเงินประเภทเดียว ทุกแถวบันทึกใน GFMIS แล้ว และกลับรายการได้เฉพาะก่อนมีรายงาน GFMIS |
| `CashOrder` | กรรมการ ผู้สำรอง | มีกรรมการอย่างน้อย 2 คน และใช้คำสั่งล่าสุดที่เริ่มมีผลภายในวันนั้น |
| `DailyCash` | ยอดนับ การนับใหม่ เหตุผลที่ล่าช้า | มีหนึ่งรายการต่อวัน ตัวเลขในระบบคงที่เมื่อจัดทำ และการนับใหม่เก็บยอดนับเดิมไว้ |
| `Fund`, `SpendingPlan`, `TreasuryWithdrawal` | รายการ ฉบับ การแก้ไข | หนึ่งกองทุนมีหนึ่งแผนต่อปี การแก้ไขไม่แทนที่แผนที่อนุมัติจนกว่าจะได้รับอนุมัติ และรายการในแผนไม่ต่ำกว่ายอดที่ใช้ไปแล้ว |
| `BankStatement`, `BankReconciliation` | รายการ รายการปรับปรุง | ลงนามได้เฉพาะเมื่อผลต่างเป็นศูนย์ และการเปิดใหม่เก็บลายมือชื่อเดิมไว้ |
| `GfmisAssignment` | ไม่มี | มีอย่างน้อยหนึ่งหน้าที่ และเพิกถอนได้แต่ไม่ลบ |
| `Period`, `DayClose` | ผลการตรวจ บันทึก | หัวหน้าการเงินเป็นผู้ปิด และบุคคลอื่นเป็นผู้เปิดใหม่ |
| `AuditQuery` | คำชี้แจงเพิ่มเติม | วันครบกำหนดตั้งจากวันที่ได้รับ และคำตอบไม่เปลี่ยน |

### Value object และ enumeration {#fin-values}

| ชนิด | ค่า | หมายเหตุ |
| --- | --- | --- |
| `Money` | `BigDecimal` สกุลบาท ทศนิยม 2 ตำแหน่ง | XC-DAT-004, FIN-DR-001, OI-FIN-16 |
| `VoucherType` | `proc`, `service`, `utility`, `travel`, `comp`, `refund` | `proc` สร้างจากงวดงานเท่านั้น |
| `VoucherState` | `DRAFT`, `RETURNED`, `CHECK`, `APPROVE`, `READY`, `NB_READY`, `POSTED`, `PAID`, `REJECTED`, `CANCELLED` | V7 คำนวณจากข้อมูล |
| `PayRoute` | `direct`, `agency`, `nb` | จาก `RoutePolicy` |
| `PayMethod` | `epay`, `cheque`, `cash` | BR-FIN-09 |
| `PayeeKind` | `corp`, `person`, `gov` | BR-FIN-06 |
| `CommitmentKind` | `contract`, `utility`, `rent`, `service`, `travel` | แถว `contract` มาจาก Procurement |
| `AdvanceType` | `travel`, `station`, `other` | BR-FIN-18 |
| `MoneyClass` | `revenue`, `nonbudget`, `over`, `old` | BR-FIN-20 |
| `GfmisDuty` | `record`, `approve`, `remit` | FIN-FR-119 |

### ตำแหน่งที่บังคับใช้กฎธุรกิจแต่ละข้อ {#fin-rule-map}

เซิร์ฟเวอร์บังคับใช้ทุกกฎด้านล่าง หน้าจออาจตรวจซ้ำเพื่อช่วยผู้ใช้เท่านั้น (ADR-0006, FIN-CR-003)

| กฎ | เรื่อง | บังคับใช้ที่ | รหัสข้อผิดพลาด |
| --- | --- | --- | --- |
| BR-FIN-01 | ไม่มีบัญชีแยกประเภท การปฏิเสธไม่เปลี่ยนระเบียนที่อนุมัติแล้ว | `GfmisResultHandler` | ไม่มี |
| BR-FIN-02 | อยู่ภายในยอดที่ยังว่าง | `Commitment.free`, `LineLedger.room` ซึ่ง `Voucher.send`, `approve` เรียกใช้ | `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-03 | จองเมื่อส่ง | `Voucher.send` พร้อมแถวใน `voucher_hold` หรือ `LineLedger.reserve` | `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-04 | ต้องมี PO | `PurchaseOrderPolicy` ซึ่ง `FinanceFacts` และ `RoutePolicy` อ่าน | `FIN_PO_MISSING` |
| BR-FIN-05 | เส้นทางการจ่าย | `RoutePolicy.of` | ไม่มี เป็นการคำนวณ |
| BR-FIN-06, BR-FIN-07 | ภาษีและยอดสุทธิ | `VoucherCalculator` กับ `FinanceRuleSet` | ไม่มี เป็นการคำนวณ |
| BR-FIN-08 | ยอดรวมและค่าปรับจาก Procurement | `Voucher.fromPhase` และสแนปช็อตประตูเบิกจ่าย | `FIN_FIELD_LOCKED` |
| BR-FIN-09 | เหตุผลของเช็คหรือเงินสด | `Voucher.setMethod` | `FIN_REASON_REQUIRED` |
| BR-FIN-10 | อำนาจ | `AuthorityTable.require` ใน `Voucher.approve`, `Advance.approve` | `FIN_AUTHORITY_EXCEEDED` |
| BR-FIN-11 | กฎแบ่งแยกหน้าที่ | `SodGuard` ในแต่ละคำสั่ง ดูหัวข้อความมั่นคงปลอดภัย | `FIN_SOD_BLOCKED` |
| BR-FIN-12 | สิ่งที่ออกไปแล้วไม่เปลี่ยนแปลง | `GfmisFile`, `PaymentBatch`, `TaxCertificate` | `FIN_STATE_CONFLICT` |
| BR-FIN-13 | งวดที่ปิดแล้ว | `PeriodGuard.requireOpen(date)` | `FIN_PERIOD_CLOSED` |
| BR-FIN-14 | ตรวจใหม่หลังเปลี่ยนแปลง | `Voucher.recall` และนาฬิกาอ่านเหตุการณ์ต้นทาง | ไม่มี |
| BR-FIN-15 | เลขที่ไม่นำกลับมาใช้ซ้ำ | `NumberSeries.next` ซึ่งเป็นตัวนับที่ใช้ row lock | ไม่มี |
| BR-FIN-16 | เงินคืนอ้างกลับไปยังใบขอเบิก | `Refund.record` ซึ่งสร้าง `Receipt` | `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-17 | การตรวจเงินยืม | `AdvancePolicy.check` ใน `Advance.approve` | `FIN_ADVANCE_CHECK_FAILED` |
| BR-FIN-18, BR-FIN-19 | วันครบกำหนดส่งใช้และวันที่ในหนังสือทวง | `AdvanceDue`, `Demand.issue`, `Demand.moveTo` | `FIN_INVALID_INPUT` |
| BR-FIN-20, BR-FIN-21 | ประเภทเงินและกำหนดเวลา | `RemitPolicy` กับ `WorkingCalendar` | ไม่มี เป็นการคำนวณ |
| BR-FIN-22 | กรรมการเก็บรักษาเงิน | `CashOrder.appoint`, `DailyCash.count` | `FIN_SOD_BLOCKED` |
| BR-FIN-23 | ลงนามแล้วหรือมีผลต่าง | `DailyCash.count` | ไม่มี เป็นการแจ้งเตือน |
| BR-FIN-24, BR-FIN-25 | แผนเงินนอกงบประมาณและการถอนเงิน | `SpendingPlan.require`, `TreasuryWithdrawal.request` | `FIN_PLAN_REQUIRED`, `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-26, BR-FIN-27 | การตรวจการปิดงวด | `CloseChecks`, `DayClose.close`, `Period.close` | `FIN_REASON_REQUIRED` |
| BR-FIN-28 | ผลต่างเป็นศูนย์ | `BankReconciliation.sign` | `FIN_STATE_CONFLICT` |
| BR-FIN-29 | รายการที่อาจกันเงินไว้เบิกเหลื่อมปี | `CarryOverPolicy.candidates` | ไม่มี เป็นรายการ |
| BR-FIN-30 | ใช้เฉพาะบัญชีที่ยืนยันแล้ว | `Voucher.approve` อ่านบัญชีที่มีผล และ `SignalDetector` เตือน | `FIN_NO_ACCOUNT` |
| BR-FIN-31 | ขีดจำกัดของ AI | `FinanceToolRegister` ซึ่งไม่มีเครื่องมืออนุมัติ จ่ายเงิน ปิดงวด หรือเปลี่ยนยอดเงิน | `FIN_AI_NOT_ALLOWED` |

### ขีดจำกัดในโค้ดและค่าตั้งของหน่วยงาน {#fin-limits}

`FinanceRuleSet` มีรุ่นตามวันที่มีผล กลุ่มแรกด้านล่างย้ายออกจากแบบฟอร์มค่าตั้งของหน่วยงานในต้นแบบ (FIN-FR-002) ค่ามาจาก SRS

| รายการ | ตำแหน่งที่เก็บ | ค่า | กฎ |
| --- | --- | --- | --- |
| `poMin`, `carryMin`, `remitCash` | `FinanceRuleSet` | 5,000, 100,000 และ 10,000 บาท | BR-FIN-04, BR-FIN-29, BR-FIN-21 |
| `whtMin`, `whtPct`, VAT | `FinanceRuleSet` ระดับ B หรือยังเปิดอยู่ | 10,000 บาท ร้อยละ 1 และร้อยละ 7 | BR-FIN-06, BR-FIN-07, OI-FIN-05 |
| `reqDays`, `monthlyDay`, `advTravel`, `advOther`, `advFix`, `demandDays`, `remitDays`, `refundDays`, `aqDays` | `FinanceRuleSet` | ตามตารางนาฬิกาตามระเบียบ | BR-FIN-18 ถึง BR-FIN-21 |
| เพดานเงินยืม 90, 90 และ 30 วัน | `FinanceRuleSet` | ตาม BR-FIN-17 | BR-FIN-17 |
| `carryBy` | รายการรายปีจากประกาศของกรมบัญชีกลาง | วันที่ต่อปี | BR-FIN-29 |
| แถวอำนาจ | `finance_setting` ภายในตำแหน่งที่ชุดกฎอนุญาต | ค่าของหน่วยงาน จากคำสั่งมอบหมายของหน่วยงาน | BR-FIN-10 |
| `aheadDays` และอัตราค่าเดินทาง | `finance_setting` | 10 วัน เบี้ยเลี้ยง 240 ค่าที่พัก 1,500 และ 4 บาทต่อกิโลเมตร เป็นค่าตัวอย่าง | FIN-FR-026, FIN-FR-065 |

## สถานะและการเปลี่ยนสถานะ {#fin-states}

ชื่อสถานะเป็นไปตาม SRS การเปลี่ยนสถานะแต่ละรายการเป็นเมธอดของ aggregate เมธอดตรวจตารางการเปลี่ยนสถานะ ตรวจเงื่อนไข และเพิ่มแถวบันทึกหนึ่งแถว

### ใบขอเบิก {#fin-state-voucher}

{{fig:fin-state-voucher | สถานะของใบขอเบิก}}

| จาก | ไป | คำสั่ง | เงื่อนไข | ผล |
| --- | --- | --- | --- | --- |
| (ไม่มี) | DRAFT | `Voucher.fromPhase`, `create` | ผ่านประตูเบิกจ่ายหรือปลดแล้วสำหรับงวดงาน และผ่านกฎของแบบฟอร์ม | ออกเลขที่ และเรียก `PhasePayment.started` สำหรับงวดงาน |
| DRAFT, RETURNED | CHECK | `send` | ผ่านกฎ และอยู่ภายในยอดที่ยังว่าง | สร้างการจอง และเกิด `voucher.sent` |
| CHECK, APPROVE | DRAFT | `recall` | ผู้จัดทำ และมีเหตุผล | ล้างผู้ตรวจและผู้อนุมัติ และปล่อยการจอง |
| CHECK | APPROVE | `pass` | P-F05 หลักฐานครบถ้วน และผ่านกฎ | เก็บผู้ตรวจ |
| CHECK, APPROVE | RETURNED | `returnTo` | มีเหตุผล | การส่งคืนครั้งที่สามแจ้งหัวหน้าการเงิน และปล่อยการจอง |
| APPROVE | READY, NB_READY | `approve` | SD-11, SD-04, `AuthorityTable` กฎ บัญชีที่มีผล และ `PeriodGuard` | ตรึงตัวเลข เรียก `recordPayment` บนบัญชีวงเงิน และเรียก `PhasePayment.approved` |
| APPROVE | REJECTED | `reject` | มีเหตุผล | เป็นสถานะสุดท้าย ปล่อยการจอง และ `PhasePayment.rejected` ปล่อยงวดงาน |
| DRAFT, RETURNED | CANCELLED | `cancel` | ผู้จัดทำ และมีเหตุผล | เป็นสถานะสุดท้าย และเรียก `PhasePayment.rejected` สำหรับงวดงาน |
| CHECK, APPROVE, READY, NB_READY | CANCELLED | `headCancel` | หัวหน้าการเงิน ยังไม่อยู่ในไฟล์ และมีเหตุผล | ย้อนรายการจ่ายเงินบนบัญชีวงเงินและใน Procurement และล้างการเชื่อมโยงเงินยืม |
| READY | POSTED | `markPosted` | ผลจาก GFMIS | เก็บเอกสาร GFMIS |
| POSTED | READY | `paymentFailed` | ผลจาก GFMIS | ออกจากไฟล์ และเปิดงานให้เจ้าหน้าที่ |
| POSTED, NB_READY | PAID | `markPaid` | ผลการจ่ายเงิน ผลของชุด หรือบันทึกเช็คหรือเงินสด | ออกหนังสือรับรอง และปรับยอดจ่ายของวงเงินผูกพัน |

> [!NOTE] `PhasePayment.rejected` บนใบขอเบิกที่ไม่อนุมัติแก้ปัญหางวดงานค้างของต้นแบบ (OI-FIN-10) สแนปช็อตประตูเบิกจ่ายมีข้อมูลการปลด `EvidenceList` จึงถือว่าการตรวจที่ปลดแล้วผ่าน (OI-FIN-09, FIN-FR-021)

### เงินยืม {#fin-state-advance}

{{fig:fin-state-advance | สถานะของเงินยืม}}

| จาก | ไป | คำสั่ง | เงื่อนไข |
| --- | --- | --- | --- |
| (ไม่มี) | request | `Advance.request` | มีรายการ วัตถุประสงค์ และวันที่ และสัญญาการยืมเงินมีเลขที่ |
| request | approved | `approve` | SD-12, `AdvancePolicy`, `AuthorityTable` และยอดที่ต่ำกว่าต้องมีเหตุผล |
| request | rejected | `reject` | มีเหตุผล |
| request, approved | cancelled | `cancel` | มีเหตุผล และยังไม่จ่าย |
| approved | paid | `pay` | SD-12 และนาฬิกาเริ่มนับ |
| paid, objected | clearing | `sendClearing` | มียอดที่ใช้จ่าย และวันกลับไม่ก่อนวันเริ่มต้นในกรณีเดินทาง |
| clearing | paid, objected | `takeBack` | ผู้ยืม และมีเหตุผล |
| clearing | objected | `object` | SD-12 มีเหตุผล และตั้งวันครบกำหนดแก้ไข |
| clearing | cleared | `accept` | SD-12 ออกใบรับหลักฐานแล้ว บันทึกใบขอเบิกจ่ายเพิ่มหรือเงินสดที่คืนแล้ว และปิดหนังสือทวงแล้ว |

### การเปลี่ยนบัญชีธนาคาร {#fin-state-bank}

{{fig:fin-state-bank | สถานะของการเปลี่ยนบัญชีธนาคารของผู้ขาย}}

`BankChange.confirm` และ `refuse` ตรวจ SD-14 ทั้งคู่ การยืนยันสิ้นสุดบัญชีที่มีผลและเริ่มบัญชีใหม่ในธุรกรรมเดียว

### งวดบัญชี {#fin-state-period}

{{fig:fin-state-period | สถานะของงวดบัญชี}}

สถานะ P2 กำลังปิดของเอกสารออกแบบคือช่วงเวลาที่การตรวจยังไม่ผ่าน จึงไม่เก็บเป็นสถานะ การปิดแต่ละครั้งเก็บผลการตรวจและเหตุผล (ถ้ามี) `Period.reopen` ตรวจ SD-16 สำหรับหัวหน้าการเงินหรือผู้มีอำนาจอนุมัติ

### ระเบียนอื่น {#fin-state-others}

| ระเบียน | สถานะ | บังคับใช้ที่ | หมายเหตุ |
| --- | --- | --- | --- |
| `DailyCash` | counting, signed, diff | `DailyCash` | การนับใหม่กลับไปที่ counting |
| `GfmisFile` | sent, posted, done, cancelled | `GfmisFile` | ยกเลิกได้เฉพาะก่อนมีผล |
| `PaymentBatch` | sent, done | `PaymentBatch` | รายการที่ธนาคารตีกลับทำให้ใบขอเบิกยังไม่จ่าย |
| `SpendingPlan` | draft, submitted, approved, returned | `SpendingPlan` | การแก้ไขเป็นระเบียนลูกที่มีสถานะชุดเดียวกัน |
| `TreasuryWithdrawal` | pending, done, rejected, back | `TreasuryWithdrawal` | ตรวจ SD-11 ที่ผู้ตัดสิน |
| `BankReconciliation` | signed, reopened | `BankReconciliation` | รายการที่ยังไม่ลงนามไม่มีแถว |
| `Remittance`, `AuditQuery` | คำนวณจากข้อมูล ตาม SRS | read model | - |

## พฤติกรรมเชิงพลวัต {#fin-dynamic}

<!-- covers: PPR 162; PPR 175; TRR 12; TRR 20; TRR 28; TRR 43; TRR 81; TRR 92; TRR 108 -->

### จากใบขอเบิกถึงการกระทบยอด {#fin-activity}

{{fig:fin-activity-voucher | จากใบขอเบิกถึงการกระทบยอด}}

### จากการตรวจรับถึงคำขอเบิกจ่าย {#fin-seq-accept}

ลำดับนี้ต่อจากลำดับของ Procurement Procurement รับผิดชอบทุกอย่างจนถึงประตูเบิกจ่าย ส่วน Finance รับผิดชอบใบขอเบิกและทุกสถานะหลังจากนั้น

{{fig:fin-seq-accept-pay | จากงวดงานที่ตรวจรับแล้วถึงใบขอเบิกและการอนุมัติ}}

- `AcceptedPhaseQuery` แสดงงวดงานที่ตรวจรับแล้วและยังไม่มีการจ่ายเงินที่ยังมีผล `FinanceFacts.paymentStarted` ตอบจาก `voucher` ใบขอเบิกที่ไม่อนุมัติหรือยกเลิกจึงปล่อยงวดงาน
- `PaymentGate.evaluate` ถาม `FinanceFacts.purchaseOrderRecorded` และ Finance ตอบจาก `commitment` การไม่มี PO ให้ผล `PRC_GATE_PO_MISSING` ซึ่งปลดไม่ได้ (FIN-FR-015)
- งวดงานที่ถูกพักยังอยู่ใน Procurement หัวหน้าเจ้าหน้าที่พัสดุหรือผู้อนุมัติปลดที่นั่น แล้ว Finance จึงดำเนินการอีกครั้ง (FIN-FR-020)
- `Voucher.fromPhase` เก็บสแนปช็อตประตูเบิกจ่าย ได้แก่ ยอดตรวจรับ ค่าปรับสุทธิ การตรวจ และการปลด ยอดรวมและค่าปรับถูกล็อก (BR-FIN-08)
- ค่าปรับไหลทางเดียว การงดหรือลดค่าปรับเปลี่ยนค่าปรับใน Procurement ได้จนถึง `PhasePayment.started` ซึ่งหลังจากนั้นจะปฏิเสธการงดหรือลด (PRC-FR-126) หากใบขอเบิกไม่อนุมัติหรือถูกยกเลิก งวดงานจะว่าง และใบขอเบิกถัดไปอ่านค่าปรับปัจจุบัน
- ภาษีคำนวณจากยอดทั้งใบสั่งโดยใช้ `ContractLookup` ภาษีและค่าปรับอยู่บนใบขอเบิกในฐานะรายได้แผ่นดินที่ต้องจับคู่ (BR-FIN-08)
- การอนุมัติทำในธุรกรรมเดียว ได้แก่ กฎแบ่งแยกหน้าที่ อำนาจ `recordPayment` บนบัญชีวงเงิน `PhasePayment.approved` และใบขอเบิกเป็น READY ถ้าการเรียกใดล้มเหลวจะไม่มีการบันทึกใด ๆ

> [!OPEN] ต้นแบบทำเครื่องหมายงวดงานเป็น Paid เมื่ออนุมัติ ก่อนเงินจะเคลื่อนไหว การออกแบบนี้คงไว้เช่นนั้นเพื่อให้ `PhasePayment` เป็นไปตามที่เขียนไว้ เหตุการณ์ `voucher.paid` แสดงการจ่ายเงินจริง เจ้าของผลิตภัณฑ์และเจ้าของ Procurement ต้องตัดสินว่าควรย้าย `PhasePayment.approved` ไปไว้ที่การจ่ายเงินหรือไม่ (DG-FIN-03)

### ไฟล์ GFMIS และผล {#fin-seq-gfmis-s}

{{fig:fin-seq-gfmis | ไฟล์คำขอ GFMIS และผล}}

- `gfOk` กลายเป็น `GfmisAssignment.require(duty)` ซึ่งเรียกในทุกคำสั่งที่บันทึกใน GFMIS ได้แก่ ไฟล์ ใบเสร็จรับเงิน ผล และการนำส่งเงิน (FIN-FR-119)
- ไฟล์เป็นการส่งตามความหมายในบทการเชื่อมต่อ โดยมี `delivery_id` เป็นคีย์ idempotency การหมดเวลาไม่ทำให้ส่งซ้ำโดยไม่ตรวจสอบ (FIN-IR-007)
- การปฏิเสธไม่เปลี่ยนระเบียนที่อนุมัติแล้วด้วยตัวเอง (BR-FIN-01) ใบขอเบิกกลับเป็นสถานะ ready และเปิดงานให้เจ้าหน้าที่
- ผลเป็นคำสั่ง จึงเขียนรายการ Audit และผ่าน `PeriodGuard`
- จนกว่าจะมี port เจ้าหน้าที่อัปโหลดไฟล์ผลผ่าน `FileMapping` และสถานะยังคงเดิม (DG-XC-20)

### การเปลี่ยนบัญชีธนาคารของผู้ขาย {#fin-seq-bank}

{{fig:fin-seq-bank-change | การเปลี่ยนบัญชีธนาคารของผู้ขายที่บุคคลที่สองยืนยัน}}

- เจ้าหน้าที่การเงินขอพร้อมหลักฐาน หรือพอร์ทัลเรียก `BankChangeIntake` ทั้งสองทางสร้าง `BankChange` หนึ่งรายการที่เก็บบัญชีด้วย `FieldCrypto`
- คำขอจากพอร์ทัลมีผู้ขอจากภายนอก ผู้ยืนยันจึงบันทึกช่องทางติดต่อที่ใช้ตรวจสอบ วิธีตรวจสอบอยู่ที่ OI-FIN-13
- SD-14 ปฏิเสธผู้ขอทั้งการยืนยันและการปฏิเสธ และบันทึกความพยายามในธุรกรรมของตนเอง
- การยืนยันเก็บบัญชีเดิมพร้อมเวลาสิ้นสุด และเกิดเหตุการณ์ `supplier-bank.changed` จากนั้นจึงส่งไปยัง vendor master ของกรมบัญชีกลาง (FIN-FR-061)
- `SignalDetector` ยกสัญญาณ SG-F03 เมื่อจ่ายครั้งแรกภายใน 30 วัน FIN-FR-060 เพิ่มการปฏิเสธใน `Voucher.approve` สำหรับผู้ขอการเปลี่ยนแปลงนั้น

### การปิดงวด {#fin-seq-close}

{{fig:fin-activity-close | การปิดวันและเดือน}}

`CloseChecks` ทำการตรวจตาม BR-FIN-26 และ BR-FIN-27 และเก็บผลแต่ละข้อไว้กับการปิด หลักฐานจึงคงอยู่แม้มีการเปลี่ยนแปลงภายหลัง จุดหยุดเด็ดขาดรอ OI-FIN-07

### การกันเงินไว้เบิกเหลื่อมปี {#fin-seq-carry}

`CarryOverPolicy` แสดงรายการที่อาจกันเงินไว้เบิกเหลื่อมปีจากทะเบียน เจ้าหน้าที่การเงินเสนอผ่าน `CarryOverIntake` Budget ทำการตรวจของตน (BR-BGT-32) และผู้บริหารตัดสินที่นั่น Finance แสดงสถานะและถอนคำขอที่รอดำเนินการได้พร้อมเหตุผล การกันเงินที่อนุมัติแล้วยังจ่ายได้ต่อจากรายการจัดสรรเหลื่อมปีที่ Budget สร้าง (BGT-FR-130)

### งานตามกำหนดเวลา {#fin-jobs}

งานทำงานต่อ cell และทำทีละหน่วยงาน โดยผูกหน่วยงานเช่นเดียวกับคำขอจากเว็บ แต่ละงานรันซ้ำได้อย่างปลอดภัย

| งาน | ทำอะไร | ข้อกำหนด |
| --- | --- | --- |
| การตรวจนาฬิกา | เปิด `WorkItems` และการแจ้งเตือนของนาฬิกาแต่ละรายการ และยกระดับ | FIN-FR-005, FIN-FR-006 |
| สัญญาณเตือน | ทำงานกับสัญญาณ SG-F01 ถึง SG-F07 | FIN-FR-139 |
| การเปรียบเทียบการส่ง | เปรียบเทียบรายการที่ส่งกับรายงาน GFMIS เมื่อมีแหล่งข้อมูล | FIN-IR-007 |
| Projection | สร้าง read model ของ KPI และการพยากรณ์ใหม่ | FIN-FR-136, FIN-FR-138 |
| การเก็บรักษา | ใช้ตารางการเก็บรักษากับระเบียนที่สิ้นสุดแล้ว | FIN-DR-007 |

## การออกแบบข้อมูล {#fin-data}

<!-- covers: PDPA 39 -->

ตารางอยู่ใน schema `finance` ของคลัสเตอร์ PostgreSQL ใน cell (ADR-0005) โมดูลอื่นไม่อ่านตารางเหล่านี้ กฎของทุกตารางเป็นไปตามบท Procurement ได้แก่ `tenant_id` อยู่แรกในทุกคีย์ บังคับ row-level security มีคอลัมน์ร่วม แยกเลขทางธุรกิจ และใช้ migration แบบ expand and contract

> [!NOTE] ตาราง คอลัมน์ ชนิดข้อมูล และดัชนีทั้งหมดในหัวข้อนี้เป็นข้อเสนอ บทพจนานุกรมข้อมูลจะเก็บคอลัมน์ฉบับสุดท้าย

{{fig:fin-er | ตารางหลักด้านการใช้จ่ายของ finance}}

{{fig:fin-er-money | ตารางหลักด้านใบเสร็จรับเงิน การกระทบยอด และการปิดงวด}}

### ตาราง {#fin-data-tables}

ชั้นข้อมูลคือชั้นตาม ADR-0013 ของทั้งแถว คีย์การเก็บรักษาระบุแถวหนึ่งในตารางของ `platform` ไม่ระบุระยะเวลาเพราะ OI-FIN-12 ยังเปิดอยู่

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | คีย์การเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `commitment`, `commitment_release` | `kind`, `line_id`, `name`, `payee`, `amount`, `released`, `paid`, `due_on`, `ledger_ref`; `amount`, `why` | Internal | `fin.commitment` | FIN-FR-008 ถึง FIN-FR-012 |
| `purchase_order`, `purchase_order_history` | `source_type`, `source_id`, `no`, `recorded_at`; `until`, `why` | Internal | `fin.commitment` | FIN-FR-013, FIN-FR-014 |
| `voucher` | `no`, `type`, `state`, `commitment_id`, `contract_id`, `phase_no`, `plan_line_id`, `line_id`, `payee_name`, `payee_kind`, `payee_tax_enc`, `supplier_id`, `bank_account_id`, `gross`, `vat`, `penalty`, `other`, `wht`, `net`, `route`, `method`, `method_why`, `due_on`, `rule_set_version`, `gate_snapshot` (jsonb) | Confidential เลขประจำตัวผู้เสียภาษีเป็น Restricted | `fin.voucher` | FIN-FR-017 ถึง FIN-FR-040 |
| `voucher_evidence`, `voucher_log`, `voucher_hold` | `item`, `ok`, `file_key`; `action`, `actor_ref`, `role`, `note`; `amount`, `ledger_ref` | Confidential | `fin.voucher` | FIN-FR-024, FIN-DR-002, BR-FIN-03 |
| `authority_row`, `voucher_approval` | `level`, `position`, `role`, `max_amount`; `decided_by_ref`, `holder_ref`, `via`, `level` | Internal | `fin.voucher` | FIN-FR-003, FIN-FR-036 |
| `gfmis_file`, `gfmis_file_row` | `no`, `state`, `sent_at`; `posting_result`, `doc_no`, `payment_result`, `why`, `simulated` | Confidential | `fin.gfmis` | FIN-FR-041 ถึง FIN-FR-044 |
| `payment_batch`, `payment_batch_row` | `no`, `state`, `total`; `result`, `why` | Confidential | `fin.gfmis` | FIN-FR-045 |
| `tax_certificate`, `refund` | `voucher_id`, `no`, `base`, `tax`, `sent_at`, `replaces_id`, `cancel_why`; `receipt_id`, `amount`, `in_year` | Confidential | `fin.voucher` | FIN-FR-048 ถึง FIN-FR-051 |
| `daily_payment_check`, `daily_payment_row` | `checked_by_ref`, `at`; `voucher_id`, `ok`, `note` | Internal | `fin.voucher` | FIN-FR-050 |
| `supplier_bank_account`, `bank_change` | `supplier_id`, `bank`, `acct_enc`, `acct_bidx`, `from_at`, `until_at`; `status`, `acct_enc`, `evidence_key`, `source`, `requested_by_ref`, `decided_by_ref`, `verified_contact`, `why` | Restricted | `fin.bank` | FIN-FR-053 ถึง FIN-FR-061 |
| `advance`, `advance_item`, `advance_clearing`, `advance_demand` | `no`, `contract_no`, `borrower_ref`, `unit_id`, `type`, `state`, `start_on`, `end_on`, `returned_on`, `amount`, `approved_amt`, `source`, `line_id`, `plan_line_id`, `collateral_enc`; `kind`, `amount`; `spent`, `sent_at`, `receipt_no`, `cash_back`; `due_on`, `moves` | Confidential | `fin.advance` | FIN-FR-062 ถึง FIN-FR-077 |
| `receipt_book`, `receipt_book_void`, `receipt_book_report` | `no`, `fiscal_year`, `from_no`, `to_no`, `holder_ref`, `returned_on`; `from_no`, `to_no`, `why` | Internal | `fin.receipt` | FIN-FR-082, FIN-FR-083 |
| `receipt` | `book_id`, `n`, `on_date`, `kind`, `payer`, `amount`, `method`, `fund_id`, `gfmis_doc`, `remittance_id`, `cancelled_why`, `replaces_id`, `voucher_id`, `advance_id` | Confidential | `fin.receipt` | FIN-FR-078 ถึง FIN-FR-081 |
| `remittance` | `no`, `cls`, `amount`, `bank_ref`, `late_count`, `gfmis_doc`, `reversed_why` | Internal | `fin.receipt` | FIN-FR-085, FIN-FR-086 |
| `cash_order`, `cash_order_member` | `order_no`, `from_on`, `cancelled_why`; `subject_ref`, `role` | Confidential | `fin.cash` | FIN-FR-087 |
| `daily_cash`, `cash_count`, `key_handover` | `on_date`, `sys_cash`, `sys_cheque`, `sys_by_class`, `status`, `ack_by_ref`, `late_why`; `member_ref`, `round_no`, `cash`, `cheque`; `from_ref`, `to_ref`, `at` | Confidential | `fin.cash` | FIN-FR-088 ถึง FIN-FR-095 |
| `fund`, `spending_plan`, `spending_plan_line`, `treasury_withdrawal` | `no`, `name`, `basis`, `open_agency`, `open_treasury`, `closed_why`; `fund_id`, `fiscal_year`, `status`, `version_no`, `parent_id`; `name`, `cat`, `amount`; `amount`, `status`, `doc_no`, `back_amount` | Internal | `fin.nonbudget` | FIN-FR-096 ถึง FIN-FR-104 |
| `bank_statement`, `bank_line`, `book_adjustment`, `bank_reconciliation` | `acct`, `month`, `opening`, `file_key`, `removed_why`; `ref`, `amount`; `ref`, `reversed_why`; `status`, `diff`, `signed_by_ref`, `log` | Confidential | `fin.recon` | FIN-FR-105 ถึง FIN-FR-110 |
| `gfmis_report`, `trial_balance`, `payment_file`, `payment_file_row` | `kind`, `month`, `file_key`, `replaced_why`; `rows`, `agrees`; `imported_by_ref`, `undone_why`; `voucher_id`, `doc_no`, `amount`, `state`, `note`, `matched_by_ref` | Confidential | `fin.recon` | FIN-FR-111 ถึง FIN-FR-117 |
| `gfmis_assignment` | `subject_ref`, `duties`, `order_no`, `until_on`, `revoked_why` | Internal | `fin.config` | FIN-FR-118 |
| `period`, `day_close`, `close_check` | `month`, `status`, `closed_by_ref`, `why`; `on_date`, `why`; `check_no`, `ok`, `detail` | Internal | `fin.close` | FIN-FR-120 ถึง FIN-FR-124 |
| `audit_query`, `audit_query_note` | `no`, `source`, `subject`, `received_on`, `due_on`, `draft`, `answer`, `answered_by_ref`; `text` | Confidential | `fin.audit` | FIN-FR-130 ถึง FIN-FR-132 |
| `finance_setting`, `number_series`, `number_log` | `key`, `value`, `effective_from`; ตามบท Procurement | Internal | `fin.config` | FIN-FR-001, BR-FIN-15 |
| `agent_run`, `what_if`, `signal_state` | `agent`, `steps`, `status`; `levers`, `result`; `signal_key`, `status`, `note` | Confidential | `fin.ai` | FIN-FR-133 ถึง FIN-FR-139 |
| `outbox_event`, `inbox_event`, `delivery` | ตามบทการเชื่อมต่อ | Internal | ระยะสั้น กำหนดร่วมกับ platform | ADR-0008 |

### ฟิลด์ข้อมูลส่วนบุคคลและข้อมูล Restricted {#fin-data-fields}

ตารางนี้เป็นข้อมูลนำเข้าของพจนานุกรมข้อมูลและบันทึกกิจกรรมการประมวลผล (ADR-0014, PDPA 39, FIN-DR-005) ฐานทางกฎหมายของแต่ละฟิลด์ต้องให้เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลยืนยัน

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `supplier_bank_account.acct_enc`, `bank_change.acct_enc` | Restricted | เข้ารหัสฟิลด์ AES-256-GCM ผ่าน Tink คีย์แยกต่อหน่วยงาน และบันทึกการเปิดดู | ปิดบังในทุกหน้าจอและการส่งออก (XC-SEC-026) |
| `supplier_bank_account.acct_bidx` | Restricted | blind index แบบมีคีย์และมีคีย์ของตนเอง | ใช้จับคู่ตรงตัวเท่านั้น เพื่อหาบัญชีเดียวกันบนผู้ขายสองราย |
| `voucher.payee_tax_enc` | Restricted | เช่นเดียวกับข้างต้น | เลขประจำตัวผู้เสียภาษีของบุคคลถูกปิดบังนอกบทบาทด้านการเงิน |
| `advance.collateral_enc` | Confidential | เก็บแบบเข้ารหัส และเข้าถึงตามบทบาท | อาจระบุชื่อผู้ค้ำประกัน |
| คอลัมน์ `*_ref` | Confidential | รหัสแฝง | รายงานแสดงตัวแทนเมื่อลบแล้ว (ADR-0015) |
| ไฟล์หลักฐาน | อาจเป็น Restricted | สแกน ClamAV คีย์แยกต่อหน่วยงาน และไม่ทำดัชนี | อาจมีเลขบัตรหรือบัญชีธนาคาร |

### ไฟล์ การค้นหา และการเก็บรักษา {#fin-data-files}

- หลักฐาน รายการเดินบัญชี ไฟล์ GFMIS และรายงานที่ลงนามแล้วเป็น object ใน S3 API เชื่อมด้วย `file_key` (FIN-DR-004, ADR-0010) ไฟล์ GFMIS ที่ส่งแล้วเก็บไว้เป็นหลักฐานของสิ่งที่ออกจากระบบ
- OpenSearch ทำดัชนีใบขอเบิก เงินยืม และใบเสร็จรับเงินตามเลขที่และชื่อผู้รับเงิน ข้อมูล Restricted ไม่เข้าดัชนี (ADR-0009)
- ระเบียนการเงินที่กฎหมายกำหนดให้เก็บลบก่อนกำหนดไม่ได้ และ `finance` ติดตั้ง `RetentionHold` เพื่อให้คำขอลบข้อมูลเห็นเหตุผล (ADR-0014)

## การออกแบบส่วนเชื่อมต่อ {#fin-interfaces}

REST API อธิบายด้วย OpenAPI 3.1 และเหตุการณ์อธิบายด้วย AsyncAPI ตามกฎเดียวกับบท Procurement หน่วยงานมาจาก token และการเปลี่ยนสถานะส่ง `If-Match`

### REST endpoint {#fin-rest}

> [!NOTE] รายการ endpoint นี้เป็นข้อเสนอ path อ้างอิงจาก `/api/v1/finance`

| Method และ path | วัตถุประสงค์ | สิทธิ์ | ข้อกำหนด |
| --- | --- | --- | --- |
| `GET /clocks`; `GET /overview` | นาฬิกาตามระเบียบและตัวเลขของ F1 | `fin.read` | FIN-FR-004, FIN-FR-007 |
| `GET, POST /commitments`; `GET, PUT, DELETE /commitments/{id}`; `POST /commitments/{id}/release, cancel` | วงเงินผูกพัน | `fin.commit` | FIN-FR-008 ถึง FIN-FR-012 |
| `PUT, DELETE /commitments/{id}/purchase-order`; `PUT, DELETE /contracts/{id}/purchase-order` | บันทึก แก้ไข และล้าง PO | `fin.commit` | FIN-FR-013, FIN-FR-014 |
| `GET /carry-over/candidates`; `POST /carry-over`; `POST /carry-over/{id}/withdraw` | การกันเงินไว้เบิกเหลื่อมปี | `fin.commit` | FIN-FR-127 ถึง FIN-FR-129 |
| `GET /phases/waiting`; `POST /vouchers/from-phase` | จากงวดงานที่ตรวจรับแล้วถึงใบขอเบิก | `fin.voucher.write` | FIN-FR-017 ถึง FIN-FR-021 |
| `GET, POST /vouchers`; `GET, PUT /vouchers/{id}` | ระเบียนและรายการใบขอเบิก | `fin.voucher.write` | FIN-FR-022 ถึง FIN-FR-029, FIN-FR-040 |
| `POST /vouchers/{id}/send, recall, cancel` | การดำเนินการของผู้จัดทำ | `fin.voucher.write` | FIN-FR-030, FIN-FR-031, FIN-FR-035 |
| `PUT /vouchers/{id}/evidence`; `POST /vouchers/{id}/pass, return` | การดำเนินการของผู้ตรวจ | `fin.voucher.check` | FIN-FR-024, FIN-FR-032, FIN-FR-033 |
| `POST /vouchers/{id}/approve, reject, return` | การดำเนินการของผู้อนุมัติ | `fin.approve` | FIN-FR-034, FIN-FR-036 ถึง FIN-FR-039 |
| `POST /vouchers/{id}/head-cancel` | หัวหน้าการเงินยกเลิก | `fin.head` | FIN-FR-035 |
| `POST, GET /gfmis-files`; `POST /gfmis-files/{id}/remove-row, cancel, results` | ไฟล์คำขอและผล | `fin.pay` | FIN-FR-041 ถึง FIN-FR-044 |
| `POST, GET /payment-batches`; `POST /payment-batches/{id}/results`; `POST /vouchers/{id}/record-payment` | การจ่ายเงินจากบัญชีหน่วยงาน | `fin.pay` | FIN-FR-045, FIN-FR-046 |
| `POST /vouchers/{id}/certificate/send, reissue`; `POST /vouchers/{id}/refunds` | หนังสือรับรองและเงินคืน | `fin.pay` | FIN-FR-048, FIN-FR-049, FIN-FR-051 |
| `GET, POST /daily-payment-check` | การตรวจการจ่ายเงินประจำวัน | `fin.head` | FIN-FR-050 |
| `GET, POST /bank-changes`; `PUT /bank-changes/{id}`; `POST /bank-changes/{id}/withdraw, confirm, refuse, reveal` | การเปลี่ยนบัญชีธนาคาร | `fin.bank.request`, `fin.bank.confirm` | FIN-FR-053 ถึง FIN-FR-058 |
| `GET, POST /advances`; `PUT /advances/{id}`; `POST /advances/{id}/cancel, clearing, take-back` | การดำเนินการของผู้ยืมกับระเบียนของตน | `fin.adv.self` | FIN-FR-062, FIN-FR-064, FIN-FR-069, FIN-FR-071 |
| `POST /advances/{id}/approve, reject` | การดำเนินการของผู้อนุมัติ | `fin.approve` | FIN-FR-066 ถึง FIN-FR-069 |
| `POST /advances/{id}/pay, object, accept` | การดำเนินการของ Finance | `fin.adv.manage` | FIN-FR-070, FIN-FR-072 ถึง FIN-FR-074 |
| `POST /advances/{id}/demand, demand/move, report`; `GET /advances/register` | หนังสือทวงและทะเบียน | `fin.head`, `fin.read` | FIN-FR-075 ถึง FIN-FR-077 |
| `GET, POST /receipts`; `POST /receipts/{id}/record, cancel` | ใบเสร็จรับเงิน | `fin.receipt` | FIN-FR-078 ถึง FIN-FR-081 |
| `GET, POST /receipt-books`; `PUT /receipt-books/{id}`; `POST /receipt-books/{id}/void, return`; `POST /receipt-books/report` | สมุดใบเสร็จรับเงิน | `fin.head`, `fin.receipt` | FIN-FR-082, FIN-FR-083 |
| `GET, POST /remittances`; `PUT /remittances/{id}`; `POST /remittances/{id}/reverse` | การนำส่งเงิน | `fin.remit` | FIN-FR-084 ถึง FIN-FR-086 |
| `GET, POST /cash-orders`; `POST /cash-orders/{id}/cancel` | คำสั่งกรรมการ | `fin.head` | FIN-FR-087 |
| `GET, POST /daily-cash`; `POST /daily-cash/{date}/count, recount, acknowledge` | เงินคงเหลือประจำวัน | `fin.cash`, `fin.cash.count`, `fin.head`, `fin.approve` | FIN-FR-088 ถึง FIN-FR-094 |
| `GET, POST /funds`; `PUT, DELETE /funds/{id}`; `POST /funds/{id}/close` | กองทุน | `fin.nb.write` | FIN-FR-096, FIN-FR-097 |
| `GET, POST /spending-plans`; `PUT /spending-plans/{id}`; `POST /spending-plans/{id}/send, withdraw, amend, approve, return` | แผนการใช้จ่าย | `fin.nb.write`, `fin.approve` | FIN-FR-098 ถึง FIN-FR-100 |
| `GET, POST /treasury-withdrawals`; `PUT /treasury-withdrawals/{id}`; `POST /treasury-withdrawals/{id}/approve, reject, deposit-back` | การถอนเงินฝากคลัง | `fin.nb.write`, `fin.approve` | FIN-FR-102, FIN-FR-103 |
| `POST /bank-statements`; `DELETE /bank-statements/{id}`; `POST /bank-statements/{id}/adjustments`; `DELETE /adjustments/{id}` | รายการเดินบัญชี | `fin.recon` | FIN-FR-105 ถึง FIN-FR-108 |
| `POST /bank-reconciliations/{acct}/{month}/sign, reopen` | การกระทบยอด | `fin.recon.sign` | FIN-FR-109, FIN-FR-110 |
| `POST /gfmis-reports`; `POST /payment-files`; `POST /payment-files/{id}/undo, rows/{n}/match`; `POST /payments/{id}/explain` | รายงาน GFMIS และไฟล์การจ่ายเงิน | `fin.recon` | FIN-FR-111 ถึง FIN-FR-117 |
| `GET, POST /gfmis-assignments`; `PUT /gfmis-assignments/{id}`; `POST /gfmis-assignments/{id}/revoke` | การมอบหมาย | `fin.head` | FIN-FR-118 |
| `GET /close/day`; `POST /close/day, day/reopen`; `GET /periods/{month}`; `POST /periods/{month}/review-advances, close, reopen`; `GET /close/year` | การปิดงวด | `fin.head`, `fin.approve` | FIN-FR-120 ถึง FIN-FR-125 |
| `GET, POST /audit-queries`; `PUT, DELETE /audit-queries/{id}`; `POST /audit-queries/{id}/answer, note` | ข้อทักท้วง | `fin.head` | FIN-FR-130 ถึง FIN-FR-132 |
| `GET /kpis, forecasts, signals`; `POST /what-ifs`; `POST /signals/{key}/decide`; `POST /agents/{agent}/runs`; `POST /agent-runs/{id}/stop, steps/{n}/approve` | การวิเคราะห์และเอเจนต์ | `fin.ai` และสิทธิ์ของการดำเนินการนั้น | FIN-FR-133 ถึง FIN-FR-139 |
| `GET, PUT /settings` | ค่าตั้งของหน่วยงาน | `fin.admin` | FIN-FR-001, FIN-FR-003 |

### รายการข้อผิดพลาด {#fin-errors}

> [!NOTE] รหัสเหล่านี้เป็นข้อเสนอ ข้อผิดพลาดอยู่ในรูป Problem Details พร้อมฟิลด์ `code` ข้อความเป็นภาษาของผู้ใช้

| รหัส | HTTP | ความหมาย | กฎหรือข้อกำหนด |
| --- | --- | --- | --- |
| `FIN_INVALID_INPUT` | 400 | ฟิลด์ไม่ผ่านการตรวจความถูกต้อง | FIN-FR-023 |
| `FIN_REASON_REQUIRED` | 400 | ไม่มีเหตุผลหรือเหตุผลสั้นเกินไป | BR-PLT-18, BR-FIN-09 |
| `FIN_FORBIDDEN` | 403 | ผู้ใช้ไม่มีสิทธิ์ | ADR-0006 |
| `FIN_SOD_BLOCKED` | 403 | กฎแบ่งแยกหน้าที่ปฏิเสธบุคคลนี้ และบันทึกความพยายามแล้ว | BR-FIN-11 |
| `FIN_AUTHORITY_EXCEEDED` | 403 | ยอดเงินเกินระดับของผู้อนุมัติ | BR-FIN-10 |
| `FIN_NO_ASSIGNMENT` | 403 | ไม่มีหนังสือมอบหมาย GFMIS สำหรับหน้าที่นี้ | FIN-FR-119 |
| `FIN_AI_NOT_ALLOWED` | 403 | เครื่องมือปิดอยู่ หรืออยู่นอกขีดจำกัดของ AI | BR-FIN-31 |
| `FIN_NOT_FOUND` | 404 | ไม่มีระเบียนนี้ หรือเป็นของหน่วยงานอื่น | ADR-0005 |
| `FIN_VERSION_CONFLICT` | 409 | ระเบียนเปลี่ยนไปหลังจากที่อ่าน | ADR-0005 |
| `FIN_STATE_CONFLICT` | 409 | การดำเนินการใช้กับสถานะปัจจุบันไม่ได้ | FIN-CR-003, BR-FIN-12 |
| `FIN_PERIOD_CLOSED` | 409 | วันที่อยู่ในงวดที่ปิดแล้ว | BR-FIN-13 |
| `FIN_AMOUNT_EXCEEDED` | 409 | เกินยอดที่ยังว่าง | BR-FIN-02, BR-FIN-16 |
| `FIN_FIELD_LOCKED` | 409 | ฟิลด์มาจากโมดูลอื่นหรือถูกล็อกแล้ว | BR-FIN-08, FIN-FR-010 |
| `FIN_PO_MISSING` | 409 | ไม่มี PO ของ GFMIS ที่จำเป็น | BR-FIN-04 |
| `FIN_NO_ACCOUNT` | 409 | ผู้รับเงินไม่มีบัญชีธนาคารที่ยืนยันแล้ว | BR-FIN-30 |
| `FIN_ADVANCE_CHECK_FAILED` | 409 | การตรวจตาม BR-FIN-17 ไม่ผ่าน โดยระบุข้อที่ไม่ผ่านในเนื้อหาการตอบกลับ | BR-FIN-17 |
| `FIN_PLAN_REQUIRED` | 409 | ไม่มีรายการในแผนที่อนุมัติ | BR-FIN-24 |
| `FIN_SETTING_OUT_OF_RANGE` | 422 | ค่าตั้งอยู่นอกช่วง | FIN-FR-002 |
| `FIN_IMPORT_INVALID` | 422 | อ่านไฟล์ตามการแมปไม่ได้ | FIN-IR-008 |

### รายการเหตุการณ์ {#fin-events}

> [!NOTE] รายการเหตุการณ์นี้เป็นข้อเสนอ routing key ขึ้นต้นด้วย `finance.` ทุกเหตุการณ์มี `eventId`, `tenantId`, `occurredAt` และ `aggregateId` และ payload มีเฉพาะรหัสอ้างอิงและยอดเงิน ไม่มีข้อมูลส่วนบุคคล

| เหตุการณ์ | เกิดจาก | ฟิลด์เพิ่มเติม | ผู้รับ |
| --- | --- | --- | --- |
| `commitment.changed` | `Commitment` | `lineId`, `amount` | `projects`, `reporting` |
| `purchase-order.recorded` | `PurchaseOrder` | `sourceId` | `reporting` |
| `voucher.sent`, `voucher.approved`, `voucher.rejected`, `voucher.cancelled` | `Voucher` | `lineId`, `contractId`, `phaseNo`, `spend` | `reporting` และการแจ้งเตือน |
| `voucher.paid` | `Voucher.markPaid` | `lineId`, `contractId`, `phaseNo`, `spend`, `paidOn` | `projects`, `review`, `budget` |
| `gfmis-file.created` | `GfmisFile` | `rows` | adapter `gfmis` |
| `gfmis-report.imported` | `reconcile` | `kind`, `month` | `projects`, `reporting` |
| `supplier-bank.changed` | `BankChange.confirm` | `supplierId` | adapter ของ vendor master และสัญญาณเตือน |
| `advance.paid`, `advance.cleared`, `advance.overdue` | `Advance` และการตรวจนาฬิกา | `lineId`, `amount` | `reporting` และการแจ้งเตือน |
| `remittance.made` | `Remittance` | `cls`, `amount`, `late` | `reporting` |
| `cash.differs` | `DailyCash` | `onDate` | การแจ้งเตือน |
| `period.closed`, `period.reopened` | `Period` | `month` | การแจ้งเตือน และ `reporting` |
| `settings.changed` | `settings` | `key`, `effectiveFrom` | การแจ้งเตือนถึงผู้ตรวจสอบ |

### Adapter ภายนอก {#fin-adapters}

Adapter ทำงานบนเส้นทาง outbox ลองซ้ำได้อย่างปลอดภัย และแสดงสถานะให้เห็น ตามที่บทการเชื่อมต่อกำหนด ส่วนควบคุมการจำลองไม่มีในหน่วยงานใช้งานจริง (FIN-NFR-003)

| Adapter | Port | รุ่นแรก | พฤติกรรม | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| คำขอและ PO ของ GFMIS | `GfmisGateway` | ไฟล์โดยเจ้าหน้าที่ จนกว่าจะมีสัญญาการเชื่อมต่อ | รับรายการและคืนเลขอ้างอิงหรือการปฏิเสธ | FIN-IR-006 |
| ผลและรายงานของ GFMIS | `GfmisGateway` | อัปโหลดไฟล์ด้วย `FileMapping` | ไฟล์เดิมให้ข้อมูลเดิมโดยใช้ `file_hash` | FIN-IR-008 |
| รายการเดินบัญชีธนาคาร | `BankFileGateway` | อัปโหลดไฟล์ด้วย `FileMapping` | ตามรูปแบบของแต่ละธนาคาร | FIN-FR-105 |
| e-Payment | `BankFileGateway` | ไฟล์ธนาคาร แยกตามธนาคาร | การหมดเวลาไม่ทำให้ส่งซ้ำโดยไม่ตรวจสอบ | FIN-IR-009 |
| Vendor master | `VendorMasterPort` | ยังเปิดอยู่ | ส่งหลังการยืนยัน | FIN-FR-061 |
| ไฟล์เงินเดือนจาก HR | `PayrollFileSource` | อัปโหลดไฟล์ | เฉพาะยอดรวมรายเดือน | FIN-IR-010 |

> [!OPEN] ยังไม่ทราบสัญญาการเชื่อมต่อของ GFMIS และธนาคาร กรมบัญชีกลางและแต่ละธนาคารต้องให้รายละเอียด (OI-FIN-02, OI-FIN-03, DG-XC-20) `FileMapping` เก็บรูปแบบไฟล์เป็นค่ากำหนด หน่วยงานแรกจึงเริ่มจากไฟล์ตัวอย่างของตนได้ (D-FN-07)

## การออกแบบความมั่นคงปลอดภัย {#fin-security}

<!-- covers: PDPA 39; PDPA 40 -->

กฎในบท Platform และบทข้อกำหนดร่วมมีผลใช้ ฟังก์ชันการเงินและการจ่ายเงินอยู่ที่ OWASP ASVS Level 3 (XC-SEC-002, ADR-0017) ซึ่งครอบคลุมเส้นทางการเปลี่ยนบัญชีธนาคารและการอนุมัติ

### สิทธิ์ {#fin-authorities}

> [!NOTE] ชื่อสิทธิ์เป็นข้อเสนอ การแมปบทบาทกับสิทธิ์เป็นข้อมูลของหน่วยงาน

| สิทธิ์ | บทบาทเริ่มต้น | อนุญาต |
| --- | --- | --- |
| `fin.read` | บทบาทด้านการเงิน ผู้อนุมัติ งานแผน ผู้ตรวจสอบ | อ่านระเบียน Finance ที่บทบาทนั้นเห็นได้ |
| `fin.commit` | เจ้าหน้าที่การเงิน | วงเงินผูกพัน PO และการกันเงินไว้เบิกเหลื่อมปี |
| `fin.voucher.write` | เจ้าหน้าที่การเงิน | จัดทำและแก้ไขใบขอเบิก |
| `fin.voucher.check` | เจ้าหน้าที่การเงิน หัวหน้าการเงิน | ตรวจหลักฐาน |
| `fin.approve` | ผู้มีอำนาจอนุมัติโดยการมอบอำนาจ หัวหน้าการเงินภายใน A3 | อนุมัติใบขอเบิก ส่วนเงินยืม แผน และการถอนเงินเฉพาะผู้อนุมัติ |
| `fin.pay`, `fin.remit`, `fin.receipt` | เจ้าหน้าที่การเงิน และ `fin.remit` รวมถึงหัวหน้าการเงิน | ไฟล์ GFMIS การจ่ายเงิน ใบเสร็จรับเงิน และการนำส่งเงิน |
| `fin.bank.request`, `fin.bank.confirm` | เจ้าหน้าที่การเงิน; เจ้าหน้าที่การเงินและหัวหน้าการเงิน | ขอและตัดสินการเปลี่ยนบัญชีธนาคาร |
| `fin.adv.self` | ผู้ใช้ทุกคน เฉพาะระเบียนของตน | ขอและส่งใช้เงินยืม |
| `fin.adv.manage` | เจ้าหน้าที่การเงิน หัวหน้าการเงิน | จ่ายและตรวจเงินยืม |
| `fin.cash`, `fin.cash.count` | เจ้าหน้าที่การเงิน; กรรมการตามคำสั่งที่มีผล ตรวจรายวัน | จัดทำรายงาน; นับเงิน |
| `fin.nb.write` | เจ้าหน้าที่การเงิน หัวหน้าการเงิน | กองทุน แผน และการถอนเงิน |
| `fin.recon`, `fin.recon.sign` | เจ้าหน้าที่การเงิน; บทบาทด้านการเงิน ภายใต้ SD-15 | กระทบยอด; ลงนาม |
| `fin.head` | หัวหน้าการเงิน | ทะเบียน หนังสือทวง การตรวจประจำวัน การปิดงวด ข้อทักท้วง และการยกเลิกโดยหัวหน้า |
| `fin.admin` | ผู้ดูแลระบบ | ค่าตั้งของหน่วยงาน |
| `fin.ai` | บทบาทที่หน่วยงานอนุญาต และเฉพาะเมื่อเครื่องมือเปิด | เอเจนต์และการวิเคราะห์ |

### การตรวจการแยกหน้าที่ {#fin-sod}

`SodGuard.check` ทำงานภายในคำสั่ง หลังตรวจสิทธิ์และก่อนเปลี่ยนสถานะ และการปฏิเสธบันทึกในธุรกรรมของตนเอง กฎเป็นไปตามทะเบียนของ Platform

| กฎ | คำสั่ง | ผู้กระทำ | เทียบกับ | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| P-F05 | `Voucher.pass` | ผู้ตรวจ | ผู้จัดทำ | FIN-FR-032 |
| SD-11 | `Voucher.approve`, `SpendingPlan.approve`, `TreasuryWithdrawal.decide` | ผู้อนุมัติและผู้มอบอำนาจ | ผู้จัดทำและผู้ตรวจ หรือผู้เสนอ | FIN-FR-037, FIN-FR-099, FIN-FR-102 |
| SD-04 | `Voucher.approve` | ผู้อนุมัติและผู้มอบอำนาจ | กรรมการและผู้ลงนามตรวจรับ | FIN-FR-037 |
| SD-05 | `PaymentFile.import`, `match`, `Payment.explain` | ผู้กระทบยอด | ผู้อนุมัติและผู้ถืออำนาจ | FIN-FR-115, FIN-FR-116 |
| SD-12 | `Advance.approve`, `pay`, `object`, `accept` | ผู้อนุมัติและผู้มอบอำนาจ หรือ Finance | ผู้ยืม | FIN-FR-067, FIN-FR-070, FIN-FR-073 |
| SD-13 | `DailyCash.count` | กรรมการ | ผู้ที่รับหรือจ่ายเงินในวันนั้น | FIN-FR-090 |
| SD-14 | `BankChange.confirm`, `refuse` | ผู้ตัดสิน | ผู้ขอ | FIN-FR-054, FIN-FR-060 |
| SD-15 | `BankReconciliation.sign` | ผู้ลงนาม | ผู้ที่บันทึกรายการเงินของเดือนนั้น | FIN-FR-109 |
| SD-16 | `Period.reopen`, `DayClose.reopen`, `BankReconciliation.reopen` | ผู้เปิดใหม่ | ผู้ปิดหรือผู้ลงนาม | FIN-FR-110, FIN-FR-121, FIN-FR-123 |

SD-03 ไม่มีคำสั่งในบทนี้ เพราะ SD-11 และ P-F05 ครอบคลุมแล้ว (OI-FIN-11) ต้นแบบตรวจบางกฎกับตัวบุคคลเท่านั้น ส่วนระบบจริงส่ง `ActorSet` ให้ทุกกฎ ผู้รับมอบอำนาจจึงหลบกฎไม่ได้

### บัญชีธนาคาร {#fin-bank-security}

- เลขที่บัญชีกรอกครั้งเดียว เข้ารหัสเมื่อรับ และไม่คืนในรายการ `reveal` คืนเลขที่ให้ `fin.bank.confirm` เท่านั้น เขียนรายการ Audit และจำกัดจำนวนครั้งต่อผู้ใช้ตามกฎร่วม
- ใบขอเบิกเก็บ `bank_account_id` การเปลี่ยนบัญชีภายหลังจึงไม่เปลี่ยนปลายทางของการจ่ายเงินที่อนุมัติแล้ว
- กฎแบ่งแยกหน้าที่ บันทึกการเปิดดู และ SG-F03 รวมกันเป็นกลไกควบคุม และผู้ตรวจสอบได้รับแจ้งทุกการเปลี่ยนแปลง

> [!OPEN] บุคคลที่มีทั้งสิทธิ์ยืนยันและควบคุมช่องทางติดต่อของผู้ขายยังยืนยันการเปลี่ยนแปลงเท็จได้ ผู้ตรวจทานความมั่นคงปลอดภัยและผู้เชี่ยวชาญด้านการเงินต้องตัดสินว่าจะตรวจสอบคำขอจากพอร์ทัลอย่างไร (OI-FIN-13, DG-FIN-05)

### Audit {#fin-audit}

- การดำเนินการทุกรายการในรายการเขียนรายการผ่าน `AuditLog` โดย aspect `CommandAudit` ในธุรกรรมเดียวกัน (FIN-NFR-001, FIN-CR-005)
- เหตุผลอยู่ในระเบียนทางธุรกิจ และรายการ Audit ชี้ไปที่ระเบียนนั้น (ADR-0015)
- การเปิดดูฟิลด์ Restricted และการกันทุกครั้งโดยกฎแบ่งแยกหน้าที่ถูกบันทึก

### การควบคุม AI {#fin-ai-security}

- การเรียก AI ทั้งหมดผ่าน `AiGateway` AI ปิดเป็นค่าเริ่มต้น และทุกฟังก์ชันทำงานได้เมื่อปิด (ADR-0016, FIN-FR-140)
- `FinanceToolRegister` เป็นรายการปิดต่อเอเจนต์ ไม่มีเครื่องมืออนุมัติ จ่ายเงิน ปิดงวด หรือเปลี่ยนยอดเงิน (BR-FIN-31)
- ขั้นตอนที่เขียนข้อมูลหยุดรอคนและเรียกคำสั่งปกติ สิทธิ์และกฎแบ่งแยกหน้าที่จึงมีผลกับบุคคลนั้น
- เลขที่บัญชีและเลขประจำตัวผู้เสียภาษีไม่ถูกส่งให้โมเดล

## การออกแบบที่ไม่ใช่ฟังก์ชัน {#fin-nfr}

| ข้อกำหนด | คำตอบในการออกแบบ | ทวนสอบด้วย |
| --- | --- | --- |
| FIN-NFR-001 | aspect `CommandAudit` บนทุกคำสั่ง | การทดสอบ integration ต่อคำสั่ง |
| FIN-NFR-002 | `SodGuard` บันทึกในธุรกรรมของตนเอง | `SodRefusalIT` |
| FIN-NFR-003 | ไม่มีโค้ดจำลองในระบบจริง และ adapter ทดสอบที่ติดป้ายชัดเจนมีเฉพาะ profile ทดสอบ | การตรวจตอน build |
| FIN-NFR-004 | ตัวคำนวณแบบ pure function ที่ใช้ทศนิยมแม่นยำ | การทดสอบหน่วยแบบตาราง |
| FIN-NFR-005 | ไฟล์ข้อความทั้งสองภาษา และแม่แบบเอกสารภาษาไทย | Playwright ทั้งสองภาษา |
| FIN-NFR-006 | `ForecastEngine` ที่กำหนด seed บน projection | การทดสอบรันซ้ำ |

### ภาระงานและความพร้อมใช้งาน {#fin-nfr-load}

- เป้าหมายด้านเวลาและปริมาณเป็นไปตามบทข้อกำหนดร่วม Finance มีช่วงพีคปลายเดือนกันยายนและทุกสิ้นเดือน และสคริปต์ k6 ครอบคลุมการอนุมัติใบขอเบิก การสร้างไฟล์ และการปิดงวดในช่วงพีคนั้น (ADR-0017)
- `LineLedger` เป็นจุดแย่งชิงที่คาดว่าจะเกิด ธุรกรรมจึงถือไว้เฉพาะช่วงเรียกบัญชีวงเงินและ commit
- เมื่อ adapter ล้มเหลว รายการจะรออยู่พร้อมแสดงสถานะ และไม่มีคำสั่งใดรอ GFMIS หรือธนาคาร (ADR-0008)

## การออกแบบการทดสอบ {#fin-tests}

sweep ทำงานภายในหน้าต้นแบบและทดสอบเซิร์ฟเวอร์ไม่ได้ แต่การเดินทดสอบเหล่านั้นเป็นคำอธิบายพฤติกรรมที่ตั้งใจไว้ได้ดีที่สุด แต่ละการเดินจึงกลายเป็นการทดสอบของระบบจริง

> [!NOTE] ชื่อคลาสทดสอบเป็นข้อเสนอ

### ระดับการทดสอบ {#fin-test-levels}

| ระดับ | เครื่องมือ | ครอบคลุม |
| --- | --- | --- |
| หน่วย | JUnit | ตารางสถานะทุกคู่ `VoucherCalculator`, `RoutePolicy`, `AuthorityTable`, `AdvancePolicy`, `RemitPolicy`, `CloseChecks` |
| สถาปัตยกรรม | Spring Modulith `verify`, ArchUnit | ขอบเขตโมดูล ไม่มีวงกลมกับ `procurement` และไม่มี framework ในโดเมน |
| Integration | JUnit กับ Testcontainers | คำสั่งผ่าน REST, row-level security, outbox และการเข้ารหัสฟิลด์ |
| สถานการณ์ข้ามโมดูล | Spring Modulith `Scenario` | Finance ร่วมกับ `procurement` และ `budget` ในธุรกรรมเดียว |
| ต้นจนจบ | Playwright | เส้นทางของแต่ละบทบาททั้งสองภาษา |
| โหลด | k6 | ช่วงพีคสิ้นปีและสิ้นเดือน |
| ความมั่นคงปลอดภัย | OWASP ZAP, SonarQube, penetration test | ASVS Level 3 บนเส้นทางการจ่ายเงิน |

### จากการเดินทดสอบใน sweep สู่การทดสอบของระบบจริง {#fin-test-walks}

| การตรวจใน sweep | การทดสอบของระบบจริง | ส่วนที่เพิ่มจากการเดินเดิม | ข้อกำหนด |
| --- | --- | --- | --- |
| FC1 walk | `RegistersIT`, `BankChangeIT` | บันทึกการเปิดดู การปฏิเสธ SD-14 พร้อมแถวบันทึก และการเข้ารหัสขณะจัดเก็บ | FIN-FR-053 ถึง FIN-FR-056, FIN-FR-082, FIN-FR-087, FIN-FR-118 |
| FC2 walk | `VoucherFlowIT`, `AuthorityTableTest` | เก็บรุ่นของชุดกฎ การปฏิเสธ SD-04 และใบขอเบิกที่ไม่อนุมัติปล่อยงวดงาน | FIN-FR-022 ถึง FIN-FR-037 |
| FC3 walk | `GfmisFileIT`, `PaymentBatchIT`, `RefundIT` | สถานะการส่ง ไม่ส่งซ้ำ และการปฏิเสธเมื่อไม่มีการมอบหมาย | FIN-FR-041 ถึง FIN-FR-051 |
| FC4 walk | `CommitmentIT`, `AdvanceFlowIT` | ความล้มเหลวของบัญชีวงเงินย้อนธุรกรรม และอำนาจบนเงินยืม | FIN-FR-009 ถึง FIN-FR-014, FIN-FR-062 ถึง FIN-FR-071, FIN-FR-128 |
| FC5 walk | `ReceiptIT`, `RemittanceIT`, `ReconciliationIT`, `AuditQueryIT` | การปฏิเสธงวดที่ปิดแล้วในทุกคำสั่ง | FIN-FR-078 ถึง FIN-FR-086, FIN-FR-107 ถึง FIN-FR-110, FIN-FR-121, FIN-FR-130 ถึง FIN-FR-132 |
| FC6 walk | `FundPlanIT`, `WhatIfIT` | เงินยืมจากเงินนอกงบประมาณในรายการฝั่งบัญชี | FIN-FR-096 ถึง FIN-FR-103, FIN-FR-137, FIN-FR-139 |
| FC7 walk | `DemandIT`, `PaymentFileIT`, `LateCashIT` | SD-05 เมื่อนำเข้า | FIN-FR-075, FIN-FR-089, FIN-FR-111, FIN-FR-115 ถึง FIN-FR-117 |
| Page-open sweep | `role-matrix.spec` | การสแกนการเข้าถึง | แถว Partial โดยทั่วไป |

### การทดสอบที่ไม่มีต้นทางใน sweep {#fin-test-new}

| การทดสอบ | ยืนยัน | ข้อกำหนด |
| --- | --- | --- |
| `AcceptanceToVoucherScenario` | ประตูผ่าน พัก และปลดจนถึงการอนุมัติ ปฏิเสธเมื่อไม่มี PO ค่าปรับถึงยอดสุทธิ และปฏิเสธการงดหรือลดค่าปรับหลังเริ่มต้น | FIN-FR-015, FIN-FR-017 ถึง FIN-FR-021, FIN-IR-001 ถึง FIN-IR-003 |
| `VoucherCalculatorTest` | ภาษี ยอดสุทธิ และการปัดเศษจากยอดทั้งใบสั่ง สำหรับผู้รับเงินแต่ละชนิด และตัวอย่างในเอกสารออกแบบ | FIN-FR-028, FIN-NFR-004 |
| `RoutePolicyTest` | ทุกแถวของ BR-FIN-05 | FIN-FR-027 |
| `RemitPolicyTest` | ทุกประเภทเงินและวิธีการที่ขอบเขต บนวันทำการ | FIN-FR-084 |
| `AdvancePolicyTest` | การตรวจแต่ละข้อของ BR-FIN-17 และแต่ละขอบเขต | FIN-FR-066 |
| `DailyCashIT` | ยอดนับที่ต่างกัน และการปฏิเสธ SD-13 | FIN-FR-090, FIN-FR-091 |
| `MonthCloseIT` | การตรวจที่ไม่ผ่านแต่ละข้อ การปิดพร้อมเหตุผล และ `PeriodGuard` ในทุกคำสั่งที่มีวันที่ | FIN-FR-122 ถึง FIN-FR-124 |
| `SodRefusalIT` | กฎแต่ละข้อปฏิเสธทั้งบุคคลและผู้มอบอำนาจ พร้อมแถวบันทึก | BR-FIN-11 |
| `RuleSetTest` | หน่วยงานเปลี่ยน dated rule ไม่ได้ และใบขอเบิกเก่าเก็บรุ่นเดิม | FIN-FR-002 |
| `TenantIsolationIT` | ทุกตารางปฏิเสธการเข้าถึงข้ามหน่วยงาน | ADR-0005 |
| `AiLimitsTest` | ทะเบียนไม่มีเครื่องมือต้องห้าม | BR-FIN-31 |

## การย้ายจากต้นแบบ {#fin-migration}

ต้นแบบเป็นเอกสารอ้างอิงและไม่มีการย้ายโค้ด ไม่มีข้อมูลจริงให้ย้าย ยอดยกมาของหน่วยงานเป็นเรื่องการเริ่มใช้งาน ได้แก่ ยอดกองทุน เงินยืมค้าง สมุดใบเสร็จรับเงิน และวงเงินผูกพันค้าง ซึ่งเข้าระบบเป็นระเบียนยกมาที่มีวันที่

| สิ่งที่สืบทอด | วิธี | ที่มาในต้นแบบ |
| --- | --- | --- |
| ชื่อสถานะและการเปลี่ยนสถานะ | enum และตารางของ Java | `66c-fin-fn2.js`, `66d-fin-fn3.js` |
| กฎและการคำนวณ | เขียนใหม่พร้อมการทดสอบ | `vCalc`, `vRoute`, `advChecks`, `rcDue`, `monthChecks` |
| กฎการเงิน | แยกเป็น `FinanceRuleSet` และ `finance_setting` | `66b-fin-fn1.js` `FCFG_ROWS` |
| หน้าจอและขั้นตอน | React ทำตามตารางหน้า | `66h-fin-pages.js` |
| การเดินทดสอบ | เขียนใหม่เป็นการทดสอบ | `tests/sweep.js` |

| สิ่งที่ไม่สืบทอด | เหตุผล | แทนด้วย |
| --- | --- | --- |
| สถานะในเบราว์เซอร์และการสลับบทบาท | ผู้ใช้คนเดียว ไม่มีเซิร์ฟเวอร์ | PostgreSQL และ Keycloak |
| ปุ่มจำลองและรายงานที่สร้างขึ้น | ต้องไม่มีในระบบจริง | adapter และการนำเข้า |
| `bank` บนผู้ขาย | Finance เป็นเจ้าของบัญชี | `supplier_bank_account` |
| ค่าปรับที่แก้ไขได้บนใบขอเบิกตามสัญญา | BR-FIN-08 | สแนปช็อตประตูเบิกจ่าย |
| แบบฟอร์มค่าตั้งที่ไม่มีช่วงค่า | FIN-FR-002 | `FinanceRuleSet` |
| รายการเดือนคงที่ใน F7 และวันกันเงินไว้เบิกเหลื่อมปีคงที่ | เป็นค่าตัวอย่าง | ข้อมูลปฏิทิน |
| ข้อบกพร่องที่ทราบแล้ว | OI-FIN-09, OI-FIN-10, OI-FIN-17 ถึง OI-FIN-22 | แก้ด้วยการออกแบบและครอบคลุมด้วยการทดสอบ |

## ช่องว่างที่ทราบและประเด็นค้าง {#fin-open}

### ประเด็นที่สืบมาจาก SRS {#fin-open-srs}

| ประเด็น | ผลต่อการออกแบบนี้ | แนวทางปัจจุบัน | ผู้ตัดสิน |
| --- | --- | --- | --- |
| OI-FIN-01 | ฟิลด์ข้อกฎหมาย | เว้นว่างเมื่อยังไม่ยืนยัน | ผู้เชี่ยวชาญด้านการเงิน หน่วยกฎหมาย |
| OI-FIN-02, OI-FIN-03 | สัญญาการเชื่อมต่อภายนอก | port พร้อม adapter แบบไฟล์ | กรมบัญชีกลาง ธนาคาร |
| OI-FIN-04 | ภาษีค่าตอบแทน | ตารางอัตราใน `FinanceRuleSet` ที่ยังว่าง | ผู้เชี่ยวชาญด้านการเงิน ที่ปรึกษาภาษี |
| OI-FIN-05 | VAT | รายการเดียวในชุดกฎ | ทีมพัฒนา ผู้เชี่ยวชาญด้านการเงิน |
| OI-FIN-06 | ADV | อ้างเฉพาะ TRR | ผู้เชี่ยวชาญด้านการเงิน |
| OI-FIN-07 | จุดหยุดเด็ดขาดเมื่อปิดงวด | เหตุผลลบล้างการตรวจได้ทุกข้อ | ผู้เชี่ยวชาญด้านการเงิน ผู้ตรวจสอบ |
| OI-FIN-08 | ความหมายของ Paid | ดู DG-FIN-03 | เจ้าของผลิตภัณฑ์ เจ้าของ Procurement |
| OI-FIN-09, OI-FIN-10 | การปลดประตูเบิกจ่ายและใบขอเบิกที่ไม่อนุมัติ | แก้ด้วยการออกแบบ | ทีมพัฒนา |
| OI-FIN-11 | SD-03 | ไม่มีคำสั่ง | เจ้าของ Finance เจ้าของ Platform |
| OI-FIN-12 | การเก็บรักษา | มีคีย์แต่ยังไม่มีระยะเวลา | ผู้เชี่ยวชาญด้านการเงิน เจ้าของผลิตภัณฑ์ |
| OI-FIN-13 | การตรวจสอบคำขอจากพอร์ทัล | บันทึกช่องทางติดต่อ | ผู้เชี่ยวชาญด้านการเงิน ผู้ตรวจทานความมั่นคงปลอดภัย |
| OI-FIN-14 | ไฟล์เงินเดือน | มีเฉพาะ port | เจ้าของผลิตภัณฑ์ |
| OI-FIN-15 | ระดับตำแหน่งของกรรมการ | ไม่ตรวจ | ผู้เชี่ยวชาญด้านการเงิน |
| OI-FIN-16 | จำนวนเต็มบาทหรือสตางค์ | ทศนิยม 2 ตำแหน่ง | ผู้เชี่ยวชาญด้านพัสดุ ผู้เชี่ยวชาญด้านการเงิน |
| OI-FIN-17 ถึง OI-FIN-22 | ช่องว่างของต้นแบบ | แก้ด้วยการออกแบบ | ทีมพัฒนา |
| OI-FIN-23 | ขอบเขตของ AI | การเรียกทั้งหมดผ่าน `AiGateway` และปิดเป็นค่าเริ่มต้น | เจ้าของผลิตภัณฑ์ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล |

### ประเด็นใหม่จากการออกแบบนี้ {#fin-open-new}

เลข DG-FIN ด้านล่างเป็นของบทนี้และไม่ใช่รหัสใน SRS

| ประเด็น | คำถาม | แนวทางปัจจุบัน | ผู้ตัดสิน |
| --- | --- | --- | --- |
| DG-FIN-01 | บท Procurement ใช้ `FinanceFacts` ที่แคบลง ประกาศ `BankChangeIntake` และให้ `PhasePayment.rejected` ปล่อยงวดงานแล้ว เจ้าของผลิตภัณฑ์ยอมรับหรือไม่ | ตามรายการในหัวข้อองค์ประกอบ | ผู้เขียนบท Procurement เจ้าของผลิตภัณฑ์ |
| DG-FIN-02 | BGT-IR-005, SDS ของ Budget และบทการเชื่อมต่อกำหนดให้ Finance นำเข้าตรงกันแล้ว ใครเป็นเจ้าของหน้าจอ (DG-BGT-05) | Finance นำเข้าและบันทึกผ่าน `LineLedger.recordDisbursement` และ Budget เชื่อมไปยังผลลัพธ์ | ผู้เขียนบท Budget เจ้าของผลิตภัณฑ์ |
| DG-FIN-03 | `PhasePayment.approved` ควรทำงานเมื่ออนุมัติหรือเมื่อจ่ายเงิน | เมื่ออนุมัติตามต้นแบบ | เจ้าของผลิตภัณฑ์ เจ้าของ Procurement |
| DG-FIN-04 | ใบขอเบิกจองบน `LineLedger` ด้วย `reserve` หรือด้วยแถวของ Finance เท่านั้น | ใช้ `reserve` เมื่อไม่มีวงเงินผูกพัน และใช้แถว `voucher_hold` บนวงเงินผูกพัน | ผู้เขียนบท Budget หัวหน้าทีมเทคนิค |
| DG-FIN-05 | การเปลี่ยนบัญชีธนาคารผ่านพอร์ทัลต้องมีการควบคุมเพิ่มเติมนอกจากบุคคลที่สองหรือไม่ | บันทึกช่องทางติดต่อ บันทึกการเปิดดู และ SG-F03 | ผู้ตรวจทานความมั่นคงปลอดภัย ผู้เชี่ยวชาญด้านการเงิน |
| DG-FIN-06 | ใครเป็นเจ้าของ runtime ของเอเจนต์ เมื่อบท Review ขอ `AgentRuntime` ใน Platform | เครื่องมืออยู่ใน `finance.assistant` และทำงานบน runtime นั้น | ผู้เขียนบท Review ผู้เขียนบท Platform |
| DG-FIN-07 | ยอดที่กันไว้เบิกเหลื่อมปีอยู่บนวงเงินผูกพันเดิม หรือย้ายไปวงเงินผูกพันใหม่บนรายการจัดสรรเหลื่อมปี (DG-BGT-09) | Budget สร้างเงินกันและส่ง `carry-over.approved` วงเงินผูกพันคงอยู่ และเปลี่ยนการอ้างอิงรายการจัดสรรเมื่อได้รับ event นั้น | ผู้เขียนบท Budget ผู้เชี่ยวชาญด้านการเงิน |

### ช่องว่างที่ทราบในฉบับนี้ {#fin-open-depth}

- การพยากรณ์ การจำลองสถานการณ์ และเอเจนต์ออกแบบถึงระดับองค์ประกอบและส่วนเชื่อมต่อเท่านั้น อัลกอริทึมเป็นไปตามต้นแบบ
- แถว Planned ที่ไม่มีพฤติกรรมในต้นแบบมีเพียงตารางและ endpoint ได้แก่ FIN-FR-095 และ FIN-IR-010
- ชนิดคอลัมน์ ดัชนี และ constraint รอบทพจนานุกรมข้อมูล
