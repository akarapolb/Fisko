// M01 Strategic Planning: strategy map, 5-year KPI targets, KPI-to-activity links and the
// plan-to-request alignment report. Planning Division edits; other roles read.
let STRAT_TAB = "map";
const STRAT_TABS = [
  { id: "map", label: ["แผนผังยุทธศาสตร์", "Strategy map"] },
  { id: "kpis", label: ["ตัวชี้วัดและค่าเป้าหมาย", "KPIs and targets"] },
  { id: "links", label: ["เชื่อมโยงกับกิจกรรม", "Links to activities"] },
  { id: "align", label: ["ความสอดคล้องแผนกับคำขอ", "Plan–request alignment"] },
];
const canPlan = () => ROLE === "plan";
function allKpis() {
  const out = [];
  S.strategy.items.forEach(st => st.goals.forEach(g => g.kpis.forEach(k => out.push({ k, g, st }))));
  return out;
}
const kpisForAct = actId => allKpis().filter(x => x.k.acts.includes(actId));
const isPersonnel = r => r.items.length && r.items.every(i => i.type === "per");
const reqsForKpi = k => S.requests.filter(r => k.acts.includes(r.act));
const actLabel = id => { const a = (S.structure[2571] || []).find(x => x.id === id); return a ? `${a.code} · ${tx(a.name)}` : id; };

