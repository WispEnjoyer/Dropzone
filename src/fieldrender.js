// =====================================================================================
//  FIELD RENDERING + HUD: the pod interior, the view from orbit during the drop, the planet
//  surface, bug sprites, effects, the Pelican, the weapon in your hands, and the DOM HUD.
// =====================================================================================
let PELICAN = null, PELTUR = null;
const pelTurretParts = () => PELTUR || (PELTUR = buildParts(() => livery("F", () => xform(mdlPelTurret, { s: 1.6 }))));
const pelTurretM = (PM, e) => mChain(PM, mT(5.0, -2.05, 0), mRy(-(e.tyaw || 0)), mRz(e.tpitch || -.2), mT(-(e.kick || 0), 0, 0));
function buildPelican() {
  if (PELICAN) return PELICAN;
  PELICAN = buildParts(() => livery("F", () => {   // local +x is the nose
    // fuselage: an octagonal loft from tail to nose
    const ST = [[-12, .35, .3, .9], [-9, .7, .55, .6], [-5.5, 1.5, 1.7, 0], [-1, 1.7, 1.9, 0], [3, 1.6, 1.8, -.05], [5.6, 1.1, 1.3, -.25], [7.6, .45, .55, -.55]];
    const oct = [[1, .45], [.45, 1], [-.45, 1], [-1, .45], [-1, -.45], [-.45, -1], [.45, -1], [1, -.45]];
    for (let k = 0; k < ST.length - 1; k++) { const [x0, h0, w0, y0] = ST[k], [x1, h1, w1, y1] = ST[k + 1];
      for (let q = 0; q < 8; q++) { const a = oct[q], b = oct[(q + 1) % 8], P = (x, h, w, y, c) => [x, y + c[0] * h, c[1] * w], n = norm3([0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
        mb(q < 4 && q > 0 ? "hullOut" : "hullOut3").mb.quad(P(x0, h0, w0, y0, a), P(x1, h1, w1, y1, a), P(x1, h1, w1, y1, b), P(x0, h0, w0, y0, b), n, [0, 0, 2, 1]); } }
    obox(5.4, .95, 0, 2.2, .5, 1.5, Math.PI / 2, .35, "fGlass");   // canopy
    obox(-10.3, 1.6, 0, 2.6, 2.4, .2, Math.PI / 2, -.35, "hullOut3");   // tail fin
    for (const s of [-1, 1]) { obox(-11, .45, s * 1.6, 1.8, .14, 2.8, 0, 0, "hullOut3");    // tailplanes
      obox(-1.2, .7, s * 4.4, 4.2, .35, 5.6, 0, s * .06, "hullOut", { top: "hullOut3" });   // wings
      cyl(-1.4, s * 7.4, -1, 1.9, 1.05, 12, "hullOut3", { cap: "dark", r1: .95 }); cyl(-1.4, s * 7.4, -1.15, -1, .85, 12, "dark");
      annulus(-1.4, -1.16, s * 7.4, 0, .8, 12, "glowCyan"); box(-1.5, 1.9, s * 7.4 - .5, -1.3, 2.2, s * 7.4 + .5, "glowRed");
      box(-4.5, .2, s * 1.83 - .02, 3.5, .32, s * 1.83 + .02, "glowRed");
      obox(1.2, -1.6, s * 1.1, .3, 1.2, .3, 0, 0, "dark"); obox(-4, -1.6, s * 1.2, .3, 1.2, .3, 0, 0, "dark"); }   // landing struts
    // open rear ramp: a dark hold behind a lowered ramp
    mb("dark").mb.quad([-5.5, 1.2, -1.3], [-5.5, 1.2, 1.3], [-5.5, -1.2, 1.3], [-5.5, -1.2, -1.3], [-1, 0, 0]);
    obox(-6.6, -1.75, 0, 2.6, .12, 2.4, Math.PI / 2, -.45, "haz", { tile: 1 });
    // the chin mount the 30 mm turret hangs from (the turret itself is its own model, see mdlPelTurret)
    box(4.3, -1.5, -.55, 5.7, -1.32, .55, "dark", { bottom: "podIron" }); cyl(5.0, 0, -1.6, -1.48, .42, 10, "podBrass");
    box(-4.2, -1.75, -.15, -3.9, -1.7, .15, "glowWhite"); box(6.8, -.2, -.1, 7.0, -.1, .1, "glowWhite");
    // the Starfall sigil on both wings and the flanks, brass bands round the engine pods
    for (const s of [-1, 1]) { emblemFlat(-1.2, .885, s * 4.6, 3.2, Math.PI / 2); emblem(-2.6, .35, s * 1.85, s > 0 ? 0 : Math.PI, 1.5);
      cyl(-1.4, s * 7.4, 1.4, 1.55, 1.0, 12, "podBrass"); cyl(-1.4, s * 7.4, -.2, -.05, 1.07, 12, "podBrass"); }
  }));
  return PELICAN;
}

// ---------- low level drawing ----------
const DYN = { v: [] };
// the splatted terrain: its five layers and the noise map go on texture units 0-5 for the one draw
function drawTerrain(p) { const gl = R3.gl, L = R3.loc, T = FLD.tl || {}; if (!R3.texNz) R3.texNz = noiseTex();
  [T.l1, T.l2, T.l3, T.l4, R3.texNz, T.l5].forEach((t, i) => { gl.activeTexture(gl.TEXTURE1 + i); gl.bindTexture(gl.TEXTURE_2D, t || R3.tex.dark); });
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.l0 || R3.tex.dark); gl.uniform4fv(L.uTS, T.ts || [.25, .25, .25, .25]); gl.uniform1f(L.uRS, T.rs || .25); gl.uniform1f(L.uL5, T.l5 ? 1 : 0);
  gl.uniform2f(L.uScroll, 0, 0); gl.uniform1f(L.uSplat, 1); gl.uniform1f(L.uDither, 0); gl.uniform1f(L.uSky, 0); bindVB(p.buf); gl.drawArrays(gl.TRIANGLES, 0, p.n); gl.uniform1f(L.uSplat, 0); }
function drawParts(parts, M, opt = {}) {
  const gl = R3.gl, L = R3.loc; gl.uniformMatrix4fv(L.uM, false, M || IDENT);
  let glass = null;
  for (const p of parts) { if (p.tex === "podGlass") { glass = p; continue; } if (p.tex === "terrain") { drawTerrain(p); continue; } gl.uniform1f(L.uDither, p.dither || opt.dither ? 1 : 0); gl.uniform1f(L.uSky, opt.sky ?? (p.tex.startsWith("glow") ? 1 : 0)); gl.bindTexture(gl.TEXTURE_2D, R3.tex[p.tex] || R3.tex.hull); bindVB(p.buf); gl.drawArrays(gl.TRIANGLES, 0, p.n); }
  // see-through glass: blended over whatever is behind it, without writing depth
  if (glass) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(L.uDither, 0); gl.uniform1f(L.uSky, 1); gl.uniform1f(L.uAlpha, .13);
    gl.bindTexture(gl.TEXTURE_2D, R3.tex.podGlass); bindVB(glass.buf); gl.drawArrays(gl.TRIANGLES, 0, glass.n); gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(L.uAlpha, 1); }
  gl.uniform1f(L.uDither, 0);
}
// the downpour: a cylinder of falling streaks wrapped around the camera, each drop on its own hashed lane and phase
function drawRain(eye) { const gl = R3.gl, L = R3.loc, m = new MB(), t = F.t, H = 18, wind = [.16, -1, .07], fl = F.flashT > 0 ? 1.6 : 1;
  const cam = camBasis(F.p.yaw, 0), spl = new MB();
  for (let i = 0; i < 1700; i++) { const a = hash2(i, 3, 71) * 6.283, r = 1 + Math.sqrt(hash2(i, 5, 72)) * 19, sp = 17 + hash2(i, 7, 73) * 6, ph = hash2(i, 9, 74);
    const fall = ((t * sp / H + ph) % 1) * H, x = eye[0] + Math.cos(a) * r - wind[0] * fall, y = eye[1] + 12 - fall, z = eye[2] + Math.sin(a) * r - wind[2] * fall;
    const gy = fieldH(x, z); if (y < gy) continue; const len = .6 + hash2(i, 11, 75) * .45, k = (.6 + .4 * (1 - r / 20)) * fl;
    if (y - gy < .4) { if (r < 10) billQ(spl, [x, gy + .06, z], .05 + (.4 - (y - gy)) * .12, cam, [.8 * k, .85 * k, .9 * k]); continue; }   // the splash where it lands
    lineQ(m, [x, y, z], [x + wind[0] * len, y + wind[1] * len, z + wind[2] * len], .014 + r * .0008, eye, [.62 * k, .68 * k, .74 * k], [.82 * k, .88 * k, .94 * k]); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(L.uAlpha, .45); drawMB(m, "white", 1); gl.uniform1f(L.uAlpha, .6); drawMB(spl, "decalBlob", 1);
  gl.uniform1f(L.uAlpha, 1); gl.depthMask(true); gl.disable(gl.BLEND); }
function drawMB(m, texk, sky = 1, dither = 0, bill = 0) {
  if (!m.v.length) return; const gl = R3.gl, L = R3.loc; gl.uniformMatrix4fv(L.uM, false, IDENT); gl.uniform1f(L.uSky, sky); gl.uniform1f(L.uDither, dither); gl.uniform1f(L.uBill, bill);
  gl.bindTexture(gl.TEXTURE_2D, R3.tex[texk]); gl.bindBuffer(gl.ARRAY_BUFFER, R3.dyn); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), gl.DYNAMIC_DRAW); bindVB(R3.dyn); gl.drawArrays(gl.TRIANGLES, 0, m.v.length / 11);
  gl.uniform1f(L.uDither, 0); gl.uniform1f(L.uBill, 0);
}
// a camera-facing quad (full billboard) and a line quad facing the camera
function billQ(m, p, s, cam, col, uv = [0, 0, 1, 1]) { const [rx, ry, rz] = cam.r, [ux, uy, uz] = cam.u;
  m.quad([p[0] - rx * s + ux * s, p[1] - ry * s + uy * s, p[2] - rz * s + uz * s], [p[0] + rx * s + ux * s, p[1] + ry * s + uy * s, p[2] + rz * s + uz * s], [p[0] + rx * s - ux * s, p[1] + ry * s - uy * s, p[2] + rz * s - uz * s], [p[0] - rx * s - ux * s, p[1] - ry * s - uy * s, p[2] - rz * s - uz * s], cam.f, uv, col); }
function lineQ(m, a, b, w, eye, col, col2 = col) { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [eye[0] - a[0], eye[1] - a[1], eye[2] - a[2]];
  let s = [d[1] * v[2] - d[2] * v[1], d[2] * v[0] - d[0] * v[2], d[0] * v[1] - d[1] * v[0]]; const l = Math.hypot(...s) || 1; s = s.map(q => q / l * w);
  m.quad([a[0] - s[0], a[1] - s[1], a[2] - s[2]], [a[0] + s[0], a[1] + s[1], a[2] + s[2]], [b[0] + s[0], b[1] + s[1], b[2] + s[2]], [b[0] - s[0], b[1] - s[1], b[2] - s[2]], [0, 1, 0], [0, 0, 1, 1], [col, col, col2, col2]); }
