# Monitoring {#monitoring}

> [!NOTE] The tools come from ADR-0017. Metric names, objectives, alert conditions and retention periods in this chapter are proposals. The product owner must confirm the objectives before any of them is promised to an agency.

## Design {#mon-design}

Observability uses OpenTelemetry, Prometheus, Grafana and Loki. Telemetry is tagged by cell and tenant, and it contains no personal data (ADR-0017).

{{fig:mon-telemetry | Telemetry path}}

- The application, relay, workers and adapters emit through the OpenTelemetry SDK to a Collector in each cell.
- The Collector adds the `cell` tag and drops any attribute outside an allow list, as a second defence after the tests of ADR-0015.
- All telemetry stays in Thailand (ADR-0012). The monitoring stack runs per cell, and a global Grafana reads across cells.
- The audit log is a separate record with its own rules. Telemetry never replaces it.

> [!OPEN] ADR-0017 names no store for traces. Grafana Tempo would fit the same stack, and its licence must pass the audit. The technical lead must choose (DG-XC-18). Until then trace ids appear in logs and in Problem Details, so a request can still be followed.

## Telemetry catalogue {#mon-catalogue}

### Metrics {#mon-metrics}

| Metric | Type | Tags | Source |
| --- | --- | --- | --- |
| `http_server_requests` | Histogram | `cell`, `module`, `route`, `status` | Application |
| `http_server_tenant_requests` | Counter | `cell`, `tenant`, `status class` | Application |
| `command_total` | Counter | `cell`, `module`, `command`, `outcome` | Application |
| `sod_refusals_total` | Counter | `cell`, `tenant`, `rule` | `SodGuard` |
| `db_pool_in_use`, `db_query_duration` | Gauge, histogram | `cell`, `role` | Application |
| `db_lock_wait` | Histogram | `cell`, `module` | PostgreSQL exporter |
| `outbox_unsent`, `outbox_oldest_age` | Gauge | `cell`, `module` | Relay |
| `delivery_total` | Counter | `cell`, `tenant`, `adapter`, `state` | Adapters |
| `delivery_oldest_failed_age` | Gauge | `cell`, `adapter` | Adapters |
| `file_scan_total`, `file_quarantine_age` | Counter, gauge | `cell`, `result` | Workers |
| `audit_chain_lag`, `audit_chain_verify_failures` | Gauge, counter | `cell`, `tenant` | Chainer |
| `key_use_total`, `key_unwrap_failures` | Counter | `cell`, `tenant`, `purpose` | `FieldCrypto` |
| `ai_calls_total` | Counter | `cell`, `tenant`, `provider`, `outcome` | `AiGateway` |
| `job_last_success` | Gauge | `cell`, `job` | Workers |
| `signin_total` | Counter | `organization`, `outcome` | Keycloak |

The `tenant` tag appears on the metrics above that carry it, and on every log line and trace. At 500 tenants, a tenant tag on every route histogram would overload Prometheus, so per-route detail per tenant comes from logs. A cell-level measure, such as a connection pool, has no tenant. XC-OBS-002 asks for the tag on every metric, so DG-XC-23 records this difference.

### Logs {#mon-logs}

Logs are structured JSON sent to Loki. Each line carries `timestamp`, `level`, `cell`, `tenant`, `module`, `traceId`, `event` and an allow-listed set of fields. A log line never holds a name, a national ID, a token, a request body or a restricted value (ADR-0015).

| Log stream | Content | Keep for (proposal) |
| --- | --- | --- |
| Application | Errors, warnings, business events by code | 90 days |
| Access | Route, status, duration, tenant | 90 days |
| Security | Sign-in, refusals, key use, operator grants | 1 year |
| Infrastructure | Kubernetes, database, broker | 30 days |

### Traces {#mon-traces}

One trace follows a request from the edge through the command, and it continues across the outbox by carrying the trace context in the event. Span attributes follow the same allow list as logs. Sampling is a proposal: all errors, and 5 percent of successful requests.

## Service indicators and objectives {#mon-slo}

All figures are proposals. Rows with a requirement id repeat the SRS, and the others are new here. The product owner must confirm them (OI-XC-01, OI-XC-02). Objectives are measured per cell and per calendar month, and they hold under the 30 September peak (XC-PER-008).

