# Introduction {#introduction}

## Purpose {#purpose}

This SDS describes the structure, data, interfaces and behaviour of Fisko in enough detail to build, test and operate it.

## Scope {#scope}

The design covers the shared platform and the five business modules listed in the SRS, for the hosted service and for agencies that host Fisko themselves.

## Design principles {#principles}

| Principle | What it means here |
| --- | --- |
| Generic product | No agency appears in code or design; differences are tenant settings |
| Law in code, choices in data | Legal limits are coded, and tenants choose only within them (ADR-0007) |
| Isolation by default | Every tenant's data is separated by the database and by its own keys (ADR-0005, ADR-0013) |
| Portable | Open interfaces only, so that Fisko runs on any supported cloud or data centre (ADR-0012) |
| Works without AI | AI is off by default, and every feature works without it (ADR-0016) |

## Document map {#document-map}

| Chapter | Content | IEEE 1016 viewpoint |
| --- | --- | --- |
| Architecture | Context, containers, technology, cells | Context, composition |
| Cross-cutting design | Identity, authorisation, privacy, audit, errors | Logical, algorithm |
| Deployment | Environments, backup, recovery | Deployment |
| DevSecOps | Pipeline, quality gates, licences | Resource |
| Monitoring | Telemetry and service levels | Resource |
| Integration | GFMIS, e-GP, ThaID | Interface |
| Module chapters | Components, domain model, states, sequences, data, interfaces | Composition, information, state dynamics, interaction |
| Data dictionary | Tables and columns | Information |

## Decisions {#decisions}

The ADRs in `docs/adr/` are the record of each decision and the alternatives rejected. This document applies them and does not repeat the reasoning. The facts those decisions still rest on are listed in the ADR index.

> [!WARN] The hosting design depends on whether agencies may buy a service on a commercial cloud (ADR-0012). That is not confirmed yet.
