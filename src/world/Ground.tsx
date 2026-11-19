import { useFrame } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { STREET as S, SHOPS, SHOP_DEPTH, PARK, GARDEN } from './streetLayout'
import { rng } from './folk/specs'
import { quality } from '../ui/Menu'

// Ground that isn't a flat green sheet: a painted grass texture (soft lighter and darker patches, mown-looking
// strokes, little clover and daisy dots), plus real tufts of grass and clumps of flowers scattered over the lawns,
// the township gardens and the forest floor (instanced, so thousands cost one draw call per kind).
// One big, NON-repeating painting per lawn (no visible tiling): very soft, low-contrast sun and shade patches
// across the whole area, and a faint fine grain. The detail comes from the real 3D tufts and flowers on top.
// (Cozy stylised games keep ground contrast low and let props carry the texture.)
function paintLawn(w: number, d: number, seed: number) {
  const W = 2048, H = Math.max(256, Math.round(2048 * d / w)), c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(seed)
  g.fillStyle = '#8bbd6b'; g.fillRect(0, 0, W, H)
  const blob = (x: number, y: number, rad: number, col: string) => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2) }
  const px = W / w // pixels per metre
  for (let i = 0; i < w * d / 260; i++) blob(r() * W, r() * H, (8 + r() * 18) * px, r() < 0.55 ? 'rgba(166,204,118,.30)' : 'rgba(112,166,92,.28)') // sun / shade, 8-26 m wide
  for (let i = 0; i < w * d / 900; i++) blob(r() * W, r() * H, (4 + r() * 6) * px, 'rgba(196,214,128,.22)') // a few warm, sunny clearings
  // a faint grain (±3%), so close up it isn't plastic
  const img = g.getImageData(0, 0, W, H), a = img.data
  for (let k = 0; k < a.length; k += 4) { const n = (r() - 0.5) * 10; a[k] += n; a[k + 1] += n * 1.1; a[k + 2] += n * 0.6 }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true
  return t
}
/** grass for a lawn of `size` metres: painted once for that size (no tiling) */
export function grassMat(size: [number, number]) {
  return new THREE.MeshStandardMaterial({ map: paintLawn(size[0], size[1], Math.round(size[0] * 7 + size[1])), roughness: 0.95 })
}

// ── scattered tufts + flower clumps (instanced) ──
const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
function onGrass(x: number, z: number) {
  if (z > S.padA[0] - 1 && z < S.padB[1] + 1 && Math.abs(x) < S.X) return false   // the street + pavements
  if (z > S.padB[1] && Math.abs(x) < S.side.pad + 1 && z < S.FRONT) return false  // the side street
  if (Math.hypot(x, z) < 17.5) return false                                         // the café (pot + garden lanterns)
  if (Math.abs(Math.abs(x) - (S.X + 14)) < 6.5) return false                       // the outer roads
  if (Math.abs(x) > S.X + 58) return false                                          // the townships (streets + buildings)
  if (Math.abs(x) > S.X && Math.abs(z - (S.padA[0] + S.padB[1]) / 2) < 8 && Math.abs(x) < S.X + 64) return false // the road out + the arch
  if (Math.hypot(x, z + 32) < 9 || (x > 26 && x < 46 && z < -26 && z > -42)) return false // the gazebo lawn, the allotments
  if (x > PARK.x0 - 0.5 && x < PARK.x1 + 0.5 && z > PARK.z0 - 0.5 && z < PARK.z1 + 0.5) return false
  if (x > GARDEN.x0 - 1.5 && x < GARDEN.x1 + 0.5 && z > GARDEN.z0 - 0.5 && z < GARDEN.z1 + 0.5) return false // landscaped by hand
  if (z < S.BACK && x > -64 && x < 4) return false // the forest-edge prototype has its own clusters
  for (const sh of SHOPS) { const z0 = sh.side === 'a' ? S.padA[0] - SHOP_DEPTH : S.padB[1], z1 = sh.side === 'a' ? S.padA[0] : S.padB[1] + SHOP_DEPTH; if (x > sh.x0 - 1 && x < sh.x1 + 1 && z > z0 - 1 && z < z1 + 1) return false }
  return true
}