function camBasis(yaw, pitch) { const f = camDir(yaw, pitch), r = [-Math.sin(yaw), 0, Math.cos(yaw)], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]; return { f: f.map(v => -v), r, u }; }
function setLights(list) { const gl = R3.gl, L = R3.loc, lp = new Float32Array(24), lc = new Float32Array(24);
  list.slice(0, 8).forEach((l, i) => { lp.set([l.x, l.y, l.z], i * 3); lc.set(l.c.map(v => v * clamp(l.t / .1, 0, 1) * 2.2), i * 3); }); gl.uniform3fv(L.uLP, lp); gl.uniform3fv(L.uLC, lc); }

// ---------- the drop: pod light, the view from orbit, and the plasma / cloud outside the window ----------
// the pod's own ceiling light: warm while boarding, red for launch, orange in the plasma
function podLight(D) {
  const st = D.stage, t = D.t;
  if (st === "board") return [.38, .34, .3];
  if (st === "count") { const k = .35 + .65 * (D.red || 0); return [.7 * k, .1 * k, .07 * k]; }
  if (st === "launch") return [.6, .13, .09];
  if (st === "space") return [.42, .13, .1];
  if (st === "entry") { const p = D.plasma || 0; return [.55 + .9 * p, .14 + .5 * p, .1 + .15 * p]; }
  if (st === "fall" && D.burn) return [1.25, .62, .28].map(v => v * (.85 + Math.random() * .3));
  if (st === "fall") { const p = D.plasma || 0; return [lerp(.4, 1.4, p), lerp(.3, .62, p), lerp(.25, .25, p)]; }
  if (D.flicker) return Math.random() < .5 ? [.05, .04, .04] : [.5, .45, .4];
  if (st === "door" && D.t < .15) return [1.4, 1, .6];
  return [.38, .34, .3];
}
// where the planet sits and how big it is while the pod falls away from the ship (continuous with the bridge view)
function orbitView(D) {
  const s = D.stage === "space" ? D.t : D.stage === "entry" ? 9 + D.t : 0, dl = ease(clamp(s / 3.5, 0, 1)), A = [-.22, .1, -1], Bv = [0, -.45, -1];
  const grow = 1 + .7 * ease(clamp(s / 9, 0, 1)) + (D.stage === "entry" ? 3.5 * ease(clamp(D.t / 2.5, 0, 1)) : 0);
  return { pd: norm3(A.map((v, i) => lerp(v, Bv[i], dl))), sun: norm3([lerp(-.75, -.6, dl), lerp(.42, .55, dl), lerp(.5, .55, dl)]), grow, fx: D.stage === "launch" ? clamp(D.t / 1.2, 0, 1) : D.stage === "space" || D.stage === "entry" ? 1 : 0 };
}
// plasma and cloud wrap the outside of the pod: you only ever see them through the porthole
function drawVeil(eye, D) {
  const p = (D.plasma || 0) * .85, c = D.cloud || 0, a = Math.max(p, c); if (a < .01) return;
  const gl = R3.gl, L = R3.loc, w = c / (c + p + 1e-6), col = [lerp(1.7, 1.02, w), lerp(.7, 1.0, w), lerp(.25, .98, w)], tt = performance.now() / 1000;
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(L.uSky, 1); gl.uniform1f(L.uDither, 0); gl.uniform3fv(L.uTint, col);
  gl.uniform2f(L.uScroll, tt * .35, tt * (c > p ? .9 : 2.2)); gl.bindTexture(gl.TEXTURE_2D, R3.tex.fCloud); bindVB(R3.sphere.buf);
  for (const [r, k] of [[1.6, 1], [2.4, .6]]) { gl.uniform1f(L.uAlpha, Math.min(1, a * k + (a > .97 ? .2 : 0))); gl.uniformMatrix4fv(L.uM, false, mChain(mT(...eye), mRy(r), mS(r))); gl.drawArrays(gl.TRIANGLES, 0, R3.sphere.n); }
  gl.uniform2f(L.uScroll, 0, 0); gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(L.uAlpha, 1); gl.uniform3f(L.uTint, 1, 1, 1);
}

// ---------- the planet surface ----------
function fieldCamera() {
  const D = DROP;
  if (D && D.eye) { const sk = (D.shake || 0) * .5; return { eye: [D.eye[0] + frand(-sk, sk), D.eye[1] + frand(-sk, sk), D.eye[2] + frand(-sk, sk)], yaw: D.camYaw, pitch: D.camPitch }; }
  const p = F.p, sk = F.shake, moving = p.onGround && (keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d")) && !F.inputMode;
  const bob = moving ? Math.sin(p.bob) * .05 : 0, dead = (p.alive ? 0 : Math.min(1, p.deadT) * 1.2) + (p.dive > 0 ? Math.min(1, (.75 - p.dive) * 6, p.dive * 4) * .9 : 0);
  return { eye: [p.x + frand(-sk, sk), p.y + EYE3 + bob - dead + frand(-sk, sk), p.z + frand(-sk, sk)], yaw: p.yaw, pitch: p.pitch + p.recoil * .02 };
}
// ---------- pixel-art pass: the 3D world is drawn into a smaller buffer, then put on screen with a limited, dithered
// palette and dark outlines where an object stands in front of something far behind it. Its depth is written back so
// the bugs, effects and gun drawn afterwards (left crisp) still hide behind trees and hills.
const PIX = { on: true, k: 1, lv: 18, fb: null, w: 0, h: 0, prog: undefined };
try { const v = localStorage.getItem("dz_pix2"); if (v != null) { PIX.on = v !== "0"; PIX.k = +v || 1; } } catch (_) {}
function pixInit() { if (PIX.prog !== undefined) return PIX.prog; const gl = R3.gl, g2 = R3.gl2; PIX.prog = null;
  if (!g2 && (!gl.getExtension("WEBGL_depth_texture") || !gl.getExtension("EXT_frag_depth"))) return null;
  const head = g2 ? "#version 300 es\n" : "#extension GL_EXT_frag_depth : enable\n", IN = g2 ? "in" : "varying", TX = g2 ? "texture" : "texture2D";
  const vs = (g2 ? "#version 300 es\nin vec2 aQ; out vec2 vU;" : "attribute vec2 aQ; varying vec2 vU;") + " void main(){ vU = aQ * .5 + .5; gl_Position = vec4(aQ, 0., 1.); }";
  const fs = head + `precision highp float; uniform sampler2D uC, uD; uniform vec2 uRes; uniform float uN, uF, uLv; ${IN} vec2 vU; ${g2 ? "out vec4 oC;" : ""}
    float lin(float d) { float z = d * 2. - 1.; return 2. * uN * uF / (uF + uN - z * (uF - uN)); }
    float ld(vec2 uv) { float d = ${TX}(uD, uv).r; return d >= 1. ? 1e4 : lin(d); }
    float b2(vec2 a) { a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
    float b4(vec2 a) { return b2(.5 * a) * .25 + b2(a); }
    void main() { vec2 px = floor(vU * uRes), uv = (px + .5) / uRes, e = 1. / uRes; float d = ${TX}(uD, uv).r; vec3 c = ${TX}(uC, uv).rgb;
      if (d < 1.) { float l = lin(d), m = max(max(ld(uv + vec2(e.x, 0.)), ld(uv - vec2(e.x, 0.))), max(ld(uv + vec2(0., e.y)), ld(uv - vec2(0., e.y)))) - l;
        if (m > 1. + l * .25) c *= mix(.5, .85, clamp((l - 15.) / 50., 0., 1.)); }
      float Y = max(dot(c, vec3(.299, .587, .114)), 1e-4), s = sqrt(Y), sq = floor(s * uLv + .5 + (b4(px) - .5) * .5) / uLv;
      c *= sq * sq / Y;
      ${g2 ? "oC = vec4(c, 1.); gl_FragDepth = d;" : "gl_FragColor = vec4(c, 1.); gl_FragDepthEXT = d;"} }`;
  const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
  const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs); if (!a || !b) return null;
  const p = gl.createProgram(); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  PIX.loc = {}; for (const n of ["uC", "uD", "uRes", "uN", "uF", "uLv"]) PIX.loc[n] = gl.getUniformLocation(p, n); PIX.aQ = gl.getAttribLocation(p, "aQ");
  PIX.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, PIX.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  return PIX.prog = p; }
function pixBegin() { const gl = R3.gl; if (!PIX.on || !pixInit()) return false;
  const w = Math.max(1, Math.round(R3.W / PIX.k)), h = Math.max(1, Math.round(R3.H / PIX.k));
  if (w !== PIX.w || h !== PIX.h) { PIX.w = w; PIX.h = h; const mk = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
    if (PIX.fb) { gl.deleteFramebuffer(PIX.fb); gl.deleteTexture(PIX.ct); gl.deleteTexture(PIX.dt); }
    PIX.ct = mk(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    PIX.dt = mk(); gl.texImage2D(gl.TEXTURE_2D, 0, R3.gl2 ? gl.DEPTH_COMPONENT24 : gl.DEPTH_COMPONENT, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    PIX.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, PIX.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, PIX.ct, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, PIX.dt, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); PIX.on = false; return false; } }
  gl.bindFramebuffer(gl.FRAMEBUFFER, PIX.fb); gl.viewport(0, 0, w, h); return true; }
function pixEnd(near, far) { const gl = R3.gl, L = PIX.loc; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, R3.W, R3.H); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(PIX.prog); for (const k of ["aT", "aN", "aC"]) if (R3.loc[k] >= 0 && R3.loc[k] !== PIX.aQ) gl.disableVertexAttribArray(R3.loc[k]);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, PIX.dt); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, PIX.ct);
  gl.uniform1i(L.uC, 0); gl.uniform1i(L.uD, 1); gl.uniform2f(L.uRes, PIX.w, PIX.h); gl.uniform1f(L.uN, near); gl.uniform1f(L.uF, far); gl.uniform1f(L.uLv, PIX.lv);
  gl.depthFunc(gl.ALWAYS); gl.bindBuffer(gl.ARRAY_BUFFER, PIX.quad); gl.enableVertexAttribArray(PIX.aQ); gl.vertexAttribPointer(PIX.aQ, 2, gl.FLOAT, false, 8, 0); gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.depthFunc(gl.LESS); gl.useProgram(R3.prog); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); }

