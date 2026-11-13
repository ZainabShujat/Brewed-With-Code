import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PriorityQueue } from '../systems/queue'
import { anim } from '../systems/anim'
import { mat } from './mats'
import { useShop } from '../systems/shop'

// Customers walk in the front door, join the line at the counter (a FIFO queue), get served
// at the front, then walk out. Fixed pool of bodies so nothing re-renders mid-reel (frame-exact).
const POOL = 8
const DOOR: [number, number] = [0, 9.4]
const IN_LANE = 2.6, OUT_LANE = 3.1
// line slots, front (at the counter) first, stretching back toward the door
export const SLOTS: [number, number][] = Array.from({ length: 6 }, (_, i) => [1.8, -5.3 + i * 1.15])

type Phase = 'off' | 'in' | 'line' | 'out'
export type Cust = { id: number; phase: Phase; pos: THREE.Vector3; path: THREE.Vector3[]; look: number; served: number; hurry: boolean }

export const LOOKS = [
  { shirt: '#6fe0c4', hair: '#3b2a22', skin: '#f6cdb4' }, { shirt: '#ffcf5c', hair: '#1d1838', skin: '#c98a62' },
  { shirt: '#c99cff', hair: '#7a3b2a', skin: '#f1c9a5' }, { shirt: '#ff9a78', hair: '#2b2024', skin: '#8d5a3b' },
  { shirt: '#9fd8ff', hair: '#5a3166', skin: '#f6cdb4' }, { shirt: '#ff7fb6', hair: '#3b2a22', skin: '#d9a07a' },
  { shirt: '#b3dd97', hair: '#1d1838', skin: '#f1c9a5' }, { shirt: '#f7d77a', hair: '#7a3b2a', skin: '#c98a62' },
]

const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)

// shared state: the pool, the queue, and controls (used by the game loop and by reel pages)
export const cafe = {
  pool: Array.from({ length: POOL }, (_, id): Cust => ({ id, phase: 'off', pos: V(...DOOR), path: [], look: id % LOOKS.length, served: 0, hurry: false })),
  line: new PriorityQueue<Cust>(),   // in-a-hurry customers (priority 1) go ahead of normal ones (0)
  hurryChance: 0.2,
  auto: false,            // normal game: customers keep arriving and getting served on their own
  spawnEvery: 3.2, serveEvery: 3.8, _spawnT: 0, _serveT: 0,
  spawn(hurry?: boolean) {
    const c = this.pool.find((p) => p.phase === 'off'); if (!c || this.line.size >= SLOTS.length) return false
    c.phase = 'in'; c.pos.copy(V(...DOOR)); c.served = 0
    c.hurry = hurry ?? Math.random() < this.hurryChance
    this.line.enqueue(c, c.hurry ? 1 : 0)               // ← joins the line by urgency (the back, unless in a hurry)
    c.path = [V(IN_LANE, 7.6), V(IN_LANE, 1.2)]
    anim.doorIn = 1
    return true
  },
  serve() {
    const c = this.line.dequeue(); if (!c) return false  // ← the front of the line leaves first
    c.phase = 'out'; c.path = [V(OUT_LANE, c.pos.z), V(OUT_LANE, 7.6), V(...DOOR)]
    return true
  },
  // reel helper: n customers already standing in line (teleported to their slots, no walk-in)
  fill(n: number) {
    for (let i = 0; i < n; i++) { if (!this.spawn(false)) break; const c = this.line.at(this.line.size - 1)!; c.path = []; c.phase = 'line'; c.pos.copy(V(...SLOTS[this.line.size - 1])) }
  },
  // who is in line, front first, with their shirt colour (for the queue strip in reels)
  order() { const out: { id: number; color: string; hurry: boolean }[] = []; for (let i = 0; i < this.line.size; i++) { const c = this.line.at(i)!; out.push({ id: c.id, color: LOOKS[c.look].shirt, hurry: c.hurry }) } return out },
  reset() { this.pool.forEach((p) => { p.phase = 'off'; p.path = [] }); while (this.line.dequeue()); },
}

