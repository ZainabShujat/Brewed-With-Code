import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCake, SPONGE_COL, FILL_COL, FROST_COL, PIPE_COL } from '../systems/cake'
import { C } from '../data/palette'
import { mat, glow } from './mats'
import { RBox } from './Soft'
import { Shelf } from './Props'
import { tileTex } from './textures'
import { Grab, DropTarget } from '../systems/drag'
import { CakeMachine } from './CakeMachine'
import { bodyGeo, edge, outline } from './cakeShape'
import { glass } from './mats'

// The cake bench lives in the kitchen (back-left corner). Everything on the turntable is drawn
// from useCake state; each new part animates in using the time it was added (t[...]).
// the turntable sits on the bakery counter run along the back wall
export const CAKE_AT: [number, number, number] = [-7.0, 0, -9.05]
const R = 0.55, LH = 0.2, FH = 0.045, TOP = 1.02 // cake radius, layer height, filling height, turntable top

const now = () => performance.now() / 1000
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const bounce = (x: number) => { x = clamp01(x); return 1 - Math.pow(1 - x, 3) * Math.cos(x * 6) } // drop with a little settle

// a sponge falls with gravity, squashes on landing, springs back, and puffs a little flour
const FALL = 0.42
function Sponge({ y, h, r, color, t0 }: { y: number; h: number; r: number; color: string; t0: number }) {
  const ref = useRef<THREE.Mesh>(null), puff = useRef<THREE.Group>(null)
  const tin = useCake((st) => st.cake.tin)
  useFrame(() => {
    const m = ref.current; if (!m) return
    const t = now() - t0
    m.visible = t >= 0
    const f = clamp01(t / FALL)
    m.position.y = y + h / 2 + (1 - f * f) * 1.1          // accelerating fall (y ∝ t²)
    const s = t - FALL                                       // after impact: squash, then a damped wobble back
    const sq = s > 0 ? Math.exp(-s * 9) * Math.cos(s * 26) * 0.22 : 0
    m.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5)
    puff.current?.children.forEach((c, i) => {
      const k = clamp01(s / 0.6); c.visible = s > 0 && k < 1
      const a = (i / 8) * Math.PI * 2, d = r * (0.95 + k * 0.35)
      c.position.set(Math.cos(a) * d, y + 0.03 + k * 0.12, Math.sin(a) * d); c.scale.setScalar(0.4 + k * 1.4)
      ;((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = (1 - k) * 0.55
    })
  })
  const puffMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff8ee', transparent: true, opacity: 0.5, depthWrite: false }), [])
  return (
    <group>
      <mesh ref={ref} geometry={bodyGeo(tin, r, h)} material={mat(color, { rough: 0.85 })} castShadow />
      <group ref={puff}>{Array.from({ length: 8 }, (_, i) => <mesh key={i} material={puffMat} visible={false}><sphereGeometry args={[0.05, 8, 6]} /></mesh>)}</group>
    </group>
  )
}

// the piping bag: a white cone with a steel tip, moved around by whoever is "piping"
function Bag({ bagRef, color }: { bagRef: React.RefObject<THREE.Group>; color: string }) {
  return (
    <group ref={bagRef} visible={false}>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI, 0, 0]} material={mat('#fffaf4', { rough: 0.55 })} castShadow><coneGeometry args={[0.09, 0.32, 16]} /></mesh>
      <mesh position={[0, 0.36, 0]} material={mat(color, { rough: 0.4 })}><sphereGeometry args={[0.085, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={mat(C.steel)}><coneGeometry args={[0.025, 0.05, 10]} /></mesh>
    </group>
  )
}

// cream/jam filling is piped in a spiral from the centre out, spreading as the bag moves
function Filling({ y, h, r, color, t0 }: { y: number; h: number; r: number; color: string; t0: number }) {
  const disc = useRef<THREE.Mesh>(null), bag = useRef<THREE.Group>(null)
  const tin = useCake((st) => st.cake.tin)
  const D = 0.75
  useFrame(() => {
    const t = now() - t0, k = clamp01(t / D)
    if (disc.current) { disc.current.visible = t >= 0; const e = Math.sqrt(k); disc.current.scale.set(Math.max(0.001, e), 1, Math.max(0.001, e)) }
    const g = bag.current
    if (g) { g.visible = t >= 0 && t < D + 0.15; const a = k * Math.PI * 5, rr = Math.sqrt(k) * (r - 0.05); g.position.set(Math.cos(a) * rr, y + h + 0.02, Math.sin(a) * rr) }
  })
  return (
    <group>
      <mesh ref={disc} position={[0, y + h / 2, 0]} geometry={bodyGeo(tin, r, h)} material={mat(color, { rough: 0.45 })} />
      <Bag bagRef={bag} color={color} />
    </group>
  )
}

// drip-cake frosting: it spreads across the top, wraps a short collar round the edge, then drips
// run part-way down the sides at different lengths (the sponge layers stay visible below)
function Frosting({ height, color, t0: tPour }: { height: number; color: string; t0: number }) {
  const POUR = 0.45 // the bowl tips and pours first; the frosting lands and spreads after
  const t0 = tPour + POUR
  const collar = useRef<THREE.Mesh>(null), cap = useRef<THREE.Mesh>(null), drips = useRef<THREE.Group>(null)
  const bowl = useRef<THREE.Group>(null), stream = useRef<THREE.Mesh>(null)
  const tin = useCake((st) => st.cake.tin)
  const hash = (n: number) => { const v = Math.sin(n * 91.345) * 47453.21; return v - Math.floor(v) }
  const D = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    a: (i / 22) * Math.PI * 2 + (hash(i) - 0.5) * 0.18,
    len: Math.min(height * 0.62, 0.05 + hash(i + 50) * height * 0.55), // uneven, never all the way down
    w: 0.03 + hash(i + 90) * 0.012,
  })), [height])
  const m = mat(color, { rough: 0.3 }) // glossy frosting
  const RIM = useMemo(() => outline(tin, R + 0.012, D.length), [tin, D.length])
  const COLLAR = 0.075
  useFrame(() => {
    // the bowl: glides in, tips, pours a thick ribbon onto the centre, then tilts back and leaves
    const tb = now() - tPour, inK = clamp01(tb / 0.3), outK = clamp01((tb - 1.25) / 0.3), wb = inK * (1 - outK)
    if (bowl.current) { bowl.current.visible = tb >= 0 && outK < 1; bowl.current.position.set(0.35, height + 0.75 + (1 - wb) * 0.4, 0); bowl.current.rotation.z = wb * 1.15 }
    if (stream.current) { const on = tb > 0.3 && tb < 1.25; stream.current.visible = on; const len = Math.min(0.62, Math.max(0, tb - 0.3) * 3); stream.current.scale.set(1 + Math.sin(tb * 35) * 0.08, Math.max(0.001, len), 1); stream.current.position.set(0.08, height + 0.68 - len / 2, 0) }
    const t = now() - t0, k = clamp01(t / 0.6)
    if (cap.current) { cap.current.visible = t >= 0; const r = 0.25 + 0.75 * (1 - Math.pow(1 - k, 2)); cap.current.scale.set(r, 1, r) }
    if (collar.current) { const kc = clamp01((t - 0.45) / 0.35); collar.current.visible = kc > 0; collar.current.scale.y = Math.max(0.001, kc) }
    drips.current?.children.forEach((c, i) => {
      const kk = clamp01((t - 0.75 - hash(i + 7) * 0.5) / 0.9), e = 1 - Math.pow(1 - kk, 3) // each drip runs at its own pace, easing to a stop
      c.visible = kk > 0; c.scale.y = Math.max(0.001, e)
    })
  })
  return (
    <group>
      <group ref={bowl} visible={false}>
        <mesh material={mat(C.cream, { rough: 0.3 })}><cylinderGeometry args={[0.22, 0.14, 0.16, 24, 1, true]} /></mesh>
        <mesh position={[0, 0.04, 0]} material={m}><cylinderGeometry args={[0.2, 0.2, 0.04, 24]} /></mesh>
      </group>
      <mesh ref={stream} visible={false} material={m}><cylinderGeometry args={[0.05, 0.04, 1, 12]} /></mesh>
      <mesh ref={cap} position={[0, height + 0.02, 0]} geometry={bodyGeo(tin, R + 0.03, 0.045)} material={m} />
      <mesh ref={collar} position={[0, height - COLLAR / 2 + 0.01, 0]} geometry={bodyGeo(tin, R + 0.018, COLLAR)} material={m} />
      <group ref={drips} position={[0, height - COLLAR + 0.02, 0]}>
        {D.map((d, i) => (
          // rotate each drip so its flat side lies against the cake
          <group key={i} position={[RIM[i].x, 0, RIM[i].z]} rotation={[0, Math.PI / 2 - RIM[i].a, 0]}>
            <mesh position={[0, -d.len / 2, 0]} scale={[1, 1, 0.6]} material={m}><capsuleGeometry args={[d.w, d.len, 4, 10]} /></mesh>
            <mesh position={[0, -d.len - d.w * 0.4, 0]} scale={[1, 1, 0.65]} material={m}><sphereGeometry args={[d.w * 1.25, 12, 8]} /></mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// piped rosettes: the piping bag travels round the rim; each rosette squeezes up and twists into shape
function Rosettes({ y, color, t0 }: { y: number; color: string; t0: number }) {
  const g = useRef<THREE.Group>(null), bag = useRef<THREE.Group>(null)
  const tin = useCake((st) => st.cake.tin)
  const N = 14, STEP = 0.13, SQ = 0.22
  const RO = useMemo(() => outline(tin, R - 0.075, N), [tin])
  useFrame(() => {
    const t = now() - t0
    g.current?.children.forEach((c, i) => {
      const k = clamp01((t - i * STEP) / SQ); c.visible = k > 0
      const e = 1 - Math.pow(1 - k, 3)
      c.scale.set(0.6 + 0.4 * e, Math.max(0.001, e * (k < 1 ? 1.15 : 1)), 0.6 + 0.4 * e); c.rotation.y = e * 1.6
    })
    const bg = bag.current
    if (bg) {
      const i = Math.min(N - 1, Math.max(0, Math.floor(t / STEP))), into = clamp01((t - i * STEP) / STEP)
      bg.visible = t >= 0 && t < N * STEP + 0.2
      const p0 = RO[i], p1 = RO[(i + 1) % N]
      bg.position.set(p0.x + (p1.x - p0.x) * into * 0.5, y + 0.12 + Math.abs(Math.sin(into * Math.PI)) * 0.06, p0.z + (p1.z - p0.z) * into * 0.5) // a little lift between rosettes
    }
  })
  const m = mat(color, { rough: 0.4 })
  return (
    <group>
      <group ref={g} position={[0, y, 0]}>
        {RO.map((p, i) => { return (
          <group key={i} position={[p.x, 0, p.z]}>
            <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={m}><torusGeometry args={[0.055, 0.026, 8, 16]} /></mesh>
            <mesh position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]} material={m}><torusGeometry args={[0.035, 0.022, 8, 14]} /></mesh>
            <mesh position={[0, 0.095, 0]} material={m}><coneGeometry args={[0.03, 0.06, 10]} /></mesh>
          </group>) })}
      </group>
      <Bag bagRef={bag} color={color} />
    </group>
  )
}

// toppings: sprinkles rain down; cherries / strawberries / candles pop on
// a proper strawberry: a rounded, slightly heart-shaped berry (lathe profile), seed dots, a leafy green top
const BERRY = (() => { const P = (x: number, y: number) => new THREE.Vector2(x, y)
  return new THREE.LatheGeometry([P(0, -0.05), P(0.014, -0.046), P(0.03, -0.03), P(0.043, -0.005), P(0.048, 0.02), P(0.042, 0.042), P(0.026, 0.055), P(0, 0.058)], 18) })()
const SEEDS = Array.from({ length: 14 }, (_, i) => { const a = i * 2.4, yy = -0.035 + (i % 5) * 0.018, rr = 0.016 + Math.min(0.03, (yy + 0.05) * 0.5); return [Math.cos(a) * rr, yy, Math.sin(a) * rr] as [number, number, number] })

function Toppings({ y, kind, t0 }: { y: number; kind: string; t0: number }) {
  const g = useRef<THREE.Group>(null)
  const tin = useCake((st) => st.cake.tin)
  // scatter: a hash-based random spread over the top (sqrt keeps it even, not bunched in the middle)
  const hash = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v) }
  const S = useMemo(() => Array.from({ length: 90 }, (_, i) => { const r = Math.sqrt(hash(i + 1)) * (R - 0.13), a = hash(i + 101) * Math.PI * 2; return { x: Math.cos(a) * r, z: Math.sin(a) * r, d: hash(i + 201) * 0.5, rot: hash(i + 301) * 6.28 } }), [])
  const cols = [C.counter, C.mint, C.butter, C.lilac, '#ffffff']
  useFrame(() => g.current?.children.forEach((c, i) => {
    if (kind === 'sprinkles') { const s = S[i]; const k = clamp01((now() - t0 - s.d) / 0.6); c.visible = now() - t0 > s.d; c.position.set(s.x, y + 0.01 + (1 - k * k) * 1.4, s.z) }
    else { const tt = now() - t0 - i * 0.12, k = clamp01(tt / 0.35); c.visible = tt > 0; c.scale.setScalar(1)
      const base = (c.userData.y0 ??= c.position.y); c.position.y = base + (1 - bounce(k)) * 0.45 } // drop in with a little bounce
  }))
  if (kind === 'sprinkles') return <group ref={g}>{S.map((s, i) => <mesh key={i} rotation={[Math.PI / 2, 0, s.rot]} material={mat(cols[i % cols.length], { rough: 0.3 })}><capsuleGeometry args={[0.009, 0.035, 2, 4]} /></mesh>)}</group>
  const n = kind === 'candles' ? 5 : 7
  const RIMP = useMemo(() => outline(tin, kind === 'candles' ? 0.25 : R - 0.09, n), [tin, kind])
  return (
    <group ref={g}>
      {RIMP.map((q, i) => { const p: [number, number, number] = [q.x, y + 0.12, q.z]
        if (kind === 'cherries') return <group key={i} position={p}><mesh material={mat('#b3122e', { rough: 0.2 })}><sphereGeometry args={[0.05, 14, 10]} /></mesh><mesh position={[0.01, 0.07, 0]} rotation={[0, 0, -0.3]} material={mat('#4b6b2a')}><cylinderGeometry args={[0.005, 0.005, 0.09, 4]} /></mesh></group>
        if (kind === 'strawberries') return <group key={i} position={p} rotation={[0.25, i * 1.3, 0]}><mesh geometry={BERRY} material={mat('#e0304a', { rough: 0.25 })} />{SEEDS.map((q, j) => <mesh key={j} position={q} material={mat('#ffd36b')}><sphereGeometry args={[0.005, 4, 3]} /></mesh>)}{[0, 1, 2, 3, 4].map((j) => <mesh key={j} position={[Math.cos(j * 1.256) * 0.022, 0.058, Math.sin(j * 1.256) * 0.022]} rotation={[Math.sin(j * 1.256) * 0.9, 0, -Math.cos(j * 1.256) * 0.9]} material={mat('#4f8a34')}><coneGeometry args={[0.012, 0.04, 4]} /></mesh>)}</group>
        return <group key={i} position={[p[0], y, p[2]]}><mesh position={[0, 0.12, 0]} material={mat(i % 2 ? C.counter : C.lilac)}><cylinderGeometry args={[0.014, 0.014, 0.24, 8]} /></mesh><mesh position={[0, 0.27, 0]} material={glow('#ffb347')}><sphereGeometry args={[0.025, 8, 6]} /></mesh></group>
      })}
    </group>
  )
}

