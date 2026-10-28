// Accounts, like Darb: sign in with a 6-digit code sent by email (no password), using the same
// Supabase project as Darb, so a Darb account works here too. Saved products, comments, budget and
// filters sync across the person's phones through the private `scout_state` table (only the owner can
// read or write their row; see supabase/scout_state.sql).
import { html, toast } from './lib.js';

const SUPA = { url: 'https://bgmxxtlkgvfcfzureeur.supabase.co', key: 'sb_publishable_C9vZGSdLcPHlWbFjOl50BQ_xtP4JtFM' };
// Keys in this phone's storage that belong to the account.
const SYNC = ['is:saved', 'is:comments', 'is:budget', 'filters:v1', 'comment:author'];
const sb = window.supabase ? window.supabase.createClient(SUPA.url, SUPA.key, { auth: { persistSession: true, detectSessionInUrl: false } }) : null;
let USER = null; let TOKEN = null; let pushTimer = null; let onChange = () => {};

const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } };
async function rest(path, opts = {}) {
  const r = await fetch(SUPA.url + path, { ...opts, headers: { apikey: SUPA.key, 'content-type': 'application/json', ...(TOKEN ? { authorization: 'Bearer ' + TOKEN } : {}), ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
  return r.status === 204 ? null : r.json().catch(() => null);
}

export const currentUser = () => USER;

/** Merge the account's saved state into this phone (union of saved items and comments), then push back. */
async function pull() {
  const rows = await rest(`/rest/v1/scout_state?select=state&user_id=eq.${USER.id}`);
  const remote = rows?.[0]?.state || {};
  const parse = (k, d) => { try { return JSON.parse(read(k)) ?? d; } catch { return d; } };
  const saved = { ...(remote['is:saved'] || {}), ...parse('is:saved', {}) };
  const comments = { ...(remote['is:comments'] || {}) };
  for (const [id, list] of Object.entries(parse('is:comments', {}))) {
    const seen = new Set((comments[id] || []).map(c => c.id));
    comments[id] = [...(comments[id] || []), ...list.filter(c => !seen.has(c.id))];
  }
  write('is:saved', JSON.stringify(saved));
  write('is:comments', JSON.stringify(comments));
  for (const k of ['is:budget', 'filters:v1', 'comment:author']) if (remote[k] != null && read(k) == null) write(k, typeof remote[k] === 'string' ? remote[k] : JSON.stringify(remote[k]));
  push(true);
}

/** Save this phone's state to the account (debounced). Called after every change. */
export function push(now = false) {
  if (!USER) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const state = {};
    for (const k of SYNC) { const v = read(k); if (v == null) continue; try { state[k] = JSON.parse(v); } catch { state[k] = v; } }
    rest('/rest/v1/scout_state', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: USER.id, state, updated_at: new Date().toISOString() }) })
      .catch(e => console.warn('Sync failed', e.message));
  }, now ? 0 : 1500);
}

export function initAccount(refresh) {
  onChange = refresh || onChange;
  const btn = document.getElementById('account-btn');
  btn?.addEventListener('click', openAccount);
  if (!sb) { if (btn) btn.hidden = true; return; }
  sb.auth.onAuthStateChange(async (ev, session) => {
    const was = !!USER;
    USER = session?.user || null; TOKEN = session?.access_token || null;
    btn?.classList.toggle('on', !!USER);
    if (USER && !was) {
      try { await pull(); } catch (e) { console.warn('Could not load your account data', e.message); }
      if (ev === 'SIGNED_IN') { document.querySelector('.overlay.account')?.remove(); toast('Signed in. Your saved items now sync.'); }
      onChange();
    }
  });
}

