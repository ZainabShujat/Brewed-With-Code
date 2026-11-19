import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PriorityQueue } from '../systems/queue'
import { anim } from '../systems/anim'
import { mat } from './mats'
import { useShop } from '../systems/shop'
import { TABLES, TABLE_SCALE } from './layout'
import { useDay, DAY_LEN } from '../systems/day'
import { useTutorial } from '../systems/tutorial'
import { useGame } from '../systems/store'
import { registerTalker } from '../systems/murmur'
import { WipeFx, useWind } from '../ui/WindDown'
import { Townsperson, seatHip, type Pose } from './folk/Townsperson'
import { folk, type FolkSpec } from './folk/specs'

// reels (embed) keep the old queue look: numbers over heads, everyone leaves after being served
const EMBED = typeof location !== 'undefined' && location.search.includes('embed') && location.pathname.includes('reel')
// two stools per table (FURN 1.3 scale): where a seated customer's body goes, and which way they face
// the café table set has four chairs, two on each long side, facing the table (FURN 1.6 scale)
// the café table set has four chairs, two on each side of the table (measured from the model: ±0.74 across, ±0.38 along),
// each facing the table. `face` = which way the sitter faces (towards the table).
const K_T = TABLE_SCALE / 1.6 // the chair spots were measured on a 1.6x table set
const SEATS = TABLES.flatMap(([x, z]) => ([[-0.74, -0.38], [-0.74, 0.38], [0.74, -0.38], [0.74, 0.38]] as const).map(([dx, dz]) => ({ x: x + dx * K_T, z: z + dz * K_T, face: dx < 0 ? Math.PI / 2 : -Math.PI / 2, cx: x + dx * K_T * 0.45, cz: z + dz * K_T * 0.8 })))
/** cups guests left on the tables (pick them up for a little tip) */
export const dirty: { x: number; z: number }[] = []
// a step back from the chair (away from the table), as [x, z]
const away = (st: { x: number; z: number; face: number }, d: number): [number, number] => [st.x - Math.sin(st.face) * d, st.z - Math.cos(st.face) * d]
const taken = new Set<number>()

// Customers walk in the front door, join the line at the counter (a FIFO queue), get served
// at the front, then walk out. Fixed pool of bodies so nothing re-renders mid-reel (frame-exact).
const POOL = 8
const DOOR: [number, number] = [0, 13.3] // the pot's front door (round room, radius 14)
const IN_LANE = 2.6, OUT_LANE = 3.1
// line slots, front (at the counter) first, stretching back toward the door
export const SLOTS: [number, number][] = Array.from({ length: 6 }, (_, i) => [1.8, -5.3 + i * 1.15])

type Phase = 'off' | 'in' | 'line' | 'out' | 'seat' | 'sit'
const SIT_SAY = ['mmm ☕', 'so cozy here', 'best latte in town', '📖 one more chapter…', 'this foam! ✨', 'ahh, warm', 'did you hear about the bakery?', '😌', 'refill later?', 'love this place']
export type Cust = { refill?: 'no' | 'later' | 'ask' | 'done'; thankT?: number; byeT?: number; stay: number; id: number; phase: Phase; pos: THREE.Vector3; path: THREE.Vector3[]; look: number; served: number; hurry: boolean; seat: number; sitT: number; patience: number; spec: FolkSpec; side: number; ver: number }

export const LOOKS = [
  { shirt: '#6fe0c4', hair: '#3b2a22', skin: '#f6cdb4' }, { shirt: '#ffcf5c', hair: '#1d1838', skin: '#c98a62' },
  { shirt: '#c99cff', hair: '#7a3b2a', skin: '#f1c9a5' }, { shirt: '#ff9a78', hair: '#2b2024', skin: '#8d5a3b' },
  { shirt: '#9fd8ff', hair: '#5a3166', skin: '#f6cdb4' }, { shirt: '#ff7fb6', hair: '#3b2a22', skin: '#d9a07a' },
  { shirt: '#b3dd97', hair: '#1d1838', skin: '#f1c9a5' }, { shirt: '#f7d77a', hair: '#7a3b2a', skin: '#c98a62' },
]

const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)
// gentle start: at most 3 in line, and no patience timer on the first two days
export const MAX_LINE = 3, CALM_DAYS = 2

// Townsfolk: marshmallows live to the LEFT of the market (west, -x), notebooks to the RIGHT (east, +x). Each customer
// walks in along the pavement from their own side, comes in through the door, and goes back home the same way.
const STREET_Z = 19.6, FROM = 30, FOLK_SCALE = 1.95, SEAT_TOP = 0.672 * TABLE_SCALE / 1.6 // the chair seat's height
const inPath = (side: number) => [V(side * 2, STREET_Z), V(0, 18.4), V(0, 13.3), V(IN_LANE, 11.4), V(IN_LANE, 1.2)]
const homePath = (side: number) => [V(0, 13.3), V(0, 18.4), V(side * 2, STREET_Z), V(side * FROM, STREET_Z)]

