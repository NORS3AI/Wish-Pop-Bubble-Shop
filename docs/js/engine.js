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
  ALLERGY_CHANCE: 0.55, ALLERGY_YELLOW_AT: 2, ALLERGY_RED_AT: 4, ALLERGY_CLEANSE: 3,
  ALLERGY_BAIT_CHANCE: 0.42,     // chance a filler ingredient carries the allergy magic (keeps it a live risk)
  SNEEZE_AT: 15,                 // >this many ingredients into the cauldron → the customer sneezes up a new allergy
  BOSS_EVERY: 5,                 // every Nth customer is a picky VIP "boss"
  BOSS_REQUIRED_BONUS: 12,       // boss needs a much higher match
  BOSS_BAND_TIGHT: 0.5,          // boss green zones are this fraction as wide (very picky — potent overshoots!)
  BOSS_SHRINK_MULT: 2.2,         // boss green zones shrink this much faster as you add — punishes over-mixing
  BOSS_PAYMENT_MULT: 1.7,        // boss pays more (bigger reward)
  BOSS_SCOOP_MIN_BONUS: 2, BOSS_SCOOP_MAX_BONUS: 4, // boss has a BIGGER scoop (more bubbles per scoop), not more scoops
  BOSS_SLOTS: 4,                 // boss cauldron has FEWER slots — abundance can't trivialize the tight band

  // Scoop / bubbles — each scoop rolls its own yield; each bubble = one haul item.
  BUBBLES_PER_SCOOP_MIN: 2, BUBBLES_PER_SCOOP_MAX: 4, MIN_BUBBLES: 8,
  JACKPOT_CHANCE: 0.0125,      // a rainbow scoop: extra-full + a guaranteed charm (~1 in 80 scoops)

  // Haul composition — mostly ingredients now (fatter hand)
  CHARM_DROP_CHANCE: 0.08, CHARM_DROP_CHANCE_FINDER: 0.16, // with "Charm Finder" upgrade
  CHARM_CAPS: { cleanse: 1, insight: 1, peek: 2 },         // per-round caps (potent/wild uncapped)
  GOLD_DROP_CHANCE: 0.06, TREAT_DROP_CHANCE: 0.025,
  BONUS_BUBBLE_CHANCE: 0.12,            // a bubble that pops into MORE (golden) bubbles
  BONUS_SPAWN_MIN: 2, BONUS_SPAWN_MAX: 3, // how many extra golden bubbles a bonus yields (feels rewarding)
  BONUS_MAX_SPAWN: 12,                  // normal per-round cap (chains stay modest, decay fast)
  BONUS_CHAIN_CHANCE: 0.15,            // normal re-bonus chance (sub-critical → dies down)
  BONUS_FRENZY_CHANCE: 0.12,           // per-round: a rare "bonus frenzy" with a runaway chain
  BONUS_MAX_FRENZY: 24,                // frenzy cap (crazy spawns, but bounded)
  BONUS_CHAIN_FRENZY: 0.5,             // frenzy re-bonus chance (super-critical → explodes to the cap)
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

  // Wishing Well (gold sink + cosmetic gamble). You always get SOMETHING; the
  // tier is the gamble. Weights are relative and need not sum to 100.
  WELL_COST: 200,               // gold per toss
  STARDUST_SKIN_COST: 120,      // Stardust to buy any specific skin directly (pity path)
  WELL_TIERS: [
    { id: "fizzle",  weight: 38, gold:   [40, 90]  }, // a little gold back (a net loss — the sting)
    { id: "treats",  weight: 25, treats: [3, 6]     }, // a handful of treats
    { id: "stardust",weight: 22, dust:   [25, 45]   }, // Stardust toward a guaranteed skin
    { id: "skin",    weight: 15, dustIfOwnAll: 80    }, // a NEW random skin (or big Stardust if you own them all)
  ],

  // Trash (failure consolation): a FAILED wish pays NO coins — instead the
  // disgruntled customer throws junk you collect and later recycle.
  TRASH_BIN_MAX: 30,            // collection capacity
  TRASH_MIN: 2, TRASH_MAX: 4,  // pieces thrown per failed wish
  TRASH_DUST_DIVISOR: 6,       // Stardust value = round(coins / this)
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
function generateWish(customer, diff, isBoss) {
  const wt = DATA.WISH_TYPES[customer.wishType];
  const count = isBoss ? 3 : needCountFor(diff);       // boss always wants all three
  const pools = [wt.main, wt.second, wt.twist];
  const chosen = [];
  for (let i = 0; i < count; i++) {
    const options = pools[i].filter(m => !chosen.includes(m));
    chosen.push(options.length ? R.pick(options) : R.pick(pools[i]));
  }
  const labels = ["Main Need", "Second Need", "Final Twist"];
  const needs = chosen.map((type, i) => ({ type, label: labels[i], target: BALANCE.NEED_TARGET, revealed: i === 0 }));
  const pickAllergy = forbidden => {
    let a = DATA.ALLERGY_IDEAS[customer.id];
    if (!a || forbidden.includes(a)) a = R.pick(DATA.MAGIC_TYPES.filter(m => !forbidden.includes(m)));
    return forbidden.includes(a) ? null : a;
  };
  let allergy = null, allergy2 = null;
  if (isBoss) {
    // a picky VIP: two allergies from the start
    allergy = pickAllergy(chosen);
    allergy2 = pickAllergy(chosen.concat(allergy ? [allergy] : []));
  } else if (diff === "hard" || diff === "veryhard") {
    if (diff === "veryhard" || R.chance(BALANCE.ALLERGY_CHANCE)) allergy = pickAllergy(chosen.slice());
  }
  const requiredMatch = BALANCE.REQUIRED_MATCH[diff] + (isBoss ? BALANCE.BOSS_REQUIRED_BONUS : 0);
  return { needs, requiredMatch, difficulty: diff, weights: BALANCE.NEED_WEIGHTS[count], allergy, allergy2,
    boss: !!isBoss, bandTight: isBoss ? BALANCE.BOSS_BAND_TIGHT : 1,
    bandShrink: BALANCE.BAND_SHRINK_PER_ADD * (isBoss ? BALANCE.BOSS_SHRINK_MULT : 1) };
}

