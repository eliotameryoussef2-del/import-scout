// "Similar item" rules for simple products priced from Lebanese shops' unbranded items (no identical
// item exists). Similar means the same kind of thing for the same use: sport socks are not winter
// socks, a faux-fur scarf is not a wool one, kids' goggles are not adult goggles.
import { extractSpecs, normalizeText, sizeTag } from './normalize.js';

// Per type: style groups. Each listing falls in the first group whose word it mentions, or in the
// "standard" group when it mentions none. Supplier item and shop item must be in the same group.
export const STYLES = {
  socks: [['sport', 'sports', 'athletic', 'running', 'training', 'cushioned', 'crew', 'gym', 'compression', 'grip', 'yoga', 'pilates', 'football', 'basketball', 'tennis', 'cycling', 'hiking'],
    ['winter', 'thermal', 'fleece', 'fuzzy', 'fluffy', 'warm', 'wool', 'slipper', 'cozy', 'christmas'], ['dress', 'business', 'formal'], ['no show', 'invisible', 'liner'], ['knee high', 'over the knee', 'thigh high']],
  scarf: [['hijab', 'shayla', 'headscarf'], ['bandana', 'neckerchief'], ['neck warmer', 'snood', 'infinity'], ['shawl', 'stole', 'pashmina']],
  swim_goggles: [['mirror', 'mirrored'], ['prescription', 'myopia'], ['racing', 'competition'], ['mask']],
  beach_towel: [['hooded', 'poncho'], ['round'], ['turkish', 'hammam'], ['sports', 'gym', 'cooling']],
  t_shirt: [['sport', 'sports', 'gym', 'running', 'dry fit', 'dri-fit', 'quick dry', 'training', 'compression'], ['polo'], ['oversized'], ['long sleeve'], ['tank', 'sleeveless', 'singlet']],
  hoodie: [['zip', 'zipper', 'zip-up'], ['oversized'], ['crop', 'cropped']],
  leggings: [['maternity'], ['fleece', 'thermal', 'winter'], ['shorts', 'biker'], ['capri', 'cropped']],
  sports_shorts: [['compression'], ['basketball'], ['football', 'soccer'], ['running']],
  backpack: [['school', 'schoolbag'], ['laptop', 'business', 'office'], ['hiking', 'trekking', 'camping', 'travel'], ['mini'], ['anti-theft', 'anti theft']],
  wallet: [['card holder', 'card case', 'cardholder'], ['long', 'clutch', 'zip around'], ['coin'], ['phone']],
  crossbody_bag: [['phone bag', 'phone pouch'], ['belt bag'], ['clear', 'transparent'], ['messenger'], ['saddle']],
  tote_bag: [['beach', 'mesh'], ['shopping', 'grocery', 'reusable'], ['laptop', 'work']],
  cosmetic_bag: [['toiletry', 'hanging', 'wash'], ['brush'], ['mini', 'small']],
  sports_bag: [['duffel', 'duffle', 'travel'], ['drawstring'], ['shoe']],
  cap_hat: [['bucket'], ['baseball', 'trucker', 'snapback', 'dad hat'], ['visor'], ['sun hat', 'straw', 'wide brim']],
  beanie: [['pom', 'pompom', 'bobble'], ['balaclava', 'ski mask'], ['with scarf', 'set']],
  knee_support: [['sleeve'], ['hinged', 'stabiliz', 'stabilis', 'brace'], ['pad', 'pads', 'guard', 'kneepad'], ['strap', 'patella']],
  pet_leash: [['retractable'], ['harness'], ['rope'], ['training', 'long line']],
  pet_brush: [['steam', 'electric', 'spray', 'vacuum'], ['glove', 'gloves', 'mitt'], ['comb'], ['slicker']],
  gym_gloves: [['half finger', 'fingerless'], ['full finger'], ['wrist wrap', 'wrist support']],
  car_phone_holder: [['magnetic', 'magnet', 'magsafe'], ['vent', 'air outlet'], ['dashboard', 'suction', 'windshield'], ['cup holder'], ['bike', 'motorcycle']],
  hair_clip: [['claw'], ['barrette', 'snap', 'bobby'], ['pearl', 'rhinestone', 'crystal'], ['scrunchie']],
  swimsuit: [['bikini', 'two piece', 'two-piece'], ['one piece', 'one-piece'], ['burkini', 'modest'], ['rash guard']],
  swim_shorts: [['board', 'boardshorts'], ['brief', 'briefs', 'jammer']],
  swim_float: [['arm band', 'armband', 'arm ring', 'water wings'], ['vest', 'jacket'], ['ring', 'tube'], ['noodle'], ['seat', 'baby float']],
  tennis_racket: [['junior', 'kids'], ['set']], padel_racket: [['carbon'], ['fiberglass', 'fibreglass']],
  table_tennis: [['set'], ['table']], badminton_racket: [['set'], ['single']],
  // A soft indoor/foam or toy ball is not a match ball.
  basketball: [['silent', 'foam', 'sponge', 'soft', 'indoor'], ['mini', 'toy', 'bath', 'kids']],
  football: [['silent', 'foam', 'sponge', 'soft', 'indoor'], ['mini', 'toy', 'kids'], ['futsal']],
  volleyball: [['beach'], ['soft', 'foam'], ['mini', 'toy']],
};

const KIDS = /\b(kids?|children|child|baby|babies|toddler|infant|junior|boys?|girls?|youth)\b/;
const WOMEN = /\b(women|womens|woman|ladies|lady|female|girls?)\b/;
const MEN = /\b(men|mens|man|male|boys?|gentlemen)\b/;
const groupOf = (type, text) => {
  const g = STYLES[type];
  if (!g) return -1;
  return g.findIndex(words => words.some(w => new RegExp(`\\b${w}`).test(text)));
};

/**
 * Is a Lebanese shop listing a fair "similar item" for this supplier item? Same style group, same
 * age group (kids vs adults), no opposite gender, and the same material when the supplier states one.
 */
export function isSimilarItem(type, supplierTitle, shopTitle, { materials = true } = {}) {
  const a = normalizeText(supplierTitle); const b = normalizeText(shopTitle);
  if (groupOf(type, a) !== groupOf(type, b)) return false;
  if (KIDS.test(a) !== KIDS.test(b)) return false;
  const aw = WOMEN.test(a) && !MEN.test(a); const am = MEN.test(a) && !WOMEN.test(a);
  const bw = WOMEN.test(b) && !MEN.test(b); const bm = MEN.test(b) && !WOMEN.test(b);
  if ((aw && bm) || (am && bw)) return false;
  const ma = extractSpecs(a).materials || []; const mb = extractSpecs(b).materials || [];
  if (materials && ma.length && !mb.some(x => ma.includes(x))) return false;
  const sa = sizeTag(supplierTitle); const sb = sizeTag(shopTitle);
  if (sa && sb && sa !== sb) return false;
  return true;
}
