# DevSecOps {#devsecops}

> [!NOTE] The tools named in ADR-0017, ADR-0012 and ADR-0001 are decided. Thresholds, stage order and any tool marked as a proposal are not. The repository, its CI platform and its pipelines do not exist yet.

## Pipeline {#dso-pipeline}

One pipeline serves the hosted service and the public releases, so that the hosted service runs the public code (ADR-0001).

{{fig:dso-pipeline | The CI and CD pipeline}}

| Stage | Runs on | Purpose |
| --- | --- | --- |
| Pull request | Each change | Build, fast tests, boundaries, scans |
| Main branch | Each merge | End-to-end tests and a dynamic scan |
| Release | Each release candidate | Images, SBOM, signatures, both setups. A major release adds the load test and the penetration test |
| Deploy | Each approved release | One cell at a time through Argo CD |

Release pipelines take longer, and penetration tests are a recurring cost (ADR-0017). Slow suites therefore run after merge, and pull requests stay fast.

## Quality gates {#dso-gates}

A failed gate blocks the merge or the release. No person may switch off a boundary test (ADR-0002). Values marked as a proposal need the technical lead's agreement.

| Gate | Tool | Stage | Blocks on | Source |
| --- | --- | --- | --- | --- |
| Unit tests | JUnit | Pull request | Any failure | ADR-0017 |
| Module boundaries | Spring Modulith `verify`, ArchUnit | Pull request | Any violation | ADR-0002 |
| Integration tests | JUnit with Testcontainers | Pull request | Any failure | ADR-0017 |
| Row-level security | `TenantIsolationIT`, generated from the schema | Pull request | A table with no policy, or any cross-tenant access | ADR-0005 |
| Static analysis | SonarQube | Pull request | A critical or high finding. New-code coverage below 80 percent (proposal) | XC-DSO-001 |
| Dependency scan | Dependency scanner on Maven and npm | Pull request | A known high or critical vulnerability with a fix available (proposal) | XC-DSO-002 |
| Licence audit | Licence scanner | Pull request | A licence outside the allowed list | XC-LIC-003 |
| Secret scan | Secret scanner, also as a pre-commit hook (proposal) | Pull request | Any finding | XC-SEC-030 |
| Personal data in logs | Log assertion tests | Pull request | Any personal field in a log or event | ADR-0015, ADR-0017 |
| Data dictionary | Check against the schema | Pull request | A personal-data field with no entry (proposal) | ADR-0014 |
| API compatibility | OpenAPI and AsyncAPI comparison | Pull request | An unversioned breaking change (proposal) | ADR-0003 |
| End to end | Playwright, Thai and English | Main branch | Any failure | ADR-0004, ADR-0017 |
| Accessibility | Scan inside Playwright, and a manual screen reader check in Thai on each release | Main branch, release | A WCAG 2.1 AA failure | XC-TST-010 |
| AI off | Every module runs with AI switched off | Main branch | Any failure | XC-TST-009 |
| Dynamic scan | OWASP ZAP | Main branch | A critical or high finding | XC-DSO-001 |
| Load | k6 against the 30 September peak | Before each major release | Objectives missed at peak volume | XC-TST-003 |
| Both setups | Install and smoke test, small and enterprise | Release | Any failure | XC-TST-007 |
| Storage compatibility | Tests for each documented S3 product | Release | Any failure | XC-TST-008 |
| Requirement coverage | Report from test names to SRS ids | Release | A Must requirement with no test (proposal) | ADR-0017 |
| Penetration test | Independent tester | Before each major release | Critical or high finding open | XC-DSO-005 |

Security follows OWASP ASVS 5.0: Level 2 throughout, and Level 3 for finance and payments (ADR-0017). A checklist maps each ASVS requirement to a test or a review, and it ships with the release evidence.

Each test names the requirements it proves, so coverage can be measured (ADR-0017). A test may name an SRS id, or an ADR when no requirement exists yet.

## Branching and releases {#dso-branching}

| Topic | Rule (proposal) |
| --- | --- |
| Branching | Short-lived branches from `main`, merged by pull request |
| Review | At least one reviewer. Two for changes to `platform` security, encryption, audit or row-level security |
| Commits | Each commit builds. Signed commits on `main` |
| Versions | Semantic versions. A major version can break the API. A minor version adds. A patch fixes |
| Long-term support | A support branch per LTS version, which is a paid service with public code (ADR-0001) |
| Hotfix | From the release tag, then forward to `main` |
| Legal changes | A dated rule version in any release, and the release notes list the clause |
| Migrations | Expand in one release, contract in a later one (ADR-0005) |
| Release evidence | SBOM, signatures, test report, requirement coverage, ASVS checklist |

