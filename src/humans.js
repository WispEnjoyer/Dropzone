// =====================================================================================
//  HUMAN ENEMIES: skull-masked mercenaries that fight as a squad. They take cover, flank, suppress,
//  fire in bursts, reload, throw grenades at you when you hide, and shout to each other over the radio.
//  They plug into the bug system (F.bugs, FBUG) so spawning, sentries, objectives and hit detection all just work.
// =====================================================================================
FBUG.merc = { hp: 55, spd: 2.4, dmg: 2.5, rng: 55, cd: 0, h: 1.8, w: .9, r: .42, hr: .48, human: true };
// the heavy gunner: a slow armoured brute with a belt-fed machine gun. Long bursts, no flanking, no grenades.
// his sprites are 168 px frames at the same pixel scale as the riflemen, drawn about 20 % bigger so he towers over them
FBUG.gunner = { hp: 240, spd: 1.6, dmg: 2.2, rng: 60, cd: 0, h: 2.1, w: 1.15, r: .58, hr: .66, human: true, heavy: true, atlas: "hum_gunner", cols: 18, size: 2.98, foot: .44 };
// the officer: an unarmed Skull Company officer doing her rounds of the camps. She never fights; she runs.
FBUG.officer = { hp: 45, spd: 2.4, dmg: 0, rng: 0, cd: 0, h: 1.75, w: .8, r: .4, hr: .46, human: true, unarmed: true, atlas: "hum_officer", cols: 9 };
const FOE_KEY = "dz_foe";
const foeMode = () => { try { return localStorage.getItem(FOE_KEY) || "human"; } catch (_) { return "human"; } };
const HUM_LINES = {
  contact: ["Contact! Contact!", "Enemy spotted!", "Got eyes on him!", "Hostile, there!", "Contact front!"],
  flank: ["Flanking left!", "Going wide!", "I'll get around him!", "Moving to flank!", "Swinging right!"],
  move: ["Moving!", "Changing position!", "Cover me!", "Relocating!", "On the move!"],
  suppress: ["Suppressing!", "Keep his head down!", "Laying down fire!", "Pin him!"],
  reload: ["Reloading!", "Changing mags!", "Cover me, reloading!", "I'm dry!"],
  grenade: ["Grenade out!", "Frag out!", "Flush him out!"],
  mandown: ["Man down!", "We lost one!", "He got Kowalski!", "Damn it, man down!"],
  taking: ["Taking fire!", "I'm hit!", "He's shooting at me!", "Under fire!"],
  lost: ["Where'd he go?", "Lost visual!", "Anyone see him?", "He's hiding!"],
  push: ["Push him!", "Move up!", "Close in!", "He's alone, push!"],
  copy: ["Copy!", "On it!", "Roger!", "Moving up!"],
  flee: ["Get me out of here!", "Protect me, you idiots!", "Fall back! Fall back!", "Cover my retreat!", "Hold him off!", "I'm not dying here!"],
  heavy: ["Eat lead!", "Bring it!", "Gun's up!", "Keep 'em coming!", "Hose him down!", "Nowhere to hide!"],
  escort: ["Protect the officer!", "Get her out of here!", "Cover the officer!", "Shield her!"],
};
const HUM_ROLES = ["suppress", "flank", "advance", "suppress", "flank"];

// line of sight between two points: the ground and the trunks/rocks/walls in the way
function los3(ax, ay, az, bx, by, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 1.6));
  for (let i = 1; i < n; i++) { const k = i / n, x = lerp(ax, bx, k), y = lerp(ay, by, k), z = lerp(az, bz, k);
    if (y < fieldH(x, z) + .1) return false; const h = hitC(x, z, 0, y); if (cgNear(x, z, 0, h)) return false; for (const c of F.coll) if (h(c)) return false; }
  return true; }
