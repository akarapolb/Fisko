# ADR-0001: Licence and open-source model

Status: Accepted
Date: 2026-10-30

## Context

Fisko is to be open source and also a SaaS sold to Thai government agencies. A permissive licence would let others sell closed versions of it. Agencies need a named supplier, support and long-term versions before they can adopt it.

## Decision

- The whole product is licensed under **AGPL-3.0**.
- The name Fisko is a registered trademark, held separately from the code licence.
- Security, audit and PDPA features stay in the free version. There is no paid edition of the code.
- Revenue comes from hosting, support, long-term-support versions and implementation.
- Contributions need an agreement chosen before the first outside contribution is accepted. A CLA keeps dual licensing possible; a DCO does not.
- Every dependency must be compatible with AGPL-3.0, and a licence audit runs in CI.

## Consequences

- The hosted service runs the public code. Only tenant data and settings stay private.
- Agencies that must host for themselves can do so, which also limits the hosting risk in ADR-0012.
- Tenant data moves out of the code repository. Publication happens from a new, clean repository, so that history with tenant data or personal email addresses is not published.
- `LICENSE`, `SECURITY.md` and `CONTRIBUTING.md` are added to that repository.
- Some agency legal teams will need AGPL explained.

## Alternatives considered

- **Apache-2.0:** easiest for legal teams, but anyone may sell a closed version.
- **Open core:** a paid edition with extra features. Rejected because paywalled security features undermine trust.
- **BUSL or similar:** not an open-source licence.

## Open items

- A lawyer reviews the licence, the contributor agreement and the trademark before release.
- Contracts for agency-funded work must allow that work to come back into the project.
