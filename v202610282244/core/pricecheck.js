// Price check: someone describes an item (with its specs) and optionally the price their supplier
// offers. This finds the same or closest items in Lebanese shops and among the supplier offers the app
// knows, using the same rules as the rest of the app. Pure JS (no database), so it runs in the browser
// on the online copy as well as on the computer.
import { normalizeText, extractSpecs, detectBrand, sizeTag } from './normalize.js';
import { detectTypes, KEY_SPECS, PRODUCT_TYPES, SIMILAR_PRICING_TYPES } from './taxonomy.js';
import { isSimilarItem } from './similar.js';

const UNIT = { capacity_ml: 'ml', battery_mah: 'mAh', power_w: 'W', thickness_mm: 'mm', length_cm: 'cm', weight_g: 'g', max_load_g: 'g', count: 'pcs', lumens: 'lm', inch: 'in', bt_version: '' };
const EXACT = new Set(['max_load_g', 'count', 'bt_version']);
const same = (k, a, b) => {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify([].concat(a).sort()) === JSON.stringify([].concat(b).sort());
  if (EXACT.has(k)) return a === b;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9) <= 0.03;
};
export const RANK = { identical: 0, closest: 1, similar: 2 };
export const LABELS = { identical: 'Same specs', closest: 'Closest (some specs not stated)', similar: 'Similar item' };

/** What the app understood from the description. */
export function readDescription(description) {
  const text = normalizeText(description || '');
  const type = detectTypes(text)[0] || null;
  return { text, type, typeLabel: type ? type.replace(/_/g, ' ') : null, specs: extractSpecs(text), brand: detectBrand(description) || null };
}

/** Compare one listing (shop item or supplier offer) with the description. Returns null when it is a different product. */
export function compareListing(desc, title, listingSpecs = null) {
  const t = normalizeText(title || '');
  if (!desc.type || detectTypes(t)[0] !== desc.type) return null; // a different kind of product
  const key = KEY_SPECS[desc.type] || KEY_SPECS.default;
  const specs = { ...(listingSpecs || {}), ...extractSpecs(t) };
  const table = []; let agree = 0; let stated = 0;
  for (const k of key.numeric) {
    const a = desc.specs[k]; const b = specs[k];
    if (a == null && b == null) continue;
    stated++;
    if (a == null || b == null) { table.push({ k, ours: a, theirs: b, match: null }); continue; }
    const ok = same(k, a, b);
    table.push({ k, ours: a, theirs: b, match: ok });
    if (!ok) return null; // a stated spec differs: not the same item (bigger, smaller, stronger...)
    agree++;
  }
  const ma = desc.specs.materials || []; const mb = specs.materials || [];
  if (ma.length && mb.length && !mb.some(x => ma.includes(x))) return null; // different material
  const sa = sizeTag(desc.text); const sb = sizeTag(t);
  if (sa && sb && sa !== sb) return null;
  if (!isSimilarItem(desc.type, desc.text, t, { materials: false })) return null; // (materials compared above, using the full listing) // different style, age group or gender
  // Kind of product within the type (hand vs jug blender, tripod vs selfie stick…) must not contradict.
  let formNote = null;
  if (key.forms) {
    const formOf = x => key.forms.findIndex(g => g.some(w => new RegExp('\\b' + w + '\\b').test(x)));
    const fa = formOf(desc.text); const fb = formOf(t);
    if (fa >= 0 && fb >= 0 && fa !== fb) return null;
    if (key.formsOptional && fa !== fb) return null;
    if (fa !== fb) formNote = 'kind not stated on both';
  }
  // Products defined by their specs (power, capacity, size…) need at least one spec that matches.
  if (!SIMILAR_PRICING_TYPES.has(desc.type) && agree === 0) return null;
  const allBoth = table.length > 0 && table.every(r => r.match === true) && agree === stated && !formNote;
  const label = allBoth ? 'identical' : agree > 0 ? 'closest' : 'similar';
  return { label, specs: table.map(r => ({ ...r, unit: UNIT[r.k] ?? '' })) };
}

/**
 * shops: [{title, price, retailer, url, branches?}]; suppliers: [{title, price, moq, platform, url}].
 * Returns matches ranked identical → closest → similar, cheapest first, plus a plain summary.
 */
export function priceCheck({ description, supplierPrice, shops = [], suppliers = [] }) {
  const desc = readDescription(description);
  if (!desc.type) return { desc, error: 'The app could not tell what kind of product this is. Name it plainly, e.g. "stainless steel water bottle 500ml" or "kids swimming goggles".' };
  const rank = rows => rows.map(r => { const c = compareListing(desc, r.title, r.specs); return c && { ...r, ...c, specs: undefined, compared: c.specs }; }).filter(Boolean)
    .sort((a, b) => RANK[a.label] - RANK[b.label] || a.price - b.price);
  const shopMatches = rank(shops.filter(s => s.price > 0));
  const supplierMatches = rank(suppliers.filter(s => s.price > 0));
  const best = list => { const top = list.filter(x => x.label === list[0]?.label); return top.length ? { label: top[0].label, n: top.length, min: Math.min(...top.map(x => x.price)), max: Math.max(...top.map(x => x.price)), stores: new Set(top.map(x => x.retailer || x.platform)).size } : null; };
  const shop = best(shopMatches); const sup = best(supplierMatches);
  const lines = [];
  if (shop) lines.push(`Lebanese shops: ${shop.n} ${LABELS[shop.label].toLowerCase()} listing(s) at ${shop.stores} shop(s), from $${shop.min} to $${shop.max}.`);
  else lines.push('No Lebanese shop listing matches this item closely enough to compare.');
  if (sup) lines.push(`Other suppliers: ${sup.n} offer(s), from $${sup.min} per unit.`);
  const p = Number(supplierPrice);
  if (p > 0 && sup) lines.push(p <= sup.min ? `Your supplier ($${p}) is at or below the cheapest comparable offer the app knows.` : `Your supplier ($${p}) is $${(p - sup.min).toFixed(2)} above the cheapest comparable offer the app knows ($${sup.min}).`);
  if (p > 0 && shop) lines.push(`Shops sell from $${shop.min}: about ${(shop.min / p).toFixed(1)}× your supplier price, before shipping, customs and VAT (usually +40–70% for small goods).`);
  return { desc, category: PRODUCT_TYPES[desc.type]?.category, shopMatches, supplierMatches, shop, sup, summary: lines };
}
