# Module: Projects {#prj}

## Purpose and scope {#prj-purpose}

The project registry gives each project one id across the budget cycle. It joins the records that Budget, Procurement and Finance already hold, so a user can follow one project from the budget request to carry-over on one page. It also exchanges data with a project management system (the PM system) that a tenant runs, and it governs data shared with other systems and outside bodies.

The module was built in round 64 and lives in `95-projects.js`. Every value that belongs to one agency is a tenant setting in `PRJ_CFG[org]`, and the settings section below lists them. Tenant data files are never a source of requirements, so this chapter was read from `95-projects.js`, its checks in `tests/sweep.js` and the round 64 section of the handoff. The Solution Design document has no chapter on the registry.

| Component | State in the prototype | Evidence |
| --- | --- | --- |
| Register, cycle and Project 360 | Built; figures are read on each render | Sweep opens every project and step, and checks the id on each project page |
| Exchange out to the PM system | Built with a person pressing send; nothing leaves the prototype | Sweep walk of an outage and a resend |
| Exchange in from the PM system | A scripted feed of 4 messages | Sweep walk: every message acknowledged |
| Data sharing and send log | Built as records only; no data set is produced | Sweep walk of one external approval |
| Module and duty map | Built, and shown only to a tenant with a map | Page-open sweep only |

Outside this chapter: allocation lines, transfers, allotments, budget requests and carry-over (BGT), plans, cases, contracts and acceptance (PRC), payments, other commitments and GFMIS (FIN), and roles, audit, tasks, the exception centre and the interface status page (PLT). Security, performance, availability and accessibility are in the cross-cutting chapter. The registry reads these records and never changes them.

## Actors {#prj-actors}

| Actor | Role in the registry | Prototype role |
| --- | --- | --- |
| Staff who read | Open the cycle, the register and Project 360 | Every role except `vendor` |
| Planning officer | Owns steps 1 to 3; sends to the PM system; sends data to active consumers; is the named asker of an external share | `plan` |
| Finance officer | Owns steps 3 to 8; sends as Planning does; receives PM messages and acknowledges them | `fin` |
| Other acknowledgers | May acknowledge a PM message | `finhead`, `proc`, `prochead` |
| Executive | Approves an external consumer with a reason | `exec` |
| Administrator | Sends as Planning does; in production keeps the registry settings | `admin` |
| PM system (external) | Receives 12 items per project, reports 4 dimensions back | Simulated |
| Data consumers | Internal or external receivers named in tenant settings | Tenant setting; nothing is sent |

## Use cases {#prj-usecases}

The table replaces a use case diagram. Each use case names the actor who starts it, what starts it and what is true afterwards.

| ID | Name | Actor | Trigger | Outcome |
| --- | --- | --- | --- | --- |
| UC-PRJ-01 | See the budget cycle | Any staff | A user wants to know where projects stand | Counts and amounts per step are shown, and a step lists its projects |
| UC-PRJ-02 | Find a project | Any staff | A user has an id, a name, a unit or a GFMIS code | The project is listed |
| UC-PRJ-03 | Follow one project | Any staff | A project is opened | All 8 steps show with their evidence and links |
| UC-PRJ-04 | Send to the PM system | Planning, Finance, administrator | A project is new or changed | The PM system holds the current 12 items |
| UC-PRJ-05 | Ride out an outage | Planning, Finance, administrator | The PM system is down | Items wait in the buffer and go out when it returns |
| UC-PRJ-06 | Handle a PM message | Finance officer | A message arrives | The message is acknowledged, and any budget effect is handled in its own module |
| UC-PRJ-07 | Send to a data consumer | Planning, Finance, administrator | A consumer is due data | The send is in the log |
| UC-PRJ-08 | Approve an external consumer | Executive | An outside body asks for data | The consumer is active and the approval is in the log |
| UC-PRJ-09 | Clear exchange exceptions | Planning, Finance | A project is held, changed or not current | The item is opened where it is fixed |
| UC-PRJ-10 | Set up the registry | Administrator | A tenant starts or its PM system changes | Settings match the tenant |
| UC-PRJ-11 | Read the module and duty map | Any staff | The tenant has a map | Each duty opens the page that supports it |

## Business rules {#prj-rules}

The Source column names the function or page rule in `95-projects.js`. The last column says where a rule can be configured. A value marked as a proposal is fixed in the prototype, and the range is for the product owner to confirm.

