// =====================================================================================
//  OBJECTIVE MODELS: the things you're sent to destroy, defend or recover, modelled properly instead
//  of as plain boxes. Generator, comms tower, ammo dump, tents, sandbag walls, camp props, the uplink
//  station, bug holes and the crashed shuttle, each with a wrecked version for after the explosion.
//  Built in local space (origin on the ground) with the usual box/obox/cyl/tube/lathe helpers.
// =====================================================================================
// run fn, then rotate/move everything it just added (lets lathes and cylinders lie down or tilt)
function xform(fn, { t = [0, 0, 0], yaw = 0, pitch = 0, roll = 0, s = 1 } = {}) {
  const before = {}; for (const k in R3.mats) before[k] = R3.mats[k].mb.v.length; fn();
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const rot = (x, y, z) => { const x1 = x * cr - y * sr, y1 = x * sr + y * cr, y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp; return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy]; };
  for (const k in R3.mats) { const v = R3.mats[k].mb.v; for (let i = before[k] || 0; i < v.length; i += 11) {
    const p = rot(v[i] * s, v[i + 1] * s, v[i + 2] * s), n = rot(v[i + 5], v[i + 6], v[i + 7]); v[i] = p[0] + t[0]; v[i + 1] = p[1] + t[1]; v[i + 2] = p[2] + t[2]; v[i + 5] = n[0]; v[i + 6] = n[1]; v[i + 7] = n[2]; } } }
const CHAR = [.32, .29, .27];   // burnt
let OR = Math.random; const orr = (a, b) => a + OR() * (b - a);

// ---------- textures (pixel art, generated with the field's other textures) ----------
function objTextures() {
  const N = (x, y, s, a) => (hash2(x, y, s) - .5) * a;
  // olive-drab painted steel: panel seams, rivets, scuffs and grime toward the bottom
  TXD.fOD = tex(32, 32, (x, y) => { if (x % 16 === 0 || y % 16 === 0) return [46, 50, 36]; if ((x % 16 === 2 || x % 16 === 14) && (y % 16 === 2 || y % 16 === 14)) return [128, 132, 100];
    const sc = hash2(x, y, 301) > .97 ? 40 : 0, g = y > 24 ? (y - 24) * 3 : 0; return [88 + sc - g, 94 + sc - g, 64 + sc - g].map(v => v + N(x >> 1, y >> 1, 302, 10)); });
  TXD.fGrille = tex(16, 16, (x, y) => x === 0 || x === 15 ? [40, 44, 34] : y % 4 < 2 ? [26, 28, 24] : [78, 84, 60]);
  TXD.fCrate = tex(32, 32, (x, y) => { if (x < 2 || x > 29 || y < 2 || y > 29) return [52, 50, 34]; if (y >= 13 && y <= 18) return (x > 5 && x < 27 && (y === 15 || y === 16) && x % 4 !== 0) ? [40, 34, 18] : [196, 164, 70];
    return [102, 104, 66].map(v => v * (x % 8 === 0 ? .82 : 1) + N(x, y >> 2, 303, 10)); });
  TXD.fBag = tex(16, 16, (x, y) => { if (x === 0) return [110, 96, 68]; const w = (x + y) % 2 ? 1 : .92, s = y === 2 || y === 13 ? .82 : 1; return [164, 146, 108].map(v => v * w * s + N(x, y, 304, 14)); });
  TXD.fTent = tex(32, 32, (x, y) => { const b = fbm(x / 7, y / 7, 305), seam = y % 16 === 0, c = b > .62 ? [56, 62, 40] : b > .45 ? [96, 100, 66] : [78, 86, 54]; return seam ? c.map(v => v * .7) : c.map(v => v + N(x, y, 306, 6)); });
  TXD.fNet = tex(16, 16, (x, y) => (x % 4 === 0 || y % 4 === 0 || (x + y) % 4 === 0) ? (hash2(x, y, 307) > .5 ? [70, 80, 48] : [96, 92, 58]) : hash2(x >> 1, y >> 1, 308) > .55 ? [62, 74, 42] : null);
  TXD.fBrass = tex(8, 16, (x, y) => y < 4 ? [70, 74, 60] : [200 - x * 8, 160 - x * 8, 70 - x * 4]);
  TXD.fDish = tex(32, 32, (x, y) => { const r = Math.hypot(x - 15.5, y - 15.5); return Math.abs(r % 6 - 3) < .5 ? [150, 156, 160] : [196, 202, 206].map(v => v + N(x >> 2, y >> 2, 309, 8)); });
  TXD.fScorch = tex(32, 32, (x, y) => { const d = Math.hypot(x - 15.5, y - 15.5) / 16, n = fbm(x / 4, y / 4, 310); if (d + (n - .5) * .7 > .9) return null; const k = 1 - d * .5; return [30 * k + 14, 26 * k + 12, 22 * k + 10].map(v => v + N(x, y, 311, 8)); });
  TXD.fFlesh = tex(32, 32, (x, y) => { const n = fbm(x / 5, y / 5, 312), vein = Math.abs(Math.sin(x * .5 + Math.sin(y * .35) * 2.4)) < .07; if (vein) return [234, 140, 54, 1]; return n > .6 ? [120, 74, 54] : n > .4 ? [96, 58, 44] : [70, 42, 34]; });
  TXD.fChitin = tex(16, 32, (x, y) => { const band = y % 8 === 0, hl = x === 3 || x === 4; return band ? [34, 24, 22] : hl ? [150, 104, 70] : [96, 62, 44].map(v => v + N(x, y >> 1, 313, 10)); });
  TXD.fCable = tex(4, 4, () => [22, 22, 24]);
  TXD.fRope = tex(4, 4, () => [150, 134, 96]);
  TXD.glowFire = tex(8, 8, (x, y) => hash2(x, y, 314) > .5 ? [255, 190, 80, 1] : [240, 96, 30, 1]);
  if (R3.gl) for (const k of ["fOD", "fGrille", "fCrate", "fBag", "fTent", "fNet", "fBrass", "fDish", "fScorch", "fFlesh", "fChitin", "fCable", "fRope", "glowFire"]) R3.tex[k] = glTex(TXD[k]);
}

// ---------- pieces ----------
const ground = (r, k = 1) => annulus(0, .03, 0, 0, r, 14, "fScorch");
function cable(pts, r = .035) { for (let i = 0; i < pts.length - 1; i++) tube(pts[i], pts[i + 1], r, 5, "fCable", 1); }
function crate(x, y, z, w, h, d, yaw = 0, o = {}) { obox(x, y + h / 2, z, w, h, d, yaw, o.pitch || 0, "fCrate", { top: "fOD", col: o.col }); }
function shell(x, y, z, yaw = 0, pitch = 0, col) { xform(() => { cyl(0, 0, 0, .42, .085, 7, "fBrass", { col }); cyl(0, 0, .42, .62, .085, 7, "fOD", { r1: .02, col }); }, { t: [x, y, z], yaw, pitch }); }
function dish(r, depth, tex = "fDish") { lathe(0, 0, [[.01, 0], [r * .35, depth * .14], [r * .7, depth * .52], [r, depth]], 14, tex); lathe(0, 0, [[r, depth], [r * .7, depth * .52 - .03], [r * .35, depth * .14 - .03], [.01, -.03]], 14, "fOD"); }

