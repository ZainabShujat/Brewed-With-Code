import * as THREE from 'three'

// Procedural surface textures, drawn on a canvas at load time (no image downloads, tiny bundle).
// They're mostly light/neutral so the material colour tints them: one wood texture serves every plank colour.

const cache = new Map<string, THREE.CanvasTexture>()
function make(key: string, w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  let t = cache.get(key)
  if (t) return t
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!, w, h)
  t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  cache.set(key, t)
  return t
}

// deterministic pseudo-random (same texture every load)
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647) }

// Wood: long grain lines with gentle waviness, a few darker growth rings and the odd knot
export const woodTex = () => make('wood', 1024, 256, (x, w, h) => {
  const r = rng(7)
  x.fillStyle = '#f2dcc4'; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 160; i++) {
    const y0 = r() * h, amp = 2 + r() * 6, freq = 0.002 + r() * 0.006, dark = r()
    x.strokeStyle = dark > 0.85 ? 'rgba(90,50,25,.35)' : `rgba(120,70,40,${0.06 + r() * 0.12})`
    x.lineWidth = dark > 0.85 ? 2 + r() * 2 : 0.6 + r() * 1.4
    x.beginPath()
    for (let px = 0; px <= w; px += 8) x.lineTo(px, y0 + Math.sin(px * freq + i) * amp)
    x.stroke()
  }
  for (let k = 0; k < 3; k++) { // knots
    const cx = r() * w, cy = r() * h
    for (let ring = 10; ring > 0; ring--) { x.strokeStyle = `rgba(90,50,25,${0.05 + ring * 0.015})`; x.lineWidth = 1.2; x.beginPath(); x.ellipse(cx, cy, ring * 3.2, ring * 1.4, 0, 0, Math.PI * 2); x.stroke() }
  }
})

// Plaster: soft mottled noise + tiny speckles (walls, the pot building)
export const plasterTex = () => make('plaster', 512, 512, (x, w, h) => {
  const r = rng(11)
  x.fillStyle = '#f4f0ee'; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 900; i++) { const g = 225 + r() * 30; x.fillStyle = `rgba(${g},${g - 4},${g - 6},.18)`; x.beginPath(); x.arc(r() * w, r() * h, 6 + r() * 26, 0, Math.PI * 2); x.fill() }
  for (let i = 0; i < 5000; i++) { x.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.18)'; x.fillRect(r() * w, r() * h, 1, 1) }
})

// Marble: white with soft grey veins that wander across (counter top, table tops)
export const marbleTex = () => make('marble', 1024, 1024, (x, w, h) => {
  const r = rng(23)
  x.fillStyle = '#f7f3f2'; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 400; i++) { const g = 235 + r() * 20; x.fillStyle = `rgba(${g},${g},${g},.2)`; x.beginPath(); x.arc(r() * w, r() * h, 20 + r() * 60, 0, Math.PI * 2); x.fill() }
  for (let v = 0; v < 14; v++) {
    let px = r() * w, py = r() * h, ang = r() * Math.PI * 2
    x.strokeStyle = `rgba(140,128,140,${0.12 + r() * 0.25})`; x.lineWidth = 0.6 + r() * 2.4
    x.beginPath(); x.moveTo(px, py)
    for (let s = 0; s < 120; s++) { ang += (r() - 0.5) * 0.6; px += Math.cos(ang) * 8; py += Math.sin(ang) * 8; x.lineTo(px, py) }
    x.stroke()
  }
})

// Brushed metal: fine horizontal streaks (espresso machine steel, jugs)
export const brushedTex = () => make('brushed', 512, 512, (x, w, h) => {
  const r = rng(5)
  x.fillStyle = '#d8d8dc'; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 1400; i++) { const g = 190 + r() * 60; x.strokeStyle = `rgba(${g},${g},${g + 4},.35)`; x.lineWidth = 1; x.beginPath(); const y = r() * h; x.moveTo(r() * w * 0.3, y); x.lineTo(w * (0.6 + r() * 0.4), y + (r() - 0.5) * 2); x.stroke() }
})
