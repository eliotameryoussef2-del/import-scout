import { api, html, h, raw, money, money2, pct, statusBadge, labelBadge, riskBadge, freshBadge, ago, dateStr, toast, lineChart, PALETTE, formData, icon, evidenceBadge } from '../lib.js';
import { state } from '../app.js';
import { renderThread } from '../comments.js';

const SC = ['conservative', 'base', 'optimistic'];

function tiersTable(tiers, currency) {
  return h`<table><thead><tr><th>Quantity</th><th class="num">Unit price</th></tr></thead><tbody>
    ${tiers.map(t => h`<tr><td>${t.min_qty}${t.max_qty ? `–${t.max_qty}` : '+'}</td><td class="num">${t.unit_price} ${currency}</td></tr>`)}</tbody></table>`;
}

function comparablesTable(comps) {
  if (!comps.length) return h`<div class="empty">No comparable Lebanese listing found yet. Matching runs automatically after every catalogue refresh; you can also add one manually below.</div>`;
  return h`<div class="table-wrap"><table><thead><tr><th>Local listing</th><th>Retailer / location</th><th class="num">Price</th><th>Stock</th><th>Match</th><th>Verified</th><th></th></tr></thead><tbody>
  ${comps.map(c => h`<tr>
    <td style="min-width:200px"><a href="${c.url}" target="_blank" rel="noopener">${c.title}</a>${c.variant_title ? h`<br><small>${c.variant_title}</small>` : ''}${c.vendor ? h`<br><small>Brand/vendor: ${c.vendor}</small>` : ''}</td>
    <td>${c.retailer}<br><small>${c.branch_count ? `${c.branch_count} physical branch(es) — ` : 'Online only — '}<a href="#/retailers">directory</a>${c.delivery?.fees ? raw('<br>Delivery: ' + escapeHtml(String(c.delivery.fees).slice(0, 80))) : ''}</small></td>
    <td class="num">${c.price != null ? `${c.price.toLocaleString()} ${c.currency}` : '—'}${c.currency !== 'USD' && c.price_usd ? h`<br><small>${money2(c.price_usd)}</small>` : ''}${c.compare_at_price ? h`<br><small><s>${c.compare_at_price}</s> listed</small>` : ''}</td>
    <td>${c.available === 1 ? h`<span class="badge b-good">in stock</span>` : c.available === 0 ? h`<span class="badge b-bad">out of stock</span>` : h`<span class="badge">unknown</span>`}</td>
    <td>${labelBadge(c.label)}<details><summary>why?</summary><ul class="reasons">${(c.explanation?.reasons || []).map(r => h`<li>${r}</li>`)}</ul></details></td>
    <td>${freshBadge(c.last_success, c.stale)}</td>
    <td><span class="row"><button class="btn small" data-verdict="${c.match_id}" data-v="1" title="Confirm this is comparable">✓</button><button class="btn small" data-verdict="${c.match_id}" data-v="0" title="Not comparable — exclude">✕</button></span>${c.user_verdict === 1 ? h`<small>confirmed</small>` : ''}</td>
  </tr>`)}</tbody></table></div>`;
}
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function costTable(a) {
  const up = a.lines.filter(l => l.stage === 'upfront');
  return h`<div class="table-wrap"><table><thead><tr><th>Cost (paid before selling)</th><th>How it is calculated</th><th class="num">Amount</th></tr></thead><tbody>
    ${up.map(l => h`<tr><td>${l.label}<br><small>${l.source}</small></td><td><small>${l.basis}</small></td><td class="num">${money2(l.amount)}</td></tr>`)}
    <tr class="total"><td colspan="2">Total cash needed (initial investment)</td><td class="num">${money2(a.cashRequired)}</td></tr>
    <tr><td colspan="2">Landed cost per unit (purchase + import + delivery + packaging)</td><td class="num">${money2(a.landedCostPerUnit)}</td></tr>
  </tbody></table></div>`;
}

function scenarioTable(a) {
  const s = a.scenarios;
  const row = (label, f, cls = '') => h`<tr class="${cls}"><td>${label}</td>${SC.map(k => h`<td class="num">${raw(f(s[k]))}</td>`)}</tr>`;
  return h`<div class="table-wrap"><table><thead><tr><th></th><th class="num">Conservative</th><th class="num">Base</th><th class="num">Optimistic</th></tr></thead><tbody>
    ${row('Selling price / unit', x => money(x.price))}
    ${row('Units expected to sell (horizon)', x => `${x.unitsSold} <small>of ${a.qty}</small>`)}
    ${row('Defective / returned', x => `${x.defectiveUnits} / ${x.returns}`)}
    ${row('Cleared at markdown', x => `${x.clearedUnits} @ ${money(x.markdownPrice)}`)}
    ${row('Unsold at end (value at cost)', x => `${x.unsoldUnits} <small>(${money(x.unsoldInventoryValueAtCost)})</small>`)}
    ${row('Revenue', x => money2(x.revenue))}
    ${row('Selling costs (delivery, COD, ads, fees, returns)', x => money2(x.sellingCosts.total))}
    ${row('Initial investment', () => money2(a.cashRequired))}
    ${row('Net profit', x => `<b style="color:var(--${x.netProfit >= 0 ? 'good' : 'bad'})">${money2(x.netProfit)}</b>`, 'total')}
    ${row('Net margin', x => pct(x.margin))}
    ${row('Return on invested capital', x => pct(x.roi))}
    ${row('Cash recovered', x => `${money(x.cashRecovered)} <small>(${pct(x.cashRecoveredPct)})</small>`)}
    ${row('Break-even selling price', x => (x.breakEvenPrice == null ? 'never' : money(Math.ceil(x.breakEvenPrice))))}
    ${row('Break-even quantity', x => (x.breakEvenQty == null ? 'never' : `${x.breakEvenQty} units${x.breakEvenQtyFeasible ? '' : ' ⚠'}`))}
    ${row('Profit if every good unit sold at this price', x => `<small>${money(x.theoreticalProfitAllSold)}</small>`)}
  </tbody></table></div>
  <small>Profit counts only units expected to sell within the planning horizon; unsold stock is shown separately at cost, not as profit. Cash-recovery <i>time</i> is not estimated because no Lebanese sales-rate data exists for this product — validate with a test order or pre-orders.</small>`;
}

