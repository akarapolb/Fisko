# Introduction {#intro}

## Purpose {#purpose}

This SRS states what Fisko must do, for whom, under which laws and to what quality. It does not say how the system is built; that is the SDS.

## Scope {#scope}

Fisko is a multi-tenant SaaS for Thai government agencies. It covers the budget cycle, procurement, finance, a project registry, and review and analytics, on one shared platform. It is released as open source under AGPL-3.0 (ADR-0001).

| Module | Code | Covers |
| --- | --- | --- |
| Platform | `PLT` | Tenancy, identity, roles, separation of duties, delegation, audit, notifications, PDPA |
| Budget | `BGT` | Budget planning, allocation and tracking |
| Procurement | `PRC` | Plans, requisitions, cases, methods, e-GP, contracts and penalties |
| Finance | `FIN` | Vouchers, payments, GFMIS, reconciliation and closing |
| Projects | `PRJ` | The project registry |
| Review and analytics | `REV` | Agendas, scorecards, analytics and optional AI assistance |

Out of scope: agency-specific customisation of code, and running the government systems Fisko connects to.

> [!OPEN] The modules follow ADR-0002. The product owner must confirm that this list is complete.

## Source of the requirements {#sources}

Fisko has no single customer contract, so requirements come from three sources instead:

| Source | Used for |
| --- | --- |
| Laws and regulations, held as rows in the clause register | What the product must do by law |
| The working prototype and its sweep tests | Behaviour already shown and tested |
| Product decisions, including the ADRs | Everything else, marked with a dash in the Clause column |

The clause register plays the part a TOR plays in a contract project. Each row is one clause and states whether the SRS or the SDS must answer it. The coverage appendix shows every clause not yet answered.

> [!LAW] Clause numbers in the register are a starting set. A procurement specialist and a PDPA lawyer must confirm them.

## Definitions and abbreviations {#definitions}

| Term | Meaning |
| --- | --- |
| Agency | A government organisation using Fisko |
| Tenant | An agency's isolated space in Fisko, with its own data, settings and keys |
| Cell | A group of tenants served by one set of application instances and one database cluster (ADR-0005) |
| SoD | Separation of duties |
| GFMIS | Government Fiscal Management Information System |
| e-GP | Electronic Government Procurement |
| PDPA | Personal Data Protection Act B.E. 2562 |
| ROPA | Records of processing activities |
| RPO | Recovery point objective: the most data, measured in time, that a failure may lose |
| RTO | Recovery time objective: the longest a service may stay down after a failure |
| KMS | Key management service, which holds master encryption keys |
| HSM | Hardware security module |
| MFA | Multi-factor authentication |
| OIDC | OpenID Connect |
| SAML | Security Assertion Markup Language |
| SIEM | Security information and event management |
| SLA | Service level agreement: the time allowed for a step or a service |
| ADR | Architecture decision record |
| KPI | Key performance indicator |
| TOR | Terms of reference |
| RFQ | Request for quotation |
| OCDS | Open Contracting Data Standard |
| SME | Small and medium-sized enterprise |
| MiT | Made in Thailand |

## References {#references}

| Reference | Title |
| --- | --- |
| ISO/IEC/IEEE 29148:2018 | Requirements engineering |
| ISO/IEC 25010:2023 | Product quality model |
| PPA | Public Procurement and Supplies Administration Act B.E. 2560 |
| PPR | Ministry of Finance Regulation on Public Procurement B.E. 2560 |
| PDPA | Personal Data Protection Act B.E. 2562 |
| BPA | Budget Procedures Act B.E. 2561 |
| BMR | Regulation on Budget Administration B.E. 2562 |
| TRR | Ministry of Finance Treasury Regulation B.E. 2562 |
| ETA | Electronic Transactions Act B.E. 2544 |
| DGA | Digital Government Administration Act B.E. 2562 |
| CSA | Cybersecurity Act B.E. 2562 |
| มสพร. 11-2566 | Government Website Standard |
| OWASP ASVS 5.0 | Application Security Verification Standard |
| WCAG 2.1 | Web Content Accessibility Guidelines |
| `docs/adr/` | Architecture decision records |

## Document overview {#overview}

| Chapter | Content |
| --- | --- |
| Overall description | Product perspective, user classes, environment, constraints |
| External interfaces | User, software and communication interfaces |
| Cross-cutting requirements | Security, privacy, performance, availability and other platform-wide rules |
| Modules overview | How the modules fit together |
| Module chapters | Actors, use cases, business rules, requirements, data, states, interfaces and open issues per module |
| Verification and validation | Test levels, acceptance criteria and status of the requirements |
| Appendices | Clause coverage and supporting material |

## Mapping to ISO/IEC/IEEE 29148 {#standard-map}

| 29148 SRS content | Where |
| --- | --- |
| Purpose, scope, product overview | Introduction, Overall description |
| Specific requirements: external interfaces | External interfaces, module interface sections |
| Specific requirements: functions | Module chapters |
| Specific requirements: usability, performance, security | Cross-cutting requirements |
| Logical database requirements | Module data sections |
| Design constraints, standards compliance | Overall description, Cross-cutting requirements |
| Verification | Verification and validation |
