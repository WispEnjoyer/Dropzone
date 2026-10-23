// =====================================================================================
//  FIELD GENERATION: the planet surface for a mission, built from the same noise the war
//  table hologram shows, so the terrain you drop onto is the terrain you saw on the table.
//  Everything solid is 3D; the bugs are 2D sprites (see field.js).
// =====================================================================================
const FW = { RW: 300, HALF: 340, N: 170, HSCALE: 32 };          // playable radius, half-size of the terrain square, grid cells, hill height
const FIELD_PAL = {
  desert:   { g: [198, 162, 106], g2: [180, 142, 90], r: [156, 104, 64], r2: [122, 80, 50], zen: [62, 112, 186], hor: [232, 204, 162], fog: [222, 198, 160], amb: [.46, .43, .4], sun: [1.02, .93, .78], fogD: 300, flora: "desert" },
  swamp:    { g: [74, 104, 54], g2: [58, 84, 44], r: [84, 92, 76], r2: [58, 66, 54], zen: [62, 96, 90], hor: [138, 160, 126], fog: [112, 134, 104], amb: [.38, .43, .37], sun: [.84, .92, .74], fogD: 165, flora: "swamp" },
  arctic:   { g: [222, 232, 240], g2: [198, 212, 226], r: [122, 140, 162], r2: [92, 106, 126], zen: [86, 128, 190], hor: [222, 234, 246], fog: [212, 224, 238], amb: [.52, .54, .6], sun: [.92, .95, 1], fogD: 250, flora: "arctic" },
  volcanic: { g: [72, 64, 62], g2: [58, 52, 52], r: [46, 40, 42], r2: [32, 28, 30], zen: [64, 30, 30], hor: [204, 94, 52], fog: [122, 62, 46], amb: [.36, .31, .3], sun: [1, .62, .46], fogD: 200, flora: "arctic" },
};
// the shape of the land: the war table's noise, plus finer detail, plus a ring of cliffs at the edge
let FIELD_SHAPE = "";
// desert dunes: transverse ridges across the wind, a long windward slope and a short steep slip face, only in the dune seas
function desertDuneMask(x, z, s) { return clamp((fbm(x / 170, z / 170, s + 12) - .42) * 3.5, 0, 1); }
function desertDune(x, z, s) { const wa = .6, du = x * Math.cos(wa) + z * Math.sin(wa), dv = -x * Math.sin(wa) + z * Math.cos(wa);
  const ph = du / 46 + fbm(dv / 90, du / 300, s + 11) * 3, f = ph - Math.floor(ph), p = f < .78 ? f / .78 : (1 - f) / .22;
  return p * p * (3 - 2 * p) * desertDuneMask(x, z, s) * (.7 + fbm(dv / 40, du / 40, s + 13) * .6); }
function desertWadi(x, z, s) { const wd = Math.abs(fbm(x / 150 + 2, z / 150 + 8, s + 55) - .5); if (wd >= .03) return 0; const k = 1 - wd / .03; return k * k * (3 - 2 * k); }   // "swamp": low, waterlogged land instead of hills
function fieldRaw(x, z, s) {
  const u = x / FW.RW, v = z / FW.RW, r = Math.hypot(u, v);
  if (FIELD_SHAPE === "desert") {   // swells of open sand, dune seas, flat-topped mesas with sheer sides, and dry wadis
    const e = Math.max(0, 1 - Math.min(1, r) ** 4);
    let h = Math.max(0, (fbm(u * 2.2 + 5, v * 2.2 + 9, s) - .4) / .6) * e * 16 + (fbm(x / 24, z / 24, s + 3) - .5) * 3 + (fbm(x / 8, z / 8, s + 4) - .5) * .7;
    h += desertDune(x, z, s) * 5.5;
    const mn = fbm(x / 95 + 7, z / 95 + 3, s + 50); if (mn > .62) { const k1 = clamp((mn - .62) / .022, 0, 1), k2 = clamp((mn - .69) / .018, 0, 1); h += (k1 * 11 + k2 * 7) * e * (.85 + fbm(x / 30, z / 30, s + 51) * .3); }
    const wk = desertWadi(x, z, s); h -= wk * 2.6;
    if (r > .88) { const k = clamp((r - .88) / .14, 0, 1); h += k * k * (3 - 2 * k) * 30 * (.6 + fbm(x / 30, z / 30, s + 6) * .8); }
    return h; }
  if (FIELD_SHAPE === "swamp") {   // broad basins and wooded islands, hummocks everywhere, and the same ring of cliffs at the edge
    const e = Math.max(0, 1 - Math.min(1, r) ** 4);
    let h = (fbm(u * 2.2 + 5, v * 2.2 + 9, s) - .45) * 9 * e;
    h += (fbm(x / 38, z / 38, s + 3) - .5) * 7 + (fbm(x / 13, z / 13, s + 4) - .5) * 2.4 + (fbm(x / 4.5, z / 4.5, s + 8) - .5) * .6;
    if (r > .9) { const k = clamp((r - .9) / .14, 0, 1); h += k * k * (3 - 2 * k) * 9 * (.6 + fbm(x / 30, z / 30, s + 6) * .8); }   // a gentle rise under the wall of giant trees (see buildForest)
    return h; }
  const n = fbm(u * 2.6 + 5, v * 2.6 + 9, s), e = Math.max(0, 1 - Math.min(1, r) ** 4);
  let h = Math.max(0, (n - .38) / .62) * e * FW.HSCALE;
  h += (fbm(x / 22, z / 22, s + 3) - .5) * 5 + (fbm(x / 7, z / 7, s + 4) - .5) * 1.2;
  if (r > .88) { const k = clamp((r - .88) / .14, 0, 1); h += k * k * (3 - 2 * k) * 30 * (.6 + fbm(x / 30, z / 30, s + 6) * .8); }
  return h;
}

// ---------- static collision: a 10 m grid of [x, z, radius, top] circles so thousands of trees stay cheap ----------
const CG = 10, cgKey = (i, j) => (i + 200) * 1000 + (j + 200);
function cgAdd(out, c) { const k = cgKey(Math.floor(c[0] / CG), Math.floor(c[1] / CG)); (out.cgrid.get(k) || out.cgrid.set(k, []).get(k)).push(c); }
function cgNear(x, z, r, fn) { const g = FLD.cgrid, i0 = Math.floor((x - r - 4) / CG), i1 = Math.floor((x + r + 4) / CG), j0 = Math.floor((z - r - 4) / CG), j1 = Math.floor((z + r + 4) / CG);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const L = g.get(cgKey(i, j)); if (L) for (const c of L) if (fn(c)) return true; } return false; }
// how wooded a spot is (0 open plains … 1 deep forest); clearings are kept around every point of interest
function forestAt(x, z, out) {
  if (!out.forestOn) return 0; const s = out.seed;
  let f = fbm(x / 85 + 3, z / 85 + 7, s + 21) * .72 + fbm(x / 22, z / 22, s + 23) * .28;
  f = clamp((f - .3) / .12, 0, 1);
  for (const [fx, fz, fr] of out.flat) { const d = Math.hypot(x - fx, z - fz) - fr - 4; if (d < 14) f *= clamp(d / 14, 0, 1); }
  if (out.pathG) f *= clamp((pathD(x, z, out) - 2.5) / 5, 0, 1);
  return f;
}

// ---------- water: swamp rivers and ponds below a set water line ----------
function riverCarve(x, z, h, out) {
  if (!out.waterOn) return h;
  if (FIELD_SHAPE === "desert") { for (const [ox, oz, r] of out.oases || []) { const d = Math.hypot(x - ox, z - oz); if (d < r * 1.35) { const k = clamp((d - r * .35) / (r * .95), 0, 1); h = lerp(out.waterY - 1, h, k * k * (3 - 2 * k)); } } return h; }   // oasis pools const s = out.seed, wy = out.waterY, sm = k => k * k * (3 - 2 * k);
  const s = out.seed, wy = out.waterY, sm = k => k * k * (3 - 2 * k);
  const rv = Math.abs(fbm(x / 150 + 11, z / 150 + 5, s + 31) - .5) + Math.abs(fbm(x / 60, z / 60, s + 33) - .5) * .12, k = clamp(1 - rv / .045, 0, 1);
  h = lerp(h, Math.min(h, wy - 1.05), sm(k));
  if (FIELD_SHAPE === "swamp") {
    // a braided web of narrow creeks through the wetter half of the map
    const rc = Math.abs(fbm(x / 58 + 3, z / 58 + 1, s + 35) - .5) + Math.abs(fbm(x / 19, z / 19, s + 36) - .5) * .06, mask = clamp((fbm(x / 130, z / 130, s + 37) - .34) / .14, 0, 1), k2 = clamp(1 - rc / .055, 0, 1) * mask;
    h = lerp(h, Math.min(h, wy - .6), sm(k2));
    // a soft bog floor: the water is never deeper than about a metre, so you can always wade
    if (h < wy - .75) h = wy - .75 - (1 - Math.exp(-(wy - .75 - h) / .3)) * .4; }
  return h;
}
const waterDepth = (x, z) => FLD && FLD.waterOn ? FLD.waterY - fieldH(x, z) : -9;
// ---------- trails: worn dirt paths linking the landing zone, objective, extraction, outposts and points of interest ----------
const PG = 2, PN = Math.ceil(FW.HALF * 2 / PG);
function pathD(x, z, out) { const i = Math.floor((x + FW.HALF) / PG), j = Math.floor((z + FW.HALF) / PG); return i < 0 || j < 0 || i >= PN || j >= PN ? 99 : out.pathG[j * PN + i]; }
function buildPaths(out, nodes) {
  const G = new Float32Array(PN * PN).fill(99), segs = [], done = [nodes[0]], left = nodes.slice(1);
  const link = (a, b) => { const pts = [], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 8)), nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L, ph = a[0] * .013 + b[1] * .017;
    for (let k = 0; k <= n; k++) { const t = k / n, w = (fbm(t * 4 + ph, ph, out.seed + 41) - .5) * 30 * Math.sin(Math.PI * t); pts.push([lerp(a[0], b[0], t) + nx * w, lerp(a[1], b[1], t) + nz * w]); } segs.push(pts); };
  // the main route first, then every other site hooks onto the nearest thing already connected
  link(nodes[0], nodes[1]); done.push(nodes[1]); left.splice(0, 1); if (left.length) { link(nodes[1], left[0]); done.push(left.shift()); }
  while (left.length) { let bi = 0, bj = 0, bd = 1e9; left.forEach((p, i) => done.forEach((q, j) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bi = i; bj = j; } })); link(done[bj], left[bi]); done.push(left.splice(bi, 1)[0]); }
  for (const pts of segs) for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
    for (let t = 0; t <= L; t += 1) { const x = lerp(ax, bx, t / L), z = lerp(az, bz, t / L), ci = Math.floor((x + FW.HALF) / PG), cj = Math.floor((z + FW.HALF) / PG);
      for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= PN || j >= PN) continue; const d = Math.hypot(-FW.HALF + (i + .5) * PG - x, -FW.HALF + (j + .5) * PG - z); if (d < G[j * PN + i]) G[j * PN + i] = d; } } }
  out.pathG = G; out.paths = segs;
}
const POI_NAME = { ruins: "Xeno Ruins", wreck: "Crashed Shuttle", cache: "Supply Cache", outpost: "Colony Outpost", bones: "Leviathan Bones", hand: "The Sunken Hand", crawler: "Buried Crawler", vapor: "Moisture Farm" };

// ---------- hand-painted field art (fieldart/*.png: 4x4 atlases of 64 px tiles), decoded once at startup ----------
const FART = {};
if (typeof FIELDART !== "undefined") for (const k in FIELDART) { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0); const im = g.getImageData(0, 0, img.width, img.height).data, d = new Uint8Array(im.length);
  for (let p = 0; p < im.length; p += 4) { d[p] = im[p]; d[p + 1] = im[p + 1]; d[p + 2] = im[p + 2]; d[p + 3] = im[p + 3] >= 128 ? 255 : 0; } FART[k.replace(/^fx_/, "")] = { w: img.width, h: img.height, d }; }; img.src = FIELDART[k]; }
// which surfaces are using atlases this mission (the terrain builder then picks a tile per quad)
let FATLAS = { ground: false, rock: false };
const ATL = { moss: [[0, 0], [2, 1], [0, 2], [2, 2], [1, 3], [1, 1]], litter: [[1, 0], [2, 0], [3, 0], [1, 2], [0, 3], [2, 3], [3, 3]], root: [[0, 1], [3, 2]], trail: [[3, 1], [1, 2]],
  damp: [[0, 0], [1, 0], [3, 0], [0, 2], [2, 2], [0, 3], [3, 3]], cliff: [[0, 1], [2, 2], [2, 3], [1, 1], [3, 1], [0, 3]] };
