import json, os, sys, urllib.request
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
UA = {'User-Agent': 'cafe-game-dev'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
models = sys.argv[1].split(',')
tot = 0
for m in models:
    f = json.loads(get(f'https://api.polyhaven.com/files/{m}'))
    g = f['gltf']['1k']['gltf']
    d = os.path.join(OUT, m); os.makedirs(d, exist_ok=True)
    items = [('model.gltf', g['url'])] + [(k, v['url']) for k, v in g.get('include', {}).items()]
    for rel, u in items:
        p = os.path.join(d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        b = get(u); tot += len(b); open(p, 'wb').write(b)
    # the gltf references its own filename for nothing else; includes keep their relative paths
    print(m, 'ok', flush=True)
print('MB', round(tot / 1e6, 1))
