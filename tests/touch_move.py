"""Phone (touch) on foot: one finger held + dragged walks in the swiped direction; release stops; two fingers turn."""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
fails = []
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge'); ctx = br.new_context(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.goto(BASE + '/play.html?snap', wait_until='commit'); pg.wait_for_function('!!(window.__r3f && window.__game)', timeout=90000); pg.wait_for_timeout(2500)
    S = lambda js: pg.evaluate(js); cdp = ctx.new_cdp_session(pg)
    T = lambda kind, pts: cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
    S("(() => { const g = window.__game.getState(); g.setMode('walk'); Object.assign(g.player, { x: 0, z: 24 }); window.__view.yaw = 0 })()"); pg.wait_for_timeout(2000)
    p0 = S("[window.__game.getState().player.x, window.__game.getState().player.z]")
    T('touchStart', [(422, 250)])
    for i in range(1, 9): T('touchMove', [(422, 250 - i * 12)]); pg.wait_for_timeout(30)   # swipe UP
    pg.wait_for_timeout(1200); p1 = S("[window.__game.getState().player.x, window.__game.getState().player.z]")
    T('touchEnd', []); pg.wait_for_timeout(600); p2 = S("[window.__game.getState().player.x, window.__game.getState().player.z]")
    moved = p0[1] - p1[1]; print('swipe up for 1.2 s: moved', round(moved, 2), 'm away from the camera')
    if moved < 1: fails.append('one-finger drag did not walk forward')
    if abs(p2[1] - p1[1]) > 0.5: fails.append('kept walking after the finger lifted')
    y0 = S("window.__view.yaw"); T('touchStart', [(350, 200), (500, 200)])
    for i in range(1, 9): T('touchMove', [(350 + i * 15, 200), (500 + i * 15, 200)]); pg.wait_for_timeout(30)
    T('touchEnd', []); y1 = S("window.__view.yaw"); print('two-finger drag turned the camera by', round(y1 - y0, 2))
    if abs(y1 - y0) < 0.2: fails.append('two-finger drag did not turn the camera')
    q = S("[window.__game.getState().player.x, window.__game.getState().player.z]")
    if abs(q[1] - p2[1]) > 0.3: fails.append('two fingers moved the player')
    print('FAILS:', fails); br.close()
sys.exit(1 if fails else 0)
