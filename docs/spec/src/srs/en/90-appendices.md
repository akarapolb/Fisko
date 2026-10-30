# Appendices {#appendices}

These appendices bring together what the chapters leave open: the decisions still needed, where design and code differ, the defects found in the prototype, and how far the clause register is answered.

## Open issues by who must decide {#app-open}

The 112 open issues of the cross-cutting and module chapters are listed here by who must act. An issue with several deciders sits under the first one named, and its third column shows all of them. The text is copied from the chapters, so "this chapter" in a row means the chapter of that issue's module.

| Decider | XC | PLT | BGT | PRC | FIN | PRJ | REV | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product owner and executives | 5 | 7 | 1 | 2 | 3 | 7 | 6 | 31 |
| Legal unit and lawyers | 6 | 1 | 0 | 2 | 0 | 2 | 0 | 11 |
| Data protection and records | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 3 |
| Budget specialist and Planning | 0 | 0 | 7 | 0 | 0 | 0 | 1 | 8 |
| Procurement specialist | 0 | 1 | 0 | 9 | 1 | 0 | 0 | 11 |
| Finance specialist and finance owner | 0 | 1 | 0 | 0 | 8 | 0 | 0 | 9 |
| Security reviewer and auditor | 0 | 1 | 0 | 1 | 0 | 0 | 1 | 3 |
| External bodies and tenants | 0 | 1 | 1 | 1 | 2 | 2 | 0 | 7 |
| Development team and technical lead | 1 | 2 | 5 | 2 | 9 | 7 | 3 | 29 |
| **Total** | **13** | **15** | **14** | **17** | **23** | **18** | **12** | **112** |

