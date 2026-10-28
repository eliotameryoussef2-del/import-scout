// Text normalisation and specification extraction for product matching.

const STOP = new Set(`a an and or the for with of to in on by from at as is are new hot sale best top quality high premium
 wholesale factory custom customized customised logo oem odm free shipping style fashion item product pcs piece pieces set
 2020 2021 2022 2023 2024 2025 2026 2027 1pc 1pcs men women unisex adult kids color colour multi multicolor size
 portable mini large small medium big super ultra pro plus max professional cheap amazon hotsale selling`.split(/\s+/));

const SYNONYMS = [
  [/\bcell ?phone|mobile phone|smartphone\b/g, 'phone'],
  [/\bhiking stick|walking stick\b/g, 'hiking pole'],
  [/\bskipping rope\b/g, 'jump rope'],
  [/\bflask\b/g, 'bottle'],
  [/\btype-c\b|\busb-c\b|\busb c\b/g, 'type c'],
  [/\bear ?buds?\b/g, 'earbuds'],
  [/\bwire ?less\b/g, 'wireless'],
  [/\bstainless[- ]steel\b/g, 'stainless steel'],
  [/\bhead[- ]lamp\b/g, 'headlamp'],
  [/\bpower[- ]bank\b/g, 'power bank'],
  [/\bsmart[- ]watch\b/g, 'smartwatch'],
  [/\bre-?usable\b/g, 'reusable'],
  [/\borganiser\b/g, 'organizer'],
];

