# Module: Procurement {#prc}

## Purpose and scope {#prc-purpose}

Procurement takes an agency from the yearly procurement plan to the closed case file. Staff keep a plan tied to Budget allocation lines, raise requisitions, run each purchase as a case file of 12 steps, manage contracts, phases, acceptance, penalties and guarantees, and pass accepted work to Finance for payment.

The official procurement steps stay in e-GP. Fisko prepares the work, checks it against the rules, records what happened in e-GP and tracks everything after the award. No production code exists yet, so this chapter was read from the prototype code and its sweep tests. Where the design documents ask for more than the code does, the row is Partial or Planned and the difference is listed under the open issues.

| Component | State in the prototype | Evidence |
| --- | --- | --- |
| Plan, requisitions, case file and contracts | Built, with action walks in the sweep | Sweep walks PC1, PC2, PC3, PC4 and round 59 |
| Penalties and waivers | Built; the waiver and the service minimum have checks | Sweep walk PC4 and round 66 |
| Features behind profile switches: hearing, RFQ, bid security, sample tests, drawings, committee fees, forms, conflict-of-interest report, entity check | Built, with no action walk | Page-open sweep only, and only for the switches that are on in the seeded profile |
| Analytics, red flags, forecasts, what-if and OCDS export | Built, with no action walk | Page-open sweep only |
| AI tools and agents | Rules and statistics only; no model is called | Page-open sweep of each AI tool; agents are not started by the sweep |
| Document reading (OCR) | Simulated with fixed results | Page-open sweep only |
| e-GP, e-mail, e-signature, entity lookup, central appeals body, supplier sign-in | Simulated; nothing leaves the prototype | `60-procurement.js`, `71-t2.js`, `73-t4.js` |

Outside this chapter: roles, separation-of-duties engine, delegation and the audit log (PLT), allocation lines and their amounts (BGT), vouchers, payments and reconciliation (FIN), and security, performance, availability and accessibility (cross-cutting chapter). This chapter states only what Procurement needs from them.

## Actors {#prc-actors}

| Actor | Role in Procurement | Prototype role |
| --- | --- | --- |
| Requester | Raises and corrects requisitions for its own unit; explains red flags on its own items | `div`, `divhead` |
| Procurement officer | Keeps the plan, runs case files, records e-GP data, drafts contracts, records guarantees and deliveries, sends letters | `proc` |
| Head of procurement | Has the officer's rights, and also approves methods, TOR templates and smaller contract changes, decides appeals, forfeits bid security, releases blacklist matches, publishes the monthly summary | `prochead` |
| Authorised approver | Approves plan versions, requisitions, larger contract changes, penalty waivers and terminations, directly or by spend delegation | `exec`, or a delegate of `exec` |
| Committee member | Declares conflicts of interest, scores bids, signs acceptance | Any active user who is not `admin`, `proc` or `prochead` |
| Finance officer | Records invoices, requests payment through Finance, receives commitment notices | `fin`, `finhead` |
| Auditor | Reads Procurement records, within PRC-NFR-007 for bid prices, triages and decides red flags, compiles audit dossiers | `audit` |
| Administrator | Maintains method rules, procurement settings, the holiday list, categories and the procurement profile | `admin` |
| Supplier (external) | Answers RFQs, sees its own contracts, sends invoices and asks to change its bank account | `vendor`, simulated |
| Supervisor | Reports weekly progress on a contract. The prototype records the name only, and the officer enters the report | No role |
| AI agents | Case Copilot (AG-11), Contract Watch (AG-12), Compliance Reporter (AG-13), Procurement Insight (AG-10) | Rule functions |
| External systems | e-GP, GFMIS through Finance, the central appeals body | Simulated |

## Use cases {#prc-usecases}

The table replaces a use case diagram. Each use case names the actor who starts it, what starts it and what is true afterwards.

| ID | Name | Actor | Trigger | Outcome |
| --- | --- | --- | --- | --- |
| UC-PRC-01 | Maintain plan items | Procurement officer | A need or an allocation line has no plan item | The item and its case file exist at step 1 |
| UC-PRC-02 | Publish a plan version | Officer, approver | The plan differs from the approved version | A new version is approved and its e-GP notice is recorded |
| UC-PRC-03 | Raise a requisition | Requester, or officer on its behalf | A published item is due | The requisition is waiting for approval and the amount is reserved |
| UC-PRC-04 | Decide a requisition | Authorised approver | A requisition is pending | Approved, returned or rejected; the case moves to match |
| UC-PRC-05 | Choose the method | Officer, head | The case is at step 3 | The method is recorded, approved by the head when it needs to be |
| UC-PRC-06 | Prepare the TOR and reference price | Officer, committee | The case is at step 4 | Reference price, TOR, committee, criteria and hearing are complete |
| UC-PRC-07 | Record the notice and bids | Officer | The notice runs in e-GP | The e-GP details, bidder count and bids are recorded |
| UC-PRC-08 | Evaluate and award | Committee, officer | Bids have closed | Members have declared and scored, and the winner is recorded |
| UC-PRC-09 | Handle an appeal | Officer, head | A bidder appeals | The appeal is dismissed, upheld or forwarded to the central body |
| UC-PRC-10 | Draft and sign the contract | Officer | The case is at step 8 | The contract is in force and commits the allocation line |
| UC-PRC-11 | Accept a delivery | Officer, committee | The supplier delivers a phase | The phase is accepted in full or in part, or a dissent is open |
| UC-PRC-12 | Send a phase to payment | Finance officer | A phase is accepted | The gate passes or holds the phase as an exception |
| UC-PRC-13 | Change a contract | Officer, head, approver | Amount or time must change | A new contract version exists |
| UC-PRC-14 | Waive a penalty | Officer, approver | A delay was not the supplier's fault | The net penalty falls and reaches the payable amount |
| UC-PRC-15 | Terminate a contract | Officer, approver | The supplier defaults | Open phases are cancelled, the guarantee is forfeited, the commitment falls |
| UC-PRC-16 | Close the case | Officer | All work is settled | The case is at step 12 and the contract is closed |
| UC-PRC-17 | Publish the monthly summary | Head of procurement | A month has awards | The report is published and its copy is kept |
| UC-PRC-18 | Triage a red flag | Auditor, head, officer | A signal is detected | The signal is closed, fixed, escalated or marked a false positive |
| UC-PRC-19 | Reply through the supplier portal | Supplier | An RFQ or an accepted phase waits | The price or invoice reaches the officer |
| UC-PRC-20 | Set the procurement profile | Administrator | A tenant starts or its rules change | Switches and settings match the kind of agency |

## Business rules {#prc-rules}

Business rules are conditions that several requirements share. The Source column gives the clause or the design rule number (R-nn, SD-nn, R-PC-nn). The last column says where a rule can be configured and the range the code accepts. A setting marked stored has a value in the data with no screen in the prototype, and a range for it is a proposal for the procurement specialist to confirm.

