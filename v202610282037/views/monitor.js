import { api, html, h, ago, dateStr, money, money2, toast, statusBadge } from '../lib.js';
import { refreshChrome } from '../app.js';

const SEV = { good: 'b-good', warn: 'b-warn', error: 'b-bad', info: 'b-info' };

export default async function monitor(view) {
  const [m, alerts] = await Promise.all([api('/monitor'), api('/alerts')]);
  view.innerHTML = html`<span class="eyebrow">Automation</span><h1>Price monitoring</h1>
    <p><a href="#/rejected">See the products the app does not list (they lose money, or nothing comparable is sold in Lebanon) →</a></p>
    <p class="muted">Background jobs keep running while the app is closed (as long as the server runs). Values that fail to refresh keep their last known value and are marked stale — they are never shown as freshly verified.</p>
    <section class="card"><div class="row between"><h2>Alerts</h2><button class="btn small" id="read-all">Mark all read</button></div>
      ${alerts.length ? h`<div class="table-wrap"><table>${alerts.slice(0, 60).map(a => h`<tr style="${a.read ? 'opacity:.6' : ''}"><td><span class="badge ${SEV[a.severity] || ''}">${a.type.replace(/_/g, ' ')}</span></td><td>${a.ref_kind === 'supplier_product' ? h`<a href="#/p/${a.ref_id}">${a.message}</a>` : a.message}</td><td><small>${ago(a.created_at.replace(' ', 'T') + (a.created_at.includes('Z') ? '' : 'Z'))}</small></td></tr>`)}</table></div>` : h`<div class="empty">No alerts yet.</div>`}
    </section>
    <section class="card"><h2>Background jobs</h2><div class="table-wrap"><table><thead><tr><th>Job</th><th>Every</th><th>Last run</th><th>Status</th><th>Next</th><th></th></tr></thead><tbody>
      ${m.jobs.map(j => h`<tr><td><b>${j.name}</b><br><small>${j.description}</small></td><td>${j.interval_minutes >= 60 ? `${j.interval_minutes / 60} h` : `${j.interval_minutes} min`}</td>
        <td><small>${j.last_run_at ? ago(j.last_run_at) : 'never'}</small></td>
        <td><span class="badge ${j.last_status === 'ok' ? 'b-good' : j.last_status === 'partial' ? 'b-warn' : j.last_status === 'error' ? 'b-bad' : ''}">${j.last_status || '—'}</span>${j.last_error ? h`<br><small>${j.last_error.slice(0, 140)}</small>` : ''}${j.consecutive_failures ? h`<br><small>${j.consecutive_failures} failure(s) in a row — backing off</small>` : ''}</td>
        <td><small>${j.enabled ? (j.next_run_at ? dateStr(j.next_run_at) : 'soon') : 'disabled'}</small></td>
        <td><button class="btn small" data-run="${j.name}">Run now</button></td></tr>`)}</tbody></table></div></section>
    <div class="grid two">
      <section class="card"><h2>Retailer catalogues</h2><div class="table-wrap"><table><thead><tr><th>Retailer</th><th class="num">Products</th><th>Last success</th><th>Status</th></tr></thead><tbody>
        ${m.retailers.filter(r => r.connector).map(r => {
          const stale = !r.last_price_success || Date.now() - Date.parse(r.last_price_success) > r.refresh_hours * 3 * 3600e3;
          return h`<tr><td>${r.name}<br><small>${r.connector}, every ${r.refresh_hours} h</small></td><td class="num">${r.product_count}</td><td><small>${ago(r.last_price_success)}</small></td><td><span class="badge ${stale ? 'b-warn' : 'b-good'}">${stale ? 'stale' : 'fresh'}</span>${r.last_price_error ? h`<br><small>${r.last_price_error.slice(0, 120)}</small>` : ''}</td></tr>`;
        })}</tbody></table></div>
        <small>Directory-only retailers (no machine-readable catalogue) are not listed here.</small></section>
      <section class="card"><h2>Supplier listings</h2><div class="table-wrap"><table><thead><tr><th>Listing</th><th>Priority</th><th>Last verified price</th><th>Last check</th></tr></thead><tbody>
        ${m.suppliers.map(s => h`<tr><td><a href="#/p/${s.id}">${s.short_name || s.title.slice(0, 50)}</a><br><small>${s.platform} · ${s.observed_via}</small></td><td>${s.priority}</td><td><small>${ago(s.last_success)}</small></td><td><small>${s.last_checked ? ago(s.last_checked) : 'never'}${s.last_error ? ' — ' + s.last_error.slice(0, 90) : ''}</small></td></tr>`)}</tbody></table></div></section>
    </div>
    <div class="grid two">
      <section class="card"><h2>Recent local price changes (tracked comparables)</h2>
        ${m.recentChanges.length ? h`<div class="table-wrap"><table>${m.recentChanges.map(c => h`<tr><td><a href="${c.url}" target="_blank" rel="noopener">${c.title.slice(0, 60)}</a><br><small>${c.retailer}</small></td><td class="num">${c.prev_price != null ? h`<s>${c.prev_price}</s> → ` : h`<small>first seen </small>`}${c.price} ${c.currency}</td><td><small>${ago(c.observed_at)}</small></td></tr>`)}</table></div>` : h`<div class="empty">No changes recorded yet.</div>`}</section>
      <section class="card"><h2>Profitability recalculations</h2><div class="table-wrap"><table>${m.opportunityChanges.slice(0, 40).map(o => h`<tr><td><a href="#/p/${o.supplier_product_id}">${o.short_name || o.title.slice(0, 40)}</a></td><td>${statusBadge(o.status)}</td><td class="num">${money(o.base_profit)}</td><td><small>${ago(o.computed_at)}</small></td></tr>`)}</table></div></section>
    </div>
    <div class="grid two">
      <section class="card"><h2>Exchange rates</h2><table>${m.fx.map(f => h`<tr><td>1 USD</td><td class="num">${f.per_usd.toLocaleString()} ${f.currency}</td><td><small>${f.source} · ${ago(f.observed_at)}</small></td></tr>`)}</table></section>
      <section class="card"><h2>Source requests (48 h)</h2><table>${m.http.map(x => h`<tr><td>${x.host}</td><td class="num">${x.ok}/${x.n} ok</td><td><small>${ago(x.last.endsWith('Z') ? x.last : x.last)}</small></td></tr>`)}</table><small>Requests are spaced per host and respect robots.txt.</small></section>
    </div>`;
  view.querySelector('#read-all').addEventListener('click', async () => { await api('/alerts/read', { body: {} }); await refreshChrome(); monitor(view); });
  view.querySelectorAll('[data-run]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true; b.textContent = 'Running…';
    const r = await api(`/jobs/${b.dataset.run}/run`, { method: 'POST' });
    toast(`${b.dataset.run}: ${r.status || (r.skipped ? 'skipped (' + r.reason + ')' : 'done')}`, 4000);
    await refreshChrome(); monitor(view);
  }));
}