// ---------- the command post targets ----------
function mdlGenerator(dead) {
  const C = dead ? CHAR : undefined;
  box(-1.45, 0, -.85, 1.45, .12, .85, "dark", { col: C });
  for (const z of [-.76, .76]) box(-1.5, 0, z - .07, 1.5, .2, z + .07, "fOD", { col: C });
  if (!dead) {
    box(-1.1, .12, -.68, .85, 1.32, .68, "fOD", { e: "fGrille", w: "fGrille" }); box(-1.05, 1.32, -.62, .8, 1.44, .62, "fOD");
    box(-1.13, .86, -.7, .88, .98, .7, "haz", { tile: 2 }); box(-1.12, 1.3, -.7, .87, 1.34, .7, "podBrass"); box(-1.12, .12, -.7, .87, .18, .7, "podBrass");
    emblem(-.55, 1.13, .705, 0, .3); emblem(-.55, 1.13, -.705, Math.PI, .3);
    box(.05, .5, .68, .72, 1.08, .74, "dark", { s: "scrGraph" }); box(.12, .3, .7, .32, .44, .76, "glowGreenS");
    cyl(-.72, -.34, 1.44, 2.35, .09, 8, "pipeMetal"); cyl(-.72, -.34, 2.35, 2.43, .13, 8, "dark", { cap: "dark" });
    cyl(.55, -.4, 1.44, 1.62, .06, 6, "glowRed");
    xform(() => { cyl(0, 0, -.62, .62, .36, 12, "fOD", { cap: "fOD" }); for (const y of [-.4, .4]) cyl(0, 0, y - .04, y + .04, .375, 12, "podBrass"); }, { t: [1.18, .62, 0], pitch: Math.PI / 2 });
    for (const z of [-.45, .45]) box(1.0, .12, z - .06, 1.36, .32, z + .06, "dark");
    cable([[.5, .6, .74], [.7, .2, 1.05], [1.2, .04, 1.5], [2.4, .04, 2.1]]); cable([[-1.12, .4, 0], [-1.6, .04, .3], [-2.4, .04, -.4]]);
  } else {
    obox(-.2, .55, 0, 1.9, .9, 1.3, .25, .18, "fOD", { side: "fGrille", col: CHAR });   // the housing, split and slumped
    obox(1.6, .1, 1.2, 1.1, .08, .9, 1.1, .3, "fOD", { col: CHAR }); obox(-1.8, .1, -1.3, .9, .08, .7, .3, -.2, "fOD", { col: CHAR });   // blown-off panels
    xform(() => cyl(0, 0, -.62, .62, .36, 12, "fOD", { col: CHAR }), { t: [1.6, .36, -.5], pitch: Math.PI / 2, yaw: .6 });
    tube([-.72, .9, -.34], [-1.5, .5, -1.4], .09, 6, "pipeMetal"); ground(3.4);
  } }
function mdlComms(dead) {
  if (!dead) {
    box(-.9, 0, -.7, .9, 1.1, .7, "fOD", { s: "scrRadar" }); box(-.95, 1.1, -.75, .95, 1.18, .75, "podBrass");
    emblem(0, .6, -.705, Math.PI, .6); emblem(.905, .6, 0, Math.PI / 2, .6); banner(-.31, .37, 0, .62, 3.2, 4.4);
    const leg = (sx, sz) => [[sx * .55, 1.18, sz * .55], [sx * .16, 7.4, sz * .16]], L = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => leg(a, b));
    for (const [a, b] of L) tube(a, b, .05, 5, "pipeMetal", 1);
    const at = (l, k) => [lerp(l[0][0], l[1][0], k), lerp(l[0][1], l[1][1], k), lerp(l[0][2], l[1][2], k)];
    for (let s = 0; s < 6; s++) { const k0 = s / 6, k1 = (s + 1) / 6; for (let i = 0; i < 4; i++) { const A = L[i], B = L[(i + 1) % 4]; tube(at(A, k0), at(B, k1), .025, 4, "pipeMetal", 1); tube(at(A, k1), at(B, k1), .025, 4, "pipeMetal", 1); } }
    box(-.5, 5.1, -.5, .5, 5.18, .5, "dark");
    xform(() => { dish(1.1, .45); tube([0, .02, 0], [0, .9, 0], .03, 4, "pipeMetal", 1); cyl(0, 0, .9, 1.05, .07, 6, "dark", { cap: "dark" }); }, { t: [0, 5.75, .7], pitch: -1.15 });
    tube([0, 7.4, 0], [0, 8.8, 0], .025, 4, "pipeMetal", 1); tube([.15, 7.4, 0], [.15, 8.2, 0], .02, 4, "pipeMetal", 1); box(-.07, 8.8, -.07, .07, 8.95, .07, "glowRed");
    for (const a of [.4, 2.5, 4.6]) tube([0, 7, 0], [Math.cos(a) * 4.5, .05, Math.sin(a) * 4.5], .012, 3, "fCable", 1);
    cable([[.9, .5, .3], [.5, 1.3, .45], [.2, 3, .3]]);
  } else {
    box(-.9, 0, -.7, .9, .8, .7, "fOD", { col: CHAR });
    xform(() => { for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tube([a * .55, 0, b * .55], [a * .2, 6, b * .2], .05, 5, "pipeMetal", 1);
      for (let s = 0; s < 5; s++) tube([-.5 + s * .06, s * 1.2, -.5], [.5 - s * .06, s * 1.2 + 1.2, .5], .025, 4, "pipeMetal", 1); }, { t: [.6, .3, .2], roll: -1.42, yaw: .3 });
    xform(() => dish(1.1, .45), { t: [-2.6, .3, 1.8], pitch: 2.4, yaw: .9 }); ground(3.6);
  } }
