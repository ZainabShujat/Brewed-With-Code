import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { STREET as S } from './streetLayout'
import { rng } from './folk/specs'
import { quality } from '../ui/Menu'
import { grassMat, Instanced, type Spot } from './Ground'
import { TownshipsThemed } from './Township'

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

// ── the forest behind the back wall: a deep, tightly packed band of mixed trees (instanced), bigger at the back ──
export function Forest() {
  const groups = useMemo(() => {
    const r = rng(9091), by = new Map<string, Spot[]>(), add = (f: string, sp: Spot) => { if (!by.has(f)) by.set(f, []); by.get(f)!.push(sp) }
    const n = quality.high ? 170 : 85
    for (let i = 0; i < n; i++) {
      const depth = Math.pow(r(), 0.8), x = -105 + r() * 210, z = S.BACK - 2.5 - depth * 40
      const pine = r() < 0.6, file = pine ? PINES[Math.floor(r() * 5)] : TREES[Math.floor(r() * 5)]
      add(file, { x, z, h: (pine ? 9 : 7.5) + depth * 8 + r() * 3.5, rot: r() * 6.28 })
    }
    for (let i = 0; i < (quality.high ? 110 : 50); i++) add(BUSHES[i % 2], { x: -100 + r() * 200, z: S.BACK - 1.5 - r() * 14, h: 1.6 + r() * 1.6, rot: r() * 6.28 }) // a dense understorey, cheap
    return [...by.entries()]
  }, [])
  return <group>{groups.map(([file, items]) => <Instanced key={file} file={file} items={items} />)}</group>
}

// ── the two townships beyond the side walls: little streets of homes, tinted to their folk ──
const HOUSES = 'abcdefghijklmnopqrstu'.split('').map((l) => `suburban/building-type-${l}.glb`)
const TOWN_TINT = { west: ['#ffd6e4', '#fff0d6', '#f7c8dc', '#ffe3ef'], east: ['#d6e8ff', '#e6dcff', '#d8f2ea', '#eef0ff'] } // marshmallow pinks / notebook blues
const TOWN_GRASS = grassMat([380, 260])
export function Townships() {
  const homes = useMemo(() => {
    const r = rng(5150), out: { file: string; x: number; z: number; rot: number; tint: string; h: number }[] = []
    for (const side of [-1, 1] as const) {
      const tints = side < 0 ? TOWN_TINT.west : TOWN_TINT.east
      // two rows of homes either side of a little lane, running the length of the block
      for (const row of [0, 1]) for (let z = -38; z <= 56; z += 9.5) {
        if (r() < 0.12) continue
        const x = side * (S.X + 30 + row * 15 + (r() - 0.5) * 1.5) // past the outer road and the arch
        out.push({ file: HOUSES[Math.floor(r() * HOUSES.length)], x, z: z + (r() - 0.5) * 2, rot: row ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : (side < 0 ? -Math.PI / 2 : Math.PI / 2), tint: tints[Math.floor(r() * tints.length)], h: r() < 0.28 ? 11 + r() * 5 : 6 + r() * 2.5 }) // now and then a tall one
      }
    }
    return out
  }, [])
  const yards = useMemo(() => { const r = rng(77); return Array.from({ length: quality.high ? 36 : 16 }, () => { const side = r() < 0.5 ? -1 : 1, ave = [34, 64, 96][Math.floor(r() * 3)]; return { x: side * (S.X + ave + (r() < 0.5 ? -4.2 : 4.2)), z: -40 + r() * 98, h: 5 + r() * 4, k: Math.floor(r() * 5) } }) }, [])
  return (
    <group>
      {/* ground for the townships and the forest (the street block's own grass stops at the walls) */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={TOWN_GRASS}><planeGeometry args={[380, 260]} /></mesh>
            {/* (the Kenney houses were replaced by the themed townships: see Township.tsx) */}
      <TownshipsThemed />
      {yards.map((t, i) => <NiceTree key={'y' + i} x={t.x} z={t.z} h={t.h} kind={t.k} />)}
    </group>
  )
}
