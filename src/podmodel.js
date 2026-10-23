// =====================================================================================
//  THE STARFALL DROP POD: a squat five-sided armoured assault pod. Five heavy petals ring the body,
//  each one hinged at the base and held shut by explosive bolts; one of them is the door, and on
//  landing it blows and slams down into a ramp. Above them a brass collar, a stepped iron cone, five
//  stabiliser vanes and the guidance drum; below, a flared skirt with the retro nozzles.
//  Pod-local space: floor at y 0, the door faces +x. podInterior (fgen.js) sits inside this shell.
// =====================================================================================
const POD = { N: 5, HA: Math.PI / 5, Y0: .45, Y1: 2.04, A0: .8, A1: .585, T: .075 };
// the door is the petal facing +x, hinged along its bottom outer edge; a negative angle swings it out and down
const DOOR = { R: POD.A0, y0: POD.Y0, y1: POD.Y1, wy0: 1.25, wy1: 1.62, W: .19 }, DOOR_OPEN = -1.98;
function doorHinge(th) { return mChain(mT(DOOR.R, DOOR.y0, 0), mRz(th), mT(-DOOR.R, -DOOR.y0, 0)); }

// ---------- the livery kit: one armour style for everything, in our green or the enemy's crimson ----------
// Friendly paint matches the guns; enemy paint is Skull Company crimson. Brass trim and black iron are shared.
const PAINT = { F: { base: [74, 115, 68], dark: [40, 66, 38], lit: [112, 150, 100] }, E: { base: [118, 30, 28], dark: [44, 20, 18], lit: [168, 70, 58] } };
// building a model inside livery("E", fn) swaps its generic materials for the enemy versions (see mb() in base.js)
const LIVERY = {
  F: { fOD: "gPaintF", fCrate: "gCrateF", hullOut: "gHullF", hullOut3: "gPaintF", fHab: "gHabF", fTent: "gTentF", fDish: "gDish" },
  E: { fOD: "gPaintE", fCrate: "gCrateE", hullOut: "gHullE", hullOut3: "gPaintE", fHab: "gHabE", fTent: "gTentE", fDish: "gDish",
       podPetal: "podPetalE", podCone: "podConeE", podSigil: "podSkull", glowGreenS: "glowRed", fPaint: "gBone" } };
function livery(kind, fn) { const prev = R3.remap; R3.remap = LIVERY[kind] || null; try { return fn(); } finally { R3.remap = prev; } }
// a flat emblem facing (sin yaw, cos yaw): the Starfall sigil, or the skull when built in the enemy livery
function emblem(x, y, z, yaw, s, tex = "podSigil") { const r = [Math.cos(yaw) * s / 2, 0, -Math.sin(yaw) * s / 2], n = [Math.sin(yaw), 0, Math.cos(yaw)];
  mb(tex).mb.quad([x - r[0], y + s / 2, z - r[2]], [x + r[0], y + s / 2, z + r[2]], [x + r[0], y - s / 2, z + r[2]], [x - r[0], y - s / 2, z - r[2]], n); }

// a lying-flat emblem (pads, wings), rotated by rot about the vertical
function emblemFlat(x, y, z, s, rot = 0, tex = "podSigil") { const c = Math.cos(rot) * s / 2, d = Math.sin(rot) * s / 2, P = (u, v) => [x + u * c - v * d, y, z + u * d + v * c];
  mb(tex).mb.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), [0, 1, 0]); }
// a cloth banner hanging from a brass bar: from (x, z) out along (cos yaw, -sin yaw), facing (sin yaw, cos yaw), emblem on both faces
function banner(x, z, yaw, w, y0, y1) { const dx = Math.cos(yaw), dz = -Math.sin(yaw), nx = Math.sin(yaw), nz = Math.cos(yaw), m = mb("fTent").mb, k = .2;
  m.quad([x, y1, z], [x + dx * w, y1, z + dz * w], [x + dx * w, y0 + k, z + dz * w], [x, y0 + k, z], [nx, 0, nz], [0, 0, 1, 1.5]);
  m.tri([x, y0 + k, z], [x + dx * w, y0 + k, z + dz * w], [x + dx * w / 2, y0, z + dz * w / 2], [nx, 0, nz], [0, 1], [1, 1], [.5, 1.2]);   // a swallowtail point
  tube([x - dx * .05, y1 + .02, z - dz * .05], [x + dx * (w + .08), y1 + .02, z + dz * (w + .08)], .025, 5, "podBrass", 1);
  for (const s of [-1, 1]) emblem(x + dx * w / 2 + nx * s * .012, (y0 + y1) / 2 + .05, z + dz * w / 2 + nz * s * .012, s > 0 ? yaw : yaw + Math.PI, Math.min(w * .85, (y1 - y0) * .7)); }

