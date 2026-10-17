# Fisko

Fisko is a proposed agency e-budgeting platform for Thai government budget units (system name: AEBMS, Agency e-Budgeting Management System). It covers the full budget cycle, from strategic planning and budget requests through review, submission to the Budget Bureau, allocation, execution monitoring and performance, with AI assistance throughout.

This repository holds the conceptual design material and a clickable prototype prepared by Avalant for customer discussions. All figures, people and projects in the prototype are fictional sample data.

## Contents

| File | What it is |
|---|---|
| `Fisko_Prototype.html` | Standalone clickable prototype. Open it directly in a browser. Includes both sample organizations. |
| `fisko-prototype.html` | Build of the prototype for publishing as a claude.ai artifact (no document wrapper; excludes the real-agency sample). |
| `Fisko_Demo_Script.html` | Presenter script (Thai): 15 minutes plus a 10-minute Procurement and Finance extension (steps 16 to 24). |
| `Fisko_Solution_Design.html` | Solution Design Document v0.3 (Thai): functional, application, technical, data, integration, AI and security design. |
| `Fisko_Conceptual_Architecture.pptx` / `.pdf` | Customer deck: conceptual architecture and functional modules. |
| `Fisko_Product_Family_Concept.html` | Concept v0.2 (Thai): Fisko Budget, Procurement and Finance as one product family on a shared core. Decisions D-F01 to D-F03 and D-F06 recorded; D-F04 and D-F05 open. |
| `Fisko_Procurement_Design.html` | Fisko Procurement detailed design v0.2 (Thai): lifecycle and states, functions, rules and logic, data and OCDS mapping, AI use cases, analytics and red flags, plus the complete feature map (FR-PR-36 to 62), agentic AI, document intake and OCR, forecast and what-if, the boundary with Fisko Assets, and build rounds Q1 to Q6. Draft. |
| `HANDOFF.md` | Where things stand, how to run and change the prototype, decisions, limits and next steps. |
| `ROADMAP.md` | The deeper feature planned for each module (all built). |
| `src/` | Prototype source. |

## Prototype

