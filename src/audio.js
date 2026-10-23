// =====================================================================================
//  SOUND DESIGN: guns, reloads, footsteps by surface, breathing, planet ambience and the combat score.
//  Everything is synthesised; it builds on the primitives in core.js (AU._noise / AU._tone).
// =====================================================================================
Object.assign(AU, (() => {
  const N = (...a) => AU._noise(...a), T = (...a) => AU._tone(...a), R = (a, b) => a + Math.random() * (b - a);
  let lastGun = 0;
  // ---------- guns: a mechanical click, the body of the shot, a supersonic crack, a sub thump and a tail into the room ----------
  const GUN = {
    rifle:    { crack: 3200, body: 700, sub: 105, g: 1,    tail: .45, mech: 1900 },
    smg:      { crack: 3800, body: 950, sub: 125, g: .72,  tail: .3,  mech: 2300 },
    shotgun:  { crack: 1700, body: 420, sub: 72,  g: 1.5,  tail: .9,  mech: 1300, pump: true },
    marksman: { crack: 4200, body: 620, sub: 90,  g: 1.35, tail: 1,   mech: 1600, bolt: true },
    pistol:   { crack: 3000, body: 820, sub: 115, g: .78,  tail: .35, mech: 2400 },
    revolver: { crack: 2400, body: 520, sub: 78,  g: 1.4,  tail: .85, mech: 1500, ring: true },
    mpistol:  { crack: 3600, body: 1000, sub: 135, g: .6,  tail: .25, mech: 2600 },
  };
  return {
    gun(key = "rifle", v = 1) { if (!AU.ctx) return; const now = AU.ctx.currentTime; if (now - lastGun < .035) return; lastGun = now;
      const G = GUN[key] || GUN.rifle, k = G.g * v, rv = G.tail;
      T(G.mech * R(.95, 1.05), .012, { type: "square", g: .05 * k, cut: 4000 });                                         // action
      N(.025, { f: G.crack * R(.9, 1.1), type: "highpass", q: .7, g: .3 * k });                                          // crack
      N(.09, { f: G.body * 2.4, f2: G.body * .5, type: "bandpass", q: .9, g: .34 * k, rv: rv * .9 });                    // body
      N(.16, { f: 1400, f2: 160, g: .2 * k, rv });                                                                         // blast
      T(G.sub, .16, { type: "sine", g: .36 * k, f2: G.sub * .38 }); T(G.sub * .6, .22, { type: "triangle", g: .12 * k, f2: 28 });   // thump
      if (G.ring) T(1180, .5, { type: "sine", g: .02 * k, f2: 1150, delay: .01 });
      if (G.pump) { N(.05, { f: 900, type: "bandpass", q: 2.5, g: .16, delay: .34 }); T(170, .05, { type: "square", g: .05, cut: 900, delay: .34 }); N(.06, { f: 1300, type: "bandpass", q: 2.5, g: .18, delay: .46 }); T(230, .05, { type: "square", g: .06, cut: 1100, delay: .46 }); }
      if (G.bolt) { N(.04, { f: 1600, type: "bandpass", q: 3, g: .1, delay: .22 }); N(.05, { f: 1100, type: "bandpass", q: 3, g: .12, delay: .3 }); }
      if (!AU.physCas) AU.casing(key, G.pump ? .62 : G.bolt ? .38 : .28);
    },
    // brass hitting whatever you're standing on: bright pings on hard floors, a dull tick in the grass
    casing(key, delay = .3) { if (key === "revolver" || !AU.ctx) return; const soft = AU._surf === "grass" || AU._surf === "leaves" || AU._surf === "sand" || AU._surf === "snow";
      if (key === "shotgun") { N(.04, { f: 600, type: "bandpass", q: 2, g: soft ? .03 : .06, delay }); return; }
      if (soft) { N(.02, { f: 900, type: "bandpass", q: 2, g: .025, delay: delay + R(0, .1) }); return; }
      for (let i = 0; i < 2; i++) T(R(3400, 5200), .07, { type: "sine", g: .018, delay: delay + i * R(.06, .11), pan: R(.1, .4) }); },
    // ---------- reloads: mag out, a pouch, mag seated, then the charging handle; the timing follows the reload length ----------
    reload(key, dur = 2) { if (!AU.ctx) return;
      if (!key) { N(.06, { f: 900, type: "bandpass", q: 2, g: .14 }); T(110, .05, { type: "square", g: .05, cut: 500 }); N(.07, { f: 700, type: "bandpass", q: 2, g: .15, delay: .24 }); T(85, .08, { type: "square", g: .06, cut: 420, delay: .24 }); return; }
      const d = Math.max(.6, dur), click = (t, f, g = .12) => { g *= 1.4; N(.035, { f, type: "bandpass", q: 3, g, delay: t, rv: .15 }); T(f / 8, .04, { type: "square", g: g * .4, cut: f, delay: t }); };
      if (key === "shotgun") { const n = Math.max(2, Math.round(d / .45)); for (let i = 0; i < n; i++) { const t = .15 + i * (d - .5) / n; N(.05, { f: 500, type: "bandpass", q: 1.5, g: .06, delay: t - .05 }); click(t, 1400, .13); }
        click(d - .25, 900, .16); click(d - .12, 1250, .18); return; }
      if (key === "revolver") { click(.08, 1700, .1); for (let i = 0; i < 6; i++) T(R(2600, 4200), .09, { type: "sine", g: .02, delay: .25 + i * .04 }); for (let i = 0; i < 6; i++) click(.6 + i * (d - 1) / 6, 2100, .06); click(d - .2, 1500, .14); return; }
      click(.1, 1100, .12); T(140, .08, { type: "sine", g: .07, f2: 90, delay: .12 });                     // mag release and drop
      N(.25, { f: 700, f2: 400, type: "bandpass", q: .8, g: .05, delay: .3 });                            // hand in the pouch
      click(d * .55, 900, .16); T(95, .06, { type: "square", g: .06, cut: 500, delay: d * .55 });           // mag seated
      if (key !== "pistol" && key !== "mpistol") { click(d * .78, 1600, .12); click(d * .86, 1200, .15); } else click(d * .8, 1900, .12);   // bolt / slide
    },
    draw() { N(.12, { f: 600, f2: 1200, type: "bandpass", q: .8, g: .06 }); N(.03, { f: 1500, type: "bandpass", q: 3, g: .09, delay: .12 }); T(200, .04, { type: "square", g: .04, cut: 1200, delay: .12 }); },
    // ---------- footsteps: each surface has its own texture ----------
    foot(surf, run) { if (!AU.ctx) return; AU._surf = surf; const k = (run ? 1.35 : 1) * (surf === "metal" ? 1.4 : 2.6), p = R(-.15, .15);
      if (surf === "metal") { T(R(150, 175), .09, { type: "square", g: .035 * k, cut: 700, pan: p, rv: .3 }); T(R(410, 470), .12, { type: "sine", g: .012 * k, pan: p, rv: .3 }); N(.05, { f: 320, f2: 120, g: .12 * k, pan: p }); return; }
      if (surf === "rock") { N(.03, { f: 2600, type: "bandpass", q: 1.5, g: .06 * k, pan: p }); T(R(260, 320), .04, { type: "triangle", g: .04 * k, pan: p }); N(.06, { f: 260, f2: 100, g: .09 * k, pan: p });
        if (Math.random() < .35) N(.08, { f: 4200, type: "highpass", g: .02 * k, delay: .04, pan: p }); return; }   // a few loose pebbles
      if (surf === "leaves" || surf === "grass") { N(.07, { f: 220, f2: 90, g: .07 * k, pan: p });
        for (let i = 0; i < (surf === "leaves" ? 4 : 2); i++) N(.025, { f: R(2400, 4200), type: "bandpass", q: 2, g: (surf === "leaves" ? .035 : .02) * k, delay: i * R(.015, .03), pan: p });
        N(.12, { f: 1800, f2: 3500, type: "bandpass", q: .9, g: .022 * k, pan: p }); return; }
      if (surf === "snow") { for (let i = 0; i < 5; i++) N(.02, { f: R(1100, 1900), type: "bandpass", q: 2.5, g: .045 * k, delay: i * .014, pan: p }); N(.08, { f: 200, g: .06 * k, pan: p }); return; }
      if (surf === "gravel") { for (let i = 0; i < 4; i++) N(.03, { f: R(1800, 3200), type: "bandpass", q: 2, g: .04 * k, delay: i * .02, pan: p }); N(.07, { f: 240, f2: 90, g: .08 * k, pan: p }); return; }
      if (surf === "wood") { T(R(120, 150), .12, { type: "triangle", g: .05 * k, pan: p }); N(.05, { f: 900, type: "bandpass", q: 3, g: .07 * k, pan: p }); T(R(230, 270), .07, { type: "sine", g: .02 * k, pan: p, delay: .01 });   // a hollow knock on the planks
        if (Math.random() < .25) T(R(520, 700), .18, { type: "sawtooth", g: .006 * k, cut: 1400, delay: .03, pan: p }); return; }   // and the odd creak
      if (surf === "mud") { N(.16, { f: 1100, f2: 180, type: "bandpass", q: 2.5, g: .07 * k, pan: p }); N(.07, { f: 160, f2: 70, g: .08 * k, pan: p }); N(.06, { f: 2600, f2: 900, type: "bandpass", q: 4, g: .02 * k, delay: .09, pan: p }); return; }   // a wet squelch and the suck as the boot comes out
      N(.09, { f: 700, f2: 300, g: .07 * k, pan: p }); N(.06, { f: 180, f2: 80, g: .07 * k, pan: p });   // sand / dirt
    },
    // ---------- breathing: a shaped breath of noise through two vowel formants ----------
    breath(k = .5, inhale = false) { if (!AU.ctx || k < .05) return; const d = inhale ? .32 : .42 - k * .12; k *= 2.2;
      N(d, { f: inhale ? 900 : 650, f2: inhale ? 1300 : 480, type: "bandpass", q: 1.6, g: .05 * k, at: d * .35 });
      N(d, { f: inhale ? 2300 : 1700, type: "bandpass", q: 2.5, g: .022 * k, at: d * .3 });
      if (!inhale && k > .7) T(R(115, 135), d * .8, { type: "sawtooth", g: .006 * k, cut: 600, at: d * .3 }); },
    gasp() { AU.breath(1.2, true); N(.5, { f: 600, f2: 380, type: "bandpass", q: 1.4, g: .13, delay: .36, at: .15 }); },
    // ---------- planet ambience: insects and birds in the jungle, wind elsewhere ----------
    ambStart(biome) { const ctx = AU.ctx; if (!ctx || AU._amb) return; const A = AU._amb = { biome, nodes: [], timers: [], fledUntil: 0, live: true };
      const bed = (f, q, g, lfo, depth) => { const s = ctx.createBufferSource(); s.buffer = AU._nbuf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q;
        const ga = ctx.createGain(); ga.gain.value = 0; ga.gain.linearRampToValueAtTime(g, ctx.currentTime + 3); s.connect(fl).connect(ga).connect(AU._master);
        if (lfo) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = g * depth; o.connect(og).connect(ga.gain); o.start(); A.nodes.push(o); }
        s.start(); A.nodes.push(s); A.gains = (A.gains || []).concat(ga); };
      if (biome === "swamp") { bed(5200, 9, .012, 17, .8); bed(3900, 7, .008, 23, .9); bed(140, .8, .02); }
      if (biome === "arctic") bed(900, 6, .012, .15, .6);
      if (biome === "volcanic") bed(60, .7, .05, .08, .5);
      const loop = (fn, lo, hi) => { const go = () => { if (!A.live) return; fn(); A.timers.push(setTimeout(go, R(lo, hi) * 1000)); }; A.timers.push(setTimeout(go, R(lo, hi) * 600)); };
      if (biome === "swamp") { loop(() => { if (performance.now() > A.fledUntil) AU.bird(); }, 1.2, 4.5); loop(() => AU.frog(), 6, 14); }
      if (biome === "desert") loop(() => { if (performance.now() > A.fledUntil) AU.hawk(); }, 14, 30);
      if (biome === "arctic") loop(() => AU.ice(), 9, 22);
      if (biome === "volcanic") loop(() => AU.boom(.4, .25), 10, 25);
    },
    ambStop() { if (AU.rainStop) AU.rainStop(); const A = AU._amb; if (!A) return; AU._amb = null; A.live = false; A.timers.forEach(clearTimeout); const ctx = AU.ctx;
      (A.gains || []).forEach(g => g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1)); setTimeout(() => A.nodes.forEach(n => { try { n.stop(); } catch (_) {} }), 1200); },
    bird() { const p = R(-.8, .8), g = R(.016, .04), kind = Math.floor(Math.random() * 4), d = R(0, .05);
      if (kind === 0) { const n = 5 + Math.floor(Math.random() * 6), f = R(3200, 4400); for (let i = 0; i < n; i++) T(f * R(.97, 1.03), .045, { type: "sine", g, f2: f * .82, delay: d + i * .055, pan: p, rv: .3 }); }   // trill
      else if (kind === 1) { const f = R(1800, 2500); T(f, .22, { type: "sine", g, f2: f * 1.35, pan: p, rv: .3 }); T(f * 1.3, .3, { type: "sine", g: g * .9, f2: f * .95, delay: .28, pan: p, rv: .3 }); }   // two-note whistle
      else if (kind === 2) { for (let i = 0; i < 4; i++) { const f = R(1500, 3000); T(f, .09, { type: "sine", g: g * .8, f2: f * R(.7, 1.4), delay: i * .1, pan: p, rv: .3 }); } }   // warble
      else { const f = R(420, 560); T(f, .2, { type: "sine", g: g * 1.6, f2: f * .9, pan: p, rv: .4 }); T(f * .92, .3, { type: "sine", g: g * 1.4, f2: f * .8, delay: .32, pan: p, rv: .4 }); } },   // jungle hoot
    frog() { const p = R(-.9, .9), f = R(95, 140); for (let i = 0; i < 3; i++) T(f, .12, { type: "sawtooth", g: .02, cut: 420, delay: i * .16, pan: p }); },
    hawk() { const p = R(-.8, .8); T(2300, .8, { type: "sine", g: .016, f2: 1400, pan: p, rv: .6 }); T(2350, .8, { type: "sine", g: .008, f2: 1450, pan: p }); },
    ice() { const p = R(-.9, .9); N(.25, { f: 3000, f2: 600, type: "bandpass", q: 3, g: .03, pan: p, rv: .5 }); T(R(70, 110), .5, { type: "sine", g: .03, f2: 40, pan: p, rv: .5 }); },
    // gunfire scatters the birds: a burst of wing beats and alarm calls, then quiet for a while
    disturb() { const A = AU._amb; if (!A || A.biome !== "swamp" || performance.now() < A.fledUntil) return; A.fledUntil = performance.now() + 45000;
      for (let b = 0; b < 4; b++) { const p = R(-.9, .9), t0 = R(0, .4); for (let i = 0; i < 9; i++) N(.03, { f: R(900, 1400), type: "bandpass", q: 1.5, g: .03, delay: t0 + i * R(.035, .05), pan: p });
        T(R(2800, 3600), .07, { type: "sine", g: .02, f2: 2200, delay: t0 + .1, pan: p }); T(R(2800, 3600), .07, { type: "sine", g: .02, f2: 2200, delay: t0 + .22, pan: p }); } },
    // ---------- enemy soldiers: their rifles from a distance, rounds snapping past you, and voices over a radio ----------
    enemyGun(v = 1, pan = 0, heavy = false) { if (!AU.ctx || v < .03) return; const far = 1 - v, h = heavy ? .72 : 1;   // the machine gun: lower, chunkier, more thump
      N(.02, { f: (2600 - far * 1500) * h, type: "highpass", g: .14 * v, pan }); N((.12 + far * .1) * (heavy ? 1.3 : 1), { f: (1300 - far * 700) * h, f2: 160 * h, g: .24 * v * (heavy ? 1.15 : 1), pan, rv: .6 + far * .6 });
      T(95 * h, heavy ? .18 : .14, { type: "sine", g: .2 * v * (heavy ? 1.4 : 1), f2: 40 * h, pan }); },
    whiz(pan = 0) { if (!AU.ctx) return; const f = R(2800, 4200); N(.13, { f, f2: f * .55, type: "bandpass", q: 4, g: .07, pan }); T(f * .9, .1, { type: "sine", g: .015, f2: f * .5, pan }); },
    snap(pan = 0) { N(.015, { f: 5200, type: "highpass", g: .1, pan }); N(.04, { f: 1800, type: "bandpass", q: 2, g: .05, pan }); },
    // a short radio bark: squelch, a few voiced syllables with a falling contour, squelch out
    bark(text = "", v = 1, pan = 0, pitch = 1) { if (!AU.ctx || v < .04) return; const g = .07 * v, syl = Math.max(2, Math.min(7, Math.round(text.replace(/[^a-z]/gi, "").length / 2.6))), base = R(150, 175) * pitch;
      N(.03, { f: 3000, type: "bandpass", q: 2, g: g * .6, pan }); let t = .04;
      for (let i = 0; i < syl; i++) { const d = R(.07, .12), f = base * (1 + (i === 0 ? .18 : 0) - i * .03) * R(.94, 1.08);
        T(f, d, { type: "sawtooth", g: g * .55, cut: 1500, delay: t, pan, at: .012 }); T(f * 2, d, { type: "square", g: g * .1, cut: 2200, delay: t, pan, at: .012 });
        N(d * .8, { f: R(700, 1600), type: "bandpass", q: 3, g: g * .35, delay: t, pan }); t += d + R(.015, .045); }
      N(.04, { f: 2600, type: "bandpass", q: 2, g: g * .5, delay: t, pan }); N(.18, { f: 3500, type: "bandpass", q: 1, g: g * .15, delay: t + .02, pan }); },
    grunt(v = 1, pan = 0) { if (!AU.ctx) return; const f = R(120, 150); T(f, .3, { type: "sawtooth", g: .06 * v, f2: f * .6, cut: 900, pan }); N(.25, { f: 700, f2: 300, type: "bandpass", q: 1.5, g: .05 * v, pan }); },
    // ---------- intro score: D minor, i-VI-III-VII. Calm and lonely on the ship, drums and brass as the drop and the fight take over ----------
    introMusicStart() { const ctx = AU.ctx; if (!ctx || AU._im) return; const t0 = ctx.currentTime, bus = ctx.createGain(); bus.gain.value = 0; bus.gain.linearRampToValueAtTime(.24, t0 + 2); bus.connect(AU._master);
      const L = {}; for (const k of ["pad", "bell", "pulse", "drums", "lead"]) { L[k] = ctx.createGain(); L[k].gain.value = 0; L[k].connect(bus); }
      const dl = ctx.createDelay(1.5), fb = ctx.createGain(), dlp = ctx.createBiquadFilter(); dl.delayTime.value = 60 / 88 * .75; fb.gain.value = .42; dlp.type = "lowpass"; dlp.frequency.value = 2200; dl.connect(dlp).connect(fb).connect(dl); dlp.connect(L.bell);
      const M = AU._im = { bus, L, dl, step: 0, next: t0 + .15 }, s16 = 60 / 88 / 4, mtof = m => 440 * 2 ** ((m - 69) / 12);
      const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
      const voice = (type, f, t, a, peak, d, dest, cut, det = 0) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det; let n = o;
        if (cut) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(cut[0], t); fl.frequency.linearRampToValueAtTime(cut[1], t + a); fl.frequency.linearRampToValueAtTime(cut[2] || cut[1], t + a + d); o.connect(fl); n = fl; }
        n.connect(g).connect(dest); env(g, t, a, peak, d); o.start(t); o.stop(t + a + d + .05); };
      const drum = (t, f0, f1, d, g) => { const o = ctx.createOscillator(), ga = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); o.connect(ga).connect(L.drums); env(ga, t, .004, g, d); o.start(t); o.stop(t + d + .05);
        const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gn = ctx.createGain(); s.buffer = AU._nbuf; fl.type = "lowpass"; fl.frequency.value = 900; s.connect(fl).connect(gn).connect(L.drums); env(gn, t, .002, g * .35, .12); s.start(t, Math.random()); s.stop(t + .2); };
      const CH = [[38, 50, 53, 57, 62], [34, 46, 50, 53, 58], [41, 53, 57, 60, 65], [36, 48, 52, 55, 60]];   // Dm, Bb, F, C
      const BELL = [74, 77, 81, 79, 77, 74, 72, 74], LEAD = [[62, 4], [65, 2], [69, 2], [67, 6], [65, 2], [62, 8], [60, 4], [62, 4]];
      const tick = () => { if (AU._im !== M) return;
        while (M.next < ctx.currentTime + .3) { const t = M.next, st = M.step, inBar = st % 16, bar = Math.floor(st / 16) % 8, ch = CH[Math.floor(bar / 2)];
          if (inBar === 0 && bar % 2 === 0) for (const m of ch.slice(1)) for (const det of [-7, 7]) voice("sawtooth", mtof(m), t, 1.6, .022, s16 * 30, L.pad, [300, 1100, 500], det);   // strings pad
          if (inBar === 0 && bar % 2 === 0) voice("sine", mtof(ch[0] - 12), t, .8, .22, s16 * 30, L.pad);                                                                            // sub
          if (st % 4 === 0) voice("triangle", mtof(BELL[(st / 4) % 8] + (bar % 4 === 3 ? -2 : 0)), t, .004, .05, .7, M.dl);                                                     // bell motif
          if (st % 2 === 0) voice("sawtooth", mtof(ch[0]), t, .005, st % 8 === 0 ? .12 : .07, s16 * 1.4, L.pulse, [900, 400, 120]);                                             // pulse bass
          if (inBar === 0 || inBar === 8) drum(t, 120, 42, .5, .55); if (inBar === 4 || inBar === 12) drum(t, 200, 120, .2, .3);                                                  // taiko + tom
          if (bar % 2 === 1 && inBar >= 12) drum(t, 170 - (inBar - 12) * 15, 80, .18, .25);
          { let acc = 0; for (const [n, len] of LEAD) { if ((st % 32) === acc) voice("sawtooth", mtof(n + (bar >= 4 ? 12 : 0) - 12), t, .08, .05, s16 * len * .9, L.lead, [500, 1800, 900]); acc += len; } }   // brass line
          M.next += s16; M.step = (st + 1) % 128; }
        M.timer = setTimeout(tick, 80); };
      tick(); },
    // sections set how much of each layer plays
    introSection(name) { const M = AU._im; if (!M) return; const t = AU.ctx.currentTime, S = { ship: [.6, .7, .25, 0, 0], drop: [.7, .25, .7, .8, .35], fight: [.5, 0, .9, 1, .8], title: [.9, .45, .4, .5, 1] }[name] || [.6, .6, .3, 0, 0];
      ["pad", "bell", "pulse", "drums", "lead"].forEach((k, i) => M.L[k].gain.setTargetAtTime(S[i], t, name === "title" ? .25 : 1));
      if (name === "drop") { N(3, { f: 200, f2: 3000, type: "bandpass", q: .7, g: .08, at: 2.6 }); }
      if (name === "title") { T(73.4, 3, { type: "sine", g: .3, f2: 36 }); N(1.8, { f: 400, f2: 60, g: .2 }); } },
    introMusicStop(fade = 1.2) { const M = AU._im; if (!M) return; AU._im = null; clearTimeout(M.timer); const t = AU.ctx.currentTime; M.bus.gain.cancelScheduledValues(t); M.bus.gain.setValueAtTime(M.bus.gain.value, t); M.bus.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => M.bus.disconnect(), fade * 1000 + 200); },
    // a crew member talking in person: their babble voice, spread over the line
    speak(text, voice = {}, dur = 2) { if (!AU.ctx) return; const letters = text.replace(/[^a-z]/gi, ""), n = Math.min(26, Math.ceil(letters.length / 1.6));
      for (let i = 0; i < n; i++) setTimeout(() => AU.babble(letters[Math.floor(i / n * letters.length)] || "a", voice), i * (dur * 1000 * .8 / n)); },
    // ---------- combat score: a pulse that swells with the fight. 0 = silence, 1 = everything ----------
    combatStart() { const ctx = AU.ctx; if (!ctx || AU._cm || !AU.musicOn || (typeof INTRO !== "undefined" && INTRO.on)) return; const t0 = ctx.currentTime, bus = ctx.createGain(); bus.gain.value = .14; bus.connect(AU._master);
      const L = {}; for (const k of ["drone", "perc", "bass", "lead"]) { L[k] = ctx.createGain(); L[k].gain.value = 0; L[k].connect(bus); }
      const dl = ctx.createDelay(1), fb = ctx.createGain(), dlp = ctx.createBiquadFilter(); dl.delayTime.value = 60 / 132 * .75; fb.gain.value = .35; dlp.type = "lowpass"; dlp.frequency.value = 1600; dl.connect(dlp).connect(fb).connect(dl); dlp.connect(L.lead);
      const M = AU._cm = { bus, L, dl, step: 0, next: t0 + .1, level: 0, set: -1 }, s16 = 60 / 132 / 4, mtof = m => 440 * 2 ** ((m - 69) / 12);
      // a constant low drone underneath it all
      for (const [m, det] of [[28, -5], [40, 6], [47, -3]]) { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = det; f.type = "lowpass"; f.frequency.value = 260; o.connect(f).connect(L.drone); o.start(); (M.osc = M.osc || []).push(o); }
      const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
      const voice = (type, f, t, a, peak, d, dest, cut) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; let n = o;
        if (cut) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(cut[0], t); fl.frequency.exponentialRampToValueAtTime(cut[1], t + a + d); o.connect(fl); n = fl; }
        n.connect(g).connect(dest); env(g, t, a, peak, d); o.start(t); o.stop(t + a + d + .05); };
      const hit = (t, f0, f1, d, g, dest) => { const o = ctx.createOscillator(), ga = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); o.connect(ga).connect(dest); env(ga, t, .003, g, d); o.start(t); o.stop(t + d + .05); };
      const snare = (t, g) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ga = ctx.createGain(); s.buffer = AU._nbuf; f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = .8; s.connect(f).connect(ga).connect(L.perc); env(ga, t, .002, g, .16); s.start(t, Math.random()); s.stop(t + .2); hit(t, 190, 120, .1, g * .8, L.perc); };
      const ROOT = [40, 36, 33, 35], BASS = [0, 0, 12, 0, 0, 0, 7, 0, 0, 0, 12, 0, 3, 0, 5, 7], LEAD = [12, 15, 19, 15, 24, 19, 15, 12];
      const tick = () => { if (AU._cm !== M) return;
        while (M.next < ctx.currentTime + .3) { const t = M.next, st = M.step, inBar = st % 16, bar = Math.floor(st / 16) % 8, root = ROOT[Math.floor(bar / 2)];
          if (inBar === 0 || inBar === 6 || inBar === 10) hit(t, 110, 38, .32, .5, L.perc);                                          // kick
          if (inBar === 4 || inBar === 12) snare(t, .2);                                                                               // snare
          if (bar % 2 === 1 && inBar >= 12) hit(t, 160 - (inBar - 12) * 18, 70, .2, .22, L.perc);                                    // tom fill
          if (st % 2 === 0) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ga = ctx.createGain(); s.buffer = AU._nbuf; f.type = "highpass"; f.frequency.value = 6000; s.connect(f).connect(ga).connect(L.perc); env(ga, t, .001, inBar % 4 === 2 ? .03 : .015, .04); s.start(t, Math.random()); s.stop(t + .06); }
          voice("sawtooth", mtof(root - 12 + BASS[inBar]), t, .005, .16, s16 * 1.6, L.bass, [900, 160]);                              // bass ostinato
          if (inBar === 0 && bar % 2 === 0) for (const iv of [0, 3, 7]) voice("sawtooth", mtof(root + 12 + iv), t, .6, .03, s16 * 30, L.lead, [400, 1200]);   // string swell
          if (st % 2 === 0) voice("square", mtof(root + 12 + LEAD[(st / 2) % 8]), t, .004, .022, .12, M.dl, [2400, 600]);            // high ostinato
          M.next += s16; M.step = (st + 1) % 128; }
        M.timer = setTimeout(tick, 80); };
      tick(); },
    combatStop(fade = 2) { const M = AU._cm; if (!M) return; AU._cm = null; clearTimeout(M.timer); const t = AU.ctx.currentTime; M.bus.gain.setTargetAtTime(0, t, fade / 3);
      setTimeout(() => { (M.osc || []).forEach(o => o.stop()); M.bus.disconnect(); }, fade * 1000 + 300); },
    // the fight's intensity, 0..1: each layer fades in at its own threshold
    combat(level) { const M = AU._cm; if (!M || Math.abs(level - M.set) < .03) return; M.set = level; const t = AU.ctx.currentTime, sm = (a, b) => Math.max(0, Math.min(1, (level - a) / (b - a)));
      M.L.drone.gain.setTargetAtTime(.28 * sm(.02, .2), t, 1.2); M.L.bass.gain.setTargetAtTime(.75 * sm(.15, .45), t, .8); M.L.perc.gain.setTargetAtTime(sm(.3, .6), t, .6); M.L.lead.gain.setTargetAtTime(.8 * sm(.55, .9), t, 1); },
  };
})());
