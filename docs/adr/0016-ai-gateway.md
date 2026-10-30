# ADR-0016: Optional AI behind a gateway

Status: Accepted, open risk
Date: 2026-10-30

## Context

Fisko has AI assistance and analytics features. Government data may not be allowed to leave Thailand, and agencies differ in what they will accept. Claude on AWS in Thailand appears to rely mainly on global cross-region inference, so prompts may be processed abroad.

## Decision

- All AI calls go through one **model gateway** in the `platform` module.
- AI is **off by default**, and each agency opts in.
- Every feature works with AI switched off.
- The gateway removes personal data before sending, applies a per-tenant policy, and logs each call.
- Each agency chooses a provider, including a model hosted in Thailand.
- Restricted data is never sent.
- AI output is advice. A person makes every decision, and that is recorded.

## Consequences

- No module depends on one model provider.
- Quality may differ between providers.
- Removing personal data needs Thai-language testing.

## Alternatives considered

- **Direct calls from each module:** no central control or log.
- **AI on by default:** conflicts with cross-border rules (ADR-0014).

## Open items

- Confirm which models run wholly inside Thailand, from the provider's current availability page.