| ID | Rule | Source | Setting and allowed range |
| --- | --- | --- | --- |
| BR-PRC-01 | The advised method comes from the live method rules: a special reason uses the special rule, otherwise the value rule with the lowest ceiling that covers the reference price, or the plan estimate before there is one | R-01; PPA 56 | Tenant: method rules on or off, with an effective date. `specificMax` at least 1 baht, default 500,000 |
| BR-PRC-02 | A method that differs from the advice, or any special reason, needs a reason of at least 10 characters and the approval of a head who did not choose it | R-01 | Fixed in code |
| BR-PRC-03 | Split-purchase risk exists when a request is within the specific ceiling, another live request of the same kind in the same unit within the look-back is also within it, and the two sets total above it | R-02 | Tenant: `splitDays` 0 or more, default 90 |
| BR-PRC-04 | Room on a line is the allocation less signed contracts, pending and approved requisitions, other Finance commitments, budget advances and direct vouchers | R-03 | Fixed in code |
| BR-PRC-05 | A reference price needs an amount above zero and at least one basis: standard price list, past contract, several quotations, e-GP reference price or market research | R-04 | Fixed in code |
| BR-PRC-06 | A committee has a chair, at least (`minMembers` less 1) other members, an order number and a date | R-05 | Tenant: `minMembers` at least 2, default 3 |
| BR-PRC-07 | An acceptance committee needs at least 2 members, or 1 up to the single-inspector limit. A phase needs signatures from as many members as the committee has, at most 2 | R-PC-06 | Tenant: `singleInspectorMax` at least 1 baht, default 100,000 |
| BR-PRC-08 | Separation of duties applies to the person acting and to anyone who delegated to them: SD-01 requester and approver, SD-02 buyer and acceptance, SD-06 evaluation and acceptance, SD-07 declared conflict, SD-08 proposer and approver of a change | SD-01, SD-02, SD-06, SD-07, SD-08 | Tenant: each rule on or off by the administrator; switching one off notifies the auditor (PLT) |
| BR-PRC-09 | The appeal period ends a set number of working days after the award date, skipping weekends and the tenant holiday list. A method without an appeal flag has no period | R-06 | Tenant: `appealDays` 0 or more, default 7; holiday list; appeal flag per method rule |
| BR-PRC-10 | The supplier is always the winner. The amount cannot exceed the winning price or the requisition. Phases add up to the amount, and due dates run in order from the signing date | R-07; R-PC-04; R-PC-05 | Fixed in code; 1 to 6 phases |
| BR-PRC-11 | Approved changes of the same kind add up. Within the limit the head decides, above it the authorised approver | R-08 | Tenant: `ladderPct` 0 or more, default 10; `extDaysHead` 0 or more, default 30 |
| BR-PRC-12 | The daily penalty is a rate by contract kind applied to the phase amount, with a minimum per day for services and construction | R-09; PPR 162 | Tenant: `penGoods` and `penService` 0.01 to 0.20 percent a day, `penCons` 0.01 to 0.10, default 0.10 each; `penaltyMin` 0 or more baht a day, default 100 |
| BR-PRC-13 | Accrued penalties above the warning limit alert the head and the approver to consider termination | R-09 | Tenant: `penaltyCapPct` 0 or more percent of the contract, default 10 |
| BR-PRC-14 | General work is accepted on the delivery date. Construction is accepted within 3 working days, or 5 for the last phase. A rejection notice is due within 3 working days | R-10; PPR 175; PPR 176 | Tenant: `acceptWd` and `acceptWdLast` 0 or more, defaults 3 and 5; `rejectNoticeWd` stored, default 3 |
| BR-PRC-15 | A phase reaches Finance only when acceptance is complete with no open dissent, an invoice matches the contract, supplier and accepted amount, and the guarantee is in force. A failure is held as an exception. The missing GFMIS purchase order can never be released | R-11; R-PC-07 | Tenant: `invoiceTol` 0 or more baht, default 0; `poMin` in Finance, default 5,000 |
| BR-PRC-16 | A case closes when live phases are accepted and paid, the guarantee is returned or forfeited, the warranty has ended with no open defect (unless terminated), nothing is pending, and lessons of at least 10 characters are written | R-12; R-PC-08 | Fixed in code |
| BR-PRC-17 | The contract guarantee must meet the set percentage of the contract and last until at least the last due date | R-07 | Tenant: `guaranteePct` 0 or more, default 5; `guaranteeWarnDays` 0 or more, default 30 |
| BR-PRC-18 | Criteria weights total 100 and always include price. Price score is the lowest offer divided by the offer, times 100. Members enter the other scores and the system only adds them up | R-14 | Criteria per case until the announcement |
| BR-PRC-19 | Every member of a committee in use declares before the evaluation, and a member with a conflict is replaced before the result is recorded | R-13; SD-07 | SD-07 on or off |
| BR-PRC-20 | Termination is proposed with grounds and decided by the authorised approver. On approval unaccepted phases are cancelled, the amount falls to the accepted phases, the guarantee is forfeited and the supplier is proposed for the abandoned-work list | R-15 | Fixed in code |
| BR-PRC-21 | The warranty starts at the last acceptance. The guarantee can be returned once every live phase is paid, the warranty has ended and no defect is open | R-16 | Per contract; `warrantyMonths` stored, default 12, and 0 for services |
| BR-PRC-22 | A name or tax ID on the abandoned-work list blocks the award, the chosen quotation, RFQ invitation and the contract. Only the head can release a match, with evidence that it is a different entity | R-17 | List imported as a file |
| BR-PRC-23 | The monthly summary comes from cases with an award in the month, gaps block publishing, and the published copy does not change | R-18 | Layout to be confirmed |
| BR-PRC-24 | When the e-GP file is ahead of the case, the case shows a warning, and after the set days the officer gets a task | R-19 | `syncDays` stored, default 3 |
| BR-PRC-25 | With the bid security flag on, every bidder needs a security before the award. It returns after the award, or after the contract for the winner. Forfeiting needs the head and a reason | R-20 | Tenant: `bidSecReturnDays` 0 or more, default 15; `bidSecWarnDays` 0 or more, default 7 |
| BR-PRC-26 | A flagged item or a listed category needs a test result for every sample, and the winner needs a pass | R-21 | Tenant: categories that need tests |
| BR-PRC-27 | An appeal forwarded to the central body stops the local decision until the result is recorded | R-22 | Tenant: central body name; `appealFwdDays` 0 or more, default 30 |
| BR-PRC-28 | When a contract needs drawings, its first phase cannot be accepted until a drawing is approved, and a reply is due within the set days | R-23 | Tenant: `drawingReplyDays` 0 or more, default 45; categories that need drawings |
| BR-PRC-29 | A committee fee is the rate for the position times the paid meetings, within a monthly cap per person and a cap per case. The same person, committee and day is paid once | R-24 | Tenant: rates, `feeMonthCap` default 6,000, `feeCasePct` default 1, `feeMinAttendPct` 0 to 100, default 50, `feeLadder` default 20,000, all 0 or more |
| BR-PRC-30 | When the profile requires it, the TOR hearing is concluded before the announcement, and a revised TOR needs the head's approval | R-25 | Tenant: `hearingMin` 0 or more baht, default 5,000,000; `hearingDays` 0 or more, default 7 |
| BR-PRC-31 | SME and MiT preference applies only with the item flag and a valid certificate, uses the higher of the two, and never changes the offered price or picks a winner | R-26 | Tenant: `smePct` and `mitPct` 0 to 50, default 5 each |
| BR-PRC-32 | The selective method needs a minimum number of invited suppliers before the announcement | Design chapter 18 | Tenant: `rfqMin` at least 1, default 3; `rfqDays` 0 or more, default 3 |
| BR-PRC-33 | Record numbers are never reused, including those of deleted drafts | R-C-05 | Fixed in code |
| BR-PRC-34 | AI reads and drafts, and a person decides. AI never scores or ranks bids, selects a supplier, announces a winner or approves | Design chapter 8 | Fixed in code; each agent on or off; agent level L0 to L3, with L3 for AG-12 only. OI-REV-04 holds the conflict with BR-PLT-25 and ADR-0016 |

> [!OPEN] The stored settings have no screen and no enforced range: `warrantyMonths`, `rejectNoticeWd`, `syncDays`, `dueProgressMin`, `progressGap` and `supReportDays`. The procurement specialist must give an allowed range for each. The product owner decides which of them each tenant may change.

## Functional requirements {#prc-fr}

The requirements follow the order of the work. Each status rests on reading the code and the sweep, as explained in the status summary. The file and function in the Prototype column show where the behaviour is; a named sweep walk means that walk asserts the behaviour.

### Procurement plan and versions {#prc-fr-plan}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-001 | The system shall let a procurement officer add a plan item with an allocation line, name, estimate, planned date, category and planned method, and shall create its case file at step 1. | - | M | T | Prototyped | 84-proc-crud.js ppItem; sweep PC1 walk |
| PRC-FR-002 | The system shall allow a plan item to be edited only while its status is planned and it has no live requisition. | - | M | T | Partial | 84-proc-crud.js ppItem edit; sweep PC1 walk edits only |
| PRC-FR-003 | The system shall let an officer delete a plan item that was never in a proposed version and has no requisition, together with its case file, and shall never reuse its number. | - | S | T | Prototyped | 84-proc-crud.js ppItem del; sweep PC1 walk |
| PRC-FR-004 | The system shall let an officer cancel a plan item with a reason, shall take it out of the published plan, and shall show it as removed in the next plan version. | - | M | T | Prototyped | 84-proc-crud.js ppItem cancel; sweep PC1 walk |
| PRC-FR-005 | The system shall refuse to cancel a plan item or a requisition while a contract is in force, and cancelling an item shall also cancel its case and its open requisitions. | - | M | T | Partial | 84-proc-crud.js ppItem acts |
| PRC-FR-006 | The system shall let an officer propose a new plan version only when the plan differs from the latest approved version and no version is waiting, with a reason of at least 5 characters, and shall store a snapshot of every item with the items added, changed and removed. | - | M | T | Partial | 84-proc-crud.js pvVer create; 61c-planreports.js planDiff; sweep PC1 walk proposes one |
| PRC-FR-007 | The system shall let the authorised approver, who is not the proposer, approve a plan version, or reject it with a reason of at least 10 characters, and shall let an officer withdraw a waiting version with a reason. | - | M | T | Partial | 84-proc-crud.js pvVer ok; sweep PC1 walk approves only |
| PRC-FR-008 | The system shall let an officer record the e-GP notice number for the latest approved version, and shall treat its items as published from then on. | PPA 11 | M | T | Prototyped | 84-proc-crud.js pvVer pub; sweep PC1 walk |
| PRC-FR-009 | The system shall list allocation lines of the current year with no plan item, let an officer draft a plan item from a line, and flag items of reviewed budget requests whose names are at least 45 percent similar as candidates to buy together. | - | S | D | Partial | 61c-planreports.js demand |
| PRC-FR-010 | The system shall let an officer turn an item of a reviewed budget request into a draft item of next year's plan, which can be requisitioned only once that year has allocation lines. | - | S | D | Partial | 84-proc-crud.js ppNextPanel; sweep PC1 walk opens the page |
| PRC-FR-011 | The system shall let the administrator add procurement categories, each with a kind of work, and shall use the category's kind for its plan items. | - | C | D | Partial | 61c-planreports.js ADMIN.procrules |

### Requisitions {#prc-fr-reqn}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-012 | The system shall let staff of the owning unit raise a requisition from a published plan item as a draft, with an amount, a needed-by date and a justification. | - | M | T | Prototyped | 84-proc-crud.js pcReq create; sweep PC1 walk |
| PRC-FR-013 | The system shall refuse a plan estimate or a requisition amount below 1,000 baht. | - | M | T | Partial | 76-crud.js money field; 84-proc-crud.js fields |
| PRC-FR-014 | The system shall let a procurement officer raise a requisition on behalf of a unit and shall record that unit on it. | - | S | D | Partial | 84-proc-crud.js ppCanRaise, forUnit |
| PRC-FR-015 | The system shall refuse a requisition for an item that is not in the published plan version. | PPA 11 | M | T | Partial | 84-proc-crud.js ppCanRaise, rqProblem |
| PRC-FR-016 | The system shall let the requester send a draft or returned requisition, changing it to pending. | - | M | T | Prototyped | 84-proc-crud.js pcReq send; sweep PC1 walk |
| PRC-FR-017 | The system shall refuse to send or approve a requisition above the room on its allocation line (BR-PRC-04), and shall reserve the amount of a pending or approved requisition. | - | M | T | Partial | 60-procurement.js famHeadroom, famReserved; 84-proc-crud.js rqProblem |
| PRC-FR-018 | The system shall let the requester withdraw a pending requisition with a reason, returning it to draft and the case to step 1. | - | M | T | Prototyped | 84-proc-crud.js pcReq wd; sweep PC1 walk |
| PRC-FR-019 | The system shall let the approver return a pending requisition for changes with a reason, and the requester shall be able to edit and send it again. | - | M | T | Prototyped | 84-proc-crud.js pcReq ret; sweep PC1 walk |
| PRC-FR-020 | The system shall let the approver approve a pending requisition, changing it to approved and the case to step 3. | - | M | T | Prototyped | 84-proc-crud.js pcReq ok; sweep PC1 walk |
| PRC-FR-021 | The system shall refuse approval by the requester or by anyone holding the requester's authority (SD-01) and shall log the blocked attempt. | - | M | T | Partial | 64-duties.js sodCheck SD-01; 84-proc-crud.js pcReq ok |
| PRC-FR-022 | The system shall let the approver reject a pending requisition with a reason of at least 10 characters, returning the plan item to planned and the case to step 1. | - | M | T | Partial | 84-proc-crud.js pcReq no |
| PRC-FR-023 | The system shall let the approver or the head cancel an approved requisition with a reason, cancelling the case and returning the plan item to planned. | - | M | T | Prototyped | 84-proc-crud.js pcReq cancel; sweep PC1 walk |
| PRC-FR-024 | The system shall refuse to send a requisition with split-purchase risk (BR-PRC-03) until it carries an explanation of at least 10 characters, and shall then notify the head and the auditor. | - | S | T | Partial | 61-cases.js splitRisk; 84-proc-crud.js rqProblem |
| PRC-FR-025 | The system shall let the requester delete a draft that was never sent, and shall never reuse its number. | - | C | T | Partial | 84-proc-crud.js pcReq del |

