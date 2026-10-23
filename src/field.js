// =====================================================================================
//  THE FIELD: first-person 3D missions on the planet surface.
//  Terrain, buildings and objects are 3D; bugs are 2D sprites (placeholders until real art).
// =====================================================================================
let FLD = null, F = null, DROP = null;
const POD_NAME = "Starfall Pod";
const FBUG = {
  scav:    { hp: 45,   spd: 5.0, dmg: 6,  rng: 1.7, cd: .8,  h: 1.15, w: 1.8, r: .5, atlas: "bug_scav", cols: 9, size: 2.09, foot: .46, top: .3 },
  warrior: { hp: 200,  spd: 4.2, dmg: 18, rng: 2.3, cd: 1.1, h: 2.0,  w: 2.7, r: .8, atlas: "bug_warrior", cols: 9, animK: .6, size: 3.27, foot: .49, top: .19 },
  spitter: { hp: 130,  spd: 3.4, dmg: 14, rng: 26,  cd: 2.6, h: 1.85, w: 2.5, r: .7, ranged: true, atlas: "bug_spitter", cols: 9, size: 2.95, foot: .48, top: .17 },
  charger: { hp: 1500, spd: 3.4, dmg: 45, rng: 3.6, cd: 1.6, h: 3.4,  w: 5.0, r: 1.6, armored: true, atlas: "bug_charger", cols: 9, size: 5.84, foot: 1.16, top: .19 },
};
const OBJ_TITLE = { defend: "HOLD THE LINE", purge: "DESTROY THE HIVES", sabotage: "SABOTAGE THE COMMAND POST", hvt: "ELIMINATE THE WARLORD", dev: "DEV WORLD", officer: "ASSASSINATE THE OFFICER", uplink: "RESTORE THE UPLINK", blackbox: "RECOVER THE BLACK BOX" };

// ---------- placeholder bug sprites: side view, facing right, two walk frames ----------
function bugSprite(type, frame) {
  const [w, h] = { scav: [40, 26], warrior: [56, 42], spitter: [56, 42], charger: [92, 62] }[type], c = BUG_COL[type], g = new Array(w * h).fill(null);
  const sh = (hx, k) => { const n = parseInt(hx.slice(1), 16), f = v => clamp(Math.round(v * k), 0, 255).toString(16).padStart(2, "0"); return "#" + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255); };
  const put = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y * w + x] = col; };
  const ell = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(x, y, fn(x, y)); };
  const seg = (x0, y0, x1, y1, col, th = 1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 1; for (let i = 0; i <= n; i++) for (let t = 0; t < th; t++) put(lerp(x0, x1, i / n) + (t > 0 ? .5 : 0), lerp(y0, y1, i / n), col); };
  const big = type === "charger", body = h * (big ? .55 : .6), th = big ? 2 : 1;
  const legs = (far) => { const xs = big ? [.4, .56, .72] : [.36, .52, .68]; xs.forEach((fx, i) => { const x = w * fx + (far ? 3 : 0), dir = i === 0 ? -1 : 1, ph = ((i + frame + (far ? 1 : 0)) % 2 ? 1 : -1) * w * .03;
      const kx = x + dir * w * .07, ky = body - h * (big ? .16 : .14), fx2 = x + dir * w * .1 + ph; seg(x, body - 1, kx, ky, far ? c.dark : c.leg, th); seg(kx, ky, fx2, h - 1, far ? c.dark : c.leg, th); }); };
  legs(true);
  const shade = (base, cy) => (x, y) => sh(base, y < cy - 1 ? 1.18 : y > cy + 2 ? .78 : 1);
  if (type === "spitter") ell(w * .26, h * .42, w * .22, h * .3, (x, y) => (x + y) % 5 === 0 ? [c.sac2, 1] : [y < h * .36 ? c.sac : c.sac2, 1]);
  else ell(w * (big ? .2 : .27), h * .42, w * (big ? .17 : .22), h * (big ? .2 : .25), (x, y) => Math.floor(x / 3) % 2 ? shade(c.mid, h * .42)(x, y) : shade(c.dark, h * .42)(x, y));
  ell(w * .52, h * .4, w * (big ? .2 : .16), h * (big ? .27 : .21), shade(c.plate || c.head, h * .38));
  if (big) ell(w * .66, h * .34, w * .17, h * .3, (x, y) => sh(c.plate, y < h * .25 ? 1.15 : .95));
  ell(w * (big ? .8 : .73), h * (big ? .46 : .45), w * (big ? .08 : .1), h * .14, shade(c.head, h * .43));
  put(w * (big ? .84 : .78), h * .41, "#140c08");
  const mx = w * (big ? .86 : .8), my = h * .52; seg(mx, my, mx + w * .08, my + h * .1, c.dark, th); seg(mx, my - 1, mx + w * .09, my - h * .02 + (frame ? 2 : 0), c.dark, th);
  legs(false);
  return mkSprite(w, h, (x, y) => g[y * w + x]);
}
function initBugSprites() { if (R3.tex.bug_scav0) return; for (const t of Object.keys(FBUG).filter(k => !FBUG[k].human)) for (const f of [0, 1]) { const T = bugSprite(t, f); SP["bug_" + t + f] = T; R3.tex["bug_" + t + f] = glTex(T); } }

// ---------- the weapon in your hands (drawn in view space) ----------
const VIEWGUN = {};
function buildViewGun(wk) {
  if (VIEWGUN[wk]) return VIEWGUN[wk];
  let muz = -1.05;
  const parts = buildParts(() => {
    const B = (x0, y0, z0, x1, y1, z1, t) => box(x0, y0, z0, x1, y1, z1, t, { tile: 1 });
    if (wk === "shotgun") { B(.13, -.28, -.7, .25, -.17, -.35, "dark"); B(.15, -.21, -1.0, .23, -.16, -.7, "pipeMetal"); B(.15, -.27, -.95, .23, -.22, -.7, "dark"); B(.13, -.3, -.82, .25, -.24, -.68, "hullOut3"); B(.14, -.3, -.35, .24, -.2, -.12, "hullOut3"); muz = -1.0; }
    else if (wk === "smg") { B(.14, -.27, -.66, .24, -.17, -.36, "dark"); B(.17, -.22, -.86, .21, -.18, -.66, "dark"); B(.16, -.46, -.56, .21, -.27, -.5, "dark"); B(.15, -.27, -.36, .23, -.21, -.2, "hullOut3"); B(.17, -.17, -.55, .21, -.14, -.46, "dark"); muz = -.86; }
    else if (wk === "pistol") { B(.15, -.25, -.6, .22, -.19, -.38, "hullOut3"); B(.165, -.235, -.66, .205, -.205, -.6, "dark"); B(.155, -.36, -.46, .215, -.25, -.39, "dark"); B(.16, -.27, -.47, .21, -.25, -.42, "pipeMetal"); muz = -.66; }
    else if (wk === "revolver") { B(.165, -.225, -.84, .205, -.19, -.55, "pipeMetal"); B(.15, -.255, -.58, .22, -.18, -.47, "dark"); B(.152, -.235, -.575, .218, -.2, -.475, "hullOut3"); B(.155, -.25, -.47, .215, -.2, -.4, "dark"); B(.16, -.38, -.46, .21, -.25, -.39, "rib"); B(.18, -.19, -.83, .19, -.17, -.8, "dark"); muz = -.84; }
    else if (wk === "mpistol") { B(.15, -.25, -.64, .22, -.18, -.38, "dark"); B(.165, -.23, -.72, .205, -.2, -.64, "pipeMetal"); B(.16, -.46, -.5, .21, -.25, -.44, "dark"); B(.155, -.36, -.42, .215, -.25, -.38, "hullOut3"); B(.16, -.17, -.55, .21, -.15, -.46, "dark"); muz = -.72; }
    else if (wk === "marksman") { B(.14, -.27, -.8, .24, -.17, -.36, "hullOut3"); B(.175, -.215, -1.3, .205, -.185, -.8, "dark"); B(.16, -.38, -.58, .22, -.27, -.5, "dark"); B(.15, -.29, -.36, .23, -.19, -.12, "hullOut3");
      B(.16, -.14, -.72, .22, -.09, -.42, "dark"); B(.165, -.135, -.73, .215, -.095, -.72, "glowCyan"); muz = -1.3; }
    else { B(.14, -.27, -.75, .24, -.17, -.35, "dark"); B(.17, -.22, -1.05, .21, -.18, -.75, "dark"); B(.135, -.27, -.86, .245, -.19, -.62, "hullOut3"); B(.16, -.4, -.55, .22, -.27, -.47, "dark");
      B(.15, -.29, -.35, .23, -.19, -.14, "hullOut3"); B(.17, -.17, -.62, .21, -.14, -.5, "dark"); }
    B(.12, -.32, -.84, .26, -.25, -.74, "rib"); B(.15, -.34, -.46, .25, -.26, -.36, "rib");   // gloves
  });
  return (VIEWGUN[wk] = { parts, muz });
}

// ---------- boarding and the seamless drop ----------
function tryBoardPod(near) {
  if (BASE.jump) { baseToast("DRIVE ENGAGED", "Wait until we drop out of hyperspace", 2.5); AU.fail(); return; }
  showPodMissions(near);
}
function startDrop(pod, px, pz) {
  initBugSprites(); ensurePodModels(); const m = BASE.selected;
  FLD = {}; DROP = { stage: "board", t: 0, pod, px, pz, py: 0, tilt: 0, look: { yaw: 0, pitch: 0 }, m, from: { x: BASE.x, z: BASE.z, a: BASE.a, pitch: BASE.pitch, y: EYE }, gen: generateField(m, FLD), prog: 0, loaded: false, swing: DOOR_OPEN, hatch: 0, ex: 0, ey: 0 };
  dropPose(DROP); MODE = "drop"; $("basehud").hidden = true; $("fhud").hidden = false; fhudReset(); show("f-load", false); show("f-play", false);
}
function runGen(budget) { const D = DROP; if (!D || D.loaded) return; const t0 = performance.now();
  while (performance.now() - t0 < budget) { const r = D.gen.next(); if (r.done) { D.loaded = true; break; } D.prog = r.value; } }
