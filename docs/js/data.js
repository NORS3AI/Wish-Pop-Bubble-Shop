/* ==========================================================================
 * Wish Pop: Bubble Shop — GAME DATA
 * All numbers/tables live here so design can be tuned without touching logic.
 * (v3 Cauldron-First: ingredients come from popping bubbles; no shop/charms.)
 * ======================================================================== */

/* --- 1. Magic Types (12) — each with a color --------------------------- */
const MAGIC = {
  Love:       "#ff6ea8",
  Courage:    "#ff8b3d",
  Luck:       "#4fc96a",
  Sleep:      "#6a7bd6",
  Energy:     "#ffd23f",
  Calm:       "#6fd0e0",
  Strength:   "#d1495b",
  Beauty:     "#e07be0",
  Protection: "#5c8fd6",
  Light:      "#ffe98a",
  Growth:     "#7bc86b",
  Mischief:   "#9b6bd6",
};
const MAGIC_TYPES = Object.keys(MAGIC);
/* Villain magics — a DARK, never-before-seen set used ONLY by villain events
 * (the Evil Queen's cursed pantry). They get colors so their bars/dots render,
 * but they are deliberately kept OUT of MAGIC_TYPES so they never appear as a
 * normal customer's allergy or in the Fairy's basket game. "Poison" is the
 * hazard quality — any trace of it taints the brew. */
const VILLAIN_MAGIC = {
  Dread:  "#6d5a8c",
  Malice: "#b5334d",
  Shadow: "#5b5580",
  Rot:    "#8a7d3a",
  Curse:  "#8e44ad",
  Frost:  "#4aa8c9",
  Poison: "#8fd14f",
};
/* Courtyard magics — a REGAL set used only in King's Courtyard. Like the villain
 * magics, they get colors so bars/dots render, but stay OUT of MAGIC_TYPES so they
 * never leak into other realms' allergies or the base Fairy game. Each realm can
 * bring its own magic universe this way. */
const COURT_MAGIC = {
  Valor:    "#c0392b",
  Majesty:  "#7b2fbf",
  Wisdom:   "#2f6fb0",
  Glamour:  "#e0559b",
  Mirth:    "#f39c12",
  Honor:    "#5f7d9a",
  Fortune:  "#d4a017",
  Cunning:  "#6c5ce7",
  Radiance: "#ffd75e",
  Serenity: "#2fb3a0",
};
const COURT_MAGIC_TYPES = Object.keys(COURT_MAGIC);
const MAGIC_ALL = Object.assign({}, MAGIC, VILLAIN_MAGIC, COURT_MAGIC); // colors for ALL sets (rendering)

/* --- 2. Ingredient library (20) ----------------------------------------
 * qualities[0] = the ONE magic quality shown to the player (its identity).
 * qualities[1..] = HIDDEN secondary magics, revealed only by the cauldron bars
 * (or a Peek/Insight charm). Every magic type is the MAIN quality of >=1
 * ingredient so a biased hand can always be assembled.
 * BALANCE: the 12 magics are spread evenly — each is a hidden quality exactly
 * twice, so every magic totals 3–4 appearances (no over/under-represented magic),
 * and no two ingredients share the same magic set. Fronts are fixed; only the
 * hidden magics are tuned. Keep it this way so learned knowledge stays true.
 * ---------------------------------------------------------------------- */
