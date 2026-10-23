// =====================================================================================
//  DEV WORLD (F4 → Teleport): a test map with every character sprite on a plinth, plus one small
//  section per planet type (its ground, rocks, flora, light, fog, sky and ambience) to check the vibe.
//  Walk up to an exhibit and press E to step through its animations. Shooting an exhibit only flashes it.
// =====================================================================================
const DW = { on: false, base: "desert", spin: false, sec: null, from: null, sky0: null, P0: null, amb: null };
const DW_BIOMES = ["desert", "swamp", "arctic", "volcanic"];
const DW_SEC = DW_BIOMES.map((b, i) => { const a = i / 4 * 6.283 + .785; return { b, x: Math.round(Math.cos(a) * 112), z: Math.round(Math.sin(a) * 112), r: 26 }; });
const DW_TEX = ["fGround", "fRock", "fRockProp", "fBark", "fBarkS", "fCactus", "fIce", "fCanopy", "fCanopyA", "fCanopyB", "fCanopyC", "fCanopyD", "fFern", "fGrass", "fFrond", "fShroom", "fLog", "fFungus", "fWater", "fSky"];
const DW_MODES = { human: ["idle", "walk", "run", "shoot", "dead"], unarmed: ["idle", "walk", "run", "dead"], bug: ["idle", "walk", "run", "attack", "dead"], still: ["still", "spin"] };

// ---------- generation hooks (called from generateField when m.dev) ----------
// every planet's textures, uploaded under their own names (fGround_swamp, fSky_arctic, ...)
function devSectionTextures() { DW.atl = {};
  for (const b of DW_BIOMES) { const P = FIELD_PAL[b]; fieldTextures(P, b); fieldArt(P, b); DW.atl[b] = FATLAS.ground;
    for (const k of DW_TEX) if (TXD[k]) R3.tex[k + "_" + b] = glTex(TXD[k]); }
  TXD.glowLava = tex(32, 32, (x, y) => { const n = fbm(x / 6, y / 6, 77), c = Math.abs(Math.sin(x * .3 + y * .2 + n * 6)) < .25; return c ? [255, 214, 120, 1] : n > .55 ? [240, 96, 30, 1] : [150, 36, 18, 1]; });
  R3.tex.glowLava = glTex(TXD.glowLava); }
