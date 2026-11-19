import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { STREET as S, PARK, FOUNTAIN as F, POND, BRIDGE, pondLoop, groundY } from './streetLayout'
import { RBox } from './Soft'
import { mat, glow } from './mats'
import { C } from '../data/palette'
import { nightGlow } from './Lighting'
import { Townsperson, seatHip, type Pose } from './folk/Townsperson'
import { folk, rng, type FolkSpec } from './folk/specs'
import { registerTalker, murmurTick } from '../systems/murmur'
import { ambientTick } from '../systems/ambient'
import { hourNow } from '../systems/clock'
import { NiceTree } from './Scenery'
import { Instanced, type Spot } from './Ground'
import { Path, paveMat } from './Terrain'

// The park across the road, walkable since 19 Nov. Two places in one:
//   · the FOUNTAIN PLAZA by the street: a 14 m grand fountain (a broad octagonal stone basin, three cascading tiers,
//     a stone teapot pouring into the top bowl, eight little marshmallow / notebook statues spouting arcs into the
//     basin) on a round cobbled plaza ringed with benches, planters and lamps — the town's landmark;
//   · the POND behind it: a quiet kidney-shaped pond with a sandy, pebbly bank, rocks, reeds, lily pads, ducks and an
//     arched wooden bridge over its narrow middle, a gravel loop all the way round, and benches facing the water.
// Paths: a cobbled path in from the side street (from the café's crossing), the main gate straight onto the plaza
// from the street, and the gravel loop. Open lawns stay open (a picnic on the west lawn).
const FX = F.x, FZ = F.z, SCALE = 1.95
const pol = (deg: number, r: number): [number, number] => [FX + Math.cos((deg * Math.PI) / 180) * r, FZ + Math.sin((deg * Math.PI) / 180) * r]

// ── shared materials ──
const stoneTex = (() => { if (typeof document === 'undefined') return null; const t = paveMat('flag').map!.clone(); t.needsUpdate = true; t.repeat.set(10, 1.2); return t })()
const STONE = new THREE.MeshStandardMaterial({ color: '#f1e9df', map: stoneTex, roughness: 0.82 })
const STONE_WALL = (() => { const m = STONE.clone(); m.side = THREE.DoubleSide; return m })()
const STONE_PALE = new THREE.MeshStandardMaterial({ color: '#f7efe6', roughness: 0.7 })
const STATUE = new THREE.MeshStandardMaterial({ color: '#f4dfe6', roughness: 0.55 }) // a rosy marble, the café's colour
const WATER = new THREE.MeshStandardMaterial({ color: '#79c3dc', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.9 })
const POND_WATER = new THREE.MeshStandardMaterial({ color: '#5ea6bf', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.94 })
const POND_DEEP = new THREE.MeshStandardMaterial({ color: '#4a8faa', roughness: 0.08, transparent: true, opacity: 0.85, depthWrite: false })
const SAND = new THREE.MeshStandardMaterial({ color: '#d4bf93', roughness: 1 })
const WOOD = mat('#a8714a'), WOOD_DARK = mat('#7a4c31')
// falling water: soft vertical streaks that scroll down (one texture, shared by every curtain and arc)
const fallTex = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d')!, r = rng(321)
  g.fillStyle = 'rgba(210,240,250,0.12)'; g.fillRect(0, 0, 128, 256)
  for (let i = 0; i < 70; i++) { const x = r() * 128, w = 1 + r() * 3, a = 0.3 + r() * 0.5; g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x, 0, w, 256) }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(r() * 128, r() * 256, 1.5, 6 + r() * 14) }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
})()
const FALL = new THREE.MeshStandardMaterial({ color: '#e6f7ff', map: fallTex, transparent: true, opacity: 0.7, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: '#bfe6f5', emissiveIntensity: 0.15 })
const ARC = new THREE.MeshStandardMaterial({ color: '#e6f7ff', map: fallTex, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false, emissive: '#bfe6f5', emissiveIntensity: 0.2 })
const FOAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })

