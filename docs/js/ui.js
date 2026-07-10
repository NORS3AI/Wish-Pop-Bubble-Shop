/* ==========================================================================
 * Wish Pop: Bubble Shop — UI / SCREEN FLOW (v3 Cauldron-First)
 * Start -> Customer -> Scoop -> Pop (draft a hand) -> Cauldron -> Result
 * ======================================================================== */
(function () {
"use strict";

const { R, newRound, applyTripleMatch, scoreMix, scoreResult, BALANCE } = ENGINE;
const D = DATA;
const BUILD = "v122"; // bump on each deploy; shown on the start screen to verify the live version

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
  if (typeof g.realm !== "string" || !D.REALM_BY_ID[g.realm]) g.realm = "willow"; // current location
  if (!g.unlockedRealms || typeof g.unlockedRealms !== "object") g.unlockedRealms = {};
  g.unlockedRealms.willow = true; // the starter realm is always unlocked
  if (!g.realmEvents || typeof g.realmEvents !== "object") g.realmEvents = {}; // realmId -> events cleared (story progress)
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
// Call when an event is played through in the current realm (win OR lose — attempting counts).
// Capped at the realm's eventsNeeded so it can't overcount.
function markRealmEventCleared() {
  const id = GAME.realm, need = realmEventsNeeded(id); if (!need) return;
  GAME.realmEvents[id] = Math.min(need, ((GAME.realmEvents && GAME.realmEvents[id]) || 0) + 1);
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
function custArt(c, cls)  { return ART.tag("customer_" + c.id, c.emoji, cls || "cust-art"); }
// Per-customer size tweaks in the arch frame (1 = default). Some art fills its
// canvas more than others, so a few get scaled down to sit comfortably.
const CHAR_SCALE = { owl: 0.82 };
// A customer's face with an EXPRESSION. "normal" is the base customer_<id>.png;
// happy / angry / allergic are customer_<id>_<mood>.png. If that art isn't there,
// it falls back to the given emoji (the emotion face we've always shown).
function custMoodArt(c, mood, fallbackEmoji, cls) {
  const key = mood && mood !== "normal" ? "customer_" + c.id + "_" + mood : "customer_" + c.id;
  return ART.tag(key, fallbackEmoji || c.emoji, cls || "cust-art");
}
// The main-screen brand mark. If art/logo.png is present, show it; otherwise show
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
const REALM_BG = { willow: "art/willow_bg.jpg" };
function applyRealmBackground() {
  const sc = document.getElementById("screen-customer"); if (!sc) return;
  const url = REALM_BG[GAME.realm];
  if (!url) { sc.style.backgroundImage = ""; sc.classList.remove("has-realm-bg"); return; }
  const im = new Image();
  im.onload = () => { const s = document.getElementById("screen-customer"); if (s) { s.style.backgroundImage = "url('" + url + "')"; s.classList.add("has-realm-bg"); } };
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
function show(id) { document.querySelectorAll(".screen").forEach(s => s.classList.remove("active")); screen(id).classList.add("active"); }
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
  if (typeof RUMPEL !== "undefined") RUMPEL = null;
  if (typeof GOBLIN !== "undefined") GOBLIN = null;
  if (typeof WOLF !== "undefined") WOLF = null;
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
    <div class="home-logo">
      <div class="logo-stage">
        <div class="logo-sparkles" aria-hidden="true">${logoSparkles()}</div>
        <div class="logo-float">${logoMarkup()}</div>
      </div>
      <div class="realm-here">${realm.icon} ${realm.name}</div>
    </div>
    <div class="grow"></div>
    <button class="home-play" id="play-btn">
      <img class="home-play-bg" src="art/ui/btn_play.png" alt="Play" draggable="false">
    </button>
    <div class="home-nav">
      ${navBtn("nav-shop", "🛍️", "Shop")}
      ${navBtn("nav-map", "🗺️", "Realms")}
      ${navBtn("nav-vault", "🧰", "Collection")}
    </div>
    <div class="home-build">Build ${BUILD}</div>
  `);
  on("#play-btn", "click", startRound);
  on("#home-daily", "click", renderQuests);
  on("#nav-shop", "click", renderMenu);
  on("#nav-map", "click", renderMap);
  on("#nav-vault", "click", renderVault);
  on("#home-gear", "click", renderAdmin);
  applyHomeBackground();
  show("start");
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
      const canGold = GAME.gold >= r.unlock.gold, canKeys = (GAME.keys || 0) >= r.unlock.keys, can = canGold && canKeys;
      statusRow = `<div class="realm-cost"><span style="color:${canGold ? "var(--good)" : "var(--bad)"}">🪙 ${r.unlock.gold}</span>
        <span style="color:${canKeys ? "var(--good)" : "var(--bad)"}">🗝️ ${r.unlock.keys}</span></div>
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
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm, forceBoss: true });
  ROUND.rush = false;
  renderCustomer();
}
function adminRush() {
  SFX.unlock(); stopRoundTimers(); refreshQuests();
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm });
  ROUND.wish.boss = false;
  ROUND.rush = true; ROUND.rushMs = BALANCE.RUSH_MS; ROUND.rushStart = null;
  renderCustomer();
}
function renderAdmin() {
  html("admin", `
    ${hud("Admin & Testing")}
    <div class="grow" style="overflow-y:auto">
      <div class="card" style="margin-bottom:10px">
        <div style="font-weight:800;margin-bottom:6px">🎬 Jump to an event</div>
        <p class="muted" style="font-size:12px;margin-bottom:10px">Launch a special encounter right now — no need to play through normal rounds to find one.</p>
        <button class="btn" id="ad-duel" style="margin-bottom:8px">⚔️ Mixing Duel</button>
        <button class="btn" id="ad-fairy" style="margin-bottom:8px">🧚 Fairy's Matching Boon</button>
        <button class="btn" id="ad-rumpel" style="margin-bottom:8px">🧵 Rumpelstiltskin</button>
        <button class="btn" id="ad-goblin" style="margin-bottom:8px">🧌 Gribble the Goblin</button>
        <button class="btn" id="ad-wolf" style="margin-bottom:8px">🐺 Feed the Wolf (Willow finale)</button>
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
          <button class="btn good small" id="ad-dust">+100 ✨</button>
          <button class="btn good small" id="ad-treats">+10 🐸</button>
          <button class="btn good small" id="ad-keys">+10 🗝️</button>
        </div>
      </div>
      <p class="muted" style="font-size:11px;text-align:center">For testing only — we can hide this panel before the game goes public.</p>
    </div>
    <button class="btn secondary" id="ad-back">←  Back</button>
  `);
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
  on("#ad-queen", "click", () => {
    if (GAME.gold < QUEEN_PACKAGES[0].gold) { GAME.gold += 200; save(); } // need gold to pay her ransom
    renderQueenIntro();
  });
  on("#ad-dance", "click", () => renderDanceIntro("knight"));
  on("#ad-dance2", "click", () => renderDanceIntro("prince"));
  on("#ad-dance3", "click", () => renderDanceIntro("cinderella"));
  on("#ad-cake", "click", renderCakeIntro);
  on("#ad-boss", "click", adminBoss);
  on("#ad-rush", "click", adminRush);
  on("#ad-gold", "click", () => { GAME.gold += 1000; save(); toast("+1000 gold 🪙"); renderAdmin(); });
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
        <button class="btn" id="well-btn" style="flex:1">🌟 Wishing Well</button>
        <button class="btn secondary" id="wardrobe-btn" style="flex:1">🎨 My Skins</button>
      </div>
      <div class="row" style="margin-bottom:10px;gap:10px">
        <button class="btn secondary" id="recycle-btn" style="flex:1">🗑️ Recycle <span class="muted" style="font-weight:500;font-size:12px">· ${GAME.trash.length}/${BALANCE.TRASH_BIN_MAX}</span></button>
        <button class="btn ${GAME.keys > 0 ? "good" : "secondary"}" id="vault-btn" style="flex:1">🗝️ Vault <span class="muted" style="font-weight:500;font-size:12px">· ${GAME.keys}</span></button>
      </div>
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
// the Well only awards buyable skins — achievement-only skins are earned, never rolled
function unownedSkins() { return allSkins().filter(c => !GAME.owned[c.id] && !c.achievement && !c.villain && !c.ball); }
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
  if (p.kind === "stardust") { GAME.stardust += p.amt; save(); return { emoji: "✨", label: `+${p.amt} Stardust`, sub: p.wasSkin ? "You own every skin — extra Stardust!" : "Save it to buy any skin you like." }; }
  // skin
  GAME.owned[p.cosmetic.id] = true; save();
  return { emoji: p.cosmetic.chip, label: `New skin: ${p.cosmetic.name}!`, sub: "Equip it in 🎨 My Skins.", jackpot: true };
}
function renderWell() {
  const cost = BALANCE.WELL_COST, canAfford = GAME.gold >= cost;
  const totalSkins = allSkins().length, ownedSkins = allSkins().filter(c => GAME.owned[c.id]).length;
  html("well", `
    ${hud("Wishing Well")}
    <div class="grow center" style="gap:14px;overflow-y:auto">
      <div class="well-visual" id="well-visual"><div class="well-emoji">${ART.tag("well_star", "🌟")}</div><div class="well-ripple"></div></div>
      <div class="rb-total">✨ <b id="well-dust">${GAME.stardust}</b> Stardust · 🎁 <b>${ownedSkins}/${totalSkins}</b> skins</div>
      <div id="well-stage" class="well-stage muted">Toss a coin in and pop a bubble to see what floats up!</div>
      <div class="card" style="width:100%;max-width:320px">
        <div style="font-weight:800;text-align:center;margin-bottom:6px">What might rise up?</div>
        <div class="stat-line"><span>🪙 A little gold back</span><span class="muted">common</span></div>
        <div class="stat-line"><span>🐸 A handful of treats</span><span class="muted">common</span></div>
        <div class="stat-line"><span>✨ Stardust (buys any skin)</span><span class="muted">uncommon</span></div>
        <div class="stat-line"><span>🎁 A brand-new skin!</span><span style="color:var(--gold);font-weight:800">rare</span></div>
      </div>
      <p class="muted" style="font-size:12px;max-width:280px">You always get something — the fun is <i>how big</i>. Duplicate skins turn into Stardust.</p>
    </div>
    <div class="row">
      <button class="btn good" id="well-toss" ${canAfford ? "" : "disabled"}>Toss 🪙${cost}</button>
      <button class="btn secondary" id="well-back">←  Back</button>
    </div>
  `);
  on("#well-toss", "click", wellToss);
  on("#well-back", "click", renderMenu);
  show("well");
}
let wellBusy = false;
function wellToss() {
  if (wellBusy) return;
  const cost = BALANCE.WELL_COST;
  if (GAME.gold < cost) { toast("Not enough gold."); return; }
  SFX.unlock();
  wellBusy = true;
  GAME.gold -= cost; save(); syncHud("well");
  const prize = rollWellPrize();
  const stage = $("#well-stage"); if (!stage) { wellBusy = false; return; }
  // three mystery bubbles rise; pop any one to reveal the (already-rolled) prize
  stage.classList.remove("muted");
  stage.innerHTML = `<div class="well-bubbles" id="well-bubbles">
    ${[0, 1, 2].map(i => `<button class="wbub" data-i="${i}">🫧</button>`).join("")}
  </div><div class="muted" style="font-size:12px;margin-top:6px">Pop one!</div>`;
  const toss = $("#well-toss"); if (toss) toss.disabled = true;
  let revealed = false;
  stage.querySelectorAll(".wbub").forEach(b => b.addEventListener("click", () => {
    if (revealed) return; revealed = true;
    SFX.pop(2);
    const others = [...stage.querySelectorAll(".wbub")];
    others.forEach(o => { if (o !== b) { o.classList.add("fizz"); } });
    b.classList.add("chosen");
    setTimeout(() => wellReveal(prize), 260);
  }));
}
function wellReveal(prize) {
  const info = grantWellPrize(prize);
  const stage = $("#well-stage"); if (!stage) { wellBusy = false; return; }
  stage.innerHTML = `<div class="well-prize ${info.jackpot ? "jackpot" : ""}">
    <div class="wp-emoji">${info.emoji}</div>
    <div class="wp-label">${info.label}</div>
    <div class="muted" style="font-size:12px">${info.sub}</div>
  </div>`;
  syncHud("well");
  const dust = $("#well-dust"); if (dust) dust.textContent = GAME.stardust;
  if (info.jackpot) { SFX.perfect(); wellConfetti(); }
  else if (prize.kind === "stardust") SFX.charm();
  else SFX.coin(0);
  // re-enable tossing (unless you can no longer afford it)
  const toss = $("#well-toss"); if (toss) toss.disabled = GAME.gold < BALANCE.WELL_COST;
  wellBusy = false;
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
      const owned = !!GAME.owned[c.id], equipped = GAME.equipped[kind] === c.id, ach = c.achievement, vil = c.villain, ball = c.ball;
      const special = ach || vil || ball; // earned, never bought
      const canBuy = !owned && !special && GAME.stardust >= dustCost;
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
                : `<button class="btn small ${canBuy ? "" : "secondary"} skin-buy" data-id="${c.id}" ${canBuy ? "" : "disabled"}>✨${dustCost}</button>`;
      // achievement/villain skins reveal their look + how to earn; other unowned stay a mystery
      const chip = owned
        ? (kind === "familiar" ? buddyArt(c.id, "skin-art") : ART.tag("cauldron_" + c.id, c.chip, "skin-art"))
        : special ? c.chip : "❔";
      const nameShown = owned || special ? c.name : "???";
      const hint = ach && !owned ? ach.desc : vil && !owned ? "Win a villain event" : ball && !owned ? "Dazzle Cinderella at the Royal Ball" : "";
      return `<div class="skin-tile ${equipped ? "on" : ""} ${owned ? "" : "locked"} ${special && !owned ? "ach" : ""}">
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
    <div class="rb-total" style="text-align:center;margin:2px 0 8px">✨ <b>${GAME.stardust}</b> Stardust <span class="muted" style="font-size:12px">· spend it to buy any skin</span></div>
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
function maybeEvent() {
  if (GAME.nextEventAt < 0) { GAME.nextEventAt = servedTotal + BALANCE.EVENT_EVERY; save(); return false; }
  if (servedTotal < GAME.nextEventAt) return false;
  GAME.nextEventAt = servedTotal + BALANCE.EVENT_EVERY; save();
  const events = [renderDuelIntro, renderFairyIntro, renderCakeIntro];
  if (GAME.gold >= QUEEN_PACKAGES[0].gold) events.push(renderQueenIntro); // Queen needs gold for her ransom
  if (currentRealm().id === "courtyard") events.push(() => renderDanceIntro(pickDancePartner())); // a royal-ball dance lesson
  if (currentRealm().id === "willow") events.push(renderWolfIntro); // Little Red's wolf: stall it for the huntsman
  markRealmEventCleared();   // playing an event advances this realm's story (win or lose)
  R.pick(events)();
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
function rumpelBand(r)   { return Math.max(0.09, 0.42 - 0.05 * r); } // golden band width (shrinks each round)
function rumpelSpeed(r)  { return 0.60 + 0.14 * r; }                 // sweeps/sec (faster each round)
function rumpelReward(r) { return 30 + 15 * r; }                     // gold for landing round r
function maybeJunkRound() {
  const full = GAME.trash.length >= BALANCE.TRASH_BIN_MAX;
  if (!full) { if (GAME.rumpelSeen) { GAME.rumpelSeen = false; save(); } return false; }
  if (GAME.rumpelSeen) return false;     // already offered while the bin is full — don't nag
  GAME.rumpelSeen = true;
  const goblin = !!GAME.goblinTurn; GAME.goblinTurn = !GAME.goblinTurn; save(); // swap back and forth
  if (goblin) renderGoblinIntro(); else renderRumpelIntro();
  return true;
}
function renderRumpelIntro() {
  SFX.unlock(); SFX.fanfare();
  const line = R.pick(RUMPEL_LINES);
  html("event", `
    ${hud("A Strange Little Man")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🧵</div>
      <div style="font-weight:800;font-size:20px">Rumpelstiltskin</div>
      <div class="speech">“${line}”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Your straw (junk)</span><span>${GAME.trash.length} bits</span></div>
        <div class="stat-line"><span>Spin 🪙${RUMPEL_TARGET}+ to win</span><span class="gold">he pays out · bin emptied</span></div>
        <div class="stat-line"><span>Fall short</span><span style="color:var(--bad)">🪙 ${RUMPEL_FEE} fee</span></div>
      </div>
      <div class="muted" style="max-width:300px">Each round the golden band gets <b>smaller</b> and the wheel spins <b>faster</b>. Land it to bank gold and keep going — miss and the wheel stops for good!</div>
    </div>
    <button class="btn good" id="rumpel-play">🎡 Spin!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="rumpel-skip">Not now</button>
  `);
  on("#rumpel-play", "click", () => { RUMPEL = { round: 0, tally: 0 }; renderRumpelRound(); });
  on("#rumpel-skip", "click", startRound);
  show("event");
}
function renderRumpelRound() {
  const r = RUMPEL.round, width = rumpelBand(r), half = width / 2;
  const center = half + Math.random() * (1 - width);  // keep the whole band on the wheel
  Object.assign(RUMPEL, { center, half, pos: 0, dir: 1, raf: null, done: false, last: null });
  const reached = RUMPEL.tally >= RUMPEL_TARGET;
  html("event", `
    ${hud("Spin the Wheel!")}
    <div class="grow center" style="gap:14px">
      <div class="rumpel-stat">Round ${r + 1} · land it for <b class="gold">🪙${rumpelReward(r)}</b></div>
      <div class="rumpel-stat sub">Spun so far: <b class="gold">🪙${RUMPEL.tally}</b> / need 🪙${RUMPEL_TARGET}${reached ? " ✓" : ""}</div>
      <div class="ph big" style="font-size:52px">🎡</div>
      <div class="rumpel-track">
        <span class="rumpel-band" style="left:${(center - half) * 100}%;width:${width * 100}%"></span>
        <span class="rumpel-needle" id="rumpel-needle"></span>
      </div>
      <div class="muted" style="min-height:20px">Tap <b>Stop!</b> on the gold ✨</div>
    </div>
    <button class="btn good" id="rumpel-stop">🛑 Stop!</button>
  `);
  on("#rumpel-stop", "click", rumpelStop);
  show("event");
  const needle = $("#rumpel-needle"), speed = rumpelSpeed(r);
  const step = ts => {
    if (!RUMPEL || RUMPEL.done) return;
    if (!document.getElementById("rumpel-needle")) { RUMPEL = null; return; } // left the screen
    if (RUMPEL.last == null) RUMPEL.last = ts;
    const dt = (ts - RUMPEL.last) / 1000; RUMPEL.last = ts;
    RUMPEL.pos += RUMPEL.dir * speed * dt;
    if (RUMPEL.pos >= 1) { RUMPEL.pos = 1; RUMPEL.dir = -1; }
    else if (RUMPEL.pos <= 0) { RUMPEL.pos = 0; RUMPEL.dir = 1; }
    if (needle) needle.style.left = (RUMPEL.pos * 100) + "%";
    RUMPEL.raf = requestAnimationFrame(step);
  };
  RUMPEL.raf = requestAnimationFrame(step);
}
function rumpelStop() {
  if (!RUMPEL || RUMPEL.done) return;
  RUMPEL.done = true;
  if (RUMPEL.raf) cancelAnimationFrame(RUMPEL.raf);
  const hit = Math.abs(RUMPEL.pos - RUMPEL.center) <= RUMPEL.half;
  if (hit) {
    RUMPEL.tally += rumpelReward(RUMPEL.round);
    RUMPEL.round += 1;
    SFX.coin();
    renderRumpelBetween();
  } else {
    SFX.sneeze();
    renderRumpelTally(false);   // the wheel stops for good
  }
}
function renderRumpelBetween() {
  const justWon = rumpelReward(RUMPEL.round - 1);
  const reached = RUMPEL.tally >= RUMPEL_TARGET;
  html("event", `
    ${hud("Nice Spin!")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🪙</div>
      <div class="result-title win">Landed it! +🪙${justWon}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Gold spun so far</span><span class="gold">🪙 ${RUMPEL.tally}</span></div>
        <div class="stat-line"><span>To win the deal</span><span>${reached ? "✓ reached!" : "🪙 " + RUMPEL_TARGET}</span></div>
        <div class="stat-line"><span>Next round</span><span>smaller band · faster · 🪙${rumpelReward(RUMPEL.round)}</span></div>
      </div>
      <p class="muted" style="max-width:300px">${reached ? "You've spun enough to win — bank it, or press your luck for more!" : "Keep spinning to reach the deal… but each round is harder."}</p>
    </div>
    <button class="btn good" id="rumpel-again">🎡 Spin again</button>
    <div style="height:8px"></div>
    <button class="btn ${reached ? "" : "secondary"}" id="rumpel-bank">✋ Stop &amp; tally</button>
  `);
  on("#rumpel-again", "click", renderRumpelRound);
  on("#rumpel-bank", "click", () => renderRumpelTally(true));
  show("event");
}
function renderRumpelTally(banked) {
  const strawCount = GAME.trash.length;
  const win = RUMPEL.tally >= RUMPEL_TARGET;
  let outcome;
  if (win) {
    GAME.gold += RUMPEL.tally;
    GAME.trash = GAME.trash.filter(isBag);   // spin the junk into gold, but keep unopened bags
    save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    outcome = { emoji: "🥇", title: "The straw is gold!", cls: "win",
      lines: [`<div class="stat-line"><span>Straw spun away</span><span>${strawCount} bits</span></div>`,
              `<div class="stat-line"><span>Gold he pays you</span><span class="gold">🪙 +${RUMPEL.tally}</span></div>`],
      note: banked ? "You banked it at just the right moment! ✨" : "You rode the wheel all the way to a fortune! ✨" };
  } else {
    const fee = Math.min(RUMPEL_FEE, GAME.gold);
    GAME.gold -= fee; save();
    SFX.sneeze();
    outcome = { emoji: "🪤", title: "Not enough gold spun!", cls: "lose",
      lines: [`<div class="stat-line"><span>Gold spun</span><span>🪙 ${RUMPEL.tally} / ${RUMPEL_TARGET}</span></div>`,
              `<div class="stat-line"><span>His fee for the straw</span><span style="color:var(--bad)">🪙 -${fee}</span></div>`],
      note: "“Hee hee! Not enough, not enough!” Your straw stays in the bin." };
  }
  RUMPEL = null;
  html("event", `
    ${hud("Rumpelstiltskin")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="rumpel-next">Next Customer  →</button>
  `);
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
const WOLF_WIN_MS = 32000;        // the huntsman arrives after this long — survive until then
const WOLF_DRAIN = 7;             // patience lost per second
const WOLF_COOLDOWN_MS = 2500;    // min time between feeds, so each choice is deliberate
const WOLF_REPEAT_PENALTY_MS = 2000; // feeding the SAME treat twice in a row = a longer wait
const WOLF_START = 60;            // starting patience
const WOLF_GREEN = [38, 80];      // the comfy "green" sweet spot (score for time spent here)
const WOLF_TICK = 100;            // ms per simulation tick
// 6 treats, ordered most-potent → weakest (left → right, like normal-round ingredients).
const WOLF_ITEMS = {
  roast:  { name: "Roast",   emoji: "🍖", kind: "instant",  amt: 32 },
  grapes: { name: "Grapes",  emoji: "🍇", kind: "overtime", perSec: 5, dur: 5 },
  tart:   { name: "Tart",    emoji: "🥧", kind: "instant",  amt: 20 },
  bread:  { name: "Bread",   emoji: "🍞", kind: "instant",  amt: 16 },
  tonic:  { name: "Cake",    emoji: "🧁", kind: "tonic",    amt: 10, slow: 6 }, // +10 now, drain −50% for 6s
  berry:  { name: "Berries", emoji: "🫐", kind: "instant",  amt: 8 },
};
const WOLF_ITEM_IDS = Object.keys(WOLF_ITEMS);
function wolfFxLabel(it) { return it.kind === "overtime" ? `+${it.perSec}/s` : it.kind === "tonic" ? `😴` : `+${it.amt}`; }
function wolfBasket() {
  // a randomized, DELIBERATELY-TIGHT picnic — you'll start running low late, forcing repeats
  // (and the same-treat-twice penalty) as the huntsman closes in.
  const b = { roast: 2, grapes: 2, tart: 2, bread: 3, tonic: 1, berry: 3 };
  for (let i = 0; i < 2; i++) b[R.pick(WOLF_ITEM_IDS)]++;
  return b;
}
function renderWolfIntro() {
  SFX.unlock(); SFX.fanfare();
  html("event", `
    ${hud("Grandma's Cottage")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🐺</div>
      <div style="font-weight:800;font-size:20px">It's the Wolf!</div>
      <div class="speech">“My, what a delicious-looking basket you've brought, dearie…”</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Keep him calm</span><span>until the huntsman comes 🏹</span></div>
        <div class="stat-line"><span>Feed picnic treats</span><span class="gold">to top up Patience</span></div>
        <div class="stat-line"><span>Patience hits empty</span><span style="color:var(--bad)">he pounces! 🐺</span></div>
        <div class="stat-line"><span>Huntsman's allergic 🤧</span><span style="color:var(--bad)">use up the 🤧 treats!</span></div>
      </div>
      <div class="muted" style="max-width:300px">Tap treats to feed him — only every couple seconds, so <b>choose wisely</b>. Big treats fill fast, 🍇 feeds <b>over time</b>, the cake 🧁 makes him <b>drowsy</b>. Don't feed the <b>same treat twice in a row</b> (longer wait!) — and <b>use up the huntsman's allergens</b> before he arrives, or he can't come in.</div>
    </div>
    <button class="btn good" id="wolf-play">🧺 Distract the wolf!</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="wolf-skip">Not now</button>
  `);
  on("#wolf-play", "click", wolfStart);
  on("#wolf-skip", "click", startRound);
  show("event");
}
// Pick 1–2 treats the huntsman is allergic to — you must use them ALL up before he arrives.
// Kept to a clearable total so it's a real task, not an impossible one.
function wolfPickAllergens(basket) {
  const present = WOLF_ITEM_IDS.filter(id => (basket[id] || 0) > 0);
  for (let i = present.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = present[i]; present[i] = present[j]; present[j] = t; }
  const picks = [present[0]];
  if (present[1] && (basket[present[0]] + basket[present[1]]) <= 5) picks.push(present[1]);
  return picks;
}
function wolfAllergenLeft() { return WOLF ? WOLF.allergens.reduce((s, id) => s + (WOLF.basket[id] || 0), 0) : 0; }
function wolfStart() {
  const basket = wolfBasket();
  WOLF = { patience: WOLF_START, basket, allergens: wolfPickAllergens(basket), lastFed: null,
    effects: [], slowUntil: 0, cooldownUntil: 0, cooldownDur: WOLF_COOLDOWN_MS, elapsed: 0, inGreen: 0, over: false, tickTimer: null };
  wolfPlay();
  WOLF.tickTimer = setInterval(wolfTick, WOLF_TICK);
}
function wolfTick() {
  if (!WOLF || WOLF.over) return;
  const dt = WOLF_TICK / 1000, now = Date.now();
  let p = WOLF.patience - WOLF_DRAIN * dt * (now < WOLF.slowUntil ? 0.5 : 1);
  WOLF.effects.forEach(e => { p += e.perSec * dt; e.remaining -= dt; });
  WOLF.effects = WOLF.effects.filter(e => e.remaining > 0);
  p = Math.max(0, Math.min(100, p));
  WOLF.patience = p;
  WOLF.elapsed += WOLF_TICK;
  if (p >= WOLF_GREEN[0] && p <= WOLF_GREEN[1]) WOLF.inGreen += WOLF_TICK;
  wolfPaint();
  if (p <= 0) return wolfFinish(false);
  // huntsman arrives — but he can't help if his allergens aren't all used up
  if (WOLF.elapsed >= WOLF_WIN_MS) return wolfFinish(wolfAllergenLeft() > 0 ? "allergen" : true);
}
function wolfObjHtml() {
  if (!WOLF || !WOLF.allergens.length) return "";
  const parts = WOLF.allergens.map(id => {
    const left = WOLF.basket[id] || 0, it = WOLF_ITEMS[id];
    return `<span class="wolf-obj-item ${left <= 0 ? "done" : ""}">${it.emoji} ${left <= 0 ? "✓" : "×" + left}</span>`;
  }).join("");
  return `<span class="wolf-obj-lbl">🤧 Use up before rescue:</span>${parts}`;
}
function wolfPlay() {
  const tiles = WOLF_ITEM_IDS.map(id => {
    const it = WOLF_ITEMS[id], n = WOLF.basket[id] || 0, allergen = WOLF.allergens.includes(id);
    return `<button class="wolf-tile ${n <= 0 ? "empty" : ""} ${allergen ? "allergen" : ""}" data-id="${id}" ${n <= 0 ? "disabled" : ""}>
      ${allergen ? `<span class="wolf-allergen">🤧</span>` : ""}
      <span class="wolf-emoji">${it.emoji}</span><span class="wolf-tname">${it.name}</span>
      <span class="wolf-tfx">${wolfFxLabel(it)}</span><span class="wolf-count" id="wolf-n-${id}">×${n}</span></button>`;
  }).join("");
  html("event", `
    ${hud("Feed the Wolf!")}
    <div class="wolf-top">
      <div class="wolf-face" id="wolf-face">🐺</div>
      <div class="wolf-huntsman"><span class="wolf-hlbl">🏹 Huntsman on the way…</span><div class="wolf-hbar"><i id="wolf-hbar"></i></div></div>
    </div>
    <div class="wolf-obj" id="wolf-obj">${wolfObjHtml()}</div>
    <div class="wolf-patience">
      <div class="wolf-plabel">😤 Patience</div>
      <div class="wolf-ptrack"><span class="wolf-green" style="left:${WOLF_GREEN[0]}%;width:${WOLF_GREEN[1] - WOLF_GREEN[0]}%"></span><i class="wolf-pfill" id="wolf-pfill"></i></div>
    </div>
    <div class="wolf-effects" id="wolf-effects"></div>
    <div class="grow" style="overflow-y:auto"><div class="wolf-grid" id="wolf-grid">${tiles}</div></div>
    <div class="wolf-cd" id="wolf-cd"><i id="wolf-cdbar"></i><span id="wolf-cdtxt">Ready — feed him!</span></div>
  `);
  $("#screen-event").querySelectorAll(".wolf-tile").forEach(b => b.addEventListener("click", () => wolfFeed(b.dataset.id)));
  show("event");
  wolfPaint();
}
function wolfPaint() {
  if (!WOLF) return;
  const p = WOLF.patience, now = Date.now();
  const fill = $("#wolf-pfill");
  if (fill) { fill.style.width = p + "%"; fill.className = "wolf-pfill " + (p < 22 ? "danger" : (p >= WOLF_GREEN[0] && p <= WOLF_GREEN[1]) ? "green" : "amber"); }
  const hb = $("#wolf-hbar"); if (hb) hb.style.width = Math.min(100, WOLF.elapsed / WOLF_WIN_MS * 100) + "%";
  const face = $("#wolf-face"); if (face) face.classList.toggle("angry", p < 22);
  const fx = $("#wolf-effects");
  if (fx) fx.innerHTML = WOLF.effects.map(e => `<span class="wolf-chip">⏳ +${e.perSec}/s · ${Math.ceil(e.remaining)}s</span>`).join("") + (now < WOLF.slowUntil ? `<span class="wolf-chip slow">😴 drowsy ${Math.ceil((WOLF.slowUntil - now) / 1000)}s</span>` : "");
  const ob = $("#wolf-obj");
  if (ob) { ob.innerHTML = wolfObjHtml();
    const left = wolfAllergenLeft(), late = WOLF.elapsed / WOLF_WIN_MS > 0.65;
    ob.classList.toggle("clear", left <= 0);
    ob.classList.toggle("urgent", left > 0 && late); }
  const cd = WOLF.cooldownUntil - now, dur = WOLF.cooldownDur || WOLF_COOLDOWN_MS, cdbar = $("#wolf-cdbar"), cdtxt = $("#wolf-cdtxt"), grid = $("#wolf-grid");
  if (cd > 0) { if (cdbar) cdbar.style.width = (cd / dur * 100) + "%"; if (cdtxt) cdtxt.textContent = WOLF.cooldownDur > WOLF_COOLDOWN_MS ? "Same treat — longer wait…" : "Wait…"; if (grid) grid.classList.add("cooling"); }
  else { if (cdbar) cdbar.style.width = "0%"; if (cdtxt) cdtxt.textContent = "Ready — feed him!"; if (grid) grid.classList.remove("cooling"); }
}
function wolfFeed(id) {
  if (!WOLF || WOLF.over) return;
  const now = Date.now();
  if (now < WOLF.cooldownUntil) return;         // still cooling down — deliberate play
  const n = WOLF.basket[id] || 0; if (n <= 0) return;
  const it = WOLF_ITEMS[id];
  WOLF.basket[id] = n - 1;
  if (it.kind === "overtime") { WOLF.effects.push({ perSec: it.perSec, remaining: it.dur }); SFX.charm(); }
  else { WOLF.patience = Math.min(100, WOLF.patience + it.amt); if (it.kind === "tonic") { WOLF.slowUntil = now + it.slow * 1000; SFX.charm(); } else SFX.coin(); }
  // same treat twice in a row → the wolf gets wary → a longer wait before you can feed again
  const repeat = id === WOLF.lastFed;
  WOLF.cooldownDur = WOLF_COOLDOWN_MS + (repeat ? WOLF_REPEAT_PENALTY_MS : 0);
  WOLF.cooldownUntil = now + WOLF.cooldownDur;
  WOLF.lastFed = id;
  if (repeat) { SFX.sneeze(); toast("😬 The same treat again? He eyes you — longer wait!"); }
  const cnt = $("#wolf-n-" + id); if (cnt) cnt.textContent = "×" + WOLF.basket[id];
  const tile = $("#screen-event") && $("#screen-event").querySelector(`.wolf-tile[data-id="${id}"]`);
  if (tile) { if (WOLF.basket[id] <= 0) { tile.classList.add("empty"); tile.disabled = true; } tile.classList.remove("pop"); void tile.offsetWidth; tile.classList.add("pop"); }
  wolfPaint();
}
function wolfFinish(result) {
  if (!WOLF) return;
  const win = result === true, allergenFail = result === "allergen";
  WOLF.over = true;
  if (WOLF.tickTimer) { clearInterval(WOLF.tickTimer); WOLF.tickTimer = null; }
  const secs = Math.round(WOLF.elapsed / 1000), greenPct = Math.round(WOLF.inGreen / Math.max(1, WOLF.elapsed) * 100);
  let outcome;
  if (win) {
    const gold = 60, dust = 8;
    grantReward({ gold, stardust: dust }); save();
    SFX.perfect(); SFX.bigCoin(); confettiOver($("#app"));
    outcome = { emoji: "🏹", title: "The huntsman arrives!", cls: "win",
      lines: [`<div class="stat-line"><span>You stalled him</span><span>${secs}s</span></div>`,
              `<div class="stat-line"><span>Time kept comfy (green)</span><span>${greenPct}%</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="gold">🪙 +${gold} · ✨ +${dust}</span></div>`],
      note: "You kept the wolf busy long enough — the huntsman bursts in and rescues Grandma! 🎉" };
  } else if (allergenFail) {
    save(); SFX.sneeze();
    const leftT = WOLF.allergens.filter(id => (WOLF.basket[id] || 0) > 0).map(id => WOLF_ITEMS[id].emoji).join(" ");
    outcome = { emoji: "🤧", title: "Huntsman can't come in!", cls: "lose",
      lines: [`<div class="stat-line"><span>You stalled him</span><span>${secs}s</span></div>`,
              `<div class="stat-line"><span>Allergens left out</span><span style="color:var(--bad)">${leftT}</span></div>`],
      note: "You held the wolf off — but you left the huntsman's allergens on the table! He sneezes at the door and the wolf slips away. Next time, use up the 🤧 treats before he arrives." };
  } else {
    save(); SFX.sneeze();
    outcome = { emoji: "🐺", title: "The wolf pounced!", cls: "lose",
      lines: [`<div class="stat-line"><span>You lasted</span><span>${secs}s</span></div>`,
              `<div class="stat-line"><span>Reward</span><span class="muted">none — try again!</span></div>`],
      note: "His patience ran out before the huntsman came. Keep the Patience bar out of the red — feed a bigger treat before it dips too low!" };
  }
  WOLF = null;
  html("event", `
    ${hud("Grandma's Cottage")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${outcome.emoji}</div>
      <div class="result-title ${outcome.cls}">${outcome.title}</div>
      <div class="card" style="width:100%;max-width:320px">${outcome.lines.join("")}</div>
      <p class="muted" style="max-width:300px">${outcome.note}</p>
    </div>
    <button class="btn" id="wolf-next">Continue  →</button>
  `);
  on("#wolf-next", "click", startRound);
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
      <div class="dance-hero">${p.poses ? `<img src="art/${p.poses}_1.png?v=${BUILD}" alt="${p.name}" draggable="false">` : `<div class="ph big">${p.emoji}</div>`}</div>
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
  if (worried && p.worried) return `art/${p.worried}_${Math.min(4, Math.max(1, poseNum - 1))}.png?v=${BUILD}`;
  return `art/${p.poses}_${poseNum}.png?v=${BUILD}`;
}
// Warm the browser cache with every pose so the swap on a button press is instant
// (the pose PNGs are big; without this the first show of each pose fetches/decodes
// mid-dance and the swap feels laggy).
function dancePreload(p) {
  if (!p || !p.poses) return;
  const warm = src => { const im = new Image(); im.src = src; };
  for (let i = 1; i <= 5; i++) warm(`art/${p.poses}_${i}.png?v=${BUILD}`);
  if (p.worried) for (let i = 1; i <= 4; i++) warm(`art/${p.worried}_${i}.png?v=${BUILD}`);
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
    <div class="dance-stage">
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
    <div class="cake-stage2${study ? " studying" : ""}">
      <div class="cake-caption">${study
        ? `<b>Memorise</b> tier ${t} — where each treat sits…`
        : `Tap the treats in order — they fill left to right (${placedCount}/${n})`}</div>
      <div class="cake-arena">
        <div class="cake-view">
          <img class="cake-img ${t <= 1 ? "wide" : "tall"}" src="art/cake_stage_${t}.png?v=${BUILD}" alt="cake" draggable="false">
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
function startRound() {
  SFX.unlock();
  stopRoundTimers();
  document.body.classList.remove("villain"); // clear any villain theming
  applyRealmTheme();
  refreshQuests();
  if (maybeJunkRound()) return;  // full trash bin? a junk visitor (Rumpelstiltskin or the goblin)
  if (maybeEvent()) return;   // a fairytale event takes this turn instead of a customer
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm, customers: currentRealm().customers, ingredientSet: currentRealm().ingredients, magicPool: currentRealm().magics });
  injectInfused(ROUND);   // sprinkle in the new infused ingredients (Dragon Egg / Frost Gem)
  injectKeys(ROUND);      // occasionally a Treasure Key pops from a bubble
  // occasionally an "In a Rush" customer (never a boss) — a patience clock starts
  // when scooping begins.
  ROUND.rush = !ROUND.wish.boss && Math.random() < BALANCE.RUSH_CHANCE;
  if (ROUND.rush) { ROUND.rushMs = BALANCE.RUSH_MS; ROUND.rushStart = null; }
  // a VIP guest (any realm) — you may wager a key on the customer screen for a bigger reward
  ROUND.vip = !ROUND.wish.boss && !ROUND.rush && Math.random() < BALANCE.VIP_CHANCE;
  ROUND.keyStaked = false;
  renderCustomer();
}
// Which arched portrait frame each realm uses (falls back to the gold one)
function realmFrame() { return (currentRealm().custFrame) || "cframe_01"; }
function renderCustomer() {
  const c = ROUND.customer, w = ROUND.wish, realm = currentRealm();
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
  // special-customer text lives INSIDE the wish box (no separate notice line).
  // VIP wager is offered in an overlay now, so the wish box just gets a flavor line.
  const extra = w.boss
    ? `<div class="cust-wish-extra boss">👑 Extra fussy — tiny green zones, only ${BALANCE.BOSS_SLOTS} slots, two allergies!</div>`
    : ROUND.rush
    ? `<div class="cust-wish-extra rush">⏱️ Serve fast for a +${BALANCE.RUSH_BONUS} bonus — don't dawdle!</div>`
    : ROUND.vip
    ? `<div class="cust-wish-extra vip">⭐ A VIP guest — impress them for a fine reward!</div>`
    : "";
  const streakChip = GAME.streak >= 2 ? `<div class="cust-streak">🔥 ${GAME.streak}</div>` : "";
  const bcell = (icon, label, value, cls) => `<div class="bcell">${icon ? `<img class="bic" src="art/ui/${icon}.png" alt="">` : ""}<div class="bval ${cls || ""}">${value}</div><div class="blbl">${label}</div></div>`;
  html("customer", `
    <div class="cust-top">
      <div class="cust-realm">${realm.icon} <span>${realm.name}</span></div>
      <div class="cust-coin"><img src="art/ui/kit_13.png" alt="🪙"><b>${(GAME.gold||0).toLocaleString()}</b></div>
    </div>
    <div class="grow" style="overflow-y:auto; display:flex; flex-direction:column; align-items:center; gap:2px; padding-bottom:4px">
      <div class="cust-banner"><img src="art/ui/${bannerImg}.png" alt="A New Customer Arrives" draggable="false"></div>
      <div class="cust-portrait">
        ${streakChip}
        <div class="cust-char ${w.boss ? "boss-emoji" : ""}" style="--char-scale:${CHAR_SCALE[c.id] || 1}">${custArt(c, "cust-char-art")}</div>
        <img class="cust-frame" src="art/ui/char_arch.png" alt="" draggable="false">
      </div>
      <div class="cust-nameplate"><img src="art/ui/kit_02.png" alt="" draggable="false"><span class="cust-name">${w.boss ? "👑 " : ROUND.vip ? "⭐ " : ""}${c.name}</span></div>
      <div class="cust-wishbox">
        <div class="cust-wish-text">“${c.line}”</div>
        ${extra}
      </div>
      <div class="cust-bottombar">
        ${bcell("kit_13", "Payment", ROUND.payment)}
        ${bcell("kit_16", "Target", w.requiredMatch + "%")}
        ${bcell("kit_17", "Allergy", allergyMark)}
      </div>
    </div>
    <button class="cust-scoop baked" id="scoop-btn"><img src="art/ui/btn_scoop.png" alt="Start Scoop" draggable="false"></button>
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
  `);
  if (w.boss || ROUND.rush || ROUND.vip) { SFX.unlock(); SFX.fanfare(); } // special arrival — hard to miss
  const closeVip = () => { const o = document.getElementById("vip-overlay"); if (o) o.remove(); };
  on("#vip-yes", "click", () => { ROUND.keyStaked = true; SFX.unlock(); SFX.charm(); toast(`🗝️ ${vipCost} keys wagered — make it count!`); closeVip(); });
  on("#vip-no", "click", () => { SFX.unlock(); closeVip(); });
  on("#scoop-btn", "click", renderScoop);
  applyRealmBackground();
  show("customer");
}

/* ======================================================================= */
/* SCOOP — sift each scoop to reveal how many bubbles you'll pop            */
/* ======================================================================= */
function renderScoop() {
  const scoops = ROUND.scoops, split = ROUND.scoopYields;
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
  const GLITTER = 30, BATCH = 4;
  let idx = 0, revealed = 0, state = "idle", shakeDist = 0, lastX = null, dragging = false, autoIv = null;
  let skipMode = false;                          // after "Shake for me", the button becomes "Skip"
  const jackDone = new Array(scoops).fill(false); // which scoops have already handed out their jackpot charm

  html("scoop", `
    ${hud("Scoop Phase")}
    <button class="mute-btn" id="mute-btn" title="Sound on/off">${SFX.isMuted() ? "🔇" : "🔊"}</button>
    <div class="scoop-sub muted" id="scoop-step">Scoop 1 of ${scoops}</div>
    <div class="scoop-instr" id="scoop-text">✋ Swipe side to side to shake off the glitter!</div>
    <div class="scoop-stage" id="scoop-stage">
      <div class="scoop-craft" id="scoop-craft">
        <div class="scoop-bubbles" id="scoop-bubbles"></div>
        <div class="scoop-bowl" id="scoop-bowl" style="font-size:${Math.round(120 * ART.getScale("scoop_spoon"))}px">${ART.tag("scoop_spoon", "🥄")}</div>
        <div class="glitter-cover" id="glitter-cover"></div>
      </div>
      <div class="glitter-pile"></div>
    </div>
    <div class="spoon-size" id="spoon-size"><button class="sz-btn" id="spoon-smaller">−</button><span class="muted">spoon size</span><button class="sz-btn" id="spoon-bigger">+</button></div>
    <div class="scoop-result muted" id="scoop-result"></div>
    <div class="row">
      <button class="btn secondary" id="auto-sift">✨ Shake for me</button>
      <button class="btn" id="scoop-continue" disabled>Continue</button>
    </div>
    ${familiarToken("scoop")}
  `);

  const isJackpot = i => !!(ROUND.scoopJackpots && ROUND.scoopJackpots[i]);
  function loadScoop() {
    const found = split[idx], jackpot = isJackpot(idx);
    const bubs = $("#scoop-bubbles"); if (bubs) { bubs.innerHTML = "";
      for (let i = 0; i < found; i++) { const s = document.createElement("span"); s.className = "sbub"; s.innerHTML = `<span class="bglyph">🫧</span>`; bubs.appendChild(s); }
      applyBubbleArt(bubs); }
    const cover = $("#glitter-cover"); if (cover) {
      cover.className = "glitter-cover" + (jackpot ? " rainbow" : "");
      cover.innerHTML = '<div class="glitter-film" id="glitter-film"></div>'; // opaque cover that hides the bubbles
      for (let i = 0; i < GLITTER; i++) { const g = document.createElement("i"); g.className = "gspeck";
        g.style.left = rnd(2, 92) + "%"; g.style.top = rnd(4, 88) + "%";
        g.style.setProperty("--sz", (8 + rnd(0, 6)) + "px");
        g.style.setProperty("--tw", (0.6 + Math.random() * 1.2).toFixed(2) + "s");
        g.style.animationDelay = (-Math.random() * 1.2).toFixed(2) + "s"; cover.appendChild(g); } }
    state = "shaking"; shakeDist = 0;
    const st = $("#scoop-step"); if (st) st.textContent = `Scoop ${idx + 1} of ${scoops}`;
    const tx = $("#scoop-text"); if (tx) tx.innerHTML = jackpot
      ? "🌈 A <b>rainbow scoop</b> — shake for the jackpot!"
      : "✋ Swipe side to side to shake off the glitter!";
  }

  function shakeTick(intensity) {
    if (state !== "shaking") return;
    const cover = $("#glitter-cover"); if (!cover) return;
    const left = [...cover.querySelectorAll(".gspeck:not(.gone)")];
    if (!left.length) { reveal(); return; }
    SFX.sift(0.16, Math.max(0.3, Math.min(1, intensity)));
    if (navigator.vibrate) navigator.vibrate(6);
    const craft = $("#scoop-craft"); if (craft) { craft.classList.remove("jig"); void craft.offsetWidth; craft.classList.add("jig"); }
    left.slice(0, BATCH).forEach(g => { g.classList.add("gone");
      g.style.setProperty("--fx", rnd(-46, 46) + "px"); g.style.setProperty("--fy", (44 + rnd(0, 60)) + "px");
      setTimeout(() => g.remove(), 520); });
    const after = Math.max(0, left.length - BATCH);
    const film = $("#glitter-film"); if (film) film.style.opacity = (after / GLITTER).toFixed(2); // thin out the cover
    if (after <= 0) setTimeout(reveal, 200);
  }

  function reveal() {
    if (state !== "shaking") return; state = "revealing";
    const found = split[idx], jackpot = isJackpot(idx); revealed += found;
    const film = $("#glitter-film"); if (film) film.style.opacity = "0";
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
      b.style.setProperty("--fx", rnd(-40, 40) + "px"); b.classList.add("floatup");
      SFX.count(k); if (navigator.vibrate) navigator.vibrate(5);
    }, 130 + k * 175));
    setTimeout(advance, 130 + found * 175 + 700);
  }

  function advance() {
    if (state === "done") return;                // skipped straight to popping
    idx++;
    if (idx >= scoops) { finish(); return; }
    const craft = $("#scoop-craft"); state = "diving";
    if (craft) { craft.classList.add("diving"); }
    SFX.scoop();
    setTimeout(loadScoop, 300);                                   // refill at the bottom of the dive
    setTimeout(() => { if (craft) craft.classList.remove("diving"); }, 560);
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
    const craft = $("#scoop-craft"); if (craft) craft.style.transform = `rotate(${Math.max(-9, Math.min(9, dx * 0.5))}deg)`;
    shakeDist += Math.abs(dx);
    if (shakeDist >= 52) { shakeDist = 0; shakeTick(Math.abs(dx) / 40 + 0.4); }
  });
  const endDrag = () => { dragging = false; const craft = $("#scoop-craft"); if (craft) { craft.style.transition = "transform .2s"; craft.style.transform = ""; setTimeout(() => { if (craft) craft.style.transition = ""; }, 200); } };
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
  on("#scoop-continue", "click", () => { if (autoIv) clearInterval(autoIv); renderPop(); });
  on("#mute-btn", "click", () => { const m = SFX.toggle(); const b = $("#mute-btn"); if (b) b.textContent = m ? "🔇" : "🔊"; });
  const resizeSpoon = delta => {
    const s = Math.max(0.4, Math.min(2.2, +(ART.getScale("scoop_spoon") + delta).toFixed(2)));
    ART.setScale("scoop_spoon", s);
    const bowl = $("#scoop-bowl"); if (bowl) bowl.style.fontSize = Math.round(120 * s) + "px";
  };
  on("#spoon-smaller", "click", () => resizeSpoon(-0.1));
  on("#spoon-bigger", "click", () => resizeSpoon(0.1));

  loadScoop();
  wireFamiliar("scoop");
  show("scoop");
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
  const bubbles = ROUND.haul.map((_, i) => bubbleHTML(i)).join("");
  html("pop", `
    ${hud("Pop Phase")}
    <button class="mute-btn" id="mute-btn" title="Sound on/off">${SFX.isMuted() ? "🔇" : "🔊"}</button>
    <div class="pop-sub muted" id="pop-hint">Tap each bubble to pop it — everything inside goes in your bag!</div>
    <div class="bubble-field" id="bubble-field">${bubbles}</div>
    <div id="hand-line" class="muted" style="font-size:13px;text-align:center;min-height:20px"></div>
    <div class="row">
      <button class="btn secondary" id="pop-all">Pop them all ✨</button>
      <button class="btn" id="pop-continue" disabled>Continue</button>
    </div>
    <div class="burst-layer" id="burst-layer"></div>
    <div class="catch-layer" id="catch-layer"></div>
    ${familiarToken("pop")}
  `);
  refreshPop();
  applyBubbleArt($("#bubble-field"));
  document.querySelectorAll("#bubble-field .pbubble").forEach(wireBubble);
  on("#pop-all", "click", popCascade);
  on("#pop-continue", "click", collectAndContinue);
  on("#mute-btn", "click", () => { const m = SFX.toggle(); const b = $("#mute-btn"); if (b) b.textContent = m ? "🔇" : "🔊"; });
  wireFamiliar("pop");
  show("pop");
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
  if (!fromCascade) refreshPop();
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
    if (now - last < 350) { last = 0; if (ROUND.slots.length === 0) { toast("Add some ingredients first!"); return; } serve(); }
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
  const list = currentRealm().infused || D.INFUSED_INGREDIENTS || []; if (!list.length) return; // realm's own reskins
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
  GAME.gold += res.gold;
  // tracked stats for quests
  if (res.success) {
    bumpStat("served");
    if (ROUND.wish.boss) bumpStat("bossWins");
    if (ROUND.rush) bumpStat("rushWins");
    if (isPerfect) bumpStat("perfect");
  }
  servedTotal++; localStorage.setItem("wishpop_served", servedTotal); save();
  renderResult(res);
}
function renderResult(res) {
  const win = res.success, c = ROUND.customer, zone = res.allergy && res.allergy.zone;
  const allergyLine = (win && (zone === "yellow" || zone === "red"))
    ? `<div class="stat-line"><span>⚠️ Allergy (${zone})</span><span style="color:var(--bad)">${zone === "red" ? "−50%" : "−25%"} pay</span></div>` : "";
  const quickLine = (win && res.quickTip > 0)
    ? `<div class="stat-line"><span>⚡ Quick‑service tip</span><span class="gold">🪙 +${res.quickTip}</span></div>` : "";
  const qualLine = (win && res.qualityTip > 0)
    ? `<div class="stat-line"><span>✨ Perfect potion!</span><span class="gold">🪙 +${res.qualityTip}</span></div>` : "";
  // PERFECT = a spotless 100% win with NO allergy reaction. An allergic win is
  // only "almost perfect", so it does not earn the confetti celebration.
  const isPerfect = win && res.weighted === 100 && zone !== "yellow" && zone !== "red";
  const trashN = (res.trash || []).length;
  const emoji = !win ? "😤" : isPerfect ? "🥳" : zone === "red" ? "🤧" : zone === "yellow" ? "😅" : (res.tip > 0 ? "🤩" : "😊");
  // Which of the customer's four faces to show: angry on a fail, allergic on an
  // allergy reaction, otherwise happy. Falls back to the emotion emoji above.
  const mood = !win ? "angry" : (zone === "red" || zone === "yellow") ? "allergic" : "happy";
  const title = win ? (isPerfect ? "Perfect!" : res.type.title) : "Wish Failed!";
  const blurb = !win
    ? c.name + " storms off in a huff — and pelts you with their trash on the way out! Grab it: junk recycles into coins or Stardust."
    : isPerfect ? c.name + " got a flawless potion — 100% perfect! ✨"
    : zone === "red" ? "The wish worked… but " + c.name + " reacted to the " + res.allergy.type + " magic! Half pay."
    : zone === "yellow" ? c.name + " got their wish, but a little " + res.allergy.type + " magic left them itchy."
    : res.qualityTip > 0 ? c.name + " loves it — that potion was practically perfect!" : res.quickTip > 0 ? c.name + " is thrilled with the speedy service!" : c.name + " is happy with their wish!";
  const rushLine = (win && res.rushBonus > 0)
    ? `<div class="stat-line"><span>⏱️ Beat the clock!</span><span class="gold">🪙 +${res.rushBonus}</span></div>` : "";
  // (Win-streak bonus is shown as a "+N 🪙" tag on the big Win Streak badge, not here.)
  // VIP key wager: on a win the staked key is kept and pays a big bonus; on a
  // failed wish the key is lost (handled in serve()).
  const vipWinLine = (win && res.vipKept)
    ? `<div class="stat-line"><span>⭐ VIP key bonus ×${BALANCE.VIP_GOLD_MULT}!</span><span class="gold">🪙 +${res.vipKeyBonus} · ✨ +${res.vipStardust}</span></div>
       <div class="stat-line"><span>🗝️ Your ${BALANCE.VIP_KEY_COST} keys</span><span style="color:var(--good)">kept — nice!</span></div>` : "";
  const vipLostLine = (!win && res.vipKeyLost)
    ? `<div class="stat-line"><span>🗝️ Wagered ${BALANCE.VIP_KEY_COST} keys</span><span style="color:var(--bad)">lost!</span></div>` : "";
  const earnedRow = win
    ? `<div class="stat-line"><span>Earned</span><span class="gold">🪙 ${res.gold}</span></div>${quickLine}${qualLine}${rushLine}${vipWinLine}`
    : `<div class="stat-line"><span>Earned</span><span class="muted">no coins — just trash!</span></div>
       <div class="stat-line"><span>🗑️ Trash thrown</span><span><b>${trashN}</b> piece${trashN === 1 ? "" : "s"}</span></div>${vipLostLine}
       <div class="stat-line"><span>🔥 Win streak</span><span class="muted">broken</span></div>`;
  html("result", `
    ${hud("Result")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${custMoodArt(c, mood, emoji, "cust-big result-face")}</div>
      <div class="result-title ${win ? "win" : "lose"} ${isPerfect ? "perfect" : ""}">${title}</div>
      ${resultStreaksMarkup(res)}
      ${win ? rewardBubblesMarkup(res) : (trashN ? trashInfoMarkup(res) : "")}
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Your Match</span><span><b>${res.weighted}%</b></span></div>
        <div class="stat-line"><span>Needed</span><span>${res.required}%</span></div>
        ${allergyLine}
        ${earnedRow}
      </div>
      <p class="muted" style="max-width:300px">${blurb}</p>
    </div>
    <div class="result-actions">
      <button class="btn recap-btn" id="recap-btn">📋 Round Recap</button>
      <button class="btn" id="next-btn">Next Customer  →</button>
    </div>
  `);
  on("#next-btn", "click", startRound);
  on("#recap-btn", "click", showRoundRecap);
  show("result");
  if (win) wireRewardBubbles(res);
  else if (trashN) wireTrashBubbles(res);
  if (isPerfect) setTimeout(celebratePerfect, 260);
}
// --- Loss: disgruntled customer throws trash. It floats around the result
// screen like the reward coins; pop each piece to collect it into your bin
// (capped at TRASH_BIN_MAX). Recycle it later for coins or Stardust. ---------
function trashInfoMarkup(res) {
  const n = (res.trash || []).length;
  return `<div class="reward-bubbles" id="trash-info">
    <div class="rb-total">🗑️ Caught <span><b id="trash-count">0</b>/${n}</span></div>
    <div class="rb-hint muted" id="trash-hint">Catch the junk they hurled — recycle it for coins or Stardust later! 🍌</div>
  </div>`;
}
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
// Two big streak badges on the result screen: the overall Win Streak and the
// Allergy-Free streak. A freshly-earned Stardust payout shows as a "+N ✨" tag.
function resultStreaksMarkup(res) {
  const ws = GAME.streak || 0, cs = GAME.cleanStreak || 0;
  const goldGain = res.streakBonus > 0 ? `<span class="sb-gain gold">+${res.streakBonus}🪙</span>` : "";
  const dustGain = res.cleanDust > 0 ? `<span class="sb-gain">+${res.cleanDust}✨</span>` : "";
  const cleanGrew = res.hadAllergy && res.success && !(res.allergy && (res.allergy.zone === "yellow" || res.allergy.zone === "red"));
  return `<div class="result-streaks">
    <div class="streak-badge fire${ws >= 1 ? "" : " dim"}${res.success ? " pop" : ""}"><span class="sb-ico">🔥</span><b class="sb-n">${ws}</b><span class="sb-lbl">Win Streak</span>${goldGain}</div>
    <div class="streak-badge clean${cs >= 1 ? "" : " dim"}${cleanGrew ? " pop" : ""}"><span class="sb-ico">💚</span><b class="sb-n">${cs}</b><span class="sb-lbl">Allergy‑Free</span>${dustGain}</div>
  </div>`;
}
function rewardBubblesMarkup(res) {
  const tips = Math.max(0, res.tip);
  const dust = res.cleanDust > 0 ? ` <span class="dust">✨ <b id="rb-dust">0</b></span>` : "";
  return `<div class="reward-bubbles" id="reward-bubbles">
    <div class="rb-total">Collected <span class="gold">🪙 <b id="rb-count">0</b></span>${dust}</div>
    <div class="rb-hint muted" id="rb-hint">${res.cleanDust > 0 ? "Pop for coins — and your allergy‑free Stardust! 🫧" : tips > 0 ? "Catch the floating coins to collect them! 🫧" : "Pop your reward bubble! 🫧"}</div>
  </div>`;
}
function wireRewardBubbles(res) {
  const sc = screen("result"); if (!sc) return;
  const countEl = document.querySelector("#screen-result #rb-count");
  const dustEl = document.querySelector("#screen-result #rb-dust");
  const hintEl = document.querySelector("#screen-result #rb-hint");
  const base = Math.max(0, res.gold - res.tip), tips = Math.max(0, res.tip), dustAmt = res.cleanDust || 0;
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
    const big = !!opts.big, wide = big || cls === "dust";
    const wrap = document.createElement("div"); wrap.className = "rbub-wrap";
    wrap.style.left = rnd(6, wide ? 58 : 78) + "%";
    wrap.style.top = rnd(14, 72) + "%";
    for (let k = 1; k <= 3; k++) { wrap.style.setProperty("--dx" + k, rnd(-46, 46).toFixed(0) + "px"); wrap.style.setProperty("--dy" + k, rnd(-46, 46).toFixed(0) + "px"); }
    wrap.style.animationDuration = rnd(5, 9).toFixed(2) + "s";
    wrap.style.animationDelay = "-" + rnd(0, 5).toFixed(2) + "s"; // desync so they don't move in lockstep
    const btn = document.createElement("button");
    btn.className = "rbub " + cls; btn.dataset.amt = amt; if (big) btn.dataset.big = "1"; btn.dataset.flavor = opts.flavor || (big ? "gold" : "coin");
    btn.setAttribute("aria-label", cls === "dust" ? "stardust reward" : big ? "gold reward" : "tip coin");
    btn.innerHTML = cls === "dust" ? `<span class="rb-amt">✨ ${amt}</span>` : big ? `<span class="rb-amt">🪙 ${amt}</span>` : "🪙";
    wrap.appendChild(btn); layer.appendChild(wrap);
    return btn;
  };
  const popBub = btn => {
    if (!btn || btn.classList.contains("popped")) return;
    btn.classList.add("popped");
    const amt = +btn.dataset.amt || 0, big = btn.dataset.big, flavor = btn.dataset.flavor;
    const r = btn.getBoundingClientRect();
    resultBurst(r.left + r.width / 2, r.top + r.height / 2, flavor === "stardust" ? "stardust" : big ? "gold" : "coin");
    if (flavor === "stardust") { bumpDust(amt); SFX.bigCoin(); }
    else { bump(amt); if (big) SFX.bigCoin(); else SFX.coin(littleStep++); }
    const wrap = btn.parentElement;
    setTimeout(() => { if (wrap) wrap.remove(); }, 240);
    checkDone();
  };
  const checkDone = () => setTimeout(() => {
    if (!layer.querySelector(".rbub:not(.popped)") && hintEl) hintEl.textContent = `All collected! 🪙 ${res.gold}${dustAmt ? ` · ✨ ${dustAmt}` : ""}`;
  }, 260);
  const bigBtn = makeBubble("big", base, { big: true });
  const littleBtns = [];
  for (let i = 0; i < tips; i++) littleBtns.push(makeBubble("little", 1));
  const dustBtn = dustAmt > 0 ? makeBubble("dust", dustAmt, { flavor: "stardust" }) : null;
  bigBtn.addEventListener("click", () => {
    SFX.unlock(); popBub(bigBtn);
    // popping the big bubble cascades the stardust bubble FIRST (so it feels linked to the
    // big pop), then all remaining tip coins
    const cascade = [...layer.querySelectorAll(".rbub.dust:not(.popped)"), ...layer.querySelectorAll(".rbub.little:not(.popped)")];
    cascade.forEach((b, i) => setTimeout(() => popBub(b), 90 * (i + 1)));
  });
  littleBtns.forEach(b => b.addEventListener("click", () => { SFX.unlock(); popBub(b); }));
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
  const s = ROUND.stats; if (!s) return "";
  return `<div class="card" style="width:100%;max-width:320px">
    <div style="font-weight:800;text-align:center;margin-bottom:6px">📋 Round Recap</div>
    <div class="stat-line"><span>🥄 Bubbles scooped</span><span><b>${s.scooped}</b></span></div>
    <div class="stat-line"><span>🫧 Bubbles popped <span class="muted" style="font-size:11px">(incl. bonus)</span></span><span><b>${s.popped}</b></span></div>
    <div class="stat-line"><span>🎒 Ingredients found</span><span><b>${s.ingredients}</b></span></div>
    <div class="stat-line"><span>✨ Charms found</span><span><b>${s.charms}</b></span></div>
    <div class="stat-line"><span>🪙 Gold · 🐸 Treats gained</span><span><b>${s.gold}</b> · <b>${s.treats}</b></span></div>
    <div class="stat-line"><span>🔺 Triples made</span><span><b>${s.triples}</b></span></div>
  </div>`;
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
  window.__wp = { get ROUND() { return ROUND; }, set ROUND(v) { ROUND = v; }, get GAME() { return GAME; }, save, popAt, spawnBonusBubbles, charmCelebrate, refreshPop, collectAndContinue, paintMix, paintMixTop, playCharm, addToSlot, renderResult, rollWellPrize, renderRecycle, renderMenu, renderQuests, refreshQuests, bumpStat, serve, startRound, renderCustomer, rushExpire, renderFairyIntro, renderFairy, maybeEvent, renderDuelIntro, renderDuel, get DUEL() { return DUEL; }, duelResolve, renderStart, custMoodArt, logoMarkup, renderAdmin, renderRumpelIntro, renderRumpelRound, renderRumpelBetween, renderRumpelTally, rumpelStop, get RUMPEL() { return RUMPEL; }, set RUMPEL(v) { RUMPEL = v; }, renderGoblinIntro, goblinRequest, goblinFeed, goblinPass, goblinResolve, get GOBLIN() { return GOBLIN; }, set GOBLIN(v) { GOBLIN = v; }, renderWolfIntro, wolfStart, wolfFeed, wolfTick, wolfFinish, get WOLF() { return WOLF; }, set WOLF(v) { WOLF = v; }, renderDanceIntro, danceStep, danceAdvance, danceTap, danceJudge, danceMeterPct, danceFinish, get DANCE() { return DANCE; }, set DANCE(v) { DANCE = v; }, renderCakeIntro, cakeStartTier, cakeToDecorate, cakePlace, cakeUndo, cakeRedo, cakeSubmitTier, cakeTierCleared, cakeFinish, get CAKE() { return CAKE; }, set CAKE(v) { CAKE = v; }, renderQueenIntro, queenBuy, queenServe, renderQueenResult, ingInst, injectInfused, injectKeys, applyInfusedEffect, renderVault, openChest, rollChestPrize, renderMap, travelRealm, unlockRealm, currentRealm, markRealmEventCleared, realmEventsCleared, realmEventsNeeded, realmStoryComplete, get QUEEN() { return QUEEN; }, set QUEEN(v) { QUEEN = v; } };
}
// one delegated handler covers the HUD menu button on every screen (no per-render wiring)
document.addEventListener("click", e => { if (e.target.closest && e.target.closest(".hud-menu")) goHome(); });
window.addEventListener("load", () => { applyCustomBackground(); refreshQuests(); renderStart(); });

})();
