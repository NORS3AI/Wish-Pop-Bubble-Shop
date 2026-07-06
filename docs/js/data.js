/* ==========================================================================
 * Wish Pop: Bubble Shop — GAME DATA (Phase 0)
 * All numbers/tables live here so design can be tuned without touching logic.
 * Ingredient "hidden strengths" are derived from cost in engine.js (BALANCE).
 * ======================================================================== */

/* --- 1. Magic Types (12) — each with a placeholder color ---------------- */
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

/* --- 2. Charm currencies (5) — color is only a currency, not a magic ---- */
const CHARMS = {
  Pink:   "#ff7eb9",
  Blue:   "#6db8ff",
  Gold:   "#ffcf5c",
  Green:  "#7ee08a",
  Purple: "#c48bff",
};
const CHARM_TYPES = Object.keys(CHARMS);

/* --- 3. Shelves --------------------------------------------------------- */
const SHELVES = {
  Fresh:    { name: "Fresh Shelf",    style: "bakery, garden, village, natural", color: "#8fd99a" },
  Royal:    { name: "Royal Shelf",    style: "fancy, pretty, palace-style",      color: "#e6b8ff" },
  Sparkle:  { name: "Sparkle Shelf",  style: "crystals, stars, glowing magic",   color: "#8fd0ff" },
  Backroom: { name: "Backroom Shelf", style: "weird, risky, funny, strange",     color: "#c79a6b" },
};
const SHELF_ORDER = ["Fresh", "Royal", "Sparkle", "Backroom"];

/* --- 4. Ingredient library (from the design doc) -----------------------
 * qualities[0] = the ONE magic quality shown to the player (its identity).
 * qualities[1..] = hidden secondary magics, revealed only by the cauldron bars.
 * Every ingredient costs 1 charm of its required COLOR (rolled per round).
 * (cost field is legacy/unused now that all ingredients cost 1 charm.)
 * ---------------------------------------------------------------------- */
