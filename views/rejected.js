// Audit page: products the app checked and rejected because they lose money. They are never
// listed in the feed, Browse, Studio or the simulator; this page only shows why they were dropped.
import { api, html, h, money } from '../lib.js';

export default async function rejected(view) {
  const rows = await api('/opportunities?rejected=1');
  view.innerHTML = html`<span class="eyebrow">Audit</span><h1>Rejected products</h1>
    <p class="muted">These ${rows.length} supplier listings were checked and lose money once shipping, customs, VAT, fees and unsold stock are counted, so they are hidden everywhere else. They are re-checked automatically and come back on their own if prices change.</p>
    ${rows.length ? h`<div class="card table-wrap"><table><thead><tr><th>Product</th><th class="num">Delivered cost</th><th class="num">Expected result</th><th>Why rejected</th></tr></thead><tbody>
      ${rows.map(o => h`<tr><td><a href="#/p/${o.id}">${o.name}</a><br><small>${o.platform}</small></td><td class="num">${money(o.landed, 2)}</td><td class="num neg">${money(o.base)}</td><td><small>${o.reason || ''}</small></td></tr>`)}
    </tbody></table></div>` : h`<div class="empty">Nothing rejected.</div>`}`;
}
