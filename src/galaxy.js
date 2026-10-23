// =====================================================================================
//  THE GALAXY: three star systems, each a planet with its own biome, threat range and missions.
//  The war table shows the map; jumping between systems plays the hyperdrive on the bridge.
// =====================================================================================
const SYSTEMS = [
  { name: "Velion Prime", star: "Velion", biome: "desert", style: "desert", threat: [1, 3], pos: [62, 118], col: "#d89a4a", seed: 1101, enemy: "bugs",
    desc: "Dusty frontier world on the edge of the sector. Light infestation. A good place to cut your teeth." },
  { name: "Myrrh IV", star: "Myrrh", biome: "swamp", style: "swamp", threat: [1, 4], pos: [150, 70], col: "#5aa070", seed: 2203, enemy: "humans",
    desc: "Toxic jungle choked with spore clouds. The colony went quiet; Skull Company mercenaries hold it now, dug into camps under the canopy." },
  { name: "Kryos Minor", star: "Kryos", biome: "arctic", style: "arctic", threat: [4, 6], pos: [262, 124], col: "#b8d8f0", seed: 3307, ring: true, locked: true, enemy: "bugs",
    desc: "Frozen world wrapped in an ice ring. The oldest, deepest hives in the sector. Bring friends. You have none." },
  // Myrrh IV's sister world: the same toxic jungle, but nobody holds it. The bugs got there first.
  { name: "Myrrh V", star: "Myrrh", biome: "swamp", style: "swamp", threat: [2, 5], pos: [204, 34], col: "#4f9a86", seed: 2209, enemy: "bugs",
    desc: "Myrrh IV's sister world, wetter and darker. Never colonised: the bugs have it to themselves, and the hives spread under every root." },
];
const firstOpen = () => Math.max(0, SYSTEMS.findIndex(s => !s.locked));
const curSystem = () => { try { const c = clamp(loadSave().gal.cur | 0, 0, SYSTEMS.length - 1); return SYSTEMS[c].locked ? firstOpen() : c; } catch { return firstOpen(); } };
function systemMissions(i) {
  const S = SYSTEMS[i], slots = loadSave().gal.slots[i] || [0, 0, 0, 0], [a, b] = S.threat;
  return slots.map((gen, k) => { const diff = Math.round(a + (b - a) * k / 3), seed = (S.seed * 7919 + k * 104729 + gen * 15485863) >>> 0;
    return genMission(diff, seed, { biome: S.biome, planet: S.name, enemy: S.enemy, extra: { sys: i, slot: k } }); }).concat(warInit(loadSave()).planets[i].attack ? [defendMission(i)] : []);
}

