import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useShop, type Pour } from '../systems/shop'
import { COUNTER } from './layout'
import { C } from '../data/palette'
import { mat, glass } from './mats'
import { Html } from '@react-three/drei'
import { useGame } from '../systems/store'
import { Grab, DropTarget, Hold } from '../systems/drag'
import { RBox } from './Soft'
import { Model } from './Models'
import { SHOT_FILL, textureOf } from '../systems/shop'
import { CAP } from '../data/recipes'
import { liquidMat, surfaceTex, Surface, Stream, WhipSpiral, useCupGeometry, ceramic } from './Liquid'

// The playable bar. Coordinates are the counter's local space (the Counter group in Interior).
// Every station is clickable: R3F casts a ray from the mouse into the scene (raycasting) and
// calls onClick on the first mesh it hits.
const TOP = COUNTER.top + 0.1, Z = COUNTER.z - 0.1
// the working cup sits front and centre on the barista's side, big enough to watch it fill
export const CUP_AT: [number, number, number] = [0.2, TOP + 0.06, COUNTER.z - 0.3]
const CUP_SCALE = 0.95 // (large; small and medium scale down from this)
// where the pitcher / kettle hovers for each glass size, and where its spout ends up when tilted (counter units).
// The tilt (~1.1 rad) swings the spout down and to the side, so the tool sits offset by that much: the spout is
// then right over the middle of the glass, a little above the rim.
export const glassTop = (size: keyof typeof SIZE_K) => 0.613 * CUP_SCALE * SIZE_K[size]
export const SPOUT = { milk: { side: 0.128, dy: -0.03 }, water: { side: 0.099, dy: -0.084 }, shot: { side: 0.063, dy: -0.013 } } as const
export const pourAbove = (size: keyof typeof SIZE_K) => glassTop(size) + 0.2
// bottles/cans held upside down: nozzle tip this far below the tool's centre
const NOZZLE = { choc: 0.175, whip: 0.195 } as const
export const SIZE_K = { small: 0.72, medium: 0.86, large: 1 } as const // a big see-through glass: you watch the drink build in layers (like the cake)

// ── animation timing (all derived from the pour's start time, so reels stay frame-exact) ──
export const GO = 0.35, BACK = 0.35          // tool flies over / flies home
export const ACT: Record<string, number> = { shot: 1.1, milk: 1.1, water: 0.9, choc: 0.8, sprinkle: 0.9, whip: 0.9 }
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeIO = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const nowS = () => performance.now() / 1000
// the latest pour of this kind (and tool tag), if it's still being performed
function active(kind: string, tag?: string) {
  const ps = useShop.getState().pours
  for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; if (p.kind === kind && (!tag || p.tag === tag)) return nowS() - p.t0 < GO + (p.dur ?? ACT[kind]) + BACK && nowS() - p.t0 > (kind === 'shot' ? -SHOT_FILL - 0.1 : -0.1) ? p : null }
  return null
}
// 0 → 1 → 0 travel weight for a performance, and how far through the action we are
function phase(kind: string, t: number, dur?: number) {
  const d = dur ?? ACT[kind]
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
    const t = nowS() - p.t0
    if (t < 0) { g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); return }
    const { w, act: a, acting } = phase(kind, t, p.dur)
    const tx = CUP_AT[0] + side - home[0], ty = CUP_AT[1] + above - home[1], tz = CUP_AT[2] - home[2]
    g.position.set(tx * w, ty * w + Math.sin(w * Math.PI) * 0.12, tz * w)  // a little arc on the way
    if (act === 'tilt') g.rotation.z = w * (0.35 + 0.75 * Math.sin(Math.min(1, a * 1.4) * Math.PI / 2) * (acting ? 1 : 0.4))
    else if (act === 'shake') { g.rotation.z = w * (2.6 + (acting ? Math.sin(t * 30) * 0.35 : 0)); g.position.y += acting ? Math.abs(Math.sin(t * 30)) * 0.03 : 0 }
    else g.rotation.z = w * Math.PI * 0.92 // upside down (whipped cream can)
  })
  return <group ref={ref}>{children}</group>
}


