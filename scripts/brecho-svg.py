# Gera ilustrações SVG originais (estilo editorial vintage) para o brechó.
import os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

INK = "#2b211a"
CREAM = "#f7efe2"

def defs(uid, extra=""):
    return f'''<defs>
<filter id="g{uid}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .17 0 0 0 0 .13 0 0 0 0 .1 0 0 0 .55 0"/></filter>
<filter id="s{uid}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="6" dy="10" stdDeviation="0" flood-color="{INK}" flood-opacity=".14"/></filter>
<pattern id="dots{uid}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.2" fill="{INK}" opacity=".12"/></pattern>
{extra}
</defs>'''

def frame(uid, bg, arch, body, label=None):
    lab = ""
    if label:
        lab = (f'<g transform="translate(40 664)"><rect width="{len(label)*11+40}" height="42" rx="21" fill="{CREAM}" stroke="{INK}" stroke-width="2"/>'
               f'<text x="20" y="27" font-family="Georgia,serif" font-style="italic" font-size="18" fill="{INK}">{label}</text></g>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" role="img">
{defs(uid, body[1])}
<rect width="600" height="750" fill="{bg}"/>
<rect width="600" height="750" fill="url(#dots{uid})"/>
<path d="M90 690 V300 A210 210 0 0 1 510 300 V690 Z" fill="{arch}"/>
<path d="M90 690 V300 A210 210 0 0 1 510 300 V690" fill="none" stroke="{INK}" stroke-width="2" opacity=".35" transform="translate(-12 -12)"/>
<ellipse cx="300" cy="668" rx="170" ry="16" fill="{INK}" opacity=".12"/>
<g filter="url(#s{uid})" stroke="{INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">{body[0]}</g>
{lab}
<rect width="600" height="750" filter="url(#g{uid})" opacity=".35"/>
</svg>'''

# ---------- padrões ----------
def pat_floral(pid, base, petal, center):
    return f'''<pattern id="{pid}" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="{base}"/>
<g transform="translate(15 15)" stroke="none"><circle cx="0" cy="-6" r="5" fill="{petal}"/><circle cx="6" cy="0" r="5" fill="{petal}"/><circle cx="0" cy="6" r="5" fill="{petal}"/><circle cx="-6" cy="0" r="5" fill="{petal}"/><circle r="3.4" fill="{center}"/></g>
<g transform="translate(45 45) scale(.7)" stroke="none"><circle cx="0" cy="-6" r="5" fill="{center}"/><circle cx="6" cy="0" r="5" fill="{center}"/><circle cx="0" cy="6" r="5" fill="{center}"/><circle cx="-6" cy="0" r="5" fill="{center}"/><circle r="3.4" fill="{petal}"/></g>
<path d="M40 12 q6 4 0 9 M14 42 q-5 5 2 9" stroke="{INK}" stroke-width="1.5" fill="none" opacity=".4"/></pattern>'''

def pat_dots(pid, base, dot, r=5, s=26):
    return f'<pattern id="{pid}" width="{s}" height="{s}" patternUnits="userSpaceOnUse"><rect width="{s}" height="{s}" fill="{base}"/><circle cx="{s/4}" cy="{s/4}" r="{r}" fill="{dot}" stroke="none"/><circle cx="{3*s/4}" cy="{3*s/4}" r="{r}" fill="{dot}" stroke="none"/></pattern>'

def pat_stripes(pid, base, line, w=10, s=26, angle=0):
    return f'<pattern id="{pid}" width="{s}" height="{s}" patternUnits="userSpaceOnUse" patternTransform="rotate({angle})"><rect width="{s}" height="{s}" fill="{base}"/><rect width="{w}" height="{s}" fill="{line}" stroke="none"/></pattern>'

def pat_plaid(pid, base, a, b):
    return f'''<pattern id="{pid}" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="{base}"/>
<rect y="18" width="48" height="12" fill="{a}" opacity=".55" stroke="none"/><rect x="18" width="12" height="48" fill="{a}" opacity=".55" stroke="none"/>
<rect y="40" width="48" height="2" fill="{b}" stroke="none"/><rect x="40" width="2" height="48" fill="{b}" stroke="none"/></pattern>'''

def pat_argyle(pid, base, a, b):
    return f'''<pattern id="{pid}" width="60" height="80" patternUnits="userSpaceOnUse"><rect width="60" height="80" fill="{base}"/>
<path d="M30 0 L60 40 L30 80 L0 40 Z" fill="{a}" stroke="none"/><path d="M0 0 L60 80 M60 0 L0 80" stroke="{b}" stroke-width="2" stroke-dasharray="5 5"/></pattern>'''

def pat_weave(pid, base, line):
    return f'''<pattern id="{pid}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="{base}"/>
<path d="M0 6 h12 M12 18 h12 M6 0 v12 M18 12 v12" stroke="{line}" stroke-width="5" stroke-linecap="butt"/></pattern>'''

def pat_denim(pid, base, line):
    return f'<pattern id="{pid}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="{base}"/><rect width="2" height="8" fill="{line}" opacity=".5" stroke="none"/></pattern>'

def pat_paisley(pid, base, a, b):
    return f'''<pattern id="{pid}" width="70" height="70" patternUnits="userSpaceOnUse"><rect width="70" height="70" fill="{base}"/>
<path d="M20 18 c14 -10 26 6 14 18 c-8 8 -20 4 -22 12 c-6 -12 -2 -24 8 -30z" fill="{a}" stroke="none"/><circle cx="26" cy="26" r="4" fill="{b}" stroke="none"/>
<path d="M52 48 c10 -7 18 4 10 12 c-6 6 -14 3 -15 8 c-4 -8 -1 -16 5 -20z" fill="{b}" stroke="none"/></pattern>'''

def hanger():
    return f'<path d="M300 70 q0 -22 18 -22 q16 0 16 16 q0 12 -18 20 v14" fill="none"/><path d="M188 150 L300 98 L412 150" fill="none" stroke-width="5"/>'

# ---------- objetos ----------
def dress(fill, belt="#e3b341", sleeve=False, long=False):
    hem = 640 if long else 610
    sl = ""
    if sleeve:
        sl = f'<path d="M248 160 L196 196 L214 236 L250 214 Z" fill="{fill}"/><path d="M352 160 L404 196 L386 236 L350 214 Z" fill="{fill}"/>'
    return (hanger() + sl +
        f'<path d="M248 150 Q300 214 352 150 L374 300 L226 300 Z" fill="{fill}"/>'
        f'<path d="M226 300 L374 300 L470 {hem} Q300 {hem+34} 130 {hem} Z" fill="{fill}"/>'
        f'<rect x="222" y="292" width="156" height="22" rx="4" fill="{belt}"/>'
        f'<path d="M260 330 L240 {hem-10} M340 330 L360 {hem-10} M300 330 V{hem+10}" fill="none" opacity=".35"/>')

def shirt(fill, collar=CREAM, buttons=True):
    b = "".join(f'<circle cx="300" cy="{y}" r="5" fill="{CREAM}"/>' for y in range(230, 600, 62)) if buttons else ""
    return (hanger() +
        f'<path d="M210 150 L130 220 L100 440 L150 452 L196 300 L196 610 L404 610 L404 300 L450 452 L500 440 L470 220 L390 150 Z" fill="{fill}"/>'
        f'<path d="M150 452 L100 440 L96 474 L148 486 Z M450 452 L500 440 L504 474 L452 486 Z" fill="{collar}"/>'
        f'<path d="M240 150 L300 210 L360 150 L346 132 L300 180 L254 132 Z" fill="{collar}"/>'
        f'<path d="M300 210 V610" fill="none"/>' + b +
        f'<rect x="216" y="290" width="60" height="54" rx="4" fill="{fill}"/>')

def jacket(fill, accent="#e3b341", patches=False, collar=None):
    collar = collar or fill
    p = ""
    if patches:
        p = ('<g transform="rotate(-12 240 420)"><circle cx="240" cy="420" r="30" fill="#e63946"/><path d="M226 420 l10 10 l18 -22" fill="none" stroke="#f7efe2" stroke-width="5"/></g>'
             '<path d="M356 470 l12 26 l28 4 l-20 20 l5 28 l-25 -14 l-25 14 l5 -28 l-20 -20 l28 -4 z" fill="#e3b341" transform="translate(-8 -20) scale(.9) translate(30 40)"/>'
             '<rect x="150" y="300" width="40" height="40" rx="6" fill="#ff7a1a" transform="rotate(10 170 320)"/>')
    stitch = 'stroke-dasharray="7 7" stroke="#f7efe2" stroke-width="2.5" fill="none"'
    return (hanger() +
        f'<path d="M206 150 L120 210 L92 520 L148 530 L190 330 L190 590 L410 590 L410 330 L452 530 L508 520 L480 210 L394 150 Z" fill="{fill}"/>'
        f'<path d="M206 150 L262 150 L300 260 L338 150 L394 150 L410 214 L330 300 L300 300 L270 300 L190 214 Z" fill="{collar}"/>'
        f'<path d="M300 300 V590" fill="none"/><rect x="190" y="548" width="220" height="42" fill="{fill}"/>'
        f'<path d="M190 560 H410" {stitch}/><path d="M210 360 h70 v58 h-70 z M320 360 h70 v58 h-70 z" fill="{fill}"/>'
        f'<path d="M212 372 h66 M322 372 h66" {stitch}/>'
        + "".join(f'<circle cx="300" cy="{y}" r="7" fill="{accent}"/>' for y in (340, 410, 480, 540)) + p)

def blazer(fill):
    return (hanger() +
        f'<path d="M206 150 L120 210 L96 530 L150 538 L190 330 L196 610 L404 610 L410 330 L450 538 L504 530 L480 210 L394 150 Z" fill="{fill}"/>'
        f'<path d="M254 150 L300 330 L346 150 L322 150 L300 240 L278 150 Z" fill="#f7efe2"/>'
        f'<path d="M206 150 L254 150 L300 330 L236 250 L250 236 L204 200 Z M394 150 L346 150 L300 330 L364 250 L350 236 L396 200 Z" fill="{fill}"/>'
        f'<path d="M300 330 V610" fill="none"/><circle cx="300" cy="400" r="7" fill="{INK}"/><circle cx="300" cy="470" r="7" fill="{INK}"/>'
        f'<path d="M214 470 h64 M322 470 h64 M330 300 h46" fill="none" stroke-width="4"/>')

def skirt(fill):
    pleats = "".join(f'<path d="M{226+i*21} 250 L{170+i*37} 600" fill="none" opacity=".45"/>' for i in range(1, 8))
    return (hanger().replace("M188 150 L300 98 L412 150", "M210 210 L300 160 L390 210") +
        f'<rect x="216" y="206" width="168" height="44" rx="6" fill="{fill}"/>'
        f'<path d="M226 250 L374 250 L470 600 Q300 626 130 600 Z" fill="{fill}"/>' + pleats +
        f'<circle cx="360" cy="228" r="7" fill="#f7efe2"/>')

def pants(fill):
    return (hanger().replace("M188 150 L300 98 L412 150", "M200 170 L300 120 L400 170") +
        f'<rect x="212" y="164" width="176" height="40" rx="4" fill="{fill}"/>'
        f'<path d="M212 204 L388 204 L400 380 L456 640 L340 640 L300 330 L260 640 L144 640 L200 380 Z" fill="{fill}"/>'
        f'<path d="M300 204 V330 M250 230 Q260 260 240 290 M350 230 Q340 260 360 290" fill="none" opacity=".5"/>'
        + "".join(f'<rect x="{x}" y="160" width="12" height="48" rx="3" fill="{fill}"/>' for x in (236, 294, 352)))

def sweater(fill):
    return (hanger() +
        f'<path d="M216 150 L124 214 L100 520 L156 530 L196 320 L196 590 L404 590 L404 320 L444 530 L500 520 L476 214 L384 150 Z" fill="{fill}"/>'
        f'<path d="M100 520 L156 530 L152 566 L96 556 Z M500 520 L444 530 L448 566 L504 556 Z" fill="#7a1f2b"/>'
        f'<rect x="196" y="570" width="208" height="36" fill="#7a1f2b"/>'
        f'<path d="M246 150 Q300 200 354 150 Q300 176 246 150" fill="#7a1f2b"/>'
        + "".join(f'<path d="M{x} 574 v28" fill="none" stroke="#f7efe2" stroke-width="2" opacity=".6"/>' for x in range(210, 404, 14)))

def bag(fill, strap="#7a4a1f"):
    return (f'<path d="M180 330 C170 120 430 120 420 330" fill="none" stroke="{strap}" stroke-width="16"/>'
        f'<path d="M180 330 C170 120 430 120 420 330" fill="none" stroke-width="3"/>'
        f'<rect x="140" y="320" width="320" height="270" rx="34" fill="{fill}"/>'
        f'<path d="M140 360 Q140 320 180 320 H420 Q460 320 460 360 V430 Q300 480 140 430 Z" fill="{strap}"/>'
        f'<rect x="276" y="432" width="48" height="40" rx="8" fill="#e3b341"/><circle cx="300" cy="452" r="7" fill="{INK}"/>'
        f'<path d="M160 560 H440" fill="none" stroke="#f7efe2" stroke-width="2.5" stroke-dasharray="7 7"/>')

def straw_bag(fill_id):
    return (f'<path d="M190 330 C190 160 410 160 410 330" fill="none" stroke="#c99a52" stroke-width="22"/>'
        f'<path d="M190 330 C190 160 410 160 410 330" fill="none"/>'
        + "".join(f'<path d="M{190+i*44} 330" />' for i in range(1)) +
        f'<path d="M120 330 H480 L450 590 Q300 620 150 590 Z" fill="url(#{fill_id})"/>'
        f'<rect x="110" y="316" width="380" height="30" rx="14" fill="#c99a52"/>'
        f'<path d="M260 380 q40 40 80 0 q-10 50 -40 70 q-30 -20 -40 -70z" fill="#e63946"/>')

def boot(fill):
    return (f'<path d="M210 170 H350 V430 Q360 470 420 486 Q500 504 506 560 V600 H210 Z" fill="{fill}"/>'
        f'<path d="M210 600 H506 V626 H210 Z" fill="{INK}"/><rect x="210" y="580" width="70" height="46" fill="{INK}"/>'
        f'<path d="M210 170 H350 V214 H210 Z" fill="#7a4a1f"/>'
        f'<path d="M330 230 V420" fill="none" stroke="#e3b341" stroke-width="5"/><circle cx="330" cy="230" r="9" fill="#e3b341"/>'
        f'<path d="M226 520 Q300 540 470 540" fill="none" stroke="#f7efe2" stroke-width="2.5" stroke-dasharray="7 7"/>')

def heel(fill):
    return (f'<path d="M140 450 Q150 425 192 438 L246 472 Q320 518 404 520 Q474 522 502 546 Q508 562 482 566 L300 572 Q232 562 204 540 L198 640 H174 L158 522 Q138 492 140 450 Z" fill="{fill}"/>'
        f'<path d="M192 446 Q262 500 344 512 Q268 478 192 446 Z" fill="#7a1f2b"/>'
        f'<path d="M168 640 H206" stroke-width="8"/><path d="M300 572 Q390 560 482 566" fill="none" stroke="{INK}" stroke-width="6"/>'
        f'<path d="M380 530 Q440 528 480 548" fill="none" stroke="#f7efe2" stroke-width="5" opacity=".7"/>'
        f'<circle cx="214" cy="470" r="8" fill="#e3b341"/>')

def glasses(fill):
    lens = '#f7efe2'
    return (f'<path d="M150 380 Q140 320 200 320 H270 Q290 330 282 380 Q270 440 210 440 Q160 440 150 380 Z" fill="{fill}"/>'
        f'<path d="M450 380 Q460 320 400 320 H330 Q310 330 318 380 Q330 440 390 440 Q440 440 450 380 Z" fill="{fill}"/>'
        f'<path d="M168 378 Q164 340 206 340 H262 Q270 350 264 380 Q254 420 212 420 Q174 420 168 378Z" fill="{lens}" opacity=".85"/>'
        f'<path d="M432 378 Q436 340 394 340 H338 Q330 350 336 380 Q346 420 388 420 Q426 420 432 378Z" fill="{lens}" opacity=".85"/>'
        f'<path d="M282 350 Q300 336 318 350" fill="none" stroke-width="8"/>'
        f'<path d="M150 336 L120 300 M450 336 L480 300" fill="none" stroke-width="8"/>'
        f'<path d="M190 360 l30 -10 M370 360 l30 -10" fill="none" stroke="#fff" stroke-width="4" opacity=".8"/>'
        f'<path d="M120 300 L96 520 M480 300 L504 520" fill="none" stroke-width="6" opacity=".55"/>')

def scarf(fill_id, border):
    return (f'<g transform="rotate(45 300 360)"><rect x="160" y="220" width="280" height="280" fill="url(#{fill_id})"/>'
        f'<rect x="160" y="220" width="280" height="280" fill="none" stroke="{border}" stroke-width="18"/>'
        f'<rect x="160" y="220" width="280" height="280" fill="none"/></g>'
        f'<path d="M300 560 Q270 610 250 650 L290 646 Q300 610 300 580 Q300 610 312 646 L350 650 Q330 610 300 560Z" fill="{border}"/>')

def watch():
    return (f'<rect x="250" y="120" width="100" height="200" rx="14" fill="#7a4a1f"/><rect x="250" y="430" width="100" height="200" rx="14" fill="#7a4a1f"/>'
        + "".join(f'<circle cx="300" cy="{y}" r="5" fill="#e3b341"/>' for y in (520, 560, 600)) +
        f'<circle cx="300" cy="375" r="112" fill="#e3b341"/><circle cx="300" cy="375" r="90" fill="#f7efe2"/>'
        + "".join(f'<path d="M300 293 v14" transform="rotate({a} 300 375)" fill="none"/>' for a in range(0, 360, 30)) +
        f'<path d="M300 375 V320 M300 375 L340 395" fill="none" stroke-width="5"/><circle cx="300" cy="375" r="7" fill="{INK}"/>'
        f'<rect x="410" y="362" width="18" height="26" rx="4" fill="#e3b341"/>')

def teapot(fill):
    return (f'<path d="M420 400 Q500 380 480 300 Q470 270 446 300 Q460 350 410 360" fill="{fill}"/>'
        f'<path d="M180 430 Q100 420 90 330 L120 326 Q140 390 196 392" fill="{fill}"/>'
        f'<path d="M180 330 Q170 600 300 600 Q430 600 420 330 Q300 300 180 330Z" fill="{fill}"/>'
        f'<path d="M210 320 Q300 270 390 320 Q300 340 210 320Z" fill="#e3b341"/><circle cx="300" cy="276" r="16" fill="#e3b341"/>'
        f'<g stroke="none">' + "".join(
            f'<g transform="translate({x} {y})"><circle cx="0" cy="-10" r="10" fill="#e63946"/><circle cx="10" cy="0" r="10" fill="#e63946"/><circle cx="0" cy="10" r="10" fill="#e63946"/><circle cx="-10" cy="0" r="10" fill="#e63946"/><circle r="6" fill="#e3b341"/></g>'
            for x, y in ((250, 430), (350, 470), (300, 530))) + '</g>'
        f'<path d="M196 380 Q300 400 404 380 M210 560 Q300 580 390 560" fill="none" stroke="#2f6f6a" stroke-width="5"/>'
        f'<ellipse cx="300" cy="610" rx="140" ry="16" fill="#e3b341"/>')

def cups():
    one = lambda x, y, s: (f'<g transform="translate({x} {y}) scale({s})"><path d="M60 40 Q110 40 104 90 Q100 120 60 116" fill="none" stroke="#c46a1a" stroke-width="12"/>'
                          f'<path d="M-60 0 H70 L58 130 Q0 150 -48 130 Z" fill="#d98c2b" opacity=".92"/><path d="M-60 0 H70" fill="none"/>'
                          f'<path d="M-40 20 V110" fill="none" stroke="#f7efe2" stroke-width="6" opacity=".55"/>'
                          f'<ellipse cx="5" cy="146" rx="96" ry="14" fill="#d98c2b" opacity=".9"/></g>')
    return one(210, 300, 1) + one(390, 330, 1) + one(300, 450, 1.1)

def lamp():
    return (f'<path d="M140 380 Q140 190 300 190 Q460 190 460 380 Z" fill="#ff7a1a"/>'
        f'<path d="M140 380 H460" fill="none"/><path d="M200 300 Q300 250 400 300" fill="none" stroke="#f7efe2" stroke-width="5" opacity=".7"/>'
        f'<path d="M270 380 H330 L344 580 H256 Z" fill="#f7efe2"/>'
        f'<ellipse cx="300" cy="600" rx="120" ry="26" fill="#ff7a1a"/><path d="M180 600 Q300 640 420 600" fill="none"/>'
        f'<path d="M150 390 Q300 420 450 390" fill="none" stroke="#e3b341" stroke-width="10" opacity=".7"/>')

def vinyl(sleeve, label, title):
    grooves = "".join(f'<circle cx="370" cy="360" r="{r}" fill="none" stroke="#555" stroke-width="1.5"/>' for r in range(70, 190, 14))
    return (f'<circle cx="370" cy="360" r="200" fill="#1c1714"/>' + grooves +
        f'<circle cx="370" cy="360" r="62" fill="{label}"/><circle cx="370" cy="360" r="8" fill="#f7efe2"/>'
        f'<rect x="100" y="180" width="300" height="360" fill="{sleeve}"/>'
        f'<circle cx="250" cy="330" r="90" fill="#e3b341" stroke="none"/><path d="M110 430 Q250 360 390 430 V540 H110Z" fill="#e63946" stroke="none"/>'
        f'<path d="M110 470 Q250 400 390 470" fill="none" stroke="#f7efe2" stroke-width="4"/>'
        f'<text x="124" y="226" font-family="Georgia,serif" font-size="26" font-style="italic" fill="#f7efe2" stroke="none">{title}</text>'
        f'<rect x="100" y="180" width="300" height="360" fill="none"/>')

def books(colors, titles):
    out = ""
    y = 600
    widths = (300, 270, 320, 250)
    for i, (c, t) in enumerate(zip(colors, titles)):
        w = widths[i % 4]; h = 74
        x = 300 - w / 2 + (i % 2) * 14 - 7
        y -= h
        out += (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{c}"/>'
                f'<rect x="{x+18}" y="{y+16}" width="{w-36}" height="{h-32}" fill="none" stroke="#e3b341" stroke-width="2"/>'
                f'<text x="300" y="{y+h/2+7}" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#f7efe2" stroke="none" letter-spacing="2">{t}</text>')
    return out + f'<path d="M370 {y} q20 -60 -10 -100 q40 30 30 100" fill="#6b7a4b"/>'

def necklace():
    pearls = "".join(f'<circle cx="{300+170*__import__("math").cos(a/20*3.1416)}" cy="{250+220*__import__("math").sin(a/20*3.1416)}" r="15" fill="#f7efe2"/>' for a in range(1, 20))
    return pearls + '<circle cx="300" cy="500" r="30" fill="#e3b341"/><circle cx="300" cy="500" r="14" fill="#e63946"/>'

# ---------- catálogo de ilustrações ----------
P = {}
def add(name, bg, arch, body, extra="", label=None):
    P[name] = (bg, arch, (body, extra), label)

add("bg-001", "#f3e6d3", "#e9b48a", dress("url(#f1)", "#e3b341", sleeve=True), pat_floral("f1", "#2f6f6a", "#ff9d5c", "#e3b341"))
add("bg-002", "#efe8dc", "#d7c6a8", dress("url(#f2)", "#e63946"), pat_dots("f2", "#1f2a44", "#f7efe2", 5, 28))
add("bg-003", "#f1e3dc", "#c98a8a", dress("#7a1f2b", "#e3b341", long=True))
add("bg-004", "#eef0ee", "#b9c9d6", jacket("url(#f4)", "#c46a1a"), pat_denim("f4", "#8fb0d6", "#4a6fa5"))
add("bg-005", "#efe6d6", "#e3b341", jacket("url(#f5)", "#c46a1a", patches=True), pat_denim("f5", "#3f5f8f", "#22355a"))
add("bg-006", "#f2ebe0", "#c9b48f", blazer("url(#f6)"), pat_plaid("f6", "#d9cdb4", "#7a6a55", "#2b211a"))
add("bg-007", "#f6e9dc", "#ff9d5c", shirt("url(#f7)", "#f7efe2", buttons=True), pat_paisley("f7", "#e3b341", "#e63946", "#2f6f6a"))
add("bg-008", "#f3ead9", "#6b7a4b", skirt("#d9a21b"))
add("bg-009", "#eef1ee", "#9fb7a3", shirt("url(#f9)", "#f7efe2"), pat_stripes("f9", "#f7efe2", "#4a6fa5", 8, 24))
add("bg-010", "#f1e6d6", "#e3b341", pants("#8a5a2b"))
add("bg-011", "#efe4d6", "#c9a07a", sweater("url(#f11)"), pat_argyle("f11", "#d9cdb4", "#2f6f6a", "#e63946"))
add("bg-012", "#f4e7d6", "#e9b48a", bag("#b5763a"))
add("bg-013", "#f3ecdc", "#9fb7a3", straw_bag("f13"), pat_weave("f13", "#e3c58e", "#c99a52"))
add("bg-014", "#efe6da", "#c98a5a", boot("#5a3a22"))
add("bg-015", "#f6e8e2", "#f2b8a8", heel("#e63946"))
add("bg-016", "#f1ead8", "#e3b341", glasses("#7a4a1f"))
add("bg-017", "#f3e7dc", "#9fb7a3", scarf("f17", "#e63946"), pat_paisley("f17", "#f7efe2", "#ff7a1a", "#2f6f6a"))
add("bg-018", "#eee9df", "#2f6f6a", watch())
add("bg-019", "#f1ebe1", "#9fc3c0", teapot("#f7efe2"))
add("bg-020", "#f5ead8", "#2f6f6a", cups())
add("bg-021", "#f3e8d8", "#6b7a4b", lamp())
add("bg-022", "#efe5d6", "#e3b341", vinyl("#2f6f6a", "#e3b341", "MPB · Vol. 2"))
add("bg-023", "#f2e6e6", "#c98aa0", vinyl("#7a1f2b", "#ff7a1a", "Noites de Disco"))
add("bg-024", "#f1e8da", "#c9b48f", books(("#7a1f2b", "#2f6f6a", "#1f2a44", "#8a5a2b"), ("ROMANCES", "CLÁSSICOS", "VOL. I – III", "CAPA DURA")))
add("bg-025", "#f4eadb", "#ff9d5c", books(("#e63946", "#d9a21b", "#6b7a4b"), ("RECEITAS", "DA VOVÓ", "1984")))
add("bg-026", "#f2e9dc", "#c9a07a", necklace())

for i, (name, (bg, arch, body, label)) in enumerate(P.items()):
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(frame(str(i), bg, arch, body, label))

# ---------- hero: arara ----------
def scaled(g, x, y, s):
    return f'<g transform="translate({x} {y}) scale({s})">{g}</g>'

hero_defs = defs("h", pat_floral("hf", "#2f6f6a", "#ff9d5c", "#e3b341") + pat_denim("hd", "#8fb0d6", "#4a6fa5") + pat_stripes("hs", "#f7efe2", "#e63946", 8, 24))
hero = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" role="img">
{hero_defs}
<rect width="900" height="900" fill="#f1e4cf"/>
<rect width="900" height="900" fill="url(#dotsh)"/>
<path d="M110 860 V380 A340 340 0 0 1 790 380 V860 Z" fill="#e9b48a"/>
<circle cx="700" cy="190" r="70" fill="#e3b341"/>
<g stroke="{INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
<path d="M120 180 H780 M150 180 V840 M750 180 V840 M110 840 H190 M710 840 H790" fill="none" stroke-width="10"/>
<g filter="url(#sh)">
{scaled(jacket("url(#hd)", "#c46a1a"), 70, 120, .62)}
{scaled(dress("url(#hf)", "#e3b341", sleeve=True), 270, 120, .66)}
{scaled(shirt("url(#hs)", "#f7efe2"), 470, 120, .62)}
</g>
<g filter="url(#sh)">{scaled(bag("#b5763a"), 520, 560, .5)}{scaled(boot("#5a3a22"), 170, 600, .42)}</g>
</g>
<g transform="translate(560 120) rotate(8)"><rect width="150" height="80" rx="8" fill="#f7efe2" stroke="{INK}" stroke-width="3"/><circle cx="20" cy="40" r="8" fill="#f1e4cf" stroke="{INK}" stroke-width="3"/><text x="40" y="36" font-family="Georgia,serif" font-style="italic" font-size="20" fill="{INK}">peça única</text><text x="40" y="62" font-family="Georgia,serif" font-size="18" fill="#e63946">desde 1985</text></g>
<rect width="900" height="900" filter="url(#gh)" opacity=".35"/>
</svg>'''
open(os.path.join(OUT, "hero-arara.svg"), "w").write(hero)

# ---------- fachada da loja ----------
awn = "".join(f'<path d="M{100+i*70} 250 h70 v60 q-35 30 -70 0z" fill="{"#ff7a1a" if i % 2 == 0 else "#f7efe2"}"/>' for i in range(10))
store = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 700" role="img">
{defs("st", pat_floral("sf", "#7a1f2b", "#ff9d5c", "#e3b341"))}
<rect width="900" height="700" fill="#efe2cc"/><rect width="900" height="700" fill="url(#dotsst)"/>
<g stroke="{INK}" stroke-width="3" stroke-linejoin="round">
<rect x="100" y="120" width="700" height="520" fill="#2f6f6a"/>
<rect x="140" y="140" width="620" height="90" rx="6" fill="#f7efe2"/>
<text x="450" y="182" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-style="italic" fill="{INK}" stroke="none">Brechó da Família Guimarães</text>
<text x="450" y="214" text-anchor="middle" font-family="Georgia,serif" font-size="18" letter-spacing="5" fill="#e63946" stroke="none">VINTAGE &amp; AFETO · DESDE 1985</text>
{awn}
<rect x="140" y="350" width="380" height="270" fill="#f6e3c0"/>
<g transform="translate(150 330) scale(.55)">{dress("url(#sf)", "#e3b341", sleeve=True)}</g>
<g transform="translate(320 450) scale(.3)">{bag("#b5763a")}</g>
<rect x="140" y="350" width="380" height="270" fill="none"/>
<path d="M150 360 l60 0 M150 360 l0 60" stroke="#fff" stroke-width="6" opacity=".6"/>
<rect x="580" y="350" width="170" height="290" fill="#7a4a1f"/><circle cx="730" cy="500" r="8" fill="#e3b341"/>
<rect x="600" y="372" width="130" height="110" fill="#f6e3c0"/>
<g transform="translate(608 392) rotate(-6)"><rect width="110" height="52" rx="6" fill="#f7efe2"/><text x="55" y="34" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="24" fill="#e63946" stroke="none">aberto</text></g>
<path d="M60 640 H840" stroke-width="6"/>
<g transform="translate(70 560)"><path d="M0 80 q-10 -60 30 -70 q40 10 30 70z" fill="#6b7a4b"/><rect x="5" y="60" width="50" height="22" fill="#c46a1a"/></g>
<g transform="translate(780 560)"><path d="M0 80 q-10 -60 30 -70 q40 10 30 70z" fill="#6b7a4b"/><rect x="5" y="60" width="50" height="22" fill="#c46a1a"/></g>
</g>
<rect width="900" height="700" filter="url(#gst)" opacity=".35"/>
</svg>'''
open(os.path.join(OUT, "fachada.svg"), "w").write(store)
print("ok", len(P) + 2)