const ease = k => k * k * (3 - 2 * k);
const xf = (M, p) => [M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]];
const SHIP_STAGES = { board: 1, count: 1, launch: 1, space: 1, entry: 1 };
// where the pod is and where you look from: one pose for the whole drop, in the ship and on the planet.
// The pod is a real object; you sit inside it and look around freely, so nothing is glued to the screen.
function dropPose(D) {
  const ship = !!SHIP_STAGES[D.stage];
  D.podM = ship ? mChain(mT(D.px, D.py, D.pz), mRy(Math.PI / 2), mRz(D.tilt)) : mChain(mT(D.x, D.py, D.z), mRy(-D.yaw), mRz(D.tilt));
  D.eye = xf(D.podM, [D.ex, 1.45 + D.ey, 0]); D.camYaw = (ship ? -Math.PI / 2 : D.yaw) + D.look.yaw; D.camPitch = D.tilt + D.look.pitch;
  if (ship) { const B = BASE; if (D.stage === "board" && D.t < 1.5) { const k = ease(clamp(D.t / 1.5, 0, 1)), f = D.from;
      B.x = lerp(f.x, D.eye[0], k); B.z = lerp(f.z, D.eye[2], k); B.eyeY = lerp(f.y, D.eye[1], k); B.a = f.a + angDiff(f.a, D.camYaw) * k; B.pitch = lerp(f.pitch, D.camPitch, k); }
    else { B.x = D.eye[0]; B.z = D.eye[2]; B.eyeY = D.eye[1]; B.a = D.camYaw; B.pitch = D.camPitch; } }
}
function updateDrop(dt) {
  const D = DROP; D.t += dt; const t = D.t; BASE.t += dt; if ((D.scrT = (D.scrT || 0) - dt) <= 0) { D.scrT = .1; drawPodScreens(D); } runGen(D.stage === "space" ? 14 : 5);
  if (D.stage === "board") { D.swing = t < 1.15 ? DOOR_OPEN : lerp(DOOR_OPEN, 0, clamp((t - 1.15) / .5, 0, 1) ** 2);
    if (t > 1.65 && !D.clank) { D.clank = 1; AU.clank(); }
    if (t > 1.9) { D.stage = "count"; D.t = 0; AU.lobbyStop(); } }
  else if (D.stage === "count") { const n = Math.floor(t); if (n !== D.beep && n < 4) { D.beep = n; AU.beep(n); }
    setH("f-count", t < 3 ? String(3 - n) : "LAUNCH"); show("f-count", true); D.red = .5 + .5 * Math.sin(t * 12); D.hatch = clamp((t - 2.7) / .4, 0, 1); D.shake = t > 2.7 ? .01 : 0;
    if (t > 3.2) { D.stage = "launch"; D.t = 0; show("f-count", false); AU.podLaunch(); } }
  else if (D.stage === "launch") { D.v = 2 + t * 26; D.py -= D.v * dt; D.shake = .07 - t * .03;
    if (t > 1.2) { D.stage = "space"; D.t = 0; show("f-load", true); } }
  else if (D.stage === "space") { D.v = lerp(D.v, 9, Math.min(1, dt * .8)); D.py -= D.v * dt; D.tilt = -.32 * ease(clamp(t / 3.5, 0, 1)); D.shake = .012 + Math.random() * .01;
    setH("f-loadtxt", D.loaded ? "ATMOSPHERE IN 3…" : `LOADING SURFACE DATA ${Math.floor(D.prog * 100)}%`);
    if (D.loaded && t > 7.5) { D.stage = "entry"; D.t = 0; } }
  else if (D.stage === "entry") { D.py -= D.v * dt; D.tilt = lerp(-.32, -.45, clamp(t / 2.5, 0, 1)); D.shake = .03 + t * .03; D.plasma = clamp(t / 1.6, 0, 1); D.cloud = clamp((t - 1.9) / .55, 0, 1); setH("f-loadtxt", "ATMOSPHERIC ENTRY");
    if (t > 2.5) { show("f-load", false); beginFall(FLD.lz.x, FLD.lz.z, Math.atan2(FLD.obj.z - FLD.lz.z, FLD.obj.x - FLD.lz.x), 320, true); } }
  else if (D.stage === "fall") {   // free fall at ~100 m/s, then a hard retro burn over the last 60 m
    D.cloud = D.first ? clamp(1 - t / .9, 0, 1) : 0; D.plasma = clamp(1 - t / 1.4, 0, 1) * (D.first ? 1 : .6);
    const BURN = 60, T1 = D.fallT1, v1 = (D.alt - BURN) / T1, vEnd = 11, T2 = 2 * BURN / (v1 + vEnd);
    if (t < T1) { D.py = D.gy + D.alt - v1 * t; D.vs = v1; D.burn = false; D.shake = .025 + .02 * Math.random(); }
    else { const u = Math.min(t - T1, T2); D.py = D.gy + BURN - (v1 * u + (vEnd - v1) * u * u / (2 * T2)); D.vs = v1 + (vEnd - v1) * u / T2;
      if (!D.burn) { D.burn = true; AU.retroIgnite(); } D.shake = .05 + .03 * Math.random(); retroFx(D, 1); }
    D.tilt = D.tilt0 * (1 - ease(clamp(t / (T1 + T2 * .6), 0, 1)));
    if (t >= T1 + T2) { D.stage = "land"; D.t = 0; D.tilt = 0; D.py = D.gy; D.burn = false; landPod(); } }
  else if (D.stage === "land") {   // impact: the pod digs in, the light flickers, then the door charges count down
    D.shake = Math.max(0, .2 * (1 - t * 2.2)); D.ey = -.2 * Math.sin(Math.PI * Math.min(1, t / .35)); D.flicker = t < .45;
    D.look.pitch += (-.1 - D.look.pitch) * Math.min(1, dt * 1.5);
    for (const [k, at] of [[0, .5], [1, .95], [2, 1.4]]) if (t >= at && (D.beeped || 0) <= k) { D.beeped = k + 1; AU.beep(k === 2 ? 3 : k); }
    if (t > 1.85) { D.stage = "door"; D.t = 0; D.ey = 0; AU.doorBlast(); } }
  else if (D.stage === "door") { if (!D.blown) { D.blown = true; blowDoor(D); } D.shake = Math.max(0, .06 - t * .15); if (t > .7) { D.stage = "exit"; D.t = 0; } }
  else if (D.stage === "exit") { const k = ease(clamp(t / 1.2, 0, 1)); D.ex = 2.4 * k; D.ey = .2 * k; D.look.yaw *= 1 - Math.min(1, dt * 2); D.look.pitch += (-.04 - D.look.pitch) * Math.min(1, dt * 2);
    if (t > 1.25) finishDrop(); }
  D.veil = (D.cloud || 0) > .01 || (D.plasma || 0) > .01;
  if (DROP) { dropPose(D); AU.dropTick(D); }
}
function beginFall(x, z, yaw, alt, first) {
  const D = DROP; Object.assign(D, { stage: "fall", t: 0, first, x, z, yaw, alt, fallT1: first ? 2.6 : 1.8, gy: fieldH(x, z), swing: 0, blown: false, landed: false, ex: 0, ey: 0, beeped: 0, burn: false });
  D.look = D.look || { yaw: 0, pitch: 0 }; D.tilt0 = first ? (D.tilt ?? -.45) : -.42; D.tilt = D.tilt0; D.py = D.gy + alt;
  if (!F) startField(D.m);
  MODE = "drop"; F.p.x = x; F.p.z = z; dropPose(D);
}
function retroFx(P0, k) {
  const x = P0.x, z = P0.z, y = P0.py ?? P0.y;
  const vs = P0.vs || 0, hg = Math.max(.05, y - fieldH(x, z) - .3);
  for (let q = 0; q < 5; q++) { const a = Math.PI * (.2 + q * .4) + (P0.yaw || 0), nx = x + Math.cos(a) * .74, nz = z + Math.sin(a) * .74;
    if (Math.random() < .8 * k) addPart(nx, y + .05, nz, Math.cos(a) * 1.5 + frand(-1, 1), -vs - frand(14, 22), Math.sin(a) * 1.5 + frand(-1, 1), frand(.18, .3), Math.random() < .5 ? [1, .75, .3] : [1, .5, .15], Math.min(frand(.25, .45), hg / (vs + 18)), 0);
    if (Math.random() < .35 * k) addPart(nx, y - .3, nz, frand(-2, 2), -vs * .9 - frand(4, 8), frand(-2, 2), frand(.8, 1.5), [.5, .48, .45], frand(.5, .9), 6, true); }
  F.lights.push({ x, y: y - .8, z, c: [.9, .5, .2].map(v => v * k), t: .06 });
}
function landPod() {
  const D = DROP; AU.podImpact(); AU.windStop(); const bio = F && F.m ? F.m.biome : "desert"; AU.windStart(bio === "swamp" ? .15 : bio === "arctic" ? .6 : .35); AU.setSpace("out"); AU.ambStart(bio); if (F && hasMod(F.m, "rain")) AU.rainStart(.55); AU.combatStart(); D.landed = true;
  F.objs.push({ parts: R3.podFull, M: mChain(mT(D.x, D.gy, D.z), mRy(-D.yaw)), kind: "pod" }); F.coll.push([D.x, D.z, .85, D.gy + 2.6]);
  addDecal(D.x, D.z, 2.6, [.3, .26, .22]); for (let i = 0; i < 30; i++) { const a = Math.random() * 6.283, s = frand(5, 14); addPart(D.x + Math.cos(a) * 2, D.gy + .3, D.z + Math.sin(a) * 2, Math.cos(a) * s, frand(1, 4), Math.sin(a) * s, frand(.6, 1.4), [.62, .56, .48].map(v => v * (F.P.g[0] / 200)), .7, -3, true); }
  noise3(D.x, D.z, 90);
}
function finishDrop() {
  const D = DROP, p = F.p; p.x = D.eye[0]; p.z = D.eye[2]; p.y = fieldH(p.x, p.z); p.vy = 0; p.alive = true; p.inv = 2; p.raise = 0; p.yaw = D.camYaw; p.pitch = D.camPitch;
  if (!D.first) { const lo = F.lo; for (const s of F.slots) { s.ammo = s.mag; s.left = s.mags - 1; } F.slot = -1; switchWeapon(0, true); Object.assign(p, { hp: lo.hp, st: 100, gren: lo.gren, stims: lo.stims, relT: 0, slow: 0, recoil: 0 }); }
  const first = D.first; DROP = null; MODE = "field"; show("f-play", true); BASE.eyeY = null;
  if (first) { showTitle3(OBJ_TITLE[F.m.obj], `${F.m.region} · ${F.m.planet}`); AU.sting(); } else { fmsg("REINFORCED", `${F.reinf} reinforcements left`); }
}
function showTitle3(big, small) { const el = $("f-title"); el.innerHTML = `<div class="t1">${big}</div><div class="t2">${small}</div>`; el.classList.remove("go"); void el.offsetWidth; el.classList.add("go"); }

// ---------- the mission ----------
function startField(m) {
  const lo = resolveLoadout(m), w = lo.w; if (AU.loadBugSounds) AU.loadBugSounds(); if (AU.warmGuns) AU.warmGuns([lo.wk, lo.wk2]);
  F = { foe: m.enemy === "humans" ? "human" : m.enemy === "bugs" ? "bug" : foeMode(), callouts: [], m, lo, P: FLD.P, t: 0, timeLeft: (m.size === "quick" ? 10 : m.size === "full" ? 20 : 15) * 60, paused: false, over: null,
    p: { x: FLD.lz.x, y: 0, z: FLD.lz.z, vy: 0, yaw: 0, pitch: 0, hp: lo.hp, st: 100, stT: 0, ammo: lo.mag, mags: lo.mags - 1, gren: lo.gren, stims: lo.stims, relT: 0, fireT: 0, onGround: true, alive: false, inv: 0, slow: 0, carry: false, samples: 0, bob: 0, recoil: 0, hurtT: 0, deadT: 0 },
    bugs: [], parts: [], tracers: [], decals: [], grenades: [], spits: [], strikes: [], beacons: [], objs: [], nests: [], items: [], crates: [], sentries: [], lights: [], pods: [], jets: [], beams: [], breaches: [], doors: [], epods: [],
    coll: [], reinf: lo.reinf, stats: { kills: 0, deaths: 0, shots: 0, hits: 0, strats: 0 }, time0: (m.size === "quick" ? 10 : m.size === "full" ? 20 : 15) * 60,
    cd: {}, uses: {}, rearm: {}, armed: null, input: "", inputFail: 0, shake: 0, breachCool: 60, patrolT: 50, ionT: frand(50, 80), ion: 0, metT: frand(10, 18), destroyerGone: false,
    obj: { done: false }, ext: { state: "locked", x: FLD.ext.x, z: FLD.ext.z, y: FLD.padY }, gun: buildViewGun(lo.wk), muzT: 0, slot: 0,
    slots: [{ key: lo.wk, w: lo.w, mag: lo.w.mag, mags: lo.mags, reload: lo.w.reload, ammo: lo.w.mag, left: lo.mags - 1 }, { key: lo.wk2, w: lo.w2, mag: lo.w2.mag, mags: lo.mags2, reload: lo.w2.reload, ammo: lo.w2.mag, left: lo.mags2 - 1 }] };
  for (const k in STRATS) { F.cd[k] = 0; F.rearm[k] = 0; F.uses[k] = (STRATS[k].uses || 0) + (STRATS[k].kind === "eagle" ? lo.eagleBonus : 0); }
  if (m.dev) { devWorldSetup(); return; }
  // objective setup
  const o = FLD.obj, oy = fieldH(o.x, o.z), mk = (x, z, holes, main) => { const n = { x, z, holes: [], main, spT: frand(2, 6), cleared: false };
      for (let i = 0; i < holes; i++) { const a = i / holes * 6.283 + frand(-.3, .3), d = holes > 1 ? frand(4, 9) : 0, hx = x + Math.cos(a) * d, hz = z + Math.sin(a) * d, hy = fieldH(hx, hz);
        const h = { x: hx, z: hz, y: hy, alive: true, obj: { parts: FLD.nestPartsAlive, M: mChain(mT(hx, hy, hz), mRy(a)), kind: "hole" } }; n.holes.push(h); F.objs.push(h.obj); F.coll.push([hx, hz, 1.8, hy + 1.2]); }
      F.nests.push(n); return n; };
  if (F.foe === "human" && m.obj === "purge") m.obj = "sabotage"; if (F.foe !== "human" && (m.obj === "sabotage" || m.obj === "hvt" || m.obj === "officer")) m.obj = "purge";
  if (F.foe === "human") setupHumanMission(m);
  if (m.obj === "purge") { F.mainNests = []; for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283 + .4, d = 18; F.mainNests.push(mk(o.x + Math.cos(a) * d, o.z + Math.sin(a) * d, 3, true)); } }
  if (m.obj === "uplink" || m.obj === "defend") { F.term = { x: o.x, z: o.z, y: oy, state: "idle", prog: 0, waveT: 5, defend: m.obj === "defend" };
    F.objs.push({ own: true, parts: buildParts(() => livery("F", mdlUplink)), M: mT(o.x, oy, o.z), kind: "term" });
    F.coll.push([o.x, o.z, .6, oy + 1.4], [o.x - 2.2, o.z - 2.2, .3, oy + 7], [o.x + 2, o.z - 1.6, 1, oy + 2.4], [o.x - 2, o.z + 1.9, .8, oy + 1], [o.x + 2.1, o.z + 1.9, .6, oy + 1.1]); }
  if (m.obj === "blackbox") { F.objs.push({ own: true, parts: buildParts(() => livery("F", mdlWreck)), M: mT(o.x, oy, o.z), kind: "wreck" }); F.smokers = [{ x: o.x + .7, y: oy + 1.6, z: o.z - .6, t: 1e9 }, { x: o.x + 2.3, y: oy + 1.6, z: o.z + 2.5, t: 1e9 }];
    F.coll.push([o.x - 3.4, o.z - 1.1, 1.4, oy + 2.6], [o.x - .9, o.z - .7, 1.4, oy + 2.6], [o.x + 3.2, o.z + 2.9, 1.4, oy + 2.6], [o.x + 4.8, o.z + 3.8, 1.2, oy + 2.4]); F.box = { x: o.x + 1.5, z: o.z - 3.4, carried: false, delivered: false }; }
  if (F.foe !== "human") for (const [x, z] of FLD.nestSpots) mk(x, z, 2, false);
  placeGiants(m);
  F.pois = [...(FLD.pois || []).map(q => ({ ...q, seen: false, used: false })), ...FLD.outposts.map(([x, z]) => ({ x, z, kind: "outpost", seen: false }))]; if (F.lo.scanner) for (const q of F.pois) q.seen = true;
  // a Skull Company garrison holds each outpost on their planet: a few guards loitering round the buildings
  if (F.foe === "human" && !m.dev && !(typeof TUT !== "undefined" && TUT.on)) for (const q of F.pois) if (q.kind === "outpost") for (let k = 0; k < 3 + Math.floor(m.diff / 2); k++) {
    const [x, z] = outpostW(q, frand(-6, 9), frand(3, 8) * (Math.random() < .5 ? 1 : -1)); const g = spawnBug(k === 0 && m.diff >= 3 ? "gunner" : "merc", x, z, "idle"); g.home = { x: q.x, z: q.z }; g.guard = true; }
  for (const q of F.pois) if (["ruins", "wreck", "bones", "hand", "crawler", "vapor"].includes(q.kind)) for (let k = 0; k < 2; k++) { const a = Math.random() * 6.283, d = 3 + Math.random() * 4, x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d; F.items.push({ x, z, y: fieldH(x, z), kind: "sample", n: 1 }); }   // canopy stalkers: giant spiders resting on the forest roof
  // samples and garrisons
  const R = seeded(m.seed + 7);
  for (let k = 0; k < 10; k++) { const pts = [[o.x, o.z], ...FLD.outposts, ...FLD.nestSpots], [cx, cz] = pts[k % pts.length], a = R() * 6.283, d = 6 + R() * 18, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; F.items.push({ x, z, y: fieldH(x, z), kind: "sample", n: 1 }); }
  setupSide(m);
  for (const n of F.nests) if (!n.noSpawn) for (let i = 0; i < (n.main ? 5 : 3) + Math.floor(m.diff / 2); i++) { const a = Math.random() * 6.283, d = 6 + Math.random() * 14; spawnBug(bugMix3(), n.x + Math.cos(a) * d, n.z + Math.sin(a) * d, "idle", n); }
  for (let g = 0; g < 4 + m.diff; g++) { const a = R() * 6.283, d = FW.RW * lerp(.2, .85, R()), x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.hypot(x - FLD.lz.x, z - FLD.lz.z) < 90) continue;
    for (let i = 0; i < 2 + (R() * 3 | 0); i++) spawnBug(bugMix3(), x + frand(-6, 6), z + frand(-6, 6), "idle"); }
}
function bugMix3() { if (F.foe === "human") { const d = F.m.diff, n = F.bugs.filter(b => b.type === "gunner" && b.dead == null).length; return d >= 2 && n < 1 + Math.floor(d / 2) && Math.random() < .05 + d * .025 ? "gunner" : "merc"; } const d = F.m.diff - 1, w = { scav: 10, warrior: d >= 1 ? 2 + d * 1.2 : .6, spitter: d >= 2 ? 1.5 + d * .5 : 0, charger: d >= 3 ? (d - 2) * .4 : 0 };
  if (F.bugs.filter(b => b.type === "charger").length >= Math.max(1, d - 2)) w.charger = 0;
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0); for (const k in w) { r -= w[k]; if (r <= 0) return k; } return "scav"; }
function spawnBug(type, x, z, state = "hunt", nest = null) {
  if (Math.hypot(x, z) > FW.RW * .93) { const k = FW.RW * .9 / Math.hypot(x, z); x *= k; z *= k; }
  const T = FBUG[type], b = { type, x, z, y: fieldH(x, z), hp: T.hp, state, nest, home: { x, z }, wt: null, wT: 0, atkT: .6, anim: Math.random() * 2, face: Math.random() * 6.28, flash: 0, lunge: 0,
    sees: 0, lost: 0, stun: 0, ch: null, chT: 0, chCd: 3, spitT: 1.5, spd: T.spd * frand(.9, 1.1), vx: 0, vz: 0, alertT: 0 };
  if (T.human) spawnHumanExtras(b); F.bugs.push(b); return b;
}
const fieldCap = () => 26 + F.m.diff * 5;
function noise3(x, z, r) { for (const b of F.bugs) if (b.state !== "hunt" && Math.hypot(b.x - x, b.z - z) < r) alert3(b); }
function alert3(b) { if (window.__invis) return; if (FBUG[b.type].human) return humanAlert(b); if (b.state !== "hunt") { b.state = "hunt"; b.lost = 0; if (Math.random() < .35) AU.bug(b.type, "alert", .8 * volAt(b.x, b.z), panAt(b.x, b.z)); } }
const volAt = (x, z) => clamp(1 - Math.hypot(x - F.p.x, z - F.p.z) / 90, .05, 1);

