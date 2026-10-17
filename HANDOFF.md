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
| Demo script (Thai) | `Fisko_Demo_Script.html` | 24 steps: 15 minutes plus a 10-minute Procurement and Finance extension (steps 16 to 24). Matches the in-app demo guide. |
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
- `DATA_V` in `00-core.js` (now **19**) is the seed version. **Bump it whenever you change the shape of seeded data**, or browsers that already hold old saved state will keep the old shape and break. Bumping resets everyone's saved demo data once.
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

## 14. Contract management and the payment gate, P2 (round 14)

Builds P2 of `Fisko_Procurement_Design.html`. New file `63-contracts.js` (loads after `62-finance.js`); `60-procurement.js` now calls `conPanel(c)` for every contract panel, and the old `[data-sign]` handler is gone.

- **Settings** added to `S.pcfg` (all editable in M10 → Procurement rules, all marked to be confirmed except where the design says otherwise): `penaltyPct` (percent per day, 0.1), `penaltyCapPct` (10), `guaranteePct` (5), `guaranteeWarnDays` (30), `ladderPct` (10), `extDaysHead` (30), `acceptWd` (3), `acceptWdLast` (5), `invoiceTol` (0).
- **Contract fields:** `base`, `ver`, `versions[]`, `vars[]`, `guarantee`; per phase `delivered`, `ext` (days that forgive penalty: employer's fault or force majeure), `extV` (supplier's fault: moves the date but not the penalty), `result` (`ok` or `partial`), `okAmount`, `dissent[]`, `cert`, `invoice`, `hold`, `release`.
- **Delivery and acceptance (R-10):** the officer records a delivery notice; only then can committee members sign. Each signer picks accept in full, partly accept (amount and note), or dissent (reason). An open dissent blocks the phase until the head of procurement or executive records an instruction. The committee must agree on the result. Full acceptance issues 2 certificates. Construction contracts get a deadline in working days (3, or 5 for the last phase).
- **Penalty (R-09):** `phLate` and `phPenalty` give days late times rate times phase amount; cumulative penalties past the cap notify the executive and the head. Seeded contract 2 is one day late so the effect shows.
- **Variations (R-08, SD-08):** amount or time changes. The approver comes from the ladder (head up to 10 percent or 30 days, otherwise the executive). The proposer can't approve (SD-08). Approval makes a new contract version, checks the room left on the allocation line, and notifies Finance of the commitment change.
- **Payment gate (R-11):** `payGate(c, ph)` is used in the Finance payment form. It checks acceptance and certificates, that an invoice exists, that the invoice matches the contract, supplier and phase amount, and that the guarantee is in force. The payable amount is the accepted amount less the penalty, and the form insists on it. A failed gate holds the phase as an exception; the head or executive releases it with a reason (10+ characters), which notifies Audit and Finance.
- **Closing (R-12):** the case is closed from the case page when all phases are accepted and paid, the guarantee is returned and nothing is pending. It records lessons and a supplier score. Step 12 now means closed; step 11 means all paid but still open.
- **Reason fields:** the case "failed" and "cancel" actions now use an inline reason box. Published artifact pages can't show `prompt()` dialogs, so never use them.
- **Tested:** 616 renders, gate (missing invoice, mismatch, release, wrong amount, net of penalty), delivery, dissent and resolution, partial acceptance, variations by both ladder levels, SD-08 block, force majeure extension, guarantee return, closing, M10 decimal settings, 375 px width.
- **Not done:** the supplier register and scoring beyond the case, weekly supervisor reports and mid-contract assessment points (FR-PR-19), contract termination, SD-07 (conflict of interest declaration). P3 (analytics, red flags, OCDS export) and P4 (AI) remain.

## 15. Analytics, red flags and OCDS, P3 (round 15)

New file `65-analytics.js` (after `64-duties.js`, before `66-apps.js`). Three new Procurement tabs: `analytics`, `flags`, `ocds` (deep links `prc-analytics`, `prc-flags`, `prc-ocds`).

