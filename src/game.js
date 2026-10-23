// =====================================================================================
//  GAME: trooper, bugs, stratagems, objectives, extraction
// =====================================================================================
const BUGT = {
  scav:    { name: "Scavenger",    L: 12, W: 10, hp: 45,   spd: 74, r: 5,  dmg: 6,  cd: .75, reach: 12 },
  warrior: { name: "Warrior",      L: 18, W: 14, hp: 190,  spd: 60, r: 8,  dmg: 15, cd: 1.0, reach: 16 },
  spitter: { name: "Bile Spitter", L: 16, W: 14, hp: 130,  spd: 46, r: 7,  dmg: 10, cd: 1.2, reach: 14, range: 210 },
  charger: { name: "Charger",      L: 30, W: 22, hp: 1500, spd: 44, r: 12, dmg: 40, cd: 1.4, reach: 22 },
};
const STRATS = {
  resupply:  { name: "Resupply",                 code: "DDUR",   cd: 150, kind: "support", ic: "RS", delay: 3 },
  eagle:     { name: "Eagle Airstrike",          code: "URDR",   cd: 0,   uses: 3, rearm: 90, kind: "eagle", ic: "EA", delay: 1.5 },
  precision: { name: "Orbital Precision Strike", code: "RRU",    cd: 90,  kind: "orbital", ic: "OP", delay: 2.6 },
  barrage:   { name: "Orbital 120mm Barrage",    code: "RRDLRD", cd: 180, kind: "orbital", ic: "OB", delay: 3.5 },
  sentry:    { name: "MG Sentry",                code: "DURRU",  cd: 150, kind: "support", ic: "MG", delay: 2.5 },
};
const ARW = { U: "▲", D: "▼", L: "◀", R: "▶" };
const SAVE_KEY = "drop_save";
function freshSave() { return { req: 0, samples: 0, missions: 0, wins: 0, best: 1, kills: 0, deaths: 0, extracted: 0, totalReq: 0,
  gal: { cur: 1, slots: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }, owned: { w: ["rifle"], w2: ["pistol"], a: ["medium"], s: ["resupply", "eagle", "precision", "barrage", "sentry"] }, lo: { w: "rifle", w2: "pistol", a: "medium", s: ["resupply", "eagle", "precision", "sentry"] }, up: {} }; }
function loadSave() { const d = freshSave(); let s = {}; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; } catch {}
  const o = Object.assign(d, s); o.owned = Object.assign(freshSave().owned, s.owned); o.lo = Object.assign(freshSave().lo, s.lo); o.up = Object.assign({}, s.up); o.gal = s.gal && s.gal.slots ? s.gal : freshSave().gal; while (o.gal.slots.length < 4) o.gal.slots.push([0, 0, 0, 0]); try { syncWarLocks(o); } catch (_) {} return o; }
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} }

let G = null;
const solidAt = (x, y) => { const tx = (x / TS) | 0, ty = (y / TS) | 0; return tx < 0 || ty < 0 || tx >= MW || ty >= MH || G.map.solid[ty * MW + tx] === 1; };
const waterAt = (x, y) => { const tx = (x / TS) | 0, ty = (y / TS) | 0; return !!(G.map.water && G.map.water[ty * MW + tx]); };
function blocked(x, y, r) {
  const x0 = ((x - r) / TS) | 0, x1 = ((x + r) / TS) | 0, y0 = ((y - r) / TS) | 0, y1 = ((y + r) / TS) | 0;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || G.map.solid[ty * MW + tx]) {
      const nx = clamp(x, tx * TS, tx * TS + TS), ny = clamp(y, ty * TS, ty * TS + TS);
      if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
    } }
  return false;
}
function moveCircle(e, dx, dy, r) { let hit = false;
  if (!blocked(e.x + dx, e.y, r)) e.x += dx; else hit = true;
  if (!blocked(e.x, e.y + dy, r)) e.y += dy; else hit = true;
  return hit; }