// is there something solid between this spot and the threat? (a trunk or rock within a step toward it)
function coverAt(x, z, tx, tz) { const d = Math.hypot(tx - x, tz - z) || 1, ux = (tx - x) / d, uz = (tz - z) / d;
  for (const k of [.8, 1.4]) if (blocked3(x + ux * k, z + uz * k, .35, 1.1)) return true; return false; }
function panAt(x, z) { const p = F.p, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1; return clamp((dx * -Math.sin(p.yaw) + dz * Math.cos(p.yaw)) / d, -1, 1) * .8; }

function humanSay(b, kind, force) { if (!b || b.dead != null) return; F.sayT = F.sayT || 0;
  if (!force && (b.sayT > 0 || F.sayT > F.t)) return; const L = HUM_LINES[kind], text = L[Math.floor(Math.random() * L.length)];
  b.sayT = frand(4, 7); F.sayT = F.t + .7; (F.callouts = F.callouts || []).push({ b, text, t: 2.2 });
  AU.bark(text, volAt(b.x, b.z) * 1.3, panAt(b.x, b.z), b.pitch); }
function humanAlert(b, quiet) { if (b.state === "hunt" || window.__invis) return; if (FBUG[b.type].unarmed && Math.hypot(b.x - F.p.x, b.z - F.p.z) > 60) return;   /* the officer only bolts when the trouble is close */ b.state = "hunt"; b.lost = 0; b.decT = 0; b.role = b.role || (FBUG[b.type].heavy ? "suppress" : HUM_ROLES[(F.humI = (F.humI || 0) + 1) % HUM_ROLES.length]);
  const un = FBUG[b.type].unarmed; if (un) { b.flee = null; b.reT = 0; humanSay(b, "flee", true); }
  if (!quiet) { if (!un) humanSay(b, F.hvt && F.hvt.officer && b.escort ? "escort" : "contact", true);   // the squad hears it over the radio and joins in a moment later
    for (const o of F.bugs) if (o !== b && o.dead == null && FBUG[o.type].human && o.state !== "hunt" && Math.hypot(o.x - b.x, o.z - b.z) < 75) { o.radioT = frand(.4, 1.3); } } }

function spawnHumanExtras(b) { const hv = FBUG[b.type].heavy; Object.assign(b, { ammo: hv ? 100 : 30, mag: hv ? 100 : 30, relT: 0, fireT: 0, burst: 0, losT: Math.random() * .3, canSee: false, sayT: frand(0, 2), decT: 0, dest: null, moving: false,
  shooting: false, shootT: 0, firing: false, supp: 0, lastSeen: -99, mode: "idle", anT: 0, pitch: hv ? frand(.66, .74) : frand(.88, 1.12), side: Math.random() < .5 ? -1 : 1, mv: 0 }); }

