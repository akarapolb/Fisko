# Module: Finance {#fin}

## Purpose and scope {#fin-purpose}

Finance is the agency's work desk in front of GFMIS. Staff keep commitments, prepare and approve vouchers, pay, lend advances, issue receipts, remit money, keep non-budget funds, reconcile, close the books, carry money over and answer audit queries. The official ledger and treasury payments stay in GFMIS (BR-FIN-01).

No production code exists yet, so this chapter was read from the prototype code and its sweep tests. Where the design documents ask for more than the code does, the row is Partial or Planned, and the difference is listed under the open issues.

| Component | State in the prototype | Evidence |
| --- | --- | --- |
| Registers, vouchers, GFMIS files, payment batches, advances, receipts, remittance, reconciliation corrections, non-budget money | Built, with action walks in the sweep | Sweep walks FC1 to FC7 |
| Tax, route, clocks, cash count differences, month close | Built, with no specific check | Page-open sweep only |
| Forecasts, what-if, KPIs, warning signals | Built; only the saved what-if and the signal triage have a check | Sweep walk FC6 |
| Finance agents | Rules and calculations only; no model is called | Agent sweep starts each agent and only checks the page |
| GFMIS, bank, e-Payment, Comptroller General vendor master | Simulated; nothing leaves the prototype | `85-fin-pay-crud.js`, `66f-fin-fn5.js` |

The pages come from one table in `66h-fin-pages.js`.

| Page | Name | Holds |
| --- | --- | --- |
| F1 | Today | Work, regulation clocks, commitments by kind |
| F2 | Commitments | All commitments and POs, outside procurement, carry-over, allocation to payment |
| F3 | Vouchers and payment | Vouchers, GFMIS and payment, daily payment check, tax and penalties |
| F4 | Advances | Register, ageing |
| F5 | Receipts and remittance | Receipts, remittance |
| F6 | Daily cash | Daily report, history |
| F7 | Reconciliation | Bank, GFMIS reports, payment files |
| F8 | Close | Day, month, year end, audit queries, feed to Budget |
| F9 | AI and analytics | Agents, forecasts, what-if, KPIs and signals |
| F10 | Registers and setup | GFMIS users, supplier bank accounts, cash committee, receipt books |
| F11 | Non-budget money | Funds, spending plans, treasury withdrawals |

Outside this chapter: roles, the duty engine, delegation, tasks and the audit log (PLT); allocation lines and the carry-over decision (BGT); contracts, acceptance, the payment gate and penalties (PRC); security, privacy, performance and accessibility (cross-cutting chapter). Salaries and regular wages are outside Finance: they come as a file from the HR system (D-FN-03), and no voucher is made in Fisko.

## Actors {#fin-actors}

| Actor | Role in Finance | Prototype role |
| --- | --- | --- |
| Finance officer | Keeps commitments and POs, makes vouchers, sends GFMIS files, pays, issues receipts, remits, prepares the daily cash report, imports statements | `fin` |
| Head of finance | Checks vouchers, approves up to its limit, runs the daily payment check, signs bank reconciliations, closes periods, demands repayment, answers audit queries, keeps the F10 registers | `finhead` |
| Authorised approver | Approves payments, advances, non-budget plans and treasury withdrawals, directly or by spend delegation; acknowledges the daily cash report; may reopen a closed day or period | `exec`, or a delegate of `exec` |
| Borrower | Any user: asks for, clears and fixes an advance in My Workspace | Every role |
| Cash committee member | Counts the cash and signs the daily report. A list on a dated order, with no role of its own | Named users |
| Planning staff | Reads Finance pages and acts on carry-over requests in Budget | `plan` |
| Auditor | Reads Finance records and receives notices of closing, reopening and cash differences | `audit` |
| Administrator | Edits finance rules. Has no finance action | `admin` |
| Supplier (external) | Asks to change its bank account through the portal (PRC-IR-012) | `vendor`, simulated |
| National audit office (external) | Raises audit queries that the agency answers | None |
| AI agents | Voucher Checker (AG-18), Advance Chaser (AG-19), Reconciler (AG-20), Close Assistant (AG-21), Disbursement Forecaster (AG-22) | Rule functions |
| External systems | GFMIS, banks, the Comptroller General's vendor master, the HR system | Simulated |

## Use cases {#fin-usecases}

The table replaces a use case diagram.

| ID | Name | Actor | Trigger | Outcome |
| --- | --- | --- | --- | --- |
| UC-FIN-01 | Keep a commitment | Finance officer | A cost outside procurement is due | The commitment reserves the allocation line |
| UC-FIN-02 | Record a GFMIS PO | Finance officer | A commitment needs a PO | The PO number is on the record and payment can be requested |
| UC-FIN-03 | Make a voucher from a phase | Finance officer | A phase is accepted | A draft voucher holds the accepted amount and penalty |
| UC-FIN-04 | Make another voucher | Finance officer | A bill or claim arrives | A draft voucher with evidence items and a route |
| UC-FIN-05 | Check and approve a voucher | Second person, authorised approver | A voucher is sent | Approved, returned or rejected |
| UC-FIN-06 | Send to GFMIS and record results | Finance officer | Vouchers are ready | Vouchers are posted, then paid or funded |
| UC-FIN-07 | Pay from the agency account | Finance officer | Money reached the agency | Paid by e-Payment batch, cheque or cash |
| UC-FIN-08 | Check the day's payments | Head of finance | Payments were made | Each payment is ticked or noted |
| UC-FIN-09 | Change a supplier's bank account | Requester, second person | A supplier gives a new account | The new account applies, or the request ends |
| UC-FIN-10 | Borrow and clear an advance | Borrower, approver, Finance | A person needs money for official work | The advance is cleared in full |
| UC-FIN-11 | Demand repayment | Head of finance | An advance is overdue | A demand exists, then a report to the head of the agency |
| UC-FIN-12 | Receive money | Finance officer | Money arrives | A numbered receipt, recorded in GFMIS |
| UC-FIN-13 | Remit money | Finance officer | Money is due to the treasury | A remittance with a bank reference |
| UC-FIN-14 | Count the daily cash | Finance officer, committee, approver | The day had cash or cheques | The report is signed or a difference is reported |
| UC-FIN-15 | Keep a non-budget fund | Finance officer, approver | Money the law lets the agency keep | A fund, an approved plan, withdrawals and spending within the plan |
| UC-FIN-16 | Reconcile | Finance officer, head of finance | A month ends | Bank, GFMIS and payment files agree or are explained |
| UC-FIN-17 | Close a day or a month | Head of finance | A day or month ends | The period is closed; a reopening needs a second person |
| UC-FIN-18 | Propose a carry-over | Finance officer | The year end nears | A request waits for the decision in Budget |
| UC-FIN-19 | Answer an audit query | Head of finance | The national audit office raises a query | An answer is sent within the clock |
| UC-FIN-20 | Run a finance agent | Finance roles | Work is due | Steps run, and a person approves each write |

## Business rules {#fin-rules}

The Source column gives the clause or the design rule. The last column says where a rule can be set and the range the code accepts. The prototype keeps every number below in one editable form with no range check, including numbers that come from the regulation. Production splits them: a rule marked Dated rule is a legal limit in code (ADR-0007), and a rule marked Tenant is a tenant setting. The level of a value is the design's own label: A is read from the regulation, B comes from rulings or news and needs confirming, C is a design proposal.