function los(ax, ay, bx, by) { const n = Math.ceil(dst(ax, ay, bx, by) / 7); for (let i = 1; i < n; i++) if (solidAt(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false; return true; }
function findSpot(cx, cy, rmin, rmax, r = 9, avoidView = false) {
  for (let k = 0; k < 60; k++) { const a = Math.random() * 6.283, d = frand(rmin, rmax), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    if (x < 40 || y < 40 || x > MW * TS - 40 || y > MH * TS - 40 || blocked(x, y, r) || waterAt(x, y)) continue;
    if (avoidView && typeof onScreen === "function" && onScreen(x, y, 30)) continue;
    return { x, y }; }
  return null;
}

// ---------- mission start ----------
function startMission(m) {
  const map = buildMap(m), C = p => ({ x: p.x * TS + 8, y: p.y * TS + 8 }), lo = resolveLoadout(m);
  G = { lo, m, map, t: 0, timeLeft: 20 * 60, over: null, paused: false,
    p: newPlayer(C(map.start), lo), bugs: [], shots: [], spits: [], throws: [], parts: [], booms: [], beacons: [], strikes: [], pods: [], sentries: [], crates: [], items: [], breaches: [], jets: [], beams: [], texts: [],
    nests: [], reinf: lo.reinf, cd: {}, uses: {}, rearm: {}, armed: null, input: "", inputFail: 0, inputMode: false,
    stats: { kills: 0, deaths: 0, shots: 0, hits: 0, nests: 0, samples: 0, strats: 0 },
    field: new Int16Array(MW * MH), fq: new Int32Array(MW * MH), fieldT: 0, grid: new Map(),
    breachCool: 35, patrolT: 45, ion: 0, ionT: frand(50, 80), metT: frand(8, 14), shake: 0, respawnT: 0, msg: null, ext: Object.assign(C(map.ext), { state: "locked", t: 0, board: 0, shipZ: 0 }),
    destroyerGone: false, code: null };
  for (const k in STRATS) { G.cd[k] = 0; G.rearm[k] = 0; G.uses[k] = (STRATS[k].uses || 0) + (STRATS[k].kind === "eagle" ? lo.eagleBonus : 0); }
  // the main objective
  const o = C(map.obj);
  if (m.obj === "purge") { G.mainNest = makeNest(o, 6, true); G.nests.push(G.mainNest); }
  if (m.obj === "uplink") G.term = { x: o.x, y: o.y, state: "idle", prog: 0, waveT: 4 };
  if (m.obj === "blackbox") { G.wreck = { x: o.x, y: o.y }; G.box = { x: o.x + 22, y: o.y + 14, carried: false, delivered: false }; }
  map.nests.forEach(n => G.nests.push(makeNest(C(n), Math.random() < .5 ? 2 : 3, false)));
  map.samples.forEach(s => G.items.push({ ...C(s), kind: "sample", n: 1 }));
  paintStatics();
  // the planet is already crawling
  for (const n of G.nests) { const k = (n.main ? 8 : randi(3, 5)) + Math.floor(m.diff / 2); for (let i = 0; i < k; i++) { const s = findSpot(n.x, n.y, 10, 60); if (s) spawnBug(bugMix(), s.x, s.y, "idle"); } }
  for (let g = 0, n = 5 + m.diff; g < n; g++) { const s = findSpot(MW * TS / 2, MH * TS / 2, 0, MW * TS * .48); if (!s || dst(s.x, s.y, G.p.x, G.p.y) < 450) continue;
    for (let i = randi(2, 4); i > 0; i--) { const q = findSpot(s.x, s.y, 0, 30); if (q) spawnBug(bugMix(), q.x, q.y, "idle"); } }
  dropPlayer(G.p.x, G.p.y, true);
}
function newPlayer(pt, lo) { return { x: pt.x, y: pt.y, a: 0, hp: lo.hp, st: 100, stT: 0, ammo: lo.mag, mags: lo.mags - 1, gren: lo.gren, stims: lo.stims, fireT: 0, relT: 0, dive: 0, diveA: 0, diveCd: 0, prone: 0,
  alive: false, anim: 0, moving: false, hurtT: 0, slow: 0, carry: false, samples: 0, inv: 0 }; }
function makeNest(c, k, main) {
  const holes = [];
  for (let i = 0; i < k; i++) { for (let t = 0; t < 30; t++) { const a = i / k * 6.283 + frand(-.4, .4), d = main ? frand(26, 56) : frand(10, 26), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
      if (!blocked(x, y, 8) && holes.every(h => dst(h.x, h.y, x, y) > 22)) { holes.push({ x, y, alive: true }); break; } } }
  if (!holes.length) holes.push({ x: c.x, y: c.y, alive: true });
  return { x: c.x, y: c.y, holes, main, spT: frand(2, 5), cleared: false };
}
function dropPlayer(x, y, first) {
  G.pods.push({ x, y, t: 0, T: first ? 2.2 : 1.6, kind: "hell", onLand() {
    const p = G.p; Object.assign(p, { x, y, alive: true, hp: G.lo.hp, st: 100, inv: first ? 1 : 2, relT: 0, dive: 0, prone: 0 });
    if (!first) Object.assign(p, { ammo: G.lo.mag, mags: Math.ceil(G.lo.mags / 2), gren: 2, stims: 2 });
    explode(x, y, 26, 600, { safe: true, noHoles: true, quiet: true });
    if (first) say("DEPLOYED", OBJS[G.m.obj].name);
  } });
  AU.pod();
}

// ---------- bugs ----------
function bugMix() { const d = G.m.diff - 1, w = { scav: 10, warrior: d >= 1 ? 2 + d * 1.2 : .6, spitter: d >= 2 ? 1.5 + d * .5 : 0, charger: d >= 3 ? (d - 2) * .45 : 0 };
  if (G.bugs.filter(b => b.type === "charger").length >= Math.max(1, d - 2)) w.charger = 0;
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0); for (const k in w) { r -= w[k]; if (r <= 0) return k; } return "scav"; }
function spawnBug(type, x, y, state = "hunt") {
  const T = BUGT[type], b = { type, x, y, a: Math.random() * 6.283, hp: T.hp, max: T.hp, state, home: { x, y }, wt: null, wT: 0, atkT: .5, anim: Math.random(), flash: 0, sT: Math.random() * .3,
    sees: false, seen: 0, lost: 0, stun: 0, ch: null, chT: 0, chCd: 2, spitT: 1.5, lunge: 0, spd: T.spd * frand(.92, 1.08) };
  G.bugs.push(b); return b;
}
const activeCap = () => 26 + G.m.diff * 8;
const sightR = () => hasMod(G.m, "fog") ? 110 : 185;
function alertBug(b, spread = true) {
  if (b.state !== "hunt") { b.state = "hunt"; b.lost = 0; if (Math.random() < .25) AU.screech(.5); }
  if (spread) for (const o of G.bugs) if (o !== b && o.state !== "hunt" && dst(o.x, o.y, b.x, b.y) < 70) alertBug(o, false);
}
function noise(x, y, r) { for (const b of G.bugs) if (b.state !== "hunt" && dst(b.x, b.y, x, y) < r) alertBug(b, false); }
function buildField() {
  const f = G.field, q = G.fq, p = G.p; f.fill(-1); if (!p.alive) return;
  const s = ((p.y / TS) | 0) * MW + ((p.x / TS) | 0); f[s] = 0; q[0] = s; let h = 0, t = 1;
  while (h < t) { const i = q[h++], d = f[i]; if (d >= 90) continue; const x = i % MW;
    if (x > 0 && f[i - 1] < 0 && !G.map.solid[i - 1]) { f[i - 1] = d + 1; q[t++] = i - 1; }
    if (x < MW - 1 && f[i + 1] < 0 && !G.map.solid[i + 1]) { f[i + 1] = d + 1; q[t++] = i + 1; }
    if (i >= MW && f[i - MW] < 0 && !G.map.solid[i - MW]) { f[i - MW] = d + 1; q[t++] = i - MW; }
    if (i < MW * (MH - 1) && f[i + MW] < 0 && !G.map.solid[i + MW]) { f[i + MW] = d + 1; q[t++] = i + MW; } }
}
const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function pathAngle(b) {   // follow the flow field downhill toward the trooper
  const tx = (b.x / TS) | 0, ty = (b.y / TS) | 0, f = G.field, i = ty * MW + tx;
  if (f[i] < 0) return Math.atan2(G.p.y - b.y, G.p.x - b.x);
  let best = f[i], bx = 0, by = 0;
  for (const [dx, dy] of DIR8) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const j = y * MW + x;
    if (f[j] < 0 || f[j] >= best) continue; if (dx && dy && (G.map.solid[ty * MW + x] || G.map.solid[y * MW + tx])) continue; best = f[j]; bx = dx; by = dy; }
  if (!bx && !by) return Math.atan2(G.p.y - b.y, G.p.x - b.x);
  return Math.atan2((ty + by) * TS + 8 - b.y, (tx + bx) * TS + 8 - b.x);
}
function rebuildGrid() { const g = G.grid; g.clear(); for (const b of G.bugs) { const k = ((b.x / 32) | 0) + ((b.y / 32) | 0) * 1000; let a = g.get(k); if (!a) g.set(k, a = []); a.push(b); } }
function nearBugs(x, y, r, out = []) { out.length = 0; const x0 = ((x - r) / 32) | 0, x1 = ((x + r) / 32) | 0, y0 = ((y - r) / 32) | 0, y1 = ((y + r) / 32) | 0;
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const a = G.grid.get(gx + gy * 1000); if (a) for (const b of a) out.push(b); } return out; }
const _nb = [];
function updateBugs(dt) {
  const p = G.p, cap = activeCap();
  for (const b of G.bugs) {
    const T = BUGT[b.type]; b.flash -= dt; b.atkT -= dt; b.lunge = Math.max(0, b.lunge - dt * 4); b.chCd -= dt;
    if (b.stun > 0) { b.stun -= dt; continue; }
    const dp = p.alive ? dst(b.x, b.y, p.x, p.y) : 1e9;
    b.sT -= dt; if (b.sT <= 0) { b.sT = .25 + Math.random() * .1; b.sees = p.alive && dp < sightR() && los(b.x, b.y, p.x, p.y); if (b.sees) alertBug(b); }
    let ang = null, spd = b.spd, moving = true;
    if (b.state === "hunt") {
      if (!p.alive) { b.state = "idle"; b.home = { x: b.x, y: b.y }; continue; }
      if (b.sees) { b.lost = 0; b.seen += dt; } else { b.lost += dt; b.seen = Math.max(0, b.seen - dt); if (b.lost > 20) { b.state = "idle"; b.home = { x: b.x, y: b.y }; } }
      // a bug that keeps you in sight calls in the hive
      if (b.seen > 3.5 && G.breachCool <= 0 && b.type !== "charger" && Math.random() < dt * .4 && G.active < cap) callBreach(b);
      ang = b.sees && dp < 130 ? Math.atan2(p.y - b.y, p.x - b.x) : pathAngle(b);
      if (b.type === "spitter" && b.sees && dp < T.range) {
        moving = dp > 140; b.spitT -= dt; const aim = Math.atan2(p.y - b.y, p.x - b.x); b.a += angDiff(b.a, aim) * Math.min(1, dt * 8);
        if (b.spitT <= 0) { b.spitT = frand(2.2, 3); const lead = .35, ax = p.x + (p.vx || 0) * lead, ay = p.y + (p.vy || 0) * lead, a2 = Math.atan2(ay - b.y, ax - b.x);
          G.spits.push({ x: b.x + Math.cos(a2) * 8, y: b.y + Math.sin(a2) * 8, vx: Math.cos(a2) * 190, vy: Math.sin(a2) * 190, life: 1.4 }); AU.squish(.5); }
      }
      if (b.type === "charger") {
        if (!b.ch && b.sees && dp < 250 && dp > 40 && b.chCd <= 0) { b.ch = "wind"; b.chT = .75; AU.screech(1); }
        if (b.ch === "wind") { b.chT -= dt; const aim = Math.atan2(p.y - b.y, p.x - b.x); b.a += angDiff(b.a, aim) * Math.min(1, dt * 10); moving = false; G.shake = Math.max(G.shake, 1);
          if (b.chT <= 0) { b.ch = "run"; b.chT = 1.5; } }
        else if (b.ch === "run") { b.chT -= dt; const aim = Math.atan2(p.y - b.y, p.x - b.x); b.a += clamp(angDiff(b.a, aim), -.7 * dt, .7 * dt);
          const v = 260; if (moveCircle(b, Math.cos(b.a) * v * dt, Math.sin(b.a) * v * dt, T.r)) { b.ch = null; b.stun = 2.2; b.chCd = 4; G.shake = Math.max(G.shake, 4); AU.boom(.4, .7); dust(b.x + Math.cos(b.a) * 14, b.y + Math.sin(b.a) * 14, 14); }
          if (p.alive && dst(b.x, b.y, p.x, p.y) < T.r + 6 && p.inv <= 0) { hurtPlayer(T.dmg, b); const k = Math.atan2(p.y - b.y, p.x - b.x); moveCircle(p, Math.cos(k) * 22, Math.sin(k) * 22, 5); p.inv = .6; }
          if (b.chT <= 0) { b.ch = null; b.chCd = 3.5; }
          if (Math.random() < .5) dust(b.x - Math.cos(b.a) * 12, b.y - Math.sin(b.a) * 12, 1);
          continue; }
      }
      if (dp < T.reach + 6) { moving = false; const aim = Math.atan2(p.y - b.y, p.x - b.x); b.a += angDiff(b.a, aim) * Math.min(1, dt * 12);
        if (b.atkT <= 0) { b.atkT = T.cd; b.lunge = 1; if (p.inv <= 0) hurtPlayer(T.dmg, b); } }
    } else if (b.state === "patrol") {
      ang = pathAngle(b); spd *= .6; if (!p.alive || dp < 110 || G.field[((b.y / TS) | 0) * MW + ((b.x / TS) | 0)] < 0) { b.state = "idle"; b.home = { x: b.x, y: b.y }; }
    } else {   // idle: mill about near home
      b.wT -= dt; if (b.wT <= 0 || !b.wt) { b.wT = frand(2, 5); b.wt = { x: b.home.x + frand(-40, 40), y: b.home.y + frand(-40, 40) }; }
      const d = dst(b.x, b.y, b.wt.x, b.wt.y); if (d < 6) moving = false; else ang = Math.atan2(b.wt.y - b.y, b.wt.x - b.x); spd *= .3;
    }
    if (moving && ang !== null) {
      if (waterAt(b.x, b.y)) spd *= .6;
      b.a += angDiff(b.a, ang) * Math.min(1, dt * 9);
      if (moveCircle(b, Math.cos(ang) * spd * dt, Math.sin(ang) * spd * dt, T.r) && b.state === "idle") b.wT = 0;
      b.anim += dt * spd / 18;
    }
  }
  // keep them from stacking into one blob
  for (const b of G.bugs) { const r1 = BUGT[b.type].r; for (const o of nearBugs(b.x, b.y, 24, _nb)) { if (o === b) continue; const r = r1 + BUGT[o.type].r, d = dst(b.x, b.y, o.x, o.y);
      if (d < r && d > .01) { const k = (r - d) * .25 / d, w = BUGT[o.type].r / r; moveCircle(b, (b.x - o.x) * k * w * 2, (b.y - o.y) * k * w * 2, r1); } } }
}
function hurtBug(b, dmg, fx, fy, kind) {
  if (b.hp <= 0) return;
  if (b.type === "charger" && kind === "bullet") { const d = Math.abs(angDiff(b.a, Math.atan2(fy - b.y, fx - b.x)));
    if (d < 1.25) { dmg *= .1; spark(b.x + Math.cos(b.a) * 10, b.y + Math.sin(b.a) * 10, "#fff2c0"); } else if (d > 2.3) dmg *= 1.7; }
  b.hp -= dmg; b.flash = .07; alertBug(b);
  if (b.hp <= 0) killBug(b, fx, fy);
}
function killBug(b, fx, fy) {
  b.hp = 0; G.stats.kills++; AU.squish(b.type === "charger" ? 1.4 : .8);
  const a = Math.atan2(b.y - fy, b.x - fx); for (let i = 0; i < (b.type === "charger" ? 30 : 10); i++) { const s = frand(20, 110), k = a + frand(-.9, .9);
    G.parts.push({ x: b.x, y: b.y, vx: Math.cos(k) * s, vy: Math.sin(k) * s, life: frand(.25, .6), max: .6, col: Math.random() < .6 ? "#e8a838" : "#a8622a", sz: 1 + (Math.random() < .3) }); }
  decalCorpse(b);
}
function callBreach(b) {
  G.breachCool = Math.max(18, 55 - G.m.diff * 6);
  const s = findSpot(G.p.x, G.p.y, 90, 160, 10); if (!s) return;
  startBreach(s.x, s.y, 5 + G.m.diff * 2);
  for (let i = 0; i < 14; i++) G.parts.push({ x: b.x, y: b.y - 4, vx: frand(-12, 12), vy: frand(-40, -15), life: frand(.6, 1.4), max: 1.4, col: "#d84a2a", sz: 2 });
}
function startBreach(x, y, n) { if (hasMod(G.m, "swarm")) n = Math.round(n * 1.4); G.breaches.push({ x, y, t: 2.2, n, spT: 0 }); AU.rumble(); AU.screech(1); }