// a bowl: a shallow dish with a rolled lip (lathe), r = rim radius
function bowlGeo(r: number) {
  const k = r / 3.8, P = [[0.0, 0.42], [0.9, 0.0], [2.5, 0.2], [3.55, 0.52], [3.85, 0.66], [3.85, 0.8], [3.6, 0.84], [3.4, 0.66], [0.0, 0.6]]
  return new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x * k, y * k + (k < 1 ? 0 : 0))), 40)
}
// a moulded column: base, waist, capital
function columnGeo(h: number, r: number) {
  const P = [[0, 0], [r * 1.5, 0], [r * 1.5, h * 0.08], [r * 1.15, h * 0.16], [r * 0.85, h * 0.3], [r * 0.75, h * 0.6], [r * 0.9, h * 0.82], [r * 1.25, h * 0.92], [r * 1.25, h], [0, h]]
  return new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x, y)), 28)
}
// the octagonal capstone ring of the basin (bevelled)
function capstoneGeo(rOut: number, rIn: number) {
  const sh = new THREE.Shape(), hole = new THREE.Path()
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const [x, y] = [Math.cos(a) * rOut, Math.sin(a) * rOut]; i ? sh.lineTo(x, y) : sh.moveTo(x, y) }
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const [x, y] = [Math.cos(a) * rIn, Math.sin(a) * rIn]; i ? hole.lineTo(x, y) : hole.moveTo(x, y) }
  sh.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); return g
}

// tiers: [bowl y, bowl rim radius, column height under it]
const TIERS = [{ y: 2.15, r: 3.8, col: 1.6 }, { y: 3.95, r: 2.35, col: 1.2 }, { y: 5.45, r: 1.3, col: 0.95 }]
const rimY = (t: typeof TIERS[number]) => t.y + 0.82 * (t.r / 3.8), waterY = (t: typeof TIERS[number]) => t.y + 0.7 * (t.r / 3.8)
const BASIN_WATER = 0.62

function Teapot() {
  // the café's own teapot in stone, tipped forward, pouring into the top bowl
  return (
    <group position={[0, rimY(TIERS[2]) + 0.05, 0]} rotation={[0, 0, -0.22]}>
      <mesh position={[0, 0.62, 0]} scale={[1, 0.82, 1]} material={STATUE} castShadow><sphereGeometry args={[0.7, 28, 20]} /></mesh>
      <mesh position={[0, 0.12, 0]} material={STATUE}><cylinderGeometry args={[0.42, 0.5, 0.18, 24]} /></mesh>
      <mesh position={[0, 1.18, 0]} material={STATUE}><cylinderGeometry args={[0.36, 0.46, 0.14, 24]} /></mesh>
      <mesh position={[0, 1.36, 0]} material={STATUE}><sphereGeometry args={[0.15, 14, 10]} /></mesh>
      <mesh position={[0.78, 0.68, 0]} rotation={[0, 0, -0.95]} material={STATUE}><cylinderGeometry args={[0.08, 0.17, 0.75, 12]} /></mesh>
      <mesh position={[-0.72, 0.68, 0]} rotation={[0, 0, Math.PI / 2]} material={STATUE}><torusGeometry args={[0.3, 0.07, 10, 20, Math.PI]} /></mesh>
    </group>
  )
}

