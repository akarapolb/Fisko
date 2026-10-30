# Module: Review and analytics {#rev}

## Purpose and scope {#rev-purpose}

Review and analytics is the part of Fisko that looks across the other modules. It gives every user a home view of the numbers that matter, gives executives one picture of spending, grades projects, flags spending that should be checked, and holds what the AI features of all modules share: the assistant's rules, the agent framework and AI governance.

The module reads and does not run the work. It owns only its own records: anomalies, agendas, scores and settings. It changes no record of another module, and a proposal always goes through that module's normal action. No production code exists yet, so this chapter was read from the prototype code and its sweep tests.

Every AI behaviour in the prototype is simulated. No model is called. An answer or an agent step is a fixed rule or template run over sample data. ADR-0016 governs the production product: AI is off by default, every feature works without it, the gateway removes personal data before sending, and a person makes every decision. A row in this chapter that mentions AI is a requirement on that production behaviour, and its status says only how much of the behaviour the simulation shows.

| Component | State in the prototype | Evidence |
| --- | --- | --- |
| Home cards | Built | Page-open sweep only |
| Executive dashboard | Built on live allocation and payment data | Page-open sweep only. The live-year check supports BGT-FR-133 |
| Project scorecard | Built | Page-open sweep only |
| Spending anomalies | Triage built on a seeded list; no detection exists | Page-open sweep and drawer render only |
| Cross-module KPI, forecast and signal views | Not built. Each module has its own page | None |
| Agendas across modules | Not built. The only agenda in the code is the budget committee's | None |
| Shared assistant | Rules and sample data; no model is called | Chat suite checks text only |
| Agent framework | Three separate simulated engines; no model is called | Budget and Finance runs are started by the sweep, Procurement runs are not |
| AI governance | Built, with sample and seeded values | Page-open sweep only |

Outside this chapter:

