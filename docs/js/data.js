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

/* --- 2. Ingredient library (20) ----------------------------------------
 * qualities[0] = the ONE magic quality shown to the player (its identity).
 * qualities[1..] = HIDDEN secondary magics, revealed only by the cauldron bars
 * (or a Peek/Insight charm). Every magic type is the MAIN quality of >=1
 * ingredient so a biased hand can always be assembled.
 * ---------------------------------------------------------------------- */
const INGREDIENTS = [
  { id: "honey",       name: "Honey",       qualities: ["Love", "Calm"],                emoji: "🍯" },
  { id: "berries",     name: "Berries",     qualities: ["Love", "Energy"],              emoji: "🫐" },
  { id: "rose_jam",    name: "Rose Jam",    qualities: ["Beauty", "Love"],              emoji: "🌹" },
  { id: "pearl_sugar", name: "Pearl Sugar", qualities: ["Beauty", "Calm", "Love"],      emoji: "⚪" },
  { id: "moon_drop",   name: "Moon Drop",   qualities: ["Sleep", "Calm"],               emoji: "🌙" },
  { id: "mushroom_cap",name: "Mushroom Cap",qualities: ["Sleep", "Growth"],             emoji: "🍄" },
  { id: "star_candy",  name: "Star Candy",  qualities: ["Luck", "Energy"],              emoji: "🍬" },
  { id: "rainbow_drop",name: "Rainbow Drop",qualities: ["Luck", "Love", "Mischief"],    emoji: "🌈" },
  { id: "sun_petal",   name: "Sun Petal",   qualities: ["Light", "Courage"],            emoji: "🌻" },
  { id: "glow_gem",    name: "Glow Gem",    qualities: ["Light", "Protection", "Energy"], emoji: "💎" },
  { id: "iron_oats",   name: "Iron Oats",   qualities: ["Strength", "Growth"],          emoji: "🌰" },
  { id: "bull_horn",   name: "Bull Horn",   qualities: ["Strength", "Courage"],         emoji: "🐂" },
  { id: "dragon_pepper",name:"Dragon Pepper",qualities:["Courage", "Energy", "Mischief"],emoji: "🌶️" },
  { id: "cinnamon",    name: "Cinnamon",    qualities: ["Energy", "Luck"],              emoji: "🟤" },
  { id: "ginger_root", name: "Ginger Root", qualities: ["Energy", "Courage"],           emoji: "🫚" },
  { id: "lavender",    name: "Lavender",    qualities: ["Calm", "Sleep"],               emoji: "🪻" },
  { id: "moss_bloom",  name: "Moss Bloom",  qualities: ["Growth", "Protection"],        emoji: "🌿" },
  { id: "shimmer_salt",name: "Shimmer Salt",qualities: ["Protection", "Light"],         emoji: "🧂" },
  { id: "crow_feather",name: "Crow Feather",qualities: ["Mischief", "Light"],           emoji: "🪶" },
  { id: "frog_tear",   name: "Frog Tear",   qualities: ["Mischief", "Growth"],          emoji: "💧" },
];
const INGREDIENT_BY_ID = {};
INGREDIENTS.forEach(i => INGREDIENT_BY_ID[i.id] = i);

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
};
const SPECIAL_CHARM_IDS = Object.keys(SPECIAL_CHARMS);

/* --- 4. Wish types: need pools + the customer line that fits them -------- */
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

/* --- 5. Starter customers (Drury Lane) — line + wish type + emoji -------- */
const CUSTOMERS = [
  { id: "gingerbread", name: "Gingerbread Man", emoji: "🍪", location: "Drury Lane", wishType: "StrongTreat",
    line: "I wish for something strong so I don’t crumble!" },
  { id: "muffin",      name: "Muffin Man",      emoji: "🧁", location: "Drury Lane", wishType: "LuckySnack",
    line: "I wish for a little luck before the bake-off!" },
  { id: "baker",       name: "Village Baker",   emoji: "👨‍🍳", location: "Drury Lane", wishType: "CalmCup",
    line: "I wish for something calm before the ovens explode again!" },
  { id: "mouse",       name: "Tiny Mouse",      emoji: "🐭", location: "Drury Lane", wishType: "BraveBite",
    line: "I wish for courage before I face the kitchen cat!" },
  { id: "owl",         name: "Sleepy Owl",      emoji: "🦉", location: "Drury Lane", wishType: "PowerPop",
    line: "I wish for energy. I slept through the moon again." },
  { id: "little_red",  name: "Little Red",      emoji: "👧", location: "Drury Lane", wishType: "SafeSpell",
    line: "I wish for protection on the forest path." },
  { id: "wolf",        name: "Wolf",            emoji: "🐺", location: "Drury Lane", wishType: "PrettyPotion",
    line: "I wish for charm. People keep running when they see me." },
  { id: "gnome",       name: "Garden Gnome",    emoji: "🧝", location: "Drury Lane", wishType: "GardenGrowth",
    line: "I wish for growth. My mushrooms are being stubborn." },
];

/* --- 6. Magic allergy ideas (harder customers only) --------------------- */
const ALLERGY_IDEAS = {
  wolf: "Beauty", gingerbread: "Sleep", baker: "Energy", mouse: "Courage",
  owl: "Light", gnome: "Mischief",
};

/* --- 7. Familiar (Toad) upgrade table ----------------------------------- */
const FAMILIAR = {
  id: "toad", name: "Toad", emoji: "🐸",
  abilities: {
    scoop: { name: "Better Scoop", desc: "Find more Wish Bubbles each round.", unlockCost: 100 },
    charm: { name: "Charm Finder", desc: "Higher chance to pop special charms.", unlockCost: 250 },
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

/* Expose as a single namespace */
const DATA = {
  MAGIC, MAGIC_TYPES, INGREDIENTS, INGREDIENT_BY_ID,
  SPECIAL_CHARMS, SPECIAL_CHARM_IDS, WISH_TYPES, CUSTOMERS, ALLERGY_IDEAS,
  FAMILIAR, RESULT_TYPES,
};
