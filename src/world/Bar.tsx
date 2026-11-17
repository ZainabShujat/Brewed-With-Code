import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useShop, type Pour } from '../systems/shop'
import { COUNTER } from './layout'
import { C } from '../data/palette'
import { mat, glass } from './mats'
import { Html } from '@react-three/drei'
import { useGame } from '../systems/store'
import { Grab, DropTarget } from '../systems/drag'
import { Model } from './Models'
import { liquidMat, surfaceTex, Surface, Stream, WhipSpiral, useCupGeometry, ceramic } from './Liquid'

// The playable bar. Coordinates are the counter's local space (the Counter group in Interior).
// Every station is clickable: R3F casts a ray from the mouse into the scene (raycasting) and
// calls onClick on the first mesh it hits.
const TOP = COUNTER.top + 0.1, Z = COUNTER.z - 0.1
// the working cup sits front and centre on the barista's side, big enough to watch it fill
export const CUP_AT: [number, number, number] = [0.2, TOP + 0.06, COUNTER.z - 0.3]
const CUP_SCALE = 0.85 // a big see-through glass: you watch the drink build in layers (like the cake)

// ── animation timing (all derived from the pour's start time, so reels stay frame-exact) ──
export const GO = 0.35, BACK = 0.35          // tool flies over / flies home
export const ACT: Record<string, number> = { shot: 1.1, milk: 1.1, water: 0.9, choc: 0.8, sprinkle: 0.9, whip: 0.9 }
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeIO = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const nowS = () => performance.now() / 1000
// the latest pour of this kind (and tool tag), if it's still being performed
function active(kind: string, tag?: string) {
  const ps = useShop.getState().pours
  for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; if (p.kind === kind && (!tag || p.tag === tag)) return nowS() - p.t0 < GO + ACT[kind] + BACK ? p : null }
  return null
}
// 0 → 1 → 0 travel weight for a performance, and how far through the action we are
function phase(kind: string, t: number) {
  const d = ACT[kind]
  const w = t < GO ? easeIO(t / GO) : t < GO + d ? 1 : 1 - easeIO(clamp01((t - GO - d) / BACK))
  return { w, act: clamp01((t - GO) / d), acting: t >= GO && t < GO + d }
}

// A tool that performs: lifts off its spot, arcs over the cup, does its action, and flies home.
function Flyer({ kind, tag, home, act, side = 0.14, above = 0.42, children }: {
  kind: string; tag?: string; home: [number, number, number]; act: 'tilt' | 'shake' | 'invert'; side?: number; above?: number; children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current; if (!g) return
    const p = active(kind, tag)
    if (!p) { g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); return }
    const t = nowS() - p.t0, { w, act: a, acting } = phase(kind, t)
    const tx = CUP_AT[0] + side - home[0], ty = CUP_AT[1] + above - home[1], tz = CUP_AT[2] - home[2]
    g.position.set(tx * w, ty * w + Math.sin(w * Math.PI) * 0.12, tz * w)  // a little arc on the way
    if (act === 'tilt') g.rotation.z = w * (0.35 + 0.75 * Math.sin(Math.min(1, a * 1.4) * Math.PI / 2) * (acting ? 1 : 0.4))
    else if (act === 'shake') { g.rotation.z = w * (2.6 + (acting ? Math.sin(t * 30) * 0.35 : 0)); g.position.y += acting ? Math.abs(Math.sin(t * 30)) * 0.03 : 0 }
    else g.rotation.z = w * Math.PI * 0.92 // upside down (whipped cream can)
  })
  return <group ref={ref}>{children}</group>
}


// liquid layers rise smoothly to their target height (an easing lerp every frame)
function Layer({ h, y, color, r = 0.19 }: { h: number; y: number; color: string; r?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const cur = useRef({ h: 0.0001, y })
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return
    const k = 1 - Math.exp(-dt * 1.8) // slow enough to watch the cup fill
    cur.current.h += (Math.max(0.0001, h) - cur.current.h) * k
    cur.current.y += (y - cur.current.y) * k
    m.scale.y = cur.current.h; m.position.y = cur.current.y + cur.current.h / 2
    m.visible = cur.current.h > 0.002
  })
  const m = useMemo(() => liquidMat(color), [color])
  return <mesh ref={ref} material={m}><cylinderGeometry args={[r, r * 0.9, 1, 32]} /></mesh>
}