| ID | Rule | Source | Setting and allowed range |
| --- | --- | --- | --- |
| BR-FIN-01 | Fisko keeps no general ledger. GFMIS holds the official record and the treasury pays. A rejection from GFMIS never changes an approved record by itself | D-FN-01 | Fixed in code |
| BR-FIN-02 | A voucher or commitment stays within what is free: on a commitment, the amount less released, paid and held; on a line, the Budget room less held amounts; on a contract, the contract commitment | R-FN-01; TRR 17; TRR 18 | Fixed in code |
| BR-FIN-03 | A voucher holds its spending amount from sending until it is paid or leaves those states, so that open vouchers cannot together pass the limit | R-FC-03 | Fixed in code |
| BR-FIN-04 | Contracts, rent and service agreements at or above the PO limit need a GFMIS purchase order before a payment request. Utilities and travel orders need none | R-11; TRR 28 | Dated rule: `poMin` 5,000 baht, level A |
| BR-FIN-05 | The route comes from the voucher. Non-budget money is paid from the non-budget account. Procurement and service vouchers at or above the PO limit are paid direct, and below it through the agency. Utilities are paid direct, or through the agency when others contribute. Compensation goes through the agency. Others are paid direct. The whole order decides, never the phase | R-FN-02; TRR 20; TRR 28; TRR 29 | Fixed in code |
| BR-FIN-06 | Tax is withheld on procurement and service vouchers when the whole order reaches the limit, on the amount before VAT. A government payee has no withholding. Compensation uses a table the agency confirms, not yet set | R-FN-03 | Dated rule: `whtMin` 10,000 baht and `whtPct` 1 percent, level B |
| BR-FIN-07 | Net paid is gross less penalty, withholding tax and other deductions. Spending is gross less penalty. Amounts round to 2 decimal places | R-FN-03 | Fixed in code. VAT is fixed at 7 percent in the voucher code (OI-FIN-05) |
| BR-FIN-08 | On a contract voucher the gross is the accepted amount and the penalty is the net penalty from Procurement. Penalty and tax withheld are state revenue to be matched | R-11; TRR 19; PPR 162 | Fixed in code |
| BR-FIN-09 | Payment is by e-Payment. Cheque or cash needs a reason of at least 5 characters | TRR 52 | Fixed in code |
| BR-FIN-10 | The approver needs the lowest authority row of their role whose limit covers the spending. A limit of 0 means no limit. A voucher above the role's rows cannot be approved by it | TRR 36 | Tenant, level C for assignees: `A1` 0, `A2` 10,000,000, `A3` 1,000,000 baht, from the agency's assignment order |
| BR-FIN-11 | Duty rules SD-04, SD-05, SD-11 to SD-16 and P-F05 of the Platform register apply, and the second person is always a different person | PLT register | As BR-PLT-09 |
| BR-FIN-12 | What has left the agency does not change: a GFMIS file with a result, a confirmed batch, a sent receipt or certificate. A later fix uses a new record that points back | R-FC-01 | Fixed in code |
| BR-FIN-13 | Records of a closed day or month do not change until the period is reopened | R-FC-02 | Fixed in code |
| BR-FIN-14 | A voucher that passed a checker returns to draft before it changes, and is checked and approved again. No edit resets a clock | R-FC-05; FC-P2; FC-P3 | Fixed in code |
| BR-FIN-15 | Numbers carry the fiscal year and are never reused, including those of deleted drafts | R-FC-06 | Fixed in code |
| BR-FIN-16 | Money paid back on a paid voucher never changes the voucher. It is a receipt that points to the voucher, and gives the amount back to the commitment or line only when it arrives within the year | R-FC-07; TRR 100 | Fixed in code |
| BR-FIN-17 | An advance is approved only with no open advance of the same borrower, items the budget may lend for, at most 90 travel days, at most 90 (travel) or 30 (other) days into the next year, collateral for a borrower with no pay to deduct from, and room on the line | R-FN-05; TRR 58; TRR 59; TRR 62; TRR 63; TRR 64 | Dated rule: 90, 90 and 30 days are in code |
| BR-FIN-18 | A travel advance clears within `advTravel` days of the return, and others within `advOther` days of payment. Overdue is computed at each read and is never stored | R-FN-05; TRR 65 | Dated rule: 15 and 30 days, level A |
| BR-FIN-19 | Overdue advances get a demand due within `demandDays` of the clear-by date. An unpaid demand goes to the head of the agency | TRR 68 | Dated rule: 30 days, level A |
| BR-FIN-20 | Money received is state revenue, non-budget money, or returned money. Returned money dated by the year end is over-drawn money, and later it is a prior-year balance | TRR 100 | Fixed in code |
| BR-FIN-21 | Remit a cheque within 1 working day. Remit cash revenue by the month end, or within `remitDays` working days when that day's cash revenue exceeds `remitCash`. Remit returned money within `refundDays` working days. Remit other money by the month end | R-FN-06; TRR 101 | Dated rule: `remitCash` 10,000 baht, `remitDays` 3, `refundDays` 15, level A |
| BR-FIN-22 | The cash committee has at least 2 members on a dated order. Anyone who received or paid money that day cannot count it (SD-13) | TRR 86 | Fixed in code; rank is not checked |
| BR-FIN-23 | The daily report is signed when every member's count equals the system figures. Otherwise it is marked as differing and the head of the agency, the head of finance and the auditor are told | TRR 92; TRR 95 | Fixed in code |
| BR-FIN-24 | Non-budget money is spent only on a line of this year's approved plan, within what is left. Too little in the account is a warning to withdraw first | R-FN-07; TRR 60 | Fixed in code |
| BR-FIN-25 | A treasury withdrawal stays within the treasury deposit, and unpaid money is deposited back within `refundDays` working days | R-FN-07; TRR 101 | As BR-FIN-21 |
| BR-FIN-26 | A day closes when receipts are recorded, the cash report is signed and payments are checked, or with a reason of at least 5 characters. Clocks due are a warning only | TRR 43; TRR 81; TRR 108 | Fixed in code |
| BR-FIN-27 | A month closes on 6 checks: paid vouchers have a GFMIS document, daily cash reports are signed, no money is past its remittance date, bank reconciliations are signed, the trial balance agrees, and advances are reviewed. A failed check needs a reason of at least 10 characters | R-FN-06 | Fixed in code |
| BR-FIN-28 | A bank reconciliation is signed only with a difference of zero and no bank-only item left | R-FN-06 | Fixed in code |
| BR-FIN-29 | A commitment is a carry-over candidate when it is signed by the year end, at least `carryMin` is unpaid and the last payment falls after the year end | TRR 105; TRR 106 | Dated rule: `carryMin` 100,000 baht, level A. Yearly: `carryBy`, level B |
| BR-FIN-30 | A payment uses only an account a second person has confirmed. The first payment within 30 days of a change raises a warning | SG-F03; TRR 20 | 30 days is fixed in code |
| BR-FIN-31 | AI follows BR-PLT-25. An agent never approves, pays, closes or changes an amount, and each write waits for a person | Design chapter 10 | Each agent on or off |

### Regulation clocks {#fin-rules-clocks}

Clocks count from the source event, and working days use the Platform calendar (BR-PLT-22). The prototype shows clocks on F1 and My Work.

| Clock | Starts | Length | Setting | Clause |
| --- | --- | --- | --- | --- |
| Request payment for buying, hiring, renting | Last acceptance signature | 5 working days | `reqDays`, A | TRR 28 |
| Monthly items | Month start | By day 15 | `monthlyDay`, A | TRR 31 |
| Early request warning | Due date | More than 10 days ahead | `aheadDays`, C | TRR 22 |
| Clear an advance | Return or payment | 15 or 30 days | `advTravel`, `advOther`, A | TRR 65 |
| Fix an objection | Objection | 15 days | `advFix`, A | TRR 65 |
| Demand repayment | Clear-by date | 30 days | `demandDays`, A | TRR 68 |
| Record money received | Receipt date | Same day | Fixed | TRR 81 |
| Remit | Receipt date | As BR-FIN-21 | As BR-FIN-21 | TRR 101 |
| Return money not paid out | Funds reach the agency | 15 working days | `refundDays`, A | TRR 99 |
| Yearly receipt-book report | Year start | By 31 October | Fixed in code | TRR 74 |
| Answer an audit query | Day received | 15 days | `aqDays`, A | TRR 109 |

> [!OPEN] The prototype stores `monthlyDay` and never reads it, and it sends no reminders before a clock falls due, although the design lists them. The finance specialist must confirm the reminder days, and the product owner decides which clocks a tenant can change (OI-FIN-01, OI-FIN-21).

## Functional requirements {#fin-fr}

The requirements follow the order of the work. A named sweep walk means that walk asserts the behaviour.

### Settings and clocks {#fin-fr-settings}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-001 | The system shall let the administrator change the tenant finance settings, shall show every setting to finance roles and the auditor read-only, and shall audit each change with old and new values. | - | M | T | Partial | 66b-fin-fn1.js ADMIN.fcfg, BIND_ADMIN.fcfg |
| FIN-FR-002 | The system shall hold each legal limit in the business rules as a dated rule with its clause and level, shall not let a tenant change it, and shall refuse a tenant value outside its range. | - | M | T | Planned | - |
| FIN-FR-003 | The system shall hold the payment authority table with position, role and limit, and shall let the tenant set the limits of assignees. | TRR 36 | M | T | Prototyped | 66b-fin-fn1.js FCFG_DEFAULT auth; sweep FC2 walk |
| FIN-FR-004 | The system shall list every clock of the regulation clocks table that applies, sorted by due date with its clause, marking overdue and due within 2 days. | - | M | D | Partial | 66b-fin-fn1.js finClocks, clockDot |
| FIN-FR-005 | The system shall give the head of finance a task for each clock due within 1 day. | - | S | T | Partial | 66b-fin-fn1.js myTasks |
| FIN-FR-006 | The system shall remind the owner before a clock falls due, and shall escalate to the head of finance when it passes, on the days the specialist confirms. | - | S | T | Planned | - |
| FIN-FR-007 | The system shall show on F1 the work due, commitments unpaid, the share paid, and commitments by kind. | - | S | D | Partial | 66b-fin-fn1.js FS.homeKpis, FS.byKind |
| FIN-FR-141 | The system shall give a clock for monthly items, due by `monthlyDay` of the month, and shall read that day from the rule set. | TRR 31 | M | T | Partial | 66c-fin-fn2.js finClocks, voucher due date only |

