# Module: Platform {#plt}

## Purpose and scope {#plt-purpose}

Platform holds what every Fisko product shares: tenancy and tenant settings, sign-in, the organisation and its users, roles, separation of duties, delegation, approval chains, notifications, My Work, the audit log, shared master data, policy pages, PDPA features, the system switcher, AI co-work and administration. Budget, Procurement, Finance, Projects and Review use these features and do not build their own.

No production code exists yet, so this chapter was read from the prototype code and its sweep tests. In the prototype one page plays the server, so identity, tenancy and every permission are simulated in the browser. Where the design documents or the ADRs ask for more than the code does, the row is Partial or Planned and the difference is listed under the open issues.

| Component | State in the prototype | Evidence |
| --- | --- | --- |
| Duty rule engine and blocked-attempt log | Built; SD-03 is listed and has no check | Sweep FC1, FC2, FC4 and FC5 walks |
| Idle sign-out, footer and policy pages, review step, opening a fiscal year | Built, with specific checks | Sweep shell section, rounds 65 and 66, E2E walk |
| Users, units, master data, approval route, delegation, audit page | Built, with no action walk | Page-open sweep only |
| System rail, launcher, My Workspace, approvals inbox, exception centre | Built, with no action walk | Sweep shell section checks text only |
| AI co-work | Rules and sample data; no model is called | Sweep chat suite checks text only |
| Sign-in, MFA, e-mail, LINE, audit export, backup | Simulated; nothing leaves the prototype | `54-identity.js`, `50-admin.js`, `50b-admin-depth.js` |
| Tenant onboarding, cells, data subject requests, breach workflow, ROPA, data dictionary | Not built | ADR-0005, ADR-0014 |

Outside this chapter: security, performance, availability, accessibility and language rules that apply to the whole product (cross-cutting chapter), the budget structure, master plans, the budget committee and the BR rules (BGT), the supplier register, method rules and procurement profile (PRC), finance rules and bank accounts (FIN), the project registry (PRJ). The Administration area shows some of those pages. Their requirements stay with their owners.

## Actors {#plt-actors}

The code defines 12 roles. A user holds one role and one unit. Each role id below is the value in the code.

| Role id | Name | Use of Platform | Defined in |
| --- | --- | --- | --- |
| `div` | Division (requester) | My Work, notifications; data limited to its own unit in several lists | `00-core.js` |
| `divhead` | Division director | Owner of an approval step | `41d-req-b1.js` |
| `plan` | Planning Division | Delegates review; keeps budget master data; receives delegations | `00-core.js` |
| `exec` | Executive | Delegates transfer, committee and spend approvals; receives delegations | `00-core.js` |
| `fin` | Finance and Accounting | Delegates transfer approvals; sees interface status; keeps standard prices; receives delegations | `00-core.js` |
| `finhead` | Head of finance | Sees finance rules in Administration | `66b-fin-fn1.js` |
| `proc` | Procurement officer | Sees procurement rules and profile in Administration | `00-core.js` |
| `prochead` | Head of procurement | Same as `proc` | `00-core.js` |
| `committee` | Budget committee member | My Work and voting pages | `42d-review-b3.js` |
| `audit` | Auditor | Reads the audit log, duty rules, blocked attempts, retention and backup status; receives duty-rule alerts | `00-core.js` |
| `admin` | System Administrator | Maintains units, users, master data, routes, duty rules, templates and retention. Holds no business approval | `00-core.js` |
| `vendor` | Supplier (external) | Supplier portal only; left out of the Workspace and the system rail | `71-t2.js` |

| Actor | Role in Platform |
| --- | --- |
| Delegator | A user who hands part of their approval authority to another user for a period. They keep the authority themselves |
| Delegate | A user who acts on behalf of a delegator, within the scope and dates |
| Data protection officer | Receives data subject requests and handles breaches. No role in the prototype; a contact in tenant data |
| Data subject | Staff, suppliers or citizens whose data Fisko holds |
| Operator | Runs the hosted service and acts as processor (ADR-0014). No role in the prototype |
| System jobs | Reminders, escalation, retention, delegation expiry |
| AI assistants | Fisko Assistant and the agents of the modules, shown through co-work |
| External systems | Organisation identity provider, ThaID, SMTP, LINE, SIEM |

## Use cases {#plt-usecases}

The table replaces a use case diagram. Each use case names the actor who starts it, what starts it and what is true afterwards.

| ID | Name | Actor | Trigger | Outcome |
| --- | --- | --- | --- | --- |
| UC-PLT-01 | Sign in | Any user | A user opens Fisko | A session exists for one tenant, one user and one role |
| UC-PLT-02 | Sign out or time out | User, system | The user leaves, or no activity for the set time | The session has ended and the event is logged |
| UC-PLT-03 | Start a tenant | Operator | An agency joins | The tenant runs on a cell with starter settings |
| UC-PLT-04 | Maintain units | Administrator | The organisation changes | The unit tree is current; used units are retired |
| UC-PLT-05 | Maintain users | Administrator | A person joins, moves or leaves | The user has the right role and unit, or is suspended |
| UC-PLT-06 | Switch a duty rule | Administrator | Internal control policy changes | The rule state changes; the auditor is told of a switch-off |
| UC-PLT-07 | Delegate authority | Delegator | The delegator will be away | The delegation is scheduled or active |
| UC-PLT-08 | Act on behalf | Delegate | Work in scope is waiting | The decision records the delegate, the delegator and the delegation |
| UC-PLT-09 | Revoke a delegation | Delegator, administrator | The need has ended | The delegation stops at once |
| UC-PLT-10 | Change the approval route | Administrator | Who approves has changed | New requests follow the new route |
| UC-PLT-11 | Set templates and SLAs | Administrator | Wording or timing must change | Templates, channels, reminders and escalation are saved |
| UC-PLT-12 | Remind and escalate | System, administrator | A step nears or passes its due date | The owner is reminded, and the escalation role is told when overdue |
| UC-PLT-13 | Work through My Work | Any user | The user signs in | The user opens each item on its own page and decides there |
| UC-PLT-14 | Review exceptions | Any user | Something is late or failing | The item is opened on the page where it is fixed |
| UC-PLT-15 | Read the audit log | Auditor, administrator | A check is needed | Entries are found by role or text and can be exported |
| UC-PLT-16 | Read a record's history | Any user with the record | A question about a record | One timeline of audit, AI, versions and comments |
| UC-PLT-17 | Maintain shared master data | Administrator, finance officer | Values change | Current values are available to all modules |
| UC-PLT-18 | Open the next fiscal year | Administrator | Preparation for a new year starts | The year exists in setup with a copy of the structure |
| UC-PLT-19 | Set retention | Administrator | Records rules change | Each data class has a period and a basis |
| UC-PLT-20 | Answer a data subject request | Data protection officer | A person asks | The request is answered by its due date with evidence |
| UC-PLT-21 | Handle a breach | Data protection officer | A breach is suspected | The clock runs, the PDPC and affected people are told as needed |
| UC-PLT-22 | Switch system | Any user | Work moves to another product | The system's own menu shows |
| UC-PLT-23 | Ask the AI assistant | Any user | The user needs facts or a draft | An answer with its steps; any write is a button the person presses |

## Business rules {#plt-rules}

Business rules are conditions that several requirements share. The Source column gives the ADR, the clause or the design rule. The last column says where a rule can be configured and the range the code accepts. A setting marked stored has a value in the data with no screen in the prototype, and a range for it is a proposal for the product owner to confirm.