const INGREDIENTS = [
  { id: "honey",       name: "Honey",       qualities: ["Love", "Calm"],                emoji: "🍯" },
  { id: "berries",     name: "Berries",     qualities: ["Love", "Energy"],              emoji: "🫐" },
  { id: "rose_jam",    name: "Rose Jam",    qualities: ["Beauty", "Love"],              emoji: "🌹" },
  { id: "pearl_sugar", name: "Pearl Sugar", qualities: ["Beauty", "Calm", "Sleep"],     emoji: "⚪" },
  { id: "moon_drop",   name: "Moon Drop",   qualities: ["Sleep", "Beauty"],             emoji: "🌙" },
  { id: "mushroom_cap",name: "Mushroom Cap",qualities: ["Sleep", "Growth"],             emoji: "🍄" },
  { id: "star_candy",  name: "Star Candy",  qualities: ["Luck", "Beauty"],              emoji: "🍬" },
  { id: "rainbow_drop",name: "Rainbow Drop",qualities: ["Luck", "Love", "Mischief"],    emoji: "🌈" },
  { id: "sun_petal",   name: "Sun Petal",   qualities: ["Light", "Courage"],            emoji: "🌻" },
  { id: "glow_gem",    name: "Glow Gem",    qualities: ["Light", "Protection", "Energy"], emoji: "💎" },
  { id: "iron_oats",   name: "Iron Oats",   qualities: ["Strength", "Growth"],          emoji: "🌰" },
  { id: "bull_horn",   name: "Bull Horn",   qualities: ["Strength", "Courage"],         emoji: "🐂" },
  { id: "dragon_pepper",name:"Dragon Pepper",qualities:["Courage", "Strength", "Mischief"],emoji: "🌶️" },
  { id: "cinnamon",    name: "Cinnamon",    qualities: ["Energy", "Luck"],              emoji: "🟤" },
  { id: "ginger_root", name: "Ginger Root", qualities: ["Energy", "Strength"],          emoji: "🫚" },
  { id: "lavender",    name: "Lavender",    qualities: ["Calm", "Sleep"],               emoji: "🪻" },
  { id: "moss_bloom",  name: "Moss Bloom",  qualities: ["Growth", "Protection"],        emoji: "🌿" },
  { id: "shimmer_salt",name: "Shimmer Salt",qualities: ["Protection", "Light"],         emoji: "🧂" },
  { id: "crow_feather",name: "Crow Feather",qualities: ["Mischief", "Light"],           emoji: "🪶" },
  { id: "frog_tear",   name: "Frog Tear",   qualities: ["Mischief", "Luck"],            emoji: "💧" },
];
const INGREDIENT_BY_ID = {};
INGREDIENTS.forEach(i => INGREDIENT_BY_ID[i.id] = i);
/* --- Villain ingredients — used ONLY in villain events (Evil Queen ransom).
 * Registered in INGREDIENT_BY_ID so the scorer resolves them, but kept OUT of
 * the normal INGREDIENTS pool so they never appear in regular rounds. Their
 * magics are hidden — the player learns them by brewing. -------------------- */
// Base magics are all "need" magics (never Poison). Poison is added at random as a
// HIDDEN quality to a subset of these each event (see assignQueenPoison in ui.js),
// so which ingredients are poisonous changes every time — never a primary quality.
const QUEEN_INGREDIENTS = [
  { id: "q_spidersilk", name: "Spider Silk",   qualities: ["Shadow", "Dread"],   emoji: "🕸️" },
  { id: "q_venomfang",  name: "Venom Fang",    qualities: ["Malice", "Dread"],   emoji: "🐍" },
  { id: "q_batwing",    name: "Bat Wing",      qualities: ["Dread", "Shadow"],   emoji: "🦇" },
  { id: "q_scorpsting", name: "Scorpion Sting",qualities: ["Rot", "Malice"],     emoji: "🦂" },
  { id: "q_gravemoss",  name: "Grave Moss",    qualities: ["Rot", "Curse"],      emoji: "🪳" },
  { id: "q_evileye",    name: "Evil Eye",      qualities: ["Curse", "Malice"],   emoji: "🧿" },
  { id: "q_boneash",    name: "Bone Ash",      qualities: ["Frost", "Dread"],    emoji: "💀" },
  { id: "q_witherroot", name: "Wither Root",   qualities: ["Malice", "Frost"],   emoji: "🐀" },
  { id: "q_hexcrystal", name: "Hex Crystal",   qualities: ["Shadow", "Curse"],   emoji: "🔮" },
  { id: "q_creepvine",  name: "Creep Vine",    qualities: ["Frost", "Rot"],      emoji: "🕷️" },
];
QUEEN_INGREDIENTS.forEach(i => { i.baseQualities = i.qualities.slice(); INGREDIENT_BY_ID[i.id] = i; });
/* --- Infused ingredients — a normal ingredient with a built-in charm-like effect
 * that fires when you drop it in the cauldron (no charm slot needed). The MECHANIC
 * stays constant across realms; only the name/art get reskinned per realm.
 *   infused: "potentNext" — your NEXT added ingredient counts double (like Potent charm)
 *   infused: "lockBar"    — locks the need bar it fills so it can't overfill/curdle
 * flex:true → its magic is RANDOMIZED to one of the round's needs when collected (per
 * instance, on GAME state), so it's always useful and works in every realm. -------- */