const LABEL_TEXT = { similar: 'similar · estimate', exact: 'same specs', strong: 'closest · approximate', weak: 'different' };

const sameBox = m => (m?.basis === 'approximate'
  ? h`<div><span>Closest items in Lebanon</span><b>≈ ${money(m.min, m.min % 1 ? 2 : 0)}</b><small>approximate · not identical · ${m.stores} store${m.stores === 1 ? '' : 's'}${m.max > m.min ? ` · up to ${money(m.max, m.max % 1 ? 2 : 0)}` : ''}</small></div>`
  : m?.basis === 'similar unbranded'
  ? h`<div><span>Similar items in Lebanon</span><b>≈ ${money(m.median)}</b><small>estimate · typical of ${m.listings} unbranded items at ${m.stores} stores (${money(m.min)}–${money(m.max)})</small></div>`
  : m
  ? h`<div><span>Same product in Lebanon</span><b>from ${money(m.min, m.min % 1 ? 2 : 0)}</b><small>${m.stores} store${m.stores === 1 ? '' : 's'}${m.max > m.min ? ` · up to ${money(m.max, m.max % 1 ? 2 : 0)}` : ''}${m.basis.startsWith('same specs where') ? ' · specs partly confirmed' : ''}</small></div>`
  : h`<div><span>Same product in Lebanon</span><b class="muted">not sold</b><small>no store sells the exact same product</small></div>`);
let pmap;

/** Map + list of Lebanese stores selling this product (or a comparable one), with their prices. */
/** Spec-by-spec check against our product: ✓ same, ✗ different, ? not stated on their listing. */
const specChips = c => {
  const rows = c.explanation?.specTable || [];
  if (!rows.length) return '';
  return h`<div class="spec-chips">${rows.map(r => h`<span class="chip-s ${r.match === true ? 'ok' : r.match === false ? 'no' : 'na'}" title="ours: ${r.ours ?? '—'} · theirs: ${r.theirs ?? '—'}">${r.match === true ? '✓' : r.match === false ? '✗' : '?'} ${r.label}: ${r.theirs ?? 'not stated'}</span>`)}</div>`;
};

const SPEC_FIELDS = {
  power_w: ['Power', 'W'], battery_mah: ['Battery', 'mAh'], capacity_ml: ['Capacity', 'ml'], lumens: ['Brightness', 'lm'], thickness_mm: ['Thickness', 'mm'],
  length_cm: ['Length', 'cm'], count: ['Pieces', 'pcs'], inch: ['Screen/size', 'in'], max_load_g: ['Max load', 'g'], bt_version: ['Bluetooth version', ''], ports: ['USB ports', ''], dims_cm: ['Size (L×W×H)', 'cm'],
};
const ALL_FEATURES = ['fm radio', 'tf/sd card', 'microphone', 'rgb lights', 'tws pairing', 'aux input', 'usb-c', 'solar charging', 'remote control', 'noise cancelling', 'wireless charging', 'power bank output', 'hook/hanging', 'dimmable', 'telescopic', 'magnetic'];

