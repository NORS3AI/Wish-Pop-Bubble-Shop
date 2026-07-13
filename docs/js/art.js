/* =======================================================================
 * art.js — optional custom-image overrides for the emoji art.
 *
 * HOW IT WORKS (for non-coders):
 *   Drop a correctly-named image into the /docs/art/ folder and it AUTOMATICALLY
 *   replaces the matching emoji in the game. No code changes needed. If a file
 *   isn't there, the original emoji simply shows instead — so you can replace
 *   them one at a time, in any order. See /docs/art/README.md for every filename.
 *
 * Files are looked up as  art/<key>.png  (PNG with transparent background is
 * best). We probe each image once; if it loads we use it everywhere that art
 * appears, swapping any already-drawn emoji placeholders in place.
 * ===================================================================== */
const ART = (() => {
  const DIR = "art/";
  const EXT = ".webp";   // character/scene art is served as WebP (≈85% smaller than PNG, visually identical)
  const state = {};   // key -> 'ok' | 'missing' | 'pending'
  const okCb = {};     // key -> [callbacks fired once when it loads]
  let VER = "";        // cache-bust suffix (set to the build once at boot)

  function setVersion(v) { VER = v ? ("?v=" + v) : ""; }
  function url(key) { return DIR + key + EXT + VER; }

  function swapPlaceholders(key) {
    document.querySelectorAll('[data-art="' + key + '"]').forEach(el => {
      const cls = el.getAttribute("data-artcls") || "";
      const emoji = el.getAttribute("data-emoji") || el.textContent;
      const img = document.createElement("img");
      img.className = ("art " + cls).trim(); img.src = url(key); img.alt = emoji; img.draggable = false;
      el.replaceWith(img);
    });
  }
  function probe(key) {
    if (state[key]) return;               // already known / in flight
    state[key] = "pending";
    const im = new Image();
    im.onload = () => { state[key] = "ok"; swapPlaceholders(key); (okCb[key] || []).forEach(fn => fn(url(key))); okCb[key] = []; };
    im.onerror = () => { state[key] = "missing"; okCb[key] = []; };
    im.src = url(key);
  }
  // inline HTML: an <img> if the file is known-present, else an emoji span that
  // will hot-swap to the image the moment its probe succeeds.
  function tag(key, emoji, cls) {
    cls = cls || "";
    if (state[key] === "ok") return '<img class="art ' + cls + '" src="' + url(key) + '" alt="' + emoji + '" draggable="false">';
    probe(key);
    return '<span class="art-emoji ' + cls + '" data-art="' + key + '" data-artcls="' + cls + '" data-emoji="' + emoji + '">' + emoji + "</span>";
  }
  // for non-inline uses (background, cauldron pot): run cb(url) once, if/when present
  function ensure(key, cb) {
    if (state[key] === "ok") { cb(url(key)); return; }
    if (state[key] === "missing") return;
    (okCb[key] = okCb[key] || []).push(cb);
    probe(key);
  }
  function isReady(key) { return state[key] === "ok"; }

  // --- per-image size preferences (so an uploaded spoon/etc. can be resized in
  // the game without editing code). Saved separately from the game save. -----
  const SCALE_KEY = "wishpop_artscale";
  let scales = {};
  try { scales = JSON.parse(localStorage.getItem(SCALE_KEY)) || {}; } catch (e) { scales = {}; }
  function getScale(key) { return scales[key] || 1; }
  function setScale(key, v) { scales[key] = v; try { localStorage.setItem(SCALE_KEY, JSON.stringify(scales)); } catch (e) {} }

  return { tag, ensure, isReady, url, DIR, EXT, getScale, setScale, setVersion };
})();
