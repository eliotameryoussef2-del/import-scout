// Category and product-type taxonomy. Product types are what make matching
// precise: an imported "camping lantern" is only compared with local items of
// the same type, never with anything that merely shares the word "LED".

export const CATEGORIES = {
  outdoor: 'Hiking, camping & outdoor',
  fitness: 'Sports & fitness',
  electronics: 'Electronics & gadgets',
  appliances: 'Home appliances',
  kitchen: 'Kitchen & small appliances',
  home: 'Home & household',
  furniture: 'Furniture & home accessories',
  fashion: 'Fashion, shoes & bags',
  beauty: 'Beauty & personal care',
  kids: 'Toys, kids & educational',
  auto: 'Automotive accessories',
  pets: 'Pet products',
  travel: 'Travel accessories',
  other: 'Other',
};

// type key -> { category, patterns (regex source, matched on normalised text), exclude (regex) }
export const PRODUCT_TYPES = {
  camping_lantern: { category: 'outdoor', patterns: ['camping (lantern|light|lamp)', '(led|rechargeable|camping|solar|battery|outdoor|emergency|portable|hiking|usb)[^.]{0,30}\\blanterns?\\b', '\\blanterns?\\b[^.]{0,30}(led|rechargeable|camping|solar|battery|outdoor|emergency|usb)', 'tent (light|lamp)'],
    exclude: ['decor', 'paper', 'ramadan', 'fanous', 'softbox', 'candle', 'puzzle', 'christmas', 'mousepad', 'table lamp', 'kit'] },
  headlamp: { category: 'outdoor', patterns: ['head ?lamp', 'head ?light (torch|led|running|camping)', 'head torch'], exclude: ['car', 'motorcycle', 'h4', 'h7', 'bulb'] },
  flashlight: { category: 'outdoor', patterns: ['flashlight', '\\btorch\\b'], exclude: ['head'] },
  trekking_pole: { category: 'outdoor', patterns: ['trekking pole', 'hiking (pole|stick)', 'walking pole', 'nordic walking'] },
  hammock: { category: 'outdoor', patterns: ['hammock'] },
  dry_bag: { category: 'outdoor', patterns: ['dry bag', 'waterproof (bag|sack)', 'dry sack'] },
  sleeping_bag: { category: 'outdoor', patterns: ['sleeping bag'] },
  camping_chair: { category: 'outdoor', patterns: ['camping chair', 'folding chair (camp|outdoor)', 'camp chair'] },
  tent: { category: 'outdoor', patterns: ['\\btent\\b'], exclude: ['light', 'lamp', 'peg', 'stake'] },
  yoga_mat: { category: 'fitness', patterns: ['yoga mat', 'exercise mat', 'fitness mat', 'pilates mat', 'training mat'] },
  resistance_band: { category: 'fitness', patterns: ['resistance band', 'exercise band', 'loop band', 'elastic band (fitness|training)', 'resistance tube', 'pull up band'] },
  jump_rope: { category: 'fitness', patterns: ['jump rope', 'skipping rope', 'speed rope'] },
  foam_roller: { category: 'fitness', patterns: ['foam roller', 'massage roller'] },
  gym_gloves: { category: 'fitness', patterns: ['(gym|fitness|weightlifting|training) gloves'] },
  dumbbell: { category: 'fitness', patterns: ['dumbbell'] },
  car_phone_holder: { category: 'auto', patterns: ['\\b(car|vent|dashboard)\\b.{0,20}(phone )?(holder|mount)', 'phone (holder|mount).{0,20}\\bcar\\b', 'magnetic (car )?mount'] },
  usb_cable: { category: 'electronics', patterns: ['(usb|type c|lightning|charging|data) cable', 'cable (usb|type c)'] },
  wireless_charger: { category: 'electronics', patterns: ['wireless charg'] },
  wall_charger: { category: 'electronics', patterns: ['(wall|fast|usb|gan|pd) charger', 'charger adapter', 'power adapter'], exclude: ['wireless', 'car', 'bank'] },
  power_bank: { category: 'electronics', patterns: ['power ?bank', 'portable charger'] },
  earbuds: { category: 'electronics', patterns: ['earbud', 'earphone', 'tws', 'in ear (headphone|headset)', 'wireless headset'], exclude: ['speaker'] },
  headphones: { category: 'electronics', patterns: ['headphone', 'over ear', 'on ear'], exclude: ['earbud', 'tws', 'in ear'] },
  smart_watch: { category: 'electronics', patterns: ['smart ?watch', 'fitness tracker', 'smart band'] },
  phone_tripod: { category: 'electronics', patterns: ['tripod', 'selfie stick'],
    exclude: ['pan', 'plancha', 'grill', 'over fire', 'cooking', 'projector', 'rotating table', 'easel', 'laptop', 'telescope', 'speaker stand', 'work lamp', 'work light', 'construction', 'tripod light', 'lighting studio', 'photo studio', 'light ?box', 'soft ?box', 'reflector', 'microphone', 'mic stand', 'backdrop', 'umbrella', 'phone clip', 'clip for', 'tripod mount', 'mount holder', 'tripod adapter', 'tripod head', 'quick release plate'] },
  ring_light: { category: 'electronics', patterns: ['ring light'] },
  led_strip: { category: 'home', patterns: ['led strip', 'strip light', 'light strip', 'led tape'] },
  bluetooth_speaker: { category: 'electronics', patterns: ['(bluetooth|wireless|portable) speakers?'], exclude: ['party', 'partybox', 'trolley', 'conference', 'speakerphone', 'speak 5', 'speak 7', 'soundbar', 'karaoke', 'tower'] },
  phone_case: { category: 'electronics', patterns: ['phone case', '(iphone|samsung|galaxy) case', 'back cover'] },
  water_bottle: { category: 'kitchen', patterns: ['water bottle', 'vacuum (flask|bottle)', 'insulated bottle', 'thermos', 'sports bottle', '(insulated|thermal|travel|vacuum|stainless steel) tumbler'] },
  food_storage_bag: { category: 'kitchen', patterns: ['(silicone|reusable) (food )?(storage )?bag', 'food storage bag', 'zip ?lock bag'] },
  vegetable_chopper: { category: 'kitchen', patterns: ['vegetable (chopper|cutter|slicer)', 'food chopper', 'mandoline', 'onion chopper', 'multi ?function (chopper|slicer)'] },
  kitchen_scale: { category: 'kitchen', patterns: ['kitchen scale', 'food scale', 'digital scale (kitchen|food)'] },
  lunch_box: { category: 'kitchen', patterns: ['lunch box', 'bento', 'food container'] },
  blender: { category: 'appliances', patterns: ['blender', 'smoothie maker'], exclude: ['juicer', 'juice extractor', 'citrus press'] },
  juicer: { category: 'appliances', patterns: ['juicer', 'juice extractor', 'citrus press'] },
  air_fryer: { category: 'appliances', patterns: ['air fryer'] },
  packing_cubes: { category: 'travel', patterns: ['packing cube', 'packing organi[sz]er', 'travel organi[sz]er (bag|set)', 'luggage organi[sz]er'] },
  neck_pillow: { category: 'travel', patterns: ['neck pillow', 'travel pillow'] },
  luggage_scale: { category: 'travel', patterns: ['luggage scale', 'baggage scale'] },
  pet_brush: { category: 'pets', patterns: ['(pet|dog|cat) (grooming )?(brush|comb)', 'deshedding (brush|tool|comb|glove)', 'slicker brush', 'grooming brush'], exclude: ['conditioner', 'shampoo', 'spray bottle', 'wipes', 'clipper', 'trimmer'] },
  pet_leash: { category: 'pets', patterns: ['(dog|pet) (leash|lead)', 'retractable leash', '\\bleash\\b'], exclude: ['bodyboard', 'surf', '\\bboard\\b', 'paddle', 'kayak', 'wrist', 'ankle'] },
  pet_bowl: { category: 'pets', patterns: ['(slow )?feeder bowl', '(dog|cat|pet) bowl', 'slow feeder'] },
  cat_toy: { category: 'pets', patterns: ['cat toy', 'cat teaser', 'cat wand', 'catnip'] },
  building_blocks: { category: 'kids', patterns: ['building block', 'building brick', 'construction (toy|set)', 'magnetic tiles'] },
  makeup_brush: { category: 'beauty', patterns: ['makeup brush', 'make up brush', 'cosmetic brush', 'brush set (makeup|foundation)'] },
  hair_clip: { category: 'beauty', patterns: ['(hair )?claw clips?\\b', 'hair clips?\\b', 'hair clamps?\\b'], exclude: ['clipper', 'trimmer'] },
  car_vacuum: { category: 'auto', patterns: ['\\b(car|handheld|portable|cordless) vacuum', 'vacuum cleaner (car|handheld|portable)\\b'] },
  car_organizer: { category: 'auto', patterns: ['\\b(car|seat|trunk|back ?seat) organi[sz]er'] },

  // Swimming & beach
  swim_goggles: { category: 'fitness', patterns: ['swim(ming)? goggles?', '\\bgoggles?\\b'], exclude: ['ski', 'snow', 'safety', 'motor', 'welding', '\\bvr\\b', 'lab', 'tactical', 'ballistic', 'shooting', 'military', 'airsoft', 'night vision'] },
  swim_cap: { category: 'fitness', patterns: ['swim(ming)? caps?', 'bathing caps?'] },
  swim_fins: { category: 'fitness', patterns: ['swim(ming)? fins', 'diving fins', 'snorkel(ing)? fins', '\\bflippers\\b'], exclude: ['fishing', 'surfboard'] },
  snorkel_mask: { category: 'fitness', patterns: ['snorkel', 'diving mask', 'dive mask', 'swim(ming)? mask'] },
  kickboard: { category: 'fitness', patterns: ['kick ?boards?'], exclude: ['skate', 'scooter'] },
  swim_float: { category: 'fitness', patterns: ['arm ?bands?', 'water wings', 'swim(ming)? (ring|float|vest|belt|noodle|trainer)', 'pool (float|noodle|ring)', 'inflatable (ring|float|swim)', 'swim ring'], exclude: ['watch', 'fitness band', 'smart'] },
  swimsuit: { category: 'fashion', patterns: ['swim ?suit', 'swimwear', 'bathing suit', 'bikini', 'one[- ]piece swim', 'swim(ming)? costume', 'burkini', 'rash guard'], exclude: ['dress', 'cover ?up', 'kaftan', 'sarong', 'pareo'] },
  swim_shorts: { category: 'fashion', patterns: ['swim(ming)? (shorts|trunks|briefs|jammer)', 'board ?shorts', 'swim trunks'] },
  beach_towel: { category: 'fitness', patterns: ['beach towel', 'pool towel', 'microfib(er|re) towel', 'sports? towel', 'quick[- ]dry(ing)? towel', 'gym towel'] },
  // Sports equipment
  football: { category: 'fitness', patterns: ['soccer ball', 'football\\b'], exclude: ['table football', 'foosball', 'jersey', 'shirt', 'shoes', 'boots', 'socks', 'shin', 'gloves', '\\bgoal\\b', 'pump', '\\bnet\\b', 'shorts', 'game', 'card', 'sticker', 'american', 'vests?', 'bibs?', 'uniform', '\bkit\b', 'cones?', '\bbag\b', 'training vest'] },
  basketball: { category: 'fitness', patterns: ['basket ?ball\\b'], exclude: ['hoop', 'jersey', 'shirt', 'shoes', 'shorts', 'socks', 'board', '\\bnet\\b', 'arcade', 'stand', 'game', 'card'] },
  volleyball: { category: 'fitness', patterns: ['volley ?ball\\b'], exclude: ['\\bnet\\b', 'shoes', 'knee', 'shirt', 'shorts', 'set with net'] },
  tennis_ball: { category: 'fitness', patterns: ['tennis balls?'], exclude: ['racket', 'racquet', 'machine', 'launcher', 'dog'] },
  tennis_racket: { category: 'fitness', patterns: ['tennis (racket|racquet)s?'], exclude: ['\\bbag\\b', 'string', 'grip', 'cover', 'table', 'dampener'] },
  padel_racket: { category: 'fitness', patterns: ['padel (racket|racquet|bat)s?', 'paddle tennis (racket|racquet)'], exclude: ['\\bbag\\b', 'cover', 'grip', 'protector'] },
  padel_ball: { category: 'fitness', patterns: ['padel balls?'] },
  badminton_racket: { category: 'fitness', patterns: ['badminton (racket|racquet|set)s?'], exclude: ['\\bbag\\b', 'string', 'grip'] },
  shuttlecock: { category: 'fitness', patterns: ['shuttle ?cocks?', 'badminton (birdies|shuttles)'] },
  table_tennis: { category: 'fitness', patterns: ['table tennis (racket|racquet|bat|paddle|set)s?', 'ping ?pong (paddle|bat|racket|set)s?'], exclude: ['table\\b(?! tennis)'] },
  boxing_gloves: { category: 'fitness', patterns: ['boxing gloves?', 'kick ?boxing gloves?', 'mma gloves?', 'sparring gloves?'] },
  kettlebell: { category: 'fitness', patterns: ['kettle ?bells?'] },
  ab_roller: { category: 'fitness', patterns: ['ab (roller|wheel)s?', 'abdominal (roller|wheel)s?', 'ab roller wheel'] },
  yoga_block: { category: 'fitness', patterns: ['yoga (block|brick)s?'] },
  exercise_ball: { category: 'fitness', patterns: ['(gym|exercise|yoga|swiss|stability|fitness|pilates|balance) ball'], exclude: ['mini', 'massage', 'stress'] },
  knee_support: { category: 'fitness', patterns: ['knee (support|brace|sleeve|pads?|strap|guard)s?'], exclude: ['\bdog\b', '\bpet\b', 'horse', 'hock'] },
  sports_bag: { category: 'fashion', patterns: ['(gym|sports?|duff(e|le)l|training|football) bag'], exclude: ['back ?pack', 'shoe bag'] },
  cycling_helmet: { category: 'fitness', patterns: ['(bike|bicycle|cycling|skate|skateboard|scooter|roller) helmet'] },
  // Bags
  backpack: { category: 'fashion', patterns: ['back ?pack', 'rucksack', 'school ?bag'], exclude: ['carrier', 'cooler', 'hydration', 'vacuum', 'sprayer', 'blower', 'insert', 'organizer for', 'keychain'] },
  tote_bag: { category: 'fashion', patterns: ['tote( bag)?\\b'] },
  crossbody_bag: { category: 'fashion', patterns: ['cross ?body', 'shoulder bag', 'sling bag', 'messenger bag', 'mini bag', 'phone bag'] },
  waist_bag: { category: 'fashion', patterns: ['waist bag', 'belt bag', 'fanny pack', 'bum bag', 'running belt', 'waist pack'] },
  wallet: { category: 'fashion', patterns: ['wallet', 'purse', 'card ?holder', 'coin purse'], exclude: ['phone case', 'case for', 'for iphone', 'for samsung', 'magsafe'] },
  cosmetic_bag: { category: 'beauty', patterns: ['(makeup|make-up|cosmetic|toiletry|wash) (bag|pouch|case|organi[sz]er)s?', 'travel pouch'] },
  laptop_sleeve: { category: 'electronics', patterns: ['laptop (sleeve|bag|case)s?', 'notebook sleeve', 'macbook (sleeve|bag)'] },
  // Clothing (simple, unbranded basics)
  t_shirt: { category: 'fashion', patterns: ['t-? ?shirts?', '\\btees?\\b'], exclude: ['dress', 'pajama', 'pyjama'] },
  hoodie: { category: 'fashion', patterns: ['hoodies?', 'hooded sweatshirt', 'sweatshirts?'] },
  leggings: { category: 'fashion', patterns: ['leggings?', 'yoga pants', 'sports? tights', 'running tights'] },
  sports_bra: { category: 'fashion', patterns: ['sports? bras?'] },
  socks: { category: 'fashion', patterns: ['\\bsocks?\\b'], exclude: ['puppet', 'shoes', 'slipper'] },
  cap_hat: { category: 'fashion', patterns: ['baseball caps?', 'trucker caps?', 'snapbacks?', 'bucket hats?', 'sun hats?', 'visor caps?', 'sports? caps?', 'dad hats?', 'peaked caps?', 'running caps?'], exclude: ['swim'] },
  beanie: { category: 'fashion', patterns: ['beanies?', 'knit(ted)? hats?', 'winter hats?'] },
  scarf: { category: 'fashion', patterns: ['scarf', 'scarves', 'shawls?', 'neck warmers?'] },
  sports_shorts: { category: 'fashion', patterns: ['(running|gym|sports?|training|basketball|football) shorts'], exclude: ['swim', 'board'] },
};

