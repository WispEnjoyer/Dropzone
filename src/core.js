// ---------- the stage: everything renders inside a 16:9 box, letterboxed in black to fit any window ----------
const STAGE = document.getElementById("stage") || document.body;
let stageW = window.innerWidth, stageH = window.innerHeight, stageX = 0, stageY = 0;
function fitStage() { const w = window.innerWidth, h = window.innerHeight, ar = 16 / 9;
  stageW = w / h > ar ? Math.round(h * ar) : w; stageH = w / h > ar ? h : Math.round(w / ar); stageX = Math.floor((w - stageW) / 2); stageY = Math.floor((h - stageH) / 2);
  const s = STAGE.style; s.left = stageX + "px"; s.top = stageY + "px"; s.width = stageW + "px"; s.height = stageH + "px"; s.setProperty("--vw", stageW / 100 + "px"); s.setProperty("--vh", stageH / 100 + "px");
  // menus are laid out on a 1440x810 virtual page and zoomed to fit, so they fill any window the same way
  const scr = document.getElementById("screen"); if (scr) { const z = Math.max(.7, stageW / 1440); scr.style.zoom = z; scr.style.setProperty("--vw", stageW / z / 100 + "px"); scr.style.setProperty("--vh", stageH / z / 100 + "px"); } }
fitStage(); addEventListener("resize", fitStage);
"use strict";
// =====================================================================================
//  DROPZONE: a top-down drop-trooper prototype. core: helpers, input, sound, pixel sprites
// =====================================================================================
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
let R = Math.random;
const rand = (a = 0, b = 1) => a + R() * (b - a), randi = (a, b) => Math.floor(a + R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
const frand = (a = 0, b = 1) => a + Math.random() * (b - a);   // gameplay randomness (never seeded)
const dst = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function seeded(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), u), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), u), v); }
const fbm = (x, y, s) => vnoise(x, y, s) * .6 + vnoise(x * 2.1, y * 2.1, s + 7) * .28 + vnoise(x * 4.3, y * 4.3, s + 13) * .12;
const fmtT = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };

// ---------- input ----------
const keys = new Set(), pressed = new Set(), released = new Set();
const mouse = { x: 0, y: 0, down: false, clicked: false };
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["tab", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "f", "g", "e", "r"].includes(k) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) e.preventDefault();
  if (!keys.has(k)) pressed.add(k); keys.add(k);
});
addEventListener("keyup", e => { const k = e.key.toLowerCase(); keys.delete(k); released.add(k); });
addEventListener("blur", () => { keys.clear(); mouse.down = false; if (typeof onBlur === "function") onBlur(); });

