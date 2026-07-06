/* ==========================================================================
 * Wish Pop: Bubble Shop — UI / SCREEN FLOW (Phase 1)
 * Start -> Customer -> Scoop -> Pop -> Shop -> Mix -> Result -> (next)
 * Scoop/Pop/Shop are intentionally minimal placeholders in Phase 1; the loop
 * runs end-to-end and the Result is scored for real by the engine.
 * ======================================================================== */
(function () {
"use strict";

const { R, newRound, applyTripleMatch, scoreMix, scoreResult, BALANCE } = ENGINE;
const D = DATA;

/* --- persistent save ---------------------------------------------------- */
const SAVE_KEY = "wishpop_save_v1";
const GAME = loadGame();
function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.gold === "number") return s;
  } catch (e) {}
  return { gold: BALANCE.START_GOLD, treats: 3, unlocked: {} };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(GAME)); } catch (e) {} }

let ROUND = null;
let servedTotal = +(localStorage.getItem("wishpop_served") || 0);

/* --- tiny DOM helpers --------------------------------------------------- */
const $ = sel => document.querySelector(sel);
function screen(id) { return document.getElementById("screen-" + id); }
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen(id).classList.add("active");
}
function html(id, markup) { screen(id).innerHTML = markup; }
function on(sel, ev, fn) { const e = $(sel); if (e) e.addEventListener(ev, fn); }
let toastT = null;
function toast(msg) {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; $("#app").appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1600);
}
function magicDot(type) { return `<span class="dot" style="background:${D.MAGIC[type]}"></span>`; }
function shade(hex, amt) {
  amt = amt == null ? -0.28 : amt;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  r = Math.max(0, Math.min(255, Math.round(r + 255 * amt)));
  g = Math.max(0, Math.min(255, Math.round(g + 255 * amt)));
  b = Math.max(0, Math.min(255, Math.round(b + 255 * amt)));
  return `rgb(${r},${g},${b})`;
}
function hud(title) {
  return `<div class="hud"><span>🐸 <span class="treatcount">${GAME.treats}</span> treats</span>
    <span class="title">${title}</span>
    <span class="gold">🪙 ${GAME.gold}</span></div>`;
}
function syncHud(id) {
  const g = document.querySelector("#screen-" + id + " .hud .gold");
  if (g) g.textContent = "🪙 " + GAME.gold;
  const t = document.querySelector("#screen-" + id + " .hud .treatcount");
  if (t) t.textContent = GAME.treats;
}
function charmsBar() {
  return `<div class="charms">${D.CHARM_TYPES.map(c =>
    `<span class="charm"><span class="swatch" style="background:${D.CHARMS[c]}"></span>${ROUND.charms[c]}</span>`).join("")}</div>`;
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
      <p class="muted" style="max-width:300px">Fairytale folk arrive with a wish. Scoop bubbles, pop them for charms, shop for ingredients, and mix the perfect result!</p>
      <div class="bubble-emojis" style="font-size:26px">🍪 🧁 🐭 🦉 🐺</div>
    </div>
    <button class="btn" id="play-btn">▶  Play</button>
    <div style="height:8px"></div>
    <button class="btn secondary small" id="admin-btn" style="align-self:center">⚙️ Admin (art upload — coming soon)</button>
  `);
  on("#play-btn", "click", startRound);
  on("#admin-btn", "click", () => toast("Art uploader arrives in a later phase."));
  show("start");
}

/* ======================================================================= */
/* CUSTOMER                                                                */
/* ======================================================================= */
function startRound() {
  ROUND = newRound({ servedTotal });
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
        <div class="stat-line"><span>Scoops of glitter</span><span>${Math.max(1, Math.round(ROUND.payment/10))}</span></div>
        <div class="stat-line"><span>Allergy</span><span>${w.allergy || "None"}</span></div>
      </div>
    </div>
    <button class="btn" id="scoop-btn">Start Scoop  ✨</button>
  `);
  on("#scoop-btn", "click", renderScoop);
  show("customer");
}

