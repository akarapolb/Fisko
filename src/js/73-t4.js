// Fisko Procurement round 40 (T4 of design v0.3, chapter 18): a forms catalogue with documents made from a case (FR-PR-81),
// a simulated e-mail outbox and signature status (FR-PR-82), an announcement record with publication channels (FR-PR-84),
// an organisation-wide conflict-of-interest report (FR-PR-83) and a simulated legal-entity check with ERP codes (FR-PR-86).
// Sending, signing and the entity lookup are simulated (D-P17, D-P18); nothing leaves the prototype.

[["forms", "แบบฟอร์ม อีเมล และลายมือชื่อ (จำลอง)", "Forms, e-mail and signature status (simulated)", "ผนวก 12 s.5; 4.8; 4.18"], ["coiRep", "รายงานผลประโยชน์ทับซ้อนระดับหน่วยงาน", "Organisation-wide conflict-of-interest report", "4.10.2; 5.1.3–5.1.4"], ["entity", "ตรวจข้อมูลนิติบุคคลผู้ขาย (จำลอง)", "Legal-entity check of suppliers (simulated)", "3.2.2; 5.2"]]
  .forEach(([k, th, en, tor]) => PROF_FEATS.push({ k, round: "T4", gov: true, soe: true, th, en, tor, built: true }));
Object.assign(DOC_TYPES, { memo: ["บันทึกข้อความ", "Memo"], ltr: ["หนังสือ", "Letter"], ann: ["ประกาศ", "Announcement"] });

function seedT4(s) {
  s.prof.p4 = { mailRepeatDays: 3 };
  Object.assign(s.docno.fmt, { memo: { pfx: "บก", pad: 3, unit: true }, ltr: { pfx: "ที่ พด", pad: 3, unit: false }, ann: { pfx: "ปก", pad: 3, unit: false } });
  s.pdocs = []; s.outbox = []; s.coiRep = [];
  s.vendors.forEach((v, i) => { v.email = `sales${i + 1}@vendor${i + 1}.example.co.th`; v.erpCode = ""; v.entity = null; });
}
const P4 = () => S.prof.p4;

