import { api, html, h, raw, money, pct, statusBadge, labelBadge, riskBadge, ago, toast, icon } from '../lib.js';
import { state, refreshChrome } from '../app.js';
import { applyFilters, filterButton, filters, activeCount, filterBar, bindFilterBar } from '../filters.js';

const BUDGETS = [100, 250, 500, 1000, 2500, 5000];
const TABS = [['recommended', 'Recommended'], ['unaffordable', 'Over budget'], ['filtered', 'Filtered by your settings'], ['insufficient_data', 'Not sold in Lebanon'], ['', 'All'], ['leads', 'Sourcing leads']];

function leadsView(leads) {
  if (!leads.length) return h`<div class="empty">Leads appear once retailer catalogues have been fetched.</div>`;
  return h`<p class="muted">Product types that at least two Lebanese retailers currently list, from the monitored catalogues. A long shelf list shows that retailers stock the category, not proof that it sells. Types without a supplier listing yet are leads: search a supplier, then <a href="#/add">add the listing</a> to get a full landed-cost analysis.</p>
    <div class="table-wrap card"><table><thead><tr><th>Product type</th><th class="num">Retailers</th><th class="num">Listings</th><th class="num">Median price</th><th class="num">Unbranded median</th><th class="num">Out of stock</th><th>Duty (HS)</th><th>Find a supplier</th></tr></thead><tbody>
    ${leads.map(l => h`<tr><td><b>${l.name}</b>${l.covered ? h` <span class="badge b-good">tracked</span>` : ''}<br><small>${l.examples.map(e => `${e.retailer}: $${e.price.toFixed(2)}`).join(' · ')}</small></td>
      <td class="num" title="${l.retailerNames.join(', ')}">${l.retailers}</td><td class="num">${l.listings}${l.newThisWeek ? h`<br><small>+${l.newThisWeek} new</small>` : ''}</td>
      <td class="num">${money(l.medianPrice, 2)}</td><td class="num">${l.unbrandedMedian != null ? money(l.unbrandedMedian, 2) : '—'}</td><td class="num">${pct(l.outOfStockShare)}</td><td>${l.hs || '—'}</td>
      <td><a href="${l.search.alibaba}" target="_blank" rel="noopener">Alibaba</a> · <a href="${l.search.aliexpress}" target="_blank" rel="noopener">AliExpress</a> · <a href="${l.search.madeInChina}" target="_blank" rel="noopener">MIC</a></td></tr>`)}
    </tbody></table></div>`;
}
let tab = 'recommended';
let cat = '';

