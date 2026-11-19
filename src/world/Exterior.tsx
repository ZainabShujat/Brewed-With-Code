import { grassMat } from './Ground'
import { NiceTree } from './Scenery'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { nightGlow } from './Lighting'
import { C } from '../data/palette'
import { mat, glass, glow } from './mats'
import { PlusSpot } from './PlusSpot'
import { RBox } from './Soft'
import { Reveal } from './Reveal'
import { FadeIn } from './FadeIn'
import { Swing } from './Swing'

// The outside world is scaled so the coffee pot is big enough to hold the 14 m interior.
export const OUT_SCALE = 2.95 // pot base radius 4.9 x 2.95 = 14.5 m: contains the 20 m room's corners

// Coffee-pot café from references/sketches/02-exterior-coffee-pot.jpg
const POT_PROFILE: [number, number][] = [
  [0, 0], [4.9, 0], [5.3, 0.15], [5.9, 1.2], [6.2, 2.8], [5.95, 4.4], [5.3, 5.8], [4.8, 6.5], [4.85, 6.85], [0, 6.85],
]
export const POT_R = (y: number) => {
  for (let i = 1; i < POT_PROFILE.length; i++) {
    const [r0, y0] = POT_PROFILE[i - 1], [r1, y1] = POT_PROFILE[i]
    if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0 || 1)) * (r1 - r0)
  }
  return 5
}

function CoffeePot() {
  const body = useMemo(() => {
    const curve = new THREE.SplineCurve(POT_PROFILE.slice(1, -1).map(([r, y]) => new THREE.Vector2(r, y)))
    const pts = [new THREE.Vector2(0, 0), ...curve.getPoints(40), new THREE.Vector2(0, 6.85)]
    return new THREE.LatheGeometry(pts, 48)
  }, [])
  return (
    <group>
      <Reveal id="pot"><mesh geometry={body} material={mat(C.potBody)} castShadow receiveShadow /></Reveal>
      <Reveal id="lid" at={[0, 7, 0]}>
      {/* lid: rim + dome + knob */}
      <mesh position={[0, 7.0, 0]} material={mat(C.purple)} castShadow><cylinderGeometry args={[5.25, 5.25, 0.4, 48]} /></mesh>
      <mesh position={[0, 7.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.purple)}><torusGeometry args={[5.1, 0.22, 12, 48]} /></mesh>
      <mesh position={[0, 7.2, 0]} scale={[1, 0.38, 1]} material={mat(C.lilac)} castShadow>
        <sphereGeometry args={[4.9, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <LidLights />
      </Reveal>
      <Reveal id="chimney" at={[0.6, 8.2, -0.6]}>
      {/* spout chimney with a wide cap (sketch) */}
      <mesh position={[0.6, 9.1, -0.6]} material={mat(C.plum)} castShadow><cylinderGeometry args={[0.45, 0.6, 1.8, 20]} /></mesh>
      <RBox size={[1.9, 0.4, 1.0]} pos={[0.6, 10.1, -0.6]} color={C.plum} r={0.18} />
      </Reveal>
      <Reveal id="band" at={[0, 3, 0]}>
      {/* candy band with dots */}
      <mesh position={[0, 4.4, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.counter)}><torusGeometry args={[5.97, 0.16, 10, 48]} /></mesh>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2, y = 1.9, r = POT_R(y) + 0.02
        return <mesh key={i} position={[Math.sin(a) * r, y, Math.cos(a) * r]} material={mat(i % 2 ? C.lilac : C.cream)}><sphereGeometry args={[0.22, 12, 8]} /></mesh>
      })}
      </Reveal>
      <Reveal id="window" at={[3.6, 4.9, 3.7]}><Porthole /></Reveal>
      {/* the door is drawn inside the 2.95× exterior: shrink it (around its own spot) to a walk-through, human-sized door */}
      <Reveal id="door" at={[0, 0, 5.9]}><group position={[0, 0, 5.85]} scale={0.45}><group position={[0, 0, -5.85]}><ArchDoor /><Awning /></group></group></Reveal>
    </group>
  )
}

