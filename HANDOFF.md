# Fisko: project handoff

State as of 17 October 2026, branch `main`, last commit `5d1c164`. This note is for whoever picks the work up next: what exists, how to run and change it, what was decided, and what is still open.

## 1. What this is

**Fisko** is the working name for a budgeting platform for Thai government agencies (the requirements call it AEBMS, Agency e-Budgeting Management System). It covers the full cycle: strategic plan, budget requests, consolidation, review, submission to the Budget Bureau, allocation, spending, performance, AI support and administration (modules M01 to M10).

What has been produced so far is **discussion material for a customer**, not a real system:

- A customer deck, a solution design document and a demo script.
- A clickable HTML prototype that runs entirely in the browser with fictional data.
- No backend, no database, no real integrations, no real AI model.

Everything is labelled sample data. The name Fisko still needs a trademark check, and no Avalant product names appear anywhere (on purpose).

## 2. Where everything is

| Item | File | Notes |
|---|---|---|
| Prototype (standalone) | `Fisko_Prototype.html` | Opens directly in a browser. Has both sample organisations. |
| Prototype (published build) | `fisko-prototype.html` | Same code but **without** the กรมโยธา sample. Published as an artifact. |
| Solution design (Thai) | `Fisko_Solution_Design.html` | v0.3. Functional, application, technical, data, integration, AI and security design. |
| Demo script (Thai) | `Fisko_Demo_Script.html` | 15 steps, 15 minutes, matches the in-app demo guide. |
| Customer deck | `Fisko_Conceptual_Architecture.pptx` / `.pdf` | Built on the customer's CPAxtra template. Not touched since round 1. |
| Roadmap | `ROADMAP.md` | What each module's deeper feature was. All built. |
| Product family concept (Thai) | `Fisko_Product_Family_Concept.html` | v0.2. Fisko Budget, Procurement and Finance on one shared core. Decisions D-F01 to D-F03 and D-F06 are recorded in it. |
| Prototype source | `src/` | The only place to edit the prototype. |

Links and places:

- GitHub: `https://github.com/akarapolb/Fisko` (private). Push works with stored credentials. The `gh` CLI is not installed.
- Published prototype: `https://claude.ai/artifact/K8TJFETX7GMftoZYb9zFZR` (version 14, shared as "anyone with the link").
- Working folder: `D:\Claude\Fisko`.

## 3. Run, build, publish

**Build** (plain bash, no dependencies):

```bash
bash src/build.sh
```

This concatenates `src/head.html`, `styles.css`, `body.html` and every `src/js/*.js` file (in filename order) into both HTML files. Files whose name contains `data-dpt` are left out of the published build only.

**Check syntax** after a build (extract the script and let Node parse it):

```bash
sed -n "/<script>/,/<\/script>/p" Fisko_Prototype.html | sed '1d;$d' > "$TEMP/fk_check.js" && node --check "$TEMP/fk_check.js"
```

**Run locally**:

```bash
cd /d/Claude/Fisko && python -m http.server 8787 --bind 127.0.0.1
```

Then open `http://localhost:8787/Fisko_Prototype.html`. The page also works by double-clicking the file.

**Publish**: the published page is the artifact tool's job. Republish `fisko-prototype.html` with the existing URL so the link stays the same. The artifact is a different file from the standalone one, so rebuild first.

**Sign in**: pick a sample account and use the passcode `246810`. It is the same for every account (the two-factor step is simulated). Accounts without two-factor set up (for example มาลี ศรีสุข in the sample department) get a sample QR step first.

## 4. How the prototype is put together

It is one global scope: every `src/js` file becomes part of one `<script>`, so top-level `let`, `const` and `function` names are shared. Load order is the filename order, which is why files are numbered.