// Default HS classification per product type (our classification judgement —
// the duty rate itself comes from the official Lebanese tariff). Override per
// product once a customs broker confirms the code.
export const TYPE_HS = {
  camping_lantern: '8513.10', headlamp: '8513.10', flashlight: '8513.10', trekking_pole: '6602.00', hammock: '6307.90',
  dry_bag: '4202.92', sleeping_bag: '9404.30', camping_chair: '9401.71', tent: '6306.22', yoga_mat: '9506.91',
  resistance_band: '9506.91', jump_rope: '9506.91', foam_roller: '9506.91', gym_gloves: '6116.10', dumbbell: '9506.91',
  car_phone_holder: '3926.90.90', usb_cable: '8544.42.90', wireless_charger: '8504.40', wall_charger: '8504.40', power_bank: '8507.60',
  earbuds: '8518.30', headphones: '8518.30', smart_watch: '8517.62.90', phone_tripod: '9620.00', ring_light: '9405.40',
  led_strip: '9405.40', bluetooth_speaker: '8518.22', phone_case: '3926.90.90', water_bottle: '9617.00', food_storage_bag: '3924.10.90',
  vegetable_chopper: '8210.00', kitchen_scale: '8423.10', lunch_box: '3924.10.90', blender: '8509.40', juicer: '8509.40', air_fryer: '8516.60',
  packing_cubes: '4202.92', neck_pillow: '9404.90.90', luggage_scale: '8423.81', pet_brush: '9603.29', pet_leash: '4201.00',
  pet_bowl: '3924.90', cat_toy: '4201.00', building_blocks: '9503.00', makeup_brush: '9603.30', hair_clip: '9615.11',
  car_vacuum: '8508.11', car_organizer: '4202.92',
  swim_goggles: '9004.90', swim_cap: '6505.00', swim_fins: '9506.29', snorkel_mask: '9506.29', kickboard: '9506.29', swim_float: '9506.29',
  swimsuit: '6112.41', swim_shorts: '6112.31', beach_towel: '6302.60', football: '9506.62', basketball: '9506.62', volleyball: '9506.62',
  tennis_ball: '9506.61', tennis_racket: '9506.51', padel_racket: '9506.59', padel_ball: '9506.69', badminton_racket: '9506.59', shuttlecock: '9506.99',
  table_tennis: '9506.40', boxing_gloves: '9506.99', kettlebell: '9506.91', ab_roller: '9506.91', yoga_block: '9506.91', exercise_ball: '9506.91',
  knee_support: '6307.90', sports_bag: '4202.92', cycling_helmet: '6506.10', backpack: '4202.92', tote_bag: '4202.22', crossbody_bag: '4202.22',
  waist_bag: '4202.92', wallet: '4202.31', cosmetic_bag: '4202.92', laptop_sleeve: '4202.12', t_shirt: '6109.10', hoodie: '6110.20',
  leggings: '6104.63', sports_bra: '6212.10', socks: '6115.95', cap_hat: '6505.00', beanie: '6505.00', scarf: '6117.10', sports_shorts: '6103.43',
};

