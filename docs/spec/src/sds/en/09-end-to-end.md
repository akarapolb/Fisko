# End-to-end flows {#end-to-end}

This chapter follows one baht from the budget act to the closed month. It shows which module owns each step and what crosses between modules. It adds no design of its own. Every interface and event comes from a module chapter, and anything a module has asked for and its owner has not agreed is marked as a request.

> [!NOTE] Everything here is a proposal to build. The prototype shows the same route in one browser page. Its demo steps open the page of each step and assert nothing, so they are no proof that the cycle works.

## The cycle at a glance {#e2e-glance}

Budget creates the line. Procurement reserves and commits on it, and passes accepted work to Finance through a gate. Finance pays, reconciles with GFMIS and closes. Carry-over returns to Budget. The numbers in the figure are the steps of the next section.

{{fig:e2e-map | Map of the cycle from budget to closing}}

## Who owns each step {#e2e-steps}

The owner holds the record and its rules. No other module writes that record. The Through column lists what crosses the module boundary.

| Step | What happens | Owner | Who acts | Through | Requirements |
| --- | --- | --- | --- | --- | --- |
| 1 | Requests and review. A request passes the unit, Planning, the executive and the committee | `budget` | Unit staff, Planning, executive, committee | `request.approved`; `BudgetRequestQuery` for procurement demand | BGT-FR-017 to BGT-FR-036, BGT-FR-072 |
| 2 | Act and allocation lines. People record the act, and `LinesFromAct.build` creates the lines | `budget` | Budget staff | `act.in-force`, `lines.created`, `line.confirmed`, `AllocationQuery` | BGT-FR-094 to BGT-FR-098 |
| 3 | Spending plans, releases and transfers | `budget` | Budget staff, Finance, executive | `transfer.effective`, `line.changed` | BGT-FR-105 to BGT-FR-110, BGT-FR-115 to BGT-FR-125 |
| 4 | Plan and requisition. Sending a requisition reserves money on the line | `procurement` | Procurement officer, unit, head of procurement | `AllocationQuery`, `LineLedger.room`, `LineLedger.reserve` | PRC-FR-001 to PRC-FR-025 |
| 5 | Case, method and award. Official steps stay in e-GP, and Fisko records their results | `procurement` | Procurement officer, committees | `EgpStatusSource`, `EgpPackBuilder`, `award.recorded` | PRC-FR-026 to PRC-FR-078 |
| 6 | Contract. Signing commits the line in one transaction | `procurement` | Procurement officer, authorised signer | `LineLedger.commit`, `contract.signed`, `ContractLookup` | PRC-FR-097 to PRC-FR-103, PRC-IR-007 |
| 7 | Delivery and acceptance. Members sign until the phase is accepted | `procurement` | Procurement officer, acceptance committee | `phase.delivered`, `phase.accepted`, `DocumentService` | PRC-FR-107 to PRC-FR-116 |
| 8 | Payment gate. Procurement decides whether a phase may go forward, and Finance calls it | `procurement` | Finance officer starts it; head of procurement or the approver releases a hold | `AcceptedPhaseQuery`, `PaymentGate`, `FinanceFacts`, `phase.gate-held` | PRC-FR-118, PRC-FR-119, PRC-IR-008, PRC-IR-009, FIN-FR-015 |
| 9 | Voucher and approval. The voucher stores the gate snapshot, and approval records the payment on the ledger | `finance` | Finance officer, checker, approver from `AuthorityTable` | `PhasePayment`, `LineLedger.recordPayment`, `voucher.approved`, `phase.paid` | FIN-FR-017 to FIN-FR-040 |
| 10 | GFMIS file and payment. GFMIS stays the official system of record and payment | `finance` | Finance officer | `GfmisGateway`, `gfmis-file.created`, `voucher.paid` | FIN-FR-041 to FIN-FR-045, FIN-IR-006, FIN-IR-007 |
| 11 | Reconciliation of bank, GFMIS reports and payment files | `finance` | Finance officer, a second person for sign-off | `gfmis-report.imported`, `LineLedger.recordDisbursement` | FIN-FR-105 to FIN-FR-117 |
| 12 | Closing and carry-over. Finance proposes, and Budget checks and decides | `finance` for closing, `budget` for carry-over | Finance officer, head of finance, executive | `period.closed`, `CarryOverIntake` (request), `carry-over.approved` | FIN-FR-120 to FIN-FR-124, FIN-FR-128, FIN-FR-129, BGT-FR-126 to BGT-FR-132 |

## The cycle in sequence {#e2e-seq}

