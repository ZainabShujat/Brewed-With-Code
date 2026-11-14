import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useShop, type Pour } from '../systems/shop'
import { COUNTER } from './layout'
import { C } from '../data/palette'
import { mat, glass } from './mats'
import { Html } from '@react-three/drei'
import { useGame } from '../systems/store'

// The playable bar. Coordinates are the counter's local space (the Counter group in Interior).
// Every station is clickable: R3F casts a ray from the mouse into the scene (raycasting) and
// calls onClick on the first mesh it hits.
const TOP = COUNTER.top + 0.1, Z = COUNTER.z - 0.1
// the working cup sits front and centre on the barista's side, big enough to watch it fill
export const CUP_AT: [number, number, number] = [0.2, TOP + 0.06, COUNTER.z - 0.3]
const CUP_SCALE = 0.62 // a big café mug, in proportion with the pitcher and the machine

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

const BZ = COUNTER.z - 0.32   // front row (barista side)
const RZ = COUNTER.z + 0.22   // back row (shakers, bottles)

// a small floating label under each tool, only in the barista view
function Label({ text, y = -0.04, z = -0.18 }: { text: string; y?: number; z?: number }) {
  const pov = useGame((s) => s.mode === 'pov')
  if (!pov) return null
  return <Html position={[0, y, z]} center className="tag tool">{text}</Html>
}

function MilkBottle({ x, milk, color, cap }: { x: number; milk: 'whole' | 'oat' | 'almond'; color: string; cap: string }) {
  const s = useShop.getState
  const picked = useShop((st) => st.milkType === milk)
  return (
    <Hit label={`milk-${milk}`} pos={[x, TOP + 0.2, RZ]} size={[0.2, 0.42, 0.2]} onClick={() => s().pickMilk(milk)}>
      <mesh material={glass()}><cylinderGeometry args={[0.075, 0.075, 0.3, 18]} /></mesh>
      <mesh position={[0, -0.03, 0]} material={mat(color)}><cylinderGeometry args={[0.068, 0.068, 0.22, 18]} /></mesh>
      <mesh position={[0, 0.19, 0]} material={mat(cap)}><cylinderGeometry args={[0.045, 0.045, 0.06, 14]} /></mesh>
      {picked && <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.butter, { emissive: C.butter })}><ringGeometry args={[0.09, 0.115, 24]} /></mesh>}
      <Label text={milk} y={-0.24} z={-0.12} />
    </Hit>
  )
}

function Shaker({ x, label, color, onClick }: { x: number; label: string; color: string; onClick: () => void }) {
  return (
    <Hit label={label} pos={[x, TOP + 0.13, RZ]} size={[0.18, 0.3, 0.18]} onClick={onClick}>
      <mesh position={[0, -0.02, 0]} material={glass()}><cylinderGeometry args={[0.06, 0.06, 0.18, 16]} /></mesh>
      <mesh position={[0, -0.04, 0]} material={mat(color)}><cylinderGeometry args={[0.054, 0.054, 0.12, 16]} /></mesh>
      <mesh position={[0, 0.09, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.06, 0.06, 0.05, 16]} /></mesh>
      <Label text={label} y={-0.17} z={-0.12} />
    </Hit>
  )
}