| Topic | Where it is specified |
| --- | --- |
| The Today page tasks, approvals inbox, exception centre, pins and system cards | [Platform](#plt), PLT-FR-079 to PLT-FR-086 |
| The chat panel, conversations, files, voice and routing to a specialist (co-work) | [Platform](#plt), PLT-FR-127 to PLT-FR-136 |
| The record review step (enter, review, confirm) | [Platform](#plt), PLT-FR-141 to PLT-FR-143. The file `92-review.js` holds this step and has no part in this module |
| The model gateway and the rules every AI call obeys | [Cross-cutting requirements](#xc), XC-AI-001 to XC-AI-011 |
| Procurement KPIs, forecasts, what-ifs, red flags, AI tools and agents AG-07, AG-08 and AG-10 to AG-14 | [Procurement](#prc), PRC-FR-166 to PRC-FR-175 and PRC-FR-180 to PRC-FR-189 |
| Budget review stages, committee agendas and votes, spending alerts, progress reports, KPIs, forecasts, what-ifs, justification quality and Budget agents | [Budget](#bgt) |
| Finance KPIs, forecasts, what-ifs, signals and agents AG-18 to AG-22 | [Finance](#fin) |

## Actors {#rev-actors}

| Actor | Role in Review and analytics | Prototype role |
| --- | --- | --- |
| Executive | Reads the dashboard and scorecard, asks the assistant, starts agents, and in the prototype switches agents and sets their levels | `exec` |
| Planning staff | Reads the dashboard, scorecard and anomalies, starts Budget agents, decides their write steps | `plan` |
| Finance officer | Reads the dashboard and anomalies, starts Finance agents, receives escalated anomalies | `fin`, `finhead` |
| Auditor | Decides anomalies, reads agents, runs and the AI activity log | `audit` |
| Unit staff | Sees home cards and the dashboard, asks the assistant | `div`, `divhead` |
| Procurement staff | Sees home cards and the dashboard, starts Procurement agents | `proc`, `prochead` |
| Administrator | Opts the tenant in to AI (XC-AI-002). The prototype gives this role no page in this module | `admin` |
| AI agents | Run steps from a tool register and stop for a person. The catalogue is under the agent framework | Rule functions |
| System jobs | Would detect anomalies and refresh views. None exists in the prototype | None |
| Model provider (external) | Serves the gateway for a tenant that opted in | Simulated, no call |

## Use cases {#rev-usecases}

The table replaces a use case diagram. Each use case names the actor who starts it, what starts it and what is true afterwards.

| ID | Name | Actor | Trigger | Outcome |
| --- | --- | --- | --- | --- |
| UC-REV-01 | See the home cards | Any user | The user opens the Today page | Cards show the user's work and the money position, each opening its page |
| UC-REV-02 | Read the executive dashboard | Executive, Planning, Finance | A review of spending is due | The current year's position is shown by unit |
| UC-REV-03 | Drill into spending | Executive, Planning, Finance | A unit is behind plan | The unit's projects and categories are shown |
| UC-REV-04 | Read the project scorecard | Executive, Planning, Auditor | A mid-year or year-end review | Each project has a score and a grade |
| UC-REV-05 | Decide an anomaly | Auditor | An anomaly is waiting | The anomaly is closed as explained or escalated, with a note |
| UC-REV-06 | Reopen an anomaly | Auditor | New facts appear | The anomaly waits for review again and the earlier result is kept |
| UC-REV-07 | Ask the assistant for a figure | Any user with AI on | The user needs a figure or a summary | An answer with its sources, or a statement that it cannot answer |
| UC-REV-08 | Start an agent run | Staff of the owning module | A goal needs several steps | A run exists and stops at its first step that writes |
| UC-REV-09 | Decide an agent step | A person allowed to do that action | A run is waiting | The step runs, is edited and run, or is skipped |
| UC-REV-10 | Stop a run | The starter, or staff of the owning module | The run is wrong or no longer needed | Remaining steps do not run; approved steps stay in effect |
| UC-REV-11 | Govern agents | Authorised role | A tenant's AI policy changes | An agent's switch or level changes and the auditor knows |
| UC-REV-12 | Check AI activity | Auditor | An audit or a routine check | The use of AI can be read by agent, user and outcome |
| UC-REV-13 | Prepare a cross-module agenda | Executive office | A management meeting is due | An agenda links items from several modules |
| UC-REV-14 | Read cross-module insight | Executive, Auditor | A view across modules is needed | KPIs, forecasts and signals of several modules are on one page |

## Business rules {#rev-rules}

Business rules are conditions that several requirements share. The Source column gives the design rule, ADR or file. The last column says where a rule can be configured. A range marked as a proposal is for the named owner to confirm.

| ID | Rule | Source | Setting and allowed range |
| --- | --- | --- | --- |
| BR-REV-01 | Every figure on a dashboard, on a card or in an assistant answer comes from a defined KPI or a published query. Neither a screen nor a model computes a total of its own | `65-analytics.js` header; Solution Design 9.3, 9.4 | Fixed in code |
| BR-REV-02 | Every KPI shows its sample size. Every forecast shows its range, sample size and assumptions | `65b-forecast.js` header | Fixed in code |
| BR-REV-03 | A what-if never changes a stored record. A result becomes real only through the normal action of its module | `44b-intel-tabs.js`, `82-intel-crud.js`, `65b-forecast.js` | Fixed in code |
| BR-REV-04 | A signal or anomaly says what should be checked and states no intent. It blocks nothing, and the auditor decides | Solution Design 9.4; `44c-intel-depth.js`; PRC-FR-175 | Fixed in code |
| BR-REV-05 | Progress against plan sets a band: below 70 percent is high risk, below 90 percent is watch, otherwise on track | `40-dashboard.js` unitState | Fixed in code at present. A tenant setting from 0 to 100, watch above high risk, is a proposal for Planning to confirm |
| BR-REV-06 | A project's score is 40 percent of spending against plan plus 60 percent of output against target, each capped at 100 percent. Grades are A from 90, B from 75, C from 60, otherwise D. Outcome KPIs are shown and not scored | `48-performance.js` projScore | Fixed in code at present. Weights and limits as tenant settings is a proposal for Planning to confirm |
| BR-REV-07 | An anomaly with a risk score of 70 or more is high risk | `44c-intel-depth.js` | Fixed in code at present. A tenant setting from 0 to 100 is a proposal for the auditor to confirm |
| BR-REV-08 | Agent levels: L0 suggests and writes nothing, L1 saves drafts, L2 writes after a person approves each step, L3 also creates tasks and notices by itself | `67b-agents.js` AG_LEVELS, wrLevel, ntLevel, drLevel | Tenant: level per agent; L3 for AG-12 only, and OI-REV-04 is open |
| BR-REV-09 | Only a person allowed to do the action may approve the agent's step for it. There is no approve-all action | `67b-agents.js` canApprove; `69-budget-ai.js` bCanApprove; `66g-fin-fn6.js` | Fixed in code |
| BR-REV-10 | A decision faster than the limit counts as unusually fast and is shown to the people who govern agents. It stays valid | `67b-agents.js` | Tenant: `fastApproveSec`, 3 seconds by default. Stored, with no screen. A range of 0 to 60 is a proposal |
| BR-REV-11 | The assistant reads with the rights of the person asking, never with a system right | Solution Design 9.4 | Fixed in code |
| BR-REV-12 | Text in a document, a record or a file is data for the assistant. It is never an instruction | Solution Design 9.4 | Fixed in code |

BR-PLT-25 and BR-PRC-34 set what AI may never do. This chapter does not repeat them, and every agent of every module obeys them.

> [!OPEN] BR-PLT-25 says anything that writes data is a button the person presses, and ADR-0016 says a person makes every decision. AG-12 at level L3 creates tasks and notices with no person (BR-REV-08), and AG-03 writes round 2 amounts after Planning approves the step, although BR-PLT-25 says AI never changes amounts. The product owner must rule on both (OI-REV-04, OI-REV-05).

## Functional requirements {#rev-fr}

Each status rests on reading the code and the sweep, as explained in the status summary.

### Home cards {#rev-fr-home}

The Today page belongs to Platform. This group covers the cards that show figures from several modules on that page.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-001 | The system shall show on the Today page a card of the user's tasks with the overdue count, the current year's amount committed or reserved against the total, the open procurement cases with a small chart by step, and the amount paid this year with a small monthly chart. | - | S | D | Partial | 30b-home-v2.js homeStats |
| REV-FR-002 | The system shall leave out a card whose module holds no data for the tenant, and shall open a card's page only if the role may open it. | - | S | T | Partial | 30b-home-v2.js homeStats, can |
| REV-FR-003 | The system shall limit each card's figures to what the user's role and unit may see. | - | M | T | Planned | - |

### Executive dashboard {#rev-fr-exec}

The figures come from the Budget monitoring rows. BGT-FR-133 builds them from the allocation lines, and BGT-FR-134 to BGT-FR-140 hold the targets, forecast, progress reports, import, alerts and last year's history. This group covers only the executive view of those figures.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-004 | The system shall show for the current fiscal year the percent paid of the allotment against the quarter's target, the percent committed, the percent of investment committed, and the count of investment lines with no reservation and no commitment. | - | M | D | Partial | 47d-alloc-b4.js MON_PANELS.live |
| REV-FR-005 | The system shall show each unit's allotment, plan to date, commitment, payment and percent of plan. | - | M | D | Partial | 47d-alloc-b4.js MON_PANELS.live |
| REV-FR-006 | The system shall show the band of BR-REV-05 for each unit and project. | - | S | T | Partial | 40-dashboard.js unitState; 40b-monitor-tabs.js stateCell |
| REV-FR-007 | The system shall let a user drill from all units to one unit, to its projects, to one project's expense categories, with allotment, plan, actual and percent of plan at each level. | - | M | D | Partial | 40b-monitor-tabs.js MON_PANELS.drill |
| REV-FR-008 | The system shall list the units that need attention, lowest progress first, with the issue from the latest progress report. | - | S | D | Partial | 40-dashboard.js VIEWS.dashboard |
| REV-FR-009 | A unit role shall see on the dashboard only its own unit and the units under it (PLT-FR-029). | - | M | T | Planned | - |

> [!WARN] The third drill level is not real data. `EXP_SPLIT` in `40b-monitor-tabs.js` shares a project's spending across categories by fixed sample ratios. REV-FR-007 stays Partial until categories come from the allocation lines. The history tab of BGT-FR-140 also fixes the plan curve shape in `PLAN_F`, and its text "month 7 of 12" and "5 months left" is fixed.

### Project scorecard {#rev-fr-score}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-010 | The system shall compute a score and a grade under BR-REV-06 for each project that has an output record. | - | S | T | Partial | 48-performance.js projScore |
| REV-FR-011 | The system shall show the count of projects per grade, a chart of spending against output, and for each project the amount spent, percent of plan, output, percent of target, cost per unit of output, outcome KPI and grade. | - | S | D | Partial | 48-performance.js PERF.scorecard, scatter |
| REV-FR-012 | The system shall mark a project with no reported output as not graded. The code scores it as zero output. | - | S | T | Planned | - |
| REV-FR-013 | The system shall join a project's scorecard to its project id, so that it reads contracts and payments as well as lines (REV-IR-004). | - | C | T | Planned | - |

> [!NOTE] Supplier records are shown with no ranking (PRC-FR-150). This scorecard grades projects only and grades no person or supplier.

### Cross-module insight {#rev-fr-insight}

Each module defines its own KPIs, forecasts, what-ifs and signals. This group states what they share and what looks across them.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-014 | Each KPI shall be defined once, in the module that owns it, and every dashboard, card and assistant answer shall read it by id (BR-REV-01). | - | M | I | Partial | 65-analytics.js KPIS; 69-budget-ai.js kpiB; 66g-fin-fn6.js FAI.kpi |
| REV-FR-015 | The system shall show each KPI with its value, sample size and definition. | - | S | D | Partial | 65-analytics.js KPIS; 69-budget-ai.js INTEL.bkpi |
| REV-FR-016 | Each forecast of every module shall meet BR-REV-02. | - | S | D | Partial | 65b-forecast.js PROC.forecast; 69-budget-ai.js INTEL.bfore; 66g-fin-fn6.js FAI.fc |
| REV-FR-017 | Each what-if of every module shall meet BR-REV-03, and a saved scenario shall hold its settings and no copy of real data. | - | M | T | Partial | 44b-intel-tabs.js simulate; 82-intel-crud.js wiSc; 65b-forecast.js runScenario; 66g-fin-fn6.js FAI.wi |
| REV-FR-018 | The system shall show on one page the KPIs of every module the role may use, filtered by module. | - | S | D | Planned | - |
| REV-FR-019 | The system shall show the spending forecasts of Budget, Procurement and Finance side by side, each with its source, date and range, and the gap between them. | - | S | T | Planned | - |
| REV-FR-020 | The system shall give the auditor one queue of the signals of all modules (PRC-FR-171 and the Budget and Finance signals), each opening the triage of its own module. | - | C | T | Planned | 90-systems.js SYSTEMS.audit, planned page only |

> [!OPEN] The product has at least three forecasts of the same spending, built by different methods: the Budget year-end forecast in `69-budget-ai.js` fcYear, the Procurement monthly forecast in `65b-forecast.js` monthly, and the Finance forecast F-FN-01 in `66g-fin-fn6.js`. The Budget page also keeps an older method in `40c-monitor-depth.js` fcast. They can disagree on one screen. The product owner and the head of finance must name the official figure (OI-REV-09).

### Spending anomalies {#rev-fr-anom}

Anomalies look across Budget, Procurement and Finance, so their kinds, detection and visibility sit here. BGT-FR-171 states the auditor's triage. Procurement red flags stay in PRC-FR-171 to PRC-FR-175.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-021 | The system shall hold anomalies of four kinds: split purchases, a year-end spending spike, payment before inspection and supplier concentration, each with a unit, a risk score from 0 to 100, its evidence rows and a status. | - | S | T | Partial | 44c-intel-depth.js AN_KIND, INTEL.anoms |
| REV-FR-022 | The system shall detect these kinds every day from Budget, Procurement and Finance data, using rules with thresholds in the settings, and shall work with AI off. | - | S | T | Planned | - |
| REV-FR-023 | The system shall show the count waiting, the count of high-risk items not yet explained and the date of the last scan, and shall sort waiting items first, then by risk. | - | S | D | Partial | 44c-intel-depth.js INTEL.anoms |
| REV-FR-024 | Under BGT-FR-171, a close or an escalation shall need a note that is not empty, a reopen shall need a reason of at least 10 characters, and an escalation shall notify the executive and Finance. | - | S | T | Partial | 44c-intel-depth.js INTEL_BIND.anoms; 82-intel-crud.js anDone |
| REV-FR-025 | The system shall give the auditor a task for each waiting anomaly. | - | S | T | Partial | 30-home.js myTasks |
| REV-FR-026 | The system shall word each anomaly under BR-REV-04 and shall block no record because of it. | - | M | I | Partial | 44c-intel-depth.js INTEL.anoms |
| REV-FR-027 | The system shall show anomalies only to the auditor, the executive, Planning and Finance. | - | M | T | Partial | 75-budget-pages.js BUD_PAGES insight |

> [!WARN] Every anomaly in the prototype is seeded in `06-seedhelp.js`. No code detects one, and the "last scan" is the newest seeded date. The chat answer in `68-cowork.js` also lists anomalies to any role that may use AG-05, including unit staff, which breaks REV-FR-027.

### Shared assistant {#rev-fr-assist}

The chat itself is PLT-FR-127 to PLT-FR-136. This group states what an answer must contain. Module chapters state what each specialist knows. Every answer in the prototype is built from fixed rules and sample questions, and no model is called.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-028 | The general assistant shall answer what the user should do first, from the user's tasks, and a summary of payments, and otherwise shall say what it can do and which specialists exist. | - | S | T | Partial | 68-cowork.js cwAnswer |
| REV-FR-029 | Each answer with figures shall give its sources, the date of the data and its assumptions. | - | M | T | Partial | 44-assistant.js answer |
| REV-FR-030 | The system shall take every figure in an answer from a tool result (BR-REV-01), shall check totals before it shows them, and shall never let a model compute a total. | - | M | T | Planned | - |
| REV-FR-031 | Every tool the assistant uses shall run with the rights of the person asking (BR-REV-11). | - | M | T | Planned | - |
| REV-FR-032 | The system shall answer a question about rules or documents only from indexed sources the user may read, and shall cite the source document. | - | S | T | Planned | - |
| REV-FR-033 | The system shall say so when a question is outside what it can answer, and shall log it as not answered. | - | S | T | Partial | 44-assistant.js ask |
| REV-FR-034 | With AI off, the assistant shall show that it is off, and every dashboard, KPI, forecast, what-if and anomaly page shall work unchanged (XC-AI-003). | - | M | T | Partial | 44b-intel-tabs.js agentOn; 44-assistant.js ask |

> [!NOTE] Since round 67 the assistant shows a unit role only its own unit's spending, requests and anomalies, and it stops when its agent is off. Role limits beyond that are not built, so REV-FR-031 stays Planned, and the page sentence must not reach a production screen until the row is met.

### Agent framework {#rev-fr-agents}

An agent takes a goal, plans steps, calls registered tools and stops for a person. The framework below is shared. Each module chapter owns its agents' goals and tools. The prototype has three engines, in `67b-agents.js`, `69-budget-ai.js` and `66g-fin-fn6.js`, and each follows a fixed template with no model.

| Agent | Name | Owner | Level shown in chat |
| --- | --- | --- | --- |
| AG-01 to AG-04 | Budget Preparation, Validation, Analysis, Optimization | BGT | L1, L1, L0, L1 |
| AG-05 | Budget Monitoring | BGT for spending alerts; REV for anomalies | L2 |
| AG-06 | Executive Budget Assistant | BGT for its questions; REV for the answer rules | L0 |
| AG-07, AG-08 | Procurement Drafting, Contract Monitoring | PRC | L1, L2 |
| AG-09 | Reserved in the family concept for a cash forecast; not built | None | None |
| AG-10 to AG-14 | Procurement Insight, Case Copilot, Contract Watch, Compliance Reporter, Document Intake | PRC | L0, L2, L3, L1, L1 |
| AG-15 to AG-17 | Transfer Helper, Hearing Prep, Report Collector | BGT | L1 each |
| AG-18 to AG-22 | Voucher Checker, Advance Chaser, Reconciler, Close Assistant, Disbursement Forecaster | FIN | None |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-035 | The system shall hold each agent with an id, name, job, owning module, on or off and level. | - | M | I | Partial | 05-shared.js agents; 67b-agents.js seedAgents |
| REV-FR-036 | The system shall run all agents of all modules on one framework. | - | M | I | Planned | - |
| REV-FR-037 | A run shall record the agent, starter, start time, level, status and every step with its tool, status, output, change and time. | - | M | T | Partial | 67b-agents.js startRun, advance; 69-budget-ai.js bStart; 66g-fin-fn6.js fStart |
| REV-FR-038 | The system shall hold a register of tools per agent, each of kind read, draft, propose, write or notify, and shall refuse a step whose tool the agent may not use. | - | M | T | Partial | 67b-agents.js TOOLS, advance |
| REV-FR-039 | No register of any module shall hold a tool that approves, changes an amount, signs, pays, awards or scores (BR-PLT-25, BR-PRC-34). | - | M | I | Partial | 67b-agents.js NOT_IN_REGISTER |
| REV-FR-040 | The system shall apply BR-REV-08 to every agent. | - | M | T | Partial | 67b-agents.js wrLevel, ntLevel, drLevel |
| REV-FR-041 | A run shall stop at each step that writes or notifies, shall show what will change before and after, and shall wait for a person. | - | M | T | Partial | 67b-agents.js runView; 69-budget-ai.js INTEL.bagents |
| REV-FR-042 | The person shall be able to approve a step, edit its value and approve, or skip or reject it. | - | M | T | Partial | 67b-agents.js decide; 66g-fin-fn6.js FIN_ASK_RUN.frun |
| REV-FR-043 | The system shall apply BR-REV-09 and shall have no action that approves more than one step. | - | M | T | Partial | 67b-agents.js canApprove; 69-budget-ai.js bCanApprove |
| REV-FR-044 | An approved step shall run the module's normal action, with its authority, duty and business checks. The prototype writes the record directly. | - | M | T | Planned | - |
| REV-FR-045 | The system shall let a person stop a running or waiting run with a reason of at least 10 characters. Remaining steps shall not run, and approved steps shall stay in effect. | - | M | T | Partial | 82-intel-crud.js agRun; 66g-fin-fn6.js FIN_ASK_RUN.frun; sweep Finance walk checks a stop |
| REV-FR-046 | The system shall add a waiting step to My Work of the people who may decide it. | - | S | T | Partial | 67b-agents.js famTasks |
| REV-FR-047 | The system shall record the seconds before each decision, and shall show the median and the count under BR-REV-10. | - | S | T | Partial | 67b-agents.js PROC.agents |

### AI governance {#rev-fr-govern}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-048 | The system shall list the agents with their switch, uses this month and last run. | - | S | D | Partial | 44b-intel-tabs.js INTEL.agents |
| REV-FR-049 | The system shall let the role the tenant names switch an agent on or off, shall require a reason of at least 5 characters (proposal), shall write an audit entry, and shall notify the auditor. | - | M | T | Partial | 44b-intel-tabs.js INTEL_BIND.agents |
| REV-FR-050 | The system shall let that role set an agent's level within BR-REV-08, with a reason of at least 5 characters, and shall notify the auditor. | - | M | T | Partial | 67b-agents.js data-aglset |
| REV-FR-051 | The system shall show AI use for the month, the share of answers with sources, the count declined and the response time measured at the gateway. | - | S | T | Partial | 44b-intel-tabs.js INTEL.agents |
| REV-FR-052 | The system shall show the AI activity log with time, agent, user, action, target, source count and outcome, newest first, and the latest 40 rows without a filter. | - | M | T | Partial | 44b-intel-tabs.js INTEL.agents |

> [!WARN] The governance page shows values that are not measured. The response time 4.2 seconds is fixed text, "uses this month" adds a seeded count to the whole log, "declined beyond permissions" counts every failed step, and the chip "personal data masked" describes behaviour no code has. Each must be measured or removed before a production release. REV-FR-051 stays Partial until then.

### Cross-module agendas {#rev-fr-agenda}

The module overview gives this module the agendas. The only agenda in the code is the budget committee's, which belongs to Budget. The rows below are therefore a proposal with no prototype, and OI-REV-07 asks whether the product needs them.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-FR-053 | The system shall let the executive office create an agenda with a title and a meeting date, and add items that link to open records of any module the user may read. | - | C | T | Planned | - |
| REV-FR-054 | The system shall let the user record a decision on each item with an owner and a due date, which shall create a task through Platform and shall change no record of the source module. | - | C | T | Planned | - |
| REV-FR-055 | The system shall produce the agenda and its record of decisions as a document through the platform document service. | - | C | D | Planned | - |

## Data requirements {#rev-data}

The prototype holds these records in browser memory. The SDS sets the physical tables. Scores, bands and KPI values are computed when read and are not stored as records of their own.

| Record | Main attributes | Personal data |
| --- | --- | --- |
| Anomaly | id, kind, unit, risk, status, t, vendor, recs, detail, note, reopened | A supplier's name, which may be a natural person |
| Agent | id, on, uses, name, what; level in agentLevels | None |
| Run | id, agent, target, by, t, level, status, ptr, steps, memo, cancelled or stopped | Starter, deciders |
| Step | tool, status, out, change, value, at, ms, decidedBy, decidedMs | Decider |
| AI log entry | t, agent, user, action, target, sources, ok, ver | User; in the prototype also typed text in the target |
| Agenda, item, decision | Proposal; none in the code | Owner of a decision |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-DR-001 | The system shall keep each run with its steps, changes and deciders for the period of the AI activity log class in the PLT retention table. | - | M | T | Planned | - |
| REV-DR-002 | The system shall keep each anomaly's evidence and every earlier result. | - | M | T | Partial | 82-intel-crud.js anDone |
| REV-DR-003 | Every view this module shows shall be rebuildable from the records of the owning modules (XC-DAT-001). | - | M | I | Planned | - |
| REV-DR-004 | The AI activity log shall hold a reference to the target and no typed text, so that it holds no personal data. The prototype keeps the first 60 characters of the question. | - | M | T | Planned | - |
| REV-DR-005 | The system shall classify the personal data in the table above in the platform's records of processing. | PDPA 39 | M | I | Planned | - |
| REV-DR-006 | An agenda item shall store a reference to its source record and no copy of it. | - | C | I | Planned | - |

## State rules {#rev-states}

State names are the values in the code, except the agenda, which is a proposal.

| Anomaly status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| new | Waiting for review | explained; escalated | The auditor records a note |
| explained | Closed with an explanation | new | The auditor reopens it with a reason |
| escalated | Sent for further audit; the executive and Finance are told | new | The auditor reopens it with a reason |

| Run status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| running | Working through its steps | waiting; done; stopped; cancelled | A step needs a person; the last step ends; a blocked step in Budget and Finance, or a person stops it; a person cancels it |
| waiting | Stopped at a step for a person | running; stopped; cancelled | A person decides; a person stops or cancels it |
| done | Finished, final | - | - |
| stopped | Ended early, final | - | - |
| cancelled | Ended early with a reason, final | - | The Budget engine uses this state. The framework keeps one of the two (OI-REV-01) |

| Step status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| pending | Not reached | done; suggested; await; blocked; skipped; stopped | The run reaches the step and applies the level |
| await | Waiting for a person | approved; edited; rejected; skipped; stopped | A person decides, or the run stops |
| done | Read or drafted, final | - | - |
| suggested | Shown only, because of the level, final | - | - |
| approved, edited | Applied after a person decided, final | - | - |
| rejected, skipped | Not applied, final | - | - |
| blocked | Could not run, final. Procurement goes on to the next step, Budget stops the run | - | - |
| stopped | The run ended first, final | - | - |

| Agenda status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| draft | Being prepared | issued; deleted | The owner issues it; the owner deletes it |
| issued | Sent to the participants | closed | The meeting's decisions are recorded |
| closed | Finished, final | - | - |

## Interface requirements {#rev-interfaces}

This module has no external connection of its own. The model provider sits behind the platform gateway. In the prototype every module is one set of global functions, so all interfaces below are direct reads.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-IR-001 | The system shall read allocation lines, monthly plans, reservations and commitments from Budget. | - | M | T | Partial | 47d-alloc-b4.js bal; 80-live-year.js liveDash |
| REV-IR-002 | The system shall read payments per line from Finance. | - | M | T | Partial | 80-live-year.js lineActual |
| REV-IR-003 | The system shall read open cases, contracts and phases from Procurement. | - | S | T | Partial | 30b-home-v2.js homeStats |
| REV-IR-004 | The system shall read the project id and its links from Projects. | - | C | T | Planned | - |
| REV-IR-005 | Every model call of this module shall pass through the gateway with the tenant, user and feature (XC-AI-001, PLT-CR-008). | - | M | T | Planned | - |
| REV-IR-006 | Tasks and notices of this module shall go through the platform interface (PLT-IR-003). | - | M | T | Partial | 00-core.js notify; 30-home.js myTasks |

## Non-functional requirements specific to Review and analytics {#rev-nfr}

This module meets all rows of the cross-cutting chapter, and they are not repeated here. The quality targets below come from chapter 9.5 of the Solution Design, which calls them proposals.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-NFR-001 | At least 98 percent (proposal) of numeric answers shall be correct on a test set of questions with certified answers. | - | M | T | Planned | - |
| REV-NFR-002 | Every answer with figures shall cite a source (proposal: 100 percent), measured automatically. | - | M | T | Planned | - |
| REV-NFR-003 | An assistant answer shall take at most 10 seconds at the 90th percentile (proposal), measured at the gateway. | - | S | T | Planned | - |
| REV-NFR-004 | At least 50 percent (proposal) of anomalies shall be ones the auditor finds worth checking, measured from recorded results. | - | C | A | Planned | - |
| REV-NFR-005 | Before an agent or the assistant is enabled for a tenant, an adversarial test shall show that text in documents cannot instruct it and that it cannot read beyond the user's rights (BR-REV-11, BR-REV-12). | - | M | T | Planned | - |
| REV-NFR-006 | Every simulated AI behaviour shall be labelled on screen, and no simulation shall exist in a production tenant (XC-AI-011). | - | M | I | Partial | 67b-agents.js PROC.agents notice |
| REV-NFR-007 | The same data shall give the same band, score and grade. | - | S | T | Partial | 48-performance.js projScore |
| REV-NFR-008 | Every switch, level change, run start, step decision and anomaly decision shall write an audit entry with actor and item. | - | M | T | Partial | audit() calls in 44b, 44c, 67b, 82 |
| REV-NFR-009 | Each dashboard and card shall show the date of its data. | - | S | D | Partial | 47d-alloc-b4.js MON_PANELS.live |

### Design and implementation constraints {#rev-cr}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| REV-CR-001 | Review shall reach other modules only through their published interfaces, and no module shall depend on it (ADR-0002). | - | M | I | Planned | - |
| REV-CR-002 | Review shall hold no approval, payment or legal decision, and shall change no record of another module. | - | M | I | Partial | 44b-intel-tabs.js wi-send, notice only |
| REV-CR-003 | Bands, weights and thresholds shall be tenant settings within a stated range, and no such number shall be fixed in a screen. | - | S | I | Planned | - |
| REV-CR-004 | No simulated value shall be shown as a measured value. | - | M | I | Partial | 44b-intel-tabs.js marks 4.2 as sample |

## Test evidence {#rev-tests}

A Prototyped row rests on a specific check in `tests/sweep.js`. No row in this chapter reaches that level. The check below covers part of one row, and round C4 of the sweep, which shows the dashboard reads the live year, supports BGT-FR-133. The author read these checks and did not run them for this version.

| Sweep check | What it asserts | Related requirements |
| --- | --- | --- |
| Finance walk FC6 | A Finance agent run stopped with a reason ends as stopped and records the stop | REV-FR-045, in part |

The sweep also opens the dashboard tabs, the scorecard, the governance tab and the drawers of saved scenarios, closed anomalies and agent runs, and it starts every Budget and Finance agent, and it fails on a thrown error or broken text such as `undefined`. The chat suite asks every agent 12 sample questions and checks the text only. That proves pages render and does not prove behaviour, so those rows stay Partial. No sweep check decides an anomaly, starts a Procurement agent, approves a step, tests a refusal by the assistant, tests a level, or switches an agent off.

## Open issues of Review and analytics {#rev-open}

| Issue | Question | Needed from | Effect on this chapter |
| --- | --- | --- | --- |
| OI-REV-01 | Three engines differ: a blocked step stops a Budget or Finance run and not a Procurement run, only Procurement has levels and a tool check, and only Budget and Finance take a reason to stop. Which behaviour does the one framework keep? | Technical lead, product owner | REV-FR-036 to REV-FR-045, state rules |
| OI-REV-02 | Who switches agents and sets levels? The code says the executive, and XC-AI-002 says an administrator of the tenant opts in | Product owner, data protection officer | REV-FR-049, REV-FR-050 |
| OI-REV-03 | The seed has every agent on, `agentOn` treats an unknown agent as on, and the general assistant has no switch at all, which differs from ADR-0016 and XC-AI-002. The seed and default must change | Development team | REV-FR-034, REV-FR-049 |
| OI-REV-04 | May AG-12 at level L3 create tasks and notices with no person, given BR-PLT-25 and ADR-0016? | Product owner | BR-REV-08, REV-FR-040, BR-PRC-34, PRC-FR-187 |
| OI-REV-05 | May AG-03 write round 2 amounts after a person approves, given BR-PLT-25 says AI never changes amounts? | Product owner, Planning | REV-FR-039, the Budget chapter |
| OI-REV-06 | Ranges of the bands, score weights, grade limits and anomaly risk limit | Planning, auditor | BR-REV-05 to BR-REV-07, REV-CR-003 |
| OI-REV-07 | Does the product need cross-module agendas, and does the project scorecard belong here or in Budget? | Product owner | REV-FR-053 to REV-FR-055, REV-FR-010 |
| OI-REV-08 | The rules and thresholds of each anomaly kind, who sees them, and how long a unit has to explain. The design gives 500,000 baht as an example only | Auditor, procurement specialist | REV-FR-022, REV-FR-027 |
| OI-REV-09 | Which forecast of spending is the official figure? | Product owner, head of finance | REV-FR-019 |
| OI-REV-10 | The design names a vector store for rules and documents, and no ADR covers one | Technical lead | REV-FR-032 |
| OI-REV-11 | Confirm the quality targets, which the design only proposes | Product owner | REV-NFR-001 to REV-NFR-004 |
| OI-REV-12 | May an anomaly's supplier name go to a model at all, since it may be a natural person? | Data protection officer | REV-DR-005, REV-FR-030 |

The design documents and the code differ in the following places. The code says what exists, the design says what is intended, and each difference is carried by the row named.

| Topic | Design | Code | Row |
| --- | --- | --- | --- |
| AI default | Off until a tenant opts in (ADR-0016) | Every agent seeded on | XC-AI-002 |
| Tools | Read-only tools, and no tool that writes (Solution Design 9.4) | Write and notify tools exist behind an approval | REV-FR-038 |
| Who decides a level | ADR-0016 sets a per-tenant policy | The executive sets it on the page | REV-FR-050 |
| Data rights | Tools use the user's token | Answers read everything | REV-FR-031 |
| Anomaly source | A daily agent run | A seeded list | REV-FR-022 |
| Number source | Tools over a data mart with a semantic layer | Only Procurement has a KPI list; dashboards compute their own | REV-FR-014 |
| Model use | Agents plan with a model | Fixed templates, as decision D-P09 records | REV-FR-037 |
| Family agents | AG-09 is a cash forecast agent | AG-22 does this and AG-09 is not used | REV-FR-035 |
| Executive dashboard time | Solution Design proposes 5 seconds at the 90th percentile | XC-PER-003 proposes 2 seconds at the 95th percentile, and that row governs | XC-PER-003 |

## Status summary {#rev-status}

The statuses in this chapter come from reading the code and the tests. The sweep was not run for this version, and nothing here is production code. Planned rows cover what looks across modules, what makes AI safe in production, and the agendas. Most Partial rows have working code and a page-open sweep only.

{{status-summary: prefix=REV}}