/** the grand fountain (14 m across, ~7.6 m tall) */
function GrandFountain() {
  const arcs = useRef<THREE.Group>(null), ripples = useRef<THREE.Group>(null)
  const geos = useMemo(() => {
    const out = {
      cap: capstoneGeo(F.r, F.r - 0.85),
      bowls: TIERS.map((t) => bowlGeo(t.r)),
      cols: TIERS.map((t, i) => columnGeo(t.col + 0.2, i === 0 ? 0.95 : i === 1 ? 0.55 : 0.36)),
      // curtains: from each bowl's rim down to the water below it, flaring a little
      curtains: TIERS.map((t, i) => { const below = i === 0 ? BASIN_WATER : waterY(TIERS[i - 1]), h = rimY(t) - below; const g = new THREE.CylinderGeometry(t.r + 0.02, t.r + 0.35 + h * 0.06, h, 48, 1, true); g.translate(0, below + h / 2, 0); return g }),
      // eight arcs from the statues on the rim into the basin
      arc: (() => { const a = new THREE.Vector3(F.r - 0.75, 1.55, 0), b = new THREE.Vector3(4.6, BASIN_WATER, 0), m = new THREE.Vector3((a.x + b.x) / 2, 3.0, 0)
        return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 20, 0.045, 6) })(),
      pour: (() => { const a = new THREE.Vector3(0.9, rimY(TIERS[2]) + 0.95, 0), b = new THREE.Vector3(0.75, waterY(TIERS[2]), 0), m = new THREE.Vector3(1.25, rimY(TIERS[2]) + 0.8, 0)
        return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 14, 0.09, 8) })(),
    }
    return out
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (fallTex) fallTex.offset.y = (t * 0.9) % 1
    const rp = ripples.current
    if (rp) rp.children.forEach((c, i) => { const k = (t * 0.6 + i * 0.37) % 1; c.scale.setScalar(0.4 + k * 1.6); ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k) })
  })
  const statues = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8)
  return (
    <group position={[FX, 0, FZ]}>
      {/* the basin: an octagonal stone wall, bevelled capstones, water inside */}
      <mesh position={[0, 0.36, 0]} rotation={[0, Math.PI / 8, 0]} material={STONE_WALL} castShadow receiveShadow><cylinderGeometry args={[F.r - 0.05, F.r + 0.1, 0.72, 8, 1, true]} /></mesh>
      <mesh position={[0, 0.66, 0]} geometry={geos.cap} material={STONE_PALE} castShadow />
      <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 8, 0]} material={STONE}><cylinderGeometry args={[F.r + 0.35, F.r + 0.45, 0.12, 8]} /></mesh>
      <mesh position={[0, BASIN_WATER, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]} material={WATER}><circleGeometry args={[F.r - 0.6, 8]} /></mesh>
      {/* three tiers */}
      {TIERS.map((t, i) => (
        <group key={i}>
          <mesh position={[0, (i === 0 ? BASIN_WATER - 0.1 : waterY(TIERS[i - 1]) - 0.05), 0]} geometry={geos.cols[i]} material={STONE} castShadow />
          <mesh position={[0, t.y, 0]} geometry={geos.bowls[i]} material={STONE_PALE} castShadow receiveShadow />
          <mesh position={[0, waterY(t) + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={WATER}><circleGeometry args={[t.r * 0.9, 36]} /></mesh>
          <mesh geometry={geos.curtains[i]} material={FALL} />
          <mesh position={[0, (i === 0 ? BASIN_WATER : waterY(TIERS[i - 1])) + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={FOAM}><ringGeometry args={[t.r + 0.1, t.r + 0.6, 40]} /></mesh>
        </group>
      ))}
      <Teapot />
      <mesh geometry={geos.pour} material={FALL} />
      {/* eight little statues on the rim, marshmallows and notebooks in turn, each spouting an arc into the basin */}
      <group ref={arcs}>
        {statues.map((a, i) => (
          <group key={i} rotation={[0, -a, 0]}>
            {i % 2 === 0
              ? <group position={[F.r - 0.45, 0.86, 0]}><mesh position={[0, 0.42, 0]} material={STATUE} castShadow><cylinderGeometry args={[0.36, 0.38, 0.8, 18]} /></mesh><mesh position={[0, 0.84, 0]} material={STATUE}><sphereGeometry args={[0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh></group>
              : <group position={[F.r - 0.45, 0.86, 0]}><mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]} material={STATUE} castShadow><boxGeometry args={[0.22, 0.95, 0.72]} /></mesh><mesh position={[0.05, 0.5, 0]} material={STONE_PALE}><boxGeometry args={[0.16, 0.85, 0.66]} /></mesh></group>}
            <mesh geometry={geos.arc} material={ARC} />
          </group>
        ))}
      </group>
      <group ref={ripples}>
        {statues.map((a, i) => <mesh key={i} position={[Math.cos(a) * 4.6, BASIN_WATER + 0.02, Math.sin(a) * 4.6]} rotation={[-Math.PI / 2, 0, 0]} material={FOAM.clone()}><ringGeometry args={[0.25, 0.4, 20]} /></mesh>)}
      </group>
    </group>
  )
}

// ── the plaza: a round cobbled floor (cobbles laid in rings), a kerb, benches, planters, lamps ──
function Plaza() {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(0.5, F.plaza, 72, 10), p = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x); uv.setXY(i, (a + Math.PI) * r / 2.4, r / 2.4) }
    return g
  }, [])
  const kerb = useMemo(() => { const n = 64, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.14, 0.32), STONE, n), m = new THREE.Matrix4(), q = new THREE.Quaternion()
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2); m.compose(new THREE.Vector3(FX + Math.cos(a) * F.plaza, 0.07, FZ + Math.sin(a) * F.plaza), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m) }
    im.receiveShadow = true; return im }, [])
  return (
    <group>
      <mesh geometry={geo} material={paveMat('plaza')} position={[FX, 0.045, FZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
      <primitive object={kerb} />
    </group>
  )
}

function Bench({ x, z, face }: { x: number; z: number; face: number }) {
  return (
    <group position={[x, 0.05, z]} rotation={[0, face, 0]}>
      <RBox size={[2.2, 0.12, 0.6]} pos={[0, 0.5, 0]} color={C.wood} r={0.04} />
      <RBox size={[2.2, 0.55, 0.1]} pos={[0, 0.85, -0.28]} color={C.wood} r={0.04} />
      {[-0.95, 0.95].map((bx) => <mesh key={bx} position={[bx, 0.25, 0]} material={mat(C.plum)}><boxGeometry args={[0.08, 0.5, 0.5]} /></mesh>)}
    </group>
  )
}
// a round stone planter brimming with flowers (the flowers are instanced with the beds)
function Planter({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.32, 0]} material={STONE} castShadow><cylinderGeometry args={[0.85, 0.7, 0.64, 20]} /></mesh>
      <mesh position={[0, 0.66, 0]} material={STONE_PALE}><torusGeometry args={[0.82, 0.08, 8, 24]} /></mesh>
      <mesh position={[0, 0.63, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#6e5038')}><circleGeometry args={[0.78, 20]} /></mesh>
    </group>
  )
}
// a park lamp: smaller and fancier than the street ones (glows at night with the same shared material)
function ParkLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.2, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.2, 0.26, 0.4, 10]} /></mesh>
      <mesh position={[0, 1.9, 0]} material={mat(C.plum)} castShadow><cylinderGeometry args={[0.06, 0.09, 3.4, 8]} /></mesh>
      <mesh position={[0, 3.75, 0]} material={glow()}><sphereGeometry args={[0.32, 14, 10]} /></mesh>
      <mesh position={[0, 4.1, 0]} material={mat(C.plum)}><coneGeometry args={[0.36, 0.3, 8]} /></mesh>
      <Billboard position={[0, 3.75, 0]}><mesh material={nightGlow}><planeGeometry args={[2.2, 2.2]} /></mesh></Billboard>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={nightGlow}><planeGeometry args={[6, 6]} /></mesh>
    </group>
  )
}

