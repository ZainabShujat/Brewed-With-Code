import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { STREET as S } from './streetLayout'
import { RBox } from './Soft'
import { mat } from './mats'
import { C } from '../data/palette'
import { rng, folk } from './folk/specs'
import { Townsperson, seatHip } from './folk/Townsperson'
import { Instanced, type Spot } from './Ground'
import { registerTalker } from '../systems/murmur'
import { hourNow } from '../systems/clock'

// Beyond the market's walls. At each end of the main street the road carries on through the gate, out to an
// outer road that runs along the wall (cars and a little bus drive it), you cross at a zebra, and an arch welcomes
// you into the township: Marshmallow Hollow to the west, Notebook Row to the east. Behind the café, a back garden:
// a gazebo, picnics on the lawn, flower beds, a blossom orchard and the vegetable allotments.
export const RING = { off: 14, w: 8 } // the outer road's centre is this far outside the wall, this wide
const STREET_Z = (S.padA[0] + S.padB[1]) / 2, STREET_W = S.padB[1] - S.padA[0]
const ROAD = '#6f6273', PAVE = '#e2cbbd', LINE = '#fff6ec'

function OuterRoad({ side }: { side: -1 | 1 }) {
  const rx = side * (S.X + RING.off), len = 150, z0 = 6
  return (
    <group>
      {/* the main street carried out through the gate to the outer road */}
      <mesh position={[side * (S.X + RING.off / 2), 0.03, STREET_Z]} rotation={[-Math.PI / 2, 0, 0]} material={mat(ROAD)}><planeGeometry args={[RING.off, STREET_W - 3]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[side * (S.X + RING.off / 2 - RING.w / 4), 0.05, STREET_Z + k * (STREET_W / 2 - 0.75)]} rotation={[-Math.PI / 2, 0, 0]} material={mat(PAVE)}><planeGeometry args={[RING.off - RING.w / 2, 1.5]} /></mesh>)}
      {/* the outer road, with a dashed centre line and pavements */}
      <mesh position={[rx, 0.04, z0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(ROAD)}><planeGeometry args={[RING.w, len]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[rx + k * (RING.w / 2 + 0.9), 0.06, z0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(PAVE)}><planeGeometry args={[1.8, len]} /></mesh>)}
      {Array.from({ length: 30 }, (_, i) => z0 - len / 2 + 2.5 + i * 5).filter((z) => Math.abs(z - STREET_Z) > 5).map((z) => <mesh key={z} position={[rx, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]} material={mat(LINE)}><planeGeometry args={[0.25, 2.2]} /></mesh>)}
      {/* the zebra crossing where you cross into the township */}
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[rx, 0.055, STREET_Z - 3 + i]} rotation={[-Math.PI / 2, 0, 0]} material={mat(LINE)}><planeGeometry args={[RING.w - 0.6, 0.55]} /></mesh>)}
      {/* the township's entrance arch, across the lane on the far side */}
      <TownArch x={rx + side * (RING.w / 2 + 4.5)} side={side} />
    </group>
  )
}

