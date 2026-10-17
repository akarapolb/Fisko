// Identity (round 7): simulated SSO sign-in with MFA, the user menu, and delegation of authority.
// The MFA code below is a fixed demo value for this prototype; the real system uses an authenticator app.
const DEMO_OTP = "246810";
let SIGN = { step: "pick", user: null, err: "" };

// ---------- delegation ----------
const SCOPES = {
  transfer: { role: ["exec", "fin"], name: ["อนุมัติโอนเปลี่ยนแปลง", "Approve budget transfers"] },
  review: { role: ["plan"], name: ["กลั่นกรองคำขอ", "Review budget requests"] },
  committee: { role: ["exec"], name: ["พิจารณาคำขอระดับผู้บริหาร", "Executive decisions on requests"] },
  spend: { role: ["exec"], name: ["อนุมัติขอซื้อขอจ้างและเบิกจ่าย", "Approve requisitions and payments"] },
};
const userById = id => S.users.find(u => u.id === id) || { name: ["-", "-"], role: "" };
const delegState = d => d.status === "revoked" ? "revoked" : TODAY < d.start ? "future" : TODAY > d.end ? "expired" : "active";
const DSTATE = { active: [["มีผล", "Active"], "p-ok"], future: [["ยังไม่ถึงกำหนด", "Scheduled"], "p-info"], expired: [["หมดอายุ", "Expired"], "p-mute"], revoked: [["ยกเลิกแล้ว", "Revoked"], "p-bad"] };
// Active delegations that let the current user act for someone holding `role`, for `scope`.
function delegFor(role, scope) {
  if (!S.delegations) return null;
  return S.delegations.find(d => delegState(d) === "active" && d.to === me().id && d.scopes.includes(scope) && userById(d.from).role === role) || null;
}
// True when the current user holds `role` or acts for it through an active delegation.
const acting = (role, scope) => ROLE === role || !!delegFor(role, scope);
const onBehalf = (role, scope) => { const d = ROLE === role ? null : delegFor(role, scope); return d ? ` · ${L("แทน", "on behalf of")} ${tx(userById(d.from).name)} (${d.id})` : ""; };

