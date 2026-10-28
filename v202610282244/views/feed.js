// "For you": one opportunity per screen, swipe up for the next. Tap = details, double-tap = save.
import { api, html, h, money, statusBadge, riskBadge, toast, icon, evidenceBadge, budgetLabel } from '../lib.js';
import { state } from '../app.js';
import { applyFilters, filterButton, bindFilters, openFilterPanel } from '../filters.js';
import { openCommentsSheet } from '../comments.js';

// One feed: profitable products that fit the budget chosen in Filters ("Any amount" shows them all).
const fitsBudget = o => ['recommended', 'filtered'].includes(o.status);

const store = {
  get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
};

function profitLine(o) {
  if (o.status === 'insufficient_data' && !o.ownPrice) return h`<p class="profit"><span class="meta">No Lebanese store sells this exact product. Open it to set your own price and see the numbers.</span></p>`;
  if (o.status === 'unprofitable' && o.reason) return h`<p class="profit"><span class="big neg">${o.base != null ? money(o.base) : 'Loss'}</span><span class="meta">${/^(Lebanese stores|Similar unbranded)/.test(o.reason) ? (o.market?.basis === 'similar unbranded' ? `Similar items sell for about ${money(o.market.median)}, too close to what it costs you delivered` : `Stores sell it for ${money(o.market.min, 2)}, less than it costs you delivered`) : `expected loss on ${o.qty} units, all costs in`}</span></p>`;
  if (o.status === 'unaffordable') return h`<p class="profit"><span class="big glass">${money(o.minCash)}</span><span class="meta">minimum order, all costs in<br>above your ${money(state.settings.budget)} budget</span></p>`;
  if (o.base == null) return '';
  return h`<p class="profit"><span class="big ${o.base >= 0 ? 'pos' : 'neg'}">${o.base >= 0 ? '+' : ''}${money(o.base)}</span>
    <span class="meta">profit on ${o.qty} units · ${money(o.cash)} cash<br>worst case ${money(o.conservative)}</span></p>`;
}

function slide(o, i) {
  const m = o.market;
  return h`<section class="slide" data-id="${o.id}" data-i="${i}" aria-label="${o.name}">
    ${o.image ? h`<div class="bg" style="background-image:url('${o.image}')"></div>` : ''}
    <div class="media">${o.image ? h`<img src="${o.image}" alt="${o.name}" loading="${i < 2 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer">` : h`<div class="ph">${icon('box')}</div>`}</div>
    <div class="info">
      <div class="tagline">${statusBadge(o.status)} ${evidenceBadge(o.market)} ${o.risk ? riskBadge(o.risk) : ''}</div>
      <h2>${o.name}</h2>
      <p class="src">${icon('box')} <span>${money(o.unitCost, 2)} each · min. ${o.moq ?? '?'} on <a href="${o.url}" target="_blank" rel="noopener" data-stop>${o.platform || 'supplier site'}</a>${o.supplier && !o.supplier.includes(o.platform) ? ` · ${o.supplier}` : ''}</span></p>
      <div class="prices">
        <div class="glass"><span>Cost</span><b>${o.landed ? money(o.landed, 2) : money(o.unitCost, 2)}</b><small>${o.landed ? 'delivered' : 'supplier only'}</small></div>
        <div class="glass sell"><span>Sell at</span><b>${o.sellPrice ? money(o.sellPrice) : '—'}</b><small>${o.ownPrice ? 'your price' : o.sellPrice ? 'suggested' : 'set a price'}</small></div>
        <div class="glass"><span>Lebanon</span>${m?.basis === 'approximate' ? h`<b>≈${money(m.min, m.min % 1 ? 2 : 0)}</b><small>closest items</small>` : m?.basis === 'similar unbranded' ? h`<b>≈${money(m.median)}</b><small>similar · estimate</small>` : m ? h`<b>${money(m.min, m.min % 1 ? 2 : 0)}</b><small>${m.stores} store${m.stores === 1 ? '' : 's'}</small>` : h`<b>—</b><small>not sold</small>`}</div>
      </div>
      ${profitLine(o)}
      <p class="hint">${icon('up')} Tap for details & store map · swipe for next</p>
    </div>
    <div class="rail">
      ${o.score != null ? h`<div class="score-disc" style="--s:${o.score}" title="Opportunity score out of 100"><b>${Math.round(o.score)}</b></div>` : ''}
      <button class="${o.saved ? 'saved' : ''}" data-save aria-label="${o.saved ? 'Remove from saved' : 'Save'}"><span class="disc">${icon('heart')}</span><span>${o.saved ? 'Saved' : 'Save'}</span></button>
      <a href="#/p/${o.id}" aria-label="Details"><span class="disc">${icon('info')}</span><span>Details</span></a>
      <button data-comments aria-label="Comments"><span class="disc">${icon('chat')}</span><span>Comments</span></button>
      <button data-share aria-label="Share"><span class="disc">${icon('share')}</span><span>Share</span></button>
    </div>
  </section>`;
}

