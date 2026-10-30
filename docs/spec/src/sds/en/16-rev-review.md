# Module design: Review and analytics {#rev}

> [!NOTE] Fisko has no production code. The prototype is browser JavaScript and shows behaviour only, and every AI behaviour in it is simulated. Everything in this chapter is a proposal to build: the packages, classes, tables, endpoints, events and test names below do not exist yet. The technology comes from the accepted ADRs in `docs/adr/`, which this chapter applies and does not reopen.

## Purpose, scope and traceability {#rev-purpose}

<!-- covers: PDPA 39 -->

This chapter designs the production Review and analytics module. It answers the Review and analytics chapter of the SRS. The module sits on top of the others: it reads what they publish, shows it, and keeps only its own records. It also sets the shape of the agent framework that every module uses.

Outside this chapter: the model gateway and co-work chat belong to `platform`, and each module owns its KPIs, forecasts, signals, agents and tools. This chapter states only what Review needs from them.

| SRS group | Requirements | Design section | Main package |
| --- | --- | --- | --- |
| Business rules | BR-REV-01 to BR-REV-12 | Domain model | all |
| Home cards | REV-FR-001 to REV-FR-003 | Components, Interface design | `home` |
| Executive dashboard | REV-FR-004 to REV-FR-009 | Data design, Security design | `executive` |
| Project scorecard | REV-FR-010 to REV-FR-013 | Domain model | `scorecard` |
| Cross-module insight | REV-FR-014 to REV-FR-020 | Design overview, Components | `insight` |
| Spending anomalies | REV-FR-021 to REV-FR-027 | States and transitions, Dynamic behaviour | `anomaly` |
| Shared assistant | REV-FR-028 to REV-FR-034 | Dynamic behaviour, Security design | `assistant` |
| Agent framework | REV-FR-035 to REV-FR-047 | Design overview, States and transitions, Dynamic behaviour | `platform.ai`, `governance` |
| AI governance | REV-FR-048 to REV-FR-052 | Interface design, Security design | `governance` |
| Cross-module agendas | REV-FR-053 to REV-FR-055 | States and transitions, Data design | `agenda` |
| Data requirements | REV-DR-001 to REV-DR-006 | Data design | all |
| State rules | State tables of the SRS | States and transitions | `anomaly`, `agenda`, `platform.ai` |
| Interface requirements | REV-IR-001 to REV-IR-006 | Components, Interface design | `reporting` |
| Non-functional requirements | REV-NFR-001 to REV-NFR-009 | Non-functional design, Test design | all |
| Constraints | REV-CR-001 to REV-CR-004 | Design overview | all |
| Open issues | OI-REV-01 to OI-REV-12 | Known gaps and open issues | all |

## Design overview and decisions {#rev-decisions}

Review is one module of the modular monolith (ADR-0002). It is the top of the dependency order, so no module calls it. A dashboard read runs against projections in its own schema. A write touches only its own records: an anomaly, an agenda or a setting.

| Decision | Reason | Rejected alternative | Source |
| --- | --- | --- | --- |
| The agent runtime lives in `platform.ai`, and `review` governs it | Budget, Procurement and Finance all run agents, and nothing may depend on `review`. The runtime must sit below them. Run writes also break the rule that Review writes to no other module | A runtime in `review` behind an SPI, which makes a write path run through a read module; three engines as in the prototype | REV-FR-036, REV-CR-001, REV-CR-002 |
| Each module registers its agents and tools with the runtime, and a write tool only prepares a call to that module's normal command | The module keeps its rules, and an approved step passes the same checks as a person's click (REV-FR-044). The prototype writes directly | Tools that write tables directly | PLT-FR-135, REV-FR-044 |
| The tool runs with the token of the person acting, and never a system account | Rights and duty rules apply as for a click (BR-REV-11) | A service account for agents, which reads beyond the user | Solution Design 9.4 |
| No third-party agent framework; run and step states are plain Java enums | The states are small, must be tested pair by pair, and must not move with a library | LangChain4j or a similar library as the run loop | ADR-0007 |
| A KPI is computed by its owning module and read through a `KpiSource` in that module's `api` | One definition per KPI (BR-REV-01), and Review holds no module's formula | A shared data mart with central KPI definitions, as the Solution Design draws it | REV-FR-014, ADR-0002 |
| Views are projections in the `review` schema, fed by events and rebuildable | Heavy reads stay off command tables and every view can be rebuilt (REV-DR-003) | Live cross-module queries at each page open | XC-DAT-001, ADR-0008 |
| Anomaly detection is rule code with no model | Every feature must work with AI off, and a rule can be explained to an auditor. A model may later only draft a plain-language summary | A model that decides what is anomalous | ADR-0016, REV-FR-022 |
| Figures reach a model only as tool results, and the model only words them | A model must not compute a total (REV-FR-030) | Passing raw tables and asking for a sum | Solution Design 9.4 |
| Bands, weights and limits are `review_setting` rows checked against a range in code | ADR-0007 divides limits from tenant values, and the prototype fixes them in screens | Numbers in React components | REV-CR-003 |
| `review` publishes no interface | Nothing depends on it, as the module overview expects. Screens compose its results in the browser, so the Today page needs no server call from `platform` to `review` | A `HomeCards` interface that `platform` calls, which makes a cycle | REV-CR-001 |