// ---------- player ----------
function mouseWorld() { return { x: mouse.x / VIEW.s + VIEW.x, y: mouse.y / VIEW.s + VIEW.y }; }
function hurtPlayer(dmg, src) {
  const p = G.p; if (!p.alive || window.__god) return; dmg *= G.lo.mul; p.hp -= dmg; p.hurtT = .3; if (src) p.inv = Math.max(p.inv, .22); AU.hurt(); G.shake = Math.max(G.shake, 2 + dmg / 15);
  for (let i = 0; i < 6; i++) G.parts.push({ x: p.x, y: p.y, vx: frand(-50, 50), vy: frand(-50, 50), life: .4, max: .4, col: "#b8202a", sz: 1 });
  if (p.hp <= 0) killPlayer();
}
function killPlayer() {
  const p = G.p; p.alive = false; p.hp = 0; G.stats.deaths++; G.armed = null; G.input = ""; G.code = null;
  G.map.g.fillStyle = "#6a1a1a"; for (let i = 0; i < 14; i++) G.map.g.fillRect(Math.round(p.x + frand(-7, 7)), Math.round(p.y + frand(-7, 7)), 2, 2);
  if (p.samples) { G.items.push({ x: p.x, y: p.y, kind: "bag", n: p.samples }); p.samples = 0; }
  if (p.carry) { p.carry = false; Object.assign(G.box, { x: p.x, y: p.y, carried: false }); }
  if (G.reinf > 0) { G.respawnT = 4; say("TROOPER DOWN", `Reinforcing… ${G.reinf} left`); }
  else { say("MISSION FAILED", "No reinforcements remaining"); setTimeout(() => endMission(false), 2600); G.over = { pending: true }; }
}
function updatePlayer(dt) {
  const p = G.p;
  if (!p.alive) { if (G.respawnT > 0) { G.respawnT -= dt; if (G.respawnT <= 0) { G.reinf--; let s = null, best = 1e9; for (let k = 0; k < 14; k++) { const q = findSpot(p.x, p.y, 60, 150); if (!q) continue; const n = G.bugs.filter(b => dst(b.x, b.y, q.x, q.y) < 90).length; if (n < best) { best = n; s = q; } } s = s || { x: p.x, y: p.y }; dropPlayer(s.x, s.y, false); } } return; }
  p.inv -= dt; p.hurtT -= dt; p.diveCd -= dt;
  const mw = mouseWorld(); p.a = Math.atan2(mw.y - p.y, mw.x - p.x);
  // stratagem input: hold Q and tap arrows (WASD or the arrow keys)
  if (pressed.has("q")) { G.input = ""; if (G.armed) { G.armed = null; AU.fail(); } }
  G.inputMode = keys.has("q");
  if (released.has("q") && !G.armed) G.input = "";
  const dirKey = { w: "U", arrowup: "U", s: "D", arrowdown: "D", a: "L", arrowleft: "L", d: "R", arrowright: "R" };
  if (G.inputMode || G.code) for (const k of pressed) if (dirKey[k]) { G.inputMode ? stratInput(dirKey[k]) : codeInput(dirKey[k]); }
  let mx = 0, my = 0;
  if (!G.inputMode && !G.code) { if (keys.has("w")) my--; if (keys.has("s")) my++; if (keys.has("a")) mx--; if (keys.has("d")) mx++; }
  const len = Math.hypot(mx, my); if (len) { mx /= len; my /= len; }
  let spd = 92 * G.lo.spd; const sprint = keys.has("shift") && len > 0 && p.st > 1 && !p.carry && p.relT <= 0;
  if (sprint) { spd = 140 * G.lo.spd; p.st -= 22 * dt; p.stT = .9; } else { p.stT -= dt; if (p.stT <= 0) p.st = Math.min(100, p.st + (hasMod(G.m, "heat") ? 9 : 20) * G.lo.regen * dt); }
  p.st = Math.max(0, p.st);
  if (p.carry) spd *= .75; if (p.slow > 0) { spd *= .6; p.slow -= dt; } if (waterAt(p.x, p.y)) spd *= .62;
  const ox = p.x, oy = p.y;
  if (pressed.has(" ") && p.diveCd <= 0 && p.prone <= 0 && p.dive <= 0 && !G.code) { p.dive = .36; p.diveA = len ? Math.atan2(my, mx) : p.a; p.inv = Math.max(p.inv, .38); p.diveCd = .9; p.st = Math.max(0, p.st - 12); dust(p.x, p.y, 4); }
  if (p.dive > 0) { p.dive -= dt; const v = 250 * (p.dive / .36) + 60; moveCircle(p, Math.cos(p.diveA) * v * dt, Math.sin(p.diveA) * v * dt, 5); if (p.dive <= 0) { p.prone = .28; dust(p.x, p.y, 5); } }
  else if (p.prone > 0) p.prone -= dt;
  else moveCircle(p, mx * spd * dt, my * spd * dt, 5);
  p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt; p.moving = len > 0; if (p.moving) p.anim += dt * spd / 14;
  // weapon
  p.fireT -= dt;
  if (p.relT > 0) { p.relT -= dt; if (p.relT <= 0) { p.ammo = G.lo.mag; p.mags--; AU.click(); } }
  const relTime = relTimeOf();
  if (pressed.has("r") && p.relT <= 0 && p.ammo < G.lo.mag && p.mags > 0 && !p.carry) { p.relT = relTime; AU.reload(); }
  if (G.armed) { if (mouse.clicked && !G.code) throwObj("beacon", G.armed); }
  else if (mouse.down && !G.inputMode && !G.code && p.dive <= 0 && p.prone <= 0 && !p.carry && p.relT <= 0 && p.fireT <= 0) {
    if (p.ammo > 0) fireWeapon(p, len > 0, sprint);
    else if (mouse.clicked) { AU.empty(); if (p.mags > 0) { p.relT = relTime; AU.reload(); } }
  }
  if (pressed.has("g") && p.gren > 0 && !G.code && !p.carry) { p.gren--; throwObj("grenade"); }
  if (pressed.has("f") && p.stims > 0 && p.hp < G.lo.hp) { p.stims--; p.hp = G.lo.hp; p.slow = 0; AU.pickup(); for (let i = 0; i < 10; i++) G.parts.push({ x: p.x, y: p.y, vx: frand(-30, 30), vy: frand(-60, -10), life: .6, max: .6, col: "#72e06a", sz: 1 }); }
  // pick-ups that need no button
  for (let i = G.items.length - 1; i >= 0; i--) { const it = G.items[i]; if (dst(it.x, it.y, p.x, p.y) < 13) { p.samples += it.n; G.items.splice(i, 1); AU.pickup(); floatText(p.x, p.y - 12, `+${it.n} SAMPLE${it.n > 1 ? "S" : ""}`, "#72e06a"); } }
  if (pressed.has("e")) interact();
}
const relTimeOf = () => G.lo.reload * (hasMod(G.m, "cold") ? 1.5 : 1);
function fireWeapon(p, moving, sprint) {
  const w = G.lo.w; p.ammo--; p.fireT = w.rate; G.stats.shots++;
  let sx = p.x + Math.cos(p.a) * 11 + Math.cos(p.a + 1.57) * .5, sy = p.y + Math.sin(p.a) * 11 + Math.sin(p.a + 1.57) * .5;
  if (solidAt(sx, sy)) { sx = p.x; sy = p.y; }
  const spr = w.spread + (moving ? w.moveSpread : 0) + (sprint ? .06 : 0), big = w.pellets > 1 || w.dmg >= 100;
  for (let i = 0; i < w.pellets; i++) { const a = p.a + frand(-spr, spr), v = w.speed * (w.pellets > 1 ? frand(.85, 1.1) : 1);
    G.shots.push({ x: sx, y: sy, px: sx, py: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: w.life * (w.pellets > 1 ? frand(.8, 1.1) : 1), dmg: w.dmg, ox: p.x, oy: p.y, own: true, pierce: w.pierce, hit: w.pierce ? new Set() : null, heavy: w.dmg >= 100 }); }
  G.parts.push({ x: sx + Math.cos(p.a) * 2, y: sy + Math.sin(p.a) * 2, vx: 0, vy: 0, life: .05, max: .05, col: "#fff4b0", sz: big ? 5 : 3, flash: true });
  AU.shot(big ? 1.6 : w.rate < .07 ? .7 : 1); noise(p.x, p.y, 240); G.shake = Math.max(G.shake, big ? 2.2 : .7);
}
function throwObj(type, key) {
  const p = G.p, mw = mouseWorld(), a = Math.atan2(mw.y - p.y, mw.x - p.x), d = Math.min(dst(p.x, p.y, mw.x, mw.y), type === "beacon" ? 230 : 200);
  G.throws.push({ type, key, sx: p.x, sy: p.y, x: p.x, y: p.y, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, t: 0, T: .25 + d / 520, z: 0, h: 10 + d * .12, fuse: 1.4, landed: false, dir: a });
  if (type === "beacon") { const S = STRATS[key], mult = (hasMod(G.m, "interference") ? 1.5 : 1) * G.lo.cdMul;
    if (S.uses) { G.uses[key]--; if (G.uses[key] <= 0) G.rearm[key] = S.rearm * mult; } else G.cd[key] = S.cd * mult;
    G.armed = null; G.stats.strats++; }
  AU.click();
}
const stratOffline = () => G.ion > 0 || G.destroyerGone;
const stratReady = k => STRATS[k].uses ? G.uses[k] > 0 && G.rearm[k] <= 0 : G.cd[k] <= 0;
function stratInput(ch) {
  if (G.armed) return;
  if (stratOffline()) { AU.fail(); G.inputFail = .4; return; }
  G.input += ch;
  const m = G.lo.strats.filter(k => stratReady(k) && STRATS[k].code.startsWith(G.input));
  if (!m.length) { AU.fail(); G.input = ""; G.inputFail = .35; return; }
  AU.key(G.input.length - 1);
  const full = m.find(k => STRATS[k].code === G.input); if (full) { G.armed = full; G.input = ""; AU.armed(); }
}
function codeInput(ch) {
  const c = G.code; if (!c) return;
  if (c.seq[c.i] === ch) { c.i++; AU.key(c.i); if (c.i >= c.seq.length) { G.code = null; AU.armed(); c.done(); } }
  else { c.i = 0; AU.fail(); c.fail = .35; }
}

