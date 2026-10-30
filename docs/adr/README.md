# Architecture decision records

Each record states one decision for the production build of Fisko, why it was made, and what it costs. The format follows MADR: context, decision, consequences, alternatives, open items.

A record is never rewritten after acceptance. To change a decision, add a new record and mark the old one `Superseded by ADR-00xx`.

Agency names do not belong in these records. Fisko is a generic product; anything specific to one agency is tenant data.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-licence-and-open-source-model.md) | AGPL-3.0, with paid hosting and support | Accepted |
| [0002](0002-modular-monolith.md) | Modular monolith | Accepted |
| [0003](0003-backend-java-spring-boot.md) | Java 25 and Spring Boot 4.1 | Accepted |
| [0004](0004-frontend-react-typescript.md) | React and TypeScript | Accepted |
| [0005](0005-data-and-tenancy-cells.md) | PostgreSQL, row-level security, cells | Accepted |
| [0006](0006-identity-and-access.md) | Keycloak for identity, roles and SoD in the app | Accepted |
| [0007](0007-workflow-in-code.md) | Legal workflow in code, approval chains as data | Accepted |
| [0008](0008-messaging-outbox-rabbitmq.md) | Transactional outbox and RabbitMQ | Accepted |
| [0009](0009-search-opensearch.md) | OpenSearch with Thai tokenizing | Accepted |
| [0010](0010-file-storage-s3-api.md) | S3 API storage with virus scanning | Accepted |
| [0011](0011-documents-and-e-signatures.md) | Thai PDF output and PAdES signatures | Accepted |
| [0012](0012-hosting-and-deployment.md) | Thai commercial cloud, two supported setups | Accepted, open risk |
| [0013](0013-encryption-and-key-management.md) | Layered encryption with per-tenant keys | Accepted |
| [0014](0014-pdpa-and-data-protection.md) | PDPA built into the platform | Accepted, legal review pending |
| [0015](0015-tamper-evident-audit-log.md) | Hash-chained audit log without personal data | Accepted |
| [0016](0016-ai-gateway.md) | Optional AI behind a gateway | Accepted, open risk |
| [0017](0017-observability-and-quality.md) | OpenTelemetry and the quality toolchain | Accepted |

## Facts not yet verified

Decisions above rest on these. Each must be checked against a primary source before the SDS is signed off.

| Item | Affects | Check with |
|---|---|---|
| Whether agency cloud purchases must go through GDCC | 0012 | DGA or NT |
| Whether Claude can run wholly inside Thailand | 0016 | AWS model availability page |
| Managed services available in the chosen Thai region | 0012 | Cloud provider |
| How GFMIS and e-GP integrations work | 0008, SDS | Comptroller General's Department |
| ThaID onboarding for a SaaS product | 0006 | Department of Provincial Administration |
| Spring Boot support dates | 0003 | spring.io |
| PDPA positions, including the 2026 draft PDPC guidance | 0014, 0015 | Thai PDPA lawyer |
| Licence of each dependency | 0001 | Licence audit |
