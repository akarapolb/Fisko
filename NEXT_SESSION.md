# Fisko: handoff for the next session

Written 23 October 2026, after round 54 on `main`, while two parallel branches (Procurement CRUD and Finance CRUD) are mid-way. This is the short version: where things stand, how to work, what to do next. The full record of every round is in `HANDOFF.md` (sections 1 to 54 on `main`; the two branches add their own sections).

## 1. Where things stand

Fisko is a discussion prototype of a Thai government budgeting platform with three apps on one data set: **Fisko Budget** (pages B1 to B11), **Fisko Procurement** (P1 to P13) and **Fisko Finance** (F1 to F11). They share My Workspace, M10 System Administration, the AI co-work chat and the demo guide.

**Fisko Budget is complete.** It has its own design (`Fisko_Budget_Design.html` v0.3), its information architecture (round 47), and the **Budget CRUD design** (`Fisko_Budget_CRUD_Design.html` v0.2), fully built in rounds 48 to 54:
- every record and every piece of master data can be created, viewed, edited, deleted while a draft, or cancelled, withdrawn or retired with a reason, with a 10-second Undo;
- B8 and B9 run on FY2570 allocation lines, and an "as of month" picker moves the demo date;
- the years being spent and formulated come from the date (`CUR_FY`, `FORM_FY`);
- the in-app demo guide holds the end-to-end script **E-01 to E-16** (about 45 minutes), and the test sweep walks it.

**Procurement and Finance are being moved onto the same list + drawer pattern**, each in its own session and branch (section 6).

| Item | Where |
|---|---|
| Main checkout | `D:\Claude\Fisko-proc`, branch `main`, last commit `d7ea0ad` (round 54), in sync with `origin/main` |
| Old checkout | `D:\Claude\Fisko` is still on the old `procurement-ia` branch with stray files; don't work there |
| Remote | `https://github.com/akarapolb/Fisko.git` |
| Published prototype (main) | https://claude.ai/artifact/STW3X8Ytx3VVLV7VHLXse9 (version 15, round 54, private) |
| Budget CRUD design | https://claude.ai/artifact/3NigvMP1qa4DpvQrjN84Zz (version 8, private) |
| Procurement CRUD design | https://claude.ai/artifact/H1Vc2G84m87vS9QrZRZSn5 (private) |
| Procurement branch prototype | https://claude.ai/artifact/MuAxUNbvtXHCgbvutoTcVE (private) |
| Finance branch prototype | https://claude.ai/artifact/8ZSzN2o5CVN6hj5Gh3MKyK (private; the Finance CRUD design link is in that branch's `HANDOFF.md`) |
| Data version | `DATA_V = 38` on `main` (`src/js/00-core.js`; bump it whenever the seed shape changes) |

## 2. How the user likes to work

- **Each round:** build, run the full sweep, check phone width and dark mode, update `README.md`, `HANDOFF.md` and `NEXT_SESSION.md`, publish the prototype to the same link, then **ask before committing**. Commit and push only when the user says so ("commit and push", "commit and continue"). Stage files by name; never `git add -A src` when another session shares the folder.
- **New areas:** ask a few scoping questions (AskUserQuestion, recommended option first), write a design document in Thai first in the house layout, get approval, then build in rounds.
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
- **Tests:** `http://127.0.0.1:8788/tests/run.html`. The test frame caches the prototype: set the frame's `src` to `../Fisko_Prototype.html?v=N` and wait for "Ready." before clicking **Full sweep**. On `main` the sweep runs about 11,600 checks in about 110 s, all passing. It covers every page and tab, every list drawer (view, tabs, edit, new) for every role, two demo months, the C3 submission-to-allocation walk, the E-01 to E-16 walk, chat, agents and every demo step.
- **Publish:** Artifact tool, `file_path` = `D:\Claude\Fisko-proc\fisko-prototype.html`, `url` = the main prototype link. Branch sessions publish to their own links until merged.

## 4. Gotchas

- **Edit only `src/`.** The root HTML files are build output. Never hand-merge them: rebuild after a merge.
- **One global scope.** Files extend each other by wrapping functions and `VIEWS` / `BIND` / panel objects; a `const` can't be wrapped. Check name clashes with `grep -nE "(const|let|function) name\b" src/js/*.js`.
- **B-pages:** `75-budget-pages.js` wraps the Budget views. Later files wrap the result (`const v = VIEWS.x; VIEWS.x = () => f(v())`), never replace it, or the B-page tab bars disappear.
- **Shared list + drawer (`76-crud.js`):** declare a record type with `CRUD.def(key, { list, id, title, st, status, gone, cols, filters, fields, check, create, edit, acts, view, tabs, hist })` and render it with `crudList(key, { head, after, empty })` (or `crHere(key)` for a drawer with no list). All clicks and submits are handled once on `document`. Actions with `why: true` ask for a reason; `undo: false` skips the Undo bar. Master data is retired (`retireAct`), never deleted once used.
- **Years and dates:** `TODAY` is `let` (the demo date, `S.asOf`); `REAL_TODAY`, `CUR_FY` (being spent, 2570) and `FORM_FY` (being formulated, 2571) are in `00-core.js`. Use them, never a literal year. Seeds always run with the real date.
- **Scripted edits:** a `//` comment inside a one-line function comments out the rest of the line; a template string can't be an object key (use `{ [FORM_FY]: … }`). Parse-check after every scripted change (`node -e "new Function(…)"` per file).
- **Routing in tests:** set `window.FISKO_ROUTE = "#page"` and call `route()`; the browser ignores bursts of hash changes. The sweep's `tick` uses a MessageChannel because background tabs throttle `setTimeout(0)`.
- **Shell:** heredocs with Thai text break bash here; write Python scripts to the scratchpad and run them (`PYTHONIOENCODING=utf-8` when printing Thai).

