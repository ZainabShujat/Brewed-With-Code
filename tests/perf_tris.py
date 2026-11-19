import sys, json
from playwright.sync_api import sync_playwright
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 11 })); localStorage.setItem('bwc.tutorial.done', '1')"
JS = """() => { const s = window.__r3f, out = {}, top = {}
  s.scene.traverse((o) => { if (!o.isMesh || !o.geometry) return; let p = o, part = '?'; while (p) { if (p.name && p.name.startsWith('p:')) { part = p.name; break } p = p.parent }
    const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)
    out[part] = (out[part] || 0) + t; const k = part + ' ' + (g.name || o.name || o.parent?.name || g.type) + (o.isInstancedMesh ? ' x' + o.count : ''); top[k] = (top[k] || 0) + t })
  const r = (m) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round(v / 1000) + 'k']))
  return { parts: r(out), top: r(top) } }"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11'])
    pg = br.new_page(); pg.add_init_script(INIT)
    pg.goto('http://localhost:5190/play.html', wait_until='commit'); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=120000)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.evaluate("window.__game.getState().setMode('dollhouse')"); pg.wait_for_timeout(8000)
    print(json.dumps(pg.evaluate(JS), indent=0))
    br.close()
