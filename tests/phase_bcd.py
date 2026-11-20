"""Phase B-D check in the real build: cake machine labels / highlight / done-pop, the town view from the street,
the signposts, and the installable-app plumbing (manifest + icons + service worker controlling the page)."""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180'
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11']); pg = br.new_page(viewport={'width': 1280, 'height': 720})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/play.html?snap', wait_until='commit'); pg.wait_for_function('!!(window.__r3f && window.__game && window.__cake)', timeout=90000); pg.wait_for_timeout(2500)
    S = lambda js: pg.evaluate(js)
    # B · cake machine
    S("window.__game.getState().setMode('cake')"); pg.wait_for_timeout(5000)
    labels = S("[...document.querySelectorAll('.headtag.big')].map(e => e.textContent)")
    check(any('pick a tin' in l for l in labels) and any('add toppings' in l for l in labels), f"dispenser labels say what they do ({len(labels)})")
    S("window.__machine.step(1)"); pg.wait_for_timeout(1500)
    check(S("document.querySelectorAll('.headtag.big.here').length") == 1, 'the dispenser over the cake is highlighted')
    S("window.__machine.drop('tin', () => window.__cake.getState().setTin('round'))"); pg.wait_for_timeout(2200)
    check('tin' in (S("(window.__cake.getState().yay || {}).text") or ''), f"done pop after a step: {S('(window.__cake.getState().yay || {}).text')}")
    S("window.__machine.step(1)"); pg.wait_for_timeout(1500)   # roll under the sponge dispenser, then tap twice: the 2nd lands mid-dip
    S("window.__machine.drop('layer', () => window.__cake.getState().addLayer('vanilla'))"); pg.wait_for_timeout(200); S("window.__machine.drop('layer', () => {})")
    check('working' in (S("(window.__cake.getState().why || {}).text") or ''), 'tapping while it works says "still working"')
    pg.screenshot(path='tests/out/bcd-cake.png')
    # C · town from the street + signposts
    S("(() => { const g = window.__game.getState(); g.setMode('fp'); Object.assign(g.player, { x: 50, z: 27 }); window.__view.yaw = -1.57; window.__view.pitch = 0.05 })()"); pg.wait_for_timeout(3500)
    pg.screenshot(path='tests/out/bcd-town-east.png')
    check(S("[...document.querySelectorAll('.areasign')].some(e => getComputedStyle(e).visibility !== 'hidden' && e.textContent.includes('Notebook Row'))"), 'Notebook Row signpost shows near its road')
    # D · installable app (normal page, not snap)
    pg.goto(BASE + '/', wait_until='load'); pg.wait_for_timeout(4000)
    m = S("fetch('./manifest.json').then(r => r.json())")
    check(any(i['sizes'] == '512x512' and i['type'] == 'image/png' for i in m['icons']) and any(i['sizes'] == '192x192' for i in m['icons']), 'manifest has 192 + 512 PNG icons')
    check(m.get('display') == 'standalone', 'standalone display')
    sw = S("navigator.serviceWorker.ready.then(r => !!r.active)")
    check(sw, 'service worker installed and active')
    pg.reload(wait_until='load'); pg.wait_for_timeout(2500)
    check(S("!!navigator.serviceWorker.controller"), 'service worker controls the page after reload')
    check(S("caches.keys()") is not None, 'caches available')
    print('\n'.join(notes + fails)); print('errors:', errs[:3]); br.close()
sys.exit(1 if fails else 0)
