# Composes the ship's textures from the 64px tilesets (tiles/A00..B33.png).
# Walls are 64 x 192 (1m x 3m): dark trim at the top, one calm main panel, a kick plate at the bottom.
# Only parts of tiles are used where whole tiles would be too busy, and everything is toned down.
from PIL import Image, ImageOps, ImageEnhance
import colorsys, base64, io, pathlib

def T(n): return Image.open(f'tiles/{n}.png').convert('RGBA')
def crop(n, y0, y1, x0=0, x1=64): return T(n).crop((x0, y0, x1, y1))
def flipv(im): return ImageOps.flip(im)
def tone(im, k=1.0, sat=1.0):
    rgb, a = im.convert('RGB'), im.getchannel('A')
    rgb = ImageEnhance.Color(rgb).enhance(sat); rgb = ImageEnhance.Brightness(rgb).enhance(k)
    out = rgb.convert('RGBA'); out.putalpha(a); return out
def col(*parts):
    h = sum(p.height for p in parts); im = Image.new('RGBA', (64, h)); y = 0
    for p in parts: im.paste(p, (0, y)); y += p.height
    return im
def glow(im, mode='sat'):   # alpha 128 = lit pixel, drawn full-bright by the shader
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if mode == 'all' or (mode == 'sat' and s > .5 and v > .5 and not (.07 < h < .2)) or (mode == 'white' and v > .8 and s < .3):
                px[x, y] = (r, g, b, 128)
    return im

WALL = .72                                            # overall wall brightness
def mid(n, y0=13, y1=51):                              # the plain middle of a framed panel, stretched back to 64px
    return T(n).crop((0, y0, 64, y1)).resize((64, 64), Image.NEAREST)
trim = tone(crop('A01', 0, 16), .55)                  # dark ledge under the ceiling
plainC = mid('C03')                                   # C03 without its hazard bands: a calm framed plate
grilles = tone(crop('C30', 2, 34), .6)                # two floor-level vent grilles (32px)
kick = col(grilles, tone(crop('A13', 8, 24), .62))    # vents over a strip of diamond plate (48px)
hazard = crop('A02', 0, 8)                            # an 8px hazard stripe
def wall(top, bottom, k=WALL, kickp=None):            # 16 + 64 + 64 + 48 = 192
    return col(trim, tone(top, k, .85), tone(bottom, k, .85), kickp or kick)
plain = T('B00')
def bleed(base, part, y0, y1, x0=0, x1=64, at=(0, 0)):   # paste a slice of one tile into another
    im = base.copy(); im.paste(T(part).crop((x0, y0, x1, y1)), at); return im
fans = bleed(plain, 'C21', 32, 64, 0, 64, (0, 32))                       # two small fans in the lower half
gauges = bleed(plainC, 'B33', 30, 62, 0, 64, (0, 30))                     # instrument strip at console height
circuit = bleed(flipv(plain), 'C20', 0, 64, 0, 28, (0, 0))                 # cyan circuit running up one edge

OUT = {}
OUT['hull']   = wall(plain, flipv(plain))
OUT['hull2']  = wall(plainC, flipv(plain))
OUT['hull3']  = glow(wall(plain, fans))
OUT['hullL']  = glow(wall(T('A21'), T('A21')))                      # red conduit running floor to ceiling
OUT['screen'] = glow(wall(circuit, T('D00'), .8))                   # bridge: circuits over a wall-mounted readout
OUT['screen2'] = glow(wall(plain, T('D12'), .8))                    # vital-sign monitor at eye level
OUT['screen3'] = glow(wall(T('D11'), T('D01'), .8))                 # data columns over a control board
OUT['hull4'] = wall(T('E00'), flipv(plain))                          # heavy plates
OUT['hullBox'] = glow(wall(plainC, T('A03')))                       # electrical box at chest height
def stencil(base, src, thresh=106):   # lift just the painted marks off a tile and spray them onto a clean plate
    im = base.copy(); bp = im.load(); sp = T(src).load()
    for y in range(64):
        for x in range(64):
            r, g, b, _ = sp[x, y]
            if (r + g + b) / 3 > thresh and max(r, g, b) - min(r, g, b) < 40:
                br, bg, bb, ba = bp[x, y]; bp[x, y] = (int(br * .2 + 210 * .8), int(bg * .2 + 212 * .8), int(bb * .2 + 216 * .8), ba)
    return im
