// Shared product filters (feed + Browse): kind of object, supplier site, total cost, minimum quantity.
// Choices are remembered on this device only.
import { html, h, money, icon } from './lib.js';
import { state } from './app.js';

const KEY = 'filters:v1';
const COSTS = [100, 250, 500, 1000, 2500];
const MOQS = [1, 10, 50, 100, 500];

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return { kinds: v.kinds || [], platforms: v.platforms || [], maxCost: v.maxCost ?? null, maxMoq: v.maxMoq ?? null }; }
  catch { return { kinds: [], platforms: [], maxCost: null, maxMoq: null }; }
}
export const filters = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(filters)); } catch { /* private mode */ } };

const kindLabel = k => (k === 'other' ? 'Other' : state.meta.kinds?.[k] || k);
/** Cash for the smallest order you can place, all costs in (goods, shipping, customs, VAT, launch ads). */
export const costOf = o => o.minCash ?? o.cash ?? null;

export function applyFilters(rows) {
  return rows.filter(o => (!filters.kinds.length || filters.kinds.includes(o.kind))
    && (!filters.platforms.length || filters.platforms.includes(o.platform))
    && (filters.maxCost == null || (costOf(o) != null && costOf(o) <= filters.maxCost))
    && (filters.maxMoq == null || (o.moq != null && o.moq <= filters.maxMoq)));
}

export const activeCount = () => filters.kinds.length + filters.platforms.length + (filters.maxCost != null) + (filters.maxMoq != null);

/** Button that shows how many filters are on. */
export const filterButton = (cls = 'btn') => h`<button type="button" class="${cls} filter-btn" data-filters>${icon('filter')}<span>Filters</span>${activeCount() ? h`<b class="count">${activeCount()}</b>` : ''}</button>`;

/** Bottom sheet listing every kind and supplier site present in `rows`, with counts. */
/** Bottom sheet; `only` ('kind' | 'platform' | 'cost' | 'moq') shows just that filter. */
export function openFilters(rows, onChange, only = null) {
  const count = (pred) => rows.filter(pred).length;
  const kinds = [...new Set(rows.map(o => o.kind))].sort((a, b) => kindLabel(a).localeCompare(kindLabel(b)));
  const platforms = [...new Set(rows.map(o => o.platform).filter(Boolean))].sort();
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  const draw = () => {
    const shown = applyFilters(rows).length;
    wrap.innerHTML = html`<div class="panel filter-panel" role="dialog" aria-label="Filters">
      <div class="grab"></div>
      <div class="row between"><h2 style="margin:0">${only ? TITLES[only] : 'All filters'}</h2><button type="button" class="btn small" data-clear ${activeCount() ? '' : 'disabled'}>Clear${only ? '' : ' all'}</button></div>
      ${!only || only === 'kind' ? h`${only ? '' : h`<h3>Category</h3>`}
      <div class="chips">${kinds.map(k => h`<button type="button" class="chip ${filters.kinds.includes(k) ? 'on' : ''}" data-kind="${k}">${kindLabel(k)} <small>${count(o => o.kind === k)}</small></button>`)}</div>` : ''}
      ${!only || only === 'platform' ? h`${only ? '' : h`<h3>Supplier site</h3>`}
      <div class="chips">${platforms.map(p => h`<button type="button" class="chip ${filters.platforms.includes(p) ? 'on' : ''}" data-platform="${p}">${p} <small>${count(o => o.platform === p)}</small></button>`)}</div>` : ''}
      ${!only || only === 'cost' ? h`<h3>${only ? '' : 'Total cost to start '}<small class="muted">Cash for the smallest order, all costs in</small></h3>
      <div class="chips"><button type="button" class="chip ${filters.maxCost == null ? 'on' : ''}" data-cost="">Any</button>${COSTS.map(c => h`<button type="button" class="chip ${filters.maxCost === c ? 'on' : ''}" data-cost="${c}">Up to ${money(c)}</button>`)}</div>` : ''}
      ${!only || only === 'moq' ? h`${only ? '' : h`<h3>Minimum quantity</h3>`}
      <div class="chips"><button type="button" class="chip ${filters.maxMoq == null ? 'on' : ''}" data-moq="">Any</button>${MOQS.map(m => h`<button type="button" class="chip ${filters.maxMoq === m ? 'on' : ''}" data-moq="${m}">${m === 1 ? 'From 1 unit' : `Up to ${m}`}</button>`)}</div>` : ''}
      <button type="button" class="btn primary" style="width:100%;margin-top:14px" data-done>Show ${shown} product${shown === 1 ? '' : 's'}</button>
    </div>`;
    const toggle = (list, v) => { const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); else list.push(v); };
    wrap.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { toggle(filters.kinds, b.dataset.kind); save(); draw(); }));
    wrap.querySelectorAll('[data-platform]').forEach(b => b.addEventListener('click', () => { toggle(filters.platforms, b.dataset.platform); save(); draw(); }));
    wrap.querySelectorAll('[data-cost]').forEach(b => b.addEventListener('click', () => { filters.maxCost = b.dataset.cost ? Number(b.dataset.cost) : null; save(); draw(); }));
    wrap.querySelectorAll('[data-moq]').forEach(b => b.addEventListener('click', () => { filters.maxMoq = b.dataset.moq ? Number(b.dataset.moq) : null; save(); draw(); }));
    wrap.querySelector('[data-clear]').addEventListener('click', () => {
      if (!only || only === 'kind') filters.kinds = [];
      if (!only || only === 'platform') filters.platforms = [];
      if (!only || only === 'cost') filters.maxCost = null;
      if (!only || only === 'moq') filters.maxMoq = null;
      save(); draw();
    });
    wrap.querySelector('[data-done]').addEventListener('click', close);
  };
  const close = () => { wrap.remove(); onChange(); };
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  draw();
  document.body.appendChild(wrap);
}

