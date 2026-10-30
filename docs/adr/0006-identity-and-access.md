# ADR-0006: Identity and access

Status: Accepted
Date: 2026-10-30

## Context

Agency staff sign in through their own directories, citizens and suppliers need a separate route, and government rules require separation of duties and delegation. Those rules are business logic, not identity.

## Decision

- **Keycloak** handles sign-in over OIDC and SAML, MFA, and federation with agency directories and ThaID.
- Tenants use Keycloak **Organizations**, not one realm per agency.
- Roles, separation-of-duties rules and delegation live in the Fisko `platform` module, and are checked on the server for every action.
- Sessions time out when idle, with a warning, as the prototype does.

## Consequences

- Authentication stays standard and replaceable.
- Separation-of-duties checks can be tested and audited with the business data.
- The browser's hiding of a button is never the control; the server decides.

## Alternatives considered

- **Cloud identity services:** tie the product to one cloud and do not suit self-hosting.
- **One realm per agency:** expected to struggle at 500 tenants.

## Open items

- Load-test Keycloak Organizations at the 500-tenant target.
- Confirm ThaID onboarding terms for a SaaS product.
