# Module: Budget {#bgt}

## Purpose and scope {#bgt-purpose}

Budget carries an agency through one budget cycle on one line of data. Staff link work to strategy, prepare requests, consolidate them against ceilings, take them through review and the committee, submit them to the Budget Bureau, follow the bill through parliament, turn the act into allocation lines, manage the year on those lines, and report results that feed the next year.

Three years run at once: last year closes its carry-over, this year spends, and next year is prepared. No production code exists yet, so this chapter was read from the prototype code and its sweep tests. Where the design documents ask for more than the code does, the row is Partial or Planned and the difference is listed under the open issues.

| Component | State in the prototype | Evidence |
| --- | --- | --- |
| Requests, review, committee, submission batches, parliament, lines from the act | Built, with action walks in the sweep | Sweep walks E2E and C3 |
| Allocation lines, transfers, releases, carry-over | Built; the main path of each has a walk, refusals have none | Sweep walk E2E |
| Live monitoring on allocation lines and the demo date | Built; the banner and the live year have checks | Sweep round C4 pass |
| Priority, 3R, zero-based, forward estimates, quarterly reports, cost per output, recommendations | Built, with no action walk | Page-open sweep only |
| AI assistant, budget agents, forecasts, what-ifs, signals | Rules and statistics only; no model is called | Agents started and shown; page-open sweep |
| e-Budgeting, BBL, BB EvMIS, GFMIS | Simulated; nothing leaves the prototype | `46-submission.js`, `79-sub-crud.js`, `80-live-year.js` |
| Central fund and supplementary budget requests, risk register per strategy, unit KPI proposals, non-budget money on a request | Not built | Design FR-B-05, FR-B-06, FR-B-18, FR-B-34 |

Outside this chapter: roles, the duty rule engine, delegation, the approval route, fiscal years, the calendar and the audit log (PLT); plans, requisitions and contracts (PRC); vouchers, payments and GFMIS records (FIN); the project registry (PRJ); cross-module review (REV); and security, performance, availability and accessibility (cross-cutting chapter). This chapter states only what Budget needs from them.

> [!LAW] Clause numbers of the Regulation on Budget Administration 2562 come from the design, which read the 2562 text. The design records a second amendment dated 2567 and did not read it, so any BMR clause here may have changed. The budget specialist must confirm every BMR row against the text in force (OI-BGT-02).

## Actors {#bgt-actors}

| Actor | Role in Budget | Prototype role |
| --- | --- | --- |
| Requesting unit staff | Proposes ideas, prepares and withdraws requests, replies to ceilings, reports progress and results for its own unit | `div` |
| Division director | Approves or returns the unit's requests before Planning; sees what the unit sees | `divhead` |
| Planning officer | Keeps strategy and KPIs, scores ideas, issues ceilings, reviews requests, runs meetings, batches and the bill, accepts reports | `plan` |
| Executive | Approves requests, target revisions, larger transfers and carry-over; chairs the committee | `exec` |
| Committee member | Votes on agenda items and abstains on the member's own unit | `committee`, plus `exec` and `fin` when listed |
| Finance officer | Keeps the appropriation, lines, spending plans, releases, transfers, carry-over and savings; imports disbursement | `fin` |
| Auditor | Reads Budget records, certifies report evidence, reviews and reopens anomalies, adds recommendations | `audit` |
| Administrator | Maintains budget structure, business rules and the budget AI settings. Holds no budget approval | `admin` |
| Budget Bureau, Cabinet, minister, parliament (external) | Decide outside Fisko. Staff record what they decided | No role |
| AI agents | AG-02, AG-03, AG-04, AG-05, AG-15, AG-16 and AG-17 prepare work for a person | Rule functions |
| External systems | e-Budgeting, BBL, BB EvMIS and GFMIS | Simulated |

## Use cases {#bgt-usecases}

The table replaces a use case diagram. Each use case names the actor who starts it, what starts it and what is true afterwards.

| ID | Name | Actor | Trigger | Outcome |
| --- | --- | --- | --- | --- |
| UC-BGT-01 | Maintain strategy and KPIs | Planning officer | A plan or target changes | Strategies, goals and 5-year KPI targets are current |
| UC-BGT-02 | Propose and accept an idea | Unit staff, Planning officer | A unit has a need | The idea is scored and accepted, or declined |
| UC-BGT-03 | Revise a KPI target | Planning officer, executive | A target no longer fits | The approved target replaces the old one |
| UC-BGT-04 | Issue ceilings | Planning officer | Formulation starts | Units see their ceiling and reply by the date |
| UC-BGT-05 | Reply to a ceiling | Unit staff | Ceilings are issued | The unit accepts, or appeals with an amount and a reason |
| UC-BGT-06 | Prepare a request | Unit staff | An accepted idea or a need | A draft with lines, plan, readiness and documents |
| UC-BGT-07 | Send, withdraw or cancel a request | Unit staff | The draft is ready or must change | The request moves on, returns to draft or leaves the totals |
| UC-BGT-08 | Approve for the division | Division director | A request is at `unit` | The request reaches Planning, or goes back |
| UC-BGT-09 | Consolidate and rank | Planning officer | Requests are in | Scores, 3R and zero-based results guide round 2 |
| UC-BGT-10 | Review by rounds | Planning officer, executive | A request reaches review | Round amounts are saved with a reason, and the request moves on or returns |
| UC-BGT-11 | Hold a committee meeting | Planning officer, committee | Requests wait for the committee | Resolutions are recorded, minutes are drafted and certified |
| UC-BGT-12 | Hold a hearing | Planning officer, unit staff | A unit must explain | Questions and answers are on record |
| UC-BGT-13 | Submit a batch | Planning officer | Requests are approved and the minister has agreed | The batch is with the Budget Bureau |
| UC-BGT-14 | Record the result | Planning officer | The Budget Bureau answers | Amounts per request are saved, revisions answered, the batch closed |
| UC-BGT-15 | Follow the bill | Planning officer | A batch is closed | Stages, cuts and appeals are recorded up to the act |
| UC-BGT-16 | Create lines from the act | Finance officer | The act is in force | Draft lines with monthly plans exist, each linked to its request |
| UC-BGT-17 | Keep the allocation | Finance officer | The year is being spent | Lines, plan versions and releases are current |
| UC-BGT-18 | Transfer budget | Finance officer, approver | A line needs more or less | The transfer takes effect by its type |
| UC-BGT-19 | Carry over or use savings | Finance officer, executive | The year end nears, or a contract came in low | Committed money is kept, or a saving is kept or moved |
| UC-BGT-20 | Monitor spending | Planning officer, unit staff, Finance officer | Each month | Progress and disbursement are in, and alerts are acknowledged |
| UC-BGT-21 | Report results | Unit staff, Planning officer, auditor | A quarter or the year ends | The report is accepted and its evidence certified |
| UC-BGT-22 | Evaluate and act on recommendations | Planning officer, auditor, unit staff | A project ends, or a body recommends | Findings are recorded, and a recommendation can become an idea |
| UC-BGT-23 | Analyse and simulate | Planning officer, executive, Finance officer | A decision needs facts | Forecasts, what-ifs and signals are read, and no stored record changes |
| UC-BGT-24 | Run a budget agent | Planning officer, Finance officer | Routine checks are due | A person approves or rejects each step that writes |

## Business rules {#bgt-rules}

Business rules are conditions that several requirements share. The Source column gives the clause or the design rule number (BR-nn, R-B-nn, R-C-nn). The last column says where a rule can be configured and the range the code accepts. A rule in the tenant rule table can be switched on or off by the administrator; a block rule stops sending and a warn rule lets the request go on.

