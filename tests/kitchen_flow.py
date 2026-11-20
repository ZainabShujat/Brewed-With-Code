"""The prep kitchen in a real browser: walk in through the curtains, make vanilla batter by clicking the jars and
holding the whisk, then pour it at the cake bench. Desktop + phone, with screenshots.
    python tests/kitchen_flow.py [base] [outdir]"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'tests/out'
WHERE = """(name) => { const st = window.__r3f; let o = null; st.scene.traverse((m) => { if (!o && m.name === name) o = m }); if (!o) return null
  const v = new o.position.constructor(); o.getWorldPosition(v); v.project(st.camera); const r = st.gl.domElement.getBoundingClientRect()
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] }"""
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11'])
    for dev, opts in [('desktop', dict(viewport={'width': 1280, 'height': 720})), ('phone', dict(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        ctx = br.new_context(**opts); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        S = lambda js: pg.evaluate(js); W = lambda n: pg.evaluate(WHERE, n)
        pg.goto(BASE + '/play.html'); pg.wait_for_function('!!window.__kitchen && !!window.__r3f', timeout=120000)
        S("localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1'); localStorage.removeItem('bwc.kitchen'); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({kind:'kozie',name:'Test',made:true,model:0,colour:0})); sessionStorage.setItem('bwc.boot','continue')"); pg.reload()
        pg.wait_for_function('!!window.__kitchen && !!window.__r3f', timeout=120000); pg.wait_for_timeout(6000)
        # outside the curtains, on foot: the kitchen is a real place you walk into
        S("window.__game.getState().setMode('walk'); Object.assign(window.__game.getState().player, { x: 7.5, z: -4.6, facing: 0 })"); pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{OUT}/kitchen-outside-{dev}.png')
        S("Object.assign(window.__game.getState().player, { x: 7.5, z: -8.0 })"); pg.wait_for_timeout(1500)
        print(dev, 'player', S("(({x, z}) => ({x, z}))(window.__game.getState().player)"))
        hint = S("document.querySelector('.stationhint')?.innerText || ''"); check('mix batter' in hint, f'{dev}: inside the curtains the hint says mix batter ({hint!r})')
        S("window.__game.getState().setMode('kitchen')"); pg.wait_for_timeout(2500)
        check(bool(pg.query_selector('.khud')), f'{dev}: the kitchen panel shows')
        pg.click('[data-flavour="vanilla"]'); pg.wait_for_timeout(200)
        tap = (lambda xy: pg.touchscreen.tap(*xy)) if dev == 'phone' else (lambda xy: pg.mouse.click(*xy))
        for part in ('flour', 'sugar', 'eggs', 'butter'):
            for i in range(3):
                tap(W(f'kitchen:{part}'))
                if i == 0: pg.wait_for_timeout(480); pg.screenshot(path=f'{OUT}/kitchen-pour-{part}-{dev}.png'); pg.wait_for_timeout(520)
                else: pg.wait_for_timeout(1000)
        added = S("window.__kitchen.getState().bowl.added")
        check(all(added[k] == 3 for k in ('flour', 'sugar', 'eggs', 'butter')), f'{dev}: clicking the jars adds scoops {added}')
        pg.screenshot(path=f'{OUT}/kitchen-bowl-{dev}.png')
        w = W('kitchen:whisk')
        pg.mouse.move(*w); pg.mouse.down(); pg.wait_for_timeout(1300); pg.screenshot(path=f'{OUT}/kitchen-stir-{dev}.png')
        for _ in range(60):  # keep holding until the bowl is done (slow test renderers stir per frame)
            if S("window.__kitchen.getState().batter.vanilla") >= 3: break
            pg.wait_for_timeout(100)
        pg.mouse.up(); pg.wait_for_timeout(400)
        check(S("window.__kitchen.getState().batter.vanilla") == 3, f'{dev}: holding the whisk makes 3 layers of vanilla batter')
        pg.screenshot(path=f'{OUT}/kitchen-done-{dev}.png')
        # the cake bench pours it
        S("window.__game.getState().setMode('cake')"); pg.wait_for_timeout(2000)
        S("(() => { const c = window.__cake.getState(); c.reset(); c.setTin('round'); c.addLayer('vanilla'); c.addFilling('cream'); c.addLayer('vanilla') })()")
        check(S("window.__cake.getState().cake.layers.length") == 2 and S("window.__kitchen.getState().batter.vanilla") == 1, f'{dev}: the cake bench pours the kitchen batter')
        # dollhouse view: the kitchen behind its curtains
        S("window.__game.getState().setMode('dollhouse')"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{OUT}/kitchen-dollhouse-{dev}.png')
        check(not errs, f'{dev}: no page errors {errs[:2]}')
        ctx.close()
    br.close()
print('\n'.join(notes + fails)); print(f'{len(notes)} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
