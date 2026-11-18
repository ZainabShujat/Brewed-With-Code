"""Phone test: real TOUCH events (CDP) at the coffee bar and on foot, in a landscape phone viewport.

    python tests/touch_bar.py [url]     (default: the dev server, ?snap)

Drags a glass onto the mat with a finger, holds the machine for a shot, drags the shot over, and checks the
one-finger camera turn in Explore. Fails on page errors.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180/play.html?snap'
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
WHERE = """(name) => { const st = window.__r3f; let o = null; st.scene.traverse((m) => { if (!o && m.name === name) o = m }); if (!o) return null
  const v = new o.position.constructor(); o.getWorldPosition(v); v.project(st.camera); const r = st.gl.domElement.getBoundingClientRect()
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] }"""

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge')
    ctx = br.new_context(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    def touch(kind, x, y): cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
    def tdrag(a, b, steps=16, hold=0):
        touch('touchStart', *a); pg.wait_for_timeout(80)
        for i in range(1, steps + 1): touch('touchMove', a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps); pg.wait_for_timeout(30)
        pg.wait_for_timeout(120 + hold); touch('touchEnd', *b); pg.wait_for_timeout(600)
    W = lambda n: pg.evaluate(WHERE, n)
    S = lambda js: pg.evaluate(js)
    pg.goto(URL); pg.wait_for_function('window.game && window.__r3f', timeout=60000); pg.wait_for_timeout(1500)
    S("window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' })); window.game.shop.getState().openShop(true); window.__day.getState().start(); window.game.line.spawn(false)")
    pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=60000)
    w = S("(() => { const f = window.game.line.line.peek(), o = window.game.shop.getState().orders[f.id]; o.want.size = 'large'; return o.want })()") # the hardest stack to hit
    pg.wait_for_timeout(800)
    tdrag(W(f"station:cups-{w['size']}"), W('drop:cup'))
    got = S("[window.game.shop.getState().cup, window.game.shop.getState().drink.size]"); check(got[0] and got[1] == w['size'], f"finger-drag a {w['size']} glass onto the mat (got {got})")
    a = W('hold:machine'); touch('touchStart', *a)
    pg.wait_for_function("window.game.shop.getState().shotGlass >= 29", timeout=8000); touch('touchEnd', *a); pg.wait_for_timeout(1200)
    check(S("window.game.shop.getState().shotGlass") >= 29, 'press-and-hold the machine pulls a shot')
    tdrag(W('station:shotglass'), W('station:glass')); pg.wait_for_timeout(1800)
    check(S("window.game.shop.getState().drink.shots") >= 1, 'finger-drag the shot glass into your glass')
    pg.screenshot(path='tests/out/touch_bar.png')
    # on foot: one finger on the right half turns the camera
    S("window.__game.getState().setMode('walk')"); pg.wait_for_timeout(1500)
    y0 = S("window.__view.yaw"); tdrag([600, 200], [450, 200]); y1 = S("window.__view.yaw")
    check(abs(y1 - y0) > 0.3, f'one-finger drag turns the camera (yaw {y0:.2f} → {y1:.2f})')
    check(not errs, 'no page errors' + ('' if not errs else f': {errs[:3]}'))
    br.close()
print('\n'.join(notes + fails)); print(f'\n{len(notes)} passed, {len(fails)} failed'); sys.exit(1 if fails else 0)
