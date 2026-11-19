import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { STREET as S } from './streetLayout'
import { rng } from './folk/specs'

// The ground, as ONE designed surface instead of overlapping green sheets.
//
// Why: the old ground was two big planes 2 cm apart (the market lawn and the township lawn under it). From the
// Dollhouse / Outside cameras the depth buffer can't tell them apart, so they fought and drew diagonal moiré bands
// across the grass. Now there is a single terrain mesh, nothing under it, and the camera's near plane follows its
// height (more depth precision when you're high up).
//
// The look: a low-res "zone" painting (which ground is where: warm Marshmallow Hollow grass to the west, cooler
// Notebook Row grass to the east, the general town lawn, a darker forest floor with soil and leaf litter, a soft
// irregular edge between them) multiplied by a small seamless detail texture repeated every few metres (grain and
// blades when you're close). The painting is never repeated, so there is no visible tiling; the detail is
// low-contrast, so nothing is noisy from far away. One material, one draw call.
export const TERRAIN = { w: 480, d: 260 }
const PX = 4 // painting pixels per metre (0.25 m each; the detail texture carries the fine grain)

/** where the forest floor starts behind the back wall: it wanders (never a straight line) */
export const forestEdge = (x: number) => Math.min(S.BACK - 1, S.BACK - 4.5 - 2.2 * Math.sin(x * 0.09 + 1) - 1.6 * Math.sin(x * 0.23 + 4) - 1.2 * Math.sin(x * 0.51))

const GRASS = { town: '#93be6d', west: '#a2c266', east: '#86b97f', park: '#8ec46b', forest: '#6b8a4a', soil: '#8b7352' }

function paintZones() {
  const W = TERRAIN.w * PX, H = TERRAIN.d * PX, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(4242)
  const X = (x: number) => (x + TERRAIN.w / 2) * PX, Z = (z: number) => (z + TERRAIN.d / 2) * PX
  const blob = (x: number, z: number, rad: number, col: string) => { const cx = X(x), cz = Z(z), rr = rad * PX, gr = g.createRadialGradient(cx, cz, 0, cx, cz, rr); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - rr, cz - rr, rr * 2, rr * 2) }
  const band = (x0: number, x1: number, col: string, fade: number) => { // a zone running the full depth, fading in over `fade` m
    const gr = g.createLinearGradient(X(x0), 0, X(x1), 0), f = fade / (x1 - x0)
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(Math.min(0.5, f), col); gr.addColorStop(Math.max(0.5, 1 - f), col); gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr; g.fillRect(X(x0), 0, X(x1) - X(x0), H)
  }
  g.fillStyle = GRASS.town; g.fillRect(0, 0, W, H)
  // the two townships: the same grass, warmer to the west (marshmallows), cooler to the east (notebooks)
  band(-TERRAIN.w / 2 - 20, -(S.X + 16), GRASS.west, 14)
  band(S.X + 16, TERRAIN.w / 2 + 20, GRASS.east, 14)
  // soft sun and shade everywhere (8-26 m wide, low contrast)
  for (let i = 0; i < 520; i++) blob(-240 + r() * 480, -130 + r() * 260, 8 + r() * 18, r() < 0.55 ? 'rgba(170,204,118,.26)' : 'rgba(104,150,84,.24)')
  // shade under the tree belts between the outer roads and the townships
  for (const side of [-1, 1]) for (let z = -72; z < 82; z += 4) blob(side * (S.X + 25 + (r() - 0.5) * 4), z, 5 + r() * 3, 'rgba(84,122,64,.35)')
  // ── the forest floor: darker, with soil, moss and leaf litter; its edge wanders instead of following the wall ──
  const edge = forestEdge
  g.fillStyle = GRASS.forest; g.beginPath(); g.moveTo(X(-140), Z(-140))
  for (let x = -140; x <= 140; x += 2) g.lineTo(X(x), Z(edge(x)))
  g.lineTo(X(140), Z(-140)); g.closePath(); g.save(); g.filter = 'blur(10px)'; g.fill(); g.restore()
  for (let i = 0; i < 260; i++) { const x = -130 + r() * 260, z = Math.min(S.BACK - 2, edge(x) + 2 - r() * 4); blob(x, z, 2 + r() * 4, 'rgba(107,138,74,.55)') } // ragged, feathered edge
  for (let i = 0; i < 160; i++) { const x = -120 + r() * 240; blob(x, edge(x) - 2 - r() * 40, 2 + r() * 5, 'rgba(139,115,82,.45)') } // bare soil
  for (let i = 0; i < 120; i++) { const x = -120 + r() * 240; blob(x, edge(x) - r() * 40, 3 + r() * 6, 'rgba(78,112,58,.5)') }    // mossy dark patches
  for (let i = 0; i < 9000; i++) { // leaf litter: little warm flecks, densest under the trees
    const x = -125 + r() * 250, z = Math.min(S.BACK - 0.6, edge(x) + 1 - Math.pow(r(), 0.7) * 42)
    g.fillStyle = ['#a8743e', '#c08b47', '#8a5a34', '#b49a52', '#7d6a3a'][Math.floor(r() * 5)]; g.globalAlpha = 0.25 + r() * 0.3
    g.beginPath(); g.ellipse(X(x), Z(z), 0.5 + r() * 0.8, 0.35 + r() * 0.5, r() * 3, 0, 6.29); g.fill()
  }
  g.globalAlpha = 1
  // the park: a touch lusher than the street verges
  blob(-24, 48, 22, 'rgba(142,196,107,.45)')
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

