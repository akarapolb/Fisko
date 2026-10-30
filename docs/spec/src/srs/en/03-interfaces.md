# External interfaces {#interfaces}

This chapter covers what Fisko shows to people, and how it connects to other systems. Module chapters hold the interface requirements of each module. The rows here apply to all of them.

## User interfaces {#if-ui}

Users work in a web browser. The prototype screens are the visual spec for the production front end (ADR-0004), and the rules come from the code in `src/js/95b-site.js` and the style sheets. That file follows the DGA Government Website Standard, มสพร. 11-2566, which refers to WCAG 2.1 level AA. The clause register has no form for that standard, so OI-XC-09 asks how to cite it.

| Area | Rule | Requirements |
| --- | --- | --- |
| Language | Thai first, with Thai and English on every screen. Generated official documents are in Thai | XC-ACC-012, XC-ACC-013, XC-ACC-014, XC-ACC-015 |
| Dates and years | Buddhist-era years in Thai, fiscal year from 1 October, Asia/Bangkok time | XC-ACC-016, XC-ACC-017, XC-ACC-018 |
| Accessibility | WCAG 2.1 level AA, a skip link, keyboard use, no text under 12 px | XC-ACC-001, XC-ACC-002, XC-ACC-003, XC-ACC-006 |
| Feedback | Errors at the field, status messages read out, a review step before a record action, undo for 10 seconds | XC-ACC-004, XC-ACC-005, XC-USA-005, XC-USA-006 |
| Shell | One launcher for the modules, a breadcrumb, a footer with the tenant name and policies | XC-USA-008, XC-USA-002 |
| Sign-in and session | A privacy notice on the sign-in page, and idle sign-out with a warning | XC-PRV-001, XC-SEC-007, XC-SEC-009 |
| Policy pages | Privacy, cookies, security, website terms, accessibility and contact | XC-USA-003 |

> [!WARN] The policy pages are templates that describe the production system. The security page speaks of single sign-on, two-factor authentication, an audit log that cannot be edited, and tested restores. The prototype has none of these for real. Each statement must be true before a tenant goes live, and the pages must then be reviewed.

## Software and external system interfaces {#if-sw}

Nothing leaves the prototype, so every row below is simulated or missing today. The table lists each system, and the Owner column names who must supply what is unknown.

| System | Purpose | Direction | In the prototype | Owner of the unknowns |
| --- | --- | --- | --- | --- |
| GFMIS | Government finance entries and reports | In and out, through Finance | Simulated files | Comptroller General's Department |
| e-GP | Government procurement data | In and out, through Procurement | Simulated file and a data pack to copy | Comptroller General's Department |
| ThaID | Sign-in for citizens and other external users | Authentication, through Keycloak | None | Department of Provincial Administration |
| Agency directories | Staff sign-in | Authentication, OIDC or SAML through Keycloak | Simulated sign-in | Each agency, with the product owner |
| E-mail | Notices and letters | Out | Simulated | Product owner |
| SMS | Short notices, if OI-PLT-14 allows the channel | Out | None | Product owner |
| AI provider | Optional assistance, off by default | Out and back, through the gateway | No model is called. Rule functions stand in | Product owner, from the AWS model availability page |
| Certificate authority and timestamp service | Signing and long-term validation | Out and back | Simulated signature | Product owner, with ETDA guidance in mind (ADR-0011) |
| Other agency systems | e-Budgeting, ERP, HR and payroll, project management | By tenant | Listed on the integration page, simulated | Product owner |

> [!OPEN] The Comptroller General's Department must supply the GFMIS and e-GP contracts: file layouts, whether an API is open to agencies, how access is granted, and message formats. Until then files are the working assumption. The Procurement chapter lists the e-GP details it needs in [its interface section](#prc-interfaces).

> [!OPEN] The Department of Provincial Administration must confirm the onboarding terms of ThaID for a SaaS product. ADR-0006 and the sign-in design wait for this answer.

