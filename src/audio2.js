// =====================================================================================
//  BIG SOUNDS: the drop pod's ride down (a continuous engine that follows the drop), the impact, the door
//  charges, explosions, orbital strikes, jets and the Pelican. Built from layered noise (brown for weight,
//  white for air), resonant filters, soft saturation and the reverb, aiming for "real" rather than retro.
// =====================================================================================
Object.assign(AU, (() => {
  const R = (a, b) => a + Math.random() * (b - a), BUF = {};
  const ctx = () => AU.ctx;
  // deep brown noise: the body of rumbles, roars and explosions
  const brown = () => { if (BUF.brown) return BUF.brown; const c = ctx(), n = c.sampleRate * 4, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let l = 0;
    for (let i = 0; i < n; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } return (BUF.brown = b); };
  const curve = k => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; };
  const shaper = k => { const w = ctx().createWaveShaper(); w.curve = curve(k); w.oversample = "2x"; return w; };
  // a one-shot noise event with an envelope, a sweeping filter, optional grit, pan and reverb
  function burst({ dur = .5, buf = "white", type = "lowpass", f = 800, f2, q = .7, g = .3, at = .003, delay = 0, rv = 0, drive = 0, pan = 0, curveExp = true } = {}) {
    const c = ctx(); if (!c || g < .002) return; const t = c.currentTime + delay, s = c.createBufferSource(); s.buffer = buf === "brown" ? brown() : AU._nbuf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) (curveExp ? fl.frequency.exponentialRampToValueAtTime(f2, t + dur) : fl.frequency.linearRampToValueAtTime(f2, t + dur));
    const ga = c.createGain(); ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(g, t + at); ga.gain.exponentialRampToValueAtTime(.0008, t + dur);
    let n = s.connect(fl); if (drive) n = n.connect(shaper(drive)); n.connect(ga); AU._out(ga, pan, rv); s.start(t, Math.random() * 2); s.stop(t + dur + .1); }
  function sub(f, f2, dur, g, { delay = 0, at = .004, type = "sine", pan = 0 } = {}) { const c = ctx(); if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), ga = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(g, t + at); ga.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(ga); AU._out(ga, pan, 0); o.start(t); o.stop(t + dur + .05); }
  // struck metal: inharmonic partials that ring and beat against each other
  function ring(base, dur, g, { delay = 0, pan = 0, rv = .4 } = {}) { const c = ctx(); if (!c) return; const t = c.currentTime + delay;
    for (const [m, a] of [[1, 1], [1.59, .7], [2.14, .5], [2.83, .35], [3.71, .22], [4.6, .14]]) { const o = c.createOscillator(), ga = c.createGain(); o.frequency.value = base * m * R(.995, 1.005);
      ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(g * a, t + .003); ga.gain.exponentialRampToValueAtTime(.0006, t + dur * (1.1 - m * .12)); o.connect(ga); AU._out(ga, pan, rv); o.start(t); o.stop(t + dur + .05); } }
  // gravel and chunks pattering down after something big
  function debris(dur, g, { delay = 0, rv = .3, soft = false } = {}) { const n = Math.floor(dur * 26); for (let i = 0; i < n; i++) { const k = i / n, d = delay + k * dur + R(0, .05);
      burst({ dur: R(.02, .07), f: soft ? R(400, 1200) : R(900, 3500), type: "bandpass", q: R(2, 6), g: g * (1 - k) * R(.4, 1), delay: d, pan: R(-.7, .7), rv }); } }

  // ---------- the drop pod's engine: one set of looping layers, steered every frame by the drop ----------
  function engineStart() { const c = ctx(); if (!c || AU._eng) return AU._eng; const E = AU._eng = { L: {} }, now = c.currentTime;
    E.bus = c.createGain(); E.bus.gain.value = 0; E.bus.gain.linearRampToValueAtTime(.55, now + .3);
    E.hull = c.createBiquadFilter(); E.hull.type = "lowpass"; E.hull.frequency.value = 2400; E.hull.Q.value = .8;   // we're inside the pod: everything comes through the hull
    E.bus.connect(E.hull); AU._out(E.hull, 0, .25);
    const layer = (name, buf, type, f, q, drive) => { const s = c.createBufferSource(); s.buffer = buf === "brown" ? brown() : AU._nbuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.value = 0; let n = s.connect(fl); if (drive) n = n.connect(shaper(drive)); n.connect(g).connect(E.bus); s.start(now, Math.random() * 3); E.L[name] = { s, fl, g }; return E.L[name]; };
    layer("rumble", "brown", "lowpass", 110, .9, 2);       // the whole pod shaking
    layer("roar", "brown", "bandpass", 420, .6, 4);         // air tearing past
    layer("hiss", "white", "highpass", 2600, .5);           // the high edge of the wind
    layer("rattle", "white", "bandpass", 1150, 7);          // loose panels and bolts
    layer("burn", "brown", "lowpass", 520, 1.1, 6);         // retro thrusters
    // the rattle stutters, the burn flutters
    for (const [nm, hz, depth] of [["rattle", 23, .9], ["burn", 31, .4], ["rumble", 7, .35]]) { const o = c.createOscillator(), og = c.createGain(); o.type = nm === "rattle" ? "square" : "sine"; o.frequency.value = hz; og.gain.value = 0; o.connect(og).connect(E.L[nm].g.gain); o.start(); E.L[nm].lfo = o; E.L[nm].depth = og; E.L[nm].dd = depth; }
    E.hum = c.createOscillator(); E.hum.frequency.value = 58; E.humG = c.createGain(); E.humG.gain.value = 0; E.hum.connect(E.humG).connect(E.bus); E.hum.start();   // the pod's own systems
    E.last = now; return E; }
  function engineSet(E, tg, tau = .15) { const t = ctx().currentTime; for (const k in tg) { const L = E.L[k]; if (!L) continue; const [g, f] = tg[k];
      L.g.gain.setTargetAtTime(g, t, tau); if (f) L.fl.frequency.setTargetAtTime(f, t, tau * 1.5); if (L.depth) L.depth.gain.setTargetAtTime(g * L.dd, t, tau); } }
  return {
    // called every frame of a drop
    dropTick(D) { const c = ctx(); if (!c) return; const st = D.stage, live = st === "launch" || st === "space" || st === "entry" || st === "fall";
      if (!live) { if (AU._eng && st !== "land") AU.dropStop(.3); return; }
      const E = engineStart(), now = c.currentTime, dt = Math.min(.1, now - E.last); E.last = now;
      const pl = D.plasma || 0, cl = D.cloud || 0, sh = D.shake || 0, v = D.vs || D.v || 0;
      let T;
      if (st === "launch") T = { rumble: [.9, 140], roar: [.35, 300], hiss: [.05], rattle: [.25], burn: [0] };
      else if (st === "space") T = { rumble: [.12, 90], roar: [.02, 250], hiss: [0], rattle: [.03], burn: [0] };   // the quiet of space: only the hull and the systems
      else if (st === "entry") T = { rumble: [.6 + pl * .6, 100 + pl * 60], roar: [.25 + pl * 1.1, 300 + pl * 650], hiss: [.05 + pl * .25 + cl * .2], rattle: [.15 + pl * .5], burn: [0] };
      else { const air = Math.min(1, v / 100); T = { rumble: [.35 + air * .5, 110], roar: [.2 + air * .7 + pl * .5, 500 + air * 300], hiss: [.12 + air * .3], rattle: [.12 + sh * 6], burn: D.burn ? [1.15, 650] : [0] };
        if (D.burn) { T.rumble = [1, 160]; T.roar[0] *= .5; } }
      engineSet(E, T); E.humG.gain.setTargetAtTime(st === "space" ? .045 : .015, now, .3);
      // plasma crackle, hull groans and the odd bang in the turbulence
      if (st === "entry" || (st === "fall" && pl > .05)) { if (Math.random() < dt * (6 + pl * 30)) burst({ dur: R(.01, .04), f: R(1500, 5000), type: "bandpass", q: R(1, 4), g: R(.03, .09) * (.4 + pl), pan: R(-.6, .6) }); }
      if (Math.random() < dt * (st === "space" ? .35 : st === "entry" ? .9 : .5)) { const f = R(55, 95); sub(f, f * R(.6, .8), R(.6, 1.4), st === "space" ? .07 : .12, { type: "sawtooth" }); burst({ dur: R(.4, .9), buf: "brown", f: R(180, 420), type: "bandpass", q: 4, g: .08 }); }
      if ((st === "entry" || st === "fall") && Math.random() < dt * (.4 + sh * 8)) { burst({ dur: R(.15, .35), buf: "brown", f: 600, f2: 120, g: .09, drive: 3 }); ring(R(160, 240), .5, .008); }
    },
    dropStop(fade = .12) { const E = AU._eng; if (!E) return; AU._eng = null; const t = ctx().currentTime; E.bus.gain.cancelScheduledValues(t); E.bus.gain.setValueAtTime(E.bus.gain.value, t); E.bus.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { for (const k in E.L) { try { E.L[k].s.stop(); E.L[k].lfo && E.L[k].lfo.stop(); } catch (_) {} } try { E.hum.stop(); } catch (_) {} E.hull.disconnect(); }, fade * 1000 + 200); },
    // the clamps let go and the pod drops down the shaft and out of the ship
    podLaunch() { burst({ dur: .25, buf: "brown", f: 2000, f2: 200, g: .6, drive: 4 }); sub(85, 30, .9, .6); ring(130, 1.4, .03, { rv: .6 });
      burst({ dur: .7, f: 3000, f2: 600, type: "bandpass", q: .8, g: .12, delay: .02 });   // hydraulic hiss
      burst({ dur: 1.6, buf: "brown", f: 300, f2: 900, type: "bandpass", q: .7, g: .4, at: .5, delay: .1, drive: 2 }); },   // the whoosh down the shaft
    // retro thrusters lighting: a hard ignition, then the engine's burn layer takes over
    retroIgnite() { burst({ dur: .5, buf: "brown", f: 1800, f2: 300, g: .35, drive: 5 }); sub(60, 35, 1, .3); burst({ dur: .25, f: 4000, f2: 900, type: "bandpass", g: .2 }); },
    // hitting the ground at 11 m/s in a steel can
    podImpact() { AU.dropStop(.05);
      burst({ dur: .12, buf: "white", f: 3500, f2: 500, g: .85 }); burst({ dur: .6, buf: "brown", f: 1500, f2: 80, g: 1.6, drive: 6, rv: .5 });
      sub(72, 24, 1.2, 1.4); sub(46, 18, 1.9, .9, { delay: .03 });
      ring(96, 2.6, .05, { delay: .01, rv: .7 }); ring(151, 1.6, .03, { delay: .02 });
      for (let i = 0; i < 6; i++) burst({ dur: R(.05, .25), buf: "brown", f: R(300, 900), type: "bandpass", q: R(1, 3), g: R(.12, .3), delay: R(0, .25), drive: 2 });
      debris(1.6, .1, { delay: .2, soft: true }); burst({ dur: 3.2, buf: "brown", f: 400, f2: 90, g: .22, at: .1, delay: .1, rv: .6 }); },
    // the door's explosive bolts: three cracks and a pressure punch, the slab tearing away
    doorBlast() { for (let i = 0; i < 3; i++) { burst({ dur: .05, f: 5000, type: "highpass", g: .35, delay: i * .035 }); burst({ dur: .12, buf: "brown", f: 1600, f2: 300, g: .45, delay: i * .035, drive: 4 }); }
      sub(65, 28, .8, .7, { delay: .03 }); burst({ dur: 1.2, buf: "brown", f: 700, f2: 120, g: .35, delay: .06, rv: .6 }); burst({ dur: .6, f: 1200, f2: 4000, type: "bandpass", q: .8, g: .1, delay: .1 });
      ring(240, .9, .02, { delay: .05 }); },
    // heavy metal landing in the dirt (the door, a crate)
    metalHit(v = 1) { burst({ dur: .2, buf: "brown", f: 900, f2: 150, g: .3 * v, drive: 2 }); ring(R(170, 230), 1, .03 * v, { rv: .4 }); debris(.4, .05 * v, { soft: true }); },
    // explosions: a crack, the fireball, a long low tail; further away is duller, later and more echo
    boom(size = 1, v = 1) { const c = ctx(); if (!c) return; const s = Math.max(.2, size), far = 1 - Math.min(1, v), dl = far * .18;
      burst({ dur: .06, f: 6000 - far * 4500, type: "highpass", g: .45 * v * Math.min(1, s), delay: dl });
      burst({ dur: .5 + s * .5, buf: "brown", f: 2200 - far * 1500, f2: 70, g: 1.4 * v * Math.min(1.2, .5 + s * .5), drive: 5, delay: dl, rv: .4 + far * .8 });
      sub(60, 22, .9 + s * .6, 1.25 * v * Math.min(1.2, .4 + s * .6), { delay: dl });
      burst({ dur: 1.5 + s * 1.5, buf: "brown", f: 350, f2: 50, g: .3 * v * Math.min(1, s), at: .12, delay: dl + .05, rv: .9 });
      if (s > .7 && v > .3) debris(1 + s * .6, .07 * v, { delay: dl + .35 }); },
    // something big inbound from orbit: a falling shriek that ends in the strike
    incoming(v = 1, dur = 1.3) { burst({ dur, f: 4500, f2: 500, type: "bandpass", q: 3, g: .14 * v, at: dur * .8, curveExp: false }); burst({ dur, f: 1200, f2: 200, type: "bandpass", q: 1.2, g: .12 * v, at: dur * .85 });
      sub(900, 120, dur, .04 * v, { at: dur * .9, type: "sawtooth" }); },
    // the railcannon: an electric whip-crack and a column of pressure
    railgun(v = 1) { burst({ dur: .08, f: 7000, type: "highpass", g: .4 * v }); sub(2200, 80, .35, .08 * v, { type: "sawtooth" }); burst({ dur: .6, f: 3000, f2: 400, type: "bandpass", q: 6, g: .12 * v }); },
    // a fast jet: whine dropping in pitch as it passes overhead, with the roar behind it
    jet() { const c = ctx(); if (!c) return; burst({ dur: 3, buf: "brown", f: 300, f2: 1200, type: "bandpass", q: .7, g: .55, at: 1.4, drive: 2, rv: .5 });
      sub(2400, 900, 2.8, .035, { at: 1.3, type: "sawtooth" }); burst({ dur: 2.6, f: 3000, f2: 1400, type: "bandpass", q: 2, g: .12, at: 1.3 }); burst({ dur: 3.5, buf: "brown", f: 160, f2: 60, g: .4, at: 1.5, rv: .6 }); },
    // the Pelican: twin turbines, a steady whine and a thick roar; louder the closer it is
    pelican(level, pan = 0) { const c = ctx(); if (!c) return;
      if (level <= .01) { const P = AU._pel; if (P) { AU._pel = null; const t = c.currentTime; P.g.gain.setTargetAtTime(0, t, .4); setTimeout(() => { P.nodes.forEach(n => { try { n.stop(); } catch (_) {} }); P.g.disconnect(); }, 2000); } return; }
      if (!AU._pel) { const P = AU._pel = { nodes: [] }, now = c.currentTime; P.g = c.createGain(); P.g.gain.value = 0; P.pan = c.createStereoPanner(); P.g.connect(P.pan); AU._out(P.pan, 0, .5);
        const roar = c.createBufferSource(); roar.buffer = brown(); roar.loop = true; const rf = c.createBiquadFilter(); rf.type = "lowpass"; rf.frequency.value = 700; const rg = c.createGain(); rg.gain.value = .9; roar.connect(rf).connect(shaper(2)).connect(rg).connect(P.g); roar.start(now);
        const air = c.createBufferSource(); air.buffer = AU._nbuf; air.loop = true; const af = c.createBiquadFilter(); af.type = "bandpass"; af.frequency.value = 1800; af.Q.value = 1.2; const ag = c.createGain(); ag.gain.value = .12; air.connect(af).connect(ag).connect(P.g); air.start(now);
        for (const [f, gg] of [[1420, .018], [1436, .018], [2870, .008]]) { const o = c.createOscillator(), og = c.createGain(); o.type = "sawtooth"; o.frequency.value = f; og.gain.value = gg; const of = c.createBiquadFilter(); of.type = "lowpass"; of.frequency.value = 3500; o.connect(of).connect(og).connect(P.g); o.start(now); P.nodes.push(o); }
        P.nodes.push(roar, air); }
      const P = AU._pel, t = c.currentTime; P.g.gain.setTargetAtTime(Math.min(1, level) * .55, t, .25); P.pan.pan.setTargetAtTime(pan, t, .25); },
    // the old "ship" cue (Pelican arriving or leaving): a big turbine swell
    ship() { burst({ dur: 4, buf: "brown", f: 200, f2: 700, type: "bandpass", q: .7, g: .45, at: 1.6, drive: 2, rv: .6 }); sub(1100, 1500, 3.5, .02, { at: 1.5, type: "sawtooth" }); },
    pod() { AU.incoming(.7, 2.4); },   // a supply pod falling in from orbit
    rumble() { burst({ dur: 2.8, buf: "brown", f: 90, f2: 40, g: .5, at: .5, rv: .5 }); },
  };
})());
