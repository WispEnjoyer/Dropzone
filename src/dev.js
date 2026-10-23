// =====================================================================================
//  DEV MENU (F4 or `): cheats for testing. Edits the save directly, plus in-mission helpers.
// =====================================================================================
const DEV = { open: false, ammo: false, fps: false, wasPaused: false, fpsN: 0, fpsT: 0, fpsV: 0, wipeArm: 0 };
function devEl() { let el = document.getElementById("dev"); if (el) return el;
  const st = document.createElement("style"); st.textContent = `
#dev { position: fixed; top: 12px; right: 12px; bottom: 12px; width: 380px; z-index: 9999; overflow-y: auto; background: rgba(8,10,12,.95); border: 1px solid rgba(242,210,48,.35); border-left: 3px solid #f2d230; color: #e8e4d8; font: 13px "Chakra Petch", sans-serif; padding: 12px 14px 18px; pointer-events: auto; }
#dev h3 { margin: 0 0 2px; font: 700 16px Silkscreen, monospace; color: #f2d230; letter-spacing: .06em; } #dev .sub { color: #8a8678; font-size: 11px; margin-bottom: 8px; }
#dev .sec { font: 10px Silkscreen, monospace; color: #8a8678; letter-spacing: .14em; margin: 14px 0 6px; border-top: 1px solid rgba(255,255,255,.08); padding-top: 10px; }
#dev .row { display: flex; flex-wrap: wrap; gap: 5px; } #dev .stat { color: #8a8678; font-size: 12px; margin-bottom: 6px; } #dev .stat b { color: #f2d230; }
#dev button { background: #1c2026; color: #e8e4d8; border: 1px solid #3a3f47; padding: 5px 9px; font: 600 12px "Chakra Petch", sans-serif; cursor: pointer; }
#dev button:hover { border-color: #f2d230; } #dev button.on { background: #2e4a2a; border-color: #6fbf5a; color: #c8f0b8; } #dev button.off { color: #77736a; }
#dev button.warn { border-color: #8a3a2a; color: #ff9a80; } #dev .x { float: right; padding: 2px 8px; }
#dev-fps { position: fixed; left: 50%; top: 4px; translate: -50% 0; z-index: 9998; font: 11px Silkscreen, monospace; color: #6fbf5a; background: rgba(0,0,0,.6); padding: 2px 8px; pointer-events: none; }`;
  document.head.appendChild(st); el = document.createElement("div"); el.id = "dev"; el.hidden = true; STAGE.appendChild(el);
  el.addEventListener("mousedown", e => e.stopPropagation()); el.addEventListener("click", devClick);
  const f = document.createElement("div"); f.id = "dev-fps"; f.hidden = true; STAGE.appendChild(f);
  return el; }
const inMission = () => (MODE === "field" || MODE === "drop") && typeof F !== "undefined" && F && F.p;
function devToggle(on = !DEV.open) { const el = devEl(); DEV.open = on; el.hidden = !on; keys.clear(); mouse.down = false;
  if (on) { if (document.pointerLockElement) document.exitPointerLock(); if (inMission() && !DROP) { DEV.wasPaused = F.paused; F.paused = true; } devRender(); }
  else if (inMission() && !DROP) F.paused = DEV.wasPaused; }
addEventListener("keydown", e => {
  if (e.code === "Backquote" || e.key === "F4") { e.preventDefault(); e.stopImmediatePropagation(); devToggle(); return; }
  if (DEV.open && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); devToggle(false); }
}, true);

