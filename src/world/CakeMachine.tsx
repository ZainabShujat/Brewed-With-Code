import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { C } from '../data/palette'
import { mat, glass } from './mats'
import { RBox } from './Soft'
import { useCake, SPONGE_COL, FILL_COL, FROST_COL, PIPE_COL } from '../systems/cake'
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
    if (this.busy || Math.abs(this.x - ST[at]) > 0.05) { sfx.meh(); this.nudge = at; this.nudgeT = performance.now(); return }
    this.run(at, fn)
  },
  nudge: '' as string, nudgeT: 0,
}
const ORDER: Station[] = ['start', 'tin', 'layer', 'fill', 'frost', 'pipe', 'top', 'star']
// testing / capture hook: drive the machine exactly like a player (◀ ▶ = step, a bulb = drop)
if (typeof window !== 'undefined') (window as unknown as { __machine: typeof machine }).__machine = machine

const DIP = 0.9 // seconds: down, act, up

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
      if (m.dipT >= DIP + (m.active === 'frost' ? 1.2 : m.active === 'pipe' ? 1.6 : 0.6)) { m.dipT = -1; m.active = ''; m.queue.shift() }
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
      <Head id="tin" name="tin" x={ST.tin} top={H - 0.25} heads={heads} opts={[
        { label: "round", color: "#cfd3dc", icon: "⚪", fn: () => useCake.getState().setTin("round") },
        { label: "square", color: "#cfd3dc", icon: "⬜", fn: () => useCake.getState().setTin("square") },
        { label: "heart", color: "#cfd3dc", icon: "🤍", fn: () => useCake.getState().setTin("heart") }]}>
        {/* tin press: a steel block that stamps the tin onto the plate */}
        <RBox size={[0.36, 0.3, 0.3]} pos={[0, 0.25, 0]} color={C.steel} r={0.05} />
        <RBox size={[0.42, 0.05, 0.36]} pos={[0, 0.06, 0]} color={C.plum} r={0.02} />
        {[-0.12, 0.12].map((x) => <mesh key={x} position={[x, 0.42, 0]} material={mat(C.mint)}><cylinderGeometry args={[0.03, 0.03, 0.1, 10]} /></mesh>)}
      </Head>
      <Head id="layer" name="sponge" x={ST.layer} top={H - 0.25} heads={heads} opts={(["vanilla", "chocolate", "strawberry"] as const).map((f) => ({ label: f, color: SPONGE_COL[f], fn: () => useCake.getState().addLayer(f) }))}>
        {/* sponge press: a lilac barrel with mint bands */}
        <mesh position={[0, 0.25, 0]} material={mat(C.lilac, { rough: 0.35 })}><cylinderGeometry args={[0.2, 0.2, 0.42, 24]} /></mesh>
        {[0.1, 0.4].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.mint)}><torusGeometry args={[0.205, 0.03, 8, 24]} /></mesh>)}
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.steel)}><coneGeometry args={[0.09, 0.14, 16]} /></mesh>
      </Head>
      <Head id="fill" name="filling" x={ST.fill} top={H - 0.25} heads={heads} opts={(["cream", "jam"] as const).map((f) => ({ label: f, color: FILL_COL[f], fn: () => useCake.getState().addFilling(f) }))}>
        {/* filling pump: a mint squeeze bottle with a butter cap */}
        <mesh position={[0, 0.26, 0]} material={mat(C.mint, { rough: 0.35 })}><capsuleGeometry args={[0.13, 0.22, 6, 18]} /></mesh>
        <mesh position={[0, 0.48, 0]} material={mat(C.butter)}><cylinderGeometry args={[0.08, 0.1, 0.06, 16]} /></mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.plum)}><coneGeometry args={[0.05, 0.16, 12]} /></mesh>
      </Head>
      <Head id="frost" name="frosting" x={ST.frost} top={H - 0.25} heads={heads} opts={(["pink", "white", "chocolate", "lavender"] as const).map((f) => ({ label: f, color: FROST_COL[f], fn: () => useCake.getState().frost(f) }))}>
        {/* frosting fountain: a pink dome bowl that tips a nozzle */}
        <mesh position={[0, 0.25, 0]} material={mat(C.counter, { rough: 0.3 })}><sphereGeometry args={[0.26, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.butter)}><cylinderGeometry args={[0.26, 0.12, 0.18, 24]} /></mesh>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.plum)}><coneGeometry args={[0.07, 0.16, 14]} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[Math.cos(i) * 0.24, 0.3, Math.sin(i) * 0.24]} material={mat(C.plum)}><sphereGeometry args={[0.025, 8, 6]} /></mesh>)}
      </Head>
      <Head id="pipe" name="rosettes" x={ST.pipe} top={H - 0.25} heads={heads} opts={(["white", "pink", "chocolate"] as const).map((p) => ({ label: p, color: PIPE_COL[p], fn: () => useCake.getState().pipe(p) }))}>
        {/* piping arm: a cream cone wrapped in pink rings, steel star tip */}
        <mesh position={[0, 0.22, 0]} rotation={[Math.PI, 0, 0]} material={mat('#fff6ee', { rough: 0.4 })}><coneGeometry args={[0.2, 0.5, 24]} /></mesh>
        {[0.32, 0.2, 0.08].map((y, i) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.counter)}><torusGeometry args={[0.17 - i * 0.05, 0.02, 8, 24]} /></mesh>)}
        <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.steel)}><coneGeometry args={[0.035, 0.08, 6]} /></mesh>
      </Head>
      <Head id="top" name="toppings" x={ST.top} top={H - 0.25} heads={heads} opts={[
        { label: "sprinkles", color: C.butter, icon: "🌈", fn: () => useCake.getState().topWith("sprinkles") },
        { label: "cherries", color: "#b3122e", icon: "🍒", fn: () => useCake.getState().topWith("cherries") },
        { label: "strawberries", color: "#d8344a", icon: "🍓", fn: () => useCake.getState().topWith("strawberries") },
        { label: "candles", color: C.lilac, icon: "🕯️", fn: () => useCake.getState().topWith("candles") }]}>
        {/* topping hopper: a glass bowl full of colourful bits on a purple funnel */}
        <mesh position={[0, 0.28, 0]} material={glass()}><sphereGeometry args={[0.22, 20, 12]} /></mesh>
        {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[Math.cos(i * 2.4) * 0.12 * ((i % 3) / 3 + 0.3), 0.18 + (i % 4) * 0.04, Math.sin(i * 2.4) * 0.1]} material={mat([C.counter, C.mint, C.butter, C.lilac][i % 4])}><sphereGeometry args={[0.035, 6, 4]} /></mesh>)}
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]} material={mat(C.purple)}><coneGeometry args={[0.15, 0.2, 18]} /></mesh>
      </Head>

      {/* ── the order screen: shows the cake to make (then hides it: play from memory) ── */}
      <OrderScreen x={ST.start + 0.05} y={H - 0.55} />

      {/* ── the cake carrier riding the belt ── */}
      <group ref={carrier} position={[ST.start, BELT_Y, 0]}>
        <mesh material={mat(C.white, { rough: 0.25 })} receiveShadow><cylinderGeometry args={[0.42, 0.42, 0.03, 40]} /></mesh>
        <TinRim />
        <group position={[0, 0.015, 0]} scale={0.6}>{children}</group>
      </group>
    </group>
  )
}