export function Bar() {
  const s = useShop.getState
  useFrame(() => s().tick(performance.now() / 1000))
  return (
    <group>
      {/* ── left → right as the barista sees it ── */}
      {/* cup stack */}
      <Hit label="cups" pos={[2.55, TOP + 0.12, BZ]} size={[0.3, 0.32, 0.3]} onClick={() => s().takeCup()}>
        {[0, 1, 2].map((i) => <group key={i} position={[0, -0.08 + i * 0.07, 0]}><mesh material={mat(C.cream)}><cylinderGeometry args={[0.11, 0.09, 0.1, 20, 1, true]} /></mesh></group>)}
        <mesh position={[0, -0.13, 0]} material={mat(C.cream)}><cylinderGeometry args={[0.16, 0.16, 0.015, 24]} /></mesh>
        <Label text="cups" y={-0.17} />
      </Hit>
      {/* milk bottles: pick a milk */}
      <MilkBottle x={2.2} milk="whole" color="#fbf8f2" cap="#4a90c2" />
      <MilkBottle x={1.95} milk="oat" color="#eedcb8" cap="#c9a24a" />
      <MilkBottle x={1.7} milk="almond" color="#f2e6d2" cap="#9a6a4a" />
      {/* steel pitcher: steam the milk */}
      <Hit label="milk" pos={[1.55, TOP + 0.12, BZ]} size={[0.26, 0.3, 0.26]} onClick={() => s().setMenu('milk')}>
        <mesh material={mat(C.steel)}><cylinderGeometry args={[0.075, 0.095, 0.22, 20, 1, true]} /></mesh>
        <mesh position={[0, -0.11, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.095, 0.095, 0.01, 20]} /></mesh>
        <mesh position={[0.1, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.steel)}><torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} /></mesh>
        <mesh position={[-0.085, 0.1, 0]} rotation={[0, 0, 0.6]} material={mat(C.steel)}><coneGeometry args={[0.025, 0.06, 8]} /></mesh>
        <Label text="steam milk" y={-0.16} />
      </Hit>
      {/* toppings (back row) */}
      <Shaker x={1.25} label="cocoa" color="#5b2e1c" onClick={() => s().top('cocoa')} />
      <Shaker x={1.0} label="cinnamon" color="#b0602a" onClick={() => s().top('cinnamon')} />
      <Shaker x={0.75} label="sprinkles" color={C.counter} onClick={() => s().top('sprinkles')} />
      <Hit label="whipped" pos={[0.5, TOP + 0.17, RZ]} size={[0.16, 0.38, 0.16]} onClick={() => s().top('whipped')}>
        <mesh material={mat(C.white)}><cylinderGeometry args={[0.05, 0.05, 0.26, 16]} /></mesh>
        <mesh position={[0, 0.16, 0]} material={mat(C.steel)}><coneGeometry args={[0.035, 0.07, 10]} /></mesh>
        <Label text="whipped" y={-0.2} z={-0.12} />
      </Hit>
      {/* chocolate sauce + hot-water kettle */}
      <Hit label="choc" pos={[-0.35, TOP + 0.14, BZ]} size={[0.18, 0.32, 0.18]} onClick={() => s().choc()}>
        <mesh material={mat('#5a3424', { rough: 0.3 })}><cylinderGeometry args={[0.055, 0.06, 0.22, 16]} /></mesh>
        <mesh position={[0, 0.14, 0]} material={mat('#3b1d12')}><coneGeometry args={[0.035, 0.07, 10]} /></mesh>
        <Label text="chocolate" y={-0.17} />
      </Hit>
      <Hit label="water" pos={[-0.7, TOP + 0.12, BZ]} size={[0.3, 0.3, 0.26]} onClick={() => s().water()}>
        <mesh material={mat(C.steel)}><cylinderGeometry args={[0.08, 0.1, 0.16, 20]} /></mesh>
        <mesh position={[0, 0.09, 0]} material={mat(C.steel)}><sphereGeometry args={[0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[-0.12, 0.05, 0]} rotation={[0, 0, 0.9]} material={mat(C.steel)}><cylinderGeometry args={[0.01, 0.012, 0.2, 8]} /></mesh>
        <Label text="hot water" y={-0.15} />
      </Hit>
      {/* espresso machine (pull a shot) */}
      <Hit label="machine" pos={[-1.6, TOP + 0.6, Z - 0.05]} size={[1.4, 1.3, 1.0]} onClick={() => s().shot()}>
        <Label text="espresso (1 shot per click)" y={-0.42} z={-0.6} />
      </Hit>
      {/* service bell */}
      <Hit label="bell" pos={[0.85, TOP + 0.06, BZ]} size={[0.3, 0.2, 0.3]} onClick={() => s().serve()}>
        <mesh position={[0, -0.03, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.1, 0.11, 0.03, 16]} /></mesh>
        <mesh position={[0, 0.01, 0]} material={mat(C.butter, { rough: 0.25 })}><sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <Label text="serve 🔔" y={-0.12} />
      </Hit>
      {/* your cup on a saucer, front and centre */}
      <mesh position={[CUP_AT[0], TOP + 0.005, CUP_AT[2]]} material={mat(C.cream)}><cylinderGeometry args={[0.2, 0.17, 0.02, 28]} /></mesh>
      <Cup />
      <PourFx />
    </group>
  )
}