/* ======================================================================= */
/* SCOOP  (Phase 2: sift each scoop of glitter to reveal Wish Bubbles)      */
/* ======================================================================= */
function renderScoop() {
  const scoops = ROUND.scoops;
  const split = ROUND.scoopYields;   // each scoop's own randomized yield
  let idx = 0, revealed = 0;

  html("scoop", `
    ${hud("Scoop Phase")}
    <div class="grow center" style="gap:16px">
      <div id="scoop-token" class="ph big" style="position:relative">
        <span id="scoop-face">🥄</span>
        <span id="glitter" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px">✨✨</span>
      </div>
      <div id="scoop-step" class="muted">Scoop 1 of ${scoops}</div>
      <div id="scoop-text" style="font-size:20px;font-weight:800;min-height:26px">Tap to sift the glitter!</div>
      <div id="scoop-result" class="muted"></div>
    </div>
    <div class="row">
      <button class="btn secondary" id="auto-sift">Auto Sift</button>
      <button class="btn" id="scoop-continue" disabled>Continue</button>
    </div>
    ${familiarToken()}
  `);

  function siftOne() {
    if (idx >= scoops) return;
    const found = split[idx];
    revealed += found;
    idx++;
    const g = $("#glitter"); if (g) { g.textContent = "🫧"; g.style.transition = "opacity .3s"; g.style.opacity = "0"; }
    const face = $("#scoop-face"); if (face) face.textContent = "🫧";
    $("#scoop-text").innerHTML = `🫧 <b>${found}</b> found!`;
    $("#scoop-result").textContent = `${revealed} bubble${revealed === 1 ? "" : "s"} so far`;
    if (idx < scoops) {
      $("#scoop-step").textContent = `Scoop ${idx + 1} of ${scoops}`;
      setTimeout(() => {
        const g2 = $("#glitter"); if (g2) { g2.textContent = "✨✨"; g2.style.opacity = "1"; }
        const f2 = $("#scoop-face"); if (f2) f2.textContent = "🥄";
        const t = $("#scoop-text"); if (t) t.textContent = "Tap to sift the glitter!";
      }, 350);
    } else {
      finish();
    }
  }
  function finish() {
    $("#scoop-step").textContent = "All scooped!";
    $("#scoop-text").innerHTML = `🫧 <b>${revealed}</b> Wish Bubbles found!`;
    ROUND.bubblesTotal = revealed;
    const c = $("#scoop-continue"); if (c) { c.disabled = false; }
    const a = $("#auto-sift"); if (a) a.disabled = true;
  }
  on("#scoop-token", "click", siftOne);
  on("#auto-sift", "click", () => { while (idx < scoops) siftOne(); });
  on("#scoop-continue", "click", renderPop);
  wireFamiliar("scoop");
  show("scoop");
}

/* ======================================================================= */
/* BUBBLE POP  (Phase 2: real rewards + question-mark reveals)             */
/* ======================================================================= */
const REWARD_LABEL = {
  ingredient: "Ingredient!", wild: "Wild Ingredient!", treat: "Treat!",
  gold: "Gold!", bubble: "Bonus Bubble!",
};
function renderPop() {
  ROUND.bubblesLeft = ROUND.bubblesTotal;
  ROUND.pending = null;   // an unrevealed "?" reward, or null
  html("pop", `
    ${hud("Pop Phase")}
    <div class="hud" style="background:none;padding:2px 4px">
      <div class="bubble-queue" id="queue"></div>
      <span class="muted" id="left-count"></span>
    </div>
    <div class="grow center" style="gap:16px">
      <div class="big-bubble" id="big-bubble">🫧</div>
      <div class="muted" id="pop-hint">Tap the bubble to pop it and collect charms!</div>
      <div id="reward-flash" style="font-size:18px;font-weight:800;min-height:24px"></div>
      ${charmsBar()}
      <div id="unlocked-line" class="muted" style="font-size:13px"></div>
    </div>
    <div class="row">
      <button class="btn secondary" id="pop-all">Pop All</button>
      <button class="btn" id="pop-continue" disabled>Continue</button>
    </div>
    ${familiarToken()}
  `);
  renderQueue();
  on("#big-bubble", "click", onBubbleTap);
  on("#pop-all", "click", popAll);
  on("#pop-continue", "click", renderShop);
  wireFamiliar("pop");
  show("pop");
  refreshPop();
}

function onBubbleTap() {
  if (ROUND.pending) { revealPending(); return; }
  if (ROUND.bubblesLeft > 0) popOne();
}

