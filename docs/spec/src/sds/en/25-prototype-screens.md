# Prototype screens {#screens}

This chapter lists the pages of the prototype by module, so that a reader of the design can find the behaviour it came from. The pages are not the production front end. They show behaviour, and the production pages follow ADR-0004.

> [!OPEN] This chapter holds no screenshots. The product owner must decide whether to embed screen captures. They would make the document larger, and they would need capturing again after every prototype change.

## How pages are defined {#scr-nav}

The array `NAV` in `src/js/00-core.js` lists the pages. `src/js/20-shell.js`, `64-duties.js`, `71-t2.js`, `90-systems.js` and `95-projects.js` add to it. `BUD_PAGES` in `75-budget-pages.js`, `PROC_PAGES` in `74-proc-pages.js` and `FIN_PAGES` in `66h-fin-pages.js` set the codes and pages of the three apps.

The route of a page is the hash of the URL, such as `#requests`. Procurement and Finance are one route each, `#procurement` and `#finance`, and the deep links `prc-<page>` and `fnc-<page>` choose a page inside them through `jump()`. The supplier portal uses `vp-<tab>` in the same way. Administration tabs have routes of their own, `#admin-<tab>`. Role lists sit on each entry, so a page shows only to the roles it names.

## Budget {#scr-bgt}

| Code | Route | Page | Purpose | Main SRS requirement group |
| --- | --- | --- | --- | --- |
| B1 | `btoday` | Budget today | Budget work for today and a map of the pages | Budget today (B1) and the page map (BGT-FR-001 to BGT-FR-003) |
| B2 | `strategy` | Strategic Planning | Strategy tree, KPIs, links to the budget, the project bank and target revisions | Strategy and KPIs (B2) (BGT-FR-004 to BGT-FR-016) |
| B3 | `requests`, `request` | Budget Requests | Requests from draft to approval, and one request in detail | Requests (B3) (BGT-FR-017 to BGT-FR-038) |
| B4 | `consolidation` | Consolidation | Overview, priorities, ceilings and replies, and three-year and zero-base analysis | Consolidation (B4) (BGT-FR-039 to BGT-FR-054) |
| B5 | `review` | Review & Approval | Queue, rounds, committee meetings, comparisons and hearings | Review (B5) (BGT-FR-055 to BGT-FR-066); Committee and hearings (B5) (BGT-FR-067 to BGT-FR-075) |
| B6 | `submission` | Submission | Checks before sending, packs and forms, status with Parliament, and the brief | Submission (B6) (BGT-FR-076 to BGT-FR-086); Parliament (B6) (BGT-FR-087 to BGT-FR-093) |
| B7 | `allocation` | Budget Allocation | Appropriation, lines, spending plans, balances, transfers, releases and carry-over | Appropriation and allocation lines (B7) (BGT-FR-094 to BGT-FR-104); Transfers (B7) (BGT-FR-115 to BGT-FR-125) |
| B8 | `dashboard` | Execution Monitoring | Live spending, drill-down, forecast, alerts, progress and the import tab | Monitoring (B8) (BGT-FR-133 to BGT-FR-141) |
| B9 | `performance` | Performance | KPIs and scorecard, results chain, quarterly reports, evaluation and the public summary | Performance (B9) (BGT-FR-142 to BGT-FR-155) |
| B10 | `insight` | Analytics and forecasts | Forecasts, what-ifs, trends, signals and quality | Analysis and AI (B10, B11) (BGT-FR-162 to BGT-FR-174) |
| B11 | `assistant` | AI assistant and agents | The budget assistant and budget agents | Analysis and AI (B10, B11) (BGT-FR-162 to BGT-FR-174) |

## Procurement {#scr-prc}

