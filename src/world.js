// =====================================================================================
//  MISSIONS & PLANETS: a mission is a seed + rules (biome, enemy, difficulty, modifiers,
//  objective). The same seed always builds the same planet.
// =====================================================================================
const TS = 16, MW = 140, MH = 140;
const BIOMES = {
  desert:   { name: "Desert", g: [[201, 164, 108], [188, 150, 94], [214, 180, 126]], rock: [[156, 104, 60], [110, 70, 38], [198, 144, 90]], deco: ["pebble", "bone", "scrub"], sky: "#e8c47a" },
  swamp:    { name: "Toxic Swamp", g: [[62, 90, 50], [50, 76, 42], [78, 104, 58]], rock: [[66, 76, 62], [40, 48, 40], [100, 114, 90]], deco: ["fern", "shroom", "pebble"], water: [38, 70, 62], sky: "#7ab070" },
  arctic:   { name: "Frozen Waste", g: [[214, 224, 232], [198, 212, 224], [230, 238, 244]], rock: [[124, 144, 164], [86, 102, 122], [176, 196, 212]], deco: ["pebble", "ice"], sky: "#c8dcf0" },
  volcanic: { name: "Ash Fields", g: [[66, 60, 60], [56, 50, 52], [78, 72, 70]], rock: [[104, 88, 84], [44, 34, 36], [128, 110, 100]], deco: ["ember", "pebble", "bone"], lava: true, sky: "#d0603a" },
};
const ENEMIES = { bugs: { name: "Terminids", short: "Bugs" }, humans: { name: "Skull Company mercenaries", short: "Mercs" } };
const MODS = {
  fog:          { name: "Dense Fog", desc: "Visibility is greatly reduced." },
  ion:          { name: "Ion Storms", desc: "Stratagems go offline for 20 s at a time." },
  meteor:       { name: "Meteor Showers", desc: "Meteors strike the surface at random." },
  heat:         { name: "Intense Heat", desc: "Stamina recovers slowly.", biomes: ["desert", "volcanic"] },
  cold:         { name: "Extreme Cold", desc: "Reloading takes longer.", biomes: ["arctic"] },
  spores:       { name: "Spore Clouds", desc: "The minimap is scrambled.", biomes: ["swamp"] },
  rain:         { name: "Heavy Rain", desc: "A downpour cuts visibility and drowns out your footsteps: enemies spot you later.", biomes: ["swamp"] },
  swarm:        { name: "Heavy Infestation", desc: "More nests and larger patrols." },
  interference: { name: "Atmospheric Interference", desc: "Stratagem cooldowns +50%." },
};
const OBJS = {
  purge:    { name: "Purge the Hive", foe: "bugs", desc: "Destroy every bug hole in the main hive. Holes only break to explosives: grenades and stratagems." },
  sabotage: { name: "Sabotage the Command Post", foe: "humans", desc: "Destroy the generator, the comms array and the ammo dump at the mercenary command post. Plant a charge (E) or use explosives." },
  hvt:      { name: "Eliminate the Warlord", foe: "humans", desc: "The mercenary warlord is dug in at his command post with his bodyguards. Take him down." },
  officer:  { name: "Assassinate the Officer", foe: "humans", desc: "A Skull Company officer is doing the rounds of the camps with an escort. She's unarmed and runs for another camp the moment the alarm goes up. Quiet approach recommended." },
  uplink:   { name: "Restore the Uplink", desc: "Enter the code at the comms terminal, then hold the area while it uploads." },
  defend:   { name: "Hold the Line", special: true, desc: "The enemy is counter-attacking a liberated world. Switch on the colony relay and hold it against wave after wave until the evacuation is done." },
  blackbox: { name: "Recover the Black Box", desc: "Find the downed shuttle and carry its black box to extraction." },
};
const DIFFS = ["Trivial", "Easy", "Medium", "Challenging", "Hard", "Extreme"];
const SYL_A = ["Vel", "Kor", "Ash", "Myr", "Tal", "Oro", "Zen", "Hel", "Var", "Cy", "Pro", "Ur", "Eri", "Nox", "Sel", "Tur", "Bra"], SYL_B = ["dra", "ion", "os", "ax", "eth", "una", "ari", "ok", "eon", "ys", "ith", "ova"], SYL_C = [" Prime", " IV", " VII", " Minor", "", " II", "", " Major"];