// ---------- player ----------
const EYE3 = 1.65;
const hitC = (x, z, r, y) => c => !(y != null && y > c[3] - .2) && (x - c[0]) ** 2 + (z - c[1]) ** 2 < (c[2] + r) ** 2;
function blocked3(x, z, r, y) { const h = hitC(x, z, r, y); for (const c of F.coll) if (h(c)) return true; return cgNear(x, z, r, h) || Math.hypot(x, z) > FW.RW * .96; }
function move3(e, dx, dz, r, y) {   // move, then slide out of any trunk/rock/wall circle we ended up in: smooth around trees
  const sx = e.x, sz = e.z, want = Math.hypot(dx, dz); e.x += dx; e.z += dz;
  const push = c => { if (y != null && y > c[3] - .2) return false; let ox = e.x - c[0], oz = e.z - c[1]; const d = Math.hypot(ox, oz), m = c[2] + r;
    if (d < m) { if (d < 1e-4) { ox = dx || 1; oz = dz; } const k = m / (Math.hypot(ox, oz) || 1); e.x = c[0] + ox * k; e.z = c[1] + oz * k; } return false; };
  for (let pass = 0; pass < 2; pass++) { for (const c of F.coll) push(c); cgNear(e.x, e.z, r, push); }
  const rr = Math.hypot(e.x, e.z), lim = FW.RW * .96; let edge = false; if (rr > lim) { e.x *= lim / rr; e.z *= lim / rr; edge = true; }
  return edge || (want > 1e-4 && Math.hypot(e.x - sx, e.z - sz) < want * .5);
}
function updatePlayer3(dt) {
  const p = F.p, lo = F.lo;
  if (!p.alive) { p.deadT += dt; if (p.deadT > 4.5 && !p.reinfStarted) { p.reinfStarted = true;
      if (F.reinf > 0) { F.reinf--; let best = null; for (let k = 0; k < 20; k++) { const a = Math.random() * 6.283, d = frand(25, 50), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (blocked3(x, z, 1.5) || waterDepth(x, z) > .1) continue;
          const n = F.bugs.filter(b => Math.hypot(b.x - x, b.z - z) < 25).length; if (!best || n < best.n) best = { x, z, n }; }
        best = best || { x: p.x, z: p.z }; DROP = { stage: "fall", t: 0, m: F.m, loaded: true, look: { yaw: 0, pitch: 0 } }; beginFall(best.x, best.z, p.yaw, 280, false); }
      else { fmsg("MISSION FAILED", "No reinforcements remaining"); setTimeout(() => fieldEnd(false), 2500); } } return; }
  if (F.grab) { p.hurtT -= dt; p.inv -= dt; struggle3(dt); return; }
  p.raise = Math.min(1, (p.raise ?? 1) + dt * 2.2); p.inv -= dt; p.hurtT -= dt; p.recoil = Math.max(0, p.recoil - dt * 6); F.muzT -= dt;
  // stratagem input
  if (pressed.has("q")) { F.input = ""; if (F.armed) { F.armed = null; AU.fail(); } }
  F.inputMode = keys.has("q"); if (released.has("q") && !F.armed) F.input = "";
  const dirKey = { w: "U", arrowup: "U", s: "D", arrowdown: "D", a: "L", arrowleft: "L", d: "R", arrowright: "R" };
  if (F.inputMode || F.code) for (const k of pressed) if (dirKey[k]) F.inputMode ? stratInput3(dirKey[k]) : codeInput3(dirKey[k]);
  // dive: a burst forward along your movement, then a beat on the ground
  if (p.dive > 0) { p.dive -= dt; const k = p.dive > .25 ? 1 : 0; if (k) move3(p, Math.cos(p.diveA) * 11 * dt, Math.sin(p.diveA) * 11 * dt, .4, p.y); }
  // movement
  let f = 0, s = 0; if (!F.inputMode && !F.code) { if (keys.has("w")) f++; if (keys.has("s")) s += 0, f--; if (keys.has("d")) s++; if (keys.has("a")) s--; }
  const len = Math.hypot(f, s), sprint = keys.has("shift") && f > 0 && p.st > 1 && !p.carry && p.relT <= 0;
  const wade = waterDepth(p.x, p.z); let spd = (sprint ? 8.6 : 5.4) * lo.spd * (window.__speed || 1); if (p.carry) spd *= .7; if (wade > .2) spd *= lerp(.85, .5, clamp(wade / 1.1, 0, 1)); if (p.slow > 0) { spd *= .6; p.slow -= dt; }
  if (sprint) { p.st -= 20 * dt; p.stT = .8; } else { p.stT -= dt; if (p.stT <= 0) p.st = Math.min(100, p.st + (hasMod(F.m, "heat") && !lo.seals ? 9 : 22) * lo.regen * dt); } p.st = Math.max(0, p.st);
  if ((pressed.has("c") || pressed.has("alt")) && p.onGround && p.st > 15 && !(p.dive > 0) && !p.carry && !F.inputMode && !F.code) { p.dive = .75; p.st -= 15; p.diveA = len ? p.yaw + Math.atan2(s, f) : p.yaw; AU.step(); AU.step(); }
  if (p.dive > 0) { /* no walking while diving */ } else if (len) { const ca = Math.cos(p.yaw), sa = Math.sin(p.yaw), mx = (ca * f - sa * s) / len * spd * dt, mz = (sa * f + ca * s) / len * spd * dt;
    const g0 = fieldH(p.x, p.z), g1 = fieldH(p.x + mx, p.z + mz), steep = (g1 - g0) / Math.max(.001, Math.hypot(mx, mz));
    if (!(steep > 1.25 && p.onGround)) move3(p, mx, mz, .4, p.y); p.bob += dt * (sprint ? 13 : 9); const st = Math.floor(p.bob / Math.PI); if (st !== p.step && p.onGround) { p.step = st; const rainy = hasMod(F.m, "rain"); if (wade > .15) { if (!(AU.wetStep && AU.wetStep(sprint ? 1.15 : .9))) AU.splash(); ripple(p.x, p.z, 1.2); for (let k = 0; k < 5; k++) addPart(p.x + frand(-.4, .4), FLD.waterY + .05, p.z + frand(-.4, .4), frand(-1, 1), frand(1.5, 3), frand(-1, 1), .45, [.6, .7, .62], .12, -12); } else { const sf = surf3(p); if (rainy && sf === "mud" && AU.wetStep && AU.wetStep(.5)) {} else AU.foot(sf, sprint); } } }
  // gravity and jumping
  const gy = fieldH(p.x, p.z);
  if (pressed.has(" ") && p.onGround && p.st > 8) { p.vy = 6.2; p.onGround = false; p.st -= 8; }
  p.vy -= 19 * dt; p.y += p.vy * dt; if (p.y <= gy) { if (!p.onGround && p.vy < -12) hurt3((-p.vy - 12) * 4, null); p.y = gy; p.vy = 0; p.onGround = true; } else if (p.y > gy + .25) p.onGround = false;
  // weapon
  const w = lo.w; p.fireT -= dt;
  if (p.relT > 0) { p.relT -= dt; if (p.relT <= 0) { p.ammo = lo.mag; p.mags--; AU.click(); } }
  const relTime = lo.reload * (hasMod(F.m, "cold") && !lo.seals ? 1.5 : 1); p.relMax = relTime;
  if (pressed.has("r") && p.relT <= 0 && p.ammo < lo.mag && p.mags > 0 && !p.carry) { p.relT = relTime; AU.reload(F.slots[F.slot].key, relTime); }
  // weapon swap: 1 / 2 or the mouse wheel
  p.swapT = Math.max(0, (p.swapT || 0) - dt);
  if (!F.code && !F.inputMode && !F.armed && !p.carry) { let to = -1; if (pressed.has("1")) to = 0; if (pressed.has("2")) to = 1; if (F.wheel) { to = 1 - F.slot; F.wheel = 0; } if (to >= 0 && to !== F.slot) switchWeapon(to); } F.wheel = 0;
  if (p.holdFire && !mouse.down) p.holdFire = false; p.throwT = Math.max(0, (p.throwT || 0) - dt);
  if (F.armed && !keys.has("tab")) { if (mouse.clicked) throw3("beacon", F.armed); }
  else if (mouse.down && !F.inputMode && !F.code && !p.carry && p.relT <= 0 && p.fireT <= 0 && !sprint && !keys.has("tab") && !(p.dive > .25) && !p.holdFire && !(p.throwT > 0) && !(p.swapT > .15) && (!w.semi || mouse.clicked)) {
    if (p.ammo > 0) fire3(); else if (mouse.clicked) { AU.empty(); if (p.mags > 0) { p.relT = relTime; AU.reload(F.slots[F.slot].key, relTime); } } }
  if (pressed.has("g") && p.gren > 0 && !F.code && !p.carry) { p.gren--; throw3("grenade"); }
  if (pressed.has("f") && p.stims > 0 && p.hp < lo.hp) { p.stims--; p.hp = lo.hp; p.slow = 0; AU.pickup(); fmsg("", "Stim injected", 1); }
  for (let i = F.items.length - 1; i >= 0; i--) { const it = F.items[i]; if (Math.hypot(it.x - p.x, it.z - p.z) < 1.6) { p.samples += it.n; F.items.splice(i, 1); AU.pickup(); fmsg("", `+${it.n} sample${it.n > 1 ? "s" : ""}`, 1.5); } }
  if (pressed.has("e")) { const t = interact3(); if (t) t.go(); }
}
function switchWeapon(i, instant) {
  const p = F.p; if (F.slot >= 0) { const c = F.slots[F.slot]; c.ammo = p.ammo; c.left = p.mags; }
  const s = F.slots[i]; F.slot = i; p.ammo = s.ammo; p.mags = s.left; p.relT = 0; Object.assign(F.lo, { w: s.w, mag: s.mag, mags: s.mags, reload: s.reload }); F.gun = buildViewGun(s.key);
  if (!instant) { p.swapT = .35; AU.draw(); }
}
// the barrel's end in the world: the gun sprite's muzzle pixel, pushed out along the view ray to a metre ahead
function muzzleWorld(eye, yaw, pitch) { const st = F.p, n = st.muzNdc, f = camDir(yaw, pitch), r = [-Math.sin(yaw), 0, Math.cos(yaw)], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  if (!n) return [eye[0] + f[0] + r[0] * .25, eye[1] - .25 + f[1], eye[2] + f[2] + r[2] * .25]; const ty = Math.tan(1.15 / 2), tx = ty * R3.W / R3.H, d = 1.1;
  return [0, 1, 2].map(i => eye[i] + (f[i] + r[i] * n[0] * tx + u[i] * n[1] * ty) * d); }