// shared state: the pool, the queue, and controls (used by the game loop and by reel pages)
export const cafe = {
  pool: Array.from({ length: POOL }, (_, id): Cust => ({ stay: 60, id, phase: 'off', pos: V(...DOOR), path: [], look: id % LOOKS.length, served: 0, hurry: false, seat: -1, sitT: 0, patience: 1, spec: folk(id % 2 ? 'paper' : 'mallow', id * 7), side: id % 2 ? 1 : -1, ver: 0 })),
  line: new PriorityQueue<Cust>(),   // in-a-hurry customers (priority 1) go ahead of normal ones (0)
  hurryChance: 0.2,
  auto: false,            // normal game: customers keep arriving and getting served on their own
  spawnEvery: 3.2, serveEvery: 3.8, _spawnT: 0, _serveT: 0,
  spawn(hurry?: boolean) {
    const c = this.pool.find((p) => p.phase === 'off'); if (!c || this.line.size >= Math.min(SLOTS.length, MAX_LINE)) return false
    // a new townsperson each time: a marshmallow (from the west) or a notebook (from the east)
    const kind = Math.random() < 0.5 ? 'mallow' : 'paper'; c.spec = folk(kind, Math.floor(Math.random() * 50)); c.side = kind === 'mallow' ? -1 : 1; c.ver++
    c.phase = 'in'; c.served = 0; c.patience = 1
    c.pos.copy(EMBED ? V(...DOOR) : V(c.side * FROM, STREET_Z))
    c.hurry = hurry ?? Math.random() < this.hurryChance
    // ← joins the line by urgency (the back, unless in a hurry), but never ahead of someone already being served at the counter
    const front = this.line.peek()
    this.line.enqueue(c, c.hurry ? 1 : 0, front && front.phase === 'line' ? 1 : 0)
    c.path = EMBED ? [V(IN_LANE, 11.4), V(IN_LANE, 1.2)] : inPath(c.side)
    anim.doorIn = 1
    return true
  },
  serve() {
    const c = this.line.dequeue(); if (!c) return false  // ← the front of the line leaves first
    // most customers take their drink to a free table and sit a while; in-a-hurry ones take it to go
    const free = SEATS.map((_, i) => i).filter((i) => !taken.has(i))
    if (!EMBED && !c.hurry && free.length && Math.random() < 0.88) {
      const i = free[Math.floor(Math.random() * free.length)], st = SEATS[i]; taken.add(i)
      c.phase = 'seat'; c.seat = i; c.stay = 45 + Math.random() * 45 // sit, sip and hang out a good while
      const [ax, az] = away(st, 0.9); c.path = [V(OUT_LANE, c.pos.z), V(OUT_LANE, az), V(ax, az), V(st.x, st.z)]
    } else { c.phase = 'out'; c.path = [V(OUT_LANE, c.pos.z), V(OUT_LANE, 11.4), ...(EMBED ? [V(...DOOR)] : homePath(c.side))] }
    return true
  },
  // reel helper: n customers already standing in line (teleported to their slots, no walk-in)
  fill(n: number) {
    for (let i = 0; i < n; i++) { if (!this.spawn(false)) break; const c = this.line.at(this.line.size - 1)!; c.path = []; c.phase = 'line'; c.pos.copy(V(...SLOTS[this.line.size - 1])) }
  },
  // who is in line, front first, with their shirt colour (for the queue strip in reels)
  order() { const out: { id: number; color: string; hurry: boolean }[] = []; for (let i = 0; i < this.line.size; i++) { const c = this.line.at(i)!; out.push({ id: c.id, color: LOOKS[c.look].shirt, hurry: c.hurry }) } return out },
  // regulars already sitting with a drink (when the café opens, or lingering after closing)
  seed(n: number) {
    for (let k = 0; k < n; k++) {
      const c = this.pool.find((p) => p.phase === 'off'), free = SEATS.map((_, i) => i).filter((i) => !taken.has(i)); if (!c || !free.length) return
      const i = free[Math.floor(Math.random() * free.length)], st = SEATS[i]; taken.add(i)
      c.side = Math.random() < 0.5 ? -1 : 1; c.spec = folk(c.side < 0 ? 'mallow' : 'paper', Math.floor(Math.random() * 50)); c.ver++
      c.phase = 'sit'; c.seat = i; c.sitT = Math.random() * 10; c.stay = 50 + Math.random() * 50; c.path = []; c.pos.set(st.x, 0, st.z)
    }
  },
  reset() { taken.clear(); this.pool.forEach((p) => { p.phase = 'off'; p.path = []; p.seat = -1 }); while (this.line.dequeue()); },
}

