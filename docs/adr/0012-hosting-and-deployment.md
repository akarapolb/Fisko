# ADR-0012: Hosting and deployment

Status: Accepted, open risk
Date: 2026-10-30

## Context

The hosted service will run on a Thai commercial cloud. Data must stay in Thailand. Agencies may also self-host under ADR-0001, and may have to use GDCC.

## Decision

- The hosted service runs on a **Thai commercial cloud**. AWS Thailand (`ap-southeast-7`, three Availability Zones) is the default, subject to the managed services needed being available there.
- It uses managed PostgreSQL, Kubernetes, object storage and KMS, across three zones.
- Application code uses open interfaces only, so that it stays portable to GDCC or an agency data centre.
- Two supported setups share one codebase:
  - **Small:** Docker Compose, for trials and small agencies.
  - **Enterprise:** Kubernetes with high availability.
- Infrastructure uses **OpenTofu**, Helm and Argo CD. Secrets for self-hosters use **OpenBao**.
- All data, backups and logs stay in Thailand. Recovery targets (RPO and RTO) are set in the SRS and rehearsed.

## Consequences

- Managed services reduce what the team must run.
- Portability limits use of cloud-only features.
- Both setups need testing on each release.

## Alternatives considered

- **Terraform and Vault:** their Business Source License is not open source.
- **GDCC as the main host:** a possible fallback, but Kubernetes support there was not confirmed.

## Open items

- **Risk:** one vendor blog says agency cloud purchases must go through GDCC. If true, agencies may be unable to subscribe to a service on a commercial cloud. Confirm with DGA or NT. The fallback is self-hosting on GDCC.
- Confirm the managed services available in the chosen region.
