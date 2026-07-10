# Wish Pop — Idea Parking Lot

A running list of design ideas we've talked about but haven't built yet.
Nothing here is final — it's just a place so we don't forget the good stuff.
Newest ideas near the top. When something ships, move it to "Done / shipped".

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
