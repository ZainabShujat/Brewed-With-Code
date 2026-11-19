"""Renders the Open Graph share image (public/og.png, 1200×630): a clean world shot (no UI) + the title.

    python scripts/og_image.py [eye_x eye_y eye_z look_x look_y look_z]   (dev server on :5180)
"""
import sys, os, base64, io
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = 1.2
EYE, LOOK = (14, 20, 66), (-10, 2, 22)
if len(sys.argv) == 7: v = [float(a) for a in sys.argv[1:]]; EYE, LOOK = v[:3], v[3:]
INIT = "localStorage.clear(); localStorage.setItem('brewed-with-code-avatar-v1', JSON.stringify({ made: true, kind: 'kozie', name: 'Kozie' })); localStorage.setItem('brewed-with-code-clock-v1', JSON.stringify({ real: false, hour: 16 })); localStorage.setItem('bwc.tutorial.done', '1')"
JS = """([e, t]) => { const s = window.__r3f; const cam = s.camera.clone(); cam.fov = 42; cam.near = 0.5; cam.far = 2000;
  cam.aspect = s.gl.domElement.width / s.gl.domElement.height; cam.position.set(...e); cam.lookAt(...t); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  s.gl.render(s.scene, cam); return s.gl.domElement.toDataURL('image/png') }"""

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', args=['--use-angle=d3d11', '--enable-gpu'])
    pg = br.new_page(viewport={'width': 1800, 'height': 945}); pg.add_init_script(INIT)
    pg.goto('http://localhost:5180/play.html'); pg.wait_for_function('!!window.__game && !!window.__r3f', timeout=60000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(800)
    try: pg.get_by_text('▶ Play', exact=True).first.click(timeout=4000)
    except Exception: pass
    pg.wait_for_timeout(1500)
    pg.evaluate("window.__navtut && window.__navtut.getState().skip && window.__navtut.getState().skip()")
    pg.evaluate("window.__game.getState().setMode('exterior')"); pg.wait_for_timeout(7000)
    url = pg.evaluate(JS, [[c * W for c in EYE], [c * W for c in LOOK]])
    br.close()

img = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB').resize((1200, 630), Image.LANCZOS)
# a soft dark wash at the bottom-left so the title reads on any background
wash = Image.new('L', (1200, 630), 0); d = ImageDraw.Draw(wash); d.rounded_rectangle((-80, 400, 820, 720), 120, fill=185); wash = wash.filter(ImageFilter.GaussianBlur(70))
img = Image.composite(Image.new('RGB', img.size, (43, 29, 51)), img, wash)
F = lambda name, size: ImageFont.truetype(os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', name), size)
d = ImageDraw.Draw(img)
d.text((56, 448), 'Brewed With Code', font=F('seguibl.ttf', 76), fill=(255, 246, 238), stroke_width=2, stroke_fill=(94, 42, 117))
d.text((60, 540), 'A cozy café game you play in your browser', font=F('segoeuib.ttf', 32), fill=(252, 220, 232))
# the launch pill (same wording as the reels)
pill = 'PLAYABLE 1 DEC'; pf = F('seguibl.ttf', 26); tw = d.textlength(pill, font=pf)
d.rounded_rectangle((60, 392, 60 + tw + 40, 434), 21, fill=(255, 143, 181)); d.text((80, 396), pill, font=pf, fill=(43, 29, 51))
out = os.path.join(ROOT, 'public', 'og.jpg'); img.save(out, quality=86, optimize=True, progressive=True)
print('saved', out, os.path.getsize(out) // 1024, 'KB')
