/* ==========================================================================
 * Wish Pop: Bubble Shop — UI / SCREEN FLOW (v3 Cauldron-First)
 * Start -> Customer -> Scoop -> Pop (draft a hand) -> Cauldron -> Result
 * ======================================================================== */
(function () {
"use strict";

const { R, newRound, applyTripleMatch, scoreMix, scoreResult, BALANCE } = ENGINE;
const D = DATA;
const BUILD = "v14"; // bump on each deploy; shown on the start screen to verify the live version

/* --- persistent save ---------------------------------------------------- */
const SAVE_KEY = "wishpop_save_v1";
const GAME = loadGame();
function loadGame() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.gold === "number") return s; } catch (e) {}
  return { gold: BALANCE.START_GOLD, treats: 3, unlocked: {} };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(GAME)); } catch (e) {} }

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
function hud(title) {
  return `<div class="hud"><span>🐸 <span class="treatcount">${GAME.treats}</span> treats</span>
    <span class="title">${title}</span><span class="gold">🪙 ${GAME.gold}</span></div>`;
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
    ${hud("Bubble Shop")}
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
        <div style="font-weight:800;margin-bottom:8px">Toad Upgrades</div>
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
/* CUSTOMER                                                                */
/* ======================================================================= */
function startRound() {
  SFX.unlock();
  ROUND = newRound({ servedTotal, betterScoop: !!GAME.unlocked.scoop, charmFinder: !!GAME.unlocked.charm });
  renderCustomer();
}
function renderCustomer() {
  const c = ROUND.customer, w = ROUND.wish;
  const needChips = w.needs.map(n => n.revealed
    ? `<div class="need-chip">${magicDot(n.type)} ${n.type}</div>`
    : `<div class="need-chip hidden-need">❔ ${n.label}</div>`).join("");
  html("customer", `
    ${hud(c.location)}
    <div class="grow center" style="gap:16px">
      <div class="ph big">${c.emoji}</div>
      <div style="font-weight:800;font-size:20px">${c.name}</div>
      <div class="speech">“${c.line}”</div>
      <div class="needs-row">${needChips}</div>
      <div class="card" style="width:100%;max-width:340px">
        <div class="stat-line"><span>Payment</span><span class="gold">🪙 ${ROUND.payment}</span></div>
        <div class="stat-line"><span>Required Match</span><span>${w.requiredMatch}%</span></div>
        <div class="stat-line"><span>Scoops of glitter</span><span>${ROUND.scoops}</span></div>
        <div class="stat-line"><span>Allergy</span><span>${w.allergy ? `<span style="color:var(--bad)">⚠️ ${magicDot(w.allergy)} ${w.allergy}</span>` : "None"}</span></div>
      </div>
    </div>
    <button class="btn" id="scoop-btn">Start Scoop  ✨</button>
  `);
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

  html("scoop", `
    ${hud("Scoop Phase")}
    <button class="mute-btn" id="mute-btn" title="Sound on/off">${SFX.isMuted() ? "🔇" : "🔊"}</button>
    <div class="scoop-sub muted" id="scoop-step">Scoop 1 of ${scoops}</div>
    <div class="scoop-instr" id="scoop-text">✋ Swipe side to side to shake off the glitter!</div>
    <div class="scoop-stage" id="scoop-stage">
      <div class="scoop-craft" id="scoop-craft">
        <div class="scoop-bubbles" id="scoop-bubbles"></div>
        <div class="scoop-bowl">🥄</div>
        <div class="glitter-cover" id="glitter-cover"></div>
      </div>
      <div class="glitter-pile"></div>
    </div>
    <div class="scoop-result muted" id="scoop-result"></div>
    <div class="row">
      <button class="btn secondary" id="auto-sift">✨ Shake for me</button>
      <button class="btn" id="scoop-continue" disabled>Continue</button>
    </div>
    ${familiarToken("scoop")}
  `);

  function loadScoop() {
    const found = split[idx];
    const bubs = $("#scoop-bubbles"); if (bubs) { bubs.innerHTML = "";
      for (let i = 0; i < found; i++) { const s = document.createElement("span"); s.className = "sbub"; s.textContent = "🫧"; bubs.appendChild(s); } }
    const cover = $("#glitter-cover"); if (cover) {
      cover.innerHTML = '<div class="glitter-film" id="glitter-film"></div>'; // opaque cover that hides the bubbles
      for (let i = 0; i < GLITTER; i++) { const g = document.createElement("i"); g.className = "gspeck";
        g.style.left = rnd(2, 92) + "%"; g.style.top = rnd(4, 88) + "%";
        g.style.setProperty("--sz", (8 + rnd(0, 6)) + "px");
        g.style.setProperty("--tw", (0.6 + Math.random() * 1.2).toFixed(2) + "s");
        g.style.animationDelay = (-Math.random() * 1.2).toFixed(2) + "s"; cover.appendChild(g); } }
    state = "shaking"; shakeDist = 0;
    const st = $("#scoop-step"); if (st) st.textContent = `Scoop ${idx + 1} of ${scoops}`;
    const tx = $("#scoop-text"); if (tx) tx.innerHTML = "✋ Swipe side to side to shake off the glitter!";
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
    const found = split[idx]; revealed += found;
    const film = $("#glitter-film"); if (film) film.style.opacity = "0";
    const tx = $("#scoop-text"); if (tx) tx.innerHTML = `✨ <b>${found}</b> bubble${found === 1 ? "" : "s"}!`;
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
    const a = $("#auto-sift"); if (a) a.disabled = true;
    if (autoIv) { clearInterval(autoIv); autoIv = null; }
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
    SFX.unlock(); const a = $("#auto-sift"); if (a) a.disabled = true;
    if (autoIv) return;
    autoIv = setInterval(() => {
      if (state === "done") { clearInterval(autoIv); autoIv = null; return; }
      if (state === "shaking") shakeTick(0.7);
    }, 150);
  });
  on("#scoop-continue", "click", () => { if (autoIv) clearInterval(autoIv); renderPop(); });
  on("#mute-btn", "click", () => { const m = SFX.toggle(); const b = $("#mute-btn"); if (b) b.textContent = m ? "🔇" : "🔊"; });

  loadScoop();
  wireFamiliar("scoop");
  show("scoop");
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
let popCombo = 0, lastPopAt = 0, cascadeOn = false;

// one floating bubble button, with a randomized wander path so each drifts differently.
// Original bubbles all look the same (their contents are a surprise). Only the extra
// bubbles that a bonus SPAWNS are golden — pass golden=true for those.
function bubbleHTML(i, golden) {
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
  const dur = (5.5 + Math.random() * 3).toFixed(1), del = (Math.random() * 4).toFixed(1);
  const cls = golden ? "pbubble bonus" : "pbubble";
  return `<button class="${cls}" data-i="${i}" style="--dur:${dur}s;--del:-${del}s;` +
    `--ax:${rnd(-46, 46)}px;--ay:${rnd(-34, 34)}px;--bx:${rnd(-46, 46)}px;--by:${rnd(-30, 34)}px;` +
    `--cx:${rnd(-40, 40)}px;--cy:${rnd(-30, 30)}px"><span class="sheen"></span>🫧</button>`;
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
  document.querySelectorAll("#bubble-field .pbubble").forEach(el =>
    el.addEventListener("click", () => popAt(+el.dataset.i, el)));
  on("#pop-all", "click", popCascade);
  on("#pop-continue", "click", collectAndContinue);
  on("#mute-btn", "click", () => { const m = SFX.toggle(); const b = $("#mute-btn"); if (b) b.textContent = m ? "🔇" : "🔊"; });
  wireFamiliar("pop");
  show("pop");
}

function itemInfo(item) {
  if (item.kind === "ingredient") { const ing = D.INGREDIENT_BY_ID[item.id]; return { emoji: ing.emoji, label: ing.name, kind: "ingredient" }; }
  if (item.kind === "charm") { const ch = CHARM(item.id); return { emoji: ch.emoji, label: ch.name + " charm!", kind: "charm" }; }
  if (item.kind === "gold") return { emoji: "🪙", label: "+" + item.amt + " gold", kind: "gold" };
  if (item.kind === "bubble") return { emoji: "🫧", label: "Bonus bubbles!", kind: "bubble" };
  return { emoji: "🐸", label: "+1 treat", kind: "treat" };
}

function popAt(i, el, fromCascade) {
  if (!el || el.classList.contains("popped")) return;
  SFX.unlock();
  const item = ROUND.haul[i];
  // charms are NOT collected here — they pop out and float; you catch them.
  if (item.kind === "ingredient") ROUND.inventory.push({ id: item.id, potent: false });
  else if (item.kind === "gold") { GAME.gold += item.amt; save(); }
  else if (item.kind === "treat") { GAME.treats += 1; save(); }
  ROUND.popIndex++;

  const info = itemInfo(item), flavor = POP_FLAVOR[info.kind];
  const now = Date.now();
  popCombo = (now - lastPopAt < 700) ? popCombo + 1 : 0; lastPopAt = now;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;

  if (item.kind === "charm") {
    SFX.pop(popCombo); SFX.reveal("ingredient", popCombo); // soft glint on reveal
    spawnFloatingCharm(item.id, cx, cy);                    // real fanfare happens on catch
  } else if (item.kind === "bubble") {
    SFX.pop(popCombo); SFX.bonus(); flashScreen();
    ringAt(cx, cy); burstAt(cx, cy, flavor); burstAt(cx, cy, flavor); // extra-big burst
    floatReward(cx, cy, info, true);
    el.classList.add("big"); // trigger bubble pops bigger even though it looks normal
  } else {
    SFX.pop(popCombo); SFX.reveal(info.kind, popCombo);
    burstAt(cx, cy, flavor); floatReward(cx, cy, info, flavor.rare);
  }
  if (navigator.vibrate) navigator.vibrate(flavor.rare ? [10, 22, 14] : 12);

  el.classList.add("popped");
  if (item.kind === "bubble") spawnBonusBubbles(cx, cy);
  if (!fromCascade) refreshPop();
}

// A bonus bubble bursts into more bubbles that fly out into the field.
function spawnBonusBubbles(cx, cy) {
  const field = $("#bubble-field"); if (!field) return;
  const n = R.int(BALANCE.BONUS_SPAWN_MIN, BALANCE.BONUS_SPAWN_MAX);
  const items = ENGINE.bonusBubbleItems(ROUND.wish, n);
  items.forEach((it, k) => {
    const idx = ROUND.haul.length; ROUND.haul.push(it);
    const holder = document.createElement("div"); holder.innerHTML = bubbleHTML(idx, true);
    const nb = holder.firstElementChild; nb.classList.add("spawning");
    nb.addEventListener("click", () => popAt(+nb.dataset.i, nb));
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
  tok.innerHTML = `${CHARM(id).emoji}<span class="lbl">tap to catch!</span>`;
  tok.addEventListener("click", () => collectCharm(id, tok));
  layer.appendChild(tok);
}
function collectCharm(id, tok) {
  if (!tok || tok.classList.contains("caught")) return;
  SFX.unlock(); SFX.charm();
  ROUND.charms.push(id);
  const r = tok.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  charmCelebrate(CHARM(id).emoji); flashScreen();
  burstAt(cx, cy, POP_FLAVOR.charm);
  floatReward(cx, cy, { emoji: CHARM(id).emoji, label: CHARM(id).name + " charm!" }, true);
  if (navigator.vibrate) navigator.vibrate([10, 22, 14]);
  tok.classList.add("caught"); setTimeout(() => tok.remove(), 320);
  refreshPop();
}
// safety net: sweep up any charm still floating when you move on
function collectAndContinue() {
  document.querySelectorAll("#catch-layer .charm-token").forEach(tok => {
    if (!tok.classList.contains("caught")) { ROUND.charms.push(tok.dataset.charm); tok.remove(); }
  });
  renderMix();
}
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
    if (!el) { cascadeOn = false; refreshPop(); return; }
    popAt(+el.dataset.i, el, true);
    refreshPop();
    setTimeout(step, 135); // rhythmic cascade, not an instant skip
  };
  step();
}

// --- juice: particle burst, floating reward label, screen flash ---------
function burstAt(x, y, flavor) {
  const layer = $("#burst-layer"); if (!layer) return;
  const n = 8 + flavor.rare * 5;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"); p.className = "particle";
    const ang = (Math.PI * 2 * i) / n + (i % 2) * 0.4, dist = 34 + (i % 4) * 16 + flavor.rare * 14;
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", (Math.sin(ang) * dist - 10) + "px");
    p.style.background = flavor.parts[i % flavor.parts.length];
    p.style.width = p.style.height = (5 + (i % 3) * 3) + "px";
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
  const merged = applyTripleMatch(ROUND.inventory); ROUND.inventory = merged.inventory;
  ROUND.slots = []; ROUND.mixStart = Date.now();
  ROUND.potentNext = false; ROUND.allergyOffset = 0; ROUND.insight = false;
  paintMix(); show("mix");
  if (ROUND._mixTimer) clearInterval(ROUND._mixTimer);
  ROUND._mixTimer = setInterval(paintMixTop, 500);
  if (merged.merged.length) showTriple(merged.merged, () => {});
}
function paintMixTop() {
  const el = $("#mix-top"); if (!el) return;
  const w = ROUND.wish;
  const score = scoreMix(ROUND.slots, w, ROUND.allergyOffset);
  // DISCOVERY: a mystery need reveals when you play an ingredient whose MAIN
  // quality (or a Wild charm's magic) is that need. No timers.
  w.needs.forEach(n => {
    if (n.revealed) return;
    const found = ROUND.slots.some(inst => inst.wild ? inst.magic === n.type : D.INGREDIENT_BY_ID[inst.id].qualities[0] === n.type);
    if (found) n.revealed = true;
  });
  const req = w.requiredMatch, meets = score.weighted >= req;
  const MAX = BALANCE.BAR_MAX;
  const meters = w.needs.map((n, i) => {
    const s = score.perNeed[i];
    const fillPct = Math.min(100, s.points / MAX * 100);
    if (!n.revealed) {
      return `<div class="need-meter"><div class="lbl"><span class="muted">❔ Mystery Need</span><span class="muted">?</span></div>
        <div class="meter sweet"><i style="width:${fillPct}%;background:rgba(255,255,255,0.28)"></i></div></div>`;
    }
    const inBand = s.pct === 100, over = s.points > s.bandHigh;
    const fillCol = inBand ? "var(--good)" : over ? "var(--bad)" : D.MAGIC[n.type];
    const status = inBand ? "✓ in the green!" : over ? "overfilled!" : s.pct + "%";
    const statusCol = inBand ? "var(--good)" : over ? "var(--bad)" : "var(--ink-dim)";
    const bandLeft = Math.max(0, s.bandLow / MAX * 100), bandW = Math.max(2, (s.bandHigh - s.bandLow) / MAX * 100);
    return `<div class="need-meter"><div class="lbl"><span>${magicDot(n.type)} ${n.type}</span>
      <span style="color:${statusCol};font-weight:800">${status}</span></div>
      <div class="meter sweet ${inBand ? "hit" : ""}"><span class="band" style="left:${bandLeft}%;width:${bandW}%"></span><i style="width:${fillPct}%;background:${fillCol}"></i></div></div>`;
  }).join("");
  const hidden = w.needs.filter(n => !n.revealed).length;
  const tip = hidden * BALANCE.QUICK_TIP_PER_HIDDEN;
  const tipLine = hidden > 0
    ? `<div class="mix-hint" style="color:var(--gold)">⚡ Serve now → <b>+${tip} tip</b> if it works! (${hidden} need${hidden > 1 ? "s" : ""} still secret)</div>`
    : `<div class="mix-hint muted">Land each bar in its <b style="color:var(--good)">green zone</b> — don't overfill! The zones shrink as you add.</div>`;
  el.innerHTML = `
    <div class="stat-line" style="padding:0 0 4px"><span>${ROUND.customer.emoji} ${ROUND.customer.name}</span>
      <span>Match <b style="color:${meets ? "var(--good)" : "var(--ink)"}">${score.weighted}%</b> / need ${req}%</span></div>
    ${meters}
    ${score.allergy ? allergyMeter(score.allergy) : ""}
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
    const face = inst ? (inst.wild ? "🌈" : D.INGREDIENT_BY_ID[inst.id].emoji) : "";
    slotCells.push(`<div class="slot ${inst ? "filled" : ""} ${inst && inst.potent ? "potent" : ""}">${face}</div>`);
  }
  const tray = ROUND.charms.length
    ? `<div class="charm-tray">${ROUND.charms.map((c, i) => `<button class="charm-chip" data-charm="${i}" title="${CHARM(c).desc}">${CHARM(c).emoji} <span>${CHARM(c).name}</span></button>`).join("")}</div>`
    : "";
  html("mix", `
    ${hud("Cauldron")}
    <div class="card" id="mix-top" style="margin-bottom:6px;padding:12px"></div>
    <div class="cauldron-wrap grow">
      <div class="cauldron" id="cauldron">
        <div class="liquid" style="height:${Math.max(6, score.weighted)}%;background:linear-gradient(180deg, ${liquid}, ${shade(liquid)})"></div>
        <div class="bub b1"></div><div class="bub b2"></div><div class="bub b3"></div>
        <div class="pct">${score.weighted}%</div>
      </div>
      <div class="slots">${slotCells.join("")}</div>
      ${tray}
    </div>
    <button class="btn good" id="serve-btn" ${ROUND.slots.length === 0 ? "disabled" : ""}>✨ Serve the Wish</button>
    ${ROUND.inventory.length
      ? `<div class="inv-2row" id="inv-row">${ROUND.inventory.map((inst, idx) => invTile(inst, idx)).join("")}</div>`
      : `<div class="muted" style="text-align:center;padding:12px">Bag empty — serve what's in the pot!</div>`}
    ${familiarToken("mix")}
  `);
  paintMixTop();
  ROUND.inventory.forEach((inst, idx) => { const t = document.getElementById("invt-" + idx); if (t) t.addEventListener("click", () => addToSlot(idx, t)); });
  ROUND.charms.forEach((c, i) => { const b = document.querySelector(`[data-charm="${i}"]`); if (b) b.addEventListener("click", () => playCharm(i)); });
  on("#serve-btn", "click", serve);
  wireFamiliar("mix");
}
function invTile(inst, idx) {
  const ing = D.INGREDIENT_BY_ID[inst.id];
  const quals = ROUND.insight ? ing.qualities.map(q => magicDot(q)).join("") + " " + ing.qualities.join(", ") : magicDot(ing.qualities[0]) + " " + ing.qualities[0];
  return `<div class="inv-tile ${inst.potent ? "potent" : ""}" id="invt-${idx}">
    <div class="emoji">${ing.emoji}</div><div class="nm">${inst.potent ? "✨" : ""}${ing.name}</div><div class="q">${quals}</div></div>`;
}
function allergyMeter(a) {
  const pct = Math.min(100, Math.round(a.points / BALANCE.ALLERGY_RED_AT * 100));
  const col = a.zone === "red" ? "var(--bad)" : a.zone === "yellow" ? "var(--gold)" : "var(--good)";
  return `<div class="need-meter" style="margin-top:8px"><div class="lbl"><span>⚠️ Allergy: ${magicDot(a.type)} ${a.type}</span>
    <span style="color:${col};font-weight:800">${a.zone.toUpperCase()}</span></div>
    <div class="meter" style="background:rgba(255,90,90,0.12)"><i style="width:${pct}%;background:${col}"></i></div></div>`;
}
function addToSlot(idx, fromEl) {
  if (ROUND.slots.length >= ROUND.maxSlots) { toast("The cauldron is full!"); return; }
  const inst = ROUND.inventory.splice(idx, 1)[0];
  if (ROUND.potentNext) { inst.potent = true; ROUND.potentNext = false; toast("✨ Potent!"); }
  const cauldron = document.getElementById("cauldron");
  if (fromEl && cauldron) flyEmoji(fromEl.getBoundingClientRect(), cauldron.getBoundingClientRect(), D.INGREDIENT_BY_ID[inst.id].emoji);
  ROUND.slots.push(inst);
  paintMix();
  const c2 = document.getElementById("cauldron"); if (c2) { c2.classList.remove("splash"); void c2.offsetWidth; c2.classList.add("splash"); }
}
function playCharm(i) {
  const id = ROUND.charms[i]; if (!id) return; const w = ROUND.wish;
  const consume = () => { ROUND.charms.splice(i, 1); paintMix(); };
  if (id === "cleanse") { if (!w.allergy) { toast("No allergy to cleanse!"); return; } ROUND.allergyOffset += BALANCE.ALLERGY_CLEANSE; toast("🧹 Allergy calmed."); consume(); }
  else if (id === "insight") { if (ROUND.insight) { toast("Hidden magic already revealed."); return; } ROUND.insight = true; toast("🔍 Hidden magic revealed!"); consume(); }
  else if (id === "potent") { if (ROUND.potentNext) { toast("Potent is already primed."); return; } ROUND.potentNext = true; toast("✨ Your next ingredient counts double!"); consume(); }
  else if (id === "peek") { const n = w.needs.find(x => !x.revealed); if (!n) { toast("All needs already revealed."); return; } n.revealed = true; toast(`⏭️ Revealed: ${n.type}!`); consume(); }
  else if (id === "wild") { if (ROUND.slots.length >= ROUND.maxSlots) { toast("The cauldron is full!"); return; } const magic = R.pick(w.needs.map(x => x.type)); ROUND.slots.push({ wild: true, magic, strength: BALANCE.WILD_STRENGTH }); toast(`🌈 Wild ${magic} magic added!`); consume(); }
}

/* ======================================================================= */
/* RESULT                                                                  */
/* ======================================================================= */
function serve() {
  if (ROUND.slots.length === 0) return;
  if (ROUND._mixTimer) { clearInterval(ROUND._mixTimer); ROUND._mixTimer = null; }
  const res = scoreResult(ROUND);
  GAME.gold += res.gold;
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
  const emoji = !win ? "🙂" : zone === "red" ? "🤧" : zone === "yellow" ? "😅" : (res.tip > 0 ? "🤩" : "😊");
  const title = win ? res.type.title : "So Close!";
  const blurb = !win
    ? c.name + " couldn't get the full wish, but liked the effort and left you a few coins."
    : zone === "red" ? "The wish worked… but " + c.name + " reacted to the " + res.allergy.type + " magic! Half pay."
    : zone === "yellow" ? c.name + " got their wish, but a little " + res.allergy.type + " magic left them itchy."
    : res.qualityTip > 0 ? c.name + " loves it — that potion was practically perfect!" : res.quickTip > 0 ? c.name + " is thrilled with the speedy service!" : c.name + " is happy with their wish!";
  html("result", `
    ${hud("Result")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${emoji}</div>
      <div class="result-title ${win ? "win" : "lose"}">${title}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Your Match</span><span><b>${res.weighted}%</b></span></div>
        <div class="stat-line"><span>Needed</span><span>${res.required}%</span></div>
        ${allergyLine}
        <div class="stat-line"><span>${win ? "Earned" : "Coins for trying"}</span><span class="gold">🪙 ${res.gold}</span></div>
        ${quickLine}${qualLine}
      </div>
      <p class="muted" style="max-width:300px">${blurb}</p>
    </div>
    <button class="btn" id="next-btn">Next Customer  →</button>
  `);
  on("#next-btn", "click", startRound);
  show("result");
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
  return `<div class="familiar" id="familiar">${D.FAMILIAR.emoji}${active ? `<span class="fam-badge">🐸</span>` : ""}</div>`;
}
function wireFamiliar(phase) {
  const el = document.querySelector("#screen-" + phase + " #familiar"); if (!el) return;
  el.addEventListener("click", () => {
    if (phase === "mix") { if (GAME.unlocked.undo) familiarUndo(); else toast("🐸 Unlock 'Undo' in Shop & Upgrades!"); }
    else if (phase === "scoop") toast(GAME.unlocked.scoop ? "🐸 Better Scoop is boosting your haul!" : "🐸 Unlock 'Better Scoop' in Shop & Upgrades!");
    else toast(GAME.unlocked.charm ? "🐸 Charm Finder is helping you pop charms!" : "🐸 The Toad has upgrades in Shop & Upgrades!");
  });
}
function familiarUndo() {
  if (!ROUND.slots.length) { toast("Nothing to undo."); return; }
  if (GAME.treats <= 0) { toast("No treats left! Buy more with gold."); return; }
  if (ROUND.treatsUsed >= BALANCE.MAX_TREATS_PER_ROUND) { toast("Toad's had enough (5 per round)."); return; }
  confirmDialog("Undo the last ingredient? (1 treat) 🐸", () => {
    GAME.treats--; ROUND.treatsUsed++; save();
    ROUND.slots.pop();
    toast("🐸 Removed the last ingredient.");
    paintMix();
  });
}

/* boot */
// test-only hook (enabled with localStorage wishpop_test=1) for automated checks
if (localStorage.getItem("wishpop_test") === "1") {
  window.__wp = { get ROUND() { return ROUND; }, popAt, spawnBonusBubbles, charmCelebrate };
}
window.addEventListener("load", renderStart);

})();
