import { useMemo, useRef } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/palette'
import { mat, glow } from './mats'
import { RBox } from './Soft'
import { lampPool, nightGlow } from './Lighting'
import { anim } from '../systems/anim'
import { useGame } from '../systems/store'
import { STREET as S } from './streetLayout'
import { useLampSpot } from './LampLights'

// The street outside the café, at HUMAN scale (1 unit ≈ 1 m, same as the café floor), unlike the 2.95×
// exterior dressing. A T-shaped street: pavement → road with a zebra crossing → far pavement → a side street,
// all closed in by brick walls with iron gates ("town · coming soon"). Walkable in Explore mode.

// ── procedural textures (no downloads): paving slabs and brick ──
function canvasTex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void, repeat: [number, number]) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
const slabs = (rx: number, ry: number) => canvasTex(128, 128, (x) => {
  x.fillStyle = '#c9bdb4'; x.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#c4b8ae' : '#cdc2b9'; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60) }
  x.strokeStyle = '#a99c92'; x.lineWidth = 3; x.strokeRect(0, 0, 128, 128); x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 128); x.moveTo(0, 64); x.lineTo(128, 64); x.stroke()
}, [rx, ry])
const brick = (rx: number, ry: number) => canvasTex(128, 64, (x) => {
  x.fillStyle = '#d8c3b4'; x.fillRect(0, 0, 128, 64) // mortar
  const cols = ['#b5655a', '#a95a50', '#bd6f62', '#a3564d']
  for (let r = 0; r < 4; r++) for (let b = -1; b < 4; b++) {
    const off = r % 2 ? 16 : 0; x.fillStyle = cols[(r * 3 + b + 4) % 4]; x.fillRect(b * 32 + off + 1.5, r * 16 + 1.5, 29, 13)
  }
}, [rx, ry])

const roadMat = mat(C.road)
const kerbMat = mat('#a99c94')
const lineMat = mat(C.cream)
const ironMat = mat(C.plum, { rough: 0.35 })
const copingMat = mat(C.cream)

function Ground({ x0, x1, z0, z1, m, y = 0.02 }: { x0: number; x1: number; z0: number; z1: number; m: THREE.Material; y?: number }) {
  return <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
}
// a raised pavement strip with a kerb on the road side
function Pavement({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: slabs((x1 - x0) / 2, (z1 - z0) / 2), roughness: 0.9 }), [x0, x1, z0, z1])
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0.08, (z0 + z1) / 2]} material={m} receiveShadow><boxGeometry args={[x1 - x0, 0.16, z1 - z0]} /></mesh>
    </group>
  )
}
function Kerb({ x0, x1, z }: { x0: number; x1: number; z: number }) {
  return <mesh position={[(x0 + x1) / 2, 0.09, z]} material={kerbMat}><boxGeometry args={[x1 - x0, 0.18, 0.28]} /></mesh>
}

// brick wall from a to b (along x or z), with pillars every ~8 m and a cream coping
function Wall({ a, b, h = 2.6 }: { a: [number, number]; b: [number, number]; h?: number }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: brick(len / 1.6, h / 0.8), roughness: 0.95 }), [len, h])
  const n = Math.max(1, Math.round(len / 8))
  return (
    <group position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation={[0, -ang, 0]}>
      <mesh position={[0, h / 2, 0]} material={m} castShadow receiveShadow><boxGeometry args={[len, h, 0.5]} /></mesh>
      <mesh position={[0, h + 0.06, 0]} material={copingMat}><boxGeometry args={[len + 0.1, 0.12, 0.62]} /></mesh>
      {Array.from({ length: n + 1 }, (_, i) => -len / 2 + (i * len) / n).map((x) => (
        <mesh key={x} position={[x, (h + 0.3) / 2, 0]} material={m}><boxGeometry args={[0.8, h + 0.3, 0.8]} /></mesh>
      ))}
    </group>
  )
}