// ── the pond ──
const shape = (loop: [number, number][]) => { const s = new THREE.Shape(); loop.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); return new THREE.ShapeGeometry(s, 4) }
function Pond() {
  const geos = useMemo(() => ({ bank: shape(pondLoop(72, 1.1)), water: shape(pondLoop(72, 0)), deep: shape(pondLoop(72, -1.3).map(([x, z]) => [x, z]) as [number, number][]) }), [])
  const ducks = useRef<THREE.Group>(null)
  const pads = useMemo(() => { const r = rng(808), loop = pondLoop(40, -0.9), out: { x: number; z: number; s: number; a: number; flower: boolean }[] = []
    for (let i = 0; i < 26; i++) { const [px, pz] = loop[Math.floor(r() * loop.length)], k = r() * 0.6; const x = px + (POND.x - px) * k * 0.4, z = pz + (POND.z - pz) * k
      if (Math.abs(x - BRIDGE.x) < 2.2) continue; out.push({ x, z, s: 0.32 + r() * 0.3, a: r() * 6.28, flower: r() < 0.25 }) }
    return out }, [])
  const reeds = useMemo(() => { const r = rng(909), loop = pondLoop(60, 0.1), out: { x: number; z: number; h: number; lean: number }[] = []
    for (const k of [4, 11, 26, 33, 41, 52, 57]) for (let i = 0; i < 12; i++) { const [px, pz] = loop[(k + Math.floor(r() * 3)) % loop.length]; out.push({ x: px + (r() - 0.5) * 1.3, z: pz + (r() - 0.5) * 1.1, h: 1.0 + r() * 0.9, lean: (r() - 0.5) * 0.25 }) }
    return out }, [])
  const reedMeshes = useMemo(() => {
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.03, 1, 5), mat('#6f9a4c'), reeds.length)
    const head = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), mat('#7a5233'), reeds.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
    reeds.forEach((rd, i) => { q.setFromEuler(e.set(rd.lean, 0, rd.lean * 0.6)); m.compose(new THREE.Vector3(rd.x, rd.h / 2, rd.z), q, new THREE.Vector3(1, rd.h, 1)); stem.setMatrixAt(i, m)
      const top = new THREE.Vector3(0, rd.h * 0.42, 0).applyQuaternion(q); m.compose(new THREE.Vector3(rd.x + top.x, rd.h / 2 + top.y, rd.z + top.z), q, new THREE.Vector3(1, 1, 1)); head.setMatrixAt(i, rd.h > 1.3 ? m : new THREE.Matrix4().makeScale(0, 0, 0)) })
    return [stem, head]
  }, [reeds])
  const padMeshes = useMemo(() => {
    const pad = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 16, 0.3, Math.PI * 1.8), mat('#5f9e48'), pads.length)
    const fl = new THREE.InstancedMesh(new THREE.ConeGeometry(0.14, 0.16, 6), mat('#ffb3cf'), pads.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
    pads.forEach((p, i) => { q.setFromEuler(e.set(-Math.PI / 2, 0, p.a)); m.compose(new THREE.Vector3(p.x, 0.075, p.z), q, new THREE.Vector3(p.s, p.s, p.s)); pad.setMatrixAt(i, m)
      fl.setMatrixAt(i, p.flower ? new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0.15, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), new THREE.Vector3(1, 1, 1)) : new THREE.Matrix4().makeScale(0, 0, 0)) })
    return [pad, fl]
  }, [pads])
  const lobes = [[POND.x - POND.a * 0.55, 2.6, 1.4], [POND.x + POND.a * 0.55, 2.4, 1.2], [POND.x - POND.a * 0.6, 1.6, 0.9]]
  useFrame(({ clock }) => {
    const d = ducks.current; if (!d) return
    d.children.forEach((c, i) => { const [cx, rx, rz] = lobes[i], a = clock.elapsedTime * (0.18 + i * 0.05) + i * 2; c.position.set(cx + Math.cos(a) * rx, 0.06, POND.z + Math.sin(a) * rz); c.rotation.y = -a + Math.PI })
  })
  return (
    <group>
      <mesh geometry={geos.bank} material={SAND} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
      <mesh geometry={geos.water} material={POND_WATER} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={geos.deep} material={POND_DEEP} position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {reedMeshes.map((m, i) => <primitive key={'r' + i} object={m} />)}
      {padMeshes.map((m, i) => <primitive key={'p' + i} object={m} />)}
      <group ref={ducks}>{lobes.map((_, i) => (
        <group key={i}>
          <mesh position={[0, 0.16, 0]} scale={[1, 0.8, 1.3]} material={mat(i === 1 ? '#8a6b4a' : '#fff6e0')}><sphereGeometry args={[0.24, 12, 10]} /></mesh>
          <mesh position={[0, 0.4, 0.22]} material={mat(i === 1 ? '#3f7d4f' : '#fff6e0')}><sphereGeometry args={[0.13, 10, 8]} /></mesh>
          <mesh position={[0, 0.38, 0.36]} rotation={[Math.PI / 2, 0, 0]} material={mat('#f2a33a')}><coneGeometry args={[0.05, 0.13, 8]} /></mesh>
        </group>))}</group>
      <Bridge />
    </group>
  )
}