function TownArch({ x, side }: { x: number; side: -1 | 1 }) {
  const name = side < 0 ? 'Marshmallow Hollow' : 'Notebook Row', col = side < 0 ? '#ff9ec6' : '#8ec9e8'
  return (
    <group position={[x, 0, STREET_Z]} rotation={[0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      {[-1, 1].map((k) => <group key={k} position={[k * 4.2, 0, 0]}>
        <mesh position={[0, 2.4, 0]} material={mat(C.cream)} castShadow><cylinderGeometry args={[0.35, 0.42, 4.8, 12]} /></mesh>
        <mesh position={[0, 5.0, 0]} material={mat(col)}><sphereGeometry args={[0.55, 16, 12]} /></mesh>
      </group>)}
      <RBox size={[9.2, 0.8, 0.5]} pos={[0, 4.9, 0]} color={col} r={0.15} />
      <Html position={[0, 5.9, 0]} center distanceFactor={22} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className="townsign">{name}</div></Html> {/* one label that faces you */}
    </group>
  )
}

// ── little cars and a bus, driving the outer roads (they loop, keep their lane, and slow for the zebra) ──
const CAR_COLS = ['#ff9ec6', '#8ec9e8', '#f2c66a', '#b9e3c6', '#c9a6e6', '#ffb38a']
function Car({ col, bus = false }: { col: string; bus?: boolean }) {
  const L = bus ? 6.5 : 3.6, W = bus ? 2.3 : 1.9
  return (
    <group>
      <RBox size={[W, bus ? 1.6 : 0.9, L]} pos={[0, bus ? 1.25 : 0.75, 0]} color={col} r={0.3} />
      <RBox size={[W * 0.86, bus ? 0.9 : 0.75, bus ? L * 0.9 : L * 0.55]} pos={[0, bus ? 2.35 : 1.5, bus ? 0 : -0.2]} color="#e8f6ff" r={0.25} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * W / 2, 0.42, sz * L * 0.32]} rotation={[0, 0, Math.PI / 2]} material={mat('#3a2b3d')}><cylinderGeometry args={[0.42, 0.42, 0.3, 14]} /></mesh>))}
      <mesh position={[0, bus ? 1.2 : 0.8, L / 2 + 0.01]} material={mat('#fff6c8', { emissive: '#fff1a8' })}><boxGeometry args={[W * 0.7, 0.18, 0.04]} /></mesh>
    </group>
  )
}
type Veh = { side: -1 | 1; lane: -1 | 1; z: number; v: number; col: string; bus: boolean }
function Traffic() {
  const vehs = useMemo<Veh[]>(() => { const r = rng(808), out: Veh[] = []
    for (const side of [-1, 1] as const) for (let i = 0; i < 4; i++) out.push({ side, lane: i % 2 ? 1 : -1, z: -60 + r() * 130, v: 6 + r() * 3, col: CAR_COLS[(i + (side > 0 ? 3 : 0)) % CAR_COLS.length], bus: i === 0 })
    return out }, [])
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), h = hourNow(), busy = h > 6.5 && h < 22.5
    vehs.forEach((c, i) => { const g = refs.current[i]; if (!g) return
      g.visible = busy || i % 4 === 0
      const dir = c.lane // lane +1 drives +z, lane -1 drives -z
      const nearZebra = Math.abs(c.z - STREET_Z) < 7 && Math.sign(STREET_Z - c.z) === dir ? 0.45 : 1
      c.z += dir * c.v * nearZebra * dt
      if (c.z > 78) c.z = -66; if (c.z < -66) c.z = 78
      g.position.set(c.side * (S.X + RING.off) + c.lane * 1.9 * (c.side > 0 ? 1 : -1) * -1, 0, c.z); g.rotation.y = dir > 0 ? 0 : Math.PI })
  })
  return <group>{vehs.map((c, i) => <group key={i} ref={(g) => { refs.current[i] = g }}><Car col={c.col} bus={c.bus} /></group>)}</group>
}

