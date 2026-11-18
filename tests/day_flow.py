"""A whole café day through the real (non-capture) flow, checking every new step and collecting page errors.

    python tests/day_flow.py [url]     (default: the dev server, http://localhost:5180/play.html)

Title → menu → Explore → flip the sign OPEN → take an order (E) → make + serve it → back on foot → refill + empty cup
→ closing time → flip the sign CLOSED → results → wind down (wipe, goodnight) → Start day 2 → view switches.
"""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180/play.html'
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
J = lambda pg, js: pg.evaluate(js)
def key(pg, k): pg.keyboard.press(k); pg.wait_for_timeout(250)
def at(pg, x, z): J(pg, f"(() => {{ const p = window.__game.getState().player; p.x = {x}; p.z = {z} }})()"); pg.wait_for_timeout(450)
mode = lambda pg: J(pg, "window.__game.getState().mode")
phase = lambda pg: J(pg, "window.__day.getState().phase")
prompt = lambda pg: J(pg, "document.querySelector('.wd-prompt')?.innerText || ''")

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge'); pg = br.new_page(viewport={'width': 1280, 'height': 760})
    errs = []
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.on('response', lambda r: errs.append(f'404: {r.url}') if r.status >= 400 and 'favicon' not in r.url else None)
    pg.on('console', lambda m: errs.append(f'console: {m.text}') if m.type == 'error' and 'favicon' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.add_init_script("localStorage.clear(); localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1'); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Tester' }))")
    pg.goto(URL); pg.wait_for_function('window.__game && window.__day && window.game', timeout=60000); pg.wait_for_timeout(1500)
    key(pg, 'Space'); pg.wait_for_timeout(800)
    pg.get_by_text('Explore', exact=True).first.click(); pg.wait_for_timeout(2500)
    if J(pg, "!!document.querySelector('.cr-skip')"): pg.click('.cr-skip'); pg.wait_for_timeout(1500)
    check(mode(pg) == 'walk', f'Explore puts you on foot (mode={mode(pg)})')
    check(J(pg, "!!document.querySelector('.viewbar')"), 'the view bar shows on foot')
    # open up
    at(pg, 0, 10.6)
    check('OPEN' in prompt(pg), f'by the door: "{prompt(pg)}"')
    key(pg, 'e'); check(phase(pg) == 'open', f'E flips the sign: the café opens (phase={phase(pg)})')
    check(J(pg, "window.game.line.pool.filter(c => c.phase === 'sit').length") >= 1, 'regulars are seated when you open')
    at(pg, 0, 4)
    # first guest arrives within ~6 s and orders
    pg.wait_for_function("(() => { const f = window.game.line.line.peek(); return f && window.game.shop.getState().orders[f.id] })()", timeout=60000)
    pg.wait_for_timeout(600); check(J(pg, "!!document.querySelector('.takeorder')"), 'a Take order button appears' + ('' if J(pg, "!!document.querySelector('.takeorder')") else ' (prompt: ' + prompt(pg) + ')'))
    gap = J(pg, "window.game.line.spawnEvery"); check(gap >= 5, f'next guest is a real gap away ({gap:.0f} s)')
    key(pg, 'e'); pg.wait_for_timeout(1200)
    o = J(pg, "(() => { const f = window.game.line.line.peek(); return window.game.shop.getState().orders[f.id] })()")
    check(mode(pg) == ('cake' if o.get('cake') else 'pov'), f'E takes the order and goes to the station (mode={mode(pg)})')
    if not o.get('cake'):
        w = o['want']
        J(pg, f"(() => {{ const w = {json.dumps(w)}, s = window.game.shop.getState(); s.takeCup(w.size); if (w.chocolate) s.choc(); for (let i = 0; i < w.shots; i++) s.shot() }})()")
        pg.wait_for_timeout(2600)
        J(pg, f"(() => {{ const w = {json.dumps(w)}, s = window.game.shop.getState(); if (w.water) s.water(); if (w.milk !== 'none') {{ s.pickMilk(w.milkType); s.milk(w.milk) }} if (w.topping !== 'none') s.top(w.topping) }})()")
        pg.wait_for_timeout(900); J(pg, "window.game.shop.getState().serve()")
        check(J(pg, "window.game.shop.getState().last?.pct") == 100, 'the drink scores 100')
        pg.wait_for_timeout(3000)
        check(mode(pg) == 'walk' or J(pg, "!!(window.game.line.line.peek() && window.game.line.line.peek().phase === 'line')"), f'back on your feet after serving (mode={mode(pg)})')
    # refill + empty cup
    r = J(pg, "(() => { const c = window.game.line.pool.find(c => c.phase === 'sit'); if (!c) return null; c.refill = 'ask'; return [c.pos.x, c.pos.z] })()")
    if J(pg, "window.__game.getState().mode") != 'walk': J(pg, "window.__game.getState().setMode('walk')"); pg.wait_for_timeout(800)
    if r:
        at(pg, r[0] + 1.2, r[1]); check('top up' in prompt(pg), f'a refill guest: "{prompt(pg)}"')
        coins = J(pg, "window.game.shop.getState().coins"); key(pg, 'e')
        check(J(pg, "window.game.shop.getState().coins") == coins + 2, 'topping up pays a 2-coin tip')
    J(pg, "window.__dirty.push({ x: -6.2, z: -0.6 })"); pg.wait_for_timeout(300)
    at(pg, -6.2, 0.9); check('cup' in prompt(pg), f'an empty cup: "{prompt(pg)}"')
    key(pg, 'e'); check(J(pg, "window.__dirty.length") == 0, 'clearing the cup removes it')
    # closing time
    J(pg, "window.__day.setState({ left: 0.5 }); window.game.line.reset()"); pg.wait_for_timeout(1500)
    check(phase(pg) == 'closing', f'the clock runs out: closing (phase={phase(pg)})')
    at(pg, 0, 10.6); check('CLOSED' in prompt(pg), f'by the door at closing: "{prompt(pg)}"')
    key(pg, 'e'); pg.wait_for_timeout(600); check(phase(pg) == 'results', f'flipping it CLOSED ends the day (phase={phase(pg)})')
    # wind down
    pg.get_by_text('Wind down').first.click(); pg.wait_for_timeout(1500)
    check(J(pg, "!!document.querySelector('.wind')") and mode(pg) == 'walk', 'Wind down: on foot with the chores card')
    at(pg, -6.2, 1.2); check('wipe' in prompt(pg), f'by a table: "{prompt(pg)}"')
    key(pg, 'e'); pg.wait_for_timeout(2200); check(J(pg, "window.__wind.getState().done.includes('wipe')"), 'the table gets wiped')
    yaw0 = J(pg, "window.__view.yaw"); pg.keyboard.down('e'); pg.wait_for_timeout(700); pg.keyboard.up('e')
    check(abs(J(pg, "window.__view.yaw") - yaw0) < 0.01, 'holding E no longer spins the camera')
    pg.get_by_text('Start Day 2').first.click(); pg.wait_for_timeout(800)
    check(J(pg, "window.__day.getState().day") == 2 and phase(pg) == 'idle', 'Start Day 2 → a new, closed day')
    # views
    for k, m in [('2', 'fp'), ('3', 'dollhouse'), ('1', 'walk')]:
        key(pg, k); pg.wait_for_timeout(1400); check(mode(pg) == m, f'key {k} → {m} (got {mode(pg)})')
    check(not J(pg, "!!document.querySelector('.crash')"), 'no crash card')
    check(not errs, 'no page/console errors' + ('' if not errs else f': {errs[:4]}'))
    pg.screenshot(path='tests/out/day_flow_end.png'); br.close()
print('\n'.join(notes + fails)); print(f'\n{len(notes)} passed, {len(fails)} failed'); sys.exit(1 if fails else 0)