// ---------- sound: everything is synthesised ----------
const AU = (() => {
  let ctx = null, master = null, nbuf = null, vol = .55;
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    // everything goes through a warm master: a low-shelf boost for weight and a gentle top cut so nothing is shrill
    master = ctx.createGain(); master.gain.value = vol; const shelf = ctx.createBiquadFilter(), top = ctx.createBiquadFilter(), comp = ctx.createDynamicsCompressor();
    shelf.type = "lowshelf"; shelf.frequency.value = 160; shelf.gain.value = 6; top.type = "lowpass"; top.frequency.value = 8500; top.Q.value = .5;
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = .004; comp.release.value = .2;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .1;   // a brick wall so the big stuff never clips
    master.connect(shelf).connect(top).connect(comp).connect(lim).connect(ctx.destination);
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // two reverbs built from decaying noise: a tight metal room for the ship, a wide sparse echo for outdoors
    const IR = (sec, dec, sparse) => { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const ch = b.getChannelData(c); for (let i = 0; i < n; i++) { const k = i / n; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, dec) * (sparse && k < .35 && Math.random() > .08 ? .12 : 1); } } return b; };
    for (const [k, sec, dec, sp, cut] of [["in", .7, 3.2, false, 2400], ["out", 2.2, 2.4, true, 1500]]) { const cv = ctx.createConvolver(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); cv.buffer = IR(sec, dec, sp);
      lp.type = "lowpass"; lp.frequency.value = cut; g.gain.value = k === "out" ? .55 : .4; cv.connect(lp).connect(g).connect(master); RVB[k] = cv; }
  }
  const RVB = {}; let space = "in";
  // route a node to the speakers, optionally panned and with some of it sent into the current space's reverb
  function out(node, pan, rv) { let n = node; if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; } n.connect(master);
    if (rv && RVB[space]) { const sg = ctx.createGain(); sg.gain.value = rv; n.connect(sg).connect(RVB[space]); } }
  function noise(dur, { f = 1200, f2, q = 1, type = "lowpass", g = .3, at = .002, delay = 0, pan = 0, rv = 0 } = {}) {
    if (!ctx || g < .003) return; const t = ctx.currentTime + delay, s = ctx.createBufferSource(); s.buffer = nbuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const ga = ctx.createGain(); ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(g, t + at); ga.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(fl).connect(ga); out(ga, pan, rv); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  function tone(f, dur, { type = "square", g = .08, f2, delay = 0, at = .004, cut, pan = 0, rv = 0 } = {}) {
    if (!ctx || g < .003) return; const t = ctx.currentTime + delay, o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const ga = ctx.createGain(); ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(g, t + at); ga.gain.exponentialRampToValueAtTime(.001, t + dur);
    let n = o; if (cut) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = cut; o.connect(fl); n = fl; } n.connect(ga); out(ga, pan, rv); o.start(t); o.stop(t + dur + .05);
  }
  let lastShot = 0;
  return {
    init, setVol(v) { vol = v; if (master) master.gain.value = v; }, setSpace(k) { space = k; },
    get ctx() { return ctx; }, _noise: noise, _tone: tone, _out: out, get _nbuf() { return nbuf; }, get _master() { return master; },
    // ---------- deep, heavy effects: low thumps, dark noise, sub-bass tails ----------
    shot(v = 1) { if (!ctx || ctx.currentTime - lastShot < .04) return; lastShot = ctx.currentTime;
      noise(.11, { f: 1700, f2: 220, g: .26 * v }); noise(.03, { f: 900, type: "bandpass", q: 1.5, g: .12 * v }); tone(95, .12, { type: "sine", g: .32 * v, f2: 38 }); tone(60, .16, { type: "triangle", g: .12 * v, f2: 30 }); },
    sentry(v = 1) { noise(.07, { f: 1300, f2: 260, g: .15 * v }); tone(80, .08, { type: "sine", g: .14 * v, f2: 35 }); },
    boom(size = 1, v = 1) { noise(.7 + size * .6, { f: 520, f2: 35, g: .5 * v * Math.min(1, size), at: .006 }); tone(48, .6 + size * .4, { type: "sine", g: .45 * v, f2: 18 });
      noise(1.6 + size, { f: 160, f2: 40, g: .18 * v, at: .15, delay: .05 }); },
    click() { tone(240, .04, { type: "triangle", g: .07, cut: 1200 }); noise(.02, { f: 1400, type: "bandpass", q: 3, g: .05 }); },
    empty() { tone(130, .06, { type: "square", g: .05, cut: 700 }); },
    reload() { noise(.06, { f: 900, type: "bandpass", q: 2, g: .14 }); tone(110, .05, { type: "square", g: .05, cut: 500 }); noise(.07, { f: 700, type: "bandpass", q: 2, g: .15, delay: .24 }); tone(85, .08, { type: "square", g: .06, cut: 420, delay: .24 }); },
    key(i) { tone(196 + i * 22, .07, { type: "square", g: .06, cut: 900 }); },
    fail() { tone(98, .22, { type: "sawtooth", g: .08, f2: 70, cut: 600 }); },
    armed() { tone(220, .1, { type: "square", g: .07, cut: 900 }); tone(330, .16, { type: "square", g: .07, delay: .09, cut: 1100 }); },
    beacon() { tone(440, .08, { type: "sine", g: .07 }); tone(220, .2, { type: "sine", g: .05, delay: .05 }); },
    screech(v = 1) { noise(.35, { f: 900, f2: 300, type: "bandpass", q: 3, g: .14 * v }); tone(frand(160, 230), .32, { type: "sawtooth", g: .05 * v, f2: 90, cut: 900 }); },
    squish(v = 1) { noise(.18, { f: 380, f2: 110, g: .24 * v }); tone(70, .14, { type: "sine", g: .12 * v, f2: 40 }); },
    hurt() { noise(.14, { f: 320, g: .28 }); tone(62, .18, { type: "sine", g: .25, f2: 38 }); },
    jet() { noise(2, { f: 140, f2: 900, type: "bandpass", q: .8, g: .3, at: .5 }); noise(2, { f: 90, f2: 60, g: .25, at: .6 }); },
    pod() { noise(1.3, { f: 1600, f2: 180, type: "bandpass", q: .8, g: .22, at: .3 }); tone(55, 1.2, { type: "sine", g: .2, f2: 30, at: .3 }); },
    rumble() { noise(2.8, { f: 70, f2: 30, g: .45, at: .5 }); },
    alarm() { tone(330, .22, { type: "square", g: .05, cut: 900 }); tone(247, .3, { type: "square", g: .05, delay: .24, cut: 800 }); },
    pickup() { tone(262, .07, { type: "triangle", g: .08 }); tone(392, .1, { type: "triangle", g: .07, delay: .06 }); },
    step(surf, run) { if (surf) return this.foot(surf, run); noise(.08, { f: 160, f2: 70, g: .1 }); },
    // ---------- field sounds ----------
    sting() { [0, 7, 12, 15].forEach((k, i) => tone(41.2 * 2 ** (k / 12), 2.6, { type: "sawtooth", g: .07, delay: i * .04, cut: 500 })); noise(1.6, { f: 200, f2: 50, g: .35 }); tone(41.2, 2.4, { type: "sine", g: .4 }); },
    roar(d = 3, v = 1) { noise(d, { f: 260, f2: 700, type: "bandpass", q: .6, g: .3 * v, at: d * .3 }); noise(d, { f: 60, f2: 40, g: .4 * v, at: d * .2 }); },
    clank() { noise(.16, { f: 700, type: "bandpass", q: 2.5, g: .24 }); tone(75, .35, { type: "square", g: .07, f2: 45, cut: 400 }); },
    beep(i = 0) { tone(i === 3 ? 392 : 262, i === 3 ? .6 : .16, { type: "square", g: .07, cut: 1000 }); tone(i === 3 ? 98 : 65, i === 3 ? .6 : .16, { type: "sine", g: .12 }); },
    gat(v = 1) { noise(.06, { f: 1300, f2: 300, g: .16 * v }); tone(70, .05, { type: "sine", g: .12 * v, f2: 40 }); },
    crack(v = 1) { noise(.09, { f: 1800, f2: 400, g: .22 * v }); tone(65, .1, { type: "sine", g: .14 * v, f2: 32 }); },
    windStart(k = .5) { if (!ctx || this._wind) return; const s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 220; f.Q.value = .5;
      const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.06 * k, ctx.currentTime + 2); s.connect(f).connect(g).connect(master); s.start(); this._wind = { s, g, f };
      const wob = () => { if (this._wind && this._wind.s === s) { f.frequency.linearRampToValueAtTime(140 + Math.random() * 260, ctx.currentTime + 2); setTimeout(wob, 2000); } }; wob(); },
    windStop() { const w = this._wind; if (!w || !ctx) return; this._wind = null; w.g.gain.linearRampToValueAtTime(0, ctx.currentTime + .8); setTimeout(() => w.s.stop(), 900); },
    // ---------- talking voice: a short vowel-shaped syllable per letter (Animal Crossing style babble) ----------
    babble(ch, voice = {}) {
      // a soft, tuned blip per syllable: each letter picks a note from a small scale around the speaker's pitch,
      // so a line sounds like murmured speech with a melody rather than a buzz
      if (!ctx) return;
      const code = (ch || "a").toLowerCase().charCodeAt(0) || 97, vowel = "aeiouy".includes((ch || "").toLowerCase());
      const SCALE = [0, 2, 3, 5, 7, 8, 10, 12], step = SCALE[(code * 7) % SCALE.length] - 5;
      const base = (voice.pitch || 300) * .66, f = base * 2 ** (step / 12) * (1 + (Math.random() - .5) * .03) * (voice.excited ? 1.06 : 1);
      const t = ctx.currentTime, dur = vowel ? .085 : .06, g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = Math.min(2600, f * 3.5); lp.Q.value = .7;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((voice.gain || .085) * (vowel ? 1 : .8), t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      g.connect(lp).connect(master);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o1.type = voice.wave || "triangle"; o2.type = "square"; g2.gain.value = .14;
      o1.frequency.setValueAtTime(f * 1.03, t); o1.frequency.exponentialRampToValueAtTime(f * (vowel ? .97 : 1), t + dur);
      o2.frequency.setValueAtTime(f * 1.03, t); o2.frequency.exponentialRampToValueAtTime(f * .97, t + dur);
      o1.connect(g); o2.connect(g2).connect(g); o1.start(t); o2.start(t); o1.stop(t + dur + .02); o2.stop(t + dur + .02);
    },

    // ---------- lobby music: a calm, slightly melancholic ship-at-rest loop in D minor ----------
    // pad chords, a pulsing bass, a delayed arpeggio, soft kick and hats, and the odd computer chirp
    musicOn: (() => { try { return localStorage.getItem("drop_music") !== "0"; } catch { return true; } })(),
    lobbyStart() {
      if (!ctx || this._mus || !this.musicOn) return;
      const bus = ctx.createGain(), t0 = ctx.currentTime; bus.gain.setValueAtTime(0, t0); bus.gain.linearRampToValueAtTime(.3, t0 + 4); bus.connect(master);
      const dl = ctx.createDelay(1.5), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
      dl.delayTime.value = 60 / 70 * .75; fb.gain.value = .4; lp.type = "lowpass"; lp.frequency.value = 1200; wet.gain.value = .55;
      dl.connect(lp).connect(fb).connect(dl); lp.connect(wet).connect(bus);
      const M = this._mus = { bus, dl, step: 0, next: t0 + .2 }, s16 = 60 / 70 / 4;
      const mtof = m => 440 * 2 ** ((m - 69 - 12) / 12);   // everything an octave down
      const CH = [[50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [43, 46, 50, 53, 57], [45, 50, 52, 55, 61]];   // Dm9 · Bbmaj7 · Gm9 · A7sus
      const ARP = [0, 2, 4, 3, 1, 3, 2, 4];
      const env = (node, t, a, peak, d) => { node.gain.setValueAtTime(0, t); node.gain.linearRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
      const voice = (type, f, t, a, peak, d, dest, cut) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
        let n = o; if (cut) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(cut[0], t); fl.frequency.linearRampToValueAtTime(cut[1], t + a); fl.frequency.linearRampToValueAtTime(cut[2], t + a + d); o.connect(fl); n = fl; }
        n.connect(g); g.connect(dest); env(g, t, a, peak, d); o.start(t); o.stop(t + a + d + .1); return o; };
      const tick = () => {
        if (this._mus !== M) return;
        while (M.next < ctx.currentTime + .35) { const t = M.next, st = M.step, bar = Math.floor(st / 16) % 8, inBar = st % 16, chord = CH[Math.floor(bar / 2)];
          if (inBar === 0 && bar % 2 === 0) for (const m of chord.slice(1)) for (const det of [-6, 6]) { const o = voice("sawtooth", mtof(m), t, 1.8, .026, s16 * 32 - 1, bus, [200, 700, 300]); o.detune.value = det; }   // pad
          if (inBar === 0 || inBar === 10) { voice("sine", mtof(chord[0] - 12), t, .03, .3, inBar ? .7 : 1.2, bus); voice("triangle", mtof(chord[0]), t, .02, .07, .5, bus, [400, 260, 140]); voice("sawtooth", mtof(chord[0] - 12), t, .03, .03, .6, bus, [220, 160, 90]); }   // bass
          if (st % 2 === 0) { const m = chord[ARP[(st / 2) % 8]] + 12, g = st % 8 === 0 ? .045 : .028; voice("triangle", mtof(m), t, .006, g, .32, dl); voice("square", mtof(m), t, .006, g * .2, .14, bus, [1000, 700, 300]); }   // arpeggio
          if (inBar === 0 || inBar === 8) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(32, t + .22);
            o.connect(g).connect(bus); env(g, t, .004, inBar ? .16 : .24, .3); o.start(t); o.stop(t + .4); }   // soft kick
          if (inBar === 4 || inBar === 12 || (inBar === 14 && bar % 2)) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nbuf; f.type = "bandpass"; f.frequency.value = 3200;
            s.connect(f).connect(g).connect(bus); env(g, t, .002, .022, .05); s.start(t, Math.random()); s.stop(t + .08); }   // hats
          if (inBar === 6 && bar % 4 === 3) for (let k = 0; k < 3; k++) voice("sine", mtof(72 + [0, 7, 12, 3, 10][Math.floor(Math.random() * 5)]), t + k * s16, .002, .018, .12, dl);   // computer chirps
          M.next += s16; M.step = (st + 1) % 128; }
        M.timer = setTimeout(tick, 90); };
      tick();
    },
    lobbyStop(fade = 1.2) { const M = this._mus; if (!M || !ctx) return; this._mus = null; clearTimeout(M.timer); const t = ctx.currentTime;
      M.bus.gain.cancelScheduledValues(t); M.bus.gain.setValueAtTime(M.bus.gain.value, t); M.bus.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => M.bus.disconnect(), fade * 1000 + 200); },
    musicDuck(k) { const M = this._mus; if (!M || !ctx) return; const t = ctx.currentTime; M.bus.gain.cancelScheduledValues(t); M.bus.gain.setValueAtTime(M.bus.gain.value, t); M.bus.gain.linearRampToValueAtTime(.3 * k, t + .6); },
    toggleMusic() { this.musicOn = !this.musicOn; try { localStorage.setItem("drop_music", this.musicOn ? "1" : "0"); } catch {} if (this.musicOn) { if (MODE === "base") this.lobbyStart(); else if (typeof F !== "undefined" && F) this.combatStart(); } else { this.lobbyStop(.4); if (this.combatStop) this.combatStop(.5); } return this.musicOn; },
    splash(v = 1) { noise(.16, { f: 700, f2: 250, type: "bandpass", q: .8, g: .14 * v }); noise(.1, { f: 1500, type: "bandpass", q: 2, g: .05 * v, delay: .04 }); },
    skitter(v = 1) { for (let k = 0; k < 4; k++) noise(.03, { f: 600 + k * 40, type: "bandpass", q: 4, g: .09 * v, delay: k * .07 + Math.random() * .03 }); tone(55, .3, { type: "sine", g: .05 * v }); },
    ship() { noise(4, { f: 110, f2: 480, type: "bandpass", g: .32, at: 1.5 }); tone(45, 3.5, { type: "sine", g: .2, at: 1.2 }); },
  };
})();

