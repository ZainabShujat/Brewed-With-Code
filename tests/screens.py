"""Screenshot every screen on a PC and a landscape phone, to judge clutter.

    python tests/screens.py [url]      → tests/out/screens/{pc,phone}-NN-name.png
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180/play.html'
OUT = os.path.join(os.path.dirname(__file__), 'out', 'screens'); os.makedirs(OUT, exist_ok=True)
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 11 }))"

def run(p, tag, vp, mobile):
    br = p.chromium.launch(channel='msedge')
    ctx = br.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    pg = ctx.new_page(); pg.add_init_script(INIT)
    n = [0]
    def shot(name): n[0] += 1; pg.wait_for_timeout(900); pg.screenshot(path=os.path.join(OUT, f'{tag}-{n[0]:02d}-{name}.png'))
    E = lambda js: pg.evaluate(js)
    pg.goto(URL); pg.wait_for_function('window.__game && window.game', timeout=60000); pg.wait_for_timeout(2000)
    shot('title')
    pg.keyboard.press('Space') if not mobile else pg.mouse.click(vp['width'] / 2, vp['height'] / 2)
    pg.wait_for_timeout(1000); shot('menu')
    pg.get_by_text('Explore', exact=True).first.click(); pg.wait_for_timeout(2500); shot('explore-first-time')
    E("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    shot('explore-closed')
    E("(() => { const p = window.__game.getState().player; p.x = 0; p.z = 10.6 })()"); pg.wait_for_timeout(600); shot('at-the-door')
    E("window.__day.getState().start(); window.game.shop.getState().openShop(true); window.game.line.seed(3); window.game.line.spawn(false)")
    E("(() => { const p = window.__game.getState().player; p.x = 1; p.z = 5 })()")
    pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=60000)
    shot('explore-order-waiting')
    E("window.__game.getState().setMode('pov')"); pg.wait_for_timeout(1800); shot('bar-tutorial')
    E("window.__tut && window.__tut.getState().skip()")
    E("(() => { const f = window.game.line.line.peek(), w = window.game.shop.getState().orders[f.id].want; window.game.shop.getState().takeCup(w.size) })()"); shot('bar-working')
    E("window.__game.getState().setMode('cake')"); pg.wait_for_timeout(1800); shot('cake')
    E("window.__game.getState().setMode('dollhouse')"); pg.wait_for_timeout(2500); shot('dollhouse')
    E("window.__game.getState().setMode('fp')"); pg.wait_for_timeout(1800); shot('first-person')
    E("window.__day.setState({ phase: 'results' })"); shot('results')
    E("[...document.querySelectorAll('button')].find(b => /Wind down/.test(b.innerText))?.click()"); pg.wait_for_timeout(1500); shot('wind-down')
    br.close()

with sync_playwright() as p:
    run(p, 'pc', {'width': 1536, 'height': 864}, False)
    run(p, 'phone', {'width': 844, 'height': 390}, True)
print('screens in', OUT)
