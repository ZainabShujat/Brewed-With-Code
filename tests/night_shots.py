"""Night street renders (lamp light on walls, trees, folk): free cameras in layout units.   python tests/night_shots.py [base] [hour]"""
import sys, base64
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'; HOUR = int(sys.argv[2]) if len(sys.argv) > 2 else 21
W = 1.2
SHOTS = [('corner', (8, 3.5, 38), (-4, 2.5, 26)), ('shops', (-14, 3.2, 27), (-30, 3, 15)), ('park', (-12, 4, 30), (-24, 2, 42))]
if len(sys.argv) > 3 and sys.argv[3] == 'door': SHOTS = [('door-out', (2.5, 3.2, 24), (0, 2.6, 17)), ('door-in', (1.5, 3.0, 6), (0, 2.4, 13.5)), ('facade', (0, 12, 52), (0, 8, 14))]
JS = """([e, t]) => { const s = window.__r3f; const cam = s.camera.clone(); cam.fov = 50; cam.near = 0.2; cam.far = 2000;
  cam.aspect = s.gl.domElement.width / s.gl.domElement.height; cam.position.set(...e); cam.lookAt(...t); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const old = s.camera.position.clone(); s.camera.position.copy(cam.position); s.advance(performance.now() / 1000); s.camera.position.copy(old)
  s.gl.render(s.scene, cam); return s.gl.domElement.toDataURL('image/png') }"""
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: %d })); localStorage.setItem('bwc.tutorial.done', '1')" % HOUR
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11']); pg = br.new_page(viewport={'width': 1536, 'height': 864}); pg.add_init_script(INIT)
    pg.goto(BASE + '/play.html', wait_until='commit'); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=90000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.evaluate("window.__game.getState().setMode('walk'); const g = window.__game.getState(); g.player.x = -18; g.player.z = 31"); pg.wait_for_timeout(6000)
    for name, e, t in [(n, e, t) for n, e, t in SHOTS]:
        pg.evaluate(f"(() => {{ const g = window.__game.getState(); g.player.x = {e[0]}; g.player.z = {e[2]} }})()"); pg.wait_for_timeout(2500)  # the lamp lights follow the game's camera
        url = pg.evaluate(JS, [[c * W for c in e], [c * W for c in t]]); open(f'tests/out/night-{name}.png', 'wb').write(base64.b64decode(url.split(',')[1]))
    br.close()
print('ok')