// ---------- pixel sprites, drawn from rules (swap these for real art later) ----------
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function pixArt(w, h, fn, outline = "#0c0a08") {
  let grid = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid[y * w + x] = fn(x, y) || null;
  if (outline) { const o = grid.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (grid[i]) continue;
      if ((x > 0 && grid[i - 1]) || (x < w - 1 && grid[i + 1]) || (y > 0 && grid[i - w]) || (y < h - 1 && grid[i + w])) o[i] = outline; }
    grid = o; }
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"), im = g.createImageData(w, h);
  grid.forEach((col, i) => { if (!col) return; const [r, gg, b] = hexRGB(col); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; });
  g.putImageData(im, 0, 0); return c;
}
function silhouette(c, col = "#ffffff") { const s = document.createElement("canvas"); s.width = c.width; s.height = c.height; const g = s.getContext("2d"); g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return s; }
function line(set, w, x0, y0, x1, y1) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { set.add(y0 * w + x0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }

// the trooper, seen from above, facing right (east): helmet, shoulders, cape, rifle
const ARMOR = { light: "#ddd6bc", mid: "#aaa289", dark: "#6c6656", stripe: "#f2d230", cape: "#26335e", cape2: "#1a2344", visor: "#13202a", glint: "#86d0ea" };
function makeTrooper(frame, A = ARMOR) {
  return pixArt(24, 24, (x, y) => {
    const cy = 12;
    if (y >= cy && y <= cy + 1 && x >= 15 && x <= 22) return x >= 21 ? "#141414" : y === cy ? "#7a7a80" : "#46464c";   // rifle
    if (y === cy + 2 && (x === 16 || x === 17)) return "#46464c";                                                       // magazine
    const h = (x - 12) ** 2 + (y - cy - .5) ** 2;
    if (h <= 10.5) { if (x >= 14 && y >= cy && y <= cy + 1) return A.visor; if (x === 14 && y === cy - 1) return A.glint; if (y >= cy && y <= cy + 1 && x <= 13) return A.stripe; return h <= 4 ? A.light : A.mid; }
    const b = ((x - 11) / 3.9) ** 2 + ((y - cy - .5) / 6.8) ** 2;
    if (b <= 1) return y < cy ? A.mid : A.dark;
    const sw = frame ? 1 : -1, c = ((x - 7) / 3.3) ** 2 + ((y - cy - .5 - sw * .7) / 5.8) ** 2;
    if (c <= 1 && x <= 10) return (x + y) % 4 === 0 ? A.cape2 : A.cape;
    return null;
  });
}
// bugs: head, thorax and abdomen along the x axis, six legs that scissor between two frames
const BUG_COL = {
  scav:    { head: "#e0923e", mid: "#b8682a", dark: "#6a3416", leg: "#3e1e0c" },
  warrior: { head: "#d27a36", mid: "#9c4e22", dark: "#5a2810", leg: "#3a1a0a" },
  spitter: { head: "#c8a040", mid: "#8a6a24", dark: "#4a3814", leg: "#3a2a0c", sac: "#a6dc48", sac2: "#6eae2c" },
  charger: { head: "#e2bc84", mid: "#7c4a28", dark: "#4a2a16", leg: "#2e180a", plate: "#d0a670" },
};
function makeBug(type, frame) {
  const t = BUGT[type], c = BUG_COL[type], L = t.L, W = t.W, w = L + 8, h = W + 10, cy = h / 2 - .5, set = new Set();
  for (let i = 0; i < 3; i++) { const bx = 4 + L * (.4 + .14 * i), sw = (i + frame) % 2 ? 2 : -2;
    for (const s of [-1, 1]) line(set, w, bx, cy + s * W * .2, bx + sw + (i - 1) * 2, cy + s * (W / 2 + 3)); }
  return pixArt(w, h, (x, y) => {
    const dy = y - cy, hx = 4 + L * .86, tx = 4 + L * .6, ax = 4 + L * .27;
    if (x >= hx + L * .08 && x <= hx + L * .17 && Math.abs(Math.abs(dy) - W * .17) < 1.1) return c.dark;   // mandibles
    const head = ((x - hx) / (L * .13)) ** 2 + (dy / (W * .22)) ** 2, thor = ((x - tx) / (L * .17)) ** 2 + (dy / (W * .31)) ** 2, abd = ((x - ax) / (L * .27)) ** 2 + (dy / (W * .42)) ** 2;
    if (head <= 1) return c.head;
    if (thor <= 1) return c.plate ? (Math.abs(dy) < W * .2 ? c.plate : c.head) : c.mid;
    if (abd <= 1) { if (c.sac) return (x + y) % 3 ? c.sac : c.sac2; return Math.floor(x / 3) % 2 ? c.mid : c.dark; }
    if (set.has(y * w + x)) return c.leg;
    return null;
  });
}
