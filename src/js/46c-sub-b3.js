// Fisko Budget round B3, submission (M05): minister approval before sending (section 25, FR-B-24), the
// submission pack in the Budget Bureau's report layout with a CSV for e-Budgeting (FR-B-23, D-B03), and a
// briefing pack with expected questions and draft answers (FR-B-25, agent AG-16, simulated).
SUB_TABS.splice(1, 0, { id: "pack", label: ["ชุดยื่นตามแบบสำนักงบประมาณ", "Budget Bureau pack"] });
SUB_TABS.push({ id: "brief", label: ["ชุดชี้แจง", "Briefing pack"] });
const progOf = r => { const l = lineage(r.act); return l[0] || null; }, outOf = r => { const l = lineage(r.act); return l.find(n => n.lvl === "output") || null; };
const qOf = r => r.qplan || (typeof qplanFill === "function" ? qplanFill(r) : [0, 0, 0, 0]);

// ---------- pack ----------
function packCsv(P) {
  const head = ["request", "programme", "output", "activity", "unit", "budget_type", "item", "qty", "unit_price", "total", "q1", "q2", "q3", "q4"];
  const rows = [];
  P.forEach(r => {
    const lin = lineage(r.act), pr = lin[0], ou = lin.find(n => n.lvl === "output"), ac = lin[lin.length - 1], tot = reqAmount(r) || 1, q = qOf(r);
    r.items.forEach(it => { const t = itemTotal(it); rows.push([r.id, pr ? pr.code : "", ou ? ou.code : "", ac ? ac.code : "", unitOf(r.unit).code, it.type, tx(it.name), it.qty, it.price, t, ...q.map(v => Math.round(Number(v) * t / tot))]); });
  });
  const cell = v => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [head, ...rows].map(r => r.map(cell).join(",")).join("\n");
}
SUB.pack = () => {
  const P = pkg(), M = L("ลบ.", "M"), tot = sumv(P.map(subAmt));
  const progs = {}; P.forEach(r => { const p = progOf(r), k = p ? p.id : "-"; (progs[k] = progs[k] || { p, rs: [] }).rs.push(r); });
  const byT = BUDGET_TYPES.map(t => [t, sumv(P.flatMap(r => r.items.filter(i => i.type === t.id).map(itemTotal)))]).filter(x => x[1]);
  const ranked = P.filter(r => !isPersonnel(r)).map(r => ({ r, s: scoreOf(r) })).sort((a, b) => b.s - a.s);
  const multi = P.filter(r => r.multi && r.years), yrs = [...new Set(multi.flatMap(r => Object.keys(r.years)))].sort();
  const q = [0, 1, 2, 3].map(i => sumv(P.map(r => Number(qOf(r)[i] || 0))));
  const sec = (no, title, body) => `<section class="panel form-sheet"><header><span class="mono sub">${no}</span><h2>${title}</h2></header>${body}</section>`;
  return `<div class="alert"><div class="ic">i</div><div><b>${L("สร้างจากคำขอที่เห็นชอบแล้ว", "Built from the approved requests")} (${P.length})</b><p>${L("รูปแบบตามแบบรายงานคำของบประมาณของหน่วยรับงบประมาณในคู่มือสำนักงบประมาณ ปี CUR_FY · ไฟล์สำหรับนำเข้า e-Budgeting เป็น CSV จนกว่าจะได้ข้อกำหนดรูปแบบ (D-B03)", "Laid out like the agency request reports in the Budget Bureau FY2570 manual · the e-Budgeting file is CSV until the format is confirmed (D-B03)")}</p></div></div>
    ${sec("1", L("แบบสรุปคำของบประมาณรายจ่ายของหน่วยงาน", "Agency request summary"), `<div class="tbl-wrap"><table><thead><tr><th>${L("แผนงาน / ผลผลิต", "Programme / output")}</th><th class="n">${L("คำขอ", "Requests")}</th><th class="n">${M}</th><th class="n">%</th></tr></thead><tbody>
      ${Object.values(progs).map(g => `<tr><td><b>${g.p ? `${g.p.code} ${esc(tx(g.p.name))}` : L("ไม่ระบุแผนงาน", "No programme")}</b></td><td class="n">${g.rs.length}</td><td class="n"><b>${mb(sumv(g.rs.map(subAmt)))}</b></td><td class="n">${fmt(tot ? sumv(g.rs.map(subAmt)) / tot * 100 : 0, 1)}</td></tr>
        ${[...new Set(g.rs.map(r => (outOf(r) || {}).id))].map(oid => { const rs = g.rs.filter(r => (outOf(r) || {}).id === oid), o = outOf(rs[0]); return `<tr><td style="padding-left:28px">${o ? `${o.code} ${esc(tx(o.name))}` : L("ไม่ระบุผลผลิต", "No output")}</td><td class="n">${rs.length}</td><td class="n">${mb(sumv(rs.map(subAmt)))}</td><td></td></tr>`; }).join("")}`).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${P.length}</td><td class="n">${mb(tot)}</td><td class="n">100</td></tr></tfoot></table></div>`)}
    ${sec("2", L("รายละเอียดกิจกรรม เรียงตามลำดับความสำคัญ", "Activities by priority"), `<div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("คำขอ / กิจกรรม", "Request / activity")}</th><th class="n">${L("คะแนน 5 เกณฑ์", "Five-criteria score")}</th><th class="n">${M}</th></tr></thead><tbody>
      ${ranked.map((x, i) => `<tr><td>${i + 1}</td><td><span class="mono">${x.r.id}</span> ${esc(tx(x.r.name))}<div class="sub">${esc(actLabel(x.r.act))}</div></td><td class="n">${fmt(x.s, 0)}</td><td class="n">${mb(subAmt(x.r))}</td></tr>`).join("")}</tbody></table></div>`)}
    ${sec("3", L("รายละเอียดงบประมาณจำแนกตามงบรายจ่าย", "Detail by budget type"), `<div class="tbl-wrap"><table><thead><tr><th>${L("งบรายจ่าย", "Budget type")}</th><th class="n">${M}</th><th class="n">%</th></tr></thead><tbody>${byT.map(([t, v]) => `<tr><td>${tx(t.name)}</td><td class="n">${mb(v)}</td><td class="n">${fmt(v / Math.max(1, sumv(byT.map(x => x[1]))) * 100, 1)}</td></tr>`).join("")}</tbody></table></div>`)}
    ${multi.length ? sec("4", L("รายการก่อหนี้ผูกพันข้ามปีงบประมาณ", "Multi-year commitments"), `<div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th>${yrs.map(y => `<th class="n">${y}</th>`).join("")}<th class="n">${L("รวม", "Total")}</th></tr></thead><tbody>${multi.map(r => `<tr><td><span class="mono">${r.id}</span> ${esc(tx(r.name))}</td>${yrs.map(y => `<td class="n">${r.years[y] != null ? mb(r.years[y]) : "–"}</td>`).join("")}<td class="n">${mb(sumv(Object.values(r.years).map(Number)))}</td></tr>`).join("")}</tbody></table></div>`) : ""}
    ${sec("5", L("แผนการปฏิบัติงานและแผนการใช้จ่ายรายไตรมาส (สงป.301/302)", "Quarterly work and spending plan (สงป.301/302)"), `<div class="tbl-wrap"><table><thead><tr><th></th>${q.map((_, i) => `<th class="n">${L("ไตรมาส", "Q")} ${i + 1}</th>`).join("")}<th class="n">${L("รวม", "Total")}</th></tr></thead><tbody><tr><td>${L("แผนการใช้จ่าย", "Spending plan")} (${M})</td>${q.map(v => `<td class="n">${mb(v)}</td>`).join("")}<td class="n">${mb(sumv(q))}</td></tr>
      <tr><td>${L("สะสม", "Cumulative")}</td>${q.map((_, i) => `<td class="n">${fmt(sumv(q) ? sumv(q.slice(0, i + 1)) / sumv(q) * 100 : 0, 0)}%</td>`).join("")}<td></td></tr></tbody></table></div>`)}
    <section class="panel"><header>${chipIco("download", "info")}<h2>${L("ไฟล์สำหรับนำเข้า e-Budgeting (CSV)", "File for e-Budgeting (CSV)")}</h2><span class="sp"></span><button class="btn" type="button" id="pk-copy">${L("คัดลอก CSV", "Copy CSV")}</button></header>
      <div class="body"><details><summary class="sub">${L("ดูข้อมูล", "Show data")} · ${sumv(P.map(r => r.items.length))} ${L("บรรทัด", "lines")}</summary><pre class="minutes" id="pk-csv">${esc(packCsv(P))}</pre></details></div></section>`;
};