### Product owner and executives {#app-open-po}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-XC-01 | Confirm or replace every performance target, and give the size of the peak load per cell | Product owner | Performance rows, XC-PER-008 |
| OI-XC-02 | Confirm or replace availability, RPO, RTO and the maintenance window | Product owner | XC-AVL-001, XC-AVL-002, XC-AVL-003, XC-AVL-007 |
| OI-XC-03 | Confirm the other proposals: idle range, sign-in lockout, key rotation, key drills, audit checkpoints, API limits, index delay, alert threshold, supported browsers, the time to fix a critical flaw | Product owner, security reviewer | Rows marked as a proposal outside the two sections above |
| OI-XC-04 | What counts as finance and payments for ASVS Level 3 | Product owner, security reviewer | XC-SEC-002 |
| OI-XC-09 | How to cite the Government Website Standard มสพร. 11-2566 in the clause register, and which of its sections Fisko must answer | Product owner, legal unit | Usability and accessibility rows, XC-SEC-007 |
| OI-PLT-01 | Two overlapping delegations from one person are allowed. Should an overlap be forbidden, allowed with a warning, or allowed only for different delegates? | Product owner, legal unit | PLT-FR-061, PLT-FR-042 |
| OI-PLT-02 | Which approvals may be delegated under the rules, for how long, and is a maximum length needed? (D-09) | Executives, legal unit | BR-PLT-10, BR-PLT-11 |
| OI-PLT-05 | Does one person need several roles or several units, for example an acting head? | Product owner | BR-PLT-02 |
| OI-PLT-06 | Confirm the range XC-SEC-008 proposes for `idleMin`, set one for `warnMin`, and say whether 0 is allowed | Product owner, security reviewer | BR-PLT-05 |
| OI-PLT-07 | MFA for every staff account, as the code and XC-SEC-006 do, or only for executives, Planning, Finance and administrators, as the design says? | Product owner, security reviewer | BR-PLT-03 |
| OI-PLT-08 | Should a delegate be limited to `plan`, `exec` and `fin`? The heads of procurement and finance and the division directors cannot receive or give a delegation | Product owner, legal unit | BR-PLT-11, BR-PLT-12 |
| OI-PLT-11 | SLA days are calendar days in the code. Should they be working days? | Product owner | BR-PLT-17 |
| OI-BGT-14 | The AI scope and where the model runs | Product owner, data protection officer | BGT-FR-174 |
| OI-PRC-12 | The AI scope and where the model runs. Level L3 for AG-12 is decided in OI-REV-04 | Product owner, data protection officer | PRC-FR-189, BR-PRC-34, PRC-FR-187 |
| OI-PRC-17 | A requirement for sealed RFQ replies, which ADR-0013 expects and this chapter lacks | Product owner, security reviewer | PRC-NFR-007 |
| OI-FIN-08 | Does a phase become Paid at approval, as the code does, or when money is paid? | Product owner, Procurement owner | FIN-FR-039, PRC-FR-142 |
| OI-FIN-14 | The payroll file: scope and layout | Product owner | FIN-IR-010 |
| OI-FIN-23 | The AI scope and where the model runs | Product owner, data protection officer | FIN-FR-140 |
| OI-PRJ-01 | When is a project id issued: at a draft request, at a submitted request or at a line? Which fiscal year does the id carry after that? | Product owner | PRJ-FR-001, PRJ-FR-002 |
| OI-PRJ-02 | Can one project span several lines, and can projects be split or merged? The prototype assumes one line for one project in one year | Product owner, Planning | PRJ-DR-001, PRJ-FR-027 |
| OI-PRJ-04 | The cycle says contracts, changes and acceptance come from the PM system, while Procurement owns them in Fisko. Which system is the master when a tenant holds them in both? | Product owner, procurement specialist | BR-PRJ-09, PRJ-FR-041 |
| OI-PRJ-05 | Does an approval cover one external send or every later send to that consumer? The rule says approval comes first, and the code approves once per consumer | Executive sponsor, legal unit | BR-PRJ-14, PRJ-FR-049 |
| OI-PRJ-07 | Confirm the proposals: `prefix` form, `staleDays` range, and the 60 seconds of PRJ-NFR-002 | Product owner | BR-PRJ-12, settings |
| OI-PRJ-10 | The code gives the PM exchange the interface id IF-08, which the Solution Design gives to other message channels. Which id stands? | Product owner | PRJ-IR-007 |
| OI-PRJ-11 | Is a module and duty map a product feature, or does it end with the tenant acceptance? | Product owner | PRJ-FR-060 to PRJ-FR-062 |
| OI-REV-02 | Who switches agents and sets levels? The code says the executive, and XC-AI-002 says an administrator of the tenant opts in | Product owner, data protection officer | REV-FR-049, REV-FR-050 |
| OI-REV-04 | May AG-12 at level L3 create tasks and notices with no person, given BR-PLT-25 and ADR-0016? | Product owner | BR-REV-08, REV-FR-040, BR-PRC-34, PRC-FR-187 |
| OI-REV-05 | May AG-03 write round 2 amounts after a person approves, given BR-PLT-25 says AI never changes amounts? | Product owner, Planning | REV-FR-039, the Budget chapter |
| OI-REV-07 | Does the product need cross-module agendas, and does the project scorecard belong here or in Budget? | Product owner | REV-FR-053 to REV-FR-055, REV-FR-010 |
| OI-REV-09 | Which forecast of spending is the official figure? | Product owner, head of finance | REV-FR-019 |
| OI-REV-11 | Confirm the quality targets, which the design only proposes | Product owner | REV-NFR-001 to REV-NFR-004 |