| ID | Rule | Source | Setting and allowed range |
| --- | --- | --- | --- |
| BR-BGT-01 | A request links to an activity and a KPI | BR-01 | Tenant: on or off, block |
| BR-BGT-02 | A justification has at least the set number of characters | BR-02 | Tenant: `BR-02` default 40 characters, no enforced range |
| BR-BGT-03 | Every investment line needs a specification document; construction may use its drawings | BR-03 | Tenant: on or off, block |
| BR-BGT-04 | An increase over last year above the threshold must be explained | BR-04 | Tenant: `BR-04` default 20 percent, warn |
| BR-BGT-05 | A unit price above the standard price is flagged | BR-05 | Tenant: on or off, warn |
| BR-BGT-06 | A request is sent only inside the calendar window, from milestone `c1` to `c2` | BR-06 | Tenant: calendar dates; on or off, block |
| BR-BGT-07 | Every line links an activity, an output or project, and a programme | BR-07 | Tenant: on or off, block |
| BR-BGT-08 | A multi-year item shows the amount of each year and stays within the set years | BR-08 | Tenant: `BR-08` default 5 years, warn |
| BR-BGT-09 | A new commitment at or above the set amount needs a Cabinet approval document | BPA 26 | Legal limit proposed as a dated rule. Prototype: `BR-09` default 1,000 million baht, block |
| BR-BGT-10 | An ICT item needs CIO agreement up to the set amount, and committee agreement above it. An investment of 500 million baht or more needs a corruption risk assessment | BR-10 | Tenant: `BR-10` default 200 million baht, block. The 500 million is fixed in code |
| BR-BGT-11 | A unit's total stays within the set growth over last year, and the increase should be investment | BR-11 | Tenant: `BR-11` default 20 percent, warn |
| BR-BGT-12 | An investment line has a location, and a price source no older than the set years | BR-12 | Tenant: `BR-12` default 2 years, block |
| BR-BGT-13 | The quarterly plan adds up to the amount, and investment readiness is at or above the set score | BR-13 | Tenant: `BR-13` default 3 of 5, block |
| BR-BGT-14 | A request goes to the committee when the amount reaches the route setting, or it is a new project, or it is investment and that switch is on. Otherwise it goes to the executive | FR-B-20 | Tenant: step `w3` amount default 10,000,000 baht, `newProj` default on, `invest` |
| BR-BGT-15 | A committee needs a quorum of the set share of members, rounded up, before it records resolutions | D-B02 | Tenant: `quorum` default 50 percent; stored, no screen |
| BR-BGT-16 | A member from the requesting unit abstains on that item (SD-10) | SD-10 | Fixed in code; see PLT |
| BR-BGT-17 | A cut scales the first-year KPI targets and the quarterly plan in direct proportion | D-B07 | Fixed in code |
| BR-BGT-18 | Priority is the weighted mean of five criteria: obligation, urgent policy, readiness, severity and beneficiaries, each from 1 to 5 | FR-B-15 | Tenant: weights default 25, 20, 20, 20, 15; no enforced total |
| BR-BGT-19 | Readiness is the mean of site, staff, management and materials. Site scores 5 ready, 3 being prepared, 1 under study | R-B calc | Fixed in code |
| BR-BGT-20 | 3R proposes Redeploy for a low score, slow spending last year on a continuing request, or an open zero-based ask, and Replace for a high score below the ceiling line, from the money redeployed | FR-B-14 | Tenant: `lowScore` 55, `lowCut` 15, `slowRate` 70, `slowCut` 10, `zbbCut` 10, `highScore` 70, `replaceMax` 50; screen range 0 to 100 |
| BR-BGT-21 | Personnel requests are entitlements: 3R keeps them and the priority ranking leaves them out | FR-B-14 | Fixed in code |
| BR-BGT-22 | A request is rolled over when it continues and stays within the band of last year | FR-B-16 | Tenant: `rollBand` default 5 percent |
| BR-BGT-23 | A batch can be sent only after the minister's approval is recorded with a letter number | BPA 25 | Fixed in code |
| BR-BGT-24 | The bill starts from the results of closed batches, and a final amount is the bill amount less the cut plus the amount restored | FL-04, FL-05 | Fixed in code |
| BR-BGT-25 | Available on a line is the amount less reserved, committed and other Finance commitments, and a transfer also takes off what is pending out | FR-B-30; BPA 40 | Fixed in code |
| BR-BGT-26 | A transfer is T6 if the source is extended, T4 if the target is a new project, T3 across programmes, T2 across outputs, otherwise T1. T5 across agencies is closed unless an Act allows it | R-B-01; BPA 35; BPA 36; BMR 26; BMR 27; BMR 28 | Fixed in code; the design makes the table a setting per year (OI-BGT-03) |
| BR-BGT-27 | T1 is approved by Finance and reported within 15 days. T2, T3 and T6 are approved by the executive and then need the Budget Bureau. T4 needs the Cabinet | R-B-01; BMR 29; BPA 36 | 15 days fixed in code |
| BR-BGT-28 | A transfer reason is one of five fixed reasons | BMR 25 | Fixed in code |
| BR-BGT-29 | The spending plan reaches the Budget Bureau at least 15 days before the year starts, and a new version names one of three reasons | BMR 9; BMR 15 | 15 days fixed in code |
| BR-BGT-30 | Spending or committing above the allotment of a line is refused, in Procurement and in Finance | BPA 40 | Fixed in code |
| BR-BGT-31 | An allotment for a regional office is sent on within 15 days | BMR 21 | Date per line |
| BR-BGT-32 | Carry-over needs a contract or PO signed by 30 September, an amount within the line, and filing before the year ends. Carried money is drawn within 6 months, and one extension runs to the following 30 September | BPA 43 | Fixed in code |
| BR-BGT-33 | Quarterly reports are due 15 days after the quarter and the annual report 45 days after the year | BMR 34; BPA 50 | Fixed in code |
| BR-BGT-34 | Only a draft that was never sent is deleted. After that a record is withdrawn or cancelled with a reason, and the reason has at least 10 characters (BR-PLT-18) | R-C-01; R-C-02 | Fixed in code |
| BR-BGT-35 | A line with reservations, commitments or pending transfers cannot be cancelled, and it stays on record at amount zero | R-C-03 | Fixed in code |
| BR-BGT-36 | A closed fiscal year takes no new or changed allocation lines (BR-PLT-21) | R-C-04 | Status per year |
| BR-BGT-37 | Record numbers carry the year of the record and are never reused, including those of deleted drafts | R-C-05 | Fixed in code |
| BR-BGT-38 | Master data in use is retired, keeps its name where it is used and leaves the pickers | R-C-06 | Reason of at least 10 characters |
| BR-BGT-39 | AI reads, checks, drafts and forecasts, and a person decides. AI never approves a request or transfer, changes an amount without a person, votes, submits outside or changes a rule (BR-PLT-25) | Design chapter 10 | Fixed in code; each agent on or off |

> [!OPEN] The rule parameters and `quorum` have no enforced range, and BR-BGT-09, BR-BGT-10 and BR-BGT-32 are legal limits that the prototype holds as tenant values or fixed code. The budget specialist must say which are legal limits, with a dated rule for each, and give an allowed range for the rest. The product owner decides which of them each tenant may change (OI-BGT-03).

## Functional requirements {#bgt-fr}

The requirements follow the budget cycle and the prototype pages B1 to B11. Each status rests on reading the code and the sweep, as explained in the status summary. The file and function in the Prototype column show where the behaviour is; a named sweep walk means that walk asserts the behaviour.

### Budget today (B1) and the page map {#bgt-fr-today}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-001 | The system shall show each role a Budget home page with its budget tasks, the budget calendar and the unacknowledged spending alerts, and shall show the number of tasks due on the menu. | - | S | D | Partial | 75-budget-pages.js VIEWS.btoday |
| BGT-FR-002 | The system shall group Budget pages B1 to B11 by formulation, execution, and results and analysis, with the year of each group taken from the calendar, and each role shall see only its listed tabs. | - | M | T | Prototyped | 75-budget-pages.js BUD_PAGES, bTabs; sweep Budget pages pass |
| BGT-FR-003 | The system shall open the page and tab that own a deep link. | - | S | T | Prototyped | 75-budget-pages.js bOwner; sweep Budget pages pass |

### Strategy and KPIs (B2) {#bgt-fr-strategy}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-004 | The system shall let a Planning officer add a strategy with its national strategy and master plan, and a goal under a strategy, and shall number them without reuse. | - | M | T | Partial | 81-master-crud.js stNode; sweep E2E runs it with no check |
| BGT-FR-005 | The system shall delete a strategy or goal with nothing under it, and otherwise shall offer only retirement under BR-BGT-38. | - | M | T | Partial | 81-master-crud.js retireAct |
| BGT-FR-006 | The system shall let a Planning officer keep a KPI with goal, name, unit, owner, baseline, five yearly targets and formula, and shall delete a KPI only when it has no activity link, result, idea or revision. | - | M | T | Partial | 81-master-crud.js stKpi, kpiUsed |
| BGT-FR-007 | The system shall link KPIs to activities, many to many, and shall let a Planning officer remove a link. | - | M | D | Partial | 45-strategy.js |
| BGT-FR-008 | The system shall show a tree from national strategy to request, shall count a request under each strategy it links to, and shall list requests with no link and nodes with no request. | - | M | D | Partial | 45c-strategy-b2.js |
| BGT-FR-009 | The system shall let the executive set a minimum share per strategy and shall compare it with the requests. | - | S | D | Partial | 45c-strategy-b2.js minShare |
| BGT-FR-010 | The system shall let unit staff or a Planning officer propose an idea with a KPI, an estimate of at least 0.1 million baht and 1 to 3 years, and shall let the owning unit edit or withdraw it with a reason while it is proposed. | - | M | T | Partial | 81-master-crud.js stIdea; sweep E2E creates one |
| BGT-FR-011 | The system shall let a Planning officer score an idea from 1 to 5 on each criterion and accept it, or decline it with a reason. | - | M | T | Prototyped | 81-master-crud.js stIdea acc; sweep E2E walk |
| BGT-FR-012 | The system shall turn an accepted idea into a draft request, numbered by the same series as every other request. | - | M | T | Partial | 45b-strategy-depth.js data-iconv, nextReqId |
| BGT-FR-013 | The system shall let a Planning officer propose a KPI target revision with a new value and a reason, and shall refuse a value equal to the current one. | - | S | T | Partial | 81-master-crud.js stRev |
| BGT-FR-014 | The system shall let the executive approve a revision, which changes the target, or reject it with a reason, and shall let Planning withdraw a pending one. | - | S | T | Partial | 81-master-crud.js stRev |
| BGT-FR-015 | The system shall hold a risk register per strategy on the six risk types, with likelihood, impact, measure and owner. | - | S | T | Planned | - |
| BGT-FR-016 | The system shall let a unit propose a change to its own KPIs and let Planning accept or decline it. | - | C | T | Planned | - |