function popOne() {
  if (ROUND.bubblesLeft <= 0 || ROUND.pending) return;
  ROUND.bubblesLeft--;
  const roll = ENGINE.rollPop(ROUND);
  // charms are always collected immediately
  Object.keys(roll.charms).forEach(c => { ROUND.charms[c] += roll.charms[c]; });
  flashReward("＋ charms");
  if (roll.key) grantKey();            // key unlocks a shelf (flashes its own message)
  if (roll.bonus) ROUND.pending = roll.bonus;   // becomes a "?" to reveal
  refreshPop();
}
function grantKey() {
  const locked = D.SHELF_ORDER.filter(s => !ROUND.unlocked.includes(s));
  if (locked.length) {
    const s = R.pick(locked);
    ROUND.unlocked.push(s);
    flashReward(`🔑 ${D.SHELVES[s].name} unlocked!`);
  } else {
    const c = R.pick(D.CHARM_TYPES); ROUND.charms[c] += 2;
    flashReward("🔑 → ＋2 charms");
  }
}

function revealPending() {
  const b = ROUND.pending; if (!b) return;
  ROUND.pending = null;
  let msg = "";
  if (b.type === "ingredient" || b.type === "wild") {
    ROUND.inventory.push({ id: b.ingId, potent: false });
    const ing = D.INGREDIENT_BY_ID[b.ingId];
    msg = `${ing.emoji} ${b.type === "wild" ? "Wild " : ""}${ing.name} → bag`;
  } else if (b.type === "treat") {
    GAME.treats += b.amount; save();
    msg = `🐸 +${b.amount} treat`;
  } else if (b.type === "gold") {
    GAME.gold += b.amount; save();
    msg = `🪙 +${b.amount} gold`;
  } else if (b.type === "bubble") {
    ROUND.bubblesLeft++; ROUND.bubblesTotal++; ROUND.bonusBubblesGained++;
    msg = `🫧 +1 bonus bubble!`;
  }
  flashReward(msg);
  refreshPop();
}

function popAll() {
  let guard = 200;
  while ((ROUND.bubblesLeft > 0 || ROUND.pending) && guard-- > 0) {
    if (ROUND.pending) revealPending();
    else popOne();
  }
  refreshPop();
}

function renderQueue() {
  const total = ROUND.bubblesTotal, left = ROUND.bubblesLeft;
  let q = "";
  for (let i = 0; i < total; i++) q += `<span class="b ${i >= total - left ? "" : "popped"}"></span>`;
  const el = $("#queue"); if (el) el.innerHTML = q;
  const lc = $("#left-count"); if (lc) lc.textContent = left + " left";
}
let flashT = null;
function flashReward(msg) {
  const el = $("#reward-flash"); if (!el) return;
  el.textContent = msg; el.style.opacity = "1";
  clearTimeout(flashT); flashT = setTimeout(() => { if (el) el.style.opacity = ".0"; el && (el.style.transition = "opacity .4s"); }, 900);
}
function refreshPop() {
  renderQueue();
  syncHud("pop");
  const cb = $(".charms"); if (cb) cb.outerHTML = charmsBar();
  const ul = $("#unlocked-line");
  if (ul) ul.innerHTML = "🔓 Shelves open: " + ROUND.unlocked.map(s => D.SHELVES[s].name.replace(" Shelf", "")).join(", ") +
    (ROUND.unlocked.length < 4 ? ` · <span style="opacity:.7">pop 🔑 keys to open more</span>` : "");
  const bb = $("#big-bubble"), hint = $("#pop-hint");
  if (ROUND.pending) {
    if (bb) { bb.textContent = "❓"; bb.style.opacity = "1"; }
    if (hint) hint.textContent = "Tap the ❓ to reveal your bonus!";
  } else if (ROUND.bubblesLeft > 0) {
    if (bb) { bb.textContent = "🫧"; bb.style.opacity = "1"; }
    if (hint) hint.textContent = "Tap the bubble to pop it and collect charms!";
  } else {
    if (bb) { bb.textContent = "✓"; bb.style.opacity = ".35"; }
    if (hint) hint.textContent = "All bubbles popped!";
  }
  const done = ROUND.bubblesLeft <= 0 && !ROUND.pending;
  const cont = $("#pop-continue"); if (cont) cont.disabled = !done;
  const pa = $("#pop-all"); if (pa) pa.disabled = done;
}