function TheCake() {
  const { cake, t } = useCake()
  // stack bottom-up: layer, filling, layer, filling, layer…
  const parts: { y: number; h: number; r: number; color: string; t0: number; fill?: boolean }[] = []
  let y = 0
  cake.layers.forEach((s, i) => {
    parts.push({ y, h: LH, r: R, color: SPONGE_COL[s], t0: t[`L${i}`] ?? 0 }); y += LH
    if (cake.fillings[i]) { parts.push({ y, h: FH, r: R - 0.02, color: FILL_COL[cake.fillings[i]], t0: t[`F${i}`] ?? 0, fill: true }); y += FH }
  })
  const topY = y + (cake.frosting !== 'none' ? 0.04 : 0)
  return (
    <group>
      {parts.map((p, i) => p.fill ? <Filling key={i} {...p} /> : <Sponge key={i} {...p} />)}
      {cake.frosting !== 'none' && <Frosting height={y} color={FROST_COL[cake.frosting]} t0={t.frost} />}
      {cake.piping !== 'none' && <Rosettes y={topY} color={PIPE_COL[cake.piping]} t0={t.pipe} />}
      {cake.top !== 'none' && <Toppings y={topY} kind={cake.top} t0={t.top} />}
    </group>
  )
}

const BRASS = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.9, roughness: 0.3 })
const TILES = (() => { const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18 }); const t = tileTex().clone(); t.repeat.set(7, 2.4); t.needsUpdate = true; m.map = t; return m })()
const DARK_GLASS = new THREE.MeshStandardMaterial({ color: '#2a1a14', roughness: 0.08, metalness: 0.2, emissive: '#ff9a4a', emissiveIntensity: 0.18 })

