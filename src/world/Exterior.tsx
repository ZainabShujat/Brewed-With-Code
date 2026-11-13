import * as THREE from 'three'
import { useMemo } from 'react'
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
      <Reveal id="door" at={[0, 0, 5.9]}><ArchDoor /><Awning /></Reveal>
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

function WindingPath() {
  const pts = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 6.3), new THREE.Vector3(-0.8, 0, 8), new THREE.Vector3(0.9, 0, 10),
      new THREE.Vector3(-0.4, 0, 12), new THREE.Vector3(0, 0, 14.2),
    ])
    return curve.getSpacedPoints(20).map((p, i) => ({ p, w: 1.7 + i * 0.04 }))
  }, [])
  return (
    <group>
      {pts.map(({ p, w }, i) => (
        <mesh key={i} position={[p.x, 0.03, p.z]} material={mat(C.path)} receiveShadow>
          <cylinderGeometry args={[w / 2, w / 2, 0.06, 24]} />
        </mesh>
      ))}
    </group>
  )
}

function Car({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0, -0.2]}>
      <RBox size={[1.3, 0.6, 2.2]} pos={[0, 0.5, 0]} color={color} r={0.25} />
      <RBox size={[1.1, 0.5, 1.2]} pos={[0, 1.0, -0.1]} color={C.cream} r={0.22} />
      {[[-0.65, 0.7], [0.65, 0.7], [-0.65, -0.7], [0.65, -0.7]].map(([dx, dz]) => (
        <mesh key={`${dx}${dz}`} position={[dx, 0.25, dz]} rotation={[0, 0, Math.PI / 2]} material={mat(C.plum)}><cylinderGeometry args={[0.25, 0.25, 0.2, 16]} /></mesh>
      ))}
    </group>
  )
}

function Parking({ x, cars }: { x: number; cars: [number, string][] }) {
  return (
    <group position={[x, 0.02, 10.5]}>
      <RBox size={[8, 0.06, 5]} color={C.road} r={0.03} shadow={false} />
      {[-3, -1, 1, 3].map((dx) => <RBox key={dx} size={[0.12, 0.02, 3]} pos={[dx, 0.04, -0.5]} color={C.white} r={0.01} shadow={false} />)}
      {cars.map(([cx, col]) => <Car key={cx} x={cx} color={col} />)}
    </group>
  )
}

function Road() {
  return (
    <group position={[0, 0.02, 17.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat(C.road)} receiveShadow><planeGeometry args={[90, 5]} /></mesh>
      {Array.from({ length: 16 }, (_, i) => -30 + i * 4).map((x) => (
        <RBox key={x} size={[1.8, 0.02, 0.25]} pos={[x, 0.02, 0]} color={C.cream} r={0.01} shadow={false} />
      ))}
    </group>
  )
}

// Locked conservatory wings: ghost glass + ⊕ lot. Unlocked later by levelling.
function LockedWings() {
  return (
    <group>
      <group position={[-9.2, 0, 0]}>
        <RBox size={[5, 3.2, 6]} pos={[0, 1.6, 0]} material={glass()} r={0.3} shadow={false} />
        <PlusSpot position={[0, 0.1, 0]} size={1.2} />
      </group>
      <group position={[9.2, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]} material={glass()}>
          <cylinderGeometry args={[2.9, 2.9, 6, 32, 1, false, 0, Math.PI]} />
        </mesh>
        <PlusSpot position={[0, 0.1, 0]} size={1.2} />
      </group>
    </group>
  )
}

function Tree({ x, z, s = 1, c = C.leaf }: { x: number; z: number; s?: number; c?: string }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.8, 0]} material={mat(C.woodDark)} castShadow><cylinderGeometry args={[0.22, 0.32, 1.6, 12]} /></mesh>
      <mesh position={[0, 2.3, 0]} material={mat(c)} castShadow><sphereGeometry args={[1.25, 20, 14]} /></mesh>
      <mesh position={[0.6, 2.9, 0.3]} material={mat(c)} castShadow><sphereGeometry args={[0.8, 16, 12]} /></mesh>
      <mesh position={[-0.6, 2.7, -0.2]} material={mat(c)} castShadow><sphereGeometry args={[0.85, 16, 12]} /></mesh>
    </group>
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

export function Exterior({ showPot, fadeIn = false }: { showPot: boolean; fadeIn?: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat(C.grass)} receiveShadow><planeGeometry args={[100, 80]} /></mesh>
      {/* everything outside scales so the pot contains the interior */}
      <group scale={OUT_SCALE}>
      {showPot && (fadeIn ? <FadeIn><CoffeePot /></FadeIn> : <CoffeePot />)}
      {showPot && <Reveal id="flowers"><Flowers /></Reveal>}
      <Reveal id="path" at={[0, 0, 7]}><WindingPath /></Reveal>
      <Reveal id="parking" at={[0, 0, 10.5]}>
        <Parking x={-9.5} cars={[[-2, C.lilac]]} />
        <Parking x={9.5} cars={[[2, C.mint]]} />
      </Reveal>
      <Reveal id="road" at={[0, 0, 17.5]}><Road /></Reveal>
      {showPot && <Reveal id="wings"><LockedWings /></Reveal>}
      <Reveal id="trees">
        <Tree x={-15} z={-4} s={1.2} />
        <Tree x={-13} z={4} c={C.leafDark} />
        <Tree x={14.5} z={-5} s={1.3} c={C.leafDark} />
        <Tree x={16} z={3} />
        <Tree x={-6} z={-10} s={1.4} c="#f2a9c9" />
        <Tree x={7} z={-11} s={1.5} c="#d7b4ef" />
      </Reveal>
      </group>
    </group>
  )
}