const INGREDIENTS = [
  // Fresh Shelf
  { id: "flour",        name: "Flour",         cost: 1, qualities: ["Growth"],                     emoji: "🌾", shelves: ["Fresh"] },
  { id: "egg",          name: "Egg",           cost: 2, qualities: ["Growth"],                     emoji: "🥚", shelves: ["Fresh"] },
  { id: "butter",       name: "Butter",        cost: 2, qualities: ["Calm"],                       emoji: "🧈", shelves: ["Fresh"] },
  { id: "honey",        name: "Honey",         cost: 3, qualities: ["Love", "Calm"],               emoji: "🍯", shelves: ["Fresh", "Royal"] },
  { id: "berries",      name: "Berries",       cost: 3, qualities: ["Love", "Energy"],             emoji: "🫐", shelves: ["Fresh"] },
  { id: "cinnamon",     name: "Cinnamon",      cost: 3, qualities: ["Energy", "Luck"],             emoji: "🟤", shelves: ["Fresh"] },
  { id: "moss_bloom",   name: "Moss Bloom",    cost: 3, qualities: ["Growth", "Protection"],       emoji: "🌿", shelves: ["Fresh"] },
  { id: "sun_petal",    name: "Sun Petal",     cost: 3, qualities: ["Light", "Courage"],           emoji: "🌻", shelves: ["Fresh"] },
  // Royal Shelf
  { id: "silk_thread",  name: "Silk Thread",   cost: 3, qualities: ["Protection", "Beauty"],       emoji: "🧵", shelves: ["Royal"] },
  { id: "rose_jam",     name: "Rose Jam",      cost: 3, qualities: ["Love", "Beauty"],             emoji: "🌹", shelves: ["Royal"] },
  { id: "velvet_ribbon",name: "Velvet Ribbon", cost: 3, qualities: ["Beauty", "Love"],             emoji: "🎀", shelves: ["Royal"] },
  { id: "golden_button",name: "Golden Button", cost: 3, qualities: ["Courage", "Luck"],            emoji: "🟡", shelves: ["Royal"] },
  { id: "pearl_sugar",  name: "Pearl Sugar",   cost: 5, qualities: ["Beauty", "Calm", "Love"],     emoji: "⚪", shelves: ["Royal"] },
  { id: "glass_shard",  name: "Glass Shard",   cost: 5, qualities: ["Beauty", "Light", "Protection"], emoji: "🔷", shelves: ["Royal"] },
  { id: "crown_sprinkle",name:"Crown Sprinkle",cost: 5, qualities: ["Luck", "Beauty", "Courage"],  emoji: "👑", shelves: ["Royal"] },
  { id: "perfume_drop", name: "Perfume Drop",  cost: 5, qualities: ["Love", "Beauty", "Mischief"], emoji: "🧴", shelves: ["Royal"] },
  // Sparkle Shelf
  { id: "shimmer_salt", name: "Shimmer Salt",  cost: 1, qualities: ["Protection"],                 emoji: "🧂", shelves: ["Sparkle"] },
  { id: "moon_drop",    name: "Moon Drop",     cost: 3, qualities: ["Sleep", "Calm"],              emoji: "🌙", shelves: ["Sparkle"] },
  { id: "star_candy",   name: "Star Candy",    cost: 3, qualities: ["Luck", "Energy"],             emoji: "🍬", shelves: ["Sparkle", "Backroom"] },
  { id: "stardust",     name: "Stardust",      cost: 3, qualities: ["Luck", "Light"],              emoji: "✨", shelves: ["Sparkle"] },
  { id: "crystal_sugar",name: "Crystal Sugar", cost: 5, qualities: ["Light", "Beauty", "Energy"],  emoji: "🔮", shelves: ["Sparkle"] },
  { id: "glow_gem",     name: "Glow Gem",      cost: 5, qualities: ["Light", "Protection", "Energy"], emoji: "💎", shelves: ["Sparkle"] },
  { id: "rainbow_drop", name: "Rainbow Drop",  cost: 5, qualities: ["Luck", "Love", "Mischief"],   emoji: "🌈", shelves: ["Sparkle"] },
  { id: "mystery_sparkle",name:"Mystery Sparkle",cost:7, qualities: [], wild: true,                emoji: "❓", shelves: ["Sparkle"] },
  // Backroom Shelf
  { id: "mushroom_cap", name: "Mushroom Cap",  cost: 3, qualities: ["Sleep", "Growth"],            emoji: "🍄", shelves: ["Backroom"] },
  { id: "crow_feather", name: "Crow Feather",  cost: 3, qualities: ["Mischief", "Light"],          emoji: "🪶", shelves: ["Backroom"] },
  { id: "frog_tear",    name: "Frog Tear",     cost: 3, qualities: ["Mischief", "Growth"],         emoji: "💧", shelves: ["Backroom"] },
  { id: "cracked_mirror",name:"Cracked Mirror",cost: 3, qualities: ["Beauty", "Mischief"],         emoji: "🪞", shelves: ["Backroom", "Royal"] },
  { id: "black_apple",  name: "Black Apple",   cost: 5, qualities: ["Sleep", "Love", "Mischief"],  emoji: "🍎", shelves: ["Backroom"] },
  { id: "nightshade",   name: "Nightshade",    cost: 5, qualities: ["Sleep", "Mischief", "Protection"], emoji: "🍇", shelves: ["Backroom"] },
  { id: "dragon_pepper",name: "Dragon Pepper", cost: 5, qualities: ["Courage", "Energy", "Mischief"], emoji: "🌶️", shelves: ["Backroom"] },
  { id: "mystery_crumb",name: "Mystery Crumb", cost: 7, qualities: [], wild: true,                 emoji: "❓", shelves: ["Backroom"] },
  // Strength-bearing ingredients (spread across all shelves so every Strength
  // wish is fulfillable). Brings the library toward the 40-ingredient target.
  { id: "iron_oats",    name: "Iron Oats",     cost: 3, qualities: ["Strength", "Growth"],         emoji: "🌰", shelves: ["Fresh"] },
  { id: "giant_bean",   name: "Giant Bean",    cost: 3, qualities: ["Strength", "Energy"],         emoji: "🫘", shelves: ["Fresh", "Backroom"] },
  { id: "stone_sugar",  name: "Stone Sugar",   cost: 3, qualities: ["Strength", "Beauty"],         emoji: "🪨", shelves: ["Royal"] },
  { id: "thunder_root", name: "Thunder Root",  cost: 5, qualities: ["Strength", "Energy", "Light"], emoji: "⚡", shelves: ["Sparkle"] },
  { id: "bull_horn",    name: "Bull Horn",     cost: 3, qualities: ["Strength", "Courage"],        emoji: "🐂", shelves: ["Backroom"] },
  { id: "ogre_stew",    name: "Ogre Stew",     cost: 5, qualities: ["Strength", "Protection", "Calm"], emoji: "🍲", shelves: ["Backroom", "Royal"] },
  // Extra Calm/Energy main-quality options so every magic has >=2 visible sources.
  { id: "lavender",     name: "Lavender",      cost: 3, qualities: ["Calm", "Sleep"],              emoji: "🪻", shelves: ["Fresh", "Sparkle"] },
  { id: "ginger_root",  name: "Ginger Root",   cost: 3, qualities: ["Energy", "Courage"],          emoji: "🫚", shelves: ["Fresh", "Backroom"] },
];
const INGREDIENT_BY_ID = {};
INGREDIENTS.forEach(i => INGREDIENT_BY_ID[i.id] = i);
// 40 ingredients (32 from the doc + 6 Strength + Lavender & Ginger Root for
// full main-quality coverage). Every magic type is the MAIN quality of >=2.

