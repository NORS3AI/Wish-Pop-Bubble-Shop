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

> **Progress:** ✅ Phases 0–4 are complete — the entire core game is built and
> balanced: customer → scoop → pop → shop → mix → score → gold. The mixing step
> has its final cauldron UI, triple‑match celebration, and the win/lose feel.
> Optimal‑play win rates land ~84% easy / 88% medium / 74% hard (forgiving, with
> hard clearly hardest). Next: Phase 5 adds the magic‑allergy system.

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

## Phase 3 — Ingredient shopping & wish reveals — ✅ DONE

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

## Phase 4 — Mixing, Triple‑Match & full scoring — ✅ DONE

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

## Design revision v2 (mid‑build) — make it a quick game, not a spreadsheet

Playtesting showed reading 2–3 tags per ingredient against 2–3 need bars felt like
homework. This revision keeps the depth but cuts the mental math.

### Revision A — Simpler ingredients & 1‑charm buying — ✅ DONE
- Each ingredient shows only its **one main magic quality** (`qualities[0]`); the
  rest are **hidden secondaries** that still affect scoring and are revealed only
  by the cauldron bars (preserves surprise + push‑your‑luck).
- **Every ingredient costs 1 charm** of its required (random) color — color is the
  only charm friction now. Kid‑simple.
- Rebalanced scoring (main quality +6, hidden secondary +3, need target 12) and
  added Lavender + Ginger Root so every magic type is the main quality of ≥2
  ingredients (library now 40). Shelf guarantee keys off the **visible** main
  quality so the player can always see a match.

> **Overall progress:** ✅ Phases 0–7 done (core game, revisions, allergies,
> familiar upgrades, progression). Remaining: Phase 8 (art‑upload/admin) and
> Phase 9 (polish + sound). Multi‑location maps deferred per the design's MVP note.

### Revision B — Shelf keys & per‑round unlocks — ✅ DONE
- Each round starts with **one shelf unlocked** (chosen so it stocks ≥2 visible
  main‑need ingredients); the other three start **locked**.
- Bubbles drop **shelf keys** (~32%/pop) that unlock a random locked shelf for
  this customer — the lucky‑scoop "did I get the shelf I wanted?" tension, never
  impossible since the open shelf always covers the main need.
- Pop screen shows which shelves are open and flashes unlocks; the shop shows a
  clear locked state per shelf. Simulated win rate ≈ **98/80/63%** easy/med/hard
  — easy stays forgiving, hard genuinely depends on unlocking shelves.

## Design revision v3 — Cauldron‑First pivot (✅ BUILT, supersedes the shop)

> **Status:** live. Shop & charms removed; pops draft a hand of ingredients (+
> special charms); the cauldron holds the reveal timer, quick‑service tip, and the
> charm tray. Ingredient library trimmed to 20. Smart‑player win rate ≈
> **100 / 87 / 55 / 43%** (easy/medium/hard/veryhard) — forgiving early, a real
> puzzle later, cushioned by partial credit + charms. Quick‑service tip = serve
> before the needs finish revealing **and** hit the match → gold tip (+8/hidden
> need). **All of C1–C4 complete** (data, flow, cauldron, cleanup + balance).


**Why.** Playtesting showed the shop isn't a real decision: you're told the need,
you grab matching ingredients, done. The genuinely good moments live in the
**cauldron** (limited slots, hidden effects, allergy, stop‑or‑risk) and in the
**reveal timer**. So we remove the shop and make the cauldron the whole game.

**New loop:** Start → Customer → **Scoop** (how big is my haul) → **Pop** (draft a
random‑but‑fair hand of ingredients + the occasional special charm) → **Cauldron**
(choose what to use, play charms, race the reveal timer, dodge the allergy, decide
when to stop) → Result.

### What's removed
- The **Shop phase**, **charms‑as‑currency**, **shelves**, **shelf‑keys**, the
  **reroll**, and the Toad's shop grab/key‑find. "Bonus Gift" upgrade retires
  (every pop already gives an ingredient); "Undo" becomes a special charm.

### What's new
- **Pop → ingredients.** Each pop yields an **ingredient** (dupes possible), with
  the occasional **special charm**, gold, or treat mixed in. Drops are **biased
  toward the customer's needs** so a hand is always attemptable (no impossible
  rounds), and the hand is a **surplus** (more ingredients than slots) so the real
  decision is *what to leave out* and *when to stop*.
- **Special charms** — a small set (~4–5) of clear, mostly‑deterministic power‑ups
  you pop from bubbles and **play in the cauldron** (a little tray; tap to use):
  🧹 **Cleanse** (allergy meter down) · 🔍 **Insight** (reveal an ingredient's
  hidden effects) · ✨ **Potent** (next ingredient counts double) · ⏭️ **Peek**
  (reveal the next need now) · 🌈 **Wild** (one mystery/gamble). These are the main
  new source of cauldron depth.