| Indicator | Measure | Objective (proposal) | Requirement |
| --- | --- | --- | --- |
| Availability | Share of each month served, leaving out announced maintenance | 99.9 percent | XC-AVL-001 |
| Read latency | 95th percentile of read API calls | 500 ms | XC-PER-001 |
| Command latency | 95th percentile of write API calls | 1 second | XC-PER-002 |
| Page change | 95th percentile until the main content shows | 2 seconds | XC-PER-003 |
| Search latency | 95th percentile for the first page | 1 second | XC-PER-004 |
| Document output | 95th percentile for a PDF of up to 20 pages | 5 seconds | XC-PER-005 |
| Event delay | 95th percentile from commit to publish | 5 seconds | XC-PER-007 |
| Index delay | From a saved change to the search index | 60 seconds | XC-SRC-007 |
| Sign-in | Share of sign-ins that finish, excluding wrong credentials | 99.9 percent | - |
| Delivery | Share of deliveries with no officer action | 99 percent | - |
| Scan delay | 95th percentile from upload to clean | 60 seconds | - |
| Audit chaining | Oldest entry with no hash | 60 seconds | - |
| Recovery | The figures in the Deployment chapter | As proposed there | XC-AVL-002, XC-AVL-003 |

An external system that is down does not count against the delivery objective, and that time is reported separately.

Each objective has an error budget for the month. When a cell has spent its budget, its next rollout waits until the cause is fixed. This rule is a proposal.

## Alerting {#mon-alerting}

Alerts leave from Prometheus. An alert needs a person to act, and each one links to a runbook. Conditions are proposals.

| Alert | Condition | Severity | First responder |
| --- | --- | --- | --- |
| Cell error rate | Error rate of a cell above 1 percent for 5 minutes (XC-OBS-005) | Critical | On-call operator |
| Availability burn | Error budget spending at 14 times the allowed rate over 1 hour | Critical | On-call operator |
| Cell down | Probe fails from 2 locations for 2 minutes | Critical | On-call operator |
| Cross-tenant attempt | A row-level security write refusal, or an unset tenant binding in production | Critical | Security on-call |
| Audit chain break | Any verification failure | Critical | Security on-call, tenant's auditor |
| Key use out of rule | A sealing key used before the reply date, or a failed unwrap spike | Critical | Security on-call |
| Outbox backlog | `outbox_oldest_age` above 5 minutes | High | On-call operator |
| Delivery stuck | `delivery_oldest_failed_age` above 1 hour | High | On-call operator; the tenant's officer sees a task |
| Database pressure | Pool above 80 percent, or lag on a standby above 30 seconds | High | On-call operator |
| Ledger contention | `db_lock_wait` 95th percentile above 1 second | High | On-call operator |
| Backup failed | No successful base backup in 26 hours | High | On-call operator |
| Certificate expiry | Below 21 days | Medium | Operator |
| Job missed | `job_last_success` older than twice its schedule | Medium | Operator |
| Scanner signature age | ClamAV database older than 2 days | Medium | Operator |
| Personal data suspected | The Collector dropped a forbidden attribute | Medium | Developer on duty |

A suspected personal-data breach starts the breach workflow and its 72-hour clock (ADR-0014). The hours of the on-call rota are open (DG-XC-19).

## Per-tenant and per-cell views {#mon-views}

| View | Audience | Shows |
| --- | --- | --- |
| Fleet | Operators | All cells, release per cell, objectives, open alerts |
| Cell | Operators | Traffic, errors, latency, database, broker, outbox, capacity against the peak |
| Tenant | Operators, under the operator-access rule | Request volume, errors, deliveries, storage. It holds no business data |
| Peak readiness | Operators, product owner | Load against the tested capacity per cell, in the run-up to 30 September |
| Integrations | Operators | Status of each adapter and failed deliveries |
| Security | Security reviewer | Refusals, key use, operator grants, chain status |
| Agency status | Agency administrators, inside Fisko | Service state, delivery status, scheduled maintenance, for that tenant only |

Tenant telemetry is itself tenant-related, so an operator's tenant view shows counts and states only. The agency status view reads a small API in `platform`, and an agency never reaches Grafana.

## Open issues {#mon-open}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-XC-18 | Which store holds traces? | Trace ids in logs; store open | Technical lead |
| DG-XC-19 | Which objectives are promised, and what are the hours of the on-call rota? Carried from OI-XC-01 and OI-XC-02 | The proposed tables | Product owner |
| DG-XC-23 | XC-OBS-002 puts cell and tenant on every metric. May route-level metrics leave out the tenant to protect Prometheus? | Tenant on the listed metrics, every log line and every trace | Owner of the SRS requirement, technical lead |
