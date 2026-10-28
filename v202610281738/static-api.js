// Online copy (GitHub Pages): answers the app's API calls from the exported JSON files in data/.
// Budget, saved products and comments are kept on this phone. Anything that needs the computer
// (recalculating with new settings, refreshing prices, making posts) says so instead of failing silently.
const CFG = window.IMPORT_SCOUT_STATIC;
const store = {
  get(k, d) { try { const v = localStorage.getItem('is:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('is:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const cache = new Map();
const file = async rel => {
  if (!cache.has(rel)) cache.set(rel, fetch('data/' + rel, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('Not in the online copy'); return r.json(); }));
  try { return await cache.get(rel); } catch (e) { cache.delete(rel); throw e; }
};
export class ComputerOnly extends Error {
  constructor(what = 'This') { super(`${what} works in the computer version of Import Scout, not in the online copy.`); }
}

const ANY = 1000000;
const anyBudget = () => store.get('budget', CFG.defaultBudget) >= ANY;
// Data folder for the chosen budget; "Any amount" uses the largest preset (no product needs more cash).
const budget = () => { const b = store.get('budget', CFG.defaultBudget); return b >= ANY ? Math.max(...CFG.budgets) : CFG.budgets.includes(b) ? b : CFG.defaultBudget; };
const shownBudget = () => (anyBudget() ? ANY : budget());
const nearestBudget = v => CFG.budgets.reduce((best, b) => (Math.abs(b - v) < Math.abs(best - v) ? b : best), CFG.budgets[0]);
const savedMap = () => store.get('saved', {});
const markSaved = rows => { const s = savedMap(); return rows.map(r => ({ ...r, saved: !!s[r.id] })); };

async function detail(id) {
  const B = budget();
  const [shared, per] = await Promise.all([file(`product/${id}.json`), file(`b${B}/opp/${id}.json`).catch(() => file(`b${CFG.defaultBudget}/opp/${id}.json`))]);
  const s = savedMap()[id];
  return { ...per, comparables: shared.comparables, supplier: shared.supplier, history: shared.history, supplierHistory: shared.supplierHistory,
    pricing: per.pricing ? { ...per.pricing, market: shared.market } : per.pricing, saved: s ? { supplier_product_id: Number(id), ...s } : null };
}

export async function staticApi(path, opts = {}) {
  const method = opts.method || (opts.body ? 'POST' : 'GET');
  const [p, qs] = path.split('?');
  const q = new URLSearchParams(qs || '');
  const B = budget();
  let m;
  if (method === 'GET') {
    if (p === '/meta') return file('meta.json');
    if (p === '/overview') { const o = await file(`b${B}/overview.json`); return { ...o, settings: { ...o.settings, budget: shownBudget() }, static: CFG }; }
    if (p === '/settings') return { ...(await file('settings.json')), budget: shownBudget() };
    if (p === '/opportunities') return markSaved(await file(`b${B}/${q.get('rejected') === '1' ? 'rejected' : 'opportunities'}.json`));
    if ((m = p.match(/^\/opportunities\/(\d+)$/))) return detail(m[1]);
    if ((m = p.match(/^\/comparable-history\/(\d+)$/))) return file(`history/${m[1]}.json`).catch(() => []);
    if ((m = p.match(/^\/suppliers\/(\d+)\/specs$/))) return file(`specs/${m[1]}.json`);
    if (p === '/portfolio') return file(`b${B}/portfolio.json`);
    if (p === '/retailers') {
      let rows = await file('retailers.json');
      const cat = q.get('category'); const ch = q.get('channel'); const gov = (q.get('governorate') || '').toLowerCase(); const term = (q.get('q') || '').toLowerCase();
      if (cat) rows = rows.filter(r => r.categories.includes(cat));
      if (ch) rows = rows.filter(r => r.sales_channels === ch || (ch === 'physical' && r.branches.length));
      if (gov) rows = rows.filter(r => r.branches.some(b => (b.governorate || '').toLowerCase().includes(gov) || (b.district || '').toLowerCase().includes(gov)));
      if (term) rows = rows.filter(r => JSON.stringify([r.name, r.branches.map(b => [b.name, b.municipality, b.address])]).toLowerCase().includes(term));
      return rows;
    }
    if ((m = p.match(/^\/comments\/(\d+)$/))) return store.get('comments', {})[m[1]] || [];
    if (p === '/saved') {
      const s = savedMap(); const ids = Object.keys(s);
      if (!ids.length) return [];
      const rows = [...await file(`b${B}/opportunities.json`), ...await file(`b${B}/rejected.json`)];
      return ids.map(id => { const r = rows.find(x => String(x.id) === id); return r && { supplier_product_id: r.id, ...s[id], short_name: r.name, title: r.title, image: r.image, url: r.url, opp_status: r.status, base_profit: r.base, cash_required: r.cash, score: r.score, qty: r.qty }; }).filter(Boolean);
    }
    const plain = { '/branches': 'branches', '/leads': 'leads', '/alerts': 'alerts', '/monitor': 'monitor', '/trends': 'trends', '/calendar-events': 'calendar-events',
      '/content': 'content', '/assumptions': 'assumptions', '/integrations': 'integrations', '/jobs': 'jobs' }[p];
    if (plain) return file(`${plain}.json`);
    if (p === '/customs-rules') return [];
    throw new ComputerOnly('This screen');
  }
  // Writes that can live on the phone.
  if (p === '/settings' && method === 'PUT') {
    const keys = Object.keys(opts.body || {}).filter(k => k !== 'max_products');
    if (keys.length !== 1 || keys[0] !== 'budget') throw new ComputerOnly('Changing these settings');
    const want = Number(opts.body.budget);
    if (want >= ANY) { store.set('budget', ANY); return { ...(await file('settings.json')), budget: ANY }; }
    const got = nearestBudget(want);
    store.set('budget', got);
    if (got !== want) setTimeout(() => import('./lib.js').then(l => l.toast(`The online copy has budgets of ${CFG.budgets.map(b => '$' + b.toLocaleString('en-US')).join(', ')}: showing $${got.toLocaleString('en-US')}`, 4500)), 300);
    return { ...(await file('settings.json')), budget: got };
  }
  if (p === '/saved' && method === 'POST') { const s = savedMap(); s[opts.body.id] = { status: opts.body.status || 'investigating', note: opts.body.note ?? s[opts.body.id]?.note ?? null, created_at: new Date().toISOString() }; store.set('saved', s); return { ok: true }; }
  if ((m = p.match(/^\/saved\/(\d+)$/)) && method === 'DELETE') { const s = savedMap(); delete s[m[1]]; store.set('saved', s); return { ok: true }; }
  if ((m = p.match(/^\/comments\/(\d+)$/)) && method === 'POST') {
    const all = store.get('comments', {}); const list = all[m[1]] || [];
    const c = { id: Date.now(), author: opts.body.author || null, body: String(opts.body.body || '').trim().slice(0, 2000), created_at: new Date().toISOString().replace('T', ' ').slice(0, 19) };
    if (!c.body) throw new Error('Write something first');
    all[m[1]] = [...list, c]; store.set('comments', all); return c;
  }
  if ((m = p.match(/^\/comments\/(\d+)\/(\d+)$/)) && method === 'DELETE') { const all = store.get('comments', {}); all[m[1]] = (all[m[1]] || []).filter(c => String(c.id) !== m[2]); store.set('comments', all); return { ok: true }; }
  if (p === '/alerts/read') return { ok: true };
  throw new ComputerOnly();
}
