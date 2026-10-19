// M09 Executive Budget Assistant: sample questions answered from this organization's data.
const QUESTIONS = [
  ["หน่วยงานใดมีอัตราเบิกจ่ายต่ำกว่าแผนมากที่สุด?", "Which units are furthest behind their spending plan?"],
  ["หากได้รับงบประมาณลดลง 15% ควรจัดสรรอย่างไรเพื่อรักษาโครงการสำคัญ?", "If the budget is cut by 15%, how should we allocate it to protect key projects?"],
  [`สรุปคำของบประมาณปี ${FORM_FY} ที่เพิ่มขึ้นจากปีก่อนเกินเกณฑ์`, `Which FY${FORM_FY} requests grew more than the threshold over last year?`],
];
function answer(i) {
  if (i === 0) {
    const rows = S.dash.units.slice().sort((a, b) => a.actual / a.plan - b.actual / b.plan).slice(0, 3);
    return `<p>${L("ข้อมูลสะสมถึง", "Cumulative to")} ${fdate(S.dash.asOf)} ${L("หน่วยงานที่เบิกจ่ายต่ำกว่าแผนมากที่สุด 3 อันดับ:", "— the 3 units furthest behind plan:")}</p>
      <table><thead><tr><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("แผนสะสม", "Plan")}</th><th class="n">${L("ผล", "Actual")}</th><th class="n">${L("% ตามแผน", "% of plan")}</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td>${unitName(x.unit)}</td><td class="n">${fmt(x.plan)}</td><td class="n">${fmt(x.actual)}</td><td class="n">${fmt(x.actual / x.plan * 100, 1)}%</td></tr>`).join("")}</tbody></table>
      ${rows.filter(x => x.reason).length ? `<h4>${L("สาเหตุที่พบ", "Likely causes")}</h4><ul>${rows.filter(x => x.reason).map(x => `<li>${unitName(x.unit)}: ${tx(x.reason)}</li>`).join("")}</ul>` : ""}
      <h4>${L("ข้อมูลอ้างอิง", "Sources")}</h4><span class="sub">${L("แผน/ผลการใช้จ่ายรายเดือน (M07) · สถานะจัดซื้อจัดจ้าง · หน่วย ล้านบาท", "Monthly plan and disbursement (M07) · procurement status · million baht")}</span>`;
  }
  if (i === 1) return `${tx(S.scenario)}<h4>${L("สมมติฐาน", "Assumptions")}</h4><ul><li>${L("ลดเท่ากันทั้งกรม ไม่มีงบกลางชดเชย", "Same cut across the department, no central reserve")}</li><li>${L("ใช้คะแนนความสำคัญจากรอบกลั่นกรองที่ 2", "Priorities from review round 2")}</li></ul>
      <h4>${L("ข้อควรทราบ", "Note")}</h4><span class="sub">${L("เป็นข้อเสนอเพื่อประกอบการตัดสินใจ การปรับวงเงินจริงต้องผ่านการกลั่นกรอง (M04) โดยผู้มีอำนาจ", "This is decision support. Real changes go through review (M04) by authorised officials.")}</span>`;
  if (i === 2) {
    const lim = (rule("BR-04") || {}).param || 20;
    const rows = S.requests.filter(r => r.prev > 0 && (r.amount / r.prev - 1) * 100 > lim);
    return rows.length ? `<p>${L(`มีคำขอ ${rows.length} รายการที่เพิ่มขึ้นเกิน ${lim}% จากปี ${CUR_FY}:`, `${rows.length} requests grew more than ${lim}% over FY${CUR_FY}:`)}</p>
      <ul>${rows.map(r => `<li><b>${esc(tx(r.name))}</b> +${fmt((r.amount / r.prev - 1) * 100, 1)}% (${mb(r.prev)} → ${mb(r.amount)} ${L("ลบ.", "M")})</li>`).join("")}</ul>
      <h4>${L("ข้อแนะนำ", "Suggestion")}</h4><span class="sub">${L("ขอคำอธิบายส่วนเพิ่มก่อนกลั่นกรองรอบที่ 2 · เกณฑ์จากกฎ BR-04 ใน M10", "Ask for an explanation before review round 2 · threshold from rule BR-04 in M10")}</span>`
      : `<p>${L(`ไม่มีคำขอที่เพิ่มขึ้นเกิน ${lim}%`, `No request grew more than ${lim}%`)}</p>`;
  }
  return `<p>${L("ในต้นแบบนี้ผู้ช่วยตอบได้เฉพาะคำถามตัวอย่าง ลองเลือกคำถามด้านล่าง", "In this prototype the assistant answers the sample questions only. Pick one below.")}</p>`;
}
VIEWS.assistant = () => `
  <div class="head"><div><div class="eyebrow">M09 · Budget Intelligence</div><h1>${L("วิเคราะห์และผู้ช่วย AI งบประมาณ", "Budget analytics and AI assistant")}</h1>
    <p>${L("ตอบจากข้อมูลที่บทบาท", "Answers use only data the role")} “${tx(ROLES[ROLE])}” ${L("มีสิทธิ์เข้าถึง พร้อมสมมติฐานและแหล่งข้อมูล", "can access, with assumptions and sources")}</p></div>
    <div class="sp"></div>${INTEL_TAB === "ask" ? `<button class="btn ghost" type="button" id="clear-chat">${L("เริ่มบทสนทนาใหม่", "New conversation")}</button>` : ""}</div>
  ${intelTabsBar()}
  ${INTEL_TAB !== "ask" ? INTEL[INTEL_TAB]() : `
  <section class="panel"><div class="body chat" id="chat"></div>
    <div class="body" style="border-top:1px solid var(--line);display:flex;flex-direction:column;gap:12px">
      <div class="chips" id="chips">${QUESTIONS.map((q, i) => `<button class="chip" type="button" data-q="${i}">${tx(q)}</button>`).join("")}</div>
      <form class="composer" id="composer"><input type="text" id="ask" placeholder="${L("พิมพ์คำถาม เช่น หน่วยงานใดเบิกจ่ายต่ำกว่าแผน", "Type a question, e.g. which units are behind plan")}" aria-label="${L("คำถาม", "Question")}"><button class="btn primary" type="submit">${L("ถาม", "Ask")}</button></form>
      <span class="sub">${L("AI สนับสนุนการตัดสินใจเท่านั้น การอนุมัติและปรับวงเงินทำโดยผู้มีอำนาจตามระเบียบ", "AI supports decisions only. Approvals and amount changes are made by authorised officials.")}</span></div></section>`}`;
function renderChat() {
  const c = $("#chat");
  c.innerHTML = S.chat.length ? S.chat.map(m => (m.u ? `<div class="msg u">${esc(m.q != null ? tx(QUESTIONS[m.q]) : m.t)}</div>` : `<div class="msg a">${answer(m.a)}</div>`)).join("")
    : `<div class="msg a">${L("ถามเรื่องแผน/ผลการใช้จ่าย คำของบประมาณ หรือทางเลือกการจัดสรรได้ เลือกคำถามตัวอย่างด้านล่างเพื่อเริ่ม", "Ask about spending, budget requests or allocation options. Pick a sample question below to start.")}</div>`;
  const last = c.lastElementChild; if (last) last.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function ask(text, qi) {
  if (!agentOn("AG-06")) { toast(L("Executive Budget Assistant ถูกปิดใช้งาน เปิดได้ที่แท็บ AI Agents", "The Executive Budget Assistant is off. Turn it on in the AI agents tab.")); return; }
  if (qi == null) {
    if (!text.trim()) return;
    const t = text.toLowerCase();
    qi = /เบิกจ่าย|behind|disburs|spend/.test(t) ? 0 : /ลด|cut|15/.test(t) ? 1 : /เพิ่ม|grew|increase|2571/.test(t) ? 2 : -1;
    S.chat.push({ u: true, t: text });
  } else S.chat.push({ u: true, q: qi });
  S.chat.push({ a: qi });
  audit(["ใช้ผู้ช่วย AI ตอบคำถาม", "Asked the AI assistant"], qi >= 0 ? tx(QUESTIONS[qi]) : text);
  S.aiLog.unshift({ t: nowIso(), agent: qi === 1 ? "AG-04" : "AG-06", user: me().id, action: qi >= 0 ? ["ตอบคำถาม", "Answered a question"] : ["คำถามนอกขอบเขตตัวอย่าง", "Question outside the samples"], target: qi >= 0 ? tx(QUESTIONS[qi]).slice(0, 60) : text.slice(0, 60), sources: qi >= 0 ? 2 : 0, ok: qi >= 0 });
  commit(); renderChat();
}
BIND.assistant = () => {
  $$("[data-itab]").forEach(b => (b.onclick = () => { INTEL_TAB = b.dataset.itab; route(); }));
  if (INTEL_TAB !== "ask") { (INTEL_BIND[INTEL_TAB] || (() => {}))(); return; }
  renderChat();
  $("#chips").onclick = e => { const b = e.target.closest("[data-q]"); if (b) ask("", Number(b.dataset.q)); };
  $("#composer").onsubmit = e => { e.preventDefault(); const i = $("#ask"); ask(i.value); i.value = ""; };
  $("#clear-chat").onclick = () => { S.chat = []; commit(); renderChat(); };
};
