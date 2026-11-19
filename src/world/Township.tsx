import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { STREET as S } from './streetLayout'
import { rng } from './folk/specs'
import { hourNow } from '../systems/clock'
import { quality } from '../ui/Menu'

// The two townships, built to look like the folk who live there.
//   Notebook Row (east): houses that are books standing up, spiral-notebook apartments, skyscrapers of stacked
//   books, and pencil towers.  Marshmallow Hollow (west): puffy marshmallow cottages, towers of stacked
//   marshmallows with toasted tops, and s'more skyscrapers.
// Small homes near the market, mid-rises behind, a skyline at the back, on a grid of streets. Everything is
// collected into a few instanced meshes (one draw call per shape), and the windows glow at night.
type V3 = [number, number, number]
type Part = { k: 'box' | 'cyl' | 'sph' | 'cone' | 'hex' | 'win'; p: V3; s: V3; r?: V3; c: string }
const ROAD = '#6f6273', LINE = '#fff6ec'
export const AVE = [24, 52, 80] // avenue centres, metres outside the market wall
export const CROSS = [-42, -10, (S.padA[0] + S.padB[1]) / 2, 54] // cross streets (z)
const ROAD_W = 6

class Kit {
  parts: Part[] = []
  add(k: Part['k'], p: V3, s: V3, c: string, r?: V3) { this.parts.push({ k, p, s, c, r }) }
}

// ── Notebook Row ──
const COVERS = ['#5b8fd6', '#d65b6f', '#4fa37a', '#e0a33a', '#8d6ad1', '#3f6b8f', '#c46a3a', '#2f8f8a']
const PAGE = '#fbf3e2'
function bookHouse(kit: Kit, x: number, z: number, face: number, r: () => number) {
  const w = 5 + r() * 2, h = 6.5 + r() * 3, d = 3.2 + r() * 1.2, col = COVERS[Math.floor(r() * COVERS.length)]
  const fx = Math.sin(face), fz = Math.cos(face), sx = Math.cos(face), sz = -Math.sin(face) // forward + sideways
  const at = (a: number, y: number, b: number): V3 => [x + sx * a + fx * b, y, z + sz * a + fz * b]
  kit.add('box', at(0, h / 2, d / 2 - 0.1), [w, h, 0.2], col, [0, face, 0])           // front cover
  kit.add('box', at(0, h / 2, -d / 2 + 0.1), [w, h, 0.2], col, [0, face, 0])          // back cover
  kit.add('box', at(-w / 2 + 0.2, h / 2, 0), [0.4, h, d], col, [0, face, 0])           // spine
  kit.add('box', at(0.25, h / 2, 0), [w - 0.6, h - 0.3, d - 0.35], PAGE, [0, face, 0]) // the pages
  kit.add('box', at(0, h + 0.3, 0), [w + 0.5, 0.6, d + 0.9], COVERS[(COVERS.indexOf(col) + 3) % COVERS.length], [0, face, 0]) // a book lying on top = the roof
  for (let i = 0; i < 2; i++) for (let j = 0; j < Math.floor(h / 2.6); j++) kit.add('win', at(-w / 4 + i * w / 2.2, 1.6 + j * 2.4, d / 2 + 0.02), [0.9, 1.0, 0.08], '#fff1c4', [0, face, 0])
  kit.add('box', at(w * 0.15, 1.1, d / 2 + 0.05), [1.1, 2.2, 0.12], '#4a2f3e', [0, face, 0])             // door
}
function bookStack(kit: Kit, x: number, z: number, h: number, r: () => number) {
  let y = 0, i = 0
  while (y < h) {
    const bw = 8 + r() * 4, bd = 6 + r() * 3, th = 2.4 + r() * 1.6, col = COVERS[(i + Math.floor(r() * 3)) % COVERS.length], rot = (r() - 0.5) * 0.5
    kit.add('box', [x, y + 0.15, z], [bw, 0.3, bd], col, [0, rot, 0])
    kit.add('box', [x, y + th / 2, z], [bw - 0.5, th - 0.5, bd - 0.4], PAGE, [0, rot, 0])
    kit.add('box', [x, y + th - 0.15, z], [bw, 0.3, bd], col, [0, rot, 0])
    kit.add('box', [x - Math.cos(rot) * (bw / 2 - 0.2), y + th / 2, z + Math.sin(rot) * (bw / 2 - 0.2)], [0.4, th, bd], col, [0, rot, 0])
    // window strips in the page band
    for (const sd of [-1, 1]) kit.add('win', [x + Math.sin(rot) * sd * (bd / 2 - 0.18), y + th / 2, z + Math.cos(rot) * sd * (bd / 2 - 0.18)], [bw * 0.7, 0.55, 0.06], '#fff1c4', [0, rot, 0])
    y += th; i++
  }
}
function spiralTower(kit: Kit, x: number, z: number, h: number, r: () => number) {
  const w = 9, d = 7, col = COVERS[Math.floor(r() * COVERS.length)]
  kit.add('box', [x, h / 2, z], [w, h, d], col)
  kit.add('box', [x + 0.3, h / 2, z], [w - 0.4, h - 0.6, d + 0.06], PAGE)
  kit.add('box', [x, h + 0.2, z], [w, 0.4, d], col)
  for (let y = 1.2; y < h - 0.5; y += 1.3) kit.add('cyl', [x - w / 2, y, z], [0.9, 0.18, 0.9], '#c9ccd6', [0, 0, Math.PI / 2]) // the spiral rings
  for (let y = 2; y < h - 1.5; y += 3) for (let i = 0; i < 3; i++) kit.add('win', [x - w / 3 + i * w / 3 + 0.5, y, z + d / 2 + 0.06], [1.6, 1.4, 0.06], '#fff1c4')
}
function pencil(kit: Kit, x: number, z: number, h: number, r: () => number) {
  const rad = 3.2 + r(), body = h - rad * 2.2
  kit.add('cyl', [x, 1.5, z], [rad * 2, 3, rad * 2], '#ff9ec6')               // eraser at the bottom
  kit.add('cyl', [x, 3.4, z], [rad * 2.05, 0.9, rad * 2.05], '#c9ccd6')      // ferrule
  kit.add('hex', [x, 3.8 + body / 2, z], [rad * 2, body, rad * 2], '#f2c33a') // the body
  kit.add('cone', [x, 3.8 + body + rad * 0.85, z], [rad * 2, rad * 1.7, rad * 2], '#f1d3a6') // the sharpened wood
  kit.add('cone', [x, 3.8 + body + rad * 1.55, z], [rad * 0.8, rad * 0.55, rad * 0.8], '#3a3340') // the lead
  for (let y = 6; y < body; y += 3.2) for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; kit.add('win', [x + Math.cos(t) * rad * 0.88, y, z + Math.sin(t) * rad * 0.88], [1.2, 1.3, 0.06], '#fff1c4', [0, -t + Math.PI / 2, 0]) }
}

