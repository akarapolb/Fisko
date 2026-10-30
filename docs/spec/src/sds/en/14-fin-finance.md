# Module design: Finance {#fin}

> [!NOTE] Fisko has no production code. The prototype is browser JavaScript and shows behaviour only. Everything in this chapter is a proposal to build: the packages, classes, tables, endpoints, events and test names below do not exist yet. The technology comes from the accepted ADRs in `docs/adr/`, which this chapter applies and does not reopen.

## Purpose, scope and traceability {#fin-purpose}

<!-- covers: TRR 18; TRR 28; TRR 36; TRR 101 -->

This chapter designs the production Finance module: its structure, data, interfaces and behaviour. It answers the Finance chapter of the SRS and follows the structure of the Procurement chapter.

The module covers commitments outside procurement, GFMIS purchase orders, vouchers and their approval, payments, supplier bank accounts, advances, receipts, remittance, daily cash, non-budget funds, reconciliation, closing, carry-over proposals, audit queries, and finance analytics and agents. GFMIS stays the official ledger (FIN-CR-001): Finance prepares, checks, approves, tracks and matches.

Outside this chapter: the duty engine, delegation, tasks and the audit log belong to `platform`; allocation lines and the carry-over decision belong to `budget`; contracts, acceptance, penalties and the payment gate belong to `procurement`. Cross-cutting rules are in their own chapter and are referred to here.

| SRS group | Requirements | Design section | Main package |
| --- | --- | --- | --- |
| Business rules | BR-FIN-01 to BR-FIN-31 | Domain model | all |
| Settings and clocks | FIN-FR-001 to FIN-FR-007, FIN-FR-141 | Domain model, Dynamic behaviour | `settings`, `clocks` |
| Commitments and purchase orders | FIN-FR-008 to FIN-FR-016 | Domain model, Data design | `commitment` |
| Vouchers | FIN-FR-017 to FIN-FR-040 | States and transitions, Dynamic behaviour | `voucher` |
| GFMIS files and payment | FIN-FR-041 to FIN-FR-052 | Dynamic behaviour, Interface design | `payment`, `gfmis` |
| Supplier bank accounts | FIN-FR-053 to FIN-FR-061 | Dynamic behaviour, Security design | `supplierbank` |
| Advances | FIN-FR-062 to FIN-FR-077 | States and transitions, Domain model | `advance` |
| Receipts and remittance | FIN-FR-078 to FIN-FR-086 | Domain model, Data design | `receipt` |
| Daily cash | FIN-FR-087 to FIN-FR-095 | Domain model, Security design | `cash` |
| Non-budget money | FIN-FR-096 to FIN-FR-104 | Domain model, Data design | `nonbudget` |
| Reconciliation | FIN-FR-105 to FIN-FR-119 | Dynamic behaviour, Data design | `reconcile` |
| Closing | FIN-FR-120 to FIN-FR-126 | States and transitions, Dynamic behaviour | `closing` |
| Carry-over | FIN-FR-127 to FIN-FR-129 | Components, Dynamic behaviour | `commitment` |
| Audit queries | FIN-FR-130 to FIN-FR-132 | Domain model, Data design | `auditquery` |
| AI and analytics | FIN-FR-133 to FIN-FR-140 | Components, Security design | `assistant`, `reporting` |
| Data requirements | FIN-DR-001 to FIN-DR-007 | Data design | all |
| Interface requirements | FIN-IR-001 to FIN-IR-011 | Interface design | `api`, `gfmis` |
| Non-functional requirements | FIN-NFR-001 to FIN-NFR-006 | Non-functional design, Security design | all |
| Constraints | FIN-CR-001 to FIN-CR-005 | Design overview | all |
| Test evidence | Sweep walks FC1 to FC7 | Test design | tests |
| Open issues | OI-FIN-01 to OI-FIN-23 | Known gaps and open issues | all |

## Design overview and decisions {#fin-decisions}

Finance is one module of the modular monolith (ADR-0002, FIN-CR-002). A web request runs one command in one PostgreSQL transaction. That transaction stores the aggregate, the outbox rows and any Budget ledger or Procurement call together. Legal state machines are Java code (ADR-0007, FIN-CR-003). Tenant choices are data.

| Decision | Reason | Rejected alternative | Source |
| --- | --- | --- | --- |
| `finance` depends on `procurement.api` and implements the SPI `FinanceFacts` | The direction is fixed, and the gate needs the PO fact at once | Two-way calls (a cycle); events only (the gate cannot wait) | ADR-0002, PRC-CR-005 |
| A second SPI, `BankChangeIntake`, is declared by Procurement and implemented by Finance | The supplier portal lives in `procurement`, and a bank account must not travel in an event, because event payloads hold no personal data | An event with the account number; a portal inside Finance | PRC-IR-012, ADR-0008 |
| Fisko has no ledger. Finance stores operational records, and GFMIS references point to the official entries | Two ledgers would drift (BR-FIN-01) | Full double-entry accounts | D-FN-01, FIN-CR-001 |
| A contract voucher takes gross and penalty from one gate snapshot, and they are read-only in Finance | One rule set decides the payable amount, and a penalty changes only as a waiver in Procurement | Finance edits the penalty, as the prototype does | BR-FIN-08, FIN-FR-019 |
| Tax, net and route are computed by pure functions, stored on approval, and never read from a form | The same input gives the same result (FIN-NFR-004), and the approved figures are what leaves the agency | Trusting screen calculations | ADR-0006 |
| Spending checks use `LineLedger` in the same transaction | A hold, a commitment or a payment must succeed or fail with the business change | A saga over events | ADR-0002, ADR-0005 |
| Each legal number is an entry in a dated `FinanceRuleSet`; each tenant value is a row in `finance_setting` | Tenants cannot configure an unlawful process, and old records keep old rules (FIN-FR-002). The prototype edits both in one form | Every number as a free setting | ADR-0007 |
| A voucher stores the rule-set version it was approved under | Later readers can see which rule applied | Reading current rules at each view | ADR-0007 |
| GFMIS and the banks sit behind ports on the outbox path, and results come back as commands | The contract is unknown (DG-XC-20), and the voucher logic must not change when it arrives | Parsing files inside the voucher logic | ADR-0008, FIN-IR-006 |
| One `PeriodGuard` is called by every command that changes a dated money record | BR-FIN-13 then holds everywhere. The prototype checks it in two places | A check in each page | R-FC-02, FIN-FR-124 |
| Overdue, V7 and remittance due dates are derived at each read | Stored copies drift, and the design says so for overdue | Status columns updated by jobs | BR-FIN-18 |
| Bank accounts sit in Finance, encrypted, with a validity period, so a voucher names the account row it pays | History stays exact, and a change never rewrites a past payment | A `bank` field on the supplier, as the prototype has | BR-FIN-30, PRC data requirements |
| Forecasts read rebuildable projections with a seeded generator | Heavy reads stay off the command tables (FIN-NFR-006) | Queries on live tables at each page open | ADR-0009 |

> [!LAW] Withholding shows how a legal limit and a tenant choice divide. `whtMin` and `whtPct` are entries in `FinanceRuleSet` with a clause field and an effective date, and a tenant cannot change them. Their source is at level B and has no TRR clause, so the clause field stays blank until the finance specialist confirms it (OI-FIN-01). The assignee limits in the authority table are tenant data, because they come from the agency's own assignment order (BR-FIN-10).

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

## Components {#fin-components}

Finance is the Spring Modulith module `finance`. Only `api` and its sub-package `api.events` are named interfaces. All other packages are internal, and the boundary tests run in CI (ADR-0002).

{{fig:fin-component | Components of the finance module and their neighbours}}

> [!NOTE] The package list, interface names and method names in this section are a proposal.

### Internal packages {#fin-packages}