// a tracer that travels: the slug flies from a to b at about speed m/s
const flyTracer = (a, b, w, col, speed = 380, len = 4) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), T = Math.max(.035, L / speed + len / speed); return { a, b, t: T, max: T, w, col, len: Math.min(len, L) }; };
function camDir(yaw, pitch) { return [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)]; }
function fire3() {
  const p = F.p, w = F.lo.w; p.ammo--; p.fireT = w.rate; F.stats.shots++; p.recoil = Math.min(1, p.recoil + (w.pellets > 1 || w.dmg >= 100 ? .9 : .35)); F.muzT = .05;
  const eye = [p.x, p.y + EYE3, p.z], moving = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d");
  const spr = (w.spread + (moving ? w.moveSpread : 0)) * .8, big = w.pellets > 1 || w.dmg >= 100;
  let impS = null;
  for (let i = 0; i < w.pellets; i++) { const yaw = p.yaw + frand(-spr, spr), pitch = p.pitch + frand(-spr, spr) * .7, d = camDir(yaw, pitch), hit = raycast3(eye, d, w.pellets > 1 ? 40 : 160, w.pierce);
    const muz = muzzleWorld(eye, p.yaw, p.pitch); if (i === 0) F.lights.push({ x: muz[0], y: muz[1], z: muz[2], c: [1, .75, .4], t: .04 });
    if (Math.hypot(hit.pt[0] - eye[0], hit.pt[2] - eye[2]) > 2 && (w.pellets < 2 || i % 2 === 0)) F.tracers.push(flyTracer(muz, hit.pt, big ? .045 : .03, [1, .88, .5], w.pellets > 1 ? 300 : 420, w.pellets > 1 ? 2.5 : 4.5));
    let dmg = w.dmg; if (hit.giant) { hurtGiant(hit.giant, dmg); F.stats.hits++; for (let k = 0; k < 3; k++) addPart(hit.pt[0], hit.pt[1], hit.pt[2], frand(-2, 2), frand(-1, 2), frand(-2, 2), .5, [.5, .75, .3], .2, -9); }
    for (const b of hit.bugs) { const hum = FBUG[b.type].human; hurtBug3(b, dmg, eye[0], eye[2], hum && hit.pt[1] > b.y + FBUG[b.type].h * .79 ? "head" : "bullet"); F.stats.hits++; dmg *= .8;
      if (hum) for (let k = 0; k < 4; k++) addPart(hit.pt[0], hit.pt[1], hit.pt[2], frand(-1.5, 1.5), frand(0, 2), frand(-1.5, 1.5), .35, [.6, .05, .05], .1, -10); }
    if (!impS) { const hd = Math.hypot(hit.pt[0] - eye[0], hit.pt[2] - eye[2]); if (hit.bugs.length && FBUG[hit.bugs[0].type].human) impS = ["flesh", hit.pt]; else if (hd < 30) impS = [hit.giant ? "flesh" : hit.prop ? "rock" : "dirt", hit.pt]; }
    if (!hit.bugs.length || hit.terrain) for (let k = 0; k < 3; k++) addPart(hit.pt[0], hit.pt[1], hit.pt[2], frand(-2, 2), frand(1, 3), frand(-2, 2), .35, F.P.g.map(v => v / 255 * .8), .18, -8); }
  F.lights.push({ x: eye[0], y: eye[1], z: eye[2], c: [1.2, .9, .5], t: .05 });
  if (impS) { const [k, q] = impS, dd = Math.hypot(q[0] - p.x, q[2] - p.z); AU.impact(k, clamp(1.1 - dd / 35, 0, 1) * (k === "flesh" ? 1.3 : 1), panAt(q[0], q[2]), dd / 340); }
  AU.gun(F.slots[F.slot].key); casingEject("field", eye, p.yaw, p.pitch, F.slots[F.slot].key); AU.disturb(); flushBirds(); noise3(p.x, p.z, 70); F.shake = Math.max(F.shake, big ? .025 : .008);
}
// a hitscan ray against bugs, props and the ground
function raycast3(o, d, maxD, pierce = 0) {
  let tEnd = maxD, terrain = false;
  for (let t = 0; t < maxD; t += 1.2) { const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t; if (y < fieldH(x, z)) { let a = Math.max(0, t - 1.2), b = t; for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (o[1] + d[1] * m < fieldH(o[0] + d[0] * m, o[2] + d[2] * m)) b = m; else a = m; } tEnd = b; terrain = true; break; } }
  const cand = new Set(F.coll); for (let t = 0; t < tEnd + 4; t += 6) cgNear(o[0] + d[0] * t, o[2] + d[2] * t, 3, c => { cand.add(c); return false; });
  for (const [cx, cz, cr, top] of cand) { const ox = o[0] - cx, oz = o[2] - cz, A = d[0] ** 2 + d[2] ** 2, Bq = 2 * (ox * d[0] + oz * d[2]), Cq = ox * ox + oz * oz - cr * cr, disc = Bq * Bq - 4 * A * Cq; if (disc < 0 || A < 1e-6) continue;
    const t = (-Bq - Math.sqrt(disc)) / (2 * A); if (t > 0 && t < tEnd && o[1] + d[1] * t < top) { tEnd = t; terrain = true; } }
  const gh = giantRayHit(o, d, tEnd); if (gh) { tEnd = gh.t; terrain = false; }
  const hits = [];
  for (const b of F.bugs) { if (b.hp <= 0) continue; const T = FBUG[b.type], c = [b.x, b.y + T.h * .5, b.z], r = T.hr || T.h * .48, oc = [o[0] - c[0], o[1] - c[1], o[2] - c[2]], bb = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2], cc = oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - r * r, disc = bb * bb - cc;
    if (disc < 0) continue; const t = -bb - Math.sqrt(disc); if (t > 0 && t < tEnd) hits.push([t, b]); }
  hits.sort((a, b) => a[0] - b[0]); const used = hits.slice(0, 1 + pierce); if (used.length && used.length > pierce) { tEnd = used[used.length - 1][0]; terrain = false; }
  return { pt: [o[0] + d[0] * tEnd, o[1] + d[1] * tEnd, o[2] + d[2] * tEnd], bugs: used.map(h => h[1]), terrain, giant: gh && !used.length ? gh.g : null };
}
function hurt3(dmg, src) { if (window.__invis && src) return;
  const p = F.p; if (!p.alive || p.inv > 0 || window.__god) return; const tut = typeof TUT !== "undefined" && TUT.on; dmg *= F.lo.mul * (tut ? .4 : 1); p.hp -= dmg; if (tut && p.hp < 15) p.hp = 15;   // training: it hurts, but you can't die p.hurtT = .4; if (src && src.x != null) F.dmgDir = { x: src.x, z: src.z, t: 1.2 }; AU.hurt(); F.shake = Math.max(F.shake, .03 + dmg / 600);
  if (p.hp <= 0) { if (F.grab) { F.grab.g.state = "idle"; F.grab.g.cd = 6; F.grab = null; } p.hp = 0; p.alive = false; p.deadT = 0; p.reinfStarted = false; F.stats.deaths++; F.armed = null; F.code = null; AU.boom(.3, .5);
    if (p.samples) { F.items.push({ x: p.x, z: p.z, y: fieldH(p.x, p.z), kind: "bag", n: p.samples }); p.samples = 0; }
    if (p.carry) { p.carry = false; Object.assign(F.box, { x: p.x, z: p.z, carried: false }); }
    fmsg("TROOPER DOWN", F.reinf > 0 ? "Reinforcement inbound" : "No reinforcements left", 4); }
}
function hurtBug3(b, dmg, fx, fz, kind) {
  if (b.exhibit) { b.flash = .12; return; } if (window.__ohk) dmg *= 1000;
  if (b.hp <= 0) return; const T = FBUG[b.type];
  if (T.armored && kind === "bullet") { const d = Math.abs(angDiff(b.face, Math.atan2(fz - b.z, fx - b.x))); if (d < 1.1) { dmg *= .12; for (let k = 0; k < 3; k++) addPart(b.x, b.y + T.h * .5, b.z, frand(-3, 3), frand(1, 4), frand(-3, 3), .2, [1, .95, .7], .12, -6); } else if (d > 2.2) dmg *= 1.6; }
  if (b.stun > 0) dmg *= 1.5;
  if (T.human) { if (kind === "head") dmg *= 2.2; humanHurt(b, dmg); }
  if (!T.human && b.hp - dmg > 0 && Math.random() < (b.type === "scav" ? .15 : .3)) AU.bug(b.type, "hurt", volAt(b.x, b.z), panAt(b.x, b.z));
  b.hp -= dmg; b.flash = .08; alert3(b); if (b.type !== "charger" && kind === "bullet") b.stag = .14; const hm = $("f-hit"); hm.classList.remove("go"); hm.classList.toggle("kill", b.hp <= 0); void hm.offsetWidth; hm.classList.add("go");
  if (b.hp <= 0 && T.human) { F.stats.kills++; b.dead = 12; humanDie(b); for (let i = 0; i < 12; i++) addPart(b.x, b.y + 1.2, b.z, frand(-2, 2), frand(.5, 3), frand(-2, 2), frand(.3, .7), Math.random() < .6 ? [.55, .05, .05] : [.3, .02, .02], .12, -12); addDecal(b.x, b.z, .9, [.3, .03, .03]); return; }
  if (b.hp <= 0) { F.stats.kills++; AU.squish((b.type === "charger" ? 1.4 : .8) * volAt(b.x, b.z) * .6); AU.bug(b.type, "death", volAt(b.x, b.z), panAt(b.x, b.z)); b.dead = 12;
    for (let i = 0; i < (b.type === "charger" ? 40 : 14); i++) addPart(b.x, b.y + T.h * .5, b.z, frand(-4, 4), frand(1, 6), frand(-4, 4), frand(.4, .9), Math.random() < .6 ? [.92, .66, .22] : [.66, .38, .16], T.h * .07, -14);
    addDecal(b.x, b.z, T.w * .5, [.4, .26, .08]); }
}
function throw3(type, key) {
  const p = F.p, d = camDir(p.yaw, p.pitch + .18), v = type === "beacon" ? 17 : 15; p.holdFire = true; p.throwT = .35; p.throwKind = type === "beacon" ? STRATS[key].kind : "grenade";
  F.grenades.push({ type, key, x: p.x + d[0] * .6, y: p.y + EYE3 - .1, z: p.z + d[2] * .6, vx: d[0] * v, vy: d[1] * v + 1.5, vz: d[2] * v, fuse: 2.2, settled: false });
  if (type === "beacon") { const S = STRATS[key], mult = (hasMod(F.m, "interference") ? 1.5 : 1) * F.lo.cdMul; if (S.uses) { F.uses[key]--; if (F.uses[key] <= 0) F.rearm[key] = S.rearm * mult; } else F.cd[key] = S.cd * mult; F.armed = null; F.stats.strats++; }
  AU.click();
}
function explode3(x, y, z, r, dmg, o = {}) {
  const p = F.p, dP = Math.hypot(x - p.x, y - p.y - 1, z - p.z);
  AU.boom(r / 6, clamp(1 - dP / 220, .1, 1)); F.shake = Math.max(F.shake, clamp(.15 * (1 - dP / 70) * r / 6, 0, .2));
  F.lights.push({ x, y: y + 2, z, c: [4, 2.6, 1.2].map(v => v * r / 6), t: .35 });
  for (let i = 0; i < r * 6; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.5, s = frand(r, r * 3); addPart(x, y + .5, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 2, Math.sin(a) * Math.cos(e) * s, frand(.25, .6), pick([[1, .85, .3], [1, .55, .15], [1, .95, .7]]), frand(.3, .7), -4); }
  for (let i = 0; i < r * 3; i++) { const a = Math.random() * 6.283, s = frand(.5, r * .8); addPart(x + Math.cos(a) * r * .3, y + .8, z + Math.sin(a) * r * .3, Math.cos(a) * s, frand(1, 4), Math.sin(a) * s, frand(1.2, 2.6), [.24, .22, .2], frand(.8, 1.6), 1, true); }
  addDecal(x, z, r * .6, [.08, .07, .06]);
  for (const b of F.bugs) { const d = Math.hypot(b.x - x, b.y + 1 - y, b.z - z); if (d < r + FBUG[b.type].r) hurtBug3(b, dmg * (1 - .55 * Math.min(1, d / r)), x, z, "boom"); }
  giantBlast(x, y, z, r, dmg);
  if (!o.safe && p.alive && dP < r) hurt3(dmg * .16 * (1 - .5 * dP / r), null);
  if (!o.noHoles) for (const n of F.nests) for (const h of n.holes) if (h.alive && Math.hypot(h.x - x, h.z - z) < r * .7 + 1.5) destroyHole3(n, h);
  noise3(x, z, 130);
}
function destroyHole3(n, h) {
  h.alive = false; h.obj.parts = h.deadParts || FLD.nestPartsDead; (F.smokers = F.smokers || []).push({ x: h.x, y: h.y + .8, z: h.z, t: 45 }); F.coll = F.coll.filter(c => !(c[0] === h.x && c[1] === h.z)); const hum = n.hum; fmsg("", hum ? `${h.label[0].toUpperCase() + h.label.slice(1)} destroyed` : "Bug hole destroyed", 2);
  if (n.holes.every(q => !q.alive)) { n.cleared = true; if (n.main) { if (F.mainNests.every(q => q.cleared)) objectiveDone3(); else fmsg(hum ? "TARGET DESTROYED" : "HIVE DESTROYED", `${F.mainNests.filter(q => q.cleared).length}/3`); } else if (!n.noSpawn) fmsg(hum ? "CAMP DESTROYED" : "BUG NEST DESTROYED", "+40 requisition"); }
}
// ---------- colony outposts: a terminal inside with the colony's data, and a supply locker that opens once it's downloaded ----------
function outpostW(q, lx, lz) { const a = hash2(q.x | 0, q.z | 0, 9) * 6.283, c = Math.cos(a), s = Math.sin(a); return [q.x + lx * c + lz * s, q.z - lx * s + lz * c]; }
function outpostWave(q) { const a = Math.random() * 6.283, x = q.x + Math.cos(a) * 30, z = q.z + Math.sin(a) * 30;
  if (F.foe === "human") launchEnemyPods(x, z, 4 + F.m.diff); else { (F.breaches = F.breaches || []).push({ x, z, t: 2, n: 5 + F.m.diff * 2, spT: 0 }); AU.rumble(); } noise3(q.x, q.z, 160); }
function updateOutposts(dt) { const p = F.p;
  for (const q of F.pois) { if (q.kind !== "outpost" || q.state !== "upload") continue; const [tx, tz] = outpostW(q, .4, -2.2), near = Math.hypot(p.x - tx, p.z - tz) < 10 && p.alive;
    if (near) q.prog += dt / 28; q.msgT = (q.msgT || 0) - dt; if (q.msgT <= 0) { q.msgT = .5; fmsg("", near ? `Downloading colony data · ${Math.floor(q.prog * 100)}%` : "Download paused · get back to the terminal", .7); }
    if (q.prog > .5 && !q.wave2) { q.wave2 = true; outpostWave(q); }
    if (q.prog >= 1) { q.state = "done"; q.locker = true; p.samples += 3; for (const o of F.pois) o.seen = true; AU.armed(); fmsg("DATA RECOVERED", "+3 samples · every point of interest marked · the supply locker is open", 4); } } }
// ---------- Full operations: two side objectives picked from what's on the map ----------
function setupSide(m) { if (m.size !== "full" || m.dev) return; const R = seeded(m.seed + 31), o = FLD.obj, far = (x, z) => Math.hypot(x - o.x, z - o.z) > 45, C = [];
  for (const q of F.pois) { if (!far(q.x, q.z)) continue;
    if (q.kind === "outpost") C.push({ kind: "outpost", x: q.x, z: q.z, ref: q, label: "Download the colony data", mk: "OUTPOST" });
    else if (q.kind === "cache") C.push({ kind: "cache", x: q.x, z: q.z, ref: q, label: "Open the supply cache", mk: "CACHE" });
    else C.push({ kind: "scout", x: q.x, z: q.z, ref: q, label: `Scout the ${POI_NAME[q.kind]}`, mk: "SCOUT" }); }
  for (const n of F.nests) if (!n.main && !n.noSpawn && far(n.x, n.z)) C.push({ kind: "nest", x: n.x, z: n.z, ref: n, label: n.hum ? "Destroy a mercenary camp" : "Destroy a bug nest", mk: n.hum ? "CAMP" : "NEST" });
  const out = []; while (out.length < 2 && C.length) { const k = Math.floor(R() * C.length), c = C.splice(k, 1)[0]; if (out.some(s => s.kind === c.kind) && C.some(x => !out.some(s => s.kind === x.kind))) continue; out.push(c); }
  F.side = out.map(s => ({ ...s, done: false })); }
function updateSide() { const p = F.p;
  for (const s of F.side) { if (s.done) continue; const q = s.ref;
    s.done = s.kind === "outpost" ? q.state === "done" : s.kind === "cache" ? !!q.used : s.kind === "nest" ? !!q.cleared : p.alive && Math.hypot(p.x - s.x, p.z - s.z) < 14;
    if (s.done) { AU.armed(); fmsg("SIDE OBJECTIVE COMPLETE", s.label + ` · ${F.side.filter(x => x.done).length}/${F.side.length}`, 3); if (s.kind === "scout") q.seen = true; } } }
function objectiveDone3() { if (F.obj.done) return; F.obj.done = true; F.ext.state = "ready"; showTitle3("OBJECTIVE COMPLETE", "Head to the extraction point"); AU.armed(); }