// fairy-light bulbs all the way round the lid's edge, and real warm lights round the rim that switch on after dark,
// so the light actually falls on the lid, the pot's shoulder and the ground (no fake glow bands).
function LidLights() {
  const N = 56, R = 5.3, Y = 7.0
  const geo = useMemo(() => new THREE.SphereGeometry(0.11, 10, 8), [])
  const lights = useRef<THREE.Group>(null)
  useFrame(() => {
    const n = nightGlow.opacity / 0.85 // 0 by day → 1 at night (Lighting drives it from the clock)
    const g = lights.current; if (g) { g.visible = n > 0.12; g.children.forEach((l) => { (l as THREE.PointLight).intensity = 55 * n }) }
  })
  const set = (m: THREE.InstancedMesh | null, odd: number) => {
    if (!m) return; const o = new THREE.Object3D(); let k = 0
    for (let i = odd; i < N; i += 2) { const a = (i / N) * Math.PI * 2; o.position.set(Math.sin(a) * R, Y, Math.cos(a) * R); o.updateMatrix(); m.setMatrixAt(k++, o.matrix) }
    m.instanceMatrix.needsUpdate = true
  }
  return (
    <group>
      <instancedMesh ref={(m) => set(m, 0)} args={[geo, glow(C.butter), N / 2]} />
      <instancedMesh ref={(m) => set(m, 1)} args={[geo, glow('#ffc4dd'), N / 2]} />
      <group ref={lights}>{[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        return <pointLight key={i} position={[Math.sin(a) * (R + 1.6), Y + 0.4, Math.cos(a) * (R + 1.6)]} color="#ffd8ae" intensity={0} distance={22} decay={2} /> })}</group>
    </group>
  )
}

function Porthole() {
  const a = Math.PI / 4.2, y = 4.95, r = POT_R(y) + 0.02
  return (
    <group position={[Math.sin(a) * r, y, Math.cos(a) * r]} rotation={[-0.12, a, 0]}>
      <mesh material={mat(C.plum)}><torusGeometry args={[0.85, 0.17, 12, 28]} /></mesh>
      <mesh material={glow(C.butter)}><circleGeometry args={[0.8, 28]} /></mesh>
      <RBox size={[1.5, 0.08, 0.06]} pos={[0, 0, 0.03]} color={C.plum} r={0.03} shadow={false} />
      <RBox size={[0.08, 1.5, 0.06]} pos={[0, 0, 0.03]} color={C.plum} r={0.03} shadow={false} />
    </group>
  )
}

