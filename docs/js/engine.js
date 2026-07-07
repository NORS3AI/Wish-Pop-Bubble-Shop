/* ==========================================================================
 * Wish Pop: Bubble Shop — ENGINE (v3 Cauldron-First)
 * Headless game logic: balance, wish generation, haul, scoring. No DOM.
 * Loop: Customer -> Scoop -> Pop (draft a hand) -> Cauldron -> Result.
 * ======================================================================== */

const BALANCE = {
  // Scoring — SWEET SPOT: each need wants magic in a green target BAND around a
  // center, not "as much as possible". Small chunks so amount is controllable.
  NEED_TARGET: 6,               // center of the green band (magic points) — reachable for all 3 needs in 6 slots
  MAIN_POWER: 2, SECONDARY_POWER: 1, POTENT_MULT: 2.5, // small chunks (granularity)
  BAND_HALF_BASE: 2.5,          // green band half-width with 0 ingredients
  BAND_SHRINK_PER_ADD: 0.18,    // band narrows this much per ingredient in the pot
  BAND_HALF_MIN: 1.5,           // never narrower than this
  OVERSHOOT_K: 11,              // % a need loses per magic point past the band
  BELOW_BAND_POW: 2.4,          // <1 falls off fast: being just under the green is punished
  BAR_MAX: 13,                  // meter display scale (points)
  NEED_WEIGHTS: { 1: [1.0], 2: [0.5, 0.5], 3: [0.34, 0.33, 0.33] }, // every need weighs the same

  // Difficulty by customers served
  REQUIRED_MATCH: { easy: 50, medium: 60, hard: 68, veryhard: 80 },
  PAYMENT_RANGE:  { easy: [20, 30], medium: [20, 40], hard: [30, 50], veryhard: [40, 60] },
  CONSOLATION_FRACTION: 0.35,   // partial-credit gold on a miss (scaled to match)

  // Magic allergy (hard+ only)
  ALLERGY_CHANCE: 0.55, ALLERGY_YELLOW_AT: 3, ALLERGY_RED_AT: 6, ALLERGY_CLEANSE: 3,

  // Scoop / bubbles — each scoop rolls its own yield; each bubble = one haul item.
  BUBBLES_PER_SCOOP_MIN: 2, BUBBLES_PER_SCOOP_MAX: 4, MIN_BUBBLES: 8,

  // Haul composition — mostly ingredients now (fatter hand)
  CHARM_DROP_CHANCE: 0.10, CHARM_DROP_CHANCE_FINDER: 0.20, // with "Charm Finder" upgrade
  GOLD_DROP_CHANCE: 0.06, TREAT_DROP_CHANCE: 0.04,
  BONUS_BUBBLE_CHANCE: 0.12,            // a bubble that pops into MORE (golden) bubbles
  BONUS_SPAWN_MIN: 2, BONUS_SPAWN_MAX: 3, // how many extra golden bubbles a bonus yields
  GOLD_MIN: 3, GOLD_MAX: 8,
  NEED_BIAS: 0.38,               // chance a filler ingredient matches a need
  WILD_STRENGTH: 3,             // magic points the Wild charm adds

  // Cauldron
  MIX_SLOTS: 6,
  QUICK_TIP_PER_HIDDEN: 8,      // gold tip per still-secret need if you serve AND succeed
  QUALITY_TIP: 10, QUALITY_MARGIN: 20, // "perfect potion" tip: exceed required by this much

  // Gold / progression
  PRICES: { treat: 10 },
  DAILY_GRANT: 150, START_GOLD: 50, MAX_TREATS_PER_ROUND: 5,
};

