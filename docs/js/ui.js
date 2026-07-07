/* ==========================================================================
 * Wish Pop: Bubble Shop — UI / SCREEN FLOW (v3 Cauldron-First)
 * Start -> Customer -> Scoop -> Pop (draft a hand) -> Cauldron -> Result
 * ======================================================================== */
(function () {
"use strict";

const { R, newRound, applyTripleMatch, scoreMix, scoreResult, BALANCE } = ENGINE;
const D = DATA;

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
  `);
  on("#play-btn", "click", startRound);
  on("#menu-btn", "click", renderMenu);
  on("#admin-btn", "click", () => toast("Art uploader arrives in a later phase."));
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
    ${familiarToken("scoop")}
  `);
  function siftOne() {
    if (idx >= scoops) return;
    const found = split[idx]; revealed += found; idx++;
    const g = $("#glitter"); if (g) { g.textContent = "🫧"; g.style.transition = "opacity .3s"; g.style.opacity = "0"; }
    const face = $("#scoop-face"); if (face) face.textContent = "🫧";
    $("#scoop-text").innerHTML = `🫧 <b>${found}</b> found!`;
    $("#scoop-result").textContent = `${revealed} bubble${revealed === 1 ? "" : "s"} so far`;
    if (idx < scoops) {
      $("#scoop-step").textContent = `Scoop ${idx + 1} of ${scoops}`;
      setTimeout(() => { const g2 = $("#glitter"); if (g2) { g2.textContent = "✨✨"; g2.style.opacity = "1"; } const f2 = $("#scoop-face"); if (f2) f2.textContent = "🥄"; const t = $("#scoop-text"); if (t) t.textContent = "Tap to sift the glitter!"; }, 350);
    } else finish();
  }
  function finish() {
    $("#scoop-step").textContent = "All scooped!";
    $("#scoop-text").innerHTML = `🫧 <b>${revealed}</b> Wish Bubbles to pop!`;
    const cbtn = $("#scoop-continue"); if (cbtn) cbtn.disabled = false;
    const a = $("#auto-sift"); if (a) a.disabled = true;
  }
  on("#scoop-token", "click", siftOne);
  on("#auto-sift", "click", () => { while (idx < scoops) siftOne(); });
  on("#scoop-continue", "click", renderPop);
  wireFamiliar("scoop");
  show("scoop");
}