// liquid layers rise smoothly to their target height (an easing lerp every frame)
// every layer sits on the CURRENT height of the ones below it, so the drink rises as one column (no floating discs)
function Layer({ h, i, col, color, r = 0.19 }: { h: number; i: number; col: number[]; color: string; r?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return
    const k = 1 - Math.exp(-dt * 1.8) // slow enough to watch the cup fill
    col[i] = (col[i] ?? 0) + (Math.max(0, h) - (col[i] ?? 0)) * k
    let y = 0.03; for (let j = 0; j < i; j++) y += col[j] ?? 0
    m.scale.y = Math.max(0.0001, col[i]); m.position.y = y + col[i] / 2
    m.visible = col[i] > 0.002
  })
  const m = useMemo(() => liquidMat(color), [color])
  return <mesh ref={ref} material={m}><cylinderGeometry args={[r, r * 0.9, 1, 32]} /></mesh>
}

// the shot glass lives under the machine's group head: espresso streams into it, then it's carried over and poured
const SHOT_HOME: [number, number, number] = [-1.92, TOP + 0.06, COUNTER.z - 0.6]
const shotState = () => { const s = useShop.getState(), p = active('shot')
  if (!p) return { fill: Math.min(1, s.shotGlass / 90), pulling: s.pulling } // made by hand: the real ml
  const t = nowS() - p.t0
  return t < 0 ? { fill: clamp01((t + SHOT_FILL) / SHOT_FILL), pulling: t < -0.15 } : { fill: (1 - clamp01((t - GO) / ACT.shot)) * 0.7, pulling: false } }
function ShotFill() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => { const m = ref.current; if (!m) return; const { fill } = shotState(); m.visible = fill > 0.02; m.scale.y = Math.max(0.01, fill); m.position.y = -0.046 + 0.045 * fill })
  return <mesh ref={ref} material={mat('#4a2414')} visible={false}><cylinderGeometry args={[0.036, 0.033, 0.09, 16]} /></mesh>
}
function MachineStream() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { const g = ref.current; if (!g) return; const { pulling } = shotState(); g.visible = pulling; g.children.forEach((c, i) => { c.scale.x = c.scale.z = 0.8 + Math.sin(nowS() * 37 + i) * 0.2 }) })
  // two thin streams from the double spout of the group head into the shot glass
  return <group ref={ref} visible={false}>{[-0.012, 0.012].map((x) => <mesh key={x} position={[x, 0.2, 0]} material={mat('#5b2e1c', { rough: 0.2 })}><cylinderGeometry args={[0.005, 0.005, 0.32, 6]} /></mesh>)}</group>
}

// the machine's left group head, in counter space (the cup slides under it for every shot)
const UNDER_MACHINE: [number, number, number] = [-1.92, CUP_AT[1], COUNTER.z - 0.6]

// the drink glass: a lathe-turned tumbler, thin and clear (no transmission pass: cheap on laptop GPUs)
const GLASS_GEO = (() => { const P = (x: number, y: number) => new THREE.Vector2(x, y)
  return new THREE.LatheGeometry([P(0.205, -0.28), P(0.215, -0.1), P(0.235, 0.2), P(0.245, 0.33), P(0.25, 0.34), P(0.24, 0.34), P(0.228, 0.2), P(0.208, -0.1), P(0.198, -0.23)], 48) })()
const GLASS_MAT = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
const GLASS_STACK = new THREE.MeshPhysicalMaterial({ color: '#eaf6f8', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false })
const GLASS_BASE = new THREE.MeshPhysicalMaterial({ color: '#e8f2f4', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 })