// Summary card: where to buy, the three prices that matter, and the order. Everything else is one tap away.
export function oppCard(o) {
  const m = o.market;
  return h`<article class="card opp-card" data-open="${o.id}">
    <div class="cover">
      ${o.image ? h`<img src="${o.image}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      ${o.score != null ? h`<span class="score-tag" title="Opportunity score out of 100">${Math.round(o.score)}</span>` : ''}
      <div class="over"><div class="row">${statusBadge(o.status)} ${o.risk ? riskBadge(o.risk) : ''}</div><h3>${o.name}</h3></div>
    </div>
    <div class="inner">
    <p class="buy-from">${icon('box')}<span>Buy on <b>${o.platform || 'supplier'}</b>${o.supplier && !o.supplier.includes(o.platform) ? h` · ${o.supplier}` : ''}</span>
      <a href="${o.url}" target="_blank" rel="noopener" data-stop>View product ↗</a></p>
    <div class="price-trio">
      <div><span>Costs you</span><b>${o.landed ? money(o.landed, 2) : money(o.unitCost, 2)}</b><small>${o.landed ? `delivered, all-in · supplier ${money(o.unitCost, 2)}` : 'supplier price only'} · min. ${o.moq ?? '?'}</small></div>
      <div><span>You sell at</span><b>${o.sellPrice ? money(o.sellPrice) : '—'}</b><small>${o.ownPrice ? 'your price' : o.sellPrice ? 'suggested' : 'set your price'}</small></div>
      <div><span>${m?.basis === 'similar unbranded' ? 'Similar items in Lebanon' : 'Same product in Lebanon'}</span>${m?.basis === 'similar unbranded' ? h`<b>≈ ${money(m.median)}</b><small>estimate from ${m.listings} unbranded items · ${m.stores} stores</small>` : m ? h`<b>from ${money(m.min, m.min % 1 ? 2 : 0)}</b><small>${m.stores} store${m.stores === 1 ? '' : 's'}${m.max > m.min ? ` · up to ${money(m.max)}` : ''}${m.basis.startsWith('same specs where') ? ' · specs partly confirmed' : ''}</small>` : h`<b class="muted">not sold</b><small>no store sells the exact same product</small>`}</div>
    </div>
    ${o.status === 'unprofitable' && o.reason ? h`<p class="explain neg">${o.reason}</p>` : ''}
    ${o.status === 'insufficient_data' ? h`<p class="explain">${o.ownPrice ? '' : 'Nobody in Lebanon sells this exact product, so there is no price to compare. Open it to set your own selling price and see the numbers.'}</p>` : h`
    <p class="order-line">${o.status === 'unaffordable'
      ? h`Minimum order costs <b>${money(o.minCash)}</b> all-in — above your budget.`
      : h`Order <b>${o.qty}</b> units · cash needed <b>${money(o.cash)}</b> · profit <b class="${o.base >= 0 ? 'pos' : 'neg'}">${money(o.base)}</b> <small>(worst case ${money(o.conservative)})</small>`}</p>`}
    <div class="row between card-actions">
      <small>${o.warnings?.length ? `⚠ ${o.warnings.length} thing${o.warnings.length === 1 ? '' : 's'} to check` : ''} · updated ${ago(o.computed_at)}</small>
      <span class="row"><button class="btn small" data-save="${o.id}" data-saved="${o.saved ? 1 : 0}" data-stop>${o.saved ? '★ Saved' : '☆ Save'}</button><a class="btn small primary" href="#/p/${o.id}">Details →</a></span>
    </div>
    </div>
  </article>`;
}

export function bindSave(root, after) {
  root.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', async () => {
    const id = Number(b.dataset.save);
    if (b.dataset.saved === '1') { await api(`/saved/${id}`, { method: 'DELETE' }); toast('Removed from saved'); }
    else { await api('/saved', { body: { id } }); toast('Saved — it will now be re-checked daily'); }
    after?.();
  }));
}

export default async function discover(view) {
  const s = state.settings;
  const draw = async () => {
    const everything = await api('/opportunities');
    const all = applyFilters(everything);
    const leads = tab === 'leads' ? (await api('/leads')).filter(l => !cat || l.category === cat) : null;
    const rows = tab === 'leads' ? [] : all.filter(o => (!tab || tab.split(',').includes(o.status)) && (!cat || o.category === cat));
    const count = k => (k === 'leads' ? '…' : all.filter(o => !k || k.split(',').includes(o.status)).length);
    view.innerHTML = html`
      ${filterBar('on-page')}
      <div class="page-head"><div><span class="eyebrow">Browse</span><h1>Opportunities</h1><p class="muted">Every import compared with the identical product in Lebanese stores, at a <b>${money(state.settings.budget)}</b> budget with shipping, customs, VAT and selling costs included.</p></div>
        <div class="row"><a class="btn" href="#/">${icon('home')} Swipe view</a><a class="btn" href="#/add">${icon('plus')} Add listing</a></div></div>
      <form class="card budget-box" id="budget-form">
        <label for="budget-input"><b>How much can you invest?</b></label>
        <div class="budget-row"><span class="cur">$</span><input id="budget-input" type="number" inputmode="numeric" min="20" step="1" value="${state.settings.budget}" aria-label="Your budget in US dollars"><button class="btn primary">Show what fits</button></div>
        <div class="chips">${BUDGETS.map(b => h`<button type="button" class="chip ${b === state.settings.budget ? 'on' : ''}" data-budget="${b}">${money(b)}</button>`)}</div>
        <small class="muted">Your total cash for one import, all costs included (goods, shipping, customs, VAT, launch ads). Anything that needs more is shown under "Over budget", never hidden.</small>
        <div class="row"><label style="min-width:200px">Category <select id="cat"><option value="">All categories</option>${Object.entries(state.meta.categories).map(([k, v]) => h`<option value="${k}" ${k === cat ? 'selected' : ''}>${v}</option>`)}</select></label>
          <small style="display:block;margin-top:6px">Risk limit: ${state.settings.max_risk} · min profit ${money(state.settings.min_net_profit)} · min margin ${pct(state.settings.min_margin)} · freight: ${state.meta.freightOptions[state.settings.freight_mode]?.label || 'auto (cheapest per order)'} — <a href="#/settings">change</a></small></div>
      </form>
      <div class="filter-summary">${filterButton()}${activeCount() ? h`<small class="muted">Showing ${all.length} of ${everything.length}: ${[filters.kinds.map(k => k === 'other' ? 'Other' : state.meta.kinds[k]).join(', '), filters.platforms.join(', '), filters.maxCost != null ? `cost up to ${money(filters.maxCost)}` : '', filters.maxMoq != null ? `min. qty up to ${filters.maxMoq}` : ''].filter(Boolean).join(' · ')}</small>` : h`<small class="muted">Filter by kind of object, supplier site, total cost or minimum quantity</small>`}</div>
      <div class="tabs">${TABS.map(([k, l]) => h`<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${l} (${count(k)})</button>`)}</div>
      ${leads ? leadsView(leads) : rows.length ? h`<div class="grid cards">${rows.map(oppCard)}</div>` : h`<div class="empty">Nothing here for this budget and these filters.${tab === 'recommended' ? raw(' Try a larger budget, check "Over budget", or <a href="#/add">add a supplier listing</a>.') : ''}</div>`}`;
    view.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
    bindFilterBar(view, everything, draw);
    view.querySelector('#cat').addEventListener('change', e => { cat = e.target.value; draw(); });
    const setBudget = async budget => {
      view.querySelectorAll('.chip').forEach(c => (c.disabled = true));
      toast('Recalculating every opportunity…');
      await api('/settings', { method: 'PUT', body: { budget } });
      await refreshChrome(); draw();
    };
    view.querySelectorAll('[data-budget]').forEach(b => b.addEventListener('click', () => setBudget(Number(b.dataset.budget))));
    view.querySelector('#budget-form').addEventListener('submit', e => {
      e.preventDefault();
      const v = Math.round(Number(view.querySelector('#budget-input').value));
      if (!(v >= 20)) return toast('Enter a budget of at least $20');
      setBudget(v);
    });
    if (location.hash.includes('budget')) view.querySelector('#budget-input').focus();
    bindSave(view, draw);
    // Tapping anywhere on a card (except its links/buttons) opens the full details.
    view.querySelectorAll('[data-open]').forEach(c => c.addEventListener('click', e => {
      if (e.target.closest('a, button, [data-stop]')) return;
      location.hash = `#/p/${c.dataset.open}`;
    }));
  };
  await draw();
}
