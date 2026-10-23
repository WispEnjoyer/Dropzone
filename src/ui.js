// =====================================================================================
//  RENDER + HUD + MENUS
// =====================================================================================
const cv = $("cv"), ctx = cv.getContext("2d"), buf = document.createElement("canvas"), bx = buf.getContext("2d");
const VIEW = { s: 3, x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 };
function resize() { cv.width = stageW; cv.height = stageH; VIEW.s = Math.max(2, Math.round(stageH / 340)); buf.width = Math.ceil(stageW / VIEW.s); buf.height = Math.ceil(stageH / VIEW.s); VIEW.w = buf.width; VIEW.h = buf.height; }
addEventListener("resize", resize); resize();
const onScreen = (x, y, m = 0) => x > VIEW.x - m && y > VIEW.y - m && x < VIEW.x + VIEW.w + m && y < VIEW.y + VIEW.h + m;
addEventListener("mousemove", e => { mouse.x = e.clientX - stageX; mouse.y = e.clientY - stageY; });
addEventListener("mousedown", e => { AU.init(); if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
addEventListener("mouseup", e => { if (e.button === 0) mouse.down = false; });
addEventListener("contextmenu", e => e.preventDefault());

// ---------- sprites ----------
const SPR = { bug: {}, bugW: {}, bugDead: {} };
function darken(c, col = "rgba(30,18,8,.6)") { const s = document.createElement("canvas"); s.width = c.width; s.height = c.height; const g = s.getContext("2d"); g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = col; g.fillRect(0, 0, s.width, s.height); return s; }
function initArt() {
  SPR.troop = [makeTrooper(0), makeTrooper(1)]; SPR.troopW = silhouette(SPR.troop[0], "#ff6050");
  for (const k in BUGT) { SPR.bug[k] = [makeBug(k, 0), makeBug(k, 1)]; SPR.bugW[k] = silhouette(SPR.bug[k][0]); SPR.bugDead[k] = darken(SPR.bug[k][0]); }
  SPR.hole = pixArt(22, 16, (x, y) => { const d = ((x - 10.5) / 10.5) ** 2 + ((y - 7.5) / 7.5) ** 2, i = ((x - 10.5) / 6) ** 2 + ((y - 8) / 4.2) ** 2; if (i <= 1) return y < 7 ? "#1a0e08" : "#0a0604"; if (d <= 1) return y < 6 ? "#b07a44" : (x + y) % 3 ? "#7a4e28" : "#5a3418"; return null; });
  SPR.holeDead = pixArt(22, 16, (x, y) => { const d = ((x - 10.5) / 10.5) ** 2 + ((y - 7.5) / 7.5) ** 2; if (d > 1) return null; const h = hash2(x, y, 9); return h < .35 ? "#3a2a1c" : h < .6 ? "#5a4430" : h < .7 ? null : "#2a1e14"; });
  SPR.term = pixArt(14, 18, (x, y) => { if (y < 9 && x >= 1 && x <= 12) return y >= 2 && y <= 6 && x >= 3 && x <= 10 ? (y === 3 ? "#9cf0a0" : "#2a6a3a") : "#5a6068"; if (y >= 9 && x >= 4 && x <= 9) return y > 15 ? "#2a2e34" : "#3e444c"; return null; });
  SPR.wreck = pixArt(66, 34, (x, y) => { const hull = ((x - 30) / 26) ** 2 + ((y - 17) / 9) ** 2 <= 1, wing = y >= 6 && y <= 28 && x >= 24 && x <= 38 && Math.abs(y - 17) < 11 - Math.abs(x - 31) * .4, tail = x > 52 && x < 62 && Math.abs(y - 17) < 4;
    if (!(hull || wing || tail)) return null; const h = hash2(x, y, 3); if (h < .07) return null; if (hull && x > 44 && x < 50 && y > 13 && y < 21) return "#1a1a1e"; return y < 15 ? (h < .5 ? "#9a9a92" : "#8a8a82") : h < .3 ? "#4a4a46" : "#6a6a64"; });
  SPR.box = pixArt(8, 7, (x, y) => (y === 0 || y === 6 || x === 0 || x === 7) ? "#7a3a10" : (x + y) % 3 ? "#ff8a2a" : "#ffb04a");
  SPR.crate = pixArt(14, 11, (x, y) => (y === 0 || x === 0 || x === 13 || y === 10) ? "#26282c" : y === 5 ? "#f2d230" : (x + y) % 5 ? "#3e4248" : "#4a4e56");
  SPR.sentryB = pixArt(12, 12, (x, y) => ((x - 5.5) / 5.5) ** 2 + ((y - 5.5) / 5.5) ** 2 <= 1 ? ((x + y) % 4 ? "#4a4e56" : "#f2d230") : null);
  SPR.sentryG = pixArt(14, 6, (x, y) => (y >= 2 && y <= 3 && x >= 4) ? (x > 11 ? "#141414" : "#6a6e76") : ((x - 3) ** 2 + (y - 2.5) ** 2 <= 7 ? "#8a8e96" : null));
  SPR.pod = pixArt(12, 18, (x, y) => { const d = ((x - 5.5) / 5.5) ** 2 + ((y - 9) / 9) ** 2; if (d > 1) return null; if (y > 13) return "#ff8a2a"; return x < 5 ? "#c8c4b4" : x === 5 && y > 3 && y < 11 ? "#f2d230" : "#8a8678"; });
  SPR.sample = pixArt(7, 8, (x, y) => Math.abs(x - 3) + Math.abs(y - 3.5) * .7 < 3.4 ? (x < 3 ? "#c6ff8a" : "#62c23a") : null);
  SPR.bag = pixArt(8, 8, (x, y) => ((x - 3.5) / 3.5) ** 2 + ((y - 4) / 3.6) ** 2 <= 1 ? (y < 3 ? "#9ab84a" : "#6a8a30") : null);
  SPR.ship = pixArt(76, 46, (x, y) => { const body = ((x - 38) / 13) ** 2 + ((y - 22) / 21) ** 2 <= 1, wing = y > 16 && y < 30 && Math.abs(x - 38) < 36 - (y - 16) * .6, eng = (Math.abs(x - 12) < 5 || Math.abs(x - 64) < 5) && y > 12 && y < 34;
    if (!(body || wing || eng)) return null; if (body && y < 10 && Math.abs(x - 38) < 5) return "#86d0ea"; if (eng) return y > 30 ? "#ff8a2a" : "#3a3c42"; if (wing && !body) return (x + y) % 7 ? "#5a5e66" : "#f2d230"; return y < 22 ? "#8a8e96" : "#6a6e76"; });
  SPR.jet = pixArt(30, 24, (x, y) => { const c = 15; return Math.abs(y - 12) < (x - 2) * .45 && x < 28 && Math.abs(y - 12) < 11 ? "#000" : null; }, null);
}

// ---------- render ----------
function render() {
  const p = G.p, m = G.m;
  // camera: lead toward the cursor
  if (p.alive || G.respawnT > 0 || G.pods.length) { const mx = mouse.x / VIEW.s - VIEW.w / 2, my = mouse.y / VIEW.s - VIEW.h / 2;
    const tx = p.x + clamp(mx * .25, -60, 60), ty = p.y + clamp(my * .25, -45, 45); VIEW.cx = VIEW.cx ? lerp(VIEW.cx, tx, .12) : tx; VIEW.cy = VIEW.cy ? lerp(VIEW.cy, ty, .12) : ty; }
  const sh = G.shake;
  VIEW.x = Math.round(clamp(VIEW.cx - VIEW.w / 2, 0, MW * TS - VIEW.w) + frand(-sh, sh) * .6); VIEW.y = Math.round(clamp(VIEW.cy - VIEW.h / 2, 0, MH * TS - VIEW.h) + frand(-sh, sh) * .6);
  const X = x => Math.round(x - VIEW.x), Y = y => Math.round(y - VIEW.y), b = bx, t = G.t;
  b.imageSmoothingEnabled = false; b.fillStyle = "#000"; b.fillRect(0, 0, VIEW.w, VIEW.h);
  b.drawImage(G.map.canvas, VIEW.x, VIEW.y, VIEW.w, VIEW.h, 0, 0, VIEW.w, VIEW.h);
  const spr = (c, x, y, a = 0) => { if (!onScreen(x, y, 40)) return; if (!a) { b.drawImage(c, X(x) - (c.width >> 1), Y(y) - (c.height >> 1)); return; } b.save(); b.translate(X(x), Y(y)); b.rotate(a); b.drawImage(c, -(c.width >> 1), -(c.height >> 1)); b.restore(); };
  const shadow = (x, y, rx, ry = rx * .55) => { if (!onScreen(x, y, 30)) return; b.fillStyle = "rgba(0,0,0,.3)"; b.beginPath(); b.ellipse(X(x), Y(y) + 2, rx, ry, 0, 0, 7); b.fill(); };
  // ground objects
  if (G.ext.state === "ready" || G.ext.state === "called" || G.ext.state === "landed") { b.strokeStyle = `rgba(242,210,48,${.5 + .4 * Math.sin(t * 5)})`; b.lineWidth = 1; b.beginPath(); b.arc(X(G.ext.x), Y(G.ext.y), 40, 0, 7); b.stroke(); }
  for (const n of G.nests) for (const h of n.holes) spr(h.alive ? SPR.hole : SPR.holeDead, h.x, h.y);
  if (G.wreck) spr(SPR.wreck, G.wreck.x, G.wreck.y);
  if (G.term) { spr(SPR.term, G.term.x, G.term.y - 4); if (G.term.state === "upload" && Math.sin(t * 8) > 0) { b.fillStyle = G.term.contested ? "#ff5340" : "#72e06a"; b.fillRect(X(G.term.x) - 1, Y(G.term.y) - 16, 2, 2); } }
  for (const c of G.crates) { spr(SPR.crate, c.x, c.y); if (c.uses <= 0) { b.fillStyle = "rgba(0,0,0,.4)"; b.fillRect(X(c.x) - 7, Y(c.y) - 5, 14, 11); } }
  for (const it of G.items) spr(it.kind === "bag" ? SPR.bag : SPR.sample, it.x, it.y + Math.sin(t * 3 + it.x) * 1.2);
  if (G.box && !G.box.carried) spr(SPR.box, G.box.x, G.box.y);
  for (const br of G.breaches) { if (!onScreen(br.x, br.y, 30)) continue; b.strokeStyle = "rgba(40,20,10,.8)"; b.lineWidth = 1; b.beginPath(); for (let i = 0; i < 7; i++) { const a = i * .9 + br.x; b.moveTo(X(br.x), Y(br.y)); b.lineTo(X(br.x + Math.cos(a) * 16), Y(br.y + Math.sin(a) * 10)); } b.stroke(); }
  for (const s of G.strikes) { if (!s.warn || s.t > 1.4 || !onScreen(s.x, s.y, 60)) continue; const k = s.t / 1.4;
    if (s.meteor) { b.strokeStyle = `rgba(255,120,40,${.9 - k * .5})`; b.lineWidth = 1; b.beginPath(); b.arc(X(s.x), Y(s.y), s.r * (.3 + .7 * k), 0, 7); b.stroke();
      const z = k * 200; b.fillStyle = "#ffb04a"; b.fillRect(X(s.x + z * .5) - 2, Y(s.y - z) - 2, 5, 5); b.fillStyle = "rgba(255,160,60,.5)"; b.fillRect(X(s.x + z * .5 + 3), Y(s.y - z - 6), 3, 3); }
    else if (s.t < .5) { const z = s.t * 500; b.fillStyle = "#fff4b0"; b.fillRect(X(s.x), Y(s.y - z) - 6, 1, 6); b.fillStyle = "rgba(255,83,64,.6)"; b.fillRect(X(s.x) - 1, Y(s.y), 3, 1); } }
  // creatures
  for (const q of G.bugs) shadow(q.x, q.y, BUGT[q.type].r + 1);
  for (const q of G.bugs) { if (!onScreen(q.x, q.y, 30)) continue; const f = SPR.bug[q.type][Math.floor(q.anim * 1.5) % 2], lx = Math.cos(q.a) * q.lunge * 3, ly = Math.sin(q.a) * q.lunge * 3;
    spr(q.flash > 0 ? SPR.bugW[q.type] : f, q.x + lx, q.y + ly, q.a);
    if (q.type === "charger" && q.ch === "wind" && Math.sin(t * 30) > 0) spr(silhouette(f, "#ff5340"), q.x, q.y, q.a);
    if (q.stun > 0) { b.fillStyle = "#fff4b0"; for (let i = 0; i < 3; i++) b.fillRect(X(q.x + Math.cos(t * 6 + i * 2) * 8), Y(q.y - 12 + Math.sin(t * 6 + i * 2) * 2), 1, 1); }
    if (q.type === "charger" && q.hp < q.max) { b.fillStyle = "#000"; b.fillRect(X(q.x) - 11, Y(q.y) - 18, 22, 3); b.fillStyle = "#ff5340"; b.fillRect(X(q.x) - 10, Y(q.y) - 17, Math.ceil(20 * q.hp / q.max), 1); } }
  for (const s of G.sentries) { shadow(s.x, s.y, 6); spr(SPR.sentryB, s.x, s.y); spr(SPR.sentryG, s.x, s.y - 3, s.a); }
  if (p.alive) { shadow(p.x, p.y, 7); const fr = SPR.troop[p.moving ? Math.floor(p.anim) % 2 : 0], dz = p.dive > 0 ? -Math.sin((1 - p.dive / .36) * Math.PI) * 4 : 0;
    spr(p.hurtT > 0 && Math.sin(t * 40) > 0 ? SPR.troopW : fr, p.x, p.y + dz, p.dive > 0 ? p.diveA : p.a);
    if (p.carry) spr(SPR.box, p.x - Math.cos(p.a) * 5, p.y - Math.sin(p.a) * 5 + dz);
    if (p.relT > 0) { const k = 1 - p.relT / relTimeOf(); b.fillStyle = "#000"; b.fillRect(X(p.x) - 9, Y(p.y) - 15, 18, 3); b.fillStyle = "#f2d230"; b.fillRect(X(p.x) - 8, Y(p.y) - 14, Math.round(16 * k), 1); } }
  // projectiles
  for (const o of G.throws) { shadow(o.x, o.y, 2); b.fillStyle = o.type === "beacon" ? beamCol(o.key) : "#3e4a2a"; b.fillRect(X(o.x) - 1, Y(o.y - o.z) - 1, 3, 3);
    if (o.type === "grenade" && o.landed && Math.sin(t * 20) > 0) { b.fillStyle = "#ff5340"; b.fillRect(X(o.x), Y(o.y) - 1, 1, 1); } }
  b.lineWidth = 1;
  for (const s of G.shots) { if (s.rocket) { b.fillStyle = "#ff8a2a"; b.fillRect(X(s.x) - 1, Y(s.y) - 1, 3, 3); continue; } b.strokeStyle = s.heavy ? "#fffbe0" : "rgba(255,236,150,.9)"; b.lineWidth = s.heavy ? 2 : 1; b.beginPath(); b.moveTo(X(s.px) + .5, Y(s.py) + .5); b.lineTo(X(s.x) + .5, Y(s.y) + .5); b.stroke(); b.lineWidth = 1; }
  for (const s of G.spits) { b.fillStyle = "#c6f05a"; b.fillRect(X(s.x) - 1, Y(s.y) - 1, 3, 3); }
  for (const q of G.parts) { if (!onScreen(q.x, q.y, 10)) continue; b.globalAlpha = q.smoke ? clamp(q.life / q.max, 0, 1) * .7 : q.flash ? 1 : clamp(q.life / q.max * 1.5, 0, 1); b.fillStyle = q.col; const z = q.sz; b.fillRect(X(q.x) - (z >> 1), Y(q.y) - (z >> 1), z, z); }
  b.globalAlpha = 1;
  for (const e of G.booms) { if (!onScreen(e.x, e.y, 80)) continue; const k = e.t / .35, r = Math.round(e.r * (.35 + k * .75));
    if (k < .25) { b.fillStyle = "#fffbe0"; b.beginPath(); b.arc(X(e.x), Y(e.y), r, 0, 7); b.fill(); }
    else { b.strokeStyle = `rgba(255,${200 - k * 120 | 0},60,${1 - k})`; b.lineWidth = Math.max(1, Math.round(4 * (1 - k))); b.beginPath(); b.arc(X(e.x), Y(e.y), r, 0, 7); b.stroke();
      b.fillStyle = `rgba(255,140,40,${(1 - k) * .6})`; b.beginPath(); b.arc(X(e.x), Y(e.y), r * .5 * (1 - k), 0, 7); b.fill(); } }
  b.lineWidth = 1;
  // beacons and orbital beams: light columns into the sky
  for (const be of G.beacons) { const c = beamCol(be.key), on = Math.sin(t * 14) > 0; b.fillStyle = c; b.globalAlpha = .35 + (on ? .3 : 0); b.fillRect(X(be.x), 0, 1, Y(be.y)); b.globalAlpha = 1; b.fillRect(X(be.x) - 1, Y(be.y) - 1, 3, 3); }
  for (const be of G.beams) { b.globalAlpha = clamp(be.t * 3, 0, 1); b.fillStyle = be.col; b.fillRect(X(be.x) - (be.thin ? 1 : 3), 0, be.thin ? 2 : 6, Y(be.y)); b.globalAlpha = 1; }
  for (const pd of G.pods) { const k = pd.t / pd.T; shadow(pd.x, pd.y, 3 + k * 5); const z = (1 - k) ** 2 * 260; b.fillStyle = "rgba(255,200,120,.5)"; b.fillRect(X(pd.x) - 1, Y(pd.y - z) - 60, 3, 50); spr(SPR.pod, pd.x, pd.y - z - 6); }
  for (const j of G.jets) { const d = (j.t - .5) * 520; b.globalAlpha = .35; spr(SPR.jet, j.x + Math.cos(j.a) * d, j.y + Math.sin(j.a) * d + 20, j.a); b.globalAlpha = 1; }
  const e = G.ext;
  if (e.state === "landing" || e.state === "landed" || e.state === "gone") { const z = e.state === "landing" ? (e.t / 5) ** 1.5 * 220 : e.state === "gone" ? Math.min(400, (e.goneT = (e.goneT || 0) + 1 / 60) ** 2 * 140) : 0;
    b.fillStyle = "rgba(0,0,0,.35)"; b.beginPath(); b.ellipse(X(e.x), Y(e.y) + 4, 30, 14, 0, 0, 7); b.fill(); spr(SPR.ship, e.x, e.y - 12 - z); }
  for (const tx of G.texts) { b.globalAlpha = clamp(tx.t, 0, 1); b.font = "8px Silkscreen, monospace"; b.textAlign = "center"; b.fillStyle = "#000"; b.fillText(tx.txt, X(tx.x) + 1, Y(tx.y) + 1); b.fillStyle = tx.col; b.fillText(tx.txt, X(tx.x), Y(tx.y)); }
  b.globalAlpha = 1;
  // weather / fog / vignette
  const px = X(p.x), py = Y(p.y);
  if (hasMod(m, "fog")) { const gr = b.createRadialGradient(px, py, 40, px, py, 150); gr.addColorStop(0, "rgba(180,190,190,0)"); gr.addColorStop(1, "rgba(150,160,160,.93)"); b.fillStyle = gr; b.fillRect(0, 0, VIEW.w, VIEW.h); }
  if (G.ion > 0) { b.fillStyle = `rgba(90,140,255,${.06 + .04 * Math.sin(t * 9)})`; b.fillRect(0, 0, VIEW.w, VIEW.h); if (Math.random() < .03) { b.fillStyle = "rgba(200,220,255,.35)"; b.fillRect(0, 0, VIEW.w, VIEW.h); } }
  const vg = b.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * .35, VIEW.w / 2, VIEW.h / 2, VIEW.h * .85); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${p.alive && p.hp < 35 ? .65 : .4})`); b.fillStyle = vg; b.fillRect(0, 0, VIEW.w, VIEW.h);
  if (p.alive && p.hp < 35) { b.fillStyle = `rgba(160,0,0,${.08 + .06 * Math.sin(t * 6)})`; b.fillRect(0, 0, VIEW.w, VIEW.h); }
  // markers for things off screen
  const marks = []; if (!G.objDone) { const o = G.mainNest || G.term || (G.box && !G.box.carried ? G.box : null); if (o) marks.push([o.x, o.y, "#f2d230", G.box && o === G.box ? "BOX" : "OBJ"]); }
  if (G.objDone && e.state !== "gone") marks.push([e.x, e.y, "#55b6ff", "EXT"]); else if (G.box && G.box.carried) marks.push([e.x, e.y, "#55b6ff", "EXT"]);
  for (const it of G.items) if (it.kind === "bag") marks.push([it.x, it.y, "#72e06a", "BAG"]);
  for (const [x, y, c, l] of marks) { if (onScreen(x, y, -10)) { if (Math.sin(t * 4) > -.3) { b.fillStyle = c; b.beginPath(); b.moveTo(X(x), Y(y) - 20); b.lineTo(X(x) - 4, Y(y) - 27); b.lineTo(X(x) + 4, Y(y) - 27); b.fill(); } continue; }
    const a = Math.atan2(y - (VIEW.y + VIEW.h / 2), x - (VIEW.x + VIEW.w / 2)), cx = VIEW.w / 2, cy = VIEW.h / 2, kx = (cx - 18) / Math.abs(Math.cos(a) || 1e-3), ky = (cy - 18) / Math.abs(Math.sin(a) || 1e-3), k = Math.min(kx, ky);
    const mx = cx + Math.cos(a) * k, my = cy + Math.sin(a) * k; b.save(); b.translate(Math.round(mx), Math.round(my)); b.rotate(a); b.fillStyle = c; b.beginPath(); b.moveTo(6, 0); b.lineTo(-3, -4); b.lineTo(-3, 4); b.fill(); b.restore();
    b.font = "8px Silkscreen, monospace"; b.textAlign = "center"; const lbl = l + " " + Math.round(dst(p.x, p.y, x, y) / TS * 2) + "m", lw = b.measureText(lbl).width;
    const lx = Math.round(clamp(mx - Math.cos(a) * (lw / 2 + 8), lw / 2 + 2, VIEW.w - lw / 2 - 2)), ly = Math.round(clamp(my - Math.sin(a) * 12, 10, VIEW.h - 4)) + 3;
    b.fillStyle = "#000"; b.fillText(lbl, lx + 1, ly + 1); b.fillStyle = c; b.fillText(lbl, lx, ly); }
  // crosshair
  const cxh = Math.round(mouse.x / VIEW.s), cyh = Math.round(mouse.y / VIEW.s);
  b.fillStyle = G.armed ? beamCol(G.armed) : "#fff"; for (const [dx, dy, w, h] of [[-5, 0, 3, 1], [3, 0, 3, 1], [0, -5, 1, 3], [0, 3, 1, 3]]) b.fillRect(cxh + dx, cyh + dy, w, h);
  if (G.armed) { b.strokeStyle = beamCol(G.armed); b.beginPath(); b.arc(cxh + .5, cyh + .5, 7 + Math.sin(t * 8), 0, 7); b.stroke(); }
  ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, VIEW.w * VIEW.s, VIEW.h * VIEW.s);
}
const beamCol = k => ({ eagle: "#ff5340", orbital: "#55b6ff", support: "#72e06a" })[STRATS[k].kind];

// ---------- HUD ----------
const hudCache = {};
const setH = (id, html) => { if (hudCache[id] !== html) { hudCache[id] = html; $(id).innerHTML = html; } };
const show = (id, on) => { const el = $(id); if (el.hidden === on) el.hidden = !on; };
function hud() {
  const p = G.p, m = G.m, e = G.ext;
  // objectives
  let prim = OBJS[m.obj].name, sub = "";
  if (m.obj === "purge") { const n = G.mainNest.holes.filter(h => !h.alive).length; sub = `Bug holes destroyed ${n}/${G.mainNest.holes.length}`; }
  if (m.obj === "uplink") sub = G.term.state === "idle" ? "Enter the code at the terminal" : G.term.state === "upload" ? `Uploading ${Math.floor(G.term.prog * 100)}%${G.term.contested ? " · UNDER ATTACK" : ""}` : "Upload complete";
  if (m.obj === "blackbox") sub = G.box.delivered ? "Delivered" : G.box.carried ? "Carry it to the extraction zone" : "Find the black box at the crash site";
  const side = G.nests.filter(n => !n.main), sideDone = side.filter(n => n.cleared).length;
  let ext = "Extract", exs = G.objDone ? "Call the dropship at the LZ" : "Complete the primary objective first";
  if (e.state === "called") exs = `Dropship in ${fmtT(e.t)}`; if (e.state === "landing") exs = "Dropship landing"; if (e.state === "landed") exs = "Board the dropship"; if (e.state === "gone") exs = "Extracted";
  setH("obj", `<h4>${m.planet.toUpperCase()} · ${DIFFS[m.diff - 1].toUpperCase()}</h4>
    <div class="o ${G.objDone ? "done" : ""}"><i>${G.objDone ? "✓" : "■"}</i><div>${prim}<small>${sub}</small></div></div>
    <div class="o ${G.objDone && e.state === "gone" ? "done" : ""}"><i>■</i><div>${ext}<small>${exs}</small></div></div>
    <div class="o ${sideDone === side.length ? "done" : ""}"><i>□</i><div>Destroy bug nests ${sideDone}/${side.length}</div></div>
    <div class="o"><i>□</i><div>Samples carried: ${p.samples}</div></div>`);
  setH("timer", `MISSION <b>${fmtT(G.timeLeft)}</b>`);
  setH("reinf", `REINF <b>${"●".repeat(G.reinf)}</b>${"○".repeat(Math.max(0, G.lo.reinf - G.reinf))}`);
  // stratagems
  const off = stratOffline();
  let sh = ""; for (const k of G.lo.strats) { const S = STRATS[k], ready = stratReady(k), onTrack = G.input && S.code.startsWith(G.input);
    let cd = ""; if (S.uses) cd = G.rearm[k] > 0 ? `REARM ${fmtT(G.rearm[k])}` : `${G.uses[k]}/${S.uses + G.lo.eagleBonus}`; else if (G.cd[k] > 0) cd = fmtT(G.cd[k]);
    const code = [...S.code].map((c, i) => `<span class="${onTrack && i < G.input.length ? "ok" : ""}">${ARW[c]}</span>`).join("");
    sh += `<div class="st ${off || !ready ? "off" : ""} ${G.input && !onTrack ? "miss" : ""}" style="${G.armed === k ? "outline:1px solid var(--y)" : ""}"><div class="ic ${S.kind}">${stratIc(k)}</div><b>${S.name}</b><div class="code">${code} <span class="cd">${cd}</span></div></div>`; }
  if (off) sh = `<div class="lbl" style="color:var(--red);padding:2px 4px">${G.destroyerGone ? "DESTROYER DEPARTED" : "ION STORM · OFFLINE"}</div>` + sh;
  else sh = `<div class="lbl" style="padding:2px 4px"><span>${G.armed ? "THROW: LEFT CLICK" : "HOLD Q + WASD"}</span></div>` + sh;
  setH("strat", sh); $("strat").classList.toggle("inp", G.inputMode); $("strat").style.borderColor = G.inputFail > 0 ? "var(--red)" : "";
  // vitals
  $("hpb").firstChild.style.width = Math.max(0, p.hp / G.lo.hp * 100) + "%"; $("hpb").classList.toggle("low", p.hp < G.lo.hp * .35); setH("hpv", Math.max(0, Math.ceil(p.hp)));
  $("stb").firstChild.style.width = p.st + "%";
  setH("ammo", p.relT > 0 ? `<small>RELOADING</small>` : `${p.ammo}<small> /${G.lo.mag}</small>`);
  setH("mags", Array.from({ length: G.lo.mags }, (_, i) => `<i class="${i < p.mags ? "" : "e"}"></i>`).join(""));
  setH("kit", `GRENADE <b>${p.gren}</b><br>STIM <b>${p.stims}</b>`);
  // the bar in the middle: uploads, extraction, reinforcements
  let bar = null;
  if (!p.alive && G.respawnT > 0) bar = [`Reinforcing in ${Math.ceil(G.respawnT)}`, 1 - G.respawnT / 4];
  else if (G.term && G.term.state === "upload") bar = [G.term.contested ? "UPLOAD PAUSED: clear the terminal" : "Uploading data", G.term.prog];
  else if (e.state === "called") bar = [`Dropship inbound ${fmtT(e.t)}`, 1 - e.t / 45];
  else if (e.state === "landed") bar = [e.board > 0 ? "Boarding…" : "Get in the landing zone", e.board / 3];
  show("callbar", !!bar); if (bar) { setH("calltxt", bar[0]); $("callbar").querySelector("i").style.width = clamp(bar[1], 0, 1) * 100 + "%"; }
  show("codepad", !!G.code); if (G.code) setH("codepad", `<div class="lbl" style="justify-content:center;margin-bottom:6px">ENTER CODE (WASD / ARROWS)</div><div class="arrows">${G.code.seq.map((c, i) => `<span class="${i < G.code.i ? "ok" : "no"}">${ARW[c]}</span>`).join("")}</div>`);
  const it = !G.code && interactTarget(); show("prompt", !!it); if (it) setH("prompt", `<b>[E]</b> ${it.label}`);
  const msg = G.msg; $("msg").style.opacity = msg && msg.t > 0 ? Math.min(1, msg.t) : 0; if (msg) setH("msg", `${msg.big}<small>${msg.small}</small>`);
  drawMini();
}
function drawMini() {
  const c = $("mini"), g = c.getContext("2d"), k = c.width / MW, p = G.p; g.imageSmoothingEnabled = false; g.drawImage(G.map.mini, 0, 0, c.width, c.height);
  if (hasMod(G.m, "spores")) { for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${160 + Math.random() * 60 | 0},80,.7)`; g.fillRect(Math.random() * c.width, Math.random() * c.height, 3, 3); } }
  const dot = (x, y, col, s = 3) => { g.fillStyle = col; g.fillRect(Math.round(x / TS * k - s / 2), Math.round(y / TS * k - s / 2), s, s); };
  for (const n of G.nests) { if (!n.seen && p.alive && dst(n.x, n.y, p.x, p.y) < 360) n.seen = true; if (n.seen || n.main) dot(n.x, n.y, n.cleared ? "#555" : "#ff5340", 4); }
  if (G.term) dot(G.term.x, G.term.y, "#f2d230", 5); if (G.box && !G.box.delivered) dot(G.box.x, G.box.y, "#ff9a3a", 4); if (G.wreck) dot(G.wreck.x, G.wreck.y, "#f2d230", 5);
  dot(G.ext.x, G.ext.y, G.objDone ? "#55b6ff" : "#2a5a80", 6);
  for (const it of G.items) if (it.kind === "bag" || (p.alive && dst(it.x, it.y, p.x, p.y) < 200)) dot(it.x, it.y, "#72e06a", 2);
  for (const b of G.bugs) if (p.alive && dst(b.x, b.y, p.x, p.y) < 260) dot(b.x, b.y, "#ff8a6a", 2);
  dot(p.x, p.y, Math.sin(G.t * 8) > 0 ? "#fff" : "#f2d230", 4);
  g.strokeStyle = "rgba(255,255,255,.35)"; g.strokeRect(VIEW.x / TS * k, VIEW.y / TS * k, VIEW.w / TS * k, VIEW.h / TS * k);
}