### Requests (B3) {#bgt-fr-request}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-017 | The system shall let unit staff create a request with a name, an activity and a first budget type, and shall number it for the year being formulated. | - | M | T | Partial | 78-form-crud.js rqReq create |
| BGT-FR-018 | The system shall list requests by status and unit with search, shall show only a unit's own requests to that unit, and shall hide cancelled requests by default. | - | M | D | Partial | 78-form-crud.js rqReq; 76-crud.js crudList |
| BGT-FR-019 | The system shall let the owner edit a request only while it is draft or returned, and shall save a new version when its lines change. | - | M | T | Partial | 41-requests.js editable; 41b-reqtabs.js snapshot |
| BGT-FR-020 | The system shall hold budget lines with budget type, name, quantity, unit and unit price, shall total them, shall offer standard prices, and shall accept lines pasted from a spreadsheet. | - | M | T | Partial | 41-requests.js; 41c-req-depth.js |
| BGT-FR-021 | The system shall show a step bar with a status dot per step: red if a blocking check is open, amber if a warning is open, and shall name the first open item. | - | M | D | Partial | 41d-req-b1.js STEP_DEF, reqTabsBar |
| BGT-FR-022 | The system shall split the first form step into general data and linkage, need, targets and KPIs in four dimensions, and cost lines. | - | S | T | Planned | - |
| BGT-FR-023 | The system shall hold a plan of 4 quarters, shall fill it from the budget type pattern on request, and shall let the owner edit it. | - | M | T | Partial | 41d-req-b1.js Q_PATTERN, qplanFill |
| BGT-FR-024 | The system shall hold readiness of site, staff, management and materials, forest and environment flags, evaluation stages and risks on six types, and shall compute the score under BR-BGT-19. | - | M | T | Partial | 41d-req-b1.js readiness, RISK_T |
| BGT-FR-025 | The system shall hold location, GPS, price source and price date for each investment line. | - | S | T | Partial | 41d-req-b1.js PSRC |
| BGT-FR-026 | The system shall work out the documents a request needs from its data: specification, drawings, three quotations for a unit price above 1 million baht, CIO or committee agreement, corruption risk assessment and Cabinet approval, and shall block sending while a blocking one is missing. | BPA 26 | M | T | Partial | 41d-req-b1.js reqDocs |
| BGT-FR-027 | The system shall let the owner attach a document to an editable request and remove it, and shall store the file itself. | - | M | T | Partial | 78-form-crud.js docDel; stores the name only |
| BGT-FR-028 | The system shall let a request become multi-year, shall show each year's amount, and shall refuse sending when the years do not add up to the amount. | - | M | T | Partial | 41b-reqtabs.js; 41-requests.js checks |
| BGT-FR-029 | The system shall estimate payroll for a personnel line and shall let the owner apply the estimate. | - | S | T | Partial | 41b-reqtabs.js payroll |
| BGT-FR-030 | The system shall run the checks of BR-BGT-01 to BR-BGT-13 and refuse to send while a block check fails, and a warn check shall not stop sending. | BPA 26 | M | T | Partial | 41-requests.js checks; 41d-req-b1.js |
| BGT-FR-031 | The system shall let a unit flag an exception to BR-BGT-11: a legal or contract obligation, an entitlement or urgent policy. | - | S | T | Planned | - |
| BGT-FR-032 | The system shall check BR-BGT-11 for the share of the increase that is investment. | - | S | T | Planned | - |
| BGT-FR-033 | The system shall let the owner send a request, which moves it to `unit`, notifies the director and marks it as sent once. | - | M | T | Partial | 41d-req-b1.js submit; 78-form-crud.js |
| BGT-FR-034 | The system shall let the owner delete a draft that was never sent, and shall never reuse its number. | - | M | T | Prototyped | 78-form-crud.js rqReq del, 45b-strategy-depth.js nextReqId |
| BGT-FR-035 | The system shall let the owner withdraw a request from `unit`, `plan`, `committee` or `exec` to draft with a reason, and shall tell the reviewer it left. | - | M | T | Prototyped | 78-form-crud.js rqReq wd; sweep E2E walk |
| BGT-FR-036 | The system shall let the owner cancel a draft or returned request that was sent before, with a reason, and shall leave it out of the totals. | - | M | T | Partial | 78-form-crud.js rqReq cancel |
| BGT-FR-037 | The system shall let a director approve a request of the director's own unit to Planning, or return it after at least one comment. | - | M | T | Partial | 42a-review-mode.js rv-pass, rv-return |
| BGT-FR-038 | The system shall keep non-budget money sources per request and report their status and plan. | - | C | T | Planned | - |

### Consolidation (B4) {#bgt-fr-consolidation}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-039 | The system shall compute every B4 total from the live requests, by unit, budget type and programme, and shall leave rejected and cancelled requests out. | - | M | T | Partial | 41d-req-b1.js syncBudget; 43-consolidation.js |
| BGT-FR-040 | The system shall let a Planning officer set the agency ceiling, the reply date and a note while the ceilings are not issued. | - | M | T | Partial | 78-form-crud.js csCeil |
| BGT-FR-041 | The system shall split unit ceilings pro rata on request and let a Planning officer change each one. | - | M | T | Partial | 43b-cons-tabs.js uc-prop |
| BGT-FR-042 | The system shall let a Planning officer issue the ceilings, showing whether unit ceilings add up to the agency ceiling, and shall notify every unit. | - | M | T | Partial | 78-form-crud.js csCeil issue; sweep E2E runs it with no check |
| BGT-FR-043 | The system shall let a Planning officer reissue the ceilings as a new version with a reason, clearing earlier replies, and withdraw them with a reason while no unit has replied. | - | M | T | Partial | 78-form-crud.js csCeil reissue, unissue |
| BGT-FR-044 | The system shall let a unit accept its ceiling or appeal with an amount and a reason, and take back the reply while Planning has not decided. | - | M | T | Partial | 43c-cons-depth.js; 78-form-crud.js ceil-undo |
| BGT-FR-045 | The system shall let a Planning officer grant or decline an appeal, and shall warn that a grant can pass the agency ceiling. | - | M | T | Partial | 43c-cons-depth.js data-cgrant |
| BGT-FR-046 | The system shall score each request on the five criteria of BR-BGT-18, shall fill obligation and readiness from the request, and shall let a Planning officer change scores and weights. | - | M | T | Partial | 43d-cons-b2.js autoScore, ensureScores |
| BGT-FR-047 | The system shall rank non-personnel requests by score, shall draw the cut line at the project ceiling, and shall show the funded total. | - | M | T | Partial | 43b-cons-tabs.js |
| BGT-FR-048 | The system shall mark possible duplicates, let a Planning officer mark one by hand with an overlapping amount no larger than the merged request, merge it, or record that it is not a duplicate with a reason. | - | S | T | Partial | 78-form-crud.js csDup |
| BGT-FR-049 | A merge shall cut the merged request by the overlap, shall save a version, and shall tell the unit. | - | S | T | Partial | 78-form-crud.js mergeCut |
| BGT-FR-050 | The system shall work out 3R per request under BR-BGT-20 and BR-BGT-21, showing the money freed and moved. | - | M | T | Partial | 43d-cons-b2.js threeR |
| BGT-FR-051 | The system shall let a Planning officer copy the 3R proposal to round 2 only for requests at Planning, with the reason in the change log. | - | M | T | Partial | 43d-cons-b2.js r3-apply |
| BGT-FR-052 | The system shall show new, continuing and rolled-over requests (BR-BGT-22), and let a Planning officer ask for a fresh explanation, which notifies the unit and warns until the answer has at least 40 characters. | - | S | T | Partial | 43d-cons-b2.js rolled, data-zbb |
| BGT-FR-053 | The system shall estimate the next years from growth assumptions and multi-year amounts, shall show what is locked as a share of the expected ceiling, and shall show what is left for new work. | - | S | T | Partial | 43c-cons-depth.js forwardRows; 43d-cons-b2.js |
| BGT-FR-054 | The system shall compare unit and agency totals with last year's appropriation and the growth cap of BR-BGT-11. | - | M | T | Partial | 49b-budget-b1.js |