// ── behind the café: the back garden ──
const BG = { x: 0, z: -32 } // centre of the lawn behind the pot
function Gazebo() {
  return (
    <group position={[BG.x, 0, BG.z]}>
      <mesh position={[0, 0.15, 0]} material={mat('#efe3d6')} receiveShadow><cylinderGeometry args={[4.2, 4.4, 0.3, 8]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return <mesh key={i} position={[Math.cos(a) * 3.7, 2.0, Math.sin(a) * 3.7]} material={mat(C.cream)} castShadow><cylinderGeometry args={[0.14, 0.16, 3.4, 10]} /></mesh> })}
      <mesh position={[0, 4.2, 0]} material={mat('#c9a6e6')} castShadow><coneGeometry args={[5.0, 1.9, 8]} /></mesh>
      <mesh position={[0, 5.3, 0]} material={mat(C.butter)}><sphereGeometry args={[0.3, 14, 10]} /></mesh>
      {/* string lights under the roof */}
      {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 3.9, 3.35, Math.sin(a) * 3.9]} material={mat('#fff1a8', { emissive: '#ffd36b' })}><sphereGeometry args={[0.09, 8, 6]} /></mesh> })}
    </group>
  )
}
function Picnic({ x, z, rot, col, folkN }: { x: number; z: number; rot: number; col: string; folkN: number[] }) {
  return (
    <group position={[x, 0.04, z]} rotation={[0, rot, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat(col)}><planeGeometry args={[3.2, 2.4]} /></mesh>
      <RBox size={[0.6, 0.4, 0.45]} pos={[0, 0.2, 0]} color="#c48a52" r={0.06} />
      {folkN.map((n, k) => { const spec = folk(n % 2 ? 'paper' : 'mallow', n), sx = (k ? 1 : -1) * 1.15
        return <PicnicFolk key={n} spec={spec} x={x} z={z} lx={sx} face={k ? -Math.PI / 2 : Math.PI / 2} i={n} /> })}
    </group>
  )
}
const PSAY = ['this is the life 🧺', 'pass the sandwiches?', 'the café latte is SO good', 'cloud looks like a cat ☁️', 'nap time 😴', 'more lemonade?']
function PicnicFolk({ spec, x, z, lx, face, i }: { spec: ReturnType<typeof folk>; x: number; z: number; lx: number; face: number; i: number }) {
  const b = useRef<HTMLDivElement>(null)
  useEffect(() => registerTalker(`picnic${i}`, { x: x + lx, z, kind: spec.kind === 'mallow' ? 'mallow' : 'paper', chatty: () => { const t = hourNow(); return t > 8 && t < 20 } }), [x, z, lx, spec, i])
  useFrame(({ clock }) => { const el = b.current; if (!el) return; const k = (clock.elapsedTime + i * 3.3) % 10, t = k < 2.4 ? PSAY[(i + Math.floor(clock.elapsedTime / 10)) % PSAY.length] : ''; if (el.textContent !== t) el.textContent = t; el.style.opacity = t ? '1' : '0' })
  return (
    <group position={[lx, -seatHip(spec) * 1.95 + 0.3, 0]} rotation={[0, face, 0]}>
      <group scale={1.95}><Townsperson spec={spec} pose="sit" phase={i} /></group>
      <Html zIndexRange={[19, 0]} position={[0, 3.0, 0]} center distanceFactor={14}><div ref={b} className="chat" /></Html>
    </group>
  )
}
function Allotments() {
  return (
    <group position={[34, 0, -34]}>
      {Array.from({ length: 6 }, (_, i) => { const x = (i % 3) * 5.2 - 5.2, z = Math.floor(i / 3) * 7 - 3.5
        return <group key={i} position={[x, 0, z]}>
          <RBox size={[4.2, 0.35, 5.6]} pos={[0, 0.17, 0]} color="#8a5a3c" r={0.08} />
          {Array.from({ length: 4 }, (_, k) => <mesh key={k} position={[-1.4 + k * 0.95, 0.5, 0]} material={mat(['#6fbf5a', '#9ad06a', '#e06a5a', '#f2a33a'][(i + k) % 4])}><boxGeometry args={[0.45, 0.35, 4.8]} /></mesh>)}
        </group> })}
      <mesh position={[9, 1.6, 0]} material={mat('#dff3ea', { opacity: 0.55 })}><boxGeometry args={[4, 3.2, 6]} /></mesh>
      <mesh position={[9, 3.4, 0]} rotation={[0, 0, Math.PI / 4]} material={mat('#dff3ea', { opacity: 0.55 })}><boxGeometry args={[2.8, 2.8, 6]} /></mesh>
    </group>
  )
}

export function Outskirts() {
  const orchard = useMemo<Spot[]>(() => { const out: Spot[] = []; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) out.push({ x: -50 + i * 5.5 + (k % 2) * 1.5, z: -24 - k * 5.5, h: 5.5 + ((i + k) % 3) * 0.6, rot: i + k }); return out }, [])
  const beds = useMemo<Spot[]>(() => { const out: Spot[] = []; for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; out.push({ x: BG.x + Math.cos(a) * 7.5, z: BG.z + Math.sin(a) * 6.5, h: 0.6, rot: a }) } return out }, [])
  return (
    <group>
      <OuterRoad side={-1} /><OuterRoad side={1} />
      <Traffic />
      <Gazebo />
      <Instanced file="nature/Flower_4_Group.gltf" items={beds} />
      <Picnic x={BG.x - 11} z={BG.z + 2} rot={0.3} col="#ff9ec6" folkN={[3, 14]} />
      <Picnic x={BG.x + 11} z={BG.z - 1} rot={-0.4} col="#8ec9e8" folkN={[27, 8]} />
      <Picnic x={BG.x + 2} z={BG.z + 10} rot={0.1} col="#f2c66a" folkN={[41, 22]} />
      <Instanced file="nature/CommonTree_3.gltf" items={orchard} tint="#ffc4dd" />
      <Allotments />
    </group>
  )
}
