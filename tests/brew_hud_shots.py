"""Screens of the drink HUD (step tracker, hint, hold ring) on a phone (touch) and a laptop.   python tests/brew_hud_shots.py [base]"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
OUT = os.path.join(os.path.dirname(__file__), 'out', 'brew'); os.makedirs(OUT, exist_ok=True)
WHERE = """(name) => { const st = window.__r3f; let o = null; st.scene.traverse((m) => { if (!o && m.name === name) o = m }); if (!o) return null
  const v = new o.position.constructor(); o.getWorldPosition(v); v.project(st.camera); const r = st.gl.domElement.getBoundingClientRect()
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] }"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge')
    for tag, opts in [('phone', dict(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True, device_scale_factor=2)), ('laptop', dict(viewport={'width': 1536, 'height': 864}))]:
        ctx = br.new_context(**opts); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + '/play.html?snap'); pg.wait_for_function('window.game && window.__r3f', timeout=90000); pg.wait_for_timeout(1500)
        S = lambda js: pg.evaluate(js); W = lambda n: pg.evaluate(WHERE, n)
        S("localStorage.setItem('bwc.tutorial.done', '1'); window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' })); window.game.shop.getState().openShop(true); window.__day.getState().start(); window.game.line.spawn(false)")
        pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=60000)
        w = S("(() => { const f = window.game.line.line.peek(), o = window.game.shop.getState().orders[f.id]; o.want.milk = 'steamed'; o.want.milkType = 'whole'; o.want.shots = 1; o.want.topping = 'none'; o.want.chocolate = false; o.want.water = false; return o.want })()")
        pg.wait_for_timeout(1200); pg.screenshot(path=os.path.join(OUT, f'{tag}-1-glass.png'))
        a = W('hold:machine')
        if tag == 'phone':
            cdp = ctx.new_cdp_session(pg); t = lambda k, x, y: cdp.send('Input.dispatchTouchEvent', {'type': k, 'touchPoints': [] if k == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
            t('touchStart', *a); pg.wait_for_timeout(700); pg.screenshot(path=os.path.join(OUT, f'{tag}-2-holding.png'))
            pg.wait_for_function("window.game.shop.getState().shotGlass >= 26", timeout=8000); pg.screenshot(path=os.path.join(OUT, f'{tag}-3-letgo.png')); t('touchEnd', *a)
        else:
            pg.mouse.move(*a); pg.mouse.down(); pg.wait_for_timeout(700); pg.screenshot(path=os.path.join(OUT, f'{tag}-2-holding.png'))
            pg.wait_for_function("window.game.shop.getState().shotGlass >= 26", timeout=8000); pg.screenshot(path=os.path.join(OUT, f'{tag}-3-letgo.png')); pg.mouse.up()
        pg.wait_for_timeout(1500); pg.screenshot(path=os.path.join(OUT, f'{tag}-4-after.png'))
        if tag == 'laptop':  # your own character on foot: the gold antennas + thinking dots that set you apart
            S("localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'paper', model: 0, colour: '#9ec9ff', faceSeed: 7, name: 'You' }))"); pg.reload()
            pg.wait_for_function('window.game && window.__r3f', timeout=90000); pg.wait_for_timeout(1500)
            S("(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' })) })()"); pg.wait_for_timeout(3500); pg.screenshot(path=os.path.join(OUT, 'laptop-5-avatar.png'))
        print(tag, 'want', w, 'errors', errs[:3]); ctx.close()
    br.close()