function mdlAmmo(dead) {
  OR = seeded(77); const C = dead ? CHAR : undefined;
  box(-1.5, 0, -1.1, 1.5, .14, 1.1, "crate", { col: C });
  if (!dead) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < (i === 1 ? 3 : 2); k++) crate(-1 + i * 1, .14 + k * .44, -.5 + j * 1, .92, .44, .9, orr(-.04, .04));
    for (let i = 0; i < 5; i++) shell(1.9, .02 + (i % 2) * .17, -.6 + i * .3, Math.PI / 2, Math.PI / 2);   // shells stacked on their side
    box(1.6, 0, -.85, 2.2, .06, .75, "dark"); tube([2.9, 0, -1.6], [2.9, 3.1, -1.6], .045, 5, "dark", 1); banner(2.9, -1.6, Math.PI / 2, .7, 1.7, 3.0);
    barrel(-2.1, .7); barrel(-2.15, -.1);
    // camo netting on four poles, sagging between them
    const P = [[-1.9, -1.5], [2.4, -1.5], [2.4, 1.5], [-1.9, 1.5]]; for (const [x, z] of P) tube([x, 0, z], [x, 2.1, z], .04, 4, "dark", 1);
    const m = mb("fNet").mb, H = (u, v) => 2.1 - Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .45, X = u => lerp(-1.9, 2.4, u), Z = v => lerp(-1.5, 1.5, v);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const u0 = i / 6, u1 = (i + 1) / 6, v0 = j / 4, v1 = (j + 1) / 4;
      m.quad([X(u0), H(u0, v0), Z(v0)], [X(u1), H(u1, v0), Z(v0)], [X(u1), H(u1, v1), Z(v1)], [X(u0), H(u0, v1), Z(v1)], [0, 1, 0], [0, 0, 2, 2]); }
  } else {
    for (let i = 0; i < 7; i++) crate(orr(-2.4, 2.4), 0, orr(-2, 2), .92, .44, .9, orr(0, 6), { pitch: orr(-.4, .4), col: CHAR });
    for (let i = 0; i < 6; i++) shell(orr(-2.6, 2.6), .1, orr(-2.4, 2.4), orr(0, 6), Math.PI / 2, CHAR);
    ground(3.8);
  } }

// ---------- camps: tents, sandbags, a radio mast, a fire ----------
function mdlTent(dead) {
  const L = 1.7, W = 1.25, H = 1.8, E = .25;   // half length, half width, ridge height, eave height
  if (!dead) {
    const m = mb("fTent").mb, sideN = z => norm3([0, W, Math.sign(z) * (H - E)]);
    for (const s of [-1, 1]) m.quad([-L, H, 0], [L, H, 0], [L, E, s * W], [-L, E, s * W], sideN(s), [0, 0, 2, 1]);
    for (const s of [-1, 1]) m.quad([-L, E, s * W], [L, E, s * W], [L, 0, s * (W + .12)], [-L, 0, s * (W + .12)], [0, 0, s], [0, 0, 2, .2]);   // the skirt
    m.tri([-L, H, 0], [-L, E, W], [-L, E, -W], [-1, 0, 0], [.5, 0], [0, 1], [1, 1]); m.tri([-L, E, -W], [-L, E, W], [-L, 0, W], [-1, 0, 0], [0, 1], [1, 1], [1, 1.2]); m.tri([-L, E, -W], [-L, 0, W], [-L, 0, -W], [-1, 0, 0], [0, 1], [1, 1.2], [0, 1.2]);
    // the front: two flaps tied back from a dark doorway
    m.tri([L, H, 0], [L, E, -W], [L, 0, -W], [1, 0, 0], [.5, 0], [0, 1], [0, 1.2]); m.tri([L, H, 0], [L, 0, -W], [L, 0, -W * .45], [1, 0, 0], [.5, 0], [0, 1.2], [.3, 1.2]);
    m.tri([L, H, 0], [L, E, W], [L, 0, W], [1, 0, 0], [.5, 0], [1, 1], [1, 1.2]); m.tri([L, H, 0], [L, 0, W * .45], [L, 0, W], [1, 0, 0], [.5, 0], [.7, 1.2], [1, 1.2]);
    mb("dark").mb.tri([L - .05, H - .05, 0], [L - .05, 0, -W * .45], [L - .05, 0, W * .45], [1, 0, 0], [0, 0], [0, 1], [1, 1]);
    emblem(-L - .02, .85, 0, -Math.PI / 2, .6);
    tube([-L - .1, H, 0], [L + .1, H, 0], .035, 5, "podBrass", 1); for (const x of [-L, L]) tube([x, 0, 0], [x, H, 0], .035, 5, "dark", 1);
    for (const x of [-L, L]) for (const s of [-1, 1]) { tube([x, H - .05, 0], [x + Math.sign(x) * 1.1, 0, s * .6], .01, 3, "fRope", 1); box(x + Math.sign(x) * 1.1 - .03, 0, s * .6 - .03, x + Math.sign(x) * 1.1 + .03, .14, s * .6 + .03, "dark"); }
  } else {
    obox(0, .2, 0, 2 * L, .14, 2 * W, 0, .08, "fTent", { col: CHAR }); obox(.5, .45, .2, 1.4, .1, 1.2, .5, .5, "fTent", { col: CHAR });
    tube([-L, 0, 0], [-L + .6, 1.2, .3], .035, 5, "dark", 1); tube([L, .1, 0], [L - 1.4, .2, -.8], .035, 5, "dark", 1); ground(2.6);
  } }
// a wall of sandbags: two staggered courses of lumpy bags around a ring, with a gap facing `gap`
function mdlSandbags(cx, cz, r, gap, hAt) { OR = seeded((cx * 31 + cz * 17) | 0);
  const n = Math.round(6.283 * r / .62);
  for (let course = 0; course < 3; course++) for (let k = 0; k < n; k++) { const a = (k + (course % 2) * .5) / n * 6.283; if (Math.abs(angDiff(a, gap)) < .45) continue;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r, y = hAt(bx, bz) + .11 + course * .2, s = orr(.92, 1.08);
    obox(bx, y, bz, .6 * s, .22, .36 * s, -a + Math.PI / 2 + orr(-.12, .12), orr(-.06, .06), "fBag", { col: [orr(.9, 1.05), orr(.9, 1.02), orr(.88, 1)] }); } }
function mdlCampCentre() {
  tube([0, 0, 0], [0, 5.2, 0], .07, 6, "pipeMetal", 1); box(-.06, 5.2, -.06, .06, 5.36, .06, "glowRed"); tube([0, 4.6, 0], [.6, 4.6, 0], .03, 4, "pipeMetal", 1); tube([.6, 4.6, 0], [.6, 5.3, 0], .02, 4, "pipeMetal", 1); banner(.04, 0, 0, .56, 3.4, 4.55);
  for (const a of [.3, 2.4, 4.5]) tube([0, 4.8, 0], [Math.cos(a) * 3, .04, Math.sin(a) * 3], .012, 3, "fCable", 1);
  crate(1.6, 0, -.2, .92, .5, .7, .2); crate(1.7, .5, -.15, .8, .44, .6, .35); crate(2.5, 0, .6, .7, .44, .6, -.4); barrel(2.4, -.9);
  box(-.2, 0, .6, .5, .7, 1.3, "fOD", { s: "scrRadar", n: "fGrille" }); box(-.22, .7, .58, .52, .74, 1.32, "podBrass");   // radio set
  // a fire pit: a ring of stones round glowing embers
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; obox(-1.8 + Math.cos(a) * .55, .1, 1 + Math.sin(a) * .55, .3, .2, .24, a, 0, "fRockProp"); }
  cyl(-1.8, 1, .02, .14, .38, 8, "glowFire", { r1: .2, cap: "glowFire" });
  for (const a of [.6, 1.9]) obox(-1.8 + Math.cos(a) * .2, .18, 1 + Math.sin(a) * .2, .08, .08, .7, a, .3, "fBark"); }

