# ADR-0017: Observability and quality toolchain

Status: Accepted
Date: 2026-10-30

## Context

An enterprise service needs measurable reliability and evidence of quality. As an open-source product, its releases must be verifiable by others.

## Decision

- **Observability:** OpenTelemetry, Prometheus, Grafana and Loki. Telemetry is tagged by cell and tenant, and contains no personal data.
- **Tests:** JUnit with Testcontainers, Playwright end to end, k6 load tests against the 30 September peak.
- **Security:** OWASP ASVS 5.0, Level 2 throughout and Level 3 for finance and payments. SonarQube and OWASP ZAP in CI, and an independent penetration test before each major release.
- **Supply chain:** a CycloneDX SBOM and signed release artifacts, with dependency and licence scanning.
- **Traceability:** each test links to an SRS requirement.

## Consequences

- Coverage of requirements can be measured.
- Release pipelines take longer, and penetration tests are a recurring cost.

## Alternatives considered

- **Commercial monitoring suites:** cost scales with tenants, and they do not suit self-hosting.