const INFUSED_INGREDIENTS = [
  { id: "dragon_egg", name: "Dragon Egg", qualities: ["Courage", "Strength"],  emoji: "🥚", infused: "potentNext", flex: true },
  { id: "frost_gem",  name: "Frost Gem",  qualities: ["Calm", "Protection"],   emoji: "❄️", infused: "lockBar",    flex: true },
];
// King's Courtyard reskins (same effects, royal flavor). Golden Goose Egg is saved for Beanstalk Bank.
const COURT_INFUSED = [
  { id: "kc_griffin_egg", name: "Griffin Egg", qualities: ["Valor", "Majesty"], emoji: "🪺", infused: "potentNext", flex: true },
  { id: "kc_royal_seal",  name: "Royal Seal",  qualities: ["Honor", "Wisdom"],  emoji: "🔒", infused: "lockBar",    flex: true },
];
COURT_INFUSED.forEach(i => INGREDIENT_BY_ID[i.id] = i);
INFUSED_INGREDIENTS.forEach(i => INGREDIENT_BY_ID[i.id] = i);
/* --- King's Courtyard pantry — the realm's own ingredients (regular 12 magics,
 * all-new royal/feast icons never used elsewhere). Covers every magic so any wish
 * is solvable. Registered in INGREDIENT_BY_ID; the realm swaps to this set. -------- */
const COURTYARD_INGREDIENTS = [
  { id: "kc_goblet_wine",  name: "Goblet Wine",      qualities: ["Mirth", "Serenity"],    emoji: "🍷" },
  { id: "kc_royal_decree", name: "Royal Decree",     qualities: ["Majesty", "Wisdom"],    emoji: "📜" },
  { id: "kc_beeswax",      name: "Beeswax Candle",    qualities: ["Radiance", "Serenity"], emoji: "🕯️" },
  { id: "kc_royal_lily",   name: "Royal Lily",        qualities: ["Glamour", "Majesty"],   emoji: "⚜️" },
  { id: "kc_herald_brass", name: "Herald's Brass",    qualities: ["Valor", "Radiance"],    emoji: "🎺" },
  { id: "kc_amphora",      name: "Sealed Amphora",    qualities: ["Honor", "Wisdom"],      emoji: "🏺" },
  { id: "kc_cherries",     name: "Sugared Cherries",  qualities: ["Fortune", "Glamour"],   emoji: "🍒" },
  { id: "kc_grapes",       name: "Vineyard Grapes",   qualities: ["Mirth", "Fortune"],     emoji: "🍇" },
  { id: "kc_castle_olive", name: "Castle Olive",      qualities: ["Wisdom", "Valor"],      emoji: "🫒" },
  { id: "kc_onyx_pawn",    name: "Onyx Pawn",         qualities: ["Cunning", "Valor"],     emoji: "♟️" },
  { id: "kc_aged_cheese",  name: "Aged Cheese",       qualities: ["Honor", "Fortune"],     emoji: "🧀" },
  { id: "kc_pungent_bulb", name: "Pungent Bulb",      qualities: ["Valor", "Honor"],       emoji: "🧅" },
  { id: "kc_toast_fizz",   name: "Toast Fizz",        qualities: ["Radiance", "Mirth"],    emoji: "🥂" },
  { id: "kc_peacock",      name: "Peacock Plume",     qualities: ["Glamour", "Cunning"],   emoji: "🦚" },
  { id: "kc_regal_tea",    name: "Regal Tea",         qualities: ["Majesty", "Serenity"],  emoji: "🫖" },
  { id: "kc_court_wand",   name: "Court Wand",        qualities: ["Cunning", "Radiance"],  emoji: "🪄" },
  { id: "kc_white_dove",   name: "White Dove",        qualities: ["Wisdom", "Honor"],      emoji: "🕊️" },
  { id: "kc_blackbird_pie",name: "Blackbird Pie",     qualities: ["Serenity", "Mirth"],    emoji: "🥧" },
  { id: "kc_silk_rosette", name: "Silk Rosette",      qualities: ["Serenity", "Glamour"],  emoji: "🏵️" },
  { id: "kc_royal_cocoa",  name: "Royal Cocoa",       qualities: ["Fortune", "Cunning"],   emoji: "🍫" },
];
COURTYARD_INGREDIENTS.forEach(i => INGREDIENT_BY_ID[i.id] = i);

/* --- 3. Special charms — power-ups popped from bubbles, played in the
 * cauldron (a small tray; tap to use). Mostly deterministic = skill in WHEN
 * you use them, not luck. --------------------------------------------- */