// ---------- menus ----------
let boardDiff = 2, board = [];
let MODE = "menu";
function screen(html) { const s = $("screen"); s.innerHTML = html; s.hidden = false; $("hud").hidden = true; s.scrollTop = 0; s.classList.toggle("over", MODE === "base"); if (MODE === "base") $("basehud").hidden = true; if (document.pointerLockElement) document.exitPointerLock(); }
const loadoutLine = () => { const sv = loadSave(); return `<div style="margin:0 0 8px;color:var(--mut)">${WEAPONS[sv.lo.w].name} · ${(SECONDARIES[sv.lo.w2] || SECONDARIES.pistol).name} · ${ARMORS[sv.lo.a].name}</div>`; };
// the Starfall sigil, as on the pods: a falling star with swept brass wings
const STARFALL_SVG = `<svg viewBox="0 0 64 64" shape-rendering="crispEdges"><g stroke="#100c0c" stroke-width="2.4" stroke-linejoin="miter" paint-order="stroke">
  <path d="M30 22L4 14L8 20L28 30Z M34 22L60 14L56 20L36 30Z" fill="#c4a050"/><path d="M14 26L28 34L27 37L12 30Z M50 26L36 34L37 37L52 30Z" fill="#9a7a34"/>
  <path d="M32 6L39 22L36 42L32 60L28 42L25 22Z" fill="#dec478"/><path d="M32 12L34 24L32 44L30 24Z" fill="#fff2c4"/></g></svg>`;