// an arched wooden bridge over the pond's narrow middle (you walk up and over it: see groundY)
function Bridge() {
  const L = 3.3, n = 22
  const rails = useMemo(() => [-1, 1].map((s) => { const pts = Array.from({ length: 13 }, (_, i) => { const z = -L - 0.3 + (i / 12) * (L * 2 + 0.6); return new THREE.Vector3(s * (BRIDGE.w / 2 - 0.05), groundY(BRIDGE.x, POND.z + Math.max(-L + 0.01, Math.min(L - 0.01, z))) + 0.95, z) })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.06, 6) }), [])
  return (
    <group position={[BRIDGE.x, 0, POND.z]}>
      {Array.from({ length: n }, (_, i) => { const z = -L + (i + 0.5) * (2 * L / n), y = groundY(BRIDGE.x, POND.z + z), y2 = groundY(BRIDGE.x, POND.z + z + 0.01), tilt = -Math.atan2(y2 - y, 0.01)
        return <mesh key={i} position={[0, y - 0.05, z]} rotation={[tilt, 0, 0]} material={i % 3 ? WOOD : WOOD_DARK} castShadow receiveShadow><boxGeometry args={[BRIDGE.w, 0.1, 2 * L / n - 0.03]} /></mesh> })}
      {/* posts and curved handrails */}
      {[-1, 1].flatMap((s) => [-L, -L / 2, 0, L / 2, L].map((z) => <mesh key={s + ':' + z} position={[s * (BRIDGE.w / 2 - 0.05), groundY(BRIDGE.x, POND.z + Math.max(-L + 0.01, Math.min(L - 0.01, z))) + 0.45, z]} material={WOOD_DARK}><boxGeometry args={[0.12, 1.0, 0.12]} /></mesh>))}
      {rails.map((g, i) => <mesh key={i} geometry={g} material={WOOD} />)}
    </group>
  )
}

