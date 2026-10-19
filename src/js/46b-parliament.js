// M05 deeper feature (round 9): the FY2571 budget bill through parliament. The scrutiny committee's
// cuts per project, the agency's appeals to restore them, and the final appropriation.
SUB_TABS.push({ id: "parliament", label: ["ขั้นตอนรัฐสภา", "Parliament"] });
// Sample timetable: month and day from a typical year, the year from the budget being formulated.
const PARL_STEPS = [
  [["ครม. เห็นชอบร่าง พ.ร.บ. งบประมาณ", "Cabinet approves the budget bill"], `${FORM_FY - 544}-04-27`],
  [["สภาผู้แทนราษฎร วาระที่ 1 รับหลักการ", "House first reading"], `${FORM_FY - 544}-05-29`],
  [["กรรมาธิการวิสามัญพิจารณารายหน่วยรับงบประมาณ", "Scrutiny committee reviews each agency"], `${FORM_FY - 544}-06-20`],
  [["แปรญัตติขอคืนงบประมาณ", "Appeals to restore cuts"], `${FORM_FY - 544}-07-15`],
  [["สภาผู้แทนราษฎร วาระที่ 2–3", "House second and third readings"], `${FORM_FY - 544}-08-20`],
  [["วุฒิสภาให้ความเห็นชอบ", "Senate approval"], `${FORM_FY - 544}-09-03`],
  [["ประกาศในราชกิจจานุเบกษา", "Published in the Royal Gazette"], `${FORM_FY - 544}-09-20`],
];
// Projects in the bill: the approved package if there is one, otherwise the round 3 amounts in M04.
function parlItems() {
  const P = S.parl;
  if (P.items) return P.items;
  const pk = pkg().filter(r => !isPersonnel(r));
  return pk.length ? pk.map(r => ({ id: r.id, name: r.name, amt: Math.round(subAmt(r) / 1e5) / 10 })) : S.review.map(v => ({ id: v.id, name: v.name, amt: v.r2 }));
}
const parlFinal = it => { const P = S.parl, c = P.cuts[it.id], a = P.appeals[it.id]; return it.amt - (c ? c.amt : 0) + (a && a.granted ? a.granted : 0); };