function Body({ c }: { c: Cust }) {
  const ref = useRef<THREE.Group>(null)
  const tag = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const look = LOOKS[c.look]
  useFrame(({ clock }, dtRaw) => {
    const g = ref.current; if (!g) return
    const dt = Math.min(dtRaw, 0.05)
    g.visible = c.phase !== 'off'
    if (!g.visible) return
    // where should I be? line customers head to their slot (their index in the queue)
    let idx = -1
    for (let i = 0; i < cafe.line.size; i++) if (cafe.line.at(i) === c) { idx = i; break }
    let target: THREE.Vector3 | undefined = c.path[0]
    if (!target && idx >= 0) target = V(...SLOTS[idx])
    let moving = false
    if (target) {
      const d = target.clone().sub(c.pos); d.y = 0
      const dist = d.length(), step = (c.hurry ? 4.6 : 2.4) * dt // in a hurry = walks faster
      if (dist > 0.02) {
        moving = true
        c.pos.addScaledVector(d.normalize(), Math.min(step, dist))
        g.rotation.y = Math.atan2(d.x, d.z)
      } else if (c.path.length) {
        c.path.shift()
        if (!c.path.length && c.phase === 'out') { c.phase = 'off'; g.visible = false; return }
      } else {
        c.phase = 'line'
        g.rotation.y += (Math.PI - g.rotation.y) * 0.1 // face the counter
      }
    }
    const t = clock.elapsedTime
    g.position.set(c.pos.x, moving ? Math.abs(Math.sin(t * 10 + c.id)) * 0.08 : 0, c.pos.z)
    g.rotation.z = moving ? Math.sin(t * 10 + c.id) * 0.06 : 0
    if (bubble.current) { const o = useShop.getState().orders[c.id]; const txt = o && idx === 0 ? o.label : ''; if (bubble.current.textContent !== txt) bubble.current.textContent = txt }
    if (tag.current) { tag.current.textContent = idx >= 0 ? (c.hurry ? '⚡' : '') + String(idx + 1) : ''; tag.current.style.opacity = idx >= 0 ? '1' : '0' }
  })
  return (
    <group ref={ref} visible={false}>
      {[-0.13, 0.13].map((x) => <mesh key={x} position={[x, 0.3, 0]} material={mat('#4a4a5a')} castShadow><capsuleGeometry args={[0.09, 0.35, 3, 6]} /></mesh>)}
      <mesh position={[0, 0.95, 0]} material={mat(look.shirt)} castShadow><capsuleGeometry args={[0.3, 0.45, 4, 8]} /></mesh>
      <mesh position={[0, 1.65, 0]} material={mat(look.skin)} castShadow><sphereGeometry args={[0.36, 12, 10]} /></mesh>
      <mesh position={[0, 1.75, -0.05]} scale={[1.04, 0.8, 1.04]} material={mat(look.hair)}><sphereGeometry args={[0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {[-0.12, 0.12].map((x) => <mesh key={x} position={[x, 1.65, 0.33]} material={mat('#2b2024')}><sphereGeometry args={[0.04, 6, 4]} /></mesh>)}
      <Html position={[0, 2.35, 0]} center><div ref={tag} className="qtag" /></Html>
      <Html position={[0, 3.0, 0]} center><div ref={bubble} className="obubble" /></Html>
    </group>
  )
}

export function Customers() {
  const pool = useMemo(() => cafe.pool, [])
  useFrame((_, dtRaw) => {
    if (!cafe.auto) return
    const dt = Math.min(dtRaw, 0.05)
    cafe._spawnT += dt; cafe._serveT += dt
    if (cafe._spawnT > cafe.spawnEvery) { cafe._spawnT = 0; cafe.spawn() }
    const front = cafe.line.peek()
    if (front && front.phase === 'line' && cafe._serveT > cafe.serveEvery) { cafe._serveT = 0; cafe.serve() }
  })
  return <group>{pool.map((c) => <Body key={c.id} c={c} />)}</group>
}