// Key specs that define "the same product" for each type. Two listings are the same
// product only if these agree (and, where features matter, the same feature set).
export const KEY_SPECS = {
  bluetooth_speaker: { numeric: ['power_w', 'battery_mah', 'bt_version'], features: true },
  camping_lantern: { numeric: ['lumens', 'battery_mah'], features: true },
  headlamp: { numeric: ['lumens', 'battery_mah'], features: true },
  flashlight: { numeric: ['lumens', 'battery_mah'], features: true },
  power_bank: { numeric: ['battery_mah', 'power_w'], features: true },
  // forms: mutually exclusive variants; both listings must be the same variant.
  wireless_charger: { numeric: ['power_w', 'count'], features: true, forms: [['car', 'vent', 'dashboard'], ['lamp', 'light'], ['clock'], ['power bank'], ['stand', 'dock', 'holder'], ['pad', 'mat']] },
  wall_charger: { numeric: ['power_w', 'ports'] },
  usb_cable: { numeric: ['length_cm', 'power_w'], features: true, forms: [['5-in-1', '5 in 1', '4-in-1', '4 in 1', '3-in-1', '3 in 1', 'multi'], ['lightning'], ['micro usb', 'micro-usb'], ['c to c', 'usb-c to usb-c', 'type-c to type-c', 'type c to type c', 'c-to-c']] },
  earbuds: { numeric: ['battery_mah', 'bt_version'], features: true },
  headphones: { numeric: ['battery_mah', 'bt_version'], features: true },
  smart_watch: { numeric: ['inch', 'battery_mah'], features: true },
  car_vacuum: { numeric: ['power_w', 'battery_mah'], features: true },
  blender: { numeric: ['power_w', 'capacity_ml'], forms: [['portable', 'personal', 'bullet', 'cup', 'bottle'], ['hand', 'stick', 'immersion'], ['jug', 'jar', 'countertop', 'stand']] },
  juicer: { numeric: ['power_w', 'capacity_ml'], forms: [['citrus', 'press'], ['extractor', 'centrifugal'], ['slow', 'masticating', 'cold press']] },
  air_fryer: { numeric: ['power_w', 'capacity_ml'] },
  yoga_mat: { numeric: ['thickness_mm', 'dims_cm'], materials: true },
  foam_roller: { numeric: ['length_cm', 'dims_cm'] },
  // formsOptional: no variant word = the plain/standard version, so "shaker" vs plain bottle is a mismatch.
  water_bottle: { numeric: ['capacity_ml'], materials: true, features: true, forms: [['shaker'], ['sippy', 'kids', 'children', 'child', 'baby', 'toddler', 'cartoon'], ['tumbler', 'cup', 'mug'], ['collapsible', 'foldable']], formsOptional: true },
  lunch_box: { numeric: ['capacity_ml'], materials: true },
  food_storage_bag: { numeric: ['capacity_ml', 'count'] },
  trekking_pole: { numeric: ['length_cm'], materials: true },
  // A stick, a tripod and a light stand of the same length are different products: the kind must be stated and equal.
  phone_tripod: { numeric: ['length_cm'], features: true, forms: [['selfie stick', 'selfie'], ['ring light'], ['light stand'], ['monopod'], ['tripod']], formsRequired: true },
  led_strip: { numeric: ['length_cm'], features: true, forms: [['smart', 'wifi', 'wi-fi', 'app control', 'bluetooth'], ['cob'], ['neon']], formsOptional: true },
  kitchen_scale: { numeric: ['max_load_g'] },
  luggage_scale: { numeric: ['max_load_g'] },
  resistance_band: { numeric: ['count'] },
  jump_rope: { numeric: ['length_cm'] },
  vegetable_chopper: { numeric: ['count'] },
  packing_cubes: { numeric: ['count'] },
  // Piece count alone says nothing: wooden planks (Kapla), plastic bricks, magnetic tiles and stacking stones differ.
  building_blocks: { numeric: ['count'], materials: true, forms: [['magnetic', 'magnet'], ['plank', 'planks', 'kapla'], ['stacking', 'stones', 'stone'], ['gear', 'gears'], ['brick', 'bricks', 'lego', 'moc', 'micro', 'diamond', 'particle', 'particles']], formsRequired: true, brandDefines: true },
  makeup_brush: { numeric: ['count'] },
  kettlebell: { numeric: ['weight_g'], materials: true },
  exercise_ball: { numeric: ['length_cm'] },
  default: { numeric: ['capacity_ml', 'battery_mah', 'power_w', 'thickness_mm', 'length_cm', 'count', 'lumens', 'dims_cm'] },
};

