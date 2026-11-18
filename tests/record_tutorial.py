"""Screen-record Kozie's tutorial being played with the real mouse (press, drag, hold), start to finish.

    python tests/record_tutorial.py [url]     (default: the dev server, http://localhost:5180/play.html?snap&tutorial)

Writes tests/out/tutorial.webm (Playwright's own recorder). Every action is a real pointer event on the canvas:
the script only asks the scene WHERE each tool is on screen (projecting its world position through the camera).
"""
import sys, os, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5180/play.html?snap&tutorial'
OUT = os.path.join(os.path.dirname(__file__), 'out'); os.makedirs(OUT, exist_ok=True)
W, H = 1280, 720

# screen position of a station's hit box (station:<id> for things you pick up, hold:<id> for things you hold)
WHERE = """(name) => {
  const st = window.__r3f; const scene = st.scene, cam = st.camera, el = st.gl.domElement
  let o = null; scene.traverse((m) => { if (!o && m.name === name) o = m })
  if (!o) return null
  const v = new o.position.constructor(); o.getWorldPosition(v); v.project(cam)
  const r = el.getBoundingClientRect()
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]
}"""

def where(pg, name):
    for _ in range(40):
        p = pg.evaluate(WHERE, name)
        if p: return p
        pg.wait_for_timeout(250)
    raise SystemExit(f'cannot find {name} on screen')

def glide(pg, frm, to, steps=28, ms=650):
    for i in range(1, steps + 1):
        k = i / steps; k = k * k * (3 - 2 * k)
        pg.mouse.move(frm[0] + (to[0] - frm[0]) * k, frm[1] + (to[1] - frm[1]) * k)
        pg.wait_for_timeout(ms / steps)

cur = [W / 2, H / 2]
def go(pg, p, ms=600):
    glide(pg, cur, p, ms=ms); cur[0], cur[1] = p

def drag(pg, frm, to, hold_ms=0, until=None):
    """press on a tool, drag it to the target, (keep holding for a pour), let go"""
    go(pg, where(pg, frm)); pg.wait_for_timeout(250)
    pg.mouse.down(); pg.wait_for_timeout(120)
    dst = where(pg, to) if to.startswith(('station:', 'hold:', 'drop:')) else TARGETS[to](pg)
    go(pg, dst, ms=900)
    t = time.time()
    while hold_ms and (time.time() - t) * 1000 < hold_ms and not (until and pg.evaluate(until)): pg.wait_for_timeout(50)
    pg.wait_for_timeout(150); pg.mouse.up(); pg.wait_for_timeout(700)

def hold(pg, name, until_js, max_ms=9000):
    """press and hold on something until the game says stop"""
    go(pg, where(pg, name)); pg.wait_for_timeout(250)
    pg.mouse.down(); t = time.time()
    while (time.time() - t) * 1000 < max_ms and not pg.evaluate(until_js): pg.wait_for_timeout(40)
    pg.mouse.up(); pg.wait_for_timeout(900)

def step(pg): return pg.evaluate("window.__tutStep && window.__tutStep()")

TARGETS = {
    'cup': lambda pg: where(pg, 'station:glass') if pg.evaluate("window.game.shop.getState().cup") else where(pg, 'drop:cup'),
}

def wait_step(pg, want, ms=60000):
    t = time.time()
    while (time.time() - t) * 1000 < ms:
        if step(pg) == want: return
        pg.wait_for_timeout(200)
    raise SystemExit(f'step never became {want} (is {step(pg)}) ' + pg.evaluate("JSON.stringify((({ ml, drink, pitcher, pouringMilk, hint }) => ({ ml, drink, pitcher, pouringMilk, hint }))(window.game.shop.getState()))"))

def lesson(pg):
    wait_step(pg, 'glass'); pg.wait_for_timeout(2200)          # read Kozie's line
    size = pg.evaluate("(() => { const f = window.game.line.line.peek(); return window.game.shop.getState().orders[f.id].want.size })()")
    drag(pg, f'station:cups-{size}', 'cup'); pg.wait_for_timeout(1600)
    wait_step(pg, 'pull'); pg.wait_for_timeout(600)
    # let go on the gold line: the shot glass holds one shot (30 ml)
    hold(pg, 'hold:machine', "window.game.shop.getState().shotGlass >= 29"); pg.wait_for_timeout(1200)
    drag(pg, 'station:shotglass', 'cup'); pg.wait_for_timeout(2400)
    if step(pg) == 'fillPitcher':
        hold(pg, 'hold:milk-whole', "(() => { const p = window.game.shop.getState().pitcher; return p.milk + p.foam >= 340 })()"); pg.wait_for_timeout(800)
        drag(pg, 'station:milk', 'drop:wand'); pg.wait_for_timeout(1000)
        hold(pg, 'hold:wand', "window.game.shop.getState().pitcher.stretch >= 1.5"); pg.wait_for_timeout(1000)
        drag(pg, 'station:milk', 'cup', hold_ms=12000, until="!window.game.shop.getState().pouringMilk && window.game.shop.getState().ml.milk > 50")  # pour while held; the brim stops it
        go(pg, [W * 0.5, H * 0.45]); pg.wait_for_timeout(1500)
    wait_step(pg, 'serve'); pg.wait_for_timeout(1800)
    drag(pg, 'station:glass', 'drop:pass'); pg.wait_for_timeout(3500)

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge')
    ctx = br.new_context(viewport={'width': W, 'height': H}, record_video_dir=OUT, record_video_size={'width': W, 'height': H})
    pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_function('window.game && window.__day && window.__r3f', timeout=60000)
    pg.wait_for_timeout(1500)
    # what 'Open the café' does, then the barista view
    pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }))")
    pg.evaluate("window.game.shop.getState().openShop(true); window.__day.getState().start(); window.game.shop.getState().trash(); window.game.line.spawn(false)")
    pg.mouse.move(*cur)
    lesson(pg)                                               # 1: small espresso
    pg.evaluate("window.game.line.spawn(false)")
    lesson(pg)                                               # 2: medium latte
    pg.wait_for_timeout(4500)                                # Kozie's goodbye
    video = pg.video.path(); ctx.close(); br.close()
    dst = os.path.join(OUT, 'tutorial.webm')
    if os.path.exists(dst): os.remove(dst)
    os.replace(video, dst)
    print('recorded', dst, '· page errors:', errs[:3] or 'none')
