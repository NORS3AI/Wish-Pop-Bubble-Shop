/* ==========================================================================
 * Wish Pop: Bubble Shop — ENGINE (Phase 0)
 * Headless game logic: balance config, wish generation, scoring, round setup.
 * No DOM here. UI lives in ui.js.
 * ======================================================================== */

/* --- BALANCE: every tunable number in one place ------------------------- */
const BALANCE = {
  // Scoring — each ingredient shows ONE main quality (qualities[0]); the rest are
  // hidden secondaries revealed only by the cauldron bars.
  NEED_TARGET: 12,               // magic points to fill one need's bar to 100%
  MAIN_POWER: 6,                 // strength of an ingredient's shown (main) quality
  SECONDARY_POWER: 3,            // strength of each hidden secondary quality
  POTENT_MULT: 2.5,              // tripled -> Potent ingredient multiplier
  WILD_MIN: 3, WILD_MAX: 6,      // wild ingredient random strength per rolled quality
  NEED_WEIGHTS: { 1: [1.0], 2: [0.6, 0.4], 3: [0.4, 0.3, 0.3] }, // Main / Second / Final
  INGREDIENT_COST: 2,            // every ingredient costs 1 charm of its (random) color

  // Difficulty by how many customers served so far
  //   easy: Main only | medium: +Second | hard: +Final Twist
  REQUIRED_MATCH: { easy: 50, medium: 60, hard: 70, veryhard: 80 },
  PAYMENT:        { easy: 20, medium: 30, hard: 40, veryhard: 50 },
  TIP: 10, TIP_MARGIN: 20,       // exceed required by this much -> tip
  CONSOLATION_FRACTION: 0.35,    // partial-credit gold on a miss (scaled to match)
  FAMILIAR_KEY_CHANCE: 0.5,      // chance the Toad finds a key (if shelves locked)

  // Scoop / bubbles — each scoop rolls its OWN random yield and they sum, so
  // more scoops (higher pay) really means more bubbles, and every reveal varies.
  BUBBLES_PER_SCOOP_MIN: 1,
  BUBBLES_PER_SCOOP_MAX: 4,
  MIN_BUBBLES: 3,               // floor so a cheap 1-scoop round is never a dud

  // Bubble-pop rewards (Phase 2)
  CHARM_POP_MIN: 1, CHARM_POP_MAX: 2,   // charms granted per pop (always)
  BONUS_CHANCE: 0.5,                    // chance a pop also gives a bonus reward
  BONUS_WEIGHTS: { ingredient: 40, gold: 25, bubble: 15, treat: 12, wild: 8 },
  BONUS_GOLD_MIN: 3, BONUS_GOLD_MAX: 8,
  MAX_BONUS_BUBBLES: 3,                 // cap extra bubbles per round (anti-runaway)
  KEY_CHANCE: 0.15,                     // per-pop chance to drop a shelf key

  // Ingredient slots earned by shopping speed
  SLOTS: { fast: 7, medium: 6, slow: 5 },

  // Shop (Phase 3)
  SHELF_MAX: 6,                  // ingredient cards per shelf
  REVEAL_SECOND_MS: 30000,      // Second Need auto-reveals after 30s
  REVEAL_TWIST_MS: 60000,       // Final Twist auto-reveals after 60s

  // Gold economy (kid-simple, patterned, scarce)
  PRICES: { treat: 10, revealSecond: 25, revealTwist: 50, ability: [100, 250, 500], location: 1000 },
  DAILY_GRANT: 150,
  START_GOLD: 50,
  MAX_TREATS_PER_ROUND: 5,
};