const compiled = Object.entries(PRODUCT_TYPES).map(([key, t]) => ({
  key, category: t.category,
  patterns: t.patterns.map(p => new RegExp(p, 'i')),
  exclude: (t.exclude || []).map(p => new RegExp(p, 'i')),
}));

// Words that mark a listing as an accessory/part *for* a product rather than the product
// itself ("headphone splitter cable", "air fryer liner", "tent peg").
const ACCESSORY = /\b(cables?|cords?|adapters?|splitters?|straps?|replacement|spare|liners?|housing|parts?|refills?|batteries|battery for|pegs?|stakes?|guylines?|ferrules?|trays?|baskets?|kit|bands? for|case for|cover for|holder for|mount for|for (iphone|samsung|galaxy|airpods|apple watch|mi band))\b/g;

/** Detect product types in normalised text. Returns array of type keys, best (earliest/longest) first. */
export function detectTypes(text) {
  const hits = [];
  const accessoryWords = [...text.matchAll(ACCESSORY)].map(m => ({ w: m[0], i: m.index }));
  for (const t of compiled) {
    let best = null;
    for (const re of t.patterns) {
      const m = text.match(re);
      if (m && (!best || m[0].length > best.len)) best = { len: m[0].length, idx: m.index };
    }
    if (!best || t.exclude.some(re => re.test(text))) continue;
    // An accessory word outside the matched product phrase means this is an accessory for it.
    const outside = accessoryWords.filter(a => a.i < best.idx || a.i >= best.idx + best.len);
    if (outside.length) continue;
    hits.push({ key: t.key, ...best });
  }
  hits.sort((a, b) => b.len - a.len || a.idx - b.idx);
  return hits.map(h => h.key);
}