// a seamless grey detail tile (mean ≈ 0.5): soft value noise plus short grass strokes, wrapped at the edges
function detailTile() {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N
  const g = c.getContext('2d')!, r = rng(77)
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, N, N)
  const wrap = (fn: (ox: number, oy: number) => void) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) fn(ox, oy) }
  for (let i = 0; i < 90; i++) { const x = r() * N, y = r() * N, rad = 30 + r() * 70, v = r() < 0.5 ? 150 : 106
    wrap((ox, oy) => { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); gr.addColorStop(0, `rgba(${v},${v},${v},.22)`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2) }) }
  g.lineCap = 'round'
  for (let i = 0; i < 5200; i++) { const x = r() * N, y = r() * N, len = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 1.1, v = r() < 0.5 ? 162 : 98
    g.strokeStyle = `rgba(${v},${v + 6},${v - 10},.45)`; g.lineWidth = 1 + r() * 1.2
    wrap((ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke() }) }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4
  return t
}

let _terrainMat: THREE.MeshStandardMaterial | null = null
function terrainMat() {
  if (_terrainMat) return _terrainMat
  const m = new THREE.MeshStandardMaterial({ map: paintZones(), roughness: 0.96 })
  const detail = detailTile(), rep = new THREE.Vector2(TERRAIN.w / 5, TERRAIN.d / 5) // one detail tile per 5 m
  m.onBeforeCompile = (sh) => {
    sh.uniforms.detailMap = { value: detail }; sh.uniforms.detailRep = { value: rep }
    sh.fragmentShader = 'uniform sampler2D detailMap;\nuniform vec2 detailRep;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= texture2D(detailMap, vMapUv * detailRep).rgb * 2.0;`)
  }
  m.customProgramCacheKey = () => 'terrain-v1'
  return (_terrainMat = m)
}

/** the whole world's ground (market, park, townships, forest floor), one mesh */
export function Terrain() {
  const m = useMemo(terrainMat, [])
  // more depth precision when the camera is high (Dollhouse / Outside), full near detail on foot
  useFrame(({ camera }) => {
    const want = THREE.MathUtils.clamp(camera.position.y * 0.02, 0.1, 2.5) as number
    const c = camera as THREE.PerspectiveCamera
    if (Math.abs(c.near - want) > want * 0.15) { c.near = want; c.updateProjectionMatrix() }
  })
  return <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m} receiveShadow><planeGeometry args={[TERRAIN.w, TERRAIN.d]} /></mesh>
}

