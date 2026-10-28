import { api, html, h, raw, money, toast, esc } from '../lib.js';
import { state } from '../app.js';

const LANGS = { en: 'English', ar: 'Lebanese Arabic', fr: 'French' };

export function pieceCard(p, { showActions = true } = {}) {
  const meta = state.meta.platforms[p.platform] || {};
  const rtl = p.language === 'ar' ? 'rtl' : 'ltr';
  return h`<article class="card" data-piece="${p.id}">
    <div class="row between"><h3>${meta.label || p.platform} · ${LANGS[p.language] || p.language}</h3><span class="badge b-info">${state.meta.hookTypes[p.hook_type] || p.hook_type}</span></div>
    <p dir="${rtl}"><b>Hook:</b> ${p.hook}</p>
    <pre class="copy" dir="${rtl}">${p.caption}${p.hashtags?.length ? '\n\n' + p.hashtags.join(' ') : ''}</pre>
    ${p.concept ? h`<details open><summary>Video: ${p.duration_s || ''}s — ${p.concept}</summary>
      <div class="table-wrap"><table><thead><tr><th>Time</th><th>Shot</th><th>On-screen text</th><th>Voice-over</th></tr></thead><tbody>
      ${(p.shots || []).map((s, i) => h`<tr><td>${s.time}</td><td>${s.shot}${s.tip ? h`<br><small>${s.tip}</small>` : ''}</td><td dir="${rtl}">${p.script?.[i]?.on_screen || p.on_screen_text?.[i] || ''}</td><td dir="${rtl}">${p.script?.[i]?.voiceover || ''}</td></tr>`)}
      </tbody></table></div>${p.audio ? h`<small>${p.audio}</small>` : ''}</details>` : ''}
    ${p.image_prompts?.length ? h`<details><summary>Image-generation prompts</summary><ul class="reasons">${p.image_prompts.map(x => h`<li>${x}</li>`)}</ul></details>` : ''}
    ${showActions ? h`<div class="row" style="margin-top:8px">
      <button class="btn small" data-copy="${p.id}">Copy text</button>
      <label class="row" style="color:var(--text)">Plan for <input type="datetime-local" data-date="${p.id}"></label><button class="btn small" data-plan="${p.id}">Add to calendar</button>
      <a class="btn small" href="/api/content/${p.id}/export">Export .txt</a></div>` : ''}
  </article>`;
}

export function bindPieceActions(root, pieces) {
  root.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const p = pieces.find(x => String(x.id) === b.dataset.copy);
    await navigator.clipboard.writeText(`${p.caption}${p.hashtags?.length ? '\n\n' + p.hashtags.join(' ') : ''}`).catch(() => {});
    toast('Copied');
  }));
  root.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', async () => {
    const d = root.querySelector(`[data-date="${b.dataset.plan}"]`).value;
    if (!d) return toast('Pick a date first');
    await api(`/content/${b.dataset.plan}`, { method: 'PATCH', body: { planned_at: new Date(d).toISOString(), status: 'approved' } });
    toast('Added to the content calendar (approved draft — nothing is posted automatically)');
  }));
}