SUB.parliament = () => {
  const P = S.parl, st = P.stage, pl = ROLE === "plan", items = parlItems(), appealing = st === 3;
  const tot = k => items.reduce((s, it) => s + k(it), 0);
  const cutT = tot(it => (P.cuts[it.id] ? P.cuts[it.id].amt : 0)), grT = tot(it => (P.appeals[it.id] && P.appeals[it.id].granted) || 0);
  return `
  <section class="panel"><header><h2>${L(`ร่าง พ.ร.บ. งบประมาณรายจ่ายประจำปี ${FORM_FY} ในรัฐสภา`, `FY${FORM_FY} budget bill in parliament`)}</h2><span class="sp"></span>
      ${st >= PARL_STEPS.length ? tag(L("มีผลใช้บังคับ", "In force"), "p-ok") : tag(`${L("ขั้นตอนถัดไป", "Next")}: ${fdate(PARL_STEPS[st][1])}`, "p-info")}</header>
    <div class="body"><ol class="hsteps parl">${PARL_STEPS.map(([n, d], i) => `<li class="${i < st ? "done" : i === st ? "now" : ""}"><span class="dot"></span>${tx(n)}<small class="sub">${fdate(d)}</small></li>`).join("")}</ol>
      <div class="row" style="margin-top:14px">${pl && st < PARL_STEPS.length ? `<button class="btn" type="button" id="parl-next">${L("จำลอง", "Demo")}: ${tx(PARL_STEPS[st][0])} ${L("เสร็จสิ้น", "done")}</button>` : ""}
        <span class="sub">${L("วันที่เป็นกำหนดการตัวอย่าง", "Dates are a sample timetable")}</span></div></div></section>
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("วงเงินในร่าง พ.ร.บ. (โครงการ)", "In the bill (projects)")}</span><span class="v">${fmt(tot(it => it.amt), 1)}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("กรรมาธิการปรับลด", "Committee cuts")}</span><span class="v" style="color:var(--${cutT ? "bad" : "ink"})">${fmt(cutT, 1)}</span></div>
    <div class="kpi"><span class="l">${L("ได้รับคืนจากการแปรญัตติ", "Restored on appeal")}</span><span class="v" style="color:var(--${grT ? "accent" : "ink"})">${fmt(grT, 1)}</span></div>
    <div class="kpi hl"><span class="l">${L("วงเงินตาม พ.ร.บ.", "Appropriated")}</span><span class="v">${fmt(tot(parlFinal), 1)}<small>${L("ลบ.", "M")}</small></span></div>
  </section>
  <section class="panel"><header><h2>${L("ผลการพิจารณารายโครงการ", "Result by project")}</h2><span class="sp"></span><span class="sub">${L("ล้านบาท", "M baht")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("โครงการ", "Project")}</th><th class="n">${L("ในร่าง", "In bill")}</th><th class="n">${L("กรรมาธิการปรับลด", "Cut")}</th><th>${L("เหตุผลของกรรมาธิการ", "Committee's reason")}</th><th>${L("แปรญัตติขอคืน", "Appeal")}</th><th class="n">${L("วงเงินสุดท้าย", "Final")}</th></tr></thead>
      <tbody>${items.map(it => { const c = P.cuts[it.id], a = P.appeals[it.id];
        return `<tr><td><span class="mono sub">${it.id}</span> ${esc(tx(it.name))}</td><td class="n">${fmt(it.amt, 1)}</td><td class="n" style="color:var(--${c ? "bad" : "ink-2"})">${c ? "−" + fmt(c.amt, 1) : "—"}</td>
          <td class="sub">${c ? esc(tx(c.why)) : "—"}</td>
          <td>${a ? `${fmt(a.amt, 1)} · ${esc(tx(a.why))}<div>${a.granted != null ? tag(`${L("ได้คืน", "Restored")} ${fmt(a.granted, 1)}`, a.granted ? "p-ok" : "p-bad") : tag(L("รอผล", "Pending"), "p-warn")}</div>`
            : c && appealing && pl ? `<form class="row" data-pappeal="${it.id}" style="flex-wrap:nowrap"><input type="number" min="0.1" max="${c.amt}" step="0.1" id="pa-${it.id}" value="${c.amt}" style="width:80px" aria-label="${L("ขอคืน (ลบ.)", "Restore (M)")}"><input type="text" id="pw-${it.id}" placeholder="${L("เหตุผลขอคืน", "Why restore")}" required style="flex:1;min-width:120px"><button class="btn primary" type="submit">${L("ยื่น", "File")}</button></form>`
            : c ? `<span class="sub">${st < 3 ? L("ยื่นได้ในขั้นแปรญัตติ", "Opens at the appeals stage") : L("ไม่ได้ยื่น", "Not filed")}</span>` : "—"}</td>
          <td class="n"><b>${fmt(parlFinal(it), 1)}</b></td></tr>`; }).join("")}</tbody></table></div>
    <div class="body sub">${L(`ผลสุดท้ายใช้เป็นวงเงินตั้งต้นของการจัดสรรปี ${FORM_FY} ใน M06`, `The final amounts become the starting point for the FY${FORM_FY} allocation in M06`)}</div></section>`;
};
function bindParliament() {
  const P = S.parl, nx = $("#parl-next");
  if (nx) nx.onclick = () => {
    const step = PARL_STEPS[P.stage][0];
    if (P.stage === 2) {
      P.items = parlItems();
      const big = P.items.slice().sort((a, b) => b.amt - a.amt);
      if (big[0]) P.cuts[big[0].id] = { amt: Math.round(big[0].amt * 0.08 * 10) / 10, why: ["ความพร้อมของแบบรูปรายการยังไม่ครบถ้วน ให้ทยอยดำเนินการ", "Drawings not ready; phase the work"] };
      if (big[1]) P.cuts[big[1].id] = { amt: Math.round(big[1].amt * 0.05 * 10) / 10, why: ["ราคาต่อหน่วยสูงกว่าราคากลาง", "Unit costs above the reference price"] };
      notify(["plan", "exec"], ["กรรมาธิการปรับลดงบประมาณ 2 โครงการ ยื่นแปรญัตติขอคืนได้", "The committee cut 2 projects; you can appeal"], "sub-parliament");
    }
    if (P.stage === 3) Object.keys(P.appeals).forEach(id => { const a = P.appeals[id]; a.granted = Math.round(a.amt * 0.5 * 10) / 10; });
    P.stage += 1;
    audit(["บันทึกขั้นตอนร่าง พ.ร.บ. งบประมาณ", "Recorded a budget bill stage"], tx(step));
    if (P.stage === PARL_STEPS.length) notify(["fin", "plan", "exec"], [`พ.ร.บ. งบประมาณปี ${FORM_FY} ประกาศใช้แล้ว พร้อมจัดสรร`, `The FY${FORM_FY} Budget Act is in force; ready to allocate`], "allocation");
    commit(); route(); toast(`${tx(step)} · ${L("บันทึกแล้ว", "recorded")}`);
  };
  $$("[data-pappeal]").forEach(f => (f.onsubmit = e => {
    e.preventDefault();
    const id = f.dataset.pappeal, c = P.cuts[id], amt = Math.min(c.amt, Number($("#pa-" + id).value)), why = $("#pw-" + id).value.trim();
    P.appeals[id] = { amt, why: [why, why], t: nowIso(), by: me().id, granted: null };
    audit(["ยื่นแปรญัตติขอคืนงบประมาณ", "Filed an appeal to restore a cut"], `${id} · ${fmt(amt, 1)} M`);
    commit(); route(); toast(L("ยื่นคำแปรญัตติแล้ว", "Appeal filed"));
  }));
}
{
  const base = BIND.submission;
  BIND.submission = () => { base(); if (SUB_TAB === "parliament") bindParliament(); };
}
