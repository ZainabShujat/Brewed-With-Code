import { useGame } from '../systems/store'
import { Model } from './Models'
import { useGuide } from '../systems/guide'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { C } from '../data/palette'
import { mat, glass } from './mats'
import { RBox } from './Soft'
import { nextCakeStep, useCake, SPONGE_COL, FILL_COL, FROST_COL, PIPE_COL } from '../systems/cake'
import { cakeSvg } from '../ui/cakeSvg'
import { sfx } from '../systems/sound'
import { bodyGeo } from './cakeShape'

// ── The cake machine: a little conveyor under a striped canopy ───────────────────────────────
// The cake rides the belt to each dispenser; the dispenser dips, does its thing, rises; the cake
// moves on. Built entirely from a small kit of shapes (rounded boxes, cylinders, cones, tori).

export const BELT_Y = 1.02, BELT_Z = -9.05
// stations along the belt (x)
export const ST = { start: -9.45, tin: -8.85, layer: -8.15, fill: -7.45, frost: -6.75, pipe: -6.05, top: -5.35, star: -4.55 } as const
type Station = keyof typeof ST

// the machine's little brain: a queue of "go to station, dip, do it" jobs
export const machine = {
  x: ST.start as number, target: ST.start as number, active: '' as Station | '', dipT: -1,
  queue: [] as { at: Station; fn: () => void }[],
  run(at: Station, fn: () => void) { this.queue.push({ at, fn }) },
  get busy() { return this.queue.length > 0 || this.dipT >= 0 },
  // ◀ ▶ : roll the cake one station along the belt; reaching the star sends the cake out
  idx: 0,
  step(dir: 1 | -1) {
    if (this.busy) return
    this.idx = Math.max(0, Math.min(ORDER.length - 1, this.idx + dir)); this.target = ST[ORDER[this.idx]]; sfx.tap()
    if (ORDER[this.idx] === 'star') { this.run('star', () => { useCake.getState().box(); sfx.perfect() }); setTimeout(() => { this.idx = 0; this.target = ST.start }, 2600) }
  },
  // click a bulb on a dispenser: only works when the cake is right under it
  drop(at: Station, fn: () => void) {
    if (this.busy) { sfx.meh(); useCake.setState({ why: { text: "wait, it's still working… ⏳", t: performance.now() } }); return }
    if (Math.abs(this.x - ST[at]) > 0.05) { sfx.meh(); this.nudge = at; this.nudgeT = performance.now(); useCake.setState({ why: { text: 'roll the cake under this one first (◀ ▶)', t: performance.now() } }); return }
    this.run(at, fn)
  },
  nudge: '' as string, nudgeT: 0,
  /** the control deck under the machine: roll the cake to that dispenser (if it isn't there already) and drop the choice */
  choose(at: Station, fn: () => void) {
    if (this.busy) { sfx.meh(); useCake.setState({ why: { text: "wait, it's still working…", t: performance.now() } }); return }
    const i = ORDER.indexOf(at); if (i < 0) return
    this.idx = i; this.target = ST[at]; sfx.tap(); this.run(at, fn)
  },
}
const ORDER: Station[] = ['start', 'tin', 'layer', 'fill', 'frost', 'pipe', 'top', 'star']
// testing / capture hook: drive the machine exactly like a player (◀ ▶ = step, a bulb = drop)
if (typeof window !== 'undefined') (window as unknown as { __machine: typeof machine }).__machine = machine

const DIP = 0.9 // seconds: down, act, up
// a little 'done' pop after each dispenser finishes (playtest: nobody could tell when a step had finished)
const DONE: Record<string, string> = { tin: '✓ tin ready', layer: '✓ sponge added', fill: '✓ filling added', frost: '✓ frosted', pipe: '✓ rosettes piped', top: '✓ toppings on · roll it to ⭐' }
// the dispenser labels: what each one DOES, numbered in order
const LABEL: Record<string, string> = { tin: 'Tin', layer: 'Sponge', fill: 'Filling', frost: 'Frosting', pipe: 'Rosettes', top: 'Toppings' }
export const STEP_NO: Record<string, number> = { tin: 1, layer: 2, fill: 3, frost: 4, pipe: 5, top: 6 }
const STEP_IDX: Record<string, number> = { tin: 0, layer: 1, fill: 2, frost: 3, pipe: 4, top: 5, star: 6 }
/** the guidance state, read every frame by the tags (cheap: plain objects) */
export function cakeGuide() { const k = useCake.getState(); return nextCakeStep(k.cake, k.order.want) }