// the machine's left group head, in counter space (the cup slides under it for every shot)
const UNDER_MACHINE: [number, number, number] = [-1.92, CUP_AT[1], COUNTER.z - 0.6]

// the drink glass: a lathe-turned tumbler, thin and clear (no transmission pass: cheap on laptop GPUs)
const GLASS_GEO = (() => { const P = (x: number, y: number) => new THREE.Vector2(x, y)
  return new THREE.LatheGeometry([P(0.205, -0.28), P(0.215, -0.1), P(0.235, 0.2), P(0.245, 0.33), P(0.25, 0.34), P(0.24, 0.34), P(0.228, 0.2), P(0.208, -0.1), P(0.198, -0.23)], 48) })()
const GLASS_MAT = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
const GLASS_BASE = new THREE.MeshPhysicalMaterial({ color: '#e8f2f4', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 })

function Cup() {
  const cup = useShop((s) => s.cup), d = useShop((s) => s.drink), pours = useShop((s) => s.pours)
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current; if (!g) return
    const p = active('shot')
    const w = p ? phase('shot', nowS() - p.t0).w : 0
    g.position.set(CUP_AT[0] + (UNDER_MACHINE[0] - CUP_AT[0]) * w, CUP_AT[1] + Math.sin(w * Math.PI) * 0.05, CUP_AT[2] + (UNDER_MACHINE[2] - CUP_AT[2]) * w)
  })
  if (!cup) return null
  // stack the layers bottom-up: espresso, chocolate, water, milk, foam
  const layers: { h: number; color: string }[] = []
  if (d.chocolate) layers.push({ h: 0.06, color: '#3b1d12' })
  if (d.shots) layers.push({ h: 0.06 * d.shots, color: '#4a2414' })
  if (d.water) layers.push({ h: 0.14, color: '#7a4a2c' })
  const milkC = d.milkType === 'oat' ? '#efdcbc' : d.milkType === 'almond' ? '#f3e6cf' : '#f6eadb'
  if (d.milk === 'steamed') layers.push({ h: 0.17, color: '#d8b48c' }, { h: 0.04, color: milkC })
  if (d.milk === 'foamy') layers.push({ h: 0.09, color: '#d8b48c' }, { h: 0.13, color: '#fffaf2' })
  if (d.milk === 'micro') layers.push({ h: 0.1, color: '#c89c70' }, { h: 0.04, color: milkC })
  // a long drink fills the glass (layers keep their proportions); a plain espresso stays a short shot
  const total = layers.reduce((a, l) => a + l.h, 0)
  const K = d.milk !== 'none' || d.water ? 0.72 / Math.max(0.01, total) : 1.55
  let y = 0.03
  const placed = layers.map((l) => { const o = { ...l, h: l.h * K, y }; y += l.h * K; return o })
  // what the top of the drink looks like: crema on espresso, foam on milk, a latte-art heart on micro-foam
  const tex = d.milk === 'micro' ? surfaceTex('art', milkC) : d.milk === 'foamy' ? surfaceTex('foam', '#fffaf2') : d.milk === 'steamed' ? surfaceTex('foam', milkC)
    : d.shots ? surfaceTex('crema', d.water ? '#7a4a2c' : '#9a5f33') : surfaceTex('plain', layers.length ? layers[layers.length - 1].color : '#000')
  const lastT = pours.length ? pours[pours.length - 1].t0 + GO : 0
  return (
    <group ref={ref} position={CUP_AT}>
      <group scale={CUP_SCALE}>
        {/* a tall clear glass: you see every layer go in (espresso, chocolate, milk, foam, cream) */}
        <mesh geometry={GLASS_GEO} material={GLASS_MAT} renderOrder={2} scale={[0.78, 1.45, 0.78]} position={[0, 0.12, 0]} />
        <mesh position={[0, -0.27, 0]} material={GLASS_BASE}><cylinderGeometry args={[0.158, 0.166, 0.05, 40]} /></mesh>
        <group position={[0, -0.23, 0]}>
          {placed.map((l, i) => <Layer key={i} h={l.h} y={l.y} color={l.color} r={0.162} />)}
          {placed.length > 0 && <Surface r={0.166} y={y + 0.001} tex={tex} last={lastT} />}
          <ToppingFx y={y} />
        </group>
        <PourFx />
      </group>
    </group>
  )
}