/** The specs used to find the exact same product — editable, because supplier pages often leave things out. */
async function renderSpecEditor(view, id) {
  const box = view.querySelector('#spec-editor');
  const d = await api(`/suppliers/${id}/specs`);
  const fields = d.key.numeric.filter(k => SPEC_FIELDS[k]);
  const val = k => (Array.isArray(d.specs[k]) ? d.specs[k].join('x') : d.specs[k] ?? '');
  const summary = fields.map(k => `${SPEC_FIELDS[k][0]}: ${val(k) !== '' ? val(k) + ' ' + SPEC_FIELDS[k][1] : '?'}`).concat(d.key.features ? [`Features: ${(d.specs.features || []).join(', ') || '?'}`] : []).join(' · ');
  box.innerHTML = html`<details class="spec-box"><summary>Matching on: ${summary}${d.model ? ` · model ${d.model}` : ''} <span class="muted">(edit)</span></summary>
    <p class="muted" style="font-size:12.5px">A Lebanese listing counts as the same product only if these match exactly. Fill in or correct any value from the supplier's page; "?" means the supplier doesn't state it.</p>
    <form class="form-grid" id="spec-form">${fields.map(k => h`<label>${SPEC_FIELDS[k][0]}${SPEC_FIELDS[k][1] ? ` (${SPEC_FIELDS[k][1]})` : ''}<input name="${k}" value="${val(k)}" ${k === 'dims_cm' ? 'placeholder="e.g. 22x10x10"' : 'type="number" step="any"'}></label>`)}</form>
    ${d.key.features ? h`<div class="chips">${ALL_FEATURES.map(x => h`<label class="check"><input type="checkbox" name="feat" value="${x}" ${(d.specs.features || []).includes(x) ? 'checked' : ''}> ${x}</label>`)}</div>` : ''}
    <button class="btn small primary" id="spec-save">Save specs & re-match</button></details>`;
  box.querySelector('#spec-save').addEventListener('click', async () => {
    const manual = {};
    for (const k of fields) {
      const v = box.querySelector(`[name="${k}"]`).value.trim();
      manual[k] = v === '' ? '' : k === 'dims_cm' ? v.split(/x|×|\*/i).map(Number).filter(n => n > 0) : Number(v);
    }
    if (d.key.features) manual.features = [...box.querySelectorAll('[name=feat]:checked')].map(c => c.value);
    await api(`/suppliers/${id}`, { method: 'PATCH', body: { manual_specs: manual } });
    toast('Specs saved — re-matched against Lebanese stores'); product(view, id);
  });
}