export function normalizeText(s) {
  if (!s) return '';
  let t = String(s).toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/[‐-―]/g, '-')
    .replace(/(\d)\s*[×✕*]\s*(?=\d)/g, '$1x');
  for (const [re, rep] of SYNONYMS) t = t.replace(re, rep);
  return t.replace(/[^a-z0-9؀-ۿ.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stem(w) {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('es') && /(sh|ch|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function tokenize(s) {
  return normalizeText(s).replace(/[.-]/g, ' ').split(' ')
    .filter(w => w && w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

const MATERIALS = ['tpe', 'nbr', 'eva', 'pvc', 'silicone', 'stainless steel', 'aluminum', 'aluminium', 'carbon fiber', 'nylon',
  'polyester', 'cotton', 'abs', 'pu leather', 'leather', 'bamboo', 'wood', 'glass', 'latex', 'neoprene', 'rubber', 'cork', 'microfiber', 'memory foam', 'ripstop', 'plastic',
  // Textiles and fashion materials (so a faux-fur scarf is never compared with a wool one).
  'wool', 'cashmere', 'faux fur', 'fur', 'silk', 'satin', 'acrylic', 'linen', 'viscose', 'chiffon', 'fleece', 'denim', 'velvet', 'mesh',
  'canvas', 'oxford', 'jute', 'straw', 'spandex', 'lycra', 'terry', 'suede', 'faux leather', 'vegan leather', 'knit', 'crochet', 'tartan'];
// A synthetic version is not the real material: "PU leather" is not "leather", "faux fur" is not "fur".
const SYNTHETIC_OF = { 'pu leather': 'leather', 'faux leather': 'leather', 'vegan leather': 'leather', 'faux fur': 'fur' };

function num(x) { return Number(String(x).replace(',', '.')); }

/** Extract comparable specs from free text. Values normalised to SI-ish units. */
export function extractSpecs(text) {
  const t = normalizeText(text);
  const specs = {};
  let m;
  // A range ("2000-2999W", "30-720lm") is a product family, not one product: kept for display
  // as *_range but never used as an exact value.
  const R = '(\\d+(?:[.,]\\d+)?)(?:\\s?(?:-|~|to)\\s?(\\d+(?:[.,]\\d+)?))?';
  const numeric = (key, re, conv = v => v) => {
    const mm = t.match(new RegExp(R + re));
    if (!mm) return;
    if (mm[2]) specs[key + '_range'] = [conv(num(mm[1]), mm), conv(num(mm[2]), mm)];
    else specs[key] = conv(num(mm[1]), mm);
  };
  numeric('battery_mah', '\\s?mah\\b');
  numeric('capacity_ml', '\\s?(ml|l|liter|litre|oz)\\b', (v, mm) => (mm[3] === 'ml' ? v : mm[3] === 'oz' ? Math.round(v * 29.57) : v * 1000));
  numeric('power_w', '\\s?w\\b');
  if ((m = t.match(/(?:bluetooth|\bbt)\s?(?:v|version)?\s?(\d\.\d)/))) specs.bt_version = num(m[1]);
  if ((m = t.match(/\b(\d)\s?(?:usb |output )?ports?\b/))) specs.ports = Number(m[1]); else if (/\bdual (?:usb|type c|port|output)/.test(t)) specs.ports = 2;
  if ((m = t.match(/\bip(x?\d{1,2})\b/))) specs.ip_rating = 'IP' + m[1].toUpperCase();
  const FEATURES = [
    ['fm radio', /\bfm\b|\bradio\b/], ['tf/sd card', /\btf\b|\bsd card\b|memory card|micro sd/], ['microphone', /\bmic\b|microphone/], ['rgb lights', /\brgb\b|led light|colorful light|light show/],
    ['tws pairing', /\btws\b|true wireless/], ['aux input', /\baux\b/], ['usb-c', /type c|usb c\b/], ['solar charging', /\bsolar\b/], ['remote control', /\bremote\b/],
    ['noise cancelling', /\banc\b|noise cancel/], ['wireless charging', /wireless charg/], ['power bank output', /power ?bank|usb output|charge (your )?phone/],
    ['hook/hanging', /\bhook\b|hanging/], ['dimmable', /dimmable|dimmer|stepless/], ['telescopic', /telescopic|extendable|adjustable length/], ['magnetic', /(?<!anti[ -]?)\bmagnetic\b|magsafe/], ['insulated', /\bvacuum\b|insulated|double wall|thermos|thermal\b/],
  ];
  const feats = FEATURES.filter(([, re]) => re.test(t)).map(([k]) => k);
  if (feats.length) specs.features = feats;
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s?(?:mm)\s?(?:thick|thickness)|thickness\s?(\d+(?:[.,]\d+)?)\s?mm|(\d+(?:[.,]\d+)?)\s?mm\b/))) {
    const v = num(m[1] || m[2] || m[3]);
    if (v > 0 && v <= 30) specs.thickness_mm = v;
  }
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s?x\s?(\d+(?:[.,]\d+)?)(?:\s?x\s?(\d+(?:[.,]\d+)?))?\s?(cm|mm|m|inch|in)?\b/))) {
    const f = m[4] === 'mm' ? 0.1 : m[4] === 'm' ? 100 : m[4] === 'inch' || m[4] === 'in' ? 2.54 : 1;
    specs.dims_cm = [m[1], m[2], m[3]].filter(Boolean).map(v => Math.round(num(v) * f * 10) / 10);
  }
  if (!specs.dims_cm && (m = t.match(/(\d+(?:[.,]\d+)?)\s?(cm|m|ft|meter|metre)\b(?!\s?x)/))) {
    const v = num(m[1]); const u = m[2];
    const cm = u === 'cm' ? v : u === 'ft' ? v * 30.48 : v * 100;
    if (cm > 0 && cm < 5000) specs.length_cm = Math.round(cm);
  }
  // Maximum load (scales, hammocks): "max 5kg", "capacity 50 kg", "5kg/1g".
  if ((m = t.match(/(?:max(?:imum)?|capacity|load|up to|weighing)\s*:?\s*(\d+(?:[.,]\d+)?)\s?(kg|g|lbs?)\b/)) || (m = t.match(/(\d+(?:[.,]\d+)?)\s?(kg)\s?\/\s?\d+(?:[.,]\d+)?\s?g\b/))) {
    const v = num(m[1]); const u = m[2];
    specs.max_load_g = u === 'kg' ? v * 1000 : u.startsWith('lb') ? Math.round(v * 453.6) : v;
  }
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s?(kg|g|lbs?)\b/))) {
    const v = num(m[1]); const u = m[2];
    const g = u === 'kg' ? v * 1000 : u.startsWith('lb') ? Math.round(v * 453.6) : v;
    if (g >= 5 && g !== specs.max_load_g) specs.weight_g = g; // "1g" / "0.1g" is a scale's precision, not a weight
  }
  if ((m = t.match(/(\d+)\s?(?:pcs|pieces|pack|piece|in 1|-in-1)\b/))) specs.count = Number(m[1]);
  if ((m = t.match(/(\d+(?:\.\d+)?)\s?(?:inch(?:es)?|")(?![a-z])/))) specs.inch = num(m[1]); // not "2 in 1"
  numeric('lumens', '\\s?(?:lumens?|lm)\\b');
  // Whole words only ("fur" is not in "furniture"); "wooden" counts as wood, plurals count.
  let mats = MATERIALS.filter(x => new RegExp(`\\b${x}(s|en)?\\b`).test(t)).map(x => (x === 'aluminium' ? 'aluminum' : x));
  if (/\bfaux\s+(\w+\s+)?fur\b/.test(t) && !mats.includes('faux fur')) mats.push('faux fur'); // "faux rabbit fur"
  if (/\b(faux|imitation|artificial)\s+(\w+\s+)?leather\b/.test(t) && !mats.includes('faux leather')) mats.push('faux leather');
  for (const [synthetic, real] of Object.entries(SYNTHETIC_OF)) if (mats.includes(synthetic)) mats = mats.filter(x => x !== real);
  if (mats.length) specs.materials = [...new Set(mats)];
  if (/\brechargeable\b|\busb charg/.test(t)) specs.rechargeable = true;
  if (/\bwaterproof\b|\bip6[5-8]\b|\bipx[4-8]\b/.test(t)) specs.waterproof = true;
  if (/\bfoldable\b|\bfolding\b|\bcollapsible\b/.test(t)) specs.foldable = true;
  if (/(?<!anti[ -]?)\bmagnetic\b|\bmagsafe\b/.test(t)) specs.magnetic = true;
  return specs;
}

// Brands we treat as "branded" (an unbranded import can never be an exact match).
export const KNOWN_BRANDS = ['kapla', 'magnimake', 'lego', 'mega bloks', 'magformers', 'playmobil', 'govee', 'insta360', 'sonifer', 'supor', 'sokany', 'raf', 'dsp', 'silver crest', 'silvercrest', 'apple', 'samsung', 'xiaomi', 'anker', 'baseus', 'ugreen', 'jbl', 'sony', 'huawei', 'oraimo', 'belkin', 'logitech',
  'philips', 'tefal', 'moulinex', 'kenwood', 'braun', 'bosch', 'black decker', 'decathlon', 'quechua', 'forclaz', 'domyos', 'kipsta', 'kalenji',
  'nike', 'adidas', 'puma', 'under armour', 'reebok', 'stanley', 'contigo', 'hydro flask', 'lego', 'mattel', 'hasbro', 'kong', 'trixie', 'ferplast',
  'joyroom', 'hoco', 'remax', 'borofone', 'lenovo', 'hp', 'dell', 'asus', 'tp link', 'tplink', 'garmin', 'amazfit', 'realme', 'oppo', 'honor', 'nokia', 'green lion', 'porodo', 'powerology', 'ldnio', 'havit', 'jsaux', 'zagg', 'mophie', 'gopro'];

KNOWN_BRANDS.push('iqos', 'iluma', 'jabra', 'harman kardon', 'bose', 'marshall', 'soundcore', 'tribit', 'edifier', 'gravastar', 'beats', 'bang olufsen', 'ultimate ears', 'skullcandy', 'sennheiser', 'dyson', 'shark', 'vax', 'karcher', 'rowenta', 'hoover', 'panasonic', 'lg', 'toshiba', 'hitachi', 'sharp', 'kiko', 'garnier', 'loreal',
  'maybelline', 'nyx', 'essence', 'revlon', 'babyliss', 'remington', 'beurer', 'fitbit', 'coleman', 'naturehike', 'petzl', 'black diamond', 'osprey',
  'thermos', 'lock lock', 'tupperware', 'oxo', 'joseph joseph', 'samsonite', 'delsey', 'american tourister', 'kipling', 'victorinox', 'intex', 'bestway', 'kenwood', 'national line');

// Store "vendor" values that are not brands (store names, placeholders).
const GENERIC_VENDORS = /^(generic|other|others|no ?brand|non ?branded|oem|odm|default|n\/?a|none|unbranded|various|misc|imported|china)$/i;

/** Brand of a local listing: a known brand in vendor/title, or a specific vendor value that is not the store itself. */
export function listingBrand(vendor, title, retailerName) {
  const known = detectBrand(vendor, title);
  if (known) return known;
  const v = normalizeText(vendor || '');
  if (!v || v.length < 2 || GENERIC_VENDORS.test(v)) return null;
  const store = normalizeText(retailerName || '');
  const storeWords = new Set(store.split(' ').filter(w => w.length > 2));
  if (v.split(' ').some(w => storeWords.has(w))) return null; // vendor is the retailer itself
  return v;
}

export function detectBrand(...texts) {
  const t = ' ' + normalizeText(texts.filter(Boolean).join(' ')) + ' ';
  return KNOWN_BRANDS.find(b => t.includes(' ' + b + ' ')) || null;
}

/** Weighted token similarity (IDF-weighted Jaccard). idf: Map token -> weight */
export function tokenSimilarity(a, b, idf) {
  const A = new Set(a); const B = new Set(b);
  let inter = 0; let uni = 0;
  for (const t of new Set([...A, ...B])) {
    const w = idf?.get(t) ?? 1;
    uni += w;
    if (A.has(t) && B.has(t)) inter += w;
  }
  return uni ? inter / uni : 0;
}

// Fashion / designer labels that appear only in a listing's vendor field (multi-brand stores such as Azadea).
export const FASHION_VENDOR = /\b(mango|zara|bershka|pull ?& ?bear|stradivarius|massimo dutti|h ?& ?m|adidas|nike|puma|intimissimi|calzedonia|tezenis|aldo|charles ?& ?keith|swarovski|accessorize|claire'?s|parfois|guess|michael kors|tommy|calvin klein|lacoste|l'?or[eé]al|garnier)\b/i;
/** True when a Lebanese listing is a branded product (by title or vendor). */
// Store own-brands sold as the budget option (Decathlon's labels): fair comparisons for a generic import.
const HOUSE_BRANDS = new Set(['decathlon', 'quechua', 'forclaz', 'domyos', 'kipsta', 'kalenji', 'nabaiji', 'tribord', 'artengo', 'kuikma', 'btwin', 'oxelo', 'outshock', 'inesis', 'newfeel', 'olaian', 'subea', 'tarmak', 'allsix', 'perfly', 'itiwit', 'rockrider', 'van rysel', 'corength', 'pongori', 'solognac', 'caperlan', 'simond', 'wedze']);
export const isBrandedListing = (title, vendor) => {
  const b = detectBrand(title, vendor);
  return (!!b && !HOUSE_BRANDS.has(String(b).toLowerCase())) || FASHION_VENDOR.test(vendor || '');
};

/**
 * True when a marketplace title lists several variants ("5 L 10 L 15 L", "2/3/5L", "3-20PCS",
 * "Single Double", "S M L"): the price shown is then only the cheapest option and is not comparable.
 */
export function isMultiOption(title) {
  const t = String(title || '').toLowerCase();
  if (/\b\d+(\s*\/\s*\d+)+\s*(pcs|pc|l|ml|m|cm|inch|ft)?\b|\b\d+\s*-\s*\d+\s*pcs\b/.test(t)) return true;
  if (/\bsingle\s*(?:&|and|\/|or)?\s*double\b|\b(s|m|l|xl)\s*\/\s*(m|l|xl|xxl)\b|\bmultiple sizes?\b|\bvarious sizes?\b/.test(t)) return true;
  // "55 65 75cm", "9\" 10\" 11\"": a list of sizes sharing one unit.
  if (/\b\d+(?:\.\d+)?(?:\s*,?\s+\d+(?:\.\d+)?){1,}\s*(cm|mm|l|ml|inch|in)\b/.test(t) || (t.match(/\b\d+(?:\.\d+)?\s*(?:"|''|”)/g) || []).length >= 2) return true;
  const byUnit = {};
  for (const m of t.matchAll(/\b(\d+(?:\.\d+)?)\s*(l|ml|cm|mm|m|ft|inch|pcs|pc|kg|g|w|mah)\b/g)) (byUnit[m[2]] ||= new Set()).add(m[1]);
  return Object.values(byUnit).some(s => s.size > 1);
}

/** Ball/racket size stated in a title ("size 5", "#4"), or null. Different sizes are different products. */
export const sizeTag = text => String(text || '').toLowerCase().match(/\bsize\s*#?\s*([1-7])\b|#\s*([1-7])\b/)?.slice(1).find(Boolean) || null;
