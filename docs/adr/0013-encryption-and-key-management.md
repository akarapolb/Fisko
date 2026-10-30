# ADR-0013: Encryption and key management

Status: Accepted
Date: 2026-10-30

## Context

Fisko holds national IDs, bank accounts, sealed bids and sensitive personal data for many agencies, often in one shared database. Disk encryption alone does not protect against an over-privileged administrator or a leaked query result.

## Decision

Data is classified, and the class sets the protection:

| Class | Examples | Protection |
|---|---|---|
| Restricted | National ID, passport, bank account, PDPA sensitive data | Field encryption, masking, logged reveal |
| Confidential | Names, contact details, unopened bids, evaluations | Encrypted storage, role-based access |
| Internal | Budgets, plans, settings | Encrypted storage |
| Public | Published procurement results | Integrity protection |

- **In transit:** TLS 1.3 from the browser, and mutual TLS between services.
- **At rest:** databases, backups, object storage and search indexes are encrypted using KMS keys.
- **Field level:** AES-256-GCM in the application with **Google Tink**, using envelope encryption.
- **Keys:** each tenant has its own data keys, wrapped by a master key in KMS or an HSM. Self-hosters use OpenBao. Keys rotate automatically, and every use is logged.
- **Bring your own key:** available to large agencies.
- **Search:** restricted fields use a keyed blind index for exact matches, with its own key.
- **Sealed bids:** encrypted until the opening time, so that no one can read them early, including operators.
- **Operator access:** Fisko staff cannot read tenant data without a recorded, approved reason.
- No key or secret is stored in the code repository.

## Consequences

- A stolen database or backup does not expose restricted data.
- One tenant's key cannot open another's data, even in a shared cell.
- Destroying a key erases what it protects (ADR-0015).
- Encrypted fields cannot be sorted or searched by range, so each must be chosen with care.
- Losing a key loses the data, so key backup and recovery need rehearsal.

## Alternatives considered

- **Disk and database encryption only:** does not protect against administrators or leaked query results.
- **Database column encryption (pgcrypto):** keys reach the database server.
- **One key for all tenants:** no isolation, and no per-tenant erasure.
