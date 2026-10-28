import { api, html, h, toast, formData, ago } from '../lib.js';
import { state, refreshChrome } from '../app.js';

const ST = { operational: 'b-good', configured: 'b-good', manual: '', stale: 'b-warn', failing: 'b-bad', blocked: 'b-bad', needs_credentials: 'b-warn', not_implemented: '', not_available: '', not_yet_run: 'b-info', disabled: '' };

export default async function settings(view) {
  const [s, assumptions, integ, jobs, rules] = await Promise.all([api('/settings'), api('/assumptions'), api('/integrations'), api('/jobs'), api('/customs-rules')]);
  const cats = state.meta.categories;
  view.innerHTML = html`<span class="eyebrow">Preferences</span><h1>Settings</h1>
    <form id="f" class="card"><h2>Your constraints</h2><div class="form-grid">
      <label>Maximum investment ($)<input type="number" name="budget" value="${s.budget}" min="20"></label>
      <label>Max different products<input type="number" name="max_products" value="${s.max_products}" min="1"></label>
      <label>Minimum net profit ($)<input type="number" name="min_net_profit" value="${s.min_net_profit}"></label>
      <label>Minimum net margin (%)<input type="number" name="min_margin_pct" value="${Math.round((s.min_margin || 0) * 100)}"></label>
      <label>Maximum risk<select name="max_risk">${['low', 'medium', 'high'].map(r => h`<option ${r === s.max_risk ? 'selected' : ''}>${r}</option>`)}</select></label>
      <label>Max production + shipping days<input type="number" name="max_shipping_days" value="${s.max_shipping_days}"></label>
      <label>Freight method<select name="freight_mode"><option value="auto" ${s.freight_mode === 'auto' ? 'selected' : ''}>Auto — cheapest suitable per order</option>${Object.entries(state.meta.freightOptions).map(([k, v]) => h`<option value="${k}" ${k === s.freight_mode ? 'selected' : ''}>${v.label}</option>`)}</select></label>
      <label>Preferred supplier countries (comma)<input name="supplier_countries" value="${(s.supplier_countries || []).join(', ')}" placeholder="any"></label>
      <label>Language<select name="language">${[['en', 'English'], ['ar', 'Lebanese Arabic'], ['fr', 'French']].map(([k, v]) => h`<option value="${k}" ${k === s.language ? 'selected' : ''}>${v}</option>`)}</select></label>
      <label>Your area<input name="location" value="${s.location || ''}"></label>
    </div>
    <div class="chips" style="margin-top:10px">${[['can_store_inventory', 'I can store inventory at home'], ['prefer_lightweight', 'Prefer small, light products'], ['avoid_fragile', 'Avoid fragile'], ['avoid_regulated', 'Avoid regulated'], ['avoid_battery', 'Avoid batteries'], ['notify_in_app', 'In-app alerts']].map(([k, l]) => h`<label class="check"><input type="checkbox" name="${k}" ${s[k] ? 'checked' : ''}> ${l}</label>`)}</div>
    <p><b>Preferred categories</b> <small>(none = all)</small></p><div class="chips">${Object.entries(cats).map(([k, v]) => h`<label class="check"><input type="checkbox" name="cat_${k}" ${s.categories?.includes(k) ? 'checked' : ''}> ${v}</label>`)}</div>
    <details><summary>Ranking weights</summary><div class="form-grid" style="margin-top:8px">${Object.entries(s.weights).map(([k, v]) => h`<label>${state.meta.factorLabels[k] || k}<input type="number" min="0" max="50" name="w_${k}" value="${v}"></label>`)}</div></details>
    <div class="row" style="margin-top:10px"><button class="btn primary">Save & recalculate</button></div></form>

    <section class="card"><h2>Integrations — what is genuinely operational</h2><div class="table-wrap"><table><thead><tr><th>Group</th><th>Source</th><th>Status</th><th>Details</th></tr></thead><tbody>
      ${integ.map(i => h`<tr><td><small>${i.group}</small></td><td><b>${i.name}</b><br><small>${i.kind}</small></td><td><span class="badge ${ST[i.status] || ''}">${i.status.replace(/_/g, ' ')}</span>${i.automated ? h`<br><small>automated</small>` : ''}</td><td><small>${i.detail}</small></td></tr>`)}</tbody></table></div></section>

    <section class="card"><h2>Refresh schedules</h2><div class="table-wrap"><table>${jobs.map(j => h`<tr><td><b>${j.name}</b><br><small>${j.description}</small></td><td><input type="number" min="5" value="${j.interval_minutes}" data-job="${j.name}" style="width:90px"> min</td><td><label class="check"><input type="checkbox" data-jobon="${j.name}" ${j.enabled ? 'checked' : ''}> on</label></td><td><small>last ${ago(j.last_run_at)}</small></td></tr>`)}</table></div>
      <small>Per-retailer frequency (refresh_hours) and per-product priority (high = daily, normal = every 3 days, low = weekly) are applied inside the hourly jobs, so sources are only contacted when due.</small></section>

    <section class="card"><h2>Cost & tax assumptions</h2><p class="muted">Each value shows its source and status. Change any of them; every opportunity is recalculated.</p>
      <div class="table-wrap"><table><thead><tr><th>Assumption</th><th class="num">Value</th><th>Status / source</th></tr></thead><tbody>
      ${assumptions.map(a => h`<tr><td>${a.label || a.key}<br><small>${a.key}${a.unit ? ' · ' + a.unit : ''}</small></td><td class="num"><input type="number" step="any" value="${a.value}" data-akey="${a.key}" style="width:100px"></td><td><span class="badge ${a.status === 'verified' ? 'b-good' : a.status === 'secondary' ? 'b-info' : a.status === 'user' ? 'b-warn' : ''}">${a.status}</span><br><small>${a.source || ''}${a.notes ? ' — ' + a.notes : ''}</small></td></tr>`)}
      </tbody></table></div>
      <details><summary>Customs duty rules by HS code (${rules.length})</summary><div class="table-wrap"><table><thead><tr><th>Category</th><th>HS</th><th>Description</th><th class="num">Duty</th><th>Source</th></tr></thead>${rules.map(r => h`<tr><td>${r.category}</td><td>${r.hs || '—'}</td><td><small>${r.description || ''}</small></td><td class="num">${Math.round(r.duty_rate * 1000) / 10}%</td><td><span class="badge ${r.status === 'verified' ? 'b-good' : r.status === 'secondary' ? 'b-info' : ''}">${r.status}</span><br><small>${r.source || ''}${r.notes ? ' — ' + r.notes : ''}</small></td></tr>`)}</table></div></details>
    </section>`;
  view.querySelector('#f').addEventListener('submit', async e => {
    e.preventDefault();
    const f = formData(e.target);
    const weights = {}; const categories = [];
    for (const [k, v] of Object.entries(f)) { if (k.startsWith('w_')) weights[k.slice(2)] = Number(v); if (k.startsWith('cat_') && v) categories.push(k.slice(4)); }
    const body = {
      budget: f.budget, max_products: f.max_products, min_net_profit: f.min_net_profit || 0, min_margin: (f.min_margin_pct || 0) / 100, max_risk: f.max_risk,
      max_shipping_days: f.max_shipping_days, freight_mode: f.freight_mode, supplier_countries: f.supplier_countries.split(',').map(x => x.trim()).filter(Boolean),
      language: f.language, location: f.location, can_store_inventory: f.can_store_inventory, prefer_lightweight: f.prefer_lightweight, avoid_fragile: f.avoid_fragile,
      avoid_regulated: f.avoid_regulated, avoid_battery: f.avoid_battery, notify_in_app: f.notify_in_app, categories, weights,
    };
    const r = await api('/settings', { method: 'PUT', body });
    await refreshChrome();
    toast(`Saved. ${r.recomputed.recommended} recommended, ${r.recomputed.unaffordable} over budget.`, 4000);
  });
  view.querySelectorAll('[data-akey]').forEach(i => i.addEventListener('change', async () => {
    await api(`/assumptions/${i.dataset.akey}`, { method: 'PUT', body: { value: Number(i.value) } }); toast('Assumption updated, opportunities recalculated');
  }));
  view.querySelectorAll('[data-job]').forEach(i => i.addEventListener('change', async () => { await api(`/jobs/${i.dataset.job}`, { method: 'PATCH', body: { interval_minutes: Number(i.value) } }).then(() => toast('Schedule updated')).catch(e => toast(e.message)); }));
  view.querySelectorAll('[data-jobon]').forEach(i => i.addEventListener('change', async () => { await api(`/jobs/${i.dataset.jobon}`, { method: 'PATCH', body: { enabled: i.checked } }); toast(i.checked ? 'Enabled' : 'Disabled'); }));
}
