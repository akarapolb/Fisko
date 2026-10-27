// Finance CRUD round FC1 (Fisko_Finance_CRUD_Design.html, chapter 6.10): the four F10 registers move onto the shared
// list + drawer (76-crud.js). GFMIS assignments (FR-FC-44), supplier bank-account changes (FR-FC-45, SD-14), cash
// committee orders as dated records (FR-FC-46, SD-13 reads the order in force that day) and receipt books
// (FR-FC-47). Every reason uses the shared minimum (CR_WHY_MIN); nothing is deleted, records are revoked, withdrawn,
// cancelled or returned and stay in the list behind "Show cancelled".
const pad2 = n => String(n).padStart(2, "0");
const finHead = () => ROLE === "finhead";

// ---------- GFMIS assignments (FR-FC-44, clauses 10–12) ----------
const GFU_ST = { on: [["มีผล", "In force"], "p-ok"], exp: [["หมดอายุ", "Expired"], "p-mute"], off: [["เพิกถอนแล้ว", "Revoked"], "p-mute"] };
// Older saved data has no ids; revoking used to go by row position, which picks the wrong person once rows move.
function gfuList() { const G = (S.gfUsers = S.gfUsers || []); G.forEach(g => { if (!g.id) g.id = `GU-${pad2(maxNo(G.map(x => x.id || ""), /^GU-(\d+)/) + 1)}`; }); return G; }
const gfuSt = g => (g.revoked ? "off" : g.until >= TODAY ? "on" : "exp");
const gfuPeople = () => S.users.filter(u => u.active !== false && ["fin", "finhead", "exec"].includes(u.role));
const gfuDuties = g => g.duties.map(d => tx(GF_DUTY[d])).join(", ");
CRUD.def("fnGfu", {
  noun: ["การมอบหมายใน GFMIS", "GFMIS assignment"], st: GFU_ST, list: gfuList, id: g => g.id, title: g => userName(g.user), sub: g => `${esc(g.order)} · ${gfuDuties(g)}`,
  status: gfuSt, gone: g => !!g.revoked, search: g => `${g.id} ${userName(g.user)} ${g.order}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => [["on", L("มีผล", "In force")], ["exp", L("หมดอายุ", "Expired")]], get: gfuSt }],
  cols: [{ h: ["ผู้ใช้", "User"], sort: g => userName(g.user), c: g => `${esc(userName(g.user))} <span class="sub">${tx(ROLES[(S.users.find(u => u.id === g.user) || {}).role] || ["", ""])}</span>` },
    { h: ["หน้าที่", "Duties"], c: g => `<span class="sub">${gfuDuties(g)}</span>` }, { h: ["คำสั่ง", "Order"], c: g => `<span class="mono">${esc(g.order)}</span>` },
    { h: ["ถึง", "Until"], sort: g => g.until, c: g => `<span class="sub">${fdate(g.until)}</span>` }],
  fields: g => [
    { id: "user", label: ["ผู้ใช้", "User"], type: "select", req: true, value: g ? g.user : "", lock: !!g, show: g && esc(userName(g.user)), blank: L("— เลือกผู้ใช้ —", "— choose a user —"), opts: gfuPeople().map(u => [u.id, `${userName(u.id)} · ${tx(ROLES[u.role])}`]) },
    ...Object.keys(GF_DUTY).map(d => ({ id: "d_" + d, label: GF_DUTY[d], type: "check", value: g ? g.duties.includes(d) : d === "record" })),
    { id: "order", label: ["เลขที่คำสั่งมอบหมาย", "Assignment order no."], req: true, value: g ? g.order : "" },
    { id: "until", label: ["มีผลถึงวันที่", "In force until"], type: "date", req: true, value: g ? g.until : FY_END },
  ],
  check: v => [!Object.keys(GF_DUTY).some(d => v["d_" + d]) && { f: null, m: L("เลือกหน้าที่อย่างน้อยหนึ่งข้อ", "Pick at least one duty") },
    v.until && v.until < TODAY && { f: "until", m: L("วันสิ้นสุดต้องไม่ก่อนวันนี้ ใช้ “เพิกถอน” เพื่อยุติการมอบหมาย", "The end date can't be before today; use Revoke to end an assignment") }].filter(Boolean),
  create: { can: finHead, label: ["มอบหมายผู้ใช้", "Assign a user"], run: v => {
    const G = gfuList(), g = { id: `GU-${pad2(maxNo(G.map(x => x.id), /^GU-(\d+)/) + 1)}`, user: v.user, duties: Object.keys(GF_DUTY).filter(d => v["d_" + d]), order: v.order, until: v.until, by: me().id, t: nowIso() };
    G.push(g); audit(["มอบหมายผู้ใช้งาน GFMIS", "Assigned a GFMIS user"], `${g.id} · ${userName(g.user)} · ${g.duties.join(",")} · ${g.order}`); return g; } },
  edit: { can: g => finHead() && !g.revoked, why: () => true, run: (g, v, why) => {
    const old = `${g.duties.join(",")}/${g.order}/${g.until}`; g.duties = Object.keys(GF_DUTY).filter(d => v["d_" + d]); g.order = v.order; g.until = v.until;
    audit(["แก้ไขการมอบหมาย GFMIS", "Changed a GFMIS assignment"], `${g.id} · ${userName(g.user)} · ${old} → ${g.duties.join(",")}/${g.order}/${g.until} · ${why}`); } },
  acts: g => (finHead() && gfuSt(g) === "on" ? [{ id: "rev", label: L("เพิกถอน", "Revoke"), kind: "danger", why: true,
    impact: () => L(`${userName(g.user)} ใช้ GFMIS ตามหน้าที่นี้ไม่ได้ตั้งแต่วันนี้ งานที่ต้องใช้หน้าที่นี้จะถูกกันจนกว่าจะมอบหมายใหม่`, `${userName(g.user)} can't use GFMIS for these duties from today; work that needs them is blocked until someone is assigned`),
    run: (_, why) => { g.until = addDays(TODAY, -1); g.revoked = { t: nowIso(), by: me().id, why }; audit(["เพิกถอนการมอบหมาย GFMIS", "Revoked a GFMIS assignment"], `${g.id} · ${userName(g.user)} · ${why}`); return L("เพิกถอนแล้ว", "Revoked"); } }] : []),
  view: g => kv([[L("ผู้ใช้", "User"), esc(userName(g.user))], [L("หน้าที่", "Duties"), gfuDuties(g)], [L("คำสั่ง", "Order"), `<span class="mono">${esc(g.order)}</span>`], [L("มีผลถึง", "In force until"), fdate(g.until)],
    g.by && [L("บันทึกโดย", "Recorded by"), `${esc(userName(g.by))} · ${fdate(g.t, true)}`], g.revoked && [L("เพิกถอน", "Revoked"), `${esc(userName(g.revoked.by))} · ${fdate(g.revoked.t, true)} · ${esc(g.revoked.why)}`]])
    + `<p class="sub">${L("ระบบกันการบันทึกขอเบิก รับเงิน และนำส่งใน GFMIS ของผู้ที่ไม่มีคำสั่งรองรับ (ข้อ 12)", "Recording, receiving and remitting in GFMIS are blocked for anyone without an order (clause 12)")}</p>`,
  hist: g => g.id,
});
FS.gfUsers = () => crudList("fnGfu", { head: `<h2>${L("ผู้มีสิทธิใช้งาน GFMIS", "People assigned to GFMIS")}</h2><span class="sp"></span><span class="sub">${L("หัวหน้าหน่วยงานมอบหมายเป็นลายลักษณ์อักษร (ข้อ 10–12)", "Assigned in writing by the head of the agency (clauses 10–12)")}</span>`, empty: L("ยังไม่มีผู้ได้รับมอบหมาย", "No one is assigned yet") });

