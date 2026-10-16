// M02 deeper features (round 8): the standard-price catalogue on budget lines and pasting lines
// copied from a spreadsheet. Standard prices are kept in M10 · Master data.
const stdPrice = it => { const nm = Array.isArray(it.name) ? it.name : [it.name, it.name]; return S.prices.find(p => p.name.includes(nm[0]) || p.name.includes(nm[1])); };
function priceNote(it, i) {
  const el = $("#sp" + i); if (!el) return;
  const sp = stdPrice(it);
  if (!sp) { el.textContent = ""; el.className = "sp-note"; return; }
  const over = Number(it.price) > sp.price;
  el.className = "sp-note" + (over ? " over" : "");
  el.textContent = `${over ? L("เกินราคามาตรฐาน", "Above standard") : L("ราคามาตรฐาน", "Standard")} ${fmt(sp.price)}`;
}
// Picking a catalogue item fills in its budget type, unit and standard price.
function fromCatalogue(r, i) {
  const it = r.items[i], sp = stdPrice(it);
  if (!sp) return false;
  it.name = sp.name.slice(); it.type = sp.type; it.unitName = sp.unit.slice();
  if (!Number(it.price)) it.price = sp.price;
  toast(`${L("ใช้ข้อมูลจากบัญชีราคามาตรฐาน", "Filled from the standard price list")} ${sp.id}`);
  return true;
}

// ---------- paste from Excel ----------
let PASTE_ROWS = [];
const PASTE_SAMPLE = () => L(
  "งบลงทุน\tเครื่องคอมพิวเตอร์โน้ตบุ๊ก\t10\tเครื่อง\t24000\nงบดำเนินงาน\tค่าอบรมต่อคน\t40\tคน\t2500\nงบดำเนินงาน\tค่าจ้างที่ปรึกษาต่อเดือน\t6\tคน-เดือน\tหกหมื่น",
  "Investment\tNotebook computer\t10\tunit\t24000\nOperating\tTraining per person\t40\tperson\t2500\nOperating\tConsultant per month\t6\tperson-month\tsixty thousand");