function devRender() { const el = devEl(), sv = loadSave(), m = inMission(), own = (kind, k) => sv.owned[kind].includes(k);
  const chips = (kind, table) => Object.entries(table).map(([k, v]) => `<button data-a="own" data-kind="${kind}" data-k="${k}" class="${own(kind, k) ? "on" : "off"}">${v.name}</button>`).join("");
  const B = (a, label, cls = "", extra = "") => `<button data-a="${a}" class="${cls}" ${extra}>${label}</button>`;
  el.innerHTML = `${B("close", "✕ F4", "x")}<h3>DEV MENU</h3><div class="sub">Cheats for testing. Changes save immediately.</div>
  <div class="sec">DEV WORLD · every sprite, plus a section for each planet</div>
  ${DW.on ? `<div class="row">${B("dwBack", "⟵ Back to the ship", "on")}${B("dwSpin", "Turntable: all exhibits", DW.spin ? "on" : "off")}</div><div class="stat" style="margin-top:6px">Rebuild with a different main ground</div>`
    : MODE === "base" && !DROP ? `<div class="stat">Teleport there. Pick the planet the main ground is made of:</div>` : `<div class="stat">Only from the ship.</div>`}
  ${MODE === "base" && !DROP || DW.on ? `<div class="row">${DW_BIOMES.map(b => B("dwGo", BIOMES[b].name, DW.on && DW.base === b ? "on" : "", `data-b="${b}"`)).join("")}</div>` : ""}
  <div class="sec">PLAYER</div>
  <div class="row">${B("god", "God mode", window.__god ? "on" : "off")}${B("ammo", "Infinite ammo", DEV.ammo ? "on" : "off")}${B("stam", "Infinite stamina", window.__stam ? "on" : "off")}${B("invis", "Ignored by enemies (watch them)", window.__invis ? "on" : "off")}${B("ohk", "One-hit kills", window.__ohk ? "on" : "off")}</div>
  <div class="stat" style="margin-top:6px">Move speed</div><div class="row">${[1, 2, 4].map(v => B("speed", "×" + v, (window.__speed || 1) === v ? "on" : "", `data-v="${v}"`)).join("")}</div>
  <div class="sec">WORLD</div>
  <div class="stat">Time</div><div class="row">${[.25, .5, 1, 2].map(v => B("time", "×" + v, (window.__time || 1) === v ? "on" : "", `data-v="${v}"`)).join("")}${B("freeze", "Freeze enemies", window.__freeze ? "on" : "off")}</div>
  ${m ? `<div class="stat" style="margin-top:6px">Spawn 12 m in front of you</div><div class="row">${["merc", "gunner", "officer", "scav", "spitter", "warrior", "charger"].map(t => B("spawn", t, "", `data-t="${t}"`)).join("")}</div>` : ""}
  <div class="sec">RESOURCES</div><div class="stat">REQ <b>${sv.req}</b> · SAMPLES <b>${sv.samples}</b></div>
  <div class="row">${B("req", "+1,000 Req", "", 'data-n="1000"')}${B("req", "+10,000 Req", "", 'data-n="10000"')}${B("smp", "+50 Samples", "", 'data-n="50"')}${B("smp", "+500 Samples", "", 'data-n="500"')}${B("broke", "Zero both", "warn")}</div>
  <div class="sec">GEAR · click to lock / unlock</div><div class="row" style="margin-bottom:6px">${B("unlockAll", "Unlock everything")}${B("relockAll", "Relock everything", "warn")}</div>
  <div class="stat">Primary</div><div class="row">${chips("w", WEAPONS)}</div>
  <div class="stat" style="margin-top:6px">Secondary</div><div class="row">${chips("w2", SECONDARIES)}</div>
  <div class="stat" style="margin-top:6px">Armor</div><div class="row">${chips("a", ARMORS)}</div>
  <div class="stat" style="margin-top:6px">Stratagems</div><div class="row">${chips("s", STRATS)}</div>
  <div class="sec">SHIP UPGRADES</div><div class="row">${Object.entries(UPGRADES).map(([k, u]) => `<button data-a="up" data-k="${k}" class="${sv.up[k] ? "on" : "off"}">${u.name}</button>`).join("")}</div>
  <div class="row" style="margin-top:5px">${B("upAll", "All upgrades")}${B("upNone", "Remove upgrades", "warn")}</div>
  <div class="sec">GALAXY</div><div class="stat">In orbit over <b>${SYSTEMS[curSystem()].name}</b></div>
  <div class="row">${SYSTEMS.map((s, i) => s.locked ? B("", "🔒 " + s.name, "off") : B("jump", (i === curSystem() ? "◆ " : "") + s.name, i === curSystem() ? "on" : "", `data-i="${i}"`)).join("")}${B("reroll", "Reroll missions here")}</div>
  <div class="sec">MISSION${m ? "" : " · start a mission to use these"}</div>
  <div class="stat">Enemies are set by the planet: Myrrh IV has Skull Company, Myrrh V has bugs.</div>
  <div class="row" style="margin-top:5px">${m ? B("refill", "Refill everything") + B("cds", "Reset stratagem cooldowns") + B("kill", "Kill all enemies") + B("obj", "Complete objective") + B("tpExt", "Teleport to extraction") + B("win", "Win: objective + extraction") : ""}</div>
  <div class="sec">DISPLAY</div><div class="row">${B("hud", "Hide HUD", DEV.noHud ? "on" : "off")}${B("pix", "Pixel filter: " + (PIX.on ? (PIX.k === 1 ? "fine" : "chunky") : "off"))}${B("spiders", "Spider debug view", DEBUG_SPIDERS ? "on" : "off")}${B("fps", "FPS counter", DEV.fps ? "on" : "off")}</div>
  <div class="sec">SAVE</div><div class="row">${B("stats", "Reset career stats", "warn")}${B("wipe", DEV.wipeArm > performance.now() ? "Click again to wipe!" : "Wipe save", "warn")}</div>`; }

