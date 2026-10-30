# Module design: Budget {#bgt}

> [!NOTE] Fisko has no production code. The prototype is browser JavaScript and shows behaviour only. Everything in this chapter is a proposal to build: the packages, classes, tables, endpoints, events and test names below do not exist yet. The technology comes from the accepted ADRs in `docs/adr/`, which this chapter applies and does not reopen.

## Purpose, scope and traceability {#bgt-purpose}

<!-- covers: BPA 25; BPA 26; BPA 35; BPA 36; BPA 40; BPA 43; BMR 9; BMR 21; BMR 25; BMR 29; BMR 34 -->

This chapter designs the production Budget module: its structure, data, interfaces and behaviour. It answers the Budget chapter of the SRS and follows the structure of the Procurement chapter.

The module covers strategy, requests, consolidation, review, the committee, submission, the bill, allocation lines, spending plans, the ledger, transfers, carry-over, monitoring, performance and budget AI. Decisions by the Budget Bureau, the Cabinet and parliament stay outside (BGT-CR-001): Fisko prepares, exports and records them.

Outside this chapter: the duty rule engine, delegation, approval routes, fiscal years and the audit log belong to `platform`; plans and contracts belong to `procurement`; vouchers, payments and GFMIS belong to `finance`. This chapter states only what Budget needs from them.

Every SRS requirement group maps to a design section below.

| SRS group | Requirements | Design section | Main package |
| --- | --- | --- | --- |
| Business rules | BR-BGT-01 to BR-BGT-39 | Domain model | all |
| Budget today and page map | BGT-FR-001 to BGT-FR-003 | Interface design | `web` |
| Strategy and KPIs | BGT-FR-004 to BGT-FR-016 | Domain model, Data design | `strategy` |
| Requests | BGT-FR-017 to BGT-FR-038 | States and transitions, Domain model | `request` |
| Consolidation | BGT-FR-039 to BGT-FR-054 | Domain model | `consolidation` |
| Review | BGT-FR-055 to BGT-FR-066 | States and transitions, Dynamic behaviour | `review` |
| Committee and hearings | BGT-FR-067 to BGT-FR-075 | Dynamic behaviour, Security design | `review` |
| Submission | BGT-FR-076 to BGT-FR-086 | States and transitions, Interface design | `submission` |
| Parliament | BGT-FR-087 to BGT-FR-093 | Dynamic behaviour | `parliament` |
| Appropriation and lines | BGT-FR-094 to BGT-FR-104 | States and transitions, Dynamic behaviour | `allocation` |
| Spending plans and releases | BGT-FR-105 to BGT-FR-111 | Domain model | `plan` |
| Balances | BGT-FR-112 to BGT-FR-114 | Design overview, Dynamic behaviour | `ledger` |
| Transfers | BGT-FR-115 to BGT-FR-125 | States and transitions, Dynamic behaviour | `transfer` |
| Carry-over and savings | BGT-FR-126 to BGT-FR-132 | Domain model | `carryover` |
| Monitoring | BGT-FR-133 to BGT-FR-141 | Components, Non-functional design | `monitoring` |
| Performance | BGT-FR-142 to BGT-FR-155 | Domain model | `performance` |
| Budget settings | BGT-FR-156 to BGT-FR-161 | Design overview, Domain model | `settings` |
| Analysis and AI | BGT-FR-162 to BGT-FR-174 | Components, Security design | `assistant` |
| Data requirements | BGT-DR-001 to BGT-DR-010 | Data design | all |
| State rules | State tables of the SRS | States and transitions | `request`, `submission`, `allocation`, `transfer` |
| Interface requirements | BGT-IR-001 to BGT-IR-007 | Interface design | `api`, `exchange` |
| Non-functional requirements | BGT-NFR-001 to BGT-NFR-007 | Non-functional design, Security design | all |
| Constraints | BGT-CR-001 to BGT-CR-006 | Design overview | all |
| Test evidence | Sweep walks of the SRS | Test design | tests |
| Open issues | OI-BGT-01 to OI-BGT-14 | Known gaps and open issues | all |

## Design overview and decisions {#bgt-decisions}

Budget is one module of the modular monolith (ADR-0002, BGT-CR-005) and depends only on `platform`. A web request runs one command in one PostgreSQL transaction. That transaction stores the aggregate, the outbox rows and the audit entry together. Procurement and Finance call the ledger inside their own transaction. Legal state machines and limits are Java code (ADR-0007). Tenant choices are data.

| Decision | Reason | Rejected alternative | Source |
| --- | --- | --- | --- |
| One ledger table holds reservations, commitments and payments, with a balance row per line | The prototype computes them from other modules' records, which a module boundary forbids, and BPA 40 needs one strict check | Reading Procurement and Finance tables at each check; a balance kept only by events, which leaves a window | BGT-FR-113, BGT-IR-001, ADR-0002 |
| A transfer holds its amount in the ledger from the request until it ends | The prototype holds nothing at `bb`, so money can be spent twice (OI-BGT-05) | Holding only while pending, as the prototype does | BR-BGT-25, BGT-FR-117 |
| The budget request stays `approved` after internal approval, and a separate `track` value shows filed, received, in the act and allocated | Internal approval is a legal end, and later facts belong to batches and the bill | Adding the design's later states to the same machine, which mixes two owners | DG-BGT-01 |
| Round amounts live in one `review_row` with an append-only `amount_change` table | P-05 of the design: every change of an amount shows reason, person, time and round | Overwriting amounts and relying on the audit log, which holds no free text | BGT-DR-001, ADR-0015 |
| Legal limits and the transfer table sit in `BudgetRuleSet`, a code rule set by effective date. Tenant values sit in `budget_setting` per fiscal year | Tenants cannot configure an unlawful process, and a closed year keeps its rules | Every value as a tenant rule, which the prototype does | ADR-0007, BGT-CR-002, BGT-FR-161 |
| Blocking and warning checks run from one `RequestRulebook`, and the same result drives the step dots | One rule list serves the screen, the send command and AG-02 | A check in the browser and another on the server | BGT-FR-030, BGT-CR-004 |
| Totals are computed, never typed. Consolidation reads a projection of the live requests | The design's P-01: one number, one source | Copying totals at each step, as `syncBudget` rebuilds on every route | BGT-DR-003, BGT-FR-039 |
| External results are recorded by people through forms, and exchange adapters sit behind ports with a file adapter first | The formats are unknown, and the decision logic must not change when an API opens | Parsing a guessed format inside the batch logic | BGT-IR-003, ADR-0008 |
| Budget has no GFMIS adapter. Finance imports GFMIS and writes disbursement through `LineLedger` | GFMIS belongs to Finance, and `budget` cannot depend on `finance` | A second GFMIS import in Budget, as the prototype has on B8 | BGT-IR-005, DG-BGT-05 |
| Monitoring reads rebuildable projections by line and month | B8 is read often and peaks at the year end | Recomputing on every read, as `liveDash` does | BGT-FR-133, ADR-0009 |
| The year comes from `FiscalCalendar`, and time comes from one injected clock | Hard-coded years caused repeated fixes in the prototype, and the demo date must not exist in production | A tenant-level moved date | BGT-NFR-005, PLT-IR-004 |

> [!LAW] Transfer rules show how a legal limit and a tenant choice divide. `BudgetRuleSet` holds the T1 to T6 table by effective date and cites each row: BPA 35, BPA 36, BMR 26, BMR 27, BMR 28 and BMR 29. A tenant chooses who acts as the internal approver of a type, within that table. The first rule set carries the 2562 clause numbers from the design, and a budget specialist must confirm them against the second amendment of 2567 before it ships (OI-BGT-02).

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

## Components {#bgt-components}

Budget is the Spring Modulith module `budget`, under the base package chosen at build start. Only `api` and its sub-package `api.events` are named interfaces. All other packages are internal, and the boundary tests run in CI (ADR-0002).

{{fig:bgt-component | Components of the budget module and their neighbours}}

> [!NOTE] The package list, interface names and method names in this section are a proposal.

### Internal packages {#bgt-packages}