// ---------- the catalogue ----------
const D = d => fdate(d || TODAY);
const names = (c, k) => { const cm = (c.committees || {})[k]; return cm ? [userName(cm.chair) + " (ประธาน)", ...cm.members.map(userName)].join(", ") : "—"; };
const FORM_G = { memo: ["บันทึกข้อความ", "Memos"], ltr: ["หนังสือ", "Letters"], ann: ["ประกาศ", "Announcements"] };
const FORM_T = [
  { id: "m-approve", g: "memo", th: "บันทึกขออนุมัติจัดซื้อจัดจ้าง", en: "Request to approve the procurement", fn: x => `เรื่อง ขออนุมัติจัดซื้อจัดจ้าง ${x.nm}\nเรียน ${tx(ROLES.exec)}\n\nตามที่ ${unitName(famLine(x.c.line).unit)} ขอซื้อขอจ้าง ${x.nm} วงเงิน ${fmt(planEst(x.c))} บาท จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติหลักการและวิธี${x.meth}\n\n(ลงชื่อ) ${x.me}\nเจ้าหน้าที่พัสดุ` },
  { id: "m-tor", g: "memo", th: "บันทึกแต่งตั้งคณะกรรมการจัดทำ TOR และราคากลาง", en: "Appoint the TOR and reference-price committee", fn: x => `เรื่อง ขอแต่งตั้งคณะกรรมการจัดทำ TOR และราคากลาง ${x.nm}\nเรียน ${tx(ROLES.exec)}\n\nเพื่อให้การจัดซื้อจัดจ้าง ${x.nm} เป็นไปตามระเบียบ จึงเสนอแต่งตั้งคณะกรรมการ ดังนี้\n${names(x.c, "tor")}\n\nทั้งนี้กรรมการทุกคนต้องแจ้งผลประโยชน์ทับซ้อนก่อนเริ่มงาน\n\n(ลงชื่อ) ${x.me}` },
  { id: "m-ref", g: "memo", th: "บันทึกขออนุมัติราคากลาง", en: "Request to approve the reference price", fn: x => `เรื่อง ขออนุมัติราคากลาง ${x.nm}\nเรียน ${tx(ROLES.exec)}\n\nคณะกรรมการได้กำหนดราคากลาง ${x.c.ref ? fmt(x.c.ref.amount) : "…"} บาท จากแหล่งอ้างอิง ${x.c.ref ? x.c.ref.basis.join(", ") : "…"} ${(x.c.market || []).length ? `และการสำรวจตลาด ${x.c.market.length} ราย` : ""}\nจึงเรียนมาเพื่อโปรดพิจารณา\n\n(ลงชื่อ) ${x.me}` },
  { id: "m-eval", g: "memo", th: "บันทึกแต่งตั้งคณะกรรมการพิจารณาผล", en: "Appoint the evaluation committee", fn: x => `เรื่อง ขอแต่งตั้งคณะกรรมการพิจารณาผลการประกวดราคา ${x.nm}\nเรียน ${tx(ROLES.exec)}\n\nเสนอแต่งตั้งคณะกรรมการ ดังนี้\n${names(x.c, x.c.method === "selective" ? "buy" : "eval")}\n\n(ลงชื่อ) ${x.me}` },
  { id: "m-award", g: "memo", th: "บันทึกขออนุมัติผลการพิจารณา", en: "Request to approve the evaluation result", need: "award", fn: x => `เรื่อง ขออนุมัติผลการพิจารณา ${x.nm}\nเรียน ${tx(ROLES.exec)}\n\nคณะกรรมการพิจารณาผลเห็นว่า ${x.win} เสนอราคา ${fmt(x.c.award.price)} บาท ผ่านเกณฑ์และเป็นผู้ชนะ ${x.c.award.minutes ? "มติ: " + x.c.award.minutes : ""}\nจึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ\n\n(ลงชื่อ) ${x.me}` },
  { id: "m-accept", g: "memo", th: "บันทึกตรวจรับพัสดุ", en: "Acceptance record", need: "contract", fn: x => `เรื่อง ผลการตรวจรับ ${x.nm}\nสัญญาเลขที่ ${x.k.no} ผู้ขาย ${x.ven}\n\nคณะกรรมการตรวจรับ: ${x.k.inspectors.map(userName).join(", ")}\n${x.k.phases.map(ph => `งวด ${tx(ph.name)}: ${phaseAccepted(ph) ? "ตรวจรับแล้ว" : "ยังไม่ตรวจรับ"}`).join("\n")}\n\n(ลงชื่อ) ${x.me}` },
  { id: "l-invite", g: "ltr", th: "หนังสือเชิญเสนอราคา", en: "Invitation to quote", need: "vendor", fn: x => `เรื่อง เชิญเสนอราคา ${x.nm}\nเรียน ${x.ven}\n\n${unitName(famLine(x.c.line).unit)} มีความประสงค์จัดซื้อจัดจ้าง ${x.nm} วงเงินไม่เกิน ${fmt(x.c.ref ? x.c.ref.amount : planEst(x.c))} บาท จึงขอเชิญท่านเสนอราคาภายในวันที่ ${x.due}\n\nขอแสดงความนับถือ\n${x.me}` },
  { id: "l-award", g: "ltr", th: "หนังสือแจ้งผู้ชนะ", en: "Winner notification", need: "award", fn: x => `เรื่อง แจ้งผลการพิจารณา ${x.nm}\nเรียน ${x.win}\n\nตามที่ท่านเสนอราคา ${fmt(x.c.award.price)} บาท คณะกรรมการพิจารณาผลแล้วเห็นว่าผ่านเกณฑ์ จึงขอให้มาทำสัญญาภายใน 7 วันนับแต่พ้นระยะอุทธรณ์ (${x.c.award.appealEnd ? D(x.c.award.appealEnd) : "ไม่มีช่วงอุทธรณ์"})\n\nขอแสดงความนับถือ\n${x.me}` },
  { id: "l-others", g: "ltr", th: "หนังสือแจ้งผู้ไม่ได้รับคัดเลือก", en: "Notice to unsuccessful bidders", need: "award", fn: x => `เรื่อง แจ้งผลการพิจารณา ${x.nm}\nเรียน ${x.ven}\n\nตามที่ท่านเสนอราคา ${x.nm} ขอเรียนว่าได้ประกาศผู้ชนะแล้ว ท่านมีสิทธิอุทธรณ์ภายใน ${S.pcfg.appealDays} วันทำการ นับแต่วันที่ ${D(x.c.award.date)}\n\nขอแสดงความนับถือ\n${x.me}` },
  { id: "l-bsec", g: "ltr", th: "หนังสือคืนหลักประกันการเสนอราคา", en: "Bid security return letter", need: "vendor", fn: x => { const b = (x.c.bsec || []).find(y => normName(y.who) === normName(x.ven)); return `เรื่อง คืนหลักประกันการเสนอราคา ${x.nm}\nเรียน ${x.ven}\n\n${b ? `ตามที่ท่านวางหลักประกัน (${tx(BS_TYPE[b.type])}) จำนวน ${fmt(b.amount)} บาท มีผลถึง ${D(b.to)}` : "ตามที่ท่านวางหลักประกันการเสนอราคา"} บัดนี้ ${unitName(famLine(x.c.line).unit)} ขอคืนหลักประกันดังกล่าว โปรดมารับภายใน 15 วัน\n\nขอแสดงความนับถือ\n${x.me}`; } },
  { id: "l-guar", g: "ltr", th: "หนังสือคืนหลักประกันสัญญา", en: "Contract guarantee return letter", need: "contract", fn: x => `เรื่อง คืนหลักประกันสัญญา ${x.k.no}\nเรียน ${x.ven}\n\nตามสัญญาเลขที่ ${x.k.no} ${x.k.guarantee ? `หลักประกัน ${fmt(x.k.guarantee.amount)} บาท มีผลถึง ${D(x.k.guarantee.expires)}` : ""} บัดนี้พ้นระยะความรับผิดชอบตามสัญญาแล้ว จึงขอคืนหลักประกันให้ท่าน\n\nขอแสดงความนับถือ\n${x.me}` },
  { id: "l-drawing", g: "ltr", th: "หนังสือแจ้งผลอนุมัติแบบ (MN)", en: "Drawing approval letter", need: "contract", fn: x => { const r = x.k.drw && x.k.drw.rounds.slice(-1)[0]; return `เรื่อง ผลการพิจารณาแบบ ${x.nm}\nเรียน ${x.ven}\n\nตามที่ท่านส่งแบบ ${r ? `เมื่อวันที่ ${D(r.recv)} (${r.mn})` : ""} ผลการพิจารณา: ${r ? (r.status === "approved" ? "อนุมัติ" : r.status === "rejected" ? "ส่งกลับแก้ไข " + (r.note || "") : "อยู่ระหว่างพิจารณา") : "—"}\n\nขอแสดงความนับถือ\n${x.me}`; } },
  { id: "l-appeal", g: "ltr", th: "หนังสือแจ้งผลอุทธรณ์", en: "Appeal result letter", need: "award", fn: x => { const f = x.c.appeal && x.c.appeal.fwd; return `เรื่อง ผลการพิจารณาอุทธรณ์ ${x.nm}\nเรียน ${x.ven}\n\n${f ? `เรื่องอุทธรณ์ได้ส่ง${f.to}ตามแบบ ${f.no} ผลการพิจารณา${f.result ? (f.result === "upheld" ? "ฟังขึ้น" : "ฟังไม่ขึ้น") + " หนังสือเลขที่ " + f.ref : "ยังไม่ได้รับ"}` : "ผลการพิจารณาอุทธรณ์: —"}\n\nขอแสดงความนับถือ\n${x.me}`; } },
  { id: "a-invite", g: "ann", th: "ประกาศเชิญชวน (e-bidding)", en: "Invitation announcement", fn: x => `ประกาศ ${unitName(famLine(x.c.line).unit)}\nเรื่อง ประกาศเชิญชวนเสนอราคา ${x.nm} ด้วยวิธี${x.meth}\n\nวงเงินงบประมาณ ${fmt(planEst(x.c))} บาท ราคากลาง ${x.c.ref ? fmt(x.c.ref.amount) : "…"} บาท\n${x.c.egp ? `โครงการเลขที่ ${x.c.egp.no} ประกาศวันที่ ${D(x.c.egp.announce)} ยื่นข้อเสนอถึงวันที่ ${D(x.c.egp.close)}` : "กำหนดวันประกาศและวันยื่นข้อเสนอ: …"}\n\nประกาศ ณ วันที่ ${D()}` },
  { id: "a-win", g: "ann", th: "ประกาศผู้ชนะการเสนอราคา", en: "Winner announcement", need: "award", fn: x => `ประกาศ ${unitName(famLine(x.c.line).unit)}\nเรื่อง ประกาศผู้ชนะการเสนอราคา ${x.nm}\n\nผู้ชนะ: ${x.win} ราคา ${fmt(x.c.award.price)} บาท วันที่ประกาศ ${D(x.c.award.date)}\n\nประกาศ ณ วันที่ ${D()}` },
  { id: "a-plan", g: "ann", th: "ประกาศแผนการจัดซื้อจัดจ้าง", en: "Procurement plan announcement", fn: x => `ประกาศ ${unitName(famLine(x.c.line).unit)}\nเรื่อง ประกาศแผนการจัดซื้อจัดจ้าง ปีงบประมาณ ${FAM_FY}\n\nรายการ ${x.nm} วงเงิน ${fmt(planEst(x.c))} บาท วิธี${x.meth} กำหนดเดือน ${fdate(famPlan(x.c.plan).month)}\n\nประกาศ ณ วันที่ ${D()}` },
];
const SIGN_ROLES = { prochead: ["หัวหน้าเจ้าหน้าที่พัสดุ", "Head of procurement"], exec: ["ผู้บริหาร", "Executive"] };
const PUB_CH = { site: ["เว็บไซต์ของหน่วยงาน", "Agency website"], egp: ["ระบบ e-GP", "e-GP"], board: ["ป้ายประกาศ", "Notice board"] };
const docLocked = d => !!(d.sign && d.sign.signed);
function formText(tpl, c, k, ven) {
  const x = { c, k, nm: caseName(c), meth: tx(PMETHOD[c.method] || ["ตามแผน", "as planned"]), me: userName(me().id), win: c.award ? tx(c.award.winner) : "", ven: ven || (k ? tx(k.vendor) : c.award ? tx(c.award.winner) : "…"), due: D(addDays(TODAY, S.prof.p ? S.prof.p.rfqDays : 3)) };
  return tpl.fn(x);
}
const docMail = d => (S.vendors.find(v => normName(v.name) === normName(d.ven)) || {}).email || "";