// pick somewhere better to be: cover, the right distance for its role, not on top of a squadmate
function humanDecide(b, TP) { const p = F.p, dTP0 = Math.hypot(b.x - TP.x, b.z - TP.z), role = b.supp > 0 ? "cover" : b.role, cands = [];
  const band = role === "advance" ? [9, 17] : role === "flank" ? [12, 22] : [16, 32];
  if (role === "flank") { const a0 = Math.atan2(b.z - TP.z, b.x - TP.x); for (let i = 0; i < 10; i++) { const a = a0 + b.side * frand(.5, 1.4), r = frand(band[0], band[1]); cands.push([TP.x + Math.cos(a) * r, TP.z + Math.sin(a) * r]); } }
  for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283, r = frand(3, role === "cover" ? 8 : 13); cands.push([b.x + Math.cos(a) * r, b.z + Math.sin(a) * r]); }
  if (dTP0 < 9) for (let i = 0; i < 6; i++) { const a = Math.atan2(b.z - TP.z, b.x - TP.x) + frand(-.9, .9), r = frand(12, 18); cands.push([TP.x + Math.cos(a) * r, TP.z + Math.sin(a) * r]); }   // too close: fall back
  if (role === "advance") for (let i = 0; i < 5; i++) { const k = frand(.2, .5); cands.push([lerp(b.x, TP.x, k) + frand(-4, 4), lerp(b.z, TP.z, k) + frand(-4, 4)]); }
  let best = null, bs = -1e9;
  for (const [x, z] of cands) { if (Math.hypot(x, z) > FW.RW * .9 || blocked3(x, z, .5)) continue; const dT = Math.hypot(x - TP.x, z - TP.z);
    let s = -Math.max(0, band[0] - dT, dT - band[1]) * .6 - Math.hypot(x - b.x, z - b.z) * .12;
    if (coverAt(x, z, TP.x, TP.z)) s += role === "cover" ? 9 : 5;
    if (FLD.waterOn && waterDepth(x, z) > .3) s -= 6;
    for (const o of F.bugs) if (o !== b && o.dead == null && FBUG[o.type].human) { const q = o.dest || o; if (Math.hypot(q.x - x, q.z - z) < 4.5) s -= 4; }
    if (dT < 6) s -= 8; if (s > bs) { bs = s; best = { x, z }; } }
  b.decT = frand(3, 6) * (role === "suppress" ? 1.4 : 1);
  if (best && Math.hypot(best.x - b.x, best.z - b.z) > 2) { b.dest = best; b.moving = true;
    if (Math.random() < .55) humanSay(b, role === "flank" ? "flank" : role === "advance" && dTP0 > 14 ? "push" : "move"); }
}

function humanFire(b, p, d) { const T = FBUG[b.type], hv = T.heavy; b.ammo--; b.fireT = hv ? frand(.085, .1) : frand(.13, .17); b.burst--; b.lastShot = F.t;
  const mz = [b.x + Math.cos(b.face) * .55, b.y + 1.32, b.z + Math.sin(b.face) * .55], pv = Math.hypot(p.vx || 0, p.vz || 0);
  const acc = clamp(.24 - d / 160 - pv * .03 + Math.min(.1, (F.t - b.aimStart) * .03) + F.m.diff * .015 - (p.dive > 0 ? .15 : 0) - (b.supp > 0 ? .12 : 0), .03, .4) * (hv ? .7 : 1);
  const hit = p.alive && Math.random() < acc, tgt = [p.x, p.y + 1.2, p.z];
  if (!hit) { const a = Math.random() * 6.283, m = frand(.6, 2.2); tgt[0] += Math.cos(a) * m; tgt[1] += frand(-.6, 1.2); tgt[2] += Math.sin(a) * m;
    if (d > 6 && m < 1.6 && Math.random() < .5) AU.whiz(panAt(b.x, b.z)); else if (Math.random() < .3) AU.snap(panAt(b.x, b.z)); }
  const ext = 1.6; F.tracers.push({ a: mz, b: [lerp(mz[0], tgt[0], ext), lerp(mz[1], tgt[1], ext), lerp(mz[2], tgt[2], ext)], t: .05, max: .05, w: hv ? .05 : .035, col: [1, .45, .3] });
  F.lights.push({ x: mz[0], y: mz[1], z: mz[2], c: [1.4, .8, .4], t: .04 });
  AU.enemyGun(volAt(b.x, b.z) * (hv ? 1.25 : 1), panAt(b.x, b.z), hv);
  if (hit) hurt3((T.dmg + F.m.diff * .3) * (b.boss ? 2.2 : 1), b); }

// shared footwork: turn toward the target, step around whatever is in the way
function humanMove(b, tx, tz, spd, dt, r) { b.av = (b.av || 0) - dt; const a = Math.atan2(tz - b.z, tx - b.x) + (b.av > 0 ? b.avs * 1.1 : 0); if (!b.shooting) b.face += angDiff(b.face, a) * Math.min(1, dt * 8);
  const ox = b.x, oz = b.z; if (move3(b, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt, r) && b.av <= 0) { b.av = frand(.5, 1); b.avs = Math.random() < .5 ? -1 : 1; if (b.state !== "hunt") b.wT = 0; }
  b.mv = Math.hypot(b.x - ox, b.z - oz) / dt; }
