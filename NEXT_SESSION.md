# Fisko: handoff for the next session

Written 27 October 2026, after merging the Finance CRUD and Procurement CRUD branches into `main` on top of round 54. This is the short version: where things stand, how to work, what to do next. The full record of every round is in `HANDOFF.md` (sections 1 to 54, then 55 to 59 for Procurement and 55F to 61F for Finance).

## 1. Where things stand

Fisko is a discussion prototype of a Thai government budgeting platform with three apps on one data set: **Fisko Budget** (pages B1 to B11), **Fisko Procurement** (P1 to P13) and **Fisko Finance** (F1 to F11). They share My Workspace, M10 System Administration, the AI co-work chat and the in-app demo guide.

**All three apps are now built to their CRUD designs.** Each moved its records onto one shared list + side-drawer pattern (`src/js/76-crud.js`): every record can be created, viewed, edited, deleted while a draft, or cancelled / withdrawn / retired with a reason, with a 10-second Undo and a History tab.

| App | CRUD design | Built in | What it covers |
|---|---|---|---|
| Budget | `Fisko_Budget_CRUD_Design.html` v0.2 | rounds 48 to 54 (`76` to `83-*.js`) | FY2571 formulation, submission and parliament, FY2570 execution, strategy and master data; demo script E-01 to E-16 |
| Procurement | `Fisko_Procurement_CRUD_Design.html` | rounds 55 to 59 (`84-proc-crud`, `85-case-crud`, `86-con-crud`, `87-proc-e2e`, `88-proc-more`) | plan items and versions, requisitions, case files (market research, bids, quotations, committees, custom criteria, e-GP corrections), contracts (drafts, phase schedule, signing), penalty waivers, signatures, invoices; demo script P-E01 to P-E15 |
| Finance | `Fisko_Finance_CRUD_Design.html` v0.1 | rounds 55F to 61F (`84-fin-crud`, `85-fin-pay-crud`, `86-fin-commit-crud`, `87-fin-recv-crud`, `88-fin-nb-crud`) | F10 registers, vouchers and advances, GFMIS files and e-Payment batches, 50 ทวิ, commitments and POs, receipts and remittances, daily cash, reconciliation and closing, non-budget money; demo script E-F01 to E-F15 |

**Round 62 added a multi-system shell** taken from the Fabor console prototype (`D:\Claude\Fabor\docs\design\console-prototype`): a system rail, a launcher with the five planned systems (Assets, HR, e-Saraban, Audit, Revenue), a sidebar per system, breadcrumbs, pinned and recent pages, an Approvals inbox and an Exception centre across systems, enter-review-confirm on every drawer action, and presenter mode with a 7-step executive cut. See `HANDOFF.md` section 62R.

The demo guide (`#demo`) has a filter: every step, Budget end to end (E-01..E-16), Procurement end to end (P-E01..P-E15), Finance (E-F01..E-F15), or the original storyline.