VIEWS.delegation = () => {
  const mine = S.delegations.filter(d => d.from === me().id || d.to === me().id || ROLE === "admin");
  const myScopes = Object.keys(SCOPES).filter(k => SCOPES[k].role.includes(ROLE));
  return `
  <div class="head"><div><div class="eyebrow">${L("การมอบอำนาจ", "Delegation of authority")}</div><h1>${L("มอบอำนาจการอนุมัติ", "Delegate approvals")}</h1>
    <p>${L("ผู้รับมอบอนุมัติแทนได้เฉพาะงานและช่วงเวลาที่กำหนด ทุกการอนุมัติแทนถูกบันทึกพร้อมเลขที่การมอบอำนาจ", "A delegate can approve only the chosen work within the chosen dates. Every approval made on someone's behalf is logged with the delegation number.")}</p></div></div>
  ${myScopes.length ? `<section class="panel"><header><h2>${L("มอบอำนาจใหม่", "New delegation")}</h2><span class="sp"></span><span class="sub">${L("ผู้มอบ", "From")}: ${esc(tx(me().name))}</span></header>
    <div class="body"><form class="inline-form" id="dg-form">
      <div class="f"><label for="dg-to">${L("ผู้รับมอบ", "Delegate")}</label><select id="dg-to">${S.users.filter(u => u.id !== me().id && u.active && ["plan", "exec", "fin"].includes(u.role)).map(u => `<option value="${u.id}">${esc(tx(u.name))} · ${tx(ROLES[u.role])}</option>`).join("")}</select></div>
      <div class="f"><label for="dg-scope">${L("งานที่มอบ", "Work delegated")}</label><select id="dg-scope">${myScopes.map(k => `<option value="${k}">${tx(SCOPES[k].name)}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 160px"><label for="dg-start">${L("ตั้งแต่", "From")}</label><input type="date" id="dg-start" value="${TODAY}" required></div>
      <div class="f" style="flex:0 1 160px"><label for="dg-end">${L("ถึง", "To")}</label><input type="date" id="dg-end" value="${addDays(TODAY, 7)}" required></div>
      <div class="f"><label for="dg-why">${L("เหตุผล", "Reason")}</label><input type="text" id="dg-why" required></div>
      <button class="btn primary" type="submit">${L("มอบอำนาจ", "Delegate")}</button></form></div></section>`
    : `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("บทบาทนี้ไม่มีอำนาจอนุมัติที่มอบต่อได้", "This role has no approvals to delegate")}</b><p>${L("ผู้บริหาร กองแผนงาน และการเงิน มอบอำนาจได้", "Executives, Planning and Finance can delegate")}</p></div></div>`}
  <section class="panel"><header><h2>${ROLE === "admin" ? L("การมอบอำนาจทั้งหมด", "All delegations") : L("การมอบอำนาจที่เกี่ยวกับฉัน", "Delegations involving me")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ผู้มอบ", "From")}</th><th>${L("ผู้รับมอบ", "To")}</th><th>${L("งาน", "Work")}</th><th>${L("ช่วงเวลา", "Period")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${mine.slice().reverse().map(d => { const st = delegState(d);
        return `<tr><td class="mono">${d.id}</td><td>${esc(tx(userById(d.from).name))}<div class="sub">${tx(ROLES[userById(d.from).role] || ["", ""])}</div></td><td>${esc(tx(userById(d.to).name))}<div class="sub">${tx(ROLES[userById(d.to).role] || ["", ""])}</div></td>
          <td>${d.scopes.map(k => tx(SCOPES[k].name)).join(", ")}<div class="sub">${esc(tx(d.why))}</div></td><td class="sub" style="white-space:nowrap">${fdate(d.start)} – ${fdate(d.end)}</td><td>${tag(tx(DSTATE[st][0]), DSTATE[st][1])}</td>
          <td><div class="row" style="flex-wrap:nowrap">${historyBtn(d.id, d.id)}${(st === "active" || st === "future") && (d.from === me().id || ROLE === "admin") ? `<button class="btn danger" type="button" data-revoke="${d.id}">${L("ยกเลิก", "Revoke")}</button>` : ""}</div></td></tr>`; }).join("")
        || `<tr><td colspan="7" class="sub">${L("ยังไม่มีการมอบอำนาจ", "No delegations yet")}</td></tr>`}</tbody></table></div></section>`;
};
BIND.delegation = () => {
  const f = $("#dg-form");
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const start = $("#dg-start").value, end = $("#dg-end").value;
    if (end < start) { toast(L("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", "The end date can't be before the start date")); return; }
    const why = $("#dg-why").value.trim(), id = `D-2570-${String(S.delegations.length + 1).padStart(3, "0")}`;
    const d = { id, from: me().id, to: $("#dg-to").value, scopes: [$("#dg-scope").value], start, end, status: "active", t: nowIso(), why: [why, why] };
    S.delegations.push(d);
    audit(["มอบอำนาจ", "Delegated authority"], `${id} → ${tx(userById(d.to).name)}`);
    notify([userById(d.to).role], [`คุณได้รับมอบอำนาจ ${tx(SCOPES[d.scopes[0]].name)} จาก ${userById(d.from).name[0]} (${id})`, `You received delegated authority from ${userById(d.from).name[1]} (${id})`], "delegation");
    commit(); route(); toast(L("มอบอำนาจแล้ว · แจ้งผู้รับมอบแล้ว", "Delegated · the delegate has been notified"));
  };
  $$("[data-revoke]").forEach(b => (b.onclick = () => {
    const d = S.delegations.find(x => x.id === b.dataset.revoke); d.status = "revoked";
    audit(["ยกเลิกการมอบอำนาจ", "Revoked a delegation"], d.id); commit(); route(); toast(L("ยกเลิกการมอบอำนาจแล้ว", "Delegation revoked"));
  }));
};

// ---------- user menu ----------
function renderUserChip() {
  const u = me(), ini = tx(u.name).replace(/^(ดร\.|Dr\.)\s*/, "").slice(0, 1);
  const n = S.delegations ? S.delegations.filter(d => delegState(d) === "active" && d.to === u.id).length : 0;
  $("#userchip").innerHTML = `<span class="avatar">${esc(ini)}</span>${n ? `<span class="cnt" style="background:var(--info)">${n}</span>` : ""}`;
  $("#userchip").setAttribute("aria-label", `${tx(u.name)} · ${tx(ROLES[ROLE])}`);
}
function toggleUserMenu(show) {
  const p = $("#umenu"), b = $("#userchip"), s = show === undefined ? p.hidden : show;
  if (s) {
    const u = me(), act = S.delegations.filter(d => delegState(d) === "active" && d.to === u.id);
    p.innerHTML = `<header><b>${esc(tx(u.name))}</b></header>
      <div class="nitem" style="cursor:default"><i></i><div>${tx(ROLES[ROLE])} · ${unitName(u.unit)}<small>${u.mfa ? L("ยืนยันตัวตนสองชั้นแล้ว", "Two-factor sign-in on") : L("ยังไม่เปิด MFA", "MFA not set up")} · ${L("เข้าสู่ระบบด้วย SSO", "Signed in with SSO")}</small></div></div>
      ${act.map(d => `<div class="nitem unread" style="cursor:default"><i></i><div>${L("ได้รับมอบอำนาจจาก", "Acting for")} ${esc(tx(userById(d.from).name))}<small>${d.scopes.map(k => tx(SCOPES[k].name)).join(", ")} · ${L("ถึง", "until")} ${fdate(d.end)}</small></div></div>`).join("")}
      <div class="nitem" tabindex="0" id="um-deleg"><i></i><div>${L("การมอบอำนาจ", "Delegation of authority")}</div></div>
      <div class="nitem" tabindex="0" id="um-out"><i></i><div>${L("ออกจากระบบ", "Sign out")}</div></div>`;
    $("#um-deleg").onclick = () => { toggleUserMenu(false); go("delegation"); };
    $("#um-out").onclick = () => { toggleUserMenu(false); signOut(); };
  }
  p.hidden = !s; b.setAttribute("aria-expanded", String(s));
}

// ---------- sign-in ----------
function startSession(u) {
  SESSION = { user: u.id, org: ORG, t: nowIso() };
  store.set("fisko-session", JSON.stringify(SESSION));
  ROLE = u.role; store.set("fisko-role", ROLE);
  audit(["เข้าสู่ระบบด้วย SSO และ MFA", "Signed in with SSO and MFA"], tx(u.name)); commit();
  $("#signin").hidden = true; SIGN = { step: "pick", user: null, err: "" };
  renderShell(); go("home");
  toast(`${L("ยินดีต้อนรับ", "Welcome")} ${tx(u.name)}`);
}
function signOut() {
  audit(["ออกจากระบบ", "Signed out"], tx(me().name)); commit();
  SESSION = null; store.del("fisko-session"); showSignIn();
}
function qrPattern(seed) { // decorative QR-like pattern, not a real code
  let h = ""; for (let i = 0; i < 121; i++) { const on = ((i * 7 + seed * 13) % 5 < 2) || [0, 1, 2, 10, 11, 12, 22, 23, 24].includes(i % 33); h += `<i class="${on ? "on" : ""}"></i>`; } return h;
}
function showSignIn() {
  const el = $("#signin"), users = S.users.slice().sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
  let body = "";
  if (SIGN.step === "pick") body = `
    <p class="sub">${L("เลือกบัญชีตัวอย่างเพื่อจำลองการเข้าสู่ระบบผ่านบัญชีหน่วยงาน (SSO)", "Choose a sample account to simulate signing in with the organization's account (SSO)")}</p>
    <div class="acc-list">${users.map(u => `<button type="button" class="acc ${u.active ? "" : "off"}" data-acc="${u.id}">
      <span class="avatar">${esc(tx(u.name).slice(0, 1))}</span><span><b>${esc(tx(u.name))}</b><small>${tx(ROLES[u.role])} · ${esc(unitName(u.unit))}</small></span>
      ${!u.active ? tag(L("ระงับ", "Suspended"), "p-bad") : !u.mfa ? tag(L("ยังไม่มี MFA", "No MFA"), "p-warn") : ""}</button>`).join("")}</div>`;
  if (SIGN.step === "sso") body = `<div class="sso-wait"><span class="spinner" aria-hidden="true"></span><p>${L("กำลังยืนยันตัวตนกับผู้ให้บริการบัญชีของหน่วยงาน…", "Checking with the organization's identity provider…")}</p></div>`;
  if (SIGN.step === "mfa" || SIGN.step === "setup") {
    const u = userById(SIGN.user);
    body = `<div class="mfa">${SIGN.step === "setup" ? `<div class="alert"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${L("บัญชีนี้ต้องตั้งค่าการยืนยันตัวตนสองชั้นก่อนใช้งาน", "This account must set up two-factor sign-in first")}</b><p>${L("ตามนโยบายความมั่นคงปลอดภัยของหน่วยงาน", "Required by the organization's security policy")}</p></div></div>
        <div class="row" style="align-items:center;gap:16px"><div class="qr" aria-label="${L("ตัวอย่างคิวอาร์โค้ด", "Sample QR code")}">${qrPattern(u.id.length)}</div><span class="sub">${L("สแกนด้วยแอปยืนยันตัวตน แล้วกรอกรหัส 6 หลัก", "Scan with an authenticator app, then enter the 6-digit code")}</span></div>` : ""}
      <b>${esc(tx(u.name))}</b><span class="sub">${L("กรอกรหัส 6 หลักจากแอปยืนยันตัวตน", "Enter the 6-digit code from your authenticator app")}</span>
      <form id="otp-form" class="row" style="flex-wrap:nowrap"><input type="text" id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="${L("รหัส 6 หลัก", "6-digit code")}" style="font-family:var(--mono);font-size:20px;letter-spacing:.3em;width:160px">
        <button class="btn primary" type="submit">${L("ยืนยัน", "Verify")}</button></form>
      ${SIGN.err ? `<span style="color:var(--bad);font-size:13.5px">${SIGN.err}</span>` : ""}
      <span class="sub">${L("รหัสสำหรับต้นแบบนี้", "Code for this prototype")}: <span class="mono">${DEMO_OTP}</span></span>
      <button class="btn ghost" type="button" id="si-back">${L("เลือกบัญชีอื่น", "Choose another account")}</button></div>`;
  }
  el.innerHTML = `<div class="si-card" role="dialog" aria-modal="true" aria-labelledby="si-title">
    <div class="si-brand"><div class="brand-mark">Fk</div><div><b id="si-title">Fisko</b><small>${L("แพลตฟอร์มงบประมาณ (AEBMS)", "Budget platform (AEBMS)")}</small></div>
      <div class="seg" role="group" aria-label="Language" style="margin-left:auto"><button type="button" data-silang="th" class="${LANG === "th" ? "on" : ""}">TH</button><button type="button" data-silang="en" class="${LANG === "en" ? "on" : ""}">EN</button></div></div>
    <h2>${L("เข้าสู่ระบบ", "Sign in")}</h2>
    ${Object.keys(SEEDS).length > 1 ? `<label class="field-inline" for="si-org">${L("หน่วยงาน", "Organization")} <select id="si-org">${Object.keys(SEEDS).map(o => `<option value="${o}" ${o === ORG ? "selected" : ""}>${esc(tx(SEEDS[o].name))}</option>`).join("")}</select></label>` : ""}
    ${body}
    <p class="sub si-foot">${L("ต้นแบบเพื่อการหารือ · ไม่ใช้รหัสผ่านจริง · ข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง", "Discussion prototype · no real passwords · all data is sample data")}</p></div>`;
  el.hidden = false;
  $$("[data-silang]").forEach(b => (b.onclick = () => { LANG = b.dataset.silang; store.set("fisko-lang", LANG); renderShell(); showSignIn(); }));
  const so = $("#si-org"); if (so) so.onchange = () => { ORG = so.value; store.set("fisko-org", ORG); load(); resetUi(); renderShell(); SIGN = { step: "pick", user: null, err: "" }; showSignIn(); };
  $$("[data-acc]").forEach(b => (b.onclick = () => {
    const u = userById(b.dataset.acc);
    if (!u.active) { toast(L("บัญชีนี้ถูกระงับ ติดต่อผู้ดูแลระบบ", "This account is suspended. Contact the administrator.")); return; }
    SIGN = { step: "sso", user: u.id, err: "" }; showSignIn();
    setTimeout(() => { SIGN.step = u.mfa ? "mfa" : "setup"; showSignIn(); const o = $("#otp"); if (o) o.focus(); }, 700);
  }));
  const back = $("#si-back"); if (back) back.onclick = () => { SIGN = { step: "pick", user: null, err: "" }; showSignIn(); };
  const of = $("#otp-form");
  if (of) of.onsubmit = e => {
    e.preventDefault();
    const u = userById(SIGN.user);
    if ($("#otp").value.trim() !== DEMO_OTP) { SIGN.err = L("รหัสไม่ถูกต้อง ลองอีกครั้ง", "That code isn't right. Try again."); showSignIn(); $("#otp").focus(); return; }
    if (SIGN.step === "setup") { u.mfa = true; audit(["ตั้งค่าการยืนยันตัวตนสองชั้น", "Set up two-factor sign-in"], tx(u.name)); }
    startSession(u);
  };
}
