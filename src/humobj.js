// =====================================================================================
//  MISSIONS AGAINST THE MERCENARIES: no hives here. Their bases are camps (tents, crates, a radio mast) that
//  soldiers turn out of, and the main objectives are a command post to sabotage or a warlord to take down.
//  Anything at a camp or command post can be destroyed with explosives, or with a demolition charge (E).
// =====================================================================================
// the command post's three sabotage targets
const CP_TARGETS = [
  { key: "generator", label: "generator", build: () => livery("E", () => mdlGenerator(false)), dead: () => livery("E", () => mdlGenerator(true)) },
  { key: "comms", label: "comms array", build: () => livery("E", () => mdlComms(false)), dead: () => livery("E", () => mdlComms(true)) },
  { key: "ammo", label: "ammo dump", build: () => livery("E", () => mdlAmmo(false)), dead: () => livery("E", () => mdlAmmo(true)) },
];
const tentBuild = () => livery("E", () => mdlTent(false)), tentDead = () => livery("E", () => mdlTent(true));
const humParts = {};   // built once per mission, shared by every tent
function humPart(key, fn) { return humParts[key] = humParts[key] || buildParts(fn); }

function humNest(x, z, main) { const n = { x, z, holes: [], main, spT: frand(2, 6), cleared: false, hum: true }; F.nests.push(n); return n; }
function humTarget(n, x, z, yaw, alive, dead, label, r = 1.7) { const y = fieldH(x, z), h = { x, z, y, alive: true, label, deadParts: dead, obj: { parts: alive, M: mChain(mT(x, y, z), mRy(yaw)), kind: "hole" } };
  n.holes.push(h); F.objs.push(h.obj); F.coll.push([x, z, r, y + 1.6]); return h; }
// a ring of sandbags with a gap, around a camp or a target
function sandbags(x, z, r, gap = .9) { const y = fieldH(x, z); F.objs.push({ own: true, kind: "bags", M: mT(x, y, z), parts: buildParts(() => mdlSandbags(x, z, r, gap, (bx, bz) => fieldH(x + bx, z + bz) - y)) }); }