### Case file and steps {#prc-fr-case}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-026 | The system shall keep one case file per plan item and shall show its step out of 12, using the states in the state rules, with steps 9 to 12 derived from acceptance, payment and closing. | - | M | D | Partial | 61-cases.js CASE_STATES, caseState, stepper |
| PRC-FR-027 | The system shall refuse to move a case to the next step while any check of the current step is unmet, and shall name the first unmet check. | - | M | T | Partial | 61-cases.js caseChecks, caseMove |
| PRC-FR-028 | The system shall show for each case who acts next and what they must do, in a list filtered by group and unit and on a board of four columns. | - | S | D | Partial | 61-cases.js caseNext; 61d-ui-board.js caseCard |
| PRC-FR-029 | The system shall record every case event with time, type, actor, detail and step, and shall show them as the case timeline. | - | M | T | Partial | 61-cases.js caseLog |
| PRC-FR-030 | The system shall let an officer mark a case at steps 4 to 7 as failed with a reason, moving it to step 4, keeping its bids in a read-only round, and starting the next round with no bids and no e-GP notice. | - | M | T | Prototyped | 61-cases.js caseArchive, caseFail; sweep PC2 walk |
| PRC-FR-031 | The system shall let an officer cancel a case at steps 2 to 8 with a reason, clearing its method and keeping the round in the case history. | - | M | T | Prototyped | 61-cases.js caseCancel; sweep PC2 walk |
| PRC-FR-032 | A round shall also keep its e-GP notice, scores, quotations, award, appeal and evaluation declarations, and a cancellation shall also cancel the requisition and clear the reference price, TOR, criteria and committees. | - | M | T | Partial | 61-cases.js caseArchive, caseCancel |
| PRC-FR-033 | The system shall refuse a reason shorter than 10 characters on every drawer action that asks for one, unless the action sets its own minimum. | - | M | T | Partial | 76-crud.js CR_WHY_MIN |
| PRC-FR-034 | The system shall hold item details on the case: quality standard, specification or drawing number, short list, delivery date and place, flags for hearing, SME, MiT, bid security and sample test, and an amount shown with and without VAT at the tenant rate. | - | S | D | Partial | 70-profile.js ex-form, VAT_CALC |
| PRC-FR-035 | The system shall let the auditor and procurement staff compile a dossier of one case from its records, covering every step from the requisition to the timeline, and shall log each compilation. | - | S | D | Partial | 61c-planreports.js dossierText |

### Method selection and rules table {#prc-fr-method}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-036 | The system shall advise a method for a case from the live rules (BR-PRC-01) and shall show the rule id, its confidence level and the reason. | PPA 56 | M | T | Partial | 61-cases.js recommendMethod |
| PRC-FR-037 | The system shall support the methods specific selection, e-bidding, selective and e-market, and the kinds goods, services, construction, and consulting and design. | - | M | I | Partial | 60-procurement.js PMETHOD; 61-cases.js PMETHOD, KINDS |
| PRC-FR-038 | The system shall refuse the specific method above the ceiling unless the case has a special reason: unforeseeable emergency, sole source or repeat purchase. | PPA 56 | M | T | Partial | 61-cases.js mt-form |
| PRC-FR-039 | The system shall apply BR-PRC-02 and shall let the head reject a method with a reason of at least 10 characters, which clears the method so it can be chosen again. | - | M | T | Partial | 61-cases.js mt-form, head, headDo |
| PRC-FR-040 | The system shall hold the method rules as data with id, condition, method, kind, ceiling, committees, appeal flag, confidence level, effective date and on or off, and shall ignore a rule before its effective date. | - | M | D | Partial | 61-cases.js ADMIN.procrules, S.mrules |
| PRC-FR-041 | The system shall let the administrator switch a method rule on or off, shall record the change, and shall notify the auditor and the head when a rule is switched off. | - | S | T | Partial | 61-cases.js BIND_ADMIN.procrules |
| PRC-FR-042 | The system shall let the administrator change the general procurement settings within the ranges in the business rules, and shall refuse a value outside them. | PPR 162 | M | T | Partial | 61-cases.js BIND_ADMIN.procrules pc-save |
| PRC-FR-043 | The system shall let the administrator keep a holiday list and shall skip those days and weekends when it counts working days. | - | M | T | Partial | 61-cases.js addWorkdays, hol-form |
| PRC-FR-044 | The system shall store with each method decision the id and effective date of the rule that was used, as separate fields. | - | S | I | Planned | - |
| PRC-FR-045 | The system shall offer the small-budget method to tenants that enable it in the profile. | - | C | T | Planned | 70-profile.js PROF_FEATS smallBudget, switch only |

> [!NOTE] Before round 67 the settings form could not save, because `61-cases.js` rounded each penalty rate to a whole number. Rates now keep their decimals, and the sweep saves one. It does not yet test a refused value, so PRC-FR-042 stays Partial.

### TOR and market research {#prc-fr-tor}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-046 | The system shall keep a library of TOR templates by kind of work with numbered versions, shall let an officer propose a version with a reason of at least 5 characters, and shall let a head other than the proposer approve it. | - | S | T | Partial | 61b-sourcing.js PROC.tor, bindTor |
| PRC-FR-047 | The system shall let staff create a new TOR template and reject a proposed version with a reason. | - | C | D | Planned | - |
| PRC-FR-048 | The system shall let an officer attach a TOR to a case at step 4 from the latest approved template version, and detach it again before the announcement with an undo. | - | M | T | Partial | 61-cases.js tor-attach, tor-detach; 61b-sourcing.js torPicker |
| PRC-FR-049 | The system shall require a reference price at step 4 for every method (BR-PRC-05) and shall show its difference from the plan estimate. | - | M | T | Partial | 61-cases.js ref-form |
| PRC-FR-050 | The system shall let an officer add, edit and delete market research entries with supplier, price, source, date and note at steps 3 and 4, and shall show their median and range. | - | S | T | Partial | 85-case-crud.js csMkt; 61b-sourcing.js panel |
| PRC-FR-051 | The system shall compare the reference price with the last contract in the same category, and shall let an officer import price indices as name, date and value lines, skipping malformed lines. | - | C | D | Partial | 70-profile.js lastPurchase, ix-add |
| PRC-FR-052 | When BR-PRC-30 applies, the system shall require a concluded hearing before the case leaves step 4, with a numbered notice, a period, comments with responses, and a conclusion of at least 5 characters, and shall require a reason of at least 5 characters to close before the end date. | - | S | T | Partial | 70-profile.js hearingReq, hr-open, hr-close |
| PRC-FR-053 | The system shall hold a case whose hearing changes the TOR until a head other than the proposer approves the revised TOR, shall number the new version, and shall allow the hearing to be reopened. | - | S | T | Partial | 70-profile.js hr-revok, hr-again |

### e-GP notice and bids {#prc-fr-egp}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-054 | The system shall require the e-GP project number, announcement date and closing date, with the closing date not before the announcement, before a competitive case leaves step 4. | - | M | T | Partial | 61-cases.js egp-form |
| PRC-FR-055 | The system shall let an officer correct the e-GP number and closing date at step 5, before bids close, with a reason, and shall keep the earlier values. | - | M | T | Prototyped | 88-proc-more.js egp-edit; sweep R59 walk |
| PRC-FR-056 | The system shall record questions and answers at step 5, and an amendment shall be able to move the closing date to a later date only. | - | S | D | Partial | 61b-sourcing.js qa-form |
| PRC-FR-057 | The system shall record the number of bidders after bids close, shall rerun the case when the number is zero, and shall raise signal RF-03 when it is one. | - | M | T | Partial | 61-cases.js bid-form, caseFail |
| PRC-FR-058 | The system shall let an officer add, correct and delete bids at step 6, with the bidder from the supplier register or typed. | - | M | T | Prototyped | 85-case-crud.js csBid; sweep PC2 walk |
| PRC-FR-059 | The system shall require a price above zero, shall lock bids once any member has entered a score, shall leave blacklisted suppliers out of the register choice, and shall refuse a duplicate bidder or more bids than the e-GP count. | - | M | T | Partial | 85-case-crud.js csBidEd, csScored |
| PRC-FR-060 | The system shall let an officer record quotations for a specific-method case at step 4, choose one, and move to step 7 only when the chosen price is within the approved amount. | - | M | T | Partial | 85-case-crud.js csQuote; 61-cases.js caseMove |
| PRC-FR-061 | The system shall issue a numbered RFQ or invitation letter to suppliers picked from the register, with a reply date not in the past, shall record replies, and shall apply BR-PRC-32. Sending is simulated. | - | S | T | Partial | 70-profile.js rq-form, rfqInvited |

### Bid evaluation {#prc-fr-eval}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-062 | The system shall let an officer add, edit and delete evaluation criteria at step 4, and shall refuse weights that total more than 100. | - | M | T | Prototyped | 88-proc-more.js csCrit; sweep R59 walk |
| PRC-FR-063 | The system shall offer lowest price and price-and-performance as starting sets, shall require weights of exactly 100 including price before the announcement, and shall lock the criteria after it. | - | M | T | Partial | 61b-sourcing.js critOk, crit-form |
| PRC-FR-064 | The system shall let each evaluation member enter scores of 0 to 100 per non-price criterion for each bidder, and an officer enter them from a signed sheet, and shall total them as BR-PRC-18 states. | - | M | T | Partial | 61b-sourcing.js totals, data-scsave |
| PRC-FR-065 | The system shall refuse the award until the committee is appointed, every member has declared with no conflict, bids match the e-GP count, and every member has scored. | - | M | T | Partial | 61b-sourcing.js caseChecks, bidsOk, scoresOk |
| PRC-FR-066 | The system shall record for each bid the maker, country, brand, model, catalogue or drawing number and deviation, and shall show the bidder's contract history next to it. | - | S | D | Partial | 71-t2.js bdform |
| PRC-FR-067 | The system shall show each bidder's price before and after SME and MiT preference, under BR-PRC-31. | - | S | T | Partial | 71-t2.js prefOf |
| PRC-FR-068 | When BR-PRC-26 applies, the system shall track each sample through received, sent, started, finished, notified and replied dates in that order, and shall accept a result only with the finish date, a report number and the notification date. | - | S | T | Partial | 71-t2.js testReq, testsOk, winnerTested, data-tssave |

