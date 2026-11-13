import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useShop, type Pour } from '../systems/shop'
import { COUNTER } from './layout'
import { C } from '../data/palette'
import { mat } from './mats'

// The playable bar. Coordinates are the counter's local space (the Counter group in Interior).
// Every station is clickable: R3F casts a ray from the mouse into the scene (raycasting) and
// calls onClick on the first mesh it hits.
const TOP = COUNTER.top + 0.1, Z = COUNTER.z - 0.1
// the working cup sits front and centre on the barista's side, big enough to watch it fill
export const CUP_AT: [number, number, number] = [0.0, TOP + 0.1, COUNTER.z - 0.38]
const CUP_SCALE = 1.7

function Hit({ pos, size, onClick, children, label }: { pos: [number, number, number]; size: [number, number, number]; onClick: () => void; children?: ReactNode; label: string }) {
  const [hover, setHover] = useState(false)
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = hover ? Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.05 : 0 })
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick() }
  return (
    <group position={pos}>
      <group ref={ref}>{children}</group>
      {/* invisible hitbox: the ray lands here */}
      <mesh name={`station:${label}`} visible={false} onClick={click}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}>
        <boxGeometry args={size} />
      </mesh>
      {hover && <mesh position={[0, -size[1] / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.butter, { emissive: C.butter, opacity: 0.7 })}><ringGeometry args={[Math.max(size[0], size[2]) * 0.45, Math.max(size[0], size[2]) * 0.55, 24]} /></mesh>}
    </group>
  )
}

// liquid layers rise smoothly to their target height (an easing lerp every frame)
function Layer({ h, y, color, r = 0.19 }: { h: number; y: number; color: string; r?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const cur = useRef({ h: 0.0001, y })
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return
    const k = 1 - Math.exp(-dt * 5)
    cur.current.h += (Math.max(0.0001, h) - cur.current.h) * k
    cur.current.y += (y - cur.current.y) * k
    m.scale.y = cur.current.h; m.position.y = cur.current.y + cur.current.h / 2
    m.visible = cur.current.h > 0.002
  })
  return <mesh ref={ref} material={mat(color)}><cylinderGeometry args={[r, r * 0.9, 1, 20]} /></mesh>
}

function Cup() {
  const cup = useShop((s) => s.cup), d = useShop((s) => s.drink)
  if (!cup) return null
  // stack the layers bottom-up: espresso, chocolate, water, milk, foam
  const layers: { h: number; color: string }[] = []
  if (d.chocolate) layers.push({ h: 0.04, color: '#3b1d12' })
  if (d.shots) layers.push({ h: 0.045 * d.shots, color: '#5b2e1c' })
  if (d.water) layers.push({ h: 0.09, color: '#7a4a2c' })
  const milkC = d.milkType === 'oat' ? '#efdcbc' : d.milkType === 'almond' ? '#f3e6cf' : '#f6e7d4'
  if (d.milk === 'steamed') layers.push({ h: 0.11, color: '#c99a6c' }, { h: 0.025, color: milkC })
  if (d.milk === 'foamy') layers.push({ h: 0.06, color: '#c99a6c' }, { h: 0.08, color: '#fffaf2' })
  if (d.milk === 'micro') layers.push({ h: 0.07, color: '#b88a5e' }, { h: 0.025, color: milkC })
  let y = 0.03
  const placed = layers.map((l) => { const o = { ...l, y }; y += l.h; return o })
  return (
    <group position={CUP_AT} scale={CUP_SCALE}>
      {/* ceramic cup: open cylinder + base + handle */}
      <mesh material={mat(C.white, { rough: 0.3 })} castShadow><cylinderGeometry args={[0.23, 0.19, 0.3, 24, 1, true]} /></mesh>
      <mesh position={[0, -0.14, 0]} material={mat(C.cream)}><cylinderGeometry args={[0.19, 0.19, 0.03, 24]} /></mesh>
      <mesh position={[0.26, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.cream)}><torusGeometry args={[0.08, 0.025, 8, 14]} /></mesh>
      <group position={[0, -0.14, 0]}>
        {placed.map((l, i) => <Layer key={i} h={l.h} y={l.y} color={l.color} r={0.2} />)}
        <ToppingFx y={y} />
      </group>
    </group>
  )
}

// toppings stay on the drink: cocoa/cinnamon dust or sprinkles, or a whipped-cream swirl
function ToppingFx({ y }: { y: number }) {
  const t = useShop((s) => s.drink.topping)
  const dots = useMemo(() => Array.from({ length: 14 }, (_, i) => [Math.cos(i * 2.4) * 0.12 * ((i % 4) / 4 + 0.3), Math.sin(i * 2.4) * 0.12 * ((i % 4) / 4 + 0.3)] as const), [])
  if (t === 'none') return null
  if (t === 'whipped') return (
    <group position={[0, y + 0.02, 0]}>
      <mesh material={mat(C.white)}><sphereGeometry args={[0.15, 14, 10]} /></mesh>
      <mesh position={[0, 0.1, 0]} material={mat(C.white)}><coneGeometry args={[0.1, 0.16, 12]} /></mesh>
    </group>
  )
  const cols = t === 'sprinkles' ? [C.counter, C.mint, C.butter, C.lilac] : t === 'cocoa' ? ['#5b2e1c'] : ['#b0602a']
  return <group position={[0, y + 0.005, 0]}>{dots.map(([x, z], i) => <mesh key={i} position={[x, 0, z]} material={mat(cols[i % cols.length])}><sphereGeometry args={[0.018, 6, 4]} /></mesh>)}</group>
}

