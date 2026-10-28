import { api, html, h, ago, toast, formData } from '../lib.js';
import { state } from '../app.js';

const KIND = { measured: ['Measured', 'b-good'], calendar: ['Calendar date', 'b-info'], manual: ['Your observation', 'b-warn'], hypothesis: ['Hypothesis', ''] };

export default async function trends(view) {
  const rows = await api('/trends');
  view.innerHTML = html`<span class="eyebrow">Signals</span><h1>Trend signals</h1>
    <p class="muted"><b>Measured</b> = numbers returned by a public source today (Google Trends “Trending now” for Lebanon, Wikipedia page views). <b>Calendar</b> = factual dates; how they affect sales is a hypothesis. Platform metrics (TikTok/Instagram views, rankings) are <b>not available</b> without approved API access, so none are shown — add what you observe yourself.</p>
    <div class="grid cards">${rows.map(t => h`<article class="card">
      <div class="row between"><h3>${t.title}</h3><span class="badge ${KIND[t.kind]?.[1] || ''}">${KIND[t.kind]?.[0] || t.kind}</span></div>
      ${t.description ? h`<p><small>${t.description}</small></p>` : ''}
      <p><small>${t.source}${t.source_url ? h` · <a href="${t.source_url}" target="_blank" rel="noopener">source</a>` : ''} · observed ${ago(t.observed_at)}${t.metric ? ` · ${t.metric}: ${t.metric_value ?? '—'}` : ''} · confidence ${t.confidence || '?'}${t.direction && t.direction !== 'unknown' ? ` · ${t.direction}` : ''}</small></p>
      ${t.categories.length ? h`<p><small>Categories: ${t.categories.map(c => state.meta.categories[c] || c).join(', ')}</small></p>` : ''}
      ${t.applications.length ? h`<ul class="reasons">${t.applications.map(a => h`<li>${a}</li>`)}</ul>` : ''}
      ${['manual', 'hypothesis'].includes(t.kind) ? h`<button class="btn small" data-del="${t.id}">Delete</button>` : ''}
    </article>`)}</div>
    <section class="card"><h2>Add a trend you observed</h2><form id="f" class="form-grid">
      <label>What did you see?<input name="title" required placeholder="e.g. 'Get ready with me' hiking reels from Lebanese creators"></label>
      <label>Where (source / link)<input name="source_url" placeholder="https://…"></label>
      <label>Category<select name="category"><option value="">any</option>${Object.entries(state.meta.categories).map(([k, v]) => h`<option value="${k}">${v}</option>`)}</select></label>
      <label>Type<select name="kind"><option value="manual">Observed (I saw it)</option><option value="hypothesis">Hypothesis (my guess)</option></select></label>
      <label>How to use it<input name="application" placeholder="e.g. film a 3-step packing routine"></label>
      <div style="align-self:end"><button class="btn primary">Add</button></div></form></section>`;
  view.querySelector('#f').addEventListener('submit', async e => {
    e.preventDefault();
    const f = formData(e.target);
    await api('/trends', { body: { title: f.title, source_url: f.source_url || null, source: f.source_url ? new URL(f.source_url).host : 'Your own observation', categories: f.category ? [f.category] : [], kind: f.kind, applications: f.application ? [f.application] : [], confidence: f.kind === 'manual' ? 'medium' : 'low' } });
    toast('Added'); trends(view);
  });
  view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { await api(`/trends/${b.dataset.del}`, { method: 'DELETE' }); trends(view); }));
}