### Appeal {#prc-fr-appeal}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-069 | The system shall compute the end of the appeal period at the award (BR-PRC-09) and shall show it on the case. | - | M | T | Partial | 61-cases.js award-form, addWorkdays |
| PRC-FR-070 | The system shall keep a case at step 7 until the appeal period is over and no appeal is open. | - | M | T | Partial | 61-cases.js caseChecks step 7 |
| PRC-FR-071 | The system shall record an appeal with appellant, filing date not in the future and grounds of at least 5 characters, and shall notify the head. | - | M | T | Partial | 61-cases.js ap-form |
| PRC-FR-072 | The system shall let the head dismiss or uphold an appeal with a reason of at least 10 characters. Upholding shall clear the award and return the case to step 6. | - | M | T | Partial | 61-cases.js ap-dismiss, ap-uphold |
| PRC-FR-073 | The system shall let the head withdraw an award with a reason of at least 10 characters before the appeal period ends, returning the case to step 6 and keeping the scores. | - | S | T | Partial | 85-case-crud.js pcCase unaward |
| PRC-FR-074 | When the appeal-forward switch is on, the system shall let an officer create a numbered appeal form to the central body, shall disable the local decision (BR-PRC-27), and shall apply the recorded result, with letter number and date, to the appeal. Sending is simulated. | - | S | T | Partial | 71-t2.js af-send, af-res |
| PRC-FR-075 | The system shall give the officer a task when 7 days or fewer remain before the expected result date, and shall mark the appeal when 3 days or fewer remain. | - | S | T | Partial | 71-t2.js famTasks, panel tags |

> [!OPEN] The appeal period of 7 working days comes from a secondary source, and the prototype simulates the end of the period with a button. The procurement specialist must confirm the period and the clause. The Comptroller General's Department must confirm how e-GP reports filed appeals to an agency.

### Award and letters {#prc-fr-award}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-076 | The system shall record the award with winner, price, date not in the future and committee resolution, moving the case to step 7, and shall take the price of a competitive case from the winner's bid. | - | M | T | Partial | 61-cases.js award-form; 61b-sourcing.js awardGuard |
| PRC-FR-077 | The system shall refuse an award above the approved amount, and shall require a reason when the price is above the reference price. | - | M | T | Partial | 61-cases.js award-form |
| PRC-FR-078 | The system shall require a reason of at least 10 characters when the winner does not have the top total score. | - | M | T | Partial | 61b-sourcing.js awardGuard |
| PRC-FR-079 | The system shall draft supplier letters from templates for delivery reminder, penalty notice, rejected work, defect repair and termination, shall refuse a penalty notice when there is no penalty, and shall record the date each letter was sent. | - | S | T | Partial | 63b-contract-late.js LETTER_T, letterText |
| PRC-FR-080 | The system shall show the due date of the rejected-work notice, counted from the first signature on a partly accepted or disputed phase, and shall give the officer a task until a notice is marked sent. | PPR 175 | M | T | Partial | 63b-contract-late.js rejectDue |

### Committees and conflict of interest {#prc-fr-committee}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-081 | The system shall let an officer appoint the committees a method requires, with order number, order date not in the future, chair and members (BR-PRC-06), and cancel an order until a member has declared. | - | M | T | Partial | 85-case-crud.js csCm |
| PRC-FR-082 | After a declaration the system shall allow a member to be replaced only with a reason, and shall refuse to remove a member who has scored. | - | M | T | Prototyped | 85-case-crud.js csCm check, edit; sweep R59 walk |
| PRC-FR-083 | The system shall record a declaration from each committee member, or from a paper form entered by an officer, and a declared conflict shall name the bidder and notify the head. | - | M | T | Partial | 61b-sourcing.js coiOf, coiOk, data-coi |
| PRC-FR-084 | The system shall apply BR-PRC-19: a member with a declared conflict blocks the step until replaced, and the new member shall declare. | - | M | T | Partial | 61b-sourcing.js data-coiswap |
| PRC-FR-085 | The system shall require the acceptance committee size in BR-PRC-07, shall leave out the person creating the contract, and shall refuse a member of the evaluation or purchasing committee of the same case (SD-06). | - | M | T | Partial | 86-con-crud.js pcCon check, conInspN |
| PRC-FR-086 | The system shall allow the acceptance committee of a signed contract to change only before the first acceptance signature, under the same SD-02 and SD-06 rules. | - | M | T | Partial | 60-procurement.js data-ccsave; 86-con-crud.js pcCon edit |
| PRC-FR-087 | The system shall record for each committee meeting the attendance and the resolution, and shall check a quorum of the chair and at least half of the members. | - | S | T | Planned | - |
| PRC-FR-088 | The system shall report declarations across all cases by member, shall let an officer prepare a report, a head other than the preparer approve it, and an officer export it as a CSV file. | - | S | T | Partial | 73-t4.js coiRows, PROC.coi |
| PRC-FR-089 | The system shall prepare committee fee claims from an attendance grid for one month under BR-PRC-29, and shall refuse a claim that passes the case cap or has no payable amount. | - | C | T | Partial | 72-t3.js feeCalc, PROC.fees |
| PRC-FR-090 | The system shall route a fee claim to the head up to the set amount and to the approver above it, shall refuse approval by the person who raised it, and shall require a reason of at least 3 characters to reject. | - | C | T | Partial | 72-t3.js decide |
| PRC-FR-091 | The system shall pass approved committee fee claims to Finance as a voucher. | - | C | T | Planned | - |

### Bid security {#prc-fr-bidsec}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-092 | With the bid security switch on and the item flagged, the system shall record for each bidder a security of cash, bank cheque, bank guarantee or government bond, with amount and a validity date after today, and shall refuse a second held security for the same bidder. | - | S | T | Partial | 71-t2.js bs-form |
| PRC-FR-093 | The system shall refuse the award until every bidder has a security (BR-PRC-25). | - | S | T | Partial | 71-t2.js caseChecks |
| PRC-FR-094 | The system shall let an officer extend a held security to a later date and shall keep the earlier dates. | - | C | T | Partial | 71-t2.js data-bsa ext |
| PRC-FR-095 | The system shall allow a return with a reason of at least 3 characters only after the award, and for the winner only after the contract, and shall give the officer a task when the return date has passed. | - | S | T | Partial | 71-t2.js bsRetDue, data-bsa ret |
| PRC-FR-096 | The system shall let only the head forfeit a security, with a reason of at least 10 characters. | - | S | T | Partial | 71-t2.js data-bsa forf |

### Contracts and phases {#prc-fr-contract}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-097 | The system shall let an officer draft a contract from a case at step 8, and a draft shall neither commit the allocation line nor move the case. | - | M | T | Prototyped | 86-con-crud.js pcCon create; sweep PC3 walk |
| PRC-FR-098 | The system shall fix the supplier to the award winner and shall refuse an amount above the winning price or the requisition, or a supplier on the abandoned-work list. | - | M | T | Partial | 86-con-crud.js pcCon fields, check |
| PRC-FR-099 | The system shall refuse a phase schedule whose amounts do not add up to the contract amount. | - | M | T | Prototyped | 86-con-crud.js conSched, check; sweep PC3 walk |
| PRC-FR-100 | The system shall hold 1 to 6 phases, each with an amount and a due date, and shall refuse a due date before the signing date or before the previous phase. | - | M | T | Partial | 86-con-crud.js pcCon check |
| PRC-FR-101 | The system shall let an officer edit the schedule of a draft and delete a draft, returning the case to the contracting step. | - | M | T | Prototyped | 86-con-crud.js pcCon edit, del; sweep PC3 walk |
| PRC-FR-102 | The system shall let an officer record the signing, which shall make the contract active, commit its amount on the allocation line and move the case to step 9. | - | M | T | Prototyped | 86-con-crud.js pcCon sign; sweep PC3 walk |
| PRC-FR-103 | The system shall refuse to record a signing date in the future. | - | M | T | Partial | 86-con-crud.js pcCon sign |
| PRC-FR-104 | When BR-PRC-28 applies, the system shall number each drawing round received, record approval or a send-back with a reason of at least 3 characters, alert the acceptance committee at receipt, and withhold the first phase's acceptance form until a drawing is approved. | - | C | T | Partial | 72-t3.js drwReq, drwDue, data-sgform guard |
| PRC-FR-105 | The system shall hold BOQ items with unit, quantity, unit price and kind, and shall show whether the BOQ total equals the contract amount. | - | C | T | Partial | 72-t3.js data-boqadd, boqTotal |
| PRC-FR-106 | The system shall accept serial numbers only after a delivery is noted, shall refuse the whole entry if any number is repeated on any contract, and shall refuse more numbers than the quantity. | - | C | T | Partial | 72-t3.js data-serf |