function Cup() {
  const cup = useShop((s) => s.cup), d = useShop((s) => s.drink), pours = useShop((s) => s.pours)
  const ref = useRef<THREE.Group>(null)
  // stack the layers bottom-up: espresso, chocolate, water, milk, foam
  // the layers are what's really in the glass (ml), bottom-up: chocolate, espresso, water, milk, foam
  const ml = useShop((s) => s.ml)
  const H = 0.76 / CAP[d.size] // local height per ml (the glass scales with its size, so every size fills the same way)
  const milkC = d.milkType === 'oat' ? '#efdcbc' : d.milkType === 'almond' ? '#f3e6cf' : '#f6eadb'
  const layers: { h: number; color: string }[] = []
  if (ml.choc) layers.push({ h: ml.choc * H, color: '#3b1d12' })
  if (ml.espresso) layers.push({ h: ml.espresso * H, color: '#4a2414' })
  if (ml.water) layers.push({ h: ml.water * H, color: '#7a4a2c' })
  if (ml.milk) layers.push({ h: ml.milk * H, color: d.milk === 'micro' ? '#c89c70' : '#d8b48c' })
  if (ml.foam) layers.push({ h: ml.foam * H, color: d.milk === 'foamy' ? '#fffaf2' : milkC })
  let y = 0.03
  const placed = layers.map((l) => { const o = { ...l, y }; y += l.h; return o })
  // what the top of the drink looks like: crema on espresso, foam on milk, a latte-art heart on micro-foam
  const tex = d.milk === 'micro' ? surfaceTex('art', milkC) : d.milk === 'foamy' ? surfaceTex('foam', '#fffaf2') : d.milk === 'steamed' ? surfaceTex('foam', milkC)
    : d.shots ? surfaceTex('crema', d.water ? '#7a4a2c' : '#9a5f33') : surfaceTex('plain', layers.length ? layers[layers.length - 1].color : '#000')
  // (all hooks above the early return: React needs the same hooks every render)
  const col = useRef<number[]>([]).current, top = useRef<THREE.Group>(null)
  if (!cup) col.length = 0 // a fresh glass starts empty
  useFrame(() => { if (top.current) { let y = 0.03; for (let j = 0; j < placed.length; j++) y += col[j] ?? 0; top.current.position.y = y } })
  if (!cup) return null
  const lastT = pours.length ? pours[pours.length - 1].t0 + GO : 0
  return (
    <group ref={ref}>
      <group scale={CUP_SCALE * SIZE_K[d.size]}>
        {/* a tall clear glass: you see every layer go in (espresso, chocolate, milk, foam, cream) */}
        <mesh geometry={GLASS_GEO} material={GLASS_MAT} renderOrder={2} scale={[0.78, 1.45, 0.78]} position={[0, 0.12, 0]} />
        <mesh position={[0, -0.27, 0]} material={GLASS_BASE}><cylinderGeometry args={[0.158, 0.166, 0.05, 40]} /></mesh>
        <group position={[0, -0.23, 0]}>
          {placed.map((l, i) => <Layer key={i} h={l.h} i={i} col={col} color={l.color} r={0.162} />)}
          <group ref={top}>
            {placed.length > 0 && <Surface r={0.166} y={0.001} tex={tex} last={lastT} />}
            <ToppingFx y={0} />
          </group>
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
  const size = useShop((st) => st.drink.size), S = CUP_SCALE * SIZE_K[size]
  const spout = p.kind === 'milk' || p.kind === 'water' || p.kind === 'shot' ? (pourAbove(size) + SPOUT[p.kind].dy) / S
    : p.kind === 'choc' ? (glassTop(size) + 0.3 - NOZZLE.choc) / S : 1.0
  const stream = useRef<THREE.Mesh>(null), twin = useRef<THREE.Mesh>(null)
  const bits = useRef<THREE.Group>(null)
  const seeds = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: Math.cos(i * 1.7) * 0.12 * Math.random(), z: Math.sin(i * 1.7) * 0.12 * Math.random(), d: Math.random() * 0.5 })), [])
  useFrame(() => {
    // the stream only starts once the tool (or the cup, for shots) has arrived
    const age = performance.now() / 1000 - p.t0 - GO, dur = p.dur ?? ACT[p.kind] ?? 0.9
    const s = stream.current
    if (s) {
      // grows down from the spout, flows for the whole action, then thins out
      const on = p.kind === 'sprinkle' || p.kind === 'whip' || age < 0 ? 0 : age < dur - 0.15 ? 1 : Math.max(0, 1 - (age - dur + 0.15) * 6)
      s.visible = on > 0.01
      const top = 1.0, full = 0.95
      const len = Math.min(1, Math.max(0, age) * 5) * full
      s.scale.set(on * (0.85 + Math.sin(age * 40) * 0.08), Math.max(0.001, len), on); s.position.y = top - len / 2
      // espresso pours as two thin streams from the double spout
      s.position.x = 0
    }
    if (twin.current) { twin.current.visible = false; if (s) { twin.current.scale.copy(s.scale); twin.current.position.set(0.04, s.position.y, 0) } }
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
        <Stream color={p.color} w={w} top={spout} bottom={-0.05} x={0} on={() => (stream.current?.visible ? stream.current.scale.z : 0)} />
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
  const tilt = useRef<THREE.Group>(null), pouring = useRef(false)
  useFrame((_, dt) => { if (tilt.current) tilt.current.rotation.z += ((pouring.current ? 0.9 : 0) - tilt.current.rotation.z) * Math.min(1, dt * 10) })
  const s = useShop.getState
  const picked = useShop((st) => st.milkType === milk)
  return (
    <Hold id={`milk-${milk}`} tip={`${milk} milk: hold to fill the pitcher`} pos={[x, TOP + 0.2, BZ]} size={[0.2, 0.42, 0.2]}
      onStart={() => { pouring.current = true }} onEnd={() => { pouring.current = false }} onHold={(dt) => s().fillPitcher(milk, dt)}>
      <group ref={tilt}>
        <mesh material={glass()}><cylinderGeometry args={[0.075, 0.075, 0.3, 18]} /></mesh>
        <mesh position={[0, -0.03, 0]} material={mat(color)}><cylinderGeometry args={[0.068, 0.068, 0.22, 18]} /></mesh>
        <mesh position={[0, 0.19, 0]} material={mat(cap)}><cylinderGeometry args={[0.045, 0.045, 0.06, 14]} /></mesh>
      </group>
      {picked && <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.butter, { emissive: C.butter })}><ringGeometry args={[0.09, 0.115, 24]} /></mesh>}
    </Hold>
  )
}