/* ======================================================================= */
/* POP — each bubble reveals a haul item into your hand                    */
/* ======================================================================= */
const CHARM = id => D.SPECIAL_CHARMS[id];
function renderPop() {
  ROUND.popIndex = 0;
  html("pop", `
    ${hud("Pop Phase")}
    <div class="hud" style="background:none;padding:2px 4px">
      <div class="bubble-queue" id="queue"></div>
      <span class="muted" id="left-count"></span>
    </div>
    <div class="grow center" style="gap:14px">
      <div class="big-bubble" id="big-bubble">🫧</div>
      <div class="muted" id="pop-hint">Tap the bubble to pop it — everything inside goes in your bag!</div>
      <div id="reward-flash" style="font-size:20px;font-weight:800;min-height:26px"></div>
      <div id="hand-line" class="muted" style="font-size:13px"></div>
    </div>
    <div class="row">
      <button class="btn secondary" id="pop-all">Pop All</button>
      <button class="btn" id="pop-continue" disabled>Continue</button>
    </div>
    ${familiarToken("pop")}
  `);
  refreshPop();
  on("#big-bubble", "click", () => popOne());
  on("#pop-all", "click", () => { while (ROUND.popIndex < ROUND.haul.length) popOne(true); refreshPop(); });
  on("#pop-continue", "click", renderMix);
  wireFamiliar("pop");
  show("pop");
}
function popOne(silent) {
  if (ROUND.popIndex >= ROUND.haul.length) return;
  const item = ROUND.haul[ROUND.popIndex++];
  let msg = "";
  if (item.kind === "ingredient") { ROUND.inventory.push({ id: item.id, potent: false }); const ing = D.INGREDIENT_BY_ID[item.id]; msg = `${ing.emoji} ${ing.name}`; }
  else if (item.kind === "charm") { ROUND.charms.push(item.id); const ch = CHARM(item.id); msg = `${ch.emoji} ${ch.name} charm!`; }
  else if (item.kind === "gold") { GAME.gold += item.amt; save(); msg = `🪙 +${item.amt} gold`; }
  else if (item.kind === "treat") { GAME.treats += 1; save(); msg = `🐸 +1 treat`; }
  if (!silent) flashReward(msg);
  refreshPop();
}
let flashT = null;
function flashReward(msg) { const el = $("#reward-flash"); if (!el) return; el.textContent = msg; el.style.opacity = "1"; clearTimeout(flashT); flashT = setTimeout(() => { if (el) { el.style.transition = "opacity .4s"; el.style.opacity = "0"; } }, 850); }
function refreshPop() {
  const total = ROUND.haul.length, left = total - ROUND.popIndex;
  let q = ""; for (let i = 0; i < total; i++) q += `<span class="b ${i < ROUND.popIndex ? "popped" : ""}"></span>`;
  const el = $("#queue"); if (el) el.innerHTML = q;
  const lc = $("#left-count"); if (lc) lc.textContent = left + " left";
  syncHud("pop");
  const hl = $("#hand-line"); if (hl) hl.innerHTML = `🎒 ${ROUND.inventory.length} ingredient${ROUND.inventory.length === 1 ? "" : "s"}` + (ROUND.charms.length ? ` · ${ROUND.charms.map(c => CHARM(c).emoji).join(" ")}` : "");
  const bb = $("#big-bubble"), hint = $("#pop-hint");
  if (left > 0) { if (bb) { bb.textContent = "🫧"; bb.style.opacity = "1"; } if (hint) hint.textContent = "Tap the bubble to pop it — everything inside goes in your bag!"; }
  else { if (bb) { bb.textContent = "✓"; bb.style.opacity = ".35"; } if (hint) hint.textContent = "All popped! Off to the cauldron."; }
  const cont = $("#pop-continue"); if (cont) cont.disabled = left > 0;
  const pa = $("#pop-all"); if (pa) pa.disabled = left <= 0;
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
  const w = ROUND.wish, elapsed = Date.now() - ROUND.mixStart;
  if (w.needs[1] && !w.needs[1].revealed && elapsed >= BALANCE.REVEAL_SECOND_MS) w.needs[1].revealed = true;
  if (w.needs[2] && !w.needs[2].revealed && elapsed >= BALANCE.REVEAL_TWIST_MS) w.needs[2].revealed = true;
  const score = scoreMix(ROUND.slots, w, ROUND.allergyOffset);
  // DISCOVERY: feeding a hidden need reveals it
  w.needs.forEach((n, i) => { if (!n.revealed && score.perNeed[i].points > 0) { n.revealed = true; n._discovered = true; } });
  const req = w.requiredMatch, meets = score.weighted >= req;
  const MAX = BALANCE.BAR_MAX;
  const meters = w.needs.map((n, i) => {
    const s = score.perNeed[i];
    if (!n.revealed) {
      const at = i === 1 ? BALANCE.REVEAL_SECOND_MS : BALANCE.REVEAL_TWIST_MS;
      const secs = Math.max(0, Math.ceil((at - elapsed) / 1000));
      return `<div class="need-meter"><div class="lbl"><span class="muted">❔ Mystery Need</span><span class="muted">or in ${secs}s</span></div>
        <div class="meter sweet"><i style="width:0%"></i></div></div>`;
    }
    const fillPct = Math.min(100, s.points / MAX * 100);
    const over = s.points > s.bandHigh;
    const fillCol = over ? "var(--bad)" : D.MAGIC[n.type];
    const bandLeft = Math.max(0, s.bandLow / MAX * 100), bandW = Math.max(2, (s.bandHigh - s.bandLow) / MAX * 100);
    return `<div class="need-meter"><div class="lbl"><span>${magicDot(n.type)} ${n.type}</span>
      <span style="color:${s.pct === 100 ? "var(--good)" : over ? "var(--bad)" : "var(--ink)"}">${s.pct === 100 ? "✓ perfect" : over ? "over!" : s.pct + "%"}</span></div>
      <div class="meter sweet"><span class="band" style="left:${bandLeft}%;width:${bandW}%"></span><i style="width:${fillPct}%;background:${fillCol}"></i></div></div>`;
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
  const tipLine = (win && res.tip > 0)
    ? `<div class="stat-line"><span>⚡ Quick‑service tip!</span><span class="gold">🪙 +${res.tip}</span></div>` : "";
  const emoji = !win ? "🙂" : zone === "red" ? "🤧" : zone === "yellow" ? "😅" : (res.tip > 0 ? "🤩" : "😊");
  const title = win ? res.type.title : "So Close!";
  const blurb = !win
    ? c.name + " couldn't get the full wish, but liked the effort and left you a few coins."
    : zone === "red" ? "The wish worked… but " + c.name + " reacted to the " + res.allergy.type + " magic! Half pay."
    : zone === "yellow" ? c.name + " got their wish, but a little " + res.allergy.type + " magic left them itchy."
    : res.tip > 0 ? c.name + " is overjoyed you were so quick — enjoy the tip!" : c.name + " is happy with their wish!";
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
        ${tipLine}
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
window.addEventListener("load", renderStart);

})();
