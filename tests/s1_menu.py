"""S1: title menu + save slots in a real browser, desktop (800x774) and phone (844x390 touch).
Serves dist-s1 itself.   python tests/s1_menu.py [outdir]"""
import sys, subprocess, shutil, time, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'tests/out'
PORT = 5203; BASE = f'http://localhost:{PORT}'
srv = subprocess.Popen([shutil.which('npx'), 'vite', 'preview', '--outDir', 'dist-s1', '--port', str(PORT), '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import urllib.request
for _ in range(90):  # wait until the server really answers (a fixed sleep was flaky on a busy machine)
    try: urllib.request.urlopen(BASE + '/play.html'); break
    except Exception: time.sleep(1)
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)
OLD = {'brewed-with-code-save-v1': json.dumps({'day': 7, 'bank': 412, 'best': 90, 'unlocks': [], 'stars': 21}),
       'brewed-with-code-avatar-v1': json.dumps({'kind': 'notebook', 'name': 'Zee', 'made': True, 'model': 0, 'colour': 0}),
       'bwc.tutorial.done': '1', 'bwc.navtut.done': '1'}
FITS = """() => { const vw = innerWidth, vh = innerHeight, bad = []
  document.querySelectorAll('.gmenu button, .gmenu .slot').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && (r.top < 0 || r.bottom > vh + 1 || r.left < 0 || r.right > vw + 1)) bad.push((b.innerText || '').slice(0, 20) + ' ' + Math.round(r.bottom)) })
  const p = document.querySelector('.gmenu .panel'); if (p && p.scrollHeight > p.clientHeight + 1 && getComputedStyle(p).overflowY !== 'visible') bad.push('panel scrolls')
  if (document.scrollingElement.scrollHeight > vh + 1) bad.push('page scrolls'); return bad }"""
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(channel='msedge', args=['--use-angle=d3d11'])
    for dev, opts in [('desktop', dict(viewport={'width': 800, 'height': 774})), ('phone', dict(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        ctx = br.new_context(**opts); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        S = lambda js: pg.evaluate(js)
        def boot(wait=9000): pg.wait_for_function('!!window.__saves', timeout=60000); pg.wait_for_timeout(wait)
        def menu():
            if pg.query_selector('.title-screen'): pg.click('.title-screen'); pg.wait_for_timeout(600)
        def fits(name):
            bad = S(FITS); check(not bad, f'{dev}: {name} fits with no scrolling {bad or ""}'); pg.screenshot(path=f'{OUT}/s1-{dev}-{name}.png')
        # 1. brand-new player
        pg.goto(BASE + '/play.html'); boot(2000); S('localStorage.clear(); sessionStorage.clear()'); pg.reload(); boot(); menu()
        check(not pg.query_selector('[data-act=continue]'), f'{dev}: fresh player sees no Continue')
        for a in ('new', 'load', 'howto', 'settings'): check(bool(pg.query_selector(f'[data-act={a}]')), f'{dev}: menu has {a}')
        fits('menu-fresh')
        pg.click('[data-act=settings]'); pg.wait_for_timeout(300); check(bool(pg.query_selector('text=Mouse sensitivity')), f'{dev}: Settings opens'); pg.click('text=Back'); pg.wait_for_timeout(300)
        pg.click('[data-act=howto]'); pg.wait_for_timeout(500); check('HOW TO PLAY' in S('document.body.innerText').upper(), f'{dev}: How to Play opens')
        pg.reload(); boot(); menu()
        # 2. New Game -> slot 2 -> Zen -> straight on to how to play / creator
        pg.click('[data-act=new]'); pg.wait_for_timeout(400); fits('newgame-slots')
        pg.click('.slot[data-slot="2"]'); pg.wait_for_timeout(300); fits('newgame-mode')
        pg.click('[data-mode=zen]'); boot(6000)
        ix = S("window.__saves.listSlots()"); check(ix['active'] == 2 and ix['slots']['2']['mode'] == 'zen', f'{dev}: new Zen game in slot 2')
        check(not pg.query_selector('.title-screen'), f'{dev}: after New Game it goes straight on (no title again)')
        pg.screenshot(path=f'{OUT}/s1-{dev}-after-new.png')
        # 3. a legacy single save (as players have today) -> slot 1, mode unassigned
        S('localStorage.clear(); sessionStorage.clear()'); S(f"Object.entries({json.dumps(OLD)}).forEach(([k,v])=>localStorage.setItem(k,v))"); pg.reload(); boot(); menu()
        c = pg.inner_text('[data-act=continue]'); check('Mode not set' in c and 'Day 7' in c and 'Zee' in c, f'{dev}: Continue shows the legacy save, mode unassigned: {c!r}')
        check(S("window.__saves.listSlots().slots[1].mode") is None, f'{dev}: legacy mode stays null')
        fits('menu-legacy')
        pg.click('[data-act=new]'); pg.wait_for_timeout(300); pg.click('.slot[data-slot="3"]'); pg.wait_for_timeout(300); pg.click('[data-mode=story]'); boot(6000)
        pg.reload(); boot(); menu()
        c = pg.inner_text('[data-act=continue]'); check('Story' in c, f'{dev}: Continue = most recently played (Story slot 3): {c!r}')
        pg.click('[data-act=load]'); pg.wait_for_timeout(400); fits('load')
        t = pg.inner_text('.slots'); check('Mode not set' in t and 'Story' in t and 'empty' in t and 'started' in t and 'played' in t, f'{dev}: Load lists all 3 slots with mode, progress and dates')
        # 4. delete + replace need confirmation; Cancel keeps it
        pg.click('.slot[data-slot="1"] >> text=Delete…'); pg.wait_for_timeout(300); check(bool(pg.query_selector('.slot-confirm')), f'{dev}: Delete asks first'); fits('delete-confirm')
        pg.click('.slot-confirm >> text=Cancel'); pg.wait_for_timeout(300); check(S("!!window.__saves.listSlots().slots[1]"), f'{dev}: Cancel keeps the slot')
        pg.click('text=← Back'); pg.wait_for_timeout(300)
        pg.click('[data-act=new]'); pg.wait_for_timeout(300); pg.click('.slot[data-slot="1"] >> text=Replace…'); pg.wait_for_timeout(300)
        check(bool(pg.query_selector('.slot-confirm')), f'{dev}: Replace asks first'); pg.click('.slot-confirm >> text=Cancel'); pg.wait_for_timeout(200)
        check(S("window.__saves.summary(1).day") == 7, f'{dev}: Replace cancelled: slot 1 intact'); pg.click('text=← Back'); pg.wait_for_timeout(300)
        # 5. Load slot 1 (legacy) -> plays day 7
        pg.click('[data-act=load]'); pg.wait_for_timeout(300); pg.click('.slot[data-slot="1"] >> text=Load'); boot(6000)
        check(S("window.__saves.listSlots().active") == 1 and S("window.__day.getState().day") == 7, f'{dev}: Load slot 1 -> day 7 in game')
        check(not pg.query_selector('.title-screen'), f'{dev}: Load goes straight into the cafe')
        # 6. delayed write: the old game's late save fires AFTER the switch -> must be dropped
        S("window.__day.setState({bank: 999}); window.__day.getState().save(); window.__saves.commitActive()")
        S("window.__saves.switchTo(3); localStorage.setItem('brewed-with-code-save-v1', JSON.stringify({day: 7, bank: 999})); localStorage.setItem('brewed-with-code-pantry-v1', '{\"LEAK\":1}')")
        check(S("localStorage.getItem('brewed-with-code-pantry-v1')") is None and '999' not in (S("localStorage.getItem('brewed-with-code-save-v1')") or ''), f'{dev}: late writes after a switch are dropped')
        S("localStorage.setItem('brewed-with-code-music-v1','{\"volume\":0.5}')"); check(S("localStorage.getItem('brewed-with-code-music-v1')") is not None, f'{dev}: settings still save during the lock')
        pg.reload(); boot(4000)
        check(S("window.__day.getState().bank") != 999 and S("window.__saves.listSlots().active") == 3, f'{dev}: slot 3 untouched by slot 1 late save')
        check(S("window.__saves.summary(1).bank") == 999, f'{dev}: slot 1 kept its own last save (999)')
        # 7. rapid switching with reloads
        for n in (1, 3, 1, 3, 1):
            S(f"window.__saves.switchTo({n})"); pg.reload(); pg.wait_for_function('!!window.__saves', timeout=60000); pg.wait_for_timeout(1500)
        check(S("window.__saves.summary(1).day") == 7 and S("window.__saves.summary(3).day") == 1 and S("window.__day.getState().day") == 7, f'{dev}: rapid switching 1<->3 x5 keeps each slot progress')
        check(bool(S("localStorage.getItem('bwc.backup.legacy')")), f'{dev}: the legacy backup is still there')
        check(not errs, f'{dev}: no page errors {errs[:2]}')
        ctx.close()
    br.close()
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(srv.pid)], capture_output=True)
print('\n'.join(notes + fails)); print(f'{len(notes)} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
