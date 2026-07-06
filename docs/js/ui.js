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
  const scoops = Math.max(1, Math.round(ROUND.payment / 10));
  const split = ENGINE.scoopSplit(ROUND.bubblesTotal, scoops);
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
  if (roll.bonus) {
    ROUND.pending = roll.bonus;   // becomes a "?" to reveal
  }
  refreshPop();
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
/* SHOP  (Phase-1 placeholder: auto-grant a relevant starter inventory)    */
/* ======================================================================= */
function renderShop() {
  // Keep ingredients already won from popping bubbles; top up so each need has
  // at least 2 matching options available, then add a little filler.
  const nonWild = D.INGREDIENTS.filter(i => !i.wild);
  const picks = [];
  ROUND.wish.needs.forEach(need => {
    const have = ROUND.inventory.filter(inst => {
      const ing = D.INGREDIENT_BY_ID[inst.id];
      return !ing.wild && ing.qualities.includes(need.type);
    }).length;
    const want = Math.max(0, 2 - have);
    const matching = R.shuffle(nonWild.filter(i => i.qualities.includes(need.type)));
    matching.slice(0, want).forEach(i => picks.push(i.id));
  });
  R.shuffle(nonWild).slice(0, 2).forEach(i => picks.push(i.id)); // filler
  picks.forEach(id => ROUND.inventory.push({ id, potent: false }));
  const merged = applyTripleMatch(ROUND.inventory);
  ROUND.inventory = merged.inventory;
  ROUND.maxSlots = BALANCE.SLOTS.slow; // no shop timer yet -> base 5 slots

  html("shop", `
    ${hud("Shop Phase")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🛒</div>
      <div style="font-weight:800;font-size:18px">Ingredients gathered!</div>
      <p class="muted" style="max-width:320px">Placeholder shop — full shelves, charm‑spending, and reveal timers arrive in <b>Phase 3</b>. For now, here's everything you won from bubbles plus a helpful top‑up:</p>
      <div class="inv" style="max-width:340px">
        ${ROUND.inventory.map(inst => ingCardMini(inst)).join("")}
      </div>
    </div>
    <button class="btn" id="shop-continue">Done Shopping  →</button>
    ${familiarToken()}
  `);
  on("#shop-continue", "click", renderMix);
  wireFamiliar("shop");
  show("shop");
}

/* ======================================================================= */
/* MIX  (functional minimal: add ingredients, live match, serve)           */
/* ======================================================================= */
function renderMix() {
  // needs are all revealed at the making phase
  ROUND.wish.needs.forEach(n => n.revealed = true);
  ROUND.slots = [];
  paintMix();
  show("mix");
}
function paintMix() {
  const w = ROUND.wish;
  const score = scoreMix(ROUND.slots, w);
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
  const req = w.requiredMatch;
  const meetsReq = score.weighted >= req;
  html("mix", `
    ${hud("Making Phase")}
    <div class="card" style="margin-bottom:8px">
      <div class="stat-line"><span>${ROUND.customer.emoji} ${ROUND.customer.name}</span>
        <span>Match <b style="color:${meetsReq ? "var(--good)" : "var(--ink)"}">${score.weighted}%</b> / need ${req}%</span></div>
      ${meters}
    </div>
    <div class="slots" style="margin:6px 0 4px">${slotCells.join("")}</div>
    <div class="muted" style="text-align:center;margin-bottom:6px">Tap an ingredient to add it. You can't take it out once added.</div>
    <div class="inv grow">
      ${ROUND.inventory.map((inst, idx) => ingCardMini(inst, idx)).join("") || '<div class="muted">Inventory empty.</div>'}
    </div>
    <button class="btn good" id="serve-btn" ${ROUND.slots.length === 0 ? "disabled" : ""}>✨ Serve the Wish</button>
    ${familiarToken()}
  `);
  ROUND.inventory.forEach((inst, idx) => {
    on(`#inv-${idx}`, "click", () => addToSlot(idx));
  });
  on("#serve-btn", "click", serve);
  wireFamiliar("mix");
}
function addToSlot(idx) {
  if (ROUND.slots.length >= ROUND.maxSlots) { toast("All slots are full!"); return; }
  const inst = ROUND.inventory.splice(idx, 1)[0];
  // resolve wild ingredient on add (hidden until now)
  const ing = D.INGREDIENT_BY_ID[inst.id];
  if (ing.wild && !inst.wildQualities) {
    inst.wildQualities = R.shuffle(D.MAGIC_TYPES).slice(0, R.int(1, 2));
    inst.wildStrength = R.int(BALANCE.WILD_MIN, BALANCE.WILD_MAX);
  }
  ROUND.slots.push(inst);
  paintMix();
  if (ROUND.slots.length >= ROUND.maxSlots) setTimeout(() => { if (screen("mix").classList.contains("active")) serve(); }, 500);
}

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
  html("result", `
    ${hud("Result")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">${win ? "😊" : "😅"}</div>
      <div class="result-title ${win ? "win" : "lose"}">${res.type.title}</div>
      <div class="card" style="width:100%;max-width:320px">
        <div class="stat-line"><span>Your Match</span><span>${res.weighted}%</span></div>
        <div class="stat-line"><span>Needed</span><span>${res.required}%</span></div>
        <div class="stat-line"><span>Gold Earned</span><span class="gold">🪙 ${res.gold}</span></div>
      </div>
      <p class="muted">${win ? "Wonderful work — " + c.name + " is delighted!" : "No worries — " + c.name + " will be back. Try a stronger mix!"}</p>
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
  const quals = wild ? "???" : ing.qualities.join(", ");
  const color = D.CHARMS[ROUND.charmColorFor[ing.id]];
  const id = idx != null ? ` id="inv-${idx}"` : "";
  return `<div class="ing-card ${wild ? "wild" : ""}"${id}>
    <div class="ph" style="width:40px;height:40px;font-size:24px">${ing.emoji}</div>
    <div class="nm">${inst.potent ? "✨" : ""}${ing.name}</div>
    <div class="q">${quals}</div>
    <div class="cost"><span style="color:${color}">●</span> ${ing.cost}</div>
  </div>`;
}
function familiarToken() { return `<div class="familiar" id="familiar">${D.FAMILIAR.emoji}</div>`; }
function wireFamiliar() {
  on("#familiar", "click", () => toast("The Toad familiar joins in Phase 6!"));
}

/* boot */
window.addEventListener("load", renderStart);

})();