function genMission(diff, seed = Math.floor(Math.random() * 1e9), opt = {}) {
  R = seeded(Math.imul(seed ^ 0x5bd1e995, 0x27d4eb2d)); R(); R();
  const rolled = pick(Object.keys(BIOMES)), biome = opt.biome || rolled, pool = Object.keys(MODS).filter(k => !MODS[k].biomes || MODS[k].biomes.includes(biome));
  const nMods = diff <= 1 ? randi(0, 1) : diff <= 3 ? randi(1, 2) : randi(2, 3), mods = [];
  while (mods.length < nMods && pool.length) mods.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  const enemy = opt.enemy || (typeof foeMode === "function" && foeMode() === "human" ? "humans" : "bugs"), objs = Object.keys(OBJS).filter(k => !OBJS[k].special && (!OBJS[k].foe || OBJS[k].foe === enemy));
  const m = { seed, diff, biome, enemy, mods, obj: pick(objs), planet: pick(SYL_A) + pick(SYL_B) + pick(SYL_C), sector: "Sector " + pick(["Umlaut", "Sten", "Iptus", "Draco", "Marspira", "Ferris"]) };
  m.region = pick(["Ashfall Basin", "Crater Fields", "Hollow Ridge", "Shale Flats", "Ironroot Valley", "Saltglass Plain", "Brokenback Mesa", "The Sinks", "Ember Trench", "Vanta Gorge", "Mirrow Delta", "Cold Spur"]);
  if (opt.planet) m.planet = opt.planet; Object.assign(m, opt.extra || {});
  m.reward = 80 + diff * 60 + mods.length * 25;
  R = Math.random; return m;
}
const hasMod = (m, k) => m.mods.includes(k);