// ---------- the war table ----------
let GAL_SEL = null;
function showBoard() {
  const cur = curSystem(); if (GAL_SEL == null) GAL_SEL = cur;
  const S = SYSTEMS[GAL_SEL], here = GAL_SEL === cur, sv = loadSave(), jumping = !!BASE.jump;
  const ms = systemMissions(GAL_SEL);
  const px = v => (v / 320 * 100).toFixed(2) + "%", py = v => (v / 180 * 100).toFixed(2) + "%", right = S.pos[0] > 170;
  // the map fills the width; each world carries a small tag, and the selected one gets an info card beside it
  const tags = SYSTEMS.map((s, i) => `<div class="galtag ${s.locked ? "lk" : ""} ${i === cur ? "cur" : ""}" style="left:${px(s.pos[0])};top:${py(s.pos[1] + 14)}"><b>${i === cur ? "◆ " : ""}${s.name}</b><span>${s.locked ? "🔒 LOCKED" : `${ENEMIES[s.enemy].short.toUpperCase()} · ${DIFFS[s.threat[0] - 1]}–${DIFFS[s.threat[1] - 1]}`}</span>${s.locked ? "" : (() => { const P = warInit(sv).planets[i]; return `<span class="tl">${libBar(P, 64)} ${P.freed ? "FREE" : Math.floor(P.lib) + "%"}</span>${P.attack ? `<span class="atk">⚠ UNDER ATTACK · ${P.attack.left}</span>` : ""}`; })()}</div>`).join("");
  const status = S.locked ? `<div class="gs lk">🔒 LOCKED · NOT YET AVAILABLE</div>`
    : here ? `<div class="gs on">◆ IN ORBIT · ${ms.length} OPERATIONS AT THE LAUNCH BAY</div>`
    : `<button class="btn" id="jump" ${jumping ? "disabled" : ""}>${jumping ? "DRIVE BUSY" : "HYPERJUMP TO " + S.name.toUpperCase()}</button><div class="gsub">${ms.length} operations open · launch them from the Starfall pods once in orbit</div>`;
  const card = `<div class="galcard" style="--c:${S.col}">
      <div class="lbl">${here ? "CURRENT ORBIT" : S.locked ? "UNCHARTED" : "SYSTEM " + S.star.toUpperCase()}</div><h3>${S.name}</h3>
      <div class="meta">${BIOMES[S.biome].name} · ${S.locked ? "Unknown" : ENEMIES[S.enemy].name} · Threat ${DIFFS[S.threat[0] - 1]}–${DIFFS[S.threat[1] - 1]}</div>
      <p>${S.locked ? "Our scouts haven't charted this world yet. Liberate two worlds and Command will chart it." : S.desc}</p>
      ${S.locked ? "" : (() => { const P = warInit(sv).planets[GAL_SEL], unl = Object.entries(CLASSIFIED).filter(([k, i]) => i === GAL_SEL).map(([k]) => gearName(k)); return `<div class="libline">${libBar(P, 180)} <b>${P.freed ? "LIBERATED" : "LIBERATION " + Math.floor(P.lib) + "%"}</b></div>${P.attack ? `<div class="atk2">⚠ COUNTER-ATTACK · defend within ${P.attack.left} operation${P.attack.left > 1 ? "s" : ""} or it falls</div>` : ""}${unl.length ? `<div class="gsub">${P.ever ? "Declassified" : "Liberate to declassify"}: ${unl.join(", ")}</div>` : ""}`; })()}${status}</div>`;
  const worlds = SYSTEMS.map((s, i) => { const P = warInit(sv).planets[i]; return `<button class="gw ${i === GAL_SEL ? "on" : ""} ${s.locked ? "lk" : ""}" data-i="${i}" style="--c:${s.col}"><b>${i === cur ? "◆ " : ""}${s.name}</b><span>${s.locked ? "🔒 uncharted" : `${libBar(P, 70)} ${P.freed ? "FREE" : Math.floor(P.lib) + "%"}${P.attack ? ` <em>⚠</em>` : ""}`}</span></button>`; }).join("");
  const ops = S.locked ? "" : `<div class="kicker">OPERATIONS ON ${S.name.toUpperCase()}</div>${ms.map(m => `<div class="gop ${m.defend ? "def" : ""}"><b>${m.region}</b><span>${OBJS[m.obj].name}</span><small>${DIFFS[m.diff - 1]}</small></div>`).join("")}`;
  screen(`<div class="wrap wide fill"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><h2 class="logo" style="font-size:40px">WAR TABLE</h2><p class="tag" style="margin:6px 0 0">Sector Draco · ${SYSTEMS.filter(s => !s.locked).length} of ${SYSTEMS.length} worlds open · click a world to inspect it</p></div>
      <div class="row">${rankBadge(sv)}<span class="reqline">REQ <b>${sv.req}</b> · SAMPLES <b>${sv.samples}</b></span><button class="btn ghost" id="back" style="padding:8px 14px;font-size:12px">LEAVE TABLE [E]</button></div></div>
    <div class="galgrid"><div class="galarea"><div class="galwrap"><canvas id="galmap" width="320" height="180"></canvas>${tags}</div></div>
      <div class="galside">${card}<section class="frame"><div class="kicker">SECTOR DRACO</div><div class="gws">${worlds}</div>${ops}</section></div></div></div>`);
  $("back").onclick = backToBase; document.querySelectorAll(".gw").forEach(b => b.onclick = () => { GAL_SEL = +b.dataset.i; AU.click(); showBoard(); });
  if ($("jump")) $("jump").onclick = () => { backToBase(); startJump(GAL_SEL); };
  drawGalaxy(); const cvm = $("galmap");
  cvm.onclick = e => { const r = cvm.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 320, y = (e.clientY - r.top) / r.height * 180;
    SYSTEMS.forEach((s, i) => { if (Math.hypot(s.pos[0] - x, s.pos[1] - y) < 22) { GAL_SEL = i; AU.click(); showBoard(); } }); };
  cancelAnimationFrame(showBoard.raf); const loop = () => { if (!$("galmap")) return; drawGalaxy(); showBoard.raf = requestAnimationFrame(loop); }; loop();
}
// the map: a pixel starfield, nebula, hyperlanes and the three planets drawn as little lit spheres
let GAL_BG = null;
function drawGalaxy() {
  const c = $("galmap"); if (!c) return; const g = c.getContext("2d"), t = performance.now() / 1000, cur = curSystem();
  if (!GAL_BG) { GAL_BG = document.createElement("canvas"); GAL_BG.width = 320; GAL_BG.height = 180; const bg = GAL_BG.getContext("2d"), im = bg.createImageData(320, 180);
    for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const n = fbm(x / 40, y / 26, 41), arm = Math.exp(-((((y - 90) - Math.sin(x / 50) * 30) / 30) ** 2)), o = (y * 320 + x) * 4;
      const k = Math.max(0, n - .4) * 1.6 * (.4 + arm); im.data[o] = 8 + k * 90; im.data[o + 1] = 8 + k * 40; im.data[o + 2] = 20 + k * 120; im.data[o + 3] = 255;
      const h = hash2(x, y, 77); if (h > .992 - arm * .01) { const v = 120 + h * 130; im.data[o] = v; im.data[o + 1] = v; im.data[o + 2] = v + 10; } }
    bg.putImageData(im, 0, 0); }
  g.imageSmoothingEnabled = false; g.drawImage(GAL_BG, 0, 0);
  // hyperlanes
  g.fillStyle = "rgba(242,210,48,.45)"; for (let i = 0; i < SYSTEMS.length; i++) for (let j = i + 1; j < SYSTEMS.length; j++) { if (SYSTEMS[i].locked || SYSTEMS[j].locked) continue; const [ax, ay] = SYSTEMS[i].pos, [bx, by] = SYSTEMS[j].pos, n = Math.hypot(bx - ax, by - ay) / 4;
    for (let k = 0; k < n; k++) if ((k + Math.floor(t * 6)) % 3 === 0) g.fillRect(Math.round(lerp(ax, bx, k / n)), Math.round(lerp(ay, by, k / n)), 1, 1); }
  SYSTEMS.forEach((s, i) => { const [cx, cy] = s.pos, R = i === 2 ? 9 : 10, base = hexRGB(s.col);
    if (i === GAL_SEL) { g.strokeStyle = `rgba(242,210,48,${.6 + .4 * Math.sin(t * 5)})`; g.lineWidth = 1; g.strokeRect(cx - R - 5.5, cy - R - 5.5, R * 2 + 11, R * 2 + 11); }
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = x * x + y * y; if (d > R * R) continue; const z = Math.sqrt(R * R - d), l = clamp((-x * .6 - y * .5 + z * .6) / R, .12, 1);
      const band = s.style === "desert" ? (Math.sin((y + cy) * .9) > .5 ? .85 : 1) : s.style === "swamp" ? (hash2(x + 9, y, i) > .7 ? .8 : 1) : (hash2(x, y, i) > .8 ? 1.1 : 1);
      const dim = s.locked ? .35 : 1; g.fillStyle = `rgb(${base.map(v => Math.min(255, v * l * band * dim) | 0).join(",")})`; g.fillRect(cx + x, cy + y, 1, 1); }
    if (s.locked) {   // a pixel padlock over the planet
      const lx = cx - 4, ly = cy - 3; g.fillStyle = "#000"; g.fillRect(lx - 1, ly - 1, 10, 9); g.fillRect(lx + 1, ly - 6, 6, 6);
      g.fillStyle = "#cfd6e0"; g.fillRect(lx + 2, ly - 5, 1, 5); g.fillRect(lx + 5, ly - 5, 1, 5); g.fillRect(lx + 2, ly - 5, 4, 1);
      g.fillStyle = "#f2d230"; g.fillRect(lx, ly, 8, 7); g.fillStyle = "#8a6a10"; g.fillRect(lx + 3, ly + 2, 2, 3); }
    if (s.ring) { g.strokeStyle = "rgba(220,230,240,.7)"; g.beginPath(); g.ellipse(cx + .5, cy + .5, R + 7, 3, -.3, 0, 7); g.stroke(); }
    // names and tags are HTML over the map (crisp at any size)
    if (i === cur) { const a = t * 1.5, sx = cx + Math.cos(a) * (R + 6), sy = cy + Math.sin(a) * (R + 6) * .6; g.fillStyle = "#f2d230"; g.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3); g.fillStyle = "#fff"; g.fillRect(Math.round(sx), Math.round(sy), 1, 1); }
  });
  if (BASE.jump) { g.fillStyle = "rgba(85,182,255,.9)"; g.font = "8px Silkscreen, monospace"; g.textAlign = "left"; g.fillText("IN HYPERSPACE…", 6, 12); }
}