| ID | Rule | Source | Setting and allowed range |
| --- | --- | --- | --- |
| BR-PRJ-01 | One project has one id, joined to every step. The GFMIS code is shown beside it and is never the key, because that code changes with transfers and restructuring | Register page | Tenant: `prefix`, default `PRJ` |
| BR-PRJ-02 | Budget, commitment, payment and step are read from the owning modules. The registry holds no second copy and nobody types them twice | prjList | Fixed in code |
| BR-PRJ-03 | The current step comes from the records: a request is step 2 once approved and step 1 before that; a carry-over is step 8; a line is step 3, step 4 with an approved allotment, step 5 with a commitment, step 6 with an accepted phase, and step 7 once paid when it is accepted, routine or has no contract | prjList | Fixed in code |
| BR-PRJ-04 | The annual amount is the line amount plus approved transfers in, less approved transfers out. Pending transfers do not count | prjList | Fixed in code |
| BR-PRJ-05 | Committed is the signed contracts on the line plus its other Finance commitments less released amounts, the same figure the line ledger shows | prjList; PRC-IR-007 | Fixed in code |
| BR-PRJ-06 | Paid is the higher of the GFMIS disbursement of the line and the approved payments on its contracts, because the monthly GFMIS figures lag approved payments by a few days | prjList | Fixed in code |
| BR-PRJ-07 | A project is routine when its budget type is personnel, or when it has no plan item and no contract and does have another commitment. Routine spending needs no procurement and is not tracked in the PM system | prjList | Fixed in code |
| BR-PRJ-08 | The exchange covers the lines in the tenant scope, or every investment line when the tenant sets none. Requests and carry-overs are not exchanged | prjList | Tenant: `pmScope` |
| BR-PRJ-09 | The PM system owns physical and engineering progress. Fisko owns budget, commitment and payment. Nothing is typed in both | Exchange rules on the page | Fixed in code; tenant wording in `pmNote` |
| BR-PRJ-10 | A project sent earlier counts as changed when any of its 12 items differs from what was sent | prjOut, prjHash | Fixed in code |
| BR-PRJ-11 | When the PM system is down, data waits in the buffer and is never lost | Exchange rules on the page | Fixed in code |
| BR-PRJ-12 | PM data is not current when the last update is more than 14 days old | prjPmIn | Fixed at 14 in the code. Proposal: tenant `staleDays`, 1 or more, default 14 |
| BR-PRJ-13 | A PM message is recorded and acknowledged. It changes no budget, commitment or payment. Any such change runs in the owning module under its own rules | `data-pmapply` handler | Fixed in code |
| BR-PRJ-14 | An external consumer starts as pending. It becomes active only when the executive approves with a reason of at least 10 characters | `data-shareok` handler | Fixed in code; consumers are tenant data |
| BR-PRJ-15 | Every send is recorded in a log that cannot be edited or deleted | Sharing principles on the page | Fixed in code |
| BR-PRJ-16 | Step owners come from the tenant organization chart: the units of its primary planning user and primary finance user | prjOwnUnit | Tenant: organization chart |
| BR-PRJ-17 | The register, every share and every report state the time of the latest GFMIS data | prjAsOf | Fixed in code |
| BR-PRJ-18 | Anything that belongs to one agency is a tenant setting. Code never branches on a tenant | `95-projects.js` header | See the next table |

### Tenant settings {#prj-settings}

These are the fields of `PRJ_DEF`, which `PRJ_CFG[org]` overrides. A tenant data file sets them today and no screen exists. The defaults below are the neutral values in the code.

| Setting | Meaning | Default | Allowed range | In production |
| --- | --- | --- | --- | --- |
| `prefix` | First part of the project id | `PRJ` | Proposal: 2 to 6 capital letters or digits; fixed once the first id is issued | Tenant setting |
| `pmName`, `pmShort`, `pmRef` | Names of the PM system, in Thai and English | A generic name | Text in both languages | Tenant setting |
| `hubName`, `aiName` | Names of the data warehouse and the budget AI shown on pages | A generic name | Text in both languages | Tenant setting |
| `userUnits` | Number of user units shown on the cycle page | Empty: the units in the organization chart | Whole number of 1 or more, or empty | Drop it and count the chart |
| `pmScope` | Lines exchanged with the PM system | Empty: every investment line | Lines of the tenant | A rule plus a flag on the project |
| `multi` | Lines that are multi-year commitments | None | Lines of the tenant | Read from Budget |
| `loc` | Area and target of a line | None; area shows as head office | Text in both languages, a number and a unit | Fields on the project |
| `consumers` | Who receives shared data: id, kind, name, data sets, channel, status, and a pending request | None | Kind `int` or `ext`; status `active` or `pending` | Records with their own screen |
| `pmNote` | The tenant wording of its exchange scope rule | None | Text in both languages | Tenant setting |
| `feed` | Wording of the scripted PM messages | None | Prototype only | Does not exist |
| `modules`, `duties` | The tenant module and duty map | None; the page stays out of the menu | Module status `tor`, `ext` or `new` | Optional tenant records, OI-PRJ-11 |