The first figure runs from the lines to the signed contract, and the second from acceptance to closing. They leave out detail that the module chapters hold: the [award](#prc-seq-award), the [acceptance](#prc-seq-accept), the [voucher](#fin-seq-accept) and the [GFMIS file](#fin-seq-gfmis-s).

{{fig:e2e-seq-cycle | From allocation lines to contract signing}}

{{fig:e2e-seq-settle | From acceptance to closing}}

Two moments run across modules in one transaction, because the modules share one application (ADR-0002). If a call fails, nothing is saved.

- Signing: `LineLedger.commit`, the contract becomes active, the requisition becomes contracted and the case reaches step 9.
- Approval: duty rules, authority, `LineLedger.recordPayment`, `PhasePayment.approved` and the voucher becomes ready.

Everything else travels by event after commit, so an outage of a consumer or an external system never undoes a business action (ADR-0008).

## Money on a line {#e2e-ledger}

`LineLedger` in `budget` is the one place that holds what is free on a line (BGT-IR-001). The table shows who moves the balance at each step.

| Moment | Caller | Ledger call | Effect |
| --- | --- | --- | --- |
| A requisition enters pending | `procurement` | `reserve` | Reserved rises, room falls |
| A requisition leaves pending for an end state | `procurement` | `release` | Reserved falls |
| A contract is signed | `procurement` | `commit` | The reservation becomes a commitment |
| A variation is approved | `procurement` | `adjustCommitment` | The commitment changes |
| A commitment outside procurement | `finance` | `recordCommitment` | Committed rises |
| A voucher is sent with no commitment | `finance` | `reserve` (DG-FIN-04) | Room falls. On a commitment, a `voucher_hold` row is used and the ledger is not called |
| A voucher is approved | `finance` | `recordPayment` | Paid rises |
| GFMIS disbursement is imported | `finance` | `recordDisbursement` | `line_disbursement` is updated for comparison |
| A transfer is requested | `budget` | `hold`, inside Budget | Held money leaves room, so Procurement cannot reserve it |

## Events that cross modules {#e2e-events}

A consumer listed in the owner's catalogue is agreed. A consumer in the last column has said it needs the event, and the owner's catalogue does not list it yet. These are requests.

{{fig:e2e-eventflow | Events that cross modules}}

| Event | Raised in | Step | Consumers in the owner's catalogue | Requested by |
| --- | --- | --- | --- | --- |
| `request.approved`, `request.rejected`, `request.cancelled` | `budget` | 1 | `projects`, `review`, `procurement` | - |
| `act.in-force` | `budget` | 2 | Notifications, `finance` | - |
| `lines.created`, `line.confirmed`, `line.changed`, `line.cancelled` | `budget` | 2, 3 | `procurement`, `finance`, `projects`, `monitoring` | `review` (DG-REV-02) |
| `transfer.requested`, `transfer.approved`, `transfer.effective`, `transfer.rejected` | `budget` | 3 | `finance`, `monitoring`, `review` | `projects` (DG-PRJ-01) |
| `plan-version.published` | `procurement` | 4 | `review`, search | - |
| `case.failed`, `case.cancelled`, `case.closed` | `procurement` | 5 | `reporting`, `projects` | - |
| `contract.signed` | `procurement` | 6 | `finance`, `projects`, `reporting` | `review` (DG-REV-02) |
| `contract.changed`, `contract.terminated` | `procurement` | 6 | `finance`, `reporting` | `projects` (DG-PRJ-01), `review` (DG-REV-02) |
| `phase.delivered` | `procurement` | 7 | `finance`, `reporting` | - |
| `phase.accepted`, `phase.paid` | `procurement` | 7, 9 | `finance`, `reporting` | `projects` (DG-PRJ-01), `review` (DG-REV-02) |
| `phase.gate-held`, `phase.gate-released` | `procurement` | 8 | `finance`, notifications | - |
| `penalty.waived` | `procurement` | 8 | `finance` | - |
| `commitment.changed` | `finance` | 9 | `projects`, `reporting` | - |
| `voucher.paid` | `finance` | 10 | `projects`, `review`, `budget` | - |
| `gfmis-report.imported` | `finance` | 11 | `projects`, `reporting` | - |
| `period.closed`, `period.reopened` | `finance` | 12 | Notifications, `reporting` | - |
| `carry-over.approved` | `budget` | 12 | `finance`, `monitoring` | `projects` (DG-PRJ-01) |
| `project.registered`, `project.linked`, `project.step-changed` | `projects` | All | `reporting`, `review` | - |
| `master.fiscal-year-opened`, `master.fiscal-year-status-changed` | `platform` | All | `budget`, `finance` | - |
| `subject.erased` | `platform` | All | All modules | - |

`reporting` and `monitoring` are packages inside the owner module, so an event that reaches only them does not cross a module. Every event passes through the outbox, consumers drop duplicates by `eventId`, and payloads hold references and amounts with no personal data (ADR-0008).

## Modules that follow the cycle {#e2e-followers}

`projects` and `review` read the cycle and change no record in it. `platform` serves every step.

| Module | Reads | Does with it | Chapter |
| --- | --- | --- | --- |
| `projects` | `AllocationQuery`, `BudgetReadModel`, `ContractLookup`, `LinePaymentQuery` and the events above | Joins records under one project id, derives the step, and exchanges data with a PM system | [Projects](#prj-dynamic) |
| `review` | `AllocationQuery`, `BudgetReadModel`, `PaidFacts`, `ContractLookup`, `ProjectLookup` and requested sources | Fills projections for dashboards and raises anomalies. A proposal always goes through the owner's normal command | [Review](#rev-dynamic) |
| `platform` | Called by each step | `Authorizer`, `SodGuard`, `Delegations`, `AuditLog`, `Notifier`, `WorkItems`, `DocumentService` | [Platform](#plt-published) |

## When a step fails {#e2e-failure}

| Step | Failure | What happens | Owner | Source |
| --- | --- | --- | --- | --- |
| 4 | Not enough room on the line | The requisition is refused with `PRC_LINE_ROOM_EXCEEDED` | `procurement` | BR-PRC-04 |
| 5 | A case fails or is cancelled | The case records it. Leaving pending for an end state releases the reservation | `procurement` | PRC-FR-030 |
| 6 | The ledger refuses at signing | Nothing is saved | `procurement` | PRC-IR-007 |
| 8 | The gate fails | A hold is stored in Procurement. A head or the approver may release it with a reason, and Finance tries again. `PRC_GATE_PO_MISSING` cannot be released | `procurement` | PRC-FR-119, BR-PRC-15 |
| 9 | A voucher is rejected or cancelled | `PhasePayment.rejected` frees the phase, and the next voucher reads the current penalty | `finance` | FIN-FR-034, OI-FIN-10 |
| 10 | GFMIS rejects an entry | The approved record does not change. The voucher returns to ready and a task opens for the officer | `finance` | BR-FIN-01 |
| 10 | A call to GFMIS times out | No blind resend. `delivery_id` is the idempotency key, and the user sees the delivery state | `finance` | FIN-IR-007 |
| 6 to 9 | A contract is terminated | An accepted and unpaid phase fails the guarantee check and needs a release, as in the prototype (DG-PRC-03) | `procurement` | BR-PRC-20 |
| 12 | A change falls in a closed period | `PeriodGuard` refuses it | `finance` | FIN-FR-124 |

## What is still a request {#e2e-requests}

The cycle depends on the items below, and their owners have not all agreed. The Designed for now column is what this chapter assumes.

| Item | Asked by | Owner | Designed for now | Issue |
| --- | --- | --- | --- | --- |
| `CarryOverIntake` | `finance` | `budget` | Finance proposes through it. The Budget author must name the call behind `CarryOver.file` | DG-BGT-09, DG-FIN-07 |
| The narrower `FinanceFacts`, `BankChangeIntake` and `PhasePayment.rejected` | `finance` | `procurement` | Both chapters now show these, and the product owner must accept them | DG-FIN-01 |
| When a phase becomes Paid | `finance` | `procurement` | At approval, as in the prototype. `voucher.paid` carries the real payment | DG-FIN-03, OI-FIN-08 |
| Who owns the GFMIS import screen | `finance`, `budget` | `finance` | Finance imports and writes through `recordDisbursement`, and Budget links to the result | DG-BGT-05, DG-FIN-02 |
| A Procurement query by line | `projects` | `procurement` | Plan items, cases, contracts and phases of a line. The published `ContractLookup` does not cover this | DG-PRJ-01 |
| Events listed in the last column above | `projects`, `review` | The raising module | The event catalogue adds the consumer | DG-PRJ-01, DG-REV-02 |
| `LineFacts`, `KpiSource`, `ForecastSource`, `SignalSource` | `review` | `budget`, `procurement` | Finance has published its set. Budget and Procurement have not | DG-REV-02 |
| GFMIS and e-GP contracts | `finance`, `procurement` | Comptroller General's Department | Ports with file adapters, and the same delivery states | DG-XC-20, OI-PRC-03, OI-FIN-02 |

> [!OPEN] DG-PRJ-01 asks for a request reference on the line and a line reference on the carry-over. The Budget tables already hold `allocation_line.request_id` and `carry_over.line_id`. The Projects author and the Budget author must confirm that this closes that part of the issue.