| Package | Responsibility | Main classes |
| --- | --- | --- |
| `web` | REST controllers, request records, Problem Details mapping | `VoucherController`, `AdvanceController`, `CloseController` |
| `commitment` | Commitments outside procurement, the combined register, POs, carry-over candidates | `Commitment`, `PurchaseOrder`, `CommitmentRegister`, `CarryOverPolicy` |
| `voucher` | Vouchers, evidence, rules, calculation, route, authority, log | `Voucher`, `VoucherCalculator`, `RoutePolicy`, `AuthorityTable`, `EvidenceList` |
| `payment` | GFMIS files, payment batches, certificates, daily payment check, refunds | `GfmisFile`, `PaymentBatch`, `TaxCertificate`, `DailyPaymentCheck`, `Refund` |
| `supplierbank` | Bank accounts, change requests | `SupplierBankAccount`, `BankChange` |
| `advance` | Advances, checks, clearing, demands, ageing | `Advance`, `AdvancePolicy`, `Clearing`, `Demand` |
| `receipt` | Receipts, books, remittances, money classes and deadlines | `Receipt`, `ReceiptBook`, `Remittance`, `RemitPolicy` |
| `cash` | Committee orders, daily cash, key handover | `CashOrder`, `DailyCash` |
| `nonbudget` | Funds, spending plans, treasury withdrawals | `Fund`, `SpendingPlan`, `TreasuryWithdrawal` |
| `reconcile` | Bank statements, book lines, matching, GFMIS reports, payment files, assignments | `BankStatement`, `BookLines`, `BankReconciliation`, `PaymentFileMatch`, `GfmisAssignment` |
| `closing` | Day and month close, year-end list, the period guard | `Period`, `DayClose`, `CloseChecks`, `PeriodGuard` |
| `auditquery` | Audit queries from the national audit office | `AuditQuery` |
| `clocks` | The clock list, reminders and escalation | `ClockCatalogue`, `ClockSweep` |
| `settings` | Legal rule sets, tenant settings, the authority table | `FinanceRuleSet`, `FinanceSetting` |
| `reporting` | KPIs, forecasts, what-if, signals, the feed to Budget | `KpiCatalogue`, `ForecastEngine`, `SignalDetector` |
| `assistant` | Agents AG-18 to AG-22 and the tool register | `FinanceToolRegister` |
| `gfmis`, `bankfile` | Ports and adapters to external systems | `GfmisGateway`, `BankFileGateway`, `FileMapping` |

### Published interfaces {#fin-published}

These answer the requests in the Procurement, Projects and Review chapters.

| Interface | Used by | Purpose | Requirements |
| --- | --- | --- | --- |
| `FinanceFacts` (SPI declared in `procurement.api`) | `procurement` | `purchaseOrderRecorded(contractId)`, `paymentStarted(contractId, phaseNo)` | FIN-FR-015, FIN-IR-002 |
| `BankChangeIntake` (SPI declared in `procurement.api`) | `procurement` | `submit(supplierId, sealedRequest)` from the portal | FIN-FR-057, PRC-IR-012 |
| `LinePaymentQuery` | `projects` | Other commitments, paid amounts, time of the latest GFMIS data and reconciliation state by line | FIN-IR-011, PRJ-IR-003 |
| `PaidFacts`, `KpiSource`, `ForecastSource`, `SignalSource` | `review` | Payments per line and contract, KPI-F values, forecasts, signals | FIN-IR-011, REV-IR-002 |
| Events in `api.events` | Any module, and RabbitMQ through the outbox | The event catalogue in the interface section | ADR-0008 |

The Procurement chapter now leaves other commitments out of `FinanceFacts`. Finance posts those to `LineLedger`, so room already includes them (DG-FIN-01).

### Dependencies on other modules {#fin-dependencies}

| Module | Interface needed | Used for | Requirements |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `SodGuard` | Tenant binding, authority, acting on behalf, duty checks | PLT-FR-039, FIN-NFR-002 |
| `platform` | `AuditLog`, `Notifier`, `WorkItems`, `WorkingCalendar`, `FiscalCalendar` | Audit, notices, tasks, day counts | FIN-NFR-001, BR-PLT-22 |
| `platform` | `DocumentService`, `FileStore`, `FieldCrypto`, `RetentionRegistry`, `AiGateway`, `SearchIndexer` | Certificates, files, encryption, retention, AI, search | ADR-0010, ADR-0011, ADR-0013, ADR-0016 |
| `platform` | `SubjectDirectory`, `UnitDirectory` | Borrower and member names | PLT-FR-093 |
| `budget` | `LineLedger` | Read a line, room, reserve, release, commit, adjust a commitment, `recordCommitment`, `recordPayment`, `recordDisbursement` | FIN-IR-004, BGT-IR-001 |
| `budget` | `CarryOverIntake` (requested) | Propose and withdraw a carry-over, read its state | FIN-FR-128, FIN-FR-129 |
| `procurement.api` | `AcceptedPhaseQuery`, `PaymentGate`, `PhasePayment` | Waiting phases, gate, payment state | FIN-IR-001, FIN-IR-003 |
| `procurement.api` | `ContractLookup`, `SupplierDirectory` | Contract summary, supplier identity and status | FIN-FR-008, PRC-IR-012 |

> [!OPEN] The Budget SDS confirms `LineLedger`, and confirms that Finance imports GFMIS and writes disbursement through it. `CarryOverIntake` is still a request: the Budget author must name the call behind `CarryOver.file`. BGT-IR-005 in the Budget SRS now places the import in Finance, and Budget reads the result (DG-FIN-02).

## Domain model {#fin-domain}

<!-- covers: TRR 36; TRR 59; TRR 65; TRR 100; TRR 101 -->

The domain classes are plain Java with no Spring or JPA imports. Each command loads one aggregate, calls a method that checks its rules, and saves.

{{fig:fin-class | Finance aggregates and their parts}}

> [!NOTE] The aggregates, class names and error codes in this section are a proposal.

### Aggregates and invariants {#fin-aggregates}

| Aggregate | Parts | Invariants held |
| --- | --- | --- |
| `Commitment` | PO, PO history, releases | Paid plus released never passes the amount; amount, line, kind and payee lock at first use; cancelled only with no hold |
| `Voucher` | Evidence, log, gate snapshot, certificate, refunds | One live voucher per contract phase; approved figures never change; rejected and cancelled are final; the approver differs from maker and checker |
| `GfmisFile`, `PaymentBatch` | Rows and results | A row leaves only before its result; a recorded result never changes (BR-FIN-12) |
| `BankChange` | Encrypted account, evidence reference | Decided once; the decider is not the requester |
| `SupplierBankAccount` | None | One account in force per supplier; earlier ones are kept with an end time |
| `Advance` | Items, loan contract, clearing, objection, demand | One open advance per borrower; approved amount within the request; demand date within the limit |
| `Receipt` | None | Number unique in its book; never edited; cancelled whole and only before remittance |
| `ReceiptBook` | Void range | Numbers run in order; a voided tail is never issued |
| `Remittance` | Rows | One type of money; every row recorded in GFMIS; reversed only before the GFMIS report |
| `CashOrder` | Members, substitutes | At least 2 members; the latest order started by a date applies |
| `DailyCash` | Counts, recounts, late reason | One per date; system figures fixed at preparation; a recount keeps earlier counts |
| `Fund`, `SpendingPlan`, `TreasuryWithdrawal` | Lines, versions, amendment | One plan per fund and year; an amendment never replaces the approved plan before it is approved; a line never falls below its use |
| `BankStatement`, `BankReconciliation` | Lines, adjustments | Signed only at zero difference; a reopening keeps the earlier signature |
| `GfmisAssignment` | None | At least one duty; revoked, never deleted |
| `Period`, `DayClose` | Check results, log | Closed by the head of finance; reopened by someone else |
| `AuditQuery` | Further explanations | Due date set from the day received; an answer never changes |

### Value objects and enumerations {#fin-values}

| Type | Values | Notes |
| --- | --- | --- |
| `Money` | `BigDecimal` with currency baht, 2 decimal places | XC-DAT-004, FIN-DR-001, OI-FIN-16 |
| `VoucherType` | `proc`, `service`, `utility`, `travel`, `comp`, `refund` | `proc` is created from a phase only |
| `VoucherState` | `DRAFT`, `RETURNED`, `CHECK`, `APPROVE`, `READY`, `NB_READY`, `POSTED`, `PAID`, `REJECTED`, `CANCELLED` | V7 is derived |
| `PayRoute` | `direct`, `agency`, `nb` | From `RoutePolicy` |
| `PayMethod` | `epay`, `cheque`, `cash` | BR-FIN-09 |
| `PayeeKind` | `corp`, `person`, `gov` | BR-FIN-06 |
| `CommitmentKind` | `contract`, `utility`, `rent`, `service`, `travel` | `contract` rows come from Procurement |
| `AdvanceType` | `travel`, `station`, `other` | BR-FIN-18 |
| `MoneyClass` | `revenue`, `nonbudget`, `over`, `old` | BR-FIN-20 |
| `GfmisDuty` | `record`, `approve`, `remit` | FIN-FR-119 |

### Where each business rule is enforced {#fin-rule-map}

The server enforces every rule below, and screens may repeat a check only to help the user (ADR-0006, FIN-CR-003).

