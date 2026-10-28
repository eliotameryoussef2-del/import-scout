// Product filters (feed + Browse), like Darb: one Filters button opens a full-screen list —
// Budget, Category, Supplier site, Total cost, Minimum quantity — and each row opens its options.
// Budget is saved in the app's settings; the other choices are remembered on this device only.
import { html, h, raw, money, icon, api, toast } from './lib.js';
import { state, refreshChrome } from './app.js';

const KEY = 'filters:v1';
const COSTS = [100, 250, 500, 1000, 2500];
const MOQS = [1, 10, 50, 100, 500];
const BUDGETS = () => window.IMPORT_SCOUT_STATIC?.budgets || [100, 250, 500, 1000, 2500, 5000, 10000];

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

/** The Filters button (icon, with how many filters are on). */
export const filterButton = (cls = '') => h`<button type="button" class="filter-icon ${cls}" data-filters aria-label="Filters">${icon('filter')}${activeCount() ? h`<b>${activeCount()}</b>` : ''}</button>`;

/** Wire every Filters button inside `root`. getRows() returns all products (unfiltered); onChange redraws the page. */
export function bindFilters(root, getRows, onChange) {
  root.querySelectorAll('[data-filters]').forEach(b => b.addEventListener('click', () => openFilterPanel(getRows, onChange)));
}

const TITLES = { budget: 'Budget', kind: 'Category', platform: 'Supplier site', cost: 'Total cost to start', moq: 'Minimum quantity' };

