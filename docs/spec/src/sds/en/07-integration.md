# Integration {#integration}

> [!NOTE] Most external contracts are unknown. This chapter designs the part Fisko controls: ports, adapters, retries and status. Port names and the status table are proposals. No adapter may assume a format until its owner has confirmed it.

## Principles {#int-principles}

- Business logic sees a port. An adapter implements it, and a contract change touches the adapter only.
- GFMIS and e-GP integrations run as separate adapters on the outbox path, retry safely, and show their state to users (ADR-0008).
- No command waits on an external system. A failure leaves work waiting, with its state visible.
- Each external system has a clearly labelled test adapter, and it ships only in test profiles (PRC-NFR-006).
- Credentials are per tenant where the external system allows it, and they live in the secret store.
- Egress goes only to the listed destinations of each adapter.

## The outbound path {#int-outbound}

{{fig:int-outbox | From the outbox to an external system}}

Each outbound item has a row in `delivery` in the schema of the module that owns the adapter. A consumer records each `eventId` it has handled in an `inbox_event` table, in the same transaction as its work, so that a duplicate does nothing.

| Column | Meaning |
| --- | --- |
| `delivery_id` | Also the idempotency key sent to the external system, where it accepts one |
| `event_id` | The source event |
| `adapter`, `target_type`, `target_id` | What is being sent, and for which record |
| `state` | See the states below |
| `attempts`, `next_attempt_at` | Retry position |
| `external_ref` | The reference the external system returned |
| `error_code`, `error_text` | The last failure, with no personal data |
| `cancelled_by_ref`, `cancel_reason` | Set when an officer cancels |

The design keeps a sent payload as a file reference where the record needs evidence of what left the system. Retention of those files follows the retention schedule.

## Retries and status {#int-status}

{{fig:int-state | States of one outbound delivery}}

| State | Meaning | Shown to users as |
| --- | --- | --- |
| `pending` | Waiting for the adapter | Waiting to send |
| `sending` | A call is in progress | Sending |
| `retrying` | A temporary failure, with a next attempt time | Retrying at the shown time |
| `delivered` | The receiver accepted it | Sent, with the external reference |
| `failed` | Rejected, or attempts used up | Failed, with the reason and a task for an officer |
| `cancelled` | An officer stopped it with a reason | Cancelled |

Rules:

- Backoff is a proposal: 1 minute, 5 minutes, 30 minutes, 2 hours, 6 hours, with jitter, then `failed`. Each adapter can set its own policy.
- Timeouts, 5xx responses and 429 responses are temporary. A validation rejection is final, and it goes straight to `failed`.
- A timeout does not prove that the call failed. If the receiver has no idempotency key, the adapter first asks for the item's status when such a query exists. If neither exists, the delivery goes to `failed` for an officer to check, and it is not sent twice.
- A resend by an officer runs the same delivery again with the same key, and writes an audit entry.
- A circuit breaker stops calls during an outage. Items wait as `retrying`, and an outage does not use up their attempts.
- A message that a consumer cannot process moves to a dead-letter queue, with an alert.
- A daily job compares delivered items with the receiver's records, where such a source exists.

## Adapter catalogue {#int-catalogue}

| External system | Owner module | Port | Direction | First implementation | Contract status |
| --- | --- | --- | --- | --- | --- |
| GFMIS | `finance` | `GfmisGateway` | Outbound and inbound | Open | Unknown |
| e-GP status | `procurement` | `EgpStatusSource` | Inbound | `EgpFileAdapter`: a file uploaded by an officer | Unknown |
| e-GP data pack | `procurement` | `EgpPackBuilder` | Outbound by hand | Text in Thai for keying | Fisko's own format |
| ThaID | `platform`, through Keycloak | Identity broker | Sign-in | OIDC broker in Keycloak | Unconfirmed |
| Agency directories | `platform`, through Keycloak | Identity broker | Sign-in | OIDC, SAML or LDAP federation | Per agency |
| E-mail | `platform` | `Notifier` | Outbound | SMTP | Standard |
| SMS, LINE | `platform` | `MessageChannel`, behind `Notifier` | Outbound | None until OI-PLT-14 is decided | Open (OI-PLT-14, DG-XC-22) |
| Agency PM system | `projects` | `ProjectSystemGateway` (proposal) | Outbound; inbound through `POST /pm/messages` | The Fisko standard over REST | No contract (OI-PRJ-03); interface id open (OI-PRJ-10) |
| AI provider | `platform` | `AiGateway` | Outbound | Open, per agency | Provider to choose |
| Certificate and timestamp services | `platform` | `DocumentService` | Outbound | Open | ADR-0011 open |

The Procurement chapter lists its other ports: `EntityStatusSource`, `AppealForwarding` and `OcdsExporter`. Each module chapter lists the adapters it owns, with its requirements.

## GFMIS {#int-gfmis}