// ---------- building the planet ----------
function buildMap(m) {
  R = seeded(m.seed + 17); const B = BIOMES[m.biome], s = m.seed % 9973;
  const N = MW * MH, solid = new Uint8Array(N), water = new Uint8Array(N), idx = (x, y) => y * MW + x;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = idx(x, y);
    if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) { solid[i] = 1; continue; }
    const edge = Math.min(x, y, MW - 1 - x, MH - 1 - y), n = fbm(x / 9, y / 9, s) + (edge < 6 ? (6 - edge) * .05 : 0);
    if (n > .63) solid[i] = 1;
    else if (B.water && fbm(x / 13 + 40, y / 13, s + 5) < .3) water[i] = 1;
  }
  // points of interest: drop on one side, extraction on the other, objective near the middle
  const side = randi(0, 3), edgePt = (sd, d) => { const a = randi(20, MW - 21); return sd === 0 ? { x: a, y: d } : sd === 1 ? { x: MW - 1 - d, y: a } : sd === 2 ? { x: a, y: MH - 1 - d } : { x: d, y: a }; };
  const start = edgePt(side, 14), ext = edgePt((side + 2) % 4, 14), obj = { x: randi(MW / 2 - 22, MW / 2 + 22), y: randi(MH / 2 - 22, MH / 2 + 22) };
  const far = (p, list, d) => list.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= d);
  const nests = [], nNests = 3 + Math.floor(m.diff / 2) + (hasMod(m, "swarm") ? 2 : 0);
  for (let tries = 0; tries < 400 && nests.length < nNests; tries++) { const p = { x: randi(12, MW - 13), y: randi(12, MH - 13) }; if (far(p, [start], 30) && far(p, [obj, ext], 20) && far(p, nests, 22)) nests.push(p); }
  // paths between the points, so every one of them can be reached
  const carve = (a, b, w = 2) => { let x = a.x, y = a.y; for (let k = 0; k < 600; k++) { const dx = b.x - x, dy = b.y - y; if (Math.abs(dx) + Math.abs(dy) < 2) break;
      if (R() < .55 ? Math.abs(dx) > Math.abs(dy) : R() < .5) x += Math.sign(dx) || 1; else y += Math.sign(dy) || 1;
      for (let oy = -w; oy <= w; oy++) for (let ox = -w; ox <= w; ox++) { const xx = clamp(x + ox, 2, MW - 3), yy = clamp(y + oy, 2, MH - 3); solid[idx(xx, yy)] = 0; } } };
  carve(start, obj); carve(obj, ext); nests.forEach(n => carve(n, R() < .5 ? obj : start, 1));
  const clearC = (p, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) { const xx = p.x + x, yy = p.y + y; if (xx > 1 && yy > 1 && xx < MW - 2 && yy < MH - 2) { solid[idx(xx, yy)] = 0; water[idx(xx, yy)] = 0; } } };
  clearC(start, 6); clearC(ext, 7); clearC(obj, m.obj === "purge" ? 9 : 7); nests.forEach(n => clearC(n, 5));
  // anything not reachable from the drop zone becomes rock
  const seen = new Uint8Array(N), q = [idx(start.x, start.y)]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % MW, y = (i / MW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = idx(x + dx, y + dy); if (!seen[j] && !solid[j]) { seen[j] = 1; q.push(j); } } }
  for (let i = 0; i < N; i++) if (!solid[i] && !seen[i]) { solid[i] = 1; water[i] = 0; }
  // samples: tucked near rocks
  const samples = []; for (let tries = 0; tries < 2000 && samples.length < 12; tries++) { const x = randi(4, MW - 5), y = randi(4, MH - 5), i = idx(x, y); if (solid[i] || water[i]) continue;
    let rocks = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) rocks += solid[idx(x + dx, y + dy)]; if (rocks && far({ x, y }, [start], 15) && far({ x, y }, samples, 14)) samples.push({ x, y }); }

  // ---------- paint the whole surface once, pixel by pixel ----------
  const PW = MW * TS, PH = MH * TS, cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
  const g = cv.getContext("2d"), im = g.createImageData(PW, PH), D = im.data;
  // smooth fields sampled at tile centres, blended per pixel: organic shapes from a tile grid
  const tcol = new Float32Array(N), rcol = new Float32Array(N), sf = new Float32Array(N), wf = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = i % MW, y = (i / MW) | 0; tcol[i] = fbm(x / 5, y / 5, s + 20); rcol[i] = fbm(x / 3, y / 3, s + 31); sf[i] = solid[i]; wf[i] = water[i]; }
  const bil = (F, px, py) => { const fx = px / TS - .5, fy = py / TS - .5, x0 = clamp(Math.floor(fx), 0, MW - 2), y0 = clamp(Math.floor(fy), 0, MH - 2), u = clamp(fx - x0, 0, 1), v = clamp(fy - y0, 0, 1), i = y0 * MW + x0;
    return (F[i] * (1 - u) + F[i + 1] * u) * (1 - v) + (F[i + MW] * (1 - u) + F[i + MW + 1] * u) * v; };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - .5);   // ordered dither
  const mask = new Uint8Array(PW * PH);   // 0 ground, 1 rock, 2 water
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) { const j = hash2(px >> 1, py >> 1, s);
    const v = bil(sf, px, py) + (j - .5) * .22; if (v > .5) { mask[py * PW + px] = 1; continue; }
    if (B.water && bil(wf, px, py) + (j - .5) * .15 > .5) mask[py * PW + px] = 2; }
  const M = (x, y) => x < 0 || y < 0 || x >= PW || y >= PH ? 1 : mask[y * PW + x], FACE = 7;
  const put = (o, c, k) => { D[o] = c[0] * k; D[o + 1] = c[1] * k; D[o + 2] = c[2] * k; D[o + 3] = 255; };
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    const o = (py * PW + px) * 4, mk = mask[py * PW + px], sp = hash2(px, py, s + 3), d = BAY[(py & 3) * 4 + (px & 3)];
    if (mk === 1) {
      let below = 0; for (let k = 1; k <= FACE; k++) if (M(px, py + k) !== 1) { below = k; break; }
      if (below) {   // cliff face toward the viewer, with vertical streaks
        const streak = hash2(px >> 1, 77, s) * .25, k = .62 + (below / FACE) * .18 - streak * .5 + (sp - .5) * .06;
        put(o, B.rock[1], k * 1.35); if (below === 1) put(o, B.rock[1], .7);
        continue; }
      const top = M(px, py - 1) !== 1 || M(px - 1, py) !== 1 || M(px + 1, py) !== 1;
      const t = bil(rcol, px, py) + d * .12, c = t < .42 ? B.rock[1] : t < .58 ? B.rock[0] : B.rock[2];
      put(o, c, top ? 1.28 : (c === B.rock[1] ? 1.25 : 1) + (sp - .5) * .08 + (sp > .985 ? .2 : 0));
    } else if (mk === 2) {
      const edge = M(px, py - 1) !== 2 || M(px, py + 1) !== 2 || M(px - 1, py) !== 2 || M(px + 1, py) !== 2;
      const wave = Math.sin(px * .35 + Math.sin(py * .2) * 2) > .92 && (py % 5 === 0);
      put(o, B.water, edge ? 1.45 : wave ? 1.25 : 1 + (sp - .5) * .05);
    } else {
      const t = bil(tcol, px, py) + d * .1, c = t < .44 ? B.g[1] : t > .58 ? B.g[2] : B.g[0];
      let k = 1 + (sp - .5) * .07 + (sp > .992 ? -.22 : sp < .006 ? .15 : 0);
      if (M(px - 2, py - 3) === 1 || M(px - 1, py - 2) === 1) k *= .72;   // shadow cast down-right by rock
      put(o, c, k);
    } }
  g.putImageData(im, 0, 0);
  // little props scattered on open ground
  const DECO = {
    pebble: () => pixArt(5, 4, (x, y) => ((x - 2) / 2.4) ** 2 + ((y - 1.5) / 1.8) ** 2 <= 1 ? (y < 2 ? "#a49c90" : "#7a7266") : null, null),
    bone: () => pixArt(9, 5, (x, y) => (y === 2 && x > 0 && x < 8) || ((x <= 1 || x >= 7) && y >= 1 && y <= 3) ? "#e6dcc4" : null),
    scrub: () => { const sd = Math.random() * 999; return pixArt(10, 8, (x, y) => { const d = ((x - 4.5) / 4.5) ** 2 + ((y - 4) / 3.6) ** 2; return d <= 1 && hash2(x, y, sd) < .7 - d * .4 ? (y < 3 ? "#a8a060" : y < 6 ? "#8a8248" : "#6a6434") : null; }); },
    fern: () => pixArt(11, 9, (x, y) => { const d = Math.abs(y - 4.5) < 1 || Math.abs(x - 5) < 1 || Math.abs(x - 5 - (y - 4.5)) < .8 || Math.abs(x - 5 + (y - 4.5)) < .8; return d && ((x - 5) ** 2 + (y - 4.5) ** 2 < 22) ? (y < 4 ? "#7ab84a" : "#4e8a32") : null; }),
    shroom: () => pixArt(7, 7, (x, y) => y < 4 ? (((x - 3) / 3) ** 2 + ((y - 3) / 2.5) ** 2 <= 1 ? (y < 2 ? "#c8e05a" : "#9ab83a") : null) : (x >= 2 && x <= 4 ? "#d8d0b0" : null)),
    ice: () => pixArt(6, 8, (x, y) => Math.abs(x - 2.5) * 1.6 + Math.abs(y - 3.5) < 4 ? (x < 3 ? "#cfeaff" : "#6aa6d0") : null, "#3a5a78"),
    ember: () => pixArt(5, 5, (x, y) => Math.abs(x - 2) + Math.abs(y - 2) < 2.5 ? ((x + y) % 2 ? "#ff8a2a" : "#ffd04a") : null, "#3a1a10"),
  };
  const decoC = B.deco.map(k => [DECO[k](), DECO[k]()]);
  for (let n = 0; n < N * .022; n++) { const x = randi(2, MW - 3), y = randi(2, MH - 3), i = idx(x, y); if (solid[i] || water[i]) continue;
    const d = pick(pick(decoC)), dx = x * TS + randi(0, TS - d.width), dy = y * TS + randi(0, TS - d.height);
    if (M(dx, dy) || M(dx + d.width, dy + d.height) || M(dx + d.width, dy) || M(dx, dy + d.height)) continue; g.drawImage(d, dx, dy); }
  if (B.lava) { g.lineWidth = 1; for (let n = 0; n < 90; n++) { let x = randi(4, MW - 5) * TS, y = randi(4, MH - 5) * TS; if (M(x, y)) continue;
      g.strokeStyle = "rgba(20,10,8,.8)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += randi(-5, 5); y += randi(-5, 5); g.lineTo(x, y); } g.stroke();
      g.lineWidth = 1; g.strokeStyle = "rgba(255,110,30,.9)"; g.stroke(); } }
  // hive creep around the nests (and the main hive)
  const creep = (p, r) => { for (let k = 0; k < 40; k++) { const a = R() * 6.283, d = R() * r * TS; g.fillStyle = `rgba(${m.biome === "arctic" ? "90,70,60" : "50,32,20"},${.12 + R() * .12})`;
      g.beginPath(); g.arc(p.x * TS + 8 + Math.cos(a) * d, p.y * TS + 8 + Math.sin(a) * d, 6 + R() * 18, 0, 7); g.fill(); } };
  nests.forEach(n => creep(n, 4)); if (m.obj === "purge") creep(obj, 7);
  // minimap: one pixel per tile
  const mini = document.createElement("canvas"); mini.width = MW; mini.height = MH; const mg = mini.getContext("2d"), mi = mg.createImageData(MW, MH);
  for (let i = 0; i < N; i++) { const c = solid[i] ? [18, 18, 18] : water[i] ? [40, 80, 96] : B.g[0].map(v => v * .5 + 50); mi.data.set([...c, 255], i * 4); }
  mg.putImageData(mi, 0, 0);
  R = Math.random;
  return { solid, water, canvas: cv, g, mini, start, ext, obj, nests, samples, B };
}
// a tiny painted thumbnail for the mission board
function planetThumb(m, w = 320, h = 120) {
  const c = document.createElement("canvas"); c.width = w / 4; c.height = h / 4; const g = c.getContext("2d"), B = BIOMES[m.biome], s = m.seed % 9973;
  const im = g.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const n = fbm(x / 7, y / 7, s), o = (y * c.width + x) * 4, col = n > .63 ? B.rock[0] : B.water && fbm(x / 10 + 40, y / 10, s + 5) < .3 ? B.water : B.g[n < .45 ? 1 : 0];
    im.data.set([...col, 255], o); }
  g.putImageData(im, 0, 0); return c;
}