// ---------- briefing pack ----------
function briefQs(r) {
  const out = [], g = r.prev ? (r.amount / r.prev - 1) * 100 : null, rd = typeof readiness === "function" ? readiness(r) : 0, inv = r.items.some(i => i.type === "inv");
  if (g != null && g > ((rule("BR-04") || {}).param || 20)) out.push([[`ทำไมวงเงินเพิ่มขึ้น ${fmt(g, 1)}% จากปีก่อน`, `Why is it ${fmt(g, 1)}% higher than last year?`], [`ส่วนที่เพิ่มเป็น${inv ? "งบลงทุน" : "ค่าใช้จ่ายดำเนินงาน"}เพื่อ ${tx(r.kpi) || tx(r.name)} ตามเหตุผลในคำขอ: ${tx(r.reason).slice(0, 120)}`, `The increase is ${inv ? "investment" : "operating spend"} for ${tx(r.kpi) || tx(r.name)}, as the request explains: ${tx(r.reason).slice(0, 120)}`]]);
  if (!r.prev) out.push([["เป็นโครงการใหม่ ทำไมต้องเริ่มปีนี้", "It is new: why start this year?"], [`ตอบความต้องการตามตัวชี้วัด ${kpisForAct(r.act).map(x => x.k.id).join(", ") || "-"} และพร้อมดำเนินการ (คะแนนความพร้อม ${fmt(rd, 1)})`, `It serves KPI ${kpisForAct(r.act).map(x => x.k.id).join(", ") || "-"} and is ready to start (readiness ${fmt(rd, 1)})`]]);
  if (inv && rd && rd < 4) out.push([["พร้อมดำเนินการได้ทันทีหรือไม่", "Can it start straight away?"], [`ความพร้อมอยู่ที่ ${fmt(rd, 1)}/5 · ${(r.risks || []).length} ความเสี่ยงที่มีแนวทางแก้ไข`, `Readiness is ${fmt(rd, 1)}/5 · ${(r.risks || []).length} risks with mitigation`]]);
  if (r.multi) out.push([["ภาระผูกพันในปีต่อไปเท่าไร", "What does it commit in later years?"], [Object.keys(r.years || {}).map(y => `${y}: ${mb(r.years[y])} ลบ.`).join(" · "), Object.keys(r.years || {}).map(y => `${y}: ${mb(r.years[y])} M`).join(" · ")]]);
  if (ICT_RE.test(tx(r.name))) out.push([["ซ้ำซ้อนกับระบบของหน่วยงานอื่นหรือไม่", "Does it duplicate another agency's system?"], ["ตรวจกับบัญชีระบบกลางแล้ว และได้รับความเห็นชอบตามเกณฑ์โครงการ ICT", "Checked against the central system register, and approved under the ICT rules"]]);
  if (r.zbb) out.push([["(ฐานศูนย์) ทำไมยังต้องใช้วงเงินนี้", "(Zero-based) Why is this amount still needed?"], [r.zbbNote || "—", r.zbbNote || "—"]]);
  return out;
}
SUB.brief = () => {
  const P = pkg().filter(r => !isPersonnel(r)), obs = S.observations || [], drafted = S.briefDrafted;
  return `<section class="panel"><header>${chipIco("book", "info")}<h2>${L("ข้อสังเกตของกรรมาธิการปีก่อนและการตอบสนอง", "Last year's scrutiny committee observations and our response")}</h2></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ข้อสังเกต", "Observation")}</th><th>${L("สิ่งที่หน่วยงานทำ", "What we did")}</th></tr></thead><tbody>${obs.map(o => `<tr><td>${esc(tx(o.text))}</td><td class="sub">${esc(tx(o.resp))}</td></tr>`).join("") || `<tr><td colspan="2" class="sub">${L("ไม่มี", "None")}</td></tr>`}</tbody></table></div></section>
    <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><span class="sub">${L("สรุปหนึ่งหน้าต่อคำขอ พร้อมคำถามที่คาดว่าจะถูกถามจากสำนักงบประมาณ ครม. และกรรมาธิการ", "One page per request, with questions the Budget Bureau, Cabinet or committee are likely to ask")}</span>
      ${ROLE === "plan" ? `<button class="btn primary" type="button" id="br-ai">${svgI("sparkle")} ${drafted ? L("ร่างคำตอบใหม่ (AG-16)", "Redraft answers (AG-16)") : L("ให้ AI ร่างคำตอบ (AG-16)", "Have AI draft the answers (AG-16)")}</button>` : ""}</div>
    <div class="brief-grid">${P.map(r => { const ks = kpisForAct(r.act), qs = briefQs(r), g = r.prev ? (r.amount / r.prev - 1) * 100 : null;
      return `<section class="panel brief"><header><span class="mono sub">${r.id}</span><h2>${esc(tx(r.name))}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:8px">
        <div class="row" style="gap:16px;flex-wrap:wrap"><span><b class="num">${mb(subAmt(r))}</b> ${L("ลบ.", "M")}</span><span class="sub">${g == null ? L("โครงการใหม่", "New") : `${g >= 0 ? "+" : ""}${fmt(g, 1)}% ${L("จากปีก่อน", "vs last year")}`}</span><span class="sub">${unitName(r.unit)}</span></div>
        <div class="sub">${ks.map(x => `${x.k.id} ${esc(tx(x.k.name))} · ${L("เป้า", "target")} ${fmt(x.k.targets[0], x.k.targets[0] % 1 ? 1 : 0)} ${tx(x.k.unit)}`).join("<br>") || L("ไม่มีตัวชี้วัด", "No KPI")}</div>
        ${qs.length ? `<ol class="brief-q">${qs.map(([q, a]) => `<li><b>${tx(q)}</b>${drafted ? `<div class="sub">${esc(tx(a))}</div>` : ""}</li>`).join("")}</ol>` : `<span class="sub">${L("ไม่มีประเด็นที่คาดว่าจะถูกถาม", "No likely questions")}</span>`}</div></section>`; }).join("")}</div>
    ${drafted ? `<p class="sub">${L("คำตอบร่างโดย AI จากข้อมูลคำขอ · ตรวจทานก่อนใช้ชี้แจง", "Answers drafted by AI from the request data · review before the hearing")}</p>` : ""}`;
};