export async function openFilterPanel(getRows, onChange, startPage = null) {
  let rows = await getRows();
  let page = startPage;
  const wrap = document.createElement('div');
  wrap.className = 'fpanel';
  wrap.setAttribute('role', 'dialog');
  const toggle = (list, v) => { const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); else list.push(v); };
  const count = pred => applyFiltersExcept(rows, page).filter(pred).length;
  const summary = {
    budget: () => money(state.settings.budget),
    kind: () => (filters.kinds.length ? filters.kinds.map(kindLabel).join(', ') : 'All'),
    platform: () => (filters.platforms.length ? filters.platforms.join(', ') : 'All'),
    cost: () => (filters.maxCost != null ? `Up to ${money(filters.maxCost)}` : 'Any'),
    moq: () => (filters.maxMoq != null ? (filters.maxMoq === 1 ? 'From 1 unit' : `Up to ${filters.maxMoq} units`) : 'Any'),
  };
  const hints = { budget: 'Cash you can put into one import', kind: 'What the product is', platform: 'Where you buy it', cost: 'Smallest order, all costs in', moq: 'Fewest units the supplier sells' };
  const opt = (on, attrs, label, n) => h`<button type="button" class="fopt ${on ? 'on' : ''}" ${raw(attrs)}><span>${label}</span>${n != null ? h`<small>${n}</small>` : ''}<i>${on ? '✓' : ''}</i></button>`;

  const draw = () => {
    const shown = applyFilters(rows).length;
    let body;
    if (!page) {
      body = h`${Object.keys(TITLES).map(k => h`<button type="button" class="frow" data-page="${k}"><span><b>${TITLES[k]}</b><small>${hints[k]}</small></span><em>${summary[k]()}</em><i class="chev">›</i></button>`)}`;
    } else if (page === 'budget') {
      const b = state.settings.budget;
      body = h`<p class="fnote">Everything is recalculated for this budget: what fits, how many units to order and the profit.</p>
        ${BUDGETS().map(v => opt(v === b, `data-budget="${v}"`, money(v)))}
        ${window.IMPORT_SCOUT_STATIC ? '' : h`<form class="fcustom" data-custom><label>Other amount<input type="number" inputmode="numeric" min="20" step="1" placeholder="e.g. 750" value="${BUDGETS().includes(b) ? '' : b}"></label><button class="btn primary">Use</button></form>`}`;
    } else if (page === 'kind') {
      const kinds = [...new Set(rows.map(o => o.kind))].sort((a, b) => kindLabel(a).localeCompare(kindLabel(b)));
      body = h`${opt(!filters.kinds.length, 'data-kind=""', 'All categories')}${kinds.map(k => opt(filters.kinds.includes(k), `data-kind="${k}"`, kindLabel(k), count(o => o.kind === k)))}`;
    } else if (page === 'platform') {
      const ps = [...new Set(rows.map(o => o.platform).filter(Boolean))].sort();
      body = h`${opt(!filters.platforms.length, 'data-platform=""', 'All supplier sites')}${ps.map(p => opt(filters.platforms.includes(p), `data-platform="${p}"`, p, count(o => o.platform === p)))}`;
    } else if (page === 'cost') {
      body = h`${opt(filters.maxCost == null, 'data-cost=""', 'Any')}${COSTS.map(c => opt(filters.maxCost === c, `data-cost="${c}"`, `Up to ${money(c)}`, count(o => costOf(o) != null && costOf(o) <= c)))}`;
    } else if (page === 'moq') {
      body = h`${opt(filters.maxMoq == null, 'data-moq=""', 'Any')}${MOQS.map(m => opt(filters.maxMoq === m, `data-moq="${m}"`, m === 1 ? 'From 1 unit' : `Up to ${m} units`, count(o => o.moq != null && o.moq <= m)))}`;
    }
    wrap.innerHTML = html`<div class="fhead">
        <button type="button" class="fback" data-back aria-label="${page ? 'Back' : 'Close'}">${page ? '‹' : '✕'}</button>
        <b>${page ? TITLES[page] : 'Filters'}</b>
        <button type="button" class="flink" data-reset ${(!page && !activeCount()) || page === 'budget' ? 'hidden' : ''}>${page ? 'Clear' : 'Reset'}</button>
      </div>
      <div class="fbody">${body}</div>
      <div class="ffoot"><button type="button" class="btn primary fsee" data-see>See ${shown} product${shown === 1 ? '' : 's'}</button></div>`;
    bind();
  };

  const setBudget = async v => {
    if (!(v >= 20)) return toast('Enter a budget of at least $20');
    wrap.querySelectorAll('button').forEach(b => (b.disabled = true));
    toast('Recalculating every product for this budget…');
    await api('/settings', { method: 'PUT', body: { budget: Math.round(v) } });
    await refreshChrome();
    rows = await getRows();
    page = null; draw();
  };

  const bind = () => {
    wrap.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { page = b.dataset.page; draw(); }));
    wrap.querySelector('[data-back]').addEventListener('click', () => { if (page && !startPage) { page = null; draw(); } else close(); });
    wrap.querySelector('[data-see]').addEventListener('click', close);
    wrap.querySelector('[data-reset]').addEventListener('click', () => {
      if (!page || page === 'kind') filters.kinds = [];
      if (!page || page === 'platform') filters.platforms = [];
      if (!page || page === 'cost') filters.maxCost = null;
      if (!page || page === 'moq') filters.maxMoq = null;
      save(); draw();
    });
    wrap.querySelectorAll('[data-budget]').forEach(b => b.addEventListener('click', () => setBudget(Number(b.dataset.budget))));
    wrap.querySelector('[data-custom]')?.addEventListener('submit', e => { e.preventDefault(); setBudget(Number(e.target.querySelector('input').value)); });
    wrap.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { if (b.dataset.kind) toggle(filters.kinds, b.dataset.kind); else filters.kinds = []; save(); draw(); }));
    wrap.querySelectorAll('[data-platform]').forEach(b => b.addEventListener('click', () => { if (b.dataset.platform) toggle(filters.platforms, b.dataset.platform); else filters.platforms = []; save(); draw(); }));
    wrap.querySelectorAll('[data-cost]').forEach(b => b.addEventListener('click', () => { filters.maxCost = b.dataset.cost ? Number(b.dataset.cost) : null; save(); page = startPage ? page : null; draw(); }));
    wrap.querySelectorAll('[data-moq]').forEach(b => b.addEventListener('click', () => { filters.maxMoq = b.dataset.moq ? Number(b.dataset.moq) : null; save(); page = startPage ? page : null; draw(); }));
  };
  const dismiss = () => { wrap.remove(); document.body.classList.remove('fpanel-open'); window.removeEventListener('hashchange', dismiss); };
  const close = () => { dismiss(); onChange(); };
  window.addEventListener('hashchange', dismiss); // going to another page closes the panel
  draw();
  document.body.appendChild(wrap);
  document.body.classList.add('fpanel-open');
}

// Counts inside a filter page ignore that page's own filter (so "Pets 4" means 4 if you pick Pets).
function applyFiltersExcept(rows, page) {
  const saved = { ...filters, kinds: [...filters.kinds], platforms: [...filters.platforms] };
  if (page === 'kind') filters.kinds = [];
  if (page === 'platform') filters.platforms = [];
  if (page === 'cost') filters.maxCost = null;
  if (page === 'moq') filters.maxMoq = null;
  try { return applyFilters(rows); } finally { Object.assign(filters, saved); }
}