type Opt = { color: string; label: string; fn: () => void; icon?: string }
function Head({ id, x, top, heads, children, opts, name }: { id: Station; x: number; top: number; heads: React.MutableRefObject<Record<string, THREE.Group | null>>; children: React.ReactNode; opts: Opt[]; name: string }) {
  return (
    <group position={[x, top - 0.75, 0]}>
      {/* the colour bulbs: click one to drop it onto the cake below */}
      <group position={[0, 0.5, 0.3]}>
        {opts.map((o, i) => {
          const bx = (i - (opts.length - 1) / 2) * 0.135
          return (
            <group key={o.label} position={[bx, 0, 0]}>
              <mesh onClick={(e) => { e.stopPropagation(); machine.drop(id, o.fn) }}
                onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}
                material={mat(o.color, { rough: 0.3 })}><sphereGeometry args={[0.058, 16, 12]} /></mesh>
              <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.03, 0.03, 0.08, 8]} /></mesh>
              {o.icon && <Html position={[0, 0, 0.08]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none', fontSize: 13 }}><span className="headtag icon">{o.icon}</span></Html>}
            </group>
          )
        })}
      </group>
      <Html position={[0, 0.78, 0.3]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}><div className="headtag">{name}</div></Html>
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
    <group position={[x, y, 0.42]} rotation={[-0.15, 0.25, 0]}>
      <RBox size={[0.8, 0.72, 0.07]} color={C.plum} r={0.06} />
      <Html transform position={[0, 0, 0.045]} scale={0.15} zIndexRange={[5, 0]} className="headtag screen">
        <div className="screen3d">{performance.now() < until ? <div><div dangerouslySetInnerHTML={{ __html: cakeSvg(order.want, 220) }} /><div className="screen-tin">{order.want.tin} tin</div></div> : <div className="screen-q">?</div>}</div>
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
