import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mat } from './mats'
import { C } from '../data/palette'

// PROTOTYPES (18 Nov): who lives in this town? Four candidate customer designs, each shown walking, waiting and
// sitting, side by side on the café floor. Open the game with ?folk to see them. Nothing else uses this yet.
//   paper   - notebook folk from Kozie's world (a little hardback with a face, stick legs, a ribbon bookmark)
//   mallow  - marshmallow folk (squishy, toasted top, squash-and-stretch)
//   origami - origami butterfly folk (folded body, two big paper wings, hovers and flaps)
//   human   - the most polished human we can do (tapered body, jointed limbs, hair, face, shoes)

export type FolkKind = 'paper' | 'mallow' | 'origami' | 'human'
export type FolkState = 'walk' | 'wait' | 'sit'
const KINDS: FolkKind[] = ['paper', 'mallow', 'origami', 'human']
const STATES: FolkState[] = ['walk', 'wait', 'sit']
const LABEL: Record<FolkKind, string> = { paper: '📓 paper folk', mallow: '🍡 marshmallow', origami: '🦋 origami', human: '🧑 human (polished)' }

// ── shared bits ──
const ink = mat('#2a1830', { rough: 0.6 }), blush = mat('#ff9db5', { rough: 0.8 }), white = mat('#ffffff', { rough: 0.4 })
function Face({ z, s = 1, y = 0 }: { z: number; s?: number; y?: number }) {
  return (
    <group position={[0, y, z]} scale={s}>
      {[-0.085, 0.085].map((x) => <group key={x} position={[x, 0.04, 0]}>
        <mesh material={ink}><sphereGeometry args={[0.032, 12, 10]} /></mesh>
        <mesh position={[0.01, 0.012, 0.022]} material={white}><sphereGeometry args={[0.009, 8, 6]} /></mesh>
      </group>)}
      <mesh position={[0, -0.03, 0.005]} rotation={[0, 0, Math.PI]} material={ink}><torusGeometry args={[0.032, 0.008, 6, 14, Math.PI]} /></mesh>
      {[-0.14, 0.14].map((x) => <mesh key={x} position={[x, -0.01, -0.004]} scale={[1, 0.6, 0.3]} material={blush}><sphereGeometry args={[0.035, 10, 8]} /></mesh>)}
    </group>
  )
}
const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r)

// ── 1. paper folk: a small hardback notebook with a face ──
function PaperFolk({ cover, legs, arms }: { cover: string; legs: React.RefObject<THREE.Group[]>; arms: React.RefObject<THREE.Group[]> }) {
  const body = useMemo(() => rbox(0.62, 0.82, 0.16, 0.045), []), pages = useMemo(() => rbox(0.58, 0.78, 0.13, 0.02), [])
  return (
    <group>
      <group position={[0, 0.78, 0]}>
        <mesh geometry={body} material={mat(cover, { rough: 0.7 })} castShadow />
        <mesh geometry={pages} position={[0.025, 0, 0]} material={mat('#f6ecd6', { rough: 0.9 })} />
        <mesh position={[-0.3, 0, 0]} material={mat(new THREE.Color(cover).multiplyScalar(0.75).getStyle())}><boxGeometry args={[0.05, 0.84, 0.17]} /></mesh>
        {/* label on the cover, the face sits on it */}
        <mesh position={[0, 0.06, 0.082]} material={mat('#fffaf0', { rough: 0.9 })}><planeGeometry args={[0.42, 0.34]} /></mesh>
        <Face z={0.086} y={0.06} s={1.1} />
        {/* ribbon bookmark hanging out the bottom, and a paperclip "hair" on top */}
        <mesh position={[0.18, -0.48, 0.02]} rotation={[0, 0, 0.15]} material={mat('#e98fa6')}><boxGeometry args={[0.035, 0.18, 0.01]} /></mesh>
        <mesh position={[-0.1, 0.45, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.steel, { rough: 0.25 })}><torusGeometry args={[0.06, 0.012, 6, 16]} /></mesh>
        {[-1, 1].map((sd, i) => <group key={sd} position={[sd * 0.32, 0.02, 0]} ref={(g) => { if (g && arms.current) arms.current[i] = g }}>
          <mesh position={[sd * 0.09, -0.12, 0]} rotation={[0, 0, sd * 0.5]} material={ink}><cylinderGeometry args={[0.018, 0.018, 0.26, 6]} /></mesh>
          <mesh position={[sd * 0.16, -0.24, 0]} material={ink}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
        </group>)}
      </group>
      {[-1, 1].map((sd, i) => <group key={sd} position={[sd * 0.13, 0.37, 0]} ref={(g) => { if (g && legs.current) legs.current[i] = g }}>
        <mesh position={[0, -0.17, 0]} material={ink}><cylinderGeometry args={[0.02, 0.02, 0.34, 6]} /></mesh>
        <mesh position={[0, -0.35, 0.04]} scale={[1, 0.6, 1.4]} material={mat('#e98fa6', { rough: 0.6 })}><sphereGeometry args={[0.06, 10, 8]} /></mesh>
      </group>)}
    </group>
  )
}

