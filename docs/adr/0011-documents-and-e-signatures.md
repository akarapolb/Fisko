# ADR-0011: Documents and e-signatures

Status: Accepted
Date: 2026-10-30

## Context

Government documents must follow the official letter format in Thai, and approved documents need signatures that can be verified later.

## Decision

- Generate PDF from templates with the TH Sarabun New font, embedded.
- Sign with **PAdES** using the **EU DSS** library, with long-term validation.
- Templates are tenant data; only the template engine is code.
- Signed documents are never changed. A correction creates a new version.

## Consequences

- Signatures stay verifiable after certificates expire.
- Certificate and timestamp sources must be chosen with ETDA guidance in mind.

## Alternatives considered

- **Commercial PDF libraries:** licences conflict with ADR-0001.
- **Image of a signature:** not verifiable.

## Open items

- Choose the certificate authority and the timestamp service.
- Confirm the licence of the font for redistribution.
