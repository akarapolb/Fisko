# Fisko

Fisko is a proposed agency e-budgeting platform for Thai government budget units (system name: AEBMS, Agency e-Budgeting Management System). It covers the full budget cycle, from strategic planning and budget requests through review, submission to the Budget Bureau, allocation, execution monitoring and performance, with AI assistance throughout.

This repository holds the conceptual design material and a clickable prototype prepared by Avalant for customer discussions. All figures, people and projects in the prototype are fictional sample data.

## Contents

| File | What it is |
|---|---|
| `Fisko_Prototype.html` | Standalone clickable prototype. Open it directly in a browser. Includes both sample organizations. |
| `fisko-prototype.html` | Build of the prototype for publishing as a claude.ai artifact (no document wrapper; excludes the real-agency sample). |
| `Fisko_Demo_Script.html` | 15-minute presenter script (Thai, with English lines). |
| `Fisko_Solution_Design.html` | Solution Design Document v0.2 (Thai): functional, application, technical, data, integration, AI and security design. |
| `Fisko_Conceptual_Architecture.pptx` / `.pdf` | Customer deck: conceptual architecture and functional modules. |
| `src/` | Prototype source. |

## Prototype

- All 10 modules: M01 Strategic Planning, M02 Budget Preparation, M03 Consolidation, M04 Review & Approval, M05 Submission, M06 Allocation, M07 Execution Monitoring, M08 Performance, M09 Budget Intelligence (AI), M10 System Administration.
- Six roles (division, planning, executive, finance, auditor, administrator), Thai/English, light and dark themes.
- Deeper module features, built in rounds and listed in [ROADMAP.md](ROADMAP.md). Round 8 added the M01 project bank and plan revision, the M02 standard-price catalogue and paste from Excel, and the M03 ceiling responses and 4-year forward estimates.
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
| `src/js/52-demo.js` | In-app demo guide |
| `src/js/99-boot.js` | Startup |

## Status

Discussion material only. The design has not been checked against a specific TOR, integration channels are subject to approval by each system owner, and the Fisko name still needs a trademark check.