// ---------- the uplink station ----------
function mdlUplink() {
  box(-3.2, -.5, -3.2, 3.2, .06, 3.2, "plate2", { tile: .5 }); for (const [x0, z0, x1, z1] of [[-3.2, -3.2, 3.2, -3], [-3.2, 3, 3.2, 3.2], [-3.2, -3, -3, 3], [3, -3, 3.2, 3]]) box(x0, .06, z0, x1, .1, z1, "haz", { tile: 2 });
  consoleAt(0, 0, 0, 1, "scrRadar");
  // a tracking dish on a tripod
  for (const a of [0, 2.09, 4.19]) tube([2 + Math.cos(a) * .9, .06, -1.6 + Math.sin(a) * .9], [2, 1.6, -1.6], .045, 5, "pipeMetal", 1);
  box(1.8, 1.55, -1.8, 2.2, 1.85, -1.4, "fOD");
  xform(() => { dish(1.25, .5); for (const a of [0, 2.09, 4.19]) tube([Math.cos(a) * 1.1, .45, Math.sin(a) * 1.1], [0, 1.15, 0], .02, 4, "pipeMetal", 1); cyl(0, 0, 1.1, 1.3, .08, 6, "dark", { cap: "dark" }); }, { t: [2, 1.9, -1.6], pitch: -.75, yaw: -.6 });
  // antenna mast with a light
  tube([-2.2, .06, -2.2], [-2.2, 6.5, -2.2], .07, 6, "pipeMetal", 1); banner(-2.2, -2.2, -Math.PI / 4, .9, 3.6, 5.2); tube([-2.8, 6, -2.2], [-1.6, 6, -2.2], .04, 4, "pipeMetal", 1); box(-2.28, 6.5, -2.28, -2.12, 6.68, -2.12, "glowRed");
  for (const a of [.8, 2.9, 5]) tube([-2.2, 5.6, -2.2], [-2.2 + Math.cos(a) * 2.6, .06, -2.2 + Math.sin(a) * 2.6], .012, 3, "fCable", 1);
  // a field generator and a stack of crates, cables everywhere
  box(-2.6, .06, 1.4, -1.4, .9, 2.4, "fOD", { e: "fGrille", w: "fGrille" }); box(-2.62, .9, 1.38, -1.38, .95, 2.42, "podBrass"); emblem(-2, .5, 2.405, 0, .6); cyl(-2.3, 1.7, .9, 1.4, .06, 6, "pipeMetal");
  crate(2.1, .06, 1.9, .9, .5, .7, .3); crate(2.15, .56, 1.95, .8, .44, .6, .6);
  cable([[-1.4, .3, 1.9], [-.6, .08, 1.2], [0, .08, .6], [0, .3, .2]]); cable([[1.8, 1.6, -1.6], [1.2, .08, -1], [.3, .08, -.3]]); cable([[-2.2, .5, -2.2], [-1, .08, -1.2], [-.2, .2, -.1]]);
  for (const [x, z] of [[-3, 3], [3, 3], [3, -3]]) { tube([x, .06, z], [x, 1.6, z], .04, 4, "dark", 1); box(x - .12, 1.6, z - .12, x + .12, 1.72, z + .12, "glowWhite"); } }

// ---------- bug holes: a lumpy mound of flesh and chitin round a dark throat ----------
function mdlHive(dead) { OR = seeded(dead ? 91 : 93);
  if (!dead) {
    lathe(0, 0, [[2.8, -.4], [2.5, .35], [2.0, .95], [1.45, 1.35], [1.05, 1.42], [.95, 1.2], [.7, .7]], 14, "fFlesh");
    annulus(0, .72, 0, 0, .72, 12, "fHole");
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + orr(-.2, .2), d = orr(1.5, 2.5); blob(Math.cos(a) * d, orr(.2, .6), Math.sin(a) * d, orr(.5, .9), orr(.35, .6), orr(.5, .9), "fFlesh", [1, .95, .9], k * 7); }
    // chitin spines leaning out of the rim
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + orr(-.3, .3), h = orr(1.2, 2.4); xform(() => cyl(0, 0, 0, h, orr(.12, .2), 5, "fChitin", { r1: .02 }), { t: [Math.cos(a) * 1.2, 1.1, Math.sin(a) * 1.2], yaw: -a + Math.PI / 2, pitch: orr(.3, .7) }); }
  } else {
    lathe(0, 0, [[2.8, -.4], [2.4, .2], [1.6, .38], [.8, .42], [.2, .3]], 14, "fFlesh"); ground(3.6);
    for (let k = 0; k < 5; k++) { const a = orr(0, 6.28), d = orr(1, 3); xform(() => cyl(0, 0, 0, orr(.8, 1.6), .14, 5, "fChitin", { r1: .02, col: CHAR }), { t: [Math.cos(a) * d, .15, Math.sin(a) * d], yaw: orr(0, 6), pitch: 1.45 }); }
  } }

