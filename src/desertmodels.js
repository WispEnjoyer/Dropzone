// =====================================================================================
//  THE DESERT (Velion Prime): saguaros, barrel cacti, dead trees and brush, boulders, hoodoos and rock arches,
//  plus four landmarks of its own: the bones of something enormous, a giant stone hand rising out of the sand,
//  a mining crawler half swallowed by a dune, and a colony moisture farm. Tumbleweeds and dust devils live in field.js.
// =====================================================================================
function desertTextures() {
  const N = (x, y, s, a) => (hash2(x, y, s) - .5) * a;
  TXD.fSaguaro = tex(16, 32, (x, y) => { const rib = x % 4; if (rib === 0) return [52, 84, 46]; if ((rib === 1 || rib === 3) && y % 3 === 0) return [214, 206, 168];   // ribs with spines along them
    return [92 + (rib === 2 ? 14 : 0), 132 + (rib === 2 ? 12 : 0), 72].map(v => v + N(x, y >> 2, 601, 8)); });
  TXD.fBone = tex(32, 32, (x, y) => { const crack = Math.abs(Math.sin(x * .45 + Math.sin(y * .3) * 2.2)) < .05, pit = hash2(x >> 1, y >> 1, 602) > .93;
    if (crack) return [140, 126, 100]; if (pit) return [176, 162, 132]; return [226 - y * .8, 214 - y * .9, 186 - y].map(v => v + N(x, y, 603, 10)); });
  // sun-faded mining yellow, rusting through in streaks running down from the seams and in patches round the rivets
  TXD.fRust = tex(32, 32, (x, y) => { const seam = (y % 32 === 0 || x % 32 === 0), rivet = (x % 8 === 4) && (y % 32 === 3), run = hash2(x, 0, 605) > .72 && (y % 16) < 4 + hash2(x, 1, 605) * 12, patch = fbm(x / 5, y / 5, 604) > .66;
    if (seam) return [52, 38, 28]; if (rivet) return [110, 72, 44]; if (run || patch) return [118, 64, 36].map(v => v + N(x, y, 607, 14));
    return [190, 152, 66].map(v => v * (1 - (y % 32) * .006) + N(x >> 1, y >> 1, 606, 10)); });
  TXD.fTread = tex(32, 16, (x, y) => (x % 8 < 2 || y < 2 || y > 13) ? [36, 32, 30] : [78, 70, 62].map(v => v + N(x, y, 608, 10)));
  TXD.fTumble = tex(32, 32, (x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); if (d > 15) return null; for (let k = 0; k < 9; k++) { const a = k * .7, c = Math.cos(a), s = Math.sin(a), off = (k * 5) % 11 - 5;
      if (Math.abs((x - 15.5) * s - (y - 15.5) * c - off) < .7) return [196 + k * 5, 164 + k * 4, 112]; } return d < 6 && hash2(x, y, 609) > .6 ? [160, 130, 88] : null; });
  TXD.fSandstone = FART.rock_desert ? artTile(FART.rock_desert, 1, 2) : TXD.fRockProp;
  TXD.fSandDrift = FART.ground_desert ? artTile(FART.ground_desert, 1, 0) : TXD.fGround;
  if (R3.gl) for (const k of ["fSaguaro", "fBone", "fRust", "fTread", "fTumble", "fSandstone", "fSandDrift"]) R3.tex[k] = glTex(TXD[k]);
}

// a smooth drift of sand piled against something: a gaussian mound on a small grid
function sandMound(x, z, rx, rz, h, yaw = 0, y0 = 0) { const n = 7, m = mb("fSandDrift").mb, c = Math.cos(yaw), s = Math.sin(yaw), P = (i, j) => { const u = i / n * 2 - 1, v = j / n * 2 - 1, k = Math.exp(-(u * u + v * v) * 2.2) - .11;
    return [x + (u * rx * c - v * rz * s), y0 + Math.max(-.2, k) * h, z + (u * rx * s + v * rz * c)]; };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = P(i, j), b = P(i + 1, j), cc = P(i + 1, j + 1), d = P(i, j + 1), e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let nn = norm3([e2[1] * e1[2] - e2[2] * e1[1], e2[2] * e1[0] - e2[0] * e1[2], e2[0] * e1[1] - e2[1] * e1[0]]); if (nn[1] < 0) nn = nn.map(v => -v);
    m.quad(a, b, cc, d, nn, [i / n * rx / 2, j / n * rz / 2, (i + 1) / n * rx / 2, (j + 1) / n * rz / 2]); } }