// ---------- interaction ----------
function interact3() {
  const p = F.p; if (!p.alive) return null; if (F.dev) { const ex = devNearestEx(); if (ex) return ex; }
  for (const q of F.pois) if (q.kind === "cache" && !q.used && Math.hypot(q.x - p.x, q.z - p.z) < 2.4) return { label: "Open the supply cache", go() { q.used = true; p.mags = F.lo.mags; F.slots[1 - F.slot].left = F.slots[1 - F.slot].mags; p.gren = F.lo.gren; p.stims = F.lo.stims; p.samples += 2; AU.pickup(); fmsg("SUPPLY CACHE", "Ammo, grenades and stims refilled · +2 samples", 3); } };
  for (const q of F.pois) { if (q.kind !== "outpost") continue; const [tx, tz] = outpostW(q, .4, -2.2), [lx, lz] = outpostW(q, 9.6, -3);
    if (!q.state && Math.hypot(tx - p.x, tz - p.z) < 1.8) return { label: "Download the colony data", go() { q.state = "upload"; q.prog = 0; showTitle3("DOWNLOADING", F.foe === "human" ? "They've seen you: hold the outpost" : "The noise is drawing them in: hold the outpost"); outpostWave(q);
        for (const b of F.bugs) if (b.hp > 0 && Math.hypot(b.x - q.x, b.z - q.z) < 40) { b.state = "hunt"; b.sees = 9; } } };
    if (Math.hypot(lx - p.x, lz - p.z) < 2.2) { if (q.locker) return { label: "Open the supply locker", go() { q.locker = false; q.lockerUsed = true; p.mags = F.lo.mags; F.slots[1 - F.slot].left = F.slots[1 - F.slot].mags; p.gren = F.lo.gren; p.stims = F.lo.stims; AU.pickup(); fmsg("SUPPLY LOCKER", "Ammo, grenades and stims refilled", 3); } };
      if (!q.lockerUsed) return { label: "Locked · download the colony data first", go() { AU.fail(); } }; } }
  for (const c of F.crates) if (c.uses > 0 && Math.hypot(c.x - p.x, c.z - p.z) < 2.2) return { label: "Resupply", go() { c.uses--; p.mags = F.lo.mags; F.slots[1 - F.slot].left = F.slots[1 - F.slot].mags; p.gren = F.lo.gren; p.stims = F.lo.stims; AU.pickup(); fmsg("", "Resupplied", 1.5); } };
  const t = F.term; if (t && Math.hypot(t.x - p.x, p.z - t.z - 1) < 2.2) {
    if (F.code) return { label: "Step away", go() { F.code = null; } };
    if (t.state === "idle" && t.defend) return { label: "Switch on the colony relay", go() { t.state = "upload"; t.waveT = 3; showTitle3("RELAY ONLINE", "Hold the line until the evacuation is done"); AU.alarm(); noise3(t.x, t.z, 250); } };
    if (t.state === "idle") return { label: "Access the uplink terminal", go() { F.code = { seq: Array.from({ length: 6 + Math.floor(F.m.diff / 2) }, () => pick("UDLR")), i: 0, fail: 0, done() { t.state = "upload"; showTitle3("UPLOADING", "Defend the terminal"); noise3(t.x, t.z, 200); } }; } }; }
  if (F.box && !F.box.delivered) { if (p.carry) return { label: "Drop the black box", go() { p.carry = false; Object.assign(F.box, { x: p.x, z: p.z, carried: false }); } };
    if (Math.hypot(F.box.x - p.x, F.box.z - p.z) < 2.2) return { label: "Pick up the black box", go() { p.carry = true; F.box.carried = true; p.relT = 0; AU.pickup(); } }; }
  for (const n of F.nests) if (n.hum) for (const h of n.holes) if (h.alive && !h.charged && Math.hypot(h.x - p.x, h.z - p.z) < 3) return { label: `Plant a charge on the ${h.label}`, go() { plantCharge(n, h); } };
  const e = F.ext; if (e.state === "ready" && Math.hypot(e.x + 10.5 - p.x, e.z - p.z) < 2.6) return { label: "Call extraction", go() { e.state = "called"; e.t = typeof TUT !== "undefined" && TUT.on ? 16 : Math.round(50 * (F.lo.extMul || 1)); e.waveT = typeof TUT !== "undefined" && TUT.on ? 7 : 4; showTitle3("EXTRACTION INBOUND", "Hold the landing zone"); AU.alarm(); } };
  if (e.state === "rope" && Math.hypot(ropeX() - p.x, ropeZ() - p.z) < 2.6) return { label: "Grab the rope", go() { e.state = "climb"; e.t = 0; e.from = { x: p.x, y: p.y, z: p.z }; } };
  return null;
}
function codeInput3(ch) { const c = F.code; if (!c) return; if (c.seq[c.i] === ch) { c.i++; AU.key(c.i); if (c.i >= c.seq.length) { F.code = null; AU.armed(); c.done(); } } else { c.i = 0; AU.fail(); c.fail = .35; } }
const stratOffline3 = () => F.ion > 0 || F.destroyerGone;
const stratReady3 = k => STRATS[k].uses ? F.uses[k] > 0 && F.rearm[k] <= 0 : F.cd[k] <= 0;
function stratInput3(ch) { if (F.armed) return; if (stratOffline3()) { AU.fail(); F.inputFail = .4; return; } F.input += ch;
  const mm = F.lo.strats.filter(k => stratReady3(k) && STRATS[k].code.startsWith(F.input)); if (!mm.length) { AU.fail(); F.input = ""; F.inputFail = .35; return; }
  AU.key(F.input.length - 1); const full = mm.find(k => STRATS[k].code === F.input); if (full) { F.armed = full; F.input = ""; AU.armed(); } }
function fireStrat3(b) {
  const { x, z, key } = b, y = fieldH(x, z), pod = (onLand) => { F.pods.push({ x, z, y: y + 260, gy: y, onLand }); AU.pod(); };
  if (key === "resupply") pod(() => { explode3(x, y, z, 3, 400, { noHoles: true, safe: true }); F.crates.push({ x, z, uses: F.lo.crateUses || 4 }); F.objs.push({ parts: FLD.crateParts, M: mT(x, y, z), kind: "crate" }); F.coll.push([x, z, .7, y + 1]); });
  if (key === "sentry" || key === "rocket") pod(() => { explode3(x, y, z, 3, 400, { noHoles: true, safe: true }); const s = { x, z, y, a: 0, ammo: Math.round((key === "rocket" ? 30 : 300) * (F.lo.sentryMul || 1)), fireT: 1, life: 150 * (F.lo.sentryMul || 1), rocket: key === "rocket", target: null, scanT: 0 }; F.sentries.push(s); F.coll.push([x, z, .5, y + 1.2]); });
  if (key === "eagle" || key === "cluster") { const dir = Math.atan2(z - F.p.z, x - F.p.x), n = key === "cluster" ? 14 : 5; F.jets.push({ x, z, dir, t: 0 }); AU.jet();
    for (let i = 0; i < n; i++) { const along = key === "cluster" ? frand(-14, 14) : (i - 2) * 6, side = key === "cluster" ? frand(-5, 5) : frand(-1, 1); F.strikes.push({ x: x + Math.cos(dir) * along - Math.sin(dir) * side, z: z + Math.sin(dir) * along + Math.cos(dir) * side, t: .9 + (along + 14) / 28 * .4, r: key === "cluster" ? 4 : 7, dmg: key === "cluster" ? 300 : 700 }); } }
  if (key === "precision") F.strikes.push({ x, z, t: 1.2, r: 10, dmg: 2800, beam: true });
  if (key === "rail") { let t = null; for (const q of F.bugs) if (Math.hypot(q.x - x, q.z - z) < 25 && q.hp > 0 && (!t || q.hp > t.hp)) t = q; F.strikes.push({ x: t ? t.x : x, z: t ? t.z : z, t: .9, r: 5, dmg: 4500, beam: true, target: t }); }
  if (key === "barrage") for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * 20; F.strikes.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, t: 1 + i * .65, r: 7, dmg: 900, warn: true }); }
}

// ---------- bugs ----------
function updateBugs3(dt) {
  const p = F.p, sight = hasMod(F.m, "fog") ? 30 : hasMod(F.m, "rain") ? 38 : 48, cap = fieldCap();
  for (const b of F.bugs) {
    if (b.exhibit) { devExTick(b, dt); continue; } if (window.__freeze && b.dead == null) continue;
    if (b.dead != null) { b.dead -= dt; continue; }
    const T = FBUG[b.type]; if (T.human) { b.flash -= dt; if (b.stun > 0) { b.stun -= dt; continue; } updateHuman3(b, dt); continue; }
    b.flash -= dt; b.atkT -= dt; b.lunge = Math.max(0, b.lunge - dt * 4); b.chCd -= dt; b.anim += dt;
    if (b.stun > 0) { b.stun -= dt; continue; }
    const dx = p.x - b.x, dz = p.z - b.z, dp = Math.hypot(dx, dz);
    if (b.wind) { b.wind -= dt; if (b.wind <= 0) { b.wind = 0; b.atkT = T.cd; b.lunge = 1; if (dp < T.rng + .9 && Math.abs(p.y - b.y) < 2.5 && p.alive) hurt3(T.dmg, b); } }
    if (p.alive && dp < sight && b.state !== "hunt" && !window.__invis) alert3(b);
    let tx = null, tz = null, spd = b.spd; if (b.stag > 0) { b.stag -= dt; spd *= .35; }
    if (b.state === "hunt" && window.__invis) { b.state = "idle"; b.home = { x: b.x, z: b.z }; b.ch = null; b.wind = 0; }   // ignored: back to whatever it was doing
    if (b.state === "hunt") {
      if (!p.alive) { b.state = "idle"; b.home = { x: b.x, z: b.z }; continue; }
      if (dp < sight) { b.lost = 0; b.sees += dt; } else { b.lost += dt; b.sees = Math.max(0, b.sees - dt); if (b.lost > 25) { b.state = "idle"; b.home = { x: b.x, z: b.z }; } }
      if (b.sees > 4 && F.breachCool <= 0 && b.type !== "charger" && Math.random() < dt * .12 && F.bugs.length < cap) callBreach3();
      tx = p.x; tz = p.z;
      if (T.ranged) { b.fleeing = dp < 7; if (b.fleeing) { tx = b.x - dx; tz = b.z - dz; spd *= 1.1; } else if (dp < 15) { tx = b.x - dx; tz = b.z - dz; spd *= .4; } else if (dp < T.rng) tx = null;
        b.spitT -= dt; if (dp < T.rng && b.spitT <= 0) { b.spitT = frand(2.2, 3.2); const tt = dp / 18, aimx = p.x + (p.vx || 0) * tt, aimz = p.z + (p.vz || 0) * tt, ad = Math.hypot(aimx - b.x, aimz - b.z);
          F.spits.push({ x: b.x, y: b.y + T.h * .6, z: b.z, vx: (aimx - b.x) / ad * 18, vy: 2 + ad * .25, vz: (aimz - b.z) / ad * 18, life: 3 }); AU.squish(.35 * volAt(b.x, b.z)); AU.bug("spitter", "spit", volAt(b.x, b.z), panAt(b.x, b.z)); b.lunge = 1; } }
      if (T.armored) {
        if (!b.ch && dp < 32 && dp > 6 && b.chCd <= 0) { b.ch = "wind"; b.chT = .8; AU.bug(b.type, "charge", volAt(b.x, b.z) * 1.1, panAt(b.x, b.z)); }
        if (b.ch === "wind") { b.chT -= dt; b.face = Math.atan2(dz, dx); tx = null; if (b.chT <= 0) { b.ch = "run"; b.chT = 1.6; b.chDir = Math.atan2(dz, dx); } }
        else if (b.ch === "run") { b.chT -= dt; b.chDir += clamp(angDiff(b.chDir, Math.atan2(dz, dx)), -.5 * dt, .5 * dt); const v = 13.5;
          if (move3(b, Math.cos(b.chDir) * v * dt, Math.sin(b.chDir) * v * dt, T.r)) { b.ch = null; b.stun = 2.2; b.chCd = 4; AU.boom(.5, volAt(b.x, b.z)); F.shake = Math.max(F.shake, .05 * volAt(b.x, b.z)); }
          if (dp < T.r + .8 && p.inv <= 0 && p.alive) { hurt3(T.dmg, b); p.vy = 5; const k = Math.atan2(dz, dx); move3(p, Math.cos(k) * 3, Math.sin(k) * 3, .4); p.y = Math.max(p.y, fieldH(p.x, p.z)); p.inv = .6; }
          b.face = b.chDir; b.y = fieldH(b.x, b.z); if (b.chT <= 0) { b.ch = null; b.chCd = 3.5; } b.anim += dt * 2; continue; } }
      if (dp < T.rng + .6 && !T.ranged) { tx = null; b.face = Math.atan2(dz, dx); if (b.atkT <= 0 && !b.wind) { b.wind = .32; b.lunge = .5; if (Math.random() < .6) AU.bug(b.type, "attack", volAt(b.x, b.z), panAt(b.x, b.z)); } }
    } else { b.wT -= dt; if (b.wT <= 0 || !b.wt) { b.wT = frand(2, 6); b.wt = { x: b.home.x + frand(-12, 12), z: b.home.z + frand(-12, 12) }; }
      if (Math.hypot(b.wt.x - b.x, b.wt.z - b.z) > 1) { tx = b.wt.x; tz = b.wt.z; spd *= .3; } }
    if (FLD.waterOn && waterDepth(b.x, b.z) > .25) spd *= .65;
    if (tx != null) { b.av = (b.av || 0) - dt; const a = Math.atan2(tz - b.z, tx - b.x) + (b.av > 0 ? b.avs * 1.2 : 0); if (!(T.ranged && b.state === "hunt" && !b.fleeing)) b.face += angDiff(b.face, a) * Math.min(1, dt * 8);
      if (move3(b, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt, T.r)) { if (b.state !== "hunt") b.wT = 0; else if (b.av <= 0) { b.av = frand(.6, 1.2); b.avs = Math.random() < .5 ? -1 : 1; } } b.anim += dt * spd * .25; }
    // the spitter keeps its mouth on you: it only turns its back when it has to run
    if (T.ranged && b.state === "hunt" && !b.fleeing && dp < T.rng + 12) b.face += angDiff(b.face, Math.atan2(dz, dx)) * Math.min(1, dt * 6);
    b.y = fieldH(b.x, b.z);
  }
  // separation
  for (let i = 0; i < F.bugs.length; i++) { const a = F.bugs[i]; if (a.dead != null || a.dormant || a.grab || a.dropping) continue; for (let j = i + 1; j < F.bugs.length; j++) { const c = F.bugs[j]; if (c.dead != null) continue;
      const r = FBUG[a.type].r + FBUG[c.type].r, d = Math.hypot(a.x - c.x, a.z - c.z); if (d < r && d > .01) { const k = (r - d) * .5 / d; a.x += (a.x - c.x) * k * .5; a.z += (a.z - c.z) * k * .5; c.x -= (a.x - c.x) * k * .5; c.z -= (a.z - c.z) * k * .5; } } }
  F.bugs = F.bugs.filter(b => b.dead == null || b.dead > 0);
  // acid
  for (let i = F.spits.length - 1; i >= 0; i--) { const s = F.spits[i]; s.life -= dt; s.vy -= 9 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    if (Math.random() < .6) addPart(s.x, s.y, s.z, 0, 0, 0, .3, [.65, .86, .28], .16, 0);
    const hitP = p.alive && Math.hypot(s.x - p.x, s.y - p.y - 1, s.z - p.z) < 1.1;
    if (hitP) { hurt3(FBUG.spitter.dmg, { x: s.x - s.vx, z: s.z - s.vz }); p.slow = 1.6; }
    if (hitP || s.life <= 0 || s.y < fieldH(s.x, s.z)) { for (let k = 0; k < 8; k++) addPart(s.x, s.y, s.z, frand(-2, 2), frand(0, 2), frand(-2, 2), .4, [.65, .86, .28], .14, -6); addDecal(s.x, s.z, .8, [.3, .45, .12]); F.spits.splice(i, 1); } }
}
function callBreach3() { if (window.__invis) return;
  F.breachCool = Math.max(28, 70 - F.m.diff * 7); const p = F.p;
  const hum = F.foe === "human";
  for (let k = 0; k < 20; k++) { const a = hum ? p.yaw + Math.PI + frand(-1.2, 1.2) : Math.random() * 6.283, d = hum ? frand(45, 60) : frand(22, 34), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (blocked3(x, z, 2)) continue;
    F.breaches = F.breaches || []; F.breaches.push({ x, z, t: hum ? 1 : 2.2, n: hum ? 3 + Math.ceil(F.m.diff * .8) : 5 + F.m.diff * 2 + (hasMod(F.m, "swarm") ? 4 : 0), spT: 0, hum });
    if (hum) { AU.bark("Requesting backup!", .8, 0, .9); fmsg("", "ENEMY REINFORCEMENTS", 2); } else { AU.rumble(); AU.bug("breach", "alert", 1); fmsg("", "BUG BREACH", 2); } return; }
}
function updateNests3(dt) {
  const p = F.p, cap = fieldCap();
  for (const n of F.nests) { if (n.cleared || !p.alive) continue; const d = Math.hypot(n.x - p.x, n.z - p.z); n.spT -= dt;
    if (d < 90 && n.spT <= 0 && F.bugs.length < cap) { n.spT = (n.main ? 4 : 7) - F.m.diff * .35; const holes = n.holes.filter(q => q.alive), h = pick(holes);
      if (F.bugs.filter(b => b.nest === n && b.dead == null).length < (n.main ? 9 : 5) + F.m.diff) { const sa = Math.random() * 6.283; spawnBug(bugMix3(), h.x + Math.cos(sa) * 2.9, h.z + Math.sin(sa) * 2.9, d < 60 ? "hunt" : "idle", n); for (let k = 0; k < 6; k++) addPart(h.x, h.y + 1, h.z, frand(-2, 2), frand(2, 5), frand(-2, 2), .8, [.4, .3, .2], .5, -6, true); } } }
  for (let i = (F.breaches || []).length - 1; i >= 0; i--) { const br = F.breaches[i]; br.t -= dt; const y = fieldH(br.x, br.z);
    if (F.foe === "human") { launchEnemyPods(br.x, br.z, br.n); F.breaches.splice(i, 1); continue; }   // mercs come down in drop pods
    if (!br.hum && F.foe !== "human" && Math.random() < .7) addPart(br.x + frand(-3, 3), y + .2, br.z + frand(-3, 3), frand(-1, 1), frand(2, 6), frand(-1, 1), frand(.6, 1.2), F.P.g.map(v => v / 255 * .7), frand(.5, 1), -4, true);
    if (br.t <= 0 && F.bugs.length >= fieldCap() + 12) br.n = 0; if (br.t <= 0) { br.spT -= dt; if (br.spT <= 0) { br.spT = F.foe === "human" ? .5 : .25; spawnBug(bugMix3(), br.x + frand(-3, 3), br.z + frand(-3, 3), "hunt"); br.n--; } }
    if (br.n <= 0) { F.breaches.splice(i, 1); if (F.foe !== "human") addDecal(br.x, br.z, 4, [.18, .13, .09]); } }
}

