# Module design: Projects {#prj}

> [!NOTE] Fisko has no production code. The prototype is browser JavaScript and shows behaviour only. Everything in this chapter is a proposal to build: the packages, classes, tables, endpoints, events and test names below do not exist yet. The technology comes from the accepted ADRs in `docs/adr/`, which this chapter applies and does not reopen.

## Purpose, scope and traceability {#prj-purpose}

This chapter designs the production Projects module. It answers the Projects chapter of the SRS. The module is small: it joins records that other modules own, gives each project one lasting id, exchanges data with a tenant PM system and governs data shared with others.

Outside this chapter: `budget` owns lines, transfers, allotments, requests and carry-over; `procurement` owns plans, cases, contracts and acceptance; `finance` owns payments, other commitments and GFMIS; `platform` owns roles, approval routes, audit, tasks and interface status.

| SRS group | Requirements | Design section | Main package |
| --- | --- | --- | --- |
| Business rules | BR-PRJ-01 to BR-PRJ-18 | Domain model | all |
| Project register | PRJ-FR-001 to PRJ-FR-011 | Domain model, Data design | `registry` |
| The 8-step cycle | PRJ-FR-012 to PRJ-FR-017 | Dynamic behaviour | `cycle` |
| Project figures | PRJ-FR-018 to PRJ-FR-022 | Domain model | `cycle` |
| Project 360 | PRJ-FR-023 to PRJ-FR-029 | Components, Interface design | `web`, `cycle` |
| Exchange out | PRJ-FR-030 to PRJ-FR-040 | States and transitions, Dynamic behaviour | `exchange` |
| Exchange in | PRJ-FR-041 to PRJ-FR-047 | Dynamic behaviour, Interface design | `exchange` |
| Data sharing | PRJ-FR-048 to PRJ-FR-055 | States and transitions, Security design | `sharing` |
| Workspace | PRJ-FR-056 to PRJ-FR-059 | Components | `exchange`, `sharing` |
| Module and duty map | PRJ-FR-060 to PRJ-FR-062 | Components | `tormap` |
| Settings | PRJ-FR-063 to PRJ-FR-065 | Domain model | `settings` |
| Data requirements | PRJ-DR-001 to PRJ-DR-008 | Data design | all |
| Interface requirements | PRJ-IR-001 to PRJ-IR-009 | Interface design | `api`, `exchange`, `sharing` |
| Non-functional requirements | PRJ-NFR-001 to PRJ-NFR-005 | Non-functional design | all |
| Constraints | PRJ-CR-001 to PRJ-CR-005 | Design overview | all |
| Open issues | OI-PRJ-01 to OI-PRJ-18 | Known gaps and open issues | all |

## Design overview and decisions {#prj-decisions}

Projects sits on top of the money path. `budget`, `procurement` and `finance` do not know it exists (PRJ-CR-001), and only `review` reads from it. It holds few aggregates of its own, and it reads everything else.

| Decision | Reason | Rejected alternative | Source |
| --- | --- | --- | --- |
| The project id is stored and joined to source records by `project_link` rows | An id built from a source record cannot survive a request becoming a line (PRJ-FR-002). The prototype does this, and it breaks one id across the cycle | Deriving the id on each read, as in the prototype | PRJ-DR-001, BR-PRJ-01 |
| Figures are computed by the owner interfaces and cached in a rebuildable `project_summary` | A list of many projects cannot call three modules per row. The cache is not a source of truth | Reading live on each list; storing figures as registry data | BR-PRJ-02, PRJ-DR-002, XC-DAT-001 |
| The step is a pure function, `StepPolicy`, with no state machine | A step reflects other modules and can move back. No command moves it | A stored step with transitions, which can drift | BR-PRJ-03, PRJ-FR-013 |
| The 12 items are compared as a canonical, language-free value | The prototype compares display text, so a language switch looks like a change | Hashing the rendered fields | PRJ-DR-005, OI-PRJ-14 |
| Sends are triggered by events and run on the delivery path of the Integration chapter | The send must survive an outage, retry safely and need no person | A send button as the main path; a nightly batch | ADR-0008, PRJ-FR-035, XC-INT-004 |
| A PM message is a record with a task, and never calls a lower module | BR-PRJ-13 keeps every money change under its owner rules, and the dependency runs one way | Applying a cost message to the commitment directly | BR-PRJ-13, ADR-0002 |
| Consumers are records with a life cycle, and tenant settings hold only labels | A request, a decision and an end need history, which a settings file cannot hold | `consumers` as a setting, as in the prototype | PRJ-FR-053, PRJ-FR-055 |
| An external share uses `ApprovalRoutes`, with the tenant route defaulting to the executive | Who approves differs by agency, and Platform already holds routes and delegation | A role fixed in code | PLT-FR-062, BR-PRJ-14 |
| The send log is append-only at the database | A rule held only in the application can be bypassed | An ordinary table with no delete screen | BR-PRJ-15, PRJ-DR-003 |

