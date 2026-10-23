// =====================================================================================
//  TUTORIAL: your first time aboard. Short cutscenes (the old intro's shots) set the scene; between
//  them you play: walk the ship, open the war table, visit the armory, shoot on the range, board a pod,
//  then a real drop onto Myrrh IV where the crew talk you through a fight, a stratagem, the uplink and
//  the extraction. Training rules on the ground: it hurts, but you can't die. Hold X to skip it all.
// =====================================================================================
const TUT = { on: false, i: -1, t: 0, flags: {}, q: [], cur: null, gap: 0, skipT: 0, done: false };
const ARROW = { U: "↑", D: "↓", L: "←", R: "→" };
const tutLine = (who, text) => TUT.q.push({ who, text });
const tutLive = () => (TUT.group || []).filter(b => b.dead == null);
function tutSpawn(n, d, side, spread, fodder) { const p = F.p, f = [Math.cos(p.yaw), Math.sin(p.yaw)], out = [];
  for (let k = 0; k < n; k++) { const s = side + (k - (n - 1) / 2) * spread, x = p.x + f[0] * d - f[1] * s, z = p.z + f[1] * d + f[0] * s, b = spawnBug("merc", x, z, "idle");
    b.face = Math.atan2(-f[1], -f[0]); b.home = { x: p.x + f[0] * (d * .45) - f[1] * s, z: p.z + f[1] * (d * .45) + f[0] * s }; b.wt = { ...b.home }; b.wT = 99; if (fodder) b.hp = 30; out.push(b); }
  return out; }
function tutStrat() { const L = F.lo.strats, k = ["precision", "eagle", "barrage", "cluster", "rail"].find(s => L.includes(s)) || L[0]; F.cd[k] = 0; return k; }