## Functional requirements {#prj-fr}

Each status rests on reading the code and the sweep. A page-open check is not enough for Prototyped, so most rows are Partial.

### Project register {#prj-fr-register}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-001 | The system shall give a project id in the form prefix, two-digit fiscal year and four-digit number to each allocation line, budget request and carry-over. | - | M | T | Prototyped | 95-projects.js prjLineNo |
| PRJ-FR-002 | The system shall keep the same project id when a request becomes an allocation line and when a line becomes a carry-over. | - | M | T | Planned | - |
| PRJ-FR-003 | The system shall never reuse a project id. | - | M | T | Planned | - |
| PRJ-FR-004 | The system shall show the GFMIS budget code beside the project id, and shall not join any record on that code. | - | M | I | Partial | 95-projects.js prjGf, prjTable |
| PRJ-FR-005 | The system shall list each project with id, GFMIS code, name, unit, budget kind, current step, amount, committed, paid and PM send state. | - | M | D | Partial | 95-projects.js prjTable |
| PRJ-FR-006 | The system shall filter the register by fiscal year and search it by id, GFMIS code, source reference, name and unit. | - | S | T | Partial | 95-projects.js VIEWS prj-registry |
| PRJ-FR-007 | The system shall show the number of projects, the number exchanged, and the budget and paid totals of the current fiscal year. | - | S | D | Partial | 95-projects.js VIEWS prj-registry |
| PRJ-FR-008 | The system shall mark the project of a cancelled line, or of a rejected or withdrawn request, as ended, and shall leave it out of the totals. | - | S | T | Prototyped | 95-projects.js prjList ended |
| PRJ-FR-009 | The system shall label each project single-year, multi-year or carry-over, and shall take multi-year from the Budget record. | - | S | T | Partial | 95-projects.js prjList kind; PRJ_CFG multi |
| PRJ-FR-010 | The system shall set the work type from the procurement kind of the case, otherwise routine for routine spending, construction for an investment line and services for the rest. | - | C | T | Partial | 95-projects.js prjList wtype |
| PRJ-FR-011 | The system shall show the roles `div` and `divhead` only the projects of their own unit. | - | M | T | Planned | - |

### The 8-step cycle {#prj-fr-cycle}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-012 | The system shall show the 8 steps of the budget cycle, each with its name, owner and exchange point: budget request, Appropriation Act, allotment and transfers, procurement, commitment, acceptance, disbursement, carry-over and lapse. | - | M | D | Partial | 95-projects.js PRJ_CYCLE |
| PRJ-FR-013 | The system shall derive the current step of a project under BR-PRJ-03 at each read. | - | M | T | Partial | 95-projects.js prjList step |
| PRJ-FR-014 | The system shall count a phase as accepted for BR-PRJ-03 only when Procurement holds it as accepted, and a delivered phase alone shall not count. | - | M | T | Prototyped | 95-projects.js prjList phaseAccepted |
| PRJ-FR-015 | The system shall show the owner of each step from the organization chart under BR-PRJ-16, with a generic label when the chart has no such user. | - | S | T | Partial | 95-projects.js prjOwnUnit |
| PRJ-FR-016 | The system shall show the number of projects and their amount at each step, and at step 8 the amount less what was paid. | - | S | D | Partial | 95-projects.js VIEWS prj-cycle |
| PRJ-FR-017 | The system shall list the projects of a chosen step, and shall link to the page where that step is done when the role may open it. | - | S | D | Partial | 95-projects.js VIEWS prj-cycle, pJump |

### Project figures {#prj-fr-figures}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-018 | The system shall compute the annual amount under BR-PRJ-04, so that approving a transfer changes the amount of both lines. | - | M | T | Prototyped | 95-projects.js prjList annual; sweep round 64 |
| PRJ-FR-019 | The system shall compute committed under BR-PRJ-05 and shall count no draft contract. | - | M | T | Prototyped | 95-projects.js prjList bal |
| PRJ-FR-020 | The system shall compute paid under BR-PRJ-06. | - | M | T | Partial | 95-projects.js prjList paid |
| PRJ-FR-021 | The system shall mark routine spending under BR-PRJ-07 and shall show that it needs no procurement. | - | S | T | Partial | 95-projects.js prjList routine, prjTimeline |
| PRJ-FR-022 | The system shall state the date and time of the latest GFMIS data on the register and on the sharing page. | - | M | D | Partial | 95-projects.js prjAsOf |

