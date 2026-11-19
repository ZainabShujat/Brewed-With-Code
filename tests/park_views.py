"""The park in the real game cameras (Explore, First person, Dollhouse, Outside) + frame time in each.

    python tests/park_views.py [tag]   → tests/out/terrain/<tag>-view-*.png
"""
import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

TAG = sys.argv[1] if len(sys.argv) > 1 else 'v'
OUT = os.path.join(os.path.dirname(__file__), 'out', 'terrain'); os.makedirs(OUT, exist_ok=True)
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 11 })); localStorage.setItem('bwc.tutorial.done', '1')"
FPS = "new Promise((res) => { const t = []; let last = performance.now(); const f = (now) => { t.push(now - last); last = now; if (t.length < 150) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ median: +t[75].toFixed(1), p95: +t[142].toFixed(1) }) } }; requestAnimationFrame(f) })"
VIEWS = [  # name, mode, player (x, z, facing), yaw for the camera
    ('explore-gate', 'walk', (-24.6, 31.0, 3.14)),
    ('explore-pond', 'walk', (-33.0, 52.0, 4.25)),
    ('fp-plaza', 'fp', (-17.5, 36.0, 2.3)),
    ('fp-bridge', 'fp', (-24.6, 56.4, 3.14)),
    ('fp-garden', 'fp', (57.0, 32.4, 2.4)),
    ('dollhouse', 'dollhouse', (0, 5, 0)),
    ('outside', 'exterior', (0, 5, 0)),
]
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu'])
    pg = br.new_page(viewport={'width': 1536, 'height': 864}); pg.add_init_script(INIT)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:5180/play.html'); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=60000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    pg.get_by_text('▶ Play', exact=True).first.click(); pg.wait_for_timeout(2500)
    pg.evaluate("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    out = {}
    for name, mode, (x, z, f) in VIEWS:
        pg.evaluate(f"(() => {{ const g = window.__game.getState(); g.setMode('{mode}'); const p = g.player; p.x = {x}; p.z = {z}; p.facing = {f}; if (window.__view) {{ const v = window.__view; if (v.getState) {{ const s = v.getState(); s.yaw !== undefined && v.setState && v.setState({{ yaw: {f} }}) }} else if ('yaw' in v) v.yaw = {f} }} }})()")
        pg.wait_for_timeout(3500)
        out[name] = pg.evaluate(FPS)
        pg.screenshot(path=os.path.join(OUT, f'{TAG}-view-{name}.png'))
    out['renderer'] = pg.evaluate("(() => { const i = window.__r3f.gl.info; return { calls: i.render.calls, tris: i.render.triangles } })()")
    print(json.dumps(out, indent=1)); print('errors:', errs[:5])
    br.close()