const TUT_STEPS = [
  { scene: "bridge" },
  { scene: "war" },
  { say: [["nav", "Stretch your legs, trooper. Walk with WASD, look around with the mouse."]], task: "Walk around the bridge", hint: "WASD to walk · mouse to look · SHIFT to run · click the screen to capture the mouse",
    setup() { TUT.p0 = { x: BASE.x, z: BASE.z }; }, done: () => Math.hypot(BASE.x - TUT.p0.x, BASE.z - TUT.p0.z) > 2.5 },
  { say: [["nav", "The war table shows every world we can reach. Walk up to it and take a look."]], task: "Open the war table", hint: "Walk to the hologram in the middle of the bridge and press E", mark: [7, 1.6, 3, "WAR TABLE"], done: () => TUT.flags.war },
  { say: [["nav", "We're already in orbit over Myrrh IV. Other worlds open up later. Close the table when you've had a look."]], task: "Close the war table", hint: "Press E or click LEAVE TABLE", done: () => $("screen").hidden },
  { say: [["armorer", "Over here! Armory. Your guns, your armour and your stratagems are all set here."]], task: "Visit the armory", hint: "Talk to Sgt. Rho or use the armory terminal (E)", mark: [3.4, 2.3, 7.4, "ARMORY"], done: () => TUT.flags.armory },
  { say: [["armorer", "Click anything you own to equip it. New gear is bought from the Quartermaster."]], task: "Close the armory", hint: "ESC or the close button", done: () => $("screen").hidden },
  { say: [["qm", "Range is hot. Walk through the door and your gun comes out on its own."], ["qm", "Put three targets down."]], task: "Shoot down 3 targets at the firing range", hint: "Through the door on the east side · click to shoot · 1 / 2 swaps weapons",
    mark: [16, 1.6, 11, "FIRING RANGE"], setup() { TUT.k0 = RANGE.kills; }, progress: () => `${Math.min(3, RANGE.kills - TUT.k0)} / 3`, done: () => RANGE.kills - TUT.k0 >= 3 },
  { say: [["qm", "Good shooting. Now reload before you run dry, not after."]], task: "Reload", hint: "Press R", done: () => RANGE.relT > 0 },
  { say: [["chief", "Launch bay, trooper! Operations are chosen at the Starfall pods. Pod two is fuelled for you."]], task: "Board a Starfall pod", hint: "Walk to a pod in the launch bay and press E", mark: [7, 2.4, 15.7, "STARFALL POD"], done: () => TUT.flags.pod },
  { scene: "drop" },
  // ---------- on the ground ----------
  { field: true, say: [["you", "Boots on the ground."], ["dest", "Skull Company patrol moving on your position. Take them out."]], task: "Take out the patrol",
    hint: "Click to fire · aim for the head · R to reload · C to dive · SHIFT to sprint", setup() { TUT.group = tutSpawn(3, 30, 0, 5, true); }, progress: () => `${3 - tutLive().length} / 3`, done: () => !tutLive().length },
  { field: true, say: [["dest", "Another squad dug in ahead. Don't fight fair: call down an orbital strike on them."]], task: "Call in a stratagem on the squad",
    hint: () => { const S = STRATS[TUT.strat]; return `Hold <kbd>Q</kbd> · type ${S.code.split("").map(c => `<kbd>${ARROW[c]}</kbd>`).join("")} (arrows or WASD) · let go of Q · click to throw the beacon at them`; },
    setup() { TUT.strat = tutStrat(); TUT.group = tutSpawn(4, 42, 0, 2.5, false); for (const b of TUT.group) { b.home = { x: b.x, z: b.z }; b.wt = { ...b.home }; } TUT.beacons = F.stats.strats; },
    mark: () => tutLive().length ? [tutLive()[0].x, 2.4, tutLive()[0].z, "SQUAD"] : null, done: () => F.stats.strats > TUT.beacons },
  { field: true, say: [["dest", "Strike inbound. Keep your head down, then mop up whatever's left."]], task: "Clear the rest of the squad", progress: () => `${tutLive().length} left`, done: () => !tutLive().length, timeout: 35 },
  { field: true, say: [["dest", "The colony's uplink is still standing. Get it transmitting."]], task: "Get to the uplink terminal", hint: "Follow the UPLINK marker · press E at the terminal", done: () => !!F.code || F.term.state !== "idle" },
  { field: true, say: [["dest", "It wants an access code. Punch it in."]], task: "Enter the access code", hint: "Press the arrows (or WASD) in the order shown · a mistake starts it over", done: () => F.term.state !== "idle" },
  { field: true, say: [["dest", "Upload's running, and every merc in the valley heard it. Hold that terminal."]], task: "Defend the terminal until the upload is done", hint: "Stay close · enemies on the terminal stop the upload",
    progress: () => `${Math.floor(F.term.prog * 100)}%`, done: () => F.obj.done },
  { field: true, say: [["dest", "Upload complete. Good work. Pelican's waiting for your call at the extraction pad."]], task: "Get to the extraction pad and call the Pelican",
    hint: "Follow the EXTRACT marker · press E at the pad's terminal", setup() { tutTeleportToExt(); }, done: () => F.ext.state !== "ready" },
  { field: true, say: [["pel", "Pelican one, inbound. Hold the landing zone until I'm on station."]], task: "Hold the landing zone", progress: () => F.ext.state === "called" ? `${Math.ceil(F.ext.t)} s` : "", done: () => F.ext.state === "rope" || F.ext.state === "climb" },
  { field: true, say: [["pel", "Rope's down. Climb aboard and let's go home."]], task: "Grab the rope", hint: "Walk to the rope under the Pelican and press E", done: () => F.ext.state === "climb" || F.ext.state === "away" },
  { field: true, task: "", done: () => false },
];

// ---------- running it ----------
function startTutorial() { try { localStorage.setItem(INTRO_SEEN, "1"); } catch (_) {}
  AU.init(); Object.assign(TUT, { on: true, i: -1, t: 0, flags: {}, q: [], cur: null, gap: 0, skipT: 0, done: false, group: [] }); INTRO.said = new Set();
  const sv = loadSave(); if (sv.gal.cur !== INTRO_SYS) { sv.gal.cur = INTRO_SYS; writeSave(sv); }
  enterBase(); setSkyPlanet(INTRO_SYS);
  const m = systemMissions(INTRO_SYS)[0]; m.mods = []; m.obj = "uplink"; INTRO.fld = {}; INTRO.gen = generateField(m, INTRO.fld); INTRO.loaded = false;   // the jungle builds while you walk the ship
  initBugSprites(); ensurePodModels(); tutEl().hidden = false; tutNext(); }
function tutNext() { TUT.i++; TUT.t = 0; const S = TUT_STEPS[TUT.i]; if (!S) return;
  if (S.scene) { tutEl().hidden = true; playScene(S.scene, () => { tutEl().hidden = false; if (S.scene === "drop") show("f-play", true); tutNext(); }); return; }
  TUT.q = []; if (TUT.cur && S.say) TUT.cur.t = Math.min(TUT.cur.t, .4);   // a new step: drop lines nobody got to hear
  if (S.setup) S.setup(); for (const [w, tx] of S.say || []) tutLine(w, tx); if (S.task) { AU.armed(); } }
