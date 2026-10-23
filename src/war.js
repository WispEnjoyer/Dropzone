// =====================================================================================
//  THE WAR FOR SECTOR DRACO: liberation bars per planet, enemy counter-attacks on the worlds you've taken,
//  gear that's classified until you free the planet it's made on, an XP rank track with cosmetic armour
//  tints, and medals. Everything lives in the save (sv.war, sv.xp, sv.medals). A failed mission only costs
//  the samples you carried; ground is lost only by letting a counter-attack run out.
// =====================================================================================
const KRYOS = 2, LIB_UNLOCK_KRYOS = 2;
// which planet's liberation declassifies each piece of gear
const CLASSIFIED = { smg: 0, mpistol: 0, light: 0, cluster: 0, marksman: 1, revolver: 1, heavy: 1, rocket: 1, shotgun: 3, superheavy: 3, rail: 3 };
const RANKS = [
  { t: "Cadet", xp: 0 }, { t: "Private", xp: 800, tint: ["Desert Tan", "#b89a6a"] }, { t: "Specialist", xp: 2200, tint: ["Swamp Olive", "#6e7a44"] },
  { t: "Corporal", xp: 4200, tint: ["Arctic White", "#d8dde2"] }, { t: "Sergeant", xp: 7000, tint: ["Urban Grey", "#6c7076"] }, { t: "Staff Sergeant", xp: 11000, tint: ["Navy", "#36486a"] },
  { t: "Lieutenant", xp: 16000, tint: ["Crimson", "#8a2c28"] }, { t: "Captain", xp: 22000, tint: ["Black Ops", "#2a2a2e"] }, { t: "Major", xp: 30000, tint: ["Dress Blue & Gold", "#2c3a66"] },
  { t: "Commander", xp: 40000, tint: ["Starfall Green", "#4a7344"] } ];
const MEDALS = {
  liberator: { name: "Liberator", desc: "Liberated a planet." },
  defender:  { name: "Shield of Draco", desc: "Beat off an enemy counter-attack." },
  flawless:  { name: "Untouchable", desc: "Extracted with no deaths on Medium or harder." },
  fullop:    { name: "Thorough", desc: "Completed a Full operation with every side objective." },
  sector:    { name: "Hero of Draco", desc: "Liberated every world in the sector." },
  slayer:    { name: "Exterminator", desc: "Killed 150 or more enemies in one mission." },
  ironrain:  { name: "Iron Rain", desc: "Called in 8 or more stratagems in one mission." },
  valor:     { name: "Star of Valor", desc: "Won a mission on Hard or Extreme." } };

function warInit(sv) { const w = sv.war = sv.war || {}; w.turn = w.turn || 0; w.planets = w.planets || [];
  for (let i = 0; i < SYSTEMS.length; i++) w.planets[i] = Object.assign({ lib: 0, freed: false, ever: false, attack: null }, w.planets[i] || {});
  sv.xp = sv.xp || 0; sv.medals = sv.medals || {}; return w; }
// Kryos opens once two worlds are free (counted from what's ever been liberated, so a lost planet doesn't re-lock it)
function syncWarLocks(sv) { const w = warInit(sv); SYSTEMS[KRYOS].locked = w.planets.filter((p, i) => p.ever && i !== KRYOS).length < LIB_UNLOCK_KRYOS; }
const gearUnlocked = (k, sv) => CLASSIFIED[k] == null || !!(sv.war && sv.war.planets[CLASSIFIED[k]] && sv.war.planets[CLASSIFIED[k]].ever);
const rankOf = xp => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i; return r; };
const rankTitle = xp => RANKS[rankOf(xp)].t;
function tintsFor(xp) { const r = rankOf(xp), out = [["none", "Standard issue", null, 0]]; RANKS.forEach((R, i) => { if (R.tint) out.push([R.tint[0], R.tint[0], R.tint[1], i, i <= r]); }); return out; }

// the defence operation that appears on a planet under attack
function defendMission(i) { const S = SYSTEMS[i], w = warInit(loadSave()), seed = (S.seed * 31 + w.turn * 7177) >>> 0, diff = Math.min(S.threat[1], S.threat[0] + 1);
  const m = genMission(diff, seed, { biome: S.biome, planet: S.name, enemy: S.enemy, extra: { sys: i, slot: -1, defend: true } }); m.obj = "defend"; m.reward += 100; return m; }