function ArchDoor() {
  const z = 5.85
  return (
    <group position={[0, 0, z]}>
      <RBox size={[2.7, 2.8, 0.5]} pos={[0, 1.4, 0]} color={C.plum} r={0.15} />
      <mesh position={[0, 2.8, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.plum)}>
        <cylinderGeometry args={[1.35, 1.35, 0.5, 32, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
      {/* double doors, hinged at the outer edges, swing outward (anim.doorOut) */}
      <Swing pos={[-1.03, 0, 0.27]} dir={-1} src="doorOut">
        <RBox size={[1.0, 2.7, 0.1]} pos={[0.51, 1.38, 0]} color={C.purple} r={0.05} />
        <mesh position={[0.83, 1.4, 0.09]} material={mat(C.butter)}><sphereGeometry args={[0.1, 12, 8]} /></mesh>
      </Swing>
      <Swing pos={[1.03, 0, 0.27]} dir={1} src="doorOut">
        <RBox size={[1.0, 2.7, 0.1]} pos={[-0.51, 1.38, 0]} color={C.purple} r={0.05} />
        <mesh position={[-0.83, 1.4, 0.09]} material={mat(C.butter)}><sphereGeometry args={[0.1, 12, 8]} /></mesh>
      </Swing>
      {/* dark doorway behind the leaves */}
      <RBox size={[2.06, 2.7, 0.06]} pos={[0, 1.38, 0.2]} color="#3a1f45" r={0.02} shadow={false} />
      <mesh position={[0, 2.78, 0.27]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.purple)}>
        <cylinderGeometry args={[1.05, 1.05, 0.1, 32, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
      {/* little hanging sign */}
      <RBox size={[1.2, 0.45, 0.08]} pos={[0, 4.15, 0.25]} color={C.cream} r={0.12} />
      <RBox size={[0.9, 0.08, 0.02]} pos={[0, 4.15, 0.3]} color={C.counter} r={0.03} shadow={false} />
      {/* flower boxes each side */}
      {[-1.9, 1.9].map((x) => (
        <group key={x} position={[x, 0, 0.5]}>
          <RBox size={[0.9, 0.4, 0.5]} pos={[0, 0.2, 0]} color={C.purple} r={0.1} />
          {[-0.28, 0, 0.28].map((dx, i) => (
            <mesh key={dx} position={[dx, 0.5, 0]} material={mat([C.counter, C.butter, C.lilac][i])}><sphereGeometry args={[0.16, 12, 8]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// Scalloped candy-stripe awning over the door
function Awning() {
  return (
    <group position={[0, 3.55, 6.2]}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-1.5 + i * 0.5, 0, 0]} rotation={[0.5, 0, 0]} material={mat(i % 2 ? C.cream : C.counter)} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.9, 16, 1, false, 0, Math.PI]} />
        </mesh>
      ))}
    </group>
  )
}






function Tree({ x, z, s = 1, c = C.leaf }: { x: number; z: number; s?: number; c?: string }) {
  return (
    // a stylised tree (Quaternius, CC0) instead of the old ball-on-a-stick; the pink / lilac ones keep their blossom
    <NiceTree x={x} z={z} h={3.4 * s} kind={Math.abs(Math.round(x * 3 + z))} tint={c === C.leaf || c === C.leafDark ? undefined : c} />
  )
}

function Flowers() {
  const spots = useMemo(() => Array.from({ length: 40 }, (_, i) => {
    const a = i * 2.4, r = 7.4 + (i % 5) * 0.5
    return [Math.sin(a) * r, Math.cos(a) * r * 0.6 - 2, i] as const
  }).filter(([x, z]) => Math.abs(x) > 2.2 || z < 4), [])
  const cols = [C.counter, C.lilac, C.butter, C.cream, C.purple]
  return (
    <group>
      {spots.map(([x, z, i]) => (
        <mesh key={i} position={[x, 0.15, z]} material={mat(cols[i % cols.length])}><sphereGeometry args={[0.18, 10, 8]} /></mesh>
      ))}
    </group>
  )
}

const GRASS = grassMat([150, 140])
export function Exterior({ showPot, fadeIn = false }: { showPot: boolean; fadeIn?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0, 7]} rotation={[-Math.PI / 2, 0, 0]} material={GRASS} receiveShadow><planeGeometry args={[150, 140]} /></mesh>
      {/* everything outside scales so the pot contains the interior */}
      <group scale={OUT_SCALE}>
      {showPot && (fadeIn ? <FadeIn><CoffeePot /></FadeIn> : <CoffeePot />)}
      {showPot && <Reveal id="flowers"><Flowers /></Reveal>}
      <Reveal id="trees">
        <Tree x={-19} z={-5} s={2.6} />
        <Tree x={19} z={-6} s={2.8} c={C.leafDark} />
        <Tree x={-8} z={-14} s={2.9} c="#f2a9c9" />
        <Tree x={9} z={-14} s={3.1} c="#d7b4ef" />
      </Reveal>
      </group>
    </group>
  )
}
