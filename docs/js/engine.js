/* ==========================================================================
 * Wish Pop: Bubble Shop — ENGINE (Phase 0)
 * Headless game logic: balance config, wish generation, scoring, round setup.
 * No DOM here. UI lives in ui.js.
 * ======================================================================== */

/* --- BALANCE: every tunable number in one place ------------------------- */
const BALANCE = {
  // Scoring
  NEED_TARGET: 10,               // magic points needed to fill one need's bar to 100%
  POWER_BY_COST: { 1: 4, 2: 4, 3: 3, 5: 3, 7: 3 }, // hidden strength each quality adds
  POTENT_MULT: 2.5,              // tripled -> Potent ingredient multiplier
  WILD_MIN: 2, WILD_MAX: 4,      // wild ingredient random strength per rolled quality
  NEED_WEIGHTS: { 1: [1.0], 2: [0.6, 0.4], 3: [0.4, 0.3, 0.3] }, // Main / Second / Final

  // Difficulty by how many customers served so far
  //   easy: Main only | medium: +Second | hard: +Final Twist
  REQUIRED_MATCH: { easy: 50, medium: 60, hard: 70, veryhard: 80 },
  PAYMENT:        { easy: 20, medium: 30, hard: 40, veryhard: 50 },
  TIP: 10, TIP_MARGIN: 20,       // exceed required by this much -> tip

  // Scoop / bubbles  (bubbles = max(3, round(payment/10) + 1))
  MIN_BUBBLES: 3,
  CHARMS_PER_POP: 2,             // Phase-1 placeholder charm yield per bubble

  // Ingredient slots earned by shopping speed
  SLOTS: { fast: 7, medium: 6, slow: 5 },

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

/* Hidden strength a single (non-potent) ingredient adds to each of its qualities */
function ingredientPower(ing) {
  return BALANCE.POWER_BY_COST[ing.cost] || 3;
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
  const bubbles = Math.max(BALANCE.MIN_BUBBLES, Math.round(payment / 10) + 1);

  // Roll the required charm COLOR per ingredient this round (cost stays fixed)
  const charmColorFor = {};
  DATA.INGREDIENTS.forEach(i => { charmColorFor[i.id] = R.pick(DATA.CHARM_TYPES); });

  return {
    customer, wish, payment, bubblesTotal: bubbles,
    charmColorFor,
    charms: { Pink: 0, Blue: 0, Gold: 0, Green: 0, Purple: 0 },
    inventory: [],                     // ingredient instances the player owns this round
    slots: [],                         // ingredients added to the cauldron
    maxSlots: BALANCE.SLOTS.slow,      // updated by shopping speed later
    treatsUsed: 0,
    result: null,
  };
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
      let quals = ing.qualities;
      if (ing.wild) quals = inst.wildQualities || [];
      if (quals.includes(need.type)) {
        let p = ingredientPower(ing);
        if (inst.potent) p = Math.round(p * BALANCE.POTENT_MULT);
        if (inst.wildStrength) p = inst.wildStrength;
        points += p;
      }
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
    type = DATA.RESULT_TYPES.fail; gold = 0;
  } else {
    type = DATA.RESULT_TYPES.full;
    gold = round.payment;
    if (weighted >= required + BALANCE.TIP_MARGIN) gold += BALANCE.TIP;
  }
  return { type, gold, weighted, required, success };
}

/* Expose */
const ENGINE = {
  BALANCE, R, ingredientPower, difficultyFor, needCountFor,
  generateWish, newRound, applyTripleMatch, scoreMix, scoreResult,
};