### Legal unit and lawyers {#app-open-legal}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-XC-05 | Confirm the PDPA clause numbers, the 15-day limit, the processor limit of 72 hours, legal bases and erasure by key destruction, including the draft PDPC guidance | Thai PDPA lawyer | Privacy rows, XC-SEC-039 |
| OI-XC-06 | ADR-0014 lists access, correction, deletion and objection, while the prototype privacy page also promises copy and restriction. Confirm the list, and whether PDPA portability applies | Thai PDPA lawyer, product owner | XC-PRV-010 |
| OI-XC-08 | Which clauses of the Cybersecurity Act and the Digital Government Administration Act bind the agency or the operator, including log keeping and incident reporting | Legal unit | Security rows, which show a dash today |
| OI-XC-10 | Confirm the ETA clauses, and choose the certificate authority and timestamp service with ETDA guidance in mind | Legal unit, product owner | XC-DAT-009, XC-DAT-011 |
| OI-XC-11 | Proposal, from the Procurement SDS: the sealed bids of XC-SEC-028 are only the RFQ replies sent through the supplier portal, because official bids stay in e-GP and reach Fisko only after closing. Confirm this reading. OI-PRC-13 and OI-PRC-17 ask the same | Legal unit, product owner | XC-SEC-028 |
| OI-XC-12 | Lawyer review of the licence, the contributor agreement (CLA or DCO) and the trademark, and the redistribution licence of TH Sarabun New | Lawyer, product owner | XC-LIC-007, XC-LIC-008 |
| OI-PLT-12 | Confirm PDPA 23, 24, 30, 32, 33, 34 and 41 in this chapter's register file and the legal positions of ADR-0014, including the draft PDPC guidance reported in July 2026 | PDPA lawyer | PLT-FR-108, PLT-FR-114, PLT-FR-116, BR-PLT-24 |
| OI-PRC-08 | Who owns the method rules table and how often it is reviewed | Legal unit, product owner | PRC-FR-040 |
| OI-PRC-13 | Whether full bid files stay out of Fisko | Legal unit, data protection officer | PRC-DR-007, PRC-DR-008 |
| OI-PRJ-06 | Which law governs sharing with other agencies, and what legal basis applies? No clause is cited here because none could be confirmed (see OI-XC-08) | Legal unit, data protection officer | PRJ-DR-007, Clause column |
| OI-PRJ-08 | Retention of PM messages and the send log | Legal unit, product owner | PRJ-DR-008 |

### Data protection and records {#app-open-dpo}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-XC-07 | Retention periods per record type, including the audit log, application logs and backups | Records officer, Thai PDPA lawyer | XC-PRV-014, XC-SEC-042, XC-DAT-011 |
| OI-PLT-13 | Retention periods per record type, and whether the 1 to 30 year range fits the records rules | Records officer, data protection officer | BR-PLT-23 |
| OI-REV-12 | May an anomaly's supplier name go to a model at all, since it may be a natural person? | Data protection officer | REV-DR-005, REV-FR-030 |

### Budget specialist and Planning {#app-open-bgt}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-BGT-01 | Confirm every BPA section in the register for this chapter | Budget specialist | Clause column |
| OI-BGT-02 | Read the regulation with its second amendment of 2567, and confirm clauses 9, 15, 16, 18, 21, 25 to 29, 33 to 36. The design marks clauses 25 to 29 and 34 as the ones to check first | Budget specialist | BR-BGT-26 to BR-BGT-33 |
| OI-BGT-03 | Which rule values are legal limits, the allowed range of the others, and whether the transfer table is a yearly setting. The full criteria under clause 28 were not read, so T1 and T2 may differ | Budget specialist, product owner | BR-BGT-09, BR-BGT-10, BR-BGT-26, BGT-FR-161 |
| OI-BGT-10 | Retention of budget records | Budget specialist, product owner | BGT-DR-010 |
| OI-BGT-11 | Spending targets are level B values from an earlier year, and forecast, signal and 3R values are level C. Who sets them each year? | Budget specialist, product owner | BGT-FR-160 |
| OI-BGT-12 | Whole baht or satang for amounts. Budget lines use million-baht inputs, and GFMIS carries satang | Budget specialist, product owner | BGT-DR-006 |
| OI-BGT-13 | Who may approve a T2, given that clause 28 may let the agency decide it, and whether the delegation scope `transfer` also covers Finance for T1 | Budget specialist, legal unit | BR-BGT-27 |
| OI-REV-06 | Ranges of the bands, score weights, grade limits and anomaly risk limit | Planning, auditor | BR-REV-05 to BR-REV-07, REV-CR-003 |

