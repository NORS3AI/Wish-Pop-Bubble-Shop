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

## 🅱️ Clean-streak Stardust reward (no-allergy bonus)

**The gist:** reward players with Stardust ✨ for a streak of wishes granted
*without triggering the allergy*. Escalating: e.g. 3 clean in a row → 5 dust,
4 in a row → 8–10 dust, and so on. Breaking the streak (any allergy reaction)
resets it.

**Why:** right now the only downside of triggering an allergy is a gold hit, and
gold stops mattering once you're rich. Stardust always matters (there's always
another skin to want), so tying clean play to Stardust gives the allergy system
real teeth again — as a *carrot*, which suits a cozy game better than a bigger
*stick*.

**Open questions / things to tune:**
- **What counts as "clean"?** Probably: served with the allergy meter in the
  green (no yellow/red reaction). A fully-green serve extends the streak.
- **Balance risk:** clean wishes might be *easier* than they feel — lots of
  customers have no allergy at all, and allergic ones are often avoidable. If
  streaks are easy, the reward inflates. Two levers to fix that:
  - Only count wishes that *actually had an allergy risk* (customer had an
    allergy and you kept it green). Rewards genuine restraint/skill, not just
    getting lucky with no-allergy customers.
  - Keep the per-step numbers modest and let the escalation do the exciting part.
- **Feedback:** show a streak counter (🔥 ×3) so the run feels alive and losing
  it stings a little (in a good way).
- Possibly make Stardust a bit harder to get elsewhere so this becomes a
  meaningful primary path to cosmetics.

**Build note:** "dust" = the existing **Stardust** currency (`GAME.stardust`).
Skins cost ~120; quests give 15–55; well drops 10–45 — so streak rewards in the
~5–15 range fit the existing economy.

---

## Done / shipped
- _(nothing moved here yet)_