export function CakeMachine({ children }: { children: React.ReactNode }) {
  const carrier = useRef<THREE.Group>(null)
  const slats = useRef<THREE.Group>(null)
  const heads = useRef<Record<string, THREE.Group | null>>({})
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), m = machine
    // pick up the next job
    const moving = Math.abs(m.target - m.x) > 0.005
    if (moving) m.x += Math.sign(m.target - m.x) * Math.min(Math.abs(m.target - m.x), dt * 2.2)
    else if (m.dipT < 0 && m.queue.length) { m.dipT = 0; m.active = m.queue[0].at }
    if (m.dipT >= 0) {
      const before = m.dipT; m.dipT += dt
      if (before < 0.3 && m.dipT >= 0.3) { m.queue[0].fn(); if (m.active !== 'star') sfx.tap() }
      if (m.dipT >= DIP + (m.active === 'frost' ? 1.2 : m.active === 'pipe' ? 1.6 : 0.6)) { const done = m.active; m.dipT = -1; m.active = ''; m.queue.shift(); if (DONE[done]) { useCake.setState({ yay: { text: DONE[done], t: performance.now() } }); sfx.good() } }
    }
    if (carrier.current) carrier.current.position.x = m.x
    // belt slats crawl while the cake moves
    slats.current?.children.forEach((s, i) => { if (moving) s.position.x = ((s.position.x - ST.start + 0.5 + Math.sign(m.target - m.x) * dt * 2.2 + 5.6) % 5.6) + ST.start - 0.5; void i })
    // dispensers dip down over the cake when it's their turn
    for (const k of Object.keys(heads.current)) {
      const g = heads.current[k]; if (!g) continue
      const on = m.active === k && m.dipT >= 0, p = on ? Math.sin(Math.min(1, m.dipT / 0.3) * Math.PI / 2) * (m.dipT > DIP ? Math.max(0, 1 - (m.dipT - DIP) / 0.4) : 1) : 0
      g.position.y = -p * 0.35
      g.rotation.y = on ? m.dipT * 2.5 : g.rotation.y * 0.9
      // shake 'no' if you clicked it while the cake wasn't underneath
      const nt = (performance.now() - m.nudgeT) / 1000; g.rotation.z = m.nudge === k && nt < 0.5 ? Math.sin(nt * 40) * 0.12 * (1 - nt * 2) : 0
    }
  })

  const slatList = useMemo(() => Array.from({ length: 28 }, (_, i) => ST.start - 0.5 + i * 0.2), [])
  const H = BELT_Y + 2.05 // canopy height
  return (
    <group position={[0, 0, BELT_Z]}>
      <Deck />
      {/* ── conveyor: dark rounded belt on a pink chassis, with crawling slats ── */}
      <RBox size={[5.6, 0.16, 1.0]} pos={[(ST.start + ST.star) / 2, BELT_Y - 0.1, 0]} color="#3a2a40" r={0.07} />
      <group ref={slats}>{slatList.map((x, i) => <mesh key={i} position={[x, BELT_Y - 0.015, 0]} material={mat('#4d3a55')}><boxGeometry args={[0.04, 0.012, 0.9]} /></mesh>)}</group>
      {[ST.start - 0.55, ST.star + 0.55].map((x) => <mesh key={x} position={[x, BELT_Y - 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.09, 0.09, 1.02, 18]} /></mesh>)}
      {/* star platform at the end */}
      <RBox size={[0.95, 0.12, 1.05]} pos={[ST.star + 0.05, BELT_Y - 0.05, 0]} color={C.purple} r={0.05} />
      <mesh position={[ST.star + 0.05, BELT_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.butter, { emissive: C.butter })}><shapeGeometry args={[starShape(0.3)]} /></mesh>

      {/* ── canopy: posts, a striped awning with a scalloped edge, and a round cake sign ── */}
      {[ST.start - 0.75, ST.star + 0.6].map((x) => <RBox key={x} size={[0.12, H - BELT_Y + 0.2, 0.12]} pos={[x, (H + BELT_Y) / 2 - 0.1, -0.45]} color={C.plum} r={0.04} />)}
      <group position={[(ST.start + ST.star) / 2, H, 0.05]} rotation={[0.32, 0, 0]}>
        {Array.from({ length: 12 }, (_, i) => <RBox key={i} size={[0.52, 0.06, 1.25]} pos={[-2.86 + i * 0.52, 0, 0]} color={i % 2 ? '#fff1f6' : C.counter} r={0.02} shadow={false} />)}
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-2.86 + i * 0.52, -0.02, 0.62]} rotation={[0, 0, Math.PI / 2]} material={mat(i % 2 ? '#fff1f6' : C.counter)}><cylinderGeometry args={[0.26, 0.26, 0.06, 16, 1, false, 0, Math.PI]} /></mesh>)}
      </group>
      <group position={[(ST.start + ST.star) / 2, H + 0.55, -0.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mat('#fff6ee')}><cylinderGeometry args={[0.42, 0.42, 0.06, 32]} /></mesh>
        <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.counter)}><torusGeometry args={[0.42, 0.03, 8, 32]} /></mesh>
        <mesh position={[0, -0.08, 0.05]} material={mat(C.counter)}><cylinderGeometry args={[0.16, 0.16, 0.12, 20]} /></mesh>
        <mesh position={[0, 0.0, 0.05]} material={mat('#fff6ee')}><cylinderGeometry args={[0.165, 0.165, 0.04, 20]} /></mesh>
        <mesh position={[0, 0.08, 0.05]} material={mat('#d8344a')}><sphereGeometry args={[0.045, 10, 8]} /></mesh>
      </group>
      {/* the rail the dispensers hang from */}
      <mesh position={[(ST.start + ST.star) / 2, H - 0.25, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.steel)}><cylinderGeometry args={[0.03, 0.03, 5.4, 10]} /></mesh>

      {/* ── four dispensers (each its own look) ── */}
      <Head id="tin" name="tin" x={ST.tin} top={H - 0.25} heads={heads} opts={OPTS.tin}>
        {/* tin press: a steel block that stamps the tin onto the plate */}
        <RBox size={[0.36, 0.3, 0.3]} pos={[0, 0.25, 0]} color={C.steel} r={0.05} />
        <RBox size={[0.42, 0.05, 0.36]} pos={[0, 0.06, 0]} color={C.plum} r={0.02} />
        {[-0.12, 0.12].map((x) => <mesh key={x} position={[x, 0.42, 0]} material={mat(C.mint)}><cylinderGeometry args={[0.03, 0.03, 0.1, 10]} /></mesh>)}
      </Head>
      <Head id="layer" name="sponge" x={ST.layer} top={H - 0.25} heads={heads} opts={OPTS.layer}>
        {/* sponge press: a lilac barrel with mint bands */}
        <mesh position={[0, 0.25, 0]} material={mat(C.lilac, { rough: 0.35 })}><cylinderGeometry args={[0.2, 0.2, 0.42, 24]} /></mesh>
        {[0.1, 0.4].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.mint)}><torusGeometry args={[0.205, 0.03, 8, 24]} /></mesh>)}
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.steel)}><coneGeometry args={[0.09, 0.14, 16]} /></mesh>
      </Head>
      <Head id="fill" name="filling" x={ST.fill} top={H - 0.25} heads={heads} opts={OPTS.fill}>
        {/* filling pump: a mint squeeze bottle with a butter cap */}
        <mesh position={[0, 0.26, 0]} material={mat(C.mint, { rough: 0.35 })}><capsuleGeometry args={[0.13, 0.22, 6, 18]} /></mesh>
        <mesh position={[0, 0.48, 0]} material={mat(C.butter)}><cylinderGeometry args={[0.08, 0.1, 0.06, 16]} /></mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.plum)}><coneGeometry args={[0.05, 0.16, 12]} /></mesh>
      </Head>
      <Head id="frost" name="frosting" x={ST.frost} top={H - 0.25} heads={heads} opts={OPTS.frost}>
        {/* frosting fountain: a pink dome bowl that tips a nozzle */}
        <mesh position={[0, 0.25, 0]} material={mat(C.counter, { rough: 0.3 })}><sphereGeometry args={[0.26, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.butter)}><cylinderGeometry args={[0.26, 0.12, 0.18, 24]} /></mesh>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.plum)}><coneGeometry args={[0.07, 0.16, 14]} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[Math.cos(i) * 0.24, 0.3, Math.sin(i) * 0.24]} material={mat(C.plum)}><sphereGeometry args={[0.025, 8, 6]} /></mesh>)}
      </Head>
      <Head id="pipe" name="rosettes" x={ST.pipe} top={H - 0.25} heads={heads} opts={OPTS.pipe}>
        {/* piping arm: a cream cone wrapped in pink rings, steel star tip */}
        <mesh position={[0, 0.22, 0]} rotation={[Math.PI, 0, 0]} material={mat('#fff6ee', { rough: 0.4 })}><coneGeometry args={[0.2, 0.5, 24]} /></mesh>
        {[0.32, 0.2, 0.08].map((y, i) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.counter)}><torusGeometry args={[0.17 - i * 0.05, 0.02, 8, 24]} /></mesh>)}
        <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.steel)}><coneGeometry args={[0.035, 0.08, 6]} /></mesh>
      </Head>
      <Head id="top" name="toppings" x={ST.top} top={H - 0.25} heads={heads} opts={OPTS.top}>
        {/* topping hopper: a glass bowl full of colourful bits on a purple funnel */}
        <mesh position={[0, 0.28, 0]} material={glass()}><sphereGeometry args={[0.22, 20, 12]} /></mesh>
        {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[Math.cos(i * 2.4) * 0.12 * ((i % 3) / 3 + 0.3), 0.18 + (i % 4) * 0.04, Math.sin(i * 2.4) * 0.1]} material={mat([C.counter, C.mint, C.butter, C.lilac][i % 4])}><sphereGeometry args={[0.035, 6, 4]} /></mesh>)}
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.purple)}><coneGeometry args={[0.15, 0.2, 18]} /></mesh>
      </Head>

      {/* ── the order screen: shows the cake to make (then hides it: play from memory) ── */}
      <OrderScreen x={ST.start - 0.35} y={H - 0.55} /> {/* left of the tin dispenser, so it never hides a tin */}

      {/* ── the cake carrier riding the belt ── */}
      <group ref={carrier} position={[ST.start, BELT_Y, 0]}>
        <mesh material={mat(C.white, { rough: 0.25 })} receiveShadow><cylinderGeometry args={[0.42, 0.42, 0.03, 40]} /></mesh>
        <TinRim />
        <group position={[0, 0.015, 0]} scale={0.6}>{children}</group>
      </group>
    </group>
  )
}