const R = {
  int:    (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick:   (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
};

/* Points an ingredient adds to a magic type: main = MAIN_POWER, hidden = SECONDARY_POWER. */
function ingredientPointsFor(ing, magicType) {
  const idx = ing.qualities.indexOf(magicType);
  if (idx < 0) return 0;
  return idx === 0 ? BALANCE.MAIN_POWER : BALANCE.SECONDARY_POWER;
}

/* --- Difficulty ramp ---------------------------------------------------- */
function difficultyFor(servedTotal) {
  if (servedTotal < 2) return "easy";
  if (servedTotal < 5) return "medium";
  if (servedTotal < 10) return "hard";
  return "veryhard";
}
function needCountFor(diff) { return diff === "easy" ? 1 : diff === "medium" ? 2 : 3; }

/* --- Wish generation ---------------------------------------------------- */
function generateWish(customer, diff) {
  const wt = DATA.WISH_TYPES[customer.wishType];
  const count = needCountFor(diff);
  const pools = [wt.main, wt.second, wt.twist];
  const chosen = [];
  for (let i = 0; i < count; i++) {
    const options = pools[i].filter(m => !chosen.includes(m));
    chosen.push(options.length ? R.pick(options) : R.pick(pools[i]));
  }
  const labels = ["Main Need", "Second Need", "Final Twist"];
  const needs = chosen.map((type, i) => ({ type, label: labels[i], target: BALANCE.NEED_TARGET, revealed: i === 0 }));
  let allergy = null;
  if (diff === "hard" || diff === "veryhard") {
    const roll = diff === "veryhard" ? true : R.chance(BALANCE.ALLERGY_CHANCE);
    if (roll) {
      const forbidden = chosen.slice();
      let a = DATA.ALLERGY_IDEAS[customer.id];
      if (!a || forbidden.includes(a)) a = R.pick(DATA.MAGIC_TYPES.filter(m => !forbidden.includes(m)));
      allergy = a;
    }
  }
  return { needs, requiredMatch: BALANCE.REQUIRED_MATCH[diff], difficulty: diff, weights: BALANCE.NEED_WEIGHTS[count], allergy };
}

/* --- Haul: the hand of items popped from bubbles ------------------------
 * Biased toward the customer's needs (always attemptable), with duplicates,
 * plus occasional special charms / gold / treats. Length === bubbleCount.
 * ---------------------------------------------------------------------- */
function generateHaul(wish, count, charmFinder) {
  const needs = wish.needs.map(n => n.type);
  const mainSources = DATA.INGREDIENTS.filter(i => i.qualities[0] === needs[0]);
  const ingItem = ing => ({ kind: "ingredient", id: ing.id });
  const items = [];
  // guarantee 2 main-need ingredients (attemptable + enough to build the main
  // toward its band). Secondary/twist coverage comes from the biased draw.
  items.push(ingItem(R.pick(mainSources)));
  items.push(ingItem(R.pick(mainSources)));
  const charmChance = charmFinder ? BALANCE.CHARM_DROP_CHANCE_FINDER : BALANCE.CHARM_DROP_CHANCE;
  while (items.length < count) {
    const r = Math.random();
    if (r < charmChance) {
      // Insight is a one-time reveal — a second does nothing, so never draft two.
      const haveInsight = items.some(it => it.kind === "charm" && it.id === "insight");
      const pool = haveInsight ? DATA.SPECIAL_CHARM_IDS.filter(id => id !== "insight") : DATA.SPECIAL_CHARM_IDS;
      items.push({ kind: "charm", id: R.pick(pool) });
    }
    else if (r < charmChance + BALANCE.GOLD_DROP_CHANCE) items.push({ kind: "gold", amt: R.int(BALANCE.GOLD_MIN, BALANCE.GOLD_MAX) });
    else if (r < charmChance + BALANCE.GOLD_DROP_CHANCE + BALANCE.TREAT_DROP_CHANCE) items.push({ kind: "treat" });
    else if (r < charmChance + BALANCE.GOLD_DROP_CHANCE + BALANCE.TREAT_DROP_CHANCE + BALANCE.BONUS_BUBBLE_CHANCE) items.push({ kind: "bubble" });
    else {
      let ing;
      if (R.chance(BALANCE.NEED_BIAS)) { const t = R.pick(needs); const s = DATA.INGREDIENTS.filter(i => i.qualities[0] === t); ing = R.pick(s.length ? s : DATA.INGREDIENTS); }
      else ing = R.pick(DATA.INGREDIENTS);
      items.push(ingItem(ing));
    }
  }
  return R.shuffle(items);
}
/* Contents of a bonus bubble: extra ingredients (biased to the wish's needs),
 * with an occasional treat. No gold/charms — keeps the gold economy in check. */
function bonusBubbleItems(wish, n) {
  const needs = wish.needs.map(nd => nd.type);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (R.chance(0.18)) { out.push({ kind: "bubble" }); continue; } // bonus can beget bonus (chains, decays fast)
    if (R.chance(0.15)) { out.push({ kind: "treat" }); continue; }
    let ing;
    if (R.chance(0.6)) { const t = R.pick(needs); const s = DATA.INGREDIENTS.filter(x => x.qualities[0] === t); ing = R.pick(s.length ? s : DATA.INGREDIENTS); }
    else ing = R.pick(DATA.INGREDIENTS);
    out.push({ kind: "ingredient", id: ing.id });
  }
  return out;
}

/* --- Round setup -------------------------------------------------------- */
function newRound(state) {
  const customer = R.pick(DATA.CUSTOMERS);
  const diff = difficultyFor(state.servedTotal);
  const wish = generateWish(customer, diff);
  const [pmin, pmax] = BALANCE.PAYMENT_RANGE[diff];
  const payment = R.int(pmin / 10, pmax / 10) * 10;
  const scoops = Math.max(1, Math.round(payment / 10));
  const smax = BALANCE.BUBBLES_PER_SCOOP_MAX + (state.betterScoop ? 1 : 0);
  const scoopYields = [];
  for (let i = 0; i < scoops; i++) scoopYields.push(R.int(BALANCE.BUBBLES_PER_SCOOP_MIN, smax));
  let bubbles = scoopYields.reduce((a, b) => a + b, 0);
  if (bubbles < BALANCE.MIN_BUBBLES) { scoopYields[0] += BALANCE.MIN_BUBBLES - bubbles; bubbles = BALANCE.MIN_BUBBLES; }
  const haul = generateHaul(wish, bubbles, !!state.charmFinder);
  return {
    customer, wish, payment, bubblesTotal: bubbles, scoops, scoopYields, haul,
    inventory: [],           // ingredient instances drafted from popping
    charms: [],              // special charms held, ready to play in the cauldron
    slots: [],               // ingredients (and played Wild charms) in the cauldron
    maxSlots: BALANCE.MIX_SLOTS,
    treatsUsed: 0, potentNext: false, allergyOffset: 0, insight: false,
    result: null,
  };
}

/* --- Triple match: 3 identical ingredients -> 1 Potent ------------------ */
function applyTripleMatch(inventory) {
  const counts = {};
  inventory.forEach(inst => { if (!inst.wild) counts[inst.id] = (counts[inst.id] || 0) + 1; });
  const out = [], merged = [];
  inventory.filter(i => i.wild).forEach(i => out.push(i));
  Object.keys(counts).forEach(id => {
    let n = counts[id];
    while (n >= 3) { out.push({ id, potent: true }); merged.push(id); n -= 3; }
    for (let i = 0; i < n; i++) out.push({ id, potent: false });
  });
  return { inventory: out, merged };
}

/* --- Allergy meter ------------------------------------------------------ */
function allergyStatus(slots, allergyType, offset) {
  if (!allergyType) return null;
  let points = 0;
  slots.forEach(inst => {
    if (inst.wild) { if (inst.magic === allergyType) points += inst.strength; return; }
    const ing = DATA.INGREDIENT_BY_ID[inst.id];
    let p = ingredientPointsFor(ing, allergyType);
    if (p && inst.potent) p = Math.round(p * BALANCE.POTENT_MULT);
    points += p;
  });
  points = Math.max(0, points - (offset || 0));
  const zone = points >= BALANCE.ALLERGY_RED_AT ? "red" : points >= BALANCE.ALLERGY_YELLOW_AT ? "yellow" : "green";
  return { type: allergyType, points, zone };
}

/* Current green-band edges given how many ingredients are in the pot (it narrows
 * as you add more — reward for an efficient, few-ingredient mix). */
function bandFor(slotsUsed) {
  const half = Math.max(BALANCE.BAND_HALF_MIN, BALANCE.BAND_HALF_BASE - BALANCE.BAND_SHRINK_PER_ADD * slotsUsed);
  return { low: BALANCE.NEED_TARGET - half, high: BALANCE.NEED_TARGET + half };
}
function pointsForNeed(slots, type) {
  let points = 0;
  slots.forEach(inst => {
    if (inst.wild) { if (inst.magic === type) points += inst.strength; return; }
    const ing = DATA.INGREDIENT_BY_ID[inst.id];
    let p = ingredientPointsFor(ing, type);
    if (p && inst.potent) p = Math.round(p * BALANCE.POTENT_MULT * 10) / 10;
    points += p;
  });
  return points;
}
/* --- Scoring: SWEET SPOT — land each need in its green band ------------- */
function scoreMix(slots, wish, allergyOffset) {
  const band = bandFor(slots.length);
  const perNeed = wish.needs.map(need => {
    const points = pointsForNeed(slots, need.type);
    let pct;
    if (points >= band.low && points <= band.high) pct = 100;      // in the sweet spot
    else if (points < band.low) pct = Math.round(Math.pow(points / band.low, BALANCE.BELOW_BAND_POW) * 100); // ramp up (steep: reward reaching the green)
    else pct = Math.max(0, Math.round(100 - (points - band.high) * BALANCE.OVERSHOOT_K)); // curdled
    return { type: need.type, label: need.label, pct, points, bandLow: band.low, bandHigh: band.high };
  });
  const w = wish.weights;
  let weighted = 0;
  perNeed.forEach((n, i) => { weighted += n.pct * (w[i] || 0); });
  weighted = Math.round(weighted);
  return { perNeed, weighted, band, allergy: allergyStatus(slots, wish.allergy, allergyOffset) };
}

/* --- Result: match vs required, allergy payout, quick-service tip -------- */
function scoreResult(round) {
  const { weighted, allergy } = scoreMix(round.slots, round.wish, round.allergyOffset);
  const required = round.wish.requiredMatch;
  const success = weighted >= required;
  const hiddenAtServe = round.wish.needs.filter(n => !n.revealed).length;
  let type, gold, tip = 0, quickTip = 0, qualityTip = 0;
  if (!success) {
    type = DATA.RESULT_TYPES.fail;
    gold = Math.max(1, Math.round(round.payment * (weighted / 100) * BALANCE.CONSOLATION_FRACTION));
  } else {
    if (allergy && allergy.zone === "red") { type = DATA.RESULT_TYPES.red; gold = Math.round(round.payment * DATA.RESULT_TYPES.red.payoutPct); }
    else if (allergy && allergy.zone === "yellow") { type = DATA.RESULT_TYPES.yellow; gold = Math.round(round.payment * DATA.RESULT_TYPES.yellow.payoutPct); }
    else { type = DATA.RESULT_TYPES.full; gold = round.payment; }
    // quick-service tip: served with needs still secret
    if (hiddenAtServe > 0) quickTip = hiddenAtServe * BALANCE.QUICK_TIP_PER_HIDDEN;
    // perfect-potion tip: match greatly exceeds what was required
    if (weighted >= Math.min(100, required + BALANCE.QUALITY_MARGIN)) qualityTip = BALANCE.QUALITY_TIP;
    tip = quickTip + qualityTip; gold += tip;
  }
  return { type, gold, tip, quickTip, qualityTip, weighted, required, success, allergy, hiddenAtServe, partial: !success && gold > 0 };
}

/* Expose */
const ENGINE = {
  BALANCE, R, ingredientPointsFor, difficultyFor, needCountFor,
  generateWish, generateHaul, bonusBubbleItems, newRound, applyTripleMatch, scoreMix, scoreResult, allergyStatus,
};