function devClick(e) { const b = e.target.closest("button"); if (!b) return; const a = b.dataset.a, sv = loadSave(), save = () => { writeSave(sv); for (const k in hudCache) delete hudCache[k]; };
  const p = inMission() ? F.p : null;
  switch (a) {
    case "close": devToggle(false); return;
    case "req": sv.req += +b.dataset.n; save(); break;
    case "smp": sv.samples += +b.dataset.n; save(); break;
    case "broke": sv.req = 0; sv.samples = 0; save(); break;
    case "unlockAll": sv.owned = { w: Object.keys(WEAPONS), w2: Object.keys(SECONDARIES), a: Object.keys(ARMORS), s: Object.keys(STRATS) }; save(); break;
    case "relockAll": { const f = freshSave(); sv.owned = f.owned; sv.lo = f.lo; save(); break; }
    case "own": { const kind = b.dataset.kind, k = b.dataset.k, list = sv.owned[kind], dflt = freshSave();
      if (list.includes(k)) { if (dflt.owned[kind].includes(k) && dflt.owned[kind].length === 1) break;   // can't lose your only starter
        sv.owned[kind] = list.filter(x => x !== k);
        if (kind === "s") sv.lo.s = sv.lo.s.filter(x => x !== k); else if (sv.lo[kind] === k) sv.lo[kind] = dflt.lo[kind]; }
      else list.push(k); save(); break; }
    case "up": sv.up[b.dataset.k] = !sv.up[b.dataset.k]; if (!sv.up[b.dataset.k]) delete sv.up[b.dataset.k]; save(); break;
    case "upAll": for (const k in UPGRADES) sv.up[k] = true; save(); break;
    case "upNone": sv.up = {}; save(); break;
    case "jump": { const i = +b.dataset.i; sv.gal.cur = i; save(); if (typeof setSkyPlanet === "function" && R3.gl) setSkyPlanet(i); if (BASE) BASE.selected = null; GAL_SEL = i; break; }
    case "reroll": { const c = curSystem(); sv.gal.slots[c] = sv.gal.slots[c].map(v => v + 1); save(); if (BASE) BASE.selected = null; break; }
    case "foe": try { localStorage.setItem(FOE_KEY, foeMode() === "human" ? "bug" : "human"); } catch (_) {} break;
    case "god": window.__god = !window.__god; break;
    case "stam": window.__stam = !window.__stam; break;
    case "invis": window.__invis = !window.__invis; if (window.__invis && inMission()) for (const q of F.bugs) if (!q.exhibit && q.state === "hunt") { q.state = "idle"; q.home = { x: q.x, z: q.z }; q.shooting = false; } break;
    case "ohk": window.__ohk = !window.__ohk; break;
    case "speed": window.__speed = +b.dataset.v; break;
    case "time": window.__time = +b.dataset.v; break;
    case "freeze": window.__freeze = !window.__freeze; break;
    case "spawn": if (p) { const x = p.x + Math.cos(p.yaw) * 12, z = p.z + Math.sin(p.yaw) * 12, q = spawnBug(b.dataset.t, x, z, "idle"); q.face = p.yaw + Math.PI; q.home = { x, z }; } break;
    case "hud": DEV.noHud = !DEV.noHud; for (const id of ["fhud", "basehud", "f-helm"]) { const e2 = document.getElementById(id); if (e2) e2.style.visibility = DEV.noHud ? "hidden" : ""; } break;
    case "dwGo": { const bio = b.dataset.b; if (DW.on) { devWorldLeave(); } devToggle(false); setTimeout(() => devWorldEnter(bio), 30); return; }
    case "dwBack": devToggle(false); devWorldLeave(); return;
    case "dwSpin": DW.spin = !DW.spin; break;
    case "ammo": DEV.ammo = !DEV.ammo; break;
    case "refill": if (p) { p.hp = F.lo.hp; p.ammo = F.lo.mag; p.mags = F.lo.mags; p.gren = F.lo.gren; p.stims = F.lo.stims; for (const s of F.slots) { s.ammo = s.mag; s.left = s.mags; } } break;
    case "cds": if (p) for (const k in STRATS) { F.cd[k] = 0; F.rearm[k] = 0; F.uses[k] = (STRATS[k].uses || 0) + (STRATS[k].kind === "eagle" ? F.lo.eagleBonus : 0); } break;
    case "kill": if (p) for (const bg of F.bugs) if (bg.hp > 0) hurtBug3(bg, 1e7, bg.x, bg.z, "blast"); break;
    case "obj": if (p) objectiveDone3(); break;
    case "tpExt": if (p) { p.x = F.ext.x + 4; p.z = F.ext.z; p.y = fieldH(p.x, p.z); } break;
    case "win": if (p) { objectiveDone3(); p.x = F.ext.x + 4; p.z = F.ext.z; p.y = fieldH(p.x, p.z); } break;
    case "pix": if (!PIX.on) { PIX.on = true; PIX.k = 1; } else if (PIX.k === 1) PIX.k = 2; else PIX.on = false; try { localStorage.setItem("dz_pix2", PIX.on ? PIX.k : 0); } catch (_) {} break;
    case "spiders": DEBUG_SPIDERS = !DEBUG_SPIDERS; break;
    case "fps": DEV.fps = !DEV.fps; document.getElementById("dev-fps").hidden = !DEV.fps; break;
    case "stats": Object.assign(sv, { missions: 0, wins: 0, best: 1, kills: 0, deaths: 0, extracted: 0, totalReq: 0 }); save(); break;
    case "wipe": if (DEV.wipeArm > performance.now()) { writeSave(freshSave()); DEV.wipeArm = 0; if (BASE) BASE.selected = null; for (const k in hudCache) delete hudCache[k]; } else DEV.wipeArm = performance.now() + 2500; break;
  }
  AU.click(); devRender(); }

// runs every frame from the main loop
function devTick(dt) { if (window.__stam && inMission()) F.p.st = 100; if (typeof devWorldTick === "function") devWorldTick(dt);
  if (DEV.ammo) { if (inMission() && F.p.alive) { F.p.ammo = F.lo.mag; F.p.relT = Math.min(F.p.relT, 0); } if (RANGE.slots) for (const s of RANGE.slots) s.ammo = s.w.mag; }
  if (DEV.fps) { DEV.fpsN++; DEV.fpsT += dt; if (DEV.fpsT >= .5) { DEV.fpsV = Math.round(DEV.fpsN / DEV.fpsT); DEV.fpsN = 0; DEV.fpsT = 0; document.getElementById("dev-fps").textContent = DEV.fpsV + " FPS"; } }
}