- **Semantic layer:** `KPIS` holds KPI-01..14, each one function returning value, sample size `n` and a note. Dashboards (and later an AI assistant) must call these, never recompute. `stepTimes()` gives KPI-03 from `S.caseEvents`. The funnel counts `caseState()`. With 6 sample cases most KPIs rest on 2 to 3 records, and the page says so.
- **Red flags:** `detectFlags()` derives flags from live data on every render, so nothing goes stale. Implemented: RF-01 (split purchases, both explained ones and clusters), RF-02, RF-03, RF-04, RF-05, RF-06, RF-07 (acceptance before delivery, payment before acceptance), RF-08, RF-09, RF-10. Weights are 40, 25 or 10; the score per case is the sum capped at 100. Settings `rfMinAnnounce`, `rfRatioPct`, `rfGrowthPct`, `rfRepeatWins`, `rfNearPct` live in `S.pcfg` and M10 → Procurement rules.
- **Workflow:** state per flag in `S.rfRev[key]` (key is `RF-xx|<case, contract or requisition id>`). Audit and the head of procurement see all flags; the head or audit can ask for an explanation; the procurement officer (or the owning unit's requester) answers only flags that were asked; Audit alone decides (accept, data fixed, escalate, false positive). Everything is in the audit log and the false-positive rate is shown. Nothing is ever blocked automatically.
- **Seed:** three flags show at the start (single bidder on case 2, winning price near the reference on cases 1 and 2). Raising the two small seeded requisitions adds an RF-01.
- **OCDS:** `ocdsRelease(c)` builds one release per case that has an announcement or award (planning, tender, awards, contracts with amendments, implementation transactions from approved payments). Method map: specific to limited, e-bidding to open. It leaves out losing bids, committees and internal reasons. The OCID prefix and the exact format are placeholders to confirm with the Comptroller General's Department. Download is inert on the published page, so Copy is the main path there.
- **Seed fix:** contract 2's phase 1 signatures now fall on the delivery day, so RF-07 does not fire on sample data.
- **Tested:** 728 renders, the full triage workflow by clicking, KPI and OCDS output checks, 375 px width.
- **Not done:** P4 (AI use cases AI-01 to AI-11), the KPIs shared with Finance (acceptance-to-payment time, monthly commitment forecast), KPI-03 working-day counting and waiting-time separation, per-supplier and per-unit comparison views, and data-quality rules beyond KPI-14.

## 16. Procurement AI use cases, P4 (round 16)

New file `67-procai.js` (loads last of the procurement files). One new Procurement tab, `ai` (deep link `prc-ai`).

- **No model is called.** Everything is rules or statistics, labelled version `rules-1`. Replacing a use case with a model later means swapping the function behind it (`aiConsolidate`, `aiRefPrice`, `aiSpecCheck`, `aiDelay`, `aiAnswer`, `aiSupplier`, `aiDraft`); the screens, logging and limits stay.
- **Agents:** AG-07 (drafting), AG-08 (contract monitoring) and AG-10 (insight) are added to `S.agents` and appear in M09 → AI Agents, where the executive can switch them off. AG-02 and AG-05 (existing) cover AI-04, AI-05 and AI-01. Every action calls `aiLog()`, which writes to `S.aiLog` (so it shows in the M09 log) with the agent, user, target, number of sources, outcome and version. A switched-off agent blocks its use case with a message.
- **Use cases built:** AI-01 name-similarity scan of the plan with an R-02 note; AI-03 reference price range from past contracts of the same kind, only recorded after the officer confirms; AI-04 TOR text check for brand and model wording plus the case checklist; AI-05 method advice with the rule and the documents needed; AI-07 delay-risk score 0 to 100 with reasons and a reminder-letter draft; AI-02 and AI-11 drafts (TOR, committee order, acceptance certificate, supplier letter) kept in `S.aiDrafts` with the AI text, the final text and the share of words edited; AI-09 answers only from `KPIS`, naming the source KPI, and declines questions outside the KPI set; AI-10 supplier summary from confirmed data.
- **Limits enforced:** AI-09 refuses requests to rank or score bids, select a supplier, announce a winner or approve, and the refusal is logged as not ok. No AI action writes to case steps 6 to 8. AI-06 (checking bidders' documents) is not built because no bidder documents are held (design decision D-P04).
- **Tested:** 788 renders across roles, languages and both organisations, the full set of use cases by clicking, the agent-off block, declines, and 375 px width.
- **Not done:** the design's AI quality measures other than draft-edit share (red-flag precision exists in P3), prompt-injection tests (no documents are read by a model yet), and real model integration through an LLM gateway.

## 17. Demo extension for Procurement and Finance (round 17)

The in-app demo guide (`52-demo.js`) and `Fisko_Demo_Script.html` now have steps 16 to 24, about 10 minutes, run on the sample organisation straight after step 15 without a reset: raise two small requisitions and meet the split-purchase check; the executive approves; the officer chooses a method that differs from the advice; the head approves; case PC-2570-003 goes through bids, award, the (simulated) appeal window and to the contract step; invoice for CT-2570-002 phase 1 (one day late, so a penalty shows); Finance request through the payment gate; Audit red flags and analytics; AI assistant and OCDS export.

- All nine steps were walked through the real UI with a script, and the demo guide lists 24 steps. If the seed data changes, rerun that walk: the steps depend on PP-2570-005 and 006 (the small items in the requester's unit), PC-2570-003 (at the e-GP step with a 30 October close), CT-2570-002 (a late phase 1) and the single-bidder case PC-2570-002.
- The award price in step 20 must stay at or under the reference price (about 29.4 million), or the screen asks for a reason.
- The Solution Design document is still not updated for the Procurement and Finance screens; the Procurement design document is the reference for them.

## 18. Sourcing in depth, Q1 (round 18)

Builds round Q1 of `Fisko_Procurement_Design.html` v0.2 (FR-PR-39 to 45, rules R-13, R-14, R-19, SD-07). New file `61b-sourcing.js`, which loads right after `61-cases.js`. One new Procurement tab, `tor` (TOR library); the tab codes are now P1 to P10.

- **Hooks:** `61-cases.js` now has `CASE_PANELS` (functions that return extra HTML for the case page) and `CASE_BINDS` (functions that bind them, given the case and `done`). `61b` adds its panels through these and wraps `caseChecks`. Use the same hooks for later rounds rather than editing `caseDetail`.
- **TOR library:** `S.torLib` with versions. An officer proposes a version (with a reason), and the head of procurement approves it; the proposer can't approve their own. A case's TOR is created from the latest approved version of a template, and `c.tor` records `tpl` and `tplV`.
- **Market research:** `c.market` entries per case, shown with median and range, and a new reference-price basis `market`.
- **Conflict of interest (SD-07, R-13):** `c.coi[committee][user]`. A member declares for themselves, or the officer records it from the paper form. A declared conflict blocks the step until the member is replaced (the officer picks a replacement, who must also declare). Step 4 needs the TOR committee declared; step 6 needs the evaluation committee declared. SD-07 can be switched off in M10, which removes the block.
- **Criteria and scoring (R-14):** `c.criteria` (lowest price, or price-and-performance with weights adding to 100), editable only at step 4. At step 6 the officer records each bidder and price (count must match e-GP), and each member enters their own scores (or the officer records them from the signed sheet). `totals()` adds them up; price score is lowest price ÷ offer × 100. The award form becomes a list of bidders with the price filled in. Choosing a bidder that isn't the top total needs a reason. Nothing in the system or the AI scores bids. A demo button fills in sample declarations and scores, labelled as a demo.
- **Q&A:** `c.qa` during step 5. An amendment can move the closing date later.
- **e-GP pack:** a text block for keying into e-GP, with copy. The field layout is a placeholder.
- **Status sync (R-19):** `egpMismatch(c)` compares the plan item's e-GP stage with the case step. The case page shows a warning, and after `S.pcfg.syncDays` (3) the officer gets a task.
- **Seed changes:** contracted cases now have criteria, declarations, bidders and scores consistent with their award. Requisition and preparation dates were moved earlier (August and early September) so every case timeline runs in order; previously the requisitions were dated after the award. The demo step 20 now uses the demo button for declarations and scores.
- **Tested:** about 950 renders, a click-through of the full Q1 flow (26 checks), the 9 demo extension steps, timeline order in both organisations, and 375 px width.

## 19. Contract late stage and suppliers, Q2 (round 19)

Builds round Q2 of the design v0.2 (FR-PR-19, 46 to 48, 50 to 52; rules R-15 to R-17). New file `63b-contract-late.js`, which loads after `63-contracts.js`. New Procurement page `suppliers` (P6); the later pages moved down one code (now P1 to P11).

- **Hooks:** `63-contracts.js` now has `CON_PANELS` and `CON_BINDS`, the contract-panel twin of the case hooks. Each Q2 section (supervision, termination, warranty, letters) is one entry.
- **Navigation change:** the in-page tab rows on the Procurement and Finance pages were removed, because the left menu already lists every page (user feedback). The page heading now shows the page name. `[data-prtab]` and `[data-fntab]` binders are left in place but have nothing to bind.
- **Supplier register:** `S.vendors` (name, 13-digit tax ID checked with the Thai check digit, type, SME, local, contact, status). History is worked out from contracts by name (`vendorHist`); names are compared with `normName`, which strips company-type words and spaces.
- **Abandoned-work list (R-17):** `S.blacklist.rows`, imported from a file (sample button) and replacing the list each time. `blHit(name)` matches by tax ID through the register or by normalised name. It blocks the award (wraps `awardGuard`), the small-path award (wraps `caseMove`) and contract creation. Only the head of procurement can release a match on a case, with evidence; Audit is notified.
- **Supervision:** `c.supervision = { who, reports, assess }`, on by default for construction cases and switchable for others. Planned progress is linear between signing and the last due date. Checkpoints at 50%, 75% and the end; the end suggests termination when progress is below 85% or penalties pass the cap. A demo button stands in for reaching a checkpoint, because the prototype clock is fixed.
- **Termination (R-15):** the officer proposes with grounds; the executive approves (SD-08 checks the proposer isn't the approver). Unaccepted phases get `cancelled`, the contract amount drops to the accepted work with a new version, the guarantee becomes `forfeited`, the supplier is marked `proposed`, and a termination letter is drafted. `caseState` and `closeChecks` ignore cancelled phases, and penalties stop at the termination date.
- **Warranty and defects (R-16):** `c.warrantyMonths` (set on the contract form, default from `S.pcfg.warrantyMonths`). The period starts at the last acceptance. Defects have a due date and a drafted repair notice. The guarantee can be returned only when fully paid, the warranty has ended and no defect is open; a demo button ends the warranty.
- **Letters:** `c.letters` from templates (reminder, penalty, rejection, defect, termination) with a sent date. A partial acceptance or dissent creates a task to send the rejection notice within 3 working days.
- **Not done:** retention money held back from each payment (a setting is planned but no deduction is made), sending letters by e-mail, and the abandoned-work proposal workflow beyond marking the supplier.
- **Tested:** about 780 renders, a click-through of the Q2 flows (24 checks), the 9 demo extension steps, and 375 px width.

## 20. Plan and reports, Q3 (round 20)

Builds round Q3 of the design v0.2 (FR-PR-03, 36 to 38, 53 to 55; rule R-18). New file `61c-planreports.js` (after `61b`). New Procurement pages `gantt` (P7) and `reports` (P10); the menu now has P1 to P13.

- **Categories:** `S.pcat` (8 sample categories, each tied to a kind of work). Plan items carry `cat`; the add-item form asks for it; admins add categories in M10 → Procurement rules. `guessCat` sets categories for seeded and intake items.
- **Plan versions:** `S.planDoc.versions` hold snapshots of the plan. The plan page shows what differs from the latest approved version. The officer proposes a new version with a reason; the executive approves or rejects; the officer records the e-GP notice number to mark it published. A requisition can only be raised for an item in the latest published version (level B; the rules have exceptions to confirm). Seed: v1 approved on 30 Sep and published on 1 Oct, holding all six seeded items, so the demo is unaffected.
- **Fix:** plan items added through the form now get a kind, a category and a case file. Before this round they had none, so they could not move through the case steps.
- **Demand intake:** allocation lines with no plan item can be drafted into the plan in one click. Approved or committee-stage M02 requests for next year are listed with suggestions to combine similar items (bigram similarity from the AI module).
- **Monthly summary (R-18):** rows come from cases whose winner was announced that month, in the common สขร.1 columns. Gaps (no reference price, no offers, no reason) block publishing. The head of procurement publishes; the published rows are frozen in `S.monthly`. Copy gives tab-separated text for Excel. The head gets a task for last month's report. The September 2026 report is left unpublished in the seed so the task shows.
- **Audit dossier:** a compiled text record per case (requisition and approval, method, reference price, committees with declarations, e-GP and Q&A, bids and totals, award, contract and versions, phases, payments, letters, red flags, timeline), for Audit and procurement roles, with copy.
- **Timeline:** one row per case from creation, with bars for preparation, sourcing and evaluation, and the contract period, plus the planned month, today and the fiscal-year start. Clicking a case opens it. Forecast signing dates are left for Q5.
- **Tested:** about 870 renders, a click-through of the Q3 flows (19 checks), Gantt bar positions, the 9 demo extension steps, and 375 px width.

## 21. Document intake and simulated OCR, Q4 (round 21)

Builds round Q4 of the design v0.2 (FR-PR-56, 57; chapter 12; decision D-P10). New file `63c-docs.js` (after `63b`). New Procurement page `docs` (P6); the menu now has P1 to P14.

- **Nothing is actually read.** `sampleDocs()` builds four sample documents from the seed data (invoice for CT-2570-002 phase 1, delivery note for CT-2570-001 phase 2, bank guarantee for CT-2570-001, quotation), each with a fixed value and confidence per field. The invoice total is misread by 6,000 baht on purpose, the delivery date and the quotation tax ID have low confidence. `docSvg()` draws a paper-like image with low-confidence fields highlighted. An uploaded file is not stored or read; it opens as an empty form typed by hand.
- **Checks:** V-01 tax ID (Thai check digit), V-02 subtotal + VAT = total, V-03 plausible dates, V-04 supplier matches the contract party, V-05 contract and phase exist (or a case is chosen for a quotation), V-06 guarantee amount and expiry, V-07 duplicate. Every low-confidence field (under 80%) must be ticked as checked. Confirm stays disabled until everything passes and the target can take the data (for example, a phase that already has an invoice is refused).
- **Applying:** invoice → `ph.invoice` (so the payment gate sees it), delivery note → `ph.delivered` (inspectors notified), bank guarantee → `c.guarantee` (replaces the current one), quotation → case quotations at step 4 on the small path, otherwise market research. Each record keeps `doc` with the document ID.
- **Agent and quality:** registered as AG-14 Document Intake Agent in `S.agents`; switching it off in M09 blocks new reads. Each read is logged in the AI log. The page shows the share of fields confirmed without edits, the quality measure from design chapter 8.3.
- **Name clash to remember:** `67-procai.js` already uses `DOC_T` for draft types, so this file uses `DOC_TYPE`. All files share one script scope; check `node --check` after adding constants.
- **Tested:** about 880 renders including every sample in review, a click-through of all four document types plus upload, duplicate and agent-off cases (16 checks), the 9 demo extension steps, and 375 px width.
