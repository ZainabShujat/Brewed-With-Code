import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Townsperson, type Pose } from './folk/Townsperson'
import { folk, rng, type FolkSpec } from './folk/specs'
import { SHOPS, shopDoor, STREET } from './streetLayout'
import { hourNow } from '../systems/clock'

// Street life: townsfolk out and about. Marshmallows come from the WEST end of the street, notebooks from the EAST
// (that's where they live), window-shop, cross at the zebra, stop to chat in pairs, then head home. Busier at
// midday, nearly empty at night. Pure ambience: they don't block you and never enter the café (customers do).
const N = 14, SCALE = 1.7
const PAD_A = STREET.padA[0] + 1.6, PAD_B = STREET.padB[1] - 1.6, ZEBRA_X = 0
const SAY = {
  mallow: ['hi hi! 👋', 'so toasty today ☀️', 'cocoa later? ☕', 'strawberries at Sugar Plum! 🍓', "I'm a little squished 😅", 'that café smells amazing', 'see you at the bakery?', '🌷 for my mum'],
  paper: ['morning! 📓', 'new books at Chapter & Crumb 📚', 'oat milk again? 😩', 'I wrote a poem ✍️', 'have you met the barista?', 'the lid lights! ✨', 'running late, gotta go!', "I'm out of pages 😵"],
}
type Walker = { spec: FolkSpec; side: number; pos: THREE.Vector3; path: THREE.Vector3[]; wait: number; pose: Pose; facing: number; say: string; sayT: number; active: boolean; ver: number }
const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)

// a little errand: from home along the pavement, maybe cross at the zebra, stop at a shop window, then home again
function errand(w: Walker, r: () => number) {
  const home = w.side * (STREET.X - 4), shops = SHOPS.filter((s) => s.kind !== 'lease'), shop = shops[Math.floor(r() * shops.length)]
  const [dx] = shopDoor(shop), sideB = shop.side === 'b', startZ = r() < 0.5 ? PAD_A : PAD_B, shopZ = sideB ? PAD_B : PAD_A
  const p: THREE.Vector3[] = []
  if ((startZ === PAD_B) !== sideB) p.push(V(ZEBRA_X + w.side * 1.5, startZ), V(ZEBRA_X + w.side * 1.5, shopZ)) // cross at the zebra
  p.push(V(dx - w.side * 1.2, shopZ), V(dx - w.side * 1.2 + (r() - 0.5), shopZ))
  w.pos.copy(V(home, startZ)); w.path = p; w.wait = 0
  w.path.push(V(home, shopZ)) // and home again
}

export function StreetLife() {
  const r = useMemo(() => rng(4242), [])
  const walkers = useMemo<Walker[]>(() => Array.from({ length: N }, (_, i) => {
    const kind = i % 2 ? 'paper' : 'mallow', side = kind === 'mallow' ? -1 : 1
    const w: Walker = { spec: folk(kind, (i * 13) % 50), side, pos: V(0, 0), path: [], wait: 0, pose: 'walk', facing: 0, say: '', sayT: 0, active: false, ver: 0 }
    errand(w, r); w.pos.x = (r() - 0.5) * 90 // already out and about when you arrive
    return w
  }), [r])
  return <group>{walkers.map((w, i) => <WalkerBody key={i} w={w} i={i} all={walkers} r={r} />)}</group>
}

function WalkerBody({ w, i, all, r }: { w: Walker; i: number; all: Walker[]; r: () => number }) {
  const g = useRef<THREE.Group>(null), bubble = useRef<HTMLDivElement>(null)
  const [ver, setVer] = useState(0)
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), el = g.current; if (!el) return
    // how many are out depends on the time of day: everyone at midday, a few in the evening, none at night
    const h = hourNow(), busy = h > 7 && h < 21 ? (h < 9 || h > 18 ? 0.45 : 1) : 0
    w.active = i < Math.round(N * busy)
    el.visible = w.active; if (!w.active) return
    w.sayT -= dt
    if (w.wait > 0) { w.wait -= dt; w.pose = 'wait' }
    else {
      const t = w.path[0]
      if (!t) { // home: new townsperson, new errand
        const kind = w.side < 0 ? 'mallow' : 'paper'; w.spec = folk(kind, Math.floor(r() * 50)); errand(w, r); w.ver++; setVer(w.ver)
      } else {
        const d = t.clone().sub(w.pos), dist = d.length(), step = 1.9 * dt
        if (dist > 0.05) { w.pos.addScaledVector(d.normalize(), Math.min(step, dist)); w.facing = Math.atan2(d.x, d.z); w.pose = 'walk' }
        else { w.path.shift(); if (w.path.length === 1) w.wait = 3 + r() * 4 } // window-shopping at the shop
        // bump into a neighbour? stop and chat a moment
        if (w.sayT < -6) for (const o of all) {
          if (o === w || !o.active || o.wait > 0) continue
          if (o.pos.distanceTo(w.pos) < 1.6) {
            w.wait = o.wait = 3.2; w.facing = Math.atan2(o.pos.x - w.pos.x, o.pos.z - w.pos.z); o.facing = w.facing + Math.PI
            w.say = SAY[w.spec.kind][Math.floor(r() * 8)]; w.sayT = 1.6; o.say = SAY[o.spec.kind][Math.floor(r() * 8)]; o.sayT = 3.2
            break
          }
        }
      }
    }
    el.position.copy(w.pos)
    let df = w.facing - el.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); el.rotation.y += df * 0.2
    if (bubble.current) { const show = w.sayT > 0 && w.sayT < 1.6; const txt = show ? w.say : ''; if (bubble.current.textContent !== txt) bubble.current.textContent = txt; bubble.current.style.opacity = show ? '1' : '0' }
  })
  return (
    <group ref={g}>
      <group scale={SCALE}><Townsperson key={ver} spec={w.spec} getPose={() => w.pose} phase={i * 1.3} /></group>
      <Html zIndexRange={[19, 0]} position={[0, 3.1, 0]} center distanceFactor={14}><div ref={bubble} className="chat" /></Html>
    </group>
  )
}
