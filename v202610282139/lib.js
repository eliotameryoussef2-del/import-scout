// Shared UI helpers.
export async function api(path, opts = {}) {
  // Online copy (GitHub Pages): no server, the app reads exported files instead.
  if (window.IMPORT_SCOUT_STATIC) return (await import('./static-api.js')).staticApi(path, opts);
  // location.origin never contains user:password, so this works even when the page was opened with credentials in the URL.
  const res = await fetch(location.origin + '/api' + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ESC[c]));
// Tagged template: interpolations are escaped unless wrapped with raw().
export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => {
    if (i === 0) return s;
    const v = vals[i - 1];
    const str = v == null || v === false ? '' : Array.isArray(v) ? v.map(x => (x?.__raw ? x.s : esc(x))).join('') : v.__raw ? v.s : esc(v);
    return out + str + s;
  }, '');
}
export const raw = s => ({ __raw: true, s: s == null ? '' : String(s) });
export const h = (...a) => raw(html(...a));

export const money = (v, d = 0) => (v == null || !Number.isFinite(Number(v)) ? '—' : (Number(v) < 0 ? '−$' : '$') + Math.abs(Number(v)).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const money2 = v => money(v, 2);
export const pct = v => (v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`);
export function ago(iso) {
  if (!iso) return 'never';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}
export const dateStr = iso => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export const STATUS = {
  recommended: ['Recommended', 'b-good'], filtered: ['Filtered by your settings', 'b-info'], unaffordable: ['Over budget', 'b-warn'],
  unprofitable: ['Loses money', 'b-bad'], insufficient_data: ['No exact match in Lebanon', ''],
};
export const statusBadge = s => h`<span class="badge ${STATUS[s]?.[1] || ''}">${STATUS[s]?.[0] || s}</span>`;
export const LABEL = { exact: ['Exact match', 'b-good'], strong: ['Strongly comparable', 'b-info'], weak: ['Weak / uncertain', 'b-warn'] };
export const labelBadge = l => h`<span class="badge ${LABEL[l]?.[1] || ''}">${LABEL[l]?.[0] || l || 'no match'}</span>`;
export const riskBadge = r => h`<span class="badge ${r === 'low' ? 'b-good' : r === 'medium' ? 'b-warn' : 'b-bad'}">${r || '?'} risk</span>`;
export const freshBadge = (iso, stale) => h`<span class="badge ${stale ? 'b-warn' : 'b-good'}" title="${dateStr(iso)}">${stale ? 'stale · ' : 'verified '}${ago(iso)}</span>`;

export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), ms);
}

/** Minimal SVG line chart. series: [{name, color, points:[{x:Date|number, y}]}] */
export function lineChart(series, { height = 120, yFmt = v => money(v, 2) } = {}) {
  const pts = series.flatMap(s => s.points);
  if (pts.length < 1) return '<div class="empty">No history yet — it builds up as scheduled refreshes run.</div>';
  const xs = pts.map(p => +p.x); const ys = pts.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys); if (y0 === y1) { y0 *= 0.9; y1 = y1 * 1.1 || 1; }
  const W = 600, H = height, P = 28;
  const X = x => P + (x - x0) / (x1 - x0) * (W - P - 8), Y = y => H - 18 - (y - y0) / (y1 - y0) * (H - 30);
  const lines = series.map(s => {
    const ps = [...s.points].sort((a, b) => a.x - b.x);
    // Step line: a price holds until the next observation.
    let d = ''; ps.forEach((p, i) => { d += i === 0 ? `M${X(+p.x)},${Y(p.y)}` : `H${X(+p.x)}V${Y(p.y)}`; });
    if (ps.length) d += `H${X(x1)}`;
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2"/>` + ps.map(p => `<circle cx="${X(+p.x)}" cy="${Y(p.y)}" r="2.5" fill="${s.color}"><title>${esc(s.name)}: ${esc(yFmt(p.y))} — ${new Date(+p.x).toLocaleDateString()}</title></circle>`).join('');
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="spark" style="height:${H}px" role="img" aria-label="Price history">
    <text x="2" y="${Y(y1) + 4}" font-size="10" fill="currentColor" opacity=".6">${esc(yFmt(y1))}</text>
    <text x="2" y="${Y(y0) + 4}" font-size="10" fill="currentColor" opacity=".6">${esc(yFmt(y0))}</text>
    <text x="${P}" y="${H - 3}" font-size="10" fill="currentColor" opacity=".6">${new Date(x0).toLocaleDateString()}</text>
    <text x="${W - 8}" y="${H - 3}" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">${new Date(x1).toLocaleDateString()}</text>
    ${lines}</svg>`;
}
export const PALETTE = ['#2ef2b4', '#ff3d7f', '#7cb4ff', '#ffb84d', '#b892ff', '#9aa0ae', '#3ee08f', '#ff8a3d'];

export function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'number') o[el.name] = el.value === '' ? null : Number(el.value);
    else o[el.name] = el.value;
  }
  return o;
}

// Line icons (24px grid, stroke = currentColor).
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.3 3.9 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.4 0 5.7 3.3 4.5 6.7C19.5 15.4 12 20 12 20z"/>',
  bookmark: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  wallet: '<path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11"/><circle cx="16" cy="13.5" r="1.3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
};
export const icon = (name, cls = '') => raw(`<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`);

/** Budgets of $1,000,000 or more mean "no limit" (the "Any amount" choice in Filters). */
export const ANY_BUDGET = 1000000;
export const budgetLabel = b => (b >= ANY_BUDGET ? 'Any amount' : money(b));

/** How the Lebanese price was found: identical item, closest items (approximate) or similar items (estimate). */
export const evidenceBadge = m => (m?.basis === 'approximate' ? h`<span class="badge b-warn" title="No identical item in Lebanon: compared with the closest items">≈ Approximate</span>`
  : m?.basis === 'similar unbranded' ? h`<span class="badge b-warn" title="Priced from similar unbranded items">Estimate</span>` : '');