// ---------- minister approval ----------
{
  const bs = SUB.status;
  SUB.status = () => {
    const sb = S.submission, mn = sb.minister, pl = ROLE === "plan";
    const box = `<section class="panel"><header>${chipIco("award", mn ? "ok" : "warn")}<h2>${L("รัฐมนตรีเจ้าสังกัดเห็นชอบ (มาตรา 25)", "Minister's approval (section 25)")}</h2><span class="sp"></span>${mn ? tag(L("เห็นชอบแล้ว", "Approved"), "p-ok") : tag(L("ต้องได้ก่อนส่ง", "Needed before sending"), "p-warn")}</header>
      <div class="body">${mn ? `<span>${L("หนังสือที่", "Letter no.")} <b class="mono">${esc(mn.no)}</b> · ${fdate(mn.date)} · ${L("บันทึกโดย", "recorded by")} ${esc(userName(mn.by))}</span>`
        : pl && sb.status === "preparing" ? `<div class="inline-form"><div class="f"><label for="mn-no">${L("เลขที่หนังสือ", "Letter number")}</label><input type="text" id="mn-no" placeholder="${L("เช่น ตย 0201/1234", "e.g. ตย 0201/1234")}"></div><div class="f" style="flex:0 1 180px"><label for="mn-date">${L("วันที่", "Date")}</label><input type="date" id="mn-date" value="${TODAY}"></div><button class="btn primary" type="button" id="mn-save">${L("บันทึกความเห็นชอบ", "Record the approval")}</button></div>`
        : `<span class="sub">${L("กองแผนงานบันทึกเมื่อได้รับหนังสือ", "Planning records it when the letter arrives")}</span>`}</div></section>`;
    return box + bs();
  };
  const bb = BIND.submission;
  BIND.submission = () => {
    bb();
    const sb = S.submission, send = $("#sub-send");
    if (send && !sb.minister) { send.disabled = true; send.title = L("ต้องบันทึกความเห็นชอบของรัฐมนตรีก่อน", "Record the minister's approval first"); }
    const ms = $("#mn-save"); if (ms) ms.onclick = () => {
      const no = $("#mn-no").value.trim(); if (!no) { toast(L("ใส่เลขที่หนังสือก่อน", "Enter the letter number first")); return; }
      sb.minister = { no, date: $("#mn-date").value || TODAY, by: me().id };
      audit(["บันทึกความเห็นชอบของรัฐมนตรี", "Recorded the minister's approval"], no); commit(); route(); toast(L("บันทึกแล้ว · ส่งชุดข้อมูลได้", "Recorded · the package can be sent"));
    };
    const pc = $("#pk-copy"); if (pc) pc.onclick = () => { const t = $("#pk-csv").textContent; try { navigator.clipboard.writeText(t).then(() => toast(L("คัดลอก CSV แล้ว", "CSV copied")), () => toast(L("เปิด “ดูข้อมูล” แล้วเลือกข้อความ", "Open “Show data” and select the text"))); } catch (e) { toast(L("เปิด “ดูข้อมูล” แล้วเลือกข้อความ", "Open “Show data” and select the text")); } };
    const ba = $("#br-ai"); if (ba) ba.onclick = () => {
      if (!agentOn("AG-16")) { toast(L("ผู้เตรียมชี้แจงถูกปิดใช้งานใน M09", "The briefing agent is switched off in M09")); return; }
      S.briefDrafted = true; S.aiLog.unshift({ t: nowIso(), agent: "AG-16", user: me().id, action: ["ร่างคำตอบชุดชี้แจง", "Drafted briefing answers"], target: `${pkg().length}`, sources: 3, ok: true });
      audit(["ใช้ AI ร่างคำตอบชุดชี้แจง", "Used AI to draft briefing answers"], ""); commit(); route();
    };
  };
}