const STRAT = {};
STRAT.map = () => {
  const ks = allKpis(), linkedReq = S.requests.filter(r => kpisForAct(r.act).length);
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("ยุทธศาสตร์หน่วยงาน", "Agency strategies")}</span><span class="v">${S.strategy.items.length}</span></div>
    <div class="kpi"><span class="l">${L("เป้าประสงค์", "Goals")}</span><span class="v">${S.strategy.items.reduce((s, x) => s + x.goals.length, 0)}</span></div>
    <div class="kpi"><span class="l">${L("ตัวชี้วัด", "KPIs")}</span><span class="v">${ks.length}</span></div>
    <div class="kpi"><span class="l">${L("คำขอที่ผูกกับตัวชี้วัด", "Requests linked to KPIs")}</span><span class="v">${linkedReq.length}<small>/ ${S.requests.length}</small></span></div>
  </section>
  ${S.strategy.items.map(st => `
  <details class="panel strat" open>
    <summary><span class="pill p-mute">${L("ยุทธศาสตร์ชาติ", "National strategy")}: ${natName(st.nat)}</span><b>${st.id} · ${esc(tx(st.name))}</b></summary>
    <div class="body" style="display:flex;flex-direction:column;gap:14px">
      ${st.goals.map(g => `<div class="goal"><div class="goal-h"><span class="lvl output">${L("เป้าประสงค์", "Goal")}</span>${esc(tx(g.name))}</div>
        <div class="tbl-wrap"><table><thead><tr><th>${L("ตัวชี้วัด", "KPI")}</th><th class="n">${L("ฐาน", "Baseline")}</th><th class="n">${L("เป้าปี 2571", "2571 target")}</th><th class="n">${L("เป้าปี 2575", "2575 target")}</th><th>${L("เจ้าของ", "Owner")}</th><th>${L("กิจกรรม / คำขอ", "Activities / requests")}</th></tr></thead>
          <tbody>${g.kpis.map(k => { const rq = reqsForKpi(k); return `<tr><td><span class="mono sub">${k.id}</span> ${esc(tx(k.name))}</td><td class="n">${fmt(k.base, k.base % 1 ? 1 : 0)} <span class="sub">${tx(k.unit)}</span></td>
            <td class="n"><b>${fmt(k.targets[0], k.targets[0] % 1 ? 1 : 0)}</b></td><td class="n">${fmt(k.targets[4], k.targets[4] % 1 ? 1 : 0)}</td><td class="sub">${unitName(k.owner)}</td>
            <td>${k.acts.length ? `${k.acts.length} ${L("กิจกรรม", "activities")} · ${rq.length ? rq.map(r => `<a href="#" data-req="${r.id}" class="mono">${r.id}</a>`).join(" ") : `<span class="sub">${L("ยังไม่มีคำขอ", "no requests")}</span>`}` : tag(L("ยังไม่ผูกกิจกรรม", "No activity linked"), "p-warn")}</td></tr>`; }).join("")}</tbody></table></div></div>`).join("")}
    </div>
  </details>`).join("")}`;
};

STRAT.kpis = () => {
  const ed = canPlan(), ds = ed ? "" : "disabled";
  return `
  <section class="panel"><header><h2>${L("ค่าเป้าหมายตัวชี้วัด 5 ปี", "5-year KPI targets")}</h2><span class="sp"></span>${tag(ed ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), ed ? "p-ok" : "p-mute")}</header>
    <div class="tbl-wrap"><table class="targets"><thead><tr><th>${L("ตัวชี้วัด", "KPI")}</th><th>${L("หน่วย", "Unit")}</th><th class="n">${L("ฐาน", "Baseline")}</th>${PLAN_YEARS.map(y => `<th class="n">${y}</th>`).join("")}<th>${L("เจ้าของ", "Owner")}</th></tr></thead>
      <tbody>${allKpis().map(({ k, st }) => `<tr><td><span class="mono sub">${st.id}·${k.id}</span> ${esc(tx(k.name))} ${historyBtn(k.id, k.id + " " + tx(k.name))}</td><td class="sub">${tx(k.unit)}</td><td class="n">${fmt(k.base, k.base % 1 ? 1 : 0)}</td>
        ${k.targets.map((t, i) => `<td class="n"><input type="number" step="any" min="0" data-k="${k.id}" data-y="${i}" value="${t}" ${ds} aria-label="${esc(tx(k.name))} ${PLAN_YEARS[i]}" style="width:84px"></td>`).join("")}
        <td><select data-own="${k.id}" ${ds} aria-label="${L("เจ้าของ", "Owner")}">${S.units.filter(u => u.parent).map(u => `<option value="${u.id}" ${u.id === k.owner ? "selected" : ""}>${esc(tx(u.name))}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>
    ${ed ? `<div class="body"><form class="inline-form" id="kpi-form">
      <div class="f"><label for="nk-goal">${L("ภายใต้เป้าประสงค์", "Under goal")}</label><select id="nk-goal">${S.strategy.items.flatMap(st => st.goals.map(g => `<option value="${g.id}">${st.id} · ${esc(tx(g.name))}</option>`)).join("")}</select></div>
      <div class="f"><label for="nk-name">${L("ชื่อตัวชี้วัดใหม่", "New KPI name")}</label><input type="text" id="nk-name" required></div>
      <div class="f" style="flex:0 1 110px"><label for="nk-unit">${L("หน่วย", "Unit")}</label><input type="text" id="nk-unit" required></div>
      <div class="f" style="flex:0 1 110px"><label for="nk-t">${L("เป้าปี 2571", "2571 target")}</label><input type="number" step="any" id="nk-t" required></div>
      <button class="btn primary" type="submit">+ ${L("เพิ่มตัวชี้วัด", "Add KPI")}</button></form></div>` : ""}</section>`;
};

STRAT.links = () => {
  const ed = canPlan(), acts = (S.structure[2571] || []).filter(a => a.lvl === "activity"), ks = allKpis();
  return `
  <section class="panel"><header><h2>${L("กิจกรรมตามโครงสร้างงบประมาณ กับตัวชี้วัดที่รองรับ", "Budget activities and the KPIs they serve")}</h2><span class="sp"></span><span class="sub">${L("คำขอที่ใช้กิจกรรมเหล่านี้จะผูกกับตัวชี้วัดอัตโนมัติ", "Requests under these activities link to the KPIs automatically")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("กิจกรรม", "Activity")}</th><th>${L("ตัวชี้วัดที่ผูก", "Linked KPIs")}</th><th class="n">${L("คำขอ", "Requests")}</th><th class="n">${L("วงเงินที่ขอ (ลบ.)", "Requested (M)")}</th></tr></thead>
      <tbody>${acts.map(a => { const kk = kpisForAct(a.id), rq = S.requests.filter(r => r.act === a.id);
        return `<tr><td><span class="mono sub">${a.code}</span> ${esc(tx(a.name))}</td>
          <td><div class="row">${kk.map(x => `<span class="pill p-info">${x.k.id} ${esc(tx(x.k.name))}${ed ? ` <button type="button" class="x" data-unlink="${x.k.id}|${a.id}" aria-label="${L("ยกเลิกการผูก", "Unlink")}">×</button>` : ""}</span>`).join("")}
            ${ed ? `<select data-link="${a.id}" aria-label="${L("ผูกตัวชี้วัด", "Link a KPI")}"><option value="">+ ${L("ผูกตัวชี้วัด", "Link KPI")}</option>${ks.filter(x => !x.k.acts.includes(a.id)).map(x => `<option value="${x.k.id}">${x.k.id} · ${esc(tx(x.k.name))}</option>`).join("")}</select>` : ""}
            ${!kk.length && !ed ? `<span class="sub">—</span>` : ""}</div></td>
          <td class="n">${rq.length}</td><td class="n">${rq.length ? mb(rq.reduce((s, r) => s + r.amount, 0)) : "—"}</td></tr>`; }).join("")}</tbody></table></div></section>`;
};

STRAT.align = () => {
  const proj = S.requests.filter(r => !isPersonnel(r)), tot = proj.reduce((s, r) => s + r.amount, 0);
  const orphan = proj.filter(r => !kpisForAct(r.act).length), alignedAmt = tot - orphan.reduce((s, r) => s + r.amount, 0);
  const noBudget = allKpis().filter(x => !reqsForKpi(x.k).length);
  const byStrat = S.strategy.items.map(st => {
    const acts = new Set(st.goals.flatMap(g => g.kpis.flatMap(k => k.acts)));
    const rq = proj.filter(r => acts.has(r.act));
    return { st, amt: rq.reduce((s, r) => s + r.amount, 0), n: rq.length };
  });
  const max = Math.max(1, ...byStrat.map(b => b.amt));
  const story = S.requests.find(r => r.id === S.story), sk = story ? kpisForAct(story.act)[0] : null;
  return `
  <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="kpi hl"><span class="l">${L("วงเงินคำขอที่สอดคล้องกับแผน", "Requested budget aligned to the plan")}</span><span class="v">${fmt(tot ? alignedAmt / tot * 100 : 0, 1)}%</span><span class="d" style="color:var(--rail-ink)">${mb(alignedAmt)} / ${mb(tot)} ${L("ลบ. (ไม่รวมงบบุคลากร)", "M (excl. personnel)")}</span></div>
    <div class="kpi"><span class="l">${L("คำขอที่ไม่ผูกตัวชี้วัด", "Requests with no KPI")}</span><span class="v" style="color:var(--${orphan.length ? "bad" : "accent"})">${orphan.length}</span></div>
    <div class="kpi"><span class="l">${L("ตัวชี้วัดที่ยังไม่มีงบประมาณรองรับ", "KPIs with no budget")}</span><span class="v" style="color:var(--${noBudget.length ? "warn" : "accent"})">${noBudget.length}</span></div>
  </section>
  <div class="grid2">
    <section class="panel"><header><h2>${L("วงเงินที่ขอตามยุทธศาสตร์", "Requested budget by strategy")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท", "M baht")}</span></header>
      <div class="body"><div class="hbars">${byStrat.map(b => `<div class="hb"><span>${b.st.id} · ${esc(tx(b.st.name))}</span><div class="track" style="width:${b.amt / max * 100}%"><i class="c2" style="width:100%"></i></div><span class="num" style="text-align:right">${mb(b.amt)}</span></div>`).join("")}</div></div></section>
    <section class="panel"><header><h2>${L("ต้องดำเนินการ", "To act on")}</h2></header>
      <div class="body">
        ${orphan.map(r => `<div class="alert"><div class="ic" style="background:var(--bad-soft);color:var(--bad)">!</div><div><b>${r.id} · ${esc(tx(r.name))}</b><p>${r.act ? L("กิจกรรมนี้ยังไม่ผูกกับตัวชี้วัด ผูกได้ที่แท็บ “เชื่อมโยงกับกิจกรรม”", "Its activity has no KPI yet. Link one in the Links tab.") : L("ยังไม่ได้เลือกกิจกรรมในแบบฟอร์มคำขอ", "No activity chosen in the request form yet")}</p></div></div>`).join("")}
        ${noBudget.map(x => `<div class="alert"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${x.k.id} · ${esc(tx(x.k.name))}</b><p>${L("ยังไม่มีคำของบประมาณรองรับ ตรวจว่าใช้งบดำเนินงานปกติหรือต้องเสนอโครงการ", "No request funds this KPI. Check whether it runs on routine budget or needs a project.")}</p></div></div>`).join("")}
        ${!orphan.length && !noBudget.length ? `<span class="sub">${L("ทุกคำขอและตัวชี้วัดเชื่อมโยงกันครบ", "Every request and KPI is linked")}</span>` : ""}
      </div></section>
  </div>
  ${story && sk ? `<section class="panel"><header><h2>${L("เส้นทางของโครงการตัวอย่าง", "Storyline project trace")}</h2></header>
    <div class="body"><div class="hier" style="font-size:14px">
      <span>${natName(sk.st.nat)}</span><em>›</em><span>${esc(tx(sk.st.name))}</span><em>›</em><span>${esc(tx(sk.g.name))}</span><em>›</em><span>${sk.k.id} ${esc(tx(sk.k.name))}</span><em>›</em><span>${esc(actLabel(story.act))}</span><em>›</em><span><a href="#" data-req="${story.id}">${story.id} · ${esc(tx(story.name))}</a></span>
    </div></div></section>` : ""}`;
};

VIEWS.strategy = () => `
  <div class="head"><div><div class="eyebrow">M01 · Strategic Planning</div><h1>${L("แผนยุทธศาสตร์และตัวชี้วัด", "Strategy and KPIs")}</h1>
    <p>${esc(tx(S.strategy.plan))} · ${L("เชื่อมยุทธศาสตร์ชาติ 20 ปี กับโครงสร้างงบประมาณและคำขอ", "Links the 20-year National Strategy to the budget structure and requests")}</p></div></div>
  <div class="tabs" role="tablist">${STRAT_TABS.map(t => `<button class="tab ${t.id === STRAT_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${t.id === STRAT_TAB}" data-stab="${t.id}">${tx(t.label)}</button>`).join("")}</div>
  ${STRAT[STRAT_TAB]()}`;

BIND.strategy = () => {
  $$("[data-stab]").forEach(b => (b.onclick = () => { STRAT_TAB = b.dataset.stab; route(); }));
  $$("[data-req]").forEach(a => (a.onclick = e => { e.preventDefault(); openReq(a.dataset.req); }));
  const findK = id => allKpis().find(x => x.k.id === id).k;
  $$("[data-k][data-y]").forEach(inp => (inp.onchange = () => {
    const k = findK(inp.dataset.k), y = Number(inp.dataset.y), old = k.targets[y];
    k.targets[y] = Number(inp.value);
    audit(["แก้ไขค่าเป้าหมายตัวชี้วัด", "Changed a KPI target"], `${k.id} ${PLAN_YEARS[y]}: ${old} → ${k.targets[y]}`); commit(); toast(L("บันทึกค่าเป้าหมายแล้ว", "Target saved"));
  }));
  $$("[data-own]").forEach(s => (s.onchange = () => { const k = findK(s.dataset.own); k.owner = s.value; audit(["เปลี่ยนเจ้าของตัวชี้วัด", "Changed a KPI owner"], `${k.id} → ${unitName(k.owner)}`); commit(); toast(L("บันทึกแล้ว", "Saved")); }));
  const f = $("#kpi-form");
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const g = S.strategy.items.flatMap(st => st.goals).find(x => x.id === $("#nk-goal").value);
    const n = allKpis().length + 1, t = Number($("#nk-t").value), nm = $("#nk-name").value.trim(), un = $("#nk-unit").value.trim();
    g.kpis.push({ id: "K" + n, owner: me().unit, unit: [un, un], base: 0, targets: [t, t, t, t, t], acts: [], name: [nm, nm] });
    audit(["เพิ่มตัวชี้วัด", "Added a KPI"], `K${n} ${nm}`); commit(); route(); toast(L("เพิ่มตัวชี้วัดแล้ว ผูกกับกิจกรรมได้ที่แท็บถัดไป", "KPI added. Link it to an activity in the next tab."));
  };
  $$("[data-link]").forEach(s => (s.onchange = () => {
    if (!s.value) return;
    const k = findK(s.value); k.acts.push(s.dataset.link);
    audit(["ผูกตัวชี้วัดกับกิจกรรม", "Linked a KPI to an activity"], `${k.id} ↔ ${actLabel(s.dataset.link)}`); commit(); route();
  }));
  $$("[data-unlink]").forEach(b => (b.onclick = () => {
    const [kid, aid] = b.dataset.unlink.split("|"), k = findK(kid);
    k.acts = k.acts.filter(a => a !== aid);
    audit(["ยกเลิกการผูกตัวชี้วัดกับกิจกรรม", "Unlinked a KPI from an activity"], `${k.id} ↔ ${actLabel(aid)}`); commit(); route();
  }));
};
