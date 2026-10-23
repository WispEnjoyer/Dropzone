import pathlib
s=pathlib.Path('src')
code="\n".join((s/f).read_text() for f in ["core.js", "audio.js", "audio2.js","audio3.js","bugsound.js","world.js","game.js","gear.js","ui.js","texart.js","base.js","galaxy.js","war.js","arsenal.js","stations.js","podmodel.js","fgen.js","field.js", "humans.js", "objmodels.js","desertmodels.js","humobj.js","fieldrender.js","giant.js", "casings.js","range.js", "dev.js","devworld.js", "intro.js","tutorial.js"])
import base64
art='const ART = {'+','.join(f'{p.stem}:"data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()+'"' for p in sorted(pathlib.Path('art').glob('*.png')))+'};\n'
port='const PORTRAIT = {'+','.join(f'{p.stem}:"data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()+'"' for p in sorted(pathlib.Path('portraits').glob('*.png')))+'};\n'
fart='const FIELDART = {'+','.join(f'{p.stem}:"data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()+'"' for p in sorted(pathlib.Path('fieldart').glob('*.png')))+'};\n'
snd='const SOUNDS = {'+','.join(f'{p.stem}:"'+base64.b64encode(p.read_bytes()).decode()+'"' for p in sorted(pathlib.Path('sounds').glob('*.mp3')))+'};\n'
code=art+port+fart+snd+code
t=(s/'template.html').read_text().replace('/*CODE*/',code)
pathlib.Path('play.html').write_text(t); pathlib.Path('dropzone.html').write_text(t); print(len(t))   # play.html is the GitHub Pages copy; dropzone.html the local one