// every dispenser's choices (the bulbs on the machine AND the buttons on the deck below read this)
const OPTS: Record<string, Opt[]> = {
  tin: [
        { label: "round", color: "#8ec9e8", shape: 'round', fn: () => useCake.getState().setTin("round") },
        { label: "square", color: "#f2c66a", shape: 'square', fn: () => useCake.getState().setTin("square") },
        { label: "heart", color: "#ff8fb5", shape: 'heart', fn: () => useCake.getState().setTin("heart") }],
  layer: (["vanilla", "chocolate", "strawberry"] as const).map((f) => ({ label: f, color: SPONGE_COL[f], fn: () => useCake.getState().addLayer(f) })),
  fill: (["cream", "jam"] as const).map((f) => ({ label: f, color: FILL_COL[f], fn: () => useCake.getState().addFilling(f) })),
  frost: (["pink", "white", "chocolate", "lavender"] as const).map((f) => ({ label: f, color: FROST_COL[f], fn: () => useCake.getState().frost(f) })),
  pipe: (["white", "pink", "chocolate"] as const).map((p) => ({ label: p, color: PIPE_COL[p], fn: () => useCake.getState().pipe(p) })),
  top: [
        { label: "sprinkles", color: C.butter, fn: () => useCake.getState().topWith("sprinkles") },
        { label: "cherries", color: "#b3122e", fn: () => useCake.getState().topWith("cherries") },
        { label: "strawberries", color: "#d8344a", fn: () => useCake.getState().topWith("strawberries") },
        { label: "candles", color: C.lilac, fn: () => useCake.getState().topWith("candles") }],
}
type Opt = { color: string; label: string; fn: () => void; icon?: string; shape?: 'round' | 'square' | 'heart' }
const SHAPE: Record<string, string> = {
  round: '<circle cx="8" cy="8" r="6.2"/>', square: '<rect x="2" y="2" width="12" height="12" rx="2"/>',
  heart: '<path d="M8 14 C2 10 1 6 3.5 3.8 C5.5 2 7.5 3.2 8 4.6 C8.5 3.2 10.5 2 12.5 3.8 C15 6 14 10 8 14z"/>' }