// ── Marshmallow Hollow ──
const PUFF = ['#fff4f8', '#ffd6e4', '#e9f6ff', '#fff2d2', '#efe2ff', '#d9f5e6']
const TOAST = '#d99a5b'
function puff(kit: Kit, x: number, y: number, z: number, rad: number, h: number, col: string, top = col) {
  kit.add('cyl', [x, y + h / 2, z], [rad * 2, h, rad * 2], col)
  kit.add('sph', [x, y + h, z], [rad * 2, rad * 0.55, rad * 2], top)   // a soft, puffy top
  kit.add('sph', [x, y + 0.05, z], [rad * 2.02, rad * 0.35, rad * 2.02], col) // a soft bottom edge
}
function roundWindows(kit: Kit, x: number, z: number, rad: number, y: number, n: number, face0 = 0) {
  for (let a = 0; a < n; a++) { const t = face0 + (a / n) * Math.PI * 2; kit.add('win', [x + Math.cos(t) * rad, y, z + Math.sin(t) * rad], [1.0, 1.0, 0.06], '#fff1c4', [0, -t + Math.PI / 2, 0]) }
}
function mallowHouse(kit: Kit, x: number, z: number, face: number, r: () => number) {
  const rad = 2.6 + r() * 0.9, h = 4.5 + r() * 2, col = PUFF[Math.floor(r() * PUFF.length)]
  puff(kit, x, z === z ? 0 : 0, z, rad, h, col)
  puff(kit, x, h + rad * 0.3, z, rad * 0.55, 1.4, PUFF[(PUFF.indexOf(col) + 2) % PUFF.length]) // a little marshmallow chimney on top
  roundWindows(kit, x, z, rad, h * 0.62, 4, face + Math.PI / 4)
  kit.add('box', [x + Math.sin(face) * rad, 1.1, z + Math.cos(face) * rad], [1.2, 2.2, 0.15], '#c46a8a', [0, face, 0]) // door
}
function mallowTower(kit: Kit, x: number, z: number, h: number, r: () => number) {
  let y = 0, rad = 5.2 + r() * 1.5, i = 0
  while (y < h) {
    const seg = 4 + r() * 2, col = PUFF[(i + Math.floor(r() * 2)) % PUFF.length], last = y + seg >= h
    puff(kit, x, y, z, rad, seg, col, last ? TOAST : col)
    roundWindows(kit, x, z, rad, y + seg * 0.55, 8, i * 0.4)
    y += seg + rad * 0.12; rad *= 0.94; i++
  }
}
function smoreTower(kit: Kit, x: number, z: number, h: number, r: () => number) {
  let y = 0, i = 0
  const w = 10 + r() * 2
  while (y < h) {
    kit.add('box', [x, y + 0.6, z], [w, 1.2, w], '#c98a4b')            // graham cracker
    kit.add('box', [x, y + 1.5, z], [w - 0.6, 0.6, w - 0.6], '#5a3424') // chocolate
    puff(kit, x, y + 1.8, z, w * 0.42, 2.8, PUFF[i % PUFF.length])      // marshmallow
    roundWindows(kit, x, z, w * 0.42, y + 3.2, 10, i)
    y += 5; i++
  }
  kit.add('box', [x, y + 0.6, z], [w, 1.2, w], '#c98a4b')
}

