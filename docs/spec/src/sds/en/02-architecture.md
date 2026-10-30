# Architecture {#architecture}

> [!NOTE] Fisko has no production code. This chapter applies the accepted decisions in `docs/adr/` and does not reopen them. Where it goes further than an ADR, it says so, and that part is a proposal to build.

## Drivers {#arch-drivers}

These facts shape the architecture. Each comes from an ADR.

| Driver | Source | Consequence for the design |
| --- | --- | --- |
| About 500 agencies are expected within 2 to 3 years | ADR-0005 | Tenants are grouped into cells, and onboarding is fully automated |
| All agencies peak together at fiscal year end on 30 September | ADR-0005 | Capacity is planned against that peak, not a normal day |
| Many actions cross modules in one transaction | ADR-0002 | One deployable application with one database per cell |
| A team of 10 or more developers knows Java and Kotlin best | ADR-0002, ADR-0003 | Java and Spring Boot, with enforced module boundaries |
| Legal steps change rarely and only by law | ADR-0007 | Legal workflow is code, with dated rule versions |
| One database may hold national IDs, bank accounts and sealed bids of many agencies | ADR-0013 | Field encryption with per-tenant keys |
| Government audit needs a log that cannot be changed unnoticed | ADR-0015 | Hash-chained audit log with no personal data |
| The product is open source and agencies may host it themselves | ADR-0001, ADR-0012 | Open interfaces only, and two supported setups |
| Reliability and quality must be measurable | ADR-0017 | OpenTelemetry, and tests that link to requirements |

## Constraints {#arch-constraints}

| Constraint | Source |
| --- | --- |
| All data, backups, logs and support tools stay in Thailand | ADR-0012, ADR-0014 |
| Every dependency must be compatible with AGPL-3.0 | ADR-0001 |
| Application code uses open interfaces only, so that it stays portable to GDCC or an agency data centre | ADR-0012 |
| No agency appears in code. Differences are tenant settings within allowed ranges | ADR-0004, ADR-0007 |
| AI is off by default, and every feature works without it | ADR-0016 |
| Money uses `BigDecimal` only | ADR-0003 |
| The official procurement steps stay in e-GP | PRC-CR-001 |

> [!WARN] The hosted design rests on an unconfirmed fact: whether agencies may buy a service on a commercial cloud (ADR-0012). The fallback is self-hosting on GDCC, which the open-interface rule keeps possible. The Deployment chapter records the decision needed.

## Context view {#arch-context}

Fisko sits between agency users and suppliers on one side and government systems on the other.

{{fig:arch-context | Fisko system context}}

| External system | Purpose | Decision |
| --- | --- | --- |
| ThaID and agency directories | Sign-in | ADR-0006 |
| GFMIS | Government finance entries | ADR-0008 |
| e-GP | Government procurement data | ADR-0008 |
| E-mail, and SMS if OI-PLT-14 allows it | Notices to staff and suppliers | ADR-0002 |
| AI provider | Optional assistance, off by default | ADR-0016 |

> [!OPEN] How GFMIS and e-GP connect is not confirmed. The Comptroller General's Department must supply the interface details.

## Container view {#arch-container}

A browser reaches the edge, and the edge sends each request to the cell of the user's agency. Keycloak, KMS, the edge and the tenant router sit outside the cells. Everything else that holds tenant data sits inside a cell.

{{fig:arch-container | Containers of the hosted service}}

| Container | Runs | Scope | Responsibility | Decision |
| --- | --- | --- | --- | --- |
| Web client | React in the browser | Served from the edge | Screens and translation. Holds no rule that matters to security | ADR-0004, ADR-0006 |
| Edge | Cloud load balancer and WAF, or a reverse proxy when self-hosted | Global | TLS 1.3, WAF, rate limits, static files | ADR-0012, ADR-0013 |
| Tenant router | Small stateless service | Global | Maps a tenant to its cell | ADR-0005 |
| Keycloak | Keycloak with Organizations | Global | Sign-in, MFA, federation | ADR-0006 |
| Control plane | Operations service | Global | Onboarding, tenant moves, export and restore, rollout | ADR-0005 |
| KMS or OpenBao | Cloud KMS, an HSM, or OpenBao | Global | Master keys and every key use logged | ADR-0013 |
| Fisko application | Spring Boot modular monolith | Per cell | All business modules and the REST API | ADR-0002, ADR-0003 |
| Relay and workers | Same image as the application, another process role | Per cell | Outbox relay, scheduled jobs, file scanning queue | ADR-0008 |
| Adapters | Same image, adapter process role | Per cell | Calls to GFMIS, e-GP, e-mail, and SMS if OI-PLT-14 allows it | ADR-0008 |
| PostgreSQL | Managed cluster or self-run | Per cell | Source of truth, row-level security, outbox, audit log | ADR-0005 |
| RabbitMQ | Broker | Per cell | Event delivery. Absent in the small setup | ADR-0008 |
| OpenSearch | Search cluster | Per cell | Thai search. The index can be rebuilt | ADR-0009 |
| S3 API storage and ClamAV | Object storage and a scanner | Per cell | Files, scanned before download | ADR-0010 |