- All 10 modules: M01 Strategic Planning, M02 Budget Preparation, M03 Consolidation, M04 Review & Approval, M05 Submission, M06 Allocation, M07 Execution Monitoring, M08 Performance, M09 Budget Intelligence (AI), M10 System Administration.
- Eight roles (division, planning, executive, finance, auditor, administrator, procurement officer, head of procurement), Thai/English, light and dark themes.
- Deeper module features, built in rounds and listed in [ROADMAP.md](ROADMAP.md). Round 8 added the M01 project bank and plan revision, the M02 standard-price catalogue and paste from Excel, and the M03 ceiling responses and 4-year forward estimates. Round 9 added M04 budget hearings and cut impact, M05 parliament stages, and M06 allotment releases and carry-over. Round 10 added the M07 year-end forecast and procurement milestones, M08 project evaluation (lessons flow to the M01 project bank), M09 spending anomalies and justification quality, and M10 notification templates, SLA escalation, retention and backup.
- Round 11 added light versions of **Fisko Procurement** (procurement plan, requisitions, contracts with acceptance phases, e-GP file import) and **Fisko Finance** (allocation-to-payment chain, payment approvals, GFMIS file reconciliation), plus duty-separation rules (M10 → Duty separation). They are built on the FY2570 allocation lines and use files only for e-GP and GFMIS.
- Round 13 built P0 and P1 of the [Procurement design](Fisko_Procurement_Design.html): a **procurement case file** with 12 steps (method advice from a rules table in M10, head-of-procurement approval of overrides, committees with checks, reference price, e-GP details, bidders, award, appeal window, contract gate), a split-purchase check on requisitions, a new duty rule SD-06, and an event timeline per case. Appeal-period and holiday rules are settings in M10 → Procurement rules; legal thresholds other than the few confirmed ones are marked as to be confirmed.
- Round 14 built P2 of the Procurement design: contract guarantee with expiry warnings, delivery notices and acceptance deadlines, penalties for late delivery, acceptance with partial results and recorded dissent, contract changes (amount or time) approved by a ladder with new contract versions, a **three-way payment gate** (acceptance, invoice, guarantee) in front of Finance with exception release, and closing the case. New duty rule SD-08. Rates and ladders are settings in M10 → Procurement rules.
- Round 15 built P3 of the Procurement design: an **Analytics** tab (case funnel, KPI-01 to KPI-14 defined once, time in each step), a **Red flags** tab (RF-01 to RF-10 with scores, evidence and a triage workflow: ask, explain, decide, count false positives) and an **OCDS 1.1 export** of published data only (JSON shown on the page, with copy and download). Thresholds are settings in M10 → Procurement rules.
- Round 16 built P4 of the Procurement design: an **AI assistant** tab with AI-01 (consolidation and split watch), AI-02/11 (document drafts with edit tracking), AI-03 (reference price with evidence), AI-04 (TOR spec-lock and completeness check), AI-05 (method advice), AI-07 (late-delivery risk), AI-09 (questions answered from the KPI layer) and AI-10 (supplier record summary). It uses rules and statistics only, logs every use in M09, respects the M09 agent switches (new agents AG-07, AG-08, AG-10), and declines to score bids, pick suppliers, announce winners or approve.
- Round 18 built Q1 of design v0.2 (sourcing in depth): a **TOR library** with versions approved by the head of procurement, market research per case, **conflict-of-interest declarations** with duty rule SD-07 and member replacement, published **evaluation criteria** and a scoring matrix where committee members enter their own scores and the system only adds them up, Q&A and amendments during the announcement, an e-GP data pack, and a warning when the e-GP file is ahead of the case.
- Round 19 built Q2 (contract late stage and suppliers): supervisor weekly reports and 50% / 75% / end checkpoints, termination approved by the executive (guarantee forfeited, open phases cancelled, commitment reduced), warranty period and defect claims, letters to suppliers from templates with sent dates, a **supplier register** with tax-ID check and history, and the **abandoned-work list** check before award and contract. The Procurement and Finance pages no longer repeat their menu as a tab row; the left menu is the only navigation.
- Round 20 built Q3 (plan and reports): procurement **categories**, **plan versions** proposed by the officer, approved by the executive and recorded as published in e-GP (requisitions only for items in the published plan), demand intake from M06 lines and next year's M02 requests, the **monthly procurement summary** in the สขร.1 layout with gap checks and publishing, an **audit dossier** per case, and a **timeline (Gantt)** of every case against the fiscal year.
- An **app switcher** (click the logo at the top of the menu) moves between Fisko Budget, Fisko Procurement and Fisko Finance. Each app shows only its own menu; My Workspace and System Administration are shared.
- Simulated SSO sign-in with two-factor codes (the prototype code is `246810`), global search (Ctrl+K or `/`), a change-history drawer on records, and delegation of authority (acting on another user's behalf, recorded in the audit log).
- Two sample organizations: a fictional department, and กรมโยธาธิการและผังเมือง with fictional figures and an indicative unit structure.
- State is kept in the browser's local storage. Use **Reset data** or the **Demo guide** (bottom of the left menu) to start over.

### Build

The prototype is plain HTML, CSS and JavaScript with no dependencies. Edit the files in `src/`, then run:

```bash
bash src/build.sh
```

This regenerates `Fisko_Prototype.html` and `fisko-prototype.html`.

### Source layout

| Path | Purpose |
|---|---|
| `src/head.html`, `src/body.html`, `src/styles.css` | Page shell and styles |
| `src/js/00-core.js` | Language, formatting, state, roles, router, audit and notifications |
| `src/js/05-shared.js`, `06-seedhelp.js` | Shared reference data and seed builder |
| `src/js/10-data-sample.js`, `11-data-dpt.js` | Sample organizations (`*data-dpt*` is left out of the artifact build) |
| `src/js/20-shell.js`, `30-home.js` | Navigation, top bar, notifications, My Workspace |
| `src/js/40*`–`48*` | Modules M07, M02, M04, M03, M09, M01, M05, M06, M08 |
| `src/js/50-admin.js` | M10 System Administration |
| `src/js/60-procurement.js`, `61-cases.js`, `61b-sourcing.js`, `63-contracts.js`, `63b-contract-late.js`, `61c-planreports.js`, `65-analytics.js`, `67-procai.js`, `62-finance.js`, `64-duties.js` | Fisko Procurement (plan, requisitions, contracts), procurement case files and rules, Fisko Finance, duty-separation rules |
| `src/js/66-apps.js` | App switcher and the per-app menu |
| `src/js/52-demo.js` | In-app demo guide |
| `src/js/99-boot.js` | Startup |

## Status

Discussion material only. The design has not been checked against a specific TOR, integration channels are subject to approval by each system owner, and the Fisko name still needs a trademark check.
