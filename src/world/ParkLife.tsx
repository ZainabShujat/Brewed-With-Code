import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PARK } from './streetLayout'
import { RBox } from './Soft'
import { mat } from './mats'
import { C } from '../data/palette'
import { Townsperson, seatHip, type Pose } from './folk/Townsperson'
import { folk, type FolkSpec } from './folk/specs'
import { registerTalker, murmurTick } from '../systems/murmur'
import { hourNow } from '../systems/clock'

// The park comes alive: a fountain in the middle with a ring of benches, and townsfolk hanging out (sitting and
// chatting on the benches, standing in little groups by the water), murmuring when you walk by.
const FX = (PARK.x0 + PARK.x1) / 2 - 3.5, FZ = (PARK.z0 + PARK.z1) / 2, SCALE = 1.95 // the open middle of the park (trees are in the corners)
const BENCH_R = 6.2, FS = 1.7 // a BIG fountain
const BENCH_A = [0.2, 1.25, 2.3, 3.35, 4.4, 5.45]
const SAY = ['what a day ☀️', 'the fountain is so pretty', 'tried the new café?', 'my feet hurt 😅', 'look, ducks! 🦆', 'one more lap?', 'I love this bench', 'shh, I\'m reading 📖', 'ice cream later?', 'mmm, sunshine']

function Fountain() {
  const spray = useRef<THREE.Group>(null)
  const drops = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * Math.PI * 2, s: 0.6 + (i % 4) * 0.12, o: i / 16 })), [])
  useFrame(({ clock }) => {
    const g = spray.current; if (!g) return
    g.children.forEach((c, i) => { const d = drops[i], k = (clock.elapsedTime * 0.9 + d.o) % 1, r = 0.3 + k * 1.2 * d.s
      c.position.set(Math.cos(d.a) * r, 2.1 + Math.sin(k * Math.PI) * 1.1 - k * 0.9, Math.sin(d.a) * r); c.scale.setScalar(1 - k * 0.6) })
  })
  return (
    <group position={[FX, 0.06, FZ]} scale={[FS, FS, FS]}>
      <mesh position={[0, 0.3, 0]} material={mat('#e9dfe8', { rough: 0.6 })} castShadow><cylinderGeometry args={[2.6, 2.8, 0.6, 40]} /></mesh>
      <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#8fd0ea', { rough: 0.05, opacity: 0.85 })}><circleGeometry args={[2.35, 40]} /></mesh>
      <mesh position={[0, 1.2, 0]} material={mat('#e9dfe8')}><cylinderGeometry args={[0.35, 0.5, 1.4, 20]} /></mesh>
      <mesh position={[0, 1.95, 0]} material={mat('#e9dfe8')}><cylinderGeometry args={[1.0, 0.7, 0.25, 28]} /></mesh>
      <mesh position={[0, 2.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#8fd0ea', { rough: 0.05 })}><circleGeometry args={[0.9, 28]} /></mesh>
      <mesh position={[0, 2.45, 0]} material={mat('#ff8fb5')}><sphereGeometry args={[0.28, 16, 12]} /></mesh>
      <group ref={spray}>{drops.map((_, i) => <mesh key={i} material={mat('#cfeefa', { opacity: 0.85 })}><sphereGeometry args={[0.07, 6, 5]} /></mesh>)}</group>
      {/* a flower ring round the basin */}
      {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 3.0, 0.15, Math.sin(a) * 3.0]} material={mat(['#ff8fb5', '#f2c66a', '#c9a6e6'][i % 3])}><sphereGeometry args={[0.22, 10, 8]} /></mesh> })}
    </group>
  )
}

function Bench({ a }: { a: number }) {
  const x = FX + Math.cos(a) * BENCH_R, z = FZ + Math.sin(a) * BENCH_R, face = Math.atan2(FX - x, FZ - z)
  return (
    <group position={[x, 0.06, z]} rotation={[0, face, 0]}>
      <RBox size={[2.2, 0.12, 0.6]} pos={[0, 0.5, 0]} color={C.wood} r={0.04} />
      <RBox size={[2.2, 0.55, 0.1]} pos={[0, 0.85, -0.28]} color={C.wood} r={0.04} />
      {[-0.95, 0.95].map((bx) => <mesh key={bx} position={[bx, 0.25, 0]} material={mat(C.plum)}><boxGeometry args={[0.08, 0.5, 0.5]} /></mesh>)}
    </group>
  )
}