Spring Boot's free support windows are short, so the project plans a framework upgrade within each support window (ADR-0003).

## Supply chain {#dso-supply}

Releases must be verifiable by others (ADR-0017).

- A CycloneDX SBOM is produced for each image and each front-end bundle, and published with the release.
- Release artifacts are signed. Argo CD refuses an unsigned image. Self-hosters can verify a release with a public key.
- Cosign is the proposed signing tool, with keys held in KMS. DG-XC-16 records this choice.
- Base images are pinned by digest and rebuilt on a schedule.
- Dependencies are pinned by lock file, and downloaded through a project proxy located in Thailand (proposal).
- CI jobs get short-lived credentials and run on clean runners. No build step can reach production.
- The dependency scan also runs on each released version, so that a new vulnerability raises an alert after release.
- `SECURITY.md` states how to report a vulnerability. Proposed fix targets are 7 days for critical (XC-DSO-006) and 30 days for high.

## Licence compliance {#dso-licence}

The whole product is licensed under AGPL-3.0, and every dependency must be compatible (ADR-0001). A licence audit runs in CI.

| Result | Licences (proposal, for a lawyer to confirm) | Action |
| --- | --- | --- |
| Allowed | MIT, BSD, Apache-2.0, ISC, MPL-2.0, LGPL, GPL-3.0, AGPL-3.0 | Merge |
| Review | Any other open-source licence, or a font or data licence | A maintainer records a decision |
| Refused | GPL-2.0-only when linked, SSPL, BUSL, any commercial or no-licence package | The build fails |

| Dependency | Expected licence | Note |
| --- | --- | --- |
| Keycloak, OpenSearch, Tink, Argo CD, Helm | Apache-2.0 | To confirm in the audit |
| OpenTofu, OpenBao, RabbitMQ | MPL-2.0 | Chosen over the BUSL tools (ADR-0012) |
| EU DSS | LGPL | Linked library. To confirm in the audit |
| ClamAV | GPL-2.0 | Runs as a separate service and is not linked. To confirm in the audit |
| Grafana, Loki, k6 | AGPL-3.0 | Operated or used as tools. To confirm in the audit |
| TH Sarabun New | Font licence | Redistribution is open (ADR-0011) |

> [!OPEN] The licence of each dependency is unverified (ADR index). The table above is what the authors expect, and the first licence audit replaces it. A lawyer reviews the licence, the contributor agreement and the trademark before release (ADR-0001).

Rules that follow from the licence:

- AGPL-3.0 gives network users a right to the source. A link in the product leads to the source of the exact running version, and the release tag is part of the build (XC-LIC-002).
- Only tenant data and settings stay private (ADR-0001). The hosted service has no private code fork.
- Publication happens from a new, clean repository, so that history with tenant data or personal email addresses is not published.
- `LICENSE`, `SECURITY.md` and `CONTRIBUTING.md` are added to that repository.
- Security, audit and PDPA features stay in the free version. No build flag removes them.
- The name Fisko is a trademark, held separately from the code licence.

> [!OPEN] A contributor agreement must be chosen before the first outside contribution is accepted. A CLA keeps dual licensing possible, and a DCO does not (ADR-0001). The product owner decides, with a lawyer (DG-XC-17, OI-XC-12).

## Secrets {#dso-secrets}

No key or secret is stored in the code repository (ADR-0013).

| Where | Secrets come from | Rotation (proposal) |
| --- | --- | --- |
| CI | Short-lived federated credentials | Per job |
| Hosted cells | Cloud secret store, delivered to pods at start | 90 days, and at once after any suspected leak |
| Self-hosters | OpenBao (ADR-0012) | Set by the agency |
| Database | Separate credentials per role: application, migration, relay | 90 days |
| Adapters | One credential per tenant and per external system, where the system allows it | As the system requires |

A leaked secret is treated as a security incident. The incident process rotates it, reviews the key use log, and starts the breach workflow when personal data may be involved (ADR-0014).

## Open issues {#dso-open}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-XC-16 | CI platform, signing tool, and the scanners for dependencies, licences and secrets. Each must meet ADR-0001 | Cosign proposed; the others are chosen at build start | Technical lead |
| DG-XC-17 | CLA or DCO | Open | Product owner, lawyer |