// ---------- tab: forms and e-mail ----------
let FORM_G_SEL = "";
const FORM_ST = (d) => d.sign && d.sign.signed ? tag(L("ลงนามแล้ว (จำลอง)", "Signed (simulated)"), "p-ok") : d.sign ? tag(L("รอลงนาม", "Waiting for a signature"), "p-info") : tag(L("ร่าง", "Draft"), "p-mute");
const remindCands = () => { const out = [];
  S.cases.filter(c => !c.cancelled).forEach(c => (c.rfq || []).forEach((r, ri) => r.rows.forEach((x, xi) => { if (!x.reply && r.due < TODAY) out.push({ key: `rfq|${c.id}|${ri}|${xi}`, to: x.v, subject: `เตือน: ขอให้ตอบใบสอบถามราคา ${r.no}`, body: `เรียน ${x.v}\nขอเตือนให้ตอบใบสอบถามราคา ${r.no} (${caseName(c)}) ซึ่งครบกำหนดวันที่ ${D(r.due)}\n${unitName(famLine(c.line).unit)}` }); })));
  S.contracts.forEach(k => k.phases.forEach(ph => { if (!ph.delivered && !phaseAccepted(ph) && !ph.cancelled && phDue(ph) < TODAY) out.push({ key: `ph|${k.id}|${ph.n}`, to: tx(k.vendor), subject: `เร่งรัดการส่งมอบ สัญญา ${k.no}`, body: `เรียน ${tx(k.vendor)}\nสัญญา ${k.no} ${tx(ph.name)} ครบกำหนดส่งมอบวันที่ ${D(phDue(ph))} ยังไม่ได้รับแจ้งการส่งมอบ ขอเร่งรัดให้ส่งมอบโดยเร็ว หากล่าช้าจะถูกปรับตามสัญญา\n${unitName(famLine(k.line).unit)}` }); }));
  return out; };