// ── instancing that the camera can skip: instances are split into map tiles (CELL units square), each its own
// InstancedMesh with a real bounding sphere, so three.js culls tiles outside the view. Small things (grass, flowers,
// pebbles) also hide beyond `far` (world metres) — they are a pixel or two by then and cost as much as a tree.
const CELL = 24
const FAR: { m: THREE.Object3D; c: THREE.Vector3; far: number }[] = []
export function tiled(parts: THREE.Mesh[], mats: THREE.Matrix4[], matFor: (p: THREE.Mesh) => THREE.Material, far = 0) {
  const cells = new Map<string, THREE.Matrix4[]>(), v = new THREE.Vector3()
  for (const m of mats) { v.setFromMatrixPosition(m); const k = Math.floor(v.x / CELL) + ':' + Math.floor(v.z / CELL); if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(m) }
  const out: THREE.InstancedMesh[] = []
  for (const list of cells.values()) for (const p of parts) {
    const im = new THREE.InstancedMesh(p.geometry, matFor(p), list.length)
    list.forEach((m, i) => im.setMatrixAt(i, m.clone().multiply(p.matrixWorld))); im.instanceMatrix.needsUpdate = true
    im.computeBoundingSphere(); im.frustumCulled = true
    if (far) FAR.push({ m: im, c: im.boundingSphere!.center.clone(), far })
    out.push(im)
  }
  return out
}
const _w = new THREE.Vector3()
/** hides far-away small-plant tiles (one loop for the whole world) */
export function DistanceCull() {
  useFrame(({ camera }) => {
    for (const f of FAR) { if (!f.m.parent) continue; _w.copy(f.c).applyMatrix4(f.m.parent.matrixWorld); f.m.visible = _w.distanceTo(camera.position) < f.far }
  })
  return null
}
function ScatterInner({ file, count, seed, size }: { file: string; count: number; seed: number; size: [number, number] }) {
  const { scene } = useGLTF(`${BASE}assets/${file}`)
  const meshes = useMemo(() => {
    const parts: THREE.Mesh[] = []; scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) parts.push(o as THREE.Mesh) })
    const box = new THREE.Box3().setFromObject(scene), h = box.max.y - box.min.y || 1
    const r = rng(seed), mats: THREE.Matrix4[] = [], q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3()
    let tries = 0
    while (mats.length < count && tries++ < count * 8) {
      const x = -125 + r() * 250, z = -90 + r() * 170
      if (!onGrass(x, z)) continue
      const k = (size[0] + r() * (size[1] - size[0])) / h
      mats.push(new THREE.Matrix4().compose(v.set(x, -box.min.y * k, z), q.setFromEuler(e.set(0, r() * 6.28, 0)), sc.set(k, k, k)))
    }
    return tiled(parts, mats, (p) => p.material as THREE.Material, quality.high ? 90 : 55)
  }, [scene, count, seed, size])
  return <group>{meshes.map((m, i) => <primitive key={i} object={m} />)}</group>
}
/** any model, many times, as instanced meshes: one draw call per mesh part (forests, orchards, flower beds) */
export type Spot = { x: number; z: number; h: number; rot?: number; y?: number }
const SMALL = /Grass|Clover|Flower|Fern|Pebble|Mushroom|RockPath|Plant_/
function InstInner({ file, items, tint }: { file: string; items: Spot[]; tint?: string }) {
  const { scene } = useGLTF(`${BASE}assets/${file}`)
  const meshes = useMemo(() => {
    const parts: THREE.Mesh[] = []; scene.updateMatrixWorld(true); scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) parts.push(o as THREE.Mesh) })
    const box = new THREE.Box3().setFromObject(scene), h = box.max.y - box.min.y || 1
    const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3()
    const mats = items.map((it) => { const k = it.h / h; return new THREE.Matrix4().compose(v.set(it.x, (it.y ?? 0) - box.min.y * k, it.z), q.setFromEuler(e.set(0, it.rot ?? 0, 0)), sc.set(k, k, k)) })
    const tinted = new Map<THREE.Material, THREE.Material>()
    return tiled(parts, mats, (p) => { const mat = p.material as THREE.Material
      if (!tint || !/leaf|leaves/i.test(mat.name)) return mat
      if (!tinted.has(mat)) { const c = (mat as THREE.MeshStandardMaterial).clone(); c.color = new THREE.Color(tint); tinted.set(mat, c) }
      return tinted.get(mat)! }, SMALL.test(file) ? (quality.high ? 90 : 55) : 0)
  }, [scene, items, tint])
  return <group>{meshes.map((m, i) => <primitive key={i} object={m} />)}</group>
}
export function Instanced(p: { file: string; items: Spot[]; tint?: string }) { return <Suspense fallback={null}><InstInner {...p} /></Suspense> }

export function GrassScatter() {
  const k = quality.high ? 1 : 0.45
  return (
    <Suspense fallback={null}>
      <ScatterInner file="nature/Grass_Common_Tall.gltf" count={Math.round(600 * k)} seed={11} size={[0.5, 0.9]} />
      <ScatterInner file="nature/Flower_3_Group.gltf" count={Math.round(140 * k)} seed={12} size={[0.35, 0.6]} />
      <ScatterInner file="nature/Flower_4_Group.gltf" count={Math.round(140 * k)} seed={13} size={[0.35, 0.6]} />
      <ScatterInner file="nature/Bush_Common_Flowers.gltf" count={Math.round(60 * k)} seed={14} size={[0.9, 1.5]} />
    </Suspense>
  )
}