// ---------- the director: patrols, hazards, timers, objectives, extraction ----------
function updateDirector3(dt) {
  const p = F.p, m = F.m, cap = fieldCap(); F.timeLeft -= dt; F.breachCool -= dt;
  if (F.timeLeft <= 0 && !F.destroyerGone) { F.destroyerGone = true; F.armed = null; showTitle3("DESTROYER HAS LEFT ORBIT", "Stratagems unavailable. Extract now."); }
  for (const q of F.pois || []) if (!q.seen && p.alive && Math.hypot(q.x - p.x, q.z - p.z) < 70) { q.seen = true; fmsg("DISCOVERED", POI_NAME[q.kind], 2.5); }
  F.patrolT -= dt; if (F.patrolT <= 0 && p.alive) { F.patrolT = Math.max(25, 55 - m.diff * 5) * frand(.8, 1.2);
    if (F.bugs.length < cap * .7) { const a = Math.random() * 6.283, d = frand(90, 130), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (Math.hypot(x, z) < FW.RW * .9) {
        for (let i = 0; i < 2 + randi(1, 3) + Math.floor(m.diff / 2) + (hasMod(m, "swarm") ? 2 : 0); i++) { const b = spawnBug(bugMix3(), x + frand(-5, 5), z + frand(-5, 5), "idle"); b.home = { x: lerp(x, p.x, .7), z: lerp(z, p.z, .7) }; b.wT = 0; } } } }
  if (hasMod(m, "ion")) { if (F.ion > 0) { F.ion -= dt; if (F.ion <= 0) { F.ionT = frand(60, 95); fmsg("ION STORM PASSED", "Stratagems back online"); } } else { F.ionT -= dt; if (F.ionT <= 0) { F.ion = 20; F.armed = null; fmsg("ION STORM", "Stratagems offline"); AU.alarm(); } } }
  if (hasMod(m, "meteor") && p.alive) { F.metT -= dt; if (F.metT <= 0) { F.metT = frand(7, 13); const a = Math.random() * 6.283, d = frand(8, 45); F.strikes.push({ x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, t: 2.6, r: 8, dmg: 900, warn: true, meteor: true }); } }
  updateCharges(dt);
  // strategem timers, beacons, strikes, pods, sentries, jets
  for (const k in F.cd) F.cd[k] = Math.max(0, F.cd[k] - dt);
  for (const k in F.rearm) if (F.rearm[k] > 0) { F.rearm[k] -= dt; if (F.rearm[k] <= 0) { F.uses[k] = STRATS[k].uses + F.lo.eagleBonus; fmsg("", "Eagle rearmed", 2); } }
  for (let i = F.beacons.length - 1; i >= 0; i--) { const b = F.beacons[i]; b.t -= dt; if (b.t <= 0) { F.beacons.splice(i, 1); fireStrat3(b); } }
  for (let i = F.strikes.length - 1; i >= 0; i--) { const s = F.strikes[i]; s.t -= dt; if (s.warn && !s.whist && s.t < 1.4) { s.whist = true; AU.incoming(volAt(s.x, s.z), Math.max(.3, s.t)); }
    if (s.t <= 0) { F.strikes.splice(i, 1); const y = fieldH(s.x, s.z); if (s.beam) AU.railgun(volAt(s.x, s.z)); if (s.target && s.target.hp > 0) hurtBug3(s.target, s.dmg, s.x, s.z, "boom"); explode3(s.x, y, s.z, s.r, s.dmg); if (s.beam) F.beams.push({ x: s.x, z: s.z, t: .5 }); } }
  for (let i = F.pods.length - 1; i >= 0; i--) { const pd = F.pods[i], h = pd.y - pd.gy; pd.y -= (h > 20 ? 120 : 26) * dt;
    if (h > 20) { for (let k = 0; k < 2; k++) addPart(pd.x + frand(-.3, .3), pd.y + 3 + frand(0, 2), pd.z + frand(-.3, .3), frand(-.5, .5), frand(1, 3), frand(-.5, .5), frand(.6, 1.2), [.45, .43, .42], frand(.5, .8), 1, true);
      addPart(pd.x, pd.y + 2.9, pd.z, 0, 4, 0, .12, [1, .7, .3], .5, 0); }
    else retroFx(pd, 1);
    if (pd.y <= pd.gy) { F.pods.splice(i, 1); pd.onLand(); AU.boom(.45, volAt(pd.x, pd.z)); AU.metalHit(volAt(pd.x, pd.z)); for (let k = 0; k < 24; k++) { const a = Math.random() * 6.283, sp = frand(4, 10); addPart(pd.x + Math.cos(a), pd.gy + .3, pd.z + Math.sin(a), Math.cos(a) * sp, frand(.5, 2.5), Math.sin(a) * sp, frand(.7, 1.4), F.P.g.map(v => v / 255 * .75), .6, -2, true); } } }
  for (const j of F.jets) j.t += dt; F.jets = F.jets.filter(j => j.t < 3);
  F.beams = (F.beams || []).filter(b => (b.t -= dt) > 0);
  for (let i = F.sentries.length - 1; i >= 0; i--) { const s = F.sentries[i]; s.life -= dt; s.fireT -= dt; s.scanT -= dt; s.kick = Math.max(0, (s.kick || 0) - dt * .9);
    if (s.scanT <= 0) { s.scanT = .25; s.target = null; let best = 1e9; for (const b of F.bugs) { if (b.hp <= 0) continue; const d = Math.hypot(b.x - s.x, b.z - s.z); if (d < 55 && (s.rocket ? -b.hp + d : d) < best) { best = s.rocket ? -b.hp + d : d; s.target = b; } } }
    if (s.target && s.target.hp > 0) { const aim = Math.atan2(s.target.z - s.z, s.target.x - s.x) + Math.sin(F.t * 2.3 + s.x) * .03, tr = s.rocket ? 1 : 1.5; s.a += clamp(angDiff(s.a, aim), -tr * dt, tr * dt);   // a heavy head: slow to traverse, with a little wander
      if (Math.abs(angDiff(s.a, aim)) < .12 && s.fireT <= 0 && s.ammo > 0) { s.fireT = s.rocket ? 1.2 : .11; s.ammo--; s.kick = s.rocket ? .12 : .06; const T = FBUG[s.target.type], tp = [s.target.x + frand(-.3, .3), s.target.y + T.h * .5, s.target.z + frand(-.3, .3)];
        // the two barrels fire in turn, each from its own muzzle; plenty of rounds go wide, more so at range
        s.bar = s.rocket ? 0 : 1 - (s.bar || 0); const ml = s.rocket ? 1 : 1.55, lo = s.rocket ? 0 : (s.bar ? .085 : -.085), mz = [s.x + Math.cos(s.a) * ml - Math.sin(s.a) * lo, s.y + 1.07, s.z + Math.sin(s.a) * ml + Math.cos(s.a) * lo];
        const dT = Math.hypot(tp[0] - s.x, tp[2] - s.z), hitK = s.rocket ? 1 : clamp(.6 - dT / 90, .25, .6), hit = Math.random() < hitK;
        if (!hit) { const a = Math.random() * 6.283, m = frand(.8, 2.4) * (1 + dT / 40); tp[0] += Math.cos(a) * m; tp[2] += Math.sin(a) * m; tp[1] = Math.min(tp[1] + frand(-.6, 1.2), fieldH(tp[0], tp[2]) + frand(0, 2.4));
          if (tp[1] <= fieldH(tp[0], tp[2]) + .2) for (let k = 0; k < 3; k++) addPart(tp[0], fieldH(tp[0], tp[2]) + .1, tp[2], frand(-1, 1), frand(1, 3), frand(-1, 1), .4, F.P.g.map(v => v / 255 * .7), .12, -9); }
        F.lights.push({ x: mz[0], y: mz[1], z: mz[2], c: [1, .7, .3], t: .05 });
        F.tracers.push(s.rocket ? { a: mz, b: tp, t: .07, max: .07, w: .15, col: [1, .6, .2] } : flyTracer(mz, tp, .05, [1, .9, .5], 340, 3.5));
        if (s.rocket) explode3(tp[0], tp[1] - 1, tp[2], 4, 350, { safe: Math.hypot(tp[0] - F.p.x, tp[2] - F.p.z) > 6 }); else { if (hit) hurtBug3(s.target, 32, s.x, s.z, "bullet"); AU.sentry(volAt(s.x, s.z)); } noise3(s.x, s.z, 60); } }
    if (s.ammo <= 0 || s.life <= 0) { F.sentries.splice(i, 1); F.coll = F.coll.filter(c => !(c[0] === s.x && c[1] === s.z)); explode3(s.x, s.y, s.z, 2.5, 100, { noHoles: true }); } }
  // grenades and beacons in flight
  for (let i = F.grenades.length - 1; i >= 0; i--) { const g = F.grenades[i];
    if (!g.settled) { g.vy -= 19 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; const gy = fieldH(g.x, g.z);
      if (blocked3(g.x, g.z, .15, g.y)) { g.vx *= -.4; g.vz *= -.4; g.x += g.vx * dt * 2; g.z += g.vz * dt * 2; }
      if (g.y < gy + .1) { g.y = gy + .1; if (g.type === "beacon") { g.settled = true; } else { g.vy = Math.abs(g.vy) * .35; g.vx *= .55; g.vz *= .55; if (Math.hypot(g.vx, g.vz) < .8 && g.vy < 1.5) g.settled = true; } } }
    if (g.type === "beacon" && g.settled) { const S = STRATS[g.key]; const dl = S.delay * (F.lo.callMul || 1) + .8; F.beacons.push({ x: g.x, z: g.z, key: g.key, t: dl, T: dl }); AU.beacon(); F.grenades.splice(i, 1); continue; }
    if (g.type === "grenade") { g.fuse -= dt; if (g.fuse <= 0) { F.grenades.splice(i, 1); explode3(g.x, g.y, g.z, g.enemy ? 5 : 7, g.enemy ? 180 : 520); } } }
  // objectives
  const t = F.term;
  if (t && t.state === "upload") { t.contested = F.bugs.filter(b => b.dead == null && Math.hypot(b.x - t.x, b.z - t.z) < 7).length >= 3; if (!t.contested) t.prog += dt / (typeof TUT !== "undefined" && TUT.on ? 22 : t.defend ? 150 : 50);
    t.waveT -= dt; if (t.waveT <= 0) { t.waveT = t.defend ? Math.max(7, 12 - m.diff) : Math.max(9, 16 - m.diff); const a = Math.random() * 6.283; F.breaches = F.breaches || []; F.breaches.push({ x: t.x + Math.cos(a) * 28, z: t.z + Math.sin(a) * 28, t: 2, n: typeof TUT !== "undefined" && TUT.on ? 3 : 4 + m.diff, spT: 0 }); AU.rumble(); }
    if (t.prog >= 1) { t.state = "done"; objectiveDone3(); } }
  if (F.box && !F.box.delivered) { if (F.box.carried) { F.box.x = p.x; F.box.z = p.z; }
    if (F.box.carried && Math.hypot(F.box.x - F.ext.x, F.box.z - F.ext.z) < 9) { F.box.delivered = true; F.box.carried = false; p.carry = false; F.box.x = F.ext.x + 4; F.box.z = F.ext.z + 3; objectiveDone3(); } }
  // extraction: called → inbound → hover → rope → climb → away
  const e = F.ext;
  if (e.state === "inbound" || e.state === "rope" || e.state === "climb" || e.state === "away") { const pp = pelicanPos(), d = Math.hypot(pp[0] - p.x, pp[1] - p.y, pp[2] - p.z); AU.pelican(clamp(1 - d / 170, .04, 1), panAt(pp[0], pp[2])); } else if (AU._pel) AU.pelican(0);
  if (e.state === "called") { e.t -= dt; e.waveT -= dt; if (e.waveT <= 0) { e.waveT = Math.max(8, 14 - m.diff); const a = Math.random() * 6.283; F.breaches = F.breaches || []; F.breaches.push({ x: e.x + Math.cos(a) * 30, z: e.z + Math.sin(a) * 30, t: 2, n: typeof TUT !== "undefined" && TUT.on ? 3 : 4 + m.diff, spT: 0 }); AU.rumble(); }
    if (e.t <= 0) { e.state = "inbound"; e.t = 0; AU.ship(); } }
  else if (e.state === "inbound") { e.t += dt; if (e.t > 7) { e.state = "rope"; e.t = 0; showTitle3("GET TO THE ROPE", "Press E at the rope to board"); } }
  else if (e.state === "rope" || e.state === "climb") { e.t += dt; e.gatT = (e.gatT || 0) - dt; let best = null, bd = 60; for (const b of F.bugs) { if (b.hp <= 0) continue; const d = Math.hypot(b.x - e.x, b.z - e.z); if (d < bd) { bd = d; best = b; } }
    // the 30 mm chin cannon: slews onto the nearest target and lobs high-explosive shells at it, slowly and none too precisely
    e.kick = Math.max(0, (e.kick || 0) - dt * .8);
    if (best) { const PM = mChain(mT(...pelicanPos()), mRy(-e.yaw)), piv = xf(PM, [5, -2.05, 0]), T = FBUG[best.type], ty = best.y + T.h * .4;
      const wy = Math.atan2(best.z - piv[2], best.x - piv[0]), ly = angDiff(0, wy - e.yaw), lp = Math.atan2(ty - piv[1], Math.hypot(best.x - piv[0], best.z - piv[2]));
      e.tyaw = (e.tyaw || 0) + clamp(angDiff(e.tyaw || 0, ly), -1.6 * dt, 1.6 * dt); e.tpitch = (e.tpitch ?? -.2) + clamp(lp - (e.tpitch ?? -.2), -1.2 * dt, 1.2 * dt);
      if (e.gatT <= 0 && Math.abs(angDiff(e.tyaw, ly)) < .1) { e.gatT = frand(.55, .85); e.kick = .35;
        const mz = xf(pelTurretM(PM, e), [5.3, 0, 0]), a = Math.random() * 6.283, miss = frand(.5, 4), tx = best.x + Math.cos(a) * miss, tz = best.z + Math.sin(a) * miss, d = Math.hypot(tx - mz[0], ty - mz[1], tz - mz[2]), sp = 150;
        F.shells = F.shells || []; F.shells.push({ p: mz.slice(), v: [(tx - mz[0]) / d * sp, (ty - .6 - mz[1]) / d * sp, (tz - mz[2]) / d * sp], t: 0 });
        AU.cannon(volAt(e.x, e.z)); F.lights.push({ x: mz[0], y: mz[1], z: mz[2], c: [1.4, .9, .4], t: .08 }); for (let k = 0; k < 6; k++) addPart(mz[0], mz[1], mz[2], frand(-2, 2), frand(-1, 2), frand(-2, 2), frand(.4, .8), [.5, .48, .45], .5, 1, true); } }
    if (e.state === "climb") { const k = clamp(e.t / 2.6, 0, 1), pel = pelicanPos(); p.x = lerp(e.from.x, ropeX(), Math.min(1, k * 3)); p.z = lerp(e.from.z, ropeZ(), Math.min(1, k * 3)); p.y = lerp(e.from.y, pel[1] - 3, ease(k)); p.vy = 0; p.inv = 1; p.pitch += (Math.min(.9, Math.atan2(pel[1] - p.y - EYE3, 6)) - p.pitch) * Math.min(1, dt * 2);
      if (k >= 1) { e.state = "away"; e.t = 0; AU.ship(); showTitle3("EXTRACTED", F.m.region); } } }
  else if (e.state === "away") { e.t += dt; p.y += dt * (6 + e.t * 10); p.pitch = Math.max(p.pitch - dt * .1, -.4); p.inv = 1; if (e.t > 3.2 && !F.over) { F.over = { pending: true }; flash(1, "#ffffff"); setTimeout(() => fieldEnd(true), 600); } }
}
const ropeX = () => F.ext.x - Math.cos(F.ext.yaw ?? 0) * 6.2, ropeZ = () => F.ext.z - Math.sin(F.ext.yaw ?? 0) * 6.2;
function pelicanPos() { const e = F.ext; e.yaw = e.yaw ?? Math.atan2(F.p.z - e.z, F.p.x - e.x); let alt = 13; if (e.state === "inbound") alt = 13 + (1 - ease(clamp(e.t / 7, 0, 1))) * 180; if (e.state === "away") alt = 13 + e.t * e.t * 8;
  return [e.x, e.y + alt, e.z]; }