function showTitle() {
  G = null; MODE = "menu"; leaveBase(); const sv = loadSave();
  const r = rankOf(sv.xp), W = warInit(sv);
  screen(`<div class="wrap wide titlegrid"><div class="tleft"><div class="sigil">${STARFALL_SVG}</div><h1 class="logo">DROPZONE</h1><p class="tag">Drop onto a hostile planet. Do the job. Get out alive.</p>
    <div class="row"><button class="btn" id="go" style="padding:16px 30px;font-size:18px">BOARD YOUR SHIP</button><button class="btn ghost" id="watchintro">TUTORIAL</button></div>
    <p style="color:var(--mut);font-size:13px;max-width:560px;margin-top:26px">Walk your ship between missions: plot a course at the war table, change your loadout in the armory, try your guns on the range, then pick an operation at a Starfall pod and drop.</p></div>
    <section class="frame dispatch"><div class="kicker big">FLEET DISPATCH · SECTOR DRACO</div>
      <div class="rk">${insignia(r, 72)}<div><div class="rt">${RANKS[r].t.toUpperCase()}</div><div class="rx">${sv.xp} XP · ${Object.keys(sv.medals || {}).length} medals</div></div></div>
      <div class="wallet three"><div><small>REQUISITION</small><b>${sv.req}</b></div><div><small>SAMPLES</small><b>${sv.samples}</b></div><div><small>MISSIONS</small><b>${sv.wins}/${sv.missions}</b></div></div>
      <div class="kicker">THE FRONT</div>${SYSTEMS.map((S, i) => { const P = W.planets[i]; return `<div class="warrow"><b style="color:${S.col}">${S.name}</b>${S.locked ? `<span style="color:var(--mut)">🔒 uncharted</span>` : `${libBar(P, 150)}<span>${P.freed ? "LIBERATED" : Math.floor(P.lib) + "%"}${P.attack ? ` <span style="color:#ff8a7a">⚠ ATTACK</span>` : ""}</span>`}</div>`; }).join("")}
      <p class="hint" style="margin-top:auto">${W.planets.some(P => P.attack) ? "A liberated world is under counter-attack. Get to the war table." : "Every operation pushes the line. Liberate worlds to declassify new gear."}</p></section></div>`);
  $("go").onclick = () => { AU.init(); let seen = false; try { seen = !!localStorage.getItem(INTRO_SEEN); } catch (_) {} if (seen) enterBase(); else startTutorial(); };
  $("watchintro").onclick = () => startTutorial();
}
const KEYS = [["WASD", "Move"], ["Mouse", "Aim"], ["Left click", "Fire"], ["R", "Reload"], ["1 / 2 / wheel", "Primary / secondary weapon"], ["Shift", "Sprint"], ["Space", "Jump"], ["C", "Dive (dodges charges)"], ["Hold Tab", "Tactical map"], ["G", "Throw grenade"], ["F", "Stim (full heal)"], ["E", "Interact / pick up"], ["Hold Q + WASD", "Enter a stratagem code"], ["Left click", "Throw the armed beacon"], ["Esc", "Pause"]];
function showBrief(m, pod) {
  screen(`<div class="wrap wide"><button class="btn ghost" id="back" style="padding:8px 14px;font-size:12px">◀ OPERATIONS</button>
    <h2 class="logo" style="font-size:44px;margin-top:18px">${m.planet}</h2><p class="tag" style="margin:6px 0 0">${m.region ? m.region + " · " : ""}${BIOMES[m.biome].name} · Difficulty ${m.diff} (${DIFFS[m.diff - 1]}) · Enemy: ${(ENEMIES[m.enemy] || ENEMIES.bugs).name}</p>
    <div class="brief b3"><div>
      <div class="box"><h4>PRIMARY OBJECTIVE</h4><div style="font-size:20px;font-weight:700">${OBJS[m.obj].name}</div><p style="color:var(--mut);margin:6px 0 0">${OBJS[m.obj].desc} Then call the Pelican at the extraction pad, hold the area until it arrives, and climb the rope.</p></div>
      <div class="box"><h4>PLANET CONDITIONS</h4>${m.mods.length ? m.mods.map(k => `<div style="margin:6px 0"><b style="color:#ffb0a6">${MODS[k].name}</b> <span style="color:var(--mut)">${MODS[k].desc}</span></div>`).join("") : `<div style="color:var(--mut)">None reported.</div>`}</div>
      <div class="box" style="margin-top:14px"><h4>FIELD NOTES</h4><div style="color:var(--mut);font-size:14px;line-height:1.5">${m.enemy === "humans" ? "Mercenaries move in squads: they take cover, flank and call for backup. Stay out of their sight lines and they won't spot you right away; headshots drop them fast. Grenades get thrown at whoever hides too long. " : ""}${m.enemy === "humans" ? "Their camps and command posts go up with explosives, or plant a demolition charge with E and get clear. " : "Bug holes only break to explosives. "}${m.enemy === "humans" ? "Squads that keep you in sight radio for reinforcements." : "Bugs that keep you in sight will call a breach: kill them fast. Chargers are armored in front; dive aside and shoot their backs."} Samples are lost if you die until you pick your bag back up. Explosions hurt you too.</div></div>
    </div><div><div class="box"><h4>YOUR LOADOUT</h4>${loadoutLine()}${loadSave().lo.s.map(k => [k, STRATS[k]]).map(([k, S]) => `<div class="st" style="margin:4px 0"><div class="ic ${S.kind}">${stratIc(k)}</div><b>${S.name}</b><div class="code" style="color:var(--y)">${[...S.code].map(c => ARW[c]).join(" ")}</div></div>`).join("")}</div>
      <div class="box" style="margin-top:14px"><h4>OPERATION SIZE</h4><div class="sizes">
        <button class="sz ${m.size !== "full" ? "on" : ""}" data-s="quick"><b>QUICK</b><span>Main objective only · extraction close by · 10 min</span><small>Liberation +${Math.round(4 + m.diff * 1.5)}% · XP ×1</small></button>
        <button class="sz ${m.size === "full" ? "on" : ""}" data-s="full"><b>FULL</b><span>Main objective + 2 side objectives · long haul to extraction · 20 min</span><small>Liberation +${Math.round(10 + m.diff * 2.5)}%, +4% per side · XP ×1.3</small></button></div>
        ${m.defend ? `<p style="color:#ff9a8a;font-size:13px;margin:8px 0 0">Defending: beat this and the counter-attack is over.</p>` : ""}</div>
      <button class="btn" id="drop" style="width:100%;margin-top:14px;padding:18px;font-size:22px">DROP</button>
      <p style="color:var(--mut);font-size:13px">Seal the pod and launch. Want different gear? Step out and visit the Armory first.</p></div>
    <div><div class="box"><h4>CONTROLS</h4><div class="keys">${KEYS.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join("")}</div></div></div></div></div>`);
  m.size = m.size || "quick"; document.querySelectorAll(".sz").forEach(b => b.onclick = () => { m.size = b.dataset.s; AU.click(); showBrief(m, pod); });
  $("back").onclick = () => showPodMissions(pod); $("drop").onclick = () => { BASE.selected = m; backToBase(); AU.armed(); if (pod) startDrop(pod.pod, pod.x, pod.z); };
}
function launch(m) { AU.init(); MODE = "game"; leaveBase(); const a = ARMORS[loadSave().lo.a] || ARMORS.medium, A = Object.assign({}, ARMOR, a.tint || {});
  SPR.troop = [makeTrooper(0, A), makeTrooper(1, A)]; SPR.troopW = silhouette(SPR.troop[0], "#ff6050");
  $("screen").hidden = true; $("screen").classList.remove("over"); $("hud").hidden = false; VIEW.cx = VIEW.cy = 0; for (const k in hudCache) delete hudCache[k]; startMission(m); }