// toppings stay on the drink: cocoa/cinnamon dust or sprinkles, or a whipped-cream swirl
function ToppingFx({ y }: { y: number }) {
  const t = useShop((s) => s.drink.topping)
  const dots = useMemo(() => Array.from({ length: 14 }, (_, i) => [Math.cos(i * 2.4) * 0.12 * ((i % 4) / 4 + 0.3), Math.sin(i * 2.4) * 0.12 * ((i % 4) / 4 + 0.3)] as const), [])
  if (t === 'none') return null
  if (t === 'whipped') return <Whip y={y} />
  const cols = t === 'sprinkles' ? [C.counter, C.mint, C.butter, C.lilac] : t === 'cocoa' ? ['#5b2e1c'] : ['#b0602a']
  return <group position={[0, y + 0.005, 0]}>{dots.map(([x, z], i) => <mesh key={i} position={[x, 0, z]} material={mat(cols[i % cols.length])}><sphereGeometry args={[0.018, 6, 4]} /></mesh>)}</group>
}

// whipped cream: a real piped spiral that winds up into a peak while the can sprays
function Whip({ y }: { y: number }) {
  return <WhipSpiral y={y} progress={() => { const p = active('whip'); const t = p ? nowS() - p.t0 - GO : 99; return clamp01(t / ACT.whip) }} />
}

// pour streams + falling sprinkles, driven by time since the pour started (no React re-render per frame)
function PourFx() {
  const pours = useShop((s) => s.pours)
  return <group>{pours.map((p) => <OnePour key={p.t0 + p.kind} p={p} />)}</group>
}
function OnePour({ p }: { p: Pour }) {
  const stream = useRef<THREE.Mesh>(null), twin = useRef<THREE.Mesh>(null)
  const bits = useRef<THREE.Group>(null)
  const seeds = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: Math.cos(i * 1.7) * 0.12 * Math.random(), z: Math.sin(i * 1.7) * 0.12 * Math.random(), d: Math.random() * 0.5 })), [])
  useFrame(() => {
    // the stream only starts once the tool (or the cup, for shots) has arrived
    const age = performance.now() / 1000 - p.t0 - GO, dur = ACT[p.kind] ?? 0.9
    const s = stream.current
    if (s) {
      // grows down from the spout, flows for the whole action, then thins out
      const on = p.kind === 'sprinkle' || p.kind === 'whip' || age < 0 ? 0 : age < dur - 0.15 ? 1 : Math.max(0, 1 - (age - dur + 0.15) * 6)
      s.visible = on > 0.01
      const top = p.kind === 'shot' ? 0.62 : 1.0, full = p.kind === 'shot' ? 0.6 : 0.95
      const len = Math.min(1, Math.max(0, age) * 5) * full
      s.scale.set(on * (0.85 + Math.sin(age * 40) * 0.08), Math.max(0.001, len), on); s.position.y = top - len / 2
      // espresso pours as two thin streams from the double spout
      s.position.x = p.kind === 'shot' ? -0.04 : p.kind === 'milk' || p.kind === 'water' ? 0.04 : 0
    }
    if (twin.current) { twin.current.visible = p.kind === 'shot' && !!s?.visible; if (s) { twin.current.scale.copy(s.scale); twin.current.position.set(0.04, s.position.y, 0) } }
    const g = bits.current
    if (g) g.children.forEach((c, i) => {
      const t = age - seeds[i].d * 0.8, fall = 0.95 - 2.6 * Math.max(0, t) * Math.max(0, t) * 2
      c.visible = p.kind === 'sprinkle' && t > 0 && fall > 0.02
      c.position.set(seeds[i].x, fall, seeds[i].z)
    })
  })
  const w = p.kind === 'shot' ? 0.022 : p.kind === 'choc' ? 0.03 : 0.045
  return (
    <group>
      {/* timing meshes (invisible) drive the real wobbling streams below */}
      <mesh ref={stream} visible={false}><boxGeometry args={[0.001, 0.001, 0.001]} /></mesh>
      <mesh ref={twin} visible={false}><boxGeometry args={[0.001, 0.001, 0.001]} /></mesh>
      {p.kind !== 'sprinkle' && p.kind !== 'whip' && <>
        <Stream color={p.color} w={w} top={p.kind === 'shot' ? 0.62 : 1.0} bottom={0.02} x={p.kind === 'shot' ? -0.04 : p.kind === 'choc' ? 0 : 0.04} on={() => (stream.current?.visible ? stream.current.scale.z : 0)} />
        {p.kind === 'shot' && <Stream color={p.color} w={w} top={0.62} bottom={0.02} x={0.04} seed={1.3} on={() => (stream.current?.visible ? stream.current.scale.z : 0)} />}
      </>}
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
    <Grab id={`milk-${milk}`} tip={`${milk} milk: drag onto the pitcher`} pos={[x, TOP + 0.2, RZ]} size={[0.2, 0.42, 0.2]} onClick={() => s().pickMilk(milk)} drops={{ pitcher: () => s().pickMilk(milk) }}>
      <mesh material={glass()}><cylinderGeometry args={[0.075, 0.075, 0.3, 18]} /></mesh>
      <mesh position={[0, -0.03, 0]} material={mat(color)}><cylinderGeometry args={[0.068, 0.068, 0.22, 18]} /></mesh>
      <mesh position={[0, 0.19, 0]} material={mat(cap)}><cylinderGeometry args={[0.045, 0.045, 0.06, 14]} /></mesh>
      {picked && <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.butter, { emissive: C.butter })}><ringGeometry args={[0.09, 0.115, 24]} /></mesh>}
    </Grab>
  )
}

