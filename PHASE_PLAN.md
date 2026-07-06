# Wish Pop: Bubble Shop — Phased Build Plan

This is the roadmap for building the full game described in the design document
(*Wish_Pop_Bubble_Shop.pdf*). It turns that spec into an ordered set of phases we
can build and test one at a time.

> **Note on the current live game:** the version live today is a small
> teaser/prototype (a quick bubble‑matching mini‑game). The real design is much
> larger — a multi‑step round with scooping, popping, shopping, and mixing. This
> plan **replaces** that teaser with the real game, built in stages so something
> playable stays online the whole time.

---

## What we're building (one paragraph)

Fairytale customers visit a magical bubble shop and make a wish ("I wish for…").
Each round the player: **scoops** Wish Bubbles from glitter → **pops** those
bubbles to collect charms and surprise rewards → **shops** for ingredients using
charms across four shelves → **mixes** ingredients in a cauldron to match the
customer's hidden magical needs → **serves** and gets scored → earns **gold**.
A cute **familiar** (a Toad) helps for the cost of treats. Harder customers add
**magic allergies**. Short, repeatable rounds; portrait mobile; friendly for kids.

## Guiding principles (from the spec)

- **MVP first, art later.** Build with clearly‑labeled placeholder art (colored
  shapes + text). Prove the systems work before polishing.
- **Swappable assets.** All visuals loaded through asset references so art can be
  replaced later without touching game logic.
- **Portrait, large, low‑clutter, touch‑friendly.** Simple enough for kids.
- **Never punishing.** Failure is funny and light; a daily gold grant means the
  player can always recover.
- **Keep it playable.** After each phase the full loop still runs end‑to‑end.

---

> **Progress:** ✅ Phases 0, 1 and 2 are complete. The full round loops
> end‑to‑end with real scoring, the gold economy, glitter‑sifting, and real
> bubble‑pop rewards. The ingredient shop is still a placeholder (Phase 3).

## Phase 0 — Foundation & Data (the engine room) — ✅ DONE

**Goal:** Set up the architecture and all the game data so later phases just plug in.

- **Round state machine + screen router**: `Start → Customer → Scoop → Bubble Pop
  → Ingredient Buying → Mixing → Result → (next Customer)`.
- **Asset‑reference system**: every image/icon is a labeled placeholder loaded by
  key/path, so real art drops in later with no logic changes.
- **Data tables** (as data files, not hard‑coded in logic):
  - 12 **Magic Types** (Love, Courage, Luck, Sleep, Energy, Calm, Strength,
    Beauty, Protection, Light, Growth, Mischief).
  - 5 **Charm** currencies (Pink, Blue, Gold, Green, Purple).
  - **~40 Ingredients** library with fixed hidden magic values, cost (1/3/5/7),
    shelf, 1–3 visible qualities; some shelf‑locked, some on multiple shelves
    (so they can be tripled). Charm *color* required is randomized per round;
    cost stays fixed.
  - 4 **Shelves** (Fresh, Royal, Sparkle, Backroom) with styles.
  - **Wish Types** with Main / Second / Final‑Twist need pools + example lines.
  - **Starter customers** (Gingerbread Man, Muffin Man, etc. — Drury Lane).
  - **Familiar** (Toad) + ability table. **Allergy** ideas table. **Result** types.
- **Scoring engine (headless)**: hidden magic totals → match % per need; allergy
  meter; payout tiers. Written and unit‑testable on its own.

**Done when:** data loads, the scoring engine returns correct match %/payout for
sample inputs, and you can walk the empty screen flow start→finish.

---

## Phase 1 — Core loop skeleton (clickable end‑to‑end) — ✅ DONE

**Goal:** A player can complete a whole round with placeholder screens.

- **Start Screen**: logo, big Play, gold counter, settings button.
- **Customer Screen**: portrait, name, "I wish for…" text, payment, scoops,
  required match %, Start button. Wish generation picks needs from the pools
  (repeat‑prevention: no duplicate needs, reroll if needed).
- **Result Screen**: result title, match vs. required, gold earned, Continue.
- Placeholder **Scoop/Pop/Shop/Mix** screens wired in as pass‑throughs so the
  loop connects.
- Gold persists between rounds; **daily grant** (e.g., 150) safety net.

**Done when:** you can press Play, get a customer, pass through each screen, land
on a result, earn gold, and start the next customer — repeatedly.

---

## Phase 2 — Scoop & Bubble‑Pop phases — ✅ DONE

**Goal:** The first two interactive phases feel satisfying.