// ── 2. marshmallow folk: soft, squishy, toasted top ──
function MallowFolk({ tint, legs, arms }: { tint: string; legs: React.RefObject<THREE.Group[]>; arms: React.RefObject<THREE.Group[]> }) {
  const body = useMemo(() => { const p: THREE.Vector2[] = []; const R = 0.36, H = 0.78, r = 0.16
    p.push(new THREE.Vector2(0, 0)); for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; p.push(new THREE.Vector2(R - r + Math.sin(a) * r, r - Math.cos(a) * r)) }
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; p.push(new THREE.Vector2(R - r + Math.cos(a) * r, H - r + Math.sin(a) * r)) } p.push(new THREE.Vector2(0, H))
    return new THREE.LatheGeometry(p, 32) }, [])
  const toast = useMemo(() => new THREE.TorusGeometry(0.27, 0.07, 10, 32), [])
  return (
    <group>
      <group position={[0, 0.16, 0]}>
        <mesh geometry={body} material={mat(tint, { rough: 0.95 })} castShadow />
        <mesh geometry={toast} position={[0, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.5]} material={mat('#e3b07a', { rough: 0.9 })} />
        <mesh position={[0, 0.79, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#efc58f', { rough: 0.9 })}><circleGeometry args={[0.27, 28]} /></mesh>
        <Face z={0.36} y={0.42} s={1.15} />
        {[-1, 1].map((sd, i) => <group key={sd} position={[sd * 0.37, 0.38, 0]} ref={(g) => { if (g && arms.current) arms.current[i] = g }}>
          <mesh position={[sd * 0.05, -0.06, 0]} material={mat(tint, { rough: 0.95 })}><sphereGeometry args={[0.07, 12, 10]} /></mesh>
        </group>)}
      </group>
      {[-1, 1].map((sd, i) => <group key={sd} position={[sd * 0.15, 0.16, 0]} ref={(g) => { if (g && legs.current) legs.current[i] = g }}>
        <mesh position={[0, -0.09, 0.03]} scale={[1, 0.65, 1.3]} material={mat(tint, { rough: 0.95 })}><sphereGeometry args={[0.09, 12, 10]} /></mesh>
      </group>)}
    </group>
  )
}

// ── 3. origami butterfly folk: folded body, two big paper wings ──
function OrigamiFolk({ paper, wings, legs }: { paper: string; wings: React.RefObject<THREE.Group[]>; legs: React.RefObject<THREE.Group[]> }) {
  const body = useMemo(() => { const g = new THREE.OctahedronGeometry(0.22, 0); g.scale(1, 1.7, 0.8); return g }, [])
  const wing = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.55, 0.42); s.lineTo(0.62, 0.05); s.lineTo(0.42, -0.32); s.closePath(); return new THREE.ShapeGeometry(s) }, [])
  const [wingM, foldM] = useMemo(() => [paper, new THREE.Color(paper).multiplyScalar(0.82).getStyle()].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, side: THREE.DoubleSide })), [paper])
  return (
    <group position={[0, 0.25, 0]}>
      <mesh geometry={body} position={[0, 0.62, 0]} material={mat(paper, { rough: 0.85 })} castShadow />
      <mesh position={[0, 1.05, 0]} material={mat(paper, { rough: 0.85 })}><icosahedronGeometry args={[0.17, 0]} /></mesh>
      <Face z={0.15} y={1.05} s={0.75} />
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.07, 1.25, 0]} rotation={[0, 0, -sd * 0.35]} material={ink}><cylinderGeometry args={[0.008, 0.008, 0.2, 5]} /></mesh>)}
      {[-1, 1].map((sd, i) => (
        <group key={sd} position={[sd * 0.08, 0.7, -0.05]} ref={(g) => { if (g && wings.current) wings.current[i] = g }}>
          <mesh geometry={wing} scale={[sd, 1, 1]} material={wingM} />
          <mesh geometry={wing} scale={[sd * 0.6, 0.6, 1]} position={[0, 0.01, 0.005]} material={foldM} />
        </group>))}
      {[-1, 1].map((sd, i) => <group key={sd} position={[sd * 0.07, 0.3, 0]} ref={(g) => { if (g && legs.current) legs.current[i] = g }}>
        <mesh position={[0, -0.14, 0]} material={ink}><cylinderGeometry args={[0.012, 0.012, 0.28, 5]} /></mesh>
      </group>)}
    </group>
  )
}