// ---------- interaction ----------
function interactTarget() {
  const p = G.p; if (!p.alive) return null;
  for (const c of G.crates) if (c.uses > 0 && dst(c.x, c.y, p.x, p.y) < 24) return { label: "Resupply", go() { c.uses--; p.mags = G.lo.mags; p.gren = G.lo.gren; p.stims = G.lo.stims; if (p.ammo < G.lo.mag && p.relT <= 0) p.ammo = G.lo.mag; AU.pickup(); floatText(p.x, p.y - 12, "RESUPPLIED", "#f2d230"); } };
  if (G.term && dst(G.term.x, G.term.y, p.x, p.y) < 28) {
    if (G.code) return { label: "Step away", go() { G.code = null; } };
    if (G.term.state === "idle") return { label: "Access terminal", go() { G.code = { seq: Array.from({ length: 6 + Math.floor(G.m.diff / 2) }, () => pick("UDLR")), i: 0, fail: 0, done() { G.term.state = "upload"; say("UPLINK ONLINE", "Defend the terminal while it uploads"); noise(G.term.x, G.term.y, 600); } }; } };
  }
  if (G.box && !G.box.delivered) {
    if (p.carry) return { label: "Drop the black box", go() { p.carry = false; Object.assign(G.box, { x: p.x, y: p.y + 4, carried: false }); } };
    if (dst(G.box.x, G.box.y, p.x, p.y) < 22) return { label: "Pick up the black box", go() { p.carry = true; G.box.carried = true; p.relT = 0; AU.pickup(); } };
  }
  const e = G.ext; if (e.state === "ready" && dst(e.x, e.y, p.x, p.y) < 34) return { label: "Call extraction", go() { e.state = "called"; e.t = 45; e.waveT = 3; say("EXTRACTION INBOUND", "Hold the landing zone"); AU.alarm(); } };
  return null;
}
function interact() { const t = interactTarget(); if (t) t.go(); }

