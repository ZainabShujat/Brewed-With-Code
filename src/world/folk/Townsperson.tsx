import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mat } from '../mats'
import { Face } from './face'
import { PAPER_COLOURS, MALLOW_COLOURS, type FolkSpec } from './specs'
import { PaperAccessory, MallowAccessory } from './accessories'

// One townsperson, built from their spec: a notebook of one of 10 kinds, or a marshmallow of one of 10 kinds,
// in one of 5 colourways, with their own face. Walks (paper waddles, marshmallows bounce), waits (looks around),
// or sits (hips on the seat). `seatHip` tells a chair how high this body's hips are.

export type Pose = 'walk' | 'wait' | 'sit'
const ink = mat('#2a1830', { rough: 0.6 }), cream = mat('#f6ecd6', { rough: 0.9 }), steel = mat('#b8b8c4', { rough: 0.25 })
const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r)
const texCache = new Map<string, THREE.Texture>()
function canvasTex(key: string, draw: (x: CanvasRenderingContext2D) => void) {
  if (texCache.has(key) || typeof document === 'undefined') return texCache.get(key) ?? null
  const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache.set(key, t); return t
}
const speckles = (bg: string, fg: string) => canvasTex(`sp${bg}`, (x) => { x.fillStyle = bg; x.fillRect(0, 0, 128, 128); x.fillStyle = fg
  for (let i = 0; i < 260; i++) { const a = (i * 2654435761) % 1e4 / 1e4, b = (i * 40503) % 1e4 / 1e4; x.globalAlpha = 0.35 + (i % 3) * 0.2; x.fillRect(a * 128, b * 128, 2 + (i % 3), 2) } })
const stripes = (a: string, b: string) => canvasTex(`st${a}`, (x) => { x.fillStyle = a; x.fillRect(0, 0, 128, 128); x.fillStyle = b
  for (let i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 16, 0); x.lineTo(i * 32 + 16 + 128, 128); x.lineTo(i * 32 + 128, 128); x.fill() } })

type Limbs = { legs: React.MutableRefObject<THREE.Group[]>; arms: React.MutableRefObject<THREE.Group[]> }
const setRef = (arr: React.MutableRefObject<THREE.Group[]>, i: number) => (g: THREE.Group | null) => { if (g) arr.current[i] = g }

