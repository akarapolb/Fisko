// Government-site basics (round 65), from the UX review against the DGA Government Website Standard v3.0
// (มสพร. 11-2566) and PDPA section 23: a skip link, errors that move focus to the field and are announced, a live
// region for every toast, page labels without design codes, presenter steps that open the record they talk about,
// a footer with the agency's contact and policies, the policy pages, and a privacy notice at sign-in.
// The wording is the product's; each agency's address, contact and data protection officer are tenant data in
// SITE_CFG[ORG], set by that tenant's data file.
const SITE_CFG = {};
const SITE_DEF = {
  addr: null, tel: null, email: null, web: null, dpo: null, // [th, en] for addr; strings for the rest
  hours: ["วันจันทร์–ศุกร์ เวลา 08.30–16.30 น. เว้นวันหยุดราชการ", "Monday to Friday, 08.30–16.30, except public holidays"],
  updated: "2026-10-28",
};
const siteCfg = () => Object.assign({}, SITE_DEF, SITE_CFG[ORG] || {});

// ---------- skip link and live region ----------
{
  const sk = document.createElement("a"); sk.className = "skiplink"; sk.id = "skiplink"; sk.href = "#";
  sk.onclick = e => { e.preventDefault(); const v = $("#view"); v.setAttribute("tabindex", "-1"); v.focus(); };
  document.body.prepend(sk);
  const lv = document.createElement("div"); lv.id = "sr-live"; lv.className = "sr-only"; lv.setAttribute("role", "status"); lv.setAttribute("aria-live", "polite");
  document.body.appendChild(lv);
}
// Every toast is also read out: the toast itself is shown and hidden, which screen readers don't announce reliably.
{
  const bt = toast;
  toast = function (msg) { bt.apply(this, arguments); const lv = $("#sr-live"); if (lv) { lv.textContent = ""; setTimeout(() => (lv.textContent = msg), 50); } };
}

// ---------- errors tied to their field ----------
// A blocked save says why in a toast; toastErr also finds the field the person was filling in (the nearest text box
// to the button they pressed that is empty or too short), marks it invalid, puts the message under it and moves focus
// there, so keyboard and screen-reader users land on what to fix (WCAG 3.3.1, 3.3.3).
let SITE_ACT = null;
document.addEventListener("click", e => (SITE_ACT = e.target), true);
document.addEventListener("submit", e => (SITE_ACT = e.submitter || e.target), true);
const siteFields = root => [...root.querySelectorAll('textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="search"]):not([type="button"]):not([type="submit"]), select')]
  .filter(el => !el.disabled && !el.readOnly && el.offsetParent !== null);