// ---------- projectiles & throwables ----------
function updateShots(dt) {
  for (let i = G.shots.length - 1; i >= 0; i--) { const s = G.shots[i]; s.life -= dt; s.px = s.x; s.py = s.y; let dead = s.life <= 0;
    for (let k = 0; k < 3 && !dead; k++) { s.x += s.vx * dt / 3; s.y += s.vy * dt / 3;
      if (solidAt(s.x, s.y)) { spark(s.x - s.vx * .004, s.y - s.vy * .004, "#e8dcb0"); dead = true; break; }
      for (const b of nearBugs(s.x, s.y, 16, _nb)) if (b.hp > 0 && dst(b.x, b.y, s.x, s.y) < BUGT[b.type].r + 2 && !(s.hit && s.hit.has(b))) {
        if (s.rocket) { dead = true; break; }
        hurtBug(b, s.dmg, s.ox, s.oy, "bullet"); if (s.own) G.stats.hits++;
        if (s.pierce > 0) { s.pierce--; s.hit.add(b); s.dmg *= .8; } else { dead = true; break; } } }
    if (s.rocket) { if (Math.random() < .7) G.parts.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: .4, max: .4, col: "#8a8278", sz: 2, smoke: true }); if (dead) explode(s.x, s.y, 20, 280); }
    if (dead) G.shots.splice(i, 1); }
  for (let i = G.spits.length - 1; i >= 0; i--) { const s = G.spits[i]; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; const p = G.p;
    let dead = s.life <= 0 || solidAt(s.x, s.y);
    if (!dead && p.alive && dst(s.x, s.y, p.x, p.y) < 8) { dead = true; if (p.dive <= 0 && p.inv <= 0) { hurtPlayer(BUGT.spitter.dmg + 6, null); p.slow = 1.6; } }
    if (Math.random() < .5) G.parts.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: .25, max: .25, col: "#a6dc48", sz: 1 });
    if (dead) { for (let k = 0; k < 6; k++) G.parts.push({ x: s.x, y: s.y, vx: frand(-40, 40), vy: frand(-40, 40), life: .3, max: .3, col: "#a6dc48", sz: 1 }); G.map.g.fillStyle = "rgba(140,190,60,.5)"; G.map.g.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 1, 4, 3); G.spits.splice(i, 1); } }
  for (let i = G.throws.length - 1; i >= 0; i--) { const o = G.throws[i];
    if (!o.landed) { o.t += dt; const k = Math.min(1, o.t / o.T), nx = lerp(o.sx, o.tx, k), ny = lerp(o.sy, o.ty, k);
      if (solidAt(nx, ny)) { o.landed = true; } else { o.x = nx; o.y = ny; } o.z = Math.sin(k * Math.PI) * o.h; if (k >= 1) o.landed = true;
      if (o.landed) { o.z = 0; if (o.type === "beacon") { const S = STRATS[o.key]; G.beacons.push({ x: o.x, y: o.y, key: o.key, t: S.delay, T: S.delay, dir: o.dir }); AU.beacon(); G.throws.splice(i, 1); } } }
    else if (o.type === "grenade") { o.fuse -= dt; if (o.fuse <= 0) { explode(o.x, o.y, 44, 420); G.throws.splice(i, 1); } } }
}
function updateStrats(dt) {
  for (const k in G.cd) G.cd[k] = Math.max(0, G.cd[k] - dt);
  for (const k in G.rearm) if (G.rearm[k] > 0) { G.rearm[k] -= dt; if (G.rearm[k] <= 0) { G.uses[k] = STRATS[k].uses + G.lo.eagleBonus; floatText(G.p.x, G.p.y - 16, "EAGLE REARMED", "#ff5340"); } }
  for (let i = G.beacons.length - 1; i >= 0; i--) { const b = G.beacons[i]; b.t -= dt; if (b.t <= 0) { G.beacons.splice(i, 1); fireStrat(b); } }
  for (let i = G.strikes.length - 1; i >= 0; i--) { const s = G.strikes[i]; s.t -= dt; if (s.t <= 0) { G.strikes.splice(i, 1); if (s.beam) G.beams.push({ x: s.x, y: s.y, t: .35, col: "#bfe6ff" }); explode(s.x, s.y, s.r, s.dmg); } }
  for (let i = G.pods.length - 1; i >= 0; i--) { const p = G.pods[i]; p.t += dt; if (p.t >= p.T) { G.pods.splice(i, 1); p.onLand(); } }
  for (let i = G.jets.length - 1; i >= 0; i--) { const j = G.jets[i]; j.t += dt; if (j.t > 1.6) G.jets.splice(i, 1); }
  for (let i = G.beams.length - 1; i >= 0; i--) { G.beams[i].t -= dt; if (G.beams[i].t <= 0) G.beams.splice(i, 1); }
  // sentries
  for (let i = G.sentries.length - 1; i >= 0; i--) { const s = G.sentries[i]; s.life -= dt; s.fireT -= dt; s.scanT -= dt;
    const rk = s.kind === "rocket", range = rk ? 360 : 300;
    if (s.scanT <= 0) { s.scanT = .2; s.target = null; let best = -1e9; for (const b of G.bugs) { const d = dst(b.x, b.y, s.x, s.y); if (d > range || !los(s.x, s.y, b.x, b.y)) continue;
        const score = rk ? b.hp - d : -d; if (score > best) { best = score; s.target = b; } } }
    if (s.target && s.target.hp > 0) { const aim = Math.atan2(s.target.y - s.y, s.target.x - s.x), turn = (rk ? 3 : 7) * dt; s.a += clamp(angDiff(s.a, aim), -turn, turn);
      if (Math.abs(angDiff(s.a, aim)) < .15 && s.fireT <= 0 && s.ammo > 0) { s.fireT = rk ? .9 : .085; s.ammo--; const a = s.a + frand(-.04, .04), v = rk ? 420 : 820, vol = clamp(1 - dst(s.x, s.y, G.p.x, G.p.y) / 500, .15, 1);
        G.shots.push({ x: s.x + Math.cos(s.a) * 9, y: s.y - 3 + Math.sin(s.a) * 9, px: s.x, py: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rk ? 1 : .42, dmg: rk ? 60 : 30, ox: s.x, oy: s.y, rocket: rk });
        if (rk) AU.boom(.25, vol * .6); else AU.sentry(vol); noise(s.x, s.y, 200); } }
    if (s.ammo <= 0 || s.life <= 0) { G.sentries.splice(i, 1); explode(s.x, s.y, 16, 100, { noHoles: true }); } }
}
function fireStrat(b) {
  const { x, y, key } = b;
  if (key === "resupply") { G.pods.push({ x, y, t: 0, T: 1.3, kind: "supply", onLand() { explode(x, y, 20, 500, { noHoles: true, quiet: true }); G.crates.push({ x, y, uses: 2 }); } }); AU.pod(); }
  if (key === "sentry") { G.pods.push({ x, y, t: 0, T: 1.3, kind: "sentry", onLand() { explode(x, y, 20, 500, { noHoles: true, quiet: true }); G.sentries.push({ x, y, a: b.dir, ammo: 240, fireT: .8, scanT: 0, life: 150, target: null }); } }); AU.pod(); }
  if (key === "rocket") { G.pods.push({ x, y, t: 0, T: 1.3, kind: "sentry", onLand() { explode(x, y, 20, 500, { noHoles: true, quiet: true }); G.sentries.push({ x, y, a: b.dir, ammo: 24, fireT: .8, scanT: 0, life: 150, target: null, kind: "rocket" }); } }); AU.pod(); }
  if (key === "cluster") { AU.jet(); G.jets.push({ x, y, a: b.dir, t: 0 }); for (let i = 0; i < 20; i++) { const along = frand(-70, 70), side = frand(-26, 26);
      G.strikes.push({ x: x + Math.cos(b.dir) * along - Math.sin(b.dir) * side, y: y + Math.sin(b.dir) * along + Math.cos(b.dir) * side, t: .35 + (along + 70) / 140 * .5 + frand(0, .1), r: 20, dmg: 260 }); } }
  if (key === "rail") { let t = null; for (const q of G.bugs) if (dst(q.x, q.y, x, y) < 130 && (!t || q.hp > t.hp)) t = q; const tx = t ? t.x : x, ty = t ? t.y : y;
    G.beams.push({ x: tx, y: ty, t: .5, col: "#bfe6ff", thin: true }); if (t) hurtBug(t, 4000, tx, ty, "boom"); explode(tx, ty, 26, 600); }
  if (key === "eagle") { AU.jet(); G.jets.push({ x, y, a: b.dir, t: 0 }); for (let i = -2; i <= 2; i++) G.strikes.push({ x: x + Math.cos(b.dir) * i * 24 + frand(-4, 4), y: y + Math.sin(b.dir) * i * 24 + frand(-4, 4), t: .35 + (i + 2) * .07, r: 34, dmg: 650 }); }
  if (key === "precision") { G.beams.push({ x, y, t: .6, col: "#55b6ff", thin: true }); G.strikes.push({ x, y, t: .5, r: 58, dmg: 2600, beam: true }); }
  if (key === "barrage") for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * 105; G.strikes.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, t: .4 + i * .7 + frand(0, .3), r: 40, dmg: 900, warn: true }); }
}
function explode(x, y, r, dmg, o = {}) {
  const p = G.p, dP = dst(x, y, p.x, p.y);
  G.booms.push({ x, y, r, t: 0 }); G.shake = Math.max(G.shake, clamp(r / 6 * (1 - dP / 600), 0, 9));
  if (!o.quiet || dP < 400) AU.boom(r / 40, clamp(1 - dP / 700, .12, 1));
  for (let i = 0; i < r * .8; i++) { const a = Math.random() * 6.283, s = frand(20, r * 4); G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: frand(.2, .5), max: .5, col: pick(["#ffd04a", "#ff8a2a", "#fff4b0"]), sz: 2 }); }
  for (let i = 0; i < r * .3; i++) { const a = Math.random() * 6.283, s = frand(4, r * .6); G.parts.push({ x: x + Math.cos(a) * r * .25, y: y + Math.sin(a) * r * .25, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 12, life: frand(.6, 1.3), max: 1.3, col: pick(["#3a3430", "#5a524a", "#2a2624"]), sz: randi(3, 5), smoke: true }); }
  decalScorch(x, y, r);
  for (const b of G.bugs) { const d = dst(b.x, b.y, x, y); if (d < r + BUGT[b.type].r && los(x, y, b.x, b.y)) hurtBug(b, dmg * (1 - .55 * Math.min(1, d / r)), x, y, "boom"); }
  if (!o.safe && p.alive && dP < r) hurtPlayer(dmg * .17 * (1 - .5 * dP / r), null);
  if (!o.noHoles) for (const n of G.nests) for (const h of n.holes) if (h.alive && dst(h.x, h.y, x, y) < r * .75 + 8) destroyHole(n, h);
  for (const s of G.sentries) if (!o.safe && dst(s.x, s.y, x, y) < r * .6 && dmg > 300) s.life = Math.min(s.life, 0);
  noise(x, y, 420);
}
function destroyHole(n, h) {
  h.alive = false; floatText(h.x, h.y - 10, "HOLE DESTROYED", "#f2d230");
  for (let i = 0; i < 20; i++) G.parts.push({ x: h.x, y: h.y, vx: frand(-60, 60), vy: frand(-90, -10), life: frand(.4, .9), max: .9, col: pick(["#6a4a2a", "#8a6a3a", "#3a2a1a"]), sz: 2, grav: 200 });
  if (n.holes.every(q => !q.alive)) { n.cleared = true; G.stats.nests++;
    if (n.main) { objectiveDone(); } else say("BUG NEST DESTROYED", "+40 requisition"); }
}
function updateNests(dt) {
  const p = G.p, cap = activeCap();
  for (const n of G.nests) { if (n.cleared || !p.alive) continue; const d = dst(n.x, n.y, p.x, p.y); n.spT -= dt;
    if (d < 340 && n.spT <= 0 && G.active < cap && G.bugs.length < 170 && G.bugs.filter(b => b.nest === n).length < (n.main ? 10 : 5) + G.m.diff) { n.spT = (n.main ? 3.2 : 6) - G.m.diff * .3; const h = pick(n.holes.filter(q => q.alive));
      const b = spawnBug(bugMix(), h.x, h.y, d < 230 ? "hunt" : "idle"); b.home = { x: n.x, y: n.y }; b.nest = n; dust(h.x, h.y, 5); } }
  for (let i = G.breaches.length - 1; i >= 0; i--) { const br = G.breaches[i]; br.t -= dt;
    if (Math.random() < .6) dust(br.x + frand(-16, 16), br.y + frand(-16, 16), 1);
    if (br.t <= 0) { br.spT -= dt; if (br.spT <= 0) { br.spT = .2; const s = findSpot(br.x, br.y, 0, 18, 6) || br; spawnBug(bugMix(), s.x, s.y, "hunt"); br.n--; dust(s.x, s.y, 4); } }
    if (br.n <= 0) { G.breaches.splice(i, 1); decalScorch(br.x, br.y, 18, "#3a2a1a"); } }
}

