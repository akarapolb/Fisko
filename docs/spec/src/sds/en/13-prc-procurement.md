# Module design: Procurement {#prc}

> [!NOTE] Fisko has no production code. The prototype is browser JavaScript and shows behaviour only. Everything in this chapter is a proposal to build: the packages, classes, tables, endpoints, events and test names below do not exist yet. The technology comes from the accepted ADRs in `docs/adr/`, which this chapter applies and does not reopen.

## Purpose, scope and traceability {#prc-purpose}

<!-- covers: PPA 11; PPA 56; PPR 162; PPR 175; PPR 176 -->

This chapter designs the production Procurement module: its structure, data, interfaces and behaviour. It answers the Procurement chapter of the SRS and is the pilot for the other module chapters, which copy its structure and depth.

The module covers the yearly plan, requisitions, the case file of 12 steps, contracts, phases, acceptance, penalties, guarantees and the hand-over to Finance. The official procurement steps stay in e-GP (PRC-CR-001): Fisko prepares, checks, records and tracks.

Outside this chapter: the separation-of-duties engine, delegation and the audit log belong to `platform`; allocation lines belong to `budget`; vouchers, payments and GFMIS belong to `finance`. This chapter states only what Procurement needs from them.

Every SRS requirement group maps to a design section below.

| SRS group | Requirements | Design section | Main package |
| --- | --- | --- | --- |
| Business rules | BR-PRC-01 to BR-PRC-34 | Domain model | all |
| Procurement plan and versions | PRC-FR-001 to PRC-FR-011 | Domain model, States and transitions, Data design | `plan` |
| Requisitions | PRC-FR-012 to PRC-FR-025 | States and transitions, Security design | `requisition` |
| Case file and steps | PRC-FR-026 to PRC-FR-035 | States and transitions, Dynamic behaviour | `casefile` |
| Method selection and rules table | PRC-FR-036 to PRC-FR-045 | Design overview, Domain model | `method`, `settings` |
| TOR and market research | PRC-FR-046 to PRC-FR-053 | Components, Data design | `sourcing` |
| e-GP notice and bids | PRC-FR-054 to PRC-FR-061 | Interface design, Security design | `sourcing`, `egp` |
| Bid evaluation | PRC-FR-062 to PRC-FR-068 | Domain model, Security design | `evaluation` |
| Appeal | PRC-FR-069 to PRC-FR-075 | States and transitions, Dynamic behaviour | `evaluation` |
| Award and letters | PRC-FR-076 to PRC-FR-080 | Dynamic behaviour, Components | `evaluation`, `documents` |
| Committees and conflict of interest | PRC-FR-081 to PRC-FR-091 | Domain model, Security design | `committee` |
| Bid security | PRC-FR-092 to PRC-FR-096 | Domain model, Data design | `sourcing` |
| Contracts and phases | PRC-FR-097 to PRC-FR-106 | States and transitions, Dynamic behaviour | `contract` |
| Delivery and acceptance | PRC-FR-107 to PRC-FR-119 | Dynamic behaviour, Interface design | `acceptance` |
| Penalties | PRC-FR-120 to PRC-FR-126 | Domain model | `penalty` |
| Guarantees and warranty | PRC-FR-127 to PRC-FR-132 | Domain model, Data design | `contract` |
| Changes and termination | PRC-FR-133 to PRC-FR-142 | States and transitions, Security design | `contract` |
| Supervision reports | PRC-FR-143 to PRC-FR-148 | Components, Data design | `contract` |
| Suppliers and blacklist | PRC-FR-149 to PRC-FR-154 | Data design, Security design | `supplier` |
| Document numbers and forms | PRC-FR-155 to PRC-FR-163 | Components, Data design | `documents` |
| Plan reports and analytics | PRC-FR-164 to PRC-FR-170 | Design overview, Non-functional design | `reporting` |
| Red flags | PRC-FR-171 to PRC-FR-175 | Components, Security design | `reporting` |
| Procurement profile | PRC-FR-176 to PRC-FR-179 | Design overview, Domain model | `settings` |
| AI assistance | PRC-FR-180 to PRC-FR-189 | Components, Security design | `assistant` |
| Data requirements | PRC-DR-001 to PRC-DR-010 | Data design | all |
| State rules | State tables of the SRS | States and transitions | `casefile`, `requisition`, `plan`, `contract` |
| Interface requirements | PRC-IR-001 to PRC-IR-018 | Interface design | `egp`, `api`, `web` |
| Non-functional requirements | PRC-NFR-001 to PRC-NFR-008 | Non-functional design, Security design | all |
| Constraints | PRC-CR-001 to PRC-CR-006 | Design overview | all |
| Test evidence | Sweep walks of the SRS | Test design | tests |
| Open issues | OI-PRC-01 to OI-PRC-17 | Known gaps and open issues | all |

## Design overview and decisions {#prc-decisions}

Procurement is one module of the modular monolith (ADR-0002, PRC-CR-005). A web request runs one command in one PostgreSQL transaction. That transaction stores the aggregate, the case event and the outbox rows together, and it can include a Budget ledger call. Legal state machines are Java code (ADR-0007, PRC-CR-004). Tenant choices are data.

| Decision | Reason | Rejected alternative | Source |
| --- | --- | --- | --- |
| Legal states are plain Java enums with transition tables and guard methods | The steps come from law and change by release, so tests can walk every pair of states | BPMN engine (rejected in ADR-0007); a state-machine framework, which adds a dependency for a small table | ADR-0007, PRC-CR-004 |
| Legal limits sit in code as dated rule sets, and tenant values sit in data | Tenants cannot configure an unlawful process, and old cases keep old rules | Every number as a free tenant setting, which the prototype does | ADR-0007 |
| The contract copies the penalty rate and minimum at signing | A later settings change must not alter a running contract. The prototype reads current settings, so this is a change of behaviour (DG-PRC-10) | Reading live settings at each calculation | ADR-0007 |
| `ProcurementCase` and `SourcingRound` are two aggregates, and the case version guards both | A rerun closes one round and opens another (PRC-DR-002) while the case stays one record | One aggregate holding every round; JSON copies of ended rounds as in the prototype | PRC-FR-030, PRC-DR-002 |
| Steps 1 to 9 are stored; steps 10 to 12 are derived and copied to `display_step` in the same transaction | Lists and the board need a column to filter on (PRC-FR-028), and the derived rule stays the only logic | Deriving at every read, which needs Finance data for each row; storing every step by hand, which can drift | PRC-FR-026 |
| Budget calls run synchronously in the same transaction | A reservation or commitment must succeed or fail with the business change. All modules of a tenant share one cell database | A saga over events, which leaves a window with no reservation | ADR-0002, ADR-0005 |
| `finance` depends on `procurement.api`, and Procurement reads Finance facts through an SPI that `finance` implements | Spring Modulith refuses dependency cycles, and the payment gate needs an answer at once | Two-way calls (a cycle); events only (the gate cannot wait) | ADR-0002, PRC-CR-005 |
| Fisko keeps bid summaries, entered after bids close. Only RFQ replies through the portal are sealed | Bid submission stays in e-GP (PRC-CR-001, PRC-DR-007), so no unopened e-GP bid ever reaches Fisko. A portal reply is the one unopened offer Fisko holds | Sealing every bid row, which protects nothing before closing and blocks price scoring | ADR-0013, PRC-NFR-007 |
| The case timeline and the audit log are two stores | The timeline shows reasons and may hold personal data; the hash chain must not (ADR-0015) | One shared log, which cannot be erased without breaking the chain | ADR-0015, PRC-CR-006 |
| Optimistic locking on aggregates, with `If-Match` on the API; a row lock only on the Budget ledger | Conflicts on one case are rare, and the ledger needs strict ordering at the 30 September peak | Pessimistic locks on every command | ADR-0005 |
| e-GP sits behind a port with a file adapter first | The contract is unknown, and the case logic must not change when an API opens (PRC-IR-005) | Parsing the file inside the case logic | ADR-0008, PRC-IR-005 |
| Optional features are guarded on the server by a `FeatureGuard`, and code never branches on a kind of agency | Profile switches carry the difference (PRC-CR-003), and PRC-NFR-008 tests each switch off | Separate code paths per kind of agency | PRC-FR-178, PRC-CR-003 |
| Analytics read rebuildable projections, and forecasts use a seeded generator | Heavy reads stay off the command tables, and the same data gives the same forecast (PRC-NFR-004) | Queries on live tables at each page open | ADR-0009, PRC-NFR-004 |

> [!LAW] Penalty rates show how a legal limit and a tenant choice divide. The allowed range for each contract kind lives in `PenaltyLimits`, cited to PPR 162. The rate a tenant chooses lives in `procurement_setting`. A save outside the range is refused by the server. Rate ranges are those in BR-PRC-12, and the procurement specialist must confirm them (OI-PRC-01, OI-PRC-06).

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

## Components {#prc-components}

Procurement is the Spring Modulith module `procurement`, under the base package chosen at build start. Only `api` and its sub-package `api.events` are named interfaces. All other packages are internal, and the boundary tests run in CI (ADR-0002).

{{fig:prc-component | Components of the procurement module and their neighbours}}

> [!NOTE] The package list, interface names and method names in this section are a proposal.

### Internal packages {#prc-packages}

| Package | Responsibility | Main classes |
| --- | --- | --- |
| `web` | REST controllers, request records, Problem Details mapping, supplier portal routes | `CaseController`, `ContractController`, `PortalController` |
| `plan` | Plan items, plan versions, snapshots, demand from allocation lines and budget requests | `PlanItem`, `PlanVersion`, `PlanDiff` |
| `requisition` | Requisitions, room check, split-purchase check | `Requisition`, `SplitRiskPolicy` |
| `casefile` | The case, its steps, checks per step, timeline, next action, dossier | `ProcurementCase`, `CaseStep`, `StepChecks`, `CaseEvent` |
| `method` | Method rules, advice and method decision | `MethodAdvisor`, `MethodRule`, `MethodDecision` |
| `sourcing` | TOR library, reference price, market research, hearing, e-GP notice, bids, quotations, RFQ, bid security, sample tests | `SourcingRound`, `ReferencePrice`, `Hearing`, `Rfq`, `BidSecurity`, `SampleTest` |
| `evaluation` | Criteria, scores, award, appeal, appeal forward | `Criteria`, `ScoreSheet`, `Award`, `Appeal` |
| `committee` | Committee orders, members, declarations, meetings, fee claims | `Committee`, `Declaration`, `FeeClaim` |
| `contract` | Contract, phases, versions, changes, guarantee, warranty, defects, termination, supervision, drawings, BOQ, serials | `Contract`, `Phase`, `Variation`, `Guarantee`, `Termination` |
| `acceptance` | Delivery, signatures, dissent, certificates, invoices, payment gate | `AcceptanceService`, `PaymentGateService`, `GateResult` |
| `penalty` | Late days, daily penalty, warning limit, waivers | `PenaltyCalculator`, `Waiver` |
| `supplier` | Supplier register, abandoned-work list, match release, entity check | `Supplier`, `AbandonedWorkList`, `BlacklistPolicy` |
| `documents` | Document numbers, forms, letters, reminders, incoming documents and their checks | `NumberSeries`, `FormDocument`, `SupplierLetter`, `IncomingDocument` |
| `settings` | Profile, feature switches, tenant settings, legal rule sets, categories | `ProcurementProfile`, `FeatureGuard`, `LegalRuleSet`, `SettingRange` |
| `reporting` | Monthly summary, timeline view, KPIs, forecasts, what-if, red flags, OCDS export | `MonthlySummary`, `KpiCatalogue`, `ForecastEngine`, `RedFlagDetector`, `OcdsExporter` |
| `assistant` | AI tools of agents AG-10 to AG-13 and the tool register. Runs and the stop for a person at each write sit in `AgentRuntime` in `platform.ai` (proposal, DG-REV-01) | `ToolRegister` |
| `egp` | e-GP port, file adapter, status comparison, data pack | `EgpStatusSource`, `EgpFileAdapter`, `EgpPackBuilder` |