export function typeCategory(typeKey) { return PRODUCT_TYPES[typeKey]?.category || null; }

// Keyword fallback for category inference when no product type matches.
const CATEGORY_HINTS = {
  outdoor: ['camping', 'hiking', 'trekking', 'outdoor', 'tent', 'backpack'],
  fitness: ['fitness', 'gym', 'yoga', 'workout', 'training', 'running', 'sport'],
  electronics: ['bluetooth', 'usb', 'charger', 'wireless', 'phone', 'laptop', 'headphone', 'gaming'],
  appliances: ['fridge', 'washing machine', 'oven', 'microwave', 'air conditioner', 'heater', 'vacuum cleaner'],
  kitchen: ['kitchen', 'cookware', 'pan', 'pot', 'knife', 'cup', 'mug', 'bottle'],
  home: ['home', 'storage', 'organizer', 'cleaning', 'bathroom', 'towel'],
  furniture: ['sofa', 'chair', 'table', 'desk', 'shelf', 'cabinet', 'bed'],
  fashion: ['shirt', 'dress', 'jeans', 'shoe', 'sneaker', 'bag', 'wallet', 'jacket'],
  beauty: ['makeup', 'skin', 'hair', 'cosmetic', 'nail', 'perfume'],
  kids: ['kids', 'baby', 'toy', 'children', 'lego', 'puzzle'],
  auto: ['car', 'vehicle', 'auto', 'motorcycle'],
  pets: ['dog', 'cat', 'pet', 'puppy', 'kitten'],
  travel: ['travel', 'luggage', 'suitcase', 'passport'],
};

