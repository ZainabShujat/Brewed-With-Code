import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Model } from './Models'
import { C } from '../data/palette'
import { glow, mat, glass } from './mats'
import { Puck, RBox } from './Soft'

type V3 = [number, number, number]

export function Plant({ pos, s = 1, pot = C.purple }: { pos: V3; s?: number; pot?: string }) {
  // leaves sway gently, each plant on its own rhythm
  const ref = useRef<THREE.Group>(null), ph = pos[0] * 1.7 + pos[2]
  useFrame(({ clock }) => { if (ref.current) { const t = clock.elapsedTime; ref.current.rotation.z = Math.sin(t * 0.9 + ph) * 0.025; ref.current.rotation.x = Math.sin(t * 0.7 + ph * 2) * 0.02 } })
  return <group position={pos}><group ref={ref}><Model name="potted_plant_01" scale={s * 0.85} /></group></group>
}

// Vine trailing down from a shelf: a chain of little leaf blobs
export function Vine({ pos, len = 6 }: { pos: V3; len?: number }) {
  return (
    <group position={pos}>
      {Array.from({ length: len }, (_, i) => (
        <mesh key={i} position={[Math.sin(i * 1.3) * 0.08, -i * 0.17, Math.cos(i * 1.7) * 0.05]} material={mat(i % 2 ? C.leaf : C.leafDark)}>
          <sphereGeometry args={[0.09 - i * 0.006, 8, 6]} />
        </mesh>
      ))}
    </group>
  )
}

export function PendantLamp({ pos, color = C.counter, drop = 1.1 }: { pos: V3; color?: string; drop?: number }) {
  void color
  // a very slight swing, as if someone brushed past
  const ref = useRef<THREE.Group>(null), ph = pos[0] + pos[2] * 0.7
  useFrame(({ clock }) => { if (ref.current) { const t = clock.elapsedTime; ref.current.rotation.z = Math.sin(t * 0.8 + ph) * 0.012; ref.current.rotation.x = Math.cos(t * 0.6 + ph) * 0.01 } })
  return (
    <group position={pos} ref={ref}>
      <mesh position={[0, -drop / 2, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.012, 0.012, drop, 6]} /></mesh>
      <Model name="modern_ceiling_lamp_01" scale={1.0} pos={[0, -drop - 0.5, 0]} />
      <mesh position={[0, -drop - 0.15, 0]} material={glow()}><sphereGeometry args={[0.07, 12, 8]} /></mesh>
    </group>
  )
}

export function Clock({ pos, rotY = 0, r = 0.32 }: { pos: V3; rotY?: number; r?: number }) {
  return <group position={pos} rotation={[0, rotY, 0]}><Model name="wall_clock" scale={r / 0.16} /></group>
}

// Wall shelf with jars and cups
export function Shelf({ pos, w = 2.2, rotY = 0, vines = true }: { pos: V3; w?: number; rotY?: number; vines?: boolean }) {
  const items = Math.floor(w / 0.32)
  const jar = [C.peach, C.lilac, C.mint, C.counter, C.butter]
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <RBox size={[w, 0.08, 0.38]} color={C.wood} r={0.03} />
      {[-w / 2 + 0.15, w / 2 - 0.15].map((x) => <RBox key={x} size={[0.06, 0.25, 0.3]} pos={[x, -0.15, 0]} color={C.woodDark} r={0.02} />)}
      {Array.from({ length: items }, (_, i) => {
        const x = -w / 2 + 0.2 + i * 0.32
        return i % 3 === 2 ? (
          <group key={i} position={[x, 0.13, 0]}>
            <mesh material={mat(C.cream)}><cylinderGeometry args={[0.1, 0.08, 0.18, 14]} /></mesh>
            <mesh position={[0.11, 0, 0]} material={mat(C.cream)}><torusGeometry args={[0.05, 0.015, 6, 10]} /></mesh>
          </group>
        ) : (
          <group key={i} position={[x, 0.16, 0]}>
            <mesh material={glass()}><cylinderGeometry args={[0.11, 0.11, 0.24, 14]} /></mesh>
            <mesh position={[0, -0.03, 0]} material={mat(jar[i % jar.length])}><cylinderGeometry args={[0.09, 0.09, 0.15, 12]} /></mesh>
            <mesh position={[0, 0.14, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.1, 0.1, 0.05, 14]} /></mesh>
          </group>
        )
      })}
      {vines && <Vine pos={[w / 2 - 0.25, -0.05, 0.12]} len={7} />}
      {vines && <Vine pos={[-w / 2 + 0.4, -0.05, 0.12]} len={5} />}
    </group>
  )
}