// ---------- effects ----------
function addPart(x, y, z, vx, vy, vz, life, col, size, grav = -9, smoke = false) { if (F.parts.length > 1400) return; F.parts.push({ x, y, z, vx, vy, vz, life, max: life, col, size, grav, smoke }); }
// rings spreading across the water (wading, fish, birds landing)
function ripple(x, z, size = 1, delay = 0) { if (!FLD.waterOn || waterDepth(x, z) < .05) return; (F.ripples = F.ripples || []).push({ x, z, s: size * frand(.85, 1.15), t: -delay, life: frand(1.1, 1.6) }); if (F.ripples.length > 90) F.ripples.shift(); }
// gunfire flushes the birds out of the canopy (once in a while, not every shot)
function flushBirds() { if (FIELD_SHAPE !== "swamp" || (F.birdT || 0) > F.t) return; F.birdT = F.t + 40; const p = F.p, n = 8 + (Math.random() * 8 | 0), a0 = Math.random() * 6.283, d = frand(14, 30), cx = p.x + Math.cos(a0) * d, cz = p.z + Math.sin(a0) * d, cy = fieldH(cx, cz) + 11;
  for (let k = 0; k < n; k++) { const a = a0 + frand(-1, 1), s = frand(4, 7); addPart(cx + frand(-3, 3), cy + frand(-1, 2), cz + frand(-3, 3), Math.cos(a) * s, frand(2, 4), Math.sin(a) * s, frand(3.5, 5), [.09, .09, .08], .22, 1.2); } }
// the door's explosive bolts fire and it slams down into a ramp: it falls outward about its hinge, bounces once and settles
function blowDoor(D) {
  const fx = Math.cos(D.yaw), fz = Math.sin(D.yaw), M = mChain(mT(D.x, D.gy, D.z), mRy(-D.yaw));
  F.doors.push({ ramp: true, M, th: 0, w: -3.2, rest: false, bounced: 0 });
  if (F.doors.length > 14) F.doors.shift();
  for (const s of [-1, 1]) { const b = xf(M, podPt(0, s * .72, POD.Y1 - .2, .06));          // the bolts at the top corners
    for (let i = 0; i < 8; i++) addPart(b[0], b[1], b[2], fx * frand(2, 7) + frand(-2, 2), frand(1, 4), fz * frand(2, 7) + frand(-2, 2), frand(.15, .35), [1, .75, .3], .1, -9);
    for (let i = 0; i < 4; i++) addPart(b[0], b[1], b[2], fx * frand(1, 3), frand(.5, 2), fz * frand(1, 3), frand(.6, 1.2), [.6, .58, .55], .35, -1, true); }
  for (let i = 0; i < 10; i++) { const s = frand(3, 7), a = D.yaw + frand(-.6, .6); addPart(D.x + fx * 1.2, D.gy + frand(.4, 1.8), D.z + fz * 1.2, Math.cos(a) * s, frand(0, 2), Math.sin(a) * s, frand(.5, 1.1), [.6, .58, .55], .3, -1, true); }
  F.lights.push({ x: D.x + fx * 1.6, y: D.gy + 2, z: D.z + fz * 1.6, c: [.8, .55, .3], t: .2 });
}
// ---------- Skull Company drop pods: enemy reinforcements arrive from orbit, blow their ramps and pour out ----------
function launchEnemyPods(x, z, n) {
  const k = Math.max(1, Math.min(3, Math.ceil(n / 4))); F.epods = F.epods || [];
  for (let i = 0; i < k; i++) { let px = x, pz = z;
    for (let t = 0; t < 12; t++) { const a = Math.random() * 6.283, d = i ? frand(4, 7) : frand(0, 2); px = x + Math.cos(a) * d; pz = z + Math.sin(a) * d; if (!blocked3(px, pz, 1.6)) break; }
    const gy = fieldH(px, pz); F.epods.push({ x: px, z: pz, gy, y: gy + 240 + i * 30, yaw: Math.atan2(F.p.z - pz, F.p.x - px) + frand(-.5, .5), n: Math.ceil(n / k), spT: 0, landed: false, t: 0 }); }
  AU.pod(); }
function updateEnemyPods(dt) {
  for (let i = (F.epods || []).length - 1; i >= 0; i--) { const q = F.epods[i];
    if (!q.landed) { const h = q.y - q.gy; q.vs = h > 20 ? 120 : 26; q.y -= q.vs * dt; if (h < 24) retroFx(q, 1);
      if (q.y <= q.gy) { q.y = q.gy; q.landed = true; q.M = mChain(mT(q.x, q.gy, q.z), mRy(-q.yaw)); const v = volAt(q.x, q.z), p = F.p;
        F.objs.push({ parts: R3.podFullE, M: q.M, kind: "epod" }); F.coll.push([q.x, q.z, .85, q.gy + 2.6]);
        AU.boom(.5, v); AU.metalHit(v); addDecal(q.x, q.z, 2.6, [.3, .26, .22]); F.lights.push({ x: q.x, y: q.gy + 1, z: q.z, c: [.9, .5, .25], t: .25 });
        for (let k = 0; k < 24; k++) { const a = Math.random() * 6.283, sp = frand(4, 10); addPart(q.x + Math.cos(a), q.gy + .3, q.z + Math.sin(a), Math.cos(a) * sp, frand(.5, 2.5), Math.sin(a) * sp, frand(.7, 1.4), F.P.g.map(c => c / 255 * .75), .6, -2, true); }
        const d = Math.hypot(p.x - q.x, p.z - q.z); if (p.alive && d < 1.8) hurt3(80, { x: q.x, z: q.z }); else if (d < 14) F.shake = Math.max(F.shake, .12 * (1 - d / 14)); }
      continue; }
    q.t += dt;
    if (q.t > 1.1 && !q.blown) { q.blown = true; F.doors.push({ ramp: true, M: q.M, th: 0, w: -3.2, rest: false, bounced: 0, parts: R3.podDoorE }); AU.boom(.25, volAt(q.x, q.z));
      for (const s of [-1, 1]) { const b = xf(q.M, podPt(0, s * .72, POD.Y1 - .2, .06)); for (let k = 0; k < 6; k++) addPart(b[0], b[1], b[2], frand(-3, 3), frand(1, 4), frand(-3, 3), frand(.15, .35), [1, .75, .3], .1, -9); } }
    if (q.blown && q.t > 1.6) { q.spT -= dt;
      if (q.spT <= 0 && q.n > 0) { q.spT = .55; if (F.bugs.length >= fieldCap() + 12) q.n = 0; else { const tip = xf(q.M, [DOOR.R + frand(1, 1.5), 0, frand(-.3, .3)]); spawnBug(bugMix3(), tip[0], tip[2], "hunt"); q.n--; } } }
    if (q.n <= 0 && q.blown) F.epods.splice(i, 1); }   // the empty pod stays where it landed
}
function updateDoors3(dt) {
  for (const d of F.doors) if (d.ramp && !d.rest) { d.w -= 15 * dt; d.th += d.w * dt;
    if (d.th <= DOOR_OPEN) { d.th = DOOR_OPEN; const tip = xf(d.M, [DOOR.R + 1.6, .05, 0]);
      if (d.w < -1.6 && d.bounced < 2) { d.bounced++; AU.metalHit(Math.min(1, -d.w / 7)); AU.boom(.18, .7);
        for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, sp = frand(1.5, 5); addPart(tip[0] + Math.cos(a) * .6, tip[1] + .1, tip[2] + Math.sin(a) * .6, Math.cos(a) * sp, frand(.5, 2), Math.sin(a) * sp, frand(.6, 1.3), F.P.g.map(v => v / 255 * .8), .6, -1, true); }
        d.w = -d.w * .2; }
      else { d.rest = true; d.w = 0; } } }
  for (const d of F.doors) { if (d.rest || d.ramp) continue;
    d.vy -= 19 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rz += d.wz * dt; d.rx += d.wx * dt;
    const g = fieldH(d.x, d.z) + .12;
    if (d.y < g) { d.y = g; if (Math.abs(d.vy) > 2.5) { AU.metalHit(Math.min(1, Math.abs(d.vy) / 8)); addPart(d.x, g, d.z, 0, 1, 0, .8, F.P.g.map(v => v / 255 * .8), .7, 0, true); }
      d.vy = Math.abs(d.vy) * .32; d.vx *= .55; d.vz *= .55; d.wz *= .5; d.wx *= .5;
      if (Math.hypot(d.vx, d.vz) < 1.2 && d.vy < 1.5) { d.rest = true; d.vx = d.vz = d.vy = 0; } }
    d.age += dt; if (d.age > .35 && blocked3(d.x, d.z, .4, d.y)) { d.x -= d.vx * dt; d.z -= d.vz * dt; d.vx *= -.4; d.vz *= -.4; } }
  // a resting door lies flat on whichever face it landed on
  for (const d of F.doors) if (d.rest && !d.ramp) { const tz = Math.round((d.rz - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2; d.rz += (tz - d.rz) * Math.min(1, dt * 6); d.rx += (Math.round(d.rx / Math.PI) * Math.PI - d.rx) * Math.min(1, dt * 6); d.y += (fieldH(d.x, d.z) + .06 - d.y) * Math.min(1, dt * 6); }
}
const doorMatrix = d => d.ramp ? mChain(d.M, doorHinge(d.th)) : mChain(mT(d.x, d.y, d.z), mRy(d.yaw), mRz(d.rz), mRx(d.rx), mT(-d.c[0], -d.c[1], -d.c[2]));
function addDecal(x, z, r, col) { col = col.map((v, i) => F.P.g[i] / 255 * .4 + v * .45); F.decals.push({ x, z, r, col, t: 40 }); if (F.decals.length > 120) F.decals.shift(); }
// what you're walking on, for footsteps (and where spent brass lands)
function surf3(p) { const b = F.m.biome, h = (x, z) => fieldH(x, z);
  if (Math.hypot(p.x - F.ext.x, p.z - F.ext.z) < 6) return "metal";
  if (F.pois && F.pois.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 9)) return "rock";
  if (Math.abs(h(p.x + 1, p.z) - h(p.x - 1, p.z)) + Math.abs(h(p.x, p.z + 1) - h(p.x, p.z - 1)) > 2.2) return "rock";
  let trail = false; try { trail = pathD(p.x, p.z, FLD) < 3; } catch (_) {}
  if (b === "swamp") { const y = h(p.x, p.z), wy = FLD.waterY;
    if (trail && y < wy + .33 && riverCarve(p.x, p.z, fieldRaw(p.x, p.z, FLD.seed), FLD) < wy + .12) return "wood";   // on a boardwalk
    if (y < wy + 1.2 || (trail && y < wy + 2)) return "mud";
    return trail ? "sand" : forestAt(p.x, p.z, FLD) > .45 ? "leaves" : "grass"; }
  return b === "arctic" ? "snow" : b === "volcanic" ? "gravel" : "sand"; }