### Commitments and purchase orders {#fin-fr-commit}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-008 | The system shall show one register of commitments: contracts read live from Procurement and commitments Finance keeps, with amount, released, paid and left. | - | M | D | Partial | 66b-fin-fn1.js finCommits |
| FIN-FR-009 | The system shall let a finance officer add a commitment outside procurement of kind utility, rent, service or travel, and shall refuse an amount above the room on the line. | TRR 18 | M | T | Prototyped | 86-fin-commit-crud.js fnCm; sweep FC4 walk |
| FIN-FR-010 | The system shall lock a commitment's amount, line, kind and payee once a voucher uses it, leaving only the last payment date. | - | M | T | Prototyped | 86-fin-commit-crud.js edit; sweep FC4 walk |
| FIN-FR-011 | The system shall let an officer release part of a commitment with a reason, up to what vouchers do not hold, shall give it back to the line and shall notify planning. | - | M | T | Prototyped | 86-fin-commit-crud.js release; sweep FC4 walk |
| FIN-FR-012 | The system shall refuse to cancel a commitment while a voucher holds part of it, and shall let an unused commitment with no PO be deleted with a reason, keeping its number. | - | M | T | Prototyped | 86-fin-commit-crud.js; sweep FC4 walk |
| FIN-FR-013 | The system shall prepare the data for a GFMIS PO and shall record a PO number of exactly 10 digits, unique across commitments. | TRR 28 | M | T | Partial | 66b-fin-fn1.js FS.po, data-poform |
| FIN-FR-014 | The system shall let an officer correct or clear a PO number with a reason until a voucher that relies on it is in a GFMIS file, and shall keep each earlier value. | - | M | T | Prototyped | 66b-fin-fn1.js poLocked, data-poedit; sweep FC4 walk |
| FIN-FR-015 | The system shall add the PO check to the payment gate of contracts at or above the limit, and shall answer Procurement's question with this fact (PRC-IR-009). A missing PO shall never be released. | TRR 28 | M | T | Partial | 66b-fin-fn1.js payGate |
| FIN-FR-016 | The system shall show the chain from allocation to plan, commitment, acceptance and payment by line, with phases overdue. | - | S | D | Partial | 62-finance.js chainData, FS.chain |

### Vouchers {#fin-fr-voucher}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-017 | The system shall list accepted phases with no live voucher, with the gate result and the request clock, and shall let an officer make a voucher from one that passes (PRC-IR-008). | TRR 28 | M | T | Partial | 66c-fin-fn2.js FS.vcAccepted, vcMake |
| FIN-FR-018 | The system shall set a contract voucher's gross, payee and penalty from Procurement under BR-FIN-08, and shall not let Finance change the gross or the payee. | PPR 162 | M | T | Partial | 66c-fin-fn2.js vcMake, vcApply |
| FIN-FR-019 | The system shall take the penalty of a contract voucher only from Procurement, and shall treat a penalty change as a waiver there. | PPR 162 | M | T | Planned | - |
| FIN-FR-020 | When the gate fails, the system shall hold the phase as an exception for release in Procurement and shall notify the head of procurement and the approver. | - | M | T | Partial | 66c-fin-fn2.js vcMake |
| FIN-FR-021 | The system shall let a released phase continue through every later step, treating the released checks as passed. | - | M | T | Planned | - |
| FIN-FR-022 | The system shall let an officer make a voucher of type service, utility, compensation, travel or refund against a commitment, a line or a non-budget plan line. | TRR 17 | M | T | Prototyped | 66c-fin-fn2.js vcSave; sweep FC2 walk |
| FIN-FR-023 | The system shall refuse a voucher with a gross of zero or less, no due date, no payee, no source, an invalid tax ID, or cheque or cash with no reason. | TRR 52 | M | T | Prototyped | 66c-fin-fn2.js vcCheck; sweep FC2 walk |
| FIN-FR-024 | The system shall list the evidence each type needs, and shall let finance roles mark each item while the voucher is before approval. | TRR 46 | M | T | Partial | 66c-fin-fn2.js VT, vEvidence |
| FIN-FR-025 | The system shall show for a voucher the rules that pass, fail or warn, updating as the form changes. A warning never stops the voucher. | - | S | D | Partial | 66c-fin-fn2.js vRules, vcForm |
| FIN-FR-026 | The system shall warn when a voucher is requested more than `aheadDays` before it is due. | TRR 22 | S | T | Partial | 66c-fin-fn2.js vRules |
| FIN-FR-027 | The system shall choose the route under BR-FIN-05 and shall show the route with its clause. | TRR 28, TRR 29 | M | T | Partial | 66c-fin-fn2.js vRoute |
| FIN-FR-028 | The system shall calculate tax, spending and net under BR-FIN-06 and BR-FIN-07, deciding from the whole order and not the phase. | TRR 19 | M | T | Partial | 66c-fin-fn2.js whtRate, vCalc |
| FIN-FR-029 | The system shall withhold tax on compensation from a table the agency confirms. | - | S | T | Planned | 66c-fin-fn2.js whtRate, placeholder rate 0 |
| FIN-FR-030 | The system shall refuse to send a voucher that fails a rule, and shall hold its spending from then on (BR-FIN-03). | TRR 18 | M | T | Prototyped | 66c-fin-fn2.js vcAct submit, vcReserved; sweep FC2 walk |
| FIN-FR-031 | The system shall let the maker recall a voucher from checking or approval with a reason, returning it to draft and clearing the checker and approver. | - | M | T | Prototyped | 66c-fin-fn2.js vcAct recall; sweep FC2 walk |
| FIN-FR-032 | The system shall let a second person pass a voucher when all evidence and rules are met, refuse the maker (P-F05) and log the attempt. | - | M | T | Prototyped | 66c-fin-fn2.js vcAct checked; sweep FC1 and FC2 walks |
| FIN-FR-033 | The system shall let the checker or approver return a voucher with a reason, and shall notify the head of finance at the third return. | - | M | T | Prototyped | 66c-fin-fn2.js vcAct return; sweep FC2 walk |
| FIN-FR-034 | The system shall let the approver reject a voucher with a reason, as a final state that no longer counts, and shall free its phase for a new voucher. | - | M | T | Partial | 66c-fin-fn2.js vcAct reject; sweep FC2 walk; see OI-FIN-10 |
| FIN-FR-035 | The system shall let the maker cancel a draft or returned voucher, and the head of finance cancel one up to ready and before a file, each with a reason, and shall undo its payment record and any advance top-up link. | - | M | T | Prototyped | 66c-fin-fn2.js vcAct cancel, hcancel; sweep FC2 walk |
| FIN-FR-036 | The system shall let only an approver whose authority covers the spending approve (BR-FIN-10), and shall store the authority row used. | TRR 36 | M | T | Prototyped | 66c-fin-fn2.js vcAuth; sweep FC2 walk |
| FIN-FR-037 | The system shall refuse approval by the maker or checker (SD-11) and by a member or signer of the acceptance (SD-04), including anyone whose authority the person holds. | - | M | T | Partial | 66c-fin-fn2.js vcAct approve; sweep FC2 walk covers SD-11 only |
| FIN-FR-038 | The system shall recheck the rules at approval and shall refuse when the amount is no longer free. | TRR 18 | M | T | Partial | 66c-fin-fn2.js vcAct approve |
| FIN-FR-039 | On approval of a contract voucher the system shall record an approved payment and tell Procurement, so the phase and case move on (PRC-FR-126). | - | M | T | Partial | 66c-fin-fn2.js vcAct approve; 63-contracts.js phPaid |
| FIN-FR-040 | The system shall list vouchers by status group, with search, type and route filters and sorting by number, net and due date, hiding cancelled and rejected unless asked. | - | S | D | Partial | 66c-fin-fn2.js FS.vouchers |