## Components {#prj-components}

Projects is the Spring Modulith module `projects`. Only `api` and `api.events` are named interfaces. All other packages are internal (ADR-0002).

{{fig:prj-component | Components of the projects module and their neighbours}}

> [!NOTE] The package list, interface names and method names in this section are a proposal.

### Internal packages {#prj-packages}

| Package | Responsibility | Main classes |
| --- | --- | --- |
| `web` | REST controllers, Problem Details mapping, the page data of Project 360 | `ProjectController`, `PmController`, `ShareController` |
| `registry` | Projects, links, issuing ids | `Project`, `ProjectLink`, `ProjectNumbers` |
| `cycle` | The 8 steps, figures, timeline, reading the owner modules | `CycleCatalogue`, `StepPolicy`, `ProjectFigures`, `TimelineReader` |
| `exchange` | PM send state, payload, adapter port, received messages | `ExchangeRecord`, `OutboundPayload`, `ProjectSystemGateway`, `PmMessage` |
| `sharing` | Consumers, requests, send log, data sets | `DataConsumer`, `ShareRequest`, `SendLog`, `DataSetBuilder` |
| `tormap` | The optional module and duty map | `ModuleMap` |
| `settings` | Tenant settings and their ranges | `RegistrySettings`, `SettingRange` |
| `reporting` | The rebuildable list projection | `ProjectSummaryProjector` |

### Published interfaces {#prj-published}

| Interface | Used by | Purpose | Requirements |
| --- | --- | --- | --- |
| `ProjectLookup` | `review` | `byId`, `byLine`, `summaries(filter)`: id, links, step and figures, read only (the name Review asks for, REV-IR-004) | PRJ-IR-009, REV-IR-004 |
| Events in `api.events` | Any module, and RabbitMQ through the outbox | The event catalogue in the interface section | ADR-0008 |
| `InterfaceReporter` (SPI) | `platform` | `projects` implements the Platform SPI for the PM adapter | PRJ-IR-007, PLT-IR-006 |
| `RetentionHold` (SPI) | `platform` | `projects` implements it for its messages and send log | PRJ-DR-008 |

### Dependencies on other modules {#prj-dependencies}

| Module | Interface needed | Used for | Requirements |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `Delegations`, `AuditLog`, `Notifier`, `WorkItems`, `ApprovalRoutes` | Tenant, authority, audit, notices, tasks and share approval | PRJ-NFR-001, PRJ-FR-042, BR-PRJ-14 |
| `platform` | `FiscalCalendar`, `UnitDirectory`, `SubjectDirectory`, `RetentionRegistry` | Fiscal year, step owners, names, retention | PRJ-CR-004, BR-PRJ-16 |
| `budget` | `BudgetRequestQuery`, `AllocationQuery`, `BudgetReadModel` | Lines, transfers, allotment, requests, carry-over, GFMIS disbursement per line, and the request a line came from | PRJ-IR-001, PRJ-FR-026 |
| `procurement` | `ContractLookup`; a new query by line | Plan items, cases, e-GP stage, contracts, phases | PRJ-IR-002 |
| `finance` | `LinePaymentQuery` | Other commitments, paid amounts, time of the latest GFMIS data, reconciliation state | PRJ-IR-003 |

> [!OPEN] Budget answers the line query with `AllocationQuery` and `BudgetReadModel`, and Finance answers with `LinePaymentQuery`. The Procurement query by line is still a request, and the Procurement author must confirm or change it (DG-PRJ-01). This chapter confirms the row for `projects` in the dependency table of the Modules chapter: it depends on `platform`, `budget`, `procurement.api` and `finance.api`, and only `review` depends on it.

## Domain model {#prj-domain}

The domain classes are plain Java with no Spring or JPA imports. Figures are value objects built for a read, and they are never saved as registry data.

{{fig:prj-class | Projects aggregates and their parts}}

> [!NOTE] The aggregates, class names and error codes in this section are a proposal.

### Aggregates and invariants {#prj-aggregates}

| Aggregate | Parts | Invariants held |
| --- | --- | --- |
| `Project` | `ProjectLink` | One number per project, never reused; at least one link; a source record links to one project |
| `ExchangeRecord` | None | One per project in scope; at most one live delivery; `sent` only after the PM system accepted |
| `PmMessage` | None | One per `message_id`; acknowledged once; holds no effect on money |
| `DataConsumer` | `ShareRequest` | An external consumer is active only by an approved request; an ended consumer takes no send |
| `SendLog` | Rows | Rows are only added |
| `RegistrySettings`, `ModuleMap` | None | Values stay within `SettingRange`; `prefix` is locked at the first id |

### Value objects and enumerations {#prj-values}