### Review (B5) {#bgt-fr-review}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-055 | The system shall show a review queue with status, due date from the route SLA and a late mark. | - | M | D | Partial | 42b-review-tabs.js |
| BGT-FR-056 | The system shall route a request under BR-BGT-14 when Planning passes it. | - | M | T | Partial | 41d-req-b1.js needsCommittee |
| BGT-FR-057 | The system shall let a reviewer comment on a budget line or on the whole request, and the author shall edit or delete a comment until it is resolved. | - | M | T | Partial | 42a-review-mode.js; 78-form-crud.js cmtedit |
| BGT-FR-058 | The system shall let a reviewer return a request only with an open comment, and the owner shall resolve comments and send it again. | - | M | T | Partial | 42a-review-mode.js rv-return, data-resolve |
| BGT-FR-059 | The system shall hold the requested, round 2 and round 3 amounts per request, shall let Planning change round 2 and the executive change round 3, and shall save each change with a reason and an audit entry. | - | M | T | Partial | 42-review.js |
| BGT-FR-060 | The system shall refuse a round amount change with a reason shorter than 10 characters. | - | M | T | Partial | 42-review.js checks only that a reason exists |
| BGT-FR-061 | The system shall take the reason for a cut from a closed list. | - | S | T | Planned | - |
| BGT-FR-062 | The system shall let Planning send every request at its stage on from the rounds page, and the executive approve the requests waiting for it at the round 3 amount. | - | M | T | Partial | 78-form-crud.js rv-fwd; sweep E2E clicks it with no check of its own |
| BGT-FR-063 | The system shall set the decided amount from round 3 whenever the executive approves, and the submission shall use it. | - | M | T | Partial | 78-form-crud.js rv-pass; 46-submission.js subAmt |
| BGT-FR-064 | The system shall show each request's amounts as a waterfall from the amount requested to the act, per request, unit and agency. | - | S | D | Partial | 49b-budget-b1.js |
| BGT-FR-065 | The system shall compare request versions side by side, marking lines added, changed and removed. | - | S | D | Partial | 42b-review-tabs.js compare |
| BGT-FR-066 | The system shall show the effect of a cut on KPI targets and on the quarterly plan before it is confirmed, under BR-BGT-17. | - | M | T | Partial | 42d-review-b3.js cutImpact, impactText |

### Committee and hearings (B5) {#bgt-fr-committee}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-067 | The system shall let a Planning officer schedule one meeting at a time with number, date, time, place and note, move it, and cancel it with a reason. | - | M | T | Partial | 78-form-crud.js rvMeet; sweep E2E creates one |
| BGT-FR-068 | The system shall build the agenda from requests at `committee`, and shall warn when requests wait with no meeting scheduled. | - | M | D | Partial | 78-form-crud.js REV_PANELS.meetings |
| BGT-FR-069 | The system shall let a present member vote approve, approve with a cut, defer or reject on each item. | - | S | T | Partial | 42d-review-b3.js VOTE, data-vote |
| BGT-FR-070 | The system shall apply BR-BGT-16, showing the member as abstaining with no vote control, and shall log the abstention. | - | M | T | Partial | 42d-review-b3.js conflicted; no log |
| BGT-FR-071 | The system shall refuse to record resolutions without a quorum under BR-BGT-15. | - | M | T | Partial | 42d-review-b3.js quorumN, m-save |
| BGT-FR-072 | On a resolution the system shall approve with the decided amount, return a deferred item with the comment, or reject it, and shall hold the meeting as held. | - | M | T | Prototyped | 42b-review-tabs.js m-save; sweep E2E walk |
| BGT-FR-073 | On a cut the system shall save the impact on the request and scale its quarterly plan. | - | M | T | Partial | 42d-review-b3.js cutImpact |
| BGT-FR-074 | The system shall draft minutes with attendance, resolutions, votes and abstentions, shall let a Planning officer edit them, and shall lock them once the executive or Planning certifies them. | - | S | T | Partial | 42d-review-b3.js minutes; 78-form-crud.js cert |
| BGT-FR-075 | The system shall let a Planning officer schedule, move and cancel a budget hearing for a unit, and a unit shall answer its questions. | - | S | T | Partial | 78-form-crud.js rvHear; 42c-review-depth.js |

### Submission (B6) {#bgt-fr-submission}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-076 | The system shall check each approved request before sending: budget code, programme, KPI, budget types, multi-year total, documents and resolved amount. | - | M | T | Partial | 46-submission.js subChecks |
| BGT-FR-077 | The system shall record the minister's approval with letter number and date, and shall apply BR-BGT-23. | BPA 25 | M | T | Partial | 46c-sub-b3.js mn-save; 79-sub-crud.js send |
| BGT-FR-078 | The system shall let a Planning officer prepare one batch at a time from approved requests that pass the checks and are in no live batch, and edit or cancel it while preparing. | - | M | T | Partial | 79-sub-crud.js sbBatch, sbReady |
| BGT-FR-079 | The system shall let a later batch take requests approved after the first batch was sent. | - | S | T | Partial | 79-sub-crud.js sbReady |
| BGT-FR-080 | The system shall record that the Budget Bureau received a batch, and shall record a result per request capped at the amount sent, with personnel in full under simulation. | - | M | T | Partial | 79-sub-crud.js recv, sbBatch edit |
| BGT-FR-081 | The system shall offer a Simulate action that fills the result form at 92 percent, rounded to 1,000 baht, without saving, and shall mark the batch as simulated when saved. | - | S | T | Partial | 79-sub-crud.js sbSim |
| BGT-FR-082 | The system shall record a revision request with a reply date, shall let a Planning officer reply or delete it, and shall refuse to close a batch while one is open. | - | M | T | Partial | 79-sub-crud.js sbRev, close |
| BGT-FR-083 | The system shall close a batch with results and notify Finance. | - | M | T | Prototyped | 79-sub-crud.js sbBatch close; sweep C3 walk |
| BGT-FR-084 | The system shall build the submission pack: summary by programme and output, activities by priority, by budget type, multi-year commitments and quarterly plan, and a CSV with one row per line. | - | M | T | Partial | 46c-sub-b3.js packCsv |
| BGT-FR-085 | The system shall export the request files in the layouts the Budget Bureau publishes. | - | M | T | Planned | - |
| BGT-FR-086 | The system shall build a briefing pack with last year's scrutiny observations and expected questions per request, and shall let AG-16 draft answers. | - | S | T | Partial | 46c-sub-b3.js briefQs, br-ai |

### Parliament (B6) {#bgt-fr-parliament}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-087 | The system shall take the bill through seven stages, shall store the real date of each, and shall not start until a batch is closed. | - | M | T | Partial | 79-sub-crud.js pl-next; 46b-parliament.js PARL_STEPS |
| BGT-FR-088 | The system shall let a Planning officer step the bill back one stage with a reason of at least 10 characters. | - | S | T | Partial | 79-sub-crud.js pl-back |
| BGT-FR-089 | The system shall fix the bill items from closed batches when the committee stage starts, under BR-BGT-24. | - | M | T | Partial | 79-sub-crud.js parlItems |
| BGT-FR-090 | The system shall record a cut per item, no larger than the bill amount, at the committee stage, and edit or delete it until an appeal is filed. | - | M | T | Partial | 79-sub-crud.js plCut |
| BGT-FR-091 | The system shall record an appeal at the appeals stage, no larger than the cut, shall let it be withdrawn with a reason while no result exists, and shall record the amount restored, no larger than the amount asked. | - | M | T | Partial | 79-sub-crud.js plApp |
| BGT-FR-092 | The system shall offer Simulate for cuts and appeal results, each with Undo, and shall mark simulated rows. | - | C | T | Partial | 79-sub-crud.js pl-simcut, pl-simapp |
| BGT-FR-093 | The system shall notify Finance, Planning and the executive when the act is in force. | - | M | T | Partial | 79-sub-crud.js pl-next |

### Appropriation and allocation lines (B7) {#bgt-fr-allocation}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-094 | The system shall let a Finance officer edit the act name, date and amounts by budget type with a reason, not below what is allocated. | - | M | T | Partial | 77-alloc-crud.js alAp |
| BGT-FR-095 | When the act is in force the system shall let a Finance officer create next year's appropriation with one line per request, at the final amount, under the request's largest budget type, keeping the request link. | - | M | T | Prototyped | 47c-alloc-b3.js mk, actAmount; sweep C3 walk |
| BGT-FR-096 | The system shall spread each quarter of the request's plan over its three months, scaled to the line amount. | - | M | T | Partial | 47c-alloc-b3.js planFromQ |
| BGT-FR-097 | The system shall let a Finance officer bring a draft made before the act up to the act's amounts. | - | S | T | Partial | 47c-alloc-b3.js act-sync |
| BGT-FR-098 | The system shall let a Finance officer add a draft line with unit, name, budget type, activity, amount and the new-project and extended flags, and a draft shall count for nothing. | - | M | T | Partial | 77-alloc-crud.js alLine create |
| BGT-FR-099 | The system shall refuse an amount below 100,000 baht on a new line, or above the room left on the budget type. | - | M | T | Partial | 77-alloc-crud.js alLine fields, check |
| BGT-FR-100 | The system shall let a Finance officer confirm a draft, which moves it to the active lines, raises the allocation and notifies units. | - | M | T | Prototyped | 77-alloc-crud.js alLine confirm; sweep E2E walk |
| BGT-FR-101 | The system shall let a Finance officer change an active line's amount with a reason, between what is used and the type's room, and shall rescale its monthly plan. | - | M | T | Partial | 77-alloc-crud.js lineFloor; scalePlan |
| BGT-FR-102 | The system shall let a Finance officer cancel an unused line under BR-BGT-35, and delete a draft with its number kept. | - | M | T | Partial | 77-alloc-crud.js lineUsed |
| BGT-FR-103 | The system shall refuse any line change in a closed year (BR-BGT-36). | - | M | T | Partial | 81-master-crud.js fyOpen |
| BGT-FR-104 | The system shall keep a separate internal reserve line. | - | S | T | Planned | - |