/** one picture button in a machine's panel: a white rounded key showing the choice itself */
function Tile({ id, o, y }: { id: Station; o: Opt; y: number }) {
  const g = useRef<THREE.Group>(null), glow = useRef<THREE.Mesh>(null)
  const gm = useMemo(() => mat('#ff7fb6').clone() as THREE.MeshStandardMaterial, [])
  useFrame(() => {
    const gd = cakeGuide(), want = gd.at === id && useGuide.getState().on && gd.want === o.label, t = performance.now() / 160
    if (glow.current) { glow.current.visible = want; gm.emissive.set('#ff4f9a'); gm.emissiveIntensity = 0.35 + Math.sin(t) * 0.25 }
    if (g.current) g.current.scale.setScalar(want ? 1.05 + Math.sin(t) * 0.03 : 1)
  })
  const pick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); machine.choose(id, o.fn) }
  const c = o.color
  return (
    <group ref={g} position={[0, y, 0]} name={`deck:${id}:${o.label}`} onClick={pick}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <mesh ref={glow} position={[0, 0, -0.006]} visible={false} material={gm}><boxGeometry args={[0.3, 0.15, 0.02]} /></mesh>
      <RBox size={[0.27, 0.125, 0.03]} pos={[0, 0, 0]} color="#ece0f2" r={0.03} shadow={false} /> {/* soft lilac, so white frosting / rosettes still show */}
      <group position={[0, 0, 0.028]}>
        {id === 'tin' ? (o.shape === 'round' ? <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(c)}><cylinderGeometry args={[0.042, 0.042, 0.016, 22]} /></mesh>
          : o.shape === 'square' ? <mesh material={mat(c)}><boxGeometry args={[0.075, 0.075, 0.016]} /></mesh>
          : <group>{[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.019, 0.012, 0]} material={mat(c)}><sphereGeometry args={[0.026, 12, 8]} /></mesh>)}
              <mesh position={[0, -0.013, 0]} rotation={[0, 0, Math.PI / 4]} material={mat(c)}><boxGeometry args={[0.044, 0.044, 0.018]} /></mesh></group>)
        : id === 'top' ? (o.label === 'sprinkles' ? <group>{[[-0.05, 0.015, '#f07fa8'], [-0.015, 0.02, '#7fc8a9'], [0.02, 0.0, '#f7dd77'], [0.05, 0.018, '#a47fe0'], [-0.03, -0.02, '#f07fa8'], [0.035, -0.022, '#7fc8a9']].map(([dx, dy, col], i) =>
              <mesh key={i} position={[dx as number, dy as number, 0]} rotation={[0, 0, i * 0.9]} material={mat(col as string)}><boxGeometry args={[0.03, 0.009, 0.009]} /></mesh>)}</group>
          : o.label === 'cherries' ? <group>{[-0.024, 0.024].map((dx) => <mesh key={dx} position={[dx, -0.008, 0]} material={mat('#b3122e')}><sphereGeometry args={[0.024, 12, 8]} /></mesh>)}
              <mesh position={[0, 0.022, 0]} rotation={[0, 0, 0]} material={mat('#3a7a4a')}><boxGeometry args={[0.05, 0.006, 0.006]} /></mesh></group>
          : o.label === 'strawberries' ? <group>{[-0.03, 0.03].map((dx) => <mesh key={dx} position={[dx, 0, 0]} scale={[1, 1.2, 0.7]} material={mat('#d8344a')}><sphereGeometry args={[0.025, 12, 8]} /></mesh>)}</group>
          : <group>{[-0.03, 0, 0.03].map((dx) => <group key={dx} position={[dx, -0.008, 0]}><mesh material={mat(C.lilac)}><boxGeometry args={[0.012, 0.05, 0.01]} /></mesh>
              <mesh position={[0, 0.033, 0]} material={mat('#f7b733', { emissive: '#f7b733' })}><sphereGeometry args={[0.008, 8, 6]} /></mesh></group>)}</group>)
        /* frosting: a soft piped swirl, rings narrowing to a peak */
        : id === 'frost' ? <group position={[0, -0.038, 0]} scale={1.0}>{[[0.05, 0], [0.038, 0.022], [0.026, 0.042], [0.014, 0.058]].map(([r, y], i) =>
            <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(c, { rough: 0.45 })}><torusGeometry args={[r, 0.014, 10, 24]} /></mesh>)}
            <mesh position={[0, 0.072, 0]} material={mat(c, { rough: 0.45 })}><coneGeometry args={[0.012, 0.03, 10]} /></mesh></group>
        /* rosettes: the piped rosette itself, petals round a centre (two, like on the cake) */
        : id === 'pipe' ? <group>{[-0.055, 0.055].map((dx) => <group key={dx} position={[dx, 0, 0]}>
            {Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0]} scale={[1, 1, 0.7]} material={mat(c, { rough: 0.45 })}><sphereGeometry args={[0.014, 10, 8]} /></mesh> })}
            <mesh position={[0, 0, 0.006]} material={mat(c, { rough: 0.45 })}><sphereGeometry args={[0.014, 10, 8]} /></mesh></group>)}</group>
        /* sponge / filling: a little layer of that colour, like a slice of the cake */
        : <mesh rotation={[0, 0, Math.PI / 2]} material={mat(c, { rough: 0.5 })}><capsuleGeometry args={[0.028, 0.13, 6, 16]} /></mesh>}
      </group>
    </group>
  )
}
/** the counter front under the belt: one tall panel per machine, right below it, its choices stacked as picture
 *  buttons. Press one: the cake rolls to that machine and it drops it. The next machine's panel lights up. */
