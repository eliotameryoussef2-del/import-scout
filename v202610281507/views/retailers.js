import { api, html, h, ago, money2, esc } from '../lib.js';
import { state } from '../app.js';

let filters = { category: '', governorate: '', q: '', channel: '' };
let map;

export default async function retailers(view) {
  const allBranches = await api('/branches');
  const AREAS = [...new Set(allBranches.flatMap(b => [b.governorate, b.district]).filter(Boolean))].sort();
  const draw = async () => {
    const rows = await api(`/retailers?${new URLSearchParams(filters)}`);
    const branches = rows.flatMap(r => r.branches.map(b => ({ ...b, retailer: r.name })));
    view.innerHTML = html`<span class="eyebrow">Stores</span><h1>Lebanese retailer directory</h1>
      <p class="muted">Only details published by the retailer (or its official pages) are shown. Map pins: <b>solid</b> = coordinates stated by the retailer; <b>hollow</b> = approximate town position (OpenStreetMap), not the shop's exact location.</p>
      <div class="card"><div class="form-grid">
        <label>Category<select id="f-cat"><option value="">All</option>${Object.entries(state.meta.categories).map(([k, v]) => h`<option value="${k}" ${filters.category === k ? 'selected' : ''}>${v}</option>`)}</select></label>
        <label>Area<select id="f-area"><option value="">All of Lebanon</option>${AREAS.map(a => h`<option ${filters.governorate === a ? 'selected' : ''}>${a}</option>`)}</select></label>
        <label>Type<select id="f-ch"><option value="">All</option><option value="physical" ${filters.channel === 'physical' ? 'selected' : ''}>Has physical stores</option><option value="online" ${filters.channel === 'online' ? 'selected' : ''}>Online only</option></select></label>
        <label>Search<input id="f-q" value="${filters.q}" placeholder="name, town, street"></label>
      </div></div>
      <div id="map"></div>
      <p><small>${rows.length} retailer(s), ${branches.length} branch record(s), ${branches.filter(b => b.coord_quality === 'verified').length} with retailer-stated coordinates.</small></p>
      <div class="grid cards">${rows.map(r => h`<article class="card">
        <div class="row between"><h3>${r.name}</h3><span class="badge ${r.branches.length ? 'b-info' : ''}">${r.branches.length ? `${r.branches.length} physical branch(es)` : r.sales_channels === 'online' ? 'Online only' : 'No verified branch'}</span></div>
        <p><small>${r.categories.map(c => state.meta.categories[c] || c).join(' · ')}</small></p>
        <p>${r.website ? h`<a href="${r.website}" target="_blank" rel="noopener">${r.website.replace(/^https?:\/\//, '')}</a>` : ''} ${r.phones.length ? h` · ${r.phones.join(', ')}` : ''}</p>
        <p><small>Sells: ${r.sales_channels || '?'} · Prices: ${r.connector ? h`<span class="badge ${r.last_price_success ? 'b-good' : 'b-warn'}">${r.connector} · ${r.product_count} products · ${r.last_price_success ? 'checked ' + ago(r.last_price_success) : 'not yet fetched'}</span>` : h`<span class="badge">directory only</span>`}</small></p>
        ${r.delivery?.fees || r.delivery?.areas ? h`<p><small><b>Delivery:</b> ${[r.delivery.areas, r.delivery.fees].filter(Boolean).join(' — ')}${r.delivery.source_url ? h` (<a href="${r.delivery.source_url}" target="_blank" rel="noopener">source</a>)` : ''}</small></p>` : ''}
        ${r.payment_methods.length ? h`<p><small><b>Payment:</b> ${r.payment_methods.join(', ')}</small></p>` : ''}
        ${r.branches.length ? h`<details><summary>Branches</summary><ul class="reasons">${r.branches.map(b => h`<li><b>${b.name || b.municipality || 'Branch'}</b> — ${b.address || ''}${b.district ? `, ${b.district}` : ''}${b.governorate ? `, ${b.governorate}` : ''}${b.phone ? ` · ${b.phone}` : ''} ${b.source_url ? h`<a href="${b.source_url}" target="_blank" rel="noopener">source</a>` : ''}</li>`)}</ul></details>` : ''}
        ${r.data_access_notes ? h`<details><summary>Data access notes</summary><p class="reasons">${r.data_access_notes}</p></details>` : ''}
        ${r.connector ? h`<details><summary>Browse observed prices</summary><div data-browse="${r.slug}"><button class="btn small" data-load="${r.slug}">Load products</button></div></details>` : ''}
        <p><small>Confidence: ${r.confidence || '?'} · Locations verified ${r.last_location_check ? ago(r.last_location_check) : '—'}</small></p>
      </article>`)}</div>`;
    view.querySelector('#f-cat').onchange = e => { filters.category = e.target.value; draw(); };
    view.querySelector('#f-area').onchange = e => { filters.governorate = e.target.value; draw(); };
    view.querySelector('#f-ch').onchange = e => { filters.channel = e.target.value; draw(); };
    view.querySelector('#f-q').onchange = e => { filters.q = e.target.value; draw(); };
    view.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', async () => {
      const box = view.querySelector(`[data-browse="${b.dataset.load}"]`);
      const q = prompt('Filter products (leave empty for cheapest 100):', '') || '';
      const items = await api(`/local-products?retailer=${b.dataset.load}&q=${encodeURIComponent(q)}`);
      box.innerHTML = html`<div class="table-wrap"><table>${items.map(i => h`<tr><td><a href="${i.url}" target="_blank" rel="noopener">${i.title}</a></td><td class="num">${money2(i.price_usd)}</td><td>${i.available === 1 ? '✓' : i.available === 0 ? '✕' : '?'}</td><td><small>${ago(i.last_success)}</small></td></tr>`)}</table></div>`;
    }));
    drawMap(branches);
  };
  await draw();
}

function drawMap(branches) {
  if (!window.L) return;
  if (map) { map.remove(); map = null; }
  map = L.map('map', { scrollWheelZoom: false }).setView([33.89, 35.6], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map);
  const pts = [];
  for (const b of branches) {
    if (b.lat == null || b.lng == null) continue;
    const verified = b.coord_quality === 'verified';
    const m = L.circleMarker([b.lat, b.lng], { radius: verified ? 7 : 6, color: '#2ef2b4', weight: 2, fillColor: '#2ef2b4', fillOpacity: verified ? 0.85 : 0.08, dashArray: verified ? null : '3' }).addTo(map);
    m.bindPopup(`<b>${esc(b.retailer)}</b><br>${esc(b.name || '')}<br>${esc(b.address || '')}<br>${b.phone ? esc(b.phone) + '<br>' : ''}<small>${verified ? 'Location stated by retailer' : esc(b.coord_source || 'approximate')}</small>`);
    pts.push([b.lat, b.lng]);
  }
  if (pts.length > 1) map.fitBounds(pts, { padding: [24, 24], maxZoom: 12 });
}
