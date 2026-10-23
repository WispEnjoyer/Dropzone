// =====================================================================================
//  THE SHIP: a small first-person deck in real 3D (WebGL). Geometry is built from boxes,
//  cylinders and cones wrapped in low-res pixel textures, rendered at a low resolution and
//  scaled up without smoothing. Only the people are flat 2D sprites.
// =====================================================================================
const BASE = { x: 7, z: 9.2, a: -Math.PI / 2, pitch: 0, bob: 0, selected: null, zone: "", t: 0, toast: null, near: null, built: false, unlockT: 0, noLock: false, step: 0 };
const WALL_H = 3, EYE = 1.62;

// ---------- pixel textures: RGBA bytes; alpha 128 = glows (ignores light), 0 = see-through ----------
function tex(w, h, fn) { const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y); if (!c) continue; const o = (y * w + x) * 4; d[o] = clamp(c[0], 0, 255); d[o + 1] = clamp(c[1], 0, 255); d[o + 2] = clamp(c[2], 0, 255); d[o + 3] = c[3] ? 128 : 255; }
  return { w, h, d }; }
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
function mkSprite(w, h, fn, outline = "#0c0a08") {
  const g = new Array(w * h).fill(null); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = fn(x, y) || null;
  const o = g.slice(); if (outline) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (g[i]) continue;
    if ((x > 0 && g[i - 1]) || (x < w - 1 && g[i + 1]) || (y > 0 && g[i - w]) || (y < h - 1 && g[i + w])) o[i] = outline; }
  return tex(w, h, (x, y) => { const c = o[y * w + x]; if (!c) return null; return Array.isArray(c) ? [...hx(c[0]), 1] : hx(c); });
}
function texCanvas(T, scale = 1) { const c = document.createElement("canvas"); c.width = T.w; c.height = T.h; const g = c.getContext("2d"), im = g.createImageData(T.w, T.h);
  for (let i = 0; i < T.w * T.h; i++) { im.data[i * 4] = T.d[i * 4]; im.data[i * 4 + 1] = T.d[i * 4 + 1]; im.data[i * 4 + 2] = T.d[i * 4 + 2]; im.data[i * 4 + 3] = T.d[i * 4 + 3] ? 255 : 0; }
  g.putImageData(im, 0, 0); c.style.width = T.w * scale + "px"; c.style.height = T.h * scale + "px"; return c; }

const TXD = {};
// hand-made tileset textures (see tex_build.py); alpha 128 in the image = glowing pixel
const TEXART_LOADED = {};
// the ship's tileset, regraded into the livery: wall panels become warm gunmetal with brass
// rivets and a green accent stripe, the decks and ceilings blackened iron. Glowing pixels and the hazard yellows are left alone.
const SHIP_GRADE = {}; for (const k of ["hull", "hull2", "hull3", "hull4", "hullL", "hullBox", "eng2", "stripe", "screen", "screen2", "screen3", "bayHatch", "decal", "pano"]) SHIP_GRADE[k] = "wall";
for (const k of ["plate", "grate", "floorBridge", "floorBay", "arrows", "floorEng", "floorRust", "ceil", "vent", "ceilL", "metal", "dark", "rib", "cabinet", "consoleBody", "plate2", "bayVent", "rack", "pipe", "counter"]) SHIP_GRADE[k] = "iron";
function gradePx(d, p, mode) { const r = d[p] / 255, g = d[p + 1] / 255, b = d[p + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, L = .3 * r + .59 * g + .11 * b;
  if (sat > .38 && mx > .35) return;   // hazard stripes, warning paint, coloured lights
  const set = c => { d[p] = clamp(c[0], 0, 255); d[p + 1] = clamp(c[1], 0, 255); d[p + 2] = clamp(c[2], 0, 255); }, lr = (a, b, t) => a.map((v, i) => v + (b[i] - v) * clamp(t, 0, 1));
  if (mode === "iron") { const v = L * 235; return set([v * 1.04, v * .99, v * .92]); }
  if (L > .66) return set(lr([170, 140, 70], [236, 206, 128], (L - .66) / .3));   // the brightest bits: brass
  const v = L * 225; return set([v * 1.05, v, v * .93]); }   // gunmetal plates; the green is only an accent stripe
function loadTexArt() { if (typeof TEXART === "undefined") return; for (const k in TEXART) { const img = new Image(); img.onload = () => {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const im = g.getImageData(0, 0, img.width, img.height).data, d = new Uint8Array(im.length);
    const grade = SHIP_GRADE[k];
    for (let p = 0; p < im.length; p += 4) { const a = im[p + 3]; if (a < 40) continue; d[p] = im[p]; d[p + 1] = im[p + 1]; d[p + 2] = im[p + 2]; d[p + 3] = a > 200 ? 255 : 128; if (grade && a > 200) gradePx(d, p, grade); }
    const T = { w: img.width, h: img.height, d }; TEXART_LOADED[k] = T; TXD[k] = T; if (R3.gl && BASE.built) R3.tex[k] = glTex(T); }; img.src = TEXART[k]; } }
loadTexArt();
function buildTextures() {
  const N = (x, y, s, a) => (hash2(x, y, s) - .5) * a;
  // walls are 1m x 3m (32 x 96), y = 0 is the ceiling edge
  const hull = (x, y, base = [74, 80, 90]) => { const n = N(x, y, 1, 10);
    if (y < 4) return y === 3 ? [100, 104, 112] : [34, 36, 42];
    if (x === 0 || y === 40 || y === 76) return [40, 44, 52]; if (x === 1 || y === 41 || y === 77) return [104, 110, 120];
    if ((x === 4 || x === 27) && (y === 9 || y === 35 || y === 46 || y === 71)) return [140, 146, 156];
    if (y >= 84) return y === 84 ? [110, 112, 116] : [48, 52, 60].map(v => v + n);
    return base.map(v => v + n); };
  TXD.hull = tex(32, 96, hull);
  TXD.hullL = tex(32, 96, (x, y) => y >= 22 && y <= 25 && x >= 5 && x <= 26 ? (y === 22 || y === 25 ? [170, 150, 100] : [255, 238, 196, 1]) : hull(x, y));
  TXD.screen = tex(32, 96, (x, y) => { if (x >= 3 && x <= 28 && y >= 30 && y <= 60) { if (x === 3 || x === 28 || y === 30 || y === 60) return [26, 28, 32];
      const ln = y % 4 === 2 && x > 5 && x < 5 + hash2(1, y, 9) * 21; return ln ? [110, 210, 255, 1] : x > 20 && y > 50 && hash2(x, y, 3) > .6 ? [242, 210, 48, 1] : [14, 34, 60, 1]; } return hull(x, y); });
  TXD.rack = tex(32, 96, (x, y) => { if (y >= 20 && y <= 76) { if (x === 0) return [30, 32, 36];
      for (const ry of [26, 42, 58]) { if (y >= ry && y <= ry + 2 && x >= 6 && x <= 26) return y === ry ? [100, 102, 108] : [34, 34, 38]; if (y >= ry + 1 && y <= ry + 5 && x >= 2 && x <= 8) return [84, 58, 36];
        if (y === ry + 1 && x >= 26 && x <= 31) return [24, 24, 26]; if (y >= ry + 3 && y <= ry + 6 && x >= 14 && x <= 16) return [34, 34, 38]; if (x === 18 && y === ry - 2) return [242, 210, 48]; if (y === ry + 8 && (x === 9 || x === 22)) return [120, 124, 130]; }
      return [46, 48, 54].map(v => v + N(x, y, 4, 8)); } return hull(x, y); });
  TXD.pipe = tex(32, 96, (x, y) => { for (const cx of [6, 16, 26]) { const d = Math.abs(x - cx); if (d <= 4) { const k = 1.15 - d * d / 18; if (y % 24 === 0 || y % 24 === 1) return [42, 48, 46];
        if (cx === 16 && y >= 44 && y <= 49 && d <= 1) return [114, 255, 120, 1]; return [94 * k, 116 * k, 104 * k]; } } return [30, 36, 34].map(v => v + N(x, y, 5, 6)); });
  TXD.stripe = tex(32, 96, (x, y) => y >= 62 && y <= 83 ? (y === 62 || y === 83 ? [20, 20, 20] : ((x + y) >> 2) & 1 ? [224, 182, 40] : [34, 32, 30]) : hull(x, y, [80, 78, 76]));
  // the bridge window: one panorama across 10 wall cells
  // the bridge window frame: the glass is see-through (alpha 0), the sky behind it is real geometry
  TXD.pano = tex(320, 96, (x, y) => { if (y < 12 || y > 68) return hull(x % 32, y); if (y === 12 || y === 68 || y === 13 || y === 67) return [30, 32, 38];
    const m = x % 32; if (m < 2 || m > 30) return m === 0 ? [80, 84, 92] : [40, 44, 50]; if (m === 2 || m === 30) return [24, 26, 30];
    return null; });
  { const T = TXD.pano; for (let p = 0; p < T.d.length; p += 4) if (T.d[p + 3] > 200) gradePx(T.d, p, "wall"); }   // the window frame in the ship's gunmetal
  // space: one big star sphere (equirectangular), and a planet, ring and moon as real 3D bodies
  const SUN = norm3([-.75, .32, -.58]); R3.sun = SUN;
  const GAL = norm3([.35, .85, .4]);
  TXD.sky = tex(1024, 512, (x, y) => { const lon = x / 1024 * 6.2832, pol = y / 512 * 3.1416, d = [Math.cos(lon) * Math.sin(pol), Math.cos(pol), Math.sin(lon) * Math.sin(pol)];
    const sd = d[0] * SUN[0] + d[1] * SUN[1] + d[2] * SUN[2]; if (sd > .9993) return [255, 250, 230, 1];
    const glow = Math.max(0, sd - .97) * 30, band = Math.exp(-((d[0] * GAL[0] + d[1] * GAL[1] + d[2] * GAL[2]) ** 2) * 30);
    const n1 = fbm(x / 80, y / 40, 11), n2 = fbm(x / 30 + 9, y / 15, 12), neb = Math.max(0, n1 - .45) * 2.2;
    let r = 6 + neb * 70 + band * n2 * 34, g = 6 + neb * 22 + band * n2 * 30, b = 16 + neb * 90 + band * n2 * 46 + n2 * 8;
    const h = hash2(x, y, 31); if (h > .9985) return [255, 255, 255, 1]; if (h > .993 - band * .03) { const v = 90 + hash2(x, y, 32) * 130; return [v * .9, v * .95, v, 1]; }
    return [r + glow * 255, g + glow * 240, b + glow * 200, 1]; });
  TXD.planet = planetTex(SYSTEMS[curSystem()].style);
  TXD.white = tex(2, 2, () => [255, 255, 255, 1]);
  TXD.fCloud = tex(64, 32, (x, y) => { const n = fbm(x / 9, y / 5, 77) * .7 + fbm(x / 3, y / 2, 78) * .3; return [200 + n * 55, 200 + n * 55, 200 + n * 55, 1].map((v, i) => i < 3 ? v * (.7 + n * .45) : v); });
  TXD.podGlass = tex(16, 16, (x, y) => { const d = (x + y) % 16; return d === 3 ? [175, 195, 210] : [110, 150, 180].map(v => v + y * 2); });   // pod porthole glass, drawn see-through
  TXD.ring = tex(128, 8, (x, y) => { const r = x / 128, a = Math.sin(r * 47) * .5 + .5; if (r < .02 || (r > .58 && r < .63) || r > .98) return null;
    const v = 150 + a * 80 + hash2(x, 0, 3) * 25; return [v * 1.05, v * .92, v * .76, 1]; });
  TXD.moon = tex(64, 32, (x, y) => { let v = 140 + fbm(x / 6, y / 4, 7) * 70; for (let i = 0; i < 9; i++) { const cx = hash2(i, 1, 2) * 64, cy = 4 + hash2(i, 2, 2) * 24, r = 1.5 + hash2(i, 3, 2) * 4, d = Math.hypot(x - cx, y - cy);
      if (d < r) v *= d > r - 1 ? 1.2 : .7; } return [v, v * .97, v * .95, 1]; });

  // floors and ceilings: 1m x 1m
  TXD.plate = tex(32, 32, (x, y) => { if (x % 16 === 0 || y % 16 === 0) return [40, 42, 46]; if (x % 16 === 1 || y % 16 === 1) return [92, 94, 100];
    if ((x % 16 === 3 || x % 16 === 13) && (y % 16 === 3 || y % 16 === 13)) return [112, 114, 120]; return [70, 72, 78].map(v => v + N(x, y, 6, 8)); });
  TXD.grate = tex(32, 32, (x, y) => (x % 4 === 0 || y % 4 === 0) ? (x % 16 === 0 || y % 16 === 0 ? [50, 52, 58] : [82, 86, 92]) : [22, 24, 28]);
  TXD.ceil = tex(32, 32, (x, y) => (x % 16 === 0 || y % 16 === 0) ? [24, 26, 30] : [44, 46, 52].map(v => v + N(x, y, 7, 6)));
  TXD.ceilL = tex(32, 32, (x, y) => x >= 4 && x <= 27 && y >= 9 && y <= 22 ? (x === 4 || x === 27 || y === 9 || y === 22 ? [90, 94, 100] : [244, 244, 236, 1]) : (x % 16 === 0 || y % 16 === 0) ? [24, 26, 30] : [44, 46, 52]);
  TXD.ring = tex(32, 32, (x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); if (d > 15.5 || d < 11) return null; return ((Math.atan2(y - 15.5, x - 15.5) * 6 / Math.PI + 12) | 0) % 2 ? [176, 142, 40] : [30, 28, 26]; });
  // props
  TXD.metal = tex(32, 32, (x, y) => { if (x === 0 || y === 0) return [44, 46, 52]; if (x === 1 || y === 1) return [120, 124, 132]; return [86, 90, 98].map(v => v + N(x, y, 8, 8)); });
  TXD.dark = tex(32, 32, (x, y) => { if (x === 0 || y === 0) return [26, 28, 32]; if ((x === 4 || x === 27) && (y === 4 || y === 27)) return [90, 92, 98]; return [48, 50, 56].map(v => v + N(x, y, 9, 6)); });
  TXD.yellow = tex(32, 32, (x, y) => ((x + y) >> 2) & 1 ? [224, 182, 40] : [34, 32, 30]);
  TXD.holoTop = tex(64, 32, (x, y) => { if (x < 2 || y < 2 || x > 61 || y > 29) return [120, 124, 132]; if (x % 7 === 0 || y % 7 === 0) return [70, 180, 230, 1];
    if (hash2(x, y, 5) > .95) return [242, 210, 48, 1]; const land = fbm(x / 9, y / 6, 3) > .5; return land ? [30, 90, 120, 1] : [14, 44, 70, 1]; });
  TXD.holo = tex(32, 16, (x, y) => { const land = Math.sin(x / 32 * 6.283 * 3) + Math.cos(y / 16 * 6.283 * 1.5 + x * .2) > .6; return land ? [120, 230, 255, 1] : (x + y) % 3 === 0 ? [40, 140, 180, 1] : null; });
  const scr = (bg, fg) => tex(32, 32, (x, y) => { if (x < 2 || y < 2 || x > 29 || y > 29) return [26, 28, 32]; if (y % 4 === 1 && x > 4 && x < 4 + hash2(x >> 3, y, bg[0]) * 24) return [...fg, 1]; return [...bg, 1]; });
  TXD.scrBlue = scr([14, 36, 64], [110, 210, 255]); TXD.scrGreen = scr([12, 46, 24], [114, 224, 106]); TXD.scrAmber = scr([58, 36, 8], [255, 176, 74]); TXD.scrRed = scr([58, 14, 14], [255, 106, 90]);
  TXD.crate = tex(32, 32, (x, y) => { if (x < 2 || y < 2 || x > 29 || y > 29) return [58, 62, 38]; if (y === 10 || y === 21) return [70, 74, 46]; if (Math.abs(x - y) < 2 || Math.abs(x + y - 31) < 2) return [74, 78, 50];
    return (x + (y >> 2)) % 7 ? [94, 100, 64] : [84, 90, 56]; });
  TXD.crateTop = tex(32, 32, (x, y) => { if (x < 2 || y < 2 || x > 29 || y > 29) return [58, 62, 38]; if (y >= 12 && y <= 19 && x >= 8 && x <= 23) return [216, 192, 96]; return x % 8 === 0 ? [74, 78, 50] : [94, 100, 64]; });
  TXD.barrel = tex(32, 32, (x, y) => y === 5 || y === 26 ? [70, 26, 20] : y < 2 || y > 29 ? [90, 34, 26] : [150, 50, 36].map(v => v + N(x, y, 10, 10)));
  TXD.counter = tex(32, 32, (x, y) => { if (y < 3) return [160, 164, 172]; if (y >= 12 && y <= 15) return [242, 210, 48]; if (x === 0) return [40, 42, 46]; return [74, 78, 86].map(v => v + N(x, y, 11, 6)); });
  TXD.hull2 = TXD.hull3 = TXD.hull; TXD.floorBridge = TXD.floorBay = TXD.arrows = TXD.plate; TXD.vent = TXD.ceil;
  TXD.glowCyan = tex(4, 4, () => [90, 220, 255, 1]); TXD.glowWhite = tex(4, 4, () => [244, 242, 232, 1]); TXD.glowRed = tex(4, 4, () => [255, 70, 50, 1]); TXD.shadow = tex(2, 2, () => [0, 0, 0]);
  TXD.haz = tex(32, 8, (x, y) => y === 0 || y === 7 ? [20, 20, 20] : ((x + y) >> 2) & 1 ? [190, 152, 40] : [30, 28, 26]);
  TXD.keys = tex(32, 16, (x, y) => { if (x % 4 === 0 || y % 4 === 0) return [20, 22, 26]; const h = hash2(x >> 2, y >> 2, 5); return h > .88 ? [90, 220, 255, 1] : h > .8 ? [242, 210, 48, 1] : [62, 66, 74]; });
  TXD.hatch = tex(32, 32, (x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); if (d > 15.5) return null; if (d > 13) return ((Math.atan2(y - 15.5, x - 15.5) * 6 / Math.PI + 12) | 0) % 2 ? [176, 142, 40] : [30, 28, 26];
    if (d > 12) return [64, 68, 74]; if ((x + y) % 4 === 0 && d > 4) return [40, 42, 46]; const g = Math.max(0, 1 - d / 12); return g > .35 ? [255 * g, 110 * g, 30 * g, 1] : [14 + g * 60, 12 + g * 20, 12]; });
  TXD.pipeMetal = tex(16, 16, (x, y) => { const k = .7 + .5 * Math.sin(x / 16 * 6.283); if (y === 0) return [40, 42, 46]; return [100 * k, 104 * k, 110 * k]; });
  TXD.pipeRed = tex(16, 16, (x, y) => { const k = .7 + .5 * Math.sin(x / 16 * 6.283); if (y === 0) return [40, 30, 28]; return [130 * k, 44 * k, 36 * k]; });
  TXD.ammo = tex(16, 16, (x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) return [30, 34, 22]; if (y >= 6 && y <= 8) return [220, 190, 80]; return [70, 82, 50]; });
  TXD.rib = TXD.dark; TXD.cabinet = TXD.metal; TXD.plate2 = TXD.plate; TXD.consoleBody = TXD.dark;
  TXD.holoGlass = tex(16, 16, (x, y) => (x % 8 === 0 || y % 8 === 0) ? [20, 60, 80, 1] : [6, 18, 28, 1]);
  TXD.holoLine = tex(8, 8, (x, y) => x === 0 || y === 0 ? [255, 255, 255, 1] : null);
  podTextures();
  TXD.reactor = tex(32, 32, (x, y) => { const g = .55 + .45 * Math.sin(y * .4 + Math.sin(x * .3) * 2); return y % 16 === 0 ? [40, 120, 60, 1] : [60 * g, 240 * g, 110 * g, 1]; });
}

