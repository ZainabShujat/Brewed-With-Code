import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { STREET as S } from './streetLayout'
import { rng } from './folk/specs'
import { quality } from '../ui/Menu'
import { grassMat } from './Ground'

// The world beyond the street: a forest of stylised trees behind the café's back wall, and the two townships
// (marshmallow homes to the west, notebook homes to the east) beyond the side walls. CC0 models: Quaternius
// "Stylized Nature MegaKit" (trees, bushes, flowers) and Kenney "City Kit (Suburban)" (houses), see SOURCES.md.
const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
const _b = new THREE.Box3(), _s = new THREE.Vector3(), _c = new THREE.Vector3()

/** a model from public/assets/<file>, scaled to `fit` metres tall, sitting on the ground; `tint` colours leaves / walls */
function PropInner({ file, pos, rot = 0, fit, tint, tintWhat = /leaf|leaves/i, shadow = false }: { file: string; pos: [number, number, number]; rot?: number; fit: number; tint?: string; tintWhat?: RegExp; shadow?: boolean }) {
  const { scene } = useGLTF(`${BASE}assets/${file}`)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.castShadow = shadow; m.receiveShadow = false
      if (tint) { const mats = Array.isArray(m.material) ? m.material : [m.material]; m.material = mats.map((mt) => { if (!tintWhat.test(mt.name) && !tintWhat.test(m.name)) return mt; const n = (mt as THREE.MeshStandardMaterial).clone(); n.color = new THREE.Color(tint); return n }) as never; if (!Array.isArray(m.material) || (m.material as unknown[]).length === 1) m.material = (m.material as THREE.Material[])[0] ?? m.material } })
    _b.setFromObject(c); _b.getSize(_s); _b.getCenter(_c)
    const k = fit / Math.max(1e-6, _s.y), wrap = new THREE.Group(); c.position.set(-_c.x, -_b.min.y, -_c.z); wrap.add(c); wrap.scale.setScalar(k)
    return wrap
  }, [scene, fit, tint, tintWhat, shadow])
  return <group position={pos} rotation={[0, rot, 0]}><primitive object={obj} /></group>
}
export function Prop(p: Parameters<typeof PropInner>[0]) { return <Suspense fallback={null}><PropInner {...p} /></Suspense> }

const TREES = ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5'].map((n) => `nature/${n}.gltf`)
const PINES = ['Pine_1', 'Pine_2', 'Pine_3', 'Pine_4', 'Pine_5'].map((n) => `nature/${n}.gltf`)
const BUSHES = ['nature/Bush_Common.gltf', 'nature/Bush_Common_Flowers.gltf']
/** one stylised tree (replaces the old lollipop trees); a blossom tint for the pink / lilac ones */
export function NiceTree({ x, z, h = 8, kind = 0, tint }: { x: number; z: number; h?: number; kind?: number; tint?: string }) {
  return <Prop file={TREES[kind % TREES.length]} pos={[x, 0, z]} rot={kind * 1.3} fit={h} tint={tint} shadow />
}

// ── the forest behind the back wall: a deep band of mixed trees, bigger at the back so it reads as a wood ──
export function Forest() {
  const trees = useMemo(() => {
    const r = rng(9091), out: { file: string; x: number; z: number; h: number; rot: number }[] = []
    const n = quality.high ? 90 : 45
    for (let i = 0; i < n; i++) {
      const x = -95 + r() * 190, depth = r(), z = S.BACK - 3 - depth * 34
      const pine = r() < 0.4, file = pine ? PINES[Math.floor(r() * 5)] : TREES[Math.floor(r() * 5)]
      out.push({ file, x, z, h: (pine ? 9 : 7) + depth * 7 + r() * 3, rot: r() * 6.28 })
    }
    for (let i = 0; i < (quality.high ? 30 : 12); i++) out.push({ file: BUSHES[i % 2], x: -90 + r() * 180, z: S.BACK - 1.5 - r() * 6, h: 1.4 + r(), rot: r() * 6.28 })
    return out
  }, [])
  return <group>{trees.map((t, i) => <Prop key={i} file={t.file} pos={[t.x, 0, t.z]} rot={t.rot} fit={t.h} />)}</group>
}

// ── the two townships beyond the side walls: little streets of homes, tinted to their folk ──
const HOUSES = 'abcdefghijklmnopqrstu'.split('').map((l) => `suburban/building-type-${l}.glb`)
const TOWN_TINT = { west: ['#ffd6e4', '#fff0d6', '#f7c8dc', '#ffe3ef'], east: ['#d6e8ff', '#e6dcff', '#d8f2ea', '#eef0ff'] } // marshmallow pinks / notebook blues
const TOWN_GRASS = grassMat([320, 260])
export function Townships() {
  const homes = useMemo(() => {
    const r = rng(5150), out: { file: string; x: number; z: number; rot: number; tint: string; h: number }[] = []
    for (const side of [-1, 1] as const) {
      const tints = side < 0 ? TOWN_TINT.west : TOWN_TINT.east
      // two rows of homes either side of a little lane, running the length of the block
      for (const row of [0, 1]) for (let z = -38; z <= 56; z += 9.5) {
        if (r() < 0.12) continue
        const x = side * (S.X + 9 + row * 15 + (r() - 0.5) * 1.5)
        out.push({ file: HOUSES[Math.floor(r() * HOUSES.length)], x, z: z + (r() - 0.5) * 2, rot: row ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : (side < 0 ? -Math.PI / 2 : Math.PI / 2), tint: tints[Math.floor(r() * tints.length)], h: 6 + r() * 2.5 })
      }
    }
    return out
  }, [])
  const yards = useMemo(() => { const r = rng(77); return Array.from({ length: quality.high ? 36 : 16 }, () => { const side = r() < 0.5 ? -1 : 1; return { x: side * (S.X + 6 + r() * 26), z: -40 + r() * 98, h: 5 + r() * 4, k: Math.floor(r() * 5) } }) }, [])
  return (
    <group>
      {/* ground for the townships and the forest (the street block's own grass stops at the walls) */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={TOWN_GRASS}><planeGeometry args={[320, 260]} /></mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * (S.X + 16.5), 0.01, 9]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4.5, 104]} /><meshStandardMaterial color="#d9c7b0" /></mesh>)}
      {homes.map((h, i) => <Prop key={i} file={h.file} pos={[h.x, 0, h.z]} rot={h.rot} fit={h.h} tint={h.tint} tintWhat={/./} />)}
      {yards.map((t, i) => <NiceTree key={'y' + i} x={t.x} z={t.z} h={t.h} kind={t.k} />)}
    </group>
  )
}
