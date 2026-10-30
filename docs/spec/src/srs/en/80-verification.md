# Verification and validation {#verification}

This chapter says how each requirement will be proved, how a clause traces to a test, and what the status column means. No production code exists yet, so the only evidence today is the prototype and its test sweep. The chapter keeps those two apart from the production tests that the SDS plans.

## Test levels {#ver-levels}

The first row exists today. Every other row is planned, and the tools come from ADR-0017 and the Testing section of the cross-cutting chapter. Each module chapter of the SDS lists its own tests under Test design.

| Level | Tool | What it proves | Source | State |
| --- | --- | --- | --- | --- |
| Prototype sweep | `tests/sweep.js`, `tests/run.html` | Walks that drive real actions in the page and raise an error on a wrong result; page-open checks for every role, language and sample organisation | XC-TST-002 | Exists; not run for this version |
| Unit | JUnit | State tables, calculators and policies, with no Spring context | XC-TST-001 | Planned |
| Architecture | Spring Modulith `verify`, ArchUnit | Module boundaries, no cycles, no framework in the domain | XC-TST-006 | Planned |
| Integration | JUnit, Testcontainers | Commands through the REST layer, row-level security on every tenant-owned table, outbox | XC-TST-001, XC-TST-005 | Planned |
| Module scenario | Spring Modulith `Scenario` | Actions that cross modules, in one transaction | SDS module chapters | Planned |
| Interface contract | One suite per port, with a stub that injects faults | Each adapter against its port: timeouts, rejections, duplicates, outages | SDS Integration chapter | Planned |
| End to end | Playwright | Each role's journey in Thai and English, keeping the scenarios of the sweep | XC-TST-002 | Planned |
| Load | k6 | The 30 September peak | XC-TST-003 | Planned |
| Security | SonarQube, OWASP ZAP, independent penetration test | OWASP ASVS 5.0 at the levels of ADR-0017 | ADR-0017 | Planned |
| Accessibility | Automated check and a manual screen reader check in Thai | The accessibility rows | XC-TST-010 | Planned |
| Setups and storage | The tests of each release, on each setup | Both supported setups and every documented storage product | XC-TST-007, XC-TST-008 | Planned |
| AI off | Automated run | Every module works with AI switched off | XC-TST-009 | Planned |
| Restore drill | Scripted restore | Recovery figures and the restore of one tenant | XC-AVL-002, XC-AVL-003, XC-AVL-008 | Planned |
| Acceptance | Scenarios run by people on a test tenant (proposal) | The product does the work of each role, see the acceptance criteria below | This chapter | Planned |

## Verification methods {#ver-methods}

Each requirement row names one method in its Verify column.

| Code | Method | Meaning | Evidence (proposal) |
| --- | --- | --- | --- |
| T | Test | An automated or scripted run with a pass or fail result | A test report that names the requirement id |
| D | Demonstration | A person shows the behaviour to a reviewer | A record of who saw what, and when |
| I | Inspection | A reviewer reads a document, a setting or code | The reviewer's note, with the version read |
| A | Analysis | A calculation or model from measured data | The calculation, with its input data |

The rows below are counted from the requirement tables of this version.

| Set | T | D | I | A | Total |
| --- | --- | --- | --- | --- | --- |
| Cross-cutting | 151 | 17 | 36 | 5 | 209 |
| Platform | 133 | 16 | 21 | 0 | 170 |
| Budget | 178 | 16 | 10 | 0 | 204 |
| Procurement | 195 | 21 | 15 | 0 | 231 |
| Finance | 148 | 14 | 8 | 0 | 170 |
| Projects | 63 | 17 | 12 | 0 | 92 |
| Review and analytics | 53 | 13 | 13 | 1 | 80 |
| **All rows** | **921** | **114** | **115** | **6** | **1156** |

## Traceability {#ver-trace}

A reader must be able to follow one line from a law to a test. The chain has four links, and the last two are only partly in place.

| Link | Where it is held | How it is checked | State |
| --- | --- | --- | --- |
| Clause to requirement | The clause register in `docs/spec/src/law/` and the Clause column of each row | The clause coverage table in the appendices and `Fisko-clause-coverage.csv`, both built with this document | In place; clauses still to be confirmed |
| Requirement to design | Requirement columns in SDS tables, the rule maps, `covers` comments and the `law` line of diagrams | Ids are links, and the build warns about an id in a paragraph that does not exist | In place |
| Requirement to test | Today the Prototype column and the Test evidence section of each chapter. In production each test names its requirement (XC-TST-004) | `Fisko-SRS-rtm.csv` lists every requirement. The mapping from sweep checks to production tests is in Test design in each SDS module chapter | Partial |
| Test to result | CI reports, once production tests exist | Coverage of requirements measured from those reports (ADR-0017) | Planned |

One complete example follows, using the daily penalty.