// breathing that follows your stamina, and the combat score's intensity
function soundTick3(dt) { const p = F.p; if (!p || !p.alive) return; const S = F.snd = F.snd || { bt: 0, ph: 0, gasped: false, lvl: 0 };
  const run = keys.has("shift") && keys.has("w") && p.st > 1, k = Math.max(0, (1 - p.st / 100) * 1.2 - .2) * (run ? 1 : .85);
  if (k > .06) { S.bt -= dt; if (S.bt <= 0) { S.ph ^= 1; AU.breath(Math.min(1.1, k), S.ph === 1); S.bt = (S.ph ? .28 : .42) * (1.3 - k * .6); } } else S.bt = 0;
  if (p.st < 4 && !S.gasped) { S.gasped = true; AU.gasp(); } if (p.st > 40) S.gasped = false;
  let hunters = 0; for (const b of F.bugs) if (b.hp > 0 && b.state === "hunt" && Math.abs(b.x - p.x) + Math.abs(b.z - p.z) < 90) hunters++;
  const ex = F.ext.state === "inbound" || F.ext.state === "rope" ? .85 : 0, target = Math.max(ex, Math.min(1, hunters / 7 + (p.hurtT > 0 ? .25 : 0)));
  S.lvl += (target - S.lvl) * Math.min(1, dt * (target > S.lvl ? 1.2 : .1)); AU.combat(S.lvl); }
function fmsg(big, small, t = 3.5) { F.msg = { big, small, t }; }
function updateFx3(dt) {
  if (F.callouts) { for (const c of F.callouts) c.t -= dt; F.callouts = F.callouts.filter(c => c.t > 0 && c.b.dead == null); }
  updateDoors3(dt); updateEnemyPods(dt); if (F.pois) updateOutposts(dt); if (F.side) updateSide(dt); casingUpdate(dt, "field");
  // 30 mm shells in flight: a glowing tracer, and a small high-explosive burst wherever they land
  for (let i = (F.shells || []).length - 1; i >= 0; i--) { const s = F.shells[i], o = s.p.slice(); s.t += dt; s.v[1] -= 9 * dt; for (let k = 0; k < 3; k++) s.p[k] += s.v[k] * dt;
    F.tracers.push({ a: o, b: s.p.slice(), t: .05, max: .05, w: .13, col: [1, .7, .3] });
    const g = fieldH(s.p[0], s.p[2]), hit = s.p[1] <= g + .1 || F.bugs.some(b => b.hp > 0 && Math.hypot(b.x - s.p[0], b.z - s.p[2]) < FBUG[b.type].r + .4 && s.p[1] < b.y + FBUG[b.type].h);
    if (hit || s.t > 3) { F.shells.splice(i, 1); if (hit) { const y = Math.max(s.p[1], g), dP = Math.hypot(s.p[0] - F.p.x, s.p[2] - F.p.z); explode3(s.p[0], y, s.p[2], 2.6, 150, { noHoles: true, safe: dP > 3.2 });
        if (FLD.waterOn && waterDepth(s.p[0], s.p[2]) > .1) { ripple(s.p[0], s.p[2], 2.2); for (let k = 0; k < 10; k++) addPart(s.p[0], FLD.waterY, s.p[2], frand(-2, 2), frand(3, 7), frand(-2, 2), .7, [.6, .7, .62], .2, -12); } } } }
  // ripples spreading on the water
  for (let i = (F.ripples || []).length - 1; i >= 0; i--) { const r = F.ripples[i]; r.t += dt / r.life; if (r.t >= 1) F.ripples.splice(i, 1); }
  // a fish jumps now and then somewhere near you
  if (FIELD_SHAPE === "swamp" && F.p && !DROP) { F.fishT = (F.fishT ?? frand(4, 9)) - dt;
    if (F.fishT <= 0) { F.fishT = frand(6, 15); const p = F.p; for (let k = 0; k < 12; k++) { const a = Math.random() * 6.283, d = frand(8, 30), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (waterDepth(x, z) < .35) continue; const y = FLD.waterY; ripple(x, z, 1.6); ripple(x + frand(-.6, .6), z + frand(-.6, .6), 1, .4);
        for (let q = 0; q < 9; q++) addPart(x, y + .05, z, frand(-1.2, 1.2), frand(1.5, 3.2), frand(-1.2, 1.2), .5, [.62, .72, .64], .1, -12);
        addPart(x, y + .1, z, frand(-.6, .6), 3.4, frand(-.6, .6), .55, [.75, .8, .72], .2, -12); AU.splash(volAt(x, z) * .6); break; } } }
  // the desert: tumbleweeds rolling on the wind, dust devils wandering the flats, sand blowing low over the ground
  if (FIELD_SHAPE === "desert" && F.p && !DROP) { const p = F.p, wa = .6, wx = Math.cos(wa), wz = Math.sin(wa), gust = .7 + .5 * Math.sin(F.t * .37) + .25 * Math.sin(F.t * 1.3);
    F.tumbles = F.tumbles || []; while (F.tumbles.length < 9) F.tumbles.push({ x: 1e9, z: 1e9, y: 0, vy: 0, rot: 0, sp: frand(.8, 1.2) });
    for (const t of F.tumbles) { if (Math.hypot(t.x - p.x, t.z - p.z) > 75) { const lat = frand(-50, 50), back = frand(25, 65); t.x = p.x - wx * back - wz * lat; t.z = p.z - wz * back + wx * lat; t.y = fieldH(t.x, t.z); t.vy = 0; }
      const v = 4.2 * gust * t.sp, nx = t.x + wx * v * dt, nz = t.z + wz * v * dt; if (blocked3(nx, nz, .4, t.y)) { t.x -= wz * v * dt * 2; t.z += wx * v * dt * 2; } else { t.x = nx; t.z = nz; }
      const g = fieldH(t.x, t.z); t.vy -= 14 * dt; t.y += t.vy * dt; if (t.y <= g) { t.y = g; t.vy = Math.random() < .08 ? frand(2, 4.5) : Math.max(0, t.vy * -.3); } t.rot += v * dt / .45; }
    F.devils = F.devils || []; if (F.devils.length < 2 && Math.random() < dt * .08) { const a = Math.random() * 6.283, d = frand(45, 100); F.devils.push({ x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, t: 0, life: frand(18, 34), vx: wx * frand(1, 2.5) + frand(-1, 1), vz: wz * frand(1, 2.5) + frand(-1, 1) }); }
    for (let i = F.devils.length - 1; i >= 0; i--) { const d = F.devils[i]; d.t += dt; d.x += d.vx * dt; d.z += d.vz * dt; if (d.t > d.life) { F.devils.splice(i, 1); continue; }
      const k = Math.min(1, d.t / 3, (d.life - d.t) / 3), gy = fieldH(d.x, d.z); for (let q = 0; q < 5; q++) if (Math.random() < k) { const a = d.t * 9 + Math.random() * 6.28, h = Math.random() ** 1.5 * 12, r = .25 + h * .1;   // a narrow twisting column, flaring toward the top
        addPart(d.x + Math.cos(a) * r, gy + h, d.z + Math.sin(a) * r, -Math.sin(a) * (2 + h * .3) + d.vx, frand(2.5, 4.5), Math.cos(a) * (2 + h * .3) + d.vz, frand(.9, 1.6), [.84, .72, .55], frand(.35, .7) + h * .04, .5, true); } }
    F.sandT = (F.sandT || 0) - dt; if (F.sandT <= 0) { F.sandT = .08 / gust; const a = Math.random() * 6.283, d = frand(2, 16), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      addPart(x, fieldH(x, z) + frand(.05, .5), z, wx * frand(6, 10) * gust, frand(-.2, .4), wz * frand(6, 10) * gust, frand(.4, .9), [1, .9, .7], .05, -.5); } }
  // rain: drops ringing the water around you, lightning now and then with the thunder a few seconds behind
  if (F.p && hasMod(F.m, "rain")) { const p = F.p;
    if (!DROP && FLD.waterOn) { F.rainR = (F.rainR || 0) + dt * 26; while (F.rainR >= 1) { F.rainR--; const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * 16; ripple(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, frand(.2, .38)); } }
    if (F.bolt == null) F.bolt = 12 + Math.random() * 20; F.bolt -= dt; if (F.bolt <= 0) { F.bolt = 18 + Math.random() * 35; F.flashT = .5; const far = Math.random(); setTimeout(() => F && AU.boom(1.6, .25 + (1 - far) * .4), 900 + far * 3200); }
    if (F.flashT > 0) F.flashT -= dt; }
  // swamp: fireflies and drifting spores in the gloom under the trees
  if (FIELD_SHAPE === "swamp" && F.p && !DROP) { const p = F.p; F.flyT = (F.flyT || 0) - dt;
    if (F.flyT <= 0) { F.flyT = .12; const a = Math.random() * 6.283, d = frand(4, 22), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, f = forestAt(x, z, FLD);
      if (Math.random() < .35 + f * .65) { const spore = Math.random() < .35; addPart(x, fieldH(x, z) + frand(.4, spore ? 4 : 2.4), z, frand(-.4, .4), frand(-.1, .25), frand(-.4, .4), frand(2.5, 4.5), spore ? [.9, 1.1, .95] : [1.2, 1.5, .45], spore ? .05 : .07, spore ? -.02 : 0); } } }
  for (let i = F.parts.length - 1; i >= 0; i--) { const q = F.parts[i]; q.life -= dt; if (q.life <= 0) { F.parts.splice(i, 1); continue; } q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; const f = q.smoke ? .97 : .99; q.vx *= f; q.vz *= f;
    if (!q.smoke) { const gy = fieldH(q.x, q.z); if (q.y < gy) { q.y = gy; q.vy *= -.3; q.vx *= .6; q.vz *= .6; } } }
  for (let i = F.tracers.length - 1; i >= 0; i--) if ((F.tracers[i].t -= dt) <= 0) F.tracers.splice(i, 1);
  for (const sm of F.smokers || []) { sm.t -= dt; if (sm.t > 0 && Math.hypot(sm.x - F.p.x, sm.z - F.p.z) < 140 && Math.random() < dt * 7) addPart(sm.x + frand(-.6, .6), sm.y, sm.z + frand(-.6, .6), frand(-.3, .3), frand(1.2, 2.2), frand(-.3, .3), frand(2.5, 4), [.2, .19, .18], frand(.9, 1.6), .3, true); }
  for (let i = F.lights.length - 1; i >= 0; i--) if ((F.lights[i].t -= dt) <= 0) F.lights.splice(i, 1);
  for (const d of F.decals) d.t -= dt; F.decals = F.decals.filter(d => d.t > 0);
  F.shake = Math.max(0, F.shake - dt * .3); if (F.msg) F.msg.t -= dt; F.inputFail -= dt; if (F.code) F.code.fail -= dt;
}
function updateField(dt) { dt *= window.__time || 1;
  if (DROP) { updateDrop(dt); if (F) { if (DROP && DROP.first === false && !F.paused) { F.t += dt; updateBugs3(dt); updateNests3(dt); updateDirector3(dt); updateGiants(dt); } updateFx3(dt); } return; }
  if (!F || F.paused || (F.over && !F.over.pending)) return;
  soundTick3(dt);
  F.t += dt; const p = F.p, ox = p.x, oz = p.z;
  updatePlayer3(dt); p.vx = (p.x - ox) / dt; p.vz = (p.z - oz) / dt;
  updateBugs3(dt); updateNests3(dt); updateDirector3(dt); updateGiants(dt); updateFx3(dt);
}
function fieldEnd(win) {
  const m = F.m, sv = loadSave(), samples = win ? F.p.samples : F.lo.satchel ? Math.floor(F.p.samples / 2) : 0, nests = F.nests.filter(n => n.cleared && !n.main).length, req = win ? m.reward + nests * 40 + samples * 5 : Math.floor(nests * 20);
  sv.req += req; sv.totalReq += req; sv.samples += samples; sv.kills += F.stats.kills; sv.deaths += F.stats.deaths; if (win) sv.extracted++; sv.missions++; if (win) sv.wins++;
  if (win && m.sys != null && sv.gal.slots[m.sys]) sv.gal.slots[m.sys][m.slot]++; writeSave(sv);
  AU.windStop(); AU.ambStop(); AU.combatStop(); AU.pelican(0); AU.dropStop(); AU.setSpace("in"); $("fhud").hidden = true; if (document.pointerLockElement) document.exitPointerLock();
  for (const c of FLD.chunks || []) freeParts(c.parts);
  for (const k of ["parts", "padParts", "nestPartsAlive", "nestPartsDead", "crateParts", "boxParts", "sampleParts", "sentryParts", "gunParts", "rocketParts"]) freeParts(FLD[k]);
  for (const o of F.objs) if (o.own) freeParts(o.parts);
  const side = (F.side || []).filter(s => s.done).length, war = m.dev || (typeof TUT !== "undefined" && TUT.on) ? null : (() => { const s2 = loadSave(), r = warResolve(s2, { win, m, kills: F.stats.kills, deaths: F.stats.deaths, strats: F.stats.strats, side, sideTotal: (F.side || []).length }); writeSave(s2); return r; })();
  G = { over: { win, req, samples, nests, side, sideTotal: (F.side || []).length, war, time: F.time0 - F.timeLeft }, stats: F.stats, m }; MODE = "menu"; R3.cv.style.display = "none"; F = null; DROP = null; FLD = null;
  showEnd();
}
addEventListener("wheel", e => { if (MODE === "field" && F && !F.paused) { if (keys.has("tab")) { F.mapZoom = e.deltaY < 0 ? 2.5 : 1; return; } F.wheel = Math.sign(e.deltaY) || 1; } }, { passive: true });