// pour streams + falling sprinkles, driven by time since the pour started (no React re-render per frame)
function PourFx() {
  const pours = useShop((s) => s.pours)
  return <group position={CUP_AT} scale={CUP_SCALE}>{pours.map((p) => <OnePour key={p.t0 + p.kind} p={p} />)}</group>
}
function OnePour({ p }: { p: Pour }) {
  const stream = useRef<THREE.Mesh>(null)
  const bits = useRef<THREE.Group>(null)
  const seeds = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: Math.cos(i * 1.7) * 0.12 * Math.random(), z: Math.sin(i * 1.7) * 0.12 * Math.random(), d: Math.random() * 0.5 })), [])
  useFrame(() => {
    const age = performance.now() / 1000 - p.t0
    const s = stream.current
    if (s) {
      // the stream grows down from the spout, flows, then thins out
      const on = p.kind === 'sprinkle' ? 0 : age < 0.9 ? 1 : Math.max(0, 1 - (age - 0.9) * 4)
      s.visible = on > 0.01
      const len = Math.min(1, age * 4) * 1.1
      s.scale.set(on, len, on); s.position.y = 1.25 - len / 2
    }
    const g = bits.current
    if (g) g.children.forEach((c, i) => {
      const t = age - seeds[i].d, fall = 1.1 - 2.6 * Math.max(0, t) * Math.max(0, t) * 2
      c.visible = p.kind === 'sprinkle' && t > 0 && fall > 0.02
      c.position.set(seeds[i].x, fall, seeds[i].z)
    })
  })
  const w = p.kind === 'shot' || p.kind === 'choc' ? 0.035 : p.kind === 'whip' ? 0.07 : 0.05
  return (
    <group>
      <mesh ref={stream} material={mat(p.color, { opacity: p.kind === 'water' ? 0.6 : 1 })}><cylinderGeometry args={[w, w * 0.8, 1, 10]} /></mesh>
      <group ref={bits}>{seeds.map((_, i) => <mesh key={i} material={mat(p.color === '#ff7fb6' ? [C.counter, C.mint, C.butter, C.lilac][i % 4] : p.color)} visible={false}><sphereGeometry args={[0.02, 5, 4]} /></mesh>)}</group>
    </group>
  )
}

export function Bar() {
  const s = useShop.getState
  useFrame(() => s().tick(performance.now() / 1000))
  return (
    <group>
      {/* cup stack (take a cup) */}
      <Hit label="cups" pos={[1.3, TOP + 0.3, Z]} size={[0.6, 0.7, 0.6]} onClick={() => s().takeCup()}>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[0.0, -0.25 + i * 0.09, 0]} material={mat(C.cream)}><cylinderGeometry args={[0.2, 0.17, 0.16, 18, 1, true]} /></mesh>)}
      </Hit>
      {/* espresso machine (pull a shot) */}
      <Hit label="machine" pos={[-1.6, TOP + 0.6, Z - 0.05]} size={[1.4, 1.3, 1.0]} onClick={() => s().shot()} />
      {/* milk jug (steam milk: opens a little menu) */}
      <Hit label="milk" pos={[2.2, TOP + 0.3, Z]} size={[0.6, 0.7, 0.6]} onClick={() => s().setMenu('milk')} />
      {/* whipped cream can */}
      <Hit label="whipped" pos={[0.4, TOP + 0.35, Z]} size={[0.4, 0.8, 0.4]} onClick={() => s().top('whipped')} />
      {/* drawers: the customisation menus */}
      <Hit label="fillers" pos={[2.2, 0.55, COUNTER.z - COUNTER.depth / 2 - 0.1]} size={[1.25, 0.75, 0.3]} onClick={() => s().setMenu('fillers')} />
      <Hit label="sprinkles" pos={[0.8, 0.55, COUNTER.z - COUNTER.depth / 2 - 0.1]} size={[1.25, 0.75, 0.3]} onClick={() => s().setMenu('sprinkles')} />
      <Hit label="ingredients" pos={[-0.6, 0.55, COUNTER.z - COUNTER.depth / 2 - 0.1]} size={[1.25, 0.75, 0.3]} onClick={() => s().setMenu('ingredients')} />
      {/* service bell (serve the drink to the front of the line) */}
      <Hit label="bell" pos={[-0.75, TOP + 0.12, COUNTER.z - 0.4]} size={[0.5, 0.4, 0.5]} onClick={() => s().serve()}>
        <mesh position={[0, -0.05, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.16, 0.18, 0.05, 16]} /></mesh>
        <mesh position={[0, 0.03, 0]} material={mat(C.butter, { rough: 0.25 })}><sphereGeometry args={[0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      </Hit>
      <Cup />
      <PourFx />
    </group>
  )
}
