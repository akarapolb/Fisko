// Fisko Budget round B3, committee (M04): a committee role, membership, quorum, conflicts of interest, votes,
// minutes drafted from the record, and the impact of a cut on KPI targets and the quarterly plan.
// FR-B-21, FR-B-22, SD-10 (a member from the requesting unit abstains), D-B02, D-B07 (direct proportion).
ROLES.committee = ["กรรมการพิจารณางบประมาณ", "Budget committee member"];
const VOTE = { approve: [["เห็นชอบ", "Approve"], "p-ok"], reduce: [["เห็นชอบโดยปรับลด", "Approve with a cut"], "p-warn"], defer: [["ให้ทบทวน", "Defer"], "p-mute"], reject: [["ไม่เห็นชอบ", "Reject"], "p-bad"] };
const cmte = () => S.committee || { members: [], quorum: 50 };
const quorumN = () => Math.ceil(cmte().members.length * (cmte().quorum || 50) / 100);
const conflicted = (uid, r) => { const u = S.users.find(x => x.id === uid); return !!u && u.unit === r.unit; };

// ---------- cut impact (FR-B-22) ----------
function cutImpact(r, newAmt) {
  const ratio = r.amount ? Math.max(0, Math.min(1, newAmt / r.amount)) : 1, out = [];
  if (typeof kpisForAct === "function") kpisForAct(r.act).forEach(({ k }) => out.push({ id: k.id, name: k.name, unit: k.unit, from: k.targets[0], to: Math.round(k.targets[0] * ratio * 10) / 10 }));
  return { ratio, kpis: out, q: (r.qplan || []).map(v => Math.round(Number(v) * ratio / 1000) * 1000) };
}
const impactText = (r, amt) => {
  const im = cutImpact(r, amt);
  if (im.ratio >= 0.999) return L("ไม่กระทบเป้าหมาย", "No effect on targets");
  return (im.kpis.length ? im.kpis.map(x => `${x.id} ${fmt(x.from, x.from % 1 ? 1 : 0)} → <b>${fmt(x.to, 1)}</b> ${tx(x.unit)}`).join(" · ") : L("ไม่มีตัวชี้วัดที่ผูกไว้", "No KPI linked")) + ` · ${L("แผนรายไตรมาสลด", "quarterly plan cut")} ${fmt((1 - im.ratio) * 100, 0)}%`;
};