// ---------- flora ----------
function saguaro(C, x, y, z, R) { const h = 3.5 + R() * 4, r = .3 + R() * .1, dome = (cx, cz, y1, rr) => lathe(cx, cz, [[rr, y1], [rr * .8, y1 + rr * .5], [.01, y1 + rr * .75]], 8, "fSaguaro", { v: [0, .3, .5] });
  cyl(x, z, y - .3, y + h, r, 8, "fSaguaro", { tile: 2, tv: Math.round(h * 1.2) }); dome(x, z, y + h, r);
  const n = R() < .2 ? 0 : 1 + (R() * 2.6 | 0);
  for (let k = 0; k < n; k++) { const a = R() * 6.283, ca = Math.cos(a), sa = Math.sin(a), ay = y + h * (.3 + R() * .3), L = .55 + R() * .35, ar = r * .72, ex = x + ca * L, ez = z + sa * L, top = ay + .2 + h * (.25 + R() * .25);
    tube([x, ay, z], [ex, ay + .22, ez], ar, 7, "fSaguaro", 2); cyl(ex, ez, ay + .1, top, ar, 7, "fSaguaro", { tile: 2, tv: Math.round((top - ay) * 1.2) }); dome(ex, ez, top, ar); }
  C.push([x, z, r + .15, y + h]); }
function barrelCacti(x, y, z, R, fh) { for (let k = 0; k < 2 + (R() * 3 | 0); k++) { const bx = x + (R() - .5) * 1.6, bz = z + (R() - .5) * 1.6, by = fh(bx, bz), s = .28 + R() * .25;
    lathe(bx, bz, [[s * .7, by - .05], [s, by + s * .5], [s * .95, by + s * 1.1], [s * .5, by + s * 1.45], [.01, by + s * 1.52]], 10, "fSaguaro", { v: [1, .7, .35, .1, 0] });
    if (R() < .6) for (let q = 0; q < 3; q++) { const a = q * 2.1 + R(), fx = bx + Math.cos(a) * s * .3, fz = bz + Math.sin(a) * s * .3; box(fx - .05, by + s * 1.42, fz - .05, fx + .05, by + s * 1.55, fz + .05, "gBone", { col: [1.5, .62, .86] }); } } }   // pink flowers
function deadTree(C, x, y, z, R) { const h = 3 + R() * 3, lx = (R() - .5) * 1.4, lz = (R() - .5) * 1.4, mid = [x + lx * .4, y + h * .5, z + lz * .4], top = [x + lx, y + h, z + lz], col = [1.15, 1.1, 1.02];
  tube([x, y - .3, z], mid, .2, 6, "fSnag", .7); tube(mid, top, .14, 6, "fSnag", .7);
  for (let k = 0; k < 5; k++) { const t = .35 + R() * .6, p = [x + lx * t, y + h * t, z + lz * t], a = R() * 6.28, L = 1 + R() * 1.6, e = [p[0] + Math.cos(a) * L, p[1] + .4 + R() * 1.1, p[2] + Math.sin(a) * L];
    tube(p, e, .07, 4, "fSnag", 1); if (R() < .6) { const a2 = a + (R() - .5) * 1.4; tube(e, [e[0] + Math.cos(a2) * .7, e[1] + .45, e[2] + Math.sin(a2) * .7], .035, 3, "fSnag", 1); } }
  C.push([x, z, .3, y + h]); }
function deadShrub(x, y, z, R) { for (let k = 0; k < 8; k++) { const a = R() * 6.28, L = .5 + R() * .7, e = [x + Math.cos(a) * L * .7, y + .3 + R() * .6, z + Math.sin(a) * L * .7];
    tube([x, y - .05, z], e, .025, 3, "fSnag", 1); tube(e, [e[0] + Math.cos(a) * .3, e[1] + .25, e[2] + Math.sin(a) * .3], .015, 3, "fSnag", 1); }
  if (TXD.fDryGrass) cross(x, y, z, 1.1, .5, "fDryGrass", [.95, .9, .8], R() * 3); }