// every frame, from the main loop
function tutTick(dt) { if (!TUT.on) return; if (!INTRO.loaded && INTRO.gen) introGen(5); if (INTRO.on) { TUT.el && (TUT.el.hidden = true); return; }
  const S = TUT_STEPS[TUT.i]; if (!S) return; TUT.t += dt;
  if (keys.has("x")) { TUT.skipT += dt; if (TUT.skipT > 1.2) return tutQuit(); } else TUT.skipT = 0;
  // on the ground: only the training's own enemies come at you
  if (F && !DROP) { F.patrolT = 1e9; F.breachCool = Math.max(F.breachCool, 1e6); for (const n of F.nests || []) n.spT = 1e9; }
  // the crew talk one line at a time, each up long enough to read
  if (TUT.cur) { TUT.cur.t -= dt; if (TUT.cur.t <= 0) { TUT.cur = null; TUT.gap = .35; } }
  else if ((TUT.gap -= dt) <= 0 && TUT.q.length) { const l = TUT.q.shift(); l.t = lineDur(l.text); TUT.cur = l; introVoice(l); }
  const ok = S.done && S.done(), timed = S.timeout && TUT.t > S.timeout;
  if ((ok || timed) && TUT.t > .6) { if (S.task) { if (F && !DROP) fmsg("", "✓ " + S.task, 1.8); else baseToast("✓ DONE", S.task, 1.8); } tutNext(); }
  tutDraw(S); }
function tutTeleportToExt() { const p = F.p, e = F.ext; flash(.9, "#000000"); p.x = e.x + 22; p.z = e.z + 6; p.y = fieldH(p.x, p.z); p.yaw = Math.atan2(e.z - p.z, e.x - p.x); p.pitch = 0; F.bugs = F.bugs.filter(b => Math.hypot(b.x - e.x, b.z - e.z) > 60); }
// mission over (extracted): the training is done
function tutFinish() { if (!TUT.on) return; TUT.on = false; TUT.done = true; tutEl().hidden = true; }
function tutQuit() { TUT.on = false; tutEl().hidden = true; if (INTRO.on) introSceneDone();
  if (F || DROP) { AU.windStop(); AU.ambStop(); AU.combatStop(); AU.pelican(0); AU.dropStop(); AU.setSpace("in"); $("fhud").hidden = true; if (document.pointerLockElement) document.exitPointerLock();
    if (FLD) { for (const c of FLD.chunks || []) freeParts(c.parts); for (const k of ["parts", "padParts", "nestPartsAlive", "nestPartsDead", "crateParts", "boxParts", "sampleParts", "sentryParts", "gunParts", "rocketParts"]) freeParts(FLD[k]); }
    if (F) for (const o of F.objs) if (o.own) freeParts(o.parts); F = null; DROP = null; FLD = null; BASE.eyeY = null; Object.assign(BASE, { x: 7, z: 10.5, a: -Math.PI / 2, pitch: 0 }); }
  INTRO.gen = null; INTRO.fld = null; BASE.selected = null; enterBase(); baseToast("TRAINING SKIPPED", "Replay it from the title screen any time", 3); }

// ---------- the overlay: what to do now, how, the crew's lines, and a marker ----------
function tutEl() { if (TUT.el) return TUT.el; const st = document.createElement("style"); st.textContent = `
#tut { position: absolute; inset: 0; pointer-events: none; z-index: 40; font-family: "Chakra Petch", sans-serif; }
#tut .task { position: absolute; left: 50%; top: 92px; translate: -50% 0; min-width: 340px; max-width: 62%; background: rgba(8,10,12,.86); border: 1px solid rgba(242,210,48,.35); border-left: 3px solid var(--y); padding: 9px 16px 10px; text-align: left; }
#tut .task .k { font: 9px Silkscreen, monospace; letter-spacing: .16em; color: var(--y); display: flex; justify-content: space-between; gap: 20px; } #tut .task .k i { font-style: normal; color: var(--mut); }
#tut .task .t { font: 700 17px "Chakra Petch", sans-serif; color: #f2ede0; margin-top: 3px; } #tut .task .t b { color: var(--y); margin-left: 8px; font-weight: 700; }
#tut .task .h { font-size: 13px; color: #b8b4a8; margin-top: 3px; } #tut kbd { display: inline-block; min-width: 18px; padding: 1px 5px; margin: 0 2px; background: #1c2026; border: 1px solid #4a4f58; border-bottom-width: 2px; font: 700 13px "Chakra Petch", sans-serif; color: var(--y); text-align: center; } #tut .task .sk { font: 8px Silkscreen, monospace; color: #6a6860; letter-spacing: .12em; margin-top: 6px; }
#tut .say { position: absolute; left: 50%; bottom: 120px; translate: -50% 0; max-width: 64%; background: rgba(4,10,14,.84); border: 1px solid rgba(85,214,255,.35); border-left: 3px solid #55d6ff; padding: 8px 14px; display: flex; gap: 10px; align-items: baseline; }
#tut .say b { font: 10px Silkscreen, monospace; letter-spacing: .12em; color: #55d6ff; white-space: nowrap; } #tut .say span { font-size: 16px; color: #f0ece0; }
#tut .mk { position: absolute; translate: -50% -100%; text-align: center; font: 9px Silkscreen, monospace; letter-spacing: .12em; color: var(--y); text-shadow: 0 2px 0 #000; }
#tut .mk i { display: block; width: 12px; height: 12px; margin: 0 auto 3px; border: 2px solid var(--y); rotate: 45deg; }`;
  document.head.appendChild(st); const el = TUT.el = document.createElement("div"); el.id = "tut"; el.hidden = true; el.innerHTML = `<div class="task"></div><div class="say"></div><div class="mks"></div>`; STAGE.appendChild(el); return el; }