export default async function studio(view, id) {
  const opps = await api('/opportunities');
  const choices = opps.filter(o => o.status !== 'insufficient_data');
  const sel = id ? Number(id) : choices[0]?.id;
  const facts = sel ? await api(`/marketing/facts/${sel}`) : null;
  view.innerHTML = html`<span class="eyebrow">Create</span><h1>Marketing studio</h1>
    <p class="muted">Campaign ideas built from this product's real specs, your financial model's price, upcoming Lebanese dates and current trend signals. ${state.meta.claude ? 'Generator: Claude (falls back to templates on error).' : 'Generator: built-in templates (set ANTHROPIC_API_KEY for Claude-written copy).'} Nothing is ever published automatically.</p>
    <div class="card"><form id="f" class="stack">
      <label>Product<select name="id">${choices.map(o => h`<option value="${o.id}" ${o.id === sel ? 'selected' : ''}>${o.name} (${o.status})</option>`)}</select></label>
      ${facts?.facts ? h`<div class="notice">${facts.facts.specLines.length ? 'Verified specs used: ' + facts.facts.specLines.join(' · ') : 'No specifications recorded — copy will stay general.'}<br>
        ${facts.facts.offer?.price ? `Suggested price ${money(facts.facts.offer.price, facts.facts.offer.price % 1 ? 2 : 0)} (never below ${money(facts.facts.offer.floor, 2)}, which covers your costs)${facts.facts.offer.intro ? ` · optional launch offer: ${facts.facts.offer.intro.text}` : ''}${facts.facts.offer.bundle ? ` · bundle: ${facts.facts.offer.bundle.text}` : ''}` : facts.facts.offer?.note}
        ${facts.stats?.samples ? raw(`<br>Learning from ${facts.stats.samples} post(s) with logged results (${esc(facts.stats.scope)}).`) : raw('<br>No campaign results logged yet — log them in the Calendar so the studio learns what works.')}</div>` : ''}
      <div><b>Brand personality</b><div class="chips">${Object.entries(state.meta.personalities).map(([k, v], i) => h`<label class="chip"><input type="radio" name="personality" value="${k}" ${i === 3 ? 'checked' : ''} hidden> ${v}</label>`)}</div></div>
      <div><b>Languages</b><div class="chips">${Object.entries(LANGS).map(([k, v]) => h`<label class="check"><input type="checkbox" name="lang" value="${k}" ${k === 'en' ? 'checked' : ''}> ${v}</label>`)}</div></div>
      <div><b>Channels</b><div class="chips">${Object.entries(state.meta.platforms).map(([k, v]) => h`<label class="check"><input type="checkbox" name="pl" value="${k}" ${['instagram_reel', 'instagram_post', 'tiktok', 'whatsapp'].includes(k) ? 'checked' : ''}> ${v.label}</label>`)}</div></div>
      <div class="row"><button class="btn primary" id="go">Generate campaign</button>${state.meta.claude ? h`<label class="check"><input type="checkbox" name="tpl"> use templates instead of Claude</label>` : ''}</div>
    </form></div>
    <div id="out"></div>`;
  const form = view.querySelector('#f');
  const syncChips = () => form.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.querySelector('input').checked));
  form.addEventListener('change', e => { syncChips(); if (e.target.name === 'id') location.hash = `#/studio/${e.target.value}`; });
  syncChips();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = view.querySelector('#go'); btn.disabled = true; btn.textContent = 'Generating…';
    const body = {
      id: Number(form.id.value), personality: form.querySelector('[name=personality]:checked').value,
      languages: [...form.querySelectorAll('[name=lang]:checked')].map(x => x.value), platforms: [...form.querySelectorAll('[name=pl]:checked')].map(x => x.value),
      generator: form.tpl?.checked ? 'template' : undefined,
    };
    try {
      const c = await api('/marketing/generate', { body });
      const out = view.querySelector('#out');
      out.innerHTML = html`
        <section class="card"><h2>${c.campaign}</h2><p><small>Generator: ${c.generator}. Saved as drafts in the calendar.</small></p>
          ${c.claim_issues.length ? h`<div class="notice warn"><b>Check before posting:</b> ${c.claim_issues.map(i => `${i.type} ("${i.excerpt}")`).join('; ')}</div>` : h`<div class="notice">Claim check passed: no invented certifications, guarantees, ratings, discounts or prices outside your model.</div>`}
          <h3>Marketing angles</h3><ol>${c.angles.map(a => h`<li><b>${a.name}</b>${a.learned ? h` <span class="badge b-good">worked before</span>` : ''} — ${a.insight}${a.trend_used ? h` <small>(trend: ${a.trend_used})</small>` : ''}</li>`)}</ol>
          ${c.learning.best_hooks.length ? h`<p><small>Learned from your results: ${c.learning.best_hooks.map(b => `${b.label} ${(b.engagement_rate * 100).toFixed(1)}% engagement over ${b.posts} post(s)`).join(' · ')}</small></p>` : ''}
          ${c.trends_considered.length ? h`<details><summary>${c.trends_considered.length} trend / calendar signal(s) considered</summary><ul class="reasons">${c.trends_considered.map(t => h`<li>[${t.kind}] ${t.title} — ${t.source}</li>`)}</ul></details>` : ''}
        </section>
        <section class="card"><h2>Product descriptions</h2><div class="grid three">
          <div><h3>English</h3><pre class="copy">${c.descriptions.en}</pre></div><div><h3>Lebanese Arabic</h3><pre class="copy" dir="rtl">${c.descriptions.ar}</pre></div><div><h3>Français</h3><pre class="copy">${c.descriptions.fr}</pre></div></div>
          ${c.image_prompts?.length ? h`<h3>Creative assets to prepare</h3><ul class="reasons">${c.image_prompts.map(x => h`<li>${x}</li>`)}</ul>` : ''}</section>
        <div class="grid cards">${c.pieces.map(p => pieceCard(p))}</div>`;
      bindPieceActions(out, c.pieces);
      out.scrollIntoView({ behavior: 'smooth' });
    } catch (err) { toast(err.message, 5000); }
    btn.disabled = false; btn.textContent = 'Generate campaign';
  });
}