/* --- Haul: the hand of items popped from bubbles ------------------------
 * Biased toward the customer's needs (always attemptable), with duplicates,
 * plus occasional special charms / gold / treats. Length === bubbleCount.
 * ---------------------------------------------------------------------- */
// Pick a charm id that respects the per-round caps (cleanse 1, insight 1, peek 2;
// potent/wild uncapped). Returns null only if literally nothing is available.
function drawCharm(items) {
  const held = {};
  items.forEach(it => { if (it.kind === "charm") held[it.id] = (held[it.id] || 0) + 1; });
  const pool = DATA.SPECIAL_CHARM_IDS.filter(id => (held[id] || 0) < (BALANCE.CHARM_CAPS[id] || Infinity));
  return pool.length ? R.pick(pool) : null;
}
// Pick a charm id from a list of already-held charm ids, respecting caps (for the
// jackpot reward, which is awarded straight into the tray).
function pickCappedCharm(heldIds) {
  const held = {}; (heldIds || []).forEach(id => held[id] = (held[id] || 0) + 1);
  const pool = DATA.SPECIAL_CHARM_IDS.filter(id => (held[id] || 0) < (BALANCE.CHARM_CAPS[id] || Infinity));
  return pool.length ? R.pick(pool) : "potent"; // potent/wild are uncapped, so always a fallback
}
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
      const id = drawCharm(items);
      if (id) items.push({ kind: "charm", id }); else items.push(ingItem(R.pick(mainSources))); // capped out → give an ingredient
    }
    else if (r < charmChance + BALANCE.GOLD_DROP_CHANCE) items.push({ kind: "gold", amt: R.int(BALANCE.GOLD_MIN, BALANCE.GOLD_MAX) });
    else if (r < charmChance + BALANCE.GOLD_DROP_CHANCE + BALANCE.TREAT_DROP_CHANCE) items.push({ kind: "treat" });
    else if (r < charmChance + BALANCE.GOLD_DROP_CHANCE + BALANCE.TREAT_DROP_CHANCE + BALANCE.BONUS_BUBBLE_CHANCE) items.push({ kind: "bubble" });
    else {
      let ing = null;
      // sometimes draft a "tempting but risky" ingredient: it serves a need (so you
      // want it) yet secretly carries the allergy magic — the real allergy risk.
      if (wish.allergy && R.chance(BALANCE.ALLERGY_BAIT_CHANCE)) {
        const s = DATA.INGREDIENTS.filter(i => needs.includes(i.qualities[0]) && i.qualities.includes(wish.allergy));
        if (s.length) ing = R.pick(s); // main = a need (full value), allergy only a hidden +1 secondary
      }
      if (!ing) {
        if (R.chance(BALANCE.NEED_BIAS)) { const t = R.pick(needs); const s = DATA.INGREDIENTS.filter(i => i.qualities[0] === t); ing = R.pick(s.length ? s : DATA.INGREDIENTS); }
        else ing = R.pick(DATA.INGREDIENTS);
      }
      items.push(ingItem(ing));
    }
  }
  return R.shuffle(items);
}
/* Contents of a bonus bubble: extra ingredients (biased to the wish's needs),
 * with an occasional treat. No gold/charms — keeps the gold economy in check. */