// ── paths (points in layout units) ──
const COBBLE_IN: [number, number][] = [[-5.6, 37.5], [-8.6, 37.7], [-11.6, 38.7], [-14.4, 39.8], [-16.4, 40.3]]
const LOOP: [number, number][] = [pol(166, 8.6), [-36.4, 47.6], [-39.0, 52.8], [-39.6, 57.4], [-37.4, 61.2], [-31.5, 61.9], [-24.6, 61.9], [-17.5, 61.9], [-11.8, 61.0], [-9.4, 57.2], [-9.6, 52.6], [-11.6, 48.6], pol(22, 8.6)]
const BRIDGE_IN: [number, number][] = [[FX, FZ + F.plaza - 0.4], [FX, POND.z - 3.2]]
const BRIDGE_OUT: [number, number][] = [[FX, POND.z + 3.2], [FX, 61.6]]

// benches round the plaza (degrees; 90 = towards the pond), and two on the back path facing the water
const PLAZA_BENCH = [-55, -125, 55, 125, -160]
const BACK_BENCH: [number, number][] = [[-31.5, 63.0], [-17.8, 63.0]]
const PLANTERS = [-112, -68, 68, 112].map((d) => pol(d, 8.3))
const LAMPS = [[...pol(-32, 8.5)], [...pol(-148, 8.5)], [...pol(36, 8.5)], [...pol(146, 8.5)], [-39.6, 50.5], [-9.4, 50.5], [-37, 62.6], [-12, 62.6]] as [number, number][]
const TREES: [number, number, number, number, string?][] = [[-39.6, 36.6, 8.5, 1, '#f2a9c9'], [-40.0, 45.0, 9.5, 2], [-10.2, 45.5, 8.8, 3, '#d7b4ef'], [-9.0, 34.8, 7.5, 4], [-41.0, 61.6, 9, 0], [-8.6, 61.8, 8.6, 2, '#f2a9c9']]
for (const [x, z] of TREES) S.trees.push([x, z, 2.4])

// flower beds, shrubs and tufts: clustered where they mean something (by benches, along the railing, at path edges)
function useGreenery() {
  return useMemo(() => {
    const r = rng(1919), by = new Map<string, Spot[]>(), add = (f: string, s: Spot) => { if (!by.has(f)) by.set(f, []); by.get(f)!.push(s) }
    const cluster = (x: number, z: number, n: number, rad: number, files: string[], h: [number, number]) => { for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad; add(files[Math.floor(r() * files.length)], { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, h: h[0] + r() * (h[1] - h[0]), rot: r() * 6.28 }) } }
    const FL = ['nature/Flower_3_Group.gltf', 'nature/Flower_4_Group.gltf']
    for (const [x, z] of PLANTERS) cluster(x, z, 5, 0.45, FL, [0.5, 0.75])
    for (const [x, z] of PLANTERS) add('nature/Flower_4_Group.gltf', { x, z, h: 0.7, y: 0.6 })
    for (const d of PLAZA_BENCH) { const [x, z] = pol(d, 9.7); cluster(x, z, 6, 0.9, FL, [0.4, 0.6]) }                // flowers behind each bench
    cluster(-37.8, 41.0, 14, 1.6, FL, [0.45, 0.7]); cluster(-11.2, 41.8, 12, 1.4, FL, [0.45, 0.7])                   // two round beds
    cluster(-37.8, 41.0, 3, 0.6, ['nature/Bush_Common_Flowers.gltf'], [1.0, 1.3]); cluster(-11.2, 41.8, 2, 0.5, ['nature/Bush_Common_Flowers.gltf'], [0.9, 1.2])
    for (let x = PARK.x0 + 1; x < PARK.x0 + 2; x++) for (let z = 34; z < 62; z += 2.2 + r() * 1.4) add(r() < 0.3 ? 'nature/Bush_Common_Flowers.gltf' : 'nature/Bush_Common.gltf', { x: x + (r() - 0.5) * 0.6, z, h: 1.3 + r() * 0.6, rot: r() * 6.28 }) // a hedge along the west side
    for (let z = 33.8; z < 63; z += 1.5) if (z < PARK.side[0] - 0.3 || z > PARK.side[1] + 0.3) add('nature/Bush_Common.gltf', { x: PARK.x1 - 0.5, z, h: 1.1 + r() * 0.3, rot: r() * 6.28 }) // a clipped hedge on the side street
    for (const [x, z] of [[-36.8, 52.6], [-12.4, 53.4], [-39, 60], [-10, 60.4]]) cluster(x, z, 5, 1.2, ['nature/Fern_1.gltf', 'nature/Grass_Wispy_Short.gltf'], [0.5, 0.9]) // ferns by the pond
    for (const pts of [LOOP, COBBLE_IN]) for (let i = 0; i < pts.length - 1; i++) if (r() < 0.7) { const [x, z] = pts[i], [x2, z2] = pts[i + 1], s = r() < 0.5 ? 1 : -1, tx = x2 - x, tz = z2 - z, l = Math.hypot(tx, tz) || 1
      cluster(x + tx * 0.5 - (tz / l) * s * 1.6, z + tz * 0.5 + (tx / l) * s * 1.6, 4, 0.5, ['nature/Grass_Common_Short.gltf', 'nature/Clover_1.gltf'], [0.25, 0.45]) } // tufts at path edges
    // rocks and pebbles on the pond's bank
    const bank = pondLoop(30, 0.6)
    bank.forEach(([x, z], i) => { if (Math.abs(x - BRIDGE.x) < 2) return; if (i % 4 === 0) add(['nature/Rock_Medium_1.gltf', 'nature/Rock_Medium_2.gltf', 'nature/Rock_Medium_3.gltf'][i % 3], { x, z, h: 0.45 + r() * 0.5, rot: r() * 6.28 })
      else add(`nature/Pebble_Round_${1 + (i % 5)}.gltf`, { x: x + (r() - 0.5) * 0.6, z: z + (r() - 0.5) * 0.6, h: 0.12 + r() * 0.1, rot: r() * 6.28 }) })
    return [...by.entries()]
  }, [])
}