// ---------- rock ----------
function boulders(C, x, y, z, R) { const n = 1 + (R() * 3 | 0); let top = 0;
  for (let k = 0; k < n; k++) { const s = (k ? .5 : 1) * (.8 + R() ** 2 * 2.4), bx = x + (R() - .5) * s * 1.4, bz = z + (R() - .5) * s * 1.4; blob(bx, y + s * .25, bz, s * (.9 + R() * .4), s * (.55 + R() * .3), s * (.8 + R() * .4), "fRockProp", [.95 + R() * .1, .92, .88], (x * 9 + k) | 0, 6); top = Math.max(top, s); }
  C.push([x, z, top * .9, y + top]); }
// a hoodoo: a stack of eroded sandstone drums, each narrower than the last, under a darker, wider cap rock
function hoodoo(C, x, y, z, R) { const tiers = 2 + (R() * 3 | 0); let yy = y - .5, r = 1.3 + R() * .8, cx = x, cz = z;
  for (let t = 0; t < tiers; t++) { const h = 1.8 + R() * 2.2, r1 = r * (.6 + R() * .2); cyl(cx, cz, yy, yy + h, r, 7, "fSandstone", { r1, tile: 2, tv: Math.max(1, Math.round(h / 1.6)) });
    blob(cx, yy + h, cz, r1 * 1.15, .35, r1 * 1.15, "fSandstone", [.92, .88, .84], (x + t * 13) | 0, 7); yy += h; r = r1 * (.9 + R() * .25); cx += (R() - .5) * .4; cz += (R() - .5) * .4; }
  blob(cx, yy + .3, cz, r * 1.7, .7, r * 1.5, "fRockProp", [.7, .64, .6], (z * 3) | 0, 7); C.push([x, z, 1.4, yy + .8]); }
// a natural arch: two weathered legs joined by a thick, sagging span
function rockArch(C, x, y, z, yaw, R) { const span = 11 + R() * 6, H = 7 + R() * 3, ca = Math.cos(yaw), sa = Math.sin(yaw);
  for (const s of [-1, 1]) { const lx = x + ca * s * span / 2, lz = z + sa * s * span / 2; cyl(lx, lz, y - .6, y + H, 2.2, 8, "fSandstone", { r1: 1.6, tile: 2, tv: Math.round(H / 1.6) }); C.push([lx, lz, 2.1, y + H + 2]); }
  for (let k = 0; k <= 12; k++) { const t = k / 12, a = Math.PI * t, px = Math.cos(a) * span / 2, py = H + Math.sin(a) * 2.8, th = 1.5 + Math.abs(t - .5) * 1.6;
    blob(x + ca * px, y + py, z + sa * px, th * 1.15, th, th * 1.15, "fSandstone", [.95, .9, .85], (x + k * 7) | 0, 7); } }

// ---------- landmarks (each built in local space, origin on the ground) ----------
// the bones of something enormous: a curving spine, ribs arching out of the sand, a horned skull at one end
function mdlBones(C, W) { OR = seeded(812);
  const sp = t => [-14 + t * 30, -1.2 + Math.sin(t * Math.PI) * 2.6, Math.sin(t * 2.2) * 3];   // the spine's path
  for (let k = 0; k < 22; k++) { const t = k / 21, p = sp(t); blob(p[0], p[1], p[2], 1, .9, .9, "fBone", [1, 1, 1], k, 6); if (k % 3 === 0) cyl(p[0], p[2], p[1], p[1] + 1.6, .25, 5, "fBone", { r1: .06 }); }   // vertebrae and their spines
  for (let k = 0; k < 9; k++) { const t = .15 + k * .07, p = sp(t), L = 7 - Math.abs(k - 3) * .6;
    for (const s of [-1, 1]) { let prev = p; for (let q = 1; q <= 6; q++) { const u = q / 6, a = u * 2.1, e = [p[0] + u * .8, p[1] + Math.sin(a) * L * .85, p[2] + s * Math.sin(a * .65) * L * .8 + s * u * .6]; e[1] = Math.max(e[1], -.6); tube(prev, e, .32 * (1 - u * .5), 6, "fBone", 1); prev = e; }
      const [cx, cz] = W(p[0], p[2] + s * L * .6); C.push([cx, cz, .9, 6]); } }
  const sk = sp(1); xform(() => lathe(0, 0, [[.05, 0], [1.6, .6], [2.1, 2], [1.9, 3.6], [1.3, 5.2], [.9, 6.8], [.5, 7.6], [.05, 7.8]], 9, "fBone"), { t: [sk[0] + .2, 1.1, sk[2]], roll: -Math.PI / 2 });   // a long skull, snout down in the sand
  blob(sk[0] + 2.6, 2.3, sk[2], 2.2, 1.4, 2, "fBone", [1, 1, 1], 99, 7);   // the brow ridge
  for (const s of [-1, 1]) { blob(sk[0] + 4.2, 2, sk[2] + s * 1.7, .55, .5, .3, "dark", [.3, .3, .3], 97, 5);   // eye sockets
    tube([sk[0] + 2.6, 2.6, sk[2] + s * 1.4], [sk[0] + 1.2, 5.4, sk[2] + s * 3], .4, 6, "fBone", 1); tube([sk[0] + 1.2, 5.4, sk[2] + s * 3], [sk[0] - .8, 6.6, sk[2] + s * 3.4], .2, 5, "fBone", 1); }   // horns
  for (let k = 0; k < 6; k++) sandMound(OR() * 26 - 12, OR() * 16 - 8, 3 + OR() * 3, 2.4 + OR() * 2, .9 + OR() * .8, OR() * 3);   // sand drifted over it
  for (const [lx, lz] of [[sk[0] + 4, sk[2]], [-4, 0], [6, 1]]) { const [cx, cz] = W(lx, lz); C.push([cx, cz, 2.2, 4]); } }