const SPECIAL_CHARMS = {
  cleanse: { id: "cleanse", name: "Cleanse", emoji: "🧹", desc: "Calm the allergy meter." },
  insight: { id: "insight", name: "Insight", emoji: "🔍", desc: "Reveal an ingredient's hidden magic." },
  potent:  { id: "potent",  name: "Potent",  emoji: "✨", desc: "Your next ingredient counts double." },
  peek:    { id: "peek",    name: "Peek",    emoji: "⏭️", desc: "Reveal the next need now." },
  wild:    { id: "wild",    name: "Wild",    emoji: "🌈", desc: "Add a burst of random magic." },
  knife:   { id: "knife",   name: "Knife",   emoji: "🔪", desc: "Cut an ingredient into its separate magics." },
  transmute:{ id: "transmute", name: "Transmute", emoji: "🔀", desc: "Change an ingredient into a random needed one." },
  pinch:   { id: "pinch",   name: "Pinch",   emoji: "🤏", desc: "Use just a pinch — halve an ingredient's magic." },
};
const SPECIAL_CHARM_IDS = Object.keys(SPECIAL_CHARMS);

/* --- 4. Wish types: need pools + the customer line that fits them -------- */
/* --- Realms — themed locations you unlock and travel between. The shop name is
 * always "Wish Pop: Bubble Shop"; only the LOCATION changes. Each realm can bring
 * its own cast (and later its own ingredients/art/audio). Willow-Wish Village is the
 * starter (uses the default CUSTOMERS). King's Courtyard is the first unlockable. --- */
const COURTYARD_CUSTOMERS = [
  { id: "jester",   name: "Court Jester",   emoji: "🃏", location: "King's Courtyard", wishType: "c_Jest",
    line: "A wish for mischief — the court could use a laugh!" },
  { id: "knight",   name: "Brave Knight",   emoji: "🛡️", location: "King's Courtyard", wishType: "c_Joust",
    line: "Valor before the joust, if you'd be so kind." },
  { id: "advisor",  name: "Royal Advisor",  emoji: "🧐", location: "King's Courtyard", wishType: "c_Counsel",
    line: "A touch of wisdom — His Majesty is in a mood again." },
  { id: "prince",   name: "Exiled Prince",  emoji: "🤴", location: "King's Courtyard", wishType: "c_Crown",
    line: "A taste of majesty for the long road back to my throne." },
  { id: "guard",    name: "Palace Guard",   emoji: "💂", location: "King's Courtyard", wishType: "c_Watch",
    line: "Honor and vigilance for the long night watch, please." },
  { id: "sword",    name: "Talking Sword",  emoji: "⚔️", location: "King's Courtyard", wishType: "c_Legend",
    line: "Fill me with valor — I've a dragon to meet at dawn!" },
  { id: "noble",    name: "Disguised Noble",emoji: "🎭", location: "King's Courtyard", wishType: "c_Gala",
    line: "A little glamour… no one must recognize me at the gala." },
  { id: "king",     name: "Cursed King",    emoji: "👑", location: "King's Courtyard", wishType: "c_Sorrow",
    line: "A little serenity, perhaps. No one visits a cursed king." },
];
// eventsNeeded = how many events make up a realm's "story" (the pacing backbone: you play
// through these before its finale/next realm opens). Scales up per realm (fast first, longer
// later). Tracked in GAME.realmEvents; shown on the map as a story path. See IDEAS.md.
// reqBonus = per-realm "fussiness": added to each wish's requiredMatch (the % needed to please the
// customer), capped at BALANCE.REQUIRED_MATCH_CAP. NOTE: the difficulty ramp already tops out at the
// "veryhard" tier (80%) after ~10 customers, so this bonus mostly shifts the STEADY-STATE target.
// Steady-state (veryhard) target per realm = 80 + reqBonus. Willow 75, Courtyard 85, escalating up.
const REALMS = [
  { id: "willow",    name: "Willow-Wish Village", icon: "🏘️", tagline: "The cozy hamlet where your bubble shop began.", eventsNeeded: 5, reqBonus: -5 },
  { id: "courtyard", name: "King's Courtyard",    icon: "🏰", tagline: "Jesters, knights, and an enchanted (grumpy) crown.", eventsNeeded: 8, reqBonus: 5,
    unlock: { gold: 3000, keys: 10, keyFrom: "willow" }, theme: "courtyard", customers: COURTYARD_CUSTOMERS, ingredients: COURTYARD_INGREDIENTS, magics: COURT_MAGIC_TYPES, infused: COURT_INFUSED },
  { id: "oasis",     name: "Forgotten Oasis",     icon: "🏜️", comingSoon: true, tagline: "Lamps, genies, and desert wishes.", eventsNeeded: 5, reqBonus: 8 },
  { id: "thieves",   name: "Thieves' Corner",     icon: "🗝️", comingSoon: true, tagline: "Rogues, locks, and light fingers.", eventsNeeded: 5, reqBonus: 10 },
  { id: "beanstalk", name: "Beanstalk Bank",      icon: "🌱", comingSoon: true, tagline: "Giants, gold, and golden geese.", eventsNeeded: 6, reqBonus: 12 },
];
const REALM_BY_ID = {}; REALMS.forEach(r => REALM_BY_ID[r.id] = r);

