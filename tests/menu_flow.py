"""Today's Menu + Recipe Book in a real browser (desktop 1280x720, phone 844x390).
    python tests/menu_flow.py [base] [outdir]"""
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
        ctx = br.new_context(**opts); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        S = lambda js: pg.evaluate(js)
        pg.goto(BASE + '/play.html'); pg.wait_for_function('!!window.__menu && !!window.__day', timeout=120000)
        S("localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1'); localStorage.removeItem('bwc.menu')"); pg.reload()
        pg.wait_for_function('!!window.__menu && !!window.__day', timeout=120000); pg.wait_for_timeout(6000)
        # flip the sign the way the door does it (Interact's signAct): Today's Menu opens first
        S("window.__day.setState({ day: 8, phase: 'idle' })")
        S("import('/src/ui/Interact.tsx').then(m => m.signAct().run())"); pg.wait_for_timeout(800)
        check(bool(pg.query_selector('.tmenu .tm-panel')), f'{dev}: flipping the sign opens Today\'s Menu')
        check(S("window.__day.getState().phase") == 'idle', f'{dev}: the café is not open until the menu is confirmed')
        pg.screenshot(path=f'{OUT}/menu-{dev}.png')
        pg.click('[data-item="cake-chocolate"] .tm-pick'); pg.click('[data-item="espresso"] .tm-pick'); pg.wait_for_timeout(200)
        ids = S("window.__menu.getState().ids"); check('cake-chocolate' in ids and 'espresso' not in ids, f'{dev}: add / remove items ({ids})')
        pg.click('[data-item="latte"] .tm-peek'); pg.wait_for_timeout(300); check(bool(pg.query_selector('.rv')), f'{dev}: a recipe opens from the menu')
        pg.click('.rv-line >> nth=0'); pg.wait_for_timeout(200); check(bool(pg.query_selector('.rv-focus')), f'{dev}: tapping an ingredient shows it larger')
        pg.screenshot(path=f'{OUT}/menu-recipe-{dev}.png'); pg.click('[aria-label="back to the menu"]'); pg.wait_for_timeout(200)
        pg.click('.tm-go'); pg.wait_for_timeout(800)
        check(not pg.query_selector('.tmenu') and S("window.__day.getState().phase") == 'open', f'{dev}: Confirm opens the café')
        # customers' orders follow the menu
        S("window.game.line.spawn(false); window.game.line.spawn(false)"); pg.wait_for_timeout(9000)
        orders = S("Object.values(window.__shop.getState().orders).map(o => o.cake ? 'cake' : o.recipe.id)")
        allowed = set(S("window.__menu.getState().ids")) | {'cake'}
        check(all(o in allowed for o in orders), f'{dev}: orders only from the menu {orders}')
        # the recipe book
        S("window.__book.getState().show('cake-chocolate')"); pg.wait_for_timeout(500)
        t = S("document.querySelector('.tm-panel.book')?.innerText || ''")
        check('Recipe Book' in t and 'cocoa' in t.lower() and 'kitchen' in t.lower(), f'{dev}: Recipe Book shows the chocolate cake with its kitchen step')
        pg.screenshot(path=f'{OUT}/book-{dev}.png')
        check(not errs, f'{dev}: no page errors {errs[:2]}')
        ctx.close()
    br.close()
print('\n'.join(notes + fails)); print(f'{len(notes)} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
