// ---------- station panels (flat 2D menus over the 3D room) ----------
const head = (title, sub = "") => `<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h2 class="logo" style="font-size:40px">${title}</h2>${sub ? `<p class="tag" style="margin:6px 0 0">${sub}</p>` : ""}</div>
  <div class="row"><span class="reqline">REQ <b>${loadSave().req}</b> · SAMPLES <b>${loadSave().samples}</b></span><button class="btn ghost" id="close" style="padding:8px 14px;font-size:12px">BACK [E]</button></div></div>`;
const bindClose = () => { const c = $("close"); if (c) c.onclick = backToBase; };
// ---------- speaking NPCs: each line types out with a babbling voice ----------
const VOICES = { armorer: { pitch: 520, excited: true }, quartermaster: { pitch: 380, wave: "sine", gain: .1 }, engineer: { pitch: 440 }, navigator: { pitch: 190, wave: "square", gain: .045 }, comms: { pitch: 260, wave: "square", gain: .045 } };
let NPC_SAID = {};    // what each NPC is currently saying this visit, so re-drawing a panel doesn't make them repeat themselves
function npcPick(k, lines) { if (!NPC_SAID[k]) NPC_SAID[k] = { text: pick(lines), typed: false }; return NPC_SAID[k].text; }
function npcReact(k, text) { NPC_SAID[k] = { text, typed: false }; }
function typeLine(el, text, voice, onDone) {
  clearInterval(el._tw); let i = 0; el.textContent = ""; el.classList.add("typing");
  el._tw = setInterval(() => { i++; el.textContent = text.slice(0, i); const ch = text[i - 1];
    if (voice && i % 2 === 1 && /[a-z]/i.test(ch)) AU.babble(ch, voice);
    if (i >= text.length) { clearInterval(el._tw); el.classList.remove("typing"); onDone && onDone(); } }, 26);
  el.onclick = () => { clearInterval(el._tw); el.textContent = text; el.classList.remove("typing"); onDone && onDone(); };
}
function npcLine(T, name, line, vk = T) { return `<div class="npc"><span class="npcpic" data-t="${T}"></span><div><b style="color:var(--y);font:700 12px Silkscreen,monospace;letter-spacing:.1em">${name}</b><div class="npctext" data-k="${vk}" data-txt="${line.replace(/"/g, "&quot;")}" style="margin-top:4px">${line}</div></div></div>`; }
function mountNpc() {
  document.querySelectorAll(".npctext").forEach(el => { const k = el.dataset.k, txt = el.dataset.txt, S = NPC_SAID[k];
    if (S && S.text === txt && S.typed) { el.textContent = txt; return; } NPC_SAID[k] = { text: txt, typed: true }; typeLine(el, txt, VOICES[k]); });
  document.querySelectorAll(".npcpic").forEach(el => { const t = el.dataset.t;
  if (typeof PORTRAIT !== "undefined" && PORTRAIT[t]) { const im = new Image(); im.src = PORTRAIT[t]; im.className = "portrait"; el.replaceWith(im); return; }   // hand-drawn bust portrait
  el.replaceWith(texCanvas(SP[t], SP[t].h >= 96 ? 1 : 2)); }); }