function bonusBubbleItems(wish, n, chainChance) {
  const needs = wish.needs.map(nd => nd.type);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (chainChance && R.chance(chainChance)) { out.push({ kind: "bubble" }); continue; } // bonus can beget bonus (caller controls the rate + cap)
    if (R.chance(0.06)) { out.push({ kind: "treat" }); continue; }
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
  const isBoss = ((state.servedTotal || 0) + 1) % BALANCE.BOSS_EVERY === 0;
  const wish = generateWish(customer, diff, isBoss);
  const [pmin, pmax] = BALANCE.PAYMENT_RANGE[diff];
  let payment = R.int(pmin / 10, pmax / 10) * 10;
  const scoops = Math.max(1, Math.round(payment / 10));   // scoop COUNT from base payment (boss keeps a normal count)
  if (isBoss) payment = Math.round(payment * BALANCE.BOSS_PAYMENT_MULT / 10) * 10; // boss reward boosted after
  // boss has a BIGGER scoop (more bubbles per scoop), not more scoops
  const smin = BALANCE.BUBBLES_PER_SCOOP_MIN + (isBoss ? BALANCE.BOSS_SCOOP_MIN_BONUS : 0);
  const smax = BALANCE.BUBBLES_PER_SCOOP_MAX + (state.betterScoop ? 1 : 0) + (isBoss ? BALANCE.BOSS_SCOOP_MAX_BONUS : 0);
  const scoopYields = [];
  for (let i = 0; i < scoops; i++) scoopYields.push(R.int(smin, smax));
  let bubbles = scoopYields.reduce((a, b) => a + b, 0);
  if (bubbles < BALANCE.MIN_BUBBLES) { scoopYields[0] += BALANCE.MIN_BUBBLES - bubbles; bubbles = BALANCE.MIN_BUBBLES; }
  // Jackpot scoops: rainbow glitter, extra-full (+2 bubbles). The guaranteed charm
  // is awarded directly at the scoop reveal (see UI), not hidden in the haul.
  const scoopJackpots = scoopYields.map(() => R.chance(BALANCE.JACKPOT_CHANCE));
  scoopJackpots.forEach((j, i) => { if (j) scoopYields[i] += 2; });
  bubbles = scoopYields.reduce((a, b) => a + b, 0);
  const haul = generateHaul(wish, bubbles, !!state.charmFinder);
  // Rare "bonus frenzy" round: seed a couple of bonus bubbles so the runaway chain
  // reliably kicks off (otherwise it depends on the haul happening to have one).
  const bonusFrenzy = R.chance(BALANCE.BONUS_FRENZY_CHANCE);
  if (bonusFrenzy) {
    let seeded = 0;
    for (let i = 0; i < haul.length && seeded < 2; i++) {
      if (haul[i].kind === "ingredient") { haul[i] = { kind: "bubble" }; seeded++; }
    }
  }
  return {
    customer, wish, payment, bubblesTotal: bubbles, scoops, scoopYields, scoopJackpots, haul,
    inventory: [],           // ingredient instances drafted from popping
    charms: [],              // special charms held, ready to play in the cauldron
    slots: [],               // ingredients (and played Wild charms) in the cauldron
    maxSlots: isBoss ? BALANCE.BOSS_SLOTS : BALANCE.MIX_SLOTS,
    bonusSpawned: 0,         // running count of bonus-spawned bubbles (hard-capped)
    bonusFrenzy,             // rare rounds get a runaway chain
    stats: { scooped: bubbles, popped: 0, ingredients: 0, charms: 0, gold: 0, treats: 0, triples: 0 },

    treatsUsed: 0, potentNext: false, allergyOffset: 0, insight: false,
    result: null,
  };
}