/* ======================================================================= */
/* SHOP  (Phase 3: real shelves, charm-spending, reveal timers)            */
/* ======================================================================= */
function renderShop() {
  if (ROUND._shopTimer) clearInterval(ROUND._shopTimer);
  ROUND.currentShelf = 0;              // index into the OPEN shelves only
  ROUND.bagOpen = false;
  ROUND.rerolled = ROUND.rerolled || {}; // one free reroll per shelf per round
  ROUND.shopStart = Date.now();
  paintShop();
  show("shop");
  ROUND._shopTimer = setInterval(paintReveal, 500);
}
function isUnlocked(shelf) { return ROUND.unlocked.includes(shelf); }
function openShelves() { return D.SHELF_ORDER.filter(isUnlocked); }
function shelfName() { const o = openShelves(); return o[Math.min(ROUND.currentShelf, o.length - 1)]; }

function paintShop() {
  const open = openShelves();
  const shelf = shelfName();
  const info = D.SHELVES[shelf];
  const multi = open.length > 1;
  const lockedCount = D.SHELF_ORDER.length - open.length;
  const cards = ROUND.shelves[shelf].map(id => shopCard(id)).join("") ||
    `<div class="muted" style="grid-column:1/-1;text-align:center;padding:20px">Sold out here — ${multi ? "swipe to another shelf." : "check your bag!"}</div>`;
  const dots = open.map((s, i) => `<span class="d ${i === ROUND.currentShelf ? "on" : ""}"></span>`).join("");
  const bagN = ROUND.inventory.length;
  html("shop", `
    ${hud("Shop Phase")}
    <div class="card reveal-panel" id="reveal-panel"></div>
    ${charmsBar()}
    <div class="shelf-bar">
      <div class="shelf-arrow" id="shelf-prev" style="${multi ? "" : "visibility:hidden"}">‹</div>
      <div class="shelf-title">${info.name}<small>${info.style}${lockedCount ? ` · 🔒 ${lockedCount} ${lockedCount > 1 ? "shelves" : "shelf"} stayed locked` : ""}</small></div>
      <div class="shelf-arrow" id="shelf-next" style="${multi ? "" : "visibility:hidden"}">›</div>
    </div>
    <div class="shelf-tools">
      ${multi ? `<div class="dots">${dots}</div>` : `<span></span>`}
      <button class="reroll-btn" id="reroll-btn" ${ROUND.rerolled[shelf] ? "disabled" : ""}>
        ${ROUND.rerolled[shelf] ? "↻ rerolled" : "↻ Reroll shelf"}</button>
    </div>
    <div class="ing-grid grow" id="shelf-grid">${cards}</div>
    ${ROUND.bagOpen ? `<div class="bag-drawer inv">${ROUND.inventory.map(inst => ingCardMini(inst)).join("") || '<div class="muted">Empty — buy or win ingredients.</div>'}</div>` : ""}
    <div class="row" style="margin-top:8px">
      <button class="bag-btn" id="bag-btn">🎒 Bag (${bagN})</button>
      <button class="btn" id="done-shop" style="flex:1">Done Shopping  →</button>
    </div>
    ${familiarToken("shop")}
  `);
  paintReveal();
  // shelf navigation
  on("#shelf-prev", "click", () => changeShelf(-1));
  on("#shelf-next", "click", () => changeShelf(1));
  on("#reroll-btn", "click", rerollCurrentShelf);
  on("#bag-btn", "click", () => { ROUND.bagOpen = !ROUND.bagOpen; paintShop(); });
  on("#done-shop", "click", doneShopping);
  // buy via delegation
  const grid = $("#shelf-grid");
  if (grid) grid.addEventListener("click", e => {
    const card = e.target.closest("[data-buy]");
    if (card) buy(card.getAttribute("data-buy"));
  });
  // swipe between shelves
  addSwipe($("#shelf-grid"), dir => changeShelf(dir));
  wireFamiliar("shop");
}