| ID | Rule | Source | Setting and allowed range |
| --- | --- | --- | --- |
| BR-PLT-01 | Every action belongs to exactly one tenant, and no read or write crosses tenants | ADR-0005 | Fixed in code |
| BR-PLT-02 | A user holds one role and one unit | `83-admin-crud.js` | Fixed in code; see OI-PLT-05 |
| BR-PLT-03 | A session starts only for an active account that has passed MFA. An account with no MFA sets it up first | FR-PL-01 | Per user: MFA flag, set by the administrator |
| BR-PLT-04 | Suspending a user stops sign-in and keeps everything the user did | FR-PL-01 | Reason of at least 10 characters |
| BR-PLT-05 | A session ends after the set idle time, with a warning before it ends | ADR-0006; design 10.1 | Tenant, stored: `idleMin` default 30, `warnMin` default 5 minutes. XC-SEC-008 proposes 5 to 60 for `idleMin`. 0 switches the timeout off in the code |
| BR-PLT-06 | A page opens only for roles listed for it. Administration tabs carry their own role lists | `00-core.js` allowed | Fixed in code |
| BR-PLT-07 | The administrator has no business approval and cannot own an approval step | Design 10.1 | Fixed in code |
| BR-PLT-08 | A duty rule checks the person acting and the person whose authority they hold, and refuses when either is in the compared group | `64-duties.js` | Rules in the register below |
| BR-PLT-09 | The administrator switches each duty rule on or off, the auditor only reads, and switching a rule off notifies the auditor | Round 11; D-F04 | Tenant: on or off, default on. Which rules may never be off is OI-PLT-03 |
| BR-PLT-10 | A delegation has one delegator, one delegate, a scope, a start date, an end date and a reason. The end cannot be before the start | FR-PL-04 | Dates per delegation; no maximum length in the code |
| BR-PLT-11 | The scopes and the roles that may delegate them are `transfer` (`exec`, `fin`), `review` (`plan`), `committee` (`exec`) and `spend` (`exec`) | `54-identity.js` SCOPES; D-09 | Fixed in code; the list of what may be delegated is for the legal unit, OI-PLT-02 |
| BR-PLT-12 | A delegate must be another active user whose role is `plan`, `exec` or `fin` | `54-identity.js` | Fixed in code |
| BR-PLT-13 | Authority comes only from a role held directly, so a delegate cannot pass it on | `54-identity.js` delegFor; design 10.1 | Fixed in code |
| BR-PLT-14 | The delegator keeps the authority while a delegation runs, so both may act | `54-identity.js` acting | Fixed in code |
| BR-PLT-15 | An approval route is an ordered list of steps, each with an owner role, an SLA in days and a condition: every request, or at or above an amount | ADR-0007; FR-M10-04 | Tenant: SLA 0 or more on the route form, 1 to 60 on the SLA form; amount 0 or more |
| BR-PLT-16 | A route keeps at least one step, and the committee step cannot be deleted or have its condition changed | `83-admin-crud.js` WF_LOCKED | Fixed in code |
| BR-PLT-17 | A step is due its SLA in calendar days after the request last changed. A reminder goes out the set days before, and an escalation the set days after | `50b-admin-depth.js` slaItems | Tenant: `remind` and `after` 0 to 30, default 1 each; `to` any role except `admin`, default `exec` |
| BR-PLT-18 | A required reason has at least 10 characters unless the action sets its own minimum | `76-crud.js` CR_WHY_MIN; FC-P4 | Fixed in code |
| BR-PLT-19 | An audit entry is never edited or deleted | ADR-0015 | Fixed in code |
| BR-PLT-20 | Master data in use is retired and keeps showing under its old name. Master data never used may be deleted | `81-master-crud.js` retireAct | Reason of at least 10 characters to retire |
| BR-PLT-21 | A fiscal year runs from 1 October to 30 September and is in setup, request preparation, execution or closed. A closed year takes no new or changed allocation lines or structure | R-C-04 | Dates fixed in code; status by the administrator |
| BR-PLT-22 | Every working-day count uses one calendar: weekends and the tenant holiday list | PRC-NFR-003 | Tenant: holiday list |
| BR-PLT-23 | Each data class has a retention period and a basis. The owner is told 30 days before deletion | ADR-0014; FR-M10-08 | Tenant: 1 to 30 years; defaults in the PDPA section |
| BR-PLT-24 | The agency is the data controller and the hosted operator is the processor. Personal data needs a recorded legal basis, and consent is asked only where consent is the right basis | ADR-0014; PDPA 24 | Per data type |
| BR-PLT-25 | AI prepares and drafts, and a person decides. AI never approves, changes amounts, signs, pays or picks a supplier, and anything that writes data is a button the person presses | ADR-0016; D-P09 | Fixed in code |
| BR-PLT-26 | The system never decides for a person: a task or an exception only opens the record where a person acts | `91-workbench.js` | Fixed in code |

> [!OPEN] The stored settings `idleMin` and `warnMin` have no screen and no enforced range, and the code lets 0 switch the timeout off, which ADR-0006 does not allow for. XC-SEC-008 proposes a range for `idleMin` only. The product owner and the security reviewer must confirm it and set one for `warnMin` (OI-PLT-06).

### Duty rule register {#plt-rules-sod}

This is every duty rule that exists in the code, by its code id. Fifteen rules are listed in the shared engine in `64-duties.js`. SD-10 sits in the budget meeting page, and SD-09 exists only in a design document. The defaults are a proposal (decision D-F04) and an agency adjusts them to its internal control policy.

| Rule | First step | Next step, by another person | Enforced in the code | Delegator checked | Owner |
| --- | --- | --- | --- | --- | --- |
| SD-01 | Raise a requisition | Approve the requisition | `60-procurement.js`, `84-proc-crud.js` sodCheck | Yes | PRC |
| SD-02 | Run the procurement and create the contract | Accept the work | `60-procurement.js`, `63-contracts.js` sodCheck | No | PRC |
| SD-03 | Request the payment | Approve the payment | None. The rule is listed and has a switch, and no code calls it | No | FIN |
| SD-04 | Accept the work | Approve the payment | `66c-fin-fn2.js` sodCheck | Yes | FIN |
| SD-05 | Approve the payment | Reconcile with GFMIS | `62-finance.js` sodCheck | No, it compares the approver and the holder of the authority | FIN |
| SD-06 | Sit on the evaluation or purchasing committee | Accept the work | `60-procurement.js` sodCheck; `86-con-crud.js` form check that logs nothing | No | PRC |
| SD-07 | Declare a conflict with a bidder | Evaluate that case | `61b-sourcing.js` coiOk reads the switch; no blocked-attempt log | No | PRC |
| SD-08 | Propose a contract change | Approve the change | `63-contracts.js`, `63b-contract-late.js`, `87-proc-e2e.js` sodCheck | Yes, for an executive decision | PRC |
| SD-09 | Prepare a transfer request | Approve it | None. Budget design only | No | BGT |
| SD-10 | Belong to the requesting unit | Vote on that request | `42d-review-b3.js` marks the member as abstaining. No switch and no log | No | BGT |
| SD-11 | Prepare or check a voucher | Approve the payment | `66c-fin-fn2.js`, `88-fin-nb-crud.js` sodCheck | Yes | FIN |
| SD-12 | Borrow an advance | Approve the advance or check its clearing | `66d-fin-fn3.js` sodCheck | Yes, at approval | FIN |
| SD-13 | Receive or pay money that day | Count the cash as a committee member | `66e-fin-fn4.js` sodCheck | No | FIN |
| SD-14 | Ask to change a supplier's bank account | Confirm or refuse the change | `84-fin-crud.js` sodCheck | No | FIN |
| SD-15 | Record money in or out in a month | Prepare that month's bank reconciliation | `66f-fin-fn5.js` sodCheck | No | FIN |
| SD-16 | Close a period, day or reconciliation | Reopen it | `66f-fin-fn5.js` sodCheck | No | FIN |
| P-F05 | Prepare a voucher | Check its evidence | `66c-fin-fn2.js` sodCheck | No | FIN |