// ---------- the crashed shuttle (black box missions) ----------
function mdlWreck() { OR = seeded(55);
  // everything rests on (or digs into) the flat ground round the crash: the hull halves lie on their sides
  const R0 = 1.45, lie = (fn, x, z, yaw, sink = .2) => xform(fn, { t: [x, R0 * (1 - sink), z], roll: -Math.PI / 2, yaw });   // a lathe along +x, sunk into the dirt
  // the forward section: nose cone, cockpit glass, the torn end facing the rear
  lie(() => { lathe(0, 0, [[.06, 0], [.85, .6], [1.3, 1.5], [R0, 2.6], [R0, 5]], 12, "hullOut"); annulus(0, 5, 0, .7, R0, 12, "dark"); annulus(0, 5.01, 0, 0, .7, 10, "fHole"); }, -4.2, -1.2, .15);
  obox(-3.1, 2.15, -1.4, 1.5, .35, 1.3, -Math.PI / 2 + .15, .45, "fGlass" in R3.tex ? "fGlass" : "dark");   // the canopy glass on top of the nose
  // the rear section, torn off and spun round on impact, with its engines and tail fin
  lie(() => { lathe(0, 0, [[R0, 0], [R0, 2.8], [1.2, 3.8], [.95, 4.3]], 12, "hullOut"); annulus(0, 0, 0, .7, R0, 12, "dark"); annulus(0, .01, 0, 0, .7, 10, "fHole");
    for (const s of [-1, 1]) xform(() => cyl(0, 0, 4.2, 5, .42, 8, "dark", { r1: .55 }), { t: [0, 0, s * .6] }); }, 2.2, 2.4, -.5, .15);
  const ry = -.5, ax = Math.cos(ry), az = -Math.sin(ry), at = (d, side) => [2.2 + ax * d - az * side, 2.4 + az * d + ax * side];
  { const [fx, fz] = at(2.6, 0), yaw = ry + Math.PI / 2, fy = R0 * .85 + R0 + .55; obox(fx, fy, fz, .18, 1.6, 1.6, yaw, 0, "hullOut3");
    for (const s of [-1, 1]) emblem(fx + Math.cos(yaw) * s * .1, fy, fz - Math.sin(yaw) * s * .1, yaw + Math.PI / 2 * s, 1.1); }   // tail fin standing up off the rear
  // wings: one still on the nose section's flank, flat on the ground; one snapped off and lying on its own
  obox(-2.6, .16, 1.7, 5.2, .22, 2.2, .15 + Math.PI / 2 + Math.PI / 2, .03, "hullOut3"); obox(-2.2, .28, 1.4, .5, .3, .5, .15, 0, "dark");
  obox(5.2, .16, -2.6, 3.2, .18, 1.8, -.8, .06, "hullOut3", { col: CHAR });
  // debris resting on the ground, panels half-buried, a few cables trailing out of the break
  for (let k = 0; k < 18; k++) { const w = orr(.25, 1), h = orr(.06, .22), d = orr(.25, .8), a = orr(0, 6.28), r = orr(3, 8); obox(Math.cos(a) * r, h / 2 - .02, Math.sin(a) * r, w, h, d, orr(0, 6), orr(-.08, .08), OR() < .5 ? "hullOut3" : "dark", { col: OR() < .5 ? CHAR : undefined }); }
  for (let k = 0; k < 3; k++) obox(orr(-1, 1), .35, orr(-.8, 1.2), 1.2, .08, .8, orr(0, 6), orr(.5, .8), "hullOut3", { col: CHAR });   // panels stuck in the dirt at an angle
  cable([[-.2, 1.1, -.4], [.2, .05, .4], [1, .05, 1.4]], .03); cable([[-.2, .7, -1.6], [.6, .05, -1.2]], .03);
  // the scorched crater and the furrow it ploughed on the way in
  annulus(0, .03, 0, 0, 5, 14, "fScorch"); annulus(-7.5, .035, -2.4, 0, 3.2, 12, "fScorch"); annulus(-11.5, .036, -3.6, 0, 2.2, 10, "fScorch"); }

// ---------- more textures: habitat panels, paint, stone ----------
function objTextures2() { const N = (x, y, s, a) => (hash2(x, y, s) - .5) * a;
  TXD.fHab = tex(32, 32, (x, y) => { if (x % 8 === 0) return [120, 122, 118]; if (y === 0 || y === 31) return [98, 100, 96]; const g = y > 24 ? (y - 24) * 4 : 0, st = hash2(x >> 2, y >> 3, 401) > .93 ? 18 : 0;
    return [178 - g - st, 176 - g - st, 166 - g - st].map(v => v + N(x, y, 402, 6)); });
  TXD.fPaint = tex(4, 4, () => [214, 178, 58]);
  TXD.fWindow = tex(16, 16, (x, y) => x === 0 || y === 0 ? [60, 62, 60] : Math.abs(x - y - 3) < 2 ? [120, 140, 150] : [34, 46, 56].map(v => v + y));
  TXD.fSolar = tex(16, 16, (x, y) => x % 4 === 0 || y % 4 === 0 ? [150, 160, 170] : [34, 52, 92].map(v => v + (x + y) % 3 * 6));
  TXD.fStone = tex(32, 32, (x, y) => { const n = fbm(x / 6, y / 6, 403), crack = Math.abs(Math.sin(x * .6 + y * .25 + n * 4)) < .04, moss = fbm(x / 4, y / 9, 404) > .62 && y > 18;
    if (crack) return [40, 42, 40]; if (moss) return [70, 92, 54]; return [104 + n * 30, 106 + n * 28, 98 + n * 24].map(v => v + N(x, y, 405, 8)); });
  if (R3.gl) for (const k of ["fHab", "fPaint", "fSolar", "fStone", "fWindow"]) R3.tex[k] = glTex(TXD[k]); }

// ---------- points of interest ----------
// xeno ruins: a ring of tapered, carved monoliths (some fallen) on a stepped stone dais, round a glowing crystal altar
function mdlRuins(seed) { OR = seeded(seed); const S = "fStone";
  lathe(0, 0, [[7.6, -.3], [7.6, .15], [6.9, .2], [6.9, .45], [5.4, .5], [5.4, .75], [0, .78]], 16, S);
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, x = Math.cos(a) * 7.1, z = Math.sin(a) * 7.1, h = orr(3.6, 5.5);
    if (k === 2 || k === 6) { xform(() => { cyl(0, 0, 0, h, .75, 5, S, { r1: .45, tile: 1, tv: 2 }); cyl(0, 0, h * .55, h * .62, .7, 5, "fRune", { r1: .66 }); }, { t: [x + Math.cos(a) * 1.6, .45, z + Math.sin(a) * 1.6], yaw: -a, pitch: 1.5, roll: orr(-.2, .2) }); continue; }   // fallen
    if (k === 4) { cyl(x, z, -.2, h * .45, .78, 5, S, { r1: .6, cap: S }); for (let q = 0; q < 3; q++) obox(x + orr(-2, 2), .3, z + orr(-2, 2), orr(.6, 1.1), orr(.4, .7), orr(.5, .9), orr(0, 6), orr(-.3, .3), S); continue; }   // broken stump + rubble
    xform(() => { cyl(0, 0, -.3, h, .78, 5, S, { r1: .42, tile: 1, tv: 2 }); cyl(0, 0, h * .6, h * .68, .62, 5, "fRune", { r1: .6 }); cyl(0, 0, h, h + .5, .42, 5, S, { r1: .05 }); }, { t: [x, .2, z], yaw: -a, pitch: orr(-.07, .07) }); }
  // an arch over the way in
  for (const s of [-1, 1]) cyl(Math.cos(3.4) * 7.2 + s * Math.sin(3.4) * 1.6, Math.sin(3.4) * 7.2 - s * Math.cos(3.4) * 1.6, .2, 4.6, .55, 6, S, { r1: .45 });
  obox(Math.cos(3.4) * 7.2, 4.85, Math.sin(3.4) * 7.2, 4.4, .6, 1, -3.4 + Math.PI / 2, 0, S, { front: "fRune", back: "fRune" });
  // the altar and its crystal
  lathe(0, 0, [[1.6, .75], [1.6, 1.15], [1.2, 1.25], [1.2, 1.6], [1.5, 1.7], [0, 1.72]], 8, S);
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; xform(() => cyl(0, 0, 0, orr(.7, 1.3), .14, 5, "glowGreenS", { r1: .01 }), { t: [Math.cos(a) * .35, 1.7, Math.sin(a) * .35], yaw: -a, pitch: orr(.2, .45) }); }
  cyl(0, 0, 1.7, 3.2, .26, 6, "glowGreenS", { r1: .02 });
  for (let k = 0; k < 10; k++) { const a = orr(0, 6.28), d = orr(8.2, 11); obox(Math.cos(a) * d, .2, Math.sin(a) * d, orr(.4, 1.2), orr(.3, .6), orr(.4, 1), orr(0, 6), orr(-.3, .3), S); } }