const lastMail = key => (S.outbox || []).find(m => m.key === key);
PROC.forms = () => {
  if (!feat("forms")) return `<div class="panel"><div class="body"><h2 style="margin:0 0 6px">${L("ปิดอยู่", "Off")}</h2><p class="sub">${L("เปิดได้ที่ M10 → โปรไฟล์จัดซื้อ", "It can be switched on in M10, Procurement profile")}</p></div></div>`;
  const ed = isProcRole(), Dc = (S.pdocs || []).filter(d => !FORM_G_SEL || d.g === FORM_G_SEL), rc = remindCands(), cases = S.cases.filter(c => !c.cancelled);
  return `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("เอกสารและอีเมลเป็นการจำลอง ไม่มีการส่งออกจริง", "Documents, e-mail and signatures are simulated; nothing leaves the prototype")}</b><p>${L("เลือกแบบฟอร์มและแฟ้ม ระบบเติมข้อมูลจากแฟ้ม ออกเลขที่อัตโนมัติ แก้ข้อความได้จนกว่าจะลงนาม หนังสือและประกาศส่งออกได้เมื่อลงนามแล้ว", "Pick a form and a case; the system fills it from the case and numbers it. The text can be edited until signed. Letters and announcements can go out once signed.")} ${FORM_T.length} ${L("แบบเริ่มต้น", "starter forms")} (D-P21).</p></div></div>
  ${ed ? `<section class="panel"><header><h2>${L("สร้างเอกสารจากแม่แบบ", "New document from a form")}</h2><span class="sp"></span><span class="mono sub">FR-PR-81</span></header><div class="body"><form class="inline-form" id="fm-new">
    <div class="f" style="flex:2 1 260px"><label for="fm-t">${L("แบบฟอร์ม", "Form")}</label><select id="fm-t">${Object.keys(FORM_G).map(g => `<optgroup label="${tx(FORM_G[g])}">${FORM_T.filter(t => t.g === g).map(t => `<option value="${t.id}">${tx([t.th, t.en])}</option>`).join("")}</optgroup>`).join("")}</select></div>
    <div class="f" style="flex:2 1 240px"><label for="fm-c">${L("แฟ้มจัดซื้อ", "Case")}</label><select id="fm-c">${cases.map(c => `<option value="${c.id}">${c.id} · ${esc(caseName(c))}</option>`).join("")}</select></div>
    <div class="f" style="flex:1 1 200px"><label for="fm-v">${L("ผู้รับ (ผู้ขาย) ถ้ามี", "Recipient supplier, if any")}</label><select id="fm-v"><option value="">—</option>${S.vendors.map(v => `<option>${esc(v.name)}</option>`).join("")}</select></div><button class="btn primary" type="submit">${L("สร้างร่าง", "Make a draft")}</button></form></div></section>` : ""}
  <section class="panel"><header><h2>${L("เอกสาร", "Documents")}</h2><span class="sp"></span><span class="row">${["", ...Object.keys(FORM_G)].map(g => `<button class="btn ${FORM_G_SEL === g ? "primary" : "ghost"}" type="button" data-fg="${g}">${g ? tx(FORM_G[g]) : L("ทั้งหมด", "All")}</button>`).join("")}</span></header>
    ${Dc.length ? Dc.map(d => { const locked = docLocked(d), can = ed && !locked, head = d.sign && !d.sign.signed && ROLE === d.sign.req.role, mail = docMail(d);
      return `<details class="body" ${d.id === (S.pdocs[S.pdocs.length - 1] || {}).id ? "open" : ""}><summary><b class="mono">${esc(d.no)}</b> ${tx([d.th, d.en])} ${FORM_ST(d)} <span class="sub">${d.case}${d.ven ? " · " + esc(d.ven) : ""}</span>${(d.pub || []).length ? ` ${tag(L("เผยแพร่แล้ว", "Published"), "p-ok")}` : ""}${(d.mail || []).length ? ` ${tag(`${L("ส่งอีเมล", "E-mailed")} ${d.mail.length}`, "p-info")}` : ""}</summary>
        <textarea id="fd-t-${d.id}" rows="9" style="width:100%;margin-top:6px" ${can ? "" : "disabled"}>${esc(d.text)}</textarea>
        <div class="row" style="margin-top:6px">${can ? `<button class="btn" type="button" data-fdsave="${d.id}">${L("บันทึกข้อความ", "Save the text")}</button>` : ""}
          ${can && !d.sign ? `<select id="fd-sr-${d.id}">${Object.keys(SIGN_ROLES).map(r => `<option value="${r}">${tx(SIGN_ROLES[r])}</option>`).join("")}</select><button class="btn" type="button" data-fdreq="${d.id}">${L("ขอลงนาม", "Ask for a signature")}</button>` : ""}
          ${head ? `<button class="btn primary" type="button" data-fdsign="${d.id}">${L("ลงนาม (จำลอง)", "Sign (simulated)")}</button>` : ""}
          ${d.sign && d.sign.req && !d.sign.signed ? `<span class="sub">${L("ผู้ลงนาม", "Signer")}: ${tx(SIGN_ROLES[d.sign.req.role])}</span>` : ""}${d.sign && d.sign.signed ? `<span class="sub">${esc(userName(d.sign.signed.by))} · ${fdate(d.sign.signed.t, true)} · ${L("ใบรับรอง", "cert")} ${esc(d.sign.signed.cert)} · ${L("ตรวจผ่าน", "check passed")}</span>` : ""}</div>
        ${d.g !== "memo" && d.sign && d.sign.signed && ed ? `<div class="row" style="margin-top:6px">${d.g === "ltr" ? `<input type="text" id="fd-to-${d.id}" value="${esc(mail)}" placeholder="e-mail" style="width:250px"><button class="btn" type="button" data-fdmail="${d.id}">${L("ส่งอีเมล (จำลอง)", "Send e-mail (simulated)")}</button>` : `<select id="fd-ch-${d.id}">${Object.keys(PUB_CH).map(k => `<option value="${k}">${tx(PUB_CH[k])}</option>`).join("")}</select><button class="btn" type="button" data-fdpub="${d.id}">${L("บันทึกการเผยแพร่", "Record the publication")}</button>`}</div>` : (d.g !== "memo" && !locked ? `<div class="sub" style="margin-top:4px">${L("ส่งออกหรือเผยแพร่ได้เมื่อลงนามแล้ว", "Can go out once signed")}</div>` : "")}
        ${(d.pub || []).map(p => `<div class="sub">${L("เผยแพร่", "Published")}: ${tx(PUB_CH[p.ch])} · ${fdate(p.t, true)}</div>`).join("")}</details>`; }).join("") : `<div class="body sub">${L("ยังไม่มีเอกสาร", "No documents yet")}</div>`}</section>
  <section class="panel"><header><h2>${L("เตือนที่ควรส่ง", "Reminders due")}</h2><span class="sp"></span><span class="sub">${L("ไม่ส่งซ้ำภายใน", "not repeated within")} ${P4().mailRepeatDays} ${L("วัน", "days")}</span><span class="mono sub">FR-PR-82</span></header>
    ${rc.length ? `<div class="tbl-wrap"><table><tbody>${rc.map(r => { const lm = lastMail(r.key), wait = lm && dayDiff(lm.t.slice(0, 10), TODAY) < P4().mailRepeatDays; return `<tr><td>${esc(r.to)}</td><td class="sub">${esc(r.subject)}</td><td>${lm ? tag(`${L("ส่งล่าสุด", "last sent")} ${fdate(lm.t.slice(0, 10))}`, "p-mute") : ""}</td><td>${ed ? `<button class="btn" type="button" data-rmind="${esc(r.key)}" ${wait ? "disabled" : ""}>${L("ส่งอีเมลเตือน", "Send a reminder")}</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">${L("ไม่มีรายการที่ต้องเตือน", "Nothing needs a reminder")}</div>`}</section>
  <section class="panel"><header><h2>${L("กล่องส่งอีเมล (จำลอง)", "E-mail outbox (simulated)")}</h2></header>${(S.outbox || []).length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "Time")}</th><th>${L("ถึง", "To")}</th><th>${L("เรื่อง", "Subject")}</th><th>${L("ชนิด", "Kind")}</th></tr></thead><tbody>${S.outbox.slice(0, 15).map(m => `<tr><td class="sub">${fdate(m.t, true)}</td><td>${esc(m.to)}</td><td class="sub">${esc(m.subject)}</td><td>${tag(m.kind === "reminder" ? L("เตือน", "Reminder") : L("เอกสาร", "Document"), m.kind === "reminder" ? "p-warn" : "p-info")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีอีเมล", "No e-mail yet")}</div>`}</section>`;
};

// ---------- tab: conflict-of-interest report ----------
function coiRows() {
  const M = {};
  S.cases.filter(c => !c.cancelled && caseState(c) >= 4).forEach(c => ["tor", "eval", "buy"].forEach(k => { const cm = (c.committees || {})[k]; if (!cm) return;
    [cm.chair, ...cm.members].forEach(u => { const r = (M[u] = M[u] || { u, n: 0, done: 0, conf: [], miss: [] }), d = (((c.coi || {})[k]) || {})[u]; r.n++; if (d) { r.done++; if (d.conflict) r.conf.push(`${c.id}: ${d.with}`); } else r.miss.push(`${c.id} (${tx(COMMITTEES[k])})`); }); }));
  return Object.values(M).sort((a, b) => b.miss.length - a.miss.length || b.conf.length - a.conf.length);
}
const COI_ST = { draft: [["ร่าง", "Draft"], "p-mute"], submitted: [["รออนุมัติ", "Waiting for approval"], "p-info"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], exported: [["ส่งออกไฟล์แล้ว", "File exported"], "p-ok"] };
PROC.coi = () => {
  if (!feat("coiRep")) return `<div class="panel"><div class="body"><h2 style="margin:0 0 6px">${L("ปิดอยู่", "Off")}</h2><p class="sub">${L("เปิดได้ที่ M10 → โปรไฟล์จัดซื้อ", "It can be switched on in M10, Procurement profile")}</p></div></div>`;
  const R = coiRows(), ed = isProcRole(), C = S.coiRep || [], miss = sumv(R.map(r => r.miss.length));
  return `<div class="kpis"><div class="kpi"><span class="l">${L("กรรมการที่เกี่ยวข้อง", "Committee members")}</span><span class="v">${R.length}</span></div><div class="kpi"><span class="l">${L("ยังไม่แจ้ง", "Not declared yet")}</span><span class="v">${miss}</span></div><div class="kpi"><span class="l">${L("แจ้งว่ามีส่วนได้เสีย", "Conflicts declared")}</span><span class="v">${sumv(R.map(r => r.conf.length))}</span></div></div>
  <section class="panel"><header><h2>${L("แบบแจ้งผลประโยชน์ทับซ้อนทุกแฟ้ม", "Declarations across all cases")}</h2><span class="sp"></span>${ed ? `<button class="btn primary" type="button" id="coi-make">${L("จัดทำรายงาน", "Prepare a report")}</button>` : ""}<span class="mono sub">FR-PR-83</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("กรรมการ", "Member")}</th><th class="n">${L("คณะที่เป็น", "Committees")}</th><th class="n">${L("แจ้งแล้ว", "Declared")}</th><th>${L("ยังไม่แจ้ง", "Missing")}</th><th>${L("มีส่วนได้เสีย", "Conflicts")}</th></tr></thead><tbody>${R.map(r => `<tr><td>${esc(userName(r.u))}</td><td class="n">${r.n}</td><td class="n">${r.done}</td><td class="sub">${r.miss.map(esc).join("<br>") || "—"}</td><td class="sub">${r.conf.map(esc).join("<br>") || "—"}</td></tr>`).join("") || `<tr><td colspan="5" class="sub">${L("ยังไม่มีคณะกรรมการ", "No committees yet")}</td></tr>`}</tbody></table></div></section>
  <section class="panel"><header><h2>${L("รายงานและการอนุมัติ", "Reports and approval")}</h2></header>${C.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("จัดทำโดย", "Prepared by")}</th><th class="n">${L("กรรมการ", "Members")}</th><th class="n">${L("ยังไม่แจ้ง", "Missing")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead><tbody>${C.map(r => `<tr><td class="mono">${esc(r.id)}</td><td class="sub">${esc(userName(r.by))} · ${fdate(r.t, true)}</td><td class="n">${r.rows.length}</td><td class="n">${sumv(r.rows.map(x => x.miss))}</td><td>${tag(tx(COI_ST[r.status][0]), COI_ST[r.status][1])}${r.appr ? `<div class="sub">${esc(userName(r.appr.by))}</div>` : ""}</td>
      <td>${r.status === "draft" && ed ? `<button class="btn" type="button" data-coisub="${r.id}">${L("เสนอหัวหน้าพัสดุ", "Send to the head")}</button>` : ""}${r.status === "submitted" && ROLE === "prochead" ? `<button class="btn primary" type="button" data-coiok="${r.id}">${L("อนุมัติ", "Approve")}</button>` : ""}${(r.status === "approved" || r.status === "exported") && ed ? `<button class="btn" type="button" data-coiexp="${r.id}">${L("ส่งออกไฟล์ CSV", "Export a CSV file")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีรายงาน", "No reports yet")}</div>`}
    <div class="body sub">${L("จัดทำโดยเจ้าหน้าที่พัสดุ หัวหน้าพัสดุอนุมัติ (ผู้จัดทำอนุมัติเองไม่ได้) แล้วส่งออกเป็นไฟล์ไปยังระบบรายงานของหน่วยงาน ช่องทางจริงรอยืนยัน (D-P18)", "The officer prepares it, the head approves (not the person who prepared it), then it is exported as a file for the agency's reporting system. The real channel is still to be confirmed (D-P18).")}</div></section>`;
};

// ---------- supplier register: legal-entity check and ERP code ----------
function entityLookup(v) {
  if (!taxOk(v.taxId)) return { status: "notfound", name: "" }; const d = Number(v.taxId.slice(-1));
  return { status: d === 7 ? "dissolved" : d === 3 ? "suspended" : "active", name: v.name };
}
const ENT_ST = { active: [["ดำเนินกิจการ", "Active"], "p-ok"], dissolved: [["เลิกกิจการ", "Dissolved"], "p-bad"], suspended: [["ระงับ", "Suspended"], "p-warn"], notfound: [["ไม่พบข้อมูล", "Not found"], "p-bad"] };
{
  const base = PROC.suppliers;
  PROC.suppliers = () => {
    const html = base(); if (!feat("entity")) return html;
    const ed = isProcRole(), erp = feat("erpRef");
    return html + `<section class="panel"><header><h2>${L("ตรวจข้อมูลนิติบุคคล (จำลอง)", "Legal-entity check (simulated)")}</h2><span class="sp"></span><span class="mono sub">FR-PR-86</span></header><div class="tbl-wrap"><table><thead><tr><th>${L("ผู้ขาย", "Supplier")}</th><th>${L("เลขประจำตัวผู้เสียภาษี", "Tax ID")}</th><th>${L("ผลตรวจ", "Result")}</th>${erp ? `<th>${L("รหัสผู้ขายใน ERP", "ERP vendor code")}</th>` : ""}<th></th></tr></thead><tbody>${S.vendors.map((v, i) => `<tr><td>${esc(v.name)}</td><td class="mono">${esc(v.taxId)}</td><td>${v.entity ? `${tag(tx(ENT_ST[v.entity.status][0]), ENT_ST[v.entity.status][1])} <span class="sub">${fdate(v.entity.t.slice(0, 10))}</span>` : `<span class="sub">${L("ยังไม่ตรวจ", "Not checked")}</span>`}</td>
      ${erp ? `<td><input type="text" id="vx-${i}" value="${esc(v.erpCode || "")}" style="width:130px" ${ed ? "" : "disabled"}></td>` : ""}<td>${ed ? `<button class="btn" type="button" data-ent="${i}">${L("ตรวจ", "Check")}</button>${erp ? ` <button class="btn ghost" type="button" data-entx="${i}">${L("บันทึกรหัส", "Save code")}</button>` : ""}` : ""}</td></tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("ผลตรวจเป็นการจำลองจากเลขประจำตัวผู้เสียภาษี (เทียบ GDX และ Linkage Center ภายหลัง) ไม่เขียนกลับไปยังระบบใด", "The result is simulated from the tax ID (to be matched with GDX and the Linkage Center later). Nothing is written back to any system.")}</div></section>`;
  };
}

// ---------- binders ----------
{
  const bb = BIND.procurement;
  BIND.procurement = () => {
    bb();
    const redo = msg => { commit(); renderShell(); route(); if (msg) toast(msg); }, byId = id => S.pdocs.find(d => d.id === id);
    const nf = $("#fm-new"); if (nf) nf.onsubmit = e => { e.preventDefault(); const tpl = FORM_T.find(t => t.id === $("#fm-t").value), c = caseOf($("#fm-c").value), ven = $("#fm-v").value, k = S.contracts.find(x => x.plan === c.plan);
      if (tpl.need === "contract" && !k) { toast(L("แฟ้มนี้ยังไม่มีสัญญา", "This case has no contract yet")); return; } if (tpl.need === "award" && !c.award) { toast(L("แฟ้มนี้ยังไม่มีผู้ชนะ", "This case has no winner yet")); return; }
      if ((tpl.need === "vendor" || tpl.id === "l-others") && !ven && !(k || c.award)) { toast(L("เลือกผู้รับ (ผู้ขาย)", "Pick the recipient supplier")); return; }
      const v = ven || (k ? tx(k.vendor) : c.award ? tx(c.award.winner) : ""), d = { id: `FD-${FAM_FY}-${String(S.pdocs.length + 1).padStart(3, "0")}`, tpl: tpl.id, g: tpl.g, th: tpl.th, en: tpl.en, case: c.id, ven: v, no: docNo(tpl.g, famLine(c.line).unit, c.id), text: "", sign: null, pub: [], mail: [], t: nowIso(), by: me().id };
      d.text = `ที่ ${d.no}\nวันที่ ${D()}\n` + formText(tpl, c, k, v); S.pdocs.push(d); audit(["สร้างเอกสารจากแม่แบบ", "Made a document from a form"], `${d.id} ${d.no}`); redo(`${L("ออกเลขที่", "Numbered")} ${d.no}`); };
    $$("[data-fg]").forEach(b => (b.onclick = () => { FORM_G_SEL = b.dataset.fg; route(); }));
    $$("[data-fdsave]").forEach(b => (b.onclick = () => { const d = byId(b.dataset.fdsave); d.text = $("#fd-t-" + d.id).value; audit(["แก้ข้อความเอกสาร", "Edited a document"], d.id); redo(L("บันทึกแล้ว", "Saved")); }));
    $$("[data-fdreq]").forEach(b => (b.onclick = () => { const d = byId(b.dataset.fdreq), role = $("#fd-sr-" + d.id).value; d.text = $("#fd-t-" + d.id).value; d.sign = { req: { role, by: me().id, t: nowIso() }, signed: null };
      notify([role], [`เอกสาร ${d.no} รอลงนาม`, `Document ${d.no} is waiting for your signature`], "prc-forms"); audit(["ขอลงนามเอกสาร (จำลอง)", "Asked for a signature (simulated)"], `${d.id} ${role}`); redo(L("ส่งขอลงนามแล้ว", "Sent for signature")); }));
    $$("[data-fdsign]").forEach(b => (b.onclick = () => { const d = byId(b.dataset.fdsign); if (d.by === me().id) { toast(L("ผู้ร่างลงนามเองไม่ได้", "The drafter can't sign it")); return; }
      d.sign.signed = { by: me().id, t: nowIso(), cert: "SIM-" + String(Math.abs(hashId(d.id + me().id)) % 900000 + 100000) }; audit(["ลงนามเอกสาร (จำลอง)", "Signed a document (simulated)"], `${d.id} ${d.no}`); redo(L("ลงนามแล้ว (จำลอง)", "Signed (simulated)")); }));
    $$("[data-fdmail]").forEach(b => (b.onclick = () => { const d = byId(b.dataset.fdmail), to = $("#fd-to-" + d.id).value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { toast(L("อีเมลไม่ถูกต้อง", "Check the e-mail address")); return; }
      (S.outbox = S.outbox || []).unshift({ id: "M" + (S.outbox.length + 1), t: nowIso(), to, subject: `${tx([d.th, d.en])} ${d.no}`, doc: d.id, kind: "doc", by: me().id }); d.mail.push({ to, t: nowIso() }); audit(["ส่งอีเมลเอกสาร (จำลอง)", "Sent a document by e-mail (simulated)"], `${d.id} ${to}`); redo(L("ส่งแล้ว (จำลอง)", "Sent (simulated)")); }));
    $$("[data-fdpub]").forEach(b => (b.onclick = () => { const d = byId(b.dataset.fdpub), ch = $("#fd-ch-" + d.id).value; d.pub.push({ ch, t: nowIso(), by: me().id }); audit(["บันทึกการเผยแพร่ประกาศ", "Recorded an announcement publication"], `${d.id} ${ch}`); redo(L("บันทึกแล้ว", "Recorded")); }));
    $$("[data-rmind]").forEach(b => (b.onclick = () => { const r = remindCands().find(x => x.key === b.dataset.rmind); if (!r) return; const v = S.vendors.find(x => normName(x.name) === normName(r.to));
      (S.outbox = S.outbox || []).unshift({ id: "M" + (S.outbox.length + 1), t: nowIso(), to: (v && v.email) || r.to, subject: r.subject, key: r.key, kind: "reminder", by: me().id }); audit(["ส่งอีเมลเตือน (จำลอง)", "Sent a reminder e-mail (simulated)"], r.key); redo(L("ส่งแล้ว (จำลอง)", "Sent (simulated)")); }));
    const cm = $("#coi-make"); if (cm) cm.onclick = () => { const rows = coiRows().map(r => ({ u: r.u, n: r.n, done: r.done, miss: r.miss.length, conf: r.conf.length })); const rep = { id: `COI-${FAM_FY}-${String((S.coiRep || []).length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, rows, status: "draft", appr: null };
      (S.coiRep = S.coiRep || []).unshift(rep); audit(["จัดทำรายงานผลประโยชน์ทับซ้อน", "Prepared a conflict-of-interest report"], rep.id); redo(L("จัดทำแล้ว", "Prepared")); };
    $$("[data-coisub]").forEach(b => (b.onclick = () => { const r = S.coiRep.find(x => x.id === b.dataset.coisub); r.status = "submitted"; notify(["prochead"], [`รายงานผลประโยชน์ทับซ้อน ${r.id} รออนุมัติ`, `Conflict-of-interest report ${r.id} is waiting for approval`], "prc-coi"); redo(L("เสนอแล้ว", "Sent")); }));
    $$("[data-coiok]").forEach(b => (b.onclick = () => { const r = S.coiRep.find(x => x.id === b.dataset.coiok); if (r.by === me().id) { toast(L("ผู้จัดทำอนุมัติเองไม่ได้", "The person who prepared it can't approve it")); return; } r.status = "approved"; r.appr = { by: me().id, t: nowIso() }; audit(["อนุมัติรายงานผลประโยชน์ทับซ้อน", "Approved a conflict-of-interest report"], r.id); redo(L("อนุมัติแล้ว", "Approved")); }));
    $$("[data-coiexp]").forEach(b => (b.onclick = () => { const r = S.coiRep.find(x => x.id === b.dataset.coiexp), csv = ["member,committees,declared,missing,conflicts", ...r.rows.map(x => [userName(x.u), x.n, x.done, x.miss, x.conf].join(","))].join("\n");
      const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + csv); a.download = r.id + ".csv"; document.body.appendChild(a); a.click(); a.remove(); r.status = "exported"; r.exported = { by: me().id, t: nowIso() };
      audit(["ส่งออกไฟล์รายงานผลประโยชน์ทับซ้อน", "Exported a conflict-of-interest file"], r.id); redo(L("ส่งออกไฟล์แล้ว", "File exported")); }));
    $$("[data-ent]").forEach(b => (b.onclick = () => { const v = S.vendors[Number(b.dataset.ent)], r = entityLookup(v); v.entity = { ...r, t: nowIso(), by: me().id }; audit(["ตรวจข้อมูลนิติบุคคล (จำลอง)", "Checked a legal entity (simulated)"], `${v.id} ${r.status}`); redo(L("ตรวจแล้ว", "Checked")); }));
    $$("[data-entx]").forEach(b => (b.onclick = () => { const i = Number(b.dataset.entx); S.vendors[i].erpCode = $("#vx-" + i).value.trim(); audit(["บันทึกรหัสผู้ขายใน ERP", "Saved the ERP vendor code"], S.vendors[i].id); redo(L("บันทึกแล้ว", "Saved")); }));
  };
}

// ---------- tasks ----------
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.pdocs) return;
    if (feat("forms")) (S.pdocs || []).filter(d => d.sign && !d.sign.signed && d.sign.req.role === ROLE).forEach(d => R(`${L("ลงนามเอกสาร", "Sign a document")} ${d.no}`, tx([d.th, d.en]), TODAY, "prc-forms", "p-warn"));
    if (feat("coiRep") && isProcRole()) { const m = sumv(coiRows().map(r => r.miss.length)); if (m) R(`${L("กรรมการยังไม่แจ้งผลประโยชน์ทับซ้อน", "Members have not declared conflicts of interest")}: ${m}`, L("ดูรายงานผลประโยชน์ทับซ้อน", "See the conflict-of-interest page"), TODAY, "prc-coi", "p-warn"); }
    if (feat("coiRep") && ROLE === "prochead") (S.coiRep || []).filter(r => r.status === "submitted").forEach(r => R(`${L("อนุมัติรายงานผลประโยชน์ทับซ้อน", "Approve a conflict-of-interest report")} ${r.id}`, "", TODAY, "prc-coi", "p-warn"));
  };
}

// ---------- tabs in the menu (listed only while the switch is on) ----------
{
  const nav = NAV.find(n => n.id === "procurement"), prev = Object.getOwnPropertyDescriptor(nav, "tabs").get, extra = [["forms", ["แบบฟอร์มและอีเมล", "Forms and e-mail"], "P19", "forms"], ["coi", ["ผลประโยชน์ทับซ้อน", "Conflicts of interest"], "P20", "coiRep"]];
  Object.defineProperty(nav, "tabs", { get: () => [...prev(), ...extra.filter(t => feat(t[3])).map(t => t.slice(0, 3))], configurable: true });
  const bv = VIEWS.procurement;
  VIEWS.procurement = () => { const h = bv(), t = extra.find(x => x[0] === PROC_TAB); return t ? h.replace(/<h1>[^<]*<\/h1>/, `<h1>${tx(t[1])}</h1>`) : h; };
}

// ---------- M10: T4 settings ----------
{
  const base = ADMIN.procprof, bb = BIND_ADMIN.procprof;
  ADMIN.procprof = () => { const ad = isAdmin(); return base() + `<section class="panel"><header><h2>${L("ค่าตั้งรอบ T4", "Round T4 settings")}</h2></header><div class="body inline-form"><div class="f" style="flex:0 1 220px"><label for="p4-rep">${L("ไม่ส่งอีเมลเตือนซ้ำภายใน (วัน)", "Don't repeat a reminder within (days)")}</label><input type="number" id="p4-rep" min="0" step="1" value="${P4().mailRepeatDays}" ${ad ? "" : "disabled"}><span class="sub">${CONF_TAG("C")}</span></div>${ad ? `<button class="btn primary" type="button" id="p4-save">${L("บันทึก", "Save")}</button>` : ""}</div></section>`; };
  BIND_ADMIN.procprof = () => { bb(); const sv = $("#p4-save"); if (sv) sv.onclick = () => { const v = Math.round(Number($("#p4-rep").value)); if (!(v >= 0 && v <= 60)) { toast(L("ค่าไม่ถูกต้อง", "Check the value")); return; } P4().mailRepeatDays = v; audit(["แก้ค่าตั้งโปรไฟล์จัดซื้อ (รอบ T4)", "Changed profile settings (T4)"], `mailRepeatDays=${v}`); commit(); route(); toast(L("บันทึกแล้ว", "Saved")); }; };
}
