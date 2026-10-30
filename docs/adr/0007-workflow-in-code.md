# ADR-0007: Legal workflow in code, approval chains as data

Status: Accepted
Date: 2026-10-30

## Context

The steps of procurement and finance come from law and regulation, so they change rarely and must not be editable per agency. Who approves at each step differs by agency and by amount.

## Decision

- Legal state machines for cases, contracts and vouchers are written and tested in code.
- Approval chains, thresholds and allowed ranges are per-tenant data.
- Legal limits sit in code, and tenant settings can only move within them. Penalty rates are the example.
- Each business rule cites the clause it comes from, and the SRS traces to it.

## Consequences

- Tenants cannot configure an unlawful process.
- A change in the law is a software release, and it needs dated rule versions so that old cases keep their old rules.

## Alternatives considered

- **BPMN engine (Flowable or Camunda):** useful for frequently changing processes, which these are not. It adds another system to run, and current Camunda versions need a commercial licence for production.