| Package | Responsibility | Main classes |
| --- | --- | --- |
| `web` | REST controllers, request records, Problem Details mapping, the Budget today read | `RequestController`, `TransferController`, `TodayController` |
| `strategy` | Strategies, goals, KPIs, links, project bank, target revisions | `Strategy`, `Kpi`, `ProjectIdea`, `TargetRevision` |
| `request` | Requests, lines, plans, readiness, documents, versions, comments, the rule book | `BudgetRequest`, `RequestRulebook`, `RequiredDocuments`, `ReadinessScore` |
| `consolidation` | Ceilings, replies, priority, duplicates, 3R, zero-based view, forward estimates | `CeilingIssue`, `PriorityScore`, `ThreeRPolicy`, `DuplicateMark`, `ForwardEstimate` |
| `review` | Routing, round amounts, meetings, votes, minutes, hearings, cut impact | `ReviewRow`, `CommitteeRouter`, `Meeting`, `Hearing`, `CutImpact` |
| `submission` | Minister approval, batches, results, revision requests, packs | `SubmissionBatch`, `MinisterApproval`, `RevisionRequest`, `PackBuilder` |
| `parliament` | Stages, the bill, cuts, appeals | `BudgetBill`, `BillCut`, `BillAppeal` |
| `allocation` | Appropriation, lines, lines from the act | `Appropriation`, `AllocationLine`, `LinesFromAct` |
| `plan` | Spending plans, versions, releases, regional allotments | `SpendingPlan`, `Release`, `RegionalAllotment` |
| `ledger` | Ledger entries, balances, locks, the published `LineLedger` | `LedgerService`, `LedgerEntry`, `LineBalance` |
| `transfer` | Transfers, classification, routing, reports | `Transfer`, `TransferClassifier`, `TransferRoute` |
| `carryover` | Carry-over requests, carried money, extensions, savings | `CarryOver`, `CarriedFund`, `Saving` |
| `monitoring` | Live projection, targets, progress reports, alerts | `LineMonth`, `ProgressReport`, `SpendAlert` |
| `performance` | KPI results, outputs, quarterly reports, cost per output, evaluations, recommendations, public summary | `Output`, `QuarterReport`, `Evaluation`, `Recommendation` |
| `settings` | Rule sets, tenant values, business rule switches, budget structure, committee, master plans | `BudgetRuleSet`, `BudgetSetting`, `StructureNode`, `CommitteeRoster` |
| `assistant` | AI tools, agents, forecasts, what-ifs, KPIs, signals, anomalies | `ToolRegister`, `AgentRunner`, `YearForecast`, `SignalDetector` |
| `exchange` | Ports and file adapters for e-Budgeting, BBL and BB EvMIS | `BudgetBureauExchange`, `EvmisExport` |

### Published interfaces {#bgt-published}

This table answers the requests in the Procurement chapter (DG-PRC-08) and the Modules chapter. `LineLedger` and `BudgetRequestQuery` are confirmed with the methods Procurement asked for, and with the additions below.

| Interface | Used by | Purpose | Requirements |
| --- | --- | --- | --- |
| `LineLedger` | `procurement`, `finance` | Read a line, `room`, `reserve`, `release`, `commit`, `adjustCommitment`, and for Finance `recordCommitment`, `recordPayment`, `recordDisbursement` | BGT-IR-001, BR-PRC-04, BR-BGT-30 |
| `BudgetRequestQuery` | `procurement` | Reviewed request items for demand and next year's plan | BGT-IR-002, PRC-FR-009, PRC-FR-010 |
| `AllocationQuery` | `procurement`, `finance`, `projects`, `review` | Lines of a year with amount and structure, with no personal fields | BGT-IR-001, PRC-IR-006 |
| `BudgetReadModel` | `projects`, `review` | Strategies, requests, KPI results, spending by line | BGT-IR-006 |
| Events in `api.events` | Any module, and RabbitMQ through the outbox | The event catalogue in the interface section | ADR-0008 |

### Dependencies on other modules {#bgt-dependencies}

| Module | Interface needed | Used for | Requirements |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `SodGuard` | Tenant binding, authority, acting on behalf, SD-09 and SD-10 | ADR-0006, BGT-FR-124 |
| `platform` | `AuditLog`, `Notifier`, `WorkingCalendar`, `FiscalCalendar` | Audit entries, tasks, day counts, year and open status | BGT-NFR-001, BGT-NFR-003, BR-BGT-36 |
| `platform` | `ApprovalRoutes`, `StandardPrices` | The route step `w3` and price checks | BR-BGT-14, BR-BGT-05 |
| `platform` | `DocumentService`, `FileStore`, `AiGateway`, `SearchIndexer` | Packs and minutes, files with scanning, AI calls, search | BGT-DR-007, ADR-0010, ADR-0016 |
| `procurement`, `finance` | None at compile time | They depend on `budget.api`. Facts reach Budget through ledger calls and events | BGT-CR-005 |

This confirms the direction proposed in the Modules chapter: `budget` depends only on `platform`, and `procurement` and `finance` depend on `budget`.

## Domain model {#bgt-domain}

<!-- covers: BPA 26; BPA 35; BPA 36; BPA 40; BPA 43; BMR 9; BMR 15; BMR 16; BMR 25 -->

The domain classes are plain Java with no Spring or JPA imports. Each command loads one aggregate, calls a method that checks its rules, and saves. Names follow the prototype fields where a field carries over.

{{fig:bgt-class | Budget aggregates and their parts}}

> [!NOTE] The aggregates, class names and error codes in this section are a proposal.

### Aggregates and invariants {#bgt-aggregates}

| Aggregate | Parts | Invariants held |
| --- | --- | --- |
| `Strategy` | Goals, KPIs, links | Deleted only when empty; retired otherwise; a retired node keeps its name where used |
| `ProjectIdea`, `TargetRevision` | Scores; decision | The owning unit edits only while proposed; an approved revision changes the target once |
| `BudgetRequest` | Lines, quarter plan, readiness, risks, documents, versions, comments | Editable only as draft or returned; number never reused; a sent request is never deleted; a quarter plan adds up to the amount before sending |
| `CeilingIssue` | Unit ceilings, replies | Editable until issued; a new version clears replies; withdrawn only with no reply |
| `ReviewRow` | Amount changes | One row per request in review; every change appends a row with a reason |
| `Meeting` | Attendance, votes, resolutions, minutes | One scheduled at a time; held only with a quorum; certified minutes never change |
| `SubmissionBatch` | Requests, results, revision requests | One in preparation; a request sits in one live batch; a result is at most the amount sent; closes only with no open revision |
| `BudgetBill` | Stages, items, cuts, appeals | One per fiscal year; items fix at the committee stage; a cut is at most the item; an appeal at most the cut; restored at most the amount asked |
| `Appropriation`, `AllocationLine` | Lines, plans | Active lines stay within each budget type; a line never falls below its floor; a line in a closed year never changes |
| `SpendingPlan` | Monthly amounts, versions | Months add up to the line; each version is immutable and names a reason |
| `LineBalance` | Ledger entries | Reserved, committed and held never pass the amount; entries are append-only |
| `Transfer` | Decision records | Holds its amount until it ends; the type is fixed from the lines at each edit; the preparer never approves |
| `CarryOver`, `CarriedFund` | Payments, extension | Meets BR-BGT-32; one extension; paid never passes the amount |
| `QuarterReport` | Items, evidence | One per round and unit; sent only with every result; accepted reports do not change |

### Value objects and enumerations {#bgt-values}

| Type | Values | Notes |
| --- | --- | --- |
| `Money` | `BigDecimal` in baht | Whole baht per BGT-DR-006, see DG-BGT-02 |
| `BudgetType` | `per`, `ope`, `inv`, `sub`, `oth` | Held by `platform`, PLT-FR-102 |
| `RequestStatus` | `draft`, `unit`, `plan`, `committee`, `exec`, `approved`, `returned`, `rejected`, `cancelled` | The SRS state table |
| `RequestTrack` | `none`, `filed`, `received`, `in_act`, `allocated` | Set by batch, bill and line events, DG-BGT-01 |
| `TransferType` | `T1`, `T2`, `T3`, `T4`, `T5`, `T6` | T5 is new; refused unless an Act is cited |
| `TransferReason` | `fix`, `eff`, `qual`, `staff`, `tech` | BMR 25 |
| `PlanChangeReason` | `target`, `transfer`, `policy` | BMR 15 |
| `LedgerKind` | `reserve`, `release`, `commit`, `uncommit`, `hold`, `unhold`, `payment`, `disbursement` | `hold` is the transfer hold |
| `VoteChoice` | `approve`, `reduce`, `defer`, `reject` | Member votes and meeting resolutions |

### Where each business rule is enforced {#bgt-rule-map}

The server enforces every rule below. Screens may repeat a check to help the user, and they are never the control (ADR-0006, BGT-CR-004). A rule with a switch reads `budget_setting`, and a legal limit reads `BudgetRuleSet`.