// closed iron gates across a road end, between two tall brick pillars, with a sign
function Gate({ at, width, rotY = 0 }: { at: [number, number]; width: number; rotY?: number }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: brick(1, 3), roughness: 0.95 }), [])
  const bars = Math.round(width / 0.32)
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, rotY, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * (width + 1.1)) / 2, 0, 0]}>
          <mesh position={[0, 1.7, 0]} material={m} castShadow><boxGeometry args={[1.1, 3.4, 1.1]} /></mesh>
          <mesh position={[0, 3.5, 0]} material={copingMat}><boxGeometry args={[1.3, 0.2, 1.3]} /></mesh>
          <mesh position={[0, 3.8, 0]} material={mat(C.butter)}><sphereGeometry args={[0.28, 16, 10]} /></mesh>
        </group>
      ))}
      {Array.from({ length: bars }, (_, i) => -width / 2 + (i + 0.5) * (width / bars)).map((x, i) => (
        <mesh key={x} position={[x, 1.45 + (i % 2) * 0.12, 0]} material={ironMat}><cylinderGeometry args={[0.035, 0.035, 2.7 + (i % 2) * 0.24, 6]} /></mesh>
      ))}
      {[0.5, 2.5].map((y) => <mesh key={y} position={[0, y, 0]} material={ironMat}><boxGeometry args={[width, 0.08, 0.08]} /></mesh>)}
      {/* "town · coming soon": the world goes on, you just can't go there yet */}
      <group position={[0, 2.0, 0.12]}>
        <RBox size={[3.2, 0.9, 0.08]} color={C.cream} r={0.08} />
        <RBox size={[3.0, 0.7, 0.1]} pos={[0, 0, 0.01]} color={C.counter} r={0.06} />
      </group>
    </group>
  )
}

// a streetlamp on the kerb side; the lantern is a shared glow material, so it brightens at night with the clock
function Lamp({ x, z }: { x: number; z: number }) {
  useLampSpot(x, 6, z, 2.6)
  return (
    <group position={[x, 0.16, z]} scale={[2.1, 2.25, 2.1]}>{/* 19 Nov: taller (~9.9 m) and chunkier; the pool of light grows with them */}
      <mesh position={[0, 2.1, 0]} material={ironMat} castShadow><cylinderGeometry args={[0.07, 0.11, 4.2, 10]} /></mesh>
      <mesh position={[0, 0.15, 0]} material={ironMat}><cylinderGeometry args={[0.22, 0.26, 0.3, 12]} /></mesh>
      <mesh position={[0, 4.35, 0]} material={ironMat}><coneGeometry args={[0.36, 0.3, 6]} /></mesh>
      <mesh position={[0, 4.05, 0]} material={glow()}><boxGeometry args={[0.4, 0.46, 0.4]} /></mesh>
      <Billboard position={[0, 4.05, 0]}><mesh material={nightGlow}><planeGeometry args={[3.4, 3.4]} /></mesh></Billboard>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lampPool}><planeGeometry args={[13, 13]} /></mesh>
    </group>
  )
}

// the T-junction's two corners: one tall post, a cross of four arms, a lantern on each pointing N / E / S / W
// (same iron + glow as the streetlamps, so all four brighten together at dusk)
function CornerLamp({ x, z }: { x: number; z: number }) {
  useLampSpot(x, 6, z, 2.6)
  return (
    <group position={[x, 0.16, z]} scale={[2.1, 2.25, 2.1]}>
      <mesh position={[0, 2.25, 0]} material={ironMat} castShadow><cylinderGeometry args={[0.08, 0.13, 4.5, 10]} /></mesh>
      <mesh position={[0, 0.17, 0]} material={ironMat}><cylinderGeometry args={[0.26, 0.3, 0.34, 12]} /></mesh>
      <mesh position={[0, 4.62, 0]} material={ironMat}><sphereGeometry args={[0.12, 12, 8]} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <mesh position={[0.32, 4.45, 0]} rotation={[0, 0, Math.PI / 2]} material={ironMat}><cylinderGeometry args={[0.035, 0.035, 0.64, 8]} /></mesh>
          <mesh position={[0.64, 4.3, 0]} material={ironMat}><coneGeometry args={[0.24, 0.2, 6]} /></mesh>
          <mesh position={[0.64, 4.05, 0]} material={glow()}><boxGeometry args={[0.28, 0.34, 0.28]} /></mesh>
          <Billboard position={[0.64, 4.05, 0]}><mesh material={nightGlow}><planeGeometry args={[1.9, 1.9]} /></mesh></Billboard>
        </group>
      ))}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lampPool}><planeGeometry args={[17, 17]} /></mesh>
    </group>
  )
}