export function inferCategory(text) {
  const types = detectTypes(text);
  if (types.length) return { category: typeCategory(types[0]), type: types[0] };
  let best = { category: 'other', n: 0 };
  for (const [cat, words] of Object.entries(CATEGORY_HINTS)) {
    const n = words.filter(w => text.includes(w)).length;
    if (n > best.n) best = { category: cat, n };
  }
  return { category: best.category, type: null };
}

// Simple, interchangeable items with no technical spec that changes what they are (a hair clip is
// a hair clip). Only for these may a selling price be ESTIMATED from similar unbranded items in
// Lebanese stores when no identical listing exists. Anything with power, capacity, size or
// features that matter stays exact-match only.
export const SIMILAR_PRICING_TYPES = new Set([
  'hair_clip', 'car_phone_holder', 'car_organizer', 'pet_bowl', 'pet_brush', 'pet_leash', 'cat_toy', 'neck_pillow',
  'dry_bag', 'hammock', 'jump_rope', 'makeup_brush', 'food_storage_bag', 'packing_cubes', 'phone_case', 'gym_gloves',
  // Swimming, sports, bags and clothing basics (added 2026-10-28): priced from similar unbranded items of the same
  // kind, pack size and (for balls) ball size; kettlebells and exercise balls need their weight/size to match exactly.
  'swim_goggles', 'swim_cap', 'swim_fins', 'snorkel_mask', 'kickboard', 'swim_float', 'swimsuit', 'swim_shorts', 'beach_towel',
  'football', 'basketball', 'volleyball', 'tennis_ball', 'tennis_racket', 'padel_racket', 'padel_ball', 'badminton_racket', 'shuttlecock',
  'table_tennis', 'boxing_gloves', 'ab_roller', 'yoga_block', 'knee_support', 'sports_bag', 'cycling_helmet',
  'backpack', 'tote_bag', 'crossbody_bag', 'waist_bag', 'wallet', 'cosmetic_bag', 'laptop_sleeve',
  't_shirt', 'hoodie', 'leggings', 'sports_bra', 'socks', 'cap_hat', 'beanie', 'scarf', 'sports_shorts',
]);