function Body({ c }: { c: Cust }) {
  const ref = useRef<THREE.Group>(null)
  const tag = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const verSeen = useRef(c.ver), poseWalk = useRef(false), seatLift = useRef<THREE.Group>(null)
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
      const dist = d.length(), step = (c.hurry ? 4.6 : c.pos.z > 13 ? 4.2 : 2.4) * dt // in a hurry = walks faster; brisker out on the street
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
      const [sx, sz] = c.spec.kind === 'mallow' ? away(st, 0.22) : [st.x, st.z]; g.position.set(sx, 0, sz); g.rotation.set(0, st.face, 0) // marshmallows are wide: a bit further back
      if (seatLift.current) seatLift.current.position.y = SEAT_TOP - seatHip(c.spec) * FOLK_SCALE // hips on the chair's seat
      if (c.refill === undefined) c.refill = Math.random() < 0.3 ? 'later' : 'no'
      if (c.refill === 'later' && c.sitT > c.stay * 0.35) c.refill = 'ask'
      if (c.sitT > c.stay && (c.refill !== 'ask' || c.sitT > c.stay * 1.8)) { if (!EMBED && dirty.length < 12) dirty.push({ x: st.cx, z: st.cz }); c.refill = undefined; taken.delete(c.seat); c.seat = -1; c.phase = 'out'; c.path = [V(...away(st, 0.9)), V(OUT_LANE, away(st, 0.9)[1]), V(OUT_LANE, 11.4), ...(EMBED ? [V(...DOOR)] : homePath(c.side))] }
      if (tag.current) tag.current.style.opacity = '0'
      // a sip now and then, a little chat with whoever's at the table
      if (c.byeT && c.byeT > 0) c.byeT -= dt
      if (c.thankT && c.thankT > 0) c.thankT -= dt
      if (bubble.current) { const k = (c.sitT + c.id * 3.1) % 14, txt = c.byeT && c.byeT > 0 ? 'Night! See you tomorrow 🌙' : useWind.getState().on && !useWind.getState().done.includes('bye') ? '🌙 say goodnight?' : c.refill === 'ask' ? '☕ a refill, please?' : c.thankT && c.thankT > 0 ? 'thank you! 💛' : k < 2.2 ? SIT_SAY[(c.id + Math.floor(c.sitT / 14)) % SIT_SAY.length] : ''; if (bubble.current.textContent !== txt) { bubble.current.textContent = txt; bubble.current.innerHTML = txt } }
      return
    }
    if (seatLift.current) seatLift.current.position.y = 0
    // walking: legs swing from the hips in opposite phase, a gentle bob, no cartoon hop
    g.position.set(c.pos.x, 0, c.pos.z); g.rotation.x = 0; g.rotation.z = 0
    poseWalk.current = moving
    const g8 = useGame.getState().mode
    if (!EMBED && idx >= 0 && c.phase === 'line' && useDay.getState().day > CALM_DAYS && (g8 === 'pov' || g8 === 'cake')) { // waiting for you to take the order is free // the first days are untimed: nobody walks out while you learn
      c.patience -= dt / (c.hurry ? 45 : 80)
      if (c.patience <= 0) { cafe.line.remove(c); c.phase = 'out'; c.path = [V(OUT_LANE, c.pos.z), V(OUT_LANE, 11.4), ...(EMBED ? [V(...DOOR)] : homePath(c.side))]; useDay.getState().record('walkouts') }
    }
    if (bubble.current) {
      const o = useShop.getState().orders[c.id]; const show = !!o && idx === 0
      const mood = c.patience > 0.6 ? '🙂' : c.patience > 0.3 ? '😐' : '😠'
      const calm = useDay.getState().day <= CALM_DAYS // no patience bar while you're learning
      const html = show && calm ? `🙂 ${o.label}` : show ? `${mood} ${o.label}<i style="width:${Math.max(0, c.patience) * 100}%;background:${c.patience > 0.6 ? '#6ee0a0' : c.patience > 0.3 ? '#ffcf5c' : '#ff6b81'}"></i>` : ''
      if (bubble.current.dataset.h !== html) { bubble.current.innerHTML = html; bubble.current.dataset.h = html }
    }
    if (tag.current) { tag.current.textContent = idx >= 0 ? (c.hurry ? '⚡' : '') + String(idx + 1) : ''; tag.current.style.opacity = EMBED && idx >= 0 ? '1' : '0' }
  })
  useEffect(() => registerTalker(`cust${c.id}`, { get x() { return c.pos.x }, get z() { return c.pos.z }, get kind() { return c.spec.kind === 'mallow' ? 'mallow' : 'paper' }, chatty: () => c.phase === 'sit' || c.phase === 'line' } as never), [c])
  const [, setVer] = useState(c.ver)
  useFrame(() => { if (c.ver !== verSeen.current) { verSeen.current = c.ver; setVer(c.ver) } }) // a new townsperson took this slot
  const pose = (): Pose => c.phase === 'sit' ? 'sit' : poseWalk.current ? 'walk' : 'wait'
  return (
    <group ref={ref} visible={false}>
      <group ref={seatLift}><group scale={FOLK_SCALE}><Townsperson key={c.ver} spec={c.spec} getPose={pose} phase={c.id * 0.9} /></group></group>
      {EMBED && <Html zIndexRange={[19, 0]} position={[0, 2.35, 0]} center><div ref={tag} className="qtag" /></Html>}
      <Html zIndexRange={[19, 0]} position={[0, 3.2, 0]} center><div ref={bubble} className="obubble" /></Html>
    </group>
  )
}