function podTextures() {
  if (TXD.podPetal && R3.tex.podPetal) return;
  const N = (x, y, s, a) => (hash2(x, y, s) - .5) * a, IRON = [58, 58, 62], RIVET = [150, 146, 136];
  const chip = (x, y, s) => hash2(x, y, s) > .985 || fbm(x / 3, y / 3, s + 1) > .8;
  // a petal: an iron frame with rivets round a painted armour face, plate seams and chipped paint
  const petal = P => (x, y) => {
    const fr = x < 3 || x > 28 || y < 3 || y > 60;
    if (fr) { if ((x === 1 || x === 30) && y % 5 === 2) return RIVET; if ((y === 1 || y === 62) && x % 5 === 2) return RIVET;
      return (x === 0 || x === 31 || y === 0 || y === 63) ? [22, 22, 24] : IRON.map(v => v + N(x, y, 401, 8)); }
    if (x === 3 || y === 3) return P.dark.map(v => v * .55);
    if (x === 28 || y === 60) return P.lit;
    if (y === 22 || y === 42) return P.dark; if (y === 23 || y === 43) return P.lit.map(v => v * .9);
    if ((y === 25 || y === 40 || y === 45 || y === 58) && (x === 6 || x === 25)) return RIVET;
    if (chip(x, y, 402)) return [84, 82, 84];
    const wear = 1 - Math.max(0, (y - 44) / 20) * .3; return P.base.map(v => v * wear + N(x >> 1, y >> 1, 404, 10)); };
  // a 1m armour plate that tiles: iron edge, rivets in the corners, a seam, chips
  const plate = P => (x, y) => { if (x === 0 || y === 0) return [24, 24, 26]; if (x === 1 || y === 1) return IRON;
    if (x === 31 || y === 31) return P.dark; if ((x === 4 || x === 27) && (y === 4 || y === 27)) return RIVET;
    if (y === 15) return P.dark; if (y === 16) return P.lit.map(v => v * .85); if (x === 2 || y === 2) return P.lit;
    if (chip(x, y, 410)) return [80, 78, 80]; return P.base.map(v => v * .92 + N(x >> 1, y >> 1, 411, 10)); };
  const crate = P => (x, y) => { if (x < 3 || y < 3 || x > 28 || y > 28) return ((x === 1 || x === 30) && (y === 1 || y === 30)) ? RIVET : IRON.map(v => v + N(x, y, 412, 6));
    if (y >= 13 && y <= 17) return y === 13 || y === 17 ? [92, 66, 28] : [196, 156, 70].map(v => v + N(x, 0, 413, 16));   // brass strap
    if (y > 4 && y < 11 && x > 7 && x < 24 && (x % 3 === 0) && (y === 6 || y === 9 || x % 6 === 0)) return [220, 210, 180];   // a stencil mark
    return P.base.map(v => v * (x % 8 === 0 ? .82 : .95) + N(x, y >> 2, 414, 8)); };
  const cone = P => (x, y) => { if (y >= 20 && y <= 25) return y % 2 ? [20, 20, 22] : [70, 70, 74];
    if ((x >= 6 && x <= 8) || (x >= 23 && x <= 25)) return P.base.map(v => v * .95 + N(x, y, 406, 8));
    if (x % 16 === 0) return [28, 28, 30]; return [56, 56, 60].map(v => v + N(x >> 1, y >> 1, 407, 8)); };
  // prefab panels (outposts): painted lower band, pale upper plates
  const hab = P => (x, y) => { if (x % 16 === 0) return [36, 36, 38]; if (y === 0 || y === 31) return [30, 30, 32]; if (y >= 22) return y === 22 ? [196, 156, 70] : P.base.map(v => v * .9 + N(x, y, 415, 8));
    if ((x % 16 === 3 || x % 16 === 12) && (y === 3 || y === 19)) return RIVET; return [92, 92, 90].map(v => v + N(x >> 1, y >> 1, 416, 8)); };
  // canvas
  const tent = P => (x, y) => { const b = fbm(x / 7, y / 7, 305), seam = y % 16 === 0, c = (b > .6 ? P.dark : b > .45 ? P.base.map(v => v * .8) : P.base.map(v => v * .65)); return seam ? c.map(v => v * .6) : c.map(v => v + N(x, y, 306, 6)); };
  // hull plating for craft (the wreck): long plates with a stripe
  const hullP = P => (x, y) => { if (y % 16 === 0) return [26, 26, 28]; if (x % 32 === 0) return [36, 36, 40]; if (y % 32 >= 24 && y % 32 <= 26) return [196, 156, 70];
    if ((x % 16 === 4) && (y % 16 === 3)) return RIVET; return P.base.map(v => v * .85 + N(x >> 1, y >> 1, 417, 10)); };
  for (const k of ["F", "E"]) { const P = PAINT[k];
    TXD["podPetal" + (k === "F" ? "" : "E")] = tex(32, 64, petal(P)); TXD["podCone" + (k === "F" ? "" : "E")] = tex(32, 32, cone(P));
    TXD["gPaint" + k] = tex(32, 32, plate(P)); TXD["gCrate" + k] = tex(32, 32, crate(P)); TXD["gHab" + k] = tex(32, 32, hab(P)); TXD["gTent" + k] = tex(32, 32, tent(P)); TXD["gHull" + k] = tex(32, 64, hullP(P)); }
  TXD.gBone = tex(4, 4, () => [214, 204, 176]);
  TXD.gDish = tex(32, 32, (x, y) => { const r = Math.hypot(x - 15.5, y - 15.5); if (Math.abs(r - 14.5) < .8 || Math.abs(r - 7) < .6) return [196, 156, 70]; return Math.abs(r % 4 - 2) < .5 ? [40, 40, 44] : [70, 70, 76].map(v => v + N(x >> 2, y >> 2, 418, 8)); });
  // blackened iron with rivet rows, for the skirt, ribs, vanes and the kick plates
  TXD.podIron = tex(32, 32, (x, y) => { if (y % 16 === 0) return [24, 24, 26]; if (y % 16 === 1) return [86, 86, 90];
    if (y % 16 === 4 && x % 6 === 3) return [140, 138, 132]; return [50, 50, 54].map(v => v + N(x, y >> 1, 405, 8) + (x % 16 === 0 ? -14 : 0)); });
  // polished brass trim with a highlight line
  TXD.podBrass = tex(16, 16, (x, y) => { if (y === 0 || y === 15) return [70, 52, 24]; if (y === 3) return [246, 214, 130]; const k = 1 - Math.abs(y - 6) / 14;
    return [196 * k + 30, 150 * k + 20, 64 * k + 10].map(v => v + N(x, y, 408, 10)); });
  TXD.podInner = tex(32, 32, (x, y) => { if (x === 0 || y === 0) return [30, 32, 36]; if (x % 8 === 4 && y % 8 === 4) return [110, 112, 116]; return [66, 68, 74].map(v => v + N(x, y, 409, 8)); });
  // the Starfall sigil: a falling star with swept wings, picked out in brass and bone over a dark outline
  const S = (x, y) => { const cx = 15.5, dx = Math.abs(x - cx), dy = y - 4;
    if (dy >= 0 && dy <= 22 && dx <= Math.max(0, 6 - dy * .26) + (dy > 14 ? -(dy - 14) * .55 + 1.5 : 0) && dx <= 6.5 - Math.max(0, dy - 15) * .8) return 2;   // the star's tail and head
    const wy = y - 8 - dx * .45; if (dx > 4 && dx < 15.5 && wy >= 0 && wy < 3.2 - dx * .12) return 1;                                                      // the wings
    if (dx > 6 && dx < 13 && Math.abs(y - 14 - dx * .5) < 1 && (x & 1)) return 1;
    return 0; };
  const outlined = (F, paint) => tex(32, 32, (x, y) => { const v = F(x, y); if (v) return paint(v, x, y);
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (F(x + ox, y + oy) === 1 || F(x + ox, y + oy) === 2) return [16, 12, 12];
    return null; });
  TXD.podSigil = outlined(S, (v, x, y) => v === 2 ? ((Math.abs(x - 15.5) < 1.2 && y > 6 && y < 20) ? [255, 242, 196] : [222, 196, 120]) : [196, 160, 80]);
  // the Skull Company mark: a grinning skull over a pair of crossed blades
  const K = (x, y) => { const cx = 15.5, dx = x - cx;
    if ((Math.hypot(dx / 3.2, (y - 13.5) / 2.8) < 1 && x < cx) || (Math.hypot(-dx / 3.2, (y - 13.5) / 2.8) < 1 && x > cx)) return 3;           // eye sockets (handled below)
    const cran = Math.hypot(dx / 10, (y - 12) / 9.5) < 1 && y < 19, jaw = y >= 17 && y <= 26 && Math.abs(dx) < 7.5 - Math.max(0, y - 23) * 1.2;
    if (cran || jaw) { if (y >= 17 && y <= 19 && Math.abs(dx) < 1.6 - (y - 17) * .5 + 1) return 3;   // nose
      if (y >= 22 && y <= 25 && Math.abs(dx) < 6 && Math.round(dx + 15.5) % 3 === 0) return 3;            // teeth gaps
      if (y === 21 && Math.abs(dx) < 6) return 3;
      return 1; }
    for (const s of [-1, 1]) { const u = (x - cx) * s + (y - 24) * .9; if (Math.abs(u) < 1.2 && y > 15 && y < 31 && Math.abs(x - cx) > 7) return 2; }   // the blades behind it
    return 0; };
  TXD.podSkull = tex(32, 32, (x, y) => { const v = K(x, y);
    if (v === 1) return y < 9 ? [236, 228, 204] : [214, 204, 176].map(c => c - (y > 20 ? 18 : 0));
    if (v === 2) return [170, 172, 178]; if (v === 3) return (y >= 12 && y <= 14 && Math.abs(Math.abs(x - 15.5) - 4.5) < 1) ? [255, 60, 40] : [20, 14, 14];
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (K(x + ox, y + oy) === 1 || K(x + ox, y + oy) === 2) return [16, 12, 12];
    return null; });
  const keys = ["podPetal", "podPetalE", "podCone", "podConeE", "podIron", "podBrass", "podInner", "podSigil", "podSkull", "gBone", "gDish"];
  for (const k of ["F", "E"]) keys.push("gPaint" + k, "gCrate" + k, "gHab" + k, "gTent" + k, "gHull" + k);
  if (R3.gl) for (const k of keys) R3.tex[k] = glTex(TXD[k]);
}

