# Module design: Platform {#plt}

> [!NOTE] Fisko has no production code. The prototype is browser JavaScript and shows behaviour only. Everything in this chapter is a proposal to build: the packages, classes, tables, endpoints, events and test names below do not exist yet. The technology comes from the accepted ADRs in `docs/adr/`, which this chapter applies and does not reopen.

## Purpose, scope and traceability {#plt-purpose}

<!-- covers: PDPA 23; PDPA 24; PDPA 30; PDPA 32; PDPA 33; PDPA 34; PDPA 37; PDPA 39; PDPA 40; PDPA 41 -->

This chapter designs the production Platform module: its structure, data, interfaces and behaviour. It answers the Platform chapter of the SRS, and it answers the requests that the Procurement chapter lists under DG-PRC-08.

Platform is the module every other module depends on, and it depends on no business module (ADR-0002, PLT-CR-003). Platform-wide quality rules, the deployment of Keycloak and the cell design belong to the cross-cutting and deployment chapters. This chapter holds the features and their published interfaces.

Every SRS requirement group maps to a design section below.

| SRS group | Requirements | Design section | Main package |
| --- | --- | --- | --- |
| Business rules | BR-PLT-01 to BR-PLT-26 | Domain model | all |
| Tenancy and tenant settings | PLT-FR-001 to PLT-FR-008 | Design overview, Security design | `tenancy` |
| Identity and sign-in | PLT-FR-009 to PLT-FR-021 | Dynamic behaviour, Security design | `identity` |
| Organisation and users | PLT-FR-022 to PLT-FR-030 | States and transitions, Data design | `org` |
| Roles and permissions | PLT-FR-031 to PLT-FR-037 | Security design | `access` |
| Separation of duties | PLT-FR-038 to PLT-FR-046 | Dynamic behaviour, Security design | `sod` |
| Delegation and acting | PLT-FR-047 to PLT-FR-061 | States and transitions, Dynamic behaviour | `delegation` |
| Approval chains | PLT-FR-062 to PLT-FR-068 | Design overview, States and transitions | `approval` |
| Notifications | PLT-FR-069 to PLT-FR-078 | Dynamic behaviour, Interface design | `notification` |
| Tasks and My Work | PLT-FR-079 to PLT-FR-086 | Components, Data design | `work` |
| Audit log and record history | PLT-FR-087 to PLT-FR-096 | Security design, Data design | `audit` |
| Shared master data | PLT-FR-097 to PLT-FR-104 | Domain model, Data design | `masterdata`, `calendar` |
| Policy pages and site basics | PLT-FR-105 to PLT-FR-108 | Components, Data design | `site` |
| PDPA features | PLT-FR-109 to PLT-FR-119 | Dynamic behaviour, Data design | `privacy` |
| Systems, switcher and search | PLT-FR-120 to PLT-FR-126 | Components | `web`, `search` |
| AI co-work | PLT-FR-127 to PLT-FR-136 | Components, Security design | `ai` |
| Administration | PLT-FR-137 to PLT-FR-143 | Components, Interface design | `admin` |
| Data requirements | PLT-DR-001 to PLT-DR-007 | Data design | all |
| State rules | State tables of the SRS | States and transitions | `delegation`, `org`, `masterdata` |
| Interface requirements | PLT-IR-001 to PLT-IR-006 | Interface design | `api`, `web` |
| Non-functional requirements | PLT-NFR-001 to PLT-NFR-006 | Non-functional design | all |
| Constraints | PLT-CR-001 to PLT-CR-008 | Design overview | all |
| Test evidence | Sweep checks of the SRS | Test design | tests |
| Open issues | OI-PLT-01 to OI-PLT-15 | Known gaps and open issues | all |

## Design overview and decisions {#plt-decisions}

Platform is one module of the modular monolith (ADR-0002). Its published interfaces run inside the caller's transaction, so a business command, its audit entry, its work items and its notices commit together. Keycloak proves who the user is (ADR-0006). What the user may do lives in Platform and is checked on the server.

| Decision | Reason | Rejected alternative | Source |
| --- | --- | --- | --- |
| Tenancy, identity, roles, duties, delegation, audit, notifications and PDPA are one module that depends on no business module | Every module needs them, and Spring Modulith refuses cycles | A shared library, which cannot own tables or transactions | ADR-0002, PLT-CR-003 |
| The tenant comes from the token and is bound with `SET LOCAL app.tenant_id` in each transaction | Row-level security then holds even if a query forgets its filter | A tenant id in the path or the request body | ADR-0005, PLT-FR-002 |
| Duty rules are a catalogue in code with a tenant switch, and a rule tied to law carries a lock | A rule needs code at its enforcement point, and a tenant must not switch off a legal limit | Rules as free tenant data, which no code would enforce: this is how SD-03 went wrong | ADR-0007, PLT-CR-006, OI-PLT-03 |
| `Delegations` returns every delegation in force, and `ActorSet` carries all of them | The prototype takes the first match, so a second delegator escapes the duty check (PLT-FR-042) | One delegator per action | PLT-FR-041, PLT-FR-042 |
| A delegation's state is derived from its dates, never stored or moved by a job | A start or an end then takes effect at the exact date, even if a job is late | A status column updated each night | PLT-NFR-002 |
| Approval chains are tenant data with versions. Legal state machines stay in the modules | Who approves differs by agency; the legal steps do not | A BPMN engine (rejected in ADR-0007); chains hard-coded per document | ADR-0007, PLT-FR-066 |
| An instance pins the chain version it started on | A route change must not disturb requests on their way (PLT-FR-065) | Reading the live route at each step, which the prototype's SLA check does | PLT-FR-065 |
| My Work is a `work_item` table that modules fill through `WorkItems`, in their own transaction | A list across five modules at each sign-in cannot call each one, and an item must appear and close with its cause | Each module answering a query at read time, as `myTasks` does; matching words in a title as the inbox does | PLT-FR-079, PLT-FR-082 |
| Notices are template keys and parameters, resolved in the reader's language | The prototype's templates are never used, and fixed text holds names that cannot be erased | Free text at each call | PLT-FR-073, ADR-0015 |
| The audit log is append-only and hash-chained per tenant, with a pseudonymous reference and no free text | Erasure must not break the chain | An editable table; personal data in the log; blockchain (all rejected in ADR-0015) | ADR-0015, PLT-CR-005 |
| Undo is a compensating command that adds entries | A snapshot restore erases the audit entry, as in the prototype (OI-PLT-09) | Restoring a snapshot | BR-PLT-19, PLT-FR-143 |
| Reference dates and holidays live in Platform with one `WorkingCalendar` | Every module counts working days the same way | A holiday list in each module | BR-PLT-22, PLT-FR-101 |
| Data subject rights run through a queue, with a `RetentionHold` SPI that each module implements | Platform cannot know each module's legal duty to keep a record, and must not depend on the modules | A central list of exceptions in Platform | ADR-0014, PLT-FR-112 |
| The system list, menus and pins are read models. Only authority decides access | A hidden menu is never the control (ADR-0006) | Page role lists as in the prototype | PLT-FR-036, PLT-FR-123 |

> [!LAW] Separating a legal limit from a tenant choice applies here to the duty rules. `SodRule.lockedOn` holds the date from which a rule cannot be switched off, with the clause that requires it. The value stays empty for every rule until the specialists answer OI-PLT-03, so all rules stay switchable as in the prototype, and each switch-off needs a reason and notifies the auditor.

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

## Components {#plt-components}

Platform is the Spring Modulith module `platform`, under the base package chosen at build start. Only `api` and its sub-package `api.events` are named interfaces. All other packages are internal, and the boundary tests run in CI (ADR-0002).

{{fig:plt-component | Components of the platform module and their neighbours}}

> [!NOTE] The package list, interface names and method names in this section are a proposal.

### Internal packages {#plt-packages}

