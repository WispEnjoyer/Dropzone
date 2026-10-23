// =====================================================================================
//  INTRO: a short scripted film played live in the engine. The camera tours the ship while the crew explain
//  the loop, then a real drop, a firefight that plays out to the end, and an extraction. Skippable any time.
//  Pacing is driven by the dialogue: a scene only moves on once its lines have been said and could be read.
// =====================================================================================
const INTRO = { on: false, i: -1, t: 0, gen: null, fld: null, loaded: false, cap: null, done: null, queue: [], cur: null, gapT: 0, capTxt: null, capT: 0, fade: 0, said: new Set() };
const INTRO_SYS = 1;   // Myrrh IV: the jungle reads best on screen
const INTRO_SEEN = "dz_intro_seen";
// who speaks: crew in person (a tag over their head and their own voice), everyone else over the radio
const INTRO_CAST = {
  nav: { name: "LT. ODEN", pos: [2.2, 2.1, 2.12], voice: () => VOICES.navigator }, comms: { name: "SPC. REYES", pos: [11.8, 2.1, 2.12], voice: () => VOICES.comms },
  armorer: { name: "SGT. RHO", pos: [3.4, 2.15, 7.4], voice: () => VOICES.armorer },
  qm: { name: "QUARTERMASTER", radio: true, pitch: 1.05 }, chief: { name: "DECK CHIEF", radio: true, pitch: .9 }, flight: { name: "FLIGHT CONTROL", radio: true, pitch: 1.12 },
  you: { name: "YOU", radio: true, pitch: .95 }, dest: { name: "DESTROYER COMMAND", radio: true, pitch: .82 }, pel: { name: "PELICAN-1", radio: true, pitch: 1 } };
const lineDur = text => 1.7 + text.length * .062;          // long enough to read comfortably
const introK = () => clamp(INTRO.t / (INTRO_SHOTS[INTRO.i].len || 6), 0, 1);
// turn the camera toward whoever is talking in person, otherwise toward the shot's own heading
function introLook(def, k = 2) { const c = INTRO.cur && INTRO_CAST[INTRO.cur.who]; let want = def;
  if (c && c.pos) { const a = Math.atan2(c.pos[2] - BASE.z, c.pos[0] - BASE.x); if (Math.abs(angDiff(def, a)) < 1.3) want = def + angDiff(def, a) * .85; }
  BASE.a += angDiff(BASE.a, want) * Math.min(1, INTRO.dt * k); }
const introBase = fn => (t, dt) => { fn(t, dt); updateBase(dt); renderBase(); };
const introLine = (who, text) => INTRO.queue.push({ who, text });
const showCap = (big, small, d = 4.2) => { INTRO.capTxt = [big, small]; INTRO.capT = d; };