### Published interfaces {#prc-published}

| Interface | Used by | Purpose | Requirements |
| --- | --- | --- | --- |
| `AcceptedPhaseQuery` | `finance` | Accepted phases with no live payment, with net amount, penalty and gate result | PRC-IR-008 |
| `PaymentGate` | `finance` | `evaluate(contractId, phaseNo)` returns the checks, net amount and hold state | PRC-FR-118, BR-PRC-15 |
| `PhasePayment` | `finance` | `started`, `approved` and `rejected` calls that set Paid, block waiver changes, and free the phase when a voucher is rejected or cancelled | PRC-FR-126, PRC-FR-117 |
| `ContractLookup` | `finance`, `projects`, `review` | Contract summary with no personal fields | PRC-CR-005 |
| `SupplierDirectory` | `finance` | Supplier identity and status for payment | PRC-IR-012 |
| `FinanceFacts` (SPI) | Implemented by `finance` | `purchaseOrderRecorded(contractId)`, `paymentStarted(contractId, phaseNo)`. Room comes from `LineLedger`, so this SPI carries no commitments | PRC-IR-009, BR-PRC-15 |
| `BankChangeIntake` (SPI) | Implemented by `finance` | `submit(supplierId, sealedRequest)`, which carries a bank change from the portal. The account never travels in an event | PRC-IR-012, FIN-FR-057 |
| Events in `api.events` | Any module, and RabbitMQ through the outbox | The event catalogue in the interface section | ADR-0008 |

### Dependencies on other modules {#prc-dependencies}

| Module | Interface needed | Used for | Requirements |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations` | Tenant binding, authority checks and acting on behalf, passed as an `ActorSet` | ADR-0006, BR-PRC-08 |
| `platform` | `SodGuard` | Separation-of-duties checks on an `ActorSet`, and logging of blocked attempts | PRC-NFR-002 |
| `platform` | `AuditLog`, `Notifier`, `WorkItems`, `WorkingCalendar` | Audit entries, notices by template key and parameters, tasks, one working-day count | PRC-NFR-001, PRC-NFR-003 |
| `platform` | `DocumentService`, `FileStore`, `FieldCrypto` | PDF and PAdES, S3 files with scanning, field encryption and blind index | ADR-0010, ADR-0011, ADR-0013 |
| `platform` | `RetentionRegistry`, `SubjectDirectory`, and the SPI `RetentionHold`, which this module implements | Retention keys and legal holds; names behind `*_ref` columns | PLT-FR-110, PLT-FR-112 |
| `platform` | `AiGateway`, `SearchIndexer` | All AI calls; search documents with no restricted data | ADR-0016, ADR-0009 |
| `platform` | `AgentRuntime`, `AgentCatalogue` (proposal, DG-REV-01) | Agent runs, steps, switches and levels | PRC-FR-187, REV-FR-036 |
| `budget` | `LineLedger` | Read a line, `room`, `reserve`, `release`, `commit`, `adjustCommitment` | BR-PRC-04, PRC-IR-006, PRC-IR-007, PRC-FR-138 |
| `budget` | `AllocationQuery` | Lines of a year with amount and structure | PRC-IR-006 |
| `budget` | `BudgetRequestQuery` | Reviewed budget request items for demand and next year's plan | PRC-FR-009, PRC-FR-010 |
| `finance` | None at compile time | `finance` depends on `procurement.api` and implements `FinanceFacts` and `BankChangeIntake` | PRC-CR-005 |

> [!NOTE] Platform answered these requests in [its answer table](#plt-dg-prc): callers pass an `ActorSet`, notices use template keys and parameters, tasks go through `WorkItems`, and Procurement implements `RetentionHold`. Budget and Finance publish the interfaces above in their own chapters. This chapter follows those answers (DG-PRC-08).

## Domain model {#prc-domain}

<!-- covers: PPA 11; PPA 56; PPR 162; PPR 175; PPR 176 -->

The domain classes are plain Java with no Spring or JPA imports. Each command loads one aggregate, calls a method that checks its rules, and saves. Names follow the prototype fields where a field carries over, so the SRS data table still reads across.

{{fig:prc-class | Procurement aggregates and their parts}}

> [!NOTE] The aggregates, class names and error codes in this section are a proposal.

### Aggregates and invariants {#prc-aggregates}

| Aggregate | Parts | Invariants held |
| --- | --- | --- |
| `PlanItem` | None | Edited only while planned with no live requisition; deleted only if never in a proposed version; number never reused |
| `PlanVersion` | Immutable snapshot | One version waiting at a time; the proposer never approves; the snapshot never changes (PRC-DR-001) |
| `Requisition` | Decision records | Raised only from a published item (PPA 11); a pending or approved amount holds a reservation on the line |
| `ProcurementCase` | Method decision, reference price, TOR link, committees, market entries, hearing, closure | One case per plan item; a step moves only when its checks pass; a cancellation or a rerun always keeps a round record |
| `SourcingRound` | e-GP notice, bids, scores, quotations, award, appeal, RFQ, bid security, sample tests | One open round per case; an ended round is read-only (PRC-DR-002); bids lock at the first score; criteria lock at the announcement |
| `Contract` | Phases, signatures, dissents, invoices, waivers, guarantee, variations, versions, termination, defects, letters, supervision | Supplier is the winner; phases sum to the amount; the signed amount never changes; each approved change adds a version (PRC-DR-003) |
| `Supplier` | Certificates, entity checks | One active supplier per tax ID and per normalised name |
| `AbandonedWorkList` | Rows, imports, releases | A file import replaces the rows and keeps a log; a release belongs to one case and one name |
| `MethodRule`, `ProcurementProfile`, `ProcurementSetting` | None | Values stay within `SettingRange`; a rule is ignored before its effective date |
| `FeeClaim`, `FormDocument`, `IncomingDocument`, `RedFlag` | Rows, signature state, fields | Each holds its own status rules from the SRS; a signed document never changes (ADR-0011) |

### Value objects and enumerations {#prc-values}

| Type | Values | Notes |
| --- | --- | --- |
| `Money` | `BigDecimal` with currency baht | ADR-0003; whole baht per PRC-DR-006, see DG-PRC-02 |
| `CaseStep` | `PLANNED`, `REQUESTED`, `APPROVED`, `SPECIFYING`, `SOURCING`, `EVALUATING`, `AWARDED`, `CONTRACTING`, `IN_DELIVERY`, `ACCEPTED`, `PAYMENT`, `CLOSED` | Numbers 1 to 12; cancelled is a separate field, shown as 0 |
| `ProcurementMethod` | `specific`, `ebid`, `selective`, `emarket` | PRC-FR-037; `smallBudget` joins through its profile switch (PRC-FR-045) |
| `ContractKind` | `goods`, `service`, `construction`, `consult` | PRC-FR-037; the `consult` penalty rate is open (DG-PRC-01) |
| `SpecialReason` | `urgent`, `sole`, `repeat` | PRC-FR-038 |
| `CommitteeType` | `tor`, `eval`, `buy` | The acceptance committee sits on the contract |
| `GuaranteeState` | `none`, `held`, `expiring`, `expired`, `returned`, `forfeited` | Derived in part from the expiry date, PRC-FR-129 |
| `ExtensionCause` | `force`, `owner`, `vendor` | Only `force` and `owner` excuse penalty days, PRC-FR-123 |

### Where each business rule is enforced {#prc-rule-map}

The server enforces every rule below. Screens may repeat a check to help the user, and they are never the control (ADR-0006, PRC-CR-004). Error codes are defined in the interface section.

| Rule | Subject | Enforced in | Error code |
| --- | --- | --- | --- |
| BR-PRC-01 | Advised method | `MethodAdvisor.advise` | None, advice only |
| BR-PRC-02 | Differing method needs a reason and a head | `MethodDecision.choose`, `approve` | `PRC_REASON_REQUIRED`, `PRC_SOD_BLOCKED` |
| BR-PRC-03 | Split-purchase risk | `SplitRiskPolicy.assess`, called by `Requisition.send` | `PRC_SPLIT_EXPLANATION_REQUIRED` |
| BR-PRC-04 | Room on a line | `budget` `LineLedger.room`, called by `Requisition.send`, `approve` and `Variation.propose`, `approve` | `PRC_LINE_ROOM_EXCEEDED` |
| BR-PRC-05 | Reference price basis | `ReferencePrice.of` | `PRC_INVALID_INPUT` |
| BR-PRC-06 | Committee composition | `Committee.appoint` | `PRC_COMMITTEE_INCOMPLETE` |
| BR-PRC-07 | Acceptance committee size and signatures | `Contract.draft`, `Phase.need` | `PRC_COMMITTEE_INCOMPLETE` |
| BR-PRC-08 | Separation of duties | `SodGuard` in each command, see the security section | `PRC_SOD_BLOCKED` |
| BR-PRC-09 | Appeal period | `Award.record` with `WorkingCalendar` | None, computed |
| BR-PRC-10 | Winner, cap, phases | `Contract.draft`, `Contract.sign` | `PRC_CONTRACT_INVALID` |
| BR-PRC-11 | Cumulative decider | `Variation.propose` with `ChangeLadder` | None, routes the decision |
| BR-PRC-12 | Daily penalty | `PenaltyCalculator.daily` with `PenaltyLimits` | `PRC_SETTING_OUT_OF_RANGE` |
| BR-PRC-13 | Warning limit | `PenaltyCalculator.overLimit`, on delivery | None, notifies |
| BR-PRC-14 | Accept-by and rejection notice dates | `AcceptanceDue.compute` with `WorkingCalendar` | None, marks lateness |
| BR-PRC-15 | Payment gate | `PaymentGateService.evaluate`, `release` | `PRC_GATE_NOT_PASSED`, `PRC_GATE_PO_MISSING` |
| BR-PRC-16 | Closing a case | `ProcurementCase.close` with `CloseChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-17 | Guarantee amount and term | `Guarantee.record`, `extend` | `PRC_GUARANTEE_INVALID` |
| BR-PRC-18 | Criteria and price score | `Criteria.validate`, `ScoreSheet.total` | `PRC_INVALID_INPUT` |
| BR-PRC-19 | Declarations before evaluation | `StepChecks`, `Award.record` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-20 | Termination effects | `Contract.approveTermination` | `PRC_SOD_BLOCKED` |
| BR-PRC-21 | Warranty and guarantee return | `Contract.returnGuarantee` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-22 | Abandoned-work match | `BlacklistPolicy.check`, called at award, quotation choice, RFQ invitation and contract | `PRC_SUPPLIER_BLOCKED` |
| BR-PRC-23 | Monthly summary | `MonthlySummary.publish` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-24 | e-GP mismatch | `EgpComparison`, a daily job | None, warns and adds a task |
| BR-PRC-25 | Bid security | `BidSecurity.record`, `returnTo`, `forfeit`, `StepChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-26 | Sample tests | `SampleTest.record`, `StepChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-27 | Forwarded appeal | `Appeal.forward`, `Appeal.decide` | `PRC_STATE_CONFLICT` |
| BR-PRC-28 | Drawings | `Phase.sign`, `DrawingRound` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-29 | Committee fees | `FeeClaim.prepare` | `PRC_INVALID_INPUT` |
| BR-PRC-30 | TOR hearing | `Hearing.conclude`, `StepChecks` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-31 | SME and MiT preference | `PreferenceView`, read only | None, display only |
| BR-PRC-32 | Minimum invitations | `StepChecks` with `Rfq` | `PRC_STEP_CHECK_FAILED` |
| BR-PRC-33 | Numbers never reused | `NumberSeries.next`, a row-locked counter that deletes never rewind | None |
| BR-PRC-34 | AI limits | `ToolRegister`, which holds no scoring, award, contract, approval or payment tool | `PRC_AI_NOT_ALLOWED` |