| Rule | Subject | Enforced in | Error code |
| --- | --- | --- | --- |
| BR-BGT-01 to BR-BGT-13 | Request checks | `RequestRulebook.run`, `BudgetRequest.send` | `BGT_CHECK_FAILED` |
| BR-BGT-14 | Committee route | `CommitteeRouter.next` | None, routes |
| BR-BGT-15, BR-BGT-16 | Quorum and abstention | `Meeting.resolve`, `Meeting.vote`, `SodGuard` | `BGT_NO_QUORUM`, `BGT_SOD_BLOCKED` |
| BR-BGT-17 | Cut impact | `CutImpact.of` | None, computed |
| BR-BGT-18, BR-BGT-19 | Priority and readiness | `PriorityScore`, `ReadinessScore` | None, computed |
| BR-BGT-20 to BR-BGT-22 | 3R and rolled-over | `ThreeRPolicy.assess` | None, advice |
| BR-BGT-23 | Minister before sending | `SubmissionBatch.send` | `BGT_MINISTER_REQUIRED` |
| BR-BGT-24 | Bill amounts | `BudgetBill.start`, `BudgetBill.finalAmount` | `BGT_STATE_CONFLICT` |
| BR-BGT-25, BR-BGT-30 | Available amount | `LedgerService`, row lock on `line_balance` | `BGT_LINE_ROOM_EXCEEDED` |
| BR-BGT-26 to BR-BGT-28 | Transfer type, route, reason | `TransferClassifier`, `TransferRoute`, `Transfer.request` | `BGT_TRANSFER_NOT_ALLOWED` |
| BR-BGT-29 | Plan deadline and reasons | `SpendingPlan.send`, `SpendingPlan.newVersion` | None, warns |
| BR-BGT-31 | Regional allotment | `RegionalAllotment`, task sweep | None, adds a task |
| BR-BGT-32 | Carry-over | `CarryOver.file`, `CarriedFund.extend` | `BGT_CARRYOVER_INVALID` |
| BR-BGT-33 | Report due dates | `ReportRound.open` | None, marks lateness |
| BR-BGT-34 | Delete, withdraw, cancel | Each aggregate | `BGT_REASON_REQUIRED`, `BGT_STATE_CONFLICT` |
| BR-BGT-35 | Used lines | `AllocationLine.cancel`, `LedgerService.floor` | `BGT_LINE_IN_USE` |
| BR-BGT-36 | Closed year | `FiscalCalendar.isOpen`, in each allocation command | `PLT_YEAR_CLOSED` |
| BR-BGT-37 | Numbers never reused | `NumberSeries.next`, a row-locked counter that deletes never rewind | None |
| BR-BGT-38 | Retiring master data | `Strategy`, `Kpi`, `Output`, `StructureNode` | `BGT_IN_USE` |
| BR-BGT-39 | AI limits | `ToolRegister`, which holds no approval, vote or filing tool | `BGT_AI_NOT_ALLOWED` |

### Limits in code and tenant settings {#bgt-limits}

Each setting has a range in `SettingRange` and a value in `budget_setting`, per fiscal year. Values come from the business rules of the SRS. `BudgetRuleSet` is versioned by effective date, and a request or transfer stores the version it used (BGT-FR-161, ADR-0007). A range marked proposal is for the budget specialist to confirm (OI-BGT-03).

| Setting | Holder and range | Default | Rule |
| --- | --- | --- | --- |
| `BR-09` | Rule set; the amount is cited to BPA 26 | 1,000 million baht | BR-BGT-09 |
| `BR-10`, `corruptionRiskMin` | Rule set, proposal | 200 and 500 million baht | BR-BGT-10 |
| `planDaysBefore`, `regionalDays`, `reportDays`, `quarterReportDays`, `annualReportDays` | Rule set, cited to BMR 9, BMR 21, BMR 29, BMR 34 | 15, 15, 15, 15, 45 | BR-BGT-27, BR-BGT-29, BR-BGT-31, BR-BGT-33 |
| `carryMonths`, `extendMonths` | Rule set, cited to BPA 43 | 6, 6 | BR-BGT-32 |
| `BR-02` | Tenant, 0 or more characters, proposal | 40 | BR-BGT-02 |
| `BR-04`, `BR-11` | Tenant, 0 to 100 percent, proposal | 20, 20 | BR-BGT-04, BR-BGT-11 |
| `BR-08`, `BR-12`, `BR-13` | Tenant, proposal: 1 or more years, 1 or more years, 1 to 5 | 5, 2, 3 | BR-BGT-08, BR-BGT-12, BR-BGT-13 |
| `w3Amount`, `quorum` | Tenant: 0 or more baht in the route; 1 to 100 percent, proposal | 10,000,000; 50 | BR-BGT-14, BR-BGT-15 |
| Criteria weights | Tenant, each 0 to 100, proposal: total 100 | 25, 20, 20, 20, 15 | BR-BGT-18 |
| `r3.*`, `sig.*`, `fc.*`, `targets.*` | Tenant, 0 to 100 as the screen accepts | As in the SRS | BR-BGT-20, BR-BGT-22, BGT-FR-160 |

## States and transitions {#bgt-states}

State names are those of the SRS. Each transition is a method on the aggregate. The method checks the current state against a transition table, runs the guards and records the event.

### Budget request {#bgt-state-request}

{{fig:bgt-state-request | States of a budget request}}

| From | To | Command | Guard | Event |
| --- | --- | --- | --- | --- |
| draft, returned | unit | `BudgetRequest.send` | Owner; no block check fails | `request.sent` |
| unit | plan | `directorApprove` | Director of the same unit; version saved | `request.director-approved` |
| plan | committee, exec | `forward` | Planning; BR-BGT-14 | `request.forwarded` |
| committee | approved | `Meeting.resolve` | Quorum; resolution approve or reduce; decided amount stored | `request.approved` |
| exec | approved | `approve` | Executive; decided amount from round 3 | `request.approved` |
| unit, plan, committee, exec | returned | `returnForRevision` | An open comment; or a deferred resolution | `request.returned` |
| committee | rejected | `Meeting.resolve` | Resolution rejects | `request.rejected` |
| unit, plan, committee, exec | draft | `withdraw` | Owner; reason; review row closes | `request.withdrawn` |
| draft, returned | cancelled | `cancel` | Owner; was sent; reason | `request.cancelled` |
| draft | (deleted) | `deleteDraft` | Owner; never sent; number kept | None |

> [!NOTE] The executive may also reject a request. The prototype has no reject button at `exec`, and the SRS table follows the prototype. DG-BGT-03 asks whether this path is needed.

### Submission batch {#bgt-state-batch}

{{fig:bgt-state-batch | States of a submission batch}}

| From | To | Command | Guard | Event |
| --- | --- | --- | --- | --- |
| (none) | prep | `SubmissionBatch.prepare` | None in preparation; requests pass the checks | None |
| prep | sent | `send` | Minister approval recorded (BPA 25) | `batch.sent` |
| prep | cancelled | `cancel` | Reason; requests wait again | None |
| sent | reviewing | `recordReceipt` | Planning | None |
| reviewing | result | `saveResults` | Each result at most the amount sent | `batch.result-recorded` |
| result | closed | `close` | No open revision request | `batch.closed` |

### Allocation line {#bgt-state-line}

{{fig:bgt-state-line | States of an allocation line}}

| From | To | Command | Guard | Event |
| --- | --- | --- | --- | --- |
| (none) | draft | `AllocationLine.draft`, `LinesFromAct.build` | Year open; amount rules | None |
| draft | active | `confirm` | Room left on the budget type | `line.confirmed` |
| draft | (deleted) | `deleteDraft` | Number kept | None |
| active | active | `changeAmount` | Reason; between the floor and the room; plan rescaled | `line.changed` |
| active | cancelled | `cancel` | Reason; floor is zero; amount 0; record kept | `line.cancelled` |

### Transfer {#bgt-state-transfer}

{{fig:bgt-state-transfer | States of a budget transfer}}

| From | To | Command | Guard | Event |
| --- | --- | --- | --- | --- |
| (none) | pending | `Transfer.request` | Different lines; within available; reason of BMR 25; `hold` written | `transfer.requested` |
| pending | approved | `approve`, T1 | Approver of the type; SD-09; moves the money; report date set | `transfer.effective` |
| pending | bb | `approve`, T2, T3, T6 | Approver of the type; SD-09; `hold` stays | `transfer.approved` |
| bb | approved | `recordAgreement` | Moves the money; `unhold` written | `transfer.effective` |
| pending, bb | rejected | `reject`, `recordRefusal` | Reason; `unhold` written | `transfer.rejected` |
| pending | withdrawn | `withdraw` | Reason; `unhold` written | None |