> [!WARN] SD-03 shows as a working rule on the duty page, yet nothing checks it. A voucher's maker is refused by SD-11, so the rule may be redundant. The FIN owner must either wire the rule or remove it (OI-PLT-04).

## Functional requirements {#plt-fr}

Each status rests on reading the code and the sweep, as explained in the status summary. The file and function in the Prototype column show where the behaviour is, and a named sweep check means that check asserts the behaviour.

### Tenancy and tenant settings {#plt-fr-tenant}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-001 | The system shall keep the data of each tenant apart, so that switching tenant shows only that tenant's records. | - | M | T | Partial | 00-core.js SEEDS, key, load |
| PLT-FR-002 | The system shall take the tenant from the signed-in session and never from a path or a form field. | - | M | T | Planned | - |
| PLT-FR-003 | The system shall hold for each tenant its name, address, telephone, e-mail, website, data protection contact and office hours, and shall show them in the footer and the policy pages. | - | M | T | Partial | 95b-site.js SITE_CFG, siteCfg |
| PLT-FR-004 | The system shall let the tenant administrator change the settings in PLT-FR-003 and the session times on a screen, within their allowed ranges, and shall log each change. | - | S | T | Planned | - |
| PLT-FR-005 | The system shall bring a new tenant into service on a cell with starter settings, roles and data, with no code change. | - | M | T | Planned | - |
| PLT-FR-006 | The system shall map each tenant to its cell through one routing service. | - | M | T | Planned | - |
| PLT-FR-007 | The system shall export and restore the data of one tenant with no effect on other tenants. | - | M | T | Planned | - |
| PLT-FR-008 | The system shall move a tenant from one cell to another as a supported operation. | - | S | T | Planned | - |

### Identity and sign-in {#plt-fr-identity}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-009 | The system shall take users from the organisation's identity provider through Keycloak (XC-SEC-005), and shall show the organisation and the provider before sign-in. Sign-in is simulated in the prototype. | - | M | T | Partial | 54-identity.js showSignIn |
| PLT-FR-010 | The system shall ask for the second factor of XC-SEC-006 as a 6-digit code and shall refuse a wrong code with a message, letting the user try again. The code is a fixed demo value in the prototype. | - | M | T | Partial | 54-identity.js otp-form |
| PLT-FR-011 | The system shall make a user with no MFA set it up before the first session and shall record the setup. | - | M | T | Partial | 54-identity.js SIGN.step setup |
| PLT-FR-012 | The system shall refuse sign-in for a suspended account and shall tell the user to contact the administrator. | - | M | T | Partial | 54-identity.js data-acc |
| PLT-FR-013 | The system shall write an audit entry for each sign-in and each sign-out. | - | M | T | Partial | 54-identity.js startSession, signOut |
| PLT-FR-014 | The system shall show the signed-in user, role, unit, MFA state and every delegation in force on the user menu, with sign-out and a link to delegation. | - | S | D | Partial | 54-identity.js toggleUserMenu |
| PLT-FR-015 | The system shall count any key, click, wheel or touch as activity for the idle time of XC-SEC-007, on every page, except in presenter mode. | - | M | T | Prototyped | 95b-site.js siteIdleTick; sweep round 66 |
| PLT-FR-016 | The warning of XC-SEC-009 shall take focus, and any activity shall clear it. | - | M | T | Partial | 95b-site.js siteIdleTick, idle-stay |
| PLT-FR-017 | The idle limit shall hold when the browser tab is closed or inactive, so that a tab does not keep a session alive. | - | M | T | Planned | - |
| PLT-FR-018 | The system shall end a user's sessions when the user's role changes or the user is suspended. | - | M | T | Planned | - |
| PLT-FR-019 | The system shall alert the administrator and the auditor when XC-SEC-011 blocks an account. | - | S | T | Planned | - |
| PLT-FR-020 | The system shall list privileged accounts for review each quarter and shall record who reviewed them. | - | S | I | Planned | - |
| PLT-FR-021 | The system shall federate sign-in with ThaID once the onboarding terms for a SaaS product are confirmed. | - | C | T | Planned | - |

### Organisation and users {#plt-fr-org}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-022 | The system shall let the administrator add and edit units with a code, Thai and English names and a parent, and shall refuse a repeated code. | - | M | T | Partial | 81-master-crud.js adUnit |
| PLT-FR-023 | The system shall treat a unit as in use when it is the root, has users or has requests or allocation lines, and shall apply BR-PLT-20. | - | M | T | Partial | 81-master-crud.js adUnit acts |
| PLT-FR-024 | The system shall let the administrator add a user with Thai and English names, role, unit and MFA flag, and shall offer only units in use. | - | M | T | Partial | 83-admin-crud.js adUser create |
| PLT-FR-025 | The system shall let the administrator edit a user, and shall record an old and a new role in the audit log. | - | M | T | Partial | 83-admin-crud.js adUser edit |
| PLT-FR-026 | The system shall let the administrator suspend a user under BR-PLT-04 and reactivate the user later. | - | M | T | Partial | 83-admin-crud.js adUser acts |
| PLT-FR-027 | The system shall never delete a user who has acted in the system. | - | M | I | Partial | 83-admin-crud.js has no delete action |
| PLT-FR-028 | The system shall show on a user's record the role, unit, MFA state, delegations and the time and reason of a suspension. | - | S | D | Partial | 83-admin-crud.js adUser view |
| PLT-FR-029 | The system shall limit a requester's records to its own unit and the units under it. The code uses the own unit only, in some lists. | - | M | T | Partial | 56-search.js searchItems; 30-home.js myTasks |
| PLT-FR-030 | The system shall take personal identity from Keycloak and shall hold roles, units and duties in Fisko. | - | M | I | Planned | - |

### Roles and permissions {#plt-fr-roles}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-031 | The system shall hold the 12 roles in the actor table. | - | M | I | Partial | 00-core.js ROLES; 41d-req-b1.js; 42d-review-b3.js; 66b-fin-fn1.js; 71-t2.js |
| PLT-FR-032 | The system shall show each role only the pages it may open, and shall answer any other page with a no-access message that names the role. | - | M | T | Partial | 00-core.js allowed, route; sweep render by role |
| PLT-FR-033 | The system shall show the role and module permissions as a matrix of create, use, read and approve. | - | S | D | Partial | 50-admin.js MATRIX |
| PLT-FR-034 | The system shall derive the matrix in PLT-FR-033 from the permissions in force. | - | S | T | Planned | - |
| PLT-FR-035 | The system shall keep the administrator out of budget, procurement and finance records (BR-PLT-07). | - | M | T | Partial | 20-shell.js NAV roles; 50-admin.js MATRIX |
| PLT-FR-036 | The system shall hold one authority check that every module calls, which carries out XC-SEC-003. | - | M | T | Planned | - |
| PLT-FR-037 | The system shall map roles to authorities as tenant data, starting from the defaults of each module. | - | S | T | Planned | - |