- **Scoop Screen**: glitter‑sift reveal (swipe/tap), "5 Bubbles Found!", Auto‑Sift
  option. Bubble count decided by the customer's payment (min 3 on cheap rounds so
  no impossible rounds). Continue.
- **Bubble‑Pop Screen** (a "most important" screen — keep it clean): large center
  bubble, bubble queue (top‑left), pause (top‑right), charm counters (bottom),
  **Pop All** button. Popping always yields charms; may also give a bonus:
  ingredient, treat, gold, wild ingredient, or **bonus bubble** (adds to queue).
  Bonus rewards appear as **question‑mark bubbles** that pop to reveal, then fly
  to their home (charms→counters, ingredient→inventory, treat→jar, etc.).

**Done when:** scoop reveals a fair bubble count; popping fills charm counters and
routes every reward type correctly; Pop‑All works with a quick summary.

---

## Phase 3 — Ingredient shopping & wish reveals

**Goal:** Spend charms to build a round inventory, under a reveal timer.

- **Ingredient Buying Screen** (a "most important" screen): one shelf at a time,
  swipe between the 4 shelves, up to 6 cards each. Card shows icon, name, cost,
  required charm color, 1–3 qualities, wild marker. Buy = drag to inventory →
  subtract charms, add to inventory, remove from shelf ("Not enough charms" msg
  otherwise). Inventory maximize/minimize.
- **Request‑reveal timers**: Main Need shown immediately; **Second Need at 30s**;
  **Final Twist at 60s**. Tap the timer to pay gold and reveal early.
- **Speed‑bonus slots**: finish before 1st reveal → 7 slots; before 2nd → 6; full
  reveal → 5. Paying to reveal early forfeits that slot bonus.
- **Wild ingredients**: qualities hidden (`???`), highest cost, risky.

**Done when:** shelves buy/restock correctly, reveals fire on time, paying‑early
works, and the earned slot count carries into mixing.

---

## Phase 4 — Mixing, Triple‑Match & full scoring

**Goal:** The core puzzle decision — "stop now or risk one more?"

- **Triple‑Match** (auto, pre‑mixing): 3 identical ingredients → 1 **Potent**
  version, with a short animation. No menu, no choice.
- **Mixing Screen** (a "most important" screen): shows all needs + required match
  %, 5–7 ingredient slots, two‑row swipeable inventory. Drag ingredient → cauldron
  → consumes it into a slot; match % (per need) updates each time. Serve button;
  auto‑serves when slots fill; ingredients can't be removed once added.
- **Result scoring**: Full Success (100%), and Failure (0%, funny) for now
  (allergy tiers arrive in Phase 5). Tip bonus when match greatly exceeds need.

**Done when:** tripling merges correctly, match % reflects the scoring engine live,
serving produces the right result + gold, and the loop is genuinely fun to play.

---

## Phase 5 — Magic Allergy system

**Goal:** Add risk/depth for harder customers (introduced *after* the basics).

- Per‑customer **allergy** to a magic type; **allergy meter** rises as matching
  ingredients are added. Zones: **Green** (safe) → **Yellow** (75% payout) →
  **Red** (50% payout). Meter shown live in mixing.
- Result screen gains **Allergy Yellow / Allergy Red** outcomes with reduced pay
  and a funny reaction. Not used in the earliest rounds.

**Done when:** allergy meter tracks correctly and payout tiers (100/75/50/0) apply.

---

## Phase 6 — Familiar (Toad) & treats

**Goal:** The optional helper that makes rounds easier/more exciting.

- **Familiar** visible & tappable during scoop, pop, shop, and mixing phases;
  only acts when tapped; each use costs **1 treat** (max **5 uses per round**).
- **Default ability (shopping):** "Feed familiar 1 treat?" → grabs 1 random
  ingredient from the current shelf, free, removed from shelf (timer pauses during
  the prompt). "No treats left!" when empty.
