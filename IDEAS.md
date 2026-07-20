# Wish Pop — Idea Parking Lot

A running list of design ideas we've talked about but haven't built yet.
Nothing here is final — it's just a place so we don't forget the good stuff.
Newest ideas near the top. When something ships, move it to "Done / shipped".

---

## 🆕 Frozen Realm — thawing (melting) ingredients with a decay timer

**The mechanic (owner's):** an ice/snow realm where **some** ingredients arrive **frozen**
and carry a **thaw timer**. As a frozen piece melts it **loses potency** over time
(Potent → normal → down toward a pinch). If you **don't use it in time**, it melts all the
way into a **rotten-fruit-type puddle** — no good magic, and **allergy-ridden** (reuses
Lady Gothel's rot/allergy plumbing). **Randomized — not every ingredient**, just a spice.

**The clever bit (owner):** the decay is a **tool, not just a penalty**. If a need only
wants a *little* magic, you can **deliberately wait** for a frozen piece to thaw down to
~a pinch's worth, then drop it in at exactly the strength you need — a natural anti-overshoot
play. Same "downside-as-tool" depth that makes the copycat's minus and the rush bonus fun.

**Presentation (owner):** frozen/timed pieces **sort to the far LEFT of the tray** — ahead
of even infused and potent ingredients — so the player is always *aware* which pieces are on
a clock. The realm also **brings back the frozen infused ingredient (Frost Gem)** that
**freezes a need bar** (locks it, can't curdle) as its signature infused.

**Why I like it:** thematically airtight (thaw = urgency without a hard round timer), and it
**reuses systems we already have** — potency tiers, the rot/allergy curse (rotten flag +
rotQualities), and the Frost Gem infused. Low build risk, high flavor.

**Refinements / open questions (mine):**
- **Timer model — decide first.** Real-time wall-clock (frantic) vs **per-action** (melts
  one stage each time you place *any* ingredient — calmer, more strategic, easier to reason
  about). Leaning per-action or a *slow* wall-clock, and it should **only run during the MIX
  phase** (freeze during scoop/pop and between phases) so you're never punished for time you
  couldn't act on.
- **Clear stages + telegraph:** Frozen (Potent) → Thawing (normal) → Slushy (½/pinch) →
  Puddle (rotten + allergy). Show a **melt indicator** (frost coating that recedes / a drip /
  a shrinking ring) so "wait for the pinch" is a **deliberate read, not a gamble**.
- **Keep it 1–2 per round** so it's a spice, not a stressor — and watch overlap with the
  In-a-Rush clock (don't stack too many live timers at once).
- **Frost Gem synergy:** let a Frost Gem also **re-freeze** a thawing piece (pause/reset its
  timer) — a lovely realm-specific combo, and a reason to hold the gem.
- **Optional skill bonus:** small reward for using a piece at the *exact* stage a need wanted
  (rewards reading the melt).

**Status:** idea / backlog — not built. Good candidate for the ice realm whenever we get there.

---

## 🆕 Realm progression = clear N events, THEN pay to unlock (pacing backbone)

**The structure (owner's):** regular customers flow, and every **~8–12 customers** an
**event** fires (villain / hazard / minigame / crash — whatever the realm offers). Each
realm has a set number of events (**X**) you must play through. Clear all X → the next
realm **"opens up"** → *then* you spend saved **keys + gold** to actually enter it.

**Why it works:** paces the realm by *content experienced*, not a gold grind. Players
can't rush past a realm before seeing it (event gate), and can't get stuck grinding long
after boredom (the currency you'll have saved by clearing X events ≈ the unlock cost, so
it's a satisfying "spend your savings" moment, not a wall). The event tally IS the
"novelty meter."

**Details / refinements:**
- **Scale X per realm.** Fewer to clear the *first* realm (~3 → opens in ~1 hr, the hook),
  more later (~5 → 7 → …). Matches "fast first door, escalate later."
- **Last event = a realm finale/boss** (Cursed King, Evil Queen ransom, etc.). Gives each
  realm an arc: meet the locals → escalating events → boss finale → door opens.
- **PRINCIPLE — finales are NOT hard mode** (owner, confirmed). A must-win gate must stay
  beatable by casual players (accessible difficulty). The brutal/hard versions of a minigame
  live in the **practice shops** (easy/med/hard), never in the finale itself.
- **Vary events within a realm** — 5 events should be 5 *different* ones, not the same
  crash ×5. Each realm gets a themed event pool.
- **"Must play," not "must win"** for regular events — attempting counts toward the tally
  win or lose. The ONE exception is the **finale boss**, which drops a **Realm Key** (see
  unlock model below) and must be won — but it's **freely retryable**, no lost progress,
  beatable with persistence. "Must win *eventually*," never "win first try or you're stuck."
- **Three-part unlock ritual:** open a realm with **gold** (the grind) + **gold keys**
  (exploration/bubbles) + a **Realm Key** (from the must-win finale = mastery). Keep the
  gold/key cost modest so the finale is the real gate, not a double-wall.
- **Progress tracker — keep it OFF the gameplay screen.** A naked "3/5 events" bar during
  play reframes serving customers as boring filler between events (the thing we must avoid).
  Instead: show progress **on the map**, framed as **story/chapters or an illustrated path
  that fills in** as you experience events — discovery, not a quota. Could even hide the
  exact count and just tease "keep serving to uncover its secrets." The core loop being fun
  on its own is what keeps events a *spice*, not a leash.
- **Event spacing** jittered within the window (~8–12 customers), not a rigid metronome.

**Missable event skins (e.g. Cinderella at King's Courtyard) — never permanently lost.**
Two-layer safety net so a loss is "not yet," never "gone forever":
1. **The event reliably recurs until you win its skin.** After a loss, bump its reappearance
   odds (or guarantee it returns within X customers) so it's a few tries, not RNG grinding.
   Once won, it stops being a stakes-event (may still visit for flavor).
   - **Balance (owner):** a recurring skin event must NOT crowd out the other events the
     player still needs to complete the realm. Don't let "keep retrying Cinderella" starve
     their progress toward the realm finale. So: interleave — recurring skin events share the
     event slots with required story events, never monopolize them (e.g. a required story
     event always takes priority when one is still unplayed, or they alternate). Don't punish
     the player for chasing a skin.
2. **Stardust pity path.** Once you've encountered the event, the skin becomes buyable for
   Stardust (`STARDUST_SKIN_COST` already exists) — so no cosmetic is ever permanently
   missable. Skin events count toward the event tally win-or-lose.

**Current numbers for reference (to tune against):** customers pay ~20–60 gold (+tips/
streak), Courtyard currently gates at 3,000 gold + 10 keys ≈ ~65–75 customers ≈ ~2–3 hrs.
For a *first* unlock that's a touch slow — nudge it down (~1,800–2,000 gold / 5–6 keys) so
the first realm opens in ~1 hr and players learn early that the game opens up.

**Build note:** the event scheduler already exists (`maybeEvent()` fires on a timer,
`GAME.nextEventAt` tracks it). New parts: count events-cleared per realm, gate the realm
unlock on that count, then allow the gold/key purchase.

**Build status (WIRED END-TO-END for Willow → Courtyard, v128; Courtyard finale built v129):**
- ✅ Events fire ~every 10 customers (`EVENT_EVERY` 30→10). First `eventsNeeded-1` are regular
  story events (count win-or-lose, capped so they can't complete the story). The last slot is
  the **finale**.
- ✅ Willow's finale = the **wolf** (forced Easy, must-win, freely retryable). Winning grants a
  **Realm Key** (`GAME.finaleWon.willow`) + completes the story. Reachable naturally once story
  events are done, or via Admin ("🔑 Willow Finale").
- ✅ Map unlock now **gated on the Realm Key**: Courtyard needs gold + keys + Willow's finale
  beaten (`unlock.keyFrom`). Shown + enforced.
- ✅ Courtyard's finale = **Rescue the Feast** (catch-and-sort, v129 — see spec below). Forced Easy,
  must-win, retryable; winning grants `GAME.finaleWon.courtyard`. Reachable naturally once
  Courtyard's 4-event story is done, or via Admin ("🔑 Courtyard Finale").
- ✅ Beanstalk's finale = **Sky-High Savings** (Sky-Burger-style coin stacker, v131 — spec below).
  Forced Easy, must-win, retryable; winning grants `GAME.finaleWon.beanstalk`. Admin: "🔑 Beanstalk
  Finale". (Beanstalk realm itself is still `comingSoon`, so this is ready-and-waiting.)
- ✅ Realm differentiation (v136, retuned v138): each realm now has its own identity in the CORE
  loop, not just new content. (1) **Per-realm fussiness** — a `reqBonus` shifts the match-% needed
  to please a customer. NOTE: the difficulty ramp caps at the "veryhard" tier (80%) after ~10
  customers, so the bonus mostly sets the STEADY-STATE target veterans see: **Willow 75%, Courtyard
  85%**, escalating after (oasis 88, thieves 90, beanstalk 92-cap). v136 shipped +13/+23 which
  stacked on the 80% veryhard base and hit the 92 cap for everyone → fixed in v138 to −5/+5 so the
  steady-state lands exactly on 75/85. (2) **Infused ingredients now DEBUT in the Courtyard** —
  removed from Willow entirely (Willow = learn the basics; Courtyard = the crafting layer arrives).
  Admin "🏰 Go to King's Courtyard (test)" jumps there to test.
- ⏳ TODO: wire finales for the remaining realms (Willow + Courtyard + Beanstalk built; Oasis &
  Thieves open); add more story events per realm for variety; recurring skin-event interleaving.
  Consider one more Courtyard-only core twist (e.g. the "King's Decree" rotating shift modifier).

## ✅ Collection Hunts — BUILT (v137): Bo Peep's Sheep + Stepsister's Beads

**Shipped as a reusable system** (`HUNTS` in ui.js). Each realm can hide N items that turn up while
you play — a per-round roll picks a phase (**pop / scoop / knife / tip**) and reveals one there (with
a result-screen fallback so it's never skipped). Find FX = sparkle float + chime + toast + a chip
bump. A **"🐑 3/5" tracker chip** shows on the home + customer screens. Completing a set grants an
**exclusive `hunt`-tagged skin** (earned, never bought/rolled — filtered out of the Well + shop, shown
locked-with-progress in the wardrobe) and a **thank-you card** from the character on the home screen.
- **Willow — Bo Peep** (intro): 5 sheep → 🐑 Little Lamb familiar. Higher find-rate (0.42/round).
- **Courtyard — the Stepsister**: 8 beads → 📿 Pearl Necklace cauldron. (0.34/round.)
- Cosmetic-only, never gates progression, can't be lost. Pacing verified (~28–42% of rounds).
- **To add another hunt:** one entry in `HUNTS` + one `hunt`-tagged skin in `COSMETICS`. That's it.

Original brainstorm below (kept for reference):

## 🆕 The Stepsister's Beads — a collection scavenger-hunt event (owner idea)

**The hook:** an ugly stepsister broke her necklace and lost all the beads — she can't attend the
royal ball without it! **Find all N beads**, which are **hidden throughout the normal wish-mixing
loop**: a chance to find one in a **bubble pop**, inside an **ingredient (revealed by the knife)**,
in a **tip bubble**, in a **scoop** — the whole process has a small chance to cough one up.
Collect the set → complete the quest → reward (a cosmetic: her necklace as a wearable skin, or a
Cinderella-adjacent unlockable).

**Owner's own worry — "doesn't affect gameplay though… hmmm":** correct, and that's actually FINE —
it's a **cozy collectathon / Easter-egg hunt**, a different pleasure from the skill minigames. It
doesn't need to test skill; it rewards *attention* and gives a reason to savour every phase. Keep it
as a **light, opt-in collection meta** layered over normal play, NOT a timed challenge.
- Make it **feel** good with juice: a bead **sparkles** when it appears, a satisfying **collect
  chime**, and a little **"3 / 8 beads"** tracker so progress is visible.
- **Don't gate anything important behind luck** — the reward is a cosmetic, so a random hunt is fine;
  never put progression (keys/realms) behind RNG finds.
- Could be a **recurring skin-event** template: swap the character + the cosmetic (stepsister's
  beads, then a knight's lost medals, etc.) so one system powers many little hunts.
- Scope note: this is a NEW cross-cutting system (hooks into pop/knife/tip/scoop reward rolls +
  a persistent collection tracker + a completion reward). Medium build. Confirm the vision before
  building.

**Earlier build status (v120 — infrastructure only):**
- ✅ `GAME.realmEvents` (realmId → events cleared), persisted.
- ✅ `eventsNeeded` per realm in data (willow 3, courtyard 4, oasis/thieves 5, beanstalk 6).
- ✅ `markRealmEventCleared()` — counts win-or-lose, capped; hooked into `maybeEvent()`.
- ✅ Map "story path" tracker (gold pips + "Realm story" / "✨ Story complete"), shown only
  on visited realms; hidden on locked ones (mystery). Kept OFF the gameplay screen.
- ⏳ TODO when the full loop is built: actually GATE realm unlock on story-complete + Realm
  Key; the must-win retryable finale that drops the Realm Key; per-realm themed event pools;
  recurring skin-event interleaving (balance note above); tune `EVENT_EVERY` (currently 30 —
  owner wants ~8–12 so events land a few times per realm).

---

## ✅ Realm event PLAYLISTS — authored story recipes (BUILT v141)

Replaced the old pure-random event picker with a **per-realm authored plan** (`REALM_EVENT_PLAN` in
ui.js). Each realm's story is seated in stone (guarantees the ball order, exactly one villain, no
event spammed) while `"house"` filler slots stay lightly random (no back-to-back repeats). Plan
length = `eventsNeeded − 1`; the last slot is always the must-win finale.
- Tokens: `ball` (partner escalates knight→prince→cinderella by order), `queen` (villain; falls back
  to a house event if you can't afford her), `house` (Duel / Fairy / Bake-Off), or a specific
  `duel`/`fairy`/`cake` seat.
- **Willow (5):** house · house · queen · house · 🐺 finale.
- **Courtyard (8):** ball:knight · house · queen · ball:prince · house · ball:cinderella · house · 🍗 finale.
- **The per-realm recipe going forward** (owner's design): 1 villain, 1 dance (reskinned; Courtyard
  gets the full 3× intro series → 👠 skin), 1 signature NEW engine run ~3× at rising difficulty → a
  skin, the rest "house" events capped so nothing repeats much. One new engine per realm, everything
  else a costume change or a difficulty tier. Trash visitors (Rumpel/Goblin) stay OUT of the story
  count — they're bin-full utility encounters, not story beats.
- **To author a new realm's arc:** just write its `REALM_EVENT_PLAN` entry. `eventPlanPreview(realm)`
  prints the resolved sequence for checking.

## 🆕 "Catch the ripples" — tap falling drops in order (minigame / event)

**The gist:** drops land all over the screen. Each landing spot shows a small circle
that **expands in rings** (small dot → ring → bigger ring → fade out, ~3 pulses). You
must **tap the spots in the order they landed, as fast as you can**, before they fade.
Multiple are on screen at once, so it's a speed + prioritization test (tap the oldest/
about-to-fade one first).

**Theme is flexible — pick to match the realm.** Doesn't have to be rain. Front-runners:
- **Falling wishing stars** ⭐ — LIKED. Very on-brand for *Wish Pop* (catch wishes as they
  fall). Realm/map home still TBD.
- **Spilled Wishwine** 🍷 — LIKED, fleshed out below as its own spec. King's Courtyard.
- Others if useful: rain 🌧️ (stormy realm), blossoms 🌸 (spring), snowflakes ❄️ (winter),
  fireflies ✨ (evening garden, blink instead of ripple).

**Notes:** easy to build; the design work is mostly (a) picking theme + realm home, and
(b) tuning fade speed / how many are on screen at once for difficulty. Good candidate
for a realm event AND for the practice-shop idea below.

---

## 🆕 "Buy Time: Feed the Wolf" — Willow-Wish Village FINALE (CHOSEN · BUILT v121)

_(Earlier "spot-the-tells / is-it-Grandma?" deduction was rejected — too obvious: one glance
at an eye or one whiff of the roast solves it, no gameplay in between.)_

**BUILT (v121, tuned harder v122) — playable v1:** single Patience bar with a green sweet-spot;
huntsman survival timer (~32s); win/lose screens; reward 🪙60 + ✨8; scores "time in green" for
a future personal-best. Reachable via Admin ("🐺 Feed the Wolf") and as a natural Willow event.

**v122 difficulty pass (owner feedback — was too easy):**
- **6 treats, one row**, ordered **most-potent → weakest L→R** (Roast +32 … Berries +8), like
  normal-round ingredients.
- **Same-treat-twice-in-a-row penalty:** repeating an item adds +2s to the feed cooldown
  (`WOLF_REPEAT_PENALTY_MS`), so you must vary your feeding.
- **Tighter basket** that runs low late → forces repeats (→ the penalty) as the huntsman nears.
- **Huntsman's allergens:** 1–2 treats are flagged 🤧 — you must **use them ALL up before he
  arrives**, or he "can't come in" (a second, telegraphed fail condition). Objective banner +
  red-outlined allergen tiles show progress.
- Drain 6→7/sec.

**v124 restructure — PER-BAR ROWS (owner's vision):** each bar now has its OWN row of foods
sitting directly under it — feed a bar from its row (no memorizing which food does what). One
shared feed-cooldown couples the rows, so you triage which bar to feed each window. Suspicion
is its own row of **distraction** items (Song/Story/Joke/Posy) you feed to *lower* it while it
rises passively. Allergens are drawn only from real food rows. **Column-lockout is Hard-only**:
feeding a food briefly locks that whole column across every row (🔒). Re-verified winnable:
greedy solver **15/15 on all three modes** (and it caught + fixed Easy being accidentally the
hardest — a lone row couldn't out-feed the drain). Rows/amounts in `WOLF_ROWS`, tuning in `WOLF_MODES`. Allergen counts: **Easy 1 / Medium 2 / Hard 3** (v126), still 15/15 winnable.

**(v123 note, superseded by v124's per-bar rows)** intro offers **Easy / Medium / Hard**:
- **Easy** — 1 bar (Patience). ~32s.
- **Medium** — 2 bars (Patience + **Fullness**). Items fill each differently (Roast fills the
  belly a lot / calms little; Tart the reverse) → you juggle. ~38s.
- **Hard** — 3 bars (+ **Suspicion**, "keep low"): rises slowly and **spikes when you repeat a
  treat**, so running low late (forced repeats) can blow your cover. ~44s.
- Basket + timer scale with bar count; **allergen totals are capped** (≤~40% of your available
  feeds) so it's always winnable. **Verified:** a near-optimal greedy solver wins **12/12 on all
  three modes** — human challenge is real-time execution, not an impossible board.
- Tuning all lives in `WOLF_MODES` / `WOLF_BAR_META` / `WOLF_ITEMS` at the top of the WOLF block.

NOT yet wired as the gated Realm-Key finale (the finale would force Easy). Practice shop would
expose Medium/Hard. TODO: short first-time tutorial; personal-best per mode; hook win → Realm Key
once the unlock gate is built.

**The premise:** you KNOW it's the wolf in Grandma's clothes. It's hungry and impatient, and
the huntsman is on his way. **Ration the picnic basket to keep the wolf calm until rescue
arrives** (~30–45s). It's the **goblin-feeding minigame's skeleton** with new rules — each
picnic item does something different to the wolf's meter(s).

**Core mechanic — keep the needle in the GREEN (danger at BOTH ends):**
- A **Patience** bar drifts DOWN over time (wolf gets antsy).
- **Too low → he pounces (hard fail).** **Too high → overfed/greedy** — for the FINALE this is
  just *wasteful* (bar caps, item wasted); in Hard mode it's a real penalty.
- Item *size* is the skill: a **berry** = small nudge (fine-tuning), a **roast** = big jump
  (risks overshoot). Pick the right-sized item to hold the green as it drains.

**Item types — two kinds of decisions:**
- **Instant items** = reactive spikes ("emergency, top him up NOW").
- **Over-time items (owner's add)** = e.g. a **bunch of grapes = +5/sec for 5s** — a slow drip
  you set going, then turn your attention elsewhere. Proactive investment vs reactive patch.
  Mixing the two is where the depth lives (like cooking-over-time vs instant-plating in
  Overcooked).
- A special **sleeping-tonic cake** (limited) → big drowse / slows the drain briefly.

**Replayability:**
- **Randomize the basket** each run (which items + how many). Lots of little berries = fine
  control but do they add up? A few roasts = powerful but overshoot-prone. Fresh puzzle each time.
- **Multiple bars = the harder modes** (items affect each bar DIFFERENTLY, so you must juggle):
  - **Easy:** 1 bar (Patience).
  - **Medium:** + **Hunger** (roast fills Hunger lots / Patience little; sweet tart the reverse).
  - **Hard:** + **Suspicion** (creeps up if you feed too fast or repeat the same item — forces
    variety). Each bar drains at its own rate → constant triage. THIS is the game.

**Finale stays accessible (confirmed):** the finale itself is the **1-bar (maybe gentle 2-bar)**
version — a must-win gate can't demand Overcooked-level juggling or it walls casual players. The
brutal 3-bar version lives in the **practice shop as Hard mode**. Same game, two homes.

**Tutorial:** show each item → "this calms him a little" → tap it → watch the bar move. Short,
**first-time only** (auto-skip on replays, "view again" option), always skippable.

**Win/lose:** keep the bar(s) out of the fail zone until the huntsman-arrives timer fills → win
the **Realm Key**. Redline the Patience bar → fail, retry (forgiving).

---

## 🪙 Sky-High Savings — Beanstalk Bank FINALE ✅ BUILT (v131)

**What shipped (a Sky-Burger-style stacker, owner's idea; v132 = true Sky-Burger feel):** coins and
junk **rain from the top**; **swipe to sway your tower** (drag / mouse-move) and catch coins on top.
The tower **stacks infinitely** — its top stays parked mid-screen while the stack scrolls down and the
plate sinks off the bottom. Catches register **on the tip** (the moment a coin meets the top), and the
tower **springs & leans** as you move — wobblier the taller it grows, and off-centre catches shove it.
**Gems stack as their own 💎 discs** (worth 3 to the score but one visible slot). Missed items fall all the
way down (behind the tower) and disappear off the bottom. **Hard adds "Bumps"** (v134–135): a bomb/rock
that slips past the top keeps falling, and swinging the tower into it docks −5 from the final coin reward
per bump (clang + shake + spark + floating −5) — never a topple, just a score ding.
- **Gold coin 🪙 → +1 height, gem 💎 → +3.** Reach the **goal height before time's up → win.**
- **Bomb 💣 (−4) and rock 🪨 (−1)** knock coins off AND spike a **Wobble** meter; **Wobble maxes → the
  tower topples → lose.** Catching clean lets Wobble steady back down. (Doom bar = Wobble, mirroring
  the wolf's Suspicion / feast's Temper.)
- **Depth to match the others:** you can only be in one place, so two coins at once = a real choice;
  bombs force you to abandon a coin to dodge; **wind gusts** (Hard: two of them) rise the Wobble and
  speed the drops; the plate **narrows** each difficulty (Easy 30% → Hard 17%).
- **Modes:** Easy (wide plate, no wind, goal 20) / Medium (goal 26, 1 gust) / Hard (narrow, goal 36,
  2 gusts). **Finale runs on Easy, must-win, freely retryable.**
- **♾️ Infinite mode (v139):** endless high-score chase — no timer/goal, difficulty ramps with height
  (faster falls + more junk). OUT on 5 bumps OR catching a 💣/🪨 on top of the stack (instant).
  Keeps GAME.stackBest top-3; game-over shows a 🥇🥈🥉 board. HUD swaps to Height + Bumps (0/5).
- **Winnability:** greedy auto-catcher bot — Easy/Medium/Hard all **12/12** in tests.
- Admin: "🪙 Sky-High Savings (practice)" + "🔑 Beanstalk Finale (Realm Key)".

---

## 🍗 Rescue the Feast — King's Courtyard FINALE ✅ BUILT (v129)

**What shipped (the chosen Courtyard finale):** a **catch-and-sort** game. The clumsy jester
bumped the banquet table and the whole feast — roast, cakes, fruit, bread, candles, wine —
**tumbles from the top of the screen**. **Tap a falling dish to catch it, then tap its home**
(plate, bowl, basket, stand, holder, goblet) to set it down.
- **Right home → King's Delight ✨ rises** (your score / star rating). **Wrong home** still tidies
  it (small credit) — the game is about *pleasing the King*, never punishing.
- **Dish smashes on the floor → King's Temper 😠 rises.** Max it and the poor Jester is hauled to
  the dungeon → **lose, retry.** (Reframed from a "stain meter" per owner: it's about saving the
  feast and the Jester, not avoiding stains.)
- **Depth to match the wolf:** one pair of hands (Easy holds **2**, Medium/Hard hold **1** — place
  fast), attention split across many falling dishes, hazard dishes (🕯️ candle, 🍷 wine cost extra
  Temper if smashed), a **"The King rises for the toast!" surge** (dishes rain faster), and Hard adds
  a sixth dish/home. **Finale runs on Easy, must-win, freely retryable**; harder modes for practice.
- **Winnability:** verified by a greedy auto-catcher bot — Easy/Medium/Hard all **12/12** in tests.
- Admin: "🍗 Rescue the Feast (practice)" + "🔑 Courtyard Finale (Realm Key)".

**Note:** the original **ripple/wine-bloom** idea below is KEPT as a lighter, lower-stakes minor
event / practice game (it doesn't need to carry a whole finale). Spec preserved for that use.

---

## 🍷 Spilled Wish-Wine — ✅ BUILT (v142), a Courtyard event + practice game

Shipped as the "dab the spill" game: enchanted wine drips onto the King's cloak; each drop **blooms**
outward and you **tap it before it finishes** or it sets into a **permanent stain**. Too many stains
(a per-mode cap) → lose; survive the toast (timer) under the cap → win. Multiple drops at once = dab
the one **closest to setting** first; the spill speeds up over the round. Easy/Medium/Hard modes;
seated into the **Courtyard playlist** (the `"wine"` token, slot 5). Verified 15/15 winnable all modes.
Admin: "🍷 Spilled Wish-Wine (practice)". Original brainstorm below.

**Second element added (v144): the Jester's juggling.** To give it a real judgment axis (not just "tap faster"),
the game now runs TWO systems at once on the same cloak: dab the blooming wine AND keep the Jester's
balls in the air (tap a ball to toss it back up; it arcs under gravity). Balls: Easy 3 / Medium 4 /
Hard 5, entering ~0.5s apart. **The link:** a dropped ball knocks a goblet → spawns a fresh spill, so
the two systems feed each other (fumbling the juggle makes more mess). Two lose conditions: stains hit
the cap, OR every ball drops. A few spills are pre-seeded at round start so there's instant action.
Bigger drop/stain art; medium balls. Still 15/15 winnable (bot juggles + dabs).

## 🆕 Spilled Wishwine — ripple/bloom minor event (was a finale candidate)

**The scene:** a droplet of enchanted crimson-purple wine falls and **splats into a tiny
circle**. The stain slowly **"blooms" outward like watercolor soaking into parchment**.
- **Tap it before the bloom finishes → it sparkles away** (saved).
- **Miss it → it stays as a permanent stain** on the King's cloak until the round ends.

**Why it works as a FINALE (not just a skin event):** the permanent stains give it a real
**lose condition**, which a must-win realm-key finale needs. Wine keeps spilling; misses
accumulate visibly on the cloak; if too many stains land (a threshold) you've ruined it →
**fail, retry**. Keep stains under the threshold until the spill ends → **save the cloak →
win the Realm Key.** Mounting stains = mounting tension = a genuine climax.
- **Bloom speed = the difficulty dial** (how long you have to tap before it's permanent).
- **Multiple droplets at once** = prioritization (tap the one closest to finishing first).
- **Escalate toward the end** (faster / more droplets) for a climactic ramp.
- Retryable, forgiving on retry (cozy game) — but a clear, winnable challenge.
- Could ALSO exist as a lower-stakes practice-shop game (easy/med/hard) later.

---

## 🆕 Fairy Flower Garden — leave flowers, cull thorns (minigame / event)

**The gist:** a sibling of the ripple game but with a *discrimination* twist. **Fairies drop
seeds** all over the screen; each seed **grows** in place (like the ripples/drops).
- If it grows into a **flower → LEAVE it** (tapping a flower **loses** points).
- If it grows into a **thorn → tap it away** (tapping a thorn **gains** points).
- Runs until the **screen is full of flowers** or the fairies **run out of seeds**.

**Why it's good variety:** the ripple game is "tap everything, in order" (pure speed). This
one is **restraint + accuracy** — identify friend vs foe and *resist* tapping the good ones.
Different mental muscle, so it doesn't feel like a reskin. Fits a **spring/garden or fairy**
event (ties to the existing fairy event).

**The one real gotcha (owner flagged):** because things grow and **touch/overlap**, taps get
ambiguous. Handling:
- Give each grown item a **centered hit-zone smaller than its full bloom** (tap must land near
  the center, not the outer petals/overlap), and/or resolve an overlapping tap to the **closest
  center** (or topmost/newest item).
- **Spawn with minimum spacing** so seeds don't start fully on top of each other.
- Tune density so the screen fills satisfyingly without becoming an unreadable overlap mess.

**Harder-mode addition (owner) — over-time sprouts.** Some grown items aren't one-tap results
but tick over time, so it's not "one throw, one result." E.g. a **spreading thornbush** that
grows/expands every second until you cut it (prioritize before it takes over), or a
**continuously-scoring flower** that pays points each second it's left alive (so protecting the
good ones is actively rewarding). Same "over-time vs instant" depth idea as the wolf feed game.

---

## 🆕 Practice shops — replay favorite minigames (+ finally a gold sink)

**The question (owner's):** if players love a specific minigame, should there be shops
on the map to replay them any time after unlocking — e.g. all bakery-type games at the
**Bakery**, all ballroom/courtly games at the **Castle** — or keep them limited?

**My take: yes, open practice shops — it solves two problems at once.**
1. Gives beloved minigames a permanent home + replay value (retention).
2. **Charging gold to play is a real gold sink** — which the game badly needs, since gold
   currently piles up and stops mattering. Owner's instinct (≈50 gold per dance / per cake)
   is exactly right.

**Reward model (owner's final call):**
- **No per-play rewards at all.** You play because you *like* it, and you **pay gold each
  time** (e.g. ~50 gold per dance / per cake). Pure gold sink — exactly what the game needs.
- **Personal best + star ratings** for the mastery pull ("beat my record").
- **Easy / Medium / Hard modes for each minigame.** Owner: easy to add given what's built.
  Difficulty just scales the existing knobs, e.g.:
  - **Cake decorating:** Hard = go back to **fully random charms** (no mirroring — the
    mirroring made it much easier; random was the old brutal version).
  - **Dancing:** Hard = **longer dances** (more steps / faster calls).
  - (Every minigame has a natural dial like this.)
- **Capstone prize = a location skin.** Beat **all Hard modes at a location** (e.g. clear
  every Hard game at the Bakery) → unlock a **special skin themed to that place**. One-time,
  skill-earned — so it's a cosmetic you *can't* buy or farm, only master. Clean, and it
  doesn't touch the Stardust economy.

**Keep the split clean:** gold = *playing* (practice sink), Stardust = cosmetics from real
play, capstone skins = skill mastery. Three separate lanes, none inflating the others.

**Unlock gating:** a shop opens after you've played that minigame in a real event first
("met the baker → the Bakery opens"). Ties into map progression.

**Why I like it:** finally gives gold a purpose (re-motivating the whole gold economy), adds
cozy replayable content, and the capstone skins reward true mastery without farming. Strong yes.

---

## 🆕 Thieves' Corner — VIP heist (thieves steal your ingredients)

**The gist:** occasionally in **Thieves' Corner**, when the customer is a **VIP**,
the thieves come running (a flashy guest is a juicy target). While the heist is on,
a thief **shows up at random moments throughout the mixing phase** and tries to grab
one of your ingredients. Only VIPs, and only *sometimes* — VIPs bring a big haul
(extra scoops/bubbles), so they can absorb the losses; regular customers can't.

**Trigger timing (updated):** NOT tied to placing an ingredient — the thief appears
at **random intervals during mixing**, so you have to stay alert the whole round
(not just when you act). Each appearance is preceded by:
- an **audio cue** a moment before he peeks in (a little sting / rustle), and
- a **visual cue** for players with sound off (e.g. a shadow/sparkle at the edge he'll
  come from), so it's fair either way.

**Why it's great:** thematically airtight (thieves, in Thieves' Corner, robbing the
rich VIP), and it turns a placement into a real decision — spend efficiently, use
your best ingredients before they're snatched. Naturally self-balancing because it's
gated to VIP + occasional. Pairs perfectly with the VIP's existing high risk/reward.

**Design calls to make it fair AND fun (not just punishing):**
- **Telegraph it.** Announce at round start: "🦹 Thieves are casing this VIP — every
  ingredient you use, they'll grab another. Spend wisely!" Player plans around it.
- **Make the theft visible.** Show the ingredient being snatched (a thief sprite grabs
  a card and runs), not a silent disappearance — transparency keeps it fair.
- **Catch-the-thief (the fun core).** He **slides in from a random edge** (top/bottom/
  left/right), peeks, and slides back off. **Tap him while he's on screen → caught**,
  he drops the loot and scurries off empty-handed. Miss → he grabs a card and it flies
  off-screen *with* him (so you see what you lost).
  - **On-screen window ~1s** (slide in, linger ~0.6s, slide out) — a strict half-second
    is faster than people can react + move their thumb on a phone. Tune live.
  - **Bias his spawn toward the top half** so he isn't popping up under your thumb at
    the tray.
  - **One thief at a time** — appearances never overlap; each resolves before the next.
  - Simpler v1 could skip the catch and just take one, but the catch is what makes it
    *fun* rather than punishing — worth doing.
- **Never softlock.** Don't steal your last ingredient(s); only steal while the hand
  is comfortably above what's needed. Steal from the hand, never from the cauldron.
- **Hazard pay.** Surviving a heist VIP should pay a bonus (gold/Stardust) so the risk
  feels brave, not taxing. (VIP already pays more — lean into that.)
- **Frequency = three gates:** realm is Thieves' Corner → customer is VIP → then a %
  roll. Keeps it a rare "oh no, here they come!" moment.

**Relation to the realm-hazard idea (below):** this is basically a Thieves'-Corner
hazard, but triggered by a VIP guest instead of a timed weather event. Could share
the same "hazard round" plumbing.

---

## 🆕 Scoop-phase overhaul — catch bubbles off the spoon

**The problem:** the scoop phase is pretty and calm but low-interaction — you
mostly shake and hit Continue. The bubble-pop phase is the fun part; scoop should
have a little of that catch-the-reward energy without stealing its thunder.

**The idea (owner's):** as you shake/disturb the glitter dust, bubbles fly up off
the spoon. Pop them before they drift off-screen to capture what's inside. Not
every bubble has something. Possible contents:
- Nothing (empty — most common)
- Coins
- Stardust ✨
- A rare Treasure Key 🗝️
- **Very** rarely, a skin
- A **Wish Bubble** — just an ordinary *extra* wish bubble, same as the ones you
  scoop normally. Nothing special about it; it's simply one more. (NOT a free
  wild-magic / power-up.)

**Why it's good:** adds skill + surprise to a dead moment, reuses the pop-to-catch
mechanic players already love, and gives another trickle of Stardust/keys. The
"escapes off-screen if you miss" bit adds gentle tension that fits the theme
(glitter scattering).

**Things to design carefully:**
- **Don't overshadow the main pop phase.** Keep scoop bubbles occasional and fast,
  more "ooh a bonus" than "second minigame." Frequency + speed are the dials.
- **Rarity tiers matter.** Coins common, Stardust uncommon, key rare, skin ultra-rare.
  Keep the drop table honest so it feels lucky, not routine.
- **No auto-catch.** Miss it and it's gone — players already get plenty, so this
  is a "reward for paying attention," not a freebie. (No "catch all for me".)
- **Feedback:** each catch bursts like the reward bubbles; a miss gives a soft
  "poof"/pop-off-screen so it's clear you lost it (but no penalty beyond the miss).

**Build note:** the scoop screen already spawns/reveals bubbles (`renderScoop`,
`#scoop-bubbles`), so there's a foundation to build the fly-up + catch on.

---

## 🅰️ Realm hazard events (weather / location modifiers)

**The gist:** short, themed events that shake up the rules for a handful of
rounds (e.g. "the next 5 wishes"), announced up front so players can prepare.

**Why:** makes the currently-underused Frost Gem "lock the bar" effect actually
matter, and gives each realm its own personality. Random instability feels
*unfair* as a permanent rule, but feels *fair and fun* when there's a story
reason for it ("of course things are unstable — it's a dust storm").

**Flavor per realm (each place gets its own signature hazard):**
- **Desert Oasis — Dust Storm:** the green target zones on the need bars drift
  around. Frost Gem's lock-bar pins one still.
- **Thieves' Corner — Untrustworthy Bars:** the bars *lie* a little — what you
  see isn't quite the true position, so you can't fully trust the readout.
  (Insight or lock could reveal/steady the truth.)
- **Snowy realm — Freeze:** bars fill slower or stick; a fiery ingredient thaws.

**Fairness guardrails (important):**
1. Announce/telegraph the event before it starts, so players can stock up on
   counters (Frost Gems, Insight, etc.). Turns "why did that move?!" into
   "okay, I need to prep."
2. Don't move/disturb a bar the player has already satisfied — bank their good
   work. You lock a bar to *hold a win*, not to babysit a moving target.
3. **Hazard pay:** event rounds pay more / drop better rewards, so braving them
   feels brave, not just taxed.

**Build note:** the game already has an event system that can take over a turn
(`maybeEvent`), so a timed "weather event" is buildable when we're ready.

---

---

## 🔧 Small follow-ups
- **Result-screen customer → arrival size.** Now that Round Recap is a button +
  overlay (shipped v118), the result customer was bumped bigger (176px). Eventually
  make it as large as the New-Customer arrival portrait for a strong "hero" look.

---

## Done / shipped

### ✅ Magic Carpet Dash (Forgotten Oasis flying game) — shipped v149
A vertical dodge-and-catch flyer for Desert Oasis. **The carpet stays dead-centre; the
whole sky slides** as you hold left/right (owner's key idea — "we can go left or right in
the sky forever, everything around us changes"). Catch **shooting stars 🌠** (+ rare 💎 / 🪔);
dodge **⭐ storm clouds ☁️ rocks 🪨 sand-whirls 🌪️** (no birds, per owner — swapped for
fairytale hazards). 3 hearts; a **magic lamp 🪔 grants a genie shield** for ~2.6s. Survive the
timer → **reach the Oasis**. Easy/Med/Hard. World-slides via a single lateral `vx` applied to
every item's x (fly right → items slide left) + parallax dunes. Verified 15/15 winnable by a
greedy auto-pilot (banks away from hazards, toward stars). Practice via Admin; slots into the
Oasis event playlist when that realm is stood up. **Fairytale hooks still on the shelf:** lamp
= "a wish" (shield is v1; could clear-screen/magnet later); a genie 🧞 hand-off at the Oasis.

### ✅ Clean-streak Stardust reward (no-allergy bonus) — shipped v117
Reward Stardust ✨ for consecutive **allergy-risk** wishes granted *clean* (meter
stayed green). As built:
- Only customers who **have an allergy** count. No-allergy customers **pause** the
  streak (never build it, never break it). Triggering the allergy (yellow/red) or
  failing the wish **resets** it.
- Escalating payout: 3 in a row → 5 ✨, 4 → 9 ✨, 5 → 13 ✨, … (tunable in
  `BALANCE.CLEAN_STREAK_*`).
- Result screen shows **two large badges**: 🔥 Win Streak and 💚 Allergy-Free,
  with a "+N ✨" tag when dust is earned.
- The Stardust drops as its own **purple poppable bubble**; popping the big coin
  bubble cascades it too.
- Stored in `GAME.cleanStreak` / `GAME.bestCleanStreak`.

**Possible follow-ups:** make Stardust a bit harder to get elsewhere so this
becomes a primary path to cosmetics; maybe a lifetime "best allergy-free streak"
shown on a stats/achievements screen.

---

# 📖 STORY DIRECTION & WORLD BIBLE (owner brainstorm — not yet built)

_Captured verbatim-ish from the owner. This is the canonical direction for the
story layer. Build the FRAMEWORK once, then ship ONE complete arc at a time._

## Guiding principle
Make Willow Wish feel like a real village where everyone's stories overlap.
Characters remember past events, move to new places, return with new problems,
and occasionally affect one another's stories. Not isolated fairy tales — one
connected fairy-tale world that unfolds through the wishes the player answers.

## Recurring customers
- Every recurring customer has an ongoing arc told THROUGH THEIR WISHES (whether
  tied to the main wolf story or lighter background flavor). Each wish reveals
  another chapter of their life; attentive players slowly piece it together.
- Customers may disappear for a while and REAPPEAR IN LATER REALMS, so the world
  feels connected and persistent. (⇒ per-customer state must be GLOBAL, with an
  optional "next appears in <realm>" pointer.)

## The Wolf (main mischief-maker of Willow Wish)
- Same wolf from Little Red Riding Hood AND the Three Little Pigs.
- Many customers are UNKNOWINGLY wishing to fix problems the wolf caused; the
  player gradually realizes he's behind much of the town's trouble. (⇒ plant
  breadcrumb clues across other customers' wishes, with a later payoff.)
- Eventually the wolf becomes a CUSTOMER himself. First wish:
  - "I wish I could stop being so hungry all the time."
  - The wish goes wrong; he returns demanding a free replacement:
    "It didn't work! I could eat a whole sheep! Grant me a free wish."
- Ties into the existing wolfWatch flag + the Grandma's Cottage finale.

## Wolf disguises (running joke)
- Every visit he arrives in an increasingly ridiculous disguise, with a
  different fake name each time.
- Everyone — including the player — obviously knows it's him. (⇒ keep a
  consistent "tell": same eyes / tail / paw so the gag reads.)

## Three Little Pigs
- Two pigs appear as recurring customers in Willow Wish.
- Their wishes revolve around the wolf repeatedly blowing down their straw and
  stick houses.
- Their arc concludes with them deciding to move in with their third brother in
  a DIFFERENT realm.
- In a later realm all three pigs reappear in the brick house, story continuing
  with new wishes. (First real test of cross-realm customer persistence.)

## TUTORIAL NOTE — allergy explanation wording (use language VERY close to this)
> "Every answer to every wish is made from magic. Every magic has ingredients.
>  Some people don't react well to certain kinds of magic… so be careful!"

---

# 📖 WILLOW WISH — CUSTOMER ARCS & THE BUTTON CLUE-CHAIN (owner brainstorm, v2)

_Refines the arcs above with concrete wishes and the connective payoff. Not built._

## Gingerbread Man (CONFIRMED intro arc)
1. Wishes for an extra layer of frosting to protect him from the sun. ✅
2. Now chased by ants — wishes them away.
3. Wishes for a new coat; the coat cracks → wishes for extra frosting.
(Great character intro. Later ties into the button chain — see below.)

## Tiny Mouse — she's opening a SEWING SHOP in the village
- Intro wishes establish her: magical scissors that cut on their own, bows that
  tie themselves, etc.
- Then a specific plot wish: "My buttons keep disappearing. I wish for a button
  jar that never empties." (This is the hook into the button chain.)

## The Two Pigs (start right away with their problem)
- "Somebody blew my house down — I wish for stronger hay."
- "Somebody blew my house down — I wish for stronger sticks."
- (Later: move in with the third brother in a different realm → brick house.)

## Bo Peep (a talking STORY character, like Little Red)
- Starts strong: she's losing her sheep. Pops up and talks to us like Red does.
- We make her a potion so she stops losing sheep — AND we auto-accept her quest
  to FIND the lost sheep ("we can't not accept"). Accepting the quest is what
  TURNS ON the sheep collection (⇒ wire Bo Peep's dialogue to the EXISTING
  Willow sheep hunt).

## ⭐ THE BUTTON CLUE-CHAIN (the payoff that connects everyone)
1. Tiny Mouse's wish: "my buttons keep disappearing… button jar that never empties."
2. The WOLF comes in: "I wish to have the best button collection the world has
   ever seen." — and he DROPS 3 CLUES into our Satchel:
   - a gumdrop button, a regular blue button, a heart-shaped button.
3. We call Little Red: "we saw him — he left these." We show her the 3 buttons.
4. Red: "I recognize that heart button — that's Grandma's." She deduces the rest:
   "that one's Tiny Mouse's, and that one's the Gingerbread Man's. He's up to no
   good, pestering everyone." Red then asks us for a wish.
5. Gingerbread Man returns: "I've lost my button. Have you seen it?" We give him a
   button and KEEP one as a keepsake; his sprite updates to show the blue button
   where the gumdrop button was. (⇒ CONFIRM exact mapping: which button is whose,
   which we give vs. keep — owner said give blue / keep gumdrop; needs art of the
   updated Gingerbread sprite, owner will supply.)

Buttons become Satchel items with a "Show Little Red" purpose → first real use of
the Satchel "deliver to a character" mechanic.

## Background customers (flavor only — no quests/collectibles)
- Sleepy Owl, Village Baker (+ maybe one more the owner is forgetting): give their
  wishes light arcs/meaning, but they don't pull the player into a quest.

## Build-order implication
Bo Peep (reuses the sheep hunt), the pig wishes, and the Gingerbread/Mouse intro
wishes are INDEPENDENT and can come first. The button clue-chain has cross-customer
GATES (mouse button wish → wolf button drop → show Red → gingerbread's lost button)
and should be built as one connected finale of the Willow web, last.

### Clarification — the gumdrop button hand-off (owner, confirmed)
When we open the Satchel to give the Gingerbread Man his button back, the gumdrop
button is covered in SPARKLES and CANNOT be moved/given — it's become a magical
keepsake we keep. So we hand him a plain, real button instead, and he WEARS it
(sprite swaps gumdrop → blue button). This exchange plays in "STORY MODE" (the
owner's name for the Red-style dialogue-card screens, i.e. renderStoryBeats).

---

# ✍️ VOICE + APPROVED SCRIPT — Gingerbread Man (owner-approved)

**Reference voice for the Gingerbread Man = "warm goofball":** earnest, a little
clueless, easy to love. NOT vain/diva, NOT stiffly polite. Lots of heart, humor
comes from naivety not sarcasm. (Each other character gets their OWN voice — this
register is his.)

**Chapter 1 · "Melting Point"** (counter wish)
> "Whoa — is it always this hot?! I'm meltin' and I've got places to be. Frost me
> up so I don't turn into a puddle? You're a lifesaver. Literally, maybe."

**Chapter 2 · "A Walking Picnic"** (counter wish)
> "Okay, the frosting's amazing — but now there's ants following me like I'm a
> walking picnic! A whole line of 'em! Can you shoo 'em somewhere else? I don't
> wanna be rude, but I am NOT lunch."

**Chapter 3 · "Cracked"** (counter wish)
> "Don't laugh — okay, you can laugh a little. I snuggled up to a warm oven 'cause
> it felt like home, and I cracked right down the middle! Patch me up? Tougher
> batch this time, maybe. I'm kinda delicate."

**Chapter 4 · "The Missing Button"** (STORY MODE)
> GB: "Hey hey — you got a sec? I lost a button! The gumdrop one, right off my
> front. Looked everywhere. I even asked a pigeon! Pigeon just stared at me."
> [Open Satchel: the gumdrop button is wrapped in sparkles and won't budge.]
> GB: "…Is that it?! All glowy in your bag? Aw, it went and got magical on me.
> Figures — right when I want it back! That's okay. You keep it. Looks like it
> likes you."
> [Offer a plain spare button.]
> GB: "One of yours? For me? Aw, gosh. …It's even better! Don't tell the gumdrop
> I said that."
> [Sprite updates: blue button where the gumdrop used to be.]
> GB: "Good as new! Better, even! …Hey, uh — between us? Someone's been takin'
> buttons all over town. I got a hunch who. Big guy. Says he 'collects things.'
> I've probably said too much!"

**Reveal beats around it (each gets its OWN voice later, not goofball):**
- Tiny Mouse (counter): "Third drawer of buttons gone this week — THIRD! I've a
  shop to run and I'm down to safety pins. I wish for a jar that never runs empty."
- Wolf (counter, 'disguised'): "I'm gonna have the finest button collection the
  world's ever seen! The name's… 'Sir Reginald Notawolf.' No relation!" → drops
  🍬 gumdrop, 🔵 blue, ❤️ heart buttons into the Satchel.
- Show Red (story mode): "That heart button? Grandma's — I'd know it anywhere."
  … "Blue's the mouse's. Gumdrop's the cookie's. 'Notawolf.' He's not even trying."

---

# ✍️ APPROVED SCRIPTS — Willow cast (owner-approved, each own voice)

## 🐭 Tiny Mouse — frazzled, house-proud seamstress
1. "Grand Opening" (counter): "Big day — I'm opening a sewing shop! Well, it'll BE
   a shop once I catch up. Orders out the door and I've got two paws. I wish for
   scissors that snip on their own — tidy lines only, I have a reputation to build."
2. "Forty-One Bows" (counter): "Forty-one bows by Friday. Forty. ONE. My paws cramp
   just saying it. Charm me some ribbon that ties its own bows? Neat ones! Not those
   sad droopy loops."
3. "The Vanishing Drawer" (counter, HOOK): "Third drawer of buttons gone this week —
   THIRD! I lock up every night, I SWEAR it. Down to safety pins and stubbornness.
   I wish for a button jar that never runs empty. Humor a mouse."
   → ON GRANTING she says: "Oh, bless you — a jar that never empties! Tell you what:
   if you ever find any of my buttons out there, just keep 'em. I've got a whole JAR
   now. Consider it a thank-you." (⇒ this authorizes keeping her BLUE button, so it
   can be given to the Gingerbread Man with no continuity snag.)

## 🐷🐷 The Two Pigs — bickering comedy duo (Pig One catastrophizes; Pig Two in denial)
Two full rounds of houses blowing down (their upgrades keep losing to the huff-and-
puff — that's the joke), then they move.
1. "Straw Poll" (Pig One): "So my house is GONE. Big windbag huffed and — poof —
   straw everywhere. I wish for stronger hay. Reinforced. Windproof. Possibly
   bulletproof."
2. "Sticking Point" (Pig Two): "Okay so maybe sticks weren't the flex I claimed. One
   breeze and my place folded like a picnic table. It's fine. It's FINE. I wish for
   stronger sticks. Don't tell my brother."
3. "Round Two" (Pig One, hay-dusted): "The reinforced hay? Gone. He huffed, he
   puffed — you know the drill. It was WINDPROOF! I wish for… okay, iron hay. Is iron
   hay a thing? Make it a thing."
4. "Also Round Two" (Pig Two, twiggy): "Before you say anything — the sticks held a
   whole DAY this time. Progress! Then… not progress. I wish for sticks that huff
   back. Can wood be aggressive? Asking for me."
5. "Moving Day" (BOTH together): "New plan: we give up. We're moving in with our
   brother — the smug one who built with brick, some fancier realm entirely. We just
   need… a small suitcase that fits a whole house. Don't ask questions. Can you?"
   → they LEAVE Willow and reappear together in the brick house in a later realm.

## 🐑 Bo Peep — story-mode character (like Red); her quest turns ON the sheep hunt
1. (rushes in): "Have you seen a sheep? ANY sheep? I had — well, a LOT this morning.
   Now I have a concerning amount of empty field and one very smug crook."
2. "They keep wandering off. Or being wandered off, I can't tell anymore. Could you
   brew me something so the little woollies stay put? A homing charm, a sense of
   direction, anything."
3. (we brew it): "You're a gem. One more thing — the ones already gone? I can't just
   leave them out there. If you spot a stray while you're about… bring it home to me?
   Please?" → YOU ACCEPT (can't not) ⇒ this switches ON sheep-collecting (the hunt).
Breadcrumb: sheep vanishing + a certain wolf who "could eat a whole sheep."

## 🐺 The Wolf — world's worst master of disguise (theatrical, smug, fools no one)
TELL = ridiculous fake names + terrible visual disguises + an AUDIO CUE on arrival
(a stifled "awooo—ahem" he can't quite swallow, heard before you see the costume).
- Visit A "Sir Reginald Notawolf" (monocle + tiny hat): "Good day! Wealthy gentleman
  collector — 'Sir Reginald Notawolf.' NO relation. Assembling the finest button
  collection the realm's ever seen. Wouldn't know anything about missing buttons."
  → drops 🍬 gumdrop, 🔵 blue, ❤️ heart buttons into the Satchel.
- Visit B "Grandmothy" (bonnet): "Why hello, dearie. Sweet old grandmother, name of…
  'Grandmothy.' Normal granny, big eyes, big teeth, all the better to— I mean. Go on."
- Visit C "The Hungry Truth" (barely disguised): "Off the record? I wish I could stop
  being so HUNGRY all the time. A cookie walks by and I just— ANYWAY. Fix that."
- Visit D "Refund" (indignant): "It didn't WORK! Hungrier than ever — I could eat a
  whole SHEEP! You owe me. Grant me a free one, on the house. I know my rights."

## Background customers (flavor only, no quests): Sleepy Owl, Village Baker (+maybe 1)

### Writing TODOs (owner notes, revisit)
- Keep every character's VOICE distinct — don't let them start sounding the same.
- Revise Pig Two's "sticks that huff back / can wood be aggressive" line — owner
  doesn't like it yet.
- Background customers (Sleepy Owl, Village Baker) still need their OWN little
  arcs told through their series of wishes (not part of the main wolf story).
- When wrapping up the Willow storyline, revisit each character with follow-up
  wishes that CONTINUE their stories beyond the main arc.

### Pig Two — REVISED lines (done, replaces the disliked "aggressive wood" version)
Voice: aggressively in denial, downplays every disaster.
1. "Okay, so maybe sticks weren't the upgrade I bragged about. One breeze and the
   whole place folded like a lawn chair. It's fine! Totally fine. I wish for
   stronger sticks — the good stuff this time. Don't tell my brother."
2. "Update: the new sticks lasted a whole DAY. Personal best! Then… less of a best.
   I'm not panicking, YOU'RE panicking. I wish for sticks that don't give up the
   second somebody sighs near them."
Moving Day (both, joint story-mode scene → suitcase wish → they leave Willow;
reappear later in the brick realm when it exists). Wired v184.

### BUILT v185 — the button clue-chain (core)
Wired end-to-end as gated story events (GAME.buttonStep 0→3), triggered by
maybeButtonChain() once Tiny Mouse's button-jar wish is done:
1. Wolf arrives as "Sir Reginald Notawolf" (costume placeholder — NOT grandma),
   makes a button-polish wish; on resolve he "drops" 🍬 gumdrop, 🔵 blue, ❤️ heart
   buttons into the Satchel (buttonStep→1).
2. Show Red (story mode): she IDs Grandma's heart button, keeps it (removed);
   gumdrop button becomes LOCKED/sparkly keepsake; blue kept (buttonStep→2).
3. Gingerbread hand-off (story mode): we give him the blue button (removed), the
   locked gumdrop stays with us; narrate his sprite gaining a blue button
   (buttonStep→3). ⇒ NEEDS ART: updated Gingerbread sprite with a blue button.
TODO (owner): Wolf costume art (rotating disguises + fake names); Wolf's OWN
customer arc (hunger wishes: "stop being so hungry" → "didn't work, free wish"),
appearing as a regular customer possibly before Red's warning.

### Wolf ART received + integrated (v186)
- 6 costumes cut out clean: wolf_bowler, wolf_tophat (= "Sir Reginald Notawolf",
  used in the button chain), wolf_detective, wolf_tourist, wolf_sherlock,
  wolf_delivery.
- 12 normal-wear story-mode poses (his own arc, like Red's): wolf_shrug, wolf_idea,
  wolf_sneaky, wolf_point, wolf_talk, wolf_scratch, wolf_worried, wolf_surprised,
  wolf_grin, wolf_puzzled, wolf_pleased, wolf_offer.
- Story mode now supports a generic `fig:"<artkey>"` figure (not just Red's poses),
  so any character with full-body art appears in story mode.
- TODO: build the Wolf's OWN customer arc (hunger wishes) using normal-wear poses +
  rotate his costumes/fake names on his appearances. Grandma finale art pending.

### BUILT v187 — the Wolf's own arc (recurring, non-main-story)
4 story-mode visits, each a different costume + fake name, running gag = his
bottomless hunger (WOLF_VISITS + maybeWolfArc, paced ~every 5 customers, can
precede Red's warning). Each: costume banter → hunger wish → outro.
1. "Hank, a Tourist" (wolf_tourist) — hungry all the time.
2. "Wally, W. Wolf Deliveries" (wolf_delivery) — "didn't work, I could eat a whole
   sheep, free wish!"
3. "Detective Sherwood Woolf" (wolf_sherlock) — investigating who ate all the pies.
4. "Baron von Nothungry" (wolf_bowler) — drops the act, near-sincere plea.
Uses one pose per costume (enough). Optional future polish: extra expression
variants of tourist/delivery/sherlock/bowler (hungry/caught faces) for in-scene
emoting. Grandma finale art still pending.

### Hank (tourist) expression variants (v190)
Added 5 tourist-costume expressions: wolf_tourist_sly, _cheers, _hungry, _shrug,
_arms. Wolf visits now support per-beat `fig` + per-outcome outro fig, so Hank
EMOTES through his scene: sly (scoping) → hungry (belly-clutch) → cheers (win) /
arms-crossed (lose). This is the template for giving other costumes multiple
expressions. (Owner may send more expression sets for delivery/sherlock/bowler.)

### Sherlock (detective) expression variants (v192)
Added 6 sherlock-costume expressions: wolf_sherlock_pie, _magnify, _aha, _arms,
_ponder, _eye (a dramatic close-up, not yet wired). His visit now emotes:
holds the pie "evidence" (pie) → ponders his sustenance (ponder) → triumphant
"aha!" on a win / arms-crossed on a loss. (delivery + bowler still emoji-single-
pose; owner may send expression sets for those too.)

### Delivery (Wally) expression variants (v193)
Added 6 delivery-costume expressions: wolf_delivery_announce, _idea, _loaded,
_angry, _sheepish, _thumbsup. His visit now emotes: arms-wide "delivery for—!"
(announce) → indignant "you owe me a freebie" (angry) → thumbs-up wink on a win
(thumbsup) / sheepish slink on a loss (sheepish). Only the BOWLER (Baron von
Nothungry) remains single-pose — owner may send an expression set for it.

### Art cutout method upgrade — alpha matting (v194)
The pervasive "white stuff" on the wolf was white-contaminated edge pixels (halo)
from binary color-thresholding. Fixed by proper ALPHA MATTING via pymatting
(closed-form matte + foreground estimation), which re-estimates true edge colors
so there's no white fringe. (rembg/U2Net AI model is blocked by egress policy, but
pymatting needs no download.) Pipeline: color-threshold → trimap (erode fg/bg,
remove large+small PURE-FLAT enclosed gaps to protect eyes/teeth) → estimate_alpha_cf
→ estimate_foreground_ml. Re-cut all 35 wolf images. USE THIS for future character
cutouts with lots of light areas.