// ---------- supplier bank-account changes (FR-FC-45, clause 20 (2), SD-14) ----------
const VB_ST = { pending: [["รอยืนยัน", "Waiting to confirm"], "p-warn"], confirmed: [["ยืนยันแล้ว ส่งกรมบัญชีกลาง", "Confirmed · sent to the Comptroller General"], "p-ok"], rejected: [["ไม่ยืนยัน", "Not confirmed"], "p-mute"], withdrawn: [["ถอนแล้ว", "Withdrawn"], "p-mute"] };
const vbVendor = ch => (S.vendors || []).find(x => x.id === ch.vendor) || { name: [ch.vendor, ch.vendor] };
const vbAcct = b => (b && b.acct ? `${esc(b.bank)} · <span class="mono">${maskAcct(b.acct)}</span>` : "—");
CRUD.def("fnVend", {
  noun: ["คำขอแก้บัญชีธนาคารผู้ขาย", "Supplier bank change"], st: VB_ST, list: () => (S.vendorChanges = S.vendorChanges || []), id: ch => ch.id, title: ch => tx(vbVendor(ch).name), sub: ch => vbAcct(ch),
  status: ch => ch.status, gone: ch => ch.status === "rejected" || ch.status === "withdrawn", search: ch => `${ch.id} ${vbVendor(ch).name.join(" ")} ${userName(ch.by)}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => [["pending", L("รอยืนยัน", "Waiting")], ["confirmed", L("ยืนยันแล้ว", "Confirmed")]], get: ch => ch.status }],
  cols: [{ h: ["เลขที่", "No."], sort: ch => ch.id, c: ch => `<span class="mono">${ch.id}</span>` }, { h: ["ผู้ขาย", "Supplier"], sort: ch => tx(vbVendor(ch).name), c: ch => esc(tx(vbVendor(ch).name)) },
    { h: ["บัญชีใหม่", "New account"], c: ch => `<span class="sub">${vbAcct(ch)}</span>` }, { h: ["ผู้ขอ", "Requested by"], sort: ch => ch.t, c: ch => `${esc(userName(ch.by))}<div class="sub">${fdate(ch.t, true)}</div>` }],
  fields: ch => [
    { id: "vendor", label: ["ผู้ขาย", "Supplier"], type: "select", req: true, value: ch ? ch.vendor : "", lock: !!ch, show: ch && esc(tx(vbVendor(ch).name)), blank: L("— เลือกผู้ขาย —", "— choose a supplier —"), opts: (S.vendors || []).map(x => [x.id, tx(x.name)]) },
    { id: "bank", label: ["ธนาคาร", "Bank"], type: "select", req: true, value: ch ? ch.bank : BANKS[0], opts: BANKS.map(b => [b, b]) },
    { id: "acct", label: ["เลขที่บัญชี (10 หลัก)", "Account no. (10 digits)"], req: true, value: ch ? ch.acct : "" },
    { id: "book", label: ["แนบสำเนาหน้าสมุดบัญชีและหนังสือแจ้งจากผู้ขายแล้ว", "Bank book page and the supplier's letter are attached"], type: "check", wide: true, value: !!ch },
  ],
  check: v => [!/^\d{10}$/.test(v.acct || "") && { f: "acct", m: L("เลขที่บัญชีต้องเป็นตัวเลข 10 หลัก", "The account number must be 10 digits") },
    !v.book && { f: "book", m: L("ต้องแนบหลักฐานจากผู้ขายก่อนส่งคำขอ", "Attach the supplier's evidence before sending") }].filter(Boolean),
  create: { can: () => ROLE === "fin", label: ["ขอแก้บัญชีผู้ขาย", "Request a bank change"], run: v => {
    const C = S.vendorChanges = S.vendorChanges || [], ch = { id: `VB-${FAM_FY}-${pad2(maxNo(C.map(x => x.id), new RegExp(`^VB-${FAM_FY}-(\\d+)`)) + 1)}`, vendor: v.vendor, bank: v.bank, acct: v.acct, by: me().id, t: nowIso(), status: "pending", done: null };
    C.push(ch); audit(["ขอแก้บัญชีธนาคารผู้ขาย", "Asked to change a supplier bank account"], `${ch.id} · ${ch.vendor}`);
    notify(["finhead"], [`คำขอแก้บัญชีธนาคารผู้ขาย ${ch.id} รอยืนยัน`, `Supplier bank change ${ch.id} is waiting to be confirmed`], "fnc-reg:vendors"); return ch; } },
  edit: { can: ch => ch.status === "pending" && ch.by === me().id, why: () => true, run: (ch, v, why) => {
    const old = `${ch.bank} ${maskAcct(ch.acct)}`; ch.bank = v.bank; ch.acct = v.acct; audit(["แก้คำขอแก้บัญชีธนาคารผู้ขาย", "Changed a supplier bank-change request"], `${ch.id} · ${old} → ${ch.bank} ${maskAcct(ch.acct)} · ${why}`); } },
  acts: ch => {
    if (ch.status !== "pending" || !isFinRole()) return [];
    const mine = ch.by === me().id;
    return [!mine && { id: "ok", label: L("ยืนยัน", "Confirm"), kind: "primary", undo: false, confirm: L("ส่งบัญชีใหม่ให้กรมบัญชีกลางสร้างข้อมูลหลักผู้ขาย บัญชีเดิมเก็บไว้ในประวัติของผู้ขาย", "The new account goes to the Comptroller General's vendor master; the old one stays in the supplier's history"),
        impact: () => L("การจ่ายครั้งแรกให้ผู้ขายรายนี้ภายใน 30 วันจะถูกเตือน (SG-F03)", "The first payment to this supplier within 30 days is flagged (SG-F03)"),
        run: () => { if (!sodCheck("SD-14", [me().id], [ch.by], ch.id)) return null;
          const vd = (S.vendors || []).find(x => x.id === ch.vendor);
          if (vd) { if (vd.bank) (vd.bankHist = vd.bankHist || []).push(Object.assign({}, vd.bank, { until: nowIso(), by: ch.id })); vd.bank = { bank: ch.bank, acct: ch.acct, t: nowIso() }; }
          ch.status = "confirmed"; ch.done = { by: me().id, t: nowIso() };
          audit(["ยืนยันการแก้บัญชีธนาคารผู้ขาย", "Confirmed a supplier bank change"], ch.id); notify(["fin"], [`ยืนยันการแก้บัญชีผู้ขาย ${ch.id} แล้ว`, `Supplier bank change ${ch.id} confirmed`], "fnc-reg:vendors");
          return L("ยืนยันแล้ว · ส่งข้อมูลให้กรมบัญชีกลาง", "Confirmed · sent to the Comptroller General"); } },
      !mine && { id: "no", label: L("ไม่ยืนยัน", "Don't confirm"), kind: "danger", why: true, impact: () => L("ผู้ขายยังใช้บัญชีเดิม ผู้ขอได้รับแจ้งพร้อมเหตุผล", "The supplier keeps the current account; the requester is told why"),
        run: (_, why) => { if (!sodCheck("SD-14", [me().id], [ch.by], ch.id)) return null; ch.status = "rejected"; ch.done = { by: me().id, t: nowIso(), why };
          audit(["ไม่ยืนยันการแก้บัญชีธนาคารผู้ขาย", "Refused a supplier bank change"], `${ch.id} · ${why}`); notify(["fin"], [`คำขอแก้บัญชีผู้ขาย ${ch.id} ไม่ได้รับการยืนยัน: ${why}`, `Supplier bank change ${ch.id} was not confirmed: ${why}`], "fnc-reg:vendors"); return L("บันทึกแล้ว", "Recorded"); } },
      mine && { id: "wd", label: L("ถอนคำขอ", "Withdraw"), kind: "danger", why: true, run: (_, why) => { ch.status = "withdrawn"; ch.done = { by: me().id, t: nowIso(), why }; audit(["ถอนคำขอแก้บัญชีธนาคารผู้ขาย", "Withdrew a supplier bank change"], `${ch.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } }];
  },
  view: ch => { const vd = vbVendor(ch);
    return kv([[L("ผู้ขาย", "Supplier"), esc(tx(vd.name))], [L("บัญชีปัจจุบันของผู้ขาย", "Supplier's current account"), vbAcct(vd.bank)], [L("บัญชีที่ขอ", "Requested account"), vbAcct(ch)],
      [L("ผู้ขอ", "Requested by"), `${esc(userName(ch.by))} · ${fdate(ch.t, true)}`], ch.done && [ch.status === "confirmed" ? L("ยืนยันโดย", "Confirmed by") : ch.status === "withdrawn" ? L("ถอนโดย", "Withdrawn by") : L("ไม่ยืนยันโดย", "Refused by"), `${esc(userName(ch.done.by))} · ${fdate(ch.done.t, true)}${ch.done.why ? ` · ${esc(ch.done.why)}` : ""}`],
      (vd.bankHist || []).length && [L("บัญชีก่อนหน้า", "Earlier accounts"), vd.bankHist.map(b => `${vbAcct(b)} <span class="sub">${L("ถึง", "until")} ${fdate(b.until, true)}</span>`).join("<br>")]])
      + `<p class="sub">${L("ผู้ขอยืนยันหรือปฏิเสธคำขอของตนเองไม่ได้ (SD-14)", "The requester can't confirm or refuse their own request (SD-14)")}</p>`; },
  hist: ch => ch.id,
});
FS.vendors = () => crudList("fnVend", { head: `<h2>${L("ข้อมูลหลักผู้ขาย: บัญชีธนาคาร", "Supplier master data: bank accounts")}</h2><span class="sp"></span><span class="sub">${L("ส่งให้กรมบัญชีกลางสร้างข้อมูลหลักผู้ขาย (ข้อ 20 (2)) · ผู้ขอยืนยันเองไม่ได้ (SD-14)", "Sent to the Comptroller General's vendor master (clause 20 (2)) · the requester can't confirm (SD-14)")}</span>`, empty: L("ยังไม่มีคำขอ", "No requests yet") });