/* --- Triple match: 3 identical ingredients -> 1 Potent ------------------ */
function applyTripleMatch(inventory) {
  const counts = {};
  inventory.forEach(inst => { if (inst.id && !inst.wild && !inst.essence) counts[inst.id] = (counts[inst.id] || 0) + 1; });
  const out = [], merged = [];
  inventory.filter(i => i.wild || i.essence).forEach(i => out.push(i)); // pass wild + essences through untouched
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
    if (inst.essence) { if (inst.magic === allergyType) points += BALANCE.MAIN_POWER * (inst.potent ? BALANCE.POTENT_MULT : 1); return; }
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
function bandFor(slotsUsed, tight, shrink) {
  let half = Math.max(BALANCE.BAND_HALF_MIN, BALANCE.BAND_HALF_BASE - (shrink || BALANCE.BAND_SHRINK_PER_ADD) * slotsUsed);
  half *= (tight || 1); // boss customers get narrower green zones
  return { low: BALANCE.NEED_TARGET - half, high: BALANCE.NEED_TARGET + half };
}
function pointsForNeed(slots, type) {
  let points = 0;
  slots.forEach(inst => {
    if (inst.wild) { if (inst.magic === type) points += inst.strength; return; }
    if (inst.essence) { if (inst.magic === type) points += BALANCE.MAIN_POWER * (inst.potent ? BALANCE.POTENT_MULT : 1); return; }
    const ing = DATA.INGREDIENT_BY_ID[inst.id];
    let p = ingredientPointsFor(ing, type);
    if (p && inst.potent) p = Math.round(p * BALANCE.POTENT_MULT * 10) / 10;
    points += p;
  });
  return points;
}
/* --- Scoring: SWEET SPOT — land each need in its green band ------------- */
function scoreMix(slots, wish, allergyOffset) {
  const band = bandFor(slots.length, wish.bandTight, wish.bandShrink);
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
  const allergies = [wish.allergy, wish.allergy2].filter(Boolean)
    .map(tp => allergyStatus(slots, tp, allergyOffset)).filter(Boolean);
  return { perNeed, weighted, band, allergies, allergy: allergies[0] || null };
}
/* pick a NEW allergy magic for the "over-abundant round" sneeze: not a need, not an
 * existing allergy, and not a MAIN quality of any held ingredient (so it doesn't
 * overlap with what you're already holding). Returns the added type, or null. */
function addSneezeAllergy(wish, heldIds) {
  const forbidden = new Set(wish.needs.map(n => n.type));
  if (wish.allergy) forbidden.add(wish.allergy);
  if (wish.allergy2) forbidden.add(wish.allergy2);
  (heldIds || []).forEach(id => { const ing = DATA.INGREDIENT_BY_ID[id]; if (ing) forbidden.add(ing.qualities[0]); });
  const options = DATA.MAGIC_TYPES.filter(m => !forbidden.has(m));
  if (!options.length) return null;
  const pick = R.pick(options);
  if (!wish.allergy) wish.allergy = pick; else if (!wish.allergy2) wish.allergy2 = pick; else return null; // never overwrite
  return pick;
}

/* --- Result: match vs required, allergy payout, quick-service tip -------- */
function scoreResult(round) {
  const { weighted, allergies } = scoreMix(round.slots, round.wish, round.allergyOffset);
  const required = round.wish.requiredMatch;
  const success = weighted >= required;
  const hiddenAtServe = round.wish.needs.filter(n => !n.revealed).length;
  const needCount = round.wish.needs.length;
  const tidy = round.slots.length <= needCount + 1; // efficient serve (scales with needs)
  // worst zone across all allergies drives the payout; note which magic reacted
  const worst = allergies.reduce((acc, a) => a.zone === "red" ? "red" : (a.zone === "yellow" && acc !== "red" ? "yellow" : acc), "green");
  const reacting = allergies.find(a => a.zone === worst && worst !== "green") || allergies[0] || null;
  let type, gold, tip = 0, quickTip = 0, qualityTip = 0, trash = [];
  if (!success) {
    // FAIL: no coins at all — the disgruntled customer throws trash instead.
    type = DATA.RESULT_TYPES.fail; gold = 0;
    const n = R.int(BALANCE.TRASH_MIN, BALANCE.TRASH_MAX);
    for (let i = 0; i < n; i++) trash.push(R.pick(DATA.TRASH).id);
  } else if (worst === "red") {
    type = DATA.RESULT_TYPES.red; gold = Math.round(round.payment * DATA.RESULT_TYPES.red.payoutPct); // no tips — they reacted!
  } else if (worst === "yellow") {
    type = DATA.RESULT_TYPES.yellow; gold = Math.round(round.payment * DATA.RESULT_TYPES.yellow.payoutPct);
  } else {
    type = DATA.RESULT_TYPES.full; gold = round.payment;
    // tips only on a clean win (no allergy reaction)
    if (tidy) quickTip = needCount * BALANCE.QUICK_TIP_PER_HIDDEN; // efficient serve: bonus scales with needs
    if (weighted >= Math.min(100, required + BALANCE.QUALITY_MARGIN)) qualityTip = BALANCE.QUALITY_TIP;
    tip = quickTip + qualityTip; gold += tip;
  }
  return { type, gold, tip, quickTip, qualityTip, trash, weighted, required, success, allergy: reacting, allergies, hiddenAtServe, partial: false };
}

/* Expose */
const ENGINE = {
  BALANCE, R, ingredientPointsFor, difficultyFor, needCountFor,
  generateWish, generateHaul, bonusBubbleItems, pickCappedCharm, addSneezeAllergy, newRound, applyTripleMatch, scoreMix, scoreResult, allergyStatus,
};