### Separation of duties {#plt-fr-sod}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-038 | The system shall hold a register of duty rules with id, first step, next step and text, in Thai and English. | - | M | I | Partial | 64-duties.js SOD_RULES, SOD_STEPS |
| PLT-FR-039 | The system shall refuse an action when a duty rule that is on finds a clash, and shall name the rule and the person. | - | M | T | Prototyped | 64-duties.js sodCheck; sweep FC2 walk |
| PLT-FR-040 | The system shall log each blocked attempt with time, person, role, rule, item and the person it clashed with, and shall also write an audit entry. | - | M | T | Prototyped | 64-duties.js sodCheck; sweep FC1 walk |
| PLT-FR-041 | The system shall apply BR-PLT-08 and shall mark a block as caused by the delegator when the clash is with that person. | - | M | T | Partial | 64-duties.js sodActors, sodCheck |
| PLT-FR-042 | The system shall check every person whose authority the user holds for the scope, when the user holds it from more than one person. | - | M | T | Planned | - |
| PLT-FR-043 | The system shall apply BR-PLT-09 on a page that shows the administrator switches and shows the auditor the same page as read only. | - | M | T | Partial | 64-duties.js ADMIN.duties, BIND_ADMIN.duties |
| PLT-FR-044 | The system shall require a reason of at least 10 characters to switch a duty rule off. | - | M | T | Planned | - |
| PLT-FR-045 | The system shall show blocked attempts to the administrator and the auditor. The prototype keeps the latest 100, and production shall keep them all. | - | M | T | Partial | 64-duties.js ADMIN.duties |
| PLT-FR-046 | Every rule in the register shall have at least one enforced check, and every enforced check shall log its blocks through the engine. | - | M | T | Partial | SD-03, SD-07 and the second SD-06 path do not comply |

### Delegation and acting {#plt-fr-deleg}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-047 | The system shall let a delegator create a delegation with delegate, scope, start, end and reason, one scope per form, and shall number it per fiscal year. | - | M | T | Partial | 54-identity.js dg-form |
| PLT-FR-048 | The system shall refuse an end date before the start date. | - | M | T | Partial | 54-identity.js BIND.delegation |
| PLT-FR-049 | The system shall offer only the scopes of BR-PLT-11 for the user's role, and only the delegates of BR-PLT-12. | - | M | T | Partial | 54-identity.js SCOPES, VIEWS.delegation |
| PLT-FR-050 | The system shall derive a delegation's state from its dates and revocation, and shall let the delegate act only while it is active, in its scope. | - | M | T | Partial | 54-identity.js delegState, delegFor, acting |
| PLT-FR-051 | The system shall show "on behalf of" with the delegator and the delegation number on each action made through a delegation, and in the audit log. | - | M | T | Partial | 54-identity.js onBehalf |
| PLT-FR-052 | The system shall store on a spend decision both the person who acted and the holder of the authority, with the delegation number. | - | M | T | Partial | 60-procurement.js famAuth |
| PLT-FR-053 | The system shall notify the delegate when a delegation is made. The prototype tells every user of the delegate's role. | - | M | T | Partial | 54-identity.js BIND.delegation notify |
| PLT-FR-054 | The system shall notify the delegator of each action taken on their behalf. | - | S | T | Planned | - |
| PLT-FR-055 | The system shall let the delegator or the administrator revoke a scheduled or active delegation, and it shall stop at once. | - | M | T | Partial | 54-identity.js data-revoke |
| PLT-FR-056 | The system shall require a reason to revoke a delegation and shall notify the delegate. | - | S | T | Planned | - |
| PLT-FR-057 | The system shall show a user the delegations they gave or received, and show the administrator all of them. | - | M | D | Partial | 54-identity.js VIEWS.delegation |
| PLT-FR-058 | The system shall add work in a delegated scope to the delegate's My Work for every scope. The code does so for spend and for cross-unit transfers. | - | M | T | Partial | 30-home.js myTasks; 63-contracts.js famTasks |
| PLT-FR-059 | The system shall apply BR-PLT-13 and shall refuse any attempt to delegate authority that is itself delegated. | - | M | T | Partial | 54-identity.js delegFor, myScopes |
| PLT-FR-060 | The system shall stop a delegation from taking effect when the delegator or the delegate is suspended or changes role. The code stops it for a role change of the delegator only. | - | M | T | Partial | 54-identity.js delegFor |
| PLT-FR-061 | The system shall warn the delegator at creation when a delegation overlaps another of theirs in the same scope, and shall apply the rule that OI-PLT-01 decides. | - | M | T | Planned | - |

> [!OPEN] Two overlapping delegations from one person are allowed, and this is unresolved. The code has no overlap check: the form validates only the date order, and the seeded data itself holds one person delegating the same scope to two people for the same dates. Both delegates can then act at once, and the delegator can too (BR-PLT-14). When one delegate holds the same authority twice, `delegFor` returns the first match, so the log can name a delegation other than the one the user meant, and revoking that one leaves the other in force. When a user holds a scope from two people, `sodActors` checks only the first, so a duty clash with the second is missed (PLT-FR-042). The product owner and the legal unit must decide whether an overlap is forbidden, allowed with a warning, or allowed only for different delegates (OI-PLT-01).

### Approval chains {#plt-fr-approval}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-062 | The system shall hold the budget request route as ordered steps under BR-PLT-15. | - | M | T | Partial | 83-admin-crud.js adWf |
| PLT-FR-063 | The system shall let the administrator add, edit and reorder steps, and delete a step with a reason, under BR-PLT-16. | - | M | T | Partial | 83-admin-crud.js adWf acts |
| PLT-FR-064 | The system shall work out a request's route from the step conditions and shall show it on the request. | - | M | T | Partial | 41-requests.js routeSteps |
| PLT-FR-065 | A change to a route shall apply to requests sent after it and shall leave requests on their way unchanged. | - | M | T | Partial | 83-admin-crud.js adWf impact text |
| PLT-FR-066 | The system shall hold approval chains for procurement and finance documents as tenant data on the same engine, with thresholds inside the legal limits. | - | S | T | Planned | - |
| PLT-FR-067 | The system shall let a decider return an item to any earlier step of its chain with a comment. | - | S | T | Planned | - |
| PLT-FR-068 | The system shall keep a decision record per step with decider, holder of the authority, time, result and reason. | - | M | T | Planned | - |

### Notifications {#plt-fr-notify}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-069 | The system shall hold in-app notices for roles with text in both languages, time and link, shall show the unread count on the bell, and shall open the link and mark the notice read on a click. | - | M | T | Partial | 00-core.js notify; 20-shell.js renderNotes |
| PLT-FR-070 | The system shall let a user mark all notices read. | - | S | D | Partial | 20-shell.js n-all |
| PLT-FR-071 | The system shall address a notice to a user, a role, or a role within a unit, and shall track read state per user. The prototype addresses roles and one reader marks it read for the whole role. | - | M | T | Planned | - |
| PLT-FR-072 | The system shall hold a template per event with subject and message in Thai and English, placeholders, channels in-app, e-mail and LINE, and a preview with sample values. | - | S | T | Partial | 50b-admin-depth.js ADMIN.notify |
| PLT-FR-073 | The system shall build every notice from its template. In the prototype templates are saved and never read when a notice is sent. | - | S | T | Planned | - |
| PLT-FR-074 | The system shall send e-mail through the tenant's SMTP service, with no restricted data in the message. | - | M | T | Planned | - |
| PLT-FR-075 | The system shall offer other channels such as SMS or LINE only when the tenant enables them and sends no personal data through them. | - | C | T | Planned | - |
| PLT-FR-076 | The system shall let the administrator set the SLA, remind and escalate values per step (BR-PLT-17), and shall log each change. | - | S | T | Partial | 50b-admin-depth.js data-wsla, data-esc |
| PLT-FR-077 | The system shall send a reminder to the step owner when a step is within the reminder days, and shall notify the owner and the escalation role when it is overdue by the set days. | - | S | T | Partial | 50b-admin-depth.js sla-run, slaItems |
| PLT-FR-078 | The system shall run the check in PLT-FR-077 every morning at 07:00 with no person. The prototype runs it from a button. | - | S | T | Planned | - |