| Type | Values | Notes |
| --- | --- | --- |
| `ProjectNumber` | Prefix, year, running number | Form of PRJ-FR-001; the year is the first fiscal year and stays (OI-PRJ-01) |
| `SourceType` | `request`, `line`, `carry` | Kinds of `ProjectLink` |
| `CycleStep` | 1 to 8 | Names and owners in `CycleCatalogue`; mods are left out (PRJ-CR-005) |
| `BudgetKind` | `single`, `multi`, `carry` | PRJ-FR-009 |
| `WorkType` | `construction`, `goods`, `service`, `consult`, `routine` | PRJ-FR-010 |
| `ExchangeState` | `new`, `queued`, `sent`, `changed`, `failed` | `failed` is added by this design |
| `Dimension` | `time`, `cost`, `quality`, `status` | PRJ-FR-041 |
| `ConsumerKind`, `ConsumerStatus` | `int`, `ext`; `pending`, `active`, `ended` | `ended` is added by this design |

The canonical payload holds codes and amounts, so the same data gives the same hash in any language.

```java
// Proposal. Codes and numbers only; display text is never hashed.
public record OutboundPayload(ProjectNumber id, String gfmisCode, LocalizedName name, Target target,
                              BigDecimal annualAmount, BudgetKind kind, int fiscalYear, UUID unitId,
                              WorkType workType, AreaCode area, AllotmentState allotment,
                              BigDecimal allotmentReceived) {
    public String canonicalHash() { return Sha256.of(CanonicalJson.write(this)); }
}
```

### Where each business rule is enforced {#prj-rule-map}

The server enforces every rule below. Screens may repeat a check to help the user, and they are never the control (ADR-0006).

| Rule | Subject | Enforced in | Error code |
| --- | --- | --- | --- |
| BR-PRJ-01 | One id, never the GFMIS code | `ProjectNumbers.next`, `Project.link` | `PRJ_LINK_CONFLICT` |
| BR-PRJ-02 | No second copy | `ProjectFigures`; a test that no command writes figures | None |
| BR-PRJ-03 | Current step | `StepPolicy.of` | None, computed |
| BR-PRJ-04 | Annual amount | `ProjectFigures.annual` | None, computed |
| BR-PRJ-05 | Committed | `ProjectFigures.committed`, from the line ledger | None, computed |
| BR-PRJ-06 | Paid | `ProjectFigures.paid` | None, computed |
| BR-PRJ-07 | Routine | `ProjectFigures.routine` | None, computed |
| BR-PRJ-08 | Exchange scope | `ExchangeScope.includes` | None, filters |
| BR-PRJ-09 | Data ownership | `exchange` has no progress command (PRJ-CR-003) | None |
| BR-PRJ-10 | Change detection | `ExchangeRecord.markChanged` | None |
| BR-PRJ-11 | Outage | The delivery path of the Integration chapter | None, state shown |
| BR-PRJ-12 | Not current | `StaleCheck`, a daily job | None, adds an exception |
| BR-PRJ-13 | Message effect | `PmMessage.acknowledge` | `PRJ_STATE_CONFLICT` |
| BR-PRJ-14 | External approval | `DataConsumer.approve` | `PRJ_REASON_REQUIRED`, `PRJ_SOD_BLOCKED` |
| BR-PRJ-15 | Send log | `SendLog.add`; database grants and a trigger | `PRJ_LOG_IMMUTABLE` |
| BR-PRJ-16 | Step owners | `CycleCatalogue.owner` with `UnitDirectory` | None |
| BR-PRJ-17 | GFMIS time | `ProjectFigures.gfmisAsOf`, copied to each log row | None |
| BR-PRJ-18 | Tenant values | `RegistrySettings`; an ArchUnit rule against tenant branches | `PRJ_SETTING_OUT_OF_RANGE` |

### Limits in code and tenant settings {#prj-limits}

No legal limit applies to this module, so `LegalRuleSet` has no entry here (OI-PRJ-06). The SRS settings table lists every tenant value. The prototype settings carry over as follows.

| Setting | Range in code | Default | Becomes |
| --- | --- | --- | --- |
| `prefix` | 2 to 6 capitals or digits (proposal) | `PRJ` | `registry_setting` |
| `staleDays` | 1 or more (proposal) | 14 | `registry_setting` |
| `pmName`, `pmShort`, `pmRef`, `hubName`, `aiName`, `pmNote` | Text in both languages | Generic names | `registry_setting` |
| `pmScope` | Rule: investment lines, or a named list | Investment lines | `registry_setting` and `project.exchange_scope` |
| `multi` | None | None | Read from `budget` |
| `loc` | None | None | `project.area`, `project.target` |
| `consumers` | None | None | `data_consumer` |
| `modules`, `duties` | None | None | `tor_module`, `tor_duty` |
| `userUnits`, `feed` | None | None | Not carried over |

## States and transitions {#prj-states}

The cycle step has no state machine. The two life cycles below are plain enums with transition tables, in the style of ADR-0007. A PM message has only received and acknowledged.

### Send state {#prj-state-exchange}

{{fig:prj-state-exchange | Send state of a project towards the PM system}}