function artTile(T, i, j) { const d = new Uint8Array(64 * 64 * 4); for (let y = 0; y < 64; y++) d.set(T.d.subarray(((j * 64 + y) * T.w + i * 64) * 4, ((j * 64 + y) * T.w + i * 64 + 64) * 4), y * 256); return { w: 64, h: 64, d }; }
// shift a texture's average colour onto a target, keeping its shading (how the art is fitted to each world)
function artTint(T, tg, k = 1, glow = 0) { const d = new Uint8Array(T.d), n = T.w * T.h, m = [0, 0, 0];
  for (let p = 0; p < n; p++) for (let c = 0; c < 3; c++) m[c] += T.d[p * 4 + c] / n;
  const gn = m.map((v, c) => 1 - k + k * tg[c] / Math.max(1, v));
  for (let p = 0; p < n; p++) { const o = p * 4; for (let c = 0; c < 3; c++) d[o + c] = clamp(T.d[o + c] * gn[c], 0, 255);
    if (glow && T.d[o] + T.d[o + 1] + T.d[o + 2] > glow * 3) d[o + 3] = 128; }
  return { w: T.w, h: T.h, d }; }
// an atlas with each 64 px tile pulled toward a shared average, so neighbouring tiles don't checkerboard
function artAtlas(T, tg, k) { const out = { w: T.w, h: T.h, d: new Uint8Array(T.d.length) };
  for (let j = 0; j < T.h / 64; j++) for (let i = 0; i < T.w / 64; i++) { const t = artTint(artTile(T, i, j), tg, k); for (let y = 0; y < 64; y++) out.d.set(t.d.subarray(y * 256, y * 256 + 256), ((j * 64 + y) * T.w + i * 64) * 4); }
  return out; }
function fieldArt(P, style) { FATLAS = { ground: false, rock: false }; if (!FART.rock) return;
  const rk = style === "swamp" ? [72, 80, 62] : P.r.map((v, i) => v * .7 + P.r2[i] * .3 + 10);
  TXD.fRock = artAtlas(FART.rock, rk, .85); FATLAS.rock = true;
  TXD.fRockProp = artTint(artTile(FART.rock, ...(style === "desert" ? [2, 3] : [0, 1])), style === "arctic" ? rk.map(v => v * 1.08) : rk, .85);
  FATLAS.desert = style === "desert" && !!FART.ground_desert && !!FART.rock_desert;
  if (FATLAS.desert) {   // the painted desert: sand, dunes, scrub, gravel, sandstone, and the oasis set
    TXD.fRock = FART.rock_desert; TXD.fRockProp = artTile(FART.rock_desert, 1, 3);
    if (FART.oasis_desert) { TXD.fWater = artTile(FART.oasis_desert, 3, 2); TXD.fOasisGrass = artTile(FART.oasis_desert, 1, 1); } }
  if (style !== "swamp" || !FART.ground) return;
  TXD.fGround = artAtlas(FART.ground, [60, 78, 40], .75); FATLAS.ground = true;
  TXD.fFungus = artAtlas(FART.fungus, [82, 94, 66], .7);
  TXD.fBark = artTint(artTile(FART.bark, 0, 0), [84, 66, 52], .5); TXD.fBarkS = artTint(artTile(FART.bark, 3, 0), [70, 56, 46], .5);
  TXD.fLog = artTint(artTile(FART.fungus, 0, 3), [78, 84, 56], .5);
  TXD.fShroom = artTint(artTile(FART.fungus, 2, 1), [150, 190, 120], .8, 175);
  [[0, 0], [1, 0], [1, 1], [0, 2]].forEach(([i, j], q) => { TXD["fCanopy" + "ABCD"[q]] = artTint(artTile(FART.canopy, i, j), [50, 96, 44], .6); TXD["fLeaf" + "ABCD"[q]] = leafCard(TXD["fCanopy" + "ABCD"[q]], 500 + q); });
  // more barks, one per tree species: the emergent giants reddish, the stranglers pale and grey, the umbrella trees mottled
  TXD.fBarkR = artTint(artTile(FART.bark, 1, 1), [96, 62, 44], .55); TXD.fBarkG = artTint(artTile(FART.bark, 0, 2), [92, 88, 76], .6); TXD.fBarkP = artTint(artTile(FART.bark, 3, 2), [104, 92, 72], .5);
}

// ---------- terrain layers for the splat shader: base ground, litter/variation, mud, trail, rock ----------
// 2x2 tiles from a painted atlas make one 128 px layer covering 4 m; the generated biomes get noise-painted 64 px layers.
function atlasLayer(T, set, R) { const out = { w: 128, h: 128, d: new Uint8Array(128 * 128 * 4) };
  for (let q = 0; q < 4; q++) { const [ti, tj] = set[(q + ((R() * set.length) | 0)) % set.length], ox = (q & 1) * 64, oy = (q >> 1) * 64;
    for (let y = 0; y < 64; y++) out.d.set(T.d.subarray(((tj * 64 + y) * T.w + ti * 64) * 4, ((tj * 64 + y) * T.w + ti * 64 + 64) * 4), ((oy + y) * 128 + ox) * 4); }
  return out; }
function terrainLayers(out, P, style) { const R = seeded(77), N = (x, y, s, a) => (hash2(x, y, s) - .5) * a, mix = (a, b, k) => a.map((v, i) => v * (1 - k) + b[i] * k);
  const pn = (x, y, s, w) => { const f = (a, b) => fbm(a, b, s); return (f(x / w, y / w) * (64 - x) * (64 - y) + f((x - 64) / w, y / w) * x * (64 - y) + f(x / w, (y - 64) / w) * (64 - x) * y + f((x - 64) / w, (y - 64) / w) * x * y) / 4096; };   // tileable noise
  const L = {};
  if (FATLAS.desert) { const G = FART.ground_desert, K = FART.rock_desert;
    L.l0 = atlasLayer(G, [[1, 0], [1, 1], [1, 2], [2, 0]], R); L.l1 = atlasLayer(G, [[0, 0], [0, 2], [2, 2], [0, 1]], R); L.l2 = atlasLayer(G, [[0, 3], [1, 3], [3, 3], [2, 1]], R); L.l3 = atlasLayer(G, [[3, 0], [3, 2], [3, 1]], R);
    L.l4 = atlasLayer(K, [[0, 2], [1, 2], [2, 2], [3, 2], [2, 3], [3, 3]], R); if (FART.oasis_desert) L.l5 = atlasLayer(FART.oasis_desert, [[1, 1], [3, 3], [1, 1], [3, 3]], R); }
  else if (FATLAS.ground) { L.l0 = atlasLayer(TXD.fGround, ATL.moss, R); L.l1 = atlasLayer(TXD.fGround, ATL.litter, R); L.l2 = atlasLayer(TXD.fFungus, ATL.damp, R); L.l3 = artTint(atlasLayer(TXD.fGround, ATL.trail, R), [78, 62, 42], .75); }   // trails: trodden brown mud
  else { const g = P.g, g2 = P.g2;
    L.l0 = TXD.fGround;
    L.l1 = tex(64, 64, (x, y) => { const n = pn(x, y, 301, 9), k = hash2(x, y, 302); let c = mix(g2, g, n > .55 ? .6 : .1).map(v => v * .93);
      if (style === "desert") { const rp = Math.sin((x + Math.sin(y * .2) * 4) * .5) > .7; if (rp) c = c.map(v => v * .88); }
      if (style === "arctic") c = mix(c, [176, 196, 214], n > .6 ? .4 : 0);
      if (k > .975) c = mix(P.r, P.r2, .5); return c.map(v => v + N(x >> 1, y >> 1, 303, 8)); });
    L.l2 = tex(64, 64, (x, y) => { const n = pn(x, y, 304, 7); return mix(g2, P.r2, .35 + n * .3).map(v => v * .82 + N(x, y, 305, 8)); });
    L.l3 = tex(64, 64, (x, y) => { const n = pn(x, y, 306, 6), k = hash2(x, y, 307), base = style === "arctic" ? [150, 156, 162] : style === "volcanic" ? [52, 46, 44] : mix(g, [118, 86, 58], .55).map(v => v * .92);
      if (k > .95) return base.map(v => v * 1.25); if (k < .05) return base.map(v => v * .7); return base.map(v => v * (.9 + n * .2) + N(x >> 1, y >> 1, 308, 6)); }); }
  if (!L.l4) L.l4 = FATLAS.rock ? atlasLayer(TXD.fRock, ATL.cliff, R) : TXD.fRock;
  out.tl = { ts: FATLAS.ground || FATLAS.desert ? [.25, .25, .25, .25] : [.25, .2, .22, .3], rs: FATLAS.ground || FATLAS.rock ? .25 : .3 };
  for (const k of ["l0", "l1", "l2", "l3", "l4", "l5"]) if (L[k]) { TXD["tL" + k] = L[k]; out.tl[k] = glTex(L[k]); }
}

