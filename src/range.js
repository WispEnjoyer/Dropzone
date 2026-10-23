// =====================================================================================
//  FIRING RANGE: an east wing off the main deck. Walk in and your loadout's gun comes out;
//  white mannequins in each armour set stand downrange, fold over when killed and spring back a few seconds later.
// =====================================================================================
const RANGE = { line: 17.1, z0: 9, z1: 13, x1: 31, targets: [], holes: [], sparks: [], up: 0, slot: 0, slots: null,
  fireT: 0, relT: 0, relMax: 1, swapT: 0, recoil: 0, muzT: 0, shots: 0, hits: 0, kills: 0 };
const RANGE_TARGETS = [
  { x: 21, z: 9.75, type: "light", s: .96 }, { x: 21.5, z: 12.25, type: "medium", s: 1 }, { x: 24.5, z: 11, type: "heavy", s: 1 },
  { x: 27, z: 11, type: "medium", s: .9, move: 1.1 }, { x: 30, z: 11, type: "superheavy", s: 1.04 } ];
// the armory's mannequins (your art: armL / armM / armH), front frame. Only the cloth is recoloured, to white:
// the cloth is whatever differs between the three armory recolours, so plates, straps and stripes stay as drawn.
const DUMMY_SRC = { light: ["armL", 1], medium: ["armM", 1], heavy: ["armH", 1], superheavy: ["armH", 1.1] };
function rangeDummy(k) { const key = "dummy_" + k; if (R3.tex[key]) return key;
  const S = SP[(DUMMY_SRC[k] || DUMMY_SRC.medium)[0] + "0"], VL = SP.armL0, VM = SP.armM0, VH = SP.armH0; if (!S || !VL || !VM || !VH) return null;
  const cloth = i => { for (let c = 0; c < 3; c++) if (VL.d[i + c] !== VM.d[i + c] || VH.d[i + c] !== VM.d[i + c]) return true; return false; };
  const lum = i => (S.d[i] * .3 + S.d[i + 1] * .59 + S.d[i + 2] * .11) / 255;
  let x0 = S.w, x1 = -1, y0 = S.h, y1 = -1, lo = 1, hi = 0;
  for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const i = (y * S.w + x) * 4; if (!S.d[i + 3]) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); if (cloth(i)) { const l = lum(i); lo = Math.min(lo, l); hi = Math.max(hi, l); } }
  if (x1 < 0) return null; const w = x1 - x0 + 1, h = y1 - y0 + 1, d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y + y0) * S.w + x + x0) * 4, o = (y * w + x) * 4; if (!S.d[i + 3]) continue; d[o + 3] = 255;
    if (!cloth(i)) { d[o] = S.d[i]; d[o + 1] = S.d[i + 1]; d[o + 2] = S.d[i + 2]; continue; }
    const t = (lum(i) - lo) / Math.max(.01, hi - lo), v = 178 + 74 * Math.pow(t, .7);   // off-white cloth, keeping the folds' shading
    d[o] = v; d[o + 1] = v * .985; d[o + 2] = v * .95; }
  SP[key] = { w, h, d }; R3.tex[key] = glTex(SP[key]); return key; }
