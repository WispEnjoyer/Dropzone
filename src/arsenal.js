// =====================================================================================
//  THE ARSENAL SCREENS: the Armory (a mannequin you dress: primary, sidearm, armour, four stratagems, tint),
//  the Quartermaster's Requisition (a catalogue with a detail plate), and Engineering (ship modules).
//  All three share item icons, stat bars that compare against what you have equipped, and the gothic
//  iron-and-brass panel style of the rest of the game (see the ARSENAL block in template.html).
// =====================================================================================
const KINDS = { w: { label: "PRIMARY", src: () => WEAPONS }, w2: { label: "SIDEARM", src: () => SECONDARIES }, a: { label: "ARMOUR", src: () => ARMORS }, s: { label: "STRATAGEM", src: () => STRATS } };
const itemDef = (kind, k) => KINDS[kind].src()[k];
function itemState(kind, k, sv) { const owned = sv.owned[kind].includes(k), def = itemDef(kind, k);
  if (owned) return { owned: true }; if (!gearUnlocked(k, sv)) return { cls: true, where: SYSTEMS[CLASSIFIED[k]].name }; return { price: def.price || 0 }; }
function equippedOf(kind, sv) { return kind === "w" ? sv.lo.w : kind === "w2" ? sv.lo.w2 : kind === "a" ? sv.lo.a : null; }

// ---------- icons ----------
const SIDE_SVG = {
  pistol: `<path d="M6 10h28v6H18l-2 10h-7l2-10H6z" fill="#8a9098"/><rect x="6" y="9" width="28" height="3" fill="#b8bec6"/><rect x="11" y="18" width="4" height="7" fill="#3a3f46"/>`,
  revolver: `<path d="M4 11h20v4H4z" fill="#b8bec6"/><rect x="22" y="9" width="9" height="9" rx="2" fill="#8a9098"/><path d="M28 17h6l-2 11h-7z" fill="#6a4a2a"/><circle cx="26.5" cy="13.5" r="2" fill="#3a3f46"/>`,
  mpistol: `<path d="M4 9h30v7H22l-1 4h-4l1-4H4z" fill="#8a9098"/><rect x="15" y="16" width="5" height="12" fill="#3a3f46"/><path d="M24 16h6l-2 9h-5z" fill="#4a5058"/><rect x="4" y="8" width="30" height="2" fill="#b8bec6"/>`,
};
function itemIcon(kind, k, cls = "") {
  if (kind === "w") { const src = typeof FIELDART !== "undefined" && FIELDART["wp_" + k]; return src ? `<span class="ico ${cls}"><img class="wpi" src="${src}"></span>` : `<span class="ico ${cls}">${k}</span>`; }
  if (kind === "w2") return `<span class="ico ${cls}"><svg viewBox="0 0 40 32" class="svi">${SIDE_SVG[k] || SIDE_SVG.pistol}</svg></span>`;
  if (kind === "a") return `<span class="ico ${cls}"><canvas class="armc" data-a="${k}"></canvas></span>`;
  if (kind === "s") { const S = STRATS[k]; return `<span class="ico ${cls}"><span class="sic ${S.kind}">${stratIc(k)}</span></span>`; }
  if (kind === "m") { const src = typeof FIELDART !== "undefined" && FIELDART["up_" + k]; return src ? `<span class="ico ${cls}"><img class="upi" src="${src}"></span>` : `<span class="ico ${cls}"><svg viewBox="0 0 32 32" class="svi">${MOD_SVG[k] || ""}</svg></span>`; }
  return ""; }