// planet surfaces seen from orbit; noise is blended across the seam so the sphere wraps cleanly
function planetTex(style) {
  const W = 256, H = 128, sd = { desert: 3, swamp: 17, arctic: 29 }[style] || 3;
  const N = (x, y, f, s) => { const a = fbm(x / f, y / f, s), b = fbm((x - W) / f, y / f, s), k = x / W; return a * (1 - k) + b * k; };
  return tex(W, H, (x, y) => { const lat = Math.abs(y / H - .5) * 2, land = N(x, y, 22, sd), det = N(x, y, 7, sd + 1), cloud = N(x * 1.3, y * 2.2, 18, sd + 2);
    let c;
    if (style === "desert") { c = land > .55 ? [196, 128, 70] : land > .46 ? [218, 164, 98] : land > .38 ? [150, 92, 54] : [112, 70, 46]; if (det > .62) c = c.map(v => v * .8); }
    else if (style === "swamp") { c = land > .52 ? [70, 120, 60] : land > .45 ? [96, 140, 70] : land > .4 ? [52, 84, 64] : [30, 58, 74]; if (det > .6) c = [118, 150, 60]; }
    else { c = land > .5 ? [226, 236, 244] : land > .42 ? [190, 210, 228] : [120, 150, 190]; if (Math.abs(det - .5) < .015) c = [80, 120, 170]; }
    if (lat > .86 - det * .1) c = style === "swamp" ? [200, 210, 190] : [236, 240, 246];   // polar caps
    if (cloud > .6) { const k = Math.min(1, (cloud - .6) * 6); c = c.map((v, i) => v * (1 - k) + [245, 245, 240][i] * k); }
    return [...c, 1]; }); }
function setSkyPlanet(i) { TXD.planet = planetTex(SYSTEMS[i].style); if (R3.gl && BASE.built) { R3.tex.planet = glTex(TXD.planet); buildHoloMap(); } }

// ---------- people (flat sprites) ----------
const SP = {};
function person(c) { return mkSprite(22, 46, (x, y) => { const cx = 11;
  if (((x - cx) / 4.2) ** 2 + ((y - 8) / 5) ** 2 <= 1) { if (y < 5 || (y < 7 && (x < 8 || x > 14))) return c.hair; if (y === 8 && (x === 9 || x === 13)) return "#1a1210"; if (y === 11 && x >= 10 && x <= 12) return "#8a5a4a"; return c.skin; }
  if (c.cap && y === 4 && x >= 6 && x <= 16) return c.cap; if (c.cap && y < 4 && ((x - cx) / 4.4) ** 2 + ((y - 4) / 3.4) ** 2 <= 1) return c.cap;
  if (y >= 13 && y <= 14 && x >= 10 && x <= 12) return c.skin;
  if (y >= 15 && y <= 28) { const half = y < 17 ? 5 + (y - 15) : 7; if (Math.abs(x - cx) <= half) { if (y >= 27) return "#2a2622"; if (x === cx && y % 3 === 0) return "#d8c060"; if (x === cx + 4 && y === 18) return c.badge || "#f2d230"; return x < cx ? c.uni : c.uni2; }
    if ((Math.abs(x - cx) === 8 || Math.abs(x - cx) === 9) && y >= 16) return c.uni2; }
  if (y >= 29 && y <= 30 && (Math.abs(x - cx) === 8 || Math.abs(x - cx) === 9)) return c.skin;
  if (y >= 29 && y <= 42 && Math.abs(x - cx) >= 1 && Math.abs(x - cx) <= 5) return x < cx ? c.pants : c.pants2;
  if (y >= 43 && y <= 45 && Math.abs(x - cx) >= 1 && Math.abs(x - cx) <= 6) return "#1e1c1a";
  return null; }); }
function armorStand(A) { return mkSprite(26, 48, (x, y) => { const cx = 13;
  if (((x - cx) / 5) ** 2 + ((y - 7) / 5.5) ** 2 <= 1) { if (y >= 6 && y <= 8 && x >= 9 && x <= 17) return x === 10 && y === 6 ? [A.glint, 1] : A.visor; return y < 5 ? A.light : A.mid; }
  if (y >= 13 && y <= 16 && ((x - cx) / 10.5) ** 2 + ((y - 15) / 2.6) ** 2 <= 1) return y === 13 ? A.light : A.mid;
  if (y > 17 && y <= 37 && (Math.abs(x - cx) === 9 || Math.abs(x - cx) === 10)) return y % 4 ? A.cape : A.cape2;
  if (y >= 16 && y <= 28 && Math.abs(x - cx) <= 7) { if (Math.abs(x - cx) <= 1 && y < 26) return A.stripe; if (y >= 26) return "#2e2a24"; return x < cx ? A.light : A.mid; }
  if (y >= 17 && y <= 28 && Math.abs(x - cx) === 8) return A.dark;
  if (y >= 29 && y <= 41 && Math.abs(x - cx) >= 1 && Math.abs(x - cx) <= 5) return y % 5 === 0 ? A.light : A.dark;
  if (y >= 42 && y <= 44 && Math.abs(x - cx) >= 1 && Math.abs(x - cx) <= 6) return "#2a2622";
  if (y >= 45 && Math.abs(x - cx) <= 9) return y === 45 ? "#6a6e76" : "#3a3c42";
  return null; }); }
function buildSprites() {
  SP.qm = person({ hair: "#3a2a20", cap: "#2a3a26", skin: "#c89878", uni: "#4a5a3a", uni2: "#3a482e", pants: "#3a3a32", pants2: "#2e2e28", badge: "#f2d230" });
  SP.crew1 = person({ hair: "#1e1a18", skin: "#d8b090", uni: "#2a3a5a", uni2: "#22304a", pants: "#26282e", pants2: "#1e2026", badge: "#55b6ff" });
  SP.crew2 = person({ hair: "#a8642a", skin: "#e8c0a0", uni: "#2a3a5a", uni2: "#22304a", pants: "#26282e", pants2: "#1e2026", badge: "#55b6ff" });
  SP.eng = person({ hair: "#2a2622", cap: "#b8862a", skin: "#a87858", uni: "#8a6a2a", uni2: "#6e5420", pants: "#4a3e2a", pants2: "#3a3020", badge: "#72e06a" });
  if (!SP.armM0) { SP.armM = armorStand(ARMOR); SP.armL = armorStand(Object.assign({}, ARMOR, ARMORS.light.tint)); SP.armH = armorStand(Object.assign({}, ARMOR, ARMORS.heavy.tint)); }
}