function openStation(id) {
  AU.click();
  if (id === "war") { MODE = "base"; showBoard(false); return; }
  if (id === "launch") return openLaunch();
  if (id === "armory") return openArmory();
  if (id === "shop") return openShop();
  if (id === "eng") return openEng();
  if (id === "records") return openRecords();
  if (id === "menu") { screen(`<div class="wrap" style="max-width:520px;padding-top:calc(12 * var(--vh))">${head("SHIP")}<div class="row" style="margin-top:20px"><button class="btn" id="res">RESUME</button><button class="btn ghost" id="ttl">TITLE SCREEN</button></div></div>`);
    bindClose(); $("res").onclick = backToBase; $("ttl").onclick = showTitle; }
}
function openLaunch() {
  const m = BASE.selected;
  if (BASE.jump) { baseToast("DRIVE ENGAGED", "Wait until we drop out of hyperspace", 2.5); AU.fail(); return; }
  if (!m) { showPodMissions(INTER.find(o => o.station === "launch")); return; }
  screen(`<div class="wrap" style="max-width:720px;padding-top:calc(8 * var(--vh))">${head("HELLPOD", "Final check before the drop")}
    <div class="box" style="margin-top:20px"><h4>DESTINATION</h4><div style="font:700 26px Silkscreen,monospace;color:var(--y)">${m.region}</div><div>${m.planet}</div>
      <div style="color:var(--mut)">${BIOMES[m.biome].name} · ${DIFFS[m.diff - 1]} · ${OBJS[m.obj].name}</div>
      <div class="mods" style="margin-top:10px">${m.mods.map(k => `<span>${MODS[k].name}</span>`).join("") || `<span style="border-color:var(--line);color:var(--mut)">No modifiers</span>`}</div></div>
    <div class="box" style="margin-top:12px"><h4>LOADOUT</h4>${loadoutLine()}<div class="mods">${loadSave().lo.s.map(k => `<span style="border-color:var(--line);color:var(--txt)">${STRATS[k].name}</span>`).join("")}</div></div>
    <div class="row" style="margin-top:16px"><button class="btn" id="go" style="padding:16px 34px;font-size:20px">DROP</button><button class="btn ghost" id="armory">CHANGE LOADOUT</button></div></div>`);
  bindClose(); $("go").onclick = () => { AU.pod(); launch(m); }; $("armory").onclick = () => openArmory();
}
function gearCard({ key, kind, title, type, desc, stats = [], on, owned, price, extra = "" }) { const cls = !owned && !gearUnlocked(key, loadSave());
  return `<button class="gi ${on ? "on" : ""} ${owned ? "" : "lock"}" data-k="${key}" data-kind="${kind}">${on ? `<span class="tag2">EQUIPPED</span>` : owned ? "" : cls ? `<span class="tag2" style="color:#ff9a8a" title="Liberate ${SYSTEMS[CLASSIFIED[key]].name} to declassify">CLASSIFIED</span>` : `<span class="tag2" style="color:var(--mut)">LOCKED · ${price}</span>`}
    <h5>${title}</h5><div class="ty">${type}</div><p>${desc}</p><div class="sts">${stats.map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join("")}</div>${extra}</button>`;
}
const wStats = w => [["DMG", w.pellets > 1 ? `${w.dmg}×${w.pellets}` : w.dmg], ["RPM", Math.round(60 / w.rate)], ["MAG", w.mag], ["RELOAD", w.reload + "s"]];
const aStats = a => [["HP", a.hp], ["SPEED", Math.round(a.spd * 100) + "%"], ["STAMINA", Math.round(a.regen * 100) + "%"]];
const codeHtml = c => [...c].map(x => ARW[x]).join(" ");
const VIKA_LINES = ["\"Pick your poison. Bring it back in one piece, or at least bring back the magazine.\"", "\"Shotgun's for people who like the bugs close. I don't judge. Much.\"", "\"Heavy armor won't save you from your own airstrike. Ask me how I know.\"", "\"Every rifle on that wall is zeroed. Mostly.\""];
const VIKA_WEAPON = ["\"Good choice. Keep the barrel out of the dirt.\"", "\"That one kicks. You'll love it.\"", "\"Cleaned it this morning. Don't make me do it again tonight.\""];
const VIKA_ARMOR = ["\"Fits you better than the last guy. He was taller. Was.\"", "\"Straps go over the shoulders, not around the neck.\""];
const VIKA_STRAT = ["\"Logged. Command will love the paperwork.\"", "\"Throw it far. Then throw yourself the other way.\""];
const QM_BUY = ["\"Pleasure doing business, trooper.\"", "\"Signed, stamped, yours. No refunds.\"", "\"Try to bring that one back in one piece.\""];
const ENG_LINES = ["\"Bring me samples and requisition and I'll make this tub do things the brass never approved.\"", "\"Reactor's humming nicely today. Don't touch it.\"", "\"Everything on this ship is held together by me and tape. Mostly me.\""];
const ENG_DONE = ["\"Installed. Don't ask how.\"", "\"There. Better than factory spec. Illegal, but better.\"", "\"Done. If it catches fire, it wasn't me.\""];
const QM_LINES = ["\"Requisition doesn't grow on trees, trooper. It grows on bug corpses.\"", "\"Everything here's been field tested. Mostly by people who came back.\"", "\"You break it, you bought it. You already bought it.\""];
function openRecords() {
  const sv = loadSave(), rate = sv.missions ? Math.round(sv.wins / sv.missions * 100) : 0, r = rankOf(sv.xp), nx = RANKS[r + 1], nMed = Object.keys(MEDALS).filter(k => sv.medals[k]).length;
  const nextTint = RANKS.slice(r + 1).find(R => R.tint);
  screen(`<div class="wrap wide fill">${head("SERVICE RECORD", "Everything Command knows about you")}
    <div class="rec">
      <div class="reccol">
        <section class="frame rankcard"><div class="kicker big">RANK</div>
          <div class="rk">${insignia(r, 112)}<div><div class="rt">${RANKS[r].t.toUpperCase()}</div><div class="rx">${sv.xp} XP</div>
            ${nx ? `<div class="xpbar"><i style="width:${(sv.xp - RANKS[r].xp) / (nx.xp - RANKS[r].xp) * 100}%"></i></div><small>${nx.xp - sv.xp} XP to ${nx.t}</small>` : `<small>Highest rank in the fleet.</small>`}</div></div>
          <div class="ladder">${RANKS.map((R, i) => `<span class="${i < r ? "past" : i === r ? "cur" : ""}" title="${R.t}">${insignia(i, 30)}</span>`).join("")}</div>
          ${nextTint ? `<p class="hint">Next armour tint: <b style="color:var(--y)">${nextTint.tint[0]}</b> at ${nextTint.t}</p>` : ""}</section>
        <div class="stats">${[["MISSIONS", sv.missions], ["SUCCESS", rate + "%"], ["KILLS", sv.kills], ["DEATHS", sv.deaths], ["EXTRACTIONS", sv.extracted], ["REQ EARNED", sv.totalReq], ["SAMPLES", sv.samples], ["GEAR OWNED", sv.owned.w.length + sv.owned.a.length + sv.owned.s.length]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("")}</div>
        <button class="btn ghost" id="wipe" style="font-size:11px;padding:8px 12px;align-self:flex-start">RESET SAVE</button>
      </div>
      <div class="reccol">
        <section class="frame"><div class="kicker big">MEDALS <span class="cnt">${nMed}/${Object.keys(MEDALS).length}</span></div><div class="medals big">${Object.entries(MEDALS).map(([k, M]) => `<div class="md ${sv.medals[k] ? "" : "no"}">${medalIcon(k, 52)}<div><b>${M.name}${sv.medals[k] > 1 ? " ×" + sv.medals[k] : ""}</b><small>${M.desc}</small></div></div>`).join("")}</div></section>
        <section class="frame"><div class="kicker big">THE WAR FOR DRACO</div>${SYSTEMS.map((S, i) => { const P = warInit(sv).planets[i]; return `<div class="warrow"><b style="color:${S.col}">${S.name}</b>${S.locked ? `<span style="color:var(--mut)">🔒 not yet charted</span>` : `${libBar(P, 220)}<span>${P.freed ? "LIBERATED" : Math.floor(P.lib) + "%"}${P.attack ? ` · <span style="color:#ff8a7a">UNDER ATTACK (${P.attack.left})</span>` : ""}</span>`}</div>`; }).join("")}</section>
      </div>
    </div></div>`);
  bindClose(); $("wipe").onclick = () => { if ($("wipe").dataset.sure) { writeSave(freshSave()); openRecords(); } else { $("wipe").dataset.sure = 1; $("wipe").textContent = "CLICK AGAIN TO WIPE EVERYTHING"; } };
}

initArt(); showTitle(); requestAnimationFrame(frame);