// ── paving: seamless procedural textures (512 px), stylised, one shared material per kind ──
type Pave = 'cobble' | 'flag' | 'gravel' | 'plaza'
function paveTile(kind: Pave) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N
  const g = c.getContext('2d')!, r = rng(kind.length * 31 + 5)
  if (kind === 'gravel') {
    g.fillStyle = '#c8b48f'; g.fillRect(0, 0, N, N)
    for (let i = 0; i < 9000; i++) { const x = r() * N, y = r() * N, s = 1 + r() * 3.2; g.fillStyle = ['#b29c78', '#d8c7a4', '#a8916c', '#e2d4b4', '#9c8866'][Math.floor(r() * 5)]
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.beginPath(); g.ellipse(x + ox, y + oy, s, s * 0.75, r() * 3, 0, 6.29); g.fill() } }
  } else if (kind === 'flag') {
    // irregular stone paving: a wrapped Voronoi of ~34 stones, darker joints where two stones meet
    const P = Array.from({ length: 34 }, () => [r() * N, r() * N, r()])
    const img = g.createImageData(N, N), a = img.data
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let d1 = 1e9, d2 = 1e9, k = 0
      for (let i = 0; i < P.length; i++) { let dx = Math.abs(x - P[i][0]), dy = Math.abs(y - P[i][1]); if (dx > N / 2) dx = N - dx; if (dy > N / 2) dy = N - dy; const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; k = i } else if (d < d2) d2 = d }
      const e = Math.sqrt(d2) - Math.sqrt(d1), tone = P[k][2], o = (y * N + x) * 4
      const base = e < 3.2 ? [118, 108, 98] : [196 + tone * 26 - Math.min(14, e * 0.25), 186 + tone * 20 - Math.min(14, e * 0.25), 172 + tone * 16 - Math.min(14, e * 0.25)]
      a[o] = base[0]; a[o + 1] = base[1]; a[o + 2] = base[2]; a[o + 3] = 255
    }
    g.putImageData(img, 0, 0)
  } else {
    // cobbles: rounded stones in staggered rows (plaza: the same, warmer and paler)
    const warm = kind === 'plaza'
    g.fillStyle = warm ? '#9c8a7c' : '#7f7670'; g.fillRect(0, 0, N, N)
    const rows = 12, cols = 10, ch = N / rows, cw = N / cols
    for (let row = 0; row < rows; row++) for (let col = -1; col <= cols; col++) {
      const x = col * cw + (row % 2 ? cw / 2 : 0) + cw / 2, y = row * ch + ch / 2, w = cw * (0.42 + r() * 0.04), h = ch * (0.4 + r() * 0.04)
      const tone = r(), base = warm ? [222 - tone * 24, 204 - tone * 22, 186 - tone * 20] : [184 - tone * 30, 174 - tone * 28, 166 - tone * 26]
      for (const ox of [-N, 0, N]) {
        const gr = g.createRadialGradient(x + ox - w * 0.25, y - h * 0.3, 1, x + ox, y, w * 1.1)
        gr.addColorStop(0, `rgb(${base[0] + 18},${base[1] + 18},${base[2] + 18})`); gr.addColorStop(1, `rgb(${base[0] - 22},${base[1] - 22},${base[2] - 22})`)
        g.fillStyle = gr; g.beginPath(); g.roundRect(x + ox - w, y - h, w * 2, h * 2, Math.min(w, h) * 0.55); g.fill()
      }
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
const paveCache = new Map<string, THREE.MeshStandardMaterial>()
/** a shared paving material; `metres` = how many metres one texture tile covers */
export function paveMat(kind: Pave) {
  const key = kind; if (paveCache.has(key)) return paveCache.get(key)!
  const m = new THREE.MeshStandardMaterial({ map: paveTile(kind), roughness: kind === 'gravel' ? 1 : 0.88, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  paveCache.set(key, m); return m
}
// the soft worn verge either side of a path: bare-ish earth fading into the grass (vertex alpha), so paths don't
// look pasted on
const vergeMat = new THREE.MeshStandardMaterial({ color: '#9a8a62', roughness: 1, transparent: true, vertexColors: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })

/** a smooth ribbon along a polyline (x, z), `w` wide; UVs: u across (0..1), v along in metres / tile */
function ribbon(pts: [number, number][], w: number, tile: number, alphaEdge = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
  const n = Math.max(8, Math.round(curve.getLength() / 0.6)), P = curve.getSpacedPoints(n)
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = []
  let along = 0
  for (let i = 0; i <= n; i++) {
    const p = P[i], q = P[Math.min(n, i + 1)], o = P[Math.max(0, i - 1)], tx = q.x - o.x, tz = q.z - o.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l
    if (i) along += P[i].distanceTo(P[i - 1])
    const across = alphaEdge ? [-1, -0.55, 0.55, 1] : [-1, 1]
    for (const s of across) {
      pos.push(p.x + nx * s * w / 2, 0, p.z + nz * s * w / 2); uv.push((s + 1) / 2 * (w / tile), along / tile)
      col.push(1, 1, 1, alphaEdge ? (Math.abs(s) > 0.9 ? 0 : 0.55) : 1)
    }
  }
  const k = alphaEdge ? 4 : 2
  for (let i = 0; i < n; i++) for (let j = 0; j < k - 1; j++) { const a = i * k + j, b = a + 1, c = a + k, d = c + 1; idx.push(a, b, c, b, d, c) }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setIndex(idx); geo.computeVertexNormals()
  if (geo.attributes.normal.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t } geo.setIndex(idx); geo.computeVertexNormals() } // always face up
  return geo
}
/** a path: paving `kind` along the points, with a soft worn verge on both sides */
export function Path({ pts, w, kind, tile = 3, y = 0.03 }: { pts: [number, number][]; w: number; kind: Pave; tile?: number; y?: number }) {
  const [geo, verge] = useMemo(() => [ribbon(pts, w, tile), ribbon(pts, w + 1.6, tile, true)], [pts, w, tile])
  return (
    <group>
      <mesh geometry={verge} material={vergeMat} position={[0, y - 0.012, 0]} receiveShadow />
      <mesh geometry={geo} material={paveMat(kind)} position={[0, y, 0]} receiveShadow />
    </group>
  )
}