### Procurement specialist {#app-open-prc}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-PLT-03 | Which duty rules come from law and can never be switched off? This is one question with DG-PRC-05 in the SDS, and one answer settles both | Procurement specialist, finance specialist, legal unit | BR-PLT-09, PLT-CR-006 |
| OI-PRC-01 | Confirm every clause in the register for this chapter, and supply clauses for appeals, abandoned work, conflicts of interest, guarantees, contract changes, waivers and the monthly summary, whose rows show a dash | Procurement specialist | Clause column; PRC-FR-008, PRC-FR-036, PRC-FR-109, PRC-FR-120 |
| OI-PRC-02 | The specific-method ceiling and thresholds for the selective method and e-bidding are not fully confirmed | Procurement specialist | BR-PRC-01, PRC-FR-040 |
| OI-PRC-06 | Penalty base, and whether a partial acceptance reduces it | Procurement specialist | PRC-FR-120 |
| OI-PRC-07 | Allowed ranges of the stored settings | Procurement specialist, product owner | Business rules |
| OI-PRC-09 | The monthly summary layout and its publication channel | Procurement specialist | PRC-FR-164 |
| OI-PRC-10 | SME and MiT preference rates, and committee fee rates and caps, are starting values | Procurement specialist | BR-PRC-31, BR-PRC-29 |
| OI-PRC-14 | Retention of case files and contracts | Procurement specialist, product owner | PRC-DR-010 |
| OI-PRC-15 | Daily penalty rate for consulting and design contracts, which BR-PRC-12 does not give | Procurement specialist | PRC-FR-037, BR-PRC-12 |
| OI-PRC-16 | Whole baht or satang for amounts, since real invoices carry satang | Procurement specialist, product owner | PRC-DR-006 |
| OI-FIN-16 | Procurement holds whole baht (PRC-DR-006) and Finance holds satang. They must agree (OI-PRC-16) | Procurement specialist, finance specialist | FIN-DR-001 |

### Finance specialist and finance owner {#app-open-fin}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-PLT-10 | Fiscal year status has no fixed order and a closed year can be reopened by one person. Should the transitions be fixed, and who may reopen? | Finance specialist, product owner | BR-PLT-21 |
| OI-FIN-01 | Confirm every TRR clause, each level B value, and amendments after 2562 | Finance specialist, legal unit | Clause column; business rules |
| OI-FIN-04 | Withholding table for compensation | Finance specialist, tax adviser | FIN-FR-029 |
| OI-FIN-06 | The code cites clauses 55 to 68 of the treasury regulation for advances, so this chapter uses TRR. Does the Regulation on Advance Funds (ADV) apply to any Finance work? | Finance specialist | Advances group |
| OI-FIN-07 | May a reason override a failed close check, or must some checks be hard stops? | Finance specialist, auditor | BR-FIN-26, BR-FIN-27 |
| OI-FIN-11 | SD-03 is checked at voucher approval since round 67. With SD-11 on it never fires first, so it may still be merged | Finance owner, Platform owner | OI-PLT-04 |
| OI-FIN-12 | Retention of vouchers, receipts, advances and statements | Finance specialist, product owner | FIN-DR-007 |
| OI-FIN-13 | How does a confirmer verify a change from the portal, and who is the second person when the requester is the supplier? | Finance specialist, security reviewer | FIN-FR-057 |
| OI-FIN-15 | Should the system check the rank of cash committee members? | Finance specialist | BR-FIN-22 |

### Security reviewer and auditor {#app-open-sec}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-PLT-15 | The Government Website Standard (มสพร. 11-2566) and the Cyber Security Act are named in the code with no clause. Which clauses bind idle sign-out and the policy pages? | Security reviewer, legal unit | PLT-FR-015, PLT-FR-106 |
| OI-PRC-11 | Who sees red flags, the time to explain, and how they relate to red flags in e-GP | Auditor, product owner | PRC-FR-173, PRC-FR-174 |
| OI-REV-08 | The rules and thresholds of each anomaly kind, who sees them, and how long a unit has to explain. The design gives 500,000 baht as an example only | Auditor, procurement specialist | REV-FR-022, REV-FR-027 |

