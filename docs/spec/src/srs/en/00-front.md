# Document control and how to read {#front}

This document is the Software Requirements Specification (SRS) of Fisko. Product owners, agency reviewers, developers and testers work from it, and each requirement can be traced to a law, a design section and a test.

## Document control {#doc-control}

| Item | Detail |
| --- | --- |
| Document code | Fisko-SRS |
| Title | Software Requirements Specification (SRS), Fisko |
| Version | 0.1 (draft) |
| Date | 2026-10-30 |
| Status | Draft: all chapters are written, and no person has reviewed them |
| Standards applied | ISO/IEC/IEEE 29148:2018 for structure, ISO/IEC 25010:2023 for quality requirements |
| Delivery format | One bilingual HTML file, with PDF and Word output built from the same Markdown sources |
| Source location | `docs/spec/src/srs/` |
| Companion document | SDS (Software Design Specification), which answers the clauses marked SDS |

> [!OPEN] Authors, reviewers and the approver are not named yet. The product owner must name them before version 1.0.

## Revision history {#revisions}

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-10-30 | Document structure, front matter and introduction |
| 0.1 | 2026-10-30 | Procurement chapter as the pilot for the module chapters |
| 0.1 | 2026-10-30 | All chapters written in draft and reconciled between the SRS and the SDS. No person has reviewed them |

## How to read this document {#how-to-read}

The two languages live in one file. The switch in the page header changes between Thai and English, and the build stops if the two languages stop matching block for block.

Every requirement is a row in a seven-column table. Its id does not change when the document is edited. Testers cite the id in test cases, and the requirements CSV built with the document uses the same id.

### Requirement id scheme {#id-scheme}

| Pattern | Meaning | Example |
| --- | --- | --- |
| `<MOD>-FR-nnn` | Functional requirement of a module | `PRC-FR-001` |
| `<MOD>-NFR-nnn` | Module-specific non-functional requirement | `FIN-NFR-004` |
| `<MOD>-IR-nnn` | Interface requirement | `FIN-IR-002` |
| `<MOD>-DR-nnn` | Data requirement | `BGT-DR-001` |
| `<MOD>-CR-nnn` | Design and implementation constraint | `PLT-CR-001` |
| `XC-<CAT>-nnn` | Platform-wide requirement in the cross-cutting chapter | `XC-PRV-001` |
| `UC-<MOD>-nn`, `BR-<MOD>-nn` | Use case and business rule of a module | `BR-PRC-03` |

Module codes are `PLT` Platform, `BGT` Budget, `PRC` Procurement, `FIN` Finance, `PRJ` Projects and `REV` Review and analytics.

### Column, status, priority and verification legends {#legends}

| Column | Meaning |
| --- | --- |
| ID | Requirement id |
| Requirement | One testable statement using "the system shall", with a number or rule wherever there is a condition |
| Clause | The legal clause this row answers, as in the clause register, for example PPR 162 or PDPA 37; a dash marks a product decision that no clause requires |
| Priority | M must, S should, C could |
| Verify | T test, D demonstration, I inspection of a document or setting, A analysis |
| Status | See the next table |
| Prototype | The prototype screen or sweep check that shows the behaviour, otherwise a dash |

| Status | Meaning |
| --- | --- |
| Prototyped | The behaviour exists in the prototype and a sweep check covers it; this is not production code |
| Partial | Part of the behaviour exists in the prototype, or it exists with no specific check |
| Planned | The behaviour does not exist yet; the row is a development target |

## Writing rules {#writing-rules}

- The product is generic. Agency names and agency-specific values do not appear in this document; they are tenant settings.
- A rule that can differ between agencies is written as a tenant setting with its allowed range.
- A number comes from a clause, from a measured result, or is marked as a proposal.
- Every unresolved matter is an open question that says who must decide.