export function openAccount() {
  document.querySelector('.overlay.account')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'overlay account';
  const close = () => wrap.remove();
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  if (!sb) { toast('Sign-in is not available right now. Check your connection.'); return; }
  if (USER) {
    wrap.innerHTML = html`<div class="panel"><div class="grab"></div><h2>Your account</h2>
      <p class="muted">Signed in as <b>${USER.email}</b>. Saved products, comments, your budget and filters sync to every phone you sign in on. It is the same account as Darb.</p>
      <div class="row"><button class="btn" data-out>Sign out</button><button class="btn primary" data-close>Done</button></div></div>`;
    wrap.querySelector('[data-close]').addEventListener('click', close);
    wrap.querySelector('[data-out]').addEventListener('click', async () => { await sb.auth.signOut(); USER = null; TOKEN = null; document.getElementById('account-btn')?.classList.remove('on'); close(); toast('Signed out'); });
    document.body.appendChild(wrap);
    return;
  }
  wrap.innerHTML = html`<div class="panel"><div class="grab"></div><h2>Sign in or sign up</h2>
    <p class="muted" style="margin-top:0">Keep your saved products, comments, budget and filters on all your phones. Same account as Darb, no password.</p>
    <div data-step1><label>Email<input type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" data-email></label>
      <button class="btn primary" style="width:100%;margin-top:10px" data-send>Send me a code</button></div>
    <div data-step2 hidden><label>6-digit code<input inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" data-code class="codebox"></label>
      <div class="row" style="margin-top:10px"><button class="btn primary" data-verify>Sign in</button><button class="btn" data-again>Use another email</button></div></div>
    <p class="muted" data-msg style="margin:10px 0 0">We'll email you a 6-digit code. No password needed.</p></div>`;
  let email = '';
  const $ = s => wrap.querySelector(s);
  $('[data-send]').addEventListener('click', async () => {
    email = ($('[data-email]').value || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Enter a valid email');
    const b = $('[data-send]'); b.disabled = true; b.textContent = 'Sending…';
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    b.disabled = false; b.textContent = 'Send me a code';
    if (error) { $('[data-msg]').textContent = /rate|limit|seconds/i.test(error.message) ? 'Too many codes requested. Wait a minute and try again.' : `Couldn't send: ${error.message}`; return; }
    $('[data-step1]').hidden = true; $('[data-step2]').hidden = false;
    $('[data-msg]').textContent = `✓ Code sent to ${email}. Check your inbox and spam folder (the email comes from Darb).`;
    setTimeout(() => $('[data-code]').focus(), 200);
  });
  $('[data-verify]').addEventListener('click', async () => {
    const token = ($('[data-code]').value || '').replace(/\D/g, '');
    if (token.length !== 6) return toast('Enter the 6-digit code');
    const b = $('[data-verify]'); b.disabled = true; b.textContent = 'Checking…';
    const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
    b.disabled = false; b.textContent = 'Sign in';
    if (error) $('[data-msg]').textContent = /expired|invalid/i.test(error.message) ? 'That code is wrong or expired. Check it, or request a new one.' : `Couldn't sign in: ${error.message}`;
  });
  $('[data-again]').addEventListener('click', () => { $('[data-step1]').hidden = false; $('[data-step2]').hidden = true; });
  document.body.appendChild(wrap);
  setTimeout(() => $('[data-email]').focus(), 250);
}

// ---- Shared comments with replies (table scout_comments). Readable by everyone; writing needs an account.
let sharedOk = null; // null = not checked yet, false = table not set up yet
async function sharedAvailable() {
  if (sharedOk != null) return sharedOk;
  try { await rest('/rest/v1/scout_comments?select=id&limit=1'); sharedOk = true; } catch { sharedOk = false; }
  return sharedOk;
}
const toComment = c => ({ id: c.id, parent_id: c.parent_id, author: c.author, body: c.body, created_at: c.created_at, mine: !!USER && c.user_id === USER.id });

/** Comments on a product from everyone, or null when shared comments are not available. */
export async function sharedComments(productId) {
  if (!(await sharedAvailable())) return null;
  const rows = await rest(`/rest/v1/scout_comments?select=*&product_id=eq.${encodeURIComponent(productId)}&order=created_at.asc`);
  return rows.map(toComment);
}
export async function postShared(productId, productName, { body, author, parent_id = null }) {
  if (!USER) throw new Error('Sign in (top right) so others can see and reply to your comment.');
  const [row] = await rest('/rest/v1/scout_comments', { method: 'POST', headers: { prefer: 'return=representation' },
    body: JSON.stringify({ product_id: String(productId), product_name: productName || null, parent_id, author: author || USER.email.split('@')[0], body }) });
  return toComment(row);
}
export async function deleteShared(id) { await rest(`/rest/v1/scout_comments?id=eq.${id}`, { method: 'DELETE' }); }
export const sharedReady = async () => !!USER && (await sharedAvailable());

/** Replies other people wrote to my comments, newest first. */
export async function myReplies() {
  if (!USER || !(await sharedAvailable())) return null;
  const mine = await rest(`/rest/v1/scout_comments?select=id,product_id,product_name,body&user_id=eq.${USER.id}`);
  if (!mine.length) return [];
  const ids = mine.map(c => c.id).join(',');
  const replies = await rest(`/rest/v1/scout_comments?select=*&parent_id=in.(${ids})&user_id=neq.${USER.id}&order=created_at.desc`);
  const byId = Object.fromEntries(mine.map(c => [c.id, c]));
  return replies.map(r => ({ ...toComment(r), product_id: r.product_id, product_name: r.product_name, to: byId[r.parent_id]?.body }));
}
