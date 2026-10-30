# ADR-0004: Front end on React and TypeScript

Status: Accepted
Date: 2026-10-30

## Context

The prototype is a working front end with a tested design: Thai-first labels, the calm design tokens, and accessibility work to WCAG 2.1 AA. The production build should keep that design without keeping the prototype's single-file code.

## Decision

- **React, TypeScript and Vite**, with TanStack Query for server data.
- A Fisko design system built from the prototype's tokens, published as its own package.
- Thai and English through one translation layer. Thai is the default.
- WCAG 2.1 AA is a release requirement.
- Screens are served per tenant from configuration, never from agency-specific code.

## Consequences

- The prototype's screens act as the visual spec.
- `tests/sweep.js` is rewritten in Playwright, keeping its scenarios.
- The team needs some React and TypeScript capacity alongside Java.

## Alternatives considered

- **Next.js:** server rendering adds little to a signed-in business application.
- **Angular:** a reasonable option, but further from the prototype's component style.