const TITLES = { kind: 'Category', platform: 'Supplier site', cost: 'Total cost to start', moq: 'Minimum quantity' };

/** Neat row of dropdown pills shown above the products: Category ▾  Supplier ▾  Cost ▾  Min qty ▾ */
export function filterBar(extraClass = '') {
  const many = (list, one) => (list.length === 1 ? one(list[0]) : `${list.length} selected`);
  const pills = [
    ['kind', 'Category', filters.kinds.length ? many(filters.kinds, kindLabel) : null],
    ['platform', 'Supplier', filters.platforms.length ? many(filters.platforms, x => x) : null],
    ['cost', 'Cost', filters.maxCost != null ? `≤ ${money(filters.maxCost)}` : null],
    ['moq', 'Min qty', filters.maxMoq != null ? (filters.maxMoq === 1 ? 'From 1' : `≤ ${filters.maxMoq}`) : null],
  ];
  return h`<div class="filter-bar ${extraClass}" role="toolbar" aria-label="Filters">
    ${pills.map(([k, label, val]) => h`<button type="button" class="fpill ${val ? 'on' : ''}" data-fbar="${k}">${val || label}<span class="caret" aria-hidden="true">▾</span></button>`)}
    ${activeCount() ? h`<button type="button" class="fpill clear" data-fclear aria-label="Clear all filters">✕ Clear</button>` : ''}
  </div>`;
}

export function bindFilterBar(root, rows, onChange) {
  root.querySelectorAll('[data-fbar]').forEach(b => b.addEventListener('click', () => openFilters(rows, onChange, b.dataset.fbar)));
  root.querySelector('[data-fclear]')?.addEventListener('click', () => { Object.assign(filters, { kinds: [], platforms: [], maxCost: null, maxMoq: null }); save(); onChange(); });
  root.querySelectorAll('[data-filters]').forEach(b => b.addEventListener('click', () => openFilters(rows, onChange)));
}