### GFMIS files and payment {#fin-fr-pay}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-041 | The system shall let an officer with a written assignment make a GFMIS request file from chosen ready vouchers, and shall refuse an empty file. | TRR 12 | M | T | Prototyped | 85-fin-pay-crud.js fnGfo create; sweep FC3 walk |
| FIN-FR-042 | The system shall let an officer take a voucher out of a file, or cancel a whole file, with a reason, until a result is recorded. | - | M | T | Prototyped | 85-fin-pay-crud.js acts; sweep FC3 walk |
| FIN-FR-043 | The system shall record each voucher's posting result. A posted voucher stores the GFMIS document, and a rejected one needs a reason of at least 5 characters, leaves the file, returns to ready and notifies the officer. | - | M | T | Prototyped | 85-fin-pay-crud.js edit; sweep FC3 walk |
| FIN-FR-044 | The system shall record each voucher's payment result: paid direct with a reference, funded into the agency account, or failed with a reason, which returns it to ready. | - | M | T | Prototyped | 85-fin-pay-crud.js edit; sweep FC3 walk |
| FIN-FR-045 | The system shall let an officer pay funded vouchers by a chosen e-Payment batch, and shall record each bank result, where a return leaves the voucher unpaid with a reason. | TRR 52 | M | T | Prototyped | 85-fin-pay-crud.js fnEp; sweep FC3 walk |
| FIN-FR-046 | The system shall let an officer record a cheque or cash payment from the agency account. | TRR 52 | M | T | Partial | 66c-fin-fn2.js vcAct paycash |
| FIN-FR-047 | The system shall give a clock to pay out or return funded money, and shall warn when it passes. | TRR 99 | M | T | Partial | 66c-fin-fn2.js finClocks |
| FIN-FR-048 | On payment the system shall issue a numbered withholding tax certificate when tax was withheld, and shall let finance mark it sent. | TRR 19 | M | T | Partial | 66c-fin-fn2.js vPaid, vcAct cert |
| FIN-FR-049 | The system shall let an officer cancel and reissue a certificate with a reason, keeping the old one. | - | S | T | Prototyped | 85-fin-pay-crud.js vcReissue; sweep FC3 walk |
| FIN-FR-050 | The system shall let the head of finance tick each paid voucher against its evidence, or note one and leave it unticked, and shall refuse to sign while a voucher has neither. | TRR 43 | M | T | Prototyped | 85-fin-pay-crud.js dckSign, dckFlag; sweep FC3 walk |
| FIN-FR-051 | The system shall record money paid back on a paid voucher under BR-FIN-16, shall refuse more than the net left, and shall add the receipt to the remittance clocks. | TRR 100 | M | T | Prototyped | 85-fin-pay-crud.js vcRefund; sweep FC3 walk |
| FIN-FR-052 | The system shall list tax withheld and penalties deducted on paid vouchers. | TRR 19 | S | D | Partial | 66e-fin-fn4.js FS.wht |

### Supplier bank accounts {#fin-fr-bank}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-053 | The system shall own supplier bank accounts in Finance, and shall let a finance officer ask to change one with a bank, a 10-digit account number and the supplier's evidence. | TRR 20 | M | T | Prototyped | 84-fin-crud.js fnVend; sweep FC1 walk |
| FIN-FR-054 | The system shall let only a second person confirm or refuse a change (SD-14), shall not offer the action to the requester, and shall log a refused attempt. | - | M | T | Prototyped | 84-fin-crud.js acts; sweep FC1 walk |
| FIN-FR-055 | On confirmation the system shall apply the new account and shall keep each earlier account with its end time. | TRR 20 | M | T | Prototyped | 84-fin-crud.js ok; sweep FC1 walk |
| FIN-FR-056 | The system shall let the requester edit or withdraw a request while it waits. | - | S | T | Prototyped | 84-fin-crud.js; sweep FC1 walk |
| FIN-FR-057 | The system shall accept a change from the supplier portal into this list (PRC-IR-012), and a confirmer shall first verify it with the supplier through a contact already on record. | - | M | T | Partial | 72-t3.js vb-form |
| FIN-FR-058 | The system shall mask account numbers on every screen and in the CSV (XC-SEC-026). | - | M | T | Partial | 66c-fin-fn2.js maskAcct |
| FIN-FR-059 | The system shall warn on the first payment within 30 days of a change (BR-FIN-30). | - | M | T | Partial | 66c-fin-fn2.js vRules SG-F03 |
| FIN-FR-060 | The system shall refuse approval of a payment to a supplier by the person who asked for that supplier's account change, within 30 days. | - | S | T | Planned | - |
| FIN-FR-061 | The system shall send a confirmed account to the Comptroller General's vendor master. | TRR 20 | M | T | Planned | 84-fin-crud.js, label only |

### Advances {#fin-fr-adv}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-062 | The system shall let any user ask for an advance in My Workspace with type, purpose, dates, source and items, shall issue a numbered loan contract, and shall refuse a request with no item, no purpose, or an end before the start. | TRR 55 | M | T | Prototyped | 66d-fin-fn3.js advSave; sweep FC4 walk |
| FIN-FR-063 | The system shall let Finance enter a request for a borrower, with the borrower staying the owner. | - | S | T | Prototyped | 66d-fin-fn3.js advForm; sweep FC4 walk |
| FIN-FR-064 | The system shall let the borrower edit a request before approval, notifying the approver. | - | S | T | Prototyped | 66d-fin-fn3.js advSave; sweep FC4 walk |
| FIN-FR-065 | The system shall offer to work out per diem and accommodation from the dates and the tenant's rates. | - | C | T | Partial | 66d-fin-fn3.js af-calc |
| FIN-FR-066 | The system shall run the checks of BR-FIN-17 before approval and shall show each with its clause. | TRR 58, TRR 59, TRR 62, TRR 63, TRR 64 | M | T | Partial | 66d-fin-fn3.js advChecks |
| FIN-FR-067 | The system shall let the approver approve the request or a lower amount, with a reason for a lower amount, and shall refuse the borrower and anyone holding the borrower's authority (SD-12). | TRR 56, TRR 59 | M | T | Prototyped | 66d-fin-fn3.js advAct approve; sweep FC4 walk |
| FIN-FR-068 | The system shall apply the payment authority table to advances, and the rules for a non-budget advance. | TRR 56, TRR 60 | M | T | Planned | 66d-fin-fn3.js advChecks, check always passes |
| FIN-FR-069 | The system shall let the approver reject, and the borrower or Finance cancel before payment, each with a reason. | - | M | T | Prototyped | 66d-fin-fn3.js advAct; sweep FC2 and FC4 walks |
| FIN-FR-070 | The system shall let Finance pay an approved advance by e-Payment, shall refuse the borrower (SD-12), and shall start the clearing clock. | TRR 57 | M | T | Prototyped | 66d-fin-fn3.js advAct pay; sweep FC4 walk |
| FIN-FR-071 | The system shall let the borrower send evidence with the amount spent and, for travel, the return date, and take it back to fix before Finance checks it. | TRR 65 | M | T | Prototyped | 66d-fin-fn3.js adv-clear, crecall; sweep FC4 walk |
| FIN-FR-072 | The system shall let Finance object with a reason, which gives the borrower `advFix` days to fix it. | TRR 65 | M | T | Partial | 66d-fin-fn3.js advAct object |
| FIN-FR-073 | The system shall let Finance accept a clearing, shall refuse the borrower (SD-12), and shall issue a numbered evidence receipt. | TRR 66 | M | T | Partial | 66d-fin-fn3.js advAct accept |
| FIN-FR-074 | On accepting, the system shall open a top-up voucher when spending exceeds the advance, or expect a receipt for the cash returned when it falls short. | TRR 65 | M | T | Partial | 66d-fin-fn3.js advAct accept; 66e-fin-fn4.js data-rcadv |
| FIN-FR-075 | The system shall let the head of finance issue a demand on an overdue advance, move its date with a reason up to the limit in BR-FIN-19, and close it when the advance clears. | TRR 68 | M | T | Prototyped | 66d-fin-fn3.js advAct ddue; sweep FC7 walk |
| FIN-FR-076 | The system shall let the head of finance report an unpaid demand to the head of the agency. | TRR 68 | M | T | Partial | 66d-fin-fn3.js advAct report |
| FIN-FR-077 | The system shall show a register of advances by status, unit and search, with ageing into not due, 1 to 15, 16 to 30 and over 30 days late. | - | S | D | Partial | 66d-fin-fn3.js FS.advRegister, advAge |

