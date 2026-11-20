"""Capture the How to play pictures from the real game (clean: no HUD) → public/howto/*.jpg

    python tests/capture_howto.py [url]   (default: dev server ?snap)
"""
import sys, os, io
from playwright.sync_api import sync_playwright
from PIL import Image

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180/play.html?snap'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'howto'); os.makedirs(OUT, exist_ok=True)
HIDE = '.hud,.modes,.clockchip,.musicbtn,.lookhint,.lookchip,.fps,.viewbar,.fullscreenbtn,.menubtn,.dayclock,.dayopen,.coins,.takeorder,.wd-prompt,.creditsbtn,.ticket,.brew-next,.tut,.navtut,.cake-card,.navstop,.recipe{display:none!important}'

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge'); pg = br.new_page(viewport={'width': 1280, 'height': 720}); pg.set_default_timeout(120000)
    pg.goto(URL); pg.wait_for_function('!!window.__game && !!window.game', timeout=90000); pg.wait_for_timeout(2500)
    pg.add_style_tag(content=HIDE)
    E = lambda js: pg.evaluate(js)
    def snap(name, wait=2500, w=960):
        pg.wait_for_timeout(wait); im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB'); im = im.resize((w, int(w * im.height / im.width)))
        im.save(os.path.join(OUT, f'{name}.jpg'), quality=80); print(name)
    E("window.__clock.set(11.5); window.__day.setState({ phase: 'open' }); window.game.shop.getState().openShop(true); window.game.line.seed(6); window.game.line.fill(2)")
    E("window.__game.getState().setMode('dollhouse')"); pg.wait_for_timeout(300); E("window.__view.zoom = .75; window.__view.panZ = 1"); snap('cafe', 3500)
    E("window.__game.getState().setMode('pov')"); pg.wait_for_timeout(1500)
    E("(() => { const s = window.game.shop.getState(), f = window.game.line.line.peek(), w = s.orders[f.id].want; s.takeCup(w.size); s.shot() })()"); snap('coffee', 3200)
    E("(() => { const k = window.__kitchen; k.getState().tip(); k.getState().choose('vanilla'); for (const p of ['flour','flour','sugar','sugar','eggs']) { k.setState({ pour: null }); k.getState().add(p) } k.setState({ pour: null }) })()")
    E("window.__game.getState().setMode('kitchen')"); snap('kitchen', 3500)
    E("window.__kitchen.setState({ batter: { vanilla: 6, chocolate: 6, strawberry: 6 } })")
    E("window.__game.getState().setMode('cake')"); pg.wait_for_timeout(1500)
    E("(() => { const c = window.__cake.getState(); c.reset(); c.setTin('heart'); c.addLayer('strawberry'); c.addFilling('jam'); window.__cake.getState().addLayer('strawberry') })()"); snap('cake', 3000)
    E("window.__game.getState().setMode('exterior')"); snap('town', 3000)
    E("window.__game.getState().setMode('walk'); (() => { const p = window.__game.getState().player; p.x = 1.5; p.z = 4 })()"); pg.wait_for_timeout(400); E("window.__view.yaw = .5"); snap('view-explore', 2500, 480)
    E("window.__game.getState().setMode('fp')"); pg.wait_for_timeout(400); E("window.__view.yaw = .5; window.__view.pitch = .05"); snap('view-fp', 2500, 480)
    E("window.__game.getState().setMode('dollhouse')"); pg.wait_for_timeout(300); E("window.__view.zoom = .9"); snap('view-dollhouse', 3000, 480)
    E("window.__clock.set(21.6); window.__game.getState().setMode('exterior')"); pg.wait_for_timeout(300); E("window.__view.zoom = 1.0; window.__view.yaw = .35"); snap('night', 6000)
    # Today's Menu (a normal page: the menu UI isn't drawn in ?snap)
    mp = br.new_page(viewport={'width': 1280, 'height': 720}); base = URL.split('/play.html')[0]
    mp.goto(base + '/play.html'); mp.wait_for_function('!!window.__menu && !!window.__day', timeout=120000)
    mp.evaluate("localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({kind:'kozie',name:'Kozie',made:true,model:0,colour:0})); localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1'); sessionStorage.setItem('bwc.boot','continue')")
    mp.reload(); mp.wait_for_function('!!window.__menu && !!window.__day', timeout=120000); mp.wait_for_timeout(9000)
    mp.add_style_tag(content=HIDE)
    mp.evaluate("window.__day.setState({ day: 8 }); window.__menu.getState().setIds(['espresso','latte','cappuccino','mocha','cake-chocolate','cake-strawberry']); window.__menu.getState().ask(() => {})")
    mp.wait_for_timeout(1500); im = Image.open(io.BytesIO(mp.screenshot())).convert('RGB'); im = im.resize((960, 540)); im.save(os.path.join(OUT, 'menu.jpg'), quality=80); print('menu')
    br.close()