// ---------- placeholder textures (pixel art, generated). See the texture list for real art to replace them. ----------
function fieldTextures(P, style) {
  const N = (x, y, s, a) => (hash2(x, y, s) - .5) * a, mix = (a, b, k) => a.map((v, i) => v * (1 - k) + b[i] * k);
  TXD.fGround = tex(32, 32, (x, y) => { const k = hash2(x >> 1, y >> 1, 41), c = mix(P.g, P.g2, k > .6 ? 1 : k > .3 ? .5 : 0), sp = hash2(x, y, 42);
    return c.map(v => v * (sp > .94 ? .82 : sp < .04 ? 1.12 : 1) + N(x, y, 43, 8)); });
  TXD.fRock = tex(32, 32, (x, y) => { const band = Math.floor((y + Math.sin(x * .4) * 2) / 5) % 3, c = band === 0 ? P.r : band === 1 ? P.r2 : mix(P.r, P.r2, .5);
    return c.map(v => v * (hash2(x, y, 44) > .9 ? .8 : 1) + N(x, y, 45, 10)); });
  TXD.fRockProp = tex(32, 32, (x, y) => { const c = mix(P.r, P.g2, style === "arctic" && y < 8 ? .9 : 0), cr = Math.abs(Math.sin(x * .3 + y * .7)) < .06; return cr ? c.map(v => v * .6) : c.map(v => v + N(x >> 1, y >> 1, 46, 16)); });
  TXD.fBark = tex(16, 32, (x, y) => { const k = (x % 4 === 0) ? .7 : 1; return [86 * k, 64 * k, 44 * k].map(v => v + N(x, y >> 2, 47, 10)); });
  TXD.fLeaf = tex(32, 32, (x, y) => { const h = hash2(x >> 1, y >> 1, 48); return h > .7 ? [70, 120, 56] : h > .35 ? [52, 96, 44] : [38, 72, 36]; });
  TXD.fCactus = tex(16, 32, (x, y) => { const rib = x % 4 === 0; return rib ? [70, 110, 60] : [98, 148, 78].map(v => v + N(x, y, 49, 10)); });
  TXD.fIce = tex(16, 32, (x, y) => [176, 214, 240].map((v, i) => v * (1 - y / 64) + [255, 255, 255][i] * (y / 64)).map(v => v + N(x, y, 50, 14)));
  TXD.fConcrete = tex(32, 32, (x, y) => { if (y % 16 === 0 || x % 32 === 0) return [96, 98, 100]; return [150, 150, 146].map(v => v + N(x >> 1, y >> 1, 51, 14)); });
  TXD.fNest = tex(32, 32, (x, y) => { const vein = Math.abs(Math.sin(x * .45 + Math.sin(y * .3) * 2)) < .08; return vein ? [220, 120, 40, 1] : [86, 58, 40].map(v => v + N(x >> 1, y >> 1, 52, 18)); });
  TXD.fHole = tex(8, 8, () => [10, 6, 4]);
  TXD.fTent = tex(32, 32, (x, y) => { const seam = y % 16 === 0 || x % 32 === 0, w = (x + y) % 2 ? 1 : .94; return seam ? [52, 56, 38] : [88, 94, 62].map(v => v * w + N(x >> 2, y >> 2, 57, 10)); });
  TXD.fScorch = tex(4, 4, () => [24, 20, 18]);
  TXD.fBox = tex(16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? [90, 40, 10] : (x + y) % 5 ? [255, 138, 42] : [255, 176, 74]);
  TXD.fSample = tex(8, 8, (x, y) => x < 4 ? [190, 255, 140, 1] : [98, 200, 60, 1]);
  if (style === "swamp" || style === "desert") {   // (the desert borrows the fronds, reeds and grass for its oases)
    // forest placeholders: leafy canopy, fern fronds, grass tufts, palm fronds, glowing fungus
    TXD.fCanopy = tex(32, 32, (x, y) => { const c = hash2(x >> 2, y >> 2, 81), l = hash2(x, y, 82); const base = c > .66 ? [64, 112, 50] : c > .33 ? [48, 92, 42] : [36, 74, 36];
      return base.map(v => v * (l > .85 ? 1.25 : l < .12 ? .7 : 1)); });
    TXD.fLeaf = leafCard(TXD.fCanopy, 499); TXD.fBarkR = TXD.fBarkG = TXD.fBarkP = TXD.fBark;
    // ferns: five arching fronds, each a stem with paired leaflets that shrink toward the tip
    { const F = []; for (const [a, L, dr] of [[-1.05, .85, 1], [-.5, 1, .8], [0, 1.05, .45], [.5, 1, .8], [1.05, .85, 1]]) for (let t = .04; t <= 1; t += .012) {
        const x = 32 + Math.sin(a) * t * 34 * L, y = 63 - t * 54 * L * Math.cos(a * .6) + dr * t * t * 26, w = (1 - t) * 6.5 + 1, nx = Math.cos(a), ny = Math.sin(a) * .4; F.push([x, y, w, t, nx, ny]); }
      TXD.fFern = tex(64, 64, (x, y) => { let best = null;
        for (const [fx, fy, w, t] of F) { const d = Math.hypot(x - fx, y - fy); if (d < w && (!best || d < best[0])) best = [d, t, w]; }
        if (!best) return null; const [d, t, w] = best; if (d < .8) return [44, 78, 30];
        if (((t * 46) | 0) % 2 && d > w * .45) return null;   // gaps between the leaflets
        return d / w > .7 ? [58 + t * 30, 104 + t * 30, 40] : [74 + t * 34, 128 + t * 26, 50]; }); }
    TXD.fGrass = tex(16, 16, (x, y) => { for (const b of [2, 5, 8, 11, 14]) { const bx = b + Math.round((15 - y) * (b % 3 - 1) * .25); if (x === bx && y > (b * 7) % 6) return [86 + y * 3, 130 + y * 3, 58]; } return null; });
    // palm fronds: a stem with long paired leaflets swept toward the tip
    TXD.fFrond = tex(64, 32, (x, y) => { const u = x / 64, mid = 16 + Math.sin(u * 3) * 1.2, w = 14 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), .7), dy = Math.abs(y - mid); if (dy > w || u > .97) return null;
      if (dy < .8) return [74, 88, 40]; const ph = (x + dy * 1.15) % 6; if (ph < 1.3) return null; const edge = ph < 2.1 || ph > 5.2, k = 1 - dy / w * .35;
      return (edge ? [52, 96, 38] : [72 + u * 30, 134 + u * 16, 54]).map(v => v * k); });
    TXD.fShroom = tex(8, 8, (x, y) => (x + y) % 3 ? [110, 240, 210, 1] : [60, 200, 190, 1]);
    TXD.fLog = tex(16, 32, (x, y) => [70, 56, 40].map(v => v * (x % 5 === 0 ? .7 : 1) + (hash2(x, y >> 2, 83) - .5) * 14));
    // reeds and cattails: thin blades, a few with brown heads
    TXD.fReed = tex(32, 64, (x, y) => { for (const b of [2, 7, 11, 15, 19, 23, 27, 30]) { const lean = (b % 3 - 1) * (63 - y) * .1 + Math.sin(y * .05 + b) * .8, bx = Math.round(b + lean), top = 4 + (b * 7) % 18;
        if (b % 4 === 3 && y >= top && y < top + 9 && Math.abs(x - bx - .5) < (y === top || y === top + 8 ? .6 : 1.1)) return y < top + 2 ? [88, 60, 38] : [112 - (y - top) * 3, 74 - (y - top) * 2, 44];   // cattail heads
        if (x === bx && y >= top - (b % 4 === 3 ? 3 : 0)) return y < top + 4 ? [136, 156, 80] : [84 + (63 - y) * .6, 116 + (63 - y) * .4, 52]; } return null; });
    // lily pads: round leaves with a notch, a pale flower now and then
    TXD.fLily = tex(32, 32, (x, y) => { for (const [cx, cy, r, fl] of [[9, 10, 7, 1], [23, 9, 6, 0], [16, 23, 8, 0], [26, 25, 4, 0], [5, 26, 4, 1]]) { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
        if (d < r && !(dx > 0 && Math.abs(dy) < dx * .35)) { if (fl && d < 1.8) return [230, 214, 228]; if (fl && d < 2.6) return [250, 236, 140]; return d > r - 1 ? [52, 88, 40] : [78 + (hash2(x, y, 84) > .8 ? 20 : 0), 122, 56]; } } return null; });
    // hanging moss: ragged grey-green strands
    TXD.fMoss = tex(16, 32, (x, y) => { const len = 10 + hash2(x, 0, 85) * 22; if (y > len || hash2(x, y >> 2, 86) > .82) return null; return (x + (y >> 1)) % 3 ? [118, 130, 96] : [88, 104, 74]; });
    // dead wood and cypress bark, and weathered boardwalk planks
    TXD.fSnag = tex(16, 32, (x, y) => { const k = x % 4 === 0 ? .72 : 1; return [118 * k, 112 * k, 100 * k].map(v => v + (hash2(x, y >> 2, 87) - .5) * 14); });
    TXD.fCypress = tex(16, 32, (x, y) => { const k = (x + (y >> 3)) % 5 === 0 ? .66 : 1, moss = y > 22 && hash2(x, y, 88) > .55; return moss ? [70, 92, 52] : [104 * k, 80 * k, 64 * k].map(v => v + (hash2(x, y >> 2, 89) - .5) * 12); });
    TXD.fPuddle = tex(16, 16, (x, y) => { const g = Math.abs(((x + y * 2) % 16) - 8) < 1 && hash2(x >> 2, y, 91) > .5; return g ? [150, 170, 168] : [34 + y, 46 + y, 46 + y]; });   // dark water with a glint of sky
    TXD.fRipple = tex(64, 64, (x, y) => { const d = Math.hypot(x - 31.5, y - 31.5); return (d > 28.6 && d < 30.2) || (d > 17 && d < 18) ? [205, 220, 205, 1] : null; });
    TXD.fDryGrass = tex(32, 32, (x, y) => { for (const b of [2, 5, 8, 11, 14, 17, 20, 23, 26, 29]) { const top = 6 + (b * 7) % 17, bx = Math.round(b + (31 - y) * ((b % 5) - 2) * .09); if (x === bx && y >= top) { const k = (y - top) / (31 - top); return [196 - k * 70, 170 - k * 66, 104 - k * 50]; } } return null; });   // a tuft of dry, straw-coloured grass
    TXD.fPalm = tex(16, 32, (x, y) => { const ring = y % 6 < 2, k = x % 4 === 0 ? .8 : 1; return ring ? [96 * k, 76 * k, 52 * k] : [140 * k, 112 * k, 78 * k].map(v => v + (hash2(x, y, 92) - .5) * 14); });   // ringed palm trunk
    TXD.fPlank = tex(32, 16, (x, y) => { if (y === 0 || y === 15) return [44, 36, 28]; if ((x === 3 || x === 28) && (y === 4 || y === 11)) return [140, 140, 136]; const g = Math.sin(x * .7 + y * .2) > .85 ? .8 : 1; return [116 * g, 94 * g, 68 * g].map(v => v + (hash2(x >> 2, y, 90) - .5) * 14); });
  }
  TXD.fWater = tex(64, 64, (x, y) => { const r = Math.sin((x + y * .6) * .55 + Math.sin(y * .4) * 2) > .82; let n = hash2(x >> 2, y >> 2, 95);
    if (style === "swamp") { const pn = (a, b) => (fbm(a / 7, b / 7, 97) * (64 - a) * (64 - b) + fbm((a - 64) / 7, b / 7, 97) * a * (64 - b) + fbm(a / 7, (b - 64) / 7, 97) * (64 - a) * b + fbm((a - 64) / 7, (b - 64) / 7, 97) * a * b) / 4096, scum = pn(x, y) > .6, duck = hash2(x, y, 98) > .95; n = (fbm(x / 3, y / 3, 96) - .3) * .9; if (duck) return [104, 140, 58]; if (scum) return [74 + n * 10, 98 + n * 8, 50];   // duckweed and algae scum on dark tea-coloured water
      return r ? [92, 118, 98] : [46 + n * 8, 64 + n * 8, 52 + n * 6]; }
    return r ? [150, 190, 210] : [60, 100, 130]; });
  TXD.fRuin = tex(32, 32, (x, y) => { const crack = Math.abs(Math.sin(x * .7 + y * .2)) < .05 || y % 11 === 0, n = hash2(x >> 1, y >> 1, 96); return crack ? [40, 44, 46] : [78 + n * 22, 84 + n * 22, 82 + n * 18].map(v => v * (y < 3 ? .8 : 1)); });
  TXD.fRune = tex(16, 16, (x, y) => ((x * 3 + y * 5) % 7 < 2 && x % 4 && y % 3) ? [120, 255, 200, 1] : [30, 50, 46]);
  TXD.decalBlob = tex(16, 16, (x, y) => { const d = Math.hypot(x - 7.5, y - 7.5) + (hash2(x, y, 53) - .5) * 3; return d < 7 ? [255, 255, 255, 1] : null; });
  TXD.glowGreenS = tex(4, 4, () => [114, 224, 106, 1]);
  TXD.fGlass = tex(8, 8, (x, y) => (x + y) % 3 ? [40, 90, 120, 1] : [90, 170, 220, 1]);
  // sky: an equirectangular gradient from zenith to a hazy horizon, with a soft sun and cloud streaks
  const SUN = norm3([-.5, .55, -.65]); FIELD_SUN = SUN;
  TXD.fSky = tex(256, 128, (x, y) => { const lon = x / 256 * 6.2832, pol = y / 128 * 3.1416, d = [Math.cos(lon) * Math.sin(pol), Math.cos(pol), Math.sin(lon) * Math.sin(pol)];
    const el = clamp(d[1], -.2, 1), k = Math.pow(1 - Math.max(0, el), 3); let c = mix(P.zen, P.hor, k);
    const sd = d[0] * SUN[0] + d[1] * SUN[1] + d[2] * SUN[2]; if (sd > .997) return [255, 250, 230, 1]; c = mix(c, [255, 244, 220], Math.max(0, sd - .9) * 4);
    const cl = fbm(x / 20, y / 6, 61); if (el > .02 && el < .5 && cl > .6) c = mix(c, [255, 255, 255], Math.min(.6, (cl - .6) * 3) * (1 - el * 1.6));
    if (el < 0) c = P.fog; return [...c, 1]; });
}
let FIELD_SUN = [0, 1, 0];

// ---------- mesh helpers ----------
function buildParts(fn) {
  const gl = R3.gl, keep = R3.mats; R3.mats = {}; fn(); const parts = [];
  for (const k in R3.mats) { const M = R3.mats[k]; if (!M.mb.v.length) continue; const data = new Float32Array(M.mb.v), buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); parts.push({ buf, n: data.length / 11, tex: M.tex, key: k, dither: k === "shadow" || k.endsWith("~d") }); }
  R3.mats = keep; return parts;
}
function freeParts(parts) { if (parts) for (const p of parts) R3.gl.deleteBuffer(p.buf); }
// a drop pod standing at the origin, its open door facing +x (local); skipDoor leaves a gap in the hull
// the inside of the pod, in the same pod-local space (door at +x, floor at y 0); you sit at the centre with your eyes at y 1.45
function podInterior() {
  const R = .49, seg = 20, gap = .72, P = (a, y, r = R) => [Math.cos(a) * r, y, Math.sin(a) * r], ya = a => Math.atan2(-Math.cos(a), -Math.sin(a));
  const WALLS = ["hull4", "hullBox", "hull2", "eng2", "hull4"], bands = [[1.97, .46, null]];
  for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, am = (a0 + a1) / 2; if (Math.abs(angDiff(am, 0)) < gap) continue;
    const n = [-Math.cos(am), 0, -Math.sin(am)];
    { const t = WALLS[Math.floor(i / 4) % WALLS.length], u = (i % 4) / 4; mb(t).mb.quad(P(a0, 1.97), P(a1, 1.97), P(a1, .46), P(a0, .46), n, [u, .08, u + .25, .92], [.95, .95, .95]); }
    for (const y of [1.66, 1.18]) mb("dark").mb.quad(P(a0, y + .018, R - .02), P(a1, y + .018, R - .02), P(a1, y - .018, R - .02), P(a0, y - .018, R - .02), n);
    if (i % 4 === 0) mb("rib").mb.quad(P(a0, 1.97, R - .025), P(a0 + .06, 1.97, R - .025), P(a0 + .06, .46, R - .025), P(a0, .46, R - .025), n, [0, 0, 1, 3]); }
  annulus(0, 1.97, 0, 0, R, seg, "dark"); annulus(0, 1.96, 0, .15, .19, seg, "glowRed"); annulus(0, .47, 0, 0, R, seg, "plate");
  // instrument panels on either side of the door, angled at your face, with grab bars beside the door
  for (const sd of [-1, 1]) { const a = sd * .98, p = P(a, 1.47, .43), k = P(a, 1.25, .44);
    obox(p[0], p[1], p[2], .26, .19, .03, ya(a), -.1, "dark", { front: sd < 0 ? "glowPodL" : "glowPodR" });
    obox(k[0], k[1], k[2], .23, .09, .05, ya(a), .5, "dark", { top: "keys", front: "keys" });
    tube(P(sd * .8, 1.1, .45), P(sd * .8, 1.75, .45), .014, 6, "pipeMetal"); }
  for (let k = 0; k < 6; k++) { const p = P((k - 2.5) * .19, 1.9, .46); box(p[0] - .01, p[1], p[2] - .01, p[0] + .01, p[1] + .025, p[2] + .01, k % 2 ? "glowRed" : "glowWhite"); }
  // the seat behind you: a padded back, a headrest and shoulder straps
  box(-.47, .9, -.24, -.4, 1.62, .24, "cabinet"); box(-.46, 1.62, -.13, -.39, 1.86, .13, "dark"); box(-.45, .86, -.24, -.12, .94, .24, "dark");
  for (const s of [-1, 1]) tube([-.4, 1.66, s * .15], [-.16, .98, s * .1], .02, 5, "haz");
}
// the pod with its inside (one model for the ship, the drop and the surface), its door, and the hatch that drops it
function ensurePodModels() {
  podTextures(); if (!R3.podFull) R3.podFull = buildParts(() => { podGeometry(); podInterior(); });
  if (!R3.podFullE) { R3.podFullE = buildParts(() => livery("E", () => { podGeometry(); podInteriorE(); })); R3.podDoorE = buildParts(() => livery("E", podDoorGeom)); }
  if (!R3.podSupply) R3.podSupply = buildParts(() => livery("F", () => { podGeometry(); podDoorGeom(); annulus(0, POD.Y1 - .02, 0, 0, .55, 10, "dark"); }));
  if (!R3.podDoor) R3.podDoor = buildParts(podDoorGeom);
  if (!R3.tex.glowPodR) drawPodScreens(null);
  if (!R3.hatchHalf) R3.hatchHalf = buildParts(() => box(-PH / 2, -.05, -PH, PH / 2, .02, PH, "hatch", { tile: 1 }));
}