// ---------- the petal frame: everything is placed on a face by (f across, y up, d out) ----------
const podAp = y => POD.A0 + (POD.A1 - POD.A0) * (y - POD.Y0) / (POD.Y1 - POD.Y0);
const podHW = (y, d = 0) => (podAp(y) + d) * Math.tan(POD.HA);
const POD_SLOPE = (POD.A0 - POD.A1) / (POD.Y1 - POD.Y0);
// f is -1..1 of the face's half width at that height; at |f| = 1 the edge is mitred to meet the next petal
function podPt(th, f, y, d = 0) { const c = Math.cos(th), s = Math.sin(th), r = podAp(y) + d, u = f * (Math.abs(f) >= 1 ? podHW(y, d) : podHW(y)); return [c * r - s * u, y, s * r + c * u]; }
const podN = (th, k = 1) => norm3([Math.cos(th) * k, POD_SLOPE * k, Math.sin(th) * k]);
const podTan = (th, k = 1) => [-Math.sin(th) * k, 0, Math.cos(th) * k];
const podBurn = y => { const k = clamp(.52 + y * .36, .52, 1); return [k, k * .96, k * .93]; };
// a patch of the face, texture-mapped as part of the whole petal
function podFace(th, f0, f1, y0, y1, d, tex, o = {}) { const { Y0, Y1 } = POD, U = f => (f + 1) / 2, V = y => (Y1 - y) / (Y1 - Y0), b1 = podBurn(y1), b0 = podBurn(y0);
  mb(tex).mb.quad(podPt(th, f1, y1, d), podPt(th, f0, y1, d), podPt(th, f0, y0, d), podPt(th, f1, y0, d), podN(th, o.flip ? -1 : 1), o.uv || [U(f1), V(y1), U(f0), V(y0)], o.flat ? [1, 1, 1] : [b1, b1, b0, b0]); }