/* --- small helpers ------------------------------------------------------ */
const R = {
  int:    (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick:   (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
};

/* Points an ingredient adds to a given magic type:
 * main (shown) quality = MAIN_POWER, hidden secondaries = SECONDARY_POWER. */
function ingredientPointsFor(ing, magicType) {
  const idx = ing.qualities.indexOf(magicType);
  if (idx < 0) return 0;
  return idx === 0 ? BALANCE.MAIN_POWER : BALANCE.SECONDARY_POWER;
}

/* --- Difficulty ramp ---------------------------------------------------- */
function difficultyFor(servedTotal) {
  if (servedTotal < 2) return "easy";     // customers 1-2: Main need only
  if (servedTotal < 5) return "medium";   // 3-5: + Second
  return "hard";                          // 6+: + Final Twist
  // veryhard / allergies arrive in later phases
}
function needCountFor(diff) {
  return diff === "easy" ? 1 : diff === "medium" ? 2 : 3;
}

/* --- Wish generation: pick needs from the customer's wish-type pools ----- */
function generateWish(customer, diff) {
  const wt = DATA.WISH_TYPES[customer.wishType];
  const count = needCountFor(diff);
  const pools = [wt.main, wt.second, wt.twist];
  const chosen = [];
  for (let i = 0; i < count; i++) {
    // pick from this pool, avoiding duplicates already chosen (reroll)
    const options = pools[i].filter(m => !chosen.includes(m));
    const magic = options.length ? R.pick(options) : R.pick(pools[i]);
    chosen.push(magic);
  }
  const labels = ["Main Need", "Second Need", "Final Twist"];
  const needs = chosen.map((type, i) => ({
    type, label: labels[i], target: BALANCE.NEED_TARGET,
    revealed: i === 0,                 // only Main visible at first
  }));
  return {
    needs,
    requiredMatch: BALANCE.REQUIRED_MATCH[diff],
    difficulty: diff,
    weights: BALANCE.NEED_WEIGHTS[count],
    allergy: null,                     // Phase 5
  };
}

/* --- Round setup -------------------------------------------------------- */
function newRound(state) {
  const customer = R.pick(DATA.CUSTOMERS);
  const diff = difficultyFor(state.servedTotal);
  const wish = generateWish(customer, diff);
  const payment = BALANCE.PAYMENT[diff];
  // scoops from payment; each scoop rolls its own bubble yield (randomized)
  const scoops = Math.max(1, Math.round(payment / 10));
  const scoopYields = [];
  for (let i = 0; i < scoops; i++) scoopYields.push(R.int(BALANCE.BUBBLES_PER_SCOOP_MIN, BALANCE.BUBBLES_PER_SCOOP_MAX));
  let bubbles = scoopYields.reduce((a, b) => a + b, 0);
  if (bubbles < BALANCE.MIN_BUBBLES) { scoopYields[0] += BALANCE.MIN_BUBBLES - bubbles; bubbles = BALANCE.MIN_BUBBLES; }

  // Roll the required charm COLOR per ingredient this round
  const charmColorFor = {};
  DATA.INGREDIENTS.forEach(i => { charmColorFor[i.id] = R.pick(DATA.CHARM_TYPES); });

  // Shelves + which one starts unlocked (keys open the rest during popping)
  const { shelves, startShelf } = populateShelves(wish);

  return {
    customer, wish, payment, bubblesTotal: bubbles, scoops, scoopYields,
    charmColorFor, shelves, startShelf, unlocked: [startShelf],
    charms: { Pink: 0, Blue: 0, Gold: 0, Green: 0, Purple: 0 },
    bonusBubblesGained: 0,             // extra bubbles won this round (capped)
    inventory: [],                     // ingredient instances the player owns this round
    slots: [],                         // ingredients added to the cauldron
    maxSlots: BALANCE.SLOTS.slow,      // updated by shopping speed later
    treatsUsed: 0,
    result: null,
  };
}

/* --- Scoop split: distribute total bubbles across scoops (each >=1) ------ */
function scoopSplit(total, scoops) {
  scoops = Math.max(1, scoops);
  const base = Math.floor(total / scoops);
  let rem = total - base * scoops;
  const out = [];
  for (let i = 0; i < scoops; i++) out.push(base + (rem-- > 0 ? 1 : 0));
  return out; // e.g. total 5 scoops 2 -> [3,2]
}

/* --- Weighted pick from a {key: weight} map ----------------------------- */
function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[0][0];
}

/* --- Roll one bubble pop: always charms, sometimes a bonus -------------- */
function rollPop(round) {
  // charms (always) — stacks in TWO colors per pop: enough to afford ingredients
  // of a specific color while keeping decent coverage across the five currencies.
  const charms = {};
  const cols = R.shuffle(DATA.CHARM_TYPES).slice(0, 2);
  cols.forEach(c => { charms[c] = R.int(BALANCE.CHARM_POP_MIN, BALANCE.CHARM_POP_MAX); });
  // bonus (sometimes)
  let bonus = null;
  if (R.chance(BALANCE.BONUS_CHANCE)) {
    let type = weightedPick(BALANCE.BONUS_WEIGHTS);
    if (type === "bubble" && round.bonusBubblesGained >= BALANCE.MAX_BONUS_BUBBLES) type = "gold";
    if (type === "ingredient") {
      const ing = R.pick(DATA.INGREDIENTS.filter(i => !i.wild));
      bonus = { type, ingId: ing.id };
    } else if (type === "wild") {
      const ing = R.pick(DATA.INGREDIENTS.filter(i => i.wild));
      bonus = { type, ingId: ing.id };
    } else if (type === "treat") {
      bonus = { type, amount: 1 };
    } else if (type === "gold") {
      bonus = { type, amount: R.int(BALANCE.BONUS_GOLD_MIN, BALANCE.BONUS_GOLD_MAX) };
    } else { // bubble
      bonus = { type: "bubble" };
    }
  }
  // independent shelf-key roll (the UI unlocks a random locked shelf)
  const key = R.chance(BALANCE.KEY_CHANCE);
  return { charms, bonus, key };
}

/* --- Populate the four shelves for a round ------------------------------
 * Each shelf draws up to SHELF_MAX from its eligible ingredients. Also chooses
 * the STARTING (unlocked) shelf and guarantees it stocks >=2 ingredients whose
 * visible main quality is the main need, so the opening shelf is always enough
 * to attempt the round. Other shelves start locked (opened by keys).
 * Returns { shelves, startShelf }.
 * ---------------------------------------------------------------------- */
function populateShelves(wish) {
  const shelves = {};
  DATA.SHELF_ORDER.forEach(shelf => {
    const eligible = DATA.INGREDIENTS.filter(i => i.shelves.includes(shelf));
    shelves[shelf] = R.shuffle(eligible).slice(0, BALANCE.SHELF_MAX).map(i => i.id);
  });
  const mainType = wish.needs[0].type;
  const mainIngs = DATA.INGREDIENTS.filter(i => !i.wild && i.qualities[0] === mainType);
  // pick a start shelf that can actually hold a main-need ingredient
  const candidates = DATA.SHELF_ORDER.filter(s => mainIngs.some(i => i.shelves.includes(s)));
  const startShelf = R.pick(candidates.length ? candidates : DATA.SHELF_ORDER);
  // stock the start shelf with >=2 visible main-need ingredients
  const onStart = R.shuffle(mainIngs.filter(i => i.shelves.includes(startShelf)));
  const arr = shelves[startShelf];
  onStart.slice(0, 2).forEach(ing => {
    if (arr.includes(ing.id)) return;
    const repl = arr.findIndex(id => { const c = DATA.INGREDIENT_BY_ID[id]; return !c.wild && c.qualities[0] !== mainType; });
    if (repl >= 0) arr[repl] = ing.id;
    else if (arr.length < BALANCE.SHELF_MAX) arr.push(ing.id);
  });
  return { shelves, startShelf };
}

/* --- Triple match: 3 identical ingredients -> 1 Potent ------------------ */
function applyTripleMatch(inventory) {
  const counts = {};
  inventory.forEach(inst => { counts[inst.id] = (counts[inst.id] || 0) + 1; });
  const out = [];
  const merged = [];
  Object.keys(counts).forEach(id => {
    let n = counts[id];
    while (n >= 3) {
      out.push({ id, potent: true });
      merged.push(id);
      n -= 3;
    }
    for (let i = 0; i < n; i++) out.push({ id, potent: false });
  });
  return { inventory: out, merged };
}

/* --- Scoring: "Harmless" model — only asked-for magic counts ------------ */
function scoreMix(slots, wish) {
  const perNeed = wish.needs.map(need => {
    let points = 0;
    slots.forEach(inst => {
      const ing = DATA.INGREDIENT_BY_ID[inst.id];
      let p = 0;
      if (ing.wild) {
        if ((inst.wildQualities || []).includes(need.type)) p = inst.wildStrength || BALANCE.WILD_MIN;
      } else {
        p = ingredientPointsFor(ing, need.type);
      }
      if (p && inst.potent) p = Math.round(p * BALANCE.POTENT_MULT);
      points += p;
    });
    const pct = Math.min(100, Math.round((points / need.target) * 100));
    return { type: need.type, label: need.label, pct, points };
  });
  // weighted blend (Main highest)
  const w = wish.weights;
  let weighted = 0;
  perNeed.forEach((n, i) => { weighted += n.pct * (w[i] || 0); });
  weighted = Math.round(weighted);
  return { perNeed, weighted };
}

/* --- Result: compare weighted match to required (allergy added Phase 5) - */
function scoreResult(round) {
  const { weighted } = scoreMix(round.slots, round.wish);
  const required = round.wish.requiredMatch;
  const success = weighted >= required;
  let type, gold;
  if (!success) {
    // partial credit — a few coins scaled to how close you got (never zero effort)
    type = DATA.RESULT_TYPES.fail;
    gold = Math.max(1, Math.round(round.payment * (weighted / 100) * BALANCE.CONSOLATION_FRACTION));
  } else {
    type = DATA.RESULT_TYPES.full;
    gold = round.payment;
    if (weighted >= required + BALANCE.TIP_MARGIN) gold += BALANCE.TIP;
  }
  return { type, gold, weighted, required, success, partial: !success && gold > 0 };
}

/* --- Reroll a shelf's stock (one free reroll per shelf per round) -------- */
function rerollShelf(round, shelf) {
  const eligible = DATA.INGREDIENTS.filter(i => i.shelves.includes(shelf));
  round.shelves[shelf] = R.shuffle(eligible).slice(0, BALANCE.SHELF_MAX).map(i => i.id);
  ensureMainVisible(round);
}
/* Make sure the main need stays buyable on some unlocked shelf (safety after
 * a reroll, so a player can't accidentally reroll away their only match). */
function ensureMainVisible(round) {
  const mainType = round.wish.needs[0].type;
  const shows = round.unlocked.some(s => round.shelves[s].some(id => {
    const ing = DATA.INGREDIENT_BY_ID[id]; return !ing.wild && ing.qualities[0] === mainType;
  }));
  if (shows) return;
  const mainIngs = R.shuffle(DATA.INGREDIENTS.filter(i => !i.wild && i.qualities[0] === mainType));
  for (const s of round.unlocked) {
    const ing = mainIngs.find(i => i.shelves.includes(s));
    if (!ing) continue;
    const arr = round.shelves[s];
    const repl = arr.findIndex(id => { const c = DATA.INGREDIENT_BY_ID[id]; return !c.wild && c.qualities[0] !== mainType; });
    if (repl >= 0) arr[repl] = ing.id; else if (arr.length < BALANCE.SHELF_MAX) arr.push(ing.id);
    return;
  }
}

/* Expose */
const ENGINE = {
  BALANCE, R, ingredientPointsFor, difficultyFor, needCountFor,
  generateWish, newRound, applyTripleMatch, scoreMix, scoreResult,
  scoopSplit, weightedPick, rollPop, populateShelves, rerollShelf, ensureMainVisible,
};