const MOD_SVG = {
  hellpod: `<path d="M16 3l7 6v12l-7 8-7-8V9z" fill="#4a7344" stroke="#c9a24a" stroke-width="1.5"/><path d="M16 29v-6" stroke="#ff6a4a" stroke-width="3"/>`,
  webbing: `<rect x="6" y="8" width="20" height="16" fill="#5a5a40" stroke="#c9a24a" stroke-width="1.5"/><path d="M6 14h20M6 19h20M13 8v16M19 8v16" stroke="#2a2a20" stroke-width="2"/>`,
  coolant: `<circle cx="16" cy="16" r="10" fill="#1e2a3a" stroke="#c9a24a" stroke-width="1.5"/><path d="M16 8v16M8 16h16M10.5 10.5l11 11M21.5 10.5l-11 11" stroke="#7ac0ff" stroke-width="2"/>`,
  bays: `<path d="M4 18l12-10 12 10-5 1-7-5-7 5z" fill="#8a9098" stroke="#c9a24a" stroke-width="1.5"/><rect x="11" y="20" width="10" height="6" fill="#ff6a4a"/>`,
};
// the armory mannequins, front frame, with the cloth in a tint (the same recolouring as the 3D mannequins)
function mannequinCanvas(c, k, hex) { const map = { light: "armL", medium: "armM", heavy: "armH", superheavy: "armH" }, S = SP[map[k] + "0"], L = SP.armL0, M = SP.armM0, H = SP.armH0;
  if (!S) { c.width = 32; c.height = 48; return; } const col = hex ? hexRGB(hex) : null, d = new Uint8ClampedArray(S.w * S.h * 4), lum = j => (S.d[j] * .3 + S.d[j + 1] * .59 + S.d[j + 2] * .11) / 255;
  let x0 = S.w, x1 = 0, y0 = S.h, y1 = 0;
  for (let j = 0, p = 0; j < S.d.length; j += 4, p++) { if (!S.d[j + 3]) continue; const x = p % S.w, y = (p / S.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    let cloth = false; if (col && L && M && H && L.w === S.w) for (let q = 0; q < 3; q++) if (L.d[j + q] !== M.d[j + q] || H.d[j + q] !== M.d[j + q]) cloth = true;
    const kk = .45 + lum(j) * 1.1; for (let q = 0; q < 3; q++) d[j + q] = cloth ? Math.min(255, col[q] * kk) : S.d[j + q]; d[j + 3] = 255; }
  const pad = 2, w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2; c.width = w; c.height = h; const g = c.getContext("2d"), im = new ImageData(S.w, S.h); im.data.set(d);
  const t = document.createElement("canvas"); t.width = S.w; t.height = S.h; t.getContext("2d").putImageData(im, 0, 0); g.drawImage(t, x0 - pad, y0 - pad, w, h, 0, 0, w, h); }
function mountArmCanvases(hex) { document.querySelectorAll("canvas.armc").forEach(c => mannequinCanvas(c, c.dataset.a, c.dataset.tint !== undefined ? c.dataset.tint || null : hex)); }
const tintHex = sv => { const R = sv.lo.tint && RANKS.find(R => R.tint && R.tint[0] === sv.lo.tint); return R ? R.tint[1] : null; };

// ---------- stat bars, compared with what's equipped ----------
const STATDEF = {
  w: [["DAMAGE", w => w.dmg * w.pellets, 160], ["FIRE RATE", w => 60 / w.rate, 1000], ["MAGAZINE", w => w.mag, 50], ["HANDLING", w => 3 - w.reload, 2], ["ACCURACY", w => 1 / (w.spread + .01), 70]],
  a: [["ARMOUR", a => a.hp, 175], ["SPEED", a => a.spd, 1.15], ["STAMINA", a => a.regen, 1.4], ["DAMAGE RESIST", a => 1.05 - a.mul, .38]],
  s: [["CALL-IN", S => 4 - S.delay, 3.5], ["AVAILABILITY", S => S.uses ? 1 - S.rearm / 300 : 1 - S.cd / 300, 1]] };
STATDEF.w2 = STATDEF.w;
function statBars(kind, k, cmpK) { const D = STATDEF[kind]; if (!D) return ""; const it = itemDef(kind, k), cm = cmpK && cmpK !== k ? itemDef(kind, cmpK) : null;
  return `<div class="sbars">${D.map(([lab, f, max]) => { const v = clamp(f(it) / max, .03, 1), c = cm ? clamp(f(cm) / max, .03, 1) : null, diff = c == null ? "" : v > c + .01 ? "up" : v < c - .01 ? "dn" : "";
    return `<div class="sb ${diff}"><span>${lab}</span><i><b style="width:${v * 100}%"></b>${c != null ? `<em style="left:${c * 100}%"></em>` : ""}</i></div>`; }).join("")}</div>`; }
function itemFacts(kind, k) { const it = itemDef(kind, k);
  if (kind === "w" || kind === "w2") return [["DMG", it.pellets > 1 ? `${it.dmg}×${it.pellets}` : it.dmg], ["RPM", Math.round(60 / it.rate)], ["MAG", it.mag], ["RELOAD", it.reload + "s"]];
  if (kind === "a") return [["HP", it.hp], ["SPEED", Math.round(it.spd * 100) + "%"], ["STAMINA", Math.round(it.regen * 100) + "%"]];
  if (kind === "s") return [["CODE", codeHtml(it.code)], ["CALL-IN", it.delay + "s"], [it.uses ? "USES" : "COOLDOWN", it.uses ? `${it.uses} · rearm ${it.rearm}s` : it.cd + "s"]];
  return []; }
const itemType = (kind, k) => { const it = itemDef(kind, k); return kind === "s" ? ({ eagle: "Eagle strike", orbital: "Orbital", support: "Support drop" }[it.kind] || "Stratagem") : kind === "a" ? "Armour" : it.type + (kind === "w2" ? (it.semi ? " · semi-auto" : " · full-auto") : ""); };
const itemDesc = (kind, k) => kind === "s" ? STRAT_DESC[k] : itemDef(kind, k).desc;
function detailPlate(kind, k, sv, action) { const it = itemDef(kind, k), st = itemState(kind, k, sv);
  return `<div class="plate tall">${itemIcon(kind, k, "hero")}<div class="kicker">${KINDS[kind].label}</div><h3>${it.name}</h3><div class="ty">${itemType(kind, k)}</div>
    <p class="desc">${itemDesc(kind, k)}</p>${statBars(kind, k, equippedOf(kind, sv))}
    <div class="facts">${itemFacts(kind, k).map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join("")}</div>
    ${st.cls ? `<div class="lockmsg">CLASSIFIED · liberate ${st.where} to declassify</div>` : ""}<div class="foot">${action || ""}</div></div>`; }

// ---------- ARMORY ----------
const ARS = { slot: "w", sel: null, si: 0 };
function openArmory(flash) {
  const sv = loadSave(), hex = tintHex(sv), slot = ARS.slot, kind = slot === "t" ? null : slot;
  const cur = kind === "s" ? sv.lo.s[ARS.si] : kind ? equippedOf(kind, sv) : null; if (!ARS.sel || (kind && !itemDef(kind, ARS.sel))) ARS.sel = cur || (kind ? Object.keys(KINDS[kind].src())[0] : null);
  const slotBtn = (s, label, inner, cls = "") => `<button class="slot ${cls} ${ARS.slot === s && (s !== "s") ? "on" : ""}" data-s="${s}"><span class="sl-l">${label}</span>${inner}</button>`;
  const stratSlots = [0, 1, 2, 3].map(i => { const k = sv.lo.s[i]; return `<button class="slot strat ${ARS.slot === "s" && ARS.si === i ? "on" : ""}" data-s="s" data-i="${i}"><span class="sl-l">STRATAGEM ${i + 1}</span>${k ? `${itemIcon("s", k)}<b>${STRATS[k].name}</b><small class="code">${codeHtml(STRATS[k].code)}</small>` : `<span class="empty">EMPTY</span>`}</button>`; }).join("");
  // the picker for the active slot
  let picker = "";
  if (kind) { const items = Object.keys(KINDS[kind].src()), sel = ARS.sel;
    picker = `<div class="tiles">${items.map(k => { const st = itemState(kind, k, sv), eq = kind === "s" ? sv.lo.s.includes(k) : cur === k;
        return `<button class="tile ${k === sel ? "on" : ""} ${st.owned ? "" : "lock"} ${eq ? "eq" : ""}" data-k="${k}">${itemIcon(kind, k)}<b>${itemDef(kind, k).name}</b>${eq ? `<em>EQUIPPED</em>` : st.owned ? "" : st.cls ? `<em class="cl">CLASSIFIED</em>` : `<em class="pr">${st.price} REQ</em>`}</button>`; }).join("")}</div>`;
    const st = itemState(kind, sel, sv), eq = kind === "s" ? sv.lo.s[ARS.si] === sel : cur === sel, inOther = kind === "s" && sv.lo.s.includes(sel) && !eq;
    const act = !st.owned ? `<div class="lockmsg">${st.cls ? "" : `Not owned · buy it from the Quartermaster for ${st.price} REQ`}</div>` : eq ? (kind === "s" ? `<button class="btn ghost" id="unequip">REMOVE FROM SLOT</button>` : `<div class="eqmsg">◆ EQUIPPED</div>`) : `<button class="btn" id="equip">${inOther ? "SWAP INTO SLOT " + (ARS.si + 1) : "EQUIP"}</button>`;
    picker += detailPlate(kind, sel, sv, act); }
  else picker = `<div class="tiles tints2">${tintsFor(sv.xp).map(([k, name, hx, r, ok]) => `<button class="tile tn ${(sv.lo.tint || "none") === k ? "on eq" : ""} ${k === "none" || ok ? "" : "lock"}" data-t="${k}"><span class="ico"><canvas class="armc" data-a="${sv.lo.a}" data-tint="${hx || ""}"></canvas></span><b>${name}</b>${k !== "none" && !ok ? `<em class="cl">${RANKS[r].t.toUpperCase()}</em>` : (sv.lo.tint || "none") === k ? "<em>WORN</em>" : ""}</button>`).join("")}</div>
    <p class="hint">Armour tints are earned by rank. You're a ${rankTitle(sv.xp)}.</p>`;
  screen(`<div class="wrap wide fill">${head("ARMORY", "Dress the mannequin: click a slot, pick from the rack")}
    <div class="ars">
      <section class="doll frame">
        <div class="fig"><div class="stand"><canvas class="armc bigman" data-a="${sv.lo.a}"></canvas></div>
          ${slotBtn("w", "PRIMARY", `${itemIcon("w", sv.lo.w)}<b>${WEAPONS[sv.lo.w].name}</b>`, "pos-pri")}
          ${slotBtn("w2", "SIDEARM", `${itemIcon("w2", sv.lo.w2)}<b>${SECONDARIES[sv.lo.w2].name}</b>`, "pos-sec")}
          ${slotBtn("a", "ARMOUR", `${itemIcon("a", sv.lo.a)}<b>${ARMORS[sv.lo.a].name}</b>`, "pos-arm")}
          ${slotBtn("t", "TINT", `<span class="ico"><i class="swatch" style="background:${hex || "#aaa289"}"></i></span><b>${sv.lo.tint || "Standard issue"}</b>`, "pos-tint")}
        </div>
        <div class="strats4">${stratSlots}</div>
        ${flash ? `<div class="lockmsg">${flash}</div>` : ""}
        ${SP.armorer ? npcLine("armorer", "SGT. VIKA RHO · ARMORER", npcPick("armorer", VIKA_LINES), "armorer") : ""}
      </section>
      <section class="pick frame"><div class="kicker big">${kind === "s" ? `STRATAGEM SLOT ${ARS.si + 1}` : slot === "t" ? "ARMOUR TINT" : KINDS[kind].label} · RACK</div>${picker}</section>
    </div></div>`);
  bindClose(); mountNpc(); mountArmCanvases(hex);
  document.querySelectorAll(".slot").forEach(b => b.onclick = () => { AU.click(); ARS.slot = b.dataset.s; if (b.dataset.i != null) ARS.si = +b.dataset.i; ARS.sel = null; openArmory(); });
  document.querySelectorAll(".tile[data-k]").forEach(b => b.onclick = () => { AU.click(); ARS.sel = b.dataset.k; openArmory(); });
  document.querySelectorAll(".tile.tn").forEach(b => b.onclick = () => { if (b.classList.contains("lock")) { AU.fail(); return; } const s2 = loadSave(); s2.lo.tint = b.dataset.t === "none" ? null : b.dataset.t; writeSave(s2); AU.pickup(); applyArmorTint(); openArmory(); });
  const eqb = $("equip"); if (eqb) eqb.onclick = () => { const s2 = loadSave(), k = ARS.sel;
    if (kind === "w") s2.lo.w = k; if (kind === "w2") s2.lo.w2 = k; if (kind === "a") s2.lo.a = k;
    if (kind === "s") { const j = s2.lo.s.indexOf(k), old = s2.lo.s[ARS.si]; if (j >= 0) s2.lo.s[j] = old; s2.lo.s[ARS.si] = k; s2.lo.s = s2.lo.s.filter(Boolean); }
    writeSave(s2); AU.pickup(); if (Math.random() < .5) npcReact("armorer", pick(kind === "w" || kind === "w2" ? VIKA_WEAPON : kind === "a" ? VIKA_ARMOR : VIKA_STRAT)); openArmory(); };
  const un = $("unequip"); if (un) un.onclick = () => { const s2 = loadSave(); s2.lo.s.splice(ARS.si, 1); writeSave(s2); AU.click(); openArmory(s2.lo.s.length < 4 ? "Empty stratagem slot: you'll drop with " + s2.lo.s.length + "." : ""); };
}

// ---------- shared pieces of the three-column station layout ----------
// a tall NPC column: the portrait at full width, their line, then whatever the station wants underneath
function npcCol(T, name, line, vk, extra = "") { return `<section class="frame npccol"><div class="pframe"><span class="npcpic" data-t="${T}"></span></div><div class="kicker">${name}</div>
  <div class="npctext" data-k="${vk}" data-txt="${line.replace(/"/g, "&quot;")}">${line}</div><div class="npcx">${extra}</div></section>`; }
const wallet = sv => `<div class="wallet"><div><small>REQUISITION</small><b>${sv.req}</b></div><div><small>SAMPLES</small><b>${sv.samples}</b></div></div>`;
function kitCard(sv) { const row = (kind, k, lab) => `<div class="kit"><span class="kl">${lab}</span>${itemIcon(kind, k, "sm")}<b>${itemDef(kind, k).name}</b></div>`;
  return `<div class="kicker">YOUR KIT</div>${row("w", sv.lo.w, "PRI")}${row("w2", sv.lo.w2, "SEC")}${row("a", sv.lo.a, "ARM")}<div class="kits">${sv.lo.s.map(k => itemIcon("s", k, "sm")).join("")}</div>`; }

// ---------- REQUISITION ----------
const SHOP = { tab: "w", sel: null };
function openShop() {
  const sv = loadSave(), tab = SHOP.tab, items = Object.keys(KINDS[tab].src()).filter(k => itemDef(tab, k).price);
  if (!SHOP.sel || !items.includes(SHOP.sel)) SHOP.sel = items.find(k => !sv.owned[tab].includes(k)) || items[0];
  const sel = SHOP.sel, st = itemState(tab, sel, sv), can = st.price != null && sv.req >= st.price, it = itemDef(tab, sel);
  const nOwn = items.filter(k => sv.owned[tab].includes(k)).length, nCls = items.filter(k => itemState(tab, k, sv).cls).length;
  const act = st.owned ? `<div class="eqmsg">◆ OWNED · equip it at the Armory</div>` : st.cls ? "" : `<div class="buyrow"><span class="price">${st.price} <small>REQ</small></span><button class="btn" id="buy" ${can ? "" : "disabled"}>${can ? "REQUISITION" : "NOT ENOUGH REQ"}</button></div>`;
  const eqK = equippedOf(tab, sv), cmp = eqK && eqK !== sel ? `<div class="cmp">Bars compare against your <b>${itemDef(tab, eqK).name}</b> <i></i></div>` : "";
  screen(`<div class="wrap wide fill">${head("REQUISITION", "The Quartermaster's catalogue")}
    <div class="st3">
      ${npcCol(SP.quartermaster ? "quartermaster" : "qm", "QUARTERMASTER", npcPick("quartermaster", QM_LINES), "quartermaster", wallet(sv) + kitCard(sv))}
      <section class="frame cat"><div class="kicker big">CATALOGUE</div>
        <div class="tabs">${Object.entries(KINDS).map(([k, K]) => `<button class="tab ${k === tab ? "on" : ""}" data-t="${k}">${K.label}</button>`).join("")}</div>
        <div class="tiles big">${items.map(k => { const s2 = itemState(tab, k, sv); return `<button class="tile ${k === sel ? "on" : ""} ${s2.owned ? "eq" : ""} ${s2.cls ? "lock" : ""}" data-k="${k}">${itemIcon(tab, k)}<b>${itemDef(tab, k).name}</b><span class="tty">${itemType(tab, k)}</span>${s2.owned ? "<em>OWNED</em>" : s2.cls ? `<em class="cl">CLASSIFIED</em>` : `<em class="pr ${sv.req >= s2.price ? "" : "no"}">${s2.price} REQ</em>`}</button>`; }).join("")}</div>
        <div class="catfoot"><span>${nOwn}/${items.length} owned</span>${nCls ? `<span class="cl">${nCls} classified · liberate worlds to declassify</span>` : ""}</div></section>
      <section class="frame pick"><div class="plate tall">${itemIcon(tab, sel, "hero")}<div class="kicker">${KINDS[tab].label}</div><h3>${it.name}</h3><div class="ty">${itemType(tab, sel)}</div>
        <p class="desc">${itemDesc(tab, sel)}</p>${statBars(tab, sel, eqK)}${cmp}
        <div class="facts">${itemFacts(tab, sel).map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join("")}</div>
        ${st.cls ? `<div class="lockmsg">CLASSIFIED · liberate ${st.where} to declassify</div>` : ""}<div class="foot">${act}</div></div></section>
    </div></div>`);
  bindClose(); mountNpc(); mountArmCanvases(tintHex(sv));
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => { AU.click(); SHOP.tab = b.dataset.t; SHOP.sel = null; openShop(); });
  document.querySelectorAll(".tile[data-k]").forEach(b => b.onclick = () => { AU.click(); SHOP.sel = b.dataset.k; openShop(); });
  const bb = $("buy"); if (bb) bb.onclick = () => { const s2 = loadSave(), p = itemDef(tab, sel).price; if (s2.req < p || !gearUnlocked(sel, s2) || s2.owned[tab].includes(sel)) return;
    s2.req -= p; s2.owned[tab].push(sel); writeSave(s2); AU.armed(); npcReact("quartermaster", pick(QM_BUY)); openShop(); };
}