// a raised plate on the face, with its four sides
function podRaise(th, f0, f1, y0, y1, d, tex, o = {}) { const sd = o.side || "podIron", b = o.base || 0, P = (t, f, y, dd) => podPt(t, f, y, dd === 0 ? b : dd);
  podFace(th, f0, f1, y0, y1, d, tex, { uv: o.uv || [0, 0, 1, 1], flat: o.flat });
  mb(sd).mb.quad(P(th, f0, y1, d), P(th, f1, y1, d), P(th, f1, y1, 0), P(th, f0, y1, 0), [0, 1, 0]);
  mb(sd).mb.quad(P(th, f1, y0, d), P(th, f0, y0, d), P(th, f0, y0, 0), P(th, f1, y0, 0), [0, -1, 0]);
  mb(sd).mb.quad(P(th, f0, y0, d), P(th, f0, y1, d), P(th, f0, y1, 0), P(th, f0, y0, 0), podTan(th, -1));
  mb(sd).mb.quad(P(th, f1, y1, d), P(th, f1, y0, d), P(th, f1, y0, 0), P(th, f1, y1, 0), podTan(th)); }
// the slab itself: outer skin (optionally with the porthole cut out), inner skin, and the mitred edges
function podSlab(th, win) { const { Y0, Y1, T } = POD, P = podPt, { wy0, wy1, W } = DOOR, fw = W / podHW((wy0 + wy1) / 2);
  const skin = (d, tex, flip) => { if (!win) return podFace(th, -1, 1, Y0, Y1, d, tex, { flip });
    podFace(th, -1, 1, Y0, wy0, d, tex, { flip }); podFace(th, -1, 1, wy1, Y1, d, tex, { flip }); podFace(th, -1, -fw, wy0, wy1, d, tex, { flip }); podFace(th, fw, 1, wy0, wy1, d, tex, { flip }); };
  skin(0, "podPetal"); skin(-T, "podInner", true);
  for (const s of [-1, 1]) mb("podIron").mb.quad(P(th, s, Y1, 0), P(th, s, Y1, -T), P(th, s, Y0, -T), P(th, s, Y0, 0), podTan(th, s));
  mb("podIron").mb.quad(P(th, -1, Y1, -T), P(th, 1, Y1, -T), P(th, 1, Y1, 0), P(th, -1, Y1, 0), [0, 1, 0]);
  mb("podIron").mb.quad(P(th, 1, Y0, -T), P(th, -1, Y0, -T), P(th, -1, Y0, 0), P(th, 1, Y0, 0), [0, -1, 0]);
  if (win) { // the porthole's reveal through the armour, and the glass set in the middle of it
    mb("dark").mb.quad(P(th, -fw, wy1, 0), P(th, fw, wy1, 0), P(th, fw, wy1, -T), P(th, -fw, wy1, -T), [0, -1, 0]);
    mb("dark").mb.quad(P(th, fw, wy0, 0), P(th, -fw, wy0, 0), P(th, -fw, wy0, -T), P(th, fw, wy0, -T), [0, 1, 0]);
    mb("dark").mb.quad(P(th, -fw, wy1, 0), P(th, -fw, wy0, 0), P(th, -fw, wy0, -T), P(th, -fw, wy1, -T), podTan(th));
    mb("dark").mb.quad(P(th, fw, wy0, 0), P(th, fw, wy1, 0), P(th, fw, wy1, -T), P(th, fw, wy0, -T), podTan(th, -1));
    for (let q = 0; q < 2; q++) { const ga = wy0 + (wy1 - wy0) * q / 2, gb = ga + (wy1 - wy0) / 2; podFace(th, -fw, fw, ga, gb, -T * .5, "podGlass", { uv: [1, .5 - q * .5, 0, 1 - q * .5], flat: true }); } } }
