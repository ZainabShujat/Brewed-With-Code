"""The goal line + world arrow: closed -> 'open your café' at the door; a customer -> 'take their order';
a cake order without batter -> 'mix batter in the kitchen'. Desktop + phone, screenshots.
    python tests/goal_flow.py [base] [outdir]"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'tests/out'
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11'])
    for dev, opts in [('desktop', dict(viewport={'width': 1280, 'height': 720})), ('phone', dict(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        ctx = br.new_context(**opts); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(120000)
        S = lambda js: pg.evaluate(js)
        pg.goto(BASE + '/play.html'); pg.wait_for_function('!!window.__game && !!window.__day')
        S("localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({kind:'kozie',name:'Kozie',made:true,model:0,colour:0})); localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1'); sessionStorage.setItem('bwc.boot','continue')")
        pg.reload(); pg.wait_for_function('!!window.__game && !!window.__day'); pg.wait_for_timeout(8000)
        S("window.__day.setState({ phase: 'idle' }); window.__game.getState().setMode('walk'); Object.assign(window.__game.getState().player, { x: 0, z: 3 })"); pg.wait_for_timeout(2500)
        t = S("document.querySelector('.goalline')?.innerText || ''"); check('flip the sign' in t, f'{dev}: closed -> {t!r}')
        pg.screenshot(path=f'{OUT}/goal-closed-{dev}.png')
        S("(() => { window.__day.setState({ phase: 'open', day: 3 }); window.__shop.getState().openShop(true); window.game.line.reset(); window.game.line.spawn(false) })()")
        pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && f.phase === 'line' && window.__shop.getState().orders[f.id] })()", timeout=90000)
        S("(() => { const f = window.game.line.line.peek(), o = window.__shop.getState().orders[f.id]; o.cake = false })()"); pg.wait_for_timeout(800)
        t = S("document.querySelector('.goalline')?.innerText || ''"); check('take their order' in t and ' a A' not in t, f'{dev}: customer -> {t!r}')
        pg.screenshot(path=f'{OUT}/goal-order-{dev}.png')
        S("(() => { const f = window.game.line.line.peek(), o = window.__shop.getState().orders[f.id]; o.cake = true; window.__kitchen.setState({ batter: { vanilla: 0, chocolate: 0, strawberry: 0 } }) })()"); pg.wait_for_timeout(800)
        t = S("document.querySelector('.goalline')?.innerText || ''"); check('kitchen' in t, f'{dev}: cake, no batter -> {t!r}')
        pg.screenshot(path=f'{OUT}/goal-kitchen-{dev}.png')
        check(not errs, f'{dev}: no page errors {errs[:2]}')
        ctx.close()
    br.close()
print('\n'.join(notes + fails)); print(f'{len(notes)} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