// Shopper-friendly "kind of object" groups for filtering (what the item is, not where it is used).
export const KINDS = {
  appliances: { label: 'Appliances', types: ['blender', 'juicer', 'air_fryer', 'car_vacuum'] },
  kitchen: { label: 'Kitchen tools', types: ['water_bottle', 'food_storage_bag', 'vegetable_chopper', 'kitchen_scale', 'lunch_box'] },
  electronics: { label: 'Electronics & gadgets', types: ['usb_cable', 'wireless_charger', 'wall_charger', 'power_bank', 'earbuds', 'headphones', 'smart_watch', 'phone_tripod', 'ring_light', 'bluetooth_speaker', 'led_strip'] },
  accessories: { label: 'Phone & car accessories', types: ['phone_case', 'car_phone_holder', 'car_organizer'] },
  fitness: { label: 'Sports & fitness', types: ['yoga_mat', 'resistance_band', 'jump_rope', 'foam_roller', 'gym_gloves', 'dumbbell'] },
  outdoor: { label: 'Outdoor & camping', types: ['camping_lantern', 'headlamp', 'flashlight', 'trekking_pole', 'hammock', 'dry_bag', 'sleeping_bag', 'camping_chair', 'tent'] },
  travel: { label: 'Travel', types: ['packing_cubes', 'neck_pillow', 'luggage_scale'] },
  pets: { label: 'Pets', types: ['pet_brush', 'pet_leash', 'pet_bowl', 'cat_toy'] },
  beauty: { label: 'Beauty & hair', types: ['makeup_brush', 'hair_clip'] },
  toys: { label: 'Toys & games', types: ['building_blocks'] },
  swimming: { label: 'Swimming & beach', types: ['swim_goggles', 'swim_cap', 'swim_fins', 'snorkel_mask', 'kickboard', 'swim_float', 'swimsuit', 'swim_shorts', 'beach_towel'] },
  sports: { label: 'Sports equipment', types: ['football', 'basketball', 'volleyball', 'tennis_ball', 'tennis_racket', 'padel_racket', 'padel_ball', 'badminton_racket', 'shuttlecock', 'table_tennis', 'boxing_gloves', 'kettlebell', 'ab_roller', 'yoga_block', 'exercise_ball', 'knee_support', 'cycling_helmet'] },
  bags: { label: 'Bags & wallets', types: ['backpack', 'tote_bag', 'crossbody_bag', 'waist_bag', 'wallet', 'cosmetic_bag', 'laptop_sleeve', 'sports_bag'] },
  clothing: { label: 'Clothing', types: ['t_shirt', 'hoodie', 'leggings', 'sports_bra', 'socks', 'cap_hat', 'beanie', 'scarf', 'sports_shorts'] },
};
export const kindOf = type => Object.keys(KINDS).find(k => KINDS[k].types.includes(type)) || 'other';