function siteErrField() {
  let n = SITE_ACT && SITE_ACT.isConnected ? SITE_ACT : null;
  for (; n && n !== document.body; n = n.parentElement) {
    const fs = siteFields(n);
    if (!fs.length) continue;
    return fs.find(el => el.tagName === "SELECT" ? !el.value : el.type === "number" ? !(Number(el.value) > 0) : el.value.trim().length < 10) || fs[0];
  }
  return null;
}
function toastErr(msg) {
  toast(msg);
  const el = siteErrField(); if (!el) return;
  $$(".fld-err").forEach(x => x.remove());
  $$('[data-fld-err]').forEach(x => { x.removeAttribute("aria-invalid"); x.removeAttribute("data-fld-err"); });
  const id = "fe-" + (el.id || Math.random().toString(36).slice(2, 8)), m = document.createElement("div");
  m.className = "fld-err"; m.id = id; m.textContent = msg;
  el.insertAdjacentElement("afterend", m);
  el.setAttribute("aria-invalid", "true"); el.setAttribute("data-fld-err", ""); el.setAttribute("aria-describedby", [el.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
  el.focus();
  el.addEventListener("input", function clear() { el.removeAttribute("aria-invalid"); el.removeAttribute("data-fld-err"); m.remove(); el.removeEventListener("input", clear); });
}

// ---------- page labels ----------
// Eyebrows keep what a reader needs (the area, the record id) and drop design codes (B3, M02, F1) and, in Thai, the
// English names left from the design documents.
const SITE_CODE = /^(?:[A-Z]{1,2}-?\d{1,2}[a-z]?|M\d\d)$/;
function siteEyebrows(root) {
  $$(".head .eyebrow, .cr-head .eyebrow", root).forEach(e => {
    const parts = e.innerHTML.split(/\s+·\s+/).filter(p => {
      const t = p.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
      if (!t) return false;
      if (SITE_CODE.test(t)) return false;
      if (LANG === "th" && !/</.test(p) && !/[฀-๿]/.test(t) && /^[A-Za-z& ]+$/.test(t)) return false;
      return true;
    });
    e.innerHTML = parts.join(" · ");
    e.hidden = !parts.length;
  });
}

// ---------- presenter steps open their record ----------
// Each step names the record it works on; the list alone made the presenter hunt for it on screen.
const presCase = (lo, hi, pick) => {
  const open = S.cases.filter(c => !c.cancelled && !c.close), st = c => caseState(c);
  const hit = open.filter(c => st(c) >= lo && st(c) <= hi && (!pick || pick(c)));
  const pool = hit.length ? hit : open.slice().sort((a, b) => Math.abs(st(a) - lo) - Math.abs(st(b) - lo));
  return pool[0] || null;
};
const presCon = () => (S.contracts || []).filter(c => c.signed && !c.closed).slice(-1)[0] || null;
const presVc = states => { const vs = S.vouchers || []; for (const st of states) { const v = vs.filter(x => x.state === st).slice(-1)[0]; if (v) return v; } return null; };
const PRES_OPEN = {
  "P-E05": () => presCase(3, 3, c => !c.method), "P-E06": () => presCase(4, 4), "P-E07": () => presCase(5, 5),
  "P-E08": () => presCase(6, 7), "P-E09": () => presCase(7, 8, c => !c.contract), "P-E14": () => presCase(10, 11),
  "P-E15": () => presCase(5, 6, c => !(c.bids || []).length),
  "P-E10": () => presCon(), "P-E11": () => presCon(), "P-E13": () => presCon(),
  "E-F03": () => presVc(["draft", "check"]), "E-F04": () => presVc(["check"]), "E-F05": () => presVc(["approve"]), "E-F07": () => presVc(["paid"]),
};
{
  const bg = presGo;
  presGo = function (i) {
    bg.apply(this, arguments);
    const s = PRES && DEMO[presSteps(PRES.rt)[PRES.i]], f = s && PRES_OPEN[s.t], r = f && f();
    if (!r) return;
    if (s.t.startsWith("E-F")) { VC_OPEN = r.id; route(); }
    else if (r.phases) { CON_OPEN = r.id; procSet("contracts"); route(); }
    else jump("case:" + r.id);
  };
}

// ---------- footer and policy pages ----------
const SITE_POL = [
  ["privacy", ["นโยบายคุ้มครองข้อมูลส่วนบุคคล", "Privacy policy"]],
  ["cookie", ["นโยบายคุกกี้", "Cookie policy"]],
  ["security", ["นโยบายการรักษาความมั่นคงปลอดภัย", "Security policy"]],
  ["terms", ["นโยบายเว็บไซต์และข้อจำกัดความรับผิดชอบ", "Website policy and disclaimer"]],
  ["a11y", ["การเข้าถึงได้", "Accessibility"]],
  ["contact", ["ติดต่อหน่วยงาน", "Contact"]],
];
let SITE_TAB = "privacy";
const siteOrg = () => esc(tx(S.org));
const siteBE = iso => Number(iso.slice(0, 4)) + (LANG === "th" ? 543 : 0);
function siteContact(c) {
  const rows = [
    c.addr && [L("ที่อยู่", "Address"), esc(tx(c.addr))],
    c.tel && [L("โทรศัพท์", "Phone"), esc(c.tel)],
    c.email && [L("อีเมล", "Email"), `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`],
    c.web && [L("เว็บไซต์", "Website"), esc(c.web)],
    [L("เวลาทำการ", "Office hours"), esc(tx(c.hours))],
  ].filter(Boolean);
  return `<dl class="cr-kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
}
function renderSiteFoot() {
  let f = $("#sitefoot");
  if (!f) { f = document.createElement("footer"); f.id = "sitefoot"; f.className = "sitefoot"; $(".main").appendChild(f); }
  const c = siteCfg();
  f.setAttribute("aria-label", L("ข้อมูลหน่วยงานและนโยบาย", "Agency information and policies"));
  f.innerHTML = `<div class="sf-org"><b>${siteOrg()}</b>${c.addr ? `<span>${esc(tx(c.addr))}</span>` : ""}${c.tel ? `<span>${L("โทร", "Tel.")} ${esc(c.tel)}</span>` : ""}${c.email ? `<span>${esc(c.email)}</span>` : ""}</div>
    <nav class="sf-links" aria-label="${L("นโยบาย", "Policies")}">${SITE_POL.map(([k, l]) => `<a href="#policy" data-sitepol="${k}">${tx(l)}</a>`).join("")}</nav>
    <div class="sf-copy">© ${siteBE(c.updated)} ${siteOrg()} · ${L("สงวนลิขสิทธิ์", "All rights reserved")} · ${L("ปรับปรุงล่าสุด", "Last updated")} ${fdate(c.updated)}</div>`;
  $$("[data-sitepol]", f).forEach(a => (a.onclick = e => { e.preventDefault(); SITE_TAB = a.dataset.sitepol; go("policy"); }));
}
// The policy texts are the product's template: the agency's name and contacts fill in from tenant data.
function sitePolicy(k) {
  const c = siteCfg(), org = siteOrg(), dpo = c.dpo ? `<a href="mailto:${esc(c.dpo)}">${esc(c.dpo)}</a>` : L("เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลของหน่วยงาน", "the agency's data protection officer");
  const P = (th, en) => `<p>${L(th, en)}</p>`, UL = items => `<ul>${items.map(([th, en]) => `<li>${L(th, en)}</li>`).join("")}</ul>`;
  if (k === "privacy") return P(`${org} ในฐานะผู้ควบคุมข้อมูลส่วนบุคคล แจ้งรายละเอียดตามมาตรา 23 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562`, `${org}, as the data controller, gives this notice under section 23 of the Personal Data Protection Act B.E. 2562 (2019).`)
    + `<h3>${L("ข้อมูลที่เก็บ", "What we collect")}</h3>` + UL([["ชื่อ ตำแหน่ง หน่วยงาน บทบาท และอีเมลราชการ จากบัญชีผู้ใช้ของหน่วยงาน", "Name, position, unit, role and official email, from the agency's user accounts"], ["บันทึกการเข้าใช้และการทำรายการ (วันเวลา รายการที่ทำ เหตุผลที่ระบุ)", "Sign-in and activity records (time, action, the reason given)"], ["ข้อมูลคู่สัญญาและผู้รับเงิน เช่น ชื่อ เลขประจำตัวผู้เสียภาษี และบัญชีธนาคาร เท่าที่จำเป็นต่อการจ่ายเงิน", "Supplier and payee details, such as name, tax id and bank account, only as needed to pay them"]])
    + `<h3>${L("วัตถุประสงค์และฐานทางกฎหมาย", "Purpose and legal basis")}</h3>` + P("เพื่อจัดทำ บริหาร และติดตามงบประมาณ การจัดซื้อจัดจ้าง และการเงินการคลังของหน่วยงาน ซึ่งเป็นการปฏิบัติหน้าที่ตามกฎหมายและภารกิจเพื่อประโยชน์สาธารณะ (มาตรา 24 (4) และ (6)) ระบบไม่ใช้ข้อมูลเพื่อการตลาด และไม่ใช้ตัดสินใจแทนเจ้าหน้าที่", "To prepare, run and monitor the agency's budget, procurement and finance: duties under law and in the public interest (section 24 (4) and (6)). The data is never used for marketing, and the system never decides in place of an official.")
    + `<h3>${L("ผู้รับข้อมูล", "Who receives it")}</h3>` + P("ส่งให้หน่วยงานที่กฎหมายกำหนดเท่านั้น เช่น กรมบัญชีกลาง สำนักงบประมาณ และสำนักงานการตรวจเงินแผ่นดิน ทุกการส่งบันทึกไว้และตรวจสอบได้", "Only to bodies the law names, such as the Comptroller General's Department, the Budget Bureau and the State Audit Office. Every send is logged and can be checked.")
    + `<h3>${L("ระยะเวลาเก็บรักษา", "How long we keep it")}</h3>` + P("ตามตารางระยะเวลาเก็บรักษาข้อมูลของหน่วยงานและระเบียบงานสารบรรณ เมื่อพ้นกำหนดจะลบหรือทำให้ไม่สามารถระบุตัวบุคคลได้", "As set in the agency's records-retention schedule and the official records rules; after that the data is deleted or de-identified.")
    + `<h3>${L("สิทธิของเจ้าของข้อมูล", "Your rights")}</h3>` + P(`ขอเข้าถึง ขอสำเนา ขอแก้ไข ขอลบ ขอระงับ หรือคัดค้านการใช้ข้อมูล และร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล ติดต่อ ${dpo}`, `To see, copy, correct, delete or restrict your data, or object to its use, and to complain to the PDPC Office. Contact ${dpo}.`);
  if (k === "cookie") return P("ระบบใช้ที่เก็บข้อมูลในเบราว์เซอร์เฉพาะที่จำเป็นต่อการทำงาน ไม่มีคุกกี้โฆษณาหรือการติดตามข้ามเว็บไซต์ จึงไม่ต้องขอความยินยอม", "The system keeps only what it needs in your browser. There are no advertising or cross-site tracking cookies, so no consent is needed.")
    + UL([["fisko-lang, fisko-org, fisko-app: ภาษา หน่วยงาน และระบบที่เปิดล่าสุด", "fisko-lang, fisko-org, fisko-app: your language, agency and last system"], ["fisko-session, fisko-role: สถานะการเข้าสู่ระบบ ลบเมื่อออกจากระบบ", "fisko-session, fisko-role: sign-in state, cleared when you sign out"], ["fisko-pins, fisko-recent, fisko-sys-pins: หน้าที่ปักหมุดและเปิดล่าสุด", "fisko-pins, fisko-recent, fisko-sys-pins: your pinned and recent pages"], ["ในต้นแบบนี้ ข้อมูลตัวอย่างที่แก้ไขเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น", "In this prototype, the sample records you change stay in your browser only"]]);
  if (k === "security") return P(`${org} รักษาความมั่นคงปลอดภัยของระบบตามพระราชบัญญัติการรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2562 และมาตรฐานของสำนักงานพัฒนารัฐบาลดิจิทัล`, `${org} secures the system under the Cyber Security Act B.E. 2562 (2019) and the Digital Government Development Agency's standards.`)
    + UL([["เข้าสู่ระบบด้วยบัญชีของหน่วยงาน (SSO) และการยืนยันตัวตนสองชั้น", "Sign-in with the agency's account (SSO) and two-factor authentication"], ["สิทธิ์ตามบทบาท และแยกหน้าที่ผู้จัดทำ ผู้ตรวจ ผู้อนุมัติ", "Role-based access, with maker, checker and approver kept apart"], ["บันทึกการทำรายการที่ลบหรือแก้ไขไม่ได้", "An audit log that cannot be edited or deleted"], ["เข้ารหัสข้อมูลระหว่างส่ง และสำรองข้อมูลพร้อมทดสอบการกู้คืน", "Encryption in transit, and backups with tested restores"], ["แจ้งเหตุผิดปกติหรือช่องโหว่ได้ที่ช่องทางติดต่อของหน่วยงาน", "Report an incident or a weakness through the agency's contact channel"]]);
  if (k === "terms") return P(`ระบบนี้ใช้สำหรับเจ้าหน้าที่ของ${org}และผู้ที่ได้รับอนุญาตเท่านั้น ข้อมูลที่แสดงใช้ประกอบการปฏิบัติงาน ตัวเลขทางการให้ยึดตามระบบ GFMIS และเอกสารที่ลงนามแล้ว การนำข้อมูลไปเผยแพร่ต้องได้รับอนุญาตจากหน่วยงาน`, `This system is for ${org} staff and authorised users only. What it shows supports their work; official figures are those in GFMIS and in signed documents. Publishing any of it needs the agency's permission.`)
    + P("ต้นแบบนี้ใช้ข้อมูลตัวอย่างทั้งหมดเพื่อการหารือ ไม่ใช่ข้อมูลจริงของหน่วยงาน", "This prototype uses sample data only, for discussion; it is not the agency's real data.");
  if (k === "a11y") return P("ระบบออกแบบให้เป็นไปตามมาตรฐานเว็บไซต์ภาครัฐ (มสพร. 11-2566) ซึ่งอ้างอิง WCAG 2.1 ระดับ AA", "The system is designed to the Government Website Standard (มสพร. 11-2566), which refers to WCAG 2.1 level AA.")
    + UL([["ใช้งานด้วยแป้นพิมพ์ได้ทุกหน้า และมีลิงก์ข้ามไปเนื้อหาหลัก", "Every page works by keyboard, with a link to skip to the main content"], ["ตัวอักษรไม่เล็กกว่า 12 พิกเซล ความต่างของสีตามเกณฑ์ และขยายตัวอักษรได้ด้วยเบราว์เซอร์", "No text under 12 px, colour contrast to the criteria, and text can be enlarged in the browser"], ["ข้อผิดพลาดแจ้งที่ช่องที่ต้องแก้ และโปรแกรมอ่านหน้าจออ่านได้", "Errors are shown at the field to fix and read out by screen readers"], ["ใช้ได้ทั้งภาษาไทยและภาษาอังกฤษ และปีเป็นพุทธศักราช", "Thai and English throughout, with Buddhist-era years"]])
    + P("ข้อจำกัดที่ทราบ: กราฟบางชนิดยังไม่มีตารางข้อมูลแทน และเอกสารราชการที่ระบบสร้างยังไม่ใช้ฟอนต์ TH Sarabun หากพบปัญหาในการใช้งาน แจ้งได้ที่ช่องทางติดต่อของหน่วยงาน", "Known limits: some charts have no data table yet, and the official documents the system generates are not yet set in TH Sarabun. Tell us about any barrier through the agency's contact channel.");
  return siteContact(c);
}
VIEWS.policy = () => `<div class="head"><div><div class="eyebrow">${siteOrg()}</div><h1>${L("นโยบายและข้อมูลหน่วยงาน", "Policies and agency information")}</h1><p>${L("ปรับปรุงล่าสุด", "Last updated")} ${fdate(siteCfg().updated)}</p></div></div>
  <div class="tabs" role="tablist">${SITE_POL.map(([k, l]) => `<button class="tab ${k === SITE_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${k === SITE_TAB}" data-sitetab="${k}">${tx(l)}</button>`).join("")}</div>
  <section class="panel"><header><h2>${tx(SITE_POL.find(p => p[0] === SITE_TAB)[1])}</h2></header><div class="body sitepol">${sitePolicy(SITE_TAB)}</div></section>`;
BIND.policy = () => $$("[data-sitetab]").forEach(b => (b.onclick = () => { SITE_TAB = b.dataset.sitetab; route(); }));
// The policy pages belong to the Workspace, like the demo guide, so opening one never switches the system.
WS_PAGES.add("policy");
{ const bc = curPage; curPage = function () { return CUR === "policy" ? { link: "policy", label: ["นโยบายและข้อมูลหน่วยงาน", "Policies and agency information"], sys: "workspace" } : bc.apply(this, arguments); }; }

// ---------- privacy notice at sign-in (PDPA section 23) ----------
{
  const bs = showSignIn;
  showSignIn = function () {
    bs.apply(this, arguments);
    const card = $("#signin .si-card"), foot = card && card.querySelector(".si-foot"); if (!foot) return;
    const d = document.createElement("details"); d.className = "si-pdpa";
    d.innerHTML = `<summary>${L("ประกาศความเป็นส่วนตัว: ระบบใช้ชื่อ ตำแหน่ง และบันทึกการใช้งานของคุณเพื่อปฏิบัติงานตามกฎหมาย", "Privacy notice: the system uses your name, position and activity records to carry out legal duties")}</summary><div class="sitepol">${sitePolicy("privacy")}</div>`;
    foot.before(d);
    const o = $("#otp");
    if (o && SIGN.err) { const e = o.closest(".mfa").querySelector('span[style*="--bad"]'); if (e) { e.id = "otp-err"; e.setAttribute("role", "alert"); o.setAttribute("aria-invalid", "true"); o.setAttribute("aria-describedby", "otp-err"); } }
  };
}

// ---------- the shell ----------
{
  const bs = renderShell;
  renderShell = function () {
    bs.apply(this, arguments);
    $("#skiplink").textContent = L("ข้ามไปยังเนื้อหาหลัก", "Skip to main content");
    renderSiteFoot();
  };
  const br = route;
  route = function () {
    const r = br.apply(this, arguments);
    siteEyebrows($("#view"));
    return r;
  };
}
