"""Which render call compiles new shaders during a milk pour (and into what target)."""
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
HOOK = r"""(() => { const gl = window.__r3f.gl, r0 = gl.render.bind(gl); window.__hits = [];
  gl.render = (sc, cam) => { const n = gl.info.programs.length; r0(sc, cam);
    if (gl.info.programs.length > n) window.__hits.push({ scene: sc.isScene ? 'scene' : (sc.name || sc.type), cam: cam.type, target: gl.getRenderTarget() ? 'RT' : 'screen', keys: gl.info.programs.slice(n).map((q) => q.cacheKey.slice(0, 120)), stack: (new Error().stack || '').split('\n').slice(2, 6).map((l) => l.trim().slice(0, 90)) }) } })()"""
POUR = """new Promise((res) => { let last = performance.now(); const t0 = last; const f = (n) => { window.game.shop.getState().pourMilkTick((n - last) / 1000); last = n; if (n - t0 < 2500) requestAnimationFrame(f); else res() }; requestAnimationFrame(f) })"""
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu']); pg = br.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto(BASE + '/play.html?snap', wait_until='commit'); pg.wait_for_function('!!(window.game && window.__r3f)', timeout=90000); pg.wait_for_timeout(2000)
    S = lambda js: pg.evaluate(js)
    S("localStorage.setItem('bwc.tutorial.done','1'); window.dispatchEvent(new KeyboardEvent('keydown',{key:'4'})); window.game.shop.getState().openShop(true); window.__day.getState().start(); window.game.line.spawn(false)")
    pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=60000)
    S("(() => { const s = window.game.shop.getState(), f = window.game.line.line.peek(), o = s.orders[f.id]; o.want.milk = 'steamed'; s.takeCup(o.want.size); window.game.shop.setState({ pitcher: { ...s.pitcher, at: 'cup', milk: 300, foam: 0, stretch: 1.5 }, pouringMilk: true }) })()")
    pg.wait_for_timeout(2500)
    S(HOOK); S(POUR)
    print(json.dumps(S('window.__hits'), indent=1)); br.close()