// the dressing on a petal: brass edging, bolt housings, a kick plate, a centre rib and the sigil
function podPetalDeco(th, door) { const { Y0, Y1 } = POD;
  for (const s of [-1, 1]) { podRaise(th, s > 0 ? .86 : -.97, s > 0 ? .97 : -.86, Y0 + .04, Y1 - .04, .022, "podBrass", { side: "podBrass", uv: [0, 0, 1, 6] });
    podRaise(th, s * .62, s * .8, Y1 - .3, Y1 - .13, .04, "podIron");                                                           // explosive bolt housings
    podRaise(th, s * .66, s * .76, Y1 - .25, Y1 - .19, .055, "glowRed", { side: "dark" }); }
  podRaise(th, -.86, .86, Y1 - .12, Y1 - .04, .024, "podBrass", { side: "podBrass", uv: [0, 0, 4, 1] });
  podRaise(th, -.86, .86, Y0 + .04, Y0 + .26, .03, "podIron", { uv: [0, 0, 3, 1] });
  podRaise(th, -.8, .8, Y0 + .26, Y0 + .3, .018, "podBrass", { side: "podBrass", uv: [0, 0, 4, 1] });
  if (door) { podFace(th, -.42, .42, .76, 1.12, .012, "podSigil", { uv: [1, 0, 0, 1], flat: true }); return; }
  podRaise(th, -.07, .07, Y0 + .3, 1.02, .03, "podIron"); podRaise(th, -.07, .07, 1.52, Y1 - .3, .03, "podIron");
  podFace(th, -.44, .44, 1.06, 1.48, .012, "podSigil", { uv: [1, 0, 0, 1], flat: true }); }