- **Reveal timer moves into the cauldron.** Main need shown immediately; second /
  final needs reveal over a short timer. **Quick‑Service Tip:** if you **serve
  early** (before the needs finish revealing) **and the potion meets or exceeds the
  required match**, you earn a **gold tip** (bigger the earlier you serve). Miss the
  match → no tip. Potion is scored against *all* needs at serve, revealed or not —
  so serving early is a real gamble that your mix already covers the hidden needs.
- **Trim ingredients ~40 → ~20**, keeping ≥1–2 whose *main* magic is each type
  (for winnable biased hands). Fewer, more memorable ingredients → players learn
  them, and duplicates come up more often (feeds triple‑match/Potent).

### What's kept
Allergies, partial credit ("So Close!"), triple‑match → Potent, hidden secondaries,
needs weighting (40/30/30…), difficulty ramp incl. veryhard, the Shop & Upgrades
**menu** (treats, Toad upgrades, daily gift), and the gold economy (gold still buys
treats/upgrades — it just no longer buys ingredients). **Better Scoop** upgrade
still applies (more bubbles = more ingredients).

### Build order (each step testable)
1. **C1 – Data:** trim ingredient library to ~20 (keep per‑type main coverage);
   define the special‑charm set; retire the charm‑currency object.
2. **C2 – Flow:** delete the shop screen; make Pop grant ingredients (biased,
   dupes) + special charms; route Pop → Cauldron directly.
3. **C3 – Cauldron:** move the reveal timer here + Quick‑Service Tip; add the
   special‑charm tray and effects; keep allergy/partial/triple/stop‑or‑risk.
4. **C4 – Cleanup & balance:** retire shelves/keys/reroll/shop‑Toad; rework the
   Toad upgrades & menu copy; re‑simulate hand fairness, tip economy, win curve.

**Success test:** a round is a real decision (surplus hand, leave‑outs, charm
timing, serve‑early gamble), always attemptable, and faster than the shop loop.

---

## Design revision v4 — Sweet Spot cauldron (✅ BUILT)

Playtest: "it tells us the need, we click the matching ingredient" was still too
shallow, and the round was too fast. Fix = give the mix a real decision:

- **Sweet Spot:** each need wants magic in a **green target band**, not "as much as
  possible." Land in the band = perfect; **overfill past it and the bar curdles**
  (its % drops), so you can't just dump matching ingredients. Small ingredient
  chunks make the amount controllable; duplicates become "add one more or stop?"
- **The band shrinks as you add ingredients** (visible on screen) — an efficient
  few‑ingredient mix is easier; overpacking makes precision hard. Rewards restraint.
- **Hidden needs:** only the **main** need is shown. The other two are **Mystery
  bars** you *discover* by feeding them (a bar reveals the moment an ingredient
  moves it) — or on the reveal timer. Ingredients stay labeled (your foothold).
- **Fatter hand:** more ingredient drops per round so there's a real surplus to
  choose from and leave out.
- Kept the quick‑service tip (serve while needs still secret + hit the match).
- Balance (smart stop‑at‑band player): win ≈ **95 / 87 / 59 / 57%**
  (easy/medium/hard/veryhard); avg ingredients *used* 1.7→5.4 (players stop, not
  dump). Tunables in `BALANCE` (band base/shrink/min, target, overshoot).
- **Deferred (not killed):** a match‑3 acquire mini‑game — revisit only if the pop
  phase still feels passive after this. Rejected the crystal‑ball probe (hands you
  the answer) and per‑ingredient pour QTEs (realism zoo, not worth it).