// the flat ground of each section, retextured, and its props
function devSectionProps(out, C, fh) { const R = seeded(4242);
  for (const S of DW_SEC) { const b = S.b, y0 = fh(S.x, S.z), at = (r0, r1) => { const a = R() * 6.283, d = r0 + R() * (r1 - r0); return [S.x + Math.cos(a) * d, S.z + Math.sin(a) * d]; };
    // the ground: 2 m tiles over a disc, sitting just above the terrain
    const gm = mb("fGround_" + b).mb, tiles = DW.atl[b] ? [...ATL.moss, ...ATL.litter] : null;
    for (let x = -S.r; x < S.r; x += 2) for (let z = -S.r; z < S.r; z += 2) { if (Math.hypot(x + 1, z + 1) > S.r) continue; const X = S.x + x, Z = S.z + z, k = .9 + R() * .2, c = [k, k, k];
      const uv = tiles ? (([i, j]) => [i / 4, j / 4, (i + 1) / 4, (j + 1) / 4])(tiles[(R() * tiles.length) | 0]) : [0, 0, 1, 1];
      gm.quad([X, fh(X, Z) + .04, Z], [X + 2, fh(X + 2, Z) + .04, Z], [X + 2, fh(X + 2, Z + 2) + .04, Z + 2], [X, fh(X, Z + 2) + .04, Z + 2], [0, 1, 0], uv, [c, c, c, c]); }
    // a ring of boulders marks the edge
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283 + R() * .2, x = S.x + Math.cos(a) * (S.r + .5), z = S.z + Math.sin(a) * (S.r + .5), s = .8 + R() * 1.2;
      obox(x, fh(x, z) + s * .3, z, s * 1.4, s, s * 1.1, R() * 6.28, (R() - .5) * .4, "fRockProp_" + b); C.push([x, z, s * .7, fh(x, z) + s]); }
    const rock = (x, z, s) => { const y = fh(x, z); for (let q = 0; q < 2; q++) obox(x + (R() - .5) * s, y + s * .3, z + (R() - .5) * s, s * (.8 + R() * .5), s * (.6 + R() * .6), s, R() * 6.28, (R() - .5) * .4, "fRockProp_" + b); C.push([x, z, s * .7, y + s]); };
    for (let k = 0; k < 5; k++) rock(...at(6, S.r - 3), 1 + R() * 2.2);
    if (b === "desert") {
      for (let k = 0; k < 7; k++) { const [x, z] = at(4, S.r - 2), y = fh(x, z), h = 2 + R() * 2.5; cyl(x, z, y, y + h, .28, 8, "fCactus_desert", { cap: "fCactus_desert" });
        for (const sd of [-1, 1]) if (R() < .7) { const ay = y + h * (.4 + R() * .3), ax = x + sd * .55; box(Math.min(x, ax), ay - .14, z - .14, Math.max(x, ax), ay + .14, z + .14, "fCactus_desert"); cyl(ax, z, ay, ay + h * .35, .18, 6, "fCactus_desert", { cap: "fCactus_desert" }); }
        C.push([x, z, .5, y + h]); }
      for (let k = 0; k < 2; k++) { const [x, z] = at(10, S.r - 5), y = fh(x, z), h = 5 + R() * 4; cyl(x, z, y, y + h, 1.4, 7, "fRockProp_desert", { cap: "fRockProp_desert", r1: 1, tile: 2 }); C.push([x, z, 1.6, y + h]); } }
    if (b === "swamp") {
      for (let k = 0; k < 7; k++) { const [x, z] = at(5, S.r - 3), y = fh(x, z), h = 6 + R() * 5, r = .3 + R() * .2; cyl(x, z, y - .3, y + h, r, 6, "fBarkS_swamp", { r1: r * .6, tile: 1, tv: Math.round(h / 2.2) });
        for (let q = 0; q < 2; q++) blob(x + (R() - .5) * 2, y + h - q * 1.3, z + (R() - .5) * 2, 3 + R(), 1.4 + R() * .5, 3 + R(), "fCanopy" + "ABCD"[(R() * 4) | 0] + "_swamp", [.9, .95, .9], (x * 7 + q) | 0);
        C.push([x, z, r + .15, y + h]); }
      for (let k = 0; k < 40; k++) { const [x, z] = at(2, S.r - 1), y = fh(x, z); if (R() < .5) cross(x, y, z, 1.2 + R(), .9 + R() * .6, "fFern_swamp", [.9, 1, .9], R() * 3); else cross(x, y, z, .8, .5 + R() * .3, "fGrass_swamp", [.9, 1, .9], R() * 3); }
      for (let k = 0; k < 8; k++) { const [x, z] = at(3, S.r - 2), y = fh(x, z); cyl(x, z, y, y + .3 + R() * .3, .05, 5, "fLog_swamp"); cyl(x, z, y + .3, y + .45, .2, 6, "fShroom_swamp", { r1: .04 }); }
      const [px, pz] = at(4, 10), pm = mb("fWater_swamp").mb, py = fh(px, pz) + .07; for (let k = 0; k < 14; k++) { const a0 = k / 14 * 6.283, a1 = (k + 1) / 14 * 6.283;
        pm.quad([px, py, pz], [px, py, pz], [px + Math.cos(a1) * 4.5, py, pz + Math.sin(a1) * 4.5], [px + Math.cos(a0) * 4.5, py, pz + Math.sin(a0) * 4.5], [0, 1, 0], [.5, .5, .5 + Math.cos(a0) * .5, .5 + Math.sin(a0) * .5]); } }
    if (b === "arctic") {
      for (let k = 0; k < 9; k++) { const [x, z] = at(4, S.r - 2), y = fh(x, z), h = 2 + R() * 6; cyl(x, z, y, y + h, .5 + R() * .8, 6, "fIce_arctic", { r1: .05 }); if (R() < .5) cyl(x + 1, z + .6, y, y + h * .6, .4, 6, "fIce_arctic", { r1: .04 }); C.push([x, z, .9, y + h]); } }
    if (b === "volcanic") {
      for (let k = 0; k < 6; k++) rock(...at(5, S.r - 3), 1.5 + R() * 2.5);
      const [lx, lz] = at(3, 9), lm = mb("glowLava").mb, ly = fh(lx, lz) + .06; for (let k = 0; k < 16; k++) { const a0 = k / 16 * 6.283, a1 = (k + 1) / 16 * 6.283, r0 = 5 + Math.sin(k * 2.1) * .8, r1 = 5 + Math.sin((k + 1) * 2.1) * .8;
        lm.quad([lx, ly, lz], [lx, ly, lz], [lx + Math.cos(a1) * r1, ly, lz + Math.sin(a1) * r1], [lx + Math.cos(a0) * r0, ly, lz + Math.sin(a0) * r0], [0, 1, 0], [.5, .5, .5 + Math.cos(a0) * .5, .5 + Math.sin(a0) * .5]); }
      for (let k = 0; k < 14; k++) { const [x, z] = at(2, S.r - 2), y = fh(x, z) + .05, L = .6 + R() * 1.6, a = R() * 6.28; obox(x, y, z, L, .04, .12, a, 0, "glowLava"); } } } }