// ---------- the forest: dense jungle with open plains between, built in 60 m chunks so far chunks can be skipped ----------
function blob(x, y, z, rx, ry, rz, tex, col, seed, SEG = 5) {   // a lumpy low-poly ellipsoid (canopies, bushes)
  if (tex === "fCanopy" && TXD.fCanopyA && FATLAS.ground) tex = "fCanopy" + "ABCD"[(hash2(seed | 0, Math.round(x + z), 7) * 4) | 0];
  const U = Math.max(1, Math.round(3.1416 * (rx + rz) / 2.6)), V = Math.PI * ry / 2.6 / 3;
  const m = mb(tex).mb, RINGS = 3, P = (i, j) => { const a = i / SEG * 6.2832, b = -Math.PI / 2 + j / RINGS * Math.PI, k = j === 0 || j === RINGS ? 1 : .85 + hash2(i % SEG, j, seed) * .3;
    return [x + Math.cos(a) * Math.cos(b) * rx * k, y + Math.sin(b) * ry * (j === 0 ? .55 : 1), z + Math.sin(a) * Math.cos(b) * rz * k]; };
  for (let j = 0; j < RINGS; j++) for (let i = 0; i < SEG; i++) { const a = (i + .5) / SEG * 6.2832, b = -Math.PI / 2 + (j + .5) / RINGS * Math.PI, n = [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
    const sh = .75 + .25 * Math.max(0, n[1]) + (j === 0 ? -.2 : 0); m.quad(P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), P(i, j), n, [i / SEG * U, j * V, (i + 1) / SEG * U, (j + 1) * V], col.map(v => v * sh)); } }
function cross(x, y, z, w, h, tex, col, a = 0) {   // two crossed see-through quads (ferns, grass)
  const m = mb(tex).mb; for (const q of [a, a + Math.PI / 2]) { const dx = Math.cos(q) * w / 2, dz = Math.sin(q) * w / 2;
    m.quad([x - dx, y + h, z - dz], [x + dx, y + h, z + dz], [x + dx, y - .05, z + dz], [x - dx, y - .05, z - dz], [0, 1, 0], [0, 0, 1, 1], [col, col, col.map(v => v * .65), col.map(v => v * .65)]); } }
// a tree crown: a rounder leaf mass with a ragged, drooping skirt of see-through leaf cards round its underside
// and a few tufts on top, so from below (where you always see it) it reads as foliage, not a floating box
function crown(x, y, z, rx, ry, rz, col, seed, R, cards = 7, tufts = 2) {
  const L = FATLAS.ground && TXD.fCanopyA ? "ABCD"[(hash2(seed | 0, Math.round(x + z), 7) * 4) | 0] : "", tex = "fCanopy" + L, card = "fLeaf" + L;
  blob(x, y, z, rx * .88, ry, rz * .88, tex, col, seed, 6); const m = mb(card).mb, w0 = Math.PI * (rx + rz) / cards * .8, dk = col.map(v => v * .62);
  for (let k = 0; k < cards; k++) { const a = (k + R() * .6) / cards * 6.283, ca = Math.cos(a), sa = Math.sin(a), w = w0 * (.85 + R() * .4), tx = -sa * w / 2, tz = ca * w / 2;
    const t = [x + ca * rx * .8, y - ry * .2 + R() * ry * .3, z + sa * rz * .8], out = .25 + R() * .45, drop = ry * 1.1 + R() * ry, b = [t[0] + ca * out * rx * .5, t[1] - drop, t[2] + sa * out * rz * .5];
    m.quad([t[0] - tx, t[1], t[2] - tz], [t[0] + tx, t[1], t[2] + tz], [b[0] + tx * 1.15, b[1], b[2] + tz * 1.15], [b[0] - tx * 1.15, b[1], b[2] - tz * 1.15], norm3([ca, .3, sa]), [0, 0, 1, 1], [col, col, dk, dk]); }
  for (let k = 0; k < tufts; k++) { const a = R() * 6.283, ca = Math.cos(a), sa = Math.sin(a), w = rx * .9, tx = -sa * w / 2, tz = ca * w / 2, b = [x + ca * rx * .45, y + ry * .55, z + sa * rz * .45], t = [b[0] + ca * rx * .3, b[1] + ry * .9, b[2] + sa * rz * .3];
    m.quad([t[0] - tx, t[1], t[2] - tz], [t[0] + tx, t[1], t[2] + tz], [b[0] + tx, b[1], b[2] + tz], [b[0] - tx, b[1], b[2] - tz], [0, 1, 0], [0, 1, 1, 0], [col, col, col, col]); } }
function leafCard(T, seed) { const R = seeded(seed), C = []; for (let k = 0; k < 34; k++) { const y = 6 + R() ** 1.3 * 52; C.push([R() * 64, y, 4 + R() * 7 * (1.1 - y / 80)]); }
  return tex(64, 64, (x, y) => { if ((y > 7 || x < 5 || x > 58) && !C.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r)) return null; const o = ((y % T.h) * T.w + (x % T.w)) * 4, k = 1 - y / 64 * .3; return [T.d[o] * k, T.d[o + 1] * k, T.d[o + 2] * k]; }); }
// swamp pieces: hanging moss, bald cypress standing in the water, dead snags, mangrove roots
function hang(x, y, z, w, len, a, col) { const m = mb("fMoss").mb; for (const q of [a, a + Math.PI / 2]) { const dx = Math.cos(q) * w / 2, dz = Math.sin(q) * w / 2;
    m.quad([x - dx, y, z - dz], [x + dx, y, z + dz], [x + dx, y - len, z + dz], [x - dx, y - len, z - dz], [0, 1, 0], [0, 0, 1, 1], [col, col, col.map(v => v * .75), col.map(v => v * .75)]); } }
function cypress(out, x, z, y, R, tint) { const wy = out.waterY, h = 9 + R() * 5, b = .8 + R() * .3;
  lathe(x, z, [[b * 1.15, y - .4], [b * .82, y + .45], [b * .52, y + 1.4], [b * .36, y + 3.2], [b * .24, y + h]], 7, "fCypress", { v: [4, 3.4, 2.8, 2, 0] });
  for (let k = 0; k < 4; k++) { const a = R() * 6.28, d = 1.3 + R() * 1.4; cyl(x + Math.cos(a) * d, z + Math.sin(a) * d, Math.min(y, wy) - .4, wy + .15 + R() * .4, .13, 5, "fCypress", { r1: .03 }); }   // knees
  const nb = 2 + (R() < .5 ? 1 : 0);
  for (let k = 0; k < nb; k++) { const a = R() * 6.28, d = k ? 1.4 + R() * 1.2 : 0, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d, by = y + h - .4 - k * 1.7, c = tint().map(v => v * .8);
    if (k) tube([x, y + h * .62, z], [bx, by - .3, bz], .11, 5, "fCypress", 1);
    crown(bx, by, bz, 3 + R() * 1.4, .8 + R() * .4, 3 + R() * 1.4, c, (x * 7 + k) | 0, R, 7, 1);
    for (let q = 0; q < 5; q++) { const qa = R() * 6.28, qd = .8 + R() * 2.2; hang(bx + Math.cos(qa) * qd, by - .45, bz + Math.sin(qa) * qd, .7, 1.6 + R() * 2.2, R() * 3, [.88, .94, .84]); } }
  cgAdd(out, [x, z, b * .85, y + h]); }
function snag(out, x, z, y, R) { const h = 5 + R() * 6, lx = (R() - .5) * 1.6, lz = (R() - .5) * 1.6, top = [x + lx, y + h, z + lz];
  tube([x, y - .5, z], top, .24, 6, "fSnag", .6); tube(top, [top[0] + lx * .3, top[1] + .6, top[2] + lz * .3], .1, 5, "fSnag", 1);
  for (let k = 0; k < 3; k++) { const t = .45 + R() * .4, p = [x + lx * t, y + h * t, z + lz * t], a = R() * 6.28, L = 1.3 + R() * 1.4, e = [p[0] + Math.cos(a) * L, p[1] + .5 + R() * .9, p[2] + Math.sin(a) * L];
    tube(p, e, .08, 5, "fSnag", 1); if (R() < .6) hang(e[0], e[1] - .1, e[2], .5, 1 + R() * 1.4, a, [.85, .9, .8]); }
  cgAdd(out, [x, z, .35, y + h]); }