// ---------- meetings ----------
{
  const base = REV_PANELS.meetings;
  REV_PANELS.meetings = () => {
    let html = base();
    const m = S.meetings.find(x => (x.status || "scheduled") === "scheduled"), C = cmte(), agenda = S.requests.filter(r => r.status === "committee");
    if (m && html.includes('<div class="body inline-form">')) {
      m.present = m.present || C.members.slice(); m.votes = m.votes || {};
      const can = ROLE === "plan" || acting("exec", "committee"), qn = quorumN(), ok = m.present.length >= qn, mine = me().id, member = C.members.includes(mine) && m.present.includes(mine);
      const roleOf = uid => (uid === C.chair ? L("ประธาน", "Chair") : L("กรรมการ", "Member"));
      const block = `<div class="body" style="display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line)">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><b>${L("องค์ประชุม", "Quorum")}</b>${tag(`${m.present.length}/${C.members.length} · ${L("ต้องมีอย่างน้อย", "needs")} ${qn}`, ok ? "p-ok" : "p-bad")}</div>
        <div class="row" style="flex-wrap:wrap;gap:6px 14px">${C.members.map(uid => `<label class="radio"><input type="checkbox" data-mpres="${uid}" ${m.present.includes(uid) ? "checked" : ""} ${can ? "" : "disabled"}> ${esc(userName(uid))} <span class="sub">· ${roleOf(uid)} · ${unitName((S.users.find(u => u.id === uid) || {}).unit)}</span></label>`).join("")}</div>
        <span class="sub">${L("เลขานุการ", "Secretary")}: ${esc(userName(C.secretary))} (${L("ไม่ออกเสียง", "no vote")})</span>
        ${agenda.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("วาระ", "Item")}</th><th>${L("งดออกเสียง (SD-10)", "Abstains (SD-10)")}</th><th>${L("เสียง", "Votes")}</th>${member ? `<th>${L("ความเห็นของฉัน", "My vote")}</th>` : ""}<th>${L("ผลกระทบถ้าใช้วงเงินในช่องมติ", "Impact at the resolved amount")}</th></tr></thead><tbody>
          ${agenda.map(r => { const v = m.votes[r.id] || {}, ab = m.present.filter(uid => conflicted(uid, r)), tally = Object.keys(VOTE).map(k => [k, Object.values(v).filter(x => x === k).length]).filter(x => x[1]);
            return `<tr><td><span class="mono">${r.id}</span> ${esc(tx(r.name))}</td><td class="sub">${ab.map(userName).map(esc).join(", ") || "–"}</td><td>${tally.map(([k, n]) => tag(`${tx(VOTE[k][0])} ${n}`, VOTE[k][1])).join(" ") || `<span class="sub">${L("ยังไม่มี", "None yet")}</span>`}</td>
              ${member ? `<td>${conflicted(mine, r) ? `<span class="sub">${L("งดออกเสียง", "Abstain")}</span>` : `<select data-vote="${r.id}" aria-label="${L("ความเห็นของฉัน", "My vote")} ${r.id}"><option value="">—</option>${Object.keys(VOTE).map(k => `<option value="${k}" ${v[mine] === k ? "selected" : ""}>${tx(VOTE[k][0])}</option>`).join("")}</select>`}</td>` : ""}
              <td class="sub" data-imp="${r.id}">${impactText(r, r.amount)}</td></tr>`; }).join("")}</tbody></table></div>` : ""}
        ${!ok ? `<span class="sub" style="color:var(--bad)">${L("ยังไม่ครบองค์ประชุม บันทึกมติไม่ได้", "No quorum yet: resolutions can't be recorded")}</span>` : ""}</div>`;
      html = html.replace('<div class="body inline-form">', block + '<div class="body inline-form">').replace(/id="m-att" value="\d+"/, `id="m-att" value="${m.present.length}" readonly`);
    }
    const held = S.meetings.filter(x => x.status === "held" && x.minutes).slice().reverse();
    return html + held.map(x => `<section class="panel"><header>${chipIco("file", "info")}<h2>${L("รายงานการประชุม (ร่างจากบันทึก)", "Minutes (drafted from the record)")} ${tx(x.no)}</h2><span class="sp"></span><button class="btn ghost" type="button" data-mcopy="${x.id}">${L("คัดลอก", "Copy")}</button></header>
      <div class="body"><pre class="minutes" id="min-${x.id}">${esc(tx(x.minutes))}</pre></div></section>`).join("");
  };
  const bb = REV_BIND.meetings;
  REV_BIND.meetings = () => {
    bb();
    const m = S.meetings.find(x => (x.status || "scheduled") === "scheduled");
    $$("[data-mpres]").forEach(c => (c.onchange = () => { const p = m.present; const i = p.indexOf(c.dataset.mpres); if (c.checked && i < 0) p.push(c.dataset.mpres); if (!c.checked && i >= 0) p.splice(i, 1); save(); route(); }));
    $$("[data-vote]").forEach(s => (s.onchange = () => { (m.votes[s.dataset.vote] = m.votes[s.dataset.vote] || {})[me().id] = s.value || undefined; audit(["ลงความเห็นในวาระ", "Voted on an agenda item"], `${s.dataset.vote}: ${s.value || "-"}`); commit(); route(); }));
    $$("[data-ramt]").forEach(inp => inp.addEventListener("input", () => { const r = S.requests.find(x => x.id === inp.dataset.ramt), c = $(`[data-imp="${r.id}"]`); if (c) c.innerHTML = impactText(r, Number(inp.value) * 1e6); }));
    $$("[data-mcopy]").forEach(b => (b.onclick = () => { const el = $("#min-" + b.dataset.mcopy); try { navigator.clipboard.writeText(el.innerText).then(() => toast(L("คัดลอกแล้ว", "Copied")), () => toast(L("เลือกข้อความแล้วกด Ctrl+C", "Select the text and press Ctrl+C"))); } catch (e) { toast(L("เลือกข้อความแล้วกด Ctrl+C", "Select the text and press Ctrl+C")); } }));
    const b = $("#m-save"); if (!b || !m) return;
    const orig = b.onclick;
    b.onclick = () => {
      if (m.present.length < quorumN()) { toast(L(`ยังไม่ครบองค์ประชุม (ต้องมีอย่างน้อย ${quorumN()} คน)`, `No quorum (needs at least ${quorumN()})`)); return; }
      const agenda = S.requests.filter(r => r.status === "committee"), amts = {}; agenda.forEach(r => (amts[r.id] = { from: r.amount, res: $(`[data-res="${r.id}"]`).value, amt: Number($(`[data-ramt="${r.id}"]`).value) * 1e6 }));
      const C = cmte(), present = m.present.slice(), votes = JSON.parse(JSON.stringify(m.votes || {}));
      orig();
      const held = S.meetings.find(x => x.id === m.id);
      Object.keys(amts).forEach(id => {
        const r = S.requests.find(x => x.id === id), a = amts[id];
        if ((a.res === "reduce" || a.res === "approve") && a.amt < a.from - 1) { const im = cutImpact(Object.assign({}, r, { amount: a.from }), a.amt); r.cutImpact = { from: a.from, to: a.amt, kpis: im.kpis, t: TODAY, by: held.no }; if (r.qplan) r.qplan = im.q; }
      });
      const line = (th, en) => [th, en];
      const items = Object.keys(held.items || {}), mk = i => {
        const it = held.items[i], v = votes[i] || {}, r = S.requests.find(x => x.id === i) || { unit: "" }, ab = present.filter(uid => conflicted(uid, r));
        const t = Object.keys(VOTE).map(k => [k, Object.values(v).filter(x => x === k).length]).filter(x => x[1]);
        return [`วาระ ${i} ${tx(agendaName(i))}\n  มติ: ${RES[it.res][0][0]}${it.amount != null ? ` วงเงิน ${fmt(it.amount, 2)} ล้านบาท` : ""}\n  เสียง: ${t.map(([k, n]) => `${VOTE[k][0][0]} ${n}`).join(", ") || "ไม่ได้บันทึก"}${ab.length ? `\n  งดออกเสียง: ${ab.map(userName).join(", ")} (ผู้มีส่วนได้เสีย)` : ""}`,
          `Item ${i} ${tx(agendaName(i))}\n  Resolution: ${RES[it.res][0][1]}${it.amount != null ? `, ${fmt(it.amount, 2)} M baht` : ""}\n  Votes: ${t.map(([k, n]) => `${VOTE[k][0][1]} ${n}`).join(", ") || "not recorded"}${ab.length ? `\n  Abstained: ${ab.map(userName).join(", ")} (interest)` : ""}`];
      };
      const bodies = items.map(mk);
      held.minutes = line(
        `รายงานการประชุมคณะกรรมการพิจารณางบประมาณ ${held.no[0]}\nวันที่ ${fdate(held.date)}\nผู้มาประชุม ${present.length} จาก ${C.members.length} คน (ครบองค์ประชุม): ${present.map(userName).join(", ")}\nประธาน: ${userName(C.chair)} · เลขานุการ: ${userName(C.secretary)}\n\n${bodies.map(x => x[0]).join("\n\n")}\n\nเลิกประชุม · ร่างโดยระบบจากบันทึกมติ ตรวจทานก่อนเวียนรับรอง`,
        `Minutes of the budget committee, ${held.no[1]}\nDate ${fdate(held.date)}\nPresent ${present.length} of ${C.members.length} (quorum met): ${present.map(userName).join(", ")}\nChair: ${userName(C.chair)} · Secretary: ${userName(C.secretary)}\n\n${bodies.map(x => x[1]).join("\n\n")}\n\nMeeting closed · drafted by the system from the recorded resolutions; review before circulating`);
      held.present = present; held.votes = votes; commit(); route();
    };
  };
}

// ---------- the request shows the effect of a cut ----------
{
  const bv = VIEWS.request;
  VIEWS.request = () => {
    const html = bv(), r = curReq();
    if (!r.cutImpact || REQ_TAB !== "main") return html;
    const c = r.cutImpact, box = `<div class="alert" style="margin-bottom:14px"><div class="ic">!</div><div><b>${L("ผลกระทบจากการปรับลดวงเงิน", "Effect of the cut")} · ${mb(c.from)} → ${mb(c.to)} ${L("ลบ.", "M")} (${tx(c.by)})</b>
      <p>${c.kpis.length ? c.kpis.map(x => `${x.id} ${esc(tx(x.name))}: ${fmt(x.from, x.from % 1 ? 1 : 0)} → <b>${fmt(x.to, 1)}</b> ${tx(x.unit)}`).join(" · ") : L("ไม่มีตัวชี้วัดที่ผูกไว้", "No KPI linked")} · ${L("ปรับแผนรายไตรมาสตามสัดส่วนแล้ว", "Quarterly plan scaled to match")}</p></div></div>`;
    const at = html.indexOf('<div class="grid-form">');
    return at >= 0 ? html.slice(0, at) + box + html.slice(at) : html;
  };
}

// ---------- menus, rights, tasks ----------
{
  const rs = renderShell;
  renderShell = function () {
    ["home", "requests", "review", "strategy", "consolidation", "assistant"].forEach(id => { const n = NAV.find(x => x.id === id); if (n && !n.roles.includes("committee")) n.roles.push("committee"); });
    if (typeof MATRIX !== "undefined" && !MATRIX.committee) MATRIX.committee = ["R", "R", "R", "A", "–", "–", "R", "R", "U", "–"];
    return rs.apply(this, arguments);
  };
  const bt = myTasks;
  myTasks = function () {
    const t = bt.apply(this, arguments), m = (S.meetings || []).find(x => (x.status || "scheduled") === "scheduled");
    if (m && cmte().members.includes(me().id)) {
      const open = S.requests.filter(r => r.status === "committee" && !conflicted(me().id, r) && !((m.votes || {})[r.id] || {})[me().id]);
      if (open.length) t.unshift({ title: `${L("ลงความเห็นวาระประชุม", "Vote on the agenda for")} ${tx(m.no)} (${open.length})`, sub: L("ก่อนการประชุม", "Before the meeting"), link: "rev-meetings", due: m.date, cls: "p-warn" });
    }
    return t;
  };
}

// ---------- seed ----------
function seedBudgetB3(s) {
  [["u21", "U05", ["ชาญ ทุนดี", "Chan Thoondee"]], ["u22", "U06", ["สุดา พิจารณ์", "Suda Pijarn"]], ["u23", "U03", ["อำนาจ ชอบธรรม", "Amnat Chobtham"]]].forEach(([id, unit, name], i) => {
    if (!s.users.some(u => u.id === id)) s.users.push({ id, role: "committee", unit: s.units.some(u => u.id === unit) ? unit : s.units[1].id, primary: i === 0, mfa: true, active: true, name });
  });
  const ex = s.users.find(u => u.role === "exec"), fi = s.users.find(u => u.role === "fin"), pl = s.users.find(u => u.role === "plan");
  s.committee = { members: [ex && ex.id, fi && fi.id, "u21", "u22", "u23"].filter(Boolean), chair: ex ? ex.id : "u21", secretary: pl ? pl.id : "", quorum: 50 };
  const m = (s.meetings || []).find(x => (x.status || "scheduled") === "scheduled");
  if (m) { m.present = s.committee.members.slice(); m.votes = {}; const it = s.requests.find(r => r.status === "committee"); if (it) m.votes[it.id] = { u22: "approve", [ex ? ex.id : "u21"]: "reduce" }; }
}
