"""Play the game like a first-time phone player (landscape, real touch) and screenshot every step.

    python tests/phone_session.py [url]   → tests/out/phone/NN-step.png  (default: the live Vercel site)
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'https://brewed-with-code.vercel.app/'
OUT = os.path.join(os.path.dirname(__file__), 'out', 'phone'); os.makedirs(OUT, exist_ok=True)
W, H = 844, 390  # an iPhone 14-ish in landscape

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge')
    ctx = br.new_context(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True, device_scale_factor=2,
                         user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    n = [0]
    def shot(name, wait=900):
        pg.wait_for_timeout(wait); n[0] += 1; pg.screenshot(path=os.path.join(OUT, f'{n[0]:02d}-{name}.png'))
    def tap(x, y): cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 1}]}); pg.wait_for_timeout(60); cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(300)
    def drag(a, b, steps=14):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': a[0], 'y': a[1], 'id': 1}]})
        for i in range(1, steps + 1): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': a[0] + (b[0] - a[0]) * i / steps, 'y': a[1] + (b[1] - a[1]) * i / steps, 'id': 1}]}); pg.wait_for_timeout(25)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(400)
    def tap_text(t):
        el = pg.get_by_text(t, exact=False).first
        try: b = el.bounding_box(); tap(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2); return True
        except Exception: return False
    E = lambda js: pg.evaluate(js)

    pg.goto(URL); pg.wait_for_function('!!window.__game', timeout=90000); shot('title', 2500)
    tap(W / 2, H / 2); shot('menu')
    tap_text('Explore'); shot('creator-first-play', 1500)
    tap_text("let's go"); shot('after-creator', 2500)
    shot('tour-step1', 600)
    drag((600, 200), (420, 200)); shot('tour-after-look')
    tap(560, 300); shot('tour-walk', 2500)
    tap_text('First person'); shot('tour-fp', 1800)
    tap_text('Dollhouse'); shot('tour-dollhouse', 2200)
    tap_text('Explore'); shot('tour-explore', 1800)
    # walk to the door (tap the floor toward it a few times)
    E("(() => { const p = window.__game.getState().player; p.x = 0; p.z = 10.4 })()"); shot('at-door', 1200)
    tap_text('tap to'); shot('opened', 1500)
    pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=90000)
    shot('order-waiting', 800)
    tap_text('Take order'); shot('bar-tutorial', 2500)
    shot('bar-tutorial-2', 1500)
    E("window.__game.getState().setMode('cake')"); shot('cake', 2500)
    E("window.__game.getState().setMode('walk'); (() => { const p = window.__game.getState().player; p.x = 49.6; p.z = 21.2 })()"); shot('street-shop', 2500)
    tap_text('buy'); shot('shop-open', 1500)
    E("window.__game.getState().setMode('dollhouse')"); shot('dollhouse-mid-day', 2500)
    E("window.__day.setState({ phase: 'results' })"); shot('results', 1200)
    tap_text('Wind down'); shot('wind-down', 2000)
    tap_text('Menu'); shot('pause-menu', 1200)
    print('errors:', errs[:3] or 'none'); br.close()
print('screens in', OUT)