T4 has no approve method, and T5 is refused at `request` unless the request cites an Act. A pending T4 shows as blocked, as in the SRS. A transfer moves money only inside `LedgerService`, which locks the two balance rows in line id order, so two opposite transfers cannot deadlock.

| Record | States | Enforced in | Note |
| --- | --- | --- | --- |
| Idea, target revision | As the SRS | `ProjectIdea`, `TargetRevision` | Plain tables |
| Meeting, hearing | scheduled, held, cancelled | `Meeting`, `Hearing` | Certified minutes lock |
| Release, carry-over request | pending, approved, rejected, withdrawn | `Release`, `CarryOver` | Approved carry-over creates a `CarriedFund` and next year's line |
| Carried money | open, extension, extended, closed | `CarriedFund` | Due date from `carryMonths` |
| Quarterly report | draft, submitted, accepted, returned | `QuarterReport` | Evidence certification is a separate fact |

## Dynamic behaviour {#bgt-dynamic}

<!-- covers: BPA 25; BPA 36; BMR 26; BMR 29 -->

### The cycle from strategy to results {#bgt-activity}

The activity shows the normal route of one budget year. Three such years overlap at any time, so each record carries its fiscal year and no screen assumes one.

{{fig:bgt-activity-cycle | The budget cycle from strategy to results}}

### From sending a request to the resolution {#bgt-seq-review}

Each step is its own command, and a request can leave the route at any step by return, withdrawal or rejection.

{{fig:bgt-seq-review | From sending a request to the committee resolution}}

- `BudgetRequest.send` runs `RequestRulebook` and refuses with the first failed block check (BGT-FR-030). Warnings stay on the request.
- A review row opens when the director approves. Planning changes round 2 and the executive changes round 3, each with an `amount_change` row (BGT-FR-059).
- A vote is saved per member. `Meeting.vote` refuses a member from the requesting unit through `SodGuard` with SD-10 and logs it, which the prototype does not do (OI-BGT-06).
- `Meeting.resolve` runs in one transaction for the whole agenda. If one item fails, nothing is saved. A cut stores `cut_impact` and scales the quarter plan (BR-BGT-17).
- Minutes render after commit from an outbox event through `DocumentService`, and certification locks the text (BGT-FR-074).

### From the result to allocation lines {#bgt-seq-act}

People record each outside decision. The chain of amounts is: decided amount, batch result, bill amount, final amount, line amount. Each step reads only the one before it (BR-BGT-24).

{{fig:bgt-seq-act-lines | From the Budget Bureau result to allocation lines}}

- The bill starts only after a batch closes (BGT-FR-087), and its items fix when the committee stage starts.
- `LinesFromAct.build` creates the appropriation, one draft line per request under its largest budget type, and a monthly plan spread from the quarter plan (BGT-FR-095, BGT-FR-096). Personnel requests left out of the bill use their batch result.
- A request with several budget types becomes one line in the prototype, which loses the split. DG-BGT-04 proposes one line per budget type.
- The command is safe to repeat: lines key on request and fiscal year, and the update path brings drafts to the act's amounts (BGT-FR-097).

### A transfer and the ledger {#bgt-seq-transfer}

{{fig:bgt-seq-transfer | A budget transfer and the ledger}}

- The hold counts against `room` from the request, which closes OI-BGT-05, so Procurement cannot reserve held money.
- `SodGuard` runs SD-09 on the person approving and on anyone whose authority they hold (BGT-FR-124). An agent's draft names the person who approved the step as preparer.
- On effect the amounts and both spending plans change in one transaction, and the event tells Finance and the monitoring projection.
- If the two lines have different budget types, the appropriation's type totals change too. The budget specialist must confirm when that is lawful (DG-BGT-06).

### Scheduled work {#bgt-jobs}

Jobs run per cell and work tenant by tenant, each with the tenant bound as for a web request. Each job is safe to run twice, and a lock lets one instance run it at a time.

| Job | Does | Requirements |
| --- | --- | --- |
| Deadline sweep | Tasks for plan sending, regional allotments, T1 reports, carried money and report rounds | BR-BGT-29, BR-BGT-31, BGT-FR-123, BGT-FR-128 |
| Report rounds | Opens each quarter's round from `FiscalCalendar` | BGT-FR-145 |
| Signal detection | Runs BF-01 to BF-06 and updates anomalies | BGT-FR-170, BGT-FR-171 |
| Monitoring projection | Rebuilds `line_month` after events, and on demand | BGT-FR-133 |
| Retention | Applies the schedule of ADR-0014 to ended records | BGT-DR-010 |

## Data design {#bgt-data}

<!-- covers: PDPA 39 -->

Tables live in the schema `budget` of the cell's PostgreSQL cluster (ADR-0005). Other modules never read them; they use `budget.api`. Common rules are those of the Procurement chapter: `tenant_id` first in every key, forced row-level security, `*_ref` columns for people, `numeric` money, and no hard delete of a record with a status.

> [!NOTE] Every table, column, type and index in this section is a proposal. The tables are the logical design, and the data dictionary chapter will hold the final columns.

{{fig:bgt-er | Core budget tables. The full list follows.}}

### Tables {#bgt-data-tables}

Class is the ADR-0013 class of the row as a whole. Retention key is the entry in the schedule of ADR-0014. No period is stated, because OI-BGT-10 is open.