| Range | What lives there |
|---|---|
| `00-core.js` | Language (`L(th, en)`, `tx([th, en])`), formatting, state load/save, roles, the router, `audit()`, `notify()`, `commit()` |
| `05-shared.js`, `06-seedhelp.js` | Shared reference data and `buildOrg()`, which builds an organisation's starting state |
| `10-data-sample.js`, `11-data-dpt.js` | The two sample organisations |
| `20-shell.js`, `30-home.js` | Navigation, top bar, My Workspace tasks (`myTasks()`), `jump()` |
| `40` to `48` | The modules. Files ending in `b` or `c` are tabs and deeper features added later |
| `50`, `50b` | M10 administration |
| `60`, `62`, `64` | Fisko Procurement, Fisko Finance, duty-separation engine and its M10 tab |
| `66` | App switcher: the three apps, the menu built per app, the switcher menu |
| `52-demo.js` | The in-app demo guide (`DEMO` array) |
| `54-identity.js`, `56-search.js`, `58-history.js` | Sign-in and delegation, global search, record history drawer |
| `99-boot.js` | Startup |

Conventions worth knowing before you edit:

- **Text in two languages.** Use `L("ไทย", "English")` inline, or arrays `[th, en]` for data with `tx()`. Dates go through `fdate()`, which shows Buddhist-era years in Thai.
- **Views and wiring.** A page is `VIEWS.name = () => html` plus `BIND.name = () => { ...handlers }`. The router calls both. After changing state call `commit()` and `route()` to redraw.
- **Tabs.** Each module has a tab list (`STRAT_TABS`, `SUB_TABS`, `ALLOC_TABS`, `PERF_TABS`, `ADMIN_TABS`, or a tab-bar function for M02, M03, M04, M07, M09). Later rounds added tabs by pushing onto the list and wrapping the module's `BIND` function. The `45b`, `46b`, `47b`, `48b` and `50b` files show the pattern.
- **Deep links.** `jump("area-tab")` opens a module tab (areas: `mon`, `alloc`, `rev`, `perf`, `sub`, `cons`, `intel`, `strat`). `jump("req:<id>")` opens a request. `admin-<tab>` is a hash route.
- **Roles.** `div`, `plan`, `exec`, `fin`, `audit`, `admin`. Page access is the `roles` list on each entry in the `NAV` array in `20-shell.js`. Use `acting(role, scope)` instead of `ROLE === role` where delegation applies, and `onBehalf(role, scope)` for the "on behalf of" note in audit entries.
- **Audit and notifications.** Every state-changing action should call `audit([th, en], target)`. Put the record's id in `target`, because the history drawer (`historyBtn(key)`) finds entries by matching ids in that text.
- **Home tasks.** Add work items for a role in `myTasks()` in `30-home.js`.

## 5. State and data

- State is kept per organisation in `localStorage` under `fisko-v1-<org>` (`sample` or `dpt`). Other keys: `fisko-session`, `fisko-lang`, `fisko-role`, `fisko-org`, `fisko-app`.
- `DATA_V` in `00-core.js` (now **12**) is the seed version. **Bump it whenever you change the shape of seeded data**, or browsers that already hold old saved state will keep the old shape and break. Bumping resets everyone's saved demo data once.
- Seed data is built by `buildOrg()` in `06-seedhelp.js`. Rounds 7 to 10 add their data at the end of that function, in clearly commented blocks.
- All dates are anchored to a constant, `TODAY = "2026-10-16"` in `00-core.js`, **not the computer's clock**. So deadlines, "days left" and delegation periods behave the same on any day. Only the time of day comes from the real clock.
- Two organisations: a fictional department (`sample`), and กรมโยธาธิการและผังเมือง (`dpt`) with fictional figures and an indicative unit structure. Keep real-agency data out of the published build. The filename pattern `*data-dpt*` is what does that.

## 6. How it was tested

There is **no automated test suite**. Testing was done by driving the page in the browser pane:

1. Clear `fisko-v1-*` keys, reload, switch organisation, language and role through the page's own functions.
2. A render sweep: visit every route and tab for every role, in both languages and both organisations, catching exceptions (about 1,200 renders per sweep).
3. End-to-end flows for each new feature (create, approve, reject, edit), reading the resulting state.
4. A phone-width check: set the viewport to 375 px and confirm `document.documentElement.scrollWidth` does not exceed the width, on every new screen.
5. Click-through of all 15 demo steps in both organisations and both languages.