// ---------- the director: patrols, breaches, planet hazards, timer ----------
function updateDirector(dt) {
  const p = G.p, m = G.m, cap = activeCap();
  G.timeLeft -= dt; G.breachCool -= dt;
  if (G.timeLeft <= 0 && !G.destroyerGone) { G.destroyerGone = true; G.armed = null; say("DESTROYER HAS LEFT ORBIT", "Stratagems unavailable. Extract now."); }
  G.patrolT -= dt;
  if (G.patrolT <= 0 && p.alive) { G.patrolT = Math.max(22, 55 - m.diff * 5) * frand(.8, 1.2);
    if (G.active < cap * .6 && G.bugs.length < 170) { const s = findSpot(p.x, p.y, 380, 560, 9, true); if (s) { let n = randi(2, 4) + Math.floor(m.diff / 2); if (hasMod(m, "swarm")) n = Math.round(n * 1.5);
        for (let i = 0; i < n; i++) { const q = findSpot(s.x, s.y, 0, 28, 6); if (q) spawnBug(bugMix(), q.x, q.y, "patrol"); } } } }
  if (hasMod(m, "ion")) { if (G.ion > 0) { G.ion -= dt; if (G.ion <= 0) { G.ionT = frand(60, 95); say("ION STORM PASSED", "Stratagems back online"); } }
    else { G.ionT -= dt; if (G.ionT <= 0) { G.ion = 20; G.armed = null; G.input = ""; say("ION STORM", "Stratagems offline"); AU.alarm(); } } }
  if (hasMod(m, "meteor") && p.alive) { G.metT -= dt; if (G.metT <= 0) { G.metT = frand(6, 12); const s = findSpot(p.x, p.y, 30, 260, 4); if (s) G.strikes.push({ x: s.x, y: s.y, t: 2.4, r: 44, dmg: 900, warn: true, meteor: true }); } }
  // objective events
  const t = G.term;
  if (t && t.state === "upload") {
    const contested = G.bugs.filter(b => dst(b.x, b.y, t.x, t.y) < 50).length >= 3;
    t.contested = contested; if (!contested) t.prog += dt / 60;
    t.waveT -= dt; if (t.waveT <= 0) { t.waveT = Math.max(9, 16 - m.diff); const s = findSpot(t.x, t.y, 120, 190, 10); if (s) startBreach(s.x, s.y, 4 + m.diff); }
    if (t.prog >= 1) { t.state = "done"; objectiveDone(); }
  }
  if (G.box && !G.box.delivered) { if (G.box.carried) { G.box.x = p.x; G.box.y = p.y; }
    if (dst(G.box.x, G.box.y, G.ext.x, G.ext.y) < 50 && G.box.carried) { G.box.delivered = true; G.box.carried = false; p.carry = false; G.box.x = G.ext.x + 26; G.box.y = G.ext.y - 18; objectiveDone(); } }
  // extraction
  const e = G.ext;
  if (e.state === "called") { e.t -= dt; e.waveT -= dt;
    if (e.waveT <= 0) { e.waveT = Math.max(8, 14 - m.diff); const s = findSpot(e.x, e.y, 110, 180, 10); if (s) startBreach(s.x, s.y, 4 + m.diff); }
    if (e.t <= 0) { e.state = "landing"; e.t = 5; AU.ship(); } }
  else if (e.state === "landing") { e.t -= dt; if (e.t <= 0) { e.state = "landed"; say("BOARD THE DROPSHIP", "Stand in the landing zone"); } }
  else if (e.state === "landed") {
    if (p.alive && dst(p.x, p.y, e.x, e.y) < 40) { e.board += dt; if (e.board >= 3) { e.state = "gone"; p.alive = false; p.extracted = true; AU.ship(); say("EXTRACTED", "Mission complete"); G.over = { pending: true }; setTimeout(() => endMission(true), 2600); } }
    else e.board = 0;
  }
}
function objectiveDone() { if (G.objDone) return; G.objDone = true; G.ext.state = "ready"; say("PRIMARY OBJECTIVE COMPLETE", "Extraction is available"); AU.armed(); }