// a supply cache: an opened supply container with crates and ammo, a green marker beacon and a spilled chute
function mdlCache() {
  box(-1.3, 0, -.9, 1.3, .12, .9, "dark");
  box(-1.3, .12, -.9, 1.3, 1.5, -.82, "fOD"); box(-1.3, .12, .82, 1.3, 1.5, .9, "fOD"); box(-1.3, .12, -.9, -1.22, 1.5, .9, "fOD"); box(-1.3, 1.5, -.9, 1.3, 1.6, .9, "fOD", { top: "fOD" });
  box(1.22, 1.2, -.9, 1.3, 1.5, .9, "haz", { tile: 2 });
  obox(1.75, .06, -.5, 1.2, .08, 1.4, .3, 0, "fOD"); obox(1.75, .06, .9, 1.1, .08, .9, -.2, 0, "fOD");   // the doors, swung open and dropped
  crate(-.5, .12, -.3, .9, .5, .7, .05); crate(-.5, .62, -.3, .8, .44, .6, -.1); crate(.45, .12, .3, .7, .44, .6, .2); box(.2, .12, -.75, .9, .4, -.35, "ammo", { tile: 1 });
  box(-1.33, 1.1, -.92, 1.33, 1.16, .92, "glowGreenS"); box(-1.32, 1.5, -.92, 1.32, 1.54, .92, "podBrass"); emblem(-.2, .7, .905, 0, .7); emblem(-.2, .7, -.905, Math.PI, .7);
  tube([-1.6, 0, 1.3], [-1.6, 2.8, 1.3], .04, 5, "pipeMetal", 1); box(-1.68, 2.8, 1.22, -1.52, 3, 1.38, "glowGreenS");
  const m = mb("fTent").mb; for (let k = 0; k < 6; k++) { const a0 = -1 + k * .25, a1 = a0 + .25, r = 2.6, y = (a) => .05 + Math.sin((a + 1) * 4) * .08; m.quad([-1.2, .05, 1.2], [-1.2, .05, 1.2], [-1.2 + Math.cos(a1) * r, y(a1), 1.2 + Math.sin(a1) * r + 1], [-1.2 + Math.cos(a0) * r, y(a0), 1.2 + Math.sin(a0) * r + 1], [0, 1, 0], [0, 0, 1, 1], [.85, .82, .7]); }
  cable([[-1.2, .05, 1.2], [-2.6, .05, 2.4]], .015); }