### Delivery and acceptance {#prc-fr-accept}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-107 | The system shall let an officer record a delivery in phase order, with a date not before the signing date, and shall notify the acceptance committee of the date to accept by. | - | M | T | Partial | 63-contracts.js data-dlform |
| PRC-FR-108 | The system shall save a delivery notice number with the delivery. | - | S | T | Prototyped | 88-proc-more.js data-dlsim; sweep R59 walk |
| PRC-FR-109 | The system shall show the date to accept by (BR-PRC-14) and shall mark an acceptance that passes it. | PPR 175, PPR 176 | M | T | Partial | 63-contracts.js acceptDue |
| PRC-FR-110 | The system shall let only a member of the acceptance committee sign a delivered phase, after the previous phase is accepted, with no open dissent, and shall refuse the contract's creator (SD-02). | - | M | T | Partial | 63-contracts.js data-sgform |
| PRC-FR-111 | The system shall treat a phase as accepted when it has the number of signatures in BR-PRC-07. | - | M | T | Prototyped | 60-procurement.js phaseAccepted; sweep PC3 walk |
| PRC-FR-112 | The system shall let a member withdraw their own signature before the acceptance is complete. | - | S | T | Prototyped | 87-proc-e2e.js data-sgwd; sweep PC4 walk |
| PRC-FR-113 | The system shall record a partial acceptance with an accepted amount below the phase amount and a note of at least 3 characters, and shall require later members to sign the same amount. | PPR 175 | M | T | Partial | 63-contracts.js data-sgform |
| PRC-FR-114 | The system shall record a dissent with a reason of at least 5 characters, shall stop further signatures on the phase, and shall let the head or the approver resolve it with an instruction of at least 5 characters. | PPR 175 | M | T | Partial | 63-contracts.js data-sgform, data-dsres |
| PRC-FR-115 | On acceptance the system shall record 2 certificates and shall notify Finance and procurement. | PPR 175 | M | T | Partial | 63-contracts.js data-sgform |
| PRC-FR-116 | The system shall let an officer return a recorded invoice with a reason, taking it off the phase. | - | M | T | Prototyped | 87-proc-e2e.js data-ivret; sweep PC4 walk |
| PRC-FR-117 | The system shall let procurement or Finance record an invoice for an accepted phase, shall require a return reason of at least 10 characters, shall refuse a return once payment has started, and shall keep the returned invoice. | - | M | T | Partial | 87-proc-e2e.js data-ivret; 63-contracts.js data-ivform |
| PRC-FR-118 | The system shall apply BR-PRC-15 and shall show the payable amount as the accepted amount less the penalty. | - | M | T | Partial | 63-contracts.js payGate; 66b-fin-fn1.js payGate |
| PRC-FR-119 | The system shall let the head or the approver release a held phase with a reason of at least 10 characters, and shall notify the auditor and Finance. | - | M | T | Partial | 63-contracts.js data-release |

### Penalties {#prc-fr-penalty}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-120 | The system shall calculate a phase's penalty as days late times the daily penalty (BR-PRC-12), counting days from the due date plus excused extensions to the delivery date, or to today if not delivered. | PPR 162 | M | T | Partial | 63-contracts.js phLate, penDaily, phPenaltyRaw |
| PRC-FR-121 | The system shall give a phase delivered after its due date a penalty above zero. | PPR 162 | M | T | Prototyped | 63-contracts.js phPenaltyRaw; sweep PC4 walk |
| PRC-FR-122 | The system shall charge a late service phase at least the minimum daily penalty. | PPR 162 | M | T | Prototyped | 63-contracts.js penMin, penDaily; sweep round 66 |
| PRC-FR-123 | The system shall excuse days of an approved extension caused by force majeure or the employer, and shall move the due date without excusing days of an extension caused by the supplier. | - | M | T | Partial | 63-contracts.js phDue, phLate; vdec |
| PRC-FR-124 | The system shall apply BR-PRC-13 when a delivery is recorded, and shall show the date on which penalties will reach the limit at the current rate. | - | S | T | Partial | 63-contracts.js penaltyWarn; 72-t3.js capDate |
| PRC-FR-125 | The system shall let an officer propose to waive part or all of a phase's penalty with a reason, let the authorised approver approve it so that the net penalty and the payable amount change, and let the waiver be cancelled so that the full penalty applies again. | - | M | T | Prototyped | 87-proc-e2e.js pcWaive; sweep PC4 walk |
| PRC-FR-126 | The system shall limit a waiver to 1 baht up to the phase penalty, shall refuse approval by the proposer (SD-08), and shall refuse any change to a waiver once the phase has gone to payment. | - | M | T | Partial | 87-proc-e2e.js pcWaive check, edit, acts |

> [!LAW] The penalty base in the code is the whole phase amount. The comment in `63-contracts.js` says the value not yet delivered, and a partial acceptance does not reduce the base. The procurement specialist must confirm the base that clause 162 requires.

### Guarantees and warranty {#prc-fr-guarantee}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-127 | The system shall record a contract guarantee of bank guarantee, cash or government bond, and shall refuse an amount below BR-PRC-17 or an expiry before the last phase's due date. | - | M | T | Partial | 63-contracts.js data-gform |
| PRC-FR-128 | The system shall refuse to record a contract signing until the guarantee required by the settings is recorded. | - | M | T | Planned | - |
| PRC-FR-129 | The system shall show a guarantee as none, in force, expiring, expired, returned or forfeited, and shall give the officer a task when it is expiring or expired. | - | M | T | Partial | 63-contracts.js guarSt, famTasks |
| PRC-FR-130 | The system shall let an officer extend a guarantee to a later expiry date and shall keep each earlier date. | - | S | T | Partial | 63-contracts.js data-gext |
| PRC-FR-131 | The system shall allow a guarantee to be returned only under BR-PRC-21. | - | M | T | Partial | 63b-contract-late.js canReturnGuar; 63-contracts.js data-gret |
| PRC-FR-132 | The system shall let an officer report a defect after the last acceptance, with a fix-by date of 15 days by default, shall draft a repair notice, and shall give the officer a task when the date passes. | - | M | T | Partial | 63b-contract-late.js data-dform, data-dfix |

### Changes and termination {#prc-fr-change}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-133 | The system shall let an officer propose an amount change or a time extension with a reason, and an extension shall name the phase, the days and the cause: force majeure, employer's fault or supplier's fault. | - | M | T | Partial | 63-contracts.js data-vform |
| PRC-FR-134 | The system shall refuse a change that takes the amount to zero or below, or an increase above the room on the allocation line. | - | M | T | Partial | 63-contracts.js data-vform, vdec |
| PRC-FR-135 | The system shall count approved changes of the same kind cumulatively when it chooses the decider (BR-PRC-11). | - | M | T | Prototyped | 63-contracts.js varCum, varWho; sweep R59 walk |
| PRC-FR-136 | The system shall refuse approval by the proposer (SD-08), and shall let the proposer withdraw a pending change. | - | M | T | Partial | 63-contracts.js vdec |
| PRC-FR-137 | On approval the system shall apply an amount change to the last open phase, or the extension to its phase, shall add a contract version with amount, time and author, and shall keep every earlier version. | - | M | T | Partial | 63-contracts.js vdec |
| PRC-FR-138 | The system shall change the commitment on the allocation line by the approved amount, and shall notify procurement and Finance. | - | M | T | Partial | 60-procurement.js famCommitted; 63-contracts.js vdec |
| PRC-FR-139 | The system shall let an officer propose a termination with grounds of at least 10 characters, and shall show the signals that suggest it: penalties over the limit, an assessment, or an overdue phase. | - | M | T | Partial | 63b-contract-late.js data-termask, termReasons |
| PRC-FR-140 | The system shall let the authorised approver, who is not the proposer (SD-08), approve a termination, shall apply BR-PRC-20, and shall draft the termination letter. | - | M | T | Partial | 63b-contract-late.js data-termok |
| PRC-FR-141 | The system shall let the approver reject a proposed termination and shall keep it in the contract's log. | - | M | T | Partial | 63b-contract-late.js data-termno |
| PRC-FR-142 | The system shall close a case only under BR-PRC-16 with a supplier score of 1 to 5, and shall then close the contract and the plan item. | - | M | T | Partial | 63b-contract-late.js closeChecks; 63-contracts.js bindClose |

### Supervision reports {#prc-fr-super}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-143 | The system shall switch supervision on for construction contracts by default, and shall let an officer switch it on for any other contract. | - | S | D | Partial | 86-con-crud.js pcCon create; 63b-contract-late.js data-supon |
| PRC-FR-144 | The system shall record a report with progress of 0 to 100 percent and a note, compare it with the planned percentage by elapsed time, and mark it behind when the gap passes the setting of 10 points by default. | - | S | T | Partial | 63b-contract-late.js data-supform, plannedPct |
| PRC-FR-145 | The system shall give the officer a task when the last report is older than 7 days by default. | - | S | T | Partial | 63b-contract-late.js famTasks |
| PRC-FR-146 | The system shall set checkpoints at 50 percent, 75 percent and the end of the contract period, shall suggest a result, and shall require a note of at least 5 characters. | - | S | T | Partial | 63b-contract-late.js checkpoints, suggestAssess |
| PRC-FR-147 | The system shall suggest considering termination at the contract end when progress is under 85 percent by default or penalties pass the limit, and shall notify the head and the approver when the assessment says so. | - | S | T | Partial | 63b-contract-late.js suggestAssess, data-cpsave |
| PRC-FR-148 | The system shall give the supervisor a role so that the supervisor enters reports directly. | - | S | T | Planned | - |

### Suppliers and blacklist {#prc-fr-supplier}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-149 | The system shall register a supplier with name, type, SME and local flags and contact, shall refuse a tax ID that is not 13 digits with a valid check digit, and shall refuse a repeated tax ID or normalised name. | - | M | T | Partial | 63b-contract-late.js vd-form, taxOk |
| PRC-FR-150 | The system shall show each supplier's contracts, value, late days, penalties and average score across contracts, as information with no ranking. | - | S | D | Partial | 63b-contract-late.js vendorHist |
| PRC-FR-151 | The system shall import the abandoned-work list as a file that replaces the current list, and shall log each import. | - | M | T | Partial | 63b-contract-late.js bl-go |
| PRC-FR-152 | The system shall apply BR-PRC-22 by tax ID and normalised name. | - | M | T | Partial | 63b-contract-late.js blHit, blBlocked; 70-profile.js panel |
| PRC-FR-153 | The system shall let the head release a match with evidence of at least 10 characters, and shall notify the auditor. | - | M | T | Partial | 63b-contract-late.js bl-release |
| PRC-FR-154 | The system shall let an officer check a supplier's legal-entity status as active, dissolved, suspended or not found, and shall record the result. The lookup is simulated. | - | C | T | Partial | 73-t4.js entityLookup |

