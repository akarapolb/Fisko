# Module design overview {#modules}

> [!NOTE] This chapter states what is common to every module, so that module chapters need not repeat it. The Procurement chapter is the pilot. Each module chapter holds its interfaces in full, and the table below lists what each one publishes.

## The modules {#mod-list}

| Module | Package | SRS prefix | Chapter |
| --- | --- | --- | --- |
| Platform | `platform` | `PLT` | [Platform](#plt) |
| Budget | `budget` | `BGT` | [Budget](#bgt) |
| Procurement | `procurement` | `PRC` | [Procurement](#prc) |
| Finance | `finance` | `FIN` | [Finance](#fin) |
| Projects | `projects` | `PRJ` | [Projects](#prj) |
| Review and analytics | `review` | `REV` | [Review](#rev) |

## How every module is built {#mod-anatomy}

Each module is a Spring Modulith module with the same shape (ADR-0002).

| Part | Holds | Rule |
| --- | --- | --- |
| `api` | Published interfaces and their records | The only package other modules may use, with `api.events` |
| `api.events` | Event records | Payloads hold references and amounts, never personal data |
| `web` | REST controllers, request records, Problem Details mapping | No business rule. Calls one command |
| Work-area packages | Aggregates, commands, policies, repositories | Internal. Domain classes have no Spring or JPA import |
| `settings` | Tenant settings, profile switches, dated legal rule sets | Limits in code, values in data (ADR-0007) |
| Adapter packages | Ports and adapters to external systems | Run on the outbox path (ADR-0008) |
| `reporting` | Rebuildable projections and reports | Reads never touch command tables under load |

Every module also has:

- One PostgreSQL schema, with `tenant_id` first in each key and row-level security on each table (ADR-0005).
- An `outbox_event` table, with migrations that follow expand and contract.
- An authority list, an error catalogue with its module prefix, and an event catalogue.
- A list of duty rules and the commands that run them.
- A data dictionary entry for each personal field (ADR-0014).

## How a command runs {#mod-command}

Every state change follows the same steps. The request path in the Architecture chapter shows them in order.

1. `web` validates the request and starts one transaction with the tenant bound.
2. `Authorizer` and `SodGuard` run.
3. The command loads one aggregate and checks its version against `If-Match`.
4. A method on the aggregate checks state and rules, and changes it.
5. Synchronous calls to lower modules run in the same transaction, such as `LineLedger.commit`.
6. The command saves the aggregate. `CommandAudit` adds the audit entry, and the outbox row is added.
7. The transaction commits, and everything else runs from events.

Legal state machines are Java enums with transition tables and guard methods (ADR-0007). Each business rule cites its clause, and the SRS traces to it. A job follows the same steps, with the tenant bound and a system actor.

## Published interfaces {#mod-interfaces}

| Module | Published interfaces | Used by | Status |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `SodGuard`, `AuditLog`, `Notifier`, `WorkItems`, `ApprovalRoutes`, `WorkingCalendar`, `FiscalCalendar`, `UnitDirectory`, `SubjectDirectory`, `StandardPrices`, `RetentionRegistry`, `DocumentService`, `FileStore`, `FieldCrypto`, `SearchIndexer`, `AiGateway`, and the SPIs `RetentionHold` and `InterfaceReporter` | All modules | Confirmed in the [Platform chapter](#plt) |
| `platform` | `AgentRuntime`, `AgentCatalogue` | Modules with agents, `review` | Proposal in the [Platform chapter](#plt-agent-runtime), DG-REV-01 |
| `platform` | `AssistantRouter` | `review` | Proposal in the [Platform chapter](#plt-published) |
| `budget` | `LineLedger`, `BudgetRequestQuery`, `AllocationQuery`, `BudgetReadModel` | `procurement`, `finance`, `projects`, `review` | Confirmed in the [Budget chapter](#bgt). `CarryOverIntake` is still a request from Finance |
| `procurement` | `AcceptedPhaseQuery`, `PaymentGate`, `PhasePayment`, `ContractLookup`, `SupplierDirectory`, and the SPIs `FinanceFacts` and `BankChangeIntake` | `finance`, `projects`, `review` | Confirmed in the [Procurement chapter](#prc) |
| `finance` | `LinePaymentQuery`, `PaidFacts`, `KpiSource`, `ForecastSource`, `SignalSource`. It implements `FinanceFacts` and `BankChangeIntake` | `projects`, `review`, `procurement` for the SPIs | Confirmed in the [Finance chapter](#fin) |
| `projects` | `ProjectLookup`. It implements the SPIs `InterfaceReporter` and `RetentionHold` | `review` | Confirmed in the [Projects chapter](#prj) |
| `review` | None. It publishes events only | None | Confirmed in the [Review chapter](#rev) |

DG-PRC-08 records how those chapters answered Procurement. Review still asks `budget` and `procurement` for `KpiSource`, `ForecastSource` and `SignalSource`, which their chapters do not publish (DG-REV-02). A change to a published interface follows the same rule as a public API: expand first, and contract in a later release.

## Dependency direction {#mod-dependencies}

Modules depend in one direction, and Spring Modulith refuses cycles. `finance` depends on `procurement.api` and implements an SPI that Procurement declares, which avoids a cycle (Procurement chapter).

{{fig:arch-modules | Module dependency direction}}

| Module | May depend on | Reason |
| --- | --- | --- |
| `platform` | None | The base of the product |
| `budget` | `platform` | Lines and the ledger need nothing above them |
| `procurement` | `platform`, `budget` | Reservations and commitments run in one transaction |
| `finance` | `platform`, `budget`, `procurement.api` | Payments draw on commitments and on accepted phases |
| `projects` | `platform`, `budget`, `procurement.api`, `finance.api` | Projects read contracts and spending |
| `review` | Each module's `api` | Review reads across modules and writes to none |

Rules for a fact that must travel upward:

1. If a lower module needs an answer at once, it declares an SPI in its `api`, and the upper module implements it. `FinanceFacts` is the example.
2. If it only needs to know later, it subscribes to an event.
3. A lower module never imports an upper module's package.

> [!NOTE] The rows for `projects` and `review` extend what the Procurement chapter fixed. The Projects and Review chapters confirm them.

## Testing the structure {#mod-tests}

| Test | Asserts | Source |
| --- | --- | --- |
| Spring Modulith `verify` | Only `api` packages are used, and there are no cycles | ADR-0002 |
| ArchUnit rules | No framework in the domain, no outbox bypass, no direct AI call, no date arithmetic outside `WorkingCalendar` | Procurement chapter, ADR-0016 |
| `TenantIsolationIT` | Each table of each module refuses cross-tenant access | ADR-0005 |
| Module `Scenario` tests | Cross-module actions run in one transaction | Procurement chapter |
| Event contract tests | Each event matches AsyncAPI and holds no personal field | ADR-0008, ADR-0015 |

These tests run in CI and must never be switched off (ADR-0002).

## Splitting a module later {#mod-split}

A module can be split out later if load requires it (ADR-0002). The structure keeps that possible: a module's tables are read only by that module, and its neighbours use interfaces and events. The cost lies in synchronous calls, which would need a new design for the shared transaction. A split needs a new ADR.