function Shaker({ x, label, color, onClick }: { x: number; label: string; color: string; onClick: () => void }) {
  return (
    <Grab id={label} tip={`${label}: drag onto the cup`} pos={[x, TOP + 0.13, RZ]} size={[0.18, 0.3, 0.18]} onClick={onClick} drops={{ cup: onClick }}>
      <Flyer kind="sprinkle" tag={label} home={[x, TOP + 0.13, RZ]} act="shake" side={0} above={0.38}>
        <mesh position={[0, -0.02, 0]} material={glass()}><cylinderGeometry args={[0.06, 0.06, 0.18, 16]} /></mesh>
        <mesh position={[0, -0.04, 0]} material={mat(color)}><cylinderGeometry args={[0.054, 0.054, 0.12, 16]} /></mesh>
        <mesh position={[0, 0.09, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.06, 0.06, 0.05, 16]} /></mesh>
      </Flyer>
    </Grab>
  )
}

export function Bar() {
  const s = useShop.getState
  const style = useShop((st) => st.milkStyle)
  const milkIn = useShop((st) => st.milkType)
  useFrame(() => s().tick(performance.now() / 1000))
  return (
    <group>
      {/* ── left → right as the barista sees it ── */}
      {/* cup stack */}
      <Grab id="cups" tip="drag a cup onto the saucer" pos={[2.7, TOP + 0.12, BZ]} size={[0.3, 0.32, 0.3]} onClick={() => s().takeCup()} drops={{ cup: () => s().takeCup() }}>
        <Model name="sf:cup" fit={0.14} pos={[0, -0.13, 0]} />
        <Model name="sf:cup" fit={0.14} pos={[0, 0.0, 0]} rot={[0, 1.2, 0]} />
      </Grab>
      {/* milk bottles: pick a milk */}
      <MilkBottle x={2.75} milk="whole" color="#fbf8f2" cap="#4a90c2" />
      <MilkBottle x={2.4} milk="oat" color="#eedcb8" cap="#c9a24a" />
      <MilkBottle x={2.05} milk="almond" color="#f2e6d2" cap="#9a6a4a" />
      {/* steel pitcher: steam the milk */}
      <Grab id="milk" tip={`pitcher (${style}): click to change, drag onto the cup`} pos={[1.95, TOP + 0.12, BZ]} size={[0.26, 0.3, 0.26]} onClick={() => s().cycleMilkStyle()} drops={{ cup: () => s().milk(s().milkStyle) }}>
        <Flyer kind="milk" home={[1.95, TOP + 0.12, BZ]} act="tilt" side={0.16} above={0.36}>
          {/* steel milk pitcher (the downloaded one turned out to be a flat cut-out): bell body, spout, handle */}
          <mesh material={mat(C.steel, { rough: 0.25 })}><cylinderGeometry args={[0.075, 0.095, 0.22, 24, 1, true]} /></mesh>
          <mesh position={[0, -0.11, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.095, 0.095, 0.01, 24]} /></mesh>
          <mesh position={[0.1, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.steel)}><torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} /></mesh>
          <mesh position={[-0.085, 0.1, 0]} rotation={[0, 0, 0.6]} material={mat(C.steel)}><coneGeometry args={[0.025, 0.06, 8]} /></mesh>
        </Flyer>
      </Grab>
      {/* toppings (back row) */}
      <Shaker x={1.6} label="cocoa" color="#5b2e1c" onClick={() => s().top('cocoa')} />
      <Shaker x={1.25} label="cinnamon" color="#b0602a" onClick={() => s().top('cinnamon')} />
      <Shaker x={0.9} label="sprinkles" color={C.counter} onClick={() => s().top('sprinkles')} />
      <Grab id="whipped" tip="whipped cream: drag onto the cup" pos={[0.5, TOP + 0.17, RZ]} size={[0.16, 0.38, 0.16]} onClick={() => s().top('whipped')} drops={{ cup: () => s().top('whipped') }}>
        <Flyer kind="whip" home={[0.5, TOP + 0.17, RZ]} act="invert" side={0} above={0.55}>
          <mesh material={mat(C.white)}><cylinderGeometry args={[0.05, 0.05, 0.26, 16]} /></mesh>
          <mesh position={[0, 0.16, 0]} material={mat(C.steel)}><coneGeometry args={[0.035, 0.07, 10]} /></mesh>
        </Flyer>
      </Grab>
      {/* chocolate sauce + hot-water kettle */}
      <Grab id="choc" tip="chocolate: drag onto the cup" pos={[-0.3, TOP + 0.14, BZ]} size={[0.18, 0.32, 0.18]} onClick={() => s().choc()} drops={{ cup: () => s().choc() }}>
        <Flyer kind="choc" home={[-0.3, TOP + 0.14, BZ]} act="invert" side={0} above={0.52}>
          <mesh material={mat('#5a3424', { rough: 0.3 })}><cylinderGeometry args={[0.055, 0.06, 0.22, 16]} /></mesh>
          <mesh position={[0, 0.14, 0]} material={mat('#3b1d12')}><coneGeometry args={[0.035, 0.07, 10]} /></mesh>
        </Flyer>
      </Grab>
      <Grab id="water" tip="hot water: drag onto the cup" pos={[-0.7, TOP + 0.12, BZ]} size={[0.3, 0.3, 0.26]} onClick={() => s().water()} drops={{ cup: () => s().water() }}>
        <Flyer kind="water" home={[-0.7, TOP + 0.12, BZ]} act="tilt" side={0.2} above={0.36}>
          <mesh material={mat(C.steel)}><cylinderGeometry args={[0.08, 0.1, 0.16, 20]} /></mesh>
          <mesh position={[0, 0.09, 0]} material={mat(C.steel)}><sphereGeometry args={[0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[-0.12, 0.05, 0]} rotation={[0, 0, 0.9]} material={mat(C.steel)}><cylinderGeometry args={[0.01, 0.012, 0.2, 8]} /></mesh>
        </Flyer>
      </Grab>
      {/* espresso machine (pull a shot) */}
      <Grab id="machine" tip="espresso: 1 shot per click" pos={[-1.6, TOP + 0.6, Z - 0.05]} size={[1.4, 1.3, 1.0]} onClick={() => s().shot()}>
      </Grab>
      {/* flavour syrups on the back row (Sketchfab, CC BY: oparaskos) */}
      {[-0.95, -0.78].map((x, i) => <Model key={x} name="sf:syrup" fit={0.36} pos={[x, TOP - 0.06, RZ + 0.05]} rot={[0, i * 0.8, 0]} />)}
      {/* service bell */}
      <Grab id="bell" tip="serve 🔔" pos={[1.15, TOP + 0.06, BZ]} size={[0.3, 0.2, 0.3]} onClick={() => s().serve()}>
        <mesh position={[0, -0.03, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.1, 0.11, 0.03, 16]} /></mesh>
        <mesh position={[0, 0.01, 0]} material={mat(C.butter, { rough: 0.25 })}><sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      </Grab>
      {/* drop targets: the cup on its saucer, and the pitcher (for milk bottles) */}
      <DropTarget id="cup" pos={[CUP_AT[0], TOP + 0.01, CUP_AT[2]]} r={0.26} />
      <DropTarget id="pitcher" pos={[1.95, TOP + 0.01, BZ]} r={0.2} />
      {/* your cup on a saucer, front and centre */}
      <mesh position={[CUP_AT[0], TOP + 0.005, CUP_AT[2]]} material={mat(C.cream)}><cylinderGeometry args={[0.2, 0.17, 0.02, 28]} /></mesh>
      <Cup />
    </group>
  )
}
