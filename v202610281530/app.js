import { api, money, icon, ago } from './lib.js';

export const state = { meta: null, settings: null };

const routes = [
  [/^#?\/?(\?budget)?$/, 'feed', () => import('./views/feed.js')],
  [/^#\/browse(\?budget)?$/, 'browse', () => import('./views/discover.js')],
  [/^#\/p\/(\d+)$/, 'browse', () => import('./views/product.js')],
  [/^#\/simulate$/, 'simulate', () => import('./views/simulate.js')],
  [/^#\/retailers$/, 'retailers', () => import('./views/retailers.js')],
  [/^#\/monitor$/, 'monitor', () => import('./views/monitor.js')],
  [/^#\/saved$/, 'saved', () => import('./views/saved.js')],
  [/^#\/studio(?:\/(\d+))?$/, 'studio', () => import('./views/studio.js')],
  [/^#\/calendar$/, 'calendar', () => import('./views/calendar.js')],
  [/^#\/trends$/, 'trends', () => import('./views/trends.js')],
  [/^#\/settings$/, 'settings', () => import('./views/settings.js')],
  [/^#\/add$/, 'browse', () => import('./views/add.js')],
  [/^#\/rejected$/, 'monitor', () => import('./views/rejected.js')],
];

export async function refreshChrome() {
  const o = await api('/overview');
  state.settings = o.settings;
  const dot = document.getElementById('alert-count');
  dot.hidden = !o.counts.unread_alerts;
  dot.textContent = o.counts.unread_alerts;
  return o;
}

async function render() {
  const hash = location.hash || '#/';
  const view = document.getElementById('view');
  document.getElementById('more-sheet').hidden = true;
  for (const [re, nav, load] of routes) {
    const m = hash.match(re);
    if (!m) continue;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
    document.body.classList.toggle('feed-mode', nav === 'feed');
    view.innerHTML = '<div class="loading">Loading…</div>';
    try {
      const mod = await load();
      await mod.default(view, ...m.slice(1));
      // Online copy: say what needs the computer, and how fresh the data is.
      const cfg = window.IMPORT_SCOUT_STATIC;
      if (cfg && ['settings', 'monitor', 'studio', 'calendar', 'trends', 'simulate'].includes(nav)) {
        view.insertAdjacentHTML('afterbegin', `<div class="notice">Online copy, updated ${ago(cfg.exportedAt)}. Prices refresh automatically; changing settings, refreshing a price or making posts works in the computer version.</div>`);
      }
    } catch (e) {
      view.innerHTML = `<div class="card"><h2>Something went wrong</h2><p class="muted">${e.message}</p></div>`;
      console.error(e);
    }
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    return;
  }
  view.innerHTML = '<div class="empty">Page not found</div>';
}

document.getElementById('more-btn').addEventListener('click', () => {
  const s = document.getElementById('more-sheet'); s.hidden = !s.hidden;
});
window.addEventListener('hashchange', render);
// Static icons in the page shell.
document.querySelectorAll('i[data-ic]').forEach(el => el.outerHTML = icon(el.dataset.ic).s);

(async () => {
  state.meta = await api('/meta');
  await refreshChrome();
  render();
  setInterval(() => refreshChrome().catch(() => {}), 60000);
})();

// Installable app (Android/iPhone home screen). Browsers only allow this on https or localhost.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