> [!OPEN] This chapter asks Platform to host `AgentRuntime` and `agent_run`, and asks Procurement to keep only its tools. The Platform chapter now records this as a proposal in [its shared agent runtime section](#plt-agent-runtime), and the Procurement chapter keeps only `ToolRegister` and its tools. The technical lead must agree this with those chapters' owners (DG-REV-01).

## Components {#rev-components}

Review is the Spring Modulith module `review`. It has no `api` package, because it publishes nothing. All packages are internal, and the boundary tests run in CI (ADR-0002).

{{fig:rev-component | Components of the review module and their neighbours}}

> [!NOTE] The package list, interface names and method names in this section are a proposal.

### Internal packages {#rev-packages}

| Package | Responsibility | Main classes |
| --- | --- | --- |
| `web` | REST controllers, Problem Details mapping | `HomeController`, `ExecutiveController`, `AnomalyController`, `GovernanceController` |
| `home` | Home card figures for one user | `HomeCardService` |
| `executive` | Dashboard, unit table, drill-down, bands | `ExecutiveView`, `DrillDownQuery`, `BandPolicy` |
| `scorecard` | Project score and grade | `ScorePolicy`, `ProjectScore` |
| `insight` | Cross-module KPI page, forecast comparison, signal queue | `KpiPage`, `ForecastComparison`, `SignalQueue` |
| `anomaly` | Detectors, the anomaly record and its triage | `Anomaly`, `AnomalyDetector`, `AnomalyTriage` |
| `assistant` | Read-only cross-module tools and the general assistant's answers | `GeneralAssistantTools`, `AnswerComposer`, `RetrievalTool` |
| `governance` | Agent list, switches, levels, AI activity views, quality runs | `AgentGovernance`, `AiActivityView`, `EvalRunner` |
| `agenda` | Cross-module agendas, items and decisions | `Agenda`, `AgendaItem`, `AgendaDecision` |
| `settings` | Bands, weights, limits and their ranges | `ReviewSettings`, `SettingRange` |
| `reporting` | Event consumers and projections | `SpendingProjector`, `ProjectionRebuilder` |

### Published interfaces {#rev-published}

`review` publishes no interface and no module depends on it, which confirms the row in the module overview. It publishes events for notifications and the audit view only.

### Dependencies on other modules {#rev-dependencies}

| Module | Interface needed | Used for | Requirements |
| --- | --- | --- | --- |
| `platform` | `TenantContext`, `Authorizer`, `AuditLog`, `Notifier`, `WorkItems`, `DocumentService` | Tenant binding, rights, audit, notices, tasks, agenda documents | REV-NFR-008, REV-IR-006, REV-FR-055 |
| `platform` | `AiGateway`, `AssistantRouter` | Every model call | REV-IR-005, XC-AI-001 |
| `platform` | `AgentRuntime`, `AgentCatalogue` (requested, DG-REV-01) | Run and step records, switches and levels | REV-FR-035 to REV-FR-047 |
| `budget` | `AllocationQuery`, `BudgetReadModel` (published); `LineFacts`, `KpiSource`, `ForecastSource`, `SignalSource` (requested, DG-REV-02) | Lines and spending by line through the published interfaces. `LineFacts` stays a request because they do not cover monthly plans, reservations, commitments and outputs | REV-IR-001 |
| `procurement` | `ContractLookup` (published), `KpiSource`, `ForecastSource`, `SignalSource` (requested, DG-REV-02) | Contracts, phases, open cases | REV-IR-003 |
| `finance` | `PaidFacts`, `KpiSource`, `ForecastSource`, `SignalSource` (published) | Payments per line and contract, KPI values, forecasts, signals | REV-IR-002 |
| `projects` | `ProjectLookup` (published in the Projects chapter) | Project id and links | REV-IR-004 |

Finance publishes the interfaces listed for it. The requested interfaces above are what Review still asks of Budget and Procurement, and their authors must confirm or change them (DG-REV-02).

## Domain model {#rev-domain}

The domain classes are plain Java with no Spring or JPA imports. `AgentRun` is shown here because this chapter sets its shape, and its code lives in `platform.ai`.

{{fig:rev-class | Review aggregates and the agent runtime}}

> [!NOTE] The aggregates, class names and error codes in this section are a proposal.

### Aggregates and invariants {#rev-aggregates}

| Aggregate | Parts | Invariants held |
| --- | --- | --- |
| `Anomaly` | Evidence rows, events | Only the auditor decides; a decision needs a note; a reopen needs a reason and keeps the earlier result; the same finding is never raised twice |
| `Agenda` | Items, decisions | An item holds a reference and no copy; a closed agenda does not change |
| `ReviewSettings` | None | Values stay within `SettingRange`; each change has an effective date |
| `AgentRun` (in `platform.ai`) | Steps | One step is decided at a time; a decided step never changes; a final run takes no decision |
| `AgentProfile` (in `platform.ai`) | None | Off unless the tenant opted in; a level never exceeds what the agent's tools allow |

### Value objects and enumerations {#rev-values}

| Type | Values | Notes |
| --- | --- | --- |
| `AnomalyKind` | `split`, `spike`, `early`, `vendor` | REV-FR-021 |
| `AnomalyStatus` | `new`, `explained`, `escalated` | Values of the code |
| `Band` | `onTrack`, `watch`, `highRisk` | BR-REV-05 |
| `Grade` | `A`, `B`, `C`, `D`, `notGraded` | `notGraded` is new, REV-FR-012 |
| `AgentLevel` | `L0`, `L1`, `L2`, `L3` | BR-REV-08 |
| `ToolKind` | `read`, `draft`, `propose`, `write`, `notify` | REV-FR-038 |
| `RunStatus` | `running`, `waiting`, `done`, `stopped` | One end state for a run ended early, with a reason; see DG-REV-03 |
| `StepStatus` | `pending`, `done`, `suggested`, `await`, `approved`, `edited`, `rejected`, `skipped`, `blocked`, `stopped` | Values of the code |

### Where each business rule is enforced {#rev-rule-map}

| Rule | Subject | Enforced in | Error code |
| --- | --- | --- | --- |
| BR-REV-01 | One source for a figure | `KpiSource`, `AnswerComposer` | None, by construction |
| BR-REV-02 | Sample size, range, assumptions | Records returned by `KpiSource`, `ForecastSource` | None, required fields |
| BR-REV-03 | What-ifs change nothing | Each module's what-if read service; `insight` holds none | None |
| BR-REV-04 | Signals block nothing | No `review` call exists in any command path | None |
| BR-REV-05 | Bands | `BandPolicy` with `ReviewSettings` | `REV_SETTING_OUT_OF_RANGE` |
| BR-REV-06 | Score and grade | `ScorePolicy` | `REV_SETTING_OUT_OF_RANGE` |
| BR-REV-07 | High-risk limit | `AnomalyTriage` with `ReviewSettings` | `REV_SETTING_OUT_OF_RANGE` |
| BR-REV-08 | Levels | `AgentRuntime.nextStep` with `AgentProfile` | `AI_LEVEL_NOT_ALLOWED` |
| BR-REV-09 | Who decides a step | `AgentRuntime.decide`, which calls the command with the person's token | `AI_STEP_FORBIDDEN` |
| BR-REV-10 | Fast decisions | `AiActivityView`, read only | None |
| BR-REV-11 | Rights of the asker | Tools called with the user's token | The owning module's 403 |
| BR-REV-12 | Text is data | `AnswerComposer` marks tool results as data; `EvalRunner` tests it | None |

### Limits in code and tenant settings {#rev-limits}

Starting values are the prototype's, and each range is a proposal (OI-REV-06). Agent levels and switches sit in `platform.ai`.

| Setting | Range in code | Default as tenant data | Rule |
| --- | --- | --- | --- |
| `bandWatch`, `bandHigh` | 0 to 100 percent, `bandHigh` below `bandWatch` | 90, 70 | BR-REV-05 |
| `scoreSpendWeight`, `scoreOutputWeight` | 0 to 100, total 100 | 40, 60 | BR-REV-06 |
| `gradeA`, `gradeB`, `gradeC` | 0 to 100, falling | 90, 75, 60 | BR-REV-06 |
| `anomalyHighRisk` | 0 to 100 | 70 | BR-REV-07 |
| `fastApproveSec` | 0 to 60 seconds | 3 | BR-REV-10 |
| Anomaly thresholds | Open, OI-REV-08 | None until the auditor sets them | REV-FR-022 |

## States and transitions {#rev-states}

State names are those of the SRS. Each transition is a method on the aggregate that checks the current state against a table and records one event.

### Anomaly {#rev-state-anomaly}

{{fig:rev-state-anomaly | States of an anomaly}}

| From | To | Command | Guard | Event |
| --- | --- | --- | --- | --- |
| (none) | new | `AnomalyDetector.raise` | Rule fires; same finding not already open | `anomaly.raised` |
| new | explained | `Anomaly.explain` | Auditor; note not empty | `anomaly.decided` |
| new | escalated | `Anomaly.escalate` | Auditor; note not empty | `anomaly.escalated` |
| explained, escalated | new | `Anomaly.reopen` | Auditor; reason of at least 10 characters | `anomaly.reopened` |

### Agent run and step {#rev-state-run}

{{fig:rev-state-run | States of an agent run}}

| From | To | Command | Guard |
| --- | --- | --- | --- |
| (none) | running | `AgentRuntime.start` | Agent on; AI on for the tenant; the starter may use the agent |
| running | waiting | `nextStep` | The step writes or notifies and the level requires a person |
| running | done | `nextStep` | No step is left |
| running | stopped | `nextStep` | A blocked step ends the run, as Budget and Finance do (DG-REV-03) |
| waiting | running | `AgentRuntime.decide` | One step decided by a permitted person |
| running, waiting | stopped | `AgentRuntime.stop` | Reason of at least 10 characters; remaining steps become `stopped`; decided steps stay |

### Agenda {#rev-state-agenda}

| From | To | Command | Guard |
| --- | --- | --- | --- |
| (none) | draft | `Agenda.create` | Title and meeting date |
| draft | issued | `Agenda.issue` | At least one item |
| draft | (deleted) | `Agenda.delete` | Never issued |
| issued | closed | `Agenda.close` | Every item has a decision or is marked as not discussed |

## Dynamic behaviour {#rev-dynamic}

### An agent run {#rev-activity}

The runtime walks the plan. Reads and drafts run at once, within the level. A write or a notice stops the run. The plan is a template in the module's code. A model may choose wording and, once allowed, the order of optional reads, and it never adds a tool.

{{fig:rev-activity-agent | An agent run from start to end}}

### A person decides a step {#rev-seq-step}

{{fig:rev-seq-agent-step | A person decides an agent step, which runs the module's normal command}}

- The step holds the prepared command, with the before and after values shown to the person (REV-FR-041).
- The runtime calls the owning module's command with the person's token. Authority, duty rules and business rules run as for a click, so a refusal leaves the step waiting and shows the reason (REV-FR-044).
- The audit entry names the person as the actor and the run as the source, so a reader can see that an agent prepared the action.
- The seconds to decide are stored for BR-REV-10.

### An assistant answer {#rev-seq-assistant}

{{fig:rev-seq-assistant | The assistant answers from tools through the gateway}}

- `AssistantRouter` refuses the requests of BR-PLT-25 before any model call (Platform chapter).
- Tools run first, with the user's token. A figure enters the prompt only as a tool result.
- The gateway applies the tenant policy, removes personal data and logs the call (XC-AI-004, XC-AI-006, XC-AI-007).
- `AnswerComposer` checks that each figure in the reply matches a tool result. A mismatch returns the tool result as a plain table with no prose.
- With AI off, or if the provider fails, the tool results are shown as a plain table with their sources, so a user still gets the figure (XC-AI-003).

### Scheduled work {#rev-jobs}

Jobs run per cell and work tenant by tenant, each with the tenant bound as for a web request. Each job is safe to run twice.

| Job | Does | Requirements |
| --- | --- | --- |
| Anomaly detection | Runs each detector once a day on the projections, and raises only findings not already open | REV-FR-022 |
| Projection rebuild | Rebuilds a projection from module interfaces on demand, after a missed event or a migration | REV-DR-003 |
| AI quality run | Runs the certified question set per provider and stores the results | REV-NFR-001, REV-NFR-002, REV-NFR-005 |

## Data design {#rev-data}

<!-- covers: PDPA 39 -->

Tables live in the schema `review` of the cell's PostgreSQL cluster (ADR-0005), under the rules of the Procurement chapter: `tenant_id` first in each key, row-level security forced on each table, and common columns.

> [!NOTE] Every table, column, type and index in this section is a proposal. The data dictionary chapter will hold the final columns.

{{fig:rev-er | Core review tables and the agent tables requested in platform}}

| Table | Key columns | Class | Retention key | Requirements |
| --- | --- | --- | --- | --- |
| `spending_fact` | `fiscal_year`, `month`, `line_id`, `unit_id`, `type`, `plan`, `reserved`, `committed`, `paid`, `imported`, `as_of` | Internal, rebuildable | None, rebuilt | REV-FR-004 to REV-FR-008, REV-DR-003 |
| `project_fact` | `project_id`, `line_id`, `output_target`, `output_result`, `kpi_id`, `as_of` | Internal, rebuildable | None, rebuilt | REV-FR-010 to REV-FR-013 |
| `anomaly` | `kind`, `unit_id`, `risk`, `status`, `finding_key`, `supplier_ref`, `detail_key`, `note`, `raised_at` | Confidential | `rev.anomaly` | REV-FR-021 to REV-FR-027 |
| `anomaly_evidence`, `anomaly_event` | `anomaly_id`, `source_ref`, `value`, `date`; `action`, `actor_ref`, `reason` | Confidential | `rev.anomaly` | REV-DR-002 |
| `agenda`, `agenda_item`, `agenda_decision` | `title`, `meeting_on`, `status`; `source_module`, `source_ref`; `text`, `owner_ref`, `due_on` | Confidential | `rev.agenda` | REV-FR-053 to REV-FR-055, REV-DR-006 |
| `review_setting` | `key`, `value`, `effective_from` | Internal | `rev.config` | REV-CR-003 |
| `ai_eval_run`, `ai_eval_case` | `provider`, `model`, `ran_at`, `set_version`; `question_id`, `pass`, `detail` | Internal | `rev.ai` | REV-NFR-001, REV-NFR-002, REV-NFR-005 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | Short, set with the platform | ADR-0008 |

Requested in `platform`, for the reason in DG-REV-01:

| Table | Key columns | Class | Retention key | Requirements |
| --- | --- | --- | --- | --- |
| `agent_profile` | `agent`, `module`, `enabled`, `level`, `changed_by_ref`, `why` | Internal | `plt.ai.use` | REV-FR-035, REV-FR-049, REV-FR-050 |
| `agent_run` | `agent`, `starter_ref`, `level`, `status`, `started_at`, `stop_why` | Confidential | `plt.ai.use` | REV-FR-037, REV-DR-001 |
| `agent_step` | `run_id`, `seq`, `tool`, `kind`, `status`, `output_ref`, `change`, `decided_by_ref`, `decided_ms` | Confidential | `plt.ai.use` | REV-FR-037, REV-FR-041, REV-FR-047 |

### Personal fields {#rev-data-fields}

This table feeds the data dictionary and the records of processing (ADR-0014, PDPA 39, REV-DR-005). The legal basis of each field is for the data protection officer to confirm.

| Field | Class | Protection | Rule |
| --- | --- | --- | --- |
| `anomaly.supplier_ref` | Confidential | A reference; the name stays in `procurement` | Never sent to a model until OI-REV-12 is settled |
| `*_ref` columns | Confidential | Pseudonymous reference; the name sits in the platform subject table | Reports show a placeholder after erasure (ADR-0015) |
| `agent_step.change` | Confidential | Role-based access | Holds values shown to the decider, never a Restricted value |
| AI activity target | Internal | A record reference only | The typed question stays in the owner's thread (REV-DR-004) |

## Interface design {#rev-interfaces}

The REST API is described in OpenAPI 3.1 (ADR-0003), and the events in AsyncAPI (ADR-0008). The tenant comes from the token. State-changing calls carry `If-Match`. Paths are relative to `/api/v1/review`.

> [!NOTE] This endpoint list is a proposal, and the authority names are defined in the security section.

| Method and path | Purpose | Authority | Requirements |
| --- | --- | --- | --- |
| `GET /home/cards` | Home card figures for the user | Any session, filtered | REV-FR-001 to REV-FR-003 |
| `GET /executive/summary`; `GET /executive/units`; `GET /executive/drill` | Dashboard and drill-down | `rev.exec` | REV-FR-004 to REV-FR-009 |
| `GET /scorecard` | Scores and grades | `rev.exec` | REV-FR-010 to REV-FR-013 |
| `GET /insight/kpis`; `GET /insight/forecasts`; `GET /insight/signals` | Cross-module views | `rev.insight` | REV-FR-018 to REV-FR-020 |
| `GET /anomalies`; `POST /anomalies/{id}/explain, escalate, reopen` | Anomaly queue and triage | `rev.anomaly.read`, `rev.anomaly.decide` | REV-FR-023 to REV-FR-027 |
| `GET /ai/agents`; `PUT /ai/agents/{id}/enabled, level` | Agent list, switch and level, passed to `AgentCatalogue` | `rev.ai.read`, `rev.ai.govern` | REV-FR-048 to REV-FR-050 |
| `GET /ai/activity`; `GET /ai/quality` | AI use, log and quality | `rev.ai.read` | REV-FR-051, REV-FR-052 |
| `GET, POST /agendas`; `GET, PUT, DELETE /agendas/{id}`; `POST /agendas/{id}/issue, close`; `POST /agendas/{id}/items/{i}/decision` | Agendas | `rev.agenda` | REV-FR-053 to REV-FR-055 |
| `GET, PUT /settings` | Bands, weights, limits | `rev.admin` | REV-CR-003 |

Runs are started and decided on the routes of each module, such as `/api/v1/procurement/agents/{agent}/runs`, because the module's authority applies. They all call the one runtime.

### Error catalogue {#rev-errors}

> [!NOTE] These codes are a proposal. Errors are Problem Details with a `code` field. `AI_` codes belong to the runtime in `platform.ai`.

| Code | HTTP | Meaning | Rule or requirement |
| --- | --- | --- | --- |
| `REV_INVALID_INPUT` | 400 | A field fails validation | XC-SEC-013 |
| `REV_REASON_REQUIRED` | 400 | A note or reason is missing or too short | REV-FR-024 |
| `REV_FORBIDDEN` | 403 | The user lacks the authority | ADR-0006 |
| `REV_NOT_FOUND` | 404 | The record does not exist or belongs to another tenant | ADR-0005 |
| `REV_VERSION_CONFLICT` | 409 | The record changed since it was read | ADR-0005 |
| `REV_STATE_CONFLICT` | 409 | The action does not apply to the current state | REV-FR-024 |
| `REV_SETTING_OUT_OF_RANGE` | 422 | A setting is outside its allowed range | REV-CR-003 |
| `AI_LEVEL_NOT_ALLOWED` | 403 | The level is not allowed for this agent | BR-REV-08 |
| `AI_STEP_FORBIDDEN` | 403 | This person may not decide this step | BR-REV-09 |
| `AI_TOOL_NOT_REGISTERED` | 403 | The agent may not use this tool | REV-FR-038 |
| `AI_OFF` | 409 | AI or this agent is off for the tenant | XC-AI-002, XC-AI-003 |

### Event catalogue {#rev-events}

> [!NOTE] This event list is a proposal. Payloads hold references and amounts, never personal data. Routing keys start with `review.`.

| Event | Raised by | Extra fields | Consumers |
| --- | --- | --- | --- |
| `anomaly.raised` | `AnomalyDetector` | `kind`, `risk`, `unitId` | Work item for the auditor |
| `anomaly.decided`, `anomaly.reopened` | `Anomaly` | `status` | Audit view |
| `anomaly.escalated` | `Anomaly` | `risk`, `unitId` | Notices to the executive and Finance |
| `agenda.issued`, `agenda.decision-recorded` | `Agenda` | `meetingOn`, `ownerRef` | Notices, work items |

Review consumes the events of the other modules to fill its projections. From Procurement it takes `contract.signed`, `contract.changed`, `contract.terminated`, `phase.accepted` and `phase.paid`, as the Procurement event catalogue lists. It needs the matching line and payment events from Budget and Finance (DG-REV-02).

## Security design {#rev-security}

<!-- covers: PDPA 39 -->

Keycloak signs users in (ADR-0006), and the server checks rights on every read and action. Review sits at OWASP ASVS Level 2 (ADR-0017). Each view filters by role and unit on the server, so a figure a user may not see never reaches the browser (REV-FR-003, REV-FR-009).

### Authorities {#rev-authorities}

> [!NOTE] The authority names are a proposal. Roles map to authorities as tenant data, and these defaults follow the page roles of the prototype.

| Authority | Default roles | Allows |
| --- | --- | --- |
| `rev.exec` | `exec`, `plan`, `fin`, `finhead`, `audit`, `proc`, `prochead`, `div`, `divhead`, with units limited for unit roles | Dashboard, drill-down, scorecard |
| `rev.insight` | `exec`, `plan`, `fin`, `finhead`, `audit` | Cross-module views, each row filtered by the source module's rights |
| `rev.anomaly.read` | `audit`, `exec`, `plan`, `fin` | Read anomalies |
| `rev.anomaly.decide` | `audit` | Explain, escalate, reopen |
| `rev.ai.read` | `audit`, `exec`, `plan`, `fin` | Agent list, AI activity, quality |
| `rev.ai.govern` | Open, OI-REV-02 | Agent switch and level |
| `rev.agenda` | Executive office, a tenant choice | Agendas |
| `rev.admin` | `admin` | Settings |

### AI controls {#rev-ai-security}

- All model calls pass through `AiGateway`. AI is off by default, and every feature works with it off (ADR-0016).
- A tenant's AI switch sits in the gateway policy. An agent switch can only narrow it, and the general assistant obeys it too. The prototype's general assistant has no switch (OI-REV-03).
- `AgentProfile` starts disabled for every agent and tenant, and an unknown agent counts as off. The prototype does the reverse.
- The tool register is a closed list per agent, checked at start and at each step. An architecture test asserts that no write tool calls an approval, amount change, signature, payment, award or scoring command (REV-FR-039).
- Restricted data never enters a tool result for a model (XC-AI-005). Sealed replies and unawarded bid prices are also left out, as the cross-cutting chapter states.
- A document's text reaches the model only inside a marked data block, and read-only tools limit the harm of an injected instruction. `EvalRunner` holds an attack set, and a tenant cannot enable a provider that fails it (REV-NFR-005).
- The audit entry of an approved step carries the person, and the agent is the source. A step never counts as a decision by an agent (XC-AI-010).

### Separation of duties {#rev-sod}

| Check | Command | Compared with | Requirements |
| --- | --- | --- | --- |
| Step decision | `AgentRuntime.decide` | The duty rules of the command it runs, through `SodGuard` in that command | REV-FR-044 |
| Starter and decider | `AgentRuntime.decide` | The prototype lets one person start a run and approve its steps. This stays allowed, because the person is the actor of each command, and DG-REV-04 asks for a ruling | BR-REV-09 |
| Anomaly decision | `Anomaly.explain`, `escalate` | The auditor holds no role in the spending reviewed | REV-FR-024 |

### Audit {#rev-audit}

- Each switch, level change, run start, step decision, stop, anomaly decision and settings change writes an entry through `AuditLog` (REV-NFR-008).
- Entries hold a subject reference and item ids, never names or free text (ADR-0015). Notes and reasons stay in the business record.
- The AI activity page reads the `ai_use` rows of `platform` and adds the run and step data. It stores no copy.

## Non-functional design {#rev-nfr}

The table shows how each non-functional requirement is met. Time and volume targets are those of the cross-cutting chapter.

| Requirement | Design answer | Verified by |
| --- | --- | --- |
| REV-NFR-001, REV-NFR-002 | `EvalRunner` runs a certified question set in Thai and English per provider | `AiQualityIT`, with results on the quality page |
| REV-NFR-003 | Timing measured at `AiGateway` | Gateway metrics |
| REV-NFR-004 | Share computed from `anomaly_event` | A report |
| REV-NFR-005 | Attack set of injected text and cross-rights questions | `AiAttackIT` |
| REV-NFR-006 | Simulated answers exist only in a test adapter behind `AiGateway`, in test profiles | Build check |
| REV-NFR-007 | `BandPolicy` and `ScorePolicy` are pure functions | Unit tests |
| REV-NFR-008 | `CommandAudit` aspect on every command | Integration test per command |
| REV-NFR-009 | Each projection row carries `as_of`, and each response returns it | API test |

### Load and availability {#rev-nfr-load}

- Dashboards read `spending_fact`, so the 30 September peak in command tables does not reach them, and they add no load to the Budget ledger row lock (ADR-0005).
- A projection lags its commit by the outbox delay, and `as_of` shows this. A figure used for a decision opens the source page, which reads live data.
- If a model provider fails, AI tools stop and every feature still works (XC-AI-003).
- A failed consumer leaves events in the queue, and `ProjectionRebuilder` can rebuild from module interfaces.

## Test design {#rev-tests}

The sweep cannot test a server, so each check becomes a production test. Every test names the requirements it proves.

> [!NOTE] The test class names are a proposal.

### Test levels {#rev-test-levels}

| Level | Tool | Covers |
| --- | --- | --- |
| Unit | JUnit | `BandPolicy`, `ScorePolicy`, each detector, every pair of run and step states |
| Architecture | Spring Modulith `verify`, ArchUnit | No module depends on `review`; `review` writes no other schema; no direct model call |
| Integration | JUnit with Testcontainers | REST reads by role and unit, row-level security, projections from events, triage |
| Module scenario | Spring Modulith `Scenario` | An agent step running a real Procurement command, refused by a duty rule |
| End to end | Playwright | Home, dashboard and governance in Thai and English, with AI on and off |
| AI quality | `EvalRunner` | Question and attack sets per provider |

### From sweep checks to production tests {#rev-test-walks}

| Sweep check | Production test | Added beyond the check | Requirements |
| --- | --- | --- | --- |
| Round C4 | `DashboardLiveYearIT` | Figures equal the sum of line facts; a Finance payment appears through the event | REV-FR-004, REV-FR-005, BGT-FR-133 |
| Finance walk FC6 | `AgentRunStopIT` | Approved steps stay, remaining steps stop, a short reason is refused | REV-FR-045 |
| Page-open sweep | `role-matrix.spec` | Fails on a console error; checks a unit role sees only its unit | Partial rows in general |
| Chat suite | `AssistantAnswerIT` | Sources present, figures match tools, refusals asserted | REV-FR-028 to REV-FR-033 |

### Tests with no sweep ancestor {#rev-test-new}

| Test | Asserts | Requirements |
| --- | --- | --- |
| `AiOffIT` | With AI off for a tenant, every page of the module works, no model call is made, and the general assistant refuses | REV-FR-034, XC-TST-009 |
| `AgentDefaultOffTest` | A new tenant has every agent off, and an unknown agent counts as off | XC-AI-002 |
| `AgentStepUsesCommandIT` | An approved step runs the normal command and is refused like a click | REV-FR-044 |
| `ToolRegisterRulesTest` | No register holds a forbidden tool, in any module | REV-FR-039 |
| `AnomalyTriageIT` | Only the auditor decides; a reopen keeps the earlier result; a detector does not raise a finding twice | REV-FR-022, REV-FR-024 |
| `AnomalyVisibilityIT` | Unit roles get no anomaly by any route, including chat | REV-FR-027 |
| `HomeCardScopeIT` | Card figures respect role and unit | REV-FR-003 |
| `SettingRangeTest` | Each setting refuses a value outside its range | REV-CR-003 |
| `AiLogPrivacyTest` | The AI log holds references only | REV-DR-004 |

## Migration from the prototype {#rev-migration}

The prototype is a reference, and no code moves across. There is no production data to migrate.

| Carries over | How | Source in the prototype |
| --- | --- | --- |
| Band and score rules | Rewritten as policies with tests, with settings in place of fixed numbers | `40-dashboard.js` unitState; `48-performance.js` projScore |
| Dashboard layout and figures | The React build follows the same panels | `47d-alloc-b4.js` MON_PANELS.live; `40b-monitor-tabs.js` |
| Anomaly triage | Rewritten as `Anomaly`, with the same statuses | `44c-intel-depth.js`; `82-intel-crud.js` anDone |
| Levels, tool kinds, step states, decision timing | Rewritten in `platform.ai` | `67b-agents.js` |
| Thai and English labels | Moved to message files | `L()` labels |

| Does not carry over | Why | Replaced by |
| --- | --- | --- |
| Three agent engines | One framework is required (REV-FR-036) | `AgentRuntime` |
| Direct writes in `applyStep`, `bApply` and `fApply` | The server's normal checks must run (REV-FR-044) | Module commands |
| Seeded anomalies and seeded agent use counts | Sample data | Detectors and measured use |
| Fixed plan and category shapes (`PLAN_F`, `EXP_SPLIT`) | Sample shapes | Real monthly plans and line categories |
| The fixed 4.2 seconds and the "personal data masked" chip | Not measured, not built (REV-CR-004) | Gateway metrics and the gateway's removal of personal data |
| Rule-based stand-ins for AI answers | The real service differs | `AiGateway` with its own evaluation |
| Demo date and presenter mode | Must not exist in production (XC-SEC-015) | None |

## Known gaps and open issues {#rev-open}

### Issues carried from the SRS {#rev-open-srs}

| Issue | Effect on this design | Designed for now | Decides |
| --- | --- | --- | --- |
| OI-REV-01 | Run behaviour differs by engine | One runtime; a blocked step stops the run | Technical lead, product owner |
| OI-REV-02 | Who governs agents | `rev.ai.govern` left open | Product owner, data protection officer |
| OI-REV-03 | Default on in the prototype | Off for every tenant and every unknown agent | Development team |
| OI-REV-04 | L3 and a person's decision | `L3` exists as a value and is refused until decided | Product owner |
| OI-REV-05 | AG-03 and amounts | The tool passes through the normal round 2 command, and a person is the actor | Product owner, Planning |
| OI-REV-06 | Ranges | Provisional ranges in `SettingRange` | Planning, auditor |
| OI-REV-07 | Agendas and scorecard ownership | Tables exist on paper; the scorecard sits in `review` | Product owner |
| OI-REV-08 | Anomaly rules | Detectors with no default threshold, so they raise nothing until set | Auditor, procurement specialist |
| OI-REV-09 | Official forecast | `ForecastComparison` shows each with its source | Product owner, head of finance |
| OI-REV-10 | Retrieval store | `RetrievalTool` behind a port; OpenSearch first, under ADR-0009 | Technical lead |
| OI-REV-11 | Quality targets | Stored as evaluation settings | Product owner |
| OI-REV-12 | Supplier names and models | A reference only; the name never enters a prompt | Data protection officer |

### New issues from this design {#rev-open-new}

The DG-REV numbers below belong to this chapter and are not SRS ids.

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-REV-01 | Does `platform.ai` host `AgentRuntime`, `AgentCatalogue` and the agent tables, and does `procurement` drop `AgentRunner` and its copy of `ai_use`? | Yes, as this chapter shows | Technical lead, Platform and Procurement chapter owners |
| DG-REV-02 | The interfaces requested of `budget` and `procurement`, and the events requested of `budget` and `finance`, are not agreed | As listed in Components | Chapter owners, product owner |
| DG-REV-03 | The prototype has both `stopped` and `cancelled` for a run. Is one end state enough? | One state, `stopped`, with a reason | Technical lead |
| DG-REV-04 | May the person who starts a run also approve its steps? | Yes, since that person acts for each command | Auditor, product owner |
| DG-REV-05 | Does `KpiSource` return computed values or a query? | Computed values with the sample size, from the module's `reporting` package | Technical lead |
| DG-REV-06 | Which roles in the role list may use each agent in the assistant, given that unit staff can reach anomalies through chat today? | Filtered by `rev.anomaly.read` in the tool | Auditor, product owner |

### Known gaps in this version {#rev-open-depth}

- Cross-module insight and agendas have no prototype, so their design stops at packages, tables and endpoints.
- Detector rules are not designed, because OI-REV-08 is open.
- Column types, indexes and constraints wait for the data dictionary chapter.