const INTRO_SHOTS = [
  { name: "bridge", min: 7, cap: ["SECTOR DRACO", "The colonies have gone dark. Someone has to go down there."],
    lines: [["nav", "Myrrh IV, dead ahead. The colony went quiet three days ago."], ["comms", "I'm picking up radio chatter down there. Mercenaries. Skull Company."]],
    setup() { Object.assign(BASE, { x: 7, z: 6.4, a: -Math.PI / 2, pitch: .1 }); },
    step: introBase(() => { const k = introK(); BASE.z = 6.4 - k * 1.2; BASE.pitch = .1 - k * .05; introLook(-Math.PI / 2); }) },
  { name: "war", min: 6, cap: ["THE WAR TABLE", "Travel between star systems."],
    lines: [["nav", "Pick a system on the table and I'll get us there."]],
    step: introBase(() => { const a = 2.2 + introK() * 1.1; BASE.x = 7 + Math.cos(a) * 2.9; BASE.z = 3 + Math.sin(a) * 2.9; BASE.a = Math.atan2(3 - BASE.z, 7 - BASE.x); BASE.eyeY = 2.55; BASE.pitch = -.58; }) },
  { name: "armory", min: 6, cap: ["THE ARMORY", "Weapons, armour and stratagems. Spend what you earn."],
    lines: [["armorer", "New plates, fresh mags. Try to bring them back in one piece!"]],
    setup() { BASE.eyeY = null; Object.assign(BASE, { x: 5.6, z: 7.6, a: Math.PI - .12, pitch: -.06 }); },
    step: introBase(() => { BASE.z = 7.6 + introK() * 1.8; introLook(Math.PI - .12, 1.2); }) },
  { name: "range", min: 7, cap: ["THE FIRING RANGE", "Walk in and your gun comes out. Learn its kick."],
    lines: [["qm", "Range is hot. Targets up."], ["qm", "Nice grouping. Now try it with something shooting back."]],
    setup() { Object.assign(BASE, { x: 15.6, z: 11, a: 0, pitch: -.03 }); for (let k = 0; k < 40; k++) updateBase(1 / 24); INTRO.fireT = 0; },
    step: introBase((t, dt) => { const R = RANGE, S = R.slots && R.slots[R.slot], tg = R.targets.find(q => q.hp > 0 && q.fall === 0); if (!tg) return;
      const ty = .01 + 2 * tg.s * .5, a = Math.atan2(tg.cz - BASE.z, tg.x - BASE.x), p = Math.atan2(ty - EYE, tg.x - BASE.x);
      BASE.a += (a - BASE.a) * Math.min(1, dt * 4); BASE.pitch += (p - BASE.pitch) * Math.min(1, dt * 4); INTRO.fireT -= dt;
      if (S && t > 1.5 && INTRO.fireT <= 0 && Math.abs(a - BASE.a) < .04) { INTRO.fireT = .16; S.ammo = Math.max(S.ammo, 5); rangeFire(S, S.w); } }) },
  { name: "bay", min: 6, cap: ["THE LAUNCH BAY", "Choose an operation at a Starfall pod, then drop."],
    lines: [["chief", "Pick your operation at any pod. Pod two is fuelled and hot."]],
    setup() { Object.assign(BASE, { x: 7, z: 11.4, a: Math.PI / 2, pitch: .02 }); },
    step: introBase((t, dt) => { BASE.z = 11.4 + introK() * 2.5; BASE.bob += dt * 6; }) },
  { name: "drop", noTalkWait: true, noSkip: true, until: () => !DROP && F && INTRO.after > 1.6,
    setup() { const m = systemMissions(INTRO_SYS)[0]; m.mods = []; m.obj = "uplink"; BASE.selected = m; while (!INTRO.loaded) introGen(50);
      startDrop(1, 7, 15.7); FLD = INTRO.fld; DROP.gen = INTRO.gen; DROP.loaded = true; INTRO.after = 0; showCap("DROP", "From orbit to the surface in one hard ride.", 4.5); },
    step(t, dt) { const D = DROP, st = D && D.stage;
      if (F) { F.bugs.length = 0; F.callouts = []; F.patrolT = 1e9; F.breachCool = 1e9; for (const n of F.nests || []) n.spT = 1e9; }   // nobody waiting at the LZ: the fight comes to you
      if (st === "count" && !INTRO.said.has("c")) { INTRO.said.add("c"); introLine("flight", "Starfall two, you are clear. Releasing in three, two..."); }
      if (st === "entry" && !INTRO.said.has("e")) { INTRO.said.add("e"); introLine("flight", "Hull temperature climbing. Hang on."); }
      if (st === "fall" && !INTRO.said.has("f")) { INTRO.said.add("f"); introLine("flight", "Retro burn. Brace for impact!"); }
      if ((st === "door" || st === "exit") && !INTRO.said.has("d")) { INTRO.said.add("d"); showCap("THE DOOR BLOWS", "From here on, you're on your own."); }
      const k = D ? (st === "space" ? 2 : st === "count" || st === "board" ? 1.5 : 1) : 1;
      let left = k; while (left > 0 && DROP) { updateField(dt * Math.min(1, left)); left -= 1; }
      if (!DROP) { INTRO.after += dt; F.bugs.length = 0; updateField(dt); } renderFieldMode(); } },
  { name: "fight", noTalkWait: true, until: () => INTRO.clear && !INTRO.cur && !INTRO.queue.length && INTRO.clearT > 1.2,
    setup() { window.__god = true; F.bugs.length = 0; F.patrolT = 1e9; F.breachCool = 1e9; for (const n of F.nests) n.spT = 1e9;
      const p = F.p, C = fieldCamera(), f = camBasis(C.yaw, 0).f.map(v => -v); INTRO.fwd = f;
      // a patrol walking out of the treeline toward you
      for (let k = 0; k < 5; k++) { const d = 30 + (k % 2) * 4, s = (k - 2) * 4.5, b = spawnBug("merc", p.x + f[0] * d - f[2] * s, p.z + f[2] * d + f[0] * s, "idle");
        b.face = Math.atan2(-f[2], -f[0]); b.home = { x: p.x + f[0] * 12 - f[2] * s, z: p.z + f[2] * 12 + f[0] * s }; b.wt = { ...b.home }; b.wT = 99; }
      INTRO.aim = null; INTRO.fireT = 0; INTRO.retarget = 0; INTRO.combat = -1; INTRO.struck = INTRO.clear = false; INTRO.clearT = 0;
      introLine("you", "Boots on the ground. LZ is quiet... too quiet."); },
    step(t, dt) { const p = F.p, live = F.bugs.filter(b => b.dead == null);
      for (const n of F.nests) n.spT = 1e9; F.patrolT = 1e9; F.breachCool = 1e9;
      // they walk in until one of them spots you (or gets close enough that it has to happen)
      if (INTRO.combat < 0) { const near = live.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 21); if (live.some(b => b.state === "hunt") || near || t > 9) { INTRO.combat = t; if (!live.some(b => b.state === "hunt")) humanAlert(live[0]); showCap("COMPLETE THE OBJECTIVE", "Enemy squads take cover, flank and call for backup.", 4.6); } }
      if (INTRO.combat >= 0) { const ct = t - INTRO.combat;
        if (!INTRO.aim || INTRO.aim.dead != null || (INTRO.retarget -= dt) < 0) { INTRO.retarget = 1.5; INTRO.aim = live.filter(b => los3(p.x, p.y + EYE3, p.z, b.x, b.y + 1.2, b.z)).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] || live[0]; }
        const tg = INTRO.aim; INTRO.fireT -= dt;
        if (tg && ct > .8) { const a = Math.atan2(tg.z - p.z, tg.x - p.x), pi = Math.atan2(tg.y + 1.1 - p.y - EYE3, Math.hypot(tg.x - p.x, tg.z - p.z)); p.yaw += angDiff(p.yaw, a) * Math.min(1, dt * 3.5); p.pitch += (pi - p.pitch) * Math.min(1, dt * 3.5);
          if (INTRO.fireT <= 0 && Math.abs(angDiff(p.yaw, a)) < .04) { INTRO.fireT = .15; p.ammo = Math.max(p.ammo, 5); fire3(); } }
        // the last of them get an orbital strike
        if (!INTRO.struck && ((live.length <= 2 && ct > 7) || ct > 18) && live.length) { INTRO.struck = true; INTRO.strikeT = 2.4; introLine("dest", "Orbital strike inbound on your marker. Keep your head down.");
          showCap("CALL IN STRATAGEMS", "Hold Q, punch in the code, throw the beacon.", 5); }
        if (INTRO.struck && INTRO.strikeT > 0) { INTRO.strikeT -= dt; if (INTRO.strikeT <= 0 && live.length) { const cx = live.reduce((s, b) => s + b.x, 0) / live.length, cz = live.reduce((s, b) => s + b.z, 0) / live.length;
            F.strikes.push({ x: cx, z: cz, t: 1.2, r: 9, dmg: 2000, warn: true, beam: true }); } }
        if (!live.length && !INTRO.clear) { INTRO.clear = true; introLine("you", "Area clear. Heading for extraction."); }
        if (INTRO.clear) INTRO.clearT += dt; }
      updateField(dt); renderFieldMode(); } },
  { name: "extract", noTalkWait: true, until: () => F.ext.state === "rope" && INTRO.ropeT > 3.5 && !INTRO.cur && !INTRO.queue.length,
    setup() { const p = F.p, e = F.ext; F.bugs.length = 0; p.x = e.x + 18; p.z = e.z + 7; p.y = fieldH(p.x, p.z); p.yaw = Math.atan2(e.z - p.z, e.x - p.x); p.pitch = .2; F.obj.done = true; e.state = "inbound"; e.t = 0; INTRO.ropeT = 0;
      showCap("GET TO EXTRACTION", "Call the Pelican, hold the pad, climb the rope.", 5); introLine("pel", "Pelican one, on approach. Get to the pad, trooper!"); },
    step(t, dt) { const p = F.p, e = F.ext; F.patrolT = 1e9; F.breachCool = 1e9; p.pitch += (.12 - p.pitch) * Math.min(1, dt); if (e.state === "rope") { INTRO.ropeT += dt; if (!INTRO.said.has("r")) { INTRO.said.add("r"); introLine("pel", "Rope's down. Climb aboard and let's go home."); } }
      updateField(dt); renderFieldMode(); } },
  { name: "title", min: 4.5, title: true, step(t, dt) { updateField(dt); renderFieldMode(); } },
];
function introGen(budget) { if (INTRO.loaded) return; const t0 = performance.now();
  while (performance.now() - t0 < budget) { const r = INTRO.gen.next(); if (r.done) { INTRO.loaded = true; break; } } }