> [!OPEN] The product owner must confirm from the provider's current availability page which models run wholly inside Thailand, and until then no AI provider contract is fixed (ADR-0016).

> [!OPEN] The product owner must choose the e-mail and SMS providers, and must decide whether a LINE channel exists. The prototype notification templates list LINE, no ADR covers it, and ADR-0014 keeps support tools in Thailand. OI-PLT-14 holds the question of SMS and LINE.

> [!OPEN] Each agency must state which directory it uses and whether it can speak OIDC or SAML. The product owner must collect this from the first agencies, because no contract with a directory exists yet.

These rows apply to every external system. The AI provider also falls under the AI rows in the [cross-cutting chapter](#xc-ai), and the [Platform](#plt) chapter holds the notification service.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-INT-001 | GFMIS and e-GP integrations shall run as separate adapters on the outbox path. | - | M | T | Planned | - |
| XC-INT-002 | An adapter shall be able to change from file to API with no change to business logic. | - | S | T | Planned | - |
| XC-INT-003 | An adapter shall retry a failed exchange, and a retry shall not create a duplicate in the external system. | - | M | T | Planned | - |
| XC-INT-004 | The system shall hold outbound messages while an external system is down, and shall send them when it returns. | - | M | T | Partial | 95-projects.js; sweep round 64, PM exchange only |
| XC-INT-005 | The system shall show users the state, last run, record count and last message of each integration. | - | M | D | Partial | 50-admin.js ADMIN.integrations |
| XC-INT-006 | The system shall log every exchange with time, system, direction, record count and result. | - | M | T | Partial | 50-admin.js BIND_ADMIN.integrations, audit() |
| XC-INT-007 | The system shall validate every imported file, and shall report the rows it refused and why. | - | M | T | Partial | 40b-monitor-tabs.js gf-file; 60-procurement.js egp-go |
| XC-INT-008 | The system shall reach ThaID only through Keycloak. | - | S | T | Planned | - |
| XC-INT-009 | An agency directory shall federate over OIDC or SAML by tenant configuration, with no code change. | - | M | T | Planned | - |
| XC-INT-010 | Suppliers and citizens shall sign in by a route separate from agency staff. | - | M | T | Planned | - |
| XC-INT-011 | Modules shall send e-mail only through the platform notification service. | - | M | T | Partial | 73-t4.js data-fdmail, simulated |
| XC-INT-012 | The notification service shall be able to send SMS through a provider that a tenant selects. OI-PLT-14 decides whether this channel exists. | - | C | T | Planned | - |
| XC-INT-013 | The system shall hold each external credential per tenant in KMS or OpenBao, and never in code or in plain settings. | - | M | I | Planned | - |

## Communication interfaces {#if-comm}

| Path | Protocol | Protection | Requirements |
| --- | --- | --- | --- |
| Browser to Fisko | HTTPS | TLS 1.3 | XC-SEC-017 |
| Between Fisko services | HTTPS | Mutual TLS | XC-SEC-018 |
| Modules and adapters | Outbox, then RabbitMQ | Inside the cell network | XC-INT-001, XC-API-005 |
| Sign-in | OIDC, SAML | TLS, through Keycloak | XC-SEC-005, XC-INT-009 |
| Files | S3 API over HTTPS | Per-tenant keys | XC-DAT-005, XC-DAT-007 |
| E-mail | SMTP | TLS, version to be fixed by the SDS | XC-INT-011 |
| GFMIS, e-GP and other government systems | Unknown | Unknown | XC-INT-014 |

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-INT-014 | The application shall reach external systems only from its adapters, to hosts on a listed set. | - | S | T | Planned | - |

> [!OPEN] Whether agencies reach Fisko over the public internet, a government network or both is not settled. It depends on the GDCC question in ADR-0012. The product owner must decide once DGA or NT has answered.