// ---------- after every mission: liberation, XP, medals, then the enemy's move ----------
function warResolve(sv, r) {   // r: { win, m, kills, deaths, side, sideTotal }
  const w = warInit(sv), m = r.m, P = m.sys != null ? w.planets[m.sys] : null, out = { lib0: P ? P.lib : 0, lib: P ? P.lib : 0, xp0: sv.xp, xp: 0, rank0: rankOf(sv.xp), medals: [], unlocked: [], events: [], planet: m.planet };
  const dm = 1 + (m.diff - 1) * .25, full = m.size === "full";
  // XP
  let xp = Math.min(300, r.kills * 2) + r.side * 75; if (r.win) xp += 150 + 50; xp = Math.round(xp * dm * (full ? 1.3 : 1) * (r.win ? 1 : .5)); sv.xp += xp; out.xp = xp;
  const medal = k => { sv.medals[k] = (sv.medals[k] || 0) + 1; out.medals.push(k); };
  if (r.win && P) {
    if (m.defend) { if (P.attack) { P.attack = null; w.calm = 4; out.events.push(`The counter-attack on ${m.planet} has been beaten off.`); medal("defender"); } if (!P.freed) P.lib = Math.min(100, P.lib + 5); }
    else if (!P.attack || P.freed) P.lib = Math.min(100, P.lib + (full ? 10 + m.diff * 2.5 + r.side * 4 : 4 + m.diff * 1.5));
    if (P.lib >= 100 && !P.freed) { P.freed = true; const first = !P.ever; P.ever = true; out.events.push(`${m.planet} is LIBERATED.`); medal("liberator");
      if (first) for (const [k, i] of Object.entries(CLASSIFIED)) if (i === m.sys) out.unlocked.push(k); }
    if (r.kills >= 150) medal("slayer"); if ((r.strats || 0) >= 8) medal("ironrain"); if (m.diff >= 5) medal("valor");
    if (r.deaths === 0 && m.diff >= 3) medal("flawless"); if (full && r.sideTotal && r.side >= r.sideTotal) medal("fullop"); }
  out.lib = P ? P.lib : 0;
  // the enemy's turn: running attacks tick down, and a new one may start
  w.turn++;
  w.planets.forEach((Q, i) => { if (!Q.attack || (m.defend && i === m.sys)) return; Q.attack.left--;
    if (Q.attack.left <= 0) { Q.attack = null; if (Q.freed) { Q.freed = false; Q.lib = 70; out.events.push(`${SYSTEMS[i].name} has FALLEN back into enemy hands. Liberation 70%.`); } else { Q.lib = Math.max(0, Q.lib - 20); out.events.push(`The enemy pushed us back on ${SYSTEMS[i].name}. Liberation −20%.`); } } });
  if (w.planets.some(Q => Q.attack)) w.calm = 3; else if ((w.calm = Math.max(0, (w.calm || 0) - 1)) > 0) {} else { const cand = w.planets.map((Q, i) => [Q, i]).filter(([Q, i]) => !SYSTEMS[i].locked && (Q.freed || Q.lib >= 60));
    if (cand.length && Math.random() < .35) { const [Q, i] = cand[Math.floor(Math.random() * cand.length)]; Q.attack = { left: 3 }; out.events.push(`⚠ ${ENEMIES[SYSTEMS[i].enemy].name} are COUNTER-ATTACKING ${SYSTEMS[i].name}. Defend it within 3 operations.`); } }
  syncWarLocks(sv); if (!SYSTEMS[KRYOS].locked && !w.kryosSaid) { w.kryosSaid = true; out.events.push("New world charted: KRYOS MINOR is open at the war table."); }
  if (w.planets.every((Q, i) => Q.freed) && !sv.medals.sector) medal("sector");
  out.rank = rankOf(sv.xp); return out; }

