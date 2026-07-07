/* =======================================================================
 * audio.js — procedural ASMR sound (Web Audio, zero downloaded files)
 * Everything is synthesized live so it works offline on GitHub Pages.
 * Browsers require a user gesture before sound plays: call SFX.unlock()
 * from the first tap (we do this on the Play button + first pop).
 * ===================================================================== */
const SFX = (() => {
  let ctx = null, master = null;
  let muted = localStorage.getItem("wishpop_muted") === "1";

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function unlock() { const c = ensure(); if (c && c.state === "suspended") c.resume(); }
  function setMuted(m) {
    muted = m; localStorage.setItem("wishpop_muted", m ? "1" : "0");
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }
  function isMuted() { return muted; }
  function toggle() { setMuted(!muted); return muted; }

  // --- primitives --------------------------------------------------------
  function tone(freq, t0, dur, { type = "sine", peak = 0.3, glideTo = null, attack = 0.006 } = {}) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const n = ctx.sampleRate * 0.4; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let seed = 12345; // deterministic (Math.random is blocked in some contexts we share)
    for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = (seed / 0x3fffffff) - 1; }
    return noiseBuf;
  }
  function noiseBurst(t0, dur, { freq = 1000, q = 1, peak = 0.2, type = "bandpass" } = {}) {
    if (!ctx || muted) return;
    const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
  }

  // --- game sounds -------------------------------------------------------
  // Bubble pop: a round "bloop" that climbs in pitch as your combo builds,
  // like popping bubble wrap faster and faster. step = combo index.
  // Pitches snap to a C-major pentatonic scale so a fast run always sounds musical.
  const PENTA = [0, 2, 4, 7, 9];
  function noteFreq(step) {
    const oct = Math.floor(step / PENTA.length);
    return 261.63 * Math.pow(2, (PENTA[((step % PENTA.length) + PENTA.length) % PENTA.length] + oct * 12) / 12);
  }
  // power 0..1 = how long you squeezed before release: deeper, bigger, longer.
  function pop(step = 0, power = 0) {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    const base = noteFreq(step % 15) * (1 - power * 0.4);
    const dur = 0.14 + power * 0.24, peak = 0.3 + power * 0.24;
    tone(base, t, dur, { type: "sine", peak, glideTo: base * (2.5 - power * 1.1), attack: 0.005 });
    noiseBurst(t, 0.05 + power * 0.06, { freq: 880 + step * 40, q: 0.8, peak: 0.16 + power * 0.1 }); // membrane snap
  }
  // rising hum while you squeeze-and-hold a bubble
  let holdOsc = null, holdGain = null;
  function holdStart() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    holdOsc = c.createOscillator(); holdGain = c.createGain(); holdOsc.type = "sine";
    holdOsc.frequency.setValueAtTime(200, t); holdOsc.frequency.linearRampToValueAtTime(720, t + 1.1);
    holdGain.gain.setValueAtTime(0.0001, t); holdGain.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
    holdOsc.connect(holdGain).connect(master); holdOsc.start();
  }
  function holdStop() {
    if (!holdOsc || !ctx) return; const t = ctx.currentTime;
    try { holdGain.gain.setTargetAtTime(0.0001, t, 0.03); holdOsc.stop(t + 0.12); } catch (_) {}
    holdOsc = null; holdGain = null;
  }
  // Reveal chime, flavored by what popped out.
  function reveal(kind, step = 0) {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime + 0.03;
    if (kind === "gold") { // bright coin double-ping
      tone(1180, t, 0.10, { type: "triangle", peak: 0.28 });
      tone(1760, t + 0.06, 0.14, { type: "triangle", peak: 0.24 });
    } else if (kind === "charm") { // sparkly ascending arpeggio (rare!)
      [0, 0.07, 0.14, 0.21].forEach((d, i) => tone(660 * Math.pow(1.26, i), t + d, 0.22, { type: "triangle", peak: 0.24 }));
      noiseBurst(t, 0.5, { freq: 6000, q: 0.5, peak: 0.05, type: "highpass" }); // shimmer
    } else if (kind === "treat") { // soft warm two-note
      tone(520, t, 0.16, { type: "sine", peak: 0.22 });
      tone(780, t + 0.08, 0.18, { type: "sine", peak: 0.2 });
    } else { // ingredient — gentle marimba-ish note
      const n = 440 + (step % 6) * 55;
      tone(n, t, 0.2, { type: "triangle", peak: 0.2 });
    }
  }
  // Bonus bubble — a bright rising "more bubbles!" flourish (four quick steps up).
  function bonus() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.06, 0.18, { type: "triangle", peak: 0.26 }));
    noiseBurst(t + 0.05, 0.4, { freq: 5000, q: 0.5, peak: 0.06, type: "highpass" });
  }
  // Charm — a rich sparkly fanfare (rising arpeggio + a shimmer tail + a final ding).
  function charm() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    [523, 622, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.08, 0.3, { type: "triangle", peak: 0.24 }));
    tone(1568, t + 0.44, 0.5, { type: "sine", peak: 0.22 }); // final ding
    noiseBurst(t, 0.7, { freq: 6500, q: 0.4, peak: 0.06, type: "highpass" }); // shimmer
  }
  // Granular sift (for the scoop phase). intensity 0..1 shapes brightness/loudness.
  function sift(dur = 0.25, intensity = 0.5) {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    noiseBurst(t, dur, { freq: 2200 + intensity * 4500, q: 0.5, peak: 0.06 + intensity * 0.12, type: "bandpass" });
  }
  // Bubbles floating up and off — a soft rising glide.
  function lift() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    tone(440, t, 0.5, { type: "sine", peak: 0.16, glideTo: 1100, attack: 0.05 });
    tone(660, t + 0.05, 0.45, { type: "sine", peak: 0.1, glideTo: 1500 });
  }
  // One pip per bubble as it floats up — rises in pitch so you can hear the count.
  function count(step = 0) {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    const f = noteFreq((step % 10) + 5); // ascends the pentatonic scale, one note per bubble
    tone(f, t, 0.18, { type: "triangle", peak: 0.26, glideTo: f * 1.4, attack: 0.004 });
  }
  // Scoop diving into the glitter — a granular whoosh with a low body.
  function scoop() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    noiseBurst(t, 0.34, { freq: 1600, q: 0.5, peak: 0.16, type: "bandpass" });
    tone(180, t, 0.3, { type: "sine", peak: 0.16, glideTo: 90 });
  }
  function whoosh() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    noiseBurst(t, 0.3, { freq: 500, q: 0.4, peak: 0.14, type: "bandpass" });
  }
  // Knife chop — a crisp downward slice.
  function chop() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    noiseBurst(t, 0.08, { freq: 3500, q: 1.5, peak: 0.28, type: "highpass" });
    tone(500, t, 0.1, { type: "sawtooth", peak: 0.18, glideTo: 120 });
  }
  // A cartoony "achoo!" — a nasal inhale then a wet burst.
  function sneeze() {
    const c = ensure(); if (!c || muted) return; const t = c.currentTime;
    tone(300, t, 0.22, { type: "sawtooth", peak: 0.14, glideTo: 560 });          // "ahh" (rising)
    noiseBurst(t + 0.24, 0.26, { freq: 1100, q: 0.6, peak: 0.32, type: "bandpass" }); // "choo!" burst
    tone(430, t + 0.24, 0.3, { type: "sawtooth", peak: 0.2, glideTo: 130 });      // falling honk
  }

  return { unlock, setMuted, isMuted, toggle, pop, reveal, bonus, charm, sift, lift, scoop, count, holdStart, holdStop, sneeze, chop, whoosh };
})();