| Code | Route | Page | Purpose | Main SRS requirement group |
| --- | --- | --- | --- | --- |
| P1 | `prc-today` | Today | Your work, what waits for approval, and phases and guarantees coming due | Case file and steps (PRC-FR-026 to PRC-FR-035) |
| P2 | `prc-plan` | Procurement plan | The yearly plan tied to allocation lines, its versions, and needs not yet in the plan | Procurement plan and versions (PRC-FR-001 to PRC-FR-011) |
| P3 | `prc-reqn` | Requisitions | Requisitions from the plan, approval within the room left, and the split-purchase check | Requisitions (PRC-FR-012 to PRC-FR-025) |
| P4 | `prc-cases` | Case files | The 12-step case file from requisition to close, and a timeline of every case | Case file and steps (PRC-FR-026 to PRC-FR-035); Method selection and rules table (PRC-FR-036 to PRC-FR-045); e-GP notice and bids (PRC-FR-054 to PRC-FR-061) |
| P5 | `prc-tor` | TOR library | Approved terms of reference to reuse, with versions | TOR and market research (PRC-FR-046 to PRC-FR-053) |
| P6 | `prc-docs` | Documents | Forms, e-mails and reading received documents, simulated | Document numbers and forms (PRC-FR-155 to PRC-FR-163) |
| P7 | `prc-contracts` | Contracts and phases | Contracts, deliveries, acceptance, penalties, changes and guarantees | Contracts and phases (PRC-FR-097 to PRC-FR-106); Delivery and acceptance (PRC-FR-107 to PRC-FR-119); Penalties (PRC-FR-120 to PRC-FR-126) |
| P8 | `prc-fees` | Committee fees | Committee fees by rate and approval by amount | Committees and conflict of interest (PRC-FR-081 to PRC-FR-091) |
| P9 | `prc-suppliers` | Suppliers | Supplier register and history, the abandoned-work list and the legal-entity check | Suppliers and blacklist (PRC-FR-149 to PRC-FR-154) |
| P10 | `prc-insight` | Analytics | KPIs, red flags, forecasts and what-ifs | Plan reports and analytics (PRC-FR-164 to PRC-FR-170); Red flags (PRC-FR-171 to PRC-FR-175) |
| P11 | `prc-reports` | Reports | The monthly procurement summary and the conflict-of-interest report | Plan reports and analytics (PRC-FR-164 to PRC-FR-170) |
| P12 | `prc-egp` | e-GP and OCDS | Import status files from e-GP and export open data in OCDS | e-GP notice and bids (PRC-FR-054 to PRC-FR-061) |
| P13 | `prc-ai` | AI and agents | The AI assistant one tool at a time, and agents that stop for a person at every write, simulated | AI assistance (PRC-FR-180 to PRC-FR-189) |
| V1 | `vp-rfq` | Invitations and RFQs | The supplier sees its invitations and replies to an RFQ | Interface requirements (PRC-IR-010) |
| V2 | `vp-contracts` | My contracts | The supplier sees its own contracts | Interface requirements (PRC-IR-010) |
| V3 | `vp-invoices` | Invoices | The supplier sends an invoice for an accepted phase | Interface requirements (PRC-IR-011) |

## Finance {#scr-fin}

| Code | Route | Page | Purpose | Main SRS requirement group |
| --- | --- | --- | --- | --- |
| F1 | `fnc-home` | Today | Your work, the regulation clocks and commitments at a glance | Settings and clocks (FIN-FR-001 to FIN-FR-141) |
| F2 | `fnc-chain` | Commitments | Every commitment, GFMIS purchase orders and carry-over | Commitments and purchase orders (FIN-FR-008 to FIN-FR-016); Carry-over (FIN-FR-127 to FIN-FR-129) |
| F3 | `fnc-pay` | Vouchers and payment | Vouchers of every type, sending to GFMIS, payment and withholding tax | Vouchers (FIN-FR-017 to FIN-FR-040); GFMIS files and payment (FIN-FR-041 to FIN-FR-052) |
| F4 | `fnc-adv` | Advances | Advance register: approve, pay, check clearings and demand repayment | Advances (FIN-FR-062 to FIN-FR-077) |
| F5 | `fnc-recv` | Receipts and remittance | Receipts, recording them and remitting on time | Receipts and remittance (FIN-FR-078 to FIN-FR-086) |
| F6 | `fnc-cash` | Daily cash | The daily cash report and the committee's count | Daily cash (FIN-FR-087 to FIN-FR-095) |
| F11 | `fnc-nb` | Non-budget money | Funds, spending plans, treasury deposits and withdrawals, and movements | Non-budget money (FIN-FR-096 to FIN-FR-104) |
| F7 | `fnc-recon` | Reconciliation | Bank reconciliation, GFMIS reports and payment result files | Reconciliation (FIN-FR-105 to FIN-FR-119) |
| F8 | `fnc-close` | Close | Daily, monthly and yearly close, audit queries, and spending sent to Budget | Closing (FIN-FR-120 to FIN-FR-126); Audit queries (FIN-FR-130 to FIN-FR-132) |
| F9 | `fnc-ai` | AI and analytics | Finance agents, forecasts, what-ifs, KPIs and warning signals | AI and analytics (FIN-FR-133 to FIN-FR-140) |
| F10 | `fnc-reg` | Registers and setup | GFMIS users, supplier bank accounts, the cash committee and receipt books | Supplier bank accounts (FIN-FR-053 to FIN-FR-061); Reconciliation (FIN-FR-105 to FIN-FR-119) |

## Projects {#scr-prj}

Projects pages have no code. They sit on the rail of the app switcher.

| Code | Route | Page | Purpose | Main SRS requirement group |
| --- | --- | --- | --- | --- |
| - | `prj-cycle` | The 8-step cycle | Where each project stands in the cycle | The 8-step cycle (PRJ-FR-012 to PRJ-FR-017) |
| - | `prj-registry` | Project register | Every project with its one id | Project register (PRJ-FR-001 to PRJ-FR-011) |
| - | `prj-project` | Project 360° | All facts of one project, read from the owners | Project 360 (PRJ-FR-023 to PRJ-FR-029) |
| - | `prj-pm` | PM exchange | Send to and receive from a project management system, simulated | Exchange out to the PM system (PRJ-FR-030 to PRJ-FR-040); Exchange in from the PM system (PRJ-FR-041 to PRJ-FR-047) |
| - | `prj-share` | Data sharing | Consumers, approvals and the send log | Data sharing (PRJ-FR-048 to PRJ-FR-055) |
| - | `prj-tor` | ToR modules and duties | A map of modules and duties | Module and duty map (PRJ-FR-060 to PRJ-FR-062) |

