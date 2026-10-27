# Fisko: project handoff

State as of 18 October 2026, branch `main`. Round 42 (Fisko Finance FN6) is the latest; see sections 36 to 42. This note is for whoever picks the work up next: what exists, how to run and change it, what was decided, and what is still open.

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
| Demo script (Thai) | `Fisko_Demo_Script.html` | 25 steps: 15 minutes plus a 12-minute Procurement and Finance extension (steps 16 to 25). Matches the in-app demo guide. |
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
- `DATA_V` in `00-core.js` (now **21**) is the seed version. **Bump it whenever you change the shape of seeded data**, or browsers that already hold old saved state will keep the old shape and break. Bumping resets everyone's saved demo data once.
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

## 22. Forecast and what-if, Q5 (round 22)

Builds round Q5 of the design v0.2 (FR-PR-26, 60 to 62; chapter 13). New file `65b-forecast.js` (after `65-analytics.js`). New Procurement pages `forecast` and `whatif`; the menu now has P1 to P16.

- **Durations:** `stageSamples()` reads stage durations from the case events. A stage with fewer than `fcMinN` (3) cases falls back to `S.pcfg.fcSla` with a ±30% spread, and the page lists which stages use defaults. A seeded random generator (`rng`, one seed per case) makes results repeatable.
- **F-02:** `simCase(c, opt)` runs `fcRuns` (400) simulations of the remaining stages per open case (plan start 45 days before the planned month, e-GP closing date when known, appeal window in working days) and returns the chance of signing by the cut-off, median, P10, P90 and the longest stage. `opt` takes `methods`, `delay`, `speed` and `cutoff`.
- **Cut-off:** selectable on both pages: fiscal-year end (`S.pcfg.signCutoff`), end of Q2, end of Q1. With 11 months left, everything signs by year end, which is honest; the earlier cut-offs show risk. The Q2 date stands for a spending-acceleration target and is level C.
- **F-01:** commitments (actual by signing month plus expected from the simulations, with P10–P90 per month) and payments (actual plus unpaid phases at due date + the acceptance-to-payment lag, plus expected payments from simulated contracts in three thirds). Drawn as an SVG chart.
- **F-03, F-04, F-05:** price ratio per category with a yearly index; cases below the `carryRisk` chance (50%) with a button that notifies Finance; weekly officer hours from `stageHours` against `weekHours` × officers.
- **What-if:** `runScenario(w)` recomputes everything from parameters only: W-01 cut of not-yet-approved plan items (latest first, lockable), W-02 specific-method ceiling, W-03 extra days on one stage, W-04 price rise against reserves, W-05 penalty rate and approval ladder, W-06 officers (workload over capacity slows every stage). Up to four scenarios are saved in `S.scenarios` for side-by-side comparison.
- **Role cards:** the Analytics page opens with four cards for the signed-in role (officer, head, executive, Audit, Finance), each linking to its page.
- **Timeline:** open cases show the expected signing date (diamond) and the P10–P90 range.
- **Name clashes:** `FY_END` and `FY_MONTHS` already exist in the budget modules, so this file uses `PFY_END` and `PFY_MONTHS`.
- **Tested:** about 670 renders, forecast numbers and determinism, each lever, scenario saving with real data unchanged, role cards for five roles, the Finance notice, Gantt markers, the 9 demo extension steps, and 375 px width.

## 23. Agentic AI, simulated, Q6 (round 23)

Builds round Q6 of the design v0.2 (FR-PR-58, 59; chapter 11; decision D-P09). New file `67b-agents.js` (after `67-procai.js`). New Procurement page `agents` (P17). This completes every round in the design (P0 to P4, Q1 to Q6).

- **No model is called.** Each agent's plan is a template built from the current state (`planCopilot`, `planWatch`, `planReporter`, `planInsight`). Each step calls an existing rule function through `EXEC[tool]`, and writes go through `applyStep`. To use a real model later, replace the planners and the text in `EXEC`; the register, levels, trace and approvals stay.
- **Tool register:** `TOOLS` lists each tool with its kind (read, draft, propose, write, notify) and the agents allowed to use it. A step whose tool isn't allowed for the agent is blocked. Scoring bids, awarding, signing, approving and paying are not in the register at all, and the page says so.
- **Levels:** `S.agentLevels` per agent. L0 only suggests (nothing is written, drafts are shown only); L1 saves drafts; L2 writes after a person approves each step; L3 also creates tasks and notifications by itself (AG-12 only). The executive changes levels with a reason, which is audited and notified to Audit. Seed: AG-11 L2, AG-12 L3, AG-13 L1, AG-10 L0.
- **Runs:** `S.agentRuns` keep every step with status, output, the before/after of a write, timing and who decided. A run stops at the first write that needs approval. Only someone who could do the action themselves can approve it (for example only the head of procurement can approve publishing the monthly report). There is no approve-all; each decision records the seconds taken, and approvals under 3 seconds are counted as unusually fast. A run can be stopped at any time.
- **Agents:** AG-11 Case Copilot prepares a case at step 3 or 4 (method, move to step 4, reference price, TOR from the library with a spec-lock check, a committee clear of SD-06 with the order number typed by the person, criteria, the e-GP pack; or a request for quotation on the small path). Committee members still have to declare conflicts themselves. AG-12 Contract Watch scores delivery risk, drafts reminder letters (not sent), creates tasks (stored in `S.agentTasks`, replaced on each run) and notifies on penalties over the cap. AG-13 Compliance Reporter reads the month, checks gaps, drafts and proposes publishing. AG-10 answers a multi-step question from KPIs, forecasts and flags.
- **Demo:** step 25 runs the Case Copilot on PC-2570-006 after the earlier steps.
- **Tested:** about 700 renders, every agent end to end at different levels (L0, L1, L2, L3), the permission rule on approvals, level changes, agent off, the 10 demo extension steps, and 375 px width.

## 24. Design system v2, "clean enterprise" (round 24)

The user found the interface unimpressive and chose a clean enterprise direction, a system-first pass with deep redesigns of the showcase screens, and kept the navy and green brand.

- **Where:** `src/theme.css` is a new stylesheet that the build adds after `styles.css` (see `src/build.sh`), so it restyles every screen through the existing class names. Tokens are redefined on `:root` with both dark blocks. Fonts are now Inter (Latin) and Anuphan (Thai) from Google Fonts, plus IBM Plex Mono for codes (`src/head.html`).
- **UI kit:** `05b-ui.js` has `ICONS` and `svgI` / `icon` / `chipIco` (inline stroke icons), `NAV_ICON` (menu icons per page and per Procurement or Finance page), `spark` (sparkline), `ring` (progress ring), `av` / `avs` (initial avatars), `statCard` and `bindLinks` (the router calls it after each page so cards with `data-link` are clickable and keyboard-reachable).
- **Shell:** the menu shows an icon per item (codes such as P5 are kept as a tooltip and in the `code` span, hidden by CSS); the active item has an accent bar. Alerts and theme are icon buttons. The breadcrumb now names the app and the page.
- **My Workspace:** `30b-home-v2.js` replaces `VIEWS.home`: hero with greeting and three counters, four stat cards (my tasks, FY2570 committed or reserved as a ring, open procurement cases with a sparkline by step, payments this year with a monthly sparkline), tasks with a filter per app and a priority stripe, the budget calendar as a date strip, notifications, app tiles and the storyline project. The old binder is reused, so the demo links still work.
- **Procurement:** `61d-ui-board.js` overrides `caseList` with stat cards, a funnel strip of the 12 steps and a board with four columns (preparing, sourcing, contract and delivery, closed or cancelled). Cards show method, amount, a 12-segment progress bar, the next action and avatars. The table view is one click away (`CASE_VIEW`). The case page (`caseDetail` in `61-cases.js`) now opens with a progress ring and fact chips above the step track. It then splits into a main column and a side column, with "This step" and the timeline pinned on the right. The page heading is hidden while a case is open. Contracts get a phase track (`phaseTrack` in `61d`, called from `conPanel`). Forecast gets stat cards and a chart with rounded bars and gridlines.
- **Fixes found on the way:** callouts inside panels were dark navy with dark text in v1 (`.panel > .body .callout`); now light. Entrance animation uses movement only, because content that starts at zero opacity stays hidden in a background tab. The desktop menu width needs its own phone rule in `theme.css`, or the phone layout splits in two; the overflow check doesn't catch this, so look at a phone screenshot too.
- **Tested:** about 980 renders including both case views, the full demo walk (25 steps), board and table interaction, light and dark, and phone width (128 views, plus screenshots).
- **Not done:** the Budget module screens only got the shared restyle, not a per-screen redesign; the AI assistant and OCR pages got the shared restyle only.

## 25. Document review and Budget module redesign (round 25)

- **Bug fixed from round 24:** the My Workspace binder bound every element with a `data-app` attribute, and `document.body` carries one (`66-apps.js` sets `body.dataset.app`). After visiting My Workspace, any click bubbled to the body and switched apps. This was in commit `035e8ec` and artifact version 28. The binder is now scoped to `.apptile[data-app]`. Lesson: never bind a bare attribute selector that the shell also uses.
- **Document review:** `63d-docs-ui.js` overrides `PROC.docs`, `docReview` and `docSvg` (from `63c`) and keeps every id and data attribute, so `bindDocs` is unchanged. New: a drop zone (drag and drop or click) beside sample tiles, document cards, a four-step progress strip, a sticky image, a summary with average confidence and a check ring, field rows with a confidence meter (green 90%+, amber 80–90%, red under 80%), a "check against the original" chip that saves as soon as it is ticked, check chips, and a sticky action bar that lists what is left before confirming. Moving the pointer over (or tabbing into) a field highlights that field on the image.
- **Budget module:** `49-budget-ui.js`. `uiDecorate(view)` runs after every page render (from `route`). It adds an icon to the page heading from `NAV_ICON`. It gives each legacy KPI tile an icon chosen from its label (`KPI_ICON` keyword table) and a coloured accent; tiles with `.hl` keep their dark style. Tabs everywhere are now a segmented bar (CSS). M02 requests: stat cards and a board with four columns (drafting and fixing, planning review, committee, decided); each card shows amount, change against last year, a four-stage bar and open comments. The table is one click away (`REQ_VIEW`). In board mode the table panel stays in the page but is hidden, because the old binder fills it. M04 review: the round totals are three columns with bars and the change from the previous round. Chat bubbles, strategy tree rows, bars and dark highlight cards also got the new styling.
- **Tested:** about 850 renders (with every document sample in review and both request views), the 25-step demo walk, a request card opening the request, app tiles switching apps and page clicks not switching, the full document flow on the new screen, 375 px width with full-width layout, and dark mode.

## 26. Calm look (round 26)

- **Why:** the v2 look used many accent colours, coloured icon chips, gradients and lift-on-hover. The user asked for something calmer and more professional, and chose the light sidebar after seeing both options.
- **Where:** `src/calm.css`, added by `src/build.sh` after `theme.css`, so it only overrides. Remove it from the two `cat` lines to get v2 back. Tokens are redefined on `:root` and in both dark blocks; new tokens: `--side*` (sidebar), `--app-b/p/f` (app marks), `--ok-dot`.
- **Rules it applies:** one slate-navy accent (`#34498C`, brightened from `#2B3A67` in 26c; `#9DB0E3` in dark) for actions, the current menu item and charts; green, amber and red only as small status dots in outline pills; grey icon chips; no gradients, glows, hover lifts or entrance motion; borders instead of shadows; headings and big numbers at semibold 24 px; chart colours `--c-1..6` are navy-to-grey shades with amber as the only warm tone; white sidebar with a soft navy highlight.
- **Code changes:** `APPS` colours in `66-apps.js` are now `var(--app-b/p/f)` (the brand mark and app chips use them); `AV_COLORS` in `05b-ui.js` are slate shades. The paper colours inside the document image SVG (`63c`, `63d`) are left as they are, because they draw a paper document.
- **Tested:** 728 renders (all roles × th/en × both organisations × every page and tab), the 25-step demo walk, 375 px width (no overflow, full-width main), and dark mode on Procurement pages. Note: a screenshot taken right after switching to dark mode can catch a colour transition; take it again before judging.
- **Charts keep the brand colour (26b):** after review, the user wanted the UI mostly calm but charts in the Fisko colours. New chart tokens `--ch-1..6` (Fisko green `#16A34A`, navy, light green, amber, teal, grey; brighter versions in dark mode); `--c-1..6` now point at them. Chart code uses `--ch-1` where it used `--accent` and `--ch-2` where it used `--info` (`40-dashboard`, `40b`, `44b`, `47`, `48`, `65b` charts, `65-analytics` funnel, `61c` timeline, `49` rounds, home spark); `spark()` and `ring()` default to `--ch-1`. Alert icons keep `--info`. Progress bars, funnels and legend swatches use the chart colours through `calm.css`. Tested again: 728 renders, demo walk, dark mode.
- **Menus hidden by role stay hidden:** the user chose not to show them as locked items.
- **App switcher (26c):** the logo button still used the dark rail hover (`--rail-2`) when open, the app letters were dark on navy, and the current app had a hard left bar. `calm.css` now gives the open button the light sidebar hover, white letters on the app marks (dark letters in dark mode), a soft highlight for the current app and an outline task count. CSS only.

## 27. AI co-work chat (round 27)

- **Asked for:** an AI assistant and co-work chat "like Claude or ChatGPT" in every module, with a chat box, file upload, voice and attachments, where you can also talk to each specialised agent. Choices: build it before round B1; real file and voice input where the browser allows; both a side panel and a full page.
- **Where:** `src/js/68-cowork.js` (engine and UI) and `src/cowork.css` (added to `build.sh` after `calm.css`). It wraps `renderShell` (adds the **AI** button before the bell) and `route` (keeps the panel in step with the page). New route `#cowork` (not in NAV, open to every role, like `#demo`).
- **Agents:** `cwAgents()` = the general **Fisko Assistant** (`FA`) plus the agents in `S.agents` whose app the role can use, with icon, autonomy level and abilities from `CW_META`. Switched-off agents (M09) answer that they are off. `FA` routes by keywords (`CW_ROUTE`); attaching an image or PDF routes to AG-14. `@AG-05` in a message switches agent.
- **Answers:** `cwAnswer(agent, text, files, recs)` returns HTML, the steps taken (shown as a collapsible list that ticks through) and action buttons. It reuses existing logic: `checks()` (AG-02), `answer(0/2)` from M09 (AG-05, AG-03), `aiAnswer()` KPI layer (AG-10), `phLate()` (AG-08/12), `caseState()` (AG-11), `sampleDocs()` (AG-14), `myTasks()` and `S.payreqs`. A guard (`CW_NO`) refuses approving, changing amounts, signing, paying, awarding or scoring. "Put this draft in the request" is the only write, it is a button, and it only works when the person can edit the request. Each answer is logged in `S.aiLog`.
- **Context:** the panel sends the current page and record (request on `#request`, case on an open case) unless you remove the context chip.
- **Files:** picker, drag-and-drop onto the composer, and paste. CSV and text files are read with `FileReader` (CSV: row and column count, first rows, totals of numeric columns). Images and PDFs show a preview and a simulated reading (D-P10). Only file metadata is saved in `S.cowork`; previews use object URLs and are lost on reload.
- **Voice:** `webkitSpeechRecognition` (th-TH or en-US) when available and allowed; otherwise, or when the microphone is blocked (as in the published artifact and the Browser pane), a simulated recording fills in a sample question.
- **Threads:** `S.cowork.threads` (per user: `user`, `title`, `agent`, `msgs`, `pin`). The full page has search, pin, delete, an agent directory and an info column; the panel has new chat and history.
- **Tested:** 2,104 checks (every page for every role, both languages and organisations with the panel open, plus `#cowork`, and every agent against 12 sample questions in two organisations and four roles), the 25-step demo walk, drafts applied to a request, CSV and image attachments, the refusal guard, voice fallback, 375 px width and dark mode.
- **Next:** round B1 of the Budget design (data spine and new request form) was paused for this round and is next.

## 28. Budget round B1: data spine and request form (round 28)