function shopCard(id) {
  const ing = D.INGREDIENT_BY_ID[id];
  const color = ROUND.charmColorFor[id];
  const cost = BALANCE.INGREDIENT_COST;
  const afford = ROUND.charms[color] >= cost;
  const quals = ing.wild ? "❓ ???" : `${magicDot(ing.qualities[0])} ${ing.qualities[0]}`;
  return `<div class="ing-card ${ing.wild ? "wild" : ""} ${afford ? "" : "cant"}" data-buy="${id}">
    <div class="ph" style="width:40px;height:40px;font-size:24px">${ing.emoji}</div>
    <div class="nm">${ing.name}</div>
    <div class="q main-q">${quals}</div>
    <div class="cost"><span class="swatch" style="background:${D.CHARMS[color]}"></span> ${cost}</div>
  </div>`;
}

function buy(id) {
  const ing = D.INGREDIENT_BY_ID[id];
  const color = ROUND.charmColorFor[id];
  const cost = BALANCE.INGREDIENT_COST;
  if (ROUND.charms[color] < cost) { toast(`Not enough ${color} charms!`); return; }
  ROUND.charms[color] -= cost;
  ROUND.inventory.push({ id, potent: false });
  const arr = ROUND.shelves[shelfName()];
  const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1);
  paintShop();
}

function changeShelf(dir) {
  const n = openShelves().length;
  if (n <= 1) return;
  ROUND.currentShelf = (ROUND.currentShelf + dir + n) % n;
  paintShop();
}
function rerollCurrentShelf() {
  const shelf = shelfName();
  if (ROUND.rerolled[shelf]) { toast("This shelf was already rerolled."); return; }
  ROUND.rerolled[shelf] = true;
  ENGINE.rerollShelf(ROUND, shelf);
  sPop();
  paintShop();
  toast("↻ " + D.SHELVES[shelf].name + " restocked!");
}

/* Familiar (Toad) shop ability: spend 1 treat to grab an ingredient here — or,
 * if shelves are still locked, a chance to find a KEY and open one instead. */
function familiarShopAbility() {
  if (GAME.treats <= 0) { toast("No treats left! Buy more with gold."); return; }
  if (ROUND.treatsUsed >= BALANCE.MAX_TREATS_PER_ROUND) { toast("Toad's had enough (5 per round)."); return; }
  const locked = D.SHELF_ORDER.filter(s => !isUnlocked(s));
  const hint = locked.length ? " (might find a 🔑 key!)" : "";
  confirmDialog(`Feed Toad 1 treat?${hint}`, () => {
    GAME.treats--; ROUND.treatsUsed++; save();
    if (locked.length && R.chance(BALANCE.FAMILIAR_KEY_CHANCE)) {
      const s = R.pick(locked); ROUND.unlocked.push(s);
      toast(`🔑 Toad found a key — ${D.SHELVES[s].name} unlocked!`);
    } else {
      const shelf = shelfName(); const arr = ROUND.shelves[shelf];
      if (arr.length) {
        const id = R.pick(arr); arr.splice(arr.indexOf(id), 1);
        ROUND.inventory.push({ id, potent: false });
        toast(`🐸 Toad grabbed ${D.INGREDIENT_BY_ID[id].name}!`);
      } else toast("🐸 Nothing to grab here!");
    }
    paintShop();
  });
}

/* Lightweight yes/no confirm overlay */
function confirmDialog(msg, onYes) {
  const ov = document.createElement("div");
  ov.className = "confirm-overlay";
  ov.innerHTML = `<div class="confirm-card">
    <div class="confirm-msg">${msg}</div>
    <div class="row" style="justify-content:center">
      <button class="btn secondary small" id="cf-no">No</button>
      <button class="btn good small" id="cf-yes">Yes</button>
    </div></div>`;
  $("#app").appendChild(ov);
  ov.querySelector("#cf-no").addEventListener("click", () => ov.remove());
  ov.querySelector("#cf-yes").addEventListener("click", () => { ov.remove(); onYes(); });
}

