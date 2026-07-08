/* ==========================================================================
 * Wish Pop: Bubble Shop — UI / SCREEN FLOW (v3 Cauldron-First)
 * Start -> Customer -> Scoop -> Pop (draft a hand) -> Cauldron -> Result
 * ======================================================================== */
(function () {
"use strict";

const { R, newRound, applyTripleMatch, scoreMix, scoreResult, BALANCE } = ENGINE;
const D = DATA;
const BUILD = "v41"; // bump on each deploy; shown on the start screen to verify the live version

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
  if (typeof g.recycled !== "number") g.recycled = 0; // lifetime junk recycled (drives achievements)
  if (typeof g.streak !== "number") g.streak = 0;
  if (typeof g.bestStreak !== "number") g.bestStreak = 0;
  if (typeof g.nextEventAt !== "number") g.nextEventAt = -1; // -1 = uninitialized (set on first play)
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
// currently-equipped cosmetics
function equippedCauldronClass() { return "skin-" + (GAME.equipped.cauldron || "cauldron_classic"); }
function equippedFamiliarChip() { return buddyArt(GAME.equipped.familiar); }

/* --- custom art helpers: use an uploaded image if present, else the emoji ---
 * (see art.js + /docs/art/README.md). Each returns an inline HTML string. */
function ingArt(id, cls)  { const ing = D.INGREDIENT_BY_ID[id]; return ART.tag("ing_" + id, ing ? ing.emoji : "❔", cls || "ing-art"); }
function charmArt(id, cls) { const ch = D.SPECIAL_CHARMS[id]; return ART.tag("charm_" + id, ch ? ch.emoji : "❔", cls || "charm-art"); }
function custArt(c, cls)  { return ART.tag("customer_" + c.id, c.emoji, cls || "cust-art"); }
function buddyArt(id, cls) { const c = D.COSMETIC_BY_ID[id]; return ART.tag("buddy_" + id, c ? c.chip : D.FAMILIAR.emoji, cls || ""); }
function trashArt(id, cls) { const t = D.TRASH_BY_ID[id]; return ART.tag("trash_" + id, t ? t.emoji : "🗑️", cls || "trash-art"); }
// recycle values for a piece of trash
function trashCoins(id) { const t = D.TRASH_BY_ID[id]; return t ? t.coins : 0; }
function trashDust(id)  { const t = D.TRASH_BY_ID[id]; return t ? Math.max(1, Math.round(t.coins / BALANCE.TRASH_DUST_DIVISOR)) : 0; }
// apply an optional custom background image to the whole app (once, at boot)
function applyCustomBackground() {
  ART.ensure("background", u => { const app = document.getElementById("app"); if (app) { app.style.backgroundImage = "url(" + u + ")"; app.classList.add("has-bg"); } });
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
  const leave = () => { stopRoundTimers(); renderStart(); };
  if (inRound) confirmDialog("Leave this round and head to the menu? This round won't be saved.", leave);
  else leave();
}
function syncHud(id) {
  const g = document.querySelector("#screen-" + id + " .hud .gold"); if (g) g.textContent = "🪙 " + GAME.gold;
  const t = document.querySelector("#screen-" + id + " .hud .treatcount"); if (t) t.textContent = GAME.treats;
}

/* ======================================================================= */
/* START                                                                   */
/* ======================================================================= */
function renderStart() {
  html("start", `
    ${hud("Bubble Shop", { noHome: true })}
    <div class="grow center">
      <div class="bubble-emojis">🫧 ✨ 🫧</div>
      <div class="logo">Wish Pop</div>
      <div class="sub">Bubble Shop</div>
      <p class="muted" style="max-width:300px">Fairytale folk arrive with a wish. Scoop bubbles, pop them for ingredients &amp; charms, then mix the perfect potion in your cauldron!</p>
      <div class="bubble-emojis" style="font-size:26px">🍪 🧁 🐭 🦉 🐺</div>
    </div>
    <button class="btn" id="play-btn">▶  Play</button>
    <div style="height:8px"></div>
    <button class="btn secondary" id="menu-btn">🛍️  Shop &amp; Upgrades</button>
    <div style="height:8px"></div>
    <button class="btn secondary small" id="admin-btn" style="align-self:center">⚙️ Admin (art upload — coming soon)</button>
    <div class="row" style="justify-content:center;gap:10px;margin-top:8px;align-items:center">
      <button class="btn good small" id="sound-test" style="max-width:210px">🔊 Tap to test sound</button>
      <span class="muted" style="font-size:12px">Build ${BUILD}</span>
    </div>
  `);
  on("#play-btn", "click", startRound);
  on("#menu-btn", "click", renderMenu);
  on("#admin-btn", "click", () => toast("Art uploader arrives in a later phase."));
  on("#sound-test", "click", () => {
    SFX.unlock();
    [0, 1, 2, 3].forEach((s, i) => setTimeout(() => { SFX.pop(s); SFX.reveal(i === 3 ? "charm" : "ingredient", s); }, i * 160));
    if (navigator.vibrate) navigator.vibrate(20);
    toast(SFX.isMuted() ? "Sound is muted — tap 🔇 to unmute" : "Hear that? 🔊");
  });
  show("start");
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
      <button class="btn secondary" id="recycle-btn" style="margin-bottom:10px">🗑️ Trash &amp; Recycle <span class="muted" style="font-weight:500;font-size:12px">· ${GAME.trash.length}/${BALANCE.TRASH_BIN_MAX}</span></button>
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
/* WISHING WELL — spend gold, gamble for cosmetics (always get something)   */
/* ======================================================================= */
function ownedCount(kind) { return D.COSMETICS[kind].filter(c => GAME.owned[c.id]).length; }
function allSkins() { return [].concat(D.COSMETICS.cauldron, D.COSMETICS.familiar); }
// the Well only awards buyable skins — achievement-only skins are earned, never rolled
function unownedSkins() { return allSkins().filter(c => !GAME.owned[c.id] && !c.achievement); }
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
      const owned = !!GAME.owned[c.id], equipped = GAME.equipped[kind] === c.id, ach = c.achievement;
      const canBuy = !owned && !ach && GAME.stardust >= dustCost;
      const btn = equipped
        ? `<span class="skin-tag equipped">✓ On</span>`
        : owned
          ? `<button class="btn small good skin-equip" data-kind="${kind}" data-id="${c.id}">Wear</button>`
          : ach
            ? `<span class="skin-tag muted">🏆 ${Math.min(GAME.recycled, ach.need)}/${ach.need}</span>`
            : `<button class="btn small ${canBuy ? "" : "secondary"} skin-buy" data-id="${c.id}" ${canBuy ? "" : "disabled"}>✨${dustCost}</button>`;
      // achievement skins reveal their look + goal (to chase); other unowned stay a mystery
      const chip = owned
        ? (kind === "familiar" ? buddyArt(c.id, "skin-art") : ART.tag("cauldron_" + c.id, c.chip, "skin-art"))
        : ach ? c.chip : "❔";
      const nameShown = owned || ach ? c.name : "???";
      return `<div class="skin-tile ${equipped ? "on" : ""} ${owned ? "" : "locked"} ${ach && !owned ? "ach" : ""}">
        <div class="skin-chip">${chip}</div>
        <div class="skin-name">${nameShown}${ach && !owned ? `<div class="muted" style="font-size:10px;font-weight:600">${ach.desc}</div>` : ""}</div>
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
function maybeFairyEvent() {
  if (GAME.nextEventAt < 0) { GAME.nextEventAt = servedTotal + BALANCE.EVENT_EVERY; save(); return false; }
  if (servedTotal < GAME.nextEventAt) return false;
  GAME.nextEventAt = servedTotal + BALANCE.EVENT_EVERY; save();
  renderFairyIntro();
  return true;
}
function renderFairyIntro() {
  fairyRung = 1;
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
  const pool = D.INGREDIENTS.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  const picks = pool.slice(0, FAIRY_SHOW);
  // baskets: each pick's MAIN magic guaranteed (so always solvable), then fill to 6
  const baskets = [];
  picks.forEach(p => { if (!baskets.includes(p.qualities[0])) baskets.push(p.qualities[0]); });
  picks.forEach(p => p.qualities.slice(1).forEach(q => { if (baskets.length < FAIRY_BASKETS && !baskets.includes(q)) baskets.push(q); }));
  const others = D.MAGIC_TYPES.filter(m => !baskets.includes(m));
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
/* CUSTOMER                                                                */
/* ======================================================================= */
function startRound() {
  SFX.unlock();
  stopRoundTimers();
  refreshQuests();
  if (maybeFairyEvent()) return;   // a fairytale event takes this turn instead of a customer
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm });
  // occasionally an "In a Rush" customer (never a boss) — a patience clock starts
  // when scooping begins.
  ROUND.rush = !ROUND.wish.boss && Math.random() < BALANCE.RUSH_CHANCE;
  if (ROUND.rush) { ROUND.rushMs = BALANCE.RUSH_MS; ROUND.rushStart = null; }
  renderCustomer();
}
function renderCustomer() {
  const c = ROUND.customer, w = ROUND.wish;
  const needChips = w.needs.map(n => n.revealed
    ? `<div class="need-chip">${magicDot(n.type)} ${n.type}</div>`
    : `<div class="need-chip hidden-need">❔ ${n.label}</div>`).join("");
  const allergyList = [w.allergy, w.allergy2].filter(Boolean);
  const allergyTxt = allergyList.length
    ? `<span style="color:var(--bad)">${allergyList.map(a => `⚠️ ${magicDot(a)} ${a}`).join(" ")}</span>` : "None";
  const bossBanner = w.boss
    ? `<div class="boss-banner">👑 VIP Customer — extra picky! All three needs, tiny green zones, only ${BALANCE.BOSS_SLOTS} cauldron slots, two allergies.</div>` : "";
  const rushBanner = ROUND.rush
    ? `<div class="boss-banner" style="background:linear-gradient(90deg,#ff9a5a,#ff6b6b,#ff9a5a)">⏱️ In a Rush! Serve before their patience runs out for a <b>+${BALANCE.RUSH_BONUS} bonus</b> — miss it and they leave.</div>` : "";
  const streakChip = GAME.streak >= 2 ? `<div class="streak-chip">🔥 ${GAME.streak} win streak</div>` : "";
  html("customer", `
    ${hud(c.location)}
    ${bossBanner}${rushBanner}
    <div class="grow center" style="gap:16px">
      ${streakChip}
      <div class="ph big ${w.boss ? "boss-emoji" : ""}">${custArt(c, "cust-big")}</div>
      <div style="font-weight:800;font-size:20px">${w.boss ? "👑 " : ""}${c.name}</div>
      <div class="speech">“${c.line}”</div>
      <div class="needs-row">${needChips}</div>
      <div class="card" style="width:100%;max-width:340px">
        <div class="stat-line"><span>Payment</span><span class="gold">🪙 ${ROUND.payment}</span></div>
        <div class="stat-line"><span>Required Match</span><span>${w.requiredMatch}%</span></div>
        <div class="stat-line"><span>Scoops of glitter</span><span>${ROUND.scoops}</span></div>
        <div class="stat-line"><span>Allerg${allergyList.length > 1 ? "ies" : "y"}</span><span>${allergyTxt}</span></div>
      </div>
    </div>
    <button class="btn ${w.boss ? "good" : ""}" id="scoop-btn">Start Scoop  ✨</button>
  `);
  if (w.boss) { SFX.unlock(); SFX.charm(); }
  on("#scoop-btn", "click", renderScoop);
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
      jackCharm = ENGINE.pickCappedCharm(ROUND.charms);
      ROUND.charms.push(jackCharm); jackDone[idx] = true; if (ROUND.stats) ROUND.stats.charms++; // awarded straight into the tray
    }
    const tx = $("#scoop-text"); if (tx) tx.innerHTML = jackpot
      ? `🌈 <b>Jackpot!</b> ${found} bubbles + ${CHARM(jackCharm).emoji} ${CHARM(jackCharm).name} charm!`
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
        const ch = ENGINE.pickCappedCharm(ROUND.charms);
        ROUND.charms.push(ch); if (ROUND.stats) ROUND.stats.charms++;
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
  return { emoji: ART.tag("icon_treat", "🐸"), label: "+1 treat", kind: "treat" };
}

function popAt(i, el, fromCascade, power) {
  if (!el || el.classList.contains("popped")) return;
  SFX.unlock(); power = power || 0;
  const item = ROUND.haul[i];
  // gold/treat bank instantly; ingredients & charms pop OUT of the bubble to be caught
  if (item.kind === "gold") { GAME.gold += item.amt; save(); }
  else if (item.kind === "treat") { GAME.treats += 1; save(); }
  ROUND.popIndex++;
  const st = ROUND.stats;
  if (st) { st.popped++;
    if (item.kind === "ingredient") st.ingredients++;
    else if (item.kind === "charm") st.charms++;
    else if (item.kind === "gold") st.gold += item.amt;
    else if (item.kind === "treat") st.treats++;
  }

  const info = itemInfo(item), flavor = POP_FLAVOR[info.kind];
  const now = Date.now();
  popCombo = (now - lastPopAt < 700) ? popCombo + 1 : 0; lastPopAt = now;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;

  if (item.kind === "charm") {
    SFX.pop(popCombo, power); SFX.reveal("ingredient", popCombo);
    spawnFloatingCharm(item.id, cx, cy);                    // fanfare happens on catch
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
  if (remaining <= 0) { // at the cap — don't dud; hand over one ingredient directly
    const it = ENGINE.bonusBubbleItems(ROUND.wish, 1, 0)[0];
    if (it && it.kind === "ingredient") { if (ROUND.stats) ROUND.stats.ingredients++; spawnFloatingIngredient(it.id, cx, cy, 850); }
    return;
  }
  const n = Math.min(R.int(BALANCE.BONUS_SPAWN_MIN, BALANCE.BONUS_SPAWN_MAX), remaining);
  ROUND.bonusSpawned = (ROUND.bonusSpawned || 0) + n;
  const chainChance = ROUND.bonusSpawned < cap ? (frenzy ? BALANCE.BONUS_CHAIN_FRENZY : BALANCE.BONUS_CHAIN_CHANCE) : 0;
  const items = ENGINE.bonusBubbleItems(ROUND.wish, n, chainChance);
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

// Charm floats out of the popped bubble; tap it to gather it (with the fanfare).
function spawnFloatingCharm(id, x, y) {
  const layer = $("#catch-layer"); if (!layer) { ROUND.charms.push(id); return; }
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
  SFX.unlock(); SFX.charm();
  ROUND.charms.push(id);
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
  const layer = $("#catch-layer"); if (!layer) { ROUND.inventory.push({ id, potent: false }); return; }
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
  ROUND.inventory.push({ id, potent: false });
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
    if (!tok.classList.contains("caught")) { ROUND.charms.push(tok.dataset.charm); tok.remove(); }
  });
  document.querySelectorAll("#catch-layer .ing-token").forEach(tok => {
    if (!tok._caught) { tok._caught = true; clearTimeout(tok._timer); ROUND.inventory.push({ id: tok.dataset.ing, potent: false }); tok.remove(); }
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
  const merged = applyTripleMatch(ROUND.inventory); ROUND.inventory = merged.inventory;
  if (ROUND.stats) ROUND.stats.triples = merged.merged.length;
  ROUND.slots = []; ROUND.mixStart = Date.now();
  ROUND.potentNext = false; ROUND.allergyOffset = 0; ROUND.insight = false;
  paintMix(); show("mix");
  if (ROUND._mixTimer) clearInterval(ROUND._mixTimer);
  ROUND._mixTimer = setInterval(paintMixTop, 500);
  const afterTriples = () => { if (rawCount > BALANCE.SNEEZE_AT && !ROUND.wish.boss) setTimeout(sneezeAllergy, 250); }; // bosses don't sneeze
  if (merged.merged.length) showTriple(merged.merged, afterTriples);
  else setTimeout(afterTriples, 350);
}
// Over-abundant round → the customer sneezes up a fresh allergy (self-balancing).
function sneezeAllergy() {
  const heldIds = ROUND.inventory.map(x => x.id).filter(Boolean);
  const added = ENGINE.addSneezeAllergy(ROUND.wish, heldIds);
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
function paintMixTop() {
  const el = $("#mix-top"); if (!el) return;
  const w = ROUND.wish;
  const score = scoreMix(ROUND.slots, w, ROUND.allergyOffset);
  // DISCOVERY: a mystery need reveals when you play an ingredient whose MAIN
  // quality (or a Wild charm's magic) is that need. No timers.
  w.needs.forEach(n => {
    if (n.revealed) return;
    const found = ROUND.slots.some(inst => (inst.wild || inst.essence) ? inst.magic === n.type : D.INGREDIENT_BY_ID[inst.id].qualities[0] === n.type);
    if (found) n.revealed = true;
  });
  const req = w.requiredMatch, meets = score.weighted >= req;
  const MAX = BALANCE.BAR_MAX;
  const meters = w.needs.map((n, i) => {
    const s = score.perNeed[i];
    const fillPct = Math.min(100, s.points / MAX * 100);
    const inBand = s.pct === 100, over = s.points > s.bandHigh;
    const bandLeft = Math.max(0, s.bandLow / MAX * 100), bandW = Math.max(2, (s.bandHigh - s.bandLow) / MAX * 100);
    if (!n.revealed) {
      // Mystery need: type/label stay hidden, but SHOW the green target band + a
      // green glow when it's landed, so a hidden need you happen to hit reads clearly.
      return `<div class="need-meter"><div class="lbl"><span class="muted">❔ Mystery Need</span>
        <span class="muted" style="${inBand ? "color:var(--good);font-weight:800" : ""}">${inBand ? "✓ in the green!" : "?"}</span></div>
        <div class="meter sweet ${inBand ? "hit" : ""}"><span class="band" style="left:${bandLeft}%;width:${bandW}%"></span><i style="width:${fillPct}%;background:${inBand ? "var(--good)" : "rgba(255,255,255,0.28)"}"></i></div></div>`;
    }
    const fillCol = inBand ? "var(--good)" : over ? "var(--bad)" : D.MAGIC[n.type];
    const status = inBand ? "✓ in the green!" : over ? "overfilled!" : s.pct + "%";
    const statusCol = inBand ? "var(--good)" : over ? "var(--bad)" : "var(--ink-dim)";
    return `<div class="need-meter"><div class="lbl"><span>${magicDot(n.type)} ${n.type}</span>
      <span style="color:${statusCol};font-weight:800">${status}</span></div>
      <div class="meter sweet ${inBand ? "hit" : ""}"><span class="band" style="left:${bandLeft}%;width:${bandW}%"></span><i style="width:${fillPct}%;background:${fillCol}"></i></div></div>`;
  }).join("");
  const needCount = w.needs.length, effLimit = needCount + 1, tipAmt = needCount * BALANCE.QUICK_TIP_PER_HIDDEN;
  const tipLine = ROUND.slots.length <= effLimit
    ? `<div class="mix-hint" style="color:var(--gold)">⚡ Serve with <b>≤${effLimit} ingredient${effLimit > 1 ? "s" : ""}</b> → <b>+${tipAmt} speed tip!</b></div>`
    : `<div class="mix-hint muted">Land each bar in its <b style="color:var(--good)">green zone</b> — don't overfill! The zones shrink as you add.</div>`;
  el.innerHTML = `
    <div class="stat-line" style="padding:0 0 4px"><span>${custArt(ROUND.customer)} ${ROUND.customer.name}</span>
      <span>Match <b style="color:${meets ? "var(--good)" : "var(--ink)"}">${score.weighted}%</b> / need ${req}%</span></div>
    ${meters}
    ${(score.allergies || []).map(allergyMeter).join("")}
    ${tipLine}`;
}
function paintMix() {
  const w = ROUND.wish;
  const score = scoreMix(ROUND.slots, w, ROUND.allergyOffset);
  let best = w.needs[0], bestPct = -1;
  w.needs.forEach((n, i) => { if (score.perNeed[i].pct >= bestPct) { bestPct = score.perNeed[i].pct; best = n; } });
  const liquid = D.MAGIC[best.type];
  const slotCells = [];
  for (let i = 0; i < ROUND.maxSlots; i++) {
    const inst = ROUND.slots[i];
    const face = !inst ? "" : inst.wild ? "🌈"
      : inst.essence ? `<span class="orb" style="background:${D.MAGIC[inst.magic]}"></span>`
      : ingArt(inst.id);
    slotCells.push(`<div class="slot ${inst ? "filled" : ""} ${inst && inst.potent ? "potent" : ""} ${inst && inst.shrunk ? "shrunk" : ""}">${face}${inst && inst.shrunk ? `<span class="pinch-badge">🤏</span>` : ""}</div>`);
  }
  const tray = ROUND.charms.length
    ? `<div class="charm-tray">${ROUND.charms.map((c, i) => `<button class="charm-chip" data-charm="${i}" title="${CHARM(c).desc}">${charmArt(c)} <span>${CHARM(c).name}</span></button>`).join("")}</div>`
    : "";
  html("mix", `
    ${hud("Cauldron")}
    <div class="card" id="mix-top" style="margin-bottom:6px;padding:12px"></div>
    <div class="cauldron-wrap grow">
      <div class="cauldron ${equippedCauldronClass()}" id="cauldron">
        <div class="liquid" style="height:${Math.max(6, score.weighted)}%;background:linear-gradient(180deg, ${liquid}, ${shade(liquid)})"></div>
        <div class="bub b1"></div><div class="bub b2"></div><div class="bub b3"></div>
        <div class="pct">${score.weighted}%</div>
      </div>
      <div class="slots">${slotCells.join("")}</div>
      ${tray}
    </div>
    <button class="btn good" id="serve-btn" ${ROUND.slots.length === 0 ? "disabled" : ""}>✨ Serve the Wish</button>
    ${ROUND.inventory.length
      ? `<div class="inv-2row ${ROUND.toolMode ? "cutting" : ""}" id="inv-row">${ROUND.inventory.map((inst, idx) => invTile(inst, idx)).join("")}</div>`
      : `<div class="muted" style="text-align:center;padding:12px">Bag empty — serve what's in the pot!</div>`}
    ${familiarToken("mix")}
  `);
  paintMixTop();
  applyCauldronArt();
  ROUND.inventory.forEach((inst, idx) => { const t = document.getElementById("invt-" + idx); if (t) t.addEventListener("click", () => addToSlot(idx, t)); });
  ROUND.charms.forEach((c, i) => { const b = document.querySelector(`[data-charm="${i}"]`); if (b) b.addEventListener("click", () => playCharm(i)); });
  on("#serve-btn", "click", serve);
  wireFamiliar("mix");
}
function invTile(inst, idx) {
  if (inst.essence) {
    return `<div class="inv-tile essence ${inst.potent ? "potent" : ""} ${inst.shrunk ? "shrunk" : ""}" id="invt-${idx}">
      <div class="emoji"><span class="orb" style="background:${D.MAGIC[inst.magic]}"></span>${inst.shrunk ? `<span class="pinch-badge">🤏</span>` : ""}</div>
      <div class="nm">${inst.potent ? "✨" : ""}${inst.shrunk ? "½ " : ""}${inst.magic} Essence</div><div class="q">${magicDot(inst.magic)} pure ${inst.magic}</div></div>`;
  }
  const ing = D.INGREDIENT_BY_ID[inst.id];
  const cuttable = ROUND.toolMode ? " cuttable" : "";
  const quals = ROUND.insight ? ing.qualities.map(q => magicDot(q)).join("") + " " + ing.qualities.join(", ") : magicDot(ing.qualities[0]) + " " + ing.qualities[0];
  return `<div class="inv-tile ${inst.potent ? "potent" : ""} ${inst.shrunk ? "shrunk" : ""}${cuttable}" id="invt-${idx}">
    <div class="emoji">${ingArt(inst.id)}${inst.shrunk ? `<span class="pinch-badge">🤏</span>` : ""}</div><div class="nm">${inst.potent ? "✨" : ""}${inst.shrunk ? "½ " : ""}${ing.name}</div><div class="q">${quals}</div></div>`;
}
function allergyMeter(a) {
  const pct = Math.min(100, Math.round(a.points / BALANCE.ALLERGY_RED_AT * 100));
  const col = a.zone === "red" ? "var(--bad)" : a.zone === "yellow" ? "var(--gold)" : "var(--good)";
  return `<div class="need-meter" style="margin-top:8px"><div class="lbl"><span>⚠️ Allergy: ${magicDot(a.type)} ${a.type}</span>
    <span style="color:${col};font-weight:800">${a.zone.toUpperCase()}</span></div>
    <div class="meter" style="background:rgba(255,90,90,0.12)"><i style="width:${pct}%;background:${col}"></i></div></div>`;
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
  paintMix();
  const c2 = document.getElementById("cauldron"); if (c2) { c2.classList.remove("splash"); void c2.offsetWidth; c2.classList.add("splash"); }
}
// Knife: cut an ingredient into one pure-magic essence per quality.
function cutIngredient(idx, fromEl) {
  const inst = ROUND.inventory[idx];
  if (!inst || !inst.id || inst.essence) { toast("Pick a whole ingredient to cut."); return; }
  const ing = D.INGREDIENT_BY_ID[inst.id], wasPotent = !!inst.potent;
  ROUND.inventory.splice(idx, 1);
  // a Potent ingredient cuts into Potent essences (potency carries through)
  ing.qualities.forEach(q => ROUND.inventory.push({ essence: true, magic: q, potent: wasPotent }));
  const ki = ROUND.charms.indexOf("knife"); if (ki >= 0) ROUND.charms.splice(ki, 1);
  ROUND.toolMode = null;
  SFX.unlock(); SFX.chop();
  if (navigator.vibrate) navigator.vibrate([8, 30, 8]);
  toast(`🔪 Cut ${wasPotent ? "Potent " : ""}${ing.name} into ${ing.qualities.length} ${wasPotent ? "Potent " : ""}pure magics!`);
  paintMix();
}
// Transmute: change a whole ingredient into a random NEEDED one (keeps potent).
function transmuteIngredient(idx, fromEl) {
  const inst = ROUND.inventory[idx];
  if (!inst || !inst.id || inst.essence) { toast("Pick a whole ingredient to transmute."); return; }
  const needs = ROUND.wish.needs.map(n => n.type);
  let pool = D.INGREDIENTS.filter(i => needs.includes(i.qualities[0]) && i.id !== inst.id);
  if (!pool.length) pool = D.INGREDIENTS.filter(i => i.id !== inst.id);
  const ing = R.pick(pool), oldName = D.INGREDIENT_BY_ID[inst.id].name;
  ROUND.inventory[idx] = { id: ing.id, potent: inst.potent };
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
  inst.shrunk = true;
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
  // In-a-Rush: bonus for serving one in time
  if (ROUND.rush && res.success) { res.rushBonus = BALANCE.RUSH_BONUS; res.gold += res.rushBonus; }
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
  const title = win ? (isPerfect ? "Perfect!" : res.type.title) : "Wish Failed!";
  const blurb = !win
    ? c.name + " storms off in a huff — and pelts you with their trash on the way out! Grab it: junk recycles into coins or Stardust."
    : isPerfect ? c.name + " got a flawless potion — 100% perfect! ✨"
    : zone === "red" ? "The wish worked… but " + c.name + " reacted to the " + res.allergy.type + " magic! Half pay."
    : zone === "yellow" ? c.name + " got their wish, but a little " + res.allergy.type + " magic left them itchy."
    : res.qualityTip > 0 ? c.name + " loves it — that potion was practically perfect!" : res.quickTip > 0 ? c.name + " is thrilled with the speedy service!" : c.name + " is happy with their wish!";
  const rushLine = (win && res.rushBonus > 0)
    ? `<div class="stat-line"><span>⏱️ Beat the clock!</span><span class="gold">🪙 +${res.rushBonus}</span></div>` : "";
  const streakLine = (win && res.streakBonus > 0)
    ? `<div class="stat-line"><span>🔥 Win streak ×${res.streak}</span><span class="gold">🪙 +${res.streakBonus}</span></div>` : "";
  const earnedRow = win
    ? `<div class="stat-line"><span>Earned</span><span class="gold">🪙 ${res.gold}</span></div>${quickLine}${qualLine}${rushLine}${streakLine}`
    : `<div class="stat-line"><span>Earned</span><span class="muted">no coins — just trash!</span></div>
       <div class="stat-line"><span>🗑️ Trash thrown</span><span><b>${trashN}</b> piece${trashN === 1 ? "" : "s"}</span></div>
       <div class="stat-line"><span>🔥 Win streak</span><span class="muted">broken</span></div>`;
  html("result", `
    ${hud("Result")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${emoji}</div>
      <div class="result-title ${win ? "win" : "lose"} ${isPerfect ? "perfect" : ""}">${title}</div>
      ${win ? rewardBubblesMarkup(res) : (trashN ? trashInfoMarkup(res) : "")}
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Your Match</span><span><b>${res.weighted}%</b></span></div>
        <div class="stat-line"><span>Needed</span><span>${res.required}%</span></div>
        ${allergyLine}
        ${earnedRow}
      </div>
      <p class="muted" style="max-width:300px">${blurb}</p>
      ${roundRecap()}
    </div>
    <button class="btn" id="next-btn">Next Customer  →</button>
  `);
  on("#next-btn", "click", startRound);
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
function rewardBubblesMarkup(res) {
  const tips = Math.max(0, res.tip);
  return `<div class="reward-bubbles" id="reward-bubbles">
    <div class="rb-total">Collected <span class="gold">🪙 <b id="rb-count">0</b></span></div>
    <div class="rb-hint muted" id="rb-hint">${tips > 0 ? "Catch the floating coins to collect them! 🫧" : "Pop your reward bubble! 🫧"}</div>
  </div>`;
}
function wireRewardBubbles(res) {
  const sc = screen("result"); if (!sc) return;
  const countEl = document.querySelector("#screen-result #rb-count");
  const hintEl = document.querySelector("#screen-result #rb-hint");
  const base = Math.max(0, res.gold - res.tip), tips = Math.max(0, res.tip);
  const layer = document.createElement("div"); layer.className = "rb-float-layer";
  sc.appendChild(layer);
  let collected = 0, littleStep = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const bump = amt => {
    collected += amt;
    if (countEl) { countEl.textContent = collected; countEl.classList.remove("bumped"); void countEl.offsetWidth; countEl.classList.add("bumped"); }
  };
  // build one drifting bubble; the wrap wanders (translate), the button pops (scale)
  const makeBubble = (cls, amt, big) => {
    const wrap = document.createElement("div"); wrap.className = "rbub-wrap";
    wrap.style.left = rnd(6, big ? 58 : 78) + "%";
    wrap.style.top = rnd(14, 72) + "%";
    for (let k = 1; k <= 3; k++) { wrap.style.setProperty("--dx" + k, rnd(-46, 46).toFixed(0) + "px"); wrap.style.setProperty("--dy" + k, rnd(-46, 46).toFixed(0) + "px"); }
    wrap.style.animationDuration = rnd(5, 9).toFixed(2) + "s";
    wrap.style.animationDelay = "-" + rnd(0, 5).toFixed(2) + "s"; // desync so they don't move in lockstep
    const btn = document.createElement("button");
    btn.className = "rbub " + cls; btn.dataset.amt = amt; if (big) btn.dataset.big = "1";
    btn.setAttribute("aria-label", big ? "gold reward" : "tip coin");
    btn.innerHTML = big ? `<span class="rb-amt">🪙 ${amt}</span>` : "🪙";
    wrap.appendChild(btn); layer.appendChild(wrap);
    return btn;
  };
  const popBub = btn => {
    if (!btn || btn.classList.contains("popped")) return;
    btn.classList.add("popped");
    const amt = +btn.dataset.amt || 0, big = btn.dataset.big;
    const r = btn.getBoundingClientRect();
    resultBurst(r.left + r.width / 2, r.top + r.height / 2, big ? "gold" : "coin");
    bump(amt);
    if (big) SFX.bigCoin(); else SFX.coin(littleStep++);
    const wrap = btn.parentElement;
    setTimeout(() => { if (wrap) wrap.remove(); }, 240);
    checkDone();
  };
  const checkDone = () => setTimeout(() => {
    if (!layer.querySelector(".rbub:not(.popped)") && hintEl) hintEl.textContent = `All collected! 🪙 ${res.gold}`;
  }, 260);
  const bigBtn = makeBubble("big", base, true);
  const littleBtns = [];
  for (let i = 0; i < tips; i++) littleBtns.push(makeBubble("little", 1, false));
  bigBtn.addEventListener("click", () => {
    SFX.unlock(); popBub(bigBtn);
    // popping the big bubble first cascades all remaining tip bubbles
    [...layer.querySelectorAll(".rbub.little:not(.popped)")].forEach((b, i) => setTimeout(() => popBub(b), 90 * (i + 1)));
  });
  littleBtns.forEach(b => b.addEventListener("click", () => { SFX.unlock(); popBub(b); }));
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
  const parts = flavor === "gold" ? POP_FLAVOR.gold.parts : POP_FLAVOR.bubble.parts;
  const n = flavor === "gold" ? 16 : 9;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"); p.className = "particle";
    const ang = (Math.PI * 2 * i) / n + (i % 2) * 0.4, dist = flavor === "gold" ? 46 + (i % 4) * 16 : 30 + (i % 3) * 12;
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", (Math.sin(ang) * dist - 8) + "px");
    p.style.background = parts[i % parts.length];
    p.style.width = p.style.height = (flavor === "gold" ? 7 : 5) + (i % 3) * 3 + "px";
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
  const active = phase === "mix" && GAME.unlocked.undo;
  return `<div class="familiar" id="familiar">${equippedFamiliarChip()}${active ? `<span class="fam-badge">🐾</span>` : ""}</div>`;
}
function wireFamiliar(phase) {
  const el = document.querySelector("#screen-" + phase + " #familiar"); if (!el) return;
  el.addEventListener("click", () => {
    if (phase === "mix") { if (GAME.unlocked.undo) familiarUndo(); else toast("🐾 Unlock 'Undo' in Shop & Upgrades!"); }
    else if (phase === "scoop") toast(GAME.unlocked.scoop ? "🐾 Better Scoop is boosting your haul!" : "🐾 Unlock 'Better Scoop' in Shop & Upgrades!");
    else toast(GAME.unlocked.charm ? "🐾 Keen Nose — sniffing out extra charms & ingredients!" : "🐾 Unlock 'Keen Nose' in Shop & Upgrades!");
  });
}
function familiarUndo() {
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
  window.__wp = { get ROUND() { return ROUND; }, set ROUND(v) { ROUND = v; }, get GAME() { return GAME; }, save, popAt, spawnBonusBubbles, charmCelebrate, refreshPop, collectAndContinue, paintMix, paintMixTop, playCharm, addToSlot, renderResult, rollWellPrize, renderRecycle, renderMenu, renderQuests, refreshQuests, bumpStat, serve, rushExpire, renderFairyIntro, renderFairy, maybeFairyEvent };
}
// one delegated handler covers the HUD menu button on every screen (no per-render wiring)
document.addEventListener("click", e => { if (e.target.closest && e.target.closest(".hud-menu")) goHome(); });
window.addEventListener("load", () => { applyCustomBackground(); refreshQuests(); renderStart(); });

})();