### Document numbers and forms {#prc-fr-docs}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-155 | The system shall number documents by type and fiscal year, and by unit when the type uses a unit code, with no duplicates and no gaps, in the form prefix, optional unit code, running number and fiscal year. | - | M | T | Partial | 70-profile.js docNo, docNoFmt |
| PRC-FR-156 | The system shall let the administrator set the prefix, 1 to 6 digits and unit code use per type, and a change shall not alter numbers already issued. | - | S | T | Partial | 70-profile.js dn-save |
| PRC-FR-157 | The system shall make a numbered draft from any of 16 starter forms (6 memos, 7 letters, 3 announcements), filled from the case, and shall refuse a form that needs a winner or a contract the case does not have. | - | S | T | Partial | 73-t4.js FORM_T, fm-new |
| PRC-FR-158 | The system shall keep a document editable until it is signed, shall let the role asked to sign do so, shall refuse the drafter, and shall lock the text afterwards. The signature is simulated. | - | S | T | Partial | 73-t4.js data-fdreq, data-fdsign |
| PRC-FR-159 | The system shall send a letter by e-mail or record the channel of an announcement only after signing, and shall check the address format. Sending is simulated. | - | S | T | Partial | 73-t4.js data-fdmail, data-fdpub |
| PRC-FR-160 | The system shall list reminders due for overdue RFQ replies and overdue deliveries, and shall refuse to repeat one within the set days, 3 by default, 0 to 60. | - | S | T | Partial | 73-t4.js remindCands, data-rmind |
| PRC-FR-161 | The system shall read invoices, delivery notes, bank guarantees and quotations into typed fields with a confidence each, shall require a person to check every field below 0.80, and shall keep the value as read beside the corrected value. Reading is simulated. | - | S | T | Partial | 63c-docs.js sampleDocs; 63d-docs-ui.js docReview |
| PRC-FR-162 | The system shall run checks V-01 to V-07 on tax ID, totals, dates, supplier, contract and phase, guarantee amount and expiry, and duplicates, and shall refuse to confirm a document that fails one. | - | S | T | Partial | 63c-docs.js docChecks, docUseCheck |
| PRC-FR-163 | On confirmation the system shall apply the data as the phase invoice, the delivery date, the contract guarantee, or a quotation or market research entry. | - | S | T | Partial | 63c-docs.js doc-ok |

### Plan reports and analytics {#prc-fr-reports}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-164 | The system shall build a monthly summary from cases awarded in the month, with item, budget, reference price, method, offers, winner and agreed price, reason and contract, shall list the gaps, and shall let the head publish it only when no gap remains (BR-PRC-23). | - | M | T | Partial | 61c-planreports.js repRows, bindReports |
| PRC-FR-165 | The system shall show all cases on a timeline against the fiscal year, with preparation, sourcing and contract periods, the planned month and the expected signing date. | - | C | D | Partial | 61c-planreports.js PROC.gantt |
| PRC-FR-166 | The system shall define KPI-01 to KPI-14 in one place, show each with its sample size, and show the median and 90th percentile of the time in each stretch of the work. | - | S | T | Partial | 65-analytics.js KPIS, stepTimes |
| PRC-FR-167 | The system shall show cards of the work that matters to the officer, head, executive, auditor and Finance on the analytics page. | - | C | D | Partial | 65b-forecast.js roleCards |
| PRC-FR-168 | The system shall forecast monthly commitments and payments, each open case's chance of signing by a chosen cut-off, money at risk of carry-over, price trend by category and officer workload for 12 weeks, showing the range, sample size and assumptions. | - | S | T | Partial | 65b-forecast.js simCase, monthly, carryRisk, workload, priceTrend |
| PRC-FR-169 | The system shall use case history for a stage with at least 3 cases, and otherwise the stored default for that stage, and shall say which stages use defaults. | - | S | T | Partial | 65b-forecast.js makeSampler, usesDefaults |
| PRC-FR-170 | The system shall run what-if scenarios W-01 to W-06 on the plan cut, specific ceiling, stage delay, price rise, penalty rate, ladder and officers, shall change no stored record, and shall keep at most 4 saved scenarios for comparison. | - | S | T | Partial | 65b-forecast.js runScenario |

### Red flags {#prc-fr-flags}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-171 | The system shall detect signals RF-01 to RF-10 from case and contract data, each with its evidence, and shall take thresholds from the settings. | - | S | T | Partial | 65-analytics.js detectFlags, RF_DEF |
| PRC-FR-172 | The system shall score each case or contract as the sum of weights of 40, 25 and 10 by signal, capped at 100, and shall sort the queue by score. | - | S | T | Partial | 65-analytics.js detectFlags |
| PRC-FR-173 | The system shall show all signals only to the auditor and the head, and to officers and units only the items they are asked to explain. | - | M | T | Partial | 65-analytics.js rfSeeAll, rfVisible |
| PRC-FR-174 | The system shall move a signal from new to asked, to explained, and then to closed, fixed, escalated or false positive by the auditor's decision, each with a note of at least 5 characters. | - | S | T | Partial | 65-analytics.js bindAnalytics |
| PRC-FR-175 | The system shall not block or penalise any case because of a signal, and shall show the false-positive share of decided signals. | - | M | I | Partial | 65-analytics.js PROC.flags |

### Procurement profile {#prc-fr-profile}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-176 | The system shall let the administrator choose the kind of agency, government or state enterprise, and shall set the feature switches to that kind's starting values. | - | M | T | Partial | 70-profile.js PROF_TYPES, profDefaults |
| PRC-FR-177 | The system shall hold a switch for each optional feature, shall let the administrator change each one, shall record the change, and shall notify the auditor and the head when one is switched off. | - | M | T | Partial | 70-profile.js PROF_FEATS, BIND_ADMIN.procprof |
| PRC-FR-178 | The system shall remove a feature's pages, panels and step checks while its switch is off, and the rest of Procurement shall work without it. | - | M | T | Partial | 74-proc-pages.js prOn; 70-profile.js feat |
| PRC-FR-179 | The system shall refuse profile settings below zero, an invitation minimum below 1, VAT above 30 percent, a preference above 50 percent or a minimum attendance above 100 percent. | - | M | T | Partial | 70-profile.js pf-save; 71-t2.js p2-save; 72-t3.js p3-save |

> [!NOTE] The feature list in the prototype also shows a reference column taken from one agency's terms of reference. That column is sample data and is not part of this specification.

### AI assistance {#prc-fr-ai}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-FR-180 | The system shall apply BR-PRC-34: the assistant shall decline such requests, and agents shall have no tool to score bids, announce a winner, create or sign a contract, approve or pay. | - | M | T | Partial | 67-procai.js aiAnswer; 67b-agents.js NOT_IN_REGISTER |
| PRC-FR-181 | The system shall log every AI use with agent, user, action, target, source count and version, and shall refuse a tool whose agent is switched off. | - | M | T | Partial | 67-procai.js aiLog, aiOff |
| PRC-FR-182 | The system shall suggest plan items to combine, and shall point at TOR wording that names a brand or model, as advice that blocks nothing. | - | S | D | Partial | 67-procai.js aiConsolidate, aiSpecCheck |
| PRC-FR-183 | The system shall suggest a reference price range with its evidence from past contracts of the same kind, and shall record it only after a person confirms at step 4. | - | S | T | Partial | 67-procai.js aiRefPrice, ai-03use |
| PRC-FR-184 | The system shall score each open phase's late-delivery risk from 0 to 100 with its reasons. | - | S | T | Partial | 67-procai.js aiDelay |
| PRC-FR-185 | The system shall draft a TOR, committee order, acceptance certificate or supplier letter for a person to edit, and shall keep the draft, the final text and the share of the draft that was edited. | - | S | T | Partial | 67-procai.js aiDraft, ai-use |
| PRC-FR-186 | The system shall answer questions only from the defined KPIs, with the source and sample size, shall decline anything else, and shall summarise a supplier's record without ranking. | - | S | T | Partial | 67-procai.js aiAnswer, aiSupplier |
| PRC-FR-187 | The system shall run agents AG-10 to AG-13 as plans of at most 14 steps from a register of tools per agent, shall stop for a person at each write at level L2, and shall have no approve-all action. The shared agent framework is in the Review chapter (REV-FR-036, REV-FR-038, REV-FR-041, REV-FR-043), and level L3 is open (OI-REV-04). | - | S | T | Partial | 67b-agents.js startRun, advance, TOOLS |
| PRC-FR-188 | The system shall let the executive set an agent's level with a reason of at least 5 characters, shall notify the auditor, and shall accept a step's approval only from someone allowed to do that action. | - | S | T | Partial | 67b-agents.js data-aglset, canApprove |
| PRC-FR-189 | The system shall run AI tools through the AI gateway of ADR-0016 with a tenant switch for each tool. | - | C | T | Planned | - |

## Data requirements {#prc-data}

The prototype holds these records in browser memory. The table names each record, its main attributes as they exist in the code, and its personal data. The SDS sets the physical tables. Supplier bank accounts and vouchers belong to Finance, although the prototype keeps a `bank` field on the supplier.

| Record | Main attributes | Personal data |
| --- | --- | --- |
| Plan item | id, line, name, est, month, method, cat, kind, status, egp, cancelled | Author |
| Plan version | v, status, why, items (snapshot), appr, published, withdrawn | Proposer, approver |
| Requisition | id, plan, amount, why, need, status, splitWhy, forUnit, decided, returned, withdrawn, cancelled | Requester, decider |
| Case | id, plan, reqn, line, kind, state, method, methodWhy, special, methodApproval, committees, ref, tor, egp, quotes, bids, scores, coi, criteria, market, award, appeal, rounds, contract, close, cancelled, extra | Committee names, declarations, scores |
| Case event | t, case, type, by, detail, state | Actor |
| Contract | id, reqn, plan, line, vendor, no, signed, amount, base, ver, versions, status, inspectors, guarantee, warrantyMonths, vars, term, supervision, defects, letters, boq, serials, drw, xref | Inspectors, supervisor name |
| Phase | n, name, due, amount, need, ext, extV, delivered, dRef, signs, result, okAmount, cert, dissent, invoice, invReturned, hold, release, waive, cancelled | Signers |
| Supplier | id, name, taxId, type, sme, local, contact, status, smeCert, mitCert, email, erpCode, entity | Tax ID, contact and e-mail of an individual supplier |
| Abandoned-work list | rows (name, taxId, since, ref), imports | Names of individuals |
| Document number | fmt, ctr, log (no, type, t, by, ref) | Issuer |
| Form document | id, tpl, g, case, ven, no, text, sign, pub, mail | Signer |
| Fee claim | id, docNo, case, kind, dates, rows, total, status, decided | Members and their fees |
| Incoming document | id, type, name, src, status, fields (v, conf, orig, checked), applied | Possible, in the document itself |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-DR-001 | The system shall store a plan version as a snapshot that later changes to plan items do not alter. | - | M | T | Partial | 61c-planreports.js snap; 84-proc-crud.js pvVer |
| PRC-DR-002 | The system shall keep every ended round of a case, with its bids, as a read-only record. | - | M | T | Prototyped | 61-cases.js caseArchive; sweep PC2 walk |
| PRC-DR-003 | The system shall keep the signed amount of a contract unchanged and shall add a version row for every approved change and for a termination. | - | M | T | Partial | 63-contracts.js vdec; 63b-contract-late.js data-termok |
| PRC-DR-004 | The system shall issue plan, requisition, case and contract numbers per fiscal year and shall hold the numbers of deleted drafts so they are never issued again (BR-PRC-33). | - | M | T | Partial | 60-procurement.js nextId; sweep PC1 walk checks plan items only |
| PRC-DR-005 | The system shall keep every case event for the life of the case. The prototype's limit of 1,000 events does not apply to production. | - | M | I | Planned | - |
| PRC-DR-006 | The system shall hold money as a whole number of baht, and amounts entered in million baht shall be converted without loss. | - | M | I | Partial | 76-crud.js crMoney; 61-cases.js Math.round |
| PRC-DR-007 | The system shall store only the summary of each bid and the published data, with no full bid files. | - | S | I | Partial | 61b-sourcing.js c.bids; D-P04 |
| PRC-DR-008 | The system shall store TOR files, guarantees, delivery notes, invoices and signed certificates as files linked to their records. | - | S | T | Planned | - |
| PRC-DR-009 | The system shall classify the personal data in the table above in the platform's records of processing and shall mask a natural person's tax ID outside procurement roles. | - | M | I | Planned | - |
| PRC-DR-010 | The system shall apply a retention period to cases, contracts and acceptance records as the tenant setting states, and shall destroy data only when the period ends. | - | M | I | Planned | - |