// the Sunken Hand: a colossal stone hand reaching out of the sand, fingers half curled, with toppled masonry round it
function mdlHand(C, W) { OR = seeded(813); const S = "fSandstone";
  blob(0, 2.4, 0, 3, 3.8, 2, S, [.95, .9, .86], 1, 7); cyl(0, 0, -1, 2, 2.2, 8, S, { r1: 2.6, tile: 2 });   // palm and wrist
  const finger = (bx, bz, a, len, curl) => { let p = [bx, 5.4, bz], dir = [Math.cos(a) * .2, 1, Math.sin(a) * .2];
    for (let k = 0; k < 3; k++) { const L = len * [1, .8, .6][k], e = [p[0] + dir[0] * L, p[1] + dir[1] * L, p[2] + dir[2] * L]; tube(p, e, .62 - k * .1, 7, S, 1); blob(e[0], e[1], e[2], .62 - k * .1, .62 - k * .1, .62 - k * .1, S, [.92, .88, .84], k, 5); p = e;
      const c = curl * (k + 1); dir = norm3([dir[0] + Math.cos(a) * c, dir[1] - c * .6, dir[2] + Math.sin(a) * c]); } };
  finger(-1.6, -.3, 0, 2.6, .25); finger(-.55, -.45, 0, 3, .32); finger(.55, -.45, 0, 2.9, .45); finger(1.5, -.3, 0, 2.4, .55);
  finger(2.2, .6, 1.3, 2, .3);   // the thumb
  for (let k = 0; k < 5; k++) { const a = OR() * 6.28, d = 6 + OR() * 6, x = Math.cos(a) * d, z = Math.sin(a) * d; xform(() => { cyl(0, 0, 0, 2.2 + OR() * 2, .9, 8, S, { cap: S, tile: 2 }); }, { t: [x, .8, z], yaw: OR() * 6, pitch: Math.PI / 2 }); const [cx, cz] = W(x, z); C.push([cx, cz, 1.4, 2]); }   // fallen column drums
  for (let k = 0; k < 4; k++) sandMound(OR() * 10 - 5, OR() * 8 - 4, 3 + OR() * 2.5, 3 + OR() * 2, 1 + OR() * .8, OR() * 3);
  const [hx, hz] = W(0, 0); C.push([hx, hz, 2.8, 11]); }
