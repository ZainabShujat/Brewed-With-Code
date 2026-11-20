"""RAM optimisation (21 Nov): shrink model textures to what they need on screen. Small props are a few dozen pixels
tall in the game, so 1024px maps were ~95% wasted GPU memory. Originals stay in git history.
    python tests/shrink_textures.py [--dry]"""
import sys, glob, os
from PIL import Image
DRY = '--dry' in sys.argv
TINY = ('carrot_cake', 'croissant', 'strawberry_chocolate_cake')       # pastries in the display case
KEEP = ('espresso\\textures\\willoughsby-espresso-material_baseColor',)  # the machine you work at, seen up close
DETAIL = ('_nor', 'normal', '_arm', 'metallicRoughness', '_rough', 'Roughness', '_ao', 'occlusion')
before = after = 0
for f in glob.glob('public/assets/**/*.*', recursive=True):
    if not f.lower().endswith(('.png', '.jpg', '.jpeg')) or 'foodkit' in f: continue
    im = Image.open(f); w, h = im.size
    detail = any(k in f for k in DETAIL)
    target = 1024 if any(k in f for k in KEEP) else (128 if detail else 256) if any(k in f for k in TINY) else (256 if detail else 512)
    before += w * h * 4 * 1.33
    if max(w, h) <= target: after += w * h * 4 * 1.33; continue
    k = target / max(w, h); nw, nh = max(1, round(w * k)), max(1, round(h * k)); after += nw * nh * 4 * 1.33
    if DRY: continue
    out = im.resize((nw, nh), Image.LANCZOS)
    if f.lower().endswith(('.jpg', '.jpeg')): out.convert('RGB').save(f, quality=88)
    else: out.save(f, optimize=True)
print(f"decoded texture memory: {before / 2**20:.0f} MB -> {after / 2**20:.0f} MB {'(dry run)' if DRY else ''}")