| Table | Key columns | Class | Retention key | Requirements |
| --- | --- | --- | --- | --- |
| `strategy`, `goal`, `kpi`, `kpi_target`, `kpi_activity` | `fy`, `name`, `nat`, `mp`, `min_share`, `retired_at`; `unit`, `owner_unit_id`, `base`, `formula`; `year`, `target` | Internal | `bgt.plan` | BGT-FR-004 to BGT-FR-009 |
| `project_idea`, `target_revision` | `no`, `unit_id`, `kpi_id`, `name`, `estimate`, `years`, `status`, `scores`; `year`, `from_value`, `to_value`, `why`, `status` | Internal | `bgt.plan` | BGT-FR-010 to BGT-FR-014 |
| `budget_request` | `fy`, `no`, `unit_id`, `activity_id`, `status`, `track`, `prev_amount`, `amount`, `decided`, `reason`, `kpi_text`, `multi`, `zbb_ask`, `zbb_note`, `sent_once`, `rule_set_version` | Internal | `bgt.request` | BGT-FR-017 to BGT-FR-036 |
| `request_line`, `request_year`, `request_quarter` | `type`, `name`, `qty`, `unit_name`, `price`, `location`, `lat`, `lng`, `price_source`, `price_date`; `year`, `amount`; `quarter`, `amount` | Internal | `bgt.request` | BGT-FR-020, BGT-FR-023, BGT-FR-025, BGT-FR-028 |
| `request_readiness`, `request_risk` | `site`, `staff`, `mgmt`, `mat`, `forest`, `eia`, `evals`; `type`, `level`, `fix` | Internal | `bgt.request` | BGT-FR-024 |
| `request_document` | `kind`, `file_key`, `name` | Confidential | `bgt.request` | BGT-FR-026, BGT-FR-027, BGT-DR-007 |
| `request_version`, `request_comment`, `request_payroll` | `version_no`, `snapshot` (jsonb), `why`; `line_key`, `text`, `author_ref`, `resolved_at`; `rows` (jsonb) | Confidential | `bgt.request` | BGT-DR-002, BGT-FR-029, BGT-FR-057 |
| `ceiling_issue`, `unit_ceiling`, `ceiling_reply` | `fy`, `ceiling`, `project_ceiling`, `issued_on`, `due_on`, `version_no`; `unit_id`, `amount`; `state`, `amount`, `why` | Internal | `bgt.request` | BGT-FR-040 to BGT-FR-045 |
| `priority_score`, `criterion`, `duplicate_mark` | `request_id`, `criterion_id`, `value`; `name`, `weight`; `keep_id`, `merge_id`, `overlap`, `state` | Internal | `bgt.request` | BGT-FR-046 to BGT-FR-049 |
| `review_row`, `amount_change` | `request_id`, `requested`, `round2`, `round3`; `round`, `from_amount`, `to_amount`, `why`, `actor_ref`, `at` | Internal | `bgt.request` | BGT-FR-059, BGT-DR-001 |
| `meeting`, `meeting_member`, `vote`, `resolution` | `no`, `held_on`, `place`, `status`, `minutes`, `certified_at`; `subject_ref`, `present`; `request_id`, `choice`, `abstained`; `amount`, `note`, `cut_impact` (jsonb) | Confidential | `bgt.meeting` | BGT-FR-067 to BGT-FR-074 |
| `hearing`, `hearing_question` | `unit_id`, `held_on`, `who`, `status`; `question`, `answer` | Internal | `bgt.meeting` | BGT-FR-075 |
| `minister_approval`, `submission_batch`, `batch_request`, `batch_result`, `revision_request` | `fy`, `letter_no`, `on_date`; `no`, `status`, `channel`, `simulated`; `request_id`, `amount`; `amount`; `no`, `due_on`, `issue`, `reply` | Internal | `bgt.submission` | BGT-FR-076 to BGT-FR-084 |
| `budget_bill`, `bill_stage`, `bill_item`, `bill_cut`, `bill_appeal` | `fy`, `stage`; `stage_no`, `on_date`; `request_id`, `amount`; `amount`, `why`; `amount`, `why`, `restored`, `withdrawn_at` | Internal | `bgt.submission` | BGT-FR-087 to BGT-FR-093 |
| `appropriation`, `appropriation_type` | `fy`, `act`, `act_on`, `from_act`; `type`, `amount` | Internal | `bgt.line` | BGT-FR-094 |
| `allocation_line` | `fy`, `no`, `unit_id`, `name`, `type`, `activity_id`, `request_id`, `amount`, `status`, `new_project`, `extended`, `secret_fund`, `cancel_amount`, `cancel_why` | Internal | `bgt.line` | BGT-FR-098 to BGT-FR-103, BGT-DR-004 |
| `spending_plan`, `plan_month`, `plan_sent` | `line_id`, `version_no`, `reason`, `note`; `month`, `amount`; `fy`, `sent_on` | Internal | `bgt.line` | BGT-FR-105 to BGT-FR-107 |
| `release`, `regional_allotment` | `no`, `quarter`, `type`, `amount`, `status`, `letter_no`; `line_id`, `due_on`, `sent_on` | Internal | `bgt.line` | BGT-FR-108 to BGT-FR-110 |
| `line_balance`, `ledger_entry` | `line_id`, `amount`, `reserved`, `committed`, `held`, `paid`; `kind`, `amount`, `source_module`, `source_ref`, `at` | Internal | `bgt.ledger` | BGT-FR-112 to BGT-FR-114, BGT-IR-001 |
| `line_disbursement` | `line_id`, `month`, `amount`, `source`, `import_ref` | Internal | `bgt.ledger` | BGT-IR-005 |
| `transfer` | `fy`, `no`, `from_line`, `to_line`, `amount`, `type`, `reason`, `why`, `status`, `report_due`, `reported_on`, `bureau_on`, `act_ref`, `prepared_by_ref`, `decided_by_ref`, `rule_set_version` | Internal | `bgt.line` | BGT-FR-115 to BGT-FR-125 |
| `carry_over`, `carried_fund`, `carried_payment`, `saving` | `no`, `line_id`, `amount`, `po`, `po_on`, `status`; `due_on`, `paid`, `status`; `amount`, `on_date`; `contract_ref`, `amount`, `use` | Internal | `bgt.line` | BGT-FR-126 to BGT-FR-132 |
| `progress_report`, `spend_alert` | `line_id`, `month`, `pct`, `status`, `issue`, `next_amount`; `kind`, `acknowledged_by_ref` | Internal | `bgt.result` | BGT-FR-137, BGT-FR-139 |
| `line_month` | `line_id`, `month`, `plan`, `actual`, `reserved`, `committed` | Internal | Rebuildable | BGT-FR-133 |
| `output`, `kpi_result`, `report_round`, `quarter_report`, `report_item`, `report_evidence` | `line_id`, `name`, `unit`, `target`, `retired_at`; `result`; `round`, `due_on`; `status`, `sent_at`, `certified_on`; `result`, `problem`, `fix`; `file_key` | Internal | `bgt.result` | BGT-FR-142 to BGT-FR-150 |
| `evaluation`, `recommendation`, `public_summary` | `no`, `proj`, `scores`, `findings`, `lessons`, `status`; `no`, `text`, `source`, `unit_id`, `due_on`, `status`, `action`, `idea_id`; `fy`, `approved_on` | Internal | `bgt.result` | BGT-FR-151 to BGT-FR-155 |
| `structure_node`, `committee_roster`, `master_plan`, `budget_setting`, `rule_switch` | `fy`, `level`, `code`, `name`, `parent_id`, `retired_at`; `subject_ref`, `role`; `name`; `key`, `value`, `fy`; `rule_id`, `on`, `effect` | Internal | `bgt.config` | BGT-FR-156 to BGT-FR-161 |
| `agent_run`, `ai_use`, `scenario`, `anomaly` | `agent`, `steps`, `status`; `tool`, `user_ref`, `target`, `version`; `name`, `kind`, `params` (jsonb), `owner_ref`; `kind`, `risk`, `status`, `note`, `reopened` (jsonb) | Confidential | `bgt.ai` | BGT-FR-163 to BGT-FR-171 |
| `number_series`, `number_log` | `doc_type`, `fy`, `last_no`; `no`, `ref` | Internal | `bgt.config` | BR-BGT-37, BGT-DR-005 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | Short, set with the platform | ADR-0008 |

### Personal and restricted fields {#bgt-data-fields}

This table feeds the data dictionary and the records of processing (ADR-0014, PDPA 39, BGT-DR-009). The legal basis of each field is for the data protection officer to confirm. Budget holds little personal data, and the main class is names of staff in records.

| Field | Class | Protection | Rule |
| --- | --- | --- | --- |
| `*_ref` columns | Confidential | Pseudonymous reference; the name sits in the platform subject table | Reports show a placeholder after erasure (ADR-0015) |
| `vote.choice` | Confidential | Role-based access, never indexed for search | BGT-NFR-007 |
| `request_payroll.rows` | Confidential, possibly Restricted | Summary rows only; no national ID | DG-BGT-07 |
| `report_evidence`, `request_document` files | Possibly Restricted | ClamAV scan, tenant keys, no text indexed | A photo or document may show a person |

### Files, search and retention {#bgt-data-files}

- Request documents, report evidence, packs and minutes are objects in S3 API storage, linked by `file_key` (BGT-DR-007, ADR-0010).
- OpenSearch indexes requests, lines and KPIs by name and number, with each query filtered by tenant on the server (ADR-0009). Votes are never indexed.
- Each retention key names one schedule row in `platform`. The tenant setting and its allowed range wait for OI-BGT-10.

## Interface design {#bgt-interfaces}

The REST API is described in OpenAPI 3.1 (ADR-0003), and the events in AsyncAPI (ADR-0008). The tenant comes from the token and never from the path. State-changing calls carry `If-Match` with the aggregate version.

### REST endpoints {#bgt-rest}

> [!NOTE] This endpoint list is a proposal. Paths are relative to `/api/v1/budget`, and the authority names are defined in the security section.

