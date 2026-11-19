"""Real frame rate + draw calls in each camera mode, for one build.   python tests/perf_ab.py <port>"""
import sys, json
from playwright.sync_api import sync_playwright
PORT = sys.argv[1]
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 11 })); localStorage.setItem('bwc.tutorial.done', '1')"
FPS = """() => new Promise((res) => { const t = []; let last = performance.now(); const f = (now) => { t.push(now - last); last = now; if (t.length < 120) requestAnimationFrame(f); else { t.sort((a, b) => a - b); const i = window.__r3f.gl.info.render; res({ ms: +t[60].toFixed(1), p95: +t[114].toFixed(1), calls: i.calls, tris: i.triangles }) } }; requestAnimationFrame(f) })"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'])
    pg = br.new_page(viewport={'width': 1536, 'height': 864}); pg.add_init_script(INIT)
    pg.goto(f'http://localhost:{PORT}/play.html', wait_until='commit', timeout=90000); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=120000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.wait_for_timeout(2000); pg.evaluate("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    for mode, (x, z) in [('walk', (0, 20)), ('walk', (-24.6, 31.0)), ('dollhouse', (0, 5)), ('exterior', (0, 5))]:
        pg.evaluate(f"(() => {{ const g = window.__game.getState(); g.setMode('{mode}'); g.player.x = {x}; g.player.z = {z} }})()"); pg.wait_for_timeout(5000)
        print(PORT, mode, x, z, json.dumps(pg.evaluate(FPS)), flush=True)
    br.close()