// how long until the next guest: usually a quiet spell of ~35-85 s (time to wander, wipe, chat), sometimes a
// friend right behind (5-9 s); the first hour of the day is a little busier (the morning rush)
function nextGap() {
  if (useTutorial.getState().lesson < 2) return 8
  const d = useDay.getState(), rush = d.left > DAY_LEN * 0.75 ? 0.6 : 1
  return Math.random() < 0.25 ? 5 + Math.random() * 4 : (35 + Math.random() * 50) * rush
}
export function Customers() {
  const pool = useMemo(() => cafe.pool, [])
  useFrame((_, dtRaw) => {
    const day = useDay.getState()
    if (!EMBED) day.tick(Math.min(dtRaw, 0.1), cafe.line.size === 0)
    if (!cafe.auto || (!EMBED && day.phase !== 'open')) return  // customers only arrive while the café is open
    const dt = Math.min(dtRaw, 0.05)
    cafe._spawnT += dt; cafe._serveT += dt
    if (cafe._spawnT > cafe.spawnEvery) { cafe._spawnT = 0; cafe.spawn(); if (!EMBED) cafe.spawnEvery = nextGap() }
    const front = cafe.line.peek()
    if (front && front.phase === 'line' && cafe._serveT > cafe.serveEvery) { cafe._serveT = 0; cafe.serve() }
  })
  return <group>{pool.map((c) => <Body key={c.id} c={c} />)}<WipeFx /><DirtyCups /><DoorSign /></group>
}

// the cups guests left behind, on the tables
function DirtyCups() {
  const [n, setN] = useState(0)
  useFrame(() => { if (dirty.length !== n) setN(dirty.length) })
  return <group>{dirty.slice(0, n).map((d, i) => (
    <group key={i} position={[d.x, 1.13, d.z]}>
      <mesh position={[0, 0.07, 0]} material={mat('#fffaf2')}><cylinderGeometry args={[0.08, 0.06, 0.14, 14]} /></mesh>
      <mesh position={[0, 0.005, 0]} material={mat('#f0e2d0')}><cylinderGeometry args={[0.13, 0.13, 0.012, 16]} /></mesh>
      <mesh position={[0.085, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#fffaf2')}><torusGeometry args={[0.035, 0.01, 6, 10]} /></mesh>
    </group>))}</group>
}
// the hanging sign just inside the door: CLOSED until you flip it in the morning, and again at closing time
function DoorSign() {
  const phase = useDay((d) => d.phase), open = phase === 'open' || phase === 'closing'
  const label = phase === 'closing' ? 'CLOSING' : open ? 'OPEN' : 'CLOSED'
  return (
    <group position={[1.7, 2.5, 11.7]}>
      <mesh position={[0, 0.55, 0]} material={mat('#3b2a1e')}><cylinderGeometry args={[0.01, 0.01, 0.6, 4]} /></mesh>
      <mesh material={mat(open ? '#7fd6a0' : '#e98fa6')}><boxGeometry args={[1.2, 0.5, 0.05]} /></mesh>
      <Html position={[0, 0, 0]} center distanceFactor={6} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className={'doorsign' + (open ? ' open' : '')}>{label}</div></Html> {/* always faces you: readable from inside and out */}
    </group>
  )
}
if (typeof window !== 'undefined') (window as unknown as { __dirty: typeof dirty }).__dirty = dirty // tests