function introEl() { let el = document.getElementById("intro"); if (el) return el; el = document.createElement("div"); el.id = "intro";
  el.innerHTML = `<div class="ifade"></div><div class="ibar t"></div><div class="ibar b"></div><div class="says"></div><div class="radio"><b></b><span></span></div><div class="cap"><div class="big"></div><div class="small"></div></div>
    <div class="ttl"><div class="logo">DROPZONE</div><div class="tag">Do the job. Get out alive.</div></div><div class="skip">SPACE · ESC · CLICK TO SKIP</div>`;
  STAGE.appendChild(el); el.addEventListener("mousedown", e => { e.stopPropagation(); introSkip(); }); return el; }
function playIntro(done) {
  try { localStorage.setItem(INTRO_SEEN, "1"); } catch (_) {}
  AU.init(); Object.assign(INTRO, { done, on: true, i: -1, cap: null, queue: [], cur: null, gapT: 0, capTxt: null, capT: 0, fade: 0, said: new Set() }); INTRO_SHOTS.forEach(S => { S.queued = false; });
  document.body.classList.add("intro-on");
  const el = introEl(); el.hidden = false; el.classList.remove("titled", "dark"); $("screen").hidden = true;
  enterBase(); setSkyPlanet(INTRO_SYS); AU.lobbyStop(.4); AU.introMusicStart(); AU.introSection("ship");
  // build the jungle in the background while the ship scenes play
  const m = systemMissions(INTRO_SYS)[0]; m.mods = []; m.obj = "uplink"; INTRO.fld = {}; INTRO.gen = generateField(m, INTRO.fld); INTRO.loaded = false;
  initBugSprites(); ensurePodModels(); introNext();
}
function playScene(name, cb) { const i = INTRO_SHOTS.findIndex(s => s.name === name), S = INTRO_SHOTS[i]; AU.init();
  Object.assign(INTRO, { on: true, scene: cb, i, t: 0, queue: [], cur: null, gapT: 0, capT: 0, capTxt: null, fade: 0, cap: null, said: INTRO.said || new Set() }); S.queued = false;
  S.len = S.lines ? Math.max(S.min || 6, 2.6 + S.lines.reduce((s, [, tx]) => s + lineDur(tx) + .4, 0) + .8) : S.min || 6;
  document.body.classList.add("intro-on"); const el = introEl(); el.hidden = false; el.classList.remove("titled", "dark"); el.querySelector(".skip").textContent = S.noSkip ? "" : "SPACE · SKIP SCENE";
  if (S.setup) S.setup(); if (S.cap) showCap(S.cap[0], S.cap[1]); }