// ---------- tiny WebGL renderer ----------
const R3 = { gl: null, cv: null, prog: null, mats: {}, tex: {}, loc: {}, W: 0, H: 320 };
function initGL() {
  const c = document.createElement("canvas"); c.id = "gl3"; cv.after(c); R3.cv = c;
  const gl = c.getContext("webgl2", { antialias: false, alpha: false }) || c.getContext("webgl", { antialias: false, alpha: false }); R3.gl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext; R3.gl = gl; if (!gl) return false;
  const vs = `attribute vec3 aP; attribute vec2 aT; attribute vec3 aN; attribute vec3 aC; uniform mat4 uVP, uM; uniform vec2 uScroll;
    varying vec2 vT; varying vec3 vN, vW, vC; void main(){ vec4 w = uM * vec4(aP, 1.); vW = w.xyz; vN = mat3(uM) * aN; vT = aT + uScroll; vC = aC; gl_Position = uVP * w; }`;
  const fs = `precision highp float; uniform sampler2D uTex; uniform vec3 uCam, uAmb, uFog; uniform vec3 uLP[8]; uniform vec3 uLC[8]; uniform float uDither, uBill, uSky, uFogD, uFogK, uAlpha; uniform vec3 uSun, uTint, uLDir, uLCol;
    uniform float uSplat, uL5; uniform sampler2D uT1, uT2, uT3, uT4, uNz, uT5; uniform vec4 uTS; uniform float uRS;
    varying vec2 vT; varying vec3 vN, vW, vC;
    // terrain splatting: five ground layers mapped in world space, blended by per-vertex weights (litter, mud, trail in vC)
    // whose edges are broken up by a noise map; slopes turn to rock; the base layer is sampled twice, rotated, against tiling.
    vec3 splat() { vec2 wp = vW.xz; mat2 rot = mat2(.8, -.6, .6, .8);
      float n1 = texture2D(uNz, wp * .009).r, n2 = texture2D(uNz, wp * .037).g, n3 = texture2D(uNz, wp * .15).b;
      vec3 base = mix(texture2D(uTex, wp * uTS.x).rgb, texture2D(uTex, rot * wp * uTS.x * .71 + .37).rgb, smoothstep(.38, .62, n2));
      vec3 lit = mix(texture2D(uT1, wp * uTS.y).rgb, texture2D(uT1, rot * wp * uTS.y * .77 + .5).rgb, smoothstep(.38, .62, n1));
      vec3 mud = texture2D(uT2, rot * wp * uTS.z).rgb, trl = texture2D(uT3, wp * uTS.w).rgb, n = normalize(vN);
      vec3 rk = abs(n.x) > abs(n.z) ? texture2D(uT4, vW.zy * uRS).rgb : texture2D(uT4, vW.xy * uRS).rgb;
      float e = (n2 - .5) * .75 + (n3 - .5) * .45;
      vec3 c = mix(base, lit, smoothstep(.44, .56, vC.r + e));
      c = mix(c, mud, smoothstep(.42, .58, vC.g + e * .8));
      if (uL5 > .5) c = mix(c, mix(texture2D(uT5, wp * uTS.y).rgb, texture2D(uT5, rot * wp * uTS.y * .8 + .3).rgb, smoothstep(.4, .6, n1)), smoothstep(.45, .6, vT.x + e * .6));
      c = mix(c, trl, smoothstep(.46, .58, vC.b + e * .55));
      c = mix(c, rk, smoothstep(.86, .76, n.y + e * .12));
      return c * (.84 + n1 * .32); }
    void main(){ vec4 t; vec3 vc = vC;
      if (uSplat > .5) { t = vec4(splat(), 1.); vc = vec3(1. - vT.y * .42, 1. - vT.y * .3, 1. - vT.y * .45) * (uL5 > .5 ? 1. : 1. - vT.x * .38); } else t = texture2D(uTex, vT);
      if (t.a < .1) discard;
      if (uSky > .5) { vec3 c = t.rgb * vc * uTint; if (uSky > 3.5) { float d = dot(normalize(vN), uSun); c *= clamp(d * .8 + .4, .24, 1.2); } else if (uSky > 1.5) { float d = dot(normalize(vN), uSun); c *= clamp(d * 1.35 + .1, .07, 1.15); if (uSky > 2.5) c *= .9; } gl_FragColor = vec4(c, uAlpha); return; }
      if (uDither > .5 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.) < 1.) discard;
      float fd = length(vW - uCam), f = clamp(fd / uFogD, 0., 1.);
      if (t.a < .75) { gl_FragColor = vec4(mix(t.rgb, uFog, f * f * .4), 1.); return; }
      vec3 n = normalize(vN), L = uAmb;
      for (int i = 0; i < 8; i++) { vec3 d = uLP[i] - vW; float dist = length(d); float att = 1. / (1. + dist * dist * .16);
        float nd = uBill > .5 ? .75 : max(dot(n, d / dist), 0.) * .8 + .2; L += uLC[i] * att * nd; }
      L += uLCol * (uBill > .5 ? .7 : max(dot(n, uLDir), 0.));
      vec3 col = t.rgb * vc * L; gl_FragColor = vec4(mix(col, uFog, min(1., f * f * uFogK)), uAlpha); }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); gl.useProgram(p); R3.prog = p;
  for (const n of ["aP", "aT", "aN", "aC"]) R3.loc[n] = gl.getAttribLocation(p, n);
  for (const n of ["uVP", "uM", "uScroll", "uTex", "uCam", "uAmb", "uFog", "uLP", "uLC", "uDither", "uBill", "uSky", "uSun", "uTint", "uFogD", "uFogK", "uLDir", "uLCol", "uAlpha", "uSplat", "uT1", "uT2", "uT3", "uT4", "uNz", "uTS", "uRS", "uL5", "uT5"]) R3.loc[n] = gl.getUniformLocation(p, n);
  ["uTex", "uT1", "uT2", "uT3", "uT4", "uNz", "uT5"].forEach((n, i) => gl.uniform1i(R3.loc[n], i));
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.clearColor(.03, .035, .05, 1);
  R3.dyn = gl.createBuffer();
  return true;
}
function glTex(T) { const pow2 = !(T.w & (T.w - 1)) && !(T.h & (T.h - 1)), gl = R3.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, T.w, T.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, T.d);
  // crisp up close (nearest), but mipmapped in the distance so far surfaces stop crawling with noise.
  // Textures with see-through pixels skip mipmaps: averaged edges would turn half-transparent.
  const rep = pow2 || R3.gl2; let opaque = true; for (let i = 3; i < T.d.length; i += 4) if (T.d[i] === 0) { opaque = false; break; }
  const mip = rep && opaque && T.w > 4; if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  // anisotropic filtering where available, so ground and water seen at a low angle don't collapse into big blocks
  if (mip) { const an = R3.aniso === undefined ? (R3.aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") || null) : R3.aniso;
    if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, mip ? gl.NEAREST_MIPMAP_NEAREST : gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, rep ? gl.REPEAT : gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, rep ? gl.REPEAT : gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t; }
// a tileable noise map for the terrain blend: four channels of smooth value noise at different scales, linearly filtered
function noiseTex() { const S = 128, d = new Uint8Array(S * S * 4), R = seeded(9137);
  [[4, 8], [8, 16], [16, 32], [32, 64]].forEach(([g0, g1], c) => { const G = [g0, g1].map(g => Array.from({ length: g * g }, () => R()));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let v = 0;
      [g0, g1].forEach((g, o) => { const fx = x / S * g, fy = y / S * g, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j, A = G[o], at = (a, b) => A[((b + g) % g) * g + (a + g) % g], sm = t => t * t * (3 - 2 * t);
        v += (lerp(lerp(at(i, j), at(i + 1, j), sm(u)), lerp(at(i, j + 1), at(i + 1, j + 1), sm(u)), sm(w))) * (o ? .35 : .65); });
      d[(y * S + x) * 4 + c] = clamp((v - .5) * 1.5 * 255 + 128, 0, 255); } });
  const gl = R3.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t; }
// soft grey mist for the swamp's low fog layers (linearly filtered so it never shows texels up close)
function mistTex() { const S = 64, d = new Uint8Array(S * S * 4), R = seeded(4411), g = 8, G = Array.from({ length: g * g }, () => R());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const fx = x / S * g, fy = y / S * g, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j, at = (a, b) => G[((b + g) % g) * g + (a + g) % g], sm = t => t * t * (3 - 2 * t);
    const v = lerp(lerp(at(i, j), at(i + 1, j), sm(u)), lerp(at(i, j + 1), at(i + 1, j + 1), sm(u)), sm(w)), c = 150 + v * 105, o = (y * S + x) * 4; d[o] = d[o + 1] = d[o + 2] = c; d[o + 3] = 128; }
  const gl = R3.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t; }
function glResize() { R3.H = clamp(Math.round(stageH * .32), 270, 360); R3.W = Math.round(R3.H * stageW / stageH); R3.cv.width = R3.W; R3.cv.height = R3.H; R3.gl.viewport(0, 0, R3.W, R3.H); }
addEventListener("resize", () => { if (R3.gl) glResize(); });

// ---------- geometry builder: everything is pushed in world space, grouped by texture ----------
class MB { constructor() { this.v = []; }
  vert(p, uv, n, c) { this.v.push(p[0], p[1], p[2], uv[0], uv[1], n[0], n[1], n[2], c[0], c[1], c[2]); }
  quad(a, b, c, d, n, uv = [0, 0, 1, 1], col = [1, 1, 1]) { const [u0, v0, u1, v1] = uv, C = Array.isArray(col[0]) ? col : [col, col, col, col];
    this.vert(a, [u0, v0], n, C[0]); this.vert(b, [u1, v0], n, C[1]); this.vert(c, [u1, v1], n, C[2]); this.vert(a, [u0, v0], n, C[0]); this.vert(c, [u1, v1], n, C[2]); this.vert(d, [u0, v1], n, C[3]); }
  tri(a, b, c, n, ua, ub, uc, col = [1, 1, 1]) { this.vert(a, ua, n, col); this.vert(b, ub, n, col); this.vert(c, uc, n, col); } }
// R3.remap (set by livery()) swaps generic material names for a faction's versions while a model is built
const mb = name => { const r = R3.remap; if (r) { const i = name.indexOf("~"), b = i < 0 ? name : name.slice(0, i); if (r[b]) name = r[b] + (i < 0 ? "" : name.slice(i)); }
  return (R3.mats[name] = R3.mats[name] || { mb: new MB(), tex: name.replace(/~.*$/, "") }); };
function box(x0, y0, z0, x1, y1, z1, side, o = {}) {
  const F = (k, def) => mb(o[k] || def).mb, c = o.col || [1, 1, 1], k = o.tile || 0, U = (a, b) => k ? [0, 0, Math.max(1, Math.round(a * k)), Math.max(1, Math.round(b * k))] : [0, 0, 1, 1];
  const W = x1 - x0, D = z1 - z0, H = y1 - y0;
  F("top", side).quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], U(W, D), c);
  if (o.bottom) F("bottom", side).quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], U(W, D), c);
  F("n", side).quad([x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0], [0, 0, -1], U(W, H), c);
  F("s", side).quad([x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1], [0, 0, 1], U(W, H), c);
  F("w", side).quad([x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0], [-1, 0, 0], U(D, H), c);
  F("e", side).quad([x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [1, 0, 0], U(D, H), c);
}
function cyl(cx, cz, y0, y1, r, seg, side, o = {}) { const m = mb(side + (o.dither ? "~d" : "")).mb, c = o.col || [1, 1, 1], r1 = o.r1 ?? r, tu = o.tile || 1, tv = o.tv || 1;
  for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, n = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)];
    m.quad([cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1], [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], n, [(i + 1) / seg * tu, 0, i / seg * tu, tv], c);
    if (o.cap) mb(o.cap).mb.tri([cx, y1, cz], [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1], [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], [0, 1, 0], [.5, .5], [.5 + Math.cos(a0) * .5, .5 + Math.sin(a0) * .5], [.5 + Math.cos(a1) * .5, .5 + Math.sin(a1) * .5], c); } }
// a console: pedestal + tilted screen facing direction (fx,fz)
function consoleAt(x, z, fx, fz, scr) {   // a console facing direction (fx, fz)
  const yaw = Math.atan2(fx, fz), L = (lx, lz) => [x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, z - Math.sin(yaw) * lx + Math.cos(yaw) * lz];
  const at = (lx, y, lz, w, h, d, pitch, tex, o) => { const [px, pz] = L(lx, lz); obox(px, y, pz, w, h, d, yaw, pitch, tex, o); };
  at(0, .05, -.02, .78, .1, .5, 0, "dark");                                         // plinth
  at(0, .45, -.06, .7, .72, .38, 0, "dark", { front: "consoleBody", top: "dark" });                   // body
  at(0, .86, .1, .74, .06, .3, -.32, "dark", { top: "keys" });                      // sloped keyboard deck
  at(0, 1.18, -.16, .7, .46, .06, .22, "dark", { front: scr });                     // screen with a bezel
  at(0, .96, -.2, .1, .22, .08, 0, "rib");                                          // neck
  const [sx, sz] = L(0, 0); shadowRect(sx - .4, sz - .35, sx + .4, sz + .35, .05);
}

// oriented box: centre, size, yaw (local +z points to (sin yaw, cos yaw)) and a pitch tilt back around local x
function obox(x, y, z, w, h, d, yaw, pitch, tex, o = {}) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const R = (lx, ly, lz) => { const y2 = ly * cp + lz * sp, z2 = -ly * sp + lz * cp; return [lx * cy + z2 * sy, y2, -lx * sy + z2 * cy]; };
  const P = (lx, ly, lz) => { const r = R(lx, ly, lz); return [x + r[0], y + r[1], z + r[2]]; }, W = w / 2, H = h / 2, D = d / 2;
  const F = (k) => mb(o[k] || tex).mb, c = o.col || [1, 1, 1], U = o.uv || [0, 0, 1, 1];
  F("front").quad(P(-W, H, D), P(W, H, D), P(W, -H, D), P(-W, -H, D), R(0, 0, 1), U, c);
  F("back").quad(P(W, H, -D), P(-W, H, -D), P(-W, -H, -D), P(W, -H, -D), R(0, 0, -1), U, c);
  F("top").quad(P(-W, H, -D), P(W, H, -D), P(W, H, D), P(-W, H, D), R(0, 1, 0), U, c);
  F("bottom").quad(P(-W, -H, D), P(W, -H, D), P(W, -H, -D), P(-W, -H, -D), R(0, -1, 0), U, c);
  F("side").quad(P(-W, H, -D), P(-W, H, D), P(-W, -H, D), P(-W, -H, -D), R(-1, 0, 0), U, c);
  F("side").quad(P(W, H, D), P(W, H, -D), P(W, -H, -D), P(W, -H, D), R(1, 0, 0), U, c);
}
// surface of revolution from a profile of [radius, height] points
function lathe(cx, cz, prof, seg, tex, o = {}) { const m = mb(tex).mb, v = o.v || prof.map((_, i) => 1 - i / (prof.length - 1));
  for (let j = 0; j < prof.length - 1; j++) { const [r0, y0] = prof[j], [r1, y1] = prof[j + 1], dr = r1 - r0, dy = y1 - y0, l = Math.hypot(dr, dy) || 1, nr = dy / l, ny = -dr / l;
    for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, am = (a0 + a1) / 2; if (o.skip && o.skip(am, j)) continue;
      m.quad([cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1], [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0],
        [Math.cos(am) * nr, ny, Math.sin(am) * nr], [(i + 1) / seg, v[j + 1], i / seg, v[j]]); } } }
// a pipe between two points
function tube(p0, p1, r, seg, tex, vpm = 2) { const m = mb(tex).mb, ax = norm3([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]), up = Math.abs(ax[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], u = norm3(cr(ax, up)), w = cr(ax, u), L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, d = a => [u[0] * Math.cos(a) + w[0] * Math.sin(a), u[1] * Math.cos(a) + w[1] * Math.sin(a), u[2] * Math.cos(a) + w[2] * Math.sin(a)];
    const d0 = d(a0), d1 = d(a1), P = (p, dd) => [p[0] + dd[0] * r, p[1] + dd[1] * r, p[2] + dd[2] * r];
    m.quad(P(p0, d0), P(p0, d1), P(p1, d1), P(p1, d0), d((a0 + a1) / 2), [i / seg, 0, (i + 1) / seg, Math.max(1, Math.round(L * vpm))]); } }
// flat ring (or disc when r0 = 0), facing up
function annulus(cx, y, cz, r0, r1, seg, tex) { const m = mb(tex).mb;
  for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, P = (a, r) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r], U = (a, r) => [.5 + Math.cos(a) * r / r1 * .5, .5 + Math.sin(a) * r / r1 * .5];
    const p = [P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1)], uv = [U(a0, r0), U(a1, r0), U(a1, r1), U(a0, r1)];
    m.vert(p[0], uv[0], [0, 1, 0], [1, 1, 1]); m.vert(p[1], uv[1], [0, 1, 0], [1, 1, 1]); m.vert(p[2], uv[2], [0, 1, 0], [1, 1, 1]); m.vert(p[0], uv[0], [0, 1, 0], [1, 1, 1]); m.vert(p[2], uv[2], [0, 1, 0], [1, 1, 1]); m.vert(p[3], uv[3], [0, 1, 0], [1, 1, 1]); } }
// soft contact shadows, drawn dithered
function shadowDisc(cx, cz, r) { annulus(cx, .015, cz, 0, r, 10, "shadow"); }
function shadowRect(x0, z0, x1, z1, p = .12) { mb("shadow").mb.quad([x0 - p, .015, z0 - p], [x1 + p, .015, z0 - p], [x1 + p, .015, z1 + p], [x0 - p, .015, z1 + p], [0, 1, 0]); }
function barrel(x, z) { lathe(x, z, [[.27, 0], [.3, .05], [.3, .86], [.27, .9]], 10, "barrel"); annulus(x, .9, z, 0, .27, 10, "dark");
  for (const by of [.22, .64]) cyl(x, z, by, by + .05, .315, 10, "dark"); shadowDisc(x, z, .38); }

// ---------- the deck layout: one compact ship, 14 x 18 m ----------
const SHIP = [
  "##WWWWWWWWWW##",
  "#............#",
  "#............#",
  "#............#",
  "#............#",
  "###........###",
  "R............#",
  "R............#",
  "R............#",
  "R............#.................#",
  "#..............................#",
  "P..............................#",
  "PP...........#.................#",
  "#####....#####",
  "S............S",
  "S............S",
  "S............S",
  "SSSSSSSSSSSSSS",
];
const SW = 32, SH = SHIP.length;
const zoneAt = (z, x = 7) => x >= 13.6 ? "range" : z < 5 ? "bridge" : z < 13 ? "deck" : "bay";
const ZONES = { bridge: ["BRIDGE", "War table · plot a course between systems"], deck: ["MAIN DECK", "Armory · Requisition · Engineering"], bay: ["LAUNCH BAY", "Starfall pods · choose an operation and drop"], range: ["FIRING RANGE", "Weapon out · click to shoot · R reload · 1 / 2 swap"] };
const LIGHTS = [
  [[7, 2.6, 2.4], [.5, .66, 1.05]], [[7, 1.8, 3], [.15, .5, .7]], [[7, 2.7, 8.6], [.75, .74, .7]], [[1.6, 2.4, 7.8], [.75, .68, .5]],
  [[11.8, 2.4, 8], [.95, .72, .42]], [[1.95, 1.4, 11.2], [.25, .9, .4]], [[7, 2.6, 15.4], [1, .66, .38]], [[7, 1, 15.2], [.5, .22, .08]] ];
const CEIL_LIGHTS = [[3, 2], [10, 2], [6, 3], [3, 7], [10, 7], [6, 9], [3, 11], [10, 11], [3, 14], [10, 14], [6, 14], [15, 10], [15, 11], [19, 9], [19, 12], [23, 10], [23, 11], [27, 9], [27, 12], [30, 10], [30, 11]];
let COLL = [], CIRC = [], SPRITES = [], INTER = [];
// hand-placed wall panels: decals, junction boxes, damage, engineering and bay details
const WALL_SPECIAL = { "4,13": "decal", "9,13": "hullBox", "13,11": "decal", "2,13": "eng2", "3,13": "eng2", "0,10": "eng2",
  "0,15": "bayHatch", "13,15": "bayHatch", "31,9": "stripe", "31,10": "stripe", "31,11": "stripe", "31,12": "stripe", "13,9": "hullBox", "13,12": "decal", "1,17": "bayVent", "5,17": "bayVent", "8,17": "bayVent", "12,17": "bayVent" };
const POD_X = [3.5, 7, 10.5], POD_Z = 15.7, PH = 1.06, POD_HOLES = POD_X.map(px => [px - PH, POD_Z - PH, px + PH, POD_Z + PH]);
function buildShip() {
  R3.mats = {};
  const solid = (x, z) => x < 0 || z < 0 || x >= SW || z >= SH || SHIP[z][x] !== ".";
  for (let z = 0; z < SH; z++) for (let x = 0; x < SW; x++) { if (solid(x, z)) continue;
    const zone = zoneAt(z, x), fl = zone === "range" ? (x < 17 ? "plate" : x === 17 ? "arrows" : "floorBay") : zone === "bridge" ? "floorBridge" : zone === "bay" ? (z === 14 && x >= 5 && x <= 8 ? "arrows" : x < 2 || x > 11 ? "floorRust" : "floorBay") : x <= 3 && z >= 10 ? "floorEng" : x >= 4 && x <= 9 ? "grate" : "plate";
    const ao = (vx, vz, k) => (solid(vx - 1, vz - 1) || solid(vx, vz - 1) || solid(vx - 1, vz) || solid(vx, vz)) ? [k, k, k] : [1, 1, 1];
    const holes = POD_HOLES.filter(([hx0, hz0, hx1, hz1]) => hx0 < x + 1 && hx1 > x && hz0 < z + 1 && hz1 > z);
    if (!holes.length) mb(fl).mb.quad([x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1], [0, 1, 0], [0, 0, 1, 1], [ao(x, z, .58), ao(x + 1, z, .58), ao(x + 1, z + 1, .58), ao(x, z + 1, .58)]);
    else { let pcs = [[x, z, x + 1, z + 1]];   // the tile minus the hatch openings
      for (const [hx0, hz0, hx1, hz1] of holes) pcs = pcs.flatMap(([a0, b0, a1, b1]) => { if (hx0 >= a1 || hx1 <= a0 || hz0 >= b1 || hz1 <= b0) return [[a0, b0, a1, b1]]; const o = [], cx0 = Math.max(a0, hx0), cx1 = Math.min(a1, hx1);
        if (hx0 > a0) o.push([a0, b0, hx0, b1]); if (hx1 < a1) o.push([hx1, b0, a1, b1]); if (hz0 > b0) o.push([cx0, b0, cx1, hz0]); if (hz1 < b1) o.push([cx0, hz1, cx1, b1]); return o; });
      for (const [a0, b0, a1, b1] of pcs) mb(fl).mb.quad([a0, 0, b0], [a1, 0, b0], [a1, 0, b1], [a0, 0, b1], [0, 1, 0], [a0 - x, b0 - z, a1 - x, b1 - z]); }
    const lit = CEIL_LIGHTS.some(([a, b]) => a === x && b === z);
    mb((x + z * 3) % 9 === 0 && !lit ? "vent" : "ceil").mb.quad([x, WALL_H, z + 1], [x + 1, WALL_H, z + 1], [x + 1, WALL_H, z], [x, WALL_H, z], [0, -1, 0], [0, 0, 1, 1], [ao(x, z + 1, .62), ao(x + 1, z + 1, .62), ao(x + 1, z, .62), ao(x, z, .62)]);
    const wallTex = (wx, wz) => { const ch = SHIP[wz] ? SHIP[wz][wx] : "#"; if (ch === "R") return "rack"; if (ch === "P") return "pipe"; if (ch === "S") return "stripe";
      if (ch === "W") return "pano"; if (WALL_SPECIAL[wx + "," + wz]) return WALL_SPECIAL[wx + "," + wz];
      const v = ["hull", "hull2", "hull4", "hull3"][(wx * 7 + wz * 3) % 4]; if (zone === "bridge") return ["screen", "screen2", "screen3", v, v][(wx * 5 + wz) % 5]; return (wx * 3 + wz) % 7 === 0 ? "hullL" : v; };
    // walls in three bands so they darken into the floor and ceiling corners
    const face = (wx, wz, a, b, c, d, n) => { const t = wallTex(wx, wz), [u0, u1] = t === "pano" ? [(wx - 2) / 10, (wx - 1) / 10] : [0, 1], m = mb(t).mb;
      const at = (p, q, y) => [p[0], y, p[2]], bands = [[WALL_H, 2.65, .66, 1], [2.65, .4, 1, 1], [.4, 0, 1, .5]];
      for (const [y0, y1, k0, k1] of bands) m.quad(at(a, 0, y0), at(b, 0, y0), at(c, 0, y1), at(d, 0, y1), n, [u0, 1 - y0 / WALL_H, u1, 1 - y1 / WALL_H], [[k0, k0, k0], [k0, k0, k0], [k1, k1, k1], [k1, k1, k1]]);
      if (t !== "pano") { const o = (p, y) => [p[0] + n[0] * .02, y, p[2] + n[2] * .02]; mb("podBrass").mb.quad(o(a, 2.67), o(b, 2.67), o(c, 2.62), o(d, 2.62), n, [0, 0, 2, 1]);
        mb("gPaintF").mb.quad(o(a, 2.62), o(b, 2.62), o(c, 2.5), o(d, 2.5), n, [0, .2, 1, .45]); mb("podBrass").mb.quad(o(a, 2.5), o(b, 2.5), o(c, 2.48), o(d, 2.48), n, [0, 0, 2, .3]); } };   // a brass rail over a green accent band   // a brass rail under the ceiling trim
    const H = WALL_H;
    if (solid(x, z - 1)) face(x, z - 1, [x, H, z], [x + 1, H, z], [x + 1, 0, z], [x, 0, z], [0, 0, 1]);
    if (solid(x, z + 1)) face(x, z + 1, [x + 1, H, z + 1], [x, H, z + 1], [x, 0, z + 1], [x + 1, 0, z + 1], [0, 0, -1]);
    if (solid(x - 1, z)) face(x - 1, z, [x, H, z + 1], [x, H, z], [x, 0, z], [x, 0, z + 1], [1, 0, 0]);
    if (solid(x + 1, z)) face(x + 1, z, [x + 1, H, z], [x + 1, H, z + 1], [x + 1, 0, z + 1], [x + 1, 0, z], [-1, 0, 0]);
  }
  COLL = []; CIRC = []; SPRITES = []; INTER = [];
  const solidBox = (x0, z0, x1, z1) => COLL.push([x0, z0, x1, z1]);
  // ---------- structure: wall ribs, ceiling girders, pipes, light fixtures ----------
  const rowSpan = z => { let a = -1, b = -1; for (let x = 0; x < SW; x++) if (!solid(x, z)) { if (a < 0) a = x; b = x + 1; } return [a, b]; };
  for (let z = 0; z < SH; z++) for (let x = 0; x < SW; x++) { if (solid(x, z)) continue;
    const ch = (wx, wz) => SHIP[wz] ? SHIP[wz][wx] : "#", rib = (x0, z0, x1, z1) => /[RP]/.test(ch(Math.floor(x0 - .3), Math.floor(z0 + .1)) + ch(Math.floor(x1 + .3), Math.floor(z0 + .1))) && x0 < 2 ? 0 : (box(x0, 0, z0, x1, WALL_H, z1, "rib", { tile: 1 }), box(x0 - .015, 2.36, z0 - .015, x1 + .015, 2.46, z1 + .015, "podBrass"), box(x0 - .015, .3, z0 - .015, x1 + .015, .36, z1 + .015, "podBrass"));
    if (x % 3 === 0 && solid(x, z - 1) && solid(x - 1, z - 1) && !solid(x - 1, z) && ch(x, z - 1) !== "W") rib(x - .14, z, x + .14, z + .16);
    if (x % 3 === 0 && solid(x, z + 1) && solid(x - 1, z + 1) && !solid(x - 1, z)) rib(x - .14, z + .84, x + .14, z + 1);
    if (z % 3 === 0 && solid(x - 1, z) && solid(x - 1, z - 1) && !solid(x, z - 1)) rib(x, z - .14, x + .16, z + .14);
    if (z % 3 === 0 && solid(x + 1, z) && solid(x + 1, z - 1) && !solid(x, z - 1)) rib(x + .84, z - .14, x + 1, z + .14);
  }
  for (const gz of [3, 7, 10, 15]) { const [a, b] = rowSpan(gz); box(a, 2.72, gz - .13, b, 3, gz + .13, "rib", { tile: 1, bottom: "rib" }); }
  for (const gx of [4, 10]) box(gx - .1, 2.78, 1, gx + .1, 3, 5, "rib", { tile: 1, bottom: "rib" });
  tube([1.32, 2.6, 5.6], [1.32, 2.6, 11.9], .09, 8, "pipeMetal"); tube([1.58, 2.62, 5.6], [1.58, 2.62, 11.9], .06, 8, "pipeRed");
  tube([12.68, 2.6, 5.6], [12.68, 2.6, 13], .09, 8, "pipeMetal");
  tube([1.02, 2.6, 14.35], [12.98, 2.6, 14.35], .1, 8, "pipeMetal"); tube([1.02, 2.62, 14.62], [12.98, 2.62, 14.62], .06, 8, "pipeRed");
  for (const [lx, lz] of CEIL_LIGHTS) box(lx + .14, 2.9, lz + .28, lx + .86, WALL_H, lz + .72, "dark", { bottom: "glowWhite" });
  // doorways: thick frames with a hazard lintel
  const doorway = (x0, x1, z, dz) => { const e = dz + .06; box(x0, 0, z - e, x0 + .2, 2.96, z + e, "rib", { tile: 1 }); box(x1 - .2, 0, z - e, x1, 2.96, z + e, "rib", { tile: 1 });
    box(x0 + .2, 2.48, z - e, x1 - .2, 2.96, z + e, "dark", { n: "haz", s: "haz", bottom: "dark", tile: 2 });
    for (const s of [-1, 1]) { box((x0 + x1) / 2 - .34, 2.5, z + s * e - .02, (x0 + x1) / 2 + .34, 2.94, z + s * e + .02, "dark"); emblem((x0 + x1) / 2, 2.72, z + s * (e + .025), s > 0 ? 0 : Math.PI, .42); } };
  doorway(3, 11, 5.5, .5); doorway(5, 9, 13.5, .5);
  // Starfall banners: either side of the bridge, along the bay's back wall and in the corridor
  livery("F", () => { banner(1.04, 1.6, -Math.PI / 2, .8, 1.2, 2.5); banner(12.96, 2.4, Math.PI / 2, .8, 1.2, 2.5);
    for (const x of [1.9, 5.65, 9.15, 12.1]) banner(x - .4, 16.95, 0, .8, 1.15, 2.45); banner(1.04, 7.4, -Math.PI / 2, .8, 1.2, 2.5); });
  for (const [x0, z0, x1, z1] of [[3, 4.94, 3.2, 6.06], [10.8, 4.94, 11, 6.06], [5, 12.94, 5.2, 14.06], [8.8, 12.94, 9, 14.06]]) COLL.push([x0, z0, x1, z1]);

  // ---------- bridge ----------
  // war table: an octagonal holo-table with a raised rim and a projector
  cyl(7, 3, 0, .16, 1.15, 8, "dark", { cap: "plate2" }); cyl(7, 3, .16, .72, .72, 8, "rib", { tile: 3 });
  cyl(7, 3, .72, .9, 1.62, 8, "metal", { tile: 4, r1: 1.68 }); cyl(7, 3, .78, .82, 1.66, 8, "glowCyan");
  annulus(7, .9, 3, 0, 1.46, 8, "holoGlass"); annulus(7, .97, 3, 1.46, 1.68, 8, "metal"); cyl(7, 3, .9, .97, 1.68, 8, "metal"); cyl(7, 3, .9, .97, 1.46, 8, "dark");
  cyl(7, 3, .9, 1.02, .16, 8, "dark", { cap: "glowCyan" });
  CIRC.push([7, 3, 1.7]); shadowDisc(7, 3, 1.5);
  INTER.push({ x: 7, z: 3, station: "war", reach: 2.5, wide: .8 });
  consoleAt(2.2, 1.5, 0, 1, "scrRadar"); consoleAt(11.8, 1.5, 0, 1, "scrGraph"); solidBox(1.8, 1.15, 2.6, 1.85); solidBox(11.4, 1.15, 12.2, 1.85);
  // side cabinets with a small status screen
  for (const cx of [1.3, 12.7]) { box(cx - .3, 0, 3.4, cx + .3, 1.15, 4.7, "cabinet", { tile: 1, top: "plate2" }); obox(cx, 1.3, 4.05, .6, .3, .06, cx < 7 ? Math.PI / 2 : -Math.PI / 2, .5, "dark", { front: "scrAlert" });
    solidBox(cx - .3, 3.4, cx + .3, 4.7); shadowRect(cx - .3, 3.4, cx + .3, 4.7); }
  // crew at the consoles, facing their screens (their backs to the room)
  if (typeof ART !== "undefined" && ART.soldier) SPRITES.push({ x: 2.2, z: 2.12, t: "soldier", h: 2.0, dirs: 8, face: -Math.PI / 2, home: -Math.PI / 2 }, { x: 11.8, z: 2.12, t: "soldier", h: 1.96, dirs: 8, face: -Math.PI / 2, home: -Math.PI / 2 });
  else SPRITES.push({ x: 2.2, z: 2.3, t: "crew1", h: 1.78 }, { x: 11.8, z: 2.35, t: "crew2", h: 1.74 });
  CIRC.push([2.2, 2.2, .3], [11.8, 2.2, .3]);
  INTER.push({ x: 2.2, z: 2.12, talk: "navigator", reach: 1.7 }, { x: 11.8, z: 2.12, talk: "comms", reach: 1.7 });
  // ---------- armory: three armor display lockers, a terminal and a gear bench ----------
  consoleAt(1.3, 6.5, 1, 0, "scrSliders"); solidBox(1, 6.1, 1.6, 6.9); INTER.push({ x: 1.3, z: 6.5, station: "armory", reach: 1.8 });
  SPRITES.push({ x: 3.4, z: 7.4, t: "armorer", h: 2.0, dirs: 8, face: .3, home: .3 }); CIRC.push([3.4, 7.4, .3]); INTER.push({ x: 3.4, z: 7.4, station: "armory", reach: 1.9, who: "armorer" });
  [["armL", 7.5], ["armM", 8.6], ["armH", 9.7]].forEach(([t, z]) => {
    box(1, 0, z - .55, 1.9, .14, z + .55, "dark", { top: "plate2", tile: 1 });                       // plinth
    box(1, .14, z - .48, 1.1, 2.35, z + .48, "cabinet", { tile: 1 });                                 // back
    box(1, .14, z - .55, 1.9, 2.35, z - .48, "rib", { tile: 1 }); box(1, .14, z + .48, 1.9, 2.35, z + .55, "rib", { tile: 1 });   // sides
    box(1, 2.35, z - .55, 1.95, 2.5, z + .55, "dark", { s: "haz", n: "dark", e: "haz", bottom: "glowWhite", tile: 1 });          // lit header
    SPRITES.push(typeof ART !== "undefined" && ART[t] ? { x: 1.5, z, t, h: 1.98, dirs: 8, face: 0, home: 0, yb: .14 } : { x: 1.5, z, t, h: 1.82 }); });
  solidBox(1, 6.95, 1.95, 10.25); shadowRect(1, 6.95, 1.95, 10.25);
  box(2.8, .72, 9.35, 3.9, .8, 10.25, "plate2", { tile: 1 }); for (const [lx, lz] of [[2.86, 9.41], [3.78, 9.41], [2.86, 10.13], [3.78, 10.13]]) box(lx, 0, lz, lx + .06, .72, lz + .06, "rib");
  box(2.95, .8, 9.5, 3.4, .98, 9.9, "crate", { tile: 2 }); obox(3.6, .84, 9.9, .5, .07, .14, .3, 0, "pipeMetal");
  solidBox(2.8, 9.35, 3.9, 10.25); shadowRect(2.8, 9.35, 3.9, 10.25);
  // ---------- requisition: a proper counter, stock shelves behind ----------
  box(10.45, 0, 6.3, 10.95, .14, 9.7, "dark"); box(10.38, .14, 6.3, 10.95, .96, 9.7, "counter", { tile: 1 });
  box(10.36, .74, 6.3, 10.4, .8, 9.7, "haz", { tile: 2 }); box(10.26, .96, 6.22, 11.02, 1.04, 9.78, "metal", { tile: 1 });
  box(10.5, 1.04, 6.5, 10.85, 1.22, 6.95, "crate", { tile: 3 }); box(10.55, 1.04, 7.05, 10.8, 1.16, 7.35, "crate", { tile: 3 });
  obox(10.62, 1.24, 9.2, .5, .32, .05, -Math.PI / 2, .45, "dark", { front: "scrKeys" }); box(10.55, 1.04, 9.12, 10.7, 1.1, 9.28, "dark");
  solidBox(10.26, 6.22, 11.02, 9.78); shadowRect(10.3, 6.25, 11, 9.75); INTER.push({ x: 10.6, z: 8, station: "shop", reach: 2, wide: .8 });
  SPRITES.push({ x: 11.85, z: 8, t: "quartermaster", h: 2.0, dirs: 8, face: Math.PI, home: Math.PI }); CIRC.push([11.85, 8, .3]);
  for (const sz of [6.25, 9.1]) { const z0 = sz, z1 = sz + .8;
    for (const [px, pz] of [[12.25, z0 - .03], [12.85, z0 - .03], [12.25, z1 - .02], [12.85, z1 - .02]]) box(px - .03, 0, pz, px + .03, 2.33, pz + .05, "rib");
    for (const sy of [.1, .85, 1.6, 2.25]) box(12.2, sy, z0, 12.95, sy + .05, z1, "plate2", { tile: 1 });
    box(12.3, .15, z0 + .08, 12.85, .62, z1 - .08, "crate", { tile: 2 }); box(12.35, .9, z0 + .1, 12.8, 1.25, z0 + .42, "crate", { tile: 3 }); box(12.4, .9, z0 + .45, 12.85, 1.2, z1 - .1, "ammo", { tile: 3 });
    box(12.3, 1.65, z0 + .12, 12.6, 1.9, z1 - .12, "ammo", { tile: 3 }); }
  solidBox(11.1, 6, 14, 10);
  // ---------- engineering: a caged reactor with conduits into the ceiling ----------
  { const rx = 1.95, rz = 11.2;
    cyl(rx, rz, 0, .18, .84, 8, "dark", { cap: "plate2" }); annulus(rx, .195, rz, .7, .84, 8, "haz");
    cyl(rx, rz, .18, .58, .58, 12, "rib", { tile: 3, cap: "dark" }); cyl(rx, rz, .58, 2.3, .36, 12, "reactor");
    for (const ry of [1.0, 1.45, 1.9]) cyl(rx, rz, ry, ry + .07, .41, 12, "metal", { cap: "metal" });
    cyl(rx, rz, 2.3, 2.62, .58, 12, "rib", { tile: 3 }); annulus(rx, 2.3, rz, .36, .58, 12, "dark"); annulus(rx, 2.62, rz, 0, .58, 12, "dark");
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + .26, bx = rx + Math.cos(a) * .52, bz = rz + Math.sin(a) * .52; box(bx - .03, .58, bz - .03, bx + .03, 2.3, bz + .03, "pipeMetal"); }
    tube([rx - .22, 2.62, rz - .16], [rx - .22, WALL_H, rz - .16], .09, 8, "pipeMetal"); tube([rx + .16, 2.62, rz + .2], [rx + .16, WALL_H, rz + .2], .11, 8, "pipeRed");
    tube([rx + .25, 2.5, rz - .25], [rx + .9, 2.86, rz - 1.1], .065, 6, "pipeMetal");
    CIRC.push([rx, rz, .86]); shadowDisc(rx, rz, .92); }
  consoleAt(3.3, 12.45, 0, -1, "scrPower"); solidBox(2.9, 12.05, 3.7, 12.85); INTER.push({ x: 3.3, z: 12.45, station: "eng", reach: 1.8 });
  if (typeof ART !== "undefined" && ART.engineer) { SPRITES.push({ x: 4.4, z: 11.55, t: "engineer", h: 2.0, dirs: 8, face: -.85, home: -.85 }); CIRC.push([4.4, 11.55, .3]); INTER.push({ x: 4.4, z: 11.55, station: "eng", reach: 1.9, who: "engineer" }); }
  else { SPRITES.push({ x: 4.2, z: 12.2, t: "eng", h: 1.76 }); CIRC.push([4.2, 12.2, .25]); }
  // ---------- service record terminal and clutter ----------
  consoleAt(12.4, 12.55, -1, 0, "scrLog"); solidBox(12.0, 12.15, 12.8, 12.95); INTER.push({ x: 12.4, z: 12.55, station: "records", reach: 1.8 });
  if (typeof buildRange === "function") buildRange();
  // ---------- launch bay: hellpods standing in launch gantries over floor hatches ----------
  for (const [pi, px] of POD_X.entries()) { const pz = POD_Z; (R3.podPos = R3.podPos || [])[pi] = [px, pz];
    // the launch shaft under the hatch: the pod drops down it and out of the ship's belly
    for (const [x0, z0, x1, z1] of [[px - PH, pz - PH, px + PH, pz - PH + .02], [px - PH, pz + PH - .02, px + PH, pz + PH], [px - PH, pz - PH, px - PH + .02, pz + PH], [px + PH - .02, pz - PH, px + PH, pz + PH]]) box(x0, -1.6, z0, x1, 0, z1, "hullOut3", { tile: 1 });
    for (const y of [-.35, -1.1]) for (const [x0, z0, x1, z1] of [[px - PH + .03, pz - PH + .03, px + PH - .03, pz - PH + .06], [px - PH + .03, pz + PH - .06, px + PH - .03, pz + PH - .03]]) box(x0, y, z0, x1, y + .05, z1, "glowRed");
    for (const s of [-1, 1]) { const gx = px + s * 1.2; box(gx - .07, 0, pz - .09, gx + .07, WALL_H, pz + .09, "rib", { tile: 1 });
      for (const [cy, r] of [[.95, .78], [1.7, .68]]) box(Math.min(gx, px + s * r), cy, pz - .05, Math.max(gx, px + s * r), cy + .1, pz + .05, "dark"); }
    box(px - 1.27, 2.74, pz - .12, px + 1.27, 2.9, pz + .12, "dark", { s: "haz", n: "haz", tile: 2 });
    box(px - .08, 2.68, pz - .32, px + .08, 2.74, pz - .2, "dark", { bottom: "glowRed", n: "glowRed" });
    CIRC.push([px, pz, .95]); COLL.push([px - 1.28, pz - .12, px - 1.12, pz + .12], [px + 1.12, pz - .12, px + 1.28, pz + .12]);
    INTER.push({ x: px, z: pz, station: "launch", reach: 1.75, pod: pi }); }
  box(1.02, 0, 14.05, 1.8, .78, 14.8, "crate", { tile: 1.3 }); box(1.12, .78, 14.15, 1.7, 1.3, 14.7, "crate", { tile: 1.6 }); solidBox(1, 14.05, 1.8, 14.8); shadowRect(1.02, 14.05, 1.8, 14.8);
  barrel(12.5, 14.5); barrel(12.2, 15.1); CIRC.push([12.5, 14.5, .32], [12.2, 15.1, .32]);
  for (const s of SPRITES) if (!s.yb && !/^arm/.test(s.t)) shadowDisc(s.x, s.z, .34);   // people get a contact shadow
  // upload every material
  const gl = R3.gl;
  for (const k in R3.mats) { const M = R3.mats[k], data = new Float32Array(M.mb.v); M.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, M.buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); M.n = data.length / 11; M.mb = null; }
  // the hologram planet spins, so it's its own mesh
  const hm = new MB(), S = 12, Rr = .42;
  for (let j = 0; j < S / 2; j++) for (let i = 0; i < S; i++) { const P = (a, b) => [Math.cos(a) * Math.sin(b) * Rr, Math.cos(b) * Rr, Math.sin(a) * Math.sin(b) * Rr];
    const a0 = i / S * 6.283, a1 = (i + 1) / S * 6.283, b0 = j / (S / 2) * 3.1416, b1 = (j + 1) / (S / 2) * 3.1416, n = P((a0 + a1) / 2, (b0 + b1) / 2).map(v => v / Rr);
    hm.quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1), n, [i / S, j / (S / 2), (i + 1) / S, (j + 1) / (S / 2)]); }
  // space bodies: a unit sphere and a flat ring, positioned around the camera every frame
  const sph = new MB(), SS = 24;
  for (let j = 0; j < SS / 2; j++) for (let i = 0; i < SS; i++) { const P = (a, b) => [Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)];
    const a0 = i / SS * 6.2832, a1 = (i + 1) / SS * 6.2832, b0 = j / (SS / 2) * 3.1416, b1 = (j + 1) / (SS / 2) * 3.1416;
    sph.vert(P(a0, b0), [i / SS, j / (SS / 2)], P(a0, b0), [1, 1, 1]); sph.vert(P(a1, b0), [(i + 1) / SS, j / (SS / 2)], P(a1, b0), [1, 1, 1]); sph.vert(P(a1, b1), [(i + 1) / SS, (j + 1) / (SS / 2)], P(a1, b1), [1, 1, 1]);
    sph.vert(P(a0, b0), [i / SS, j / (SS / 2)], P(a0, b0), [1, 1, 1]); sph.vert(P(a1, b1), [(i + 1) / SS, (j + 1) / (SS / 2)], P(a1, b1), [1, 1, 1]); sph.vert(P(a0, b1), [i / SS, (j + 1) / (SS / 2)], P(a0, b1), [1, 1, 1]); }
  R3.sphere = { buf: gl.createBuffer(), n: sph.v.length / 11 }; gl.bindBuffer(gl.ARRAY_BUFFER, R3.sphere.buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sph.v), gl.STATIC_DRAW);
  const rg = new MB(), RS = 64, ri = 1.35, ro = 2.3;
  for (let i = 0; i < RS; i++) { const a0 = i / RS * 6.2832, a1 = (i + 1) / RS * 6.2832, P = (a, r) => [Math.cos(a) * r, 0, Math.sin(a) * r];
    rg.quad(P(a0, ri), P(a1, ri), P(a1, ro), P(a0, ro), [0, 1, 0], [0, 0, 1, 1]); }
  for (let i = 0; i < rg.v.length; i += 11) { const r = Math.hypot(rg.v[i], rg.v[i + 2]); rg.v[i + 3] = (r - ri) / (ro - ri); rg.v[i + 4] = .5; }
  R3.ring = { buf: gl.createBuffer(), n: rg.v.length / 11 }; gl.bindBuffer(gl.ARRAY_BUFFER, R3.ring.buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rg.v), gl.STATIC_DRAW);
  R3.holo = { buf: gl.createBuffer(), n: hm.v.length / 11 }; gl.bindBuffer(gl.ARRAY_BUFFER, R3.holo.buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hm.v), gl.STATIC_DRAW);
  BASE.built = true; buildHoloMap(); buildExterior(); ensurePodModels();
}
function uploadTextures() { Object.assign(TXD, TEXART_LOADED); for (const k in TXD) R3.tex[k] = glTex(TXD[k]); for (const k in SP) R3.tex["sp_" + k] = glTex(SP[k]); }
// Scale2x: doubles pixel art and rounds off stair-stepped diagonals without blurring
function scale2x(T) { const { w, h, d } = T, s = new Uint32Array(d.buffer.slice(0)), W = w * 2, o = new Uint32Array(W * h * 2);
  const P = (x, y) => s[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = P(x, y), A = P(x, y - 1), B = P(x + 1, y), C = P(x - 1, y), D = P(x, y + 1), i = y * 2 * W + x * 2;
    o[i] = C === A && C !== D && A !== B ? A : p; o[i + 1] = A === B && A !== C && B !== D ? B : p; o[i + W] = D === C && D !== B && C !== A ? C : p; o[i + W + 1] = B === D && B !== A && D !== C ? D : p; }
  return { w: W, h: h * 2, d: new Uint8Array(o.buffer) }; }
// hand-made character art: a strip of square frames, 8 directions: front, then turning to the character's left (frame 2 = her right side, 4 = back)
function loadDirSprite(name, src) { const img = new Image(); img.onload = () => {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); const n = Math.round(img.width / img.height), fw = img.width / n;
    for (let i = 0; i < n; i++) { const im = g.getImageData(i * fw, 0, fw, img.height).data, d = new Uint8Array(im.length);
      for (let p = 0; p < im.length; p += 4) if (im[p + 3] > 100 && !(im[p] > 240 && im[p + 1] < 20 && im[p + 2] > 240)) { d[p] = im[p]; d[p + 1] = im[p + 1]; d[p + 2] = im[p + 2]; d[p + 3] = 255; }
      let T = { w: fw, h: img.height, d }; while (T.h < 96) T = scale2x(T);
      let low = T.h - 1; outer: for (; low > 0; low--) for (let x = 0; x < T.w; x++) if (T.d[(low * T.w + x) * 4 + 3]) break outer;
      T.pad = (T.h - 1 - low) / T.h;   // empty rows under the feet, so the sprite can be planted on the floor   // small art gets smoothed up so it holds up close
      SP[name + i] = T; if (R3.gl) R3.tex["sp_" + name + i] = glTex(T); }
    SP[name] = SP[name + "0"]; SP[name].dirs = n; }; img.src = src; }
if (typeof ART !== "undefined") for (const k in ART) loadDirSprite(k, ART[k]);

// ---------- matrices ----------
function m4mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); }
function lookDir(e, yaw, pitch) { const f = [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)], z = f.map(v => -v);
  let x = [z[2], 0, -z[0]]; const xl = Math.hypot(...x); x = x.map(v => v / xl); const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x, e), -d(y, e), -d(z, e), 1]); }
const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function norm3(v) { const l = Math.hypot(...v); return v.map(x => x / l); }
const mT = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]), mS = s => new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);
const mRx = a => new Float32Array([1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1]);
const mRy = a => new Float32Array([Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1]);
const mRz = a => new Float32Array([Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const mChain = (...ms) => ms.reduce((a, b) => m4mul(a, b));

// ---------- draw ----------
function bindVB(buf) { const gl = R3.gl, L = R3.loc, st = 44; gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(L.aP); gl.vertexAttribPointer(L.aP, 3, gl.FLOAT, false, st, 0); gl.enableVertexAttribArray(L.aT); gl.vertexAttribPointer(L.aT, 2, gl.FLOAT, false, st, 12);
  gl.enableVertexAttribArray(L.aN); gl.vertexAttribPointer(L.aN, 3, gl.FLOAT, false, st, 20); gl.enableVertexAttribArray(L.aC); gl.vertexAttribPointer(L.aC, 3, gl.FLOAT, false, st, 32); }
function renderBase() {
  const gl = R3.gl, L = R3.loc, B = BASE; if (!gl) return;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const DR = DROP && DROP.podM ? DROP : null, sk = B.jump ? B.jump.shake : DR ? (DR.shake || 0) * .5 : 0, eye = [B.x + (Math.random() - .5) * sk, (B.eyeY ?? EYE + Math.sin(B.bob) * .035) + (Math.random() - .5) * sk, B.z + (Math.random() - .5) * sk], VIEWM = lookDir(eye, B.a, B.pitch), VP = m4mul(persp(1.15, R3.W / R3.H, .06, DR ? 700 : 36), VIEWM), VPS = m4mul(persp(1.15, R3.W / R3.H, 1, 600), VIEWM); R3.lastVP = VP;
  gl.uniformMatrix4fv(L.uVP, false, VP); gl.uniform3fv(L.uCam, eye); gl.uniform3f(L.uAmb, .2, .22, .27); gl.uniform3f(L.uFog, .03, .035, .05); gl.uniform1f(L.uFogD, DR ? 70 : B.x > 13 ? 34 : 18); gl.uniform1f(L.uFogK, .75); gl.uniform3f(L.uLCol, 0, 0, 0); gl.uniform3f(L.uLDir, 0, 1, 0); gl.clearColor(.03, .035, .05, 1);
  const lp = new Float32Array(24), lc = new Float32Array(24); LIGHTS.forEach(([p, c], i) => { lp.set(p, i * 3); const fl = i === 5 ? .85 + .15 * Math.sin(B.t * 3) : i === 7 ? .8 + .2 * Math.sin(B.t * 1.7) : 1; lc.set(c.map(v => v * fl * (B.jump && B.jump.t > 1.4 && B.jump.t < 4.2 ? .55 + .45 * (Math.random() < .9) : 1)), i * 3); });
  if (DR) { lp.set([eye[0], eye[1] + .45, eye[2]], 3); lc.set(podLight(DR), 3); }
  if (!DR && typeof rangeLights === "function") rangeLights(lp, lc, eye);
  gl.uniform3fv(L.uLP, lp); gl.uniform3fv(L.uLC, lc); gl.uniform1i(L.uTex, 0); gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(L.uDither, 0); gl.uniform1f(L.uBill, 0); gl.uniform2f(L.uScroll, 0, 0); gl.uniform3fv(L.uSun, R3.sun);
  // space first, centred on the eye so it is infinitely far away; then the depth buffer is wiped and the ship drawn on top
  gl.uniformMatrix4fv(L.uVP, false, VPS);
  const draw = (mesh, texk, M, mode) => { gl.uniformMatrix4fv(L.uM, false, M); gl.uniform1f(L.uSky, mode); gl.bindTexture(gl.TEXTURE_2D, R3.tex[texk]); bindVB(mesh.buf); gl.drawArrays(gl.TRIANGLES, 0, mesh.n); };
  const OB = DR ? orbitView(DR) : null, [ex, ey, ez] = eye, pd = OB ? OB.pd : norm3([-.22, .1, -1]), PD = 140, pc = [ex + pd[0] * PD, ey + pd[1] * PD, ez + pd[2] * PD], J = B.jump, sys = SYSTEMS[curSystem()];
  const tint = J ? J.tint : [1, 1, 1]; gl.uniform3fv(L.uTint, tint);
  draw(R3.sphere, "sky", mChain(mT(ex, ey, ez), mRy(B.t * .002 + (J ? J.spin : 0)), mS(250)), 1);
  const ps = 46 * (J ? J.planetScale : 1) * (OB ? OB.grow : 1);
  gl.uniform3fv(L.uSun, OB ? OB.sun : norm3([-.75, .42, .5]));   // the planet is lit from over your left shoulder, so its day side faces the window
  if (ps > .5) { draw(R3.sphere, "planet", mChain(mT(...pc), mRz(.38), mRy(B.t * .015), mS(ps)), 2);
    if (sys.ring) draw(R3.ring, "ring", mChain(mT(...pc), mRz(.3), mRx(.75), mS(ps)), 1);
    const md = norm3([1, .28, -.62]); draw(R3.sphere, "moon", mChain(mT(ex + md[0] * 120, ey + md[1] * 120, ez + md[2] * 120), mRy(1.2), mS(5 * ps / 46)), 2);
    if (!J && !OB) drawPlanetBlasts(eye, pc, ps, B); }
  gl.uniform3fv(L.uSun, R3.sun);
  if (J && J.speed > 1) drawStreaks(eye, J);
  // the ship's own hull outside the bridge window: its own depth layer, so nothing in space can poke through it
  if (R3.ext) { gl.clear(gl.DEPTH_BUFFER_BIT); gl.uniformMatrix4fv(L.uM, false, IDENT); gl.uniform3f(L.uTint, 1, 1, 1);
    for (const M of R3.ext) { gl.uniform1f(L.uSky, M.tex.startsWith("glow") ? 1 : 4); gl.bindTexture(gl.TEXTURE_2D, R3.tex[M.tex] || R3.tex.hull);
      if (M.blink) gl.uniform3f(L.uTint, ...(Math.sin(B.t * 3 + M.blink) > .3 ? [1, 1, 1] : [.15, .15, .15]));
      bindVB(M.buf); gl.drawArrays(gl.TRIANGLES, 0, M.n); if (M.blink) gl.uniform3f(L.uTint, 1, 1, 1); }
    if (R3.frigate) for (const E of R3.escorts) { gl.uniformMatrix4fv(L.uM, false, mChain(mT(...E.p), mRy(E.yaw), mS(E.s)));
      for (const P of R3.frigate) { const gw = P.tex.startsWith("glow"); gl.uniform1f(L.uSky, gw ? 1 : 4); if (/~[ab]$/.test(P.key)) gl.uniform3f(L.uTint, ...(Math.sin(B.t * 3 + (P.key.endsWith("a") ? 1 : 4)) > .3 ? [1, 1, 1] : [.15, .15, .15]));
        gl.bindTexture(gl.TEXTURE_2D, R3.tex[P.tex] || R3.tex.hull); bindVB(P.buf); gl.drawArrays(gl.TRIANGLES, 0, P.n); gl.uniform3f(L.uTint, 1, 1, 1); } }
    if (R3.batHead) for (const b of R3.batteries) { gl.uniformMatrix4fv(L.uM, false, batMatrix(b)); for (const P of R3.batHead) { gl.uniform1f(L.uSky, P.tex.startsWith("glow") ? 1 : 4); gl.bindTexture(gl.TEXTURE_2D, R3.tex[P.tex] || R3.tex.hull); bindVB(P.buf); gl.drawArrays(gl.TRIANGLES, 0, P.n); } }
    gl.uniformMatrix4fv(L.uM, false, IDENT); drawShells(eye, B); }
  gl.uniform3f(L.uTint, 1, 1, 1);
  gl.uniform1f(L.uSky, 0); gl.clear(gl.DEPTH_BUFFER_BIT); gl.uniformMatrix4fv(L.uVP, false, VP);
  gl.uniformMatrix4fv(L.uM, false, IDENT);
  for (const k in R3.mats) { const M = R3.mats[k]; if (B.hidePod != null && k.endsWith("~p" + B.hidePod)) continue; gl.uniform1f(L.uDither, k === "shadow" || k.endsWith("~d") ? 1 : 0); gl.uniform2f(L.uScroll, 0, k === "reactor" ? -B.t * .25 : 0); gl.bindTexture(gl.TEXTURE_2D, R3.tex[M.tex] || R3.tex.hull); bindVB(M.buf); gl.drawArrays(gl.TRIANGLES, 0, M.n); }
  gl.uniform2f(L.uScroll, 0, 0);
  if (R3.podFull) for (const [pi, [px, pz]] of (R3.podPos || []).entries()) { const ours = DROP && DROP.pod === pi && DROP.podM, M = ours ? DROP.podM : mChain(mT(px, 0, pz), mRy(Math.PI / 2)), h = ours ? DROP.hatch || 0 : 0;
    for (const s of [-1, 1]) drawParts(R3.hatchHalf, mT(px + s * (PH / 2 + h * PH * 1.05), -h * .09, pz));
    if (ours) continue; drawParts(R3.podFull, M); drawParts(R3.podDoor, mChain(M, doorHinge(DOOR_OPEN))); }
  if (DROP && DROP.podM) { const D = DROP; if (D.veil) drawVeil(eye, D); drawParts(R3.podFull, D.podM); drawParts(R3.podDoor, mChain(D.podM, doorHinge(D.swing || 0))); }
  drawHoloMap(B.t);
  // spinning hologram
  const a = B.t * .6, M = new Float32Array([Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 7, 1.62 + Math.sin(B.t * 1.3) * .03, 3, 1]);
  gl.uniformMatrix4fv(L.uM, false, M); gl.uniform1f(L.uDither, 1); gl.bindTexture(gl.TEXTURE_2D, R3.tex.planet); bindVB(R3.holo.buf); gl.drawArrays(gl.TRIANGLES, 0, R3.holo.n);
  gl.uniformMatrix4fv(L.uM, false, IDENT); gl.uniform1f(L.uDither, 0);
  // people: flat sprites that turn to face you
  gl.uniform1f(L.uBill, 1); const rx = -Math.sin(B.a), rz = Math.cos(B.a), sm = new MB();
  for (const s of SPRITES) { let key = s.t;
    if (s.dirs) { if (!SP[s.t + "0"]) continue; const n = SP[s.t].dirs, k = ((Math.round(angDiff(s.face, Math.atan2(B.z - s.z, B.x - s.x)) / (Math.PI * 2 / n)) % n) + n) % n; key = s.t + k; }
    const T = SP[key], w = s.h * T.w / T.h / 2, y0 = -(T.pad || 0) * s.h; sm.v = [];
    const yb = y0 + (s.yb || 0); sm.quad([s.x - rx * w, s.h + yb, s.z - rz * w], [s.x + rx * w, s.h + yb, s.z + rz * w], [s.x + rx * w, yb, s.z + rz * w], [s.x - rx * w, yb, s.z - rz * w], [-Math.cos(B.a), 0, -Math.sin(B.a)]);
    gl.bindBuffer(gl.ARRAY_BUFFER, R3.dyn); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sm.v), gl.DYNAMIC_DRAW); bindVB(R3.dyn); gl.bindTexture(gl.TEXTURE_2D, R3.tex["sp_" + key]); gl.drawArrays(gl.TRIANGLES, 0, 6); }
  gl.uniform1f(L.uBill, 0);
  if (!DR && typeof drawRange === "function") drawRange(eye);
}

// ---------- the destroyer's batteries: every half minute or so a battery fires a salvo at the planet below.
// The shells are real slugs flying off toward the planet; seconds later the impacts flare on its surface.
// the turret head's matrix: the same rotation xform() uses (pitch about x, then yaw), scaled, at the turret ring
// an escort's slow wander about its station: a lazy figure of eight over a couple of minutes, nosing a touch into the turns
function escortPose(E, t) { const w = .045, a = t * w + E.ph; E.p = [E.p0[0] + Math.sin(a) * E.A[0], E.p0[1] + Math.sin(a * 1.7) * E.A[1], E.p0[2] + Math.sin(a * .5) * E.A[2]];
  E.yaw = E.yaw0 - Math.cos(a) * .12; }
function batRot(b) { const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), cp = Math.cos(b.pitch), sp = Math.sin(b.pitch); return (x, y, z) => { const y2 = y * cp - z * sp, z2 = y * sp + z * cp; return [x * cy + z2 * sy, y2, -x * sy + z2 * cy]; }; }
function batMatrix(b) { const r = batRot(b), k = b.k, X = r(k, 0, 0), Y = r(0, k, 0), Z = r(0, 0, k), o = r(0, 0, b.kick * k);
  return new Float32Array([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, b.x + o[0], b.y + o[1], b.z + o[2], 1]); }
function batMuzzle(b, bx) { const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), cp = Math.cos(b.pitch), sp = Math.sin(b.pitch), rot = (x, y, z) => { const y2 = y * cp - z * sp, z2 = y * sp + z * cp; return [x * cy + z2 * sy, y2, -x * sy + z2 * cy]; };
  const m = rot(bx * b.k, 1.1 * b.k, -11.8 * b.k), d = rot(0, 0, -1); return { p: [b.x + m[0], b.y + m[1], b.z + m[2]], d }; }
function batteryTick(dt) { const B = BASE, S = B.salvo = B.salvo || { next: B.t + 10, shots: [], blasts: [], smoke: [], queue: [] };
  if (!R3.batteries || !R3.batteries.length) return;
  const pd = norm3([-.22, .1, -1]);
  for (const E of R3.escorts || []) escortPose(E, B.t);
  for (const b of R3.batteries) if (b.esc) { const E = b.esc, cy = Math.cos(E.yaw), sy = Math.sin(E.yaw); b.x = E.p[0] + (b.lx * cy + b.lz * sy) * E.s; b.y = E.p[1] + b.ly * E.s; b.z = E.p[2] + (-b.lx * sy + b.lz * cy) * E.s; }
  // pick a battery and a spot on the planet; it traverses onto it, and fires both barrels once it's laid on
  S.nexts = S.nexts || [S.next, B.t + 5 + Math.random() * 8, B.t + 9 + Math.random() * 10];
  for (let sh = 0; sh < 3; sh++) if (B.t > S.nexts[sh] && !B.jump && !DROP && MODE === "base") { S.nexts[sh] = B.t + (sh ? 14 + Math.random() * 18 : 12 + Math.random() * 16); const free = R3.batteries.filter(b => !b.aim && b.ship === sh);
    if (free.length) { const b = free[Math.floor(Math.random() * free.length)], n = norm3([-pd[0] + (Math.random() - .5) * .8, -pd[1] + (Math.random() - .5) * .6, -pd[2] + (Math.random() - .5) * .8]),
        a = norm3(pd.map((v, i) => v * 140 + n[i] * 46)); b.aim = { n, yaw: Math.atan2(-a[0], -a[2]), pitch: Math.asin(a[1]), t: 0 }; } }
  for (const b of R3.batteries) { b.kick = Math.max(0, b.kick - dt * 1.2);
    // between salvos every gun rests laid on the middle of the planet
    const ty = b.aim ? b.aim.yaw : Math.atan2(-pd[0], -pd[2]), tp = b.aim ? b.aim.pitch : Math.asin(pd[1]), dy2 = angDiff(b.yaw, ty), dp = tp - b.pitch;
    b.yaw += clamp(dy2, -.1 * dt, .1 * dt); b.pitch += clamp(dp, -.06 * dt, .06 * dt);   // heavy, slow traverse
    if (b.aim) { b.aim.t += dt; if (!b.aim.fired && Math.abs(angDiff(b.yaw, ty)) < .004 && Math.abs(dp) < .004 && b.aim.t > .6) { b.aim.fired = true; [-.9, .9].forEach((bx, i) => S.queue.push({ at: B.t + .5 + i * .45, b, bx, n: b.aim.n })); }
      if (b.aim.fired && !S.queue.some(q => q.b === b) && b.kick < .05) b.aim = null; } }
  for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if (B.t < q.at) continue; S.queue.splice(i, 1); const { p, d } = batMuzzle(q.b, q.bx); q.b.kick = .6;
    const dir = norm3([d[0] + (Math.random() - .5) * .01, d[1], d[2] + (Math.random() - .5) * .01]);
    S.shots.push({ p: p.slice(), v: dir.map(v => v * 130), t: 0 }); for (let k = 0; k < 6; k++) S.smoke.push({ p: [p[0] + d[0] * k * 1.4, p[1], p[2] + d[2] * k * 1.4], v: [(Math.random() - .5) * 3, 1 + Math.random() * 2, (Math.random() - .5) * 3], t: 0, life: 2 + Math.random() * 1.5, s: 2 + k * .4 });
    (S.flashes = S.flashes || []).push({ p, t: 0, d }); const vol = q.b.ship ? .18 : 1; AU.cannon && AU.cannon(.55 * vol); AU.boom(.9 * vol, .3);
    const n = norm3(q.n.map(v => v + (Math.random() - .5) * .04)); S.blasts.push({ n, at: B.t + 6 + Math.random() * 2.5, t: -1 }); }
  for (let i = S.shots.length - 1; i >= 0; i--) { const s = S.shots[i]; s.t += dt; for (let k = 0; k < 3; k++) s.p[k] += s.v[k] * dt; if (s.t > 4.2) S.shots.splice(i, 1); }
  for (let i = S.smoke.length - 1; i >= 0; i--) { const m = S.smoke[i]; m.t += dt; for (let k = 0; k < 3; k++) m.p[k] += m.v[k] * dt; if (m.t > m.life) S.smoke.splice(i, 1); }
  if (S.flashes) for (let i = S.flashes.length - 1; i >= 0; i--) { S.flashes[i].t += dt; if (S.flashes[i].t > .25) S.flashes.splice(i, 1); }
  for (let i = S.blasts.length - 1; i >= 0; i--) { const b = S.blasts[i]; if (B.t >= b.at) b.t = B.t - b.at; if (b.t > 3.2) S.blasts.splice(i, 1); } }
function blobTex() { if (!R3.tex.blobB) R3.tex.blobB = glTex(tex(16, 16, (x, y) => Math.hypot(x - 7.5, y - 7.5) < 7.2 ? [255, 255, 255, 1] : null)); return "blobB"; }
function drawShells(eye, B) { const S = B.salvo; if (!S) return; const cam = camBasis(B.a, B.pitch), m = new MB(), sm = new MB();
  for (const s of S.shots) { const sp = Math.hypot(...s.v), d = s.v.map(v => v / sp), k = Math.max(0, 1 - s.t / 4.2), tail = s.p.map((v, i) => v - d[i] * 6);
    lineQ(m, tail, s.p, 1.1, eye, [1.2 * k + .2, .55 * k + .15, .2], [2, 1.6, .9]); billQ(m, s.p, 2, cam, [2, 1.8, 1.2]); }
  for (const F of S.flashes || []) { const f = 1 - F.t / .25; billQ(m, F.p.map((v, i) => v + F.d[i] * 4), 5 + f * 6, cam, [2, 1.4, .6]); billQ(m, F.p.map((v, i) => v + F.d[i] * 2), 2.5 + f * 3, cam, [2, 2, 1.8]); }
  for (const q of S.smoke) { const k = 1 - q.t / q.life; billQ(sm, q.p, q.s * (1.6 - k * .6), cam, [.42 * k + .1, .4 * k + .1, .38 * k + .1]); }
  const t = blobTex(); drawMB(sm, t, 1, 1); drawMB(m, t, 1); }
function drawPlanetBlasts(eye, pc, ps, B) { const S = B.salvo; if (!S || !S.blasts.length) return; const cam = camBasis(B.a, B.pitch), m = new MB();
  for (const b of S.blasts) { if (b.t < 0) continue; const P = pc.map((v, i) => v + b.n[i] * ps * 1.005), toE = norm3(eye.map((v, i) => v - P[i])), at = k => P.map((v, i) => v + toE[i] * k), u = b.t;   // layers stacked toward the viewer
    if (u > .3) { const a = Math.max(0, 1 - (u - .3) / 2.9), r = .45 + (u - .3) * .5; billQ(m, at(.05).map((v, i) => v + cam.u[i] * (u - .3) * .22), r, cam, [.34 * a + .05, .27 * a + .05, .22 * a + .05]); }   // the dust plume, rising
    const g = u < .2 ? u / .2 : Math.max(0, 1 - (u - .2) / 2.4); billQ(m, at(.15), .5 + Math.min(u, 1) * .7, cam, [2 * g, 1 * g, .32 * g]);   // the fireball
    if (u < .3) billQ(m, at(.25), .35 + u * 2.6, cam, [2, 2, 1.8]);   // the flash
    if (u < 2.5) billQ(m, at(.3), .22, cam, [2, 1.3 * Math.max(.3, 1 - u / 2.5), .4]); }   // the glowing crater
  drawMB(m, blobTex(), 1); }
// ---------- the exterior: an arrowhead hull stretching out ahead of and below the raised bridge ----------
function buildExterior() {
  const gl = R3.gl, keep = R3.mats; R3.mats = {};
  // a smooth arrowhead hull: the deck slopes gently down toward the bow, so the planet stays in view above it
  const CX = 7, D0 = -16, Z0 = -10, ZT = -170, HW0 = 44, SLOPE = .08;
  const hw = z => Math.max(0, HW0 * (z - ZT) / (Z0 - ZT)), dy = z => D0 + (z - Z0) * SLOPE;
  const U = (w, d, k = 6) => [0, 0, w / k, d / k], nUp = norm3([0, 1, -SLOPE]);
  // the command tower: a brass-railed ledge under the window, then a sloped armoured face down to the deck
  box(CX - 7.5, -1, -1.3, CX + 7.5, -.06, 1, "podIron", { tile: .3 }); box(CX - 7.5, -.12, -1.36, CX + 7.5, -.02, -1.22, "podBrass");
  const tf = mb("gPaintF").mb; tf.quad([CX - 8, -1, -1.3], [CX + 8, -1, -1.3], [CX + 13, D0, Z0], [CX - 13, D0, Z0], [0, .45, -.9], U(20, 18, 4));
  for (const s of [-1, 1]) { const f = mb("gHullF").mb, P = (w, y, z) => [CX + s * w, y, z]; f.quad(P(8, -1, -1.3), P(8, -1, 20), P(13, D0, 20), P(13, D0, Z0), [s, .2, 0], U(22, 16, 4));
    tube([CX + s * 8, -1, -1.3], [CX + s * 13, D0, Z0], .35, 6, "podBrass", .3); }
  for (let i = 0; i < 10; i++) { const y = -4.2, x = CX - 9 + i * 2, zz = lerp(-1.3, Z0, (-y - 1) / (-D0 - 1)); box(x - .5, y - .3, zz - .1, x + .5, y + .3, zz + .05, "glowWhite~w"); }
  xform(() => emblem(0, 0, 0, Math.PI, 5), { t: [CX, -9.6, lerp(-1.3, Z0, .55) - .25], pitch: -.62 });   // the Starfall sigil on the tower face
  // the deck: dark iron plating, its edges rolling down into green armoured flanks, brass rails along the seams
  for (let z = Z0; z > ZT + .1; z -= 20) { const z1 = Math.max(ZT, z - 20), a = hw(z), b = hw(z1), y0 = dy(z), y1 = dy(z1), m = mb(((z / 20) | 0) % 2 ? "podIron" : "dark").mb;
    m.quad([CX - a, y0, z], [CX + a, y0, z], [CX + b, y1, z1], [CX - b, y1, z1], nUp, U(2 * a, 20, 5));
    for (const s of [-1, 1]) { const f = mb("gHullF").mb, d = 30, o = 22, P = (w, y, zz) => [CX + s * w, y, zz];
      f.quad(P(a, y0, z), P(b, y1, z1), P(b + o * b / HW0, y1 - d * Math.max(.15, b / HW0), z1), P(a + o * a / HW0, y0 - d * Math.max(.15, a / HW0), z), [s * .6, .8, 0], U(20, 30, 6));
      tube(P(a, y0 + .15, z), P(b, y1 + .15, z1), .3, 6, "podBrass", .2);
      if (b > 6) { const yb = y1, xb = b; obox(CX + s * (xb + 2.2), yb - 1.6, z1, 1.2, 5, 3.4, Math.PI / 2 * s, 0, "podIron", { top: "podBrass" }); } } }   // buttress ribs over the flank
  // giant gun batteries: turret drums on brass rings, an armoured housing and twin long barrels, like the sentries
  const battery = (x, z, yaw, k, pitch = .1) => { const y = dy(z);
    cyl(x, z, y - .5, y + .9 * k, 3.25 * k, 16, "podIron", { cap: "dark" }); cyl(x, z, y + .8 * k, y + 1 * k, 3.35 * k, 16, "podBrass");
    R3.batteries.push({ x, y: y + k, z, yaw, pitch, k, yaw0: yaw, pitch0: pitch, kick: 0 }); };
  R3.batHead = buildParts(() => { box(-2.4, 0, -2.2, 2.4, 2.2, 2.6, "gPaintF", { tile: .4, top: "gPaintF" }); obox(0, 1.9, -2.6, 4.6, .4, 1.6, 0, .5, "gPaintF"); box(-2.45, 1.9, -2.25, 2.45, 2.15, 2.65, "podBrass");
      emblem(2.42, 1.1, .2, Math.PI / 2, 1.6); emblem(-2.42, 1.1, .2, -Math.PI / 2, 1.6); box(-.6, 2.2, .6, .6, 2.7, 1.8, "podIron", { n: "glowRed~b" });
      for (const bx of [-.9, .9]) { tube([bx, 1.1, -2], [bx, 1.1, -11], .28, 8, "pipeMetal", .5); tube([bx, 1.1, -2], [bx, 1.1, -5.5], .5, 8, "podIron", .5);
        for (const bz of [-7, -9.5]) tube([bx, 1.1, bz], [bx, 1.1, bz - .35], .34, 8, "podBrass", 1); tube([bx, 1.1, -11], [bx, 1.1, -11.8], .38, 8, "dark", 1); } });
  R3.batteries = [];
  for (const s of [-1, 1]) for (const [z, off, yaw, k] of [[-48, 16, .25, 2.2], [-95, 10.5, .15, 1.8]]) battery(CX + s * off, z, s * yaw, k);   // two pairs either side of the centreline
  // two escort frigates holding station off the bow, with their own turret batteries shelling the planet
  const FRIG = [[-50, .4, .4, -.4], [-38, 4.5, 1.8, -2.6], [-18, 8, 3, -4.5], [4, 9.5, 3.8, -5.6], [24, 10, 4, -6], [40, 9, 3.4, -5.4], [46, 7, 2.4, -4]];
  const frigate = () => { const ring = ([z, w, t, b]) => [[-w, 0, z], [-w * .72, t, z], [w * .72, t, z], [w, 0, z], [w * .55, b, z], [-w * .55, b, z]], R = FRIG.map(ring), TX = ["gHullF", "podIron", "gHullF", "gHullF", "dark", "gHullF"];
    for (let j = 0; j < R.length - 1; j++) { const zm = (FRIG[j][0] + FRIG[j + 1][0]) / 2, ym = (FRIG[j][2] + FRIG[j][3]) / 2, len = FRIG[j + 1][0] - FRIG[j][0];
      for (let f = 0; f < 6; f++) { const A = R[j][f], B2 = R[j][(f + 1) % 6], C = R[j + 1][(f + 1) % 6], D = R[j + 1][f], e1 = B2.map((v, i) => v - A[i]), e2 = D.map((v, i) => v - A[i]);
        let n = norm3([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]); const mid = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2 - ym, (A[2] + C[2]) / 2 - zm];
        if (n[0] * mid[0] + n[1] * mid[1] + n[2] * mid[2] < 0) n = n.map(v => -v); mb(TX[f]).mb.quad(A, B2, C, D, n, [0, 0, Math.max(1, Math.round(len / 6)), 2]); }
      for (const f of [1, 2]) tube(R[j][f], R[j + 1][f], .25, 5, "podBrass", .2); }
    const S2 = R[R.length - 1], st = mb("dark").mb; st.quad(S2[0], S2[1], S2[2], S2[3], [0, 0, 1]); st.quad(S2[0], S2[3], S2[4], S2[5], [0, 0, 1]);
    for (const x of [-4, 0, 4]) { tube([x, -1, 45], [x, -1, 50], 1.9, 8, "podIron", .5); box(x - 1.3, -2.3, 50, x + 1.3, .3, 50.4, "glowCyan"); }
    obox(0, -6.5, 12, 1.2, 5, 44, 0, 0, "gHullF", { top: "podBrass" });   // the keel fin
    box(-3.4, 3.8, 12, 3.4, 11, 26, "gPaintF", { tile: .3, top: "podIron" }); box(-2.4, 11, 15, 2.4, 12.6, 23, "podIron", { top: "podBrass" });   // the command tower
    box(-3.5, 9.3, 11.85, 3.5, 10, 12, "glowWhite"); tube([0, 12.6, 19], [0, 19, 19], .3, 5, "pipeMetal", .5); box(-.4, 19, 18.6, .4, 19.8, 19.4, "glowRed~a");
    emblem(3.45, 7.4, 19, Math.PI / 2, 4.5); emblem(-3.45, 7.4, 19, -Math.PI / 2, 4.5);
    for (let z = -30, k = 0; z < 42; z += 14, k++) for (const sd of [-1, 1]) { const w = lerp(4.5, 10, clamp((z + 38) / 62, 0, 1)); box(sd * w - .4, -.3, z - .4, sd * w + .4, .5, z + .4, k % 2 ? "glowRed~a" : "glowWhite~b"); } };
  const pd0 = norm3([-.22, .1, -1]), yaw0 = Math.atan2(-pd0[0], -pd0[2]), pitch0 = Math.asin(pd0[1]);
  // the frigates are their own model, drawn with a matrix: they drift slowly about their stations, and their guns ride along
  R3.frigate = buildParts(() => { frigate(); for (const [z, t] of [[-18, 3], [4, 3.8]]) { const k = 1.2; cyl(0, z, t - .4, t + .9 * k, 3.25 * k, 16, "podIron", { cap: "dark" }); cyl(0, z, t + .8 * k, t + 1 * k, 3.35 * k, 16, "podBrass"); } });
  R3.escorts = [{ p0: [-232, -40, -250], yaw0: .14, s: 1.5, ph: 0, A: [18, 10, 30] }, { p0: [135, -18, -235], yaw0: -.05, s: 1.5, ph: 2.4, A: [32, 12, 50] }];
  R3.escorts.forEach((E, i) => { escortPose(E, 0); for (const [z, t] of [[-18, 3], [4, 3.8]]) R3.batteries.push({ lx: 0, ly: t + 1.2, lz: z, esc: E, x: 0, y: 0, z: 0, yaw: yaw0, pitch: pitch0, k: 1.2 * E.s, kick: 0, ship: i + 1 }); });
  for (const b of R3.batteries) { b.yaw = yaw0; b.pitch = pitch0; b.ship = b.ship || 0; }
  // running lights along the edges, blinking in two groups
  for (const s of [-1, 1]) for (let z = Z0 - 10, k = 0; z > ZT + 12; z -= 18, k++) { const x = CX + s * (hw(z) - .8), y = dy(z), c = k % 2 ? "glowRed~a" : "glowWhite~b";
    box(x - .5, y, z - .5, x + .5, y + .8, z + .5, c); }
  R3.ext = []; for (const k in R3.mats) { const M = R3.mats[k], data = new Float32Array(M.mb.v); const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    R3.ext.push({ buf, n: data.length / 11, tex: M.tex.replace(/~.$/, ""), blink: k.endsWith("~a") ? 1 : k.endsWith("~b") ? 4 : 0 }); }
  R3.mats = keep;
}

// ---------- the war table's 3D hologram: terrain of the current planet with tactical markers ----------
const HOLO = { cx: 7, cz: 3, R: 1.34, y0: .935, H: .34, N: 30 };
function holoHeight(x, z) { const S = SYSTEMS[curSystem()], s = S.seed % 997, u = (x - HOLO.cx) / HOLO.R, v = (z - HOLO.cz) / HOLO.R;
  const n = fbm(u * 2.6 + 5, v * 2.6 + 9, s), e = Math.max(0, 1 - Math.hypot(u, v) ** 4);   // flatten toward the rim
  return Math.max(0, (n - .38) / .62) * e; }
function buildHoloMap() {
  const gl = R3.gl; if (!gl) return; const { cx, cz, R, y0, H, N } = HOLO, fill = new MB(), grid = new MB(), cell = 2 * R / N;
  const col = h => [lerp(.04, .5, h), lerp(.25, 1, h), lerp(.45, 1, h)];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x0 = cx - R + i * cell, z0 = cz - R + j * cell;
    if (Math.hypot(x0 + cell / 2 - cx, z0 + cell / 2 - cz) > R * .97) continue;
    const P = (x, z, lift = 0) => { const h = holoHeight(x, z); return [x, y0 + h * H + lift, z]; }, h = (x, z) => holoHeight(x, z);
    const c = [[x0, z0], [x0 + cell, z0], [x0 + cell, z0 + cell], [x0, z0 + cell]];
    fill.quad(...c.map(([x, z]) => P(x, z)), [0, 1, 0], [0, 0, 1, 1], c.map(([x, z]) => col(h(x, z)).map(v => v * .55)));
    grid.quad(...c.map(([x, z]) => P(x, z, .004)), [0, 1, 0], [0, 0, 1, 1], c.map(([x, z]) => col(h(x, z)))); }
  const up = (mb, k) => { if (R3[k]) gl.deleteBuffer(R3[k].buf); R3[k] = { buf: gl.createBuffer(), n: mb.v.length / 11 }; gl.bindBuffer(gl.ARRAY_BUFFER, R3[k].buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mb.v), gl.STATIC_DRAW); };
  up(fill, "holoFill"); up(grid, "holoGrid");
  // markers: the planet's missions (coloured by difficulty), a few known hives, and our ship's landing corridor
  const S = SYSTEMS[curSystem()], M = [], spot = (k, rmin, rmax) => { const a = hash2(k, 1, S.seed) * 6.283, r = R * lerp(rmin, rmax, hash2(k, 2, S.seed)); return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; };
  let ms = []; try { ms = systemMissions(curSystem()); } catch {}
  ms.forEach((m, i) => { const [x, z] = spot(i * 7 + 3, .25, .78), d = (m.diff - 1) / 5; M.push({ x, z, col: [1, lerp(.85, .25, d), lerp(.2, .1, d)], h: .26, kind: "mission", seed: m.seed }); });
  for (let k = 0; k < 5; k++) { const [x, z] = spot(100 + k, .3, .9); M.push({ x, z, col: [1, .2, .2], h: .1, kind: "hive" }); }
  const [lx, lz] = spot(999, .82, .86); M.push({ x: lx, z: lz, col: [.35, .7, 1], h: .34, kind: "ship" });
  HOLO.markers = M;
}
function drawHoloMap(t) {
  const gl = R3.gl, L = R3.loc; if (!R3.holoFill) return;
  gl.uniformMatrix4fv(L.uM, false, IDENT); gl.uniform1f(L.uSky, 1); gl.uniform3f(L.uTint, 1, 1, 1);
  gl.uniform1f(L.uDither, 1); gl.bindTexture(gl.TEXTURE_2D, R3.tex.glowWhite); bindVB(R3.holoFill.buf); gl.drawArrays(gl.TRIANGLES, 0, R3.holoFill.n);
  gl.uniform1f(L.uDither, 0); gl.bindTexture(gl.TEXTURE_2D, R3.tex.holoLine); bindVB(R3.holoGrid.buf); gl.drawArrays(gl.TRIANGLES, 0, R3.holoGrid.n);
  // markers: a thin beam up from the ground with a spinning diamond on top
  const m = new MB(), sel = BASE.selected;
  for (const k of HOLO.markers || []) { const gy = HOLO.y0 + holoHeight(k.x, k.z) * HOLO.H, pulse = .75 + .25 * Math.sin(t * 4 + k.x * 9), big = sel && sel.seed === k.seed;
    const hh = k.h * (big ? 1.5 : 1), top = gy + hh + Math.sin(t * 2 + k.z * 7) * .015, w = .007, c = k.col.map(v => v * pulse), s = (k.kind === "hive" ? .028 : .045) * (big ? 1.6 : 1), a = t * 1.6 + k.x * 3;
    m.quad([k.x - w, top, k.z], [k.x + w, top, k.z], [k.x + w, gy, k.z], [k.x - w, gy, k.z], [0, 0, 1], [0, 0, 1, 1], c);
    m.quad([k.x, top, k.z - w], [k.x, top, k.z + w], [k.x, gy, k.z + w], [k.x, gy, k.z - w], [1, 0, 0], [0, 0, 1, 1], c);
    const ring = [0, 1, 2, 3].map(q => [k.x + Math.cos(a + q * 1.571) * s, top, k.z + Math.sin(a + q * 1.571) * s]), T = [k.x, top + s * 1.3, k.z], B2 = [k.x, top - s * 1.3, k.z];
    for (let q = 0; q < 4; q++) { const p0 = ring[q], p1 = ring[(q + 1) % 4], cc = c.map(v => v * (q % 2 ? .75 : 1)); m.tri(T, p0, p1, [0, 1, 0], [0, 0], [1, 0], [1, 1], cc); m.tri(B2, p1, p0, [0, -1, 0], [0, 0], [1, 0], [1, 1], cc.map(v => v * .7)); }
    const gs = s * 1.4; m.quad([k.x - gs, gy + .006, k.z - gs], [k.x + gs, gy + .006, k.z - gs], [k.x + gs, gy + .006, k.z + gs], [k.x - gs, gy + .006, k.z + gs], [0, 1, 0], [0, 0, 1, 1], c.map(v => v * .6)); }
  gl.bindTexture(gl.TEXTURE_2D, R3.tex.glowWhite); gl.bindBuffer(gl.ARRAY_BUFFER, R3.dyn); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), gl.DYNAMIC_DRAW); bindVB(R3.dyn); gl.drawArrays(gl.TRIANGLES, 0, m.v.length / 11);
  gl.uniform1f(L.uSky, 0);
}

// hyperspace: streaks of light rushing past the window, rebuilt each frame around the eye
const STREAKS = Array.from({ length: 360 }, () => ({ a: Math.random() * 6.283, r: 4 + Math.random() ** .6 * 60, z: -Math.random() * 260, c: Math.random() }));
function drawStreaks(eye, J) {
  const gl = R3.gl, L = R3.loc, m = new MB(), len = Math.min(90, J.speed * .09);
  for (const s of STREAKS) { const x = Math.cos(s.a) * s.r, y = Math.sin(s.a) * s.r * .7, w = .12 + s.r * .012, wx = -Math.sin(s.a) * w, wy = Math.cos(s.a) * w * .7;
    const z0 = s.z, z1 = s.z - len, col = s.c < .7 ? [.75, .85, 1] : [.55, .7, 1], P = (dx, dy, z) => [eye[0] + x + dx, eye[1] + y + dy, eye[2] + z];
    m.quad(P(-wx, -wy, z0), P(wx, wy, z0), P(wx, wy, z1), P(-wx, -wy, z1), [0, 0, 1], [0, 0, 1, 1], col); }
  gl.uniformMatrix4fv(L.uM, false, IDENT); gl.uniform1f(L.uSky, 1); gl.uniform3f(L.uTint, 1, 1, 1); gl.bindTexture(gl.TEXTURE_2D, R3.tex.white);
  gl.bindBuffer(gl.ARRAY_BUFFER, R3.dyn); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), gl.DYNAMIC_DRAW); bindVB(R3.dyn); gl.drawArrays(gl.TRIANGLES, 0, m.v.length / 11);
}
function startJump(to) { if (SYSTEMS[to] && SYSTEMS[to].locked) return;
  if (BASE.jump || to === curSystem()) return; BASE.selected = null;
  BASE.jump = { t: 0, to, speed: 0, tint: [1, 1, 1], planetScale: 1, spin: 0, swapped: false, shake: 0 };
  AU.musicDuck(.35); AU.alarm(); AU.rumble(); baseToast("HYPERSPACE JUMP", `Spooling drive · destination ${SYSTEMS[to].name}`, 2.6);
}
function updateJump(dt) {
  const J = BASE.jump; if (!J) return; J.t += dt; const t = J.t;
  for (const s of STREAKS) { s.z += J.speed * dt; if (s.z > 4) { s.z -= 264; s.a = Math.random() * 6.283; } }
  if (t < 1.4) { J.speed = t * t * 25; J.shake = t * .02; J.planetScale = 1 - t * .1; }                        // spool up
  else if (t < 1.75) { if (!J.punch) { J.punch = 1; AU.jet(); AU.boom(1.2, .6); flash(.5, "#bcd8ff"); } J.speed = 900; J.planetScale = 0; J.shake = .06; }   // punch in
  else if (t < 3.9) { J.speed = 900; J.tint = [.35, .5, 1.15]; J.spin += dt * .4; J.shake = .03; }              // the tunnel
  else { if (!J.swapped) { J.swapped = true; const sv = loadSave(); sv.gal.cur = J.to; writeSave(sv); setSkyPlanet(J.to); flash(1, "#ffffff"); AU.boom(1.5, .8); AU.ship(); }
    const k = Math.min(1, (t - 3.9) / 1.3); J.speed = 900 * (1 - k) ** 2; J.tint = [lerp(.35, 1, k), lerp(.5, 1, k), lerp(1.15, 1, k)]; J.planetScale = .55 + .45 * (1 - (1 - k) ** 3); J.shake = .04 * (1 - k);
    if (k >= 1) { BASE.jump = null; AU.musicDuck(1); const S = SYSTEMS[J.to]; baseToast(S.name.toUpperCase(), `Arrived · ${BIOMES[S.biome].name} · threat ${DIFFS[S.threat[0] - 1]}–${DIFFS[S.threat[1] - 1]}`, 4); } }
}
function flash(a, col) { const f = $("flash"); f.style.transition = "none"; f.style.background = col; f.style.opacity = a; requestAnimationFrame(() => { f.style.transition = "opacity .9s"; f.style.opacity = 0; }); }

// ---------- moving around ----------
function baseFree(x, z, r = .26) {
  for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) { const cx = Math.floor(x + dx), cz = Math.floor(z + dz); if (cx < 0 || cz < 0 || cx >= SW || cz >= SH || SHIP[cz][cx] !== ".") return false; }
  for (const [x0, z0, x1, z1] of COLL) if (x + r > x0 && x - r < x1 && z + r > z0 && z - r < z1) return false;
  for (const [cx, cz, cr] of CIRC) if (Math.hypot(x - cx, z - cz) < cr + r) return false;
  return true; }
function updateBase(dt) {
  const B = BASE; B.t += dt; updateJump(dt); batteryTick(dt); if (B.toast) { B.toast.t -= dt; if (B.toast.t <= 0) B.toast = null; }
  if (!$("screen").hidden) return;
  // turning: arrow keys, and when the mouse can't be captured, pushing it against the screen edge
  if (keys.has("arrowleft")) B.a -= 2.2 * dt; if (keys.has("arrowright")) B.a += 2.2 * dt;
  if (!document.pointerLockElement && B.mouseIn) { const ex = mouse.x / stageW; if (ex < .06) B.a -= 2.2 * dt * (1 - ex / .06); if (ex > .94) B.a += 2.2 * dt * ((ex - .94) / .06); }
  let f = 0, s = 0; if (keys.has("w") || keys.has("arrowup")) f++; if (keys.has("s") || keys.has("arrowdown")) f--; if (keys.has("d")) s++; if (keys.has("a")) s--;
  const len = Math.hypot(f, s);
  if (len) { const sp = (keys.has("shift") ? 4.6 : 3) * dt / len, ca = Math.cos(B.a), sa = Math.sin(B.a), dx = (ca * f - sa * s) * sp, dz = (sa * f + ca * s) * sp;
    if (baseFree(B.x + dx, B.z)) B.x += dx; if (baseFree(B.x, B.z + dz)) B.z += dz;
    B.bob += dt * (keys.has("shift") ? 12 : 9); const st = Math.floor(B.bob / Math.PI); if (st !== B.step) { B.step = st; AU.foot("metal", keys.has("shift")); } }
  if (B.talking) { B.talking.t += dt; if (Math.hypot(B.x - B.talking.x, B.z - B.talking.z) > 3.2 || (B.talking.done && B.talking.t > 6)) { B.talking = null; $("bh-talk").hidden = true; } }
  if (typeof updateRange === "function") updateRange(dt);
  const zn = zoneAt(B.z, B.x); if (zn !== B.zone) { if (B.zone) baseToast(...ZONES[zn], 2.2); B.zone = zn; }
  B.near = null; let bd = 9;
  for (const o of INTER) { const d = Math.hypot(o.x - B.x, o.z - B.z), ang = Math.abs(angDiff(B.a, Math.atan2(o.z - B.z, o.x - B.x)));
    if (d < (o.reach || 1.6) && ang < (o.wide || .6) && d < bd) { bd = d; B.near = o; } }
  if (pressed.has("e") && B.near && !DROP) { AU.click(); if (B.near.station === "launch") tryBoardPod(B.near); else if (B.near.station) openStation(B.near.station); else talk(B.near.talk); }
  baseHud();
}
const STATION_LABEL = { war: ["War Table", "Travel to another system"], armory: ["Armory Terminal", "Change your loadout"], shop: ["Quartermaster", "Buy weapons, armor, stratagems"], eng: ["Engineering Console", "Ship upgrades"], launch: ["Starfall Pod", "Choose an operation and drop"], records: ["Service Record", "Your career so far"] };
const CHATTER = {
  navigator: ["\"Course plotted whenever you are, trooper. War table's right behind me.\"", "\"Hold Q and punch the code. Then throw the beacon. Don't stand on it.\"", "\"Chargers can't turn worth a damn. Dive sideways.\""],
  comms: ["\"Bug breaches start with one scout screaming. Kill the screamer.\"", "\"Samples go to Engineering. They've been begging.\"", "\"Ion storms knock our uplink out. Twenty seconds, give or take.\""],
};
// crew chatter: a dialogue box with their face, the line typed out with a voice
function talk(who) { const lines = CHATTER[who]; BASE.talkI = ((BASE.talkI || 0) + 1) % lines.length; const text = lines[BASE.talkI];
  const at = INTER.find(o => o.talk === who); BASE.talking = { who, x: at.x, z: at.z, t: 0, done: false };
  $("bh-talkname").textContent = who === "navigator" ? "NAVIGATOR · LT. ODEN" : "COMMS · SPC. REYES";
  const pic = $("bh-talkpic"); pic.innerHTML = ""; const T = SP.soldier0 || SP.crew1; if (T) pic.appendChild(texCanvas(T));
  $("bh-talk").hidden = false; typeLine($("bh-talktext"), text, VOICES[who], () => { if (BASE.talking) BASE.talking.done = true; }); }
function baseToast(big, small = "", t = 3.5) { BASE.toast = { big, small, t }; }
function baseHud() {
  const B = BASE, sv = loadSave(), S = SYSTEMS[curSystem()];
  setH("bh-res", `<span>REQ<b>${sv.req}</b></span><span>SAMPLES<b>${sv.samples}</b></span>`);
  const lo = sv.lo; setH("bh-lo", `<div class="k">LOADOUT</div><div class="w">${(WEAPONS[lo.w] || WEAPONS.rifle).name}</div><div class="a">${(ARMORS[lo.a] || ARMORS.medium).name}</div>
    <div class="st">${[0, 1, 2, 3].map(i => { const k = lo.s[i], St = STRATS[k]; return St ? `<span class="${St.kind}" title="${St.name}">${stratIc(k)}</span>` : `<span class="empty">·</span>`; }).join("")}</div>`);
  const m = DROP && B.selected;   // operations are picked at the pod, so this only shows once you're boarding
  setH("bh-course", m ? `<div class="k"><i style="color:${S.col};background:${S.col}"></i>MISSION SELECTED</div><h5>${m.region}</h5><small>${m.planet} · ${OBJS[m.obj].name}</small>
      <div class="pips">${DIFFS.map((_, i) => `<i class="${i < m.diff ? "f" : ""}"></i>`).join("")}</div><small>${DIFFS[m.diff - 1]}${m.mods.length ? " · " + m.mods.map(k => MODS[k].name).join(", ") : ""}</small>
      <div class="next">Next: <b>board a Starfall pod</b> in the Launch Bay</div>`
    : `<div class="k"><i style="color:${S.col};background:${S.col}"></i>${B.jump ? "IN HYPERSPACE" : "IN ORBIT"}</div><h5>${(B.jump ? SYSTEMS[B.jump.to] : S).name}</h5><small>${BIOMES[(B.jump ? SYSTEMS[B.jump.to] : S).biome].name} · threat ${DIFFS[(B.jump ? SYSTEMS[B.jump.to] : S).threat[0] - 1]}–${DIFFS[(B.jump ? SYSTEMS[B.jump.to] : S).threat[1] - 1]}</small>
      <div class="next">${B.jump ? "Hold on to something." : "Next: <b>choose an operation</b> at a Starfall pod in the Launch Bay"}</div>`);
  $("bh-ret").classList.toggle("on", !!B.near || RANGE.up > .5); if (typeof rangeHud === "function") rangeHud();
  setH("bh-music", AU.musicOn ? "♪ MUSIC ON" : "♪ MUSIC OFF"); $("bh-music").classList.toggle("on", AU.musicOn);
  const n = B.talking ? null : B.near; show("bh-prompt", !!n); if (n) { const Lb = n.who === "armorer" ? ["Sgt. Vika Rho", "Armorer · change your loadout"] : n.who === "engineer" ? ["Chief Engineer", "Ship upgrades"] : n.station ? STATION_LABEL[n.station] : [n.talk === "navigator" ? "Navigator" : "Comms Officer", "Talk"]; setH("bh-prompt", `<span class="key">E</span><div><b>${Lb[0]}</b><small>${Lb[1]}</small></div>`); }
  const tt = B.toast; $("bh-room").style.opacity = tt ? Math.min(1, tt.t * 2) : 0; if (tt) setH("bh-room", `${tt.big}<small>${tt.small}</small>`);
  const locked = document.pointerLockElement === R3.cv; show("bh-lock", !locked);
  setH("bh-lock", B.noLock ? "MOVE THE MOUSE TO LOOK · PUSH AGAINST THE SCREEN EDGE TO KEEP TURNING" : "CLICK TO CAPTURE THE MOUSE · OR JUST MOVE IT TO LOOK");
}

// ---------- entering, leaving, mouse look ----------
function enterBase(fromMission) {
  MODE = "base"; G = null;
  if (!R3.gl && !initGL()) { alert("WebGL is not available in this browser."); return; }
  if (!BASE.built) { buildTextures(); buildSprites(); uploadTextures(); buildShip(); }
  setTimeout(() => { try { applyArmorTint(); } catch (_) {} }, 1500);
  if (fromMission) Object.assign(BASE, { x: 7, z: 14.4, a: -Math.PI / 2, pitch: 0, zone: "" }); else if (!BASE.entered) Object.assign(BASE, { x: 7, z: 10.5, a: -Math.PI / 2, pitch: 0, zone: "" });
  BASE.entered = true; if (BASE.built) buildHoloMap(); AU.setSpace("in"); AU.lobbyStart(); glResize(); R3.cv.style.display = "block"; cv.style.visibility = "hidden";
  $("screen").hidden = true; $("screen").classList.remove("over"); $("hud").hidden = true; $("pause").hidden = true; $("basehud").hidden = false;
  for (const k of ["bh-res", "bh-course", "bh-prompt", "bh-room", "bh-lock"]) delete hudCache[k];
  baseToast(fromMission ? "WELCOME BACK" : "ABOARD THE SHIP", fromMission ? "Rewards are in. Spend them." : "Move the mouse to look · WASD to walk · E to use", 3.5);
}
function leaveBase() { AU.lobbyStop(); $("basehud").hidden = true; $("bh-talk").hidden = true; BASE.talking = null; if (R3.cv) R3.cv.style.display = "none"; cv.style.visibility = ""; if (document.pointerLockElement) document.exitPointerLock(); }
function backToBase() { NPC_SAID = {}; document.querySelectorAll(".npctext").forEach(el => clearInterval(el._tw)); $("screen").hidden = true; $("screen").classList.remove("over"); $("basehud").hidden = false; pressed.delete("e"); BASE.skipMove = true; }
function tryLock() { if (BASE.noLock || !R3.cv || !R3.cv.requestPointerLock) { BASE.noLock = true; return; } try { const r = R3.cv.requestPointerLock(); if (r && r.catch) r.catch(() => { BASE.noLock = true; }); } catch { BASE.noLock = true; } }
addEventListener("mousedown", e => { if (MODE === "base" && $("screen").hidden && e.target === R3.cv && document.pointerLockElement !== R3.cv) tryLock(); });
document.addEventListener("pointerlockchange", () => { if (!document.pointerLockElement) BASE.unlockT = performance.now(); });
document.addEventListener("pointerlockerror", () => { BASE.noLock = true; });
// mouse look works with or without a captured cursor: we read the raw movement either way
addEventListener("mousemove", e => {
  if (MODE !== "base" || !$("screen").hidden) return; BASE.mouseIn = true;
  if (BASE.skipMove) { BASE.skipMove = false; return; }
  const dx = clamp(e.movementX || 0, -120, 120), dy = clamp(e.movementY || 0, -120, 120);
  BASE.a += dx * .0024; BASE.pitch = clamp(BASE.pitch - dy * .0024, -1.2, 1.2);
});
document.addEventListener("mouseleave", () => { BASE.mouseIn = false; });
addEventListener("keydown", e => {
  if (MODE !== "base") return; const k = e.key.toLowerCase();
  if (!$("screen").hidden && (k === "escape" || k === "e")) { backToBase(); pressed.delete("e"); e.preventDefault(); return; }
  if ($("screen").hidden && k === "m") { AU.init(); AU.toggleMusic(); return; }
  if ($("screen").hidden && k === "escape" && !document.pointerLockElement && performance.now() - BASE.unlockT > 400) openStation("menu");
});
