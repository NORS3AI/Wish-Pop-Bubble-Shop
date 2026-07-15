/* ==========================================================================
 * Wish Pop: Bubble Shop — UI / SCREEN FLOW (v3 Cauldron-First)
 * Start -> Customer -> Scoop -> Pop (draft a hand) -> Cauldron -> Result
 * ======================================================================== */
(function () {
"use strict";

const { R, newRound, applyTripleMatch, scoreMix, scoreResult, BALANCE } = ENGINE;
const D = DATA;
const BUILD = "v314"; // bump on each deploy; shown on the start screen to verify the live version
if (typeof ART !== "undefined" && ART.setVersion) ART.setVersion(BUILD); // cache-bust all art per build so updated images always refetch

/* --- persistent save ---------------------------------------------------- */
const SAVE_KEY = "wishpop_save_v1";
const GAME = loadGame();
function loadGame() {
  let g = null;
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.gold === "number") g = s; } catch (e) {}
  if (!g) g = { gold: BALANCE.START_GOLD, treats: 3, unlocked: {} };
  return normalizeGame(g);
}
// backfill cosmetic fields for older saves (so new features never crash on load)
function normalizeGame(g) {
  if (typeof g.stardust !== "number") g.stardust = 0;
  if (typeof g.pearls !== "number") g.pearls = 0; // rare currency — some customers (the wish-fish) pay in pearls, not gold
  if (typeof g.keys !== "number") g.keys = 0; // Treasure keys popped from bubbles → open the Vault
  if (typeof g.recycled !== "number") g.recycled = 0; // lifetime junk recycled (drives achievements)
  if (typeof g.streak !== "number") g.streak = 0;
  if (typeof g.bestStreak !== "number") g.bestStreak = 0;
  if (typeof g.cleanStreak !== "number") g.cleanStreak = 0;         // allergy-free streak (risky wishes granted clean)
  if (typeof g.bestCleanStreak !== "number") g.bestCleanStreak = 0;
  if (typeof g.nextEventAt !== "number") g.nextEventAt = -1; // -1 = uninitialized (set on first play)
  if (typeof g.rumpelSeen !== "boolean") g.rumpelSeen = false; // offered a junk visitor while bin full?
  if (typeof g.goblinTurn !== "boolean") g.goblinTurn = false; // alternate Rumpelstiltskin <-> the goblin
  if (typeof g.danceLessons !== "number") g.danceLessons = 0; // ball dance lessons taught (paces toward Cinderella)
  if (typeof g.seenIntro !== "boolean") g.seenIntro = false; // played the Willow arrival + Little Red tutorial yet?
  if (typeof g.storyStep !== "number") g.storyStep = 0;      // Little Red's story-thread progress (0=none,2=arrival done,3=vacation,4=impostor)
  if (typeof g.storyNextAt !== "number") g.storyNextAt = -1; // servedTotal at which Red's next story visit is due (-1 = unscheduled)
  if (typeof g.wolfWatch !== "boolean") g.wolfWatch = false; // Little Red asked us to watch for the grandma impostor
  if (typeof g.bopeepMet !== "boolean") g.bopeepMet = false;  // met Bo Peep + took her quest → sheep hunt is ON
  if (typeof g.pigsMoved !== "boolean") g.pigsMoved = false;  // the two pigs have moved out of Willow (to the brick house)
  if (typeof g.buttonStep !== "number") g.buttonStep = 0;     // button clue-chain: 0=none,1=collected,2=shown Red,3=returned
  if (typeof g.buttonChainAt !== "number") g.buttonChainAt = -1; // servedTotal when the next button-chain beat is due
  if (typeof g.wolfArcStep !== "number") g.wolfArcStep = 0;   // the Wolf's own visit count (disguise/hunger arc)
  if (typeof g.wolfArcAt !== "number") g.wolfArcAt = -1;      // servedTotal when the Wolf's next visit is due
  if (typeof g.goldilocksStep !== "number") g.goldilocksStep = 0; // Goldilocks' teddy-bear quest: 0=none,1=have the 3 bears,2=delivered
  if (typeof g.goldilocksAt !== "number") g.goldilocksAt = -1;    // servedTotal when the next Goldilocks-quest beat is due
  if (typeof g.bandStep !== "number") g.bandStep = 0;    // Bandit Bears autograph quest: 0 none · 1 announced(blank) · 2 Honey · 3 Roxie · 4 Pepper(complete) · 5 delivered
  if (typeof g.bandAt !== "number") g.bandAt = -1;       // servedTotal when the next Bandit-Bears beat is due
  if (typeof g.grandmaWolfSeen !== "boolean") g.grandmaWolfSeen = false; // played the "disguised wolf visits → tell Red" bridge into the finale
  if (!g.lineRot || typeof g.lineRot !== "object") g.lineRot = {}; // per-customer rotation index for everyday (non-story) wish lines
  if (typeof g.hareAt !== "number") g.hareAt = -1;          // servedTotal when the Hare's next (early) race visit is due
  if (!g.tortoiseSeen || typeof g.tortoiseSeen !== "object") g.tortoiseSeen = {}; // realmId -> the Tortoise has plodded in as the last pre-finale customer
  if (typeof g.realm !== "string" || !D.REALM_BY_ID[g.realm]) g.realm = "willow"; // current location
  if (!g.unlockedRealms || typeof g.unlockedRealms !== "object") g.unlockedRealms = {};
  g.unlockedRealms.willow = true; // the starter realm is always unlocked
  if (!g.realmEvents || typeof g.realmEvents !== "object") g.realmEvents = {}; // realmId -> events cleared (story progress)
  if (!g.finaleWon || typeof g.finaleWon !== "object") g.finaleWon = {}; // realmId -> finale beaten (grants the Realm Key)
  if (!Array.isArray(g.stackBest)) g.stackBest = []; // top-3 Sky-High Savings Infinite scores
  if (!g.hunts || typeof g.hunts !== "object") g.hunts = {}; // realmId -> { found, done } collection scavenger hunt
  if (typeof g.huntCelebrate === "undefined") g.huntCelebrate = null; // realmId pending a completion thank-you card
  if (typeof g.wellIntro !== "number") g.wellIntro = 0; // Wishy's wishing well: 0 not introduced · 1 introduced (home button + arrow, tutorial pending) · 2 first wish made (Wishy has left)
  if (!g.satchel || typeof g.satchel !== "object") g.satchel = {}; // main inventory: itemId -> count (quest / keepsake items)
  if (!g.custStory || typeof g.custStory !== "object") g.custStory = {}; // customerId -> chapter index (their wishes tell an ongoing arc)
  if (!g.carpetSkin || g.carpetSkin < 1 || g.carpetSkin > 10) g.carpetSkin = 5; // Magic Carpet Dash chosen rug (5 = moon carpet)
  if (!Array.isArray(g.carpetBest)) g.carpetBest = []; // top-3 Magic Carpet Dash Infinite survival times (seconds)
  if (!g.stats || typeof g.stats !== "object") g.stats = {};
  ["served", "perfect", "bossWins", "rings", "bags", "rushWins"].forEach(k => { if (typeof g.stats[k] !== "number") g.stats[k] = 0; });
  if (!g.quests || typeof g.quests !== "object") g.quests = { day: "", week: -1, daily: [], weekly: [], dailyBonus: false };
  if (!Array.isArray(g.trash)) g.trash = [];
  if (!g.owned || typeof g.owned !== "object") g.owned = {};
  if (!g.equipped || typeof g.equipped !== "object") g.equipped = {};
  Object.keys(D.COSMETICS).forEach(kind => {
    D.COSMETICS[kind].forEach(c => { if (c.default) g.owned[c.id] = true; });
    const def = D.COSMETICS[kind].find(c => c.default) || D.COSMETICS[kind][0];
    if (!g.equipped[kind] || !D.COSMETIC_BY_ID[g.equipped[kind]]) g.equipped[kind] = def.id;
  });
  return g;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(GAME)); } catch (e) {} }
// --- Realms: the current location (shop name never changes, only the place) ---
function currentRealm() { return D.REALM_BY_ID[GAME.realm] || D.REALM_BY_ID.willow; }
function realmIngredients() { return currentRealm().ingredients || D.INGREDIENTS; }
function realmCustomers() { return currentRealm().customers || D.CUSTOMERS; }
function realmUnlocked(id) { return !!GAME.unlockedRealms[id]; }
/* --- Realm story progress: events cleared per realm (the pacing backbone). Infrastructure
   for the "clear N events → next realm opens" loop; not yet enforced on unlock. --- */
function realmEventsNeeded(id) { const r = D.REALM_BY_ID[id]; return (r && r.eventsNeeded) || 0; }
function realmEventsCleared(id) { const need = realmEventsNeeded(id); return Math.min(need, (GAME.realmEvents && GAME.realmEvents[id]) || 0); }
function realmStoryComplete(id) { const need = realmEventsNeeded(id); return need > 0 && realmEventsCleared(id) >= need; }
function realmFinaleWon(id) { return !!(GAME.finaleWon && GAME.finaleWon[id]); }
// Each realm's culminating finale (a must-win event that drops the Realm Key). Only Willow is
// wired so far (the wolf); returns null for realms whose finale isn't built yet.
function realmFinale(id) { return id === "willow" ? renderWolfFinale : id === "courtyard" ? renderFeastFinale : id === "beanstalk" ? renderStackFinale : null; }
// A regular story event was played (win OR lose — attempting counts). Caps at need-1, so the
// LAST slot is reserved for the must-win finale.
function markRealmEventCleared() {
  const id = GAME.realm, need = realmEventsNeeded(id); if (!need) return;
  GAME.realmEvents[id] = Math.min(need - 1, ((GAME.realmEvents && GAME.realmEvents[id]) || 0) + 1);
  save();
}
// The finale was WON → completes the story and grants the Realm Key for the next realm.
function markRealmFinaleWon() {
  const id = GAME.realm, need = realmEventsNeeded(id);
  if (need) GAME.realmEvents[id] = need;
  GAME.finaleWon[id] = true;
  save();
}
// Apply the current realm's palette theme to the page (a body class).
function applyRealmTheme() {
  const cls = document.body.className.split(/\s+/).filter(c => c && !c.startsWith("realm-"));
  const t = currentRealm().theme; if (t) cls.push("realm-" + t);
  document.body.className = cls.join(" ");
}
// currently-equipped cosmetics
function equippedCauldronClass() { return "skin-" + (GAME.equipped.cauldron || "cauldron_classic"); }
function equippedFamiliarChip() { return buddyArt(GAME.equipped.familiar); }

/* --- custom art helpers: use an uploaded image if present, else the emoji ---
 * (see art.js + /docs/art/README.md). Each returns an inline HTML string. */
function ingArt(id, cls)  { const ing = D.INGREDIENT_BY_ID[id]; return ART.tag("ing_" + id, ing ? ing.emoji : "❔", cls || "ing-art"); }
function charmArt(id, cls) { const ch = D.SPECIAL_CHARMS[id]; return ART.tag("charm_" + id, ch ? ch.emoji : "❔", cls || "charm-art"); }
function custArt(c, cls)  { return ART.tag(c.art || ("customer_" + c.id), c.emoji, cls || "cust-art"); }
// Per-customer size tweaks in the arch frame (1 = default). Some art fills its
// canvas more than others, so a few get scaled down to sit comfortably.
const CHAR_SCALE = { owl: 0.82, tortoise: 0.82, hare: 0.9, fish: 0.66, pigs_moving: 0.78 };
// per-character vertical nudge in the portrait frame (% of the frame width; positive = lower)
const CHAR_OFFY = { fish: 9 };
const PEARL = '<span class="pearl-ic" aria-label="pearl"></span>';   // a glossy CSS pearl (nicer than any emoji)

/* ═══════════════════════════════════════════════════════════════════════════
 * REALM PACING — the one place to tune how long a realm runs and how its
 * story beats, quests, and events are spread out. All numbers are counted in
 * "orders" (customers served).
 *
 * REALM LENGTH is set by two knobs:
 *   • eventEvery  (here)            — orders between fairytale events
 *   • eventsNeeded (in data.js REALMS) — events before the finale
 *   The finale lands at roughly  eventsNeeded × eventEvery  orders.
 *   Willow: 5 × 18 ≈ 90 orders ≈ ~2 hours (the opening realm).
 *
 * To MOVE A BEAT earlier/later, change its "...After"/"...Every" number below.
 * To ADD A QUEST later, give it a trigger + a number here and read it with
 *   pacing("yourKey", fallback).  Nothing else in the code hard-codes timing.
 * A realm with no entry here just uses the fallbacks (its old behavior).
 * ═══════════════════════════════════════════════════════════════════════════ */
const REALM_PACING = {
  willow: {
    eventEvery:       22,  // orders between events (was 10). Finale lands at ~(eventsNeeded−1)×eventEvery ≈ 88 orders. 4 mini-games + finale.
    boPeepAfter:       4,  // Bo Peep's sheep quest opens this many orders in
    hareFirstAfter:    6,  // the Hare's first zoom-through
    hareAgainEvery:   14,  // orders between his later race cameos
    goldilocksAfter:  44,  // Tiny Mouse's teddy → Goldilocks bear-delivery quest begins (mid-game, once she's a familiar face)
    goldilocksDeliver: 4,  // orders between getting the bears and Goldilocks collecting
    buttonChainGap:    6,  // orders between each of the 3 dropped-button clues
    wolfArcEvery:     12,  // orders between the Wolf's recurring disguise visits
    redVacationAfter: 24,  // Red's "vacation" beat (after her arrival wish is done)
    redImpostorAfter: 28,  // Red's "impostor" beat (after the vacation)
    wellAfter:        30,  // Wishy the Fish introduces his wishing well (mid-game — also gated on having gold to spend)
    bandAfter:        52,  // the Bandit Bears come to town (you get the blank tour poster)
    bandVisitGap:      6,  // orders between the announcement and each member's autograph visit (and the final delivery)
  },
};
// Read a pacing number for the current realm, falling back to the old default.
function pacing(key, dflt) { const p = REALM_PACING[GAME.realm]; return p && p[key] != null ? p[key] : dflt; }
// A customer's face with an EXPRESSION. "normal" is the base customer_<id>.png;
// happy / angry / allergic are customer_<id>_<mood>.png. If that art isn't there,
// it falls back to the given emoji (the emotion face we've always shown).
function custMoodArt(c, mood, fallbackEmoji, cls) {
  const key = mood && mood !== "normal" ? "customer_" + c.id + "_" + mood : "customer_" + c.id;
  return ART.tag(key, fallbackEmoji || c.emoji, cls || "cust-art");
}
// The main-screen brand mark. If art/logo.webp is present, show it; otherwise show
// the "Wish Pop / Bubble Shop" wordmark, and hot-swap to the image if it loads.
function logoMarkup() {
  if (ART.isReady("logo")) return `<img class="wp-logo" src="${ART.url("logo")}" alt="Wish Pop Bubble Shop" draggable="false">`;
  ART.ensure("logo", () => { const s = screen("start"); if (s && s.classList.contains("active")) renderStart(); });
  return `<div class="logo">Wish Pop</div><div class="sub">Bubble Shop</div>`;
}
// A gentle layer of sparkles drifting down behind the logo (pure-CSS particles).
function logoSparkles() {
  const N = 11, out = [];
  for (let i = 0; i < N; i++) {
    const left = Math.round(3 + i * (94 / (N - 1)) + (i % 2 ? 3 : -3));
    const size = 5 + (i % 3) * 3;
    const delay = (i * 0.45).toFixed(2);
    const dur = (3.4 + (i % 4) * 0.8).toFixed(2);
    out.push(`<span class="lspark" style="left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`);
  }
  return out.join("");
}
function buddyArt(id, cls) { const c = D.COSMETIC_BY_ID[id]; return ART.tag("buddy_" + id, c ? c.chip : D.FAMILIAR.emoji, cls || ""); }
function trashArt(id, cls) { const t = D.TRASH_BY_ID[id]; return ART.tag("trash_" + id, t ? t.emoji : "🗑️", cls || "trash-art"); }
// recycle values for a piece of trash
function trashCoins(id) { const t = D.TRASH_BY_ID[id]; return t ? t.coins : 0; }
function trashDust(id)  { const t = D.TRASH_BY_ID[id]; return t ? Math.max(1, Math.round(t.coins / BALANCE.TRASH_DUST_DIVISOR)) : 0; }
// apply an optional custom background image to the whole app (once, at boot)
function applyCustomBackground() {
  ART.ensure("background", u => { const app = document.getElementById("app"); if (app) { app.style.backgroundImage = "url(" + u + ")"; app.classList.add("has-bg"); } });
}
// The home/start screen gets its own scene background (art/home_bg.jpg). Scoped to
// the start screen so it never hurts readability on the busy gameplay screens.
function applyHomeBackground() {
  const url = "art/home_bg.jpg";
  const im = new Image();
  im.onload = () => { const s = document.getElementById("screen-start"); if (s) { s.style.backgroundImage = "url('" + url + "')"; s.classList.add("has-home-bg"); } };
  im.src = url;
}
// Per-realm scene background for the customer screen (Willow uses the village art).
const REALM_BG = { willow: "art/shop_interior.jpg" };
function applyRealmBackground(el) {
  // el lets a caller target a SPECIFIC cust-bg (the result screen has its own with the
  // same id as the arrival screen, so getElementById alone would grab the wrong one).
  const bg = el || document.getElementById("cust-bg"); if (!bg) return;
  const url = REALM_BG[GAME.realm];
  if (!url) { bg.style.backgroundImage = ""; bg.classList.remove("has-realm-bg"); return; }
  const im = new Image();
  im.onload = () => { bg.style.backgroundImage = "url('" + url + "')"; bg.classList.add("has-realm-bg"); };
  im.src = url;
}
// apply an optional custom cauldron-pot image over the color skin
function applyCauldronArt() {
  const key = "cauldron_" + (GAME.equipped.cauldron || "cauldron_classic");
  ART.ensure(key, u => { const el = document.getElementById("cauldron"); if (el) { el.style.backgroundImage = "url(" + u + ")"; el.classList.add("has-art"); } });
}
// apply optional custom bubble images to a bubble container (pop field or scoop).
// Setting the class on the CONTAINER covers current AND future bubbles (bonus
// spawns, refills) with no rewiring. bubble.png = normal, bubble_bonus.png = golden.
function applyBubbleArt(container) {
  if (!container) return;
  // NOTE: url() inside a CSS custom property resolves relative to the STYLESHEET,
  // not the page — so make it absolute or it becomes css/art/... (404).
  const abs = u => "url('" + new URL(u, document.baseURI).href + "')";
  ART.ensure("bubble", u => { container.style.setProperty("--bubble-img", abs(u)); container.classList.add("has-bubble-art"); });
  ART.ensure("bubble_bonus", u => { container.style.setProperty("--bubble-bonus-img", abs(u)); container.classList.add("has-bonus-art"); });
}

let ROUND = null;
let servedTotal = +(localStorage.getItem("wishpop_served") || 0);

/* --- helpers ------------------------------------------------------------ */
const $ = sel => document.querySelector(sel);
function screen(id) { return document.getElementById("screen-" + id); }
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const sc = screen(id); sc.classList.add("active");
  // Full-bleed minigames: any screen containing a .mg-fullbleed play area drops the header/padding
  // and floats a corner menu button so the art fills the screen.
  const app = document.getElementById("app");
  if (app) app.classList.toggle("mg-full", !!sc.querySelector(".mg-fullbleed"));
}
function html(id, markup) { screen(id).innerHTML = markup; }
function on(sel, ev, fn) { const e = $(sel); if (e) e.addEventListener(ev, fn); }
let toastT = null;
function toast(msg) {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; $("#app").appendChild(t); }
  t.innerHTML = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1600);
}
function magicDot(type) { return `<span class="dot" style="background:${D.MAGIC[type]}"></span>`; }
function shade(hex, amt) {
  amt = amt == null ? -0.28 : amt; let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const cl = v => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}
function hud(title, opts) {
  const home = !(opts && opts.noHome);
  return `<div class="hud"><span class="hud-left">${home ? `<button class="hud-menu" id="hud-menu" aria-label="Menu">☰</button>` : ""}🐸 <span class="treatcount">${GAME.treats}</span></span>
    <span class="title">${title}</span><span class="gold">🪙 ${GAME.gold}</span></div>`;
}
// Escape hatch present on every screen's HUD: back to the home screen. If a round
// is in progress (scoop/pop/cauldron) we confirm first, since it won't be saved.
function goHome() {
  const active = document.querySelector(".screen.active");
  const inRound = active && /screen-(scoop|pop|mix)$/.test(active.id);
  const leave = () => { stopRoundTimers(); stopEventTimers(); renderStart(); };
  if (inRound) confirmDialog("Leave this round and head to the menu? This round won't be saved.", leave);
  else leave();
}
// cancel any in-flight event timers/animations and clear event state
function stopEventTimers() {
  if (typeof RUMPEL !== "undefined" && RUMPEL && RUMPEL.raf) cancelAnimationFrame(RUMPEL.raf);
  if (typeof GOBLIN !== "undefined" && GOBLIN) { if (GOBLIN.timer) clearTimeout(GOBLIN.timer); if (GOBLIN.cdTimer) clearTimeout(GOBLIN.cdTimer); }
  if (typeof DANCE !== "undefined" && DANCE) { if (DANCE.timer) clearTimeout(DANCE.timer); if (DANCE.cdTimer) clearTimeout(DANCE.cdTimer); if (DANCE.tTimer) clearTimeout(DANCE.tTimer); }
  if (typeof CAKE !== "undefined" && CAKE && CAKE.timer) clearTimeout(CAKE.timer);
  if (typeof WOLF !== "undefined" && WOLF && WOLF.tickTimer) clearInterval(WOLF.tickTimer);
  if (typeof FEAST !== "undefined" && FEAST && FEAST.tickTimer) clearInterval(FEAST.tickTimer);
  if (typeof STACK !== "undefined" && STACK && STACK.tickTimer) clearInterval(STACK.tickTimer);
  if (typeof WINE !== "undefined" && WINE && WINE.tickTimer) clearInterval(WINE.tickTimer);
  if (typeof wineMusicStop === "function") wineMusicStop();
  if (typeof BOUTIQUE !== "undefined" && BOUTIQUE && BOUTIQUE.tickTimer) clearInterval(BOUTIQUE.tickTimer);
  if (typeof CARPET !== "undefined" && CARPET && CARPET.tickTimer) clearInterval(CARPET.tickTimer);
  if (typeof carpetMusicStop === "function") carpetMusicStop();
  if (typeof RUMPEL !== "undefined") RUMPEL = null;
  if (typeof GOBLIN !== "undefined") GOBLIN = null;
  if (typeof WOLF !== "undefined") WOLF = null;
  if (typeof FEAST !== "undefined") FEAST = null;
  if (typeof STACK !== "undefined") STACK = null;
  if (typeof WINE !== "undefined") WINE = null;
  if (typeof BOUTIQUE !== "undefined") BOUTIQUE = null;
  if (typeof CARPET !== "undefined") CARPET = null;
  if (typeof DANCE !== "undefined") DANCE = null;
  if (typeof CAKE !== "undefined") CAKE = null;
  if (typeof DUEL !== "undefined") DUEL = null;
  if (typeof QUEEN !== "undefined") QUEEN = null;
  document.body.classList.remove("villain");
}
function syncHud(id) {
  const g = document.querySelector("#screen-" + id + " .hud .gold"); if (g) g.textContent = "🪙 " + GAME.gold;
  const t = document.querySelector("#screen-" + id + " .hud .treatcount"); if (t) t.textContent = GAME.treats;
}

/* ======================================================================= */
/* START                                                                   */
/* ======================================================================= */
// The home top bar: current pet (left), keys + coins, and a gear → Admin (right).
function homeBar() {
  return `<div class="home-bar">
    <div class="home-pet" title="Your buddy">${buddyArt(GAME.equipped.familiar, "home-pet-art")}</div>
    <div class="home-res">
      ${GAME.pearls > 0 ? `<span class="res-chip pearls"><span class="res-ic"></span><b>${GAME.pearls.toLocaleString()}</b></span>` : ""}
      <span class="res-chip"><span class="res-ic">🗝️</span><b>${GAME.keys || 0}</b></span>
      <span class="res-chip"><span class="res-ic">🪙</span><b>${(GAME.gold || 0).toLocaleString()}</b></span>
    </div>
    <button class="home-gear" id="home-gear" aria-label="Admin &amp; Settings">⚙️</button>
  </div>`;
}
// A bottom-nav plaque button: a framed wood plaque with an icon, label beneath.
function navBtn(id, icon, label) {
  return `<button class="home-nav-btn" id="${id}">
    <span class="nav-plaque"><img src="art/ui/btn_11.png" alt="" draggable="false"><span class="nav-ic">${icon}</span></span>
    <span class="nav-lbl">${label}</span>
  </button>`;
}
// how many daily quests are ready to claim (drives the Dailies badge)
function claimableDailies() {
  try { return ((GAME.quests && GAME.quests.daily) || []).filter(e => !e.claimed && questProgress(e).claimable).length; }
  catch (e) { return 0; }
}
function renderStart() {
  applyRealmTheme();
  const realm = currentRealm();
  const ready = claimableDailies();
  const dailyBadge = ready > 0 ? `<span class="daily-badge">${ready}</span>` : "";
  html("start", `
    ${homeBar()}
    <button class="home-daily" id="home-daily">
      <span class="nav-plaque home-daily-plaque"><img src="art/ui/btn_11.png" alt="" draggable="false"><span class="nav-ic">🎁</span>${dailyBadge}</span>
      <span class="nav-lbl">Dailies</span>
    </button>
    ${GAME.wellIntro >= 1 ? `<button class="home-well${GAME.wellIntro === 1 ? " nudge-well" : ""}" id="home-well">
      <span class="nav-plaque home-daily-plaque"><img src="art/ui/btn_11.png" alt="" draggable="false"><span class="nav-ic">🌟</span></span>
      <span class="nav-lbl">Well</span>
      ${GAME.wellIntro === 1 ? `<span class="well-arrow" aria-hidden="true">👉</span>` : ""}
    </button>` : ""}
    <div class="home-logo">
      <div class="logo-stage">
        <div class="logo-sparkles" aria-hidden="true">${logoSparkles()}</div>
        <div class="logo-float">${logoMarkup()}</div>
      </div>
      <div class="realm-here">${realm.icon} ${realm.name}</div>
      ${huntChipHtml()}
    </div>
    <div class="grow"></div>
    <button class="home-play" id="play-btn">
      <img class="home-play-bg" src="art/ui/btn_play.png" alt="Play" draggable="false">
    </button>
    <div class="home-nav">
      ${navBtn("nav-shop", "🛍️", "Shop")}
      ${navBtn("nav-satchel", "🎒", "Satchel")}
      ${navBtn("nav-map", "🗺️", "Realms")}
      ${navBtn("nav-vault", "🧰", "Collection")}
    </div>
    <div class="home-build">Build ${BUILD}</div>
  `);
  on("#play-btn", "click", startRound);
  on("#home-daily", "click", renderQuests);
  on("#home-well", "click", renderWell);
  on("#nav-shop", "click", renderMenu);
  on("#nav-satchel", "click", renderSatchel);
  on("#nav-map", "click", renderMap);
  on("#nav-vault", "click", renderVault);
  on("#home-gear", "click", renderAdmin);
  applyHomeBackground();
  show("start");
  maybeShowHuntCelebrate();
}

/* ======================================================================= */
/* STORY — Little Red Riding Hood's thread through Willow Wish Village.       */
/* A light, scripted layer that PUNCTUATES the normal shop (it never takes   */
/* it over). It opens the game: you arrive in the village, Little Red        */
/* arrives too (off to visit Grandma), and she becomes your very first       */
/* customer — a gentle tutorial wish. More beats of her tale arrive later.   */
/* renderStoryBeats() plays a sequence of illustrated dialogue cards, then   */
/* runs a callback. Cozy-with-a-wink in tone.                                 */
/* ======================================================================= */
function redCust() { return D.CUSTOMERS.find(c => c.id === "little_red") || { id: "little_red", name: "Little Red", emoji: "👧", wishType: "SafeSpell", line: "" }; }
// Full-body story poses (art/red_<pose>.png): wave, explain, idea, present, worried,
// cheer, think, point, offer, angry, annoyed, welcome. Falls back to her emoji.
function redPose(pose) { return ART.tag("red_" + (pose || "wave"), "👧", "story-face"); }
// SHORT characters (kids, etc.) read as tiny when a story figure is bottom-anchored
// at the default height — they sit low. Any fig whose key starts with one of these
// gets the taller ".tall" treatment so it fills the upper/middle screen. Add a
// prefix here for each future short character.
const SHORT_FIGS = ["goldi", "customer_goldilocks"];
function isShortFig(fig) { return !!fig && SHORT_FIGS.some(pre => fig.indexOf(pre) === 0); }
// ROUND characters are drawn inside a circular bubble (Wishy the Fish). Bottom-anchored
// at full height they're enormous and get clipped by the screen edge, so they get the
// ".round" treatment: smaller and floated in the middle so the whole bubble shows.
const ROUND_FIGS = ["customer_fish"];
function isRoundFig(fig) { return !!fig && ROUND_FIGS.some(pre => fig.indexOf(pre) === 0); }

let STORY_BEATS = null, STORY_I = 0, STORY_DONE = null, GALLERY = null, GALLERY_I = 0, STORY_BG_PREV = null;
const STORY_DEF_BG = "village_far";   // default story backdrop (a beat can override with `bg`)
function renderStoryBeats(beats, done) { STORY_BEATS = beats; STORY_I = 0; STORY_DONE = done || null; STORY_BG_PREV = null; storyPaint(); }
function storyAdvance() {
  SFX.unlock(); SFX.pop(1);
  if (STORY_I >= STORY_BEATS.length - 1) { const d = STORY_DONE; STORY_BEATS = null; STORY_DONE = null; if (d) d(); }
  else { STORY_I++; storyPaint(); }
}
// a swipe-through photo viewer (one big picture, ‹ › arrows + dots) for a beat's `gallery`
function galleryHtml() {
  const many = GALLERY.length > 1;
  const dots = many ? `<div class="gal-dots" id="gal-dots">${GALLERY.map((_, i) => `<span class="gal-dot${i === 0 ? " on" : ""}"></span>`).join("")}</div>` : "";
  return `<div class="story-gallery">
    ${many ? `<button class="gal-arrow gal-prev" id="gal-prev" aria-label="Previous">‹</button>` : ""}
    <div class="gal-frame"><img class="gal-pic" id="gal-pic" src="art/${GALLERY[0]}.webp?v=${BUILD}" alt="photo" draggable="false"></div>
    ${many ? `<button class="gal-arrow gal-next" id="gal-next" aria-label="Next">›</button>` : ""}
    ${dots}
  </div>`;
}
function wireGallery() {
  const paint = () => {
    const im = $("#gal-pic"); if (im) im.src = `art/${GALLERY[GALLERY_I]}.webp?v=${BUILD}`;
    const dd = $("#gal-dots"); if (dd) dd.querySelectorAll(".gal-dot").forEach((d, i) => d.classList.toggle("on", i === GALLERY_I));
    SFX.unlock(); SFX.pop(1);
  };
  on("#gal-prev", "click", () => { GALLERY_I = (GALLERY_I - 1 + GALLERY.length) % GALLERY.length; paint(); });
  on("#gal-next", "click", () => { GALLERY_I = (GALLERY_I + 1) % GALLERY.length; paint(); });
}
function storyPaint() {
  if (!STORY_BEATS) return;
  const b = STORY_BEATS[STORY_I], last = STORY_I >= STORY_BEATS.length - 1;
  let top = "", cls = "";
  if (b.vista) { cls = "vista"; }
  else if (b.gallery) { cls = "gallery-beat"; GALLERY = b.gallery; GALLERY_I = 0; top = galleryHtml(); }
  else if (b.scene) { top = `<div class="story-figure scene"><div class="story-scene">${b.scene}</div></div>`; }
  else if (b.fig) { const fc = (/duo/.test(b.fig) ? " wide" : /^autograph/.test(b.fig) ? " poster" : isRoundFig(b.fig) ? " round" : (isShortFig(b.fig) ? " tall" : "")) + (/^wolf/.test(b.fig) ? " wolf" : ""); top = `<div class="story-figure${fc}">${ART.tag(b.fig, "🐺", "story-face")}</div>`; }  // duo art smaller to fit width; a poster shows centred; a bubble-character (Wishy) shows small & centred; short characters (kids) get the taller boost
  else if (b.figEmoji) { top = `<div class="story-figure emoji"><span class="story-face">${b.figEmoji}</span></div>`; }  // a character without art yet (emoji placeholder)
  else { top = `<div class="story-figure">${redPose(b.pose)}</div>`; }
  // an item being handed over this beat (e.g. giving Red the heart button) — shown as a
  // glowing chip floating in front of the character
  const giveHtml = b.give ? `<div class="story-give">${ART.tag(b.give, b.giveEmoji || "🎁", "story-give-img")}</div>` : "";
  // backdrop: crossfade from the previous beat's scene to this one's (village → shop, etc.)
  const curBg = b.bg || STORY_DEF_BG, prevBg = STORY_BG_PREV || curBg;
  const bgHtml = `
    <div class="story-bg" style="background-image:url(art/${prevBg}.jpg?v=${BUILD})"></div>
    <div class="story-bg top${prevBg !== curBg ? " cross" : ""}" style="background-image:url(art/${curBg}.jpg?v=${BUILD})"></div>
    <div class="story-scrim"></div>`;
  STORY_BG_PREV = curBg;
  html("event", `
    <div class="story-card mg-fullbleed${cls ? " " + cls : ""}" id="story-card">
      ${bgHtml}
      ${top}
      ${giveHtml}
      <div class="story-below">
        ${b.name ? `<div class="story-name">${b.name}</div>` : ""}
        <div class="story-speech">${b.text}</div>
        <button class="btn story-next" id="story-next">${b.cta || (last ? "Let’s begin  ▸" : "Continue  ▸")}</button>
      </div>
    </div>
  `);
  on("#story-next", "click", storyAdvance);
  show("event");
  if (b.gallery) wireGallery();
  // art loads asynchronously; if this figure's art isn't cached yet, repaint once it arrives
  else if (!b.scene && !b.vista && !b.figEmoji) {
    const key = b.fig || ("red_" + (b.pose || "wave"));
    if (!ART.isReady(key)) ART.ensure(key, () => { if (STORY_BEATS && STORY_BEATS[STORY_I] === b) storyPaint(); });
  }
  // a handed item's art may also load late — repaint so the chip fills in
  if (b.give && !ART.isReady(b.give)) ART.ensure(b.give, () => { if (STORY_BEATS && STORY_BEATS[STORY_I] === b) storyPaint(); });
}
// The very-first-launch arrival: the village, then Little Red, then her tutorial wish.
function playArrivalIntro() {
  SFX.unlock();
  ["wave", "explain", "idea"].forEach(p => ART.ensure("red_" + p, () => {})); // pre-warm Red's arrival poses
  ["village_mid", "village_door"].forEach(n => { try { const im = new Image(); im.src = "art/" + n + ".jpg?v=" + BUILD; } catch (e) {} }); // preload the zoom frames
  renderStoryBeats([
    { vista: true, bg: "village_far", text: "A little path winds down into <b>Willow-Wish Village</b> — lanterns in the trees, banners on the rooftops, a castle beyond. And there, with its striped awning and bubbles drifting from the chimney, is your very own <b>Wish Pop Bubble Shop</b>." },
    { name: "Little Red", pose: "wave", bg: "village_far", text: "Oh — hello! I just arrived too. I’m off through the woods to visit my grandma. But everyone says the new wish‑shop is the heart of the village… is that <i>you</i>?" },
    { name: "Little Red", pose: "explain", bg: "village_mid", text: "Then let me be your very first customer! It’s a long walk to Grandma’s cottage… could you mix me a little charm of <b>safe passage</b>?" },
    { name: "Little Red", pose: "idea", bg: "village_door", cta: "Step inside  ▸", text: "Come on — let’s pop into the shop and I’ll show you how it works: <b>scoop</b> up some sparkle, <b>pop</b> the bubbles for magic, then <b>mix</b> it to match my wish!" },
  ], () => { GAME.seenIntro = true; GAME.storyStep = Math.max(GAME.storyStep, 1); save(); playZoomIn(() => startRedWish("red-arrival", "A little charm of safe passage for the woods, if you please — my very first wish in your shop!", { tutorial: true })); });
}
/* --- Little Red's later visits (Willow). Each: a chat, a photo/sketch she shows
   us, then a wish we grant. Paced a few customers apart by maybeRedVisit(). --- */
function playRedVacation() {
  SFX.unlock();
  ["cheer", "explain", "present", "point"].forEach(p => ART.ensure("red_" + p, () => {}));
  renderStoryBeats([
    { name: "Little Red", pose: "cheer", text: "You’re back! Oh — funny thing. I skipped all the way to Grandma’s cottage… and she wasn’t home!" },
    { name: "Little Red", pose: "explain", text: "Then I remembered — she’s away on <b>holiday</b>! Off at some sunny oasis, living it up. She sent me a whole stack of photos. Want to see?" },
    { name: "Little Red", pose: "present", gallery: ["grandma_1", "grandma_2", "grandma_3", "grandma_4", "grandma_5", "grandma_6", "grandma_7"], cta: "So sweet  ▸", text: "That’s her! Camel rides, ice cream, a flamingo floatie… (tap the ‹ › arrows to flip through). Isn’t she having the <i>best</i> time?" },
    { name: "Little Red", pose: "point", cta: "Make her wish  ▸", text: "So it’s just me at the cottage for now. Lovely and quiet… a bit <i>too</i> quiet, if I’m honest. Could you mix me a little <b>charm of good company</b>?" },
  ], () => startRedWish("red-vacation", "A little charm of good company for a quiet cottage — Grandma’s off on holiday, you see!"));
}
function playRedImpostor() {
  SFX.unlock();
  GAME.wolfWatch = true; save();   // from now on we're watching for the grandma impostor
  ["worried", "annoyed", "angry", "think"].forEach(p => ART.ensure("red_" + p, () => {}));
  renderStoryBeats([
    { name: "Little Red", pose: "worried", text: "Listen — something’s wrong. Grandma’s ‘home’ again… except that is <b>not</b> my grandma. I’d know her anywhere, and that is not her." },
    { name: "Little Red", pose: "annoyed", text: "Someone’s <i>pretending</i> to be her. Sitting in her cottage, wearing her bonnet, all teeth and grins. Gives me the shivers." },
    { name: "Little Red", pose: "angry", gallery: ["grandma_sketch"], cta: "I’ll watch for them  ▸", text: "I sketched them. <b>This</b> is the face. If this one ever slinks into your shop — tell me <b>immediately</b>. And if you learn anything about them, anything at all… I want to know." },
    { name: "Little Red", pose: "think", cta: "Make her wish  ▸", text: "Until we sort this out, I’d feel braver with a charm on me. Could you mix me a <b>charm of courage</b>? I’ve a feeling I’ll need it." },
  ], () => startRedWish("red-impostor", "A charm of courage, please — there’s a wolfish someone wearing my grandma’s bonnet, and I mean to face them."));
}
// Fire Red's next story visit when it comes due (a few served customers apart, Willow only).
function maybeRedVisit() {
  if (GAME.realm !== "willow") return false;
  if (GAME.storyStep === 2 && GAME.storyNextAt < 0) { GAME.storyNextAt = servedTotal + pacing("redVacationAfter", 3); save(); }
  else if (GAME.storyStep === 3 && GAME.storyNextAt < 0) { GAME.storyNextAt = servedTotal + pacing("redImpostorAfter", 4); save(); }
  if (GAME.storyNextAt >= 0 && servedTotal >= GAME.storyNextAt) {
    if (GAME.storyStep === 2) { GAME.storyStep = 3; GAME.storyNextAt = -1; save(); playRedVacation(); return true; }
    if (GAME.storyStep === 3) { GAME.storyStep = 4; GAME.storyNextAt = -1; save(); playRedImpostor(); return true; }
  }
  return false;
}
/* --- Wishy the Fish's Wishing Well. Mid-Willow (once you've a little gold to spend),
   Wishy swims up to introduce the well: toss a coin, pop a bubble, something lovely
   floats back. Ends by lighting up a 🌟 Well button on the home screen. We only have a
   few Wishy pictures, so his beats lean on his normal + happy face. --- */
function playWellIntro() {
  SFX.unlock();
  ["customer_fish", "customer_fish_happy"].forEach(k => ART.ensure(k, () => {}));
  renderStoryBeats([
    { name: "Wishy the Fish", fig: "customer_fish", text: "Blub — hello again! You grant wishes up here in your lovely shop… but did you know that I keep the old <b>wishing well</b> at the edge of the village?" },
    { name: "Wishy the Fish", fig: "customer_fish_happy", text: "It’s where the village tosses their coins to me. Drop one in, make a wish, and something lovely floats back up — a bit of sparkle, a treat, sometimes a whole new look for your cauldron!" },
    { name: "Wishy the Fish", fig: "customer_fish", cta: "Follow him  ▸", text: "Your purse is looking heavy enough — come, <b>follow me to my well</b>! And here, your very first coin is on me. I’ve popped a little <b>🌟 Well</b> button on your shopfront — meet me at the water!" },
  ], () => { GAME.wellIntro = 1; save(); renderStart(); });
}
// Wishy introduces his well mid-Willow, once you've enough gold to actually toss a coin.
function maybeWellIntro() {
  if (GAME.realm !== "willow") return false;
  if (GAME.wellIntro !== 0) return false;
  if (servedTotal < pacing("wellAfter", 30)) return false;
  if ((GAME.gold || 0) < BALANCE.WELL_COST) return false;   // wait until a wish is actually affordable
  playWellIntro();
  return true;
}
// One smooth, continuous zoom straight in through the shop's open door (the backdrop
// has already drifted to the shopfront during the chat), then a soft fade into the
// tutorial. Tap to skip.
function playZoomIn(done) {
  let finished = false;
  const finish = () => { if (finished) return; finished = true; clearTimeout(timer); if (done) done(); };
  html("event", `
    <div class="zoom-cine mg-fullbleed" id="zoom-cine">
      <img class="zoom-solo" src="art/village_door.jpg?v=${BUILD}" alt="" draggable="false">
      <div class="zoom-veil"></div>
      <div class="zoom-skip" id="zoom-skip">Tap to skip  ▸</div>
    </div>
  `);
  show("event");
  SFX.lift && SFX.lift();
  const timer = setTimeout(finish, 2600);
  on("#zoom-cine", "click", finish);
}
// A forced, gentle story customer (no boss/rush/vip/hunt) — used for any character's
// story-mode wish. tag drives the flavor + which goodbye plays; opts.tutorial makes it
// the easiest (first-wish) round.
function startStoryWish(cust, tag, line, opts) {
  opts = opts || {};
  SFX.unlock();
  stopRoundTimers();
  document.body.classList.remove("villain");
  applyRealmTheme();
  const realm = currentRealm();
  ROUND = newRound({ servedTotal: opts.tutorial ? 0 : servedTotal, betterScoop: !!(GAME.unlocked && GAME.unlocked.scoop), charmFinder: !opts.tutorial && !!(GAME.unlocked && GAME.unlocked.charm), customers: [cust], ingredientSet: realm.ingredients, magicPool: realm.magics, reqBonus: opts.tutorial ? 0 : (realm.reqBonus || 0) });
  injectInfused(ROUND); injectKeys(ROUND);   // (no sheep hunt on story wishes — keep the narrative clean)
  ROUND.rush = false; ROUND.vip = false; ROUND.keyStaked = false;
  ROUND.story = tag;
  ROUND.customer = Object.assign({}, ROUND.customer, { line: line || "A little wish, if you please!" });
  renderCustomer();
}
function startRedWish(tag, line, opts) { startStoryWish(redCust(), tag || "red-arrival", line, opts); }
// tags that route the result screen's Next button into a story-mode goodbye
function isStoryWish(tag) { return !!tag && (tag.indexOf("red-") === 0 || tag.indexOf("band-") === 0 || tag === "bo-peep" || tag === "pigs-moving" || tag === "wolf-buttons" || tag === "wolf-arc"); }
// Bo Peep — a story-mode shepherd (like Red). Meeting her turns ON the sheep hunt.
function boPeepCust() { return { id: "bo_peep", name: "Bo Peep", emoji: "👧", wishType: "SafeSpell", location: "Willow-Wish Village", line: "" }; }
function playBoPeep() {
  SFX.unlock();
  ["bopeep_worried", "bopeep_explain", "bopeep_warm"].forEach(f => ART.ensure(f, () => {}));
  GAME.bopeepMet = true; save();   // met her + took the quest → sheep start turning up as you play
  renderStoryBeats([
    { name: "Bo Peep", fig: "bopeep_worried", text: "Have you seen a sheep? <i>Any</i> sheep? I had — well, a LOT this morning. Now I’ve a concerning amount of empty field and one very smug crook." },
    { name: "Bo Peep", fig: "bopeep_explain", text: "They keep <i>wandering off</i>. Or being wandered off — I can’t tell anymore. Could you brew me something so the little woollies stay put? A homing charm, a sense of direction… <i>anything</i>." },
    { name: "Bo Peep", fig: "bopeep_warm", cta: "Take the quest  ▸", text: "You’re a gem. One more thing — the ones already gone? I can’t just leave them out there. If you spot a stray while you’re about… bring it home to me? Please?" },
  ], () => { toast("🐑 Quest: bring Bo Peep her lost sheep!"); startStoryWish(boPeepCust(), "bo-peep", "A little homing charm, please — so my woollies keep close and quit their wandering!"); });
}
// Bo Peep drops by once, early, after the arrival tutorial (Willow only).
function maybeBoPeep() {
  if (GAME.realm !== "willow" || !GAME.seenIntro || GAME.bopeepMet) return false;
  if (servedTotal < pacing("boPeepAfter", 2)) return false;   // let the player settle in first
  playBoPeep(); return true;
}
// The Two Pigs' finale — once BOTH have exhausted their blow-down arcs, they come in
// together to move out. A joint story-mode scene + a suitcase wish; then they leave Willow.
function pigsMovingCust() { return { id: "pigs_moving", name: "Thatch & Woody", emoji: "🐷", wishType: "PowerPop", location: "Willow-Wish Village", line: "" }; }
function playPigsMoving() {
  SFX.unlock();
  ["pigs_duo", "pigs_duo_shrug", "pigs_duo_cross", "pigs_duo_cheer"].forEach(f => ART.ensure(f, () => {}));
  GAME.pigsMoved = true; save();   // they're leaving Willow regardless — remove them from the roster
  renderStoryBeats([
    { name: "Thatch & Woody", fig: "pigs_duo_shrug", text: "<b>Thatch:</b> Both houses. <i>Gone.</i> I <i>told</i> you the sky had it out for us. New plan: we give up.<br><b>Woody:</b> We do NOT give up. We <i>relocate</i>. Big difference." },
    { name: "The Piggleby Brothers", gallery: ["pigs_family_portrait"], text: "<b>Woody:</b> We’re moving in with our brother — <b>Mason</b>. The smug one who built with brick.<br><b>Thatch:</b> Mason <i>Piggleby</i>. Fancy realm, very exclusive. We’re basically getting an upgrade." },
    { name: "Thatch & Woody", fig: "pigs_duo", cta: "Pack it up  ▸", text: "<b>Thatch:</b> We just need… a small suitcase.<br><b>Woody:</b> That fits a whole house. Don’t ask questions. Can you?" },
  ], () => startStoryWish(pigsMovingCust(), "pigs-moving", "One small suitcase, please — the kind that fits an entire house. We’re moving up in the world. Bricks, baby."));
}
function maybePigsMoving() {
  if (GAME.realm !== "willow" || GAME.pigsMoved) return false;
  if (custStoryStep("pig_straw") < 2 || custStoryStep("pig_stick") < 2) return false;   // both arcs done
  playPigsMoving(); return true;
}

/* ======================================================================= */
/* THE BUTTON CLUE-CHAIN — the Willow finale that connects everyone.          */
/* Tiny Mouse's buttons keep vanishing → the "collector" (the Wolf, in a       */
/* costume, NEVER as Grandma) drops three buttons in your shop → you show      */
/* Little Red, who recognizes Grandma's → you return the Gingerbread Man's,    */
/* except his gumdrop button has gone magical and won't come loose (you keep   */
/* it, give him a spare). GAME.buttonStep tracks the chain.                    */
/* ======================================================================= */
function wolfCust(name) { return { id: "wolf", name: name || "“Sir Reginald Notawolf”", emoji: "🐺", wishType: "PrettyPotion", location: "Willow-Wish Village", line: "" }; }
function playWolfButtons() {
  SFX.unlock();
  ["wolf_tophat_buttons", "wolf_tophat_proud"].forEach(f => ART.ensure(f, () => {}));
  renderStoryBeats([
    { name: "“Sir Reginald Notawolf”", fig: "wolf_tophat_buttons", text: "Good day! Sir Reginald Notawolf — gentleman, connoisseur, <b>no</b> relation to any wolf. <i>(He flips open a velvet case of gleaming buttons.)</i> Behold! The finest button collection the realm has ever seen." },
    { name: "“Sir Reginald Notawolf”", fig: "wolf_tophat_proud", cta: "Riiight…  ▸", text: "Every last one acquired <i>honestly</i>, I assure you — I’d <b>never</b> know a thing about buttons going missing all over town. Preposterous! Now, a small wish, if you’d be so kind: make my collection positively <b>gleam</b>." },
  ], () => startStoryWish(Object.assign(wolfCust(), { art: "wolf_tophat_proud" }), "wolf-buttons", "A dab of your finest button-polish, my good friend — for my perfectly-legitimate, not-at-all-stolen collection."));
}
function playRedButtons() {
  SFX.unlock();
  ["think", "annoyed", "idea", "present"].forEach(p => ART.ensure("red_" + p, () => {}));
  ART.ensure("button_heart", () => {});
  renderStoryBeats([
    { name: "Little Red", pose: "think", text: "You said the ‘collector’ <i>dropped</i> these? Let me see them… <i>(she turns each one over)</i>" },
    { name: "Little Red", pose: "annoyed", text: "That <b>heart button</b> — I’d know it anywhere. That’s <b>Grandma’s</b>. And this blue one’s Tiny Mouse’s, I’d bet my hood on it. And the gumdrop…" },
    { name: "Little Red", pose: "idea", cta: "Give hers back  ▸", text: "…that’s the Gingerbread Man’s. That ‘collector’ has been pinching from <i>everyone</i>. ‘Notawolf,’ honestly. May I have Grandma’s heart button back?" },
    { name: "Little Red", pose: "present", give: "button_heart", giveEmoji: "❤️", cta: "Hand it over  ▸", text: "You fish the little <b>heart button</b> out of your satchel and hold it out. <i>(Red cups her hands and takes it, holding it close.)</i> Oh — thank you. Grandma will be so glad." },
    { name: "Little Red", pose: "idea", cta: "I’m on it  ▸", text: "Right — that’s hers safe and sound. You sort the other two back to their owners, and keep your eyes <b>open</b>. That ‘collector’ won’t get away with it." },
  ], () => { satchelRemove("button_heart"); GAME.buttonStep = 2; GAME.buttonChainAt = -1; save(); toast("❤️ Little Red kept Grandma’s button."); renderStart(); });
}
function playGingerbreadButton() {
  SFX.unlock();
  ["gingerbread_lost", "gingerbread_spot", "gingerbread_fixed"].forEach(k => ART.ensure(k, () => {}));
  ART.ensure("button_blue", () => {});
  renderStoryBeats([
    { name: "Gingerbread Man", fig: "gingerbread_lost", cta: "Poor fella  ▸", text: "Whoa — no need to chase me, I’m usually the one doing the running! But I’ve got trouble: I’ve lost a button. My gumdrop one, right off my front. I’ve run this whole village twice looking for it — bridge, mill, past the baker’s — and nothing. Even outran a pigeon to ask. He just blinked!" },
    { name: "Gingerbread Man", fig: "gingerbread_spot", cta: "Keep it, then  ▸", text: "Hold up — stop the presses! That glow in your bag… that’s <b>him!</b> My gumdrop, gone and turned all magical on me. Ha — <i>course</i> he did! And now he’s decided he’d rather ride with <b>you</b>. Fair enough, little guy. You’ve earned yourself a fast friend — keep him!" },
    { name: "Gingerbread Man", fig: "gingerbread_fixed", give: "button_blue", giveEmoji: "🔵", cta: "Pin it on  ▸", text: "You dig a spare button from your satchel and hold it out. <i>(His eyes light up.)</i> A spare? For me? You didn’t have to — but I’ll take it and run! Fine-looking little thing, too. <i>(Don’t tell the gumdrop I said so.)</i>" },
    { name: "Gingerbread Man", fig: "gingerbread_fixed", cta: "Good as new  ▸", text: "<i>(He snaps it on and gives a proud little spin.)</i> Good as new — better than new! Now, quick, between us: buttons have been vanishing all over Willow-Wish. More than just mine. I’ve a hunch who’s behind it — so keep those fast eyes peeled!" },
  ], () => { satchelRemove("button_blue"); GAME.buttonStep = 3; GAME.buttonChainAt = -1; save(); toast("🍪 You gave the Gingerbread Man a button — the sparkly gumdrop keepsake stays with you."); renderStart(); });
}
// Drive the chain: Mouse's button-jar wish is the gate, then the beats pace a few rounds apart.
function maybeButtonChain() {
  if (GAME.realm !== "willow") return false;
  const s = GAME.buttonStep || 0;
  if (s >= 3) return false;
  if (s === 0 && custStoryStep("mouse") < 3) return false;   // Tiny Mouse must have wished for the never-empty button jar first
  if (GAME.buttonChainAt < 0) { GAME.buttonChainAt = servedTotal + pacing("buttonChainGap", 2); save(); return false; }
  if (servedTotal < GAME.buttonChainAt) return false;
  GAME.buttonChainAt = -1; save();
  if (s === 0) { playWolfButtons(); return true; }        // buttonStep advances to 1 when he drops them (in the outro)
  if (s === 1) { playRedButtons(); return true; }
  if (s === 2) { playGingerbreadButton(); return true; }
  return false;
}

/* ======================================================================= */
/* THE WOLF'S OWN ARC — a recurring, non-main-story regular. Every visit he    */
/* turns up in a fresh ridiculous disguise with a new fake name (fooling no    */
/* one), makes a wish, and the running gag is his bottomless hunger. Plays as  */
/* short story-mode scenes → a real wish. GAME.wolfArcStep tracks his visits.  */
/* Independent of the button chain — he can show up before Red's warning.      */
/* ======================================================================= */
const WOLF_VISITS = [
  { costume: "wolf_tourist", custArt: "wolf_tourist_hungry", name: "“Hank, a Tourist”",
    intro: [
      { fig: "wolf_tourist_sly", text: "Aloha! Just a normal tourist — name’s Hank. Lovely little village. Big fan. Definitely not scoping the place out." },
      { fig: "wolf_tourist_hungry", text: "Say, between us… I’m hungry <i>all</i> the time. Concerning amounts. Whip me up something to take the edge off? Asking for a friend. The friend is me.", cta: "Sure, ‘Hank’  ▸" },
    ],
    wish: "Something to quiet a rumbling tummy, if you’d be so kind — I’ve a very full itinerary. Of snacking.",
    outroFigWin: "wolf_tourist_cheers", outroFigLose: "wolf_tourist_arms",
    outroWin: "Mwah — <i>delicious</i>. I mean… adequate. For a tourist. Ahem. I’ll just be… touristing. Elsewhere. Ta!" },
  { costume: "wolf_delivery", custArt: "wolf_delivery_angry", name: "“Wally, W. Wolf Deliveries”",
    intro: [
      { fig: "wolf_delivery_announce", text: "Delivery for— oh. No package. Just me: <i>Wally</i>. W. Wolf Deliveries. Completely unrelated surname, don’t read into it." },
      { fig: "wolf_delivery_angry", text: "That last charm? DIDN’T WORK. I could eat a whole <b>sheep</b> right now. A WHOLE one. You owe me a freebie — that’s just good business.", cta: "Riiight  ▸" },
    ],
    wish: "A free re-do, on the house — extra filling this time. I’ve deliveries to… deliver. Not eat. Deliver!",
    outroFigWin: "wolf_delivery_thumbsup", outroFigLose: "wolf_delivery_sheepish",
    outroWin: "Now THAT’S service. Package received — by my stomach. Wally, signing off! <i>(scurries)</i>" },
  { costume: "wolf_sherlock", custArt: "wolf_sherlock_pie", name: "“Detective Sherwood Woolf”",
    intro: [
      { fig: "wolf_sherlock_pie", text: "Ahem — Detective Sherwood Woolf. I’m investigating a most troubling case: someone’s been eating <i>all</i> the pies in Willow-Wish. Fiendish business. <i>(He brandishes a pie. Evidence.)</i>" },
      { fig: "wolf_sherlock_ponder", text: "Suspects? None. Leads? None. Motive? Extreme deliciousness. …I’ll require sustenance for the investigation. Something hearty. For clue-related reasons.", cta: "Case closed  ▸" },
    ],
    wish: "A detective’s ration, piping hot — purely to fuel my brilliant deductions, which are ongoing and unrelated to pie.",
    outroFigWin: "wolf_sherlock_aha", outroFigLose: "wolf_sherlock_arms",
    outroWin: "Aha! The case remains open, but I am no longer peckish. Elementary. Toodle-oo!" },
  { costume: "wolf_bowler", custArt: "wolf_bowler_plead", name: "“Baron von Nothungry”",
    intro: [
      { fig: "wolf_bowler_present", text: "Good evening. Baron von Nothungry. As the name suggests, I am <i>not</i> remotely hungry. Never think about it. Certainly not about sheep." },
      { fig: "wolf_bowler_wink", text: "A baron does not <i>hunger</i>, darling — a baron merely <i>dines</i>. <i>(His stomach growls like distant thunder. He pretends very hard not to notice.)</i>", cta: "…We both heard that  ▸" },
      { fig: "wolf_bowler_plead", text: "…Okay. Off the record? It’s getting embarrassing. Everyone <i>knows</i>. Just — one more wish. A big one. Make the hunger <b>stop</b>. Please?", cta: "Oh, Wolf…  ▸" },
    ],
    wish: "One proper feast-in-a-bottle. No tricks this time — I mean it. A wolf can only skulk about hungry for so long.",
    outroFigWin: "wolf_bowler_hungry", outroFigLose: "wolf_bowler_fist",
    outroWin: "…Thank you. Truly. For a moment there, I forgot I was hungry. <i>(quietly)</i> …It’s back now. But — thank you." },
];
let WOLF_DEMO = false;   // admin: play all his visits back-to-back (no customers between)
function currentWolfVisit() { return WOLF_VISITS[Math.min(GAME.wolfArcStep || 0, WOLF_VISITS.length - 1)]; }
function playWolfVisit() {
  const i = GAME.wolfArcStep || 0; if (i >= WOLF_VISITS.length) return;
  const v = WOLF_VISITS[i];
  SFX.unlock();
  [v.costume, v.custArt, v.outroFigWin, v.outroFigLose].concat(v.intro.map(b => b.fig)).forEach(f => { if (f) ART.ensure(f, () => {}); });   // pre-warm every expression this visit uses
  const beats = v.intro.map((b, idx) => ({ name: v.name, fig: b.fig || v.costume, text: b.text, cta: b.cta || (idx === v.intro.length - 1 ? "Make his wish  ▸" : undefined) }));
  renderStoryBeats(beats, () => startStoryWish(Object.assign(wolfCust(v.name), { art: v.custArt || v.costume }), "wolf-arc", v.wish));
}
// A wolf visit comes due every few customers (Willow, after the tutorial). Can precede Red's warning.
function maybeWolfArc() {
  if (GAME.realm !== "willow" || !GAME.seenIntro) return false;
  if ((GAME.wolfArcStep || 0) >= WOLF_VISITS.length) return false;
  if (GAME.wolfArcAt < 0) { GAME.wolfArcAt = servedTotal + pacing("wolfArcEvery", 5); save(); return false; }
  if (servedTotal < GAME.wolfArcAt) return false;
  GAME.wolfArcAt = -1; save(); playWolfVisit(); return true;
}

/* ======================================================================= */
/* GOLDILOCKS' TEDDY BEARS — a two-part quest. Bear-loving Goldilocks         */
/* ordered a teddy bear; Tiny Mouse can't reach her, so                        */
/* she sews THREE sizes and asks you to deliver. You get 3 bears in your       */
/* Satchel. Next Goldilocks visit is an interactive delivery: the 1st you    */
/* hand over is always "too big", the 2nd "too small", the 3rd "just right"   */
/* (sparkle → hug) → a big tip. GAME.goldilocksStep: 0=none,1=have,2=done.    */
/* ======================================================================= */
function playGoldiMouse() {
  SFX.unlock();
  ["mouse_gesture", "mouse_bears", "mouse_point", "bear_1"].forEach(f => ART.ensure(f, () => {}));
  GAME.goldilocksStep = 1; GAME.goldilocksAt = -1; save();
  renderStoryBeats([
    { name: "Tiny Mouse", fig: "mouse_gesture", text: "Oh, thank goodness! Goldilocks ordered a <b>teddy bear</b> — you know how that girl adores anything bear — but I <i>cannot</i> get hold of her. Never home! Deliver it for me?" },
    { name: "Tiny Mouse", fig: "mouse_bears", text: "Here’s my trouble… she never said what <b>size</b>. So I stitched up <b>three</b> — a big, a small, and one in between. Give her the one that’s <i>just right</i> and she’ll tip you lovely, mark my words." },
    { name: "Tiny Mouse", fig: "mouse_point", cta: "Take the bears  ▸", text: "They’re tucked in your Satchel now. Next time Goldilocks drops by, let her try them and see which one fits. Thank you — you’re an absolute treasure!" },
  ], () => {
    revealItem({ art: "bear_1", emoji: "🧸", count: 3, name: "Teddy Bears ×3", desc: "Tiny Mouse’s hand-sewn teddy bears — big, small, and just-right. Bring the perfect-sized one to Goldilocks!",
      onAdd: () => satchelAdd("teddy", 3) });
    save(); renderStart();
  });
}
// The interactive delivery. Click order is FIXED (never mind which bear): 1st = too big,
// 2nd = too small, 3rd = just right. GOLDI_REACT[picks] is the face+line shown.
let GOLDI_PICKS = 0, GOLDI_BEARS = [];
const GOLDI_REACT = [
  { fig: "customer_goldilocks", text: "Ooh — teddy bears?! For <i>me</i>?! Quick, let me try one — hand it over!" },
  { fig: "goldi_toobig",   text: "Eee — this one’s <b>too big</b>, I can’t even get my arms all the way round it! Have you another?" },
  { fig: "goldi_toosmall", text: "Aw, now <i>that</i> one’s <b>too small</b> — teeny! There’s got to be one that’s <b>just right</b>… one more?" },
];
function playGoldiDeliver() {
  SFX.unlock();
  ["customer_goldilocks", "goldi_toobig", "goldi_toosmall", "goldi_sparkle", "goldi_hug", "bear_1", "bear_2", "bear_3"].forEach(f => ART.ensure(f, () => {}));
  GOLDI_PICKS = 0; GOLDI_BEARS = ["bear_1", "bear_2", "bear_3"];
  renderGoldiDeliver();
}
function renderGoldiDeliver() {
  const r = GOLDI_REACT[GOLDI_PICKS];
  const tray = GOLDI_BEARS.map((k, i) => `<button class="goldi-bear" data-bi="${i}">${ART.tag(k, "🧸", "goldi-bear-img")}</button>`).join("");
  html("event", `
    <div class="story-card mg-fullbleed goldi-deliver" id="story-card">
      <div class="story-bg" style="background-image:url(art/${STORY_DEF_BG}.jpg?v=${BUILD})"></div>
      <div class="story-scrim"></div>
      <div class="story-figure">${ART.tag(r.fig, "👱‍♀️", "story-face")}</div>
      <div class="story-below">
        <div class="story-name">Goldilocks</div>
        <div class="story-speech">${r.text}</div>
        <div class="goldi-hint">${GOLDI_PICKS === 0 ? "Tap a teddy bear to give it to her" : "Tap another bear"}</div>
        <div class="goldi-tray">${tray}</div>
      </div>
    </div>
  `);
  show("event");
  document.querySelectorAll(".goldi-bear").forEach(el => el.addEventListener("click", () => {
    if (GOLDI_PICKS >= 3) return;
    GOLDI_BEARS.splice(+el.dataset.bi, 1);   // that bear is used up
    GOLDI_PICKS++;
    SFX.unlock(); SFX.pop(1);
    if (GOLDI_PICKS >= 3) { goldiFinale(); return; }
    renderGoldiDeliver();
  }));
  // repaint when any not-yet-cached art (the figure or a bear) finishes loading
  [r.fig].concat(GOLDI_BEARS).forEach(k => { if (!ART.isReady(k)) ART.ensure(k, () => { if (GOLDI_PICKS < 3) renderGoldiDeliver(); }); });
}
function goldiFinale() {
  renderStoryBeats([
    { name: "Goldilocks", fig: "goldi_sparkle", cta: "Aww  ▸", text: "Oh! Oh, <i>this</i> one is <b>juuust right</b> — not too big, not too small, <b>perfect</b> for my shelf! He’ll have the comfiest spot in my room. ✨" },
    { name: "Goldilocks", fig: "goldi_hug", cta: "You’re so welcome  ▸", text: "Juuust right — the comfiest little bear in the WHOLE world! Thank you — take this for your trouble, and tell Tiny Mouse she’s the finest stitcher in the village!" },
  ], () => {
    satchelRemove("teddy", 3);
    GAME.goldilocksStep = 2; GAME.goldilocksAt = -1; save();
    const r = grantReward({ gold: 160, stardust: 18 }); save();
    toast("🧸 Goldilocks tipped you big! " + r);
    renderStart();
  });
}

/* ======================================================================= */
/* THE BANDIT BEARS — autograph quest. The girl-group Goldilocks adores     */
/* tours Willow: you get a blank tour poster, then Honey → Roxie → Pepper    */
/* each drop in as a one-time customer. Serve them and they sign the poster  */
/* (art advances autograph_0 → autograph_3). All three signatures → deliver  */
/* to superfan Goldilocks for a big reward. Signing order is fixed to match  */
/* the poster art. GAME.bandStep: 0 none · 1 blank · 2 Honey · 3 Roxie ·      */
/* 4 Pepper (complete) · 5 delivered.                                        */
/* ======================================================================= */
const BAND = [
  { id: "honey", tag: "band-honey", name: "Honey", emoji: "🎤", wishType: "PrettyPotion", art: "customer_honey",
    line: "Honey here, lead of the Bandit Bears! A shimmer for my high note tonight?",
    convo: ["honey_convo1", "honey_convo2", "honey_convo3"],
    // 3-beat conversation after her potion (beat 1 reacts to win/lose), then she signs.
    chat: {
      win:  "Ooh — that potion? <i>Divine</i>, darling. My high note is going to <b>shimmer</b> tonight.",
      lose: "Not quite the shimmer I pictured… but you’re a treasure for trying, sweetheart.",
      mid:  "You know, we don’t sign for just anyone. But a little shop this darling? For you, always.",
      close:"There — signed with a heart. ♡ Now go on, catch Roxie and Pepper while we’re in town!" },
    sign: "Signed with a heart, darling — one down! Catch the other girls while we’re in town." },
  { id: "roxie", tag: "band-roxie", name: "Roxie", emoji: "🎹", wishType: "GlowTreat", art: "customer_roxie",
    line: "Roxie. Keys. A touch more sparkle on my keytar — effortlessly, mind?",
    convo: ["roxie_convo1", "roxie_convo2", "roxie_convo3"],
    chat: {
      win:  "Hm. The sparkle’s exactly right. Effortless. …Okay. I’m a little impressed.",
      lose: "Eh — close enough. I’ve played worse rooms. You’ve got spirit, I’ll give you that.",
      mid:  "People think I don’t care about the fans. People are wrong. Don’t spread it around.",
      close:"Dotted my ‘i’ with a heart, left a star for flair. Tell no one I tried that hard. …Fine. Tell everyone." },
    sign: "Roxie signed it — two down! One more bear to catch." },
  { id: "pepper", tag: "band-pepper", name: "Pepper", emoji: "🥁", wishType: "PowerPop", art: "customer_pepper",
    line: "PEPPER!! Drums!! Bubble me enough bounce to drum through all three encores?!",
    convo: ["pepper_convo1", "pepper_convo2", "pepper_convo3"],
    chat: {
      win:  "OMG that bounce is PERFECT — I could drum for a MILLION encores!! Feel my paws, they’re VIBRATING!",
      lose: "Eh, a lil’ flat, but WHO CARES — you’re still the BEST and I’m signing SO hard!",
      mid:  "You got Honey AND Roxie to sign?! You’re basically famous now! Do you FEEL famous?!",
      close:"SIGNED IT!! All THREE now!! Goldilocks is gonna LOSE HER MIND — go go GO!!" },
    sign: "All THREE signatures! Goldilocks is going to FLIP — time to deliver it!" },
];
function bandMember(i) { return BAND[i] || null; }
// The 3-beat post-potion conversation for a band member (beat 1 reflects win/lose).
function bandChat(m, win) {
  return [
    { name: m.name, fig: m.convo[0], text: win ? m.chat.win : m.chat.lose },
    { name: m.name, fig: m.convo[1], text: m.chat.mid },
    { name: m.name, fig: m.convo[2], cta: "♡ Thank you!  ▸", text: m.chat.close },
  ];
}
// The band's tour bus rolls in — you receive the blank poster.
function playBandAnnounce() {
  ART.ensure("autograph_0", () => {});
  GAME.bandStep = 1; GAME.bandAt = -1; save();
  renderStoryBeats([
    { name: "A Blank Poster!", fig: "autograph_0", text: "📣 The <b>Bandit Bears</b> are touring Willow-Wish — Goldilocks’ favorite band in the WHOLE world! And someone left a <b>blank tour poster</b> right here at your shop." },
    { name: "A Blank Poster!", fig: "autograph_0", cta: "Grab the poster!  ▸", text: "Imagine if you got all three bears to <b>sign</b> it… Goldilocks, their #1 fan, would faint clean away. Worth a shot, hm?" },
  ], () => {
    revealItem({ art: "autograph_0", name: "Blank Bandit Bears Poster", desc: "A pristine tour poster. Get Honey, Roxie & Pepper to sign it — then give it to superfan Goldilocks!" });
    save(); renderStart();
  });
}
// Once all three have signed, Goldilocks comes to collect her treasure.
function playBandDeliver() {
  ["goldi_poster", "customer_goldilocks", "goldi_sparkle"].forEach(k => ART.ensure(k, () => {}));
  renderStoryBeats([
    { name: "Goldilocks", fig: "customer_goldilocks", text: "Is that— is that a— <b>THE BANDIT BEARS TOUR POSTER?!</b> Signed?! For ME?!" },
    { name: "Goldilocks", fig: "goldi_sparkle", text: "Honey AND Roxie AND Pepper — all three signatures?! I can’t— my HEART— I’m the luckiest fan in the WHOLE WORLD! ✨" },
    { name: "Goldilocks", fig: "goldi_poster", cta: "You’re so welcome  ▸", text: "I’m framing this FOREVER, right above my bed! Take everything I’ve got — you’re officially my favorite person EVER!" },
  ], () => {
    GAME.bandStep = 5; GAME.bandAt = -1; save();
    const r = grantReward({ gold: 220, stardust: 24 }); save();
    toast("🎤 Goldilocks is over the moon! " + r);
    renderStart();
  });
}
// Trigger: announce the band, then one member per pacing beat, then the delivery.
function maybeBandVisit() {
  if (GAME.realm !== "willow" || !GAME.seenIntro) return false;
  const step = GAME.bandStep || 0;
  if (step >= 5) return false;   // quest complete
  if (step === 4) {              // all signed → Goldilocks collects
    if (GAME.bandAt < 0) { GAME.bandAt = servedTotal + pacing("bandVisitGap", 6); save(); return false; }
    if (servedTotal < GAME.bandAt) return false;
    GAME.bandAt = -1; save(); playBandDeliver(); return true;
  }
  if (step === 0) {              // waiting to announce
    if (servedTotal < pacing("bandAfter", 52)) return false;
    if (GAME.bandAt < 0) { GAME.bandAt = servedTotal + 1; save(); return false; }
    if (servedTotal < GAME.bandAt) return false;
    GAME.bandAt = -1; playBandAnnounce(); return true;
  }
  // step 1..3 → the next member (index step-1) drops in to sign
  if (GAME.bandAt < 0) { GAME.bandAt = servedTotal + pacing("bandVisitGap", 6); save(); return false; }
  if (servedTotal < GAME.bandAt) return false;
  GAME.bandAt = -1; save();
  const m = bandMember(step - 1); ART.ensure(m.art, () => {});
  startStoryWish({ id: m.id, name: m.name, emoji: m.emoji, wishType: m.wishType, art: m.art, location: "Willow-Wish Village" }, m.tag, m.line);
  return true;
}
// Drive the quest: Tiny Mouse's request fires a few rounds in, then the delivery a couple rounds after.
function maybeGoldilocksQuest() {
  if (GAME.realm !== "willow" || !GAME.seenIntro) return false;
  const s = GAME.goldilocksStep || 0;
  if (s >= 2) return false;
  if (s === 0) {
    if (servedTotal < pacing("goldilocksAfter", 3)) return false;   // let the player meet a few folks first
    if (GAME.goldilocksAt < 0) { GAME.goldilocksAt = servedTotal + 1; save(); return false; }
    if (servedTotal < GAME.goldilocksAt) return false;
    GAME.goldilocksAt = -1; save(); playGoldiMouse(); return true;
  }
  // s === 1: we have the bears — Goldilocks comes to collect a couple rounds later
  if (GAME.goldilocksAt < 0) { GAME.goldilocksAt = servedTotal + pacing("goldilocksDeliver", 2); save(); return false; }
  if (servedTotal < GAME.goldilocksAt) return false;
  GAME.goldilocksAt = -1; save(); playGoldiDeliver(); return true;
}

/* ======================================================================= */
/* THE TORTOISE & THE HARE — a slow-burn running gag across realms. The Hare */
/* zooms in EARLY (he's "winning"); the Tortoise plods in LAST, right before  */
/* the realm finale. Later realms flip it (the Tortoise finally arrives first).*/
/* ======================================================================= */
// Force a specific normal customer to be THIS round (used by scripted arrivals).
function forceCustomer(id) {
  const rec = (D.CUSTOMERS || []).find(c => c.id === id) || (currentRealm().customers || []).find(c => c.id === id);
  if (!rec) return false;
  ROUND = newRound({ servedTotal, betterScoop: !!(GAME.unlocked && GAME.unlocked.scoop), charmFinder: !!(GAME.unlocked && GAME.unlocked.charm), customers: [rec], ingredientSet: currentRealm().ingredients, magicPool: currentRealm().magics, reqBonus: currentRealm().reqBonus || 0 });
  injectInfused(ROUND); injectKeys(ROUND); setupHunt(ROUND); applyCustArc(ROUND);
  ROUND.rush = false; ROUND.vip = false; ROUND.keyStaked = false;
  renderCustomer();
  return true;
}
function hareArcLen() { return CUSTOMER_ARCS.hare ? CUSTOMER_ARCS.hare.length : 0; }
// The Hare bursts in EARLY (he's way ahead) — his cocky arc plays out over a few quick visits.
function maybeHare() {
  if (GAME.realm !== "willow" || !GAME.seenIntro) return false;
  if (custStoryStep("hare") >= hareArcLen()) return false;   // his Willow race arc is done
  if (GAME.hareAt < 0) { GAME.hareAt = servedTotal + (custStoryStep("hare") === 0 ? pacing("hareFirstAfter", 1) : pacing("hareAgainEvery", 3)); save(); return false; }
  if (servedTotal < GAME.hareAt) return false;
  GAME.hareAt = -1; save(); return forceCustomer("hare");
}
// The Tortoise plods in LAST — the final customer before the finale, dead tired but still going.
function maybeTortoise() {
  if (GAME.realm !== "willow") return false;
  if (GAME.tortoiseSeen[GAME.realm]) return false;
  const need = realmEventsNeeded(GAME.realm);
  if (!need || realmFinaleWon(GAME.realm) || realmEventsCleared(GAME.realm) < need - 1) return false;
  GAME.tortoiseSeen[GAME.realm] = true;
  GAME.nextEventAt = servedTotal + 1; // ...and the finale comes the very next round, so he's truly the last
  save();
  return forceCustomer("tortoise");
}
// After a story wish resolves, the character's goodbye plays (and story progress advances).
function storyWishOutro(tag, win) {
  if (tag && tag.indexOf("band-") === 0) {
    const idx = BAND.findIndex(m => m.tag === tag), m = bandMember(idx);
    GAME.bandStep = idx + 2;   // Honey→2, Roxie→3, Pepper→4
    GAME.bandAt = -1; save();
    const newArt = "autograph_" + (idx + 1); ART.ensure(newArt, () => {});
    m.convo.forEach(k => ART.ensure(k, () => {}));
    renderStoryBeats(bandChat(m, win),
      () => { revealItem({ art: newArt, name: m.name + " signed the poster!", desc: m.sign }); save(); renderStart(); });
    return;
  }
  if (tag === "bo-peep") {
    ART.ensure(win ? "bopeep_delight" : "bopeep_annoyed", () => {});
    const beats = win
      ? [{ name: "Bo Peep", fig: "bopeep_delight", cta: "Off she goes  ▸", text: "Oh, bless you! I can already feel them settling. I’ll keep counting — you keep an eye out for strays. Every last woolly counts!" }]
      : [{ name: "Bo Peep", fig: "bopeep_annoyed", cta: "Off she goes  ▸", text: "Hm — a few still wandered off. No matter, we’ll try again. And do bring me any strays you find out there!" }];
    renderStoryBeats(beats, () => { save(); renderStart(); });
    return;
  }
  if (tag === "pigs-moving") {
    const beats = win
      ? [{ name: "Thatch & Woody", fig: "pigs_duo_cheer", cta: "Off they go  ▸", text: "<b>Woody:</b> See? Upgrade.<br><b>Thatch:</b> …I’m gonna miss this village.<br><b>Woody:</b> We’ll visit! Once the brick sets. Thanks, friend!" }]
      : [{ name: "Thatch & Woody", fig: "pigs_duo_cross", cta: "Off they go  ▸", text: "<b>Thatch:</b> It’s a <i>little</i> lumpy.<br><b>Woody:</b> It’s CHARACTER. Close enough — we’ve a cart to catch. See you around, friend!" }];
    renderStoryBeats(beats, () => { save(); renderStart(); });
    return;
  }
  if (tag === "wolf-arc") {
    const i = GAME.wolfArcStep || 0, v = WOLF_VISITS[Math.min(i, WOLF_VISITS.length - 1)];
    GAME.wolfArcStep = i + 1; save();
    const outroFig = win ? (v.outroFigWin || v.costume) : (v.outroFigLose || v.costume);
    const beats = [{ name: v.name, fig: outroFig, cta: "Off he skulks  ▸", text: win ? v.outroWin : "Bah! Barely took the edge off. I’ll be BACK. Hungrier. You’ll see." }];
    // "play all back-to-back" mode: roll straight into his next disguise instead of going home
    renderStoryBeats(beats, () => { save(); if (WOLF_DEMO && (GAME.wolfArcStep || 0) < WOLF_VISITS.length) playWolfVisit(); else { WOLF_DEMO = false; renderStart(); } });
    return;
  }
  if (tag === "wolf-buttons") {
    GAME.buttonStep = 1; GAME.buttonChainAt = -1; save();
    ART.ensure("wolf_tophat_point", () => {});
    const beats = [{ name: "“Sir Reginald Notawolf”", fig: "wolf_tophat_point", cta: "Wait…  ▸", text: win
      ? "Magnificent! Simply— oh. <i>OH.</i> I seem to have <b>dropped</b> a few things. No matter — keep them! I’ve HUNDREDS. Toodle-oo!"
      : "Hmph. Amateur polish. I’ll take my custom elsewhere — after I— oh. I’ve <b>dropped</b> some buttons. Ah well, keep ’em. Ta!" }];
    renderStoryBeats(beats, () => {
      // Three buttons clatter to the floor — one "!" bubble each, showing that button's art.
      revealItem({ art: "button_heart", emoji: "❤️", name: "Heart-Shaped Button", desc: "One of the buttons the “collector” dropped. Show it to Little Red!", onAdd: () => satchelAdd("button_heart") });
      revealItem({ art: "button_blue", emoji: "🔵", name: "Blue Button", desc: "One of the buttons the “collector” dropped. Show it to Little Red!", onAdd: () => satchelAdd("button_blue") });
      revealItem({ art: "button_gumdrop", emoji: "🍬", name: "Gumdrop Button", desc: "One of the buttons the “collector” dropped. Show it to Little Red!", onAdd: () => satchelAdd("button_gumdrop") });
      save(); renderStart();
    });
    return;
  }
  let beats, step;
  if (tag === "red-vacation") {
    step = 3;
    beats = win
      ? [{ name: "Little Red", pose: "present", cta: "Off she goes  ▸", text: "Oh, that’s <i>perfect</i> — the cottage won’t feel so empty now. Thank you! I’ll write Grandma and tell her all about your shop." }]
      : [{ name: "Little Red", pose: "worried", cta: "Off she goes  ▸", text: "Hm, not quite — but no matter, we’ll get there. I’ll pop back soon; the cottage isn’t going anywhere." }];
  } else if (tag === "red-impostor") {
    step = 4;
    beats = win
      ? [{ name: "Little Red", pose: "idea", cta: "Off she goes  ▸", text: "I feel braver already — thank you. Remember: <b>watch for that face</b>, and send word the moment you see it. I’m counting on you!" }]
      : [{ name: "Little Red", pose: "annoyed", cta: "Off she goes  ▸", text: "Close, but not yet — and I’ll need my wits about me. We’ll try again. Keep an eye out for that imposter meanwhile!" }];
  } else {
    step = 2;
    beats = win
      ? [{ name: "Little Red", pose: "present", cta: "Off she goes  ▸", text: "Oh, it’s <i>lovely</i> — I feel safer already. Thank you! I’d best hurry to Grandma’s before dark… but something tells me I’ll be back. Do take good care of the shop!" }]
      : [{ name: "Little Red", pose: "worried", cta: "Off she goes  ▸", text: "Hmm — not quite what I pictured! But you’re only just learning, and the village is lucky to have you. I’ll pop back soon and we can try again. 🧺" }];
  }
  renderStoryBeats(beats, () => { GAME.storyStep = Math.max(GAME.storyStep, step); save(); renderStart(); });
}

/* ======================================================================= */
/* COLLECTION HUNTS — a cozy scavenger hunt layered over normal play.        */
/* Each realm can hide N little items (Bo Peep's sheep, the Stepsister's     */
/* beads) that turn up WHILE you play — in a bubble pop, a scoop, a knife    */
/* cut, or a tip. Find the whole set to earn an exclusive skin. Purely       */
/* cosmetic: it never gates progression and can't be lost.                   */
/* ======================================================================= */
const HUNTS = {
  willow: { realm: "willow", char: "Bo Peep", charEmoji: "👧", charArt: "bopeep_sheephug", item: "sheep", itemEmoji: "🐑",
    need: 10, chance: 0.42, skin: "toad_lamb",
    items: ["sheep_01", "sheep_02", "sheep_03", "sheep_04", "sheep_05", "sheep_06", "sheep_07", "sheep_08", "sheep_09", "sheep_10"],
    done: "Every last lamb is home safe — Bo Peep hugs you tight!",
    // A short thank-you conversation when the flock is complete. {skin} is filled in.
    celebrate: [
      { fig: "bopeep_sheephug", text: "You found them! Every last woolly! Oh — come <i>here</i>. <i>(She hugs you, and about three sheep, all at once.)</i> I truly feared my field would stay empty forever." },
      { fig: "bopeep_delight", text: "Look at them — home and grumbling for supper, just as they should be. Turning up strays in bubbles and scoops and teacups… I don’t know how you did it, but you did." },
      { fig: "bopeep_warm", cta: "Aw, thank you!  ▸", text: "Take this, from me and the whole flock — a little <b>{skin}</b> to wear in the shop. Find it any time in 🎨 My Skins. Now off you go — they’re demanding hay!" },
    ] },
  courtyard: { realm: "courtyard", char: "the Stepsister", charEmoji: "💃", item: "bead", itemEmoji: "📿",
    need: 8, chance: 0.34, skin: "cauldron_pearl",
    done: "Every bead recovered — the Stepsister can go to the royal ball after all!" },
};
function huntFor(realm) { return HUNTS[realm] || null; }
// a hunt only starts once its character has asked us to collect for them (Willow → Bo Peep).
function huntUnlocked(realm) { return realm === "willow" ? !!GAME.bopeepMet : true; }
function activeHunt() { const h = huntFor(GAME.realm); return (h && huntUnlocked(GAME.realm)) ? h : null; }
function huntState(realm) {
  if (!GAME.hunts[realm]) GAME.hunts[realm] = { found: 0, done: false, seen: [] };
  const st = GAME.hunts[realm], h = HUNTS[realm];
  if (!Array.isArray(st.seen)) st.seen = (h && h.items) ? h.items.slice(0, st.found || 0) : []; // migrate count-only saves
  // a hunt finished before the sheep set grew (old 5-sheep save) counts as fully collected
  if (st.done && h && h.items && st.seen.length < h.items.length) { st.seen = h.items.slice(); st.found = h.items.length; }
  return st;
}
function huntChipHtml() {
  const h = activeHunt(); if (!h) return ""; const st = huntState(h.realm); if (st.done) return "";
  return `<div class="hunt-chip">${h.charEmoji} ${h.itemEmoji} <b>${st.found}/${h.need}</b></div>`;
}
// Once per round, decide whether (and in which phase) a hidden item turns up.
function setupHunt(round) {
  round.huntPending = false; round.huntFound = false;
  const h = activeHunt(); if (!h) return; const st = huntState(h.realm); if (st.done) return;
  if (h.items) h.items.forEach(id => ART.ensure(id, () => {}));   // warm each sheep's art so the "found!" pop shows the picture
  // A found item turns up in one of the two phases you always play: the scoop reveal or a
  // bubble pop. ("knife" needs the optional cut charm and "tip" only fires on the result
  // screen — both meant items slip through to the results page instead of being found live.)
  if (Math.random() < (h.chance || 0.35)) { round.huntPending = true; round.huntSource = R.pick(["scoop", "pop"]); }
}
function tryHuntFind(source, anchorEl) {
  if (!ROUND || !ROUND.huntPending || ROUND.huntFound) return false;
  if (source && ROUND.huntSource !== source) return false;
  return doHuntFind(anchorEl);
}
function doHuntFind(anchorEl) {
  const h = activeHunt(); if (!h) return false; const st = huntState(h.realm); if (st.done) return false;
  if (ROUND) ROUND.huntFound = true;
  const item = h.item[0].toUpperCase() + h.item.slice(1);
  if (h.items) {
    const pool = h.items.filter(id => st.seen.indexOf(id) < 0);   // a sheep we haven't found yet
    const foundId = pool.length ? R.pick(pool) : null;
    if (!foundId) return true;
    revealItem({ art: foundId, emoji: h.itemEmoji, name: `A Lost ${item}!`,
      desc: `One of ${h.char}'s missing ${h.item}, turned up while you played! Add it to your collection.`,
      onAdd: () => { const s = huntState(h.realm); if (s.seen.indexOf(foundId) < 0) { s.seen.push(foundId); s.found = s.seen.length; save(); if (s.found >= h.need) huntComplete(h); } } });
  } else {
    revealItem({ emoji: h.itemEmoji, name: `A Lost ${item}!`,
      desc: `One of ${h.char}'s missing ${h.item}. Add it to your collection.`,
      onAdd: () => { const s = huntState(h.realm); s.found = Math.min(h.need, (s.found || 0) + 1); save(); if (s.found >= h.need) huntComplete(h); } });
  }
  return true;
}
/* ---- Item reveal: a "!" bubble that WAITS on screen → tap → big glowing reveal → "Add to
   inventory". So finds never zip past unseen. Used for every collectible / inventory item. ---- */
let ITEM_REVEALS = [];
function itemHost() { return document.getElementById("app") || document.body; }
function revealItem(opts) {   // { art?, emoji?, name, desc?, count?, onAdd? }
  ITEM_REVEALS.push(opts);
  if (opts.art) ART.ensure(opts.art, () => {});
  SFX.bonus && SFX.bonus();     // a soft chime so you notice the bubble appear
  refreshItemBubble();
}
function refreshItemBubble() {
  // Re-render the whole set of waiting "!" bubbles from the queue each time.
  document.querySelectorAll(".item-bubble").forEach(b => b.remove());
  const n = ITEM_REVEALS.length;
  if (!n) return;
  const multi = n > 1;   // e.g. the Wolf dropping three buttons — a bubble each, side by side
  ITEM_REVEALS.forEach((it, i) => {
    const bub = document.createElement("button");
    bub.className = "item-bubble" + (multi ? " multi" : "");
    if (!multi) bub.id = "item-bubble";   // keep the classic single-find look/selector
    bub.setAttribute("aria-label", "You found something — tap to see!");
    // Every waiting bubble is a plain "!" — even a multi-drop (the Wolf's three
    // buttons) shows three "!" bubbles side by side, not the items themselves.
    bub.innerHTML = `<span class="ib-bang">!</span>`;
    if (multi) {
      const off = (i - (n - 1) / 2) * 84;   // fan them into a centered row so all are visible
      bub.style.left = `calc(50% + ${off}px)`;
      bub.style.setProperty("--ib-delay", (i * 0.12) + "s");
    }
    bub.addEventListener("click", () => openItemReveal(i));
    itemHost().appendChild(bub);
  });
}
// While a "!" quest-item bubble is waiting to be collected, you can't move on to
// the next screen. Returns true (and makes the bubble pulse big) if a tap on a
// "next" button should be blocked so the find is never skipped.
function itemGateBlocks() {
  if (!ITEM_REVEALS.length) return false;
  if (document.getElementById("item-reveal-overlay")) return true;   // reveal already open — let them finish it
  pulseItemBubble();
  toast("Tap the glowing <b>!</b> to collect your find first!");
  return true;
}
function pulseItemBubble() {
  const bubs = document.querySelectorAll(".item-bubble"); if (!bubs.length) return;
  SFX.err && SFX.err();
  bubs.forEach(bub => { bub.classList.remove("nudge"); void bub.offsetWidth; bub.classList.add("nudge");
    setTimeout(() => bub.classList.remove("nudge"), 650); });
}
function openItemReveal(idx) {
  idx = idx || 0;
  const it = ITEM_REVEALS[idx]; if (!it || document.getElementById("item-reveal-overlay")) return;
  SFX.reveal ? SFX.reveal() : (SFX.charm && SFX.charm());
  const artHtml = it.art ? ART.tag(it.art, it.emoji || "🎁", "ir-img") : `<span class="ir-emoji">${it.emoji || "🎁"}</span>`;
  const ov = document.createElement("div"); ov.id = "item-reveal-overlay"; ov.className = "item-reveal-overlay";
  ov.innerHTML = `
    <div class="ir-card">
      <div class="ir-burst" aria-hidden="true"></div>
      <div class="ir-sparkles" aria-hidden="true">${Array.from({ length: 10 }).map((_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
      <div class="ir-art">${artHtml}${it.count > 1 ? `<span class="ir-x">×${it.count}</span>` : ""}</div>
      <div class="ir-name">${it.name}</div>
      ${it.desc ? `<div class="ir-desc">${it.desc}</div>` : ""}
      <button class="ir-add" id="ir-add">Add to inventory  ▸</button>
    </div>`;
  itemHost().appendChild(ov);
  on("#ir-add", "click", () => {
    SFX.bigCoin && SFX.bigCoin();
    const done = ITEM_REVEALS.splice(idx, 1)[0];
    if (done && done.onAdd) { try { done.onAdd(); } catch (e) {} }
    ov.classList.add("closing"); setTimeout(() => { if (ov.parentNode) ov.remove(); }, 200);
    refreshItemBubble();
    // once the last waiting collectible is grabbed, a deferred hunt celebration can take the stage
    if (!ITEM_REVEALS.length && GAME.huntCelebrate) setTimeout(maybeShowHuntCelebrate, 260);
  });
}
function huntFindFx(h, st, anchorEl, foundId) {
  SFX.bonus();
  toast(`${h.itemEmoji} Found a ${h.item}! ${st.found}/${h.need}`);
  let cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
  if (anchorEl && anchorEl.getBoundingClientRect) { const r = anchorEl.getBoundingClientRect(); if (r.width) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; } }
  const fx = document.createElement("div"); fx.className = "hunt-find-fx" + (foundId ? " art" : "");
  fx.innerHTML = foundId ? ART.tag(foundId, h.itemEmoji, "hunt-find-img") : h.itemEmoji;
  fx.style.left = cx + "px"; fx.style.top = cy + "px";
  fx.addEventListener("animationend", () => fx.remove()); document.body.appendChild(fx);
  const chip = document.querySelector(".hunt-chip");
  if (chip) { chip.innerHTML = `${h.charEmoji} ${h.itemEmoji} <b>${st.found}/${h.need}</b>`; chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump"); }
}
function huntComplete(h) {
  const st = huntState(h.realm); st.done = true;
  GAME.owned = GAME.owned || {}; GAME.owned[h.skin] = true;
  GAME.huntCelebrate = h.realm; save();
  SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
  // The full reveal (and reward) is delivered as a conversation on the home screen; here we
  // just mark the moment you found the last one so it doesn't spoil the thank-you.
  toast(`${h.itemEmoji} The last ${h.item}! All ${h.need} home — ${h.char} will want to thank you…`);
}
// One-time thank-you when a hunt completes — played as a little story-mode
// conversation (not a pop-up card) the next time you land on the home screen.
function maybeShowHuntCelebrate() {
  if (!GAME.huntCelebrate) return;
  // Only ever play this on the home screen — never barge into an active round (e.g. finding the
  // last sheep in the middle of a timed customer). If we're anywhere else, leave huntCelebrate
  // set and bail; renderStart() replays it the next time you land home.
  const startScreen = document.getElementById("screen-start");
  if (!startScreen || !startScreen.classList.contains("active")) return;
  // Don't barge in over a waiting collectible — e.g. the just-signed band poster's "!" bubble,
  // which floats over the whole screen until you tap to collect it. Leave huntCelebrate set; it
  // fires the moment that collectible is grabbed (see the reveal "Add" handler) or, failing that,
  // on your next trip home.
  if (ITEM_REVEALS.length || document.getElementById("item-reveal-overlay")) return;
  const realm = GAME.huntCelebrate;
  const h = huntFor(realm); GAME.huntCelebrate = null; save();
  if (!h) return;
  const skin = D.COSMETIC_BY_ID[h.skin];
  const skinLabel = skin ? `${skin.chip} ${skin.name}` : "new skin";
  // Bespoke conversation if the hunt defines one; otherwise a warm generic two-beat.
  const raw = h.celebrate || [
    h.charArt ? { fig: h.charArt } : { figEmoji: h.charEmoji, text: "" },
    { cta: "Lovely!  ▸", text: `${h.done} <br><br>Take this <b>{skin}</b> to wear in the shop — find it any time in 🎨 My Skins.` },
  ];
  if (!h.celebrate) raw[0].text = raw[0].text || h.done;
  const beats = raw.map(b => ({ ...b, name: b.name || h.char, text: (b.text || "").replace(/\{skin\}/g, skinLabel) }));
  beats.forEach(b => { if (b.fig) ART.ensure(b.fig, () => {}); });
  SFX.fanfare(); confettiOver($("#app"));
  renderStoryBeats(beats, () => renderStart());
}

/* ======================================================================= */
/* THE SATCHEL — your main inventory. Discrete quest / keepsake items you    */
/* collect (a customer drops one, an event gives one) and carry across       */
/* realms until there's someone to give them to or somewhere to use them.    */
/* Stored as GAME.satchel { itemId: count }. The realm scavenger hunts       */
/* (Bo Peep's sheep, the Stepsister's beads) are shown here too, reflected   */
/* from GAME.hunts so everything you're collecting lives in one place.       */
/* ======================================================================= */
const SATCHEL_ITEMS = {
  // The three buttons the "collector" (the Wolf) drops in your shop — clues to show Little Red.
  button_heart:   { name: "Heart-Shaped Button", emoji: "❤️", from: "the “button collector”", note: "Show this to Little Red." },
  button_blue:    { name: "Blue Button",         emoji: "🔵", from: "the “button collector”", note: "Show this to Little Red." },
  button_gumdrop: { name: "Gumdrop Button",      emoji: "🍬", from: "the “button collector”", note: "Show this to Little Red." },
  // Tiny Mouse sews three teddy bears (big / small / just-right) to deliver to bear-loving Goldilocks.
  teddy:          { name: "Teddy Bear", emoji: "🧸", from: "Tiny Mouse", note: "Bring the just-right size to Goldilocks." },
};
function satchelItem(id) { return SATCHEL_ITEMS[id] || null; }
function satchelCount(id) { return (GAME.satchel && GAME.satchel[id]) || 0; }
function satchelTotal() { return Object.values(GAME.satchel || {}).reduce((a, b) => a + b, 0); }
// once Red has seen the clues, the gumdrop button turns magical — a keepsake that won't come loose.
function satchelLocked(id) { return id === "button_gumdrop" && (GAME.buttonStep || 0) >= 2; }
function satchelAdd(id, n) {
  if (!SATCHEL_ITEMS[id]) return false;
  GAME.satchel[id] = satchelCount(id) + (n || 1); save();
  return true;
}
function satchelRemove(id, n) {
  if (satchelLocked(id)) return false;   // the magical gumdrop keepsake can't be given away
  const c = satchelCount(id); if (c <= 0) return false;
  GAME.satchel[id] = c - (n || 1);
  if (GAME.satchel[id] <= 0) delete GAME.satchel[id];
  save(); return true;
}
// hook for future customer keepsake drops on a successful serve (none active right now).
function maybeSatchelDrop(customer) { return null; }
// Build the inventory as GROUPS: storyline items (no border) pushed to the front,
// then active-quest groups (bordered). Each group carries the quest info shown on tap.
function inventoryGroups() {
  const groups = [];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const plur = w => (w === "sheep" ? "sheep" : w + "s");   // "sheep" is already plural
  // --- STORY (no border, first): the vanishing buttons ---
  const btnIds = ["button_heart", "button_blue", "button_gumdrop"].filter(id => satchelCount(id) > 0);
  if (btnIds.length) {
    const s = GAME.buttonStep || 0;
    groups.push({ id: "buttons", kind: "story", name: "Mystery Buttons",
      items: btnIds.map(id => ({ art: id, emoji: SATCHEL_ITEMS[id].emoji, name: SATCHEL_ITEMS[id].name })),
      title: "The Vanishing Buttons",
      desc: "Buttons have been going missing all over Willow-Wish — and the “collector” dropped these three right in your shop. There’s a story here…",
      progress: s >= 3 ? "Solved! You returned the others; the magical gumdrop button stays with you as a keepsake."
        : s >= 2 ? "Little Red kept Grandma’s button. The gumdrop’s gone magical and won’t come loose — it’s yours now."
        : s >= 1 ? "Show these to Little Red — she may recognize one of them."
        : "Freshly dropped in your shop by that “collector.”" });
  }
  // --- QUEST (bordered): Goldilocks' teddy bears ---
  const teddyN = satchelCount("teddy");
  if (teddyN > 0) {
    ["bear_1", "bear_2", "bear_3"].forEach(a => ART.ensure(a, () => {}));
    groups.push({ id: "teddy", kind: "quest", name: "Teddy Bears", count: "×" + teddyN,
      items: ["bear_1", "bear_2", "bear_3"].slice(0, teddyN).map(a => ({ art: a, emoji: "🧸", name: "Teddy Bear" })),
      title: "Goldilocks’ Teddy Bears",
      desc: "Tiny Mouse sewed three teddy bears — big, small, and just-right — for you to bring to Goldilocks.",
      progress: `Carrying ${teddyN} bear${teddyN === 1 ? "" : "s"}. Next time Goldilocks drops by, give her the one that’s just right for a big tip.` });
  }
  // --- QUEST (bordered): the Bandit Bears autograph poster (upgrades as they sign) ---
  const bstep = GAME.bandStep || 0;
  if (bstep >= 1 && bstep < 5) {
    const sigs = Math.max(0, Math.min(3, bstep - 1)), art = "autograph_" + sigs; ART.ensure(art, () => {});
    const signed = ["Honey", "Roxie", "Pepper"].slice(0, sigs);
    groups.push({ id: "band", kind: "quest", name: "Bandit Bears Poster", count: sigs + "/3",
      items: [{ art, emoji: "🎤", name: "Signed Poster" }],
      title: "The Bandit Bears’ Autograph",
      desc: "Goldilocks’ favorite band is touring Willow-Wish! Get Honey, Roxie & Pepper to sign this tour poster, then deliver it to her.",
      progress: sigs >= 3 ? "All three signed! Deliver it to superfan Goldilocks — she’ll faint. 🎤"
        : sigs > 0 ? `Signed by ${signed.join(" & ")}. ${3 - sigs} to go — the band keeps touring through your shop.`
        : "Blank so far. Serve each Bandit Bear when they drop by and they’ll sign it." });
  }
  // --- QUEST (bordered): realm scavenger hunts (Bo Peep's sheep, etc.) ---
  Object.keys(HUNTS).forEach(realm => {
    const h = HUNTS[realm], st = huntState(realm);
    if (!st.found) return;
    if (h.items) h.items.forEach(id => { if (st.seen.indexOf(id) >= 0) ART.ensure(id, () => {}); });
    const items = h.items ? st.seen.map(id => ({ art: id, emoji: h.itemEmoji, name: cap(h.item) }))
      : Array.from({ length: st.found }).map(() => ({ emoji: h.itemEmoji, name: cap(h.item) }));
    groups.push({ id: "hunt_" + realm, kind: "quest", name: cap(plur(h.item)), hunt: realm, count: st.found + "/" + h.need,
      items,
      title: `${h.char}’s Lost ${cap(plur(h.item))}`,
      desc: `${h.char}’s little ones wandered off. Find them all as you play to earn ${h.char}’s thanks — and a special skin!`,
      progress: `${st.found} of ${h.need} rounded up${st.done ? " — complete! 🎉" : ""}.` });
  });
  return groups;
}
function renderSatchel() {
  const groups = inventoryGroups();
  const body = groups.length ? groups.map(g => `
    <div class="inv-group ${g.kind}">
      <div class="inv-group-head"><span class="inv-group-name">${g.name}</span>${g.count ? `<span class="inv-group-count">${g.count}</span>` : ""}</div>
      <div class="inv-items">
        ${g.items.map(it => `<button class="inv-item" data-g="${g.id}" aria-label="${it.name}">${it.art ? ART.tag(it.art, it.emoji, "inv-art") : `<span class="inv-emoji">${it.emoji}</span>`}</button>`).join("")}
      </div>
    </div>`).join("")
    : `<div class="inv-empty"><div class="inv-empty-ic">🎒</div><p>Your satchel is empty for now.<br>Quest items and treasures you find while you play collect here — tap one to see what it’s for.</p></div>`;
  const purse = (GAME.pearls || 0) > 0
    ? `<button class="inv-purse" id="inv-pearls" aria-label="${GAME.pearls} pearls — spend on rare skins">${PEARL} <b>${GAME.pearls}</b> Pearls <span class="muted">· spend in 🎨 My Skins</span></button>`
    : "";
  html("satchel", `
    ${hud("Inventory")}
    <div class="grow" style="overflow-y:auto; padding: 6px 8px 10px">
      ${purse}
      <div class="inv-screen">${body}</div>
    </div>
    <button class="btn secondary" id="sat-back">←  Back</button>
  `);
  document.querySelectorAll("#screen-satchel .inv-item").forEach(el => el.addEventListener("click", () => openInvQuest(el.dataset.g)));
  on("#inv-pearls", "click", renderWardrobe);
  on("#sat-back", "click", renderStart);
  show("satchel");
}
// Tapping an inventory item opens its quest / story info + progress.
function openInvQuest(groupId) {
  const g = inventoryGroups().find(x => x.id === groupId); if (!g) return;
  SFX.unlock && SFX.unlock(); SFX.pop && SFX.pop(1);
  let collection = "";
  if (g.hunt) {   // for hunts, show the whole set: found pictures + still-missing ghosts
    const h = HUNTS[g.hunt], st = huntState(g.hunt);
    if (h.items) collection = `<div class="invq-collection">${h.items.map(id => {
      const got = st.seen.indexOf(id) >= 0;
      return `<div class="invq-slot${got ? " got" : ""}">${got ? ART.tag(id, h.itemEmoji, "invq-slot-img") : `<span class="invq-q">?</span>`}</div>`;
    }).join("")}</div>`;
  }
  const ov = document.createElement("div"); ov.className = "invq-overlay"; ov.id = "invq-overlay";
  ov.innerHTML = `
    <div class="invq-card">
      <div class="invq-kind ${g.kind}">${g.kind === "quest" ? "◆ Quest" : "◆ Storyline"}</div>
      <div class="invq-title">${g.title}</div>
      <div class="invq-desc">${g.desc}</div>
      ${collection}
      <div class="invq-progress">${g.progress}</div>
      <button class="invq-ok" id="invq-ok">Got it</button>
    </div>`;
  itemHost().appendChild(ov);
  on("#invq-ok", "click", () => ov.remove());
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
}

/* ======================================================================= */
/* WORLD MAP — travel between realms; unlock new ones with gold + keys.     */
/* ======================================================================= */
// A realm's "story path" for the map — filled pips for events experienced, empty for the
// rest. Framed as story/chapters (no "3/5" quota text), kept OFF the gameplay screen so
// serving customers never feels like filler between events.
function realmStoryHtml(r) {
  const need = realmEventsNeeded(r.id); if (!need) return "";
  const done = realmEventsCleared(r.id), complete = done >= need;
  const pips = Array.from({ length: need }, (_, i) => `<i class="story-pip ${i < done ? "on" : ""}"></i>`).join("");
  return `<div class="realm-story ${complete ? "done" : ""}">
    <span class="story-lbl">${complete ? "✨ Story complete" : "📖 Realm story"}</span>
    <span class="story-pips">${pips}</span></div>`;
}
function renderMap() {
  const cards = D.REALMS.map(r => {
    const here = GAME.realm === r.id, unlocked = realmUnlocked(r.id);
    const cast = (r.customers || (r.id === "willow" ? D.CUSTOMERS : [])).slice(0, 5).map(c => c.emoji).join(" ");
    let statusRow, cls = "";
    if (here) { cls = "here"; statusRow = `<span class="realm-tag here">📍 You are here</span>`; }
    else if (unlocked) { statusRow = `<button class="btn good small realm-go" data-id="${r.id}">Travel here →</button>`; }
    else if (r.comingSoon) { cls = "locked"; statusRow = `<span class="realm-tag muted">🔒 Coming soon</span>`; }
    else if (r.unlock) {
      cls = "locked";
      const canGold = GAME.gold >= r.unlock.gold, canKeys = (GAME.keys || 0) >= r.unlock.keys;
      const keyFrom = r.unlock.keyFrom, hasKey = !keyFrom || realmFinaleWon(keyFrom), can = canGold && canKeys && hasKey;
      const keyRow = keyFrom ? `<span style="color:${hasKey ? "var(--good)" : "var(--bad)"}">🔑 Realm Key ${hasKey ? "✓" : `— beat ${(D.REALM_BY_ID[keyFrom] || {}).name || keyFrom}'s finale`}</span>` : "";
      statusRow = `<div class="realm-cost"><span style="color:${canGold ? "var(--good)" : "var(--bad)"}">🪙 ${r.unlock.gold}</span>
        <span style="color:${canKeys ? "var(--good)" : "var(--bad)"}">🗝️ ${r.unlock.keys}</span></div>
        ${keyRow ? `<div class="realm-cost" style="font-size:11px">${keyRow}</div>` : ""}
        <button class="btn ${can ? "" : "secondary"} small realm-unlock" data-id="${r.id}" ${can ? "" : "disabled"}>Unlock</button>`;
    } else { cls = "locked"; statusRow = `<span class="realm-tag muted">🔒 Locked</span>`; }
    return `<div class="realm-card ${cls}">
      <div class="realm-icon">${r.icon}</div>
      <div class="realm-body">
        <div class="realm-name">${r.name}</div>
        <div class="muted" style="font-size:12px">${r.tagline}</div>
        ${cast ? `<div class="realm-cast">${cast}</div>` : ""}
        ${(here || unlocked) ? realmStoryHtml(r) : ""}
      </div>
      <div class="realm-status">${statusRow}</div></div>`;
  }).join("");
  html("map", `
    ${hud("World Map")}
    <div class="rb-total" style="text-align:center;margin:2px 0 8px">🪙 <b>${GAME.gold}</b> · 🗝️ <b>${GAME.keys || 0}</b> keys <span class="muted" style="font-size:12px">· your shop travels with you</span></div>
    <div class="grow" style="overflow-y:auto"><div class="realm-list">${cards}</div></div>
    <button class="btn secondary" id="map-back">←  Back</button>
  `);
  $("#screen-map").querySelectorAll(".realm-go").forEach(b => b.addEventListener("click", () => travelRealm(b.dataset.id)));
  $("#screen-map").querySelectorAll(".realm-unlock").forEach(b => b.addEventListener("click", () => unlockRealm(b.dataset.id)));
  on("#map-back", "click", renderStart);
  show("map");
}
function travelRealm(id) {
  if (!realmUnlocked(id)) return;
  GAME.realm = id; save();
  applyRealmTheme();
  const r = D.REALM_BY_ID[id];
  SFX.unlock(); SFX.charm();
  toast(`${r.icon} Off to ${r.name}!`);
  renderStart();
}
function unlockRealm(id) {
  const r = D.REALM_BY_ID[id]; if (!r || !r.unlock || realmUnlocked(id)) return;
  if (r.unlock.keyFrom && !realmFinaleWon(r.unlock.keyFrom)) { toast(`🔑 Beat ${(D.REALM_BY_ID[r.unlock.keyFrom] || {}).name || "the previous realm"}'s finale to earn the Realm Key first!`); return; }
  if (GAME.gold < r.unlock.gold || (GAME.keys || 0) < r.unlock.keys) { toast("Not enough gold or keys yet."); return; }
  confirmDialog(`Unlock ${r.name} for 🪙${r.unlock.gold} + 🗝️${r.unlock.keys}?`, () => {
    GAME.gold -= r.unlock.gold; GAME.keys -= r.unlock.keys; GAME.unlockedRealms[id] = true; save();
    SFX.unlock(); SFX.perfect(); confettiOver($("#app"));
    toast(`${r.icon} ${r.name} unlocked! Travel there any time.`);
    renderMap();
  });
}

/* ======================================================================= */
/* ADMIN / TESTING — jump straight to any event, no grinding                */
/* ======================================================================= */
function adminBoss() {
  SFX.unlock(); stopRoundTimers(); refreshQuests();
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm, forceBoss: true, customers: currentRealm().customers, ingredientSet: currentRealm().ingredients, magicPool: currentRealm().magics, reqBonus: currentRealm().reqBonus || 0 });
  ROUND.rush = false;
  renderCustomer();
}
function adminRush() {
  SFX.unlock(); stopRoundTimers(); refreshQuests();
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm, customers: currentRealm().customers, ingredientSet: currentRealm().ingredients, magicPool: currentRealm().magics, reqBonus: currentRealm().reqBonus || 0 });
  ROUND.wish.boss = false;
  ROUND.rush = true; ROUND.rushMs = BALANCE.RUSH_MS; ROUND.rushStart = null;
  renderCustomer();
}
// Force a specific customer to walk in now (at their current story chapter) — for testing arcs.
function adminCustomer(id) {
  SFX.unlock(); stopRoundTimers(); refreshQuests();
  const rec = (D.CUSTOMERS || []).find(c => c.id === id) || (currentRealm().customers || []).find(c => c.id === id);
  if (!rec) { toast("Customer not found in this realm."); return; }
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm, customers: [rec], ingredientSet: currentRealm().ingredients, magicPool: currentRealm().magics, reqBonus: currentRealm().reqBonus || 0 });
  injectInfused(ROUND); injectKeys(ROUND);
  ROUND.rush = false; ROUND.vip = false; ROUND.keyStaked = false;
  applyCustArc(ROUND);
  renderCustomer();
}
function renderAdmin() {
  const arcRow = (id, label) => { const a = custArc(id), s = custStoryStep(id); const tag = a ? (s < a.length ? `ch ${s + 1}/${a.length}` : "done") : ""; return `<button class="btn small" id="ad-cust-${id}">${label} <span class="muted" style="font-weight:600;font-size:11px">· ${tag}</span></button>`; };
  html("admin", `
    ${hud("Admin & Testing")}
    <div class="grow" style="overflow-y:auto">
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:6px">📖 Little Red's Story</div>
        <p class="muted" style="font-size:12px;margin-bottom:10px">Watch any part of Little Red's tale — in order, they run: the arrival, then Grandma's photos, then the impostor.</p>
        <button class="btn" id="ad-intro" style="margin-bottom:8px">1️⃣ 📖 Arrival + Tutorial (Replay Intro)</button>
        <button class="btn" id="ad-red2" style="margin-bottom:8px">2️⃣ 📸 Visit: Grandma's Vacation Photos</button>
        <button class="btn" id="ad-red3" style="margin-bottom:8px">3️⃣ 🐺 Visit: The Impostor Sketch</button>
        <button class="btn" id="ad-bopeep">🐑 Bo Peep (quest → turns on sheep hunt)</button>
        <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px">
          <button class="btn small" id="ad-sheep-all">🐑 Find all sheep → celebrate</button>
          <button class="btn secondary small" id="ad-sheep-reset">↺ Reset Bo Peep + sheep</button>
        </div>
        <button class="btn" id="ad-grandmawolf" style="margin-top:8px">🐺 Grandma-Wolf bridge → Willow Finale</button>
      </div>
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:6px">🌟 Wishy's Wishing Well</div>
        <p class="muted" style="font-size:12px;margin-bottom:10px">Replay Wishy's intro, or jump straight into the well's first-visit tutorial (free coin + Wishy). Use +1000 🪙 below if you need coins to keep tossing.</p>
        <button class="btn" id="ad-well-intro" style="margin-bottom:8px">🐟 Replay Wishy's well intro</button>
        <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="btn small" id="ad-well-open">🌟 Open well (first-visit tutorial)</button>
          <button class="btn secondary small" id="ad-well-reset">↺ Reset well</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:6px">🧑‍🤝‍🧑 Customer Arcs <span class="muted" style="font-weight:600;font-size:12px">(wishes evolve as you serve them)</span></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:8px">
          ${arcRow("gingerbread", "🍪 Gingerbread")}
          ${arcRow("mouse", "🐭 Tiny Mouse")}
          ${arcRow("pig_straw", "🐷 Straw Pig")}
          ${arcRow("pig_stick", "🐖 Stick Pig")}
          ${arcRow("owl", "🦉 Sleepy Owl")}
          ${arcRow("baker", "👨‍🍳 Baker")}
          ${arcRow("hare", "🐇 The Hare")}
          ${arcRow("tortoise", "🐢 The Tortoise")}
          ${arcRow("fish", "🐟 Wishy the Fish")}
          <button class="btn small" id="ad-pigs-move">🧳 Pigs: Moving Day</button>
          <button class="btn small" id="ad-goldi-mouse">🐭 Goldilocks: Mouse's bears</button>
          <button class="btn small" id="ad-goldi-deliver">🧸 Goldilocks: Deliver bears</button>
          <button class="btn small" id="ad-band-announce">🎤 Bandit Bears: announce</button>
          <button class="btn small" id="ad-band-next">🎸 Bandit Bears: next visit</button>
          <button class="btn small" id="ad-band-deliver">🖼️ Bandit Bears: deliver poster</button>
          <button class="btn secondary small" id="ad-band-reset">↺ Reset band quest</button>
          <button class="btn secondary small" id="ad-cust-reset">↺ Reset arcs</button>
        </div>
        <p class="muted" style="font-size:11px;text-align:center;margin:0">Spawn them at their current chapter; grant the wish to advance. (Finish both pig arcs → Moving Day fires on its own.)</p>
      </div>
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:6px">🎬 Jump to an event</div>
        <p class="muted" style="font-size:12px;margin-bottom:10px">Launch a special encounter right now — no need to play through normal rounds to find one.</p>
        <button class="btn good" id="ad-popx" style="margin-bottom:8px">🪵 Force treasure X (next Pop phase)</button>
        <button class="btn good" id="ad-scoopsecret" style="margin-bottom:8px">🫧 Force secret pearl (next Scoop phase)</button>
        <button class="btn" id="ad-duel" style="margin-bottom:8px">⚔️ Mixing Duel</button>
        <button class="btn" id="ad-fairy" style="margin-bottom:8px">🧚 Fairy's Matching Boon</button>
        <button class="btn" id="ad-rumpel" style="margin-bottom:8px">🧵 Rumpelstiltskin</button>
        <button class="btn" id="ad-goblin" style="margin-bottom:8px">🧌 Gribble the Goblin</button>
        <button class="btn" id="ad-wolf" style="margin-bottom:8px">🐺 Feed the Wolf (practice)</button>
        <button class="btn" id="ad-wolf-finale" style="margin-bottom:8px">🔑 Willow Finale (Realm Key)</button>
        <button class="btn" id="ad-feast" style="margin-bottom:8px">🍗 Rescue the Feast (practice)</button>
        <button class="btn" id="ad-feast-finale" style="margin-bottom:8px">🔑 Courtyard Finale (Realm Key)</button>
        <button class="btn" id="ad-stack" style="margin-bottom:8px">🪙 Sky-High Savings (practice)</button>
        <button class="btn" id="ad-stack-finale" style="margin-bottom:8px">🔑 Beanstalk Finale (Realm Key)</button>
        <button class="btn" id="ad-wine" style="margin-bottom:8px">🍷 Spilled Wish-Wine (practice)</button>
        <button class="btn" id="ad-boutique" style="margin-bottom:8px">🐭 Mouse Boutique (practice)</button>
        <button class="btn" id="ad-carpet" style="margin-bottom:8px">🧞 Magic Carpet Dash (practice)</button>
        <button class="btn" id="ad-courtyard" style="margin-bottom:8px">🏰 Go to King's Courtyard (test)</button>
        <button class="btn" id="ad-queen" style="margin-bottom:8px">👑 The Evil Queen</button>
        <button class="btn" id="ad-dance" style="margin-bottom:8px">💃 Ball: Knight</button>
        <button class="btn" id="ad-dance2" style="margin-bottom:8px">🤴 Ball: Prince</button>
        <button class="btn" id="ad-dance3" style="margin-bottom:8px">👸 Ball: Cinderella</button>
        <button class="btn" id="ad-cake" style="margin-bottom:8px">🧁 Drury Lane Bake-Off</button>
        <button class="btn secondary" id="ad-boss" style="margin-bottom:8px">👑 VIP (Boss) Customer</button>
        <button class="btn secondary" id="ad-rush">⏱️ In‑a‑Rush Customer</button>
      </div>
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:8px">💰 Give yourself resources</div>
        <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="btn good small" id="ad-gold">+1000 🪙</button>
          <button class="btn good small" id="ad-pearls">+25 pearls</button>
          <button class="btn good small" id="ad-dust">+100 ✨</button>
          <button class="btn good small" id="ad-treats">+10 🐸</button>
          <button class="btn good small" id="ad-keys">+10 🗝️</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:8px">🐺 The Wolf <span class="muted" style="font-weight:600;font-size:12px">· visit ${Math.min((GAME.wolfArcStep||0)+1, WOLF_VISITS.length)}/${WOLF_VISITS.length}${(GAME.wolfArcStep||0)>=WOLF_VISITS.length?" (done)":""}</span></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="btn good small" id="ad-wolf-all">▶️ Play all ${WOLF_VISITS.length} back-to-back</button>
          <button class="btn small" id="ad-wolf-visit">🐺 Wolf visit (next disguise)</button>
          <button class="btn secondary small" id="ad-wolf-reset">↺ Reset wolf arc</button>
        </div>
        <p class="muted" style="font-size:11px;text-align:center;margin:6px 0 0">“Play all” runs his 4 disguises in a row (you still make each wish) — no other customers between.</p>
      </div>
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:8px">🔎 Button Clue-Chain <span class="muted" style="font-weight:600;font-size:12px">· step ${GAME.buttonStep || 0}/3</span></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="btn small" id="ad-btn-wolf">1️⃣ 🎩 Wolf drops buttons</button>
          <button class="btn small" id="ad-btn-red">2️⃣ 👧 Show Red</button>
          <button class="btn small" id="ad-btn-ginger">3️⃣ 🍪 Gingerbread hand-off</button>
          <button class="btn small" id="ad-satchel">🎒 Open Satchel</button>
          <button class="btn secondary small" id="ad-btn-reset">↺ Reset chain</button>
        </div>
      </div>
      <p class="muted" style="font-size:11px;text-align:center">For testing only — we can hide this panel before the game goes public.</p>
    </div>
    <button class="btn secondary" id="ad-back">←  Back</button>
  `);
  on("#ad-popx", "click", () => { GAME.forcePopX = true; save(); toast("🪵 Next Pop phase will hide the treasure X — start a round and pop through to it!"); });
  on("#ad-scoopsecret", "click", () => { GAME.forceScoopSecret = true; save(); toast("🫧 A secret pearl will peek out on the next Scoop — watch the glitter and tap it!"); });
  on("#ad-duel", "click", renderDuelIntro);
  on("#ad-fairy", "click", renderFairyIntro);
  on("#ad-rumpel", "click", renderRumpelIntro);
  on("#ad-goblin", "click", () => {
    // make sure there's junk to feed when testing
    if (GAME.trash.filter(id => !isBag(id)).length < 10) {
      const ids = D.TRASH.map(t => t.id);
      while (GAME.trash.length < BALANCE.TRASH_BIN_MAX) GAME.trash.push(R.pick(ids));
      save();
    }
    renderGoblinIntro();
  });
  on("#ad-wolf", "click", renderWolfIntro);
  on("#ad-wolf-finale", "click", renderWolfFinale);
  on("#ad-feast", "click", renderFeastIntro);
  on("#ad-feast-finale", "click", renderFeastFinale);
  on("#ad-stack", "click", renderStackIntro);
  on("#ad-stack-finale", "click", renderStackFinale);
  on("#ad-wine", "click", renderWineIntro);
  on("#ad-boutique", "click", renderBoutiqueIntro);
  on("#ad-carpet", "click", renderCarpetIntro);
  on("#ad-courtyard", "click", () => { GAME.finaleWon = GAME.finaleWon || {}; GAME.finaleWon.willow = true; GAME.unlockedRealms.courtyard = true; save(); travelRealm("courtyard"); });
  on("#ad-queen", "click", () => {
    if (GAME.gold < QUEEN_PACKAGES[0].gold) { GAME.gold += 200; save(); } // need gold to pay her ransom
    renderQueenIntro();
  });
  on("#ad-dance", "click", () => renderDanceIntro("knight"));
  on("#ad-dance2", "click", () => renderDanceIntro("prince"));
  on("#ad-dance3", "click", () => renderDanceIntro("cinderella"));
  on("#ad-cake", "click", renderCakeIntro);
  on("#ad-intro", "click", playArrivalIntro);
  on("#ad-red2", "click", playRedVacation);
  on("#ad-red3", "click", playRedImpostor);
  on("#ad-cust-gingerbread", "click", () => adminCustomer("gingerbread"));
  on("#ad-cust-mouse", "click", () => adminCustomer("mouse"));
  on("#ad-cust-pig_straw", "click", () => adminCustomer("pig_straw"));
  on("#ad-cust-pig_stick", "click", () => adminCustomer("pig_stick"));
  on("#ad-cust-owl", "click", () => adminCustomer("owl"));
  on("#ad-cust-baker", "click", () => adminCustomer("baker"));
  on("#ad-cust-hare", "click", () => adminCustomer("hare"));
  on("#ad-cust-tortoise", "click", () => adminCustomer("tortoise"));
  on("#ad-cust-fish", "click", () => adminCustomer("fish"));
  on("#ad-pigs-move", "click", () => { GAME.pigsMoved = false; playPigsMoving(); });
  on("#ad-goldi-mouse", "click", () => { GAME.goldilocksStep = 0; GAME.goldilocksAt = -1; save(); playGoldiMouse(); });
  on("#ad-goldi-deliver", "click", () => { GAME.goldilocksStep = 1; GAME.goldilocksAt = -1; if (!satchelCount("teddy")) satchelAdd("teddy", 3); save(); playGoldiDeliver(); });
  on("#ad-band-announce", "click", () => { GAME.bandStep = 0; GAME.bandAt = -1; save(); playBandAnnounce(); });
  on("#ad-band-next", "click", () => { const s = GAME.bandStep || 0; if (s < 1) GAME.bandStep = 1; if ((GAME.bandStep || 0) > 3) { toast("All three have signed — deliver it!"); return; } const m = bandMember((GAME.bandStep || 1) - 1); GAME.bandAt = -1; save(); ART.ensure(m.art, () => {}); startStoryWish({ id: m.id, name: m.name, emoji: m.emoji, wishType: m.wishType, art: m.art, location: "Willow-Wish Village" }, m.tag, m.line); });
  on("#ad-band-deliver", "click", () => { GAME.bandStep = 4; GAME.bandAt = -1; save(); playBandDeliver(); });
  on("#ad-band-reset", "click", () => { GAME.bandStep = 0; GAME.bandAt = -1; save(); toast("Band quest reset"); renderAdmin(); });
  on("#ad-cust-reset", "click", () => { GAME.custStory = {}; GAME.pigsMoved = false; save(); toast("Customer story arcs reset"); renderAdmin(); });
  on("#ad-bopeep", "click", () => { GAME.bopeepMet = false; playBoPeep(); });
  on("#ad-sheep-all", "click", () => { GAME.bopeepMet = true; const h = HUNTS.willow, st = huntState("willow"); st.seen = h.items.slice(); st.found = h.items.length; st.done = false; save(); huntComplete(h); renderStart(); });
  on("#ad-sheep-reset", "click", () => { GAME.bopeepMet = false; GAME.hunts.willow = { found: 0, done: false, seen: [] }; GAME.huntCelebrate = null; if (GAME.owned) delete GAME.owned.toad_lamb; save(); toast("Bo Peep + sheep hunt reset"); renderAdmin(); });
  on("#ad-grandmawolf", "click", () => { GAME.grandmaWolfSeen = false; GAME.storyStep = Math.max(GAME.storyStep, 4); save(); playGrandmaWolf(); });
  on("#ad-boss", "click", adminBoss);
  on("#ad-rush", "click", adminRush);
  on("#ad-satchel", "click", renderSatchel);
  on("#ad-wolf-all", "click", () => { WOLF_DEMO = true; GAME.wolfArcStep = 0; save(); playWolfVisit(); });
  on("#ad-wolf-visit", "click", () => { WOLF_DEMO = false; if ((GAME.wolfArcStep || 0) >= WOLF_VISITS.length) { GAME.wolfArcStep = 0; save(); } playWolfVisit(); });
  on("#ad-wolf-reset", "click", () => { WOLF_DEMO = false; GAME.wolfArcStep = 0; GAME.wolfArcAt = -1; save(); toast("Wolf arc reset"); renderAdmin(); });
  on("#ad-btn-wolf", "click", playWolfButtons);
  on("#ad-btn-red", "click", playRedButtons);
  on("#ad-btn-ginger", "click", playGingerbreadButton);
  on("#ad-btn-reset", "click", () => { GAME.buttonStep = 0; GAME.buttonChainAt = -1; GAME.satchel = {}; save(); toast("Button chain reset"); renderAdmin(); });
  on("#ad-gold", "click", () => { GAME.gold += 1000; save(); toast("+1000 gold 🪙"); renderAdmin(); });
  on("#ad-well-intro", "click", () => { GAME.wellIntro = 0; save(); playWellIntro(); });
  on("#ad-well-open", "click", () => { GAME.wellIntro = 1; save(); renderWell(); });
  on("#ad-well-reset", "click", () => { GAME.wellIntro = 0; save(); toast("Well reset — Wishy will introduce it again"); renderAdmin(); });
  on("#ad-pearls", "click", () => { GAME.pearls = (GAME.pearls || 0) + 25; save(); toast("+25 pearls"); renderAdmin(); });
  on("#ad-dust", "click", () => { GAME.stardust += 100; save(); toast("+100 Stardust ✨"); renderAdmin(); });
  on("#ad-treats", "click", () => { GAME.treats += 10; save(); toast("+10 treats 🐸"); renderAdmin(); });
  on("#ad-keys", "click", () => { GAME.keys = (GAME.keys || 0) + 10; save(); toast("+10 keys 🗝️"); renderAdmin(); });
  on("#ad-back", "click", renderStart);
  show("admin");
}

/* ======================================================================= */
/* MENU / UPGRADES                                                         */
/* ======================================================================= */
function todayStr() { const d = new Date(); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
function dailyAvailable() { return GAME.lastDaily !== todayStr(); }
function renderMenu() {
  const A = D.FAMILIAR.abilities;
  const abilityRow = key => {
    const ab = A[key], owned = !!GAME.unlocked[key], afford = GAME.gold >= ab.unlockCost;
    return `<div class="up-card"><div class="up-body"><div class="up-name">${ab.name}</div>
      <div class="muted" style="font-size:12px">${ab.desc}</div></div>
      <button class="btn small ${owned ? "secondary" : "good"}" id="unlock-${key}" ${owned || !afford ? "disabled" : ""}>${owned ? "✓ Owned" : "🪙 " + ab.unlockCost}</button></div>`;
  };
  const canDaily = dailyAvailable();
  html("menu", `
    ${hud("Shop & Upgrades")}
    <div class="grow" style="overflow-y:auto">
      <div class="card center" style="margin-bottom:10px;gap:8px">
        <div style="font-weight:800">🎁 Daily Gift</div>
        <button class="btn ${canDaily ? "" : "secondary"}" id="daily-btn" ${canDaily ? "" : "disabled"} style="max-width:240px">${canDaily ? "Claim 🪙 " + BALANCE.DAILY_GRANT : "Come back tomorrow!"}</button>
      </div>
      <button class="btn ${anyQuestClaimable() ? "good" : ""}" id="quests-btn" style="margin-bottom:10px">📋 Quests${anyQuestClaimable() ? ` <span class="q-badge">!</span>` : ""}</button>
      <div class="row" style="margin-bottom:10px;gap:10px">
        ${GAME.wellIntro >= 1 ? `<button class="btn" id="well-btn" style="flex:1">🌟 Wishing Well</button>` : ""}
        <button class="btn secondary" id="wardrobe-btn" style="flex:1">🎨 My Skins</button>
      </div>
      <div class="row" style="margin-bottom:10px;gap:10px">
        <button class="btn secondary" id="recycle-btn" style="flex:1">🗑️ Recycle <span class="muted" style="font-weight:500;font-size:12px">· ${GAME.trash.length}/${BALANCE.TRASH_BIN_MAX}</span></button>
        <button class="btn ${GAME.keys > 0 ? "good" : "secondary"}" id="vault-btn" style="flex:1">🗝️ Vault <span class="muted" style="font-weight:500;font-size:12px">· ${GAME.keys}</span></button>
      </div>
      <button class="btn ${satchelTotal() > 0 ? "good" : "secondary"}" id="satchel-btn" style="margin-bottom:10px">🎒 Satchel${satchelTotal() > 0 ? ` <span class="q-badge">${satchelTotal()}</span>` : ""}</button>
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:8px">🐸 Treats <span class="muted" style="font-weight:500;font-size:13px">· ${GAME.treats} owned · 🪙${BALANCE.PRICES.treat} each</span></div>
        <div class="row" style="align-items:center;justify-content:center">
          <button class="shelf-arrow" id="tr-minus">−</button>
          <div id="tr-qty" style="min-width:36px;text-align:center;font-weight:800;font-size:18px">1</div>
          <button class="shelf-arrow" id="tr-plus">+</button>
          <button class="btn good small" id="tr-buy" style="margin-left:8px">Buy <span id="tr-cost">🪙${BALANCE.PRICES.treat}</span></button>
        </div>
      </div>
      <div class="card">
        <div style="font-weight:800;margin-bottom:8px">🐾 Pet Upgrades</div>
        <div class="up-grid">${abilityRow("scoop")}${abilityRow("charm")}${abilityRow("undo")}</div>
        <div class="muted" style="font-size:11px;margin-top:8px">New fairytale locations with fresh customers are coming soon!</div>
      </div>
    </div>
    <button class="btn secondary" id="menu-back">←  Back</button>
  `);
  let qty = 1;
  const updQty = () => { const q = $("#tr-qty"), c = $("#tr-cost"); if (q) q.textContent = qty; if (c) c.textContent = "🪙" + qty * BALANCE.PRICES.treat; };
  on("#tr-minus", "click", () => { qty = Math.max(1, qty - 1); updQty(); });
  on("#tr-plus", "click", () => { qty = Math.min(25, qty + 1); updQty(); });
  on("#tr-buy", "click", () => buyTreats(qty));
  ["scoop", "charm", "undo"].forEach(k => on("#unlock-" + k, "click", () => unlockAbility(k)));
  on("#daily-btn", "click", claimDaily);
  on("#quests-btn", "click", renderQuests);
  on("#well-btn", "click", renderWell);
  on("#wardrobe-btn", "click", renderWardrobe);
  on("#recycle-btn", "click", () => renderRecycle("coins"));
  on("#vault-btn", "click", renderVault);
  on("#satchel-btn", "click", renderSatchel);
  on("#menu-back", "click", renderStart);
  show("menu");
}
function buyTreats(qty) {
  const cost = qty * BALANCE.PRICES.treat;
  if (GAME.gold < cost) { toast("Not enough gold."); return; }
  GAME.gold -= cost; GAME.treats += qty; save();
  toast(`Bought ${qty} treat${qty > 1 ? "s" : ""}! 🐸`); renderMenu();
}
function unlockAbility(key) {
  const ab = D.FAMILIAR.abilities[key];
  if (GAME.unlocked[key]) return;
  if (GAME.gold < ab.unlockCost) { toast("Not enough gold."); return; }
  GAME.gold -= ab.unlockCost; GAME.unlocked[key] = true; save();
  toast(`Unlocked ${ab.name}! 🎉`); renderMenu();
}
function claimDaily() {
  if (!dailyAvailable()) { toast("Already claimed today."); return; }
  GAME.gold += BALANCE.DAILY_GRANT; GAME.lastDaily = todayStr(); save();
  toast(`🎁 +${BALANCE.DAILY_GRANT} gold!`); renderMenu();
}

/* ======================================================================= */
/* TREASURE VAULT — spend Treasure Keys (popped from bubbles) on chests.    */
/* Keys are rarer than gold, so a chest always pays a chunky, guaranteed    */
/* reward — with a rare shot at a brand-new skin.                           */
/* ======================================================================= */
function rollChestPrize() {
  const rndInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const r = Math.random();
  if (r < 0.44) return { kind: "gold", amt: rndInt(12, 26) * 10 };      // 120–260 gold
  if (r < 0.70) return { kind: "treats", amt: rndInt(3, 6) };
  if (r < 0.90) return { kind: "stardust", amt: rndInt(10, 24) };
  const pool = unownedSkins();                                          // rare: a new skin
  if (pool.length) return { kind: "skin", cosmetic: pool[Math.floor(Math.random() * pool.length)] };
  return { kind: "stardust", amt: 30 };                                 // own them all → extra Stardust
}
function grantChestPrize(p) {
  if (p.kind === "gold") { GAME.gold += p.amt; save(); return { emoji: "🪙", label: `+${p.amt} gold`, sub: "A heap of coins!" }; }
  if (p.kind === "treats") { GAME.treats += p.amt; save(); return { emoji: "🐸", label: `+${p.amt} treats`, sub: "Your pet is delighted." }; }
  if (p.kind === "stardust") { GAME.stardust += p.amt; save(); return { emoji: "✨", label: `+${p.amt} Stardust`, sub: "Spend it on any skin." }; }
  GAME.owned[p.cosmetic.id] = true; save();
  return { emoji: p.cosmetic.chip, label: `New skin: ${p.cosmetic.name}!`, sub: "Equip it in 🎨 My Skins.", jackpot: true };
}
function renderVault(stageHtml) {
  const keys = GAME.keys || 0, can = keys > 0;
  html("vault", `
    ${hud("Treasure Vault")}
    <div class="grow center" style="gap:14px;overflow-y:auto">
      <div class="well-visual"><div class="well-emoji">${ART.tag("vault_chest", "🧰")}</div><div class="well-ripple"></div></div>
      <div class="rb-total">🗝️ <b id="vault-keys">${keys}</b> Treasure Key${keys === 1 ? "" : "s"}</div>
      <div id="vault-stage" class="well-stage muted">${stageHtml || "Keys pop from bubbles as you play — spend one to crack open a chest!"}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div style="font-weight:800;text-align:center;margin-bottom:6px">What's inside a chest?</div>
        <div class="stat-line"><span>🪙 A heap of gold</span><span class="muted">common</span></div>
        <div class="stat-line"><span>🐸 A handful of treats</span><span class="muted">common</span></div>
        <div class="stat-line"><span>✨ Stardust</span><span class="muted">uncommon</span></div>
        <div class="stat-line"><span>🎁 A brand-new skin!</span><span style="color:var(--gold);font-weight:800">rare</span></div>
      </div>
      <p class="muted" style="font-size:12px;max-width:280px">Every chest gives something worthwhile — keys are precious, so they always pay off.</p>
    </div>
    <button class="btn ${can ? "good" : "secondary"}" id="vault-open" ${can ? "" : "disabled"}>🗝️ Open a Chest ${can ? "" : "· need a key"}</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="vault-back">←  Back</button>
  `);
  on("#vault-open", "click", openChest);
  on("#vault-back", "click", renderMenu);
  show("vault");
}
function openChest() {
  if ((GAME.keys || 0) <= 0) { toast("No keys yet — pop bubbles to find some!"); return; }
  GAME.keys -= 1; save();
  const prize = rollChestPrize();
  const info = grantChestPrize(prize);
  SFX.unlock(); if (info.jackpot) { SFX.perfect(); confettiOver($("#app")); } else { SFX.bigCoin(); }
  renderVault(`<div class="well-prize ${info.jackpot ? "jackpot" : ""}"><div class="wp-emoji">${info.emoji}</div>
    <div class="wp-label">${info.label}</div><div class="wp-sub muted">${info.sub}</div></div>`);
}

/* ======================================================================= */
/* WISHING WELL — spend gold, gamble for cosmetics (always get something)   */
/* ======================================================================= */
function ownedCount(kind) { return D.COSMETICS[kind].filter(c => GAME.owned[c.id]).length; }
function allSkins() { return [].concat(D.COSMETICS.cauldron, D.COSMETICS.familiar); }
// the Well only awards Stardust-buyable skins — achievement/villain/ball/hunt/pearl skins are earned or pearl-only, never rolled
function unownedSkins() { return allSkins().filter(c => !GAME.owned[c.id] && !c.achievement && !c.villain && !c.ball && !c.hunt && !c.pearl); }
// Roll a prize from the weighted tiers. Always returns a prize object.
function rollWellPrize() {
  const rndInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const tiers = BALANCE.WELL_TIERS, total = tiers.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total, tier = tiers[tiers.length - 1];
  for (const t of tiers) { if (r < t.weight) { tier = t; break; } r -= t.weight; }
  if (tier.id === "gold" || tier.id === "fizzle") return { kind: "gold", amt: rndInt(tier.gold[0], tier.gold[1]) };
  if (tier.id === "treats")   return { kind: "treats", amt: rndInt(tier.treats[0], tier.treats[1]) };
  if (tier.id === "stardust") return { kind: "stardust", amt: rndInt(tier.dust[0], tier.dust[1]) };
  // skin tier: award a random unowned skin, or Stardust if you already own them all
  const pool = unownedSkins();
  if (!pool.length) return { kind: "stardust", amt: tier.dustIfOwnAll, wasSkin: true };
  return { kind: "skin", cosmetic: pool[Math.floor(Math.random() * pool.length)] };
}
// Apply a prize to the save (returns a short human label for the reveal).
function grantWellPrize(p) {
  if (p.kind === "gold") { GAME.gold += p.amt; save(); return { emoji: "🪙", label: `+${p.amt} gold back`, sub: "A little something — try again!" }; }
  if (p.kind === "treats") { GAME.treats += p.amt; save(); return { emoji: "🐸", label: `+${p.amt} treats`, sub: "Your pet is pleased." }; }
  if (p.kind === "stardust") { GAME.stardust += p.amt; save(); return { emoji: "✨", label: `+${p.amt} Stardust`, sub: p.wasSkin ? "You own every Stardust skin — extra Stardust!" : "Save it to buy any skin you like." }; }
  // skin
  GAME.owned[p.cosmetic.id] = true; save();
  return { emoji: p.cosmetic.chip, label: `New skin: ${p.cosmetic.name}!`, sub: "Equip it in 🎨 My Skins.", jackpot: true };
}
function wellDustChip() {
  const totalSkins = allSkins().length, ownedSkins = allSkins().filter(c => GAME.owned[c.id]).length;
  return `🪙 <b>${(GAME.gold || 0).toLocaleString()}</b> · ✨ <b>${GAME.stardust}</b> · 🎁 <b>${ownedSkins}/${totalSkins}</b>`;
}
function refreshWellChip() { const c = $(".well-dustchip"); if (c) c.innerHTML = wellDustChip(); }
// Wishy's well: a top-down well backdrop. During the tutorial (first-ever visit)
// Wishy floats in the water circle and explains; after your first wish he swims off
// for good. Toss a coin → it drops in → three bubbles rise from the water → pop one.
let wellTutorialLayout = false;
function renderWell() {
  const cost = BALANCE.WELL_COST;
  const tutorial = GAME.wellIntro === 1;   // first-ever visit: Wishy + his free coin, kept in the bottom row
  wellTutorialLayout = tutorial;
  const canToss = tutorial || GAME.gold >= cost;
  ART.ensure("customer_fish", () => {}); ART.ensure("stack_coin_front", () => {});
  // Tutorial keeps today's look (Toss + Back in the bottom row). Once Wishy's gone, the
  // Toss button lives on the cobblestones under the well and Back sits centred at the foot.
  const tossBtn = `<button class="btn good" id="well-toss" ${canToss ? "" : "disabled"}>${tutorial ? "Toss the free coin ✨" : "Toss 🪙" + cost}</button>`;
  html("well", `
    ${hud("Wishing Well")}
    <div class="well-scene mg-fullbleed" id="well-scene">
      <div class="well-circle" id="well-circle"></div>
      ${tutorial ? `<div class="wishy-well" id="wishy-well">${ART.tag("customer_fish", "🐟", "wishy-well-img")}</div>` : ""}
      <div class="well-dustchip">${wellDustChip()}</div>
      <button class="well-odds-btn" id="well-odds">ⓘ What floats up?</button>
      <div class="well-speech" id="well-speech">${tutorial
        ? `<b>Wishy:</b> Here — your first coin’s on me! Toss it in, then <b>pop one of the three bubbles</b> that float up. Go on, give it a try!`
        : `Toss a coin in and pop a bubble to see what floats up.`}</div>
      ${tutorial ? "" : `<div class="well-toss-cobble">${tossBtn}</div>`}
      <div class="row well-actions${tutorial ? "" : " solo"}">
        ${tutorial ? tossBtn : ""}
        <button class="btn secondary" id="well-back">←  Back</button>
      </div>
    </div>
  `);
  on("#well-toss", "click", wellToss);
  on("#well-back", "click", renderStart);
  on("#well-odds", "click", showWellOdds);
  show("well");
}
function showWellOdds() {
  if (document.getElementById("well-odds-modal")) return;
  const ov = document.createElement("div"); ov.className = "well-odds-modal"; ov.id = "well-odds-modal";
  ov.innerHTML = `<div class="card wom-card">
    <div style="font-weight:800;text-align:center;margin-bottom:8px">What might rise up?</div>
    <div class="stat-line"><span>🪙 A little gold back</span><span class="muted">common</span></div>
    <div class="stat-line"><span>🐸 A handful of treats</span><span class="muted">common</span></div>
    <div class="stat-line"><span>✨ Stardust (buys any skin)</span><span class="muted">uncommon</span></div>
    <div class="stat-line"><span>🎁 A brand-new skin!</span><span style="color:var(--gold);font-weight:800">rare</span></div>
    <p class="muted" style="font-size:12px;margin-top:8px">You always get something — the fun is <i>how big</i>. Duplicate skins turn into Stardust.</p>
    <button class="btn" id="wom-ok" style="margin-top:6px">Got it</button>
  </div>`;
  const host = screen("well") || document.body; host.appendChild(ov);
  on("#wom-ok", "click", () => ov.remove());
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
}
let wellBusy = false;
function wellToss() {
  if (wellBusy) return;
  const cost = BALANCE.WELL_COST;
  const firstWish = GAME.wellIntro === 1;   // the tutorial toss is free (Wishy's coin)
  if (!firstWish && GAME.gold < cost) { toast("Not enough gold."); return; }
  SFX.unlock();
  wellBusy = true;
  if (firstWish) { GAME.wellIntro = 2; save(); }        // his coin, on the house — no gold spent
  else { GAME.gold -= cost; save(); syncHud("well"); refreshWellChip(); }
  const prize = rollWellPrize();
  const toss = $("#well-toss"); if (toss) toss.disabled = true;
  const back = $("#well-back"); if (back) back.disabled = true;
  const speech = $("#well-speech");
  // On the tutorial toss, Wishy first dives back into the well and only THEN does the coin
  // drop — so his big picture never covers the coin splash or the rising bubbles.
  const wishy = $("#wishy-well");
  if (wishy) {
    if (speech) speech.innerHTML = `<b>Wishy:</b> In it goes — watch the water! 🐟💨`;
    wishy.classList.add("leaving");
    if (SFX.whoosh) SFX.whoosh();
    setTimeout(() => { wishy.remove(); dropWellCoin(prize); }, 820);
  } else {
    dropWellCoin(prize);
  }
}
// the tossed coin falls into the water, then the bubbles rise
function dropWellCoin(prize) {
  const circle = $("#well-circle");
  const speech = $("#well-speech"); if (speech && !document.getElementById("wishy-well")) speech.innerHTML = `Plink…`;
  if (!circle) { spawnWellBubbles(prize); return; }
  const coin = document.createElement("div"); coin.className = "well-coin";
  coin.innerHTML = ART.tag("stack_coin_front", "🪙", "well-coin-img");
  circle.appendChild(coin);
  if (SFX.coin) SFX.coin(0);
  setTimeout(() => { if (SFX.pop) SFX.pop(0); }, 480);      // little plink as it hits the water
  setTimeout(() => { coin.remove(); spawnWellBubbles(prize); }, 720);
}
// three mystery bubbles rise out of the water; pop any one to reveal the rolled prize
function spawnWellBubbles(prize) {
  const circle = $("#well-circle"); if (!circle) { wellBusy = false; return; }
  const wrap = document.createElement("div"); wrap.className = "well-bubbles2"; wrap.id = "well-bubbles2";
  // pyramid: one bubble on top, two beneath — spread so none overlap, all over the well circle
  const pos = [{ l: 50, t: 17 }, { l: 30, t: 55 }, { l: 70, t: 55 }];
  wrap.innerHTML = [0, 1, 2].map(i => `<button class="wbub2" data-i="${i}" style="--bl:${pos[i].l}%;--bt:${pos[i].t}%;--bd:${i * 0.11}s"><span class="wbub2-sheen"></span></button>`).join("");
  circle.appendChild(wrap);
  if (SFX.bonus) SFX.bonus();   // a soft rising flourish as the three bubbles float up
  const speech = $("#well-speech"); if (speech) speech.innerHTML = `<b>Pop a bubble!</b> Whichever one you like…`;
  let revealed = false;
  wrap.querySelectorAll(".wbub2").forEach(b => b.addEventListener("click", () => {
    if (revealed) return; revealed = true;
    if (SFX.pop) SFX.pop(2);
    wrap.querySelectorAll(".wbub2").forEach(o => { if (o !== b) o.classList.add("fizz"); });
    b.classList.add("chosen");
    setTimeout(() => wellReveal(prize), 240);
  }));
}
function wellReveal(prize) {
  const info = grantWellPrize(prize);
  const bub = $("#well-bubbles2"); if (bub) bub.remove();
  const circle = $("#well-circle");
  if (circle) {
    const p = document.createElement("div"); p.className = "well-prize2" + (info.jackpot ? " jackpot" : "");
    p.innerHTML = `<div class="wp2-emoji">${info.emoji}</div><div class="wp2-label">${info.label}</div><div class="wp2-sub">${info.sub}</div>`;
    circle.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.classList.add("fade"); }, 2600);
    setTimeout(() => { if (p.parentNode) p.remove(); }, 3050);
  }
  syncHud("well");
  const chip = $(".well-dustchip"); if (chip) chip.innerHTML = wellDustChip();
  if (info.jackpot) { SFX.perfect(); wellConfetti(); }
  else if (prize.kind === "stardust") SFX.charm();
  else SFX.coin(0);
  const speech = $("#well-speech"); if (speech) speech.innerHTML = `Toss again whenever you like!`;
  const toss = $("#well-toss"); if (toss) { toss.textContent = "Toss 🪙" + BALANCE.WELL_COST; toss.disabled = GAME.gold < BALANCE.WELL_COST; }
  const back = $("#well-back"); if (back) back.disabled = false;
  wellBusy = false;
  // After the tutorial's free wish, Wishy has gone — settle the well into its normal layout
  // (Toss button down onto the cobblestones, Back centred) once the prize has been admired.
  if (wellTutorialLayout && GAME.wellIntro === 2) {
    wellTutorialLayout = false;
    if (toss) toss.disabled = true;   // no tossing during the brief settle
    setTimeout(() => { const sc = screen("well"); if (sc && sc.classList.contains("active")) renderWell(); }, 3200);
  }
}
function wellConfetti() {
  const sc = screen("well"); if (!sc) return;
  const layer = document.createElement("div"); layer.className = "confetti-layer";
  const cols = ["#ffd76a", "#ff6ea8", "#4fc96a", "#6a7bd6", "#ffe98a", "#e07be0", "#8fe9ff", "#c48bff"];
  for (let i = 0; i < 48; i++) {
    const p = document.createElement("i"); p.className = "confetti";
    p.style.left = (3 + (i * 37) % 94) + "%"; p.style.background = cols[i % cols.length];
    p.style.setProperty("--dx", (((i * 53) % 80) - 40) + "px");
    p.style.setProperty("--rot", ((i * 47) % 360) + "deg");
    p.style.animationDelay = ((i % 12) * 0.05).toFixed(2) + "s";
    p.style.animationDuration = (1.7 + (i % 5) * 0.22).toFixed(2) + "s";
    layer.appendChild(p);
  }
  sc.appendChild(layer); setTimeout(() => layer.remove(), 2600);
}

/* ======================================================================= */
/* WARDROBE — equip owned skins, or buy a specific one with Stardust        */
/* ======================================================================= */
function renderWardrobe() {
  const dustCost = BALANCE.STARDUST_SKIN_COST;
  const section = (kind, title) => {
    const tiles = D.COSMETICS[kind].map(c => {
      const owned = !!GAME.owned[c.id], equipped = GAME.equipped[kind] === c.id, ach = c.achievement, vil = c.villain, ball = c.ball, hunt = c.hunt, pearl = c.pearl;
      const hh = hunt ? huntFor(hunt) : null, hs = hunt ? huntState(hunt) : null;
      const special = ach || vil || ball || hunt; // earned, never bought with currency
      const canBuy = !owned && !special && !pearl && GAME.stardust >= dustCost;
      const canBuyPearl = !owned && pearl && (GAME.pearls || 0) >= pearl;
      const btn = equipped
        ? `<span class="skin-tag equipped">✓ On</span>`
        : owned
          ? `<button class="btn small good skin-equip" data-kind="${kind}" data-id="${c.id}">Wear</button>`
          : ach
            ? `<span class="skin-tag muted">🏆 ${Math.min(GAME.recycled, ach.need)}/${ach.need}</span>`
            : vil
              ? `<span class="skin-tag muted">👑 Beat a villain</span>`
              : ball
                ? `<span class="skin-tag muted">👠 Dazzle at the Ball</span>`
                : hunt
                  ? `<span class="skin-tag muted">${hh ? hh.itemEmoji : "🔎"} ${hs ? hs.found : 0}/${hh ? hh.need : "?"}</span>`
                  : pearl
                    ? `<button class="btn small ${canBuyPearl ? "" : "secondary"} skin-buy" data-id="${c.id}" ${canBuyPearl ? "" : "disabled"}>${PEARL} ${pearl}</button>`
                    : `<button class="btn small ${canBuy ? "" : "secondary"} skin-buy" data-id="${c.id}" ${canBuy ? "" : "disabled"}>✨${dustCost}</button>`;
      // achievement/villain/ball/hunt/pearl skins reveal their look; other unowned stay a mystery
      const revealed = owned || special || pearl;
      const chip = owned
        ? (kind === "familiar" ? buddyArt(c.id, "skin-art") : ART.tag("cauldron_" + c.id, c.chip, "skin-art"))
        : revealed ? c.chip : "❔";
      const nameShown = revealed ? c.name : "???";
      const hint = ach && !owned ? ach.desc : vil && !owned ? "Win a villain event" : ball && !owned ? "Dazzle Cinderella at the Royal Ball"
        : hunt && !owned ? `Find all of ${hh ? hh.char + "'s " + hh.item + "s" : "them"} while you play`
        : pearl && !owned ? "Rare — only Wishy’s pearls buy this" : "";
      return `<div class="skin-tile ${equipped ? "on" : ""} ${owned ? "" : "locked"} ${(special || pearl) && !owned ? "ach" : ""}">
        <div class="skin-chip">${chip}</div>
        <div class="skin-name">${nameShown}${hint ? `<div class="muted" style="font-size:10px;font-weight:600">${hint}</div>` : ""}</div>
        ${btn}</div>`;
    }).join("");
    return `<div class="card" style="margin-bottom:10px">
      <div style="font-weight:800;margin-bottom:8px">${title}</div>
      <div class="skin-grid">${tiles}</div></div>`;
  };
  html("wardrobe", `
    ${hud("My Skins")}
    <div class="rb-total" style="text-align:center;margin:2px 0 8px">✨ <b>${GAME.stardust}</b> Stardust${(GAME.pearls || 0) > 0 ? ` &nbsp;·&nbsp; ${PEARL} <b>${GAME.pearls}</b> Pearls` : ""} <span class="muted" style="font-size:12px">· Stardust buys most skins; ${PEARL} pearls buy the rare ones</span></div>
    <div class="grow" style="overflow-y:auto">
      ${section("cauldron", "🫕 Cauldron Skins")}
      ${section("familiar", "🐾 Pet Skins")}
    </div>
    <button class="btn secondary" id="ward-back">←  Back</button>
  `);
  $("#screen-wardrobe").querySelectorAll(".skin-equip").forEach(b => b.addEventListener("click", () => equipSkin(b.dataset.kind, b.dataset.id)));
  $("#screen-wardrobe").querySelectorAll(".skin-buy").forEach(b => b.addEventListener("click", () => buySkin(b.dataset.id)));
  on("#ward-back", "click", renderMenu);
  show("wardrobe");
}
function equipSkin(kind, id) {
  if (!GAME.owned[id]) return;
  GAME.equipped[kind] = id; save();
  const c = D.COSMETIC_BY_ID[id]; toast(`${c.chip} ${c.name} equipped!`);
  renderWardrobe();
}
function buySkin(id) {
  if (GAME.owned[id]) return;
  const cz = D.COSMETIC_BY_ID[id]; if (cz && cz.achievement) { toast(`🏆 Earn this one: ${cz.achievement.desc}!`); return; }
  if (cz && cz.villain) { toast("👑 Win it from a villain event!"); return; }
  if (cz && cz.ball) { toast("👠 Dazzle Cinderella at the Royal Ball to earn this!"); return; }
  if (cz && cz.hunt) { const hh = huntFor(cz.hunt); toast(`🔎 Find them all${hh ? ` — help ${hh.char}!` : ""}`); return; }
  if (cz && cz.pearl) {
    if ((GAME.pearls || 0) < cz.pearl) { toast(`Need ${cz.pearl} pearls — Wishy the Fish pays in those!`); return; }
    GAME.pearls -= cz.pearl; GAME.owned[id] = true; save();
    SFX.bigCoin && SFX.bigCoin();
    toast(`${PEARL} Bought ${cz.name}!`); renderWardrobe(); return;
  }
  const cost = BALANCE.STARDUST_SKIN_COST;
  if (GAME.stardust < cost) { toast("Not enough Stardust."); return; }
  GAME.stardust -= cost; GAME.owned[id] = true; save();
  const c = D.COSMETIC_BY_ID[id]; toast(`✨ Bought ${c.name}!`);
  renderWardrobe();
}

/* ======================================================================= */
/* RECYCLE — turn collected trash into coins or Stardust                    */
/* ======================================================================= */
function isBag(id) { const t = D.TRASH_BY_ID[id]; return !!(t && t.bag); }
function recycleTotal(mode) { return GAME.trash.reduce((s, id) => s + (mode === "dust" ? trashDust(id) : trashCoins(id)), 0); }
function renderRecycle(mode) {
  mode = mode === "dust" ? "dust" : "coins";
  const cap = BALANCE.TRASH_BIN_MAX, bin = GAME.trash;
  const slots = [];
  for (let i = 0; i < cap; i++) {
    const id = bin[i];
    if (!id) { slots.push(`<div class="trash-slot"></div>`); continue; }
    const t = D.TRASH_BY_ID[id];
    if (t.bag) {
      slots.push(`<button class="trash-slot filled bag" data-i="${i}" title="${t.name} — tap to open!">${trashArt(id, "trash-face")}<span class="bag-q">?</span></button>`);
    } else {
      const val = mode === "dust" ? trashDust(id) : trashCoins(id);
      slots.push(`<button class="trash-slot filled ${t.treasure ? "treasure" : ""}" data-i="${i}" title="${t.name} — ${t.treasure ? "cash in for" : "recycle for"} ${mode === "dust" ? "✨" : "🪙"}${val}">${trashArt(id, "trash-face")}</button>`);
    }
  }
  const total = recycleTotal(mode), cur = mode === "dust" ? `✨ ${total}` : `🪙 ${total}`;
  const nextAch = nextTrashAchievement();
  const achLine = nextAch
    ? `<div class="ach-bar"><div class="ach-top"><span>🏆 ${nextAch.chip} ${nextAch.name}</span><span class="muted">${Math.min(GAME.recycled, nextAch.achievement.need)}/${nextAch.achievement.need}</span></div>
        <div class="ach-track"><i style="width:${Math.min(100, GAME.recycled / nextAch.achievement.need * 100)}%"></i></div></div>`
    : `<div class="ach-bar muted" style="text-align:center">🏆 All recycling trophies earned — nice!</div>`;
  html("recycle", `
    ${hud("Recycle")}
    <div class="rb-total" style="text-align:center;margin:2px 0 6px">🗑️ Bin <b>${bin.length}/${cap}</b> · worth <b>${cur}</b> <span class="muted" style="font-size:12px">· ${GAME.recycled} recycled all‑time</span></div>
    ${achLine}
    <div class="row" style="justify-content:center;gap:8px;margin:8px 0 6px">
      <button class="btn small ${mode === "coins" ? "good" : "secondary"}" id="rc-coins">🪙 Coins</button>
      <button class="btn small ${mode === "dust" ? "good" : "secondary"}" id="rc-dust">✨ Stardust</button>
    </div>
    <div class="muted" style="text-align:center;font-size:12px;margin-bottom:8px">Tap a piece to recycle it. 🛍️ bags must be <b>opened</b> first — you never know!</div>
    <div class="grow" style="overflow-y:auto">${bin.length ? `<div class="trash-grid">${slots.join("")}</div>` : `<div class="muted center" style="height:100%">Your bin is empty!<br>Trash comes from customers whose wish you miss.</div>`}</div>
    <button class="btn good" id="rc-all" ${bin.length ? "" : "disabled"}>♻️ Recycle all → ${cur}</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="rc-back">←  Back</button>
  `);
  $("#screen-recycle").querySelectorAll(".trash-slot.filled").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.i; if (isBag(GAME.trash[i])) openBag(i, mode); else recycleOne(i, mode);
  }));
  on("#rc-coins", "click", () => renderRecycle("coins"));
  on("#rc-dust", "click", () => renderRecycle("dust"));
  on("#rc-all", "click", () => recycleAll(mode));
  on("#rc-back", "click", renderMenu);
  show("recycle");
}
function recycleOne(index, mode) {
  const id = GAME.trash[index]; if (id == null) return;
  const val = mode === "dust" ? trashDust(id) : trashCoins(id);
  if (mode === "dust") GAME.stardust += val; else GAME.gold += val;
  GAME.trash.splice(index, 1); GAME.recycled += 1; save();
  SFX.coin(0);
  if (!checkTrashAchievements()) renderRecycle(mode);
}
function recycleAll(mode) {
  const bags = GAME.trash.filter(isBag);            // unopened bags are kept, not recycled
  const recyclable = GAME.trash.filter(id => !isBag(id));
  if (!recyclable.length) { toast(bags.length ? "Open your bags first! 🛍️" : "No trash to recycle."); return; }
  const val = recyclable.reduce((s, id) => s + (mode === "dust" ? trashDust(id) : trashCoins(id)), 0);
  if (mode === "dust") GAME.stardust += val; else GAME.gold += val;
  GAME.recycled += recyclable.length; GAME.trash = bags; save();
  SFX.charm();
  toast(mode === "dust" ? `♻️ +${val} Stardust!` : `♻️ +${val} gold!`);
  if (!checkTrashAchievements()) renderRecycle(mode);
}
// Open a Crumpled Bag: usually more junk, rarely a Gold Ring. The revealed item
// takes the bag's slot (still recyclable / sellable from there).
function openBag(index, mode) {
  if (!isBag(GAME.trash[index])) return;
  SFX.unlock();
  const isRing = Math.random() < BALANCE.TRASH_RING_CHANCE;
  const newId = isRing ? "ring" : D.TRASH[Math.floor(Math.random() * D.TRASH.length)].id;
  GAME.trash[index] = newId; bumpStat("bags"); if (isRing) bumpStat("rings"); save();
  const nt = D.TRASH_BY_ID[newId];
  if (isRing) { SFX.charm(); confettiOver($("#app")); toast("🛍️ → 💍 A Gold Ring! Cash it in for a nice bonus."); }
  else { SFX.pop(1); toast(`🛍️ → ${nt.emoji} Just more junk (${nt.name}).`); }
  renderRecycle(mode);
}
// achievement cosmetics unlocked by lifetime recycling
function trashAchievements() { return allSkins().filter(c => c.achievement && c.achievement.stat === "recycled"); }
function nextTrashAchievement() {
  return trashAchievements().filter(c => !GAME.owned[c.id]).sort((a, b) => a.achievement.need - b.achievement.need)[0] || null;
}
// unlock any newly-earned achievements; returns true if one popped (it re-renders)
function checkTrashAchievements() {
  const earned = trashAchievements().filter(c => !GAME.owned[c.id] && GAME.recycled >= c.achievement.need);
  if (!earned.length) return false;
  earned.forEach(c => GAME.owned[c.id] = true); save();
  achievementPopup(earned[0]); // celebrate the first; any second waits for next visit
  return true;
}
function achievementPopup(c) {
  const app = $("#app"); if (!app) return;
  SFX.perfect(); confettiOver(app);
  const chip = c.kind === "familiar" ? buddyArt(c.id, "ach-chip") : ART.tag("cauldron_" + c.id, c.chip, "ach-chip");
  const ov = document.createElement("div"); ov.className = "confirm-overlay";
  ov.innerHTML = `<div class="confirm-card center" style="gap:10px">
    <div style="font-weight:900;font-size:14px;letter-spacing:1px;color:var(--gold)">🏆 ACHIEVEMENT UNLOCKED</div>
    <div class="ach-big">${chip}</div>
    <div style="font-weight:900;font-size:20px">${c.name}</div>
    <div class="muted">You recycled <b>${c.achievement.need}</b> pieces of junk! Equip it in 🎨 My Skins.</div>
    <button class="btn good small" id="ach-ok">Sweet!</button>
  </div>`;
  app.appendChild(ov);
  ov.querySelector("#ach-ok").addEventListener("click", () => { ov.remove(); renderRecycle("coins"); });
}
function confettiOver(host) {
  const layer = document.createElement("div"); layer.className = "confetti-layer";
  const cols = ["#ffd76a", "#ff6ea8", "#4fc96a", "#6a7bd6", "#ffe98a", "#e07be0", "#8fe9ff", "#c48bff"];
  for (let i = 0; i < 50; i++) {
    const p = document.createElement("i"); p.className = "confetti";
    p.style.left = (3 + (i * 37) % 94) + "%"; p.style.background = cols[i % cols.length];
    p.style.setProperty("--dx", (((i * 53) % 80) - 40) + "px");
    p.style.setProperty("--rot", ((i * 47) % 360) + "deg");
    p.style.animationDelay = ((i % 12) * 0.05).toFixed(2) + "s";
    p.style.animationDuration = (1.7 + (i % 5) * 0.22).toFixed(2) + "s";
    layer.appendChild(p);
  }
  host.appendChild(layer); setTimeout(() => layer.remove(), 2800);
}

/* ======================================================================= */
/* QUESTS (dailies + weeklies), win STREAK, and tracked STATS               */
/* ======================================================================= */
function weekKey() { return Math.floor(Date.now() / 86400000 / 7); } // integer week bucket
function questStat(stat) { return stat === "recycled" ? (GAME.recycled || 0) : (GAME.stats[stat] || 0); }
function bumpStat(stat, n) { GAME.stats[stat] = (GAME.stats[stat] || 0) + (n || 1); save(); }
function pickQuests(pool, n) {
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a.slice(0, n).map(t => ({ id: t.id, base: questStat(t.stat), claimed: false }));
}
// roll fresh quests when the day/week rolls over
function refreshQuests() {
  const q = GAME.quests, d = todayStr(), w = weekKey();
  let changed = false;
  if (q.day !== d || !q.daily || !q.daily.length) { q.day = d; q.daily = pickQuests(D.QUESTS.daily, 3); q.dailyBonus = false; changed = true; }
  if (q.week !== w || !q.weekly || !q.weekly.length) { q.week = w; q.weekly = pickQuests(D.QUESTS.weekly, 2); changed = true; }
  if (changed) save();
}
function questProgress(entry) {
  const t = D.QUEST_BY_ID[entry.id]; if (!t) return { t: null, prog: 0, done: false };
  const prog = Math.max(0, Math.min(t.goal, questStat(t.stat) - entry.base));
  return { t, prog, done: prog >= t.goal, claimable: prog >= t.goal && !entry.claimed };
}
function anyQuestClaimable() {
  refreshQuests();
  const list = [].concat(GAME.quests.daily || [], GAME.quests.weekly || []);
  if (list.some(e => questProgress(e).claimable)) return true;
  return (GAME.quests.daily || []).every(e => e.claimed) && (GAME.quests.daily || []).length > 0 && !GAME.quests.dailyBonus;
}
function grantReward(r) {
  if (!r) return "";
  const parts = [];
  if (r.gold) { GAME.gold += r.gold; parts.push(`🪙 ${r.gold}`); }
  if (r.keys) { GAME.keys = (GAME.keys || 0) + r.keys; parts.push(`🗝️ ${r.keys}`); }
  if (r.stardust) { GAME.stardust += r.stardust; parts.push(`✨ ${r.stardust}`); }
  if (r.treats) { GAME.treats += r.treats; parts.push(`🐸 ${r.treats}`); }
  return parts.join(" · ");
}
function claimQuest(kind, id) {
  const list = kind === "weekly" ? GAME.quests.weekly : GAME.quests.daily;
  const e = list.find(x => x.id === id); if (!e) return;
  const pr = questProgress(e); if (!pr.claimable) return;
  e.claimed = true; const got = grantReward(pr.t.reward); save();
  SFX.charm(); toast(`✅ Claimed! ${got}`);
  renderQuests();
}
function claimDailyBonus() {
  const daily = GAME.quests.daily || [];
  if (!daily.length || !daily.every(e => e.claimed) || GAME.quests.dailyBonus) return;
  GAME.quests.dailyBonus = true; const got = grantReward({ stardust: 25 }); save();
  SFX.perfect(); confettiOver($("#app")); toast(`🎉 All dailies done! ${got}`);
  renderQuests();
}
function renderQuests() {
  refreshQuests();
  const row = (kind, e) => {
    const { t, prog, claimable } = questProgress(e); if (!t) return "";
    const pct = Math.min(100, prog / t.goal * 100);
    const rw = [t.reward.gold ? `🪙${t.reward.gold}` : "", t.reward.stardust ? `✨${t.reward.stardust}` : "", t.reward.treats ? `🐸${t.reward.treats}` : ""].filter(Boolean).join(" ");
    const btn = e.claimed ? `<span class="skin-tag equipped">✓</span>`
      : claimable ? `<button class="btn small good q-claim" data-kind="${kind}" data-id="${e.id}">Claim</button>`
      : `<span class="q-rew muted">${rw}</span>`;
    return `<div class="quest-row ${claimable ? "ready" : ""}">
      <div class="q-emoji">${t.emoji}</div>
      <div class="q-body"><div class="q-desc">${t.desc}</div>
        <div class="q-track"><i style="width:${pct}%"></i></div>
        <div class="q-sub muted">${prog}/${t.goal}${e.claimed ? "" : " · " + rw}</div></div>
      ${btn}</div>`;
  };
  const daily = GAME.quests.daily || [], weekly = GAME.quests.weekly || [];
  const allDaily = daily.length && daily.every(e => e.claimed);
  const bonusRow = `<div class="quest-row ${allDaily && !GAME.quests.dailyBonus ? "ready" : ""}">
    <div class="q-emoji">🎁</div>
    <div class="q-body"><div class="q-desc">All 3 dailies done — bonus!</div><div class="q-sub muted">✨ 25 Stardust</div></div>
    ${GAME.quests.dailyBonus ? `<span class="skin-tag equipped">✓</span>` : allDaily ? `<button class="btn small good" id="q-bonus">Claim</button>` : `<span class="q-rew muted">${daily.filter(e => e.claimed).length}/3</span>`}</div>`;
  html("quests", `
    ${hud("Quests")}
    <div class="grow" style="overflow-y:auto">
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:8px">📅 Daily <span class="muted" style="font-weight:500;font-size:12px">· resets tomorrow</span></div>
        ${daily.map(e => row("daily", e)).join("")}
        ${bonusRow}
      </div>
      <div class="card">
        <div style="font-weight:800;margin-bottom:8px">🗓️ Weekly <span class="muted" style="font-weight:500;font-size:12px">· bigger rewards</span></div>
        ${weekly.map(e => row("weekly", e)).join("")}
      </div>
    </div>
    <button class="btn secondary" id="quests-back">←  Back</button>
  `);
  $("#screen-quests").querySelectorAll(".q-claim").forEach(b => b.addEventListener("click", () => claimQuest(b.dataset.kind, b.dataset.id)));
  on("#q-bonus", "click", claimDailyBonus);
  on("#quests-back", "click", renderMenu);
  show("quests");
}

/* --- win streak: consecutive happy customers boost PAY (never the Well) --- */
function streakBonusFor(streak) { return Math.min(Math.max(0, streak - 1), BALANCE.STREAK_BONUS_CAP) * BALANCE.STREAK_BONUS_PER; }
/* --- allergy-free streak: Stardust once you've cleanly granted MIN risky wishes in a row.
   3→5, 4→9, 5→13, … (escalating). Below MIN pays nothing. --- */
function cleanStreakDust(streak) {
  if (streak < BALANCE.CLEAN_STREAK_MIN) return 0;
  return BALANCE.CLEAN_STREAK_DUST_BASE + (streak - BALANCE.CLEAN_STREAK_MIN) * BALANCE.CLEAN_STREAK_DUST_STEP;
}

/* --- In-a-Rush customer: a patience clock across the round; serve in time for a
 * bonus, or they leave and you get nothing (and the streak breaks). ---------- */
function stopRoundTimers() {
  if (!ROUND) return;
  if (ROUND._mixTimer) { clearInterval(ROUND._mixTimer); ROUND._mixTimer = null; }
  if (ROUND._scoopIv) { clearInterval(ROUND._scoopIv); ROUND._scoopIv = null; }
  if (ROUND._rushTimer) { clearInterval(ROUND._rushTimer); ROUND._rushTimer = null; }
  const el = document.getElementById("rush-clock"); if (el) el.style.display = "none";
}
function startRushClock() {
  if (!ROUND || !ROUND.rush) return;
  if (ROUND._rushTimer) return;                 // already running (persists across phases)
  if (!ROUND.rushStart) ROUND.rushStart = Date.now();
  let el = document.getElementById("rush-clock");
  if (!el) { el = document.createElement("div"); el.id = "rush-clock"; $("#app").appendChild(el); }
  const paint = () => {
    const left = ROUND.rushMs - (Date.now() - ROUND.rushStart);
    if (left <= 0) { rushExpire(); return; }
    const s = Math.ceil(left / 1000), pct = Math.max(0, left / ROUND.rushMs * 100);
    el.innerHTML = `<span class="rc-lbl">⏱️ In a Rush — <b>${s}s</b></span><span class="rc-track"><i style="width:${pct}%"></i></span>`;
    el.classList.toggle("urgent", s <= 10);
  };
  el.style.display = "flex"; paint();
  ROUND._rushTimer = setInterval(paint, 200);
}
function rushExpire() {
  stopRoundTimers();
  GAME.streak = 0; save();                       // lost customer breaks the streak
  const c = ROUND.customer;
  html("result", `
    ${hud("Result")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">😾</div>
      <div class="result-title lose">Too Slow!</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>${c.name} got impatient</span><span class="muted">left!</span></div>
        <div class="stat-line"><span>Earned</span><span class="muted">nothing</span></div>
      </div>
      <p class="muted" style="max-width:300px">${c.name} couldn't wait and hurried off empty‑handed. No harm done — a fresh customer is on the way!</p>
    </div>
    <button class="btn" id="next-btn">Next Customer  →</button>
  `);
  on("#next-btn", "click", startRound);
  show("result");
}

/* ======================================================================= */
/* FAIRYTALE EVENTS — occasional interludes. First one: the Fairy's Match.   */
/* ======================================================================= */
// press-your-luck ladder: win a round, then bank or risk it for a bigger prize
const FAIRY_LADDER = [
  { reward: { gold: 45 },      label: "🪙 45" },
  { reward: { stardust: 25 },  label: "✨ 25" },
  { reward: { stardust: 60 },  label: "✨ 60" },
];
const FAIRY_SHOW = 5, FAIRY_NEED = 3, FAIRY_BASKETS = 6;
let fairyRung = 1;
// --- Realm event PLAYLIST: an authored recipe for each realm's story ------
// The story is seated in stone (guarantees the ball order, exactly one villain, no spam), while
// "house" slots stay a little random so runs aren't identical. Plan length = eventsNeeded − 1
// (the last slot is always reserved for the must-win finale). Tokens:
//   "ball"  → a Royal Ball; partner escalates knight → prince → cinderella by its order in the plan
//   "queen" → the Evil Queen villain round (falls back to a house event if you can't afford her)
//   "house" → a recurring "house" event (Mixing Duel / Fairy's Match / Bake-Off), no back-to-back repeats
//   "duel"/"fairy"/"cake" → that specific house event, if you want an exact seat
const REALM_EVENT_PLAN = {
  willow:    ["house", "house", "queen", "house"],                              // 4 story + 🐺 finale = 5
  courtyard: ["ball", "house", "queen", "ball", "wine", "ball", "boutique"],      // 3 balls (K/P/C) + Queen + Spilled Wine + house + Mouse Boutique + 🍗 finale = 8
};
let lastHouseEvent = null;
function houseEvent() {
  const all = [renderDuelIntro, renderFairyIntro, renderCakeIntro];
  const pool = all.filter(f => f !== lastHouseEvent);
  const pick = R.pick(pool.length ? pool : all);
  lastHouseEvent = pick; return pick;
}
function resolveEventToken(token, plan, idx) {
  if (token === "ball") {
    const ballNo = plan.slice(0, idx + 1).filter(t => t === "ball").length;   // 1st ball = knight, 2nd = prince, 3rd = cinderella
    const partner = ["knight", "prince", "cinderella"][ballNo - 1] || "cinderella";
    return () => renderDanceIntro(partner);
  }
  if (token === "queen") return GAME.gold >= QUEEN_PACKAGES[0].gold ? renderQueenIntro : houseEvent();
  if (token === "wine") return renderWineIntro;
  if (token === "boutique") return renderBoutiqueIntro;
  if (token === "duel") return renderDuelIntro;
  if (token === "fairy") return renderFairyIntro;
  if (token === "cake") return renderCakeIntro;
  return houseEvent();   // "house" or anything unrecognized
}
// Read-only preview of a realm's authored story sequence (for tooling/tests).
function eventPlanPreview(realmId) {
  const plan = REALM_EVENT_PLAN[realmId] || [];
  const seq = plan.map((token, idx) => {
    if (token === "ball") { const n = plan.slice(0, idx + 1).filter(t => t === "ball").length; return "ball:" + (["knight", "prince", "cinderella"][n - 1] || "cinderella"); }
    if (token === "queen") return GAME.gold >= QUEEN_PACKAGES[0].gold ? "queen" : "house(queen→fallback)";
    return token;
  });
  seq.push("FINALE");
  return seq;
}
function maybeEvent() {
  if (GAME.nextEventAt < 0) { GAME.nextEventAt = servedTotal + pacing("eventEvery", BALANCE.EVENT_EVERY); save(); return false; }
  if (servedTotal < GAME.nextEventAt) return false;
  GAME.nextEventAt = servedTotal + pacing("eventEvery", BALANCE.EVENT_EVERY); save();
  const realm = currentRealm(), need = realmEventsNeeded(realm.id), finale = realmFinale(realm.id);
  // FINALE: once the story events are done, the realm's must-win finale appears (drops a Realm Key).
  // It keeps re-appearing until you win it.
  if (need && finale && !realmFinaleWon(realm.id) && realmEventsCleared(realm.id) >= need - 1) {
    // First time the Willow finale comes due (and Red has warned us about the impostor),
    // play the bridge scene that connects the clues; it leads straight into the finale.
    if (realm.id === "willow" && !GAME.grandmaWolfSeen && GAME.storyStep >= 4) {
      GAME.grandmaWolfSeen = true; save(); playGrandmaWolf();
    } else {
      finale();
    }
    return true;
  }
  // otherwise the next authored story event (counts win-or-lose, capped at need-1)
  const cleared = realmEventsCleared(realm.id);
  const plan = REALM_EVENT_PLAN[realm.id] || [];
  const token = plan[cleared] || "house";   // out-of-plan realms fall back to a house event
  markRealmEventCleared();   // advances this realm's story (win or lose), reserving the finale slot
  resolveEventToken(token, plan, cleared)();
  return true;
}
function renderFairyIntro() {
  fairyRung = 1;
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("A Visitor!")}
    <div class="grow center" style="gap:16px">
      <div class="ph big">🧚</div>
      <div style="font-weight:800;font-size:20px">Fairy Godmother</div>
      <div class="speech">“Sort my ingredients into their magic, dearie — get <b>3 of 5</b> right and I'll reward you. Feeling lucky? Keep going for more!”</div>
      <div class="muted" style="max-width:300px">Tap an ingredient, then tap the magic it belongs to. <b>Any one</b> of its magics counts.</div>
    </div>
    <button class="btn good" id="fairy-play">✨ Play</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="fairy-skip">Not now</button>
  `);
  on("#fairy-play", "click", () => renderFairy());
  on("#fairy-skip", "click", startRound);
  show("event");
}
function renderFairy() {
  const pool = realmIngredients().slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  const picks = pool.slice(0, FAIRY_SHOW);
  // baskets: each pick's MAIN magic guaranteed (so always solvable), then fill to 6
  const baskets = [];
  picks.forEach(p => { if (!baskets.includes(p.qualities[0])) baskets.push(p.qualities[0]); });
  picks.forEach(p => p.qualities.slice(1).forEach(q => { if (baskets.length < FAIRY_BASKETS && !baskets.includes(q)) baskets.push(q); }));
  const realmMagics = currentRealm().magics || D.MAGIC_TYPES; // fill from the current realm's magic universe
  const others = realmMagics.filter(m => !baskets.includes(m));
  while (baskets.length < FAIRY_BASKETS && others.length) baskets.push(others.splice(Math.floor(Math.random() * others.length), 1)[0]);
  for (let i = baskets.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = baskets[i]; baskets[i] = baskets[j]; baskets[j] = t; }

  let selected = null, placed = 0, correct = 0;
  const cur = FAIRY_LADDER[fairyRung - 1];
  html("event", `
    ${hud("Fairy's Game")}
    <div style="text-align:center;font-weight:800;margin-bottom:2px">Round ${fairyRung} · Prize <span class="gold">${cur.label}</span> <span class="muted" style="font-weight:500;font-size:12px">· need ${FAIRY_NEED}/5</span></div>
    <div class="muted" style="text-align:center;font-size:12px;margin-bottom:8px">Tap an ingredient, then its magic basket.</div>
    <div class="fairy-baskets" id="fairy-baskets">${baskets.map(m => `<button class="fbasket" data-m="${m}">${magicDot(m)}<span>${m}</span></button>`).join("")}</div>
    <div class="fairy-status muted" id="fairy-status" style="text-align:center;min-height:22px;margin:10px 0">Placed 0/5 · 0 correct</div>
    <div class="fairy-tray" id="fairy-tray">${picks.map((p, i) => `<button class="ftile" data-i="${i}"><div class="emoji">${ingArt(p.id)}</div><div class="nm">${p.name}</div></button>`).join("")}</div>
    <div id="fairy-foot" style="margin-top:auto"></div>
  `);
  const tiles = [...document.querySelectorAll("#fairy-tray .ftile")];
  const status = () => { const s = $("#fairy-status"); if (s) s.textContent = `Placed ${placed}/5 · ${correct} correct`; };
  tiles.forEach(t => t.addEventListener("click", () => { if (t.classList.contains("done")) return; selected = +t.dataset.i; tiles.forEach(x => x.classList.toggle("sel", x === t)); }));
  document.querySelectorAll("#fairy-baskets .fbasket").forEach(bk => bk.addEventListener("click", () => {
    if (selected == null) { toast("Tap an ingredient first."); return; }
    const ing = picks[selected], ok = ing.qualities.includes(bk.dataset.m), tile = tiles[selected];
    tile.classList.add("done", ok ? "ok" : "bad"); tile.classList.remove("sel");
    tile.querySelector(".nm").innerHTML = (ok ? "✓ " : "✗ ") + ing.name + `<div class="qd">${ing.qualities.map(q => magicDot(q)).join("")}</div>`;
    SFX.pop(ok ? 3 : 0); if (ok) correct++; placed++; selected = null; status();
    if (placed >= FAIRY_SHOW) finishFairyRung(correct, cur);
  }));
  show("event");
}
function finishFairyRung(correct, cur) {
  const foot = $("#fairy-foot"); if (!foot) return;
  if (correct >= FAIRY_NEED) {
    const isMax = fairyRung >= FAIRY_LADDER.length, next = isMax ? null : FAIRY_LADDER[fairyRung];
    SFX.reveal("charm");
    foot.innerHTML = `<div class="fairy-result win">✨ ${correct}/5 — you win ${cur.label}!</div>
      ${isMax ? `<button class="btn good" id="fairy-collect">Collect ${cur.label}</button>`
        : `<button class="btn good" id="fairy-bank">Bank ${cur.label}</button><div style="height:8px"></div>
           <button class="btn" id="fairy-risk">Risk it → ${next.label}</button>`}`;
    on("#fairy-collect", "click", () => fairyPayout(cur.reward));
    on("#fairy-bank", "click", () => fairyPayout(cur.reward));
    on("#fairy-risk", "click", () => { fairyRung++; renderFairy(); });
  } else {
    foot.innerHTML = `<div class="fairy-result lose">😅 Only ${correct}/5 — not quite!${fairyRung > 1 ? " You risked the prize and lost it." : ""}</div>
      <button class="btn" id="fairy-done">Off we go →</button>`;
    on("#fairy-done", "click", startRound);
  }
}
function fairyPayout(reward) {
  const got = grantReward(reward); save();
  SFX.charm(); confettiOver($("#app"));
  toast(`✨ ${got}!`);
  startRound();
}

/* ======================================================================= */
/* DUEL — draft ingredients from a shared pool; closest to all-green wins.   */
/* ======================================================================= */
let DUEL = null;
const DUEL_POOL = 16, DUEL_MISTAKE = 0.4;
const DUEL_WIN = { gold: 80, stardust: 15 }, DUEL_DRAW = { gold: 30 }, DUEL_PER_NEED = 2;
const DUEL_TAUNTS = ["Bet I brew a better potion than you!", "Loser buys the sprinkles!", "Prepare to be out‑mixed!", "My greens will be greener!"];
function duelWish() {
  const w = generateWish(R.pick(realmCustomers()), "hard", false); // 3 needs
  w.allergy = null; w.allergy2 = null;
  return w;
}
function setupDuel() {
  const challenger = R.pick(realmCustomers());
  const you = { wish: duelWish(), slots: [] }, ai = { wish: duelWish(), slots: [] };
  // you can't see the ingredients' magic, so at least show all three of YOUR needs
  you.wish.needs.forEach(n => n.revealed = true);
  // Build a FAIR shared pool: seed several primary-match ingredients for EVERY
  // need on BOTH sides so each mixer actually has enough of what they need to
  // build green bars, then fill the rest with variety.
  const pool = [];
  const RSET = realmIngredients();
  const addFor = type => { const s = RSET.filter(i => i.qualities[0] === type); if (s.length) pool.push(R.pick(s).id); };
  [you, ai].forEach(side => side.wish.needs.forEach(n => { for (let k = 0; k < DUEL_PER_NEED; k++) addFor(n.type); }));
  while (pool.length < DUEL_POOL) pool.push(R.pick(RSET).id);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  DUEL = { challenger, you, ai, pool: pool.slice(0, DUEL_POOL), turn: "you", first: "you", over: false, line: R.pick(DUEL_TAUNTS) };
}
function renderDuelIntro() {
  SFX.unlock(); SFX.fanfare();
  setupDuel();
  const c = DUEL.challenger;
  html("event", `
    ${hud("A Challenger!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${custArt(c, "cust-big")}</div>
      <div style="font-weight:800;font-size:20px">${c.name} challenges you!</div>
      <div class="speech">“${DUEL.line}”</div>
      <div class="muted" style="max-width:310px">A <b>mixing duel</b>! Draft ingredients from the shared pile — whoever lands their three bars <b>closest to green</b> wins. Rock‑Paper‑Scissors for who drafts first!</div>
      <div class="rps-row">
        <button class="rps-btn" data-rps="rock">🪨</button>
        <button class="rps-btn" data-rps="paper">📄</button>
        <button class="rps-btn" data-rps="scissors">✂️</button>
      </div>
      <div id="rps-out" class="muted" style="min-height:44px"></div>
    </div>
    <button class="btn secondary" id="duel-skip">Not now</button>
  `);
  document.querySelectorAll(".rps-btn").forEach(b => b.addEventListener("click", () => duelRPS(b.dataset.rps)));
  on("#duel-skip", "click", startRound);
  show("event");
}
function duelRPS(you) {
  const opts = ["rock", "paper", "scissors"], em = { rock: "🪨", paper: "📄", scissors: "✂️" };
  const ai = R.pick(opts);
  const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
  const out = $("#rps-out"); if (!out) return;
  let verdict, first;
  if (you === ai) { verdict = "Tie — throw again!"; first = null; }
  else if (beats[you] === ai) { verdict = "You win the throw — you draft first!"; first = "you"; }
  else { verdict = `${DUEL.challenger.name} wins the throw — they draft first.`; first = "ai"; }
  SFX.pop(2);
  out.innerHTML = `You ${em[you]} vs ${em[ai]} ${DUEL.challenger.name}<br><b>${verdict}</b>${first ? `<br><button class="btn good small" id="duel-begin" style="margin-top:8px">Begin!</button>` : ""}`;
  if (first) { DUEL.first = first; DUEL.turn = first; on("#duel-begin", "click", () => { renderDuel(); if (first === "ai") setTimeout(duelAiTurn, 700); }); }
}
function duelMeter(s, hide, magicType, revealed) {
  const MAX = BALANCE.BAR_MAX, inBand = s.pct === 100, over = s.points > s.bandHigh;
  const fillPct = Math.min(100, s.points / MAX * 100);
  const bandLeft = Math.max(0, s.bandLow / MAX * 100), bandW = Math.max(2, (s.bandHigh - s.bandLow) / MAX * 100);
  const col = inBand ? "var(--good)" : over ? "var(--bad)" : (hide ? "var(--purple)" : D.MAGIC[magicType]);
  const lbl = hide ? "❔" : (revealed ? magicType : "❔");
  return `<div class="duel-meter"><span class="dm-lbl">${inBand ? "✓ green" : lbl}</span>
    <div class="meter sweet ${inBand ? "hit" : ""}"><span class="band" style="left:${bandLeft}%;width:${bandW}%"></span><i style="width:${fillPct}%;background:${col}"></i></div></div>`;
}
function duelBars(side) {
  const d = DUEL[side], sc = scoreMix(d.slots, d.wish, 0), hide = side === "ai";
  return d.wish.needs.map((n, i) => duelMeter(sc.perNeed[i], hide, n.type, n.revealed)).join("");
}
function renderDuel() {
  const c = DUEL.challenger, yours = DUEL.turn === "you" && !DUEL.over;
  const poolTiles = DUEL.pool.map((id, i) => `<button class="duel-tile ${yours ? "" : "off"}" data-i="${i}">${ingArt(id)}<span>${D.INGREDIENT_BY_ID[id].name}</span></button>`).join("");
  html("event", `
    ${hud("Mixing Duel")}
    <div class="duel-side foe">
      <div class="duel-name">${custArt(c)} ${c.name} ${DUEL.turn === "ai" && !DUEL.over ? `<span class="duel-think">…choosing</span>` : ""}</div>
      ${duelBars("ai")}
    </div>
    <div class="duel-pool-wrap grow">
      <div class="duel-turn ${yours ? "you" : "foe"}">${DUEL.over ? "" : yours ? "👇 Your pick — tap an ingredient" : `${c.name} is drafting…`}</div>
      <div class="duel-pool">${DUEL.pool.length ? poolTiles : `<div class="muted">Pile's empty!</div>`}</div>
    </div>
    <div class="duel-side mine">
      <div class="duel-name">🧑‍🍳 You <span class="muted" style="font-size:12px">· main: ${magicDot(DUEL.you.wish.needs[0].type)} ${DUEL.you.wish.needs[0].type}</span></div>
      ${duelBars("you")}
    </div>
    <button class="btn ${yours ? "good" : "secondary"}" id="duel-done" ${yours ? "" : "disabled"}>Done — score it!</button>
  `);
  if (yours) document.querySelectorAll(".duel-tile").forEach(t => t.addEventListener("click", () => duelYouPick(+t.dataset.i)));
  on("#duel-done", "click", duelResolve);
  show("event");
}
function duelYouPick(idx) {
  if (DUEL.turn !== "you" || DUEL.over) return;
  const id = DUEL.pool.splice(idx, 1)[0]; DUEL.you.slots.push({ id, potent: false });
  // reveal any of your mystery needs the played ingredient's main magic matches
  const main = D.INGREDIENT_BY_ID[id].qualities[0];
  DUEL.you.wish.needs.forEach(n => { if (!n.revealed && n.type === main) n.revealed = true; });
  SFX.pop(3);
  if (!DUEL.pool.length) { duelResolve(); return; }
  DUEL.turn = "ai"; renderDuel(); setTimeout(duelAiTurn, 700);
}
function duelAiTurn() {
  if (!DUEL || DUEL.over || DUEL.turn !== "ai") return;
  const d = DUEL.ai, base = scoreMix(d.slots, d.wish, 0).weighted;
  const ranked = DUEL.pool.map((id, idx) => ({ idx, gain: scoreMix(d.slots.concat([{ id, potent: false }]), d.wish, 0).weighted - base })).sort((a, b) => b.gain - a.gain);
  let pick = ranked[0].idx;
  if (Math.random() < DUEL_MISTAKE && ranked.length > 1) pick = ranked[1 + Math.floor(Math.random() * Math.min(2, ranked.length - 1))].idx; // beatable: sometimes not optimal
  const id = DUEL.pool.splice(pick, 1)[0]; d.slots.push({ id, potent: false });
  SFX.pop(1);
  if (!DUEL.pool.length) { duelResolve(); return; }
  DUEL.turn = "you"; renderDuel();
}
function duelResolve() {
  if (DUEL.over) return; DUEL.over = true;
  const you = scoreMix(DUEL.you.slots, DUEL.you.wish, 0).weighted;
  const ai = scoreMix(DUEL.ai.slots, DUEL.ai.wish, 0).weighted;
  const c = DUEL.challenger;
  const win = you > ai, draw = you === ai;
  const reward = win ? DUEL_WIN : draw ? DUEL_DRAW : null;
  const got = reward ? grantReward(reward) : ""; save();
  if (win) { SFX.perfect(); confettiOver($("#app")); } else if (draw) SFX.charm(); else SFX.sneeze();
  html("event", `
    ${hud("Duel Result")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${win ? "🏆" : draw ? "🤝" : "😅"}</div>
      <div class="result-title ${win ? "win" : "lose"}">${win ? "You win the duel!" : draw ? "A draw!" : `${c.name} wins!`}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>🧑‍🍳 You — closest to green</span><span><b>${you}%</b></span></div>
        <div class="stat-line"><span>${custArt(c)} ${c.name}</span><span><b>${ai}%</b></span></div>
        ${reward ? `<div class="stat-line"><span>Prize</span><span class="gold">${got}</span></div>` : `<div class="stat-line"><span>Prize</span><span class="muted">better luck next time!</span></div>`}
      </div>
      <p class="muted" style="max-width:300px">${win ? "Your potion was the greenest in the land! 🌿" : draw ? "Dead even — a rematch is surely coming." : "So close! You'll get them next time."}</p>
    </div>
    <button class="btn" id="duel-next">Next Customer  →</button>
  `);
  on("#duel-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* RUMPELSTILTSKIN — when the trash bin is full, the imp offers to spin      */
/* your "straw" into gold across escalating rounds. Each round the golden    */
/* band shrinks and the wheel spins faster; land it to bank gold and press   */
/* on. Spin at least RUMPEL_TARGET gold and he pays out (bin emptied); fall  */
/* short and you owe him a fee.                                              */
/* ======================================================================= */
let RUMPEL = null;
const RUMPEL_TARGET = 150;   // gold you must spin to win the deal
const RUMPEL_FEE = 100;      // what you owe if you fall short
const RUMPEL_LINES = [
  "Straw into gold, that's my trade! The more you spin, the more I pay — but each round is trickier.",
  "A brimming bin of straw! Keep landing my wheel on the gold and you'll be rich… if you're quick enough!",
  "Tsk, so much straw going to waste. Spin enough gold and it's yours — fall short and you'll owe me!"
];
// Difficulty per round — the gold arc (the hit window) SHRINKS and the wheel spins FASTER.
function rumpelArc(r)    { return Math.max(9, 50 - 6 * r); }   // gold arc HALF-angle, degrees
function rumpelSpeed(r)  { return 120 + 34 * r; }              // wheel spin, degrees/sec
function rumpelReward(r) { return 12 + 9 * r; }               // gold for landing round r (small early → more rounds to win)
// Wheel geometry, measured from the trimmed art (1027×1188 canvas).
const SW = { cx: 428, cy: 426.5, rIn: 306, rOut: 352, vw: 1027, vh: 1188 };
// Build an annular-sector (curved gold bar) path centred on due-south (the arrow), spanning ±half°.
function swArcPath(half) {
  const rad = d => d * Math.PI / 180;
  const P = (r, d) => [ +(SW.cx + r * Math.cos(rad(d))).toFixed(1), +(SW.cy + r * Math.sin(rad(d))).toFixed(1) ];
  const s = 90 - half, e = 90 + half, big = (2 * half) > 180 ? 1 : 0;
  const [x1,y1]=P(SW.rOut,s), [x2,y2]=P(SW.rOut,e), [x3,y3]=P(SW.rIn,e), [x4,y4]=P(SW.rIn,s);
  return `M${x1} ${y1} A${SW.rOut} ${SW.rOut} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${SW.rIn} ${SW.rIn} 0 ${big} 0 ${x4} ${y4} Z`;
}
function maybeJunkRound() {
  const full = GAME.trash.length >= BALANCE.TRASH_BIN_MAX;
  if (!full) { if (GAME.rumpelSeen) { GAME.rumpelSeen = false; save(); } return false; }
  if (GAME.rumpelSeen) return false;     // already offered while the bin is full — don't nag
  GAME.rumpelSeen = true;
  const goblin = !!GAME.goblinTurn; GAME.goblinTurn = !GAME.goblinTurn; save(); // swap back and forth
  if (goblin) renderGoblinIntro(); else renderRumpelIntro();
  return true;
}
// Rumpelstiltskin's story-mode card — same format as Little Red's scenes (character standing in
// the scene, name plate + speech at the bottom), set in his blurred house.
function rumpelCard(fig, speech, terms, buttons) {
  const v = "?v=" + BUILD;
  return `
    <div class="story-card mg-fullbleed">
      <div class="story-bg" style="background-image:url('art/rumpel_bg.webp${v}');background-position:center bottom"></div>
      <div class="story-scrim"></div>
      <div class="story-figure rumpel ${fig}"><img class="story-face" src="art/rumpel_${fig}.webp${v}" alt="Rumpelstiltskin" draggable="false"></div>
      <div class="story-below">
        <div class="story-name">Rumpelstiltskin</div>
        <div class="story-speech">${speech}</div>
        ${terms ? `<div class="rumpel-terms">${terms}</div>` : ""}
        <div class="rumpel-btns">${buttons}</div>
      </div>
    </div>`;
}
function renderRumpelIntro() {
  SFX.unlock(); SFX.fanfare();
  const line = R.pick(RUMPEL_LINES);
  const terms = `🌾 ${GAME.trash.length} straw · 🪙${RUMPEL_TARGET} to win · miss → 🪙${RUMPEL_FEE} fee`;
  const buttons = `
    <button class="btn good" id="rumpel-play">🎡 Spin the wheel!</button>
    <button class="btn secondary" id="rumpel-skip">Not now</button>`;
  html("event", rumpelCard("deal", `“${line}”`, terms, buttons));
  on("#rumpel-play", "click", () => { RUMPEL = { round: 0, tally: 0 }; renderRumpelRound(); });
  on("#rumpel-skip", "click", startRound);
  show("event");
}
function renderRumpelRound() {
  const r = RUMPEL.round, half = rumpelArc(r), speed = rumpelSpeed(r);
  // start the wheel at a random angle so the gold isn't already sitting on the arrow
  const theta0 = 45 + Math.random() * 270;
  Object.assign(RUMPEL, { half, speed, theta: theta0, raf: null, done: false, last: null });
  const reached = RUMPEL.tally >= RUMPEL_TARGET, v = "?v=" + BUILD;
  html("event", `
    ${hud("Spin the Wheel!")}
    <div class="rumpel-scene mg-fullbleed">
      <div class="rumpel-world">
        <img class="rumpel-bg" src="art/rumpel_bg.webp${v}" alt="" draggable="false">
        <div class="sw-stage">
          <img class="sw-stand" src="art/spinwheel_stand.webp${v}" alt="" draggable="false">
          <div class="sw-spin" id="sw-spin" style="transform:rotate(${theta0}deg)">
            <svg class="sw-color" viewBox="0 0 ${SW.vw} ${SW.vh}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <path d="${swArcPath(half)}" fill="#ffce3a" stroke="#a9690f" stroke-width="4"></path>
            </svg>
            <img class="sw-wheel" src="art/spinwheel_wheel.webp${v}" alt="" draggable="false">
          </div>
          <img class="sw-arrow" src="art/spinwheel_arrow.webp${v}" alt="" draggable="false">
        </div>
      </div>
      <div class="rumpel-stats">
        <div class="rumpel-stat">Round ${r + 1} · land it for <b class="gold">🪙${rumpelReward(r)}</b></div>
        <div class="rumpel-stat sub">${reached
          ? `Spun: <b class="gold">🪙${RUMPEL.tally}</b> · <b style="color:#7ee0a0">deal won ✓ — keep going for more!</b>`
          : `Spun so far: <b class="gold">🪙${RUMPEL.tally}</b> / need 🪙${RUMPEL_TARGET}`}</div>
      </div>
      <div class="rumpel-bottom">
        <div class="rumpel-hint">Tap <b>Stop!</b> when the <b class="gold">gold</b> reaches the arrow at the bottom</div>
        <button class="btn good rumpel-stop-btn" id="rumpel-stop">🛑 Stop!</button>
      </div>
    </div>
  `);
  on("#rumpel-stop", "click", rumpelStop);
  show("event");
  const spin = document.getElementById("sw-spin");
  const step = ts => {
    if (!RUMPEL || RUMPEL.done) return;
    if (!document.getElementById("sw-spin")) { RUMPEL = null; return; } // left the screen
    if (RUMPEL.last == null) RUMPEL.last = ts;
    const dt = (ts - RUMPEL.last) / 1000; RUMPEL.last = ts;
    RUMPEL.theta += RUMPEL.speed * dt;
    if (spin) spin.style.transform = "rotate(" + RUMPEL.theta + "deg)";
    RUMPEL.raf = requestAnimationFrame(step);
  };
  RUMPEL.raf = requestAnimationFrame(step);
}
function rumpelStop() {
  if (!RUMPEL || RUMPEL.done) return;
  RUMPEL.done = true;
  if (RUMPEL.raf) cancelAnimationFrame(RUMPEL.raf);
  // the gold sits at (south + theta); the arrow is at south — so the miss distance is theta itself
  const d = ((RUMPEL.theta % 360) + 360) % 360;
  const off = Math.min(d, 360 - d);          // degrees between the gold's centre and the arrow
  const hit = off <= RUMPEL.half;
  if (!hit) { SFX.sneeze(); renderRumpelTally(); return; }   // a miss ends the run — the tally decides win/lose
  // Landed it — bank the gold and roll straight into the next spin. You keep spinning (racking up
  // more and more) until you finally miss; reaching the target just means the deal's already won.
  const reward = rumpelReward(RUMPEL.round);
  RUMPEL.tally += reward;
  RUMPEL.round += 1;
  SFX.coin();
  rumpelPlusFlash(reward);
  setTimeout(renderRumpelRound, 850);
}
// A little "🪙 +X" that floats up over the wheel when you land a spin (feedback without a full screen).
function rumpelPlusFlash(amt) {
  const host = document.querySelector(".rumpel-scene") || document.getElementById("app");
  if (!host) return;
  const f = document.createElement("div"); f.className = "rumpel-plus"; f.textContent = "🪙 +" + amt;
  host.appendChild(f); setTimeout(() => { if (f.parentNode) f.remove(); }, 1000);
}
function renderRumpelTally() {
  const strawCount = GAME.trash.length;
  const win = RUMPEL.tally >= RUMPEL_TARGET;
  let speech, terms;
  if (win) {
    GAME.gold += RUMPEL.tally;
    GAME.trash = GAME.trash.filter(isBag);   // spin the junk into gold, but keep unopened bags
    save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    speech = `“The wheel slips at last — but you'd already spun the straw to <b class="gold">gold!</b> <b class="gold">🪙${RUMPEL.tally}</b> is yours, fair and square. Hee hee!”`;
    terms = `🌾 ${strawCount} straw spun away · 🪙 +${RUMPEL.tally}`;
  } else {
    const fee = Math.min(RUMPEL_FEE, GAME.gold);
    GAME.gold -= fee; save();
    SFX.sneeze();
    speech = `“Not enough, not enough! Your straw stays in my bin… and that's <b>🪙${fee}</b> for my trouble. Hee hee hee!”`;
    terms = `🪙 ${RUMPEL.tally}/${RUMPEL_TARGET} spun · fee 🪙${fee}`;
  }
  RUMPEL = null;
  const fig = win ? "gold" : "fume";
  html("event", rumpelCard(fig, speech, terms, `<button class="btn" id="rumpel-next">Next Customer  →</button>`));
  on("#rumpel-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* GRIBBLE THE GOBLIN — the other junk visitor. He barks out a piece of junk */
/* he wants (a new one every couple seconds); feed him the matching junk from */
/* your bin. Sometimes he asks for something you don't have — say so! Keep him */
/* happy enough by the end and he pays out (eating the junk you fed him).     */
/* ======================================================================= */
let GOBLIN = null;
const GOB_REQUESTS = 12;     // how many things he demands
const GOB_MS = 2200;         // time per demand
const GOB_FAKE = 0.30;       // chance he asks for something you DON'T have
const GOB_TARGET = 55;       // happiness needed for a happy, paying goblin
const GOB_D = { correct: 14, goodpass: 10, miss: -6, wrong: -12, badpass: -12 };
const GOB_LINES = [
  "Grubs and grimeys! I'm STARVING. Feed me your junk — but only what I ask for, in order!",
  "Gribble hungry! Give me the exact bit I point at. Quick quick, before I get grumpy!",
  "Ooh, a full bin! Feed me piece by piece — get it right and I'll pay you in shinies!"
];
function goblinHaveTypes() {
  const set = {}; GAME.trash.forEach(id => { if (!isBag(id)) set[id] = true; });
  return Object.keys(set);
}
function goblinPickWant() {
  const have = goblinHaveTypes();
  const missing = D.TRASH.map(t => t.id).filter(id => !have.includes(id));
  if (missing.length && Math.random() < GOB_FAKE) return R.pick(missing); // a fake-out he knows you lack
  if (have.length) return R.pick(have);
  return null; // nothing left to eat
}
function goblinConsume(id) { const i = GAME.trash.indexOf(id); if (i >= 0) { GAME.trash.splice(i, 1); save(); } }
function renderGoblinIntro() {
  SFX.unlock(); SFX.fanfare();
  const line = R.pick(GOB_LINES);
  html("event", `
    ${hud("A Hungry Goblin!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🧌</div>
      <div style="font-weight:800;font-size:20px">Gribble the Goblin</div>
      <div class="speech">“${line}”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>He'll ask for</span><span>${GOB_REQUESTS} bits of junk</span></div>
        <div class="stat-line"><span>Feed the right one</span><span class="gold">keep him happy 😋</span></div>
        <div class="stat-line"><span>Wrong one / no answer</span><span style="color:var(--bad)">he sulks 😠</span></div>
        <div class="stat-line"><span>Happy at the end</span><span class="gold">🪙 payout!</span></div>
      </div>
      <div class="muted" style="max-width:300px">He points at a piece of junk every couple seconds. Tap the <b>matching junk</b> in your bin — or tap <b>“I don't have it!”</b> when he asks for something you're missing.</div>
    </div>
    <button class="btn good" id="gob-play">😋 Feed him!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="gob-skip">Not now</button>
  `);
  on("#gob-play", "click", () => { GOBLIN = { happy: 0, correct: 0, done: 0, want: null, answered: true, timer: null, cdTimer: null, feedback: null }; goblinCountdown(); });
  on("#gob-skip", "click", startRound);
  show("event");
}
function goblinCountdown() {
  let n = 3;
  const tick = () => {
    if (!GOBLIN) return;
    html("event", `
      ${hud("Get Ready!")}
      <div class="grow center" style="gap:18px">
        <div class="gob-face" style="font-size:76px">🧌</div>
        <div style="font-weight:800;font-size:18px">Gribble is getting hungry…</div>
        <div class="gob-count-big ${n === 0 ? "go" : ""}">${n > 0 ? n : "Go!"}</div>
      </div>
    `);
    show("event");
    SFX.pop(n > 0 ? 1 : 3);
    if (n > 0) { n--; GOBLIN.cdTimer = setTimeout(tick, 800); }
    else { GOBLIN.cdTimer = setTimeout(() => { if (GOBLIN) goblinRequest(); }, 450); }
  };
  tick();
}
function goblinRequest() {
  const want = goblinPickWant();
  if (!want) { goblinFinish(); return; }   // bin's out of edible junk
  GOBLIN.want = want; GOBLIN.answered = false;
  renderGoblin();
  GOBLIN.timer = setTimeout(() => { if (GOBLIN && !GOBLIN.answered) goblinResolve("miss"); }, GOB_MS);
}
function goblinResolve(kind) {
  if (!GOBLIN || GOBLIN.answered) return;
  GOBLIN.answered = true;
  if (GOBLIN.timer) { clearTimeout(GOBLIN.timer); GOBLIN.timer = null; }
  if (kind === "correct") { GOBLIN.correct++; goblinConsume(GOBLIN.want); }
  GOBLIN.happy = Math.max(0, Math.min(100, GOBLIN.happy + (GOB_D[kind] || 0)));
  GOBLIN.done++;
  GOBLIN.feedback = { kind, delta: GOB_D[kind] || 0 };
  SFX[kind === "correct" ? "coin" : kind === "goodpass" ? "charm" : "sneeze"]();
  if (GOBLIN.done >= GOB_REQUESTS) goblinFinish(); else goblinRequest();
}
function goblinFeed(id) { if (!GOBLIN || GOBLIN.answered) return; goblinResolve(id === GOBLIN.want ? "correct" : "wrong"); }
function goblinPass() { if (!GOBLIN || GOBLIN.answered) return; goblinResolve(GAME.trash.indexOf(GOBLIN.want) >= 0 ? "badpass" : "goodpass"); }
function renderGoblin() {
  const wantT = D.TRASH_BY_ID[GOBLIN.want];
  const counts = {}; GAME.trash.forEach(id => { if (!isBag(id)) counts[id] = (counts[id] || 0) + 1; });
  const tiles = Object.keys(counts).map(id =>
    `<button class="gob-tile" data-id="${id}">${trashArt(id, "trash-face")}<span class="gob-count">×${counts[id]}</span></button>`).join("");
  const fb = GOBLIN.feedback;
  const fbTxt = !fb ? "Feed him what he points at!"
    : fb.kind === "correct" ? `<span style="color:var(--good)">Yum! +${fb.delta}</span>`
    : fb.kind === "goodpass" ? `<span style="color:var(--good)">Good call! +${fb.delta}</span>`
    : fb.kind === "miss" ? `<span style="color:var(--bad)">Too slow! ${fb.delta}</span>`
    : `<span style="color:var(--bad)">Nope! ${fb.delta}</span>`;
  html("event", `
    ${hud("Feed the Goblin!")}
    <div class="gob-top">
      <div class="gob-face">🧌</div>
      <div class="gob-bubble">${trashArt(GOBLIN.want, "gob-want")}<span>“${wantT.name}!”</span></div>
    </div>
    <div class="gob-timer"><i id="gob-timerbar"></i></div>
    <div class="gob-status">
      <div class="rumpel-stat sub">Fed ${GOBLIN.done}/${GOB_REQUESTS} · ${fbTxt}</div>
      <div class="gob-happy"><i style="width:${GOBLIN.happy}%"></i><span class="gob-happy-mark" style="left:${GOB_TARGET}%"></span></div>
    </div>
    <div class="grow" style="overflow-y:auto">
      <div class="gob-grid">${tiles || `<div class="muted center" style="padding:20px">Nothing left to feed!</div>`}</div>
    </div>
    <button class="btn secondary" id="gob-pass">🚫 I don't have it!</button>
  `);
  $("#screen-event").querySelectorAll(".gob-tile").forEach(b => b.addEventListener("click", () => goblinFeed(b.dataset.id)));
  on("#gob-pass", "click", goblinPass);
  show("event");
  const tb = $("#gob-timerbar");
  if (tb) { tb.style.transition = "none"; tb.style.width = "100%";
    requestAnimationFrame(() => { if (tb.isConnected) { tb.style.transition = "width " + GOB_MS + "ms linear"; tb.style.width = "0%"; } }); }
}
function goblinFinish() {
  if (GOBLIN.timer) { clearTimeout(GOBLIN.timer); GOBLIN.timer = null; }
  const win = GOBLIN.happy >= GOB_TARGET, correct = GOBLIN.correct;
  let outcome;
  if (win) {
    const gold = 40 + correct * 16, dust = 6;
    grantReward({ gold, stardust: dust }); save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    outcome = { emoji: "😋", title: "Stuffed &amp; happy!", cls: "win",
      lines: [`<div class="stat-line"><span>Junk he gobbled</span><span>${correct} bits</span></div>`,
              `<div class="stat-line"><span>He pays you</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`],
      note: "“Burp! Deee-licious. Here's your shinies!” 🪙" };
  } else {
    save();
    SFX.sneeze();
    outcome = { emoji: "😠", title: "Still hungry!", cls: "lose",
      lines: [`<div class="stat-line"><span>Junk he gobbled</span><span>${correct} bits</span></div>`,
              `<div class="stat-line"><span>Payout</span><span class="muted">none — too grumpy</span></div>`],
      note: "“Bleh! You fed me all wrong.” He waddles off unsatisfied — no shinies this time." };
  }
  GOBLIN = null;
  html("event", `
    ${hud("Gribble the Goblin")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="gob-next">Next Customer  →</button>
  `);
  on("#gob-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* BUY TIME: FEED THE WOLF — Willow-Wish Village finale minigame.            */
/* The wolf's in Grandma's clothes; keep its Patience out of the red by      */
/* feeding picnic treats (instant nudges + over-time drips) until the        */
/* huntsman arrives. A feed cooldown makes each choice deliberate.           */
/* ======================================================================= */
let WOLF = null;
let WOLF_FINALE = false;            // true when this run is Willow's Realm-Key finale (forces Easy, grants the key)
const WOLF_TICK = 100;              // ms per simulation tick
// Difficulty modes. patience/fullness must stay ABOVE 0; suspicion must stay BELOW 100.
// Each bar has its OWN row of foods (feed the bar from the row under it). One shared feed
// cooldown couples the rows → you must triage which bar to feed each window. Hard adds a
// column-lockout: feeding a food briefly locks that column across ALL rows.
// Numbers verified winnable by a greedy solver in the tests.
const WOLF_MODES = {
  easy:   { label: "Easy",   bars: ["patience"],                          winMs: 30000, cooldown: 2300,
            drain: { patience: 4.0 }, allergenMax: 1, extraFood: 5 },
  medium: { label: "Medium", bars: ["patience", "fullness"],              winMs: 38000, cooldown: 2100,
            drain: { patience: 3.0, fullness: 2.8 }, allergenMax: 2, extraFood: 4 },
  hard:   { label: "Hard",   bars: ["patience", "fullness", "suspicion"], winMs: 44000, cooldown: 1900,
            drain: { patience: 2.3, fullness: 2.1, suspRise: 2.5 }, allergenMax: 3, extraFood: 5,
            colLock: true, colLockMs: 3100 },
};
const WOLF_BAR_META = {
  patience:  { label: "😤 Patience",  keep: "high", green: [35, 85], start: 62 },
  fullness:  { label: "🍖 Fullness",  keep: "high", green: [32, 85], start: 60 },
  suspicion: { label: "🕵️ Suspicion", keep: "low",  green: [0, 45],  start: 18 },
};
// Each bar's row of foods, strongest → weakest (left → right). amt = how much it moves the bar
// toward safe (raises a keep-high bar; lowers the keep-low Suspicion bar). base = starting stock.
const WOLF_ROWS = {
  patience:  [ { id: "tart",  name: "Tart",   emoji: "🥧", amt: 22, base: 2 },
               { id: "honey", name: "Honey",  emoji: "🍯", amt: 16, base: 2 },
               { id: "tea",   name: "Tea",    emoji: "🍵", amt: 11, base: 3 },
               { id: "berry", name: "Berry",  emoji: "🫐", amt: 7,  base: 3 } ],
  fullness:  [ { id: "roast", name: "Roast",  emoji: "🍖", amt: 24, base: 2 },
               { id: "bread", name: "Bread",  emoji: "🍞", amt: 17, base: 2 },
               { id: "cheese",name: "Cheese", emoji: "🧀", amt: 12, base: 3 },
               { id: "nuts",  name: "Nuts",   emoji: "🥜", amt: 8,  base: 3 } ],
  suspicion: [ { id: "song",  name: "Song",   emoji: "🎵", amt: 22, base: 2 },
               { id: "story", name: "Story",  emoji: "📖", amt: 16, base: 2 },
               { id: "joke",  name: "Joke",   emoji: "🃏", amt: 11, base: 3 },
               { id: "posy",  name: "Posy",   emoji: "🌸", amt: 7,  base: 3 } ],
};
const WOLF_FOODS = {};  // id -> { ...food, bar, col }
Object.keys(WOLF_ROWS).forEach(bar => WOLF_ROWS[bar].forEach((f, col) => { WOLF_FOODS[f.id] = Object.assign({ bar, col }, f); }));
function wolfClamp(v) { return Math.max(0, Math.min(100, v)); }
function wolfBarFoods(bar) { return WOLF_ROWS[bar]; }
// Only real foods (patience/fullness rows) can be an allergen — not the suspicion "distractions".
function wolfAllergenPool(mode) { return WOLF_MODES[mode].bars.filter(b => b !== "suspicion").flatMap(b => WOLF_ROWS[b].map(f => f.id)); }
function wolfFeedsAvailable(m) { return Math.floor(m.winMs / (m.cooldown * 1.2)); }
function wolfAllergenCap(m) { return Math.max(1, Math.floor(wolfFeedsAvailable(m) * 0.5)); } // total allergen items ≤ half your feeds → winnable
function wolfPickAllergens(stock, mode) {
  const m = WOLF_MODES[mode];
  const pool = wolfAllergenPool(mode).filter(id => (stock[id] || 0) > 0);
  // shuffle for variety, then prefer lower-stock types so we reliably hit the target count within the cap
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  pool.sort((a, b) => stock[a] - stock[b]);
  const cap = wolfAllergenCap(m); let total = 0; const picks = [];
  for (const id of pool) { if (picks.length >= m.allergenMax) break; if (total + stock[id] <= cap) { picks.push(id); total += stock[id]; } }
  if (!picks.length && pool.length) picks.push(pool[0]);
  return picks;
}
function wolfAllergenLeft() { return WOLF ? WOLF.allergens.reduce((s, id) => s + (WOLF.stock[id] || 0), 0) : 0; }
function wolfBuildStock(mode) {
  const m = WOLF_MODES[mode], stock = {};
  m.bars.forEach(bar => WOLF_ROWS[bar].forEach(f => { stock[f.id] = f.base; }));
  const ids = Object.keys(stock);
  for (let i = 0; i < m.extraFood; i++) stock[R.pick(ids)]++;
  return stock;
}
// The bridge INTO the Willow finale — ties the clues together. A stooped "granny" (the Wolf,
// badly disguised) shuffles into the shop; when it leaves, you realize it matched Little Red's
// impostor sketch, so you send word to Red — which kicks off the rush to Grandma's cottage.
// NOTE: uses a placeholder wolf pose for the disguise until dedicated "wolf-in-grandma's-clothes"
// art exists; the sketch beat shows Red's real grandma_sketch.
function playGrandmaWolf() {
  SFX.unlock();
  ["wolf_sneaky", "wolf_grin", "grandma_sketch"].forEach(k => ART.ensure(k, () => {}));
  renderStoryBeats([
    { name: "A little old granny?", fig: "wolf_sneaky", bg: "village_door", text: "A stooped figure shuffles in — bonnet pulled low, a shawl up over the snout. “Ohh, good evening, dearie. Just a sweet… old… granny. You wouldn’t have a little something for, ahem, <i>terribly big teeth</i>? Asking for a friend. The friend is a granny.”" },
    { name: "A little old granny?", fig: "wolf_grin", bg: "village_door", cta: "Something’s off…  ▸", text: "“Lovely shop. I’ll just be toddling back to my perfectly-normal-grandmother cottage now. Nothing suspicious about it! Ta-ta!” <i>(It scurries out — rather too quickly, on rather too many paws.)</i>" },
    { name: "Wait a moment…", figEmoji: "🧐", bg: "village_mid", cta: "The sketch!  ▸", text: "The bonnet. The teeth. Those paws. That wasn’t a granny at all — and it matched a face we were <b>told</b> to watch for. We’d better tell <b>Little Red</b>. Right now." },
    { name: "Little Red", gallery: ["grandma_sketch"], cta: "Go — hurry!  ▸", text: "You saw them?! <i>Here?!</i> <i>(She holds up her sketch — it’s the very same face.)</i> That’s the impostor. That’s who’s at Grandma’s. There’s no time — keep him talking, I’ll fetch the huntsman. <b>GO!</b>" },
  ], () => renderWolfFinale());
}
// Willow-Wish Village FINALE — the must-win Realm-Key encounter. Forces Easy (finales stay
// accessible), and winning grants the Realm Key that opens King's Courtyard. Freely retryable.
function renderWolfFinale() {
  WOLF_FINALE = true;
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("The Wolf at Grandma's!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🐺</div>
      <div class="result-title" style="color:var(--gold)">Willow-Wish's Finale</div>
      <div class="speech">“Come a little closer, dearie… Grandma's been waiting for you…”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Stall the wolf</span><span>until the huntsman comes 🏹</span></div>
        <div class="stat-line"><span>Win to earn</span><span class="gold">🗝️ a Realm Key!</span></div>
      </div>
      <div class="muted" style="max-width:300px">Beat this to earn the <b>Realm Key</b> that opens <b>King's Courtyard</b>. Keep his Patience up until rescue — and don't worry, you can retry as many times as it takes.</div>
    </div>
    <button class="btn good" id="wolf-finale-go">🧺 Save Grandma!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="wolf-finale-skip">Not yet</button>
  `);
  on("#wolf-finale-go", "click", () => wolfStart("easy"));
  on("#wolf-finale-skip", "click", () => { WOLF_FINALE = false; startRound(); });
  show("event");
}
function renderWolfIntro() {
  WOLF_FINALE = false;   // the free-play / practice entry (mode picker, no Realm Key)
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("Grandma's Cottage")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🐺</div>
      <div style="font-weight:800;font-size:20px">It's the Wolf!</div>
      <div class="speech">“My, what a delicious-looking basket you've brought, dearie…”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Feed each bar</span><span>from the row under it</span></div>
        <div class="stat-line"><span>Any bar hits the edge</span><span style="color:var(--bad)">you lose! 🐺</span></div>
        <div class="stat-line"><span>Huntsman's allergic 🤧</span><span style="color:var(--bad)">use up the 🤧 treats!</span></div>
      </div>
      <div class="muted" style="max-width:300px">You can only feed <b>once every couple seconds</b>, so pick the bar that needs it most. Keep 😤 Patience & 🍖 Fullness <b>up</b>; keep 🕵️ Suspicion <b>down</b> with distractions. Use up the huntsman's 🤧 allergens before he arrives. <b>Hard</b> also locks a food's whole column for a moment after you use it.</div>
    </div>
    <div class="wolf-modes">
      <button class="btn good" id="wolf-easy">🟢 Easy · 1 bar</button>
      <button class="btn" id="wolf-medium">🟡 Medium · 2 bars</button>
      <button class="btn" id="wolf-hard">🔴 Hard · 3 bars + locks</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn secondary" id="wolf-skip">Not now</button>
  `);
  on("#wolf-easy", "click", () => wolfStart("easy"));
  on("#wolf-medium", "click", () => wolfStart("medium"));
  on("#wolf-hard", "click", () => wolfStart("hard"));
  on("#wolf-skip", "click", startRound);
  show("event");
}
function wolfStart(mode) {
  mode = WOLF_MODES[mode] ? mode : "easy";
  const m = WOLF_MODES[mode], stock = wolfBuildStock(mode), bars = {};
  m.bars.forEach(k => bars[k] = { val: WOLF_BAR_META[k].start });
  WOLF = { mode, stock, bars, allergens: wolfPickAllergens(stock, mode),
    colLock: [0, 0, 0, 0], cooldownUntil: 0, elapsed: 0, inGreen: 0, over: false, tickTimer: null };
  wolfPlay();
  WOLF.tickTimer = setInterval(wolfTick, WOLF_TICK);
}
function wolfTick() {
  if (!WOLF || WOLF.over) return;
  const dt = WOLF_TICK / 1000, m = WOLF_MODES[WOLF.mode], B = WOLF.bars;
  if (B.patience) B.patience.val = wolfClamp(B.patience.val - (m.drain.patience || 0) * dt);
  if (B.fullness) B.fullness.val = wolfClamp(B.fullness.val - (m.drain.fullness || 0) * dt);
  if (B.suspicion) B.suspicion.val = wolfClamp(B.suspicion.val + (m.drain.suspRise || 0) * dt);
  WOLF.elapsed += WOLF_TICK;
  if (B.patience) { const g = WOLF_BAR_META.patience.green; if (B.patience.val >= g[0] && B.patience.val <= g[1]) WOLF.inGreen += WOLF_TICK; }
  wolfPaint();
  if (B.patience && B.patience.val <= 0) return wolfFinish("patience");
  if (B.fullness && B.fullness.val <= 0) return wolfFinish("fullness");
  if (B.suspicion && B.suspicion.val >= 100) return wolfFinish("suspicion");
  if (WOLF.elapsed >= m.winMs) return wolfFinish(wolfAllergenLeft() > 0 ? "allergen" : true);
}
function wolfGroupsHtml() {
  return WOLF_MODES[WOLF.mode].bars.map(key => {
    const meta = WOLF_BAR_META[key], g = meta.green;
    const tiles = WOLF_ROWS[key].map((f, col) => {
      const n = WOLF.stock[f.id] || 0, allergen = WOLF.allergens.includes(f.id);
      return `<button class="wolf-tile ${n <= 0 ? "empty" : ""} ${allergen ? "allergen" : ""}" data-id="${f.id}" data-col="${col}" ${n <= 0 ? "disabled" : ""}>
        ${allergen ? `<span class="wolf-allergen">🤧</span>` : ""}
        <span class="wolf-emoji">${f.emoji}</span><span class="wolf-tname">${f.name}</span>
        <span class="wolf-tfx">${meta.keep === "low" ? "−" : "+"}${f.amt}</span><span class="wolf-count" id="wolf-n-${f.id}">×${n}</span></button>`;
    }).join("");
    return `<div class="wolf-group">
      <div class="wolf-bar"><div class="wolf-plabel">${meta.label}${meta.keep === "low" ? ` <span class="wolf-sublbl">(keep low)</span>` : ""}</div>
        <div class="wolf-ptrack"><span class="wolf-green ${meta.keep === "low" ? "lowzone" : ""}" style="left:${g[0]}%;width:${g[1] - g[0]}%"></span><i class="wolf-pfill" id="wolf-fill-${key}"></i></div></div>
      <div class="wolf-row">${tiles}</div>
    </div>`;
  }).join("");
}
function wolfObjHtml() {
  if (!WOLF || !WOLF.allergens.length) return "";
  const parts = WOLF.allergens.map(id => {
    const left = WOLF.stock[id] || 0, f = WOLF_FOODS[id];
    return `<span class="wolf-obj-item ${left <= 0 ? "done" : ""}">${f.emoji} ${left <= 0 ? "✓" : "×" + left}</span>`;
  }).join("");
  return `<span class="wolf-obj-lbl">🤧 Use up before rescue:</span>${parts}`;
}
function wolfPlay() {
  html("event", `
    ${hud("Feed the Wolf!")}
    <div class="wolf-top mg-fullbleed">
      <div class="wolf-face" id="wolf-face">🐺</div>
      <div class="wolf-huntsman"><span class="wolf-hlbl">🏹 Huntsman on the way… <b>${WOLF_MODES[WOLF.mode].label}</b></span><div class="wolf-hbar"><i id="wolf-hbar"></i></div></div>
    </div>
    <div class="wolf-obj" id="wolf-obj">${wolfObjHtml()}</div>
    <div class="grow" style="overflow-y:auto"><div class="wolf-groups">${wolfGroupsHtml()}</div></div>
    <div class="wolf-cd" id="wolf-cd"><i id="wolf-cdbar"></i><span id="wolf-cdtxt">Ready — feed him!</span></div>
  `);
  $("#screen-event").querySelectorAll(".wolf-tile").forEach(b => b.addEventListener("click", () => wolfFeed(b.dataset.id)));
  show("event");
  wolfPaint();
}
function wolfPaint() {
  if (!WOLF) return;
  const now = Date.now(), m = WOLF_MODES[WOLF.mode];
  m.bars.forEach(key => {
    const bar = WOLF.bars[key], meta = WOLF_BAR_META[key], fill = $("#wolf-fill-" + key); if (!fill) return;
    fill.style.width = bar.val + "%";
    let zone;
    if (meta.keep === "low") zone = bar.val >= 76 ? "danger" : bar.val > meta.green[1] ? "amber" : "green";
    else zone = bar.val < 22 ? "danger" : (bar.val >= meta.green[0] && bar.val <= meta.green[1]) ? "green" : "amber";
    fill.className = "wolf-pfill " + zone;
  });
  const hb = $("#wolf-hbar"); if (hb) hb.style.width = Math.min(100, WOLF.elapsed / m.winMs * 100) + "%";
  const face = $("#wolf-face"); if (face) face.classList.toggle("angry", (WOLF.bars.patience && WOLF.bars.patience.val < 22) || (WOLF.bars.fullness && WOLF.bars.fullness.val < 22) || (WOLF.bars.suspicion && WOLF.bars.suspicion.val > 76));
  const ob = $("#wolf-obj");
  if (ob) { ob.innerHTML = wolfObjHtml(); const left = wolfAllergenLeft(), late = WOLF.elapsed / m.winMs > 0.65; ob.classList.toggle("clear", left <= 0); ob.classList.toggle("urgent", left > 0 && late); }
  // per-column lockout (Hard) — dim/disable locked tiles
  if (m.colLock) {
    $("#screen-event").querySelectorAll(".wolf-tile").forEach(t => {
      const col = +t.dataset.col, locked = now < WOLF.colLock[col], out = t.classList.contains("empty");
      t.classList.toggle("locked", locked && !out);
    });
  }
  const cd = WOLF.cooldownUntil - now, cdbar = $("#wolf-cdbar"), cdtxt = $("#wolf-cdtxt"), groups = $(".wolf-groups");
  if (cd > 0) { if (cdbar) cdbar.style.width = (cd / m.cooldown * 100) + "%"; if (cdtxt) cdtxt.textContent = "Wait…"; if (groups) groups.classList.add("cooling"); }
  else { if (cdbar) cdbar.style.width = "0%"; if (cdtxt) cdtxt.textContent = "Ready — feed a bar!"; if (groups) groups.classList.remove("cooling"); }
}
function wolfFeed(id) {
  if (!WOLF || WOLF.over) return;
  const now = Date.now(), m = WOLF_MODES[WOLF.mode], f = WOLF_FOODS[id];
  if (now < WOLF.cooldownUntil) return;                 // shared feed cooldown
  if (m.colLock && now < WOLF.colLock[f.col]) { toast("🔒 That column's locked — try another."); return; }
  const n = WOLF.stock[id] || 0; if (n <= 0) return;
  const bar = WOLF.bars[f.bar]; if (!bar) return;
  WOLF.stock[id] = n - 1;
  const meta = WOLF_BAR_META[f.bar];
  bar.val = wolfClamp(bar.val + (meta.keep === "low" ? -f.amt : f.amt));
  SFX[f.bar === "suspicion" ? "charm" : "coin"]();
  WOLF.cooldownUntil = now + m.cooldown;
  if (m.colLock) WOLF.colLock[f.col] = now + m.colLockMs;  // lock this column across all rows
  const cnt = $("#wolf-n-" + id); if (cnt) cnt.textContent = "×" + WOLF.stock[id];
  const tile = $("#screen-event") && $("#screen-event").querySelector(`.wolf-tile[data-id="${id}"]`);
  if (tile) { if (WOLF.stock[id] <= 0) { tile.classList.add("empty"); tile.disabled = true; } tile.classList.remove("pop"); void tile.offsetWidth; tile.classList.add("pop"); }
  wolfPaint();
}
function wolfFinish(result) {
  if (!WOLF) return;
  const win = result === true, secs = Math.round(WOLF.elapsed / 1000);
  const greenPct = Math.round(WOLF.inGreen / Math.max(1, WOLF.elapsed) * 100);
  const finale = WOLF_FINALE; WOLF_FINALE = false;
  WOLF.over = true;
  if (WOLF.tickTimer) { clearInterval(WOLF.tickTimer); WOLF.tickTimer = null; }
  let outcome;
  if (win) {
    const gold = 60, dust = 8;
    grantReward({ gold, stardust: dust });
    if (finale) markRealmFinaleWon();   // grant the Realm Key + complete the realm story
    save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    const keyLine = finale ? `<div class="stat-line"><span>🗝️ Realm Key</span><span style="color:var(--gold)">earned — Courtyard unlocked to buy!</span></div>` : "";
    outcome = { emoji: finale ? "🗝️" : "🏹", title: finale ? "Grandma is saved!" : "The huntsman arrives!", cls: "win",
      lines: [`<div class="stat-line"><span>You stalled him</span><span>${secs}s · ${WOLF_MODES[WOLF.mode].label}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`, keyLine],
      note: finale ? "You beat Willow-Wish's finale! The huntsman saves Grandma, and you've earned the 🗝️ Realm Key — head to the map to open King's Courtyard." : "You kept the wolf busy long enough — the huntsman bursts in and rescues Grandma! 🎉" };
  } else {
    save(); SFX.sneeze();
    const why = result === "allergen"
      ? { emoji: "🤧", title: "Huntsman can't come in!", note: "You held the wolf off — but you left his allergens on the table! He sneezes at the door and the wolf slips away. Use up the 🤧 treats before he arrives." }
      : result === "fullness"
      ? { emoji: "🍖", title: "The wolf's too hungry!", note: "His belly ran empty — feed the 🍖 Fullness row to keep him fed, not just calm." }
      : result === "suspicion"
      ? { emoji: "🕵️", title: "The wolf saw through you!", note: "Suspicion climbed too high — feed the 🕵️ distraction row (songs, stories) to keep it down." }
      : { emoji: "🐺", title: "The wolf pounced!", note: "His patience ran out. Feed the 😤 Patience row before it dips into the red!" };
    outcome = { emoji: why.emoji, title: why.title, cls: "lose",
      lines: [`<div class="stat-line"><span>You lasted</span><span>${secs}s · ${WOLF_MODES[WOLF.mode].label}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="muted">${finale ? "no key yet — retry!" : "none — try again!"}</span></div>`],
      note: finale ? why.note + " The finale is freely retryable — give it another go for the Realm Key." : why.note };
  }
  WOLF = null;
  const retry = finale && !win;
  html("event", `
    ${hud("Grandma's Cottage")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn ${retry ? "good" : ""}" id="wolf-next">${retry ? "🔁 Try the finale again" : "Continue  →"}</button>
  `);
  on("#wolf-next", "click", retry ? renderWolfFinale : startRound);
  show("event");
}

/* ======================================================================= */
/* RESCUE THE FEAST — King's Courtyard finale minigame.                      */
/* The clumsy jester bumped the banquet table and the whole feast is         */
/* tumbling off the top of the screen. Tap a falling dish to catch it, then  */
/* tap its rightful home at the bottom to set it down. Right homes charm the */
/* King (Delight ✨); dishes that smash on the floor stoke his Temper 😠 — */
/* max it and the poor Jester is hauled to the dungeon (you lose). Easy lets  */
/* you hold TWO dishes; Medium/Hard just one (one pair of hands) so you must */
/* place fast. Numbers verified winnable by a greedy solver in the tests.    */
/* ======================================================================= */
let FEAST = null;
let FEAST_FINALE = false;           // true when this run is the Courtyard Realm-Key finale
const FEAST_TICK = 55;              // ms per simulation tick
const FEAST_FLOOR = 90;            // y% at which an uncaught dish smashes on the floor
const FEAST_COLS = 5;              // spawn columns across the sky
const FEAST_SURGE_LEN = 5000;      // ms a "toast" speed-surge lasts
const FEAST_CORRECT = 9;           // Delight for a dish set in its RIGHT home
const FEAST_WRONG = 3;             // Delight for a dish set in the WRONG home (still tidier than the floor)
// Each falling dish and the home it belongs in. hazard = costs extra Temper if it smashes.
const FEAST_KINDS = {
  roast:  { name: "Roast",  emoji: "🍗", home: "plate" },
  apple:  { name: "Apple",  emoji: "🍎", home: "bowl" },
  bread:  { name: "Bread",  emoji: "🥖", home: "basket" },
  cake:   { name: "Cake",   emoji: "🍰", home: "stand" },
  candle: { name: "Candle", emoji: "🕯️", home: "holder", hazard: true },
  wine:   { name: "Wine",   emoji: "🍷", home: "goblet", hazard: true },
};
const FEAST_HOMES = {
  plate:  { name: "Plate",  emoji: "🍽️" },
  bowl:   { name: "Bowl",   emoji: "🥣" },
  basket: { name: "Basket", emoji: "🧺" },
  stand:  { name: "Stand",  emoji: "🎂" },
  holder: { name: "Holder", emoji: "🪔" },
  goblet: { name: "Goblet", emoji: "🥂" },
};
// Difficulty. hold = dishes your hands carry at once. kinds = which dishes fall (and which
// homes appear). fall = %screen per second. spawnEvery = ms between drops. dur = round length.
// surges = # of toast speed-spikes. temperHit / hazardHit = Temper added by a smashed dish.
// goal = Delight target used only for the star rating. Verified winnable by the test bot.
const FEAST_MODES = {
  easy:   { label: "Easy",   hold: 2, kinds: ["roast", "apple", "bread", "cake"],
            fall: 15, spawnEvery: 1600, dur: 30000, surges: 1, temperHit: 12, hazardHit: 12, goal: 130 },
  medium: { label: "Medium", hold: 1, kinds: ["roast", "apple", "bread", "cake", "candle"],
            fall: 18, spawnEvery: 1300, dur: 36000, surges: 1, temperHit: 12, hazardHit: 18, goal: 165 },
  hard:   { label: "Hard",   hold: 1, kinds: ["roast", "apple", "bread", "cake", "candle", "wine"],
            fall: 22, spawnEvery: 1080, dur: 42000, surges: 2, temperHit: 12, hazardHit: 20, goal: 205 },
};
function feastMode() { return FEAST_MODES[FEAST.mode]; }
// The homes shown for a mode = the distinct homes its dishes belong to, in dish order.
function feastHomesFor(mode) {
  const seen = []; FEAST_MODES[mode].kinds.forEach(k => { const h = FEAST_KINDS[k].home; if (!seen.includes(h)) seen.push(h); }); return seen;
}
function feastSurging() { return !!(FEAST && FEAST.surgeWindows.some(at => FEAST.elapsed >= at && FEAST.elapsed < at + FEAST_SURGE_LEN)); }
// King's Courtyard FINALE — the must-win Realm-Key encounter. Forces Easy (finales stay
// accessible), and winning grants the Realm Key for the next realm. Freely retryable.
function renderFeastFinale() {
  FEAST_FINALE = true;
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("Chaos at the Feast!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🃏</div>
      <div class="result-title" style="color:var(--gold)">Courtyard Finale</div>
      <div class="speech">“Oh no no no — I only bumped the table a <i>little!</i> Quick, put it all back before the King turns 'round, or it's the dungeon for me!”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Catch each dish</span><span>set it in its home 🍽️</span></div>
        <div class="stat-line"><span>Win to earn</span><span class="gold">🗝️ a Realm Key!</span></div>
      </div>
      <div class="muted" style="max-width:300px">Beat this to earn the <b>Realm Key</b> for the next realm. Save the feast — and the poor Jester — before the King's Temper boils over. You can retry as many times as it takes.</div>
    </div>
    <button class="btn good" id="feast-finale-go">🍗 Save the Feast!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="feast-finale-skip">Not yet</button>
  `);
  on("#feast-finale-go", "click", () => feastStart("easy"));
  on("#feast-finale-skip", "click", () => { FEAST_FINALE = false; startRound(); });
  show("event");
}
function renderFeastIntro() {
  FEAST_FINALE = false;   // the free-play / practice entry (mode picker, no Realm Key)
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("The King's Feast")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🏰</div>
      <div style="font-weight:800;font-size:20px">Rescue the Feast!</div>
      <div class="speech">“The clumsy jester's tipped the banquet — catch the dishes before they hit the floor!”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Tap a falling dish</span><span>then tap its home</span></div>
        <div class="stat-line"><span>Right home</span><span style="color:var(--good)">delights the King ✨</span></div>
        <div class="stat-line"><span>Dish hits the floor</span><span style="color:var(--bad)">Temper rises 😠</span></div>
      </div>
      <div class="muted" style="max-width:300px"><b>Easy</b> lets you hold two dishes at once; <b>Medium</b> & <b>Hard</b> just one — place fast! Keep the King's Temper from boiling over or the Jester's in trouble.</div>
    </div>
    <div class="wolf-modes">
      <button class="btn good" id="feast-easy">🟢 Easy · hold 2</button>
      <button class="btn" id="feast-medium">🟡 Medium · hold 1</button>
      <button class="btn" id="feast-hard">🔴 Hard · hold 1 + wine</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn secondary" id="feast-skip">Not now</button>
  `);
  on("#feast-easy", "click", () => feastStart("easy"));
  on("#feast-medium", "click", () => feastStart("medium"));
  on("#feast-hard", "click", () => feastStart("hard"));
  on("#feast-skip", "click", startRound);
  show("event");
}
function feastStart(mode) {
  mode = FEAST_MODES[mode] ? mode : "easy";
  const m = FEAST_MODES[mode];
  const surgeWindows = m.surges === 2 ? [Math.round(0.36 * m.dur), Math.round(0.68 * m.dur)] : [Math.round(0.52 * m.dur)];
  FEAST = { mode, homes: feastHomesFor(mode), items: [], held: [], uid: 0,
    elapsed: 0, nextSpawnAt: 500, delight: 0, temper: 0, placed: 0, smashed: 0,
    surgeWindows, surgeOn: false, over: false, tickTimer: null };
  feastPlay();
  FEAST.tickTimer = setInterval(feastTick, FEAST_TICK);
}
function feastHandsHtml() {
  const m = feastMode(), slots = [];
  for (let i = 0; i < m.hold; i++) {
    const kind = FEAST.held[i];
    if (kind) { const k = FEAST_KINDS[kind]; slots.push(`<div class="feast-hold has"><span class="feast-hemj">${k.emoji}</span><span class="feast-harrow">→ ${FEAST_HOMES[k.home].emoji}</span></div>`); }
    else slots.push(`<div class="feast-hold empty">✋</div>`);
  }
  return slots.join("");
}
function feastHomesHtml() {
  return FEAST.homes.map(h => {
    const home = FEAST_HOMES[h];
    return `<button class="feast-home" data-home="${h}"><span class="feast-hemoji">${home.emoji}</span><span class="feast-hname">${home.name}</span></button>`;
  }).join("");
}
function feastPlay() {
  const m = feastMode();
  html("event", `
    ${hud("Rescue the Feast!")}
    <div class="feast-hud">
      <div class="feast-king-wrap"><span id="feast-king">🙂</span></div>
      <div class="feast-meters">
        <div class="feast-mrow"><span class="feast-mlbl">✨ King's Delight</span><div class="feast-track"><i class="feast-dfill" id="feast-delight"></i></div></div>
        <div class="feast-mrow"><span class="feast-mlbl">😠 King's Temper <b id="feast-tnum">0%</b></span><div class="feast-track"><i class="feast-tfill ok" id="feast-temper"></i></div></div>
      </div>
    </div>
    <div class="feast-timerbar"><i id="feast-timer"></i></div>
    <div class="feast-sky mg-fullbleed" id="feast-sky"><div class="feast-toast" id="feast-toast">👑 The King rises — the toast! Dishes fly!</div></div>
    <div class="feast-hands" id="feast-hands">${feastHandsHtml()}</div>
    <div class="feast-homes" id="feast-homes">${feastHomesHtml()}</div>
  `);
  $("#screen-event").querySelectorAll(".feast-home").forEach(b => b.addEventListener("click", () => feastPlace(b.dataset.home)));
  show("event");
  feastPaintMeters();
}
function feastSpawn() {
  const m = feastMode(), kind = R.pick(m.kinds), k = FEAST_KINDS[kind];
  const col = Math.floor(Math.random() * FEAST_COLS), surging = feastSurging();
  const it = { uid: ++FEAST.uid, kind, col, spawnAt: FEAST.elapsed, y: 0,
    fall: m.fall * (surging ? 1.4 : 1) * (0.9 + Math.random() * 0.2), el: null };
  FEAST.items.push(it);
  const sky = $("#feast-sky");
  if (sky) {
    const el = document.createElement("button");
    el.className = "feast-item" + (k.hazard ? " hazard" : "");
    el.dataset.uid = it.uid;
    el.style.left = (13 + it.col * (74 / (FEAST_COLS - 1))) + "%";
    el.style.top = "0%";
    el.innerHTML = `<span class="feast-emoji">${k.emoji}</span>`;
    el.addEventListener("click", () => feastCatch(it.uid));
    sky.appendChild(el);
    it.el = el;
  }
}
function feastSmash(it) {
  const m = feastMode(), k = FEAST_KINDS[it.kind];
  if (it.el) {
    const el = it.el, sky = el.parentNode; el.remove();
    if (sky) { const s = document.createElement("div"); s.className = "feast-splash"; s.style.left = el.style.left; s.style.top = FEAST_FLOOR + "%"; s.textContent = "💥"; s.addEventListener("animationend", () => s.remove()); sky.appendChild(s); }
  }
  FEAST.temper = Math.min(100, FEAST.temper + (k.hazard ? m.hazardHit : m.temperHit));
  FEAST.smashed++;
  SFX.chop();
}
function feastCatch(uid) {
  if (!FEAST || FEAST.over) return;
  const m = feastMode();
  if (FEAST.held.length >= m.hold) { const h = $("#feast-hands"); if (h) { h.classList.remove("full"); void h.offsetWidth; h.classList.add("full"); } SFX.whoosh(); toast("✋ Hands full — place one first!"); return; }
  const idx = FEAST.items.findIndex(x => x.uid === uid); if (idx < 0) return;
  const it = FEAST.items[idx];
  FEAST.items.splice(idx, 1);
  if (it.el) it.el.remove();
  FEAST.held.push(it.kind);
  SFX.pop();
  feastPaintHands();
}
function feastPlace(homeId) {
  if (!FEAST || FEAST.over) return;
  if (!FEAST.held.length) { toast("🍽️ Catch a dish first!"); return; }
  // place the held dish that BELONGS here if we're holding one; else the front dish goes here (wrong home)
  let idx = FEAST.held.findIndex(kd => FEAST_KINDS[kd].home === homeId);
  const correct = idx >= 0; if (!correct) idx = 0;
  FEAST.held.splice(idx, 1);
  FEAST.delight += correct ? FEAST_CORRECT : FEAST_WRONG;
  FEAST.placed++;
  SFX[correct ? "coin" : "whoosh"]();
  const home = $(`.feast-home[data-home="${homeId}"]`);
  if (home) { const cls = correct ? "good-pop" : "meh-pop"; home.classList.remove(cls); void home.offsetWidth; home.classList.add(cls); }
  feastPaintHands(); feastPaintMeters();
}
function feastPaintHands() { const h = $("#feast-hands"); if (h) h.innerHTML = feastHandsHtml(); }
function feastPaintMeters() {
  if (!FEAST) return;
  const m = feastMode();
  const t = $("#feast-timer"); if (t) t.style.width = Math.min(100, FEAST.elapsed / m.dur * 100) + "%";
  const d = $("#feast-delight"); if (d) d.style.width = Math.min(100, FEAST.delight / m.goal * 100) + "%";
  const tp = $("#feast-temper"); if (tp) { tp.style.width = FEAST.temper + "%"; tp.className = "feast-tfill " + (FEAST.temper >= 75 ? "danger" : FEAST.temper >= 45 ? "amber" : "ok"); }
  const king = $("#feast-king"); if (king) king.textContent = FEAST.temper >= 75 ? "😡" : FEAST.temper >= 45 ? "😠" : "🙂";
  const tn = $("#feast-tnum"); if (tn) tn.textContent = Math.round(FEAST.temper) + "%";
}
function feastTick() {
  if (!FEAST || FEAST.over) return;
  const m = feastMode();
  FEAST.elapsed += FEAST_TICK;
  const surging = feastSurging();
  if (surging && !FEAST.surgeOn) { FEAST.surgeOn = true; toast("👑 The King rises — the toast! Dishes fly!"); SFX.fanfare(); }
  else if (!surging && FEAST.surgeOn) FEAST.surgeOn = false;
  const banner = $("#feast-toast"); if (banner) banner.classList.toggle("show", surging);
  // spawn on schedule (faster during a toast surge)
  if (FEAST.elapsed >= FEAST.nextSpawnAt) { feastSpawn(); FEAST.nextSpawnAt = FEAST.elapsed + (surging ? m.spawnEvery * 0.6 : m.spawnEvery); }
  // move dishes; smash any that reach the floor uncaught
  for (let i = FEAST.items.length - 1; i >= 0; i--) {
    const it = FEAST.items[i];
    it.y = (FEAST.elapsed - it.spawnAt) / 1000 * it.fall;
    if (it.y >= FEAST_FLOOR) { FEAST.items.splice(i, 1); feastSmash(it); continue; }
    if (it.el) it.el.style.top = it.y + "%";
  }
  feastPaintMeters();
  if (FEAST.temper >= 100) return feastFinish(false);
  if (FEAST.elapsed >= m.dur) return feastFinish(true);
}
function feastFinish(win) {
  if (!FEAST) return;
  const m = feastMode(), secs = Math.round(FEAST.elapsed / 1000);
  const finale = FEAST_FINALE; FEAST_FINALE = false;
  FEAST.over = true;
  if (FEAST.tickTimer) { clearInterval(FEAST.tickTimer); FEAST.tickTimer = null; }
  const placed = FEAST.placed, smashed = FEAST.smashed, delight = FEAST.delight;
  const stars = win ? Math.max(1, Math.min(3, Math.floor(delight / (m.goal * 0.5)))) : 0;
  let outcome;
  if (win) {
    const gold = 60 + stars * 10, dust = 6 + stars * 2;
    grantReward({ gold, stardust: dust });
    if (finale) markRealmFinaleWon();   // grant the Realm Key + complete the realm story
    save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    const keyLine = finale ? `<div class="stat-line"><span>🗝️ Realm Key</span><span style="color:var(--gold)">earned — next realm unlocked to buy!</span></div>` : "";
    outcome = { emoji: finale ? "🗝️" : "👑", title: finale ? "The feast is saved!" : "The King is delighted!", cls: "win",
      lines: [`<div class="stat-line"><span>Dishes rescued</span><span>${placed} · ${"⭐".repeat(stars)}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`, keyLine],
      note: finale ? "You put the whole feast back before the King turned 'round — the Jester's forgiven, and you've earned the 🗝️ Realm Key! Head to the map to open the next realm." : "The King never noticed a thing — and the Jester keeps his head. Well played!" };
  } else {
    save(); SFX.sneeze();
    outcome = { emoji: "😡", title: "The King's had enough!", cls: "lose",
      lines: [`<div class="stat-line"><span>You lasted</span><span>${secs}s · ${m.label}</span></div>`,
              `<div class="stat-line"><span>Dishes smashed</span><span style="color:var(--bad)">${smashed}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="muted">${finale ? "no key yet — retry!" : "none — try again!"}</span></div>`],
      note: (finale ? "The finale is freely retryable — give it another go for the Realm Key. " : "") + "Too many dishes hit the floor and the King's Temper boiled over — catch the ones closest to the floor first, and keep a hand free to grab the next!" };
  }
  FEAST = null;
  const retry = finale && !win;
  html("event", `
    ${hud("King's Courtyard")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn ${retry ? "good" : ""}" id="feast-next">${retry ? "🔁 Try the finale again" : "Continue  →"}</button>
  `);
  on("#feast-next", "click", retry ? renderFeastFinale : startRound);
  show("event");
}

/* ======================================================================= */
/* SKY-HIGH SAVINGS — Beanstalk Bank finale minigame (a Sky-Burger-style      */
/* stacker). Coins and junk rain from the top; slide the golden plate along   */
/* the bottom to catch them. Gold coins 🪙 and gems 💎 build your Stack        */
/* Height (reach the goal → win); bombs 💣 and rocks 🪨 knock coins off AND    */
/* rattle the tower's Wobble — max the Wobble and the stack topples (lose).    */
/* Catching clean steadies it back down. Easy = a wide plate; Hard = a narrow */
/* plate, more junk, and gusts of wind. Verified winnable by a greedy solver. */
/* ======================================================================= */
let STACK = null;
let STACK_FINALE = false;           // true when this run is the Beanstalk Realm-Key finale
const STACK_TICK = 45;              // ms per simulation tick (smaller = smoother sway)
const STACK_SURFACE = 46;           // y% where the TOP of the tower sits — it stays mid-screen
const STACK_COIN_R = 4;             // coin "radius" in y%; catch fires the instant the TIP touches
const STACK_CATCH_Y = STACK_SURFACE - STACK_COIN_R; // y% at which a falling coin's tip meets the top
const STACK_PITCH = 2.7;            // vertical spacing between stacked coins (y%) — tight, so each overlaps the one below
const STACK_FLOOR = 108;            // y% at which an uncaught item is gone
const STACK_WIND_LEN = 4500;       // ms a wind gust lasts
const STACK_COLLIDE_W = 6;          // half-width (%) of the tower body for Hard-mode side collisions
const STACK_BUMP_COST = 5;          // coins docked from the final reward per Hard-mode tower bump
// Falling items. good coins/gems ADD height; bad bombs/rocks SUBTRACT height and add Wobble.
const STACK_KINDS = {
  coin: { name: "Coin", emoji: "🪙", good: true,  height: 1,  wob: 0 },
  gem:  { name: "Gem",  emoji: "💎", good: true,  height: 3,  wob: 0 },
  rock: { name: "Rock", emoji: "🪨", good: false, height: -1, wob: 16 },
  bomb: { name: "Bomb", emoji: "💣", good: false, height: -4, wob: 28 },
};
// Real artwork: coins/gems have a FRONT (faceted, while falling) and an EDGE/angled view (stacked).
const STACK_GEM_COLORS = ["purple", "green", "blue", "red", "yellow", "teal", "pink"];
const STACK_BAD_MILD = [1, 2, 3, 4, 5, 6];   // thorn-vine, rock, thorn-flower, vined boot, bird nest, spilling bucket
const STACK_BAD_SEVERE = [7, 8, 9, 10];      // pitchfork, dagger, axe, crow (the "bomb"-tier junk)
// pick the falling + stacked artwork for a spawned item
function stackArt(kind) {
  if (kind === "coin") return { front: "stack_coin_front", edge: "stack_coin_edge" };
  if (kind === "gem") { const c = R.pick(STACK_GEM_COLORS); return { front: `stack_gem_${c}_front`, edge: `stack_gem_${c}_edge` }; }
  const pool = kind === "bomb" ? STACK_BAD_SEVERE : STACK_BAD_MILD;
  return { front: `stack_bad_${R.pick(pool)}`, edge: null };
}
// Difficulty. catchTol = how close the tower-top must be to a coin's x to catch it (%). sway =
// how bouncy the tower is (grows with height). fall = %screen/sec. spawnEvery = ms between drops.
// dur = round length. goal = Stack Height to win. winds = # of wind gusts. spawn = weighted drop
// table. wobDecay = Wobble recovered per second when catching clean. windWob = Wobble/sec in wind.
const STACK_MODES = {
  easy:   { label: "Easy",   catchTol: 12, sway: 0.12, fall: 20, spawnEvery: 900, dur: 30000, goal: 18, winds: 0,
            spawn: [["coin", 72], ["gem", 12], ["rock", 11], ["bomb", 5]], wobDecay: 8, windWob: 0 },
  medium: { label: "Medium", catchTol: 10, sway: 0.26, fall: 24, spawnEvery: 800, dur: 36000, goal: 22, winds: 1,
            spawn: [["coin", 66], ["gem", 10], ["rock", 15], ["bomb", 9]], wobDecay: 7, windWob: 7 },
  hard:   { label: "Hard",   catchTol: 8,  sway: 0.42, fall: 29, spawnEvery: 700, dur: 42000, goal: 30, winds: 2,
            spawn: [["coin", 62], ["gem", 8], ["rock", 18], ["bomb", 12]], wobDecay: 6, windWob: 9, bodyHit: true },
  // Endless high-score chase: no goal, no timer. Difficulty ramps with height. You're out on
  // 5 BUMPS (swinging the tower into junk) or the instant you catch a 💣/🪨 on TOP of the stack.
  infinite: { label: "Infinite", catchTol: 11, sway: 0.28, fall: 18, spawnEvery: 920,
            spawn: [["coin", 76], ["gem", 10], ["rock", 9], ["bomb", 5]], wobDecay: 6, windWob: 8,
            bodyHit: true, endless: true, maxBumps: 5 },
};
function stackMode() { return STACK_MODES[STACK.mode]; }
function stackWinding() {
  if (!STACK) return false;
  if (STACK_MODES[STACK.mode].endless) return STACK.elapsed > 9000 && (STACK.elapsed % 15000) < STACK_WIND_LEN; // recurring gusts
  return STACK.windWindows.some(at => STACK.elapsed >= at && STACK.elapsed < at + STACK_WIND_LEN);
}
function stackPick() {
  const m = stackMode();
  let table = m.spawn;
  if (m.endless) {   // Infinite: start gentle, rain more junk the higher you climb
    const lvl = Math.min(10, Math.floor(STACK.height / 10)), extra = lvl * 1.3;
    table = [["coin", Math.max(40, 76 - extra)], ["gem", 10], ["rock", 9 + extra * 0.55], ["bomb", 5 + extra * 0.45]];
  }
  let tot = 0; table.forEach(t => tot += t[1]);
  let r = Math.random() * tot;
  for (const [k, w] of table) { if ((r -= w) < 0) return k; }
  return table[0][0];
}
// Beanstalk Bank FINALE — the must-win Realm-Key encounter. Forces Easy, retryable.
function renderStackFinale() {
  STACK_FINALE = true;
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("Raining Gold!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🪙</div>
      <div class="result-title" style="color:var(--gold)">Beanstalk Finale</div>
      <div class="speech">“The goose is laying like mad — catch the falling gold and stack it sky-high! But mind the giant's junk in the mix…”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Slide to catch coins</span><span>stack to the goal 🪙</span></div>
        <div class="stat-line"><span>Win to earn</span><span class="gold">🗝️ a Realm Key!</span></div>
      </div>
      <div class="muted" style="max-width:300px">Move the golden plate to catch coins and gems; dodge 💣 bombs and 🪨 rocks — they topple your tower. Reach the goal height before time's up. Freely retryable.</div>
    </div>
    <button class="btn good" id="stack-finale-go">🪙 Stack the Gold!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="stack-finale-skip">Not yet</button>
  `);
  on("#stack-finale-go", "click", () => stackStart("easy"));
  on("#stack-finale-skip", "click", () => { STACK_FINALE = false; startRound(); });
  show("event");
}
function renderStackIntro() {
  STACK_FINALE = false;   // free-play / practice entry (mode picker, no Realm Key)
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("Beanstalk Bank")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🌱</div>
      <div style="font-weight:800;font-size:20px">Sky-High Savings!</div>
      <div class="speech">“Coins are raining from the beanstalk — stack 'em as high as you can!”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Slide the plate</span><span>catch 🪙 & 💎</span></div>
        <div class="stat-line"><span>Bombs & rocks</span><span style="color:var(--bad)">topple the tower 💥</span></div>
        <div class="stat-line"><span>Reach the goal</span><span style="color:var(--good)">before time's up ⏱️</span></div>
      </div>
      <div class="muted" style="max-width:300px">Drag anywhere (or move your mouse) to slide the golden plate. Catch the good stuff, dodge the junk, and keep the tower's <b>Wobble</b> from boiling over.</div>
    </div>
    <div class="wolf-modes">
      <button class="btn good" id="stack-easy">🟢 Easy · wide plate</button>
      <button class="btn" id="stack-medium">🟡 Medium</button>
      <button class="btn" id="stack-hard">🔴 Hard · narrow + wind</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn" id="stack-infinite" style="width:100%;max-width:340px">♾️ Infinite${(GAME.stackBest && GAME.stackBest[0]) ? ` · best ${GAME.stackBest[0]} 🪙` : " · high score"}</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="stack-skip">Not now</button>
  `);
  on("#stack-easy", "click", () => stackStart("easy"));
  on("#stack-medium", "click", () => stackStart("medium"));
  on("#stack-hard", "click", () => stackStart("hard"));
  on("#stack-infinite", "click", () => stackStart("infinite"));
  on("#stack-skip", "click", startRound);
  show("event");
}
function stackStart(mode) {
  mode = STACK_MODES[mode] ? mode : "easy";
  const m = STACK_MODES[mode];
  const windWindows = m.winds === 2 ? [Math.round(0.36 * m.dur), Math.round(0.68 * m.dur)] : m.winds === 1 ? [Math.round(0.52 * m.dur)] : [];
  STACK = { mode, items: [], pile: [], uid: 0, targetX: 50, towerX: 50, towerVX: 0, angle: 0, elapsed: 0, nextSpawnAt: 500,
    height: 0, wobble: 0, caught: 0, missed: 0, penalty: 0, windWindows, windOn: false, over: false, tickTimer: null };
  stackPlay();
  STACK.tickTimer = setInterval(stackTick, STACK_TICK);
}
// The tower renders from its TOP (parked at STACK_SURFACE) downward. As height grows the plate
// sinks below the screen — so we only ever draw the coins that are still on-screen.
function stackTowerHtml() {
  const visible = Math.ceil((STACK_FLOOR - STACK_SURFACE) / STACK_PITCH) + 1;
  const pile = STACK.pile, n = pile.length, show = Math.min(n, visible);
  let s = "";
  // topmost (i=0, parked at the surface) = the most recent catch. pile holds EDGE-art names.
  // Higher pieces (smaller i) get a higher z-index so each one overlaps the piece below it.
  for (let i = 0; i < show; i++) {
    const img = pile[n - 1 - i], gem = img.indexOf("gem") >= 0;
    s += `<span class="stack-coin2${gem ? " gem" : ""}" style="top:${STACK_SURFACE + i * STACK_PITCH}%;z-index:${show - i};background-image:url('art/${img}.webp?v=${BUILD}')"></span>`;
  }
  if (n <= visible) s += `<div class="stack-base" style="top:${(STACK_SURFACE + n * STACK_PITCH).toFixed(2)}%"></div>`;
  return s;
}
function stackPlay() {
  const m = stackMode(), endless = m.endless, best = (GAME.stackBest && GAME.stackBest[0]) || 0;
  const hInit = endless ? "0" : "0 / " + m.goal;
  const wInit = endless ? "0/" + m.maxBumps : "0%";
  const hint = endless ? "Stack as high as you can — 5 💥 bumps or a 💣 on top = out!" : "Swipe to sway the tower • catch 🪙💎 • dodge 💣🪨";
  // Minimal HUD floats over the sky (counters in the corners, timer across the top) so you see more sky.
  const mid = endless ? (best ? `<div class="stack-chip stack-chip-mid">🏆 <b>${best}</b></div>` : "") : `<div class="stack-timer2"><i id="stack-timer"></i></div>`;
  html("event", `
    ${hud("Sky-High Savings!")}
    <div class="feast-sky stack-sky mg-fullbleed" id="stack-sky">
      <div class="stack-bg"></div>
      <div class="stack-overlay">
        <div class="stack-chip"><span>🪙</span><b id="stack-hnum">${hInit}</b></div>
        ${mid}
        <div class="stack-chip" id="stack-wchip"><span id="stack-face">🪙</span><b id="stack-wnum">${wInit}</b></div>
      </div>
      <div class="feast-toast" id="stack-wind">🌬️ A gust of wind! The tower sways…</div>
      <div class="stack-tower" id="stack-tower">${stackTowerHtml()}</div>
    </div>
    <p class="muted stack-hint" style="text-align:center;font-size:12px;margin:4px 0 2px">${hint}</p>
  `);
  const sky = $("#stack-sky");
  const move = clientX => {
    if (!STACK || STACK.over) return;
    const r = sky.getBoundingClientRect(); if (!r.width) return;
    STACK.targetX = Math.max(8, Math.min(92, (clientX - r.left) / r.width * 100));   // swipe sets where the tower leans toward
  };
  sky.addEventListener("pointermove", e => move(e.clientX));
  sky.addEventListener("pointerdown", e => move(e.clientX));
  sky.addEventListener("touchmove", e => { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
  show("event");
  stackPaint();
}
function stackSpawn() {
  const m = stackMode(), kind = stackPick(), k = STACK_KINDS[kind], wind = stackWinding();
  const lvl = m.endless ? Math.min(12, Math.floor(STACK.height / 12)) : 0;  // Infinite: falls speed up as you climb
  const art = stackArt(kind);
  const it = { uid: ++STACK.uid, kind, x: 12 + Math.random() * 76, y: 0, spawnAt: STACK.elapsed,
    fall: (m.fall + lvl * 1.2) * (wind ? 1.3 : 1) * (0.92 + Math.random() * 0.16), passed: false, edgeImg: art.edge, el: null };
  STACK.items.push(it);
  const sky = $("#stack-sky");
  if (sky) {
    const el = document.createElement("div");
    el.className = "stack-item" + (k.good ? (kind === "gem" ? " gem" : "") : " bad");
    el.style.left = it.x + "%"; el.style.top = "0%";
    el.style.backgroundImage = `url('art/${art.front}.webp?v=${BUILD}')`;
    sky.appendChild(el); it.el = el;
  }
}
function stackCatch(it) {
  const k = STACK_KINDS[it.kind];
  if (stackMode().endless && !k.good) {   // Infinite: catching a bomb/rock on TOP ends the run
    if (it.el) it.el.remove(); SFX.clang(); SFX.sneeze();
    const tw = $("#stack-tower"); if (tw) { tw.classList.remove("catch-bad"); void tw.offsetWidth; tw.classList.add("catch-bad"); }
    return stackFinish(false, "badtop");
  }
  // an off-centre catch shoves the tower sideways — worse the taller you are
  const off = it.x - STACK.towerX;
  STACK.towerVX += off * (0.7 + Math.min(STACK.height, 45) * 0.03);
  STACK.height = Math.max(0, STACK.height + k.height);
  if (k.good) { STACK.pile.push(it.edgeImg); }          // stack the angled art of the thing you caught (coin OR gem)
  else { STACK.wobble = Math.min(100, STACK.wobble + k.wob); for (let p = (it.kind === "bomb" ? 3 : 1); p > 0 && STACK.pile.length; p--) STACK.pile.pop(); }
  STACK.caught++;
  if (it.el) it.el.remove();
  SFX[k.good ? (it.kind === "gem" ? "charm" : "coin") : "chop"]();
  const tower = $("#stack-tower");
  if (tower) { tower.innerHTML = stackTowerHtml(); const cls = k.good ? "catch-good" : "catch-bad"; tower.classList.remove(cls); void tower.offsetWidth; tower.classList.add(cls); }
}
// HARD only: the tower body bumped a bomb/rock. No topple — just docks the final coin score,
// with an impact sound + a shake + a spark/−5 flourish so the bump reads clearly.
function stackBodyHit(it) {
  const m = stackMode();
  STACK.penalty++;
  STACK.towerVX += (it.x - STACK.towerX) * 0.8;   // a jolt, but no Wobble → can't topple
  SFX.clang();
  if (it.el) it.el.remove();
  const sky = $("#stack-sky");
  if (sky) {
    const burst = document.createElement("div"); burst.className = "stack-spark"; burst.style.left = it.x.toFixed(1) + "%"; burst.style.top = it.y.toFixed(1) + "%"; burst.textContent = "💥";
    burst.addEventListener("animationend", () => burst.remove()); sky.appendChild(burst);
    const pen = document.createElement("div"); pen.className = "stack-pen"; pen.style.left = it.x.toFixed(1) + "%"; pen.style.top = it.y.toFixed(1) + "%";
    pen.textContent = m.endless ? `💥 ${STACK.penalty}/${m.maxBumps}` : "−" + STACK_BUMP_COST;
    pen.addEventListener("animationend", () => pen.remove()); sky.appendChild(pen);
    sky.classList.remove("bump"); void sky.offsetWidth; sky.classList.add("bump");   // a jolt of the whole play area
  }
  const tower = $("#stack-tower"); if (tower) { tower.classList.remove("catch-bad"); void tower.offsetWidth; tower.classList.add("catch-bad"); }
  if (m.endless && STACK.penalty >= (m.maxBumps || 5)) return stackFinish(false, "bumps");
}
function stackPaint() {
  if (!STACK) return;
  const m = stackMode();
  const wchip = $("#stack-wchip");
  if (m.endless) {
    const bumps = STACK.penalty, mx = m.maxBumps || 5;
    const hn = $("#stack-hnum"); if (hn) hn.textContent = STACK.height;
    const wn = $("#stack-wnum"); if (wn) wn.textContent = bumps + "/" + mx;
    if (wchip) wchip.className = "stack-chip" + (bumps >= mx - 1 ? " danger" : "");
    const face = $("#stack-face"); if (face) face.textContent = bumps >= mx - 1 ? "😰" : bumps >= 2 ? "😅" : "💥";
  } else {
    const t = $("#stack-timer"); if (t) t.style.width = Math.min(100, STACK.elapsed / m.dur * 100) + "%";
    const hn = $("#stack-hnum"); if (hn) hn.textContent = STACK.height + " / " + m.goal;
    const wn = $("#stack-wnum"); if (wn) wn.textContent = Math.round(STACK.wobble) + "%";
    if (wchip) wchip.className = "stack-chip" + (STACK.wobble >= 75 ? " danger" : "");
    const face = $("#stack-face"); if (face) face.textContent = STACK.wobble >= 75 ? "😰" : STACK.wobble >= 45 ? "😅" : "🗼";
  }
  const tower = $("#stack-tower");
  if (tower) { tower.style.setProperty("--tx", STACK.towerX.toFixed(2) + "%"); tower.style.setProperty("--ang", STACK.angle.toFixed(2) + "deg"); }
}
function stackTick() {
  if (!STACK || STACK.over) return;
  const m = stackMode(), dt = STACK_TICK / 1000;
  STACK.elapsed += STACK_TICK;
  const wind = stackWinding();
  if (wind && !STACK.windOn) { STACK.windOn = true; toast("🌬️ A gust of wind — the tower sways!"); SFX.whoosh(); STACK.towerVX += (Math.random() < 0.5 ? -1 : 1) * 22; }
  else if (!wind && STACK.windOn) STACK.windOn = false;
  const banner = $("#stack-wind"); if (banner) banner.classList.toggle("show", wind);
  // Wobble meter (the topple gauge): rises with wind, steadies as you catch clean.
  STACK.wobble = Math.max(0, Math.min(100, STACK.wobble + (wind ? m.windWob : -m.wobDecay) * dt));
  if (STACK.elapsed >= STACK.nextSpawnAt) {
    stackSpawn();
    let se = m.spawnEvery;
    if (m.endless) se = Math.max(500, m.spawnEvery - Math.floor(STACK.height / 12) * 35); // Infinite: rain faster as you climb
    STACK.nextSpawnAt = STACK.elapsed + (wind ? se * 0.7 : se);
  }
  // Spring the tower toward where you're swiping — looser (more sway) the taller it gets.
  const hf = 1 + Math.min(STACK.height, 50) * m.sway * 0.05;
  const k = 30, damp = Math.max(2.6, 10 / hf);
  STACK.towerVX += (STACK.targetX - STACK.towerX) * k * dt;
  STACK.towerVX -= STACK.towerVX * damp * dt;
  STACK.towerX += STACK.towerVX * dt;
  if (STACK.towerX < 3) { STACK.towerX = 3; STACK.towerVX *= -0.3; }
  if (STACK.towerX > 97) { STACK.towerX = 97; STACK.towerVX *= -0.3; }
  STACK.angle = Math.max(-9, Math.min(9, STACK.towerVX * 0.42));
  // Falling items: catch the instant the tip meets the tower top; otherwise it slips past.
  for (let i = STACK.items.length - 1; i >= 0; i--) {
    const it = STACK.items[i], prevY = it.y;
    it.y = (STACK.elapsed - it.spawnAt) / 1000 * it.fall;
    if (!it.hazard && !it.missed && prevY < STACK_CATCH_Y && it.y >= STACK_CATCH_Y) {
      if (Math.abs(it.x - STACK.towerX) <= m.catchTol) { STACK.items.splice(i, 1); stackCatch(it); if (!STACK) return; continue; }
      STACK.missed++;
      // Missed the top — it keeps falling (behind the tower) down to the bottom of the screen.
      // On HARD a missed bomb/rock becomes a hazard you can still swing the tower into.
      if (m.bodyHit && !STACK_KINDS[it.kind].good) it.hazard = true;
      else { it.missed = true; if (it.el) it.el.classList.add("miss"); }
    }
    if (it.hazard && Math.abs(it.x - STACK.towerX) <= STACK_COLLIDE_W && it.y >= STACK_SURFACE) { STACK.items.splice(i, 1); stackBodyHit(it); if (!STACK) return; continue; }
    if (it.y >= 104) { STACK.items.splice(i, 1); if (it.el) it.el.remove(); continue; }
    if (it.el) it.el.style.top = it.y + "%";
  }
  stackPaint();
  if (m.endless) return;   // Infinite ends only via a bad catch on top or 5 bumps (handled in catch/bodyHit)
  if (STACK.wobble >= 100) return stackFinish(false, "topple");
  if (STACK.height >= m.goal) return stackFinish(true);
  if (STACK.elapsed >= m.dur) return stackFinish(STACK.height >= m.goal);
}
function stackFinish(win, why) {
  if (!STACK) return;
  const m = stackMode(), secs = Math.round(STACK.elapsed / 1000), height = STACK.height, bonks = STACK.penalty;
  const finale = STACK_FINALE; STACK_FINALE = false;
  STACK.over = true;
  if (STACK.tickTimer) { clearInterval(STACK.tickTimer); STACK.tickTimer = null; }
  if (m.endless) { STACK = null; return stackFinishInfinite(height, why); }
  const stars = win ? Math.max(1, Math.min(3, 1 + Math.floor((height - m.goal) / Math.max(4, m.goal * 0.25)))) : 0;
  let outcome;
  if (win) {
    const bumpCost = bonks * STACK_BUMP_COST;
    const gold = Math.max(10, 60 + stars * 12 - bumpCost), dust = 6 + stars * 2;
    grantReward({ gold, stardust: dust });
    if (finale) markRealmFinaleWon();
    save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    const keyLine = finale ? `<div class="stat-line"><span>🗝️ Realm Key</span><span style="color:var(--gold)">earned — next realm unlocked to buy!</span></div>` : "";
    const bumpLine = bonks > 0 ? `<div class="stat-line"><span>Bumps (−${STACK_BUMP_COST} each)</span><span style="color:var(--bad)">${bonks} · −${bumpCost}🪙</span></div>` : "";
    outcome = { emoji: finale ? "🗝️" : "🪙", title: finale ? "Sky-high fortune!" : "A tidy tower of gold!", cls: "win",
      lines: [`<div class="stat-line"><span>Stack height</span><span>${height} 🪙 · ${"⭐".repeat(stars)}</span></div>`,
              bumpLine,
              `<div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`, keyLine],
      note: finale ? "You stacked the gold to the sky before the giant noticed — and earned the 🗝️ Realm Key! Head to the map to open the next realm." : "You caught enough falling gold to build a proper little fortune. Well stacked!" };
  } else {
    save(); SFX.sneeze();
    const toppled = why === "topple";
    outcome = { emoji: toppled ? "💥" : "🪙", title: toppled ? "The tower toppled!" : "Not tall enough…", cls: "lose",
      lines: [`<div class="stat-line"><span>You reached</span><span>${height} / ${m.goal} 🪙 · ${m.label}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="muted">${finale ? "no key yet — retry!" : "none — try again!"}</span></div>`],
      note: (finale ? "The finale is freely retryable — give it another go for the Realm Key. " : "") + (toppled ? "Too many bombs and rocks rattled the stack until it fell — dodge the junk and catch clean to steady the Wobble." : "Time ran out before the tower reached the goal — catch more coins and grab the 💎 gems, they're worth three!") };
  }
  STACK = null;
  const retry = finale && !win;
  html("event", `
    ${hud("Beanstalk Bank")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn ${retry ? "good" : ""}" id="stack-next">${retry ? "🔁 Try the finale again" : "Continue  →"}</button>
  `);
  on("#stack-next", "click", retry ? renderStackFinale : startRound);
  show("event");
}
// Infinite-mode game over: record the top-3 high scores and show the score card.
function stackFinishInfinite(height, why) {
  const prev = (GAME.stackBest || []).slice();
  GAME.stackBest = prev.concat(height).sort((a, b) => b - a).slice(0, 3);
  const isNewBest = height > 0 && height > (prev[0] || 0);
  const madeTop3 = height > 0 && GAME.stackBest.includes(height);
  const gold = Math.max(5, Math.round(height * 1.5));
  grantReward({ gold }); save();
  if (isNewBest) { SFX.perfect(); SFX.bigCoin(); confettiOver($("#app")); } else { SFX.sneeze(); }
  const reason = why === "badtop"
    ? { emoji: "💣", note: "You caught a bomb right on the peak — one bad thing on top and the whole stack is ruined!" }
    : { emoji: "💥", note: "Five bumps and the tower gives out. Mind your swing past the falling junk!" };
  const medals = ["🥇", "🥈", "🥉"];
  let flag = false; // mark just one row as "this run" even if scores tie
  const bestRows = GAME.stackBest.map((s, i) => {
    const isThis = !flag && s === height && madeTop3; if (isThis) flag = true;
    return `<div class="stat-line"><span>${medals[i] || "•"} #${i + 1}</span><span class="${isThis ? "gold" : "muted"}">${s} 🪙${isThis ? " ← you" : ""}</span></div>`;
  }).join("");
  html("event", `
    ${hud("Sky-High Savings!")}
    <div class="grow center" style="gap:12px">
      <div class="ph big">${isNewBest ? "🏆" : reason.emoji}</div>
      <div class="result-title ${isNewBest ? "win" : "lose"}">${isNewBest ? "New best!" : "Timber!"}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>You stacked</span><span><b>${height}</b> 🪙 high</span></div>
        <div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold}</span></div>
      </div>
      <div class="card" style="width:100%;max-width:320px"><div style="font-weight:800;margin-bottom:4px">🏆 Top 3</div>${bestRows}</div>
      <p class="muted" style="max-width:300px">${reason.note}</p>
    </div>
    <button class="btn good" id="stack-again">🔁 Stack again</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="stack-done">Done</button>
  `);
  on("#stack-again", "click", () => stackStart("infinite"));
  on("#stack-done", "click", renderStackIntro);
  show("event");
}

/* ======================================================================= */
/* SPILLED WISH-WINE — a King's Courtyard "dab the spill" game. Enchanted     */
/* wine keeps dripping onto the King's cloak; each drop BLOOMS outward like   */
/* watercolour. Tap a drop before it finishes blooming to whisk it away —     */
/* miss it and it sets into a permanent stain. Too many stains and the King   */
/* fumes. Survive the toast with stains under the cap to win. Always dab the  */
/* drop closest to setting first. Verified winnable by a greedy solver.       */
/* ======================================================================= */
let WINE = null;
const WINE_TICK = 60;   // ms per tick
const WINE_BALL_G = 52;       // gravity (%/s²-ish) pulling juggling balls down — gentle floaty arc
const WINE_BALL_THROW = 92;   // upward speed a toss gives a ball (%/s)
const WINE_BALL_MAXFALL = 55; // cap on downward speed so a ball never drops faster than you can catch it
const WINE_FLOOR = 94;        // y% past which an uncaught ball is dropped
const WINE_BALL_GAP = 2000;   // ms between ball entrances (first one at this mark too)
const WINE_MODES = {
  // Two things at once: dab blooming wine AND keep the Jester's balls up. A dropped ball knocks a
  // goblet → spawns a fresh spill (the two systems feed each other). More balls each difficulty.
  easy:   { label: "Easy",   bloomMs: 2200, spawnEvery: 950,  dur: 28000, maxStains: 9,  balls: 3, startDrops: 3 },
  medium: { label: "Medium", bloomMs: 1950, spawnEvery: 850,  dur: 32000, maxStains: 8,  balls: 4, startDrops: 4 },
  hard:   { label: "Hard",   bloomMs: 1900, spawnEvery: 1350, dur: 36000, maxStains: 9, splatter: 2, balls: 5, startDrops: 5 },
};
function wineMode() { return WINE_MODES[WINE.mode]; }
// difficulty creeps up over the round: drops bloom quicker & spill faster toward the "toast"
function wineRamp() { return WINE ? (1 - 0.38 * Math.min(1, WINE.elapsed / wineMode().dur)) : 1; }
function renderWineIntro() {
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("A Toast Gone Wrong!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🍷</div>
      <div style="font-weight:800;font-size:20px">Spilled Wish-Wine!</div>
      <div class="speech">“Egad — the enchanted wine is dripping all over the King's cloak! Quick, dab each drop before it stains!”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Tap a drop</span><span>before it blooms 🍷</span></div>
        <div class="stat-line"><span>Too slow</span><span style="color:var(--bad)">it sets into a stain</span></div>
        <div class="stat-line"><span>Too many stains</span><span style="color:var(--bad)">the King fumes! 👑</span></div>
      </div>
      <div class="muted" style="max-width:300px">Wine keeps spilling — always dab the drop <b>closest to setting</b> first. Keep the stains under the limit until the toast is over.</div>
    </div>
    <div class="wolf-modes">
      <button class="btn good" id="wine-easy">🟢 Easy</button>
      <button class="btn" id="wine-medium">🟡 Medium</button>
      <button class="btn" id="wine-hard">🔴 Hard</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn secondary" id="wine-skip">Not now</button>
  `);
  on("#wine-easy", "click", () => wineStart("easy"));
  on("#wine-medium", "click", () => wineStart("medium"));
  on("#wine-hard", "click", () => wineStart("hard"));
  on("#wine-skip", "click", startRound);
  show("event");
}
// Background music for the toast (looping mp3). Respects the game's mute toggle.
let WINE_MUSIC = null;
function wineMusicStart() {
  if (SFX.isMuted()) return;
  try {
    if (!WINE_MUSIC) { WINE_MUSIC = new Audio(`audio/jesterjuggling.mp3?v=${BUILD}`); WINE_MUSIC.loop = true; WINE_MUSIC.volume = 0.5; }
    WINE_MUSIC.currentTime = 0;
    const pr = WINE_MUSIC.play(); if (pr && pr.catch) pr.catch(() => {});
  } catch (e) {}
}
function wineMusicStop() { if (WINE_MUSIC) { try { WINE_MUSIC.pause(); } catch (e) {} } }
function wineStart(mode) {
  mode = WINE_MODES[mode] ? mode : "medium";
  const m = WINE_MODES[mode];
  WINE = { mode, drops: [], balls: [], uid: 0, elapsed: 0, nextSpawnAt: m.spawnEvery, saved: 0, stains: 0, dropped: 0,
    pendingBalls: m.balls, startBalls: m.balls, nextBallAt: WINE_BALL_GAP, over: false, tickTimer: null };
  winePlay();
  wineMusicStart();
  for (let i = 0; i < (m.startDrops || 3); i++) { const p = wineDropPos(); wineAddDrop(p.x, p.y, m.bloomMs * (0.85 + Math.random() * 0.4)); }  // a few spills waiting at the start
  WINE.tickTimer = setInterval(wineTick, WINE_TICK);
}
function winePlay() {
  const m = wineMode();
  html("event", `
    ${hud("Spilled Wish-Wine!")}
    <div class="feast-hud">
      <div class="feast-king-wrap"><span id="wine-king">🙂</span></div>
      <div class="feast-meters">
        <div class="feast-mrow"><span class="feast-mlbl">🤹 Juggling <b id="wine-balls">${m.balls}</b></span><div class="feast-track"><i class="feast-dfill" id="wine-ballbar"></i></div></div>
        <div class="feast-mrow"><span class="feast-mlbl">🟣 Stains <b id="wine-snum">0/${m.maxStains}</b></span><div class="feast-track"><i class="feast-tfill ok" id="wine-stainbar"></i></div></div>
      </div>
    </div>
    <div class="feast-timerbar"><i id="wine-timer"></i></div>
    <div class="wine-cloak mg-fullbleed" id="wine-cloak"></div>
    <p class="muted stack-hint" style="text-align:center;font-size:12px;margin:4px 0 2px">Tap balls to keep them up • dab the wine before it sets!</p>
  `);
  show("event");
  winePaint();
}
function wineClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
// Wine only spills onto the white SILK of the cloak — never the fur trim, corners, or top collar.
const WINE_SILK = { x0: 24, x1: 76, y0: 26, y1: 82 };
function wineSilkX(x) { return wineClamp(x, WINE_SILK.x0, WINE_SILK.x1); }
function wineSilkY(y) { return wineClamp(y, WINE_SILK.y0, WINE_SILK.y1); }
function wineDropPos() { return { x: WINE_SILK.x0 + Math.random() * (WINE_SILK.x1 - WINE_SILK.x0), y: WINE_SILK.y0 + Math.random() * (WINE_SILK.y1 - WINE_SILK.y0) }; }
function wineAddDrop(x, y, bloom) {
  const cloak = $("#wine-cloak"); if (!cloak) return;
  // each spill picks a random splat shape + rotation; the set stain reuses the same shape
  const stain = R.int(1, WINE_STAIN_IMGS), rot = R.int(0, 359);
  const d = { uid: ++WINE.uid, x, y, born: WINE.elapsed, bloom, stain, rot, el: null };
  WINE.drops.push(d);
  const el = document.createElement("button");
  el.className = "wine-drop"; el.dataset.uid = d.uid;
  el.style.left = x + "%"; el.style.top = y + "%";
  el.style.setProperty("--rot", rot + "deg");
  el.style.backgroundImage = `url('art/wine_stain_${stain}.webp?v=${BUILD}')`;
  el.addEventListener("pointerdown", e => { e.preventDefault(); wineTap(d.uid); });
  cloak.appendChild(el); d.el = el;
}
function wineSpawn() {
  const m = wineMode(); if (!$("#wine-cloak")) return;
  const c = wineDropPos(), ramp = wineRamp();
  wineAddDrop(c.x, c.y, m.bloomMs * ramp);
  // HARD: the spill splatters extra drops right around it — close in place AND time (still on the silk)
  for (let k = 0; k < (m.splatter || 0); k++) {
    wineAddDrop(wineSilkX(c.x + (Math.random() - 0.5) * 20), wineSilkY(c.y + (Math.random() - 0.5) * 18), m.bloomMs * ramp * (0.8 + Math.random() * 0.4));
  }
}
const WINE_BALL_IMGS = 7;    // art/wine_ball_1..7.png — seven distinct colours
const WINE_STAIN_IMGS = 10;  // art/wine_stain_1..10.png — ten wine-splat shapes
function wineAddBall() {
  const cloak = $("#wine-cloak"); if (!cloak) return;
  // every live ball is a DIFFERENT colour — pick a ball image no current ball is using
  const used = WINE.balls.map(x => x.img), avail = [];
  for (let k = 1; k <= WINE_BALL_IMGS; k++) if (!used.includes(k)) avail.push(k);
  const img = avail.length ? R.pick(avail) : R.int(1, WINE_BALL_IMGS);
  // enters near the bottom and is tossed straight up (the Jester throws it), then arcs down over ~3s
  const b = { uid: ++WINE.uid, x: 16 + Math.random() * 68, y: 88 + Math.random() * 4, vy: -WINE_BALL_THROW, vx: (Math.random() - 0.5) * 10, img, el: null };
  WINE.balls.push(b);
  const el = document.createElement("button");
  el.className = "wine-ball"; el.dataset.uid = b.uid;
  el.style.left = b.x + "%"; el.style.top = b.y + "%";
  // a big invisible hit-zone button with a smaller visible ball inside (bigger, more forgiving tap target)
  el.innerHTML = `<span class="wine-ball-face" style="background-image:url('art/wine_ball_${img}.webp?v=${BUILD}')"></span>`;
  el.addEventListener("pointerdown", e => { e.preventDefault(); wineThrow(b.uid); });  // fire on touch, not click — reliable on a moving target
  cloak.appendChild(el); b.el = el;
}
function wineThrow(uid) {
  if (!WINE || WINE.over) return;
  const b = WINE.balls.find(x => x.uid === uid); if (!b) return;
  b.vy = -WINE_BALL_THROW; b.vx += (Math.random() - 0.5) * 12;
  SFX.pop();
  if (b.el) { b.el.classList.remove("toss", "low"); void b.el.offsetWidth; b.el.classList.add("toss"); }
}
function wineDropBall(b) {   // a ball hit the floor: fumble sound, a splat, and it knocks a goblet → a fresh spill
  WINE.dropped++;
  if (b.el) b.el.remove();
  SFX.sneeze();
  const cloak = $("#wine-cloak");
  if (cloak) { const s = document.createElement("div"); s.className = "wine-splat"; s.style.left = b.x + "%"; s.style.top = (WINE_FLOOR - 3) + "%"; s.textContent = "💥"; s.addEventListener("animationend", () => s.remove()); cloak.appendChild(s); }
  wineAddDrop(wineSilkX(b.x + (Math.random() - 0.5) * 12), wineSilkY(60 + Math.random() * 18), wineMode().bloomMs * wineRamp() * 0.9);
}
function wineTap(uid) {
  if (!WINE || WINE.over) return;
  const i = WINE.drops.findIndex(d => d.uid === uid); if (i < 0) return;
  const d = WINE.drops[i]; WINE.drops.splice(i, 1);
  WINE.saved++;
  if (d.el) {
    const el = d.el, cloak = el.parentNode; el.remove();
    if (cloak) { const s = document.createElement("div"); s.className = "wine-sparkle"; s.style.left = d.x + "%"; s.style.top = d.y + "%"; s.textContent = "✨"; s.addEventListener("animationend", () => s.remove()); cloak.appendChild(s); }
  }
  SFX.pop();
  winePaint();
}
function wineSet(d) {   // a drop finished blooming → a permanent stain (same splat shape, darkened)
  WINE.stains++;
  if (d.el) {
    const el = d.el, cloak = el.parentNode, sz = el.offsetWidth || 132; el.remove();
    if (cloak) {
      const st = document.createElement("div"); st.className = "wine-stain";
      st.style.left = d.x + "%"; st.style.top = d.y + "%";
      st.style.width = sz + "px"; st.style.height = sz + "px";
      st.style.setProperty("--rot", (d.rot || 0) + "deg");
      st.style.backgroundImage = `url('art/wine_stain_${d.stain || R.int(1, WINE_STAIN_IMGS)}.webp?v=${BUILD}')`;
      cloak.appendChild(st);
    }
  }
  SFX.chop();
}
function winePaint() {
  if (!WINE) return;
  const m = wineMode();
  const tv = $("#wine-timer"); if (tv) tv.style.width = Math.min(100, WINE.elapsed / m.dur * 100) + "%";
  const bn = $("#wine-balls"); if (bn) bn.textContent = WINE.balls.length;
  const bb = $("#wine-ballbar"); if (bb) { bb.style.width = (WINE.balls.length / Math.max(1, WINE.startBalls) * 100) + "%"; bb.className = "feast-dfill" + (WINE.balls.length <= 1 ? " lowball" : ""); }
  const sn = $("#wine-snum"); if (sn) sn.textContent = WINE.stains + "/" + m.maxStains;
  const stb = $("#wine-stainbar"); if (stb) { stb.style.width = (WINE.stains / m.maxStains * 100) + "%"; stb.className = "feast-tfill " + (WINE.stains >= m.maxStains - 2 ? "danger" : WINE.stains >= m.maxStains * 0.5 ? "amber" : "ok"); }
  const king = $("#wine-king"); if (king) king.textContent = (WINE.stains >= m.maxStains - 2 || WINE.balls.length <= 1) ? "😡" : (WINE.stains >= m.maxStains * 0.5 || WINE.dropped > 0) ? "😠" : "🙂";
}
function wineTick() {
  if (!WINE || WINE.over) return;
  const m = wineMode(), dt = WINE_TICK / 1000;
  WINE.elapsed += WINE_TICK;
  // juggling balls enter ~0.5s apart at the start, then arc up/down under gravity
  if (WINE.pendingBalls > 0 && WINE.elapsed >= WINE.nextBallAt) { wineAddBall(); WINE.pendingBalls--; WINE.nextBallAt = WINE.elapsed + WINE_BALL_GAP; }
  for (let i = WINE.balls.length - 1; i >= 0; i--) {
    const b = WINE.balls[i];
    b.vy += WINE_BALL_G * dt; if (b.vy > WINE_BALL_MAXFALL) b.vy = WINE_BALL_MAXFALL;  // terminal velocity → always catchable
    b.y += b.vy * dt; b.x += b.vx * dt;
    if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx); } else if (b.x > 94) { b.x = 94; b.vx = -Math.abs(b.vx); }
    if (b.y >= WINE_FLOOR) { WINE.balls.splice(i, 1); wineDropBall(b); continue; }
    if (b.el) { b.el.style.left = b.x + "%"; b.el.style.top = b.y + "%"; b.el.classList.toggle("low", b.y > 74 && b.vy > 0); }
  }
  // wine spills bloom in place
  if (WINE.elapsed >= WINE.nextSpawnAt) { wineSpawn(); WINE.nextSpawnAt = WINE.elapsed + m.spawnEvery * wineRamp(); }
  for (let i = WINE.drops.length - 1; i >= 0; i--) {
    const d = WINE.drops[i], p = (WINE.elapsed - d.born) / d.bloom;
    if (p >= 1) { WINE.drops.splice(i, 1); wineSet(d); continue; }
    if (d.el) { const sz = 32 + p * 108; d.el.style.width = sz + "px"; d.el.style.height = sz + "px"; d.el.classList.toggle("urgent", p > 0.66); }
  }
  winePaint();
  if (WINE.stains >= m.maxStains) return wineFinish(false, "stains");
  if (WINE.pendingBalls === 0 && WINE.balls.length === 0) return wineFinish(false, "balls");
  if (WINE.elapsed >= m.dur) return wineFinish(true);
}
function wineFinish(win, why) {
  if (!WINE) return;
  wineMusicStop();
  const m = wineMode(), saved = WINE.saved, stains = WINE.stains, dropped = WINE.dropped;
  WINE.over = true;
  if (WINE.tickTimer) { clearInterval(WINE.tickTimer); WINE.tickTimer = null; }
  WINE = null;
  let outcome;
  if (win) {
    const stars = Math.max(1, Math.min(3, 3 - Math.floor((stains + dropped) / Math.max(1, m.maxStains / 3))));
    const gold = 40 + stars * 12 + saved, dust = 4 + stars * 2;
    grantReward({ gold, stardust: dust }); save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    outcome = { emoji: "🍷", title: "Cloak saved!", cls: "win",
      lines: [`<div class="stat-line"><span>Drops dabbed</span><span>${saved} · ${"⭐".repeat(stars)}</span></div>`,
              `<div class="stat-line"><span>Balls dropped</span><span>${dropped}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`],
      note: "You kept the Jester juggling AND the cloak clean through the whole toast — masterful!" };
  } else {
    save(); SFX.sneeze();
    const ballsOut = why === "balls";
    outcome = { emoji: ballsOut ? "🤹" : "🟣", title: ballsOut ? "The juggling collapsed!" : "The cloak's ruined!", cls: "lose",
      lines: [`<div class="stat-line"><span>Drops dabbed</span><span>${saved}</span></div>`,
              `<div class="stat-line"><span>${ballsOut ? "Balls dropped" : "Stains"}</span><span style="color:var(--bad)">${ballsOut ? dropped : stains + "/" + m.maxStains}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="muted">none — try again!</span></div>`],
      note: ballsOut ? "Every one of the Jester's balls hit the floor — his act fell apart! Keep tapping the balls to toss them back up." : "Too many stains set into the cloak and the King stormed off. Remember — every dropped ball knocks over more wine!" };
  }
  html("event", `
    ${hud("King's Courtyard")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="wine-next">Continue  →</button>
  `);
  on("#wine-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* MAGIC CARPET DASH — a Forgotten Oasis flight. Your carpet stays dead-      */
/* CENTRE; the whole night sky slides around you as you steer left/right, so  */
/* it feels like you can drift across the heavens forever. Three things drift  */
/* down at you:                                                               */
/*   ⭐ STARS  — line them up with the carpet to COLLECT them (points).       */
/*   ☁️ CLOUDS — big; you CAN fly through, but the longer you're inside one   */
/*      the more the screen fogs up (a warm sunset haze) until you're blind — */
/*      and a blind pilot flies into a planet.                                */
/*   🪐 PLANETS — huge, bigger than the screen; slow. If you see the edge     */
/*      of one, steer around it fast or you CRASH (lose a heart).             */
/* Pick any of ten carpets (the moon carpet by default). Survive the flight   */
/* to reach the Oasis. Verified winnable by a greedy auto-pilot.              */
/* ======================================================================= */
let CARPET = null;
const CARPET_TICK = 34;        // ms per tick (~30fps)
const CARPET_X = 50;           // carpet's fixed screen x (%) — it never leaves centre
const CARPET_Y = 78;           // carpet's screen y (%)
const CARPET_STAR_HALF = 12;   // half-width (%) of the star-catch column around the carpet — snug, so a near-miss is safe
const CARPET_BODY = 12;        // carpet collision half-width (% of sky width) for planets
const CARPET_STARS = 10, CARPET_CLOUDS = 6, CARPET_PLANETS = 3, CARPET_RUGS = 10;
// Fair hitbox: each planet's solid BODY radius as a fraction of its sprite half-width.
// Planet 2 is the ringed one — its sprite is much wider than the sphere, so its body is smaller.
const CARPET_PLANET_BODY = { 1: 0.80, 2: 0.60, 3: 0.80 };
const CARPET_HEARTS = 3;               // hearts you start with
const CARPET_STAR_GOLD = [2, 3, 5, 6, 9, 10];  // gold stars — COLLECT these
const CARPET_STAR_DARK = [1, 4, 7, 8];         // blue/purple stars — AVOID (catching one costs a heart)
const CARPET_TURN = 0.10;              // how quickly the carpet swings toward your steer — low = boat-like, heavy to turn
const CARPET_MODES = {
  easy:   { label: "Easy",   dur: 32000, fall: 22, starEvery: 900, cloudEvery: 3800, planetEvery: 7200, steer: 46, fogGain: 0.90, fogClear: 0.38, planetR: 52, badStar: 0.22 },
  medium: { label: "Medium", dur: 38000, fall: 27, starEvery: 800, cloudEvery: 3100, planetEvery: 5400, steer: 50, fogGain: 1.05, fogClear: 0.32, planetR: 58, badStar: 0.30 },
  hard:   { label: "Hard",   dur: 44000, fall: 32, starEvery: 740, cloudEvery: 2500, planetEvery: 4500, steer: 54, fogGain: 1.25, fogClear: 0.27, planetR: 60, badStar: 0.40 },
  // Endless survival for a high score — uses Hard's feel and ramps up the longer you fly.
  infinite: { label: "Infinite", endless: true, fall: 30, starEvery: 780, cloudEvery: 2600, planetEvery: 4800, steer: 54, fogGain: 1.2, fogClear: 0.30, planetR: 60, badStar: 0.38 },
};
function carpetMode() { return CARPET_MODES[CARPET.mode]; }
function carpetClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function carpetSkin() { return carpetClamp(GAME.carpetSkin || 5, 1, CARPET_RUGS); }
// difficulty creeps up: things fall a touch faster the deeper into the flight you are
function carpetRamp() {
  if (!CARPET) return 1;
  const m = carpetMode();
  if (m.endless) return 1 + 0.6 * Math.min(1.5, CARPET.elapsed / 40000);   // endless keeps ramping (capped)
  return 1 + 0.40 * Math.min(1, CARPET.elapsed / m.dur);
}
// Background music for the flight (looping mp3). Respects the game's mute toggle.
let CARPET_MUSIC = null;
function carpetMusicStart() {
  if (SFX.isMuted()) return;
  try {
    if (!CARPET_MUSIC) { CARPET_MUSIC = new Audio(`audio/flyingcarpet.mp3?v=${BUILD}`); CARPET_MUSIC.loop = true; CARPET_MUSIC.volume = 0.5; }
    CARPET_MUSIC.currentTime = 0;
    const pr = CARPET_MUSIC.play(); if (pr && pr.catch) pr.catch(() => {});
  } catch (e) {}
}
function carpetMusicStop() { if (CARPET_MUSIC) { try { CARPET_MUSIC.pause(); } catch (e) {} } }
function renderCarpetIntro() {
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("Magic Carpet Dash")}
    <div class="grow center" style="gap:12px">
      <div style="font-weight:800;font-size:20px">Magic Carpet Dash!</div>
      <div class="carpet-pick">
        <button class="carpet-pick-arrow" id="carpet-skin-prev">◀</button>
        <img class="carpet-pick-art" id="carpet-pick-art" src="art/carpet_rug_${carpetSkin()}.webp?v=${BUILD}" alt="carpet" draggable="false">
        <button class="carpet-pick-arrow" id="carpet-skin-next">▶</button>
      </div>
      <div class="muted" style="margin-top:-4px">Pick your carpet</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Hold left / right</span><span>steer the sky ◀ ▶</span></div>
        <div class="stat-line"><span>Catch <b style="color:#ffd76a">gold</b> stars ⭐</span><span>that's the treasure!</span></div>
        <div class="stat-line"><span>Dodge <b style="color:#9a7bff">blue</b> stars ✦</span><span style="color:var(--bad)">they cost a ❤️</span></div>
        <div class="stat-line"><span>Fly through ☁️</span><span style="color:var(--bad)">it fogs your view!</span></div>
        <div class="stat-line"><span>Giant 🪐 planets</span><span style="color:var(--bad)">touch one = crash!</span></div>
      </div>
      <div class="muted" style="max-width:300px">Your carpet steers like a boat — ease into your turns. Collect the gold stars, avoid the blue ones, and steer well clear of the planets. Reach the Oasis to win!</div>
    </div>
    <div class="wolf-modes">
      <button class="btn good" id="carpet-easy">🟢 Easy</button>
      <button class="btn" id="carpet-medium">🟡 Medium</button>
      <button class="btn" id="carpet-hard">🔴 Hard</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn" id="carpet-infinite" style="width:100%;max-width:340px">♾️ Infinite${(GAME.carpetBest && GAME.carpetBest[0]) ? ` · best ${GAME.carpetBest[0]}s ⏱️` : " · how long can you last?"}</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="carpet-skip">Not now</button>
  `);
  const cycle = d => { GAME.carpetSkin = ((carpetSkin() - 1 + d + CARPET_RUGS) % CARPET_RUGS) + 1; save(); const a = $("#carpet-pick-art"); if (a) a.src = `art/carpet_rug_${GAME.carpetSkin}.webp?v=${BUILD}`; SFX.pop(); };
  on("#carpet-skin-prev", "click", () => cycle(-1));
  on("#carpet-skin-next", "click", () => cycle(1));
  on("#carpet-easy", "click", () => carpetStart("easy"));
  on("#carpet-medium", "click", () => carpetStart("medium"));
  on("#carpet-hard", "click", () => carpetStart("hard"));
  on("#carpet-infinite", "click", () => carpetStart("infinite"));
  on("#carpet-skip", "click", startRound);
  show("event");
}
function carpetStart(mode) {
  mode = CARPET_MODES[mode] ? mode : "medium";
  const m = CARPET_MODES[mode];
  CARPET = { mode, stars: [], clouds: [], planets: [], uid: 0, elapsed: 0,
    nextStarAt: 450, nextCloudAt: m.cloudEvery, nextPlanetAt: m.planetEvery, caught: 0,
    hearts: CARPET_HEARTS, invUntil: -1, steer: 0, vx: 0, bg: 0, fog: 0, over: false, tickTimer: null };
  carpetPlay();
  carpetMusicStart();
  CARPET.tickTimer = setInterval(carpetTick, CARPET_TICK);
}
function carpetPlay() {
  const m = carpetMode();
  html("event", `
    ${hud("Magic Carpet Dash!")}
    <div class="carpet-sky mg-fullbleed" id="carpet-sky">
      <div class="carpet-bg" id="carpet-bg"></div>
      <div class="stack-overlay">
        <div class="stack-chip" id="carpet-hchip"><span id="carpet-hearts">${"❤️".repeat(CARPET_HEARTS)}</span></div>
        ${m.endless ? '<div class="stack-chip stack-chip-mid">⏱️ <b id="carpet-time">0s</b></div>' : '<div class="stack-timer2"><i id="carpet-prog"></i></div>'}
        <div class="stack-chip"><span>⭐</span><b id="carpet-stars">0</b></div>
      </div>
      <div class="carpet-arrow left">◀</div><div class="carpet-arrow right">▶</div>
      <img class="carpet-rug" id="carpet-rug" src="art/carpet_rug_${carpetSkin()}.webp?v=${BUILD}" alt="carpet" draggable="false">
      <div class="carpet-fog" id="carpet-fog"></div>
    </div>
    <p class="muted stack-hint" style="text-align:center;font-size:12px;margin:4px 0 2px">Hold the left or right side of the sky to steer</p>
  `);
  show("event");
  carpetBindControls();
  carpetPaint();
}
function carpetBindControls() {
  const sky = $("#carpet-sky"); if (!sky) return;
  const setFrom = cx => { if (!CARPET) return; const r = sky.getBoundingClientRect(); CARPET.steer = cx < r.left + r.width / 2 ? -1 : 1; };
  sky.addEventListener("pointerdown", e => { e.preventDefault(); setFrom(e.clientX); });
  sky.addEventListener("pointermove", e => { if (CARPET && CARPET.steer !== 0) setFrom(e.clientX); });
  const clear = () => { if (CARPET) CARPET.steer = 0; };
  sky.addEventListener("pointerup", clear);
  sky.addEventListener("pointercancel", clear);
  sky.addEventListener("pointerleave", clear);
}
function carpetSteer(dir) { if (CARPET) CARPET.steer = dir < 0 ? -1 : dir > 0 ? 1 : 0; }  // bot / keyboard hook: -1 left, +1 right, 0 straight
function carpetAddStar(forceGood) {
  const sky = $("#carpet-sky"); if (!sky) return;
  let good = forceGood || Math.random() >= carpetMode().badStar;  // gold = collect; blue/purple = avoid
  // fairness: suppress a blue star only while a planet is in the tight lower dodging window (would force
  // opposite steering at once), and never two blue stars crowding the top at once
  if (!good && CARPET.planets.some(p => p.y > 32 && p.y < 92)) good = true;
  if (!good && CARPET.stars.some(s => !s.good && !s.done && s.y < 36)) good = true;
  const img = R.pick(good ? CARPET_STAR_GOLD : CARPET_STAR_DARK);
  const s = { uid: ++CARPET.uid, x: 10 + Math.random() * 80, y: -8, img, good, el: null, done: false, cullAt: 0 };
  CARPET.stars.push(s);
  const el = document.createElement("div");
  el.className = "carpet-star" + (good ? "" : " bad"); el.style.left = s.x + "%"; el.style.top = s.y + "%";
  el.style.backgroundImage = `url('art/carpet_star_${s.img}.webp?v=${BUILD}')`;
  sky.appendChild(el); s.el = el;
}
function carpetAddCloud() {
  const sky = $("#carpet-sky"); if (!sky) return;
  const c = { uid: ++CARPET.uid, x: 22 + Math.random() * 56, y: -16, w: 52 + Math.random() * 22, img: R.int(1, CARPET_CLOUDS), el: null };
  CARPET.clouds.push(c);
  const el = document.createElement("div");
  el.className = "carpet-cloud"; el.style.left = c.x + "%"; el.style.top = c.y + "%"; el.style.width = c.w + "%";
  el.style.backgroundImage = `url('art/carpet_cloud_${c.img}.webp?v=${BUILD}')`;
  sky.appendChild(el); c.el = el;
}
function carpetAddPlanet() {
  const sky = $("#carpet-sky"); if (!sky) return;
  const m = carpetMode();
  // huge; enters from ONE SIDE, centre near/off the edge so only a big arc shows and the far side stays clear.
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = side < 0 ? (-14 + Math.random() * 20) : (100 - (-14 + Math.random() * 20));
  const c = { uid: ++CARPET.uid, x, y: -m.planetR * 0.55, img: R.int(1, CARPET_PLANETS), el: null };
  CARPET.planets.push(c);
  const el = document.createElement("img");
  el.className = "carpet-planet"; el.src = `art/carpet_planet_${c.img}.webp?v=${BUILD}`; el.draggable = false;
  el.style.left = c.x + "%"; el.style.top = c.y + "%"; el.style.width = (m.planetR * 2) + "%";
  sky.appendChild(el); c.el = el;
}
function carpetCatchStar(s) {
  s.done = true; s.cullAt = CARPET.elapsed + 500;
  CARPET.caught++;
  SFX.coin();
  if (s.el) s.el.classList.add("caught");
  carpetPaint();
}
function carpetStarHit(s) {   // caught a blue/purple star — costs a heart (brief mercy window after each hit)
  s.done = true; s.cullAt = CARPET.elapsed + 500;
  if (CARPET.elapsed < CARPET.invUntil) { if (s.el) s.el.classList.add("caught"); return; }
  CARPET.hearts--;
  CARPET.invUntil = CARPET.elapsed + 900;
  SFX.clang();
  const sky = $("#carpet-sky"); if (sky) { sky.classList.remove("shake"); void sky.offsetWidth; sky.classList.add("shake"); }
  const rug = $("#carpet-rug"); if (rug) { rug.classList.remove("hurt"); void rug.offsetWidth; rug.classList.add("hurt"); }
  if (s.el) s.el.classList.add("smash");
  carpetPaint();
  if (CARPET.hearts <= 0) carpetFinish(false, "hearts");
}
function carpetCrash(planet) {
  if (CARPET.over) return;   // any touch of a planet ends the run
  CARPET.over = true;
  SFX.clang(); SFX.sneeze();
  if (planet && planet.el) planet.el.style.zIndex = 7;   // planet moves IN FRONT — the carpet vanishes behind it
  const rug = $("#carpet-rug"); if (rug) { rug.classList.remove("hurt"); void rug.offsetWidth; rug.classList.add("crash"); }
  const sky = $("#carpet-sky"); if (sky) { sky.classList.remove("shake"); void sky.offsetWidth; sky.classList.add("shake"); }
  if (CARPET.tickTimer) { clearInterval(CARPET.tickTimer); CARPET.tickTimer = null; }
  setTimeout(() => carpetFinish(false), 950);   // let the crash play out
}
function carpetPaint() {
  if (!CARPET) return;
  const m = carpetMode();
  const s = $("#carpet-stars"); if (s) s.textContent = CARPET.caught;
  const hp = $("#carpet-hearts"); if (hp) hp.textContent = "❤️".repeat(Math.max(0, CARPET.hearts)) + "🖤".repeat(Math.max(0, CARPET_HEARTS - CARPET.hearts));
  const hc = $("#carpet-hchip"); if (hc) hc.className = "stack-chip" + (CARPET.hearts <= 1 ? " danger" : "");
  if (m.endless) { const tm = $("#carpet-time"); if (tm) tm.textContent = Math.floor(CARPET.elapsed / 1000) + "s"; }
  else { const pb = $("#carpet-prog"); if (pb) pb.style.width = Math.min(100, CARPET.elapsed / m.dur * 100) + "%"; }
  const fg = $("#carpet-fog"); if (fg) fg.style.opacity = (CARPET.fog * 0.94).toFixed(3);
}
function carpetTick() {
  if (!CARPET || CARPET.over) return;
  const m = carpetMode(), dt = CARPET_TICK / 1000;
  const sky = $("#carpet-sky"); if (!sky) return;
  const rect = sky.getBoundingClientRect(), skyW = rect.width, skyH = rect.height;
  CARPET.elapsed += CARPET_TICK;
  // ease lateral velocity toward the steer target — LOW gain = boat-like, heavy/slow to change heading
  CARPET.vx += (CARPET.steer * m.steer - CARPET.vx) * CARPET_TURN;
  const shift = CARPET.vx * dt;               // fly right (vx>0) → the whole sky slides left
  CARPET.bg = carpetClamp(CARPET.bg - CARPET.vx * dt * 0.5, -8, 8);
  const bg = $("#carpet-bg"); if (bg) bg.style.transform = `translateX(${CARPET.bg}%)`;
  const rug = $("#carpet-rug"); if (rug) rug.style.transform = `translateX(-50%) rotate(${carpetClamp(CARPET.vx * 0.34, -22, 22)}deg)`;
  const fall = m.fall * carpetRamp();
  // ---- spawns ----
  if (CARPET.elapsed >= CARPET.nextStarAt) { carpetAddStar(); if (Math.random() < 0.3) carpetAddStar(true); CARPET.nextStarAt = CARPET.elapsed + m.starEvery / carpetRamp(); }
  if (CARPET.elapsed >= CARPET.nextCloudAt) { carpetAddCloud(); CARPET.nextCloudAt = CARPET.elapsed + m.cloudEvery * (0.8 + Math.random() * 0.5); }
  if (CARPET.elapsed >= CARPET.nextPlanetAt) { if (!CARPET.planets.length) { carpetAddPlanet(); CARPET.nextPlanetAt = CARPET.elapsed + m.planetEvery * (0.85 + Math.random() * 0.4); } else { CARPET.nextPlanetAt = CARPET.elapsed + 700; } }  // one planet at a time
  // ---- stars: collect at the carpet row ----
  for (let i = CARPET.stars.length - 1; i >= 0; i--) {
    const s = CARPET.stars[i];
    if (s.done) { if (CARPET.elapsed >= s.cullAt) { if (s.el) s.el.remove(); CARPET.stars.splice(i, 1); } continue; }
    s.y += fall * dt; s.x -= shift;
    if (s.y >= CARPET_Y - 4 && s.y <= CARPET_Y + 8 && Math.abs(s.x - CARPET_X) <= CARPET_STAR_HALF) { s.good ? carpetCatchStar(s) : carpetStarHit(s); if (!CARPET) return; continue; }
    if (s.y > 122 || s.x < -30 || s.x > 130) { if (s.el) s.el.remove(); CARPET.stars.splice(i, 1); continue; }
    if (!s.good && s.el) s.el.classList.toggle("near", s.y > CARPET_Y - 22 && s.y < CARPET_Y + 8);
    if (s.el) { s.el.style.top = s.y + "%"; s.el.style.left = s.x + "%"; }
  }
  // ---- clouds: drift; fog builds while the carpet is inside one ----
  const cxp = skyW * CARPET_X / 100, cyp = skyH * CARPET_Y / 100;
  let inCloud = false;
  for (let i = CARPET.clouds.length - 1; i >= 0; i--) {
    const c = CARPET.clouds[i];
    c.y += fall * 0.5 * dt; c.x -= shift;
    if (c.y > 132 || c.x < -60 || c.x > 160) { if (c.el) c.el.remove(); CARPET.clouds.splice(i, 1); continue; }
    if (c.el) {
      c.el.style.top = c.y + "%"; c.el.style.left = c.x + "%";
      const hw = c.el.offsetWidth / 2, hh = c.el.offsetHeight / 2;
      const ccx = skyW * c.x / 100, ccy = skyH * c.y / 100;
      if (Math.abs(cxp - ccx) < hw * 0.72 && Math.abs(cyp - ccy) < hh * 0.72) inCloud = true;
    }
  }
  CARPET.fog = carpetClamp(CARPET.fog + (inCloud ? m.fogGain : -m.fogClear) * dt, 0, 1);
  // ---- planets: huge, slow; ANY contact ends the run ----
  const bodyR = CARPET_BODY / 100 * skyW;
  for (let i = CARPET.planets.length - 1; i >= 0; i--) {
    const c = CARPET.planets[i];
    c.y += fall * 0.37 * dt; c.x -= shift;   // planets drift down — a bit quicker so more of them pass by to dodge
    if (c.y > 100 + m.planetR * 1.4 || c.x < -140 || c.x > 240) { if (c.el) c.el.remove(); CARPET.planets.splice(i, 1); continue; }
    if (c.el) {
      c.el.style.top = c.y + "%"; c.el.style.left = c.x + "%";
      const pr = (c.el.offsetWidth / 2) * (CARPET_PLANET_BODY[c.img] || 0.78), pcx = skyW * c.x / 100, pcy = skyH * c.y / 100;
      const dist = Math.hypot(cxp - pcx, cyp - pcy);
      if (dist < pr + bodyR * 0.3) { carpetCrash(c); return; }   // only the actual planet body crashes you now
    }
  }
  carpetPaint();
  if (!m.endless && CARPET.elapsed >= m.dur) return carpetFinish(true);   // endless never "wins" — you fly until you crash
}
function carpetFinish(win, why) {
  if (!CARPET) return;
  carpetMusicStop();
  const m = carpetMode(), caught = CARPET.caught, secs = Math.floor(CARPET.elapsed / 1000), endless = m.endless;
  CARPET.over = true;
  if (CARPET.tickTimer) { clearInterval(CARPET.tickTimer); CARPET.tickTimer = null; }
  CARPET = null;
  if (endless) return carpetFinishInfinite(secs, caught);
  let outcome;
  if (win) {
    const stars = caught >= 16 ? 3 : caught >= 8 ? 2 : 1;
    const gold = 55 + caught * 4, dust = 6 + stars * 3;
    grantReward({ gold, stardust: dust }); save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    outcome = { emoji: "🏝️", title: "You reached the Oasis!", cls: "win",
      lines: [`<div class="stat-line"><span>Stars collected</span><span>${caught} · ${"⭐".repeat(stars)}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`],
      note: "You soared clear across the desert sky and touched down at the shimmering Oasis. Magical flying!" };
  } else {
    save();
    const hearts = why === "hearts";
    outcome = { emoji: hearts ? "✦" : "💫", title: hearts ? "Too many wrong stars!" : "Crashed into a planet!", cls: "lose",
      lines: [`<div class="stat-line"><span>Stars collected</span><span>${caught}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="muted">none — try again!</span></div>`],
      note: hearts ? "Those blue-purple stars sting — steer so only the GOLD ones line up with your carpet. Collect gold, dodge blue!"
                   : "The planets are huge — steer well clear the moment you see one edge onto the screen. And don't linger in a cloud, or you'll be flying blind straight into one!" };
  }
  html("event", `
    ${hud("Forgotten Oasis")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="carpet-next">Continue  →</button>
  `);
  on("#carpet-next", "click", startRound);
  show("event");
}
// Infinite mode result: survival time + a top-3 high-score board.
function carpetFinishInfinite(secs, caught) {
  const best = (GAME.carpetBest || []).slice();
  const isBest = !best.length || secs > best[0];
  best.push(secs); best.sort((a, b) => b - a); GAME.carpetBest = best.slice(0, 3);
  const gold = 25 + secs * 2 + caught * 2, dust = 3 + Math.floor(caught / 4);
  grantReward({ gold, stardust: dust }); save();
  if (isBest) { SFX.perfect(); SFX.bigCoin(); confettiOver($("#app")); } else SFX.sneeze();
  const medals = ["🥇", "🥈", "🥉"];
  const board = GAME.carpetBest.map((s, i) => `<div class="stat-line"><span>${medals[i]} ${(i === 0 && isBest) ? "<b style='color:var(--good)'>New best!</b>" : ""}</span><span>${s}s</span></div>`).join("");
  html("event", `
    ${hud("Forgotten Oasis")}
    <div class="grow center" style="gap:12px">
      <div class="ph big">${isBest ? "🏆" : "💫"}</div>
      <div class="result-title ${isBest ? "win" : "lose"}">${isBest ? "New high score!" : `You flew ${secs}s!`}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>You lasted</span><span><b>${secs}s</b> · ⭐ ${caught}</span></div>
        <div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>
      </div>
      <div class="card" style="width:100%;max-width:320px"><div class="stat-line" style="opacity:.8"><span>Best flights</span><span></span></div>${board}</div>
    </div>
    <button class="btn" id="carpet-next">Continue  →</button>
  `);
  on("#carpet-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* MOUSE BOUTIQUE — "Stitch & Scurry" (King's Courtyard). A light time-       */
/* management game: the mice run a dress shop and orders pour in. Each gown   */
/* has a recipe printed on its ticket — a path through the work tables        */
/* (✂️ Cut → 🪡 Sew → 💎 Bead → 🎀 Trim). Tap a gown when it's READY (glowing) */
/* and a mouse scurries it to its next table. A table holds ONE gown at a     */
/* time, so keep the line moving or it clogs. Every order has a patience      */
/* meter — deliver enough gowns before too many customers storm off. Single-  */
/* tap-to-advance keeps it approachable (no aiming); the skill is throughput   */
/* and clearing bottlenecks. Verified winnable by a greedy auto-player.       */
/* ======================================================================= */
let BOUTIQUE = null;
const BQ_TICK = 90;                                 // ms per tick
const BQ_NAME = { fabric: "Fabric", cut: "Cut", sew: "Sew", bead: "Bead", trim: "Trim" };
const BQ_PROC = { fabric: 1500, cut: 2000, sew: 2400, bead: 2100, trim: 2000 };   // base processing ms per table (× mode.procScale)
// where each station's drop-zone sits on the boutique_bg art (% of the play area)
const BQ_POS = { fabric: { x: 25, y: 27 }, cut: { x: 72, y: 29 }, bead: { x: 25, y: 50 }, sew: { x: 70, y: 50 }, trim: { x: 46, y: 69 } };
const BQ_COLORS = 8;                                // dress colours (art/bq_dress_1..8_*)
const BQ_SFX = { fabric: "whoosh", cut: "chop", sew: "count", bead: "charm", trim: "bonus" };   // a distinct sound as each table finishes
const BOUTIQUE_MODES = {
  easy:   { label: "Easy",   stations: ["fabric", "cut", "sew", "trim"],          procScale: 1.1, patience: 27000, spawnEvery: 4800, maxConcurrent: 2, goal: 6,  maxLost: 5, beadChance: 0,    reworkChance: 0 },
  medium: { label: "Medium", stations: ["fabric", "cut", "sew", "bead", "trim"],  procScale: 1.0, patience: 23000, spawnEvery: 4200, maxConcurrent: 3, goal: 8,  maxLost: 4, beadChance: 0.5,  reworkChance: 0 },
  hard:   { label: "Hard",   stations: ["fabric", "cut", "sew", "bead", "trim"],  procScale: 0.9, patience: 20000, spawnEvery: 3700, maxConcurrent: 3, goal: 9,  maxLost: 4, beadChance: 0.55, reworkChance: 0.2 },
};
function boutiqueMode() { return BOUTIQUE_MODES[BOUTIQUE.mode]; }
function boutiqueRecipe(m) {
  const r = ["fabric", "cut", "sew"];
  if (m.reworkChance && Math.random() < m.reworkChance) r.push("cut");             // "needs more fabric" — back to cutting
  if (m.stations.indexOf("bead") >= 0 && Math.random() < m.beadChance) r.push("bead");
  if (m.stations.indexOf("trim") >= 0) r.push("trim");
  return r;
}
// which dress-stage sprite to show, based on the stations this order has COMPLETED
function boutiqueStage(o) {
  const done = o.recipe.slice(0, o.step), has = s => done.indexOf(s) >= 0;
  if (has("trim") && has("bead")) return "trim";       // fully finished
  if (has("trim")) return "trimonly";
  if (has("bead")) return "beadonly";
  if (has("sew")) return "sew";
  if (has("cut")) return "cut";
  return "fabric";                                     // raw bolt
}
function renderBoutiqueIntro() {
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("Mouse Boutique")}
    <div class="grow center" style="gap:12px">
      <div class="ph big">🐭</div>
      <div style="font-weight:800;font-size:20px">Mouse Boutique</div>
      <div class="speech">“Gowns for the ball, and every stepsister wants hers first! Run the mice through the shop and get each dress out the door in time.”</div>
      <div class="card" style="width:100%;max-width:330px">
        <div class="stat-line"><span>Tap a glowing dress</span><span>scurries it to its next table</span></div>
        <div class="stat-line"><span>The tables</span><span>Fabric → Cut → Sew → Bead → Trim</span></div>
        <div class="stat-line"><span>One dress per table</span><span style="color:var(--bad)">keep the line moving!</span></div>
        <div class="stat-line"><span>Deliver enough</span><span style="color:var(--good)">before they storm off ⏳</span></div>
      </div>
      <div class="muted" style="max-width:300px">The icons above each dress show the tables it still needs — they drop off as it's made, and the dress itself takes shape stage by stage. A table only holds one dress, so if its next table's busy, tapping it hops it back to the line.</div>
    </div>
    <div class="wolf-modes">
      <button class="btn good" id="bq-easy">🟢 Easy</button>
      <button class="btn" id="bq-medium">🟡 Medium</button>
      <button class="btn" id="bq-hard">🔴 Hard</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn secondary" id="bq-skip">Not now</button>
  `);
  on("#bq-easy", "click", () => boutiqueStart("easy"));
  on("#bq-medium", "click", () => boutiqueStart("medium"));
  on("#bq-hard", "click", () => boutiqueStart("hard"));
  on("#bq-skip", "click", startRound);
  show("event");
}
function boutiqueStart(mode) {
  SFX.unlock();   // the mode-button tap is a real gesture — resume audio so table sounds play
  mode = BOUTIQUE_MODES[mode] ? mode : "easy";
  const m = BOUTIQUE_MODES[mode];
  BOUTIQUE = { mode, orders: [], stations: {}, uid: 0, elapsed: 0, nextSpawnAt: 0, delivered: 0, lost: 0, over: false, tickTimer: null };
  m.stations.forEach(s => BOUTIQUE.stations[s] = null);
  boutiquePlay();
  boutiqueSpawn(); BOUTIQUE.nextSpawnAt = m.spawnEvery;   // first gown right away
  BOUTIQUE.tickTimer = setInterval(boutiqueTick, BQ_TICK);
}
function boutiquePlay() {
  const m = boutiqueMode();
  const zones = m.stations.map(st => `
    <div class="bq-zone" id="bq-zone-${st}" style="left:${BQ_POS[st].x}%;top:${BQ_POS[st].y}%">
      <div class="bq-slot" id="bq-slot-${st}"></div>
      <div class="bq-proc"><i id="bq-proc-${st}"></i></div>
    </div>`).join("");
  html("event", `
    ${hud("Mouse Boutique")}
    <div class="bq-shop mg-fullbleed" id="bq-shop">
      <div class="bq-hud">
        <div class="bq-chip">👗 <b id="bq-delivered">0/${m.goal}</b></div>
        <div class="bq-chip" id="bq-lost-chip">😖 <b id="bq-lost">0/${m.maxLost}</b></div>
      </div>
      ${zones}
      <div class="bq-supply"><div class="bq-slot bq-supply-slot" id="bq-slot-supply"></div></div>
    </div>
    <p class="muted stack-hint" style="text-align:center;font-size:12px;margin:4px 0 2px">Tap a dress to send it on • if its next table's busy it hops back to the line</p>
  `);
  show("event");
  const shop = $("#bq-shop");
  if (shop) shop.addEventListener("pointerdown", e => { const t = e.target.closest("[data-order]"); if (t) { e.preventDefault(); boutiqueAdvance(+t.dataset.order); } });
  boutiquePaint();
}
// each dress carries its own REMAINING recipe above it (station icons in cream chips) — done steps drop off
function boutiqueRemainHtml(o) {
  if (o.station === "supply") return "";   // orders waiting in the line show no recipe icons
  if (o.step >= o.recipe.length) return '<span class="bq-ic now"><span class="bq-ic-done">📦</span></span>';
  return o.recipe.slice(o.step).map((st, i) => `<span class="bq-ic${i === 0 ? " now" : ""}"><img src="art/bq_ic_${st}.webp?v=${BUILD}" alt="${st}"></span>`).join("");
}
function boutiqueStateClass(o) { return (o.step >= o.recipe.length && o.ready) ? "done" : o.ready ? "ready" : "proc"; }
// A never-touched order waiting in the line shows its mouse customer; once it enters
// a table (started) it becomes the bolt/dress-stage sprite — so the fabric table shows a bolt.
function boutiqueDressSrc(o) { const st = boutiqueStage(o); return (!o.started && st === "fabric") ? `art/bq_mouse_${o.color}.webp?v=${BUILD}` : `art/bq_dress_${o.color}_${st}.webp?v=${BUILD}`; }
function boutiqueAddOrderEl(o) {
  const slot = $("#bq-slot-supply"); if (!slot) return;
  const el = document.createElement("div");
  el.className = "bq-order " + boutiqueStateClass(o); el.id = "bq-order-" + o.id; el.dataset.order = o.id;
  el.innerHTML = `<div class="bq-remain" id="bq-remain-${o.id}">${boutiqueRemainHtml(o)}</div>
    <img class="bq-dress" id="bq-dress-${o.id}" src="${boutiqueDressSrc(o)}" draggable="false" alt="dress">
    <div class="bq-opat"><i id="bq-opat-${o.id}"></i></div>`;
  slot.appendChild(el); o.el = el;
}
function boutiqueUpdateOrder(o) {
  if (!o.el) return;
  o.el.className = "bq-order " + boutiqueStateClass(o);
  const r = $("#bq-remain-" + o.id); if (r) r.innerHTML = boutiqueRemainHtml(o);
  const d = $("#bq-dress-" + o.id); if (d) d.src = boutiqueDressSrc(o);
}
function boutiqueMoveOrderEl(o, station) {
  const slot = $("#bq-slot-" + station); if (slot && o.el) slot.appendChild(o.el);
}
function boutiqueSpawn() {
  const m = boutiqueMode();
  const used = BOUTIQUE.orders.map(x => x.color), avail = [];
  for (let c = 1; c <= BQ_COLORS; c++) if (used.indexOf(c) < 0) avail.push(c);   // avoid two dresses of the same colour in play
  const color = avail.length ? R.pick(avail) : R.int(1, BQ_COLORS);
  const o = { id: ++BOUTIQUE.uid, recipe: boutiqueRecipe(m), step: 0, color, born: BOUTIQUE.elapsed, patience: m.patience, station: "supply", procStart: null, procDur: 0, ready: true, started: false, el: null };
  BOUTIQUE.orders.push(o);
  boutiqueAddOrderEl(o);
  boutiquePaint();
  SFX.reveal();
}
function boutiqueAdvance(id) {
  if (!BOUTIQUE || BOUTIQUE.over) return;
  const m = boutiqueMode(), o = BOUTIQUE.orders.find(x => x.id === id);
  if (!o || !o.ready) return;
  if (o.step >= o.recipe.length) return boutiqueDeliver(o);   // fully finished → deliver it
  const target = o.recipe[o.step], occ = BOUTIQUE.stations[target];
  if (occ != null && occ !== o.id) {   // next table busy
    if (o.station !== "supply") {       // hop it back to the fabric line so you can unclog the jam
      BOUTIQUE.stations[o.station] = null;
      o.station = "supply";
      boutiqueMoveOrderEl(o, "supply");
      boutiqueUpdateOrder(o);
      SFX.whoosh();
    } else {                            // already in line and its table is busy — just wait
      SFX.chop();
      const st = $("#bq-st-" + target); if (st) { st.classList.remove("busy"); void st.offsetWidth; st.classList.add("busy"); }
      if (o.el) { o.el.classList.remove("nudge"); void o.el.offsetWidth; o.el.classList.add("nudge"); }
    }
    return;
  }
  if (o.station !== "supply" && o.station !== target && BOUTIQUE.stations[o.station] === o.id) BOUTIQUE.stations[o.station] = null;
  const moved = o.station !== target;
  BOUTIQUE.stations[target] = o.id;
  o.station = target; o.started = true; o.ready = false; o.procStart = BOUTIQUE.elapsed; o.procDur = BQ_PROC[target] * m.procScale;
  if (moved) boutiqueMoveOrderEl(o, target);
  boutiqueUpdateOrder(o);
  SFX.scoop();
}
function boutiqueDeliver(o) {
  if (BOUTIQUE.stations[o.station] === o.id) BOUTIQUE.stations[o.station] = null;
  BOUTIQUE.delivered++;
  SFX.coin(); SFX.charm();
  if (o.el) { const el = o.el; el.className = "bq-order delivered"; el.addEventListener("animationend", () => el.remove()); }
  const i = BOUTIQUE.orders.indexOf(o); if (i >= 0) BOUTIQUE.orders.splice(i, 1);
  boutiquePaint();
  if (BOUTIQUE.delivered >= boutiqueMode().goal) return boutiqueFinish(true);
}
function boutiqueLose(o) {
  if (BOUTIQUE.stations[o.station] === o.id) BOUTIQUE.stations[o.station] = null;
  BOUTIQUE.lost++;
  SFX.sneeze();
  if (o.el) { const el = o.el; el.className = "bq-order lost"; el.addEventListener("animationend", () => el.remove()); }
  const i = BOUTIQUE.orders.indexOf(o); if (i >= 0) BOUTIQUE.orders.splice(i, 1);
  boutiquePaint();
  if (BOUTIQUE.lost >= boutiqueMode().maxLost) return boutiqueFinish(false);
}
function boutiquePaint() {
  if (!BOUTIQUE) return;
  const m = boutiqueMode();
  const d = $("#bq-delivered"); if (d) d.textContent = BOUTIQUE.delivered + "/" + m.goal;
  const l = $("#bq-lost"); if (l) l.textContent = BOUTIQUE.lost + "/" + m.maxLost;
  const lc = $("#bq-lost-chip"); if (lc) lc.className = "bq-chip" + (BOUTIQUE.lost >= m.maxLost - 1 ? " danger" : "");
  BOUTIQUE.orders.forEach(o => {
    const bar = $("#bq-opat-" + o.id);
    if (bar) { const left = Math.max(0, 1 - (BOUTIQUE.elapsed - o.born) / o.patience); bar.style.width = (left * 100) + "%"; bar.className = left < 0.25 ? "danger" : left < 0.5 ? "amber" : ""; }
  });
  m.stations.forEach(st => {
    const bar = $("#bq-proc-" + st); if (!bar) return;
    const id = BOUTIQUE.stations[st], o = id != null ? BOUTIQUE.orders.find(x => x.id === id) : null;
    const working = o && !o.ready && o.procStart != null;
    bar.style.width = working ? Math.min(100, (BOUTIQUE.elapsed - o.procStart) / o.procDur * 100) + "%" : "0%";
    if (bar.parentElement) bar.parentElement.classList.toggle("on", !!working);
  });
}
function boutiqueTick() {
  if (!BOUTIQUE || BOUTIQUE.over) return;
  const m = boutiqueMode();
  BOUTIQUE.elapsed += BQ_TICK;
  // finished processing → ready to move on
  BOUTIQUE.orders.forEach(o => {
    if (!o.ready && o.procStart != null && BOUTIQUE.elapsed - o.procStart >= o.procDur) {
      const finished = o.station;
      o.ready = true; o.procStart = null; o.step++;
      boutiqueUpdateOrder(o);
      if (o.el) { o.el.classList.remove("justdone"); void o.el.offsetWidth; o.el.classList.add("justdone"); o.el.addEventListener("animationend", () => { if (o.el) o.el.classList.remove("justdone"); }, { once: true }); }
      (SFX[BQ_SFX[finished]] || SFX.pop)();
    }
  });
  // patience ran out → customer storms off
  for (let i = BOUTIQUE.orders.length - 1; i >= 0; i--) {
    const o = BOUTIQUE.orders[i];
    if (BOUTIQUE.elapsed - o.born >= o.patience) { boutiqueLose(o); if (!BOUTIQUE) return; }
  }
  // new order (respect the concurrency cap)
  if (BOUTIQUE.elapsed >= BOUTIQUE.nextSpawnAt && BOUTIQUE.orders.length < m.maxConcurrent) {
    boutiqueSpawn(); BOUTIQUE.nextSpawnAt = BOUTIQUE.elapsed + m.spawnEvery;
  }
  boutiquePaint();
}
function boutiqueFinish(win) {
  if (!BOUTIQUE) return;
  const m = boutiqueMode(), delivered = BOUTIQUE.delivered, lost = BOUTIQUE.lost;
  BOUTIQUE.over = true;
  if (BOUTIQUE.tickTimer) { clearInterval(BOUTIQUE.tickTimer); BOUTIQUE.tickTimer = null; }
  BOUTIQUE = null;
  let outcome;
  if (win) {
    const stars = lost === 0 ? 3 : lost <= 1 ? 2 : 1;
    const gold = 45 + delivered * 6, dust = 5 + stars * 2;
    grantReward({ gold, stardust: dust }); save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    outcome = { emoji: "👗", title: "The boutique's a hit!", cls: "win",
      lines: [`<div class="stat-line"><span>Gowns delivered</span><span>${delivered} · ${"⭐".repeat(stars)}</span></div>`,
              `<div class="stat-line"><span>Orders lost</span><span>${lost}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`],
      note: "Every gown out the door in time — the mice are the toast of the Courtyard!" };
  } else {
    save();
    outcome = { emoji: "🧵", title: "The orders piled up!", cls: "lose",
      lines: [`<div class="stat-line"><span>Gowns delivered</span><span>${delivered}</span></div>`,
              `<div class="stat-line"><span>Orders lost</span><span style="color:var(--bad)">${lost}</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="muted">none — try again!</span></div>`],
      note: "Too many customers stormed off. Move a dress the instant it glows, and keep every table busy so the line never clogs!" };
  }
  html("event", `
    ${hud("King's Courtyard")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="bq-next">Continue  →</button>
  `);
  on("#bq-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* THE ROYAL BALL — a King's Courtyard dance lesson. You are the dance       */
/* TEACHER; a clumsy courtier is your student. Two acts, back to back:       */
/*   Act 1 (Rehearsal): the choreography is called out in a bubble on the    */
/*     beat — tap the matching move to demonstrate the step.                 */
/*   Act 2 (The Ball): the SAME routine, no hints — lead it from memory.     */
/* Learn the rhythm, then recall it. Teach enough steps right and your       */
/* student dances beautifully and rewards you. Early students (a clumsy      */
/* knight, then a prince) give generic prizes like keys; Cinderella is the   */
/* finale of the realm and gives a rare skin. (This build: the knight.)      */
/* ======================================================================= */
let DANCE = null;
// The four dance moves — the shared "alphabet" every routine is built from.
// pose = which dancer frame plays this move (frame 1 is the idle/start pose);
// btn  = the baked move-button art in art/ui/.
const DANCE_MOVES = [
  { id: "left",    icon: "↩️", name: "Twirl Left",  pose: 2, btn: "dance_move_1" },
  { id: "right",   icon: "↪️", name: "Twirl Right", pose: 3, btn: "dance_move_2" },
  { id: "toe",     icon: "🩰", name: "Tiptoes",     pose: 4, btn: "dance_move_3" },
  { id: "curtsey", icon: "💃", name: "Curtsey",     pose: 5, btn: "dance_move_4" },
];
const DANCE_MOVE_BY_ID = {}; DANCE_MOVES.forEach(m => DANCE_MOVE_BY_ID[m.id] = m);
// Dance students you teach. The knight is first; the prince and Cinderella
// slot in here later as one row each (Cinderella carries a rare-skin prize).
// beatMs = time between beats (steady metronome); approach = how long the
// marker slides toward the hit line before the beat lands.
const DANCE_PARTNERS = {
  knight: {
    id: "knight", emoji: "🤺", name: "Sir Wobble", title: "A Clumsy Knight",
    poses: "knight_dance", worried: null,   // 5 pose frames; no separate worried set yet
    steps: 6, beatMs: 2000, approach: 1400, passFrac: 0.6,   // pass = score >= passFrac of the max
    keyAt: 80, starAt: 92,   // the 🗝️ key + ✨ stardust need a genuinely good show
    line: "“I'm to dance at the royal ball tonight and I've got two left feet! Teach me the steps, please?”",
    reward: { gold: 45, keys: 1, stardust: 6 }, prizeTxt: "🪙 gold — dance well for a 🗝️ key!",
    winNote: "“I did it! Look at me twirl — right on the beat!” Sir Wobble bows and presses a key into your hand. 🗝️",
    loseNote: "“Oof — I keep losing the rhythm!” He laughs it off. Come teach him another time!",
  },
  prince: {
    id: "prince", emoji: "🤴", name: "Prince Featherfoot", title: "An Eager Prince",
    poses: "prince_dance", worried: null,
    steps: 7, beatMs: 1750, approach: 1250, passFrac: 0.62,   // quicker beat than the knight
    keyAt: 82, starAt: 93,
    line: "“I'm to lead the very first dance at my own ball — and I keep tangling in my cape! Coach me, please?”",
    reward: { gold: 70, keys: 1, stardust: 8 }, prizeTxt: "🪙 gold — impress him for a 🗝️ key!",
    winNote: "“Magnificent! I shan't trip once tonight.” The prince flourishes his cape and rewards you handsomely.",
    loseNote: "“Blast this cape!” He laughs it off. Come drill him again another time!",
  },
  cinderella: {
    id: "cinderella", emoji: "👸", name: "Cinderella", title: "Before the Stroke of Twelve",
    poses: "cinderella_dance", worried: "cinderella_worried",   // her worried looks show on a botched move
    steps: 8, beatMs: 1550, approach: 1100, passFrac: 0.66,     // fastest, fussiest routine
    keyAt: 84, starAt: 94,
    line: "“The ball is tonight and my nerves are all aflutter! Help me float across the floor like a dream?”",
    reward: { gold: 90, keys: 2, stardust: 12 }, prizeTxt: "🪙 gold + a 🗝️ key — dazzle for a rare 👠 skin!",
    skinPrize: "cauldron_glass",   // rare cauldron skin, earned by a graceful ball
    winNote: "“I feel like I'm floating!” Cinderella beams and presses a shimmering glass token into your hands. 👠",
    loseNote: "“Oh dear — two left slippers!” She giggles. Try again before midnight!",
  },
};
// Timing tiers, judged by how far your tap lands from the beat (ms). Right move
// AND on the beat scores best; drift early/late and you lose points; wrong move
// or no tap scores nothing. Points are summed; pass = passFrac of the max.
const DANCE_WIN = { perfect: 160, good: 360, ok: 620 };      // |offset| windows (ms)
const DANCE_PTS = { perfect: 100, good: 74, ok: 44, drift: 18, wrong: 0, miss: 0 };
function danceJudge(correct, offset) {
  if (!correct) return { tier: "wrong", pts: DANCE_PTS.wrong };
  const a = Math.abs(offset);
  if (a <= DANCE_WIN.perfect) return { tier: "perfect", pts: DANCE_PTS.perfect };
  if (a <= DANCE_WIN.good)    return { tier: "good",    pts: DANCE_PTS.good };
  if (a <= DANCE_WIN.ok)      return { tier: "ok",      pts: DANCE_PTS.ok };
  return { tier: offset < 0 ? "early" : "late", pts: DANCE_PTS.drift };
}
function danceMaxScore() { return DANCE.total * DANCE_PTS.perfect; }
function danceMeterPct() { return Math.round((DANCE.score / danceMaxScore()) * 100); }
function danceRoutine(n) { const r = []; for (let i = 0; i < n; i++) r.push(R.pick(DANCE_MOVES).id); return r; }
// Which courtier turns up: the knight teaches you the ropes; the eager prince
// joins after a couple of lessons, and Cinderella (the fussiest, with a rare
// skin prize) once you've taught a few.
function pickDancePartner() {
  const n = GAME.danceLessons || 0, pool = ["knight"];
  if (n >= 2) pool.push("prince");
  if (n >= 4) pool.push("cinderella");
  return R.pick(pool);
}
function renderDanceIntro(partnerId) {
  const p = DANCE_PARTNERS[partnerId] || DANCE_PARTNERS.knight;
  dancePreload(p);   // warm every pose now so mid-dance swaps are instant
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("A Royal Ball!")}
    <div class="grow center" style="gap:14px">
      <div class="dance-hero">${p.poses ? `<img src="art/${p.poses}_1.webp?v=${BUILD}" alt="${p.name}" draggable="false">` : `<div class="ph big">${p.emoji}</div>`}</div>
      <div style="font-weight:800;font-size:20px">${p.name}</div>
      <div class="speech">${p.line}</div>
      <div class="card" style="width:100%;max-width:330px">
        <div class="stat-line"><span>Act 1 · Rehearsal</span><span>follow the called steps 💃</span></div>
        <div class="stat-line"><span>Act 2 · The Ball</span><span>same steps, from memory 🎼</span></div>
        <div class="stat-line"><span>Teach him well</span><span class="gold">${p.prizeTxt}</span></div>
      </div>
      <div class="muted" style="max-width:310px">Four moves, four buttons. A marker slides to the beat line — tap the move <b>right as it lands on the beat</b>. Off-rhythm or the wrong move costs you! Rehearse first, then lead the <b>same routine</b> from memory.</div>
    </div>
    <button class="btn good" id="dance-play">💃 Teach him to dance!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="dance-skip">Not now</button>
  `);
  on("#dance-play", "click", () => {
    DANCE = { p, phase: 1, routine: danceRoutine(p.steps), idx: 0, score: 0, nailed: 0,
      total: p.steps * 2, answered: true, feedback: null, armTime: 0, beatTime: 0,
      timer: null, cdTimer: null, tTimer: null };
    danceCountdown();
  });
  on("#dance-skip", "click", startRound);
  show("event");
}
function danceCountdown() {
  let n = 3;
  const tick = () => {
    if (!DANCE) return;
    DANCE.countdown = n;    // draw the full stage (dancer, meter, buttons) with a 3-2-1 overlay on top
    renderDance();
    SFX.pop(n > 0 ? 1 : 3);
    if (n > 0) { n--; DANCE.cdTimer = setTimeout(tick, 800); }
    else { DANCE.cdTimer = setTimeout(() => { if (DANCE) { DANCE.countdown = null; danceStep(); } }, 450); }
  };
  tick();
}
// Start the next step on the steady beat. The metronome fires every beatMs no
// matter when you tap, so the rhythm stays even; the marker slides to the hit
// line (the beat) over `approach` ms, then the metronome rolls to the next step.
function danceStep() {
  if (!DANCE) return;
  if (DANCE.idx >= DANCE.routine.length) {
    if (DANCE.phase === 1) { DANCE.phase = 2; DANCE.idx = 0; DANCE.feedback = null; danceBallTransition(); return; }
    danceFinish(); return;
  }
  DANCE.answered = false;
  DANCE.armTime = Date.now();
  DANCE.beatTime = DANCE.armTime + DANCE.p.approach; // the moment the marker hits the line
  renderDance();
  DANCE.timer = setTimeout(danceAdvance, DANCE.p.beatMs);
}
// The metronome tick: if the beat went untapped it's a miss, then roll forward.
function danceAdvance() {
  if (!DANCE) return;
  if (!DANCE.answered) {
    DANCE.answered = true;
    DANCE.feedback = { tier: "miss" };
    SFX.sneeze();
  }
  DANCE.idx++;
  danceStep();
}
// The show-stopping moment: hints drop away and the real music begins.
function danceBallTransition() {
  DANCE.pose = 1; DANCE.poseWorried = false;   // fresh idle pose to open Act 2
  html("event", `
    ${hud("The Ball Begins!")}
    <div class="grow center" style="gap:16px">
      <div class="dance-face" style="font-size:80px">🎼</div>
      <div class="result-title win">Now… from memory!</div>
      <p class="muted" style="max-width:300px">The music swells and the hints fade. Lead ${DANCE.p.name} through the <b>same routine</b> you just rehearsed!</p>
    </div>
  `);
  show("event");
  SFX.fanfare();
  DANCE.tTimer = setTimeout(() => { if (DANCE) danceStep(); }, 1600);
}
// A tap: judge the move AND the timing. `_testOffset` (ms from the beat) lets
// tests grade deterministically; live play measures against the real beat time.
function danceTap(moveId, _testOffset) {
  if (!DANCE || DANCE.answered) return;
  const correct = moveId === DANCE.routine[DANCE.idx];
  const offset = (typeof _testOffset === "number") ? _testOffset : (Date.now() - DANCE.beatTime);
  DANCE.answered = true;
  const j = danceJudge(correct, offset);
  DANCE.score += j.pts;
  if (j.tier === "perfect" || j.tier === "good") DANCE.nailed++;
  DANCE.feedback = { tier: j.tier };
  SFX[j.tier === "perfect" ? "coin" : j.tier === "good" || j.tier === "ok" ? "charm" : "sneeze"]();
  // the dancer performs the move you pressed — worried face if it was botched
  const mv = DANCE_MOVE_BY_ID[moveId];
  const botched = !correct || j.tier === "early" || j.tier === "late";
  danceSwapPose(mv ? mv.pose : 1, botched);
  dancePaintFeedback();   // update in place — DON'T re-render (that would restart the marker)
}
const DANCE_FB = {
  perfect: `<span style="color:var(--good)">Perfect! ✨</span>`,
  good:    `<span style="color:var(--good)">Good! 💫</span>`,
  ok:      `<span style="color:var(--gold)">A touch off…</span>`,
  early:   `<span style="color:var(--bad)">Too early!</span>`,
  late:    `<span style="color:var(--bad)">Too late!</span>`,
  wrong:   `<span style="color:var(--bad)">Wrong step!</span>`,
  miss:    `<span style="color:var(--bad)">Missed the beat!</span>`,
};
function dancePaintFeedback() {
  const sc = screen("event"); if (!sc) return;
  const fbEl = sc.querySelector("#dance-fb");
  if (fbEl) fbEl.innerHTML = DANCE.feedback ? (DANCE_FB[DANCE.feedback.tier] || "") : "";
  const gr = sc.querySelector("#dance-grace-fill");
  if (gr) gr.style.width = danceMeterPct() + "%";
  // glow green on a good beat, shake on a botched one (applied once the pose settles in)
  const img = sc.querySelector("#dance-dancer");
  if (img) {
    const good = DANCE.feedback && (DANCE.feedback.tier === "perfect" || DANCE.feedback.tier === "good");
    setTimeout(() => { if (!img.isConnected) return; img.classList.remove("glow-good", "glow-bad"); void img.offsetWidth; img.classList.add(good ? "glow-good" : "glow-bad"); }, 160);
  }
}
// The dancer image for a pose frame (frame 1 = idle/start). On a botched move,
// partners with a worried set show one of those faces instead.
function danceDancerSrc(p, poseNum, worried) {
  // ?v=BUILD cache-busts replaced pose art (the art system doesn't version URLs).
  // The four moves are poses 2..5; their worried faces are frames 1..4 in the same
  // order (twirl-left, twirl-right, tiptoes, curtsey) — so worried frame = pose - 1.
  if (worried && p.worried) return `art/${p.worried}_${Math.min(4, Math.max(1, poseNum - 1))}.webp?v=${BUILD}`;
  return `art/${p.poses}_${poseNum}.webp?v=${BUILD}`;
}
// Warm the browser cache with every pose so the swap on a button press is instant
// (the pose PNGs are big; without this the first show of each pose fetches/decodes
// mid-dance and the swap feels laggy).
function dancePreload(p) {
  if (!p || !p.poses) return;
  const warm = src => { const im = new Image(); im.src = src; };
  for (let i = 1; i <= 5; i++) warm(`art/${p.poses}_${i}.webp?v=${BUILD}`);
  if (p.worried) for (let i = 1; i <= 4; i++) warm(`art/${p.worried}_${i}.webp?v=${BUILD}`);
}
// Quick fade-out / fade-in when the dancer changes pose (on a button press).
// The pose is remembered so the dancer HOLDS it until the next button is pressed.
function danceSwapPose(poseNum, worried) {
  if (DANCE) { DANCE.pose = poseNum; DANCE.poseWorried = worried; }
  const img = document.getElementById("dance-dancer"); if (!img || !DANCE) return;
  const src = danceDancerSrc(DANCE.p, poseNum, worried);
  img.classList.remove("glow-good", "glow-bad");
  img.classList.add("swapping");                          // fade + settle out
  setTimeout(() => { if (img.isConnected) { img.src = src; img.classList.remove("swapping"); } }, 150);
}
function renderDance() {
  const D0 = DANCE, p = D0.p, moveId = D0.routine[D0.idx];
  const rehearse = D0.phase === 1;
  const counting = D0.countdown != null;            // 3-2-1 overlay drawn over the live stage
  const meterPct = danceMeterPct();
  const targetPct = Math.round(p.passFrac * 100);
  const zonePct = Math.round((p.approach / p.beatMs) * 100); // where the beat line sits on the track
  const fb = D0.feedback;
  const fbTxt = fb ? (DANCE_FB[fb.tier] || "")
    : (rehearse ? "Tap the move on the beat!" : "Lead it from memory — on the beat!");
  const mv = DANCE_MOVE_BY_ID[moveId];
  const announce = counting
    ? `<b>Take your positions…</b>`
    : rehearse
    ? `<span class="dance-cue-ic">${mv.icon}</span> <b>${mv.name}!</b>`
    : `<span class="dance-cue-ic">❓</span> <b>What comes next?</b>`;
  const subTxt = counting ? "Get ready to dance!"
    : `${rehearse ? "Act 1" : "Act 2"} · Step ${Math.min(D0.idx + 1, p.steps)}/${p.steps} · <span id="dance-fb" class="dance-fb">${fbTxt}</span>`;
  const buttons = DANCE_MOVES.map(m =>
    `<button class="dance-btn" data-id="${m.id}"><img src="art/ui/${m.btn}.png" alt="${m.name}" draggable="false"><span class="dance-btn-nm">${m.name}</span></button>`).join("");
  const overlay = counting
    ? `<div class="dance-countdown"><div class="cd-num ${D0.countdown === 0 ? "go" : ""}">${D0.countdown > 0 ? D0.countdown : "Dance!"}</div></div>`
    : "";
  html("event", `
    ${hud(counting ? "Get Ready!" : rehearse ? "Rehearsal 💃" : "The Ball 🎼")}
    <div class="dance-stage mg-fullbleed">
      <div class="dance-grace top"><i id="dance-grace-fill" style="width:${meterPct}%"></i><span class="dance-grace-mark" style="left:${targetPct}%"></span></div>
      <div class="dance-dancer">
        <img class="dance-dancer-img" id="dance-dancer" src="${danceDancerSrc(p, D0.pose || 1, D0.poseWorried)}" alt="${p.name}" draggable="false">
      </div>
      <div class="dance-announce">
        <div class="dance-cue">${announce}</div>
        <div class="dance-sub">${subTxt}</div>
      </div>
      <div class="beat-track">
        <span class="beat-zone" style="left:${zonePct - 8}%;width:16%"></span>
        <span class="beat-line" style="left:${zonePct}%"></span>
        <i class="beat-marker" id="beat-marker"></i>
      </div>
      <div class="dance-buttons">${buttons}</div>
      ${overlay}
    </div>
  `);
  $("#screen-event").querySelectorAll(".dance-btn").forEach(b =>
    b.addEventListener("click", () => danceTap(b.dataset.id)));
  show("event");
  // Slide the marker across the track, reaching the beat line exactly on the beat
  // and the far end when the metronome rolls to the next step. (Not during the countdown.)
  if (!counting) {
    const mk = $("#beat-marker");
    if (mk) { mk.style.transition = "none"; mk.style.left = "0%";
      requestAnimationFrame(() => { if (mk.isConnected) { mk.style.transition = "left " + p.beatMs + "ms linear"; mk.style.left = "100%"; } }); }
  }
}
// Reward scales with how well they danced: gold is proportional to the rhythm
// score, and the premium prizes (🗝️ key, ✨ stardust) need a genuinely good show —
// a barely-there pass earns a few coins and nothing more.
function danceReward(p, meterPct) {
  const base = p.reward || {}, r = {};
  if (base.gold) r.gold = Math.max(1, Math.round(base.gold * meterPct / 100));
  if (base.keys && meterPct >= (p.keyAt || 80)) r.keys = base.keys;
  if (base.stardust && meterPct >= (p.starAt || 92)) r.stardust = base.stardust;
  return r;
}
function danceGrade(meterPct) { return meterPct >= 92 ? "Flawless" : meterPct >= 80 ? "Graceful" : "Passable"; }
function danceFinish() {
  if (DANCE.timer) { clearTimeout(DANCE.timer); DANCE.timer = null; }
  const p = DANCE.p, nailed = DANCE.nailed, meterPct = danceMeterPct();
  const targetPct = Math.round(p.passFrac * 100), win = meterPct >= targetPct;
  GAME.danceLessons = (GAME.danceLessons || 0) + 1;
  let outcome;
  if (win) {
    const reward = danceReward(p, meterPct), got = grantReward(reward);
    // rare skin prize (Cinderella): a graceful ball earns her exclusive skin, once
    let skinLine = "";
    if (p.skinPrize && meterPct >= (p.keyAt || 80) && !GAME.owned[p.skinPrize]) {
      GAME.owned[p.skinPrize] = true;
      const cz = D.COSMETIC_BY_ID[p.skinPrize];
      if (cz) skinLine = `<div class="stat-line"><span>🎁 Rare skin earned!</span><span class="gold">${cz.chip} ${cz.name}</span></div>`;
    }
    save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    const grade = danceGrade(meterPct);
    outcome = { emoji: "🕺", title: grade + " dancing!", cls: "win",
      lines: [`<div class="stat-line"><span>On-beat steps</span><span>${nailed}/${DANCE.total}</span></div>`,
              `<div class="stat-line"><span>Rhythm score</span><span>${meterPct}%</span></div>`,
              `<div class="stat-line"><span>Your reward</span><span class="gold">${got}</span></div>`,
              skinLine],
      note: reward.keys ? p.winNote : `“Not my finest… but I made it through!” ${p.name} laughs it off and presses a few coins into your hand. Dance sharper next time for a 🗝️ key!` };
  } else {
    save(); SFX.sneeze();
    outcome = { emoji: "😅", title: "Lost the rhythm!", cls: "lose",
      lines: [`<div class="stat-line"><span>On-beat steps</span><span>${nailed}/${DANCE.total}</span></div>`,
              `<div class="stat-line"><span>Rhythm score</span><span>${meterPct}%</span></div>`,
              `<div class="stat-line"><span>Needed</span><span>${targetPct}% to shine</span></div>`],
      note: p.loseNote };
  }
  DANCE = null;
  html("event", `
    ${hud("The Royal Ball")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="dance-next">Next Customer  →</button>
  `);
  on("#dance-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* THE DRURY LANE BAKE-OFF — a spatial-memory event (the Muffin Man's realm).*/
/* Study a decorated treat, then recreate it from memory: pick a decoration  */
/* and tap the spots where it went. Six confusable decorations (swirl vs     */
/* dollop, cherry vs strawberry, choc vs rainbow sprinkles) make it a real   */
/* memory test. Score your accuracy → a 🥇/🥈/🥉 ribbon and a matching prize */
/* (even 3rd place earns a little). This build: the one-tier cake; the two-  */
/* and three-tier rounds escalate on the same engine next.                   */
/* ======================================================================= */
let CAKE = null;
// The six decorations — tap one, then tap a spot on the tier to place it.
const CAKE_DECOS = [
  { id: "peppermint", name: "Peppermint", emoji: "🍬" },
  { id: "strawberry", name: "Strawberry", emoji: "🍓" },
  { id: "cherry",     name: "Cherry",     emoji: "🍒" },
  { id: "flower",     name: "Flower",     emoji: "🌸" },
  { id: "crown",      name: "Crown",      emoji: "👑" },
  { id: "butterfly",  name: "Butterfly",  emoji: "🦋" },
];
const CAKE_DECO_BY_ID = {}; CAKE_DECOS.forEach(d => CAKE_DECO_BY_ID[d.id] = d);
// Slot positions per stage: CAKE_SLOTS[stage][tierIndex] = [[x,y]...] as fractions
// of the cake image (auto-measured from the art's circle guides).
const CAKE_SLOTS = {"1":[[[0.26,0.5376],[0.49,0.544],[0.72,0.5376]]],"2":[[[0.27,0.3027],[0.495,0.309],[0.72,0.3027]],[[0.14,0.7539],[0.32,0.7615],[0.5,0.764],[0.68,0.7615],[0.86,0.7539]]],"3":[[[0.3,0.2134],[0.5,0.219],[0.7,0.2134]],[[0.18,0.52],[0.34,0.5268],[0.5,0.529],[0.66,0.5268],[0.82,0.52]],[[0.13,0.8038],[0.276,0.8103],[0.422,0.8136],[0.568,0.8136],[0.714,0.8103],[0.86,0.8038]]],"4":[[[0.31,0.1638],[0.495,0.169],[0.68,0.1638]],[[0.19,0.3903],[0.345,0.3968],[0.5,0.399],[0.655,0.3968],[0.81,0.3903]],[[0.15,0.6192],[0.29,0.6255],[0.43,0.6286],[0.57,0.6286],[0.71,0.6255],[0.85,0.6192]],[[0.11,0.8619],[0.2417,0.8681],[0.3733,0.8718],[0.505,0.873],[0.6367,0.8718],[0.7683,0.8681],[0.9,0.8619]]],"5":[[[0.305,0.129],[0.485,0.134],[0.665,0.129]],[[0.13,0.2991],[0.3075,0.3065],[0.485,0.309],[0.6625,0.3065],[0.84,0.2991]],[[0.11,0.4885],[0.26,0.4952],[0.41,0.4986],[0.56,0.4986],[0.71,0.4952],[0.86,0.4885]],[[0.105,0.6949],[0.2367,0.7011],[0.3683,0.7048],[0.5,0.706],[0.6317,0.7048],[0.7633,0.7011],[0.895,0.6949]],[[0.09,0.8837],[0.2057,0.8892],[0.3214,0.8929],[0.4371,0.8948],[0.5529,0.8948],[0.6686,0.8929],[0.7843,0.8892],[0.9,0.8837]]]};
const CAKE_STUDY_MS = 4500;
const CAKE_MAX_TIER = 5;
const CAKE_PASS = 0.7;   // fraction of a tier's spots you must match to advance
// Ribbon + reward by the HIGHEST tier you complete. Tier 3 = first place; 4 & 5 are bonuses.
const CAKE_TIERS = {
  1: { ribbon: "🥉", place: "Third Place",            reward: { gold: 20 } },
  2: { ribbon: "🥈", place: "Second Place",           reward: { gold: 40 } },
  3: { ribbon: "🥇", place: "First Place!",           reward: { gold: 65, keys: 1, stardust: 6 } },
  4: { ribbon: "🥇", place: "First Place — plus a Bonus!", reward: { gold: 95, keys: 1, stardust: 10 } },
  5: { ribbon: "👑", place: "Grand Champion!",        reward: { gold: 140, keys: 2, stardust: 18 } },
};
// Decoration art: art/dec_<id>.png (see art README).
function cakeArt(id, cls) { const d = CAKE_DECO_BY_ID[id]; return ART.tag("dec_" + id, d ? d.emoji : "❔", cls || "cake-deco"); }
const CAKE_SLOT_COUNT = [3, 5, 6, 7, 8];             // spots per tier (tier 1 = 3, … tier 5 = 8)
function cakeTierSlots(tier) { return CAKE_SLOT_COUNT[tier - 1]; }
// Symmetrical (mirrored) pattern: choose the first half, mirror it to the second.
// Prettier, and easier to remember — the row reads the same left-to-right and back.
function cakeTarget(tier) {
  const n = cakeTierSlots(tier), t = new Array(n), half = Math.ceil(n / 2);
  for (let i = 0; i < half; i++) { const d = R.pick(CAKE_DECOS).id; t[i] = d; t[n - 1 - i] = d; }
  return t;
}
// Treat size (fraction of its spot): big enough to cover the printed circle,
// shrinking on busier tiers so neighbours don't overlap much.
function cakeDecoScale(n) { return ({ 3: 1.12, 5: 0.98, 6: 1.13, 7: 1.1, 8: 1.17 })[n] || 1.12; }
// Each placement spot spans the slot spacing, so hit areas tile without gaps.
function cakeSpotSizeFor(pos) {
  if (!pos || pos.length < 2) return 24;
  let gap = 1; for (let i = 1; i < pos.length; i++) gap = Math.min(gap, Math.abs(pos[i][0] - pos[i - 1][0]));
  return Math.max(12, Math.min(24, Math.round(gap * 100)));
}
const CAKE_RIBBON = ["", "🥉", "🥈", "🥇", "🥇", "👑"];
function renderCakeIntro() {
  CAKE = null;
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("The Drury Lane Bake-Off!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🧑‍🍳</div>
      <div style="font-weight:800;font-size:20px">The Bake-Off Judge</div>
      <div class="speech">“Welcome, decorator! Each tier I'll show you a decorated cake — study it, then place the treats back from memory. Nail three tiers for first place… and keep climbing for a bonus!”</div>
      <div class="card" style="width:100%;max-width:330px">
        <div class="stat-line"><span>Study</span><span>memorise the tier 👀</span></div>
        <div class="stat-line"><span>Decorate</span><span>place it back from memory 🧁</span></div>
        <div class="stat-line"><span>Tier 3</span><span class="gold">🥇 First place!</span></div>
        <div class="stat-line"><span>Tiers 4 & 5</span><span class="gold">👑 bonus prizes</span></div>
      </div>
    </div>
    <button class="btn good" id="cake-play">🧁 Enter the Bake-Off!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="cake-skip">Not now</button>
  `);
  on("#cake-play", "click", () => {
    CAKE = { tier: 0, passed: 0, targets: {}, placed: {}, phase: "study", tool: CAKE_DECOS[0].id, timer: null };
    cakeStartTier(1);
  });
  on("#cake-skip", "click", startRound);
  show("event");
}
// Harder tiers (more treats) get more time to memorise.
function cakeStudyMs(t) { return 2400 + cakeTierSlots(t) * 650; }
function cakeStartTier(t) {
  CAKE.tier = t;
  CAKE.targets[t] = cakeTarget(t);
  CAKE.phase = "study";
  CAKE.tool = CAKE_DECOS[0].id;
  CAKE.studyMs = cakeStudyMs(t);
  SFX.whoosh();
  renderCake();
  CAKE.timer = setTimeout(() => { if (CAKE) cakeToDecorate(); }, CAKE.studyMs);
}
function cakeToDecorate() {
  if (CAKE.timer) { clearTimeout(CAKE.timer); CAKE.timer = null; }
  CAKE.phase = "decorate";
  CAKE.placed[CAKE.tier] = new Array(cakeTierSlots(CAKE.tier)).fill(null);
  CAKE.fillIdx = 0;   // next empty slot (treats auto-fill left to right)
  CAKE.redo = [];     // undone treats, for redo
  SFX.pop(1);
  renderCake();
}
// Tapping a treat drops it into the next open spot (left to right).
function cakePlace(id) {
  if (!CAKE || CAKE.phase !== "decorate") return;
  const n = cakeTierSlots(CAKE.tier);
  if (CAKE.fillIdx >= n) { toast("This tier is full — press ✓ Present, or ↶ Undo to swap a treat."); return; }
  CAKE.placed[CAKE.tier][CAKE.fillIdx] = id; CAKE.fillIdx++; CAKE.redo = [];
  SFX.pop(2); renderCake();
}
function cakeUndo() {
  if (!CAKE || CAKE.phase !== "decorate" || CAKE.fillIdx <= 0) return;
  CAKE.fillIdx--; CAKE.redo.push(CAKE.placed[CAKE.tier][CAKE.fillIdx]);
  CAKE.placed[CAKE.tier][CAKE.fillIdx] = null; SFX.pop(1); renderCake();
}
function cakeRedo() {
  if (!CAKE || CAKE.phase !== "decorate" || !CAKE.redo || !CAKE.redo.length) return;
  CAKE.placed[CAKE.tier][CAKE.fillIdx] = CAKE.redo.pop(); CAKE.fillIdx++;
  SFX.pop(2); renderCake();
}
function renderCake() {
  const C = CAKE, t = C.tier, study = C.phase === "study", n = cakeTierSlots(t);
  // build every visible spot: finished tiers keep your placed treats; the current
  // tier shows the target while studying, then empty tappable spots while decorating
  const spots = [];
  for (let k = 1; k <= t; k++) {
    const pos = CAKE_SLOTS[t][k - 1], sz = cakeSpotSizeFor(pos), dsz = cakeDecoScale(pos.length);
    for (let j = 0; j < pos.length; j++) {
      const [x, y] = pos[j];
      let deco = null, cls = "";
      // finished tiers fade back while you memorise the new tier, so your eye lands
      // on the tier that matters right now
      if (k < t) { deco = (C.placed[k] || [])[j] || null; cls = study ? "done dim" : "done"; }
      else if (study) { deco = C.targets[t][j]; cls = "target"; }        // current tier — memorise (glows)
      else { deco = C.placed[t][j] || null; cls = (j === C.fillIdx ? "next" : ""); } // current tier — a soft cue marks where the next treat lands
      spots.push(`<div class="cake-spot ${deco ? "filled" : ""} ${cls}" style="left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:${sz}%;--dsz:${dsz}">${deco ? cakeArt(deco, "cake-spot-ic") : ""}</div>`);
    }
  }
  const placedCount = study ? 0 : (C.placed[t] || []).filter(Boolean).length;
  const tools = CAKE_DECOS.map(d =>
    `<button class="cake-tool2" data-id="${d.id}" title="${d.name}" aria-label="${d.name}">${cakeArt(d.id, "cake-tool2-ic")}</button>`).join("");
  const canUndo = !study && C.fillIdx > 0, canRedo = !study && C.redo && C.redo.length;
  html("event", `
    ${hud(study ? "Study Tier " + t + " 👀" : "Decorate Tier " + t + " 🧁")}
    <div class="cake-stage2 mg-fullbleed${study ? " studying" : ""}">
      <div class="cake-caption">${study
        ? `<b>Memorise</b> tier ${t} — where each treat sits…`
        : `Tap the treats in order — they fill left to right (${placedCount}/${n})`}</div>
      <div class="cake-arena">
        <div class="cake-view">
          <img class="cake-img ${t <= 1 ? "wide" : "tall"}" src="art/cake_stage_${t}.webp?v=${BUILD}" alt="cake" draggable="false">
          ${spots.join("")}
        </div>
      </div>
      ${study
        ? `<div class="cake-study-bar"><i id="cake-study-fill"></i></div>
           <button class="btn good" id="cake-ready">I've got it! →</button>`
        : `<div class="cake-actions">
             <button class="cake-act" id="cake-undo" ${canUndo ? "" : "disabled"}>↶ Undo</button>
             <button class="cake-act" id="cake-redo" ${canRedo ? "" : "disabled"}>Redo ↷</button>
           </div>
           <div class="cake-tools2">${tools}</div>
           <button class="btn good" id="cake-done">✓ Present tier ${t}</button>`}
    </div>
  `);
  if (study) {
    on("#cake-ready", "click", cakeToDecorate);
    const fill = $("#cake-study-fill");
    if (fill) { fill.style.transition = "none"; fill.style.width = "100%";
      requestAnimationFrame(() => { if (fill.isConnected) { fill.style.transition = "width " + (C.studyMs || CAKE_STUDY_MS) + "ms linear"; fill.style.width = "0%"; } }); }
  } else {
    $("#screen-event").querySelectorAll(".cake-tool2").forEach(b =>
      b.addEventListener("click", () => cakePlace(b.dataset.id)));
    on("#cake-undo", "click", cakeUndo);
    on("#cake-redo", "click", cakeRedo);
    on("#cake-done", "click", cakeSubmitTier);
  }
  show("event");
}
function cakeSubmitTier() {
  if (!CAKE) return;
  if (CAKE.timer) { clearTimeout(CAKE.timer); CAKE.timer = null; }
  const t = CAKE.tier, n = cakeTierSlots(t), target = CAKE.targets[t], placed = CAKE.placed[t] || [];
  let correct = 0; for (let i = 0; i < n; i++) if (placed[i] === target[i]) correct++;
  const pct = Math.round(correct / n * 100), pass = correct / n >= CAKE_PASS;
  if (pass) {
    CAKE.passed = t; SFX.perfect(); SFX.charm();
    if (t < CAKE_MAX_TIER) { cakeTierCleared(t, correct, n, pct); return; }
  } else { SFX.sneeze(); }
  cakeFinish(correct, n, pct);
}
function cakeTierCleared(t, correct, n, pct) {
  html("event", `
    ${hud("Tier " + t + " — Cleared! 🎂")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${CAKE_RIBBON[t]}</div>
      <div class="result-title win">Tier ${t} decorated!</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Treats matched</span><span>${correct}/${n} (${pct}%)</span></div>
        <div class="stat-line"><span>Up next</span><span>Tier ${t + 1} · ${cakeTierSlots(t + 1)} treats</span></div>
      </div>
      <p class="muted" style="max-width:300px">“Beautiful work! Onto the next tier…”</p>
    </div>
    <button class="btn good" id="cake-cont">Decorate Tier ${t + 1} →</button>
  `);
  on("#cake-cont", "click", () => { if (CAKE) cakeStartTier(t + 1); });
  show("event");
}
function cakeFinish(correct, n, pct) {
  const best = CAKE.passed;
  GAME.bakeoffs = (GAME.bakeoffs || 0) + 1;
  let outcome;
  if (best >= 1) {
    const info = CAKE_TIERS[best], got = grantReward(info.reward);
    if (best >= 3) confettiOver($("#app"));
    SFX.perfect(); SFX.bigCoin();
    outcome = { emoji: info.ribbon, title: info.place, cls: "win",
      lines: [`<div class="stat-line"><span>Tiers completed</span><span>${best} of 5</span></div>`,
              `<div class="stat-line"><span>Last tier</span><span>${correct}/${n} (${pct}%)</span></div>`,
              `<div class="stat-line"><span>Your prize</span><span class="gold">${got}</span></div>`],
      note: best >= 5 ? "“A five-tier masterpiece — Grand Champion of the Bake-Off!” 🎀"
          : best >= 3 ? "“Three flawless tiers — a blue-ribbon bake!” 🎀"
          : "“A lovely effort — here's your ribbon!”" };
  } else {
    outcome = { emoji: "😖", title: "No ribbon this time!", cls: "lose",
      lines: [`<div class="stat-line"><span>Tier 1</span><span>${correct}/${n} (${pct}%)</span></div>`,
              `<div class="stat-line"><span>Needed</span><span>${Math.round(CAKE_PASS * 100)}% to advance</span></div>`],
      note: "“Ooh, so close! Study a touch longer next time.” The judge waves you on with a smile." };
  }
  save();
  CAKE = null;
  html("event", `
    ${hud("The Drury Lane Bake-Off")}
    <div class="grow center" style="gap:12px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="cake-next">Next Customer  →</button>
  `);
  on("#cake-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* THE EVIL QUEEN — a villain event. She's stolen your Pet; brew a ransom    */
/* potion from her cursed pantry (bought with gold) to match her recipe and  */
/* win the Pet back plus a unique villain skin. Some ingredients hide poison. */
/* Cozy fallback: your Pet always comes home, win or lose — you just miss the */
/* skin. First of a planned villain series.                                  */
/* ======================================================================= */
let QUEEN = null;
const QUEEN_REQUIRED = 72, QUEEN_SKIN = "cauldron_queen", QUEEN_POISON_CHANCE = 0.30; // each piece: ~1 in 3 hides poison
// Per-piece poison: every ingredient you collect in a villain round independently rolls
// for a hidden ☠️ taint, so even two of the SAME ingredient can differ. Rolled here at
// collection time (only for villain rounds; normal rounds always get poison:false).
function ingInst(id) {
  const inst = { id, potent: false, poison: !!(ROUND && ROUND.villain) && R.chance(QUEEN_POISON_CHANCE) };
  const ing = D.INGREDIENT_BY_ID[id];
  // flex infused ingredients get a RANDOM magic from this round's needs — always useful
  if (ing && ing.flex && ROUND && ROUND.wish && ROUND.wish.needs.length) inst.magic = R.pick(ROUND.wish.needs.map(n => n.type));
  return inst;
}
const QUEEN_PACKAGES = [
  { gold: 50,  scoops: 2 },
  { gold: 70,  scoops: 5 },
  { gold: 120, scoops: 7 },
];
const QUEEN_LINES = [
  "Your darling little Pet is MINE now. Scoop from my cursed pantry and brew my ransom potion… or never see it again!",
  "Such a sweet Pet you have — had. Pop my bubbles, brew my recipe, and perhaps I'll return it.",
  "A potion for a Pet, that's the bargain. My pantry is poisoned in places — mix carefully, dearie."
];
function queenWish() {
  const any = {}, primary = {};
  D.QUEEN_INGREDIENTS.forEach(i => { i.qualities.forEach(q => any[q] = (any[q] || 0) + 1); primary[i.qualities[0]] = (primary[i.qualities[0]] || 0) + 1; });
  // buildable needs: at least one PRIMARY source (so the haul biases correctly) AND >=2 sources
  // total — but NEVER Poison, which is the hazard you must keep out of the brew entirely.
  const strong = Object.keys(any).filter(q => q !== "Poison" && any[q] >= 2 && primary[q] >= 1);
  for (let i = strong.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = strong[i]; strong[i] = strong[j]; strong[j] = t; }
  const needTypes = strong.slice(0, 3);
  const labels = ["First Charm", "Second Charm", "Final Charm"];
  const needs = needTypes.map((type, i) => ({ type, label: labels[i], target: BALANCE.NEED_TARGET, revealed: true }));
  return { needs, requiredMatch: QUEEN_REQUIRED, difficulty: "hard", weights: BALANCE.NEED_WEIGHTS[3],
    allergy: "Poison", allergy2: null, boss: false, bandTight: 1, bandShrink: BALANCE.BAND_SHRINK_PER_ADD };
}
function queenCustomer() {
  return { id: "queen", name: "The Evil Queen", emoji: "👑", location: "The Dark Tower", line: R.pick(QUEEN_LINES) };
}
function renderQueenIntro() {
  SFX.unlock(); SFX.fanfare();
  QUEEN = { wish: queenWish() };
  const w = QUEEN.wish, line = R.pick(QUEEN_LINES);
  const recipe = w.needs.map(n => `${magicDot(n.type)} ${n.type}`).join(" · ");
  const skin = D.COSMETIC_BY_ID[QUEEN_SKIN];
  const afford = g => GAME.gold >= g;
  html("event", `
    ${hud("The Evil Queen")}
    <div class="grow center" style="gap:12px;overflow-y:auto">
      <div class="ph big">👑</div>
      <div style="font-weight:800;font-size:20px">The Evil Queen</div>
      <div class="speech">“${line}”</div>
      <div class="card" style="width:100%;max-width:330px">
        <div style="font-weight:800;text-align:center;margin-bottom:4px">🧪 Ransom Recipe</div>
        <div style="text-align:center">${recipe}</div>
        <div class="stat-line" style="margin-top:6px"><span>☠️ Hazard</span><span style="color:var(--bad)">${magicDot("Poison")} hidden Poison</span></div>
      </div>
      <div class="muted" style="max-width:315px">Pay for scoops of her cursed pantry, then <b>scoop &amp; pop</b> her bubbles for ingredients (and charms!). Brew a potion matching the recipe — but <b>each piece has about a 1-in-3 chance of hiding ☠️ Poison</b> (even two of the same ingredient can differ!). Adding a poisoned piece makes the meter climb — keep it in the <b>green</b>; let it reach <b>yellow</b> and the brew is ruined. <b>Insight</b> reveals the poisoned ones, and you can tap a piece in the cauldron to pull it back out. Match <b>${w.requiredMatch}%+</b> with a <b>clean</b> potion to win your Pet back <b>and</b> her ${skin.chip} <b>${skin.name}</b> skin.</div>
      <div class="muted" style="max-width:315px;font-size:12px">🐾 She's holding your Pet captive — <b>none of its abilities help you here</b>.</div>
      <div class="queen-buys">
        ${QUEEN_PACKAGES.map((pk, i) => `<button class="btn ${afford(pk.gold) ? "" : "secondary"} queen-buy" data-i="${i}" ${afford(pk.gold) ? "" : "disabled"}>🪙 ${pk.gold} → ${pk.scoops} scoops</button>`).join("")}
      </div>
    </div>
    <button class="btn secondary" id="queen-skip">Not now</button>
  `);
  $("#screen-event").querySelectorAll(".queen-buy").forEach(b => b.addEventListener("click", () => queenBuy(+b.dataset.i)));
  on("#queen-skip", "click", startRound);
  show("event");
}
function queenBuy(i) {
  const pk = QUEEN_PACKAGES[i];
  if (!pk || GAME.gold < pk.gold) { toast("Not enough gold."); return; }
  GAME.gold -= pk.gold; save();
  // run the real scoop -> pop -> mix pipeline, villain-styled, with HER pantry.
  // The Queen has your Pet, so NONE of its abilities help here (no Keen Nose,
  // no Better Scoop, no Undo — see familiarToken/wireFamiliar villain guards).
  ROUND = ENGINE.newVillainRound({
    wish: QUEEN.wish, scoops: pk.scoops, ingredientSet: D.QUEEN_INGREDIENTS,
    customer: queenCustomer(), betterScoop: false, charmFinder: false,
  });
  QUEEN = null;                                  // state now lives on ROUND
  document.body.classList.add("villain");        // villain colors for scoop/pop/mix
  SFX.scoop();
  renderScoop();
}
// villain rounds are scored here (serve() routes to this) — no payment/trash/streak
function queenServe() {
  const w = ROUND.wish, sc = scoreMix(ROUND.slots, w, ROUND.allergyOffset || 0);
  // stricter than a normal allergy: ANY poison (yellow OR red) taints the brew
  const poisoned = !!(sc.allergy && sc.allergy.zone !== "green");
  const win = sc.weighted >= w.requiredMatch && !poisoned;
  document.body.classList.remove("villain");
  stopRoundTimers();
  renderQueenResult(win, sc, poisoned, w.requiredMatch);
}
function renderQueenResult(win, sc, poisoned, required) {
  const skin = D.COSMETIC_BY_ID[QUEEN_SKIN];
  let prize = "", note, title, emoji, cls;
  if (win) {
    if (!GAME.owned[skin.id]) { GAME.owned[skin.id] = true; prize = `New villain skin: ${skin.chip} ${skin.name}!`; }
    else { grantReward({ gold: 120, stardust: 10 }); prize = "You already own her Mirror — 🪙120 · ✨10 instead."; }
    save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    emoji = "🐾"; cls = "win"; title = "Your Pet is free!";
    note = "The Queen keeps her word (this once). Your Pet scampers home — and you snatched her prize!";
  } else {
    save();
    SFX.sneeze();
    emoji = "🐾"; cls = "lose"; title = "Pet comes home anyway";
    note = poisoned
      ? "The brew turned to poison! The Queen scoffs… but your Pet wriggles free and scampers home regardless. No skin this time — she'll be back."
      : `Not quite a match (${sc.weighted}% / ${required}%). The Queen tuts… but your Pet slips away and comes home anyway. No skin — try her again another day.`;
  }
  const statLines = win
    ? `<div class="stat-line"><span>Recipe match</span><span><b>${sc.weighted}%</b></span></div>
       <div class="stat-line"><span>Prize</span><span class="gold">${prize}</span></div>`
    : `<div class="stat-line"><span>Recipe match</span><span><b>${sc.weighted}%</b> / ${required}%</span></div>
       <div class="stat-line"><span>Your Pet</span><span class="gold">🐾 safe &amp; home</span></div>`;
  QUEEN = null; ROUND = null;
  html("event", `
    ${hud("The Evil Queen")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${emoji}</div>
      <div class="result-title ${cls}">${title}</div>
      <div class="card" style="width:100%;max-width:330px">${statLines}</div>
      <p class="muted" style="max-width:310px">${note}</p>
    </div>
    <button class="btn" id="queen-next">Next Customer  →</button>
  `);
  on("#queen-next", "click", startRound);
  show("event");
}

/* ======================================================================= */
/* CUSTOMER                                                                */
/* ======================================================================= */
/* ======================================================================= */
/* CUSTOMER ARCS — a recurring customer's WISHES tell an ongoing story.       */
/* Each customer can have an ordered list of "chapters"; the one they're on   */
/* (GAME.custStory[id]) supplies the wish line they say at the counter, and   */
/* it advances one step each time you SUCCESSFULLY grant their wish. Order is  */
/* always preserved (random appearance only affects spacing). After the last  */
/* chapter they fall back to their generic line until more chapters are added.*/
/* The mix mechanics stay standard — the STORY is told through the dialogue.  */
/* ======================================================================= */
const CUSTOMER_ARCS = {
  // Gingerbread Man — chipper, breathless, food-punny; dodging mouths while gathering
  // the realm's finest baking supplies to carry home to Drury Lane.
  gingerbread: [
    { line: "Fresh-baked and the kids want a bite! Wish me fast feet — they’ll never catch me!" },
    { line: "I’ve dashed all the way to Willow-Wish! Wish me a sharp nose for the best supplies?" },
    { line: "A fox has his eye on me! Wish me light on my feet — I’ll shop and outrun him?" },
    { line: "The Baker’s vanilla is the best yet! Wish a jar of it fresh for my run home?" },
    { line: "A magpie swiped my sugar and flew off! Wish it back — that’s coming home with me!" },
    { line: "Sugar recovered! Now I’m off to track the realm’s rarest spice — wish me luck?" },
    { line: "All this running’s got me crumbly! Wish me tough enough to go the distance home?" },
    { line: "Ants have raided my honey jar! Shoo them off gently — that jar runs home with me?" },
    { line: "Kind folk leave out burnt bits so I run free! Wish me a thank-you treat to bake?" },
    { line: "My sack’s packed and I’m set to run! Wish it sealed tight so I don’t lose a crumb?" },
    { line: "I’m sending a package ahead to Drury Lane! Wish it a safe, speedy trip home?" },
    { line: "Package away! Now wish me a treat for the run — and no biting this time!" },
    { line: "Off I run to the next realm for supplies! A fond wish — see you in Drury Lane!" },
  ],
  // Tiny Mouse — earnest, industrious, counts everything, "paws," building her sewing empire.
  mouse: [
    { line: "Shop opens today! Two paws, a hundred orders. Wish me self-snipping scissors?" },
    { line: "Forty-one bows by Friday! Charm me ribbon that ties its own — neat bows, mind!" },
    { line: "Button drawer keeps emptying, and I LOCK up nightly! A jar that never runs dry?" },
    { line: "A lady wants a gown “the color of a good mood.” A dye that does just that, please?" },
    { line: "Buttons vanishing all over town now — not just me! Bubble up a guard for my stock?" },
    { line: "Little Red asked me to mend her cloak — honored! Wish me a stitch that never frays?" },
    { line: "So many orders I’m sewing in my sleep! Grant me a needle that threads itself?" },
    { line: "Found a lost button under my floor — heart-shaped, odd! Keep it safe for me?" },
    { line: "Hired a beetle apprentice — keen but clumsy! Wish us both a dab of patience?" },
    { line: "The whole village wants my winter coats! Charm me wool that weaves itself warm?" },
    { line: "Someone ordered bonnets with room for BIG ears. Gave me a chill! Wish me courage?" },
    { line: "My shop won “Finest in Willow-Wish”! A wish to keep my thimble from swelling my head?" },
    { line: "Stitching a red cloak for a brave little errand. Sew a blessing right into it?" },
  ],
  // Thatch (straw house) — catastrophizes everything, ALL CAPS panic. Walk-in art changes on ch.2.
  pig_straw: [
    { line: "My house is GONE — one huff and straw flew everywhere! Wish me bulletproof hay?" },
    { art: "customer_pig_straw_ruined2", line: "Reinforced hay? GONE too! “Windproof,” they SAID. IRON hay next — make it real!" },
    { line: "I tried STONE and the chimney fell on ME! Wish me a roof that refuses to fall?" },
    { line: "Now I’m sleeping in a BARREL! Keep the rain off till I sort this catastrophe?" },
    { line: "Woody says bunk with him — his house is STICKS! We’re doomed. Wish me courage?" },
    { line: "Two panicked pigs plan better than one, it turns out! Wish us something SOLID?" },
    { line: "We built with BRICK, together — and it STAYED UP! A wish to celebrate? I’m stunned." },
  ],
  // Woody (stick house) — cocky, in denial, "it's FINE." Walk-in art changes on ch.2.
  pig_stick: [
    { line: "Sticks folded like a lawn chair in one breeze! It’s FINE. Wish me better ones?" },
    { art: "customer_pig_stick_ruined2", line: "New sticks lasted a DAY — a record! Then less so. Wish me sticks that don’t quit?" },
    { line: "Added MORE sticks — obviously the answer is more sticks! Wish this pile to stay up?" },
    { line: "Pile fell again. I’m not panicking, YOU’RE panicking! Wish me some confidence?" },
    { line: "Fine. Sticks were a mistake. Don’t tell Thatch I said it. Just a little humility?" },
    { line: "Thatch and I are teaming up — two heads, one wall! Wish us a build that holds?" },
    { line: "We went BRICK, together — it held through a huff! Don’t tell I cried. A joy wish?" },
  ],
  // Sleepy Owl — a BABY owl in the Willow Scouts, earning badges one eager beat at a time.
  owl: [
    { line: "I joined the Willow-Wish Scouts! First badge is Wide-Awake. Wish me the pep to earn it?" },
    { line: "Nature badge today — I must hoot ten birdcalls! Grant me a clear little voice?" },
    { line: "Knot-tying badge and my talons are all thumbs! Wish me steady, clever claws?" },
    { line: "Baking badge! I’m to make one honest muffin. Bubble me luck — I burn everything." },
    { line: "Reading badge: a book a night! I keep dozing by page two. A jolt to stay awake?" },
    { line: "Swimming badge, and owls do NOT float! Wish me brave enough to try the pond?" },
    { line: "Foraging badge — I got lost in my own tree! Grant me a good sense of direction?" },
    { line: "Star-Chart badge tonight! Wish me the energy to name every last constellation?" },
    { line: "Night-Watch badge — my first real patrol! Wish me sharp little eyes till dawn?" },
    { line: "On patrol I spied a bonnet — and paws too big for any granny! Nerve to hoot?" },
    { line: "I hooted and woke the village! Mortifying if I’m wrong. Wish me a little certainty?" },
    { line: "Turns out I wasn’t wrong — good scout! Now grant me one long, proud nap?" },
    { line: "I earned every badge — Willow-Wish’s top Scout! Wish me a grand sash-pinning day?" },
  ],
  // Village Baker — frazzled, warm, perfectionist; names her living sourdough starter "Herman."
  baker: [
    { line: "Ovens roaring before sunup — nerves already shot! Bubble me calm to steady my hands?" },
    { line: "My sourdough starter is ALIVE — it bubbles, it GROWLS! A calming wish, for us both?" },
    { line: "I named the starter Herman. Herman has OPINIONS! Wish him quiet in his jar?" },
    { line: "Pastry counter opens tomorrow — half the village comes! Wish me calm, I beg you!" },
    { line: "A cookie fellow bought my finest vanilla — sweet chap! Wish me a quick restock?" },
    { line: "Six-tier wedding cake due at noon, it’s eleven! Grant me deep, deep calm — hurry!" },
    { line: "A hooded man bought 13 loaves for “granny,” paid in ACORNS! My nerves need a wish." },
    { line: "That grin had too many teeth — I keep thinking on it! Steady my nerves at the oven?" },
    { line: "Brass buttons pinched off my apron — third this week! Charm the rest to stay put?" },
    { line: "I told Little Red about the acorn man. Felt right. A calm wish while it’s sorted?" },
    { line: "Booming since the fright passed! Wish me steady hands for a hundred loaves today?" },
    { line: "Invented my signature loaf — the Willow-Wish Wreath! Bubble the first batch out perfect?" },
    { line: "Packed a crate for the cookie traveler heading home. Wish it warm all the way?" },
  ],
  // Goldilocks — an excitable KID, mega-fan of the Bandit Bears (a famous three-bear band);
  // she runs their fan club and dreams of being president. Keeps a light "just right" tic.
  goldilocks: [
    { line: "I’m the Bandit Bears’ biggest fan EVER! Wish me the perfect just-right fan badge?" },
    { line: "I started a Bandit Bears fan club! Grant me the nerve to be voted president?" },
    { line: "Their new song is stuck in my head — the GOOD kind! Bubble me a dancing charm?" },
    { line: "Made club bear masks — too big, too small, then JUST right! Wish them sturdy?" },
    { line: "Concert tickets sold out in a blink! Wish me the luck to snag three seats?" },
    { line: "I GOT tickets — front row! Bubble me calm so I don’t faint when the bears play?" },
    { line: "Best night EVER — Pepper waved at ME with a drumstick! Wish me the courage to say hi after?" },
    { line: "I met the band! Too starstruck to speak. Grant me the words for next time?" },
    { line: "The Bandit Bears are visiting Willow-Wish! Wish me the perfect welcome banner?" },
    { line: "I’m THIS close to their autograph! Bubble me the boldness to finally ask?" },
    { line: "The tour poster you brought me — signed by ALL THREE bears! Keep it safe forever?" },
    { line: "As club president, I’m throwing the bears a thank-you party! Wish it just right?" },
    { line: "The band made me their honorary cub! Bubble me one happy tear that won’t stop?" },
  ],
  // Bramble the Gnome — gruff, terse, competitive gardener, secretly soft. Rival: Thornby.
  gnome: [
    { line: "My mushrooms are stubborn this year! A growth spell — and don’t tell ’em I asked." },
    { line: "Prize mushroom’s coming in lovely, fair’s Sunday. Wish it stays perfect till then?" },
    { line: "Won “Most Alarming” at the fair! Now it’s stool-sized and smug. Shrink it a bit?" },
    { line: "Folk come miles to gawk at my mushroom — Bramble the Great, they say! A crowd charm?" },
    { line: "Rival gnome Thornby brags his marrow beats mine! Grow me the biggest ever?" },
    { line: "Thornby’s marrow IS bigger. Rot! Grow mine overnight — no cheating, mostly?" },
    { line: "My rushed marrow burst all over the fair. Humbling. Tidy the mess, quietly?" },
    { line: "The slugs unionized in the chaos — with DEMANDS! Move them on nicely for me?" },
    { line: "Thornby helped haul my burst marrow — decent of him! Grow me a peace-offering?" },
    { line: "Thornby and I swap seed packets now — proper garden mates! Wish our patch to thrive?" },
    { line: "We’re growing a village pumpkin together! Keep it steady and round for me?" },
    { line: "Tomatoes still won’t ripen before frost! Some things never change. A warm week?" },
    { line: "Our shared pumpkin won the fair — one ribbon, two names! Bless next year’s crop?" },
  ],
  // Wishy the Fish — wry, watery puns, pays pearls; his lonely well becomes the village heart.
  fish: [
    { line: "A wish-fish at a wish shop! Grant a lonely well-fish some company? Pearls, mind." },
    { line: "The village tosses coins now — grand! Sort the real wishes from bottle-caps? Pearls." },
    { line: "Straw and sticks splashed in my well — those PIGS! Wish it clear again? For pearls." },
    { line: "A heron eyes me like a buffet! Make me look less snackable? Pearls, naturally." },
    { line: "Two lovesick newts keep circling my well! Send them off happy for me? Pearls." },
    { line: "I keep coughing up lost buttons from my well! Gather the odd hoard? Pearls for you." },
    { line: "My well’s the talk of Willow-Wish, bright as glass! Wish it sparkling for good? Pearls." },
    { line: "A toothy shadow wished “a snack for granny” over my well! Bubble me bravery? Pearls." },
    { line: "I told Little Red about the toothy shadow. A calming wish now? Pearls for you." },
    { line: "The village guards my well now — safe again! A thank-you charm to bubble up? Pearls." },
    { line: "Kids toss crumbs with their wishes — I’m plump! Wish me a fair share-out? Pearls." },
    { line: "My well’s the heart of Willow-Wish now, not lonely at all! Keep it so? Pearls for you." },
    { line: "One last wish: make my water shimmer, so I can watch the stars as I work. Pearls!" },
  ],
  // Bo Peep — fretful, gentle shepherdess; counts her "woollies," a touch scattered.
  bo_peep: [
    { line: "My woollies wandered off AGAIN! Wish me a homing charm so they keep close?" },
    { line: "Counted the flock twice and got two different numbers! Grant me a clear head?" },
    { line: "One lamb keeps hiding in the Gnome’s marrow patch! Wish it home before he grumbles?" },
    { line: "My crook’s gone splintery from all the herding. Bubble me a sturdier one?" },
    { line: "A ewe’s afraid of her own shadow, bless her. Wish her a braver little heart?" },
    { line: "The whole flock’s muddy after the rain! Charm them fluffy-white again for me?" },
    { line: "Shearing day and my hands are all thumbs! Grant me a gentle, tidy trim?" },
    { line: "A wolf keeps eyeing my sheep hungrily! Wish me a charm to keep them all safe?" },
    { line: "One woolly wandered clear to the woods! Bubble me the nerve to fetch her back?" },
    { line: "Found her! Now to keep the flock from EVER scattering. Wish me a fence that holds?" },
    { line: "The flock follows me in a neat little line now! Wish me a proud shepherd’s whistle?" },
    { line: "My woollies won “fluffiest flock” at the fair! A little wish to thank them somehow?" },
    { line: "Every sheep home, safe and counted at last! Bubble me one happy, peaceful sigh?" },
  ],
};
function custArc(id) { return CUSTOMER_ARCS[id] || null; }
function custStoryStep(id) { return (GAME.custStory && GAME.custStory[id]) || 0; }
function custChapter(id) { const a = custArc(id); if (!a) return null; const s = custStoryStep(id); return s < a.length ? a[s] : null; }
function advanceCustStory(id) { const a = custArc(id); if (!a) return; const s = custStoryStep(id); if (s < a.length) { GAME.custStory[id] = s + 1; save(); } }
// Everyday (non-story) wishes: once a townsperson's story arc is finished, their wish
// rotates through this bank so lines never repeat round-to-round. Some lines are gated to
// story progress (the `when` predicate) — little nods to what's stirring in the village.
const TOWN_WISHES = {
  gingerbread: [
    "This cold-store’s got me shivering! Wish me a little warmth — but no melting, mind?",
    "A kid tried to dunk me in cocoa! Wish me quick so I can dash clean out of reach?",
    "I’ve found a map that runs all the way home! Wish me luck gathering supplies?",
    { t: "Buttons keep vanishing round town — wish mine stay put while I’m on the run?", when: () => (GAME.buttonStep || 0) >= 1 },
  ],
  mouse: [
    "Shop’s booming but my paws ache! A self-threading needle — I’ll do the rest!",
    "A ribbon order came as one enormous knot! Comb it smooth for me — neatly, mind!",
    "My apprentice sewed a sleeve to a hat — bless him! Wish us both a dab of patience?",
    { t: "Buttons STILL vanishing townwide — not just me now! Wish my jar kept full?", when: () => (GAME.buttonStep || 0) >= 1 },
  ],
  gnome: [
    "Prize mushroom’s stool-sized again! Keep it a reasonable size, would you?",
    "The slug union wants nicer lodging! Relocate them nicely — list and all?",
    "Thornby and I race turnips now — friendly, mostly! Grow me a fine fat crop?",
    { t: "Straw and busted sticks behind my shed — not mine! Turn the mess to good mulch?", when: () => GAME.pigsMoved },
  ],
  goldilocks: [
    "The Bandit Bears’ tune is stuck in my head — the good kind! A little dancing charm?",
    "Club meeting tonight! Wish me snacks just right — not too few, not too many?",
    "Re-reading every Bandit Bears interview! Grant me the pep to run the fan club?",
    "Sewing more bear-ear headbands for the fans! Wish me a stitch that’s just right?",
  ],
  owl: [
    "Between badges! Wish me pep for whatever the troop dreams up next?",
    "My badge sash has one gap left! A little luck to finish it off?",
    { t: "A ruined stick-house landed under my tree! Wish me strong enough to haul it?", when: () => GAME.pigsMoved },
    { t: "Still spy that big-pawed “granny” on night patrol! Nerve to hoot if she’s back?", when: () => GAME.storyStep >= 4 },
  ],
  baker: [
    "Herman the starter only hums now, mostly! Steady my hands for a hundred loaves?",
    "Wedding cake due at noon and it’s eleven! Grant me calm — deep, deep calm.",
    "The Willow-Wish Wreath loaf sells out daily! Wish me a golden crust every time?",
    { t: "That acorn-paying “granny” still haunts me! A settling wish for my nerves?", when: () => GAME.storyStep >= 4 },
    { t: "Someone’s still pinching my apron buttons! Keep the rest where they belong?", when: () => (GAME.buttonStep || 0) >= 1 },
  ],
  wolf: [
    "Folk cross the street when I grin! Fix my smile — hide a few too many teeth?",
    "The plump baker waves hello — so trusting! Keep me looking harmless a while longer?",
    "Strict no-sheep diet, day two. It is NOT going well! Bubble me past the cravings?",
    "Bought a darling bonnet — for THEATRE, obviously! A charm to sell the disguise?",
    "Thirteen loaves at my door — as if I’d settle for BREAD! Hide my appetite better?",
    "That nosy scout owl keeps watching me! A charm to slip his notice on my errands?",
    "Salad. SALAD again. Make it taste like something with a bit more… heartbeat?",
    "The little hooded one asks such questions! Wish me a perfectly innocent face?",
  ],
  little_red: [
    "The forest path gets dark so fast! Wish me safe passage to Grandma’s?",
    "Grandma’s cottage is deep in the woods. Keep the way clear for me?",
    "Mother packed a basket for Grandma. Wish the bread stays warm the whole way?",
    "The Mouse mended my cloak beautifully! Keep it clean on the muddy paths?",
    { t: "More buttons missing — that sneaky ‘collector’ is at it again! Wish them all found?", when: () => (GAME.buttonStep || 0) >= 1 },
    { t: "Folk say something wears a bonnet in these woods! Wish me courage for my visit?", when: () => GAME.storyStep >= 4 },
  ],
  fish: [
    "The village tosses so many wishes down my well! Sort them for me? Pearls.",
    "A heron eyes my bubble like a buffet! Make me look less snackable? Pearls.",
    "Two lovesick newts still circle me! Send them off together? Pearls, as ever.",
    "Coins pile up down here! Tidy my well into a proper treasury? Pearls.",
    { t: "That toothy shadow still visits my well at night! Bubble me bravery? Pearls.", when: () => GAME.storyStep >= 4 },
  ],
  bo_peep: [
    "A couple of woollies slipped the gate again! Wish me a homing charm, would you?",
    "My crook needs a fresh ribbon — a shepherdess has standards! A pretty little charm?",
    "Shearing season soon! Grant me soft wool and steady hands?",
    { t: "My sheep keep nibbling the pigs’ old straw pile! Clear it before they’re sick?", when: () => GAME.pigsMoved },
  ],
  pig_straw: [
    "Our brick house still stands — I keep checking hourly! Quiet my worrying?",
    { t: "Visiting from the brick place! Still can’t believe it holds. A calm wish?", when: () => GAME.pigsMoved },
  ],
  pig_stick: [
    "Brick house is holding. I KNEW it would. (I did not.) Wish it standing forever?",
    { t: "Popped by from the brick place — solid as ever! A charm to gloat gently?", when: () => GAME.pigsMoved },
  ],
  hare: [
    "Still winning, obviously! Bubble me pep before that tortoise catches up?",
    "Stopped to admire my reflection — as one does! Spring me back to top speed?",
  ],
  tortoise: [
    "Phew… I’m plumb tuckered. Wish I could walk AND sleep at the very same time?",
    "Slow road, happy heart. Wish these old feet one more mile of plodding?",
    "Haven’t spotted that hare in ages. No matter. Keep my shell cozy tonight?",
  ],
};
function everydayWishes(id) {
  const arr = TOWN_WISHES[id] || [];
  return arr.filter(e => typeof e === "string" || !e.when || e.when()).map(e => (typeof e === "string" ? e : e.t));
}
// swap in the customer's current chapter line (copy the record so we never mutate shared data)
function applyCustArc(round) {
  if (!round || !round.customer || round.story) return;
  const id = round.customer.id, chap = custChapter(id);
  if (chap) { round.customer = Object.assign({}, round.customer, { line: chap.line },
    chap.art ? { art: chap.art } : {}, chap.parts ? { parts: chap.parts } : {}); return; }
  // arc finished (or the customer never had one): rotate their everyday wishes so lines don't repeat
  const bank = everydayWishes(id);
  if (bank.length) {
    const rot = (GAME.lineRot[id] || 0) % bank.length;
    GAME.lineRot[id] = rot + 1; save();
    round.customer = Object.assign({}, round.customer, { line: bank[rot] });
  }
}
/* ---- Paginated wish dialogue on the customer card (story-mode feel) -------------
 * A customer with a long paragraph reads it a bit at a time: the first line shows,
 * then a ▸ arrow reveals the rest (optionally swapping the character's expression),
 * and Start Scoop stays locked until they've said everything. Authored `parts`
 * (with per-part art) win; otherwise a long line auto-splits at a sentence boundary. */
function autoSplitWish(line) {
  const s = (line || "").trim();
  if (s.length <= 112) return [{ text: s }];   // short enough for ≤4 lines — no pagination
  // Pack whole WORDS into pages, each capped so it never exceeds ~4 lines in the fixed box.
  // Prefer to end a page at a sentence boundary once it's reasonably full, so pages read
  // naturally. Works for long single-sentence wishes too (word-wrap fallback).
  const BUDGET = 112, SOFT = 62;
  const words = s.split(/\s+/);
  const parts = []; let cur = "";
  for (const w of words) {
    const cand = cur ? cur + " " + w : w;
    if (cur && cand.length > BUDGET) { parts.push(cur); cur = w; }
    else { cur = cand; if (/[.!?]["”’]?$/.test(w) && cur.length >= SOFT) { parts.push(cur); cur = ""; } }
  }
  if (cur.trim()) parts.push(cur.trim());
  return (parts.length > 1 ? parts : [s]).map(t => ({ text: t.trim() }));
}
function wishParts(c) {
  if (c && Array.isArray(c.parts) && c.parts.length) return c.parts;
  return autoSplitWish(c ? c.line : "");
}
function setCustChar(artKey, c) {
  const el = document.querySelector("#screen-customer .cust-char");
  if (el && artKey) { el.classList.remove("swap"); void el.offsetWidth; el.innerHTML = ART.tag(artKey, c.emoji, "cust-char-art"); el.classList.add("swap"); }
}
let WISH_STEPS = null, WISH_STEP = 0;
function startRound() {
  SFX.unlock();
  stopRoundTimers();
  document.body.classList.remove("villain"); // clear any villain theming
  applyRealmTheme();
  refreshQuests();
  if (maybeRedVisit()) return;   // Little Red's story visit is due (Grandma's photos / the impostor)
  if (maybeBoPeep()) return;     // Bo Peep drops by early to give her sheep quest
  if (maybeHare()) return;       // the Hare zooms in early, mid-race (one of the first customers)
  if (maybePigsMoving()) return; // the two pigs come in together to move out (once their arcs are done)
  if (maybeButtonChain()) return; // the button clue-chain (Wolf drop → show Red → Gingerbread)
  if (maybeWolfArc()) return;    // the Wolf's own recurring visits (disguises + hunger gag)
  if (maybeWellIntro()) return;  // Wishy the Fish introduces his wishing well (mid-game, once you can afford a toss)
  if (maybeGoldilocksQuest()) return; // Tiny Mouse's teddy-bear delivery → Goldilocks' three-bears visit
  if (maybeBandVisit()) return;  // the Bandit Bears tour → autograph poster → deliver to Goldilocks
  if (maybeTortoise()) return;   // the Tortoise plods in as the very last customer before the finale
  if (maybeJunkRound()) return;  // full trash bin? a junk visitor (Rumpelstiltskin or the goblin)
  if (maybeEvent()) return;   // a fairytale event takes this turn instead of a customer
  // once the pigs have moved, they no longer wander into the Willow shop
  let roster = currentRealm().customers || D.CUSTOMERS;
  if (GAME.pigsMoved) roster = roster.filter(c => c.id !== "pig_straw" && c.id !== "pig_stick");
  roster = roster.filter(c => c.id !== "hare" && c.id !== "tortoise"); // the race pair only appear via their scripted early/late arrivals
  if (!GAME.bopeepMet) roster = roster.filter(c => c.id !== "bo_peep"); // Bo Peep joins the regulars only after her sheep-quest intro
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm, customers: roster, ingredientSet: currentRealm().ingredients, magicPool: currentRealm().magics, reqBonus: currentRealm().reqBonus || 0 });
  injectInfused(ROUND);   // sprinkle in the new infused ingredients (Dragon Egg / Frost Gem)
  injectKeys(ROUND);      // occasionally a Treasure Key pops from a bubble
  setupHunt(ROUND);       // maybe a hidden collection item (sheep/bead) turns up this round
  applyCustArc(ROUND);    // if this customer has an ongoing story, use their current wish line
  // occasionally an "In a Rush" customer (never a boss) — a patience clock starts
  // when scooping begins.
  ROUND.rush = !ROUND.wish.boss && Math.random() < BALANCE.RUSH_CHANCE;
  if (ROUND.rush) { ROUND.rushMs = BALANCE.RUSH_MS; ROUND.rushStart = null; }
  // a VIP guest (any realm) — you may wager a key on the customer screen for a bigger reward
  ROUND.vip = !ROUND.wish.boss && !ROUND.rush && Math.random() < BALANCE.VIP_CHANCE;
  ROUND.keyStaked = false;
  // some customers pay in a rare currency (the wish-fish pays pearls); keep those rounds plain (no rush/VIP overlay)
  if (ROUND.customer && ROUND.customer.pays && ROUND.customer.pays !== "gold") { ROUND.rush = false; ROUND.vip = false; }
  renderCustomer();
}
// Which arched portrait frame each realm uses (falls back to the gold one)
function realmFrame() { return (currentRealm().custFrame) || "cframe_01"; }
// Special-customer "badges": tappable bubbles beside the portrait that explain
// what kind of guest this is. One entry per special trait — the array shape lets
// us add new special customer types later without touching the layout.
function custBadges() {
  const w = ROUND.wish, out = [];
  // rare-currency badge (its own bubble — always shows for pearl-payers, alongside any other badge)
  if (ROUND.currency === "pearls") out.push({ icon: PEARL, cls: "pearl", title: "Pays in Pearls!",
    text: "This customer pays in Pearls — a rare currency, not gold! Grab them while you can; they’re bound to be worth something down the road." });
  if (w.boss) out.push({ icon: "👑", cls: "boss", title: "Boss Customer",
    text: `A royal, very fussy guest! Tiny green zones, only ${BALANCE.BOSS_SLOTS} slots, and two allergies to avoid. Delight them for a grand reward.` });
  else if (ROUND.rush) out.push({ icon: "⏱️", cls: "rush", title: "In a Hurry",
    text: `This guest is in a rush! Serve them quickly for a +${BALANCE.RUSH_BONUS} gold bonus — don't dawdle.` });
  else if (ROUND.vip) out.push({ icon: "⭐", cls: "vip", title: "VIP Guest",
    text: "A Very Important guest has come to your shop. Impress them with a lovely wish for a fine reward!" });
  else if (ROUND.story === "red-arrival") out.push({ icon: "🌟", cls: "vip", title: "Little Red's First Wish",
    text: "Little Red's very first wish — take your time and enjoy this special moment." });
  else if (isStoryWish(ROUND.story)) out.push({ icon: "🌟", cls: "vip", title: "A Special Wish",
    text: "A heartfelt wish from a dear friend — grant it with extra care." });
  return out;
}
function renderCustomer() {
  const c = ROUND.customer, w = ROUND.wish, realm = currentRealm();
  ROUND.currency = (c && c.pays) || "gold";   // which currency this customer pays in (gold, pearls, …)
  const payGlyph = ROUND.currency === "pearls" ? PEARL : null;   // non-gold currencies show an emoji instead of the coin icon
  const allergyList = [w.allergy, w.allergy2].filter(Boolean);
  // allergy shows a simple mark: ✕ none, ✔ one, ✔✔ two
  const allergyMark = allergyList.length === 0
    ? `<span class="amark x">✕</span>`
    : allergyList.length === 2
    ? `<span class="amark ok">✔✔</span>`
    : `<span class="amark ok">✔</span>`;
  // baked-text title banner (VIP gets its own; others use the standard arrival banner)
  const bannerImg = ROUND.vip ? "banner_vip" : "banner_new";
  const keys = GAME.keys || 0, vipCost = BALANCE.VIP_KEY_COST || 1, canWager = ROUND.vip && keys >= vipCost;
  // Special-customer info NO LONGER lives in the wish box (that box is for the
  // customer's speech only). Instead each special type gets a tappable "badge"
  // bubble beside the portrait; tapping it opens an overlay that explains it.
  const badges = custBadges();
  const badgesHtml = badges.length ? `<div class="cust-badges">${badges.map((b, i) =>
    `<button class="cust-badge ${b.cls}" data-bi="${i}" aria-label="${b.title}"><span class="cust-badge-ic">${b.icon}</span></button>`).join("")}</div>` : "";
  const streakChip = GAME.streak >= 2 ? `<div class="cust-streak">🔥 ${GAME.streak}</div>` : "";
  const bcell = (icon, label, value, cls) => `<div class="bcell" data-tip="${label}">${icon ? `<img class="bic" src="art/ui/${icon}.png" alt="${label}">` : ""}<div class="bval ${cls || ""}">${value}</div></div>`;
  // Full-bleed scene image only on realms that have one (currently Willow); other realms keep the normal padded layout.
  const custBgEl = REALM_BG[GAME.realm] ? `<div class="cust-bg mg-fullbleed" id="cust-bg"></div>` : "";
  // Paginated wish dialogue: long paragraphs reveal a line at a time (see wishParts).
  const wishSteps = wishParts(c); WISH_STEPS = wishSteps; WISH_STEP = 0;
  const wishLocked = wishSteps.length > 1;
  html("customer", `
    ${custBgEl}
    <div class="cust-top">
      <div class="cust-realm">${realm.icon} <span>${realm.name}</span></div>
      <div class="cust-wallet">
        ${GAME.pearls > 0 ? `<div class="cust-coin pearls">${PEARL} <b>${GAME.pearls.toLocaleString()}</b></div>` : ""}
        <div class="cust-coin"><img src="art/ui/kit_13.png" alt="🪙"><b>${(GAME.gold||0).toLocaleString()}</b></div>
      </div>
    </div>
    <div class="grow" style="flex:0 1 auto; overflow:hidden; display:flex; flex-direction:column; align-items:center; gap:2px; padding-bottom:4px">
      <div class="cust-banner"><img src="art/ui/${bannerImg}.png" alt="A New Customer Arrives" draggable="false"></div>
      <div class="cust-portrait">
        ${streakChip}
        ${badgesHtml}
        <div class="cust-char ${w.boss ? "boss-emoji" : ""}" style="--char-scale:${CHAR_SCALE[c.id] || 1};--char-y:${CHAR_OFFY[c.id] || 0}%">${custArt(c, "cust-char-art")}</div>
      </div>
      <div class="cust-nameplate"><img src="art/ui/name_plaque.png" alt="" draggable="false"><span class="cust-name">${w.boss ? "👑 " : ROUND.vip ? "⭐ " : ""}${c.name}</span></div>
      <div class="cust-wishbox${wishSteps.length > 1 ? " has-next" : ""}">
        <div class="cust-wish-text" id="cust-wish-text">“${wishSteps[0].text}”</div>
        ${wishSteps.length > 1 ? `<button class="wish-next" id="wish-next" aria-label="Read more">▸</button>` : ""}
      </div>
      <div class="cust-bottombar">
        ${payGlyph ? bcell("", "Payment", `<span class="pay-alt">${payGlyph} ${ROUND.payment}</span>`) : bcell("kit_13", "Payment", ROUND.payment)}
        ${bcell("kit_16", "Target", w.requiredMatch + "%")}
        ${bcell("kit_17", "Allergy", allergyMark)}
      </div>
    </div>
    <button class="cust-scoop baked${wishLocked ? " locked" : ""}" id="scoop-btn"><img src="art/ui/btn_scoop.png" alt="Start Scoop" draggable="false"></button>
    ${canWager ? `
      <div class="vip-overlay" id="vip-overlay">
        <div class="vip-modal">
          <div class="vipo-banner"><img src="art/ui/banner_vip.png" alt="VIP Customer" draggable="false"></div>
          <div class="vip-panel">
            <div class="vip-panel-text">Wager <b>🗝️ ${vipCost} keys</b> for a <b>${BALANCE.VIP_GOLD_MULT}× reward</b>!<br>Win and you <b>keep your keys</b> — a fail loses them.</div>
          </div>
          <button class="vip-yes" id="vip-yes"><img src="art/ui/kit_08.png" alt="" draggable="false"><span>🗝️ Wager ${vipCost} Keys</span></button>
          <button class="vip-no" id="vip-no">Play as normal</button>
        </div>
      </div>` : ""}
    ${badges.length ? `
      <div class="badge-overlay hidden" id="badge-overlay">
        <div class="badge-modal" id="badge-modal">
          <div class="badge-modal-ic" id="badge-modal-ic"></div>
          <div class="badge-modal-title" id="badge-modal-title"></div>
          <div class="badge-modal-text" id="badge-modal-text"></div>
          <button class="badge-modal-ok" id="badge-modal-ok">Got it</button>
        </div>
      </div>` : ""}
  `);
  if (w.boss || ROUND.rush || ROUND.vip) { SFX.unlock(); SFX.fanfare(); } // special arrival — hard to miss
  const closeVip = () => { const o = document.getElementById("vip-overlay"); if (o) o.remove(); };
  on("#vip-yes", "click", () => { ROUND.keyStaked = true; SFX.unlock(); SFX.charm(); toast(`🗝️ ${vipCost} keys wagered — make it count!`); closeVip(); });
  on("#vip-no", "click", () => { SFX.unlock(); closeVip(); });
  // Badge bubbles: tap one to open its info overlay; tap the backdrop (or "Got
  // it") to close — the bubble always stays so it can be re-opened anytime.
  const badgeOv = document.getElementById("badge-overlay");
  const openBadge = (b) => {
    if (!badgeOv) return;
    document.getElementById("badge-modal-ic").innerHTML = b.icon;
    document.getElementById("badge-modal-title").textContent = b.title;
    document.getElementById("badge-modal-text").textContent = b.text;
    badgeOv.classList.remove("hidden"); SFX.unlock(); SFX.pop(1);
  };
  const closeBadge = () => { if (badgeOv) badgeOv.classList.add("hidden"); };
  document.querySelectorAll(".cust-badge").forEach((el) => {
    el.addEventListener("click", (e) => { e.stopPropagation(); openBadge(badges[+el.dataset.bi] || badges[0]); });
  });
  on("#badge-modal-ok", "click", (e) => { e.stopPropagation(); SFX.unlock(); closeBadge(); });
  if (badgeOv) badgeOv.addEventListener("click", (e) => { if (e.target === badgeOv) { SFX.unlock(); closeBadge(); } });
  // ▸ arrow reveals the next line of a long wish; Start Scoop unlocks once it's all been read.
  on("#wish-next", "click", () => {
    if (!WISH_STEPS || WISH_STEP >= WISH_STEPS.length - 1) return;
    WISH_STEP++;
    const part = WISH_STEPS[WISH_STEP];
    const tx = document.getElementById("cust-wish-text");
    if (tx) { tx.textContent = "“" + part.text + "”"; tx.style.animation = "none"; void tx.offsetWidth; tx.style.animation = "wishFade .28s ease"; }
    if (part.art) setCustChar(part.art, c);
    SFX.unlock(); SFX.pop(1);
    if (WISH_STEP >= WISH_STEPS.length - 1) {
      const arrow = document.getElementById("wish-next"); if (arrow) arrow.remove();
      const sb = document.getElementById("scoop-btn"); if (sb) sb.classList.remove("locked");
    }
  });
  on("#scoop-btn", "click", () => {
    const sb = document.getElementById("scoop-btn");
    if (sb && sb.classList.contains("locked")) { SFX.unlock(); SFX.err && SFX.err(); const a = document.getElementById("wish-next"); if (a) { a.style.animation = "none"; void a.offsetWidth; a.style.animation = "wishNudge .5s ease"; } return; }
    renderScoop();
  });
  applyRealmBackground();
  show("customer");
}

/* ======================================================================= */
/* SCOOP — sift each scoop to reveal how many bubbles you'll pop            */
/* ======================================================================= */
// Rare secret treasures that peek out from behind the scoop glitter. Each is a
// full-bleed image (matching the background) with the pearl pre-placed by hand,
// so it drops in exactly where it belongs. cx/cy = the bubble's centre (fraction
// of the 941×1672 art) for the tap hotspot; only ONE ever appears per scoop phase.
const SCOOP_SECRET_ART = { w: 941, h: 1672 };
const SCOOP_SECRETS = [
  { key: "scoop_pearl_a", cx: 0.563, cy: 0.743 },
  { key: "scoop_pearl_b", cx: 0.815, cy: 0.706 },
];
function rollScoopSecret() {
  const r = Math.random();
  if (r < 0.55) return { type: "gold", amt: R.int(40, 130), emoji: ART.tag("icon_gold", "🪙"), cls: "gold" };
  if (r < 0.85) return { type: "dust", amt: R.int(4, 10), emoji: "✨", cls: "dust" };
  return { type: "pearl", amt: R.int(1, 3), emoji: PEARL, cls: "pearl" };
}
function renderScoop() {
  const scoops = ROUND.scoops, split = ROUND.scoopYields;
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
  const SHAKE_UNITS = 24, BATCH = 4;              // shakes needed to empty the glitter out of the sifter
  let shaken = 0;                                  // progress toward emptying the current scoop
  let lastRainAt = 0, rainOrigin = null;          // rate-limit + cache the falling-glitter FX so a fast shake stays light
  let idx = 0, revealed = 0, state = "idle", shakeDist = 0, lastX = null, dragging = false, autoIv = null;
  let skipMode = false;                          // after "Shake for me", the button becomes "Skip"
  let secret = null;                              // the one secret treasure for this scoop phase (decided up front)
  const jackDone = new Array(scoops).fill(false); // which scoops have already handed out their jackpot charm

  html("scoop", `
    <div class="scoop-bg mg-fullbleed" id="scoop-bg"></div>
    <div class="scoop-stage" id="scoop-stage">
      <div class="scoop-craft" id="scoop-craft">
        <div class="scoop-bowl" id="scoop-bowl" style="font-size:${Math.round(178 * ART.getScale("scoop_spoon"))}px">${ART.tag("scoop_spoon", "🥄")}<img class="scoop-glitter-tip" id="scoop-glitter-tip" src="${ART.url("scoop_glitter_tip")}" alt="" draggable="false"></div>
        <div class="scoop-bubbles" id="scoop-bubbles"></div>
      </div>
      <div class="scoop-front" id="scoop-front"></div>
      <div class="scoop-secret" id="scoop-secret"></div>
    </div>
    ${hud("Scoop Phase")}
    <button class="mute-btn" id="mute-btn" title="Sound on/off">${SFX.isMuted() ? "🔇" : "🔊"}</button>
    <div class="scoop-head">
      <div class="scoop-sub" id="scoop-step">Scoop 1 of ${scoops}</div>
      <div class="scoop-instr" id="scoop-text">✋ Swipe side to side to shake off the glitter!</div>
    </div>
    <div class="scoop-controls">
      <div class="scoop-result" id="scoop-result"></div>
      <div class="spoon-size" id="spoon-size"><button class="sz-btn" id="spoon-smaller">−</button><span class="muted">spoon size</span><button class="sz-btn" id="spoon-bigger">+</button></div>
      <div class="row">
        <button class="btn secondary" id="auto-sift">✨ Shake for me</button>
        <button class="btn" id="scoop-continue" disabled>Continue</button>
      </div>
    </div>
    ${familiarToken("scoop")}
  `);
  { const bgEl = $("#scoop-bg"); if (bgEl) bgEl.style.backgroundImage = `url('art/scoop_bg.webp?v=${BUILD}')`;
    const frEl = $("#scoop-front"); if (frEl) frEl.style.backgroundImage = `url('art/scoop_front.webp?v=${BUILD}')`; }
  // warm the pearl images on EVERY scoop entry, so on the rare phase one appears it's already cached
  // (never a late pop-in against the already-loaded background)
  SCOOP_SECRETS.forEach(v => { const im = new Image(); im.src = `art/${v.key}.webp?v=${BUILD}`; });
  // roll the rare secret and paint its pearl RIGHT NOW, in the same breath as the background,
  // so it loads in together and is simply "already there" when the screen appears — never seen arriving
  decideSecret();

  const isJackpot = i => !!(ROUND.scoopJackpots && ROUND.scoopJackpots[i]);
  function loadScoop() {
    const found = split[idx], jackpot = isJackpot(idx);
    const bubs = $("#scoop-bubbles"); if (bubs) { bubs.innerHTML = "";
      for (let i = 0; i < found; i++) { const s = document.createElement("span"); s.className = "sbub"; s.innerHTML = `<span class="bglyph">🫧</span>`; bubs.appendChild(s); }
      applyBubbleArt(bubs); }
    // the scoop just came up FULL: the glitter-tip layer fades in over the empty sifter
    const tip = $("#scoop-glitter-tip");
    if (tip) { tip.classList.toggle("rainbow", jackpot); tip.style.opacity = "1"; }
    shaken = 0;                                     // shake-progress toward emptying the glitter
    state = "shaking"; shakeDist = 0;
    const st = $("#scoop-step"); if (st) st.textContent = `Scoop ${idx + 1} of ${scoops}`;
    const tx = $("#scoop-text"); if (tx) tx.innerHTML = jackpot
      ? "🌈 A <b>rainbow scoop</b> — shake for the jackpot!"
      : "✋ Swipe side to side to shake off the glitter!";
  }

  // --- rare secret treasure peeking out of the glitter (~5% per scoop) ------
  // Map a point on the 941×1672 art to screen px, accounting for background cover.
  function coverPoint(cxFrac, cyFrac) {
    const A = SCOOP_SECRET_ART, st = $("#scoop-stage"); if (!st) return null;
    const vw = st.clientWidth, vh = st.clientHeight, scale = Math.max(vw / A.w, vh / A.h);
    const ox = (vw - A.w * scale) / 2, oy = (vh - A.h * scale) / 2;
    return { x: ox + cxFrac * A.w * scale, y: oy + cyFrac * A.h * scale, r: 0.108 * A.w * scale / 2 };
  }
  // Decide the rare secret up front and paint the pearl WITH the background (below), so it's
  // there from the very first frame — no fade, nothing that reveals it "arrived".
  function decideSecret() {
    const forced = GAME.forceScoopSecret;
    if (!forced && Math.random() >= 0.05) return;             // ~5% per scoop phase
    if (forced) { GAME.forceScoopSecret = false; save(); }
    secret = { v: SCOOP_SECRETS[Math.floor(Math.random() * SCOOP_SECRETS.length)], tr: rollScoopSecret() };
    const layer = $("#scoop-secret");
    if (layer) { layer.style.backgroundImage = `url('art/${secret.v.key}.webp?v=${BUILD}')`; layer.classList.add("shown"); }
  }
  // The tap target needs real stage dimensions, so it's attached AFTER show(). The pearl is
  // already visible by then (painted with the bg); the invisible hotspot arriving a frame later
  // changes nothing on screen.
  function placeSecretHotspot() {
    if (!secret) return;
    const pt = coverPoint(secret.v.cx, secret.v.cy), layer = $("#scoop-secret"), stage = $("#scoop-stage");
    if (!pt || !layer || !stage) return;
    const hot = document.createElement("button");
    hot.type = "button"; hot.className = "secret-hit"; hot.setAttribute("aria-label", "A secret treasure — tap it!");
    const d = pt.r * 2.3;
    hot.style.left = (pt.x - d / 2) + "px"; hot.style.top = (pt.y - d / 2) + "px";
    hot.style.width = d + "px"; hot.style.height = d + "px";
    hot.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); popSecret(hot, layer, pt, secret.tr); });
    stage.appendChild(hot);
  }
  function popSecret(hot, layer, pt, tr) {
    SFX.unlock(); SFX.pop(1); if (navigator.vibrate) navigator.vibrate(12);
    if (hot.parentNode) hot.remove();
    layer.classList.remove("shown"); layer.classList.add("popped");
    setTimeout(() => { if (layer) { layer.classList.remove("popped"); layer.style.backgroundImage = ""; } }, 400);
    secretBurst(pt);
    const stage = $("#scoop-stage"); if (!stage) return;
    const prize = document.createElement("button");
    prize.type = "button"; prize.className = "secret-prize " + tr.cls; prize.setAttribute("aria-label", "Grab the treasure");
    const sz = Math.max(48, pt.r * 2.1);
    prize.style.left = (pt.x - sz / 2) + "px"; prize.style.top = (pt.y - sz / 2) + "px";
    prize.style.width = sz + "px"; prize.style.height = sz + "px";
    prize.innerHTML = `<span class="secret-prize-ic">${tr.emoji}</span>`;
    prize.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); grabSecret(prize, tr); });
    stage.appendChild(prize);
  }
  function grabSecret(prize, tr) {
    if (prize.dataset.got) return; prize.dataset.got = "1";
    if (tr.type === "gold") { GAME.gold += tr.amt; SFX.bigCoin && SFX.bigCoin(); }
    else if (tr.type === "dust") { GAME.stardust = (GAME.stardust || 0) + tr.amt; SFX.charm && SFX.charm(); }
    else { GAME.pearls = (GAME.pearls || 0) + tr.amt; SFX.fanfare && SFX.fanfare(); }
    save(); syncHud("scoop");
    const label = tr.type === "gold" ? `+${tr.amt} gold` : tr.type === "dust" ? `+${tr.amt} Stardust` : `+${tr.amt} ${tr.amt > 1 ? "pearls" : "pearl"}`;
    toast(`✨ A secret treasure — ${label}!`);
    if (navigator.vibrate) navigator.vibrate(8);
    prize.classList.add("grabbed"); setTimeout(() => { if (prize.parentNode) prize.remove(); }, 440);
  }
  function secretBurst(pt) {
    const stage = $("#scoop-stage"); if (!stage) return;
    const cols = ["#fff7d6", "#ffd76a", "#ffb3e6", "#8fe0ff", "#c9f6ff"];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement("i"); p.className = "secret-spark";
      const ang = (i / 12) * Math.PI * 2 + Math.random(), dist = 26 + Math.random() * 42;
      p.style.left = pt.x + "px"; p.style.top = pt.y + "px"; p.style.background = cols[i % cols.length];
      p.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
      p.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1) + "px");
      stage.appendChild(p); p.addEventListener("animationend", () => p.remove());
    }
  }

  function shakeTick(intensity) {
    if (state !== "shaking") return;
    if (shaken >= SHAKE_UNITS) { reveal(); return; }
    SFX.sift(0.16, Math.max(0.3, Math.min(1, intensity)));
    if (navigator.vibrate) navigator.vibrate(6);
    const bowl = $("#scoop-bowl"); if (bowl) { bowl.classList.remove("jig"); void bowl.offsetWidth; bowl.classList.add("jig"); } // glitter tip is a child, so it shakes too
    shaken += BATCH;
    // fade the glittery scoop away toward the empty sifter as you shake it off
    const tip = $("#scoop-glitter-tip"); if (tip) tip.style.opacity = Math.max(0, 1 - shaken / SHAKE_UNITS).toFixed(2);
    rainGlitter(Math.max(0.4, Math.min(1, intensity)));   // trails of glitter cascade down the screen
    if (shaken >= SHAKE_UNITS) setTimeout(reveal, 220);
  }

  // trails of glitter + sparkles rain off the spoon and fall the whole way down the screen, then fade.
  // Rate-limited + hard-capped so even a frantic shake stays light on a phone's GPU.
  function rainGlitter(intensity) {
    const now = Date.now();
    if (now - lastRainAt < 75) return;                     // cap the burst rate no matter how fast you shake
    lastRainAt = now;
    const stage = $("#scoop-stage"); if (!stage) return;
    if (stage.querySelectorAll(".fall-glitter,.fall-spark").length > 10) return;   // never let them pile up
    // measure the spoon-glitter position ONCE (reused each burst) — avoids a layout reflow per shake tick.
    // The glitter fill sits ~40% across / ~62% down the spoon image.
    if (!rainOrigin) {
      const tip = $("#scoop-glitter-tip"); if (!tip) return;
      const sr = stage.getBoundingClientRect(), tr = tip.getBoundingClientRect();
      rainOrigin = { ox: tr.left - sr.left + tr.width * 0.40, oy: tr.top - sr.top + tr.height * 0.62, w: tr.width * 0.44, h: sr.height };
    }
    const o = rainOrigin, COLS = ["#fff7d6", "#ffe38a", "#ffd76a", "#ffc94d", "#ffb43c"];
    const n = 2 + Math.round(intensity * 2);               // 2–4 per burst
    for (let i = 0; i < n; i++) {
      const streak = Math.random() < 0.62;
      const el = document.createElement("i"); el.className = streak ? "fall-glitter" : "fall-spark";
      el.style.left = (o.ox + rnd(-o.w * 0.48, o.w * 0.48)) + "px";
      el.style.top = (o.oy + rnd(-6, 12)) + "px";
      el.style.setProperty("--fc", COLS[Math.floor(Math.random() * COLS.length)]);
      el.style.setProperty("--fx", rnd(-26, 26) + "px");
      el.style.setProperty("--fy", (o.h - o.oy + rnd(10, 90)) + "px");   // all the way to the bottom
      el.style.setProperty("--fd", (0.9 + Math.random() * 0.7).toFixed(2) + "s");
      if (!streak) el.style.setProperty("--sz", (7 + rnd(0, 6)) + "px");
      stage.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }
  }

  function reveal() {
    if (state !== "shaking") return; state = "revealing";
    const found = split[idx], jackpot = isJackpot(idx); revealed += found;
    tryHuntFind("scoop", $("#scoop-craft"));   // a hidden hunt item may be sitting in the glitter
    const tip = $("#scoop-glitter-tip"); if (tip) tip.style.opacity = "0";   // sifter is empty now
    let jackCharm = null;
    if (jackpot) {
      SFX.charm(); // fanfare
      jackCharm = ENGINE.pickCappedCharm(ROUND.charms, ROUND.villain ? ["peek"] : null);
      if (gainCharm(jackCharm)) { if (ROUND.stats) ROUND.stats.charms++; } else { jackCharm = null; } // satchel full → bubbles only
      jackDone[idx] = true;
    }
    const tx = $("#scoop-text"); if (tx) tx.innerHTML = (jackpot && jackCharm)
      ? `🌈 <b>Jackpot!</b> ${found} bubbles + ${CHARM(jackCharm).emoji} ${CHARM(jackCharm).name} charm!`
      : jackpot
      ? `🌈 <b>Jackpot!</b> ${found} bubble${found === 1 ? "" : "s"}!`
      : `✨ <b>${found}</b> bubble${found === 1 ? "" : "s"}!`;
    const rs = $("#scoop-result"); if (rs) rs.textContent = `${revealed} bubble${revealed === 1 ? "" : "s"} so far`;
    const bubs = $("#scoop-bubbles"); const kids = bubs ? [...bubs.children] : [];
    // bubbles float up ONE AT A TIME, each with its own rising pip so you can hear the count
    kids.forEach((b, k) => setTimeout(() => {
      // spawn point = a random spot within the flat glitter ellipse (uniform over its area)
      const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
      b.style.left = (50 + Math.cos(ang) * rr * 50).toFixed(1) + "%";
      b.style.top = (50 + Math.sin(ang) * rr * 50).toFixed(1) + "%";
      b.style.setProperty("--fx", rnd(-30, 30) + "px"); b.classList.add("floatup");
      SFX.count(k); if (navigator.vibrate) navigator.vibrate(5);
    }, 130 + k * 175));
    setTimeout(advance, 130 + found * 175 + 700);
  }

  // Dip the (empty) sifter down into the glitter and come up full — used for the very
  // first scoop (so you SEE it dip in) and again between every scoop.
  function diveThenLoad() {
    const bowl = $("#scoop-bowl"); state = "diving";
    if (bowl) { bowl.classList.remove("diving"); void bowl.offsetWidth; bowl.classList.add("diving"); }
    SFX.scoop();
    setTimeout(loadScoop, 330);                                   // fill while the scoop lingers at the bottom
    setTimeout(() => { if (bowl) bowl.classList.remove("diving"); }, 1180);  // matches the longer linger + slow rise
  }
  function advance() {
    if (state === "done") return;                // skipped straight to popping
    idx++;
    if (idx >= scoops) { finish(); return; }
    diveThenLoad();
  }

  function finish() {
    state = "done";
    const st = $("#scoop-step"); if (st) st.textContent = "All scooped!";
    const tx = $("#scoop-text"); if (tx) tx.innerHTML = `✨ <b>${revealed}</b> Wish Bubbles ready!`;
    const rs = $("#scoop-result"); if (rs) rs.textContent = "Tap Continue to go pop them →";
    const cbtn = $("#scoop-continue"); if (cbtn) cbtn.disabled = false;
    // keep the Skip button live (it just jumps to popping); only gray the plain "Shake for me"
    const a = $("#auto-sift"); if (a && !skipMode) a.disabled = true;
    if (autoIv) { clearInterval(autoIv); autoIv = null; }
  }

  // Skip the remaining scoop visuals and go straight to popping. Still hands out
  // any jackpot charms from scoops that haven't been revealed yet, so nothing is lost.
  function skipToPopping() {
    if (itemGateBlocks()) return;   // collect a waiting quest item before leaving the scoop screen
    tryHuntFind("scoop", $("#scoop-craft"));   // don't let a scoop-hidden find slip past when skipping
    if (itemGateBlocks()) return;   // if that just turned one up, collect it first
    if (autoIv) { clearInterval(autoIv); autoIv = null; }
    for (let i = 0; i < scoops; i++) {
      if (isJackpot(i) && !jackDone[i]) {
        jackDone[i] = true;
        const ch = ENGINE.pickCappedCharm(ROUND.charms, ROUND.villain ? ["peek"] : null);
        if (gainCharm(ch) && ROUND.stats) ROUND.stats.charms++;
      }
    }
    state = "done";
    renderPop();
  }

  // --- drag-to-shake input ---
  const stage = $("#scoop-stage");
  const px = e => (e.touches ? e.touches[0].clientX : e.clientX);
  stage.addEventListener("pointerdown", e => {
    if (state !== "shaking") return; dragging = true; lastX = px(e); SFX.unlock();
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  });
  stage.addEventListener("pointermove", e => {
    if (!dragging || state !== "shaking") return;
    const x = px(e), dx = x - lastX; lastX = x;
    const rot = Math.max(-9, Math.min(9, dx * 0.5));
    const bowl = $("#scoop-bowl"); if (bowl) bowl.style.transform = `rotate(${rot}deg)`; // glitter cover is a child → tilts with it
    shakeDist += Math.abs(dx);
    if (shakeDist >= 52) { shakeDist = 0; shakeTick(Math.abs(dx) / 40 + 0.4); }
  });
  const endDrag = () => { dragging = false;
    const bowl = $("#scoop-bowl"); if (bowl) { bowl.style.transition = "transform .2s"; bowl.style.transform = ""; setTimeout(() => { if (bowl) bowl.style.transition = ""; }, 200); } };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  on("#auto-sift", "click", () => {
    SFX.unlock();
    if (skipMode) { skipToPopping(); return; }   // second press: skip straight to popping
    // first press: auto-shake for me, and turn this button into a live "Skip"
    skipMode = true;
    const a = $("#auto-sift"); if (a) { a.textContent = "⏭️ Skip"; a.classList.remove("secondary"); }
    if (autoIv) return;
    autoIv = setInterval(() => {
      if (state === "done") { clearInterval(autoIv); autoIv = null; ROUND._scoopIv = null; return; }
      if (state === "shaking") shakeTick(0.7);
    }, 150);
    ROUND._scoopIv = autoIv; // let round-ending paths (rush expire / home) clear it
  });
  on("#scoop-continue", "click", () => { if (itemGateBlocks()) return; if (autoIv) clearInterval(autoIv); renderPop(); });
  on("#mute-btn", "click", () => { const m = SFX.toggle(); const b = $("#mute-btn"); if (b) b.textContent = m ? "🔇" : "🔊"; });
  const resizeSpoon = delta => {
    const s = Math.max(0.4, Math.min(2.2, +(ART.getScale("scoop_spoon") + delta).toFixed(2)));
    ART.setScale("scoop_spoon", s);
    const bowl = $("#scoop-bowl"); if (bowl) bowl.style.fontSize = Math.round(178 * s) + "px";
  };
  on("#spoon-smaller", "click", () => resizeSpoon(-0.1));
  on("#spoon-bigger", "click", () => resizeSpoon(0.1));

  // Start with an EMPTY sifter, then dip it into the glitter for the very first scoop.
  state = "idle";
  { const tx = $("#scoop-text"); if (tx) tx.innerHTML = "✨ Scooping the glitter…"; }
  setTimeout(diveThenLoad, 620);
  wireFamiliar("scoop");
  show("scoop");
  placeSecretHotspot();  // pearl is already painted; now the stage has real dimensions for its tap target
  startRushClock();      // In-a-Rush patience clock ticks from here through serve
}

/* ======================================================================= */
/* POP — each bubble reveals a haul item into your hand                    */
/* ======================================================================= */
const CHARM = id => D.SPECIAL_CHARMS[id];
// visual flavor per reward kind: bubble tint + burst particle colors + rarity
const POP_FLAVOR = {
  ingredient: { parts: ["#8fd3ff", "#bfe3ff", "#ffffff"], rare: 0 },
  treat:      { parts: ["#7ee08a", "#b6f5c4", "#ffffff"], rare: 0 },
  gold:       { parts: ["#ffd76a", "#ffb43c", "#fff3c0"], rare: 1 },
  key:        { parts: ["#ffe98a", "#ffd76a", "#fff3c0", "#ffffff"], rare: 2 },
  bubble:     { parts: ["#8fe9ff", "#c9f6ff", "#ffffff", "#ffe38a"], rare: 1 },
  charm:      { parts: ["#e6a3ff", "#a97bff", "#ffd76a", "#7ee08a"], rare: 2 },
};
let popCombo = 0, lastPopAt = 0, cascadeOn = false, squeezeEl = null, squeezeStart = 0;

// squeeze-and-hold: press to swell a bubble, release for a bigger/deeper pop
const SQUEEZE_MAX_MS = 950; // hold this long → bubble is at max size and pops on its own
function wireBubble(el) {
  const doPop = power => {
    if (squeezeEl !== el) return;
    clearTimeout(el._sqTimer);
    SFX.holdStop(); el.classList.remove("squeezing"); squeezeEl = null;
    popAt(+el.dataset.i, el, false, power);
  };
  el.addEventListener("pointerdown", e => {
    if (el.classList.contains("popped") || squeezeEl) return;
    squeezeEl = el; squeezeStart = Date.now(); el.classList.add("squeezing");
    SFX.unlock(); SFX.holdStart();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el._sqTimer = setTimeout(() => doPop(1), SQUEEZE_MAX_MS); // auto-pop at full size
  });
  const release = () => { if (squeezeEl !== el) return; doPop(Math.max(0, Math.min(1, (Date.now() - squeezeStart - 90) / 800))); };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
}

// one floating bubble button, with a randomized wander path so each drifts differently.
// Original bubbles all look the same (their contents are a surprise). Only the extra
// bubbles that a bonus SPAWNS are golden — pass golden=true for those.
function bubbleHTML(i, golden) {
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
  const dur = (5.5 + Math.random() * 3).toFixed(1), del = (Math.random() * 4).toFixed(1);
  const cls = golden ? "pbubble bonus" : "pbubble";
  return `<button class="${cls}" data-i="${i}" style="--dur:${dur}s;--del:-${del}s;` +
    `--ax:${rnd(-46, 46)}px;--ay:${rnd(-34, 34)}px;--bx:${rnd(-46, 46)}px;--by:${rnd(-30, 34)}px;` +
    `--cx:${rnd(-40, 40)}px;--cy:${rnd(-30, 30)}px"><span class="sheen"></span><span class="bglyph">🫧</span></button>`;
}

function renderPop() {
  ROUND.popIndex = 0; popCombo = 0; lastPopAt = 0; cascadeOn = false;
  // Once per round: is there a hidden treasure stash behind the wall? (5–10% — an X shows,
  // tap it 5–10× to smash it open for a random prize.)
  if (typeof ROUND.popX !== "boolean") {
    ROUND.popX = GAME.forcePopX || Math.random() < 0.05;
    if (GAME.forcePopX) { GAME.forcePopX = false; save(); }   // admin test: one forced X, then back to random
    ROUND.popXNeed = 5 + Math.floor(Math.random() * 5);   // taps to break it (5–9)
    ROUND.popXTaps = 0; ROUND.popXBroken = false; ROUND.popTreasure = null; ROUND.popTreasureGot = false;
  }
  const bubbles = ROUND.haul.map((_, i) => bubbleHTML(i)).join("");
  html("pop", `
    <div class="pop-bg" id="pop-bg"></div>
    ${hud("Pop Phase")}
    <button class="mute-btn" id="mute-btn" title="Sound on/off">${SFX.isMuted() ? "🔇" : "🔊"}</button>
    <div class="pop-sub muted" id="pop-hint">Tap each bubble to pop it — everything inside goes in your bag!</div>
    <div class="bubble-field" id="bubble-field">${bubbles}</div>
    <div id="hand-line" class="muted" style="font-size:13px;text-align:center;min-height:20px"></div>
    <div class="row">
      <button class="btn secondary" id="pop-all">Pop them all ✨</button>
      <button class="btn" id="pop-continue" disabled>Continue</button>
    </div>
    <div class="pop-hole-layer" id="pop-hole-layer"></div>
    <div class="burst-layer" id="burst-layer"></div>
    <div class="catch-layer" id="catch-layer"></div>
    ${familiarToken("pop")}
  `);
  refreshPop();
  applyBubbleArt($("#bubble-field"));
  document.querySelectorAll("#bubble-field .pbubble").forEach(wireBubble);
  on("#pop-all", "click", popCascade);
  on("#pop-continue", "click", () => { if (itemGateBlocks()) return; collectAndContinue(); });
  on("#mute-btn", "click", () => { const m = SFX.toggle(); const b = $("#mute-btn"); if (b) b.textContent = m ? "🔇" : "🔊"; });
  wireFamiliar("pop");
  show("pop");
  setupPopWood();
}
/* ---- The wooden pop-phase wall. Always the wood backdrop; on a rare round a carved X
   appears — tap it 5–10× to smash a hole, then a glowing treasure floats in the cavity
   (black shows through the real transparent hole in the art). Tap it to grab it. ---- */
const POP_HOLE = { cx: 0.372, cy: 0.651, w: 0.203, h: 0.139 };   // hole centre + size as fractions of the bg art
function setupPopWood() {
  const scr = document.getElementById("screen-pop"); if (scr) scr.classList.add("pop-woodbg");
  const bg = $("#pop-bg"); if (!bg) return;
  const img = ROUND.popXBroken ? "pop_bg_broken" : (ROUND.popX ? "pop_bg_x" : "pop_bg");
  bg.style.backgroundImage = `url('art/${img}.webp?v=${BUILD}')`;
  const layer = $("#pop-hole-layer"); if (layer) layer.innerHTML = "";
  if (ROUND.popX && !ROUND.popXBroken) {
    addPopX();
    const pre = new Image(); pre.src = `art/pop_bg_broken.webp?v=${BUILD}`;   // warm the broken art so the smash swaps instantly
  } else if (ROUND.popXBroken && !ROUND.popTreasureGot) showPopTreasure();
}
// where the hole/X sits on screen, given the cover-fit background
function popHoleGeom() {
  const bg = $("#pop-bg"); if (!bg) return null;
  const r = bg.getBoundingClientRect(), iw = 887, ih = 1774;
  const s = Math.max(r.width / iw, r.height / ih), dw = iw * s, dh = ih * s;
  const ox = (r.width - dw) / 2, oy = (r.height - dh) / 2;
  return { x: ox + POP_HOLE.cx * dw, y: oy + POP_HOLE.cy * dh, w: POP_HOLE.w * dw, h: POP_HOLE.h * dh };
}
function addPopX() {
  const layer = $("#pop-hole-layer"), g = popHoleGeom(); if (!layer || !g) return;
  const t = document.createElement("button");
  t.className = "pop-x-target"; t.id = "pop-x-target"; t.setAttribute("aria-label", "Tap to break the wall");
  t.style.left = g.x + "px"; t.style.top = g.y + "px";
  t.style.width = Math.max(g.w, g.h) * 1.25 + "px"; t.style.height = Math.max(g.w, g.h) * 1.25 + "px";
  layer.appendChild(t);
  t.addEventListener("click", () => popTapX(t));
}
function popTapX(t) {
  if (!ROUND || ROUND.popXBroken) return;
  ROUND.popXTaps = (ROUND.popXTaps || 0) + 1;
  SFX.unlock(); if (SFX.chop) SFX.chop();
  if (navigator.vibrate) navigator.vibrate(12);
  // a few wood chips fly off with each knock (feedback, not a hint), more as it loosens
  const g = popHoleGeom(); if (g) popWoodChips(g.x, g.y, 3 + Math.floor((ROUND.popXTaps / (ROUND.popXNeed || 6)) * 3));
  if (ROUND.popXTaps >= (ROUND.popXNeed || 6)) breakPopWood();
}
// a small spray of wood chips at the X on each knock
function popWoodChips(cx, cy, n) {
  const layer = $("#pop-hole-layer"); if (!layer) return;
  const cols = ["#8a5a2b", "#a9743a", "#6e4420", "#c89257"];
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"); p.className = "pop-splinter chip";
    const ang = Math.random() * Math.PI * 2, dist = 14 + Math.random() * 26;
    p.style.left = cx + "px"; p.style.top = cy + "px"; p.style.background = cols[i % cols.length];
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
    p.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
    layer.appendChild(p); p.addEventListener("animationend", () => p.remove());
  }
}
function breakPopWood() {
  ROUND.popXBroken = true; ROUND.popTreasure = rollPopTreasure(); save && save();
  const bg = $("#pop-bg"); if (bg) bg.style.backgroundImage = `url('art/pop_bg_broken.webp?v=${BUILD}')`;
  const x = $("#pop-x-target"); if (x) x.remove();
  const g = popHoleGeom(); if (g) popWoodFx(g.x, g.y);
  if (SFX.clang) SFX.clang(); setTimeout(() => { if (SFX.perfect) SFX.perfect(); }, 90);
  if (navigator.vibrate) navigator.vibrate([12, 30, 40]);
  const scr = document.getElementById("screen-pop"); if (scr) { scr.classList.remove("shake"); void scr.offsetWidth; scr.classList.add("shake"); }
  // Hold the treasure back ~0.6s so the smash is enjoyed first and you can't accidentally
  // spam-tap it collected before you even see the wall break open.
  setTimeout(() => { if (ROUND && ROUND.popXBroken && !ROUND.popTreasureGot) showPopTreasure(); }, 600);
}
// pick a random stash prize — gold most often, then Stardust, then rare Pearls
function rollPopTreasure() {
  const r = Math.random();
  if (r < 0.52) return { type: "gold", amt: R.int(40, 120), emoji: "🪙", cls: "gold" };
  if (r < 0.85) return { type: "dust", amt: R.int(3, 8), emoji: "✨", cls: "dust" };
  return { type: "pearl", amt: R.int(1, 3), emoji: PEARL, cls: "pearl" };
}
function showPopTreasure() {
  const layer = $("#pop-hole-layer"), g = popHoleGeom(), tr = ROUND.popTreasure;
  if (!layer || !g || !tr || ROUND.popTreasureGot) return;
  const size = Math.min(g.w, g.h) * 1.05;
  const el = document.createElement("button");
  el.className = "pop-treasure " + tr.cls; el.id = "pop-treasure"; el.setAttribute("aria-label", "Grab the treasure");
  el.style.left = g.x + "px"; el.style.top = g.y + "px"; el.style.width = size + "px"; el.style.height = size + "px";
  el.innerHTML = `<span class="pop-treasure-ic">${tr.emoji}</span>`;
  layer.appendChild(el);
  el.addEventListener("click", () => grabPopTreasure(el));
}
function grabPopTreasure(el) {
  const tr = ROUND && ROUND.popTreasure; if (!tr || ROUND.popTreasureGot) return;
  ROUND.popTreasureGot = true;
  if (tr.type === "gold") { GAME.gold += tr.amt; if (SFX.bigCoin) SFX.bigCoin(); }
  else if (tr.type === "dust") { GAME.stardust += tr.amt; if (SFX.charm) SFX.charm(); }
  else { GAME.pearls = (GAME.pearls || 0) + tr.amt; if (SFX.fanfare) SFX.fanfare(); }
  save(); syncHud("pop");
  const label = tr.type === "gold" ? `+${tr.amt} gold` : tr.type === "dust" ? `+${tr.amt} Stardust` : `+${tr.amt} ${tr.amt > 1 ? "pearls" : "pearl"}`;
  toast(`${tr.type === "pearl" ? "🦪" : tr.emoji} A hidden stash — ${label}!`);
  el.classList.add("grabbed"); setTimeout(() => { if (el.parentNode) el.remove(); }, 420);
}
// wood-splinter burst when the wall smashes open
function popWoodFx(cx, cy) {
  const layer = $("#pop-hole-layer"); if (!layer) return;
  const cols = ["#8a5a2b", "#a9743a", "#6e4420", "#c89257", "#5a3616"];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement("i"); p.className = "pop-splinter";
    const ang = (i / 16) * Math.PI * 2 + Math.random(), dist = 40 + Math.random() * 70;
    p.style.left = cx + "px"; p.style.top = cy + "px";
    p.style.background = cols[i % cols.length];
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
    p.style.setProperty("--rot", (Math.random() * 540 - 270) + "deg");
    p.style.animationDelay = (Math.random() * 0.05).toFixed(2) + "s";
    layer.appendChild(p); p.addEventListener("animationend", () => p.remove());
  }
}

function itemInfo(item) {
  if (item.kind === "ingredient") { const ing = D.INGREDIENT_BY_ID[item.id]; return { emoji: ingArt(item.id), label: ing.name, kind: "ingredient" }; }
  if (item.kind === "charm") { const ch = CHARM(item.id); return { emoji: charmArt(item.id), label: ch.name + " charm!", kind: "charm" }; }
  if (item.kind === "gold") return { emoji: ART.tag("icon_gold", "🪙"), label: "+" + item.amt + " gold", kind: "gold" };
  if (item.kind === "bubble") return { emoji: "🫧", label: "Bonus bubbles!", kind: "bubble" };
  if (item.kind === "key") return { emoji: ART.tag("icon_key", "🗝️"), label: "A Treasure Key!", kind: "key" };
  return { emoji: ART.tag("icon_treat", "🐸"), label: "+1 treat", kind: "treat" };
}

function popAt(i, el, fromCascade, power) {
  if (!el || el.classList.contains("popped")) return;
  SFX.unlock(); power = power || 0;
  const item = ROUND.haul[i];
  // gold/treat bank instantly; ingredients & charms pop OUT of the bubble to be caught
  if (item.kind === "gold") { GAME.gold += item.amt; save(); }
  else if (item.kind === "treat") { GAME.treats += 1; save(); }
  else if (item.kind === "key") { GAME.keys = (GAME.keys || 0) + 1; save(); }
  ROUND.popIndex++;
  const st = ROUND.stats;
  if (st) { st.popped++;
    if (item.kind === "ingredient") st.ingredients++;
    else if (item.kind === "charm") st.charms++;
    else if (item.kind === "gold") st.gold += item.amt;
    else if (item.kind === "treat") st.treats++;
    else if (item.kind === "key") st.keys = (st.keys || 0) + 1;
  }

  const info = itemInfo(item), flavor = POP_FLAVOR[info.kind];
  const now = Date.now();
  popCombo = (now - lastPopAt < 700) ? popCombo + 1 : 0; lastPopAt = now;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;

  if (item.kind === "charm") {
    SFX.pop(popCombo, power); SFX.reveal("ingredient", popCombo);
    if (!roundCharmsFull()) spawnFloatingCharm(item.id, cx, cy);  // fanfare happens on catch
    else { burstAt(cx, cy, flavor); toast(`🎒 Satchel full — ${BALANCE.MAX_CHARMS_PER_ROUND} charms max!`); }
  } else if (item.kind === "bubble") {
    SFX.pop(popCombo, power); SFX.bonus(); flashScreen();
    ringAt(cx, cy); burstAt(cx, cy, flavor, 1); burstAt(cx, cy, flavor, power);
    floatReward(cx, cy, info, true);
    el.classList.add("big");
  } else if (item.kind === "ingredient") {
    SFX.pop(popCombo, power); burstAt(cx, cy, flavor, power);
    // always float OUT of the bubble so you see it pop; during Pop-them-all it
    // auto-collects shortly (a satisfying shower), otherwise you tap to catch it.
    spawnFloatingIngredient(item.id, cx, cy, fromCascade ? 850 : 0);
  } else {
    SFX.pop(popCombo, power); SFX.reveal(info.kind, popCombo);
    burstAt(cx, cy, flavor, power); floatReward(cx, cy, info, flavor.rare);
  }
  if (navigator.vibrate) navigator.vibrate(flavor.rare ? [10, 22, 14] : (power > 0.5 ? [8, 12, 18] : 12));

  el.classList.add("popped");
  if (item.kind === "bubble") spawnBonusBubbles(cx, cy);
  if (!fromCascade) { tryHuntFind("pop", el); refreshPop(); }
}

// A bonus bubble bursts into more bubbles that fly out into the field.
function spawnBonusBubbles(cx, cy) {
  const field = $("#bubble-field"); if (!field) return;
  // normal rounds cap low (modest chains); rare "frenzy" rounds go big
  const frenzy = ROUND.bonusFrenzy;
  const cap = frenzy ? BALANCE.BONUS_MAX_FRENZY : BALANCE.BONUS_MAX_SPAWN;
  const remaining = cap - (ROUND.bonusSpawned || 0);
  const bonusSet = ROUND.ingredientSet || null; // bonus bubbles stay in this round's pantry (realm/villain)
  if (remaining <= 0) { // at the cap — don't dud; hand over one ingredient directly
    const it = ENGINE.bonusBubbleItems(ROUND.wish, 1, 0, bonusSet)[0];
    if (it && it.kind === "ingredient") { if (ROUND.stats) ROUND.stats.ingredients++; spawnFloatingIngredient(it.id, cx, cy, 850); }
    return;
  }
  const n = Math.min(R.int(BALANCE.BONUS_SPAWN_MIN, BALANCE.BONUS_SPAWN_MAX), remaining);
  ROUND.bonusSpawned = (ROUND.bonusSpawned || 0) + n;
  const chainChance = ROUND.bonusSpawned < cap ? (frenzy ? BALANCE.BONUS_CHAIN_FRENZY : BALANCE.BONUS_CHAIN_CHANCE) : 0;
  const items = ENGINE.bonusBubbleItems(ROUND.wish, n, chainChance, bonusSet);
  items.forEach((it, k) => {
    const idx = ROUND.haul.length; ROUND.haul.push(it);
    const holder = document.createElement("div"); holder.innerHTML = bubbleHTML(idx, true);
    const nb = holder.firstElementChild; nb.classList.add("spawning");
    wireBubble(nb);
    field.appendChild(nb);
    setTimeout(() => nb.classList.remove("spawning"), 480);
  });
  refreshPop();
}

// Per-round charm cap: you can only gain up to MAX_CHARMS_PER_ROUND charms per round.
function roundCharmsFull() { return (ROUND.charmsGained || 0) >= (BALANCE.MAX_CHARMS_PER_ROUND || Infinity); }
function gainCharm(id) {
  if (roundCharmsFull()) return false;
  ROUND.charms.push(id); ROUND.charmsGained = (ROUND.charmsGained || 0) + 1;
  return true;
}
// Charm floats out of the popped bubble; tap it to gather it (with the fanfare).
function spawnFloatingCharm(id, x, y) {
  const layer = $("#catch-layer"); if (!layer) { gainCharm(id); return; }
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
  const tok = document.createElement("div");
  tok.className = "charm-token"; tok.dataset.charm = id;
  tok.style.left = x + "px"; tok.style.top = y + "px";
  tok.style.setProperty("--tdur", (2.4 + Math.random()) .toFixed(1) + "s");
  tok.style.setProperty("--tx1", rnd(14, 34) + "px"); tok.style.setProperty("--ty1", rnd(-40, -20) + "px");
  tok.style.setProperty("--tx2", rnd(-34, -14) + "px"); tok.style.setProperty("--ty2", rnd(16, 34) + "px");
  tok.innerHTML = `${charmArt(id)}<span class="lbl">tap to catch!</span>`;
  tok.addEventListener("click", () => collectCharm(id, tok));
  layer.appendChild(tok);
}
function collectCharm(id, tok) {
  if (!tok || tok.classList.contains("caught")) return;
  if (!gainCharm(id)) { tok.classList.add("caught"); setTimeout(() => tok.remove(), 200);
    toast(`🎒 Satchel full — ${BALANCE.MAX_CHARMS_PER_ROUND} charms max per round!`); refreshPop(); return; }
  SFX.unlock(); SFX.charm();
  const r = tok.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  charmCelebrate(charmArt(id, "ch-art")); flashScreen();
  burstAt(cx, cy, POP_FLAVOR.charm);
  floatReward(cx, cy, { emoji: charmArt(id), label: CHARM(id).name + " charm!" }, true);
  if (navigator.vibrate) navigator.vibrate([10, 22, 14]);
  tok.classList.add("caught"); setTimeout(() => tok.remove(), 320);
  refreshPop();
}
// Ingredient floats out of the popped bubble; tap to catch it (or it drifts up and
// auto-banks, so you never lose it). Catching just feels good.
function spawnFloatingIngredient(id, x, y, autoMs) {
  const layer = $("#catch-layer"); if (!layer) { ROUND.inventory.push(ingInst(id)); return; }
  const ing = D.INGREDIENT_BY_ID[id];
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
  const tok = document.createElement("div");
  tok.className = "ing-token"; tok.dataset.ing = id;
  // clamp on-screen (and above the bottom buttons) so it never drifts away uncatchable
  const vw = window.innerWidth, vh = window.innerHeight;
  tok.style.left = Math.max(42, Math.min(vw - 42, x)) + "px";
  tok.style.top = Math.max(96, Math.min(vh - 170, y)) + "px";
  tok.style.setProperty("--tdur", (2.6 + Math.random() * 1.6).toFixed(2) + "s");
  tok.style.setProperty("--bx1", rnd(-28, 28) + "px"); tok.style.setProperty("--by1", rnd(-24, -6) + "px");
  tok.style.setProperty("--bx2", rnd(-28, 28) + "px"); tok.style.setProperty("--by2", rnd(6, 24) + "px");
  tok.innerHTML = ingArt(id);
  tok.addEventListener("pointerdown", e => { e.stopPropagation(); collectIngredient(id, tok, false); });
  layer.appendChild(tok); // bobs until caught, swept on Continue, or auto-collected (Pop-them-all)
  if (autoMs) tok._timer = setTimeout(() => collectIngredient(id, tok, true), autoMs);
}
function collectIngredient(id, tok, silent) {
  if (!tok || tok._caught) return; tok._caught = true; clearTimeout(tok._timer);
  ROUND.inventory.push(ingInst(id));
  if (!silent) {
    SFX.unlock(); SFX.reveal("ingredient", 0);
    const r = tok.getBoundingClientRect();
    burstAt(r.left + r.width / 2, r.top + r.height / 2, POP_FLAVOR.ingredient, 0.2);
    if (navigator.vibrate) navigator.vibrate(8);
    tok.classList.add("caught"); setTimeout(() => tok.remove(), 240);
  } else if (tok.parentNode) tok.remove();
  refreshPop();
}
// safety net: sweep up anything still floating when you move on
function collectAndContinue() { collectAllFloating(); renderMix(); }
function ringAt(x, y) {
  const layer = $("#burst-layer"); if (!layer) return;
  const ring = document.createElement("div"); ring.className = "ring";
  ring.style.left = x + "px"; ring.style.top = y + "px";
  layer.appendChild(ring); setTimeout(() => ring.remove(), 620);
}

function popCascade() {
  if (cascadeOn) return; cascadeOn = true;
  SFX.unlock();
  const pa = $("#pop-all"); if (pa) pa.disabled = true;
  const step = () => {
    // re-scan each tick so bonus bubbles spawned mid-cascade get popped too
    const el = document.querySelector("#bubble-field .pbubble:not(.popped)");
    if (!el) { cascadeOn = false; collectAllFloating(); refreshPop(); return; } // sweep everything into the bag/tray
    popAt(+el.dataset.i, el, true);
    refreshPop();
    setTimeout(step, 135); // rhythmic cascade, not an instant skip
  };
  step();
}
// Collect every floating charm + ingredient token into the tray/bag (Pop-them-all & Continue).
function collectAllFloating() {
  document.querySelectorAll("#catch-layer .charm-token").forEach(tok => {
    if (!tok.classList.contains("caught")) { gainCharm(tok.dataset.charm); tok.remove(); } // respect the per-round cap
  });
  document.querySelectorAll("#catch-layer .ing-token").forEach(tok => {
    if (!tok._caught) { tok._caught = true; clearTimeout(tok._timer); ROUND.inventory.push(ingInst(tok.dataset.ing)); tok.remove(); }
  });
}

// --- juice: particle burst, floating reward label, screen flash ---------
function burstAt(x, y, flavor, power) {
  power = power || 0;
  const layer = $("#burst-layer"); if (!layer) return;
  const n = 8 + flavor.rare * 5 + Math.round(power * 10);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"); p.className = "particle";
    const ang = (Math.PI * 2 * i) / n + (i % 2) * 0.4, dist = (34 + (i % 4) * 16 + flavor.rare * 14) * (1 + power * 0.7);
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", (Math.sin(ang) * dist - 10) + "px");
    p.style.background = flavor.parts[i % flavor.parts.length];
    p.style.width = p.style.height = (5 + (i % 3) * 3 + power * 3) + "px";
    layer.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}
function floatReward(x, y, info, rare) {
  const layer = $("#burst-layer"); if (!layer) return;
  const el = document.createElement("div");
  el.className = "reward-pop" + (rare ? " rare" : "");
  el.innerHTML = `<span class="e">${info.emoji}</span> ${info.label}`;
  el.style.left = x + "px"; el.style.top = y + "px";
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
let flashEl = null;
function flashScreen() {
  const sc = screen("pop"); if (!sc) return;
  if (!flashEl) { flashEl = document.createElement("div"); flashEl.className = "screen-flash"; }
  sc.appendChild(flashEl); flashEl.classList.remove("go"); void flashEl.offsetWidth; flashEl.classList.add("go");
}
// Charm: a big spinning emoji with golden rays bursts from the center.
function charmCelebrate(emoji) {
  const sc = screen("pop"); if (!sc) return;
  const ov = document.createElement("div"); ov.className = "charm-celebrate";
  ov.innerHTML = `<span class="rays"></span><span class="ch">${emoji}</span>`;
  sc.appendChild(ov);
  setTimeout(() => ov.remove(), 1100);
}

function refreshPop() {
  const total = ROUND.haul.length, left = total - ROUND.popIndex;
  syncHud("pop");
  const hl = $("#hand-line");
  if (hl) hl.innerHTML = left > 0
    ? `🎒 ${ROUND.inventory.length} ingredient${ROUND.inventory.length === 1 ? "" : "s"}` + (ROUND.charms.length ? ` · ${ROUND.charms.map(c => CHARM(c).emoji).join(" ")}` : "") + ` &nbsp;·&nbsp; <b>${left}</b> bubble${left === 1 ? "" : "s"} left`
    : `All popped! 🎒 ${ROUND.inventory.length} ingredient${ROUND.inventory.length === 1 ? "" : "s"}` + (ROUND.charms.length ? ` · ${ROUND.charms.map(c => CHARM(c).emoji).join(" ")}` : "");
  const hint = $("#pop-hint"); if (hint && left <= 0) hint.textContent = "Nice — off to the cauldron!";
  const cont = $("#pop-continue"); if (cont) cont.disabled = left > 0;
  const pa = $("#pop-all"); if (pa) pa.disabled = left <= 0 || cascadeOn;
}

/* ======================================================================= */
/* CAULDRON (making phase) — the whole puzzle                              */
/* ======================================================================= */
function renderMix() {
  const rawCount = ROUND.inventory.length;                 // how abundant this round was
  // villain rounds skip triple-match so each piece keeps its own hidden-poison flag
  const merged = ROUND.villain ? { inventory: ROUND.inventory, merged: [] } : applyTripleMatch(ROUND.inventory);
  ROUND.inventory = merged.inventory;
  if (ROUND.stats) ROUND.stats.triples = merged.merged.length;
  ROUND.slots = []; ROUND.mixStart = Date.now();
  ROUND.potentNext = false; ROUND.allergyOffset = 0; ROUND.insight = false;
  paintMix(); show("mix");
  if (ROUND._mixTimer) clearInterval(ROUND._mixTimer);
  ROUND._mixTimer = setInterval(paintMixTop, 500);
  const afterTriples = () => { if (rawCount > BALANCE.SNEEZE_AT && !ROUND.wish.boss && !ROUND.villain) setTimeout(sneezeAllergy, 250); }; // bosses/villains don't sneeze
  if (merged.merged.length) showTriple(merged.merged, afterTriples);
  else setTimeout(afterTriples, 350);
}
// Over-abundant round → the customer sneezes up a fresh allergy (self-balancing).
function sneezeAllergy() {
  const heldIds = ROUND.inventory.map(x => x.id).filter(Boolean);
  const added = ENGINE.addSneezeAllergy(ROUND.wish, heldIds, currentRealm().magics);
  if (!added) return; // no non-overlapping magic available — skip quietly
  SFX.unlock(); SFX.sneeze();
  shakeScreen("mix");
  if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  toast(`🤧 Achoo! ${ROUND.customer.name} is now allergic to ${magicDot(added)} ${added} too!`);
  paintMixTop();
}
function shakeScreen(id) {
  const sc = screen(id); if (!sc) return;
  sc.classList.remove("shake"); void sc.offsetWidth; sc.classList.add("shake");
  setTimeout(() => sc.classList.remove("shake"), 620);
}
/* --- ingredient-panel sorting + stacking ------------------------------------
 * Panel order (top → bottom): charms, then infused, potent, normal ingredients;
 * within the ingredient tiers, alphabetical by MAIN magical quality then name.
 * Identical pieces pile into one tile with a ×N count — EXCEPT in villain rounds,
 * where each piece may secretly hide poison and must stay individually tappable. */
function instMainMagic(inst) {
  if (inst.essence || inst.wild) return inst.magic || "";
  const ing = D.INGREDIENT_BY_ID[inst.id];
  return inst.magic || (ing ? ing.qualities[0] : "");
}
function instTier(inst) {
  const ing = inst.id ? D.INGREDIENT_BY_ID[inst.id] : null;
  if (ing && ing.infused) return 1;   // infused
  if (inst.potent) return 2;          // potent
  return 3;                           // normal
}
function instName(inst) {
  if (inst.essence) return inst.magic + " Essence";
  if (inst.wild) return "Wild";
  const ing = D.INGREDIENT_BY_ID[inst.id]; return ing ? ing.name : "";
}
function instStackKey(inst) {
  if (inst.wild) return "w|" + (inst.magic || "");
  if (inst.essence) return "e|" + inst.magic + "|" + (inst.potent ? 1 : 0) + "|" + (inst.shrunk ? 1 : 0);
  return "i|" + inst.id + "|" + (inst.magic || "") + "|" + (inst.potent ? 1 : 0) + "|" + (inst.shrunk ? 1 : 0);
}
function mixStacks() {
  const inv = ROUND.inventory;
  const order = inv.map((inst, idx) => ({ inst, idx }));
  order.sort((a, b) => {
    const ta = instTier(a.inst), tb = instTier(b.inst); if (ta !== tb) return ta - tb;
    const ma = instMainMagic(a.inst), mb = instMainMagic(b.inst); if (ma !== mb) return ma.localeCompare(mb);
    const na = instName(a.inst), nb = instName(b.inst); if (na !== nb) return na.localeCompare(nb);
    return a.idx - b.idx;
  });
  if (ROUND.villain) return order.map(o => ({ rep: o.inst, idxs: [o.idx] }));  // no piling in villain rounds
  const stacks = [], map = {};
  for (const o of order) {
    const k = instStackKey(o.inst);
    if (map[k] != null) stacks[map[k]].idxs.push(o.idx);
    else { map[k] = stacks.length; stacks.push({ rep: o.inst, idxs: [o.idx] }); }
  }
  return stacks;
}
// How many pet-undos are still available this round (capped, and gated by owned treats).
function mixTreatsLeft() {
  const cap = BALANCE.MAX_TREATS_PER_ROUND;
  return Math.max(0, Math.min(cap - (ROUND.treatsUsed || 0), GAME.treats));
}
function paintMixTop() {
  const el = $("#mix-top"); if (!el) return;
  const w = ROUND.wish;
  const score = scoreMix(ROUND.slots, w, ROUND.allergyOffset);
  // DISCOVERY: a mystery need reveals when you play an ingredient whose MAIN quality matches.
  w.needs.forEach(n => {
    if (n.revealed) return;
    const found = ROUND.slots.some(inst => (inst.wild || inst.essence || inst.magic) ? inst.magic === n.type : D.INGREDIENT_BY_ID[inst.id].qualities[0] === n.type);
    if (found) n.revealed = true;
  });
  const req = w.requiredMatch, meets = score.weighted >= req;
  const MAX = BALANCE.BAR_MAX;
  el.innerHTML = w.needs.map((n, i) => mixBar(n, score.perNeed[i], MAX)).join("");
  // have / need readout
  const ro = $("#m2-readout");
  if (ro) { ro.className = "m2-readout" + (meets ? " met" : ""); ro.innerHTML = `<b>${score.weighted}%</b><span>/${req}%</span>`; }
  // cauldron ready glow + double-tap hint
  const cd = $("#cauldron-tap"); if (cd) cd.classList.toggle("ready", meets);
  const hint = $("#serve-hint"); if (hint) hint.textContent = meets ? (ROUND.villain ? "double-tap to brew!" : "double-tap to serve!") : "";
  const cl = $("#cauldron"); if (cl) { const liq = cl.querySelector(".liquid"); if (liq) liq.style.height = Math.max(14, score.weighted) + "%"; }
  // allergy / poison danger chips — one compact row under the readout (only when present)
  const al = score.allergies || [];
  const ag = $("#m2-allergs");
  if (ag) ag.innerHTML = al.length ? al.map(mixAllergyChip).join("") : "";
  // a held Cleanse charm lights up green the moment an allergy climbs into the yellow/red zone
  const allergyHot = al.some(a => a.zone === "yellow" || a.zone === "red");
  document.querySelectorAll('.cslot[data-charmid="cleanse"]').forEach(el => el.classList.toggle("cleanse-glow", allergyHot));
  // timer badge above the cauldron (only for In-a-Rush)
  const tm = $("#m2-timer");
  if (tm) {
    if (ROUND.rush && ROUND.rushStart) {
      const left = Math.max(0, ROUND.rushMs - (Date.now() - ROUND.rushStart)), sec = Math.ceil(left / 1000);
      tm.innerHTML = `<div class="m2-timer-badge ${sec <= 10 ? "urgent" : ""}"><b>${sec}</b><span>seconds</span></div>`;
    } else tm.innerHTML = "";
  }
}
// One horizontal need bar: colored label pill + track with fill + green target band.
function mixBar(n, s, MAX) {
  const fillPct = Math.min(100, s.points / MAX * 100);
  const inBand = s.pct === 100, over = s.points > s.bandHigh;
  const bandLeft = Math.max(0, s.bandLow / MAX * 100), bandW = Math.max(4, (s.bandHigh - s.bandLow) / MAX * 100);
  if (!n.revealed) {
    return `<div class="mbar mystery"><span class="mbar-lbl" style="--lc:#7a6b95">? ? ?</span>
      <div class="mbar-track"><span class="mbar-band" style="left:${bandLeft}%;width:${bandW}%"></span>
        <i class="mbar-fill" style="width:${fillPct}%;background:${inBand ? "var(--good)" : "rgba(255,255,255,.28)"}"></i></div></div>`;
  }
  const col = D.MAGIC[n.type] || "#c48bff", frozen = !!n.frozen;
  const fillCol = inBand ? "var(--good)" : over ? "var(--bad)" : col;
  return `<div class="mbar ${inBand ? "hit" : ""}"><span class="mbar-lbl" style="--lc:${col}">${n.type}${frozen ? " ❄️" : ""}</span>
    <div class="mbar-track"><span class="mbar-band" style="left:${bandLeft}%;width:${bandW}%"></span>
      <i class="mbar-fill" style="width:${fillPct}%;background:${fillCol}"></i></div></div>`;
}
// A compact allergy/poison "danger" chip: warning icon + readable name + a slim meter that
// fills and reddens as you get closer to spoiling the wish. Keep it low to stay safe.
function mixAllergyChip(a) {
  const villain = !!(ROUND && ROUND.villain);
  const pct = Math.min(100, Math.round(a.points / BALANCE.ALLERGY_RED_AT * 100));
  const col = a.zone === "red" ? "#ff6b6b" : a.zone === "yellow" ? (villain ? "#ff6b6b" : "#ffd86b") : "#7ee08a";
  const label = villain ? "Poison" : a.type;
  return `<div class="allerg-chip zone-${a.zone}" style="--ac:${col}">
      <span class="allerg-ic">${villain ? "☠️" : "⚠️"}</span>
      <span class="allerg-nm">${label}</span>
      <span class="allerg-meter"><i style="width:${pct}%;background:${col}"></i></span>
    </div>`;
}
function paintMix() {
  const w = ROUND.wish;
  // remember how far the ingredient tray was scrolled so a tap doesn't snap it back to the start
  const prevScroll = (() => { const r = document.getElementById("inv-row"); return r ? r.scrollLeft : 0; })();
  const score = scoreMix(ROUND.slots, w, ROUND.allergyOffset);
  let best = w.needs[0], bestPct = -1;
  w.needs.forEach((n, i) => { if (score.perNeed[i].pct >= bestPct) { bestPct = score.perNeed[i].pct; best = n; } });
  const liquid = D.MAGIC[best.type] || "#c48bff";
  const slotCells = [];
  for (let i = 0; i < ROUND.maxSlots; i++) {
    const inst = ROUND.slots[i];
    const face = !inst ? "" : inst.wild ? "🌈"
      : inst.essence ? `<span class="orb" style="background:${D.MAGIC[inst.magic]}"></span>` : ingArt(inst.id);
    const removable = ROUND.villain && inst;
    const poisonedSlot = inst && ROUND.insight && inst.poison;
    slotCells.push(`<div class="slot ${inst ? "filled" : ""} ${inst && inst.potent ? "potent" : ""} ${inst && inst.shrunk ? "shrunk" : ""} ${removable ? "removable" : ""} ${poisonedSlot ? "poisoned" : ""}" ${removable ? `data-slot="${i}"` : ""}>${face}${poisonedSlot ? `<span class="poison-badge">☠️</span>` : ""}${inst && inst.shrunk ? `<span class="pinch-badge">🤏</span>` : ""}</div>`);
  }
  const showPet = !ROUND.villain;
  const banner = (!ROUND.villain && GAME.unlocked.undo) ? `${mixTreatsLeft()}/${BALANCE.MAX_TREATS_PER_ROUND}` : `🐸${GAME.treats}`;
  html("mix", `
    <div class="mixv2 ${ROUND.villain ? "villain" : ""}">
      <div class="m2-head">
        <div class="petbadge ${showPet ? "" : "nopet"}" id="familiar">
          <div class="petbadge-pet">${showPet ? equippedFamiliarChip() : "🔒"}</div>
          <div class="petbadge-count">${banner}</div>
        </div>
        <div class="m2-cust"></div>
        <button class="mixv-menu" id="hud-menu" aria-label="Menu">☰</button>
      </div>
      <div class="m2-timer" id="m2-timer"></div>
      <div class="m2-stage">
        <div class="m2-cauldron" id="cauldron-tap">
          <div class="cauldron ${equippedCauldronClass()}" id="cauldron">
            <div class="liquid" style="height:${Math.max(14, score.weighted)}%;background:linear-gradient(180deg, ${liquid}, ${shade(liquid)})"></div>
            <div class="bub b1"></div><div class="bub b2"></div><div class="bub b3"></div><div class="bub b4"></div><div class="bub b5"></div>
          </div>
          <div class="serve-hint" id="serve-hint"></div>
        </div>
      </div>
      <div class="m2-readout" id="m2-readout"></div>
      <div class="slots m2-slots">${slotCells.join("")}</div>
      <div class="m2-bars">
        <div class="m2-needs" id="mix-top"></div>
        <div class="m2-allergs" id="m2-allergs"></div>
      </div>
      ${mixCharmBarHtml()}
      <div class="m2-tray ${ROUND.toolMode ? "cutting" : ""}">${mixTrayHtml()}</div>
    </div>
  `);
  paintMixTop();
  applyCauldronArt();
  $("#screen-mix").querySelectorAll(".icard[data-idx]").forEach(t => t.addEventListener("click", () => addToSlot(+t.dataset.idx, t)));
  $("#screen-mix").querySelectorAll(".cslot[data-charm]").forEach(t => t.addEventListener("click", () => playCharm(+t.dataset.charm)));
  if (ROUND.villain) $("#screen-mix").querySelectorAll(".slot.removable").forEach(el => el.addEventListener("click", () => removeFromSlot(+el.dataset.slot)));
  const invRow = document.getElementById("inv-row");
  if (invRow) {
    invRow.scrollLeft = prevScroll;   // keep the tray where the player left it
    // desktop: let a vertical mouse wheel scroll the ingredient tray sideways
    invRow.addEventListener("wheel", e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // real horizontal scroll: leave it alone
      invRow.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }
  wireDoubleTapServe();
  wireFamiliar("mix");
  ROUND.inventory.forEach(inst => { if (inst && inst._glow) delete inst._glow; });
  const rc = document.getElementById("rush-clock"); if (rc) rc.style.display = "none";
}
// Two quick taps on the cauldron serves — deliberate, so no accidental serves.
function wireDoubleTapServe() {
  const el = $("#cauldron-tap"); if (!el) return;
  let last = 0;
  el.addEventListener("click", () => {
    const now = Date.now();
    if (now - last < 350) { last = 0; if (itemGateBlocks()) return; if (ROUND.slots.length === 0) { toast("Add some ingredients first!"); return; } serve(); }
    else { last = now; if (ROUND.slots.length) toast("Double-tap the cauldron to serve!"); }
  });
}
// Charm row: sits just above the ingredient tray (only shown when you actually hold charms),
// keeping the full tray width free for 3 ingredient cards across.
function mixCharmBarHtml() {
  const charmStacks = [], cmap = {};
  ROUND.charms.forEach((id, i) => {
    if (cmap[id] != null) charmStacks[cmap[id]].count++;
    else { cmap[id] = charmStacks.length; charmStacks.push({ id, firstIdx: i, count: 1 }); }
  });
  if (!charmStacks.length) return "";
  // STABLE ORDER: sort by the canonical charm list so a slot never jumps when you
  // spend one of a stack (otherwise double-tapping a 2-use charm hits the wrong slot).
  const order = D.SPECIAL_CHARM_IDS;
  charmStacks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const shown = charmStacks.slice(0, 6);
  return `<div class="m2-charmbar"><span class="m2-charmbar-lbl">Charms</span>${shown.map(charmSlot).join("")}</div>`;
}
// Bottom tray: ingredient cards, 3 across, scrolling sideways.
function mixTrayHtml() {
  const stacks = mixStacks();
  const cards = stacks.length ? stacks.map(ingCard).join("") : `<div class="tray-empty">Bag empty —<br>double-tap the cauldron to serve!</div>`;
  return `<div class="m2-ing" id="inv-row">${cards}</div>`;
}
function charmSlot(cs) {
  const ch = CHARM(cs.id);
  const on = (cs.id === "knife" && ROUND.toolMode === "cut") || (cs.id === "transmute" && ROUND.toolMode === "transmute") || (cs.id === "pinch" && ROUND.toolMode === "pinch");
  return `<button class="cslot ${on ? "on" : ""}" data-charm="${cs.firstIdx}" data-charmid="${cs.id}" title="${ch.name} — ${ch.desc}">
    <span class="cslot-ic">${charmArt(cs.id)}</span>${cs.count > 1 ? `<span class="cslot-n">×${cs.count}</span>` : ""}</button>`;
}
// Big ingredient card: art + name (left), up to 3 magic labels (right). Hidden magics show
// a faint "?" until Insight; the card always reserves space for 3 so it never resizes.
function ingCard(st) {
  const inst = st.rep, n = st.idxs.length, idx = st.idxs[0];
  const glow = st.idxs.some(i => ROUND.inventory[i] && ROUND.inventory[i]._glow);
  const cuttable = ROUND.toolMode ? " cuttable" : "";
  const insight = !!ROUND.insight;
  let art, list, name, cls = "", mainMagic = "";
  if (inst.wild) { art = "🌈"; list = ["any"]; name = "Wild"; cls = "wild"; mainMagic = inst.magic || "Love"; }
  else if (inst.essence) {
    art = `<span class="orb" style="background:${D.MAGIC[inst.magic]}"></span>`; list = [inst.magic];
    name = (inst.shrunk ? "½ " : "") + inst.magic + " Essence"; cls = "essence" + (inst.potent ? " potent" : "") + (inst.shrunk ? " shrunk" : ""); mainMagic = inst.magic;
  } else {
    const ing = D.INGREDIENT_BY_ID[inst.id];
    name = (inst.shrunk ? "½ " : "") + ing.name;
    list = inst.magic ? [inst.magic] : ing.qualities.slice();
    mainMagic = list[0]; cls = (inst.potent ? "potent " : "") + (inst.shrunk ? "shrunk " : "") + (ing.infused ? "infused" : "");
    art = ingArt(inst.id);
  }
  const singleKnown = inst.essence || inst.wild || !!inst.magic;   // these items only ever have one magic
  // infused ingredients carry a built-in charm effect — spell it out under the magic label
  const ingDef = (!inst.wild && !inst.essence) ? D.INGREDIENT_BY_ID[inst.id] : null;
  const infusedFx = ingDef && ingDef.infused ? INFUSED_LABEL[ingDef.infused] : "";
  // flag any magic that matches this customer's allergy so you don't have to scan back to the bars —
  // but NOT on the villain's ransom round, where spotting the hidden poison is the whole challenge
  const allergens = ROUND.villain ? [] : [ROUND.wish.allergy, ROUND.wish.allergy2].filter(Boolean);
  const mkPill = q => {
    const warn = allergens.includes(q);
    return `<span class="mp${warn ? " allergen" : ""}" style="--mc:${D.MAGIC[q] || "#888"}">${warn ? `<span class="mp-warn">⚠️</span>` : ""}<span class="mp-txt">${q}</span></span>`;
  };
  let pills = "";
  if (infusedFx) {
    // infused shows its real magic pill(s) then a plain-language effect line (no blank reserves)
    for (let r = 0; r < list.length; r++) {
      const reveal = r === 0 || insight || singleKnown;
      pills += reveal ? mkPill(list[r]) : `<span class="mp hidden">?</span>`;
    }
    pills += `<span class="icard-fx">${infusedFx}</span>`;
  } else {
    for (let r = 0; r < 3; r++) {
      if (r < list.length) {
        const reveal = r === 0 || insight || singleKnown;
        pills += reveal ? mkPill(list[r]) : `<span class="mp hidden">?</span>`;
      } else pills += `<span class="mp blank"></span>`;
    }
  }
  const poisoned = ROUND.insight && inst.poison;
  const badges = (poisoned ? `<span class="poison-badge">☠️</span>` : "") + (inst.shrunk ? `<span class="pinch-badge">🤏</span>` : "");
  return `<button class="icard ${cls}${cuttable}${glow ? " glow" : ""}${poisoned ? " poisoned" : ""}" title="${name}" data-idx="${idx}">
    <div class="icard-l"><div class="icard-art">${art}${badges}<span class="icard-gem" style="background:${D.MAGIC[mainMagic] || "#888"}"></span></div><div class="icard-nm">${name}</div></div>
    <div class="icard-r">${pills}</div>
    ${inst.potent ? `<span class="icard-star">✨</span>` : (infusedFx ? `<span class="icard-inf">💠</span>` : "")}${n > 1 ? `<span class="icard-count">×${n}</span>` : ""}</button>`;
}
const INFUSED_LABEL = { potentNext: "✨ Next drop counts double", lockBar: "❄️ Locks its bar — no overfill" };
const INFUSED_PER_ROUND = 1;   // guaranteed per round for now (prototype); tune later
// Replace a few random ingredient slots in the haul with infused ingredients.
function injectInfused(round) {
  const list = currentRealm().infused || []; if (!list.length) return; // only realms that define infused (Courtyard+) — they DEBUT there, not in Willow
  const idxs = []; round.haul.forEach((it, i) => { if (it.kind === "ingredient" && !D.INGREDIENT_BY_ID[it.id].infused) idxs.push(i); });
  for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t; }
  const n = INFUSED_PER_ROUND + (Math.random() < 0.4 ? 1 : 0); // 1, sometimes 2
  for (let k = 0; k < n && k < idxs.length; k++) round.haul[idxs[k]] = { kind: "ingredient", id: R.pick(list).id };
}
const KEY_DROP_CHANCE = 0.22;   // ~1 Treasure Key every ~5 rounds
// Occasionally swap a plain ingredient bubble for a Treasure Key (banks on pop).
function injectKeys(round) {
  if (Math.random() >= KEY_DROP_CHANCE) return;
  const idxs = []; round.haul.forEach((it, i) => { if (it.kind === "ingredient" && !D.INGREDIENT_BY_ID[it.id].infused) idxs.push(i); });
  if (idxs.length) round.haul[R.pick(idxs)] = { kind: "key" };
}
// Which need should a lockBar ingredient freeze: one it fills (by its magics), else
// the fullest unfrozen need (so it's never wasted).
function pickFreezeNeed(ing, inst) {
  const needs = ROUND.wish.needs;
  const mags = (inst && inst.magic) ? [inst.magic] : ing.qualities; // flex: the bar it actually fills
  for (const q of mags) { const n = needs.find(x => x.type === q && !x.frozen); if (n) return n; }
  const sc = scoreMix(ROUND.slots, ROUND.wish, ROUND.allergyOffset || 0);
  let best = null, bestPts = -1;
  needs.forEach((n, i) => { if (!n.frozen && sc.perNeed[i].points > bestPts) { bestPts = sc.perNeed[i].points; best = n; } });
  return best;
}
// Fire an infused ingredient's effect the moment it lands in the cauldron.
function applyInfusedEffect(inst) {
  const ing = inst && inst.id ? D.INGREDIENT_BY_ID[inst.id] : null;
  if (!ing || !ing.infused) return;
  if (ing.infused === "potentNext") {
    ROUND.potentNext = true; SFX.unlock(); SFX.charm();
    toast(`${ing.emoji} ${ing.name} — your next ingredient will be Potent! ✨`);
  } else if (ing.infused === "lockBar") {
    const need = pickFreezeNeed(ing, inst);
    if (need) { need.frozen = true; need.revealed = true; SFX.unlock(); SFX.charm(); toast(`${ing.emoji} ${ing.name} — ${need.type} is locked; it can't curdle! ❄️`); }
    else { toast(`${ing.emoji} ${ing.name} fizzles — nothing to lock.`); }
  }
}
function addToSlot(idx, fromEl) {
  if (ROUND.toolMode === "cut") { cutIngredient(idx, fromEl); return; }
  if (ROUND.toolMode === "transmute") { transmuteIngredient(idx, fromEl); return; }
  if (ROUND.toolMode === "pinch") { pinchIngredient(idx, fromEl); return; }
  if (ROUND.slots.length >= ROUND.maxSlots) { toast("The cauldron is full!"); return; }
  const inst = ROUND.inventory.splice(idx, 1)[0];
  if (ROUND.potentNext) { inst.potent = true; ROUND.potentNext = false; toast("✨ Potent!"); }
  const cauldron = document.getElementById("cauldron");
  const flyChar = inst.essence ? "💧" : D.INGREDIENT_BY_ID[inst.id].emoji;
  if (fromEl && cauldron) flyEmoji(fromEl.getBoundingClientRect(), cauldron.getBoundingClientRect(), flyChar);
  ROUND.slots.push(inst);
  applyInfusedEffect(inst);   // built-in charm effect (Dragon Egg / Frost Gem) fires on drop-in
  paintMix();
  const c2 = document.getElementById("cauldron"); if (c2) { c2.classList.remove("splash"); void c2.offsetWidth; c2.classList.add("splash"); }
}
// Knife: cut an ingredient into one pure-magic essence per quality.
function cutIngredient(idx, fromEl) {
  const inst = ROUND.inventory[idx];
  if (!inst || !inst.id || inst.essence) { toast("Pick a whole ingredient to cut."); return; }
  const ing = D.INGREDIENT_BY_ID[inst.id], wasPotent = !!inst.potent;
  ROUND.inventory.splice(idx, 1);
  // flex ingredients cut into their single assigned magic; normal ones into each quality
  const cutMagics = inst.magic ? [inst.magic] : ing.qualities;
  cutMagics.forEach(q => ROUND.inventory.push({ essence: true, magic: q, potent: wasPotent, _glow: true }));
  const ki = ROUND.charms.indexOf("knife"); if (ki >= 0) ROUND.charms.splice(ki, 1);
  ROUND.toolMode = null;
  SFX.unlock(); SFX.chop();
  if (navigator.vibrate) navigator.vibrate([8, 30, 8]);
  toast(`🔪 Cut ${wasPotent ? "Potent " : ""}${ing.name} into ${cutMagics.length} ${wasPotent ? "Potent " : ""}pure magic${cutMagics.length > 1 ? "s" : ""}!`);
  tryHuntFind("knife", fromEl);   // a hidden hunt item may be tucked inside an ingredient
  paintMix();
}
// Transmute: change a whole ingredient into a random NEEDED one (keeps potent).
function transmuteIngredient(idx, fromEl) {
  const inst = ROUND.inventory[idx];
  if (!inst || !inst.id || inst.essence) { toast("Pick a whole ingredient to transmute."); return; }
  // infused ingredients are special (rare + always-useful flex magic) — don't let them
  // be silently turned into a plain ingredient. Stay in transmute mode so another can be picked.
  if (D.INGREDIENT_BY_ID[inst.id] && D.INGREDIENT_BY_ID[inst.id].infused) {
    toast("✨ Infused ingredients are too magical to transmute — use it as-is!"); return;
  }
  const needs = ROUND.wish.needs.map(n => n.type);
  const SET = ROUND.ingredientSet || D.INGREDIENTS; // transmute within the current realm's pantry
  let pool = SET.filter(i => needs.includes(i.qualities[0]) && i.id !== inst.id);
  if (!pool.length) pool = SET.filter(i => i.id !== inst.id);
  const ing = R.pick(pool), oldName = D.INGREDIENT_BY_ID[inst.id].name;
  ROUND.inventory[idx] = { id: ing.id, potent: inst.potent, _glow: true };
  const ti = ROUND.charms.indexOf("transmute"); if (ti >= 0) ROUND.charms.splice(ti, 1);
  ROUND.toolMode = null;
  SFX.unlock(); SFX.reveal("charm", 0);
  if (navigator.vibrate) navigator.vibrate([8, 20, 8]);
  toast(`🔀 ${oldName} → ${inst.potent ? "Potent " : ""}${ing.name}!`);
  paintMix();
}
// Pinch: use just a pinch — halve an ingredient's magic (works on any ingredient
// or essence). Also softens its allergy contribution. A precise anti-overshoot tool.
function pinchIngredient(idx, fromEl) {
  const inst = ROUND.inventory[idx];
  if (!inst || (!inst.id && !inst.essence)) { toast("Pick an ingredient to pinch."); return; }
  if (inst.shrunk) { toast("Already pinched — that's as small as it gets!"); return; }
  inst.shrunk = true; inst._glow = true;
  const pi = ROUND.charms.indexOf("pinch"); if (pi >= 0) ROUND.charms.splice(pi, 1);
  ROUND.toolMode = null;
  SFX.unlock(); SFX.reveal("treat", 0);
  if (navigator.vibrate) navigator.vibrate(12);
  const nm = inst.essence ? inst.magic + " Essence" : D.INGREDIENT_BY_ID[inst.id].name;
  toast(`🤏 Just a pinch — ${nm}'s magic is halved.`);
  paintMix();
}
function playCharm(i) {
  const id = ROUND.charms[i]; if (!id) return; const w = ROUND.wish;
  const consume = () => { ROUND.charms.splice(i, 1); paintMix(); };
  if (id === "cleanse") { if (!w.allergy) { toast("No allergy to cleanse!"); return; } ROUND.allergyOffset += BALANCE.ALLERGY_CLEANSE; toast("🧹 Allergy calmed."); consume(); }
  else if (id === "insight") { if (ROUND.insight) { toast("Hidden magic already revealed."); return; } ROUND.insight = true; toast("🔍 Hidden magic revealed!"); consume(); }
  else if (id === "potent") { if (ROUND.potentNext) { toast("Potent is already primed."); return; } ROUND.potentNext = true; toast("✨ Your next ingredient counts double!"); consume(); }
  else if (id === "peek") { const n = w.needs.find(x => !x.revealed); if (!n) { toast("All needs already revealed."); return; } n.revealed = true; toast(`⏭️ Revealed: ${n.type}!`); consume(); }
  else if (id === "wild") { if (ROUND.slots.length >= ROUND.maxSlots) { toast("The cauldron is full!"); return; } const magic = R.pick(w.needs.map(x => x.type)); ROUND.slots.push({ wild: true, magic, strength: BALANCE.WILD_STRENGTH }); toast(`🌈 Wild ${magic} magic added!`); consume(); }
  else if (id === "knife") {
    if (ROUND.toolMode === "cut") { ROUND.toolMode = null; toast("🔪 Knife away."); paintMix(); return; }
    if (!ROUND.inventory.some(x => x.id && !x.essence)) { toast("No whole ingredient to cut!"); return; }
    ROUND.toolMode = "cut"; toast("🔪 Tap an ingredient to cut it into its magics."); paintMix();
  }
  else if (id === "transmute") {
    if (ROUND.toolMode === "transmute") { ROUND.toolMode = null; toast("🔀 Put away."); paintMix(); return; }
    if (!ROUND.inventory.some(x => x.id && !x.essence)) { toast("No ingredient to transmute!"); return; }
    ROUND.toolMode = "transmute"; toast("🔀 Tap an ingredient to transmute it into a needed one."); paintMix();
  }
  else if (id === "pinch") {
    if (ROUND.toolMode === "pinch") { ROUND.toolMode = null; toast("🤏 Put away."); paintMix(); return; }
    if (!ROUND.inventory.some(x => (x.id || x.essence) && !x.shrunk)) { toast("Nothing left to pinch!"); return; }
    ROUND.toolMode = "pinch"; toast("🤏 Tap an ingredient to use just a pinch (half magic)."); paintMix();
  }
}

/* ======================================================================= */
/* RESULT                                                                  */
/* ======================================================================= */
function serve() {
  if (ROUND.slots.length === 0) return;
  if (ROUND.villain) { queenServe(); return; }    // villain events score their own way
  stopRoundTimers();                              // served in time — stop the rush clock
  const res = scoreResult(ROUND);
  const isPerfect = res.success && res.weighted === 100 && !(res.allergy && (res.allergy.zone === "yellow" || res.allergy.zone === "red"));
  // WIN STREAK (boosts pay only — never the Well)
  if (res.success) {
    GAME.streak = (GAME.streak || 0) + 1;
    if (GAME.streak > (GAME.bestStreak || 0)) GAME.bestStreak = GAME.streak;
    res.streakBonus = streakBonusFor(GAME.streak);
    res.gold += res.streakBonus;
  } else { GAME.streak = 0; res.streakBonus = 0; }
  res.streak = GAME.streak;
  // ALLERGY-FREE STREAK: only wishes that ACTUALLY had an allergy to dodge qualify.
  // Grant one cleanly (served, allergy stayed green) → extend + pay Stardust.
  // Trigger the allergy or fail the wish → reset. No-allergy customers don't count
  // either way (they just pause the streak).
  const hadAllergy = (res.allergies || []).length > 0;
  const reacted = res.allergy && (res.allergy.zone === "yellow" || res.allergy.zone === "red");
  res.cleanDust = 0;
  if (hadAllergy) {
    if (res.success && !reacted) {
      GAME.cleanStreak = (GAME.cleanStreak || 0) + 1;
      if (GAME.cleanStreak > (GAME.bestCleanStreak || 0)) GAME.bestCleanStreak = GAME.cleanStreak;
      const dust = cleanStreakDust(GAME.cleanStreak);
      if (dust > 0) { GAME.stardust += dust; res.cleanDust = dust; }
    } else {
      GAME.cleanStreak = 0;
    }
  }
  res.cleanStreak = GAME.cleanStreak;
  res.hadAllergy = hadAllergy;
  // In-a-Rush: bonus for serving one in time
  if (ROUND.rush && res.success) { res.rushBonus = BALANCE.RUSH_BONUS; res.gold += res.rushBonus; }
  // VIP key wager: win → multiply the whole payout + bonus Stardust (key kept);
  // fail → the wagered key is lost.
  if (ROUND.vip && ROUND.keyStaked) {
    if (res.success) {
      res.vipKeyBonus = res.gold * (BALANCE.VIP_GOLD_MULT - 1);
      res.gold += res.vipKeyBonus;
      res.vipStardust = BALANCE.VIP_KEY_STARDUST; GAME.stardust += res.vipStardust;
      res.vipKept = true;
    } else {
      GAME.keys = Math.max(0, (GAME.keys || 0) - (BALANCE.VIP_KEY_COST || 1));
      res.vipKeyLost = true;
    }
  }
  if (ROUND.currency === "pearls") {
    GAME.pearls = (GAME.pearls || 0) + res.gold; res.paidPearls = res.gold;
    // one-time nudge so players learn where pearls are spent
    if (res.gold > 0 && !GAME.pearlHintSeen) { GAME.pearlHintSeen = true; setTimeout(() => toast("Spend pearls on rare skins in 🎨 My Skins!"), 2200); }
  } else { GAME.gold += res.gold; }
  // tracked stats for quests
  if (res.success) {
    bumpStat("served");
    if (ROUND.wish.boss) bumpStat("bossWins");
    if (ROUND.rush) bumpStat("rushWins");
    if (isPerfect) bumpStat("perfect");
    res.satchelDrop = maybeSatchelDrop(ROUND.customer);   // a keepsake from certain customers
    if (ROUND.customer && !ROUND.story) advanceCustStory(ROUND.customer.id);   // next chapter of their story
  }
  servedTotal++; localStorage.setItem("wishpop_served", servedTotal); save();
  renderResult(res);
}
function renderResult(res) {
  const win = res.success, c = ROUND.customer, realm = currentRealm(), zone = res.allergy && res.allergy.zone;
  const allergic = win && (zone === "yellow" || zone === "red");
  // PERFECT = a spotless 100% win with NO allergy reaction. An allergic win is
  // only "almost perfect", so it does not earn the confetti celebration.
  const isPerfect = win && res.weighted === 100 && !allergic;
  const trashN = (res.trash || []).length;
  const emoji = !win ? "😤" : isPerfect ? "🥳" : zone === "red" ? "🤧" : zone === "yellow" ? "😅" : (res.tip > 0 ? "🤩" : "😊");
  // Which of the customer's four faces to show: angry on a fail, allergic on an
  // allergy reaction, otherwise happy. Falls back to the emotion emoji above.
  const mood = !win ? "angry" : allergic ? "allergic" : "happy";
  // Outcome banner (baked-text image): granted / worked-but / failed.
  const bannerImg = !win ? "banner_failed" : allergic ? "banner_partial" : "banner_granted";
  const bannerAlt = !win ? "Wish Failed!" : allergic ? "Wish Worked, But…!" : "Wish Granted!";
  const blurb = !win
    ? c.name + " storms off in a huff — and pelts you with trash on the way out!"
    : isPerfect ? c.name + " got a flawless potion — 100% perfect! ✨"
    : zone === "red" ? "The wish worked… but " + c.name + " reacted to the " + res.allergy.type + " magic! Half pay."
    : zone === "yellow" ? c.name + " got their wish, but a little " + res.allergy.type + " magic left them itchy."
    : res.qualityTip > 0 ? c.name + " loves it — that potion was practically perfect!" : res.quickTip > 0 ? c.name + " is thrilled with the speedy service!" : c.name + " is happy with their wish!";
  ROUND.lastRes = res;   // stashed so the Results scroll can open the full round breakdown
  // The parchment panel: "Total Earned" (tallies as you pop reward bubbles) on a
  // win, or the trash-caught counter on a loss — plus the reaction line + badges.
  // Total Earned shows the payment currency icon (gold coin / pearl / …) then any
  // Stardust earned this round (allergy-free streak + VIP key bonus).
  const curIcon = ROUND.currency === "pearls"
    ? `<span class="res-cur">${PEARL}</span>`
    : `<img class="res-coin" src="art/ui/kit_13.png" alt="🪙">`;   // gold is the default; future currencies extend here
  const roundDust = (res.cleanDust || 0) + (res.vipStardust || 0);
  const dustBit = win && roundDust > 0 ? ` <span class="res-dust">✨ <b id="rb-dust">0</b></span>` : "";
  // A little pill by "Total Earned" flags the allergy pay cut (yellow = −25%, red = −50%).
  const allergyTag = allergic ? `<span class="res-atag ${zone}">Allergy −${zone === "red" ? "50" : "25"}%</span>` : "";
  const earnedLine = win
    ? `<div class="res-earned">Total Earned: ${curIcon} <b id="rb-count">0</b>${dustBit}${allergyTag}</div>`
    : `<div class="res-earned lose">🗑️ Caught <b id="trash-count">0</b>/${trashN}</div>`;
  const hintTxt = win
    ? (roundDust > 0 ? "Pop for coins — and your Stardust! 🫧" : res.tip > 0 ? "Catch the floating coins to collect them! 🫧" : "Pop your reward bubble! 🫧")
    : (trashN ? "Catch the junk to recycle it later! 🍌" : "");
  const hintLine = hintTxt ? `<div class="res-hint muted" id="${win ? "rb-hint" : "trash-hint"}">${hintTxt}</div>` : "";
  const custBgEl = REALM_BG[GAME.realm] ? `<div class="cust-bg mg-fullbleed" id="cust-bg"></div>` : "";
  html("result", `
    ${custBgEl}
    <div class="cust-top res-top">
      <div class="cust-realm">${realm.icon} <span>${realm.name}</span></div>
      <div class="cust-wallet">
        ${GAME.pearls > 0 ? `<div class="cust-coin pearls">${PEARL} <b>${GAME.pearls.toLocaleString()}</b></div>` : ""}
        <div class="cust-coin"><img src="art/ui/kit_13.png" alt="🪙"><b>${(GAME.gold || 0).toLocaleString()}</b></div>
      </div>
    </div>
    <div class="grow res-body">
      <div class="cust-banner res-banner"><img src="art/ui/${bannerImg}.png" alt="${bannerAlt}" draggable="false"></div>
      <div class="cust-portrait res-portrait">
        <button class="res-results" id="recap-btn" aria-label="Round recap"><img src="art/ui/res_results.png" alt="Results" draggable="false"></button>
        <div class="cust-char ${isPerfect ? "boss-emoji" : ""}" style="--char-scale:${CHAR_SCALE[c.id] || 1};--char-y:${CHAR_OFFY[c.id] || 0}%">${custMoodArt(c, mood, emoji, "cust-char-art")}</div>
      </div>
      <div class="res-panel">
        ${earnedLine}
        <div class="res-react">${blurb}</div>
        ${resultBadgesMarkup(res)}
        ${hintLine}
      </div>
    </div>
    <button class="res-next" id="next-btn" aria-label="Next customer"><img src="art/ui/btn_next.png" alt="Next Customer" draggable="false"></button>
  `);
  on("#next-btn", "click", () => { if (itemGateBlocks()) return; (ROUND && isStoryWish(ROUND.story)) ? storyWishOutro(ROUND.story, res.success) : startRound(); });
  on("#recap-btn", "click", showRoundRecap);
  applyRealmBackground(document.querySelector("#screen-result #cust-bg"));
  show("result");
  if (win) wireRewardBubbles(res);
  // fallback: if this round was meant to reveal a hunt item but its phase never happened
  // (e.g. a fail with no tip, or no knife cut), reveal it here so it's never skipped.
  if (ROUND && ROUND.huntPending && !ROUND.huntFound) setTimeout(() => { if (ROUND && ROUND.huntPending && !ROUND.huntFound) doHuntFind(null); }, 1300);
  if (trashN) wireTrashBubbles(res);   // trash always spawns on a loss, even if a quest item turned up too
  if (isPerfect) setTimeout(celebratePerfect, 260);
}
// --- Loss: disgruntled customer throws trash. It floats around the result
// screen like the reward coins; pop each piece to collect it into your bin
// (capped at TRASH_BIN_MAX). Recycle it later for coins or Stardust. ---------
function wireTrashBubbles(res) {
  const sc = screen("result"); if (!sc) return;
  const items = (res.trash || []).slice(); if (!items.length) return;
  const countEl = document.querySelector("#screen-result #trash-count");
  const hintEl = document.querySelector("#screen-result #trash-hint");
  const layer = document.createElement("div"); layer.className = "rb-float-layer";
  sc.appendChild(layer);
  const cap = BALANCE.TRASH_BIN_MAX;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let caught = 0, anyOverflow = false;
  items.forEach(id => {
    const t = D.TRASH_BY_ID[id]; if (!t) return;
    const wrap = document.createElement("div"); wrap.className = "rbub-wrap";
    wrap.style.left = rnd(8, 78) + "%"; wrap.style.top = rnd(14, 72) + "%";
    for (let k = 1; k <= 3; k++) { wrap.style.setProperty("--dx" + k, rnd(-46, 46).toFixed(0) + "px"); wrap.style.setProperty("--dy" + k, rnd(-46, 46).toFixed(0) + "px"); }
    wrap.style.animationDuration = rnd(5, 9).toFixed(2) + "s";
    wrap.style.animationDelay = "-" + rnd(0, 5).toFixed(2) + "s";
    const btn = document.createElement("button"); btn.className = "rbub tbub"; btn.setAttribute("aria-label", t.name);
    btn.innerHTML = trashArt(id, "tbub-face");
    wrap.appendChild(btn); layer.appendChild(wrap);
    btn.addEventListener("click", () => {
      if (btn.classList.contains("popped")) return; btn.classList.add("popped");
      SFX.unlock(); SFX.pop(1);
      const r = btn.getBoundingClientRect();
      resultBurst(r.left + r.width / 2, r.top + r.height / 2, "coin");
      let stored = false;
      if (GAME.trash.length < cap) { GAME.trash.push(id); save(); stored = true; } else anyOverflow = true;
      if (stored) caught++;
      if (countEl) { countEl.textContent = caught; countEl.classList.remove("bumped"); void countEl.offsetWidth; countEl.classList.add("bumped"); }
      if (anyOverflow && hintEl) hintEl.textContent = "🗑️ Bin full — recycle some to make room!";
      const w = btn.parentElement; setTimeout(() => { if (w) w.remove(); }, 240);
    });
  });
}
// --- Result-screen reward bubbles: a BIG bubble holding the base gold, plus one
// LITTLE bubble per tip coin. They FLOAT freely all over the result screen
// (drifting up/down/side to side); tap them wherever they wander. Pop the big one
// first and it auto-pops the little ones; or pop the little ones and save it. ---
// New results screen: the two streak badges use the ornate frame art (res_streak /
// res_clean). The streak COUNT sits in the badge's empty slot; a "+N" tag shows the
// reward that streak paid THIS round (gold for wins, Stardust for allergy-free).
function resultBadgesMarkup(res) {
  const ws = GAME.streak || 0, cs = GAME.cleanStreak || 0;
  const cleanGrew = res.hadAllergy && res.success && !(res.allergy && (res.allergy.zone === "yellow" || res.allergy.zone === "red"));
  const goldTag = res.streakBonus > 0 ? `<span class="res-tag gold">+${res.streakBonus}🪙</span>` : "";
  const dustTag = res.cleanDust > 0 ? `<span class="res-tag dust">+${res.cleanDust}✨</span>` : "";
  const badge = (cls, img, n, pop, tag) =>
    `<div class="res-badge ${cls}${pop ? " pop" : ""}"><img src="art/ui/${img}.png" alt="" draggable="false"><span class="res-n${n === 0 ? " zero" : ""}">${n}</span>${tag}</div>`;
  // Badges always show in full colour (no graying out), win or lose.
  return `<div class="res-badges">
    ${badge("streak", "res_streak", ws, res.success && res.streakBonus > 0, goldTag)}
    ${badge("clean", "res_clean", cs, cleanGrew, dustTag)}
  </div>`;
}
function wireRewardBubbles(res) {
  const sc = screen("result"); if (!sc) return;
  const countEl = document.querySelector("#screen-result #rb-count");
  const dustEl = document.querySelector("#screen-result #rb-dust");
  const hintEl = document.querySelector("#screen-result #rb-hint");
  const streakAmt = Math.max(0, res.streakBonus || 0), dustAmt = (res.cleanDust || 0) + (res.vipStardust || 0);
  const base = Math.max(0, res.gold - res.tip - streakAmt), tips = Math.max(0, res.tip);
  const layer = document.createElement("div"); layer.className = "rb-float-layer";
  sc.appendChild(layer);
  let collected = 0, dustGot = 0, littleStep = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const bump = amt => {
    collected += amt;
    if (countEl) { countEl.textContent = collected; countEl.classList.remove("bumped"); void countEl.offsetWidth; countEl.classList.add("bumped"); }
  };
  const bumpDust = amt => {
    dustGot += amt;
    if (dustEl) { dustEl.textContent = dustGot; dustEl.classList.remove("bumped"); void dustEl.offsetWidth; dustEl.classList.add("bumped"); }
  };
  // build one drifting bubble; the wrap wanders (translate), the button pops (scale)
  const makeBubble = (cls, amt, opts = {}) => {
    const big = !!opts.big, wide = big || cls === "dust" || cls === "streak";
    const wrap = document.createElement("div"); wrap.className = "rbub-wrap";
    wrap.style.left = rnd(6, wide ? 58 : 78) + "%";
    wrap.style.top = rnd(14, 72) + "%";
    for (let k = 1; k <= 3; k++) { wrap.style.setProperty("--dx" + k, rnd(-46, 46).toFixed(0) + "px"); wrap.style.setProperty("--dy" + k, rnd(-46, 46).toFixed(0) + "px"); }
    wrap.style.animationDuration = rnd(5, 9).toFixed(2) + "s";
    wrap.style.animationDelay = "-" + rnd(0, 5).toFixed(2) + "s"; // desync so they don't move in lockstep
    const btn = document.createElement("button");
    btn.className = "rbub " + cls; btn.dataset.amt = amt; if (big) btn.dataset.big = "1"; btn.dataset.flavor = opts.flavor || (big ? "gold" : "coin");
    btn.setAttribute("aria-label", cls === "dust" ? "stardust reward" : cls === "streak" ? "win-streak bonus" : big ? "gold reward" : "tip coin");
    const coin = ROUND && ROUND.currency === "pearls" ? PEARL : "🪙";
    btn.innerHTML = cls === "dust" ? `<span class="rb-amt">✨ ${amt}</span>` : cls === "streak" ? `<span class="rb-amt">🔥 ${amt}</span>` : big ? `<span class="rb-amt">${coin} ${amt}</span>` : coin;
    wrap.appendChild(btn); layer.appendChild(wrap);
    return btn;
  };
  const popBub = btn => {
    if (!btn || btn.classList.contains("popped")) return;
    btn.classList.add("popped");
    const amt = +btn.dataset.amt || 0, big = btn.dataset.big, flavor = btn.dataset.flavor;
    const r = btn.getBoundingClientRect();
    resultBurst(r.left + r.width / 2, r.top + r.height / 2, flavor === "stardust" ? "stardust" : (big || flavor === "streak") ? "gold" : "coin");
    if (flavor === "stardust") { bumpDust(amt); SFX.bigCoin(); }
    else { bump(amt); if (big || flavor === "streak") SFX.bigCoin(); else SFX.coin(littleStep++); }
    const wrap = btn.parentElement;
    setTimeout(() => { if (wrap) wrap.remove(); }, 240);
    if (btn.classList.contains("little")) tryHuntFind("tip", btn);   // a hidden hunt item may be in a tip bubble
    checkDone();
  };
  const checkDone = () => setTimeout(() => {
    if (!layer.querySelector(".rbub:not(.popped)") && hintEl) hintEl.innerHTML = `All collected! ${ROUND && ROUND.currency === "pearls" ? PEARL : "🪙"} ${res.gold}${dustAmt ? ` · ✨ ${dustAmt}` : ""}`;
  }, 260);
  const bigBtn = makeBubble("big", base, { big: true });
  const littleBtns = [];
  for (let i = 0; i < tips; i++) littleBtns.push(makeBubble("little", 1));
  const streakBtn = streakAmt > 0 ? makeBubble("streak", streakAmt, { flavor: "streak" }) : null;
  const dustBtn = dustAmt > 0 ? makeBubble("dust", dustAmt, { flavor: "stardust" }) : null;
  bigBtn.addEventListener("click", () => {
    SFX.unlock(); popBub(bigBtn);
    // popping the big bubble cascades the medium bonus bubbles (streak 🔥 + stardust ✨) FIRST
    // so they feel linked to the big pop, then all remaining tip coins
    const cascade = [...layer.querySelectorAll(".rbub.streak:not(.popped), .rbub.dust:not(.popped)"), ...layer.querySelectorAll(".rbub.little:not(.popped)")];
    cascade.forEach((b, i) => setTimeout(() => popBub(b), 90 * (i + 1)));
  });
  littleBtns.forEach(b => b.addEventListener("click", () => { SFX.unlock(); popBub(b); }));
  if (streakBtn) streakBtn.addEventListener("click", () => { SFX.unlock(); popBub(streakBtn); });
  if (dustBtn) dustBtn.addEventListener("click", () => { SFX.unlock(); popBub(dustBtn); });
}
// A confetti/sparkle burst for a 100% "Perfect!" win, drawn over the result screen.
function celebratePerfect() {
  const sc = screen("result"); if (!sc) return;
  SFX.perfect();
  const layer = document.createElement("div"); layer.className = "confetti-layer";
  const cols = ["#ffd76a", "#ff6ea8", "#4fc96a", "#6a7bd6", "#ffe98a", "#e07be0", "#8fe9ff", "#c48bff"];
  for (let i = 0; i < 54; i++) {
    const p = document.createElement("i"); p.className = "confetti";
    p.style.left = (3 + (i * 37) % 94) + "%";
    p.style.background = cols[i % cols.length];
    p.style.setProperty("--dx", (((i * 53) % 80) - 40) + "px");
    p.style.setProperty("--rot", ((i * 47) % 360) + "deg");
    p.style.animationDelay = ((i % 12) * 0.05).toFixed(2) + "s";
    p.style.animationDuration = (1.7 + (i % 5) * 0.22).toFixed(2) + "s";
    layer.appendChild(p);
  }
  for (let i = 0; i < 10; i++) {
    const s = document.createElement("span"); s.className = "spk"; s.textContent = "✨";
    s.style.left = (12 + (i * 41) % 76) + "%";
    s.style.top = (18 + (i * 29) % 46) + "%";
    s.style.animationDelay = ((i % 6) * 0.11).toFixed(2) + "s";
    layer.appendChild(s);
  }
  sc.appendChild(layer);
  setTimeout(() => layer.remove(), 2800);
}
// Self-contained particle burst for the result screen (its own layer).
function resultBurst(x, y, flavor) {
  const sc = screen("result"); if (!sc) return;
  const parts = flavor === "stardust" ? ["#c48bff", "#e6b3ff", "#8fe9ff", "#ffffff"]
    : flavor === "gold" ? POP_FLAVOR.gold.parts : POP_FLAVOR.bubble.parts;
  const n = flavor === "gold" || flavor === "stardust" ? 16 : 9;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"); p.className = "particle";
    const wide = flavor === "gold" || flavor === "stardust";
    const ang = (Math.PI * 2 * i) / n + (i % 2) * 0.4, dist = wide ? 46 + (i % 4) * 16 : 30 + (i % 3) * 12;
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", (Math.sin(ang) * dist - 8) + "px");
    p.style.background = parts[i % parts.length];
    p.style.width = p.style.height = (wide ? 7 : 5) + (i % 3) * 3 + "px";
    p.style.zIndex = "60";
    sc.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}
function roundRecap() {
  const s = ROUND.stats, res = ROUND.lastRes;
  if (!s && !res) return "";
  const coin = ROUND.currency === "pearls" ? PEARL : "🪙";
  // The wish outcome breakdown (moved off the main results screen — the tidy
  // screen shows only the total; the full math lives here behind the scroll).
  let outcome = "";
  if (res) {
    const win = res.success, zone = res.allergy && res.allergy.zone;
    const streakBonus = Math.max(0, res.streakBonus || 0);
    const rows = [`<div class="stat-line"><span>Your Match</span><span><b>${res.weighted}%</b></span></div>`,
      `<div class="stat-line"><span>Needed</span><span>${res.required}%</span></div>`];
    if (win) {
      rows.push(`<div class="stat-line"><span>Base pay</span><span class="gold">${coin} ${Math.max(0, res.gold - res.tip - streakBonus)}</span></div>`);
      if (res.quickTip > 0) rows.push(`<div class="stat-line"><span>⚡ Quick‑service tip</span><span class="gold">${coin} +${res.quickTip}</span></div>`);
      if (res.qualityTip > 0) rows.push(`<div class="stat-line"><span>✨ Perfect potion!</span><span class="gold">${coin} +${res.qualityTip}</span></div>`);
      if (res.rushBonus > 0) rows.push(`<div class="stat-line"><span>⏱️ Beat the clock!</span><span class="gold">🪙 +${res.rushBonus}</span></div>`);
      if (streakBonus > 0) rows.push(`<div class="stat-line"><span>🔥 Win‑streak bonus</span><span class="gold">🪙 +${streakBonus}</span></div>`);
      if (res.cleanDust > 0) rows.push(`<div class="stat-line"><span>💚 Allergy‑free Stardust</span><span style="color:#c48bff">✨ +${res.cleanDust}</span></div>`);
      if (zone === "yellow" || zone === "red") rows.push(`<div class="stat-line"><span>⚠️ Allergy (${zone})</span><span style="color:var(--bad)">${zone === "red" ? "−50%" : "−25%"} pay</span></div>`);
      if (res.vipKept) rows.push(`<div class="stat-line"><span>⭐ VIP key bonus ×${BALANCE.VIP_GOLD_MULT}</span><span class="gold">🪙 +${res.vipKeyBonus} · ✨ +${res.vipStardust}</span></div>`);
      rows.push(`<div class="stat-line"><span><b>Total earned</b></span><span class="gold"><b>${coin} ${res.gold}${ROUND.currency === "pearls" ? " pearls" : ""}</b></span></div>`);
    } else {
      rows.push(`<div class="stat-line"><span>Earned</span><span class="muted">no coins — just trash!</span></div>`);
      rows.push(`<div class="stat-line"><span>🗑️ Trash thrown</span><span><b>${(res.trash || []).length}</b></span></div>`);
      if (res.vipKeyLost) rows.push(`<div class="stat-line"><span>🗝️ Wagered ${BALANCE.VIP_KEY_COST} keys</span><span style="color:var(--bad)">lost!</span></div>`);
      rows.push(`<div class="stat-line"><span>🔥 Win streak</span><span class="muted">broken</span></div>`);
    }
    if (res.satchelDrop && satchelItem(res.satchelDrop)) rows.push(`<div class="stat-line"><span>${satchelItem(res.satchelDrop).emoji} ${satchelItem(res.satchelDrop).name}</span><span style="color:var(--good)">→ your Satchel! 🎒</span></div>`);
    outcome = `<div class="card" style="width:100%;max-width:320px"><div style="font-weight:800;text-align:center;margin-bottom:6px">🎯 This Wish</div>${rows.join("")}</div>`;
  }
  let stats = "";
  if (s) {
    stats = `<div class="card" style="width:100%;max-width:320px">
    <div style="font-weight:800;text-align:center;margin-bottom:6px">📋 Round Recap</div>
    <div class="stat-line"><span>🥄 Bubbles scooped</span><span><b>${s.scooped}</b></span></div>
    <div class="stat-line"><span>🫧 Bubbles popped <span class="muted" style="font-size:11px">(incl. bonus)</span></span><span><b>${s.popped}</b></span></div>
    <div class="stat-line"><span>🎒 Ingredients found</span><span><b>${s.ingredients}</b></span></div>
    <div class="stat-line"><span>✨ Charms found</span><span><b>${s.charms}</b></span></div>
    <div class="stat-line"><span>🪙 Gold · 🐸 Treats gained</span><span><b>${s.gold}</b> · <b>${s.treats}</b></span></div>
    <div class="stat-line"><span>🔺 Triples made</span><span><b>${s.triples}</b></span></div>
  </div>`;
  }
  return outcome + stats;
}
// Round Recap is tucked behind a button now — pop it up as an overlay on demand.
function showRoundRecap() {
  const inner = roundRecap(); if (!inner) { toast("No recap this round."); return; }
  const ov = document.createElement("div"); ov.className = "recap-overlay";
  ov.innerHTML = `<div class="recap-sheet">${inner}<button class="btn" id="recap-close">Close</button></div>`;
  document.getElementById("app").appendChild(ov);
  const close = () => ov.remove();
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  ov.querySelector("#recap-close").addEventListener("click", close);
}

/* ======================================================================= */
/* Shared bits                                                             */
/* ======================================================================= */
function flyEmoji(from, to, emoji) {
  const f = document.createElement("div"); f.textContent = emoji;
  f.style.cssText = `position:fixed;left:${from.left + from.width / 2 - 14}px;top:${from.top}px;font-size:28px;z-index:40;pointer-events:none;transition:transform .35s cubic-bezier(.5,-0.2,.5,1.2),opacity .35s`;
  document.body.appendChild(f);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2), dy = (to.top + to.height * 0.5) - from.top;
  requestAnimationFrame(() => { f.style.transform = `translate(${dx}px,${dy}px) scale(.5)`; f.style.opacity = "0.15"; });
  setTimeout(() => f.remove(), 380);
}
function showTriple(mergedIds, cb) {
  const names = mergedIds.map(id => D.INGREDIENT_BY_ID[id].name);
  const ov = document.createElement("div"); ov.className = "triple-overlay";
  ov.innerHTML = `<div class="triple-card"><div style="font-size:46px">✨🫙✨</div><div class="tt">Triple Match!</div>
    <div class="muted">${names.map(n => `3 ${n} → 1 <b>Potent ${n}</b>`).join("<br>")}</div></div>`;
  $("#app").appendChild(ov);
  setTimeout(() => { ov.remove(); cb(); }, 1500);
}
function confirmDialog(msg, onYes) {
  const ov = document.createElement("div"); ov.className = "confirm-overlay";
  ov.innerHTML = `<div class="confirm-card"><div class="confirm-msg">${msg}</div>
    <div class="row" style="justify-content:center"><button class="btn secondary small" id="cf-no">No</button><button class="btn good small" id="cf-yes">Yes</button></div></div>`;
  $("#app").appendChild(ov);
  ov.querySelector("#cf-no").addEventListener("click", () => ov.remove());
  ov.querySelector("#cf-yes").addEventListener("click", () => { ov.remove(); onYes(); });
}
function familiarToken(phase) {
  if (ROUND && ROUND.villain) return ""; // Pet is captured during a villain event — no helper on screen
  const active = phase === "mix" && GAME.unlocked.undo;
  return `<div class="familiar" id="familiar">${equippedFamiliarChip()}${active ? `<span class="fam-badge">🐾</span>` : ""}</div>`;
}
function wireFamiliar(phase) {
  if (ROUND && ROUND.villain) return; // no Pet abilities during a villain event
  const el = document.querySelector("#screen-" + phase + " #familiar"); if (!el) return;
  el.addEventListener("click", () => {
    if (phase === "mix") { if (GAME.unlocked.undo) familiarUndo(); else toast("🐾 Unlock 'Undo' in Shop & Upgrades!"); }
    else if (phase === "scoop") toast(GAME.unlocked.scoop ? "🐾 Better Scoop is boosting your haul!" : "🐾 Unlock 'Better Scoop' in Shop & Upgrades!");
    else toast(GAME.unlocked.charm ? "🐾 Keen Nose — sniffing out extra charms & ingredients!" : "🐾 Unlock 'Keen Nose' in Shop & Upgrades!");
  });
}
// Villain rounds: tap a filled cauldron slot to return that ingredient to the bag
// (there's no Pet Undo here — this lets you pull out a poison you didn't mean to add).
function removeFromSlot(i) {
  const inst = ROUND.slots[i]; if (!inst) return;
  ROUND.slots.splice(i, 1);
  // a played Wild charm goes back to the tray (it's not a bag ingredient); everything
  // else (ingredients, essences) returns to the bag.
  if (inst.wild) { ROUND.charms.push("wild"); toast("🌈 Wild charm back in your tray."); }
  else ROUND.inventory.push(inst);
  SFX.pop(1);
  paintMix();
}
function familiarUndo() {
  if (ROUND.villain) return; // Pet is captured — no undo during a villain event
  if (!ROUND.slots.length) { toast("Nothing to undo."); return; }
  if (GAME.treats <= 0) { toast("No treats left! Buy more with gold."); return; }
  if (ROUND.treatsUsed >= BALANCE.MAX_TREATS_PER_ROUND) { toast("Your pet's had enough (5 per round)."); return; }
  confirmDialog("Undo the last ingredient? (1 treat) 🐾", () => {
    GAME.treats--; ROUND.treatsUsed++; save();
    ROUND.slots.pop();
    toast("🐾 Removed the last ingredient.");
    paintMix();
  });
}

/* boot */
// test-only hook (enabled with localStorage wishpop_test=1) for automated checks
if (localStorage.getItem("wishpop_test") === "1") {
  window.__wp = { get ROUND() { return ROUND; }, set ROUND(v) { ROUND = v; }, get GAME() { return GAME; }, playArrivalIntro, startRedWish, startStoryWish, storyWishOutro, isStoryWish, playZoomIn, renderStoryBeats, playRedVacation, playRedImpostor, maybeRedVisit, playBoPeep, maybeBoPeep, boPeepCust, huntUnlocked, playPigsMoving, maybePigsMoving, playGoldiMouse, playGoldiDeliver, renderGoldiDeliver, goldiFinale, maybeGoldilocksQuest, BAND, bandMember, playBandAnnounce, playBandDeliver, maybeBandVisit, playGrandmaWolf, forceCustomer, maybeHare, maybeTortoise, playWolfButtons, playRedButtons, playGingerbreadButton, maybeButtonChain, wolfCust, satchelLocked, playWolfVisit, maybeWolfArc, WOLF_VISITS, currentWolfVisit, renderSatchel, inventoryGroups, openInvQuest, satchelAdd, satchelCount, satchelRemove, satchelTotal, maybeSatchelDrop, SATCHEL_ITEMS, CUSTOMER_ARCS, custChapter, custStoryStep, advanceCustStory, applyCustArc, adminCustomer, save, popAt, spawnBonusBubbles, charmCelebrate, refreshPop, collectAndContinue, paintMix, paintMixTop, playCharm, addToSlot, renderResult, rollWellPrize, renderWell, wellToss, playWellIntro, maybeWellIntro, renderRecycle, renderMenu, renderQuests, refreshQuests, bumpStat, serve, startRound, renderCustomer, renderScoop, setupPopWood, breakPopWood, popTapX, showPopTreasure, grabPopTreasure, rushExpire, renderFairyIntro, renderFairy, maybeEvent, renderDuelIntro, renderDuel, get DUEL() { return DUEL; }, duelResolve, renderStart, custMoodArt, logoMarkup, renderAdmin, renderRumpelIntro, renderRumpelRound, renderRumpelTally, rumpelStop, get RUMPEL() { return RUMPEL; }, set RUMPEL(v) { RUMPEL = v; }, renderGoblinIntro, goblinRequest, goblinFeed, goblinPass, goblinResolve, get GOBLIN() { return GOBLIN; }, set GOBLIN(v) { GOBLIN = v; }, renderWolfIntro, renderWolfFinale, wolfStart, wolfFeed, wolfTick, wolfFinish, get WOLF() { return WOLF; }, set WOLF(v) { WOLF = v; }, renderFeastIntro, renderFeastFinale, feastStart, feastCatch, feastPlace, feastTick, feastFinish, feastSurging, FEAST_KINDS, FEAST_MODES, get FEAST() { return FEAST; }, set FEAST(v) { FEAST = v; }, renderStackIntro, renderStackFinale, stackStart, stackTick, stackFinish, stackCatch, stackBodyHit, stackFinishInfinite, STACK_KINDS, STACK_MODES, STACK_CATCH_Y, get STACK() { return STACK; }, set STACK(v) { STACK = v; }, renderWineIntro, wineStart, wineTick, wineTap, wineThrow, wineFinish, WINE_MODES, get WINE() { return WINE; }, set WINE(v) { WINE = v; }, renderBoutiqueIntro, boutiqueStart, boutiqueTick, boutiqueAdvance, boutiqueSpawn, boutiqueDeliver, boutiqueFinish, BOUTIQUE_MODES, get BOUTIQUE() { return BOUTIQUE; }, set BOUTIQUE(v) { BOUTIQUE = v; }, renderCarpetIntro, carpetStart, carpetTick, carpetSteer, carpetCatchStar, carpetStarHit, carpetCrash, carpetFinish, carpetFinishInfinite, carpetAddStar, carpetAddCloud, carpetAddPlanet, CARPET_MODES, get CARPET() { return CARPET; }, set CARPET(v) { CARPET = v; }, markRealmEventCleared, markRealmFinaleWon, realmFinaleWon, realmEventsCleared, realmEventsNeeded, realmStoryComplete, eventPlanPreview, REALM_EVENT_PLAN, setupHunt, tryHuntFind, doHuntFind, activeHunt, huntState, huntComplete, maybeShowHuntCelebrate, HUNTS, revealItem, openItemReveal, refreshItemBubble, renderDanceIntro, danceStep, danceAdvance, danceTap, danceJudge, danceMeterPct, danceFinish, get DANCE() { return DANCE; }, set DANCE(v) { DANCE = v; }, renderCakeIntro, cakeStartTier, cakeToDecorate, cakePlace, cakeUndo, cakeRedo, cakeSubmitTier, cakeTierCleared, cakeFinish, get CAKE() { return CAKE; }, set CAKE(v) { CAKE = v; }, renderQueenIntro, queenBuy, queenServe, renderQueenResult, ingInst, injectInfused, injectKeys, applyInfusedEffect, renderVault, openChest, rollChestPrize, renderWardrobe, buySkin, equipSkin, renderMap, travelRealm, unlockRealm, currentRealm, get QUEEN() { return QUEEN; }, set QUEEN(v) { QUEEN = v; } };
}
// one delegated handler covers the HUD menu button on every screen (no per-render wiring)
document.addEventListener("click", e => { if (e.target.closest && e.target.closest(".hud-menu")) goHome(); });
// Tap-and-hold a stat cell (payment / target / allergy) to see its label. Desktop shows it on
// hover via CSS; this adds the press-and-hold reveal for touch.
let statTipTimer = null, statTipCell = null;
function killStatTip() { if (statTipTimer) { clearTimeout(statTipTimer); statTipTimer = null; } if (statTipCell) { statTipCell.classList.remove("tip-on"); statTipCell = null; } }
document.addEventListener("pointerdown", e => {
  const cell = e.target.closest && e.target.closest(".bcell[data-tip]");
  if (!cell) return;
  killStatTip();
  statTipTimer = setTimeout(() => { cell.classList.add("tip-on"); statTipCell = cell; }, 300);
});
["pointerup", "pointercancel", "pointerleave"].forEach(ev => document.addEventListener(ev, killStatTip));
// Quietly warm the browser cache for the art you're about to need — every customer's
// four faces, the gameplay pieces, key UI and backdrops — so they appear instantly
// instead of flashing an emoji/blank placeholder the first time. Runs after the first
// screen is up, during idle time, so it never slows the initial paint.
function preloadCommonArt() {
  const keys = [];
  [].concat(D.CUSTOMERS || [], currentRealm().customers || []).forEach(c => {
    if (!c) return;
    keys.push(c.art || ("customer_" + c.id));
    if (!c.art) ["_happy", "_angry", "_allergic"].forEach(m => keys.push("customer_" + c.id + m));
  });
  ["scoop_spoon", "bubble", "bubble_bonus", "logo", "background"].forEach(k => keys.push(k));
  Array.from(new Set(keys)).forEach(k => ART.ensure(k, () => {}));   // warms as WebP
  // hardcoded UI (PNG) + backdrops (JPG) aren't loaded through ART — warm the common ones directly
  ["banner_new", "banner_vip", "name_plate", "name_plaque", "kit_13", "kit_16", "kit_17", "btn_scoop",
   "banner_granted", "banner_partial", "banner_failed", "res_streak", "res_clean", "res_results", "res_panel", "btn_next"].forEach(k => { try { new Image().src = "art/ui/" + k + ".png?v=" + BUILD; } catch (e) {} });
  const rbg = REALM_BG[GAME.realm];
  ["village_far", "village_mid", "village_door"].concat(rbg ? [rbg.replace(/^art\//, "").replace(/\.jpg$/, "")] : []).forEach(bg => { try { new Image().src = "art/" + bg + ".jpg?v=" + BUILD; } catch (e) {} });
}
window.addEventListener("load", () => {
  applyCustomBackground(); refreshQuests();
  if (!GAME.seenIntro) playArrivalIntro(); else renderStart();
  (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(preloadCommonArt);
});

})();
