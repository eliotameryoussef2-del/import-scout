import { api, html, h, dateStr, money, toast, formData } from '../lib.js';
import { state } from '../app.js';
import { pieceCard, bindPieceActions } from './studio.js';

const STATUSES = ['draft', 'approved', 'scheduled', 'exported', 'published'];
const ASSETS = ['not_started', 'shooting', 'editing', 'ready'];
let month = new Date(); month.setDate(1);
let filter = '';

export default async function calendar(view) {
  const [content, events] = await Promise.all([api('/content'), api('/calendar-events')]);
  const items = content.filter(c => !filter || c.status === filter);
  const y = month.getFullYear(); const mo = month.getMonth();
  const first = new Date(y, mo, 1); const start = (first.getDay() + 6) % 7; const days = new Date(y, mo + 1, 0).getDate();
  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cells = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(y, mo, d));
  const today = key(new Date());
  view.innerHTML = html`<div class="row between"><div><span class="eyebrow">Plan</span><h1>Content calendar</h1></div><span class="row"><a class="btn small" href="/api/content.ics">⤓ Export .ics</a><a class="btn small primary" href="#/studio">＋ New campaign</a></span></div>
    <p class="muted">Plan, approve and export posts. Publishing is manual: the official Instagram, Facebook and TikTok publishing APIs need app review and are not connected, so nothing is posted or paid for without you.</p>
    <div class="card"><div class="row between"><button class="btn small" id="prev">‹</button><b>${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b><button class="btn small" id="next">›</button></div>
      <div class="cal" style="margin-top:8px">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => h`<div class="h">${d}</div>`)}
      ${cells.map(d => d ? h`<div class="d ${key(d) === today ? 'today' : ''}"><span class="n">${d.getDate()}</span>
        ${events.filter(e => e.date === key(d) || (e.end_date && e.date <= key(d) && e.end_date >= key(d) && d.getDate() === 1)).map(e => h`<span class="ev lb" title="${e.name}">${e.name}</span>`)}
        ${content.filter(c => c.planned_at && key(new Date(c.planned_at)) === key(d)).map(c => h`<span class="ev" title="${c.short_name}">${state.meta.platforms[c.platform]?.label || c.platform}</span>`)}</div>` : h`<div></div>`)}</div>
      <div class="legend" style="margin-top:6px"><span><i style="background:var(--warn)"></i>Lebanese date</span><span><i style="background:var(--brand)"></i>planned post</span></div></div>
    <div class="tabs">${['', ...STATUSES].map(s => h`<button data-f="${s}" class="${s === filter ? 'on' : ''}">${s || 'all'} (${content.filter(c => !s || c.status === s).length})</button>`)}</div>
    ${items.length ? items.map(c => h`<div class="card">
      <div class="row between"><div><b>${c.short_name || c.product_title || ''}</b> · ${state.meta.platforms[c.platform]?.label || c.platform} · ${c.language} <small>${c.campaign || ''}</small></div><small>${c.planned_at ? 'planned ' + dateStr(c.planned_at) : 'not scheduled'}</small></div>
      <div class="form-grid" style="margin:8px 0">
        <label>Status<select data-k="status" data-id="${c.id}">${STATUSES.map(s => h`<option ${s === c.status ? 'selected' : ''}>${s}</option>`)}</select></label>
        <label>Creative assets<select data-k="asset_status" data-id="${c.id}">${ASSETS.map(s => h`<option value="${s}" ${s === c.asset_status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`)}</select></label>
        <label>Objective<select data-k="objective" data-id="${c.id}">${['sales', 'awareness', 'engagement', 'messages', 'pre-orders'].map(s => h`<option ${s === c.objective ? 'selected' : ''}>${s}</option>`)}</select></label>
        <label>Promo price ($)<input type="number" step="0.5" data-k="promo_price" data-id="${c.id}" value="${c.promo_price ?? ''}"></label>
        <label>Planned<input type="datetime-local" data-k="planned_at" data-id="${c.id}" value="${c.planned_at ? new Date(new Date(c.planned_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}"></label>
      </div>
      <details><summary>Content</summary>${pieceCard({ ...c.payload, id: c.id, platform: c.platform, language: c.language }, { showActions: false })}<a class="btn small" href="/api/content/${c.id}/export">Export .txt</a> <button class="btn small" data-del="${c.id}">Delete</button></details>
      <details><summary>Results ${c.feedback.length ? `(${c.feedback.length} logged)` : ''}</summary>
        ${c.feedback.length ? h`<div class="table-wrap"><table><tr><th>Logged</th><th class="num">Impr.</th><th class="num">Likes</th><th class="num">Comments</th><th class="num">Shares</th><th class="num">Saves</th><th class="num">Msgs</th><th class="num">Orders</th></tr>${c.feedback.map(f => h`<tr><td><small>${f.recorded_at}</small></td><td class="num">${f.impressions ?? '—'}</td><td class="num">${f.likes ?? '—'}</td><td class="num">${f.comments ?? '—'}</td><td class="num">${f.shares ?? '—'}</td><td class="num">${f.saves ?? '—'}</td><td class="num">${f.messages ?? '—'}</td><td class="num">${f.orders ?? '—'}</td></tr>`)}</table></div>` : ''}
        <form class="form-grid fb" data-id="${c.id}" style="margin-top:6px">${['impressions', 'likes', 'comments', 'shares', 'saves', 'clicks', 'messages', 'orders'].map(k => h`<label>${k}<input type="number" min="0" name="${k}"></label>`)}
          <label>Your rating (1-5)<input type="number" min="1" max="5" name="rating"></label><div style="align-self:end"><button class="btn small primary">Log results</button></div></form>
        <small>Copy these numbers from the platform's own insights. They train the studio's choice of hooks, tone and language for this category.</small></details>
    </div>`) : h`<div class="empty">No content yet — generate a campaign in the Studio.</div>`}
    <section class="card"><h2>Upcoming Lebanese dates</h2><table>${events.slice(0, 15).map(e => h`<tr><td><b>${e.date}</b>${e.end_date ? ` → ${e.end_date}` : ''}</td><td>${e.name}<br><small>${e.relevance || ''}</small></td></tr>`)}</table></section>`;
  view.querySelector('#prev').onclick = () => { month = new Date(y, mo - 1, 1); calendar(view); };
  view.querySelector('#next').onclick = () => { month = new Date(y, mo + 1, 1); calendar(view); };
  view.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; calendar(view); }));
  view.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', async () => {
    let v = el.value;
    if (el.dataset.k === 'planned_at') v = v ? new Date(v).toISOString() : '';
    const body = { [el.dataset.k]: v };
    if (el.dataset.k === 'status' && v === 'published') {
      if (!confirm('Mark as published? Only do this after you have posted it yourself — this app does not post.')) return calendar(view);
      body.confirm = true;
    }
    await api(`/content/${el.dataset.id}`, { method: 'PATCH', body }); toast('Saved');
  }));
  view.querySelectorAll('form.fb').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    await api(`/content/${f.dataset.id}/feedback`, { body: formData(f) }); toast('Results logged — the studio will use them'); calendar(view);
  }));
  view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (confirm('Delete this draft?')) { await api(`/content/${b.dataset.del}`, { method: 'DELETE' }); calendar(view); } }));
  bindPieceActions(view, []);
}