// ── townsfolk: on benches, chatting by the fountain, reading by the pond, feeding the ducks, a picnic, two walkers ──
const SAY = ['what a day ☀️', 'the fountain is so pretty', 'tried the new café?', 'my feet hurt 😅', 'look, ducks! 🦆', 'one more lap?', 'I love this bench', 'shh, I\'m reading 📖', 'ice cream later?', 'mmm, sunshine', 'the teapot! 🫖', 'listen to the water']
const day = () => { const t = hourNow(); return t > 8 && t < 20.5 }
type Hang = { spec: FolkSpec; x: number; z: number; face: number; pose: Pose; y: number; walk?: [number, number][]; speed?: number }
function Hanger({ h, i }: { h: Hang; i: number }) {
  const bubble = useRef<HTMLDivElement>(null), g = useRef<THREE.Group>(null)
  const me = useMemo(() => ({ x: h.x, z: h.z, kind: (h.spec.kind === 'mallow' ? 'mallow' : 'paper') as 'mallow' | 'paper', chatty: day }), [h])
  const route = useMemo(() => { if (!h.walk) return null; const c = new THREE.CatmullRomCurve3(h.walk.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal'); return { c, len: c.getLength() } }, [h])
  useEffect(() => registerTalker(`park${i}`, me), [me, i])
  useFrame(({ clock }) => {
    const gr = g.current; if (!gr) return
    gr.visible = day()
    if (route) { const u = ((clock.elapsedTime * (h.speed ?? 1.1)) / route.len + i * 0.37) % 1, p = route.c.getPointAt(u), q = route.c.getPointAt((u + 0.002) % 1)
      gr.position.set(p.x, groundY(p.x, p.z), p.z); gr.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); me.x = p.x; me.z = p.z }
    const b = bubble.current; if (!b) return
    const k = (clock.elapsedTime + i * 2.7) % 9, txt = k < 2.4 && !route ? SAY[(i + Math.floor(clock.elapsedTime / 9)) % SAY.length] : ''
    if (b.textContent !== txt) b.textContent = txt; b.style.opacity = txt ? '1' : '0'
  })
  return (
    <group ref={g} position={[h.x, h.y, h.z]} rotation={[0, h.face, 0]}>
      <group scale={SCALE}><Townsperson spec={h.spec} pose={h.pose} phase={i * 1.7} /></group>
      {!h.walk && <Html zIndexRange={[19, 0]} position={[0, 3.2, 0]} center distanceFactor={14}><div ref={bubble} className="chat" /></Html>}{/* bubbles only for the ones sitting / standing to chat (fewer DOM overlays) */}
    </group>
  )
}

function Picnic() {
  return (
    <group position={[-37.4, 0.04, 47.6]} rotation={[0, 0.3, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat('#f6c3d3')}><planeGeometry args={[2.6, 2.0]} /></mesh>
      {[-0.65, 0, 0.65].map((x) => <mesh key={x} position={[x, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#fff6ee')}><planeGeometry args={[0.22, 2.0]} /></mesh>)}
      <RBox size={[0.6, 0.38, 0.42]} pos={[0.5, 0.19, -0.4]} color="#c58a4f" r={0.06} />
    </group>
  )
}

export function ParkLife() {
  const greens = useGreenery()
  const hang = useMemo<Hang[]>(() => {
    const out: Hang[] = [], face = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z)
    const sit = (spec: FolkSpec, x: number, z: number, f: number, onGround = false) => out.push({ spec, x, z, face: f, pose: 'sit', y: (onGround ? 0.08 : 0.57) - seatHip(spec) * SCALE * (onGround ? 0.55 : 1) })
    ;[-55, 125, -160].forEach((d, k) => { const [x, z] = pol(d, 8.25); sit(folk(k % 2 ? 'paper' : 'mallow', 11 + k * 7), x, z, face(x, z, FX, FZ)) })
    { const [x, z] = pol(55, 8.25); sit(folk('paper', 41), x, z, face(x, z, FX, FZ)) } // the reader
    // two pairs chatting at the basin's edge
    ;[[-20, 0], [200, 1]].forEach(([d, k0]) => { const [cx, cz] = pol(d, 8.0), a = (d * Math.PI) / 180, tx = -Math.sin(a), tz = Math.cos(a)
      ;[-0.9, 0.9].forEach((o, j) => { const x = cx + tx * o, z = cz + tz * o; out.push({ spec: folk(j ? 'mallow' : 'paper', 23 + k0 * 9 + j * 5), x, z, face: face(x, z, cx - tx * o, cz - tz * o), pose: 'wait', y: 0.05 }) }) })
    // by the pond: feeding the ducks, and on the back bench
    out.push({ spec: folk('mallow', 57), x: -31.2, z: 52.4, face: face(-31.2, 52.4, -31.2, 56), pose: 'wait', y: 0.02 })
    sit(folk('paper', 63), BACK_BENCH[1][0], BACK_BENCH[1][1] - 0.1, Math.PI)
    // a picnic on the west lawn
    sit(folk('mallow', 71), -38.3, 48.4, face(-38.3, 48.4, -37.4, 47.6), true); sit(folk('paper', 77), -36.5, 46.9, face(-36.5, 46.9, -37.4, 47.6), true)
    // two walkers doing laps of the gravel loop
    out.push({ spec: folk('paper', 83), x: LOOP[1][0], z: LOOP[1][1], face: 0, pose: 'walk', y: 0, walk: LOOP, speed: 1.0 })
    out.push({ spec: folk('mallow', 89), x: LOOP[6][0], z: LOOP[6][1], face: 0, pose: 'walk', y: 0, walk: [...LOOP].reverse(), speed: 0.85 })
    return out
  }, [])
  useFrame(({ clock }) => { murmurTick(clock.elapsedTime); ambientTick(clock.elapsedTime) })
  return (
    <group>
      <Plaza />
      <GrandFountain />
      <Pond />
      <Path pts={COBBLE_IN} w={2.6} kind="cobble" tile={2.2} />
      <Path pts={LOOP} w={1.9} kind="gravel" tile={2.5} />
      <Path pts={BRIDGE_IN} w={2.3} kind="gravel" tile={2.5} />
      <Path pts={BRIDGE_OUT} w={2.3} kind="gravel" tile={2.5} />
      <Path pts={[[FX, PARK.z0 - 0.1], [FX, FZ - F.plaza + 0.4]]} w={4.6} kind="plaza" tile={2.4} y={0.04} />
      {PLAZA_BENCH.map((d) => { const [x, z] = pol(d, 8.25); return <Bench key={d} x={x} z={z} face={Math.atan2(FX - x, FZ - z)} /> })}
      {BACK_BENCH.map(([x, z]) => <Bench key={x} x={x} z={z} face={Math.PI} />)}
      {PLANTERS.map(([x, z], i) => <Planter key={i} x={x} z={z} />)}
      {LAMPS.map(([x, z], i) => <ParkLamp key={i} x={x} z={z} />)}
      {TREES.map(([x, z, h, k, tint], i) => <NiceTree key={i} x={x} z={z} h={h} kind={k} tint={tint} />)}
      {greens.map(([file, items]) => <Instanced key={file} file={file} items={items} />)}
      <Picnic />
      {hang.map((h, i) => <Hanger key={i} h={h} i={i} />)}
    </group>
  )
}