| Package | Responsibility | Main classes |
| --- | --- | --- |
| `web` | REST controllers, request records, Problem Details mapping, the system list and menus | `AdminController`, `DelegationController`, `WorkController`, `ShellController` |
| `tenancy` | Tenant record, settings, binding per request, onboarding, export, restore | `Tenant`, `TenantBinding`, `Onboarding`, `TenantExport` |
| `identity` | Token validation, session rules pushed to Keycloak, sign-in events, blocked-account alerts | `SessionPolicy`, `SignInEvents` |
| `org` | Units, user accounts, suspension | `Unit`, `UserAccount`, `UnitTree` |
| `access` | Roles, authorities, role grants, unit scope, the permission matrix | `Role`, `AuthorityCheck`, `UnitScope`, `PermissionMatrix` |
| `sod` | Rule catalogue, switches, the guard, blocked attempts | `SodCatalogue`, `SodGuardImpl`, `SodBlock` |
| `delegation` | Delegations, scopes, overlap policy, actor sets | `Delegation`, `DelegationScope`, `OverlapPolicy`, `ActorSet` |
| `approval` | Chains, steps, instances, decisions | `ApprovalChain`, `ApprovalInstance`, `StepDecision` |
| `notification` | Templates, notices, channels, SLA and escalation rules | `NoticeTemplate`, `Notice`, `EscalationRule`, `SlaSweep` |
| `work` | Work items, approvals inbox, exception centre, pins and recent pages | `WorkItem`, `ExceptionFeed`, `PagePin` |
| `audit` | Log entries, the chainer, checkpoints, record history, SIEM forwarding | `AuditEntry`, `CommandAudit`, `Chainer`, `ChainVerifier`, `RecordHistory` |
| `masterdata` | Fiscal years, budget types, standard prices, calendar milestones | `FiscalYear`, `StandardPrice`, `Milestone` |
| `calendar` | Holidays and the working-day count | `WorkingCalendarImpl`, `Holiday` |
| `site` | Policy pages, footer data, privacy notice | `PolicyPage`, `PolicyVersion` |
| `privacy` | Data dictionary, retention, data subject requests, breaches, ROPA, consent | `DataDictionary`, `RetentionSchedule`, `DataSubjectRequest`, `BreachCase`, `RopaExport` |
| `ai` | Model gateway, co-work threads, tool routing and, as a proposal, the shared agent runtime | `AiGatewayImpl`, `CoworkThread`, `AssistantRouter` |
| `documents`, `files`, `crypto`, `search` | PDF and PAdES, S3 files with scanning, field encryption and keys, OpenSearch indexing. The cross-cutting chapter holds their design | `DocumentServiceImpl`, `FileStoreImpl`, `FieldCryptoImpl`, `SearchIndexerImpl` |
| `admin` | Interface status, backup status, the Administration tabs | `InterfaceStatus`, `BackupStatus` |
| `outbox` | Outbox table and relay | `OutboxWriter`, `OutboxRelay` |

### Published interfaces {#plt-published}