const WISH_TYPES = {
  StrongTreat:  { main: ["Strength", "Growth"],     second: ["Calm", "Protection"],   twist: ["Luck", "Love", "Energy"] },
  BraveBite:    { main: ["Courage", "Strength"],    second: ["Energy", "Protection"],  twist: ["Luck", "Calm", "Mischief"] },
  LuckySnack:   { main: ["Luck"],                   second: ["Energy", "Mischief"],    twist: ["Love", "Light", "Calm"] },
  SleepySweet:  { main: ["Sleep", "Calm"],          second: ["Love", "Protection"],    twist: ["Growth", "Beauty", "Luck"] },
  PrettyPotion: { main: ["Beauty", "Love"],         second: ["Light", "Calm"],         twist: ["Luck", "Mischief", "Protection"] },
  SafeSpell:    { main: ["Protection", "Strength"], second: ["Calm", "Light"],         twist: ["Courage", "Growth", "Luck"] },
  GlowTreat:    { main: ["Light", "Energy"],        second: ["Beauty", "Courage"],     twist: ["Luck", "Growth", "Calm"] },
  MischiefMix:  { main: ["Mischief", "Luck"],       second: ["Energy", "Courage"],     twist: ["Beauty", "Love", "Sleep"] },
  GardenGrowth: { main: ["Growth", "Light"],        second: ["Calm", "Protection"],    twist: ["Love", "Luck", "Energy"] },
  CalmCup:      { main: ["Calm", "Sleep"],          second: ["Protection", "Love"],    twist: ["Beauty", "Growth", "Light"] },
  LoveCharm:    { main: ["Love", "Beauty"],         second: ["Luck", "Calm"],          twist: ["Light", "Protection", "Mischief"] },
  PowerPop:     { main: ["Energy", "Strength"],     second: ["Courage", "Light"],      twist: ["Luck", "Mischief", "Calm"] },
};
/* King's Courtyard wish types — use the regal COURT_MAGIC set (merged into WISH_TYPES
 * so generateWish resolves them by key, exactly like the base ones). */
const COURT_WISH_TYPES = {
  c_Jest:    { main: ["Mirth", "Cunning"],    second: ["Glamour", "Fortune"],  twist: ["Radiance", "Valor", "Serenity"] },
  c_Joust:   { main: ["Valor", "Honor"],      second: ["Majesty", "Radiance"], twist: ["Fortune", "Wisdom", "Mirth"] },
  c_Counsel: { main: ["Wisdom", "Serenity"],  second: ["Honor", "Majesty"],    twist: ["Fortune", "Radiance", "Cunning"] },
  c_Crown:   { main: ["Majesty", "Radiance"], second: ["Valor", "Glamour"],    twist: ["Wisdom", "Fortune", "Honor"] },
  c_Watch:   { main: ["Honor", "Valor"],      second: ["Serenity", "Wisdom"],  twist: ["Majesty", "Radiance", "Fortune"] },
  c_Legend:  { main: ["Valor", "Majesty"],    second: ["Honor", "Radiance"],   twist: ["Fortune", "Cunning", "Serenity"] },
  c_Gala:    { main: ["Glamour", "Majesty"],  second: ["Radiance", "Mirth"],   twist: ["Fortune", "Serenity", "Wisdom"] },
  c_Sorrow:  { main: ["Serenity", "Majesty"], second: ["Wisdom", "Honor"],     twist: ["Glamour", "Radiance", "Mirth"] },
};
Object.assign(WISH_TYPES, COURT_WISH_TYPES);

