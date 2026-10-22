// Fisko prototype test sweep. Runs inside the prototype page (it needs the app's globals: ROLE, LANG, ORG, S,
// route, NAV ...), so tests/run.html injects it into an iframe that loads Fisko_Prototype.html. It can also be
// pasted into the browser console on the prototype page and started with FISKO_TEST.run().
//
// Suites
//   render  every page, every tab clicked, for every role × language × organisation, plus request steps,
//           allocation tabs for each fiscal year and quarterly-report rounds for each unit
//   chat    the AI co-work answer engine for every agent against sample questions
//   agents  every budget and finance agent started and its run shown; Finance F9 sub-pages
//   (render also opens every menu tab of the Procurement and Finance apps for each role)
//   demo    every step of the in-app demo guide
// A check fails when the page text contains undefined, NaN, [object, Infinity or Invalid, or when code throws.
// The sweep reseeds data in memory; at the end it clears the saved demo state so the next load starts fresh.
(function () {
  const BAD = /undefined|NaN|\[object|Infinity|Invalid/;
  // a MessageChannel tick yields to the page like setTimeout(0) but is not throttled when the tab is in the background
  const tick = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const QS = ["Check this request", "Draft the justification", "What if the ceiling drops 10%", "Which units are behind plan", "Any spending anomalies", "Summarise requests by status", "Which contracts are late", "Which cases are stuck", "What is the share of competitive cases", "What should I do first today", "Summarise payments", "hello"];
  async function run(opts = {}) {
    const o = Object.assign({ suites: ["render", "chat", "agents", "demo"], orgs: Object.keys(SEEDS), langs: ["th", "en"], roles: Object.keys(ROLES), onProgress: () => {} }, opts);
    const t0 = performance.now(), errs = [];
    let n = 0, done = 0;
    const total = o.suites.length * o.orgs.length * o.langs.length * o.roles.length;
    const chk = label => { n++; const v = document.getElementById("view"), s = v ? v.innerText : "", m = s.match(BAD); if (m) errs.push(`${label}: …${s.slice(Math.max(0, m.index - 40), m.index + 20).replace(/\s+/g, " ")}…`); };
    const safe = (label, fn) => { try { fn(); } catch (e) { errs.push(`${label} THROW ${e && e.message}`); } };
    // route by the test hook, not history (browsers ignore replaceState after a few hundred calls in 10 s)
    const go2 = id => { window.FISKO_ROUTE = "#" + id; route(); const want = id.startsWith("admin-") ? "admin" : id; if (CUR !== want) errs.push(`asked for ${id}, got ${CUR}`); };
    const report = what => o.onProgress({ what, n, errors: errs.length, done: ++done, total });
    const oldErr = window.onerror; window.onerror = (msg, src, line) => { errs.push(`window.onerror ${msg} @${line}`); };
    for (const org of o.orgs) {
      ORG = org; S = SEEDS[org].seed();
      if (o.suites.includes("render")) for (const lang of o.langs) { LANG = lang; for (const role of o.roles) {
        ROLE = role; safe("shell", renderShell);
        for (const nv of NAV.filter(x => x.roles.includes(role))) {
          safe(`${org}/${lang}/${role}/${nv.id}`, () => {
            go2(nv.id); chk(`${org}/${lang}/${role}/${nv.id}`);
            const k = document.querySelectorAll("#view [role=tab]").length;
            for (let i = 0; i < k; i++) { const b = document.querySelectorAll("#view [role=tab]")[i]; if (!b) break; b.click(); chk(`${org}/${lang}/${role}/${nv.id}/tab${i}`); }
            if (nv.id === "allocation" && typeof ALLOC_TABS !== "undefined") { for (const fy of Object.keys(S.allocs)) { ALLOC_FY = Number(fy); for (const t of ALLOC_TABS.map(x => x.id)) { ALLOC_TAB = t; route(); chk(`alloc ${fy}/${t}`); } } ALLOC_FY = 2570; }
            if (nv.id === "performance" && typeof QR_ROUNDS === "function") { PERF_TAB = "quarter"; for (const rd of QR_ROUNDS()) { QR_ROUND = rd.id; for (const u of [null, ...qrUnits()]) { QR_UNIT = u; route(); chk(`perf ${rd.id}/${u}`); } } QR_ROUND = "Q4"; QR_UNIT = null; }
          });
          await tick();
        }
        if (NAV.find(x => x.id === "requests").roles.includes(role)) for (const r of S.requests) for (const tb of ["main", "plan", "ready", "docs", "years", "equip", "payroll", "versions"]) safe(`req ${r.id}/${tb}`, () => { CUR_REQ = r.id; REQ_TAB = tb; go2("request"); chk(`${org}/${lang}/${role}/req ${r.id}/${tb}`); });
        report(`render ${org}/${lang}/${role}`); await tick();
      } }
      // every menu tab of the Procurement and Finance apps (the render pass above only sees the current tab)
      if (o.suites.includes("render")) for (const lang of o.langs) { LANG = lang; for (const role of o.roles) {
        ROLE = role; safe("shell", renderShell);
        for (const nv of NAV.filter(x => x.tabs && x.roles.includes(role))) for (const [tb, , , , rs] of nv.tabs) if (!rs || rs.includes(role)) safe(`${org}/${lang}/${role}/${nv.id}/${tb}`, () => {
          nv.tabSet(tb); go2(nv.id); chk(`${org}/${lang}/${role}/${nv.id}/${tb}`);
          // tabs inside the page (Finance pages have their own)
          const k = document.querySelectorAll("#view [role=tab]").length;
          for (let i = 0; i < k; i++) { const b = document.querySelectorAll("#view [role=tab]")[i]; if (!b) break; b.click(); chk(`${org}/${lang}/${role}/${nv.id}/${tb}/tab${i}`); }
        });
        await tick();
      } }
      // Procurement pages that show one item at a time (round 44): every contract opened, every AI tool picked
      if (o.suites.includes("render") && typeof PROC_PAGES !== "undefined") for (const lang of o.langs) { LANG = lang; for (const role of ["proc", "prochead", "div", "fin", "audit"].filter(r => o.roles.includes(r))) {
        ROLE = role; safe("shell", renderShell);
        for (const c of S.contracts || []) for (const [k] of (typeof CON_TABS !== "undefined" ? CON_TABS : [["phases"]])) safe(`${org}/${lang}/${role}/contract ${c.id}/${k}`, () => { CON_OPEN = c.id; CON_TAB = k; procSet("contracts:main"); go2("procurement"); chk(`${org}/${lang}/${role}/contract ${c.id}/${k}`); });
        CON_OPEN = null; CON_TAB = "phases";
        if (prSees(prPage("ai"))) for (const [k] of AI_TOOLS) safe(`${org}/${lang}/${role}/ai ${k}`, () => { AI_TOOL = k; procSet("ai:assist"); go2("procurement"); chk(`${org}/${lang}/${role}/ai ${k}`); });
        AI_TOOL = "AI-01"; await tick();
      } }
      // Shared list + drawer (round C1): every record of every B7 list opened, each drawer tab, the edit form and the new form
      if (o.suites.includes("render") && typeof CRUD !== "undefined") for (const role of ["fin", "exec", "plan", "audit"].filter(r => o.roles.includes(r))) {
        ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
        const where = { alLine: "allocate", alTr: "transfers", alRel: "releases", alCf: "carry", alAp: "appropriation" };
        for (const fy of Object.keys(S.allocs).map(Number)) for (const [k, tab] of Object.entries(where)) {
          ALLOC_FY = fy; ALLOC_TAB = tab; const sp = CRUD.defs[k];
          const open = (id, mode, t) => safe(`${org}/${role}/${fy}/${k}/${id || "new"}/${mode}${t ? "/" + t : ""}`, () => { crOpen(k, id, mode); if (t) CR_OPEN.tab = t; go2("allocation"); chk(`${org}/${role}/${fy}/${k}/${id || "new"}/${mode}${t || ""}`); if (!document.querySelector(".cr-drawer")) errs.push(`${org}/${role}/${fy}/${k}/${id}: no drawer`); });
          for (const r of (sp.list() || [])) { const id = sp.id(r); open(id, "view"); for (const [t] of (sp.tabs ? sp.tabs(r) : [])) open(id, "view", t); open(id, "view", "hist"); if (sp.edit && sp.edit.can(r)) open(id, "edit"); }
          if (sp.create && sp.create.can()) open("", "edit");
        }
        crClose(); ALLOC_FY = 2570; await tick();
      }
      // Round C2: requests, the department ceiling, duplicates, meetings and hearings, for every role that sees them
      if (o.suites.includes("render") && typeof CRUD !== "undefined" && CRUD.defs.rqReq) for (const role of ["div", "divhead", "plan", "exec", "audit", "admin", "fin"].filter(r => o.roles.includes(r))) {
        ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
        const where = { rqReq: ["requests", () => {}], csCeil: ["consolidation", () => (CONS_TAB = "ceilings")], csDup: ["consolidation", () => (CONS_TAB = "overview")], rvMeet: ["review", () => (REV_TAB = "meetings")], rvHear: ["review", () => (REV_TAB = "hearings")],
          sbBatch: ["submission", () => (SUB_TAB = "status")], sbRev: ["submission", () => (SUB_TAB = "status")], plCut: ["submission", () => (SUB_TAB = "parliament")], plApp: ["submission", () => (SUB_TAB = "parliament")],
          stNode: ["strategy", () => (STRAT_TAB = "map")], stKpi: ["strategy", () => (STRAT_TAB = "kpis")], stIdea: ["strategy", () => (STRAT_TAB = "bank")], stRev: ["strategy", () => (STRAT_TAB = "revise")], pfOut: ["performance", () => (PERF_TAB = "kpis")],
          adUnit: ["admin", () => (ADMIN_TAB = "master")], adPrice: ["admin", () => (ADMIN_TAB = "master")], adFy: ["admin", () => (ADMIN_TAB = "fiscal")], adCal: ["admin", () => (ADMIN_TAB = "fiscal")], adNode: ["admin", () => (ADMIN_TAB = "structure")],
          adCm: ["admin", () => (ADMIN_TAB = "bmaster")], adMp: ["admin", () => (ADMIN_TAB = "bmaster")], adCs: ["admin", () => (ADMIN_TAB = "bmaster")],
          wiSc: ["insight", () => (INTEL_TAB = "whatif")], anDone: ["insight", () => (INTEL_TAB = "anoms")], agRun: ["assistant", () => (INTEL_TAB = "bagents")],
          adUser: ["admin", () => (ADMIN_TAB = "users")], adWf: ["admin", () => (ADMIN_TAB = "workflow")], adRule: ["admin", () => (ADMIN_TAB = "rules")] };
        for (const [k, [page, set]] of Object.entries(where)) {
          if (!allowed(page) || (page === "admin" && !ADMIN_TABS.some(x => x.roles.includes(ROLE) && (set(), x.id === ADMIN_TAB)))) continue;
          const sp = CRUD.defs[k], open = (id, mode, t) => safe(`${org}/${role}/${k}/${id || "new"}/${mode}${t ? "/" + t : ""}`, () => { set(); crOpen(k, id, mode); if (t) CR_OPEN.tab = t; go2(page); chk(`${org}/${role}/${k}/${id || "new"}/${mode}${t || ""}`); if (!document.querySelector(".cr-drawer") && !(page === "strategy" && STRAT_TAB !== want)) errs.push(`${org}/${role}/${k}/${id}: no drawer`); });
          const want = page === "strategy" ? set() : null; // a tab the role can't see is skipped (B2 tabs are filtered by role)
          for (const r of (sp.list() || [])) { const id = sp.id(r); open(id, "view"); for (const [t] of (sp.tabs ? sp.tabs(r) : [])) open(id, "view", t); if (sp.edit && sp.edit.can(r)) open(id, "edit"); }
          if (sp.create && sp.create.can()) open("", "edit");
        }
        crClose(); CONS_TAB = "overview"; REV_TAB = "queue"; await tick();
      }
      // Finance CRUD round FC1: the F10 registers on the shared list (every record, its history, edit and new forms), then a walk
      if (o.suites.includes("render") && typeof CRUD !== "undefined" && CRUD.defs.fnGfu) {
        const where = { fnGfu: "reg:gfusers", fnVend: "reg:vendors", fnCmte: "reg:committee", fnBook: "reg:books" };
        for (const role of ["fin", "finhead", "exec", "audit"].filter(r => o.roles.includes(r))) {
          ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
          for (const [k, tab] of Object.entries(where)) {
            const sp = CRUD.defs[k], open = (id, mode, t) => safe(`${org}/${role}/${k}/${id || "new"}/${mode}${t ? "/" + t : ""}`, () => { finSet(tab); crOpen(k, id, mode); if (t) CR_OPEN.tab = t; go2("finance"); chk(`${org}/${role}/${k}/${id || "new"}/${mode}${t || ""}`); if (!document.querySelector(".cr-drawer")) errs.push(`${org}/${role}/${k}/${id}: no drawer`); });
            for (const r of (sp.list() || [])) { const id = sp.id(r); open(id, "view"); open(id, "view", "hist"); if (sp.edit && sp.edit.can(r)) open(id, "edit"); }
            if (sp.create && sp.create.can()) open("", "edit");
          }
          crClose(); await tick();
        }
        if (o.roles.includes("fin") && o.roles.includes("finhead")) { const keep = JSON.stringify(S); safe(`${org}/FC1 walk`, () => {
          const D = CRUD.defs, why = "เหตุผลสำหรับการทดสอบ", as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); }, E = m => errs.push(`${org}/FC1: ${m}`);
          const act = (k, r, id, w) => { const a = (D[k].acts(r) || []).find(x => x && x.id === id); if (!a) { E(`no action ${k}/${id} for ${ROLE}`); return null; } return a.run(r, w || why); };
          const has = (k, r, id) => (D[k].acts(r) || []).some(x => x && x.id === id);
          const show = (k, r, tab) => { finSet(tab); crOpen(k, D[k].id(r)); go2("finance"); chk(`${org}/FC1/${k}/${D[k].id(r)}`); crClose(); };
          const fnId = S.users.find(u => u.role === "fin" && u.primary).id, fhId = S.users.find(u => u.role === "finhead" && u.primary).id;
          // GFMIS assignment: the check, create, edit, revoke by id
          as("finhead");
          if (!D.fnGfu.check({ user: fnId, order: "x", until: FY_END }).length) E("gfu check let no duty through");
          const g = D.fnGfu.create.run({ user: fnId, d_record: true, d_approve: false, d_remit: true, order: "คำสั่งทดสอบ 9/2570", until: FY_END });
          D.fnGfu.edit.run(g, { d_record: true, d_approve: true, d_remit: false, order: g.order, until: FY_END }, why);
          if (g.duties.join() !== "record,approve") E(`gfu edit gave ${g.duties}`);
          act("fnGfu", g, "rev"); if (gfuSt(g) !== "off" || has("fnGfu", g, "rev")) E("gfu revoke");
          show("fnGfu", g, "reg:gfusers");
          // supplier bank change: the requester can't confirm or refuse (SD-14), someone else can
          as("fin");
          const vd = (S.vendors || [])[0];
          if (vd) {
            if (!D.fnVend.check({ acct: "123", book: false }).length) E("vendor check let a short account through");
            const c1 = D.fnVend.create.run({ vendor: vd.id, bank: BANKS[1], acct: "1234567890", book: true });
            D.fnVend.edit.run(c1, { bank: BANKS[2], acct: "1234567891" }, why); if (c1.acct !== "1234567891") E("vendor edit");
            if (has("fnVend", c1, "ok") || has("fnVend", c1, "no") || !has("fnVend", c1, "wd")) E("requester sees confirm or refuse");
            as("finhead"); act("fnVend", c1, "no"); if (c1.status !== "rejected") E("vendor refuse");
            as("fin"); const c2 = D.fnVend.create.run({ vendor: vd.id, bank: BANKS[0], acct: "2222222222", book: true });
            as("finhead"); const before = (vd.bankHist || []).length, hadBank = !!vd.bank; act("fnVend", c2, "ok");
            if (c2.status !== "confirmed" || vd.bank.acct !== "2222222222" || (hadBank && (vd.bankHist || []).length !== before + 1)) E("vendor confirm");
            as("fin"); const c3 = D.fnVend.create.run({ vendor: vd.id, bank: BANKS[0], acct: "3333333333", book: true }); act("fnVend", c3, "wd"); if (c3.status !== "withdrawn") E("vendor withdraw");
            show("fnVend", c2, "reg:vendors");
          }
          // cash committee: a later order, edited and cancelled; one from today takes over
          as("finhead");
          const ppl = coPeople().slice(0, 3), pv = (ms, ss) => Object.fromEntries(coPeople().map(u => ["p_" + u.id, ms.includes(u) ? "m" : ss.includes(u) ? "s" : ""]));
          if (!D.fnCmte.check(Object.assign({ order: "x", from: TODAY }, pv([ppl[0]], []))).length) E("committee check let one member through");
          const o1 = D.fnCmte.create.run(Object.assign({ order: "คำสั่งทดสอบ 20/2570", from: addDays(TODAY, 5) }, pv([ppl[0], ppl[1]], [ppl[2]])));
          if (coSt(o1) !== "next" || !D.fnCmte.edit.can(o1)) E("committee later order");
          D.fnCmte.edit.run(o1, Object.assign({ order: o1.order, from: addDays(TODAY, 6) }, pv([ppl[0], ppl[2]], [])));
          act("fnCmte", o1, "off"); if (coSt(o1) !== "off") E("committee cancel");
          const o2 = D.fnCmte.create.run(Object.assign({ order: "คำสั่งทดสอบ 21/2570", from: TODAY }, pv([ppl[1], ppl[2]], [])));
          if (cashC().id !== o2.id) E("committee order from today is not in force");
          show("fnCmte", o2, "reg:committee");
          // receipt books: issue next year's and this year's, hand over, void the old tail, receipts go to the new book
          const b1 = D.fnBook.create.run({ fy: String(FAM_FY + 1), to: 50, holder: fnId });
          if (b1.no !== `${maxNo(S.rbooks.filter(x => x.fy === FAM_FY + 1 && x !== b1).map(x => x.no), /^(\d+)\//) + 1}/${FAM_FY + 1}`) E(`book number ${b1.no}`);
          D.fnBook.edit.run(b1, { holder: fhId }, why); if (b1.holder !== fhId) E("book hand-over");
          act("fnBook", b1, "ret"); if (rbSt(b1) !== "ret") E("book return");
          const cur = S.rbooks.find(x => x.holder === fnId && !x.returned && x.fy === FAM_FY), b2 = D.fnBook.create.run({ fy: String(FAM_FY), to: 20, holder: fnId });
          if (cur) { act("fnBook", cur, "void"); if (rbCap(cur) !== rbUsed(cur)) E("book void"); }
          as("fin"); const rc = rcIssue({ kind: "revenue", payer: ["ทดสอบ", "Test"], desc: ["ทดสอบ", "Test"], amount: 100, method: "cash" });
          if (!rc || rc.book !== b2.id || rc.n !== 1) E(`receipt went to ${rc && rc.book}/${rc && rc.n}`);
          as("finhead"); show("fnBook", b2, "reg:books");
          // P-F05 is a duty rule now: blocked and logged
          if (sodCheck("P-F05", [fnId], [fnId], "TEST") || S.sod.blocks[0].rule !== "P-F05") E("P-F05 not logged as a duty block");
          // the tabs of F10 after all of it, for each role
          for (const r of ["fin", "finhead", "exec", "audit"]) { as(r); for (const t of Object.values(where)) { finSet(t); go2("finance"); chk(`${org}/FC1/${r}/${t}`); } }
        }); S = JSON.parse(keep); crClose(); ROLE = "fin"; await tick(); }
      }
      // Finance CRUD round FC2: every voucher and advance drawer (details, history, each reason box, the edit form), the list tools, then a walk
      if (o.suites.includes("render") && typeof vcSave === "function") {
        for (const role of ["fin", "finhead", "exec", "audit"].filter(r => o.roles.includes(r))) {
          ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
          for (const v of S.vouchers || []) safe(`${org}/${role}/vc ${v.id}`, () => {
            finSet("pay:vouchers"); VC_EDIT = null; VC_OPEN = v.id;
            for (const t of ["view", "hist"]) { FIN_DTAB.vc = t; FIN_ASK = null; go2("finance"); chk(`${org}/${role}/vc ${v.id}/${t}`); if (!document.querySelector("#vc-detail")) errs.push(`${org}/${role}/vc ${v.id}: no drawer`); }
            FIN_DTAB.vc = "view";
            for (const [a, , , w] of vcActs(v)) if (w) { FIN_ASK = { key: "vc", act: a }; go2("finance"); chk(`${org}/${role}/vc ${v.id}/ask ${a}`); if (!document.querySelector("#fn-ask")) errs.push(`${org}/${role}/vc ${v.id}: no reason box for ${a}`); }
            FIN_ASK = null;
            if (vcActs(v).some(x => x[0] === "edit")) { VC_EDIT = v.id; go2("finance"); chk(`${org}/${role}/vc ${v.id}/edit`); if (!document.querySelector("#vc-form")) errs.push(`${org}/${role}/vc ${v.id}: no edit form`); VC_EDIT = null; }
          });
          if (role === "fin") safe(`${org}/fin/vc new`, () => { VC_OPEN = null; VC_EDIT = "new"; finSet("pay:vouchers"); go2("finance"); chk(`${org}/fin/vc new`); if (!document.querySelector("#vc-form")) errs.push(`${org}/fin: no new-voucher form`); VC_EDIT = null; });
          safe(`${org}/${role}/vc list`, () => { finSet("pay:vouchers"); VC_OPEN = null; VC_F = "all"; Object.assign(VC_Q, { q: "VC", show: true, sort: { k: "net", d: -1 } }); go2("finance"); chk(`${org}/${role}/vc list`); Object.assign(VC_Q, { q: "", type: "", route: "", show: false, sort: null }); VC_F = "open"; });
          for (const a of S.advances || []) safe(`${org}/${role}/adv ${a.id}`, () => { finSet("adv"); ADV_OPEN = a.id; for (const t of ["view", "hist"]) { FIN_DTAB.adv = t; go2("finance"); chk(`${org}/${role}/adv ${a.id}/${t}`); } FIN_DTAB.adv = "view";
            for (const k of ["approve", "reject", "object", "cancel"]) { FIN_ASK = { key: "adv", act: k }; go2("finance"); chk(`${org}/${role}/adv ${a.id}/ask ${k}`); } FIN_ASK = null; });
          ADV_OPEN = null; VC_OPEN = null; await tick();
        }
        if (["fin", "finhead", "exec"].every(r => o.roles.includes(r))) { const keep = JSON.stringify(S); safe(`${org}/FC2 walk`, () => {
          const as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); }, E = m => errs.push(`${org}/FC2: ${m}`);
          if ((vcAuth(5e5, "finhead") || {}).id !== "A3" || vcAuth(2e6, "finhead") || (vcAuth(2e6, "exec") || {}).id !== "A2" || (vcAuth(2e7, "exec") || {}).id !== "A1") E("authority levels");
          as("fin");
          const line = famLines().find(l => (l.type === "ope" || l.type === "inv") && famHeadroom(l.id) > 200000);
          if (!line) { E("no allocation line with room"); return; }
          const m = { id: "CM-TEST-01", kind: "utility", name: ["ค่าไฟทดสอบ", "Test power"], vendor: ["การไฟฟ้าทดสอบ", "Test utility"], line: line.id, amount: 100000, released: 0, paid: 0, signed: TODAY, due: FY_END, by: me().id, t: nowIso(), log: [] };
          (S.fcommit = S.fcommit || []).push(m);
          const free = () => fcFree(finCommits().find(y => y.id === m.id));
          const base = { type: "utility", commit: m.id, nb: "", line: "", desc: "ค่าไฟฟ้าทดสอบ", vendor: "", payee: "การไฟฟ้าทดสอบ", kind: "gov", tax: "", gross: 60000, vat: false, contrib: false, due: addDays(TODAY, 5), method: "epay", mwhy: "" };
          if (!vcSave(Object.assign({}, base, { gross: 0 })).errs) E("save let a zero gross through");
          if (!vcSave(Object.assign({}, base, { method: "cash", mwhy: "" })).errs) E("save let cash without a reason through");
          const v1 = vcSave(base).v;
          vcSave(Object.assign({}, base, { gross: 55000 }), v1); if (v1.gross !== 55000) E("edit gross");
          v1.ev = { bill: true }; vcAct(v1, "submit"); if (v1.state !== "check") E(`submit gave ${v1.state}`);
          const v2 = vcSave(Object.assign({}, base, { gross: 50000 })).v; v2.ev = { bill: true }; vcAct(v2, "submit");
          if (v2.state !== "draft") E("a second voucher passed the commitment (R-FC-03)");
          if (!vcAct(v1, "recall", "สั้น")) E("recall without a reason went through");
          vcAct(v1, "recall", "แก้ยอดตามใบแจ้งหนี้ใหม่"); if (v1.state !== "draft" || v1.checker) E("recall");
          vcAct(v1, "submit");
          as("finhead"); vcAct(v1, "checked"); if (v1.state !== "approve" || v1.checker !== me().id) E("check");
          vcAct(v1, "approve"); if (v1.state !== "approve") E("SD-11 let the checker approve");
          as("exec"); vcAct(v1, "approve"); if (v1.state !== "ready" || !/^A2/.test(v1.approver.auth)) E(`approve gave ${v1.state} ${v1.approver && v1.approver.auth}`);
          if (free() !== 45000) E(`free after approval ${free()}`);
          as("finhead"); vcAct(v1, "hcancel", "ผู้ขายแจ้งยกเลิกบริการเดือนนี้"); if (v1.state !== "cancelled") E("finance-head cancel");
          if (free() !== 100000) E(`cancel left ${free()} free`);
          as("fin"); const v3 = vcSave(Object.assign({}, base, { gross: 10000 })).v; v3.ev = { bill: true };
          for (let i = 0; i < 3; i++) { as("fin"); vcAct(v3, "submit"); as("finhead"); vcAct(v3, "return", "แนบหลักฐานไม่ครบถ้วน"); }
          if (v3.returns !== 3 || v3.state !== "returned") E("returns");
          as("fin"); vcAct(v3, "submit"); as("finhead"); vcAct(v3, "checked"); as("exec"); vcAct(v3, "reject", "ไม่มีงบสำหรับรายการนี้แล้ว"); if (v3.state !== "rejected") E("reject is not final");
          as("fin"); finSet("pay:vouchers"); VC_F = "all"; VC_Q.show = true; VC_OPEN = v3.id; go2("finance"); chk(`${org}/FC2/list`);
          FIN_DTAB.vc = "hist"; go2("finance"); chk(`${org}/FC2/hist`); FIN_DTAB.vc = "view";
          const ad = (S.advances || []).find(a => a.state === "request"); if (ad) { as("exec"); if (!advAct(ad, "reject", "สั้น")) E("advance reject without a reason went through"); }
        }); S = JSON.parse(keep); VC_OPEN = null; VC_EDIT = null; FIN_ASK = null; VC_F = "open"; VC_Q.show = false; ROLE = "fin"; await tick(); }
      }
      // Round C4: every B8 and B9 tab with the demo date moved to March and to September (simulated GFMIS imports)
      if (o.suites.includes("render") && typeof simDisb === "function" && S.y2569) for (const mi of [5, 11]) {
        S.asOf = FY_MONTH_ENDS()[mi]; TODAY = S.asOf; simDisb(mi);
        for (const role of ["plan", "exec", "div", "fin", "audit"].filter(r => o.roles.includes(r))) {
          ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
          for (const [page, set, tabs] of [["dashboard", v => (MON_TAB = v), ["live", "drill", "forecast", "alerts", "progress", "procure", "import", "overview"]], ["performance", v => (PERF_TAB = v), ["kpis", "chain", "scorecard", "quarter", "cost", "report", "evaluate", "stages", "recs", "public"]], ["btoday", () => {}, [""]]])
            if (allowed(page)) for (const t of tabs) safe(`${org}/m${mi + 1}/${role}/${page}/${t}`, () => { set(t); go2(page); chk(`${org}/m${mi + 1}/${role}/${page}/${t}`); if (!document.querySelector(".asof-bar")) errs.push(`${org}/m${mi + 1}/${page}: no demo-date banner`); });
          await tick();
        }
        if (S.dash.fy !== CUR_FY || !S.dash.live) errs.push(`${org}/m${mi + 1}: dashboard is not the live year`);
      }
      if (typeof REAL_TODAY !== "undefined") { S.asOf = null; TODAY = REAL_TODAY; MON_TAB = "live"; PERF_TAB = "kpis"; }
      // Round C6: the end-to-end demo (design chapter 11, E-01 to E-16) driven through the same actions the screens use
      if (o.suites.includes("render") && typeof CRUD !== "undefined" && CRUD.defs.wiSc && o.roles.includes("plan")) safe(`${org}/E2E walk`, () => {
        const D = CRUD.defs, why = "เหตุผลสำหรับการทดสอบ", as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); };
        const act = (k, r, id, w) => { const a = (D[k].acts(r) || []).find(x => x && x.id === id); if (!a) { errs.push(`${org}/E2E: ${k} ${D[k].id(r)} has no action ${id} for ${ROLE}`); return false; } a.run(r, w || why); return true; };
        const see = (page, label) => { go2(page); chk(`${org}/E2E/${label}`); };
        // E-01 the administrator opens the next fiscal year
        as("admin"); const fy = D.adFy.create.run({}); if (!S.structure[fy.fy] || !S.structure[fy.fy].length) errs.push(`${org}/E2E: FY${fy.fy} has no structure`); ADMIN_TAB = "fiscal"; see("admin", "E-01");
        // E-02 Planning adds a goal and a KPI
        as("plan"); const g = D.stNode.create.run({ kind: "goal", parent: S.strategy.items[0].id, th: "เป้าประสงค์ทดสอบ" });
        const k = D.stKpi.create.run({ goal: g.id, th: "ตัวชี้วัดทดสอบ", unit: "ครั้ง", owner: me().unit, base: 0, t0: 1, t1: 2, t2: 3, t3: 4, t4: 5, formula: "" }); STRAT_TAB = "kpis"; see("strategy", "E-02");
        // E-03 a unit proposes an idea; Planning scores and accepts it
        as("div"); const idea = D.stIdea.create.run({ name: "แนวคิดทดสอบ", kpi: k.id, est: 2, years: 1 });
        as("plan"); D.stIdea.edit.run(idea, { s0: "4", s1: "4", s2: "4", s3: "4", s4: "4", note: "" }); act("stIdea", idea, "acc"); if (idea.status !== "accepted") errs.push(`${org}/E2E: idea not accepted`); STRAT_TAB = "bank"; see("strategy", "E-03");
        // E-04 Planning reissues the ceilings
        act("csCeil", S.cons, S.cons.issued ? "reissue" : "issue"); CONS_TAB = "ceilings"; see("consolidation", "E-04");
        // E-05 a unit withdraws a sent request and sends it again through its director
        const sent = S.requests.find(r => ["unit", "plan"].includes(r.status) && r.unit === (as("div"), me().unit));
        if (sent) { act("rqReq", sent, "wd"); if (sent.status !== "draft") errs.push(`${org}/E2E: withdraw left ${sent.status}`); sent.status = "plan"; }
        see("requests", "E-05");
        // E-06 Planning, then the executive, send the reviewed requests on from the rounds page
        as("plan"); REV_TAB = "rounds"; see("review", "E-06 plan"); const fw = document.getElementById("rv-fwd"); if (fw) fw.click();
        as("exec"); go2("review"); const fe = document.getElementById("rv-fwd"); if (fe) fe.click(); chk(`${org}/E2E/E-06 exec`);
        // E-07 a meeting is scheduled (if none) and its resolutions recorded
        as("plan"); if (!meetScheduled()) D.rvMeet.create.run({ no: tx(meetNo()), date: addDays(TODAY, 1), time: "09:30", place: "ห้องประชุม", note: "" });
        REV_TAB = "meetings"; see("review", "E-07"); const ms = document.getElementById("m-save"); if (ms) ms.click(); chk(`${org}/E2E/E-07 held`);
        if (!S.requests.some(r => r.status === "approved" && r.decided != null)) errs.push(`${org}/E2E: no approved request with a decided amount`);
        // E-11 Finance adds and confirms a line, then asks for a release that the Budget Bureau approves
        as("fin"); ALLOC_FY = CUR_FY; ALLOC_TAB = "allocate"; const A = S.allocs[CUR_FY], before = allocated();
        const line = D.alLine.create.run({ unit: A.lines[0].unit, name: "บรรทัดทดสอบ", type: "ope", act: A.lines[0].act, amount: Math.min(1e6, Math.max(1e5, typeRoom("ope"))), newProj: false, extended: false });
        act("alLine", line, "confirm"); if (allocated() <= before) errs.push(`${org}/E2E: confirming a line didn't raise the allocation`); see("allocation", "E-11 line");
        const rel = D.alRel.create.run({ q: String(CUR_Q), type: "ope", amount: 1e5, note: "" }); act("alRel", rel, "ok"); ALLOC_TAB = "releases"; see("allocation", "E-11 release");
        // E-12 a transfer is requested, withdrawn, requested again and approved
        const L2 = A.lines.filter(l => !l.cancelled && l.amount > 2e5 && bal(l).avail - pendingOut(l.id) > 2e5), tf = { from: L2[0].id, to: L2[1].id, amount: 1e5, reason: "eff", why: "ทดสอบ" };
        act("alTr", D.alTr.create.run(tf), "wd"); const tr = D.alTr.create.run(tf); as(TR_TYPE[trTy(tr)][1] === "fin" ? "fin" : "exec"); act("alTr", tr, "ok"); if (tr.status === "bb") { as("plan"); act("alTr", tr, "bbok"); }
        if (tr.status !== "approved") errs.push(`${org}/E2E: transfer ended ${tr.status}`); ALLOC_TAB = "transfers"; see("allocation", "E-12");
        // E-13 / E-14 the clock moves to March; monitoring, progress and quarterly reports read it
        S.asOf = FY_MONTH_ENDS()[5]; TODAY = S.asOf; simDisb(5); as("div"); MON_TAB = "progress"; see("dashboard", "E-13"); PERF_TAB = "quarter"; see("performance", "E-14");
        // E-15 September: a carry-over request is filed and approved
        S.asOf = FY_MONTH_ENDS()[11]; TODAY = S.asOf; simDisb(11); as("fin"); ALLOC_TAB = "carry";
        const cl = A.lines.find(l => !l.cancelled && (l.type === "inv" || l.type === "ope") && l.amount > 2e5);
        const cf = D.alCf.create.run({ line: cl.id, amount: 1e5, po: "PO-TEST-1", poDate: TODAY, vendor: "" }); as("exec"); act("alCf", cf, "ok"); if (cf.status !== "approved") errs.push(`${org}/E2E: carry-over ended ${cf.status}`); see("allocation", "E-15");
        // E-16 a recommendation becomes next year's idea
        as("plan"); const rc = (S.recs || [])[0]; if (rc) { rc.status = "doing"; PERF_TAB = "recs"; see("performance", "E-16"); const b = document.querySelector(`[data-recidea="${rc.id}"]`); if (b) b.click(); if (!rc.idea) errs.push(`${org}/E2E: the recommendation didn't become an idea`); }
        S.asOf = null; TODAY = REAL_TODAY; ALLOC_FY = CUR_FY; crClose();
      });
      // Round C3 walk: a batch through the Budget Bureau, the bill through parliament, the act into allocation; every drawer on the way
      if (o.suites.includes("render") && typeof CRUD !== "undefined" && CRUD.defs.sbBatch && o.roles.includes("plan")) safe(`${org}/C3 walk`, () => {
        ROLE = "plan"; LANG = o.langs[0]; renderShell(); S.submission.minister = { no: "TEST", date: TODAY, by: me().id };
        const B = CRUD.defs.sbBatch, act = (sp, r, id, why) => { crOpen(Object.keys(CRUD.defs).find(k => CRUD.defs[k] === sp), sp.id(r)); const a = sp.acts(r).find(x => x && x.id === id); if (!a) { errs.push(`${org}/C3: no action ${id}`); return; } a.run(r, why || "ทดสอบเหตุผลยาวพอ"); };
        const v = {}; sbReady().filter(r => !sbBlocked(r)).forEach(r => (v["in_" + r.id] = true));
        if (!Object.keys(v).length) return;
        const b = B.create.run(v); act(B, b, "send"); act(B, b, "recv");
        const res = {}; sbReqs(b).forEach(r => (res["res_" + r.id] = sbSim(r))); B.edit.run(b, res);
        const rv = CRUD.defs.sbRev.create.run({ req: sbReqs(b)[0].id, due: addDays(TODAY, 7), issue: "ทดสอบ" });
        SUB_TAB = "status"; for (const [k, r] of [["sbBatch", b], ["sbRev", rv]]) { crOpen(k, CRUD.defs[k].id(r)); go2("submission"); chk(`${org}/C3/${k}`); }
        act(CRUD.defs.sbRev, rv, "reply", "ตอบแล้ว"); act(B, b, "close");
        if (b.status !== "closed") errs.push(`${org}/C3: batch not closed (${b.status})`);
        SUB_TAB = "parliament";
        while (S.parl.stage < PL_CUT) { S.parl.stage++; } if (!S.parl.items) S.parl.items = parlItems().map(x => Object.assign({}, x));
        const it = parlItems()[0]; if (!it) return;
        const c = CRUD.defs.plCut.create.run({ item: it.id, amt: Math.max(0.1, Math.round(it.amt * 0.1 * 10) / 10), why: "ทดสอบ" }); S.parl.stage = PL_APPEAL;
        const a = CRUD.defs.plApp.create.run({ item: it.id, amt: c.amt, why: "ทดสอบ" }); S.parl.stage = PL_APPEAL + 1; CRUD.defs.plApp.edit.run(a, { amt: c.amt, why: "ทดสอบ", granted: c.amt / 2 });
        for (const [k, r] of [["plCut", c], ["plApp", a]]) { crOpen(k, r.id); go2("submission"); chk(`${org}/C3/${k}`); if (CRUD.defs[k].edit.can(r)) { CR_OPEN.mode = "edit"; go2("submission"); chk(`${org}/C3/${k}/edit`); } }
        S.parl.stage = PARL_STEPS.length; crClose(); go2("submission"); chk(`${org}/C3/parliament done`);
        ROLE = "fin"; renderShell(); ALLOC_FY = 2570; ALLOC_TAB = "appropriation"; go2("allocation"); const mk = document.getElementById("mk-2571");
        if (!S.allocs[2571]) { if (!mk) errs.push(`${org}/C3: no button to create FY2571 lines`); else { mk.click(); if (!S.allocs[2571] || !S.allocs[2571].fromAct) errs.push(`${org}/C3: FY2571 lines not from the act`); } }
        ALLOC_FY = 2570; SUB_TAB = "checks"; crClose();
      });
      // Budget pages (round 47): every old tab key on the page that holds it, and the old deep links
      if (o.suites.includes("render") && typeof BUD_PAGES !== "undefined") for (const lang of o.langs) { LANG = lang; for (const role of o.roles) {
        ROLE = role; safe("shell", renderShell);
        for (const p of BUD_PAGES.filter(x => x.mod && bSees(x))) for (const t of bTabs(p)) for (const k of t.keys) safe(`${org}/${lang}/${role}/${p.code} ${t.id}/${k}`, () => {
          BUD_MOD[p.mod].set(k); go2(p.id); chk(`${org}/${lang}/${role}/${p.code} ${t.id}/${k}`);
          const on = document.querySelector("#view [data-btab].on");
          if (BUD_MOD[p.mod].get() === k && (!on || on.dataset.btab !== t.id)) errs.push(`${org}/${role}/${p.code}: key ${k} shows tab ${on && on.dataset.btab}, not ${t.id}`);
        });
        for (const [l, page] of [["alloc-carry", "allocation"], ["intel-bkpi", "insight"], ["intel-ask", "assistant"], ["perf-quarter", "performance"], ["mon-progress", "dashboard"], ["strat-bank", "strategy"], ["sub-parliament", "submission"]])
          if (allowed(page) && bSees(bPage(page))) safe(`link ${l}`, () => {
            const [a, k] = l.split("-"), p = bPage(page);
            if (!bTabOf(p, k)) return;
            const q = bOwner(p.mod, k);
            if (!q || q.id !== page) errs.push(`link ${l} belongs to ${q && q.id}, not ${page}`);
            JUMP_TABS[a][1](k); go2(page); chk(`${org}/${lang}/${role}/link ${l}`);
            if (BUD_MOD[p.mod].get() !== k) errs.push(`${org}/${role}: link ${l} opened ${BUD_MOD[p.mod].get()}`);
          });
        await tick();
      } }
      // Finance F9 sub-pages and every finance agent run
      if (o.suites.includes("agents") && typeof F_AG !== "undefined") {
        LANG = "en"; ROLE = "finhead"; renderShell();
        for (const id of Object.keys(F_AG)) safe(`fagent ${org}/${id}`, () => { fStart(id); FIN_TAB = "ai"; FAI_TAB = "agents"; go2("finance"); chk(`fagent ${org}/${id}`); });
        for (const ft of ["fc", "wi", "kpi"]) safe(`fai ${org}/${ft}`, () => { FIN_TAB = "ai"; FAI_TAB = ft; go2("finance"); chk(`fai ${org}/${ft}`); });
        S.fRuns = []; FAI_TAB = "agents"; report(`finance agents ${org}`); await tick();
      }
      if (o.suites.includes("chat") && typeof cwAnswer === "function") for (const role of ["plan", "proc", "fin", "exec"].filter(r => o.roles.includes(r))) {
        ROLE = role;
        for (const a of cwAgents()) for (const q of QS) safe(`chat ${org}/${role}/${a.id}/${q}`, () => { const r = cwAnswer(a.id, q, [], []), d = document.createElement("div"); d.innerHTML = r.html; n++; const m = d.innerText.match(BAD); if (m) errs.push(`chat ${org}/${role}/${a.id}/${q}: ${d.innerText.slice(Math.max(0, m.index - 40), m.index + 20)}`); });
        report(`chat ${org}/${role}`); await tick();
      }
      if (o.suites.includes("agents") && typeof B_AG !== "undefined") {
        LANG = "en"; ROLE = "plan"; renderShell();
        for (const id of Object.keys(B_AG)) safe(`agent ${org}/${id}`, () => { const r = bStart(id, id === "AG-15" ? { to: (S.allocs[2570] && S.allocs[2570].lines.slice(-1)[0] || {}).id, need: 1e6 } : {}); INTEL_TAB = "bagents"; B_RUN_OPEN = r.id; go2("assistant"); chk(`agent ${org}/${id}`); });
        S.bRuns = []; report(`agents ${org}`); await tick();
      }
    }
    if (o.suites.includes("demo") && typeof DEMO !== "undefined") {
      ORG = "sample"; S = SEEDS.sample.seed(); LANG = "en";
      ROLE = "plan"; renderShell(); await new Promise(r => setTimeout(r, 60));
      const openGuide = () => { window.FISKO_ROUTE = "#demo"; route(); window.FISKO_ROUTE = null; };
      for (let i = 0; i < DEMO.length; i++) {
        // a step's click changes the hash; let the change fire, then open the guide again
        await new Promise(r => setTimeout(r, 20)); openGuide();
        safe(`demo ${i + 1}`, () => { const b = document.querySelector(`#view [data-step="${i}"]`); if (!b) throw new Error(`no step button (page: ${CUR})`); b.click(); });
        await new Promise(r => setTimeout(r, 30));
        const v = document.getElementById("view").innerText; n++; if (!v.trim()) errs.push(`demo ${i + 1}: empty page`); else { const m = v.match(BAD); if (m) errs.push(`demo ${i + 1}: ${v.slice(Math.max(0, m.index - 40), m.index + 20)}`); }
      }
      report("demo");
    }
    window.onerror = oldErr; window.FISKO_ROUTE = null;
    Object.keys(SEEDS).forEach(org => { ORG = org; store.del(key()); });
    ORG = "sample"; S = SEEDS.sample.seed(); LANG = "th"; ROLE = "plan"; renderShell(); history.replaceState(null, "", "#home"); route();
    return { ok: errs.length === 0, checks: n, errors: errs, seconds: Math.round((performance.now() - t0) / 100) / 10 };
  }
  window.FISKO_TEST = { run, version: 1 };
})();