// hinge knuckles along a petal's bottom outer edge (alternating between the hull and the petal)
function podKnuckles(th, spans) { for (const [f0, f1] of spans) { const a = podPt(th, f0, POD.Y0, 0), b = podPt(th, f1, POD.Y0, 0); tube(a, b, .05, 7, "podBrass", 1); } }
const KN_HULL = [[-.55, -.17], [.17, .55]], KN_DOOR = [[-.9, -.6], [-.12, .12], [.6, .9]];

// a five-sided frustum from a profile of [apothem, y] points, corners lined up with the petals' corners
function podFrust(prof, texs, o = {}) { const n = POD.N, HA = POD.HA, k = 1 / Math.cos(HA);
  for (let j = 0; j < prof.length - 1; j++) { const [r0, y0] = prof[j], [r1, y1] = prof[j + 1], dr = r1 - r0, dy = y1 - y0, l = Math.hypot(dr, dy) || 1, m = mb(texs[j] || texs[texs.length - 1]).mb;
    for (let i = 0; i < n; i++) { const th = i * 2 * HA, a0 = th - HA, a1 = th + HA, P = (a, r, y) => [Math.cos(a) * r * k, y, Math.sin(a) * r * k], c0 = o.burn ? podBurn(y0) : [1, 1, 1], c1 = o.burn ? podBurn(y1) : [1, 1, 1];
      m.quad(P(a1, r1, y1), P(a0, r1, y1), P(a0, r0, y0), P(a1, r0, y0), [Math.cos(th) * dy / l, -dr / l, Math.sin(th) * dy / l], [0, 0, o.tu || 1, o.tv ? o.tv[j] : 1], [c1, c1, c0, c0]); } } }
// a flat vane standing out from a corner: a convex outline of [r, y] points, extruded either side
function podVane(phi, pts, th, tex) { const c = Math.cos(phi), s = Math.sin(phi), t = [-s, 0, c], P = (r, y, k) => [c * r + t[0] * k, y, s * r + t[2] * k], m = mb(tex).mb, h = th / 2;
  for (const k of [-h, h]) for (let i = 1; i < pts.length - 1; i++) m.tri(P(...pts[0], k), P(...pts[i], k), P(...pts[i + 1], k), k < 0 ? [-t[0], 0, -t[2]] : t, [pts[0][0], pts[0][1]], [pts[i][0], pts[i][1]], [pts[i + 1][0], pts[i + 1][1]]);
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1;
    m.quad(P(...a, -h), P(...b, -h), P(...b, h), P(...a, h), [c * dy / l, -dr / l, s * dy / l], [0, 0, 1, Math.max(1, Math.round(l * 3))]); } }

