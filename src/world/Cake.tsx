import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCake, SPONGE_COL, FILL_COL, FROST_COL, PIPE_COL } from '../systems/cake'
import { C } from '../data/palette'
import { mat, glow } from './mats'
import { RBox } from './Soft'
import { Shelf } from './Props'
import { tileTex } from './textures'

// The cake bench lives in the kitchen (back-left corner). Everything on the turntable is drawn
// from useCake state; each new part animates in using the time it was added (t[...]).
// the turntable sits on the bakery counter run along the back wall
export const CAKE_AT: [number, number, number] = [-7.0, 0, -9.05]
const R = 0.55, LH = 0.2, FH = 0.045, TOP = 1.02 // cake radius, layer height, filling height, turntable top

const now = () => performance.now() / 1000
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const bounce = (x: number) => { x = clamp01(x); return 1 - Math.pow(1 - x, 3) * Math.cos(x * 6) } // drop with a little settle

// one sponge or filling disc that drops onto the stack
function Drop({ y, h, r, color, t0 }: { y: number; h: number; r: number; color: string; t0: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => { const m = ref.current; if (!m) return; const k = bounce((now() - t0) / 0.5); m.position.y = y + h / 2 + (1 - k) * 0.9; m.visible = now() >= t0 })
  return <mesh ref={ref} material={mat(color, { rough: 0.85 })} castShadow><cylinderGeometry args={[r, r, h, 40]} /></mesh>
}

// frosting: a shell that flows down from the top, a smooth top cap, and drips that run down the sides
function Frosting({ height, color, t0 }: { height: number; color: string; t0: number }) {
  const shell = useRef<THREE.Mesh>(null), cap = useRef<THREE.Mesh>(null), drips = useRef<THREE.Group>(null)
  const D = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2 + (i % 3) * 0.07, len: 0.08 + ((i * 7) % 5) * 0.045 })), [])
  const m = mat(color, { rough: 0.35 }) // glossy frosting
  useFrame(() => {
    const k = clamp01((now() - t0) / 1.1), e = 1 - Math.pow(1 - k, 2)
    if (cap.current) { cap.current.visible = now() >= t0; cap.current.scale.set(0.3 + 0.7 * clamp01(k * 2.5), 1, 0.3 + 0.7 * clamp01(k * 2.5)) }
    if (shell.current) { const h = Math.max(0.001, height * e); shell.current.scale.y = h; shell.current.position.y = height - h / 2 + 0.01; shell.current.visible = now() >= t0 }
    drips.current?.children.forEach((c, i) => { const d = D[i], kk = clamp01((now() - t0 - 0.8 - (i % 4) * 0.08) / 0.7); c.visible = kk > 0; c.scale.y = Math.max(0.001, kk) })
  })
  return (
    <group>
      <mesh ref={shell} material={m}><cylinderGeometry args={[R + 0.025, R + 0.025, 1, 48, 1, true]} /></mesh>
      <mesh ref={cap} position={[0, height + 0.02, 0]} material={m}><cylinderGeometry args={[R + 0.03, R + 0.03, 0.04, 48]} /></mesh>
      <group ref={drips} position={[0, height, 0]}>
        {D.map((d, i) => (
          <group key={i} position={[Math.cos(d.a) * (R + 0.012), 0, Math.sin(d.a) * (R + 0.012)]}>
            <mesh position={[0, -d.len / 2, 0]} scale={[1, 1, 0.55]} material={m}><capsuleGeometry args={[0.028, d.len, 4, 8]} /></mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// piped rosettes: a swirl of three shrinking rings + a tip, appearing one by one around the rim
function Rosettes({ y, color, t0 }: { y: number; color: string; t0: number }) {
  const g = useRef<THREE.Group>(null)
  const N = 14
  useFrame(() => g.current?.children.forEach((c, i) => { const k = clamp01((now() - t0 - i * 0.11) / 0.25); c.visible = k > 0; c.scale.setScalar(Math.max(0.001, k < 1 ? k * 1.15 : 1)) }))
  const m = mat(color, { rough: 0.4 })
  return (
    <group ref={g} position={[0, y, 0]}>
      {Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2; return (
        <group key={i} position={[Math.cos(a) * (R - 0.07), 0, Math.sin(a) * (R - 0.07)]}>
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={m}><torusGeometry args={[0.055, 0.026, 8, 16]} /></mesh>
          <mesh position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]} material={m}><torusGeometry args={[0.035, 0.022, 8, 14]} /></mesh>
          <mesh position={[0, 0.095, 0]} material={m}><coneGeometry args={[0.03, 0.06, 10]} /></mesh>
        </group>) })}
    </group>
  )
}