### v4.1 — playtest polish (✅ BUILT)
Direct fixes from the next playtest:
- **Removed the reveal timers.** A Mystery bar now stays secret until you **play an
  ingredient whose *main* magic is that hidden need** (a Wild charm's magic counts).
  No more "wait and it appears" — discovery is an action, not a clock.
- **In‑green clarity.** A bar that lands in its band shows **“✓ in the green!”**, a
  green fill, and a glow/pulse (`.meter.sweet.hit`) so hitting the zone is obvious;
  overfilled bars read **“overfilled!”** in red.
- **Fewer slots, fatter hand:** cauldron slots 8 → **6**; every haul now guarantees
  **2 main‑need ingredients** and drops more overall (avg hand ≈ 5.6 / 6.8 / 8.4 /
  10.1), so you're never stuck short of the right magic.
- **Perfect‑potion tip:** beating the required match by ≥ `QUALITY_MARGIN` (20) pays
  a **+10 “Perfect potion!”** bonus on top of the quick‑service tip — fixes the
  "100% mix, 80% needed, no reward" complaint.
- Balance (smart stop‑at‑band player): win ≈ **100 / 98 / 69 / 59%**
  (easy/medium/hard/veryhard). Easy/medium are intentionally winnable tutorial
  tiers; the shrinking band + hidden needs make hard/very‑hard the real puzzle.

---

## Phase 5 — Magic Allergy system — ✅ DONE
Hard customers may be **allergic** to a magic type (never one of their needs;
themed per customer where defined). A live **allergy meter** in the cauldron
rises as that magic accumulates — including from ingredients' *hidden* secondaries,
so a "safe-looking" ingredient can secretly push it up. Zones: Green (full pay) →
Yellow (75%) → Red (50%). The customer screen and shop reveal both warn of the
allergy. Win/lose is unchanged (allergy only affects payout on a success), so the
difficulty curve holds. Thresholds/chance live in `BALANCE`.


**Goal:** Add risk/depth for harder customers (introduced *after* the basics).

- Per‑customer **allergy** to a magic type; **allergy meter** rises as matching
  ingredients are added. Zones: **Green** (safe) → **Yellow** (75% payout) →
  **Red** (50% payout). Meter shown live in mixing.
- Result screen gains **Allergy Yellow / Allergy Red** outcomes with reduced pay
  and a funny reaction. Not used in the earliest rounds.

**Done when:** allergy meter tracks correctly and payout tiers (100/75/50/0) apply.

---

## Phase 6 — Familiar (Toad) & treats — ✅ DONE
Shop & Upgrades menu (from Start): buy treats (± up to 25, 10g each), unlock the
three Toad upgrades with gold, and claim a daily gift (150g/day). Abilities:
**Better Scoop** (passive, +1 max bubble per scoop), **Bonus Gift** (passive, a
bonus bubble also grants a random ingredient), **Undo** (mix: spend a treat to
remove the last ingredient). The default shelf‑grab / key‑find (from the recovery
kit) is free. Treats cap at 5 uses/round.

---

## Phase 7 — Progression, economy & difficulty — ✅ (core done)
Gold sinks in place (treats, three upgrade unlocks, pay‑to‑reveal, reroll is free)
plus a **daily gift** so a player can always recover. Difficulty ramp extended with
a **veryhard** tier (customer 11+: 3 needs, 80% required, always allergic; sim win
~34% — a genuine ceiling, cushioned by partial credit + recovery tools). **Multi‑
location maps are intentionally deferred** per the design doc's MVP guidance ("do
not build a full map yet"); Drury Lane is the single location, with the data/menu
groundwork noting more are coming.


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
- **Balance tuning (Phase 4, playtest‑verified via simulation):** per‑need target
  7 magic points; ingredient strength 3–4 per quality; potent ×2.5. Charms come
  as two colored stacks (2–3 each) per pop so specific‑color ingredients are
  affordable; min 4 bubbles/round. Added 6 Strength‑bearing ingredients (library
  now 38) because no ingredient supplied Strength, which some wishes require.
  Numbers live in `BALANCE` in `engine.js` and can be re‑tuned freely.
- **Anti‑helpless recovery kit (playtest fix):** a no‑key round used to be a
  near‑guaranteed, un‑preventable loss (hard: ~8% win, ~19% of rounds). Added
  three player‑agency tools so bad luck is recoverable, not a wall:
  1. **Shelf reroll** — one free restock per shelf per round.
  2. **Toad familiar (shop):** spend 1 treat to grab an ingredient here, or — if
     shelves are still locked — a 50% chance to **find a key** and open one. Turns
     the treats you earned into the keys you lacked. Lifts hard no‑key win rate
     from ~8% to ~47% when used.
  3. **Partial credit** — a miss still pays a few coins scaled to how close you
     got (`CONSOLATION_FRACTION`), so no round is ever a flat zero. Result reads
     "So Close!" instead of a hard fail.
- **Budget & shop tuning (playtest fix):** ingredients cost **2 charms** (flat,
  still uniform) so you can afford only ~half the shelf and must choose — you can
  afford *everything* in only ~4–12% of rounds now (was 41–54%). The shop only
  shows **unlocked** shelves (locked ones are hidden, with a "N shelves stayed
  locked" note) so you don't waste time paging past them.
- **Randomized bubbles (playtest fix):** each scoop now rolls its OWN yield
  (1–4 bubbles) and they sum, so more scoops (higher pay) genuinely means more
  bubbles and every reveal varies — no more a flat ~5. Bubble totals ≈ easy 3–8,
  medium 3–12, hard 5–16. Per‑pop charm (1–2) and key chance (0.15) were lowered
  to keep the economy balanced given the extra pops. Sim win rate ≈ **97/87/60%**
  (easy/medium/hard) with ~1.8–2.4 of 4 shelves unlocked (key tension intact).