function Panel({ id }: { id: Station }) {
  const fm = useMemo(() => mat(C.lilac).clone() as THREE.MeshStandardMaterial, [])
  useFrame(() => { const gd = cakeGuide(), next = gd.at === id, done = STEP_IDX[id] < STEP_IDX[gd.at]
    fm.color.set(next ? '#ff7fb6' : done ? '#c9b8d8' : C.lilac) })
  const os = OPTS[id], step = 0.145
  return (
    <group position={[ST[id], 0, 0]} scale={1.22}>
      <mesh position={[0, 0, -0.03]} material={fm}><boxGeometry args={[0.36, 0.66, 0.03]} /></mesh>
      <RBox size={[0.31, 0.61, 0.03]} pos={[0, 0, -0.01]} color="#fde6ef" r={0.04} shadow={false} />
      {os.map((o, i) => <Tile key={o.label} id={id} o={o} y={((os.length - 1) / 2 - i) * step} />)}
    </group>
  )
}
function Deck() {
  return (
    <group position={[0, BELT_Y - 0.56, 0.6]}>
      {/* the counter's front face the panels are set into */}
      <RBox size={[ST.star - ST.start + 1.3, 0.92, 0.05]} pos={[(ST.start + ST.star) / 2, 0, -0.06]} color="#3a2a40" r={0.04} shadow={false} />
      {(['tin', 'layer', 'fill', 'frost', 'pipe', 'top'] as Station[]).map((id) => <Panel key={id} id={id} />)}
    </group>
  )
}
function HeadTag({ id, name }: { id: Station; name: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useFrame(() => { const el = ref.current; if (!el) return
    const g = cakeGuide(), here = Math.abs(machine.x - ST[id]) < 0.05 && !machine.busy
    const state = STEP_IDX[id] < STEP_IDX[g.at] ? ' done' : g.at === id ? ' next' : ''
    const c = 'ctag' + state + (here ? ' here' : '') + (useGame.getState().mode === 'cake' ? '' : ' away'); if (el.className !== c) el.className = c }) // only at the cake bench (they floated over the Dollhouse view)
  return <Html position={[0, 0.86, 0.3]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
    <div ref={ref} className="ctag"><b>{STEP_NO[id]}</b><span>{LABEL[id] ?? name}</span><i className="ctag-arrow" /></div></Html>
}
/** each choice's name, shown when the cake is under its dispenser; the one the order wants pulses (guide on) */
function OptTag({ id, label, i = 0 }: { id: Station; label: string; i?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useFrame(() => { const el = ref.current; if (!el) return
    const g = cakeGuide(), here = Math.abs(machine.x - ST[id]) < 0.05, want = useGuide.getState().on && g.at === id && g.want === label
    const c = 'otag' + (here || want ? ' show' : '') + (want ? ' want' : ''); if (el.className !== c) el.className = c })
  return <Html position={[0, i % 2 ? -0.24 : -0.12, 0.06]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}><div ref={ref} className="otag">{label}</div></Html> // staggered, so neighbours never overlap
}
function Head({ id, x, top, heads, children, opts, name }: { id: Station; x: number; top: number; heads: React.MutableRefObject<Record<string, THREE.Group | null>>; children: React.ReactNode; opts: Opt[]; name: string }) {
  return (
    <group position={[x, top - 0.75, 0]}>
      {/* the colour bulbs: click one to drop it onto the cake below */}
      <group position={[0, 0.5, 0.3]}>
        {opts.map((o, i) => {
          const bx = (i - (opts.length - 1) / 2) * 0.155
          const pick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); machine.drop(id, o.fn) }
          return (
            <group key={o.label} position={[bx, 0, 0]}>
              {/* a generous invisible tap area (fingers!), then the bulb or the tin's own shape */}
              <mesh onClick={pick} visible={false}
                onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
                <sphereGeometry args={[0.11, 8, 6]} /></mesh>
              {o.shape === 'round' ? <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(o.color, { rough: 0.3 })}><cylinderGeometry args={[0.062, 0.062, 0.035, 24]} /></mesh>
                : o.shape === 'square' ? <mesh material={mat(o.color, { rough: 0.3 })}><boxGeometry args={[0.11, 0.11, 0.035]} /></mesh>
                : o.shape === 'heart' ? <group>{[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.028, 0.02, 0]} material={mat(o.color, { rough: 0.3 })}><sphereGeometry args={[0.04, 14, 10]} /></mesh>)}
                    <mesh position={[0, -0.022, 0]} rotation={[0, 0, Math.PI / 4]} material={mat(o.color, { rough: 0.3 })}><boxGeometry args={[0.068, 0.068, 0.05]} /></mesh></group>
                : <mesh material={mat(o.color, { rough: 0.3 })}><sphereGeometry args={[0.066, 16, 12]} /></mesh>}
              <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.03, 0.03, 0.08, 8]} /></mesh>

            </group>
          )
        })}
      </group>
      <HeadTag id={id} name={name} />
      <mesh position={[0, 0.62, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.025, 0.025, 0.3, 8]} /></mesh>
      <group ref={(g) => { heads.current[id] = g }}>{children}</group>
    </group>
  )
}