### Receipts and remittance {#fin-fr-recv}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-078 | The system shall issue each receipt from a book held by the user, in number order, shall refuse an amount of zero or less, and shall ask for the fund of non-budget money. | TRR 71 | M | T | Prototyped | 66e-fin-fn4.js rcIssue; 87-fin-recv-crud.js fnRc; sweep FC1 and FC5 walks |
| FIN-FR-079 | The system shall never edit or delete a receipt. It shall let an officer cancel an unremitted receipt with a reason and open a new one filled from it, pointing back. | TRR 76 | M | T | Prototyped | 87-fin-recv-crud.js rcCancel; sweep FC5 walk |
| FIN-FR-080 | The system shall accept cash, cheque and e-Payment receipts. | TRR 78 | M | T | Partial | 66e-fin-fn4.js RC_M |
| FIN-FR-081 | The system shall record each receipt in GFMIS with its document number, and shall show when that is later than the day received. | TRR 81 | M | T | Prototyped | 87-fin-recv-crud.js record; sweep FC5 walk |
| FIN-FR-082 | The system shall keep a register of receipt books with fiscal year, numbers, holder and use, and shall let the head of finance issue a book of 1 to 500 numbers, hand it over, void the unused tail with a reason and take it back. | TRR 71 | M | T | Prototyped | 84-fin-crud.js fnBook; sweep FC1 walk |
| FIN-FR-083 | The system shall give a clock for the yearly receipt-book report and shall let an officer record it as sent. | TRR 74 | S | T | Partial | 66e-fin-fn4.js rb-report |
| FIN-FR-084 | The system shall classify receipts under BR-FIN-20 and shall work out each due date under BR-FIN-21. | TRR 100, TRR 101 | M | T | Partial | 66e-fin-fn4.js rcClass, rcDue |
| FIN-FR-085 | The system shall let an officer with a written assignment remit chosen receipts of one type, shall refuse an empty choice or a receipt not recorded in GFMIS, shall store the bank reference, and shall notify the head of finance of late items. | TRR 101, TRR 102 | M | T | Prototyped | 87-fin-recv-crud.js fnRm; sweep FC5 walk |
| FIN-FR-086 | The system shall let finance correct a remittance's reference and date with a reason, or reverse it, until GFMIS shows it. Reversed receipts wait again with their clocks unchanged. | - | M | T | Prototyped | 87-fin-recv-crud.js edit, reverse; sweep FC5 walk |

### Daily cash {#fin-fr-cash}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-087 | The system shall keep cash committee orders as dated records with at least 2 members and substitutes, shall use the order in force that day, and shall refuse a start date in the past. | TRR 86 | M | T | Prototyped | 84-fin-crud.js fnCmte; sweep FC1 walk |
| FIN-FR-088 | The system shall work out the money in the safe by type on a day, and shall let an officer prepare the daily report on each day that needs one. | TRR 92 | M | T | Partial | 66e-fin-fn4.js dcSys, dcNeeded |
| FIN-FR-089 | The system shall list missed days within the last 14 days, and shall let an officer prepare a late report with a reason. | TRR 92 | S | T | Prototyped | 66e-fin-fn4.js dcMissed, data-dclate; sweep FC7 walk |
| FIN-FR-090 | The system shall let each committee member count and sign, shall refuse a person under SD-13, and shall let a member change their own count before all have counted. | - | M | T | Partial | 66e-fin-fn4.js dc-count |
| FIN-FR-091 | The system shall apply BR-FIN-23 when the last member signs. | TRR 95 | M | T | Partial | 66e-fin-fn4.js dc-count |
| FIN-FR-092 | The system shall let the head of finance ask for a recount with a reason, keeping the earlier counts. | - | S | T | Prototyped | 66e-fin-fn4.js dc-recount; sweep FC5 walk |
| FIN-FR-093 | The system shall let the approver acknowledge the report. | TRR 92 | M | T | Partial | 66e-fin-fn4.js dc-ack |
| FIN-FR-094 | The system shall let a committee member with no Finance menu count from My Workspace. | - | S | D | Partial | 66e-fin-fn4.js VIEWS.cashcount |
| FIN-FR-095 | The system shall record each handover of the safe keys with who gave, who received and when. | TRR 84 | S | T | Planned | - |

### Non-budget money {#fin-fr-nb}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-096 | The system shall let finance add a fund with name, legal basis and opening balances at the agency and the treasury, shall allow the balances to change until money moves, shall delete one never used, and shall close an empty one. | TRR 4 | M | T | Prototyped | 88-fin-nb-crud.js fnFund; sweep FC6 walk |
| FIN-FR-097 | The system shall show each fund's income, deposits, withdrawals, spending and balances, with its movements. | TRR 20 | S | D | Partial | 66i-fin-nb.js nbBal, nbStatement |
| FIN-FR-098 | The system shall let an officer draft a yearly spending plan with lines, shall let the approver approve or return it, and shall let the officer withdraw it while it waits. | TRR 60 | M | T | Prototyped | 88-fin-nb-crud.js fnPlan; sweep FC6 walk |
| FIN-FR-099 | The system shall refuse a plan with no line, or a line below what is used, and shall refuse approval by the proposer (SD-11). | - | M | T | Partial | 88-fin-nb-crud.js check, approve |
| FIN-FR-100 | The system shall amend an approved plan as a new version, keeping the approved plan in force until the amendment is approved. | - | M | T | Prototyped | 88-fin-nb-crud.js amend; sweep FC6 walk |
| FIN-FR-101 | The system shall apply BR-FIN-24 to fund vouchers and non-budget advances, and fund vouchers shall skip GFMIS and wait to be paid from the non-budget account. | TRR 20, TRR 60 | M | T | Partial | 66i-fin-nb.js nbRule, vcAct |
| FIN-FR-102 | The system shall let an officer request a treasury withdrawal, refuse more than the treasury holds, let the approver approve or reject it with a reason, and let the officer edit it while it waits. | TRR 101 | M | T | Prototyped | 88-fin-nb-crud.js fnWd; sweep FC6 walk |
| FIN-FR-103 | The system shall give a clock on withdrawn money not paid out, and shall let an officer deposit the rest back. | TRR 101 | M | T | Prototyped | 66i-fin-nb.js finClocks; sweep FC6 walk |
| FIN-FR-104 | The system shall show Budget the plans read-only. | - | S | D | Partial | 66i-fin-nb.js ALLOC.nb |

### Reconciliation {#fin-fr-recon}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-105 | The system shall import a bank statement per account and month, shall match lines by reference and amount, and shall show matched, in transit and bank-only lines with the difference. | TRR 20 | M | T | Partial | 66f-fin-fn5.js bkMatch |
| FIN-FR-106 | The system shall build each account's book lines from every movement of that account, including non-budget advances and deposits. | - | M | T | Partial | 66f-fin-fn5.js bookLines; 66i-fin-nb.js bookLines |
| FIN-FR-107 | The system shall let an officer record a bank-only line in the books, and reverse it with a reason before signing. | - | M | T | Prototyped | 66f-fin-fn5.js data-bkadj; sweep FC5 walk |
| FIN-FR-108 | The system shall let an officer delete an imported statement with a reason before signing, keeping it, and import again. | - | M | T | Prototyped | 66f-fin-fn5.js bk-del; sweep FC5 walk |
| FIN-FR-109 | The system shall allow signing under BR-FIN-28 and shall refuse anyone who recorded that month's money (SD-15). | - | M | T | Partial | 66f-fin-fn5.js bk-sign |
| FIN-FR-110 | The system shall let a person other than the signer reopen a reconciliation with a reason while the month is open, and shall notify the auditor. | - | M | T | Prototyped | 66f-fin-fn5.js bk-reopen; sweep FC5 walk |
| FIN-FR-111 | The system shall import the GFMIS revenue report and trial balance by month, shall match remittances with the report, and shall keep the earlier import with a reason when one is imported again. | - | M | T | Prototyped | 66f-fin-fn5.js gfr-again, tb-again; sweep FC7 walk |
| FIN-FR-112 | The system shall compare the trial balance with Fisko figures and shall mark whether they agree. | - | M | T | Planned | 66f-fin-fn5.js tb-imp, always agrees |
| FIN-FR-113 | The system shall import a GFMIS payment file and shall match it with approved payments as matched, different or not in Fisko. | - | M | T | Partial | 62-finance.js gf-go |
| FIN-FR-114 | The system shall reconcile every paid voucher, of any type, and shall treat a matched or explained voucher as reconciled (V7). | - | M | T | Partial | 66c-fin-fn2.js vState, contract vouchers only |
| FIN-FR-115 | The system shall let an officer explain a difference, or match a row by hand with a reason, shall refuse the approver of that payment (SD-05), and shall keep earlier explanations. | - | M | T | Prototyped | 62-finance.js data-rexp, data-pfmatch; sweep FC7 walk |
| FIN-FR-116 | The system shall refuse a payment file import by anyone who approved a payment in it (SD-05). | - | S | T | Planned | - |
| FIN-FR-117 | The system shall let an officer undo the latest import in force with a reason while its month is open, restoring the earlier results. | - | S | T | Prototyped | 62-finance.js pfCanUndo; sweep FC7 walk |
| FIN-FR-118 | The system shall keep a register of written GFMIS assignments with duties and an end date, shall refuse an assignment with no duty, and shall revoke with a reason. | TRR 10, TRR 11 | M | T | Prototyped | 84-fin-crud.js fnGfu; sweep FC1 walk |
| FIN-FR-119 | The system shall block recording, receiving and remitting for anyone with no assignment in force for that duty, and shall log the block. | TRR 12 | M | T | Partial | 66f-fin-fn5.js gfOk, used by files and remittance only |