// ---------- cash committee orders (FR-FC-46, clauses 86–88) ----------
const CO_ST = { cur: [["มีผล", "In force"], "p-ok"], next: [["รอเริ่มผล", "Starts later"], "p-info"], old: [["สิ้นผล", "Ended"], "p-mute"], off: [["ยกเลิก", "Cancelled"], "p-mute"] };
const coSt = o => (o.cancelled ? "off" : o.from > TODAY ? "next" : cashC().id === o.id ? "cur" : "old");
const coPeople = () => S.users.filter(u => u.active !== false && !["admin", "audit"].includes(u.role));
const coNames = ids => ids.map(userName).map(esc).join(", ") || "—";
CRUD.def("fnCmte", {
  noun: ["คำสั่งแต่งตั้งกรรมการเก็บรักษาเงิน", "Cash committee order"], st: CO_ST, list: cashOrders, id: o => o.id, title: o => o.order, sub: o => `${L("มีผลตั้งแต่", "From")} ${fdate(o.from)}`,
  status: coSt, gone: o => !!o.cancelled, search: o => `${o.id} ${o.order} ${o.members.concat(o.subs).map(userName).join(" ")}`,
  cols: [{ h: ["คำสั่ง", "Order"], c: o => `<span class="mono">${esc(o.order)}</span>` }, { h: ["มีผลตั้งแต่", "From"], sort: o => o.from, c: o => `<span class="sub">${fdate(o.from)}</span>` },
    { h: ["กรรมการ", "Members"], c: o => coNames(o.members) }, { h: ["ผู้ทำหน้าที่แทน", "Substitutes"], c: o => `<span class="sub">${coNames(o.subs)}</span>` }],
  fields: o => [
    { id: "order", label: ["เลขที่คำสั่ง", "Order no."], req: true, value: o ? o.order : "" },
    { id: "from", label: ["มีผลตั้งแต่", "In force from"], type: "date", req: true, value: o ? o.from : TODAY },
    { id: "_who", label: ["หน้าที่ในคำสั่ง", "Role in the order"], type: "info", wide: true, html: `<span class="sub">${L("อย่างน้อย 2 คน (ข้อ 86) · ผู้ทำหน้าที่แทนตรวจนับเมื่อกรรมการไม่อยู่ (ข้อ 88)", "At least 2 members (cl. 86) · substitutes count when a member is away (cl. 88)")}</span>` },
    ...coPeople().map(u => ({ id: "p_" + u.id, label: [userName(u.id), userName(u.id)], type: "select", value: o ? (o.members.includes(u.id) ? "m" : o.subs.includes(u.id) ? "s" : "") : "",
      opts: [["", "—"], ["m", L("กรรมการ", "Member")], ["s", L("ผู้ทำหน้าที่แทน", "Substitute")]] })),
  ],
  check: (v, o) => { const ms = coPeople().filter(u => v["p_" + u.id] === "m");
    return [ms.length < 2 && { f: null, m: L("ต้องมีกรรมการอย่างน้อย 2 คน (ข้อ 86)", "At least 2 members are needed (clause 86)") },
      v.from && v.from < TODAY && { f: "from", m: L("คำสั่งใหม่มีผลย้อนหลังไม่ได้ การตรวจนับที่ผ่านมาอ้างคำสั่งที่มีผลวันนั้น", "A new order can't start in the past; earlier counts keep the order in force on their day") },
      cashOrders().some(x => x !== o && !x.cancelled && x.order === v.order) && { f: "order", m: L("เลขที่คำสั่งนี้มีอยู่แล้ว", "This order number is already used") }].filter(Boolean); },
  create: { can: finHead, label: ["แต่งตั้งใหม่", "New appointment"], run: v => {
    const O = cashOrders(), o = { id: `CO-${pad2(maxNo(O.map(x => x.id), /^CO-(\d+)/) + 1)}`, order: v.order, from: v.from, members: coPeople().filter(u => v["p_" + u.id] === "m").map(u => u.id), subs: coPeople().filter(u => v["p_" + u.id] === "s").map(u => u.id), by: me().id, t: nowIso() };
    O.push(o); audit(["แต่งตั้งกรรมการเก็บรักษาเงิน", "Appointed the cash committee"], `${o.id} · ${o.order} · ${o.members.map(userName).join(", ")}`);
    notify(o.members.concat(o.subs).map(id => (S.users.find(u => u.id === id) || {}).role).filter(Boolean), [`คุณได้รับแต่งตั้งในคำสั่ง ${o.order} มีผล ${fdate(o.from)}`, `You are named in order ${o.order} from ${fdate(o.from)}`], "fnc-reg:committee"); return o; } },
  edit: { can: o => finHead() && !o.cancelled && o.from > TODAY, run: (o, v) => {
    o.order = v.order; o.from = v.from; o.members = coPeople().filter(u => v["p_" + u.id] === "m").map(u => u.id); o.subs = coPeople().filter(u => v["p_" + u.id] === "s").map(u => u.id);
    audit(["แก้ไขคำสั่งแต่งตั้งกรรมการเก็บรักษาเงิน", "Changed a cash committee order"], `${o.id} · ${o.order} · ${o.members.map(userName).join(", ")}`); } },
  acts: o => (finHead() && !o.cancelled && o.from > TODAY ? [{ id: "off", label: L("ยกเลิกคำสั่ง", "Cancel the order"), kind: "danger", why: true, impact: () => L("คำสั่งที่มีผลอยู่ใช้ต่อไป", "The order in force stays in force"),
    run: (_, why) => { o.cancelled = { t: nowIso(), by: me().id, why }; audit(["ยกเลิกคำสั่งแต่งตั้งกรรมการเก็บรักษาเงิน", "Cancelled a cash committee order"], `${o.id} · ${o.order} · ${why}`); return L("ยกเลิกแล้ว", "Cancelled"); } }] : []),
  view: o => { const nx = cashOrders().filter(x => !x.cancelled && x.from > o.from).sort((a, b) => (a.from < b.from ? -1 : 1))[0];
    return kv([[L("คำสั่ง", "Order"), `<span class="mono">${esc(o.order)}</span>`], [L("มีผล", "In force"), `${fdate(o.from)}${nx ? ` – ${fdate(addDays(nx.from, -1))}` : ` ${L("เป็นต้นไป", "onwards")}`}`],
      [L("กรรมการ", "Members"), coNames(o.members)], [L("ผู้ทำหน้าที่แทน", "Substitutes"), coNames(o.subs)], o.by && [L("บันทึกโดย", "Recorded by"), `${esc(userName(o.by))} · ${fdate(o.t, true)}`],
      o.cancelled && [L("ยกเลิก", "Cancelled"), `${esc(userName(o.cancelled.by))} · ${esc(o.cancelled.why)}`]])
      + `<p class="sub">${L("ต้องเป็นข้าราชการระดับปฏิบัติการหรือปฏิบัติงานขึ้นไป ระบบยังไม่ตรวจระดับตำแหน่ง ใช้คำสั่งแต่งตั้งเป็นหลัก · ผู้รับหรือจ่ายเงินของวันนั้นตรวจนับไม่ได้ (SD-13)", "Members must be civil servants at practitioner level or above; the system doesn't check rank yet, the appointment order governs · whoever received or paid money that day can't count (SD-13)")}</p>`; },
  hist: o => o.id,
});
FS.cashCmte = () => crudList("fnCmte", { head: `<h2>${L("กรรมการเก็บรักษาเงิน", "Cash committee")}</h2><span class="sp"></span><span class="sub">${L("คำสั่งที่มีผล", "In force")}: ${esc(cashC().order || "—")} · ${L("อย่างน้อย 2 คน (ข้อ 86)", "at least 2 (cl. 86)")}</span>` });