// The open bakery corner along the back wall: a counter run with a built-in oven, the turntable,
// a stand mixer, flour/sugar canisters, a tiled backsplash and a jar shelf.
function BakeryCorner() {
  const x0 = -9.85, x1 = -4.35, cx = (x0 + x1) / 2, w = x1 - x0, z = -9.2, d = 1.3, top = 0.93
  return (
    <group>
      {/* tiled backsplash on the back wall */}
      <mesh position={[cx, 1.75, -9.83]} material={TILES} receiveShadow><planeGeometry args={[w, 1.6]} /></mesh>
      {/* base cabinets + marble top */}
      <RBox size={[w, 0.88, d]} pos={[cx, 0.44, z]} color={C.wood} r={0.03} />
      <RBox size={[w + 0.08, 0.07, d + 0.08]} pos={[cx, top, z]} color={C.counterTop} r={0.015} />
      {/* painted cabinet doors with brass knobs (skipping the oven bay) */}
      {[-7.7, -6.6, -5.5, -4.95].map((x, i) => (
        <group key={x} position={[x, 0.45, z + d / 2 + 0.01]}>
          <RBox size={[i === 3 ? 0.7 : 1.0, 0.72, 0.04]} color="#8fb8a8" r={0.015} />
          <mesh position={[i === 3 ? -0.24 : 0.38, 0.22, 0.04]} material={BRASS}><sphereGeometry args={[0.03, 12, 8]} /></mesh>
        </group>
      ))}
      {/* built-in oven: steel front, warm glowing glass door, handle bar, knobs */}
      <group position={[-9.05, 0.47, z + d / 2 + 0.015]}>
        <RBox size={[1.2, 0.84, 0.05]} color={C.steel} r={0.02} />
        <RBox size={[0.9, 0.46, 0.02]} pos={[0, -0.06, 0.03]} material={DARK_GLASS} r={0.02} shadow={false} />
        <mesh position={[0, 0.25, 0.07]} rotation={[0, 0, Math.PI / 2]} material={BRASS}><capsuleGeometry args={[0.018, 0.7, 4, 10]} /></mesh>
        {[-0.4, -0.25, 0.25, 0.4].map((kx) => <mesh key={kx} position={[kx, 0.36, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.03, 0.03, 0.03, 14]} /></mesh>)}
      </group>
      {/* stand mixer (dusty-rose enamel, steel bowl) */}
      <group position={[-3.75, top + 0.03, z - 0.15]}>
        <RBox size={[0.42, 0.08, 0.6]} pos={[0, 0.04, 0]} color={C.counter} r={0.04} />
        <RBox size={[0.18, 0.55, 0.18]} pos={[0, 0.34, -0.2]} color={C.counter} r={0.07} />
        <mesh position={[0, 0.66, -0.02]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.counter, { rough: 0.3 })}><capsuleGeometry args={[0.13, 0.36, 6, 16]} /></mesh>
        <mesh position={[0, 0.2, 0.08]} material={mat(C.steel)}><cylinderGeometry args={[0.17, 0.11, 0.24, 24, 1, true]} /></mesh>
        <mesh position={[0, 0.42, 0.1]} material={mat(C.steel)}><cylinderGeometry args={[0.012, 0.012, 0.24, 8]} /></mesh>
      </group>
      {/* flour + sugar canisters */}
      {[[-10.15, 'flour'], [-9.85, 'sugar']].map(([x], i) => (
        <group key={String(x)} position={[x as number, top + 0.17, z - 0.32]}>
          <mesh material={mat(C.cream)} castShadow><cylinderGeometry args={[0.13, 0.13, 0.3 - i * 0.06, 24]} /></mesh>
          <mesh position={[0, 0.16 - i * 0.03, 0]} material={mat(C.woodDark)}><cylinderGeometry args={[0.135, 0.135, 0.03, 24]} /></mesh>
          <mesh position={[0, 0.0, 0.131]} material={mat('#e9d5c4')}><planeGeometry args={[0.14, 0.08]} /></mesh>
        </group>
      ))}
      {/* jar shelf above the backsplash */}
      <Shelf pos={[-7.1, 2.95, -9.62]} w={3.4} vines={false} />
    </group>
  )
}