function buildRange() {
  // doorway from the main deck: a framed opening with a hazard lintel
  box(13, 0, 10, 14, 2.96, 10.18, "rib", { tile: 1 }); box(13, 0, 11.82, 14, 2.96, 12, "rib", { tile: 1 });
  box(13, 2.48, 10.18, 14, 2.96, 11.82, "dark", { e: "haz", w: "haz", bottom: "dark", tile: 2 });
  // the firing line: a bench across the room, split into three booths
  box(17.1, 0, 9.02, 17.55, .96, 12.98, "counter", { tile: 1 }); box(17.02, .96, 9, 17.66, 1.04, 13, "metal", { tile: 1 });
  box(17.08, .76, 9.02, 17.1, .82, 12.98, "haz", { tile: 2 }); COLL.push([17.02, 9, 17.66, 13]); shadowRect(17.1, 9.02, 17.55, 12.98);
  for (const z of [10.33, 11.67]) { box(15.7, 0, z - .03, 17.66, 2.05, z + .03, "cabinet", { tile: 1 }); box(15.66, 2.05, z - .05, 17.7, 2.12, z + .05, "dark"); COLL.push([15.7, z - .03, 17.66, z + .03]); }
  for (const z of [9.67, 11, 12.33]) { obox(17.4, 1.13, z - .44, .3, .17, .04, -Math.PI / 2, .75, "dark", { front: "scrGraph" }); box(17.36, 1.04, z - .48, 17.44, 1.08, z - .4, "dark"); }
  // downrange: distance markers on the floor, a sandbag berm and armour plate at the back
  for (const x of [20, 24, 28]) box(x - .04, 0, 9, x + .04, .012, 13, "haz", { tile: 4 });
  box(30.55, 0, 9, 31, 1.25, 13, "crate", { tile: 3, top: "dark" }); box(30.35, 0, 9, 30.55, .55, 13, "crate", { tile: 3 });
  // the mannequins are drawn each frame so they can fold over
  tube([27, 2.82, 9.05], [27, 2.82, 12.95], .05, 6, "pipeMetal");   // the rail the moving target hangs from
  // a weapons rack and the range-master's crates by the door
  box(14.05, 0, 9.05, 14.5, 1.9, 10.2, "cabinet", { tile: 1, e: "rack" }); COLL.push([14.05, 9.05, 14.5, 10.2]);
  barrel(14.45, 12.5); CIRC.push([14.45, 12.5, .32]); box(15.1, 0, 12.35, 15.7, .55, 12.95, "ammo", { tile: 2 }); COLL.push([15.1, 12.35, 15.7, 12.95]);
  RANGE.targets = RANGE_TARGETS.map(T => { const hp = (ARMORS[T.type] || ARMORS.medium).hp; return { ...T, hp, max: hp, fall: 0, downT: 0, flash: 0, cz: T.z }; });
  // the soft round blob used for flashes and sparks normally arrives with a mission's textures
  if (!R3.tex.decalBlob) { TXD.decalBlob = tex(16, 16, (x, y) => { const d = Math.hypot(x - 7.5, y - 7.5) + (hash2(x, y, 53) - .5) * 3; return d < 7 ? [255, 255, 255, 1] : null; }); R3.tex.decalBlob = glTex(TXD.decalBlob); }
}

// the bay's two lights are dark from in here, so they're lent to the range while you're in it
function rangeLights(lp, lc, eye) { if (eye[0] < 12.5) return;
  lp.set([16, 2.6, 11], 18); lc.set([.95, .9, .8], 18); lp.set([25, 2.6, 11], 21); lc.set([1.1, 1.0, .85], 21);
  if (RANGE.muzT > 0) { lp.set([eye[0], eye[1], eye[2]], 15); lc.set([1.4, 1, .55], 15); } }

function rangeArm() { const lo = resolveLoadout({ diff: 1 }); if (AU.warmGuns) AU.warmGuns([lo.wk, lo.wk2]);
  RANGE.slots = [{ key: lo.wk, w: lo.w, ammo: lo.w.mag }, { key: lo.wk2, w: lo.w2, ammo: lo.w2.mag }]; RANGE.slot = 0; RANGE.relT = 0; RANGE.swapT = 0; }