// ---------- receipt books (FR-FC-47, clauses 71–75) ----------
const RB_ST = { use: [["ใช้งาน", "In use"], "p-ok"], full: [["ใช้ครบแล้ว", "Used up"], "p-mute"], old: [["ปีเก่า ยังไม่คืน", "Old year, not returned"], "p-warn"], ret: [["ส่งคืนแล้ว", "Returned"], "p-mute"] };
const rbSt = b => (b.returned ? "ret" : b.fy < FAM_FY ? "old" : rbUsed(b) >= rbCap(b) ? "full" : "use");
const rbHolders = () => S.users.filter(u => u.active !== false && ["fin", "finhead"].includes(u.role));
const rbWho = b => (b.holder ? esc(userName(b.holder)) : esc(unitName(b.unit)));
CRUD.def("fnBook", {
  noun: ["เล่มใบเสร็จรับเงิน", "Receipt book"], st: RB_ST, list: () => (S.rbooks = S.rbooks || []), id: b => b.id, title: b => `${L("เล่มที่", "Book")} ${b.no}`, sub: b => rbWho(b),
  status: rbSt, gone: b => !!b.returned, search: b => `${b.id} ${b.no} ${b.holder ? userName(b.holder) : ""}`,
  filters: [{ id: "fy", label: ["ปีงบประมาณ", "Fiscal year"], opts: () => [...new Set((S.rbooks || []).map(b => b.fy))].sort().map(y => [String(y), String(y)]), get: b => b.fy }],
  cols: [{ h: ["เล่ม", "Book"], sort: b => b.fy * 1000 + Number(String(b.no).split("/")[0]), c: b => `<span class="mono">${b.no}</span>` }, { h: ["ผู้รับเล่ม", "Held by"], c: b => `${rbWho(b)}<div class="sub">${fdate(b.issued)}</div>` },
    { h: ["ใช้แล้ว", "Used"], c: b => `<span class="sub">${rbUsed(b) ? `1–${rbUsed(b)}` : "—"} / ${b.to}${b.void ? ` · ${L("ยกเลิก", "voided")} ${b.void.from}–${b.void.to}` : ""}</span>` }],
  fields: (b, v) => b ? [
    { id: "_no", label: ["เล่ม", "Book"], type: "info", html: `<span class="mono">${b.no}</span> · ${L("เลขที่", "numbers")} ${b.from}–${b.to}` },
    { id: "holder", label: ["ผู้รับเล่ม", "Held by"], type: "select", req: true, value: b.holder || "", opts: rbHolders().map(u => [u.id, userName(u.id)]), hint: L("โอนเล่มให้ผู้อื่นต้องระบุเหตุผล ใบเสร็จที่ออกแล้วยังเป็นของผู้ออก", "Handing the book to someone else needs a reason; receipts already issued stay with whoever issued them") },
  ] : [
    { id: "fy", label: ["ปีงบประมาณ", "Fiscal year"], type: "select", req: true, value: String(FAM_FY), opts: [FAM_FY, FAM_FY + 1].map(y => [String(y), String(y)]), hint: L("ออกเล่มของปีถัดไปได้ก่อน 1 ตุลาคม", "Next year's books can be issued before 1 October") },
    { id: "to", label: ["จำนวนฉบับในเล่ม", "Receipts in the book"], type: "number", req: true, min: 1, max: 500, value: 100 },
    { id: "holder", label: ["ผู้รับเล่ม", "Held by"], type: "select", req: true, blank: L("— เลือกผู้รับเล่ม —", "— choose who holds it —"), value: "", opts: rbHolders().map(u => [u.id, userName(u.id)]) },
  ],
  check: (v, b) => [!b && !(v.to >= 1 && v.to <= 500) && { f: "to", m: L("1 ถึง 500 ฉบับ", "1 to 500 receipts") }].filter(Boolean),
  create: { can: finHead, label: ["ออกเล่มใหม่", "Issue a book"], run: v => {
    const B = S.rbooks = S.rbooks || [], fy = Number(v.fy), seq = maxNo(B.filter(x => x.fy === fy).map(x => x.no), /^(\d+)\//) + 1;
    const b = { id: `BK-${fy}-${pad2(seq)}`, no: `${seq}/${fy}`, fy, from: 1, to: v.to, holder: v.holder, issued: TODAY, returned: null, by: me().id };
    B.push(b); audit(["ออกเล่มใบเสร็จรับเงิน", "Issued a receipt book"], `${b.id} · ${b.no} · ${userName(b.holder)}`);
    notify(["fin"], [`ได้รับเล่มใบเสร็จ ${b.no}`, `Receipt book ${b.no} issued to you`], "fnc-reg:books"); return b; } },
  edit: { can: b => finHead() && !b.returned, why: () => true, run: (b, v, why) => {
    const old = b.holder ? userName(b.holder) : unitName(b.unit); b.holder = v.holder; b.unit = null; audit(["โอนเล่มใบเสร็จรับเงิน", "Handed over a receipt book"], `${b.id} · ${old} → ${userName(b.holder)} · ${why}`); } },
  acts: b => { if (!finHead() || b.returned) return [];
    const used = rbUsed(b);
    return [!b.void && used < b.to && { id: "void", label: L("ยกเลิกเลขที่ยังไม่ใช้", "Void the unused numbers"), kind: "danger", why: true,
        impact: () => L(`เลขที่ ${used + 1}–${b.to} ใช้ไม่ได้อีก (คงอยู่ในทะเบียนพร้อมเหตุผล) ผู้ถือเล่มต้องใช้เล่มอื่น`, `Numbers ${used + 1}–${b.to} can't be used any more (they stay in the register with the reason); the holder needs another book`),
        run: (_, why) => { b.void = { from: used + 1, to: b.to, t: nowIso(), by: me().id, why }; audit(["ยกเลิกเลขที่ใบเสร็จที่ยังไม่ใช้", "Voided unused receipt numbers"], `${b.id} · ${used + 1}–${b.to} · ${why}`); return L("ยกเลิกแล้ว", "Voided"); } },
      { id: "ret", label: L("รับคืนเล่ม", "Take the book back"), confirm: L(`รับคืนเล่ม ${b.no} ใช้แล้ว ${used} ฉบับ เล่มนี้ออกใบเสร็จไม่ได้อีก`, `Take back book ${b.no} with ${used} used; it can't issue receipts any more`),
        run: () => { b.returned = TODAY; b.used = used; audit(["รับคืนเล่มใบเสร็จรับเงิน", "Took back a receipt book"], `${b.id} · ${used}`); return L("รับคืนแล้ว", "Taken back"); } }]; },
  view: b => kv([[L("เล่ม", "Book"), `<span class="mono">${b.no}</span> · ${L("ปีงบประมาณ", "FY")} ${b.fy}`], [L("เลขที่", "Numbers"), `${b.from}–${b.to}`], [L("ผู้รับเล่ม", "Held by"), rbWho(b)], [L("ออกเมื่อ", "Issued"), fdate(b.issued)],
    [L("ใช้แล้ว", "Used"), `${rbUsed(b)}`], b.void && [L("ยกเลิกเลขที่", "Voided numbers"), `${b.void.from}–${b.void.to} · ${esc(userName(b.void.by))} · ${esc(b.void.why)}`], b.returned && [L("รับคืน", "Returned"), fdate(b.returned)]]),
  hist: b => b.id,
});
FS.rbooks = () => {
  const maker = ROLE === "fin", rep = (S.rbookReports || []).find(x => x.fy === FAM_FY - 1), due = `${FAM_FY - 544}-10-31`;
  return crudList("fnBook", { head: `<h2>${L("ทะเบียนคุมใบเสร็จรับเงิน", "Receipt-book register")}</h2><span class="sp"></span><span class="sub">${L("ข้อ 71–75", "Clauses 71–75")}</span>`,
    after: `<div class="body">${rep ? `<p class="sub">${dotI("ok")}${L(`ส่งรายงานใบเสร็จปี ${FAM_FY - 1} แล้ว`, `FY${FAM_FY - 1} receipt report sent`)} ${fdate(rep.t, true)} · ${esc(userName(rep.by))}</p>` : `<p>${dotI(clockDot(due))}${L(`รายงานใบเสร็จที่ได้รับและใช้ไปของปี ${FAM_FY - 1} ภายใน`, `Report FY${FAM_FY - 1} receipt books by`)} ${clockTxt(due)} (${L("ข้อ 74", "cl. 74")})</p>${maker ? `<button class="btn" type="button" id="rb-report">${L("ส่งรายงานใบเสร็จประจำปี", "Send the yearly receipt report")}</button>` : ""}`}</div>` });
};

// ---------- seed: ids for older records, the P-F05 duty rule ----------
function seedFinCrud(s) {
  (s.gfUsers || []).forEach((g, i) => { g.id = g.id || `GU-${pad2(i + 1)}`; });
  if (!s.cashOrders && s.cashCmte) s.cashOrders = [{ id: "CO-01", order: s.cashCmte.order, members: s.cashCmte.members, subs: s.cashCmte.subs || [], from: `${CUR_FY - 545}-10-01`, by: null, t: null }];
  if (s.sod && !s.sod.rules.some(r => r.id === "P-F05")) s.sod.rules.push({ id: "P-F05", on: true });
}
