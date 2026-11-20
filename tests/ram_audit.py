"""RAM audit (run with every stage): the whole browser's memory, the JS heap and the GPU resources, at the same scenes.

    python tests/ram_audit.py label=dir:port [label=dir:port ...]
e.g. python tests/ram_audit.py main=../bwc-base/dist-base:5211 s1=dist-s1:5212

Browser memory = summed private bytes of every msedge process launched for this run (found by its own profile folder),
so it counts the GPU and renderer processes too: that's the number Task Manager shows a player.
"""
import sys, os, json, subprocess, shutil, tempfile, time, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

def edge_mb(profile):
    ps = ("$p = Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -like '*" + os.path.basename(profile) + "*' };"
          " ($p | ForEach-Object { (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue).PrivateMemorySize64 } | Measure-Object -Sum).Sum")
    out = subprocess.run(['powershell', '-NoProfile', '-Command', ps], capture_output=True, text=True).stdout.strip()
    return round(int(out or 0) / 2**20)

SCENES = [
    ('menu', None),
    ('explore', "window.__game.getState().setMode('walk')"),
    ('dollhouse', "window.__game.getState().setMode('dollhouse')"),
    ('bar', "window.__game.getState().setMode('pov')"),
    ('cake', "window.__game.getState().setMode('cake')"),
]
GPU = """(() => { const st = window.__r3f; if (!st) return {}; const i = st.gl.info; let tex = 0, texBytes = 0; const seen = new Set()
  st.scene.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of ms) for (const k in m) { const t = m[k]; if (t && t.isTexture && !seen.has(t)) { seen.add(t); tex++; const im = t.image; if (im && im.width) texBytes += im.width * im.height * 4 * 1.33 } } })
  return { geometries: i.memory.geometries, textures: i.memory.textures, sceneTextures: tex, textureMB: Math.round(texBytes / 2**20), calls: i.render.calls, tris: i.render.triangles } })()"""

def serve(d, port):
    p = subprocess.Popen([shutil.which('npx'), 'vite', 'preview', '--outDir', d, '--port', str(port), '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try: urllib.request.urlopen(f'http://localhost:{port}/play.html'); return p
        except Exception: time.sleep(1)
    raise SystemExit(f'server for {d} never came up')

results = {}
for arg in sys.argv[1:]:
    label, rest = arg.split('=', 1); d, port = rest.rsplit(':', 1)
    srv = serve(d, int(port)); prof = tempfile.mkdtemp(prefix=f'ram-{label}-')
    try:
        with sync_playwright() as pw:
            for dev, opts in [('desktop', dict(viewport={'width': 1280, 'height': 720})), ('phone', dict(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
                ctx = pw.chromium.launch_persistent_context(prof + '-' + dev, channel='msedge', args=['--use-angle=d3d11', '--enable-precise-memory-info'], **opts)
                pg = ctx.pages[0] if ctx.pages else ctx.new_page(); cdp = ctx.new_cdp_session(pg); cdp.send('Performance.enable')
                pg.goto(f'http://localhost:{port}/play.html'); pg.wait_for_function('!!(window.__game && window.__r3f)', timeout=120000)
                pg.evaluate("localStorage.setItem('bwc.tutorial.done','1'); localStorage.setItem('bwc.navtut.done','1')")
                pg.wait_for_timeout(8000)
                for name, js in SCENES:
                    if js: pg.evaluate(js)
                    pg.wait_for_timeout(6000)
                    cdp.send('HeapProfiler.collectGarbage'); pg.wait_for_timeout(500)
                    m = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
                    row = {'browserMB': edge_mb(prof + '-' + dev), 'jsHeapMB': round(m.get('JSHeapUsedSize', 0) / 2**20), **pg.evaluate(GPU)}
                    results.setdefault(label, {}).setdefault(dev, {})[name] = row
                    print(label, dev, name, json.dumps(row), flush=True)
                ctx.close()
    finally:
        subprocess.run(['taskkill', '/F', '/T', '/PID', str(srv.pid)], capture_output=True)
os.makedirs('tests/out', exist_ok=True)
json.dump(results, open('tests/out/ram_audit.json', 'w'), indent=1)
labels = list(results)
print('\nscene      ' + ''.join(f'{l+" "+d:>22}' for l in labels for d in ('desktop', 'phone')))
for name, _ in SCENES:
    print(f'{name:<10} ' + ''.join(f'{str(results[l][d][name]["browserMB"])+" MB / heap "+str(results[l][d][name]["jsHeapMB"]):>22}' for l in labels for d in ('desktop', 'phone')))
