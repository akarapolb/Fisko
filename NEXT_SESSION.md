# Fisko: handoff for the next session

Written 18 October 2026, after round 35; updated after round 43 (Finance information architecture, branch `finance-ia`). This is the short version: where things stand, how to work, and what to do next. The full record of every round is in `HANDOFF.md`, sections 1 to 43.

## 1. Where things stand

Fisko is a discussion prototype of a Thai government budgeting platform with three apps:

- **Fisko Budget:** pages B1 to B11 since round 47 (old module codes M01 to M09 shown beside them; M10 stays shared), built to its own design (`Fisko_Budget_Design.html` v0.3, build rounds B1 to B6).
- **Fisko Procurement:** P1 to P18, built to its design (`Fisko_Procurement_Design.html` v0.2, rounds P0 to P4 and Q1 to Q6).
- **Fisko Finance:** F1 to F10, built to its design (`Fisko_Finance_Design.html` v0.3, rounds FN1 to FN6) and reorganised around the work in round 43. The page layout is declared in one file, `src/js/66h-fin-pages.js` (see section 4).

All three share My Workspace, M10 System Administration, the AI co-work chat (round 27) and one data set.

| Item | Where |
|---|---|
| Repository | `D:\Claude\Fisko`, branch `main`, remote `https://github.com/akarapolb/Fisko.git` |
| Last commit | `e969601` Round 35: demo guide, Budget design v0.2, test runner (working tree clean) |
| Published prototype | https://claude.ai/artifact/STW3X8Ytx3VVLV7VHLXse9 (private, from round 43, published from a cloud session). Earlier: https://claude.ai/artifact/5pZpV5JDgdLNBdnwHtYFuy (private, from round 37). The old link https://claude.ai/artifact/K8TJFETX7GMftoZYb9zFZR (version 43) belongs to another organisation's account and can't be updated from this one. |
| Published Budget design | https://claude.ai/artifact/EFs3q62eP5tVTZWMSFQkX9 (version 2, private) |
| Published Finance design | https://claude.ai/artifact/G4Sx84KthvJWcLJMAWPKD1 (version 1, private; `Fisko_Finance_Design.html` v0.1, round 36) |
| Data version | `DATA_V = 35` in `src/js/00-core.js` (bump it whenever the seed shape changes) |

## 2. How the user likes to work

- **Each round:** build, test, update `README.md` and `HANDOFF.md`, publish the prototype to the same URL, then **ask before committing**. Commit and push only when the user says so (they usually say "commit and push"). Use the wrap-up box with a "Commit and push" button.
- **New products or big areas:** ask a few scoping questions, write a design document in Thai first (same layout and style as the Budget and Procurement designs), get approval, then build in rounds.
- **Constraints:**
  - All figures are fictional.
  - Real-agency data (`*data-dpt*`) never goes into the published build.
  - No Avalant product names in the product. "Avalant" may appear as the document author.
  - AI and OCR are simulated (D-P09, D-P10). Agents never approve, award, sign, pay or change amounts; every write is a button a person presses.
  - Stock and assets belong to a separate product, Fisko Assets (D-P11).
- **Look and feel:** calm UI with one slate-navy accent (`#34498C`) and a light sidebar. Status colours appear only as small dots. Charts use the Fisko palette led by green (`--ch-1..6`).
- **Language:** the user writes in English. The app and all design documents are bilingual (Thai first).

## 3. Build, run, test, publish

```bash
bash src/build.sh
```

The build concatenates `src/head.html`, `styles.css`, `theme.css`, `calm.css`, `cowork.css`, `body.html` and `src/js/*.js` (in filename order) into `Fisko_Prototype.html` (standalone) and `fisko-prototype.html` (artifact).

```bash
python -m http.server 8787 --bind 127.0.0.1
```

