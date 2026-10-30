# ADR-0008: Transactional outbox and RabbitMQ

Status: Accepted
Date: 2026-10-30

## Context

Modules and external systems must learn of events such as an approved voucher. An event must not be lost, and must not be sent for a transaction that rolled back.

## Decision

- Events are written to an outbox table in the same transaction as the business change.
- A relay publishes them to **RabbitMQ**.
- Consumers are idempotent.
- GFMIS and e-GP integrations run as separate adapters on this path, retry safely, and show their state to users.
- AsyncAPI describes the events.

## Consequences

- Delivery is reliable, at least once.
- The small setup can process the outbox without RabbitMQ.

## Alternatives considered

- **Kafka:** more than this needs now. It can be added later for analytics.

## Open items

- The Comptroller General's Department must confirm how GFMIS and e-GP integration works.