// ---------- ENGINEERING: a blueprint of the ship with a hardpoint for every module ----------
// the hull, top-down, prow to the right (viewBox 300x200, the same 3:2 box the cards are laid out in)
const SHIP_SVG = (() => { let w = "", r = "";
  for (let x = 70; x <= 200; x += 7) w += `<rect x="${x}" y="77" width="2" height="1.4"/><rect x="${x}" y="121.6" width="2" height="1.4"/>`;
  for (let x = 70; x <= 236; x += 18) r += `<path d="M${x} ${73 + (x - 60) * .02}V${127 - (x - 60) * .02}"/>`;
  return `<g class="hull"><path class="h0" d="M22 76L62 68L200 70L250 80L272 92L298 100L272 108L250 120L200 130L62 132L22 124Z"/>
    <path class="h1" d="M60 86L236 90L262 100L236 110L60 114Z"/><g class="ribs">${r}</g><rect class="band" x="66" y="98" width="166" height="4"/>
    <rect class="h2" x="8" y="80" width="18" height="40"/><g class="noz"><rect x="2" y="84" width="7" height="8"/><rect x="2" y="96" width="7" height="8"/><rect x="2" y="108" width="7" height="8"/></g>
    <rect class="h2" x="44" y="88" width="34" height="24"/><g class="win">${w}<rect x="50" y="94" width="22" height="2"/></g>
    <rect class="bay" x="208" y="70" width="32" height="8"/><rect class="bay" x="208" y="122" width="32" height="8"/><rect class="bay" x="158" y="104" width="16" height="12"/>
    ${[[110, 80], [150, 80], [110, 120], [150, 120]].map(([x, y]) => `<g class="bat"><path d="M${x} ${y - 1.5}H${x + 16}M${x} ${y + 1.5}H${x + 16}"/><circle cx="${x}" cy="${y}" r="6"/></g>`).join("")}
    <path class="ram" d="M272 93L299 100L272 107Z"/></g>`; })();