function typeFrom(v) {
  const s = String(v || "").trim().toLowerCase();
  const t = BUDGET_TYPES.find(b => b.code === s || b.id === s || b.name.some(n => n.toLowerCase() === s));
  return t ? t.id : null;
}
function parsePaste(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map((line, n) => {
    let c = line.split("\t").map(x => x.trim());
    if (c.length < 4) c = line.split(/\s{2,}|,/).map(x => x.trim()); // fallback for text without tabs
    let type = typeFrom(c[0]);
    if (type) c = c.slice(1); else type = null;
    const [name, qty, unit, price] = c, num = v => Number(String(v || "").replace(/[, ]/g, ""));
    const sp = stdPrice({ name: name || "" });
    const row = { n: n + 1, type: type || (sp ? sp.type : "ope"), name: name || "", qty: num(qty), unitName: unit || "", price: num(price), errs: [] };
    if (!row.name) row.errs.push(L("ไม่มีชื่อรายการ", "no item name"));
    if (!(row.qty > 0)) row.errs.push(L("จำนวนไม่ใช่ตัวเลข", "quantity is not a number"));
    if (!(row.price > 0)) row.errs.push(L("ราคาไม่ใช่ตัวเลข", "price is not a number"));
    if (!type && !sp) row.warn = L("ไม่ระบุงบรายจ่าย ใช้งบดำเนินงาน", "no budget type; using Operating");
    if (sp && row.price > sp.price) row.warn = `${L("เกินราคามาตรฐาน", "above standard price")} ${fmt(sp.price)}`;
    return row;
  });
}
function renderPaste() {
  const box = $("#paste-box"), ok = PASTE_ROWS.filter(r => !r.errs.length);
  box.innerHTML = `<div class="f"><label for="paste-in">${L("คัดลอกแถวจาก Excel แล้ววางที่นี่: งบรายจ่าย (ไม่บังคับ) · รายการ · จำนวน · หน่วยนับ · ราคาต่อหน่วย", "Copy rows from Excel and paste here: budget type (optional) · item · qty · unit · unit price")}</label>
      <textarea id="paste-in" rows="4" spellcheck="false" style="font-family:var(--mono);font-size:13px"></textarea></div>
    <div class="row"><button class="btn" type="button" id="paste-sample">${L("ใส่ข้อมูลตัวอย่าง", "Use sample rows")}</button><span class="sp"></span>
      <button class="btn ghost" type="button" id="paste-close">${L("ปิด", "Close")}</button>
      <button class="btn primary" type="button" id="paste-add" ${ok.length ? "" : "disabled"}>${L("เพิ่ม", "Add")} ${ok.length} ${L("รายการ", "lines")}</button></div>
    ${PASTE_ROWS.length ? `<div class="tbl-wrap"><table><thead><tr><th class="n">#</th><th>${L("งบรายจ่าย", "Type")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("จำนวน", "Qty")}</th><th>${L("หน่วยนับ", "Unit")}</th><th class="n">${L("ราคา", "Price")}</th><th>${L("ผลตรวจ", "Check")}</th></tr></thead>
      <tbody>${PASTE_ROWS.map(r => `<tr><td class="n">${r.n}</td><td class="sub">${typeName(r.type)}</td><td>${esc(r.name)}</td><td class="n">${r.qty > 0 ? fmt(r.qty) : "—"}</td><td class="sub">${esc(r.unitName)}</td><td class="n">${r.price > 0 ? fmt(r.price) : "—"}</td>
        <td>${r.errs.length ? tag(r.errs.join(", "), "p-bad") : r.warn ? tag(r.warn, "p-warn") : tag(L("พร้อมเพิ่ม", "Ready"), "p-ok")}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
}
function bindPaste(r) {
  const open = $("#paste-open"), box = $("#paste-box");
  if (!open || !box) return;
  const wire = text => {
    const inp = $("#paste-in"); inp.value = text || "";
    inp.oninput = () => { PASTE_ROWS = parsePaste(inp.value); const v = inp.value, pos = inp.selectionStart; renderPaste(); wire(v); $("#paste-in").focus(); $("#paste-in").setSelectionRange(pos, pos); };
    $("#paste-sample").onclick = () => { const s = PASTE_SAMPLE(); PASTE_ROWS = parsePaste(s); renderPaste(); wire(s); };
    $("#paste-close").onclick = () => { box.hidden = true; PASTE_ROWS = []; };
    $("#paste-add").onclick = () => {
      const ok = PASTE_ROWS.filter(x => !x.errs.length), skipped = PASTE_ROWS.length - ok.length;
      ok.forEach(x => r.items.push({ type: x.type, name: x.name, qty: x.qty, unitName: x.unitName, price: x.price }));
      // A multi-year request keeps its yearly split adding up: new lines are budgeted in the first year.
      const added = ok.reduce((s, x) => s + x.qty * x.price, 0), y0 = r.multi && r.years ? Object.keys(r.years).sort()[0] : null;
      if (y0) r.years[y0] = Number(r.years[y0] || 0) + added;
      r.items = r.items.filter(it => tx(it.name).trim() || itemTotal(it) > 0);
      audit(["วางรายการจาก Excel", "Pasted lines from Excel"], `${r.id} · ${ok.length}`);
      PASTE_ROWS = []; box.hidden = true; renderItems(); renderTimeline(); commit();
      toast(`${L("เพิ่มรายการแล้ว", "Lines added")} ${ok.length}${skipped ? ` · ${L("ข้ามแถวที่มีข้อผิดพลาด", "skipped rows with errors:")} ${skipped}` : ""}${y0 ? ` · ${L("เพิ่มวงเงินในปี", "added to FY")} ${y0}` : ""}`);
    };
  };
  open.onclick = () => { box.hidden = !box.hidden; if (!box.hidden) { PASTE_ROWS = []; renderPaste(); wire(""); $("#paste-in").focus(); } };
}