function Shaker({ x, label, color, onClick }: { x: number; label: string; color: string; onClick: () => void }) {
  return (
    <Grab id={label} tip={`${label}: click, then click your glass`} pos={[x, TOP + 0.13, RZ]} size={[0.18, 0.3, 0.18]} onClick={onClick} drops={{ cup: onClick }}>
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
  const size = useShop((st) => st.drink.size)
  const hasCup = useShop((st) => st.cup)
  const pAt = useShop((st) => st.pitcher.at)
  const pHome: [number, number, number] = pAt === 'wand' ? [WAND[0], TOP + 0.12, WAND[2]] : [1.95, TOP + 0.12, BZ]
  useFrame(() => s().tick(performance.now() / 1000))
  return (
    <group>
      {/* ── left → right as the barista sees it ── */}
      {/* the glass shelf: small, medium and large glasses, stacked upside down */}
      <group position={[2.62, TOP, RZ + 0.08]}>
        <RBox size={[0.98, 0.04, 0.34]} pos={[0, 0.0, 0]} color={C.woodDark} r={0.015} />
        <RBox size={[0.98, 0.04, 0.34]} pos={[0, 0.5, 0]} color={C.woodDark} r={0.015} />
        {[-0.47, 0.47].map((x) => <RBox key={x} size={[0.04, 0.54, 0.34]} pos={[x, 0.25, 0]} color={C.wood} r={0.012} />)}
      </group>
      {(['small', 'medium', 'large'] as const).map((sz, i) => (
        <Grab key={sz} id={`cups-${sz}`} tip={`${sz} glass: click to pick up, then click the coaster`} pos={[2.32 + i * 0.3, TOP + 0.02, RZ + 0.08]} size={[0.26, 0.46, 0.26]} onClick={() => s().takeCup(sz)} drops={{ cup: () => s().takeCup(sz) }}>
          {[0, 1, 2].map((k) => <mesh key={k} geometry={GLASS_GEO} material={GLASS_STACK} position={[0, 0.2 * SIZE_K[sz] + k * 0.055, 0]} rotation={[Math.PI, 0, 0]} scale={[0.5 * SIZE_K[sz], 0.62 * SIZE_K[sz], 0.5 * SIZE_K[sz]]} />)}
          <Html position={[0, -0.04, 0.16]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}><div className="sizetag">{sz[0].toUpperCase()}</div></Html>
        </Grab>
      ))}
      {/* milk bottles: pick a milk */}
      <MilkBottle x={2.75} milk="whole" color="#fbf8f2" cap="#4a90c2" />
      <MilkBottle x={2.4} milk="oat" color="#eedcb8" cap="#c9a24a" />
      <MilkBottle x={2.05} milk="almond" color="#f2e6d2" cap="#9a6a4a" />
      {/* steel pitcher: steam the milk */}
      <Grab id="milk" tip="milk pitcher: put it on the steam wand, or hold it over your glass to pour" pos={pHome} size={[0.26, 0.3, 0.26]} drops={{ cup: startMilkPour, wand: () => s().placePitcher('wand'), pitcherHome: () => s().placePitcher('home') }}>
        <Flyer kind="milk" home={pHome} act="tilt" side={SPOUT.milk.side} above={pourAbove(size)}>
          <PitcherLevel />
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
      <Grab id="whipped" tip="whipped cream: click, then click your glass" pos={[0.5, TOP + 0.17, RZ]} size={[0.16, 0.38, 0.16]} onClick={() => s().top('whipped')} drops={{ cup: () => s().top('whipped') }}>
        <Flyer kind="whip" home={[0.5, TOP + 0.17, RZ]} act="invert" side={0} above={glassTop(size) + 0.42}>
          <mesh material={mat(C.white)}><cylinderGeometry args={[0.05, 0.05, 0.26, 16]} /></mesh>
          <mesh position={[0, 0.16, 0]} material={mat(C.steel)}><coneGeometry args={[0.035, 0.07, 10]} /></mesh>
        </Flyer>
      </Grab>
      {/* chocolate sauce + hot-water kettle */}
      <Grab id="choc" tip="chocolate: click, then click your glass" pos={[-0.3, TOP + 0.14, BZ]} size={[0.18, 0.32, 0.18]} onClick={() => s().choc()} drops={{ cup: () => s().choc() }}>
        <Flyer kind="choc" home={[-0.3, TOP + 0.14, BZ]} act="invert" side={0} above={glassTop(size) + 0.3}>
          <mesh material={mat('#5a3424', { rough: 0.3 })}><cylinderGeometry args={[0.055, 0.06, 0.22, 16]} /></mesh>
          <mesh position={[0, 0.14, 0]} material={mat('#3b1d12')}><coneGeometry args={[0.035, 0.07, 10]} /></mesh>
        </Flyer>
      </Grab>
      <Grab id="water" tip="hot water: click, then click your glass" pos={[-0.7, TOP + 0.12, BZ]} size={[0.3, 0.3, 0.26]} onClick={() => s().water()} drops={{ cup: () => s().water() }}>
        <Flyer kind="water" home={[-0.7, TOP + 0.12, BZ]} act="tilt" side={SPOUT.water.side} above={pourAbove(size)}>
          <mesh material={mat(C.steel)}><cylinderGeometry args={[0.08, 0.1, 0.16, 20]} /></mesh>
          <mesh position={[0, 0.09, 0]} material={mat(C.steel)}><sphereGeometry args={[0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[-0.12, 0.05, 0]} rotation={[0, 0, 0.9]} material={mat(C.steel)}><cylinderGeometry args={[0.01, 0.012, 0.2, 8]} /></mesh>
        </Flyer>
      </Grab>
      {/* espresso machine (pull a shot) */}
      <Hold id="machine" tip="hold to pull a shot (watch the shot glass)" pos={[-1.6, TOP + 0.6, Z - 0.05]} size={[1.4, 1.3, 1.0]}
        onStart={() => useShop.setState({ pulling: true })} onEnd={() => useShop.setState({ pulling: false })} onHold={(dt) => s().pullTick(dt)} />
      <SteamWand />
      {/* the shot glass: fills under the machine, then is poured into your glass */}
      <Grab id="shotglass" tip="shot glass: click, then click your glass" pos={SHOT_HOME} size={[0.16, 0.22, 0.16]} drops={{ cup: () => s().pourShotGlass() }}>
        <Flyer kind="shot" home={SHOT_HOME} act="tilt" side={SPOUT.shot.side} above={pourAbove(size)}>
          <mesh material={glass()}><cylinderGeometry args={[0.04, 0.034, 0.1, 16, 1, true]} /></mesh>
          <mesh position={[0, -0.05, 0]} material={glass()}><cylinderGeometry args={[0.034, 0.034, 0.008, 16]} /></mesh>
          <ShotFill />
        </Flyer>
      </Grab>
      <group position={SHOT_HOME}><MachineStream /></group>
      {/* flavour syrups on the back row (Sketchfab, CC BY: oparaskos) */}
      {[-0.95, -0.78].map((x, i) => <Model key={x} name="sf:syrup" fit={0.36} pos={[x, TOP - 0.06, RZ + 0.05]} rot={[0, i * 0.8, 0]} />)}
      {/* service bell */}
      <Grab id="bell" tip="serve 🔔" pos={[1.15, TOP + 0.06, BZ]} size={[0.3, 0.2, 0.3]} onClick={() => s().serve()}>
        <mesh position={[0, -0.03, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.1, 0.11, 0.03, 16]} /></mesh>
        <mesh position={[0, 0.01, 0]} material={mat(C.butter, { rough: 0.25 })}><sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      </Grab>
      {/* drop targets: the cup on its saucer, and the pitcher (for milk bottles) */}
      <DropTarget id="cup" pos={[CUP_AT[0], TOP + 0.01, CUP_AT[2]]} r={0.26} />
      <DropTarget id="pitcherHome" pos={[1.95, TOP + 0.01, BZ]} r={0.2} />
      <DropTarget id="wand" pos={[WAND[0], TOP + 0.01, WAND[2]]} r={0.22} />
      <DropTarget id="pass" pos={[1.15, TOP + 0.01, BZ]} r={0.3} />
      {/* your cup on a saucer, front and centre */}
      <mesh position={[CUP_AT[0], TOP + 0.005, CUP_AT[2]]} material={mat(C.cream)}><cylinderGeometry args={[0.2, 0.17, 0.02, 28]} /></mesh>
      <Grab id="glass" tip="your glass: pick it up, put it on the pass (🔔) to serve" pos={CUP_AT} size={[0.42, 0.9, 0.42]} disabled={!hasCup} drops={{ pass: () => s().serve() }}>
        <Cup />
      </Grab>
      <HandPour />
    </group>
  )
}

// ── made by hand: the steam wand, the pitcher's level, and pouring for as long as you hold ──
const WAND: [number, number, number] = [-0.95, 0, COUNTER.z - 0.55]
// start a hold-to-pour: the pitcher flies over and tilts; milk flows every frame until you let go
function startMilkPour() {
  const s = useShop.getState(), p = s.pitcher
  if (!s.cup) { useShop.setState({ hint: 'put a glass on the coaster first' }); return }
  if (p.milk + p.foam < 1) { useShop.setState({ hint: 'the pitcher is empty: hold a milk bottle to fill it' }); return }
  const color = p.type === 'oat' ? '#f1e2c6' : p.type === 'almond' ? '#f5ead8' : '#fffaf2'
  const pour = { kind: 'milk' as const, t0: nowS(), color, dur: Infinity }
  useShop.setState({ pouringMilk: true, pours: [...s.pours, pour], hint: '' })
  const up = () => { window.removeEventListener('pointerup', up); pour.dur = Math.max(0.3, nowS() - pour.t0 - GO); useShop.setState({ pouringMilk: false }) }
  window.addEventListener('pointerup', up)
}
// while the pour is in its acting phase, move milk from the pitcher into the glass
function HandPour() {
  useFrame((_, dt) => {
    const s = useShop.getState(); if (!s.pouringMilk) return
    const p = s.pours[s.pours.length - 1]; if (!p || p.kind !== 'milk' || nowS() - p.t0 < GO) return
    s.pourMilkTick(Math.min(dt, 0.1))
  })
  return null
}
// a steel steam wand beside the machine: put the pitcher under it and HOLD to steam (foam rises, steam puffs)
function SteamWand() {
  const puffs = useRef<THREE.Group>(null)
  const seeds = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ x: Math.cos(i * 2.1) * 0.05, z: Math.sin(i * 2.1) * 0.05, d: i / 8 })), [])
  useFrame(() => {
    const g = puffs.current; if (!g) return
    const on = useShop.getState().steaming, t = nowS()
    g.children.forEach((c, i) => { const k = ((t * 0.9 + seeds[i].d) % 1); c.visible = on; c.position.set(seeds[i].x * (1 + k), 0.35 + k * 0.45, seeds[i].z * (1 + k)); c.scale.setScalar(0.5 + k * 1.4) })
  })
  return (
    <Hold id="wand" tip="steam wand: put the pitcher here, then hold to steam" pos={[WAND[0], TOP + 0.3, WAND[2]]} size={[0.3, 0.6, 0.3]}
      onStart={() => useShop.setState({ steaming: useShop.getState().pitcher.at === 'wand' })} onEnd={() => useShop.setState({ steaming: false })} onHold={(dt) => useShop.getState().steamTick(dt)}>
      <mesh position={[0, 0.25, -0.12]} rotation={[0.35, 0, 0]} material={mat(C.steel, { rough: 0.25 })}><cylinderGeometry args={[0.012, 0.012, 0.42, 8]} /></mesh>
      <mesh position={[0, 0.45, -0.2]} material={mat(C.steel)}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
      <group ref={puffs}>{seeds.map((_, i) => <mesh key={i} visible={false} material={mat('#ffffff', { opacity: 0.45 })}><sphereGeometry args={[0.035, 8, 6]} /></mesh>)}</group>
    </Hold>
  )
}
// what's in the pitcher, seen over the rim: milk level, a lighter foam layer on top, a little wobble while steaming
function PitcherLevel() {
  const milk = useRef<THREE.Mesh>(null), foam = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const { pitcher: p, steaming } = useShop.getState(), total = p.milk + p.foam
    const lv = Math.min(1, total / 360), fv = total ? p.foam / total : 0
    if (milk.current) { milk.current.visible = total > 2; milk.current.position.y = -0.1 + lv * 0.18 * (1 - fv) + (steaming ? Math.sin(clock.elapsedTime * 40) * 0.003 : 0) }
    if (foam.current) { foam.current.visible = p.foam > 2; foam.current.position.y = -0.1 + lv * 0.2; foam.current.scale.y = Math.max(0.01, fv * 4) }
  })
  return (
    <group>
      <mesh ref={milk} rotation={[-Math.PI / 2, 0, 0]} material={mat('#f6eadb')} visible={false}><circleGeometry args={[0.078, 20]} /></mesh>
      <mesh ref={foam} material={mat('#fffaf2')} visible={false}><cylinderGeometry args={[0.08, 0.078, 0.02, 20]} /></mesh>
    </group>
  )
}
export { textureOf }