// ── sponges are BAKED, not dragged: pick a batter tap, it fills the pan, the pan goes into
// the oven below, and the baked sponge lands on the turntable. One pan at a time.
const TAPS: ['vanilla' | 'chocolate' | 'strawberry', number][] = [['vanilla', -9.55], ['chocolate', -9.2], ['strawberry', -8.85]]
const BATTER_COL = { vanilla: '#f6dfa4', chocolate: '#6b3a22', strawberry: '#f4a3b6' }
function BatterStation() {
  const job = useRef<{ f: 'vanilla' | 'chocolate' | 'strawberry'; x: number; t0: number } | null>(null)
  const pan = useRef<THREE.Group>(null), batter = useRef<THREE.Mesh>(null), stream = useRef<THREE.Mesh>(null), glowR = useRef<THREE.Mesh>(null)
  const bm = useMemo(() => new THREE.MeshStandardMaterial({ color: BATTER_COL.vanilla, roughness: 0.3 }), [])
  const PX = -9.2, PY = BENCH + 0.05, PZ = FRONT + 0.05
  useFrame(() => {
    const j = job.current, g = pan.current; if (!g) return
    const t = j ? now() - j.t0 : 99
    const slide = clamp01(t / 0.35), fill = clamp01((t - 0.35) / 0.9), drop = clamp01((t - 1.35) / 0.45), bake = clamp01((t - 1.8) / 1.2)
    const x = j ? PX + (j.x - PX) * slide * (1 - drop) : PX
    g.position.set(x, PY - drop * 0.45, PZ + drop * 0.25); g.visible = !j || drop < 0.6
    if (batter.current) { batter.current.visible = !!j && fill > 0; batter.current.scale.set(1, Math.max(0.001, fill), 1); batter.current.position.y = 0.01 + fill * 0.025 }
    if (stream.current) { const on = !!j && t > 0.35 && t < 1.25; stream.current.visible = on; if (j) stream.current.position.set(j.x, PY + 0.3, PZ) }
    if (glowR.current) (glowR.current.material as THREE.MeshStandardMaterial).emissiveIntensity = j && bake > 0 && bake < 1 ? 0.6 + Math.sin(t * 10) * 0.25 : 0
    if (j && t > 3.0) { job.current = null; useCake.getState().addLayer(j.f) }
  })
  const start = (f: 'vanilla' | 'chocolate' | 'strawberry', x: number) => {
    const c = useCake.getState().cake
    if (job.current || c.frosting !== 'none' || c.layers.length >= 4 || c.layers.length > c.fillings.length) return
    bm.color.set(BATTER_COL[f]); job.current = { f, x, t0: now() }
  }
  return (
    <group>
      {TAPS.map(([f, x]) => (
        <Grab key={f} id={`batter-${f}`} tip={`${f} batter: click to pour and bake`} pos={[x, BENCH + 0.55, FRONT + 0.05]} size={[0.26, 0.5, 0.26]} onClick={() => start(f, x)}>
          <mesh material={glass()}><cylinderGeometry args={[0.1, 0.1, 0.32, 18]} /></mesh>
          <mesh position={[0, -0.03, 0]} material={mat(BATTER_COL[f], { rough: 0.3 })}><cylinderGeometry args={[0.092, 0.092, 0.22, 18]} /></mesh>
          <mesh position={[0, -0.2, 0]} material={mat(C.steel)}><coneGeometry args={[0.1, 0.1, 18]} /></mesh>
          <mesh position={[0, 0.18, 0]} material={mat(C.woodDark)}><cylinderGeometry args={[0.105, 0.105, 0.04, 18]} /></mesh>
        </Grab>
      ))}
      {/* the rail the taps hang from */}
      <mesh position={[-9.2, BENCH + 0.55 + 0.32, FRONT + 0.05]} rotation={[0, 0, Math.PI / 2]} material={mat(C.steel)}><cylinderGeometry args={[0.02, 0.02, 1.05, 10]} /></mesh>
      <group ref={pan}>
        <mesh material={mat(C.steel, { rough: 0.35 })} castShadow><cylinderGeometry args={[0.15, 0.14, 0.07, 28, 1, true]} /></mesh>
        <mesh position={[0, -0.03, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.14, 0.14, 0.01, 28]} /></mesh>
        <mesh ref={batter} material={bm} visible={false}><cylinderGeometry args={[0.14, 0.14, 0.05, 28]} /></mesh>
      </group>
      <mesh ref={stream} material={bm} visible={false}><cylinderGeometry args={[0.02, 0.016, 0.5, 10]} /></mesh>
      {/* oven glow while it bakes */}
      <mesh ref={glowR} position={[-9.05, 0.41, FRONT + 0.3]} material={new THREE.MeshStandardMaterial({ color: '#2a120a', emissive: '#ff9a3c', emissiveIntensity: 0 })}><planeGeometry args={[0.88, 0.44]} /></mesh>
    </group>
  )
}