/* --- 5. Wish types: need pools + the customer line that fits them -------- */
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

/* --- 6. Starter customers (Drury Lane) — line + wish type + emoji -------- */
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

/* --- 7. Magic allergy ideas (used from Phase 5, harder customers only) --- */
const ALLERGY_IDEAS = {
  wolf: "Beauty", gingerbread: "Sleep", baker: "Energy", mouse: "Courage",
  owl: "Light", gnome: "Mischief",
};

/* --- 8. Familiar (Toad) starter table ----------------------------------- */
const FAMILIAR = {
  id: "toad", name: "Toad", emoji: "🐸",
  abilities: {
    grab:  { phase: "shop",  name: "Lucky Grab",   desc: "Grab one random ingredient from this shelf, free. Costs 1 treat." },
    scoop: { phase: "scoop", name: "Better Scoop", desc: "Increases the chance of finding more Wish Bubbles.", unlockCost: 100 },
    bonus: { phase: "pop",   name: "Bonus Gift",   desc: "When a bonus bubble is gained, also gain a random ingredient.", unlockCost: 250 },
    undo:  { phase: "mix",   name: "Undo",         desc: "Remove the last ingredient added (it disappears).", unlockCost: 500 },
  },
};

/* --- 9. Result types ---------------------------------------------------- */
const RESULT_TYPES = {
  full:    { id: "full",    title: "Wish Granted!",        payoutPct: 1.00 },
  yellow:  { id: "yellow",  title: "Wish Worked… Mostly!", payoutPct: 0.75 },
  red:     { id: "red",     title: "Wish Worked, But…!",   payoutPct: 0.50 },
  fail:    { id: "fail",    title: "Oops!",                payoutPct: 0.00 },
};

/* Expose as a single namespace */
const DATA = {
  MAGIC, MAGIC_TYPES, CHARMS, CHARM_TYPES, SHELVES, SHELF_ORDER,
  INGREDIENTS, INGREDIENT_BY_ID, WISH_TYPES, CUSTOMERS, ALLERGY_IDEAS,
  FAMILIAR, RESULT_TYPES,
};
