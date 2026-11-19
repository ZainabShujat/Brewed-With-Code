"""Terrain review shots: free camera renders of the world (layout units; the WORLD scale is applied here).

    python tests/terrain_shots.py [tag]   → tests/out/terrain/<tag>-NN-name.png
"""
import sys, os, base64, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

TAG = sys.argv[1] if len(sys.argv) > 1 else 'now'
URL = 'http://localhost:5180/play.html'
OUT = os.path.join(os.path.dirname(__file__), 'out', 'terrain'); os.makedirs(OUT, exist_ok=True)
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 11 })); localStorage.setItem('bwc.tutorial.done', '1')"
W = 1.2
# name, eye (x, y, z), target (x, y, z), fov
SHOTS = [
    ('top-whole', (0, 230, 30), (0, 0, 8), 50),
    ('top-park', (-24, 62, 49), (-24, 0, 48), 50),
    ('outside-park', (-4, 22, 18), (-25, 0, 47), 55),
    ('outside-fountain', (-12, 9, 28), (-24.6, 3, 42.5), 55),
    ('walk-plaza', (-18, 2.3, 34.2), (-24.6, 3.0, 42.5), 65),
    ('walk-cobble', (-5.5, 2.3, 37.2), (-20, 1.5, 41), 65),
    ('walk-pond', (-34, 2.3, 51.5), (-22, 0.8, 57.5), 65),
    ('walk-bridge', (-24.6, 2.6, 51.8), (-24.6, 1.2, 62), 65),
    ('outside-garden', (64, 12, 26), (52, 0, 39), 55),
    ('walk-garden', (57, 2.3, 32.2), (50, 1.0, 39), 65),
    ('outside-forest-edge', (-30, 16, -38), (-30, 0, -58), 60),
    ('walk-forest-edge', (-20, 3.2, -46), (-30, 0.5, -56), 65),
    ('outside-front', (0, 45, 95), (0, 0, 20), 50),
]
JS = """([e, t, fov]) => { const s = window.__r3f, THREE = s.camera.constructor; const cam = s.camera.clone(); cam.fov = fov; cam.near = 0.1; cam.far = 2000;
  cam.aspect = s.gl.domElement.width / s.gl.domElement.height; cam.position.set(...e); cam.lookAt(...t); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  s.gl.render(s.scene, cam); return s.gl.domElement.toDataURL('image/png') }"""

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu'])
    pg = br.new_page(viewport={'width': 1536, 'height': 864}); pg.add_init_script(INIT)
    pg.goto(URL); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=60000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.wait_for_timeout(1500)
    pg.evaluate("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    pg.evaluate("window.__game.getState().setMode('dollhouse')"); pg.wait_for_timeout(6000)  # dollhouse loads the whole world
    pg.screenshot(path=os.path.join(OUT, f'{TAG}-00-dollhouse.png'))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    for i, (name, e, t, fov) in enumerate(SHOTS, 1):
        url = pg.evaluate(JS, [[c * W for c in e], [c * W for c in t], fov])
        open(os.path.join(OUT, f'{TAG}-{i:02d}-{name}.png'), 'wb').write(base64.b64decode(url.split(',')[1]))
    info = pg.evaluate("(() => { const i = window.__r3f.gl.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures } })()")
    print(json.dumps(info)); print('errors:', errs[:5])
    br.close()
print('shots in', OUT)