| Method and path | Purpose | Authority | Requirements |
| --- | --- | --- | --- |
| `GET /today` | Tasks, calendar and alerts for the role | `bgt.read` | BGT-FR-001 |
| `GET, POST, PUT, DELETE /strategies, /goals, /kpis`; `POST .../{id}/retire` | Strategy tree and KPIs | `bgt.strategy` | BGT-FR-004 to BGT-FR-009 |
| `GET, POST, PUT /ideas`; `POST /ideas/{id}/score, accept, decline, withdraw, convert` | Project bank | `bgt.idea`, `bgt.strategy` | BGT-FR-010 to BGT-FR-012 |
| `GET, POST, PUT /target-revisions`; `POST /target-revisions/{id}/approve, reject, withdraw` | Target revisions | `bgt.strategy`, `bgt.approve` | BGT-FR-013, BGT-FR-014 |
| `GET, POST /requests`; `GET, PUT, DELETE /requests/{id}`; `GET /requests/{id}/checks` | Request records and the rule result | `bgt.request` | BGT-FR-017 to BGT-FR-032 |
| `POST, DELETE /requests/{id}/documents` | Documents | `bgt.request` | BGT-FR-026, BGT-FR-027 |
| `POST /requests/{id}/send, withdraw, cancel` | Owner actions | `bgt.request` | BGT-FR-033 to BGT-FR-036 |
| `POST /requests/{id}/director-approve, return, forward, approve` | Reviewer actions | `bgt.director`, `bgt.review`, `bgt.approve` | BGT-FR-037, BGT-FR-056, BGT-FR-058, BGT-FR-063 |
| `POST, PUT, DELETE /requests/{id}/comments` | Comments | `bgt.review` | BGT-FR-057 |
| `GET, PUT /ceilings`; `POST /ceilings/issue, reissue, withdraw`; `POST /ceilings/replies`; `POST /ceilings/replies/{unit}/grant, decline` | Ceilings and replies | `bgt.consolidate`, `bgt.request` | BGT-FR-040 to BGT-FR-045 |
| `GET, PUT /priority`; `GET /three-r`; `POST /three-r/apply`; `GET, POST, PUT, DELETE /duplicates`; `POST /duplicates/{id}/merge, dismiss`; `POST /requests/{id}/zero-based-ask`; `GET /forward-estimates` | Consolidation tools | `bgt.consolidate` | BGT-FR-046 to BGT-FR-054 |
| `GET /review/queue`; `GET, PUT /review/rows`; `POST /review/forward-all`, `POST /review/approve-all` | Queue and round amounts | `bgt.review`, `bgt.approve` | BGT-FR-055, BGT-FR-059 to BGT-FR-062 |
| `GET, POST, PUT /meetings`; `POST /meetings/{id}/cancel, resolve, certify`; `PUT /meetings/{id}/votes`, `PUT /meetings/{id}/attendance` | Meetings | `bgt.meeting`, `bgt.vote` | BGT-FR-067 to BGT-FR-074 |
| `GET, POST, PUT /hearings`; `POST /hearings/{id}/cancel, answer` | Hearings | `bgt.meeting`, `bgt.request` | BGT-FR-075 |
| `PUT /minister-approval`; `GET, POST, PUT /batches`; `POST /batches/{id}/send, cancel, record-receipt, close`; `PUT /batches/{id}/results` | Batches | `bgt.submit` | BGT-FR-076 to BGT-FR-083 |
| `GET, POST, PUT, DELETE /revision-requests`; `POST /revision-requests/{id}/reply` | Revision requests | `bgt.submit` | BGT-FR-082 |
| `GET /packs/{fy}`; `GET /exports/{kind}`; `GET /briefing/{fy}` | Pack, export and briefing | `bgt.submit` | BGT-FR-084 to BGT-FR-086, BGT-IR-003 |
| `GET /bill`; `POST /bill/stages/next, back`; `POST, PUT, DELETE /bill/cuts`; `POST, PUT /bill/appeals`; `POST /bill/appeals/{id}/withdraw` | The bill | `bgt.submit` | BGT-FR-087 to BGT-FR-093 |
| `GET, PUT /appropriations/{fy}`; `POST /appropriations/{fy}/lines-from-act, sync-to-act` | Appropriation | `bgt.allocate` | BGT-FR-094 to BGT-FR-097 |
| `GET, POST /lines`; `GET, PUT, DELETE /lines/{id}`; `POST /lines/{id}/confirm, cancel`; `GET /lines/{id}/balance` | Lines and balances | `bgt.allocate`, `bgt.read` | BGT-FR-098 to BGT-FR-103, BGT-FR-112 |
| `GET, POST /lines/{id}/plan-versions`; `DELETE /lines/{id}/plan-versions/latest`; `POST /plans/{fy}/send` | Spending plans | `bgt.allocate`, `bgt.plan` | BGT-FR-105 to BGT-FR-107 |
| `GET, POST, PUT /releases`; `POST /releases/{id}/record, refuse, withdraw`; `POST /lines/{id}/regional-sent` | Releases and regional allotments | `bgt.allocate` | BGT-FR-108 to BGT-FR-110 |
| `GET, POST, PUT /transfers`; `POST /transfers/{id}/approve, reject, withdraw, record-agreement, record-refusal, mark-reported`; `POST /transfers/classify` | Transfers | `bgt.allocate`, `bgt.transfer.t1`, `bgt.approve` | BGT-FR-115 to BGT-FR-125 |
| `GET, POST, PUT /carry-overs`; `POST /carry-overs/{id}/approve, reject, withdraw`; `POST /carried/{id}/payments, ask-extension, approve-extension`; `GET /savings`; `POST /savings/{id}/keep, move, reverse` | Carry-over and savings | `bgt.allocate`, `bgt.approve` | BGT-FR-126 to BGT-FR-132 |
| `GET /monitoring/live, drill, forecast, alerts`; `POST /alerts/{id}/acknowledge`; `PUT /lines/{id}/progress` | Monitoring | `bgt.read`, `bgt.report` | BGT-FR-133 to BGT-FR-140 |
| `GET, PUT /kpi-results`; `GET, POST, PUT /outputs`; `GET /report-rounds`; `PUT /reports/{round}/{unit}`; `POST /reports/{round}/{unit}/send, accept, return, certify` | Results and reports | `bgt.report`, `bgt.accept`, `bgt.certify` | BGT-FR-142 to BGT-FR-149 |
| `GET /cost-per-output`; `GET, POST, PUT /evaluations`; `GET, POST, PUT /recommendations`; `POST /recommendations/{id}/to-idea`; `POST /public-summary/approve` | Evaluation and recommendations | `bgt.report`, `bgt.accept` | BGT-FR-150 to BGT-FR-155 |
| `GET, PUT /settings`; `GET, PUT /rules`; `GET, POST, PUT /structure`; `GET, PUT /master-data` | Administration | `bgt.admin` | BGT-FR-156 to BGT-FR-161 |
| `GET /analytics/forecast, kpis, signals`; `POST /what-if`; `GET, POST, PUT, DELETE /scenarios`; `POST /anomalies/{id}/close, escalate, reopen` | Analysis | `bgt.read`, `bgt.audit` | BGT-FR-167 to BGT-FR-172 |
| `POST /ai/{tool}`; `POST /agents/{agent}/runs`; `POST /agent-runs/{id}/steps/{n}/approve, reject`; `POST /agent-runs/{id}/cancel` | AI tools and agents | `bgt.ai`, plus the authority of the action | BGT-FR-162 to BGT-FR-166, BGT-FR-173 |

### Error catalogue {#bgt-errors}

> [!NOTE] These codes are a proposal. Errors are Problem Details with a `code` field and, for a refused send, the first failed check. Text is in the user's language.

| Code | HTTP | Meaning | Rule or requirement |
| --- | --- | --- | --- |
| `BGT_INVALID_INPUT` | 400 | A field fails validation | BGT-FR-099 |
| `BGT_REASON_REQUIRED` | 400 | A reason is missing or too short | BR-BGT-34, BGT-FR-060 |
| `BGT_FORBIDDEN` | 403 | The user lacks the authority | ADR-0006 |
| `BGT_SOD_BLOCKED` | 403 | A duty rule refuses this person, and the attempt is logged | BGT-FR-124, BGT-FR-070 |
| `BGT_AI_NOT_ALLOWED` | 403 | The tool is off, or the request is outside the AI limits | BR-BGT-39 |
| `BGT_NOT_FOUND` | 404 | The record does not exist or belongs to another tenant or unit | ADR-0005, BGT-NFR-007 |
| `BGT_VERSION_CONFLICT` | 409 | The record changed since it was read | ADR-0005 |
| `BGT_STATE_CONFLICT` | 409 | The action does not apply to the current state | BGT-CR-004 |
| `BGT_CHECK_FAILED` | 409 | A block check fails | BGT-FR-030 |
| `BGT_NO_QUORUM` | 409 | Too few members are present | BR-BGT-15 |
| `BGT_MINISTER_REQUIRED` | 409 | The minister's approval is missing | BR-BGT-23 |
| `BGT_LINE_ROOM_EXCEEDED` | 409 | More than the available amount | BR-BGT-25, BR-BGT-30 |
| `BGT_LINE_IN_USE` | 409 | The line has reservations, commitments or holds | BR-BGT-35 |
| `BGT_IN_USE` | 409 | Master data in use can only be retired | BR-BGT-38 |
| `BGT_TRANSFER_NOT_ALLOWED` | 409 | The type needs the Cabinet or an Act, or the reason is not on the list | BR-BGT-26 to BR-BGT-28 |
| `BGT_CARRYOVER_INVALID` | 409 | A carry-over check fails | BR-BGT-32 |
| `BGT_SETTING_OUT_OF_RANGE` | 422 | A setting is outside its allowed range | BGT-FR-156, BGT-FR-160 |
| `BGT_IMPORT_INVALID` | 422 | A file cannot be read as the expected layout | BGT-IR-003 |

### Event catalogue {#bgt-events}

> [!NOTE] This event list is a proposal. Each event is written to `outbox_event` in the transaction of the change, and a relay publishes it to RabbitMQ (ADR-0008). Consumers drop duplicates by `eventId`. Routing keys start with `budget.`.