// ---------- effects & decals ----------
function spark(x, y, col) { for (let i = 0; i < 3; i++) G.parts.push({ x, y, vx: frand(-70, 70), vy: frand(-70, 70), life: .12, max: .12, col, sz: 1 }); }
function dust(x, y, n) { const c = G.map.B.g[2]; for (let i = 0; i < n; i++) G.parts.push({ x: x + frand(-4, 4), y: y + frand(-4, 4), vx: frand(-20, 20), vy: frand(-26, -4), life: frand(.4, .8), max: .8, col: `rgb(${c[0] * .8 | 0},${c[1] * .8 | 0},${c[2] * .8 | 0})`, sz: 2, smoke: true }); }
function floatText(x, y, txt, col) { G.texts.push({ x, y, txt, col, t: 1.4 }); }
function say(big, small = "") { G.msg = { big, small, t: 4 }; }
function decalScorch(x, y, r, col = "#1e1a16") { const g = G.map.g; g.fillStyle = col;
  for (let i = 0; i < r * 3; i++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * r * .8; g.globalAlpha = .25 + Math.random() * .3; g.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 2, 2); }
  g.globalAlpha = 1; }
function decalCorpse(b) { const g = G.map.g, spr = SPR.bugDead[b.type]; g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(b.a); g.drawImage(spr, -spr.width / 2, -spr.height / 2); g.restore();
  g.fillStyle = "#c8902a"; for (let i = 0; i < 8 + BUGT[b.type].r; i++) { g.globalAlpha = .5; g.fillRect(Math.round(b.x + frand(-1, 1) * BUGT[b.type].r * 1.6), Math.round(b.y + frand(-1, 1) * BUGT[b.type].r * 1.6), 1 + (Math.random() < .3), 1); } g.globalAlpha = 1; }
