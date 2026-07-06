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
  return `<div class="hud"><span>🐸 <span>${GAME.treats}</span> treats</span>
    <span class="title">${title}</span>
    <span class="gold">🪙 ${GAME.gold}</span></div>`;
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
/* SCOOP  (placeholder reveal)                                             */
/* ======================================================================= */
function renderScoop() {
  html("scoop", `
    ${hud("Scoop Phase")}
    <div class="grow center" style="gap:18px">
      <div class="ph big" id="scoop-token">🥄</div>
      <div id="scoop-text" class="muted">Tap the scoop to sift away the glitter!</div>
      <div id="scoop-result" style="font-size:24px;font-weight:900;min-height:30px"></div>
    </div>
    <button class="btn secondary" id="scoop-continue" disabled>Continue</button>
    ${familiarToken()}
  `);
  let sifted = false;
  const doSift = () => {
    if (sifted) return; sifted = true;
    $("#scoop-token").textContent = "✨";
    $("#scoop-text").textContent = "Wish Bubbles revealed!";
    $("#scoop-result").innerHTML = `🫧 <b>${ROUND.bubblesTotal}</b> Bubbles Found!`;
    $("#scoop-continue").disabled = false;
    $("#scoop-continue").classList.remove("secondary");
  };
  on("#scoop-token", "click", doSift);
  on("#scoop-continue", "click", renderPop);
  wireFamiliar("scoop");
  show("scoop");
}

/* ======================================================================= */
/* BUBBLE POP  (minimal: pops grant charms)                                */
/* ======================================================================= */
function renderPop() {
  ROUND.bubblesLeft = ROUND.bubblesTotal;
  html("pop", `
    ${hud("Pop Phase")}
    <div class="hud" style="background:none;padding:2px 4px">
      <div class="bubble-queue" id="queue"></div>
      <span class="muted" id="left-count"></span>
    </div>
    <div class="grow center" style="gap:20px">
      <div class="big-bubble" id="big-bubble">🫧</div>
      <div class="muted">Tap the bubble to pop it and collect charms!</div>
      ${charmsBar()}
    </div>
    <div class="row">
      <button class="btn secondary" id="pop-all">Pop All</button>
      <button class="btn" id="pop-continue" disabled>Continue</button>
    </div>
    ${familiarToken()}
  `);
  renderQueue();
  const popOne = () => {
    if (ROUND.bubblesLeft <= 0) return;
    ROUND.bubblesLeft--;
    // Phase-1 reward: charms of a random color
    for (let i = 0; i < BALANCE.CHARMS_PER_POP; i++) {
      ROUND.charms[R.pick(D.CHARM_TYPES)]++;
    }
    refreshPop();
  };
  on("#big-bubble", "click", popOne);
  on("#pop-all", "click", () => { while (ROUND.bubblesLeft > 0) popOne(); });
  on("#pop-continue", "click", renderShop);
  wireFamiliar("pop");
  show("pop");
}
function renderQueue() {
  const total = ROUND.bubblesTotal, left = ROUND.bubblesLeft;
  let q = "";
  for (let i = 0; i < total; i++) q += `<span class="b ${i >= left ? "popped" : ""}"></span>`;
  const el = $("#queue"); if (el) el.innerHTML = q;
  const lc = $("#left-count"); if (lc) lc.textContent = left + " left";
}
function refreshPop() {
  renderQueue();
  const cb = $(".charms"); if (cb) cb.outerHTML = charmsBar();
  if (ROUND.bubblesLeft <= 0) {
    const bb = $("#big-bubble"); if (bb) { bb.style.opacity = ".3"; bb.textContent = "✓"; }
    const cont = $("#pop-continue"); if (cont) cont.disabled = false;
    const pa = $("#pop-all"); if (pa) pa.disabled = true;
  }
}

/* ======================================================================= */
/* SHOP  (Phase-1 placeholder: auto-grant a relevant starter inventory)    */
/* ======================================================================= */
function renderShop() {
  // Build an inventory that makes success achievable but not automatic.
  const nonWild = D.INGREDIENTS.filter(i => !i.wild);
  const picks = [];
  ROUND.wish.needs.forEach(need => {
    const matching = R.shuffle(nonWild.filter(i => i.qualities.includes(need.type)));
    matching.slice(0, 2).forEach(i => picks.push(i.id));
  });
  // filler
  R.shuffle(nonWild).slice(0, 3).forEach(i => picks.push(i.id));
  const insts = picks.map(id => ({ id, potent: false }));
  const merged = applyTripleMatch(insts);
  ROUND.inventory = merged.inventory;
  ROUND.maxSlots = BALANCE.SLOTS.slow; // no shop timer yet -> base 5 slots

  html("shop", `
    ${hud("Shop Phase")}
    <div class="grow center" style="gap:14px">
      <div class="ph big">🛒</div>
      <div style="font-weight:800;font-size:18px">Ingredients gathered!</div>
      <p class="muted" style="max-width:320px">Placeholder shop — full shelves, charms, and reveal timers arrive in <b>Phase 3</b>. For now, a helpful starter set was gathered for you:</p>
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