function warSummary(w) { const sv = loadSave(), r = rankOf(sv.xp), nx = RANKS[r + 1], up = w.rank > w.rank0;
  return `<div class="warsum"><div class="box"><h4>THE WAR · ${w.planet.toUpperCase()}</h4>${libBar({ lib: w.lib }, 260)} <b>${Math.floor(w.lib)}%</b> ${w.lib > w.lib0 ? `<span style="color:var(--grn)">+${Math.round(w.lib - w.lib0)}%</span>` : ""}
      ${w.events.map(e => `<div class="ev ${/FALLEN|pushed|COUNTER/.test(e) ? "bad" : ""}">${e}</div>`).join("")}
      ${w.unlocked.length ? `<div class="ev good">DECLASSIFIED at the Quartermaster: ${w.unlocked.map(gearName).join(", ")}</div>` : ""}</div>
    <div class="box"><h4>SERVICE</h4><div>${insignia(r, 30)} <b>${RANKS[r].t.toUpperCase()}</b> <span style="color:var(--grn)">+${w.xp} XP</span></div>${nx ? `<div class="xpbar"><i style="width:${(sv.xp - RANKS[r].xp) / (nx.xp - RANKS[r].xp) * 100}%"></i></div><small style="color:var(--mut)">${nx.xp - sv.xp} XP to ${nx.t}</small>` : ""}
      ${up ? `<div class="ev good">PROMOTED to ${RANKS[r].t}!${RANKS[r].tint ? ` New armour tint: ${RANKS[r].tint[0]}` : ""}</div>` : ""}
      ${w.medals.map(k => `<div class="ev good">${medalIcon(k)} Medal: <b>${MEDALS[k].name}</b></div>`).join("")}</div></div>`; }