GFMIS lives in `finance`. Procurement sees only the purchase order fact through `FinanceFacts`, and it never calls GFMIS (PRC-IR-009). The [Finance chapter](#fin) holds the entries, their mapping and reconciliation.

- `GfmisGateway` takes a finance entry and returns a reference or a rejection. It says nothing about the transport.
- Entries leave only from the outbox, after approval. A voucher shows the delivery state.
- An entry rejected by GFMIS never changes the approved record by itself. It raises a task for a finance officer.

> [!OPEN] How GFMIS connects is unknown. The Comptroller General's Department must supply: the transport (file, API or a service through a terminal), the record layouts, how an agency or a SaaS operator gets access, the identity used to submit entries, and the way replies and rejections come back (ADR-0008, DG-XC-20). If only a file route exists, `GfmisGateway` produces a file and an officer carries it, and the delivery states stay the same.

## e-GP {#int-egp}

The official procurement steps stay in e-GP (PRC-CR-001). Fisko prepares, checks, records and tracks. The External adapters section of the Procurement chapter holds the adapter design, with the file adapter first.

> [!OPEN] The e-GP contracts are unknown (OI-PRC-03). The Comptroller General's Department must confirm the export layout and fields, whether an API is open to agencies, how access is granted, the notice number format, and how contract management there will work. Until then `EgpFileAdapter` reads a tenant-neutral column mapping held as configuration.

## ThaID and agency directories {#int-identity}

Fisko applications never talk to these systems. Keycloak brokers them, so the application sees one OIDC token (ADR-0006).

- An agency links its directory to its Organization in Keycloak, by OIDC or SAML. LDAP federation covers a directory with neither.
- A directory group can suggest a Fisko role, and an agency administrator confirms the role in `platform`. Roles stay in Fisko (ADR-0006).
- A user removed from the directory can no longer sign in. A daily job marks the user inactive in `platform`, keeping their records.
- ThaID is a further identity provider, offered per organization.

> [!OPEN] ThaID onboarding for a SaaS product is unconfirmed (ADR-0006). The Department of Provincial Administration must state: whether a SaaS operator can register one client for many agencies, the protocol and attributes returned, and whether a national ID is among them. If it is, that attribute is Restricted and must not reach the token (DG-XC-21).

> [!OPEN] Keycloak Organizations must pass a load test at the 500-tenant target (ADR-0006). If it fails, the technical lead brings a new ADR, because ADR-0006 rejected one realm per agency.

## E-mail and other channels {#int-notify}

`Notifier` in `platform` is the only way out for notices. Its detail is in the [Platform chapter](#plt).

- Notices go through the delivery path above, so a user can see that a notice failed.
- E-mail uses SMTP with TLS, so any provider fits. The hosted service uses a provider that keeps data in Thailand (ADR-0014). Self-hosters set their own relay.
- The sender domain has SPF, DKIM and DMARC. Each tenant may set its own sender within its verified domain.
- Text comes from tenant templates, in the user's language.
- Messages hold the least data needed, and a link into Fisko for the rest. A text channel, if OI-PLT-14 allows one, never holds a restricted value.
- Bounces are recorded on the delivery. A user may choose channels, except for notices that the law or a security rule requires.

> [!OPEN] The product owner must choose an e-mail provider that keeps data in Thailand. Other channels are one question in OI-PLT-14 and DG-XC-22: the design documents and the code have no SMS, and the code lists LINE. No such channel is built until that question is answered.

## AI provider {#int-ai}

`AiGateway` holds one adapter per provider, and the tenant policy chooses one (ADR-0016). The Cross-cutting design chapter gives the rules.

- A tenant with AI off makes no outbound AI call. The egress rule also blocks it.
- A provider adapter gets text from which personal data was removed. It never gets a tenant key or a restricted value.
- Calls are synchronous, with a timeout. A failure shows the tool as unavailable, and it does not use the delivery path.
- Each provider's terms must state no training on tenant data and the location of processing.

> [!OPEN] Which models run wholly inside Thailand must be confirmed from the provider's current availability page (ADR-0016). The product owner must confirm, before any tenant opts in.

## Testing {#int-tests}

| Level | What runs |
| --- | --- |
| Contract | One test suite per port, run against each adapter and its stub |
| Failure | Timeouts, rejections, duplicates and outages, using a stub with faults |
| Idempotency | The same event twice leaves one delivery |
| Live check | A smoke test against each external test system, once one is offered |

## Open issues {#int-open}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-XC-20 | GFMIS transport, layouts and access | `GfmisGateway` with no format | Comptroller General's Department |
| DG-XC-21 | ThaID terms for a SaaS product | A further identity provider in Keycloak | Department of Provincial Administration |
| DG-XC-22 | The e-mail provider, and whether SMS or LINE is needed (OI-PLT-14) | `Notifier` port with SMTP first, and `MessageChannel` with no adapter | Product owner, IT unit, data protection officer |