> [!NOTE] The ADRs give each cell its own database cluster and application instances. The architecture page also draws RabbitMQ, OpenSearch and storage inside the cell, and this design follows it. Using one image with several process roles is a proposal: it keeps operations simple (ADR-0002), and each role scales alone.

## Technology stack {#arch-stack}

The version column states only what an ADR fixes. Where an ADR fixes no version, the version is chosen at build start and recorded in the SBOM (ADR-0017).

| Layer | Choice | Version | Decision |
| --- | --- | --- | --- |
| Back-end language | Java, with Kotlin allowed | Java 25 LTS | ADR-0003 |
| Back-end framework | Spring Boot | 4.1 | ADR-0003 |
| Module boundaries | Spring Modulith | Matches Spring Boot | ADR-0002 |
| REST description | OpenAPI | 3.1 | ADR-0003 |
| Event description | AsyncAPI | Chosen at build start | ADR-0008 |
| Front end | React, TypeScript, Vite, TanStack Query | Chosen at build start | ADR-0004 |
| Database | PostgreSQL | A supported major version chosen at build start | ADR-0005 |
| Messaging | RabbitMQ | Chosen at build start | ADR-0008 |
| Search | OpenSearch with a Thai tokenizer | Chosen at build start | ADR-0009 |
| Files | Any S3 API product; Ceph RGW for enterprise self-hosting | S3 API | ADR-0010 |
| Virus scanning | ClamAV | Chosen at build start | ADR-0010 |
| Identity | Keycloak with Organizations, OIDC, SAML | Chosen at build start | ADR-0006 |
| Field encryption | Google Tink, AES-256-GCM, envelope encryption | Chosen at build start | ADR-0013 |
| Transport | TLS 1.3, and mutual TLS between services | TLS 1.3 | ADR-0013 |
| Documents | PDF with TH Sarabun New embedded; PAdES with EU DSS | Chosen at build start | ADR-0011 |
| Infrastructure | OpenTofu, Helm, Argo CD | Chosen at build start | ADR-0012 |
| Containers | Kubernetes (enterprise), Docker Compose (small) | Chosen at build start | ADR-0012 |
| Self-host secrets | OpenBao | Chosen at build start | ADR-0012 |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki | Chosen at build start | ADR-0017 |
| Tests | JUnit, Testcontainers, Playwright, k6 | Chosen at build start | ADR-0017 |
| Security checks | OWASP ASVS, SonarQube, OWASP ZAP | ASVS 5.0 | ADR-0017 |
| Supply chain | CycloneDX SBOM, signed artifacts | Chosen at build start | ADR-0017 |

> [!OPEN] Secondary sources put the end of free support for Spring Boot 4.1 at July 2027. The technical lead must confirm the date on spring.io and plan the upgrade or extended support (ADR-0003).

## Modular structure {#arch-modules}

Fisko is one deployable application divided into six Spring Modulith modules (ADR-0002). A module calls another only through its published interfaces and events, and boundary tests run in CI. The Module design overview chapter sets out how each module is built.