// ---------- the hull (everything but the door) ----------
function podGeometry() {
  const { Y0, Y1, HA, N } = POD, k = 1 / Math.cos(HA);
  // flared skirt with a brass lip where the petals sit
  podFrust([[.66, 0], [.86, .14], [.86, .24], [.8, .35], [.835, .35], [.835, Y0], [.5, Y0]], ["podIron", "podIron", "podIron", "podBrass", "podBrass", "podIron"], { burn: true, tv: [1, .5, 1, 1, .3, 1] });
  // the petals: four fixed, the door is its own model
  for (let i = 1; i < N; i++) { const th = i * 2 * HA; podSlab(th, false); podPetalDeco(th, false); podKnuckles(th, [...KN_HULL, ...KN_DOOR]); }
  podKnuckles(0, KN_HULL);
  // armoured ribs over the seams between petals
  for (let i = 0; i < N; i++) { const phi = HA + i * 2 * HA, ym = (Y0 + Y1) / 2, r = podAp(ym) * k + .035, yaw = Math.atan2(Math.cos(phi), Math.sin(phi));
    obox(Math.cos(phi) * r, ym, Math.sin(phi) * r, .06, Y1 - Y0 + .02, .1, yaw, POD_SLOPE * k, "podIron", { top: "podBrass" });
    for (const y of [.95, 1.6]) { const rr = podAp(y) * k + .09; obox(Math.cos(phi) * rr, y, Math.sin(phi) * rr, .08, .07, .04, yaw, 0, "podBrass"); } }
  // collar, stepped cone, guidance drum
  podFrust([[.5, Y1], [.635, Y1], [.635, Y1 + .09], [.59, Y1 + .09], [.44, 2.28], [.415, 2.28], [.2, 2.62], [.1, 2.62]], ["podBrass", "podBrass", "podBrass", "podCone", "podBrass", "podCone", "podIron"], { tv: [.3, 1, .3, 1, .3, 1, 1] });
  cyl(0, 0, 2.62, 2.76, .14, 10, "podIron", { cap: "podBrass" }); cyl(0, 0, 2.76, 2.8, .07, 8, "dark", { cap: "podBrass" });
  tube([0, 2.8, 0], [0, 2.97, 0], .018, 5, "podBrass", 1); box(-.025, 2.95, -.025, .025, 2.99, .025, "glowRed");
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 + .3; box(Math.cos(a) * .14 - .015, 2.66, Math.sin(a) * .14 - .015, Math.cos(a) * .14 + .015, 2.69, Math.sin(a) * .14 + .015, i % 2 ? "glowRed" : "glowWhite"); }
  // stabiliser vanes over the seams, brass-edged
  for (let i = 0; i < N; i++) { const phi = HA + i * 2 * HA, c = Math.cos(phi), s = Math.sin(phi), V = [[.6, 1.7], [1.03, 2.0], [1.01, 2.14], [.58, 2.58], [.36, 2.76], [.22, 2.7]];
    podVane(phi, V, .075, "podIron"); for (let j = 1; j < 4; j++) tube([c * V[j][0], V[j][1], s * V[j][0]], [c * V[j + 1][0], V[j + 1][1], s * V[j + 1][0]], .022, 5, "podBrass", 1); }
  // retro nozzles tucked under the skirt's flare
  for (let i = 0; i < N; i++) { const phi = HA + i * 2 * HA, r = .76 * k, x = Math.cos(phi) * r, z = Math.sin(phi) * r;
    cyl(x, z, .02, .14, .09, 8, "pipeMetal", { r1: .06 }); annulus(x, .025, z, 0, .075, 8, "glowRed"); }
  // floodlight over the door, deck plate round the floor
  const fl = [.635, Y1 + .045, 0]; box(fl[0] - .02, fl[1] - .03, -.12, fl[0] + .03, fl[1] + .03, .12, "glowWhite");
  for (let i = 0; i < N; i++) { const a0 = i * 2 * HA - HA, a1 = a0 + 2 * HA; mb("podIron").mb.tri([0, Y0, 0], [Math.cos(a1) * .8 * k, Y0, Math.sin(a1) * .8 * k], [Math.cos(a0) * .8 * k, Y0, Math.sin(a0) * .8 * k], [0, 1, 0], [.5, .5], [1, 0], [0, 0]); }
}