// toppings: sprinkles rain down; cherries / strawberries / candles pop on
function Toppings({ y, kind, t0 }: { y: number; kind: string; t0: number }) {
  const g = useRef<THREE.Group>(null)
  // scatter: a hash-based random spread over the top (sqrt keeps it even, not bunched in the middle)
  const hash = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v) }
  const S = useMemo(() => Array.from({ length: 90 }, (_, i) => { const r = Math.sqrt(hash(i + 1)) * (R - 0.13), a = hash(i + 101) * Math.PI * 2; return { x: Math.cos(a) * r, z: Math.sin(a) * r, d: hash(i + 201) * 0.5, rot: hash(i + 301) * 6.28 } }), [])
  const cols = [C.counter, C.mint, C.butter, C.lilac, '#ffffff']
  useFrame(() => g.current?.children.forEach((c, i) => {
    if (kind === 'sprinkles') { const s = S[i]; const k = clamp01((now() - t0 - s.d) / 0.6); c.visible = now() - t0 > s.d; c.position.set(s.x, y + 0.01 + (1 - k * k) * 1.4, s.z) }
    else { const k = clamp01((now() - t0 - i * 0.12) / 0.3); c.visible = k > 0; c.scale.setScalar(Math.max(0.001, k)) }
  }))
  if (kind === 'sprinkles') return <group ref={g}>{S.map((s, i) => <mesh key={i} rotation={[Math.PI / 2, 0, s.rot]} material={mat(cols[i % cols.length], { rough: 0.3 })}><capsuleGeometry args={[0.009, 0.035, 2, 4]} /></mesh>)}</group>
  const n = kind === 'candles' ? 5 : 7
  return (
    <group ref={g}>
      {Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, r = kind === 'candles' ? 0.25 : R - 0.07; const p: [number, number, number] = [Math.cos(a) * r, y + 0.12, Math.sin(a) * r]
        if (kind === 'cherries') return <group key={i} position={p}><mesh material={mat('#b3122e', { rough: 0.2 })}><sphereGeometry args={[0.05, 14, 10]} /></mesh><mesh position={[0.01, 0.07, 0]} rotation={[0, 0, -0.3]} material={mat('#4b6b2a')}><cylinderGeometry args={[0.005, 0.005, 0.09, 4]} /></mesh></group>
        if (kind === 'strawberries') return <group key={i} position={p}><mesh rotation={[Math.PI, 0, 0]} material={mat('#d8344a', { rough: 0.35 })}><coneGeometry args={[0.055, 0.1, 12]} /></mesh><mesh position={[0, 0.05, 0]} material={mat('#5a8a3a')}><coneGeometry args={[0.045, 0.02, 6]} /></mesh></group>
        return <group key={i} position={[p[0], y, p[2]]}><mesh position={[0, 0.12, 0]} material={mat(i % 2 ? C.counter : C.lilac)}><cylinderGeometry args={[0.014, 0.014, 0.24, 8]} /></mesh><mesh position={[0, 0.27, 0]} material={glow('#ffb347')}><sphereGeometry args={[0.025, 8, 6]} /></mesh></group>
      })}
    </group>
  )
}

function TheCake() {
  const { cake, t } = useCake()
  // stack bottom-up: layer, filling, layer, filling, layer…
  const parts: { y: number; h: number; r: number; color: string; t0: number }[] = []
  let y = 0
  cake.layers.forEach((s, i) => {
    parts.push({ y, h: LH, r: R, color: SPONGE_COL[s], t0: t[`L${i}`] ?? 0 }); y += LH
    if (cake.fillings[i]) { parts.push({ y, h: FH, r: R - 0.02, color: FILL_COL[cake.fillings[i]], t0: t[`F${i}`] ?? 0 }); y += FH }
  })
  const topY = y + (cake.frosting !== 'none' ? 0.04 : 0)
  return (
    <group>
      {parts.map((p, i) => <Drop key={i} {...p} />)}
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
      <group position={[-5.1, top + 0.03, z - 0.15]}>
        <RBox size={[0.42, 0.08, 0.6]} pos={[0, 0.04, 0]} color={C.counter} r={0.04} />
        <RBox size={[0.18, 0.55, 0.18]} pos={[0, 0.34, -0.2]} color={C.counter} r={0.07} />
        <mesh position={[0, 0.66, -0.02]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.counter, { rough: 0.3 })}><capsuleGeometry args={[0.13, 0.36, 6, 16]} /></mesh>
        <mesh position={[0, 0.2, 0.08]} material={mat(C.steel)}><cylinderGeometry args={[0.17, 0.11, 0.24, 24, 1, true]} /></mesh>
        <mesh position={[0, 0.42, 0.1]} material={mat(C.steel)}><cylinderGeometry args={[0.012, 0.012, 0.24, 8]} /></mesh>
      </group>
      {/* flour + sugar canisters */}
      {[[-8.35, 'flour'], [-7.95, 'sugar']].map(([x], i) => (
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

export function CakeBench() {
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (spin.current && useCake.getState().spin) spin.current.rotation.y += dt * 0.35 })
  return (
    <group>
      <BakeryCorner />
      <group position={CAKE_AT}>
        {/* bowls of frosting + a piping bag beside the turntable */}
        {[[-0.95, C.counter], [0.95, C.lilac]].map(([x, c]) => (
          <group key={String(x)} position={[x as number, 1.02, 0.25]}>
            <mesh material={mat(C.cream)}><cylinderGeometry args={[0.15, 0.1, 0.12, 20, 1, true]} /></mesh>
            <mesh position={[0, 0.03, 0]} material={mat(c as string, { rough: 0.35 })}><cylinderGeometry args={[0.135, 0.135, 0.02, 20]} /></mesh>
          </group>
        ))}
        <mesh position={[1.25, 1.05, -0.15]} rotation={[0, 0.4, 1.2]} material={mat(C.white, { rough: 0.5 })}><coneGeometry args={[0.07, 0.35, 14]} /></mesh>
        {/* turntable: steel pedestal + white plate, spins slowly */}
        <mesh position={[0, 0.98, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.12, 0.2, 0.06, 20]} /></mesh>
        <group ref={spin} position={[0, TOP, 0]}>
          <mesh material={mat(C.white, { rough: 0.25 })} receiveShadow><cylinderGeometry args={[0.72, 0.72, 0.03, 48]} /></mesh>
          <group position={[0, 0.015, 0]}><TheCake /></group>
        </group>
      </group>
    </group>
  )
}