function* buildForest(out, R0, fh) {
  const CH = 60, n = Math.ceil(FW.RW * 2 / CH), tint = () => { const k = .8 + R() * .4, g = .9 + R() * .2; return [k * .95, k * g, k * .9]; }; let R = R0, done = 0;
  const ok = (x, z) => Math.hypot(x, z) < FW.RW * .93;
  for (let ci = 0; ci < n; ci++) for (let cj = 0; cj < n; cj++) {
    const x0 = -FW.RW + ci * CH, z0 = -FW.RW + cj * CH; R = seeded(out.seed * 977 + ci * 131 + cj * 7);
    const parts = buildParts(() => {
      // trees on a jittered 4.4 m grid, thinning out toward the plains
      for (let gx = x0; gx < x0 + CH; gx += 5.2) for (let gz = z0; gz < z0 + CH; gz += 5.2) { const x = gx + R() * 4.6, z = gz + R() * 4.6; if (!ok(x, z)) continue;
        const f = forestAt(x, z, out); if (R() > f * .85 + (f < .15 ? .015 : 0)) continue; const y = fh(x, z), kind = R();
        if (out.waterOn && y < out.waterY + .3) {   // in the water: bald cypress and dead snags, never on a trail
          const dep = out.waterY - y; if (FIELD_SHAPE === "swamp" && dep < 1.1 && R() < .3 && pathD(x, z, out) > 4.5 && !out.giantSpots.some(([gx2, gz2]) => Math.hypot(x - gx2, z - gz2) < GIANT.R + 4)) { if (R() < .72) cypress(out, x, z, y, R, tint); else snag(out, x, z, y, R); }
          continue; } if (out.giantSpots.some(([gx2, gz2]) => Math.hypot(x - gx2, z - gz2) < GIANT.R + 2)) continue;
        const nearG = Math.min(1e9, ...out.giantSpots.map(([gx2, gz2]) => Math.hypot(x - gx2, z - gz2)));
        const SW = FIELD_SHAPE === "swamp", wetBank = out.waterOn && y < out.waterY + 1.6, mossy = () => SW && R() < .45;
        const moss = (bx, by, bz, r, n = 3) => { for (let q = 0; q < n; q++) { const qa = R() * 6.28, qd = r * (.4 + R() * .6); hang(bx + Math.cos(qa) * qd, by - .9, bz + Math.sin(qa) * qd, .6, 1.2 + R() * 2.2, R() * 3, [.85, .92, .8]); } };
        const roots = (tex) => { if (SW && wetBank && R() < .75) for (let q = 0; q < 5; q++) { const a = q / 5 * 6.28 + R(), m = [x + Math.cos(a) * .8, y + .9 + R() * .4, z + Math.sin(a) * .8];   // stilt roots by the water
            tube([x, y + 1.6, z], m, .07, 4, tex, 1); tube(m, [x + Math.cos(a) * 1.5, y - .3, z + Math.sin(a) * 1.5], .07, 4, tex, 1); }
          else if (SW && R() < .4) for (let q = 0; q < 3; q++) { const a = R() * 6.28, L = 1.4 + R() * 1.6, e = [x + Math.cos(a) * L, 0, z + Math.sin(a) * L]; e[1] = fh(e[0], e[2]) - .05; tube([x, y + .25, z], e, .09, 4, tex, 1); } };   // surface roots
        if (kind < .05 && f > .55 && nearG > 45 && !out.emergent.some(([ex2, ez2]) => Math.hypot(x - ex2, z - ez2) < 38)) {   // an emergent giant: towers over the canopy, a landmark
          out.emergent.push([x, z]); const h = 25 + R() * 7, r = 1.2 + R() * .45, bk = "fBarkR";
          cyl(x, z, y - .5, y + h, r, 9, bk, { r1: r * .5, tile: 3, tv: Math.round(h / 1.3), col: [.85, .78, .72] });
          for (let k = 0; k < 5; k++) { const a = k * 1.257 + R() * .4, ca = Math.cos(a), sa = Math.sin(a), m = mb(bk).mb, H2 = 2.4 + R() * 1.4, Lb = 2 + R() * .8, tx = -sa * .14, tz = ca * .14;   // buttress fins
            for (const s2 of [-1, 1]) m.tri([x + ca * r * .6 + tx * s2, y + H2, z + sa * r * .6 + tz * s2], [x + ca * r * .6 + tx * s2, y - .3, z + sa * r * .6 + tz * s2], [x + ca * (r + Lb) + tx * s2, y - .3, z + sa * (r + Lb) + tz * s2], [-sa * s2, 0, ca * s2], [0, 0], [0, 1.4], [1.2, 1.4], [.8, .76, .7]);
            m.quad([x + ca * r * .6 + tx, y + H2, z + sa * r * .6 + tz], [x + ca * (r + Lb) + tx, y - .3, z + sa * (r + Lb) + tz], [x + ca * (r + Lb) - tx, y - .3, z + sa * (r + Lb) - tz], [x + ca * r * .6 - tx, y + H2, z + sa * r * .6 - tz], [ca, .6, sa], [0, 0, .2, 1.4], [.75, .7, .65]); }
          for (let k = 0; k < 4; k++) { const a = k * 1.57 + R() * .6, d = k ? 3 + R() * 2.5 : 0, bx = x + Math.cos(a) * d, by = y + h - (k ? 1.5 + R() * 2 : -1), bz = z + Math.sin(a) * d;
            if (k) tube([x, y + h - 4, z], [bx, by - .6, bz], .28, 6, bk, 1); crown(bx, by, bz, 5.5 + R() * 2, 1.8 + R() * .8, 5.5 + R() * 2, tint().map(v => v * .95), (x * 3 + k) | 0, R, 10, 3); if (mossy()) moss(bx, by, bz, 4); }
          cgAdd(out, [x, z, r + .3, y + h]); roots(bk); }
        else if (kind < .48) {   // jungle tree: tall trunk, one or two crowns
          const h = 7 + R() * 7, r = .3 + R() * .25, bk = TXD.fBarkS ? "fBarkS" : "fBark"; cyl(x, z, y - .3, y + h, r, 6, bk, { r1: r * .6, tile: 2, tv: Math.round(h / 1.1), col: [.85 + R() * .1, .8, .75] });
          const nb = 1 + (R() < .55 ? 1 : 0); for (let k = 0; k < nb; k++) { const a = R() * 6.28, d = k ? 1 + R() * 1.5 : 0, bx = x + Math.cos(a) * d, by = y + h - k * 1.2 - R(), bz = z + Math.sin(a) * d;
            if (k) tube([x, y + h * .7, z], [bx, by - .5, bz], .12, 5, bk, 1); const cr = 3 + R() * 1.8; crown(bx, by, bz, cr, 1.5 + R() * .8, cr * (.85 + R() * .3), tint(), k * 7 + cj + (x | 0), R, 7, 2); if (mossy()) moss(bx, by, bz, cr * .8); }
          roots(bk); cgAdd(out, [x, z, r + .15, y + h]); }
        else if (kind < .62) {   // strangler fig: pale roots twisted round a hollow core, merging into one trunk
          const h = 11 + R() * 5, bk = "fBarkG", top = [x, y + h * .4, z];
          cyl(x, z, y - .3, y + h, .5, 7, bk, { r1: .28, tile: 2, tv: Math.round(h / 1.1), col: [.9, .9, .88] });
          for (let k = 0; k < 6; k++) { const a = k * 1.05 + R() * .4, b = [x + Math.cos(a) * (.95 + R() * .5), y - .3, z + Math.sin(a) * (.95 + R() * .5)], tw = a + .9 + R() * .5,   // aerial roots spiralling up round the trunk
              mid = [x + Math.cos(tw) * .5, lerp(b[1], top[1], .45), z + Math.sin(tw) * .5], hi = [x + Math.cos(tw + .8) * .4, top[1] + R() * 1.5, z + Math.sin(tw + .8) * .4];
            tube(b, mid, .13, 5, bk, 1); tube(mid, hi, .11, 5, bk, 1); }
          for (let k = 0; k < 2; k++) { const a = R() * 6.28, d = k ? 1.5 + R() : 0, bx = top[0] + Math.cos(a) * d, by = y + h - k * 1.5, bz = top[2] + Math.sin(a) * d; const cr = 3.4 + R() * 1.6;
            crown(bx, by, bz, cr, 1.6 + R() * .6, cr, tint().map(v => v * 1.04), (x * 5 + k) | 0, R, 7, 2); if (mossy()) moss(bx, by, bz, cr * .7, 4); }
          cgAdd(out, [x, z, 1.1, y + h]); }
        else if (kind < .76) {   // umbrella tree: a slender mottled trunk with a flat wide crown above the rest
          const h = 13 + R() * 5, r = .24 + R() * .1, bk = "fBarkP", lx = (R() - .5) * 1.4, lz = (R() - .5) * 1.4;
          tube([x, y - .3, z], [x + lx, y + h, z + lz], r, 6, bk, .9);
          for (let k = 0; k < 3; k++) { const a = k * 2.09 + R(), e = [x + lx + Math.cos(a) * 2.6, y + h + .6, z + lz + Math.sin(a) * 2.6]; tube([x + lx * .85, y + h * .85, z + lz * .85], e, .1, 4, bk, 1); }
          const cr = 5 + R() * 1.6; crown(x + lx, y + h + .9, z + lz, cr, .9 + R() * .3, cr * (.8 + R() * .3), tint().map(v => v * 1.04), (x * 11) | 0, R, 9, 2);
          if (mossy()) moss(x + lx, y + h + .9, z + lz, cr * .8, 4); roots(bk); cgAdd(out, [x, z, r + .15, y + h]); }
        else {   // fern tree: a thin bent trunk under a crown of drooping fronds
          const h = 4 + R() * 3.5, lx = (R() - .5) * 1.2, lz = (R() - .5) * 1.2; tube([x, y - .2, z], [x + lx, y + h, z + lz], .16, 5, TXD.fBarkS ? "fBarkS" : "fBark", 1);
          const tx = x + lx, ty = y + h, tz = z + lz, m = mb("fFrond").mb, c = tint();
          for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + R(), L = 2.4 + R() * .8, ca = Math.cos(a), sa = Math.sin(a), px = -sa * .45, pz = ca * .45;
            const mid = [tx + ca * L * .55, ty + .25, tz + sa * L * .55], tip = [tx + ca * L, ty - 1 - R() * .6, tz + sa * L];
            m.quad([tx + px, ty, tz + pz], [mid[0] + px, mid[1], mid[2] + pz], [mid[0] - px, mid[1], mid[2] - pz], [tx - px, ty, tz - pz], [0, 1, 0], [0, 0, .55, 1], c);
            m.quad([mid[0] + px, mid[1], mid[2] + pz], [tip[0] + px * .4, tip[1], tip[2] + pz * .4], [tip[0] - px * .4, tip[1], tip[2] - pz * .4], [mid[0] - px, mid[1], mid[2] - pz], [0, 1, 0], [.55, 0, 1, 1], c.map(v => v * .85)); }
          cgAdd(out, [x, z, .3, y + h]); } }
      // the canopy roof: wide, flat, overlapping leaf masses between the crowns so the sky (and what hides up there) is hard to see
      for (let gx = x0; gx < x0 + CH; gx += 7) for (let gz = z0; gz < z0 + CH; gz += 7) { const x = gx + R() * 6, z = gz + R() * 6; if (!ok(x, z)) continue; const f = forestAt(x, z, out); if (f < .45 || R() > f * .95 || out.giantSpots.some(([gx2, gz2]) => Math.hypot(x - gx2, z - gz2) < GIANT.R + 6)) continue;
        if (out.waterOn && [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5], [3.5, 3.5], [-3.5, 3.5], [3.5, -3.5], [-3.5, -3.5]].some(([dx, dz]) => fh(x + dx, z + dz) < out.waterY + .3)) continue;   // never over water
        const y = fh(x, z) + 9.6 + R() * 3; crown(x, y, z, 5 + R() * 2.5, 1.4 + R() * .9, 5 + R() * 2.5, tint().map(v => v * .82), (gx * 3 + gz) | 0, R, 6, 0);
        if (f > .92 && R() < .5) out.spiderSpots.push([x, z, y]); }
      // undergrowth: ferns and bushes in the woods, grass tufts out on the plains, the odd log and glowing fungus
      for (let gx = x0; gx < x0 + CH; gx += 2.9) for (let gz = z0; gz < z0 + CH; gz += 2.9) { const x = gx + R() * 2.7, z = gz + R() * 2.7; if (!ok(x, z)) continue;
        if (out.outposts.some(([ox, oz]) => Math.abs(x - ox) < 11 && Math.abs(z - oz) < 11)) continue;   // nothing growing through the outpost floors
        const f = forestAt(x, z, out), y = fh(x, z), r = R();
        if (out.waterOn && y < out.waterY + .15) { const dep = out.waterY - y; if (pathD(x, z, out) < 3) continue;
          if (FIELD_SHAPE !== "swamp") { if (dep < .9 && R() < .55) cross(x, y, z, .7 + R() * .5, dep + .6 + R() * .7, "fGrass", tint().map(v => v * .85), R() * 3); continue; }
          if (dep < .5 && R() < .65) cross(x, y, z, .9 + R() * .6, dep + 1.1 + R() * .9, "fReed", tint(), R() * 3);   // reed beds in the shallows
          else if (R() < .3) { const sz = 1.3 + R() * 1.4, a = R() * 6.28, c = Math.cos(a) * sz / 2, d = Math.sin(a) * sz / 2, wy = out.waterY + .03, P = (u, v) => [x + u * c - v * d, wy, z + u * d + v * c];   // lily pads
            mb("fLily").mb.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), [0, 1, 0], [0, 0, 1, 1], tint()); }
          continue; }
        if (FIELD_SHAPE === "swamp" && y < out.waterY + .7 && R() < .55 && pathD(x, z, out) > 2.5) { cross(x, y, z, .9 + R() * .6, 1.3 + R() * .9, "fReed", tint(), R() * 3); continue; }   // reeds along the banks
        if (FIELD_SHAPE === "swamp" && y < out.waterY + 2.6 && R() < .09 && pathD(x, z, out) > 2) {   // puddles in the wet ground back from the water
          const rr = .7 + R() * 1.1, n = 9, py = Math.min(y, fh(x + rr, z), fh(x - rr, z), fh(x, z + rr), fh(x, z - rr)) + .05, m = mb("fPuddle").mb, P = k => { const a = k / n * 6.283, q = rr * (.7 + hash2(k, gx | 0, 31) * .5); return [x + Math.cos(a) * q, py, z + Math.sin(a) * q]; };
          for (let k = 0; k < n; k++) m.tri([x, py, z], P(k), P(k + 1), [0, 1, 0], [.5, .5], [0, 0], [1, 0], [.7, .78, .72]); }
        if (FIELD_SHAPE === "swamp" && y < out.waterY + 2 && R() < .25) { const w = 1.2 + R() * 1.2; cross(x, y, z, w, w * .75, "fFern", tint(), R() * 3); }
        if (r < f * .62) { if (R() < .05) { const br = .9 + R() * .7; crown(x, y + .65, z, br, .55 + R() * .35, br * (.8 + R() * .4), tint().map(v => v * .8), gx | 0, R, 5, 1); } else { const w = 1.4 + R() * 1.4; cross(x, y, z, w, w * .7, "fFern", tint(), R() * 3); } }
        else if (f < .5 && R() < .55 * (1 - f)) cross(x, y, z, .8 + R() * .6, .45 + R() * .35, "fGrass", tint(), R() * 3);
        if (f > .6 && R() < .006) { const a = R() * 6.28, L = 4 + R() * 4; tube([x, y + .3, z], [x + Math.cos(a) * L, fh(x + Math.cos(a) * L, z + Math.sin(a) * L) + .3, z + Math.sin(a) * L], .35, 6, "fLog", .45); }
        if (f > .7 && R() < .01) for (let k = 0; k < 3; k++) { const sx = x + R() - .5, sz = z + R() - .5, sy = fh(sx, sz), hh = .25 + R() * .4; cyl(sx, sz, sy, sy + hh, .05, 5, "fLog"); cyl(sx, sz, sy + hh, sy + hh + .08, .2, 6, "fShroom", { cap: "fShroom", r1: .05 }); } }
    });
    out.chunks.push({ x: x0 + CH / 2, z: z0 + CH / 2, parts });
    if (++done % 6 === 0) yield .78 + .12 * done / (n * n);
  }
}