// ---------- the Starfall pod: pick one of the operations on the planet below, read the brief, drop ----------
function showPodMissions(pod) {
  const cur = curSystem(), S = SYSTEMS[cur], ms = systemMissions(cur), sv = loadSave();
  screen(`<div class="wrap wide fill"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><h2 class="logo" style="font-size:40px">STARFALL POD</h2><p class="tag" style="margin:6px 0 0">${S.name} · ${BIOMES[S.biome].name} · ${(() => { const P = warInit(sv).planets[cur]; return `${libBar(P, 90)} ${P.freed ? "liberated" : Math.floor(P.lib) + "% liberated"}`; })()} · choose your operation</p></div>
      <div class="row"><span class="reqline">REQ <b>${sv.req}</b> · SAMPLES <b>${sv.samples}</b></span><button class="btn ghost" id="back" style="padding:8px 14px;font-size:12px">STEP OUT [E]</button></div></div>
    <div class="cards pods" style="--n:${ms.length}">${ms.map((m, i) => `<button class="card ${m.defend ? "def" : ""}" data-i="${i}"><div class="thumb"></div><div class="ct">${m.defend ? `<div class="atk">⚠ DEFEND · ${warInit(sv).planets[cur].attack.left} OPS LEFT</div>` : ""}<h3>${m.region}</h3><div class="sub">${DIFFS[m.diff - 1]} · difficulty ${m.diff}</div>
      <div class="ob">${OBJS[m.obj].name}</div><div class="obd">${OBJS[m.obj].desc}</div>
      <div class="opinfo"><small>ENEMY</small><span>${(ENEMIES[m.enemy] || ENEMIES.bugs).name}</span><small>LIBERATION</small><span>+${Math.round(4 + m.diff * 1.5)}% quick · +${Math.round(10 + m.diff * 2.5)}% full</span><small>XP</small><span>×${(1 + (m.diff - 1) * .25).toFixed(2)}</span></div>
      <div class="mods">${m.mods.length ? m.mods.map(k => `<span>${MODS[k].name}</span>`).join("") : `<span style="border-color:var(--line);color:var(--mut)">No modifiers</span>`}</div>
      <div class="reqline" style="margin-top:10px">REWARD <b>${m.reward}</b> REQ</div></div></button>`).join("")}</div>
    <p style="color:var(--mut);font-size:13px;margin:12px 0 0">Want a different planet? Plot a course at the war table on the bridge.</p></div>`);
  document.querySelectorAll(".card").forEach(c => { c.querySelector(".thumb").replaceWith(planetThumb(ms[+c.dataset.i], 320, 280)); c.onclick = () => { AU.click(); showBrief(ms[+c.dataset.i], pod); }; });
  $("back").onclick = backToBase;
}