### Tasks and My Work {#plt-fr-tasks}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-079 | The system shall collect each user's tasks from every module, each with title, detail, due date, link and severity. | - | M | T | Partial | 30-home.js myTasks; 66-apps.js famTasks |
| PLT-FR-080 | The system shall show the tasks on the Today page with an overdue count and a filter by system, and each row shall open its record. | - | M | D | Partial | 30b-home-v2.js VIEWS.home |
| PLT-FR-081 | The system shall show upcoming budget calendar dates on the Today page. | - | S | D | Partial | 30b-home-v2.js VIEWS.home |
| PLT-FR-082 | The system shall list tasks that wait for a decision in an approvals inbox across systems, oldest due date first, with a view of all tasks and a filter by system. The prototype picks them by matching words in the title; production shall use a task type. | - | M | T | Partial | 91-workbench.js inboxItems, VIEWS.inbox |
| PLT-FR-083 | The system shall list exceptions from nine sources in one centre: the user's overdue tasks, failed interfaces, units behind their spending plan, late contract phases, failed daily finance checks, carry-over near its end date, and projects held in the buffer, changed and not sent, or not current (PRJ-FR-057). | - | S | T | Partial | 91-workbench.js exceptionItems; 95-projects.js exceptionItems |
| PLT-FR-084 | Each exception shall show its severity, system, owner and date, and shall open the page where it is fixed if the role may open it. | - | S | D | Partial | 91-workbench.js wsRow, linkOk |
| PLT-FR-085 | The system shall show on the Today page a card per allowed system with what it needs from the user. | - | S | D | Partial | 91-workbench.js sysDeck |
| PLT-FR-086 | The system shall let a user pin up to 24 pages and shall list the latest 12 pages viewed, kept per browser in the prototype and per user in production. | - | C | T | Partial | 90-systems.js togglePagePin, noteRecent; 91-workbench.js VIEWS.pins |

### Audit log and record history {#plt-fr-audit}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-087 | The system shall give every module one call that writes the entry of XC-SEC-032, and shall also write one for each sign-in, role change and settings change. | - | M | T | Partial | 00-core.js audit |
| PLT-FR-088 | The system shall keep the entry's before and after values for changes to amounts, settings and roles. | - | S | T | Partial | Text in the target of some entries |
| PLT-FR-089 | The system shall let the administrator and the auditor search the log by role and text. | - | M | T | Partial | 50-admin.js auditRows |
| PLT-FR-090 | The system shall export the log as CSV for auditors and shall log each export. The prototype simulates the export. | - | M | T | Planned | 50-admin.js aq-exp |
| PLT-FR-091 | The audit page shall reach every entry kept under XC-SEC-042. The prototype's limit of 300 entries does not apply to production. | - | M | I | Planned | - |
| PLT-FR-092 | The system shall show the auditor the result and time of the last chain check of XC-SEC-036. | - | M | T | Planned | - |
| PLT-FR-093 | The audit page and record history shall show names as XC-SEC-040 states. | - | M | T | Planned | - |
| PLT-FR-094 | The audit page shall let the auditor filter the reads of Restricted data logged under XC-SEC-041. | - | M | T | Planned | - |
| PLT-FR-095 | The system shall forward audit entries to the tenant's SIEM. | - | C | T | Planned | - |
| PLT-FR-096 | The system shall show a record's history as one timeline of audit entries, AI actions, versions and comments, newest first, matched on the whole record id. | - | M | T | Partial | 58-history.js historyItems, openHistory |

> [!WARN] Undo in the shared record drawer restores a snapshot of all data, and the snapshot predates the action, so the action's audit entry disappears and only an "Undid a change" entry remains. This breaks BR-PLT-19. Production must undo through a new compensating action that adds entries (OI-PLT-09).

### Shared master data {#plt-fr-master}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-097 | The system shall list fiscal years with period and status (BR-PLT-21), and shall let the administrator open the next year, which copies the latest budget structure and starts in setup. | - | M | T | Prototyped | 81-master-crud.js adFy; sweep E2E walk E-01 |
| PLT-FR-098 | The system shall let the administrator change a year's status with a reason of at least 10 characters. | - | M | T | Partial | 81-master-crud.js adFy edit |
| PLT-FR-099 | The system shall refuse new or changed allocation lines and structure nodes in a closed year. | - | M | T | Partial | 81-master-crud.js fyOpen |
| PLT-FR-100 | The system shall hold budget calendar milestones with date and owner role, shall let the administrator add, edit and delete added milestones, and shall allow only a date change on the built-in ones. | - | M | T | Partial | 81-master-crud.js adCal |
| PLT-FR-101 | The system shall hold the holiday list of BR-PLT-22 and shall give every module one working-day count. The prototype keeps the list in Procurement settings. | - | M | T | Partial | 61-cases.js addWorkdays, hol-form |
| PLT-FR-102 | The system shall hold the budget types personnel, operating, investment, subsidies and other expenditure, with codes 1 to 5. | - | M | I | Partial | 05-shared.js BUDGET_TYPES |
| PLT-FR-103 | The system shall let the administrator and the finance officer keep standard prices with item, budget type, unit and a price of 0 or more, and retire them, never delete them. | - | S | T | Partial | 81-master-crud.js adPrice |
| PLT-FR-104 | The system shall apply BR-PLT-20 to shared master data, with an action to bring a retired item back. | - | M | T | Partial | 81-master-crud.js retireAct |

### Policy pages and site basics {#plt-fr-policy}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-105 | The system shall show on every page a footer with the agency's name and contacts, links to the 6 policy pages, the copyright year and the last-updated date. | - | M | T | Prototyped | 95b-site.js renderSiteFoot; sweep round 65 |
| PLT-FR-106 | The system shall provide pages for the privacy policy, cookie policy, security policy, website policy and disclaimer, accessibility and contact, filled from tenant data. | - | M | T | Partial | 95b-site.js sitePolicy, VIEWS.policy; sweep round 65 opens each |
| PLT-FR-107 | The system shall let the tenant edit the policy texts and shall keep each published version with its date. | - | S | T | Planned | - |
| PLT-FR-108 | The system shall show the notice of XC-PRV-001 on the sign-in screen as a folded panel, before any session starts, with the full privacy policy behind it. | PDPA 23 | M | T | Partial | 95b-site.js showSignIn |

### PDPA features {#plt-pdpa}

The cross-cutting chapter states the data protection rules. This section specifies the queues and screens that carry them, which every module inherits (ADR-0014). The periods below are the defaults in the code and the design, and each tenant changes them under BR-PLT-23.