function renderField() {
  const gl = R3.gl, L = R3.loc, P = F.P, C = fieldCamera(), eye = C.eye, cam = camBasis(C.yaw, C.pitch), V = lookDir(eye, C.yaw, C.pitch), asp = R3.W / R3.H;
  const alt = DROP && DROP.py != null && DROP.gy != null ? Math.max(0, DROP.py - DROP.gy) : 0, rainy = hasMod(F.m, "rain"), flash = rainy && F.flashT > 0 ? Math.max(0, Math.sin(F.flashT * 40)) * F.flashT * 2.2 : 0, fogD = P.fogD * (hasMod(F.m, "fog") ? .35 : rainy ? .6 : 1) * (1 + alt / 120), fog = P.fog.map(v => v / 255 * (rainy ? .72 + flash * .8 : 1));
  const pix = pixBegin();
  gl.clearColor(...fog, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.uniform1i(L.uTex, 0); gl.activeTexture(gl.TEXTURE0);
  gl.uniform2f(L.uScroll, 0, 0); gl.uniform1f(L.uBill, 0); gl.uniform3f(L.uTint, 1, 1, 1); gl.uniform3fv(L.uCam, eye);
  // sky
  gl.uniformMatrix4fv(L.uVP, false, m4mul(persp(1.15, asp, 1, 600), V)); gl.uniformMatrix4fv(L.uM, false, mChain(mT(...eye), mS(400))); gl.uniform1f(L.uSky, 1);
  const dark = hasMod(F.m, "fog") ? .75 : rainy ? .62 + flash : 1; gl.uniform3f(L.uTint, dark, dark, dark); gl.bindTexture(gl.TEXTURE_2D, R3.tex.fSky); bindVB(R3.sphere.buf); gl.drawArrays(gl.TRIANGLES, 0, R3.sphere.n); gl.uniform3f(L.uTint, 1, 1, 1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  const VP = m4mul(persp(1.15, asp, .1, 700), V); R3.lastVP = VP; gl.uniformMatrix4fv(L.uVP, false, VP);
  gl.uniform3fv(L.uFog, fog); gl.uniform1f(L.uFogD, fogD); gl.uniform1f(L.uFogK, 1); gl.uniform3fv(L.uAmb, P.amb.map(v => v * (rainy ? .72 + flash * 1.5 : .85))); gl.uniform3fv(L.uLDir, FIELD_SUN); gl.uniform3fv(L.uLCol, P.sun.map(v => v * (rainy ? .38 : .62)));
  const D = DROP; setLights(D ? [{ x: D.eye[0], y: D.eye[1] + .45, z: D.eye[2], c: podLight(D).map(v => v / 2.2), t: 1 }, ...F.lights] : F.lights);
  drawParts(FLD.parts, IDENT); drawParts(FLD.padParts, mT(F.ext.x, F.ext.y, F.ext.z));
  // forest chunks: skip the ones lost in the fog or behind you
  const fw = [Math.cos(C.yaw), Math.sin(C.yaw)], vis = fogD * .95 + 40 + alt * 1.5, half = .95 + Math.abs(C.pitch) * .8;
  for (const c of FLD.chunks || []) { const dx = c.x - eye[0], dz = c.z - eye[2], d = Math.hypot(dx, dz); if (d > vis) continue; if (d > 45 && (dx * fw[0] + dz * fw[1]) / d < Math.cos(Math.min(Math.PI, half + 43 / d))) continue; drawParts(c.parts, IDENT); }
  for (const o of F.objs) drawParts(o.parts, o.M);
  if (F.tumbles && F.tumbles.length && TXD.fTumble) { if (!R3.tumble) R3.tumble = buildParts(mdlTumble); const wa = .6;
    for (const t of F.tumbles) if (Math.hypot(t.x - eye[0], t.z - eye[2]) < 70) drawParts(R3.tumble, mChain(mT(t.x, t.y + .42, t.z), mRy(-wa), mRz(-t.rot), mS(.85 * t.sp))); }
  for (const s of F.sentries) { drawParts(FLD.sentryParts, mT(s.x, s.y, s.z)); drawParts(s.rocket && FLD.rocketParts ? FLD.rocketParts : FLD.gunParts, mChain(mT(s.x, s.y + 1.07, s.z), mRy(-s.a - Math.PI / 2), mT(0, 0, s.kick || 0))); }
  for (const pd of F.pods) drawParts(R3.podSupply, mChain(mT(pd.x, pd.y, pd.z), mS(.62)));
  for (const d of F.doors) drawParts(d.parts || R3.podDoor, doorMatrix(d));
  for (const q of F.epods || []) { if (!q.landed) { const M = mChain(mT(q.x, q.y, q.z), mRy(-q.yaw)); drawParts(R3.podFullE, M); drawParts(R3.podDoorE, mChain(M, doorHinge(0))); } else if (!q.blown) drawParts(R3.podDoorE, mChain(q.M, doorHinge(0))); }
  for (const it of F.items) drawParts(it.kind === "sample" ? FLD.sampleParts : FLD.boxParts, mChain(mT(it.x, it.y, it.z), mRy(F.t + it.x)));
  if (F.box && !F.box.carried) drawParts(FLD.boxParts, mT(F.box.x, fieldH(F.box.x, F.box.z), F.box.z));
  for (const g of F.grenades) drawParts(beaconParts(g.type === "beacon" ? STRATS[g.key].kind : "grenade"), mChain(mT(g.x, g.y, g.z), mRx(F.t * 9), mRz(F.t * 5), mS(1.6)));
  for (const b of F.beacons) drawParts(beaconParts(STRATS[b.key].kind), mChain(mT(b.x, fieldH(b.x, b.z) + .2, b.z), mS(1.6)));
  const e = F.ext; if (e.state === "inbound" || e.state === "rope" || e.state === "climb" || e.state === "away") { const pp = pelicanPos(); const PM = mChain(mT(...pp), mRy(-e.yaw), mRz(e.state === "inbound" ? .06 : 0)); drawParts(buildPelican(), PM); drawParts(pelTurretParts(), pelTurretM(PM, e)); }
  // decals: flat patches hugging the ground
  const dm = new MB(); for (const d of F.decals) { const r = d.r, y = (x, z) => fieldH(x, z) + .07; dm.quad([d.x - r, y(d.x - r, d.z - r), d.z - r], [d.x + r, y(d.x + r, d.z - r), d.z - r], [d.x + r, y(d.x + r, d.z + r), d.z + r], [d.x - r, y(d.x - r, d.z + r), d.z + r], [0, 1, 0], [0, 0, 1, 1], d.col.map(v => v * Math.min(1, d.t / 5) + fog[0] * 0)); }
  drawMB(dm, "decalBlob", 1, 1);
  // bugs: side-view sprites, mirrored to face the way they walk on screen
  const batches = {};
  const sil = new MB();
  drawGiants(eye, cam, vis, sil);
  if (DEBUG_SPIDERS) for (const g of F.giants || []) lineQ(sil, [g.x, g.gy, g.z], [g.x, g.y + 40, g.z], .3, eye, [1.8, .2, .15], [1, .1, .1]);
  drawMB(sil, "white", 1);
  // swamp water: a murky, slowly drifting see-through surface
  if (FLD.waterParts && FLD.waterParts.length) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(!pix); gl.uniform1f(L.uAlpha, .86); gl.uniform2f(L.uScroll, F.t * .02, F.t * .013);
    gl.uniformMatrix4fv(L.uM, false, IDENT); gl.uniform1f(L.uSky, 0); gl.uniform1f(L.uDither, 0); gl.bindTexture(gl.TEXTURE_2D, R3.tex.fWater); for (const w of FLD.waterParts) { bindVB(w.buf); gl.drawArrays(gl.TRIANGLES, 0, w.n); }
    // ripples: rings spreading and fading on the surface
    if (F.ripples && F.ripples.length && R3.tex.fRipple) { gl.uniformMatrix4fv(L.uM, false, IDENT); for (const r of F.ripples) { if (r.t < 0) continue; const s = r.s * (.35 + r.t * 1.6), y = FLD.waterY + .03, m = new MB();
        m.quad([r.x - s, y, r.z - s], [r.x + s, y, r.z - s], [r.x + s, y, r.z + s], [r.x - s, y, r.z + s], [0, 1, 0], [0, 0, 1, 1], [.9, .95, .9]); gl.uniform1f(L.uAlpha, (1 - r.t) * .7); drawMB(m, "fRipple", 1); } gl.uniform1f(L.uAlpha, .86); }
    // low mist hanging over the water: the same surface again, lifted, in drifting cloud
    if (FIELD_SHAPE === "swamp") { if (!R3.texMist) R3.texMist = mistTex(); gl.depthMask(false); gl.uniform1f(L.uSky, 1); gl.uniform3f(L.uTint, .62, .7, .62); gl.bindTexture(gl.TEXTURE_2D, R3.texMist);
      for (const [y, a, sp] of [[.45, .16, .05], [1.1, .09, -.035]]) { gl.uniform1f(L.uAlpha, a); gl.uniform2f(L.uScroll, F.t * sp, F.t * sp * .6); gl.uniformMatrix4fv(L.uM, false, mT(0, y, 0)); for (const w of FLD.waterParts) { bindVB(w.buf); gl.drawArrays(gl.TRIANGLES, 0, w.n); } }
      gl.uniform3f(L.uTint, 1, 1, 1); gl.uniform1f(L.uSky, 0); gl.uniformMatrix4fv(L.uM, false, IDENT); }
    gl.uniform2f(L.uScroll, 0, 0); gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(L.uAlpha, 1); }
  // the falling pod you sit in: lit like it was in orbit at first, then by the planet's sun as the clouds part
  if (D && !D.landed) { drawVeil(eye, D); const k = D.first ? clamp(D.t / 1.4, 0, 1) : 1;
    gl.uniform3fv(L.uAmb, [.2, .22, .27].map((v, i) => lerp(v, P.amb[i] * .85, k))); gl.uniform3fv(L.uLCol, P.sun.map(v => v * .62 * k));
    drawParts(R3.podFull, D.podM); }

  if (D && !D.blown) drawParts(R3.podDoor, mChain(D.podM, doorHinge(0)));
  if (pix) { pixEnd(.1, 700); gl.uniform1i(L.uTex, 0); gl.uniformMatrix4fv(L.uVP, false, VP); }
  gl.uniform3fv(L.uAmb, P.amb.map(v => v * .85)); gl.uniform3fv(L.uLCol, P.sun.map(v => v * .62));
  drawHumans(eye, cam); if (typeof devWorldDraw === "function") devWorldDraw(eye, cam);
  // hand-drawn bugs: 8-direction billboards from their atlas (idle + an 8-frame walk); dead ones lie on their backs
  const artB = {};
  for (const b of F.bugs) { const T = FBUG[b.type]; if (T.human || !T.atlas || !FART[T.atlas]) continue; if (!R3.tex[T.atlas]) R3.tex[T.atlas] = glTex(FART[T.atlas]);
    const set = artB[T.atlas] = artB[T.atlas] || { n: new MB(), f: new MB(), d: new MB() }, dead = b.dead != null, S = T.size * (1 + b.lunge * .08), rx = cam.r[0], rz = cam.r[2];
    const dt = F.t - (b._lt ?? F.t), mv = dt > 0 ? Math.hypot(b.x - b._lx, b.z - b._lz) / dt : 0; if (dt > .05 || b._lt == null) { b._mv = b._lt == null ? 0 : mv; b._lt = F.t; b._lx = b.x; b._lz = b.z; }
    const rel = angDiff(b.face, Math.atan2(eye[2] - b.z, eye[0] - b.x)), row = dead ? (rel > 0 ? 2 : 6) : ((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8, mvv = b.forceMv ?? b._mv ?? 0, col = dead ? 0 : mvv > .3 || b.lunge > .05 ? 1 + Math.floor(b.anim * (mvv > 3.5 ? 15 : 10) * (T.animK || 1)) % 8 : 0;
    const u0 = col / T.cols, u1 = (col + 1) / T.cols, v0 = row / 8, v1 = (row + 1) / 8, fwd = b.lunge * .5, cx = b.x + Math.cos(b.face) * fwd, cz = b.z + Math.sin(b.face) * fwd;
    const SH = dead ? S * .7 : S, y0 = dead ? b.y - T.top * SH + .03 : b.y - T.foot * (S / T.size) + b.lunge * .15, m = dead ? set.d : b.flash > 0 ? set.f : set.n;   // dead: side view, on its back, squashed
    m.quad([cx - rx * S / 2, y0 + SH, cz - rz * S / 2], [cx + rx * S / 2, y0 + SH, cz + rz * S / 2], [cx + rx * S / 2, y0, cz + rz * S / 2], [cx - rx * S / 2, y0, cz - rz * S / 2], [-cam.f[0], 0, -cam.f[2]], dead ? [u0, v1, u1, v0] : [u0, v0, u1, v1]); }
  for (const k in artB) { const s = artB[k]; drawMB(s.n, k, 0, 0, 1); gl.uniform3f(L.uTint, 3, 3, 3); drawMB(s.f, k, 1); gl.uniform3f(L.uTint, .42, .36, .32); drawMB(s.d, k, 0, 0, 1); gl.uniform3f(L.uTint, 1, 1, 1); }
  for (const b of F.bugs) { if (FBUG[b.type].human || (FBUG[b.type].atlas && FART[FBUG[b.type].atlas])) continue; const T = FBUG[b.type], dead = b.dead != null, fr = dead ? 0 : (Math.floor(b.anim * (b.ch === "run" ? 9 : 5)) % 2), key = "bug_" + b.type + fr, S = SP[key];
    const h = dead ? T.h * .55 : T.h * (1 + b.lunge * .08), w = h * S.w / S.h / 2, fx = Math.cos(b.face), fz = Math.sin(b.face), right = fx * cam.r[0] + fz * cam.r[2] > 0;
    const grp = (dead ? "d" : b.flash > 0 ? "f" : "n") + key; const m = batches[grp] = batches[grp] || new MB(), lift = b.lunge * .15, yb = b.y - .05 + lift, rx = cam.r[0], rz = cam.r[2], uv = right ? [0, 0, 1, 1] : [1, 0, 0, 1];
    const fwd = b.lunge * .5; const cx = b.x + fx * fwd, cz = b.z + fz * fwd;
    m.quad([cx - rx * w, yb + h, cz - rz * w], [cx + rx * w, yb + h, cz + rz * w], [cx + rx * w, yb, cz + rz * w], [cx - rx * w, yb, cz - rz * w], [-cam.f[0], 0, -cam.f[2]], uv); }
  for (const g in batches) { const key = g.slice(1); if (g[0] === "n") drawMB(batches[g], key, 0, 0, 1); else { gl.uniform3fv(L.uTint, g[0] === "f" ? [3, 3, 3] : [.3, .26, .24]); drawMB(batches[g], key, 1); gl.uniform3f(L.uTint, 1, 1, 1); } }
  // effects
  const fx = new MB(), sm = new MB(), px = new MB();
  for (const q of F.parts) { const k = q.life / q.max, s = q.size * (q.smoke ? lerp(1.25, .5, k) : lerp(.3, 1, k)); billQ(q.smoke ? sm : px, [q.x, q.y, q.z], s, cam, q.smoke ? q.col.map(v => v * (.7 + .3 * k)) : q.col.map(v => v * 1.3)); }
  // tracers: a short glowing slug that flies from the muzzle to where the round lands (or a full streak for the old style)
  for (const t of F.tracers) { if (!t.len) { lineQ(fx, t.a, t.b, t.w, eye, t.col.map(v => v * 1.6), t.col); continue; }
    const L = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1], t.b[2] - t.a[2]) || 1, k = 1 - t.t / t.max, d1 = Math.min(L, k * L + t.len * .5), d0 = Math.max(0, d1 - t.len), P = d => t.a.map((v, i) => v + (t.b[i] - v) * d / L);
    if (d1 > d0) lineQ(fx, P(d0), P(d1), t.w, eye, t.col.map(v => v * 1.8), t.col.map(v => v * .7)); }
  for (const b of F.beacons) { const c = { support: [.4, 1.4, .5], eagle: [1.4, .5, .4], orbital: [1.4, .4, .3] }[STRATS[b.key].kind] || [1, 1, 1], y = fieldH(b.x, b.z), pul = .6 + .4 * Math.sin(F.t * 12);
    lineQ(fx, [b.x, y + .45, b.z], [b.x, y + 60, b.z], .18 * pul, eye, c, c.map(v => v * .2)); billQ(px, [b.x, y + .45, b.z], .12 + .06 * pul, cam, c.map(v => v * 1.4)); }

  for (const s of F.strikes) if (s.warn || s.meteor) { const y = fieldH(s.x, s.z); if (s.meteor) { const h = s.t * 80; lineQ(fx, [s.x + h * .4, y + h, s.z], [s.x + h * .4 + 12, y + h + 24, s.z], 1.2, eye, [1.6, .8, .3], [.3, .1, 0]); billQ(fx, [s.x + h * .4, y + h, s.z], 1.6, cam, [2, 1.4, .7]); } }
  for (const b of F.beams) { const y = fieldH(b.x, b.z); lineQ(fx, [b.x, y, b.z], [b.x, y + 400, b.z], 2.4 * b.t * 2, eye, [1.8, 1.8, 2], [.6, .8, 1.2]); }
  for (const j of F.jets) { const a = j.t * 90 - 140, x = j.x + Math.cos(j.dir) * a, z = j.z + Math.sin(j.dir) * a, y = fieldH(j.x, j.z) + 45; lineQ(fx, [x, y, z], [x - Math.cos(j.dir) * 14, y, z - Math.sin(j.dir) * 14], .9, eye, [1.6, 1.4, 1.2], [.4, .4, .5]); billQ(fx, [x, y, z], 1.4, cam, [.25, .27, .3]); }
  for (const pd of F.pods) { const hot = clamp((pd.y - pd.gy - 20) / 60, 0, 1); billQ(px, [pd.x, pd.y + 1.8, pd.z], .5 + hot * .5, cam, [1.8, .9 + hot * .5, .4]); }
  for (const q of F.epods || []) if (!q.landed) { const hot = clamp((q.y - q.gy - 20) / 60, 0, 1); billQ(px, [q.x, q.y + 2.9, q.z], .5 + hot * .6, cam, [1.9, .6 + hot * .4, .3]); if (hot > .2) lineQ(fx, [q.x, q.y + 2.9, q.z], [q.x, q.y + 2.9 + 30 * hot, q.z], .8 * hot, eye, [1.6, .7, .3], [.3, .1, 0]); }
  if (e.state === "rope" || e.state === "climb") { const pp = pelicanPos(), gy = fieldH(e.x, e.z), sw = Math.sin(F.t * 1.3) * .3; lineQ(fx, [pp[0] - Math.cos(e.yaw) * 6.2, pp[1] - 1.8, pp[2] - Math.sin(e.yaw) * 6.2], e.state === "climb" ? [eye[0] - cam.f[0] * .7, eye[1] - 1.2, eye[2] - cam.f[2] * .7] : [ropeX() + sw, fieldH(ropeX(), ropeZ()), ropeZ()], e.state === "climb" ? .03 : .07, eye, [.55, .5, .4]); }
  if (e.state === "inbound" || e.state === "rope" || e.state === "climb") { const pp = pelicanPos(); for (const s of [-1, 1]) { const ex = pp[0] - Math.cos(e.yaw) * 1.4 - Math.sin(e.yaw) * s * 7.4, ez = pp[2] - Math.sin(e.yaw) * 1.4 + Math.cos(e.yaw) * s * 7.4; billQ(px, [ex, pp[1] - 1.5, ez], .9 + Math.random() * .4, cam, [.6, 1.2, 1.8]); } }
  for (const c of F.charges || []) { const on = Math.sin(F.t * (c.t < 2 ? 22 : 9)) > 0; billQ(px, [c.x, c.y, c.z], on ? .16 : .07, cam, on ? [2.2, .3, .2] : [.5, .05, .05]); }
  drawMB(sm, "decalBlob", 1, 1); drawMB(fx, "white", 1); drawMB(px, "decalBlob", 1); casingDraw(eye, "field");
  if (hasMod(F.m, "rain") && !(DROP && !DROP.landed)) drawRain(eye);
  return C;
}
// a stratagem beacon (and a grenade): small 3D models for your hand and for the world
const BEACONM = {};
function beaconParts(kind) {
  if (BEACONM[kind]) return BEACONM[kind];
  const tip = kind === "support" ? "glowGreenS" : kind === "grenade" ? "dark" : "glowRed";
  return (BEACONM[kind] = buildParts(() => {
    if (kind === "grenade") { cyl(0, 0, -.05, .05, .045, 8, "hullOut3", { cap: "dark" }); box(-.012, .05, -.02, .012, .08, .02, "pipeMetal"); box(.012, .03, -.008, .05, .07, .008, "pipeMetal"); return; }
    cyl(0, 0, -.11, .09, .03, 8, "dark", { cap: "hullOut3" }); cyl(0, 0, -.13, -.11, .036, 8, "hullOut3", { cap: "dark" });
    for (const y of [-.05, .03]) cyl(0, 0, y, y + .015, .033, 8, "haz"); cyl(0, 0, .09, .14, .018, 6, tip, { cap: tip }); }));
}
// the weapon in your hands, with its own depth so it never sinks into walls
// hand-drawn first-person weapon sprites (fieldart/wp_*.png, 256 px square, gun entering from the bottom right).
// mz = where the barrel ends on the sprite, for the muzzle flash.
const GUN_FRAME = { drop: 52, right: 26, size: .78 };   // shared framing: every gun sprite is drawn the same way
const GUNSPRITE = { rifle: { art: "wp_rifle", mz: [54, 80], ...GUN_FRAME }, shotgun: { art: "wp_shotgun", mz: [38, 64], ...GUN_FRAME, drop: 80 },
  smg: { art: "wp_smg", mz: [60, 82], ...GUN_FRAME }, marksman: { art: "wp_marksman", mz: [16, 50], ...GUN_FRAME, drop: 84 } };
function drawGunSprite(S, bx, by, low, sprint, st) { const gl = R3.gl, L = R3.loc, p = st, tk = "wp_" + S.art;
  if (!R3.tex[tk]) { if (!FART[S.art]) return false; R3.tex[tk] = glTex(FART[S.art]); }
  const W = R3.W, H = R3.H, Z = Math.round(H * (S.size || .7)), sc = Z / 256, ZW = Math.round(Z * FART[S.art].w / FART[S.art].h);
  // bob, recoil kick, lowering (reload, swap, carrying) and the sprint tilt, snapped to whole pixels so the art stays crisp
  const ox = Math.round(W - ZW + (S.right || 0) * sc + bx * 700 + p.recoil * 7 + (sprint ? Z * .12 : 0)), oy = Math.round((S.drop || 0) * sc + by * -700 + p.recoil * 5 + low * Z * .45 + (sprint ? Z * .1 : 0));
  const cx = x => x / W * 2 - 1, cy = y => 1 - y / H * 2, x0 = cx(ox), x1 = cx(ox + ZW), y0 = cy(H - Z + oy), y1 = cy(H + oy);
  gl.uniformMatrix4fv(L.uVP, false, IDENT); gl.uniform3f(L.uTint, ...st.tint); const m = new MB(); m.quad([x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], [0, 0, 1], [0, 0, 1, 1]); drawMB(m, tk, 1); gl.uniform3f(L.uTint, 1, 1, 1);
  if (F && F.p) F.p.muzNdc = [cx(ox + S.mz[0] * sc), cy(H - Z + oy + S.mz[1] * sc)];   // where the barrel ends on screen, for the tracers (see muzzleWorld)
  if (st.muzT > 0 && low < .3) { const mx = cx(ox + S.mz[0] * sc), my = cy(H - Z + oy + S.mz[1] * sc), f = new MB(), r = (11 + Math.random() * 8) * sc, rx = r / W * 2, ry = r / H * 2, a = Math.random() * 6.28;
    for (const [s, c] of [[1, [1.6, .8, .25]], [.6, [1.9, 1.4, .6]], [.3, [2, 2, 1.7]]]) { const ux = Math.cos(a) * rx * s, uy = Math.sin(a) * ry * s, vx = -Math.sin(a) * rx * s, vy = Math.cos(a) * ry * s;
      f.quad([mx - ux + vx, my - uy + vy, -.5], [mx + ux + vx, my + uy + vy, -.5], [mx + ux - vx, my + uy - vy, -.5], [mx - ux - vx, my - uy - vy, -.5], [0, 0, 1], [0, 0, 1, 1], c); }
    drawMB(f, "decalBlob", 1); }
  return true; }
function drawViewGun(C) {
  const p = F.p; if (!p.alive || DROP || F.grab || F.ext.state === "climb" || F.ext.state === "away") return;
  const gl = R3.gl, L = R3.loc, g = F.gun; gl.clear(gl.DEPTH_BUFFER_BIT); gl.uniformMatrix4fv(L.uVP, false, persp(1.0, R3.W / R3.H, .02, 10));
  const moving = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d"), sprint = keys.has("shift") && moving && p.st > 1, bx = moving ? Math.cos(p.bob * .5) * .012 : 0, by = moving ? Math.abs(Math.sin(p.bob * .5)) * .016 : Math.sin(F.t * 1.5) * .004;
  const rel = p.relT > 0 ? Math.sin(Math.PI * (1 - p.relT / p.relMax)) : 0, low = (1 - ease(Math.min(1, p.raise ?? 1))) * 1.8 + (p.swapT > 0 ? Math.sin(p.swapT / .35 * Math.PI) * 1.4 : 0) + (p.carry ? 1 : 0) + rel * .8 + (F.code ? 1 : 0) + (F.inputMode ? .6 : 0) + (sprint ? .25 : 0);
  const holding = F.armed ? STRATS[F.armed].kind : null, throwing = p.throwT > 0;
  if (holding || throwing) {   // the beacon (or grenade) in your hand instead of the gun; a quick overhand throw
    const tk = 1 - (p.throwT || 0) / .35, arm = throwing ? Math.sin(tk * Math.PI) : 0, kind = holding || p.throwKind;
    if (holding || tk < .55) { const amb = F.P.amb, sun = F.P.sun; gl.uniform3f(L.uTint, (amb[0] + sun[0] * .4) * .95, (amb[1] + sun[1] * .4) * .95, (amb[2] + sun[2] * .4) * .95);
      drawParts(beaconParts(kind), mChain(mT(.15 + bx, -.17 + by + arm * .2 + (holding ? Math.sin(F.t * 3) * .004 : 0), -.36 - arm * .25), mRx(-.35 - arm * 1.2), mRz(.3), mS(.62)), { sky: 1 });
      const m = new MB(), c = { f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] }; if (holding && Math.sin(F.t * 10) > 0) { billQ(m, [.15 + bx, -.12 + by, -.39], .01, c, kind === "support" ? [.6, 2, .6] : [2, .5, .4]); drawMB(m, "decalBlob", 1); }
      gl.uniform3f(L.uTint, 1, 1, 1); }
    return; }
  const GS = GUNSPRITE[F.slots && F.slots[F.slot] && F.slots[F.slot].key]; if (GS) { const amb = F.P.amb, sun = F.P.sun, k = i => .5 + .5 * Math.min(1.1, (amb[i] + sun[i] * .45) * 1.05); if (drawGunSprite(GS, bx, by, low, sprint, { recoil: p.recoil, muzT: F.muzT, tint: [k(0), k(1), k(2)] })) return; }
  const M = mChain(mT(bx, by - low * .3, p.recoil * .06), mRx(p.recoil * .08 - low * .5), mRy(sprint ? .5 : 0));
  const amb = F.P.amb, sun = F.P.sun; gl.uniform3f(L.uTint, (amb[0] + sun[0] * .4) * .95, (amb[1] + sun[1] * .4) * .95, (amb[2] + sun[2] * .4) * .95);
  drawParts(g.parts, M, { sky: 1 }); gl.uniform3f(L.uTint, 1, 1, 1);
  if (F.muzT > 0 && low < .3) { const m = new MB(), c = { f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] }, s = .035 + Math.random() * .025; billQ(m, [.19 + bx, -.2 + by, g.muz], s, c, [2, 1.6, .8]); billQ(m, [.19 + bx, -.2 + by, g.muz - .05], s * .5, c, [2, 2, 2]); drawMB(m, "decalBlob", 1); }

}
function renderFieldMode() {
  const gl = R3.gl; if (!gl) return; const D = DROP;
  if (D && SHIP_STAGES[D.stage]) { renderBase(); return; }
  if (!F) return; const C = renderField(); if (!D) drawViewGun(C); if (D) setH("f-marks", ""); else fieldMarkers();
}

