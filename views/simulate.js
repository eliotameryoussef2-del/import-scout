import { api, html, h, money, pct, statusBadge } from '../lib.js';
import { state, refreshChrome } from '../app.js';

export default async function simulate(view) {
  const s = state.settings;
  view.innerHTML = html`<span class="eyebrow">What if</span><h1>Investment simulator</h1>
    <p class="muted">Finds the combination of products and order quantities with the best prudent profit (average of base and conservative cases) whose <b>total cash</b> — goods, shipping, customs, VAT, clearance, packaging, launch ads — stays within your budget. Supplier minimum orders are never reduced.</p>
    <div class="card"><form id="f" class="form-grid">
      <label>Total budget ($)<input type="number" name="budget" value="${s.budget}" min="20" step="10"></label>
      <label>Maximum different products<input type="number" name="max" value="${s.max_products}" min="1" max="10"></label>
      <div style="align-self:end" class="row"><button class="btn primary">Find best mix</button><label class="check"><input type="checkbox" name="save"> make this my default budget</label></div>
    </form></div>
    <div id="out"></div>`;
  const run = async () => {
    const f = view.querySelector('#f');
    const budget = Number(f.budget.value); const max = Number(f.max.value);
    if (f.save.checked) { await api('/settings', { method: 'PUT', body: { budget, max_products: max } }); await refreshChrome(); }
    const out = view.querySelector('#out');
    out.innerHTML = '<div class="loading">Optimising…</div>';
    const [p, opps] = await Promise.all([api(`/portfolio?budget=${budget}&max=${max}`), api('/opportunities')]);
    out.innerHTML = html`
      <section class="card"><h2>Recommended mix for ${money(budget)}</h2>
        ${p.picks.length ? h`<div class="kpis"><div class="kpi"><b>${money(p.totalCash)}</b><span>total cash used</span></div><div class="kpi"><b>${money(budget - p.totalCash)}</b><span>left as reserve</span></div>
          <div class="kpi"><b>${money(p.picks.reduce((t, x) => t + x.base, 0))}</b><span>base-case profit</span></div><div class="kpi"><b>${money(p.picks.reduce((t, x) => t + x.conservative, 0))}</b><span>conservative profit</span></div></div>
          <div class="table-wrap"><table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Cash</th><th class="num">Base profit</th><th class="num">Conservative</th></tr></thead><tbody>
          ${p.picks.map(x => h`<tr><td><a href="#/p/${x.id}">${x.name}</a></td><td class="num">${x.qty}</td><td class="num">${money(x.cash)}</td><td class="num">${money(x.base)}</td><td class="num">${money(x.conservative)}</td></tr>`)}</tbody></table></div>
          <small>Each product's quantity is evaluated separately (its shipment, clearance and launch-ad costs are not shared). Combining products in one consolidated shipment would usually lower costs — ask your forwarder.</small>`
        : h`<div class="empty">No profitable combination fits ${money(budget)} under current assumptions (${p.candidates} candidate(s) evaluated).</div>`}
      </section>
      <section class="card"><h2>What each opportunity needs</h2><div class="table-wrap"><table><thead><tr><th>Product</th><th>Status</th><th class="num">MOQ</th><th class="num">Minimum order, all-in</th><th class="num">Fits ${money(budget)}?</th><th class="num">Base profit</th><th class="num">Margin</th></tr></thead><tbody>
        ${opps.filter(o => o.minCash != null).sort((a, b) => a.minCash - b.minCash).map(o => h`<tr><td><a href="#/p/${o.id}">${o.name}</a></td><td>${statusBadge(o.status)}</td><td class="num">${o.moq}</td><td class="num">${money(o.minCash)}</td><td class="num">${o.minCash <= budget ? '✓' : `needs +${money(o.minCash - budget)}`}</td><td class="num">${money(o.base)}</td><td class="num">${pct(o.margin)}</td></tr>`)}
      </tbody></table></div><small>"Minimum order, all-in" is the cash needed for the supplier's minimum quantity after shipping, duty, VAT, clearance, packaging and launch ads. Profit figures use the budget currently saved in Settings.</small></section>`;
  };
  view.querySelector('#f').addEventListener('submit', e => { e.preventDefault(); run(); });
  run();
}