// the officer: rounds between the HQ and the camps; once the alarm is up she runs for the camp furthest from you
function updateOfficer(b, dt) {
  const p = F.p, T = FBUG.officer, dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
  b.sayT -= dt; b.losT -= dt; b.anT += dt; b.reT = (b.reT || 0) - dt;
  if (b.radioT > 0) { b.radioT -= dt; if (b.radioT <= 0) humanAlert(b, true); }
  if (b.losT <= 0) { b.losT = frand(.25, .4); const face = Math.abs(angDiff(b.face, Math.atan2(dz, dx))); b.canSee = p.alive && !window.__invis && d < 24 && (b.state === "hunt" || face < 1.1 || d < 6) && los3(b.x, b.y + 1.5, b.z, p.x, p.y + 1.3, p.z); }
  if (b.state !== "hunt") { if (b.canSee) { b.spot = (b.spot || 0) + dt * (d < 7 ? 3 : .25 + 1.3 * (1 - d / 24)) * (hasMod(F.m, "rain") ? .65 : 1); if (b.spot >= 1) humanAlert(b); } else b.spot = Math.max(0, (b.spot || 0) - dt * .35); }
  if (b.state === "hunt" && window.__invis) { b.state = "idle"; b.flee = null; b.route = [[b.x, b.z]]; b.ri = 0; b.wait = 5; }
  let tx = null, tz = null, spd = 0;
  if (b.state === "hunt") {
    if (!b.flee || b.reT <= 0) { const pts = [[FLD.obj.x, FLD.obj.z], ...FLD.nestSpots, ...(FLD.outposts || [])]; let best = null, bs = -1e9;
      for (const [x, z] of pts) { const dp = Math.hypot(x - p.x, z - p.z), db = Math.hypot(x - b.x, z - b.z); if (dp < 35 || db < 20) continue; const sc = dp - db * .35 - (Math.hypot(x - p.x, z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) * .8 ? 60 : 0); if (sc > bs) { bs = sc; best = { x, z }; } }
      b.flee = best || { x: b.x - dx / (d || 1) * 40, z: b.z - dz / (d || 1) * 40 }; b.reT = 14; b.calmT = 0; }
    const fd = Math.hypot(b.flee.x - b.x, b.flee.z - b.z);
    if (fd > 2.5) { tx = b.flee.x; tz = b.flee.z; spd = 4.3; if (b.sayT <= 0 && Math.random() < dt * .4) humanSay(b, "flee"); }
    else if (d > 45 && !b.canSee) { b.calmT = (b.calmT || 0) + dt; if (b.calmT > 12) { b.state = "idle"; b.flee = null; b.route = [[b.x, b.z]]; b.ri = 0; b.wait = frand(10, 16); } }
    else { b.calmT = 0; if (d < 28) b.reT = Math.min(b.reT, 0); }   // you found her: off she goes again
  } else if (b.route) {
    if (b.wait > 0) b.wait -= dt;
    else { const [rx, rz] = b.route[b.ri % b.route.length]; if (Math.hypot(rx - b.x, rz - b.z) < 2) { b.wait = frand(8, 14); b.ri = (b.ri + 1) % b.route.length; } else { tx = rx; tz = rz; spd = 1.15; } } }
  if (FLD.waterOn && waterDepth(b.x, b.z) > .25) spd *= .6; if (b.stag > 0) { b.stag -= dt; spd *= .4; }
  b.mv = 0; if (tx != null && spd > 0) humanMove(b, tx, tz, spd, dt, T.r);
  const want = b.mv > .4 ? "walk" : "idle"; if (want !== b.mode) { b.mode = want; b.anT = 0; }
  b.y = fieldH(b.x, b.z);
}
function updateHuman3(b, dt) {
  if (FBUG[b.type].unarmed) return updateOfficer(b, dt);
  const p = F.p, T = FBUG[b.type], hv = T.heavy, dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
  b.sayT -= dt; b.fireT -= dt; b.decT -= dt; b.supp = Math.max(0, b.supp - dt); b.losT -= dt; b.anT += dt;
  if (b.radioT > 0) { b.radioT -= dt; if (b.radioT <= 0) { humanAlert(b, true); if (Math.random() < .4) humanSay(b, "copy"); } }
  // eyes: checked a few times a second
  if (b.losT <= 0) { b.losT = frand(.22, .35); const face = Math.abs(angDiff(b.face, Math.atan2(dz, dx)));
    b.canSee = p.alive && !window.__invis && d < (b.state === "hunt" ? 45 : 26) && (b.state === "hunt" || face < 1.1 || d < 6) && los3(b.x, b.y + 1.55, b.z, p.x, p.y + 1.3, p.z); }
  // an idle soldier has to watch you for a moment before raising the alarm: quicker up close, slower when you're far or crouched in the grass
  if (b.state !== "hunt") { if (b.canSee) { b.spot = (b.spot || 0) + dt * (d < 7 ? 3 : .2 + 1.3 * (1 - d / 26)) * (hasMod(F.m, "rain") ? .65 : 1); if (b.spot >= 1) humanAlert(b); } else b.spot = Math.max(0, (b.spot || 0) - dt * .35); }
  if (b.canSee && b.state === "hunt") { b.spot = 1; F.intel = { x: p.x, z: p.z, t: F.t }; if (b.lastSeen < F.t - 3) b.aimStart = F.t; b.lastSeen = F.t; }
  let spd = 0, tx = null, tz = null, want = "idle";
  if (b.state === "hunt" && window.__invis) { b.state = "idle"; b.home = { x: b.x, z: b.z }; b.shooting = false; b.firing = false; b.dest = null; b.moving = false; }
  if (b.state === "hunt") {
    if (!p.alive) { b.state = "idle"; b.home = { x: b.x, z: b.z }; b.shooting = false; return; }
    const intel = F.intel && F.t - F.intel.t < 30 ? F.intel : null, TP = b.canSee ? p : intel;
    if (!TP) { b.state = "idle"; b.home = { x: b.x, z: b.z }; b.shooting = false; return; }
    if (b.relT > 0) { b.relT -= dt; if (b.relT <= 0) b.ammo = b.mag; }
    // lost sight: go and look where it was last seen
    if (!b.canSee && F.t - b.lastSeen > 5 && b.decT <= 0) { if (Math.random() < .5) humanSay(b, "lost"); b.dest = { x: TP.x + frand(-6, 6), z: TP.z + frand(-6, 6) }; b.moving = true; b.decT = frand(4, 7); }
    else if (b.decT <= 0 || (d < 6 && !b.moving && b.decT > .3)) humanDecide(b, TP);
    // a grenade at someone who's been hiding behind the same cover
    if (!hv && !b.canSee && intel && F.t - intel.t > 2.5 && F.t - intel.t < 10 && d > 9 && d < 30 && (F.nadeT || 0) < F.t && Math.random() < dt * .6) {
      F.nadeT = F.t + frand(22, 32); const tt = 1.3, ty = fieldH(intel.x, intel.z) + .3, y0 = b.y + 1.6;
      F.grenades.push({ type: "grenade", x: b.x, y: y0, z: b.z, vx: (intel.x - b.x) / tt, vy: (ty - y0) / tt + .5 * 19 * tt, vz: (intel.z - b.z) / tt, fuse: 2.4, enemy: true });
      humanSay(b, "grenade", true); }
    const runTo = b.moving && b.dest;
    if (runTo) { const dd = Math.hypot(b.dest.x - b.x, b.dest.z - b.z); if (dd < 1.1) { b.moving = false; b.dest = null; } else { tx = b.dest.x; tz = b.dest.z; spd = hv ? 1.7 : b.role === "advance" && b.canSee ? 1.4 : 3.1; } }
    // shooting: stand (or walk up, if advancing) and fire in bursts
    const canShoot = b.canSee && b.relT <= 0 && d < T.rng && (!runTo || (b.role === "advance" && spd < 2));
    if (canShoot) { want = "shoot"; b.face += angDiff(b.face, Math.atan2(dz, dx)) * Math.min(1, dt * 7);
      if (!b.shooting) { b.shooting = true; b.shootT = 0; b.burst = 0; b.pause = frand(.15, .4); }
      b.shootT += dt;
      if (b.shootT > .9) { if (b.burst <= 0) { b.firing = false; b.pause -= dt; if (b.pause <= 0) { b.burst = hv ? 8 + Math.floor(Math.random() * 8) : 2 + Math.floor(Math.random() * 3); b.pause = hv ? frand(1.3, 2.3) : frand(1, 2); if (b.role === "suppress" && Math.random() < .15) humanSay(b, hv ? "heavy" : "suppress"); } }
        else { b.firing = true; if (b.fireT <= 0 && Math.abs(angDiff(b.face, Math.atan2(dz, dx))) < .25) humanFire(b, p, d); }
        if (b.ammo <= 0) { b.relT = hv ? 4.5 : 2.3; b.shooting = false; b.firing = false; humanSay(b, "reload"); if (Math.random() < .6) b.decT = 0; } } }
    else { b.shooting = false; b.firing = false; }
  } else if (b.escort && F.hvt && F.hvt.dead == null) {   // escorting: keep station around the officer
    const o = F.hvt, gx = o.x + Math.cos(o.face + b.eo) * 2.6, gz = o.z + Math.sin(o.face + b.eo) * 2.6, gd = Math.hypot(gx - b.x, gz - b.z); b.home = { x: o.x, z: o.z };
    if (gd > 1.2) { tx = gx; tz = gz; spd = gd > 6 ? 3.1 : 1.3; } else b.face += angDiff(b.face, o.face + b.eo) * Math.min(1, dt * 2);
  } else {   // patrolling: a slow walk between points near home
    b.wT -= dt; if (b.wT <= 0 || !b.wt) { b.wT = frand(3, 8); b.wt = { x: b.home.x + frand(-14, 14), z: b.home.z + frand(-14, 14) }; }
    if (Math.hypot(b.wt.x - b.x, b.wt.z - b.z) > 1) { tx = b.wt.x; tz = b.wt.z; spd = 1.1; } }
  if (FLD.waterOn && waterDepth(b.x, b.z) > .25) spd *= .6; if (b.stag > 0) { b.stag -= dt; spd *= .4; }
  b.mv = 0;
  if (tx != null && spd > 0) humanMove(b, tx, tz, spd, dt, T.r);
  if (want !== "shoot") want = b.mv > .4 ? "walk" : "idle";
  if (want !== b.mode) { b.mode = want; b.anT = 0; }
  b.y = fieldH(b.x, b.z);
}
// being shot: duck for cover, shout about it; squadmates react to a death
function humanHurt(b, dmg) { if (FBUG[b.type].unarmed) { if (b.state !== "hunt") humanAlert(b); else { b.reT = 0; if (b.hp > 0) humanSay(b, "flee", true); } return; } b.supp = 2.2; b.decT = Math.min(b.decT, .2); if (b.state !== "hunt") humanAlert(b); if (b.hp > 0 && Math.random() < .35) humanSay(b, "taking"); }
function humanDie(b) { AU.grunt(volAt(b.x, b.z), panAt(b.x, b.z)); b.mode = "dead"; b.anT = 0; if (b.boss || b.officer) bossDown(b);
  let near = null, nd = 40; for (const o of F.bugs) if (o !== b && o.dead == null && FBUG[o.type].human) { const dd = Math.hypot(o.x - b.x, o.z - b.z); if (dd < nd) { nd = dd; near = o; } }
  if (near) setTimeout(() => near && near.dead == null && F && humanSay(near, "mandown", true), 500); }