function endSlide(count) {
  return h`<section class="slide end" data-i="end">
    <div class="big-ic">${icon(count ? 'spark' : 'wallet')}</div>
    <h2>${count ? "You're all caught up" : `Nothing fits ${budgetLabel(state.settings.budget)} yet`}</h2>
    <p>${count ? 'New supplier listings and Lebanese prices are checked automatically. Come back later, or try another budget.'
      : 'With this budget and these filters, nothing that makes a profit fits yet. Try a bigger budget (or Any amount) or fewer filters.'}</p>
    <div class="row" style="justify-content:center"><button class="btn primary" data-filters>${icon('filter')} Change budget or filters</button><a class="btn" href="#/browse">${icon('grid')} Browse list</a></div>
  </section>`;
}

// Refresh: fetch the latest products and prices. Online, also pick up a newly published version.
async function refreshApp(draw) {
  toast('Refreshing…');
  if (window.IMPORT_SCOUT_STATIC) {
    try {
      const page = await fetch(location.pathname, { cache: 'no-store' }).then(r => r.text());
      const live = page.match(/v\d{12}\/app\.js/)?.[0];
      const mine = [...document.scripts].map(x => x.src).find(x => /app\.js/.test(x)) || '';
      if (live && !mine.includes(live)) { location.reload(); return; } // a newer version was published
    } catch { /* offline: keep what we have */ }
    (await import('../static-api.js')).clearCache();
  }
  await draw();
  toast('Up to date');
}

export default async function feed(view) {
  const draw = async () => {
    const everything = await api('/opportunities');
    const all = applyFilters(everything);
    const rows = all.filter(fitsBudget);
    view.innerHTML = html`
      <div class="feed-tabs"><button type="button" class="refresh-icon" data-refresh aria-label="Refresh">${icon('refresh')}</button>${filterButton('on-feed')}</div>
      <div class="feed" id="feed" tabindex="0">${rows.map(slide)}${endSlide(rows.length)}</div>`;
    const feedEl = view.querySelector('#feed');

    bindFilters(view, () => api('/opportunities'), draw);
    view.querySelector('[data-refresh]').addEventListener('click', () => refreshApp(draw));

    // Resume where the user left off (e.g. after opening a product's details).
    const key = 'feed:main';
    const last = store.get(key);
    const at = last && feedEl.querySelector(`.slide[data-id="${last}"]`);
    if (at) feedEl.scrollTop = at.offsetTop;
    const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.target.dataset.id) store.set(key, e.target.dataset.id); }), { root: feedEl, threshold: 0.6 });
    feedEl.querySelectorAll('.slide').forEach(s => seen.observe(s));

    const toggleSave = async (s, burst) => {
      const btn = s.querySelector('[data-save]');
      const id = Number(s.dataset.id);
      const o = rows.find(r => r.id === id);
      if (burst) {
        const b = document.createElement('div'); b.className = 'burst'; b.innerHTML = icon('heart').s;
        s.appendChild(b); setTimeout(() => b.remove(), 800);
        if (o.saved) return; // double-tap only ever saves, like a "like"
      }
      if (o.saved) { await api(`/saved/${id}`, { method: 'DELETE' }); toast('Removed from saved'); }
      else { await api('/saved', { body: { id } }); toast('Saved: it will be re-checked daily'); }
      o.saved = !o.saved;
      btn.classList.toggle('saved', o.saved);
      btn.lastElementChild.textContent = o.saved ? 'Saved' : 'Save';
    };

    feedEl.querySelectorAll('.slide[data-id]').forEach(s => {
      s.querySelector('[data-save]').addEventListener('click', () => toggleSave(s, false));
      s.querySelector('[data-comments]').addEventListener('click', () => {
        const o = rows.find(r => r.id === Number(s.dataset.id));
        openCommentsSheet(o.id, o.name);
      });
      s.querySelector('[data-share]').addEventListener('click', async () => {
        const o = rows.find(r => r.id === Number(s.dataset.id));
        const url = `${location.href.split('#')[0]}#/p/${o.id}`;
        const text = `${o.name}: buy at ${money(o.unitCost, 2)}, sell at ${o.sellPrice ? money(o.sellPrice) : '?'}${o.market ? `, same product from ${money(o.market.min)} in Lebanon` : ''}`;
        try {
          if (navigator.share) await navigator.share({ title: o.name, text, url });
          else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Link copied'); }
        } catch { /* share sheet dismissed */ }
      });
      // Single tap opens details; a second tap within 280 ms is a double-tap save instead.
      let timer = null;
      s.addEventListener('click', e => {
        if (e.target.closest('a, button, [data-stop]')) return;
        if (timer) { clearTimeout(timer); timer = null; toggleSave(s, true); return; }
        timer = setTimeout(() => { timer = null; location.hash = `#/p/${s.dataset.id}`; }, 280);
      });
    });

    // Keyboard: arrows / j k move one product.
    const onKey = e => {
      if (!document.body.contains(feedEl)) return window.removeEventListener('keydown', onKey);
      if (document.querySelector('.overlay') || /input|textarea|select/i.test(document.activeElement?.tagName)) return;
      const dir = { ArrowDown: 1, j: 1, PageDown: 1, ArrowUp: -1, k: -1, PageUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      feedEl.scrollBy({ top: dir * feedEl.clientHeight, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    feedEl.focus({ preventScroll: true });
  };
  await draw();
  // Old #/?budget links open the budget filter.
  if (location.hash.includes('budget')) { history.replaceState(null, '', '#/'); openFilterPanel(() => api('/opportunities'), draw, 'budget'); }
}
