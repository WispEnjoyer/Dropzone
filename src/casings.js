// =====================================================================================
//  SPENT CASINGS: real brass that flies out to the right, bounces and stays on the floor (the newest 20 are kept).
//  The ping you hear is the casing actually landing, so it comes from where it lands.
// =====================================================================================
const CAS = { list: [], mode: null, max: 20, eye: [0, 0, 0], yaw: 0 };
AU.physCas = true;
const CAS_KIND = { shotgun: { len: .075, w: .017, col: [.62, .1, .08], col2: [.9, .7, .3], delay: .45 }, marksman: { len: .07, w: .012, delay: .32 } };
// the ejection port: half a metre ahead, out to the right behind the gun sprite, a little below the sight line (in camera space)
function casingPort(eye, yaw, pitch) { const cp = Math.cos(pitch), sp = Math.sin(pitch), f = [cp * Math.cos(yaw), sp, cp * Math.sin(yaw)], r = [-Math.sin(yaw), 0, Math.cos(yaw)], u = [-sp * Math.cos(yaw), cp, -sp * Math.sin(yaw)];
  return [0, 1, 2].map(i => eye[i] + f[i] * .5 + r[i] * .34 - u[i] * .1); }
function casingGround(x, z) { return CAS.mode === "field" ? fieldH(x, z) + .05 : 0; }
function casingEject(mode, eye, yaw, pitch, key) {
  if (key === "revolver") return; if (CAS.mode !== mode) { CAS.list = []; CAS.mode = mode; }
  const K = CAS_KIND[key] || {}, f = [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)], r = [-Math.sin(yaw), 0, Math.cos(yaw)], sp = frand(1.7, 2.5), up = frand(1.3, 2.1), fw = frand(-.4, .2);
  CAS.list.push({ p: casingPort(eye, yaw, pitch), v: [r[0] * sp + f[0] * fw, up, r[2] * sp + f[2] * fw],
    a: yaw + frand(-.5, .5), w: frand(14, 24) * (Math.random() < .5 ? -1 : 1), tilt: 0, rest: false, wait: K.delay || 0, key, len: K.len || .055, wd: K.w || .011, col: K.col || [.86, .64, .26], col2: K.col2 || K.col || [.95, .76, .36], bounces: 0 });
  CAS.eye = eye.slice(); CAS.yaw = yaw; CAS.pitch = pitch;
  while (CAS.list.length > CAS.max) CAS.list.shift();
}
function casingPing(c, v) { if (!AU.ctx) return; const dx = c.p[0] - CAS.eye[0], dz = c.p[2] - CAS.eye[2], dist = Math.hypot(dx, dz), g = v / (1 + dist * .6); if (g < .02) return;
  const pan = clamp((dx * -Math.sin(CAS.yaw) + dz * Math.cos(CAS.yaw)) / Math.max(.5, dist), -1, 1) * .7, soft = CAS.mode === "field" && ["grass", "leaves", "sand", "snow"].includes(AU._surf);
  if (soft) { AU._noise(.025, { f: 900, type: "bandpass", q: 2, g: .03 * g, pan }); return; }
  if (c.key === "shotgun") { AU._noise(.05, { f: 650, type: "bandpass", q: 2.2, g: .07 * g, pan }); AU._tone(R2(900, 1200), .04, { type: "sine", g: .015 * g, pan }); return; }
  AU._tone(R2(3600, 5400), .06 + v * .05, { type: "sine", g: .03 * g, pan }); AU._tone(R2(6800, 8200), .03, { type: "sine", g: .012 * g, pan }); AU._noise(.012, { f: 5000, type: "highpass", g: .02 * g, pan }); }
const R2 = (a, b) => a + Math.random() * (b - a);
function casingUpdate(dt, mode) { if (CAS.mode !== mode) return; const n = Math.min(12, Math.ceil(dt / .008)); for (let k = 0; k < n; k++) casingStep(dt / n, mode); }
function casingStep(dt, mode) {
  for (const c of CAS.list) { if (c.rest) continue; if (c.wait > 0) { c.wait -= dt; if (c.wait <= 0) { c.p = casingPort(CAS.eye, CAS.yaw, CAS.pitch); } else continue; }
    c.v[1] -= 9.8 * dt; const px = c.p[0], pz = c.p[2]; for (let i = 0; i < 3; i++) c.p[i] += c.v[i] * dt;
    if (mode === "ship" && typeof COLL !== "undefined") for (const K of COLL) if (c.p[0] > K[0] && c.p[0] < K[2] && c.p[2] > K[1] && c.p[2] < K[3]) {   // booth walls, bench, crates
      if (px <= K[0] || px >= K[2]) { c.p[0] = px; c.v[0] *= -.35; } else { c.p[2] = pz; c.v[2] *= -.35; } if (Math.abs(c.v[0]) + Math.abs(c.v[2]) > 1) casingPing(c, .35); } c.a += c.w * dt; c.tilt += c.w * dt * .7;
    if (mode === "ship") { if (c.p[2] < 9.05 || c.p[2] > 12.95) { c.p[2] = clamp(c.p[2], 9.05, 12.95); c.v[2] *= -.4; } if (c.p[0] < 13.95) { c.p[0] = 13.95; c.v[0] *= -.4; } }
    const g = casingGround(c.p[0], c.p[2]) + c.wd * .5;
    if (c.p[1] <= g) { c.p[1] = g; const imp = -c.v[1];
      if (imp > .9 && c.bounces < 4) { casingPing(c, Math.min(1, imp / 4) * (c.bounces ? .6 : 1)); c.bounces++; c.v[1] = imp * .38; c.v[0] *= .5; c.v[2] *= .5; c.w *= .55; }
      else { if (!c.bounces) casingPing(c, .5); c.rest = true; c.v = [0, 0, 0]; c.tilt = 0; } } } }
function casingDraw(eye, mode) { if (CAS.mode !== mode || !CAS.list.length) return; const m = new MB(), L = R3.loc, gl = R3.gl;
  for (const c of CAS.list) { if (c.wait > 0) continue; const ct = Math.cos(c.tilt), d = [Math.cos(c.a) * ct * c.len * .5, Math.sin(c.tilt) * c.len * .5, Math.sin(c.a) * ct * c.len * .5];
    const shade = c.rest ? .78 : .9; lineQ(m, [c.p[0] - d[0], c.p[1] - d[1], c.p[2] - d[2]], [c.p[0] + d[0], c.p[1] + d[1], c.p[2] + d[2]], c.wd, eye, c.col.map(v => v * shade), c.col2.map(v => v * shade)); }
  drawMB(m, "white", 1); }
