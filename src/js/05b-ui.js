// UI kit (round 24, design system v2): inline stroke icons, sparklines, progress rings, avatars and stat cards.
// Everything returns HTML strings, like the rest of the prototype, and takes its colours from CSS variables.
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13v4H6a2 2 0 0 1-2-2"/>',
  pen: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="M14 3v6h6v2"/><path d="m15 21 6-6-2-2-6 6v2z"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
  gantt: '<path d="M4 4v16h16"/><path d="M8 8h6M10 12h8M7 16h5"/>',
  download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4"/><circle cx="12" cy="3" r="1"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="14" r="1.2"/><path d="M2 13v3M22 13v3"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
  scale: '<path d="M12 4v16M7 20h10M5 8h14"/><path d="m5 8-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  checksq: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  kanban: '<rect x="3" y="3" width="5" height="14" rx="1.5"/><rect x="10" y="3" width="5" height="9" rx="1.5"/><rect x="17" y="3" width="4" height="18" rx="1.5"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M15 11c3.3 0 6 1.3 6 3v4c0 1.7-2.7 3-6 3-2 0-3.8-.5-4.9-1.3"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
};
const svgI = (name, sw = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.dot}</svg>`;
const icon = (name, size = 16) => `<span class="ico" style="width:${size}px;height:${size}px">${svgI(name)}</span>`;
const chipIco = (name, tone = "") => `<span class="chipico ${tone}">${svgI(name)}</span>`;
// Menu icons for pages and for the tabs that act as pages in Procurement and Finance.
const NAV_ICON = { home: "home", strategy: "target", requests: "inbox", consolidation: "layers", review: "checksq", submission: "send", allocation: "pie", dashboard: "activity", performance: "award", assistant: "sparkle", admin: "settings",
  cases: "folder", plan: "clipboard", reqn: "file", tor: "book", contracts: "pen", docs: "scan", suppliers: "users", gantt: "gantt", egp: "download", analytics: "chart", forecast: "trend", whatif: "sliders", reports: "cal", flags: "flag", ocds: "share", ai: "sparkle", agents: "bot",
  chain: "link", pay: "card", recon: "scale" };
// sparkline: values → a smooth line with a soft area under it
function spark(vals, o = {}) {
  const w = o.w || 120, h = o.h || 34, c = o.color || "var(--ch-1)", v = vals.length > 1 ? vals : [0, ...(vals.length ? vals : [0])], mn = Math.min(...v), mx = Math.max(...v), rg = mx - mn || 1;
  const pts = v.map((y, i) => [i / (v.length - 1) * (w - 4) + 2, h - 3 - (y - mn) / rg * (h - 8)]), id = "sg" + Math.random().toString(36).slice(2, 8);
  const d = pts.map((p, i) => (i ? `L${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(" ");
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="2.6" fill="${c}"/></svg>`;
}
// progress ring: share 0..1 with the label in the middle
function ring(share, o = {}) {
  const s = o.size || 56, sw = o.stroke || 6, r = (s - sw) / 2, cf = 2 * Math.PI * r, p = Math.max(0, Math.min(1, share || 0)), c = o.color || "var(--ch-1)";
  return `<svg class="ring" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" role="img" aria-label="${o.aria || Math.round(p * 100) + "%"}"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${sw}"/>
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(cf * p).toFixed(1)} ${cf.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="${o.fs || s * 0.26}" font-weight="700" fill="var(--ink)">${o.label != null ? o.label : Math.round(p * 100) + "%"}</text></svg>`;
}
// avatar with initials and a colour from the user id
const AV_COLORS = ["#5B6B8C", "#6B7A99", "#4A5D8A", "#7A8599", "#64748B", "#56627A", "#6E7C91", "#4B5A78"];
function av(uid) { const n = typeof userName === "function" ? userName(uid) : String(uid), h = [...String(uid)].reduce((a, c) => a + c.charCodeAt(0), 0); return `<span class="av" title="${esc(n)}" style="background:${AV_COLORS[h % AV_COLORS.length]}">${esc(n.replace(/^(นาย|นาง|นางสาว|Mr\.?|Ms\.?|Mrs\.?)\s*/, "").slice(0, 1))}</span>`; }
const avs = ids => `<span class="avs">${[...new Set(ids.filter(Boolean))].slice(0, 4).map(av).join("")}</span>`;
// stat card: label, value, optional icon, trend, sparkline or ring, and a link
function statCard(o) {
  return `<div class="stat-card" ${o.link ? `data-link="${o.link}" role="link" tabindex="0"` : ""}><span class="sl">${o.label}</span>${o.ring != null ? `<span style="grid-row:1 / span 2;grid-column:2">${ring(o.ring, { size: 52, stroke: 6, color: o.color })}</span>` : o.icon ? chipIco(o.icon, o.tone || "") : ""}
    <span class="sv">${o.value}${o.unit ? `<small>${o.unit}</small>` : ""}</span>
    <span class="sx">${o.trend ? `<span class="trend ${o.trend.dir}">${o.trend.dir === "up" ? "▲" : o.trend.dir === "down" ? "▼" : "●"} ${o.trend.text}</span>` : `<span>${o.sub || ""}</span>`}${o.spark ? spark(o.spark, { w: 96, h: 28, color: o.color }) : ""}</span></div>`;
}
// keyboard and click handling for stat cards and tiles with data-link (bound globally after each render)
function bindLinks(root = document) { root.querySelectorAll(".stat-card[data-link], .apptile[data-link], .card[data-link]").forEach(el => { el.onclick = () => jump(el.dataset.link); el.onkeydown = e => { if (e.key === "Enter") jump(el.dataset.link); }; }); }
