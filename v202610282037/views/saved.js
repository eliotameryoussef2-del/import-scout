import { api, html, h, money, statusBadge, toast } from '../lib.js';

const STAGES = { investigating: 'Investigating', contacting_supplier: 'Contacting supplier', ordered: 'Ordered', dropped: 'Dropped' };

export default async function saved(view) {
  const rows = await api('/saved');
  view.innerHTML = html`<span class="eyebrow">Your shortlist</span><h1>Saved opportunities</h1>
    <p class="muted">Your shortlist. Saved products are switched to high-priority monitoring (re-checked daily).</p>
    ${rows.length ? h`<div class="grid cards">${rows.map(r => h`<article class="card opp">
      ${r.image ? h`<img src="${r.image}" alt="" referrerpolicy="no-referrer">` : h`<div class="thumb"></div>`}
      <div class="body"><h3><a href="#/p/${r.supplier_product_id}">${r.short_name || r.title}</a></h3>
        <div class="row">${statusBadge(r.opp_status)} <small>${r.qty} units · ${money(r.cash_required)} · base profit ${money(r.base_profit)}</small></div>
        <div class="form-grid" style="margin-top:8px">
          <label>Stage<select data-stage="${r.supplier_product_id}">${Object.entries(STAGES).map(([k, v]) => h`<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`)}</select></label>
          <label>Notes<input data-note="${r.supplier_product_id}" value="${r.note || ''}" placeholder="e.g. asked supplier for sample"></label>
        </div>
        <div class="row" style="margin-top:8px"><a class="btn small" href="#/studio/${r.supplier_product_id}">✎ Marketing</a><a class="btn small" href="${r.url}" target="_blank" rel="noopener">Supplier page ↗</a><button class="btn small" data-del="${r.supplier_product_id}">Remove</button></div>
      </div></article>`)}</div>` : h`<div class="empty">Nothing saved yet. Use ☆ Save on any opportunity.</div>`}`;
  const save = async id => {
    await api('/saved', { body: { id: Number(id), status: view.querySelector(`[data-stage="${id}"]`).value, note: view.querySelector(`[data-note="${id}"]`).value } });
    toast('Updated');
  };
  view.querySelectorAll('[data-stage]').forEach(s => s.addEventListener('change', () => save(s.dataset.stage)));
  view.querySelectorAll('[data-note]').forEach(s => s.addEventListener('change', () => save(s.dataset.note)));
  view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { await api(`/saved/${b.dataset.del}`, { method: 'DELETE' }); saved(view); }));
}