### Project 360 {#prj-fr-360}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-023 | The system shall open one page for every project, showing its id. | - | M | T | Prototyped | 95-projects.js VIEWS prj-project; sweep round 64 |
| PRJ-FR-024 | The page shall show the name, GFMIS code, unit, budget kind, work type, budget, committed, paid and current step. | - | M | D | Partial | 95-projects.js VIEWS prj-project |
| PRJ-FR-025 | The system shall show each of the 8 steps as done, current or to come, with its evidence and a link to the owning page. | - | M | D | Partial | 95-projects.js prjTimeline |
| PRJ-FR-026 | The system shall show the budget request that an allocation line came from at step 1. | - | S | T | Planned | - |
| PRJ-FR-027 | The system shall show every plan item, case and contract of a project. | - | M | T | Partial | 95-projects.js prjTimeline; first plan item and case only |
| PRJ-FR-028 | For a project in the exchange scope, the page shall show the 12 items, the send state and the last send. For any other project it shall say why it is not exchanged. | - | S | D | Partial | 95-projects.js VIEWS prj-project |
| PRJ-FR-029 | For a project in scope with a contract, the page shall show the 4 dimensions received, and shall mark them not current under BR-PRJ-12. | - | S | D | Partial | 95-projects.js prjPmIn |

### Exchange out to the PM system {#prj-fr-out}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-030 | The system shall exchange only the projects in scope under BR-PRJ-08. | - | M | T | Partial | 95-projects.js prjList pm |
| PRJ-FR-031 | The system shall send 12 items per project, keyed by the project id: project id, GFMIS code, name in the Act, target, annual amount, budget kind, fiscal year, responsible unit, work type, area, approval status and date, and allotment received. | - | M | T | Partial | 95-projects.js prjOutFields |
| PRJ-FR-032 | The system shall show each project in scope as new, sent, changed or queued. | - | M | T | Partial | 95-projects.js prjOut, PRJ_OUT |
| PRJ-FR-033 | The system shall mark a sent project as changed under BR-PRJ-10, and an approved transfer on its line shall do so. | - | M | T | Prototyped | 95-projects.js prjHash, prjOut; sweep round 64 |
| PRJ-FR-034 | The system shall show a marker on the annual amount while a transfer on the line is pending, and shall not change the amount. | - | S | D | Partial | 95-projects.js prjOutFields |
| PRJ-FR-035 | The system shall send a project with no person acting when its allotment is approved and whenever its 12 items change. | - | M | T | Planned | - |
| PRJ-FR-036 | The system shall let a user send everything waiting in one action, after which each project shall show as sent. | - | M | T | Prototyped | 95-projects.js #pm-send; sweep round 64 |
| PRJ-FR-037 | The system shall limit sending to the roles `plan`, `fin` and `admin`. | - | M | T | Partial | 95-projects.js PM_ROLES |
| PRJ-FR-038 | While the PM system is down, the system shall hold projects in the buffer and shall not show them as sent. | - | M | T | Prototyped | 95-projects.js #pm-send; sweep round 64 |
| PRJ-FR-039 | When the PM system returns, the system shall send the held projects oldest first with no person acting. | - | M | T | Partial | 95-projects.js #pm-send; a person presses send |
| PRJ-FR-040 | The system shall alert the owners of a project by duty and area when its data is sent. | - | C | T | Planned | - |

### Exchange in from the PM system {#prj-fr-in}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-041 | The system shall receive messages in 4 dimensions (time, cost, quality and status), each keyed by the project id. | - | M | T | Partial | 95-projects.js prjFeed, #pm-recv; scripted |
| PRJ-FR-042 | On each message the system shall notify Finance, and shall give a task to the roles `fin`, `finhead`, `proc` and `prochead`. | - | S | T | Partial | 95-projects.js notify, myTasks |
| PRJ-FR-043 | The system shall let a finance officer acknowledge each message and shall record who did so and when. | - | M | T | Prototyped | 95-projects.js data-pmapply; sweep round 64 |
| PRJ-FR-044 | The system shall limit acknowledgement to the roles `fin`, `finhead`, `proc` and `prochead`. | - | M | T | Partial | 95-projects.js PM_APPLY |
| PRJ-FR-045 | The system shall show with each message the effect expected on budget work, and shall apply BR-PRJ-13. | - | M | T | Partial | 95-projects.js prjFeed eff, data-pmapply |
| PRJ-FR-046 | The system shall show the days extended, the value of change orders and the fixes done from acknowledged messages only. | - | S | T | Partial | 95-projects.js prjPmIn |
| PRJ-FR-047 | The system shall show plan and actual progress from what the PM system reports. | - | M | T | Planned | - |

