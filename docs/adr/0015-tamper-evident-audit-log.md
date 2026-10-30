# ADR-0015: Tamper-evident audit log

Status: Accepted
Date: 2026-10-30

## Context

Government audit needs a log that cannot be changed unnoticed. PDPA may need personal data erased. A log that holds personal data would force a choice between the two.

## Decision

- The log is append-only and hash-chained per tenant, with regular chain checkpoints stored separately.
- Log entries hold a pseudonymous subject reference, never personal details.
- Personal details sit in a separate table, encrypted under a per-subject key.
- Erasing a person means destroying that key. The chain stays intact.
- Reading restricted data is itself logged.

## Consequences

- Tampering can be detected, and erasure does not break the chain.
- Reports must resolve references to names, and show a placeholder once erased.
- Application logs must also exclude personal data, which is checked by tests.

## Alternatives considered

- **Editable audit table:** does not meet the audit need.
- **Personal data in the log:** cannot be erased without breaking the chain.
- **Blockchain:** adds cost and no benefit over a hash chain with checkpoints.
