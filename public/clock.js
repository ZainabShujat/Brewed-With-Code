/* Shared by index.html and reel.html. Load BEFORE gsap.
   ?render=1 -> frame-stepped export mode: a virtual clock that only moves when
   the exporter (export.py) calls __advance(ms), so every frame is exact. */
const RENDER = new URLSearchParams(location.search).get('render') === '1';
if (RENDER) {
  const realTimeout = window.setTimeout.bind(window);
  window.__realTimeout = realTimeout;
  let vt = 0, tid = 1, timers = [], rafs = [];
  performance.now = () => vt;
  Date.now = () => 1.7e12 + vt;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.push({ id, at: vt + ms, fn, a }); return id; };
  window.setInterval = (fn, ms) => { const id = tid++; timers.push({ id, at: vt + ms, fn, a: [], every: ms }); return id; };
  window.clearTimeout = window.clearInterval = id => { timers = timers.filter(t => t.id !== id); };
  window.requestAnimationFrame = fn => { const id = tid++; rafs.push({ id, fn }); return id; };
  window.cancelAnimationFrame = id => { rafs = rafs.filter(r => r.id !== id); };
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  window.__advance = async ms => {
    const target = vt + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > target) break;
      vt = t.at;
      if (t.every) t.at += t.every; else timers.shift();
      t.fn(...t.a);
      await flush();
    }
    vt = target;
    const r = rafs; rafs = [];
    r.forEach(x => x.fn(vt));
    await flush();
    if (window.__syncVideo) await window.__syncVideo();
    return window.__endAt != null && vt >= window.__endAt;
  };
}