| Data class | Default years | Basis |
| --- | --- | --- |
| Audit log | 10 | Records rules, audit trail. The design asks for at least 10 |
| Requests and versions | 10 | Financial records |
| Attachments | 5 | Supporting evidence |
| AI activity log | 2 | AI governance. The design asks for at least 2 |
| AI assistant chats | 1 | Keep only what is needed. The design asks for at least 1 |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-109 | The system shall offer a page for the rule of XC-PRV-014 on which the administrator sets a period per data class within BR-PLT-23 and the auditor reads it. | - | M | T | Partial | 50b-admin-depth.js ADMIN.data |
| PLT-FR-110 | The system shall show the administrator and the auditor what the job of XC-PRV-015 deleted or anonymised, by data class and date. The prototype shows the periods only. | PDPA 33 | M | T | Planned | - |
| PLT-FR-111 | The system shall tell the owner of the data 30 days before deletion. | - | S | T | Planned | - |
| PLT-FR-112 | Each module shall declare which of its records law requires to be kept, so that XC-PRV-012 can refuse their deletion and show the reason. | PDPA 33 | M | T | Planned | - |
| PLT-FR-113 | The system shall offer the data dictionary of XC-PRV-002 as a page that the data protection officer and the auditor can read and filter by module. | PDPA 39 | M | I | Planned | - |
| PLT-FR-114 | The system shall offer the queue of XC-PRV-010 as a work list with an owner and the states in the SDS, and each request shall appear in the owner's My Work. | PDPA 30, PDPA 32, PDPA 33, PDPA 34, PDPA 36 | M | T | Planned | - |
| PLT-FR-115 | A fulfilled deletion request shall run the erasure of XC-SEC-039, after the check of PLT-FR-112. | PDPA 33 | M | T | Planned | - |
| PLT-FR-116 | The system shall show the clocks of XC-PRV-006, XC-PRV-007 and XC-PRV-009 and the decision of XC-PRV-008 on one breach case, with a log of each notice sent. | PDPA 37 | M | T | Planned | - |
| PLT-FR-117 | The system shall offer the export of XC-PRV-013 to the data protection officer, built from the data dictionary. | PDPA 39, PDPA 40 | M | T | Planned | - |
| PLT-FR-118 | The system shall hold the contact of XC-PRV-017 with the other tenant settings of PLT-FR-003, and shall show it in the privacy policy page. | PDPA 41 | M | T | Partial | 95b-site.js SITE_DEF dpo, sitePolicy |
| PLT-FR-119 | The system shall record each consent that XC-PRV-004 asks for, with its notice version and any withdrawal. | PDPA 19, PDPA 24 | S | T | Planned | - |

> [!LAW] The privacy page in the code cites PDPA section 23 for the notice and section 24 (4) and (6) as the legal basis. A PDPA lawyer must confirm both, and the Thai law's numbering of those paragraphs, before the template is used. The 72-hour and 15-day limits come from ADR-0014, whose legal review is pending. Section numbers for the access, objection, erasure and restriction rights rest on the author's knowledge of the Act.

### Systems, switcher and search {#plt-fr-shell}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-120 | The system shall show a rail of pinned systems with the count of tasks in each, and the current system always shall appear on it. | - | M | T | Partial | 90-systems.js renderSysRail |
| PLT-FR-121 | The system shall list all systems in a launcher, grouped as everyday, core, platform and planned, with search, a pin per system, a dimmed card for a system the role cannot use, and the count of waiting tasks. | - | M | T | Partial | 90-systems.js renderLauncher; sweep shell checks text |
| PLT-FR-122 | The system shall set the current system from the page that opens, so that deep links, tasks and notices switch system by themselves. | - | M | T | Partial | 90-systems.js sysOfView; 66-apps.js appOfLink |
| PLT-FR-123 | The system shall show in each system only that system's menu, with Workspace and Administration shared by all. | - | M | T | Partial | 90-systems.js renderNav |
| PLT-FR-124 | The system shall show a breadcrumb of system and page, and a button to pin the current page. | - | S | D | Partial | 90-systems.js renderCrumb, paintPinBtn |
| PLT-FR-125 | The system shall show one page for each planned system that says what it will cover and how it joins the live systems. | - | C | D | Partial | 90-systems.js VIEWS sys- |
| PLT-FR-126 | The system shall search pages, records, users, rules and delegations from one box, opened by Ctrl+K, and shall show only what the role may open. | - | S | T | Partial | 56-search.js searchItems |

### AI co-work {#plt-fr-cowork}

Co-work is a platform feature: one chat engine shown as a side panel and as a full page. The agents behind it belong to the modules, and their requirements stay there.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-127 | The system shall open a chat side panel from any page by button or Ctrl+J, and a full page with conversation history and an agent directory. | - | S | D | Partial | 68-cowork.js cwOpen, VIEWS.cowork |
| PLT-FR-128 | The system shall let a user talk to a general assistant that hands a question to a specialist, or call a specialist by choice or by @ mention, limited to the agents of systems the role may use. | - | S | T | Partial | 68-cowork.js cwPick, cwAgents |
| PLT-FR-129 | The system shall decline a request to approve, change an amount, sign, pay, award or score, and shall say what the assistant can do instead (BR-PLT-25). | - | M | T | Partial | 68-cowork.js CW_NO, cwAnswer |
| PLT-FR-130 | The system shall send the current page and record as context unless the user removes it, and shall show the steps the assistant took. | - | S | D | Partial | 68-cowork.js cwContext, cwMsg |
| PLT-FR-131 | The system shall accept up to 6 files at a time of at most 15 MB each by picker, drag and drop or paste, shall read text and CSV files, and shall let a user attach a Fisko record. Reading images and PDFs is simulated. | - | S | T | Partial | 68-cowork.js cwAddFiles, cwRecChoices |
| PLT-FR-132 | The system shall accept voice input through the browser's speech recognition in Thai or English. | - | C | D | Partial | 68-cowork.js cwVoice |
| PLT-FR-133 | The system shall keep each user's conversations private to that user, with search, pin and delete. | - | S | T | Partial | 68-cowork.js cwThread, cwBindPage |
| PLT-FR-134 | The system shall log every answer with agent, user, action, target and source count. | - | M | T | Partial | 68-cowork.js cwSend |
| PLT-FR-135 | Any change an answer proposes shall be a button the user presses, which runs the normal action with its normal checks. | - | M | T | Partial | 68-cowork.js cwDo |
| PLT-FR-136 | The system shall run co-work through the AI gateway of ADR-0016, off by default, with every feature working while it is off. | - | M | T | Planned | - |

### Administration {#plt-fr-admin}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-FR-137 | The system shall offer an Administration area in which each tab shows only to its listed roles, as the table below states. | - | M | T | Partial | 50-admin.js ADMIN_TABS, VIEWS.admin; sweep render by role |
| PLT-FR-138 | Settings saved in Administration shall take effect at once with no code change. | - | M | T | Partial | 83-admin-crud.js; 50b-admin-depth.js |
| PLT-FR-139 | The system shall offer the view of XC-INT-005 as a page with direction, method and frequency per interface, and shall let a permitted user run, retry or reconcile it. Runs are simulated. | - | M | T | Partial | 50-admin.js ADMIN.integrations |
| PLT-FR-140 | The system shall show the last full and incremental backups, the last restore test with its age, and the RPO and RTO. | - | S | D | Partial | 50b-admin-depth.js ADMIN.data |
| PLT-FR-141 | The system shall put a review step between entering and confirming any record action that asks for input or is a danger action, showing the record, the action, the amount and the reason as they will be recorded. | - | M | T | Prototyped | 92-review.js crActBar; sweep review step |
| PLT-FR-142 | The system shall ask for the record id to be typed before an action that cannot be undone. | - | S | T | Partial | 92-review.js crIrreversible |
| PLT-FR-143 | The system shall offer undo for 10 seconds after a reversible record action. | - | C | T | Partial | 76-crud.js crUndoOffer |

| Tab | Roles in the code | Owner of the requirements |
| --- | --- | --- |
| Master data, Fiscal years and calendar | `admin` | PLT |
| Budget structure, Workflow | `admin` | BGT, PLT |
| Business rules | `admin` | BGT |
| Budget master data | `admin`, `plan`, `audit` | BGT |
| Users and roles, Notifications and SLAs | `admin` | PLT |
| Audit log, Duty separation, Retention and backup | `admin`, `audit` | PLT |
| Integrations | `admin`, `fin` | PLT |
| Procurement rules, Procurement profile | `admin`, `audit`, `proc`, `prochead` | PRC |
| Finance rules | `admin`, `fin`, `finhead`, `audit` | FIN |
| Budget AI and signals | `admin`, `fin`, `audit` | BGT |