/* Reveal panel — auto-reveals needs on the timer; tap a hidden need to pay. */
function paintReveal() {
  const el = $("#reveal-panel"); if (!el) return;
  const w = ROUND.wish;
  const elapsed = Date.now() - ROUND.shopStart;
  if (w.needs[1] && !w.needs[1].revealed && elapsed >= BALANCE.REVEAL_SECOND_MS) w.needs[1].revealed = true;
  if (w.needs[2] && !w.needs[2].revealed && elapsed >= BALANCE.REVEAL_TWIST_MS) w.needs[2].revealed = true;

  const chips = w.needs.map((n, i) => {
    if (n.revealed) return `<div class="need-chip">${magicDot(n.type)} ${n.type}</div>`;
    const at = i === 1 ? BALANCE.REVEAL_SECOND_MS : BALANCE.REVEAL_TWIST_MS;
    const price = i === 1 ? BALANCE.PRICES.revealSecond : BALANCE.PRICES.revealTwist;
    const secs = Math.max(0, Math.ceil((at - elapsed) / 1000));
    return `<div class="need-chip pay" id="reveal-${i}">❔ in ${secs}s · 🪙${price}</div>`;
  }).join("");
  const revealed = w.needs.filter(n => n.revealed).length;
  const slots = Math.max(5, Math.min(7, 8 - revealed));
  el.innerHTML = `
    <div style="font-weight:800;font-size:14px;margin-bottom:6px">${ROUND.customer.emoji} “${ROUND.customer.line}”</div>
    <div class="needs-row">${chips}</div>
    <div class="reveal-slots">Finish now → <b>${slots} mixing slots</b> · Required match ${w.requiredMatch}%</div>`;
  // pay-to-reveal handlers
  w.needs.forEach((n, i) => {
    if (!n.revealed) on(`#reveal-${i}`, "click", () => payReveal(i));
  });
}
function payReveal(i) {
  const price = i === 1 ? BALANCE.PRICES.revealSecond : BALANCE.PRICES.revealTwist;
  if (GAME.gold < price) { toast("Not enough gold to reveal early."); return; }
  GAME.gold -= price; save();
  ROUND.wish.needs[i].revealed = true;
  syncHud("shop");
  paintReveal();
}

function doneShopping() {
  if (ROUND._shopTimer) { clearInterval(ROUND._shopTimer); ROUND._shopTimer = null; }
  const revealed = ROUND.wish.needs.filter(n => n.revealed).length;
  ROUND.maxSlots = Math.max(5, Math.min(7, 8 - revealed));
  const merged = applyTripleMatch(ROUND.inventory);
  ROUND.inventory = merged.inventory;
  if (merged.merged.length) showTriple(merged.merged, renderMix);
  else renderMix();
}
function showTriple(mergedIds, cb) {
  const names = mergedIds.map(id => D.INGREDIENT_BY_ID[id].name);
  const ov = document.createElement("div");
  ov.className = "triple-overlay";
  ov.innerHTML = `<div class="triple-card">
    <div style="font-size:46px">✨🫙✨</div>
    <div class="tt">Triple Match!</div>
    <div class="muted">${names.map(n => `3 ${n} → 1 <b>Potent ${n}</b>`).join("<br>")}</div>
  </div>`;
  $("#app").appendChild(ov);
  setTimeout(() => { ov.remove(); cb(); }, 1500);
}

/* Lightweight horizontal swipe helper */
function addSwipe(el, cb) {
  if (!el) return;
  let x0 = null;
  el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener("touchend", e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 45) cb(dx < 0 ? 1 : -1);
  }, { passive: true });
}