function updateRange(dt) {
  const B = BASE, R = RANGE, inside = B.x > 13.9 && !DROP && $("screen").hidden;
  if (inside && R.up === 0) { rangeArm(); AU.draw(); }
  R.up = clamp(R.up + (inside ? 3 : -4) * dt, 0, 1);
  R.fireT -= dt; R.muzT -= dt; R.recoil = Math.max(0, R.recoil - dt * 6); R.swapT = Math.max(0, R.swapT - dt);
  for (const t of R.targets) { t.flash -= dt;
    if (t.move) t.cz = 11 + Math.sin(B.t * t.move) * 1.25;
    if (t.hp <= 0) { t.fall = Math.min(1, t.fall + dt * 5); t.downT -= dt; if (t.downT <= 0) { t.hp = t.max; AU.clank(); } }
    else t.fall = Math.max(0, t.fall - dt * 2.5); }
  for (const s of R.sparks) { s.t -= dt; s.p[0] += s.v[0] * dt; s.p[1] += s.v[1] * dt; s.p[2] += s.v[2] * dt; s.v[1] -= 9 * dt; }
  R.sparks = R.sparks.filter(s => s.t > 0); casingUpdate(dt, "ship");
  if (!R.slots || R.up < .95) return;
  const S = R.slots[R.slot], w = S.w;
  if (R.relT > 0) { R.relT -= dt; if (R.relT <= 0) S.ammo = w.mag; return; }
  if (pressed.has("1") && R.slot !== 0) rangeSwap(0); if (pressed.has("2") && R.slot !== 1) rangeSwap(1);
  if (R.swapT > 0) return;
  if (pressed.has("r") && S.ammo < w.mag) { R.relT = R.relMax = w.reload; AU.reload(S.key, w.reload); return; }
  const aiming = (document.pointerLockElement === R3.cv || B.noLock) && !(typeof DEV !== "undefined" && DEV.open);
  if (aiming && mouse.down && R.fireT <= 0 && (!w.semi || mouse.clicked)) { if (S.ammo > 0) rangeFire(S, w); else if (mouse.clicked) { AU.empty(); R.relT = R.relMax = w.reload; AU.reload(S.key, w.reload); } }
}
function rangeSwap(i) { const R = RANGE; R.slot = i; R.relT = 0; R.swapT = .35; AU.draw(); }