function showEnd() {
  const o = G.over, s = G.stats, m = G.m, acc = s.shots ? Math.round(s.hits / s.shots * 100) : 0;
  screen(`<div class="wrap" style="padding-top:calc(6 * var(--vh))"><h1 class="logo" style="color:${o.win ? "var(--y)" : "var(--red)"}">${o.win ? "MISSION COMPLETE" : "MISSION FAILED"}</h1>
    <p class="tag">${m.planet} · ${OBJS[m.obj].name} · ${DIFFS[m.diff - 1]}</p>
    <div class="stats"><div><small>REQUISITION</small><b>+${o.req}</b></div><div><small>SAMPLES</small><b>${o.samples}</b></div><div><small>ENEMIES KILLED</small><b>${s.kills}</b></div><div><small>NESTS</small><b>${o.nests}</b></div>
      <div><small>DEATHS</small><b>${s.deaths}</b></div><div><small>ACCURACY</small><b>${acc}%</b></div><div><small>STRATAGEMS</small><b>${s.strats}</b></div><div><small>TIME</small><b>${fmtT(o.time)}</b></div></div>
    ${o.sideTotal ? `<p class="tag">Side objectives ${o.side}/${o.sideTotal}</p>` : ""}
    ${o.war ? warSummary(o.war) : ""}
    ${o.win ? "" : `<p style="color:var(--mut)">${loadSave().up.satchel ? "The Sample Satchel kept half the samples you carried." : "Samples carried are lost on a failed mission."}</p>`}
    <div class="row"><button class="btn" id="again">RETURN TO SHIP</button><button class="btn ghost" id="title">TITLE</button></div></div>`);
  $("again").onclick = () => { G = null; board = []; BASE.selected = null; enterBase(true); }; $("title").onclick = showTitle;
}
function setPause(on) { if (!G || G.over) return; G.paused = on; $("pause").hidden = !on; if (on) { keys.clear(); mouse.down = false; } }
function onBlur() { if (G && !G.over && $("screen").hidden) setPause(true); }
addEventListener("keydown", e => { if (e.key === "Escape" && G && $("screen").hidden) setPause(!G.paused); });
$("resume").onclick = () => setPause(false);
$("abandon").onclick = () => { $("pause").hidden = true; G.paused = false; endMission(false); };

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (typeof INTRO !== "undefined" && INTRO.on) introFrame(dt);
  else if (MODE === "base") { updateBase(dt); renderBase(); }
  else if (MODE === "drop" || MODE === "field") { updateField(dt); renderFieldMode(); fieldHud(); }
  else if (G && $("screen").hidden) { if (!G.paused) update(dt); render(); hud(); }
  else { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (typeof devTick === "function") devTick(dt); if (typeof tutTick === "function") tutTick(dt); if (typeof helmTick === "function" && R3.gl) helmTick();
  pressed.clear(); released.clear(); mouse.clicked = false;
  requestAnimationFrame(frame);
}
// test hook
window.__dz = { get F() { return F; }, get DROP() { return DROP; }, get FLD() { return FLD; }, get BASE() { return BASE; }, genMission, launch(diff = 2, seed, obj, mods) { const m = genMission(diff, seed); if (obj) m.obj = obj; if (mods) m.mods = mods; launch(m); return m; }, step(n = 60, dt = 1 / 60) { for (let i = 0; i < n; i++) { update(dt); pressed.clear(); released.clear(); mouse.clicked = false; } } };