### Data sharing {#prj-fr-share}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-048 | The system shall list the consumers of a tenant with name, kind, data sets, channel and status. | - | M | D | Partial | 95-projects.js VIEWS prj-share |
| PRJ-FR-049 | The system shall let the roles `plan`, `fin` and `admin` send data to an active consumer, and shall add a row to the send log. | - | M | T | Partial | 95-projects.js data-share |
| PRJ-FR-050 | The system shall refuse a send to a consumer that is not active. | - | M | T | Partial | 95-projects.js row; the button is hidden |
| PRJ-FR-051 | The system shall refuse to approve an external consumer with no reason, and on approval shall set it active and add a log row holding the reason and the approver. | - | M | T | Prototyped | 95-projects.js data-shareok; sweep round 64 |
| PRJ-FR-052 | The system shall refuse an approval reason shorter than 10 characters, and shall let only the executive approve. | - | M | T | Partial | 95-projects.js data-shareok, canApprove |
| PRJ-FR-053 | The system shall let Planning raise a request to share data with an external consumer, with a reason. | - | M | T | Planned | - |
| PRJ-FR-054 | The system shall refuse approval by the person who raised the request. | - | M | T | Planned | - |
| PRJ-FR-055 | The system shall let a permitted user end a consumer with a reason, and no further send shall reach it. | - | S | T | Planned | - |

### Workspace {#prj-fr-work}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-056 | The system shall put each pending external consumer in the approvals of the executive. | - | S | T | Partial | 95-projects.js myTasks |
| PRJ-FR-057 | The system shall list in the exception centre each project held in the buffer, changed and not sent, or not current, with severity, owner, date and a link. | - | S | T | Partial | 95-projects.js exceptionItems |
| PRJ-FR-058 | A held project shall be severe while the PM system is down, and a warning once it is back. | - | C | T | Partial | 95-projects.js exceptionItems |
| PRJ-FR-059 | The system shall show in the menu the number of projects waiting, messages unacknowledged and external consumers pending. | - | C | D | Partial | 95-projects.js renderNav |

### Module and duty map {#prj-fr-map}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-060 | For a tenant with a map, the system shall show each module with its status of in the terms of reference, to extend or to add, its reference and its page. | - | C | D | Partial | 95-projects.js VIEWS prj-tor |
| PRJ-FR-061 | The system shall list duties with their modules, shall mark duties done in GFMIS or e-GP, and shall filter by all, marked and planned systems. | - | C | D | Partial | 95-projects.js VIEWS prj-tor |
| PRJ-FR-062 | The system shall keep the page out of the menu for a tenant with no map. | - | C | T | Partial | 95-projects.js renderNav |

### Settings {#prj-fr-settings}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-FR-063 | The system shall hold the settings in the table above per tenant and shall apply the neutral default for any setting left empty. | - | M | T | Partial | 95-projects.js prjCfg, PRJ_DEF |
| PRJ-FR-064 | The system shall let the administrator change the settings on a screen, within the allowed ranges, and shall record each change. | - | S | T | Planned | - |
| PRJ-FR-065 | The system shall use the tenant name of the PM system in every message, notice and audit entry. | - | S | I | Partial | 95-projects.js pmN; audit and notice text fixes the words |

## Data requirements {#prj-data}

The registry stores little. Field names below are those of the code. Project rows are built from other modules on each read, and only the exchange and sharing state is kept, in `S.prj`.