### Closing {#fin-fr-close}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-120 | The system shall let the head of finance close a day under BR-FIN-26. | TRR 108 | M | T | Partial | 66f-fin-fn5.js dayChecks, dcl-go |
| FIN-FR-121 | The system shall let a person other than the closer reopen a day with a reason (SD-16) and shall notify the auditor. | - | M | T | Prototyped | 66f-fin-fn5.js dcl-reopen; sweep FC5 walk |
| FIN-FR-122 | The system shall let the head of finance close a month under BR-FIN-27, shall record the failed checks and reason, and shall notify the approver and the auditor. | - | M | T | Partial | 66f-fin-fn5.js monthChecks, per-close |
| FIN-FR-123 | The system shall let a person other than the closer, among the head of finance and the approver, reopen a month with a reason of at least 10 characters (SD-16), and shall notify the auditor. | - | M | T | Partial | 66f-fin-fn5.js per-reopen |
| FIN-FR-124 | The system shall refuse every change to a record of a closed day or month (BR-FIN-13). | - | M | T | Partial | 62-finance.js pfClosed, payment matching only |
| FIN-FR-125 | The system shall show a year-end list of carry-over, advances crossing the year, next year's receipt books, the yearly report and the September trial balance. | TRR 74, TRR 106 | S | D | Partial | 66f-fin-fn5.js FS.yearEnd |
| FIN-FR-126 | The system shall give Budget the actual spending per line (BGT). | - | M | T | Partial | 66f-fin-fn5.js FS.budgetFeed |

### Carry-over {#fin-fr-carry}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-127 | The system shall list carry-over candidates under BR-FIN-29, with the amount left and the filing date. | TRR 105 | M | T | Partial | 66b-fin-fn1.js carryCands |
| FIN-FR-128 | The system shall let an officer propose a candidate to the Budget carry-over request, refusing one that fails the Budget checks, and shall show its status. | TRR 106 | M | T | Prototyped | 66b-fin-fn1.js data-fncf; sweep FC4 walk |
| FIN-FR-129 | The system shall let an officer withdraw a waiting request with a reason, and shall notify the approver and planning. | - | M | T | Prototyped | 66b-fin-fn1.js data-cfwd; sweep FC4 walk |

### Audit queries {#fin-fr-audit}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-130 | The system shall let the head of finance record a query from the national audit office with source, subject and date, and shall set its due date from `aqDays`. | TRR 109 | M | T | Prototyped | 87-fin-recv-crud.js fnAq; sweep FC5 walk |
| FIN-FR-131 | The system shall keep a draft answer until it is sent, shall then refuse edits, and shall let the head add a further explanation. | - | M | T | Prototyped | 87-fin-recv-crud.js acts; sweep FC5 walk |
| FIN-FR-132 | The system shall let the head of finance delete a query entered by mistake, with no draft or answer, with a reason, and shall notify the approver and the auditor of a sent answer. | - | S | T | Prototyped | 87-fin-recv-crud.js acts; sweep FC5 walk |

### AI and analytics {#fin-fr-ai}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-FR-133 | The system shall run agents AG-18 to AG-22 as step plans from a closed tool register, and shall stop for a person at each step that writes or notifies. The shared agent framework is in the Review chapter (REV-FR-036, REV-FR-038, REV-FR-041). | - | S | T | Partial | 66g-fin-fn6.js F_AG, F_TOOL, fAdvance |
| FIN-FR-134 | The system shall apply BR-FIN-31 and shall offer no tool that approves, pays, closes or changes an amount. | - | M | T | Partial | 66g-fin-fn6.js F_TOOL |
| FIN-FR-135 | The system shall let a person stop a run with a reason. | - | S | T | Prototyped | 66g-fin-fn6.js FIN_ASK_RUN.frun; sweep FC6 walk |
| FIN-FR-136 | The system shall forecast monthly spending to the year end with a range (F-FN-01), late advances (F-FN-02), money likely to carry over (F-FN-03) and workload for 6 weeks (F-FN-04). | - | S | T | Partial | 66g-fin-fn6.js fcMonths, fcAdvRisk, fcCarry, fcLoad |
| FIN-FR-137 | The system shall run what-ifs W-FN-01 to W-FN-04 with no change to a stored record, and shall let a user save, open, edit and delete a scenario. | - | S | T | Prototyped | 88-fin-nb-crud.js wiCalc; sweep FC6 walk |
| FIN-FR-138 | The system shall define KPI-F01 to KPI-F10 in one place, each with its formula and target. | - | S | D | Partial | 66g-fin-fn6.js kpiF |
| FIN-FR-139 | The system shall detect signals SG-F01 to SG-F07 and shall let finance confirm, dismiss and reopen each, counting false positives. A signal blocks nothing. | - | S | T | Prototyped | 66g-fin-fn6.js fSignals; sweep FC6 walk |
| FIN-FR-140 | The system shall run AI through the AI gateway of ADR-0016 with a tenant switch for each agent. | - | C | T | Planned | - |

> [!WARN] Two defects stop a real walk. A voucher for a released phase can never pass its check, because the evidence list still shows the failed gate check (OI-FIN-09). A rejected contract voucher blocks its phase for good, because the waiting list counts any voucher that is not cancelled (OI-FIN-10). FIN-FR-021 and FIN-FR-034 carry these.

## Data requirements {#fin-data}

The prototype holds these records in browser memory. The SDS sets the physical tables. Bank accounts belong to Finance, although the prototype keeps a `bank` field on the supplier.

| Record | Main attributes | Personal data |
| --- | --- | --- |
| Commitment | id, kind, name, vendor, line, amount, released, paid, signed, due, gfPo, gfPoHist | Payee, when a person |
| Voucher | id, type, contract, phase, commit, line, fund, nbLine, desc, payee, gross, vat, contrib, penalty, other, method, methodWhy, due, ev, state, maker, checker, approver, gf, gfFile, funded, paid, epay, cert, certs, refunds, dayCheck, log | Payee name and tax ID |
| Payment | id, contract, phase, amount, status, decided, recon, voucher | Approver |
| GFMIS file, e-Payment batch | id, rows, state, results, payResults, total | None |
| Bank change | id, vendor, bank, acct, by, status, done | Account number of an individual; Restricted |
| Advance | id, borrower, unit, type, purpose, start, end, returned, items, amount, approvedAmt, source, line, fund, nbLine, temp, collateral, contract, approver, paid, clearing, objection, receipt, cashBack, topup, demand, reported | Borrower, collateral |
| Receipt, receipt book | id, book, n, date, kind, payer, desc, amount, method, fund, recorded, remit, cancelled; no, fy, from, to, holder, void | Payer |
| Remittance | id, cls, rows, amount, ref, late, gf, reversed | None |
| Cash order, daily cash | order, from, members, subs; date, sys, counts, status, ack, late, recounts | Members |
| Fund, plan, withdrawal | id, name, basis, openA, openT; lines, income, status, amend, versions; amount, status, done | None |
| Bank statement, adjustment, reconciliation | acct, month, open, lines; ref, amt; status, diff, by | None |
| GFMIS assignment | user, duties, order, until, revoked | User |
| Period, day close, audit query | month, status, advReviewed, log; date, why; from, subject, date, due, draft, answer, more | Closer |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-DR-001 | The system shall hold amounts with 2 decimal places, and shall convert a whole-baht amount from Procurement without loss. | - | M | T | Partial | 66c-fin-fn2.js r2 |
| FIN-DR-002 | The system shall keep a log of each voucher and advance step with time, actor, role, action and note. | - | M | T | Partial | 66c-fin-fn2.js vLog; 66d-fin-fn3.js advLog |
| FIN-DR-003 | The system shall issue numbers per fiscal year under BR-FIN-15. | - | M | T | Prototyped | 86-fin-commit-crud.js fcSeq; sweep FC4 walk |
| FIN-DR-004 | The system shall store evidence, statements, GFMIS files and signed reports as files linked to their records. | - | S | T | Planned | - |
| FIN-DR-005 | The system shall classify the personal data in the table above in the platform's records of processing. | - | M | I | Planned | - |
| FIN-DR-006 | The system shall hold account numbers, and the tax ID and contact of an individual payee, as Restricted fields under the cross-cutting rules. | - | M | T | Planned | - |
| FIN-DR-007 | The system shall apply a retention period to financial records as the tenant setting states, and shall destroy data only when the period ends. | - | M | I | Planned | - |