### Spending plans and releases (B7) {#bgt-fr-plan}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-105 | The system shall hold a monthly plan per line that adds up to the line amount, and shall show the quarter totals. | - | M | T | Partial | 47-allocation.js plan; 47d-alloc-b4.js qTotals |
| BGT-FR-106 | The system shall record the date the plan was sent to the Budget Bureau and shall check BR-BGT-29. | BMR 9 | M | T | Partial | 47d-alloc-b4.js pl-send |
| BGT-FR-107 | The system shall save a plan version with quarter totals, one of the three reasons and a note, shall compare versions, and shall let the latest be dropped with Undo. | BMR 15, BMR 16 | M | T | Partial | 47d-alloc-b4.js pv-save; 77-alloc-crud.js pv-drop |
| BGT-FR-108 | The system shall let a Finance officer request a quarterly release by budget type, up to what is allocated less live releases, and edit or withdraw it while pending. | BMR 18 | M | T | Partial | 77-alloc-crud.js alRel, relLeft |
| BGT-FR-109 | The system shall record the Budget Bureau's approval or refusal of a release, with a reason for a refusal. | - | M | T | Partial | 77-alloc-crud.js alRel; sweep E2E runs it with no check |
| BGT-FR-110 | The system shall show the allotment status of each line and, for a regional line, the date it must be sent on, and shall record that it was sent. | BMR 21 | M | T | Partial | 47d-alloc-b4.js allotCell |
| BGT-FR-111 | The system shall keep central fund and supplementary requests with a monthly plan, and shall flag central fund money left over for return within 15 days. | BMR 18, BMR 33 | C | T | Planned | - |

### Balances (B7) {#bgt-fr-balance}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-112 | The system shall show for each line of the year being spent the allotted, reserved, committed, paid and available amounts under BR-BGT-25, with a drill-down to the requisitions, contracts and payments behind them. | BPA 40 | M | T | Partial | 47d-alloc-b4.js bal, balDetail |
| BGT-FR-113 | The system shall hold every reservation and commitment on a line in one ledger that Procurement and Finance write through one interface, and shall refuse an entry above the available amount (BR-BGT-30). | BPA 40 | M | T | Planned | - |
| BGT-FR-114 | The system shall let a line's amount fall only as far as its reservations, commitments and pending transfers. | - | M | T | Partial | 77-alloc-crud.js lineFloor |

### Transfers (B7) {#bgt-fr-transfer}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-115 | The system shall let a Finance officer request a transfer with source, target, amount, one reason of BR-BGT-28 and an explanation, and shall refuse the same line on both sides. | BMR 25 | M | T | Partial | 77-alloc-crud.js alTr |
| BGT-FR-116 | The system shall classify a transfer under BR-BGT-26 and show its type, approver and clause before it is sent. | BPA 36, BMR 26, BMR 27, BMR 28 | M | T | Partial | 47d-alloc-b4.js classifyTransfer, TR_TYPE |
| BGT-FR-117 | The system shall limit a transfer to the available amount less pending transfers out of the source. | - | M | T | Partial | 77-alloc-crud.js alTr fields; pendingOut |
| BGT-FR-118 | The system shall let the requester edit or withdraw a transfer with a reason while it is pending. | - | M | T | Partial | 77-alloc-crud.js alTr wd; sweep E2E runs it with no check |
| BGT-FR-119 | The system shall route approval under BR-BGT-27, and an approved T1, or a type agreed by the Budget Bureau, shall move the amount and rescale both monthly plans. | BPA 36, BMR 26 | M | T | Prototyped | 77-alloc-crud.js alTr ok, bbok; sweep E2E walk |
| BGT-FR-120 | The system shall let an approver reject, and shall record the Budget Bureau's refusal, each with a reason. | - | M | T | Partial | 77-alloc-crud.js alTr no, bbno |
| BGT-FR-121 | The system shall hold a T4 request as needing the Cabinet, with no approve action. | BPA 36 | M | T | Partial | 77-alloc-crud.js alTr status |
| BGT-FR-122 | The system shall refuse a transfer that adds to secret funds, and a transfer to another agency unless an Act allows it (T5). | BPA 35, BPA 36 | M | T | Planned | - |
| BGT-FR-123 | The system shall set a report date 15 days after an approved T1 and let a Finance officer mark it reported. | BMR 29 | M | T | Partial | 77-alloc-crud.js alTr rep |
| BGT-FR-124 | The system shall refuse approval of a transfer by the person who prepared it (SD-09) and shall log the blocked attempt. | - | M | T | Planned | - |
| BGT-FR-125 | After a transfer the system shall ask for a new plan version when targets change, and shall record that no plan change is needed otherwise. | BMR 15, BMR 16 | S | T | Planned | - |

### Carry-over and savings (B7) {#bgt-fr-carry}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-126 | The system shall let a Finance officer file a carry-over request only under BR-BGT-32, naming the failed check, and edit or withdraw it while pending. | BPA 43 | M | T | Partial | 47b-alloc-depth.js cfChecks; 77-alloc-crud.js alCf |
| BGT-FR-127 | The system shall let the executive approve a carry-over, or reject it with a reason. | BPA 43 | M | T | Prototyped | 77-alloc-crud.js alCf ok; sweep E2E walk |
| BGT-FR-128 | The system shall track carried money with payments and the deadline apart from the current year, and shall close it when paid in full. | BPA 43 | M | T | Partial | 47b-alloc-depth.js data-cpay |
| BGT-FR-129 | The system shall let a Finance officer ask to extend a carry-over paid under half, and the executive approve it to the following 30 September. | BPA 43 | M | T | Partial | 47b-alloc-depth.js data-cext |
| BGT-FR-130 | An approved carry-over shall create a carried line in the next year and reduce the amount lapsing on the source line. | BPA 43 | M | T | Planned | - |
| BGT-FR-131 | The system shall list contracts priced below the plan estimate as savings, and let a Finance officer keep the saving, or move it to a pre-filled transfer. | - | S | T | Partial | 47d-alloc-b4.js savings; B4_PREFILL |
| BGT-FR-132 | The system shall let a saving decision be reversed until a live transfer exists for it. | - | S | T | Partial | 77-alloc-crud.js savTrOf |

### Monitoring (B8) {#bgt-fr-monitor}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-133 | The system shall build B8 from the allocation lines of the year being spent, with plan to date from the monthly plan and actual as the higher of imported disbursement and Finance payments, and shall recompute on every read. | - | M | T | Prototyped | 80-live-year.js liveDash, syncDash; sweep round C4 pass |
| BGT-FR-134 | The system shall compare spending with quarterly and year-end targets, split into investment and operating, and shall read the targets from the settings. | - | M | T | Partial | 47d-alloc-b4.js spendT; 40c-monitor-depth.js CAB |
| BGT-FR-135 | The system shall list investment lines with no reservation or commitment, and shall raise them as high risk after quarter 2. | - | S | T | Partial | 47d-alloc-b4.js stuck; 69-budget-ai.js bSignals |
| BGT-FR-136 | The system shall forecast the year end per quarter and unit at the pace so far, capped at 105 percent of plan. | - | S | T | Partial | 40c-monitor-depth.js fcast |
| BGT-FR-137 | The system shall let a unit submit a monthly progress report per line with percent, status, issue and next plan, and shall raise an alert when the status is not on track. | - | M | T | Partial | 40b-monitor-tabs.js |
| BGT-FR-138 | The system shall let a Finance officer import a GFMIS disbursement file and reconcile rows that differ, and shall show the rows not reconciled. | - | M | T | Partial | 40b-monitor-tabs.js; 80-live-year.js simDisb |
| BGT-FR-139 | The system shall let a person acknowledge an alert, and shall show procurement milestones for investment lines. | - | S | D | Partial | 40b-monitor-tabs.js; 40c-monitor-depth.js |
| BGT-FR-140 | The system shall keep last year's monitoring data as a read-only history tab. | - | S | T | Partial | 80-live-year.js hist |
| BGT-FR-141 | In a demonstration tenant the system shall let a user move the date to a month end, shall show a banner on every page while it is moved, and shall import simulated disbursement for the months moved through. | - | C | T | Prototyped | 80-live-year.js setAsOf; sweep round C4 pass |