> [!OPEN] The retention period of case files, contracts and acceptance records is not set (PRC-DR-010). The procurement specialist must state the legal minimum. The product owner then sets the allowed range of the tenant setting.

## State rules {#prc-states}

State names are the values in the code. Requirements above give the checks and the actor for each change.

| Case step | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| 1 PLANNED | In the plan | 2 | The requisition is sent |
| 2 REQUESTED | Requisition waiting | 3; 1; 0 | Approved; rejected, returned or withdrawn; cancelled |
| 3 APPROVED | Approved in principle | 4; 0 | The method is settled; cancelled |
| 4 SPECIFYING | TOR and reference price | 5; 7; 0 | Competitive checks pass; specific method with a chosen quotation; cancelled |
| 5 SOURCING | Running in e-GP | 6; 4; 0 | Bids closed and counted; no bidder or failed; cancelled |
| 6 EVALUATING | Evaluation | 7; 4; 0 | Award recorded; failed; cancelled |
| 7 AWARDED | Winner announced | 8; 6; 4; 0 | Appeal period over; appeal upheld or award withdrawn; failed; cancelled |
| 8 CONTRACTING | Ready for the contract | 9; 0 | The signing is recorded; cancelled |
| 9 IN DELIVERY | Contract management | 10 | Every live phase is accepted (derived) |
| 10 ACCEPTED | Accepted, no payment yet | 11 | A payment exists (derived) |
| 11 PAYMENT | Payment under way | 12 | Every live phase is paid and the case is closed |
| 12 CLOSED | Closed, final | - | - |
| 0 cancelled | Shown when `cancelled` is set | 2 | A new requisition for the item clears it |

| Requisition status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| draft | Saved, not sent, or withdrawn | pending; deleted | Requester sends; requester deletes one never sent |
| pending | Waiting for approval; reserves the amount | approved; returned; rejected; draft; cancelled | Approver decides; requester withdraws; the case or item is cancelled |
| returned | Back with the requester | pending; cancelled | Requester sends again; the item is cancelled |
| approved | Approved; reserves the amount | contracted; cancelled | Contract signed; approver or head cancels, or the case is cancelled |
| rejected | Refused, final | - | - |
| contracted | A contract exists, final | - | - |
| cancelled | Cancelled, final | - | - |

| Plan item status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| draft (derived) | Planned but not in the published version, or next year's item | planned; deleted; cancelled | A version with it is published; officer deletes it if never listed; officer cancels |
| planned | In the published plan | requisitioned; cancelled | The requisition is sent; officer cancels |
| requisitioned | The case is at steps 2 to 8 | contracted; planned; cancelled | Contract signed; requisition or case ends; officer cancels |
| contracted | A contract exists | closed | The case closes |
| closed | Finished, final | - | - |
| cancelled | Removed in the next version, final | - | - |

| Plan version status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| submitted | Waiting for a decision | approved; rejected; withdrawn | Approver decides; officer withdraws |
| approved | Approved, not yet published | published | Officer records the e-GP notice |
| published (derived) | Approved with a notice; final | - | - |
| rejected, withdrawn | Final | - | - |

| Contract status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| draft | Not signed; commits nothing | active; deleted | Officer records the signing; officer deletes it |
| active | In force; commits the line | closed; terminated | The case closes; the approver approves a termination |
| closed | Finished, final | - | - |
| terminated | Ended early; the amount falls to accepted phases | - | The case can still close |

A phase has no status field. The code derives the state from its data, in the order below, and shows `Overdue` on an undelivered phase past its due date.

| Phase state | Derived from | Changes to | Condition and actor |
| --- | --- | --- | --- |
| Cancelled | `cancelled` is set | - | Termination of the contract |
| Paid | An approved payment exists | - | Finance |
| Accepted | Signatures reach `need` | Paid | Finance pays the phase |
| Delivered | `delivered` is set | Accepted; Cancelled | Committee signs; contract terminated |
| Waiting | None of the above | Delivered; Cancelled | Officer records the delivery; contract terminated |

> [!WARN] Step 11 needs a Finance payment, which the prototype records as a payment request when a voucher is posted. Payment states belong to the FIN chapter, and the two chapters must keep this link in step.

## Interface requirements {#prc-interfaces}

Procurement has no live external connection in the prototype. The table shows what each interface does today.

| Interface | Direction | In the prototype |
| --- | --- | --- |
| e-GP status file | In | Simulated: the sample button builds rows; no real file is parsed |
| e-GP data pack | Out | Text to copy; the layout is a placeholder |
| Budget | Internal | Real within the prototype: allocation lines, reservation, commitment, next-year requests |
| Finance, and GFMIS through Finance | Internal | Real within the prototype; GFMIS itself is simulated in Finance |
| Supplier portal | External users | Simulated: a role in the same page |
| OCDS export | Out | JSON built on the page, copy or download |
| E-mail, e-signature, entity lookup, central appeals body | Out | Simulated |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-IR-001 | The system shall import an e-GP status file, shall check each row against the plan, shall leave out rows that match no plan item, and shall log who imported it and the counts of rows imported and skipped. | - | M | T | Partial | 60-procurement.js egp-sample, egp-go |
| PRC-IR-002 | The system shall give the same plan and case data when the same file is imported again. | - | S | T | Partial | 60-procurement.js egp-go |
| PRC-IR-003 | The system shall compare the e-GP stage with the case step and shall apply BR-PRC-24. | - | S | T | Partial | 61b-sourcing.js egpMismatch |
| PRC-IR-004 | The system shall build a data pack for keying into e-GP from the case at steps 4 and 5, and shall log each build. | - | S | D | Partial | 61b-sourcing.js egpPack |
| PRC-IR-005 | The system shall read e-GP status through an adapter that can change from file to API with no change to the case logic. | - | S | T | Planned | - |
| PRC-IR-006 | The system shall read allocation lines of the fiscal year from Budget and shall offer only investment and operating lines for plan items. | - | M | T | Partial | 60-procurement.js famLines, famHeadroom |
| PRC-IR-007 | The system shall count a contract against its allocation line from the signing, and never while it is a draft. | - | M | T | Prototyped | 60-procurement.js famCommitted; sweep PC3 walk |
| PRC-IR-008 | The system shall offer Finance each accepted phase with no live payment, with its net amount, penalty and gate result. | - | M | T | Partial | 63-contracts.js payGate; 60-procurement.js famAcceptedUnpaid |
| PRC-IR-009 | The system shall treat a GFMIS purchase order, recorded in Finance, as a gate check for contracts of the set amount or more, 5,000 baht by default. Procurement shall not call GFMIS itself. | - | M | T | Partial | 66b-fin-fn1.js payGate |
| PRC-IR-010 | The supplier portal shall show a supplier only its own invitations and contracts, shall let it reply to an RFQ by the reply date or decline, and shall close replies after that date. | - | S | T | Partial | 71-t2.js VIEWS.vportal, vpRfqs, vpCons |
| PRC-IR-011 | The supplier portal shall let a supplier send an invoice for an accepted phase, and an officer shall confirm it as the phase invoice or return it with a reason of at least 3 characters. | - | S | T | Partial | 71-t2.js data-vinvf, data-vinvok |
| PRC-IR-012 | The supplier portal shall let a supplier ask to change its bank account with a 10-digit account number, and the request shall join the Finance list for a second person to confirm. | - | C | T | Partial | 72-t3.js vb-form |
| PRC-IR-013 | The supplier portal shall authenticate an external supplier user and bind the user to one tax ID. | - | S | T | Planned | - |
| PRC-IR-014 | The system shall export announced cases as OCDS 1.1 releases with planning, tender, award, contract and implementation data, and shall leave out losing bids, committee names and internal reasons. | - | S | T | Partial | 65-analytics.js ocdsRelease, ocdsPackage |
| PRC-IR-015 | The system shall hold ERP reference codes for WBS, requisition, purchase order, source of funds and asset as reference fields, and shall exchange no data with an ERP. | - | C | D | Partial | 70-profile.js ex-form; 72-t3.js data-xref |
| PRC-IR-016 | The system shall send e-mail through the platform notification service and shall use electronic signatures as ADR-0011 decides. | - | S | T | Planned | - |
| PRC-IR-017 | The system shall check a supplier's legal-entity status through an authorised data exchange. | - | C | T | Planned | - |
| PRC-IR-018 | The system shall pass accepted items with serial numbers to the asset product through a defined interface. | - | C | T | Planned | - |

> [!OPEN] The Comptroller General's Department must confirm these e-GP contracts before PRC-IR-001 and PRC-IR-005 can be built: the export file layout and its fields, whether an API is open to agencies and how access is granted, the plan notice number format, how contract signing and contract management in e-GP will work, how filed appeals are reported, and the OCDS format and identifier prefix. Until then the file is the working assumption.