// ---------- drawing: an 8-direction billboard from the atlas ----------
const HUM_ATLAS = { cols: 18, rows: 8, size: 2.63, foot: .45 };
function humanFrame(b, eye) { const rel = angDiff(b.face, Math.atan2(eye[2] - b.z, eye[0] - b.x)), row = ((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8;
  let col = 0; if (b.mode === "walk") col = 1 + Math.floor(b.anT * (b.mv > 2.2 ? 11 : 7)) % 8;
  else if (b.mode === "shoot") col = b.shootT < .9 ? 9 + Math.min(5, Math.floor(b.shootT / .15)) : b.firing ? 15 + Math.floor(b.anT * 16) % 3 : 15;   // raise once, then loop the last three
  return [col, row]; }
function drawHumans(eye, cam) {
  const gl = R3.gl, L = R3.loc, A = HUM_ATLAS, rx = cam.r[0], rz = cam.r[2], sets = {};
  for (const b of F.bugs) { const T = FBUG[b.type]; if (!T.human) continue; const ak = T.atlas || "hum_merc"; if (!FART[ak]) continue; if (!R3.tex[ak]) R3.tex[ak] = glTex(FART[ak]);
    const batch = sets[ak] = sets[ak] || { n: new MB(), f: new MB(), d: new MB(), b: new MB() }, cols = T.cols || A.cols;
    const S = (T.size || A.size) * (b.boss ? 1.18 : 1), FT = (T.foot || A.foot) * (b.boss ? 1.18 : 1), dead = b.dead != null, [c, r] = dead ? [0, 0] : humanFrame(b, eye), uv = [c / cols, r / A.rows, (c + 1) / cols, (r + 1) / A.rows];
    const y0 = b.y - FT, m = dead ? batch.d : b.flash > 0 ? batch.f : b.boss ? batch.b : batch.n;
    if (!dead) m.quad([b.x - rx * S / 2, y0 + S, b.z - rz * S / 2], [b.x + rx * S / 2, y0 + S, b.z + rz * S / 2], [b.x + rx * S / 2, y0, b.z + rz * S / 2], [b.x - rx * S / 2, y0, b.z - rz * S / 2], [-cam.f[0], 0, -cam.f[2]], uv);
    else { const k = Math.min(1, (12 - b.dead) / .45), a = ease(k) * 1.5, fx = cam.f[0], fz = cam.f[2], fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl, by = b.y + .05;
      const top = [Math.sin(a) * S * .82, Math.cos(a) * S * .82], bx0 = b.x - ux * FT * Math.sin(a), bz0 = b.z - uz * FT * Math.sin(a);
      m.quad([bx0 - rx * S / 2 + ux * top[0], by + top[1], bz0 - rz * S / 2 + uz * top[0]], [bx0 + rx * S / 2 + ux * top[0], by + top[1], bz0 + rz * S / 2 + uz * top[0]], [bx0 + rx * S / 2, by, bz0 + rz * S / 2], [bx0 - rx * S / 2, by, bz0 - rz * S / 2], [0, 1, 0], [uv[0], uv[1], uv[2], uv[1] + (uv[3] - uv[1]) * .82]); } }
  for (const ak in sets) { const batch = sets[ak];
    drawMB(batch.n, ak, 0, 0, 1); gl.uniform3f(L.uTint, 1.35, 1.05, .55); drawMB(batch.b, ak, 0, 0, 1); gl.uniform3f(L.uTint, 1, 1, 1);
    gl.uniform3f(L.uTint, 3, 3, 3); drawMB(batch.f, ak, 1); gl.uniform3f(L.uTint, .45, .4, .4); drawMB(batch.d, ak, 0, 0, 1); gl.uniform3f(L.uTint, 1, 1, 1); } }