// ── the ingredients, laid out on the bakery counter: drag each onto the turntable ──
const BENCH = 0.97 // counter-top height
const FRONT = -8.72, BACK = -9.45
function CakeIngredients() {
  const k = useCake.getState
  const T = { turntable: () => {} }
  const bowl = (id: string, x: number, z: number, color: string, tip: string, act: () => void, big = false) => (
    <Grab key={id} id={id} tip={tip} pos={[x, BENCH + 0.07, z]} size={[big ? 0.36 : 0.28, 0.2, big ? 0.36 : 0.28]} drops={{ turntable: act }}>
      <mesh material={mat(C.cream, { rough: 0.3 })} castShadow><cylinderGeometry args={[big ? 0.15 : 0.12, big ? 0.1 : 0.08, 0.12, 24, 1, true]} /></mesh>
      <mesh position={[0, -0.055, 0]} material={mat(C.cream)}><cylinderGeometry args={[big ? 0.1 : 0.08, big ? 0.1 : 0.08, 0.01, 20]} /></mesh>
      <mesh position={[0, 0.035, 0]} material={mat(color, { rough: 0.35 })}><cylinderGeometry args={[big ? 0.14 : 0.11, big ? 0.14 : 0.11, 0.02, 24]} /></mesh>
    </Grab>
  )
  const bag = (x: number, p: 'white' | 'pink' | 'chocolate') => (
    <Grab key={p} id={`bag-${p}`} tip={`${p} rosettes: drag onto the cake`} pos={[x, BENCH + 0.07, BACK]} size={[0.22, 0.34, 0.22]} drops={{ turntable: () => k().pipe(p) }}>
      <group rotation={[0, 0, 1.2]}>
        <mesh position={[0, 0.0, 0]} rotation={[Math.PI, 0, 0]} material={mat('#fffaf4', { rough: 0.55 })}><coneGeometry args={[0.07, 0.26, 14]} /></mesh>
        <mesh position={[0, 0.13, 0]} material={mat(PIPE_COL[p], { rough: 0.4 })}><sphereGeometry args={[0.066, 12, 8]} /></mesh>
      </group>
    </Grab>
  )
  const jar = (x: number, t: 'sprinkles' | 'cherries' | 'strawberries' | 'candles', fill: string) => (
    <Grab key={t} id={`top-${t}`} tip={`${t}: drag onto the cake`} pos={[x, BENCH + 0.12, BACK]} size={[0.22, 0.3, 0.22]} drops={{ turntable: () => k().topWith(t) }}>
      <mesh material={glass()}><cylinderGeometry args={[0.085, 0.085, 0.2, 18]} /></mesh>
      <mesh position={[0, -0.03, 0]} material={mat(fill, { rough: 0.35 })}><cylinderGeometry args={[0.078, 0.078, 0.13, 18]} /></mesh>
      <mesh position={[0, 0.115, 0]} material={mat(C.woodDark)}><cylinderGeometry args={[0.09, 0.09, 0.03, 18]} /></mesh>
    </Grab>
  )
  void T
  return (
    <group>
      <DropTarget id="turntable" pos={[CAKE_AT[0], TOP + 0.02, CAKE_AT[2]]} r={0.7} />
      {/* left: sponges, fillings, piping bags */}
      <BatterStation />
      {bowl('fill-cream', -8.45, FRONT, FILL_COL.cream, 'cream filling: drag onto the cake', () => k().addFilling('cream'))}
      {bowl('fill-jam', -8.12, FRONT, FILL_COL.jam, 'jam filling: drag onto the cake', () => k().addFilling('jam'))}
      {bag(-9.55, 'white')}{bag(-9.25, 'pink')}{bag(-8.95, 'chocolate')}
      {/* right: frosting bowls, topping jars, the cake box */}
      {bowl('frost-pink', -6.05, FRONT, FROST_COL.pink, 'pink frosting: drag onto the cake', () => k().frost('pink'), true)}
      {bowl('frost-white', -5.68, FRONT, FROST_COL.white, 'white frosting: drag onto the cake', () => k().frost('white'), true)}
      {bowl('frost-chocolate', -5.31, FRONT, FROST_COL.chocolate, 'chocolate frosting: drag onto the cake', () => k().frost('chocolate'), true)}
      {bowl('frost-lavender', -4.94, FRONT, FROST_COL.lavender, 'lavender frosting: drag onto the cake', () => k().frost('lavender'), true)}
      {jar(-6.3, 'sprinkles', C.counter)}{jar(-6.02, 'cherries', '#b3122e')}{jar(-5.74, 'strawberries', '#d8344a')}{jar(-5.46, 'candles', C.lilac)}
      <Grab id="cakebox" tip="cake box: drag onto the cake to box it" pos={[-4.62, BENCH + 0.12, FRONT]} size={[0.3, 0.26, 0.3]} drops={{ turntable: () => k().box() }}>
        <RBox size={[0.26, 0.2, 0.26]} color={C.counter} r={0.02} />
        <RBox size={[0.27, 0.03, 0.27]} pos={[0, 0.11, 0]} color={C.cream} r={0.01} shadow={false} />
      </Grab>
    </group>
  )
}

export function CakeBench() {
  const spin = useRef<THREE.Group>(null)
  // no spinning on the conveyor: the cake has to stay lined up with its tin (a heart pan and a heart cake point the same way)
  useFrame(() => { if (spin.current) spin.current.rotation.y = 0 })
  return (
    <group>
      <BakeryCorner />
      {/* the cake machine: the cake rides a conveyor to each dispenser */}
      <CakeMachine><group ref={spin}><TheCake /></group></CakeMachine>
    </group>
  )
}