- **Design:** round B1 of `Fisko_Budget_Design.html` (FR-B-07 to 13, 19, 20; BR-07 to 13; UX-02, UX-04).
- **Where:** `src/js/41d-req-b1.js` (roles, statuses, rules, request steps and panels, data sync, seed) and `src/js/49b-budget-b1.js` (review waterfall, consolidation cap strip). Small edits: `42a-review-mode.js` (who can review which status; the pass button's next status), `41-requests.js` (timeline index for the new statuses; `routeSteps` uses `needsCommittee`; unit-scoped lists use `unitRole()`), `49-budget-ui.js` (board columns and card bar for the new statuses), `06-seedhelp.js` (calls `seedBudgetB1`), `00-core.js` (`DATA_V` 22). Styles at the end of `src/calm.css`.
- **Role and statuses:** `divhead` (division director; demo user u20 in the requester's unit). New statuses `unit` (waiting for the director) and `exec` (waiting for the executive when the committee is not needed). Flow: draft → unit → plan → committee or exec → approved. `needsCommittee(r)`: amount ≥ w3 amount, or a new project (`w3.newProj`), or investment if `w3.invest`. The director is added to every menu the requester has, at shell render (so menus registered by later files are covered). `MATRIX.divhead` is set the same way.
- **Request steps:** `reqTabsBar` is replaced by a step bar. Every check carries a `step` (`main`, `plan`, `ready`, `docs`, `years`, `equip`), and the dot is red if any check in that step blocks, amber if any warns. The "Next" hint shows the first open item with a button to its step. Submitting with a blocking item jumps to that step.
- **Data:** `r.qplan[4]`, `r.ready {site, staff, mgmt, mat, forest, eia, evals}`, `r.risks[{type, lvl, fix}]`, investment `detail.loc/lat/lng/src/srcDate`. Seeded for submitted requests; the storyline request (REQ-2571-014) starts without them, so the demo shows the steps to finish.
- **Documents by condition:** `reqDocs(r)` decides what is required from the lines (ICT by keywords, construction by keywords, unit price above 1 M, investment ≥ 500 M, multi-year ≥ BR-09). Attach with a real file picker (name stored) or "Use a sample".
- **Spine:** `syncBudget()` runs before every route. It rebuilds `S.cons.units` from the requests (by budget type, M baht) and `S.review` from requests in plan, committee, exec or approved (keeping round 2 and 3 amounts already entered). The three stand-alone sample projects (REQ-2571-021..023) are gone; committee meeting items were remapped to real requests and the change log rewritten. M03 ceiling is 95% of what is requested.
- **Tested:** 2,356 renders (every page for every role including the director, both languages and organisations, plus every request in every step), the full flow (complete the storyline request, send, director approves, Planning passes it to the committee), the 25-step demo walk, 375 px width and dark mode.
- **Not done in B1:** steps 1 to 4 of the seven-step form in the design are still one page ("Lines and justification"); the hint and dots guide through it. Rule parameters are in M10 but BR-11 exceptions can't be flagged yet. Next is round B2 (structure per the Budget Bureau, 3R, five-criteria priority, zero-based view, MTEF).

## 29. Budget round B2: Budget Bureau structure, 3R, priority, zero-based, MTEF (round 29)

- **Design:** round B2 of `Fisko_Budget_Design.html` (FR-B-01, 03, 04, 14 to 17).
- **Where:** `src/js/43d-cons-b2.js` (M03) and `src/js/45c-strategy-b2.js` (M01 and `seedBudgetB2`). Styles at the end of `src/calm.css`. `DATA_V` 23.
- **Five criteria:** `S.criteria` is now k1 obligation 25, k2 urgent policy 20, k3 readiness 20, k4 severity 20, k5 beneficiaries 15 (weights still editable on the Priority tab). `autoScore(r)` fills obligation (personnel or multi-year 5, continuing 4, new 2) and readiness (from B1's readiness score) and carries the old scores over. `ensureScores()` runs before every route so new requests always have five scores. `scoreOf` is replaced to read any number of criteria.
- **3R:** `threeR()` per request: personnel is kept as an entitlement; score below 55 → redeploy 15%; last year under 70% of plan (from `S.dash.units`) on a continuing request → redeploy 10%; a zero-based flag → redeploy 10%; score 70+ below the project-ceiling line → replace with up to half its request, from the redeployed pool. Planning's button writes the result into round 2 (`S.review.r1`) only for requests waiting for Planning, with a 3R reason in the change log.
- **Zero-based:** rolled over = continuing and within ±5% of last year. Planning can ask a division to explain again (`r.zbb`, notifies the division and its director). The division answers on the request (`r.zbbNote`, editable until approved), and a warning check stays until the answer is 40 characters or more. The seed flags REQ-2571-009.
- **MTEF:** the forward-estimates tab gets a "locked" table: multi-year amounts from M02 plus personnel grown at the assumption, as a share of the expected ceiling, and what is left for new work.
- **M01 link tab:** `MASTER` lists three master plans as examples (20 public services and government efficiency, 12 learning, 21 anti-corruption). Strategies get `mp` (chosen by Planning) and `minShare` (set by the executive). A request linked to KPIs in two strategies counts in both, as the manual allows many-to-many links.
- **Tested:** 2,592 renders (every page, every M01 and M03 tab, every request step, every role including the director, both languages and organisations), 3R applied to round 2, the zero-based ask and answer, the 25-step demo walk, 375 px width and dark mode.
- **Not done in B2:** the five-level structure in M10 (service goals as their own level) and the risk register per strategy (FR-B-05) and division KPI proposals (FR-B-06), which the design marks "should" and "could". Next is round B3 (committee role and quorum, cut impact, the submission pack in Budget Bureau layout, minister approval, the briefing pack, and allocation lines created from the appropriation act).

## 30. Budget round B3: committee, cut impact, submission and briefing packs, lines from the act (round 30)

- **Design:** round B3 of `Fisko_Budget_Design.html` (FR-B-18 not done; FR-B-21 to 26; SD-10; D-B02, D-B03, D-B07).
- **Where:** `src/js/42d-review-b3.js` (committee, quorum, votes, minutes, cut impact, `seedBudgetB3`), `src/js/46c-sub-b3.js` (minister approval, pack, briefing, `seedBudgetB3Sub`), `src/js/47c-alloc-b3.js` (lines from the act). Styles at the end of `src/calm.css`. `DATA_V` 24. AG-16 (Hearing Prep Agent) added to M09 and to the AI co-work chat.
- **Committee:** role `committee` (demo users u21 to u23 in U05, U06, U03). `S.committee = { members, chair, secretary, quorum: 50 }`: the executive (chair), finance and the three members vote; Planning is the non-voting secretary. On the next scheduled meeting, `m.present` and `m.votes[reqId][userId]`. The record button is blocked without a quorum (`quorumN()`). A present member whose unit matches the request's unit abstains (SD-10). After recording, `m.minutes` holds a bilingual draft (attendance, resolutions, votes, abstentions) shown with a copy button. Members get a "vote on the agenda" task.
- **Cut impact:** `cutImpact(r, amount)` scales each linked KPI's first-year target and the quarterly plan in direct proportion (D-B07). It is shown live beside the resolved amount; when a cut is resolved, `r.cutImpact` is saved, `r.qplan` is scaled, and the request page shows the effect.
- **M05:** `S.submission.minister = { no, date, by }`; the send button stays disabled until it is recorded. "Budget Bureau pack" tab: summary by programme and output, activities by five-criteria priority, by budget type, multi-year commitments, quarterly plan roll-up, and `packCsv()` (one row per line with programme, output, activity, type, item, quantities and quarters) shown with a copy button. "Briefing pack" tab: `S.observations` (last year's scrutiny committee observations and responses), one card per request with `briefQs(r)` (growth over the threshold, new project, readiness, multi-year, ICT duplication, zero-based) and answers drafted by AG-16 on request.
- **M06:** `actAmount(r)` = parliament's final amount when the bill is in force (`parlFinal`), otherwise the Budget Bureau result. The create button builds lines with `req`, and `planFromQ` spreads each quarter of the request's plan over three months. A draft made before the act can be updated with "Update to the act's amounts".
- **Tested:** 3,504 renders (every page and every tab clicked through for every role including the committee member and the director, both languages and organisations, plus every request step), the committee flow (vote, quorum block, reduce with impact, minutes), the minister gate, the pack and briefing, lines from the act, the 25-step demo walk, 375 px width and dark mode.
- **Not done in B3:** non-budget money (FR-B-18) and real e-Budgeting file formats (D-B03). Next is round B4 (live in-year management: spending plan versions, allotments and distribution, transfers per the regulation table R-B-01, four-level balances from Procurement and Finance, live monitoring, carry-over, savings).

## 31. Budget round B4: live in-year management (round 31)

- **Design:** round B4 of `Fisko_Budget_Design.html` (FR-B-27 to 33; R-B-01; BR-14 to 17, 19 to 21). FR-B-34 (central fund and supplementary requests) not built.
- **Where:** `src/js/47d-alloc-b4.js` (everything, including `seedBudgetB4`). Styles at the end of `src/calm.css`. `DATA_V` 25.
- **Balances:** `bal(l)` = { allot, res: `famReserved`, com: `famCommitted`, paid: approved `S.payreqs` through the line's contracts, avail = allot − res − com }. New M06 tab "Four-level balances" (FY2570 only) with a stacked bar per line and a drill-down to requisitions, contracts and payments. Allotment status `l.allot` (`regional`, `due`, `sent`); the seed has one regional line due today (BR-16).
- **Transfers:** `ALLOC.transfers` is replaced. `classifyTransfer` uses `lineage(l.act)` for programme and output: T6 if the source is extended, T4 if the target is a new project, T3 across programmes, T2 across outputs, else T1. `TR_TYPE` gives the internal approver (Finance director for T1, executive otherwise, Cabinet for T4) and whether the Budget Bureau must agree. Statuses: pending → (bb) → approved, or rejected; T4 shows "needs Cabinet" and has no approve button. T1 gets `reportDue` (+15 days) and "Mark reported". Amount check uses the available balance, not just the allotment. Reasons are the five of clause 25 (`TR_WHY`). The old transfer form and buttons (`#tr-form`, `data-tap`) are no longer rendered; the old `transferLevel` is unused.
- **Plan versions:** `A.planSent` (seed 2026-09-10, so the BR-14 check passes) and `A.planVersions` (quarter totals, reason from `PLAN_WHY`, note), shown above the monthly plan.
- **Savings:** contract price below the procurement-plan estimate. "Transfer it" opens the transfer form pre-filled (`B4_PREFILL`); "Keep" records the choice on the contract (`savUse`).
- **Live monitoring:** M07 tab "This year (live)": paid and committed against allotments, investment committed, investment with no reservation or commitment (BR-20), and a per-unit table of plan-to-date versus paid. Targets come from `S.spendTargets` (seeded 32/54/77/100 by quarter, year-end 94/80/98; level B, to confirm).
- **Tested:** 2,333 renders across both organisations (every page and tab clicked through for every role, every allocation tab in both years, line drill-downs, request steps in the sample organisation), a T1 transfer through to "report by", a T3 transfer through the executive and the Budget Bureau, savings into a pre-filled transfer, live monitoring, the 25-step demo walk, 375 px width and dark mode. The second organisation is swept in smaller batches because one long call timed out in the Browser pane.
- **Next:** round B5 (results: quarterly reporting with deadlines, evidence, cost per output, three-stage evaluation, recommendations to act on, public page), then B6 (AI and analytics for the Budget module).

## 32. Budget round B5: results (round 32)

- **Design:** round B5 of `Fisko_Budget_Design.html` (FR-B-35 to 40; BR-18; sections 46 to 48).
- **Where:** `src/js/48c-perf-b5.js` (five new M08 tabs and `seedBudgetB5`). Styles at the end of `src/calm.css`. `DATA_V` 27.
- **Data year:** FY2569, the year M07 and M08 already show (snapshot 30 April 2026). Outputs are `S.perf.outputs[projectId]` and spending is `S.dash.projects` (same ids).
- **Quarterly reports:** `QR_ROUNDS()` gives Q1 to Q4 (due 15 days after each quarter) and the annual report (45 days). `S.qrep[round][unit] = { status: draft | submitted | accepted | returned, items: { projectId: { result, problem, fix } }, evidence: [names], certified, t, by }`. A unit (requester or director) edits only the open rounds (Q4 and annual); sending needs every result. Planning accepts or returns; the auditor certifies the evidence. Seed: Q1 to Q3 accepted for every unit; Q4 accepted for one unit, submitted for another, a draft for the demo requester's unit (U04), and missing for the rest (shown late, because Q4 was due 15 October 2026).
- **Cost per output:** actual = spent ÷ result, planned = planned spend ÷ target (same period), last year from `S.lastCost` (seeded at 95% of plan). Flags: above plan by more than 15%, below by more than 10%, no output yet.
- **Three-stage evaluation:** one row per project: before (readiness of a request from the same unit, from B1), during (spend and output against plan, number of accepted reports), after (`S.evals`), impact (Planning ticks projects into `S.impactSel`).
- **Recommendations:** `S.recs` (source: Budget Bureau, auditor or scrutiny committee; owner unit; due; status; action taken). Planning or the auditor adds; the owning unit updates status and action; overdue items are flagged.
- **Public page:** a preview of the citizen summary (allotment, share spent, KPIs met, top outputs with their spending). `S.publicPub` records approval; no real website is made.
- **Tested:** 2,432 renders (every page and tab for every role, both languages and organisations, plus every reporting round with every unit selected), the report flow (blocked without results, send, accept, certify), adding a recommendation, publishing, the 25-step demo walk, 375 px width and dark mode.
- **Next:** round B6 (AI and analytics for the Budget module: multi-step budget agents in the AG-01 to 06 and AG-15 to 17 family, forecasts FC-B1 to 3, what-if WI-B1 to 4, KPI-B01 to 10 and warning signals BF-01 to 06).

## 33. Budget round B6: AI and analytics (round 33)

- **Design:** round B6 of `Fisko_Budget_Design.html` (chapter 10: agents, FC-B1 to 3, WI-B1 to 4; chapter 11: KPI-B01 to 10, BF-01 to 06). With this round, B1 to B6 are all built.
- **Where:** `src/js/69-budget-ai.js` (four new M09 tabs and `seedBudgetB6`, which adds AG-15 and AG-17). Styles at the end of `src/calm.css`. `DATA_V` 28. AG-15 and AG-17 also added to `CW_META` in the co-work chat.
- **Agents:** a separate, lighter engine from Procurement's (`67b`), with the same rules. `B_AG[agent].plan()` gives tool steps; `B_EXEC[tool](run, step)` returns done, skipped, blocked or await; `bApply` performs an approved write. Runs are in `S.bRuns`. Who may approve each agent's write step: Planning for AG-02, 03 and 17; Finance or the executive for AG-05; Finance for AG-15 (`bCanApprove`). Writes: notifications (AG-02, AG-17), round-2 amounts with a reason in the change log (AG-03), tasks for the requesting unit in `S.agentTasks` shown in My Workspace (AG-05), a pending transfer that still goes through the normal approval (AG-15). AG-04 only proposes. Every step is logged in `S.aiLog`.
- **Forecast:** `fcYear()` per FY2570 line: max(paid, contract phases due in the year) + 80% of reservations + the free amount × a probability by budget type (personnel 100%, operating 90%, investment 62%). P10 to P90 widen with the investment share. Carry-over = phases due after 30 September + 25% of free investment. FC-B3 reads next year's multi-year amounts.
- **What-ifs:** `WI_B` holds the inputs (never saved; nothing in `S` changes). WI-B1 uses `scoreOf` and `impactText`; WI-B2 moves the line's Q4 plan into next year; WI-B3 uses `classifyTransfer` and `TR_TYPE`; WI-B4 uses `impactText` and drafts an appeal.
- **KPIs and signals:** `kpiB()` and `bSignals()`; thresholds are level-C proposals in code (to become M10 settings).
- **Tested:** 1,968 renders (every page and tab for every role, both languages and organisations, every budget agent started and shown, every what-if cut method), each agent run to completion with approvals (AG-02 notifications, AG-03 round 2, AG-05 tasks reaching the requester, AG-15 creating a pending T3 transfer, AG-17 reminders), the 25-step demo walk, 375 px width and dark mode.
- **Known simplifications:** fixed in round 34 (see below).

## 34. Agent tasks by unit, and budget AI settings in M10 (round 34)

- **Agent tasks:** the My Workspace hook in `67b-agents.js` now shows a task only to its role and, when the task has a `unit`, only to that unit. A division director also sees the division's tasks for the director's own unit.
- **Settings:** `src/js/69b-budget-settings.js` adds M10 tab "Budget AI and signals" (`ADMIN_TABS` id `bcfg`; administrator edits, finance and the auditor read). `bcfg()` merges defaults (`BCFG_DEFAULT`), any older `S.spendTargets` and `S.bcfg`:
  - `targets`: quarterly cumulative and year-end spending targets (level B). `spendT()` in `47d` reads them.
  - `fc`: probability that the free amount is spent, per budget type; share of reservations spent; share of free investment carried over (level C). `fcYear()` in `69` reads them.
  - `sig`: BF-01 September share, the rolled-over band (also used by the M03 zero-based view through `rolled()` in `43d`), BF-04 last-year rate, BF-05 spend and output, BF-06 minimum count (level C). `bSignals()` reads them.
  - Each change writes the whole config to `S.bcfg` and an audit entry; "Restore defaults" clears it. `r3`: the 3R rules (low score 55 → cut 15%, last year under 70% of plan → cut 10%, rolled over awaiting an answer → cut 10%, score 70+ below the line → add up to 50%), read by `threeR()` in `43d` and so by agent AG-03 (level C).
- **Tested:** raising the 3R low-score threshold to 75 moves the proposal (2 → 6 cuts, 5.5 → 16.1 M freed) and the rule text on the 3R tab; changing settings moves the forecast (93.2% → 95.0% with investment at 90%), the signals (3 → 14 with September at 5%) and the target; finance is read-only; reset restores the defaults; tasks reach only the right unit; about 1,400 renders across both organisations; the 25-step demo walk; 375 px width.

## 35. Demo guide, Budget design v0.2 and a test runner (round 35)

- **Demo guide:** `src/js/52-demo.js` now has 39 steps. Step 3 now finishes the request through the new steps and the division director; step 7 includes the member vote, quorum, cut impact and drafted minutes; steps 26 to 39 walk the Budget cycle in depth (AI co-work, national-plan links, 3R and zero-based, the waterfall, minister approval and the pack, the briefing pack, four-level balances, transfers by regulation, live monitoring, quarterly reports, budget agents, forecast and what-ifs, KPIs and signals, M10 settings). `Fisko_Demo_Script.html` has the same steps for the presenter, a timing table, extra questions and a 6-minute short version. Step numbers match between the app and the script.
- **Budget design v0.2:** version and date, a "what changed" note, a build tag on every FR-B row (32 built, 4 partly built with a note, 4 not built), a build-status table in chapter 12 (rounds 27 to 35 with their files), outcomes of D-B01 to D-B08 and new decisions D-B09 to D-B13 in chapter 13, and the list of what is still open.
- **Test runner:** `tests/run.html` loads the prototype in an iframe and injects `tests/sweep.js`, which runs inside the app (it needs the app's globals). Buttons: full sweep, quick (sample organisation, five roles), demo walk only; suites can be switched off. Full sweep today: 6,031 checks in about 30 s, all passing. It can also be pasted into the browser console on the prototype and started with `FISKO_TEST.run()`.
  - **How to run:** `bash src/build.sh`, then `python -m http.server 8787 --bind 127.0.0.1` from the repository root, then open `http://127.0.0.1:8787/tests/run.html`. Opening it as a file won't work.
  - **What fails a check:** page text containing undefined, NaN, [object, Infinity or Invalid; code that throws; or a page other than the one asked for.
  - **Found while building it:** browsers ignore `history.replaceState` (and hash changes) after a few hundred calls within 10 seconds. The ad-hoc sweeps in earlier rounds used it, so late in a long run some pages re-rendered the previous view. The router now honours a test hook, `window.FISKO_ROUTE` (`00-core.js` `route()`), which the sweep sets instead of touching history, and every page check confirms `CUR` is the page asked for. The full sweep with this check passes, so the earlier results stand.
  - The sweep reseeds data in memory and clears the saved demo state at the end, so the next load of the prototype starts fresh.

## 36. Fisko Finance design v0.1 (round 36)

- **What:** `Fisko_Finance_Design.html`, the detailed design for Fisko Finance in Thai, in the same layout as the Budget and Procurement designs (15 chapters). Scope agreed with the user: commitments and POs; vouchers, payments and withholding tax; advances (เงินยืม); receipts, remittance, GFMIS reconciliation, month-end and year-end close, and finance agents. Nothing in the prototype changed this round.
- **Grounding:** the Finance Ministry regulation on treasury withdrawals, receipts, payments, keeping and remitting money, B.E. 2562 (Royal Gazette, 13 May 2562), was read in full, so clause numbers are level A. Key facts used: PO in GFMIS from 5,000 baht and request within 5 working days of acceptance (ข้อ 28); payment routes (ข้อ 28–29); approver authority (ข้อ 36); e-Payment first (ข้อ 52); advances: no new loan while one is open (ข้อ 59), clearing in 15 days after return for travel or 30 days after payment otherwise (ข้อ 65), demand within 30 days (ข้อ 68); same-day recording of receipts (ข้อ 81); cash committee and daily cash report (ข้อ 86–95); remit cash revenue at least monthly, within 3 working days when over 10,000 baht in a day (ข้อ 101); carry-over from 100,000 baht (ข้อ 105). The 1% withholding tax from 10,000 baht comes from Revenue Department rulings (level B). Amendments after 2562 and the "as the Ministry sets" circulars are not read yet.
- **Contents:** FR-FN-01 to 41, rules R-FN-01 to 06 (budget check, payment route table, tax and net amount, regulation clocks, advances, remittance and the month-end checklist), duty rules SD-11 to SD-16, a new role `finhead` (proposed, D-FN-02), screens F1 to F9 plus "My advances" in My Workspace, agents AG-18 to AG-22, forecasts F-FN-01 to 04, what-ifs W-FN-01 to 04, KPI-F01 to 10, signals SG-F01 to 07, build rounds FN1 to FN6, decisions D-FN-01 to 09 (all open). Fisko stays a workbench in front of GFMIS and does not keep a general ledger (D-FN-01).
- **Published:** https://claude.ai/artifact/G4Sx84KthvJWcLJMAWPKD1 (version 1, private).
- **Next:** get the user's approval of the design and answers to D-FN-01 to 09, then build round FN1.


## 37. Procurement T1 from the MEA TOR (round 37)

- **Why:** the user asked to add the TOR-driven gaps to the Procurement design and prototype, generic for both government agencies and state enterprises with settable features. Source and findings: `MEA_TOR_P2P_Gap_Analysis.html` (89 requirement groups: 13 covered, 29 partial, 42 gap, 5 platform). Scope agreed: procurement gaps only; payment/AP, ECM, workflow designer and the SAP integration need their own designs (D-P16). Design first (`Fisko_Procurement_Design.html` v0.3, chapter 18, FR-PR-63 to 86, R-20 to R-27, SD-17 for vendor bank-account change, rounds T1 to T4, D-P15 to D-P21), approved by the user, then built.
- **Built (T1), all in `src/js/70-profile.js`:**
  - `S.prof` = `{ type: "gov" | "soe", sw: {feature: bool}, p: {hearingMin, hearingDays, rfqMin, rfqDays, vatPct} }`; `feat(k)` reads a switch; `PROF_FEATS` lists the ten switches with defaults per kind and a `built` flag (only hearing, rfq and erpRef do anything yet). M10 tab "Procurement profile" (`procprof`): kind buttons reset the switches to that kind's defaults, switches, numeric settings, document-number formats and the last numbers issued. Switching a feature off notifies audit and the head and is audited.
  - **Document numbers:** `docNo(type, unitId, ref)` runs a counter per type, fiscal year and (optionally) unit; format `prefix-unitcode/NNN/FY`, edited in M10. Types so far: `rfq`, `hear`. `S.docno = {fmt, ctr, log}`.
  - **Hearing (FR-PR-64, R-25):** `c.hearing = {docNo, start, end, comments[], summary, revised, rev:{status}, closedAt, round}`. Required when the `hearing` switch is on, the case is competitive and the value is at least `hearingMin` or the item is flagged. `caseChecks` is wrapped so step 4 needs a concluded hearing. Closing before the end date needs a reason. A revised TOR needs the head to approve (a different person from the proposer); approval bumps the TOR file version; the hearing can then be reopened.
  - **RFQ (FR-PR-65):** `c.rfq[] = {no, sent, due, rows:[{v, reply:{d, price}}]}`. Suppliers come from the register; anyone on the abandoned-work list is disabled. Selective method needs `rfqMin` invitations (check at step 4). A reply with a price on a non-competitive case adds a quotation. Overdue replies create tasks for procurement staff by wrapping `famTasks`. Sending is simulated (no outbox yet; T4).
  - **Item details (FR-PR-67):** `c.extra` (hearing flag, SME and MiT flags, standard, spec no., short list, delivery date and place, VAT mode, WBS, PR, PO). VAT shown in both directions at `vatPct`. ERP codes only when the `erpRef` switch is on; nothing is exchanged.
  - **Price extras (FR-PR-68):** comparison with the last contract in the same category, and `S.priceIdx` imported from pasted text (name, date, value). The "item outside the reference list" alert needs a priced item list and is not built.
- **Deferred:** FR-PR-85 (small-budget method). The string `"specific"` is used as the non-competitive test in about a dozen places (analytics, forecast, red flags, agents), so a new method key needs a decision first.
- **Data version:** `DATA_V` is 29 (shared with Finance FN1 work from another session, see below). `seedProfile(s)` is called at the end of `buildOrg`.
- **Demo guide:** steps 40 to 42 in `52-demo.js` and `Fisko_Demo_Script.html` (profile, case details and RFQ, hearing). Step 42 needs the requisition of PC-2570-004 approved and the method chosen first.
- **Tested:** full sweep 6,490 checks, all passed (33 s). By hand in the app: opened a hearing, commented, blocked an early close, closed early with a reason and a TOR change, head approved, reopened as round 2; sent an RFQ to three suppliers and recorded a reply; saved item details with VAT in; imported price indices; checked that switching `rfq` or `hearing` off hides or releases the check. Not checked: looks at phone width and in dark mode (the browser pane was hidden), and the English text of the new screens beyond the sweep.
- **Not done:** not published to the artifact and not committed. Another session was building Fisko Finance FN1 (`66b-fin-fn1.js`, edits to `60-procurement.js`, `62-finance.js`, `00-core.js`, `06-seedhelp.js`) in the same working tree at the same time, so the built HTML files contain that unfinished work. Commit only after sorting out whose changes go together.
- **Next:** T2 (vendor portal, SME and MiT preference, bid security, samples and type tests, appeal forwarding to the central body), then T3 and T4 as in design chapter 18.

## 37. Fisko Finance FN1: foundations (round 37)

Builds round FN1 of `Fisko_Finance_Design.html`. The proposed answers to the open decisions are used as working defaults: Fisko stays a workbench in front of GFMIS (D-FN-01) and there is a new head of finance role (D-FN-02). New file `src/js/66b-fin-fn1.js` (loads after `66-apps.js`, so it can patch `NAV`, `APPS`, `payGate`, `tabBadge` and `myTasks`).

- **Role `finhead`** (user `u31`, both organisations; it was `u21` until round 41, which clashed with a committee member): added to every `NAV` entry that `fin` has (in a `renderShell` wrapper, like `divhead`); `MATRIX.finhead` copies `fin`. Gets clock follow-ups in My Workspace. Helper `isFinRole()`.
- **M10 → Finance rules** (`ADMIN.fcfg`, `S.fcfg`, defaults in `FCFG_DEFAULT`, read through `fcfg()`): PO threshold 5,000, withholding 10,000 and 1%, carry-over 100,000 and filing date, remittance 10,000, and the clocks (request 5 working days, monthly by day 15, advances 15/30 days, objection 15, demand 30, remit 3 working days, refund 15 working days), plus the clause-36 approval authority table. Each row shows its clause and level A/B/C. Admin edits; fin, finhead and audit read. Changes are audited; "Restore defaults" clears `S.fcfg`.
- **F1 Finance overview** (`FIN.home`, now the default tab): regulation clocks (`finClocks()`: request within 5 working days of the last acceptance signature, missing POs, carry-over filing), waiting approvals and differences, commitments by kind.
- **F2 Commitments and POs** (tab id stays `chain`, so old `fnc-chain` links work): PO list with "prepare PO data" and a 10-digit PO number (unique), the round-11 chain table, non-procurement commitments (`S.fcommit`, `CM-2570-nnn`: add, release with a reason) and carry-over candidates (signed by `FY_END`, at least 100,000 left, last payment after the year end) sent to `S.carry.reqs` with `src`, using the M06 `cfChecks`.
- **Money logic:** `famHeadroom` (60) now also subtracts `famOther` (non-procurement commitments less releases). `payGate` gains a PO check for contracts from the PO threshold; a missing PO sets `g.noPo`, which can't be released as an exception (`62-finance.js` stops the request with a message; `63-contracts.js` `gateBox` explains it). PO rules apply to contracts, rent and service agreements only (clause 28), not utilities or travel orders.
- **Menu:** Finance tabs are F1 overview, F2 commitments, F3 payment requests (round-11 page), F7 GFMIS and reconciliation (round-11 page). Codes follow the design; F4 to F6 and F8 to F9 come in later rounds.
- **Seed** (`seedFinanceFN1`, called last in `06-seedhelp.js`): the two contracts get PO numbers (so demo step 22 still passes the gate), four commitments (electricity 1.8 M, rent 0.96 M without a PO, IT maintenance 1.2 M running past the year end so it is a carry-over candidate, a 4,800-baht travel order). `DATA_V` is 29.
- **Tested:** full sweep 6,490 checks passing (it now covers `finhead`); by hand: PO entry and validation, release, new commitment over the headroom, carry-over to M06, the gate blocking a contract without a PO, M10 edit, reset and read-only views; 375 px width with no overflow; dark mode.
- **Not done:** demo guide steps for Finance (planned for FN6); the Finance design document is not yet tagged with build status.
- **Published:** the old prototype link (K8TJFETX7GMftoZYb9zFZR) belongs to another organisation's account, so this round was published as a new private artifact: https://claude.ai/artifact/5pZpV5JDgdLNBdnwHtYFuy (version 1).

## 38. Procurement T2 from the MEA TOR (round 38)

- **Built, all in `src/js/71-t2.js`** (design chapter 18: FR-PR-66, 69 to 74; R-20, R-21, R-22, R-26). Switches `bidSec`, `sampleTest`, `smeMit`, `vendorPortal` are now marked built, and a new switch `appealFwd` was added. `S.prof.p2` holds the settings (`bidSecReturnDays`, `bidSecWarnDays`, `smePct`, `mitPct`, `appealFwdDays`, `central`) and `S.prof.testCats` the categories that need sample tests; both are edited in a section added under M10 → Procurement profile. A new document type `ap1` numbers form อธ.1.
  - **Bid security:** `c.bsec[] = {who, type, amount, from, to, status: held|returned|forfeited, ext[], ret, forf}`. Needed when the item is flagged (`c.extra.bs`, a checkbox added to Item details). Return only after the award (the winner's only once a contract exists), within `bidSecReturnDays`; overdue returns create tasks; forfeit needs the head and a 10-character reason. Step 6 needs a security from every bidder.
  - **Tests:** `c.tests[] = {vendor, item, recv, sent, start, end, notified, replied, lab, report, result}`. Needed when the category is in `testCats` or the item is flagged (`c.extra.test`). Dates must be in order; a result needs the end date, a report number and the notification date. Step 6 needs every result, and the winner a pass.
  - **Bids panel** (step 6 onward): rank by price after preference, SME and MiT badges with certificate validity, the vendor's contract value this calendar year, history from `vendorHist` plus defects counted from contracts, and a details form (`c.bidDet[name]`) that also edits the vendor's `sme`, `mit`, `smeCert`, `mitCert`. Preference is the higher of SME and MiT, applies only when the item carries the flag and the certificate is valid, and never changes the offered price.
  - **Appeal forwarding:** `c.appeal.fwd = {no, to, sent, due, result, resultDate, ref, notified}`. While it is open the existing dismiss and uphold buttons are disabled in `CASE_BINDS`. Recording the result has the same effects as those buttons. A task appears when the result is within 7 days of `due`.
  - **Supplier role** `vendor` (`ROLES`, `MATRIX.vendor`, the home NAV item allows it, `JUMP_TABS.vp`, `appOfLink` wrapper). User `u90` is seeded and linked to the vendor of the first contract. `VIEWS.vportal` has three tabs; `VIEWS.home` and `BIND.home` are wrapped for this role. Replies go onto `c.rfq` rows (`via: "portal"`) and add a quotation on non-competitive cases. Invoices go to `S.vinv`; an officer confirms them on the Contracts page (`PROC.contracts` is wrapped), which sets `ph.invoice` for the three-way gate.
- **Data version** `DATA_V` is 30. **Demo guide** steps 43 to 45 (`52-demo.js`, `Fisko_Demo_Script.html`).
- **Tested:** full sweep 6,501 checks passed. By hand: three bid securities; a return refused before the award; a loser's return after it; the winner's return refused before a contract; forfeit hidden from the officer and available to the head; three samples; out-of-order dates refused; results saved; a failing winner blocked then a passing one allowed; SME and MiT preference 5, 5, 0; an appeal forwarded, buttons disabled, an upheld result sent the case back to step 6; the supplier signed in, saw only its own RFQ, replied and sent an invoice, and the officer confirmed it into `ph.invoice`. Not checked: phone width, dark mode, and the English wording of the new screens beyond the sweep.
- **Not done:** not committed or published. T3 and T4 and FR-PR-85 remain. Check `git status` for the Finance FN1 session's files before committing, and stage hunk by hunk in shared files (`00-core.js`, `06-seedhelp.js`, `52-demo.js`).

## 38. Fisko Finance FN2: vouchers, tax and payment (round 38)

Builds FR-FN-07 to 17 of the Finance design. New file `src/js/66c-fin-fn2.js`; it replaces `FIN.pay` (F3) and wraps `BIND.finance`, `finClocks`, `tabBadge` and `myTasks`.

- **Vouchers** (`S.vouchers`, `VC-2570-nnn`): types `proc`, `service`, `utility`, `travel`, `comp`, `refund` (`VT`). States `draft`/`returned` (V1), `check` (V2), `approve` (V3), `ready` (V4), `posted` (V5), `paid` (V6), and V7 derived by `vState()` when the linked payment is matched or explained in reconciliation. `cancelled` with a reason.
- **Making one:** procurement vouchers come from accepted phases ("Make voucher"; the R-11 gate must pass, including the PO check from FN1; a failed gate still holds the phase for release, a missing PO doesn't). Others come from the "Other voucher" form, optionally against an `S.fcommit` commitment. `payee.name` is `[th, en]` when it comes from a contract.
- **Money:** `vCalc()`: tax base is the gross ÷ 1.07 when VAT is included; the rate comes from `whtRate()` (government payee 0; `proc` and `service` 1% when the whole order or commitment is at least 10,000; compensation is shown as "per the agency's income table, not set"); net = gross − penalty − tax. `spend` (gross − penalty) is what the payment records against the budget.
- **Route** (`vRoute()`, R-FN-02): orders from 5,000 are paid direct and need a PO; smaller ones go through the agency account; utilities with contributions, and compensation, go through the agency account; travel and refunds are paid direct.
- **Rules** (`vRules()`): R-FN-01 (contract, commitment left, or line headroom; warns when requested more than 10 days early), R-FN-02 (PO, cheque or cash reason), R-FN-03 (tax line), SG-F03 warning for the first payment within 30 days of a bank change.
- **Flow:** the maker (`fin`) sends for checking; a second person (`finhead`, or another finance user; the maker is refused) checks evidence and rules; the approver (`exec` or a `spend` delegate) approves with SD-11 (maker and checker) and, for contracts, SD-04. Approval writes an approved `S.payreqs` entry (`voucher` field), so Procurement steps 10 to 12, M06/M07, analytics and forecasts keep working. `famAcceptedUnpaid` (60) now also skips phases with a live voucher.
- **GFMIS (simulated):** "Create the request file" (`S.gfOut`, CSV shown on the page), "Import posting result" (GFMIS document numbers from `S.gfSeq`, V5), "Import payment result" (direct → V6; agency → money in the agency account, `funded`). Agency e-Payment vouchers are paid by an e-Payment file (`S.epay`); cheque or cash ones get a "Record the payment" button. Money in the agency account has a 15-working-day pay-or-return clock (clause 99).
- **On payment:** `vPaid()` issues a 50 ทวิ number (`S.whtSeq`, `WHT-2570-nnnn`) when tax was withheld, adds the spend to the commitment's `paid`, and logs it. "Send the tax certificate" is a button a person presses.
- **Daily check** (`finhead`): unchecked paid vouchers, signed as one batch (`S.payChecks`).
- **Supplier bank accounts** (`S.vendorChanges`, `VB-2570-nn`): requested by `fin` with a 10-digit account and an attachment tick; confirmed by someone else (SD-14), which sets `vendor.bank` (shown masked).
- **Duty rules:** SD-11 and SD-14 are pushed into `SOD_RULES` and `SOD_STEPS` and seeded on.
- **Seed** (`seedFinanceFN2`): VC-001 (the old PY-2570-001, paid and matched, so V7), VC-002 electricity (paid), VC-003 IT maintenance (paid, tax withheld, certificate not sent), VC-004 speaker fees (waiting for approval, agency route), VC-005 branch rent (in checking, blocked until CM-2570-002 gets its PO), VC-006 water bill (draft). `DATA_V` is 30.
- **Demo:** step 22 (app and `Fisko_Demo_Script.html`) now makes a voucher for CT-2570-002 phase 1.
- **Tested:** full sweep 6,501 checks passing; by hand: the full procurement path (make, check, approve, file, post, pay, certificate), the agency path with the e-Payment batch, the checker blocked by a missing PO, the daily check, a cheque without a reason refused, SD-14 refusing the requester.
- **Not done:** advances (FN3) and receipts (FN4); the GFMIS user register (FR-FN-34) is not yet checked when making files.

## 39. Fisko Finance FN3: advances (round 39)

Builds FR-FN-18 to 24. New file `src/js/66d-fin-fn3.js`.

- **Data** (`S.advances`, `AD-2570-nnn`): borrower and unit, type (`travel`, `station`, `other`), purpose, dates, actual return date, items (`ADV_ITEMS`; equipment is listed only so the clause-63 check can be shown), amount and `approvedAmt`, source (`budget` or `nonbudget`) and line, `temp` and collateral, a loan contract number (`สย.nnn/2570`), payment, clearing, objection, receipt (`RB-2570-nnn`), cash back or a top-up voucher, demand, report and a log.
- **States:** `request` A1, `approved` A2, `paid` A3, `clearing` and `objected` A4, `cleared` A5, plus `rejected` and `cancelled`. Overdue and ageing are worked out each time (`advDue()`, `advOverdue()`, `advAge()`), never stored.
- **Rules** (`advChecks()`): clause 59 (no open advance; the request form is closed with the reason), 63 (items), 64 (travel days ≤ 90), 62 (days into next year ≤ 90 or 30), 60 (non-budget source), 58 (collateral when the borrower has no salary to deduct from), 18 (line headroom). Approval also checks SD-12 (borrower ≠ approver, including delegation) and asks for a reason when less than requested is approved. Checking a clearing checks SD-12 too.
- **Pages:** `#advances` "My advances" (new `NAV` entry in the overview group, app `all`, every role) with the request form, travel calculator (`perDiem`, `hotel`, `kmRate` added to `fcfg()` and M10 → Finance rules) and the clearing form. F4 "Advances" (`FIN.adv`) holds the register with filters, KPIs, ageing bands and the detail with every action.
- **Flow:** the executive (or a `spend` delegate) approves; `fin` pays (simulated e-Payment); the borrower clears (return date, amount spent, receipts tick); `fin` or `finhead` accepts or objects (15-day fix clock); an accepted clearing gets an evidence receipt, records cash back when less was spent, or creates a draft travel voucher for the top-up; `finhead` issues a demand once overdue (due 30 days after the clearing due date) and reports to the executive once the demand date passes.
- **Budget effect:** `famOther` (60) now adds `famAdv` (budget advances: the amount lent until cleared, then the smaller of spent and lent) and `famVc` (approved vouchers with no contract or commitment). `vRules` R-FN-01 allows for a voucher's own spend once approved.
- **Clocks, badges, tasks:** clearing and objection clocks and demand dates in F1; badges on F4 and "My advances"; tasks for borrowers, `fin`, `finhead` and approvers. Duty rule SD-12 is pushed into `SOD_RULES`.
- **`FIN_SUB`** (66b) now holds each Finance page's subtitle, so later rounds add their own.
- **Seed** (`seedFinanceFN3`): AD-001 (division user, travel, paid, due 21 Oct; it blocks their new requests), AD-002 (Planning, workshop, 6 days overdue, for the demand), AD-003 (division director, cleared with 1,250 baht back), AD-004 (procurement officer, waiting for approval), AD-005 (division director, clearing waiting to be checked). `DATA_V` is 31.
- **Tested:** full sweep 6,545 checks passing; by hand: the clause-59 block, approval, payment, objection and fix, a clearing over the amount creating a top-up voucher, the demand, and a request with equipment flagged under clause 63; 375 px width.
- **Not done:** the cash returned is recorded on the advance; it joins the receipts and the daily cash report in FN4. Agent AG-19 comes in FN6.


## 39. Procurement T3 from the MEA TOR (round 39)

- **Built, all in `src/js/72-t3.js`** (design chapter 18: FR-PR-75 to 79; R-23, R-24). Switches `drawing` and `commFee` are now marked built. `S.prof.p3` holds `drawingReplyDays`, `feeMonthCap`, `feeLadder`, `feeCasePct`, `feeMinAttendPct`, `feeHolidayOk` and the rate table `fee[kind] = [chair, member]`; `S.prof.drawCats` the categories that need drawings. Both are edited in a section added under M10 → Procurement profile. New document types `mn` and `fee`. `seedT3(s)` is called from `seedT2`; it also gives the first contract a sample BOQ (item 1 tracks serial numbers).
  - **Contract panel:** `conPanel` is wrapped so each contract gets a "More (round T3)" panel with three `<details>`: drawing approval, BOQ and serials, extra data. Binders sit in a wrapper of `BIND.procurement`.
  - **Drawing approval:** `k.drw = {on, kind, first, rounds[{n, recv, mn, status: submitted|approved|rejected, note, replied}]}`. Required when the switch is on and (`k.drw.on` or the category is in `drawCats`). Reply due is `recv + drawingReplyDays`. While required and not approved, the first phase's acceptance form is replaced by a message after render (R-23). Overdue replies create tasks.
  - **BOQ and serials:** `k.boq[] = {item, unit, qty, price, serial, kind}`, `k.serials[] = {i, no, phase, t, by}`. Saving needs a delivery noted, refuses numbers already used on any contract (case-insensitive) or repeated in the input, and refuses more than the quantity. A BOQ total that differs from the contract amount is flagged, not blocked.
  - **Extra data:** cumulative progress from the latest supervisor report (guarded when a contract has no supervision), accepted share by value, a projected date penalties reach the cap (`capDate`), and `k.xref = {wbs, po, fund, asset}` when the `erpRef` switch is on.
  - **Committee fees:** NAV tab `fees` (P18), only listed while the `commFee` switch is on (the NAV item's `tabs` is a getter). `S.fees[] = {id, docNo, case, kind, dates, rows[{u, pos, n, dates, rate, gross, net, notes}], total, status: pending|approved|rejected, decided}`. `feeCalc` drops days off (weekends and `S.holidays`, unless allowed), dates already claimed by the same person on the same case and committee, and members below the attendance rule; it caps each person per month and each case at a percentage of its value. Amount up to `feeLadder` goes to the head of procurement, above it to the executive; the person who raised a claim can't approve it. The "accept" committee uses the contract's inspectors. Pending claims create tasks for the approver. `VIEWS.procurement` is wrapped to give the tab its own heading.
  - **FR-PR-79:** Fisko Finance round 38 already built supplier bank-account changes (`S.vendorChanges`, SD-14). Here the supplier portal got a fourth tab with a request form (10-digit account, book copy ticked) that pushes into that list with `via: "portal"`; a second person in Finance confirms. The design's SD-17 was not needed.
- **Data version** `DATA_V` is 32. **Demo guide** steps 46 and 47 (`52-demo.js`, `Fisko_Demo_Script.html`).
- **Tested:** full sweep 6,545 checks passed. By hand: serial numbers saved, a repeat refused, more than the quantity refused; a BOQ row added; ERP reference saved; the first phase's acceptance form replaced by the R-23 message, a drawing round recorded with MN/001/2570, a send-back refused without a reason and accepted with one, a second round approved and the form restored; a fee claim for three dates (the Saturday dropped, one attendance unticked) came to 7,800, the officer could not approve it and the head did; a second claim for an already-claimed date paid nothing; the fees tab disappears when the switch is off; the supplier requested a bank change and Finance saw it. Not checked: phone width, dark mode, the English wording, and the overdue tag on a drawing round (text was checked in the wrong language).
- **Not done:** not committed or published. T4 (forms catalogue, e-mail outbox and signature status, conflict-of-interest report, announcement builder, entity check) and FR-PR-85 remain. A Finance FN3 session was working in the same tree; check `git status` before committing.

## 40. Fisko Finance FN4: receipts, cash custody and remittance (round 40)

Builds FR-FN-25 to 32 (FR-FN-33, key handover, is not built). New file `src/js/66e-fin-fn4.js`; two Finance tabs, F5 `recv` and F6 `cash`, and a page `#cashcount` with no menu entry (reached from tasks and notifications; listed in the router's `extra` crumbs).

- **Receipts** (`S.receipts`, `RC-2570-nnnn`): book and number (`S.rbooks`; the officer's current-year book), date, payer, item, amount, method (`cash`, `cheque`, `epay`), kind (`revenue`, `nonbudget`, `refund`, `advback`), `recorded` (GFMIS document number), `remit`, `cancelled` (reason; the receipt stays in the register). `rcIssue()` makes one. `rcClass()` turns the kind into a money type: revenue, non-budget, over-drawn money returned (on or before `FY_END`) or prior-year balance returned (after it), per clause 100.
- **Recording:** "Record in the system" stamps every unrecorded receipt and says how many were late (clause 81).
- **Remittance** (`S.remits`, `RM-2570-nnn`): `rcDue()` gives each receipt its clause-101 date: cheque next working day; refunds 15 working days; cash revenue within 3 working days when that day's cash revenue is over the M10 limit (10,000), otherwise month end; non-budget cash month end; e-Payment revenue month end (level C, the Ministry's rule isn't read). Remitting is per money type, needs the receipts recorded first, and late items are counted and sent to `finhead`.
- **Unspent advance cash** (from FN3 `cashBack`) gets a "receipt" button; the seeded AD-003 refund points at an old-year receipt.
- **Receipt-book register:** current and prior-year books, used ranges, old-year books not returned, and the yearly report (`S.rbookReports`) with a clock to 31 October (clause 74).
- **Tax and penalties:** a table of paid vouchers with withholding tax or penalties and their 50 ทวิ status (FR-FN-30).
- **Cash committee** (`S.cashCmte`: order, members, substitutes): `finhead` re-appoints (at least 2). Rank isn't checked (users have no rank); the page says so.
- **Daily cash report** (`S.dailyCash`): `fin` prepares it when there was cash or cheques that day (`dcNeeded`); the system figures are cash and cheques in the safe at day end by money type (`dcSys`, `inSafe`). Each member enters what they counted; SD-13 refuses anyone who took or paid out money that day. When all have counted, it is `signed` or `diff` (reported to exec, finhead and audit, clause 95). The executive acknowledges (clause 94).
- **Clocks, badges, tasks:** unrecorded receipts, remittance per money type, today's report, the yearly book report; tasks for committee members (link `cashcount`), `fin` and `exec`.
- **Seed** (`seedFinanceFN4`): committee = Planning user and division director (order 15/2569); books 1/2570, 7/2569 (returned), 8/2569 (held by a division, not returned); five October receipts (one remitted, a cheque refund one day overdue, two today not recorded); signed reports for 14 and 15 October. `DATA_V` is 32.
- **Tested:** full sweep 6,547 checks passing; by hand: issue, record, remit (late item flagged), the 3-working-day rule when today's cash passes 10,000, the daily report with one member counting short (diff and report), acknowledgement; 375 px width for F5, F6 and the count page.

## 41. Fisko Finance FN5: GFMIS, reconciliation and closing (round 41)

Builds FR-FN-34 to 41. New file `src/js/66f-fin-fn5.js`; it wraps `FIN.recon` (F7) and adds F8 `close`.

- **GFMIS users** (`S.gfUsers`: user, duties `record`/`approve`/`remit`, order, until): `gfOk(duty)` refuses and audits when the signed-in user has no live assignment. "Create the request file" (66c) checks `record`; remitting (66e) checks `remit`. `finhead` adds or revokes assignments.
- **Bank accounts** (`S.bankAccts`: `budget` and `nonbudget`, opening balance for September): `bookLines()` builds the agency account movements from advances (funded in, paid out), agency-route vouchers (funded, paid) and book adjustments (`S.bookAdj`). Opening balances roll forward (`bkOpen`).
- **Statements** (`S.bankStmts`): the sample import copies the month's book lines except the last one (in transit) and adds a 25-baht bank fee. `bkMatch()` matches on reference and amount and works out the adjusted bank and book balances; bank-only lines get "Record in the books". The reconciliation (`S.bankRecs`) can be signed only with no difference and no bank-only items left, and only by someone who did not record that month's money (`monthRecorders`, SD-15), so in the demo `finhead` signs and `fin` is refused.
- **GFMIS files in:** the revenue report stamps each remittance with a GFMIS document (`r.gf`); the trial balance (`S.tbs`) is built from the Fisko book balances and line spending, so it agrees (`ok`).
- **Daily close** (`S.dayCloses`): four checks (receipts recorded, daily cash report signed, payments checked, nothing due; the last is a warning only); failing checks need a reason.
- **Month close** (`S.periods`): the six R-FN-06 checks (`monthChecks`); check 6 is a "Reviewed" tick by `finhead`. Closing with failures needs a reason of 10+ characters, recorded as exceptions. Reopening needs a reason and is refused for the person who closed it (SD-16); the executive may reopen.
- **Year-end list:** carry-over candidates proposed, advances running into the new year, receipt books, year-end trial balance (status only).
- **Audit queries** (`S.auditQs`, `AQ-2570-nn`, due 15 days after receipt): `finhead` records and answers; daily-cash differences are listed as incidents.
- **Budget feed:** `linePaid` (47d) now also counts paid vouchers outside contracts and budget advances; `bal()` counts `famOther` in "committed". F8 shows spending per line.
- **SD-15 and SD-16** are pushed into `SOD_RULES`.
- **User change kept in this round:** "My advances" is now a Finance menu item for every role (`66d`, `appOfLink` in `66-apps.js`).
- **Bug fixed:** the `finhead` demo user had id `u21`, which the budget committee seed (42d) also uses; it is now `u31`. Saved demo data reseeds (`DATA_V` 34).
- **Seed** (`seedFinanceFN5`): GFMIS assignments for `fin`, `finhead` and `exec` (order 3/2569); September statements and signed reconciliations, no September trial balance yet, both periods open, yesterday's day closed, one State Audit Office query due 23 October, remittances already in a GFMIS report.
- **Tested:** full sweep 6,547 checks passing; by hand: October statement import, recording the fee, SD-15 refusing `fin`, `finhead` signing, the September trial balance, closing September, SD-16 refusing the closer and the executive reopening, the daily close needing a reason, answering the query, `gfOk` refusing an unassigned user; 375 px width for F7 and F8.
- **Not done:** export of registers to Excel or PDF (artifact pages can't download files without the downloads capability).


## 40P. Procurement T4 from the MEA TOR (round 40, Procurement)

- **Built, all in `src/js/73-t4.js`** (design chapter 18: FR-PR-81 to 84 and 86). Three new profile switches, `forms`, `coiRep` and `entity` (all on for both kinds), and `S.prof.p4 = {mailRepeatDays}` (set under M10 → Procurement profile). `seedT4(s)` is called from `seedT3` and adds document types `memo`, `ltr`, `ann`, `S.pdocs`, `S.outbox`, `S.coiRep` and an e-mail address, ERP code and entity-check slot on every vendor.
  - **Forms:** `FORM_T` has 17 starter forms in three groups (memos, letters, announcements); each is a function from a case, contract and supplier to Thai text. New tab `forms` (P19). `S.pdocs[] = {id, tpl, g, case, ven, no, text, sign: {req: {role}, signed: {by, t, cert}}, pub[], mail[]}`. The number comes from `docNo(group, unit)`. The text is editable until signed; the drafter can't sign; letters can be e-mailed and announcements published (channel and time recorded) only once signed. Forms that need an award or a contract refuse to be made without one.
  - **E-mail:** `S.outbox[]` entries are simulated. "Reminders due" lists unanswered RFQ rows past their date and overdue deliveries; a reminder to the same item isn't repeated within `mailRepeatDays`. A signature request notifies the signer's role and creates a task.
  - **Conflict-of-interest report:** tab `coi` (P20). `coiRows()` walks every case at step 4 or later with a TOR, evaluation or selective committee and counts declarations, missing declarations and declared conflicts per person. A report is a snapshot: draft, sent to the head, approved by someone other than the preparer, then exported as CSV (a data link; status "exported"). The real channel to the agency's system is still D-P18.
  - **Entity check and ERP code:** a panel added under the supplier register. The lookup is simulated from the tax ID (invalid number: not found; last digit 7: dissolved; 3: suspended; otherwise active). ERP vendor code is editable when the `erpRef` switch is on.
  - The tabs are listed only while their switch is on (the NAV item's `tabs` getter from `72-t3.js` is wrapped), and `VIEWS.procurement` is wrapped again to give them their own headings.
- **Data version** `DATA_V` is 33. **Demo guide** steps 48 and 49.
- **Tested:** full sweep 6,547 checks passed. By hand: a memo got `บก-05/001/2570`; a winner letter refused with no winner; the invitation letter couldn't be e-mailed before it was signed, the head signed it, then it went to the supplier's address; an announcement was signed by the executive and recorded as published on e-GP; an overdue RFQ produced a reminder and a second one was blocked; the COI page listed three members, a report was prepared, sent, approved by the head (the officer had no approve button) and could then be exported; the entity check set a status. Not checked: phone width, dark mode, the CSV file opening in Excel, English wording beyond the sweep, and the wording of each template against MEA's real forms.
- **Not done:** not committed or published. FR-PR-85 remains deferred. Procurement chapter 18 is otherwise built. Next in the larger TOR picture are the designs that don't exist yet: AP and payment on the MEA side, ECM, the workflow and form designer, and the SAP integration.

## 42. Fisko Finance FN6: AI and analytics (round 42)

Builds chapters 10 and 11 of the Finance design. New file `src/js/66g-fin-fn6.js`; F9 tab `ai` with four sub-pages (`FAI_TAB`: agents, fc, wi, kpi).

- **Agents** (`F_AG`, `F_TOOL`, `F_EXEC`, runs in `S.fRuns`, `FRUN-nnn`): the same pattern as the Budget agents in `69-budget-ai.js`. Steps run read or draft work on real data; a `write` step waits (`await`) for a person in the agent's `who` roles, and `fApply()` makes the change only when approved. AG-18 checks unapproved vouchers (evidence, rules, duplicates) and flags makers. AG-19 ranks open advances (F-FN-02), reminds borrowers and drafts demands (draft only). AG-20 needs this month's statement (it stops otherwise), proposes notes with a confidence and records them (`S.recNotes`). AG-21 runs the daily and last month's close checks, says who must act and drafts the memo. AG-22 forecasts and creates tasks for lines short of target (`S.agentTasks`). The agents are registered in `S.agents`, so the M09 switches apply; each step is logged in `S.aiLog`.
- **Forecasts:** `fcMonths(o)` (F-FN-01: paid by month from `paidByMonth()`, plus unpaid contract phases at due + lag, commitments spread to their end, and free allocation times the M10 probabilities, weighted toward year end; the range widens with the horizon), `fcAdvRisk()` (F-FN-02: days left, late history, open objection), `fcCarry()` (F-FN-03), `fcLoad()` (F-FN-04, six weeks).
- **What-if** (`WI_DEF`, `wiCalc`, saved in `S.fWhatifs`): W-FN-01 days from acceptance to payment, W-FN-02 delivery slip, W-FN-03 year-end target, W-FN-04 on-time clearing share. Nothing in the data changes.
- **KPIs** (`kpiF()`, KPI-F01 to 10 with target and pass flag) show on F9; those off target also show on F1. **Signals** (`fSignals()`, SG-F01 to 07) with triage in `S.fSig`: audit or finhead ask, fin explains, audit or finhead decide (issue or false positive); false positives are counted.
- **Seed** (`seedFinanceFN6`): agents in `S.agents`; VC-2570-008 (a water bill keyed twice, for SG-F01); AD-2569-041 (a Planning advance cleared late last year, so SG-F04 fires with AD-2570-002). `nextAdv()` (66d) now numbers within the current year only. `DATA_V` is 35.
- **Demo guide:** six Finance steps (52:00 to 57:00) are appended to `DEMO` from 66g, so this round leaves `52-demo.js` to the Procurement session. `Fisko_Demo_Script.html` is not updated for them (the other session has uncommitted changes there).
- **Tests:** `tests/sweep.js` now opens every menu tab of the Procurement and Finance apps for each role and language (before, only the current tab was rendered), starts every finance agent and renders the F9 sub-pages. Full sweep: 7,487 checks passing in about 46 s.
- **Design document:** `Fisko_Finance_Design.html` is v0.2 with a "what changed" note and a build-status table (12.1). Not built: FR-FN-33 (key handover) and the Excel or PDF export in FR-FN-41.
- **With this round, rounds FN1 to FN6 of the Finance design are all in the prototype.**


## 43. Fisko Finance information architecture (round 43)

The Finance menu was ordered by build round (FN1 to FN6), and each round had added its panels to the nearest page, so one page often did several unrelated jobs. This round reorganises the pages around the work and moves the composition into one place. No feature, rule or data changed; `DATA_V` stays 35.

- **One table decides the layout:** new file `src/js/66h-fin-pages.js`. `FIN_PAGES` lists every page (id, code, menu group, label, subtitle, roles) and its tabs; each tab lists the sections it shows. `[a, b]` puts two sections side by side, `top` shows sections above the tabs, `drawer` names the section that opens as a side panel. `VIEWS.finance` and `BIND.finance` are defined only here.
- **Sections, not pages:** rounds 11 and FN1 to FN6 (`62-finance.js`, `66b` to `66g`) no longer define `FIN.<page>` or wrap `VIEWS.finance` and `BIND.finance`. Each registers sections in `FS` (for example `FS.po`, `FS.vouchers`, `FS.bank`, `FS.monthClose`) and pushes its event wiring to `FIN_BINDS`. The bindings look elements up by selector and run on every Finance render, so the old `FIN_TAB` guards are gone. `FIN` and `FIN_SUB` no longer exist.
- **Pages and groups:** Finance (F1 Today) · Spending (F2 Commitments, F3 Vouchers and payment, F4 Advances) · Receiving (F5 Receipts and remittance, F6 Daily cash) · Books and close (F7 Reconciliation, F8 Close) · Insight and setup (F9 AI and analytics, F10 Registers and setup). The sidebar shows these group headings (`renderNav` in `66-apps.js` reads a group from the 4th element of a menu tab and roles from the 5th).
- **What moved:** GFMIS user rights (was F7), supplier bank-account changes (was F3), the cash committee (was F6) and receipt books (was F5) are now tabs of F10. Withholding tax and penalties moved from F5 to F3 → Tax and penalties. Audit queries and the figures sent to Budget are tabs of F8. The round-11 payment-file matching is F7 → Payment files. The daily payment check is F3 → Daily payment check (head of finance and auditor only).
- **F1 Today:** the "waiting for approval" panel (often all zeros) is replaced by **My work**, the role's Finance tasks from `myTasks()`; the head of finance sees what is waiting for a check or approval. Follow-ups that repeat a clock carry `clk: true` and are left out. The clocks list shows what is due within a week (at least five) with "Show all".
- **Deep links:** `fnc-<page>` or `fnc-<page>:<tab>` (for example `fnc-reg:vendors`, `fnc-close:audit`, `fnc-recv:remit`). `finSet()` handles both; a link without a tab opens the first tab, the menu keeps the last tab. Notifications, tasks and clocks that pointed at moved content were updated. F9's tabs still use `FAI_TAB`.
- **One look:** filters and month or account pickers use the `.seg` control (`segBar()`), tabs inside a page use `.tabs` with `role="tab"` and badges for work waiting (`finTabBadge()`). Opening a voucher or an advance shows it in a side panel (`.fn-drawer`; scrim click and Escape close it through its own close button). Row actions that need input (release a commitment, cancel a receipt) open one form row under the row (`FIN_ROW`, `rowBtn()`, `rowForm()`) instead of an input in every row. The repeated "GFMIS stays the official books" note now shows on F1 only.
- **My advances** moves to My Workspace (overview group, app `all`, no code). My Workspace items show in every app's sidebar, so it is still in the Finance menu for every role (the round-41 user change) and is now also reachable from Budget and Procurement. Its old code F5 clashed with Receipts.
- **Tests:** the menu-tab pass in `tests/sweep.js` now also clicks every tab inside each page and skips menu tabs a role can't see. Full sweep: 8,035 checks passing in about 75 s.
- **Design document:** `Fisko_Finance_Design.html` is v0.3; chapter 9.1 has the new menu map and layout rules.

## 44. Fisko Procurement information architecture (round 44)

The Procurement menu had 20 pages (P1 to P20) in build order and every role saw all of them; several pages stacked unrelated panels (P5 contracts showed every contract in full, about 3,300 px for two). This round reorganises the app around the work, following round 43 for Finance. No feature, rule or data change; `DATA_V` stays 35.

- **One table decides the layout:** new file `src/js/74-proc-pages.js`. `PROC_PAGES` lists every page (id, code, group, label, subtitle, `feat` switch, roles, `top` sections) and its tabs; each tab has `secs` (PROC entries, or a function returning them) and a `key`, the page id the earlier rounds used. `PROC_GROUPS` names the five menu groups.
- **Old keys keep working:** opening a tab sets `PROC_TAB` to its key, so every `BIND.procurement` binder (guards such as `PROC_TAB === "gantt"`), `CASE_OPEN`, `jump("case:...")` and old links keep working. `prCur()` follows `PROC_TAB` when older code sets it (for example "contracts" from a case). `procSet(v, keep)` takes a page (`contracts`), a page and tab (`insight:flags`) or an old key (`gantt`; deep links prefer keys, so `prc-docs` opens the OCR tab); `JUMP_TABS.prc` uses it. `PROC_PAGE` and `PROC_ST` hold the page and tab.
- **Menu:** the NAV `procurement` tabs are a getter over `PROC_PAGES` (filtered by `feat()`), as `[id, label, code, group, roles]`, so `renderNav` shows group headings and hides pages a role can't use. `tabBadge` for a page sums the old badges of its keys (`PROC_KEY_BADGE`); P1's badge counts my items due today or earlier. Tabs inside a page show their key's badge once.
- **Sections split instead of wrapped:** `PROC.conCreate`, `PROC.conAll` (60), `PROC.conList` and `PROC.conDetail` (74, `CON_OPEN` with a back button), `PROC.conInvoices` (71-t2, no longer wraps `PROC.contracts`), `PROC.planMain` and `PROC.demand` (61c), `PROC.supKpis`, `PROC.supRegister`, `PROC.supBlacklist` (63b), `PROC.supEntity` (73-t4). The old composite names (`PROC.contracts`, `PROC.plan`, `PROC.suppliers`) still exist for anything that calls them.
- **Removed:** the old `VIEWS.procurement` (60), the `nav.tabs` getters and `<h1>` rewrites in 72-t3 and 73-t4.
- **P1 Today** (`PROC.todayKpis`, `PROC.today`, `PROC.todayDue`): the role's tasks with `prc-` or `case:` links; for `proc`, case files at a proc step, in contract management (step 9) or waiting on a date; for `prochead`, cases waiting for the head; phases and guarantees due within 60 days.
- **AI assistant:** `AI_TOOL` (67) picks one tool; the section helper renders only the section whose title starts with it. "Draft reminder" from AI-07 switches to the drafts tool.
- **Labels:** "แบบ BOQ และข้อมูลเพิ่มเติม" (contract panel, was "เพิ่มเติม (รอบ T3)"), M10 panels "หลักประกัน แต้มต่อ และอุทธรณ์", "ค่าตอบแทนกรรมการและการอนุมัติแบบ", "อีเมลเตือน"; demo step 48 text updated.
- **Roles:** requesting units (`div`, `divhead`) see P1 to P4 and P7; `plan` P1 to P4, P7, P10; `exec` P1 to P4, P7, P8, P10, P11, P13; `fin`/`finhead` P1, P7 to P10; `audit`, `proc`, `prochead` all. The vendor portal is unchanged.
- **Tests:** `tests/sweep.js` also opens every contract and every AI tool for proc, prochead, div, fin and audit (they used to render on one page). Full sweep: 8,143 checks passing. Old links checked: prc-docs, prc-gantt, prc-flags, prc-agents, prc-reports, prc-ocds, prc-whatif, prc-coi, prc-forms, prc-fees, prc-contracts, prc-plan, prc-cases, prc-suppliers, case:<id>. No page overflows at 375 px (the case board scrolls inside its own container, as before).
- **Design:** `Fisko_Procurement_Design.html` v0.4 adds chapter 19 (menu map with old and new codes, layout rules).
- **Built in a separate worktree** (`..\Fisko-proc`, branch `proc-ia-r44` from `origin/procurement-ia`) because other sessions share `D:\Claude\Fisko`.
- **Follow-ups not done yet:** wide tables at about 1080 px (plan item column), tabs inside the opened contract (phases, changes, supervision, guarantee and warranty, letters, drawings and BOQ), one-row forms instead of inputs on every row, demo-script steps 50 to 57 in `Fisko_Demo_Script.html`, PO number and voucher status on contract phases.

## 45. Procurement polish and the Finance demo steps (round 45)

The round-44 follow-ups. No rule or data change; `DATA_V` stays 35. `main` was fast-forwarded to round 44 (`c8acec3`) before this round.

- **Contract tabs:** `conPanel(c, part)` (63) returns named parts `head`, `guar`, `phases`, `vars`; with no part it is the full panel as before (`PROC.conAll` and anything else still get the whole thing). 72-t3's wrapper passes the part through. `PROC.conDetail` (74) shows the head, a tab bar (`CON_TAB`, `CON_TABS`) and one body: phases and acceptance, changes (badge for pending changes), supervision (the first two `CON_PANELS` of 63b: supervision and termination), guarantee and warranty (`guar` + the warranty panel), letters, drawings and BOQ (`t3Panel`, its own section). Tabs with nothing in them are hidden. `conLate(c, tab)` maps `CON_PANELS` by order (supervision, termination, warranty, letters) unless a panel sets `f.tab`.
- **Finance on the contract:** `conPoTag(c)` shows the GFMIS PO number next to the supplier, or "No GFMIS PO yet" with a link to Finance commitments; `phVoucher(c, ph)` shows the voucher state on the phase, with a button that opens the voucher in Finance (`VC_OPEN`, `fnc-pay`) for roles that can use Finance.
- **Wide tables:** minimum widths on the plan item (240 px), method and e-GP columns, the requisition item and requester, and the supplier name. At 1080 px plan rows went from about 300 px to about 100 px tall; the tables scroll sideways inside their wrappers.
- **One form row at a time:** `PR_ROW`, `prRowBtn`, `prRowForm` (74, bound through `data-prow`) for portal invoice returns (71-t2) and bid security extend/return/forfeit (71-t2, case file). Finance uses its existing `rowBtn`/`rowForm` for audit answers (66f) and reconciliation explanations (62).
- **Demo script:** `Fisko_Demo_Script.html` gains "ส่วนเสริม 3: Fisko Finance เชิงลึก" with steps 50 to 55 (52:00 to 57:00), generated from the in-app steps in 66g; step 46 and the in-app step 48 follow the new contract tabs.
- **Tests:** the sweep opens every contract on every contract tab. Full sweep 8,343 checks passing.

## 46. Finance decisions and non-budget money (round 46)

- **Decisions recorded** (Finance design 13.2): D-FN-01 workbench in front of GFMIS; D-FN-02 keep `finhead` and self-service advances; D-FN-03 salaries as a file only; **D-FN-04 non-budget money as a full cycle with a spending plan**; D-FN-05 travel calculator from M10 rates; D-FN-06 tax and 50 ทวิ computed in Fisko; D-FN-07 settable file formats; D-FN-08 committee confirms counts in the system; D-FN-09 legal and finance review the rules before real use.
- **New file** `src/js/66i-fin-nb.js` (loads after 66h, so it adds a page to `FIN_PAGES` and rebuilds the menu tabs). Page F11 `nb` in the Receiving group with tabs funds, plans, withdrawals; deep links `fnc-nb:plans`, `fnc-nb:wd`.
- **Data:** `S.nbFunds` (id, name, basis, `openA` agency account and `openT` treasury deposit at 1 October), `S.nbPlans` (one per fund and year: lines with id, name, category, amount; income expected; status draft, submitted, approved, returned), `S.nbWd` (withdrawals: pending, done with a GFMIS document, rejected, back). Receipts carry `fund`; vouchers and advances carry `fund` and `nbLine`.
- **Balances** (`nbBal`): income from fund receipts; deposited = remitted fund receipts; withdrawn = done withdrawals less amounts deposited back; spent = paid fund vouchers (net + tax) and paid fund advances less cash back. Treasury = `openT` + deposited − withdrawn; account = `openA` + income − deposited + withdrawn − spent.
- **R-FN-07** (`nbRule`, called from `vRules` in 66c; `advChecks` wrapped): approved plan, plan line not exceeded (`nbUsed` counts approved-or-later vouchers and advances), and a warning when the account holds less than the payment (withdraw first).
- **Vouchers:** `vRoute` returns route `nb` for fund vouchers; `vAgency(v)` (66c) treats `agency` and `nb` alike in the agency-payment paths. Approval (`vcAct` wrapped) moves a fund voucher to the new state `nbready` (V4, "ready to pay from the non-budget account") with `funded`, so it never enters a GFMIS file and is paid by the e-Payment batch or a cheque or cash with a reason. Fund vouchers have `line: null`, so they don't touch allocation headroom or M06/M07 spending.
- **Forms:** voucher form "or pay from non-budget money" (approved plan lines), receipt form fund picker (required for non-budget receipts), advance form non-budget plan line (required when the source is non-budget).
- **Reconciliation:** `bookLines` (66f) wrapped so the non-budget account shows withdrawals in and fund vouchers out.
- **Budget:** M06 tab `nb` (read-only) lists each fund's plan status, planned, used, income this year and total held.
- **Seed** (`seedFinanceNB`): NB-01 venue income (approved plan, a 50,000 withdrawal done on 5 Oct, VC-2570-009 paid 32,100, VC-2570-010 electricity in draft, the existing non-budget receipt booked to it); NB-02 donations for staff development (plan waiting for the executive). `DATA_V` is 36.
- **Tested:** full sweep 8,463 checks passing; by hand: plan approval, a fund voucher through check, approval (nbready), withdrawal approval and e-Payment batch, a non-budget receipt and advance against plan lines, the M06 view.

## 47. Fisko Budget information architecture (round 47)

- **Decisions (asked this round):** renumber the Budget pages B1 to B11 and keep the old M-code on the eyebrow; split M09 in two; B8 (M07) opens on the live FY2570 tab; add a Budget today page.
- **New file** `src/js/75-budget-pages.js` declares `BUD_PAGES`: id, code, old module code `m`, menu group, and tabs. A tab is an old key, or `{ id, label, keys, roles }` when several old keys sit behind one tab (a segment bar `data-bseg` picks between them; `BUD_SUB` remembers the last one per tab). `BUD_MOD` maps each module to its tab variable (`STRAT_TAB`, `CONS_TAB`, `REV_TAB`, `SUB_TAB`, `ALLOC_TAB`, `MON_TAB`, `PERF_TAB`, `INTEL_TAB`).
- **How it works:** `VIEWS[page]` is wrapped. `bRender` checks the module key against the page's visible tabs, renders the module's own view, finds its old tab bar (`<div class="tabs" role="tablist">`, the first one), keeps only the keys that bar shows (so each module's own role filter and counts carry over), and swaps it for the new bar (`data-bbar`, buttons `data-btab`). Counts in old labels, such as "Alerts (3)", become badges, summed on merged tabs. `bHead` rewrites the eyebrow to "Fisko Budget · B7 · M06 · group" and, for B10 and B11, the heading.
- **Old keys and links:** a key set on purpose (`BUD_SEEN` tracks the last key rendered, seeded with the defaults at load) that belongs to another page opens that page (`bRedirect` fixes the address with `replaceState`, the crumb and the menu). `jump("intel-…")` goes to the page that owns the key. A menu click keeps the tab you were last on (`BUD_KEY`).
- **Menu:** `GROUPS` gets `bud`, and form, exec and intel are renamed (Formulation FY2571, Execution FY2570, Results and analysis); `APPS.budget.groups` is `bud, form, exec, intel`. Performance moves to the intel group. New NAV entries `btoday` (B1, first in the Budget app, so switching to Budget lands there) and `insight` (B10, before `assistant`). Badges: B1 counts tasks due or overdue; B10 counts new anomalies for plan, exec and audit.
- **Merged tabs:** B2 links + link; B4 ceilings + responses, r3 + zbb; B6 pack + form + export, status + parliament; B7 appropriation + allocate, carry + savings; B9 kpis + scorecard, report + evaluate + stages; B10 bwhatif + whatif, bkpi + anoms + quality. B8 tab `overview` is labelled "FY2569" and comes last. Role filters: the division sees B2 map, KPIs and project bank; B8 without import; B9 KPIs, chain, quarterly and recommendations; B11 ask only. B10 is for plan, exec, fin and audit.
- **Style:** `.seg-scroll` (theme.css) lets a long segment bar scroll sideways on a phone instead of clipping.
- **Docs:** Budget design v0.3 chapter 15 (menu map and page rules); the demo script and the in-app demo guide (`52-demo.js`) use the B-codes and the new tab paths.
- **Tests:** the sweep opens every old key of every Budget page for every role and checks that the right tab is on, and follows seven old deep links. Full sweep 9,451 checks passing. By hand: deep links, segment memory, menu moves between B10 and B11, a fresh load of `#insight`, phone width and dark mode.
- **User change after the round:** "My advances" shows only in the Fisko Finance menu (NAV `app: "finance"` in `66d`, `appOfLink("advances")` is finance in `66-apps.js`), not in the Budget and Procurement menus. Every role can still open it, so every role can switch to Finance; opening it from a task switches the app.

## 48. Budget CRUD round C1: shared list + drawer, B7 allocation (round 48)

- **Design:** `Fisko_Budget_CRUD_Design.html` v0.1 (Thai), approved. Decisions: full CRUD for every record and master data; B8 and B9 move to FY2570 data; one pattern, list + side drawer; steps decided outside (Budget Bureau results, parliament cuts, appeals) get a form plus a Simulate button. Requirements FR-C-01 to 52, rules R-C-01 to 06, flows FL-01 to 11, SIM-01 to 05, demo script E-01 to E-16, build rounds C1 to C6. Published at https://claude.ai/artifact/3NigvMP1qa4DpvQrjN84Zz (private).
- **New file `src/js/76-crud.js`:** `CRUD.def(key, spec)` declares a record type (list, id, title, status pills, filters, columns, form fields, checks, create, edit, actions). `crudList(key, { head, after, empty })` renders the toolbar (search, filters, "show cancelled", + New), the table and, when a record is open, the drawer (`.fn-drawer.cr-drawer`). The drawer has Details, extra tabs and History (from `historyItems`), an action bar driven by the record's state, an edit form built from the field list (money fields in million baht stored as baht, required marks, errors under each field and a summary), a reason step for cancel, withdraw and reject (at least 10 characters), a discard guard for unsaved edits, and a 10-second Undo bar (a JSON snapshot of `S`). All clicks, submits and filter changes are handled once on `document`, so pages only render. State: `CR_OPEN`, `CR_F`, `CR_UNDO`; `crOpen`, `crClose`, `crHere(key)` for a drawer without a list.
- **New file `src/js/77-alloc-crud.js` (B7):**
  - `alLine` allocation lines: new lines are drafts in `A.drafts` (id `AL-<fy>-nnn` from `A.seq`, never reused) with unit, name, budget type, activity (budget code), amount, new-project (T4) and extended (T6) flags; Confirm moves a draft into `A.lines` with its monthly plan; Delete draft. A confirmed line can be edited (name, activity, flags, amount between what is used and the type's unallocated room) with a reason, and cancelled with a reason only when nothing is reserved, committed or pending (R-C-03): it stays in `A.lines` with amount 0 and `cancelled`.
  - `alTr` transfers: create, edit and withdraw while pending; approve or reject by the approver from `TR_TYPE`; record the Budget Bureau's agreement or refusal; mark a T1 reported. A transfer raised from a saving remembers it (`t.saving`).
  - `alRel` releases: create, edit, withdraw; record the Budget Bureau's approval or refusal (SIM-05). The quarterly table stays above the list.
  - `alCf` FY2570 carry-over requests: create with the existing checks, edit, withdraw, executive approve or reject with a reason. The FY2569 carried-over table is unchanged.
  - `alAp` appropriation: edit the act name, date and amounts by budget type (not below what is allocated) with a reason, from a button on the appropriation panel.
  - Savings: a keep or transfer decision can be reversed until a transfer is filed. Spending plan: drop the latest version (with Undo).
- **Styles:** `cr-*` rules at the end of `calm.css` (one column under 560 px).
- **Tests:** the sweep opens every B7 record's drawer, each drawer tab, the edit form and the new form for fin, exec, plan and audit in both years. Full sweep 10,055 checks passing. By hand: draft → confirm → undo, required-field and reason errors, edit with a reason, cancel, transfer create and withdraw, release record, carry-over create, appropriation drawer, savings undo; phone width (no sideways scroll) and dark mode.
- **Next:** round C2 (formulation FY2571: request delete and withdraw, documents, ceilings and issuing them, duplicates, review amounts that flow on, meetings and hearings).

## 49. Budget CRUD round C2: formulation FY2571 (round 49)

- **New file `src/js/78-form-crud.js`** (loads after 75 and 77, so it wraps the B-page views and keeps their tab bars).
- **B3 requests (`rqReq`):** the request list is the shared list + drawer (search, status and unit filters, show cancelled). New request asks for a name, activity and first budget type and numbers it with `nextReqId` (FL-01; the old `length + 30` id is gone). The drawer shows a summary (activity, amount, review rounds, decided amount, checks, documents, open comments) and opens the full 7-step form. Actions for the unit's owner: **delete** an unsent draft (never the demo story request), **withdraw** a sent request back to draft (reason; it leaves review, the reviewer is told), **cancel** a request that was sent before (reason; status `cancelled`, left out of M03 totals by `syncBudget`). `wasSent(r)`: `sentOnce` (set on submit and withdraw), `withdrawn`, or any status but draft (R-C-01). Documents can be removed while editable, in the drawer and in the form's documents step (`data-docdel`, with Undo).
- **FL-03:** when the executive approves on the form (`#rv-pass`) or from the rounds page, `r.decided` is set from round 3 (`S.review` r2), so the submission (`subAmt`) uses the reviewed amount.
- **B4 department ceiling (`csCeil`):** a panel on the ceilings tab opens the drawer: set the department ceiling, reply date and note while not issued; **Issue** (shows whether unit ceilings add up), **Reissue** as version n (reason, clears replies), **Withdraw the ceilings** while no unit has replied. Splitting pro rata no longer tells units the ceilings are out. A unit can take back its acceptance or appeal on B3 while Planning hasn't decided (FR-C-13).
- **B4 duplicates (`csDup`):** the overview's duplicates panel is a list: Planning can mark a duplicate by hand (request kept, request merged in, overlapping amount), edit or remove its own marks, **merge** (cuts the merged request's largest line by the overlap, saves a version and tells the unit, FL-11) or **not a duplicate** with a reason.
- **B5 rounds page:** "Send on" now moves every request at Planning's stage to the committee or the executive, and the executive's button approves the requests waiting for it at the round 3 amount; "Return for revision" names the request (new picker) and needs the reason box, which becomes an open comment. Both offer Undo.
- **Comments:** the author can edit or delete a comment until it is resolved (FR-C-17).
- **Meetings (`rvMeet`):** a list above the agenda: schedule a meeting (number from the fiscal year, date, time, place, note; one scheduled at a time), edit or move it, cancel with a reason; after it is held, edit the draft minutes and **certify** them (then locked). The meeting no longer creates the next one with a fixed "/2570"; a banner says when requests wait for the committee with no meeting set. Legacy code now looks for the `scheduled` meeting (42d) and skips cancelled ones (42b).
- **Hearings (`rvHear`):** a list replaces the old schedule form: schedule, edit or move (the unit locks once questions exist), cancel with a reason; cancelled hearings drop out of the cards, the unit's banner and My Workspace.
- **Tests:** the sweep opens every drawer, tab, edit form and new form of the five new lists for div, divhead, plan, exec and audit. Full sweep 10,223 checks passing; no sideways scroll at phone width. By hand: create and delete a draft, withdraw then cancel then Undo, reissue and withdraw ceilings, set and issue a new ceiling, mark and merge a duplicate, send on and return from the rounds page, executive approval sets the decided amount, comment edit and delete, cancel and schedule a meeting, schedule, move and cancel a hearing.
- **Next:** round C3 (submission batches, Budget Bureau results, parliament cuts and appeals with Simulate, the act into allocation lines).

## 50. Budget CRUD round C3: submission and parliament (round 50)

- **New file `src/js/79-sub-crud.js`.** `76-crud.js` gained `whyLabel` and `whyMin` on actions (the reason box can be a reply box).
- **Batches (`sbBatch`, FR-C-21):** the status tab shows the minister's approval box (46c), the stepper, the approved requests not yet in a batch, and the batch list. A batch is prepared by ticking approved requests (those failing the pre-submission checks are refused), edited or cancelled while preparing (its requests go back to waiting), **sent** (needs the minister's approval), marked **received**, given **results** per request (money fields capped at the amount sent), and **closed** once its revision requests are answered. Only one batch can be in preparation; a later batch takes requests approved after the first went. Each batch has its own `status`, `reqs`, times and note; `sbSync()` keeps `S.submission.status` as the summary older code reads (any batch in progress, otherwise closed if one is closed, otherwise preparing) and upgrades older saved data.
- **Simulate (SIM-01):** "Simulate the result" fills the result form with 92% of each amount, rounded to a thousand baht (personnel in full), without saving; the batch is marked simulated when that form is saved.
- **Revision requests (`sbRev`, FR-C-23):** record (request, reply date, issue), edit while open, reply (the reply text), delete if recorded by mistake. Ids `RV-nn`.
- **Parliament (FR-C-24 to 26):** "Record this stage as done" stores the real date per stage (`S.parl.dates`) and can't start until a batch is closed (FL-04); "Step back one stage" needs a reason. The bill is fixed (`S.parl.items`) when the committee stage starts and now comes from the closed batches' Budget Bureau results (`parlItems` wrapper), falling back to the old source before any batch is closed. **Cuts (`plCut`)** are recorded, edited or deleted at the committee stage (and the appeals stage until an appeal is filed); **appeals (`plApp`)** are filed at the appeals stage, edited or withdrawn while pending, and their result (amount restored) is recorded after that stage. Simulate buttons: cuts on the two largest projects (8% and 5%, SIM-02) and 50% back on pending appeals (SIM-03), both with Undo and editable afterwards. The old automatic cuts and grants are gone.
- **Into allocation (FL-05, FL-06):** unchanged path: once the act is in force, `actAmount` reads `parlFinal` and B7's "Create FY2571 lines from the act" builds the lines with each request's quarterly plan.
- **Tests:** the sweep opens every new drawer and form, and walks a batch through send, receive, results, a revision, close, the bill through a cut and an appeal with a result, and the act into FY2571 lines, checking each screen. Full sweep 10,237 checks passing; no sideways scroll at phone width. By hand: the same walk through the screens, including the close being refused while a revision is open and stepping a stage back.
- **Next:** round C4 (B8 and B9 on FY2570 data, the "as of month" demo control, no hard-coded years).

## 51. Budget CRUD round C4: B8 and B9 on FY2570, the demo date (round 51)

- **Dates and years (`00-core.js`):** `TODAY` is now `let` (the demo date), `REAL_TODAY` keeps 16 Oct 2026, `fyOf(iso)` gives the Thai fiscal year and `CUR_FY` the year being spent (2570). These replace fixed values: `ALLOC_FY` default (47), `CUR_Q` (47b, now `let`), `FY_END` and the carry-over texts and ids (47b), `B4_FY` (47d), `CAB` and `SNAP_M` (40c, now `let`), the transfers in the alerts (40b), quarterly report rounds (`QR_ROUNDS`, 48c), evaluation and recommendation ids (`EV-<fy>-nn`, `RC-<fy>-nn`, counted per year), the Budget menu group names and B1 texts (75), the B8 "FY2569" tab label. The FY2571 formulation-year keys (`S.allocs[2571]`, "2571" texts on requests) and the sample parliament timetable are unchanged.
- **New file `src/js/80-live-year.js`:**
  - `liveDash()` builds `S.dash` from the FY2570 allocation lines (one project per line, id = line id): alloc, plan to date (the line's monthly plan to the demo month), actual (imported GFMIS disbursement `S.disb[line][month]` or Finance's `linePaid`, whichever is higher); units are sums, and a unit's reason comes from a progress report at risk. `syncDash()` runs before every route (a `route` wrapper that first sets `TODAY = S.asOf || REAL_TODAY`), sets `CUR_Q`, `SNAP_M` and `CAB` from the date and the M10 targets, and gives every KPI a result row for the year (FR-C-37).
  - **History:** `seedLiveYear(s)` (called last in the seed builder) moves FY2569 into `S.y2569` (dashboard, progress, procurement milestones, outputs, quarterly reports, unit costs, GFMIS rows) and seeds FY2570 per line: outputs (progress % for investment, people served otherwise), e-GP milestones for investment lines (two started), half of October imported from GFMIS with one unit off by a posting difference, and one investment line reported at risk. The B8 "FY2569" tab renders with `S.dash` swapped to the history and a read-only note; `evProj` (48b) falls back to the history so FY2569 evaluations still open. `DATA_V` is 37.
  - **As of month:** a picker on B8 (`#asof-sel`, months of the fiscal year, each a month end; October is the real date) calls `setAsOf`: it sets `S.asOf` and `TODAY`, imports simulated disbursement for months that have none when moving forward (`simDisb`, SIM-04: monthly plan × a fixed 70–105% factor per line and month, plus fresh reconciliation rows), moves the quarterly report to the current quarter, and offers Undo. While the date is moved, every page shows a banner with "Back to today" (`.asof-bar`). Seeding always resets `TODAY` to the real date first. The import tab has a "simulated GFMIS file" button (fin, plan).
- **Tests:** the sweep moves the date to March and to September, imports, and opens every B8 tab, every B9 tab and B1 for plan, exec, div, fin and audit, checking the banner and that the dashboard is the live year (this caught a forecast NaN at month 12: the cumulative actual shape `ACT_F` is now rebuilt from the real monthly actuals, and the FY2569 tab restores the sample shape). Full sweep 10,677 checks passing; no sideways scroll at phone width. By hand: all B8 and B9 tabs at the real date and in March, the banner on other pages, Back to today.
- **Next:** round C5 (strategy tree and master data in M10).

## 52. Budget CRUD round C5: strategy and master data (round 52)

- **New file `src/js/81-master-crud.js`.** `crRun` in 76 is now safe when an action closes the drawer. `DATA_V` is 38.
- **Retire instead of delete (R-C-06):** `retireAct(what, used, onDelete)` gives master data a Delete action while nothing uses it and a Retire action (reason, `retired: { t, why }`) once something does; a retired record can be brought back. Retired records keep showing under their name where they are already used and are left out of pickers.
- **B2 strategies and goals (`stNode`, FR-C-01):** a list under the strategy map: add a strategy (national strategy, master plan, Thai and English names) or a goal under a strategy, edit names and links, delete when empty, retire otherwise. Ids `S<n>`, `G<n>`.
- **B2 KPIs (`stKpi`, FR-C-02):** the KPI tab is the list: goal, names, unit, owner, baseline, five yearly targets, formula; deleted only if it has no activity links, results, ideas or revisions, otherwise retired. Ids `K<n>`.
- **B2 project ideas (`stIdea`, FR-C-04):** the bank list keeps the KPI cards above it. The owning unit edits a proposed idea or withdraws it (reason); Planning's edit form is the scoring form (five criteria and a note), then accept or decline (reason). "Create a B3 draft" reuses the existing conversion (a hidden `data-iconv` button). New status `withdrawn`.
- **B2 plan revisions (`stRev`, FR-C-05):** propose, edit or withdraw while pending (Planning); the executive approves (the target changes) or rejects with a reason. New status `withdrawn`.
- **B9 outputs (`pfOut`, FR-C-38):** a list under the KPI results: add an output to a line without one, edit name, unit, target and KPI; delete if no result and not in a quarterly report, otherwise retire.
- **FL-10:** B9 recommendations that are in progress or done get "Create an idea in the project bank" (Planning): a proposed idea with the recommendation's text and unit, linked both ways (`rec.idea`, `idea.rec`).
- **M10:** master data tab lists units (`adUnit`; deleted only if unused) and standard prices (`adPrice`; admin or fin, retire only); fiscal years and calendar tab lists fiscal years (`adFy`: open the next year, which copies the latest budget structure with new ids; change status with a reason) and the calendar (`adCal`: add, edit; only added milestones can be deleted because `c1` to `c6` drive deadlines); the structure tab lists the chosen year's nodes (`adNode`: programme, output, activity; read-only in a closed year). New tab **Budget master data** (`bmaster`, admin and Planning edit, audit reads; Planning now sees M10 with only this tab): committee members (`adCm`: appoint, make chair, leaves with a reason, also removed from a scheduled meeting's attendance), settings (`adCs`: quorum %, secretary) and master plans (`adMp`; `S.masterPlans`, mirrored into `MASTER` on every route so B2 keeps reading `MASTER`).
- **R-C-04:** allocation lines can't be added or changed in a closed fiscal year (`fyOpen`).
- **Tests:** the sweep opens every drawer, tab, edit form and new form of the new lists for div, divhead, plan, exec, audit, admin and fin, skipping B2 tabs a role can't see. It found that the division director (`divhead`) was missing from the B2 tab role lists; B-page tabs now treat `divhead` like `div` (`bTabs`, 75). The sweep's `tick` now uses a MessageChannel instead of `setTimeout(0)`, which background tabs throttle to a second or more. Full sweep 11,377 checks passing; no sideways scroll at phone width. By hand: add a goal, add and delete a KPI, KPI K1 offers retire, accept and convert an idea, revision actions, all M10 tabs, open FY2573 (structure copied), Planning's master-data tab, outputs, recommendation to idea.
- **Next:** round C6 (B10/B11: saved scenarios, reopening anomalies, cancelling agent runs; the end-to-end demo script E-01 to E-16 in the in-app guide; a sweep that walks the whole cycle).

## 53. Budget CRUD round C6: B10/B11 records and the end-to-end demo (round 53)

- **New file `src/js/82-intel-crud.js`.** This closes the Budget CRUD design (rounds C1 to C6).
- **Saved scenarios (`wiSc`, FR-C-42):** under both what-if screens on B10 (the ceiling cut and the four in-year what-ifs) a list saves the current settings with a name and note (`S.scenarios`, `SC-nnn`, kind `cut` or `inyear`); "Open this scenario" puts its settings back on the screen (real data never changes); rename, delete (owner or Planning).
- **Reopening anomalies (`anDone`, FR-C-43):** closed anomalies (explained or escalated) are listed under the open ones; the auditor reopens one with a reason (back to "to review"; the earlier review is kept in `reopened`).
- **Cancelling agent runs (`agRun`, FR-C-44):** every budget agent run is listed on B11; a running or waiting run can be cancelled with a reason by whoever started it, Planning, Finance or the executive (the waiting step becomes `skipped`, the run `cancelled`; approved steps stay in effect); "Show it on the page" opens the run above.
- **End-to-end demo (design chapter 11):** sixteen steps E-01 to E-16 are added to the in-app demo guide (`DEMO`, `part: "e2e"`), each with the role, the page, what to say and what to click, from opening the fiscal year to carrying a recommendation into next year's project bank. The guide has a filter (every step, end to end only, the original storyline); it starts on every step.
- **Sweep walk:** a new pass drives the whole cycle through the same actions the screens use and checks each screen: open the next fiscal year, add a goal and KPI, propose, score and accept an idea, reissue the ceilings, withdraw a sent request, send requests on from the rounds page as Planning and the executive, hold a committee meeting (and check an approved request has a decided amount), confirm an allocation line and a release, request, withdraw, re-request and approve a transfer, move the date to March and September, file and approve a carry-over, and turn a recommendation into an idea. The C3 walk (batch, parliament, act into FY2571 lines) runs after it. The three new lists are in the drawer pass. Full sweep 11,439 checks passing (render, chat, agents and the demo walk, which now visits E-01 to E-16); no sideways scroll at phone width.
- **Fix:** a `//` comment put inside a one-line function in this round broke the whole script; the build was checked by parsing every `<script>` with `new Function` after rebuilding. Worth doing after any scripted edit.

## 54. Budget CRUD follow-ups: years from the calendar, request basics, M10 users, route and rules (round 54)

- **Years:** `FORM_FY = CUR_FY + 1` (`00-core.js`) is the year being formulated. Every use of 2571 in code (not the sample data files) now reads `FORM_FY`: numbers (`S.structure[FORM_FY]`, `S.allocs[FORM_FY]`), ids (`REQ-${FORM_FY}-nnn`, `PB-`, `PR-`, `SUB-`) and texts; numeric uses of 2570 read `CUR_FY`. `PLAN_YEARS` and the forward-estimate years (`FWD_Y`) count from `FORM_FY`; the "prepare next year's structure" task and the parliament timetable (`PARL_STEPS`, sample month and day, year from `FORM_FY`) follow it too. The change was made with a small lexical rewriter (numbers → the constant, template text → `${…}`, quoted strings → template literals, comments and regexes left alone); two object keys needed computed keys by hand (`r.years`, `s.allocs`, and the B1 seed maps in 41d). Sample-data files (`10-data-sample.js`, `11-data-dpt.js`) and seed record ids such as `TR-2570-001` keep their literal years. Today nothing changes on screen because the demo date is in FY2570.
- **New file `src/js/83-admin-crud.js`:**
  - **B3 request basics:** the request drawer's Edit (for the owner while the request is a draft or returned) changes the name, activity, KPI text and justification and saves a version; the budget lines stay in the full form (D-C-01).
  - **M10 users (`adUser`):** list with role and unit filters; add a user (name, role, unit, MFA), edit (a role's demo user keeps its role), suspend with a reason or reactivate (users are never deleted). The permission matrix and delegations stay below.
  - **M10 approval route (`adWf`):** list in route order; add, edit (owner, SLA, condition, minimum amount), move up or down, delete with a reason. The committee step `w3` can't be deleted or have its condition changed, because `needsCommittee()` reads it.
  - **M10 business rules (`adRule`):** list; edit (on or off, setting, block or warn) with a reason, or switch on/off from the drawer. Rules can't be added or deleted: each is tied to a check in the code.
- **Budget types** stay a fixed read-only table: they come from the budget law and the system's checks, transfers and reports depend on the five codes.
- **Tests:** the sweep covers the three new M10 lists. A seed object key (`{ CUR_FY: A }`) broke seeding until it was made computed; every source file is now parse-checked after scripted edits. Full sweep 11,585 checks passing.

## 55. Procurement CRUD round PC1: plan items, plan versions and requisitions (round 55)

First round of `Fisko_Procurement_CRUD_Design.html` (v0.1, Thai). Scope agreed with the user: the core lifecycle only (P2 plan → P3 requisitions → P4 case files → P7 contracts → payment hand-off); list + drawer, keeping the case file and the open contract as full pages; a form plus a Simulate button for anything that comes from outside. `DATA_V` is 39.

- **New file `src/js/84-proc-crud.js`:**
  - **P2 plan items (`ppItem`, FR-PC-01):** the plan table is now a list + drawer. Procurement adds an item (allocation line, name, estimate, date, category, planned method; the suggested method uses `S.pcfg.specificMax` instead of a fixed 500,000) and edits it until it is requisitioned. A draft that was never in a proposed version and has no requisition can be deleted together with its case file. Anything else is cancelled with a reason: the case file and any live requisition are cancelled, and the item counts as "removed" in the next version (`planLive()` in 61c leaves cancelled items out). Status shown: draft (not in the published plan), planned, requisitioned, contracted, cancelled. The drawer has "Raise a requisition", which opens P3 with a new requisition for that item.
  - **P2 plan versions (`pvVer`, FR-PC-02, FR-PC-03):** proposing a version is the list's create form (it shows the changes and asks why); the executive (or a spend delegate, never the proposer) approves or rejects with a reason; procurement can withdraw a pending version; the latest approved version records its e-GP notice number, with a Simulate button that fills a number to check first.
  - **Next year's draft plan (FR-PC-04, FL-PC-02):** the "Needs not in the plan" tab lists items of reviewed budget requests (not personnel) with "Add to next year's plan". These go to `S.pplanNext` as FY`FORM_FY` drafts (no allocation line yet, no case file). P2 has a year picker (`PP_FY`); next year's list can be edited and deleted only.
  - **P3 requisitions (`pcReq`, FR-PC-05 to 07):** a requisition is created as a draft by the owning unit (`div` or `divhead`) or by procurement on its behalf (`forUnit`), for a published plan item with nothing live on it. Edit while draft or returned; send (the published plan, room on the line and the split-purchase explanation are checked first; the drawer says why it can't be sent); delete a draft that was never sent; withdraw while pending (back to draft, case back to step 1); the approver approves (SD-01), returns for changes or rejects, both with a reason; an approved requisition with no contract can be cancelled by the approver or the head of procurement (case cancelled, reservation released, item back to planned). A returned requisition is a task for whoever raised it.
- **Changes elsewhere:**
  - `76-crud.js`: an action can offer `sim: r => value`, a Simulate button that fills the reason box. An action that refuses (returns "") no longer offers Undo.
  - `60-procurement.js`: `nextId` never reuses a number (deleted ids are kept in `S.delIds`, R-C-05) and takes a year. Pending requisitions now reserve room on the line, as approved ones do. New statuses `draft`, `returned`, `closed`, `cancelled`. The approval notice now says the case moves to choosing the method (BUG-PC-07). The division task "Raise a requisition" only lists items that can be raised.
  - `61-cases.js`: case ids come from `nextId("PC", …)`. Draft requisitions don't count in the split-purchase check.
  - Seed (`61c`, `06`): plan v1 is approved on 15 July 2026 and published on 20 July, before the first requisitions (BUG-PC-08). The FY texts read `FAM_FY` or `CUR_FY`.
- **Tests:** the sweep adds a PC1 walk: add, edit and delete a plan item (and check the number isn't reused); propose, approve and publish a version; raise a requisition as the division; send, withdraw, send, return, edit, send, approve (case at step 3); cancel it (item back to planned, case cancelled); cancel the item (it shows as removed in the next version); add a next-year item from a budget request. Then every plan item, plan version and requisition drawer (view, history, edit, new) in both plan years for proc, prochead, div, divhead, plan, exec and audit.

## 56. Procurement CRUD round PC2: case files (round 56)

Second round of `Fisko_Procurement_CRUD_Design.html` (chapter 6.3). The case file stays a full page (UI-PC1); the P4 list and the rows inside a case move onto the shared list + drawer. No seed change, so `DATA_V` stays 39.

- **New file `src/js/85-case-crud.js`:**
  - **P4 case list (`pcCase`, FR-PC-08):** replaces `caseList` (group and unit filters; cancelled cases hidden by default). The drawer shows the step, the requisition, reference price, e-GP number, winner, contract and the checks for the current step, with "Open the case". Actions for procurement: Failed, rerun (steps 4 to 7), Cancel procurement (steps 2 to 8), and for the head of procurement Withdraw the award (step 7, before the appeal period ends and with no open appeal; back to step 6, scores kept). All need a reason. An "Earlier rounds" tab lists past rounds.
  - **Row lists inside a case:** market research (`csMkt`, FR-PC-10; editable at steps 3 and 4), bids (`csBid`, FR-PC-16; at step 6 until a member has scored; the bidder is picked from the supplier register, leaving out the abandoned-work list, or typed), quotations (`csQuote`, FR-PC-17; step 4 until one is chosen; choose and unchoose are drawer actions) and committees (`csCm`, FR-PC-12; appoint, change or cancel an order, with a reason, until a member has declared).
  - **Simulate:** "Simulate the remaining bids" (SIM-PC-03) adds bids from the register, priced 85 to 99% of the reference price, with Undo; they can be edited or deleted before scoring. As with the C3 cut simulation, the rows are recorded straight away instead of filling a form.
  - "Declare again" clears a member's own declaration before they score, with Undo (FR-PC-13).
- **Changes in `61-cases.js`:**
  - **Clean reruns (PC-P2, BUG-PC-04):** `caseArchive` moves the round's e-GP notice, bids, scores, quotations, award, appeal and evaluation-committee declarations into `c.rounds`, then clears them. `caseFail` uses it. `caseCancel` also clears the method, reference price, TOR, market research, criteria and committees, so a new requisition starts clean.
  - **Method approval (FR-PC-09, BUG-PC-09):** whoever chose the method can't approve it, and a rejection needs a reason.
  - **Other fixes:** "Open the contract" now opens the contract itself (BUG-PC-03). The TOR can be detached before the announcement, with Undo (FR-PC-11). The e-GP form has a Simulate button (number, today, closing after the minimum announcement days; SIM-PC-02). The award form has a date that can't be in the future (FR-PC-19). Quotations use `csQuote`, and the committee section uses `csCm`.
  - **Appeal (FR-PC-20, SIM-PC-04):** the "Demo: an appeal is filed" button is now a form (appellant from the losing bidders, date, grounds) with Simulate. "The period ended with no appeal (simulated)" stays. Only the head of procurement decides, with a reason, and the appeal notice goes to them.
- **`61b-sourcing.js`:** the market research panel and the bid form are replaced by `csMkt` and `csBid`. The criteria form id is now `crit-form`: the old id `cr-form` clashed with the drawer form of `76-crud.js`. The demo guide wording follows the new appeal buttons (`52-demo.js`).
- **Not done (left for later):** custom criteria rows (FR-PC-14; the two presets stay), editing the e-GP notice after it is announced (the Q&A amendment still moves the closing date), and replacing a committee member with a reason once declarations have started (only conflicted members can be swapped, as before).
- **Tests:** a PC2 walk adds, corrects and deletes bids, simulates the rest, reruns the case (round history kept, case clean) and cancels a case (method cleared). Then for proc, prochead, div, exec and audit it opens every case drawer (and its earlier rounds), and every market research, bid, quotation and committee row in every case (view and edit), plus the new forms. Full sweep 12,299 checks passing. Checked by hand: the bids list and drawer on a case at step 6, with simulated bids.

## 57. Procurement CRUD round PC3: contracts (round 57)

Third round of `Fisko_Procurement_CRUD_Design.html` (chapter 6.4). The open contract stays a full page (UI-PC2); the P7 list and contract creation move onto the shared list + drawer. No seed change, so `DATA_V` stays 39.

- **New file `src/js/86-con-crud.js`, `pcCon` (FR-PC-21 to 23):**
  - **List and drafting:** the P7 list replaces `conList` and the old "Create a contract" panel (`PROC.conCreate` is now empty). "Draft a contract" takes a case at the contracting step. The supplier is fixed to the winner (R-PC-04), and the amount can't exceed the winning price or the requisition. The form also has the number, signing date, warranty, number of phases and the acceptance committee (SD-02, SD-06 and the abandoned-work list are checked in the form).
  - **Phase schedule:** each phase has an amount and a due date, defaulting to an equal split 45 days apart. The phases must add up to the contract amount, and the due dates must follow the signing date and each other (R-PC-05).
  - **Draft actions:** a draft can be edited (phases are rebuilt), deleted (the number is not reused and the case goes back to step 8), or signed. Signing doesn't accept a future date; it commits the line, marks the requisition and plan item as contracted, and moves the case to step 9.
  - **Signed contracts:** a signed contract can only have its acceptance committee changed, and only before anyone has signed an acceptance. The case page's contract button opens the draft drawer (`case-tocon`).
- **Drafts are not live:** `conLive(c)` (60) leaves out terminated and draft contracts. It replaces the `status !== "terminated"` filters in 63b, 65b, 66g, 67b and 74, and the inspector tasks use it too. `famCommitted` leaves out drafts (FL-PC-06).
- **Fixes:**
  - **BUG-PC-01:** a phase needs as many acceptance signatures as the committee has members, at most two (`ph.need`, set when the contract is drafted or its committee changes). Older phases without `need` still need two.
  - **BUG-PC-02:** payment gate check 3 compares the invoice with the accepted amount when acceptance is partial (R-PC-07).
  - **BUG-PC-05:** closing the case file now also closes the contract (`status: "closed"`) and marks the plan item closed (FR-PC-31, FL-PC-09).
  - **BUG-PC-06:** a forfeited guarantee shows as "Forfeited".
- **Guarantee (FR-PC-27):** a document number field; a Simulate button (SIM-PC-06: bank guarantee, number, 5% and an expiry that covers the warranty); the amount can't be below `guaranteePct`, and the expiry must cover the last phase. A guarantee still in force can be extended to a later date, and extensions are kept in `ext`.
- **Contract changes (FR-PC-26):** whoever proposed a change can withdraw it while it is pending (new status `withdrawn`, with Undo).
- **FR-PC-34:** the unused payment-request form binders in `62-finance.js` (`#py-form`, `data-pyok`, `data-pyno`) are removed.
- **Pickers:** the acceptance-committee and committee-order pickers leave out supplier accounts (`vendor`).
- **Left for later:** withdrawing one's own acceptance signature (FR-PC-25), penalty waivers (FR-PC-28), editing or returning an invoice on a phase (FR-PC-30), Simulate for delivery notices and invoices (SIM-PC-05), and payment status on phase rows (FR-PC-33). The cumulative change ladder is not done either.
- **Tests:** a PC3 walk drafts a contract from a case at step 8 and checks that a wrong phase total is refused. It deletes the draft and drafts again, checking that a draft commits nothing and keeps the case at step 8. It reschedules to three phases, then signs, checking that the line is committed and the case is at step 9. It also checks the signatures needed and renders the drawer and the contract page. Then every contract drawer, edit form and new form is opened for proc, prochead, div, fin and audit. Full sweep 12,333 checks passing. Checked by hand: the draft form with three phases and the acceptance committee picker.

## 58. Procurement CRUD round PC4: waivers, signatures, invoices and the end-to-end demo (round 58)

Last round of `Fisko_Procurement_CRUD_Design.html`. It finishes the contract pieces left from PC3 that the demo needs, and adds the demo script (chapter 11). No seed change, so `DATA_V` stays 39.

- **New file `src/js/87-proc-e2e.js`:**
  - **Penalty waivers (`pcWaive`, FR-PC-28, FL-PC-08):** a list under the phases tab of an open contract, for phases that are late or already have a waiver.
    - Procurement proposes an amount up to the contract penalty, with a reason and a supporting document.
    - The executive or a spend delegate approves it (SD-08: never the proposer) or rejects it with a reason.
    - The proposer can withdraw it while it is pending.
    - An approved waiver can be cancelled until the phase goes to payment (`phPayStarted`: a live voucher or payment request).
    - `phPenalty` now subtracts an approved waiver, and `phPenaltyRaw` keeps the contract penalty, so the waiver flows into `phNet`, the payment gate and the Finance voucher.
  - **Phase rows (63):**
    - "Withdraw my signature" lets a member take back their own acceptance signature until the acceptance is complete, with Undo (FR-PC-25).
    - The invoice form starts at the accepted amount and has a Simulate button that fills a supplier-portal invoice (SIM-PC-05).
    - A recorded invoice can be returned with a reason before payment starts; earlier invoices are kept in `invReturned` (FR-PC-30).
  - **The procurement end-to-end demo:** fifteen steps, P-E01 to P-E15, in the in-app demo guide (`DEMO`, `part: "pe2e"`), each with the role, the page, what to say and what to click. They run from the plan item to closing the case, with the fail-and-cancel alternative last. The guide's filter has a new choice, "Procurement end to end". "The original storyline" now means steps with no `part` (82).
- **Still not done:** delivery-notice numbers with Simulate (deliveries keep a date only), payment status beyond what `phVoucher` already shows on phase rows (FR-PC-33), custom criteria rows (FR-PC-14), editing an e-GP notice after it is announced, replacing a committee member with a reason after declarations start, and the cumulative change ladder.
- **Tests:**
  - **PC4 walk:** proposes, approves and cancels a waiver on a late phase, checking that the net payable rises by the waiver and drops back when it is cancelled. It withdraws an inspector's signature through the button on the phase row, and returns an invoice through its control.
  - **Drawers:** every waiver drawer is opened for proc, prochead, exec, fin and audit.
  - **Demo:** the demo suite visits P-E01 to P-E15.
  - **Result:** full sweep 12,378 checks passing. Checked by hand: the waiver list on a late phase, and the guide filters (15 procurement, 16 budget and 55 original steps).

## 59. Procurement CRUD: the open items after PC4 (round 59)

The five items left open in section 58. No seed change, so `DATA_V` stays 39.

- **Custom evaluation criteria (FR-PC-14, new file `src/js/88-proc-more.js`, `csCrit`):** at step 4 of a competitive case, below the preset form (61b), the criteria are a list.
  - Rows can be added, renamed, reweighted (0 to 100, and the running total can't pass 100) or deleted.
  - Price is always a row: its name is fixed and it can't be deleted.
  - The list head shows whether the total is 100; `critOk` still blocks moving on until it is.
- **Correcting the e-GP notice (FR-PC-15, `88`):** at step 5, before bids close, a panel changes the project number and the closing date with a reason (at least 10 characters).
  - Each correction keeps the old and new values in `c.egp.amends` and is listed in the panel.
  - The plan item's e-GP number follows.
  - The Q&A amendment that moves the closing date is unchanged.
- **Replacing a committee member after declarations (FR-PC-12, `85`, `csCm`):** a committee order can now be edited after members start declaring, up to step 6.
  - The edit needs a reason. The order number and date are locked.
  - Members who have scored can't leave (the form says who).
  - Members who leave lose their declaration (event `coi_swap` with the reason); new members must declare before they score.
  - Cancelling the order still works only before anyone declares.
- **Cumulative approval ladder (`63`, `varCum`):** a contract change goes to the executive once all approved changes of the same kind, including this one, pass the head's limit: `ladderPct` of the base amount, or `extDaysHead` days. The cumulative figure is stored on the change (`v.cum`) and shown next to it.
- **Delivery notice numbers (SIM-PC-05, `63`, `88`):** the delivery form has a notice number and a Simulate button (number `DN-<yy>-<contract><phase>`, today's date or the due date). The number is shown on the phase row (`ph.dRef`).
- **Tests:** an R59 walk runs every item on a case and a contract:
  - **Criteria:** a total past 100 is refused, a row is reweighted, added and deleted, and `critOk` holds.
  - **Committee:** a started committee is changed with a reason; a member who scored can't leave; another member is replaced.
  - **e-GP notice:** corrected through the panel, and the correction is kept.
  - **Change ladder:** a second small change goes to the executive.
  - **Delivery:** recorded through Simulate, and the number is saved.
  - **Result:** full sweep 12,390 checks passing. Checked by hand: the criteria list with a total that is not 100.
