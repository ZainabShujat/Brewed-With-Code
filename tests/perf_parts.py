"""GPU-synced render cost of each top-level world part (groups named p:*), per camera mode.

    python tests/perf_parts.py
"""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 11 })); localStorage.setItem('bwc.tutorial.done', '1')"
JS = """() => { const s = window.__r3f, gl = s.gl, ctx = gl.getContext(), px = new Uint8Array(4)
  const time = () => { const t = []; for (let k = 0; k < 25; k++) { const a = performance.now(); gl.render(s.scene, s.camera); ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px); t.push(performance.now() - a) } t.sort((a, b) => a - b); return +t[12].toFixed(2) }
  const parts = []; s.scene.traverse((o) => { if (o.name && o.name.startsWith('p:')) parts.push(o) })
  gl.shadowMap.autoUpdate = false
  const all = time(); gl.render(s.scene, s.camera); const calls = gl.info.render.calls, out = { all, calls, html: document.querySelectorAll('.chat').length }
  for (const p of parts) { p.visible = false; gl.render(s.scene, s.camera); const c = gl.info.render.calls; out[p.name] = [+(all - time()).toFixed(2), calls - c]; p.visible = true }
  let fr = 0; return new Promise((res) => { const t0 = performance.now(); const f = () => { fr++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res({ ...out, fps: fr / 2 }) }; requestAnimationFrame(f) }) }"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu'])
    pg = br.new_page(viewport={'width': 1536, 'height': 864}); pg.add_init_script(INIT)
    pg.goto('http://localhost:5190/play.html', wait_until='commit', timeout=90000); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=60000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.wait_for_timeout(2000); pg.evaluate("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    for mode, (x, z) in [('dollhouse', (0, 5))]:
        pg.evaluate(f"(() => {{ const g = window.__game.getState(); g.setMode('{mode}'); g.player.x = {x}; g.player.z = {z} }})()"); pg.wait_for_timeout(4000)
        print(mode, x, z, json.dumps(pg.evaluate(JS)))
    br.close()