// ── 4. polished human: tapered torso, jointed arms and legs, hair, shoes ──
function HumanFolk({ skin, shirt, hair, legs, arms }: { skin: string; shirt: string; hair: string; legs: React.RefObject<THREE.Group[]>; arms: React.RefObject<THREE.Group[]> }) {
  const torso = useMemo(() => new THREE.LatheGeometry([0.0, 0.17, 0.2, 0.21, 0.2, 0.15, 0.07, 0.0].map((r, i) => new THREE.Vector2(r, i * 0.085)), 24), [])
  const skinM = mat(skin, { rough: 0.7 }), shirtM = mat(shirt, { rough: 0.8 }), trousers = mat('#4a4466', { rough: 0.85 }), shoe = mat('#3a2a30', { rough: 0.5 })
  return (
    <group>
      <mesh geometry={torso} position={[0, 0.82, 0]} scale={[1, 1, 0.72]} material={shirtM} castShadow />
      {/* apron-ish collar + neck + head */}
      <mesh position={[0, 1.42, 0]} material={skinM}><cylinderGeometry args={[0.05, 0.06, 0.08, 10]} /></mesh>
      <group position={[0, 1.6, 0]}>
        <mesh scale={[1, 1.08, 0.98]} material={skinM} castShadow><sphereGeometry args={[0.16, 24, 18]} /></mesh>
        <mesh position={[0, 0.045, -0.015]} scale={[1.07, 1.02, 1.05]} material={mat(hair, { rough: 0.6 })}><sphereGeometry args={[0.16, 24, 18, 0, Math.PI * 2, 0, Math.PI / 1.9]} /></mesh>
        <mesh position={[0, -0.02, -0.11]} scale={[1, 1.1, 0.6]} material={mat(hair, { rough: 0.6 })}><sphereGeometry args={[0.14, 16, 12]} /></mesh>
        {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.16, -0.01, 0]} scale={[0.5, 0.8, 0.6]} material={skinM}><sphereGeometry args={[0.04, 10, 8]} /></mesh>)}
        <Face z={0.145} y={-0.01} s={0.55} />
        <mesh position={[0, -0.005, 0.158]} material={mat(new THREE.Color(skin).multiplyScalar(0.92).getStyle())}><sphereGeometry args={[0.018, 8, 6]} /></mesh>
      </group>
      {[-1, 1].map((sd, i) => (
        <group key={sd} position={[sd * 0.24, 1.36, 0]} ref={(g) => { if (g && arms.current) arms.current[i] = g }}>
          <mesh position={[0, -0.15, 0]} material={shirtM}><capsuleGeometry args={[0.055, 0.22, 4, 10]} /></mesh>
          <group position={[0, -0.32, 0]}>
            <mesh position={[0, -0.12, 0.02]} material={skinM}><capsuleGeometry args={[0.045, 0.2, 4, 10]} /></mesh>
            <mesh position={[0, -0.27, 0.03]} material={skinM}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
          </group>
        </group>))}
      {[-1, 1].map((sd, i) => (
        <group key={sd} position={[sd * 0.1, 0.84, 0]} ref={(g) => { if (g && legs.current) legs.current[i] = g }}>
          <mesh position={[0, -0.2, 0]} material={trousers}><capsuleGeometry args={[0.075, 0.28, 4, 10]} /></mesh>
          <group position={[0, -0.42, 0]} name="knee">
            <mesh position={[0, -0.16, 0]} material={trousers}><capsuleGeometry args={[0.065, 0.26, 4, 10]} /></mesh>
            <mesh position={[0, -0.37, 0.05]} scale={[1, 0.6, 1.6]} material={shoe}><sphereGeometry args={[0.075, 12, 10]} /></mesh>
          </group>
        </group>))}
    </group>
  )
}

