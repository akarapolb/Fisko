# Overall description {#overall}

This chapter describes Fisko as a whole: where it sits, what it does, who uses it, where it runs and what limits its design. Requirements themselves are in the later chapters.

## Product perspective {#ov-perspective}

Fisko is a multi-tenant SaaS that gives Thai government agencies one place for the budget cycle, procurement, finance, a project registry, and review and analytics. It stands between agency users and suppliers on one side and government systems on the other.

{{fig:arch-context | Fisko system context}}

Fisko does not replace the government systems. The official procurement steps stay in e-GP, and official figures are those in GFMIS and in signed documents. Fisko prepares the work, checks it against the rules, and records and tracks what happened.

| Aspect | Position |
| --- | --- |
| Delivery | One hosted service for many agencies, plus self-hosting from the same public code (ADR-0001, ADR-0012) |
| Application shape | One deployable modular monolith with six modules (ADR-0002) |
| Tenants | Each agency is a tenant. Tenants are grouped into cells (ADR-0005). A government agency and a state enterprise differ only by a profile setting |
| Current state | A browser-only prototype shows the behaviour. No production code exists, and every external connection is simulated |

## Product functions summary {#ov-functions}

The table is a summary only. The module chapters carry the requirements, and the [Modules overview](#modules) shows how the modules depend on each other.

| Module | Main functions | Chapter |
| --- | --- | --- |
| Platform | Tenancy, sign-in, roles, separation of duties, delegation, audit, notifications, PDPA tools, the AI gateway | [Platform](#plt) |
| Budget | Budget planning, requests, allocation lines, transfers and tracking | [Budget](#bgt) |
| Procurement | Plans, requisitions, case files, methods, e-GP records, contracts, acceptance and penalties | [Procurement](#prc) |
| Finance | Vouchers, payments, GFMIS records, reconciliation and closing | [Finance](#fin) |
| Projects | One project id that joins the budget cycle across the modules | [Projects](#prj) |
| Review and analytics | Agendas, scorecards, analytics and optional AI assistance | [Review and analytics](#rev) |

## User classes and characteristics {#ov-users}

The classes below come from the prototype roles and ADR-0006, ADR-0013 and ADR-0014. Each module chapter lists its own actors in detail. Roles are tenant data, and the Prototype role column shows only what the prototype uses today.

| User class | Uses Fisko to | Characteristics | Prototype role |
| --- | --- | --- | --- |
| Requesting unit staff | Prepare budget requests and requisitions | Occasional users who know their own unit's work and little of the rules | `div`, `divhead` |
| Planning staff | Review requests and manage allocation | Frequent users who know budget rules well | `plan` |
| Procurement staff | Run plans, cases and contracts | Daily users who know procurement law | `proc`, `prochead` |
| Finance staff | Process vouchers, payments and reconciliation | Daily users who know treasury rules and GFMIS | `fin`, `finhead` |
| Executives and approvers | Approve work and read summaries | Short sessions, often with a delegate acting for them | `exec` |
| Committee members | Declare conflicts, score bids, accept work, consider budget requests | Any staff member appointed to a committee, so training cannot be assumed | `committee`, or any active user |
| Auditors | Read records, logs and red flags | Read-only users who need the full history | `audit` |
| Tenant administrators | Keep users, settings and integrations | Agency IT or designated staff, with no access to other tenants | `admin` |
| Data protection officers | Handle data subject requests, breaches and ROPA | Agency staff with a legal duty under PDPA | No role |
| Suppliers | Answer RFQs, see their contracts, send invoices | External users of varied skill, who sign in by a separate route | `vendor`, simulated |
| Citizens | Exercise data subject rights where a tenant offers this | External users with no training. ADR-0006 expects a separate route | No role |
| Operator staff | Run the hosted service and support tenants | Fisko staff who cannot read tenant data without a recorded, approved reason | No role |

> [!OPEN] The number of users in each class is not known, and the load model needs it. The product owner must estimate it from the first agencies. The product owner must also say whether citizens use Fisko directly, since the prototype has no such role.

## Operating environment {#ov-environment}

One codebase runs in two supported setups (ADR-0012). The hosted service uses the Enterprise setup with managed services. Users need only a current web browser.

| Area | Hosted service | Enterprise, self-hosted | Small |
| --- | --- | --- | --- |
| Location | Thai commercial cloud, default AWS Thailand `ap-southeast-7`, three zones | Agency data centre or GDCC | Agency server |
| Runtime | Managed Kubernetes | Kubernetes with high availability | Docker Compose |
| Database | Managed PostgreSQL | PostgreSQL | PostgreSQL |
| Messaging | RabbitMQ | RabbitMQ | Outbox processing with no RabbitMQ |
| Search | OpenSearch | OpenSearch | PostgreSQL search, with weaker Thai results |
| Files | Managed object storage over the S3 API | Compatible product, with Ceph RGW documented | Compatible product |
| Keys and secrets | KMS or HSM | OpenBao | OpenBao |
| Identity | Keycloak | Keycloak | Keycloak |

Browser support is in XC-USA-009. Recovery and availability targets apply to the hosted service, and a self-hosting agency sets its own. Data location rules apply to every setup (XC-PRV-016).

## Design and implementation constraints {#ov-constraints}

These decisions are already taken in `docs/adr/`. The SRS treats them as constraints, and the SDS designs within them. A change needs a new ADR.

| Decision | Constraint on the product |
| --- | --- |
| ADR-0001 | AGPL-3.0 for the whole product. Security, audit and PDPA stay free. Every dependency must be compatible |
| ADR-0002 | One modular monolith. Modules meet only through published interfaces and events |
| ADR-0003 | Java 25 and Spring Boot 4.1, Kotlin allowed. Money in `BigDecimal`. REST in OpenAPI 3.1 |
| ADR-0004 | React, TypeScript and Vite. Thai is the default. WCAG 2.1 AA is a release requirement. Screens come from configuration per tenant |
| ADR-0005 | PostgreSQL, row-level security, and cells. Schema changes follow expand and contract |
| ADR-0006 | Keycloak for sign-in. Roles, separation of duties and delegation sit in `platform` and are checked on the server |
| ADR-0007 | Legal workflow in code, approval chains as tenant data. Legal limits are dated rules, and tenant settings move only within them |
| ADR-0008 | Transactional outbox and RabbitMQ. Consumers are idempotent. Events are in AsyncAPI |
| ADR-0009 | OpenSearch with a Thai tokenizer. Restricted data is never indexed |
| ADR-0010 | S3 API only, with ClamAV scanning. MinIO is excluded |
| ADR-0011 | Thai PDF with TH Sarabun New, PAdES signatures with EU DSS. Signed documents never change |
| ADR-0012 | Thai commercial cloud, two setups, open interfaces only, OpenTofu, Helm, Argo CD and OpenBao. All data stays in Thailand |
| ADR-0013 | Four data classes, TLS 1.3, mutual TLS, field encryption with per-tenant keys |
| ADR-0014 | The agency is the controller and the hosting operator the processor. PDPA functions are built into `platform` |
| ADR-0015 | Hash-chained audit log with no personal data. Erasure works by destroying a subject key |
| ADR-0016 | AI off by default, behind one gateway. Every feature works with AI off. Restricted data is never sent |
| ADR-0017 | OpenTelemetry, Playwright, k6, ASVS 5.0 Level 2 with Level 3 for finance and payments, SBOM and signed releases |

> [!NOTE] Fisko is generic. Agency specifics are tenant settings or tenant data, and no chapter names an agency as a customer.

## Assumptions and dependencies {#ov-assumptions}

The decisions rest on the facts below, which are not yet verified (`docs/adr/README.md`). Each must be checked against a primary source before the SDS is signed off. The last column says what changes if the fact proves false.

| Item | Affects | Check with | If it proves false |
| --- | --- | --- | --- |
| Whether agency cloud purchases must go through GDCC | ADR-0012 | DGA or NT | Agencies may be unable to subscribe to a service on a commercial cloud. The fallback is self-hosting on GDCC |
| Whether Claude can run wholly inside Thailand | ADR-0016 | AWS model availability page | Prompts may be processed abroad, so a tenant must choose a provider hosted in Thailand or leave AI off |
| Managed services available in the chosen Thai region | ADR-0012 | Cloud provider | The hosted service must run the missing service itself or use another region in Thailand |
| How GFMIS and e-GP integrations work | ADR-0008, SDS | Comptroller General's Department | File exchange stays the working assumption, and the adapters change |
| ThaID onboarding for a SaaS product | ADR-0006 | Department of Provincial Administration | Sign-in with ThaID may need a different route, or wait |
| Spring Boot support dates | ADR-0003 | spring.io | The upgrade plan and the cost of extended support change |
| PDPA positions, including the 2026 draft PDPC guidance | ADR-0014, ADR-0015 | Thai PDPA lawyer | Privacy and audit rows change, including erasure by key destruction |
| Licence of each dependency | ADR-0001 | Licence audit | The dependency must be replaced |

The requirements also assume the following.

- About 500 agencies are expected within 2 to 3 years (ADR-0005).
- All agencies peak together at fiscal year end on 30 September (ADR-0005).
- A team of 10 or more developers builds the product (ADR-0002).
- Until the Comptroller General's Department answers, files remain the working assumption for e-GP and GFMIS.
- The hosted service stays subject to a data processing agreement with each agency (ADR-0014).

## Apportioning of requirements {#ov-apportion}

Each requirement belongs to one place, so that it is stated once and tested once.

| Kind of requirement | Where it goes |
| --- | --- |
| Rule that binds every module, including quality targets | [Cross-cutting requirements](#xc), as `XC-<CAT>-nnn` |
| Common rule for external interfaces | [External interfaces](#interfaces), as `XC-INT-nnn` |
| Platform feature that other modules use | The [Platform](#plt) chapter |
| Feature, data or interface of one module | That module's chapter |
| Rule the law places on the official process | e-GP, GFMIS and other government systems keep it. Fisko records the result |
| Duty of the data controller | The agency. Fisko gives the tools, and the hosting operator acts as processor |
| Duty of running the service | The operator for the hosted service, and the agency when it self-hosts |

> [!OPEN] Requirements carry a priority of M, S or C, and no release plan assigns them to versions yet. The product owner must decide which requirements enter the first release, and must confirm that the M rows are the minimum for a first agency.