/* ======================================================================= */
/* MIX  (Phase 4: cauldron, live meters, 2-row inventory, serve)           */
/* ======================================================================= */
function renderMix() {
  ROUND.wish.needs.forEach(n => n.revealed = true); // all needs shown at making
  ROUND.slots = [];
  // Triple-match celebration already applied in doneShopping; if any potent
  // instances exist, flag a one-time note.
  paintMix();
  show("mix");
}
function paintMix() {
  const w = ROUND.wish;
  const score = scoreMix(ROUND.slots, w);
  const req = w.requiredMatch;
  const meetsReq = score.weighted >= req;

  // cauldron liquid: height = weighted match, color = the currently best-matched need
  let bestNeed = w.needs[0];
  score.perNeed.forEach((n, i) => { if (n.pct >= (score.perNeed[w.needs.indexOf(bestNeed)] || {}).pct) bestNeed = w.needs[i]; });
  const liquidColor = D.MAGIC[bestNeed.type];

  const slotCells = [];
  for (let i = 0; i < ROUND.maxSlots; i++) {
    const inst = ROUND.slots[i];
    const ing = inst && D.INGREDIENT_BY_ID[inst.id];
    slotCells.push(`<div class="slot ${inst ? "filled" : ""} ${inst && inst.potent ? "potent" : ""}">${ing ? ing.emoji : ""}</div>`);
  }
  const meters = w.needs.map((n, i) => {
    const pct = score.perNeed[i].pct;
    return `<div class="need-meter">
      <div class="lbl"><span>${magicDot(n.type)} ${n.type} <span class="muted">(${n.label})</span></span><span>${pct}%</span></div>
      <div class="meter"><i style="width:${pct}%;background:${D.MAGIC[n.type]}"></i></div></div>`;
  }).join("");

  const hint = ROUND.slots.length === 0
    ? "Tap ingredients below to add them to the cauldron."
    : meetsReq
      ? "✅ Wish met! Serve now, or risk one more for a bigger tip."
      : `Keep mixing to reach ${req}% — do you stop, or risk one more?`;

  html("mix", `
    ${hud("Making Phase")}
    <div class="card" style="margin-bottom:6px;padding:12px">
      <div class="stat-line" style="padding:0 0 4px"><span>${ROUND.customer.emoji} ${ROUND.customer.name}</span>
        <span>Match <b style="color:${meetsReq ? "var(--good)" : "var(--ink)"}">${score.weighted}%</b> / need ${req}%</span></div>
      ${meters}
    </div>
    <div class="cauldron-wrap grow">
      <div class="cauldron" id="cauldron">
        <div class="liquid" style="height:${Math.max(6, score.weighted)}%;background:linear-gradient(180deg, ${liquidColor}, ${shade(liquidColor)})"></div>
        <div class="bub b1"></div><div class="bub b2"></div><div class="bub b3"></div>
        <div class="pct">${score.weighted}%</div>
      </div>
      <div class="slots">${slotCells.join("")}</div>
      <div class="mix-hint muted">${hint}</div>
    </div>
    <button class="btn good" id="serve-btn" ${ROUND.slots.length === 0 ? "disabled" : ""}>✨ Serve the Wish</button>
    <div class="inv-2row" id="inv-row">
      ${ROUND.inventory.map((inst, idx) => invTile(inst, idx)).join("") || '<div class="muted" style="padding:14px">Bag empty — you\'ll do your best with what\'s in the pot!</div>'}
    </div>
    ${familiarToken()}
  `);
  ROUND.inventory.forEach((inst, idx) => {
    const tile = document.getElementById("invt-" + idx);
    if (tile) tile.addEventListener("click", () => addToSlot(idx, tile));
  });
  on("#serve-btn", "click", serve);
  wireFamiliar("mix");
}
function invTile(inst, idx) {
  const ing = D.INGREDIENT_BY_ID[inst.id];
  const quals = ing.wild ? "❓ ???" : `${magicDot(ing.qualities[0])} ${ing.qualities[0]}`;
  return `<div class="inv-tile ${ing.wild ? "wild" : ""} ${inst.potent ? "potent" : ""}" id="invt-${idx}">
    <div class="emoji">${ing.emoji}</div>
    <div class="nm">${inst.potent ? "✨" : ""}${ing.name}</div>
    <div class="q">${quals}</div>
  </div>`;
}
function addToSlot(idx, fromEl) {
  if (ROUND.slots.length >= ROUND.maxSlots) { toast("All slots are full!"); return; }
  const inst = ROUND.inventory.splice(idx, 1)[0];
  const ing = D.INGREDIENT_BY_ID[inst.id];
  if (ing.wild && !inst.wildQualities) { // resolve wild on add (hidden until now)
    inst.wildQualities = R.shuffle(D.MAGIC_TYPES).slice(0, R.int(1, 2));
    inst.wildStrength = R.int(BALANCE.WILD_MIN, BALANCE.WILD_MAX);
  }
  // fly animation from the tapped tile to the cauldron
  const cauldron = document.getElementById("cauldron");
  if (fromEl && cauldron) flyEmoji(fromEl.getBoundingClientRect(), cauldron.getBoundingClientRect(), ing.emoji);
  ROUND.slots.push(inst);
  sAdd();
  paintMix();
  const c2 = document.getElementById("cauldron"); if (c2) { c2.classList.remove("splash"); void c2.offsetWidth; c2.classList.add("splash"); }
  if (ROUND.slots.length >= ROUND.maxSlots) setTimeout(() => { if (screen("mix").classList.contains("active")) serve(); }, 650);
}
function flyEmoji(from, to, emoji) {
  const f = document.createElement("div");
  f.textContent = emoji;
  f.style.cssText = `position:fixed;left:${from.left + from.width/2 - 14}px;top:${from.top}px;font-size:28px;z-index:40;pointer-events:none;transition:transform .35s cubic-bezier(.5,-0.2,.5,1.2),opacity .35s`;
  document.body.appendChild(f);
  const dx = (to.left + to.width/2) - (from.left + from.width/2);
  const dy = (to.top + to.height*0.5) - from.top;
  requestAnimationFrame(() => { f.style.transform = `translate(${dx}px,${dy}px) scale(.5)`; f.style.opacity = "0.15"; });
  setTimeout(() => f.remove(), 380);
}
function sAdd() {} // sound hooks (audio added in Phase 9)
function sPop() {}

