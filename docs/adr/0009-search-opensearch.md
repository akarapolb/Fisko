# ADR-0009: Search on OpenSearch

Status: Accepted
Date: 2026-10-30

## Context

Users search Thai text across cases, suppliers and documents. Thai has no spaces between words, so ordinary tokenizing fails.

## Decision

- Use **OpenSearch** with a Thai tokenizer behind a search interface.
- Restricted data (ADR-0013) is never indexed.
- Every query is filtered by tenant on the server.

## Consequences

- PostgreSQL stays the source of truth, and the index can be rebuilt.
- The small setup can use PostgreSQL search instead, with weaker Thai results.

## Alternatives considered

- **PostgreSQL search only:** simple, but weaker for Thai.
- **Elasticsearch:** similar, but OpenSearch has the clearer open-source licence.