// a mining crawler that drove into a dune and never came out: tilted hull, track units, a bucket-wheel boom, sand piled over the back
function mdlCrawler(C, W) { OR = seeded(814);
  xform(() => {
    box(-9, 1.6, -3.6, 9, 6.6, 3.6, "fRust", { tile: .16 }); box(-7, 6.6, -3, 3, 9.2, 3, "fRust", { tile: .2 }); box(3.2, 6.6, -2.2, 8, 8.8, 2.2, "fRust", { tile: .25, e: "fWindow" });   // hull, machinery house, cab
    box(-9.1, 4.4, -3.7, 9.1, 4.8, 3.7, "haz", { tile: 1 });
    for (const s of [-1, 1]) { box(-8.5, 0, s * 3.4 - 1.1, -1.5, 2, s * 3.4 + 1.1, "fTread", { tile: .5 }); box(1.5, 0, s * 3.4 - 1.1, 8.5, 2, s * 3.4 + 1.1, "fTread", { tile: .5 }); }
    for (let k = 0; k < 3; k++) cyl(-6 + k * 2.4, 3.3, 9.2, 11.5 + k, .35, 6, "dark", { cap: "dark" });   // exhaust stacks
    xform(() => { box(0, -.5, -.6, 12, .5, .6, "fRust", { tile: .4 }); xform(() => { cyl(0, 0, -.6, .6, 3.2, 12, "fRust", { cap: "dark" }); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; box(Math.cos(a) * 3.2 - .5, -.7, Math.sin(a) * 3.2 - .5, Math.cos(a) * 3.2 + .5, .7, Math.sin(a) * 3.2 + .5, "dark"); } }, { t: [12.5, 0, 0], pitch: Math.PI / 2 }); },
      { t: [9, 6, 0], roll: -.35 });   // the boom, its bucket wheel buried nose-first in the sand ahead
  }, { t: [0, -1.4, 0], roll: .16, pitch: .08 });
  sandMound(-9, 0, 9, 7, 5.5, .2); sandMound(-3, 5.5, 6, 3.5, 2.4, .5); sandMound(-2, -5.5, 6, 3.5, 2.2, -.4); sandMound(17, 0, 5, 5, 2.6);   // the dune it ran into, and sand piled round the wheel
  for (const [lx, lz, r] of [[-5, 0, 4.2], [3, 0, 4.2], [7, 0, 3], [17, 0, 3.4]]) { const [cx, cz] = W(lx, lz); C.push([cx, cz, r, 9]); } }
// a colony moisture farm: tall vaporators with cooling fins, pipes running to a water tank, a pump hut
function mdlVaporators(C, W) { OR = seeded(815);
  const vap = (x, z) => { cyl(x, z, 0, 5.2, .32, 8, "fOD", { tile: 2 }); for (let k = 0; k < 5; k++) cyl(x, z, 1.4 + k * .65, 1.5 + k * .65, .62, 8, "pipeMetal");   // fins
    cyl(x, z, 5.2, 5.5, .5, 8, "podBrass", { cap: "dark" }); tube([x, 5.5, z], [x, 6.6, z], .04, 4, "pipeMetal", 1); box(x - .06, 6.6, z - .06, x + .06, 6.75, z + .06, "glowGreenS");
    for (const a of [0, 2.09, 4.19]) tube([x + Math.cos(a) * .3, 1, z + Math.sin(a) * .3], [x + Math.cos(a) * 1.2, 0, z + Math.sin(a) * 1.2], .06, 4, "pipeMetal", 1);
    const [cx, cz] = W(x, z); C.push([cx, cz, .7, 6]); };
  const P = [[-6, -4], [-6, 4], [0, -6], [0, 6], [6, -4]]; for (const [x, z] of P) { vap(x, z); tube([x, .3, z], [4, .3, 2], .1, 5, "pipeMetal", 1); }
  cyl(4, 2, 0, 3.4, 2, 12, "fOD", { cap: "fOD", tile: 3 }); cyl(4, 2, 3.1, 3.2, 2.02, 12, "podBrass"); emblem(4, 2, 4.03, 0, 1.4);   // the water tank
  box(-2.5, 0, -1.4, .5, 2.6, 1.4, "fHab", { tile: .5, top: "fOD" }); box(-1.6, 0, 1.38, -.4, 2.1, 1.44, "dark"); emblem(-1, 1.6, -1.42, Math.PI, .7);   // pump hut
  for (const [x, z, r] of [[4, 2, 2.1], [-1, 0, 1.7]]) { const [cx, cz] = W(x, z); C.push([cx, cz, r, 3.4]); } }
// a tumbleweed (drawn rolling, see field.js)
function mdlTumble() { for (let k = 0; k < 3; k++) { const a = k * 1.05; xform(() => { const m = mb("fTumble").mb; m.quad([-.5, .5, 0], [.5, .5, 0], [.5, -.5, 0], [-.5, -.5, 0], [0, 0, 1], [0, 0, 1, 1]); }, { yaw: a, pitch: k * .6 }); } }