| Item | Where |
|---|---|
| Checkout | `D:\Claude\Fisko-proc`, branch `main` (the old `D:\Claude\Fisko` checkout is on a stale branch; the two session worktrees under `D:\Claude\Fisko\.claude\worktrees\` are leftovers and can be archived) |
| Remote | `https://github.com/akarapolb/Fisko.git` |
| Published prototype | https://claude.ai/artifact/STW3X8Ytx3VVLV7VHLXse9 (private; version 16, the merged `main`) |
| Designs | Budget CRUD https://claude.ai/artifact/3NigvMP1qa4DpvQrjN84Zz · Procurement CRUD https://claude.ai/artifact/H1Vc2G84m87vS9QrZRZSn5 · Finance CRUD https://claude.ai/artifact/WqUrwy2yryGPUqXbmRnwgZ · Finance design (older) https://claude.ai/artifact/G4Sx84KthvJWcLJMAWPKD1 |
| Branch previews (now superseded) | Procurement https://claude.ai/artifact/MuAxUNbvtXHCgbvutoTcVE · Finance https://claude.ai/artifact/8ZSzN2o5CVN6hj5Gh3MKyK |
| Data version | `DATA_V = 39` in `src/js/00-core.js` (bump it whenever the seed shape changes) |

## 2. How the user likes to work

- **Each round:** build, run the full sweep, check phone width and dark mode, update `README.md`, `HANDOFF.md` and this file, publish the prototype to the same link, then **ask before committing**. Commit and push only when the user says so ("commit and push", "commit and continue"). Stage files by name; never `git add -A src` when other sessions share a folder.
- **New areas:** ask a few scoping questions (AskUserQuestion, recommended option first), write a design document in Thai in the house layout, get approval, then build in rounds. The user can start parallel sessions for separate apps; merge them into `main` only when asked.
- **The user is terse:** "go", "done?", "fix all". Answer "done?" with an honest status: what is built, committed, pushed, and what is left.
- **Constraints:** all figures fictional; real-agency data (`*data-dpt*`) never in the published build; no Avalant product names in the product (Avalant may be the document author); AI, OCR, GFMIS, e-GP and the bank are simulated; agents never approve, sign, pay or change amounts; stock and assets belong to the future Fisko Assets.
- **Look:** calm UI, one slate-navy accent, status as small dots, Fisko chart palette. Bilingual, Thai first. The user writes in English.

## 3. Build, run, test, publish

```bash
bash src/build.sh
```

This concatenates `src/head.html`, the CSS files, `body.html` and `src/js/*.js` (filename order) into `Fisko_Prototype.html` (standalone) and `fisko-prototype.html` (artifact). Then parse-check it, because one bad edit silently breaks the whole page:

```bash
node -e "const h=require('fs').readFileSync('Fisko_Prototype.html','utf8');[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(x=>{try{new Function(x[1]);console.log('parse ok')}catch(e){console.log('PARSE ERROR',e.message)}})"
```

```bash
python -m http.server 8788 --bind 127.0.0.1
```

- **Prototype:** `http://127.0.0.1:8788/Fisko_Prototype.html?v=N` (bump `N` to beat the cache). The passcode for every account is `246810`.
- **Tests:** `http://127.0.0.1:8788/tests/run.html`. The test frame caches the prototype: set the frame's `src` to `../Fisko_Prototype.html?v=N` and wait for "Ready." before clicking **Full sweep** (or call `document.getElementById("full").click()`). The sweep covers every page and tab, every list drawer for every role, two demo months, the budget cycle walk, the Procurement and Finance walks, chat, agents and every demo step. Its check count and result for the merged build are in section 6.
- **Publish:** Artifact tool, `file_path` = `D:\Claude\Fisko-proc\fisko-prototype.html`, `url` = the published prototype link.

## 4. Gotchas

- **Edit only `src/`.** The root HTML files are build output. After any merge, never hand-merge them: take either side and rebuild.
- **One global scope.** Files extend each other by wrapping functions and `VIEWS` / `BIND` / panel objects; a `const` can't be wrapped. Check name clashes with `grep -nE "(const|let|function) name\b" src/js/*.js`.
- **Page tables:** `66h-fin-pages.js` (Finance), `74-proc-pages.js` (Procurement) and `75-budget-pages.js` (Budget) declare menus and tabs. Later files wrap the rendered result; they never replace a view, or the tab bars disappear.
- **Shared list + drawer (`76-crud.js`):** declare a record type with `CRUD.def(key, { list, id, title, st, status, gone, cols, filters, fields, check, create, edit, acts, view, tabs, hist })` and render it with `crudList(key, { head, after, empty })`. Actions with `why: true` ask for a reason (`CR_WHY_MIN`, or `whyMin`); `sim` adds a Simulate button to the reason box; `num` adds a number field; `undo: false` skips the Undo bar; list headers can sort. Master data is retired (`retireAct`), never deleted once used. Finance also has its own older drawer (`fn-drawer`, `FIN_ASK`) for vouchers and advances, aligned to the same look.
- **Years and dates:** `TODAY` is `let` (the demo date, `S.asOf`); `REAL_TODAY`, `CUR_FY` (being spent, 2570) and `FORM_FY` (being formulated, 2571) are in `00-core.js`. Use them, never a literal year. Seeds always run with the real date.
- **Scripted edits:** a `//` comment inside a one-line function comments out the rest of the line; a template string can't be an object key (use `{ [FORM_FY]: … }`). Parse-check after every scripted change.
- **Merging parallel branches:** the conflicts are always the same few files: `76-crud.js` (keep both sets of options), `82-intel-crud.js` (the demo guide's filter list), `tests/sweep.js` (keep both walks), `HANDOFF.md` / `NEXT_SESSION.md` / `README.md` (keep both sections), and the two built HTML files (take either side, then rebuild). Parse-check and run the full sweep after the merge.
- **Routing in tests:** set `window.FISKO_ROUTE = "#page"` and call `route()`; the browser ignores bursts of hash changes. The sweep's `tick` uses a MessageChannel because background tabs throttle `setTimeout(0)`.
- **Shell:** heredocs with Thai text break bash here; write Python scripts to the scratchpad and run them (`PYTHONIOENCODING=utf-8` when printing Thai). Long scans (a `grep` per name over every file) can pass the 2-minute tool limit; run them in the background.
- **Generic SaaS:** Fisko is one product for every agency. Never put an agency's names, systems or rules in code or UI text; put them in that tenant's data file (`SEEDS[org]`, `PRJ_CFG[org]`, files named `*data-<org>*`). Grep `fisko-prototype.html` for the agency's terms before publishing.
- **Round numbers:** the two branches both used 55 to 59; Finance's sections are suffixed `F` (55F to 61F) in `HANDOFF.md`. Round 62 (the shell) is section 62R; round 63 (its polish) is section 63; round 64 (the project registry) is section 64; round 65 (the UX review fixes) is section 65; round 66 (the DPT business-test fixes) is section 66. The next round on `main` is **68**.
- **Top bar width:** the organization and role selects live inside the context chip's panel (`#ctxpop`), moved there by `94-polish.js`; their ids and handlers are unchanged. Anything new in the top bar must fit in one row at about 900 px of page width (the rail and sidebar take 308 px).
- **The shell wraps late:** `90-systems.js` to `93-presenter.js` load after every app file and wrap `route`, `renderShell`, `renderNav`, `crActBar`, `VIEWS.home` and `VIEWS.demo`. A new file that changes those should sort before `90` or wrap the wrapped version. New Workspace pages are NAV entries with `app: "all"` and group `ws`, and belong in `WS_PAGES` so the rail knows their system.

## 5. Map of the newer code (rounds 43 to 61F)

| File | What it holds |
|---|---|
| `66h-fin-pages.js`, `74-proc-pages.js`, `75-budget-pages.js` | Page tables (menus, tabs, codes) |
| `76-crud.js` | Shared list + drawer, reasons, Simulate, Undo, history tab, sort |
| `77` to `83-*.js` | Budget CRUD: allocation, formulation, submission and parliament, live year, strategy and master data, B10/B11 and demo, admin lists |
| `84-proc-crud.js` to `88-proc-more.js` | Procurement CRUD: plan, requisitions, case files, contracts, waivers, signatures, invoices, demo P-E01..15, custom criteria |
| `84-fin-crud.js` to `88-fin-nb-crud.js` | Finance CRUD: registers, vouchers, payments, commitments, receipts, non-budget; Finance demo E-F01..15 |
| `calm.css` | `cr-*` list and drawer styles, as-of bar |
| `95-projects.js`, `96-data-dpt-na02.js` | Project registry system (NA-02): cycle, register, project 360°, PM exchange, data sharing, ToR map; tenant wording in `PRJ_CFG[ORG]` |
| `90-systems.js` to `93-presenter.js`, `systems.css` | Multi-system shell: rail, launcher, planned systems, crumbs, pins; inbox, exceptions, Today strip; review step; presenter |
| `tests/run.html`, `tests/sweep.js` | Test runner and sweep (the sweep holds the walks) |
| `Fisko_*_CRUD_Design.html` | The three CRUD designs (Thai) with build status |

Roles: `div`, `divhead`, `plan`, `committee`, `exec`, `fin`, `finhead`, `audit`, `admin`, `proc`, `prochead`, `vendor`.

## 6. Merge result and checks

Both branches were merged into `main` on 27 October 2026 (`claude/charming-shirley-7b0006` first, then `claude/brave-haslett-3b0854`). Seven files conflicted and were resolved by keeping both sides: `76-crud.js`, `82-intel-crud.js`, `tests/sweep.js`, `HANDOFF.md`, `NEXT_SESSION.md` and the two built HTML files (rebuilt). The merged build parses cleanly and declares no duplicate top-level names. The full sweep result for the merged build is in the merge note at the end of `HANDOFF.md`.

## 7. Open items and suggested next steps

1. **Finance:** FR-FN-33 and Excel/PDF exports (the CRUD design covered records, not file exports).
2. **A full demo rehearsal** of the three end-to-end scripts (Budget, Procurement, Finance), then fix anything that reads badly aloud.
3. **Cross-app links in the demo:** a single story that runs Budget → Procurement → Finance on the same project, instead of three separate scripts.
4. **Fisko Assets design** (D-P11): stock and assets, fed by Procurement acceptances. It already has a planned-system page in the launcher (`#sys-assets`).
5. **Simulated to real AI:** a plan to swap the planner and answer writer for a real model, keeping the same tools, approvals and audit log.
6. **Budget design leftovers** (chapter 13.4 of the Budget design): real e-Budgeting file formats, strategy-level risk register, divisions proposing KPI changes, central fund and supplementary requests, a five-level structure, BR-11 exception flags.
7. **Shell follow-ups:** a Thai design note for the shell (round 62 was built straight from the Fabor console at the user's request); pins and recents per user on the server rather than per browser; the review step for the older non-drawer actions (the Budget workflow buttons).
8. **Project registry follow-ups (NA-02):** check the 106 user units and the unit tree against DPT's real chart (the seed has 9 units); the A3 says 58 duties but lists 56 lines (some lines may hold two duties); give DPT construction contracts their own vendors (the shared seed's "Sample Systems Co." holds the civil-works contract); a real field mapping for the 12 items with the Nong Kor team.

Start the next session by reading this file, then `HANDOFF.md` sections 47 to 61F, then run the full sweep on `main` to confirm a clean start.
