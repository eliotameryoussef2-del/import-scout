// Comments with replies, like Darb. Used by the feed's Comments panel and the product page.
// Online and signed in, comments are shared (everyone sees them and can reply); otherwise they are
// notes kept on this phone (marked "only on this phone").
import { api, html, h, raw, toast, ago } from './lib.js';

const when = c => ago(String(c.created_at).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(c.created_at)) ? '' : 'Z'));
const rememberedName = () => { try { return localStorage.getItem('comment:author') || ''; } catch { return ''; } };

/** Render the comment thread + form for product `id` into `root` (a container element). */
export async function renderThread(root, id, name) {
  let replyTo = null;
  root.innerHTML = html`<div class="clist"><div class="loading" style="padding:12px"></div></div>
    <form class="comment-form">
      <p class="replying" hidden></p>
      <input name="author" placeholder="Your name (optional)" maxlength="60" autocomplete="name" value="${rememberedName()}">
      <textarea name="body" placeholder="Write a comment, a question, or what the supplier told you…" maxlength="2000" required></textarea>
      <button class="btn primary">Post comment</button>
      ${window.IMPORT_SCOUT_STATIC ? h`<small class="muted" data-signhint></small>` : ''}
    </form>`;
  const list = root.querySelector('.clist');
  const form = root.querySelector('form');
  const replying = root.querySelector('.replying');
  const item = c => h`<li${c.private ? raw(' class="private"') : ''}><div class="row between"><b>${c.author || 'Anonymous'}</b><span class="row"><small class="muted">${when(c)}${c.private ? ' · only on this phone' : ''}</small></span></div>
    <p>${c.body}</p><div class="row cactions"><button type="button" class="linkbtn" data-reply="${c.id}" data-who="${c.author || 'Anonymous'}">Reply</button>${c.mine ? h`<button type="button" class="linkbtn" data-del="${c.id}">Delete</button>` : ''}</div></li>`;
  const draw = rows => {
    const top = rows.filter(c => !c.parent_id || !rows.some(p => p.id === c.parent_id));
    list.innerHTML = rows.length ? html`<ul class="comments">${top.map(c => h`${item(c)}${rows.some(r => r.parent_id === c.id) ? h`<ul class="comments replies">${rows.filter(r => r.parent_id === c.id).map(item)}</ul>` : ''}`)}</ul>`
      : '<p class="muted">No comments yet. Be the first.</p>';
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      await api(`/comments/${id}/${b.dataset.del}`, { method: 'DELETE' });
      draw(await api(`/comments/${id}`));
    }));
    list.querySelectorAll('[data-reply]').forEach(b => b.addEventListener('click', () => {
      replyTo = Number(b.dataset.reply);
      replying.hidden = false;
      replying.innerHTML = html`Replying to <b>${b.dataset.who}</b> · <button type="button" class="linkbtn" data-cancel>cancel</button>`;
      replying.querySelector('[data-cancel]').addEventListener('click', () => { replyTo = null; replying.hidden = true; });
      form.body.focus();
    }));
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const body = form.body.value.trim();
    if (!body) return;
    const author = form.author.value.trim();
    try { localStorage.setItem('comment:author', author); } catch { /* private mode */ }
    form.querySelector('button').disabled = true;
    try {
      await api(`/comments/${id}`, { body: { body, author, name, parent_id: replyTo } });
      form.body.value = ''; replyTo = null; replying.hidden = true;
      draw(await api(`/comments/${id}`)); toast('Comment posted');
    } catch (err) { toast(err.message); }
    finally { form.querySelector('button').disabled = false; }
  });
  const hint = root.querySelector('[data-signhint]');
  if (hint) import('./account.js').then(async a => { hint.textContent = (await a.sharedReady()) ? 'Everyone can see your comment and reply.' : 'Sign in (top right) so others can see your comments and reply to you.'; }).catch(() => {});
  draw(await api(`/comments/${id}`).catch(() => []));
}

/** Comments panel opened from the feed. */
export async function openCommentsSheet(id, name) {
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.innerHTML = html`<div class="panel comments-sheet" role="dialog" aria-label="Comments">
    <div class="grab"></div>
    <div class="row between"><h2 style="margin:0">Comments</h2><button type="button" class="btn small" data-close aria-label="Close">✕</button></div>
    <p class="muted" style="margin:4px 0 10px">${name}</p><div data-thread></div></div>`;
  const close = () => wrap.remove();
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('[data-close]').addEventListener('click', close);
  document.body.appendChild(wrap);
  await renderThread(wrap.querySelector('[data-thread]'), id, name);
}