// ── paper folk ──
const PAPER_DIMS: Record<string, [number, number, number]> = {
  classic: [0.62, 0.82, 0.16], slim: [0.5, 1.0, 0.1], journal: [0.64, 0.7, 0.3], spiral: [0.6, 0.8, 0.12], open: [0.84, 0.78, 0.1],
  riffled: [0.62, 0.78, 0.2], sticky: [0.56, 0.56, 0.46], composition: [0.6, 0.8, 0.14], pocket: [0.44, 0.6, 0.1], diary: [0.6, 0.78, 0.2],
}
const LEG = 0.36
function Paper({ s, limbs }: { s: Extract<FolkSpec, { kind: 'paper' }>; limbs: Limbs }) {
  const col = PAPER_COLOURS[s.colour], [w, h, d] = PAPER_DIMS[s.model], m = s.model
  const cover = useMemo(() => m === 'composition' ? new THREE.MeshStandardMaterial({ map: speckles(col.cover, col.spine), roughness: 0.8 }) : mat(col.cover, { rough: 0.7 }), [m, col])
  const body = useMemo(() => rbox(w, h, d, m === 'journal' || m === 'pocket' ? 0.07 : 0.04), [w, h, d, m])
  const pages = useMemo(() => rbox(w - 0.04, h - 0.04, d * 0.8, 0.02), [w, h, d])
  const cy = LEG + h / 2, labelW = Math.min(0.42, w * 0.72), labelH = Math.min(0.34, h * 0.42)
  return (
    <group>
      <group position={[0, cy, 0]}>
        {m === 'open' ? (
          // open like a book on a stand: two pages in a V, the face drawn across both
          <group>
            {[-1, 1].map((sd) => <group key={sd} rotation={[0, sd * -0.32, 0]}>
              <mesh position={[sd * w / 4, 0, 0]} material={mat(col.cover, { rough: 0.7 })}><boxGeometry args={[w / 2, h, 0.04]} /></mesh>
              <mesh position={[sd * w / 4, 0, 0.03]} material={cream}><boxGeometry args={[w / 2 - 0.04, h - 0.05, 0.03]} /></mesh>
              {[0, 1, 2, 3].map((k) => <mesh key={k} position={[sd * w / 4, -0.2 + k * 0.1, 0.047]} material={mat('#d9c9a6')}><planeGeometry args={[w / 2 - 0.1, 0.008]} /></mesh>)}
            </group>)}
            <Face f={s.face} z={0.07} y={0.05} s={1.15} />
          </group>
        ) : m === 'sticky' ? (
          // a sticky-note pad, the top note curling up like a quiff
          <group>
            <mesh geometry={body} material={mat('#fff7dc', { rough: 0.9 })} castShadow />
            {[0.1, -0.05, -0.2].map((y) => <mesh key={y} position={[0, y, d / 2 + 0.001]} material={mat(col.spine)}><planeGeometry args={[w - 0.02, 0.006]} /></mesh>)}
            <mesh position={[0, h / 2 + 0.005, 0]} material={mat(col.cover, { rough: 0.8 })}><boxGeometry args={[w, 0.02, d]} /></mesh>
            <mesh position={[0, h / 2 + 0.09, d * 0.1]} rotation={[0, 0, Math.PI / 2]} material={mat(col.cover, { rough: 0.8 })}><cylinderGeometry args={[0.1, 0.1, w * 0.98, 16, 1, true, 0, Math.PI * 1.1]} /></mesh>
            <Face f={s.face} z={d / 2 + 0.004} y={0.0} s={1.1} />
          </group>
        ) : (
          <group>
            <mesh geometry={body} material={cover} castShadow />
            <mesh geometry={pages} position={[0.025, 0, 0]} material={cream} />
            <mesh position={[-w / 2 + 0.02, 0, 0]} material={mat(col.spine)}><boxGeometry args={[0.05, h + 0.02, d + 0.01]} /></mesh>
            <mesh position={[0, 0.05, d / 2 + 0.002]} material={mat('#fffaf0', { rough: 0.9 })}><planeGeometry args={[labelW, labelH]} /></mesh>
            <Face f={s.face} z={d / 2 + 0.006} y={0.05} s={Math.min(1.1, labelW / 0.38)} />
            {m === 'journal' && <mesh position={[w * 0.3, 0, 0]} material={mat(col.feet)}><boxGeometry args={[0.035, h + 0.01, d + 0.02]} /></mesh>}
            {m === 'spiral' && Array.from({ length: 7 }, (_, k) => <mesh key={k} position={[-w / 2 + 0.08 + k * (w - 0.16) / 6, h / 2 + 0.01, 0]} rotation={[0, Math.PI / 2, 0]} material={steel}><torusGeometry args={[0.045, 0.01, 6, 14]} /></mesh>)}
            {m === 'riffled' && Array.from({ length: 9 }, (_, k) => <mesh key={k} position={[-w / 2 + 0.06 + k * (w - 0.12) / 8, h / 2 + 0.05 + (k % 2) * 0.03, -0.02 + (k % 3) * 0.02]} rotation={[0, 0, (k - 4) * 0.12]} material={k % 3 ? cream : mat(col.spine)}><coneGeometry args={[0.055, 0.16, 4]} /></mesh>)}
            {m === 'pocket' && <mesh position={[w / 2 + 0.02, 0.12, 0.03]} material={mat(col.feet)}><capsuleGeometry args={[0.018, 0.3, 4, 8]} /></mesh>}
            {m === 'diary' && <group>
              {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.07, h / 2 + 0.06, 0]} rotation={[0, 0, sd * 0.6]} material={mat('#e98fa6')}><sphereGeometry args={[0.06, 10, 8]} /></mesh>)}
            </group>}
            {s.ribbon && m !== 'diary' && <mesh position={[w * 0.25, -h / 2 - 0.08, 0]} rotation={[0, 0, 0.12]} material={mat(['#e98fa6', '#f2c66a', '#8ed1b8'][s.seed % 3])}><boxGeometry args={[0.035, 0.18, 0.01]} /></mesh>}
            {s.sticker && <mesh position={[w * 0.28, -h * 0.32, d / 2 + 0.004]} material={mat(['#f2c66a', '#ffffff', '#ff9db5'][s.seed % 3])}><circleGeometry args={[0.05, 5]} /></mesh>}
          </group>
        )}
        <PaperAccessory model={m} w={w} h={h} d={d} cover={col.cover} spine={col.spine} />
        {/* stick arms with soft mitten hands (like Kozie's) */}
        {[-1, 1].map((sd, i) => <group key={sd} position={[sd * (w / 2 + 0.01), 0.02, 0]} ref={setRef(limbs.arms, i)}>
          <mesh position={[sd * 0.08, -0.12, 0]} rotation={[0, 0, sd * 0.5]} material={ink}><cylinderGeometry args={[0.018, 0.018, 0.26, 6]} /></mesh>
          <mesh position={[sd * 0.155, -0.245, 0]} scale={[1, 1.1, 0.9]} material={mat('#fff6e6', { rough: 0.8 })}><sphereGeometry args={[0.048, 12, 10]} /></mesh>
        </group>)}
      </group>
      {[-1, 1].map((sd, i) => <group key={sd} position={[sd * Math.min(0.13, w * 0.24), LEG, 0]} ref={setRef(limbs.legs, i)}>
        <mesh position={[0, -LEG / 2, 0]} material={ink}><cylinderGeometry args={[0.02, 0.02, LEG, 6]} /></mesh>
        <mesh position={[0, -LEG + 0.02, 0.04]} scale={[1, 0.6, 1.4]} material={mat(col.feet, { rough: 0.6 })}><sphereGeometry args={[0.06, 10, 8]} /></mesh>
      </group>)}
    </group>
  )
}