### Limits in code and tenant settings {#prc-limits}

Each setting has a range in `SettingRange` and a value in `procurement_setting`, with an effective date. Values come from the business rules of the SRS, and the table shows how the main ones divide. `LegalRuleSet` is versioned by effective date, and `method_decision` and `contract` store the version they used (PRC-FR-044, ADR-0007).

| Setting | Range in code | Default as tenant data | Rule |
| --- | --- | --- | --- |
| `penGoods`, `penService` | 0.01 to 0.20 percent a day | 0.10 | BR-PRC-12 |
| `penCons` | 0.01 to 0.10 percent a day | 0.10 | BR-PRC-12 |
| `penaltyMin` | 0 or more baht a day | 100 | BR-PRC-12 |
| `specificMax` | At least 1 baht | 500,000 | BR-PRC-01, OI-PRC-02 |
| `minMembers` | At least 2 | 3 | BR-PRC-06 |
| `appealDays` | 0 or more working days | 7 | BR-PRC-09 |
| `guaranteePct` | 0 or more percent | 5 | BR-PRC-17 |
| `ladderPct`, `extDaysHead` | 0 or more | 10, 30 | BR-PRC-11 |
| `invoiceTol` | 0 or more baht | 0 | BR-PRC-15 |
| `smePct`, `mitPct` | 0 to 50 | 5 | BR-PRC-31, OI-PRC-10 |
| Stored settings: `warrantyMonths`, `rejectNoticeWd`, `syncDays`, `dueProgressMin`, `progressGap`, `supReportDays` | Open, OI-PRC-07 | As in the SRS | Several |

## States and transitions {#prc-states}

State names are those of the SRS. Each transition is a method on the aggregate. The method checks the current state against a transition table, runs the guards, and records one `case_event`. A refused move answers with the first unmet check (PRC-FR-027).

### Procurement case {#prc-state-case}

{{fig:prc-state-case | States of the procurement case}}

| From | To | Command | Guard | Event |
| --- | --- | --- | --- | --- |
| 1 PLANNED | 2 REQUESTED | `Requisition.send` | Item in the published plan, room on the line, BR-PRC-03 | `requisition.sent` |
| 2 REQUESTED | 3 APPROVED | `Requisition.approve` | SD-01, room on the line | `requisition.approved` |
| 2 REQUESTED | 1 PLANNED | `reject`, `return`, `withdraw` | Reason where the SRS asks for one | `requisition.closed` |
| 3 APPROVED | 4 SPECIFYING | `ProcurementCase.move` | Method chosen, and approved by the head if BR-PRC-02 applies | `case.step-changed` |
| 4 SPECIFYING | 5 SOURCING | `ProcurementCase.move` | Reference price, TOR, committee, e-GP details, criteria, hearing, invitations | `case.step-changed` |
| 4 SPECIFYING | 7 AWARDED | `ProcurementCase.move` | Specific method, chosen quotation within the approved amount, BR-PRC-22 | `award.recorded` |
| 5 SOURCING | 6 EVALUATING | `ProcurementCase.move` | Closing date passed, bidder count recorded and above zero | `case.step-changed` |
| 6 EVALUATING | 7 AWARDED | `SourcingRound.recordAward` | PRC-FR-065, PRC-FR-076 to PRC-FR-078, BR-PRC-25, BR-PRC-26 | `award.recorded` |
| 7 AWARDED | 8 CONTRACTING | Daily job, or `ProcurementCase.move` | Appeal period over and no open appeal; no period for a method with no appeal flag | `case.step-changed` |
| 7 AWARDED | 6 EVALUATING | `Appeal.uphold`, `Award.withdraw` | Head, reason of at least 10 characters; scores stay | `award.withdrawn` |
| 4 to 7 | 4 SPECIFYING | `ProcurementCase.fail` | Reason; the round closes as failed; zero bidders also reruns | `case.failed` |
| 2 to 8 | 0 cancelled | `ProcurementCase.cancel` | Reason; the round is kept; requisition cancelled; reservation released | `case.cancelled` |
| 0 cancelled | 2 REQUESTED | `Requisition.send` | A new requisition clears the cancellation; method and price start empty | `requisition.sent` |
| 8 CONTRACTING | 9 IN DELIVERY | `Contract.sign` | See the contract table | `contract.signed` |
| 9 IN DELIVERY | 10 ACCEPTED | Derived | Every live phase accepted | `case.step-changed` |
| 10 ACCEPTED | 11 PAYMENT | Derived, on `PhasePayment.started` | A payment exists | `case.step-changed` |
| 11 PAYMENT | 12 CLOSED | `ProcurementCase.close` | BR-PRC-16 and a supplier score of 1 to 5 | `case.closed` |

> [!NOTE] A contract terminated with no accepted phase has no live phases, so the derivation holds it at step 11 and it can close under BR-PRC-16, as in the prototype. Step 11 depends on the Finance payment state, and the FIN chapter must keep this link in step.

### Contract {#prc-state-contract}

{{fig:prc-state-contract | States of a contract}}

| From | To | Command | Guard | Effect |
| --- | --- | --- | --- | --- |
| (none) | draft | `Contract.draft` | Case at step 8; BR-PRC-10, BR-PRC-07, BR-PRC-22; SD-02, SD-06 | Number issued; nothing committed (PRC-IR-007) |
| draft | (deleted) | `Contract.deleteDraft` | Never signed | Case stays at step 8; number kept |
| draft | active | `Contract.sign` | Signing date not in the future; guarantee recorded when required (PRC-FR-128); phases sum to the amount | `LineLedger.commit`; rate copied; requisition contracted; case step 9 |
| active | active | `Variation.approve` | SD-08; decider from BR-PRC-11; room on the line for an increase | New version; `adjustCommitment`; signed amount stays |
| active | closed | `ProcurementCase.close` | BR-PRC-16 | Contract and plan item closed |
| active | terminated | `Contract.approveTermination` | Authorised approver; SD-08 | BR-PRC-20: unaccepted phases cancelled, amount falls to accepted phases, guarantee forfeited, supplier proposed for the list, letter drafted |

### Phase {#prc-state-phase}

{{fig:prc-state-phase | States of a phase}}

A phase has no status column. `Phase.state()` derives it in the SRS order: Cancelled, Paid, Accepted, Delivered, Waiting. `Overdue` is a marker on an undelivered phase past its due date. A signature withdrawn before completion leaves the phase Delivered (PRC-FR-112).

| From | To | Command | Guard |
| --- | --- | --- | --- |
| Waiting | Delivered | `Contract.recordDelivery` | Phase order; date not before signing (PRC-FR-107) |
| Delivered | Accepted | `Contract.sign` on the phase | Committee member; previous phase accepted; no open dissent; SD-02; same amount as earlier members; BR-PRC-28 |
| Accepted | Paid | `PhasePayment.approved` | Called by Finance |
| Accepted | Accepted | `PhasePayment.rejected` | Called by Finance when a voucher is rejected or cancelled. The phase is free for a new voucher (OI-FIN-10) |
| Waiting, Delivered | Cancelled | `Contract.approveTermination` | The penalty clock stops at the cancellation date |

### Requisition, plan item and plan version {#prc-state-others}

| Record | States | Enforced in | Note |
| --- | --- | --- | --- |
| Requisition | draft, pending, returned, approved, rejected, contracted, cancelled | `Requisition` | The SRS table is the transition table. Entering pending calls `reserve`, and leaving it for an end state calls `release` |
| Plan item | planned, requisitioned, contracted, closed, cancelled, and draft (derived) | `PlanItem` | Draft is derived from the published version, as in the SRS |
| Plan version | submitted, approved, rejected, withdrawn, and published (derived) | `PlanVersion` | Published means approved with an e-GP notice number (PPA 11) |

## Dynamic behaviour {#prc-dynamic}

<!-- covers: PPR 175; PPR 176 -->

### The case from plan to closing {#prc-activity}

The activity shows the normal route. There are two paths between the method decision and the winner: the specific method uses quotations, and the competitive methods run in e-GP and come back as recorded data. Reruns and cancellations are in the state table.

{{fig:prc-activity-case | The end-to-end procurement case}}

### Award to contract signing {#prc-seq-award}

Recording an award and signing a contract are separate commands. The appeal period lies between them, and signing is the moment the line is committed. The contract draft commits nothing.

{{fig:prc-seq-award | From award to contract signing}}

- The award takes the price of a competitive case from the winner's bid (PRC-FR-076). It refuses a price above the approved amount (PRC-FR-077) and needs a reason if the winner lacks the top total score (PRC-FR-078).
- The appeal end date is stored on the award. A daily job replaces the prototype's simulation button (PRC-NFR-006), and whether it may move the case with no person is DG-PRC-09.
- Signing runs in one transaction: `LineLedger.commit` converts the reservation, the contract becomes active, the requisition becomes contracted and the case reaches step 9. If the ledger refuses, nothing is saved.
- The signed contract PDF is stored once and never changed (ADR-0011). A change makes a new version.

### Delivery to acceptance to payment request {#prc-seq-accept}

Procurement owns everything up to the gate. Finance owns the payment request and every state after it. The gate runs inside Procurement and is called by Finance, so one rule set decides whether a phase may go forward (PRC-IR-008, PRC-IR-009).

{{fig:prc-seq-accept-pay | From delivery to acceptance and payment request, across Finance}}