## 5. Map of the newer code (rounds 43 to 54)

| File | What it holds |
|---|---|
| `66h-fin-pages.js`, `74-proc-pages.js`, `75-budget-pages.js` | Page tables for Finance, Procurement and Budget (menus, tabs, codes) |
| `66i-fin-nb.js` | Finance F11 non-budget money |
| `76-crud.js` | Shared list + drawer, reasons, Undo, history tab |
| `77-alloc-crud.js` | B7 allocation lines, transfers, releases, carry-over, appropriation |
| `78-form-crud.js` | B3 requests, B4 ceiling and duplicates, B5 rounds, comments, meetings, hearings |
| `79-sub-crud.js` | B6 batches, Budget Bureau results and revisions, parliament cuts and appeals |
| `80-live-year.js` | B8/B9 on FY2570, as-of month, simulated GFMIS import, FY2569 history |
| `81-master-crud.js` | B2 strategy, KPIs, ideas, revisions; B9 outputs; M10 master data, committee, master plans |
| `82-intel-crud.js` | B10/B11 saved scenarios, anomaly reopen, agent cancel; demo script E-01 to E-16 |
| `83-admin-crud.js` | Request basics in the drawer; M10 users, approval route, business rules |
| `Fisko_Budget_CRUD_Design.html` | The Budget CRUD design (Thai) with its build status |

## 6. Parallel work in progress (not on `main` yet)

| | Finance CRUD | Procurement CRUD |
|---|---|---|
| Session | "Finance CRUD design on list + drawer" | "Procurement CRUD design on list + drawer" |
| Branch, worktree | `claude/charming-shirley-7b0006`, `D:\Claude\Fisko\.claude\worktrees\charming-shirley-7b0006` | `claude/brave-haslett-3b0854`, `D:\Claude\Fisko\.claude\worktrees\brave-haslett-3b0854` |
| Committed and pushed | design `88cffc4`, FC1 `a17357e`, FC2 `80a5e3c` (vouchers) | design `5af03db`/`023cf87`, PC1 `3c63dcb`, PC2 `531ad63` (case files) |
| Built, not committed | FC3: GFMIS files and e-Payment batches, result forms with Simulate, daily checks, 50 ทวิ reissue, refund receipts (sweep 12,281 checks) | PC3: contracts on the list + drawer, drafts, phase schedule, signing, fixes to acceptance, payment gate and closing (sweep 12,333 checks) |
| Next | the user's go-ahead to commit FC3, then the next FC round | the user's go-ahead to commit PC3, then the next PC round |

**Merging both into `main`** (only when the user says so):
1. Finish and commit the current rounds on both branches.
2. Merge `refs/heads/claude/charming-shirley-7b0006` into `main` first.
3. Then merge `refs/heads/claude/brave-haslett-3b0854`. Expect conflicts:
   - `src/js/76-crud.js`: Finance added sorting and a refresh fix.
   - `tests/sweep.js`.
   - `HANDOFF.md`, `README.md` and `NEXT_SESSION.md`.
   - The two Finance files Procurement's PC3 touched.
   - Both branches also use the round numbers 55 and 56 (55F/56F for Finance).
4. Rebuild, parse-check, run the full sweep, and publish to the main prototype link.

## 7. Open items and suggested next steps

1. Keep the two CRUD branches going round by round, then merge them as above.
2. **Finance leftovers:** FR-FN-33, Excel/PDF exports, a demo step for F11.
3. **A full demo rehearsal** with the E-01 to E-16 script (in-app guide, filter "ครบวงจร").
4. **Fisko Assets design** (D-P11): stock and assets, fed by Procurement acceptances.
5. **Simulated to real AI:** a plan to swap the planner and answer writer for a real model, keeping the same tools, approvals and audit log.
6. **Budget design leftovers** (chapter 13.4 of the Budget design): real e-Budgeting file formats, strategy-level risk register, divisions proposing KPI changes, central fund and supplementary requests, a five-level structure, BR-11 exception flags.

Start the next session by reading this file, then `HANDOFF.md` sections 47 to 54 (and the branch sections if merging), then run the full sweep on `main` to confirm a clean start.