| Record | Fields | Personal data |
| --- | --- | --- |
| Project (derived) | id, fy, src, ref, name, unit, type, amount, base, paid, committed, step, routine, pm, gf, kind, wtype, loc | None |
| Send state | out[project]: h, t, st | None |
| Received message | inb: id, t, dim, prj, text, eff, days, amount, applied, by | The person who acknowledged |
| Send log row | log: t, to, rows, asOf, by, ok, why | Sender and approver; a reason may name a person |
| Consumer state | cons[consumer] | None |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-DR-001 | The system shall store each project id with links to its budget requests, allocation lines and carry-overs, and an id shall outlive any one of them. | - | M | T | Planned | - |
| PRJ-DR-002 | The system shall keep no amount, step or status as a source of truth in the registry. A copy kept for lists shall be rebuildable from the owning modules. | - | M | I | Partial | 95-projects.js prjList |
| PRJ-DR-003 | The system shall refuse any edit or deletion of a send log row. | - | M | T | Partial | 95-projects.js; no delete action exists |
| PRJ-DR-004 | Each send log row shall hold the time, receiver, number of rows, the time of the latest GFMIS data, the sender and, for an approval, the approver and reason. | - | M | T | Prototyped | 95-projects.js log, prjGfT |
| PRJ-DR-005 | The system shall compare the 12 items in a form that does not depend on the display language. | - | M | T | Prototyped | 95-projects.js prjHash |
| PRJ-DR-006 | The system shall keep each PM message with its time received, and the person and time of its acknowledgement. | - | M | T | Partial | 95-projects.js inb |
| PRJ-DR-007 | A data set shared outside shall hold no personal data unless the data protection officer has approved that data set. | - | M | I | Planned | - |
| PRJ-DR-008 | The system shall apply a retention period to PM messages and send log rows as the tenant setting states. | - | S | I | Planned | - |

## State rules {#prj-states}

The 8 steps are derived and have no stored state, so a project can move back when a record changes, such as a contract draft being deleted. Names in the other tables are values in the code.

| Cycle step | Meaning | Owner | Reached when |
| --- | --- | --- | --- |
| 1 Budget request | A request for a coming year | Planning | A request exists and is not approved |
| 2 Appropriation Act | Waiting for the Act | Planning | The request is approved |
| 3 Allotment and transfers | A line exists | Planning and Finance | The line exists |
| 4 Procurement | Money may be used | Finance | The allotment is approved |
| 5 Commitment | Money is committed | Finance | A signed contract or other commitment exists |
| 6 Acceptance | Work is accepted | Finance | At least one phase is accepted |
| 7 Disbursement | Money is paid | Finance | Paid above zero, and accepted, routine or with no contract |
| 8 Carry-over and lapse | Money from an earlier year | Finance | The project is a carry-over |

| Send state | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| new | In scope and never sent | sent; queued | Send while online; send while offline |
| sent | Sent, and the 12 items match | changed | An item differs (BR-PRJ-10) |
| changed | Sent, and an item differs | sent; queued | Send while online; send while offline |
| queued | Waiting in the buffer | sent | Send after the PM system returns |

| Consumer status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| pending | External, waiting for approval | active | The executive approves with a reason |
| active | May receive data | - | The code has no way out; PRJ-FR-055 asks for one |

| Message state | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| Received (`applied` empty) | To act on | Acknowledged | A permitted role acknowledges it |
| Acknowledged (`applied` set) | Final | - | - |

## Interface requirements {#prj-interfaces}

The registry has no live external connection in the prototype. It links to Budget, Procurement and Finance by reading their records, and the allocation line is the shared key.

| Interface | Direction | Reads or carries | In the prototype |
| --- | --- | --- | --- |
| Budget | Internal, read | Lines, transfers, allotment, requests, carry-overs, GFMIS disbursement per line | Real within the prototype |
| Procurement | Internal, read | Plan items, e-GP stage, cases, contracts, phases | Real within the prototype |
| Finance | Internal, read | Other commitments, time of the latest GFMIS data, payments and their reconciliation | Real within the prototype |
| PM system | Out and in | 12 items out, 4 dimensions in | Simulated |
| Data consumers | Out | Data sets by channel | A log row only |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-IR-001 | The system shall read lines, approved and pending transfers, allotments, requests, carry-overs and GFMIS disbursement per line from Budget through its published interface (BGT-IR-005, BGT-IR-006). | - | M | T | Partial | 95-projects.js prjList |
| PRJ-IR-002 | The system shall read plan items, e-GP stage, cases, contracts and phases of a line from Procurement through its published interface, and shall treat contract and phase state as Procurement defines it. | - | M | T | Partial | 95-projects.js prjList, prjTimeline |
| PRJ-IR-003 | The system shall read other commitments, the time of the latest GFMIS data, and payment and reconciliation state from Finance through its published interface (FIN-IR-011). | - | M | T | Partial | 95-projects.js prjList, prjAsOf |
| PRJ-IR-004 | The system shall publish its PM interface as a versioned standard that any PM system can implement, with the project id as the only join key. | - | M | I | Planned | - |
| PRJ-IR-005 | The system shall reach the PM system through one adapter per tenant, under XC-INT-001 to XC-INT-006. | - | M | T | Planned | - |
| PRJ-IR-006 | The system shall refuse a PM message with an unknown project id, shall reject a client that is not the tenant PM system, and shall treat a repeated message as one. | - | M | T | Planned | - |
| PRJ-IR-007 | The system shall show the PM exchange on the interface status page, with direction, method, frequency, state, last run and record count. | - | S | D | Partial | 95-projects.js prjState integrations |
| PRJ-IR-008 | The system shall produce the data set of a consumer and deliver it by the channel named for that consumer. | - | M | T | Planned | - |
| PRJ-IR-009 | The system shall publish project id, links, step and figures to Review through a read-only interface (REV-IR-004). | - | S | T | Planned | - |