| From | To | Trigger | Guard | Delivery state |
| --- | --- | --- | --- | --- |
| (none) | new | Project enters the scope | BR-PRJ-08 | None |
| new, changed | queued | Allotment approved, an item changed, or an officer sends | No live delivery for the project | `pending`, `sending`, `retrying` |
| queued | sent | The PM system accepts | Hash of the delivery equals the current hash | `delivered` |
| queued | changed | The PM system accepts an older payload | Hash differs | `delivered` |
| sent | changed | An item changed | BR-PRJ-10 | None |
| queued | failed | Rejected, or attempts used up | Rules of the Integration chapter | `failed` |
| failed | queued | An officer resends | `prj.exchange.run` | Same delivery, same key |

> [!NOTE] A failed delivery raises a task for an officer and an exception. An outage does not use up attempts, so a project in an outage stays queued, which is the buffer of PRJ-FR-038.

### Data consumer {#prj-state-consumer}

{{fig:prj-state-consumer | States of a data consumer}}

| From | To | Command | Guard | Effect |
| --- | --- | --- | --- | --- |
| (none) | pending | `DataConsumer.request` | External; a reason | `ApprovalRoutes.start` |
| (none) | active | `DataConsumer.register` | Internal | None |
| pending | active | `DataConsumer.approve` | Approver is not the asker; a reason of at least 10 characters | Log row; first send queued |
| pending | ended | `DataConsumer.refuse` | A reason | Request closed |
| active | ended | `DataConsumer.end` | `prj.share.approve`; a reason | No further send |

## Dynamic behaviour {#prj-dynamic}

### Deriving the current step {#prj-activity}

`StepPolicy` takes the source of a project and the facts read from the owner modules, and returns a step. It holds BR-PRJ-03 in one place, with the accepted test of PRJ-FR-014 and the signed test of PRJ-FR-019.

{{fig:prj-activity-step | Deriving the current step of a project}}

### How a project comes to exist {#prj-linking}

The registry listens to events from the owners. It has no command for creating a project by hand.

- A new budget request creates a project and a `request` link (subject to OI-PRJ-01).
- A confirmed line that names its request adds a `line` link to that project. A line with no request creates a new project.
- A carry-over that names its line adds a `carry` link to the same project.
- Each event then refreshes `project_summary` and may queue an exchange.

> [!NOTE] The Budget tables hold `allocation_line.request_id` and `carry_over.line_id`, which this link needs. The prototype has neither. With no reference a project starts afresh, and a person needs a way to link it (DG-PRJ-02).

### Sending on a change {#prj-seq-exchange}

{{fig:prj-seq-exchange | Sending project data to the PM system on a change}}

- A consumer of `budget` and `procurement` events rebuilds the payload. If the hash is unchanged it stops, so a transfer that leaves the 12 items alone sends nothing.
- Only one delivery runs per project, and it reads the latest payload when it starts. Rapid changes collapse into one send.
- Backoff, circuit breaker and timeouts follow the Integration chapter. Oldest deliveries go first (PRJ-FR-039).
- An officer may still press send for a project that is new, changed or failed. That runs the same path (PRJ-FR-036).

### Receiving from the PM system {#prj-seq-inbound}

{{fig:prj-seq-inbound | Receiving data from the PM system}}

- A repeat of a `message_id` returns 202 and changes nothing (PRJ-IR-006).
- Acknowledging closes the task. It calls no lower module (BR-PRJ-13). The message page links to the contract change in Procurement or to carry-over in Budget, so the person acts there.
- Progress shown on Project 360 comes from the stored messages (PRJ-FR-047).

### Approving an external share {#prj-seq-share}

{{fig:prj-seq-share | Approving and sending data to an external consumer}}

Each later send adds a log row with the time of the latest GFMIS data. Whether it needs a new approval is OI-PRJ-05. For now the approval covers later sends of the same data set, as the code does.

### Scheduled work {#prj-jobs}

| Job | Does | Requirements |
| --- | --- | --- |
| Stale check | Daily, marks projects with no PM update for `staleDays` and adds an exception | BR-PRJ-12, PRJ-FR-057 |
| Summary rebuild | Nightly, compares `project_summary` with the owners and repairs differences | PRJ-DR-002, PRJ-NFR-002 |
| Scheduled shares | Sends the data set of an active consumer on its schedule, as the system | PRJ-IR-008 |
| Retention | Applies the schedule of ADR-0014 | PRJ-DR-008 |

## Data design {#prj-data}

Tables live in the schema `projects` of the cell PostgreSQL cluster (ADR-0005). Other modules never read them; they use `projects.api`. The rules for every table in the Procurement chapter apply: `tenant_id` first in each key, forced row-level security, common columns and expand-and-contract migrations.

> [!NOTE] Every table, column and index in this section is a proposal. `source_id` in `project_link` is a logical reference, with no foreign key across schemas.

{{fig:prj-er | Core projects tables}}

### Tables {#prj-data-tables}

Class is the ADR-0013 class of the row. Retention key is the entry in the schedule of ADR-0014. No period is stated, because OI-PRJ-08 is open.