### Performance (B9) {#bgt-fr-performance}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-142 | The system shall let the owner enter a KPI result for each KPI with a target this year, including new ones, and show achievement against target on a scorecard. | - | M | T | Partial | 48-performance.js; 80-live-year.js syncDash |
| BGT-FR-143 | The system shall let a Planning officer add an output to a line with name, unit, target and KPI, and delete it only with no result and no report, otherwise retire it. | - | M | T | Partial | 81-master-crud.js pfOut |
| BGT-FR-144 | The system shall show the chain from money spent through output to outcome and strategic goal, per project. | - | S | D | Partial | 48-performance.js chain |
| BGT-FR-145 | The system shall open a reporting round per quarter and for the year with its due date under BR-BGT-33, and shall show which units have not sent. | BMR 34, BPA 50 | M | T | Partial | 48c-perf-b5.js QR_ROUNDS |
| BGT-FR-146 | The system shall let a unit report a result, problem and fix per output, save a draft, and send only when every result is in. | BMR 34 | M | T | Partial | 48c-perf-b5.js qr-send |
| BGT-FR-147 | The system shall let a Planning officer accept or return a submitted report, and shall mark a report sent after the due date. | BMR 34 | M | T | Partial | 48c-perf-b5.js qr-ok, qr-ret |
| BGT-FR-148 | The system shall run integrated plan reporting on its own due date of 45 days after the quarter. | BMR 35 | S | T | Planned | - |
| BGT-FR-149 | The system shall let a unit attach evidence files to a report and the auditor certify the evidence. | - | S | T | Partial | 48c-perf-b5.js qr-cert; stores the name only |
| BGT-FR-150 | The system shall compute cost per output as spent over result, and compare it with plan and last year, flagging more than 15 percent above plan and more than 10 percent below it. | - | M | T | Partial | 48c-perf-b5.js cost |
| BGT-FR-151 | The system shall show evaluation before, during and after spending per project, and let a Planning officer pick projects for impact evaluation. | BPA 46 | S | T | Partial | 48c-perf-b5.js stages |
| BGT-FR-152 | The system shall hold a project evaluation on a logframe with five criteria, and finish it only with all five scored, findings and at least one lesson. | - | S | T | Partial | 48b-perf-depth.js |
| BGT-FR-153 | The system shall hold recommendations from the Budget Bureau, the auditor or the scrutiny committee with owner unit, due date, status and action, and shall mark overdue ones. | BPA 48 | S | T | Partial | 48c-perf-b5.js recs |
| BGT-FR-154 | The system shall let a Planning officer turn a recommendation that is in progress or done into a proposed idea, linked both ways. | BMR 36 | S | T | Prototyped | 81-master-crud.js data-recidea; sweep E2E walk |
| BGT-FR-155 | The system shall prepare a public summary of allotment, spending, KPIs met and top outputs, and shall record the approval to publish. | BPA 47 | C | D | Partial | 48c-perf-b5.js public; no website |

### Budget settings {#bgt-fr-settings}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-156 | The system shall let the administrator edit each budget business rule: on or off, setting, block or warn, with a reason, and shall not let rules be added or deleted. | - | M | T | Partial | 83-admin-crud.js adRule |
| BGT-FR-157 | The system shall let the administrator keep the budget structure of programme, output and activity per year, and shall make it read-only in a closed year. | - | M | T | Partial | 81-master-crud.js adNode |
| BGT-FR-158 | The system shall hold a fifth structure level for ministry and agency service goals with their KPIs. | - | M | T | Planned | - |
| BGT-FR-159 | The system shall let administrators and Planning officers keep the committee, master plans and other budget master data, and shall let the auditor read them. | - | M | T | Partial | 81-master-crud.js bmaster |
| BGT-FR-160 | The system shall let the administrator change spending targets, forecast assumptions, signal thresholds and 3R rules, shall record each change, and shall restore the defaults on request. Finance and the auditor shall read them. | - | M | T | Partial | 69b-budget-settings.js bcfg, bc-reset |
| BGT-FR-161 | The system shall hold each rule value, transfer table entry, target and calendar date per fiscal year, with its source and confidence level. | - | M | T | Planned | - |

### Analysis and AI (B10, B11) {#bgt-fr-ai}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-FR-162 | The system shall apply BR-BGT-39: an agent shall have no tool to approve a request or transfer, vote or submit, and shall stop for a person at each step that writes or notifies. The shared agent framework is in the Review chapter (REV-FR-039, REV-FR-041). | - | M | T | Partial | 69-budget-ai.js B_TOOL, bAdvance |
| BGT-FR-163 | The system shall run agents AG-02, AG-03, AG-04, AG-05, AG-15 and AG-17 as plans of tool steps, and shall accept a write step only from the roles set for that agent. The shared agent framework is in the Review chapter (REV-FR-036 to REV-FR-038). | - | S | T | Partial | 69-budget-ai.js B_AG, bCanApprove; sweep starts each one |
| BGT-FR-164 | The system shall log every agent step with agent, user, action, target and version, and shall refuse a tool whose agent is switched off. The shared agent framework is in the Review chapter (REV-FR-035, REV-FR-037). | - | M | T | Partial | 69-budget-ai.js S.aiLog; 46c-sub-b3.js agentOn |
| BGT-FR-165 | A transfer drafted by AG-15 shall enter the normal pending approval. The shared agent framework is in the Review chapter (REV-FR-044). | - | S | T | Partial | 69-budget-ai.js bApply transfer.draft |
| BGT-FR-166 | The system shall let the starter of a run, or Planning, Finance or the executive, cancel a running or waiting run with a reason, and approved steps shall stay in effect. The shared agent framework is in the Review chapter (REV-FR-045). | - | S | T | Partial | 82-intel-crud.js agRun |
| BGT-FR-167 | The system shall forecast year-end spending per line (FC-B1) as a range, the money to carry over (FC-B2) and next year's locked amounts (FC-B3), and shall use the assumptions in the settings. | - | S | T | Partial | 69-budget-ai.js fcYear |
| BGT-FR-168 | The system shall run what-ifs WI-B1 to WI-B4 and a ceiling cut with no change to any stored record. | - | S | T | Partial | 69-budget-ai.js WI_B; 44b-intel-tabs.js |
| BGT-FR-169 | The system shall let a user save a what-if with a name and note, reopen it, and let the owner or Planning edit or delete it. | - | C | T | Partial | 82-intel-crud.js wiSc |
| BGT-FR-170 | The system shall define KPI-B01 to KPI-B10 in one place and shall raise signals BF-01 to BF-06 from the settings. | - | S | T | Partial | 69-budget-ai.js kpiB, bSignals |
| BGT-FR-171 | The system shall list spending anomalies for the auditor to close or escalate with a note, and let the auditor reopen a closed one with a reason, keeping the earlier review. | - | S | T | Partial | 44c-intel-depth.js; 82-intel-crud.js anDone |
| BGT-FR-172 | The system shall score the quality of each justification and suggest improvements, as advice that blocks nothing. | - | C | D | Partial | 44c-intel-depth.js quality |
| BGT-FR-173 | The system shall let a user ask questions answered from budget data with sources, and draft a justification on request, each logged. | - | S | T | Partial | 44-assistant.js; 41-requests.js |
| BGT-FR-174 | The system shall run budget AI tools through the AI gateway of ADR-0016 with a tenant switch for each. | - | C | T | Planned | - |

> [!WARN] The transfer screens hold back only requests at `pending`. A request at `bb`, approved and waiting for the Budget Bureau, is not held, so the same money can be committed or moved again and the later agreement can push the line below what is committed. Production must hold the amount until the transfer ends (OI-BGT-05).

## Data requirements {#bgt-data}

The prototype holds these records in browser memory. The table names each record, its main attributes as they exist in the code, and its personal data. The SDS sets the physical tables. Reservations and commitments are computed from Procurement and Finance records in the prototype, and production holds them in one ledger (BGT-FR-113).