// lights around the café: knee-high garden lanterns on the grass ringing the teapot, and a lantern each side of the door
function CafeLights() {
  const ring = useMemo(() => Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2).filter((a) => Math.cos(a) < 0.93)
    .map((a) => [Math.sin(a) * 20.2, Math.cos(a) * 20.2] as const), [])
  return (
    <group>
      {ring.map(([x, z]) => (
        <group key={`${x.toFixed(1)},${z.toFixed(1)}`} position={[x, 0, z]} scale={1.6}>
          <mesh position={[0, 0.35, 0]} material={ironMat}><cylinderGeometry args={[0.08, 0.1, 0.7, 8]} /></mesh>
          <mesh position={[0, 0.8, 0]} material={glow()}><sphereGeometry args={[0.2, 14, 10]} /></mesh>
          <mesh position={[0, 1.0, 0]} material={ironMat}><coneGeometry args={[0.24, 0.18, 8]} /></mesh>
          <Billboard position={[0, 0.8, 0]}><mesh material={nightGlow}><planeGeometry args={[1.4, 1.4]} /></mesh></Billboard>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={nightGlow}><planeGeometry args={[4, 4]} /></mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.05, 2.7, S.passage[1] + 0.15]}>
          <mesh material={ironMat}><boxGeometry args={[0.14, 0.14, 0.35]} /></mesh>
          <mesh position={[0, -0.05, 0.25]} material={glow()}><boxGeometry args={[0.32, 0.42, 0.32]} /></mesh>
          <mesh position={[0, 0.22, 0.25]} material={ironMat}><coneGeometry args={[0.28, 0.2, 4]} /></mesh>
          <Billboard position={[0, -0.05, 0.3]}><mesh material={nightGlow}><planeGeometry args={[2.2, 2.2]} /></mesh></Billboard>
        </group>
      ))}
    </group>
  )
}

// zebra crossing + blinking beacons on striped poles
function Zebra({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  const beacon = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => { if (beacon.current) beacon.current.emissiveIntensity = Math.sin(clock.elapsedTime * 3.2) > 0 ? 1.4 : 0.15 })
  const stripes = 7, w = 0.5, gap = 0.5
  return (
    <group>
      {Array.from({ length: stripes }, (_, i) => x - ((stripes - 1) * (w + gap)) / 2 + i * (w + gap)).map((sx) => (
        <mesh key={sx} position={[sx, 0.035, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={lineMat}><planeGeometry args={[w, z1 - z0 - 0.6]} /></mesh>
      ))}
      {[[x - 4.4, z0 - 0.6], [x + 4.4, z1 + 0.6]].map(([bx, bz]) => (
        <group key={`${bx}${bz}`} position={[bx, 0.16, bz]}>
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 0.25 + i * 0.5, 0]} material={i % 2 ? mat(C.plum) : mat(C.cream)}><cylinderGeometry args={[0.07, 0.07, 0.5, 8]} /></mesh>)}
          <mesh position={[0, 3.2, 0]}><sphereGeometry args={[0.3, 16, 12]} /><meshStandardMaterial ref={beacon} color="#f2a85a" emissive="#ffb066" /></mesh>
        </group>
      ))}
    </group>
  )
}

// the passage through the teapot's thick wall, so walking out the door never clips into the pot's shell
function DoorPassage() {
  return (
    <group>
      {[-1, 1].map((s) => <RBox key={s} size={[0.3, 3.2, S.passage[1] - S.passage[0]]} pos={[s * 1.3, 1.6, (S.passage[0] + S.passage[1]) / 2]} color={C.plum} r={0.05} />)}
      <RBox size={[2.9, 0.3, S.passage[1] - S.passage[0]]} pos={[0, 3.3, (S.passage[0] + S.passage[1]) / 2]} color={C.purple} r={0.05} />
      <Ground x0={-1.15} x1={1.15} z0={S.passage[0]} z1={S.passage[1] + 0.3} m={mat(C.path)} y={0.03} />
    </group>
  )
}