## Review and analytics {#scr-rev}

This module has no pages of its own in the prototype. Its behaviour sits on pages of other modules, and two groups have no page.

| Route | Where it shows | Main SRS requirement group |
| --- | --- | --- |
| `home` | Cards on My Workspace | Home cards (REV-FR-001 to REV-FR-003) |
| `dashboard` | The live tab of B8 | Executive dashboard (REV-FR-004 to REV-FR-009) |
| `performance` | The scorecard tab of B9 | Project scorecard (REV-FR-010 to REV-FR-013) |
| `insight` | The signals tab of B10 | Spending anomalies (REV-FR-021 to REV-FR-027) |
| `cowork` | The shared assistant and its chat panel | Shared assistant (REV-FR-028 to REV-FR-034) |
| `assistant`, `prc-ai`, `fnc-ai` | Agent tabs of each app | Agent framework (REV-FR-035 to REV-FR-047); AI governance (REV-FR-048 to REV-FR-052) |
| - | No page | Cross-module insight (REV-FR-014 to REV-FR-020); Cross-module agendas (REV-FR-053 to REV-FR-055) |

## Platform and workspace {#scr-plt}

| Code | Route | Page | Purpose | Main SRS requirement group |
| --- | --- | --- | --- | --- |
| - | `home` | My Workspace | Tasks, notices and cards across systems | Tasks and My Work (PLT-FR-079 to PLT-FR-086) |
| - | `inbox` | Approvals | One approvals inbox for every system | Tasks and My Work (PLT-FR-079 to PLT-FR-086) |
| - | `exceptions` | Exception centre | Exceptions from every system | Tasks and My Work (PLT-FR-079 to PLT-FR-086) |
| - | `pins` | Pinned and recent | Pages the user pinned or opened lately | Tasks and My Work (PLT-FR-079 to PLT-FR-086) |
| - | `delegation` | Delegation of authority | Create and end delegations | Delegation and acting (PLT-FR-047 to PLT-FR-061) |
| - | `cowork` | AI co-work | Conversations with the assistant, with files and voice | AI co-work (PLT-FR-127 to PLT-FR-136) |
| - | `policy` | Policies | Privacy, cookie, security, terms, accessibility and contact pages | Policy pages and site basics (PLT-FR-105 to PLT-FR-108) |
| - | `demo` | Demo guide | A guide for presenting the prototype. It must not exist in production (PLT-NFR-004) | - |
| - | `sys-assets`, `sys-hr`, `sys-saraban`, `sys-audit`, `sys-revenue` | Planned systems | A page that says what each planned system will cover | Systems, switcher and search (PLT-FR-120 to PLT-FR-126) |
| M10 | `admin-master`, `admin-fiscal` | Master data; fiscal years and calendar | Units, master lists, fiscal years and the calendar | Shared master data (PLT-FR-097 to PLT-FR-104) |
| M10 | `admin-users` | Users and roles | Users, roles and suspension | Organisation and users (PLT-FR-022 to PLT-FR-030); Roles and permissions (PLT-FR-031 to PLT-FR-037) |
| M10 | `admin-workflow` | Workflow | Approval chains | Approval chains (PLT-FR-062 to PLT-FR-068) |
| M10 | `admin-audit` | Audit log | Search the audit log | Audit log and record history (PLT-FR-087 to PLT-FR-096) |
| M10 | `admin-duties` | Duty separation | Duty rules, switches and blocks | Separation of duties (PLT-FR-038 to PLT-FR-046) |
| M10 | `admin-notify` | Notifications and SLAs | Templates, channels and SLA rules | Notifications (PLT-FR-069 to PLT-FR-078) |
| M10 | `admin-integrations`, `admin-data` | Integrations; retention and backup | Interface status, retention and backup state | Administration (PLT-FR-137 to PLT-FR-143) |
| M10 | `admin-structure`, `admin-rules`, `admin-bmaster`, `admin-bcfg` | Budget structure, business rules, budget master data, budget AI and signals | Budget settings held in Administration | Budget settings (BGT-FR-156 to BGT-FR-161) |
| M10 | `admin-procrules`, `admin-procprof` | Procurement rules; procurement profile | Method rules, procurement settings and the agency profile | Method selection and rules table (PRC-FR-036 to PRC-FR-045); Procurement profile (PRC-FR-176 to PRC-FR-179) |
| M10 | `admin-fcfg` | Finance rules | Finance settings and clocks | Settings and clocks (FIN-FR-001 to FIN-FR-141) |

`NAV` leaves out a few views that other pages open: `request`, `advances`, `cashcount`, `cowork`, `policy`, `demo` and `delegation`. The route `sys-` pages come from the `SYSTEMS` table in `90-systems.js`.