> [!OPEN] Each tenant must supply the transport, access and message limits of its PM system, and the product owner must confirm that Fisko can set the standard (OI-PRJ-03). Until then no adapter assumes a format.

## Non-functional requirements specific to Projects {#prj-nfr}

The registry meets all rows of the cross-cutting chapter, and they are not repeated here. This table adds only what is particular to it.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-NFR-001 | Every send, outage change, receipt, acknowledgement, share and share approval shall write an audit entry with actor and item. | - | M | T | Partial | 95-projects.js audit() calls |
| PRJ-NFR-002 | A figure on a registry list shall match the owning module within 60 seconds of a change (proposal). | - | S | T | Planned | - |
| PRJ-NFR-003 | Screens shall exist in Thai and English, and data sent to the PM system shall carry both names of a project. | - | S | D | Partial | 95-projects.js L() labels; Thai name only is sent |
| PRJ-NFR-004 | Simulated controls (the outage switch and the scripted feed) shall not exist in a production tenant. | - | M | I | Partial | 95-projects.js #pm-online, #pm-recv |
| PRJ-NFR-005 | The register, the cycle and Project 360 shall work for a tenant with no PM system and no consumers. | - | S | T | Planned | - |

### Design and implementation constraints {#prj-cr}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-CR-001 | Projects shall be a module of the monolith in ADR-0002, shall reach other modules only through their published interfaces, and no module except Review shall depend on it. | - | M | I | Planned | - |
| PRJ-CR-002 | Agency specifics shall live only in tenant settings, with no branch on a tenant in code (PLT-CR-007). | - | M | I | Partial | 95-projects.js PRJ_CFG, PRJ_DEF |
| PRJ-CR-003 | The system shall offer no way to enter physical progress in the registry. | - | M | I | Partial | 95-projects.js; no such form exists |
| PRJ-CR-004 | Fiscal years and dates shall come from the fiscal calendar and the records, and no year or date shall be fixed in code. | - | M | I | Prototyped | 95-projects.js |
| PRJ-CR-005 | Sample data and tenant module numbers shall not sit in generic code. | - | S | I | Partial | 95-projects.js PRJ_CYCLE mods |

## Test evidence {#prj-tests}

A Prototyped row rests on the round 64 section of `tests/sweep.js`, which runs in both organizations and both languages. The author read these checks and did not run them for this version.

| Sweep check | What it asserts | Related requirements |
| --- | --- | --- |
| Project pages | Every project opens, shows no broken text and shows its id | PRJ-FR-023 |
| Approved transfer | Approving a pending transfer on a line in scope marks a project changed | PRJ-FR-018, PRJ-FR-033 |
| Outage | A send while offline marks nothing as sent | PRJ-FR-038 |
| Back online | A send after the outage leaves every project sent | PRJ-FR-036 |
| PM feed | All scripted messages arrive, and a finance officer acknowledges each | PRJ-FR-043 |
| External approval | An empty reason adds no log row; a valid reason adds one row with the reason | PRJ-FR-051 |

The sweep also opens every cycle step, the exchange, sharing and map pages and the exception centre, and fails on a thrown error or broken text. That proves the page renders, so those rows stay Partial. No check switches the language after the first send, confirms a draft line, tests a role limit, or reads a figure against its owning module. XC-INT-004 rests on the same outage walk.

## Open issues of Projects {#prj-open}