// a colony outpost: a prefab habitat, a storage container, a water tower, solar panels, jersey barriers and lights
function mdlOutpost(C, W) { OR = seeded(717); const H = 3.2, wallC = (x0, z0, x1, z1, r = .3) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (r * 1.6)); for (let i = 0; i <= n; i++) { const [x, z] = W(lerp(x0, x1, i / n), lerp(z0, z1, i / n)); C.push([x, z, r, 3.4]); } };
  // the habitat: walls with windows, a door, an overhanging roof, kit on the roof
  box(-6.3, -.3, -4.3, 2.3, .15, 2.3, "dark");
  box(-6, .15, -4, 2, H, -3.8, "fHab"); box(-6, .15, -4, -5.8, H, 2, "fHab"); box(1.8, .15, -4, 2, H, 2, "fHab");
  box(-6, .15, 1.8, -3.2, H, 2, "fHab"); box(-1.8, .15, 1.8, 2, H, 2, "fHab"); box(-3.2, 2.3, 1.8, -1.8, H, 2, "fHab");   // front wall with the doorway
  box(-3.25, .15, 1.95, -3.15, 2.35, 2.12, "haz"); box(-1.85, .15, 1.95, -1.75, 2.35, 2.12, "haz");
  for (const [x0, z0, x1, z1] of [[-5.2, 1.98, -3.8, 2.02], [-.8, 1.98, 1.2, 2.02], [-5.2, -4.02, -2.8, -3.98], [-1.6, -4.02, .8, -3.98]]) box(x0, 1.5, z0, x1, 2.4, z1, "fWindow");
  box(-6.02, 1.5, -2.6, -5.98, 2.4, -.4, "fWindow"); box(1.98, 1.5, -2.6, 2.02, 2.4, .2, "fWindow");
  box(-6.4, H, -4.4, 2.4, H + .25, 2.5, "fOD", { top: "fOD", bottom: "dark" }); for (const x of [-4.2, -.2]) box(x - .6, H - .06, -1.15, x + .6, H, -.85, "dark", { bottom: "glowWhite" });   // ceiling lights box(-5.8, .15, -3.8, 1.8, .2, 1.8, "plate2", { tile: 1 });
  box(-1.6, H + .25, -3.4, .2, H + 1.05, -2, "fOD", { n: "fGrille", s: "fGrille" }); tube([-4.8, H + .25, -3], [-4.8, H + 3.8, -3], .05, 5, "pipeMetal", 1); box(-4.88, H + 3.8, -3.08, -4.72, H + 3.95, -2.92, "glowRed");
  xform(() => dish(.7, .28), { t: [-4.1, H + 2.4, -3], pitch: -.9, yaw: .6 });
  box(-5.4, .15, -3.6, -3.8, .8, -2.8, "fCrate", { top: "fOD" }); box(-.6, .15, -3.6, 1.4, .8, -2.9, "dark"); obox(.4, 1.15, -3.25, 1.2, .7, .06, 0, -.15, "dark", { front: "scrRadar" }); box(-.2, .8, -3.05, 1, .84, -2.85, "dark", { top: "keys" });   // inside: a cot, and the colony terminal: a desk, a screen and a keyboard
  wallC(-6, -4, 2, -4); wallC(-6, -4, -6, 2); wallC(2, -4, 2, 2); wallC(-6, 2, -3.45, 2); wallC(-1.55, 2, 2, 2);   // thin walls, and a doorway you can walk through
  // the storage container: ribbed walls, doors at the end
  box(3.2, 0, -4.2, 9, 2.5, -1.8, "fOD", { e: "fGrille" }); for (let x = 3.6; x < 9; x += .6) { box(x, .05, -4.25, x + .1, 2.45, -4.18, "fOD"); box(x, .05, -1.82, x + .1, 2.45, -1.75, "fOD"); }
  box(3.1, 2.5, -4.3, 9.1, 2.6, -1.7, "dark"); wallC(4.2, -3, 8, -3, 1.2);
  box(9.02, .5, -3.6, 9.06, 2.1, -2.4, "dark", { e: "fGrille" }); box(9.03, 2.15, -3.1, 9.08, 2.3, -2.9, "glowGreenS");   // the supply locker doors at the end
  // the water tower
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tube([6.5 + dx * .95, 0, 3.4 + dz * .95], [6.5 + dx * .75, 3, 3.4 + dz * .75], .06, 5, "pipeMetal", 1);
  for (const y of [1, 2]) for (let i = 0; i < 4; i++) { const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]], [a, b] = [P[i], P[(i + 1) % 4]], k = y === 1 ? .88 : .8; tube([6.5 + a[0] * k, y, 3.4 + a[1] * k], [6.5 + b[0] * k, y, 3.4 + b[1] * k], .03, 4, "pipeMetal", 1); }
  cyl(6.5, 3.4, 3, 5.2, 1.25, 12, "fHab", { cap: "fOD", tile: 2 }); cyl(6.5, 3.4, 5.2, 5.6, 1.25, 12, "fOD", { r1: .3, cap: "fOD" });
  for (let y = .3; y < 5; y += .45) box(7.75, y, 3.3, 7.8, y + .04, 3.5, "pipeMetal"); tube([7.77, 0, 3.3], [7.77, 5.2, 3.3], .02, 3, "pipeMetal", 1); tube([7.77, 0, 3.5], [7.77, 5.2, 3.5], .02, 3, "pipeMetal", 1);
  C.push([...W(6.5, 3.4), 1.3, 5.6]);
  // solar panels
  for (let i = 0; i < 3; i++) { const x = -5 + i * 2.3; tube([x, 0, 5.4], [x, .9, 5.4], .04, 4, "dark", 1); obox(x, 1.2, 5.6, 2, .06, 1.3, 0, .5, "fSolar", { side: "dark", bottom: "dark" }); C.push([...W(x, 5.5), .7, 1.4]); }
  // jersey barriers and a lamp
  for (let i = 0; i < 6; i++) { const a = -.9 + i * .38, r = 10.5, x = Math.cos(a) * r, z = Math.sin(a) * r, yaw = -a + Math.PI / 2 + orr(-.15, .15);
    obox(x, .25, z, 1.9, .5, .7, yaw, 0, "fConcrete"); obox(x, .7, z, 1.9, .5, .32, yaw, 0, "fConcrete"); obox(x, .62, z, 1.92, .12, .5, yaw, 0, "haz"); C.push([...W(x, z), 1, 1]); }
  tube([-7.5, 0, 3.5], [-7.5, 4.2, 3.5], .07, 6, "pipeMetal", 1); tube([-7.5, 4.2, 3.5], [-6.8, 4.4, 3.5], .05, 5, "pipeMetal", 1); box(-6.95, 4.25, 3.35, -6.55, 4.35, 3.65, "glowWhite"); C.push([...W(-7.5, 3.5), .3, 4.2]);
  crate(-1, 0, 4.2, .9, .5, .7, .3); crate(-.9, .5, 4.25, .8, .44, .6, .5); barrel(.4, 4.6); barrel(1.1, 4.2); C.push([...W(-.3, 4.4), 1.2, 1]); }

// ---------- the extraction pad: a raised octagonal platform with markings, edge lights, floodlights and a beacon mast ----------
function mdlExtractPad() {
  cyl(0, 0, -.8, .18, 9.3, 8, "fOD", { tile: 6 }); cyl(0, 0, .14, .2, 9.32, 8, "podBrass", { tile: 8 }); cyl(0, 0, .18, .28, 9.3, 8, "plate2", { r1: 9, cap: "plate2", tile: 6 });
  annulus(0, .29, 0, 7.6, 8.1, 24, "haz"); annulus(0, .29, 0, 3.2, 3.6, 24, "fPaint");
  emblemFlat(0, .295, 0, 5.8, -Math.PI / 2);   // the Starfall sigil painted across the pad
  for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; box(Math.cos(a) * 8.75 - .14, .28, Math.sin(a) * 8.75 - .14, Math.cos(a) * 8.75 + .14, .4, Math.sin(a) * 8.75 + .14, k % 2 ? "glowRed" : "glowWhite"); }
  for (const a of [.4, 3.55]) obox(Math.cos(a) * 10.4, -.2, Math.sin(a) * 10.4, 3, .3, 2.6, -a + Math.PI / 2, -.2, "plate2", { side: "fOD" });   // ramps up onto the pad
  for (const a of [1.2, 2.4, 4.3, 5.4]) { const x = Math.cos(a) * 10.6, z = Math.sin(a) * 10.6; tube([x, -.2, z], [x, 5, z], .09, 6, "pipeMetal", 1);
    obox(x - Math.cos(a) * .3, 5.1, z - Math.sin(a) * .3, .9, .45, .5, -a - Math.PI / 2, -.5, "dark", { front: "glowWhite" }); if (a === 2.4 || a === 5.4) banner(x, z, -a, 1, 2.2, 4.0); }
  tube([-6.5, .28, -6.5], [-6.5, 7.5, -6.5], .1, 6, "pipeMetal", 1); for (let y = 1.5; y < 7.5; y += 1.5) tube([-6.5, y, -6.5], [-5.6, y + .7, -6.5], .03, 4, "pipeMetal", 1);
  box(-6.65, 7.5, -6.65, -6.35, 7.8, -6.35, "glowRed"); tube([-6.5, 7.8, -6.5], [-6.5, 9, -6.5], .025, 4, "pipeMetal", 1);
  box(9.6, -.2, -1.2, 11.6, .2, 1.2, "plate2"); consoleAt(10.5, 0, -1, 0, "scrAlert"); }
// ---------- stratagem hardware ----------
function mdlResupply() {   // a small Starfall pod, ramp down, supplies stacked inside
  xform(() => { podGeometry(); xform(() => xform(podDoorGeom, { t: [-DOOR.R, -DOOR.y0, 0] }), { t: [DOOR.R, DOOR.y0, 0], roll: DOOR_OPEN });
    const Y0 = POD.Y0; box(-.42, Y0, -.32, .18, Y0 + .5, .32, "fCrate", { top: "fOD" }); box(-.36, Y0 + .5, -.26, .12, Y0 + .86, .22, "ammo", { tile: 1 }); box(.2, Y0, -.25, .45, Y0 + .3, .1, "fCrate");
    annulus(0, POD.Y1 - .02, 0, 0, .55, 10, "dark"); annulus(0, POD.Y1 - .03, 0, .14, .2, 10, "glowGreenS"); }, { s: .62 }); }