| Table | Key columns | Class | Retention key | Requirements |
| --- | --- | --- | --- | --- |
| `project` | `project_no`, `first_fy`, `name`, `unit_id`, `area`, `target`, `exchange_scope`, `ended_at` | Internal | `prj.project` | PRJ-DR-001, PRJ-FR-001 to PRJ-FR-003 |
| `project_link` | `project_id`, `source_type`, `source_id`, `fiscal_year`, `linked_at` | Internal | `prj.project` | PRJ-DR-001 |
| `project_number` | `fiscal_year`, `last_no` | Internal | `prj.config` | PRJ-FR-003 |
| `project_summary` | `project_id`, `step`, `amount`, `base_amount`, `committed`, `paid`, `routine`, `gfmis_as_of`, `refreshed_at` | Internal | Rebuildable | PRJ-DR-002, PRJ-FR-005 |
| `exchange_record` | `project_id`, `state`, `last_hash`, `last_sent_at`, `delivery_id` | Internal | `prj.exchange` | PRJ-FR-032, PRJ-DR-005 |
| `delivery` | As in the Integration chapter | Internal | `prj.exchange` | PRJ-IR-005 |
| `pm_message` | `message_id`, `project_id`, `dimension`, `text`, `days`, `amount`, `effect`, `received_at`, `acknowledged_at`, `acknowledged_by_ref` | Confidential | `prj.exchange` | PRJ-DR-006, PRJ-FR-041 to PRJ-FR-046 |
| `data_consumer` | `kind`, `name`, `data_sets`, `channel`, `status`, `schedule` | Internal | `prj.share` | PRJ-FR-048 |
| `share_request` | `consumer_id`, `asked_by_ref`, `why`, `decided_by_ref`, `reason`, `status` | Confidential | `prj.share` | PRJ-FR-051 to PRJ-FR-054 |
| `send_log` | `consumer_id`, `sent_at`, `rows`, `gfmis_as_of`, `sent_by_ref`, `approved_by_ref`, `reason`, `file_key` | Confidential | `prj.share` | PRJ-DR-003, PRJ-DR-004 |
| `registry_setting` | `key`, `value`, `effective_from` | Internal | `prj.config` | PRJ-FR-063, PRJ-FR-064 |
| `tor_module`, `tor_duty` | `no`, `name`, `status`, `ref`, `page`; `group`, `name`, `modules`, `external_flag` | Internal | `prj.config` | PRJ-FR-060, PRJ-FR-061 |
| `outbox_event`, `inbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | Short, set with the platform | ADR-0008, XC-API-005 |

```sql
-- Proposal: the send log takes rows and gives them up to no one.
REVOKE UPDATE, DELETE, TRUNCATE ON projects.send_log FROM app_role;
CREATE TRIGGER send_log_append_only BEFORE UPDATE OR DELETE ON projects.send_log
  FOR EACH ROW EXECUTE FUNCTION projects.refuse_change();