function setupHumanMission(m) {
  for (const k in humParts) delete humParts[k];
  const o = FLD.obj, TENT = humPart("tent", tentBuild), TENTD = humPart("tentd", tentDead);
  if (m.obj === "sabotage") { F.mainNests = [];
    CP_TARGETS.forEach((T, k) => { const a = k / 3 * 6.283 + .4, x = o.x + Math.cos(a) * 16, z = o.z + Math.sin(a) * 16, n = humNest(x, z, true); F.mainNests.push(n);
      humTarget(n, x, z, a, humPart(T.key, T.build), humPart(T.key + "d", T.dead), T.label, T.key === "comms" ? 1.1 : 1.7); n.label = T.label; sandbags(x, z, 4.2, a + Math.PI); });
    if (m.diff >= 2) { const g = spawnBug("gunner", o.x + 3, o.z - 2, "idle"); g.home = { x: o.x, z: o.z }; } }
  F.hvtLabel = "WARLORD";
  if (m.obj === "hvt") { const n = humNest(o.x, o.z, false); n.noSpawn = true;
    for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283 + .9; humTarget(n, o.x + Math.cos(a) * 9, o.z + Math.sin(a) * 9, a + Math.PI / 2, TENT, TENTD, "tent"); }
    sandbags(o.x, o.z, 15, 2.2);
    const boss = spawnBug("merc", o.x + 2, o.z + 1, "idle"); Object.assign(boss, { boss: true, hp: 650 + m.diff * 120, role: "suppress", home: { x: o.x, z: o.z }, pitch: .78 }); boss.max = boss.hp; F.hvt = boss;
    for (let k = 0; k < 4 + m.diff; k++) { const a = Math.random() * 6.283, d = 4 + Math.random() * 10; const g = spawnBug("merc", o.x + Math.cos(a) * d, o.z + Math.sin(a) * d, "idle"); g.home = { x: o.x, z: o.z }; g.guard = true; }
    for (let k = 0; k < (m.diff >= 3 ? 2 : 1); k++) { const g = spawnBug("gunner", o.x + (k ? -5 : 5), o.z + 3, "idle"); g.home = { x: o.x, z: o.z }; g.guard = true; } }
  if (m.obj === "officer") { const n = humNest(o.x, o.z, false); n.noSpawn = true;
    for (let k = 0; k < 2; k++) { const a = k * Math.PI + .6; humTarget(n, o.x + Math.cos(a) * 6, o.z + Math.sin(a) * 6, a + Math.PI / 2, TENT, TENTD, "tent"); }
    sandbags(o.x, o.z, 10, 1.2);
    // her rounds: the HQ and the two nearest camps
    const camps = FLD.nestSpots.slice().sort((a, b) => Math.hypot(a[0] - o.x, a[1] - o.z) - Math.hypot(b[0] - o.x, b[1] - o.z)).slice(0, 2);
    const off = spawnBug("officer", o.x + 1.5, o.z + 1, "idle"); Object.assign(off, { officer: true, hp: 45 + m.diff * 8, route: [[o.x, o.z], ...camps], ri: 1, wait: frand(5, 9), pitch: 1.25 }); off.max = off.hp; F.hvt = off; F.hvtLabel = "OFFICER";
    for (let k = 0; k < 3 + Math.floor(m.diff / 2); k++) { const g = spawnBug("merc", off.x + frand(-3, 3), off.z + frand(-3, 3), "idle"); Object.assign(g, { escort: true, eo: Math.PI * .5 + k * 2.4, home: { x: o.x, z: o.z } }); }
    for (let k = 0; k < 2 + Math.floor(m.diff / 2); k++) { const a = Math.random() * 6.283, g = spawnBug("merc", o.x + Math.cos(a) * 7, o.z + Math.sin(a) * 7, "idle"); g.home = { x: o.x, z: o.z }; g.guard = true; } }
  // the camps: two or three tents round a radio mast and a crate stack
  for (const [x, z] of FLD.nestSpots) { const n = humNest(x, z, false), cnt = 2 + (Math.random() < .5 ? 1 : 0);
    for (let k = 0; k < cnt; k++) { const a = k / cnt * 6.283 + frand(-.3, .3), d = frand(5, 7); humTarget(n, x + Math.cos(a) * d, z + Math.sin(a) * d, a + Math.PI / 2, TENT, TENTD, "tent"); }
    F.objs.push({ own: true, kind: "camp", M: mT(x, fieldH(x, z), z), parts: humPart("campc", () => livery("E", mdlCampCentre)) });
    F.coll.push([x + 1.6, z - .1, .8, fieldH(x, z) + 1.2]); }
}
// a demolition charge on a target: five seconds of beeping, then it goes up
function plantCharge(n, h) { h.charged = true; (F.charges = F.charges || []).push({ x: h.x, y: h.y + 1, z: h.z, t: 5, beep: 5, n, h }); AU.armed(); fmsg("", `Charge set on the ${h.label} · 5 s · move away`, 2.5); noise3(h.x, h.z, 30); }
function updateCharges(dt) { const C = F.charges || []; for (let i = C.length - 1; i >= 0; i--) { const c = C[i]; c.t -= dt; const s = Math.ceil(c.t);
    if (s < c.beep) { c.beep = s; AU.beep(s <= 1 ? 3 : 1); } if (c.t <= 0) { C.splice(i, 1); c.h.charged = false; explode3(c.x, c.y - .6, c.z, 5, 650); } } }
// the warlord: when he drops, the job's done
function bossDown(b) { const off = b.officer; F.hvt = null; showTitle3(off ? "OFFICER ELIMINATED" : "WARLORD ELIMINATED", "Head to the extraction point"); setTimeout(() => F && objectiveDone3(), 1200); }