// ---------- entering and leaving ----------
function devWorldEnter(base = DW.base) {
  if (MODE !== "base" || DROP || (typeof F !== "undefined" && F) || (typeof INTRO !== "undefined" && INTRO.on)) return;
  DW.base = base; if (typeof devToggle === "function" && DEV.open) devToggle(false); DW.from = { x: BASE.x, z: BASE.z, a: BASE.a, pitch: BASE.pitch };
  AU.lobbyStop(); $("basehud").hidden = true; $("bh-talk").hidden = true; BASE.talking = null; initBugSprites(); ensurePodModels();
  const m = { dev: true, seed: 777, diff: 1, biome: base, enemy: "bugs", obj: "dev", mods: [], sys: curSystem(), slot: 0, planet: "Dev World", region: "Sprite gallery", reward: 0 };
  FLD = {}; const g = generateField(m, FLD); while (!g.next().done);
  startField(m); DW.on = true; DW.sky0 = R3.tex.fSky; DW.P0 = { ...F.P }; DW.sec = null; DW.amb = base;
  const p = F.p; Object.assign(p, { x: 0, z: 26, alive: true, inv: 0, yaw: -Math.PI / 2, pitch: -.06 }); p.y = fieldH(p.x, p.z);
  MODE = "field"; R3.cv.style.display = "block"; cv.style.visibility = "hidden"; $("fhud").hidden = false; fhudReset(); show("f-load", false); show("f-play", true);
  AU.setSpace("out"); AU.windStart(.25); AU.ambStart(base); showTitle3("DEV WORLD", "E on an exhibit: next animation · F4: tools and the way back");
}
function devWorldLeave() { if (!DW.on || !F) return;
  AU.windStop(); AU.ambStop(); AU.combatStop(); AU.dropStop(); AU.setSpace("in"); $("fhud").hidden = true; if (document.pointerLockElement) document.exitPointerLock();
  for (const c of FLD.chunks || []) freeParts(c.parts);
  for (const k of ["parts", "padParts", "nestPartsAlive", "nestPartsDead", "crateParts", "boxParts", "sampleParts", "sentryParts", "gunParts", "rocketParts"]) freeParts(FLD[k]);
  for (const o of F.objs) if (o.own) freeParts(o.parts);
  F = null; DROP = null; FLD = null; DW.on = false; window.__time = 1; Object.assign(BASE, DW.from || {}); enterBase(); }