// one figure, animated for its state
function Figure({ kind, state, i }: { kind: FolkKind; state: FolkState; i: number }) {
  const root = useRef<THREE.Group>(null), inner = useRef<THREE.Group>(null)
  const legs = useRef<THREE.Group[]>([]), arms = useRef<THREE.Group[]>([]), wings = useRef<THREE.Group[]>([])
  const sit = state === 'sit'
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + i * 0.7, g = inner.current; if (!g) return
    const walk = state === 'walk', sw = walk ? Math.sin(t * 7) : 0
    // legs swing when walking, fold forward when sitting
    legs.current.forEach((l, k) => { if (!l) return; l.rotation.x = sit ? -1.45 : sw * 0.6 * (k ? 1 : -1)
      const knee = l.getObjectByName('knee'); if (knee) knee.rotation.x = sit ? 1.45 : Math.max(0, -sw * (k ? 1 : -1)) * 0.7 })
    arms.current.forEach((a, k) => { if (!a) return; a.rotation.x = sit ? -0.5 : walk ? -sw * 0.5 * (k ? 1 : -1) : Math.sin(t * 1.3 + k) * 0.06 })
    wings.current.forEach((w, k) => { if (!w) return; w.rotation.y = (k ? -1 : 1) * (0.25 + Math.abs(Math.sin(t * (walk ? 9 : 3))) * (walk ? 0.9 : 0.35)) })
    // body motion per kind: marshmallows squash and bounce, origami hovers, paper waddles, humans bob a little
    g.position.y = 0; g.rotation.z = 0; g.scale.set(1, 1, 1)
    if (kind === 'mallow') { const b = walk ? Math.abs(Math.sin(t * 7)) : state === 'wait' ? (Math.sin(t * 2) + 1) / 2 * 0.3 : 0
      g.position.y = b * 0.08; g.scale.set(1 + (0.08 - b * 0.08), 1 - (0.08 - b * 0.08) + (sit ? -0.06 : 0), 1 + (0.08 - b * 0.08)) }
    if (kind === 'origami') g.position.y = sit ? -0.05 : 0.12 + Math.sin(t * 2.2) * 0.05
    if (kind === 'paper') { g.rotation.z = walk ? sw * 0.08 : Math.sin(t * 1.5) * 0.02; g.position.y = walk ? Math.abs(sw) * 0.03 : 0 }
    if (kind === 'human') g.position.y = walk ? Math.abs(sw) * 0.025 : Math.sin(t * 1.6) * 0.006
    // waiting: look around now and then
    if (root.current) root.current.rotation.y = state === 'wait' ? Math.sin(t * 0.6) * 0.5 : 0
  })
  const pal = [C.counter, C.mint, C.lilac, C.butter, '#8ab6d6'][i % 5]
  const seatY = kind === 'human' ? 0.535 - 0.84 + 0.08 : kind === 'paper' ? 0.535 - 0.37 : kind === 'origami' ? 0.0 : 0.535 - 0.16 // hips on the seat
  return (
    <group ref={root}>
      {sit && <group>{/* a stool */}
        <mesh position={[0, 0.5, 0]} material={mat(C.wood, { rough: 0.6 })}><cylinderGeometry args={[0.3, 0.3, 0.07, 24]} /></mesh>
        {[0, 1, 2, 3].map((k) => <mesh key={k} position={[Math.cos(k * Math.PI / 2 + 0.78) * 0.2, 0.24, Math.sin(k * Math.PI / 2 + 0.78) * 0.2]} material={mat(C.plum)}><cylinderGeometry args={[0.025, 0.025, 0.5, 6]} /></mesh>)}
      </group>}
      <group position={[0, sit ? seatY : 0, 0]}>
        <group ref={inner}>
          {kind === 'paper' && <PaperFolk cover={pal} legs={legs} arms={arms} />}
          {kind === 'mallow' && <MallowFolk tint={['#fff5f8', '#ffe4ef', '#fff8e6', '#eef9f4', '#f4ecff'][i % 5]} legs={legs} arms={arms} />}
          {kind === 'origami' && <OrigamiFolk paper={['#ff9db5', '#8ee0c4', '#f2c66a', '#b9a3ea', '#8ab6d6'][i % 5]} wings={wings} legs={legs} />}
          {kind === 'human' && <HumanFolk skin={['#f2c9a8', '#c98e66', '#8a5a3c'][i % 3]} shirt={pal} hair={['#3b2416', '#1d1418', '#a35d2a'][i % 3]} legs={legs} arms={arms} />}
        </group>
      </group>
    </group>
  )
}