> [!OPEN] Whether Fisko or e-GP holds the contract master once e-GP contract management opens decides the future of the contracts group. The product owner decides, with the Comptroller General's Department's answer in hand.

## Non-functional requirements specific to Procurement {#prc-nfr}

Procurement meets all rows of the cross-cutting chapter, and they are not repeated here. Procurement needs roles, the separation-of-duties engine, delegation, notifications and the audit log from PLT. This table adds only what is particular to Procurement.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-NFR-001 | Every approval, rejection, cancellation, release, settings change and import in Procurement shall write an audit entry with actor and item. | - | M | T | Partial | audit() calls in 60 to 88 |
| PRC-NFR-002 | Every attempt blocked by a duty rule shall be logged with time, person, role, rule and item, including who delegated when the clash is with the delegator. | - | M | T | Partial | 64-duties.js sodCheck |
| PRC-NFR-003 | Every working-day count in Procurement shall use one calendar: weekends plus the tenant holiday list. | - | M | T | Partial | 61-cases.js addWorkdays |
| PRC-NFR-004 | A forecast shall run 400 simulations per case and shall give the same result for the same data. | - | S | T | Partial | 65b-forecast.js rng, hashId, fcRuns |
| PRC-NFR-005 | Screens shall exist in Thai and English. Generated letters, forms and the e-GP data pack shall be in Thai. | - | S | D | Partial | L() labels in 60 to 88 |
| PRC-NFR-006 | Every simulated action shall be labelled on screen, and simulation controls shall not exist in a production tenant. | - | M | I | Partial | Simulate buttons in 61-cases.js, 63-contracts.js, 73-t4.js |
| PRC-NFR-007 | Bid prices shall be visible only to procurement roles and the evaluation committee until the award is recorded. | - | M | T | Planned | - |
| PRC-NFR-008 | An automated test shall show that Procurement works with each profile switch off, and with each kind of agency. | - | M | T | Planned | - |

### Design and implementation constraints {#prc-cr}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PRC-CR-001 | The system shall not run the official procurement steps. Notices, bid submission and official awards stay in e-GP. | - | M | I | Partial | 60-procurement.js header comment |
| PRC-CR-002 | Every legal limit shall be a dated rule in code (ADR-0007), every value a tenant may choose shall be a tenant setting within that limit, and no such number shall be fixed in form text. | - | M | I | Partial | 61-cases.js ADMIN.procrules; 73-t4.js FORM_T |
| PRC-CR-003 | Agency specifics shall live only in tenant data, and the profile shall carry the difference between a government agency and a state enterprise. | - | M | I | Partial | 11-data and 96-data files hold agency samples |
| PRC-CR-004 | State changes shall be enforced on the server in code, following ADR-0007, and screens shall not be the only guard. | - | M | I | Planned | - |
| PRC-CR-005 | Procurement shall be a module of the monolith in ADR-0002 and shall reach Budget and Finance only through their module interfaces. | - | M | I | Planned | - |
| PRC-CR-006 | Procurement events shall go to the tamper-evident audit log of ADR-0015. | - | M | I | Planned | - |

## Test evidence {#prc-tests}

A Prototyped row rests on one of the checks below in `tests/sweep.js`. Each is a walk that drives the real actions and raises an error when the result is wrong. The author read these checks and did not run them for this version.

| Sweep check | What it asserts | Related requirements |
| --- | --- | --- |
| PC1 walk | A plan item added, edited and deleted with its number not reused; a version proposed, approved and published; a requisition sent, withdrawn, returned, edited and approved to step 3; cancelled to free the item; the item cancelled and shown as removed | PRC-FR-001, PRC-FR-003, PRC-FR-004, PRC-FR-008, PRC-FR-012, PRC-FR-016, PRC-FR-018, PRC-FR-019, PRC-FR-020, PRC-FR-023, PRC-DR-004 |
| PC2 walk | Bids added, corrected, deleted and simulated; a rerun that keeps the round and starts clean; a cancelled case that forgets its method | PRC-FR-058, PRC-FR-030, PRC-FR-031, PRC-DR-002 |
| PC3 walk | A valid draft accepted; a wrong phase total refused; a draft deleted; a draft that commits nothing; a schedule edited; signing that commits the line and moves to step 9; the signatures needed | PRC-FR-097, PRC-FR-099, PRC-FR-101, PRC-FR-102, PRC-FR-111, PRC-IR-007 |
| PC4 walk | A late phase has a penalty; a waiver proposed, approved and cancelled, reaching the net payable; a signature withdrawn; an invoice returned | PRC-FR-121, PRC-FR-125, PRC-FR-112, PRC-FR-116 |
| Round 59 walk | Criteria rows and the total; a member replaced after declarations; a member who scored cannot leave; an e-GP correction saved; the cumulative ladder; a delivery notice number | PRC-FR-062, PRC-FR-082, PRC-FR-055, PRC-FR-135, PRC-FR-108 |
| Round 66 check | A late service phase is charged at least the daily minimum | PRC-FR-122 |

The sweep also opens every Procurement page, tab, contract tab, AI tool and record drawer for the listed roles, and fails on a thrown error or broken text such as `undefined`. That proves the page renders and does not prove its behaviour, so those rows stay Partial. The demo suite and the P-E01 to P-E15 steps in `87-proc-e2e.js` open the page of each step. They contain no assertion, so they raise no row to Prototyped. The sweep does not start Procurement agents, and it does not save the settings or profile forms. It runs with the seeded government profile, so features that are off in that profile are not rendered. No sweep check tests a refused duty rule in Procurement.

## Open issues of Procurement {#prc-open}

| Issue | Question | Needed from | Effect on this chapter |
| --- | --- | --- | --- |
| OI-PRC-01 | Confirm every clause in the register for this chapter, and supply clauses for appeals, abandoned work, conflicts of interest, guarantees, contract changes, waivers and the monthly summary, whose rows show a dash | Procurement specialist | Clause column; PRC-FR-008, PRC-FR-036, PRC-FR-109, PRC-FR-120 |
| OI-PRC-02 | The specific-method ceiling and thresholds for the selective method and e-bidding are not fully confirmed | Procurement specialist | BR-PRC-01, PRC-FR-040 |
| OI-PRC-03 | The e-GP contracts in the interface section | Comptroller General's Department | PRC-IR-001, PRC-IR-005, PRC-IR-014 |
| OI-PRC-04 | Fix the settings form so that it can save, and add a sweep check Fixed in round 67, with a sweep check. | Development team | PRC-FR-042 |
| OI-PRC-05 | The contract drawer now checks SD-06 as the older control does (round 67). It shows the block as a form error and logs no blocked attempt, and two paths remain where one should | Development team | PRC-FR-086 |
| OI-PRC-06 | Penalty base, and whether a partial acceptance reduces it | Procurement specialist | PRC-FR-120 |
| OI-PRC-07 | Allowed ranges of the stored settings | Procurement specialist, product owner | Business rules |
| OI-PRC-08 | Who owns the method rules table and how often it is reviewed | Legal unit, product owner | PRC-FR-040 |
| OI-PRC-09 | The monthly summary layout and its publication channel | Procurement specialist | PRC-FR-164 |
| OI-PRC-10 | SME and MiT preference rates, and committee fee rates and caps, are starting values | Procurement specialist | BR-PRC-31, BR-PRC-29 |
| OI-PRC-11 | Who sees red flags, the time to explain, and how they relate to red flags in e-GP | Auditor, product owner | PRC-FR-173, PRC-FR-174 |
| OI-PRC-12 | The AI scope and where the model runs. Level L3 for AG-12 is decided in OI-REV-04 | Product owner, data protection officer | PRC-FR-189, BR-PRC-34, PRC-FR-187 |
| OI-PRC-13 | Whether full bid files stay out of Fisko | Legal unit, data protection officer | PRC-DR-007, PRC-DR-008 |
| OI-PRC-14 | Retention of case files and contracts | Procurement specialist, product owner | PRC-DR-010 |
| OI-PRC-15 | Daily penalty rate for consulting and design contracts, which BR-PRC-12 does not give | Procurement specialist | PRC-FR-037, BR-PRC-12 |
| OI-PRC-16 | Whole baht or satang for amounts, since real invoices carry satang | Procurement specialist, product owner | PRC-DR-006 |
| OI-PRC-17 | A requirement for sealed RFQ replies, which ADR-0013 expects and this chapter lacks | Product owner, security reviewer | PRC-NFR-007 |

The design documents and the code differ in the following places. The code says what exists, the design says what is intended, and each difference is carried by the row named.

| Topic | Design | Code | Row |
| --- | --- | --- | --- |
| Split purchase group | Unit, category and fiscal year, within the window | Unit and kind of work, within the window | PRC-FR-024 |
| Method record | Keeps the version of the rules used | Keeps a reason text with the rule id | PRC-FR-044 |
| Consulting and design | Own path after confirmation | Same rules as other kinds | PRC-FR-037 |
| Committee quorum and resolutions | Recorded per meeting | Only the award resolution text | PRC-FR-087 |
| Guarantee at signing | Required by R-07 | Recorded after signing; checked at the payment gate | PRC-FR-128 |
| Penalty warning | Above the cap, for the executive | At delivery recording only, for the executive and the head | PRC-FR-124 |
| Termination effect | Unpaid phases are cancelled | Unaccepted phases are cancelled | PRC-FR-140 |
| Forward period | Send within the set days | The days are the expected result date | PRC-FR-074 |
| Drawing reply overdue | Task and alert to the committee | Alert at receipt; a task for the officer near the date | PRC-FR-104 |
| Supervisor | A new role | A name typed by the officer | PRC-FR-148 |
| Committee fees | Page text says passed to Finance | Stops at approval; nothing reaches Finance | PRC-FR-091 |
| Profile switches | A test shows the prototype works with switches off | No such sweep check; the seed uses one kind of agency | PRC-NFR-008 |
| Numbers in code | Legal limits are dated rules and tenant choices are settings | Letters fix 7 and 15 days; the older plan form fixes 500,000 baht | PRC-CR-002 |
| Forms catalogue | 45 forms listed | 16 starter forms | PRC-FR-157 |

## Status summary {#prc-status}

The statuses in this chapter come from reading the code and the tests. The sweep was not run for this version, and nothing here is production code. Most Partial rows have working code and a page-open sweep only, so a specific check would raise them to Prototyped without any new feature.

{{status-summary: prefix=PRC}}
