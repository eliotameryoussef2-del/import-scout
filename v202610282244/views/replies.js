// Replies other people wrote to your comments (online copy, signed in).
import { api, html, h, ago } from '../lib.js';

export default async function replies(view) {
  const online = !!window.IMPORT_SCOUT_STATIC;
  const acc = online ? await import('../account.js').catch(() => null) : null;
  const user = acc?.currentUser();
  view.innerHTML = html`<span class="eyebrow">Activity</span><h1>Replies to my comments</h1>
    ${!online ? h`<div class="empty">Replies come from other people, so they live in the online app (sign in there to see them).</div>`
      : !user ? h`<div class="empty">Sign in (the person icon, top right) to see replies to your comments.<br><br><button class="btn primary" data-signin>Sign in</button></div>`
      : h`<div id="reply-list"><div class="loading"></div></div>`}`;
  view.querySelector('[data-signin]')?.addEventListener('click', () => acc.openAccount());
  if (!user) return;
  const rows = await api('/my-replies');
  const when = c => ago(String(c.created_at).replace(' ', 'T'));
  view.querySelector('#reply-list').innerHTML = rows.length ? html`<ul class="comments">${rows.map(r => h`<li>
      <div class="row between"><b>${r.author || 'Someone'}</b><small class="muted">${when(r)}</small></div>
      <p>${r.body}</p>
      <small class="muted">In reply to “${(r.to || '').slice(0, 80)}” on <a href="#/p/${r.product_id}">${r.product_name || 'a product'}</a></small></li>`)}</ul>`
    : '<div class="empty">No replies yet. When someone replies to one of your comments, it shows here.</div>';
}