// ---------- small UI pieces shared by the war table, the pod and the end screen ----------
function libBar(p, w = 100) { return `<span class="libbar" style="width:${w}px"><i style="width:${Math.min(100, p.lib)}%"></i></span>`; }
function rankBadge(sv) { const r = rankOf(sv.xp), next = RANKS[r + 1]; return `<span class="rankb">${insignia(r)}<b>${RANKS[r].t.toUpperCase()}</b>${next ? ` <small>${sv.xp}/${next.xp} XP</small>` : ` <small>${sv.xp} XP</small>`}</span>`; }
// rank insignia: the artist's icons if present (fieldart/rank_N.png), otherwise generated chevrons
function insignia(r, s = 22) { if (typeof FIELDART !== "undefined" && FIELDART["rank_" + r]) return `<img class="ins" src="${FIELDART["rank_" + r]}" style="width:${s}px;height:${s}px">`;
  const ch = Math.min(3, r), bars = Math.max(0, r - 3), star = r >= 7; let svg = "";
  for (let k = 0; k < ch; k++) svg += `<path d="M3 ${9 + k * 5} L11 ${4 + k * 5} L19 ${9 + k * 5}" stroke="#f2d230" stroke-width="2.4" fill="none"/>`;
  for (let k = 0; k < Math.min(3, bars); k++) svg += `<rect x="4" y="${19 - k * 4}" width="14" height="2.2" fill="#e8e0c8"/>`;
  if (star) svg = `<path d="M11 1 L13.3 7 L19.5 7 L14.5 10.8 L16.4 17 L11 13.2 L5.6 17 L7.5 10.8 L2.5 7 L8.7 7 Z" fill="#f2d230"/>` + (r >= 8 ? `<rect x="3" y="19" width="16" height="2.2" fill="#e8e0c8"/>` : "") + (r >= 9 ? `<rect x="3" y="15" width="16" height="2.2" fill="#e8e0c8"/>` : "");
  if (r === 0) svg = `<circle cx="11" cy="11" r="4" fill="none" stroke="#9aa" stroke-width="2"/>`;
  return `<svg class="ins" width="${s}" height="${s}" viewBox="0 0 22 22">${svg}</svg>`; }
function medalIcon(k, s = 26) { if (typeof FIELDART !== "undefined" && FIELDART["medal_" + k]) return `<img class="ins" src="${FIELDART["medal_" + k]}" style="width:${s}px;height:${s}px">`;
  const col = { liberator: "#f2d230", defender: "#7ac0ff", flawless: "#e8e8f0", fullop: "#72e06a", sector: "#ff9a4a" }[k] || "#ccc";
  return `<svg class="ins" width="${s}" height="${s}" viewBox="0 0 22 22"><path d="M6 1 L11 8 L16 1" stroke="#8a2c28" stroke-width="3" fill="none"/><circle cx="11" cy="14" r="6.5" fill="${col}" stroke="#222" stroke-width="1.2"/><path d="M11 10 L12.2 13 L15 13 L12.8 14.8 L13.6 17.6 L11 16 L8.4 17.6 L9.2 14.8 L7 13 L9.8 13 Z" fill="#222" opacity=".55"/></svg>`; }
const gearName = k => (WEAPONS[k] || SECONDARIES[k] || ARMORS[k] || STRATS[k] || {}).name || k;

// the armour tint you picked: the cloth on the armory mannequins is recoloured (plates, straps and stripes stay as drawn)
function applyArmorTint() { const sv = loadSave(), hex = sv.lo.tint && (RANKS.find(R => R.tint && R.tint[0] === sv.lo.tint) || {}).tint, col = hex ? hexRGB(hex[1]) : null; if (!R3.gl) return;
  for (let i = 0; i < 8; i++) { const L = SP["armL" + i], M = SP["armM" + i], H = SP["armH" + i]; if (!L || !M || !H || L.w !== M.w || H.w !== M.w || L.h !== M.h || H.h !== M.h) continue;
    for (const [t, S] of [["armL", L], ["armM", M], ["armH", H]]) { if (!col) { R3.tex["sp_" + t + i] = glTex(S); continue; }
      const d = new Uint8Array(S.d), lum = j => (S.d[j] * .3 + S.d[j + 1] * .59 + S.d[j + 2] * .11) / 255;
      for (let j = 0; j < d.length; j += 4) { if (!S.d[j + 3]) continue; let cloth = false; for (let c = 0; c < 3; c++) if (L.d[j + c] !== M.d[j + c] || H.d[j + c] !== M.d[j + c]) cloth = true; if (!cloth) continue;
        const k = .45 + lum(j) * 1.1; for (let c = 0; c < 3; c++) d[j + c] = clamp(col[c] * k, 0, 255); }
      R3.tex["sp_" + t + i] = glTex({ w: S.w, h: S.h, d }); } } }