// ---------- HUD ----------
let DEBUG_SPIDERS = false;   // F2 in a mission: show every Canopy Stalker through the trees
const HUDK = ["f-vit", "f-ammo", "f-strats", "f-obj", "f-prompt", "f-msg", "f-comp", "f-code", "f-lock", "f-loadtxt", "f-count", "f-marks"];
function fhudReset() { for (const k of HUDK) delete hudCache[k]; for (const k of ["f-title", "f-msg", "f-count", "f-code", "f-pause"]) if ($(k)) $(k).hidden = k !== "f-title"; $("f-title").classList.remove("go"); $("f-title").innerHTML = ""; }
function project(VP, x, y, z) { const w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15]; if (w < .1) return null; return [((VP[0] * x + VP[4] * y + VP[8] * z + VP[12]) / w * .5 + .5) * stageW, (1 - ((VP[1] * x + VP[5] * y + VP[9] * z + VP[13]) / w * .5 + .5)) * stageH, w]; }
function fieldMarkers() {
  const VP = R3.lastVP, p = F.p, out = [], mk = (x, z, cls, label, h = 3, always = true) => { const y = fieldH(x, z) + h, s = project(VP, x, y, z), d = Math.hypot(x - p.x, z - p.z);
    if (!s) return; if (!always && d > 60) return; const cx = clamp(s[0], 30, stageW - 30), cy = clamp(s[1], 60, stageH - 90);
    out.push(`<div class="fm ${cls}" style="left:${cx | 0}px;top:${cy | 0}px"><i></i><span>${label}<br>${d | 0}m</span></div>`); };
  const spores = hasMod(F.m, "spores"); if (F.dev) devMarks(mk);
  if (!F.obj.done) { if (F.mainNests) for (const n of F.mainNests) if (!n.cleared) mk(n.x, n.z, "obj", n.hum ? n.label.toUpperCase() : "HIVE", 4); if (F.hvt) mk(F.hvt.x, F.hvt.z, "obj", F.hvt.officer && F.hvt.state === "hunt" ? "OFFICER · FLEEING" : F.hvtLabel || "WARLORD", 2.7); if (F.term && F.term.state !== "done") mk(F.term.x, F.term.z, "obj", F.term.state === "upload" ? `${F.term.defend ? "HOLD" : "UPLOAD"} ${Math.floor(F.term.prog * 100)}%` : F.term.defend ? "RELAY" : "UPLINK", 4);
    if (F.box && !F.box.carried) mk(F.box.x, F.box.z, "obj", "BLACK BOX", 1.5); if (F.box && F.box.carried) mk(F.ext.x, F.ext.z, "ext", "DELIVER", 3); }
  if (F.obj.done && (F.ext.state === "ready" || F.ext.state === "called" || F.ext.state === "rope" || F.ext.state === "inbound")) F.ext.state === "rope" ? mk(ropeX(), ropeZ(), "ext", "ROPE", 2) : mk(F.ext.x, F.ext.z, "ext", "EXTRACT", 3);
  if (!spores) for (const n of F.nests) if (!n.main && !n.cleared && !n.noSpawn && Math.hypot(n.x - p.x, n.z - p.z) < 120) mk(n.x, n.z, "nest", n.hum ? "CAMP" : "NEST", 3);
  for (const c of F.charges || []) mk(c.x, c.z, "nest", `CHARGE ${Math.ceil(c.t)}`, 2.2);
  for (const it of F.items) if (Math.hypot(it.x - p.x, it.z - p.z) < 25) mk(it.x, it.z, it.kind === "bag" ? "ext" : "smp", it.kind === "bag" ? "YOUR SAMPLES" : "SAMPLE", 1.2);
  for (const c of F.crates) if (c.uses > 0) mk(c.x, c.z, "smp", "RESUPPLY", 1.6, false);
  if (F.waypoint) mk(F.waypoint.x, F.waypoint.z, "wp", "WAYPOINT", 2);
  for (const s of F.side || []) if (!s.done) mk(s.x, s.z, "side", "SIDE · " + s.mk, 4);
  for (const b of F.bugs) if (FBUG[b.type].human && b.dead == null && b.state !== "hunt" && b.spot > .12) { const s = project(VP, b.x, b.y + 2.2, b.z); if (s && Math.hypot(b.x - p.x, b.z - p.z) < 40) out.push(`<div class="fm say spot" style="left:${s[0] | 0}px;top:${s[1] | 0}px;opacity:${Math.min(1, b.spot * 1.6).toFixed(2)}"><span>${b.spot > .6 ? "?!" : "?"}</span></div>`); }
  for (const c of F.callouts || []) { const b = c.b, d = Math.hypot(b.x - p.x, b.z - p.z); if (d > 55) continue; const s = project(VP, b.x, b.y + 2.25, b.z); if (!s || s[0] < 0 || s[0] > stageW || s[1] < 0 || s[1] > stageH) continue;
    out.push(`<div class="fm say" style="left:${s[0] | 0}px;top:${s[1] | 0}px;opacity:${Math.min(1, c.t * 2)}"><span>${c.text}</span></div>`); }
  for (const q of F.pois || []) if (q.seen && !(q.kind === "cache" && q.used) && Math.hypot(q.x - p.x, q.z - p.z) < 160) mk(q.x, q.z, "poi", POI_NAME[q.kind].toUpperCase(), 3);
  if (DEBUG_SPIDERS) for (const g of F.giants || []) { const s = project(VP, g.x, g.y + 4, g.z), d = Math.hypot(g.x - p.x, g.z - p.z);
    if (s) out.push(`<div class="fm spider" style="left:${clamp(s[0], 30, stageW - 30) | 0}px;top:${clamp(s[1], 60, stageH - 90) | 0}px"><i></i><span>STALKER · ${g.state.toUpperCase()}${g.cd > 0 && g.state === "idle" ? " (" + Math.ceil(g.cd) + "s)" : ""}<br>${d | 0}m · ${Math.max(0, g.hp) | 0} HP · grab ${GIANT.R}m</span></div>`); }
  for (const s of F.strikes) if (s.warn) { const v = project(VP, s.x, fieldH(s.x, s.z) + .5, s.z); if (v) out.push(`<div class="fm warn" style="left:${v[0] | 0}px;top:${v[1] | 0}px"><i></i></div>`); }
  setH("f-marks", out.join(""));
}
// ---------- super heavy helmet: an armoured visor frame drawn as pixel art over the corners of the view ----------
const HELM = { w: 0, h: 0 };
function drawHelmet(size) { const big = size === "big", small = size === "small"; const cvs = $("f-helm"), H = 200, W = Math.round(H * stageW / stageH); if (HELM.w === W && HELM.h === H && HELM.size === size) return; HELM.w = W; HELM.h = H; HELM.size = size;
  cvs.width = W; cvs.height = H; const g = cvs.getContext("2d"), im = g.createImageData(W, H), D = im.data, cx = W / 2;
  const put = (x, y, c, a = 255) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4, k = a / 255, o = D[i + 3] / 255;
    D[i] = c[0] * k + D[i] * (1 - k); D[i + 1] = c[1] * k + D[i + 1] * (1 - k); D[i + 2] = c[2] * k + D[i + 2] * (1 - k); D[i + 3] = Math.min(255, (k + o * (1 - k)) * 255); };
  const both = (x, y, c, a) => { put(x, y, c, a); put(W - 1 - x, y, c, a); };
  const n = (x, y) => hash2(x, y, 91);
  // where the glass ends on the left side, row by row: the cheek guards rise from the bottom corners
  // every armour has a helmet; the Juggernaut's guards are bigger and rise higher
  const Y0 = H * (big ? .34 : small ? .56 : .44), E = y => { if (y < Y0) return -1; const t = (y - Y0) / (H - Y0); return W * (big ? .016 + .065 * t + .2 * Math.pow(t, 2.1) : small ? .01 + .025 * t + .1 * Math.pow(t, 2.5) : .012 + .04 * t + .15 * Math.pow(t, 2.3)); };
  const slope = y => Math.abs(E(y + 1) - E(y - 1)) / 2, perp = y => 1 / Math.sqrt(1 + slope(y) * slope(y));
  const METAL = [34, 41, 43], RIM = [111, 127, 128], RIM2 = [58, 68, 70], SEAM = [10, 12, 12], PAD = [64, 89, 79], PADL = [85, 115, 102], PADD = [46, 64, 57], PADS = [21, 32, 29];
  // ---- cheek guards: a mechanical frame along the glass, quilted pads behind it
  for (let y = Math.floor(Y0); y < H; y++) { const e = E(y), pk = perp(y);
    for (let x = 0; x < e; x++) { const d = (e - x) * pk; let c;
      if (d < 1.5) c = [7, 9, 9]; else if (d < 3.5) c = RIM; else if (d < 5) c = RIM2;
      else if (d < 12) { c = METAL.map(v => v * (.9 + n(x, y) * .2)); if (Math.abs(d - 8.5) < 1.2 && (y % 17) < 2) c = [138, 150, 151]; }
      else if (d < 13.5) c = SEAM;
      else { const u = d - 13.5, cu = u % 30, cv = (y + u * .45) % 34;
        if (cu < 2 || cv < 2) c = PADS; else if (cu < 4 || cv < 4) c = PADL; else if (cu > 27 || cv > 31) c = PADD;
        else { const pil = .62 + .5 * Math.sin(Math.PI * cu / 30) * Math.sin(Math.PI * cv / 34) - (cu / 30) * .12; c = PAD.map(v => v * pil * (.95 + n(x, y) * .1)); if (x % 3 === 0 && (x + y) % 6 === 0) c = c.map(v => v * .8); } }
      both(x, y, c); } }
  // cables and a clip running up the inside of each guard
  for (const [off, col, hi] of [[4, [26, 38, 66], [74, 104, 150]], [9, [22, 32, 58], [64, 92, 136]], [14, [30, 30, 34], [90, 92, 98]]])
    for (let y = Math.floor(H * .72); y < H; y++) { const x0 = E(y) - 18 + off * .9 - (H - y) * .02; for (let k = 0; k < 4; k++) both(x0 + k, y, k === 1 ? hi : col); }
  for (let y = Math.floor(H * .8); y < H * .8 + 4; y++) for (let k = 0; k < 8; k++) both(E(H * .8) - 16 + k, y, [214, 128, 48]);
  // ---- brow module at the top centre, with four little indicator lights
  const browHW = y => y < H * .05 ? lerp(W * .13, W * .1, y / (H * .05)) : lerp(W * .1, W * .065, (y - H * .05) / (H * .035));
  for (let y = 0; y < H * .085; y++) { const hw = browHW(y); for (let x = Math.floor(cx - hw); x <= cx + hw; x++) { const dd = Math.min(hw - Math.abs(x - cx), H * .085 - y);
      put(x, y, dd < 1.5 ? [7, 9, 9] : dd < 3.5 ? RIM : dd < 5 ? RIM2 : METAL.map(v => v * (.88 + n(x, y) * .22))); } }
  [[-13, [89, 216, 230]], [-5, [210, 74, 154]], [3, [89, 216, 230]], [11, [210, 74, 154]]].forEach(([ox, c]) => { const y0 = Math.round(H * .04); for (let y = y0; y < y0 + 4; y++) for (let k = -1; k < 4; k++) put(cx + ox + k, y, k < 0 || k > 2 || y === y0 ? [8, 10, 10] : c); });
  for (let k = -9; k <= 9; k += 3) for (let y = Math.round(H * .065); y < H * .065 + 2; y++) put(cx + k, y, [12, 14, 15]);
  // ---- small housings in the top corners
  for (let x = Math.floor(W * .12); x < W * .28; x++) { const yb = H * .085 * (1 - Math.abs(x - W * .2) / (W * .08)); for (let y = 0; y < yb; y++) { const dd = Math.min(yb - y, W * .08 - Math.abs(x - W * .2));
      both(x, y, dd < 1.5 ? [7, 9, 9] : dd < 3.5 ? RIM : METAL.map(v => v * (.9 + n(x, y) * .2))); } }
  for (let y = 2; y < 6; y++) for (let k = 0; k < 5; k++) { both(W * .19 + k, y, [214, 128, 48]); both(W * .2 + 6 + k, y, [60, 110, 170]); }
  for (let x = 0; x < W; x++) for (let y = 0; y < 2; y++) put(x, y, [7, 9, 9]);
  for (let y = 0; y < Y0; y++) for (let x = 0; x < 1; x++) both(x, y, [7, 9, 9]);
  // ---- glass: a faint cyan tint near the frame, and the HUD traces
  for (let y = Math.floor(Y0); y < H; y++) { const e = E(y); for (let k = 0; k < 18; k++) both(e + k, y, [80, 200, 230], (18 - k) * 1.3); }
  const CY = [120, 230, 255], line = (x0, y0, x1, y1, a) => { const L = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= L; k++) both(Math.round(lerp(x0, x1, k / L)), Math.round(lerp(y0, y1, k / L)), CY, a); };
  let py = H * .38, px = E(Y0) + 6;
  for (let y = Y0; y < H * .98; y += 3) { const x = E(y) + 6 + (y > H * .55 && y < H * .6 ? 3 : 0); if (!(y > H * .42 && y < H * .47) && !(y > H * .86 && y < H * .89)) line(px, py, x, y, 150); px = x; py = y; }
  px = E(H * .6) + 13; py = H * .6; for (let y = H * .6; y < H * .85; y += 3) { const x = E(y) + 13; line(px, py, x, y, 60); px = x; py = y; }
  line(W * .275, H * .05, W * .33, H * .13, 120); line(W * .33, H * .13, W * .4, H * .13, 120); line(W * .125, H * .05, W * .07, H * .15, 90); line(W * .07, H * .15, W * .02, H * .3, 90);
  for (let x = W * .4; x < W * .6; x++) put(x, H * .12, CY, 80);
  const ccx = E(H * .82) + 22, ccy = H * .82; for (let a = 0; a < 6.283; a += .05) if (Math.sin(a * 6) > -.3) both(ccx + Math.cos(a) * 12, ccy + Math.sin(a) * 12, CY, 70);
  for (const [mx, my] of [[W * .2, H * .62], [W * .26, H * .2]]) { both(mx - 2, my, CY, 90); both(mx + 2, my, CY, 90); both(mx, my - 2, CY, 90); both(mx, my + 2, CY, 90); both(mx, my, CY, 140); }
  g.putImageData(im, 0, 0);
}
// the helmet is always on: on the ship, in the pod and in the field, sized by the armour you wear
function helmTick() { const fieldOn = (MODE === "field" || MODE === "drop") && F && F.lo, baseOn = MODE === "base" && R3.cv && R3.cv.style.display !== "none", on = !!(fieldOn || baseOn);
  show("f-helm", on); if (!on) return; const a = fieldOn ? F.lo.a : (ARMORS[loadSave().lo.a] || ARMORS.medium); drawHelmet((a && a.helm) || "normal"); }
