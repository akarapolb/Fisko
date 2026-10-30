# ADR-0003: Back end on Java and Spring Boot

Status: Accepted
Date: 2026-10-30

## Context

The team of 10 or more developers knows Java and Kotlin best. The system has heavy finance rules, needs PDF signing, and must be maintained for many years.

## Decision

Use **Java 25** (the current LTS) and **Spring Boot 4.1**, with Kotlin allowed where the team prefers it. Money uses `BigDecimal` only. REST APIs are described in OpenAPI 3.1.

## Consequences

- The team starts with skills it already has.
- Spring Security, Spring Modulith and EU DSS (ADR-0011) fit directly.
- Spring Boot's free support windows are short, so the project must upgrade regularly or buy extended support for long-term versions.

## Alternatives considered

- **.NET:** also strong, but the team does not know it, and it has fewer open-source PDF signing options.
- **NestJS on Node:** would match the prototype's language, but is weaker for finance logic and long-term audit expectations.

## Open items

- Secondary sources put Spring Boot 4.1 free support at July 2027. Confirm on spring.io.