| Rule | Subject | Enforced in | Error code |
| --- | --- | --- | --- |
| BR-FIN-01 | No ledger; rejection keeps the approved record | `GfmisResultHandler` | None |
| BR-FIN-02 | Within what is free | `Commitment.free`, `LineLedger.room`, called by `Voucher.send`, `approve` | `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-03 | Hold on send | `Voucher.send`, with a row in `voucher_hold` or `LineLedger.reserve` | `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-04 | PO needed | `PurchaseOrderPolicy`, read by `FinanceFacts` and `RoutePolicy` | `FIN_PO_MISSING` |
| BR-FIN-05 | Route | `RoutePolicy.of` | None, computed |
| BR-FIN-06, BR-FIN-07 | Tax and net | `VoucherCalculator` with `FinanceRuleSet` | None, computed |
| BR-FIN-08 | Gross and penalty from Procurement | `Voucher.fromPhase`, gate snapshot | `FIN_FIELD_LOCKED` |
| BR-FIN-09 | Cheque or cash reason | `Voucher.setMethod` | `FIN_REASON_REQUIRED` |
| BR-FIN-10 | Authority | `AuthorityTable.require`, in `Voucher.approve`, `Advance.approve` | `FIN_AUTHORITY_EXCEEDED` |
| BR-FIN-11 | Duty rules | `SodGuard` in each command, see the security section | `FIN_SOD_BLOCKED` |
| BR-FIN-12 | What left does not change | `GfmisFile`, `PaymentBatch`, `TaxCertificate` | `FIN_STATE_CONFLICT` |
| BR-FIN-13 | Closed period | `PeriodGuard.requireOpen(date)` | `FIN_PERIOD_CLOSED` |
| BR-FIN-14 | Recheck after a change | `Voucher.recall`; clocks read the source event | None |
| BR-FIN-15 | Numbers never reused | `NumberSeries.next`, a row-locked counter | None |
| BR-FIN-16 | Refund points back | `Refund.record`, creating a `Receipt` | `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-17 | Advance checks | `AdvancePolicy.check`, in `Advance.approve` | `FIN_ADVANCE_CHECK_FAILED` |
| BR-FIN-18, BR-FIN-19 | Clear-by and demand dates | `AdvanceDue`, `Demand.issue`, `Demand.moveTo` | `FIN_INVALID_INPUT` |
| BR-FIN-20, BR-FIN-21 | Class and deadline | `RemitPolicy` with `WorkingCalendar` | None, computed |
| BR-FIN-22 | Cash committee | `CashOrder.appoint`, `DailyCash.count` | `FIN_SOD_BLOCKED` |
| BR-FIN-23 | Signed or differs | `DailyCash.count` | None, notifies |
| BR-FIN-24, BR-FIN-25 | Non-budget plan and withdrawal | `SpendingPlan.require`, `TreasuryWithdrawal.request` | `FIN_PLAN_REQUIRED`, `FIN_AMOUNT_EXCEEDED` |
| BR-FIN-26, BR-FIN-27 | Close checks | `CloseChecks`, `DayClose.close`, `Period.close` | `FIN_REASON_REQUIRED` |
| BR-FIN-28 | Zero difference | `BankReconciliation.sign` | `FIN_STATE_CONFLICT` |
| BR-FIN-29 | Carry-over candidate | `CarryOverPolicy.candidates` | None, lists |
| BR-FIN-30 | Confirmed account only | `Voucher.approve` reads the account in force; `SignalDetector` warns | `FIN_NO_ACCOUNT` |
| BR-FIN-31 | AI limits | `FinanceToolRegister`, which holds no approve, pay, close or amount tool | `FIN_AI_NOT_ALLOWED` |

### Limits in code and tenant settings {#fin-limits}

`FinanceRuleSet` is versioned by effective date. The first group below moves out of the prototype's tenant form (FIN-FR-002). Values come from the SRS.

| Item | Where it lives | Value | Rule |
| --- | --- | --- | --- |
| `poMin`, `carryMin`, `remitCash` | `FinanceRuleSet` | 5,000, 100,000, 10,000 baht | BR-FIN-04, BR-FIN-29, BR-FIN-21 |
| `whtMin`, `whtPct`, VAT | `FinanceRuleSet`, level B or open | 10,000 baht, 1 percent, 7 percent | BR-FIN-06, BR-FIN-07, OI-FIN-05 |
| `reqDays`, `monthlyDay`, `advTravel`, `advOther`, `advFix`, `demandDays`, `remitDays`, `refundDays`, `aqDays` | `FinanceRuleSet` | As the clocks table | BR-FIN-18 to BR-FIN-21 |
| Advance limits of 90, 90 and 30 days | `FinanceRuleSet` | As BR-FIN-17 | BR-FIN-17 |
| `carryBy` | Yearly entry from the Comptroller General's notice | Date per year | BR-FIN-29 |
| Authority rows | `finance_setting`, within the positions the rule set allows | Tenant, from its assignment order | BR-FIN-10 |
| `aheadDays`, travel rates | `finance_setting` | 10 days; per diem 240, hotel 1,500, 4 baht per km, as sample values | FIN-FR-026, FIN-FR-065 |

## States and transitions {#fin-states}

State names are those of the SRS. Each transition is a method on the aggregate, which checks a transition table, runs the guards and adds a log row.

### Voucher {#fin-state-voucher}

{{fig:fin-state-voucher | States of a voucher}}

| From | To | Command | Guard | Effect |
| --- | --- | --- | --- | --- |
| (none) | DRAFT | `Voucher.fromPhase`, `create` | Gate pass or release for a phase; form rules | Number issued; `PhasePayment.started` for a phase |
| DRAFT, RETURNED | CHECK | `send` | Rules pass; free amount | Hold created; `voucher.sent` |
| CHECK, APPROVE | DRAFT | `recall` | Maker; reason | Checker and approver cleared; hold released |
| CHECK | APPROVE | `pass` | P-F05; evidence complete; rules pass | Checker stored |
| CHECK, APPROVE | RETURNED | `returnTo` | Reason | Third return notifies the head of finance; hold released |
| APPROVE | READY, NB_READY | `approve` | SD-11, SD-04, `AuthorityTable`, rules, account in force, `PeriodGuard` | Figures frozen; `recordPayment` on the ledger; `PhasePayment.approved` |
| APPROVE | REJECTED | `reject` | Reason | Final; hold released; `PhasePayment.rejected` frees the phase |
| DRAFT, RETURNED | CANCELLED | `cancel` | Maker; reason | Final; `PhasePayment.rejected` for a phase |
| CHECK, APPROVE, READY, NB_READY | CANCELLED | `headCancel` | Head of finance; not in a file; reason | Payment reversed on the ledger and in Procurement; advance link cleared |
| READY | POSTED | `markPosted` | Result from GFMIS | GFMIS document stored |
| POSTED | READY | `paymentFailed` | Result from GFMIS | Leaves the file; task for the officer |
| POSTED, NB_READY | PAID | `markPaid` | Payment result, batch result, or cheque or cash record | Certificate issued; commitment paid updated |

> [!NOTE] `PhasePayment.rejected` on a rejected voucher fixes the prototype's stuck phase (OI-FIN-10). The gate snapshot carries the release, so `EvidenceList` treats released checks as passed (OI-FIN-09, FIN-FR-021).

### Advance {#fin-state-advance}

{{fig:fin-state-advance | States of an advance}}

| From | To | Command | Guard |
| --- | --- | --- | --- |
| (none) | request | `Advance.request` | Items, purpose, dates; loan contract numbered |
| request | approved | `approve` | SD-12, `AdvancePolicy`, `AuthorityTable`; a lower amount needs a reason |
| request | rejected | `reject` | Reason |
| request, approved | cancelled | `cancel` | Reason; not yet paid |
| approved | paid | `pay` | SD-12; the clock starts |
| paid, objected | clearing | `sendClearing` | Amount spent; return date not before the start for travel |
| clearing | paid, objected | `takeBack` | Borrower; reason |
| clearing | objected | `object` | SD-12; reason; fix-by date set |
| clearing | cleared | `accept` | SD-12; evidence receipt issued; top-up voucher or cash back recorded; demand closed |

### Bank change {#fin-state-bank}

{{fig:fin-state-bank | States of a supplier bank change}}

`BankChange.confirm` and `refuse` both run SD-14. Confirmation ends the account in force and starts the new one in one transaction.

### Period {#fin-state-period}

{{fig:fin-state-period | States of an accounting period}}

The design's P2 closing state is the time the checks are failing, so no state is stored for it. Each close stores the check results and any reason. `Period.reopen` runs SD-16 for a head of finance or the authorised approver.

### Other records {#fin-state-others}

| Record | States | Enforced in | Note |
| --- | --- | --- | --- |
| `DailyCash` | counting, signed, diff | `DailyCash` | A recount returns to counting |
| `GfmisFile` | sent, posted, done, cancelled | `GfmisFile` | Cancelled only before any result |
| `PaymentBatch` | sent, done | `PaymentBatch` | A bank return leaves the voucher unpaid |
| `SpendingPlan` | draft, submitted, approved, returned | `SpendingPlan` | An amendment is a child with the same states |
| `TreasuryWithdrawal` | pending, done, rejected, back | `TreasuryWithdrawal` | SD-11 on the decider |
| `BankReconciliation` | signed, reopened | `BankReconciliation` | Unsigned has no row |
| `Remittance`, `AuditQuery` | Derived, as in the SRS | Read models | - |

## Dynamic behaviour {#fin-dynamic}

<!-- covers: PPR 162; PPR 175; TRR 12; TRR 20; TRR 28; TRR 43; TRR 81; TRR 92; TRR 108 -->

### From voucher to reconciliation {#fin-activity}

{{fig:fin-activity-voucher | From voucher to reconciliation}}

### Acceptance to payment request {#fin-seq-accept}

This continues the Procurement sequence. Procurement owns everything up to the gate, and Finance owns the voucher and every state after it.

{{fig:fin-seq-accept-pay | From an accepted phase to the voucher and its approval}}

- `AcceptedPhaseQuery` lists accepted phases with no live payment. `FinanceFacts.paymentStarted` answers from `voucher`, so a rejected or cancelled voucher frees the phase.
- `PaymentGate.evaluate` asks `FinanceFacts.purchaseOrderRecorded`, and finance answers from `commitment`. No PO gives `PRC_GATE_PO_MISSING`, which cannot be released (FIN-FR-015).
- A held phase stays in Procurement. The head of procurement or the approver releases it there, and Finance tries again (FIN-FR-020).
- `Voucher.fromPhase` stores the gate snapshot: accepted amount, net penalty, checks and release. Gross and penalty are locked (BR-FIN-08).
- Penalties flow one way. A waiver changes the penalty in Procurement until `PhasePayment.started`, which then refuses a waiver (PRC-FR-126). If the voucher is rejected or cancelled, the phase is free and the next voucher reads the current penalty.
- Tax is worked out from the whole order, using `ContractLookup`. Tax and penalty are carried on the voucher as state revenue to match (BR-FIN-08).
- Approval runs in one transaction: duty rules, authority, ledger `recordPayment`, `PhasePayment.approved`, voucher READY. If a call fails, nothing is saved.

> [!OPEN] The prototype marks a phase Paid at approval, before money moves, and this design keeps that so `PhasePayment` stays as written. The event `voucher.paid` carries the real payment. The product owner and the Procurement owner must decide whether `PhasePayment.approved` should move to payment (DG-FIN-03).

### GFMIS file and results {#fin-seq-gfmis-s}

{{fig:fin-seq-gfmis | The GFMIS request file and its results}}

- `gfOk` becomes `GfmisAssignment.require(duty)`, called on every command that records in GFMIS: files, receipts, results and remittance (FIN-FR-119).
- The file is a delivery in the Integration chapter's sense, with `delivery_id` as its idempotency key. A timeout does not resend blindly (FIN-IR-007).
- A rejection never changes an approved record by itself (BR-FIN-01). The voucher returns to ready and a task opens for the officer.
- A result is a command, so it writes an audit entry and passes `PeriodGuard`.
- Until a port exists, an officer uploads a result file through `FileMapping`, and the states stay the same (DG-XC-20).

### Supplier bank change {#fin-seq-bank}

{{fig:fin-seq-bank-change | A supplier bank change confirmed by a second person}}

- A finance officer requests with evidence, or the portal calls `BankChangeIntake`. Both create one `BankChange` holding the account in `FieldCrypto`.
- A portal request has an external requester, so the confirmer records the contact used to verify it. The way to verify is OI-FIN-13.
- SD-14 refuses the requester on both confirm and refuse, and the attempt is logged in its own transaction.
- Confirmation keeps the earlier account with its end time and raises `supplier-bank.changed`, and the delivery to the Comptroller General's vendor master follows (FIN-FR-061).
- `SignalDetector` raises SG-F03 on the first payment within 30 days. FIN-FR-060 adds a refusal in `Voucher.approve` for the requester of that change.

### Closing {#fin-seq-close}

{{fig:fin-activity-close | Closing the day and the month}}

`CloseChecks` runs the checks of BR-FIN-26 and BR-FIN-27 and stores each result on the close, so the evidence stays after later changes. Hard stops wait for OI-FIN-07.

### Carry-over {#fin-seq-carry}

`CarryOverPolicy` lists candidates from the register. A finance officer proposes one through `CarryOverIntake`, Budget runs its own checks (BR-BGT-32) and the executive decides there. Finance shows the state and may withdraw a waiting request with a reason. An approved carry-over keeps paying against the carried line that Budget creates (BGT-FR-130).

### Scheduled work {#fin-jobs}

Jobs run per cell, tenant by tenant, with the tenant bound as for a web request. Each is safe to run twice.

| Job | Does | Requirements |
| --- | --- | --- |
| Clock sweep | Opens `WorkItems` and reminders for each clock, and escalates | FIN-FR-005, FIN-FR-006 |
| Signals | Runs SG-F01 to SG-F07 | FIN-FR-139 |
| Delivery comparison | Compares delivered items with GFMIS reports where a source exists | FIN-IR-007 |
| Projections | Rebuilds KPI and forecast read models | FIN-FR-136, FIN-FR-138 |
| Retention | Applies the schedule to ended records | FIN-DR-007 |

## Data design {#fin-data}

<!-- covers: PDPA 39 -->

Tables live in the schema `finance` of the cell's PostgreSQL cluster (ADR-0005). Other modules never read them. The rules for every table are those of the Procurement chapter: `tenant_id` first in each key, forced row-level security, common columns, separate business numbers and expand-and-contract migrations.

> [!NOTE] Every table, column, type and index in this section is a proposal. The data dictionary chapter will hold the final columns.

{{fig:fin-er | Core spending tables of finance}}

{{fig:fin-er-money | Core tables for receipts, reconciliation and closing}}

### Tables {#fin-data-tables}

Class is the ADR-0013 class of the row as a whole. Retention key names one schedule row in `platform`; no period is stated, because OI-FIN-12 is open.

| Table | Key columns | Class | Retention key | Requirements |
| --- | --- | --- | --- | --- |
| `commitment`, `commitment_release` | `kind`, `line_id`, `name`, `payee`, `amount`, `released`, `paid`, `due_on`, `ledger_ref`; `amount`, `why` | Internal | `fin.commitment` | FIN-FR-008 to FIN-FR-012 |
| `purchase_order`, `purchase_order_history` | `source_type`, `source_id`, `no`, `recorded_at`; `until`, `why` | Internal | `fin.commitment` | FIN-FR-013, FIN-FR-014 |
| `voucher` | `no`, `type`, `state`, `commitment_id`, `contract_id`, `phase_no`, `plan_line_id`, `line_id`, `payee_name`, `payee_kind`, `payee_tax_enc`, `supplier_id`, `bank_account_id`, `gross`, `vat`, `penalty`, `other`, `wht`, `net`, `route`, `method`, `method_why`, `due_on`, `rule_set_version`, `gate_snapshot` (jsonb) | Confidential, tax ID Restricted | `fin.voucher` | FIN-FR-017 to FIN-FR-040 |
| `voucher_evidence`, `voucher_log`, `voucher_hold` | `item`, `ok`, `file_key`; `action`, `actor_ref`, `role`, `note`; `amount`, `ledger_ref` | Confidential | `fin.voucher` | FIN-FR-024, FIN-DR-002, BR-FIN-03 |
| `authority_row`, `voucher_approval` | `level`, `position`, `role`, `max_amount`; `decided_by_ref`, `holder_ref`, `via`, `level` | Internal | `fin.voucher` | FIN-FR-003, FIN-FR-036 |
| `gfmis_file`, `gfmis_file_row` | `no`, `state`, `sent_at`; `posting_result`, `doc_no`, `payment_result`, `why`, `simulated` | Confidential | `fin.gfmis` | FIN-FR-041 to FIN-FR-044 |
| `payment_batch`, `payment_batch_row` | `no`, `state`, `total`; `result`, `why` | Confidential | `fin.gfmis` | FIN-FR-045 |
| `tax_certificate`, `refund` | `voucher_id`, `no`, `base`, `tax`, `sent_at`, `replaces_id`, `cancel_why`; `receipt_id`, `amount`, `in_year` | Confidential | `fin.voucher` | FIN-FR-048 to FIN-FR-051 |
| `daily_payment_check`, `daily_payment_row` | `checked_by_ref`, `at`; `voucher_id`, `ok`, `note` | Internal | `fin.voucher` | FIN-FR-050 |
| `supplier_bank_account`, `bank_change` | `supplier_id`, `bank`, `acct_enc`, `acct_bidx`, `from_at`, `until_at`; `status`, `acct_enc`, `evidence_key`, `source`, `requested_by_ref`, `decided_by_ref`, `verified_contact`, `why` | Restricted | `fin.bank` | FIN-FR-053 to FIN-FR-061 |
| `advance`, `advance_item`, `advance_clearing`, `advance_demand` | `no`, `contract_no`, `borrower_ref`, `unit_id`, `type`, `state`, `start_on`, `end_on`, `returned_on`, `amount`, `approved_amt`, `source`, `line_id`, `plan_line_id`, `collateral_enc`; `kind`, `amount`; `spent`, `sent_at`, `receipt_no`, `cash_back`; `due_on`, `moves` | Confidential | `fin.advance` | FIN-FR-062 to FIN-FR-077 |
| `receipt_book`, `receipt_book_void`, `receipt_book_report` | `no`, `fiscal_year`, `from_no`, `to_no`, `holder_ref`, `returned_on`; `from_no`, `to_no`, `why` | Internal | `fin.receipt` | FIN-FR-082, FIN-FR-083 |
| `receipt` | `book_id`, `n`, `on_date`, `kind`, `payer`, `amount`, `method`, `fund_id`, `gfmis_doc`, `remittance_id`, `cancelled_why`, `replaces_id`, `voucher_id`, `advance_id` | Confidential | `fin.receipt` | FIN-FR-078 to FIN-FR-081 |
| `remittance` | `no`, `cls`, `amount`, `bank_ref`, `late_count`, `gfmis_doc`, `reversed_why` | Internal | `fin.receipt` | FIN-FR-085, FIN-FR-086 |
| `cash_order`, `cash_order_member` | `order_no`, `from_on`, `cancelled_why`; `subject_ref`, `role` | Confidential | `fin.cash` | FIN-FR-087 |
| `daily_cash`, `cash_count`, `key_handover` | `on_date`, `sys_cash`, `sys_cheque`, `sys_by_class`, `status`, `ack_by_ref`, `late_why`; `member_ref`, `round_no`, `cash`, `cheque`; `from_ref`, `to_ref`, `at` | Confidential | `fin.cash` | FIN-FR-088 to FIN-FR-095 |
| `fund`, `spending_plan`, `spending_plan_line`, `treasury_withdrawal` | `no`, `name`, `basis`, `open_agency`, `open_treasury`, `closed_why`; `fund_id`, `fiscal_year`, `status`, `version_no`, `parent_id`; `name`, `cat`, `amount`; `amount`, `status`, `doc_no`, `back_amount` | Internal | `fin.nonbudget` | FIN-FR-096 to FIN-FR-104 |
| `bank_statement`, `bank_line`, `book_adjustment`, `bank_reconciliation` | `acct`, `month`, `opening`, `file_key`, `removed_why`; `ref`, `amount`; `ref`, `reversed_why`; `status`, `diff`, `signed_by_ref`, `log` | Confidential | `fin.recon` | FIN-FR-105 to FIN-FR-110 |
| `gfmis_report`, `trial_balance`, `payment_file`, `payment_file_row` | `kind`, `month`, `file_key`, `replaced_why`; `rows`, `agrees`; `imported_by_ref`, `undone_why`; `voucher_id`, `doc_no`, `amount`, `state`, `note`, `matched_by_ref` | Confidential | `fin.recon` | FIN-FR-111 to FIN-FR-117 |
| `gfmis_assignment` | `subject_ref`, `duties`, `order_no`, `until_on`, `revoked_why` | Internal | `fin.config` | FIN-FR-118 |
| `period`, `day_close`, `close_check` | `month`, `status`, `closed_by_ref`, `why`; `on_date`, `why`; `check_no`, `ok`, `detail` | Internal | `fin.close` | FIN-FR-120 to FIN-FR-124 |
| `audit_query`, `audit_query_note` | `no`, `source`, `subject`, `received_on`, `due_on`, `draft`, `answer`, `answered_by_ref`; `text` | Confidential | `fin.audit` | FIN-FR-130 to FIN-FR-132 |
| `finance_setting`, `number_series`, `number_log` | `key`, `value`, `effective_from`; as in Procurement | Internal | `fin.config` | FIN-FR-001, BR-FIN-15 |
| `agent_run`, `what_if`, `signal_state` | `agent`, `steps`, `status`; `levers`, `result`; `signal_key`, `status`, `note` | Confidential | `fin.ai` | FIN-FR-133 to FIN-FR-139 |
| `outbox_event`, `inbox_event`, `delivery` | As in the Integration chapter | Internal | Short, set with the platform | ADR-0008 |

### Personal and restricted fields {#fin-data-fields}

This table feeds the data dictionary and the records of processing (ADR-0014, PDPA 39, FIN-DR-005). The data protection officer confirms the legal basis of each field.

| Field | Class | Protection | Rule |
| --- | --- | --- | --- |
| `supplier_bank_account.acct_enc`, `bank_change.acct_enc` | Restricted | AES-256-GCM field encryption through Tink, per-tenant keys, logged reveal | Masked on every screen and export (XC-SEC-026) |
| `supplier_bank_account.acct_bidx` | Restricted | Keyed blind index with its own key | Exact match only, to find the same account on two suppliers |
| `voucher.payee_tax_enc` | Restricted | As above | A person's tax ID stays masked outside finance roles |
| `advance.collateral_enc` | Confidential | Encrypted storage, role-based access | May name a guarantor |
| `*_ref` columns | Confidential | Pseudonymous reference | Reports show a placeholder after erasure (ADR-0015) |
| Evidence files | Possibly Restricted | ClamAV scan, per-tenant keys, not indexed | May hold an ID or a bank account |

### Files, search and retention {#fin-data-files}

- Evidence, statements, GFMIS files and signed reports are objects in S3 API storage, linked by `file_key` (FIN-DR-004, ADR-0010). A sent GFMIS file is kept as evidence of what left the system.
- OpenSearch indexes vouchers, advances and receipts by number and payee name. Restricted data is never indexed (ADR-0009).
- Financial records that law requires to be kept cannot be deleted early, and `finance` implements `RetentionHold` so an erasure request sees the reason (ADR-0014).

## Interface design {#fin-interfaces}

The REST API is described in OpenAPI 3.1 and the events in AsyncAPI, under the same rules as the Procurement chapter: the tenant comes from the token, and state changes carry `If-Match`.

### REST endpoints {#fin-rest}

> [!NOTE] This endpoint list is a proposal. Paths are relative to `/api/v1/finance`.

| Method and path | Purpose | Authority | Requirements |
| --- | --- | --- | --- |
| `GET /clocks`; `GET /overview` | F1 clocks and figures | `fin.read` | FIN-FR-004, FIN-FR-007 |
| `GET, POST /commitments`; `GET, PUT, DELETE /commitments/{id}`; `POST /commitments/{id}/release, cancel` | Commitments | `fin.commit` | FIN-FR-008 to FIN-FR-012 |
| `PUT, DELETE /commitments/{id}/purchase-order`; `PUT, DELETE /contracts/{id}/purchase-order` | Record, correct and clear a PO | `fin.commit` | FIN-FR-013, FIN-FR-014 |
| `GET /carry-over/candidates`; `POST /carry-over`; `POST /carry-over/{id}/withdraw` | Carry-over | `fin.commit` | FIN-FR-127 to FIN-FR-129 |
| `GET /phases/waiting`; `POST /vouchers/from-phase` | Accepted phases to voucher | `fin.voucher.write` | FIN-FR-017 to FIN-FR-021 |
| `GET, POST /vouchers`; `GET, PUT /vouchers/{id}` | Voucher records and list | `fin.voucher.write` | FIN-FR-022 to FIN-FR-029, FIN-FR-040 |
| `POST /vouchers/{id}/send, recall, cancel` | Maker actions | `fin.voucher.write` | FIN-FR-030, FIN-FR-031, FIN-FR-035 |
| `PUT /vouchers/{id}/evidence`; `POST /vouchers/{id}/pass, return` | Checker actions | `fin.voucher.check` | FIN-FR-024, FIN-FR-032, FIN-FR-033 |
| `POST /vouchers/{id}/approve, reject, return` | Approver actions | `fin.approve` | FIN-FR-034, FIN-FR-036 to FIN-FR-039 |
| `POST /vouchers/{id}/head-cancel` | Head cancels | `fin.head` | FIN-FR-035 |
| `POST, GET /gfmis-files`; `POST /gfmis-files/{id}/remove-row, cancel, results` | Request files and results | `fin.pay` | FIN-FR-041 to FIN-FR-044 |
| `POST, GET /payment-batches`; `POST /payment-batches/{id}/results`; `POST /vouchers/{id}/record-payment` | Agency payments | `fin.pay` | FIN-FR-045, FIN-FR-046 |
| `POST /vouchers/{id}/certificate/send, reissue`; `POST /vouchers/{id}/refunds` | Certificates and refunds | `fin.pay` | FIN-FR-048, FIN-FR-049, FIN-FR-051 |
| `GET, POST /daily-payment-check` | Daily check | `fin.head` | FIN-FR-050 |
| `GET, POST /bank-changes`; `PUT /bank-changes/{id}`; `POST /bank-changes/{id}/withdraw, confirm, refuse, reveal` | Bank changes | `fin.bank.request`, `fin.bank.confirm` | FIN-FR-053 to FIN-FR-058 |
| `GET, POST /advances`; `PUT /advances/{id}`; `POST /advances/{id}/cancel, clearing, take-back` | Borrower actions, own records | `fin.adv.self` | FIN-FR-062, FIN-FR-064, FIN-FR-069, FIN-FR-071 |
| `POST /advances/{id}/approve, reject` | Approver actions | `fin.approve` | FIN-FR-066 to FIN-FR-069 |
| `POST /advances/{id}/pay, object, accept` | Finance actions | `fin.adv.manage` | FIN-FR-070, FIN-FR-072 to FIN-FR-074 |
| `POST /advances/{id}/demand, demand/move, report`; `GET /advances/register` | Demands and register | `fin.head`, `fin.read` | FIN-FR-075 to FIN-FR-077 |
| `GET, POST /receipts`; `POST /receipts/{id}/record, cancel` | Receipts | `fin.receipt` | FIN-FR-078 to FIN-FR-081 |
| `GET, POST /receipt-books`; `PUT /receipt-books/{id}`; `POST /receipt-books/{id}/void, return`; `POST /receipt-books/report` | Books | `fin.head`, `fin.receipt` | FIN-FR-082, FIN-FR-083 |
| `GET, POST /remittances`; `PUT /remittances/{id}`; `POST /remittances/{id}/reverse` | Remittance | `fin.remit` | FIN-FR-084 to FIN-FR-086 |
| `GET, POST /cash-orders`; `POST /cash-orders/{id}/cancel` | Committee orders | `fin.head` | FIN-FR-087 |
| `GET, POST /daily-cash`; `POST /daily-cash/{date}/count, recount, acknowledge` | Daily cash | `fin.cash`, `fin.cash.count`, `fin.head`, `fin.approve` | FIN-FR-088 to FIN-FR-094 |
| `GET, POST /funds`; `PUT, DELETE /funds/{id}`; `POST /funds/{id}/close` | Funds | `fin.nb.write` | FIN-FR-096, FIN-FR-097 |
| `GET, POST /spending-plans`; `PUT /spending-plans/{id}`; `POST /spending-plans/{id}/send, withdraw, amend, approve, return` | Plans | `fin.nb.write`, `fin.approve` | FIN-FR-098 to FIN-FR-100 |
| `GET, POST /treasury-withdrawals`; `PUT /treasury-withdrawals/{id}`; `POST /treasury-withdrawals/{id}/approve, reject, deposit-back` | Withdrawals | `fin.nb.write`, `fin.approve` | FIN-FR-102, FIN-FR-103 |
| `POST /bank-statements`; `DELETE /bank-statements/{id}`; `POST /bank-statements/{id}/adjustments`; `DELETE /adjustments/{id}` | Statements | `fin.recon` | FIN-FR-105 to FIN-FR-108 |
| `POST /bank-reconciliations/{acct}/{month}/sign, reopen` | Reconciliation | `fin.recon.sign` | FIN-FR-109, FIN-FR-110 |
| `POST /gfmis-reports`; `POST /payment-files`; `POST /payment-files/{id}/undo, rows/{n}/match`; `POST /payments/{id}/explain` | GFMIS reports and payment files | `fin.recon` | FIN-FR-111 to FIN-FR-117 |
| `GET, POST /gfmis-assignments`; `PUT /gfmis-assignments/{id}`; `POST /gfmis-assignments/{id}/revoke` | Assignments | `fin.head` | FIN-FR-118 |
| `GET /close/day`; `POST /close/day, day/reopen`; `GET /periods/{month}`; `POST /periods/{month}/review-advances, close, reopen`; `GET /close/year` | Closing | `fin.head`, `fin.approve` | FIN-FR-120 to FIN-FR-125 |
| `GET, POST /audit-queries`; `PUT, DELETE /audit-queries/{id}`; `POST /audit-queries/{id}/answer, note` | Audit queries | `fin.head` | FIN-FR-130 to FIN-FR-132 |
| `GET /kpis, forecasts, signals`; `POST /what-ifs`; `POST /signals/{key}/decide`; `POST /agents/{agent}/runs`; `POST /agent-runs/{id}/stop, steps/{n}/approve` | Analytics and agents | `fin.ai`, plus the authority of the action | FIN-FR-133 to FIN-FR-139 |
| `GET, PUT /settings` | Tenant settings | `fin.admin` | FIN-FR-001, FIN-FR-003 |

### Error catalogue {#fin-errors}

> [!NOTE] These codes are a proposal. Errors are Problem Details with a `code` field. Text is in the user's language.

| Code | HTTP | Meaning | Rule or requirement |
| --- | --- | --- | --- |
| `FIN_INVALID_INPUT` | 400 | A field fails validation | FIN-FR-023 |
| `FIN_REASON_REQUIRED` | 400 | A reason is missing or too short | BR-PLT-18, BR-FIN-09 |
| `FIN_FORBIDDEN` | 403 | The user lacks the authority | ADR-0006 |
| `FIN_SOD_BLOCKED` | 403 | A duty rule refuses this person, and the attempt is logged | BR-FIN-11 |
| `FIN_AUTHORITY_EXCEEDED` | 403 | The amount is above the approver's level | BR-FIN-10 |
| `FIN_NO_ASSIGNMENT` | 403 | No written GFMIS assignment for this duty | FIN-FR-119 |
| `FIN_AI_NOT_ALLOWED` | 403 | The tool is off, or outside the AI limits | BR-FIN-31 |
| `FIN_NOT_FOUND` | 404 | The record does not exist or belongs to another tenant | ADR-0005 |
| `FIN_VERSION_CONFLICT` | 409 | The record changed since it was read | ADR-0005 |
| `FIN_STATE_CONFLICT` | 409 | The action does not apply to the current state | FIN-CR-003, BR-FIN-12 |
| `FIN_PERIOD_CLOSED` | 409 | The date falls in a closed period | BR-FIN-13 |
| `FIN_AMOUNT_EXCEEDED` | 409 | More than what is free | BR-FIN-02, BR-FIN-16 |
| `FIN_FIELD_LOCKED` | 409 | The field comes from another module or has locked | BR-FIN-08, FIN-FR-010 |
| `FIN_PO_MISSING` | 409 | A needed GFMIS purchase order is missing | BR-FIN-04 |
| `FIN_NO_ACCOUNT` | 409 | The payee has no confirmed bank account | BR-FIN-30 |
| `FIN_ADVANCE_CHECK_FAILED` | 409 | A check of BR-FIN-17 failed, named in the body | BR-FIN-17 |
| `FIN_PLAN_REQUIRED` | 409 | No approved plan line | BR-FIN-24 |
| `FIN_SETTING_OUT_OF_RANGE` | 422 | A setting is outside its range | FIN-FR-002 |
| `FIN_IMPORT_INVALID` | 422 | A file cannot be read with its mapping | FIN-IR-008 |

### Event catalogue {#fin-events}

> [!NOTE] This event list is a proposal. Routing keys start with `finance.`. Every event carries `eventId`, `tenantId`, `occurredAt` and `aggregateId`, and payloads hold references and amounts, never personal data.

| Event | Raised by | Extra fields | Consumers |
| --- | --- | --- | --- |
| `commitment.changed` | `Commitment` | `lineId`, `amount` | `projects`, `reporting` |
| `purchase-order.recorded` | `PurchaseOrder` | `sourceId` | `reporting` |
| `voucher.sent`, `voucher.approved`, `voucher.rejected`, `voucher.cancelled` | `Voucher` | `lineId`, `contractId`, `phaseNo`, `spend` | `reporting`, notifications |
| `voucher.paid` | `Voucher.markPaid` | `lineId`, `contractId`, `phaseNo`, `spend`, `paidOn` | `projects`, `review`, `budget` |
| `gfmis-file.created` | `GfmisFile` | `rows` | `gfmis` adapter |
| `gfmis-report.imported` | `reconcile` | `kind`, `month` | `projects`, `reporting` |
| `supplier-bank.changed` | `BankChange.confirm` | `supplierId` | Vendor master adapter, signals |
| `advance.paid`, `advance.cleared`, `advance.overdue` | `Advance`, clock sweep | `lineId`, `amount` | `reporting`, notifications |
| `remittance.made` | `Remittance` | `cls`, `amount`, `late` | `reporting` |
| `cash.differs` | `DailyCash` | `onDate` | Notifications |
| `period.closed`, `period.reopened` | `Period` | `month` | Notifications, `reporting` |
| `settings.changed` | `settings` | `key`, `effectiveFrom` | Notifications to the auditor |

### External adapters {#fin-adapters}

Adapters run on the outbox path, retry safely and show their state, as the Integration chapter sets out. Simulation controls do not exist in a production tenant (FIN-NFR-003).

| Adapter | Port | First implementation | Behaviour | Requirements |
| --- | --- | --- | --- | --- |
| GFMIS requests and POs | `GfmisGateway` | File by an officer, until a contract exists | Takes an entry and returns a reference or a rejection | FIN-IR-006 |
| GFMIS results and reports | `GfmisGateway` | File upload with `FileMapping` | The same file gives the same data, by `file_hash` | FIN-IR-008 |
| Bank statements | `BankFileGateway` | File upload with `FileMapping` | Per bank layout | FIN-FR-105 |
| e-Payment | `BankFileGateway` | Bank file, per bank | A timeout does not resend blindly | FIN-IR-009 |
| Vendor master | `VendorMasterPort` | Open | Sent after confirmation | FIN-FR-061 |
| HR payroll file | `PayrollFileSource` | File upload | Monthly total only | FIN-IR-010 |

> [!OPEN] GFMIS and bank contracts are unknown. The Comptroller General's Department and each bank must supply them (OI-FIN-02, OI-FIN-03, DG-XC-20). `FileMapping` holds layouts as configuration, so a first tenant can start from its own sample files (D-FN-07).

## Security design {#fin-security}

<!-- covers: PDPA 39; PDPA 40 -->

The rules of the Platform and cross-cutting chapters apply. Finance and payment functions sit at OWASP ASVS Level 3 (XC-SEC-002, ADR-0017), and that covers the bank change path as well as approval.

### Authorities {#fin-authorities}

> [!NOTE] The authority names are a proposal. Roles map to authorities as tenant data.

| Authority | Default roles | Allows |
| --- | --- | --- |
| `fin.read` | Finance roles, approver, planning, auditor | Read Finance records the role may see |
| `fin.commit` | Finance officer | Commitments, POs, carry-over |
| `fin.voucher.write` | Finance officer | Make and change vouchers |
| `fin.voucher.check` | Finance officer, head of finance | Check evidence |
| `fin.approve` | Authorised approver by delegation, head of finance within A3 | Approve vouchers; advances, plans and withdrawals for the approver only |
| `fin.pay`, `fin.remit`, `fin.receipt` | Finance officer; `fin.remit` also the head of finance | GFMIS files, payments, receipts, remittance |
| `fin.bank.request`, `fin.bank.confirm` | Finance officer; finance officer and head of finance | Ask for and decide bank changes |
| `fin.adv.self` | Every user, own records | Ask for and clear advances |
| `fin.adv.manage` | Finance officer, head of finance | Pay and check advances |
| `fin.cash`, `fin.cash.count` | Finance officer; members of the order in force, checked per day | Prepare the report; count |
| `fin.nb.write` | Finance officer, head of finance | Funds, plans, withdrawals |
| `fin.recon`, `fin.recon.sign` | Finance officer; finance roles, under SD-15 | Reconcile; sign |
| `fin.head` | Head of finance | Registers, demands, daily check, closing, audit queries, head cancel |
| `fin.admin` | Administrator | Tenant settings |
| `fin.ai` | Roles the tenant allows, only when the tool is on | Agents and analytics |

### Separation-of-duties checks {#fin-sod}

`SodGuard.check` runs inside the command, after the authority check and before any state change, and a refusal is logged in its own transaction. The rules are those of the Platform register.

| Rule | Command | Actors | Compared with | Requirements |
| --- | --- | --- | --- | --- |
| P-F05 | `Voucher.pass` | Checker | Maker | FIN-FR-032 |
| SD-11 | `Voucher.approve`, `SpendingPlan.approve`, `TreasuryWithdrawal.decide` | Approver and delegator | Maker and checker, or proposer | FIN-FR-037, FIN-FR-099, FIN-FR-102 |
| SD-04 | `Voucher.approve` | Approver and delegator | Acceptance members and signers | FIN-FR-037 |
| SD-05 | `PaymentFile.import`, `match`, `Payment.explain` | Reconciler | Approver and the holder of the authority | FIN-FR-115, FIN-FR-116 |
| SD-12 | `Advance.approve`, `pay`, `object`, `accept` | Approver and delegator, or Finance | Borrower | FIN-FR-067, FIN-FR-070, FIN-FR-073 |
| SD-13 | `DailyCash.count` | Member | Who received or paid that day | FIN-FR-090 |
| SD-14 | `BankChange.confirm`, `refuse` | Decider | Requester | FIN-FR-054, FIN-FR-060 |
| SD-15 | `BankReconciliation.sign` | Signer | Who recorded money that month | FIN-FR-109 |
| SD-16 | `Period.reopen`, `DayClose.reopen`, `BankReconciliation.reopen` | Reopener | Closer or signer | FIN-FR-110, FIN-FR-121, FIN-FR-123 |

SD-03 has no command here, because SD-11 and P-F05 cover it (OI-FIN-11). The prototype checks some rules with the person alone, and production passes the `ActorSet` to every rule, so a delegate never escapes one.

### Bank accounts {#fin-bank-security}

- An account number is entered once, encrypted on arrival, and never returned in a list. `reveal` returns the number to `fin.bank.confirm` only, writes an audit entry, and is limited per user by the cross-cutting rule.
- A voucher stores `bank_account_id`, so a later change never redirects an approved payment.
- The duty rule, the reveal log and SG-F03 together form the control, and the auditor is told of every change.

> [!OPEN] A person with both the confirm authority and control of the supplier's contact could still confirm a false change. The security reviewer and the finance specialist must decide how a portal request is verified (OI-FIN-13, DG-FIN-05).

### Audit {#fin-audit}

- Every listed action writes an entry through `AuditLog` by the `CommandAudit` aspect, in the same transaction (FIN-NFR-001, FIN-CR-005).
- Reasons stay in the business record, and the entry points to it (ADR-0015).
- A reveal of a Restricted field and every block by a duty rule are logged.

### AI controls {#fin-ai-security}

- All AI calls pass through `AiGateway`, off by default, and every feature works with AI off (ADR-0016, FIN-FR-140).
- `FinanceToolRegister` is a closed list per agent, with no tool to approve, pay, close or change an amount (BR-FIN-31).
- A write step stops for a person and runs the normal command, so authority and duty rules apply to that person.
- Account numbers and tax IDs are never sent to a model.

## Non-functional design {#fin-nfr}

| Requirement | Design answer | Verified by |
| --- | --- | --- |
| FIN-NFR-001 | `CommandAudit` aspect on every command | Integration test per command |
| FIN-NFR-002 | `SodGuard` logging in its own transaction | `SodRefusalIT` |
| FIN-NFR-003 | No simulation code in production; the labelled test adapter ships only in test profiles | Build check |
| FIN-NFR-004 | Pure calculators with exact decimals | Table-driven unit tests |
| FIN-NFR-005 | Message files in both languages; Thai document templates | Playwright in both languages |
| FIN-NFR-006 | Seeded `ForecastEngine` on projections | Repeat-run test |

### Load and availability {#fin-nfr-load}

- Time and volume targets are those of the cross-cutting chapter. Finance peaks at the end of September and at each month end, and k6 scripts cover voucher approval, file creation and closing at that peak (ADR-0017).
- `LineLedger` is the expected contention point, so a transaction holds it only for the ledger call and the commit.
- An adapter failure leaves items waiting with their state shown, and no command waits on GFMIS or a bank (ADR-0008).

## Test design {#fin-tests}

The sweep runs inside the prototype page and cannot test a server. Its walks are the best statement of intended behaviour, so each one becomes a production test.

> [!NOTE] The test class names are a proposal.

### Test levels {#fin-test-levels}

| Level | Tool | Covers |
| --- | --- | --- |
| Unit | JUnit | State tables for every pair of states, `VoucherCalculator`, `RoutePolicy`, `AuthorityTable`, `AdvancePolicy`, `RemitPolicy`, `CloseChecks` |
| Architecture | Spring Modulith `verify`, ArchUnit | Boundaries, no cycle with `procurement`, no framework in the domain |
| Integration | JUnit with Testcontainers | Commands through REST, row-level security, outbox, field encryption |
| Module scenario | Spring Modulith `Scenario` | Finance with `procurement` and `budget` in one transaction |
| End to end | Playwright | Each role's journey in both languages |
| Load | k6 | Year-end and month-end peaks |
| Security | OWASP ZAP, SonarQube, penetration test | ASVS Level 3 on payment paths |

### From sweep walks to production tests {#fin-test-walks}

| Sweep check | Production test | Added beyond the walk | Requirements |
| --- | --- | --- | --- |
| FC1 walk | `RegistersIT`, `BankChangeIT` | Reveal log, SD-14 refusal with a log row, encrypted at rest | FIN-FR-053 to FIN-FR-056, FIN-FR-082, FIN-FR-087, FIN-FR-118 |
| FC2 walk | `VoucherFlowIT`, `AuthorityTableTest` | Rule-set version stored, SD-04 refusal, rejected voucher frees the phase | FIN-FR-022 to FIN-FR-037 |
| FC3 walk | `GfmisFileIT`, `PaymentBatchIT`, `RefundIT` | Delivery states, no double send, assignment refusal | FIN-FR-041 to FIN-FR-051 |
| FC4 walk | `CommitmentIT`, `AdvanceFlowIT` | Ledger failure rolls back, authority on advances | FIN-FR-009 to FIN-FR-014, FIN-FR-062 to FIN-FR-071, FIN-FR-128 |
| FC5 walk | `ReceiptIT`, `RemittanceIT`, `ReconciliationIT`, `AuditQueryIT` | Closed-period refusal on each command | FIN-FR-078 to FIN-FR-086, FIN-FR-107 to FIN-FR-110, FIN-FR-121, FIN-FR-130 to FIN-FR-132 |
| FC6 walk | `FundPlanIT`, `WhatIfIT` | Non-budget advances in the book lines | FIN-FR-096 to FIN-FR-103, FIN-FR-137, FIN-FR-139 |
| FC7 walk | `DemandIT`, `PaymentFileIT`, `LateCashIT` | SD-05 on import | FIN-FR-075, FIN-FR-089, FIN-FR-111, FIN-FR-115 to FIN-FR-117 |
| Page-open sweep | `role-matrix.spec` | Accessibility scan | Partial rows in general |

### Tests with no sweep ancestor {#fin-test-new}

| Test | Asserts | Requirements |
| --- | --- | --- |
| `AcceptanceToVoucherScenario` | Gate pass, hold, release through to approval; missing PO refused; penalty reaches the net; waiver refused after start | FIN-FR-015, FIN-FR-017 to FIN-FR-021, FIN-IR-001 to FIN-IR-003 |
| `VoucherCalculatorTest` | Tax, net and rounding, from the whole order, for each payee kind; the design's worked example | FIN-FR-028, FIN-NFR-004 |
| `RoutePolicyTest` | Every row of BR-FIN-05 | FIN-FR-027 |
| `RemitPolicyTest` | Every class and method at the limit, on working days | FIN-FR-084 |
| `AdvancePolicyTest` | Each check of BR-FIN-17 and each boundary | FIN-FR-066 |
| `DailyCashIT` | Differing count, SD-13 refusal | FIN-FR-090, FIN-FR-091 |
| `MonthCloseIT` | Each failing check, closing with a reason, `PeriodGuard` on every dated command | FIN-FR-122 to FIN-FR-124 |
| `SodRefusalIT` | Each rule refuses the person and the delegator, with a log row | BR-FIN-11 |
| `RuleSetTest` | A tenant cannot change a dated rule; an old voucher keeps its version | FIN-FR-002 |
| `TenantIsolationIT` | Each table refuses cross-tenant access | ADR-0005 |
| `AiLimitsTest` | The register has no forbidden tool | BR-FIN-31 |

## Migration from the prototype {#fin-migration}

The prototype is a reference, and no code moves across. There is no production data to migrate. A tenant's opening balances are an onboarding matter: fund balances, open advances, receipt books and open commitments enter as dated opening records.

| Carries over | How | Source in the prototype |
| --- | --- | --- |
| State names and transitions | Java enums and tables | `66c-fin-fn2.js`, `66d-fin-fn3.js` |
| Rules and calculations | Rewritten with tests | `vCalc`, `vRoute`, `advChecks`, `rcDue`, `monthChecks` |
| Finance rules | Split into `FinanceRuleSet` and `finance_setting` | `66b-fin-fn1.js` `FCFG_ROWS` |
| Screens and flows | The React build follows the page table | `66h-fin-pages.js` |
| Sweep walks | Rewritten as tests | `tests/sweep.js` |

| Does not carry over | Why | Replaced by |
| --- | --- | --- |
| Browser state and the role switch | One user, no server | PostgreSQL and Keycloak |
| Simulate buttons and made-up reports | Must not exist in production | Adapters and imports |
| `bank` on the supplier | Finance owns accounts | `supplier_bank_account` |
| Editable penalty on a contract voucher | BR-FIN-08 | Gate snapshot |
| Settings form with no ranges | FIN-FR-002 | `FinanceRuleSet` |
| Fixed month list on F7 and the fixed carry-over date | Sample values | Calendar data |
| Known defects | OI-FIN-09, OI-FIN-10, OI-FIN-17 to OI-FIN-22 | Fixed by design and covered by tests |

## Known gaps and open issues {#fin-open}

### Issues carried from the SRS {#fin-open-srs}

| Issue | Effect on this design | Designed for now | Decides |
| --- | --- | --- | --- |
| OI-FIN-01 | Clause fields | Blank where unconfirmed | Finance specialist, legal unit |
| OI-FIN-02, OI-FIN-03 | External contracts | Ports with file adapters | Comptroller General's Department, banks |
| OI-FIN-04 | Compensation tax | Rate table in `FinanceRuleSet`, empty | Finance specialist, tax adviser |
| OI-FIN-05 | VAT | One entry in the rule set | Development team, finance specialist |
| OI-FIN-06 | ADV | TRR refs only | Finance specialist |
| OI-FIN-07 | Hard stops at close | A reason overrides every check | Finance specialist, auditor |
| OI-FIN-08 | Meaning of Paid | See DG-FIN-03 | Product owner, Procurement owner |
| OI-FIN-09, OI-FIN-10 | Gate release and rejected vouchers | Fixed by design | Development team |
| OI-FIN-11 | SD-03 | No command | Finance owner, Platform owner |
| OI-FIN-12 | Retention | Keys with no period | Finance specialist, product owner |
| OI-FIN-13 | Portal verification | A recorded contact | Finance specialist, security reviewer |
| OI-FIN-14 | Payroll file | Port only | Product owner |
| OI-FIN-15 | Committee rank | Not checked | Finance specialist |
| OI-FIN-16 | Whole baht or satang | Two decimal places | Procurement specialist, finance specialist |
| OI-FIN-17 to OI-FIN-22 | Prototype gaps | Fixed by design | Development team |
| OI-FIN-23 | AI scope | All calls through `AiGateway`, off by default | Product owner, data protection officer |

### New issues from this design {#fin-open-new}

The DG-FIN numbers below belong to this chapter and are not SRS ids.

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-FIN-01 | The Procurement chapter now has the narrower `FinanceFacts`, declares `BankChangeIntake`, and lets `PhasePayment.rejected` free a phase. Does the product owner accept these? | As listed in Components | Procurement author, product owner |
| DG-FIN-02 | BGT-IR-005, the Budget SDS and the Integration chapter now all place the import in Finance. Who owns the screen (DG-BGT-05)? | Finance imports and writes through `LineLedger.recordDisbursement`, and Budget links to the result | Budget author, product owner |
| DG-FIN-03 | Should `PhasePayment.approved` run at approval or at payment? | At approval, as in the prototype | Product owner, Procurement owner |
| DG-FIN-04 | Does a voucher hold on `LineLedger` by `reserve`, or by a Finance row only? | `reserve` when there is no commitment, a `voucher_hold` row on a commitment | Budget author, technical lead |
| DG-FIN-05 | Does the portal bank change need a further control beyond the second person? | Recorded contact, reveal log, SG-F03 | Security reviewer, finance specialist |
| DG-FIN-06 | Who owns the agent runtime, given the Review chapter's request for `AgentRuntime` in Platform? | Tools in `finance.assistant`, runs on that runtime | Review author, Platform author |
| DG-FIN-07 | Does a carried amount stay on its commitment, or move to a new one on the carried line (DG-BGT-09)? | Budget creates the carried money and raises `carry-over.approved`. The commitment stays, and its line reference changes on that event | Budget author, finance specialist |

### Known gaps in this version {#fin-open-depth}

- Forecasts, what-if and agents are designed at component and interface level only. Their algorithms follow the prototype.
- Planned rows with no prototype behaviour have a table and an endpoint only: FIN-FR-095 and FIN-IR-010.
- Column types, indexes and constraints wait for the data dictionary chapter.