function introSceneDone() { const cb = INTRO.scene; INTRO.scene = null; INTRO.on = false; INTRO.cur = null; INTRO.queue = []; INTRO.fade = 0;
  const el = introEl(); el.hidden = true; el.classList.remove("dark"); document.body.classList.remove("intro-on"); if (!F) BASE.eyeY = null; if (cb) cb(); }
function introNext() { INTRO.i++; INTRO.t = 0; const S = INTRO_SHOTS[INTRO.i]; if (!S) { introEnd(); return; }
  S.len = S.lines ? Math.max(S.min || 6, 2.6 + S.lines.reduce((s, [, tx]) => s + lineDur(tx) + .4, 0) + .8) : S.min || 6;
  if (S.setup) S.setup(); if (S.cap) showCap(S.cap[0], S.cap[1]); if (S.title) introEl().classList.add("titled");
  const sec = { drop: "drop", fight: "fight", extract: "fight", title: "title" }[S.name]; if (sec) AU.introSection(sec); }
function introCaption(text) { const el = introEl(), c = el.querySelector(".cap"), key = text ? text[0] : null; if (key === INTRO.cap) return; INTRO.cap = key;
  if (!text) { c.classList.remove("on"); return; } c.querySelector(".big").textContent = text[0]; c.querySelector(".small").textContent = text[1]; c.classList.remove("on"); void c.offsetWidth; c.classList.add("on"); }