export function Street() {
  const { padA, road, padB, side, X, BACK, FRONT } = S
  // doors open as you walk up to them (inside or out), and ease shut behind you
  useFrame((_, dt) => {
    const { mode, player } = useGame.getState()
    const near = (mode === 'walk' || mode === 'fp') && Math.abs(player.x) < 3 && player.z > S.passage[0] - 4 && player.z < S.passage[1] + 4
    const k = Math.min(1, dt * 5)
    if (mode === 'walk' || mode === 'fp') { anim.doorIn += ((near ? 1 : 0) - anim.doorIn) * k; anim.doorOut += ((near ? 1 : 0) - anim.doorOut) * k }
  })
  return (
    <group>
      {/* pavements, kerbs, the main road and its markings */}
      <Pavement x0={-X} x1={X} z0={padA[0]} z1={padA[1]} />
      <Kerb x0={-X} x1={X} z={padA[1]} />
      <Ground x0={-X} x1={X} z0={road[0]} z1={road[1]} m={roadMat} />
      {Array.from({ length: Math.floor((2 * X) / 6) }, (_, i) => -X + 3 + i * 6).filter((x) => Math.abs(x) > 5).map((x) => (
        <mesh key={x} position={[x, 0.035, (road[0] + road[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={lineMat}><planeGeometry args={[2.6, 0.18]} /></mesh>
      ))}
      <Zebra x={0} z0={road[0]} z1={road[1]} />
      <Kerb x0={-X} x1={-side.road} z={padB[0]} />
      <Kerb x0={side.road} x1={X} z={padB[0]} />
      <Pavement x0={-X} x1={-side.road} z0={padB[0]} z1={padB[1]} />
      <Pavement x0={side.road} x1={X} z0={padB[0]} z1={padB[1]} />
      {/* the side street, the stem of the T */}
      <Ground x0={-side.road} x1={side.road} z0={road[1]} z1={FRONT} m={roadMat} />
      <Pavement x0={-side.pad} x1={-side.road} z0={padB[1]} z1={FRONT} />
      <Pavement x0={side.road} x1={side.pad} z0={padB[1]} z1={FRONT} />
      {/* the path from the door to the pavement, and the night glow at the door */}
      <DoorPassage />
      <CafeLights />
      <mesh position={[0, 0.18, padA[0] + 1.6]} rotation={[-Math.PI / 2, 0, 0]} material={nightGlow}><planeGeometry args={[7, 5]} /></mesh>
      {/* streetlamps */}
      {/* 19 Nov: fewer, brighter lamps (it was 12 + the corners: busy, yet dim) */}
      {[-44, -22, 22, 44].map((x) => <Lamp key={`a${x}`} x={x} z={padA[1] - 0.6} />)}
      {[-32, 32].map((x) => <Lamp key={`b${x}`} x={x} z={padB[0] + 0.6} />)}
      {[52].map((z) => <Lamp key={`s${z}`} x={side.road + 0.6} z={z} />)}
      {[-1, 1].map((k) => <CornerLamp key={`t${k}`} x={k * (side.road + 0.8)} z={padB[0] + 0.8} />)}{/* the T's two corners */}
      {/* the block's brick walls, with closed gates at every road end */}
      <Wall a={[-X, BACK]} b={[X, BACK]} />
      <Wall a={[-X, BACK]} b={[-X, padA[0]]} />
      <Wall a={[X, BACK]} b={[X, padA[0]]} />
      <Wall a={[-X, padB[1]]} b={[-X, FRONT]} />
      <Wall a={[X, padB[1]]} b={[X, FRONT]} />
      <Wall a={[-X, FRONT]} b={[-side.pad - 1.1, FRONT]} />
      <Wall a={[side.pad + 1.1, FRONT]} b={[X, FRONT]} />
      <Gate at={[-X, (padA[0] + padB[1]) / 2]} width={padB[1] - padA[0] - 1.1} rotY={Math.PI / 2} />
      <Gate at={[X, (padA[0] + padB[1]) / 2]} width={padB[1] - padA[0] - 1.1} rotY={-Math.PI / 2} />
      <Gate at={[0, FRONT]} width={side.pad * 2} rotY={Math.PI} />
    </group>
  )
}
