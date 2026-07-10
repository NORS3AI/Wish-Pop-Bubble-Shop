# Wish Pop — Idea Parking Lot

A running list of design ideas we've talked about but haven't built yet.
Nothing here is final — it's just a place so we don't forget the good stuff.
Newest ideas near the top. When something ships, move it to "Done / shipped".

---

## 🆕 "Catch the ripples" — tap falling drops in order (minigame / event)

**The gist:** drops land all over the screen. Each landing spot shows a small circle
that **expands in rings** (small dot → ring → bigger ring → fade out, ~3 pulses). You
must **tap the spots in the order they landed, as fast as you can**, before they fade.
Multiple are on screen at once, so it's a speed + prioritization test (tap the oldest/
about-to-fade one first).

**Theme is flexible — pick to match the realm.** Doesn't have to be rain. Front-runners:
- **Falling wishing stars** ⭐ — LIKED. Very on-brand for *Wish Pop* (catch wishes as they
  fall). Realm/map home still TBD.
- **Spilled wine at the King's feast** 🍷 — LIKED. Someone knocks over their goblet and it's
  about to splatter the King's cloak; tap the droplets in order before they stain it.
  Perfect fit for the **Castle / Royal Court** realm.
- Others if useful: rain 🌧️ (stormy realm), blossoms 🌸 (spring), snowflakes ❄️ (winter),
  fireflies ✨ (evening garden, blink instead of ripple).

**Notes:** easy to build; the design work is mostly (a) picking theme + realm home, and
(b) tuning fade speed / how many are on screen at once for difficulty. Good candidate
for a realm event AND for the practice-shop idea below.

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
