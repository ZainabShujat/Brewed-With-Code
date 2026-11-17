import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PriorityQueue } from '../systems/queue'
import { anim } from '../systems/anim'
import { mat } from './mats'
import { useShop } from '../systems/shop'
import { TABLES } from './layout'
import { useDay } from '../systems/day'

// reels (embed) keep the old queue look: numbers over heads, everyone leaves after being served
const EMBED = typeof location !== 'undefined' && location.search.includes('embed')
// two stools per table (FURN 1.3 scale): where a seated customer's body goes, and which way they face
// the café table set has four chairs, two on each long side, facing the table (FURN 1.6 scale)
const SEATS = TABLES.flatMap(([x, z]) => [-0.56, 0.56].flatMap((dx) => [{ x: x + dx, z: z - 0.68, face: 0 }, { x: x + dx, z: z + 0.68, face: Math.PI }]))
const away = (st: { z: number; face: number }, d: number) => st.z + (st.face === 0 ? -d : d) // a step back from the chair
const taken = new Set<number>()

// Customers walk in the front door, join the line at the counter (a FIFO queue), get served
// at the front, then walk out. Fixed pool of bodies so nothing re-renders mid-reel (frame-exact).
const POOL = 8
const DOOR: [number, number] = [0, 13.3] // the pot's front door (round room, radius 14)
const IN_LANE = 2.6, OUT_LANE = 3.1
// line slots, front (at the counter) first, stretching back toward the door
export const SLOTS: [number, number][] = Array.from({ length: 6 }, (_, i) => [1.8, -5.3 + i * 1.15])

type Phase = 'off' | 'in' | 'line' | 'out' | 'seat' | 'sit'
export type Cust = { id: number; phase: Phase; pos: THREE.Vector3; path: THREE.Vector3[]; look: number; served: number; hurry: boolean; seat: number; sitT: number; patience: number }

export const LOOKS = [
  { shirt: '#6fe0c4', hair: '#3b2a22', skin: '#f6cdb4' }, { shirt: '#ffcf5c', hair: '#1d1838', skin: '#c98a62' },
  { shirt: '#c99cff', hair: '#7a3b2a', skin: '#f1c9a5' }, { shirt: '#ff9a78', hair: '#2b2024', skin: '#8d5a3b' },
  { shirt: '#9fd8ff', hair: '#5a3166', skin: '#f6cdb4' }, { shirt: '#ff7fb6', hair: '#3b2a22', skin: '#d9a07a' },
  { shirt: '#b3dd97', hair: '#1d1838', skin: '#f1c9a5' }, { shirt: '#f7d77a', hair: '#7a3b2a', skin: '#c98a62' },
]

const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)

// shared state: the pool, the queue, and controls (used by the game loop and by reel pages)
export const cafe = {
  pool: Array.from({ length: POOL }, (_, id): Cust => ({ id, phase: 'off', pos: V(...DOOR), path: [], look: id % LOOKS.length, served: 0, hurry: false, seat: -1, sitT: 0, patience: 1 })),
  line: new PriorityQueue<Cust>(),   // in-a-hurry customers (priority 1) go ahead of normal ones (0)
  hurryChance: 0.2,
  auto: false,            // normal game: customers keep arriving and getting served on their own
  spawnEvery: 3.2, serveEvery: 3.8, _spawnT: 0, _serveT: 0,
  spawn(hurry?: boolean) {
    const c = this.pool.find((p) => p.phase === 'off'); if (!c || this.line.size >= SLOTS.length) return false
    c.phase = 'in'; c.pos.copy(V(...DOOR)); c.served = 0; c.patience = 1
    c.hurry = hurry ?? Math.random() < this.hurryChance
    this.line.enqueue(c, c.hurry ? 1 : 0)               // ← joins the line by urgency (the back, unless in a hurry)
    c.path = [V(IN_LANE, 11.4), V(IN_LANE, 1.2)]
    anim.doorIn = 1
    return true
  },
  serve() {
    const c = this.line.dequeue(); if (!c) return false  // ← the front of the line leaves first
    // most customers take their drink to a free table and sit a while; in-a-hurry ones take it to go
    const free = SEATS.map((_, i) => i).filter((i) => !taken.has(i))
    if (!EMBED && !c.hurry && free.length && Math.random() < 0.75) {
      const i = free[Math.floor(Math.random() * free.length)], st = SEATS[i]; taken.add(i)
      c.phase = 'seat'; c.seat = i
      c.path = [V(OUT_LANE, c.pos.z), V(OUT_LANE, away(st, 0.9)), V(st.x, away(st, 0.9)), V(st.x, st.z)]
    } else { c.phase = 'out'; c.path = [V(OUT_LANE, c.pos.z), V(OUT_LANE, 11.4), V(...DOOR)] }
    return true
  },
  // reel helper: n customers already standing in line (teleported to their slots, no walk-in)
  fill(n: number) {
    for (let i = 0; i < n; i++) { if (!this.spawn(false)) break; const c = this.line.at(this.line.size - 1)!; c.path = []; c.phase = 'line'; c.pos.copy(V(...SLOTS[this.line.size - 1])) }
  },
  // who is in line, front first, with their shirt colour (for the queue strip in reels)
  order() { const out: { id: number; color: string; hurry: boolean }[] = []; for (let i = 0; i < this.line.size; i++) { const c = this.line.at(i)!; out.push({ id: c.id, color: LOOKS[c.look].shirt, hurry: c.hurry }) } return out },
  reset() { taken.clear(); this.pool.forEach((p) => { p.phase = 'off'; p.path = []; p.seat = -1 }); while (this.line.dequeue()); },
}