| Module | Holds | Detail |
| --- | --- | --- |
| `platform` | Tenancy, identity, roles, separation of duties, delegation, audit, notifications, PDPA | [Platform chapter](#plt) |
| `budget` | Allocation lines and the ledger | [Budget chapter](#bgt) |
| `procurement` | Plans, cases, contracts, acceptance | [Procurement chapter](#prc) |
| `finance` | Vouchers, payments, GFMIS | [Finance chapter](#fin) |
| `projects` | Projects | [Projects chapter](#prj) |
| `review` | Review and analytics | [Review chapter](#rev) |

Modules depend in one direction. The Module design overview chapter draws that direction and lists each dependency.

## Request path {#arch-request-path}

One web request runs one command in one PostgreSQL transaction. That transaction stores the aggregate, the audit entry and the outbox rows together. A report or export expected to pass 10 seconds runs as a background job, and the user is told when it is ready (XC-PER-006).

{{fig:arch-request-path | The path of one request}}

| Step | Control | When it fails |
| --- | --- | --- |
| Edge | TLS 1.3, WAF, rate limit | Request refused at the edge |
| Tenant router | Reads the organization claim, finds the cell in a cached map | No cell for that tenant: 404. Tenant in maintenance: 503 with `Retry-After` |
| Token check in the cell | The application verifies the token again and trusts nothing from the router | 401 |
| Tenant binding | `SET LOCAL app.tenant_id` as the first statement of the transaction | An unset value makes every query on a tenant table fail, so a mistake ends in an error and never in another tenant's data |
| Authority and duties | `Authorizer`, then `SodGuard` | 403. A duty refusal is logged in its own transaction |
| Business command | Domain methods check state and rules | 409 or 422 with a stable code |
| Commit | Aggregate, audit entry and outbox rows commit together | Nothing is saved |
| After commit | Relay publishes; adapters, rendering and indexing run from events | The state is shown to users, and the command is not undone |

The router reads the claim only to choose a cell. Authorisation happens inside the cell, so a wrong map entry can send a request to the wrong cell but cannot open data: the token's tenant is absent from that cell, and the request ends in 404.

## Event-driven communication {#arch-events}

Modules and external systems learn of events through a transactional outbox (ADR-0008). An event is never lost, and it is never sent for a transaction that rolled back.

- Each module schema holds an `outbox_event` table, written in the transaction of the change.
- A relay process reads unsent rows, publishes them to RabbitMQ, waits for the broker's confirmation and sets `published_at`. Several relays can run, because each row is claimed with `FOR UPDATE SKIP LOCKED`.
- Delivery is at least once. Consumers drop duplicates by `eventId`.
- Routing keys start with the module name, as in `procurement.contract.signed`. AsyncAPI describes every event.
- Payloads hold references and amounts, and never personal data.
- The small setup has no RabbitMQ. The same relay hands each event to the same consumer interface inside the process.

Calls that must succeed or fail with the business change stay synchronous, through a published interface in the same transaction. Budget calls are the main example. Events carry what may happen afterwards.

The sequence from the outbox to an external system is in the Integration chapter.

> [!NOTE] The relay needs to read outbox rows of every tenant in its cell. It uses its own database role, with a policy limited to the outbox tables, and it never reads business tables.

## Data architecture {#arch-data}

PostgreSQL is the source of truth. OpenSearch and all projections can be rebuilt from it (ADR-0009).

### Cells {#arch-cells}

Tenants are grouped into cells, and each cell has its own database cluster and application instances (ADR-0005). A failure touches one cell, and an upgrade rolls out one cell at a time.

{{fig:arch-cells | Cells and the global services}}

| Item | Design | Source |
| --- | --- | --- |
| Shared cell | About 50 to 100 small agencies to start, adjusted from load tests | ADR-0005 |
| Cell count at the target | 5 to 10 cells for 500 small agencies at that density, more with dedicated cells | Derived from ADR-0005 |
| Dedicated cell | A large agency gets its own cell. Isolation is a setting and needs no code change | ADR-0005 |
| Tenant move | A supported operation, described in the Deployment chapter | ADR-0005 |
| Routing | A global routing service maps each tenant to its cell. The map holds tenant id, cell id and state, and no personal data | ADR-0005 |

### Row-level security {#arch-rls}

Every tenant-owned row carries `tenant_id`, and row-level security is enabled and forced on every such table (ADR-0005). The pattern is in the Procurement chapter, and CI tests each table. The Cross-cutting design chapter gives the enforcement layers.

### Where data lives {#arch-data-places}

| Data | Store | Scope |
| --- | --- | --- |
| Module records | One PostgreSQL schema per module | Cell |
| Audit log and subject table | `platform` schema | Cell |
| Audit checkpoints | Write-once object storage, separate from the database | Cell |
| Files | S3 API storage, encrypted under tenant keys | Cell |
| Search documents, with no restricted data | OpenSearch | Cell |
| Tenant-to-cell map, cell inventory | Control plane database | Global |
| User accounts and organizations | Keycloak database | Global |
| Master keys | KMS, HSM or OpenBao | Global |

Other modules never read a module's tables. They use its `api` package. Schema changes follow expand and contract, so old and new versions work during a rolling upgrade (ADR-0005).

## High availability and scalability {#arch-ha}

Availability figures are service objectives, and they are proposals in the Monitoring chapter. This section states the mechanism only.

| Part | Availability | Scaling |
| --- | --- | --- |
| Application | Instances in three zones, stateless, health-checked | More instances in a cell; then more cells |
| PostgreSQL | Managed primary with standbys across zones | Larger instance, read replicas for reports; then more cells |
| RabbitMQ | Replicated queues across zones | More consumers; a backlog waits safely in the outbox |
| OpenSearch | Replicas across zones | More data nodes. The index can be rebuilt |
| Object storage | Cloud service across zones | Grows with use |
| Edge and router | Multiple instances across zones | More instances; the router is stateless |
| Keycloak | Clustered instances across zones | Load test at the 500-tenant target (ADR-0006) |

Capacity is planned against the 30 September peak. k6 tests that peak before each major release (XC-TST-003). A cell that is near its limit is split by moving tenants to a new cell, with no code change.

The Budget ledger row lock is the expected contention point at the peak (see the Procurement chapter). Load tests must measure it first.

## Front-end architecture {#arch-frontend}

| Topic | Design | Decision |
| --- | --- | --- |
| Stack | React, TypeScript and Vite, as static files. No server rendering | ADR-0004 |
| Server data | TanStack Query, with the cache cleared at sign-out | ADR-0004 |
| Design system | A Fisko package built from the prototype's tokens | ADR-0004 |
| Languages | Thai and English through one translation layer. Thai is the default | ADR-0004 |
| Accessibility | WCAG 2.1 AA is a release requirement | ADR-0004 |
| Tenant differences | Screens are served from per-tenant configuration, never from agency-specific code | ADR-0004 |
| Permissions | The server returns what the user may do. A hidden button is only help for the user, and the server still decides | ADR-0006 |
| Visual specification | The prototype's screens | ADR-0004 |
| End-to-end tests | `tests/sweep.js` is rewritten in Playwright, keeping its scenarios | ADR-0004 |

Each module owns a feature folder in the web client, so that the front end follows the same boundaries as the back end. This folder rule is a proposal.

## Decisions {#arch-adrs}

| ADR | Decision | Status |
| --- | --- | --- |
| ADR-0001 | AGPL-3.0, with paid hosting and support | Accepted |
| ADR-0002 | Modular monolith | Accepted |
| ADR-0003 | Java 25 and Spring Boot 4.1 | Accepted |
| ADR-0004 | React and TypeScript | Accepted |
| ADR-0005 | PostgreSQL, row-level security, cells | Accepted |
| ADR-0006 | Keycloak for identity, roles and SoD in the app | Accepted |
| ADR-0007 | Legal workflow in code, approval chains as data | Accepted |
| ADR-0008 | Transactional outbox and RabbitMQ | Accepted |
| ADR-0009 | OpenSearch with Thai tokenizing | Accepted |
| ADR-0010 | S3 API storage with virus scanning | Accepted |
| ADR-0011 | Thai PDF output and PAdES signatures | Accepted |
| ADR-0012 | Thai commercial cloud, two supported setups | Accepted, open risk |
| ADR-0013 | Layered encryption with per-tenant keys | Accepted |
| ADR-0014 | PDPA built into the platform | Accepted, legal review pending |
| ADR-0015 | Hash-chained audit log without personal data | Accepted |
| ADR-0016 | Optional AI behind a gateway | Accepted, open risk |
| ADR-0017 | OpenTelemetry and the quality toolchain | Accepted |

## Open issues {#arch-open}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-XC-01 | Edge, router and Keycloak are shared by all cells. A Keycloak outage stops new sign-ins everywhere. Is one global Keycloak acceptable at 500 tenants? | One clustered Keycloak, load-tested (ADR-0006) | Technical lead, product owner |
| DG-XC-02 | RabbitMQ, OpenSearch and storage per cell add cost at 5 to 10 cells. May smaller cells share them? | One of each per cell, as on the architecture page | Technical lead |
| DG-XC-03 | What size makes an agency large enough for its own cell? | A setting, with no rule yet | Product owner |
