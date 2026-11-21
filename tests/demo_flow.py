"""Watch a demo: start it from the title menu, capture it every few seconds, check it never touches the save.
    python tests/demo_flow.py [base] [outdir]"""
import sys, io
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
from PIL import Image
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'tests/out'
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
KEYS = ['brewed-with-code-save-v1', 'brewed-with-code-pantry-v1', 'bwc.kitchen', 'bwc.menu']
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11']); pg = br.new_page(viewport={'width': 1280, 'height': 720}); pg.set_default_timeout(120000)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    S = lambda js: pg.evaluate(js)
    pg.goto(BASE + '/play.html'); pg.wait_for_function('!!window.__game && !!window.__day')
    S("localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({kind:'kozie',name:'Kozie',made:true,model:0,colour:0})); localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1')")
    pg.reload(); pg.wait_for_function('!!window.__game && !!window.__day'); pg.wait_for_timeout(8000)
    before = S(f"JSON.stringify({KEYS}.map(k => localStorage.getItem(k)))")
    pg.click('.title-screen'); pg.wait_for_timeout(700); pg.click('[data-act=demo]'); pg.wait_for_timeout(500)
    check(S("window.__demo.getState().on"), 'the demo starts from the title menu')
    frames, caps = [], []
    for i in range(70):  # ~85 s
        pg.wait_for_timeout(1200)
        try:
            if not S("window.__demo && window.__demo.getState().on"): break
            caps.append(S("window.__demo.getState().caption"))
            frames.append(Image.open(io.BytesIO(pg.screenshot())).convert('RGB').resize((320, 180)))
        except Exception: break
    steps = []
    for c in caps:
        if c and (not steps or steps[-1] != c): steps.append(c)
    print('\n'.join(steps))
    check(len(steps) >= 8, f'all the steps play ({len(steps)} captions)')
    pg.wait_for_timeout(6000); pg.wait_for_function('!!window.__game')
    after = S(f"JSON.stringify({KEYS}.map(k => localStorage.getItem(k)))")
    check(before == after, 'the save is untouched by the demo')
    check(not errs, f'no page errors {errs[:2]}')
    br.close()
frames = frames[::2]
sheet = Image.new('RGB', (320 * 6, 180 * ((len(frames) + 5) // 6)))
for i, im in enumerate(frames): sheet.paste(im, ((i % 6) * 320, (i // 6) * 180))
sheet.save(f'{OUT}/demo-sheet.jpg', quality=82)
print('\n'.join(notes + fails)); print(f'{len(notes)} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
