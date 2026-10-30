# Cross-cutting design {#cross-cutting}

> [!NOTE] Everything in this chapter is a proposal to build, applying the accepted ADRs. Names of classes, tables and settings do not exist yet. The `platform` module owns most of these services, and their full design is in the [Platform chapter](#plt). This chapter states the rules every module follows.

## Legal and standards basis {#xc-legal}

<!-- covers: PDPA 26; PDPA 28; PDPA 37; PDPA 39; PDPA 40; ETA 9; ETA 12; ETA 26 -->

| Source | Applies to | Where answered |
| --- | --- | --- |
| PDPA 26 | Sensitive personal data needs a specific legal basis | Data dictionary fields, Privacy section |
| PDPA 28 | Transfer of personal data abroad | Data stays in Thailand; AI gateway section |
| PDPA 37 | Breach reporting to the PDPC within 72 hours | Breach workflow, Privacy section |
| PDPA 39 | Records of processing activities | ROPA export, Privacy section |
| PDPA 40 | Processor duties | Processor role, operator access, Encryption section |
| ETA 9, ETA 26 | Electronic signatures | PAdES signatures, ADR-0011, XC-DAT-009 |
| ETA 12 | Records kept electronically | Signed documents never change, XC-DAT-010, XC-DAT-011 |
| OWASP ASVS 5.0 | Level 2 throughout, Level 3 for finance and payments | ADR-0017, DevSecOps chapter |
| WCAG 2.1 AA | Every screen | ADR-0004, Accessibility section |
| PAdES with long-term validation | Signed documents | ADR-0011 |
| OpenID Connect and SAML | Sign-in | ADR-0006 |
| RFC 9457 Problem Details | API errors | Error model section |

> [!LAW] The clause numbers above are held in the clause register. A PDPA lawyer must confirm the PDPA clauses, and a legal reviewer the ETA clauses (OI-XC-05, OI-XC-10). ADR-0014 is accepted with legal review pending, including the draft PDPC guidance reported in July 2026.

> [!OPEN] The Cybersecurity Act and the Digital Government Administration Act may bear on incident duties, log keeping and data exchange. No clause of them is cited here, because none could be confirmed. The legal unit must say which clauses apply (DG-XC-04, OI-XC-08).

## Identity and sign-in {#xc-identity}

Keycloak handles sign-in over OIDC and SAML, MFA, and federation with agency directories and ThaID (ADR-0006). Tenants use Keycloak Organizations, not one realm per agency. Fisko holds no passwords for federated users.

{{fig:xc-signin | Staff sign-in}}

| Item | Design | Source |
| --- | --- | --- |
| Browser flow | OIDC authorization code with PKCE | Proposal |
| Tenant in the token | The organization claim. A user belongs to one tenant per session | ADR-0006 |
| Token storage | Tokens are held in memory only, never in browser storage. The refresh token rotates on each use | XC-SEC-014, proposal for rotation |
| Token check | The application verifies signature, expiry, audience and organization on each request | ADR-0006 |
| MFA | Required for every agency staff account, by Keycloak policy | XC-SEC-006 |
| Failed sign-ins | An account is blocked for 15 minutes after 5 failures within 15 minutes, by Keycloak (proposal) | XC-SEC-011 |
| Idle time-out | Default 30 minutes, a tenant setting within 5 to 60 minutes, with a warning 5 minutes before and a control to stay signed in. Keycloak enforces the limit, and the warning runs in the browser | XC-SEC-007 to XC-SEC-009, prototype `95b-site.js` |
| Automatic sign-out | Written to the audit log | XC-SEC-010 |
| Service accounts | OIDC client credentials per adapter and per integration | Proposal |
| Suppliers | A separate route under a supplier organization, see DG-PRC-12 | ADR-0006 |

> [!OPEN] ThaID onboarding terms for a SaaS product are not confirmed (ADR-0006). The Department of Provincial Administration must confirm them. The Integration chapter holds the adapter design.

## Authorisation {#xc-authorisation}

The server decides on every action (ADR-0006). The browser's hiding of a button is never the control.

{{fig:xc-authz | The checks on every command}}

- Authorities have the form `<module>.<area>.<verb>`, such as `prc.plan.write`. A module defines its authorities in its chapter.
- Roles map to authorities as tenant data. Roles and mappings live in `platform`, and none live in Keycloak (ADR-0006).
- `Authorizer` checks the authority and its scope, such as a unit or a committee membership. A request that no role permits gets 403 and is logged (XC-SEC-004).
- Read models never return a field that the caller may not see. Filtering in the browser is never used for this.
- Approval chains and thresholds are per-tenant data. Legal steps are code (ADR-0007).

## Separation of duties and delegation {#xc-sod}

Separation-of-duties rules and delegation live in `platform` and are checked for every action (ADR-0006).

- `SodGuard` runs inside the command, after the authority check and before any state change.
- A person acting under delegation counts as themselves and as the delegator, so a delegation can never get round a duty rule.
- A refusal is written in its own transaction, so the log survives the rollback.
- Each module lists the duty rules it uses and where they run, as the Procurement chapter does.
- Delegation has a start, an end and a scope. Using it is recorded on the action.

> [!OPEN] The SRS lets a tenant switch duty rules off, while some rules may come from law and ADR-0007 keeps legal limits out of tenant hands. DG-PRC-05 holds this question for the procurement specialist and the legal unit.

## Tenancy enforcement {#xc-tenancy}

The tenant is enforced at several layers, so that one mistake does not expose another tenant's data (ADR-0005, ADR-0013).

{{fig:xc-tenancy | Layers of tenant enforcement}}

| Layer | Rule |
| --- | --- |
| Token | The tenant comes from the verified token, never from the path, the body or a header |
| `TenantContext` | Set once per request or job, and cleared at the end. Code cannot change it within a request |
| Transaction | Every read and write runs in a transaction that starts with `SET LOCAL app.tenant_id`, issued as `set_config` so that the value can be bound as a parameter |
| Row-level security | Enabled and forced on every tenant-owned table. An unset value raises an error, so the failure is closed |
| Database roles | `fisko_app` has no `BYPASSRLS` and owns no tables. Migrations use a separate owner role. The relay role sees the outbox tables only |
| Keys | One tenant's key cannot open another's data, even in a shared cell |
| Search | Every query is filtered by tenant on the server (ADR-0009) |
| Files | Object keys start with the tenant id, and every download passes an authority check |
| Jobs | A job works tenant by tenant, with the tenant bound as for a web request |
| Events and telemetry | Tagged with the tenant, with no personal data |

Because `SET LOCAL` lasts for one transaction, the binding is safe with a transaction-mode connection pool. A record of another tenant answers 404, so that the existence of a record does not leak.

`TenantIsolationIT` is generated from the schema, and it proves for each table that a read and a write across tenants are refused (ADR-0005). A new table with no policy fails the build.

## Encryption and key management {#xc-encryption}

Data is classified, and the class sets the protection (ADR-0013).

| Class | Examples | Protection |
| --- | --- | --- |
| Restricted | National ID, passport, bank account, PDPA sensitive data | Field encryption, masking, logged reveal |
| Confidential | Names, contact details, unopened bids, evaluations | Encrypted storage, role-based access |
| Internal | Budgets, plans, settings | Encrypted storage |
| Public | Published procurement results | Integrity protection |

{{fig:xc-encryption | Key hierarchy}}

| Layer | Design | Source |
| --- | --- | --- |
| In transit | TLS 1.3 from the browser, mutual TLS between services | ADR-0013 |
| At rest | Databases, backups, object storage and search indexes are encrypted using KMS keys | ADR-0013 |
| Field level | `FieldCrypto` in `platform`: AES-256-GCM through Tink, envelope encryption, per-tenant keys | ADR-0013 |
| Associated data | Each ciphertext binds tenant id, table and column, so a value copied to another row fails to decrypt | Proposal |
| Blind index | A keyed hash with its own key, for exact match only | ADR-0013 |
| Wrapped keys | Tenant keysets are stored wrapped in the `platform` schema, and unwrapped in memory only | Proposal |
| Rotation | Automatic. A new primary key encrypts new data, and old versions remain for reading. Proposed period: 12 months | ADR-0013, proposal |
| Key use log | Every key use is logged with time, tenant, key id and purpose. KMS or OpenBao logs master key use, and `FieldCrypto` logs data key use, one record per request and purpose (proposal) | XC-SEC-023 |
| Bring your own key | The agency's key wraps its tenant keysets. If the agency revokes it, restricted fields become unreadable, and screens show that state | ADR-0013 |
| Self-hosting | OpenBao replaces KMS through the same port | ADR-0013 |

Rules for each restricted field:

- A field joins the Restricted class in the data dictionary, with its reason. Encrypted fields cannot be sorted or searched by range, so each is chosen with care (ADR-0013).
- Screens, reports and exports show a masked value. A reveal needs a role that the data dictionary permits and a reason, and it writes an audit entry (XC-SEC-026, XC-SEC-027, XC-SEC-041).
- A restricted value never enters logs, events, search or AI calls.

**Sealed offers.** Sealed replies follow the Sealed bids section of the Procurement chapter, with one sealing key per RFQ. DG-PRC-06 holds the open question on operators.

**Operator access.** Fisko staff cannot read tenant data without a recorded, approved reason (ADR-0013). Access is a time-limited grant, approved by a second person. The tenant can see each grant in its audit view. The grant period is a proposal: 4 hours at most.

> [!WARN] Losing a key loses the data (ADR-0013). Key backup and recovery are rehearsed at least every 12 months (XC-SEC-031), as the Deployment chapter sets out.

## Privacy by design and PDPA features {#xc-privacy}

<!-- covers: PDPA 26; PDPA 37; PDPA 39; PDPA 40 -->

Data protection is built into `platform`, so that every module inherits it (ADR-0014). The agency is the data controller. When Fisko is hosted, the operator is the processor under a data processing agreement. For a self-hosting agency, the operator is only the software supplier.

| Feature | Design | Source |
| --- | --- | --- |
| Data dictionary | Each personal-data field records class, purpose, legal basis and retention period. A CI check fails on a personal field with no entry | ADR-0014, proposal for the check |
| Minimisation | A field is not collected without a stated purpose | ADR-0014 |
| Legal basis | Recorded per data type. A notice is shown, and consent is asked for only where consent is the right basis | ADR-0014 |
| Breach workflow | A clock against the 72-hour limit for telling the PDPC, a 15-day outer limit for late notice, a step for telling affected people when risk is high, and 72-hour reporting from processor to controller | ADR-0014, PDPA 37 |
| Privacy notice | Shown on the sign-in page, with the contact of the tenant data protection officer | XC-PRV-001, XC-PRV-017 |
| Data subject requests | A queue for access, copy, correction, deletion, restriction and objection, with due dates and evidence. An access request is due in 30 days. OI-XC-06 holds the list for confirmation | XC-PRV-010, XC-PRV-011 |
| Records of processing | A ROPA export per tenant, for controllers and processors | ADR-0014, PDPA 39 |
| Retention | A schedule per record type, with automatic deletion or anonymising, run as a daily job | ADR-0014 |
| Records kept by law | Each record type states its rule, and the requester sees the reason a record cannot be deleted | ADR-0014 |
| Cross-border | Data, backups, logs and support tools stay in Thailand | ADR-0014, PDPA 28 |

> [!OPEN] Retention periods per record type do not exist. The product owner must set them with the relevant records rules (ADR-0014, DG-XC-05).

## Audit log {#xc-audit}

The log is append-only and hash-chained per tenant, with regular checkpoints stored separately (ADR-0015). Entries hold a pseudonymous subject reference, never personal details.

{{fig:xc-audit | Hash-chained audit log and erasure}}

| Item | Design | Source |
| --- | --- | --- |
| Entry | `tenant_id`, `seq`, `at`, `subject_ref`, `role`, `action`, `item_type`, `item_id`, `outcome`, `prev_hash`, `hash` | XC-SEC-032, XC-SEC-037, proposal for the columns |
| Writing | `CommandAudit` writes the entry in the transaction of the command. A refusal uses its own transaction | Procurement chapter |
| Chaining | A chainer per tenant assigns `seq`, `prev_hash` and `hash` in commit order, just after commit. Commands therefore never queue on one tenant's chain at the peak | Proposal |
| Hash | SHA-256 over the entry fields and the previous hash | Proposal |
| Checkpoints | The chain head of each tenant, written to write-once object storage at least every 24 hours | XC-SEC-035, proposal |
| Verification | A daily job walks the chain against the checkpoints. A changed, removed or reordered entry raises an alert to the auditor | XC-SEC-036 |
| Append-only | `fisko_app` has insert and select rights on the table, and no update or delete | Proposal |
| Reading restricted data | Each reveal writes an entry | ADR-0015 |
| Reasons and notes | Stay in the business record. The entry points to it | Procurement chapter |
| Application logs | Exclude personal data, checked by tests | ADR-0015 |

**Erasure.** Personal details sit in a separate subject table, encrypted under a per-subject key. Erasing a person means destroying that key, and the chain stays intact. Reports show a placeholder afterwards (ADR-0015).

> [!WARN] A destroyed key still exists in older backups. Each erasure is therefore also recorded in an erasure list held outside the cell's database, and every restore replays that list before the tenant reopens. This list is a proposal, and it holds subject references only.

## Error model {#xc-errors}

Errors are RFC 9457 Problem Details. Each carries a stable `code`, and a refused step also carries the first unmet check. Text is in the user's language.

| HTTP | Use | Code pattern |
| --- | --- | --- |
| 400 | Field validation, missing reason | `<MOD>_INVALID_INPUT`, `<MOD>_REASON_REQUIRED` |
| 401 | Token missing, invalid or expired | No module code |
| 403 | No authority, duty rule refused, feature off | `<MOD>_FORBIDDEN`, `<MOD>_SOD_BLOCKED`, `<MOD>_FEATURE_OFF` |
| 404 | No such record, or a record of another tenant | `<MOD>_NOT_FOUND` |
| 409 | Stale version, wrong state, unmet check | `<MOD>_VERSION_CONFLICT`, `<MOD>_STATE_CONFLICT` |
| 422 | Setting out of range, unreadable import | `<MOD>_SETTING_OUT_OF_RANGE`, `<MOD>_IMPORT_INVALID` |
| 429 | Rate limit | No module code |
| 500 | Unexpected fault. The body holds only `traceId` | No module code |
| 503 | Tenant in maintenance, or a dependency unavailable, with `Retry-After` | No module code |

```json
{
  "type": "https://fisko.example/problems/step-check-failed",
  "title": "A check of this step is unmet",
  "status": 409,
  "code": "PRC_STEP_CHECK_FAILED",
  "firstUnmetCheck": "reference-price",
  "traceId": "4bf92f3577b34da6"
}
```

Each module lists its codes in its chapter. Exception text and stack traces never reach the client. The example `type` host is a placeholder, and the final host is set at build start.

## API conventions {#xc-api}

| Topic | Rule | Source |
| --- | --- | --- |
| Description | REST in OpenAPI 3.1, events in AsyncAPI | ADR-0003, ADR-0008 |
| Paths | `/api/v1/<module>/...`. A breaking change adds a new major version, and the replaced version keeps working for 12 months (proposal) | XC-API-007 |
| Tenant | From the token, never from the path | Procurement chapter |
| Concurrency | State-changing calls carry `If-Match` with the aggregate version | Procurement chapter |
| Retries | Creating calls accept an `Idempotency-Key`. The same key returns the first result | Proposal |
| Lists | Cursor paging, with at most 200 rows a page (proposal) | XC-API-009 |
| Rate limit | 600 requests a minute per client (proposal), then 429 | XC-API-008 |
| Input | Each request is validated against its OpenAPI schema | XC-SEC-013 |
| Browser policy | A Content-Security-Policy allows scripts, styles and fonts only from the Fisko origin | XC-SEC-012 |
| Money | Decimal strings in JSON, `BigDecimal` in code | ADR-0003 |
| Dates | ISO 8601 in Common Era. Screens show Buddhist-era years in Thai | XC-ACC-016 |
| Field visibility | A response never includes a field the caller may not see | Procurement chapter |
| Compatibility check | CI compares the OpenAPI file with the last release and fails on a breaking change | Proposal |

## Internationalisation and accessibility {#xc-i18n}

- Thai and English pass through one translation layer, and Thai is the default (ADR-0004).
- A user's language lives in the profile and is sent as `Accept-Language`. Fisko opens in Thai unless the user has chosen English (XC-ACC-012).
- Dates and times are shown and counted in Asia/Bangkok, and the fiscal year runs from 1 October to 30 September (XC-ACC-017, XC-ACC-018).
- Business data has one language, and master data may hold both a Thai and an English name.
- Thai sorting uses a Thai collation in PostgreSQL, and Thai search uses the tokenizer of ADR-0009.
- Letters, forms and PDF output are Thai templates in TH Sarabun New, embedded (ADR-0011).
- WCAG 2.1 AA is a release requirement (ADR-0004). Playwright runs an accessibility scan on each page in both languages, and a failure blocks the release. Each release also passes a manual screen reader check in Thai (XC-TST-010).

## Configuration and secrets {#xc-config}

| Kind | Examples | Where it lives | Who changes it |
| --- | --- | --- | --- |
| Legal limits | Penalty ranges, legal steps | Code, dated rule sets | A release (ADR-0007) |
| Release settings | Feature defaults | Image | A release |
| Cell settings | Sizes, pool limits | Helm values under Argo CD | Operator, reviewed in Git |
| Tenant settings | Approval chains, thresholds, profile switches | Module tables, with an effective date and a range check | Tenant administrator |
| Secrets | Database passwords, adapter credentials | Cloud secret store or OpenBao | Operator, never in Git |

A tenant setting moves only within its allowed range, and the server refuses a value outside it (ADR-0007). Each setting change writes an audit entry. No key or secret is stored in the code repository (ADR-0013). The DevSecOps chapter covers secret handling.

## Resilience {#xc-resilience}

Each call out of the application has a timeout. Retries apply only to idempotent calls, with backoff and jitter. A circuit breaker wraps each external adapter. The table shows how each failure appears.

| Failure | Effect | What users see |
| --- | --- | --- |
| One zone or instance | Traffic moves to the others | Nothing, or a brief retry |
| RabbitMQ | Events wait in the outbox | Commands work; later steps show as waiting |
| OpenSearch | Search is unavailable, and the source of truth is untouched | Search shows a notice; lookup by exact number still works from PostgreSQL |
| S3 storage or ClamAV | Upload waits or is refused; files stay quarantined | The file shows as pending |
| KMS | Cached keys work for a short time, then restricted fields become unavailable | Masked values with a notice; other work continues |
| Keycloak | New sign-ins fail; valid tokens work until they expire | A sign-in notice |
| GFMIS, e-GP, e-mail, or SMS if OI-PLT-14 allows it | Deliveries wait and retry | The delivery status |
| AI provider | AI tools stop, and every feature still works (ADR-0016) | The tool shows as unavailable |
| PostgreSQL primary in one cell | Failover to a standby; that cell alone is affected | A short error, then normal |

## Caching {#xc-caching}

The ADRs name no shared cache product, so caches are in-process, and nothing sensitive is stored in them. TTL values are proposals.

| What | Where | TTL | Invalidation |
| --- | --- | --- | --- |
| Tenant-to-cell map | Router memory | 60 seconds | Pushed by the control plane on a move |
| Keycloak signing keys | Application memory | 10 minutes | Refreshed on an unknown key id |
| Tenant settings and legal rule sets | Application memory | 5 minutes | `settings.changed` event |
| Unwrapped tenant keysets | Application memory | 5 minutes | Rotation, or on instance stop |
| Translations, design tokens, static files | Browser and edge | By file hash | New release |
| Server data | TanStack Query in the browser | Short, per query | Cleared at sign-out |

Authority and duty checks always read the current data in the transaction, and they are never cached. A cache key always starts with the tenant id.

## File handling and scanning {#xc-files}

Fisko uses only the S3 API, through `FileStore` in `platform` (ADR-0010). Every upload is scanned before it can be downloaded.

{{fig:xc-upload | States of an uploaded file}}

- The upload passes through the application, which checks the size, the type by content, and the authority, then encrypts the stream under a tenant key with Tink. This works the same on every S3 product. Presigned upload URLs are not used.
- The object goes to a quarantine prefix. An outbox event starts the scan, and ClamAV receives the decrypted stream over a private link. Plain text is never stored.
- A clean file moves to the final prefix. An infected file is refused, the uploader is told, and an audit entry is written.
- A download passes the authority check, then streams from the application with `Content-Disposition: attachment`.
- Signed documents are never changed, and a correction creates a new version (ADR-0011).

Compatibility tests run for each documented storage product (ADR-0010). Allowed file types and the size limit are settings with a range. The product owner must set those limits (DG-XC-06).

## AI gateway {#xc-ai}

All AI calls go through one model gateway in `platform` (ADR-0016). No module calls a provider directly, and an architecture rule checks this.

{{fig:xc-ai | The path of an AI request}}

- AI is off by default, and each agency opts in per tool.
- Each agency chooses a provider, including a model hosted in Thailand.
- The gateway removes personal data before sending, applies the tenant policy and logs each call.
- Restricted data is never sent, and neither are sealed replies or unawarded bid prices.
- AI output is advice. A person makes every decision, and that is recorded.
- Module tools are a closed list per agent, and a step that writes stops for a person, as the Procurement chapter shows.

> [!OPEN] Whether a suitable model can run wholly inside Thailand is not confirmed (ADR-0016). Until it is, an agency that enables a provider outside Thailand raises the transfer question of PDPA 28. The opt-in screen must show where the provider processes prompts (XC-AI-009). The data protection officer and the product owner must decide what else it requires (DG-XC-07).

## Traceability to the SRS {#xc-trace}

This table maps the cross-cutting requirements to the shared design chapters.

| Requirements | Answered in |
| --- | --- |
| XC-SEC-005 to XC-SEC-011 | Identity and sign-in |
| XC-SEC-001 to XC-SEC-004 | Authorisation, DevSecOps chapter |
| XC-SEC-012 to XC-SEC-014 | API conventions, Architecture chapter (front end) |
| XC-SEC-015 | Deployment chapter (environments) |
| XC-SEC-016 to XC-SEC-031 | Encryption and key management |
| XC-SEC-032 to XC-SEC-042 | Audit log |
| XC-PRV-001 to XC-PRV-018 | Privacy by design and PDPA features |
| XC-PER-001 to XC-PER-008 | Architecture chapter, Monitoring chapter |
| XC-AVL-001 to XC-AVL-010 | Deployment chapter, Monitoring chapter |
| XC-SCL-001 to XC-SCL-009 | Architecture chapter, Deployment chapter |
| XC-USA-001 to XC-USA-010 | Architecture chapter (front end), module chapters |
| XC-ACC-001 to XC-ACC-018 | Internationalisation and accessibility |
| XC-DAT-001 to XC-DAT-015 | Architecture chapter, File handling and scanning, Configuration and secrets |
| XC-API-001 to XC-API-009 | API conventions, Error model, Module design overview chapter |
| XC-SRC-001 to XC-SRC-008 | Tenancy enforcement, Architecture chapter |
| XC-OBS-001 to XC-OBS-005 | Monitoring chapter |
| XC-DSO-001 to XC-DSO-006 | DevSecOps chapter |
| XC-DEP-001 to XC-DEP-008 | Deployment chapter |
| XC-LIC-001 to XC-LIC-008 | DevSecOps chapter |
| XC-AI-001 to XC-AI-011 | AI gateway, Integration chapter |
| XC-TST-001 to XC-TST-010 | DevSecOps chapter, Module design overview chapter |

## Open issues {#xc-open}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-XC-04 | Which clauses of the Cybersecurity and Digital Government Acts apply? Carried from OI-XC-08 | None cited | Legal unit |
| DG-XC-05 | Retention periods per record type. Carried from OI-XC-07 | A schedule with retention keys and no periods | Product owner, data protection officer |
| DG-XC-06 | Allowed file types and size limit | Settings with a range, values open | Product owner |
| DG-XC-07 | Conditions for opting in to an AI provider outside Thailand | Off by default, per-tenant policy | Data protection officer, product owner |
| DG-XC-08 | Which roles may reveal each restricted field? | A separate authority per field, with a reason and a logged reveal | Data protection officer |
| DG-XC-09 | Will auditors accept a placeholder for an erased name, and which record types can never be erased? | Placeholder, with a rule per record type | Auditor, legal unit |
| DG-XC-10 | Certificate authority, timestamp service and redistribution of the font. Carried from OI-XC-10 and OI-XC-12 | Open as in ADR-0011 | Product owner, with ETDA guidance |
