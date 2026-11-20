"""Frame-by-frame contact sheet of every kitchen motion (sift, pour, crack, cut, chop, cocoa, whisk), to eyeball
that things move the way they would in a real kitchen.   python tests/kitchen_motions.py [base] [out.jpg]"""
import sys, io
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'tests/out/kitchen-motions.jpg'
ACTS = [('flour', 'vanilla'), ('sugar', 'vanilla'), ('eggs', 'vanilla'), ('butter', 'vanilla'), ('extra', 'strawberry'), ('extra', 'chocolate')]
KS = [0.15, 0.32, 0.45, 0.58, 0.7, 0.86]
TIMES = KS
CROP = (300, 120, 1180, 470)
rows = []
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11']); pg = br.new_page(viewport={'width': 1280, 'height': 720})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/play.html'); pg.wait_for_function('!!window.__kitchen && !!window.__r3f', timeout=120000)
    pg.evaluate("localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({kind:'kozie',name:'T',made:true,model:0,colour:0})); localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1'); sessionStorage.setItem('bwc.boot','continue')")
    pg.reload(); pg.wait_for_function('!!window.__kitchen && !!window.__r3f', timeout=120000); pg.wait_for_timeout(6000)
    pg.add_style_tag(content='.khud,.dayopen,.menubtn,.musicbtn,.clockchip,.navtut,.viewbar,.stationhint{display:none!important}')
    pg.evaluate("window.__game.getState().setMode('kitchen')"); pg.wait_for_timeout(3000)
    # a clock we can stop: performance.now() returns window.__freeze while it is set
    pg.evaluate("(() => { const real = performance.now.bind(performance); window.__realNow = real; window.__freeze = null; performance.now = () => window.__freeze ?? real() })()")
    for part, fl in ACTS:
        pg.evaluate(f"(() => {{ const k = window.__kitchen; k.getState().tip(); k.getState().choose('{fl}'); k.setState({{ pour: null }}) }})()"); pg.wait_for_timeout(300)
        pg.evaluate(f"window.__kitchen.getState().add('{part}')"); frames = []
        for k in KS:  # freeze the game clock at exactly k of the way through the motion, render, capture
            pg.evaluate(f"(() => {{ window.__freeze = window.__realNow() ; const p = window.__kitchen.getState().pour; window.__kitchen.setState({{ pour: {{ part: p.part, t: window.__freeze - {k} * 900 }} }}) }})()")
            pg.wait_for_timeout(120)
            frames.append(Image.open(io.BytesIO(pg.screenshot())).crop(CROP).resize((290, 115)))
        pg.evaluate("window.__freeze = null")
        rows.append((f'{part} ({fl})', frames)); pg.wait_for_timeout(400)
    # the whisk: fill a vanilla bowl, then hold the whisk
    pg.evaluate("(() => { const k = window.__kitchen; k.getState().tip(); k.getState().choose('vanilla'); for (const p of ['flour','sugar','eggs','butter']) for (let i = 0; i < 3; i++) { k.setState({ pour: null }); k.getState().add(p) } k.setState({ pour: null }) })()")
    pg.wait_for_timeout(400); frames = [Image.open(io.BytesIO(pg.screenshot())).crop(CROP).resize((290, 115))]
    pg.evaluate("window.__kitchen.getState().setStirring(true)")
    for _ in range(5): pg.wait_for_timeout(160); frames.append(Image.open(io.BytesIO(pg.screenshot())).crop(CROP).resize((290, 115)))
    pg.evaluate("window.__kitchen.getState().setStirring(false)"); rows.append(('whisk (stir)', frames))
    br.close()
W, H = 290 * len(TIMES), 115
sheet = Image.new('RGB', (W + 120, H * len(rows)), 'white'); d = ImageDraw.Draw(sheet)
for r, (label, fr) in enumerate(rows):
    d.text((4, r * H + 50), label, fill='black')
    for c, im in enumerate(fr): sheet.paste(im, (120 + c * 290, r * H))
sheet.save(OUT, quality=85); print('saved', OUT, 'errors', errs[:2])