| Record | Main attributes | Personal data |
| --- | --- | --- |
| Strategy, goal, KPI | id, name, nat, mp, minShare, unit, owner, base, targets, formula, acts, retired | None |
| Project idea | id, unit, kpi, name, est, years, status, scores, note, rec | Proposer |
| Plan revision | id, kpi, y, from, to, why, status | Proposer, decider |
| Budget request | id, unit, act, prev, status, name, kpi, reason, docs, items, amount, versions, comments, qplan, ready, risks, multi, years, payroll, zbb, zbbNote, decided, decision, cutImpact, sub, inAct, withdrawn, cancelled | Comment authors; payroll estimates may hold names |
| Request line | type, name, qty, unitName, price, detail (kind, loc, lat, lng, src, srcDate) | None |
| Consolidation | ceiling, projCeiling, unitCeil, resp, due, note, issued, ver, units | None |
| Review row | id, unit, r0, r1, r2 | None |
| Meeting | id, no, date, time, place, status, present, votes, items, minutes, certified | Members and their votes |
| Hearing | id, unit, date, time, who, status, qs | Names of those who explain |
| Submission, batch | minister, batches (id, status, reqs, count, amount, method, simulated), results, revisions, exports | Minister letter signer |
| Parliament | stage, dates, items, cuts, appeals | None |
| Appropriation | fy, act, date, total, byType, draft, fromAct, lines, drafts, transfers, releases, planSent, planVersions, seq | None |
| Allocation line | id, unit, name, type, act, amount, plan[12], req, newProj, extended, allot, cancelled | None |
| Transfer | id, from, to, amount, why, reason, type, status, reportDue, reported, bbAgreed, saving, decision | Requester |
| Release | id, q, type, amount, note, status, dt, decision | Requester |
| Carry-over | id, line, amount, po, poDate, vendor, status, paid, due | Vendor name of an individual |
| Progress report | pct, status, issue, next, t, by | Reporter |
| Quarterly report | round, unit, status, items (result, problem, fix), evidence, certified, t, by | Sender; evidence files may show people |
| Output, KPI result, unit cost | name, unit, target, result, kpi, retired | None |
| Evaluation, recommendation | id, proj, status, scores, findings, lessons; id, text, src, unit, due, status, action, idea | Evaluators |
| Agent run, scenario, anomaly | id, agent, steps, status, memo; id, name, kind, params; id, kind, unit, risk, status, reopened | Starter, owner, reviewer |
| Budget settings | rules, workflow step w3, committee, targets, fc, sig, r3 | Committee members |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-DR-001 | The system shall record every change of an amount with who, when, old value, new value and reason, from the request to the act. | - | M | T | Partial | 42-review.js; 47-allocation.js |
| BGT-DR-002 | The system shall keep a version of a request when its lines change, and at director approval, and shall never overwrite an earlier version. | - | M | T | Partial | 41b-reqtabs.js snapshot |
| BGT-DR-003 | The system shall compute every total from its items and shall hold no typed total. | - | M | T | Partial | 41d-req-b1.js syncBudget |
| BGT-DR-004 | The system shall keep a cancelled line with its former amount and cancellation record, so transfers and contracts that name it still resolve. | - | M | T | Partial | 77-alloc-crud.js alLine cancel |
| BGT-DR-005 | The system shall issue request, line, transfer, release, carry-over, batch and revision numbers per fiscal year and shall hold the numbers of deleted drafts so they are never issued again (BR-BGT-37). | - | M | T | Partial | 77-alloc-crud.js crNo; 45b-strategy-depth.js nextReqId |
| BGT-DR-006 | The system shall hold money as a whole number of baht, and amounts entered in million baht shall be converted without loss. | - | M | I | Partial | 76-crud.js crMoney |
| BGT-DR-007 | The system shall store request documents and report evidence as files linked to their records. | - | M | T | Planned | - |
| BGT-DR-008 | The system shall keep a closed year's monitoring data as read-only history. | - | S | T | Partial | 80-live-year.js seedLiveYear |
| BGT-DR-009 | The system shall classify the personal data in the table above in the platform's records of processing, including committee votes. | - | M | I | Planned | - |
| BGT-DR-010 | The system shall apply a retention period to budget records as the tenant setting states, and shall destroy data only when the period ends. | - | M | I | Planned | - |

> [!OPEN] The retention period of budget records is not set (BGT-DR-010). The budget specialist must state the legal minimum. The product owner then sets the allowed range of the tenant setting (OI-BGT-10).

## State rules {#bgt-states}

State names are the values in the code. Requirements above give the checks and the actor for each change.

| Request status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| draft | Being prepared; counted in the unit total | unit; deleted; cancelled | Owner sends; owner deletes one never sent; owner cancels one sent before |
| unit | Waiting for the director | plan; returned; draft | Director decides; owner withdraws |
| plan | Waiting for Planning | committee; exec; returned; draft | Planning passes it under BR-BGT-14 or returns it; owner withdraws |
| committee | On the committee agenda | approved; returned; rejected; draft | Resolution approves or cuts, defers, rejects; owner withdraws |
| exec | Waiting for the executive | approved; returned; draft | Executive decides; owner withdraws |
| returned | Back with the owner | unit; cancelled | Owner sends again or cancels |
| approved | Approved internally; waits for a batch | - | Stays approved through submission and the act; `sub` and `inAct` show how far it went |
| rejected | Refused, final | - | - |
| cancelled | Cancelled, final; out of totals | - | - |

| Batch status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| prep | Being prepared; one at a time | sent; cancelled | Planning sends after the minister's approval; Planning cancels with a reason |
| sent | With the Budget Bureau | reviewing | Planning records receipt |
| reviewing | Under review | result | Planning saves results |
| result | Results recorded | closed | Every revision request is answered |
| closed | Handed to allocation, final | - | - |
| cancelled | Cancelled, final; requests wait again | - | - |

| Line status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| draft | Not counted | active; deleted | Finance confirms or deletes it |
| active | Counted in the allocation | cancelled | Finance cancels an unused line with a reason |
| cancelled | Final; amount 0, record kept | - | - |

| Transfer status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| pending | Internal approval | approved; bb; rejected; withdrawn | Approver of the type decides; Finance withdraws |
| blocked (derived) | A pending T4 needs the Cabinet | withdrawn | Finance withdraws |
| bb | Waiting for the Budget Bureau | approved; rejected | Planning or Finance records the answer |
| approved | In effect; the money has moved | - | A T1 stays open until it is marked reported |
| rejected, withdrawn | Final | - | - |

| Other record | States | Note |
| --- | --- | --- |
| Project idea | proposed, screened, accepted, declined, withdrawn, converted | Requirements in the strategy group |
| Plan revision | pending, approved, rejected, withdrawn | The approval changes the target |
| Meeting, hearing | scheduled, held, cancelled | Minutes lock when certified |
| Release | pending, approved, rejected, withdrawn | The Budget Bureau decides |
| Carry-over request | pending, approved, rejected, withdrawn | The executive decides |
| Carried money | open, extension, extended, closed | Closed when paid in full |
| Quarterly report | draft, submitted, accepted, returned | Certification of evidence is separate |
| Recommendation | open, doing, done | Overdue is a marker |
| Agent run | running, waiting, stopped, done, cancelled | Each step has its own state |
| Anomaly | new, explained, escalated | Reopening returns it to new |

> [!NOTE] The design lists later request states up to allocated. The code keeps `approved` and adds markers, so the production states are decided in the SDS (DG-BGT-01). Fiscal year status belongs to PLT.

## Interface requirements {#bgt-interfaces}

Budget has no live external connection in the prototype. The table shows what each interface does today.

| Interface | Direction | In the prototype |
| --- | --- | --- |
| e-Budgeting, BBL | Out and in | Simulated: file names and a CSV to copy; results are typed or simulated |
| BB EvMIS | Out | Not built |
| GFMIS | In | Simulated disbursement file with a fixed factor per line and month |
| Procurement, Finance | Internal | Real within the prototype: lines, reservations, commitments, payments |
| Projects, Review | Internal | Read from the shared state |
| Public page | Out | A preview and a record of approval; no website |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-IR-001 | The system shall give Procurement and Finance one interface to read a line, read its available amount, reserve, release, commit, adjust a commitment and record a payment, and shall let Projects read lines with no right to write. | BPA 40 | M | T | Partial | 60-procurement.js famHeadroom, famReserved, famCommitted |
| BGT-IR-002 | The system shall give Procurement the reviewed budget request items for next year's demand. | - | S | T | Partial | 84-proc-crud.js ppNextPanel |
| BGT-IR-003 | The system shall export requests and line detail in a file for e-Budgeting, and shall import Budget Bureau results through an adapter that can change from file to API with no change to the batch logic. | - | M | T | Planned | - |
| BGT-IR-004 | The system shall export work and spending plans and quarterly reports for BB EvMIS in the layouts of forms 301 and 302. | - | M | T | Planned | - |
| BGT-IR-005 | The system shall import GFMIS disbursement and carry-over data per line and month in Finance (FIN-IR-008), shall log the counts and shall give the same result when a file is imported twice, and Budget shall read the result with no import of its own. | - | M | T | Partial | 80-live-year.js simDisb; 40b-monitor-tabs.js |
| BGT-IR-006 | The system shall publish request, batch, line, transfer and report events for Projects, Review and notifications. | - | S | T | Planned | - |
| BGT-IR-007 | The system shall publish approved results to a public page outside the sign-in area. | BPA 47 | C | T | Planned | - |

> [!OPEN] The Budget Bureau must confirm these contracts before BGT-IR-003 and BGT-IR-004 can be built: the e-Budgeting, BBL and BB EvMIS file layouts, whether an API is open to agencies, and how results are returned. The Comptroller General's Department must confirm the GFMIS report layout (OI-BGT-04).

## Non-functional requirements specific to Budget {#bgt-nfr}