type Hang = { spec: FolkSpec; x: number; z: number; face: number; pose: Pose; y: number }
function Hanger({ h, i }: { h: Hang; i: number }) {
  const bubble = useRef<HTMLDivElement>(null), g = useRef<THREE.Group>(null)
  useEffect(() => registerTalker(`park${i}`, { x: h.x, z: h.z, kind: h.spec.kind === 'mallow' ? 'mallow' : 'paper', chatty: () => { const t = hourNow(); return t > 8 && t < 20.5 } }), [h, i])
  useFrame(({ clock }) => {
    if (g.current) g.current.visible = (() => { const t = hourNow(); return t > 8 && t < 20.5 })()
    const b = bubble.current; if (!b) return
    const k = (clock.elapsedTime + i * 2.7) % 9, txt = k < 2.4 ? SAY[(i + Math.floor(clock.elapsedTime / 9)) % SAY.length] : ''
    if (b.textContent !== txt) b.textContent = txt; b.style.opacity = txt ? '1' : '0'
  })
  return (
    <group ref={g} position={[h.x, h.y, h.z]} rotation={[0, h.face, 0]}>
      <group scale={SCALE}><Townsperson spec={h.spec} pose={h.pose} phase={i * 1.7} /></group>
      <Html zIndexRange={[19, 0]} position={[0, 3.2, 0]} center distanceFactor={14}><div ref={bubble} className="chat" /></Html>
    </group>
  )
}

function Pond() {
  const px = PARK.x1 - 7.2, pz = (PARK.z0 + PARK.z1) / 2
  const duck = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const d = duck.current; if (d) { const a = clock.elapsedTime * 0.25; d.position.set(px + Math.cos(a) * 1.4, 0.12, pz + Math.sin(a) * 1.0); d.rotation.y = -a } })
  return (
    <group>
      <mesh position={[px, 0.07, pz]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.75, 1]} material={mat('#6fb9d6', { rough: 0.08 })}><circleGeometry args={[2.6, 36]} /></mesh>
      <mesh position={[px, 0.065, pz]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.75, 1]} material={mat('#c9b48e')}><ringGeometry args={[2.55, 2.85, 36]} /></mesh>
      {[[0.9, 0.4], [-1.1, -0.3], [0.2, -0.9], [-0.4, 0.8]].map(([dx, dz], i) => <mesh key={i} position={[px + dx, 0.09, pz + dz]} rotation={[-Math.PI / 2, 0, i]} material={mat('#5aa35a')}><circleGeometry args={[0.32, 14, 0, Math.PI * 1.8]} /></mesh>)}
      <group ref={duck}><mesh position={[0, 0.12, 0]} material={mat('#fff6e0')}><sphereGeometry args={[0.2, 12, 10]} /></mesh>
        <mesh position={[0, 0.3, 0.14]} material={mat('#fff6e0')}><sphereGeometry args={[0.11, 10, 8]} /></mesh>
        <mesh position={[0, 0.28, 0.26]} rotation={[Math.PI / 2, 0, 0]} material={mat('#f2a33a')}><coneGeometry args={[0.04, 0.1, 8]} /></mesh></group>
    </group>
  )
}

export function ParkLife() {
  const hang = useMemo<Hang[]>(() => {
    const out: Hang[] = []
    // three sitting on benches, facing the fountain
    ;[0, 2, 4].forEach((bi, k) => { const a = BENCH_A[bi], x = FX + Math.cos(a) * (BENCH_R - 0.1), z = FZ + Math.sin(a) * (BENCH_R - 0.1)
      const spec = folk(k % 2 ? 'paper' : 'mallow', 11 + k * 7)
      out.push({ spec, x, z, face: Math.atan2(FX - x, FZ - z), pose: 'sit', y: 0.62 - seatHip(spec) * SCALE }) })
    // two little groups standing by the water, chatting
    ;[[1.75, 0], [4.85, 1]].forEach(([a, k0]) => { const cx = FX + Math.cos(a) * 5.2, cz = FZ + Math.sin(a) * 5.2, tx = -Math.sin(a), tz = Math.cos(a) // a pair, side by side along the ring
      ;[-0.9, 0.9].forEach((o, j) => { const x = cx + tx * o, z = cz + tz * o, ox = cx - tx * o, oz = cz - tz * o
        out.push({ spec: folk(j ? 'mallow' : 'paper', 23 + (k0 as number) * 9 + j * 5), x, z, face: Math.atan2(ox - x, oz - z), pose: 'wait', y: 0.06 }) }) })
    return out
  }, [])
  useFrame(({ clock }) => murmurTick(clock.elapsedTime))
  return (
    <group>
      <Fountain />
      <Pond />
      {BENCH_A.map((a) => <Bench key={a} a={a} />)}
      {hang.map((h, i) => <Hanger key={i} h={h} i={i} />)}
    </group>
  )
}