// ---------- the generator: runs in slices so the drop animation stays smooth while it works ----------
function* generateField(m, out) {
  const S = SYSTEMS[m.sys ?? curSystem()], s = S.seed % 997, P = FIELD_PAL[m.biome] || FIELD_PAL.desert, R = seeded(m.seed + 99);
  if (m.dev) devSectionTextures();
  out.P = P; out.seed = s; out.forestOn = m.biome === "swamp"; FIELD_SHAPE = m.biome === "swamp" ? "swamp" : m.biome === "desert" ? "desert" : ""; fieldTextures(P, m.biome); fieldArt(P, m.biome); terrainLayers(out, P, m.biome); objTextures(); objTextures2(); if (FIELD_SHAPE === "desert") desertTextures();
  for (const k of ["fGround", "fRock", "fRockProp", "fBark", "fLeaf", "fCactus", "fIce", "fConcrete", "fNest", "fHole", "fTent", "fScorch", "fBox", "fSample", "fGlass", "fSky", "glowGreenS", "decalBlob", "fCanopy", "fFern", "fGrass", "fFrond", "fShroom", "fLog", "fWater", "fRuin", "fRune", "fFungus", "fBarkS", "fCanopyA", "fCanopyB", "fCanopyC", "fCanopyD", "fReed", "fLily", "fMoss", "fSnag", "fCypress", "fPlank", "fLeaf", "fLeafA", "fLeafB", "fLeafC", "fLeafD", "fBarkR", "fBarkG", "fBarkP", "fPuddle", "fRipple", "fPalm", "fOasisGrass", "fDryGrass"]) if (TXD[k]) R3.tex[k] = glTex(TXD[k]);
  yield .05;
  // points of interest, taken from where the war table showed them
  const spot = (k, rmin, rmax) => { const a = hash2(k, 1, S.seed) * 6.283, r = lerp(rmin, rmax, hash2(k, 2, S.seed)); return [Math.cos(a) * r * FW.RW * .95, Math.sin(a) * r * FW.RW * .95]; };
  const [ox, oz] = spot((m.slot ?? 0) * 7 + 3, .25, .78);
  const ang = Math.atan2(oz, ox) + Math.PI + (R() - .5) * .9, er = FW.RW * lerp(.5, .7, R());
  let ex = Math.cos(ang) * er, ez = Math.sin(ang) * er; if (Math.hypot(ex - ox, ez - oz) < 170) { ex = -ox * .9; ez = -oz * .9; }
  if (m.size === "quick") { const a2 = Math.atan2(-oz, -ox) + (R() - .5) * 1.4; ex = ox + Math.cos(a2) * 105; ez = oz + Math.sin(a2) * 105; }   // a quick op: extraction close to the objective
  const la = Math.atan2(ez - oz, ex - ox) + (R() - .5) * 1.2, lzx = ox + Math.cos(la) * 95, lzz = oz + Math.sin(la) * 95;
  out.obj = { x: ox, z: oz }; out.ext = { x: ex, z: ez }; out.lz = { x: lzx, z: lzz };
  out.flat = [[ox, oz, 32], [ex, ez, 22], [lzx, lzz, 14]];
  out.nestSpots = []; for (let k = 0; k < 5; k++) { const [x, z] = spot(100 + k, .3, .9); if (Math.hypot(x - lzx, z - lzz) > 70 && Math.hypot(x - ex, z - ez) > 60) out.nestSpots.push([x, z]); }
  out.outposts = []; for (let k = 0; k < 40 && out.outposts.length < 4; k++) { const a = R() * 6.283, r = FW.RW * lerp(.2, .8, R()), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if ([[ox, oz], [ex, ez], [lzx, lzz], ...out.nestSpots, ...out.outposts].every(([px, pz]) => Math.hypot(px - x, pz - z) > 70)) out.outposts.push([x, z]); }
  // points of interest: ruins, wrecks and supply caches to find off the main route
  const kinds = m.biome === "desert" ? ["bones", "hand", "crawler", "vapor", "cache", "wreck"] : ["ruins", "wreck", "cache", "ruins", "cache", "wreck"]; out.pois = [];
  for (let k = 0; k < 80 && out.pois.length < 5; k++) { const a = R() * 6.283, r = FW.RW * lerp(.15, .85, R()), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if ([[ox, oz], [ex, ez], [lzx, lzz], ...out.nestSpots, ...out.outposts, ...out.pois.map(p => [p.x, p.z])].every(([px, pz]) => Math.hypot(px - x, pz - z) > 65)) out.pois.push({ x, z, kind: kinds[out.pois.length], ang: R() * 6.283 }); }
  if (m.dev) { ex = 0; ez = 230; out.ext = { x: ex, z: ez }; out.obj = { x: 0, z: -40 }; out.lz = { x: 0, z: 26 }; out.nestSpots = []; out.outposts = [[0, 80]];
    out.pois = [{ x: 78, z: 0, kind: "ruins", ang: 0 }, { x: 0, z: -78, kind: "wreck", ang: 1 }, { x: -70, z: 0, kind: "cache", ang: 2 }];
    out.flat = [[0, 0, 40], [ex, ez, 22], ...DW_SEC.map(S => [S.x, S.z, S.r + 6])]; }
  for (const [x, z] of out.nestSpots) out.flat.push([x, z, 14]); for (const [x, z] of out.outposts) out.flat.push([x, z, 18]); for (const p of out.pois) out.flat.push([p.x, p.z, p.kind === "cache" ? 8 : p.kind === "bones" || p.kind === "crawler" ? 20 : 13]);
  // the water line sits low in the land (the bottom fifth), and rivers are carved down to it
  out.waterOn = m.biome === "swamp"; out.oases = [];
  // the desert: two or three oases, spring-fed pools in low ground ringed with grass and palms, away from everything else
  if (FIELD_SHAPE === "desert" && !m.dev) { const taken = [[ox, oz], [ex, ez], [lzx, lzz], ...out.nestSpots, ...out.outposts, ...out.pois.map(p => [p.x, p.z])];
    for (let k = 0; k < 160 && out.oases.length < 3; k++) { const a = R() * 6.283, r = FW.RW * lerp(.2, .78, R()), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (fieldRaw(x, z, s) > 3 || ![...taken, ...out.oases].every(([px, pz]) => Math.hypot(px - x, pz - z) > 75)) continue; out.oases.push([x, z, 13 + R() * 6]); }
    if (out.oases.length) { out.waterOn = true; out.waterY = -3.35; } }
  if (out.waterOn && FIELD_SHAPE !== "desert") { const hs = []; for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) { const x = (i / 29 * 2 - 1) * FW.RW * .85, z = (j / 29 * 2 - 1) * FW.RW * .85; if (Math.hypot(x, z) < FW.RW * .85) hs.push(fieldRaw(x, z, s)); }
    hs.sort((a, b) => a - b); out.waterY = hs[Math.floor(hs.length * (FIELD_SHAPE === "swamp" ? .36 : .2))] + .3; }
  for (const f of out.flat) f.push(out.waterOn ? Math.max(riverCarve(f[0], f[1], fieldRaw(f[0], f[1], s), out), out.waterY + .7) : fieldRaw(f[0], f[1], s));
  buildPaths(out, m.dev ? [[0, 0], ...DW_SEC.map(S => [S.x, S.z]), [ex, ez]] : [[lzx, lzz], [ox, oz], [ex, ez], ...out.outposts, ...out.pois.map(p => [p.x, p.z])]);
  yield .1;
  // heights
  const N = FW.N, H = new Float32Array((N + 1) * (N + 1)), cell = FW.HALF * 2 / N; out.H = H; out.cell = cell;
  for (let j = 0; j <= N; j++) { for (let i = 0; i <= N; i++) { const x = -FW.HALF + i * cell, z = -FW.HALF + j * cell; let h = riverCarve(x, z, fieldRaw(x, z, s), out);
      for (const [fx, fz, fr, fh] of out.flat) { const d = Math.hypot(x - fx, z - fz); if (d < fr * 1.8) { const k = clamp((d - fr) / (fr * .8), 0, 1), w = k * k * (3 - 2 * k); h = lerp(fh, h, w); } }
      if (out.waterOn && FIELD_SHAPE === "swamp" && pathD(x, z, out) < 2.4) h = Math.max(h, out.waterY + .27);   // trails cross the water on causeways (with boardwalks over them)
      H[j * (N + 1) + i] = h; }
    if (j % 20 === 0) yield .1 + .3 * j / N; }
  // the ground: 2 m quads with smooth normals, every vertex carrying its blend weights for the splat shader
  // (litter, mud, trail in the colour; forest shade in the uv), so layers fade into each other instead of tiling in squares
  const terrainParts = buildParts(() => {
    const tm = mb("terrain").mb, hv = (i, j) => H[j * (N + 1) + i], M2 = 2 * N + 1, half = cell / 2, VH = new Float32Array(M2 * M2), VA = new Float32Array(M2 * M2 * 4), VN = new Float32Array(M2 * M2 * 3);
    for (let J = 0; J < M2; J++) for (let I = 0; I < M2; I++) { const i = I >> 1, j = J >> 1, u = (I & 1) * .5, v = (J & 1) * .5, i1 = Math.min(N, i + 1), j1 = Math.min(N, j + 1);
      VH[J * M2 + I] = lerp(lerp(hv(i, j), hv(i1, j), u), lerp(hv(i, j1), hv(i1, j1), u), v); }
    for (let J = 0; J < M2; J++) for (let I = 0; I < M2; I++) { const x = -FW.HALF + I * half, z = -FW.HALF + J * half, h = VH[J * M2 + I], o = (J * M2 + I) * 4;
      const a = VH[J * M2 + Math.max(0, I - 1)], b = VH[J * M2 + Math.min(M2 - 1, I + 1)], c = VH[Math.max(0, J - 1) * M2 + I], d = VH[Math.min(M2 - 1, J + 1) * M2 + I], n = norm3([(a - b) / (2 * half), 1, (c - d) / (2 * half)]); VN.set(n, (J * M2 + I) * 3);
      const f = forestAt(x, z, out), nz2 = fbm(x / 26, z / 26, s + 71), pd = pathD(x, z, out);
      VA[o] = out.forestOn ? f * .8 + (nz2 - .5) * 1.1 + .08 : FIELD_SHAPE === "desert" ? desertDuneMask(x, z, s) * 1.1 - .1 + (nz2 - .5) * .7 : .5 + (nz2 - .5) * 1.6;   // ripples on the dune seas                       // litter / second ground
      VA[o + 1] = out.waterOn && FIELD_SHAPE !== "desert" ? clamp(1 - (h - out.waterY) / (FIELD_SHAPE === "swamp" ? 2.1 : 1.25), 0, 1) + (FIELD_SHAPE === "swamp" ? (fbm(x / 17, z / 17, s + 73) - .5) * .9 : 0) : clamp((fbm(x / 60, z / 60, s + 72) - .62) * 3, 0, .7);   // mud near the water (or the odd damp patch)
      VA[o + 2] = Math.max(clamp(1 - pd / 4.2, 0, 1), FIELD_SHAPE === "desert" ? desertWadi(x, z, s) * 1.2 : 0); VA[o + 3] = f * (FATLAS.ground ? .35 : 1); }                     // trail, forest shade
    const wetK = h => out.waterOn ? clamp(1 - (h - out.waterY) / .7, 0, 1) : 0;
    const oasisK = (x, z) => { let w = 0; for (const [ox, oz, r] of out.oases) w = Math.max(w, clamp(1 - (Math.hypot(x - ox, z - oz) - r * 1.05) / 10, 0, 1)); return w ? w + (fbm(x / 9, z / 9, s + 74) - .5) * .6 : 0; };   // oasis grass
    const V = (I, J) => { const k = J * M2 + I, o = k * 4, x = -FW.HALF + I * half, z = -FW.HALF + J * half; tm.vert([x, VH[k], z], [FIELD_SHAPE === "desert" ? oasisK(x, z) : wetK(VH[k]), VA[o + 3]], [VN[k * 3], VN[k * 3 + 1], VN[k * 3 + 2]], [VA[o], VA[o + 1], VA[o + 2]]); };
    for (let J = 0; J < M2 - 1; J++) for (let I = 0; I < M2 - 1; I++) { V(I, J); V(I + 1, J); V(I + 1, J + 1); V(I, J); V(I + 1, J + 1); V(I, J + 1); } });
  yield .5;
  // props: rocks, flora and outposts, merged into one static mesh; collision circles beside them
  const C = []; out.coll = C; out.cgrid = new Map(); const fh = (x, z) => fieldH(x, z, out);
  const clear = (x, z, r) => (out.oases || []).every(([ox, oz, or]) => Math.hypot(x - ox, z - oz) > or * .85 + r) && out.flat.every(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) > fr + r) && Math.hypot(x, z) < FW.RW * .9;
  const propParts = buildParts(() => {
    if (FIELD_SHAPE === "desert") for (let k = 0; k < 200; k++) { const x = (R() * 2 - 1) * FW.RW * .9, z = (R() * 2 - 1) * FW.RW * .9; if (clear(x, z, 4)) boulders(C, x, fh(x, z), z, R); }
    else for (let k = 0; k < 230; k++) { const x = (R() * 2 - 1) * FW.RW * .9, z = (R() * 2 - 1) * FW.RW * .9, sz = .6 + R() ** 2 * 3.4; if (!clear(x, z, sz + 2)) continue;
      const y = fh(x, z), parts = 1 + (R() * 3 | 0);
      for (let q = 0; q < parts; q++) { const w = sz * (.7 + R() * .6), h = sz * (.5 + R() * .7), dx = (R() - .5) * sz, dz = (R() - .5) * sz;
        obox(x + dx, y + h * .35, z + dz, w, h, w * (.7 + R() * .5), R() * 6.28, (R() - .5) * .5, "fRockProp"); }
      C.push([x, z, sz * .75, y + sz]); }
    const F = P.flora;
    for (let k = 0; k < (F === "desert" ? 340 : 170); k++) { const x = (R() * 2 - 1) * FW.RW * .9, z = (R() * 2 - 1) * FW.RW * .9; if (!clear(x, z, 3)) continue; const y = fh(x, z);
      if (F === "desert") { const k2 = R(), steep = Math.abs(fh(x + 1.5, z) - fh(x - 1.5, z)) + Math.abs(fh(x, z + 1.5) - fh(x, z - 1.5)) > 1.6; if (steep || pathD(x, z, out) < 4) continue;
        if (k2 < .34) saguaro(C, x, y, z, R); else if (k2 < .47) barrelCacti(x, y, z, R, fh); else if (k2 < .6) deadTree(C, x, y, z, R); else if (k2 < .78) deadShrub(x, y, z, R); else hoodoo(C, x, y, z, R); }
      else if (F === "swamp") { continue; const h = 6 + R() * 7; cyl(x, z, y, y + h, .4, 7, "fBark", { r1: .25 });
        for (let q = 0; q < 3; q++) obox(x + (R() - .5) * 2, y + h - .5 + q * .9, z + (R() - .5) * 2, 3.4 - q * .8, 1.4, 3.4 - q * .8, R() * 6.28, (R() - .5) * .3, "fLeaf");
        C.push([x, z, .6, y + h]); }
      else { const h = 2 + R() * 6; cyl(x, z, y, y + h, .5 + R() * .8, 6, "fIce", { r1: .05 }); if (R() < .5) cyl(x + 1, z + .6, y, y + h * .6, .4, 6, "fIce", { r1: .04 }); C.push([x, z, .9, y + h]); } }
    // points of interest
    for (const p of out.pois) { const y = fh(p.x, p.z), P2 = (d, a) => [p.x + Math.cos(p.ang + a) * d, p.z + Math.sin(p.ang + a) * d];
      if (p.kind === "ruins") { xform(() => mdlRuins((p.x * 13 + p.z * 7) | 0), { t: [p.x, y, p.z], yaw: p.ang });
        const cy = Math.cos(p.ang), sy = Math.sin(p.ang); for (let k = 0; k < 9; k++) { if (k === 2 || k === 6) continue; const a = k / 9 * 6.283, lx = Math.cos(a) * 7.1, lz = Math.sin(a) * 7.1; C.push([p.x + lx * cy + lz * sy, p.z - lx * sy + lz * cy, .8, y + 4]); }
        C.push([p.x, p.z, 1.6, y + 1.7]); }
      if (p.kind === "wreck") {   // a crashed shuttle: the same wreck as the black box missions, a bit smaller
        const k = .8, cy = Math.cos(p.ang), sy = Math.sin(p.ang), W = (lx, lz) => [p.x + (lx * cy + lz * sy) * k, p.z + (-lx * sy + lz * cy) * k];
        livery("F", () => xform(() => mdlWreck(), { t: [p.x, y, p.z], yaw: p.ang, s: k }));
        for (const [lx, lz, r] of [[-3.4, -1.1, 1.4], [-.9, -.7, 1.4], [3.2, 2.9, 1.4], [4.8, 3.8, 1.2]]) { const [wx, wz] = W(lx, lz); C.push([wx, wz, r * k, y + 2.2]); } }
      if (p.kind === "cache") { livery("F", () => xform(() => mdlCache(), { t: [p.x, y, p.z], yaw: p.ang })); C.push([p.x, p.z, 1.2, y + 1.6]); }
      const DM = { bones: mdlBones, hand: mdlHand, crawler: mdlCrawler, vapor: mdlVaporators }[p.kind];
      if (DM) { const cy = Math.cos(p.ang), sy = Math.sin(p.ang), W = (lx, lz) => [p.x + lx * cy + lz * sy, p.z - lx * sy + lz * cy], Cl = []; livery("F", () => xform(() => DM(Cl, W), { t: [p.x, y, p.z], yaw: p.ang })); for (const c of Cl) C.push([c[0], c[1], c[2], y + c[3]]); } }
    // colony outposts: concrete blocks with door gaps, a fuel tank and barriers
    for (const [px, pz] of out.outposts) { const y = fh(px, pz), ang = hash2(px | 0, pz | 0, 9) * 6.283, cy = Math.cos(ang), sy = Math.sin(ang), W = (lx, lz) => [px + lx * cy + lz * sy, pz - lx * sy + lz * cy];
      const Cl = []; livery(m.enemy === "humans" ? "E" : "F", () => xform(() => mdlOutpost(Cl, W), { t: [px, y, pz], yaw: ang })); for (const c of Cl) C.push([c[0], c[1], c[2], y + c[3]]); }
    if (m.dev) devSectionProps(out, C, fh);
    // the desert: a little dry grass, in clumps, mostly on the scrubby patches and in the lee of rocks; never on the trails
    if (FIELD_SHAPE === "desert" && TXD.fDryGrass) for (let k = 0; k < 1700; k++) { const x = (R() * 2 - 1) * FW.RW * .9, z = (R() * 2 - 1) * FW.RW * .9, scrub = clamp((fbm(x / 60, z / 60, s + 72) - .55) * 3, 0, 1);
      if (R() > .3 + scrub * .7 || !clear(x, z, 2) || pathD(x, z, out) < 3.5) continue; const green = R() < .3;
      for (let q = 0, n = 3 + (R() * 6 | 0); q < n; q++) { const tx = x + (R() - .5) * 3.5, tz = z + (R() - .5) * 3.5, ty = fh(tx, tz); if (Math.abs(fh(tx + 1, tz) - fh(tx - 1, tz)) > 1.2) continue; const w = .6 + R() * .6, k = .85 + R() * .25;
        if (green && TXD.fGrass) cross(tx, ty, tz, w * .9, w * (.5 + R() * .3), "fGrass", [k * .95, k * .85, k * .6], R() * 3);   // a few hardier, greener clumps
        else cross(tx, ty, tz, w, w * (.6 + R() * .4), "fDryGrass", [k, k * (.95 + R() * .1), k * .9], R() * 3); } }
    // a few natural rock arches
    if (FIELD_SHAPE === "desert") for (let k = 0, n = 0; k < 60 && n < 3; k++) { const x = (R() * 2 - 1) * FW.RW * .8, z = (R() * 2 - 1) * FW.RW * .8; if (!clear(x, z, 14) || pathD(x, z, out) < 10) continue; rockArch(C, x, fh(x, z), z, R() * 3.14, R); n++; }
    // oases: date palms leaning out over the pool, reeds in the shallows, grass tufts and bushes on the green ring, a few rocks
    for (const [ox, oz, r] of out.oases || []) { const wy = out.waterY;
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + R() * .5, d = r * (.95 + R() * .45), x = ox + Math.cos(a) * d, z = oz + Math.sin(a) * d, y = fh(x, z); if (!clear(x, z, 1)) continue;
        const h = 6 + R() * 4, lean = .25 + R() * .3, la = a + Math.PI + (R() - .5) * .8, top = [x + Math.cos(la) * h * lean, y + h, z + Math.sin(la) * h * lean], mid = [x + Math.cos(la) * h * lean * .3, y + h * .55, z + Math.sin(la) * h * lean * .3];
        tube([x, y - .3, z], mid, .22, 6, "fPalm", 1.2); tube(mid, top, .18, 6, "fPalm", 1.2);
        const m = mb("fFrond").mb, c = [.95 + R() * .1, 1, .85]; for (let q = 0; q < 9; q++) { const fa = q / 9 * 6.283 + R(), L = 2.6 + R(), ca = Math.cos(fa), sa = Math.sin(fa), px = -sa * .5, pz = ca * .5, tx = top[0], ty = top[1], tz = top[2];
          const md = [tx + ca * L * .55, ty + .35, tz + sa * L * .55], tp = [tx + ca * L, ty - 1.1 - R() * .6, tz + sa * L];
          m.quad([tx + px, ty, tz + pz], [md[0] + px, md[1], md[2] + pz], [md[0] - px, md[1], md[2] - pz], [tx - px, ty, tz - pz], [0, 1, 0], [0, 0, .55, 1], c);
          m.quad([md[0] + px, md[1], md[2] + pz], [tp[0] + px * .4, tp[1], tp[2] + pz * .4], [tp[0] - px * .4, tp[1], tp[2] - pz * .4], [md[0] - px, md[1], md[2] - pz], [0, 1, 0], [.55, 0, 1, 1], c.map(v => v * .85)); }
        for (let q = 0; q < 3; q++) box(top[0] + (R() - .5) * .4 - .08, top[1] - .5, top[2] + (R() - .5) * .4 - .08, top[0] + (R() - .5) * .4 + .08, top[1] - .25, top[2] + (R() - .5) * .4 + .08, "fPalm");   // date clusters
        C.push([x, z, .35, y + h]); }
      for (let k = 0; k < 70; k++) { const a = R() * 6.283, d = r * (.55 + R() * .9), x = ox + Math.cos(a) * d, z = oz + Math.sin(a) * d, y = fh(x, z), dep = wy - y;
        if (dep > .55) continue; if (dep > -.25) cross(x, y, z, .9 + R() * .5, Math.max(0, dep) + 1.1 + R() * .8, "fReed", [.95, .9, .8], R() * 3);
        else if (R() < .75) cross(x, y, z, .8 + R() * .6, .5 + R() * .4, "fGrass", [.9 + R() * .2, .95, .8], R() * 3); else { const br = .7 + R() * .5; crown(x, y + .45, z, br, .45 + R() * .25, br, [.8, .9, .7], k, R, 5, 1); } }
      for (let k = 0; k < 4; k++) { const a = R() * 6.283, d = r * (1.2 + R() * .3), x = ox + Math.cos(a) * d, z = oz + Math.sin(a) * d, sz = .6 + R() * .8; obox(x, fh(x, z) + sz * .3, z, sz * 1.3, sz, sz, R() * 6, (R() - .5) * .3, "fRockProp"); C.push([x, z, sz * .6, fh(x, z) + sz]); } }
    // boardwalks: wherever a trail crosses the water, planks on posts over a muddy causeway, with a rope rail
    if (out.waterOn && FIELD_SHAPE === "swamp") { const wy = out.waterY, wet = (x, z) => fh(x, z) < wy + .31 && riverCarve(x, z, fieldRaw(x, z, s), out) < wy + .12;
      for (const pts of out.paths) { let n = 0, last = {}; for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, yaw = Math.atan2(-dz, dx);
          for (let t = 0; t < L; t += 1) { const x = ax + dx * t, z = az + dz * t; if (!wet(x, z)) { last = {}; continue; }
            obox(x, wy + .4 + (R() - .5) * .03, z, .9, .09, 2.3, yaw + (R() - .5) * .05, 0, "fPlank");
            if (n++ % 3 === 0) for (const sd of [-1, 1]) { const px = x - dz * sd * 1.15, pz = z + dx * sd * 1.15; cyl(px, pz, wy - 1, wy + .78, .07, 5, "fSnag", { cap: "fSnag" });
              if (last[sd] && Math.hypot(last[sd][0] - px, last[sd][2] - pz) < 4) tube(last[sd], [px, wy + .72, pz], .02, 3, "fRope", 1); last[sd] = [px, wy + .72, pz]; } } } }
      // the edge of the map: a wall of giant trees on a low rise, crowns closing over the horizon
      for (const [rk, step] of [[.955, 10], [1.01, 12], [1.07, 14]]) { const r0 = FW.RW * rk, n = Math.round(6.283 * r0 / step);
        for (let k = 0; k < n; k++) { const a = (k + R() * .6) / n * 6.283, rr = r0 + (R() - .5) * 5, x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = fh(x, z), h = 22 + R() * 9, r = 1.1 + R() * .6, bk = R() < .5 ? "fBarkR" : "fBarkS";
          cyl(x, z, y - .5, y + h, r, 7, bk, { r1: r * .5, tile: 3, tv: Math.round(h / 1.3), col: [.78, .74, .7] });
          for (let q = 0; q < 2; q++) { const qa = R() * 6.28, qd = q ? 3 + R() * 2 : 0; crown(x + Math.cos(qa) * qd, y + h - q * 2.5, z + Math.sin(qa) * qd, 6 + R() * 2, 2 + R(), 6 + R() * 2, [.72 + R() * .15, .8 + R() * .12, .7], (x * 3 + q) | 0, R, 7, 2); }
          if (rk < 1) C.push([x, z, r + .3, y + h]); } }
      // on the muddy stretches of trail: a few planks thrown down across the mud, and the odd fallen log beside the way
      for (const pts of out.paths) for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, yaw = Math.atan2(-dz, dx);
        for (let t = 0; t < L; t += 1.6) { const x = ax + dx * t, z = az + dz * t, y = fh(x, z); if (wet(x, z) || !clear(x, z, 1)) continue;
          if (y < wy + 1.4 && R() < .13) for (let q = 0; q < 2 + (R() * 2 | 0); q++) { const o = (q - 1) * .42; obox(x + dx * o, fh(x + dx * o, z + dz * o) + .04, z + dz * o, .3, .06, 1.5 + R() * .4, yaw + (R() - .5) * .25, (R() - .5) * .08, "fPlank"); }
          else if (R() < .012) { const sd = R() < .5 ? -1 : 1, ox = -dz * sd * 2.6, oz = dx * sd * 2.6, a0 = [x + ox, 0, z + oz], a1 = [x + ox + dx * 4.5, 0, z + oz + dz * 4.5]; a0[1] = fh(a0[0], a0[2]) + .28; a1[1] = fh(a1[0], a1[2]) + .28; tube(a0, a1, .3, 6, "fLog", .45); } } } }
  });
  yield .75;
  // the extraction pad
  const ey = fh(ex, ez), padParts = buildParts(() => {
    livery("F", mdlExtractPad); });
  out.padParts = padParts; out.padY = ey; C.push([ex + 10.5, ez, .6, ey + 1.4]); for (const a of [1.2, 2.4, 4.3, 5.4]) C.push([ex + Math.cos(a) * 10.6, ez + Math.sin(a) * 10.6, .25, ey + 5.3]); C.push([ex - 6.5, ez - 6.5, .25, ey + 9]); for (const c of C) cgAdd(out, c);
  out.parts = [...terrainParts, ...propParts];
  out.waterParts = out.waterOn ? buildParts(() => { const m2 = mb("fWater").mb, wy = out.waterY, hv = (i, j) => H[j * (N + 1) + i];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (Math.min(hv(i, j), hv(i + 1, j), hv(i + 1, j + 1), hv(i, j + 1)) > wy) continue; const x0 = -FW.HALF + i * cell, z0 = -FW.HALF + j * cell;
      const sc = (i2, j2) => { const d = clamp((wy - hv(i2, j2)) / .55, 0, 1); return [1.22 - d * .3, 1.2 - d * .26, 1.02 - d * .14]; };   // scummy, paler shallows at the edge
      m2.quad([x0, wy, z0], [x0 + cell, wy, z0], [x0 + cell, wy, z0 + cell], [x0, wy, z0 + cell], [0, 1, 0], [x0 / 6, z0 / 6, (x0 + cell) / 6, (z0 + cell) / 6], [sc(i, j), sc(i + 1, j), sc(i + 1, j + 1), sc(i, j + 1)]); } }) : [];
  yield .78;
  out.chunks = []; out.spiderSpots = []; out.giantSpots = []; out.emergent = [];
  if (out.forestOn && GIANTS_ON) {   // canopy stalker lairs: deep forest, far from the landing zone, extraction and objective
    const RG = seeded(m.seed + 57), want = 2 + Math.floor(m.diff / 2), avoid = [[out.lz.x, out.lz.z, 95], [out.ext.x, out.ext.z, 60], [out.obj.x, out.obj.z, 55]];
    for (let tries = 0; tries < 2500 && out.giantSpots.length < want; tries++) { const a = RG() * 6.283, d = Math.sqrt(RG()) * FW.RW * .8, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (forestAt(x, z, out) < .9 || avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r) || out.giantSpots.some(g => Math.hypot(g[0] - x, g[1] - z) < 130)) continue;
      let deep = 0; for (let k = 0; k < 8; k++) deep += forestAt(x + Math.cos(k * .785) * 20, z + Math.sin(k * .785) * 20, out) > .6 ? 1 : 0; if (deep < 7) continue;
      out.giantSpots.push([x, z, RG() * 6.283]); }
  }
  if (out.forestOn) yield* buildForest(out, R, fh);
  yield .9;
  ensurePodModels(); out.podParts = R3.podFull;
  out.nestPartsAlive = buildParts(() => mdlHive(false));
  out.nestPartsDead = buildParts(() => mdlHive(true));
  out.crateParts = buildParts(() => livery("F", mdlResupply));
  out.boxParts = buildParts(() => livery("F", mdlBlackBox));
  out.sampleParts = buildParts(mdlSample);
  out.sentryParts = buildParts(() => livery("F", mdlSentryBase));
  out.gunParts = buildParts(() => livery("F", () => mdlSentryGun(false))); out.rocketParts = buildParts(() => livery("F", () => mdlSentryGun(true)));
  yield 1;
}
// exact height on the terrain triangles
function fieldH(x, z, W = FLD) {
  const N = FW.N, c = W.cell, fx = (x + FW.HALF) / c, fz = (z + FW.HALF) / c, i = clamp(Math.floor(fx), 0, N - 1), j = clamp(Math.floor(fz), 0, N - 1), u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1);
  const H = W.H, s = N + 1, a = H[j * s + i], b = H[j * s + i + 1], cc = H[(j + 1) * s + i + 1], d = H[(j + 1) * s + i];
  return u > v ? a + (b - a) * u + (cc - b) * v : a + (d - a) * v + (cc - d) * u;
}