| Step | Item | Where |
| --- | --- | --- |
| Clause | PPR 162 | Clause register; its note says a procurement specialist must confirm it |
| Rule | BR-PRC-12 | [Procurement](#prc-rules) |
| Requirement | PRC-FR-122 | [Penalties](#prc-fr-penalty) |
| Design | `PenaltyCalculator.daily`, `PenaltyLimits` | Rule map of the Procurement chapter in the SDS |
| Check today | Round 66 check | `tests/sweep.js` |
| Test in production | `PenaltyCalculatorTest` | Test design of the Procurement chapter in the SDS, a proposal |
| Status | Prototyped | Prototype column of the row |

## Keeping the status honest {#ver-honest}

The status column is only useful if it can be believed. The authoring brief sets these rules for every chapter.

1. A row is `Prototyped` only if the behaviour exists and a specific check in `tests/sweep.js` or the end-to-end code covers it. The Prototype column names that check.
2. A row is `Partial` if only part of the behaviour exists, or if it exists with no specific check.
3. A row is `Planned` if the behaviour does not exist.
4. A page-open sweep never raises a row. It shows that a page renders, and says nothing about what the page does.
5. A demo step or an end-to-end step with no assertion never raises a row. The same holds for an agent run that is started and not checked.
6. A walk that runs an action and does not check the result afterwards does not count for that action.
7. A requirement about a server, a database or a network cannot reach `Prototyped`, because the prototype runs in a browser only.
8. If a named check is removed or weakened, the row falls to `Partial` in the same change (proposal).

> [!OPEN] No second person has reviewed the statuses. The product owner must name a reviewer, and must say what replaces these three values once production code starts, since they describe the prototype only.

## Acceptance criteria {#ver-accept}

These criteria decide whether a production release is accepted. The Basis column shows where each comes from. A row marked proposal holds a figure or a rule that no clause, ADR or requirement sets, and the product owner must confirm it.

| Criterion | Statement | Measure | Basis |
| --- | --- | --- | --- |
| AC-REL-001 | Every Must row has a linked test or a recorded check, and each passed on the release build | 100 percent of Must rows (proposal) | XC-TST-004, with a proposed measure |
| AC-REL-002 | Every clause owed to the SRS or the SDS is answered, and the person named in its register note has confirmed it | No unconfirmed row (proposal) | Proposal |
| AC-REL-003 | No open issue that affects a Must row remains open | No such issue (proposal) | Proposal |
| AC-REL-004 | Module boundary tests and row-level security tests pass on every build | All pass, with no switch to turn them off | XC-TST-005, XC-TST-006 |
| AC-REL-005 | The scenarios of the sweep run in Playwright and pass | Each kept scenario passes | XC-TST-002 |
| AC-REL-006 | One test tenant runs the cycle in the End-to-end flows chapter of the SDS, from an allocation line to the month close | One full pass in each language (proposal) | Proposal |
| AC-REL-007 | The load test against the 30 September peak meets the performance rows | The targets are proposals (OI-XC-01) | XC-TST-003 |
| AC-REL-008 | The release meets OWASP ASVS 5.0, Level 2 throughout and Level 3 for finance and payments, and passes an independent penetration test | No open critical finding (proposal). The scope of Level 3 is OI-XC-04 | ADR-0017 |
| AC-REL-009 | The tests pass on both supported setups | Both setups pass | XC-TST-007 |
| AC-REL-010 | The compatibility test passes on every documented storage product | Every product passes | XC-TST-008 |
| AC-REL-011 | Every module works with AI switched off | The automated test passes | XC-TST-009 |
| AC-REL-012 | The automated accessibility check and the manual Thai screen reader check pass | Both pass | XC-TST-010 |
| AC-REL-013 | A restore drill meets the recovery figures, and one tenant can be restored alone | 15 minutes RPO and 4 hours RTO, both proposed (OI-XC-02) | XC-AVL-002, XC-AVL-003, XC-AVL-008 |
| AC-REL-014 | The audit chain verifies against its checkpoints, also after an erasure | A changed, removed or reordered entry is reported | XC-SEC-036, XC-SEC-039 |
| AC-REL-015 | Release artifacts are signed and carry a CycloneDX SBOM | Each artifact | ADR-0017 |
| AC-REL-016 | Sample accounts, data reset and the demo guide do not exist in a production tenant | Found absent by inspection | PLT-NFR-004 |

> [!OPEN] The product owner must decide who signs acceptance of a hosted release, and what a tenant runs and signs before going live. An agency may also have its own acceptance procedure, which this document does not state.

## Status of the requirements {#ver-status}

The matrix below is built from the requirement tables each time this document is built.

{{status-matrix}}

> [!NOTE] The matrix leaves cross-cutting rows out of its status columns. They have been assessed: 7 Prototyped, 44 Partial and 158 Planned, as the [status summary](#xc-status) of that chapter shows.

Must rows decide whether a release can be accepted, so they are shown apart, counted from the requirement tables of this version.

| Set | Must rows | Prototyped | Partial | Planned |
| --- | --- | --- | --- | --- |
| Cross-cutting | 171 | 6 | 34 | 131 |
| Platform | 121 | 6 | 75 | 40 |
| Budget | 139 | 10 | 114 | 15 |
| Procurement | 136 | 27 | 100 | 9 |
| Finance | 131 | 55 | 60 | 16 |
| Projects | 59 | 7 | 37 | 15 |
| Review and analytics | 44 | 0 | 29 | 15 |
| **All rows** | **801** | **111** | **449** | **241** |

## What the statuses prove {#ver-proof}

The statuses come from reading the code and the tests. The sweep was not run for them. Read them with that in mind.

The statuses do show the following.

- `Prototyped`: a reader found the behaviour in the prototype code, and found a check that would raise an error if the result were wrong.
- `Partial`: a reader found some of the behaviour, or all of it with no specific check. Many such rows would rise with one new check and no new feature.
- `Planned`: a reader did not find the behaviour, so the row is a development target.

The statuses do not show the following.

- That the checks pass today. They were read, and none was run for this version.
- That any production code exists. Nothing here is production code.
- Anything about a server, a database, a network, load, tenant isolation or recovery. The sweep runs in a browser on sample data.
- That a behaviour is lawful. Clause references still need the confirmation that each register row asks for.
- That a refusal works, unless a check names it. The Budget chapter records that no sweep check tests a refused rule, and the Procurement chapter records none for a refused duty rule.
- That all tenant profiles work. The sweep runs with the seeded profile, so a feature that is off in that profile is not rendered.
- How much work remains. A count of rows is no measure of effort, since rows differ greatly in size.