| Interface | Used by | Purpose | Requirements |
| --- | --- | --- | --- |
| `TenantContext` | All modules | The bound tenant and its feature settings | PLT-FR-002, PLT-IR-002 |
| `Authorizer` | All modules | `require(authority)`, `scope(unit)`, and `actors(role, scope)` returning an `ActorSet` | PLT-FR-036, PLT-IR-002 |
| `Delegations` | `Authorizer`, all modules | `activeFor(user, role, scope)`, `onBehalf(actorSet)` for the text and the number | PLT-FR-050, PLT-FR-051 |
| `SodGuard` | All modules | `check(rule, actorSet, others, item)` | PLT-FR-039 to PLT-FR-042, PRC-NFR-002 |
| `AuditLog` | All modules | `record(action, item)` in the caller's transaction | PLT-FR-087, PLT-IR-003 |
| `Notifier` | All modules | `send(templateKey, params, audience)` | PLT-FR-071, PLT-FR-073, PLT-IR-003 |
| `WorkItems` | All modules | `open`, `close`, `reassign` a task for a user, a role or a role in a unit | PLT-FR-079, PLT-IR-003 |
| `ApprovalRoutes` | All modules | `start(chainKey, subject, context)`, `decide`, `returnTo` | PLT-FR-062 to PLT-FR-068 |
| `WorkingCalendar`, `FiscalCalendar` | All modules | `addWorkingDays`, `fiscalYearOf`, `isOpen(year)` | PLT-IR-004, BR-PLT-21, BR-PLT-22 |
| `UnitDirectory`, `SubjectDirectory` | All modules | Unit tree and names; a name or a placeholder for a subject reference | PLT-FR-093 |
| `StandardPrices` | `budget`, `procurement` | Live price list | PLT-FR-103 |
| `RetentionRegistry` | All modules | Retention keys and the period for each | PLT-FR-110 |
| `DocumentService`, `FileStore`, `FieldCrypto`, `SearchIndexer`, `AiGateway` | All modules | Shared services of the ADRs | ADR-0009, ADR-0010, ADR-0011, ADR-0013, ADR-0016 |
| `AgentRuntime`, `AgentCatalogue` | Modules with agents, `review` | Proposal: see [the shared agent runtime](#plt-agent-runtime) (DG-REV-01) | REV-FR-036 |
| `AssistantRouter` | `review` | Proposal: routes an assistant request to tools, and refuses the requests of BR-PLT-25 before any model call | PLT-FR-129, REV-IR-005 |
| `RetentionHold`, `InterfaceReporter` (SPI) | Implemented by the modules | Legal holds on a subject's records; status of each adapter | PLT-FR-112, PLT-IR-006 |
| Events in `api.events` | Any module, and RabbitMQ through the outbox | The event catalogue in the interface section | ADR-0008 |

### Answer to the Procurement requests {#plt-dg-prc}

DG-PRC-08 lists what Procurement asks from Platform. This table confirms or changes each request, and the Procurement chapter applies the changes (DG-PLT-02).

| Request | Answer | Change |
| --- | --- | --- |
| `TenantContext`, `Authorizer` | Confirmed | None |
| `Delegations` | Confirmed, and it returns all delegations in force | Callers pass an `ActorSet` and stop building an actor list |
| `SodGuard.check(rule, actors, others, item)` | Confirmed, with a refusal logged in its own transaction | `actors` becomes `ActorSet`. SD-02, SD-06 and SD-07 run through the guard too |
| `AuditLog` | Confirmed | Entries hold no free text; `CommandAudit` passes an action key and item ids |
| `Notifier` | Confirmed, also for e-mail (PRC-IR-016) | Callers pass a template key and parameters, never text |
| `WorkingCalendar` | Confirmed | The `holiday` table moves from the Procurement schema to Platform |
| `DocumentService`, `FileStore`, `FieldCrypto`, `AiGateway`, `SearchIndexer` | Confirmed as Platform interfaces | None; the cross-cutting chapter holds the design |
| One retention schedule in `platform` | Confirmed through `RetentionRegistry` | Procurement also implements `RetentionHold` |
| Subject table and `*_ref` columns | Confirmed through `SubjectDirectory` | None |
| My Work items, which the chapter calls tasks | Added | The task sweep of Procurement calls `WorkItems` |
| Supplier sign-in (DG-PRC-12) | Confirmed: a Keycloak user under a supplier organization | Platform binds the user; Procurement owns the tax ID check |

### Shared agent runtime (proposal) {#plt-agent-runtime}

DG-REV-01 proposes one agent runtime in `platform.ai`, so that all agents of all modules run on one framework (REV-FR-036). Budget, Procurement and Finance all run agents and nothing may depend on `review`, so the runtime must sit in Platform. Each module keeps only its tools.

| Part | Owner | Holds | Requirements |
| --- | --- | --- | --- |
| `AgentRuntime` | `platform.ai` | `start`, `nextStep`, `decide` and `stop` for a run | REV-FR-037, REV-FR-041 to REV-FR-045 |
| `AgentCatalogue` | `platform.ai` | Agents, switches and levels per tenant | REV-FR-035, REV-FR-049, REV-FR-050 |
| `agent_profile`, `agent_run`, `agent_step` | Schema `platform` | The tables the Review chapter lists, under key `plt.ai.use` | REV-DR-001 |
| `ai_use` | Schema `platform` | The table in the data design, with the Procurement columns `tool`, `version`, `draft` and `final_text` added | PRC-FR-181, PRC-FR-185 |
| Tool registers | Each module | The module's tools and its `ToolRegister` | REV-FR-038 |

> [!OPEN] The technical lead must agree this proposal with the Platform and Procurement chapter owners (DG-REV-01). Budget and Finance still hold their own agent tables and follow the same decision (DG-FIN-06). How `AgentRuntime` calls a module's tools without depending on that module is not designed yet, and needs an SPI that the same decision must settle.

## Domain model {#plt-domain}

<!-- covers: PDPA 24; PDPA 33 -->

The domain classes are plain Java with no Spring or JPA imports. Each command loads one aggregate, calls a method that checks its rules, and saves. Names follow the prototype fields where a field carries over.

{{fig:plt-class | Platform aggregates and their parts}}

> [!NOTE] The aggregates, class names and error codes in this section are a proposal.

### Aggregates and invariants {#plt-aggregates}

| Aggregate | Parts | Invariants held |
| --- | --- | --- |
| `Tenant` | Settings | Values stay within `SettingRange`; one cell at a time |
| `Unit` | None | Code unique per tenant; no cycle in the parent tree; retired when in use |
| `UserAccount` | Suspension record | One role and one unit (OI-PLT-05); never deleted |
| `Delegation` | None | Delegator holds the scope's role directly; delegate is another active user; end not before start; number never reused |
| `ApprovalChain` | Steps | At least one step; a change makes a new version; locked steps keep their condition |
| `ApprovalInstance` | Decisions | Pinned to one chain version; each step decided once per pass; a decision has an actor and a holder |
| `NoticeTemplate` | Translations | Both languages present; placeholders known to the event |
| `WorkItem` | None | Closed by its cause, never by the reader |
| `FiscalYear` | Milestones | One year per fiscal year number; period fixed by BR-PLT-21 |
| `StandardPrice`, `Holiday` | None | Price 0 or more; retired, never deleted; one entry per date |
| `RetentionRule` | None | 1 to 30 years; never below a legal minimum once one is set |
| `DataSubjectRequest`, `BreachCase` | Evidence, clock | Due date set at receipt; a refusal states its basis |
| `CoworkThread` | Messages, attachments | Owned by one user |

### Value objects and enumerations {#plt-values}

| Type | Values | Notes |
| --- | --- | --- |
| `RoleId` | `div`, `divhead`, `plan`, `exec`, `fin`, `finhead`, `proc`, `prochead`, `committee`, `audit`, `admin`, `vendor` | PLT-FR-031. `dpo` joins under DG-PLT-09 |
| `DelegationScope` | `transfer`, `review`, `committee`, `spend` | BR-PLT-11 |
| `DelegationState` | `future`, `active`, `held`, `expired`, `revoked` | Derived; `held` is new, PLT-FR-060 |
| `StepCondition` | `always`, `amountAtLeast` | Plus `committee`, the locked rule of `needsCommittee` |
| `FiscalYearStatus` | `setup`, `request`, `execution`, `closed` | BR-PLT-21 |
| `Channel` | `app`, `mail`, and `sms` or `line` if OI-PLT-14 allows | A user may choose channels, except for notices that law or a security rule requires |
| `Severity` | `bad`, `warn` | Exceptions |
| `DataClass` | `Restricted`, `Confidential`, `Internal`, `Public` | ADR-0013 |
| `ActorSet` | The user, the role acted in, and each delegation in force | Replaces `sodActors` |

### Where each business rule is enforced {#plt-rule-map}

The server enforces every rule below. Screens may repeat a check to help the user, and they are never the control (ADR-0006). Error codes are defined in the interface section.

| Rule | Subject | Enforced in | Error code |
| --- | --- | --- | --- |
| BR-PLT-01 | Tenant isolation | `TenantBinding`, row-level security | `PLT_NOT_FOUND` |
| BR-PLT-02 | One role, one unit | `UserAccount` | `PLT_INVALID_INPUT` |
| BR-PLT-03 | Active account with MFA | Keycloak required action, `SessionPolicy` | `PLT_ACCOUNT_SUSPENDED` |
| BR-PLT-04 | Suspension | `UserAccount.suspend` | `PLT_REASON_REQUIRED` |
| BR-PLT-05 | Idle timeout | Keycloak session limit, set from `tenant_setting` by `SessionPolicy` | 401, no module code |
| BR-PLT-06 | Page and action access | `AuthorityCheck` | `PLT_FORBIDDEN` |
| BR-PLT-07 | Administrator holds no approval | Role grants; `ApprovalChain` refuses `admin` as owner | `PLT_INVALID_INPUT` |
| BR-PLT-08 | Duty check | `SodGuardImpl.check` | `PLT_SOD_BLOCKED` |
| BR-PLT-09 | Switching a duty rule | `SodCatalogue.setEnabled`, `SodRule.assertSwitchable` | `PLT_RULE_LOCKED`, `PLT_REASON_REQUIRED` |
| BR-PLT-10 | Delegation fields and dates | `Delegation.create` | `PLT_INVALID_INPUT` |
| BR-PLT-11 | Scopes | `DelegationScope` | `PLT_FORBIDDEN` |
| BR-PLT-12 | Who may receive | `Delegation.create` | `PLT_DELEGATE_NOT_ALLOWED` |
| BR-PLT-13 | No re-delegation | `Delegation.create`, `Delegations.activeFor` | `PLT_DELEGATE_NOT_ALLOWED` |
| BR-PLT-14 | The delegator keeps authority | `AuthorityCheck` | None |
| BR-PLT-15 | Route shape | `ApprovalChain.newVersion` | `PLT_INVALID_INPUT` |
| BR-PLT-16 | Minimum steps and locked step | `ApprovalChain.newVersion` | `PLT_STEP_LOCKED` |
| BR-PLT-17 | SLA, reminders, escalation | `SlaSweep`, `EscalationRule` | `PLT_SETTING_OUT_OF_RANGE` |
| BR-PLT-18 | Reason length | `ReasonText` | `PLT_REASON_REQUIRED` |
| BR-PLT-19 | Append-only log | `CommandAudit`, no update or delete grant | None |
| BR-PLT-20 | Retire or delete | `Retirable.retire` | `PLT_IN_USE` |
| BR-PLT-21 | Fiscal year | `FiscalYear`, `FiscalCalendar.isOpen` | `PLT_YEAR_CLOSED` |
| BR-PLT-22 | Working days | `WorkingCalendarImpl` | None |
| BR-PLT-23 | Retention | `RetentionRule`, retention job | `PLT_SETTING_OUT_OF_RANGE` |
| BR-PLT-24 | Legal basis | `DataDictionary`, `ConsentRecord` | None, checked in CI |
| BR-PLT-25 | AI limits | `AssistantRouter`, the tool registers | `PLT_AI_NOT_ALLOWED` |
| BR-PLT-26 | The system does not decide | `WorkItem` holds a link and no action | None |

### Limits in code and tenant settings {#plt-limits}

Each setting has a range in `SettingRange` and a value in `tenant_setting`, with an effective date. A range marked proposed is not in the code and waits for the issue named.

| Setting | Range in code | Default as tenant data | Rule |
| --- | --- | --- | --- |
| `idleMin` | 5 to 60 minutes, proposed in XC-SEC-008; OI-PLT-06 | 30 | BR-PLT-05 |
| `warnMin` | Proposed: at least 1 and below `idleMin`; OI-PLT-06 | 5 | BR-PLT-05 |
| Step `slaDays` | 1 to 60 | 5 for a new step | BR-PLT-15 |
| `remind`, `after` | 0 to 30 days | 1 | BR-PLT-17 |
| `to` | Any role except `admin` | `exec` | BR-PLT-17 |
| Retention years | 1 to 30 | As in the SRS PDPA table | BR-PLT-23 |
| `delegationOverlap` | `warn` or `forbid`; OI-PLT-01 | `warn` | PLT-FR-061 |
| Reason minimum | 10 characters, fixed | Not a setting | BR-PLT-18 |

## States and transitions {#plt-states}

State names are those of the SRS. Each transition is a method on the aggregate, which checks the current state and the guards.

### Delegation {#plt-state-delegation}

{{fig:plt-state-delegation | States of a delegation}}

A delegation stores its dates and `revoked_at`. `Delegation.state(today, parties)` derives the state, so no job moves it. `held` is new: the prototype keeps a delegation running while a party is suspended (PLT-FR-060).

| From | To | Command | Guard | Event |
| --- | --- | --- | --- | --- |
| (none) | future, active | `Delegation.create` | BR-PLT-10 to BR-PLT-13, overlap policy | `delegation.created` |
| future | active | Derived | Start date arrives | None |
| active | expired | Derived | End date passes | None |
| active | held | Derived | A party is suspended or changes role | None |
| held | active | Derived | The party is reactivated within the dates | None |
| future, active, held | revoked | `Delegation.revoke` | Delegator or `plt.delegation.admin`, with a reason | `delegation.revoked` |

### User account {#plt-state-user}

{{fig:plt-state-user | States of a user account}}

| From | To | Command | Guard | Effect |
| --- | --- | --- | --- | --- |
| (none) | MFA setup needed | `UserAccount.create` | Unit in use, valid role | Keycloak user with a required action |
| MFA setup needed | Active | Keycloak event | MFA credential exists | Audit entry |
| Active | Suspended | `UserAccount.suspend` | Reason of at least 10 characters | All sessions end; delegations held; open work items reassigned to the role |
| Suspended | Active | `UserAccount.reactivate` | None | Audit entry |

### Approval step {#plt-state-approval}

{{fig:plt-state-approval | States of an approval step}}

| From | To | Command | Guard | Effect |
| --- | --- | --- | --- | --- |
| (none) | Skipped, Waiting | `ApprovalRoutes.start` | Step condition | Work item for the first waiting step |
| Waiting | Approved | `ApprovalRoutes.decide` | Authority, `SodGuard` | Next step opens; the module moves its own state on the last step |
| Waiting | Returned | `ApprovalRoutes.returnTo` | Reason; target step is earlier | The chosen step opens |
| Waiting | Rejected | `ApprovalRoutes.decide` | Reason | Instance ends; the module applies its own state |

### Data subject request {#plt-state-dsr}

{{fig:plt-state-privacy | States of a data subject request}}

| From | To | Command | Guard |
| --- | --- | --- | --- |
| (none) | Received | `DataSubjectRequest.open` | Kind is access, correction, deletion or objection |
| Received | Verified | `verify` | Identity evidence attached |
| Verified | In progress | `start` | Owner assigned |
| In progress | Fulfilled | `fulfil` | Evidence attached; `RetentionHold` clear for deletion |
| Received, In progress | Refused | `refuse` | Basis stated to the requester |

> [!NOTE] Fiscal year status and interface status keep the simple tables of the SRS. The code imposes no order on fiscal year status, and OI-PLT-10 decides whether it should.

## Dynamic behaviour {#plt-dynamic}

<!-- covers: PDPA 23; PDPA 33; PDPA 37 -->

### Sign-in and idle timeout {#plt-activity-signin}

The cross-cutting chapter holds the token flow. Keycloak runs the sign-in and the MFA and enforces the idle limit, and Platform decides afterwards whether a session may start.

{{fig:plt-activity-signin | Sign-in and idle timeout}}

- The privacy notice shows before the redirect, so a person reads it before any session exists (PLT-FR-108).
- The browser refreshes its token only after user activity (PLT-FR-015), so the Keycloak limit measures use and an idle or closed tab lets the session end (PLT-FR-017). The warning runs in the browser.
- Suspending a user or changing a role calls Keycloak to end all sessions of that user (PLT-FR-018).
- A blocked account arrives as a Keycloak event, and `SignInEvents` alerts the administrator and the auditor (PLT-FR-019).

### Creating a delegation {#plt-activity-delegation}

{{fig:plt-activity-delegation | Creating a delegation}}

The overlap check compares the delegator, the scope and the date range against delegations not yet ended. With `warn`, the form shows the overlap and asks for a confirmation with a reason. With `forbid`, the command refuses and a row lock on the delegator's delegations stops two commands racing. Until OI-PLT-01 is decided the default is `warn`, which keeps what the prototype allows and makes it visible.

```sql
-- Proposal: the overlap query. Date ranges are inclusive, so [start, end] uses daterange '[]'.
SELECT id, delegate_id, start_on, end_on
  FROM platform.delegation
 WHERE delegator_id = :delegator AND scope = :scope AND revoked_at IS NULL
   AND daterange(start_on, end_on, '[]') && daterange(:start, :end, '[]')
   FOR UPDATE;
```

### Acting on behalf and the duty check {#plt-seq-acting}

{{fig:plt-seq-acting | Acting on behalf and the duty check}}

- `Authorizer.actors(role, scope)` gives the module an `ActorSet`. When the user holds the role directly, the set has the user only and no delegation, as `sodActors` does today.
- With more than one delegation in force, the guard checks every delegator. The decision records the delegation the user chose. A form offers the choice when more than one applies.
- A refusal runs in `REQUIRES_NEW`, so the `sod_block` row and its audit entry survive the rollback of the command (PLT-NFR-003).
- A successful decision stores the actor, the holder and the delegation number, and raises `delegation.used`, which tells the delegator (PLT-FR-054).

### An approval step, its notice and escalation {#plt-seq-approval}

{{fig:plt-seq-approval | An approval step, its notice and escalation}}

- `ApprovalRoutes.start` pins the chain version, so later route changes leave the instance alone (PLT-FR-065).
- The notice goes through the outbox, so a failed e-mail never undoes a business change, and its state shows to users (ADR-0008).
- `SlaSweep` replaces the prototype's button and covers every open step of every chain, where the prototype covers two statuses of a budget request (PLT-FR-078).
- The due date uses calendar days as the code does, behind one method, so OI-PLT-11 can change it with no other edit.

### Erasing a person {#plt-seq-erasure}

{{fig:plt-seq-erasure | Erasing a person with the audit chain intact}}

Erasure destroys the per-subject key (ADR-0015), and adds the reference to the erasure list that the cross-cutting chapter describes for restores. Audit entries keep the same reference, the chain stays valid, and `SubjectDirectory` returns a placeholder from then on. Where a module holds a legal duty to keep a record, `RetentionHold` names it and the requester sees the reason (ADR-0014, PLT-FR-112).

### Breach workflow {#plt-breach}

A `BreachCase` starts its clock when someone records awareness of a suspected breach. The case shows the time left against the 72-hour limit, the 15-day outer limit for late notice, the step for telling affected people when risk is high, and, on hosted tenants, the 72-hour report from the operator to the controller. Limits are rule data with a date, cited to PDPA 37, and the law review of ADR-0014 must confirm them (OI-PLT-12).

### Scheduled work {#plt-jobs}

Jobs run per cell and work tenant by tenant, each with the tenant bound as for a web request. Each job is safe to run twice, and a lock lets one instance run it at a time.

| Job | Does | Requirements |
| --- | --- | --- |
| SLA sweep, 07:00 | Reminders and escalations for open steps | PLT-FR-077, PLT-FR-078 |
| Retention, daily | Notice 30 days ahead, then deletes or anonymises ended records that have no hold | PLT-FR-110, PLT-FR-111 |
| Chain checks | Run as the cross-cutting chapter states; Platform shows the last result | PLT-FR-092 |
| Privileged account review | Opens a work item each quarter | PLT-FR-020 |
| Backup status | Reads the state of backups and restore tests | PLT-FR-140 |
| Outbox relay | Publishes events and retries adapters | ADR-0008 |

## Data design {#plt-data}

<!-- covers: PDPA 33; PDPA 39; PDPA 41 -->

Tables live in the schema `platform` of the cell's PostgreSQL cluster (ADR-0005). Other modules never read them; they use `platform.api`. The rules for every table in the Procurement chapter apply here too: `tenant_id` first in each key, row-level security enabled and forced, common columns, expand and contract migrations.

> [!NOTE] Every table, column, type and index in this section is a proposal. The tables are the logical design, and the data dictionary chapter will hold the final columns.

{{fig:plt-er | Core platform tables. The full list follows.}}

### Tables {#plt-data-tables}

Class is the ADR-0013 class of the row as a whole; field exceptions are in the next table. Retention key is the entry in the schedule of ADR-0014. No period is stated beyond the SRS defaults, because OI-PLT-13 is open.

| Table | Key columns | Class | Retention key | Requirements |
| --- | --- | --- | --- | --- |
| `tenant` | `id`, `cell_id`, `status`, `name`, `kind` | Internal | `plt.tenant` | PLT-FR-001, PLT-FR-005 |
| `tenant_setting` | `key`, `value`, `effective_from` | Internal | `plt.tenant` | PLT-FR-003, PLT-FR-004 |
| `unit` | `code`, `parent_id`, `name_th`, `name_en`, `retired_on`, `retired_why` | Internal | `plt.org` | PLT-FR-022, PLT-FR-023 |
| `subject` | `subject_ref`, `details_enc`, `key_ref`, `erased_at` | Restricted | `plt.subject` | PLT-DR-003, PLT-FR-115 |
| `user_account` | `subject_ref`, `role_id`, `unit_id`, `status`, `suspended_at`, `suspended_why`, `version` | Confidential | `plt.org` | PLT-FR-024 to PLT-FR-028 |
| `role`, `role_authority` | `id`, `name_th`, `name_en`; `authority` | Internal | `plt.org` | PLT-FR-031, PLT-FR-037 |
| `sod_switch` | `rule_id`, `enabled`, `why`, `changed_by_ref` | Internal | `plt.sod` | PLT-FR-043, PLT-FR-044 |
| `sod_block` | `at`, `actor_ref`, `role_id`, `rule_id`, `item`, `clash_ref`, `delegation_id` | Confidential | `plt.sod` | PLT-FR-040, PLT-FR-045 |
| `delegation` | `no`, `delegator_id`, `delegate_id`, `scope`, `start_on`, `end_on`, `why`, `overlap_why`, `revoked_at`, `revoked_why` | Confidential | `plt.delegation` | PLT-FR-047 to PLT-FR-061, PLT-DR-001 |
| `approval_chain`, `approval_step` | `key`, `version`, `effective_from`; `seq`, `owner_role`, `sla_days`, `condition`, `amount`, `locked` | Internal | `plt.approval` | PLT-FR-062, PLT-FR-063, PLT-FR-066 |
| `approval_instance`, `step_decision` | `chain_id`, `subject_type`, `subject_id`, `current_seq`; `seq`, `decider_ref`, `holder_ref`, `delegation_id`, `result`, `why` | Confidential | `plt.approval` | PLT-FR-064, PLT-FR-065, PLT-FR-067, PLT-FR-068 |
| `notice_template` | `event_key`, `subject_th`, `subject_en`, `body_th`, `body_en`, `channels` | Internal | `plt.notice` | PLT-FR-072 |
| `escalation_rule` | `step_id`, `remind_days`, `after_days`, `to_role` | Internal | `plt.notice` | PLT-FR-076 |
| `notice`, `notice_read` | `template_key`, `params`, `audience`, `link`; `notice_id`, `user_id`, `read_at` | Confidential | `plt.notice` | PLT-FR-069 to PLT-FR-071 |
| `work_item` | `kind`, `title_key`, `params`, `assignee_user`, `assignee_role`, `assignee_unit`, `due_on`, `link`, `severity`, `state`, `instance_id` | Internal | `plt.work` | PLT-FR-079 to PLT-FR-085 |
| `page_pin`, `page_recent` | `user_id`, `link`, `label`, `at` | Internal | `plt.work` | PLT-FR-086 |
| `audit_entry` | `seq`, `at`, `subject_ref`, `role_id`, `action`, `item_type`, `item_id`, `outcome`, `delegation_no`, `prev_hash`, `hash` | Internal | `plt.audit` | PLT-FR-087 to PLT-FR-094 |
| `audit_checkpoint` | `seq`, `hash`, `at`, `store_ref` | Internal | `plt.audit` | PLT-FR-092 |
| `fiscal_year` | `fy`, `status`, `start_on`, `end_on`, `status_why` | Internal | `plt.master` | PLT-FR-097 to PLT-FR-099 |
| `calendar_milestone`, `holiday` | `fy`, `name`, `on_date`, `owner_role`, `custom`; `day`, `name` | Internal | `plt.master` | PLT-FR-100, PLT-FR-101 |
| `budget_type`, `standard_price` | `code`, `name`; `no`, `type_id`, `name`, `unit`, `price`, `retired_on` | Internal | `plt.master` | PLT-FR-102, PLT-FR-103 |
| `policy_page`, `policy_version` | `kind`; `version_no`, `body_th`, `body_en`, `published_on` | Public | `plt.site` | PLT-FR-105 to PLT-FR-107 |
| `retention_rule` | `key`, `years`, `basis`, `legal_min_years` | Internal | `plt.privacy.case` | PLT-FR-109 to PLT-FR-112 |
| `data_dictionary_entry` | `module`, `table_name`, `column_name`, `class`, `purpose`, `legal_basis`, `retention_key` | Internal | `plt.privacy.case` | PLT-FR-113 |
| `data_subject_request` | `kind`, `requester_ref`, `due_on`, `state`, `owner_ref`, `evidence_key`, `refusal_basis` | Confidential | `plt.privacy.case` | PLT-FR-114 |
| `breach_case` | `aware_at`, `risk`, `pdpc_told_at`, `subjects_told_at`, `controller_told_at`, `state` | Confidential | `plt.privacy.case` | PLT-FR-116 |
| `processing_activity` | `role`, `purpose`, `categories`, `recipients`, `retention_key` | Internal | `plt.privacy.case` | PLT-FR-117 |
| `consent_record` | `subject_ref`, `purpose`, `notice_version`, `given_at`, `withdrawn_at` | Confidential | `plt.privacy.case` | PLT-FR-119 |
| `ai_thread`, `ai_message`, `ai_use` | `user_id`, `title`, `agent`, `pinned`; `role`, `text_enc`, `steps`; `agent`, `user_ref`, `action`, `target`, `source_count` | Confidential | `plt.ai.use` | PLT-FR-127 to PLT-FR-135, PLT-DR-007 |
| `interface_status`, `backup_status` | `interface_id`, `direction`, `method`, `status`, `last_run_at`, `row_count`; `full_at`, `incremental_at`, `restore_test_at` | Internal | `plt.ops` | PLT-FR-139, PLT-FR-140, PLT-IR-006 |
| `operator_access` | `operator_ref`, `tenant_id`, `reason`, `approved_by`, `from_at`, `to_at` | Confidential | `plt.audit` | ADR-0013 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | `plt.outbox` | ADR-0008 |

### Personal and restricted fields {#plt-data-fields}

This table feeds the data dictionary and the records of processing (ADR-0014, PDPA 39, PLT-DR-005). The legal basis of each field is for the data protection officer to confirm.

| Field | Class | Protection | Rule |
| --- | --- | --- | --- |
| `subject.details_enc` | Restricted | AES-256-GCM through Tink, under a per-subject key wrapped by the tenant key | Destroying the key erases the person (ADR-0015) |
| `*_ref` columns | Confidential | Pseudonymous reference | Reports show a placeholder after erasure |
| `delegation.why`, `user_account.suspended_why`, `step_decision.why` | Confidential | Encrypted storage, role-based access | Stay in the business record, never in the audit log (PLT-DR-004) |
| `ai_message.text_enc` and attachments | Confidential, possibly Restricted | Field encryption, owner only, ClamAV scan on files | Period of the AI chat class (PLT-DR-007) |
| `notice.params` | Confidential | References, no names | Text is built at read time |
| `data_subject_request`, `breach_case` | Confidential | Role-based access for the data protection officer | Evidence files carry a tenant key |

### Files, search and retention {#plt-data-files}

- Evidence and chat attachments are objects in S3 API storage, linked by key, scanned before download and encrypted under a tenant key (ADR-0010).
- OpenSearch indexes pages, units and master data for the search box, with each query filtered by tenant and authority on the server (ADR-0009). Restricted data is never indexed.
- Each retention key names one row of `retention_rule`, and every module registers its keys through `RetentionRegistry`.

## Interface design {#plt-interfaces}

The REST API is described in OpenAPI 3.1 (ADR-0003), and the events in AsyncAPI (ADR-0008). The tenant comes from the token and never from the path. State-changing calls carry `If-Match` with the aggregate version.

### REST endpoints {#plt-rest}

> [!NOTE] This endpoint list is a proposal. Paths are relative to `/api/v1/platform`, and the authority names are defined in the security section.

| Method and path | Purpose | Authority | Requirements |
| --- | --- | --- | --- |
| `GET /me`; `POST /me/sign-out` | Signed-in user, sign-out | Any session | PLT-FR-013 to PLT-FR-017 |
| `GET, PUT /tenant/settings` | Tenant settings | `plt.tenant.write` | PLT-FR-003, PLT-FR-004 |
| `GET, POST /units`; `GET, PUT /units/{id}`; `POST /units/{id}/retire, reinstate`; `DELETE /units/{id}` | Units | `plt.org.write` | PLT-FR-022, PLT-FR-023 |
| `GET, POST /users`; `GET, PUT /users/{id}`; `POST /users/{id}/suspend, reactivate` | Users | `plt.org.write` | PLT-FR-024 to PLT-FR-028 |
| `GET /roles`; `GET /permission-matrix` | Roles and the matrix | `plt.org.read` | PLT-FR-031, PLT-FR-033, PLT-FR-034 |
| `GET /duty-rules`; `PUT /duty-rules/{id}`; `GET /duty-blocks` | Duty rules and blocks | `plt.sod.read`, `plt.sod.write` | PLT-FR-038, PLT-FR-043 to PLT-FR-045 |
| `GET, POST /delegations`; `POST /delegations/overlap-check`; `POST /delegations/{id}/revoke` | Delegations | `plt.delegation.give`, `plt.delegation.admin` | PLT-FR-047 to PLT-FR-061 |
| `GET, POST /approval-chains`; `GET /approval-chains/{key}/versions/{v}` | Chains and versions | `plt.route.write` | PLT-FR-062, PLT-FR-063, PLT-FR-066 |
| `GET, PUT /notice-templates`; `POST /notice-templates/{id}/preview`; `GET, PUT /escalation-rules` | Templates and SLA | `plt.notice.write` | PLT-FR-072, PLT-FR-076 |
| `GET /notices`; `POST /notices/{id}/read`; `POST /notices/read-all` | A user's notices | Any session | PLT-FR-069 to PLT-FR-071 |
| `GET /work`; `GET /work/approvals`; `GET /work/exceptions`; `GET, POST, DELETE /work/pins`; `GET /work/recent` | My Work | Any session, filtered | PLT-FR-079 to PLT-FR-086 |
| `GET /audit`; `GET /audit/export`; `GET /history/{type}/{id}` | Log, export, record history | `plt.audit.read`; record's read authority | PLT-FR-089, PLT-FR-090, PLT-FR-096 |
| `GET, POST /fiscal-years`; `PUT /fiscal-years/{fy}/status` | Fiscal years | `plt.master.write` | PLT-FR-097, PLT-FR-098 |
| `GET, POST, PUT, DELETE /calendar-milestones`; `GET, POST, DELETE /holidays` | Calendar | `plt.master.write` | PLT-FR-100, PLT-FR-101 |
| `GET /budget-types`; `GET, POST, PUT /standard-prices`; `POST /standard-prices/{id}/retire, reinstate` | Budget types and prices | `plt.price.write` | PLT-FR-102 to PLT-FR-104 |
| `GET /policies`; `GET /policies/{kind}`; `POST /policies/{kind}/versions` | Policy pages, open to any reader | None to read; `plt.site.write` to publish | PLT-FR-106, PLT-FR-107 |
| `GET, PUT /retention`; `GET /privacy/dictionary`; `GET /privacy/ropa` | Retention, dictionary, ROPA | `plt.privacy.read`, `plt.retention.write` | PLT-FR-109, PLT-FR-113, PLT-FR-117 |
| `GET, POST /privacy/requests`; `POST /privacy/requests/{id}/verify, start, fulfil, refuse` | Data subject requests | `plt.privacy.case` | PLT-FR-114, PLT-FR-115 |
| `GET, POST /privacy/breaches`; `POST /privacy/breaches/{id}/notify` | Breach cases | `plt.privacy.case` | PLT-FR-116 |
| `GET /systems`; `GET /search` | System list and search | Any session, filtered | PLT-FR-120 to PLT-FR-126 |
| `GET, POST, DELETE /cowork/threads`; `POST /cowork/threads/{id}/messages` | AI co-work | `plt.ai.use`, own threads only | PLT-FR-127 to PLT-FR-136 |
| `GET /interfaces`; `POST /interfaces/{id}/run`; `GET /backup-status` | Interfaces and backup status | `plt.interface.read`, `plt.interface.run` | PLT-FR-139, PLT-FR-140 |

### Error catalogue {#plt-errors}

> [!NOTE] These codes are a proposal and follow the error model of the cross-cutting chapter. An ended session answers 401 with no module code.

| Code | HTTP | Meaning | Rule or requirement |
| --- | --- | --- | --- |
| `PLT_INVALID_INPUT` | 400 | A field fails validation | BR-PLT-10, BR-PLT-15 |
| `PLT_REASON_REQUIRED` | 400 | A reason is missing or too short | BR-PLT-18, PLT-FR-044 |
| `PLT_ACCOUNT_SUSPENDED` | 403 | The account is suspended | BR-PLT-04, PLT-FR-012 |
| `PLT_FORBIDDEN` | 403 | The user lacks the authority | PLT-FR-036 |
| `PLT_SOD_BLOCKED` | 403 | A duty rule refuses this person, and the attempt is logged | BR-PLT-08, PLT-FR-040 |
| `PLT_AI_NOT_ALLOWED` | 403 | The tool is off, or the request is outside the AI limits | BR-PLT-25, PLT-FR-129 |
| `PLT_NOT_FOUND` | 404 | The record does not exist or belongs to another tenant | BR-PLT-01 |
| `PLT_VERSION_CONFLICT` | 409 | The record changed since it was read | ADR-0005 |
| `PLT_DELEGATE_NOT_ALLOWED` | 409 | The person cannot give or receive this delegation | BR-PLT-12, BR-PLT-13 |
| `PLT_DELEGATION_OVERLAP` | 409 | The delegation overlaps another under the `forbid` policy, or needs a confirmation under `warn` | PLT-FR-061 |
| `PLT_RULE_LOCKED` | 409 | This duty rule cannot be switched off | BR-PLT-09, PLT-CR-006 |
| `PLT_STEP_LOCKED` | 409 | This step cannot be deleted or changed | BR-PLT-16 |
| `PLT_IN_USE` | 409 | The item is in use; retire it | BR-PLT-20 |
| `PLT_YEAR_CLOSED` | 409 | The fiscal year is closed | BR-PLT-21 |
| `PLT_RETENTION_HOLD` | 409 | Law requires the record to be kept | PLT-FR-112 |
| `PLT_SETTING_OUT_OF_RANGE` | 422 | A setting is outside its allowed range | BR-PLT-17, BR-PLT-23 |

### Event catalogue {#plt-events}

> [!NOTE] This event list is a proposal. Each event is written to `outbox_event` in the transaction of the change, and a relay publishes it to RabbitMQ (ADR-0008). The small setup processes the outbox without RabbitMQ. Consumers drop duplicates by `eventId`. Routing keys start with `platform.`.

Every event carries `eventId`, `tenantId`, `occurredAt` and `aggregateId`, and the fields below. Payloads hold references, never personal data.

| Event | Raised by | Extra fields | Consumers |
| --- | --- | --- | --- |
| `tenant.onboarded`, `tenant.settings-changed` | `tenancy` | `key` | All modules |
| `user.suspended`, `user.role-changed` | `UserAccount` | `userId` | `identity`, `work`, `delegation` |
| `sod.rule-switched`, `sod.blocked` | `sod` | `ruleId`, `enabled` | Notifications to the auditor |
| `delegation.created`, `delegation.revoked`, `delegation.used` | `Delegation`, `Delegations` | `no`, `scope`, `delegatorId`, `delegateId` | Notifications, `work` |
| `approval.step-opened`, `approval.step-decided`, `approval.finished` | `ApprovalInstance` | `chainKey`, `seq`, `result` | `work`, modules |
| `notice.requested` | `Notifier` | `templateKey`, `channels` | E-mail and LINE adapters |
| `audit.chain-broken` | `ChainVerifier` | `seq` | Notifications to the auditor, SIEM |
| `master.fiscal-year-opened`, `master.fiscal-year-status-changed` | `FiscalYear` | `fy`, `status` | `budget`, `finance` |
| `privacy.request-due`, `privacy.breach-clock` | `privacy` | `dueAt` | Notifications to the data protection officer |
| `subject.erased` | `privacy` | `subjectRef` | All modules |

### External adapters {#plt-adapters}

Adapters run on the outbox path, retry safely and show their state to users (ADR-0008).

| Adapter | Port | First implementation | Behaviour | Requirements |
| --- | --- | --- | --- | --- |
| Identity | `IdentityAdmin` | Keycloak admin API and event listener | Creates users, ends sessions, receives sign-in events | PLT-IR-001, PLT-CR-001 |
| E-mail | `MailChannel` | SMTP of the tenant | Sends after commit; no restricted data | PLT-FR-074 |
| SMS, LINE | `MessageChannel` | None until OI-PLT-14 is decided | Reference text only, no personal data | PLT-FR-075 |
| SIEM | `AuditForwarder` | Syslog over TLS, proposed | Forwards entries with references only | PLT-FR-095, PLT-IR-005 |
| Model provider | `AiGateway` | Per tenant, off by default | Removes personal data and logs each call (ADR-0016) | PLT-FR-136, PLT-CR-008 |
| ThaID | `CitizenIdentity` | None until onboarding terms are confirmed | Federated through Keycloak | PLT-FR-021 |

> [!OPEN] ThaID onboarding terms for a SaaS product and the Keycloak Organizations load test at 500 tenants are open items of ADR-0006. The Department of Provincial Administration must confirm the first, and the development team runs the second before cell sizes are fixed.

## Security design {#plt-security}

<!-- covers: PDPA 37; PDPA 40 -->

Keycloak signs users in (ADR-0006), and Platform makes every other decision. Each request verifies the token, binds the tenant with `SET LOCAL app.tenant_id`, checks authority, checks duties and checks business rules, in that order, before it saves. Platform sits at OWASP ASVS Level 2 (ADR-0017). Finance and payment commands at Level 3 rely on `Authorizer` and `SodGuard`, so those interfaces are reviewed with them.

### Authorities {#plt-authorities}

> [!NOTE] The authority names are a proposal. Roles map to authorities as tenant data (PLT-FR-037), and these defaults follow the actor table of the SRS.

| Authority | Default roles | Allows |
| --- | --- | --- |
| `plt.tenant.write` | `admin` | Tenant settings |
| `plt.org.write`, `plt.org.read` | `admin`; `admin`, `audit` | Units and users; reading them |
| `plt.sod.write`, `plt.sod.read` | `admin`; `admin`, `audit` | Duty switches; reading rules and blocks |
| `plt.delegation.give` | `exec`, `plan`, `fin`, by scope | Give delegations |
| `plt.delegation.admin` | `admin` | See all and revoke |
| `plt.route.write`, `plt.notice.write` | `admin` | Chains, templates, SLA |
| `plt.audit.read` | `admin`, `audit` | Audit log and export |
| `plt.master.write` | `admin` | Fiscal years, calendar, holidays |
| `plt.price.write` | `admin`, `fin` | Standard prices |
| `plt.site.write`, `plt.retention.write` | `admin` | Policy texts, retention |
| `plt.privacy.case`, `plt.privacy.read` | `dpo`; `dpo`, `audit`; see DG-PLT-09 | Requests, breaches; reading the dictionary and ROPA |
| `plt.interface.read`, `plt.interface.run` | `admin`, `fin`, by interface | Interface status and runs |
| `plt.ai.use` | Roles the tenant allows, only when AI is on | AI co-work |

### Separation-of-duties engine {#plt-sod}

`SodGuard` holds no business knowledge. The calling module names the rule and passes the group to compare, and the guard adds the delegators. Every rule in the SRS register becomes a catalogue entry with one or more enforcement points, and an architecture test fails a rule with none, which closes the SD-03 gap (PLT-FR-046). SD-07, SD-10 and the second SD-06 path join the guard so that their blocks are logged. SD-09 joins with the BGT chapter's decision.

| Group | Rules | Commands live in |
| --- | --- | --- |
| Procurement | SD-01, SD-02, SD-06, SD-07, SD-08 | `procurement`; see the PRC chapter |
| Finance | SD-03, SD-04, SD-05, SD-11, SD-12, SD-13, SD-14, SD-15, SD-16, P-F05 | `finance`; see the FIN chapter |
| Budget | SD-09, SD-10 | `budget`; see the BGT chapter |

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

### Sessions and tenant isolation {#plt-sessions}

- Each token carries the tenant organization. `TenantBinding` refuses a token whose organization is not routed to this cell.
- The application role has no bypass of row-level security, and CI tests each table (ADR-0005).
- `SessionPolicy` pushes the tenant's `idleMin` to Keycloak. Whether Keycloak can hold a different idle time per organization is DG-PLT-03.
- Operator staff cannot read tenant data without a recorded, approved reason in `operator_access`, with its window enforced by row-level security (ADR-0013, DG-PLT-08).

### Audit {#plt-audit}

- The cross-cutting chapter holds the log itself: rights on the table, the chainer that assigns `seq` and `hash` just after commit, and the checkpoints.
- `ChainVerifier` raises `audit.chain-broken` on a mismatch, and the audit page shows the last result (PLT-FR-092).
- Entries hold a subject reference, an action key and item ids, never names or free text. `RecordHistory` joins the entries, AI uses, versions and comments of one record at read time (PLT-FR-096).
- Revealing a restricted field writes an entry (PLT-FR-094). Application logs and telemetry hold no personal data, and tests check this (ADR-0015, ADR-0017).

### AI controls {#plt-ai-security}

- All AI calls pass through `AiGateway`. AI is off by default, and every feature works with it off (ADR-0016, PLT-FR-136).
- `AssistantRouter` refuses the requests of BR-PLT-25 before any model call, and a module's tool register holds no decision tool. The prototype's word list becomes a test set, and the register is the control.
- A proposed change is a button that runs the normal command, so authority and duty rules apply to the person pressing it (PLT-FR-135).
- The gateway strips personal data, applies the tenant policy and logs each call. Restricted data is never sent (ADR-0016).

## Non-functional design {#plt-nfr}

The table shows how each Platform non-functional requirement is met. Other targets sit in the cross-cutting chapter.

| Requirement | Design answer | Verified by |
| --- | --- | --- |
| PLT-NFR-001 | In-app notices are rows written in the transaction; the bell reads them on its next poll or push | Integration test with a clock |
| PLT-NFR-002 | State derived from dates on the server in the tenant's time zone; `Clock` injected for tests | `DelegationStateTest` |
| PLT-NFR-003 | `SodGuardImpl` writes in `REQUIRES_NEW` | `SodRefusalIT` |
| PLT-NFR-004 | Demo features are not in the production build; a test profile holds sample data | Build check |
| PLT-NFR-005 | Message files and templates in both languages; a template refuses to save with one missing | Unit test, Playwright in both languages |
| PLT-NFR-006 | Labelled test adapters ship only in test profiles | Build check |

### Load and availability {#plt-nfr-load}

- Platform checks run on every request, so authority, delegation and duty lookups must stay cheap. `Delegations.activeFor` reads an index on delegate and dates, and role grants are cached per tenant with invalidation on change.
- Commands insert audit entries with no shared lock, because the chainer works after commit. k6 scripts must measure how far the chainer falls behind at the 30 September peak (ADR-0017).
- `work_item` lists page by assignee and due date, so My Work never scans modules.
- Keycloak is a dependency of sign-in only. A running session survives a short Keycloak outage until its token expires.

> [!OPEN] XC-PER-001 to XC-PER-008 are proposals, and the checks on every request run inside the API targets XC-PER-001 and XC-PER-002, with no target of their own. The product owner must confirm these (OI-XC-01) before load tests can pass or fail (DG-PLT-14).

## Test design {#plt-tests}

The sweep in `tests/sweep.js` runs inside the prototype page and cannot test a server. Its checks are still a statement of intended behaviour, so each one becomes a production test. Every test names the requirements it proves, so coverage can be measured (ADR-0017).

> [!NOTE] The test class names are a proposal.

### Test levels {#plt-test-levels}

| Level | Tool | Covers |
| --- | --- | --- |
| Unit | JUnit | `Delegation.state` for every date and party case, `OverlapPolicy`, `ActorSet`, `SettingRange`, `WorkingCalendar`, the hash |
| Architecture | Spring Modulith `verify`, ArchUnit | No dependency on a business module, no date arithmetic outside the calendar, every duty rule has an enforcement point |
| Integration | JUnit with Testcontainers: PostgreSQL, RabbitMQ, Keycloak | Commands through the REST layer, row-level security per table, audit chain, erasure |
| Module scenario | Spring Modulith `Scenario` | Delegated approval from a business module |
| End to end | Playwright | Sign-in, idle warning, launcher, My Work in Thai and English |
| Load | k6 | Sign-in and audit writes at the 30 September peak |
| Security | OWASP ZAP, SonarQube, penetration test | ASVS levels of ADR-0017 |

### From sweep checks to production tests {#plt-test-walks}

| Sweep check | Production test | Added beyond the check | Requirements |
| --- | --- | --- | --- |
| FC1 walk, `sodCheck` | `SodRefusalIT` | Every rule, with the person and the delegator, a log row and no state change | PLT-FR-039 to PLT-FR-042, PLT-NFR-003 |
| Round 66 idle check | `IdleTimeoutIT`; `idle.spec` | Server ends the session with the tab closed; warning and stay | PLT-FR-015 to PLT-FR-017 |
| Round 65 site check | `site.spec` | Tenant values fill the pages, a published version is kept | PLT-FR-105 to PLT-FR-107 |
| Review step | `record-action.spec` | Typed id for an irreversible action, compensating undo | PLT-FR-141 to PLT-FR-143 |
| E2E walk E-01 | `FiscalYearOpenIT` | Closed year refuses changes; status needs a reason | PLT-FR-097 to PLT-FR-099 |
| Page-open sweep | `role-matrix.spec`: every page for every role, in both languages | Fails on a console error or broken text | Partial rows in general |

### Tests with no sweep ancestor {#plt-test-new}

| Test | Asserts | Requirements |
| --- | --- | --- |
| `DelegationOverlapIT` | Overlaps of the same delegate and of two delegates, under `warn` and `forbid`; a race of two commands; revoking one of two | PLT-FR-061, OI-PLT-01 |
| `TwoDelegatorsSodIT` | A user who holds a scope from two people is refused on a clash with the second | PLT-FR-042 |
| `DelegationLifecycleIT` | Scope and dates hold; suspended party holds it; no re-delegation; every scope reaches My Work | PLT-FR-050, PLT-FR-058 to PLT-FR-060 |
| `SignInIT` | Suspended refused, MFA forced, sessions end on role change | PLT-FR-009 to PLT-FR-012, PLT-FR-018 |
| `TenantIsolationIT` | Generated from the schema: each table refuses a read and a write across tenants | BR-PLT-01, PLT-CR-004 |
| `AuditChainIT` | Tampering is found; each listed command leaves one entry with no personal data; undo leaves both entries | PLT-FR-087, PLT-FR-092, PLT-FR-093, BR-PLT-19 |
| `ErasureIT` | The key is destroyed, the chain verifies, reports show the placeholder, a hold refuses | PLT-FR-112, PLT-FR-115 |
| `BreachClockTest` | Times against 72 hours and 15 days, with a fixed clock | PLT-FR-116 |
| `NoticeTemplateIT` | Each notice comes from its template in the reader's language, read per user | PLT-FR-071, PLT-FR-073 |
| `SlaSweepIT` | Reminder and escalation days at their boundaries, safe to run twice | PLT-FR-077, PLT-FR-078 |
| `DutyRuleCoverageTest` | Every catalogue rule has an enforcement point | PLT-FR-046 |
| `AdminSeparationIT` | `admin` is refused on every business read and approval | PLT-FR-035, BR-PLT-07 |

## Migration from the prototype {#plt-migration}

The prototype is a reference, and no code moves across: it is browser JavaScript with state in memory. What carries over is the knowledge it holds. There is no production data to migrate, and a tenant's opening data is a separate onboarding matter.

| Carries over | How | Source in the prototype |
| --- | --- | --- |
| Roles and their labels | Starter data | `00-core.js` ROLES |
| Duty rule ids and text | `SodCatalogue` | `64-duties.js`, `66c-fin-fn2.js`, `66d-fin-fn3.js`, `66e-fin-fn4.js`, `66f-fin-fn5.js` |
| Delegation scopes and state rule | Rewritten with tests from the SRS | `54-identity.js` |
| Approval route and SLA defaults | Starter chain, as data | `83-admin-crud.js`, `50b-admin-depth.js` |
| Notice templates | Starter templates | `06-seedhelp.js` |
| Policy texts | Starter templates, after legal review | `95b-site.js` sitePolicy |
| System list and launcher behaviour | Rewritten in React | `90-systems.js`, `91-workbench.js` |
| Record history merge | `RecordHistory` | `58-history.js` |
| Thai and English labels | Moved to message files | `L()` labels |

| Does not carry over | Why | Replaced by |
| --- | --- | --- |
| Role switch, sample accounts, fixed code | No real identity (PLT-NFR-004) | Keycloak and `platform` roles |
| `localStorage` state per organisation | One user, no isolation | PostgreSQL with row-level security |
| `delegFor` first match, `sodActors` single delegator | A known defect | `Delegations`, `ActorSet` |
| Role-wide read state and fixed notice text | PLT-FR-071, PLT-FR-073 | `notice_read`, templates |
| Limits of 300 audit entries and 100 blocks | Do not apply to production | No limit, by retention |
| Snapshot undo | Removes audit entries (OI-PLT-09) | Compensating commands |
| Inbox by words in a title | Fragile | `work_item.kind` |
| Sample agency data | Not part of a generic product | Tenant data only |

## Known gaps and open issues {#plt-open}

### Issues carried from the SRS {#plt-open-srs}

| Issue | Effect on this design | Designed for now | Decides |
| --- | --- | --- | --- |
| OI-PLT-01 | Overlapping delegations | `delegationOverlap` setting, default `warn`; every delegator checked | Product owner, legal unit |
| OI-PLT-02 | What may be delegated | `DelegationScope` is a code list; maximum length left open | Executives, legal unit |
| OI-PLT-03 | Rules that cannot be off | `SodRule.lockedOn`, empty for now | Specialists, legal unit |
| OI-PLT-04 | Unwired rules | `DutyRuleCoverageTest` fails until each is wired or removed | Development team, FIN and BGT owners |
| OI-PLT-05 | Several roles or units | One of each; `role_id` can move to a join table without changing `Authorizer` | Product owner |
| OI-PLT-06 | Idle range | Proposed ranges in the limits table | Product owner, security reviewer |
| OI-PLT-07 | MFA for whom | Every user, as in the code | Product owner, security reviewer |
| OI-PLT-08 | Who can delegate | `plt.delegation.give` is tenant data, so the list can widen | Product owner, legal unit |
| OI-PLT-09 | Undo | Compensating commands | Development team |
| OI-PLT-10 | Fiscal year transitions | Free, with a reason and a log | Finance specialist, product owner |
| OI-PLT-11 | SLA days | Calendar days behind one method | Product owner |
| OI-PLT-12 | PDPA clauses | Limits are dated data with a clause field | PDPA lawyer |
| OI-PLT-13 | Retention periods | Keys per table; defaults from the SRS | Records officer, data protection officer |
| OI-PLT-14 | Other channels | `MessageChannel` port with no adapter | IT unit, data protection officer |
| OI-PLT-15 | Standards clauses | Idle and policy pages follow the code; no clause cited | Security reviewer, legal unit |

### New issues from this design {#plt-open-new}

The DG-PLT numbers below belong to this chapter and are not SRS ids.

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-PLT-01 | Should a user with two delegations in one scope choose one per action, or does one action use all? | The user chooses; every delegator is duty-checked | Product owner, legal unit |
| DG-PLT-02 | The Procurement chapter now applies the answer table, and its `holiday` table has moved to `platform`. Does the product owner accept these changes? | As in the answer table | Procurement author, product owner |
| DG-PLT-03 | Can Keycloak Organizations hold a different idle time per tenant, as the cross-cutting chapter assumes? If not, Fisko must measure activity itself | The value stays in `tenant_setting`, and `SessionPolicy` pushes it | Development team |
| DG-PLT-04 | A work item for a role: does the first person to open it claim it, or do all see it until it closes? | All see it, as in the prototype | Product owner |
| DG-PLT-05 | How long do outbox rows stay after publishing? The Procurement data table leaves this to Platform | Key `plt.outbox`, with no period | Development team, product owner |
| DG-PLT-06 | Which steps of a procurement or finance chain may a tenant change, given that the law fixes some approvers? | Locked steps in the starter chains; PRC and FIN name them | Procurement and finance specialists |
| DG-PLT-07 | How often are chain checkpoints written? Aligned: the cross-cutting SDS proposed 1 hour and now uses the value of XC-SEC-035 | At least every 24 hours, as XC-SEC-035 states | Security reviewer |
| DG-PLT-08 | Who approves operator access to tenant data: the tenant or the operator's own officer? | `operator_access` holds the approver; tenant approval proposed | Product owner, data protection officer |
| DG-PLT-09 | The data protection officer has no role in the code. Add `dpo` as a thirteenth role, or grant authority to a user of another role? | A role `dpo` | Product owner, data protection officer |
| DG-PLT-10 | Who administers tenants across a cell in the hosted setup, given that the tenant `admin` must see one tenant only? | A separate operator console outside tenant roles | Product owner |
| DG-PLT-11 | When a user moves unit, do open delegations and work items follow? | Delegations stay; work items return to the role | Product owner |
| DG-PLT-12 | Do policy texts need legal sign-off per tenant before publishing, as the templates cite clauses? | A published version records who approved | Data protection officer |
| DG-PLT-13 | Should a suspended delegator's delegation hold, or should it end? The design holds it | `held`, which returns to `active` on reactivation within the dates | Product owner, legal unit |
| DG-PLT-14 | XC-PER-001 to XC-PER-008 are proposed targets for every module. Do the checks on every request need a target of their own? | The checks fall under XC-PER-001 and XC-PER-002 | Product owner |

### Known gaps in this version {#plt-open-depth}

- `documents`, `files`, `crypto`, `search` and the AI gateway internals are designed in the cross-cutting chapter. This chapter holds their interfaces only.
- Tenant onboarding, cell routing, moving a tenant and restore are named here and designed in the deployment chapter.
- Planned rows with no prototype behaviour have a table and an endpoint only: PLT-FR-019, PLT-FR-020, PLT-FR-116, PLT-FR-117 and PLT-FR-119.
- Column types, indexes and constraints wait for the data dictionary chapter.