function rangeFire(S, w) {
  const B = BASE, R = RANGE; S.ammo--; R.fireT = w.rate; R.shots++; R.muzT = .05; R.recoil = Math.min(1, R.recoil + (w.pellets > 1 || w.dmg >= 100 ? .9 : .35));
  const eye = [B.x, EYE + Math.sin(B.bob) * .035, B.z], moving = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d"), spr = (w.spread + (moving ? w.moveSpread : 0)) * .8;
  let hitAny = false; const o0 = eye[0];
  for (let i = 0; i < w.pellets; i++) { const d = camDir(B.a + frand(-spr, spr), B.pitch + frand(-spr, spr) * .7), h = rangeRay(eye, d);
    if (h.target) { const t = h.target; if (!hitAny && AU.impact) AU.impact("metal", .7, 0, (t.x - o0) / 340); hitAny = true; t.flash = .08; t.hp -= w.dmg;
      for (let k = 0; k < 4; k++) R.sparks.push({ p: h.p.slice(), v: [-frand(1, 3), frand(0, 2.5), frand(-2, 2)], t: .25, c: [1.3, 1.3, 1.25] });
      if (t.hp <= 0 && t.fall === 0 && t.downT <= 0) { t.downT = 3; R.kills++; (AU.metalHit || AU.clank).call(AU, .8); } }
    else if (h.p) { for (let k = 0; k < 3; k++) R.sparks.push({ p: h.p.slice(), v: [h.n[0] * 2 + frand(-1.5, 1.5), h.n[1] * 2 + frand(0, 2), h.n[2] * 2 + frand(-1.5, 1.5)], t: .18, c: [1.6, 1.1, .5] });
      R.holes.push({ p: h.p.map((v, j) => v + h.n[j] * .006), n: h.n }); if (R.holes.length > 90) R.holes.shift(); } }
  if (hitAny) R.hits++;
  AU.gun(S.key); casingEject("ship", eye, B.a, B.pitch, S.key);
}
// a shot against the cards (pixel-accurate on the mannequin art) and then the room's walls, floor and ceiling
function rangeRay(o, d) { const R = RANGE; let best = null, bt = 1e9;
  for (const t of R.targets) { if (t.hp <= 0 || t.fall > .1 || d[0] <= 0) continue; const s = (t.x - o[0]) / d[0]; if (s <= 0 || s >= bt) continue;
    const p = [o[0] + d[0] * s, o[1] + d[1] * s, o[2] + d[2] * s], c = rangeCard(t), u = (p[2] - (t.cz - c.w / 2)) / c.w, v = 1 - (p[1] - c.y0) / c.h;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) continue; const T = SP["dummy_" + t.type]; if (T && !T.d[(Math.floor(v * T.h) * T.w + Math.floor(u * T.w)) * 4 + 3]) continue;
    bt = s; best = { target: t, p }; }
  if (best) return best;
  let hit = { p: null, n: null }, ht = 1e9; const tryP = (s, n) => { if (s > 0 && s < ht) { const p = [o[0] + d[0] * s, o[1] + d[1] * s, o[2] + d[2] * s]; if (p[0] > 13.9 && p[0] <= R.x1 + .01 && p[1] >= -.01 && p[1] <= WALL_H + .01 && p[2] >= R.z0 - .01 && p[2] <= R.z1 + .01) { ht = s; hit = { p, n }; } } };
  if (d[1] < 0) tryP(-o[1] / d[1], [0, 1, 0]); if (d[1] > 0) tryP((WALL_H - o[1]) / d[1], [0, -1, 0]);
  if (d[2] < 0) tryP((R.z0 - o[2]) / d[2], [0, 0, 1]); if (d[2] > 0) tryP((R.z1 - o[2]) / d[2], [0, 0, -1]);
  if (d[0] > 0) tryP((R.x1 - o[0]) / d[0], [-1, 0, 0]);
  // the berm at the back stops rounds before the wall
  if (d[0] > 0) { const s = (30.55 - o[0]) / d[0], y = o[1] + d[1] * s; if (s > 0 && s < ht && y < 1.25) { ht = s; hit = { p: [30.55, y, o[2] + d[2] * s], n: [-1, 0, 0] }; } }
  return hit; }
function rangeCard(t) { const T = SP["dummy_" + t.type], h = 2 * t.s * (DUMMY_SRC[t.type] || [0, 1])[1], w = T ? h * T.w / T.h : h; return { w, h, y0: .01 }; }

