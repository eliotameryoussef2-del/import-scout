import { api, html, h, toast } from '../lib.js';
import { state } from '../app.js';

export default async function add(view) {
  view.innerHTML = html`<span class="eyebrow">Sourcing</span><h1>Add a supplier listing</h1>
    <p class="muted">Use this for listings the app cannot read automatically (most Alibaba/AliExpress pages). Copy the numbers exactly as the supplier shows them; the listing is then matched to Lebanese retail products and analysed against your budget. Never enter a lower MOQ than the supplier publishes.</p>
    <form id="f" class="card stack">
      <div class="form-grid">
        <label>Product title (as listed)<input name="title" required></label>
        <label>Short name<input name="short_name" placeholder="e.g. Rechargeable camping lantern"></label>
        <label>Product URL<input name="url" type="url" required></label>
        <label>Image URL<input name="image" type="url"></label>
        <label>Platform<select name="platform"><option>Alibaba.com</option><option>AliExpress</option><option>Made-in-China.com</option><option>DHgate</option><option>1688.com</option><option>Manufacturer website</option><option>Other</option></select></label>
        <label>Category<select name="category">${Object.entries(state.meta.categories).map(([k, v]) => h`<option value="${k}">${v}</option>`)}</select></label>
        <label>Currency<select name="currency"><option>USD</option><option>CNY</option><option>EUR</option><option>TRY</option><option>AED</option></select></label>
        <label>Minimum order quantity<input type="number" name="moq" min="1" required></label>
        <label>Minimum order value ($, if any)<input type="number" name="min_order_value" min="0"></label>
        <label>Pack size<input type="number" name="pack_size" min="1" value="1"></label>
        <label>Unit weight (kg)<input type="number" name="weight_kg" step="0.001" min="0" required></label>
        <label>Package size cm (L×W×H)<input name="dims" placeholder="20x10x5"></label>
        <label>Production lead time (days)<input type="number" name="lead" min="0"></label>
        <label>HS code (if known)<input name="hs_code"></label>
        <label>Search terms for local matching<input name="search_terms" placeholder="camping lantern rechargeable"></label>
      </div>
      <div><b>Price tiers</b> <small>(quantity from → unit price)</small><div id="tiers"></div><button type="button" class="btn small" id="add-tier">＋ tier</button></div>
      <div class="form-grid">
        <label>Supplier name<input name="supplier_name"></label><label>Supplier country<input name="supplier_country" value="China"></label>
        <label>Years on platform<input name="supplier_years"></label><label>Verified / badges<input name="supplier_verified"></label><label>Rating<input name="supplier_rating"></label>
      </div>
      <div class="chips">${[['battery', 'Contains battery'], ['fragile', 'Fragile'], ['liquid', 'Liquid'], ['regulated', 'Regulated'], ['food_contact', 'Food contact'], ['cosmetic', 'Cosmetic'], ['kids', 'For children'], ['electronic', 'Electronic']].map(([k, l]) => h`<label class="check"><input type="checkbox" name="flag_${k}"> ${l}</label>`)}</div>
      <button class="btn primary">Add & analyse</button>
    </form>`;
  const tiers = view.querySelector('#tiers');
  const addTier = (q = '', p = '') => { const d = document.createElement('div'); d.className = 'row'; d.style.margin = '4px 0'; d.innerHTML = `<input type="number" min="1" placeholder="from qty" class="tq" value="${q}" style="width:110px"> → <input type="number" step="0.001" min="0" placeholder="unit price" class="tp" value="${p}" style="width:110px">`; tiers.appendChild(d); };
  addTier(); addTier();
  view.querySelector('#add-tier').onclick = () => addTier();
  view.querySelector('#f').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const price_tiers = [...tiers.children].map(r => ({ min_qty: Number(r.querySelector('.tq').value), unit_price: Number(r.querySelector('.tp').value) })).filter(t => t.min_qty > 0 && t.unit_price > 0).sort((a, b) => a.min_qty - b.min_qty);
    price_tiers.forEach((t, i) => { t.max_qty = price_tiers[i + 1] ? price_tiers[i + 1].min_qty - 1 : null; });
    const dims = f.dims.value.split(/x|×|\*/i).map(Number).filter(n => n > 0);
    const flags = {}; for (const el of f.elements) if (el.name?.startsWith('flag_') && el.checked) flags[el.name.slice(5)] = true;
    try {
      const r = await api('/suppliers', { body: {
        title: f.title.value, short_name: f.short_name.value || null, url: f.url.value, image: f.image.value || null, platform: f.platform.value, category: f.category.value, currency: f.currency.value,
        moq: Number(f.moq.value), min_order_value: f.min_order_value.value ? Number(f.min_order_value.value) : null, pack_size: Number(f.pack_size.value) || 1,
        price_tiers, shipping: { weight_kg: Number(f.weight_kg.value), package_cm: dims.length === 3 ? dims : null, lead_time_days: f.lead.value ? Number(f.lead.value) : null },
        hs_code: f.hs_code.value || null, search_terms: f.search_terms.value || null, flags,
        supplier_name: f.supplier_name.value || null, supplier_country: f.supplier_country.value || null, supplier_years: f.supplier_years.value || null, supplier_verified: f.supplier_verified.value || null, supplier_rating: f.supplier_rating.value || null,
      } });
      toast('Added and analysed'); location.hash = `#/p/${r.id}`;
    } catch (err) { toast(err.message, 5000); }
  });
}