/* --- 5. Starter customers (Drury Lane) — line + wish type + emoji -------- */
const CUSTOMERS = [
  { id: "gingerbread", name: "Gingerbread Man", emoji: "🍪", location: "Drury Lane", wishType: "StrongTreat",
    line: "I wish for something strong so I don’t crumble!" },
  { id: "goldilocks",  name: "Goldilocks",      emoji: "👱‍♀️", location: "Willow-Wish Village", wishType: "CalmCup",
    line: "Something that’s just right, please — not too much, not too little!" },
  { id: "baker",       name: "Village Baker",   emoji: "👩‍🍳", location: "Willow-Wish Village", wishType: "CalmCup",
    line: "I wish for something calm before the ovens explode again!" },
  { id: "mouse",       name: "Tiny Mouse",      emoji: "🐭", location: "Drury Lane", wishType: "BraveBite",
    line: "I wish for courage before I face the kitchen cat!" },
  { id: "owl",         name: "Sleepy Owl",      emoji: "🦉", location: "Drury Lane", wishType: "PowerPop",
    line: "I wish for energy. I slept through the moon again." },
  { id: "little_red",  name: "Little Red",      emoji: "👧", location: "Drury Lane", wishType: "SafeSpell",
    line: "I wish for protection on the forest path." },
  { id: "wolf",        name: "Wolf",            emoji: "🐺", location: "Drury Lane", wishType: "PrettyPotion",
    line: "I wish for charm. People keep running when they see me." },
  { id: "gnome",       name: "Bramble",    emoji: "🧝", location: "Drury Lane", wishType: "GardenGrowth",
    line: "I wish for growth. My mushrooms are being stubborn." },
  { id: "pig_straw",   name: "Thatch", emoji: "🐷", location: "Willow-Wish Village", wishType: "PowerPop",
    line: "I wish for a house that stays UP for once." },
  { id: "pig_stick",   name: "Woody", emoji: "🐖", location: "Willow-Wish Village", wishType: "StrongTreat",
    line: "I wish for a house that’s a LITTLE more permanent." },
  { id: "hare",        name: "The Hare",     emoji: "🐇", location: "Willow-Wish Village", wishType: "PowerPop",
    line: "Name’s Dash — racer number ONE! I’m so far ahead of that tortoise I’ve time for a wish. Keep these legs springy for me?" },
  { id: "tortoise",    name: "The Tortoise", emoji: "🐢", location: "Willow-Wish Village", wishType: "SleepySweet",
    line: "Phew… I’m plumb tuckered. I wish there was a way I could walk AND sleep at the same time." },
  { id: "fish",        name: "Wishy the Fish", emoji: "🐟", location: "Willow-Wish Village", wishType: "GlowTreat", pays: "pearls",
    line: "Ha — a wish-fish at a wish SHOP! I grant everyone else’s coin-wishes down my well, but never my own. Payment’s in pearls, I’m afraid — it’s all a well-fish has." },
  { id: "bo_peep",     name: "Bo Peep",        emoji: "👧", location: "Willow-Wish Village", wishType: "SafeSpell",
    line: "A little homing charm, please — so my woollies keep close and quit their wandering!" },
];

/* Retired from the active Willow roster — kept here to reintroduce in a future
   Drury Lane chapter (his art still lives in /art). Not used anywhere yet. */
const RETIRED_CUSTOMERS = [
  { id: "muffin", name: "Muffin Man", emoji: "🧁", location: "Drury Lane", wishType: "LuckySnack",
    line: "I wish for a little luck before the bake-off!" },
];

/* --- 6. Magic allergy ideas (harder customers only) --------------------- */
const ALLERGY_IDEAS = {
  wolf: "Beauty", gingerbread: "Sleep", baker: "Energy", mouse: "Courage",
  owl: "Light", gnome: "Mischief", goldilocks: "Mischief",
  hare: "Calm", tortoise: "Energy", fish: "Mischief",
};

/* --- 7. Familiar (Pet) upgrade table — the pet's default look is a Toad, but it
 * can be reskinned (dragon, cat, fox, …), so we call the creature a "Pet". ---- */
const FAMILIAR = {
  id: "toad", name: "Pet", emoji: "🐸",
  abilities: {
    scoop: { name: "Better Scoop", desc: "Find more Wish Bubbles each round.", unlockCost: 100 },
    charm: { name: "Keen Nose", desc: "Your pet sniffs out a few more charms AND ingredients each round.", unlockCost: 250 },
    undo:  { name: "Undo", desc: "In the cauldron, spend a treat to remove your last ingredient.", unlockCost: 500 },
  },
};