## State rules {#fin-states}

State names are the values in the code. The requirements above give the checks.

| Voucher state | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| draft V1 | Being prepared | check; cancelled | Maker sends; maker cancels |
| returned V1 | Back with the maker | check; cancelled | Maker sends again; maker cancels |
| check V2 | Evidence check | approve; returned; draft; cancelled | Second person passes or returns; maker recalls; head cancels |
| approve V3 | Waiting for the authority | ready; nbready; returned; rejected; draft; cancelled | Approver acts; maker recalls; head cancels |
| ready V4 | Ready for GFMIS | posted; cancelled | Posting result; head cancels before a file |
| nbready V4 | Ready to pay from the non-budget account | paid; cancelled | Paid; head cancels |
| posted V5 | Posted in GFMIS | paid; ready | Payment result; payment failed |
| paid V6 | Paid | recon | Derived |
| recon V7 (derived) | Matched or explained | - | - |
| rejected, cancelled | Final | - | - |

| Advance state | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| request A1 | Waiting for approval | approved; rejected; cancelled | Approver; borrower |
| approved A2 | To be paid | paid; cancelled | Finance; borrower or Finance |
| paid A3 | To be cleared | clearing | Borrower sends evidence |
| clearing A4 | Being checked | cleared; objected; paid | Finance; borrower takes it back |
| objected A4 | To fix | clearing | Borrower sends again |
| cleared A5 | Final | - | - |
| rejected, cancelled | Final | - | - |

| Other record | States | Changes |
| --- | --- | --- |
| Bank change | pending, confirmed, rejected, withdrawn | A second person confirms or refuses; the requester withdraws |
| Daily cash | counting, signed, diff | The last count decides; a recount returns to counting |
| Bank reconciliation | signed, reopened | Signed; a second person reopens |
| GFMIS file | sent, posted, done, cancelled | Results; cancelled before any result |
| e-Payment batch | sent, done | Bank result |
| Remittance (derived) | sent, done, off | GFMIS report; reversed |
| Spending plan | draft, submitted, approved, returned | The approver decides; an amendment has the same states beside the approved plan |
| Withdrawal | pending, done, rejected, back | The approver decides; deposited back |
| Period | open, closed | Head closes; a second person reopens |
| Audit query (derived) | open, draft, sent, off | Draft, answer, delete |

> [!WARN] The prototype counts a phase as Paid at voucher approval, before GFMIS has posted or paid. PRC-FR-142 reads that state to close a case. Whether Paid means approved or paid is OI-FIN-08.

## Interface requirements {#fin-interfaces}

No connection to GFMIS or a bank exists in the prototype. Each result is typed or filled by a Simulate button.

| Interface | Direction | In the prototype |
| --- | --- | --- |
| Procurement | Internal | Real within the prototype: accepted phases, gate, penalties, contracts, supplier list |
| Budget | Internal | Real within the prototype: lines, room, carry-over requests, spending |
| GFMIS request and result | Out and in | Simulated: a text file and results entered by hand |
| GFMIS revenue report, trial balance, payment file | In | Simulated: built from Fisko data |
| Bank statement, e-Payment | In and out | Simulated |
| Comptroller General vendor master | Out | A label only |
| HR payroll file | In | Not built |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-IR-001 | The system shall read accepted phases, the gate result, penalty and net through the Procurement interface, and never its tables. | - | M | T | Partial | 60-procurement.js famAcceptedUnpaid; 63-contracts.js payGate |
| FIN-IR-002 | The system shall answer Procurement with the PO fact and payment started, so that Procurement can refuse a waiver or invoice return (PRC-FR-126, PRC-FR-117). | - | M | T | Partial | 87-proc-e2e.js phPayStarted |
| FIN-IR-003 | The system shall tell Procurement when a payment is approved, rejected or cancelled. | - | M | T | Partial | 66c-fin-fn2.js vcAct |
| FIN-IR-004 | The system shall reserve, commit, release and record spending on allocation lines through the Budget interface. | TRR 18 | M | T | Partial | 60-procurement.js famHeadroom, famOther |
| FIN-IR-005 | The system shall send carry-over candidates and actual spending to Budget. | TRR 106 | M | T | Partial | 66b-fin-fn1.js data-fncf |
| FIN-IR-006 | The system shall send POs and payment requests to GFMIS and receive results through an adapter that can change from file to API with no change to the voucher logic. | TRR 28 | M | T | Planned | 85-fin-pay-crud.js gfoCsv |
| FIN-IR-007 | The system shall show each outbound item's delivery state to the user, and shall never send one twice. | - | M | T | Planned | - |
| FIN-IR-008 | The system shall import GFMIS reports and bank statements through mappings held as configuration. | - | M | T | Planned | - |
| FIN-IR-009 | The system shall make e-Payment files for the bank and read its result. | TRR 52 | M | T | Planned | - |
| FIN-IR-010 | The system shall accept the monthly payroll total from the HR system as a file, to count it as spending. | - | C | T | Planned | - |
| FIN-IR-011 | The system shall publish paid spending to `projects` and `review` through its published interface. | - | S | T | Planned | - |

> [!OPEN] The Comptroller General's Department must confirm how GFMIS connects, as the Integration chapter asks (DG-XC-20), and must also state the layouts of the PO, payment request, posting result, payment result, revenue report, trial balance and vendor master data. Each bank must give its statement and e-Payment layouts (OI-FIN-02, OI-FIN-03).

## Non-functional requirements specific to Finance {#fin-nfr}

Finance meets all rows of the cross-cutting chapter, including ASVS Level 3 for payment functions (XC-SEC-002), and they are not repeated here. This table adds only what is particular to Finance.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-NFR-001 | Every approval, rejection, cancellation, release, reopening, settings change, import and bank change in Finance shall write an audit entry with actor and item. | - | M | T | Partial | audit() calls in 62 to 88 |
| FIN-NFR-002 | Every attempt blocked by a Finance duty rule shall be logged as PLT requires. | - | M | T | Prototyped | 64-duties.js sodCheck; sweep FC1 walk |
| FIN-NFR-003 | Every simulated result shall be labelled on screen and in its log, and simulation controls shall not exist in a production tenant. | - | M | I | Partial | 85-fin-pay-crud.js sim |
| FIN-NFR-004 | Tax, net and remittance dates shall give the same result for the same input, to 2 decimal places. | - | M | T | Partial | 66c-fin-fn2.js vCalc; 66e-fin-fn4.js rcDue |
| FIN-NFR-005 | Screens shall exist in Thai and English, and the tax certificate, demand letter and reports shall be in Thai. | - | S | D | Partial | L() labels in 62 to 88 |
| FIN-NFR-006 | A forecast shall show its range and assumptions, and the same data shall give the same result. | - | S | T | Partial | 66g-fin-fn6.js fcMonths |

### Design and implementation constraints {#fin-cr}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-CR-001 | Fisko shall not act as the official ledger (BR-FIN-01). | - | M | I | Partial | 62-finance.js header comment |
| FIN-CR-002 | Finance shall depend on `procurement.api` and implement Procurement's SPI, and shall reach other modules only through their interfaces. | - | M | I | Planned | - |
| FIN-CR-003 | State changes shall be enforced on the server in code (ADR-0007), and screens shall not be the only guard. | - | M | I | Planned | - |
| FIN-CR-004 | Agency specifics shall live only in tenant data, and no clause-derived number shall be fixed in form text. | - | M | I | Partial | 66b-fin-fn1.js FCFG_DEFAULT |
| FIN-CR-005 | Finance events shall go to the tamper-evident audit log of ADR-0015. | - | M | I | Planned | - |

## Test evidence {#fin-tests}