// the sentry: three splayed legs on foot pads, a column, the turret ring and an ammo can with the sigil on it
function mdlSentryBase() {
  for (const a of [0, 2.09, 4.19]) { const ca = Math.cos(a), sa = Math.sin(a), f = [ca * .9, .04, sa * .9];
    tube([ca * .16, .64, sa * .16], f, .055, 6, "pipeMetal", 1); obox(f[0], .035, f[2], .28, .07, .2, -a + Math.PI / 2, 0, "dark", { top: "podIron" });
    tube([ca * .5, .34, sa * .5], [Math.cos(a + 2.09) * .5, .34, Math.sin(a + 2.09) * .5], .025, 4, "pipeMetal", 1); }
  cyl(0, 0, .3, .84, .14, 8, "fOD"); cyl(0, 0, .56, .62, .16, 8, "podBrass");
  cyl(0, 0, .82, .92, .32, 10, "fOD", { cap: "dark" }); cyl(0, 0, .9, .95, .33, 10, "podBrass");
  box(-.21, .34, .16, .21, .66, .38, "fOD", { n: "fGrille" }); box(-.22, .5, .155, .22, .54, .385, "podBrass"); emblem(0, .43, .385, 0, .2);
  box(-.03, .66, .25, .03, .7, .29, "glowGreenS"); }
// the gun head (pivot at the origin, firing down -z): an armoured housing with a sloped glacis and side cheeks,
// a sensor head, and either twin shrouded barrels or a six-tube rocket pod
function mdlSentryGun(rocket) {
  box(-.25, -.19, -.22, .25, .14, .38, "fOD", { e: "fGrille", w: "fGrille" });
  obox(0, .1, -.3, .5, .05, .3, 0, .55, "fOD", { top: "fOD" }); obox(0, -.12, -.3, .5, .05, .26, 0, -.5, "fOD");   // sloped glacis above and below the guns
  for (const s of [-1, 1]) { obox(s * .29, -.01, .02, .06, .4, .7, 0, 0, "fOD", { side: "fOD" }); box(s * .29 - .035, .19, -.33, s * .29 + .035, .215, .37, "podBrass"); emblem(s * .323, 0, .05, s > 0 ? Math.PI / 2 : -Math.PI / 2, .26); }
  box(-.2, -.17, .38, .2, .12, .5, "dark", { top: "podIron" });   // the feed box at the back
  box(-.09, .14, -.16, .09, .27, .05, "dark", { top: "podIron" }); box(-.05, .17, -.165, .05, .24, -.16, "glowGreenS"); tube([.07, .27, 0], [.07, .52, .05], .01, 3, "pipeMetal", 1);   // sensor head and whip aerial
  if (!rocket) {
    for (const x of [-.085, .085]) { tube([x, 0, -.3], [x, 0, -1.4], .034, 6, "pipeMetal", 1); tube([x, 0, -.3], [x, 0, -.82], .058, 6, "dark", 1);
      xform(() => { cyl(0, 0, 0, .12, .065, 6, "dark", { cap: "dark" }); cyl(0, 0, .52, .56, .062, 6, "podBrass"); }, { t: [x, 0, -1.52], pitch: Math.PI / 2 }); }
    box(-.15, -.05, -1.02, .15, .05, -.96, "dark");   // the barrel clamp
    tube([.2, -.12, .3], [.33, -.3, .2], .03, 4, "fCable", 1); }
  else {
    box(-.3, -.22, -.95, .3, .22, -.24, "fOD", { n: "dark" }); box(-.31, .2, -.96, .31, .23, -.23, "podBrass");
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = -.18 + i * .18, y = -.09 + j * .18; box(x - .065, y - .065, -.965, x + .065, y + .065, -.95, "podIron"); box(x - .035, y - .035, -.97, x + .035, y + .035, -.96, "glowRed"); } } }
// the Pelican's chin gun: a ball mount with a single long 30 mm cannon (pivot at the origin, firing down +x)
function mdlPelTurret() {
  lathe(0, 0, [[.05, -.5], [.36, -.42], [.5, -.12], [.48, .14], [.3, .34], [.05, .4]], 10, "hullOut3");
  for (const s of [-1, 1]) { obox(.05, 0, s * .47, .8, .5, .07, 0, 0, "hullOut3"); box(-.35, .24, s * .47 - .04, .45, .27, s * .47 + .04, "podBrass"); emblem(.05, 0, s * .51, s > 0 ? 0 : Math.PI, .34); }
  xform(() => { cyl(0, 0, 0, 2.8, .075, 8, "pipeMetal"); cyl(0, 0, .2, 1.05, .14, 8, "dark"); cyl(0, 0, 1.05, 1.12, .15, 8, "podBrass"); cyl(0, 0, 1.9, 1.95, .09, 8, "podBrass");
    cyl(0, 0, 2.7, 2.98, .12, 8, "dark", { cap: "dark" }); for (const s of [-1, 1]) box(s * .12 - .02, 2.76, -.05, s * .12 + .02, 2.92, .05, "glowRed"); }, { t: [.35, 0, 0], roll: -Math.PI / 2 });   // barrel, recoil sleeve, muzzle brake
  box(-.25, .3, -.1, .05, .44, .1, "dark"); box(-.12, .32, .1, -.02, .4, .105, "glowRed");   // targeting sensor
  tube([-.3, .1, .32], [-.85, .32, .55], .06, 5, "fCable", 1); }   // ammo chute up into the hull
function mdlSample() { for (let k = 0; k < 4; k++) { const a = k * 1.7; xform(() => cyl(0, 0, 0, [.5, .35, .3, .26][k], [.11, .08, .07, .06][k], 5, "fSample", { r1: .01 }), { t: [Math.cos(a) * .08 * k, 0, Math.sin(a) * .08 * k], yaw: a, pitch: k ? .45 : 0 }); }
  cyl(0, 0, 0, .06, .18, 6, "fStone", { r1: .14, cap: "fStone" }); }
function mdlBlackBox() { box(-.27, 0, -.19, .27, .32, .19, "fBox"); for (const x of [-.16, .16]) box(x - .03, -.005, -.2, x + .03, .325, .2, "dark");
  tube([-.12, .32, 0], [-.12, .4, 0], .015, 4, "dark", 1); tube([.12, .32, 0], [.12, .4, 0], .015, 4, "dark", 1); tube([-.12, .4, 0], [.12, .4, 0], .015, 4, "dark", 1); box(-.03, .32, .12, .03, .35, .17, "glowRed"); }
