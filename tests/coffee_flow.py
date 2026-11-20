"""Real-mouse latte at the bar: glass → hold the machine → drag the shot → fill the jug → jug under the wand →
hold the steam KNOB → pick the jug up again (must not steam) → pour → serve. Checks state after every step.

    python tests/coffee_flow.py [base]
"""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
WHERE = """(name) => { const st = window.__r3f; let o = null; st.scene.traverse((m) => { if (!o && m.name === name) o = m }); if (!o) return null
  const v = new o.position.constructor(); o.getWorldPosition(v); v.project(st.camera); const r = st.gl.domElement.getBoundingClientRect()
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] }"""
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11']); pg = br.new_page(viewport={'width': 1280, 'height': 720})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/play.html?snap', wait_until='commit'); pg.wait_for_function('!!(window.game && window.__r3f)', timeout=90000); pg.wait_for_timeout(2000)
    S = lambda js: pg.evaluate(js); W = lambda n: pg.evaluate(WHERE, n); st = lambda: S("window.game.shop.getState()")
    S("localStorage.setItem('bwc.tutorial.done','1'); window.dispatchEvent(new KeyboardEvent('keydown',{key:'4'})); window.game.shop.getState().openShop(true); window.__day.getState().start(); window.game.line.spawn(false)")
    pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=60000)
    w = S("(() => { const f = window.game.line.line.peek(), o = window.game.shop.getState().orders[f.id]; Object.assign(o.want, { size: 'medium', shots: 1, milk: 'steamed', milkType: 'whole', chocolate: false, water: false, topping: 'none' }); return o.want })()")
    pg.wait_for_timeout(1200)
    def drag(a, b, hold=0):
        pg.mouse.move(*a); pg.mouse.down(); pg.wait_for_timeout(120)
        for i in range(1, 13): pg.mouse.move(a[0] + (b[0] - a[0]) * i / 12, a[1] + (b[1] - a[1]) * i / 12); pg.wait_for_timeout(25)
        pg.wait_for_timeout(250 + hold); pg.mouse.up(); pg.wait_for_timeout(700)
    def hold(a, ms):
        pg.mouse.move(*a); pg.mouse.down(); pg.wait_for_timeout(ms); pg.mouse.up(); pg.wait_for_timeout(600)
    drag(W('station:cups-medium'), W('drop:cup')); check(st()['cup'], 'glass on the mat')
    hold(W('hold:machine'), 1300); check(st()['shotGlass'] > 20, f"held the machine: shot glass {st()['shotGlass']:.0f} ml")
    check(not st()['steaming'], 'holding the machine never steams')
    drag(W('station:shotglass'), W('drop:cup')); check(st()['drink']['shots'] >= 1, 'shot poured into the glass')
    hold(W('hold:milk-whole') or W('station:milk-whole'), 2200); check(st()['pitcher']['milk'] > 20, f"jug filled: {st()['pitcher']['milk']:.0f} ml")
    drag(W('station:milk'), W('drop:wand')); check(st()['pitcher']['at'] == 'wand', 'jug placed under the wand')
    hold(W('hold:wand'), 1700); s1 = st(); check(s1['pitcher']['stretch'] > 1.0, f"held the steam knob: stretch {s1['pitcher']['stretch']:.2f}s")
    check(s1['shotGlass'] < 5, 'holding the steam knob never pulls a shot')
    # pick the jug up again from the wand: must be a pick-up, not more steaming
    before = st()['pitcher']['stretch']; a = W('station:milk'); pg.mouse.move(*a); pg.mouse.down(); pg.wait_for_timeout(400)
    check(S("window.game.shop.getState().steaming") is False, 'clicking the jug on the wand picks it up (does not steam)')
    c = W('drop:cup')
    for i in range(1, 13): pg.mouse.move(a[0] + (c[0] - a[0]) * i / 12, a[1] + (c[1] - a[1]) * i / 12); pg.wait_for_timeout(25)
    pg.wait_for_timeout(2600); pg.mouse.up(); pg.wait_for_timeout(1200)
    s2 = st(); check(abs(s2['pitcher']['stretch'] - before) < 0.05 or s2['pitcher']['stretch'] == 0, 'no extra steaming while carrying')
    check(s2['drink']['milk'] != 'none', f"milk poured: {s2['drink']['milk']}")
    drag(W('station:glass'), W('drop:pass')); check(S("window.game.shop.getState().served") >= 1, 'served')
    print(json.dumps(w)); print('\n'.join(notes + fails)); print('errors:', errs[:3])
    br.close()
sys.exit(1 if fails else 0)