function drawRange(eye) {
  const R = RANGE, gl = R3.gl, L = R3.loc; if (!R.targets.length || eye[0] < 11) { drawRangeGun(); return; }
  // target cards: they fold backward about their bottom edge when killed
  for (const t of R.targets) { const K = rangeDummy(t.type); if (!K) continue;
    const c = rangeCard(t), a = ease(t.fall) * 1.45, tx = t.x + Math.sin(a) * c.h, ty = c.y0 + Math.cos(a) * c.h, z0 = t.cz - c.w / 2, z1 = t.cz + c.w / 2, m = new MB();
    m.quad([tx, ty, z0], [tx, ty, z1], [t.x, c.y0, z1], [t.x, c.y0, z0], [-1, 0, 0], [0, 0, 1, 1]);
    if (t.flash > 0) { gl.uniform3f(L.uTint, 3, 3, 3); drawMB(m, K, 1); gl.uniform3f(L.uTint, 1, 1, 1); } else { gl.uniform3f(L.uTint, 1.2, 1.2, 1.2); drawMB(m, K, 0, 0, 1); gl.uniform3f(L.uTint, 1, 1, 1); }
    const k = new MB(), pc = [.35, .37, .4];   // the post (or the hangers on the moving one)
    if (t.move) for (const dz of [-.3, .3]) k.quad([t.x, 2.82, t.cz + dz - .02], [t.x, 2.82, t.cz + dz + .02], [t.x, c.y0 + c.h * .8, t.cz + dz + .02], [t.x, c.y0 + c.h * .8, t.cz + dz - .02], [-1, 0, 0], [0, 0, 1, 1], pc);
    if (t.move) drawMB(k, "dark", 0); }
  // bullet holes and sparks
  const hm = new MB(); for (const h of R.holes) { const n = h.n, a = Math.abs(n[1]) > .5 ? [1, 0, 0] : [0, 1, 0], b = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]], s = .035, P = (i, j) => h.p.map((v, q) => v + a[q] * s * i + b[q] * s * j);
    hm.quad(P(-1, 1), P(1, 1), P(1, -1), P(-1, -1), n, [0, 0, 1, 1], [.05, .05, .05]); }
  drawMB(hm, "decalBlob", 1);
  const cam = camBasis(BASE.a, BASE.pitch); casingDraw(eye, "ship"); const sm = new MB(); for (const s of R.sparks) billQ(sm, s.p, .025 + s.t * .06, cam, s.c); drawMB(sm, "decalBlob", 1);
  drawRangeGun();
}
function drawRangeGun() {
  const R = RANGE, B = BASE; if (R.up <= 0 || !R.slots) return; const gl = R3.gl, L = R3.loc, S = R.slots[R.slot];
  const moving = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d"), sprint = keys.has("shift") && moving;
  const bx = moving ? Math.cos(B.bob * .5) * .012 : 0, by = moving ? Math.abs(Math.sin(B.bob * .5)) * .016 : Math.sin(B.t * 1.5) * .004;
  const rel = R.relT > 0 ? Math.sin(Math.PI * (1 - R.relT / R.relMax)) : 0, low = (1 - ease(R.up)) * 1.8 + (R.swapT > 0 ? Math.sin(R.swapT / .35 * Math.PI) * 1.4 : 0) + rel * .8 + (sprint ? .25 : 0);
  gl.clear(gl.DEPTH_BUFFER_BIT); const tint = [.82, .82, .86], GS = GUNSPRITE[S.key];
  if (GS && drawGunSprite(GS, bx, by, low, sprint, { recoil: R.recoil, muzT: R.muzT, tint })) return;
  const g = buildViewGun(S.key); gl.uniformMatrix4fv(L.uVP, false, persp(1.0, R3.W / R3.H, .02, 10));
  gl.uniform3f(L.uTint, ...tint); drawParts(g.parts, mChain(mT(bx, by - low * .3, R.recoil * .06), mRx(R.recoil * .08 - low * .5), mRy(sprint ? .5 : 0)), { sky: 1 }); gl.uniform3f(L.uTint, 1, 1, 1);
  if (R.muzT > 0 && low < .3) { const m = new MB(), c = { f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] }, s = .035 + Math.random() * .025; billQ(m, [.19 + bx, -.2 + by, g.muz], s, c, [2, 1.6, .8]); billQ(m, [.19 + bx, -.2 + by, g.muz - .05], s * .5, c, [2, 2, 2]); drawMB(m, "decalBlob", 1); }
}
function rangeHud() { const R = RANGE, on = R.up > .5 && R.slots; show("bh-range", !!on); if (!on) return;
  const S = R.slots[R.slot], acc = R.shots ? Math.round(R.hits / R.shots * 100) : 0;
  setH("bh-range", `<div class="k">FIRING RANGE</div><div class="w">${S.w.name}</div><div class="am"><b>${R.relT > 0 ? "--" : S.ammo}</b>/${S.w.mag}${R.relT > 0 ? " <i>RELOADING</i>" : ""}</div>
    <div class="sc"><span>HITS<b>${R.hits}</b></span><span>ACC<b>${acc}%</b></span><span>DOWN<b>${R.kills}</b></span></div><div class="ky">R reload · 1 / 2 swap</div>`); }
