// =====================================================================================
//  THE CANOPY STALKER: a gigantic 3D spider that rests on top of the forest roof.
//  Its legs span ~40 m and its feet stand on the treetops; most of its body is hidden in the
//  canopy, so people who never look up never see it. Walk anywhere under its body and it reaches
//  down, grabs you and hauls you up toward its fangs: mash A/D to break free.
// =====================================================================================
const GIANTS_ON = false;   // the Canopy Stalker is parked for now: flip to true to bring it (and its forest clearings) back
const GIANT = { R: 16, HP: 3600, LIFT: 9, BODY_UP: 22, S: 1.4 };   // grab radius, health, how high it hauls you, body height, model scale
let GIANT_MODEL = null;
function giantTextures() {
  if (TXD.fSpider) return;
  TXD.fSpider = tex(32, 32, (x, y) => { const h = hash2(x >> 1, y >> 1, 91), ring = (y + (x >> 2)) % 9 === 0; return ring ? [62, 30, 20] : [36 + h * 16, 26 + h * 10, 22 + h * 8]; });
  TXD.fSpiderB = tex(32, 32, (x, y) => { const cx = Math.abs(x - 16), mark = (cx < 3 && y % 8 < 5) || (Math.abs(cx - 8 + y * .1) < 1.2 && y > 6), h = hash2(x >> 1, y >> 1, 92);
    return mark ? [140, 40, 22] : [30 + h * 18, 22 + h * 10, 20 + h * 8]; });
  TXD.fSpiderLeg = tex(16, 32, (x, y) => { const band = y % 12 < 2, h = hash2(x, y >> 2, 93); return band ? [96, 52, 30] : [30 + h * 14, 22 + h * 8, 18 + h * 6]; });
  for (const k of ["fSpider", "fSpiderB", "fSpiderLeg"]) R3.tex[k] = glTex(TXD[k]);
}
// body (local +x is forward), and one tapered unit segment (y 0..1) reused for every leg piece
function buildGiantModel() {
  if (GIANT_MODEL) return GIANT_MODEL; giantTextures();
  const body = buildParts(() => {
    blob(-8, 4, 0, 8.5, 6, 7, "fSpiderB", [1, 1, 1], 11);   // abdomen, resting up on the treetops
    blob(-15.8, 4.8, 0, 1.4, 1.2, 1.2, "fSpider", [.8, .8, .8], 12);   // spinnerets
    blob(2.6, 0, 0, 5.6, 2.9, 4.6, "fSpider", [1, 1, 1], 13);   // cephalothorax
    blob(8, -.4, 0, 2.8, 2.2, 3.1, "fSpider", [.9, .9, .9], 14);   // head
    for (const [ey, ez, s] of [[.9, -1.1, .55], [.9, 1.1, .55], [1.4, -.45, .4], [1.4, .45, .4], [.2, -1.7, .35], [.2, 1.7, .35], [1.7, -1.5, .3], [1.7, 1.5, .3]])
      box(10.5 - s * .3, ey - s / 2, ez - s / 2, 10.6 + s * .6, ey + s / 2, ez + s / 2, "glowRed");
    for (const s of [-1, 1]) { tube([10, -1.6, s * 1.1], [11.4, -3.6, s * .9], .5, 6, "fSpiderLeg"); tube([11.4, -3.6, s * .9], [11, -5.4, s * .5], .3, 5, "dark");   // fangs
      tube([9.5, -1, s * 2.2], [12.5, -2.5, s * 2.8], .35, 5, "fSpiderLeg"); tube([12.5, -2.5, s * 2.8], [13, -4.2, s * 2.4], .28, 5, "fSpiderLeg"); }   // pedipalps
  });
  const seg = buildParts(() => cyl(0, 0, 0, 1, 1, 7, "fSpiderLeg", { r1: .62, tile: 1 }));
  return (GIANT_MODEL = { body, seg });
}
// a matrix that stretches the unit segment from a to b with radius r
function segMatrix(a, b, r) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...d) || 1e-3, y = d.map(v => v / len), up = Math.abs(y[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
  let x = [up[1] * y[2] - up[2] * y[1], up[2] * y[0] - up[0] * y[2], up[0] * y[1] - up[1] * y[0]]; const xl = Math.hypot(...x); x = x.map(v => v / xl);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return new Float32Array([x[0] * r, x[1] * r, x[2] * r, 0, y[0] * len, y[1] * len, y[2] * len, 0, z[0] * r, z[1] * r, z[2] * r, 0, a[0], a[1], a[2], 1]);
}
// ---------- placement: deep forest, far from the landing zone, the extraction pad and each other ----------
function placeGiants(m) {
  F.giants = []; if (!GIANTS_ON) return; const R = seeded(m.seed + 58);
  for (const [x, z, yaw] of FLD.giantSpots || []) {
    const gy = fieldH(x, z), g = { x, z, yaw, gy, y: gy + GIANT.BODY_UP, hp: GIANT.HP, state: "idle", t: 0, cd: 0, flash: 0, feet: [], reach: 0 };
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const la = yaw + s * (.42 + i * .62), rr = 26 + R() * 5, fx = x + Math.cos(la) * rr, fz = z + Math.sin(la) * rr;
      g.feet.push({ i, s, x: fx, z: fz, y: fieldH(fx, fz) + 14.5 + R() * 2, y0: 0 }); }
    for (const f of g.feet) f.y0 = f.y; F.giants.push(g);
  }
}
const giantM = g => mChain(mT(g.x, g.y, g.z), mRy(-g.yaw), mRz(g.lean || 0), mS(GIANT.S));
function giantHead(g) { return xf(giantM(g), [10.8, -3.8, 0]); }
// ---------- behaviour ----------
function updateGiants(dt) {
  if (!F.giants) return; const p = F.p;
  for (const g of F.giants) {
    g.t += dt; g.flash -= dt; g.cd -= dt; const dh = Math.hypot(p.x - g.x, p.z - g.z);
    if (g.state === "dead") continue;
    if (g.state === "dying") { g.k = Math.min(1, (g.k || 0) + dt * .55); const k = g.k * g.k; g.y = lerp(g.gy + GIANT.BODY_UP, g.gy + 5.5, k); g.lean = -k * .25;
      for (const f of g.feet) f.y = lerp(f.y0, fieldH(f.x, f.z) + .5, Math.min(1, g.k * 1.3));
      if (g.k >= 1) { g.state = "dead"; AU.boom(2.4, volAt(g.x, g.z)); F.shake = Math.max(F.shake, .2 * volAt(g.x, g.z));
        for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, s = frand(3, 12); addPart(g.x + Math.cos(a) * 6, g.gy + .5, g.z + Math.sin(a) * 6, Math.cos(a) * s, frand(1, 5), Math.sin(a) * s, frand(1, 2.4), F.P.g.map(v => v / 255 * .7), 1.4, -2, true); } }
      continue; }
    // breathing and a slow, heavy sway
    g.y = g.gy + GIANT.BODY_UP + Math.sin(g.t * .6) * .25; g.lean = Math.sin(g.t * .37) * .02;
    if (p.alive && dh < 40 && Math.random() < dt * .3) AU.skitter(.5 * (1 - dh / 40));
    if (g.state === "idle") { g.reach = Math.max(0, g.reach - dt * 2);
      if (p.alive && !F.grab && !DROP && g.cd <= 0 && dh < GIANT.R && p.y < g.gy + 6) { g.state = "reach"; g.t0 = g.t; AU.bug("stalker", "attack", 1.2); AU.roar(1.2, .8); F.shake = Math.max(F.shake, .05); } }
    else if (g.state === "reach") { g.reach = Math.min(1, (g.t - g.t0) / .55); g.tx = p.x; g.tz = p.z; g.ty = p.y + 1.2;
      if (g.reach >= 1) { if (p.alive && !F.grab && Math.hypot(p.x - g.x, p.z - g.z) < GIANT.R + 3 && !(p.dive > .25)) { g.state = "grab"; F.grab = { g, prog: .2, last: "", acc: 0, t: 0, y0: p.y };
          AU.boom(.7, 1); F.shake = .14; fmsg("", "GRABBED! Mash A and D to break free", 2.5); if (p.carry) { p.carry = false; Object.assign(F.box, { x: p.x, z: p.z, carried: false }); } }
        else { g.state = "idle"; g.cd = 2.5; } } }
    else if (g.state === "grab") { if (!F.grab || F.grab.g !== g) { g.state = "idle"; g.cd = 10; } }
  }
}
// the struggle: alternate A and D to fill the bar before it drains you or pulls you up to its fangs
function struggle3(dt) {
  const G = F.grab, p = F.p, g = G.g; G.t += dt;
  for (const k of pressed) if ((k === "a" || k === "d" || k === "arrowleft" || k === "arrowright") && k[0] !== G.last) { G.prog += .055; G.last = k[0]; F.shake = Math.max(F.shake, .04); AU.step(); }
  G.prog = Math.max(0, G.prog - (.2 + F.m.diff * .03) * dt);
  p.y = G.y0 + Math.min(GIANT.LIFT, G.t * 1.1); p.vy = 0;
  const h = giantHead(g), dx = h[0] - p.x, dz = h[2] - p.z, want = Math.atan2(h[1] - p.y - EYE3, Math.hypot(dx, dz));
  p.yaw += angDiff(p.yaw, Math.atan2(dz, dx)) * Math.min(1, dt * 3) + Math.sin(G.t * 7) * dt * .3; p.pitch += (want - p.pitch) * Math.min(1, dt * 3);
  G.acc += dt; if (G.acc > .5) { G.acc = 0; hurt3(7, { x: g.x, z: g.z }); }
  if (!p.alive) { F.grab = null; g.state = "idle"; g.cd = 6; return; }
  if (G.prog >= 1) { F.grab = null; g.state = "idle"; g.cd = 10; hurtGiant(g, 250);
    p.vy = 1; p.inv = 1.5; p.pitch = .1; F.shake = .15; AU.boom(.8, 1); fmsg("BROKE FREE", "Get out from under it", 2.5); }
}
function hurtGiant(g, dmg) {
  if (g.state === "dying" || g.state === "dead") return; g.hp -= dmg; g.flash = .08;
  const hm = $("f-hit"); hm.classList.remove("go"); void hm.offsetWidth; hm.classList.add("go");
  if (g.state === "idle" && g.cd <= 0 && Math.random() < .02) AU.bug("stalker", "alert", 1);
  if (g.hp <= 0) { g.state = "dying"; g.k = 0; if (F.grab && F.grab.g === g) { F.grab = null; F.p.vy = 0; } F.stats.kills++; AU.bug("stalker", "death", 1.2); AU.roar(3, 1.2); showTitle3("STALKER KILLED", "The canopy goes quiet"); }
}
// bullets: two big spheres (head end and abdomen)
function giantRayHit(o, d, tEnd) {
  let best = null;
  for (const g of F.giants || []) { if (g.state === "dying" || g.state === "dead") continue; const M = giantM(g);
    for (const [lp, r0] of [[[3, 0, 0], 6], [[-8, 4, 0], 7.5], [[8, -.4, 0], 3.2]]) { const r = r0 * GIANT.S; const c = xf(M, lp), oc = [o[0] - c[0], o[1] - c[1], o[2] - c[2]], bb = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2], cc = oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - r * r, disc = bb * bb - cc;
      if (disc < 0) continue; const t = -bb - Math.sqrt(disc); if (t > 0 && t < tEnd && (!best || t < best.t)) best = { t, g }; } }
  return best;
}
function giantBlast(x, y, z, r, dmg) { for (const g of F.giants || []) { const d = Math.hypot(x - g.x, y - g.y, z - g.z); if (d < r + 11) hurtGiant(g, dmg * .6 * (1 - .5 * Math.min(1, d / (r + 11)))); } }
// ---------- drawing ----------
function drawGiants(eye, cam, vis, sil) {
  if (!F.giants || !F.giants.length) return; const gl = R3.gl, L = R3.loc, Mdl = buildGiantModel();
  for (const g of F.giants) { if (Math.hypot(g.x - eye[0], g.z - eye[2]) > vis + 30) continue; const M = giantM(g), br = 1 + Math.sin(g.t * .6) * .03;
    if (g.flash > 0) gl.uniform3f(L.uAmb, 1.6, 1.4, 1.3);
    drawParts(Mdl.body, mChain(M, mT(-8, 4, 0), mS(br), mT(8, -4, 0)));
    for (const f of g.feet) { const hip = xf(M, [5 - f.i * 2.6, -.4, f.s * 3.9]), foot = [f.x, f.y, f.z], mid = [(hip[0] + foot[0]) / 2, (hip[1] + foot[1]) / 2, (hip[2] + foot[2]) / 2];
      const out = [foot[0] - hip[0], 0, foot[2] - hip[2]], ol = Math.hypot(out[0], out[2]) || 1, knee = [mid[0] + out[0] / ol * 2, mid[1] + (g.state === "dying" ? 12 * (1 - (g.k || 0) * .6) : 12 + f.i * .8), mid[2] + out[2] / ol * 2];
      const claw = [foot[0] + out[0] / ol * 1.2, foot[1] - 4.5, foot[2] + out[2] / ol * 1.2];
      drawParts(Mdl.seg, segMatrix(hip, knee, 1.45)); drawParts(Mdl.seg, segMatrix(knee, foot, 1)); drawParts(Mdl.seg, segMatrix(foot, claw, .6)); }
    // the grabbing foreleg reaches down to you
    if (g.state === "reach" || g.state === "grab") { const h = giantHead(g), p = F.p, tgt = g.state === "grab" ? [p.x + Math.cos(p.yaw) * .5, p.y + .9, p.z + Math.sin(p.yaw) * .5] : [g.tx, g.ty, g.tz], k = g.state === "grab" ? 1 : g.reach;
      const end = [lerp(h[0], tgt[0], k), lerp(h[1], tgt[1], k), lerp(h[2], tgt[2], k)], elbow = [(h[0] + end[0]) / 2 + Math.cos(g.yaw) * 3, (h[1] + end[1]) / 2 + 2, (h[2] + end[2]) / 2 + Math.sin(g.yaw) * 3];
      drawParts(Mdl.seg, segMatrix(xf(M, [9, -1, 2.5]), elbow, .95)); drawParts(Mdl.seg, segMatrix(elbow, end, .6)); }
    if (g.flash > 0) gl.uniform3fv(L.uAmb, F.P.amb.map(v => v * .85));
  }
}
