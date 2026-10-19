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
  const tick = () => new Promise(r => setTimeout(r, 0));
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
      if (o.suites.includes("render") && typeof CRUD !== "undefined" && CRUD.defs.rqReq) for (const role of ["div", "divhead", "plan", "exec", "audit"].filter(r => o.roles.includes(r))) {
        ROLE = role; LANG = o.langs[0]; safe("shell", renderShell);
        const where = { rqReq: ["requests", () => {}], csCeil: ["consolidation", () => (CONS_TAB = "ceilings")], csDup: ["consolidation", () => (CONS_TAB = "overview")], rvMeet: ["review", () => (REV_TAB = "meetings")], rvHear: ["review", () => (REV_TAB = "hearings")],
          sbBatch: ["submission", () => (SUB_TAB = "status")], sbRev: ["submission", () => (SUB_TAB = "status")], plCut: ["submission", () => (SUB_TAB = "parliament")], plApp: ["submission", () => (SUB_TAB = "parliament")] };
        for (const [k, [page, set]] of Object.entries(where)) {
          if (!allowed(page)) continue;
          const sp = CRUD.defs[k], open = (id, mode, t) => safe(`${org}/${role}/${k}/${id || "new"}/${mode}${t ? "/" + t : ""}`, () => { set(); crOpen(k, id, mode); if (t) CR_OPEN.tab = t; go2(page); chk(`${org}/${role}/${k}/${id || "new"}/${mode}${t || ""}`); if (!document.querySelector(".cr-drawer")) errs.push(`${org}/${role}/${k}/${id}: no drawer`); });
          for (const r of (sp.list() || [])) { const id = sp.id(r); open(id, "view"); for (const [t] of (sp.tabs ? sp.tabs(r) : [])) open(id, "view", t); if (sp.edit && sp.edit.can(r)) open(id, "edit"); }
          if (sp.create && sp.create.can()) open("", "edit");
        }
        crClose(); CONS_TAB = "overview"; REV_TAB = "queue"; await tick();
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