function fieldHud() {
  const D = DROP; show("f-play", !D && !!F); show("f-cross", !D && !!F && F.p.alive);
  $("f-plasma").style.opacity = 0; $("f-cloud").style.opacity = 0;
  show("f-load", !!D && (D.stage === "space" || D.stage === "entry"));
  if (!F || D) { show("f-lock", false); return; }
  const p = F.p, lo = F.lo, w = lo.w;
  setH("f-vit", `<div class="bar hp"><i style="width:${p.hp / lo.hp * 100}%"></i></div><div class="bar st"><i style="width:${p.st}%"></i></div>
    <div class="cnt"><span>STIMS <b>${p.stims}</b> [F]</span><span>REINF <b>${F.reinf}</b></span><span>SAMPLES <b>${p.samples}</b></span></div>`);
  setH("f-ammo", `<div class="wn">${w.name}</div><div class="am"><b>${p.relT > 0 ? "--" : p.ammo}</b>/<small>${lo.mag}</small></div><div class="mg">${"▮".repeat(Math.max(0, p.mags))}${p.relT > 0 ? " RELOADING" : p.ammo === 0 && p.mags > 0 ? " [R] RELOAD" : p.ammo === 0 ? " EMPTY" : ""}</div><div class="gr">GRENADES <b>${p.gren}</b> [G]</div><div class="sw">${F.slots.map((s, i) => `<span class="${i === F.slot ? "on" : ""}">${i + 1} ${s.w.name.split(" ")[0]}</span>`).join("")}</div>`);
  const off = stratOffline3();
  setH("f-strats", lo.strats.map(k => { const S = STRATS[k], rdy = stratReady3(k), cdv = S.uses ? (F.uses[k] > 0 ? `${F.uses[k]} left` : `rearm ${Math.ceil(F.rearm[k])}s`) : rdy ? "ready" : `${Math.ceil(F.cd[k])}s`, typed = F.inputMode && S.code.startsWith(F.input) && rdy;
    return `<div class="fs ${S.kind} k-${k} ${rdy && !off ? "" : "dim"} ${F.armed === k ? "arm" : ""}"><div class="ic">${stratIc(k)}</div><div><b>${S.name}</b><div class="code">${[...S.code].map((c, i) => `<span class="${typed && i < F.input.length ? "hit" : ""}">${ARW[c]}</span>`).join("")}</div><small>${off ? "OFFLINE" : cdv}</small></div></div>`; }).join("")
    + `<div class="fhint">${F.armed ? "CLICK TO THROW THE BEACON · Q CANCELS" : F.inputMode ? "ARROWS / WASD TO ENTER THE CODE" : "HOLD Q · ENTER A CODE"}</div>`);
  $("f-strats").classList.toggle("open", F.inputMode || !!F.armed);
  const o = F.m.obj, obj = !F.obj.done ? (o === "dev" ? `Dev world<small>E on an exhibit: next animation · F4: tools, teleport back</small>` : o === "purge" ? `Destroy the hives <b>${F.mainNests.filter(n => n.cleared).length}/3</b><small>Holes only break to explosives</small>` : o === "sabotage" ? `Destroy the command post targets <b>${F.mainNests.filter(n => n.cleared).length}/3</b><small>Plant a charge (E) or use explosives</small>` : o === "hvt" ? (F.hvt ? `Eliminate the warlord <b>${Math.ceil(Math.max(0, F.hvt.hp) / F.hvt.max * 100)}%</b><small>He's dug in at the command post with his guards</small>` : `Warlord down`) : o === "officer" ? (F.hvt ? (F.hvt.state === "hunt" ? `Catch the officer<small>She's running for another camp</small>` : `Assassinate the officer<small>Unarmed, escorted · she runs if the alarm goes up</small>`) : `Officer down`) : o === "defend" ? (F.term.state === "idle" ? `Reach the colony relay<small>Switch it on, then hold the line</small>` : `Hold the line <b>${Math.floor(F.term.prog * 100)}%</b><small>${F.term.contested ? "CONTESTED: clear them off the relay" : "Evacuation in progress · stay close"}</small>`) : o === "uplink" ? (F.term.state === "idle" ? `Reach the uplink terminal<small>Enter the code to start the upload</small>` : `Defend the upload <b>${Math.floor(F.term.prog * 100)}%</b><small>${F.term.contested ? (F.foe === "human" ? "CONTESTED: clear the enemies off the terminal" : "CONTESTED: clear the bugs off the terminal") : "Stay close"}</small>`)
      : F.box.carried ? `Carry the black box to extraction<small>You can't shoot while carrying it</small>` : `Recover the black box<small>Search the wreck</small>`)
    : ({ ready: "Call extraction at the pad terminal", called: `Hold the LZ <b>${Math.ceil(F.ext.t)}s</b>`, inbound: "Pelican-1 inbound", rope: "Get to the rope", climb: "Climbing", away: "Extracted" }[F.ext.state] || "");
  const tl = Math.max(0, F.timeLeft); setH("f-obj", `<div class="k">${OBJ_TITLE[o]}</div><div class="o">${obj}</div>${F.side && F.side.length ? `<div class="sd">${F.side.map(s => `<div class="${s.done ? "dn" : ""}">${s.done ? "☑" : "☐"} ${s.label}</div>`).join("")}</div>` : ""}<div class="tm ${tl < 120 ? "low" : ""}">${F.dev ? "NO TIMER" : F.destroyerGone ? "DESTROYER GONE" : "DESTROYER " + fmtT(tl)}</div>${F.ion > 0 ? `<div class="hz">ION STORM ${Math.ceil(F.ion)}s</div>` : ""}`);
  // compass
  const deg = ((p.yaw * 180 / Math.PI + 90) % 360 + 360) % 360, ticks = []; for (let a = -90; a <= 90; a += 15) { const h = Math.round((deg + a) / 15) * 15, off2 = h - deg; if (Math.abs(off2) > 90) continue; const hh = (h % 360 + 360) % 360;
    ticks.push(`<span style="left:${50 + off2 / 1.8}%" class="${hh % 90 ? "" : "c"}">${{ 0: "N", 90: "E", 180: "S", 270: "W" }[hh] ?? (hh % 45 ? "·" : "|")}</span>`); }
  const tgt = !F.obj.done ? (F.hvt ? F.hvt : F.mainNests ? F.mainNests.find(n => !n.cleared) : F.term && F.term.state !== "done" ? F.term : F.box && !F.box.carried ? F.box : F.ext) : F.ext;
  if (tgt) { const a = (Math.atan2(tgt.z - p.z, tgt.x - p.x) * 180 / Math.PI + 90 - deg + 540) % 360 - 180; if (Math.abs(a) < 90) ticks.push(`<span class="tg" style="left:${50 + a / 1.8}%">◆</span>`); }
  if (F.waypoint) { const a = (Math.atan2(F.waypoint.z - p.z, F.waypoint.x - p.x) * 180 / Math.PI + 90 - deg + 540) % 360 - 180; if (Math.abs(a) < 90) ticks.push(`<span class="tg wp" style="left:${50 + a / 1.8}%">◆</span>`); }
  setH("f-comp", `<div class="ln">${ticks.join("")}</div><div class="nd">${Math.round(deg)}°</div>`);
  const it = interact3(); show("f-prompt", !!it); if (it) setH("f-prompt", `<span class="key">E</span><b>${it.label}</b>`);
  const m = F.msg && F.msg.t > 0 ? F.msg : null; show("f-msg", !!m); if (m) { setH("f-msg", `${m.big ? `<b>${m.big}</b>` : ""}<small>${m.small}</small>`); $("f-msg").style.opacity = Math.min(1, m.t * 2); }
  show("f-code", !!F.code); if (F.code) setH("f-code", `<div class="k">UPLINK ACCESS CODE</div><div class="seq ${F.code.fail > 0 ? "bad" : ""}">${F.code.seq.map((c, i) => `<span class="${i < F.code.i ? "hit" : ""}">${ARW[c]}</span>`).join("")}</div><small>ARROWS / WASD · E TO STEP AWAY</small>`);
  $("f-vig").style.opacity = clamp((1 - p.hp / lo.hp) * .8 + (p.hurtT > 0 ? p.hurtT : 0), 0, 1);
  show("f-dead", !p.alive); show("f-lock", document.pointerLockElement !== R3.cv && !BASE.noLock && !F.paused);
  show("f-carry", !!p.carry); show("f-dbg", DEBUG_SPIDERS); if (DEBUG_SPIDERS) { const gs = F.giants || []; setH("f-dbg", `DEBUG · STALKERS ${gs.filter(g => g.state !== "dead").length} alive · nearest ${gs.length ? Math.min(...gs.map(g => Math.hypot(g.x - p.x, g.z - p.z))) | 0 : "-"}m · F2`); } show("f-grab", !!F.grab); if (F.grab) $("f-grabbar").style.width = Math.min(100, F.grab.prog * 100) + "%";
  const dd = F.dmgDir && F.dmgDir.t > 0 ? F.dmgDir : null; if (F.dmgDir) F.dmgDir.t -= 1 / 60; $("f-dir").style.opacity = dd ? Math.min(1, dd.t) : 0;
  if (dd) $("f-dir").style.rotate = (Math.atan2(dd.z - p.z, dd.x - p.x) - p.yaw - Math.PI / 2) * 180 / Math.PI + "deg";
  const mapOn = keys.has("tab") && p.alive; show("f-map", mapOn); if (mapOn) drawTacMap(); else if (F.mapCur) { F.mapCur.x = p.x; F.mapCur.z = p.z; }
}
// ---------- tactical map: the same terrain the war table showed, with what you know about it ----------
let TACBG = null;
const MAPC = 720;   // map canvas size in pixels
// the base picture, baked once per mission: hill shading, contour lines, forest, water, trails
function buildTacMap() {
  const N = 512, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N), P = F.P, W = FW.RW * 1.02, step = W * 2 / N;
  const hs = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) hs[j * N + i] = fieldH(-W + (i + .5) * step, -W + (j + .5) * step);
  const ground = P.g.map(v => v * .8 + 18), forest = [32, 62, 34], water = FLD.waterOn ? [38, 78, 82] : [50, 90, 120], trail = [150, 118, 74];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -W + (i + .5) * step, z = -W + (j + .5) * step, h = hs[j * N + i], o = (j * N + i) * 4;
    const out = Math.hypot(x, z) > FW.RW * .96, hx = hs[j * N + Math.min(N - 1, i + 1)] - h, hz = hs[Math.min(N - 1, j + 1) * N + i] - h;
    const shade = clamp(1 + (-hx * .55 - hz * .55) / step * .35, .55, 1.35), f = forestAt(x, z, FLD), pd = FLD.pathG ? pathD(x, z, FLD) : 99, wet = FLD.waterOn && h < FLD.waterY;
    let col = ground.map((v, q) => lerp(v, forest[q], f * .85)); if (pd < 2.4) col = col.map((v, q) => lerp(v, trail[q], .8));
    if (wet) { const dep = clamp((FLD.waterY - h) / 1.2, 0, 1); col = water.map(v => v * (1 - dep * .25)); } else col = col.map(v => v * shade);
    const cl = Math.floor(h / 5), contour = !wet && (Math.floor(hs[j * N + Math.min(N - 1, i + 1)] / 5) !== cl || Math.floor(hs[Math.min(N - 1, j + 1) * N + i] / 5) !== cl);
    if (contour) col = col.map(v => v * (cl % 4 === 0 ? .55 : .78));
    if (out) col = [16, 18, 20].map(v => v + (hash2(i, j, 5) < .1 ? 6 : 0));
    for (let q = 0; q < 3; q++) im.data[o + q] = clamp(col[q], 0, 255); im.data[o + 3] = 255; }
  g.putImageData(im, 0, 0); TACBG = c; TACBG.W = W;
}
// drawn every frame while TAB is held: grid, POIs, objectives, bugs nearby, your waypoint and the cursor
function drawTacMap() {
  const c = $("f-mapc"), g = c.getContext("2d"), N = MAPC, p = F.p, t = performance.now() / 1000;
  if (!TACBG || TACBG.fid !== FLD) { buildTacMap(); TACBG.fid = FLD; }
  const W = TACBG.W, Z = F.mapZoom || 1, cx = Z > 1 ? clamp(p.x, -W + W / Z, W - W / Z) : 0, cz = Z > 1 ? clamp(p.z, -W + W / Z, W - W / Z) : 0, S = N / (2 * W) * Z;
  const X = x => (x - cx) * S + N / 2, Y = z => (z - cz) * S + N / 2; F.mapView = { cx, cz, S };
  g.imageSmoothingEnabled = false; g.fillStyle = "#0b0d0f"; g.fillRect(0, 0, N, N);
  g.drawImage(TACBG, (cx - W / Z + W) / (2 * W) * 512, (cz - W / Z + W) / (2 * W) * 512, 512 / Z, 512 / Z, 0, 0, N, N);
  // grid: 8 x 8 sectors, letters across, numbers down
  const SEC = 2 * FW.RW / 8; g.lineWidth = 1; g.font = "10px Silkscreen, monospace";
  for (let k = 0; k <= 8; k++) { const wx = -FW.RW + k * SEC; g.strokeStyle = "rgba(170,230,255,.16)"; g.beginPath(); g.moveTo(X(wx), 0); g.lineTo(X(wx), N); g.moveTo(0, Y(wx)); g.lineTo(N, Y(wx)); g.stroke();
    if (k < 8) { g.fillStyle = "rgba(170,230,255,.75)"; g.fillText("ABCDEFGH"[k], X(wx + SEC / 2) - 3, 12); g.fillText(String(k + 1), 4, Y(wx + SEC / 2) + 4); } }
  const sector = (x, z) => "ABCDEFGH"[clamp(Math.floor((x + FW.RW) / SEC), 0, 7)] + (clamp(Math.floor((z + FW.RW) / SEC), 0, 7) + 1);
  const dot = (x, z, col, r = 4, sq) => { g.fillStyle = col; if (sq) g.fillRect(X(x) - r, Y(z) - r, r * 2, r * 2); else { g.beginPath(); g.arc(X(x), Y(z), r, 0, 7); g.fill(); } };
  const lbl = (x, z, s2, col, dy = 0) => { g.font = "10px Silkscreen, monospace"; g.fillStyle = "#000"; g.fillText(s2, X(x) + 8, Y(z) + 5 + dy); g.fillStyle = col; g.fillText(s2, X(x) + 7, Y(z) + 4 + dy); };
  const diamond = (x, z, col, r) => { g.fillStyle = col; g.strokeStyle = "#000"; g.beginPath(); g.moveTo(X(x), Y(z) - r); g.lineTo(X(x) + r, Y(z)); g.lineTo(X(x), Y(z) + r); g.lineTo(X(x) - r, Y(z)); g.closePath(); g.fill(); g.stroke(); };
  // points of interest you've found
  const ICON = { ruins: "#9df0c8", wreck: "#c8ccd4", cache: "#72e06a", outpost: "#d8c8a0", bones: "#f0e6cc", hand: "#e0a870", crawler: "#e0b040", vapor: "#72e06a" };
  for (const q of F.pois || []) if (q.seen) { const used = q.kind === "cache" && q.used; g.strokeStyle = ICON[q.kind]; g.lineWidth = 2; g.strokeRect(X(q.x) - 5, Y(q.z) - 5, 10, 10); g.lineWidth = 1; if (!used) dot(q.x, q.z, ICON[q.kind], 2.5, true); lbl(q.x, q.z, POI_NAME[q.kind] + (used ? " (looted)" : ""), ICON[q.kind]); }
  if (!hasMod(F.m, "spores")) for (const n of F.nests) if (!n.cleared && !n.noSpawn) { dot(n.x, n.z, n.main ? "#ff3a2a" : "#ff8a52", n.main ? 6 : 4, true); if (n.main) lbl(n.x, n.z, n.hum ? n.label.toUpperCase() : "HIVE", "#ff6a52"); else if (n.hum) lbl(n.x, n.z, "CAMP", "#ff8a52"); }
  if (F.hvt) { const hx = F.hvt.officer ? F.hvt.x : FLD.obj.x, hz = F.hvt.officer ? F.hvt.z : FLD.obj.z; diamond(hx, hz, "#ff3a2a", 7); lbl(hx, hz, F.hvtLabel || "WARLORD", "#ff6a52"); }
  if (F.term) { diamond(F.term.x, F.term.z, "#f2d230", 7); lbl(F.term.x, F.term.z, F.term.defend ? "RELAY" : "UPLINK", "#f2d230"); }
  for (const s of F.side || []) if (!s.done) { g.strokeStyle = "#7ac0ff"; g.lineWidth = 2; g.beginPath(); g.arc(X(s.x), Y(s.z), 7, 0, 7); g.stroke(); g.lineWidth = 1; lbl(s.x, s.z, "SIDE · " + s.mk, "#7ac0ff"); }
  if (F.box && !F.box.delivered) { diamond(F.box.x, F.box.z, "#ff9a3a", 6); lbl(F.box.x, F.box.z, "BLACK BOX", "#ff9a3a"); }
  if (F.mainNests) { const mn = F.mainNests.filter(n => !n.cleared); if (mn.length) { g.strokeStyle = "rgba(242,210,48,.8)"; g.setLineDash([3, 3]); g.beginPath(); g.arc(X(FLD.obj.x), Y(FLD.obj.z), 32 * S, 0, 7); g.stroke(); g.setLineDash([]); lbl(FLD.obj.x, FLD.obj.z - 32, "OBJECTIVE", "#f2d230"); } }
  g.strokeStyle = "#55d6ff"; g.lineWidth = 2; g.beginPath(); g.arc(X(F.ext.x), Y(F.ext.z), 9 * S + 3, 0, 7); g.stroke(); g.lineWidth = 1; dot(F.ext.x, F.ext.z, "#55d6ff", 3); lbl(F.ext.x, F.ext.z, F.obj.done ? "EXTRACTION" : "EXTRACTION (locked)", "#55d6ff");
  for (const it of F.items) if (it.kind === "bag") { dot(it.x, it.z, "#9cff7a", 4); lbl(it.x, it.z, "YOUR SAMPLES", "#9cff7a"); }
  for (const cr of F.crates) if (cr.uses > 0) dot(cr.x, cr.z, "#72e06a", 3, true);
  for (const b of F.bugs) if (b.dead == null && Math.hypot(b.x - p.x, b.z - p.z) < 70) dot(b.x, b.z, "rgba(255,80,60,.9)", 1.8);
  for (const s2 of F.strikes) if (s2.warn) { g.fillStyle = `rgba(255,40,30,${.25 + .2 * Math.sin(t * 10)})`; g.beginPath(); g.arc(X(s2.x), Y(s2.z), s2.r * S, 0, 7); g.fill(); }
  if (DEBUG_SPIDERS) for (const gg of F.giants || []) if (gg.state !== "dead") { g.strokeStyle = "rgba(255,60,110,.8)"; g.setLineDash([4, 3]); g.beginPath(); g.arc(X(gg.x), Y(gg.z), GIANT.R * S, 0, 7); g.stroke(); g.setLineDash([]); dot(gg.x, gg.z, "#ff2a6a", 5); lbl(gg.x, gg.z, "STALKER", "#ff5a8a"); }
  // your waypoint
  const wp = F.waypoint; if (wp) { g.strokeStyle = "#ff5adc"; g.lineWidth = 2; g.beginPath(); g.moveTo(X(p.x), Y(p.z)); g.setLineDash([2, 4]); g.lineTo(X(wp.x), Y(wp.z)); g.stroke(); g.setLineDash([]); diamond(wp.x, wp.z, "#ff5adc", 7); g.lineWidth = 1; lbl(wp.x, wp.z, `WAYPOINT ${Math.hypot(wp.x - p.x, wp.z - p.z) | 0}m`, "#ff9aea"); }
  // you: an arrow pointing where you look, with a pulsing ring
  g.save(); g.translate(X(p.x), Y(p.z)); g.rotate(p.yaw); g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.beginPath(); g.moveTo(10, 0); g.lineTo(-7, -7); g.lineTo(-3, 0); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.strokeStyle = `rgba(255,255,255,${.4 + .3 * Math.sin(t * 4)})`; g.beginPath(); g.arc(X(p.x), Y(p.z), 15 + (t * 20 % 10), 0, 7); g.stroke();
  // the map cursor (moved with the mouse while the map is open)
  const cur = F.mapCur || (F.mapCur = { x: p.x, z: p.z }); cur.x = clamp(cur.x, cx - W / Z, cx + W / Z); cur.z = clamp(cur.z, cz - W / Z, cz + W / Z);
  g.strokeStyle = "#fff"; g.lineWidth = 1; const ux = X(cur.x), uz = Y(cur.z); g.beginPath(); g.moveTo(ux - 10, uz); g.lineTo(ux - 3, uz); g.moveTo(ux + 3, uz); g.lineTo(ux + 10, uz); g.moveTo(ux, uz - 10); g.lineTo(ux, uz - 3); g.moveTo(ux, uz + 3); g.lineTo(ux, uz + 10); g.stroke();
  // scale bar, compass, readouts
  const bar = (Z > 1 ? 50 : 100) * S; g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(8, N - 30, bar + 52, 22); g.fillStyle = "#e8eef2"; g.fillRect(14, N - 16, bar, 3); g.fillRect(14, N - 20, 2, 10); g.fillRect(14 + bar - 2, N - 20, 2, 10); g.fillText(`${Z > 1 ? 50 : 100}m`, 20 + bar, N - 12);
  g.save(); g.translate(N - 26, 30); g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill(); g.fillStyle = "#ff5a40"; g.beginPath(); g.moveTo(0, -14); g.lineTo(5, 0); g.lineTo(-5, 0); g.fill(); g.fillStyle = "#e8eef2"; g.beginPath(); g.moveTo(0, 14); g.lineTo(5, 0); g.lineTo(-5, 0); g.fill(); g.font = "9px Silkscreen, monospace"; g.fillText("N", -3, -18); g.restore();
  const dist = Math.hypot(cur.x - p.x, cur.z - p.z) | 0;
  setH("f-mapinfo", `<span>YOU <b>${sector(p.x, p.z)}</b></span><span>CURSOR <b>${sector(cur.x, cur.z)}</b> · ${dist}m</span><span>ZOOM <b>${Z > 1 ? "2.5×" : "1×"}</b></span>`);
}
// ---------- input and pause ----------
function fieldPause(on) { if (!F || DROP) return; F.paused = on; $("f-pause").hidden = !on; if (on) { keys.clear(); mouse.down = false; if (document.pointerLockElement) document.exitPointerLock(); } }
addEventListener("mousedown", e => { if ((MODE === "field" || MODE === "drop") && e.target === R3.cv && document.pointerLockElement !== R3.cv && !(F && F.paused)) tryLock(); });
addEventListener("mousemove", e => {
  if (MODE !== "field" && MODE !== "drop") return; if (F && F.paused) return;
  const dx = clamp(e.movementX || 0, -120, 120) * .0024, dy = clamp(e.movementY || 0, -120, 120) * .0024;
  if (F && !DROP && keys.has("tab") && F.p.alive) { const v = F.mapView, k = v ? 1 / v.S * 1.6 : .8, c = F.mapCur || (F.mapCur = { x: F.p.x, z: F.p.z }); c.x += (e.movementX || 0) * k; c.z += (e.movementY || 0) * k; return; }
  if (DROP) { const D = DROP; if (D.stage === "board" && D.t < 1.5) return; D.look = D.look || { yaw: 0, pitch: 0 }; D.look.yaw = clamp(D.look.yaw + dx, -1.6, 1.6); D.look.pitch = clamp(D.look.pitch - dy, -1, 1); return; }
  if (F) { F.p.yaw += dx; F.p.pitch = clamp(F.p.pitch - dy, -1.35, 1.35); }
});
addEventListener("mousedown", e => { if (MODE !== "field" || !F || DROP || !keys.has("tab")) return; const c = F.mapCur; if (!c) return;
  if (e.button === 2 || (F.waypoint && Math.hypot(F.waypoint.x - c.x, F.waypoint.z - c.z) < 10)) { F.waypoint = null; AU.click(); } else if (e.button === 0) { F.waypoint = { x: c.x, z: c.z }; AU.beacon(); } });
