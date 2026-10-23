# DROPZONE

Drop onto a hostile planet. Do the job. Get out alive.

A first-person drop-trooper game with pixel-art worlds that runs entirely in the browser: WebGL, Web Audio and hand-drawn sprites, no engine, shipped as one HTML file.

**Play:** https://wispenjoyer.github.io/Dropzone/ (or open `play.html` locally)

## What's in it
- Walk your ship between missions: war table, armory, requisition, engineering, firing range.
- Drop in a hellpod onto generated operations: swamp jungle and desert worlds, bugs or Skull Company mercenaries.
- Stratagems by arrow code, extraction by Pelican, a liberation campaign with counter-attacks, ranks, medals and ship modules.

## Building
```
python3 build.py
```
Concatenates `src/*.js` into `src/template.html` and embeds everything in `art/`, `portraits/`, `fieldart/` and `sounds/` as base64. It writes `play.html` (the page GitHub Pages serves) and `dropzone.html` (a local copy, git-ignored).

## Layout
| Path | What |
|---|---|
| `index.html` | Landing page for GitHub Pages |
| `play.html` | The built game |
| `src/` | Game source (one file per system) and the HTML/CSS template |
| `fieldart/` | Textures, icons, ranks, medals, weapon art |
| `art/`, `portraits/`, `tiles/` | Sprites and character portraits |
| `sounds/` | Recorded sounds (bug voices, rain loop, wet footsteps) |
| `assets/` | Spare icons not wired in yet |
| `screens/` | Screenshots for the landing page |
