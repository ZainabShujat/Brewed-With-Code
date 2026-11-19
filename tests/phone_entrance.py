"""Phone: tap-to-walk into the café's entrance passage; fails on page errors, a lost WebGL context or a blank frame.
    python tests/phone_entrance.py [base]"""
import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
OUT = os.path.join(os.path.dirname(__file__), 'out', 'entrance'); os.makedirs(OUT, exist_ok=True)
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 14 })); localStorage.setItem('bwc.tutorial.done', '1'); localStorage.setItem('quality', 'low')"
PROJ = """([x, y, z]) => { const s = window.__r3f, c = s.camera, V = c.position.constructor; const v = new V(x * 1.2, y * 1.2, z * 1.2).project(c); const r = s.gl.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] }"""
STATE = """() => { const s = window.__r3f, gl = s.gl.getContext(), p = window.__game.getState().player, c = s.camera.position
  const px = new Uint8Array(4 * 9); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight; const pts = [[.2,.2],[.5,.2],[.8,.2],[.2,.5],[.5,.5],[.8,.5],[.2,.8],[.5,.8],[.8,.8]]
  return { lost: gl.isContextLost(), player: [+p.x.toFixed(2), +p.z.toFixed(2)], cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), near: s.camera.near, mode: window.__game.getState().mode } }"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge')
    ctx = br.new_context(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True, device_scale_factor=2)
    ctx.add_init_script(INIT); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text[:200]))
    pg.goto(BASE + '/play.html', wait_until='commit'); pg.wait_for_function('!!(window.__game && window.__r3f)', timeout=90000); pg.wait_for_timeout(1500)
    cdp = ctx.new_cdp_session(pg)
    tap = lambda x, y: (cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 1}]}), pg.wait_for_timeout(60), cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}))
    pg.mouse.click(422, 200); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.wait_for_timeout(1500); pg.evaluate("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    pg.evaluate("(() => { try { window.__shop.getState().openShop(true); window.__day.getState().start() } catch (e) {} const g = window.__game.getState(); g.setMode('walk'); Object.assign(g.player, { x: 0, z: 22, facing: Math.PI }) })()"); pg.wait_for_timeout(3000)
    pg.screenshot(path=os.path.join(OUT, '0-start.png'))
    for i, z in enumerate([17, 15.5, 14, 12.5, 11, 9, 6]):
        xy = pg.evaluate(PROJ, [0, 0, z]); tap(*xy); pg.wait_for_timeout(3500)
        st = pg.evaluate(STATE); pg.screenshot(path=os.path.join(OUT, f'{i+1}-tap-z{z}.png'))
        print('tap z', z, 'at', [round(v) for v in xy], json.dumps(st))
    print('errors:', errs[:6]); br.close()
