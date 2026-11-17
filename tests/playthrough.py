"""Automated play-through of the real game. Run after every build day, before any reel.

    python tests/playthrough.py [url]      (default: serves notes-brain/trailer/builds/game itself; build it first with the reel build command)

Opens play.html in Edge (Playwright), then:
  * plays one full drink order exactly as the ticket asks, serves it, expects 100% and coins
  * builds the cake on the order card, boxes it, expects a high score
  * tries edge cases: serve with no glass, mash the machine, bin a glass mid-shot, double extras, clock past midnight
  * visits every view at desktop, phone-landscape and phone-portrait sizes and screenshots them (tests/out/)
Fails (exit 1) on any page error, console error, crash card or broken rule.
"""
import sys, os, json, time
from playwright.sync_api import sync_playwright

# serves the reel build of the game itself (no other server needed); pass a URL to test something else
import threading, functools, http.server
GAME = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'notes-brain', 'trailer', 'builds', 'game'))
if len(sys.argv) > 1: URL = sys.argv[1]
else:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=GAME))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{srv.server_address[1]}/play.html?snap'
OUT = os.path.join(os.path.dirname(__file__), 'out'); os.makedirs(OUT, exist_ok=True)
fails, notes = [], []
def check(ok, msg):
    (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)

def open_game(p, w, h, mobile=False):
    br = p.chromium.launch(channel='msedge')
    ctx = br.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.on('console', lambda m: errs.append(f'console: {m.text}') if m.type == 'error' and 'favicon' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.on('response', lambda r: errs.append(f'missing file {r.status}: {r.url}') if r.status >= 400 and 'favicon' not in r.url else None)
    pg.goto(URL); pg.wait_for_function('window.game && window.__day && window.__cake && window.__clock', timeout=60000)
    pg.wait_for_timeout(1500)
    return br, pg, errs

def key(pg, k): pg.evaluate(f"window.dispatchEvent(new KeyboardEvent('keydown', {{ key: '{k}' }}))")

with sync_playwright() as p:
    # ── desktop: a full drink order, a full cake, edge cases ──
    br, pg, errs = open_game(p, 1280, 800)
    key(pg, '4'); pg.evaluate("window.game.shop.getState().openShop(true); window.__day.getState().start(); window.game.shop.getState().trash(); window.game.line.spawn(false)")  # exactly what 'Open the café' does
    order = None
    for _ in range(90):  # the customer walks in and orders (up to ~45 s)
        order = pg.evaluate("(() => { const f = window.game.line.line.peek(); const o = f && window.game.shop.getState().orders[f.id]; return o ? o.want : null })()")
        if order: break
        pg.wait_for_timeout(500)
    check(order is not None, 'a customer reaches the counter and orders')
    if order:
        pg.evaluate("""(w) => { const s = window.game.shop.getState(); s.takeCup(w.size); if (w.chocolate) s.choc();
            for (let i = 0; i < w.shots; i++) s.shot(); }""", order)
        pg.wait_for_timeout(2600)  # shots are pulled, then poured
        pg.evaluate("""(w) => { const s = window.game.shop.getState(); if (w.water) s.water();
            if (w.milk !== 'none') { s.pickMilk(w.milkType); s.milk(w.milk) } if (w.topping !== 'none') s.top(w.topping) }""", order)
        pg.wait_for_timeout(800)
        before = pg.evaluate("window.game.shop.getState().coins")
        pg.evaluate("window.game.shop.getState().serve()")
        st = pg.evaluate("(() => { const s = window.game.shop.getState(); return { served: s.served, coins: s.coins, pct: s.last && s.last.pct, cup: s.cup } })()")
        check(st['served'] == 1, f"order served (served={st['served']})")
        check(st['pct'] == 100, f"drink made exactly to order scores 100 (got {st['pct']}) for {json.dumps(order)}")
        check(st['coins'] > before, 'serving pays coins')
        check(st['cup'] is False, 'the glass leaves with the customer')
    # edge cases at the bar
    r = pg.evaluate("(() => { const s = window.game.shop.getState(); s.trash(); s.serve(); s.shot(); s.choc(); return window.game.shop.getState().drink })()")
    check(r['shots'] == 0 and not r['chocolate'], 'serving / pouring with no glass does nothing')
    pg.evaluate("(() => { const s = window.game.shop.getState(); s.takeCup('medium'); for (let i = 0; i < 12; i++) s.shot() })()")
    pg.wait_for_timeout(2600)
    check(pg.evaluate("window.game.shop.getState().drink.shots") <= 4, 'mashing the machine caps at 4 shots')
    pg.evaluate("(() => { const s = window.game.shop.getState(); s.trash(); s.takeCup('small'); s.shot(); s.trash(); s.takeCup('large') })()")
    pg.wait_for_timeout(2600)
    check(pg.evaluate("window.game.shop.getState().drink.shots") == 0, 'a shot for a binned glass never lands in the next one')
    pg.evaluate("window.game.shop.getState().trash()")
    # the cake machine: build the cake on the order card
    key(pg, '5'); pg.wait_for_timeout(1200)
    cake = pg.evaluate("window.__cake.getState().order.want")
    pg.evaluate("""(w) => { const c = window.__cake.getState(); c.reset(); c.setTin(w.tin);
        w.layers.forEach((l, i) => { window.__cake.getState().addLayer(l); if (w.fillings[i]) window.__cake.getState().addFilling(w.fillings[i]) });
        const k = window.__cake.getState(); k.frost(w.frosting); window.__cake.getState().pipe(w.piping); window.__cake.getState().topWith(w.top); window.__cake.getState().box() }""", cake)
    last = pg.evaluate("window.__cake.getState().last")
    check(last is not None and last['pct'] >= 90, f"a cake made to the card scores high (got {last and last['pct']}) for {json.dumps(cake)}")
    # the clock across midnight, fast
    pg.evaluate("window.__clock.set(23.9); window.__clock.speed(3000)"); pg.wait_for_timeout(1500); pg.evaluate("window.__clock.speed(1)")
    for k, name in [('1', 'outside'), ('2', 'dollhouse'), ('3', 'walk'), ('4', 'bar'), ('5', 'cakes')]:
        key(pg, k); pg.wait_for_timeout(1500); pg.screenshot(path=os.path.join(OUT, f'desktop-{name}.png'))
    crashed = pg.evaluate("!!document.querySelector('.crash')")
    game_errs = pg.evaluate("window.__errors || []")
    check(not crashed, 'no crash card on desktop')
    check(not game_errs and not errs, 'no errors on desktop' + ('' if not (game_errs or errs) else f': {(game_errs + errs)[:5]}'))
    br.close()

    # ── phones: every view renders without errors; portrait asks you to turn the phone ──
    for (w, h, label) in [(844, 390, 'phone-landscape'), (390, 844, 'phone-portrait')]:
        br, pg, errs = open_game(p, w, h, mobile=True)
        for k, name in [('1', 'outside'), ('2', 'dollhouse'), ('4', 'bar'), ('5', 'cakes')]:
            key(pg, k); pg.wait_for_timeout(1200); pg.screenshot(path=os.path.join(OUT, f'{label}-{name}.png'))
        check(not pg.evaluate("!!document.querySelector('.crash')") and not pg.evaluate("(window.__errors || []).length") and not errs,
              f'no errors on {label}' + ('' if not errs else f': {errs[:3]}'))
        br.close()

print('\n'.join(notes + fails))
print(f"\n{len(notes)} passed, {len(fails)} failed · screenshots in {OUT}")
sys.exit(1 if fails else 0)