## Data requirements {#plt-data}

The prototype holds these records in browser memory for each organisation. The table names each record, its main attributes as they exist in the code, and its personal data. The SDS sets the physical tables.

| Record | Main attributes | Personal data |
| --- | --- | --- |
| Tenant settings | org, addr, tel, email, web, dpo, hours, updated, idleMin, warnMin | Contact of the data protection officer |
| Unit | id, code, parent, name, retired | None |
| User | id, name, role, unit, primary, mfa, active, suspended | Name, role, unit |
| Session | user, org, t | User |
| Duty rule state | sod.rules (id, on) | None |
| Blocked attempt | sod.blocks (t, by, role, rule, item, who) | Attempting person, clashing person |
| Delegation | id, from, to, scopes, start, end, status, t, why | Both people, reason |
| Approval step | workflow (id, name, role, sla, cond, amount, newProj, invest) | None |
| Escalation | escal (remind, to, after) | None |
| Template | tpl (id, ev, ch, subj, body) | None |
| Notice | notes (id, t, to, text, link, read) | Possible, in the text |
| Audit entry | audit (t, user, role, action, target) | User; names in target text |
| AI log | aiLog (t, agent, user, action, target, sources, ok) | User |
| Conversation | cowork.threads (id, user, title, agent, msgs, t, pin) | User; anything typed or attached |
| Fiscal year, calendar, holiday | fyList, calendar, holidays | None |
| Standard price | prices (id, type, name, unit, price, retired) | None |
| Retention | retention (id, cls, years, basis, size) | None |
| Backup status | backup (full, incr, restore, rpo, rto, log) | Person who ran it |
| Interface status | integrations (id, sys, dir, method, freq, status, last, records, msg) | None |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-DR-001 | The system shall keep every delegation, including revoked and expired ones, for the retention period. | - | M | T | Partial | 54-identity.js has no delete |
| PLT-DR-002 | The system shall never reuse a delegation number. | - | M | T | Partial | 54-identity.js dg-form |
| PLT-DR-003 | The subject table of XC-SEC-038 shall be the one source of personal names for every module. | - | M | T | Planned | - |
| PLT-DR-004 | The system shall keep reasons and free text in the business record, with the audit entry pointing to it. | - | M | I | Planned | - |
| PLT-DR-005 | The system shall classify the personal data in the table above in the records of processing, and shall apply ADR-0013 to each class. | PDPA 39 | M | I | Planned | - |
| PLT-DR-006 | The system shall hold names in Thai and English for units, users, master data and templates. | - | M | I | Partial | 83-admin-crud.js; 81-master-crud.js |
| PLT-DR-007 | The system shall apply the AI chat period in the retention table to conversations and their attachments. | - | S | T | Planned | - |

## State rules {#plt-states}

State names are the values in the code. Requirements above give the checks and the actor for each change.

| Delegation state | Derived from | Changes to | Condition and actor |
| --- | --- | --- | --- |
| future (Scheduled) | Today before the start date | active; revoked | The start date arrives; delegator or administrator revokes |
| active | Today within the dates | expired; revoked | The end date passes; delegator or administrator revokes |
| expired | Today after the end date | - | Final |
| revoked | `status` is revoked | - | Final |

| User state | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| Active (`active` true) | Can sign in | Suspended | Administrator, with a reason |
| Suspended (`active` false) | Cannot sign in; history stays | Active | Administrator |

| Fiscal year status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| setup | Structure is being prepared | Any other | Administrator, with a reason. The code imposes no order |
| request | Requests are being prepared | Any other | Same |
| execution | The year is being spent | Any other | Same |
| closed | Lines and structure are read-only | Any other | Same; see OI-PLT-10 |

| Interface status | Meaning | Changes to | Condition and actor |
| --- | --- | --- | --- |
| ok | Last run succeeded | warn; error | The next run reports it |
| warn | Needs review | ok | A permitted user reconciles |
| error | Failed | ok | A permitted user retries |
| pending | Awaiting approval of the channel | - | Outside Fisko |

## Interface requirements {#plt-interfaces}

Platform has no live external connection in the prototype. The table shows what each interface does today.

| Interface | Direction | In the prototype |
| --- | --- | --- |
| Identity provider | In | Simulated: sample accounts and a fixed code |
| ThaID | In | None |
| SMTP e-mail, LINE | Out | Channel switches on a template; nothing is sent |
| SIEM | Out | None |
| Module interfaces | Internal | Global functions in one page: `audit`, `notify`, `sodCheck`, `delegFor`, `myTasks` |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-IR-001 | The system shall connect an agency's directory over OIDC or SAML through Keycloak Organizations, with a separate route for citizens and suppliers. | - | M | T | Planned | - |
| PLT-IR-002 | The system shall give every module one interface for the tenant, authority, delegation and duty checks, and modules shall not hold their own copies. | - | M | T | Partial | 54-identity.js; 64-duties.js |
| PLT-IR-003 | The system shall give every module one interface for audit entries, notices and work items. | - | M | T | Partial | 00-core.js audit, notify; 30-home.js myTasks |
| PLT-IR-004 | The system shall give every module one interface for the working-day count and the fiscal year of a date. | - | M | T | Partial | 61-cases.js addWorkdays; 00-core.js fyOf |
| PLT-IR-005 | The system shall forward audit entries to a SIEM over a documented interface. | - | C | T | Planned | - |
| PLT-IR-006 | The system shall expose interface status to the Administration area from the adapters of every module. | - | S | T | Planned | - |

> [!OPEN] ThaID onboarding for a SaaS product must be confirmed with the Department of Provincial Administration, and Keycloak Organizations must be load-tested at the 500-tenant target (ADR-0006).

## Non-functional requirements specific to Platform {#plt-nfr}

Platform meets all rows of the cross-cutting chapter, and they are not repeated here. Requirements above that carry a cross-cutting rule name its row. This table adds only what is particular to Platform.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-NFR-001 | An in-app notice shall appear within 1 minute of its event. | - | S | T | Planned | - |
| PLT-NFR-002 | A delegation's start, end and revocation shall take effect by the server clock and the tenant's time zone, with no delay after a revocation. | - | M | T | Planned | - |
| PLT-NFR-003 | A blocked duty attempt shall stay in the log even though the action rolls back. | - | M | T | Planned | - |
| PLT-NFR-004 | Besides what XC-SEC-015 forbids, the sample accounts, data reset and the demo guide shall not exist in a production tenant. | - | M | I | Partial | 20-shell.js role; 94-polish.js renderCtx |
| PLT-NFR-005 | Policy texts, notices and templates shall exist in Thai and English. | - | S | D | Partial | 95b-site.js sitePolicy; 00-core.js notify |
| PLT-NFR-006 | Every simulated platform action shall be labelled on screen. | - | M | I | Partial | 54-identity.js; 50b-admin-depth.js |