function tutDraw(S) { const el = tutEl(); el.hidden = false; const task = el.querySelector(".task"), say = el.querySelector(".say"), mks = el.querySelector(".mks");
  const n = TUT_STEPS.filter(s => s.task).length, k = TUT_STEPS.slice(0, TUT.i + 1).filter(s => s.task).length, hint = typeof S.hint === "function" ? S.hint() : S.hint || "", prog = S.progress ? S.progress() : "";
  const html = S.task ? `<div class="k"><span>TRAINING · ${k} / ${n}</span><i>${S.field ? "MYRRH IV" : "ABOARD THE SHIP"}</i></div><div class="t">${S.task}${prog ? `<b>${prog}</b>` : ""}</div>${hint ? `<div class="h">${hint}</div>` : ""}<div class="sk">HOLD X TO SKIP THE TRAINING</div>` : "";
  if (task.dataset.h !== html) { task.dataset.h = html; task.innerHTML = html; task.hidden = !S.task; }
  const l = TUT.cur, sh = l ? `<b>${INTRO_CAST[l.who].name}</b><span>${l.text}</span>` : ""; if (say.dataset.h !== sh) { say.dataset.h = sh; say.innerHTML = sh; say.hidden = !l; }
  // the marker: where the task is
  const M = typeof S.mark === "function" ? S.mark() : S.mark; let mh = "";
  if (M && R3.lastVP && $("screen").hidden) { const y = F && S.field ? fieldH(M[0], M[2]) + M[1] : M[1], s = project(R3.lastVP, M[0], y, M[2]);
    const me = F && S.field ? F.p : BASE, d = Math.hypot(M[0] - me.x, M[2] - me.z); if (s && d > 2.2) mh = `<div class="mk" style="left:${clamp(s[0], 40, stageW - 40) | 0}px;top:${clamp(s[1], 80, stageH - 80) | 0}px"><i></i>${M[3]}<br>${d | 0} m</div>`; }
  if (mks.dataset.h !== mh) { mks.dataset.h = mh; mks.innerHTML = mh; } }

// ---------- hooks into the ship: what you opened, and the pod that starts the drop ----------
{ const _board = showBoard; showBoard = function (...a) { if (TUT.on) TUT.flags.war = true; return _board.apply(this, a); };
  const _arm = openArmory; openArmory = function (...a) { if (TUT.on) TUT.flags.armory = true; return _arm.apply(this, a); };
  const _pod = tryBoardPod; tryBoardPod = function (near) { const S = TUT.on && TUT_STEPS[TUT.i]; if (S && S.mark && S.mark[3] === "STARFALL POD") { TUT.flags.pod = true; return; } if (TUT.on && !TUT.flags.pod) { baseToast("NOT YET", "Finish the training step first", 2); return; } return _pod.apply(this, arguments); };
  const _end = fieldEnd; fieldEnd = function (win) { const was = TUT.on; tutFinish(); const r = _end.apply(this, arguments); if (was) { const h = document.querySelector("#screen h1"); if (h && win) h.textContent = "TRAINING COMPLETE"; } return r; };
  const _enter = enterBase; enterBase = function (fromMission) { const r = _enter.apply(this, arguments); if (fromMission && TUT.done) { TUT.done = false; baseToast("TRAINING COMPLETE", "You're on your own now. Pick an operation at the launch bay.", 4.5); } return r; }; }