/* ======================================================================= */
/* RESULT                                                                  */
/* ======================================================================= */
function serve() {
  if (ROUND.slots.length === 0) return;
  const res = scoreResult(ROUND);
  GAME.gold += res.gold;
  servedTotal++; localStorage.setItem("wishpop_served", servedTotal);
  save();
  renderResult(res);
}
function renderResult(res) {
  const win = res.success;
  const c = ROUND.customer;
  const tip = res.gold - ROUND.payment; // >0 when a tip was earned
  const tipLine = (win && tip > 0)
    ? `<div class="stat-line"><span>Tip! 🎉</span><span class="gold">🪙 +${tip}</span></div>` : "";
  const emoji = win ? (tip > 0 ? "🤩" : "😊") : "🙂";
  const title = win ? res.type.title : "So Close!";
  html("result", `
    ${hud("Result")}
    <div class="grow center" style="gap:14px">
      <div class="ph big" id="react">${emoji}</div>
      <div class="result-title ${win ? "win" : "lose"}">${title}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Your Match</span><span><b>${res.weighted}%</b></span></div>
        <div class="stat-line"><span>Needed</span><span>${res.required}%</span></div>
        <div class="stat-line"><span>${win ? "Payment" : "Coins for trying"}</span><span class="gold">🪙 ${win ? ROUND.payment : res.gold}</span></div>
        ${tipLine}
      </div>
      <p class="muted" style="max-width:300px">${win
        ? (tip > 0 ? c.name + " is overjoyed — you nailed the wish and earned a tip!" : c.name + " is happy with their wish!")
        : c.name + " couldn't get the full wish, but liked the effort and left you a few coins."}</p>
    </div>
    <button class="btn" id="next-btn">Next Customer  →</button>
  `);
  on("#next-btn", "click", startRound);
  show("result");
}

/* ======================================================================= */
/* Shared bits                                                             */
/* ======================================================================= */
function ingCardMini(inst, idx) {
  const ing = D.INGREDIENT_BY_ID[inst.id];
  const wild = ing.wild;
  const quals = wild ? "???" : ing.qualities[0];
  const id = idx != null ? ` id="inv-${idx}"` : "";
  return `<div class="ing-card ${wild ? "wild" : ""}"${id}>
    <div class="ph" style="width:40px;height:40px;font-size:24px">${ing.emoji}</div>
    <div class="nm">${inst.potent ? "✨" : ""}${ing.name}</div>
    <div class="q">${quals}</div>
  </div>`;
}
function familiarToken(phase) {
  const badge = phase === "shop" ? `<span class="fam-badge">🐸</span>` : "";
  return `<div class="familiar" id="familiar">${D.FAMILIAR.emoji}${badge}</div>`;
}
function wireFamiliar(phase) {
  // scope to this screen's token (#familiar exists on several screens)
  const el = document.querySelector("#screen-" + phase + " #familiar");
  if (!el) return;
  el.addEventListener("click", () => {
    if (phase === "shop") familiarShopAbility();
    else toast("🐸 Tap the Toad in the shop to spend a treat!");
  });
}

/* boot */
window.addEventListener("load", renderStart);

})();
