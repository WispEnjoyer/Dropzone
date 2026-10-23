// =====================================================================================
//  BUG VOICES: the recorded insect sounds (sounds/*.mp3, embedded as SOUNDS), decoded once and played
//  pitched per bug: the Scavenger high and skittery, the Spitter wet and middling, the Warrior low,
//  the Charger and the breach roar deep and slowed right down. Each call picks a random take.
// =====================================================================================
Object.assign(AU, (() => {
  const BUF = {}; let loading = null;
  function load() { const c = AU.ctx; if (!c || loading || typeof SOUNDS === "undefined") return; loading = true;
    for (const k in SOUNDS) { const bin = atob(SOUNDS[k]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      c.decodeAudioData(u.buffer).then(b => { BUF[k] = b; }).catch(() => {}); } }
  const pick = a => a[Math.floor(Math.random() * a.length)], R = (a, b) => a + Math.random() * (b - a);
  // which takes each bug uses, and how far each is pitched (playback rate: < 1 is lower and slower)
  const SM = ["sm1", "sm2", "sm3", "sm4", "sm5", "sm6"], SD = ["sd1", "sd2", "sd3", "sd4", "sd5", "sd6", "sd8"], GD = ["gd1", "gd2", "gd4"];
  const VOICE = {
    scav:    { alert: [SM, 1.3], attack: [SM, 1.45], hurt: [SM, 1.55], death: [SD, 1.3], g: .5 },
    spitter: { alert: [SM, .95], attack: [["scream2"], 1.1], spit: [["scream2", "sm4"], .9], hurt: [SD, 1.15], death: [SD, .85], g: .6 },
    warrior: { alert: [["gm1", "sm6", "sm1"], .9], attack: [SM, .72], hurt: [["gh1"], 1.35], death: [GD, 1.2], g: .7 },
    charger: { alert: [["gm1"], .78], attack: [["gm1"], .7], charge: [["gm1", "scream2"], .62], hurt: [["gh1"], .85], death: [GD, .78], g: .9 },
    breach:  { alert: [["gm1"], .6], g: .8 },
    stalker: { alert: [["gm1", "scream2"], .5], attack: [["scream2"], .45], hurt: [["gh1"], .55], death: [GD, .45], g: 1 },
  };
  const last = {};
  // footsteps in water: single recorded steps, never the same take twice running
  const WET = ["wet1", "wet2", "wet3", "wet4", "wet5", "wet6", "wet7", "wet8", "wet9", "wet10", "wet11"]; let lastWet = "";
  // the rain bed: a recorded loop, padded at both ends with its own wrap-around so the loop points sit in clean audio
  const RAIN_LOOP = [.15, 9.00092970521542]; let rain = null;
  return {
    loadBugSounds: load,
    wetStep(v = 1, pan = 0) { const c = AU.ctx; if (!c) return false; if (!loading) load(); let k; do k = pick(WET); while (k === lastWet && WET.length > 1); lastWet = k;
      const b = BUF[k]; if (!b) return false; const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = R(.92, 1.08);
      const g = c.createGain(); g.gain.value = .55 * v; s.connect(g); AU._out(g, pan + R(-.1, .1), .15); s.start(); return true; },
    rainStart(level = .5) { const c = AU.ctx; if (!c || rain) return; if (!loading) load(); rain = { live: true };
      const go = () => { if (!rain || !rain.live) return; const b = BUF.rain; if (!b) { rain.timer = setTimeout(go, 300); return; }
        const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = RAIN_LOOP[0]; s.loopEnd = RAIN_LOOP[0] + RAIN_LOOP[1];
        const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(level, c.currentTime + 2.5); s.connect(g).connect(AU._master); s.start(0, RAIN_LOOP[0] + Math.random() * RAIN_LOOP[1]); Object.assign(rain, { s, g }); };
      go(); },
    rainLevel(level) { const c = AU.ctx; if (c && rain && rain.g) rain.g.gain.setTargetAtTime(level, c.currentTime, .4); },
    rainStop() { const c = AU.ctx, r = rain; rain = null; if (!r) return; r.live = false; clearTimeout(r.timer); if (r.g && c) { r.g.gain.cancelScheduledValues(c.currentTime); r.g.gain.setValueAtTime(r.g.gain.value, c.currentTime); r.g.gain.linearRampToValueAtTime(0, c.currentTime + 1); }
      if (r.s) setTimeout(() => { try { r.s.stop(); } catch (_) {} }, 1200); },
    // kind: alert, attack, spit, charge, hurt, death · v: volume (distance already applied) · pan: -1..1
    bug(type, kind, v = 1, pan = 0) { const c = AU.ctx; if (!c || v < .03) return; if (!loading) load();
      const V = VOICE[type] || VOICE.warrior, e = V[kind] || V.alert; if (!e) return;
      const key = type + kind, now = c.currentTime; if (last[key] && now - last[key] < (kind === "hurt" ? .35 : .12)) return; last[key] = now;   // no machine-gun stacking of the same cry
      const b = BUF[pick(e[0])]; if (!b) return;
      const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = e[1] * R(.93, 1.07);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2500 + v * 12000;   // far away: duller
      const g = c.createGain(); g.gain.value = V.g * Math.min(1.2, v); s.connect(lp).connect(g); AU._out(g, pan, .25 + (1 - Math.min(1, v)) * .4); s.start(); },
  };
})());