// ── marshmallows ──
const MALLOW_DIMS: Record<string, [number, number, number]> = { // radius, height, edge roundness
  classic: [0.36, 0.78, 0.16], tall: [0.3, 1.0, 0.14], mini: [0.3, 0.55, 0.15], cube: [0.32, 0.64, 0.17], twist: [0.36, 0.78, 0.16],
  puck: [0.42, 0.5, 0.16], campfire: [0.36, 0.78, 0.16], sprinkled: [0.36, 0.72, 0.16], dipped: [0.36, 0.78, 0.16], swirl: [0.34, 0.68, 0.16],
}
function mallowGeo(R: number, H: number, r: number) {
  const p: THREE.Vector2[] = [new THREE.Vector2(0, 0)]
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; p.push(new THREE.Vector2(R - r + Math.sin(a) * r, r - Math.cos(a) * r)) }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; p.push(new THREE.Vector2(R - r + Math.cos(a) * r, H - r + Math.sin(a) * r)) }
  p.push(new THREE.Vector2(0, H)); return new THREE.LatheGeometry(p, 32)
}
const BASE = 0.12
function Mallow({ s, limbs }: { s: Extract<FolkSpec, { kind: 'mallow' }>; limbs: Limbs }) {
  const col = MALLOW_COLOURS[s.colour], m = s.model, [R, H, r] = MALLOW_DIMS[m]
  const geo = useMemo(() => m === 'cube' ? (() => { const g = rbox(R * 2, H, R * 2, r); g.translate(0, H / 2, 0); return g })() : mallowGeo(R, H, r), [m, R, H, r])
  const bodyM = useMemo(() => m === 'twist' ? new THREE.MeshStandardMaterial({ map: stripes(col.body, col.accent), roughness: 0.95 }) : mat(col.body, { rough: 0.95 }), [m, col])
  const toast = m === 'campfire' ? '#b77a45' : '#e8b880', faceY = H * 0.5, fz = (m === 'cube' ? R : R) + 0.002
  return (
    <group>
      <group position={[0, BASE, 0]}>
        <mesh geometry={geo} material={bodyM} castShadow />
        {m !== 'cube' && m !== 'swirl' && <group position={[0, H, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={mat(toast, { rough: 0.9 })}><circleGeometry args={[R - r * 0.6, 28]} /></mesh>
          <mesh position={[0, -r * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.45]} material={mat(m === 'campfire' ? '#8a5530' : '#e3b07a', { rough: 0.9 })}><torusGeometry args={[R - r * 0.55, r * 0.42, 8, 32]} /></mesh>
        </group>}
        {m === 'sprinkled' && Array.from({ length: 16 }, (_, k) => <mesh key={k} position={[Math.cos(k * 2.4) * (R - 0.12) * Math.sqrt((k + 1) / 16), H + 0.012, Math.sin(k * 2.4) * (R - 0.12) * Math.sqrt((k + 1) / 16)]} rotation={[Math.PI / 2, 0, k]} material={mat(['#ff7fb6', '#8ed1b8', '#f2c66a', '#b9a3ea'][k % 4])}><capsuleGeometry args={[0.012, 0.04, 2, 5]} /></mesh>)}
        {m === 'dipped' && <mesh position={[0, H * 0.16, 0]} material={mat('#6b3a24', { rough: 0.4 })}><cylinderGeometry args={[R + 0.008, R + 0.006, H * 0.32, 32]} /></mesh>}
        {m === 'swirl' && <group position={[0, H, 0]}>{[0, 1, 2].map((k) => <mesh key={k} position={[0, 0.04 + k * 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat('#ffffff', { rough: 0.6 })}><torusGeometry args={[0.2 - k * 0.06, 0.05, 8, 24]} /></mesh>)}<mesh position={[0, 0.25, 0]} material={mat('#ffffff', { rough: 0.6 })}><coneGeometry args={[0.05, 0.1, 10]} /></mesh></group>}
        {m === 'cube' && <mesh position={[0, H + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#e8b880', { rough: 0.9 })}><planeGeometry args={[R * 1.5, R * 1.5]} /></mesh>}
        <Face f={s.face} z={fz} y={faceY} s={m === 'mini' || m === 'puck' ? 1.0 : 1.15} />
        <MallowAccessory model={m} R={R} H={H} accent={col.accent} />
        {[-1, 1].map((sd, i) => <group key={sd} position={[sd * (R + 0.01), H * 0.45, 0]} ref={setRef(limbs.arms, i)}>
          <mesh position={[sd * 0.04, -0.05, 0]} material={mat(col.body, { rough: 0.95 })}><sphereGeometry args={[0.065, 12, 10]} /></mesh>
        </group>)}
      </group>
      {[-1, 1].map((sd, i) => <group key={sd} position={[sd * R * 0.42, BASE, 0]} ref={setRef(limbs.legs, i)}>
        <mesh position={[0, -0.06, 0.03]} scale={[1, 0.65, 1.3]} material={mat(col.accent, { rough: 0.95 })}><sphereGeometry args={[0.085, 12, 10]} /></mesh>
      </group>)}
    </group>
  )
}

/** hip height when seated (so chairs can place them) */
export const seatHip = (s: FolkSpec) => s.kind === 'paper' ? LEG : BASE

export function Townsperson({ spec, pose = 'wait', phase = 0, getPose }: { spec: FolkSpec; pose?: Pose; phase?: number; getPose?: () => Pose }) {
  const inner = useRef<THREE.Group>(null), limbs: Limbs = { legs: useRef<THREE.Group[]>([]), arms: useRef<THREE.Group[]>([]) }
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase, g = inner.current; if (!g) return
    const p = getPose ? getPose() : pose, walk = p === 'walk', sit = p === 'sit', sw = walk ? Math.sin(t * 7) : 0
    limbs.legs.current.forEach((l, k) => { if (l) l.rotation.x = sit ? -1.4 : sw * 0.6 * (k ? 1 : -1) })
    limbs.arms.current.forEach((a, k) => { if (a) a.rotation.x = sit ? -0.4 : walk ? -sw * 0.5 * (k ? 1 : -1) : Math.sin(t * 1.3 + k) * 0.06 })
    g.position.y = 0; g.rotation.z = 0; g.scale.set(1, 1, 1)
    if (spec.kind === 'mallow') { const b = walk ? Math.abs(Math.sin(t * 7)) : p === 'wait' ? (Math.sin(t * 2) + 1) * 0.15 : 0, q = 0.08 * spec.squish
      g.position.y = b * 0.08; g.scale.set(1 + q - b * q, 1 - q + b * q + (sit ? -0.05 : 0), 1 + q - b * q) }
    else { g.rotation.z = walk ? sw * 0.08 : Math.sin(t * 1.5) * 0.02; g.position.y = walk ? Math.abs(sw) * 0.03 : 0 }
    g.rotation.y = p === 'wait' ? Math.sin(t * 0.6) * 0.45 : 0
  })
  return <group ref={inner}>{spec.kind === 'paper' ? <Paper s={spec} limbs={limbs} /> : <Mallow s={spec} limbs={limbs} />}</group>
}
