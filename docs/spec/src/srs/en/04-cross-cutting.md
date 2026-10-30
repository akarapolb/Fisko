# Cross-cutting requirements {#xc}

Every module meets every row of this chapter, and module chapters do not repeat them. A module chapter adds a row only for what is particular to that module. Platform features that carry these rules, such as the audit screens or the breach workflow, are specified in the [Platform](#plt) chapter.

The prototype runs only in a browser, with no server, no database and no real sign-in. Most rows are therefore Planned. A row is Prototyped only where the prototype has the behaviour and `tests/sweep.js` checks it. A number marked as a proposal comes from no clause, ADR or code. The product owner must confirm it.

## Security {#xc-security}

The security baseline is OWASP ASVS 5.0 (ADR-0017). Sign-in follows ADR-0006, and the server decides every action. Security requirements of data at rest and in transit are in the next sections.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-SEC-001 | The system shall meet OWASP ASVS 5.0 Level 2 in every function. | - | M | A | Planned | - |
| XC-SEC-002 | The system shall meet OWASP ASVS 5.0 Level 3 in finance and payment functions. | - | M | A | Planned | - |
| XC-SEC-003 | The system shall check the role, separation-of-duties rules and delegation on the server for every action, whatever the browser shows. | - | M | T | Planned | - |
| XC-SEC-004 | The system shall refuse with HTTP 403 and shall log any request that no role of the caller permits. | - | M | T | Planned | - |
| XC-SEC-005 | The system shall authenticate users only through Keycloak over OIDC or SAML, and shall store no user password in application tables. | - | M | T | Planned | - |
| XC-SEC-006 | The system shall require a second factor at sign-in for every agency staff account. | - | M | T | Partial | 54-identity.js showSignIn, simulated with a fixed code |
| XC-SEC-007 | The system shall end a session after the idle time, which is a tenant setting with a default of 30 minutes. | - | M | T | Prototyped | 95b-site.js siteIdleTick; sweep round 66 |
| XC-SEC-008 | The system shall refuse an idle time outside 5 to 60 minutes (proposal). | - | S | T | Planned | - |
| XC-SEC-009 | The system shall warn the user before the idle time ends, 5 minutes before by default, and shall offer a control to stay signed in. | - | M | T | Partial | 95b-site.js siteIdleTick, #idlewarn |
| XC-SEC-010 | The system shall write an audit entry for every sign-out caused by the idle time. | - | M | T | Partial | 95b-site.js siteIdleTick, audit() |
| XC-SEC-011 | The system shall block sign-in to an account for 15 minutes after 5 failed attempts within 15 minutes (proposal). | - | S | T | Planned | - |
| XC-SEC-012 | The system shall send a Content-Security-Policy that allows scripts, styles and fonts only from the Fisko origin. | - | M | T | Planned | - |
| XC-SEC-013 | The system shall validate every API input on the server against its OpenAPI schema and shall refuse a request that does not match. | - | M | T | Planned | - |
| XC-SEC-014 | The system shall keep no business record, restricted data or access token in browser storage. Language, last page and similar display choices may stay there. | - | M | I | Planned | - |
| XC-SEC-015 | A production tenant shall contain no role switcher, fixed sign-in code or presenter mode. | - | M | I | Planned | - |

> [!OPEN] The Cybersecurity Act and the Digital Government Administration Act may place duties on agencies and on the operator. No clause is cited here because none could be confirmed. See OI-XC-08.

## Privacy and PDPA {#xc-privacy}

Data protection is built into the `platform` module so that every module inherits it (ADR-0014). The agency is the controller. When Fisko is hosted, the operator is the processor. These rows state the rules, and the [Platform](#plt) chapter specifies the queues and screens.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-PRV-001 | The system shall show a privacy notice on the sign-in page that states what is collected, the purpose and legal basis, who receives the data, how long it is kept and the rights of the data subject. | PDPA 23 | M | T | Partial | 95b-site.js showSignIn, sitePolicy |
| XC-PRV-002 | Every personal-data field shall have a data dictionary entry with its class, purpose, legal basis and retention period before it is released. | PDPA 22 | M | I | Planned | - |
| XC-PRV-003 | The system shall collect no personal-data field that lacks a stated purpose in the data dictionary. | PDPA 22 | M | I | Planned | - |
| XC-PRV-004 | The system shall record the legal basis per data type, and shall ask for consent only for a data type whose recorded basis is consent. | PDPA 19, PDPA 24 | M | I | Planned | - |
| XC-PRV-005 | The system shall treat sensitive personal data as the Restricted class, and shall accept such a field only where the data dictionary records its specific legal basis. | PDPA 26 | M | T | Planned | - |
| XC-PRV-006 | The system shall start a clock when a personal data breach is recorded, and shall show the time left against the 72-hour limit for telling the PDPC. | PDPA 37 | M | T | Planned | - |
| XC-PRV-007 | The system shall show the 15-day outer limit for a late notice to the PDPC. | - | M | T | Planned | - |
| XC-PRV-008 | The system shall require a recorded decision on telling affected people, with a task to tell them when the risk is high. | PDPA 37 | M | T | Planned | - |
| XC-PRV-009 | The system shall let the hosting operator report a breach to the affected controller, and shall show the time left against a 72-hour limit. | PDPA 40 | M | T | Planned | - |
| XC-PRV-010 | The system shall hold a queue of data subject requests for access, copy, correction, deletion, restriction and objection, each with a due date and evidence. | PDPA 30, PDPA 32, PDPA 33, PDPA 34, PDPA 36 | M | T | Planned | - |
| XC-PRV-011 | The system shall set the due date of an access request to 30 days from receipt. | PDPA 30 | M | T | Planned | - |
| XC-PRV-012 | When a law requires a record to be kept or published, the system shall refuse its deletion and shall show the requester the reason for that record type. | PDPA 33 | M | T | Planned | - |
| XC-PRV-013 | The system shall export a ROPA per tenant, in a controller form and a processor form. | PDPA 39 | M | D | Planned | - |
| XC-PRV-014 | The system shall hold a retention period per record type, and shall log each change of it. | PDPA 37 | M | T | Partial | 50b-admin-depth.js ADMIN.data |
| XC-PRV-015 | The system shall delete or anonymise a record automatically when its retention period ends. | PDPA 37 | M | T | Planned | - |
| XC-PRV-016 | The system shall keep personal data, backups, logs and support tools in Thailand. | PDPA 28 | M | I | Planned | - |
| XC-PRV-017 | The system shall hold the contact of the tenant data protection officer as a tenant setting, and shall show it in the privacy notice. | PDPA 41 | S | D | Partial | 95b-site.js siteCfg, sitePolicy |
| XC-PRV-018 | The system shall set no advertising cookie and no cross-site tracking cookie. | - | M | I | Partial | 95b-site.js sitePolicy cookie |

> [!LAW] ADR-0014 is accepted with legal review pending. A Thai PDPA lawyer must confirm every clause above, the 15-day limit and the positions on legal basis (OI-XC-05).

## Encryption and keys {#xc-encryption}

The class of the data sets its protection (ADR-0013). A stolen database or backup must not expose Restricted data, and one tenant's key must not open another's data. These rows continue the security numbering.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-SEC-016 | The system shall place every stored field in one class of Restricted, Confidential, Internal or Public, and the class shall set its protection as ADR-0013 lists. | - | M | I | Planned | - |
| XC-SEC-017 | The system shall accept browser connections only over TLS 1.3. | - | M | T | Planned | - |
| XC-SEC-018 | The system shall use mutual TLS between its services. | - | M | T | Planned | - |
| XC-SEC-019 | The system shall encrypt databases, backups, object storage and search indexes at rest with keys held in KMS. | - | M | I | Planned | - |
| XC-SEC-020 | The system shall encrypt Restricted fields in the application with AES-256-GCM through Google Tink, using envelope encryption. | - | M | T | Planned | - |
| XC-SEC-021 | Each tenant shall have its own data keys, wrapped by a master key in KMS or an HSM, or in OpenBao for a self-hosted agency, so that one tenant key cannot open another tenant's data. | - | M | T | Planned | - |
| XC-SEC-022 | The system shall rotate data keys automatically at least every 12 months (proposal). | - | M | T | Planned | - |
| XC-SEC-023 | The system shall log every use of a key with time, tenant, key id and purpose. | - | M | T | Planned | - |
| XC-SEC-024 | The system shall let a large agency bring its own master key. | - | C | D | Planned | - |
| XC-SEC-025 | The system shall search Restricted fields by exact match only, through a keyed blind index that has its own key. | - | S | T | Planned | - |
| XC-SEC-026 | The system shall mask a Restricted value on every screen, report and export unless the user has asked to reveal it. | - | M | T | Partial | 66c-fin-fn2.js maskAcct |
| XC-SEC-027 | The system shall allow a reveal only to a role that the data dictionary permits, with a reason, and shall log it. | - | M | T | Planned | - |
| XC-SEC-028 | The system shall keep a sealed bid encrypted until its opening time, so that no person, including an operator, can read it earlier. | - | M | T | Planned | - |
| XC-SEC-029 | The system shall refuse Fisko operator staff any read of tenant data that has no recorded, approved reason. | - | M | T | Planned | - |
| XC-SEC-030 | The build shall fail when a key or secret is found in the code repository. | - | M | T | Planned | - |
| XC-SEC-031 | The operator shall rehearse key backup and recovery at least every 12 months (proposal), and shall record the result. | - | M | D | Planned | - |

## Audit {#xc-audit}

The audit log must show tampering, and must still allow a person to be erased (ADR-0015). The log holds references, and the personal details sit elsewhere under a key that can be destroyed. These rows continue the security numbering.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-SEC-032 | The system shall write an audit entry with time, actor, role, action and target for every create, change, approval, rejection, cancellation, import and export. | - | M | T | Partial | 00-core.js audit |
| XC-SEC-033 | The system shall allow only inserts into the audit log, and shall refuse every update or delete at the database. | - | M | T | Planned | - |
| XC-SEC-034 | The system shall chain each audit entry by hash to the previous entry of the same tenant. | - | M | T | Planned | - |
| XC-SEC-035 | The system shall store a chain checkpoint outside the audit database at least every 24 hours (proposal). | - | M | T | Planned | - |
| XC-SEC-036 | The system shall detect and report a changed, removed or reordered audit entry when it verifies a chain against its checkpoints. | - | M | T | Planned | - |
| XC-SEC-037 | An audit entry shall hold a pseudonymous subject reference and no personal details. | - | M | T | Planned | - |
| XC-SEC-038 | The system shall hold the personal details behind a subject reference in a separate table, encrypted under a key of that subject. | - | M | T | Planned | - |
| XC-SEC-039 | The system shall erase a person from the audit trail by destroying that subject key, and the chain shall still verify afterwards. | PDPA 33 | M | T | Planned | - |
| XC-SEC-040 | A report shall resolve subject references to names, and shall show a placeholder once the person is erased. | - | M | T | Planned | - |
| XC-SEC-041 | The system shall write an audit entry for every read of Restricted data. | - | M | T | Planned | - |
| XC-SEC-042 | The system shall keep every audit entry until the retention period of the audit log ends. | - | M | T | Planned | - |

## Performance {#xc-performance}

> [!OPEN] Every figure in this section is a proposal. No clause, ADR or measurement gives it, and the prototype cannot measure it. The product owner must confirm or replace each figure (OI-XC-01).

Targets apply to the hosted service. The load model that tests them follows the 30 September peak (ADR-0005, ADR-0017).

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-PER-001 | A read API call shall answer within 500 ms at the 95th percentile (proposal). | - | M | T | Planned | - |
| XC-PER-002 | A write API call shall answer within 1 second at the 95th percentile (proposal). | - | M | T | Planned | - |
| XC-PER-003 | A page change shall show its main content within 2 seconds at the 95th percentile (proposal). | - | M | T | Planned | - |
| XC-PER-004 | A search shall return its first page of results within 1 second at the 95th percentile (proposal). | - | S | T | Planned | - |
| XC-PER-005 | The system shall produce a PDF document of up to 20 pages within 5 seconds at the 95th percentile (proposal). | - | S | T | Planned | - |
| XC-PER-006 | The system shall run any report or export expected to pass 10 seconds (proposal) as a background job, and shall notify the user when it is ready. | - | S | T | Planned | - |
| XC-PER-007 | The relay shall publish an outbox event within 5 seconds of its commit at the 95th percentile (proposal). | - | S | T | Planned | - |
| XC-PER-008 | The targets of this section shall hold under the 30 September peak load model, measured in one cell. | - | M | T | Planned | - |

## Availability and recovery {#xc-availability}

> [!OPEN] ADR-0012 leaves RPO and RTO for this SRS to set, and they have no agreed value yet. The availability, RPO, RTO and maintenance figures below are proposals for the product owner (OI-XC-02). The 90-day limit on a restore test comes from the prototype code.

Targets apply to the hosted service. Failures stay inside one cell, and upgrades roll out cell by cell (ADR-0005).

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-AVL-001 | The hosted service shall be available 99.9 percent of each calendar month per cell, leaving out announced maintenance (proposal). | - | M | A | Planned | - |
| XC-AVL-002 | A restore shall lose no more than 15 minutes of committed data (proposed RPO). | - | M | T | Planned | - |
| XC-AVL-003 | The hosted service shall restore a failed cell within 4 hours (proposed RTO). | - | M | T | Planned | - |
| XC-AVL-004 | The hosted service shall keep serving through the loss of one of its three Availability Zones. | - | M | T | Planned | - |
| XC-AVL-005 | A failure of one cell shall not change the availability of any other cell. | - | M | T | Planned | - |
| XC-AVL-006 | The system shall upgrade cell by cell with old and new application versions working together, using expand-and-contract schema changes. | - | M | T | Planned | - |
| XC-AVL-007 | The operator shall announce planned maintenance at least 5 working days ahead, and shall plan none from 15 September to 5 October (proposal). | - | S | I | Planned | - |
| XC-AVL-008 | The system shall restore one tenant from backup with no rollback of any other tenant. | - | M | T | Planned | - |
| XC-AVL-009 | The system shall show the date of the last restore test and shall flag it when it is more than 90 days old. | - | M | D | Partial | 50b-admin-depth.js ADMIN.data |
| XC-AVL-010 | The operator shall keep every backup in Thailand, encrypted, in a location separate from the cell it protects. | - | M | I | Planned | - |

## Scalability {#xc-scalability}

About 500 agencies are expected within 2 to 3 years, and all of them peak on 30 September (ADR-0005). Cells carry that growth.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-SCL-001 | The hosted service shall serve 500 tenants. | - | M | T | Planned | - |
| XC-SCL-002 | One cell shall hold 50 to 100 small agencies at the start, and load tests shall set the later limit. | - | M | T | Planned | - |
| XC-SCL-003 | The system shall let the operator give a large agency a cell of its own by a setting, with no code change. | - | S | D | Planned | - |
| XC-SCL-004 | The system shall move a tenant between cells as a supported operation, with row counts and audit chains the same before and after. | - | M | T | Planned | - |
| XC-SCL-005 | A global routing service shall send every tenant request to the cell that holds the tenant. | - | M | T | Planned | - |
| XC-SCL-006 | The system shall create a new tenant by an automated step, with no code change. | - | M | T | Planned | - |
| XC-SCL-007 | The operator shall be able to add a cell with no downtime in any existing cell. | - | S | T | Planned | - |
| XC-SCL-008 | Capacity shall be planned against the 30 September peak, when all agencies peak together. | - | M | A | Planned | - |
| XC-SCL-009 | A load test shall show that Keycloak Organizations serve 500 tenants. | - | M | T | Planned | - |

## Usability {#xc-usability}

These rows come from the prototype design (ADR-0004), which is the visual spec for production.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-USA-001 | A page shall never show the raw values undefined, NaN, [object, Infinity or Invalid. | - | M | T | Prototyped | sweep BAD pattern, every page, role and language |
| XC-USA-002 | Every signed-in page shall have a footer with the tenant name and one link to each of the 6 policy pages, and the footer may also hold the source code link of XC-LIC-002. | - | M | T | Prototyped | 95b-site.js renderSiteFoot; sweep round 65 |
| XC-USA-003 | The system shall provide 6 policy pages in Thai and English: privacy, cookies, security, website terms, accessibility and contact, filled from tenant data. | - | M | T | Prototyped | 95b-site.js SITE_POL, sitePolicy; sweep round 65 |
| XC-USA-004 | Page labels shall show no internal design code. | - | S | T | Prototyped | 95b-site.js siteEyebrows; sweep round 66 |
| XC-USA-005 | Before it applies a record action that asks for an amount or a reason, the system shall show a review step with the record, the action, the amount and the reason. | - | M | T | Prototyped | 92-review.js cr-review; sweep review step |
| XC-USA-006 | The system shall offer an undo for 10 seconds after a reversible record action. | - | S | T | Partial | 76-crud.js CR_UNDO |
| XC-USA-007 | The system shall require the user to type the record id before an action that cannot be undone. | - | M | T | Partial | 92-review.js crIrreversible |
| XC-USA-008 | The system shall let a user reach every module that the role allows from one launcher, and shall show the tenant, module and page as a breadcrumb. | - | S | D | Partial | 90-systems.js SYSTEMS, openLauncher |
| XC-USA-009 | The system shall work in the current and previous major versions of Chrome, Edge, Firefox and Safari (proposal). | - | M | T | Planned | - |
| XC-USA-010 | The system shall follow the light or dark preference of the browser. | - | C | D | Partial | src/styles.css, src/calm.css prefers-color-scheme |

## Accessibility and language {#xc-accessibility}

WCAG 2.1 AA is a release requirement, and Thai is the default language (ADR-0004). Language rows share the accessibility numbering so that the requirement list carries them (OI-XC-13).

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-ACC-001 | Every release shall meet WCAG 2.1 level AA. | - | M | T | Partial | 95b-site.js, src/systems.css; no audit yet |
| XC-ACC-002 | Every page shall begin with a link that moves focus to the main content. | - | M | T | Partial | 95b-site.js skiplink |
| XC-ACC-003 | Every function shall work by keyboard, with a visible focus indicator. | - | M | T | Partial | :focus-visible in src/theme.css, src/styles.css |
| XC-ACC-004 | A blocked save shall mark the field to fix as invalid, shall tie the message to the field and shall move focus to it. | - | M | T | Prototyped | 95b-site.js toastErr; sweep round 65 |
| XC-ACC-005 | Every status message shall reach a screen reader through a live region. | - | M | T | Partial | 95b-site.js #sr-live |
| XC-ACC-006 | No text shall be smaller than 12 px. | - | S | T | Partial | src/*.css; one size in em not checked |
| XC-ACC-007 | Text shall have a contrast ratio of at least 4.5 to 1, and large text and interface parts at least 3 to 1, in light and dark modes. | - | M | T | Partial | Design tokens in src/theme.css, src/calm.css |
| XC-ACC-008 | Pages shall stay usable with no sideways page scrolling at a width of 320 CSS pixels, and at 200 percent text zoom. | - | M | T | Partial | @media rules in src/*.css |
| XC-ACC-009 | The system shall stop non-essential animation when the browser asks for reduced motion. | - | S | T | Partial | prefers-reduced-motion in src/styles.css, src/theme.css |
| XC-ACC-010 | Every chart shall have a data table or a text alternative with the same values. | - | M | T | Partial | Some charts only; 95b-site.js a11y page states the limit |
| XC-ACC-011 | Every form control shall have a programmatic label. | - | M | T | Partial | 76-crud.js forms, 95b-site.js |
| XC-ACC-012 | The system shall open in Thai unless the user has chosen English. | - | M | T | Partial | 00-core.js LANG, L, tx |
| XC-ACC-013 | Every screen label and message shall exist in Thai and English through one translation layer. | - | M | T | Partial | 00-core.js L, tx; sweep opens every page in both |
| XC-ACC-014 | The system shall let a user change language at any time, and shall keep the choice for the next visit. | - | S | D | Partial | 20-shell.js language switch, fisko-lang |
| XC-ACC-015 | The system shall generate official PDF documents in Thai with the TH Sarabun New font embedded. | - | M | I | Planned | - |
| XC-ACC-016 | The system shall show Buddhist-era years in Thai and Common-era years in English, and shall store dates in ISO 8601 form. | - | M | T | Partial | 00-core.js fdate |
| XC-ACC-017 | The system shall count the fiscal year from 1 October to 30 September and shall name it by the Buddhist-era year in which it ends. | - | M | T | Partial | 00-core.js fyOf |
| XC-ACC-018 | The system shall show and count every date and time in the Asia/Bangkok time zone. | - | M | T | Planned | - |

## Data and storage {#xc-data}

PostgreSQL holds the business data, and row-level security separates tenants (ADR-0005). Files use the S3 API (ADR-0010). Documents follow ADR-0011. Legal limits follow ADR-0007.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-DAT-001 | PostgreSQL shall be the source of truth, and every other store shall be rebuildable from it or hold only files. | - | M | I | Planned | - |
| XC-DAT-002 | Every tenant-owned row shall carry a `tenant_id`. | - | M | T | Planned | - |
| XC-DAT-003 | Row-level security shall stop the database returning a row of another tenant, on every tenant-owned table. | - | M | T | Planned | - |
| XC-DAT-004 | The system shall hold and compute money only in an exact decimal type, using `BigDecimal` in Java. | - | M | T | Planned | - |
| XC-DAT-005 | The system shall store files only through the S3 API, so that storage can change with no code change. | - | M | T | Planned | - |
| XC-DAT-006 | The system shall scan every upload with ClamAV, and shall refuse its download until it passes. | - | M | T | Planned | - |
| XC-DAT-007 | The system shall encrypt files under the keys of their tenant. | - | M | T | Planned | - |
| XC-DAT-008 | The system shall export all data of one tenant, with its files, in a documented format. | - | M | T | Planned | - |
| XC-DAT-009 | The system shall sign approved PDF documents with PAdES with long-term validation, so that a signature stays verifiable after its certificate expires. | ETA 9, ETA 26 | M | T | Planned | - |
| XC-DAT-010 | The system shall never change a signed document. A correction shall create a new version. | - | M | T | Planned | - |
| XC-DAT-011 | The system shall keep a retained electronic record readable and unaltered until its retention period ends, with the data that shows its origin and time. | ETA 12 | M | T | Planned | - |
| XC-DAT-012 | Document templates shall be tenant data, so that a tenant can change a template with no code change. | - | S | D | Planned | - |
| XC-DAT-013 | Legal limits shall be dated rules in code, and a record shall keep the rule version in force when it started. | - | M | T | Partial | 61-cases.js ADMIN.procrules effective dates |
| XC-DAT-014 | The system shall refuse a tenant setting outside its allowed range. | - | M | T | Partial | 61-cases.js BIND_ADMIN.procrules pc-save |
| XC-DAT-015 | CSV exports shall be UTF-8 with a byte order mark, so that spreadsheet tools show Thai correctly. | - | S | T | Partial | 73-t4.js CSV export |

## API {#xc-api}

REST APIs and events follow ADR-0002, ADR-0003 and ADR-0008. Rate and paging figures are proposals (OI-XC-03).

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-API-001 | Every REST API shall be described in OpenAPI 3.1. | - | M | I | Planned | - |
| XC-API-002 | Every published event shall be described in AsyncAPI. | - | M | I | Planned | - |
| XC-API-003 | The system shall take the tenant from the verified access token, and shall ignore any tenant value in the request. | - | M | T | Planned | - |
| XC-API-004 | Modules shall call each other only through published interfaces and events. | - | M | T | Planned | - |
| XC-API-005 | Event consumers shall be idempotent, so that an event delivered twice has the effect of one. | - | M | T | Planned | - |
| XC-API-006 | API errors shall use one format, RFC 9457 problem details, with a stable error code. | - | S | T | Planned | - |
| XC-API-007 | A public API shall carry a major version, and a replaced version shall keep working for 12 months (proposal). | - | S | I | Planned | - |
| XC-API-008 | The system shall limit each API client to 600 requests a minute (proposal), and shall answer HTTP 429 above it. | - | S | T | Planned | - |
| XC-API-009 | List endpoints shall return at most 200 rows a page (proposal). | - | S | T | Planned | - |

## Search {#xc-search}

Thai text has no spaces between words, so search needs a Thai tokenizer (ADR-0009). PostgreSQL stays the source of truth.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-SRC-001 | The system shall offer one search box across pages and records. | - | S | D | Partial | 56-search.js searchItems |
| XC-SRC-002 | Search shall use OpenSearch with a Thai tokenizer behind a search interface, so that a Thai word inside unspaced text can be found. | - | M | T | Planned | - |
| XC-SRC-003 | The system shall never index Restricted data. | - | M | T | Planned | - |
| XC-SRC-004 | The server shall filter every query by tenant. | - | M | T | Planned | - |
| XC-SRC-005 | Search shall return only records that the role of the user may open. | - | M | T | Partial | 56-search.js allowed(page) |
| XC-SRC-006 | The operator shall be able to rebuild a search index from PostgreSQL with no loss of business data. | - | M | T | Planned | - |
| XC-SRC-007 | A saved change shall reach the search index within 60 seconds (proposal). | - | S | T | Planned | - |
| XC-SRC-008 | The small setup shall offer the same search interface on PostgreSQL search. | - | S | T | Planned | - |

## Observability {#xc-observability}

The operator must be able to see each cell, and telemetry must hold no personal data (ADR-0015, ADR-0017).

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-OBS-001 | The system shall emit metrics, logs and traces through OpenTelemetry, for Prometheus, Grafana and Loki. | - | M | I | Planned | - |
| XC-OBS-002 | Every metric, log line and trace shall carry its cell and tenant. DG-XC-23 in the SDS asks whether route-level metrics may leave out the tenant. | - | M | T | Planned | - |
| XC-OBS-003 | Telemetry and application logs shall contain no personal data, and an automated test shall check this. | - | M | T | Planned | - |
| XC-OBS-004 | The operator shall have a dashboard per cell of availability, latency, error rate, outbox depth and integration state. | - | M | D | Planned | - |
| XC-OBS-005 | The system shall alert the operator when the error rate of a cell stays above 1 percent for 5 minutes (proposal). | - | S | T | Planned | - |

## DevSecOps and supply chain {#xc-devsecops}

As an open-source product, its releases must be verifiable by others (ADR-0017).

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-DSO-001 | SonarQube and OWASP ZAP shall run in CI, and a critical or high finding shall stop the release. | - | M | T | Planned | - |
| XC-DSO-002 | CI shall scan dependencies for known vulnerabilities on every build. | - | M | T | Planned | - |
| XC-DSO-003 | Every release shall include a CycloneDX SBOM. | - | M | I | Planned | - |
| XC-DSO-004 | Every release artifact shall be signed, and others shall be able to verify the signature. | - | M | T | Planned | - |
| XC-DSO-005 | An independent party shall run a penetration test before each major release. | - | M | I | Planned | - |
| XC-DSO-006 | The project shall release a fix for a critical vulnerability within 7 days of confirming it (proposal). | - | S | A | Planned | - |

## Deployment {#xc-deployment}

One codebase runs as the hosted service and in two supported setups (ADR-0012). The GDCC risk in ADR-0012 stays open, as the [assumptions](#ov-assumptions) show.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-DEP-001 | The hosted service shall run on a Thai commercial cloud, with AWS Thailand `ap-southeast-7` as the default while the managed services it needs are available there. | - | M | I | Planned | - |
| XC-DEP-002 | The hosted service shall use managed PostgreSQL, Kubernetes, object storage and KMS across three zones. | - | M | I | Planned | - |
| XC-DEP-003 | One codebase shall support two setups: Small on Docker Compose, and Enterprise on Kubernetes with high availability. | - | M | I | Planned | - |
| XC-DEP-004 | The Small setup shall run with no RabbitMQ and no OpenSearch. | - | S | T | Planned | - |
| XC-DEP-005 | Application code shall use open interfaces only, so that it can run on GDCC or in an agency data centre. | - | M | I | Planned | - |
| XC-DEP-006 | Infrastructure shall be defined with OpenTofu, Helm and Argo CD. | - | M | I | Planned | - |
| XC-DEP-007 | A self-hosted setup shall keep its secrets in OpenBao. | - | M | I | Planned | - |
| XC-DEP-008 | The system shall serve screens per tenant from configuration, and shall hold no agency-specific code. | - | M | I | Partial | 95b-site.js SITE_CFG; 96-data-sample-site.js |

## Licences {#xc-licences}

The whole product is AGPL-3.0, and revenue comes from hosting and support (ADR-0001).

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-LIC-001 | The whole product shall be licensed under AGPL-3.0. | - | M | I | Planned | - |
| XC-LIC-002 | Every user of a hosted service shall be able to reach the source code of the running version from a link in the product. | - | M | D | Planned | - |
| XC-LIC-003 | A licence audit in CI shall stop the build when a dependency is not compatible with AGPL-3.0. | - | M | T | Planned | - |
| XC-LIC-004 | Security, audit and PDPA features shall stay in the public code, and there shall be no paid edition of the code. | - | M | I | Planned | - |
| XC-LIC-005 | The code shall be published from a new repository whose history holds no tenant data and no personal e-mail address. | - | M | I | Planned | - |
| XC-LIC-006 | The public repository shall contain `LICENSE`, `SECURITY.md` and `CONTRIBUTING.md`. | - | M | I | Planned | - |
| XC-LIC-007 | The project shall choose a contributor agreement before it accepts the first outside contribution. | - | M | I | Planned | - |
| XC-LIC-008 | Every font shipped with the product shall have a licence that allows redistribution. | - | M | I | Planned | - |

## Artificial intelligence {#xc-ai}

AI is optional and sits behind one gateway (ADR-0016). A person makes every decision. Module chapters state what each AI feature may do, within these rows.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-AI-001 | Every AI call shall go through the one model gateway in the `platform` module. | - | M | T | Planned | - |
| XC-AI-002 | AI shall be off for a new tenant until an administrator of that tenant opts in. | - | M | T | Partial | 44b-intel-tabs.js agentOn; seeded on in 05-shared.js |
| XC-AI-003 | Every feature shall work with AI switched off. | - | M | T | Partial | 67-procai.js aiOff |
| XC-AI-004 | The gateway shall remove personal data from a prompt before it sends it, and a Thai-language test set shall check this. | - | M | T | Planned | - |
| XC-AI-005 | The gateway shall never send Restricted data to a model. | - | M | T | Planned | - |
| XC-AI-006 | The gateway shall apply a per-tenant policy of allowed features and providers, and shall refuse a call outside it. | - | M | T | Planned | - |
| XC-AI-007 | The gateway shall log each call with time, tenant, user, feature, provider and model. | - | M | T | Planned | - |
| XC-AI-008 | Each tenant shall be able to choose its provider, including a model hosted in Thailand. | - | S | D | Planned | - |
| XC-AI-009 | Before a tenant opts in, the system shall show where the chosen provider processes prompts. | PDPA 28 | M | D | Planned | - |
| XC-AI-010 | AI output shall be advice only. A person shall make every decision, and the system shall record who decided. | - | M | T | Planned | - |
| XC-AI-011 | The system shall label AI output on screen as AI output. | - | S | D | Partial | 67b-agents.js PROC.agents notice |

## Testing {#xc-testing}

Each test links to a requirement, so that coverage can be measured (ADR-0017). The [Verification](#verification) chapter holds test levels and acceptance criteria.

| ID | Requirement | Clause | Priority | Verify | Status | Prototype |
| --- | --- | --- | --- | --- | --- | --- |
| XC-TST-001 | Back-end tests shall use JUnit with Testcontainers. | - | M | I | Planned | - |
| XC-TST-002 | End-to-end tests shall run in Playwright and shall keep the scenarios of `tests/sweep.js`. | - | M | I | Partial | tests/sweep.js holds the scenarios |
| XC-TST-003 | A k6 load test against the 30 September peak shall run before each major release. | - | M | T | Planned | - |
| XC-TST-004 | Each automated test shall link to the SRS requirement it verifies. | - | M | I | Planned | - |
| XC-TST-005 | CI shall test row-level security on every tenant-owned table. | - | M | T | Planned | - |
| XC-TST-006 | CI shall run the Spring Modulith boundary tests on every build, and no switch shall turn them off. | - | M | T | Planned | - |
| XC-TST-007 | Each release shall pass its tests on both supported setups. | - | M | T | Planned | - |
| XC-TST-008 | Each release shall pass a compatibility test on every documented storage product. | - | S | T | Planned | - |
| XC-TST-009 | An automated test shall run every module with AI switched off. | - | M | T | Planned | - |
| XC-TST-010 | Each release shall pass an automated accessibility check and a manual screen reader check in Thai. | - | M | T | Planned | - |

## Test evidence {#xc-evidence}

A Prototyped row rests on one of the checks below in `tests/sweep.js`. Each check raises an error when the result is wrong. The author read these checks and did not run them for this version.

| Sweep check | What it asserts | Related requirements |
| --- | --- | --- |
| BAD pattern | No page, tab or chat answer holds a broken value, for every role, language and sample organisation | XC-USA-001 |
| Review step | A record action shows the amount in a review step, and confirming it applies the action | XC-USA-005 |
| Round 65 | The footer shows the agency and all policy links in both languages. Each policy page opens. A blocked save marks and focuses its field | XC-USA-002, XC-USA-003, XC-ACC-004 |
| Round 66 | The session ends after the idle time. No design code stays in a page label | XC-SEC-007, XC-USA-004 |

The policy pages check opens each page and looks for broken text, and the footer check counts one link per page. Neither reads the policy wording. Round 64 proves the outbound buffer for the project management exchange only, so XC-INT-004 stays Partial. The sweep runs in a browser, so it proves nothing about the server, the database or any network.

## Open issues of the cross-cutting chapter {#xc-open}

| Issue | Question | Needed from | Effect on this chapter |
| --- | --- | --- | --- |
| OI-XC-01 | Confirm or replace every performance target, and give the size of the peak load per cell | Product owner | Performance rows, XC-PER-008 |
| OI-XC-02 | Confirm or replace availability, RPO, RTO and the maintenance window | Product owner | XC-AVL-001, XC-AVL-002, XC-AVL-003, XC-AVL-007 |
| OI-XC-03 | Confirm the other proposals: idle range, sign-in lockout, key rotation, key drills, audit checkpoints, API limits, index delay, alert threshold, supported browsers, the time to fix a critical flaw | Product owner, security reviewer | Rows marked as a proposal outside the two sections above |
| OI-XC-04 | What counts as finance and payments for ASVS Level 3 | Product owner, security reviewer | XC-SEC-002 |
| OI-XC-05 | Confirm the PDPA clause numbers, the 15-day limit, the processor limit of 72 hours, legal bases and erasure by key destruction, including the draft PDPC guidance | Thai PDPA lawyer | Privacy rows, XC-SEC-039 |
| OI-XC-06 | ADR-0014 lists access, correction, deletion and objection, while the prototype privacy page also promises copy and restriction. Confirm the list, and whether PDPA portability applies | Thai PDPA lawyer, product owner | XC-PRV-010 |
| OI-XC-07 | Retention periods per record type, including the audit log, application logs and backups | Records officer, Thai PDPA lawyer | XC-PRV-014, XC-SEC-042, XC-DAT-011 |
| OI-XC-08 | Which clauses of the Cybersecurity Act and the Digital Government Administration Act bind the agency or the operator, including log keeping and incident reporting | Legal unit | Security rows, which show a dash today |
| OI-XC-09 | How to cite the Government Website Standard มสพร. 11-2566 in the clause register, and which of its sections Fisko must answer | Product owner, legal unit | Usability and accessibility rows, XC-SEC-007 |
| OI-XC-10 | Confirm the ETA clauses, and choose the certificate authority and timestamp service with ETDA guidance in mind | Legal unit, product owner | XC-DAT-009, XC-DAT-011 |
| OI-XC-11 | Proposal, from the Procurement SDS: the sealed bids of XC-SEC-028 are only the RFQ replies sent through the supplier portal, because official bids stay in e-GP and reach Fisko only after closing. Confirm this reading. OI-PRC-13 and OI-PRC-17 ask the same | Legal unit, product owner | XC-SEC-028 |
| OI-XC-12 | Lawyer review of the licence, the contributor agreement (CLA or DCO) and the trademark, and the redistribution licence of TH Sarabun New | Lawyer, product owner | XC-LIC-007, XC-LIC-008 |
| OI-XC-13 | The category code `I18` has a digit, and the id patterns in `scripts/build_spec.py` accept letters only, so an `XC-I18` row would drop out of the requirement list. Fix the patterns, or keep language rows under `XC-ACC` | Development team | XC-ACC-012 to XC-ACC-018 |

The design and the prototype differ in the following places. The code says what exists, the design says what is intended, and each difference is carried by the row named.

| Topic | Design | Code | Row |
| --- | --- | --- | --- |
| AI default | Off until a tenant opts in | The seed data has the agents on | XC-AI-002 |
| Audit log | Append-only and hash-chained, kept for the retention period | A list in browser storage, cut to the latest 300 entries | XC-SEC-033, XC-SEC-042 |
| Sign-in | Keycloak with MFA | Simulated, with a fixed code and a role switcher | XC-SEC-005, XC-SEC-015 |
| Third-party requests | Scripts, styles and fonts from the Fisko origin only | `src/head.html` loads fonts from Google Fonts, while the cookie policy says there is no cross-site tracking | XC-SEC-012, XC-PRV-018 |
| Official documents | Thai PDF with TH Sarabun New | Not yet in that font, as the accessibility page states | XC-ACC-015 |
| Footer | A link to the source code under AGPL-3.0 | The footer says all rights reserved, and has no source link | XC-LIC-002 |
| Money | Exact decimal | JavaScript numbers | XC-DAT-004 |
| Business data | On the server, per tenant | In browser storage | XC-SEC-014, XC-DAT-001 |

## Status summary {#xc-status}

The statuses come from reading the code and the tests, and nothing here is production code. The counts include the `XC-INT` rows of the [External interfaces](#interfaces) chapter.

| Set | Prefix | Prototyped | Partial | Planned | Total |
| --- | --- | --- | --- | --- | --- |
| Security, encryption and audit | `XC-SEC` | 1 | 5 | 36 | 42 |
| Privacy | `XC-PRV` | 0 | 4 | 14 | 18 |
| Performance | `XC-PER` | 0 | 0 | 8 | 8 |
| Availability | `XC-AVL` | 0 | 1 | 9 | 10 |
| Scalability | `XC-SCL` | 0 | 0 | 9 | 9 |
| Usability | `XC-USA` | 5 | 4 | 1 | 10 |
| Accessibility and language | `XC-ACC` | 1 | 15 | 2 | 18 |
| Data | `XC-DAT` | 0 | 3 | 12 | 15 |
| API | `XC-API` | 0 | 0 | 9 | 9 |
| Search | `XC-SRC` | 0 | 2 | 6 | 8 |
| Observability | `XC-OBS` | 0 | 0 | 5 | 5 |
| DevSecOps | `XC-DSO` | 0 | 0 | 6 | 6 |
| Deployment | `XC-DEP` | 0 | 1 | 7 | 8 |
| Licences | `XC-LIC` | 0 | 0 | 8 | 8 |
| Artificial intelligence | `XC-AI` | 0 | 3 | 8 | 11 |
| Testing | `XC-TST` | 0 | 1 | 9 | 10 |
| Integration | `XC-INT` | 0 | 5 | 9 | 14 |
| **Total** |  | **7** | **44** | **158** | **209** |