```

### Personal and restricted fields {#prj-data-fields}

The registry holds no Restricted data. This table feeds the data dictionary (ADR-0014). The data protection officer must confirm the legal basis of each field.

| Field | Class | Protection | Rule |
| --- | --- | --- | --- |
| `*_ref` columns | Confidential | Pseudonymous reference | Reports show a placeholder after erasure (ADR-0015) |
| `share_request.why`, `send_log.reason`, `pm_message.text` | Confidential | Role-based access; left out of search | Free text may name a person |
| Supplier name on Project 360 | Confidential | Read through `ContractLookup`, never stored here | DG-PRJ-03 |
| Files in `send_log.file_key` | As the data set | S3 storage under tenant keys (ADR-0010) | PRJ-DR-007 |

## Interface design {#prj-interfaces}

The REST API is described in OpenAPI 3.1, and the events in AsyncAPI. The tenant comes from the token and never from the path. State-changing calls carry `If-Match` with the aggregate version.

### REST endpoints {#prj-rest}

> [!NOTE] This endpoint list is a proposal. Paths are relative to `/api/v1/projects`.

| Method and path | Purpose | Authority | Requirements |
| --- | --- | --- | --- |
| `GET /cycle` | Steps with counts, amounts and owners | `prj.read` | PRJ-FR-012 to PRJ-FR-017 |
| `GET /register` | List, with fiscal year filter and search | `prj.read` | PRJ-FR-005 to PRJ-FR-007 |
| `GET /register/{id}` | Project 360: figures, timeline, exchange | `prj.read` | PRJ-FR-023 to PRJ-FR-029 |
| `GET /pm/exchange`; `POST /pm/exchange/send` | Send states; send waiting items | `prj.read`, `prj.exchange.run` | PRJ-FR-032, PRJ-FR-036, PRJ-FR-037 |
| `POST /pm/messages` | Inbound messages | Client credentials of the tenant PM system | PRJ-FR-041, PRJ-IR-006 |
| `GET /pm/messages`; `POST /pm/messages/{id}/acknowledge` | List and acknowledge | `prj.read`, `prj.exchange.ack` | PRJ-FR-043, PRJ-FR-044 |
| `GET, POST /consumers`; `POST /consumers/{id}/requests, send, end` | Consumers, requests, sends, ending | `prj.share.send`, `prj.share.approve` | PRJ-FR-048 to PRJ-FR-050, PRJ-FR-053, PRJ-FR-055 |
| `POST /share-requests/{id}/approve, refuse` | Decide a share | `prj.share.approve` | PRJ-FR-051, PRJ-FR-052, PRJ-FR-054 |
| `GET /send-log` | Read the log; no write path exists | `prj.read` | PRJ-DR-003 |
| `GET /module-map` | Module and duty map, when the tenant has one | `prj.read` | PRJ-FR-060 to PRJ-FR-062 |
| `GET, PUT /settings` | Registry settings | `prj.admin` | PRJ-FR-063, PRJ-FR-064 |

### Error catalogue {#prj-errors}

| Code | HTTP | Meaning | Requirements |
| --- | --- | --- | --- |
| `PRJ_REASON_REQUIRED` | 400 | A reason is missing or too short | PRJ-FR-051, PRJ-FR-052 |
| `PRJ_FORBIDDEN` | 403 | The user lacks the authority | ADR-0006 |
| `PRJ_SOD_BLOCKED` | 403 | The approver is the asker | PRJ-FR-054 |
| `PRJ_NOT_FOUND` | 404 | The record does not exist or belongs to another tenant or unit | ADR-0005, PRJ-FR-011 |
| `PRJ_VERSION_CONFLICT` | 409 | The record changed since it was read | ADR-0005 |
| `PRJ_STATE_CONFLICT` | 409 | The action does not apply to the current state | PRJ-FR-050 |
| `PRJ_LINK_CONFLICT` | 409 | The source record already links to another project | BR-PRJ-01 |
| `PRJ_LOG_IMMUTABLE` | 409 | A change to the send log was refused | PRJ-DR-003 |
| `PRJ_UNKNOWN_PROJECT` | 422 | A PM message names an unknown id | PRJ-IR-006 |
| `PRJ_SETTING_OUT_OF_RANGE` | 422 | A setting is outside its range | PRJ-FR-064 |

### Event catalogue {#prj-events}

> [!NOTE] This event list is a proposal. Routing keys start with `projects.`. Payloads hold references and amounts, never personal data, and consumers drop duplicates by `eventId` (ADR-0008).

| Event | Raised by | Extra fields | Consumers |
| --- | --- | --- | --- |
| `project.registered`, `project.linked` | `Project` | `projectNo`, `sourceType` | `reporting`, `review` |
| `project.step-changed` | `ProjectSummaryProjector` | `fromStep`, `toStep` | `review` |
| `exchange.queued`, `exchange.sent`, `exchange.failed` | `ExchangeRecord` | `deliveryId`, `hash` | Adapter, notifications |
| `pm-message.received`, `pm-message.acknowledged` | `PmMessage` | `dimension` | Notifications |
| `share.requested`, `share.approved`, `share.sent`, `share.ended` | `DataConsumer`, `SendLog` | `consumerId`, `rows`, `gfmisAsOf` | Adapter, notifications to the auditor |

Projects consumes the Procurement events `contract.signed`, `contract.changed`, `contract.terminated`, `phase.accepted`, `phase.paid`, `case.failed`, `case.cancelled` and `case.closed`. It also needs events from `budget` for a request, a line, a transfer, an allotment and a carry-over, and from `finance` for a payment and a GFMIS import. The chapters of those modules name them (DG-PRJ-01).

### External adapters {#prj-adapters}

| Adapter | Port | First implementation | Behaviour | Requirements |
| --- | --- | --- | --- | --- |
| PM system out | `ProjectSystemGateway` | The Fisko standard over REST, for each tenant that has a PM system | Sends the 12 items with `delivery_id` as the idempotency key | PRJ-IR-004, PRJ-IR-005 |
| PM system in | `POST /pm/messages` | Fisko endpoint, called by the PM system | Checks client, project id and `message_id` | PRJ-IR-006 |
| Data consumers | `ShareChannel` | File to S3 with a signed link; API read; portal view by unit | Builds the data set from `DataSetBuilder` and logs the send | PRJ-IR-008, PRJ-DR-004 |

> [!OPEN] No PM contract exists (OI-PRJ-03), and a tenant PM system may not accept a Fisko standard. If it does not, that tenant needs its own adapter behind `ProjectSystemGateway`, which is a cost for the product owner to weigh. The Integration chapter catalogue lists this port as a proposal, and OI-PRJ-10 holds its interface id.

## Security design {#prj-security}

Keycloak signs users in (ADR-0006), and the server checks roles on every action. Each request binds the tenant, so row-level security applies. The PM system signs in with OIDC client credentials per adapter, as the cross-cutting design proposes, and its client can reach only the inbound path.

### Authorities {#prj-authorities}

> [!NOTE] The authority names are a proposal. Roles map to authorities as tenant data, and these defaults follow the SRS.

| Authority | Default roles | Allows |
| --- | --- | --- |
| `prj.read` | All staff roles, scoped to their unit for `div` and `divhead` | Read the cycle, register, Project 360, messages and log |
| `prj.exchange.run` | `plan`, `fin`, `admin` | Send, resend |
| `prj.exchange.ack` | `fin`, `finhead`, `proc`, `prochead` | Acknowledge a PM message |
| `prj.share.send` | `plan`, `fin`, `admin` | Ask to share; send to an active consumer |
| `prj.share.approve` | `exec` | Decide a request, end a consumer |
| `prj.admin` | `admin` | Registry settings, consumer register, module map |

### Duty checks {#prj-sod}

The Platform register holds no duty rule for this module. `DataConsumer.approve` runs a second-person check, as the Procurement chapter does for its documents: the approver and anyone they act for must differ from the asker (PRJ-FR-054). A refusal is logged through `SodGuard`. Whether this becomes a numbered rule is DG-PRJ-04.

### Audit and outbound data {#prj-audit}

- Every command writes through `AuditLog` (PRJ-NFR-001). Entries hold references and never free text (ADR-0015). Reasons stay in the business row.
- `DataSetBuilder` has a closed list of data sets. Each lists its fields, and a test refuses a personal field unless the set is approved (PRJ-DR-007).
- Egress goes only to the listed destination of each adapter (Integration chapter).
- Simulation controls do not exist in production (PRJ-NFR-004).

## Non-functional design {#prj-nfr}

| Requirement | Design answer | Verified by |
| --- | --- | --- |
| PRJ-NFR-001 | `CommandAudit` aspect on every command | Integration test per command |
| PRJ-NFR-002 | Events refresh `project_summary`, and a nightly rebuild repairs drift | Timed scenario test |
| PRJ-NFR-003 | Message files for screens; `LocalizedName` in the payload | Playwright in both languages; a payload test |
| PRJ-NFR-004 | Test adapter ships only in test profiles | Build check |
| PRJ-NFR-005 | `exchange` and `sharing` do nothing with no PM adapter or consumer, and the menu leaves them out | `NoPmSystemIT` |

### Load and availability {#prj-nfr-load}

- Lists read `project_summary` with paging (XC-API-009). Project 360 calls the owner interfaces for one project.
- If a lower module is slow, lists still answer from the summary, which shows its `refreshed_at`.
- A burst of events at the 30 September peak only delays the summary and the exchange. Neither blocks a budget, procurement or finance command, because nothing waits on `projects`.

> [!OPEN] XC-PER-001 to XC-PER-008 are proposals, and they give no volume per tenant or number of projects for this module. The product owner must confirm them (OI-XC-01) and state those figures before load tests can pass or fail (DG-PRJ-05).

## Test design {#prj-tests}

The sweep cannot test a server, and its round 64 walks become production tests. The levels of the Procurement chapter apply. The test class names are a proposal.

### From sweep checks to production tests {#prj-test-walks}

| Sweep check | Production test | Added beyond the check | Requirements |
| --- | --- | --- | --- |
| Project pages | `project-360.spec` | Every step shown, with an end-to-end link across modules | PRJ-FR-023 to PRJ-FR-029 |
| Approved transfer | `TransferToExchangeScenario` | An unchanged hash sends nothing; a pending transfer changes no amount | PRJ-FR-018, PRJ-FR-033, PRJ-FR-034 |
| Outage and back online | `PmOutageIT` | Automatic flush, oldest first, no duplicate, a final failure raises a task | PRJ-FR-035 to PRJ-FR-039, XC-INT-004 |
| PM feed | `PmMessageIT` | Unknown id, repeat, wrong client, role limit, no change to money | PRJ-FR-041 to PRJ-FR-045, PRJ-IR-006 |
| External approval | `ShareApprovalIT` | Short reason, asker refused, ended consumer refused | PRJ-FR-050 to PRJ-FR-055 |
| Page-open sweep | `role-matrix.spec` | Unit scope for `div` and `divhead` | PRJ-FR-011 |

### Tests with no sweep ancestor {#prj-test-new}

| Test | Asserts | Requirements |
| --- | --- | --- |
| `StepPolicyTest` | Every branch of the step, with a draft contract and a delivered phase counting for nothing | BR-PRJ-03, PRJ-FR-014, PRJ-FR-019 |
| `ProjectLifeIT` | A request becomes a line and then a carry-over under one id, and an id is never reused | PRJ-FR-002, PRJ-FR-003, PRJ-DR-001 |
| `FiguresMatchOwnersIT` | Each figure equals the line ledger and Finance | BR-PRJ-05, BR-PRJ-06, PRJ-DR-002 |
| `PayloadHashTest` | The same data gives one hash in either language | PRJ-DR-005 |
| `SendLogImmutableIT` | The application role cannot update or delete a row | PRJ-DR-003 |
| `DataSetFieldsTest` | No personal field in a data set that is not approved | PRJ-DR-007 |
| `TenantIsolationIT` | Generated from the schema for each table | ADR-0005 |
| `NoTenantBranchTest` | No tenant name or year in generic code | PRJ-CR-002, PRJ-CR-004, PRJ-CR-005 |

## Migration from the prototype {#prj-migration}

No code moves across. What carries over is the knowledge in `95-projects.js`, and there is no production data to migrate. When a tenant starts, an opening job issues ids for its open requests, lines and carry-overs.

| Carries over | How | Source in the prototype |
| --- | --- | --- |
| The 8 steps and step logic | `CycleCatalogue`, `StepPolicy` | `PRJ_CYCLE`, `prjList` |
| The 12 items and 4 dimensions | `OutboundPayload`, `Dimension` | `prjOutFields`, `PRJ_DIM` |
| Settings | `registry_setting` and fields on records | `PRJ_DEF` |
| Sweep checks | Rewritten as tests | `tests/sweep.js` |
| Thai and English labels | Moved to message files | `L()` |

| Does not carry over | Why | Replaced by |
| --- | --- | --- |
| Ids built from record ids | They break PRJ-FR-002 and OI-PRJ-12 | `project`, `project_link` |
| Hash of display text | OI-PRJ-14 | `OutboundPayload.canonicalHash` |
| Figures that differ from the owners | OI-PRJ-13, OI-PRJ-15 | Owner interfaces |
| Outage switch and scripted feed | PRJ-NFR-004 | Adapters and stubs in test profiles |
| Fixed years, dates and opening log | OI-PRJ-17 | `FiscalCalendar` |
| Physical progress computed from phases | PRJ-FR-047 | `pm_message` |
| Consumers as settings | PRJ-FR-053 | `data_consumer` |

## Known gaps and open issues {#prj-open}

### Issues carried from the SRS {#prj-open-srs}

| Issue | Effect on this design | Designed for now | Decides |
| --- | --- | --- | --- |
| OI-PRJ-01 | When an id is issued | At the first event of a request; a draft that is deleted ends the project and keeps its number | Product owner |
| OI-PRJ-02 | Project and line cardinality | `project_link` allows many rows, and one line per fiscal year is the default | Product owner, Planning |
| OI-PRJ-03 | The PM contract | `ProjectSystemGateway` and a Fisko standard | Each tenant, product owner |
| OI-PRJ-04 | Master of contracts and acceptance | Procurement is the master, and a PM message only informs | Product owner, procurement specialist |
| OI-PRJ-05 | Scope of an approval | Per consumer and data set | Executive sponsor, legal unit |
| OI-PRJ-06 | Law on sharing | No clause; `DataSetBuilder` stays a closed list | Legal unit, data protection officer |
| OI-PRJ-07 | Proposed values | Held in `SettingRange` | Product owner |
| OI-PRJ-08 | Retention | Keys with no period | Legal unit, product owner |
| OI-PRJ-09 | GFMIS code | Read from `finance` or `budget`, never built here | Comptroller General's Department |
| OI-PRJ-10 | Interface id | `InterfaceReporter` uses the adapter name, with no number | Product owner |
| OI-PRJ-11 | The module map | Optional tables with one read endpoint | Product owner |
| OI-PRJ-12 to OI-PRJ-18 | Prototype defects | Closed by design, as the migration table shows | Development team |

### New issues from this design {#prj-open-new}

The DG-PRJ numbers below belong to this chapter and are not SRS ids.

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-PRJ-01 | Will `budget`, `procurement` and `finance` offer the new queries, events and references this chapter asks for? | As listed in Components and Dynamic behaviour | Authors of those chapters, technical lead |
| DG-PRJ-02 | Who links a project by hand when a reference is missing, such as lines loaded at tenant start? | No such command yet; a new project starts | Product owner, Planning |
| DG-PRJ-03 | `ContractLookup` holds no personal fields, yet Project 360 shows the supplier name, which may be a natural person. May it show? | Show the supplier only when the API gives it | Data protection officer |
| DG-PRJ-04 | Should the share approval check become a numbered duty rule in the Platform register? | A second-person check with no number | Platform owner |
| DG-PRJ-05 | XC-PER-001 to XC-PER-008 are proposed targets for every module. What volume per tenant and number of projects apply here? | Load tests use the XC-PER rows, with no volume of their own | Product owner |
| DG-PRJ-06 | Does the registry keep a read of projects for a closed fiscal year, or does a closed project leave the lists? | Kept, with a fiscal year filter | Product owner |

### Known gaps in this version {#prj-open-depth}

- Data sets and their fields are not defined. They wait for OI-PRJ-05 and OI-PRJ-06, and for each tenant consumer list.
- The PM message schema names only the fields the prototype uses.
- Column types and indexes wait for the data dictionary chapter.
