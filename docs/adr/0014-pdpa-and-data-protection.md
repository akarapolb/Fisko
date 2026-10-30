# ADR-0014: PDPA and data protection

Status: Accepted, legal review pending
Date: 2026-10-30

## Context

Fisko processes personal data of staff, suppliers and citizens, so it must comply with the Thai Personal Data Protection Act B.E. 2562. Agencies will also need evidence of this before they buy.

## Decision

Data protection is built into the `platform` module, so that every module inherits it.

- **Roles:** the agency is the data controller. When Fisko is hosted, the operator is the processor, under a data processing agreement. For a self-hosting agency, the operator is only the software supplier.
- **Legal basis:** recorded per data type. Government work mostly rests on legal duty or public task, so Fisko shows a privacy notice and asks for consent only where consent is the right basis.
- **Data dictionary:** every personal-data field records its class, purpose, legal basis and retention period.
- **Minimisation:** a field is not collected without a stated purpose.
- **Breach workflow:** a clock against the 72-hour limit for telling the PDPC, a 15-day outer limit for late notice, a step for telling affected people when risk is high, and 72-hour reporting from processor to controller.
- **Data subject requests:** a queue for access, correction, deletion and objection, with due dates and evidence.
- **Records of processing:** a ROPA export per tenant, for controllers and processors.
- **Retention:** a schedule per record type, with automatic deletion or anonymising.
- **Cross-border:** data, backups, logs and support tools stay in Thailand.

## Consequences

- Records that law requires to be kept or published cannot simply be deleted. Each record type states its rule, and the requester sees the reason.
- Each new field needs data dictionary work, which the SRS requires.
- The same features help agency DPOs meet their own duties.

## Alternatives considered

- **Per-module handling:** inconsistent and hard to evidence.
- **Consent for everything:** the wrong basis for most government work, and it implies a withdrawal that the agency could not honour.

## Open items

- A Thai PDPA lawyer reviews these positions, including the draft PDPC guidance reported in July 2026.
- Set retention periods per record type with the relevant records rules.