Every event carries `eventId`, `tenantId`, `occurredAt` and `aggregateId`, and the fields below. Payloads hold references and amounts, never personal data.

| Event | Raised by | Extra fields | Consumers |
| --- | --- | --- | --- |
| `request.sent`, `request.director-approved`, `request.forwarded`, `request.returned`, `request.withdrawn` | `BudgetRequest` | `unitId`, `amount` | Notifications, `reporting` |
| `request.approved`, `request.rejected`, `request.cancelled` | `BudgetRequest`, `Meeting` | `decided` | `projects`, `review`, `procurement` |
| `ceiling.issued` | `CeilingIssue` | `versionNo`, `dueOn` | Notifications |
| `meeting.resolved` | `Meeting` | `items` | Minutes rendering, notifications |
| `batch.sent`, `batch.result-recorded`, `batch.closed` | `SubmissionBatch` | `count`, `amount` | Request track, notifications |
| `act.in-force` | `BudgetBill` | `fy` | Notifications, `finance` |
| `lines.created`, `line.confirmed`, `line.changed`, `line.cancelled` | `allocation` | `lineId`, `fy`, `amount` | `procurement`, `finance`, `projects`, `monitoring` |
| `transfer.requested`, `transfer.approved`, `transfer.effective`, `transfer.rejected` | `Transfer` | `type`, `fromLine`, `toLine`, `amount` | `finance`, `monitoring`, `review` |
| `carry-over.approved` | `CarryOver` | `lineId`, `amount`, `dueOn` | `finance`, `monitoring` |
| `ledger.changed` | `LedgerService` | `lineId`, `kind`, `amount` | `monitoring` |
| `report.sent`, `report.accepted` | `QuarterReport` | `round`, `unitId` | Notifications, `review` |
| `settings.changed` | `settings` | `key`, `fy` | Notifications to the auditor |

### External adapters {#bgt-adapters}

Adapters run on the outbox path, retry safely and show their state to users (ADR-0008). Simulation controls do not exist in a production tenant (BGT-NFR-005).

| Adapter | Port | First implementation | Behaviour | Requirements |
| --- | --- | --- | --- | --- |
| e-Budgeting, BBL | `BudgetBureauExchange` | A file per batch; results entered by hand | A configured column mapping, since no layout is confirmed | BGT-IR-003, BGT-FR-085 |
| BB EvMIS | `EvmisExport` | Files of forms 301 and 302 and reports | Built from spending plans and quarterly reports | BGT-IR-004 |
| GFMIS | None in Budget | Lives in `finance` | Budget receives disbursement through `LineLedger.recordDisbursement` | BGT-IR-005 |
| Public page | `PublicSummaryPublisher` | None until the channel is chosen | Publishes only approved summaries | BGT-IR-007 |

> [!OPEN] The e-Budgeting, BBL and BB EvMIS contracts are unknown. The Budget Bureau must supply the file layouts and say whether an API is open to agencies (OI-BGT-04). Until then the adapters have no fixed layout, and they read a tenant-neutral column mapping held as configuration.

## Security design {#bgt-security}

Keycloak signs users in (ADR-0006). Roles, duty rules and delegation live in `platform`, and the server checks them on every action. Tenant binding and row-level security follow the Procurement chapter. Budget sits at OWASP ASVS Level 2 (ADR-0017).

### Authorities {#bgt-authorities}

> [!NOTE] The authority names are a proposal. Roles map to authorities as tenant data, and these defaults follow the actor table of the SRS.

| Authority | Default roles | Allows |
| --- | --- | --- |
| `bgt.read` | All Budget roles, scoped by unit for unit staff and directors | Read records the role may see |
| `bgt.strategy`, `bgt.consolidate`, `bgt.review`, `bgt.meeting`, `bgt.submit` | Planning officer | Formulation work; `bgt.review` by delegation scope `review` |
| `bgt.idea` | Unit staff, Planning officer | Propose and edit ideas |
| `bgt.request` | Unit staff, own unit | Prepare, send, withdraw, reply |
| `bgt.director` | Division director, own unit | Approve and return at `unit` |
| `bgt.approve` | Executive, directly or by delegation | Requests, revisions, transfers T2, T3, T6, carry-over |
| `bgt.vote` | Member of the committee roster, checked per meeting | Vote |
| `bgt.allocate` | Finance officer | Appropriation, lines, plans, releases, transfer requests, carry-over requests |
| `bgt.transfer.t1` | Finance head or head of the agency, by delegation scope `transfer` | Approve T1 |
| `bgt.plan` | Planning officer, Finance officer | Spending plan versions |
| `bgt.report`, `bgt.accept` | Unit staff; Planning officer | Progress and results; accept and return |
| `bgt.certify`, `bgt.audit` | Auditor | Certify evidence; anomalies; add recommendations |
| `bgt.admin` | Administrator | Rules, settings, structure. No budget approval (BR-PLT-07) |
| `bgt.ai` | Roles the tenant allows, only when the tool is on | AI tools and agents |

### Separation-of-duties checks {#bgt-sod}

`SodGuard` runs inside the command, as in the Platform chapter. This table lists the enforcement points of SD-09 and SD-10, which PLT assigns to this chapter.

| Rule | Command | Actors | Compared with | Requirements |
| --- | --- | --- | --- | --- |
| SD-09 | `Transfer.approve` | Approver and delegator | Preparer, including the approver of an AG-15 step | BGT-FR-124 |
| SD-10 | `Meeting.vote`, `Meeting.resolve` | Voting member | Unit of the request | BGT-FR-070, BR-BGT-16 |
| Second-person checks | Target revision, carry-over, plan version | Decider | Proposer | BGT-FR-014, BGT-FR-127 |

> [!NOTE] The prototype has neither rule wired as a logged check (OI-BGT-06, OI-PLT-04). SD-10 is a duty rule that a law may require, so DG-PRC-05 applies here too: which rules can never be switched off is open.

### Audit {#bgt-audit}

- Every approval, rejection, cancellation, amount change, settings change and import writes an entry through `AuditLog` (BGT-NFR-001, BGT-CR-006), by the `CommandAudit` aspect in the same transaction.
- Entries hold a pseudonymous reference and item ids, never names or free text (ADR-0015). Reasons stay in the business record, such as `amount_change`.
- Application logs and telemetry hold no personal data, and tests check this (ADR-0015, ADR-0017).

### AI controls {#bgt-ai-security}

- All AI calls pass through `AiGateway`. AI is off by default, and every feature works with it off (ADR-0016, BGT-FR-174).
- `ToolRegister` is a closed list per agent. No tool approves a request or transfer, votes, files outside or changes a rule (BR-BGT-39).
- A step that writes stops for a person, and approval runs the normal command, so authority and duty rules apply to that person (BGT-FR-162, BGT-FR-163).

## Non-functional design {#bgt-nfr}

| Requirement | Design answer | Verified by |
| --- | --- | --- |
| BGT-NFR-001 | `CommandAudit` aspect on every command | Integration test per command |
| BGT-NFR-002 | Totals are read from the aggregate or a projection updated by the same event | `ChainOfAmountsIT` |
| BGT-NFR-003 | Deadlines carry a clause from `BudgetRuleSet`; one `WorkingCalendar` | Unit tests and an architecture rule |
| BGT-NFR-004 | React messages in Thai and English; pack and minutes templates in Thai | Playwright in both languages |
| BGT-NFR-005 | No simulation code in production; one injected clock; test adapters ship only in test profiles | Build check |
| BGT-NFR-006 | `YearForecast` is a pure function of balances and settings | A repeat-run test |
| BGT-NFR-007 | Unit scope in `Authorizer`, and a field filter on votes | Integration test per role |

### Load and availability {#bgt-nfr-load}

- Capacity is planned against the 30 September peak (ADR-0005). The row lock on `line_balance` is the expected contention point, so a ledger call holds it only for the update and the commit. k6 scripts measure it first (ADR-0017).
- Requests peak in the submission window, and the send command runs the rule book on one aggregate with no table scan.
- B4 and B8 read projections, with paging. An adapter failure leaves events in the outbox with their state shown (ADR-0008).

> [!OPEN] Budget-specific response-time and volume targets are not set beyond the cross-cutting chapter. The product owner must say whether the ledger call and the rule book need their own targets (DG-BGT-08).

## Test design {#bgt-tests}

The sweep in `tests/sweep.js` runs inside the prototype page and cannot test a server. Its walks are still the best statement of intended behaviour, so each one becomes a production test. Test levels are those of the Procurement chapter.

