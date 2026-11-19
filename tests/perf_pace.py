"""Frame pacing in the real game loop: gaps between game updates (advance calls), on foot by the street."""
import json
from playwright.sync_api import sync_playwright
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 11 })); localStorage.setItem('bwc.tutorial.done', '1')"
JS = """() => new Promise((res) => { const s = window.__r3f, adv = s.advance, gaps = [], cost = []; let last = 0
  s.advance = (t, ...a) => { const n = performance.now(); if (last) gaps.push(n - last); last = n; adv(t, ...a); cost.push(performance.now() - n) }
  setTimeout(() => { s.advance = adv; const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return +b[Math.floor(b.length * p)].toFixed(1) }
    const hist = {}; gaps.forEach((g) => { const k = Math.round(g / 8.33) * 8.33; hist[k.toFixed(0)] = (hist[k.toFixed(0)] || 0) + 1 })
    res({ n: gaps.length, gap50: q(gaps, .5), gap95: q(gaps, .95), gapMax: q(gaps, .999), cost50: q(cost, .5), cost95: q(cost, .95), hist }) }, 5000) })"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu'])
    pg = br.new_page(viewport={'width': 1536, 'height': 864}); pg.add_init_script(INIT)
    pg.goto('http://localhost:5190/play.html', wait_until='commit'); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=120000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.wait_for_timeout(2000); pg.evaluate("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    pg.evaluate("(() => { const g = window.__game.getState(); g.setMode('walk'); g.player.x = 0; g.player.z = 20 })()"); pg.wait_for_timeout(5000)
    for x, z in [('base', 0), ('noshadow', 0), ('nobubbles', 0)]:
        if x == 'noshadow': pg.evaluate("window.__r3f.gl.shadowMap.enabled = false")
        if x == 'nobubbles': pg.evaluate("window.__r3f.gl.shadowMap.enabled = true; document.querySelectorAll('.chat').forEach(e => { let p = e; while (p.parentElement && p.parentElement !== document.body && !p.parentElement.querySelector('canvas')) p = p.parentElement; p.style.display = 'none' })")
        pg.wait_for_timeout(1500)
        print(x, z, pg.evaluate("[window.__menuIdle, document.querySelectorAll('.chat').length]"), json.dumps(pg.evaluate(JS)), flush=True)
    br.close()