Budget meets all rows of the cross-cutting chapter, and they are not repeated here. Budget needs roles, the duty rule engine, delegation, notifications and the audit log from PLT. This table adds only what is particular to Budget.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-NFR-001 | Every approval, rejection, cancellation, amount change, settings change and import in Budget shall write an audit entry with actor and item. | - | M | T | Partial | audit() calls in 41 to 49, 69, 77 to 82 |
| BGT-NFR-002 | A cut, a transfer and a change of round amount shall recompute every dependent total in the same action. | - | M | T | Partial | 41d-req-b1.js syncBudget; 80-live-year.js syncDash |
| BGT-NFR-003 | Every deadline in Budget shall show its source, and day counts shall use one calendar (BR-PLT-22). | - | S | D | Partial | 47d-alloc-b4.js dueText |
| BGT-NFR-004 | Screens shall exist in Thai and English. Generated packs, minutes and letters shall be in Thai. | - | S | D | Partial | L() labels; 42d-review-b3.js minutes |
| BGT-NFR-005 | Every simulated action shall be labelled on screen, and simulation controls and the demo date shall not exist in a production tenant. | - | M | I | Partial | 79-sub-crud.js sbSim; 80-live-year.js setAsOf |
| BGT-NFR-006 | A forecast shall give the same result for the same data, and shall show its range and assumptions. | - | S | T | Partial | 69-budget-ai.js fcYear |
| BGT-NFR-007 | A unit shall see only its own requests, reports and replies, and committee votes shall be visible only to the committee, Planning and the auditor. | - | M | T | Partial | 41-requests.js unitRole |

### Design and implementation constraints {#bgt-cr}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| BGT-CR-001 | The system shall not submit to the Budget Bureau, the Cabinet or parliament. Those decisions stay outside, and Fisko prepares, exports and records them. | - | M | I | Partial | 79-sub-crud.js |
| BGT-CR-002 | Every legal limit shall be a dated rule in code (ADR-0007), every value a tenant may choose shall be a tenant setting within that limit, and no such number shall be fixed in screen text. | - | M | I | Partial | 41d-req-b1.js seed rules; 69b-budget-settings.js |
| BGT-CR-003 | Agency specifics shall live only in tenant data, including the budget structure, ceilings and calendar. | - | M | I | Partial | 11-data and 96-data files hold agency samples |
| BGT-CR-004 | State changes shall be enforced on the server in code, following ADR-0007, and screens shall not be the only guard. | - | M | I | Planned | - |
| BGT-CR-005 | Budget shall be a module of the monolith in ADR-0002, shall depend only on Platform, and shall be reached only through its module interfaces. | - | M | I | Planned | - |
| BGT-CR-006 | Budget events shall go to the tamper-evident audit log of ADR-0015. | - | M | I | Planned | - |

## Test evidence {#bgt-tests}

A Prototyped row rests on one of the checks below in `tests/sweep.js`. Each drives the real actions and raises an error when the result is wrong. The author read these checks and did not run them for this version.

| Sweep check | What it asserts | Related requirements |
| --- | --- | --- |
| E2E walk | An idea is accepted; a sent request withdraws to draft; a held meeting leaves an approved request with a decided amount; a confirmed line raises the allocation; a transfer ends approved; a carry-over ends approved; a recommendation becomes an idea | BGT-FR-011, BGT-FR-035, BGT-FR-072, BGT-FR-100, BGT-FR-119, BGT-FR-127, BGT-FR-154 |
| C3 walk | A batch goes through send, receipt, results and a revision to closed; a button builds next year's lines from the act | BGT-FR-083, BGT-FR-095 |
| Round C4 pass | Moved to March and September, every B8, B9 and B1 tab shows the banner, and the dashboard is the live year | BGT-FR-133, BGT-FR-141 |
| Budget pages pass | Every old tab key shows on the tab that holds it, and seven deep links open the right page | BGT-FR-002, BGT-FR-003 |

The sweep also opens every Budget page, tab, request step, record drawer and form for the listed roles, and fails on a thrown error or broken text such as `undefined`. That proves the page renders and does not prove its behaviour, so those rows stay Partial. The E2E walk sets a request back to `plan` directly after its withdrawal, and it runs several actions that it does not check afterwards, such as issuing ceilings and recording a release. The agents suite starts each budget agent and opens its run, with no approval of a step. The demo suite opens the page of each step with no assertion. No sweep check tests a refused rule in Budget: no block rule, duty rule, quorum refusal, transfer limit or carry-over check is asserted. The sweep does not save the budget settings or business rules.

## Open issues of Budget {#bgt-open}

| Issue | Question | Needed from | Effect on this chapter |
| --- | --- | --- | --- |
| OI-BGT-01 | Confirm every BPA section in the register for this chapter | Budget specialist | Clause column |
| OI-BGT-02 | Read the regulation with its second amendment of 2567, and confirm clauses 9, 15, 16, 18, 21, 25 to 29, 33 to 36. The design marks clauses 25 to 29 and 34 as the ones to check first | Budget specialist | BR-BGT-26 to BR-BGT-33 |
| OI-BGT-03 | Which rule values are legal limits, the allowed range of the others, and whether the transfer table is a yearly setting. The full criteria under clause 28 were not read, so T1 and T2 may differ | Budget specialist, product owner | BR-BGT-09, BR-BGT-10, BR-BGT-26, BGT-FR-161 |
| OI-BGT-04 | File layouts and API access for e-Budgeting, BBL, BB EvMIS and GFMIS | Budget Bureau, Comptroller General's Department | BGT-IR-003, BGT-IR-004, BGT-IR-005 |
| OI-BGT-05 | A transfer at `bb` holds no money. Fix it and add a check Fixed in round 67, with a sweep check. | Development team | BGT-FR-117, BGT-FR-114 |
| OI-BGT-06 | SD-09 has a check since round 67, so one person cannot request and approve the same transfer. SD-10 still has no switch or log (OI-PLT-04) | Development team, BGT owner | BGT-FR-124, BGT-FR-070 |
| OI-BGT-07 | `nextReqId` takes the highest live number plus one, so deleting the newest draft reuses its number. A transfer from AG-15 numbers from the list length while the screen uses a counter, so the two can clash. Use one counter Fixed in round 68. | Development team | BGT-FR-034, BGT-DR-005 |
| OI-BGT-08 | A draft line offers activities from the year being formulated even for the year being spent, so its programme and output may come from another year's structure | Development team | BGT-FR-098 |
| OI-BGT-09 | The carry-over page fixes the text of the deadline date, and investment quarterly targets stay in code | Development team | BGT-CR-002, BGT-FR-134 |
| OI-BGT-10 | Retention of budget records | Budget specialist, product owner | BGT-DR-010 |
| OI-BGT-11 | Spending targets are level B values from an earlier year, and forecast, signal and 3R values are level C. Who sets them each year? | Budget specialist, product owner | BGT-FR-160 |
| OI-BGT-12 | Whole baht or satang for amounts. Budget lines use million-baht inputs, and GFMIS carries satang | Budget specialist, product owner | BGT-DR-006 |
| OI-BGT-13 | Who may approve a T2, given that clause 28 may let the agency decide it, and whether the delegation scope `transfer` also covers Finance for T1 | Budget specialist, legal unit | BR-BGT-27 |
| OI-BGT-14 | The AI scope and where the model runs | Product owner, data protection officer | BGT-FR-174 |

The design documents and the code differ in the following places. The code says what exists, the design says what is intended, and each difference is carried by the row named.

| Topic | Design | Code | Row |
| --- | --- | --- | --- |
| Structure levels | Five levels with service goals | Programme, output, activity | BGT-FR-158 |
| Request form | Seven steps | Four steps plus optional tabs; the first holds lines and justification | BGT-FR-022 |
| Round amounts | Request, Planning, committee, executive, Budget Bureau, act, with cut reasons from a closed list | r0, r1, r2, `decided`, batch result, bill final; a free text reason of any length | BGT-FR-060, BGT-FR-061 |
| Request states after approval | Filed, under review, received, in the act, allocated | `approved` with markers | DG-BGT-01 |
| Cut elasticity | A value per KPI | Direct proportion only | BR-BGT-17 |
| Cross-agency transfer | T5, closed by the system | No T5 and no secret funds flag; lines belong to one agency | BGT-FR-122 |
| Available balance | Allotted less reserved, committed and paid without commitment | Allotted less reserved and committed, where committed includes other Finance commitments | BR-BGT-25 |
| T1 approver | Head of the agency or a delegate | Finance role | BR-BGT-27 |
| Allotment states | Not approved, approved, sent on | Approved on confirmation; regional lines add sent | BGT-FR-110 |
| Spending plan states | Draft, sent, agreed, revised | A sent date and a list of versions | BGT-FR-107 |
| Carry-over to the next year | An approved carry-over creates a line next year (FL-09) | Status only; no line is created | BGT-FR-130 |
| Quarterly report rounds | Open every quarter | The form locks Q1 to Q3 and only Q4 and the year are editable | BGT-FR-145 |
| Forecast FC-B1 | Uses signing probabilities from Procurement | Probability by budget type from the settings | BGT-FR-167 |
| Agents AG-01, AG-06 | Multi-step | Not in the agent engine; single answers and drafts only | BGT-FR-163 |
| Withdrawn appeal | Kept with a marker | Deleted from the record, with the reason in the audit log | BGT-FR-091 |
| Exports | Files in the Budget Bureau layouts | A CSV to copy and simulated file names | BGT-IR-003 |

## Status summary {#bgt-status}

The statuses in this chapter come from reading the code and the tests. The sweep was not run for this version, and nothing here is production code. Most Partial rows have working code and a page-open sweep only, so a specific check would raise them to Prototyped without any new feature.

{{status-summary: prefix=BGT}}