- **Prototype:** `http://127.0.0.1:8787/Fisko_Prototype.html`. Add `?v=N` to dodge the browser cache. The passcode for every account is `246810`.
- **Tests:** `http://127.0.0.1:8787/tests/run.html` has three buttons:
  - **Full sweep:** about 6,000 checks in about 30 s, all passing at `e969601`.
  - **Quick:** the sample organisation and five roles.
  - **Demo walk:** all 39 steps.

  A check fails when page text contains undefined, NaN, [object, Infinity or Invalid; when code throws; or when a different page renders than the one asked for.
- **Other checks after a round:**
  - a phone-width look (375 px, `resize_window` preset mobile);
  - dark mode (`colorScheme: dark`);
  - a manual walk through the new flow;
  - desktop screenshots at a custom width of 1366 to 1440 px (the pane is narrower than the 860 px breakpoint).
- **Publish:** call the Artifact tool with `file_path` = `D:\Claude\Fisko\fisko-prototype.html` and `url` = the prototype link above. Rebuild first.

## 4. Gotchas worth remembering

- **Edit only `src/`.** The two HTML files at the root are build output.
- **No shared module scope.** All JS files share one global scope, so name clashes are real (`DOC_T`, `FY_END` and `FY_MONTHS` already bit). Features extend each other by wrapping: reassign function declarations or `VIEWS`/`BIND`/`REQ_PANELS` entries, and keep the base call. A `const` cannot be wrapped; edit the source file instead.
- **Load order is filename order.** Code that runs at load time can only use what earlier files define. `MATRIX` lives in `50-admin.js`, so later roles patch it inside a `renderShell` wrapper.
- **Use the test hook for routing.** Browsers ignore `history.replaceState` and hash changes after a few hundred calls in 10 seconds. Ad-hoc test loops must set `window.FISKO_ROUTE = "#page"` and call `route()`, as `tests/sweep.js` does.
- **Shell quoting.** Heredocs with Thai text or apostrophes break bash on this Windows machine. Write Python or JS patch scripts to the scratchpad and run them.
- **Long browser scripts.** The Browser pane's `javascript_tool` times out at 45 s. Start long runs, then poll in a second call.
- **Finance pages are declared, not wrapped.** Since round 43 a Finance round adds sections to `FS` and wiring to `FIN_BINDS`, then places the sections in `FIN_PAGES` (`66h-fin-pages.js`). Don't redefine `VIEWS.finance` or `BIND.finance`. Deep links are `fnc-<page>` or `fnc-<page>:<tab>`.
- **Seeds.** Seed extensions are `seedBudgetB1`…`seedBudgetB6` and the `seed*` functions called from `06-seedhelp.js`. Bump `DATA_V` when they change, or saved demo state hides the change.

## 5. Map of the newer code (rounds 26 to 35)

| File | What it holds |
|---|---|
| `src/calm.css`, `src/cowork.css` | Calm theme, chart palette, B1 to B6 styles; AI co-work styles |
| `68-cowork.js` | AI co-work chat (side panel, full page `#cowork`, agents, files, voice) |
| `41d-req-b1.js`, `49b-budget-b1.js` | Request steps, rules BR-07..13, division director, data spine `syncBudget()`, waterfall |
| `43d-cons-b2.js`, `45c-strategy-b2.js` | Five criteria, 3R, zero-based view, MTEF lock; national-plan links |
| `42d-review-b3.js`, `46c-sub-b3.js`, `47c-alloc-b3.js` | Committee, quorum, minutes, cut impact; minister gate, pack, briefing; lines from the act |
| `47d-alloc-b4.js` | Four-level balances, transfers by regulation (T1..T6), plan versions, savings, live M07 |
| `48c-perf-b5.js` | Quarterly reports, cost per output, three-stage evaluation, recommendations, public page |
| `69-budget-ai.js`, `69b-budget-settings.js` | Budget agents, forecast, what-ifs, KPI-B, signals; M10 "Budget AI and signals" settings |
| `52-demo.js`, `Fisko_Demo_Script.html` | Demo guide, 39 steps (26 to 39 cover the Budget cycle in depth) |
| `tests/run.html`, `tests/sweep.js` | Test runner and sweep |

Roles now: `div`, `divhead`, `plan`, `committee`, `exec`, `fin`, `audit`, `admin`, `proc`, `prochead`.

## 6. Open items

- **Procurement T1 to T4 are built (T4, round 40, is not committed or published).** See `HANDOFF.md` sections 37, 38, 39 and 40P. Only FR-PR-85 is left in design chapter 18. T2 to T4 follow design chapter 18. A parallel Finance FN1 build shares the working tree.

**From the Budget design** (chapter 13.4 of v0.2):

- Non-budget money (FR-B-18).
- Real e-Budgeting, BBL and BB EvMIS file formats (D-B03).
- A strategy-level risk register (FR-B-05).
- Divisions proposing KPI changes (FR-B-06).
- Central fund and supplementary requests (FR-B-34).
- A five-level budget structure in M10.
- Splitting steps 1 to 4 of the request form.
- A way to flag exceptions to the 20% cap (BR-11).
- Checking the Budget Administration Regulation (No. 2) of 2567 before real use.

**Not yet answered:** none. The user decided that menus a role can't use stay hidden rather than shown locked.

## 7. Suggested next steps

1. **Fisko Finance (recommended next).** Design v0.1 is done (round 36); FN1 to FN6 are all built (rounds 37 to 42: `66b` to `66g-fin-*.js`, `DATA_V = 35`, design v0.2). Left: answers to D-FN-01 to 09, FR-FN-33 and exports, and the six Finance demo steps in `Fisko_Demo_Script.html`. Decisions D-FN-01 to 09 run on the proposed defaults until the user answers.
2. **Fisko Assets design (D-P11):** stock and assets, fed by Procurement acceptances.
3. **From simulated to real AI:** a plan to swap the planner and answer writer for a real model, keeping the same tools, approvals and audit log.
4. **Small polish:** BR-11 exception flags; splitting the request form's first steps; moving the forecast probabilities by unit or type history into data.

Start the next session by reading this file, then `HANDOFF.md` sections 3, 4, 11 and 26 to 35, then run the quick sweep to confirm a clean start.

## Round 44 (Procurement information architecture)

Built on branch `procurement-ia` (worktree `..\Fisko-proc`). Procurement now has 13 pages in 5 groups declared in `src/js/74-proc-pages.js` (see `HANDOFF.md` section 44 and design chapter 19). Next for Procurement: the follow-ups listed at the end of section 44.

## Round 45 (Procurement polish and Finance demo steps)

`main` now carries rounds 43 to 45. The round-44 follow-ups are done (`HANDOFF.md` section 45). Still open: the Finance decisions D-FN-01 to D-FN-09, FR-FN-33 and exports, a full end-to-end rehearsal of the demo, then Fisko Assets or the real-AI plan.

## Round 46 (Finance decisions and non-budget money)

The Finance decisions D-FN-01 to D-FN-09 are answered (design v0.4, 13.2) and non-budget money is a full cycle on F11 (`66i-fin-nb.js`, `DATA_V = 36`). Still open: FR-FN-33 and exports, a demo step for F11, a full demo rehearsal, then Fisko Assets or the real-AI plan.

## Round 47 (Budget information architecture)

Fisko Budget now has 11 pages B1 to B11 in four groups, declared in `src/js/75-budget-pages.js` (see `HANDOFF.md` section 47 and Budget design chapter 15). All three apps now share one page-table pattern (`66h-fin-pages.js`, `74-proc-pages.js`, `75-budget-pages.js`). Still open: FR-FN-33 and exports, a demo step for F11, a full demo rehearsal, then Fisko Assets or the real-AI plan.

## Round 48 (Budget CRUD round C1)

The Budget CRUD design (`Fisko_Budget_CRUD_Design.html` v0.1) is approved; round C1 built the shared list + drawer (`76-crud.js`) and moved B7 Allocation onto it (`77-alloc-crud.js`, `HANDOFF.md` section 48). Next: round C2 (formulation FY2571), then C3 (submission and parliament with Simulate), C4 (B8 and B9 on FY2570), C5 (strategy and master data), C6 (B10/B11, the end-to-end demo script and sweep).

## Round 49 (Budget CRUD round C2)

Formulation FY2571 is on the list + drawer (`78-form-crud.js`, `HANDOFF.md` section 49). Next: C3 (submission and parliament with Simulate, act into allocation), C4 (B8 and B9 on FY2570), C5 (strategy and master data), C6 (B10/B11, end-to-end demo script and sweep).

## Round 50 (Budget CRUD round C3)

Submission batches, Budget Bureau results and revisions, parliament cuts and appeals are on the list + drawer (`79-sub-crud.js`, `HANDOFF.md` section 50). Next: C4 (B8 and B9 on FY2570), C5 (strategy and master data), C6 (B10/B11, end-to-end demo script and sweep).

## Round 51 (Budget CRUD round C4)

B8 and B9 read FY2570 (`80-live-year.js`, `HANDOFF.md` section 51); the demo date can be moved month by month (`S.asOf`, `TODAY` is now `let`). `DATA_V = 37`. Next: C5 (strategy tree and master data), C6 (B10/B11, end-to-end demo script and sweep).

## Round 52 (Budget CRUD round C5)

Strategy and master data are on the list + drawer (`81-master-crud.js`, `HANDOFF.md` section 52); master data is retired, not deleted, once used. `DATA_V = 38`. Next: C6 (B10/B11 records, the end-to-end demo script E-01 to E-16 in the in-app guide, a sweep that walks the whole cycle).
