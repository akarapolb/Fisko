# Authoring brief for the SRS and SDS chapters

Read this before writing a chapter. The Procurement chapters are the pilot: match their structure, depth and tone.

- `docs/spec/src/srs/en/13-prc-procurement.md`
- `docs/spec/src/sds/en/13-prc-procurement.md`

Fisko has no production code. The prototype shows behaviour. The SRS says what the product must do. The SDS designs the production system decided in `docs/adr/`, so all of it is a proposal to build.

## Files

- Chapters: `docs/spec/src/{srs,sds}/{th,en}/<name>.md`. Thai and English carry the SAME blocks in the SAME order (heading, paragraph, list, table with the same rows, callout, figure, code block). The build stops on a mismatch. Write English in full. Generating both from one source in your scratchpad works well.
- Keep the H1 and its `{#id}` from the stub. Do not edit `_meta.json`.
- Dialect: the docstring of `scripts/build_spec.py`.
- Clause rows: your own new file `docs/spec/src/law/law-<NN>-<name>.tsv`, with the same 11 tab-separated columns and header as `law-01-initial.tsv`. Never edit another agent's file, and do not repeat a ref that exists in any `law-*.tsv`.
- Diagrams: `docs/spec/src/diagrams/<prefix>-*.puml`, rendered with `python scripts/render_diagrams.py <ids>`. Start from an existing `prc-*.puml`. Labels use `$t("ไทย", "English")`. Use the palette in `include/common.puml`. Open each PNG and fix anything unreadable. Split a diagram rather than shrink it.
- Do not commit, push, or edit any file outside your assignment. If you find an error elsewhere, report it.

## Hard rules

- Fisko is generic SaaS. No agency names anywhere (no DPT, MEA, กรมโยธาธิการ, การไฟฟ้า) and no sample record ids. Agency values are tenant settings with an allowed range. Sample data in `src/js/*data-*` is never a source of requirements. `MEA_TOR_P2P_Gap_Analysis.html` may inform what is needed but is never named.
- Legal limits are dated rules in code, tenant choices are settings (ADR-0007).
- Never invent a number. It comes from a clause, the code or an ADR, or it is marked as a proposal.
- Never invent a legal clause. Cite only what the code or a Fisko design document cites, or what you are certain of. Every cited ref needs a register row whose notes say who must confirm it, for example `To be confirmed by a procurement specialist`. If you cannot cite, use `-` and raise an open issue.
- Clause ref forms: `PPA n` Public Procurement Act 2560, `PPR n` procurement regulation 2560, `PDPA n`, `BPA n` Budget Procedures Act 2561, `BMR n` Regulation on Budget Administration 2562, `TRR n` Ministry of Finance treasury regulation 2562 (เบิกเงินจากคลัง), `ADV n` Regulation on Advance Funds 2562, `FDA n` State Fiscal and Financial Disciplines Act 2561, `DGA n` Digital Government Administration Act 2562, `CSA n` Cybersecurity Act 2562, `ETA n` Electronic Transactions Act 2544.
- Every unresolved matter is a `> [!OPEN]` callout or an open-issue row that says who decides. No TBD.
- Plain words and short sentences. No emoji, arrow glyphs or check marks. Avoid "not X but Y" and em-dash asides.
- Thai is formal and keeps English product and technical names. Thai uses ผู้ขาย for supplier, matching the code.
- Callouts: `[!NOTE]`, `[!WARN]`, `[!OPEN]`, `[!LAW]`.

## Requirement rows (SRS)

- English header exactly: `| ID | Requirement | Clause | Priority | Verify | Status | Prototype |`. Thai: `| ID | ข้อกำหนด | Clause | ความสำคัญ | วิธีตรวจ | สถานะ | Prototype |`.
- IDs: `<MOD>-FR-001`, `-NFR-`, `-IR-`, `-DR-`, `-CR-`, `UC-<MOD>-01`, `BR-<MOD>-01`, `OI-<MOD>-01`. Modules: `PLT`, `BGT`, `PRC`, `FIN`, `PRJ`, `REV`. Platform-wide rows in the cross-cutting chapter: `XC-<CAT>-001`, with CAT from `CAT_CODE` in `scripts/build_spec.py`.
- One testable "the system shall" per row; Thai "ระบบต้อง". Give a number or a rule. No "etc.", "appropriate" or "fast".
- Priority M, S, C. Verify T, D, I, A.
- Status is honest. `Prototyped`: the behaviour exists AND a specific check in `tests/sweep.js` or the e2e code covers it; a page-open sweep is not enough. `Partial`: part exists, or it exists with no specific check. `Planned`: it does not exist. Read the code and tests. Do not run the sweep.
- Prototype column: file and function or sweep check, else `-`.
- Cross-cutting rules go in the cross-cutting chapter and platform matters in the PLT chapter. Refer to them, do not restate.

## Module chapters: required sections

SRS, with ids prefixed by the lowercase module: purpose, actors, usecases, rules, fr (one `###` per feature group), data, states, interfaces, nfr, cr, tests, open, status. End with `{{status-summary: prefix=<MOD>}}`.

SDS: purpose, decisions, components, domain, states, dynamic, data, interfaces, security, nfr, tests, migration, open. Cite real requirement ids only. Use `DG-<MOD>-nn` for design open issues. Diagrams: `<mod>-component`, `<mod>-class`, `<mod>-state-*`, `<mod>-activity-*`, at least two `<mod>-seq-*`, `<mod>-er`.

Spring Modulith dependency direction, already fixed by the Procurement chapter: `finance` depends on `procurement.api` and implements an SPI, which avoids a cycle.

## Build and finish

From `D:\Claude\Fisko-proc` with `PYTHONIOENCODING=utf-8`: `python scripts/build_spec.py <srs|sds> --no-docx`. Other agents may be building at the same time, so if the output files clash, run it again. Fix every error and every warning about your files. Grep your files for DPT, MEA, กรมโยธา, การไฟฟ้า, ผู้ค้า, emoji and TBD.

Report back: files written; counts by type and status; defects found in the code; design-versus-code differences; clauses to confirm; errors found in other chapters. Do not paste chapters into the report.
