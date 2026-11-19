"""Frame pacing while steaming milk and pouring it (the 'freezes at the milk' report).   python tests/perf_milk.py [base]"""
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
WHERE = """(name) => { const st = window.__r3f; let o = null; st.scene.traverse((m) => { if (!o && m.name === name) o = m }); if (!o) return null
  const v = new o.position.constructor(); o.getWorldPosition(v); v.project(st.camera); const r = st.gl.domElement.getBoundingClientRect()
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] }"""
GAPS = """(ms) => new Promise((res) => { const g = []; let last = performance.now(); const t0 = last; const f = (n) => { g.push(n - last); last = n; if (n - t0 < ms) requestAnimationFrame(f); else { g.sort((a, b) => a - b); res({ n: g.length, med: +g[g.length >> 1].toFixed(1), p95: +g[Math.floor(g.length * .95)].toFixed(1), max: +g[g.length - 1].toFixed(1) }) } }; requestAnimationFrame(f) })"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu'])
    pg = br.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto(BASE + '/play.html?snap', wait_until='commit'); pg.wait_for_function('!!(window.game && window.__r3f)', timeout=90000); pg.wait_for_timeout(2000)
    S = lambda js: pg.evaluate(js); W = lambda n: pg.evaluate(WHERE, n)
    S("localStorage.setItem('bwc.tutorial.done','1'); window.dispatchEvent(new KeyboardEvent('keydown',{key:'4'})); window.game.shop.getState().openShop(true); window.__day.getState().start(); window.game.line.spawn(false)")
    pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=60000)
    S("(() => { const s = window.game.shop.getState(), f = window.game.line.line.peek(), o = s.orders[f.id]; o.want.milk = 'steamed'; s.takeCup(o.want.size); window.game.shop.setState({ pitcher: { ...s.pitcher, at: 'wand', milk: 300, foam: 0, stretch: 0 } }) })()")
    pg.wait_for_timeout(1500)
    print('idle   ', json.dumps(S("(" + GAPS + ")(2500)")))
    a = W('hold:wand'); pg.mouse.move(*a); pg.mouse.down(); r = S("(" + GAPS + ")(3000)"); pg.mouse.up(); print('steam  ', json.dumps(r))
    S("(() => { const s = window.game.shop.getState(); window.game.shop.setState({ pitcher: { ...s.pitcher, at: 'cup' }, pouringMilk: true }) })()")
    t = S("""(() => new Promise((res) => { const g = []; let last = performance.now(); const t0 = last; const f = (n) => { window.game.shop.getState().pourMilkTick((n - last) / 1000); g.push(n - last); last = n; if (n - t0 < 2500) requestAnimationFrame(f); else { g.sort((a, b) => a - b); res({ n: g.length, med: +g[g.length >> 1].toFixed(1), p95: +g[Math.floor(g.length * .95)].toFixed(1), max: +g[g.length - 1].toFixed(1) }) } }; requestAnimationFrame(f) }))()""")
    print('pour   ', json.dumps(t)); br.close()
