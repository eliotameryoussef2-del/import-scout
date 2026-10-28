// Price check: describe an item (with its specs) and, if you have one, your supplier's price.
// Shows the same or closest items in Lebanese shops and the supplier offers the app knows.
import { api, html, h, money, toast } from '../lib.js';
import { readDescription, priceCheck, LABELS } from '../core/pricecheck.js';

const KEY = 'check:last';
const LABEL_CLASS = { identical: 'b-good', closest: 'b-warn', similar: 'b-info' };
const SPEC_NAME = { capacity_ml: 'capacity', battery_mah: 'battery', power_w: 'power', thickness_mm: 'thickness', length_cm: 'length', weight_g: 'weight', max_load_g: 'max load', count: 'pieces', lumens: 'brightness', inch: 'size', bt_version: 'Bluetooth' };
const specText = (k, v) => (v == null ? 'not stated' : `${Array.isArray(v) ? v.join('×') : v}${{ capacity_ml: ' ml', battery_mah: ' mAh', power_w: ' W', thickness_mm: ' mm', length_cm: ' cm', weight_g: ' g', max_load_g: ' g', count: ' pcs', lumens: ' lm', inch: ' in' }[k] || ''}`);

const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };

function understood(desc) {
  const chips = [];
  if (desc.type) chips.push(desc.typeLabel);
  for (const [k, v] of Object.entries(desc.specs)) if (SPEC_NAME[k]) chips.push(`${SPEC_NAME[k]} ${specText(k, v)}`);
  if (desc.specs.materials?.length) chips.push(desc.specs.materials.join(', '));
  return chips.length ? h`<div class="spec-chips">${chips.map(c => h`<span class="chip-s ok">${c}</span>`)}</div>` : '';
}

const specChips = rows => (rows?.length ? h`<div class="spec-chips">${rows.map(r => h`<span class="chip-s ${r.match === true ? 'ok' : r.match === false ? 'no' : ''}">${r.match === true ? '✓' : '?'} ${SPEC_NAME[r.k] || r.k}: ${specText(r.k, r.theirs)}</span>`)}</div>` : '');

function results(r) {
  if (r.error) return h`<div class="notice warn">${r.error}</div>`;
  return h`<div class="card"><h2>Result</h2><p class="muted" style="margin:0 0 6px">Understood as:</p>${understood(r.desc)}
      <ul class="reasons" style="margin-top:10px">${r.summary.map(s => h`<li>${s}</li>`)}</ul></div>
    <h2 class="section-title">In Lebanese shops (${r.shopMatches.length})</h2>
    ${r.shopMatches.length ? h`<div class="store-list">${r.shopMatches.slice(0, 60).map(m => h`<div class="store">
        <div class="row between"><b>${m.retailer}</b><b>${money(m.price, m.price % 1 ? 2 : 0)}</b></div>
        <small class="muted">${m.places || 'Online shop'}</small>
        <p style="margin:6px 0 2px"><a href="${m.url}" target="_blank" rel="noopener">${m.title}</a></p>
        <span class="badge ${LABEL_CLASS[m.label]}">${LABELS[m.label]}</span>${specChips(m.compared)}</div>`)}</div>`
      : h`<div class="empty">No Lebanese shop listing is close enough to compare. Try adding the key specs (size, capacity, power, material) or a plainer name.</div>`}
    <h2 class="section-title">Supplier offers the app knows (${r.supplierMatches.length})</h2>
    ${r.supplierMatches.length ? h`<div class="store-list">${r.supplierMatches.slice(0, 30).map(m => h`<div class="store">
        <div class="row between"><b>${m.platform}</b><b>${money(m.price, 2)} <small class="muted">/ unit</small></b></div>
        <small class="muted">Minimum order ${m.moq ?? '?'}</small>
        <p style="margin:6px 0 2px"><a href="${m.url}" target="_blank" rel="noopener">${m.title}</a></p>
        <span class="badge ${LABEL_CLASS[m.label]}">${LABELS[m.label]}</span>${specChips(m.compared)}</div>`)}</div>`
      : h`<div class="empty">No supplier offer of this item in the app yet.</div>`}
    <p class="muted" style="font-size:12.5px">Shop prices are each shop's typical price for that listing. Supplier prices are before shipping, customs and VAT.</p>`;
}

export default async function check(view) {
  const last = load();
  view.innerHTML = html`<span class="eyebrow">Compare</span><h1>Price check</h1>
    <p class="muted">Describe an item with its specs. The app finds the same or closest items in Lebanese shops, with their prices, and the supplier offers it knows, so you can see whether your supplier is a good deal.</p>
    <form class="card" id="check-form">
      <label>Item description, with specs<textarea name="desc" required placeholder="e.g. Stainless steel vacuum water bottle 500ml  ·  Hand blender 1000W 500ml  ·  Kids swimming goggles anti-fog">${last.desc || ''}</textarea></label>
      <div class="form-grid" style="margin-top:10px">
        <label>Your supplier's price per unit ($, optional)<input name="price" type="number" step="0.01" min="0" inputmode="decimal" value="${last.price || ''}"></label>
        <label>Minimum order (optional)<input name="moq" type="number" step="1" min="1" inputmode="numeric" value="${last.moq || ''}"></label>
      </div>
      <button class="btn primary" style="margin-top:12px;width:100%">Find prices</button>
      ${window.IMPORT_SCOUT_STATIC ? '' : h`<p style="margin:10px 0 0"><small><a href="#/add">Add a full supplier listing to the app instead →</a></small></p>`}
    </form>
    <div id="check-results"></div>`;
  const out = view.querySelector('#check-results');
  const run = async (desc, price, scroll = true) => {
    const d = readDescription(desc);
    if (!d.type) { out.innerHTML = results(priceCheck({ description: desc })).s; return; }
    out.innerHTML = '<div class="loading"></div>';
    const data = await api(`/check-data/${d.type}`);
    out.innerHTML = results(priceCheck({ description: desc, supplierPrice: price, shops: data.shops, suppliers: data.suppliers })).s;
    if (scroll) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  view.querySelector('#check-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const v = { desc: f.desc.value.trim(), price: f.price.value, moq: f.moq.value };
    if (!v.desc) return toast('Describe the item first');
    save(v);
    f.querySelector('button').disabled = true;
    try { await run(v.desc, Number(v.price) || null); } catch (err) { out.innerHTML = html`<div class="notice warn">${err.message}</div>`; }
    finally { f.querySelector('button').disabled = false; }
  });
  if (last.desc) run(last.desc, Number(last.price) || null, false).catch(() => {});
}