// ── layout: blocks between the avenues and cross streets, homes near the market, towers at the back ──
function buildTown(side: -1 | 1) {
  const kit = new Kit(), r = rng(side < 0 ? 31337 : 4242)
  const cols: [number, number][] = [[AVE[0] + 4, AVE[1] - 4], [AVE[1] + 4, AVE[2] - 4], [AVE[2] + 4, AVE[2] + 18]]
  const rows: [number, number][] = [[-62, CROSS[0] - 4], [CROSS[0] + 4, CROSS[1] - 4], [CROSS[1] + 4, CROSS[2] - 5], [CROSS[2] + 5, CROSS[3] - 4], [CROSS[3] + 4, 78]]
  const dense = quality.high ? 1 : 0.6
  cols.forEach(([a0, a1], ci) => rows.forEach(([z0, z1]) => {
    const step = ci === 0 ? 8.5 : 13
    for (let a = a0 + step / 2; a < a1; a += step) for (let z = z0 + step / 2; z < z1; z += step) {
      if (r() > dense) continue
      const x = side * a, roll = r()
      if (side > 0) {
        if (ci === 0) bookHouse(kit, x, z, r() < 0.5 ? Math.PI / 2 * -side : (r() < 0.5 ? 0 : Math.PI), r)
        else if (ci === 1) roll < 0.55 ? spiralTower(kit, x, z, 14 + r() * 14, r) : bookStack(kit, x, z, 12 + r() * 14, r)
        else roll < 0.22 ? pencil(kit, x, z, 40 + r() * 25, r) : bookStack(kit, x, z, 26 + r() * 34, r)
      } else {
        if (ci === 0) mallowHouse(kit, x, z, r() * 6.28, r)
        else if (ci === 1) mallowTower(kit, x, z, 12 + r() * 14, r)
        else roll < 0.35 ? smoreTower(kit, x, z, 30 + r() * 30, r) : mallowTower(kit, x, z, 26 + r() * 32, r)
      }
    }
  }))
  return kit.parts
}

const GEO: Record<Part['k'], THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1), win: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14), hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  sph: new THREE.SphereGeometry(0.5, 14, 7), cone: new THREE.ConeGeometry(0.5, 1, 22),
}
const WIN_MAT = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0 })
function TownMeshes({ parts }: { parts: Part[] }) {
  const meshes = useMemo(() => {
    const by = new Map<Part['k'], Part[]>(); for (const p of parts) { if (!by.has(p.k)) by.set(p.k, []); by.get(p.k)!.push(p) }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color()
    return [...by.entries()].map(([k, ps]) => {
      const mat = k === 'win' ? WIN_MAT : new THREE.MeshStandardMaterial({ roughness: 0.75 })
      const im = new THREE.InstancedMesh(GEO[k], mat, ps.length)
      ps.forEach((p, i) => { im.setMatrixAt(i, m4.compose(new THREE.Vector3(...p.p), q.setFromEuler(e.set(...(p.r ?? [0, 0, 0]))), new THREE.Vector3(...p.s))); im.setColorAt(i, col.set(p.c)) })
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true
      im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false
      return im
    })
  }, [parts])
  return <group>{meshes.map((m, i) => <primitive key={i} object={m} />)}</group>
}

function Streets({ side }: { side: -1 | 1 }) {
  const roads = useMemo(() => {
    const out: { p: V3; s: [number, number] }[] = []
    for (const a of AVE) out.push({ p: [side * (S.X + a), 0.035, 8], s: [ROAD_W, 150] })
    for (const z of CROSS) out.push({ p: [side * (S.X + (AVE[0] + AVE[2] + 18) / 2), 0.036, z], s: [AVE[2] + 18 - AVE[0], ROAD_W] })
    return out
  }, [side])
  return (
    <group>
      {roads.map((rd, i) => <mesh key={i} position={rd.p} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={rd.s} /><meshStandardMaterial color={ROAD} roughness={0.9} /></mesh>)}
      {AVE.map((a) => Array.from({ length: 26 }, (_, i) => -64 + i * 6).map((z) => <mesh key={`${a}${z}`} position={[side * (S.X + a), 0.045, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.22, 2.2]} /><meshStandardMaterial color={LINE} /></mesh>))}
    </group>
  )
}

export function TownshipsThemed() {
  const west = useMemo(() => buildTown(-1), []), east = useMemo(() => buildTown(1), [])
  const t = useRef(0)
  useFrame((_, dt) => { t.current += dt; if (t.current < 0.5) return; t.current = 0
    const h = hourNow(), night = h < 6.5 || h > 18.5 ? 1 : h < 7.5 ? 7.5 - h : h > 17.5 ? h - 17.5 : 0
    WIN_MAT.emissiveIntensity = night * 1.1 })
  return <group><Streets side={-1} /><Streets side={1} /><TownMeshes parts={west} /><TownMeshes parts={east} /></group>
}