### External bodies and tenants {#app-open-ext}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-PLT-14 | Which channels beyond in-app and e-mail are allowed (D-07, DG-XC-22)? The code lists LINE, and the integration chapter lists SMS | IT unit, data protection officer | PLT-FR-075 |
| OI-BGT-04 | File layouts and API access for e-Budgeting, BBL, BB EvMIS and GFMIS | Budget Bureau, Comptroller General's Department | BGT-IR-003, BGT-IR-004, BGT-IR-005 |
| OI-PRC-03 | The e-GP contracts in the interface section | Comptroller General's Department | PRC-IR-001, PRC-IR-005, PRC-IR-014 |
| OI-FIN-02 | GFMIS contracts in the interface section | Comptroller General's Department | FIN-IR-006, FIN-IR-008, FIN-FR-061 |
| OI-FIN-03 | Bank statement and e-Payment layouts | Banks, product owner | FIN-IR-008, FIN-IR-009 |
| OI-PRJ-03 | The PM interface: transport, access, message format, and whether a tenant PM system will follow a standard Fisko sets | Each tenant, product owner | PRJ-IR-004 to PRJ-IR-006 |
| OI-PRJ-09 | The prototype builds the GFMIS code by joining a unit code and an activity code, as a placeholder. What is the real code, and where does it come from? | Comptroller General's Department, FIN author | PRJ-FR-004 |

### Development team and technical lead {#app-open-dev}