/* --- 8. Result types ---------------------------------------------------- */
const RESULT_TYPES = {
  full:    { id: "full",    title: "Wish Granted!",        payoutPct: 1.00 },
  yellow:  { id: "yellow",  title: "Wish Worked… Mostly!", payoutPct: 0.75 },
  red:     { id: "red",     title: "Wish Worked, But…!",   payoutPct: 0.50 },
  fail:    { id: "fail",    title: "Oops!",                payoutPct: 0.00 },
};

/* --- 9. Cosmetics — purely visual prizes from the Wishing Well ----------
 * No gameplay effect. `default: true` items are owned/equipped from the start.
 * Cauldron skins map to a `.skin-<id>` CSS class on the pot; familiar skins
 * simply swap the corner buddy's emoji. ------------------------------------ */
const COSMETICS = {
  cauldron: [
    { id: "cauldron_classic",  name: "Classic Cauldron", chip: "🫧", default: true },
    { id: "cauldron_rose",     name: "Rose Gold",        chip: "🌸" },
    { id: "cauldron_emerald",  name: "Emerald",          chip: "💚" },
    { id: "cauldron_sapphire", name: "Sapphire",         chip: "💙" },
    { id: "cauldron_amethyst", name: "Amethyst",         chip: "💜" },
    { id: "cauldron_gold",     name: "Golden",           chip: "💛" },
    { id: "cauldron_rainbow",  name: "Rainbow",          chip: "🌈" },
    // achievement-only: earned by recycling junk (not buyable / not in the Well)
    { id: "cauldron_trashcan", name: "Trash Can",        chip: "🗑️", achievement: { stat: "recycled", need: 500, desc: "Recycle 500 junk" } },
    // villain-only: won by beating a villain event (not buyable / not in the Well)
    { id: "cauldron_queen",    name: "Queen's Mirror",   chip: "🪞", villain: true },
    // ball-only: earned by dazzling Cinderella at the Royal Ball (not buyable / not in the Well)
    { id: "cauldron_glass",    name: "Glass Slipper",    chip: "👠", ball: true },
    // hunt-only: earned by finding all the Stepsister's beads in King's Courtyard
    { id: "cauldron_pearl",    name: "Pearl Necklace",   chip: "📿", hunt: "courtyard" },
    // pearl-only: bought with the rare pearls Wishy the Fish pays (never with gold/Stardust)
    { id: "cauldron_pearlshell", name: "Pearl Shell",    chip: "🐚", pearl: 6 },
    { id: "cauldron_tide",     name: "Deep Tide",        chip: "🌊", pearl: 12 },
  ],
  familiar: [
    { id: "toad_classic", name: "Toad",    chip: "🐸", default: true },
    { id: "toad_dragon",  name: "Dragon",  chip: "🐲" },
    { id: "toad_cat",     name: "Cat",     chip: "🐱" },
    { id: "toad_owl",     name: "Owl",     chip: "🦉" },
    { id: "toad_fox",     name: "Fox",     chip: "🦊" },
    { id: "toad_unicorn", name: "Unicorn", chip: "🦄" },
    { id: "toad_bunny",   name: "Bunny",   chip: "🐰" },
    // achievement-only: the "Trash Bandit"
    { id: "toad_raccoon", name: "Trash Bandit", chip: "🦝", achievement: { stat: "recycled", need: 1000, desc: "Recycle 1000 junk" } },
    // hunt-only: earned by finding all of Bo Peep's lost sheep in Willow-Wish Village
    { id: "toad_lamb",    name: "Little Lamb",   chip: "🐑", hunt: "willow" },
    // pearl-only: bought with Wishy the Fish's rare pearls
    { id: "toad_wishy",   name: "Wishy Fish",    chip: "🐠", pearl: 8 },
  ],
};
// flat lookup by id, plus which kind each belongs to
const COSMETIC_BY_ID = {};
Object.keys(COSMETICS).forEach(kind => COSMETICS[kind].forEach(c => { COSMETIC_BY_ID[c.id] = Object.assign({ kind }, c); }));

/* --- 10. Trash — what a disgruntled customer throws at you when you FAIL their
 * wish. Collected into a limited bin, then recycled for coins or Stardust.
 * `coins` = recycle value. ------------------------------------------------ */