- Each signature is one transaction. The optimistic version stops two members from completing the same phase on stale data.
- On completion the system records 2 certificates (PRC-FR-115). `DocumentService` renders them to PDF and signs them with PAdES. Rendering runs after commit from an outbox event, so a signing failure never undoes an acceptance, and the state is shown to users (ADR-0008).
- The gate checks acceptance, invoice, match within `invoiceTol`, guarantee, and the GFMIS purchase order through `FinanceFacts`. Payable is the accepted amount less the penalty (PRC-FR-118).
- A failed gate stores a hold. A head or the authorised approver may release it with a reason of at least 10 characters, and the auditor and Finance are told (PRC-FR-119). `PRC_GATE_PO_MISSING` cannot be released (BR-PRC-15).
- Once `PhasePayment.started` is called, waivers and invoice returns on that phase are refused (PRC-FR-117, PRC-FR-126). `PhasePayment.rejected` frees the phase again when Finance rejects or cancels the voucher, and the next voucher reads the current penalty.

> [!OPEN] A contract terminated by BR-PRC-20 has a forfeited guarantee, so an accepted and unpaid phase fails the guarantee check and needs a release. The procurement specialist must say whether that check applies after termination (DG-PRC-03).

### Scheduled work {#prc-jobs}

Jobs run per cell and work tenant by tenant, each with the tenant bound as for a web request. Each job is safe to run twice, and a lock lets one instance run it at a time.

| Job | Does | Requirements |
| --- | --- | --- |
| Appeal period | Marks the period over and moves the case when no appeal is open | PRC-FR-070, BR-PRC-09 |
| RFQ opening | Opens sealed replies after the reply date and closes the portal for that RFQ | PRC-IR-010, ADR-0013 |
| Task sweep | Opens work items through `WorkItems` for guarantee expiry, due deliveries, rejection notices, defects, bid security returns, appeal result dates, stale supervision reports | PRC-FR-080, PRC-FR-095, PRC-FR-129, PRC-FR-132, PRC-FR-075, PRC-FR-145 |
| e-GP comparison | Compares the imported stage with the case step and adds a task after `syncDays` | PRC-IR-003, BR-PRC-24 |
| Red flag detection | Runs signals RF-01 to RF-10 and updates the queue | PRC-FR-171, PRC-FR-172 |
| Retention | Applies the schedule of ADR-0014 to ended records | PRC-DR-010 |

## Data design {#prc-data}

<!-- covers: PDPA 39 -->

Tables live in the schema `procurement` of the cell's PostgreSQL cluster (ADR-0005). Other modules never read them; they use `procurement.api`. Migrations follow expand and contract, so old and new versions run together during a rolling upgrade.

> [!NOTE] Every table, column, type and index in this section is a proposal. The tables are the logical design, and the data dictionary chapter will hold the final columns.

{{fig:prc-er | Core procurement tables. The full list follows.}}

### Rules for every table {#prc-data-rules}

- Every tenant-owned table has `tenant_id` first in its primary key and in each foreign key, so a row can never point into another tenant.
- Row-level security is enabled and forced on every table, and CI tests each one (ADR-0005). The application role has no bypass.
- Common columns are `tenant_id`, `id` (UUID), `created_at`, `created_by_ref`, `updated_at`, and `version` on aggregate roots. A `*_ref` column holds a pseudonymous subject reference from `platform`.
- Business numbers such as plan, requisition, case and contract numbers are separate columns from `id`, unique per tenant and fiscal year (PRC-DR-004).
- Money columns use `numeric`, mapped to `BigDecimal` (ADR-0003). The scale is open (DG-PRC-02).
- Records with a status are never hard-deleted. Only never-sent drafts may be deleted, and their numbers stay in `number_log`.