| Issue | Question | Needed from | Effect on this chapter |
| --- | --- | --- | --- |
| OI-PRJ-01 | When is a project id issued: at a draft request, at a submitted request or at a line? Which fiscal year does the id carry after that? | Product owner | PRJ-FR-001, PRJ-FR-002 |
| OI-PRJ-02 | Can one project span several lines, and can projects be split or merged? The prototype assumes one line for one project in one year | Product owner, Planning | PRJ-DR-001, PRJ-FR-027 |
| OI-PRJ-03 | The PM interface: transport, access, message format, and whether a tenant PM system will follow a standard Fisko sets | Each tenant, product owner | PRJ-IR-004 to PRJ-IR-006 |
| OI-PRJ-04 | The cycle says contracts, changes and acceptance come from the PM system, while Procurement owns them in Fisko. Which system is the master when a tenant holds them in both? | Product owner, procurement specialist | BR-PRJ-09, PRJ-FR-041 |
| OI-PRJ-05 | Does an approval cover one external send or every later send to that consumer? The rule says approval comes first, and the code approves once per consumer | Executive sponsor, legal unit | BR-PRJ-14, PRJ-FR-049 |
| OI-PRJ-06 | Which law governs sharing with other agencies, and what legal basis applies? No clause is cited here because none could be confirmed (see OI-XC-08) | Legal unit, data protection officer | PRJ-DR-007, Clause column |
| OI-PRJ-07 | Confirm the proposals: `prefix` form, `staleDays` range, and the 60 seconds of PRJ-NFR-002 | Product owner | BR-PRJ-12, settings |
| OI-PRJ-08 | Retention of PM messages and the send log | Legal unit, product owner | PRJ-DR-008 |
| OI-PRJ-09 | The prototype builds the GFMIS code by joining a unit code and an activity code, as a placeholder. What is the real code, and where does it come from? | Comptroller General's Department, FIN author | PRJ-FR-004 |
| OI-PRJ-10 | The code gives the PM exchange the interface id IF-08, which the Solution Design gives to other message channels. Which id stands? | Product owner | PRJ-IR-007 |
| OI-PRJ-11 | Is a module and duty map a product feature, or does it end with the tenant acceptance? | Product owner | PRJ-FR-060 to PRJ-FR-062 |
| OI-PRJ-12 | Fix the id of a line created in the allocation form: the code reads a number from the id, gets none, and gives such lines the same broken project id Fixed in round 68. | Development team | PRJ-FR-001 |
| OI-PRJ-13 | Stop counting draft contracts as committed, and released amounts as still committed. Today a project can differ from the line ledger and can reach step 5 on a draft Fixed in round 68. | Development team | PRJ-FR-019 |
| OI-PRJ-14 | Make the send comparison independent of the language. Target and area are compared as display text, so switching language marks projects with those fields as changed Fixed in round 68. | Development team | PRJ-DR-005 |
| OI-PRJ-15 | Count a phase as accepted only on acceptance. The code also counts a delivered phase, in the step and in the accepted count on Project 360 Fixed in round 68. | Development team | PRJ-FR-014 |
| OI-PRJ-16 | Record the latest GFMIS time in the send log. The code records today Fixed in round 68. | Development team | PRJ-DR-004, BR-PRJ-17 |
| OI-PRJ-17 | Remove fixed years and dates, and sample log rows, from `95-projects.js`. The file fixes three fiscal years, the year-end date, a task due date and the opening send log Fixed in round 68. | Development team | PRJ-CR-004, PRJ-CR-005 |
| OI-PRJ-18 | The asker in the log is the first user of the asking role, and a cancelled line or a rejected request still shows as a live project Round 68 marks ended projects, leaves them out of the totals, and logs the asking role. A named asker needs PRJ-FR-053. | Development team | PRJ-FR-008, PRJ-FR-053 |

The design documents, page text and code differ in the following places. The code says what exists, and each difference is carried by the row named.

| Topic | Design or page text | Code | Row |
| --- | --- | --- | --- |
| The 8 steps | The Solution Design shows 8 steps from strategy to evaluation | 8 steps from request to carry-over | PRJ-FR-012 |
| One id | One id from request to carry-over | A new id per source record, built from that record id or its list position | PRJ-FR-002 |
| When data is sent | On approval and on every change | Only when a person presses send | PRJ-FR-035 |
| Alert on send | Owners are alerted by duty and area | No alert | PRJ-FR-040 |
| After an outage | Goes out in order when it is back | A person presses send, in list order | PRJ-FR-039 |
| Received progress | The PM system owns physical progress | Plan and actual percent come from Fisko contract phases | PRJ-FR-047 |
| Own data per unit | Every unit gets its own data back | Every role but the supplier sees every unit | PRJ-FR-011 |
| External approval | External sends need approval first | One approval per consumer; later sends need none | PRJ-FR-049 |
| Neutral defaults | The file holds only neutral defaults | Module numbers of one map sit in the file | PRJ-CR-005 |

## Status summary {#prj-status}

The statuses in this chapter come from reading the code and the tests. The sweep was not run for this version, and nothing here is production code. Planned rows are mostly what makes the registry a stored, automatic and unit-scoped service: the kept id, automatic sends, real exchange and real sharing.

{{status-summary: prefix=PRJ}}