function Body({ c }: { c: Cust }) {
  const ref = useRef<THREE.Group>(null)
  const tag = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const hips = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null), prop = useRef<THREE.Group>(null)
  const act = c.id % 3 // what they do once seated: 0 reads a book, 1 scrolls their phone, 2 sips and chats
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
        if (!c.path.length && c.phase === 'seat') { c.phase = 'sit'; c.sitT = 0 }
      } else if (idx >= 0) {
        c.phase = 'line'
        g.rotation.y += (Math.PI - g.rotation.y) * 0.1 // face the counter
      }
    }
    const t = clock.elapsedTime
    if (c.phase === 'sit') {
      // sitting: on the stool, facing the table, sipping now and then; leaves after ~25 s
      c.sitT += dt
      const st = SEATS[c.seat]
      // seated: hips on the chair seat, thighs forward; a slight lean in towards the table
      g.position.set(st.x, 0.1, st.z); g.rotation.set(0.08 + Math.sin(t * 0.8 + c.id) * 0.02, st.face, 0)
      hips.current?.children.forEach((l) => { l.rotation.x = -Math.PI / 2 })
      // little lives: reading (head down, page turns), phone (head down, thumb taps), chatting (looking around, sipping)
      if (prop.current) { prop.current.visible = true; prop.current.children.forEach((p, i) => { p.visible = i === act }) }
      if (head.current) {
        if (act === 2) { head.current.rotation.set(Math.sin(t * 0.5 + c.id) * 0.08, Math.sin(t * 0.35 + c.id) * 0.6, 0) }
        else head.current.rotation.set(0.35 + Math.sin(t * 0.3 + c.id) * 0.04, Math.sin(t * 0.17 + c.id) * 0.12, 0)
      }
      const cup = prop.current?.children[2]; if (cup) cup.position.y = 1.0 + Math.max(0, Math.sin(t * 0.6 + c.id) - 0.85) * 3.2 // a sip now and then
      if (c.sitT > 22 + (c.id % 4) * 3) { taken.delete(c.seat); c.seat = -1; c.phase = 'out'; c.path = [V(st.x, away(st, 0.9)), V(OUT_LANE, away(st, 0.9)), V(OUT_LANE, 11.4), V(...DOOR)] }
      if (tag.current) tag.current.style.opacity = '0'
      if (bubble.current && bubble.current.textContent) bubble.current.textContent = ''
      return
    }
    if (prop.current) prop.current.visible = false
    // standing in line: glance around now and then
    if (head.current) head.current.rotation.set(0, moving ? 0 : Math.sin(t * 0.4 + c.id * 2) * 0.45 * Math.max(0, Math.sin(t * 0.13 + c.id)), 0)
    // walking: legs swing from the hips in opposite phase, a gentle bob, no cartoon hop
    g.position.set(c.pos.x, moving ? Math.abs(Math.sin(t * 7 + c.id)) * 0.025 : 0, c.pos.z)
    g.rotation.x = 0; g.rotation.z = moving ? Math.sin(t * 7 + c.id) * 0.02 : 0
    hips.current?.children.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 7 + c.id + i * Math.PI) * 0.45 : l.rotation.x * 0.8 })
    if (!EMBED && idx >= 0 && c.phase === 'line') {
      c.patience -= dt / (c.hurry ? 45 : 80)
      if (c.patience <= 0) { cafe.line.remove(c); c.phase = 'out'; c.path = [V(OUT_LANE, c.pos.z), V(OUT_LANE, 11.4), V(...DOOR)]; useDay.getState().record('walkouts') }
    }
    if (bubble.current) {
      const o = useShop.getState().orders[c.id]; const show = !!o && idx === 0
      const mood = c.patience > 0.6 ? '🙂' : c.patience > 0.3 ? '😐' : '😠'
      const html = show ? `${mood} ${o.label}<i style="width:${Math.max(0, c.patience) * 100}%;background:${c.patience > 0.6 ? '#6ee0a0' : c.patience > 0.3 ? '#ffcf5c' : '#ff6b81'}"></i>` : ''
      if (bubble.current.dataset.h !== html) { bubble.current.innerHTML = html; bubble.current.dataset.h = html }
    }
    if (tag.current) { tag.current.textContent = idx >= 0 ? (c.hurry ? '⚡' : '') + String(idx + 1) : ''; tag.current.style.opacity = EMBED && idx >= 0 ? '1' : '0' }
  })
  return (
    <group ref={ref} visible={false}>
      {/* legs hinge at the hips: they swing when walking and fold forward when sitting */}
      <group ref={hips} position={[0, 0.58, 0]}>
        {[-0.13, 0.13].map((x) => <group key={x} position={[x, 0, 0]}><mesh position={[0, -0.28, 0]} material={mat('#4a4a5a')} castShadow><capsuleGeometry args={[0.09, 0.35, 3, 6]} /></mesh></group>)}
      </group>
      <mesh position={[0, 0.95, 0]} material={mat(look.shirt)} castShadow><capsuleGeometry args={[0.24, 0.42, 4, 10]} /></mesh>
      {/* human proportions: a head about 1/7 of the height, on a neck */}
      <group ref={head} position={[0, 1.42, 0]}><group position={[0, -1.42, 0]}>
      <mesh position={[0, 1.42, 0]} material={mat(look.skin)}><cylinderGeometry args={[0.07, 0.08, 0.14, 10]} /></mesh>
      <mesh position={[0, 1.62, 0]} scale={[1, 1.12, 1]} material={mat(look.skin)} castShadow><sphereGeometry args={[0.2, 16, 12]} /></mesh>
      <mesh position={[0, 1.7, -0.03]} scale={[1.06, 0.85, 1.08]} material={mat(look.hair)}><sphereGeometry args={[0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 1.64, 0.185]} material={mat('#2b2024')}><sphereGeometry args={[0.022, 6, 4]} /></mesh>)}
      </group></group>
      {/* things in their hands when seated */}
      <group ref={prop} visible={false}>
        <group position={[0, 1.0, 0.34]} rotation={[-0.7, 0, 0]}><mesh position={[-0.07, 0, 0]} rotation={[0, 0.25, 0]} material={mat(look.shirt === '#ffcf5c' ? '#6e3f78' : '#c4528a')}><boxGeometry args={[0.15, 0.2, 0.02]} /></mesh><mesh position={[0.07, 0, 0]} rotation={[0, -0.25, 0]} material={mat('#fff6ee')}><boxGeometry args={[0.15, 0.2, 0.02]} /></mesh></group>
        <mesh position={[0.05, 1.08, 0.3]} rotation={[-0.9, 0, 0]} material={mat('#2b2024')}><boxGeometry args={[0.08, 0.15, 0.012]} /></mesh>
        <mesh position={[0.2, 1.0, 0.3]} material={mat('#fff6ee')}><cylinderGeometry args={[0.045, 0.035, 0.09, 12]} /></mesh>
      </group>
      {EMBED && <Html position={[0, 2.35, 0]} center><div ref={tag} className="qtag" /></Html>}
      <Html position={[0, 3.0, 0]} center><div ref={bubble} className="obubble" /></Html>
    </group>
  )
}

export function Customers() {
  const pool = useMemo(() => cafe.pool, [])
  useFrame((_, dtRaw) => {
    const day = useDay.getState()
    if (!EMBED) day.tick(Math.min(dtRaw, 0.1), cafe.line.size === 0)
    if (!cafe.auto || (!EMBED && day.phase !== 'open')) return  // customers only arrive while the café is open
    const dt = Math.min(dtRaw, 0.05)
    cafe._spawnT += dt; cafe._serveT += dt
    if (cafe._spawnT > cafe.spawnEvery) { cafe._spawnT = 0; cafe.spawn() }
    const front = cafe.line.peek()
    if (front && front.phase === 'line' && cafe._serveT > cafe.serveEvery) { cafe._serveT = 0; cafe.serve() }
  })
  return <group>{pool.map((c) => <Body key={c.id} c={c} />)}</group>
}
