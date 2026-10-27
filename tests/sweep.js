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
      // Finance CRUD round FC3: GFMIS files and e-Payment batches on the shared list, the daily check, then a payment walk
      if (o.suites.includes("render") && CRUD.defs && CRUD.defs.fnGfo) {
        for (const role of ["fin", "finhead", "exec", "audit"].filter(r => o.roles.includes(r))) {
          ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
          for (const k of ["fnGfo", "fnEp"]) {
            const sp = CRUD.defs[k], open = (id, mode, t) => safe(`${org}/${role}/${k}/${id || "new"}/${mode}${t ? "/" + t : ""}`, () => { finSet("pay:gfmis"); VC_OPEN = null; crOpen(k, id, mode); if (t) CR_OPEN.tab = t; go2("finance"); chk(`${org}/${role}/${k}/${id || "new"}/${mode}${t || ""}`); if (!document.querySelector(".cr-drawer")) errs.push(`${org}/${role}/${k}/${id}: no drawer`); });
            for (const r of sp.list() || []) { const id = sp.id(r); open(id, "view"); open(id, "view", "hist"); for (const [t] of sp.tabs ? sp.tabs(r) : []) open(id, "view", t); if (sp.edit.can(r)) open(id, "edit"); }
            if (sp.create.can()) open("", "edit");
          }
          if (role === "finhead" || role === "audit") safe(`${org}/${role}/daycheck`, () => { crClose(); finSet("pay:check"); go2("finance"); chk(`${org}/${role}/daycheck`); });
          crClose(); await tick();
        }
        if (["fin", "finhead", "exec"].every(r => o.roles.includes(r))) { const keep = JSON.stringify(S); safe(`${org}/FC3 walk`, () => {
          const as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); }, E = m => errs.push(`${org}/FC3: ${m}`), G = CRUD.defs.fnGfo, P = CRUD.defs.fnEp;
          const line = famLines().find(l => (l.type === "ope" || l.type === "inv") && famHeadroom(l.id) > 200000);
          if (!line) { E("no allocation line with room"); return; }
          // three vouchers to "ready": two utilities paid straight to the payee, one compensation paid through the agency account
          const mk = (o2, ev) => { as("fin"); const v = vcSave(Object.assign({ type: "utility", commit: "", nb: "", line: line.id, desc: "ทดสอบการจ่าย", vendor: "", payee: "ผู้รับทดสอบ", kind: "gov", tax: "", gross: 20000, vat: false, contrib: false, due: addDays(TODAY, 5), method: "epay", mwhy: "" }, o2)).v;
            v.ev = ev; vcAct(v, "submit"); as("finhead"); vcAct(v, "checked"); as("exec"); vcAct(v, "approve"); if (v.state !== "ready") E(`${v.id} did not reach ready (${v.state})`); return v; };
          const va = mk({}, { bill: true }), vb = mk({ gross: 15000 }, { bill: true }), vc = mk({ type: "comp", payee: "นายทดสอบ", kind: "person", gross: 9000 }, { order: true, sign: true });
          as("fin");
          if (!G.check({}, null).length) E("a file with no vouchers passed the check");
          const f = G.create.run({ ["v_" + va.id]: true, ["v_" + vb.id]: true, ["v_" + vc.id]: true });
          if (!f || va.gfFile !== f.id) { E("file not made"); return; }
          crOpen("fnGfo", f.id); const rm = G.acts(f).find(a => a.id === "rm_" + vb.id); rm.run(f, "ยังไม่ถึงกำหนดจ่าย ส่งรอบหน้า");
          if (vb.gfFile || f.rows.includes(vb.id)) E("take out of a file");
          G.acts(f).find(a => a.id === "sim").run(f); if (CR_OPEN.mode !== "edit" || CR_OPEN.draft["r_" + va.id] !== "ok") E("simulate posting");
          if (!G.check({ ["r_" + va.id]: "fail", ["w_" + va.id]: "" }, f).length) E("a failed row without a reason passed");
          G.edit.run(f, CR_OPEN.draft); if (va.state !== "posted" || vc.state !== "posted" || gfoSt(f) !== "posted") E(`posting gave ${va.state}/${vc.state}/${gfoSt(f)}`);
          G.edit.run(f, { ["r_" + va.id]: "paid", ["d_" + va.id]: "CGD-TEST-1", ["r_" + vc.id]: "funded", ["d_" + vc.id]: "" });
          if (va.state !== "paid" || !vc.funded || gfoSt(f) !== "done") E(`payment result gave ${va.state}/${!!vc.funded}/${gfoSt(f)}`);
          crClose(); finSet("pay:gfmis"); crOpen("fnGfo", f.id); go2("finance"); chk(`${org}/FC3/file`);
          // a second file, cancelled
          const f2 = G.create.run({ ["v_" + vb.id]: true }); crOpen("fnGfo", f2.id); G.acts(f2).find(a => a.id === "cancel").run(f2, "แก้ไขข้อมูลผู้รับก่อนส่ง"); if (vb.gfFile || f2.state !== "cancelled") E("cancel a file");
          // e-Payment: a batch, the bank returns nothing; a second batch cancelled
          if (!epReady().includes(vc)) E("funded voucher not ready for e-Payment");
          const b = P.create.run({ ["v_" + vc.id]: true }); if (vc.epay !== b.id || epReady().includes(vc)) E("batch");
          crOpen("fnEp", b.id); P.acts(b).find(a => a.id === "sim").run(b); P.edit.run(b, CR_OPEN.draft); if (vc.state !== "paid" || epSt(b) !== "done") E(`bank result gave ${vc.state}/${epSt(b)}`);
          crClose();
          // daily check: one noted, one signed
          as("finhead"); const today = dckToday();
          if (today.length >= 2) { if (!dckSign(today.slice(1).map(v => v.id)) || today[1].dayCheck) E("signed with an unticked payment that has no note");
            dckFlag(today[0], "ใบสำคัญไม่ครบ"); const err = dckSign(today.slice(1).map(v => v.id)); if (err) E(`sign: ${err}`); if (today[0].dayCheck || !today[1].dayCheck) E("daily check per voucher"); }
          if (!dckSign([])) E("signing nothing went through");
          finSet("pay:check"); go2("finance"); chk(`${org}/FC3/daycheck`);
          // money paid back and a reissued certificate
          as("fin"); const before = famHeadroom(line.id);
          const err = vcRefund(va, 5000, "ผู้รับแจ้งได้รับเงินเกิน"); if (err) E(`refund: ${err}`);
          else { if (va.refunded !== 5000 || !(S.receipts || []).some(r => r.voucher === va.id && r.kind === "refund")) E("refund receipt"); if (va.refunds[0].inYear && famHeadroom(line.id) !== before + 5000) E(`refund did not give the line back (${famHeadroom(line.id) - before})`); }
          if (!vcRefund(va, 1e9, "เกินยอดที่จ่าย")) E("refund above the net went through");
          const wv = (S.vouchers || []).find(v => v.cert);
          if (wv) { const no = wv.cert.no; vcReissue(wv, "ชื่อผู้รับเงินผิด"); if (wv.cert.no === no || wv.certs[0].no !== no) E("reissue"); }
          VC_OPEN = va.id; finSet("pay:vouchers"); go2("finance"); chk(`${org}/FC3/refund`);
        }); S = JSON.parse(keep); crClose(); VC_OPEN = null; FIN_ASK = null; ROLE = "fin"; await tick(); }
      }
      // Finance CRUD round FC4: commitments on the shared list, PO correction, carry-over withdrawal, advance forms, then a walk
      if (o.suites.includes("render") && CRUD.defs && CRUD.defs.fnCm) {
        for (const role of ["fin", "finhead", "exec", "audit"].filter(r => o.roles.includes(r))) {
          ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
          const sp = CRUD.defs.fnCm, open = (id, mode, t) => safe(`${org}/${role}/fnCm/${id || "new"}/${mode}${t ? "/" + t : ""}`, () => { finSet("chain:other"); crOpen("fnCm", id, mode); if (t) CR_OPEN.tab = t; go2("finance"); chk(`${org}/${role}/fnCm/${id || "new"}/${mode}${t || ""}`); if (!document.querySelector(".cr-drawer")) errs.push(`${org}/${role}/fnCm/${id}: no drawer`); });
          for (const r of sp.list() || []) { open(r.id, "view"); open(r.id, "view", "hist"); if (sp.edit.can(r)) open(r.id, "edit"); for (const a of sp.acts(r)) safe(`${org}/${role}/fnCm/${r.id}/ask ${a.id}`, () => { finSet("chain:other"); crOpen("fnCm", r.id); CR_OPEN.ask = a.id; go2("finance"); chk(`${org}/${role}/fnCm/${r.id}/ask ${a.id}`); }); }
          if (sp.create.can()) open("", "edit");
          crClose();
          if (role === "fin") {
            for (const x of finCommits().filter(x => x.gfPo && !poLocked(x))) safe(`${org}/fin/po ${x.id}`, () => { finSet("chain:po"); FIN_ROW = `poe:${x.id}`; go2("finance"); chk(`${org}/fin/po ${x.id}`); });
            safe(`${org}/fin/adv new`, () => { finSet("adv"); ADV_OPEN = null; ADV_EDIT = "new"; go2("finance"); chk(`${org}/fin/adv new`); if (!document.querySelector("#adv-form #af-who")) errs.push(`${org}/fin: no on-behalf advance form`); });
            safe(`${org}/fin/adv list`, () => { ADV_EDIT = null; Object.assign(ADV_Q, { q: "AD", sort: 1 }); finSet("adv"); go2("finance"); chk(`${org}/fin/adv list`); Object.assign(ADV_Q, { q: "", unit: "", sort: null }); });
            FIN_ROW = null; ADV_EDIT = null;
          }
          await tick();
        }
        if (["fin", "finhead", "exec", "div"].every(r => o.roles.includes(r))) { const keep = JSON.stringify(S); safe(`${org}/FC4 walk`, () => {
          const as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); }, E = m => errs.push(`${org}/FC4: ${m}`), C = CRUD.defs.fnCm, act = (c, id, why, n) => { const a = C.acts(c).find(x => x.id === id); if (!a) { E(`no action ${id}`); return; } return a.run(c, why, n); };
          const line = famLines().find(l => l.type === "ope" && famHeadroom(l.id) > 300000);
          if (!line) { E("no line with room"); return; }
          as("fin");
          const base = { kind: "utility", th: "ค่าน้ำประปาทดสอบ", en: "Test water", vendor: "การประปาทดสอบ", line: line.id, amount: 50000, due: FY_END };
          if (!C.check(Object.assign({}, base, { amount: 1e13 }), null).length) E("a commitment above the line passed");
          const c = C.create.run(base); C.edit.run(c, Object.assign({}, base, { amount: 60000 }), ""); if (c.amount !== 60000) E("edit amount");
          const v = vcSave({ type: "utility", commit: c.id, nb: "", line: "", desc: "ค่าน้ำทดสอบ", vendor: "", payee: "การประปาทดสอบ", kind: "gov", tax: "", gross: 20000, vat: false, contrib: false, due: addDays(TODAY, 5), method: "epay", mwhy: "" }).v;
          v.ev = { bill: true }; vcAct(v, "submit");
          if (!C.fields(c, {}).find(f => f.id === "amount").lock || !C.edit.why(c)) E("amount not locked once a voucher uses it");
          act(c, "rel", "ปรับลดตามประมาณการใหม่", 10000); if (c.released !== 10000) E(`release gave ${c.released}`);
          if (C.acts(c).find(x => x.id === "rel").num.max !== 30000) E(`release max ${C.acts(c).find(x => x.id === "rel").num.max}`);
          act(c, "off", "ไม่ใช้บริการต่อแล้ว"); if (c.cancelled) E("cancelled while a voucher holds part of it (R-FC-04)");
          const c2 = C.create.run(Object.assign({}, base, { amount: 1000 })); act(c2, "del", "บันทึกซ้ำโดยไม่ตั้งใจ"); if (S.fcommit.includes(c2)) E("delete");
          const c3 = C.create.run(Object.assign({}, base, { amount: 1000 })); if (c3.id === c2.id) E("a deleted number was reused");
          finSet("chain:other"); crOpen("fnCm", c.id); go2("finance"); chk(`${org}/FC4/commitment`); crClose();
          // a saved PO corrected, then cleared
          const px = finCommits().find(x => x.gfPo && !poLocked(x));
          if (px) { finSet("chain:po"); FIN_ROW = `poe:${px.id}`; go2("finance"); $("#poe-" + px.id).value = "7999999991"; $("#pow-" + px.id).value = "พิมพ์เลขผิดหนึ่งหลัก"; document.querySelector(`[data-poedit="${px.id}"]`).click();
            if (fcRef(px.id).gfPo.no !== "7999999991") E("PO correction"); FIN_ROW = `poe:${px.id}`; route(); $("#pow-" + px.id).value = "PO ถูกยกเลิกใน GFMIS"; document.querySelector(`[data-poclr="${px.id}"]`).click(); if (fcRef(px.id).gfPo) E("PO clear"); }
          // carry-over: propose, then withdraw
          const cx = carryCands().find(x => !carrySent(x.id));
          if (cx) { finSet("chain:carry"); FIN_ROW = null; go2("finance"); const b = document.querySelector(`[data-fncf="${cx.id}"]`); if (b) { b.click(); if (!carrySent(cx.id)) E("carry proposal"); else { FIN_ROW = `cfw:${cx.id}`; route(); $("#cfw-" + cx.id).value = "ผู้ขายส่งงานครบก่อนสิ้นปีแล้ว"; document.querySelector(`[data-cfwd="${cx.id}"]`).click(); if (carrySent(cx.id)) E("carry withdraw"); } } }
          FIN_ROW = null;
          // advances: edit, cancel after approval, Finance entering one, SD-12 at payment, taking a clearing back
          const borrower = S.users.find(u => u.role === "div" && u.primary);
          const finId = S.users.find(u => u.role === "fin" && u.primary).id;
          (S.advances || []).filter(a => [borrower.id, finId].includes(a.borrower) && OPEN_ADV.includes(a.state)).forEach(a => { a.clearing = a.clearing || { t: nowIso(), spent: advAmt(a), note: "", receipts: true }; a.state = "cleared"; }); // a clean start for clause 59
          const av = { who: null, type: "travel", purpose: "ประชุมทดสอบ", start: addDays(TODAY, 10), end: addDays(TODAY, 11), src: "budget", nb: "", line: line.id, items: [{ k: "perdiem", amt: 480 }, { k: "hotel", amt: 1500 }, { k: "transport", amt: 800 }], temp: false, coll: "" };
          as("div"); if (typeof advSave(Object.assign({}, av, { items: [] })) !== "string") E("an advance with no items passed");
          const a1 = advSave(av); advSave(Object.assign({}, av, { items: av.items.slice(0, 2) }), a1); if (a1.amount !== 1980) E(`advance edit gave ${a1.amount}`);
          ADV_EDIT = a1.id; go2("advances"); chk(`${org}/FC4/advance edit`); if (!document.querySelector('#adv-form[data-edit]') || document.querySelector("#adv-form").dataset.edit !== a1.id) E("no edit form on My advances"); ADV_EDIT = null;
          as("exec"); advAct(a1, "approve", ""); if (a1.state !== "approved") E(`approve gave ${a1.state}`);
          as("div"); if (!advAct(a1, "cancel", "สั้น")) E("cancel without a reason"); advAct(a1, "cancel", "ยกเลิกการประชุมแล้ว"); if (a1.state !== "cancelled") E("cancel after approval");
          as("fin"); const a2 = advSave(Object.assign({}, av, { who: borrower.id })); if (a2.borrower !== borrower.id || a2.enteredBy !== me().id) E("entered for someone");
          as("exec"); advAct(a2, "approve", ""); as("fin"); advAct(a2, "pay"); if (a2.state !== "paid") E(`pay gave ${a2.state}`);
          if (!finClocks().some(k => k.title.includes(a2.id)) ) E("no clock for the paid advance");
          a2.clearing = { t: nowIso(), spent: 1980, note: "", receipts: true }; a2.clearFrom = "paid"; a2.state = "clearing";
          as("div"); advAct(a2, "crecall", "แนบใบเสร็จผิดฉบับ"); if (a2.state !== "paid") E("clearing taken back");
          as("fin"); const a3 = advSave(Object.assign({}, av, { purpose: "ทดสอบผู้ยืมจ่ายเอง" }));
          as("exec"); advAct(a3, "approve", ""); if (!finClocks().some(k => k.title.includes(a3.id))) E("no clock for an approved advance");
          as("fin"); advAct(a3, "pay"); if (a3.state !== "approved") E("SD-12 let the borrower pay themselves");
          finSet("adv"); ADV_OPEN = a2.id; go2("finance"); chk(`${org}/FC4/advance`); ADV_OPEN = null;
          finSet("close:year"); go2("finance"); chk(`${org}/FC4/yearend`);
        }); S = JSON.parse(keep); crClose(); FIN_ROW = null; ADV_OPEN = null; ADV_EDIT = null; ROLE = "fin"; await tick(); }
      }
      // Finance CRUD round FC5: receipts, remittances and audit queries on the shared list, then a walk through cash, bank and closing
      if (o.suites.includes("render") && CRUD.defs && CRUD.defs.fnRc) {
        const where = { fnRc: "recv:receipts", fnRm: "recv:remit", fnAq: "close:audit" };
        for (const role of ["fin", "finhead", "exec", "audit"].filter(r => o.roles.includes(r))) {
          ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
          for (const [k, tab] of Object.entries(where)) {
            const sp = CRUD.defs[k], open = (id, mode, t, ask) => safe(`${org}/${role}/${k}/${id || "new"}/${mode}${t ? "/" + t : ""}${ask ? "/" + ask : ""}`, () => { finSet(tab); crOpen(k, id, mode); if (t) CR_OPEN.tab = t; if (ask) CR_OPEN.ask = ask; go2("finance"); chk(`${org}/${role}/${k}/${id || "new"}/${mode}${t || ""}${ask || ""}`); if (!document.querySelector(".cr-drawer")) errs.push(`${org}/${role}/${k}/${id}: no drawer`); });
            for (const r of sp.list() || []) { const id = sp.id(r); open(id, "view"); open(id, "view", "hist"); if (sp.edit && sp.edit.can(r)) open(id, "edit"); for (const a of sp.acts ? sp.acts(r) : []) if (a.why || a.num || a.confirm) open(id, "view", null, a.id); }
            if (sp.create.can()) open("", "edit");
          }
          for (const t of ["cash", "recon:bank", "close:day"]) safe(`${org}/${role}/${t}`, () => { crClose(); finSet(t); go2("finance"); chk(`${org}/${role}/${t}`); });
          crClose(); await tick();
        }
        if (["fin", "finhead", "exec"].every(r => o.roles.includes(r))) { const keep = JSON.stringify(S); safe(`${org}/FC5 walk`, () => {
          const as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); }, E = m => errs.push(`${org}/FC5: ${m}`), D = CRUD.defs;
          const act = (k, r, id, why, n) => { const a = (D[k].acts(r) || []).find(x => x && x.id === id); if (!a) { E(`no action ${k}/${id} for ${ROLE}`); return; } return a.run(r, why, n); };
          // receipts: issue, record in GFMIS, cancel and reissue (the new form stays open), cancel
          as("fin"); finSet("recv:receipts");
          if (!D.fnRc.check({ kind: "revenue", amount: 0 }).length) E("a zero receipt passed");
          const r1 = D.fnRc.create.run({ kind: "revenue", payer: "ผู้ชำระทดสอบ", desc: "ค่าขายเอกสารทดสอบ", amount: 500, method: "cash" });
          if (!r1) { E("receipt not issued"); return; }
          act("fnRc", r1, "rec", "", 3600099901); if (!r1.recorded || r1.recorded.doc !== "3600099901") E("record in GFMIS");
          const r2 = D.fnRc.create.run({ kind: "revenue", payer: "ผู้ชำระผิดชื่อ", desc: "ค่าปรับทดสอบ", amount: 300, method: "cash" });
          crOpen("fnRc", r2.id); act("fnRc", r2, "re", "ชื่อผู้ชำระสะกดผิด");
          if (!r2.cancelled || !CR_OPEN || CR_OPEN.id !== "" || (RC_DRAFT || {}).replaces !== rcNo(r2)) E("cancel and reissue did not open the new form");
          go2("finance"); chk(`${org}/FC5/reissue form`);
          const r3 = D.fnRc.create.run({ kind: "revenue", payer: "ผู้ชำระถูกชื่อ", desc: "ค่าปรับทดสอบ", amount: 300, method: "cash" }); if (!r3 || r3.replaces !== rcNo(r2)) E("reissued receipt");
          crClose();
          // remittance: pick receipts of one type, correct the reference, reverse, remit again
          act("fnRc", r3, "rec", "", 3600099902);
          if (!D.fnRm.check({ cls: "revenue" }, null).length) E("a remittance with no receipts passed");
          const m1 = D.fnRm.create.run({ cls: "revenue", ["r_" + r1.id]: true, ["r_" + r3.id]: true, ref: "KTB-TEST-1" });
          if (!m1 || r1.remit !== m1.id) { E("remittance"); return; }
          D.fnRm.edit.run(m1, { ref: "KTB-TEST-2", date: TODAY }, "พิมพ์เลขอ้างอิงผิด"); if (m1.ref !== "KTB-TEST-2") E("remittance correction");
          act("fnRm", m1, "rev", "ธนาคารแจ้งยอดไม่ครบ"); if (r1.remit || !m1.reversed) E("reverse");
          const m2 = D.fnRm.create.run({ cls: "revenue", ["r_" + r1.id]: true, ref: "KTB-TEST-3" }); if (r1.remit !== m2.id || m2.id === m1.id) E("remit again");
          // daily cash: a recount keeps the earlier count
          const dc = (S.dailyCash = S.dailyCash || []); let today = dcOf(TODAY);
          if (!today) { today = { date: TODAY, by: me().id, t: nowIso(), sys: dcSys(TODAY), counts: {}, status: "diff", ack: null }; dc.push(today); }
          today.status = "diff"; today.ack = null; today.counts = { x: { cash: 1, cheque: 0, t: nowIso() } };
          as("finhead"); finSet("cash"); go2("finance"); document.querySelector('[data-frow="dcre"]').click(); $("#dcre-why").value = "ยอดเงินสดไม่ตรงกับรายงาน";
          $("#dc-recount").click(); if (today.status !== "counting" || !(today.recounts || []).length || Object.keys(today.counts).length) E("recount");
          // bank: delete an import, reverse an adjustment, reopen a signed reconciliation (someone else)
          as("fin"); const mo = curMonth(); BK_MONTH = mo; (S.periods = S.periods || []).filter(p => p.month === mo).forEach(p => (p.status = "open")); BK_ACCT = "budget"; finSet("recon:bank"); go2("finance");
          if (!stmtOf("budget", mo) && $("#bk-imp")) $("#bk-imp").click();
          const st = stmtOf("budget", mo);
          if (st) {
            const only = bkMatch("budget", mo).bankOnly[0];
            if (only) { const b = document.querySelector(`[data-bkadj="${only.ref}"]`); if (b) b.click(); FIN_ROW = `bku:${only.ref}`; route(); $("#bku-why").value = "บันทึกซ้ำกับรายการเดิม"; document.querySelector(`[data-bkunadj="${only.ref}"]`).click(); if ((S.bookAdj || []).some(a => a.ref === only.ref)) E("adjustment not reversed"); }
            FIN_ROW = "bkdel"; route(); $("#bkdel-why").value = "นำเข้าไฟล์ผิดเดือน"; $("#bk-del").click(); if (stmtOf("budget", mo)) E("import not deleted");
            route(); if ($("#bk-imp")) $("#bk-imp").click(); if (!stmtOf("budget", mo)) E("import again after deleting");
            S.bankRecs = (S.bankRecs || []).filter(x => !(x.acct === "budget" && x.month === mo)); S.bankRecs.push({ acct: "budget", month: mo, status: "signed", by: S.users.find(u => u.role === "finhead" && u.primary).id, t: nowIso(), diff: 0 });
            as("finhead"); finSet("recon:bank"); FIN_ROW = "bkre"; go2("finance"); $("#bkre-why").value = "ต้องแก้รายการระหว่างทาง"; $("#bk-reopen").click(); if (recOf("budget", mo).status !== "signed") E("SD-16 let the signer reopen");
            recOf("budget", mo).by = "someone-else"; FIN_ROW = "bkre"; route(); $("#bkre-why").value = "ต้องแก้รายการระหว่างทาง"; $("#bk-reopen").click(); if (recOf("budget", mo).status !== "reopened") E("reopen the reconciliation");
          }
          // a closed day reopens (not by whoever closed it)
          as("finhead"); (S.dayCloses = S.dayCloses || []).push({ date: TODAY, by: me().id, t: nowIso(), why: "" });
          (S.periods = S.periods || []).filter(p => p.month === TODAY.slice(0, 7)).forEach(p => (p.status = "open"));
          finSet("close:day"); FIN_ROW = "dclre"; go2("finance"); $("#dclre-why").value = "ลืมบันทึกใบเสร็จหนึ่งใบ"; $("#dcl-reopen").click(); if (!(S.dayCloses || []).some(x => x.date === TODAY)) E("SD-16 let the closer reopen the day");
          as("exec"); FIN_ROW = "dclre"; route(); $("#dclre-why").value = "ลืมบันทึกใบเสร็จหนึ่งใบ"; $("#dcl-reopen").click(); if ((S.dayCloses || []).some(x => x.date === TODAY)) E("day not reopened");
          // audit queries: draft, send, add more; delete one entered by mistake
          as("finhead"); const q = D.fnAq.create.run({ from: "สตง.", th: "ทดสอบการจ่ายเงินยืม", date: TODAY }); if (q.due !== addDays(TODAY, fcfg().aqDays)) E("audit clock from M10");
          D.fnAq.edit.run(q, { from: "สตง.", th: q.subject[0], date: TODAY, draft: "ร่างคำชี้แจงสำหรับการทดสอบ" });
          act("fnAq", q, "send"); if (!q.answer || q.draft) E("send the answer"); if (D.fnAq.edit.can(q)) E("an answered query can still be edited");
          act("fnAq", q, "more", "ส่งเอกสารเพิ่มเติมตามที่ขอ"); if (!(q.more || []).length) E("further explanation");
          const q2 = D.fnAq.create.run({ from: "สตง.", th: "บันทึกผิด", date: TODAY }); act("fnAq", q2, "del", "บันทึกซ้ำกับข้อเดิม"); if (!q2.deleted) E("delete a query");
          finSet("close:audit"); crOpen("fnAq", q.id); go2("finance"); chk(`${org}/FC5/audit query`); crClose();
        }); S = JSON.parse(keep); crClose(); FIN_ROW = null; RC_DRAFT = null; BK_MONTH = null; ROLE = "fin"; await tick(); }
      }
      // Finance CRUD round FC6: F11 funds, plans and withdrawals and F9 what-ifs on the shared list; F9 reason boxes; then a walk
      if (o.suites.includes("render") && CRUD.defs && CRUD.defs.fnFund) {
        const where = { fnFund: "nb:funds", fnPlan: "nb:plans", fnWd: "nb:wd", fnWi: "ai:wi" };
        for (const role of ["fin", "finhead", "exec", "plan", "audit"].filter(r => o.roles.includes(r))) {
          ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
          for (const [k, tab] of Object.entries(where)) {
            const sp = CRUD.defs[k], open = (id, mode, t, ask) => safe(`${org}/${role}/${k}/${id || "new"}/${mode}${t ? "/" + t : ""}${ask ? "/" + ask : ""}`, () => { finSet(tab); crOpen(k, id, mode); if (t) CR_OPEN.tab = t; if (ask) CR_OPEN.ask = ask; go2("finance"); chk(`${org}/${role}/${k}/${id || "new"}/${mode}${t || ""}${ask || ""}`); if (CUR === "finance" && FIN_TAB === tab.split(":")[0] && !document.querySelector(".cr-drawer")) errs.push(`${org}/${role}/${k}/${id}: no drawer`); });
            if (!finSees(finPage(tab.split(":")[0]))) continue;
            for (const r of sp.list() || []) { const id = sp.id(r); open(id, "view"); open(id, "view", "hist"); for (const [t] of sp.tabs ? sp.tabs(r) : []) open(id, "view", t); if (sp.edit && sp.edit.can(r)) open(id, "edit"); for (const a of sp.acts ? sp.acts(r) : []) if (a.why || a.num || a.confirm) open(id, "view", null, a.id); }
            if (sp.create.can()) open("", "edit");
          }
          crClose();
          if (finSees(finPage("ai"))) for (const [key, act] of [["frun", "no"], ["frun", "stop"]]) safe(`${org}/${role}/ask ${key} ${act}`, () => { FIN_ASK = { key, act }; finSet("ai:agents"); go2("finance"); chk(`${org}/${role}/ask ${key} ${act}`); });
          const g = typeof fSignals === "function" ? fSignals()[0] : null;
          if (g && finSees(finPage("ai"))) safe(`${org}/${role}/ask sig`, () => { FIN_ASK = { key: "sig", act: `issue~${g.key}` }; finSet("ai:kpi"); go2("finance"); chk(`${org}/${role}/ask sig`); });
          FIN_ASK = null; await tick();
        }
        if (["fin", "finhead", "exec", "audit"].every(r => o.roles.includes(r))) { const keep = JSON.stringify(S); safe(`${org}/FC6 walk`, () => {
          const as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); }, E = m => errs.push(`${org}/FC6: ${m}`), D = CRUD.defs;
          const act = (k, r, id, why) => { const a = (D[k].acts(r) || []).find(x => x && x.id === id); if (!a) { E(`no action ${k}/${id} for ${ROLE}`); return; } return a.run(r, why); };
          // funds
          as("fin"); const f0 = D.fnFund.create.run({ th: "กองทุนบันทึกผิด", en: "", basis: "ทดสอบ", openA: 0, openT: 0 }); act("fnFund", f0, "del", "บันทึกซ้ำกับกองทุนเดิม"); if (nbFunds().includes(f0)) E("delete a fund");
          const f = D.fnFund.create.run({ th: "กองทุนทดสอบ", en: "Test fund", basis: "ระเบียบทดสอบ", openA: 5000, openT: 100000 });
          D.fnFund.edit.run(f, { th: "กองทุนทดสอบ", en: "Test fund", basis: "ระเบียบทดสอบ", openA: 6000, openT: 100000 }); if (f.openA !== 6000) E("edit the opening balance before money moves");
          // a plan: lines, submit, approve, then an amendment that leaves the approved plan in force
          const p = D.fnPlan.create.run({ fund: f.id, income: 50000 });
          D.fnPlan.edit.run(p, { income: 50000, n_new: "อบรมทดสอบ", c_new: "train", a_new: 40000 }); if (p.lines.length !== 1) E("plan line added");
          const l1 = p.lines[0].id; D.fnPlan.edit.run(p, { income: 50000, ["n_" + l1]: "อบรมทดสอบ", ["c_" + l1]: "train", ["a_" + l1]: 45000, n_new: "วัสดุทดสอบ", c_new: "ope", a_new: 10000 }); if (p.lines.length !== 2 || p.lines[0].amount !== 45000) E("plan line edit");
          act("fnPlan", p, "sub"); act("fnPlan", p, "wd", "แก้วงเงินก่อนเสนออีกครั้ง"); if (p.status !== "draft") E("withdraw a plan");
          act("fnPlan", p, "sub"); as("exec"); act("fnPlan", p, "ok"); if (p.status !== "approved") E(`approve gave ${p.status}`);
          as("fin"); act("fnPlan", p, "amend", "เพิ่มรายการอบรมรอบสอง");
          D.fnPlan.edit.run(p, Object.assign({ income: 50000, n_new: "อบรมรอบสอง", c_new: "train", a_new: 20000 }, ...p.amend.lines.map(l => ({ ["n_" + l.id]: tx(l.name), ["c_" + l.id]: l.cat, ["a_" + l.id]: l.amount }))));
          if (p.lines.length !== 2 || p.amend.lines.length !== 3 || p.status !== "approved") E("the approved plan did not stay in force during the amendment");
          act("fnPlan", p, "sub"); as("exec"); act("fnPlan", p, "ok"); if (p.lines.length !== 3 || p.amend || (p.versions || []).length !== 1) E("amendment approval");
          // withdrawals: edit, reject with a reason, approve, deposit back
          as("fin"); if (!D.fnWd.check({ fund: f.id, amount: 1e9 }, null).length) E("a withdrawal above the treasury passed");
          const w1 = D.fnWd.create.run({ fund: f.id, amount: 20000, why: "จ่ายค่าอบรม" }); D.fnWd.edit.run(w1, { amount: 25000, why: "จ่ายค่าอบรม" }); if (w1.amount !== 25000) E("edit a withdrawal");
          as("exec"); act("fnWd", w1, "no", "ยังไม่ถึงกำหนดจ่าย"); if (w1.status !== "rejected") E("reject a withdrawal");
          as("fin"); const w2 = D.fnWd.create.run({ fund: f.id, amount: 15000, why: "จ่ายค่าวัสดุ" }); as("exec"); act("fnWd", w2, "ok"); if (w2.status !== "done") E("approve a withdrawal");
          as("fin"); act("fnWd", w2, "back"); if (w2.status !== "back" || w2.backAmt !== 15000) E("deposit back");
          finSet("nb:plans"); crOpen("fnPlan", p.id); go2("finance"); chk(`${org}/FC6/plan`); crClose();
          // what-ifs
          const s = D.fnWi.create.run({ name: "ทดสอบเร่งจ่าย", lag: 3, slip: 0, target: 90, share: 80 }); D.fnWi.edit.run(s, { name: "ทดสอบเร่งจ่าย 2", lag: 2, slip: 0, target: 90, share: 80 }); if (s.w.lag !== 2) E("edit a what-if");
          crOpen("fnWi", s.id); act("fnWi", s, "open"); if (!FWI || FWI.lag !== 2) E("open a what-if"); act("fnWi", s, "del"); if ((S.fWhatifs || []).includes(s)) E("delete a what-if"); FWI = null;
          // agent run stopped with a reason; a signal confirmed, then reopened
          const ag = Object.keys(F_AG).find(id => F_AG[id].who.includes("fin") && agentOn(id));
          if (ag) { fStart(ag); const r = S.fRuns[S.fRuns.length - 1]; F_RUN_OPEN = r.id; if (["running", "waiting"].includes(r.status)) { FIN_ASK_RUN.frun("stop", "เริ่มงานผิดตัว"); if (r.status !== "stopped" || !r.stopped) E("stop a run"); } }
          as("audit"); const g = fSignals()[0];
          if (g) { FIN_ASK_RUN.sig(`issue~${g.key}`, "ยอดสูงผิดปกติจริง"); if (sigSt(g.key).status !== "issue") E("confirm a signal"); FIN_ASK_RUN.sig(`reopen~${g.key}`, "มีหลักฐานเพิ่ม"); if (sigSt(g.key).status !== "new") E("reopen a signal"); }
          finSet("ai:kpi"); go2("finance"); chk(`${org}/FC6/signals`);
          if (DEMO.filter(x => x.part === "fin").length !== 15) E("demo steps E-F01 to E-F15");
        }); S = JSON.parse(keep); crClose(); FIN_ASK = null; FWI = null; ROLE = "fin"; await tick(); }
      }
      // Finance CRUD leftovers (round 61F): the demand date, re-imported GFMIS reports, the payment-file undo and match, a late daily cash report
      if (o.suites.includes("render") && typeof pfCanUndo === "function" && ["fin", "finhead"].every(r => o.roles.includes(r))) { const keep = JSON.stringify(S); safe(`${org}/FC7 walk`, () => {
        const as = r => { ROLE = r; LANG = o.langs[0]; renderShell(); }, E = m => errs.push(`${org}/FC7: ${m}`);
        const why = "เหตุผลสำหรับการทดสอบ";
        (S.periods || []).forEach(p => (p.status = "open"));
        // FR-FC-25: move a demand's due date, then the demand closes when the advance is cleared
        const a = (S.advances || []).find(x => OPEN_ADV.includes(x.state) && !["fin", "finhead"].includes((S.users.find(u => u.id === x.borrower) || {}).role));
        if (a) {
          a.state = "paid"; a.demand = { t: nowIso(), by: "x", due: addDays(advDue(a), 10) };
          as("finhead"); finSet("adv"); ADV_OPEN = a.id; FIN_ASK = { key: "adv", act: "ddue" }; go2("finance"); chk(`${org}/FC7/ddue box`);
          const box = $("#adv-ddue"); if (!box) E("no demand date box"); else { box.value = addDays(advDue(a), 99); if (!advAct(a, "ddue", why)) E("a date past 30 days went through"); box.value = addDays(advDue(a), 20); if (advAct(a, "ddue", why)) E("moving the demand"); if (a.demand.due !== addDays(advDue(a), 20) || !(a.demand.moves || []).length) E("demand date not moved"); }
          FIN_ASK = null; a.clearing = { t: nowIso(), spent: advAmt(a), note: "", receipts: true }; a.state = "clearing"; as("fin"); advAct(a, "accept"); if (!a.demand.closed) E("demand not closed when cleared");
          ADV_OPEN = null;
        }
        // FR-FC-34: the trial balance and revenue report imported again
        as("fin"); BK_MONTH = curMonth(); finSet("recon:gfmis"); go2("finance");
        if ($("#tb-imp")) $("#tb-imp").click();
        if ((S.tbs || []).some(t => t.month === BK_MONTH)) { FIN_ROW = "tba"; route(); $("#tba-why").value = why; $("#tb-again").click(); if (!(S.tbsOld || []).length || !(S.tbs || []).some(t => t.month === BK_MONTH)) E("trial balance import again"); }
        if ((S.remits || []).some(r => !r.gf) && $("#gfr-imp")) { $("#gfr-imp").click(); }
        if ((S.remits || []).some(r => r.gf)) { FIN_ROW = "gfra"; route(); $("#gfra-why").value = why; $("#gfr-again").click(); if (!(S.gfrOld || []).length || (S.remits || []).some(r => !r.gf)) E("revenue report import again"); }
        // FR-FC-35: import a payment file, match the extra row by hand, edit an explanation, undo the import
        finSet("recon:payfile"); FIN_ROW = null; go2("finance"); $("#gf-sample").click(); if ($("#gf-go")) $("#gf-go").click();
        const g = (S.gfmisFiles || [])[0];
        if (g) {
          const xi = g.rows.findIndex(r => r.state === "extra"), open = S.payreqs.filter(p => p.status === "approved" && ["none", "diff"].includes(reconState(p)));
          if (xi >= 0 && open.length) { FIN_ROW = `pfm:${g.id}:${xi}`; route(); $("#pfm-why").value = why; document.querySelector(`[data-pfmatch="${g.id}:${xi}"]`).click(); if (g.rows[xi].state !== "manual") E("match by hand"); }
          const d = S.payreqs.find(p => reconState(p) === "diff");
          if (d) { FIN_ROW = "rn:" + d.id; route(); $("#rn-" + d.id).value = "ค่าธรรมเนียมโอน"; document.querySelector(`[data-rexp="${d.id}"]`).click(); FIN_ROW = "rn:" + d.id; route(); if (!$("#rn-" + d.id)) E("no edit for an explanation"); else { $("#rn-" + d.id).value = "ค่าธรรมเนียมโอนระหว่างธนาคาร"; document.querySelector(`[data-rexp="${d.id}"]`).click(); if (d.recon.note !== "ค่าธรรมเนียมโอนระหว่างธนาคาร" || !(d.recon.edits || []).length) E("edit the explanation"); } }
          if (pfCanUndo(g)) { FIN_ROW = "pfu:" + g.id; route(); $("#pfu-why").value = why; document.querySelector(`[data-pfundo="${g.id}"]`).click(); if (!g.undone || g.rows.some(r => r.pay && (S.payreqs.find(p => p.id === r.pay) || {}).recon && S.payreqs.find(p => p.id === r.pay).recon.file === g.id)) E("undo the import"); }
          else E("the latest import can't be undone");
        }
        // a late daily cash report for a missed day, counted on its own day
        finSet("cash"); FIN_ROW = null; go2("finance"); const miss = dcMissed();
        if (miss.length) { const d = miss[0]; FIN_ROW = "dcl:" + d; route(); $(`#dcl-why-${d}`).value = why; document.querySelector(`[data-dclate="${d}"]`).click(); const r = dcOf(d); if (!r || !r.late) E("late report"); else { if (dcDay() !== d) E("the late day isn't shown"); chk(`${org}/FC7/late report`); } }
        BK_MONTH = null; FIN_ROW = null; DC_D = null;
      }); S = JSON.parse(keep); FIN_ASK = null; FIN_ROW = null; ADV_OPEN = null; DC_D = null; BK_MONTH = null; ROLE = "fin"; await tick(); }
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