A Prototyped row rests on one of the checks below in `tests/sweep.js`. Each is a walk that drives the real actions and raises an error when the result is wrong. The author read these checks and did not run them for this version.

| Sweep check | What it asserts | Related requirements |
| --- | --- | --- |
| FC1 walk | GFMIS assignment needs a duty, is edited and revoked; a short account refused; the requester sees no confirm or refuse; refuse, confirm, withdraw; a committee of one refused; dated orders; books issued, handed over, voided, returned; receipts go to the new book; P-F05 logged | FIN-FR-032, FIN-FR-053 to FIN-FR-056, FIN-FR-078, FIN-FR-082, FIN-FR-087, FIN-FR-118, FIN-NFR-002 |
| FC2 walk | Authority levels; zero gross and cash with no reason refused; a second voucher cannot pass the commitment; recall; the checker cannot approve; approval at A2; head cancels; repeated returns; reject is final; advance reject needs a reason | FIN-FR-003, FIN-FR-022, FIN-FR-023, FIN-FR-030 to FIN-FR-033, FIN-FR-035, FIN-FR-036, FIN-FR-069 |
| FC3 walk | Empty file refused; voucher taken out; a failed row needs a reason; posting and payment results; file cancelled; e-Payment batch; the daily check per voucher; refund gives the line back; refund above net refused; certificate reissued | FIN-FR-041 to FIN-FR-045, FIN-FR-049 to FIN-FR-051 |
| FC4 walk | Commitment above the line refused; amount locks; release and its maximum; cancel refused while held; delete and number kept; PO corrected and cleared; carry-over proposed and withdrawn; advance form rules; approve, cancel, enter for someone, pay, clocks, take back; SD-12 at payment | FIN-FR-009 to FIN-FR-012, FIN-FR-014, FIN-FR-062 to FIN-FR-064, FIN-FR-067, FIN-FR-069 to FIN-FR-071, FIN-FR-128, FIN-FR-129, FIN-DR-003 |
| FC5 walk | Zero receipt refused; recorded, cancelled and reissued; remittance made, corrected, reversed, made again; recount; adjustment reversed; statement deleted and imported again; SD-16 on signer and closer; audit clock; answer, no later edit, further explanation, delete | FIN-FR-078, FIN-FR-079, FIN-FR-081, FIN-FR-085, FIN-FR-086, FIN-FR-092, FIN-FR-107, FIN-FR-108, FIN-FR-110, FIN-FR-121, FIN-FR-130 to FIN-FR-132 |
| FC6 walk | Fund deleted and opening edited; plan lines; plan withdrawn and approved; amendment keeps the plan in force; withdrawal above the treasury refused; edit, reject, approve, deposit back; what-if edit, open, delete; run stopped; signal confirmed and reopened | FIN-FR-096, FIN-FR-098, FIN-FR-100, FIN-FR-102, FIN-FR-103, FIN-FR-135, FIN-FR-137, FIN-FR-139 |
| FC7 walk | Demand date limit and move; demand closes on clearing; reports imported again; match by hand; explanation edited; import undone; late cash report | FIN-FR-075, FIN-FR-089, FIN-FR-111, FIN-FR-115, FIN-FR-117 |

The sweep also opens every Finance page, tab and record drawer for the listed roles, and fails on a thrown error or broken text. That proves the page renders, so those rows stay Partial. The demo steps E-F01 to E-F15 only open pages. The agent suite starts each agent and asserts nothing about its steps. No sweep check asserts the tax calculation, the route, the remittance dates, a differing cash count, SD-04, SD-13, SD-15 or the month close.

## Open issues of Finance {#fin-open}

| Issue | Question | Needed from | Effect on this chapter |
| --- | --- | --- | --- |
| OI-FIN-01 | Confirm every TRR clause, each level B value, and amendments after 2562 | Finance specialist, legal unit | Clause column; business rules |
| OI-FIN-02 | GFMIS contracts in the interface section | Comptroller General's Department | FIN-IR-006, FIN-IR-008, FIN-FR-061 |
| OI-FIN-03 | Bank statement and e-Payment layouts | Banks, product owner | FIN-IR-008, FIN-IR-009 |
| OI-FIN-04 | Withholding table for compensation | Finance specialist, tax adviser | FIN-FR-029 |
| OI-FIN-05 | The voucher fixes VAT at 7 percent, while the procurement profile holds `vatPct`. One dated rule must serve both | Development team, finance specialist | BR-FIN-07 |
| OI-FIN-06 | The code cites clauses 55 to 68 of the treasury regulation for advances, so this chapter uses TRR. Does the Regulation on Advance Funds (ADV) apply to any Finance work? | Finance specialist | Advances group |
| OI-FIN-07 | May a reason override a failed close check, or must some checks be hard stops? | Finance specialist, auditor | BR-FIN-26, BR-FIN-27 |
| OI-FIN-08 | Does a phase become Paid at approval, as the code does, or when money is paid? | Product owner, Procurement owner | FIN-FR-039, PRC-FR-142 |
| OI-FIN-09 | A released phase never passes the evidence check, because `vEvidence` copies the failed gate check Fixed in round 67, with a sweep check. | Development team | FIN-FR-021 |
| OI-FIN-10 | A rejected contract voucher blocks its phase, because `famAcceptedUnpaid` and `phPayStarted` count any voucher not cancelled Fixed in round 67, with a sweep check. | Development team | FIN-FR-034 |
| OI-FIN-11 | SD-03 is checked at voucher approval since round 67. With SD-11 on it never fires first, so it may still be merged | Finance owner, Platform owner | OI-PLT-04 |
| OI-FIN-12 | Retention of vouchers, receipts, advances and statements | Finance specialist, product owner | FIN-DR-007 |
| OI-FIN-13 | How does a confirmer verify a change from the portal, and who is the second person when the requester is the supplier? | Finance specialist, security reviewer | FIN-FR-057 |
| OI-FIN-14 | The payroll file: scope and layout | Product owner | FIN-IR-010 |
| OI-FIN-15 | Should the system check the rank of cash committee members? | Finance specialist | BR-FIN-22 |
| OI-FIN-16 | Procurement holds whole baht (PRC-DR-006) and Finance holds satang. They must agree (OI-PRC-16) | Procurement specialist, finance specialist | FIN-DR-001 |
| OI-FIN-17 | Closed-period protection covers payment matching and reconciliation reopening only | Development team | FIN-FR-124 |
| OI-FIN-18 | Only contract payments can reach V7; `v.recon` is never set, so KPI-F06 leaves out other vouchers | Development team | FIN-FR-114 |
| OI-FIN-19 | The advance approval does not read the authority table, and the clause 60 check always passes | Development team | FIN-FR-068 |
| OI-FIN-20 | The non-budget book lines leave out advances and cash movements, so that account cannot reconcile | Development team | FIN-FR-106 |
| OI-FIN-21 | The settings form accepts any number, including level A values, and has no range check | Development team, product owner | FIN-FR-002 |
| OI-FIN-22 | The GFMIS assignment check is missing on recording receipts and results | Development team | FIN-FR-119 |
| OI-FIN-23 | The AI scope and where the model runs | Product owner, data protection officer | FIN-FR-140 |

The design documents and the code differ in the following places. The code says what exists, and each difference is carried by the row named.

| Topic | Design | Code | Row |
| --- | --- | --- | --- |
| Page count | F1 to F9 | F1 to F11; registers and non-budget money have pages of their own | Purpose |
| Voucher start | V1 to V2 can be automatic after acceptance | A person always sends it | FIN-FR-017 |
| Penalty on a contract voucher | Comes from Procurement | Finance can edit it on the voucher | FIN-FR-019 |
| SD-14 | Also bars payment approval for 30 days | Warning SG-F03 only | FIN-FR-060 |
| SD-05 | The reconciler is never the approver | Checked on explanation and hand match, not on import | FIN-FR-116 |
| Key handover | Listed | Not built | FIN-FR-095 |
| Clock reminders | 7, 3 and 1 days and escalation | Not built | FIN-FR-006 |
| Trial balance | Compared with Fisko | Always marked as agreeing | FIN-FR-112 |
| Period states | P1 to P4 | open, closed, with a log | State rules |
| Carry-over limit in time | 6 months, with extension | Not modelled in Finance | BR-FIN-29 |

## Status summary {#fin-status}

The statuses in this chapter come from reading the code and the tests. The sweep was not run for this version, and nothing here is production code. Most Partial rows have working code and a page-open sweep only, so a specific check would raise them to Prototyped without any new feature.

{{status-summary: prefix=FIN}}