```sql
-- Proposal: the pattern applied to every tenant-owned table.
ALTER TABLE procurement.contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement.contract FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON procurement.contract
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Tables {#prc-data-tables}

Class is the ADR-0013 class of the row as a whole; field exceptions are in the next table. Retention key is the entry in the schedule of ADR-0014. No period is stated, because OI-PRC-14 is open.

| Table | Key columns | Class | Retention key | Requirements |
| --- | --- | --- | --- | --- |
| `plan_item` | `line_id`, `no`, `name`, `estimate`, `planned_on`, `category_id`, `kind`, `status` | Internal | `prc.plan` | PRC-FR-001 to PRC-FR-005 |
| `plan_version` | `version_no`, `status`, `why`, `snapshot` (jsonb), `egp_notice_no`, `decided_by_ref` | Internal | `prc.plan` | PRC-DR-001, PRC-FR-006 to PRC-FR-008 |
| `requisition` | `plan_item_id`, `no`, `amount`, `why`, `needed_on`, `status`, `split_why`, `for_unit_id`, `reservation_ref` | Internal | `prc.case` | PRC-FR-012 to PRC-FR-025 |
| `procurement_case` | `plan_item_id`, `requisition_id`, `no`, `kind`, `method`, `stored_step`, `display_step`, `cancelled_why`, `closed_at`, `lessons`, `supplier_score` | Internal | `prc.case` | PRC-FR-026 to PRC-FR-035 |
| `case_event` | `case_id`, `at`, `type`, `actor_ref`, `detail`, `step` | Confidential | `prc.case` | PRC-FR-029, PRC-DR-005 |
| `method_decision` | `case_id`, `advised`, `chosen`, `why`, `special`, `rule_id`, `rule_effective_on`, `rule_set_version`, `approval_status` | Internal | `prc.case` | PRC-FR-036 to PRC-FR-044 |
| `reference_price`, `market_entry` | `case_id`, `amount`, `basis`, `note`; `vendor`, `price`, `source`, `date` | Internal | `prc.case` | PRC-FR-049 to PRC-FR-051 |
| `tor_template`, `tor_template_version` | `kind`, `version_no`, `file_key`, `status`, `proposed_by_ref` | Internal | `prc.config` | PRC-FR-046 to PRC-FR-048 |
| `hearing`, `hearing_comment` | `case_id`, `notice_no`, `from_on`, `to_on`, `conclusion`, `revision_no` | Public after publication | `prc.case` | PRC-FR-052, PRC-FR-053 |
| `sourcing_round` | `case_id`, `round_no`, `outcome`, `why`, `egp_no`, `announced_on`, `closes_on`, `bidders` | Public after announcement | `prc.case` | PRC-FR-030, PRC-FR-054, PRC-DR-002 |
| `bid`, `bid_detail` | `round_id`, `supplier_id`, `bidder_name`, `price`; maker, country, brand, model, deviation | Confidential until the award | `prc.bid` | PRC-FR-058, PRC-FR-059, PRC-FR-066, PRC-NFR-007 |
| `criterion`, `evaluation_score` | `round_id`, `name`, `weight`; `member_ref`, `bid_id`, `criterion_id`, `value` | Confidential | `prc.bid` | PRC-FR-062 to PRC-FR-065 |
| `quotation` | `round_id`, `supplier_id`, `price`, `chosen` | Confidential until the award | `prc.bid` | PRC-FR-060 |
| `rfq`, `rfq_reply` | `round_id`, `doc_no`, `reply_by`; `supplier_id`, `sealed_payload`, `sealing_key_ref`, `opened_at`, `price` | Confidential, sealed until the reply date | `prc.bid` | PRC-FR-061, PRC-IR-010 |
| `award`, `appeal`, `appeal_forward` | `round_id`, `supplier_id`, `price`, `awarded_on`, `resolution`, `appeal_end_on`; `appellant`, `grounds`, `status`, `decision_why`; `doc_no`, `result` | Public after announcement, except reasons | `prc.case` | PRC-FR-069 to PRC-FR-078 |
| `committee`, `committee_member`, `declaration` | `case_id`, `type`, `order_no`, `order_on`; `subject_ref`, `role`; `round_id`, `conflict`, `bidder`, `entered_by_ref` | Confidential | `prc.case` | PRC-FR-081 to PRC-FR-084 |
| `committee_meeting` | `committee_id`, `held_on`, `attendance`, `resolution` | Confidential | `prc.case` | PRC-FR-087 |
| `fee_claim`, `fee_claim_row` | `doc_no`, `case_id`, `status`, `total`; `subject_ref`, `dates`, `amount` | Confidential | `prc.fee` | PRC-FR-089 to PRC-FR-091 |
| `bid_security` | `round_id`, `bidder_name`, `type`, `amount`, `valid_to`, `status`, `reason` | Internal | `prc.bid` | PRC-FR-092 to PRC-FR-096 |
| `sample_test` | `bid_id`, received, sent, started, finished, notified and replied dates, `report_no`, `result` | Confidential | `prc.bid` | PRC-FR-068 |
| `contract` | `case_id`, `supplier_id`, `no`, `status`, `signed_on`, `signed_amount`, `amount`, `version_no`, `penalty_rate`, `penalty_min`, `rule_set_version`, `warranty_months`, `erp_refs` (jsonb) | Public after signing | `prc.contract` | PRC-FR-097 to PRC-FR-103, PRC-IR-015, PRC-DR-003 |
| `contract_version`, `variation`, `termination` | `version_no`, `amount`, `why`; `kind`, `delta`, `days`, `cause`, `decider`, `status`, `proposed_by_ref`, `decided_by_ref`; `grounds`, `status` | Internal | `prc.contract` | PRC-FR-133 to PRC-FR-141 |
| `acceptance_committee` | `contract_id`, `subject_ref` | Confidential | `prc.acceptance` | PRC-FR-085, PRC-FR-086 |
| `phase` | `contract_id`, `phase_no`, `name`, `due_on`, `amount`, `need`, `ext_days`, `ext_days_vendor`, `delivered_on`, `delivery_ref`, `result`, `ok_amount`, `cancelled_on` | Internal | `prc.acceptance` | PRC-FR-100, PRC-FR-107 to PRC-FR-114 |
| `acceptance_signature`, `acceptance_dissent`, `acceptance_certificate` | `phase_id`, `subject_ref`, `signed_at`; `note`, `resolved_by_ref`; `copies`, `file_key` | Confidential | `prc.acceptance` | PRC-FR-110 to PRC-FR-115 |
| `invoice` | `phase_id`, `no`, `amount`, `issued_on`, `status`, `return_why` | Internal | `prc.acceptance` | PRC-FR-116, PRC-FR-117 |
| `gate_hold`, `waiver` | `phase_id`, `failures`, `released_by_ref`, `reason`; `amount`, `status`, `doc`, `why` | Internal | `prc.acceptance` | PRC-FR-119, PRC-FR-125, PRC-FR-126 |
| `guarantee`, `guarantee_extension` | `contract_id`, `type`, `ref`, `amount`, `expires_on`, `status`; `from_on`, `to_on` | Internal | `prc.contract` | PRC-FR-127 to PRC-FR-131 |
| `defect`, `supplier_letter` | `contract_id`, `fix_by`, `status`; `type`, `text`, `sent_on` | Internal | `prc.contract` | PRC-FR-079, PRC-FR-132 |
| `supervision`, `supervision_report`, `assessment` | `contract_id`, `supervisor_ref`; `progress`, `note`; `checkpoint`, `result` | Confidential | `prc.contract` | PRC-FR-143 to PRC-FR-148 |
| `drawing_round`, `boq_item`, `serial_no` | `contract_id`, `round_no`, `status`; `unit`, `quantity`, `unit_price`; `serial` | Internal | `prc.contract` | PRC-FR-104 to PRC-FR-106 |
| `supplier` | `name`, `normal_name`, `type`, `sme`, `local`, `status`, `tax_id_enc`, `tax_id_bidx`, `contact_enc`, `sme_cert`, `mit_cert` | Confidential, tax ID Restricted | `prc.supplier` | PRC-FR-149, PRC-FR-150 |
| `abandoned_list_row`, `abandoned_import`, `blacklist_release` | `name`, `normal_name`, `tax_id_bidx`, `since_on`, `ref`; `file_key`, `rows`; `case_id`, `evidence` | Confidential | `prc.supplier` | PRC-FR-151 to PRC-FR-153 |
| `entity_check` | `supplier_id`, `status`, `checked_at` | Internal | `prc.supplier` | PRC-FR-154 |
| `number_series`, `number_log` | `doc_type`, `fiscal_year`, `unit_code`, `last_no`, `format`; `no`, `ref`, `issued_by_ref` | Internal | `prc.config` | PRC-FR-155, PRC-FR-156, BR-PRC-33 |
| `form_document`, `reminder` | `template`, `case_id`, `no`, `text`, `sign_state`, `file_key`, `channel`; `target`, `sent_at` | Confidential | `prc.case` | PRC-FR-157 to PRC-FR-160 |
| `incoming_document`, `incoming_field` | `type`, `source`, `status`, `file_key`; `name`, `value`, `original`, `confidence`, `checked` | Confidential | `prc.intake` | PRC-FR-161 to PRC-FR-163 |
| `egp_import`, `egp_import_row` | `file_hash`, `imported_by_ref`, `ok_count`, `skipped_count`; `plan_no`, `egp_no`, `stage`, `stage_on` | Internal | `prc.plan` | PRC-IR-001, PRC-IR-002 |
| `monthly_summary`, `red_flag` | `month`, `rows` (jsonb), `published_at`; `signal`, `target`, `score`, `status`, `evidence`, `note` | Public after publishing; Confidential | `prc.report` | PRC-FR-164, PRC-FR-171 to PRC-FR-175 |
| `procurement_setting`, `procurement_profile`, `method_rule`, `category` | `key`, `value`, `effective_from`; `kind`, `switches`; `rule_id`, `condition`, `method`, `ceiling`, `on`; `kind` | Internal | `prc.config` | PRC-FR-040 to PRC-FR-042, PRC-FR-176 to PRC-FR-179 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | Short, set with the platform | ADR-0008 |

> [!NOTE] Supplier bank accounts and vouchers belong to Finance, so no procurement table holds a bank account. A bank change request from the portal reaches Finance through the SPI `BankChangeIntake`, with no direct call to a Finance class (PRC-IR-012).

> [!NOTE] Two stores sit outside this schema. The holiday list is the `holiday` table of `platform`, behind `WorkingCalendar` (DG-PLT-02, PRC-FR-043). Agent runs and AI use follow the shared runtime proposed in DG-REV-01: `agent_run` and `ai_use` live in `platform.ai`, and Procurement keeps its tools in `ToolRegister` (PRC-FR-181, PRC-FR-185, PRC-FR-187).

### Personal and restricted fields {#prc-data-fields}

This table feeds the data dictionary and the records of processing (ADR-0014, PDPA 39, PRC-DR-009). Legal basis, purpose and retention are recorded per field there. The legal basis of each field is for the data protection officer to confirm.

| Field | Class | Protection | Rule |
| --- | --- | --- | --- |
| `supplier.tax_id_enc` | Restricted | AES-256-GCM field encryption through Tink, per-tenant keys, logged reveal | A natural person's tax ID is masked outside procurement roles (PRC-DR-009) |
| `supplier.tax_id_bidx`, `abandoned_list_row.tax_id_bidx` | Restricted | Keyed blind index with its own key | Exact match only, for PRC-FR-149 and BR-PRC-22 |
| `supplier.contact_enc` | Confidential | Encrypted storage, role-based access | E-mail and contact of an individual supplier |
| `*_ref` columns | Confidential | Pseudonymous reference; the name sits in the platform subject table | Reports show a placeholder after erasure (ADR-0015) |
| `declaration`, `evaluation_score` | Confidential | Role-based access, never indexed for search before the award | Leaves out of OCDS (PRC-IR-014) |
| `rfq_reply.sealed_payload` | Confidential | Sealed per ADR-0013, see the security section | Unreadable before the reply date |
| `incoming_document` files | Possibly Restricted | ClamAV scan, per-tenant keys, no text indexed until confirmed | The document may hold an ID or a bank account |

### Files, search and retention {#prc-data-files}

- TOR files, guarantees, delivery notes, invoices and signed certificates are objects in S3 API storage, linked by `file_key` (PRC-DR-008). Each upload is scanned before it can be downloaded, and each is encrypted under a tenant key (ADR-0010).
- Full bid files are not stored (PRC-DR-007), subject to OI-PRC-13.
- OpenSearch indexes cases, plan items, contracts and suppliers by name and number. Restricted data is never indexed, and each query is filtered by tenant on the server (ADR-0009). PostgreSQL stays the source of truth.
- Each retention key names one schedule row in `platform`, read through `RetentionRegistry`. Records that law requires to be kept cannot be deleted early: `procurement` implements `RetentionHold`, and a data subject sees the reason (ADR-0014). The tenant setting and its allowed range wait for OI-PRC-14.

## Interface design {#prc-interfaces}

The REST API is described in OpenAPI 3.1 (ADR-0003), and the events in AsyncAPI (ADR-0008). The tenant comes from the token and never from the path. State-changing calls carry `If-Match` with the aggregate version. Responses never include a field the caller may not see.

### REST endpoints {#prc-rest}

> [!NOTE] This endpoint list is a proposal. Paths are relative to `/api/v1/procurement`, and the authority names are defined in the security section.

| Method and path | Purpose | Authority | Requirements |
| --- | --- | --- | --- |
| `GET, POST /plan-items`; `GET, PUT, DELETE /plan-items/{id}` | List, add, edit, delete plan items | `prc.plan.write` | PRC-FR-001 to PRC-FR-003 |
| `POST /plan-items/{id}/cancel` | Cancel an item with a reason | `prc.plan.write` | PRC-FR-004, PRC-FR-005 |
| `GET, POST /plan-versions`; `POST /plan-versions/{id}/approve, reject, withdraw, publish` | Version life cycle | `prc.plan.write`, `prc.approve` | PRC-FR-006 to PRC-FR-008 |
| `GET, POST /requisitions`; `GET, PUT, DELETE /requisitions/{id}` | Requisition records | `prc.req.write` | PRC-FR-012 to PRC-FR-015, PRC-FR-025 |
| `POST /requisitions/{id}/send, withdraw` | Requester actions | `prc.req.write` | PRC-FR-016 to PRC-FR-018, PRC-FR-024 |
| `POST /requisitions/{id}/approve, return, reject, cancel` | Approver actions | `prc.approve` | PRC-FR-019 to PRC-FR-023 |
| `GET /cases`; `GET /cases/{id}`; `GET /cases/{id}/timeline` | Case list, file and timeline | `prc.read` | PRC-FR-026, PRC-FR-028, PRC-FR-029 |
| `POST /cases/{id}/move, fail, cancel, close` | Step commands | `prc.case.write` | PRC-FR-027, PRC-FR-030, PRC-FR-031, PRC-FR-142 |
| `GET /cases/{id}/method-advice`; `PUT /cases/{id}/method`; `POST /cases/{id}/method/approve, reject` | Advice and method decision | `prc.case.write`, `prc.head` | PRC-FR-036 to PRC-FR-039 |
| `PUT /cases/{id}/reference-price`; `POST, PUT, DELETE /cases/{id}/market` | Reference price and market research | `prc.case.write` | PRC-FR-049, PRC-FR-050 |
| `GET, POST /tor-templates`; `POST /tor-templates/{id}/versions/{v}/approve, reject`; `PUT, DELETE /cases/{id}/tor` | TOR library and case link | `prc.case.write`, `prc.head` | PRC-FR-046 to PRC-FR-048 |
| `POST, PUT /cases/{id}/hearing`; `POST /cases/{id}/hearing/close, reopen, approve-revision` | TOR hearing | `prc.case.write`, `prc.head` | PRC-FR-052, PRC-FR-053 |
| `POST, PUT, DELETE /cases/{id}/committees`; `POST /committees/{id}/declarations`; `POST /committees/{id}/replace-member` | Committees and declarations | `prc.case.write`, `prc.committee` | PRC-FR-081 to PRC-FR-084 |
| `PUT /cases/{id}/egp-notice`; `POST /cases/{id}/qa`; `PUT /cases/{id}/bidders` | e-GP details, questions, bidder count | `prc.case.write` | PRC-FR-054 to PRC-FR-057 |
| `POST, PUT, DELETE /cases/{id}/bids`; `POST, PUT, DELETE /cases/{id}/quotations` | Bid summaries and quotations | `prc.bid.write` | PRC-FR-058 to PRC-FR-060 |
| `POST /cases/{id}/rfqs`; `GET /rfqs/{id}` | RFQ and replies, opened ones only | `prc.bid.write` | PRC-FR-061 |
| `POST, PUT, DELETE /cases/{id}/criteria`; `PUT /cases/{id}/scores/{memberRef}` | Criteria and scores | `prc.case.write`, `prc.committee` | PRC-FR-062 to PRC-FR-064 |
| `POST /cases/{id}/award`; `POST /cases/{id}/award/withdraw` | Award and withdrawal | `prc.case.write`, `prc.head` | PRC-FR-073, PRC-FR-076 to PRC-FR-078 |
| `POST /cases/{id}/appeals`; `POST /appeals/{id}/dismiss, uphold, forward, record-result` | Appeals | `prc.case.write`, `prc.head` | PRC-FR-071, PRC-FR-072, PRC-FR-074 |
| `POST /cases/{id}/bid-securities`; `POST /bid-securities/{id}/extend, return, forfeit` | Bid security | `prc.case.write`, `prc.head` | PRC-FR-092 to PRC-FR-096 |
| `POST, PUT /cases/{id}/sample-tests` | Sample tests | `prc.case.write` | PRC-FR-068 |
| `GET, POST /contracts`; `GET, PUT, DELETE /contracts/{id}`; `POST /contracts/{id}/sign` | Draft, schedule, delete, sign | `prc.contract.write` | PRC-FR-097 to PRC-FR-103 |
| `PUT /contracts/{id}/committee` | Change the acceptance committee before the first signature | `prc.contract.write` | PRC-FR-085, PRC-FR-086 |
| `POST /contracts/{id}/guarantee`; `POST /contracts/{id}/guarantee/extend, return` | Guarantee | `prc.contract.write` | PRC-FR-127 to PRC-FR-131 |
| `POST /contracts/{id}/phases/{n}/delivery` | Record a delivery | `prc.contract.write` | PRC-FR-107, PRC-FR-108 |
| `POST, DELETE /contracts/{id}/phases/{n}/signatures`; `POST /contracts/{id}/phases/{n}/dissents/{i}/resolve` | Sign, withdraw, resolve a dissent | `prc.accept`, `prc.head` | PRC-FR-110 to PRC-FR-114 |
| `POST, DELETE /contracts/{id}/phases/{n}/invoice` | Record or return an invoice | `prc.invoice` | PRC-FR-116, PRC-FR-117 |
| `GET /contracts/{id}/phases/{n}/gate`; `POST /contracts/{id}/phases/{n}/gate/release` | Show the gate, release a hold | `prc.read`, `prc.head` | PRC-FR-118, PRC-FR-119 |
| `POST, PUT /contracts/{id}/phases/{n}/waiver`; `POST .../waiver/approve, reject, withdraw, cancel` | Penalty waiver | `prc.contract.write`, `prc.approve` | PRC-FR-125, PRC-FR-126 |
| `POST /contracts/{id}/variations`; `POST /variations/{id}/approve, reject, withdraw` | Contract changes | `prc.contract.write`, `prc.head`, `prc.approve` | PRC-FR-133 to PRC-FR-138 |
| `POST /contracts/{id}/termination`; `POST /contracts/{id}/termination/approve, reject` | Termination | `prc.contract.write`, `prc.approve` | PRC-FR-139 to PRC-FR-141 |
| `POST /contracts/{id}/defects, letters, supervision-reports, assessments, drawings, boq, serials` | Contract follow-up records | `prc.contract.write` | PRC-FR-079, PRC-FR-104 to PRC-FR-106, PRC-FR-132, PRC-FR-143 to PRC-FR-147 |
| `GET, POST /suppliers`; `GET, PUT /suppliers/{id}`; `POST /suppliers/{id}/entity-check` | Supplier register | `prc.supplier` | PRC-FR-149, PRC-FR-150, PRC-FR-154 |
| `POST /abandoned-list/imports`; `POST /cases/{id}/blacklist-releases` | List import and match release | `prc.supplier`, `prc.head` | PRC-FR-151 to PRC-FR-153 |
| `POST /egp/imports`; `GET /cases/{id}/egp-pack` | e-GP file and data pack | `prc.case.write` | PRC-IR-001 to PRC-IR-004 |
| `GET, POST /documents`; `POST /documents/{id}/request-signature, sign, send, publish`; `POST /incoming-documents`; `POST /incoming-documents/{id}/confirm` | Forms and document intake | `prc.doc` | PRC-FR-157 to PRC-FR-163 |
| `GET, POST /fee-claims`; `POST /fee-claims/{id}/approve, reject` | Committee fees | `prc.case.write`, `prc.head`, `prc.approve` | PRC-FR-089, PRC-FR-090 |
| `GET /reports/monthly`; `POST /reports/monthly/{month}/publish`; `GET /reports/kpis, forecast, timeline`; `POST /reports/what-if`; `GET /exports/ocds` | Reports and export | `prc.read`, `prc.head` | PRC-FR-164 to PRC-FR-170, PRC-IR-014 |
| `GET /red-flags`; `POST /red-flags/{id}/ask, explain, decide` | Red flag queue | `prc.flag` | PRC-FR-173, PRC-FR-174 |
| `GET, PUT /settings`; `GET, PUT /profile`; `GET, PUT /method-rules`; `GET, PUT /number-formats` | Administration | `prc.admin` | PRC-FR-040 to PRC-FR-043, PRC-FR-156, PRC-FR-176 to PRC-FR-179 |
| `POST /ai/{tool}`; `POST /agents/{agent}/runs`; `POST /agent-runs/{id}/steps/{n}/approve` | AI tools and agent steps, passed to `AgentRuntime` (proposal, DG-REV-01) | `prc.ai`, plus the authority of the action | PRC-FR-180 to PRC-FR-188 |
| `GET /portal/rfqs`; `POST /portal/rfqs/{id}/reply, decline`; `GET /portal/contracts`; `POST /portal/contracts/{id}/phases/{n}/invoice`; `POST /portal/bank-change` | Supplier portal, own records only | `prc.portal` | PRC-IR-010 to PRC-IR-012 |

### Error catalogue {#prc-errors}

> [!NOTE] These codes are a proposal. Errors are Problem Details with a `code` field and, for a refused step, the first unmet check. Text is in the user's language.

| Code | HTTP | Meaning | Rule or requirement |
| --- | --- | --- | --- |
| `PRC_INVALID_INPUT` | 400 | A field fails validation | PRC-FR-013, BR-PRC-05, BR-PRC-18 |
| `PRC_REASON_REQUIRED` | 400 | A reason is missing or too short | PRC-FR-033, BR-PRC-02 |
| `PRC_FORBIDDEN` | 403 | The user lacks the authority | ADR-0006 |
| `PRC_SOD_BLOCKED` | 403 | A duty rule refuses this person, and the attempt is logged | BR-PRC-08, PRC-NFR-002 |
| `PRC_FEATURE_OFF` | 403 | The profile switch for this feature is off | PRC-FR-178 |
| `PRC_AI_NOT_ALLOWED` | 403 | The tool is off, or the request is outside the AI limits | BR-PRC-34, PRC-FR-181 |
| `PRC_NOT_FOUND` | 404 | The record does not exist or belongs to another tenant or supplier | ADR-0005, PRC-IR-010 |
| `PRC_VERSION_CONFLICT` | 409 | The record changed since it was read | ADR-0005 |
| `PRC_STATE_CONFLICT` | 409 | The action does not apply to the current state | PRC-CR-004, BR-PRC-27 |
| `PRC_STEP_CHECK_FAILED` | 409 | A check of the step is unmet | PRC-FR-027, BR-PRC-16 |
| `PRC_LINE_ROOM_EXCEEDED` | 409 | More than the room on the line | BR-PRC-04, PRC-FR-017 |
| `PRC_SPLIT_EXPLANATION_REQUIRED` | 409 | Split risk needs an explanation | PRC-FR-024 |
| `PRC_SUPPLIER_BLOCKED` | 409 | The supplier is on the abandoned-work list | BR-PRC-22 |
| `PRC_COMMITTEE_INCOMPLETE` | 409 | The committee does not meet its size or members rule | BR-PRC-06, BR-PRC-07 |
| `PRC_CONTRACT_INVALID` | 409 | Winner, amount, phases or signing date rule fails | BR-PRC-10, PRC-FR-103 |
| `PRC_GUARANTEE_INVALID` | 409 | Guarantee amount or term is below the rule | BR-PRC-17, PRC-FR-128 |
| `PRC_GATE_NOT_PASSED` | 409 | The payment gate holds the phase | BR-PRC-15 |
| `PRC_GATE_PO_MISSING` | 409 | No GFMIS purchase order; cannot be released | BR-PRC-15, PRC-IR-009 |
| `PRC_RFQ_CLOSED` | 409 | The reply date has passed | PRC-IR-010 |
| `PRC_SETTING_OUT_OF_RANGE` | 422 | A setting is outside its allowed range | PRC-FR-042, PRC-FR-179 |
| `PRC_IMPORT_INVALID` | 422 | A file cannot be read as the expected layout | PRC-IR-001, PRC-FR-151 |

### Event catalogue {#prc-events}

> [!NOTE] This event list is a proposal. Each event is written to `outbox_event` in the transaction of the change, and a relay publishes it to RabbitMQ (ADR-0008). The small setup processes the outbox without RabbitMQ. Consumers drop duplicates by `eventId`. Routing keys start with `procurement.`.

Every event carries `eventId`, `tenantId`, `occurredAt` and `aggregateId`, and the fields below. Payloads hold references and amounts, never personal data.

| Event | Raised by | Extra fields | Consumers |
| --- | --- | --- | --- |
| `plan-version.published` | `PlanVersion.publish` | `versionNo`, `egpNoticeNo` | `review`, search |
| `requisition.sent`, `requisition.approved`, `requisition.closed` | `Requisition` | `amount`, `lineId`, `outcome` | Notifications, `reporting` |
| `case.step-changed` | `ProcurementCase` | `fromStep`, `toStep` | `reporting`, search |
| `case.failed`, `case.cancelled`, `case.closed` | `ProcurementCase` | `roundNo` | `reporting`, `projects` |
| `award.recorded`, `award.withdrawn` | `SourcingRound` | `supplierId`, `price`, `appealEndOn` | `reporting`, e-GP comparison |
| `appeal.filed`, `appeal.decided` | `Appeal` | `result` | Notifications |
| `contract.signed` | `Contract.sign` | `lineId`, `amount`, `supplierId` | `finance`, `projects`, `reporting` |
| `contract.changed`, `contract.terminated` | `Contract` | `delta`, `versionNo` | `finance`, `reporting` |
| `phase.delivered`, `phase.accepted`, `phase.paid` | `Contract`, `PhasePayment` | `phaseNo`, `amount`, `late` | `finance`, `reporting` |
| `phase.gate-held`, `phase.gate-released` | `PaymentGateService` | `phaseNo`, `failures` | `finance`, notifications |
| `penalty.waived` | `Waiver` | `phaseNo`, `amount` | `finance` |
| `guarantee.expiring` | Task sweep | `expiresOn` | Notifications |
| `supplier.proposed-for-list` | `Contract.approveTermination` | `supplierId` | Notifications, `prc.head` |
| `settings.changed`, `profile.changed` | `settings` | `key`, `effectiveFrom` | Notifications to the auditor and the head |

### External adapters {#prc-adapters}

Adapters run on the outbox path, retry safely and show their state to users (ADR-0008). The case logic sees only the port. Simulation controls do not exist in a production tenant (PRC-NFR-006).

| Adapter | Port | First implementation | Behaviour | Requirements |
| --- | --- | --- | --- | --- |
| e-GP status | `EgpStatusSource` | `EgpFileAdapter`: a file uploaded by an officer | Check each row against the plan, leave out unknown rows, log counts. The same file gives the same result, using `file_hash` and the row key | PRC-IR-001, PRC-IR-002, PRC-IR-005 |
| e-GP data pack | `EgpPackBuilder` | Text in Thai for keying | Built from the case at steps 4 and 5, each build logged | PRC-IR-004, PRC-NFR-005 |
| GFMIS | None in Procurement | Lives in `finance` | Procurement sees only the purchase order fact through `FinanceFacts`, and never calls GFMIS | PRC-IR-009 |
| E-mail and e-signature | `Notifier`, `DocumentService` | Platform services | Sent or signed only after the rules allow | PRC-IR-016, PRC-FR-158, PRC-FR-159 |
| Legal-entity check | `EntityStatusSource` | None until an authorised exchange exists | Records active, dissolved, suspended or not found | PRC-IR-017, PRC-FR-154 |
| Central appeals body | `AppealForwarding` | Numbered form, result recorded by hand | The local decision stays disabled until the result is recorded | PRC-FR-074, BR-PRC-27 |
| OCDS export | `OcdsExporter` | OCDS 1.1 release packages | Leaves out losing bids, committee names and internal reasons | PRC-IR-014 |
| Asset product | To be defined | None | Accepted items with serial numbers, once the interface exists | PRC-IR-018 |

> [!OPEN] The e-GP contracts are unknown. The Comptroller General's Department must confirm the export file layout and fields, whether an API is open to agencies and how access is granted, the plan notice number format, how contract signing and contract management in e-GP will work, how filed appeals are reported, and the OCDS format and identifier prefix (OI-PRC-03). Until then `EgpFileAdapter` has no fixed layout, so it reads a tenant-neutral column mapping held as configuration.

> [!OPEN] How GFMIS connects is unknown, and the Comptroller General's Department must supply the interface details (ADR-0008). This affects Procurement only through the purchase order fact. Whether Fisko or e-GP holds the contract master once e-GP contract management opens is for the product owner to decide, with that department's answer in hand.

## Security design {#prc-security}

<!-- covers: PDPA 39; PDPA 40 -->

Keycloak signs users in (ADR-0006, XC-SEC-005). Roles, duty rules and delegation live in `platform`, and the server checks them on every action (XC-SEC-003). Each request binds the tenant with `SET LOCAL app.tenant_id` in its transaction, so row-level security applies even if a query forgets its filter. Procurement sits at OWASP ASVS Level 2 (XC-SEC-001), and the payment gate path is reviewed at Level 3 with Finance (ADR-0017, XC-SEC-002).

### Authorities {#prc-authorities}

> [!NOTE] The authority names are a proposal. Roles map to authorities as tenant data, and these defaults follow the actor table of the SRS. The server checks each authority on every action (XC-SEC-003), and refuses a request that no role permits with HTTP 403 and a log entry (XC-SEC-004).

| Authority | Default roles | Allows |
| --- | --- | --- |
| `prc.read` | All Procurement roles, scoped by unit for requesters | Read records the role may see |
| `prc.plan.write` | Procurement officer, head | Plan items and plan versions |
| `prc.req.write` | Requester, procurement officer | Raise, send, withdraw requisitions |
| `prc.approve` | Authorised approver, directly or by delegation | Plan versions, requisitions, larger changes, waivers, terminations |
| `prc.case.write`, `prc.contract.write` | Procurement officer, head | Run cases and contracts |
| `prc.bid.write` | Procurement officer, head | Bids, quotations, RFQs |
| `prc.head` | Head of procurement | Methods, templates, smaller changes, appeals, forfeits, releases, publishing |
| `prc.committee` | Member of that committee, checked per record | Declare and score |
| `prc.accept` | Acceptance committee member, checked per contract | Sign acceptance |
| `prc.invoice` | Procurement officer, finance officer | Record and return invoices |
| `prc.supplier`, `prc.doc` | Procurement officer, head | Supplier register, documents |
| `prc.flag` | Auditor, head; officers and units for items they are asked about | Red flag queue, PRC-FR-173 |
| `prc.admin` | Administrator | Rules, settings, categories, profile. Holidays move to Platform with the `holiday` table |
| `prc.ai` | Roles the tenant allows, only when the tool is on | AI tools and agents |
| `prc.portal` | External supplier user bound to one tax ID | Own invitations, contracts and invoices |

The auditor has `prc.read`. Bid prices are an exception until the award is recorded (PRC-NFR-007): the read model returns them only to procurement roles and the evaluation committee. DG-PRC-07 records the conflict with the SRS actor table.

### Separation-of-duties checks {#prc-sod}

`SodGuard.check(rule, actorSet, others, item)` runs inside the command, after the authority check and before any state change. `ActorSet` holds the person acting and every delegation in force (`Delegations`). A refusal is written in its own transaction, so the log survives the rollback, with time, person, role, rule and item, including who delegated (PRC-NFR-002).

| Rule | Command | Actors | Compared with | Requirements |
| --- | --- | --- | --- | --- |
| SD-01 | `Requisition.approve` | Approver and delegator | Requester | PRC-FR-021 |
| SD-02 | `Contract.draft`, change of committee | Contract creator | Acceptance members | PRC-FR-085, PRC-FR-086 |
| SD-02 | Signing a phase | Signing member | Contract creator | PRC-FR-110 |
| SD-06 | `Contract.draft`, change of committee | Acceptance members | Evaluation and purchasing committee members | PRC-FR-085, PRC-FR-086 |
| SD-07 | Scoring, `recordAward` | Committee member | Declared conflicts | BR-PRC-19, PRC-FR-084 |
| SD-08 | `Variation.approve`, `Waiver.approve`, `Contract.approveTermination` | Decider and delegator | Proposer | PRC-FR-126, PRC-FR-136, PRC-FR-140 |
| Second-person checks | Plan version, method, TOR version, revised TOR, COI report, fee claim, form signature | Decider | Proposer or drafter | PRC-FR-007, PRC-FR-046, PRC-FR-053, PRC-FR-088, PRC-FR-090, PRC-FR-158, BR-PRC-02 |
| SD-03, SD-04, SD-05 | Finance commands | See the FIN chapter | Same | Outside this chapter |

> [!NOTE] The prototype has two paths to change an acceptance committee, and one lacks the SD-06 check (OI-PRC-05). Production has one command, `Contract.changeCommittee`, with both SD-02 and SD-06. The SRS records no sweep check of a refused duty rule, so these rules get new tests in the test design.

### Sealed bids {#prc-sealed}

ADR-0013 requires sealed bids to stay encrypted until the opening time, so that no one can read them early, including operators (XC-SEC-028). e-GP bids reach Fisko only after closing, so the sealing below applies to RFQ replies sent through the portal (PRC-IR-010, OI-XC-11).

- Each RFQ gets its own sealing key, wrapped by a tenant key in KMS or OpenBao (XC-SEC-021). `rfq_reply.sealing_key_ref` names it.
- The application encrypts the reply at receipt with AES-256-GCM through Tink (XC-SEC-020). Price and terms exist only in `sealed_payload` until opening. The `price` column stays empty, and logs and search see nothing.
- The application role gets no decrypt right on that key until the reply date has passed. The RFQ opening job then requests the right, opens all replies of the RFQ together and writes an audit entry. No endpoint opens a single reply.
- Every key use is logged (ADR-0013, XC-SEC-023). A use before the reply date raises an alert to the auditor.
- The reply date on the server decides. A supplier sees the receipt time and never another supplier's reply.

Bid summaries keyed at step 6 are Confidential: role-based, with no field encryption, because the price score needs them (BR-PRC-18). After the award the winning price becomes public data.

> [!OPEN] An operator who controls both KMS policy and the application could still grant the right early, and the log would only show it afterwards. The security reviewer and the product owner must decide whether this meets "including operators" in ADR-0013, or whether release needs a second person outside operations (DG-PRC-06).

### Audit {#prc-audit}

- Every approval, rejection, cancellation, release, settings change and import writes an entry through `AuditLog` (PRC-NFR-001, PRC-CR-006, XC-SEC-032). A `CommandAudit` aspect on each command makes the entry part of the same transaction.
- The log is append-only and hash-chained per tenant (XC-SEC-033, XC-SEC-034). Entries hold a pseudonymous subject reference and item ids, never names or free text (ADR-0015, XC-SEC-037).
- Reasons and notes stay in the business record, and the audit entry points to it. Erasing a person destroys the subject key, and the timeline shows a placeholder (XC-SEC-039, XC-SEC-040).
- Revealing a restricted field is itself logged (ADR-0015, XC-SEC-027, XC-SEC-041), and so is each dossier compilation (PRC-FR-035).
- Application logs and telemetry hold no personal data, and tests check this (ADR-0015, ADR-0017).

### AI controls {#prc-ai-security}

- All AI calls pass through `AiGateway`. AI is off by default, and every feature works with it off (ADR-0016, PRC-FR-189).
- `ToolRegister` is a closed list per agent. No tool can score bids, announce a winner, create or sign a contract, approve or pay (BR-PRC-34, PRC-FR-180).
- A step that writes stops for a person at level L2. Approval runs the normal command, so authority and duty rules apply to the person approving (PRC-FR-187, PRC-FR-188).
- Restricted data, sealed replies and unawarded bid prices are never sent to a model.

## Non-functional design {#prc-nfr}

The table shows how each Procurement non-functional requirement is met. Time and volume targets are the cross-cutting rows XC-PER-001 to XC-PER-008, which are proposals (OI-XC-01).

| Requirement | Design answer | Verified by |
| --- | --- | --- |
| PRC-NFR-001 | `CommandAudit` aspect on every command | Integration test per command |
| PRC-NFR-002 | `SodGuard` logging in its own transaction | Refusal tests in the test design |
| PRC-NFR-003 | One `WorkingCalendar` in `platform`; no date arithmetic elsewhere, checked by ArchUnit | Unit tests and an architecture rule |
| PRC-NFR-004 | `ForecastEngine` runs `fcRuns` simulations, default 400, seeded from the case id | A repeat-run test |
| PRC-NFR-005 | React messages in Thai and English; templates for letters, forms and the data pack in Thai (ADR-0004, ADR-0011) | Playwright in both languages |
| PRC-NFR-006 | No simulation code in production; external calls sit behind adapters, and a clearly labelled test adapter ships only in test profiles | Build check |
| PRC-NFR-007 | Field filter in the read model until `award` exists | Integration test per role |
| PRC-NFR-008 | `FeatureGuard` on every optional command and step check | Parameterised suite, each switch off and each kind of agency |

### Load and availability {#prc-nfr-load}

- Capacity is planned against the 30 September peak, and all agencies peak together (ADR-0005). k6 scripts cover plan publishing, signing and acceptance at that peak (ADR-0017, XC-PER-008).
- The Budget ledger row lock is the expected contention point at the peak, so each transaction holds it only for the ledger call and the commit. Load tests must measure it.
- Lists read `display_step` and indexed columns, with paging. Reports read projections.
- A failure affects one cell, and an adapter failure leaves events waiting in the outbox with their state shown to users (ADR-0005, ADR-0008). The case logic never waits on an external system.
- Telemetry is tagged by cell and tenant and holds no personal data (ADR-0017).

> [!OPEN] XC-PER-001 to XC-PER-008 are proposals, and they give no per-tenant volume for Procurement. The product owner must confirm them (OI-XC-01) and state that volume before load tests can pass or fail (DG-PRC-11).

## Test design {#prc-tests}

The sweep in `tests/sweep.js` runs inside the prototype page and cannot test a server. Its walks are still the best statement of intended behaviour, so each one becomes a production test. Every test names the requirements it proves, so coverage can be measured (ADR-0017).

> [!NOTE] The test class names are a proposal.

### Test levels {#prc-test-levels}

| Level | Tool | Covers |
| --- | --- | --- |
| Unit | JUnit | State tables for every pair of states, `PenaltyCalculator`, `MethodAdvisor`, `SplitRiskPolicy`, `ChangeLadder`, `SettingRange`, all with no Spring context |
| Architecture | Spring Modulith `verify`, ArchUnit | Module boundaries, no cycle with `finance`, no framework in the domain, no outbox bypass |
| Integration | JUnit with Testcontainers: PostgreSQL, RabbitMQ, OpenSearch, S3-compatible storage, Keycloak | Commands through the REST layer, row-level security per table, outbox, sealed replies |
| Module scenario | Spring Modulith `Scenario` | Procurement with `budget` and `finance` in one transaction |
| End to end | Playwright | Each role's journey in Thai and English, and the page-open matrix |
| Load | k6 | The 30 September peak |
| Security | OWASP ZAP, SonarQube, penetration test | ASVS levels of ADR-0017 |

### From sweep walks to production tests {#prc-test-walks}

| Sweep check | Production test | Added beyond the walk | Requirements |
| --- | --- | --- | --- |
| PC1 walk | `PlanToRequisitionIT` (JUnit, Testcontainers); `plan-requisition.spec` (Playwright) | Rejection, split explanation, room refused, SD-01 refused with a log row | PRC-FR-001, PRC-FR-003, PRC-FR-004, PRC-FR-008, PRC-FR-012, PRC-FR-016, PRC-FR-018 to PRC-FR-023, PRC-DR-004 |
| PC2 walk | `CaseRoundIT` | Round rows are read-only at the API, cancellation clears the listed fields | PRC-FR-030 to PRC-FR-032, PRC-FR-058, PRC-DR-002 |
| PC3 walk | `ContractDraftToSignIT`; `contract-sign.spec` | Ledger failure rolls back, guarantee needed at signing, future date refused | PRC-FR-097, PRC-FR-099, PRC-FR-101 to PRC-FR-103, PRC-FR-111, PRC-FR-128, PRC-IR-007 |
| PC4 walk | `LatePenaltyWaiverIT`; `AcceptanceToPaymentScenario` | Gate pass, hold, release, and the PO check that cannot be released | PRC-FR-112, PRC-FR-116, PRC-FR-118, PRC-FR-119, PRC-FR-121, PRC-FR-125 |
| R59 walk | `CaseCorrectionsIT` | Earlier e-GP values kept, one committee-change command with SD-06 | PRC-FR-055, PRC-FR-062, PRC-FR-082, PRC-FR-086, PRC-FR-108, PRC-FR-135 |
| Round 66 check | `PenaltyCalculatorTest` | Boundary rates, zero days, `HALF_UP` rounding kept from the prototype, every contract kind | PRC-FR-120 to PRC-FR-122 |
| Page-open sweep | `role-matrix.spec`: every page for every role, in both languages | Fails on a console error or broken text; adds an accessibility scan | Partial rows in general |

### Tests with no sweep ancestor {#prc-test-new}

| Test | Asserts | Requirements |
| --- | --- | --- |
| `SodRefusalIT` | Each SD rule refuses the person and the delegator, with a log row and no state change | BR-PRC-08, PRC-NFR-002 |
| `TenantIsolationIT` | Generated from the schema: each table refuses a read and a write across tenants | ADR-0005 |
| `SettingRangeTest` | Each setting refuses a value outside its range and accepts a rate such as 0.10, which the prototype form cannot save | PRC-FR-042, PRC-FR-179, OI-PRC-04 |
| `ProfileSwitchIT` | Procurement works with each switch off, and with each kind of agency | PRC-NFR-008, PRC-FR-178 |
| `SealedReplyIT` | No role reads a reply before the date, all open together, and a key use is logged | ADR-0013, PRC-IR-010 |
| `BidPriceVisibilityIT` | Prices are hidden from each other role until the award | PRC-NFR-007 |
| `EgpImportIT` | Unknown rows left out, counts logged, the same file gives the same data | PRC-IR-001, PRC-IR-002 |
| `AiLimitsTest` | The register has no forbidden tool, and each off switch refuses | BR-PRC-34, PRC-FR-180, PRC-FR-181 |
| `AuditChainIT` | Each listed command leaves one audit entry with no personal data | PRC-NFR-001, ADR-0015 |
| `OcdsExportTest` | Losing bids, committee names and internal reasons are absent | PRC-IR-014 |

## Migration from the prototype {#prc-migration}

The prototype is a reference, and no code moves across: it is browser JavaScript with state in memory. What carries over is the knowledge it holds. There is no production data to migrate, and a tenant's opening data is a separate onboarding matter.

| Carries over | How | Source in the prototype |
| --- | --- | --- |
| State names and transitions | Rewritten as Java enums and tables | `61-cases.js` `CASE_STATES`, `caseState`; `86-con-crud.js` |
| Business rules | Rewritten with tests from the SRS | `61-cases.js`, `63-contracts.js`, `63b-contract-late.js`, `64-duties.js` |
| Penalty, gate and closing logic | Rewritten as `PenaltyCalculator`, `PaymentGateService`, `CloseChecks` | `63-contracts.js` `phPenaltyRaw`, `payGate`; `63b-contract-late.js` `closeChecks` |
| Field names | Kept where they make sense, in the database style | `84-proc-crud.js`, `85-case-crud.js`, `86-con-crud.js` |
| Screens and flows | The React build follows the same pages, list and drawer pattern, and case page | `74-proc-pages.js`, `76-crud.js`, `61d-ui-board.js` |
| Thai and English labels | Moved to message files | `L()` labels in `60` to `88` |
| Sweep walks | Rewritten as tests | `tests/sweep.js` |
| Form and letter texts | Become tenant templates | `73-t4.js` `FORM_T`; `63b-contract-late.js` `LETTER_T` |
| Default settings | Become starter tenant data within ranges | `61-cases.js`, `63-contracts.js`, `70-profile.js` seeds |

| Does not carry over | Why | Replaced by |
| --- | --- | --- |
| Browser state and `S` | One user, no server | PostgreSQL per cell |
| Role switch in the page | No real identity | Keycloak and `platform` roles |
| `Simulate` buttons and sample files | Must not exist in production (PRC-NFR-006) | Adapters and scheduled jobs |
| Sample agency data and the reference column of the feature list | Not part of a generic product | Tenant data only |
| Checks that live only in the screen | The server must decide (ADR-0006) | Domain methods |
| Limit of 1,000 case events | Does not apply to production (PRC-DR-005) | `case_event` with no limit |
| Fixed numbers in letters and forms | PRC-CR-002 | Settings and templates |
| Rule-based stand-ins for AI and OCR | The real services differ | `AiGateway` and an extraction service, each with its own evaluation |
| Whole-page render and in-memory search | Not fit for many users | React and OpenSearch |
| Known prototype defects | The settings form cannot save (OI-PRC-04), and the second committee path has no SD-06 check (OI-PRC-05) | Fixed by design and covered by tests |

## Known gaps and open issues {#prc-open}

### Issues carried from the SRS {#prc-open-srs}

| Issue | Effect on this design | Designed for now | Decides |
| --- | --- | --- | --- |
| OI-PRC-01 | Clause citations of legal limits | `LegalRuleSet` entries carry a clause field, left blank where unconfirmed | Procurement specialist |
| OI-PRC-02 | Method ceilings | Ceilings are `method_rule` rows with effective dates | Procurement specialist |
| OI-PRC-03 | e-GP contracts | `EgpStatusSource` port and a file adapter | Comptroller General's Department |
| OI-PRC-04 | Settings form defect | Rates are decimals in `SettingRange`; `SettingRangeTest` | Development team |
| OI-PRC-05 | Two committee paths | One `Contract.changeCommittee` command | Development team |
| OI-PRC-06 | Penalty base | `PenaltyCalculator` keeps the base in one method, and uses the phase amount as the code does | Procurement specialist |
| OI-PRC-07 | Ranges of stored settings | Stored with a provisional range of 0 or more | Procurement specialist, product owner |
| OI-PRC-08 | Owner of the method rules | Starter rows per release; tenants may switch rules on or off | Legal unit, product owner |
| OI-PRC-09 | Monthly summary layout | `monthly_summary.rows` is jsonb, and the layout is a template | Procurement specialist |
| OI-PRC-10 | Preference and fee rates | Tenant settings within ranges | Procurement specialist |
| OI-PRC-11 | Red flag visibility and timing | `prc.flag` and the queue as in the SRS | Auditor, product owner |
| OI-PRC-12 | AI scope and where the model runs | All calls pass through `AiGateway`, off by default | Product owner, data protection officer |
| OI-PRC-13 | Full bid files | Not stored; a future change would add one file class to the existing path | Legal unit, data protection officer |
| OI-PRC-14 | Retention periods | Retention keys per table, with no period | Procurement specialist, product owner |
| OI-PRC-15 | Penalty rate for consulting and design | `consult` is refused at signing until a rate exists (DG-PRC-01) | Procurement specialist |
| OI-PRC-16 | Whole baht or satang | `numeric` columns with two decimal places and a domain check (DG-PRC-02) | Procurement specialist, product owner |
| OI-PRC-17 | Sealed RFQ replies | The Sealed bids section, under XC-SEC-028 (OI-XC-11) | Product owner, security reviewer |

### New issues from this design {#prc-open-new}

The DG-PRC numbers below belong to this chapter and are not SRS ids.

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-PRC-01 | BR-PRC-12 names rates for goods, services and construction, while PRC-FR-037 adds consulting and design. What rate and minimum apply? | The prototype falls back to the goods rate with the service minimum; `consult` is refused at signing until a rate exists | Procurement specialist |
| DG-PRC-02 | PRC-DR-006 holds whole baht, but real invoices carry satang, and `invoiceTol` defaults to 0, so such an invoice fails the gate. Are satang kept? | `numeric` columns with two decimal places, and a domain check for whole baht that a release can remove | Procurement specialist, product owner |
| DG-PRC-03 | After a termination the guarantee is forfeited. Does the gate's guarantee check still apply to an accepted, unpaid phase? | The check fails and needs a release, as in the prototype | Procurement specialist |
| DG-PRC-04 | With `guaranteePct` at 0 no guarantee is required, yet BR-PRC-15 needs one in force. Which exemptions exist? | The gate check passes when the setting requires no guarantee; the prototype would fail | Procurement specialist |
| DG-PRC-05 | BR-PRC-08 lets a tenant switch any duty rule off. Some rules may come from law, and ADR-0007 keeps legal limits out of tenant hands. Which rules can never be off? This is one question with OI-PLT-03, and one answer settles both | All switchable as in the SRS, and each switch-off notifies the auditor | Procurement specialist, legal unit |
| DG-PRC-06 | Does the key-release design meet "including operators" in ADR-0013? | Key right granted by the opening job, every use logged | Security reviewer, product owner |
| DG-PRC-07 | The SRS actor table says the auditor reads everything, and PRC-NFR-007 limits bid prices before the award. Which wins? | PRC-NFR-007 wins | Auditor, product owner |
| DG-PRC-08 | Platform answered in [its answer table](#plt-dg-prc), and Budget and Finance publish their interfaces. Does the product owner accept the changes they make to the requests? | This chapter follows those answers, as listed in Components | Authors of those chapters, product owner |
| DG-PRC-09 | May a daily job move a case from step 7 to step 8 with no person, given that filed appeals come from e-GP? | The job moves it and records `system` as the actor | Product owner, procurement specialist |
| DG-PRC-10 | Copying the penalty rate at signing differs from the prototype. Which rate does the law expect for a running contract? | The rate at signing | Procurement specialist |
| DG-PRC-11 | XC-PER-001 to XC-PER-008 are proposed targets for every module. What per-tenant volume applies to Procurement? | Load tests use the XC-PER rows, with no volume of its own | Product owner |
| DG-PRC-12 | How does a supplier sign in, and how is the user bound to one tax ID (PRC-IR-013)? | A Keycloak user under a supplier organization, bound by `tax_id_bidx` after an officer's check | Product owner, data protection officer |

### Known gaps in this version {#prc-open-depth}

- Analytics, forecasts, what-if and agents are designed at component and interface level only. Their algorithms follow the prototype and the Procurement design document, and the review module may take some of them over.
- Planned rows with no prototype behaviour have a table and an endpoint only: PRC-FR-087, PRC-FR-091, PRC-FR-148 and PRC-IR-018.
- Column types, indexes and constraints wait for the data dictionary chapter.
