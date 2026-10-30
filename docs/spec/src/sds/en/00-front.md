# Document control and reading guide {#front}

This document is the Software Design Specification (SDS) of Fisko. It says how the system answers the SRS, and it is the reference for developers, testers, operators and security reviewers.

## Document control {#doc-control}

| Item | Detail |
| --- | --- |
| Document code | Fisko-SDS |
| Title | Software Design Specification (SDS), Fisko |
| Version | 0.1 (draft) |
| Date | 2026-10-30 |
| Status | Draft: all chapters are written, and no person has reviewed them |
| Standards applied | IEEE 1016-2009 and ISO/IEC/IEEE 42010:2022, with arc42 and C4 habits for architecture |
| Delivery format | One bilingual HTML file, with PDF and Word output built from the same Markdown sources |
| Source location | `docs/spec/src/sds/` |
| Companion document | SRS, which holds the requirements this design answers |

> [!OPEN] Authors, reviewers and the approver are not named yet. The product owner must name them before version 1.0.

## Revision history {#revisions}

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-10-30 | Document structure, front matter, introduction and context view |
| 0.1 | 2026-10-30 | Procurement chapter as the pilot for the module chapters |
| 0.1 | 2026-10-30 | All chapters written in draft and reconciled between the SRS and the SDS. No person has reviewed them |

## Reading guide {#reading-guide}

| If you are | Start with |
| --- | --- |
| A developer | Architecture, then the chapter of your module |
| A tester | The module chapter, then the requirements in the SRS |
| An operator | Deployment, then Monitoring |
| A security reviewer | Cross-cutting design, then ADR-0013, ADR-0014 and ADR-0015 |

Every design statement is true of the design as decided, or it is marked as a proposal or an open question. No production code exists yet, so the design describes the target system, and the prototype is cited as evidence of behaviour only.