| Issue | Question | Needed from | Affects |
| --- | --- | --- | --- |
| OI-XC-13 | The category code `I18` has a digit, and the id patterns in `scripts/build_spec.py` accept letters only, so an `XC-I18` row would drop out of the requirement list. Fix the patterns, or keep language rows under `XC-ACC` | Development team | XC-ACC-012 to XC-ACC-018 |
| OI-PLT-04 | SD-03 and SD-09 have checks since round 67. SD-10 still has no switch or log, and SD-07 and one SD-06 path still do not log blocks. Wire each one or remove it | Development team, FIN and BGT owners | PLT-FR-046 |
| OI-PLT-09 | Undo removes the audit entry of the undone action. Replace it with compensating actions | Development team | BR-PLT-19, PLT-FR-143 |
| OI-BGT-05 | A transfer at `bb` holds no money. Fix it and add a check Fixed in round 67, with a sweep check. | Development team | BGT-FR-117, BGT-FR-114 |
| OI-BGT-06 | SD-09 has a check since round 67, so one person cannot request and approve the same transfer. SD-10 still has no switch or log (OI-PLT-04) | Development team, BGT owner | BGT-FR-124, BGT-FR-070 |
| OI-BGT-07 | `nextReqId` takes the highest live number plus one, so deleting the newest draft reuses its number. A transfer from AG-15 numbers from the list length while the screen uses a counter, so the two can clash. Use one counter Fixed in round 68. | Development team | BGT-FR-034, BGT-DR-005 |
| OI-BGT-08 | A draft line offers activities from the year being formulated even for the year being spent, so its programme and output may come from another year's structure | Development team | BGT-FR-098 |
| OI-BGT-09 | The carry-over page fixes the text of the deadline date, and investment quarterly targets stay in code | Development team | BGT-CR-002, BGT-FR-134 |
| OI-PRC-04 | Fix the settings form so that it can save, and add a sweep check Fixed in round 67, with a sweep check. | Development team | PRC-FR-042 |
| OI-PRC-05 | The contract drawer now checks SD-06 as the older control does (round 67). It shows the block as a form error and logs no blocked attempt, and two paths remain where one should | Development team | PRC-FR-086 |
| OI-FIN-05 | The voucher fixes VAT at 7 percent, while the procurement profile holds `vatPct`. One dated rule must serve both | Development team, finance specialist | BR-FIN-07 |
| OI-FIN-09 | A released phase never passes the evidence check, because `vEvidence` copies the failed gate check Fixed in round 67, with a sweep check. | Development team | FIN-FR-021 |
| OI-FIN-10 | A rejected contract voucher blocks its phase, because `famAcceptedUnpaid` and `phPayStarted` count any voucher not cancelled Fixed in round 67, with a sweep check. | Development team | FIN-FR-034 |
| OI-FIN-17 | Closed-period protection covers payment matching and reconciliation reopening only | Development team | FIN-FR-124 |
| OI-FIN-18 | Only contract payments can reach V7; `v.recon` is never set, so KPI-F06 leaves out other vouchers | Development team | FIN-FR-114 |
| OI-FIN-19 | The advance approval does not read the authority table, and the clause 60 check always passes Round 68 makes the approval read the table and record the level. The clause 60 check still always passes. | Development team | FIN-FR-068 |
| OI-FIN-20 | The non-budget book lines leave out advances and cash movements, so that account cannot reconcile | Development team | FIN-FR-106 |
| OI-FIN-21 | The settings form accepts any number, including level A values, and has no range check Round 68 refuses negative and non-numeric values. Level A values can still be changed. | Development team, product owner | FIN-FR-002 |
| OI-FIN-22 | The GFMIS assignment check is missing on recording receipts and results Fixed in round 68. | Development team | FIN-FR-119 |
| OI-PRJ-12 | Fix the id of a line created in the allocation form: the code reads a number from the id, gets none, and gives such lines the same broken project id Fixed in round 68. | Development team | PRJ-FR-001 |
| OI-PRJ-13 | Stop counting draft contracts as committed, and released amounts as still committed. Today a project can differ from the line ledger and can reach step 5 on a draft Fixed in round 68. | Development team | PRJ-FR-019 |
| OI-PRJ-14 | Make the send comparison independent of the language. Target and area are compared as display text, so switching language marks projects with those fields as changed Fixed in round 68. | Development team | PRJ-DR-005 |
| OI-PRJ-15 | Count a phase as accepted only on acceptance. The code also counts a delivered phase, in the step and in the accepted count on Project 360 Fixed in round 68. | Development team | PRJ-FR-014 |
| OI-PRJ-16 | Record the latest GFMIS time in the send log. The code records today Fixed in round 68. | Development team | PRJ-DR-004, BR-PRJ-17 |
| OI-PRJ-17 | Remove fixed years and dates, and sample log rows, from `95-projects.js`. The file fixes three fiscal years, the year-end date, a task due date and the opening send log Fixed in round 68. | Development team | PRJ-CR-004, PRJ-CR-005 |
| OI-PRJ-18 | The asker in the log is the first user of the asking role, and a cancelled line or a rejected request still shows as a live project Round 68 marks ended projects, leaves them out of the totals, and logs the asking role. A named asker needs PRJ-FR-053. | Development team | PRJ-FR-008, PRJ-FR-053 |
| OI-REV-01 | Three engines differ: a blocked step stops a Budget or Finance run and not a Procurement run, only Procurement has levels and a tool check, and only Budget and Finance take a reason to stop. Which behaviour does the one framework keep? | Technical lead, product owner | REV-FR-036 to REV-FR-045, state rules |
| OI-REV-03 | The seed has every agent on, `agentOn` treats an unknown agent as on, and the general assistant has no switch at all, which differs from ADR-0016 and XC-AI-002. The seed and default must change | Development team | REV-FR-034, REV-FR-049 |
| OI-REV-10 | The design names a vector store for rules and documents, and no ADR covers one | Technical lead | REV-FR-032 |

## Design versus code {#app-diff}

Each module chapter ends its open issues with a table of places where the design documents and the code differ. In each table the code says what exists and the design says what is intended. This summary points to those tables and to the SDS section that says how production closes each gap.

