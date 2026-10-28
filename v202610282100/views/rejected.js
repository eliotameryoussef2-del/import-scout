// Audit page: products the app checked and does not list — they lose money, or nothing in Lebanese
// shops is close enough to compare with. They are hidden everywhere else; this page shows why.
import { api, html, h, money } from '../lib.js';

const table = rows => h`<div class="card table-wrap"><table><thead><tr><th>Product</th><th class="num">Delivered cost</th><th class="num">Expected result</th><th>Why</th></tr></thead><tbody>
  ${rows.map(o => h`<tr><td><a href="#/p/${o.id}">${o.name}</a><br><small>${o.platform}</small></td><td class="num">${money(o.landed, 2)}</td><td class="num ${o.base != null && o.base < 0 ? 'neg' : ''}">${o.base != null ? money(o.base) : '—'}</td><td><small>${o.reason || ''}</small></td></tr>`)}
</tbody></table></div>`;

export default async function rejected(view) {
  const rows = await api('/opportunities?rejected=1');
  const losing = rows.filter(o => o.status === 'unprofitable');
  const nothing = rows.filter(o => o.status === 'insufficient_data');
  view.innerHTML = html`<span class="eyebrow">Audit</span><h1>Rejected products</h1>
    <p class="muted">Checked but not listed anywhere else. They are re-checked automatically and come back on their own if prices change or a comparable item appears in a Lebanese shop.</p>
    <h2 class="section-title">Lose money (${losing.length})</h2>
    ${losing.length ? table(losing) : h`<div class="empty">None.</div>`}
    <h2 class="section-title">Nothing to compare with in Lebanon (${nothing.length})</h2>
    ${nothing.length ? table(nothing) : h`<div class="empty">None.</div>`}`;
}