const TRASH = [
  { id: "banana",    name: "Banana Peel",  emoji: "🍌", coins: 6 },
  { id: "fishbones", name: "Fishy Bones",  emoji: "🐟", coins: 8 },
  { id: "lint",      name: "Pocket Lint",  emoji: "🧶", coins: 3 },
  { id: "rock",      name: "Old Rock",     emoji: "🪨", coins: 4 },
  { id: "boot",      name: "Soggy Boot",   emoji: "🥾", coins: 12 },
  { id: "can",       name: "Rusty Can",    emoji: "🥫", coins: 7 },
  { id: "core",      name: "Apple Core",   emoji: "🍎", coins: 5 },
  { id: "bone",      name: "Old Bone",     emoji: "🦴", coins: 9 },
];
// Special items (not in the normal throw pool):
//  - bag: a mystery you must OPEN in the recycle screen before it can be used.
//  - ring: the rare treasure a bag can contain — worth a nice bonus.
const TRASH_EXTRA = [
  { id: "bag",  name: "Crumpled Bag", emoji: "🛍️", coins: 0,  bag: true },
  { id: "ring", name: "Gold Ring",    emoji: "💍", coins: 30, treasure: true },
];
const TRASH_BY_ID = {};
TRASH.concat(TRASH_EXTRA).forEach(t => TRASH_BY_ID[t.id] = t);

/* --- 11. Quests — daily (pick 3) + weekly (pick 2). `stat` names a tracked
 * counter; progress is measured from a snapshot taken when the quest is rolled.
 * ------------------------------------------------------------------------ */
const QUESTS = {
  daily: [
    { id: "d_serve",   emoji: "🙂", desc: "Serve 5 happy customers",   stat: "served",   goal: 5,  reward: { gold: 40 } },
    { id: "d_perfect", emoji: "🥳", desc: "Make 2 Perfect potions",     stat: "perfect",  goal: 2,  reward: { stardust: 15 } },
    { id: "d_recycle", emoji: "♻️", desc: "Recycle 12 junk",            stat: "recycled", goal: 12, reward: { gold: 30 } },
    { id: "d_bag",     emoji: "🛍️", desc: "Open a mystery bag",         stat: "bags",     goal: 1,  reward: { gold: 25 } },
    { id: "d_boss",    emoji: "👑", desc: "Please a boss customer",      stat: "bossWins", goal: 1,  reward: { stardust: 20 } },
    { id: "d_rush",    emoji: "⏱️", desc: "Beat an In-a-Rush customer",  stat: "rushWins", goal: 1,  reward: { gold: 35 } },
  ],
  weekly: [
    { id: "w_serve",   emoji: "🧾", desc: "Serve 40 customers",         stat: "served",   goal: 40, reward: { stardust: 40 } },
    { id: "w_perfect", emoji: "🌟", desc: "Make 15 Perfect potions",     stat: "perfect",  goal: 15, reward: { stardust: 55 } },
    { id: "w_recycle", emoji: "♻️", desc: "Recycle 80 junk",            stat: "recycled", goal: 80, reward: { gold: 220 } },
    { id: "w_boss",    emoji: "👑", desc: "Please 5 boss customers",     stat: "bossWins", goal: 5,  reward: { stardust: 35 } },
    { id: "w_ring",    emoji: "💍", desc: "Find 2 Gold Rings",           stat: "rings",    goal: 2,  reward: { stardust: 30 } },
  ],
};
const QUEST_BY_ID = {};
QUESTS.daily.concat(QUESTS.weekly).forEach(q => QUEST_BY_ID[q.id] = q);

/* Expose as a single namespace */
const DATA = {
  MAGIC: MAGIC_ALL, MAGIC_TYPES, VILLAIN_MAGIC, COURT_MAGIC, COURT_MAGIC_TYPES, INGREDIENTS, INGREDIENT_BY_ID, QUEEN_INGREDIENTS, INFUSED_INGREDIENTS, COURT_INFUSED, COURTYARD_INGREDIENTS,
  SPECIAL_CHARMS, SPECIAL_CHARM_IDS, WISH_TYPES, CUSTOMERS, ALLERGY_IDEAS, REALMS, REALM_BY_ID,
  FAMILIAR, RESULT_TYPES, COSMETICS, COSMETIC_BY_ID, TRASH, TRASH_BY_ID,
  QUESTS, QUEST_BY_ID,
};