// the line-up: four kinds (columns) × walking / waiting / sitting (rows), on the café floor
export function FolkLineup() {
  return (
    <group position={[2.2, 0.12, 3.2]}>
      {KINDS.map((k, ci) => STATES.map((s, ri) => (
        <group key={k + s} position={[(ci - 1.5) * 1.7, 0, ri * 1.6]}>
          <Figure kind={k} state={s} i={ci * 3 + ri} />
          {ri === 0 && <Html position={[0, 2.15, 0]} center distanceFactor={9}><div style={{ font: '800 13px Trebuchet MS', background: '#5e2a75', color: '#fff6ee', padding: '3px 9px', borderRadius: 9, whiteSpace: 'nowrap' }}>{LABEL[k]}</div></Html>}
        </group>
      )))}
    </group>
  )
}
export const SHOW_FOLK = typeof location !== 'undefined' && location.search.includes('folk')

// ── the town gallery: all 50 paper folk and all 50 marshmallows (10 models × 5 colourways), out on the road ──
import { Townsperson } from './folk/Townsperson'
import { folk, PAPER_MODELS, MALLOW_MODELS } from './folk/specs'
export function FolkGallery() {
  return (
    <group position={[0, 0.16, 0]}>
      {(['paper', 'mallow'] as const).map((kind, b) => Array.from({ length: 50 }, (_, n) => {
        const col = n % 10, row = Math.floor(n / 10), x = (b ? 1.6 : -11.4) + col * 1.05, z = 22.4 + row * 1.25
        return <group key={kind + n} position={[x, 0, z]}><Townsperson spec={folk(kind, n)} pose={n % 7 === 3 ? 'walk' : 'wait'} phase={n * 0.37} /></group>
      }))}
      {PAPER_MODELS.map((m, i) => <Html key={'p' + m} position={[-11.4 + i * 1.05, 1.7, 21.8]} center distanceFactor={14}><div style={{ font: '800 11px Trebuchet MS', background: '#5e2a75', color: '#fff6ee', padding: '2px 6px', borderRadius: 7 }}>{m}</div></Html>)}
      {MALLOW_MODELS.map((m, i) => <Html key={'m' + m} position={[1.6 + i * 1.05, 1.7, 21.8]} center distanceFactor={14}><div style={{ font: '800 11px Trebuchet MS', background: '#a63f78', color: '#fff6ee', padding: '2px 6px', borderRadius: 7 }}>{m}</div></Html>)}
    </group>
  )
}