Tested only in the browser pane (a Chromium engine). Safari and Firefox were not checked, and no formal accessibility audit has been done (labels and keyboard handling were added, but the design document's WCAG 2.1 AA target is unverified).

## 7. What was built, by round

| Round | Content |
|---|---|
| 1 | Foundation and M10 (data, roles, router, rules, workflow, audit, integrations) |
| 2 | M01 strategy, M02 and M03 additions |
| 3 | M04 additions and M05 submission |
| 4 | M06 allocation and M07 additions |
| 5 | M08 performance and M09 additions |
| 6 | Polish, consistency pass, 15-minute demo script |
| 7 | Sign-in with two-factor, global search, record history, delegation of authority |
| 8 | M01 project bank and plan revision; M02 price catalogue and paste from Excel; M03 ceiling responses and 4-year forward estimates |
| 9 | M04 budget hearings and cut impact; M05 parliament stages; M06 allotment releases and carry-over |
| 10 | M07 year-end forecast and procurement milestones; M08 project evaluation and lessons; M09 spending anomalies and justification quality; M10 notification templates, SLAs, retention and backup |
| 11 | Light versions of Fisko Procurement and Fisko Finance, a procurement officer role, and duty-separation rules (see section 12) |
| 12 | App switcher between Fisko Budget, Fisko Procurement and Fisko Finance (see section 12) |

After round 10 the demo guide and script were rewritten, and the design document went to v0.3 with the new requirements tagged "ใหม่ v0.3".

## 8. Decisions made and why

- **Plain HTML/JS, no framework or build tool.** Easy to hand over, opens from a file, and publishes as one page. The cost is shared globals and long files.
- **IBM Plex Sans Thai** for modern Thai typography. Colours follow the customer template.
- **AI is scripted.** Drafts, answers and anomaly flags come from fixed rules and seeded text, with the same guardrails the design describes (AI suggests, humans decide, sources shown, every use logged). No model is called.
- **Simulated external parties.** The Budget Bureau's replies, e-GP data, the parliament timetable and the single sign-on are all simulated with demo buttons or sample dates.
- **Priorities and thresholds are proposals.** The Must/Should/Could labels on the new v0.3 requirements, the cut-impact method, the 500,000-baht purchasing threshold and the quarterly spending targets (the `CAB` constant in `40c-monitor-depth.js`) are my suggestions. They need confirming with the agency.
- **Sample RPO is 1 hour** to match the design's NFR-DR-01 (it was 24 hours until the last change).
- **Audit may use M09** (to close or escalate anomalies). The permission table in M10 and the design document both reflect that.

## 9. Known limitations and simplifications

- The design document lists seven roles, including a budget committee. The prototype has seven too, but not the same seven: it adds a procurement officer and still has no committee role. Committee resolutions are recorded by Planning or the executive, and contract acceptance committees are just named users on the contract.
- Delegation is checked for scope and dates. The design proposes banning re-delegation, but the prototype does not enforce or demonstrate it.
- Notification templates have a LINE channel toggle, but there is no matching interface in the prototype's integration list (the design proposes it as IF-08, pending approval).
- Cut impact and the spending forecast use simple proportional assumptions, explained on screen and in the design document.
- Pasting lines into a multi-year request adds them to the first year, so the yearly split still adds up. Other splits are left to the user.
- The retention and backup panel is informational plus two simulated buttons. Nothing is actually backed up.
- Real-agency (กรมโยธา) sample data exists only in the standalone build.

## 10. Open items and suggested next steps

Customer-facing:

1. Confirm the proposals above with the agency, especially priorities, thresholds and the cabinet targets.
2. Settle the open decisions D-01 to D-09 in section 14 of the design document (deployment model, multi-organisation approach, allowed AI models, review rounds, history depth, forms, notification channels, anomaly thresholds, delegable approvals).
3. Check the design against the agency's actual TOR, then write the Detailed Design (the demo closes by proposing six document sets and a workshop on real approval lines and forms).
4. Run the Fisko trademark check, covering the sub-names Fisko Budget, Fisko Procurement and Fisko Finance (decision D-F06).
5. Product family: the direction is decided (build Procurement and Finance in parallel, as separate products on one core, with light versions first). Still open with the agency: the segregation-of-duties policy (D-F04) and the e-GP and GFMIS access channels (D-F05). Sizing, time and cost have not been estimated.

Engineering, if the prototype is kept going:

6. Add automated checks. The render sweep and demo click-through are good candidates to turn into a script.
7. Test in Safari and Firefox, and run an accessibility audit against WCAG 2.1 AA.
8. Keep the design document's traceability table (appendix A.2) in step with the requirement rows when either changes. It is edited by hand.
9. Replace simulated pieces with real ones only after integration channels are approved by each system owner (IF-01 to IF-08).

## 11. Gotchas

- **Edit `src/`, never the built HTML.** The two HTML files are overwritten by every build. Remember to rebuild before publishing or committing.
- **Browser caching.** When reloading the local server in the browser pane, add a throwaway query string (for example `?v=2`), or old scripts may stay loaded.
- **Heredocs.** On this Windows setup, bash heredocs containing complex JavaScript or Thai text failed. Write scripts to a file and run them instead.
- **Python and AppData.** Python could not see paths under `AppData\Roaming`. Use the project folder or the scratchpad directory.
- **Stopping the local server.** `Stop-Process` on the `http.server` process reports exit code 255 but does stop it.
- **Line endings.** Git warns that LF will become CRLF. It is harmless here.
- **Commit messages** end with the attribution line the session was told to use. Branch is `main` and was left as is on purpose.

## 12. Fisko Procurement and Fisko Finance (round 11)

Built as light versions inside the same prototype, following the product family concept (decisions D-F01 to D-F03 and D-F06). The working defaults for the two open decisions are the ones chosen in this session: **files only** for e-GP and GFMIS (D-F05) and the **chapter 7 table** for duty separation (D-F04).

- **Where:** two new menu items under "More Fisko products" (`procurement`, `finance`) and an M10 tab, "Duty separation". Code is in `60-procurement.js`, `62-finance.js` and `64-duties.js`. Deep links are `prc-<tab>` and `fnc-<tab>`.
- **Data:** FY2570 only, built on the M06 allocation lines. Seeded in `06-seedhelp.js` (round 11 block): a procurement plan (`S.pplan`), requisitions (`S.reqn`), contracts with phases and acceptance signatures (`S.contracts`), payment requests (`S.payreqs`), GFMIS file imports (`S.gfmisFiles`), e-GP file imports (`S.egpImports`) and the duty rules (`S.sod`). A procurement officer user is added to both organisations.
- **Chain:** allocation line, plan item, requisition (executive approves, within the room left on the line), contract (procurement officer creates it, which commits the line), acceptance (2 signatures from the committee), payment request (finance), payment approval (executive), file reconciliation (finance).
- **Duty rules SD-01 to SD-05** are checked on the signed-in user and on the person whose authority they hold by delegation, so delegation can't get around them. Blocked attempts are logged in the audit log and shown in M10 → Duty separation. The two seeded delegations of "approve requisitions and payments" (to Planning and to Finance) exist so the SD-04 and SD-03 blocks can be shown in the demo. SD-01, SD-02 and SD-05 are in the code but are hard to trigger with the sample users.
- **Not done:** the light M06 and M07 screens in Fisko Budget still keep their own data and don't read from the new products yet (the concept says they should). The demo guide and demo script don't cover these screens. The design document (Solution Design) and the concept document were not changed for these screens, except for the note in concept chapter 9.
- **App switcher (round 12):** every `NAV` entry has an `app` (`budget`, `procurement`, `finance`, or `all` for My Workspace and M10). The left menu is built per app in `renderNav()` (`66-apps.js`). The Procurement and Finance entries carry `tabs`, which become their menu items (`P1`..`P4`, `F1`..`F3`). The page you open decides the current app (`appSync()` runs in the router), so deep links, tasks and notifications switch apps by themselves. The current app is kept in `localStorage` (`fisko-app`), and the last page of each app is remembered while the page is open. An app a role can't use is greyed out in the switcher. To add a fourth app, add it to `APPS` and `APP_IDS` (`00-core.js`, `66-apps.js`), give its `NAV` entries an `app` and a `group`, and add that group to `GROUPS`.

## 13. Procurement case files, P0 and P1 (round 13)

Builds P0 and P1 of `Fisko_Procurement_Design.html` (chapter 10). All code is in `61-cases.js`, plus small patches in `60-procurement.js`, `64-duties.js`, `66-apps.js` and the seed.

- **New role** `prochead` (head of procurement, user `u11`). `proc` is the officer who does the work; `prochead` approves a method that differs from the advice, approves special cases and decides appeals. Both can use the case screens. Helper `isProcRole()` replaces the old `ROLE === "proc"` checks. Neither role is offered as an acceptance-committee member (`famPeople`).
- **Settings in state (P0):** `S.mrules` (method rules MR-01..05, each with kind, ceiling, method, committees, appeal flag, confidence A/B/C and an effective date), `S.pcfg` (`specificMax` 500000, `singleInspectorMax` 100000, `minMembers` 3, `appealDays` 7, `splitDays` 90), `S.holidays` (sample dates) and `S.caseEvents` (event log, newest first). Edited in M10 → **Procurement rules** (admin edits, audit/proc/prochead view). Only A-level facts are fixed in the design; the other numbers are starting values to confirm.
- **Case file (P1):** `S.cases`, one per plan item (`PC-2570-nnn`). `state` is stored for steps 1 to 9; steps 10 to 12 are derived by `caseState()` from acceptance and payments, so they never drift. Moves go through `caseMove()`, checks come from `caseChecks()`, and `caseNext()` says who acts next. Requisition raising, approval and contract creation call `caseOnRaise`, `caseOnDecide` and `caseOnContract`.
- **Flow:** requisition → approval → method (advice from the rules table; an override or a special reason needs 10+ characters and head approval) → reference price, TOR, TOR committee, e-GP details (competitive methods) or quotations (specific method) → close date and bidders → evaluation committee, award (price may not exceed the approved amount, or the reference price without a reason) → appeal window (7 working days, skipping weekends and holidays; the prototype clock is fixed, so the demo uses "simulate" buttons) → contracting. Zero bidders or "failed" sends the case back to step 4. Cancelling releases the reserved amount.
- **Contract gate:** a contract can only be created for a case at step 8. The amount is capped by the award, the winner is prefilled, and SD-06 blocks inspectors who sat on the evaluation or purchasing committee. One inspector is allowed up to 100,000 baht.
- **Split-purchase check (R-02):** raising a requisition for a small item when another same-kind request from the same unit in the last 90 days brings the total over 500,000 baht asks for an explanation, notifies the head and audit, and tags the case. The last two seeded plan items (PP-2570-005 and 006) are built for this demo.
- **Seed:** cases 1 and 2 are at step 9 (case 2 had a single bidder), case 3 is at step 5 with e-GP announced and closing 30 Oct, case 4 is waiting for approval, cases 5 and 6 are new.
- **Time fix:** `addDays` used local midnight then `toISOString`, which shifted dates by one day in UTC+7. It now works in UTC. Seed and screen dates computed with it move by one day in such time zones.
- **Tested:** 584 renders (roles × languages × organisations, every tab and case), the full small and competitive paths by clicking through the handlers (including split check, head approval, no-bidder rerun, appeal filed and upheld, SD-06 block, derived steps 10–12, cancel), demo links for all 15 steps, and 375 px width with no horizontal overflow.
- **Not done:** P2 (contract variations, penalties, acceptance timing, three-way payment gate), P3 (analytics, red flags, OCDS export), P4 (AI). The demo guide and the Solution Design are not updated for these screens. The red-flag tag for a single bidder is only a label for now.
