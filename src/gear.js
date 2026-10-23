// =====================================================================================
//  GEAR: weapons, armor, ship upgrades, the stratagems you can buy, and the saved loadout
// =====================================================================================
const WEAPONS = {
  rifle:    { name: "AR-1 Warden",   type: "Assault rifle",  mag: 45, mags: 6, rate: .09, dmg: 25,  spread: .03,  moveSpread: .04, pellets: 1, speed: 820,  life: .42, reload: 2,   pierce: 0, price: 0,   desc: "Reliable all-rounder. Good at every range, great at none." },
  smg:      { name: "SMG-4 Hornet",  type: "Submachine gun", mag: 50, mags: 6, rate: .06, dmg: 16,  spread: .06,  moveSpread: .02, pellets: 1, speed: 760,  life: .3,  reload: 1.5, pierce: 0, price: 250, desc: "Huge fire rate, short reach. Stays accurate on the move." },
  shotgun:  { name: "SG-8 Breacher", type: "Shotgun",        mag: 12, mags: 6, rate: .5,  dmg: 20,  spread: .2,   moveSpread: .03, pellets: 8, speed: 700,  life: .24, reload: 2.4, pierce: 0, price: 300, desc: "Shreds anything up close. Useless past a few meters." },
  marksman: { name: "MR-2 Longshot", type: "Marksman rifle", mag: 15, mags: 7, rate: .32, dmg: 120, spread: .004, moveSpread: .05, pellets: 1, speed: 1100, life: .5,  reload: 2.4, pierce: 2, price: 400, desc: "Heavy rounds that punch through up to three bugs." },
};
// sidearms: always carried, swapped with 1 / 2 or the mouse wheel. Semi-automatic ones fire once per click.
const SECONDARIES = {
  pistol:   { name: "P-2 Peacemaker", type: "Pistol",          mag: 15, mags: 4, rate: .13, dmg: 45,  spread: .012, moveSpread: .02, pellets: 1, reload: 1.3, pierce: 0, semi: true, price: 0,   desc: "Reliable sidearm. Fast to draw, fast to reload." },
  revolver: { name: "R-6 Deadeye",    type: "Revolver",        mag: 6,  mags: 6, rate: .4,  dmg: 150, spread: .004, moveSpread: .03, pellets: 1, reload: 2.2, pierce: 1, semi: true, price: 250, desc: "Six heavy rounds that punch through a bug. Slow to reload." },
  mpistol:  { name: "MP-98 Knight",   type: "Machine pistol",  mag: 30, mags: 4, rate: .065, dmg: 18, spread: .05,  moveSpread: .02, pellets: 1, reload: 1.5, pierce: 0, semi: false, price: 200, desc: "Fully automatic sidearm. Sprays a swarm off you up close." },
};
const ARMORS = {
  medium: { name: "B-01 Standard", hp: 100, spd: 1,    mul: 1,   regen: 1,   price: 0,   desc: "Balanced plates. The trooper's default.", tint: null },
  light:  { name: "SC-30 Scout", helm: "small",   hp: 80,  spd: 1.12, mul: 1,   regen: 1.35, price: 200, desc: "Faster, and stamina comes back quicker. Thin plates.", tint: { light: "#c8d6b4", mid: "#8ea27a", dark: "#56664a", cape: "#3a5a2a", cape2: "#2a4420" } },
  heavy:  { name: "FS-05 Bulwark", hp: 130, spd: .88,  mul: .85, regen: .8,  price: 300, desc: "Soaks hits and shrugs off damage. Slow on your feet.", tint: { light: "#9aa0a8", mid: "#6a7078", dark: "#40444a", cape: "#5e2626", cape2: "#441a1a" } },
  superheavy: { name: "FX-9 Juggernaut", hp: 175, spd: .76, mul: .7, regen: .6, price: 650, helmet: true, helm: "big", desc: "A walking bunker. Takes a beating like nothing else, but you lumber, and its heavy helmet narrows your view.", tint: { light: "#7c8478", mid: "#535a50", dark: "#2f342d", cape: "#3a4a2a", cape2: "#26301c" } },
};
Object.assign(STRATS, {
  cluster: { name: "Eagle Cluster Bomb", code: "URDDR", cd: 0,   uses: 2, rearm: 90, kind: "eagle",   ic: "EC", delay: 1.5, price: 350 },
  rocket:  { name: "Rocket Sentry",      code: "DURRL", cd: 180, kind: "support", ic: "RK", delay: 2.5, price: 450 },
  rail:    { name: "Orbital Railcannon", code: "RUDDR", cd: 210, kind: "orbital", ic: "RC", delay: 2,   price: 600 },
});
// the stratagem's icon: hand-drawn single-colour art when it exists, the two-letter badge otherwise
function stratIc(k) { const src = typeof FIELDART !== "undefined" && FIELDART["st_" + k]; return src ? `<img class="sti" src="${src}" alt="${STRATS[k].ic}">` : STRATS[k].ic; }
const STRAT_DESC = {
  resupply: "Drops a crate with ammo, grenades and stims.", eagle: "A line of five bombs along your throw. 3 runs, then rearms.",
  precision: "One heavy shell on the beacon. Small radius, huge damage.", barrage: "Ten shells walk around the beacon for several seconds.",
  sentry: "Automated machine gun. Shreds small bugs.", cluster: "Carpets a wide strip in small bomblets. 2 runs, then rearms.",
  rocket: "Slow-firing sentry. Rockets hunt the biggest bug in range.", rail: "Fires at the toughest bug near the beacon. Deletes Chargers.",
};
const UPGRADES = {
  hellpod: { name: "Extra Hellpod",       desc: "+1 reinforcement on every mission.",             req: 200, samples: 8 },
  webbing: { name: "Expanded Webbing",    desc: "Carry +1 magazine, +1 grenade and +1 stim.",     req: 150, samples: 6 },
  coolant: { name: "Coolant Lines",       desc: "All stratagem cooldowns 15% shorter.",           req: 300, samples: 12 },
  bays:    { name: "Expanded Eagle Bays", desc: "+1 use on every Eagle stratagem before rearming.", req: 250, samples: 10 },
  plating: { name: "Reinforced Plating",  desc: "Armour plates re-forged: +15% health in every armour.", req: 250, samples: 8 },
  relay:   { name: "Comms Relay",         desc: "Stratagems arrive 30% faster after the beacon lands.", req: 300, samples: 10 },
  scanner: { name: "Orbital Scanner",     desc: "Every point of interest is marked on your map from the moment you land.", req: 200, samples: 8 },
  crates:  { name: "Bulk Resupply",       desc: "Resupply pods carry 6 refills instead of 4.", req: 200, samples: 6 },
  afterburn: { name: "Pelican Afterburners", desc: "The extraction Pelican arrives 30% sooner.", req: 250, samples: 10 },
  sentry:  { name: "Sentry Overhaul",     desc: "Sentries drop with 50% more ammo and run 50% longer.", req: 300, samples: 12 },
  satchel: { name: "Sample Satchel",      desc: "Keep half the samples you were carrying when a mission fails.", req: 350, samples: 14 },
  seals:   { name: "Hazard Seals",        desc: "Sealed suits: Intense Heat and Extreme Cold no longer slow you.", req: 200, samples: 8 },
};
function resolveLoadout(m) {
  const sv = loadSave(), w = WEAPONS[sv.lo.w] || WEAPONS.rifle, a = ARMORS[sv.lo.a] || ARMORS.medium, up = sv.up, web = up.webbing ? 1 : 0, k2 = SECONDARIES[sv.lo.w2] ? sv.lo.w2 : "pistol", w2 = SECONDARIES[k2];
  return { w, a, wk: WEAPONS[sv.lo.w] ? sv.lo.w : "rifle", w2, wk2: k2, mags2: w2.mags + web, mag: w.mag, mags: w.mags + web, gren: 4 + web, stims: 4 + web, hp: Math.round(a.hp * (up.plating ? 1.15 : 1)), spd: a.spd, mul: a.mul, regen: a.regen, reload: w.reload,
    strats: sv.lo.s.filter(k => STRATS[k]).slice(0, 4), reinf: (m.diff <= 3 ? 5 : 4) + (up.hellpod ? 1 : 0), cdMul: up.coolant ? .85 : 1, eagleBonus: up.bays ? 1 : 0, callMul: up.relay ? .7 : 1, scanner: !!up.scanner, crateUses: up.crates ? 6 : 4, extMul: up.afterburn ? .7 : 1, sentryMul: up.sentry ? 1.5 : 1, satchel: !!up.satchel, seals: !!up.seals };
}
