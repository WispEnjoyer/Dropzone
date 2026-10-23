// =====================================================================================
//  WEAPON SOUND: realistic gunshots, reloads and impacts, rendered sample by sample into buffers
//  (a few variants each, so rapid fire never sounds like a loop) and played back through the mix.
//  A shot is a supersonic crack, the muzzle blast (noise through a filter that closes fast), a chest
//  thump, the action cycling, then the report rolling away with a couple of slapback echoes.
//  Overrides the simpler synth versions in core.js / audio.js.
// =====================================================================================
Object.assign(AU, (() => {
  const ctx = () => AU.ctx, R = (a, b) => a + Math.random() * (b - a), BUF = {};
  // ---------- little DSP kit ----------
  // a TPT state-variable filter (stable at any cutoff, cheap to sweep)
  function svf() { let ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0, k = 1, lastF = -1, lastQ = -1, sr = 48000;
    return { set(f, q, s) { sr = s; if (f === lastF && q === lastQ) return; lastF = f; lastQ = q; const g = Math.tan(Math.PI * Math.min(f, sr * .45) / sr); k = 1 / q; a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; },
      run(x) { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; this.lp = v2; this.bp = v1; this.hp = x - k * v1 - v2; return v2; } }; }
  const sat = (x, d) => Math.tanh(x * d) / Math.tanh(d);
  function toBuffer(L, Rr, peak = .92) { const c = ctx(), n = L.length; let m = 1e-6; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(Rr[i]));
    const k = peak / m, b = c.createBuffer(2, n, c.sampleRate), l = b.getChannelData(0), r = b.getChannelData(1); for (let i = 0; i < n; i++) { l[i] = L[i] * k; r[i] = Rr[i] * k; } return b; }

  // ---------- the gunshot synth ----------
  // every number here is a physical-ish knob: decay times in seconds, filter sweeps in Hz
  const SHOT = {
    rifle:    { dur: .9, pres: 2500,  crack: [.88, .0019, 2800], body: [1.05, 5400, 1300, .017, .034], thump: [.28, 172, 62, .05, 1.9], mech: [.18, [2300, 3600, 5400]], tail: [.27, 1000, 360, .28], echo: [[.1, .19]], drive: 2 },
    smg:      { dur: .8, pres: 2800,  crack: [0.78, .0017, 3000], body: [1.02, 5200, 1540, .016, .028], thump: [.231, 185, 70, .045, 1.8], mech: [.22, [2600, 4100, 6100]], tail: [.24, 950, 390, .24], echo: [[.09, .18]], drive: 2 },
    shotgun:  { dur: 1.1, pres: 2000,  crack: [1, .0028, 1900], body: [1.15, 5000, 980, .02, .05], thump: [.4, 150, 52, .065, 2.2], mech: [.12, [1400, 2300]], tail: [.32, 1050, 300, .36], echo: [[.11, .22]], drive: 2.2 },
    marksman: { dur: 1.1, pres: 2900,  crack: [1.08, .002, 3200], body: [1.1, 6000, 1250, .018, .04], thump: [.34, 160, 56, .055, 2], mech: [.12, [1800, 3000]], tail: [.3, 1100, 340, .38], echo: [[.12, .22]], drive: 2.1 },
    pistol:   { dur: .8, pres: 2600,  crack: [.8, .0017, 3000], body: [1.02, 5300, 1500, .016, .03], thump: [.24, 182, 68, .045, 1.8], mech: [.22, [2000, 3100, 4600]], tail: [.24, 950, 390, .25], echo: [[.09, .18]], drive: 2 },
    revolver: { dur: 1, pres: 2100,  crack: [.95, .0024, 2400], body: [1.1, 4800, 1100, .019, .045], thump: [.36, 155, 54, .06, 2.1], mech: [.12, [1150, 2320, 3500]], tail: [.3, 1000, 320, .33], echo: [[.11, .2]], drive: 2.1 },
    mpistol:  { dur: .7, pres: 3000,  crack: [0.72, .0016, 3200], body: [0.96, 5000, 1760, .014, .026], thump: [.21, 190, 75, .04, 1.7], mech: [.22, [2800, 4300]], tail: [.2, 900, 420, .2], echo: [[.08, .16]], drive: 1.9 },
    // the Skull Company's rifles and the heavy gunner's belt-fed machine gun
    merc:     { dur: .9, pres: 2200,  crack: [.85, .0019, 2600], body: [1.05, 5000, 1200, .017, .036], thump: [.29, 165, 58, .05, 1.9], mech: [.12, [2000, 3200]], tail: [.28, 1000, 340, .3], echo: [[.1, .19]], drive: 2 },
    heavy:    { dur: 1, pres: 1900,  crack: [.95, .0024, 2200], body: [1.12, 4600, 950, .02, .045], thump: [.38, 150, 50, .06, 2.2], mech: [.14, [1600, 2700]], tail: [.32, 950, 300, .36], echo: [[.11, .21]], drive: 2.2 },
    cannon:   { dur: 1.5, pres: 1500,  crack: [.55, .0022, 2100], body: [1.2, 2400, 760, .03, .05], thump: [.7, 120, 42, .085, 2.2], mech: [.22, [1700, 2500, 3300]], tail: [.42, 560, 240, .5], echo: [[.12, .26], [.32, .12]], drive: 2.2 },
    sentry:   { dur: .8, pres: 2700,  crack: [.78, .0017, 3000], body: [1.02, 5400, 1450, .016, .03], thump: [.24, 180, 66, .045, 1.8], mech: [.25, [2500, 4000, 5800]], tail: [.24, 950, 390, .24], echo: [[.09, .18]], drive: 2 },
  };
  function renderShot(P) { const c = ctx(), sr = c.sampleRate, n = Math.floor(P.dur * sr), L = new Float32Array(n), Rr = new Float32Array(n), dry = new Float32Array(n);
    const fb = svf(), fp = svf(), ftL = svf(), ftR = svf(), fm = svf(); fp.set(P.pres || 2200, 1.3, sr); let hpS = 0, ph = 0, phS = 0, bL = 0, bR = 0;
    const [cg, ct, chp] = P.crack, [bg, bf0, bf1, bft, btau] = P.body, [tg, tf0, tf1, ttau, tdr] = P.thump, [mg, mfr] = P.mech, [lg, lf0, lf1, ltau] = P.tail, sub = P.sub;
    const hpA = Math.exp(-2 * Math.PI * chp / sr), jitter = R(.94, 1.06);
    const modes = mfr.map(f => ({ f: f * R(.97, 1.03), a: R(.5, 1), d: R(.007, .02), p: Math.random() * 6.28 })), mT = R(.004, .012);
    for (let i = 0; i < n; i++) { const t = i / sr, w = Math.random() * 2 - 1;
      // supersonic crack: an N-wave and a hiss of very short noise, high-passed
      let cr = w * Math.exp(-t / ct); hpS = hpA * (hpS + cr) - cr; cr = -hpS * cg; if (t < .0007) cr += (t < .00035 ? 1 : -1) * cg * .9;
      // muzzle blast: noise through a low-pass that slams shut
      if ((i & 15) === 0) fb.set(bf1 + (bf0 - bf1) * Math.exp(-t / (bft * jitter)), .9, sr);
      const body = (fb.run(w) + fp.run(w) * .8 * Math.exp(-t / (btau * .45))) * bg * (1 - Math.exp(-t / .0004)) * Math.exp(-t / btau);
      // the thump you feel in your chest: a falling sine, saturated
      const f = tf1 + (tf0 - tf1) * Math.exp(-t / .022); ph += 2 * Math.PI * f / sr; const th = sat(Math.sin(ph) * Math.exp(-t / (ttau * .6)) * 1.4, tdr) * tg * .18 * (1 - Math.exp(-t / .001));
      let s = cr + body + th;
      if (sub) { const fs = sub[2] + (sub[1] - sub[2]) * Math.exp(-t / .05); phS += 2 * Math.PI * fs / sr; s += Math.sin(phS) * sub[0] * .12 * Math.exp(-t / sub[3]) * (1 - Math.exp(-t / .004)); }
      // the action cycling: a few damped metal modes and a click, just after the blast
      if (t > mT) { const tt = t - mT; let m = 0; for (const o of modes) m += Math.sin(2 * Math.PI * o.f * tt + o.p) * o.a * Math.exp(-tt / o.d); if (tt < .002) m += w * 1.5; s += m * mg; }
      s = sat(s * .6, P.drive); dry[i] = s;
      // the report rolling off: brown-ish noise, slowly closing filter, decorrelated left and right
      bL = (bL + .06 * w) * .985; bR = (bR + .06 * (Math.random() * 2 - 1)) * .985;
      if ((i & 31) === 0) { const ft = lf1 + (lf0 - lf1) * Math.exp(-t / .16); ftL.set(ft, .7, sr); ftR.set(ft * 1.07, .7, sr); }
      const env = (1 - Math.exp(-t / .012)) * Math.exp(-t / (ltau * .55)) * lg;
      ftL.run(bL); ftR.run(bR); L[i] = s + ftL.bp * env * 1.6; Rr[i] = s + ftR.bp * env * 1.6; }
    // slapback echoes off the terrain: delayed, darker copies of the dry shot
    for (const [dl, eg] of P.echo) { const d0 = Math.floor(dl * R(.9, 1.1) * sr), off = Math.floor(R(0, .012) * sr); fm.set(1400, .6, sr); let lp = 0;
      for (let i = 0; i + d0 < n; i++) { lp = fm.run(dry[i]); L[i + d0] += lp * eg * .5; if (i + d0 + off < n) Rr[i + d0 + off] += lp * eg * .45; } }
    for (let i = 0; i < n; i++) { L[i] = sat(L[i], 1.2); Rr[i] = sat(Rr[i], 1.2); }
    // fade the last 60 ms so nothing clicks
    const fo = Math.floor(.06 * sr); for (let i = 0; i < fo; i++) { const k = i / fo; L[n - 1 - i] *= k; Rr[n - 1 - i] *= k; }
    return toBuffer(L, Rr); }
  const VARIANTS = 4;
  const queue = []; let qBusy = false;
  function pump() { if (qBusy || !queue.length) return; qBusy = true; setTimeout(() => { const [B, P] = queue.shift(); if (B.length < VARIANTS) B.push(renderShot(P)); qBusy = false; pump(); }, 30); }
  function shotBuf(key, sync = true) { const P = SHOT[key] || SHOT.rifle, B = BUF["s_" + key] = BUF["s_" + key] || [];
    if (!B.length && sync) B.push(renderShot(P)); for (let i = B.length + queue.filter(q => q[0] === B).length; i < VARIANTS; i++) queue.push([B, P]); pump();
    return B[Math.floor(Math.random() * B.length)]; }

  // ---------- mechanical foley: clicks, slides, thunks, cloth ----------
  function renderFoley(events, dur) { const c = ctx(), sr = c.sampleRate, n = Math.floor(dur * sr), L = new Float32Array(n), Rr = new Float32Array(n);
    const add = (i0, fn, len, pan = 0) => { const gl = Math.min(1, 1 - pan), gr = Math.min(1, 1 + pan); for (let i = 0; i < len && i0 + i < n; i++) { const v = fn(i / sr); L[i0 + i] += v * gl; Rr[i0 + i] += v * gr; } };
    for (const e of events) { const i0 = Math.floor(e.t * sr), g = e.g ?? 1, pan = e.pan ?? 0;
      if (e.k === "click") { const dc = Math.min(e.d || .005, .008), F = svf(), H = svf(), f1 = e.f * .5 * R(.95, 1.05), f2 = e.f * 1.31 * R(.95, 1.05); F.set(e.f, .8, sr); H.set(Math.min(9000, e.f * 2.2), .7, sr); let ph = 0;
        add(i0, t => { const w = Math.random() * 2 - 1, snap = (F.run(w) * 2.2 + (H.run(w), H.hp) * 1.2) * Math.exp(-t / .0012);
          const body = (Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t) * .6) * Math.exp(-t / dc) * .55; ph += 2 * Math.PI * (160 + 220 * Math.exp(-t / .004)) / sr;
          return (snap + body + Math.sin(ph) * Math.exp(-t / .012) * .45) * g; }, Math.floor(.06 * sr), pan); }
      else if (e.k === "slide") { const F = svf(), d = e.d; let gr = 0;
        add(i0, t => { const k = t / d; if (k > 1) return 0; if ((Math.floor(t * sr) & 15) === 0) F.set(e.f0 + (e.f1 - e.f0) * k, 2.5, sr); const grit = Math.random() < .004 ? (gr = 1) : (gr *= .97); return F.run((Math.random() * 2 - 1) * (.6 + gr)) * Math.sin(Math.PI * k) * g * 1.6; }, Math.floor(d * sr), pan); }
      else if (e.k === "thunk") { const f0 = e.f || 210, F = svf(); F.set(700, .7, sr); let ph = 0;
        add(i0, t => { ph += 2 * Math.PI * (f0 * (1 + Math.exp(-t / .006))) / sr; return (Math.sin(ph) * Math.exp(-t / .03) + F.run(Math.random() * 2 - 1) * Math.exp(-t / .012) * 1.5) * g; }, Math.floor(.2 * sr), pan); }
      else if (e.k === "cloth") { const F = svf(); F.set(e.f || 1600, .6, sr); let b = 0;
        add(i0, t => { const k = t / e.d; if (k > 1) return 0; b = (b + .2 * (Math.random() * 2 - 1)) * .9; return F.run(b) * Math.pow(Math.sin(Math.PI * k), 2) * (.6 + .4 * Math.sin(t * 37)) * g * 2; }, Math.floor(e.d * sr), pan); }
      else if (e.k === "ring") { const fr = [1, 1.59, 2.14, 2.83].map(m => e.f * m * R(.99, 1.01));
        add(i0, t => fr.reduce((s, f, j) => s + Math.sin(2 * Math.PI * f * t) * Math.exp(-t / (e.d / (1 + j * .5))) / (1 + j), 0) * g, Math.floor(e.d * 6 * sr), pan); }
      else if (e.k === "thud") { const F = svf(); F.set(e.f || 420, .8, sr); let ph = 0;   // a hit on a body: a low knock and a wet slap
        add(i0, t => { ph += 2 * Math.PI * (70 + 60 * Math.exp(-t / .01)) / sr; const w = Math.random() * 2 - 1; return (Math.sin(ph) * Math.exp(-t / .05) * 1.2 + F.run(w) * Math.exp(-t / .03) * 2 + w * Math.exp(-t / .004) * .5) * g; }, Math.floor(.25 * sr), pan); }
      else if (e.k === "tone") { const d = e.d, f2 = e.f2 || e.f; let ph = 0, pm = 0;   // a clean tone, or a bell (FM) when e.bell
        add(i0, t => { const f = f2 + (e.f - f2) * Math.exp(-t / (d * .4)); ph += 2 * Math.PI * f / sr; pm += 2 * Math.PI * f * 1.414 / sr; const idx = e.bell ? 2.2 * Math.exp(-t / (d * .25)) : 0;
          return Math.sin(ph + idx * Math.sin(pm)) * (1 - Math.exp(-t / .002)) * Math.exp(-t / (d * .35)) * g; }, Math.floor(d * 2.5 * sr), pan); }
      else if (e.k === "buzz") { const F = svf(); F.set(e.cut || 1200, .9, sr); let ph = 0;   // a filtered sawtooth with optional tremolo: klaxons, error tones
        add(i0, t => { const k = t / e.d; if (k > 1) return 0; const f = e.f + ((e.f2 || e.f) - e.f) * k; ph = (ph + f / sr) % 1; const trem = e.trem ? .6 + .4 * Math.sin(t * 2 * Math.PI * e.trem) : 1;
          return F.run(ph * 2 - 1) * Math.min(1, t / .01, (e.d - t) / .03) * trem * g; }, Math.floor(e.d * sr), pan); }
      else if (e.k === "voice") { const fs = (e.form || [[700, 6, 1], [1200, 8, .6], [2600, 10, .3]]).map(([f, q, a]) => { const F = svf(); F.set(f, q, sr); return [F, a]; }), d = e.d; let ph = 0, vib = Math.random() * 6;
        add(i0, t => { const k = t / d; if (k > 1) return 0; const f = (e.f0 + (e.f1 - e.f0) * Math.pow(k, .7)) * (1 + .03 * Math.sin(t * 31 + vib) + (Math.random() - .5) * (e.rough || .04)); ph = (ph + f / sr) % 1;
          const src = (ph < .08 ? 1 - ph / .08 : 0) * 2 - .16 + (Math.random() * 2 - 1) * (e.breath || .15); let y = 0; for (const [F, a] of fs) { F.run(src); y += F.bp * a; }
          return y * Math.sin(Math.PI * Math.min(1, k * 4)) * Math.pow(1 - k, .6) * (e.am ? .55 + .45 * Math.sin(t * 2 * Math.PI * e.am) : 1) * g * 3; }, Math.floor(d * sr), pan); }
      else if (e.k === "bubble") { let ph = 0; const f0 = e.f || R(500, 1400);   // a water drop: a sine that sweeps up as the bubble collapses
        add(i0, t => { ph += 2 * Math.PI * f0 * (1 + t * 18) / sr; return Math.sin(ph) * Math.exp(-t / .025) * (1 - Math.exp(-t / .001)) * g; }, Math.floor(.12 * sr), pan); }
      else if (e.k === "chitter") { const F = svf(); F.set(e.f || 3000, 3, sr); const rate = e.rate || 38;   // insect clicks
        add(i0, t => { const k = t / e.d; if (k > 1) return 0; const ph = (t * rate) % 1; return F.run((Math.random() * 2 - 1) * (ph < .25 ? 1 : .05)) * Math.sin(Math.PI * k) * g * 2.5; }, Math.floor(e.d * sr), pan); }
      else if (e.k === "dirt") { const F = svf(); F.set(e.f || 900, 1.1, sr);
        add(i0, t => { const w = Math.random() * 2 - 1, gr = Math.random() < .02 ? R(1, 3) : 1; return F.run(w * gr) * Math.exp(-t / .05) * g * 2; }, Math.floor(.25 * sr), pan); } }
    for (let i = 0; i < n; i++) { L[i] = sat(L[i], 1.3); Rr[i] = sat(Rr[i], 1.3); }
    return toBuffer(L, Rr, .9); }
  const foley = (name, make, n = 3) => { const B = BUF["f_" + name] = BUF["f_" + name] || []; if (B.length < n) B.push(make()); return B[Math.floor(Math.random() * B.length)]; };

  // ---------- playback ----------
  function play(buf, { g = 1, pan = 0, rate = 1, rv = 0, lp = 0, delay = 0 } = {}) { const c = ctx(); if (!c || !buf || g < .003) return;
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; const ga = c.createGain(); ga.gain.value = g; let n = s;
    if (lp) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; f.Q.value = .5; n = n.connect(f); }
    n.connect(ga); AU._out(ga, pan, rv); s.start(c.currentTime + delay); }
  const GAIN = { rifle: .55, smg: .5, shotgun: .72, marksman: .62, pistol: .48, revolver: .6, mpistol: .45 };
  let lastGun = 0;

  // foley recipes (times in seconds)
  const RACK = () => [{ k: "slide", t: 0, d: .09, f0: 1300, f1: 800, g: .7 }, { k: "click", t: .085, f: 1250, g: .9, d: .02 }, { k: "thunk", t: .09, f: 170, g: .6 },
    { k: "slide", t: .16, d: .08, f0: 850, f1: 1400, g: .7 }, { k: "click", t: .235, f: 1500, g: 1, d: .022 }, { k: "thunk", t: .24, f: 200, g: .7 }];
  const BOLT = () => [{ k: "click", t: 0, f: 2300, g: .6 }, { k: "slide", t: .03, d: .1, f0: 1800, f1: 1100, g: .5 }, { k: "slide", t: .2, d: .09, f0: 1100, f1: 1900, g: .5 }, { k: "click", t: .29, f: 2600, g: .9 }, { k: "thunk", t: .29, f: 240, g: .5 }];
  function reloadEvents(key, d) {
    const magOut = t => [{ k: "click", t, f: 2500, g: .7 }, { k: "slide", t: t + .02, d: .12, f0: 1700, f1: 800, g: .5 }];
    const pouch = (t, len) => [{ k: "cloth", t, d: len, f: 1500, g: .5, pan: -.2 }];
    const magIn = t => [{ k: "slide", t: t - .07, d: .07, f0: 800, f1: 1500, g: .45 }, { k: "thunk", t, f: 220, g: .9 }, { k: "click", t: t + .005, f: 2200, g: 1 }];
    const charge = t => [{ k: "slide", t, d: .09, f0: 1600, f1: 2600, g: .55 }, { k: "click", t: t + .09, f: 3000, g: .7 }, { k: "slide", t: t + .14, d: .05, f0: 2600, f1: 1400, g: .5 }, { k: "thunk", t: t + .19, f: 260, g: .9 }, { k: "click", t: t + .19, f: 2100, g: 1 }, { k: "click", t: t + .205, f: 3400, g: .35 }];
    if (key === "shotgun") { const ev = [], nS = Math.max(2, Math.round(d / .45)); for (let i = 0; i < nS; i++) { const t = .15 + i * (d - .55) / nS; ev.push(...pouch(t - .1, .1), { k: "slide", t, d: .07, f0: 900, f1: 1500, g: .5 }, { k: "click", t: t + .07, f: 1700, g: .9 }, { k: "thunk", t: t + .07, f: 190, g: .6 }); }
      return [...ev, ...RACK().map(e => ({ ...e, t: e.t + d - .32 }))]; }
    if (key === "revolver") { const ev = [{ k: "click", t: .1, f: 1900, g: .8 }, { k: "slide", t: .12, d: .1, f0: 1200, f1: 700, g: .4 }];
      for (let i = 0; i < 6; i++) ev.push({ k: "click", t: .3 + i * .035 + R(0, .02), f: R(3800, 5200), d: .003, g: .3 });   // brass dropping out
      for (let i = 0; i < 6; i++) ev.push({ k: "click", t: .7 + i * (d - 1.1) / 6, f: 2600, g: .5 });
      return [...ev, { k: "thunk", t: d - .2, f: 230, g: .9 }, { k: "click", t: d - .2, f: 2000, g: 1 }]; }
    if (key === "marksman") return [...magOut(.12), ...pouch(.3, .35), ...magIn(d * .5), ...BOLT().map(e => ({ ...e, t: e.t + d - .42 }))];
    if (key === "pistol" || key === "mpistol") return [...magOut(.08), ...pouch(.22, .3), ...magIn(d * .55), { k: "click", t: d - .16, f: 2400, g: .9 }, { k: "thunk", t: d - .16, f: 260, g: .9 }, { k: "click", t: d - .145, f: 3600, g: .3 }];
    return [...magOut(.12), ...pouch(.32, .4), ...magIn(d * .55), ...charge(d - .36)]; }

  return {
    // ---------- your guns ----------
    gun(key = "rifle", v = 1) { const c = ctx(); if (!c) return; const now = c.currentTime; if (now - lastGun < .03) return; lastGun = now;
      play(shotBuf(key), { g: (GAIN[key] || .5) * v, rate: R(.97, 1.03), rv: key === "shotgun" || key === "marksman" ? .22 : .18 });
      if (key === "shotgun") play(foley("rack", () => renderFoley(RACK(), .5)), { g: .5, delay: .36 });
      if (key === "marksman") play(foley("bolt", () => renderFoley(BOLT(), .5)), { g: .35, delay: .24 }); },
    warmGuns(keys) { if (!ctx()) return; for (const k of keys) shotBuf(k, false); },
    reload(key, dur = 2) { if (!ctx()) return; const k = key || "rifle", d = Math.max(.6, dur); play(foley("rl_" + k + "_" + d.toFixed(2), () => renderFoley(reloadEvents(k, d), d + .4), 2), { g: .55 }); },
    draw() { if (!ctx()) return; play(foley("draw", () => renderFoley([{ k: "cloth", t: 0, d: .18, f: 1800, g: .5 }, { k: "slide", t: .1, d: .06, f0: 1500, f1: 2400, g: .3 }, { k: "click", t: .17, f: 2700, g: .7 }, { k: "thunk", t: .17, f: 280, g: .4 }], .45)), { g: .45 }); },
    empty() { if (!ctx()) return; play(foley("empty", () => renderFoley([{ k: "click", t: 0, f: 1800, g: .9, d: .01 }, { k: "thunk", t: .002, f: 300, g: .3 }], .2)), { g: .4 }); },
    // ---------- their guns: the same synth, darkened and pushed into the reverb with distance ----------
    enemyGun(v = 1, pan = 0, heavy = false) { if (!ctx() || v < .03) return; const far = 1 - v;
      play(shotBuf(heavy ? "heavy" : "merc"), { g: (heavy ? .5 : .42) * Math.pow(v, 1.2), pan, rate: R(.95, 1.04) * (heavy ? .96 : 1), lp: 600 + Math.pow(v, 2) * 14000, rv: .35 + far * .7 }); },
    sentry(v = 1) { if (!ctx()) return; play(shotBuf("sentry"), { g: .32 * v, rate: R(.97, 1.03), lp: 1200 + v * 12000, rv: .35 }); },
    cannon(v = 1) { if (!ctx()) return; play(shotBuf("cannon"), { g: .5 * v, rate: R(.94, 1.04), lp: 1200 + v * 9000, rv: .5 }); },
    gat(v = 1) { if (!ctx()) return; play(shotBuf("sentry"), { g: .3 * v, rate: R(1.05, 1.12), lp: 1500 + v * 11000, rv: .4 }); },
    // a round passing close: a torn-air zip that drops in pitch, and the supersonic snap of a near miss
    whiz(pan = 0) { if (!ctx()) return; const f = R(2600, 3800); play(foley("whiz", () => renderFoley([{ k: "slide", t: 0, d: .14, f0: 4200, f1: 1500, g: .9 }], .2), 4), { g: .22, pan, rate: f / 3200 }); },
    snap(pan = 0) { if (!ctx()) return; play(foley("snap", () => renderFoley([{ k: "click", t: 0, f: 4800, g: 1, d: .004 }, { k: "dirt", t: .002, f: 3500, g: .3 }], .12), 3), { g: .3, pan }); },
    // ---------- impacts ----------
    impact(kind = "dirt", v = 1, pan = 0, delay = 0) { if (!ctx() || v < .04) return;
      const make = { flesh: () => [{ k: "thud", t: 0, f: 480, g: 1 }], dirt: () => [{ k: "dirt", t: 0, f: R(700, 1200), g: 1 }, { k: "dirt", t: .01, f: 2400, g: .3 }], rock: () => [{ k: "click", t: 0, f: R(2400, 3200), g: .6, d: .01 }, { k: "dirt", t: 0, f: 1600, g: .7 }], metal: () => [{ k: "ring", t: 0, f: R(900, 1400), d: .12, g: .5 }, { k: "click", t: 0, f: 3000, g: .6 }] }[kind] || (() => [{ k: "dirt", t: 0, f: 900, g: 1 }]);
      play(foley("imp_" + kind, () => renderFoley(make(), .3), 4), { g: .32 * v, pan, rate: R(.92, 1.08), rv: .15, delay: Math.min(.15, delay) }); },
    // ---------- everything else: interface, stratagems, creatures, people, water, the ship ----------
    click() { if (!ctx()) return; play(foley("ui_click", () => renderFoley([{ k: "click", t: 0, f: 3200, g: .6, d: .006 }, { k: "thunk", t: 0, f: 420, g: .25 }], .12), 2), { g: .3, rate: R(.97, 1.03) }); },
    key(i = 0) { if (!ctx()) return; play(foley("ui_key", () => renderFoley([{ k: "click", t: 0, f: 2800, g: 1, d: .004 }, { k: "thunk", t: .002, f: 320, g: .35 }], .15), 3), { g: .3, rate: 1 + Math.min(8, i) * .035 }); },
    fail() { if (!ctx()) return; play(foley("ui_fail", () => renderFoley([{ k: "buzz", t: 0, f: 150, f2: 120, d: .12, cut: 900, g: .7 }, { k: "buzz", t: .14, f: 120, f2: 95, d: .16, cut: 800, g: .7 }], .4), 1), { g: .3 }); },
    armed() { if (!ctx()) return; play(foley("ui_armed", () => renderFoley([{ k: "click", t: 0, f: 2600, g: .8 }, { k: "slide", t: .02, d: .06, f0: 1400, f1: 2200, g: .35 }, { k: "click", t: .09, f: 1900, g: 1, d: .007 }, { k: "thunk", t: .09, f: 210, g: .8 }], .3), 1), { g: .4 }); },
    beacon() { if (!ctx()) return; play(foley("beacon", () => renderFoley([{ k: "thunk", t: 0, f: 190, g: .9 }, { k: "click", t: 0, f: 2400, g: .6 }, { k: "click", t: .14, f: 3200, g: .5, d: .004 }, { k: "click", t: .26, f: 3200, g: .4, d: .004 }], .45), 1), { g: .38 }); },
    beep(i = 0) { if (!ctx()) return; const last = i === 3; play(foley(last ? "beep_go" : "beep", () => renderFoley(last ? [{ k: "buzz", t: 0, f: 880, d: .45, cut: 2400, g: .5 }, { k: "tone", t: 0, f: 110, d: .5, g: .6 }] : [{ k: "buzz", t: 0, f: 880, d: .07, cut: 2400, g: .5 }, { k: "click", t: 0, f: 2600, g: .4, d: .003 }], last ? .8 : .2), 1), { g: .26 }); },
    pickup() { if (!ctx()) return; play(foley("pickup", () => renderFoley([{ k: "cloth", t: 0, d: .14, f: 1600, g: .6 }, { k: "click", t: .08, f: 2600, g: .6 }, { k: "thunk", t: .08, f: 300, g: .4 }, { k: "click", t: .14, f: 3000, g: .4, d: .004 }], .35), 2), { g: .38 }); },
    alarm() { if (!ctx()) return; play(foley("alarm", () => renderFoley([{ k: "buzz", t: 0, f: 440, f2: 330, d: .55, cut: 1400, trem: 11, g: .8 }, { k: "buzz", t: .62, f: 440, f2: 330, d: .55, cut: 1400, trem: 11, g: .8 }], 1.3), 1), { g: .22, rv: .6 }); },
    clank() { if (!ctx()) return; play(foley("clank", () => renderFoley([{ k: "thunk", t: 0, f: 160, g: 1 }, { k: "ring", t: 0, f: R(520, 640), d: .25, g: .35 }, { k: "click", t: 0, f: 1800, g: .5 }], .9), 3), { g: .4, rv: .3 }); },
    // the bugs: wet, chitinous, alive
    squish(v = 1) { if (!ctx()) return; play(foley("squish", () => renderFoley([{ k: "thud", t: 0, f: 520, g: 1 }, { k: "dirt", t: .005, f: 650, g: .8 }, { k: "chitter", t: 0, d: .18, f: 2600, rate: 55, g: .35 },
      ...Array.from({ length: 4 }, (_, i) => ({ k: "bubble", t: .02 + i * R(.02, .05), g: .25 }))], .4), 4), { g: .45 * v, rate: R(.85, 1.1), rv: .15 }); },
    screech(v = 1) { if (!ctx() || v < .04) return; play(foley("screech", () => renderFoley([{ k: "voice", t: 0, d: .5, f0: R(420, 520), f1: R(230, 290), form: [[1300, 5, 1], [2700, 7, .8], [4100, 9, .4]], breath: .5, rough: .25, am: R(30, 45), g: .9 }, { k: "chitter", t: .05, d: .35, f: 3400, rate: 42, g: .4 }], .6), 4), { g: .32 * v, rate: R(.88, 1.12), rv: .35 }); },
    skitter(v = 1) { if (!ctx() || v < .04) return; play(foley("skitter", () => renderFoley([{ k: "chitter", t: 0, d: .45, f: 2200, rate: 24, g: .7 }, { k: "chitter", t: .1, d: .3, f: 3600, rate: 31, g: .4 }], .5), 3), { g: .4 * v, rate: R(.9, 1.1), rv: .2 }); },
    roar(d = 3, v = 1) { if (!ctx()) return; const dd = Math.round(Math.min(4, Math.max(1, d))); play(foley("roar" + dd, () => renderFoley([{ k: "voice", t: 0, d: dd, f0: 70, f1: 48, form: [[320, 3, 1], [760, 4, .7], [1500, 6, .3]], breath: .9, rough: .35, am: 13, g: 1 }, { k: "chitter", t: dd * .2, d: dd * .6, f: 1800, rate: 18, g: .3 }], dd + .3), 1), { g: .55 * v, rv: .5 }); },
    // people: a merc going down, a splash in the water
    grunt(v = 1, pan = 0) { if (!ctx() || v < .04) return; play(foley("grunt", () => renderFoley([{ k: "voice", t: 0, d: R(.32, .5), f0: R(150, 175), f1: R(85, 105), form: [[R(600, 760), 6, 1], [R(1050, 1250), 8, .55], [2500, 10, .25]], breath: .35, rough: .12, g: 1 },
      { k: "thud", t: R(.45, .6), f: 300, g: .8 }, { k: "dirt", t: R(.46, .62), f: 700, g: .5 }, { k: "cloth", t: .4, d: .2, f: 1000, g: .3 }], 1), 5), { g: .42 * v, pan, rate: R(.94, 1.06), rv: .25 }); },
    splash(v = 1) { if (!ctx() || v < .03) return; play(foley("splash", () => renderFoley([{ k: "dirt", t: 0, f: 1300, g: .8 }, { k: "dirt", t: .01, f: 500, g: .6 }, ...Array.from({ length: 8 }, () => ({ k: "bubble", t: R(.02, .25), g: R(.15, .35), f: R(400, 1600) }))], .45), 4), { g: .32 * Math.min(1, v), rate: R(.9, 1.1) }); },
    hurt() { if (!ctx()) return; play(foley("hurt", () => renderFoley([{ k: "thud", t: 0, f: 380, g: 1.3 }, { k: "click", t: .004, f: 1300, g: .35, d: .03 }, { k: "cloth", t: .01, d: .12, f: 900, g: .4 }], .35), 3), { g: .55, rate: R(.9, 1.05) }); },
  };
})());