function OrderScreen({ x, y }: { x: number; y: number }) {
  const order = useCake((s) => s.order), until = useCake((s) => s.orderUntil)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 400); return () => clearInterval(id) }, [])
  return (
    <group position={[x, y, 0.42]} rotation={[-0.15, 0.25, 0]} onClick={(e) => { e.stopPropagation(); if (performance.now() >= until) useCake.getState().peek() }}
      onPointerOver={() => { if (performance.now() >= until) document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <RBox size={[0.8, 0.72, 0.07]} color={C.plum} r={0.06} />
      <Html transform position={[0, 0, 0.045]} scale={0.15} zIndexRange={[5, 0]} className="headtag screen">
        <div className="screen3d">{performance.now() < until ? <div><div dangerouslySetInnerHTML={{ __html: cakeSvg(order.want, 220) }} /><div className="screen-tin">{order.want.tin} tin</div></div> : <div className="screen-q">?<small>tap to peek</small></div>}</div>
      </Html>
    </group>
  )
}

function TinRim() {
  const tin = useCake((s) => s.cake.tin)
  if (tin === 'none') return null
  // a thin steel tin under the cake, its shape showing round the base
  return <mesh position={[0, 0.03, 0]} geometry={bodyGeo(tin, 0.37, 0.05)} material={mat(C.steel, { rough: 0.3 })} />
}

function starShape(r: number) {
  const s = new THREE.Shape()
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) }
  return s
}