### Design and implementation constraints {#plt-cr}

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| PLT-CR-001 | Sign-in, MFA and federation shall use Keycloak, with tenants as Keycloak Organizations and not as separate realms. | - | M | I | Planned | - |
| PLT-CR-002 | Roles, duty rules and delegation shall live in the Fisko `platform` module and be checked on the server for every action. | - | M | I | Planned | - |
| PLT-CR-003 | Platform shall be a module of the monolith in ADR-0002, shall depend on no business module, and business modules shall reach it only through its published interfaces. | - | M | I | Planned | - |
| PLT-CR-004 | Every tenant-owned row shall carry `tenant_id` under row-level security, as ADR-0005 decides. | - | M | I | Planned | - |
| PLT-CR-005 | The audit screens and history shall read the log of ADR-0015 only, and no module shall keep a second audit store. | - | M | I | Planned | - |
| PLT-CR-006 | Legal limits shall be dated rules in code and tenant choices shall be settings within them (ADR-0007), which includes the list of duty rules that cannot be switched off. | - | M | I | Planned | - |
| PLT-CR-007 | Agency specifics shall live only in tenant data, with no branch on a kind of agency in code. | - | M | I | Partial | 95b-site.js SITE_CFG; 95-projects.js PRJ_CFG |
| PLT-CR-008 | All AI calls shall pass through the one gateway in `platform` (ADR-0016). | - | M | I | Planned | - |

## Test evidence {#plt-tests}

A Prototyped row rests on one of the checks below in `tests/sweep.js`. Each is a walk or a check that raises an error when the result is wrong. The author read these checks and did not run them for this version.

| Sweep check | What it asserts | Related requirements |
| --- | --- | --- |
| FC1 walk | A direct `sodCheck` on P-F05 refuses and writes a block with that rule; the requester of a bank change sees no confirm or refuse | PLT-FR-040 |
| FC2 walk | SD-11 refuses the checker's approval, so the voucher stays waiting | PLT-FR-039 |
| FC4 walk | SD-12 stops a borrower paying themselves | PLT-FR-039 |
| FC5 walk | SD-16 stops a person reopening what they signed or closed | PLT-FR-039 |
| Round 65 | The footer names the agency and has all policy links; each policy page opens with clean text; `toastErr` marks and focuses the field | PLT-FR-105, PLT-FR-106 |
| Round 66 | Past the idle time the session ends; no Approve button where SD-11 would refuse | PLT-FR-015 |
| Review step | A record action reaches the review step, shows the amount, and confirm runs it | PLT-FR-141 |
| E2E walk E-01 | The administrator opens the next fiscal year and its structure exists | PLT-FR-097 |

The sweep also opens every page and tab for every role, language and organisation, every Administration drawer for the listed roles, the rail, the launcher and the crumb, and every co-work agent with sample questions. It fails on a thrown error or broken text such as `undefined`. That proves the page renders and does not prove its behaviour, so those rows stay Partial. The sweep has no check of delegation, of `delegFor` or `sodActors` with a delegator, of sign-in, MFA or suspension, of notices, of My Work content, of the audit log, of tenant isolation, or of switching a duty rule off.

## Open issues of Platform {#plt-open}

| Issue | Question | Needed from | Effect on this chapter |
| --- | --- | --- | --- |
| OI-PLT-01 | Two overlapping delegations from one person are allowed. Should an overlap be forbidden, allowed with a warning, or allowed only for different delegates? | Product owner, legal unit | PLT-FR-061, PLT-FR-042 |
| OI-PLT-02 | Which approvals may be delegated under the rules, for how long, and is a maximum length needed? (D-09) | Executives, legal unit | BR-PLT-10, BR-PLT-11 |
| OI-PLT-03 | Which duty rules come from law and can never be switched off? This is one question with DG-PRC-05 in the SDS, and one answer settles both | Procurement specialist, finance specialist, legal unit | BR-PLT-09, PLT-CR-006 |
| OI-PLT-04 | SD-03 has no check, SD-09 is not built, SD-10 has no switch or log, and SD-07 and one SD-06 path do not log blocks. Wire each one or remove it | Development team, FIN and BGT owners | PLT-FR-046 |
| OI-PLT-05 | Does one person need several roles or several units, for example an acting head? | Product owner | BR-PLT-02 |
| OI-PLT-06 | Confirm the range XC-SEC-008 proposes for `idleMin`, set one for `warnMin`, and say whether 0 is allowed | Product owner, security reviewer | BR-PLT-05 |
| OI-PLT-07 | MFA for every staff account, as the code and XC-SEC-006 do, or only for executives, Planning, Finance and administrators, as the design says? | Product owner, security reviewer | BR-PLT-03 |
| OI-PLT-08 | Should a delegate be limited to `plan`, `exec` and `fin`? The heads of procurement and finance and the division directors cannot receive or give a delegation | Product owner, legal unit | BR-PLT-11, BR-PLT-12 |
| OI-PLT-09 | Undo removes the audit entry of the undone action. Replace it with compensating actions | Development team | BR-PLT-19, PLT-FR-143 |
| OI-PLT-10 | Fiscal year status has no fixed order and a closed year can be reopened by one person. Should the transitions be fixed, and who may reopen? | Finance specialist, product owner | BR-PLT-21 |
| OI-PLT-11 | SLA days are calendar days in the code. Should they be working days? | Product owner | BR-PLT-17 |
| OI-PLT-12 | Confirm PDPA 23, 24, 30, 32, 33, 34 and 41 in this chapter's register file and the legal positions of ADR-0014, including the draft PDPC guidance reported in July 2026 | PDPA lawyer | PLT-FR-108, PLT-FR-114, PLT-FR-116, BR-PLT-24 |
| OI-PLT-13 | Retention periods per record type, and whether the 1 to 30 year range fits the records rules | Records officer, data protection officer | BR-PLT-23 |
| OI-PLT-14 | Which channels beyond in-app and e-mail are allowed (D-07, DG-XC-22)? The code lists LINE, and the integration chapter lists SMS | IT unit, data protection officer | PLT-FR-075 |
| OI-PLT-15 | The Government Website Standard (มสพร. 11-2566) and the Cyber Security Act are named in the code with no clause. Which clauses bind idle sign-out and the policy pages? | Security reviewer, legal unit | PLT-FR-015, PLT-FR-106 |

The design documents and the code differ in the following places. The code says what exists, the design says what is intended, and each difference is carried by the row named.

| Topic | Design | Code | Row |
| --- | --- | --- | --- |
| MFA | Mandatory for executives, Planning, Finance and administrators | Every user must have it, though an administrator can switch the flag | OI-PLT-07 |
| Role matrix | Seven roles; drives access | Eight rows for display; access comes from page role lists, and four roles have no row | PLT-FR-034 |
| Unit scope | Own unit and units under it | Own unit, for requesters, in some lists | PLT-FR-029 |
| Session on rights change | The session ends | It continues | PLT-FR-018 |
| Delegation notice | The delegator is told | The delegate's role is told at creation only | PLT-FR-053, PLT-FR-054 |
| Delegated tasks | All delegated work in My Work | Spend and cross-unit transfers only | PLT-FR-058 |
| Duty rule switch-off | The Thai page text says a reason is required | No reason is asked | PLT-FR-044 |
| Templates | Every notice comes from a template | Templates are saved and never used; text is fixed at each call | PLT-FR-073 |
| SLA check | Daily at 07:00, for each step | A button, for requests at Planning and committee only | PLT-FR-078 |
| Audit content | Before and after values | Text in the target, on some entries | PLT-FR-088 |
| Audit export | CSV | A message only | PLT-FR-090 |
| Restore test | Each quarter | The page says every 90 days | PLT-FR-140 |
| Exception source | Not in the design documents | Nine sources in the code | PLT-FR-083 |
| Administrator and data | Cannot see or change budget data | Holds the budget structure, the units and the route, which shape budget data | PLT-FR-035 |

## Status summary {#plt-status}

The statuses in this chapter come from reading the code and the tests. The sweep was not run for this version, and nothing here is production code. Platform has many Planned rows, because the prototype has no server: tenancy, real identity, the tamper-evident log and the PDPA workflows exist only as decisions in the ADRs.

{{status-summary: prefix=PLT}}
