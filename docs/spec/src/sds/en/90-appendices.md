# Appendices {#appendices}

These appendices bring together the design issues still open, the architecture decisions behind this document, and the clauses the design answers.

## Design open issues {#app-dg}

The chapters raise 77 design issues. Each row is copied from the chapter that raised it, and shows what the design assumes until someone decides. Open issues carried from the SRS keep their OI ids and are indexed in the SRS appendices.

| Set | Issues | Chapter |
| --- | --- | --- |
| Cross-cutting | 23 | [Cross-cutting](#cross-cutting) |
| Platform | 14 | [Platform](#plt-open) |
| Budget | 9 | [Budget](#bgt-open) |
| Procurement | 12 | [Procurement](#prc-open) |
| Finance | 7 | [Finance](#fin-open) |
| Projects | 6 | [Projects](#prj-open) |
| Review and analytics | 6 | [Review and analytics](#rev-open) |

### Cross-cutting {#app-dg-xc}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-XC-01 | Edge, router and Keycloak are shared by all cells. A Keycloak outage stops new sign-ins everywhere. Is one global Keycloak acceptable at 500 tenants? | One clustered Keycloak, load-tested (ADR-0006) | Technical lead, product owner |
| DG-XC-02 | RabbitMQ, OpenSearch and storage per cell add cost at 5 to 10 cells. May smaller cells share them? | One of each per cell, as on the architecture page | Technical lead |
| DG-XC-03 | What size makes an agency large enough for its own cell? | A setting, with no rule yet | Product owner |
| DG-XC-04 | Which clauses of the Cybersecurity and Digital Government Acts apply? Carried from OI-XC-08 | None cited | Legal unit |
| DG-XC-05 | Retention periods per record type. Carried from OI-XC-07 | A schedule with retention keys and no periods | Product owner, data protection officer |
| DG-XC-06 | Allowed file types and size limit | Settings with a range, values open | Product owner |
| DG-XC-07 | Conditions for opting in to an AI provider outside Thailand | Off by default, per-tenant policy | Data protection officer, product owner |
| DG-XC-08 | Which roles may reveal each restricted field? | A separate authority per field, with a reason and a logged reveal | Data protection officer |
| DG-XC-09 | Will auditors accept a placeholder for an erased name, and which record types can never be erased? | Placeholder, with a rule per record type | Auditor, legal unit |
| DG-XC-10 | Certificate authority, timestamp service and redistribution of the font. Carried from OI-XC-10 and OI-XC-12 | Open as in ADR-0011 | Product owner, with ETDA guidance |
| DG-XC-11 | Must agency cloud purchases go through GDCC? | Hosted on a commercial cloud, with self-hosting on GDCC as the fallback | DGA or NT, product owner |
| DG-XC-12 | Which managed services run in the chosen region? | Managed services, replaced by open-source products where absent | Cloud provider, technical lead |
| DG-XC-13 | One Kubernetes cluster per cell costs more than namespaces. Is the isolation worth it? | One cluster per cell | Technical lead, product owner |
| DG-XC-14 | Where is the second site, and is a region-loss target promised? | An off-site copy in Thailand, with the proposed figures | Product owner |
| DG-XC-15 | Which recovery figures are promised, and in which contract? Carried from OI-XC-02 | The proposed table | Product owner |
| DG-XC-16 | CI platform, signing tool, and the scanners for dependencies, licences and secrets. Each must meet ADR-0001 | Cosign proposed; the others are chosen at build start | Technical lead |
| DG-XC-17 | CLA or DCO | Open | Product owner, lawyer |
| DG-XC-18 | Which store holds traces? | Trace ids in logs; store open | Technical lead |
| DG-XC-19 | Which objectives are promised, and what are the hours of the on-call rota? Carried from OI-XC-01 and OI-XC-02 | The proposed tables | Product owner |
| DG-XC-20 | GFMIS transport, layouts and access | `GfmisGateway` with no format | Comptroller General's Department |
| DG-XC-21 | ThaID terms for a SaaS product | A further identity provider in Keycloak | Department of Provincial Administration |
| DG-XC-22 | The e-mail provider, and whether SMS or LINE is needed (OI-PLT-14) | `Notifier` port with SMTP first, and `MessageChannel` with no adapter | Product owner, IT unit, data protection officer |
| DG-XC-23 | XC-OBS-002 puts cell and tenant on every metric. May route-level metrics leave out the tenant to protect Prometheus? | Tenant on the listed metrics, every log line and every trace | Owner of the SRS requirement, technical lead |

### Platform {#app-dg-plt}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-PLT-01 | Should a user with two delegations in one scope choose one per action, or does one action use all? | The user chooses; every delegator is duty-checked | Product owner, legal unit |
| DG-PLT-02 | The Procurement chapter now applies the answer table, and its `holiday` table has moved to `platform`. Does the product owner accept these changes? | As in the answer table | Procurement author, product owner |
| DG-PLT-03 | Can Keycloak Organizations hold a different idle time per tenant, as the cross-cutting chapter assumes? If not, Fisko must measure activity itself | The value stays in `tenant_setting`, and `SessionPolicy` pushes it | Development team |
| DG-PLT-04 | A work item for a role: does the first person to open it claim it, or do all see it until it closes? | All see it, as in the prototype | Product owner |
| DG-PLT-05 | How long do outbox rows stay after publishing? The Procurement data table leaves this to Platform | Key `plt.outbox`, with no period | Development team, product owner |
| DG-PLT-06 | Which steps of a procurement or finance chain may a tenant change, given that the law fixes some approvers? | Locked steps in the starter chains; PRC and FIN name them | Procurement and finance specialists |
| DG-PLT-07 | How often are chain checkpoints written? Aligned: the cross-cutting SDS proposed 1 hour and now uses the value of XC-SEC-035 | At least every 24 hours, as XC-SEC-035 states | Security reviewer |
| DG-PLT-08 | Who approves operator access to tenant data: the tenant or the operator's own officer? | `operator_access` holds the approver; tenant approval proposed | Product owner, data protection officer |
| DG-PLT-09 | The data protection officer has no role in the code. Add `dpo` as a thirteenth role, or grant authority to a user of another role? | A role `dpo` | Product owner, data protection officer |
| DG-PLT-10 | Who administers tenants across a cell in the hosted setup, given that the tenant `admin` must see one tenant only? | A separate operator console outside tenant roles | Product owner |
| DG-PLT-11 | When a user moves unit, do open delegations and work items follow? | Delegations stay; work items return to the role | Product owner |
| DG-PLT-12 | Do policy texts need legal sign-off per tenant before publishing, as the templates cite clauses? | A published version records who approved | Data protection officer |
| DG-PLT-13 | Should a suspended delegator's delegation hold, or should it end? The design holds it | `held`, which returns to `active` on reactivation within the dates | Product owner, legal unit |
| DG-PLT-14 | XC-PER-001 to XC-PER-008 are proposed targets for every module. Do the checks on every request need a target of their own? | The checks fall under XC-PER-001 and XC-PER-002 | Product owner |

### Budget {#app-dg-bgt}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-BGT-01 | The design lists request states to allocated, and the code stops at approved. Which does the user see? | `status` plus a `track` value, shown together | Product owner |
| DG-BGT-02 | BGT-DR-006 holds whole baht, while GFMIS and the ledger meet satang from Finance. Are satang kept? | `numeric` with two decimal places in the ledger; whole baht on requests | Budget specialist, product owner |
| DG-BGT-03 | Can the executive reject at `exec`? The route has no such path in the code | Return only, as in the prototype | Budget specialist |
| DG-BGT-04 | A request with several budget types becomes one line. Should it become one line per type? | One line per budget type, which differs from the prototype | Budget specialist, product owner |
| DG-BGT-05 | Finance owns GFMIS, but B8 has the import tab and the reconciliation. Who owns the screen? | `finance` owns the import; B8 links to it and reads the result | Authors of the FIN chapter, product owner |
| DG-BGT-06 | A transfer across budget types changes the type totals of the act. When is that lawful? | Allowed as in the prototype, and the original act amounts are kept apart | Budget specialist |
| DG-BGT-07 | Does a payroll estimate need named rows, or only totals? | Totals by position only | Data protection officer, budget specialist |
| DG-BGT-08 | Do the ledger call and the rule book need their own targets? | The cross-cutting targets apply | Product owner |
| DG-BGT-09 | An approved carry-over creates next year's line, but the amount comes from a commitment in Finance. Does `finance` or `budget` start it? | `budget` creates it and tells `finance` by event | Authors of the FIN chapter, budget specialist |

### Procurement {#app-dg-prc}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-PRC-01 | BR-PRC-12 names rates for goods, services and construction, while PRC-FR-037 adds consulting and design. What rate and minimum apply? | The prototype falls back to the goods rate with the service minimum; `consult` is refused at signing until a rate exists | Procurement specialist |
| DG-PRC-02 | PRC-DR-006 holds whole baht, but real invoices carry satang, and `invoiceTol` defaults to 0, so such an invoice fails the gate. Are satang kept? | `numeric` columns with two decimal places, and a domain check for whole baht that a release can remove | Procurement specialist, product owner |
| DG-PRC-03 | After a termination the guarantee is forfeited. Does the gate's guarantee check still apply to an accepted, unpaid phase? | The check fails and needs a release, as in the prototype | Procurement specialist |
| DG-PRC-04 | With `guaranteePct` at 0 no guarantee is required, yet BR-PRC-15 needs one in force. Which exemptions exist? | The gate check passes when the setting requires no guarantee; the prototype would fail | Procurement specialist |
| DG-PRC-05 | BR-PRC-08 lets a tenant switch any duty rule off. Some rules may come from law, and ADR-0007 keeps legal limits out of tenant hands. Which rules can never be off? This is one question with OI-PLT-03, and one answer settles both | All switchable as in the SRS, and each switch-off notifies the auditor | Procurement specialist, legal unit |
| DG-PRC-06 | Does the key-release design meet "including operators" in ADR-0013? | Key right granted by the opening job, every use logged | Security reviewer, product owner |
| DG-PRC-07 | The SRS actor table says the auditor reads everything, and PRC-NFR-007 limits bid prices before the award. Which wins? | PRC-NFR-007 wins | Auditor, product owner |
| DG-PRC-08 | Platform answered in [its answer table](#plt-dg-prc), and Budget and Finance publish their interfaces. Does the product owner accept the changes they make to the requests? | This chapter follows those answers, as listed in Components | Authors of those chapters, product owner |
| DG-PRC-09 | May a daily job move a case from step 7 to step 8 with no person, given that filed appeals come from e-GP? | The job moves it and records `system` as the actor | Product owner, procurement specialist |
| DG-PRC-10 | Copying the penalty rate at signing differs from the prototype. Which rate does the law expect for a running contract? | The rate at signing | Procurement specialist |
| DG-PRC-11 | XC-PER-001 to XC-PER-008 are proposed targets for every module. What per-tenant volume applies to Procurement? | Load tests use the XC-PER rows, with no volume of its own | Product owner |
| DG-PRC-12 | How does a supplier sign in, and how is the user bound to one tax ID (PRC-IR-013)? | A Keycloak user under a supplier organization, bound by `tax_id_bidx` after an officer's check | Product owner, data protection officer |

### Finance {#app-dg-fin}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-FIN-01 | The Procurement chapter now has the narrower `FinanceFacts`, declares `BankChangeIntake`, and lets `PhasePayment.rejected` free a phase. Does the product owner accept these? | As listed in Components | Procurement author, product owner |
| DG-FIN-02 | BGT-IR-005, the Budget SDS and the Integration chapter now all place the import in Finance. Who owns the screen (DG-BGT-05)? | Finance imports and writes through `LineLedger.recordDisbursement`, and Budget links to the result | Budget author, product owner |
| DG-FIN-03 | Should `PhasePayment.approved` run at approval or at payment? | At approval, as in the prototype | Product owner, Procurement owner |
| DG-FIN-04 | Does a voucher hold on `LineLedger` by `reserve`, or by a Finance row only? | `reserve` when there is no commitment, a `voucher_hold` row on a commitment | Budget author, technical lead |
| DG-FIN-05 | Does the portal bank change need a further control beyond the second person? | Recorded contact, reveal log, SG-F03 | Security reviewer, finance specialist |
| DG-FIN-06 | Who owns the agent runtime, given the Review chapter's request for `AgentRuntime` in Platform? | Tools in `finance.assistant`, runs on that runtime | Review author, Platform author |
| DG-FIN-07 | Does a carried amount stay on its commitment, or move to a new one on the carried line (DG-BGT-09)? | Budget creates the carried money and raises `carry-over.approved`. The commitment stays, and its line reference changes on that event | Budget author, finance specialist |

### Projects {#app-dg-prj}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-PRJ-01 | Will `budget`, `procurement` and `finance` offer the new queries, events and references this chapter asks for? | As listed in Components and Dynamic behaviour | Authors of those chapters, technical lead |
| DG-PRJ-02 | Who links a project by hand when a reference is missing, such as lines loaded at tenant start? | No such command yet; a new project starts | Product owner, Planning |
| DG-PRJ-03 | `ContractLookup` holds no personal fields, yet Project 360 shows the supplier name, which may be a natural person. May it show? | Show the supplier only when the API gives it | Data protection officer |
| DG-PRJ-04 | Should the share approval check become a numbered duty rule in the Platform register? | A second-person check with no number | Platform owner |
| DG-PRJ-05 | XC-PER-001 to XC-PER-008 are proposed targets for every module. What volume per tenant and number of projects apply here? | Load tests use the XC-PER rows, with no volume of their own | Product owner |
| DG-PRJ-06 | Does the registry keep a read of projects for a closed fiscal year, or does a closed project leave the lists? | Kept, with a fiscal year filter | Product owner |

### Review and analytics {#app-dg-rev}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-REV-01 | Does `platform.ai` host `AgentRuntime`, `AgentCatalogue` and the agent tables, and does `procurement` drop `AgentRunner` and its copy of `ai_use`? | Yes, as this chapter shows | Technical lead, Platform and Procurement chapter owners |
| DG-REV-02 | The interfaces requested of `budget` and `procurement`, and the events requested of `budget` and `finance`, are not agreed | As listed in Components | Chapter owners, product owner |
| DG-REV-03 | The prototype has both `stopped` and `cancelled` for a run. Is one end state enough? | One state, `stopped`, with a reason | Technical lead |
| DG-REV-04 | May the person who starts a run also approve its steps? | Yes, since that person acts for each command | Auditor, product owner |
| DG-REV-05 | Does `KpiSource` return computed values or a query? | Computed values with the sample size, from the module's `reporting` package | Technical lead |
| DG-REV-06 | Which roles in the role list may use each agent in the assistant, given that unit staff can reach anomalies through chat today? | Filtered by `rev.anomaly.read` in the tool | Auditor, product owner |

## Architecture decision records {#app-adr}

The records live in `docs/adr/`. A record is never rewritten after acceptance. A change needs a new record that supersedes the old one.

| ADR | Decision | Status | Main chapter |
| --- | --- | --- | --- |
| ADR-0001 | AGPL-3.0, with paid hosting and support | Accepted | [DevSecOps](#devsecops) |
| ADR-0002 | Modular monolith | Accepted | [Modules](#modules) |
| ADR-0003 | Java 25 and Spring Boot 4.1 | Accepted | [Architecture](#arch-stack) |
| ADR-0004 | React and TypeScript | Accepted | [Architecture](#arch-frontend) |
| ADR-0005 | PostgreSQL, row-level security, cells | Accepted | [Architecture](#arch-data) |
| ADR-0006 | Keycloak for identity, roles and separation of duties in the application | Accepted | [Identity and sign-in](#xc-identity) |
| ADR-0007 | Legal workflow in code, approval chains as data | Accepted | [Modules](#mod-command) |
| ADR-0008 | Transactional outbox and RabbitMQ | Accepted | [Integration](#integration) |
| ADR-0009 | OpenSearch with Thai tokenizing | Accepted | [Architecture](#arch-data) |
| ADR-0010 | S3 API storage with virus scanning | Accepted | [File handling](#xc-files) |
| ADR-0011 | Thai PDF output and PAdES signatures | Accepted | [Cross-cutting design](#cross-cutting) |
| ADR-0012 | Thai commercial cloud, two supported setups | Accepted, open risk | [Deployment](#deployment) |
| ADR-0013 | Layered encryption with per-tenant keys | Accepted | [Encryption](#xc-encryption) |
| ADR-0014 | PDPA built into the platform | Accepted, legal review pending | [Privacy](#xc-privacy) |
| ADR-0015 | Hash-chained audit log without personal data | Accepted | [Audit log](#xc-audit) |
| ADR-0016 | Optional AI behind a gateway | Accepted, open risk | [AI gateway](#xc-ai) |
| ADR-0017 | OpenTelemetry and the quality toolchain | Accepted | [Monitoring](#monitoring) |

> [!OPEN] Eight facts behind these decisions are not verified, as `docs/adr/README.md` lists: cloud purchasing through GDCC, where the AI model can run, managed services in the Thai region, how GFMIS and e-GP integrate, ThaID for a SaaS product, Spring Boot support dates, the PDPA positions, and the licence of each dependency. The owner named in that table must check each one against a primary source before the SDS is signed off.

## Clause coverage {#app-coverage}

The table is built from the clause register, the `covers` comments in this document and the `law` lines of its diagrams. Covered means the design cites the clause. It does not mean the citation is confirmed.

{{coverage}}