// ---------- the gallery ----------
function devWorldSetup() { F.dev = true; F.timeLeft = 1e9; F.patrolT = 1e9; F.breachCool = 1e9; F.reinf = 99; DW.ex = []; DW.st = [];
  const y0 = fieldH(0, 0), ex = (type, x, z, label, extra = {}) => { const b = spawnBug(type, x, z, "idle"); Object.assign(b, { exhibit: true, exMode: 0, exLabel: label, face: Math.PI / 2, home: { x, z } }, extra); DW.ex.push(b); return b; };
  // row 1: the mercenaries · row 2: the bugs · row 3: the crew and the armory · row 4: range mannequins and gun art
  ex("merc", -9, -10, "Rifleman"); ex("gunner", -3, -10, "Heavy Gunner"); ex("officer", 3, -10, "Officer"); const w = ex("merc", 9, -10, "Warlord"); w.boss = true; w.max = w.hp;
  ex("scav", -10.5, -1, "Scavenger"); ex("spitter", -3.5, -1, "Spitter"); ex("warrior", 3.5, -1, "Warrior"); ex("charger", 11, -1, "Charger");
  const crew = [["soldier", "Soldier"], ["armorer", "Armorer"], ["engineer", "Engineer"], ["quartermaster", "Quartermaster"], ["armL", "Mannequin · Scout"], ["armM", "Mannequin · Standard"], ["armH", "Mannequin · Bulwark"]];
  crew.forEach(([t, label], i) => DW.st.push({ kind: "sp", t, label, x: -12 + i * 4, z: 8, face: Math.PI / 2, h: 2, mode: 0 }));
  ["light", "medium", "heavy", "superheavy"].forEach((k, i) => DW.st.push({ kind: "dummy", t: k, label: "Range target · " + ARMORS[k].name, x: -12 + i * 4, z: 15, face: Math.PI / 2, mode: 0 }));
  ["wp_rifle", "wp_shotgun", "wp_smg", "wp_marksman"].forEach((k, i) => DW.st.push({ kind: "wp", t: k, label: "View model · " + k.slice(3), x: 4 + i * 3.4, z: 15, face: Math.PI / 2, mode: 0 }));
  // plinths under everything, and a sign post for each section
  const all = [...DW.ex.map(b => [b.x, b.z, FBUG[b.type].human ? 1.1 : b.type === "charger" ? 2.8 : 1.8]), ...DW.st.map(s => [s.x, s.z, 1.1])];
  F.objs.push({ own: true, kind: "dev", M: IDENT, parts: buildParts(() => { for (const [x, z, r] of all) { const y = fieldH(x, z); cyl(x, z, y - .3, y + .06, r, 8, "plate2", { cap: "plate2", tile: 2 }); annulus(x, y + .07, z, r - .08, r, 8, "haz"); } }) });
  // the way out is in the F4 menu; a little sentry would be in the way here
  F.items = []; F.crates = []; F.pois = [...(FLD.pois || []).map(q => ({ ...q, seen: true, used: false })), ...(FLD.outposts || []).map(([x, z]) => ({ x, z, kind: "outpost", seen: true }))];
}
const exKind = b => { const T = FBUG[b.type]; return T.human ? (T.unarmed ? "unarmed" : "human") : "bug"; };
function devExTick(b, dt) { const md = DW_MODES[exKind(b)][b.exMode]; b.flash -= dt; if (DW.spin) b.face += dt * .7; b.hp = Math.max(b.hp, 1);
  if (FBUG[b.type].human) { b.dead = md === "dead" ? 11.3 : null; b.anT += dt;
    if (md === "idle") { b.mode = "idle"; b.mv = 0; b.firing = false; } else if (md === "walk" || md === "run") { if (b.mode !== "walk") b.anT = 0; b.mode = "walk"; b.mv = md === "run" ? 3 : 1.1; }
    else if (md === "shoot") { if (b.mode !== "shoot") { b.mode = "shoot"; b.shootT = 0; b.anT = 0; } b.shootT += dt; b.firing = b.shootT > .9 && b.shootT % 2.4 < 1.5;
      if (b.firing && (b.fireT = (b.fireT || 0) - dt) <= 0) { b.fireT = FBUG[b.type].heavy ? .09 : .14; F.lights.push({ x: b.x + Math.cos(b.face) * .6, y: b.y + 1.3, z: b.z + Math.sin(b.face) * .6, c: [1.4, .8, .4], t: .04 }); } } }
  else { b.dead = md === "dead" ? 11 : null; b.forceMv = md === "walk" ? 1.5 : md === "run" ? 5 : md === "attack" ? 0 : 0; b.ch = md === "run" ? "run" : null;
    if (md === "walk" || md === "run") b.anim += dt; b.lunge = md === "attack" ? Math.pow(Math.max(0, Math.sin(F.t * 4.5)), 3) : 0; } }
// interacting: the nearest exhibit steps to its next animation
function devNearestEx() { const p = F.p; let best = null, bd = 3.2;
  for (const b of DW.ex) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = { b }; } }
  for (const s of DW.st) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = { s }; } }
  if (!best) return null;
  if (best.b) { const b = best.b, L = DW_MODES[exKind(b)], nxt = L[(b.exMode + 1) % L.length]; return { label: `${b.exLabel}: ${L[b.exMode]} → ${nxt}`, go() { b.exMode = (b.exMode + 1) % L.length; AU.click(); const md = L[b.exMode]; if (!FBUG[b.type].human) { const snd = { idle: "alert", attack: b.type === "spitter" ? "spit" : b.type === "charger" ? "charge" : "attack", dead: "death", run: "hurt" }[md]; if (snd) setTimeout(() => AU.bug(b.type, snd, 1), 120); } } }; }
  const s = best.s, L = DW_MODES.still; return { label: `${s.label}: ${L[s.mode]} → ${L[(s.mode + 1) % 2]}`, go() { s.mode = (s.mode + 1) % 2; AU.click(); } }; }

