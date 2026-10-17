// Fisko Budget round B2, strategic planning (M01): the Budget Bureau's linkage from national plans to requests.
// - National layers (FR-B-01): national strategy → master plan under it → agency strategy → goal → KPI →
//   activity → request, with what was requested and decided at every node (FR-B-03).
// - Budget shares by strategy (FR-B-04): the executive sets a minimum share per agency strategy; the tree compares
//   it with what the requests add up to. Requests with no KPI link and KPIs with no request are listed.
STRAT_TABS.push({ id: "link", label: ["ความเชื่อมโยงถึงแผนชาติ", "Link to national plans"] });
const MASTER = [
  { id: "MP20", nat: "N6", name: ["แผนแม่บทฯ ประเด็นที่ 20 การบริการประชาชนและประสิทธิภาพภาครัฐ", "Master plan 20: public services and government efficiency"] },
  { id: "MP12", nat: "N3", name: ["แผนแม่บทฯ ประเด็นที่ 12 การพัฒนาการเรียนรู้", "Master plan 12: learning development"] },
  { id: "MP21", nat: "N6", name: ["แผนแม่บทฯ ประเด็นที่ 21 การต่อต้านการทุจริตและประพฤติมิชอบ", "Master plan 21: anti-corruption"] },
];
const decidedAmt = r => { const v = (S.review || []).find(x => x.id === r.id); return r.status === "approved" ? (v ? v.r2 * 1e6 : r.amount) : 0; };
STRAT.link = () => {
  const items = S.strategy.items, reqsOfSt = st => S.requests.filter(r => r.status !== "rejected" && st.goals.some(g => g.kpis.some(k => k.acts.includes(r.act))));
  const allReq = sumv(S.requests.filter(r => r.status !== "rejected" && !isPersonnel(r)).map(r => r.amount)) || 1, ed = ROLE === "exec";
  const nats = [...new Set(items.map(st => st.nat))];
  const node = (cls, label, req, dec, inner, open) => `<details class="lnode ${cls}" ${open ? "open" : ""}><summary><span class="lt">${label}</span><span class="la"><b class="num">${mb(req)}</b> ${L("ขอ", "asked")}${dec ? ` · <b class="num">${mb(dec)}</b> ${L("เห็นชอบ", "decided")}` : ""}</span></summary><div class="lkids">${inner}</div></details>`;
  const tree = nats.map(n => {
    const sts = items.filter(st => st.nat === n), mps = [...new Set(sts.map(st => st.mp || ""))];
    const nreq = [...new Set(sts.flatMap(reqsOfSt))];
    return node("nat", `<span class="lvl program">${L("ยุทธศาสตร์ชาติ", "National strategy")}</span>${natName(n)}`, sumv(nreq.map(r => r.amount)), sumv(nreq.map(decidedAmt)), mps.map(mp => {
      const m = MASTER.find(x => x.id === mp), msts = sts.filter(st => (st.mp || "") === mp), mreq = [...new Set(msts.flatMap(reqsOfSt))];
      return node("mp", `<span class="lvl output">${L("แผนแม่บท", "Master plan")}</span>${m ? esc(tx(m.name)) : L("ยังไม่ระบุแผนแม่บท", "No master plan set")}`, sumv(mreq.map(r => r.amount)), sumv(mreq.map(decidedAmt)), msts.map(st => {
        const sreq = reqsOfSt(st), share = sumv(sreq.filter(r => !isPersonnel(r)).map(r => r.amount)) / allReq * 100, min = st.minShare || 0;
        return node("st", `<span class="lvl activity">${st.id}</span>${esc(tx(st.name))} <span class="sub">· ${fmt(share, 0)}% ${L("ของคำขอโครงการ", "of project requests")}${min ? ` · ${L("ขั้นต่ำ", "min")} ${min}%` : ""}</span>${min && share < min ? ` ${tag(L("ต่ำกว่าสัดส่วนขั้นต่ำ", "Below the minimum share"), "p-warn")}` : ""}`, sumv(sreq.map(r => r.amount)), sumv(sreq.map(decidedAmt)), st.goals.map(g => g.kpis.map(k => {
          const kr = S.requests.filter(r => r.status !== "rejected" && k.acts.includes(r.act));
          return `<div class="lkpi"><div><span class="mono sub">${k.id}</span> ${esc(tx(k.name))} <span class="sub">· ${L("เป้า", "target")} ${fmt(k.targets[0], k.targets[0] % 1 ? 1 : 0)} ${tx(k.unit)}</span></div>
            <div class="lreqs">${kr.length ? kr.map(r => `<a href="#" data-link="req:${r.id}" class="lreq">${pill(r.status)} <span class="mono">${r.id}</span> ${esc(tx(r.name))} <b class="num">${mb(r.amount)}</b></a>`).join("") : `<span class="sub" style="color:var(--warn)">${L("ยังไม่มีคำขอสนับสนุนตัวชี้วัดนี้", "No request supports this KPI yet")}</span>`}</div></div>`;
        }).join("")).join(""), true);
      }).join(""), true);
    }).join(""), true);
  }).join("");
  const orphan = S.requests.filter(r => r.status !== "rejected" && !isPersonnel(r) && !kpisForAct(r.act).length), noReq = allKpis().filter(x => !S.requests.some(r => x.k.acts.includes(r.act)));
  return `<section class="stats">
      ${statCard({ label: L("ยุทธศาสตร์ชาติที่เชื่อมโยง", "National strategies linked"), value: nats.length, icon: "flag", sub: L("จาก 6 ด้าน", "of 6") })}
      ${statCard({ label: L("แผนแม่บทที่เชื่อมโยง", "Master plans linked"), value: [...new Set(items.map(s => s.mp).filter(Boolean))].length, icon: "layers", sub: L("จาก 23 แผน", "of 23") })}
      ${statCard({ label: L("คำขอที่ยังไม่เชื่อมตัวชี้วัด", "Requests not linked to a KPI"), value: orphan.length, icon: "link", tone: orphan.length ? "warn" : "", sub: orphan.map(r => r.id).join(" ") || L("เชื่อมครบ", "All linked") })}
      ${statCard({ label: L("ตัวชี้วัดที่ยังไม่มีคำขอ", "KPIs with no request"), value: noReq.length, icon: "target", sub: noReq.map(x => x.k.id).join(" ") || "–" })}</section>
    <section class="panel"><header>${chipIco("share", "info")}<h2>${L("จากยุทธศาสตร์ชาติถึงคำขอ", "From national strategy to requests")}</h2><span class="sp"></span><span class="sub">${L("ตามแผนภาพการเชื่อมโยงในคู่มือสำนักงบประมาณ ปี 2570", "Following the linkage map in the Budget Bureau FY2570 manual")}</span></header>
      <div class="body ltree">${tree}</div></section>
    <section class="panel"><header>${chipIco("pie", "info")}<h2>${L("สัดส่วนวงเงินตามยุทธศาสตร์", "Budget share by strategy")}</h2><span class="sp"></span>${tag(ed ? L("ผู้บริหารกำหนดได้", "Executive can set") : L("ดูอย่างเดียว", "View only"), ed ? "p-ok" : "p-mute")}</header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ยุทธศาสตร์", "Strategy")}</th><th>${L("แผนแม่บท", "Master plan")}</th><th class="n">${L("คำขอ (ลบ.)", "Requested (M)")}</th><th class="n">${L("สัดส่วน", "Share")}</th><th class="n">${L("ขั้นต่ำ %", "Minimum %")}</th></tr></thead>
        <tbody>${items.map((st, i) => { const a = sumv(reqsOfSt(st).filter(r => !isPersonnel(r)).map(r => r.amount)), sh = a / allReq * 100; return `<tr><td><b>${st.id}</b> ${esc(tx(st.name))}</td>
          <td><select data-smp="${i}" ${ROLE === "plan" ? "" : "disabled"} aria-label="${L("แผนแม่บท", "Master plan")}"><option value="">—</option>${MASTER.filter(m => m.nat === st.nat).map(m => `<option value="${m.id}" ${st.mp === m.id ? "selected" : ""}>${esc(tx(m.name)).slice(0, 48)}</option>`).join("")}</select></td>
          <td class="n">${mb(a)}</td><td class="n" style="color:${st.minShare && sh < st.minShare ? "var(--warn)" : "inherit"}">${fmt(sh, 1)}%</td>
          <td class="n"><input type="number" min="0" max="100" step="5" data-smin="${i}" value="${st.minShare || 0}" ${ed ? "" : "disabled"} style="width:70px" aria-label="${L("ขั้นต่ำ", "Minimum")}"></td></tr>`; }).join("")}</tbody></table></div>
      <div class="body sub">${L("ไม่รวมงบบุคลากร · แผนแม่บทเลือกโดยกองแผน ขั้นต่ำกำหนดโดยผู้บริหาร", "Excludes personnel · Planning picks the master plan; the executive sets the minimum")}</div></section>`;
};
STRAT_BIND.link = () => {
  $$("[data-smin]").forEach(inp => (inp.onchange = () => { const st = S.strategy.items[inp.dataset.smin], old = st.minShare || 0; st.minShare = Number(inp.value); audit(["กำหนดสัดส่วนขั้นต่ำของยุทธศาสตร์", "Set a strategy's minimum share"], `${st.id}: ${old}% → ${st.minShare}%`); commit(); route(); }));
  $$("[data-smp]").forEach(sel => (sel.onchange = () => { const st = S.strategy.items[sel.dataset.smp]; st.mp = sel.value; audit(["เชื่อมยุทธศาสตร์กับแผนแม่บท", "Linked a strategy to a master plan"], `${st.id} → ${sel.value || "-"}`); commit(); route(); }));
};

// ---------- seed (called from the shared seed builder) ----------
function seedBudgetB2(s) {
  s.criteria = CRIT5.map(([id, w, name]) => ({ id, w, name }));
  const old = s.scores || {}; s.scores = {};
  s.requests.forEach(r => (s.scores[r.id] = autoScore(r, old[r.id])));
  const mp = { S1: ["MP20", 40], S2: ["MP12", 15], S3: ["MP20", 10] };
  (s.strategy.items || []).forEach(st => { const m = mp[st.id]; if (m && !st.mp && MASTER.some(x => x.id === m[0] && x.nat === st.nat)) { st.mp = m[0]; st.minShare = m[1]; } });
  const slow = s.requests.find(r => r.prev > 0 && Math.abs(r.amount / r.prev - 1) <= 0.05 && r.status === "plan");
  if (slow) { slow.zbb = true; }
}