// ---------- the pod's two live screens: flight status on the right, target on the left ----------
const PODSCR = { L: null, R: null, t: 0 };
function podScreenTex(name, c) { const gl = R3.gl; let t = R3.tex[name]; if (!t) { t = R3.tex[name] = gl.createTexture(); }
  gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); }
function drawPodScreens(D) {
  if (!R3.gl) return; if (!PODSCR.L) for (const k of ["L", "R"]) { const c = document.createElement("canvas"); c.width = 64; c.height = 48; PODSCR[k] = c; }
  const t = performance.now() / 1000, st = D ? D.stage : "idle", blink = Math.sin(t * 8) > 0;
  const txt = (g, s, x, y, col, size = 8) => { g.font = `bold ${size}px monospace`; g.fillStyle = col; g.fillText(s, x, y); };
  const frame = (g, col) => { g.fillStyle = "#06100f"; g.fillRect(0, 0, 64, 48); g.strokeStyle = col; g.strokeRect(1.5, 1.5, 61, 45); for (let y = 0; y < 48; y += 3) { g.fillStyle = "rgba(255,255,255,.03)"; g.fillRect(0, y, 64, 1); } };
  // right: flight status
  { const g = PODSCR.R.getContext("2d"), cy = "#5ff2e0", am = "#ffb43a", rd = "#ff4a3a"; let col = cy; frame(g, cy);
    if (!D || st === "board") { txt(g, "STARFALL", 5, 12, cy); txt(g, "STANDBY", 5, 26, cy, 10); txt(g, "SEAL DOOR", 5, 40, am); }
    else if (st === "count") { col = rd; frame(g, rd); txt(g, "LAUNCH IN", 5, 12, rd); txt(g, D.t < 3 ? "T-" + (3 - Math.floor(D.t)) : "GO", 14, 34, rd, 18); }
    else if (st === "launch") { txt(g, "RELEASE", 5, 12, am); txt(g, (D.v || 0).toFixed(0) + " M/S", 5, 30, cy, 10); }
    else if (st === "space") { txt(g, "ORBITAL", 5, 12, cy); txt(g, "DESCENT", 5, 23, cy); const pr = D.loaded ? 1 : D.prog || 0; g.fillStyle = "#16302c"; g.fillRect(5, 30, 54, 6); g.fillStyle = cy; g.fillRect(5, 30, 54 * pr, 6); txt(g, D.loaded ? "SURVEY OK" : "SURVEY " + (pr * 100 | 0) + "%", 5, 45, am, 7); }
    else if (st === "entry") { frame(g, rd); const temp = 300 + D.t / 2.5 * 1500; txt(g, "HULL TEMP", 5, 12, am); txt(g, (temp | 0) + "°C", 5, 30, temp > 1200 && blink ? rd : am, 13); txt(g, "ENTRY", 5, 44, rd); }
    else if (st === "fall") { const alt = Math.max(0, D.py - D.gy); txt(g, D.burn ? "RETRO BURN" : "ALTITUDE", 5, 12, D.burn ? am : cy); txt(g, String(alt | 0).padStart(4, "0") + "M", 5, 30, alt < 80 && blink ? rd : cy, 13);
      g.fillStyle = "#16302c"; g.fillRect(56, 6, 4, 38); g.fillStyle = alt < 80 ? rd : cy; const h = clamp(alt / D.alt, 0, 1) * 38; g.fillRect(56, 44 - h, 4, h); txt(g, (D.vs || 0).toFixed(0) + "M/S", 5, 44, am, 7); }
    else if (st === "land") { const n = 3 - Math.floor(D.t / .45); if (D.t < .5) { txt(g, "IMPACT", 5, 14, am, 10); txt(g, "HULL OK", 5, 30, cy); } else { frame(g, rd); txt(g, "DOOR", 5, 12, rd); txt(g, "CHARGES", 5, 22, rd); txt(g, n > 0 ? String(n) : "!", 26, 44, rd, 18); } }
    else { frame(g, am); txt(g, "DOOR", 5, 14, am, 10); txt(g, "CLEAR", 5, 30, am, 10); }
    podScreenTex("glowPodR", PODSCR.R); }
  // left: target / landing zone
  { const g = PODSCR.L.getContext("2d"), cy = "#5ff2e0", am = "#ffb43a"; frame(g, cy);
    const cx = 22, cyy = 26, r = 16; g.strokeStyle = "rgba(95,242,224,.5)"; g.beginPath(); g.arc(cx, cyy, r, 0, 7); g.moveTo(cx - r, cyy); g.lineTo(cx + r, cyy); g.moveTo(cx, cyy - r); g.lineTo(cx, cyy + r); g.stroke();
    const sw = t * 2 % 6.283; g.strokeStyle = "rgba(95,242,224,.9)"; g.beginPath(); g.moveTo(cx, cyy); g.lineTo(cx + Math.cos(sw) * r, cyy + Math.sin(sw) * r); g.stroke();
    if (blink) { g.fillStyle = am; g.fillRect(cx + 5, cyy - 7, 3, 3); }
    txt(g, "LZ", 43, 14, am); const fall = D && D.stage === "fall"; txt(g, fall ? String(Math.max(0, D.py - D.gy) | 0) : D && (st === "space" || st === "entry") ? "LOCK" : "--", 41, 28, cy, 7);
    txt(g, D && D.m ? (D.m.planet || "").slice(0, 5).toUpperCase() : "SHIP", 39, 42, cy, 7);
    podScreenTex("glowPodL", PODSCR.L); }
}