addEventListener("contextmenu", e => { if (MODE === "field") e.preventDefault(); });
addEventListener("keydown", e => {
  if (MODE !== "field") return; const k = e.key.toLowerCase();
  if (k === "escape" && F && !DROP && !document.pointerLockElement && performance.now() - BASE.unlockT > 300) fieldPause(!F.paused);
  if (k === " " || k === "tab" || k === "alt" || k.startsWith("arrow")) e.preventDefault();
  if (k === "f3" && F) { e.preventDefault(); if (!PIX.on) { PIX.on = true; PIX.k = 1; } else if (PIX.k === 1) PIX.k = 2; else PIX.on = false; try { localStorage.setItem("dz_pix2", PIX.on ? PIX.k : 0); } catch (_) {}
    fmsg("", PIX.on ? (PIX.k === 2 ? "Pixel filter: chunky (F3)" : "Pixel filter: fine (F3)") : "Pixel filter: off (F3)", 2); }
  if (k === "f2" && F) { e.preventDefault(); DEBUG_SPIDERS = !DEBUG_SPIDERS; fmsg("", DEBUG_SPIDERS ? "DEBUG · spider locations ON (F2)" : "DEBUG · spider locations OFF (F2)", 2); }
});
$("f-resume").onclick = () => { fieldPause(false); tryLock(); };
$("f-abandon").onclick = () => { $("f-pause").hidden = true; F.paused = false; fieldEnd(false); };
// losing the mouse or the window pauses the mission (Esc releases the mouse first, so this is the Esc pause)
document.addEventListener("pointerlockchange", () => { if (!document.pointerLockElement && MODE === "field" && F && !F.paused && !DROP && !F.over && !BASE.noLock) fieldPause(true); });
addEventListener("blur", () => { if (MODE === "field" && F && !F.paused && !DROP && !F.over) fieldPause(true); });