> [!NOTE] The test class names are a proposal.

### From sweep walks to production tests {#bgt-test-walks}

| Sweep check | Production test | Added beyond the walk | Requirements |
| --- | --- | --- | --- |
| E2E walk | `BudgetCycleScenario` (Spring Modulith `Scenario`); `budget-cycle.spec` (Playwright) | Each refusal on the way, and the withdrawn request sent again through the real route | BGT-FR-011, BGT-FR-035, BGT-FR-072, BGT-FR-100, BGT-FR-119, BGT-FR-127, BGT-FR-154 |
| C3 walk | `SubmissionToActIT` | Close refused with an open revision, send refused with no minister, cut above the item refused | BGT-FR-077, BGT-FR-082, BGT-FR-083, BGT-FR-090, BGT-FR-095 |
| Round C4 pass | `MonitoringProjectionIT` | The clock is a test fixture; the demo date has no production path | BGT-FR-133, BGT-NFR-005 |
| Budget pages pass | `budget-pages.spec` | Fails on a console error, adds an accessibility scan | BGT-FR-002, BGT-FR-003 |
| Page-open sweep | `role-matrix.spec` | Every page for every role, in both languages | Partial rows in general |

### Tests with no sweep ancestor {#bgt-test-new}

| Test | Asserts | Requirements |
| --- | --- | --- |
| `RequestRulebookTest` | Each block rule stops sending, each warn rule does not, and a switched-off rule is skipped | BGT-FR-030, BR-BGT-01 to BR-BGT-13 |
| `RequiredDocumentsTest` | Each condition asks for the right document, at the boundary amounts | BGT-FR-026 |
| `TransferClassifierTest` | Every pair of line kinds gives the right type, and T5 and secret funds are refused | BR-BGT-26, BGT-FR-122 |
| `LedgerConcurrencyIT` | Parallel reservations and transfers never pass the amount, and opposite transfers do not deadlock | BR-BGT-30, BGT-FR-113, BGT-FR-117 |
| `SodRefusalIT` | SD-09 and SD-10 refuse the person and the delegator, with a log row and no state change | BGT-FR-070, BGT-FR-124 |
| `NumberSeriesIT` | A deleted draft's number is never issued again | BR-BGT-37, BGT-DR-005 |
| `ChainOfAmountsIT` | A change at each step reaches the next, from decided amount to line amount | BGT-NFR-002, BR-BGT-24 |
| `RuleSetByDateTest` | A record keeps the rule version it used, and each rule cites a clause | BGT-FR-161, BGT-CR-002 |
| `TenantIsolationIT` | Generated from the schema: each table refuses a read and a write across tenants | ADR-0005 |
| `AiLimitsTest` | The register has no forbidden tool, and each off switch refuses | BR-BGT-39, BGT-FR-164 |

## Migration from the prototype {#bgt-migration}

The prototype is a reference, and no code moves across. What carries over is the knowledge it holds. There is no production data to migrate, and a tenant's opening data is a separate onboarding matter.

| Carries over | How | Source in the prototype |
| --- | --- | --- |
| State names and transitions | Rewritten as Java enums and tables | `41d-req-b1.js`, `78-form-crud.js`, `79-sub-crud.js`, `77-alloc-crud.js` |
| Rule checks | Rewritten as `RequestRulebook` with tests | `41-requests.js` checks, `41d-req-b1.js` |
| Transfer logic | Rewritten as `TransferClassifier` and a rule set | `47d-alloc-b4.js` classifyTransfer, TR_TYPE |
| 3R, priority, forecasts, signals | Rewritten with the same parameters | `43d-cons-b2.js`, `69-budget-ai.js`, `69b-budget-settings.js` |
| Screens and flows | The React build follows the same pages and the list and drawer pattern | `75-budget-pages.js`, `76-crud.js` |
| Sweep walks | Rewritten as tests | `tests/sweep.js` |
| Default settings | Starter tenant data within ranges | `05-shared.js`, `41d-req-b1.js`, `69b-budget-settings.js` |

| Does not carry over | Why | Replaced by |
| --- | --- | --- |
| Browser state, `syncBudget`, `liveDash` | One user, rebuilt on every route | PostgreSQL, the ledger and projections |
| Demo date and `simDisb` | Must not exist in production (BGT-NFR-005) | An injected clock, and real imports |
| Simulate buttons | BGT-NFR-005 | Forms that people complete from real results |
| Sample agency data and fixed sample ids in code | Not part of a generic product | Tenant data only |
| Legacy `FY2569` tables and two transfer paths | Kept for old links in the prototype | One command per action |
| Known prototype defects | OI-BGT-05 to OI-BGT-09 | Fixed by design and covered by tests |

## Known gaps and open issues {#bgt-open}

### Issues carried from the SRS {#bgt-open-srs}

| Issue | Effect on this design | Designed for now | Decides |
| --- | --- | --- | --- |
| OI-BGT-01 | Citations of legal limits | `BudgetRuleSet` entries carry a clause field | Budget specialist |
| OI-BGT-02 | Clause numbers of the regulation and its second amendment of 2567 | The first rule set is dated from the 2562 text and cannot ship until confirmed | Budget specialist |
| OI-BGT-03 | Limits against settings, and the transfer table | Rule set in code; ranges marked proposal | Budget specialist, product owner |
| OI-BGT-04 | External file formats | Ports with a column mapping | Budget Bureau, Comptroller General's Department |
| OI-BGT-05 | Hold at `bb` | `hold` lasts until the transfer ends | Development team |
| OI-BGT-06 | SD-09 and SD-10 | Both run through `SodGuard` | Development team |
| OI-BGT-07 | Number reuse | `NumberSeries` for every series | Development team |
| OI-BGT-08 | Activity year on a line | The picker reads the line's own fiscal year | Development team |
| OI-BGT-09 | Fixed text and targets | All from settings and the rule set | Development team |
| OI-BGT-10 | Retention periods | Retention keys per table, with no period | Budget specialist, product owner |
| OI-BGT-11 | Yearly values | `budget_setting` per fiscal year | Budget specialist, product owner |
| OI-BGT-12 | Whole baht or satang | See DG-BGT-02 | Budget specialist, product owner |
| OI-BGT-13 | Who approves T2 and T1 | Tenant choice within the rule set | Budget specialist, legal unit |
| OI-BGT-14 | AI scope | All calls pass through `AiGateway`, off by default | Product owner, data protection officer |

### New issues from this design {#bgt-open-new}

The DG-BGT numbers below belong to this chapter and are not SRS ids.

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-BGT-01 | The design lists request states to allocated, and the code stops at approved. Which does the user see? | `status` plus a `track` value, shown together | Product owner |
| DG-BGT-02 | BGT-DR-006 holds whole baht, while GFMIS and the ledger meet satang from Finance. Are satang kept? | `numeric` with two decimal places in the ledger; whole baht on requests | Budget specialist, product owner |
| DG-BGT-03 | Can the executive reject at `exec`? The route has no such path in the code | Return only, as in the prototype | Budget specialist |
| DG-BGT-04 | A request with several budget types becomes one line. Should it become one line per type? | One line per budget type, which differs from the prototype | Budget specialist, product owner |
| DG-BGT-05 | Finance owns GFMIS, but B8 has the import tab and the reconciliation. Who owns the screen? | `finance` owns the import; B8 links to it and reads the result | Authors of the FIN chapter, product owner |
| DG-BGT-06 | A transfer across budget types changes the type totals of the act. When is that lawful? | Allowed as in the prototype, and the original act amounts are kept apart | Budget specialist |
| DG-BGT-07 | Does a payroll estimate need named rows, or only totals? | Totals by position only | Data protection officer, budget specialist |
| DG-BGT-08 | Do the ledger call and the rule book need their own targets? | The cross-cutting targets apply | Product owner |
| DG-BGT-09 | An approved carry-over creates next year's line, but the amount comes from a commitment in Finance. Does `finance` or `budget` start it? | `budget` creates it and tells `finance` by event | Authors of the FIN chapter, budget specialist |

### Known gaps in this version {#bgt-open-depth}

- Monitoring forecasts, what-ifs, signals and agents are designed at component and interface level only. Their logic follows the prototype and the Budget design document, and the review module may take some of them over.
- Planned rows with no prototype behaviour have a table or an endpoint only: BGT-FR-015, BGT-FR-016, BGT-FR-038, BGT-FR-104, BGT-FR-111, BGT-FR-148.
- Column types, indexes and constraints wait for the data dictionary chapter.