// ---------- seed ----------
function seedBudgetB3Sub(s) {
  s.observations = [
    { text: ["ควรเร่งรัดการเบิกจ่ายงบลงทุนให้เป็นไปตามแผน", "Speed up investment spending to plan"], resp: ["ตั้งเป้าก่อหนี้ผูกพันภายในไตรมาส 2 และติดตามรายเดือนใน M07", "Commit investment within Q2 and track monthly in M07"] },
    { text: ["ระบบสารสนเทศควรบูรณาการกับหน่วยงานอื่น ไม่ซ้ำซ้อน", "IT systems should integrate with other agencies, not duplicate them"], resp: ["ตรวจกับบัญชีระบบกลางก่อนเสนอทุกโครงการ ICT", "Check the central system register before proposing any ICT project"] },
    { text: ["ตัวชี้วัดควรวัดผลลัพธ์ต่อประชาชน ไม่ใช่เพียงผลผลิต", "KPIs should measure outcomes for citizens, not only outputs"], resp: ["เพิ่มตัวชี้วัดเวลาเฉลี่ยในการรับบริการ (K2)", "Added the average service time KPI (K2)"] },
  ];
  if (!s.agents.some(a => a.id === "AG-16")) s.agents.push({ id: "AG-16", on: true, uses: 0, name: ["Hearing Prep Agent", "Hearing Prep Agent"], what: ["เตรียมชุดชี้แจง คำถามที่คาด และคำตอบร่าง", "Prepares the briefing pack, likely questions and draft answers"] });
}