// every frame: spin the still exhibits, and blend light, fog, sky and ambience toward the planet section you're in
function devWorldTick(dt) { if (!DW.on || !F) return;
  for (const s of DW.st) if (s.mode === 1 || DW.spin) s.face += dt * .7;
  let best = null, w = 0; for (const S of DW_SEC) { const d = Math.hypot(S.x - F.p.x, S.z - F.p.z), k = clamp((S.r + 18 - d) / 16, 0, 1); if (k > w) { w = k; best = S; } }
  const P0 = DW.P0, P1 = best ? FIELD_PAL[best.b] : P0, mix = (a, b2) => a.map((v, i) => lerp(v, b2[i], w * w * (3 - 2 * w)));
  F.P = { ...P0, amb: mix(P0.amb, P1.amb), sun: mix(P0.sun, P1.sun), fog: mix(P0.fog, P1.fog), g: P0.g, fogD: lerp(P0.fogD, P1.fogD, w) };
  R3.tex.fSky = best && w > .5 && R3.tex["fSky_" + best.b] ? R3.tex["fSky_" + best.b] : DW.sky0;
  const amb = best && w > .6 ? best.b : DW.base; if (amb !== DW.amb) { DW.amb = amb; AU.ambStop(); setTimeout(() => DW.on && AU.ambStart(amb), 700); fmsg("", (BIOMES[amb] || {}).name + " section", 2); } }

// the crew, the mannequins and the gun art: billboards (8 directions where the art has them)
function devWorldDraw(eye, cam) { if (!DW.on) return; const gl = R3.gl, L = R3.loc, rx = cam.r[0], rz = cam.r[2];
  for (const s of DW.st) { const y = fieldH(s.x, s.z) + .06; let key = null, T = null, h = s.h || 2, w = 1;
    if (s.kind === "sp") { if (!SP[s.t + "0"]) continue; const n = SP[s.t].dirs || 1, k = ((Math.round(angDiff(s.face, Math.atan2(eye[2] - s.z, eye[0] - s.x)) / (Math.PI * 2 / n)) % n) + n) % n; T = SP[s.t + k]; key = "sp_" + s.t + k; if (!R3.tex[key]) R3.tex[key] = glTex(T); }
    else if (s.kind === "dummy") { key = rangeDummy(s.t); if (!key) continue; T = SP[key]; h = 2 * (DUMMY_SRC[s.t] || [0, 1])[1]; }
    else { key = "dw_" + s.t; if (!FART[s.t]) continue; if (!R3.tex[key]) R3.tex[key] = glTex(FART[s.t]); T = FART[s.t]; h = 1.1; }
    w = h * T.w / T.h / 2; const y0 = y - (T.pad || 0) * h + (s.kind === "wp" ? .5 : 0), m = new MB(), ca = s.kind === "wp" ? Math.cos(s.face) : 0, sa = s.kind === "wp" ? Math.sin(s.face) : 0;
    const ux = s.kind === "wp" ? -sa : rx, uz = s.kind === "wp" ? ca : rz;   // gun art turns with the turntable instead of facing you
    m.quad([s.x - ux * w, y0 + h, s.z - uz * w], [s.x + ux * w, y0 + h, s.z + uz * w], [s.x + ux * w, y0, s.z + uz * w], [s.x - ux * w, y0, s.z - uz * w], [-cam.f[0], 0, -cam.f[2]], [0, 0, 1, 1]);
    drawMB(m, key, 0, 0, 1); } }
// labels over the exhibits and the sections
function devMarks(mk) { if (!DW.on) return; const p = F.p;
  for (const b of DW.ex) if (Math.hypot(b.x - p.x, b.z - p.z) < 14) mk(b.x, b.z, "poi", `${b.exLabel} · ${DW_MODES[exKind(b)][b.exMode].toUpperCase()}`, FBUG[b.type].h + .9);
  for (const s of DW.st) if (Math.hypot(s.x - p.x, s.z - p.z) < 10) mk(s.x, s.z, "poi", s.label, 2.6);
  for (const S of DW_SEC) if (Math.hypot(S.x - p.x, S.z - p.z) > S.r) mk(S.x, S.z, "obj", (BIOMES[S.b] || {}).name.toUpperCase(), 6); }
