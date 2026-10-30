# ADR-0005: PostgreSQL, row-level security and cells

Status: Accepted
Date: 2026-10-30

## Context

About 500 agencies are expected within 2 to 3 years. One database per agency would be too much to operate, while one shared database would make any failure or upgrade affect everyone. All agencies also peak together at fiscal year end on 30 September.

## Decision

- Use **PostgreSQL**, at a supported major version chosen at build start.
- Every tenant-owned row carries `tenant_id`, enforced by **row-level security** so that the database itself blocks cross-tenant reads.
- Group tenants into **cells**. Each cell has its own database cluster and application instances. Start at about 50 to 100 small agencies per cell, and adjust from load tests.
- A large agency gets a cell of its own. Isolation is a setting, and moving a tenant between cells is a supported operation.
- A global routing service maps each tenant to its cell.
- Schema changes follow expand and contract, so that old and new application versions work during a rolling upgrade.
- Per-tenant export and restore is built from the start.

## Consequences

- A failure affects one cell, and upgrades roll out cell by cell.
- Restoring one agency does not need a whole-database rollback.
- Tenant onboarding must be fully automated, with no code changes.
- Row-level security must be tested on every table, in CI.
- Capacity is planned against the 30 September peak, not a normal day.

## Alternatives considered

- **Database per tenant:** strong isolation, but heavy at 500 tenants. Still available as a dedicated cell.
- **Schema per tenant:** migrations and connection handling get harder at this scale.
- **One shared database:** the failure and upgrade risk is too high.