async function renderStores(view, comps, market) {
  if (market?.basis === 'approximate') {
    comps = comps.filter(c => c.label === 'strong').map(c => ({ ...c, user_verdict: 1 }));
    view.querySelector('#where-title').textContent = 'Closest items in Lebanese stores';
    view.querySelector('#where-note').textContent = 'No store sells this exact item, so the price is an APPROXIMATE prediction from the closest listings: the same kind of product with nothing contradicting, but not every spec is stated on both. Check the differences (chips below each listing) before relying on it. Each pin is a shop branch with its price.';
  }
  if (market?.basis === 'similar unbranded') {
    comps = market.prices.map(l => ({ ...l, price_usd: l.price, label: 'similar', currency: 'USD', user_verdict: 1 }));
    view.querySelector('#where-title').textContent = 'Similar items in Lebanese stores';
    view.querySelector('#where-note').textContent = 'No store sells this exact item, so the selling price is an ESTIMATE from these similar unbranded items of the same kind and pack size (cheapest and dearest 10% left out). Solid pins are each store’s own published location; hollow pins are the town only.';
  }
  // Only the same product counts: identical key specs (or the same model). Different sizes or feature sets are left out.
  const priced = comps.filter(c => c.price_usd > 0 && c.user_verdict !== 0);
  const exact = priced.filter(c => c.label === 'exact' || c.user_verdict === 1);
  const usable = exact;
  const left = priced.length - usable.length;
  const listEl = view.querySelector('#store-list');
  if (!usable.length) { listEl.innerHTML = `<div class="empty">No Lebanese store sells this exact product (same size, power, capacity and features).${left ? ` ${left} similar but different item(s) were found and ignored.` : ''}</div>`; view.querySelector('#pmap').remove(); return; }
  const branches = await api('/branches');
  const byStore = new Map();
  for (const c of usable) {
    const s = byStore.get(c.retailer_id) || { id: c.retailer_id, name: c.retailer, items: [], branches: branches.filter(b => b.retailer_id === c.retailer_id) };
    s.items.push(c); byStore.set(c.retailer_id, s);
  }
  const stores = [...byStore.values()].map(s => ({ ...s, low: Math.min(...s.items.map(i => i.price_usd)) })).sort((a, b) => a.low - b.low);
  const itemLine = c => h`<li><a href="${c.url}" target="_blank" rel="noopener" title="${c.title}">${c.title.length > 70 ? c.title.slice(0, 68) + "…" : c.title}</a> — <b>${money(c.price_usd, c.price_usd % 1 ? 2 : 0)}</b>${c.currency !== 'USD' ? h` <small>(${Number(c.price).toLocaleString()} ${c.currency})</small>` : ''} <span class="badge ${c.label === 'exact' ? 'b-good' : 'b-warn'}">${LABEL_TEXT[c.label] || c.label}</span>${c.brandMismatch ? h` <span class="badge">branded</span>` : ''}${c.available === 0 ? h` <span class="badge b-bad">out of stock</span>` : ''}${specChips(c)}</li>`;
  listEl.innerHTML = (left ? `<p class="muted" style="font-size:12.5px;margin:8px 0 0">${left} similar but different item(s) ignored (other size, power, capacity or features).</p>` : '') + html`<div class="store-list">${stores.map(s => h`<div class="store">
      <div class="row between"><b>${s.name}</b><span>from <b>${money(s.low, s.low % 1 ? 2 : 0)}</b></span></div>
      <small class="muted">${s.branches.length ? s.branches.map(b => b.name || b.municipality).filter(Boolean).slice(0, 4).join(' · ') + (s.branches.length > 4 ? ` +${s.branches.length - 4} more` : '') : 'Online only'}</small>
      <ul class="reasons">${s.items.slice(0, 4).map(itemLine)}</ul>${s.items.length > 4 ? h`<small class="muted">+${s.items.length - 4} more listing(s) in the details below</small>` : ''}
    </div>`)}</div>`;
  if (!window.L) return;
  if (pmap) { pmap.remove(); pmap = null; }
  pmap = L.map('pmap', { scrollWheelZoom: false }).setView([33.89, 35.6], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(pmap);
  const pts = [];
  for (const s of stores) {
    let named = false; // the store name is written once per store; its other branches show the price only
    for (const b of s.branches) {
      if (b.lat == null) continue;
      const verified = b.coord_quality === 'verified';
      // Price + store name right on the map, above the point.
      const icon = L.divIcon({ className: 'price-pin', iconSize: [0, 0],
        html: html`<div class="pp ${s === stores[0] ? 'cheapest' : ''}"><b>${money(s.low, s.low % 1 ? 2 : 0)}</b>${named ? '' : h`<span>${shortName(s.name)}</span>`}</div><i class="pp-dot ${verified ? '' : 'approx'}"></i>` });
      L.marker([b.lat, b.lng], { icon, riseOnHover: true, zIndexOffset: s === stores[0] ? 1000 : 0 }).addTo(pmap)
        .bindPopup(html`<b>${s.name}</b> — from ${money(s.low, s.low % 1 ? 2 : 0)}<br>${b.name || ''}${b.address ? h`<br><small>${b.address}</small>` : ''}<ul class="reasons">${s.items.slice(0, 3).map(itemLine)}</ul><small>${verified ? 'Location published by the store' : 'Approximate (town) location'}</small>`);
      pts.push([b.lat, b.lng]);
      named = true;
    }
  }
  if (pts.length > 1) pmap.fitBounds(pts, { padding: [28, 28], maxZoom: 11 });
  else if (pts.length === 1) pmap.setView(pts[0], 12);
  const online = stores.filter(s => !s.branches.some(b => b.lat != null)).length;
  view.querySelector('#pmap').insertAdjacentHTML('beforebegin', `<div class="map-legend"><span><i class="pp-dot"></i> shop branch (address published by the store)</span><span><i class="pp-dot approx"></i> town only (exact address unknown)</span><span><b class="pp-chip cheapest">green label</b> = cheapest shop</span></div>`);
  if (online) view.querySelector('#pmap').insertAdjacentHTML('afterend', `<p class="muted" style="font-size:12.5px;margin:6px 0 0">${online} of ${stores.length} store(s) sell online only (listed below, not on the map).</p>`);
}

// "Lteif (Lteif Home Appliances / Boèm Home)" → "Lteif" for the map labels.
const shortName = name => name.replace(/\s*\(.*\)\s*$/, '');

// Comments with replies (shared online when signed in; see comments.js).
async function renderComments(view, id, name) {
  await renderThread(view.querySelector('#comment-thread'), id, name);
}

// Why this many units: the order size with the best expected profit that fits the budget,
// between the supplier's minimum and what the shop could sell.
function unitsBox(a, an) {
  const d = a.demand; const b = an.scenarios.base; const months = a.assumptions?.demand?.horizon_months || 3;
  if (!d) return '';
  return h`<details class="cost-box" open><summary><b>Why ${an.qty} units?</b></summary>
    <ul class="reasons" style="margin-top:8px">
      <li>The supplier's minimum order is <b>${an.minQty}</b>.</li>
      <li>At ${money(b.price)} each, you could sell about <b>${d.units.base}</b> in ${months} months (between ${d.units.conservative} and ${d.units.optimistic}). This is an estimate: Lebanon has no public sales figures, so it is based on the price and how many shops stock it.</li>
      <li>The app tried every order size from ${an.minQty} up and kept the one with the <b>highest expected profit</b> that fits your ${money(a.budget)} budget. More units mostly sit unsold; fewer units earn less.</li>
      <li>With ${an.qty} units: about ${b.unitsSold} sell at full price, ${b.clearedUnits} are sold off cheaper (${money(b.markdownPrice)}), ${b.unsoldUnits} may stay unsold${b.defectiveUnits ? `, ${b.defectiveUnits} may be defective` : ''}.</li>
    </ul>
    <small class="muted">Start smaller if you are unsure: test with the minimum order, then reorder what sells.</small>
  </details>`;
}

// What the delivered cost contains, per unit, and which inputs are still estimates to confirm.
function costBox(an, sp, as) {
  const per = x => money(x / an.qty, 2);
  const lines = an.lines.filter(l => l.stage === 'upfront' && !['ads_initial', 'storage'].includes(l.key) && (l.amount > 0 || /included/.test(l.basis)));
  const todo = [];
  if (sp.shipping?.weight_estimated) todo.push(`Weight ${sp.shipping.weight_kg} kg per unit is a typical figure for this product, not the supplier's: ask them for the carton weight and size.`);
  if (as?.freight) todo.push(`Shipping rate ${money(as.freight.rate_per_kg, 2)}/kg (${as.freight.label}) is a typical Lebanese forwarder price: get a written quote before ordering.`);
  todo.push('Supplier price is the listed price: logo, colour or packaging changes can raise it. Confirm it in writing.');
  return h`<details class="cost-box" open><summary><b>What's in the ${money(an.landedCostPerUnit, 2)}?</b> Everything to get one unit to you in Lebanon</summary>
    <table><tbody>${lines.map(l => h`<tr><td>${l.label}<br><small>${l.basis}</small></td><td class="num">${l.amount > 0 ? per(l.amount) : 'included'}</td></tr>`)}
    <tr class="total"><td>Delivered cost per unit</td><td class="num">${money(an.landedCostPerUnit, 2)}</td></tr></tbody></table>
    <p class="muted" style="margin:8px 0 4px"><b>Still estimates, confirm before paying:</b></p><ul class="reasons">${todo.map(t => h`<li>${t}</li>`)}</ul>
  </details>`;
}

export default async function product(view, id) {
  const a = await api(`/opportunities/${id}`);
  const sp = a.supplier;
  const an = a.analysis;
  const hist = await api(`/comparable-history/${id}`).catch(() => []);
  const fx = state.meta.freightOptions;
  view.innerHTML = html`
    <header class="hero">
      ${sp.image ? h`<div class="bg" style="background-image:url('${sp.image}')"></div><img class="main" src="${sp.image}" alt="" referrerpolicy="no-referrer">` : ''}
      <a href="#/" class="back glass" data-back aria-label="Back">${icon('back')}</a>
      <div class="over"><div class="row">${statusBadge(a.status)} ${evidenceBadge(a.pricing?.market)} ${a.risk ? riskBadge(a.risk) : ''} ${a.score != null ? h`<span class="pill">Score ${Math.round(a.score)}/100</span>` : ''}</div>
        <h1>${sp.short_name || sp.title}</h1></div>
    </header>
    <div class="card">
      <div class="buy-box">
        <div><span class="muted">Buy from</span><br><b>${sp.platform}</b>${sp.supplier?.name ? h` — ${sp.supplier.name}` : ''}${sp.supplier?.country ? h` (${sp.supplier.country})` : ''}<br><small>${sp.title}</small></div>
        <a class="btn primary" href="${sp.url}" target="_blank" rel="noopener">Open product page ↗</a>
      </div>

      ${an ? h`<div class="price-trio" style="margin-top:10px">
        <div><span>Costs you</span><b>${money(an.landedCostPerUnit, 2)}</b><small>per unit delivered, all-in · supplier ${money(an.unitPriceUsd, 2)}</small></div>
        <div><span>You sell at</span><b>${money(an.scenarios.base.price)}</b><small>break-even ${money(Math.ceil(an.scenarios.base.breakEvenPrice || 0))}</small></div>
        ${sameBox(a.pricing?.market)}
      </div>
      ${costBox(an, sp, a.assumptions)}
      ${unitsBox(a, an)}
      <div class="kpis">
        <div class="kpi"><b>${an.qty}</b><span>units to order (min. ${a.minimum?.minQty ?? sp.moq})</span></div>
        <div class="kpi"><b>${money(an.cashRequired)}</b><span>total cash needed</span></div>
        <div class="kpi"><b class="${an.scenarios.base.netProfit >= 0 ? 'pos' : 'neg'}">${money(an.scenarios.base.netProfit)}</b><span>expected profit</span></div>
        <div class="kpi"><b class="${an.scenarios.conservative.netProfit >= 0 ? 'pos' : 'neg'}">${money(an.scenarios.conservative.netProfit)}</b><span>worst case · best ${money(an.scenarios.optimistic.netProfit)}</span></div></div>` : ''}
      ${!an ? h`<div class="price-trio" style="margin-top:10px">
        <div><span>You buy at</span><b>${money(sp.price_tiers?.[0]?.unit_price, 2)}</b><small>per unit · min. order ${sp.moq}</small></div>
        <div><span>You sell at</span><b>—</b><small>set your price below</small></div>
        ${sameBox(a.pricing?.market)}</div>` : ''}
      <form id="own-price" class="own-price">
        <label>Your selling price (whole $)<input type="number" name="sell_price" min="1" step="1" value="${sp.sell_price || ''}" placeholder="${an ? an.scenarios.base.price : 'e.g. 25'}"></label>
        <button class="btn small primary">Use my price</button>${sp.sell_price ? h`<button type="button" class="btn small" id="clear-price">Use suggested</button>` : ''}
        <small>${a.pricing?.market ? 'Compare with the same product in Lebanese stores below.' : 'No Lebanese store sells this exact product, so your own price is the only reference.'}</small>
      </form>
      <div id="spec-editor"></div>
      ${a.reason ? h`<p class="explain"><b>${a.reason}</b></p>` : ''}
      ${a.explanation ? h`<p class="explain">${a.explanation}</p>` : ''}
      ${a.warnings?.length ? h`<details><summary>⚠ ${a.warnings.length} thing${a.warnings.length === 1 ? '' : 's'} to check</summary><ul class="warnings">${a.warnings.map(w => h`<li>${w}</li>`)}</ul></details>` : ''}
      <div class="row" style="margin-top:10px"><button class="btn" id="save">${a.saved ? '★ Saved' : '☆ Save to shortlist'}</button><a class="btn" href="#comments" data-jump-comments>💬 Comments</a></div>
      ${a.status === 'unaffordable' ? h`<div class="notice warn" style="margin-top:10px"><b>Over your budget.</b> ${a.reason}
        ${a.alternatives?.length ? h`<br>Lower-minimum alternatives for the same product: ${a.alternatives.map(x => h`<a href="#/p/${x.id}">${x.short_name || x.title.slice(0, 40)} (${x.platform}, MOQ ${x.moq}, min. ${money(x.min_cash)})</a> `)}` : h`<br>No verified lower-MOQ listing of this product type yet — <a href="#/add">add one</a>.`}
        ${a.sharedImport ? h`<br><b>Shared import:</b> ${a.sharedImport.note}` : ''}</div>` : ''}
    </div>

    <section class="card"><h2 id="where-title">Where it's sold in Lebanon</h2>
      <p class="muted" id="where-note">Lebanese stores selling the exact same product — same size, power, capacity and features — with their current price. Bigger, smaller or differently-equipped versions are not counted. Each pin is a shop branch, labelled with that shop's price for this exact product. Tap a pin for the address and the listings.</p>
      <div id="pmap" class="pmap"></div>
      <div id="store-list"></div>
    </section>

    <section class="card" id="comments"><h2>Comments</h2><div id="comment-thread"></div>
    </section>

    <h2 class="section-title">All the details</h2>
    <div class="grid two">
      <details class="card fold"><summary><h2>Supplier</h2></summary>
        <p><a href="${sp.url}" target="_blank" rel="noopener">${sp.title}</a></p>
        <p><small>${sp.platform || ''} · ${sp.supplier?.name || 'supplier not recorded'}${sp.supplier?.country ? ` · ${sp.supplier.country}${sp.supplier.city ? ', ' + sp.supplier.city : ''}` : ''}${sp.supplier?.years ? ` · ${String(sp.supplier.years).match(/yr/i) ? sp.supplier.years : sp.supplier.years + ' yrs'} on platform` : ''}${sp.supplier?.verified ? ` · ${sp.supplier.verified}` : ''}${sp.supplier?.rating ? ` · rating ${sp.supplier.rating}` : ''}</small></p>
        ${tiersTable(sp.price_tiers, sp.currency)}
        <p style="margin-top:8px"><b>Minimum order:</b> ${sp.moq ?? '?'} ${sp.unit || 'units'}${sp.pack_size > 1 ? ` (packs of ${sp.pack_size})` : ''}${sp.min_order_value ? ` · minimum value ${money(sp.min_order_value)}` : ''}
        ${sp.mixed_variants ? h`<br><b>Mixed variants:</b> ${sp.mixed_variants}` : ''}
        ${sp.sample?.offered ? h`<br><b>Samples:</b> ${sp.sample.price ? money2(sp.sample.price) : 'offered'} ${sp.sample.notes || ''}` : ''}
        <br><b>Unit weight:</b> ${sp.shipping.weight_kg ?? '?'} kg${sp.shipping.weight_estimated ? ' (estimated)' : ''}${sp.shipping.package_cm ? ` · package ${sp.shipping.package_cm.join('×')} cm` : ''}${sp.shipping.lead_time_days ? ` · lead time ~${sp.shipping.lead_time_days} days` : ''}</p>
        <p>${freshBadge(sp.last_success || sp.observed_at, a.supplierStale)} <small>observed via ${sp.observed_via || '?'}${sp.last_error ? ` · last check: ${sp.last_error}` : ''}</small></p>
        <p><button class="btn small" id="refresh-sup">↻ Re-check supplier now</button></p>
      </details>
      <details class="card fold"><summary><h2>Price positioning</h2></summary>
        ${a.pricing?.ok ? h`<p>Local comparable prices: <b>${money2(a.pricing.min)} – ${money2(a.pricing.max)}</b> (reference ${money2(a.pricing.reference)}, evidence <b>${a.pricing.evidence}</b>, ${a.pricing.n} listing(s))</p>
          <div class="kpis" style="grid-template-columns:repeat(3,1fr)">${SC.map(k => h`<div class="kpi"><b>${money(a.pricing.prices[k])}</b><span>${k} price</span></div>`)}</div>
          <small>${a.pricing.method}</small>` : h`<p class="muted">${a.pricing?.reason || 'No pricing yet'}</p>`}
        ${a.demand ? h`<h3 style="margin-top:10px">Sellable volume (${a.demand.confidence} confidence)</h3><p>${SC.map(k => `${k}: ${a.demand.units[k]}`).join(' · ')} units over ${a.assumptions?.horizon_months} months</p><ul class="reasons">${a.demand.notes.map(n => h`<li>${n}</li>`)}</ul>` : ''}
      </details>
    </div>

    <details class="card fold"><summary><h2>Lebanese retail comparison</h2></summary>${comparablesTable(a.comparables || [])}
      <details style="margin-top:8px"><summary>Add a local comparable manually</summary>
        <div class="row" style="margin-top:6px"><input id="lp-q" placeholder="Search local catalogues, e.g. yoga mat"><button class="btn small" id="lp-search">Search</button></div><div id="lp-results"></div></details>
    </details>

    ${an ? h`<div class="grid two">
      <details class="card fold"><summary><h2>Cost breakdown — ${an.qty} units</h2></summary>${costTable(an)}</details>
      <details class="card fold"><summary><h2>Profit scenarios</h2></summary>${scenarioTable(an)}</details></div>` : ''}

    ${a.freightComparison?.length ? h`<details class="card fold"><summary><h2>Freight options compared</h2></summary><div class="table-wrap"><table><thead><tr><th>Method</th><th class="num">Transit</th><th class="num">Minimum order, all-in</th><th class="num">Best qty</th><th class="num">Cash</th><th class="num">Base profit</th><th></th></tr></thead><tbody>
      ${a.freightComparison.map(f => h`<tr><td>${f.label}</td><td class="num">~${f.lead_days} d</td><td class="num">${money(f.minCash)}</td><td class="num">${f.qty ?? '—'}</td><td class="num">${money(f.cash)}</td><td class="num">${money(f.baseProfit)}</td><td>${f.chosen ? h`<span class="badge b-good">used</span>` : f.status === 'unaffordable' ? h`<span class="badge b-warn">over budget</span>` : ''}</td></tr>`)}
      </tbody></table></div><small>Rates are estimates until you get forwarder quotes (Settings → Assumptions). Express includes courier clearance; DDP includes duties and VAT.</small></details>` : ''}

    <details class="card fold"><summary><h2>Try other numbers</h2></summary>
      <form id="sim" class="form-grid">
        <label>Budget ($)<input type="number" name="budget" value="${a.budget}" min="10"></label>
        <label>Order quantity<input type="number" name="qty" placeholder="auto (best within budget)" min="1"></label>
        <label>Freight<select name="freight_mode"><option value="auto" ${state.settings.freight_mode === 'auto' ? 'selected' : ''}>Auto (cheapest)</option>${Object.entries(fx).map(([k, v]) => h`<option value="${k}" ${k === state.settings.freight_mode ? 'selected' : ''}>${v.label}</option>`)}</select></label>
        <label>Units you expect to sell (${a.assumptions?.horizon_months || 3} mo)<input type="number" name="demand_units" placeholder="${a.demand?.units?.base ?? ''}"></label>
        <div style="align-self:end"><button class="btn primary">Calculate</button></div>
      </form><div id="sim-out" style="margin-top:10px"></div>
    </details>

    ${a.factors ? h`<details class="card fold"><summary><h2>Why this score</h2></summary><small>Weights are adjustable in Settings.</small>
      ${[...a.factors].sort((x, y) => y.weight - x.weight).map(f => h`<div class="factor"><span>${f.label}</span><div class="bar"><span style="width:${Math.round(f.value * 100)}%"></span></div><b>${Math.round(f.value * 100)}</b><small>${f.why} · weight ${f.weight}</small></div>`)}
    </details>` : ''}

    <details class="card fold"><summary><h2>Price history</h2></summary>
      <div class="legend">${hist.map((s, i) => h`<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${s.retailer}: ${s.title.slice(0, 40)}</span>`)}</div>
      ${raw(lineChart(hist.map((s, i) => ({ name: s.retailer, color: PALETTE[i % PALETTE.length], points: s.points.filter(p => p.price_usd != null).map(p => ({ x: new Date(p.observed_at), y: p.price_usd })) }))))}
      <small>Points are recorded when a price or stock status changes; a flat line means re-checks found the same price. Last successful checks are shown per listing above.</small>
      ${a.history?.length ? h`<h3 style="margin-top:12px">Estimated profit over time</h3>${raw(lineChart([{ name: 'base profit', color: PALETTE[0], points: a.history.filter(x => x.base_profit != null).map(x => ({ x: new Date(x.computed_at), y: x.base_profit })) }, { name: 'conservative', color: PALETTE[1], points: a.history.filter(x => x.conservative_profit != null).map(x => ({ x: new Date(x.computed_at), y: x.conservative_profit })) }], { yFmt: v => money(v) }))}` : ''}
    </details>

    <details class="card fold"><summary><h2>Product data used</h2></summary>
      <form id="edit" class="form-grid">
        <label>Short name<input name="short_name" value="${sp.short_name || ''}"></label>
        <label>HS code (sets the duty rate)<input name="hs_code" value="${sp.hs_code || ''}" placeholder="e.g. 9405.40"></label>
        <label>Unit weight (kg)<input type="number" step="0.001" name="weight_kg" value="${sp.shipping.weight_kg ?? ''}"></label>
        <label>Refresh priority<select name="priority">${['high', 'normal', 'low'].map(p => h`<option ${p === sp.priority ? 'selected' : ''}>${p}</option>`)}</select></label>
        <label>Search terms for local matching<input name="search_terms" value="${sp.search_terms || ''}"></label>
        <div style="align-self:end"><button class="btn">Save & recalculate</button></div>
      </form>
      <p style="margin-top:8px"><small>Duty applied: ${a.assumptions?.duty_source || '—'} (${pct(a.assumptions?.duty_rate)}). VAT ${pct(a.assumptions?.vat_rate)}. Flags: ${Object.entries(sp.flags || {}).filter(([k, v]) => v === true).map(([k]) => k).join(', ') || 'none'}.</small></p>
    </details>`;

  renderStores(view, a.comparables || [], a.pricing?.market).catch(e => console.error(e));
  view.querySelector('[data-jump-comments]')?.addEventListener('click', e => { e.preventDefault(); view.querySelector('#comments').scrollIntoView({ behavior: 'smooth' }); });
  view.querySelector('[data-back]').addEventListener('click', e => { if (history.length > 1) { e.preventDefault(); history.back(); } });
  renderSpecEditor(view, id).catch(e => console.error(e));
  renderComments(view, id, sp.short_name || sp.title).catch(e => console.error(e));
  view.querySelector('#own-price').addEventListener('submit', async e => {
    e.preventDefault();
    const v = Math.round(Number(e.target.sell_price.value));
    if (!(v > 0)) return toast('Enter a whole-dollar price');
    await api(`/suppliers/${id}`, { method: 'PATCH', body: { sell_price: v } });
    toast(`Recalculated with your price of ${v}`); product(view, id);
  });
  view.querySelector('#clear-price')?.addEventListener('click', async () => {
    await api(`/suppliers/${id}`, { method: 'PATCH', body: { sell_price: '' } });
    toast('Back to the suggested price'); product(view, id);
  });
  view.querySelector('#save').addEventListener('click', async () => {
    if (a.saved) await api(`/saved/${id}`, { method: 'DELETE' }); else await api('/saved', { body: { id: Number(id) } });
    toast(a.saved ? 'Removed' : 'Saved — checked daily from now on'); product(view, id);
  });
  view.querySelector('#refresh-sup').addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = 'Checking…';
    const r = await api(`/suppliers/${id}/refresh`, { method: 'POST' });
    toast(`${r.status}: ${r.message}`, 5000); e.target.disabled = false; e.target.textContent = '↻ Re-check supplier now';
  });
  view.querySelectorAll('[data-verdict]').forEach(b => b.addEventListener('click', async () => {
    await api(`/matches/${b.dataset.verdict}/verdict`, { body: { verdict: b.dataset.v === '1' } });
    toast(b.dataset.v === '1' ? 'Confirmed as comparable' : 'Excluded from comparison'); product(view, id);
  }));
  view.querySelector('#lp-search').addEventListener('click', async () => {
    const q = view.querySelector('#lp-q').value;
    const rows = await api(`/local-products?q=${encodeURIComponent(q)}`);
    const out = view.querySelector('#lp-results');
    out.innerHTML = rows.length ? html`<div class="table-wrap"><table>${rows.slice(0, 30).map(r => h`<tr><td><a href="${r.url}" target="_blank" rel="noopener">${r.title}</a><br><small>${r.retailer}</small></td><td class="num">${money2(r.price_usd)}</td><td><select data-l="${r.id}"><option value="strong">strongly comparable</option><option value="exact">exact</option><option value="weak">weak</option></select></td><td><button class="btn small" data-add="${r.id}">Add</button></td></tr>`)}</table></div>` : '<p class="muted">No matches in local catalogues.</p>';
    out.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', async () => {
      await api('/matches', { body: { supplier_product_id: Number(id), local_product_id: Number(b.dataset.add), label: out.querySelector(`[data-l="${b.dataset.add}"]`).value } });
      toast('Added and recalculated'); product(view, id);
    }));
  });
  view.querySelector('#sim').addEventListener('submit', async e => {
    e.preventDefault();
    const f = formData(e.target);
    const r = await api('/simulate', { body: { id: Number(id), ...f } });
    const o = view.querySelector('#sim-out');
    if (!r.analysis) { o.innerHTML = html`<p class="muted">${r.reason || r.status}</p>`; return; }
    o.innerHTML = html`<p>${statusBadge(r.status)} ${r.status === 'unaffordable' ? `Minimum order needs ${money(r.minimum?.cashRequired)}.` : ''}</p>
      <div class="kpis"><div class="kpi"><b>${r.analysis.qty}</b><span>units</span></div><div class="kpi"><b>${money(r.analysis.cashRequired)}</b><span>cash needed</span></div>
      <div class="kpi"><b>${money(r.analysis.scenarios.base.netProfit)}</b><span>base profit</span></div><div class="kpi"><b>${money(r.analysis.scenarios.conservative.netProfit)}</b><span>conservative</span></div></div>
      <details><summary>Full breakdown</summary>${costTable(r.analysis)}${scenarioTable(r.analysis)}</details>`;
  });
  view.querySelector('#edit').addEventListener('submit', async e => {
    e.preventDefault();
    const f = formData(e.target);
    const body = { short_name: f.short_name, hs_code: f.hs_code, priority: f.priority, search_terms: f.search_terms };
    if (f.weight_kg) body.shipping = { ...sp.shipping, weight_kg: f.weight_kg, weight_estimated: false };
    await api(`/suppliers/${id}`, { method: 'PATCH', body });
    toast('Saved and recalculated'); product(view, id);
  });
}