function paintStatics() {   // things that never move get painted into the ground once
  const g = G.map.g, e = G.ext; g.save();
  g.fillStyle = "rgba(20,20,20,.55)"; g.beginPath(); g.arc(e.x, e.y, 34, 0, 7); g.fill();
  g.fillStyle = "#3a3a36"; g.beginPath(); g.arc(e.x, e.y, 30, 0, 7); g.fill();
  g.strokeStyle = "#f2d230"; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.arc(e.x, e.y, 26, 0, 7); g.stroke(); g.setLineDash([]);
  g.fillStyle = "#f2d230"; g.font = "bold 9px monospace"; g.textAlign = "center"; g.fillText("LZ", e.x, e.y + 3);
  if (G.wreck) { const w = G.wreck; g.fillStyle = "rgba(10,8,6,.45)"; for (let i = 0; i < 60; i++) g.fillRect(Math.round(w.x + frand(-40, 40)), Math.round(w.y + frand(-12, 22)), 3, 2); }
  g.restore();
}

// ---------- main update ----------
function update(dt) {
  if (G.over && !G.over.pending) return;
  G.t += dt; G.inputFail -= dt; if (G.code) G.code.fail -= dt; if (G.msg) G.msg.t -= dt;
  updatePlayer(dt);
  if (G.t >= G.fieldT) { buildField(); G.fieldT = G.t + .3; }
  G.active = 0; for (const b of G.bugs) if (b.state !== "idle") G.active++;
  rebuildGrid(); updateBugs(dt);
  G.bugs = G.bugs.filter(b => b.hp > 0);
  rebuildGrid(); updateShots(dt); G.bugs = G.bugs.filter(b => b.hp > 0);
  updateStrats(dt); G.bugs = G.bugs.filter(b => b.hp > 0);
  updateNests(dt); updateDirector(dt);
  for (let i = G.parts.length - 1; i >= 0; i--) { const q = G.parts[i]; q.life -= dt; if (q.life <= 0) { G.parts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; if (q.grav) q.vy += q.grav * dt; const f = q.smoke ? .96 : .9; q.vx *= f; q.vy *= f; }
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  for (let i = G.booms.length - 1; i >= 0; i--) { G.booms[i].t += dt; if (G.booms[i].t > .35) G.booms.splice(i, 1); }
  for (let i = G.texts.length - 1; i >= 0; i--) { G.texts[i].t -= dt; G.texts[i].y -= dt * 14; if (G.texts[i].t <= 0) G.texts.splice(i, 1); }
  G.shake = Math.max(0, G.shake - dt * 14);
}
function endMission(win) {
  const s = G.stats, m = G.m, sv = loadSave(), samples = win ? G.p.samples : 0, nests = G.nests.filter(n => n.cleared && !n.main).length;
  const req = win ? m.reward + nests * 40 + samples * 5 : Math.floor(nests * 20);
  sv.req += req; sv.totalReq += req; sv.samples += samples; sv.kills += s.kills; sv.deaths += s.deaths; if (win) sv.extracted++; sv.missions++; if (win && m.sys != null && sv.gal.slots[m.sys]) sv.gal.slots[m.sys][m.slot]++; if (win) { sv.wins++; sv.best = Math.max(sv.best, Math.min(6, m.diff + 1)); } writeSave(sv);
  G.over = { win, req, samples, nests, time: 20 * 60 - G.timeLeft };
  showEnd();
}