- **Upgrades (bought with gold):** Better Scoop (more bubbles), Bonus‑Bubble Gift
  (bonus bubble → also a random ingredient), Undo Ingredient (remove last add; it
  disappears, doesn't return; recalc match/allergy).
- **Treats** purchasable with gold from the shop (±, up to 25 at a time; unlimited
  to own, 5 usable per round).

**Done when:** each ability triggers in its phase, treat spending is enforced, and
the 5‑per‑round cap holds.

---

## Phase 7 — Progression, economy & difficulty

**Goal:** Give the game a reason to keep playing and a smooth difficulty ramp.

- **Gold sinks**: treats, early wish reveals, familiar‑ability unlocks, (later)
  new locations. **Daily grant** so a broke player recovers.
- **Difficulty scaling**: Easy (Main only) → Medium (+Second) → Hard (+Twist,
  maybe 1 allergy) → Very Hard (2 allergies, higher required match).
- **Locations** groundwork (Drury Lane first; Royal Row, Goblin Camp, etc. later),
  unlockable with gold — data/hooks now, content later.

**Done when:** difficulty ramps sensibly across rounds and the gold economy is
balanced (not too easy, never a dead end).

---

## Phase 8 — Placeholder‑art system & Admin uploader

**Goal:** Make replacing art trivial for non‑developers.

- Confirm every visual is a labeled placeholder loaded via reference (customers:
  normal/success/fail/allergy; ingredients; shelves; familiar; cauldron; bubble
  types: normal/question/gift/bonus).
- **Admin button on the Start/home screen** to view and **upload replacement art**
  without code changes.

**Done when:** an admin can swap a placeholder for real art through the UI and it
shows up in‑game with no code edits.

---

## Phase 9 — Polish, mobile QA & release

**Goal:** Make it feel good and ship it.

- Juice: animations, particles, sound; readable large UI; portrait scaling on
  small→large phones; safe‑area/notch handling; landscape "rotate" nudge.
- Full playtest of every phase + every reward/result path on a phone‑sized screen.
- Update README + live game on `main`/`docs`.

**Done when:** the full loop plays cleanly in portrait on a phone, every path
tested, and it's live at the play URL.

---

## Suggested build order at a glance

| Phase | Focus | Player‑visible result |
|------:|-------|-----------------------|
| 0 | Foundation & data | (engine only) |
| 1 | Loop skeleton | Click through a whole round |
| 2 | Scoop & pop | Sift + pop bubbles for charms/rewards |
| 3 | Shopping & reveals | Buy ingredients under the reveal timer |
| 4 | Mix, triple, score | The real puzzle + win/lose |
| 5 | Allergies | Risk & reduced payouts |
| 6 | Familiar & treats | The Toad helper |
| 7 | Economy & difficulty | Progression + ramp |
| 8 | Art system & admin | Swappable art + uploader |
| 9 | Polish & release | Shipped, juicy, tested |

**Recommendation:** Phases 0→4 deliver the complete, genuinely fun core game.
5→9 add depth, helpers, progression, and polish. We can stop and playtest after
any phase since the loop stays playable throughout.

---

## Design decisions & assumptions (source of truth)

The design doc intentionally hides "backend stats," so several formulas/numbers
aren't specified. These are the decisions we're building on. All numbers are
**starting defaults to be tuned in playtesting** unless noted.

- **Scoring — "Harmless" mixing (decided):** only the magic types the customer
  asked for count toward the match. Off‑target/extra magic is wasted but never
  lowers the score. Allergies are the only downside risk in the mix. (Chosen for a
  simple, kid‑friendly, non‑punishing feel.)
- **Match % model:** each need gets its own 0–100% bar from the relevant magic
  accumulated vs. a per‑need target; the shown "Match %" is a weighted blend.
  **Weights: 3 needs → Main 40% / Second 30% / Final 30%; 2 needs → 60% / 40%;
  1 need → 100%.** Second and Final still swing the outcome heavily.
- **Gold economy (kid‑simple, patterned, scarce):** clean round numbers on a
  ladder (10 / 25 / 50 / 100 / 250 / 500 / 1000). Payments are modest (20–50 by
  difficulty, +10 tip) so gold accrues slowly and big sinks are a real dump.
  **Treats stay affordable (10 each)**; early reveals 25 (Second) / 50 (Twist);
  familiar ability unlocks 100 / 250 / 500; locations ~1000 (later). Daily grant
  150 so a broke player always recovers.
- **No time‑pressure fail:** the 30s/60s timers only *reveal needs* and grant
  speed‑bonus slots — letting them run out never fails the round.
- **Ingredient strengths & Potent multiplier:** assigned per ingredient (hidden);
  a tripled → Potent ingredient counts notably stronger. Tuned later.
- **Allergy meter:** each allergy‑matching ingredient raises the meter; Green/
  Yellow/Red thresholds and the 100/75/50/0% payouts tuned later.
- **Charm economy:** bubble pops grant charms (count/colors tuned) so a normal
  round can afford a viable mix without being free; guardrails prevent impossible
  or trivial rounds (e.g., cheap single‑scoop rounds still give ≥3 bubbles and a
  lower required match).
- **Bubble drop rates, scoops→bubbles curve, required‑match ranges, gold prices
  (treats / early reveals / ability unlocks / locations), and the difficulty ramp
  (1→2→3 needs, when allergies appear):** default values set now, balanced later.
- **Leftovers reset each round** (charms, bubbles, ingredients), per spec.