| Module | Differences | Topics | Table | In the SDS |
| --- | --- | --- | --- | --- |
| Cross-cutting | 8 | AI default, Audit log, Sign-in, Third-party requests, Official documents, Footer, Money, Business data | [Cross-cutting](#xc-open) | - |
| Platform | 14 | MFA, Role matrix, Unit scope, Session on rights change, Delegation notice, Delegated tasks, Duty rule switch-off, Templates, SLA check, Audit content, Audit export, Restore test, Exception source, Administrator and data | [Platform](#plt-open) | [Migration](Fisko-SDS.html#plt-migration) |
| Budget | 16 | Structure levels, Request form, Round amounts, Request states after approval, Cut elasticity, Cross-agency transfer, Available balance, T1 approver, Allotment states, Spending plan states, Carry-over to the next year, Quarterly report rounds, Forecast FC-B1, Agents AG-01, AG-06, Withdrawn appeal, Exports | [Budget](#bgt-open) | [Migration](Fisko-SDS.html#bgt-migration) |
| Procurement | 14 | Split purchase group, Method record, Consulting and design, Committee quorum and resolutions, Guarantee at signing, Penalty warning, Termination effect, Forward period, Drawing reply overdue, Supervisor, Committee fees, Profile switches, Numbers in code, Forms catalogue | [Procurement](#prc-open) | [Migration](Fisko-SDS.html#prc-migration) |
| Finance | 10 | Page count, Voucher start, Penalty on a contract voucher, SD-14, SD-05, Key handover, Clock reminders, Trial balance, Period states, Carry-over limit in time | [Finance](#fin-open) | [Migration](Fisko-SDS.html#fin-migration) |
| Projects | 9 | The 8 steps, One id, When data is sent, Alert on send, After an outage, Received progress, Own data per unit, External approval, Neutral defaults | [Projects](#prj-open) | [Migration](Fisko-SDS.html#prj-migration) |
| Review and analytics | 9 | AI default, Tools, Who decides a level, Data rights, Anomaly source, Number source, Model use, Family agents, Executive dashboard time | [Review and analytics](#rev-open) | [Migration](Fisko-SDS.html#rev-migration) |
| **Total** | **80** |  |  |  |

## Defects found in the prototype {#app-defects}

> [!NOTE] Round 67 fixed OI-PRC-04, OI-BGT-05, OI-FIN-09 and OI-FIN-10 in full, and part of OI-PRC-05, OI-BGT-06, OI-PLT-04 and OI-FIN-11. It also made the duty check cover every delegator and limited the assistant by unit. Round 68 fixed OI-BGT-07, OI-FIN-22 and OI-PRJ-12 to OI-PRJ-17 in full, and part of OI-FIN-19, OI-FIN-21 and OI-PRJ-18. Rows below stay for the record; the open issues hold the current state.

Chapter authors found these while reading the code. Each is an open issue with a fix to make. None was reproduced by running the prototype, and a developer should confirm each one when fixing it. The production design already closes most of them, as each SDS module chapter shows, so the fix in the prototype matters only while the prototype is used for demonstration.

| Issue | Defect or fix | Needed from | Affects |
| --- | --- | --- | --- |
| OI-PLT-04 | SD-03 and SD-09 have checks since round 67. SD-10 still has no switch or log, and SD-07 and one SD-06 path still do not log blocks. Wire each one or remove it | Development team, FIN and BGT owners | PLT-FR-046 |
| OI-PLT-09 | Undo removes the audit entry of the undone action. Replace it with compensating actions | Development team | BR-PLT-19, PLT-FR-143 |
| OI-BGT-05 | A transfer at `bb` holds no money. Fix it and add a check Fixed in round 67, with a sweep check. | Development team | BGT-FR-117, BGT-FR-114 |
| OI-BGT-06 | SD-09 has a check since round 67, so one person cannot request and approve the same transfer. SD-10 still has no switch or log (OI-PLT-04) | Development team, BGT owner | BGT-FR-124, BGT-FR-070 |
| OI-BGT-07 | `nextReqId` takes the highest live number plus one, so deleting the newest draft reuses its number. A transfer from AG-15 numbers from the list length while the screen uses a counter, so the two can clash. Use one counter Fixed in round 68. | Development team | BGT-FR-034, BGT-DR-005 |
| OI-BGT-08 | A draft line offers activities from the year being formulated even for the year being spent, so its programme and output may come from another year's structure | Development team | BGT-FR-098 |
| OI-BGT-09 | The carry-over page fixes the text of the deadline date, and investment quarterly targets stay in code | Development team | BGT-CR-002, BGT-FR-134 |
| OI-PRC-04 | Fix the settings form so that it can save, and add a sweep check Fixed in round 67, with a sweep check. | Development team | PRC-FR-042 |
| OI-PRC-05 | The contract drawer now checks SD-06 as the older control does (round 67). It shows the block as a form error and logs no blocked attempt, and two paths remain where one should | Development team | PRC-FR-086 |
| OI-FIN-05 | The voucher fixes VAT at 7 percent, while the procurement profile holds `vatPct`. One dated rule must serve both | Development team, finance specialist | BR-FIN-07 |
| OI-FIN-09 | A released phase never passes the evidence check, because `vEvidence` copies the failed gate check Fixed in round 67, with a sweep check. | Development team | FIN-FR-021 |
| OI-FIN-10 | A rejected contract voucher blocks its phase, because `famAcceptedUnpaid` and `phPayStarted` count any voucher not cancelled Fixed in round 67, with a sweep check. | Development team | FIN-FR-034 |
| OI-FIN-11 | SD-03 is checked at voucher approval since round 67. With SD-11 on it never fires first, so it may still be merged | Finance owner, Platform owner | OI-PLT-04 |
| OI-FIN-17 | Closed-period protection covers payment matching and reconciliation reopening only | Development team | FIN-FR-124 |
| OI-FIN-18 | Only contract payments can reach V7; `v.recon` is never set, so KPI-F06 leaves out other vouchers | Development team | FIN-FR-114 |
| OI-FIN-19 | The advance approval does not read the authority table, and the clause 60 check always passes Round 68 makes the approval read the table and record the level. The clause 60 check still always passes. | Development team | FIN-FR-068 |
| OI-FIN-20 | The non-budget book lines leave out advances and cash movements, so that account cannot reconcile | Development team | FIN-FR-106 |
| OI-FIN-21 | The settings form accepts any number, including level A values, and has no range check Round 68 refuses negative and non-numeric values. Level A values can still be changed. | Development team, product owner | FIN-FR-002 |
| OI-FIN-22 | The GFMIS assignment check is missing on recording receipts and results Fixed in round 68. | Development team | FIN-FR-119 |
| OI-PRJ-12 | Fix the id of a line created in the allocation form: the code reads a number from the id, gets none, and gives such lines the same broken project id Fixed in round 68. | Development team | PRJ-FR-001 |
| OI-PRJ-13 | Stop counting draft contracts as committed, and released amounts as still committed. Today a project can differ from the line ledger and can reach step 5 on a draft Fixed in round 68. | Development team | PRJ-FR-019 |
| OI-PRJ-14 | Make the send comparison independent of the language. Target and area are compared as display text, so switching language marks projects with those fields as changed Fixed in round 68. | Development team | PRJ-DR-005 |
| OI-PRJ-15 | Count a phase as accepted only on acceptance. The code also counts a delivered phase, in the step and in the accepted count on Project 360 Fixed in round 68. | Development team | PRJ-FR-014 |
| OI-PRJ-16 | Record the latest GFMIS time in the send log. The code records today Fixed in round 68. | Development team | PRJ-DR-004, BR-PRJ-17 |
| OI-PRJ-17 | Remove fixed years and dates, and sample log rows, from `95-projects.js`. The file fixes three fiscal years, the year-end date, a task due date and the opening send log Fixed in round 68. | Development team | PRJ-CR-004, PRJ-CR-005 |
| OI-PRJ-18 | The asker in the log is the first user of the asking role, and a cancelled line or a rejected request still shows as a live project Round 68 marks ended projects, leaves them out of the totals, and logs the asking role. A named asker needs PRJ-FR-053. | Development team | PRJ-FR-008, PRJ-FR-053 |
| OI-REV-03 | The seed has every agent on, `agentOn` treats an unknown agent as on, and the general assistant has no switch at all, which differs from ADR-0016 and XC-AI-002. The seed and default must change | Development team | REV-FR-034, REV-FR-049 |

Two faults in the cross-cutting design table carry a requirement row and no issue id. `src/head.html` loads fonts from Google Fonts while the cookie policy says there is no cross-site tracking (XC-SEC-012, XC-PRV-018), and the footer says all rights reserved with no source link (XC-LIC-002).

## Clause coverage {#app-coverage}

The table is built from the clause register and the Clause column of each requirement. Covered means a row cites the clause. It does not mean a lawyer has confirmed the citation, and the notes of each register row say who must.

{{coverage}}
