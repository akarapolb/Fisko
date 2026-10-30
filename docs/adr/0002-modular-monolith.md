# ADR-0002: Modular monolith

Status: Accepted
Date: 2026-10-30

## Context

Fisko covers budget, procurement, finance, projects and review. These areas share rules for tenancy, roles, separation of duties and audit, and many actions cross them in one transaction: a contract creates a commitment, and a voucher draws on it. A team of 10 or more developers will build it.

## Decision

Build one deployable application, divided into modules with enforced boundaries (Spring Modulith):

- `platform`: tenancy, identity, roles, separation of duties, delegation, audit, notifications, PDPA
- `budget`, `procurement`, `finance`, `projects`, `review`

Modules call each other only through published interfaces and events. Boundary tests run in CI.

## Consequences

- One transaction can cover a cross-module action, which suits financial data.
- Operations stay simple, and self-hosting stays possible.
- A module can be split out later if load requires it.
- Boundaries depend on the CI tests, so those tests must never be switched off.

## Alternatives considered

- **Microservices:** independent scaling, but distributed transactions across finance data and far more to operate and audit.
- **Plain monolith:** quicker at first, but module boundaries erode.