// ---------- the door petal, with its porthole ----------
function podDoorGeom() {
  const th = 0, { Y0, Y1, T } = POD, { wy0, wy1, W } = DOOR, fw = W / podHW((wy0 + wy1) / 2), yaw = Math.PI / 2;
  podSlab(th, true); podPetalDeco(th, true); podKnuckles(th, KN_DOOR);
  // the porthole frame: brass jambs, a sill, a pointed arch over it and bolts round it
  podRaise(th, -fw - .1, -fw, wy0 - .05, wy1 + .02, .03, "podBrass", { side: "podBrass", uv: [0, 0, 1, 3] }); podRaise(th, fw, fw + .1, wy0 - .05, wy1 + .02, .03, "podBrass", { side: "podBrass", uv: [0, 0, 1, 3] });
  podRaise(th, -fw - .14, fw + .14, wy0 - .09, wy0 - .03, .04, "podBrass", { side: "podBrass", uv: [0, 0, 3, 1] });
  const ar = (f, y, d) => podPt(th, f, y, d), aw = fw + .1, top = wy1 + .26;
  for (const d of [.03, 0]) mb("podBrass").mb.tri(ar(-aw, wy1 + .02, d), ar(aw, wy1 + .02, d), ar(0, top, d), podN(th), [0, 1], [1, 1], [.5, 0]);
  for (const s of [-1, 1]) { const a = ar(s * aw, wy1 + .02, .03), b = ar(0, top, .03), a0 = ar(s * aw, wy1 + .02, 0), b0 = ar(0, top, 0); mb("podBrass").mb.quad(a, b, b0, a0, [0, 1, 0]); }
  mb("dark").mb.tri(ar(-fw, wy1 + .03, .032), ar(fw, wy1 + .03, .032), ar(0, top - .1, .032), podN(th), [0, 1], [1, 1], [.5, 0]);
  podRaise(th, -.04, .04, top - .02, top + .06, .03, "glowRed", { side: "podBrass" });
  for (const s of [-1, 1]) for (const y of [wy0 + .04, wy1 - .04]) podRaise(th, s * (fw + .13), s * (fw + .13) + .07, y - .025, y + .025, .045, "dark");
  // inside: a grab bar across the door, a red warning light, and the outside status plate
  const ih = (f, y) => podPt(th, f, y, -T - .05), iw = (f, y) => podPt(th, f, y, -T);
  tube(ih(-.5, 1.05), ih(.5, 1.05), .016, 6, "pipeMetal"); for (const f of [-.5, .5]) tube(ih(f, 1.05), iw(f, 1.05), .012, 5, "pipeMetal");
  const lt = podPt(th, 0, 1.9, -T - .01); obox(lt[0], lt[1], lt[2], .12, .03, .02, yaw, 0, "glowRed");
  // the walking side of the ramp: grip bars and hazard edging
  for (const y of [.62, .82, 1.02, 1.74]) podRaise(th, -.7, .7, y, y + .05, -T - .022, "podIron", { base: -T, flat: true, uv: [0, 0, 3, 1] });
  for (const s of [-1, 1]) podRaise(th, s > 0 ? .78 : -.92, s > 0 ? .92 : -.78, Y0 + .02, Y1 - .02, -T - .012, "haz", { base: -T, flat: true, uv: [0, 0, 1, 8] });
  const st = podPt(th, .62, .95, .02); obox(st[0], st[1], st[2], .2, .26, .012, yaw, 0, "dark", { front: "scrAlert" });
}

// the inside of an enemy pod, seen through its open ramp: a ceiling with a red lamp ring and three drop harnesses round the back
function podInteriorE() {
  const k = 1 / Math.cos(POD.HA); for (let i = 0; i < POD.N; i++) { const a0 = i * 2 * POD.HA - POD.HA, a1 = a0 + 2 * POD.HA, r = (podAp(POD.Y1) - POD.T) * k;
    mb("podIron").mb.tri([0, POD.Y1 - .02, 0], [Math.cos(a0) * r, POD.Y1 - .02, Math.sin(a0) * r], [Math.cos(a1) * r, POD.Y1 - .02, Math.sin(a1) * r], [0, -1, 0], [.5, .5], [0, 0], [1, 0]); }
  annulus(0, POD.Y1 - .03, 0, .16, .2, 12, "glowRed");
  for (const a of [Math.PI * .72, Math.PI, Math.PI * 1.28]) { const r = .5, x = Math.cos(a) * r, z = Math.sin(a) * r, yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
    obox(x, 1.15, z, .42, 1.2, .08, yaw, 0, "podIron", { front: "dark" }); obox(Math.cos(a) * .44, 1.86, Math.sin(a) * .44, .26, .2, .1, yaw, 0, "dark");
    for (const s of [-1, 1]) tube([x - Math.sin(a) * s * .12, 1.68, z + Math.cos(a) * s * .12], [Math.cos(a) * .3 - Math.sin(a) * s * .08, .95, Math.sin(a) * .3 + Math.cos(a) * s * .08], .02, 5, "pipeRed", 1); }
}