// runs instead of the normal frame while the intro is on
function introFrame(dt) {
  const S = INTRO_SHOTS[INTRO.i]; if (!S) return; keys.clear(); mouse.down = false; INTRO.t += dt; INTRO.dt = dt;
  if (INTRO.i < 5) introGen(6);
  // a scene's own lines start once its caption has been up for a moment
  if (S.lines && !S.queued && INTRO.t > 2.6) { S.queued = true; for (const [w, tx] of S.lines) introLine(w, tx); }
  // one line at a time, with a short breath between them
  if (INTRO.cur) { INTRO.cur.t -= dt; if (INTRO.cur.t <= 0) { INTRO.cur = null; INTRO.gapT = .4; } }
  else if ((INTRO.gapT -= dt) <= 0 && INTRO.queue.length) { const l = INTRO.queue.shift(); l.dur = lineDur(l.text); l.t = l.dur; INTRO.cur = l; introVoice(l); }
  S.step(INTRO.t, dt);
  INTRO.capT -= dt; introCaption(INTRO.capT > 0 ? INTRO.capTxt : null); introTags();
  // move on when the scene is done and everything has been said, through a quick fade to black
  const talkDone = S.noTalkWait || (S.queued && !INTRO.cur && !INTRO.queue.length), done = S.until ? S.until() : INTRO.t >= S.len && talkDone;
  if (INTRO.fade > 0) { INTRO.fade -= dt; if (INTRO.fade <= 0) { introEl().classList.remove("dark"); INTRO.scene ? introSceneDone() : introNext(); } }
  else if (done) { if (S.title) introEnd(); else { INTRO.fade = .45; introEl().classList.add("dark"); } }
}
function introVoice(l) { const c = INTRO_CAST[l.who]; if (c.radio) AU.bark(l.text, 1, 0, c.pitch); else AU.speak(l.text, c.voice(), l.dur * .8); }
function introEnd() { if (!INTRO.on) return; INTRO.on = false; const el = introEl(); el.hidden = true; document.body.classList.remove("intro-on");
  AU.introMusicStop(.8); AU.pelican(0); AU.dropStop(); AU.windStop(); AU.ambStop(); AU.combatStop(.3); AU.lobbyStop(.2); AU.setSpace("in"); window.__god = false;
  // put the game back exactly as it was: no field, no drop, the range reset, the ship's own planet in the window
  if (FLD && F) { for (const c of FLD.chunks || []) freeParts(c.parts); for (const k of ["parts", "padParts", "nestPartsAlive", "nestPartsDead", "crateParts", "boxParts", "sampleParts", "sentryParts", "gunParts", "rocketParts"]) freeParts(FLD[k]); for (const o of F.objs) if (o.own) freeParts(o.parts); }
  F = null; DROP = null; FLD = null; INTRO.gen = null; INTRO.fld = null; BASE.selected = null; BASE.eyeY = null;
  Object.assign(RANGE, { up: 0, slots: null, holes: [], sparks: [], shots: 0, hits: 0, kills: 0 }); RANGE.targets.forEach(t => Object.assign(t, { hp: t.max, fall: 0, downT: 0 }));
  setSkyPlanet(curSystem()); $("fhud").hidden = true; MODE = "base";
  Object.assign(BASE, { x: 7, z: 10.5, a: -Math.PI / 2, pitch: 0, zone: "" }); BASE.entered = false;
  const d = INTRO.done; INTRO.done = null; if (d) d(); else enterBase(); }
addEventListener("keydown", e => { if (!INTRO.on) return; if (e.key === " " || e.key === "Escape" || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); introSkip(); } }, true);
function introSkip() { if (!INTRO.scene) return introEnd(); const S = INTRO_SHOTS[INTRO.i]; if (S && S.noSkip) return; introSceneDone(); }
// speech tags over the speakers' heads, mercenary callouts during the fight, and radio lines under the top bar
function introTags() { const el = introEl(), VP = R3.lastVP, out = [];
  const tag = (x, y, z, name, text, cls) => { const s = VP && project(VP, x, y, z); if (!s || s[0] < 60 || s[0] > stageW - 60 || s[1] < stageH * .14 || s[1] > stageH * .86) return false;
    out.push(`<div class="say ${cls}" style="left:${s[0] | 0}px;top:${s[1] | 0}px">${name ? `<b>${name}</b>` : ""}<span>${text}</span></div>`); return true; };
  let radio = null; const l = INTRO.cur;
  if (l) { const c = INTRO_CAST[l.who]; if (c.radio || !(!F && !DROP && tag(c.pos[0], c.pos[1] + .3, c.pos[2], c.name, l.text, "crew"))) radio = l; }
  if (F && !DROP) for (const c of F.callouts || []) { const b = c.b; tag(b.x, b.y + 2.25, b.z, "", c.text, "merc"); }
  el.querySelector(".says").innerHTML = out.join("");
  const r = el.querySelector(".radio"); if (radio) { r.classList.add("on"); r.querySelector("b").textContent = INTRO_CAST[radio.who].name; r.querySelector("span").textContent = radio.text; } else r.classList.remove("on"); }
// the mouse doesn't steer the camera while the film plays
for (const ev of ["mousemove", "wheel"]) addEventListener(ev, e => { if (INTRO.on) e.stopImmediatePropagation(); }, { capture: true, passive: true });