// where each module lives on the hull (viewBox 300x200, prow to the right)
const HARDPOINT = { coolant: [16, 100], seals: [38, 116], relay: [61, 92], scanner: [84, 80], webbing: [104, 104], crates: [128, 118], sentry: [150, 80], hellpod: [166, 110], satchel: [192, 96],
  bays: [224, 74], afterburn: [224, 126], plating: [254, 100] };
const ENGS = { sel: null };
function openEng() {
  const sv = loadSave(), keys = Object.keys(UPGRADES); if (!ENGS.sel || !UPGRADES[ENGS.sel]) ENGS.sel = keys.find(k => !sv.up[k]) || keys[0];
  const k = ENGS.sel, u = UPGRADES[k], own = !!sv.up[k], can = sv.req >= u.req && sv.samples >= u.samples, bar = (have, need) => `<i><b style="width:${Math.min(100, have / need * 100)}%"></b></i>`;
  const nIn = keys.filter(q => sv.up[q]).length, ic = q => typeof FIELDART !== "undefined" && FIELDART["up_" + q];
  const badges = keys.map(q => { const [x, y] = HARDPOINT[q] || [150, 100]; return `<g class="hp ${sv.up[q] ? "in" : ""} ${q === k ? "on" : ""}" data-k="${q}"><circle class="ring" cx="${x}" cy="${y}" r="9.5"/>${ic(q) ? `<image href="${ic(q)}" x="${x - 7.5}" y="${y - 7.5}" width="15" height="15"/>` : `<circle class="dot" cx="${x}" cy="${y}" r="3"/>`}</g>`; }).join("");
  const sel = HARDPOINT[k] || [150, 100], callout = `<path class="callout" d="M${sel[0]} ${sel[1] - 10}V${sel[1] < 100 ? 30 : 170}"/>`;
  const tiles = keys.map(q => `<button class="mt ${q === k ? "on" : ""} ${sv.up[q] ? "eq" : ""}" data-k="${q}">${itemIcon("m", q)}<b>${UPGRADES[q].name}</b>${sv.up[q] ? "<em>INSTALLED</em>" : `<em class="pr ${sv.req >= UPGRADES[q].req && sv.samples >= UPGRADES[q].samples ? "" : "no"}">${UPGRADES[q].req} · ${UPGRADES[q].samples}◆</em>`}</button>`).join("");
  screen(`<div class="wrap wide fill">${head("ENGINEERING", "Ship modules: requisition and samples")}
    <div class="st3 eng">
      ${npcCol(SP.engineer ? "engineer" : "eng", "CHIEF ENGINEER", npcPick("engineer", ENG_LINES), "engineer", wallet(sv) + `<div class="kicker">INSTALLED · ${nIn}/${keys.length}</div><div class="instl">${keys.filter(q => sv.up[q]).map(q => `<div class="kit">${itemIcon("m", q, "sm")}<span>${UPGRADES[q].name}</span></div>`).join("") || `<p class="hint">Nothing yet. The ship flies stock.</p>`}</div>`)}
      <section class="frame schemf"><div class="kicker big">SHIP SCHEMATIC · SES STARFALL <span class="cnt">${nIn}/${keys.length} MODULES</span></div>
        <div class="schemwrap"><div class="schem"><svg viewBox="0 0 300 200" class="ship">${SHIP_SVG}${callout}${badges}</svg>
          <div class="sclabel ${sel[1] < 100 ? "top" : "bot"}" style="left:${sel[0] / 3}%">${u.name}</div></div></div>
        <div class="mtiles">${tiles}</div></section>
      <section class="frame pick"><div class="plate tall">${itemIcon("m", k, "hero")}<div class="kicker">SHIP MODULE</div><h3>${u.name}</h3><div class="ty">${own ? "Installed" : "Not installed"}</div>
        <p class="desc">${u.desc}</p>
        <div class="sbars"><div class="sb ${sv.req >= u.req ? "up" : "dn"}"><span>REQUISITION ${Math.min(sv.req, u.req)}/${u.req}</span>${bar(sv.req, u.req)}</div><div class="sb ${sv.samples >= u.samples ? "up" : "dn"}"><span>SAMPLES ${Math.min(sv.samples, u.samples)}/${u.samples}</span>${bar(sv.samples, u.samples)}</div></div>
        <div class="foot">${own ? `<div class="eqmsg">◆ INSTALLED</div>` : `<button class="btn" id="inst" ${can ? "" : "disabled"}>${can ? "INSTALL" : "NEED MORE"}</button>`}</div></div></section>
    </div></div>`);
  bindClose(); mountNpc();
  document.querySelectorAll(".mt[data-k], .hp[data-k]").forEach(b => b.onclick = () => { AU.click(); ENGS.sel = b.dataset.k; openEng(); });
  const ib = $("inst"); if (ib) ib.onclick = () => { const s2 = loadSave(); if (s2.req < u.req || s2.samples < u.samples) return; s2.req -= u.req; s2.samples -= u.samples; s2.up[k] = 1; writeSave(s2); AU.armed(); npcReact("engineer", pick(ENG_DONE)); openEng(); };
}