// Fairy lights strung along a wall top
export function StringLights({ from, to, n = 14 }: { from: V3; to: V3; n?: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        const sag = Math.sin(t * Math.PI * 3) * 0.08 + 0.1
        return (
          <mesh key={i} position={[from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t - Math.abs(sag), from[2] + (to[2] - from[2]) * t]} material={glow(i % 2 ? C.butter : '#ffc4dd')}>
            <sphereGeometry args={[0.05, 8, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}

export function Stool({ pos, color = C.counter }: { pos: V3; color?: string }) {
  void color
  return <group position={pos}><Model name="bar_chair_round_01" scale={0.95} /></group>
}

const _ray = new THREE.Raycaster(), _o = new THREE.Vector3(), _down = new THREE.Vector3(0, -1, 0)
export function RoundTable({ pos, top = C.cream }: { pos: V3; top?: string }) {
  void top
  const table = useRef<THREE.Group>(null), items = useRef<THREE.Group>(null), done = useRef(false)
  useFrame(() => {
    if (done.current || !table.current || !items.current || !table.current.children.length) return
    table.current.updateMatrixWorld(true)
    table.current.localToWorld(_o.set(0, 2, 0)); _ray.set(_o, _down)
    const hit = _ray.intersectObject(table.current, true)[0]
    if (!hit) return
    items.current.position.y = table.current.worldToLocal(hit.point.clone()).y
    items.current.visible = true; done.current = true
  })
  return (
    <group position={pos}>
      <group ref={table}><Model name="sf:table" fit={0.84} /></group>
      {/* the table set comes with its own four chairs (taller than the top), so the cup and cake
          are dropped onto the real tabletop with a downward ray once the model has loaded */}
      <group ref={items} visible={false}>
        <Model name="sf:cup" fit={0.1} pos={[0.12, 0, 0.02]} rot={[0, 0.6, 0]} />
        <Model name="strawberry_chocolate_cake" pos={[-0.12, 0, -0.02]} scale={0.8} />
      </group>
    </group>
  )
}

export function Rug({ pos, r = 1.5, color = C.lilac }: { pos: V3; r?: number; color?: string }) {
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat(color)} receiveShadow><circleGeometry args={[r, 32]} /></mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.cream)}><ringGeometry args={[r * 0.8, r * 0.86, 32]} /></mesh>
    </group>
  )
}

export function Chalkboard({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <RBox size={[1.3, 0.9, 0.06]} color={C.wood} r={0.04} />
      <RBox size={[1.15, 0.75, 0.04]} pos={[0, 0, 0.02]} color="#4b3a55" r={0.02} shadow={false} />
      {[0.2, 0.05, -0.1, -0.25].map((y, i) => (
        <mesh key={y} position={[-0.1 + (i % 2) * 0.05, y, 0.05]} material={mat(i === 0 ? C.counter : C.cream)}>
          <boxGeometry args={[i === 0 ? 0.6 : 0.75, 0.04, 0.005]} />
        </mesh>
      ))}
    </group>
  )
}

export function ArchWindow({ pos, rotY = 0, w = 1.1, h = 1.5 }: { pos: V3; rotY?: number; w?: number; h?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh material={mat(C.sky, { emissive: '#f4e6ff' })}><planeGeometry args={[w, h]} /></mesh>
      <mesh position={[0, h / 2, 0]} material={mat(C.sky, { emissive: '#f4e6ff' })}><circleGeometry args={[w / 2, 20, 0, Math.PI]} /></mesh>
      {/* frame */}
      {[-w / 2, w / 2].map((x) => <RBox key={x} size={[0.1, h, 0.12]} pos={[x, 0, 0.02]} color={C.plum} r={0.03} />)}
      <RBox size={[w + 0.2, 0.12, 0.2]} pos={[0, -h / 2, 0.05]} color={C.plum} r={0.04} />
      <mesh position={[0, h / 2, 0.02]} material={mat(C.plum)}><torusGeometry args={[w / 2, 0.05, 8, 20, Math.PI]} /></mesh>
      <RBox size={[0.05, h + w / 2, 0.06]} pos={[0, w / 4, 0.03]} color={C.plum} r={0.02} />
      <Plant pos={[0.25, -h / 2 + 0.06, 0.12]} s={0.5} pot={C.counter} />
    </group>
  )
}

// soft wisps of steam rising and fading (espresso machine, cups)
const STEAM_N = 7
export function Steam({ pos, scale = 1 }: { pos: V3; scale?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    ref.current?.children.forEach((c, i) => {
      const k = (clock.elapsedTime * 0.35 + i / STEAM_N) % 1
      c.position.set(Math.sin(k * 6 + i) * 0.06, k * 0.9, Math.cos(k * 5 + i) * 0.05)
      c.scale.setScalar(0.4 + k * 1.3)
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial; m.opacity = Math.sin(k * Math.PI) * 0.35
    })
  })
  return (
    <group ref={ref} position={pos} scale={scale}>
      {Array.from({ length: STEAM_N }, (_, i) => <mesh key={i}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent depthWrite={false} opacity={0.2} /></mesh>)}
    </group>
  )
}