OUT['decal'] = wall(plain, stencil(plain, 'E12'))                   # 'SEC-A' stencil sprayed onto a clean plate at eye level
OUT['eng2'] = glow(wall(T('D30'), T('D20'), .75))                   # pipe junction over a power panel
OUT['rack']   = glow(wall(T('B11'), T('B11'), .8))                  # armory shelving
OUT['pipe']   = glow(wall(T('E11'), T('C12'), .75))                 # engineering: cable runs over the pipe maze
bay_kick = col(hazard, tone(crop('C30', 2, 34), .6), tone(crop('A13', 8, 16), .6))
OUT['stripe'] = wall(T('B21'), mid('C13', 4, 60), .74, bay_kick)
OUT['bayVent'] = wall(T('E02'), T('E22'), .74, bay_kick)              # big shutter vent and a mesh panel
OUT['bayHatch'] = wall(T('B03'), T('C31'), .74, bay_kick)             # hazard-framed plate over a round hatch
# floors: darker than the walls
OUT['plate'] = tone(T('C01'), .6)                                    # framed diamond plate along the sides
OUT['grate'] = glow(tone(T('C10'), .52, .8))                              # walkway grating with little cyan guide lights
OUT['floorBridge'] = tone(T('C11'), .6, .85)
OUT['floorBay'] = tone(T('C13'), .55)                                 # chevrons pointing at the pods
OUT['arrows'] = tone(T('C22'), .62)
OUT['floorEng'] = tone(T('B20'), .62)                                 # mesh grating around the reactor
OUT['floorRust'] = tone(T('C01'), .58)                                # framed diamond plate along the bay walls
# ceiling: calm plates, the four-grille panel as vents
OUT['ceil'] = tone(plainC, .42, .7)
OUT['vent'] = tone(T('E02'), .45)
OUT['ceilL'] = OUT['ceil']
# props
OUT['metal'] = tone(plainC, .8)
OUT['dark'] = tone(T('A23'), .55)
OUT['rib'] = tone(T('C13').crop((14, 0, 50, 64)), .5)                  # the chevron column, as a structural rib
OUT['cabinet'] = tone(T('C23'), .66)                                   # lockers with handles
OUT['consoleBody'] = glow(tone(T('C32'), .7))
OUT['plate2'] = tone(plainC, .7)
OUT['crate'] = tone(T('A31'), .8); OUT['crateTop'] = tone(T('A31'), .8)
OUT['counter'] = tone(col(plain.crop((0, 0, 64, 32)), T('C02').crop((0, 32, 64, 64))), .72)
OUT['hatch'] = tone(T('C31'), .7)
lintel = tone(T('A10'), .45); lintel.paste(hazard, (0, 56)); OUT['yellow'] = lintel
OUT['hullOut'] = tone(T('B00'), .85, .75)
OUT['hullOut2'] = tone(T('E00'), .85, .75)
OUT['hullOut3'] = tone(T('A00'), .8, .75)
OUT['hullOut4'] = tone(T('C30'), .8, .75)
OUT['scrBlue'] = glow(tone(T('B12'), .9), 'all')
OUT['scrRadar'] = glow(T('D03'), 'sat'); OUT['scrGraph'] = glow(T('D12'), 'sat'); OUT['scrKeys'] = glow(T('D10'), 'sat')
OUT['scrPower'] = glow(T('D20'), 'sat'); OUT['scrLog'] = glow(T('D23'), 'sat'); OUT['scrAlert'] = glow(T('D32'), 'sat'); OUT['scrSliders'] = glow(T('D21'), 'sat'); OUT['scrCore'] = glow(T('D33'), 'sat')
war = Image.new('RGBA', (128, 128)); d22 = T('D22'); war.paste(d22, (0, 0)); war.paste(ImageOps.mirror(d22), (64, 0)); war.paste(flipv(d22), (0, 64)); war.paste(ImageOps.mirror(flipv(d22)), (64, 64))
OUT['holoTop'] = glow(war, 'sat')                                    # the war table: a star-network map
OUT['scrGreen'] = glow(T('B23'), 'all')
OUT['scrRed'] = glow(tone(T('A30'), .9), 'all')
OUT['scrAmber'] = glow(T('B33'), 'sat')

js = []
for k, im in OUT.items():
    buf = io.BytesIO(); im.save(buf, 'PNG'); js.append(f'{k}:"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"')
pathlib.Path('src/texart.js').write_text('const TEXART = {' + ','.join(js) + '};\n')
print(len(OUT), 'textures')
