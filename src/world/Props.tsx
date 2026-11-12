import { C } from '../data/palette'
import { glow, mat, glass } from './mats'
import { Puck, RBox } from './Soft'

type V3 = [number, number, number]

export function Plant({ pos, s = 1, pot = C.purple }: { pos: V3; s?: number; pot?: string }) {
  const leaves: V3[] = [[0, 0.75, 0], [0.22, 0.62, 0.1], [-0.2, 0.65, -0.08], [0.05, 0.6, 0.24], [-0.08, 0.95, 0.05]]
  return (
    <group position={pos} scale={s}>
      <mesh position={[0, 0.22, 0]} material={mat(pot)} castShadow><cylinderGeometry args={[0.24, 0.18, 0.44, 20]} /></mesh>
      <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(pot)}><torusGeometry args={[0.24, 0.04, 8, 20]} /></mesh>
      {leaves.map((p, i) => (
        <mesh key={i} position={p} scale={[1, 1.25, 1]} material={mat(i % 2 ? C.leaf : C.leafDark)} castShadow>
          <sphereGeometry args={[0.2, 12, 10]} />
        </mesh>
      ))}
    </group>
  )
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
  return (
    <group position={pos}>
      <mesh position={[0, -drop / 2, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.015, 0.015, drop, 6]} /></mesh>
      <mesh position={[0, -drop, 0]} material={mat(color, { flat: false })} castShadow>
        <sphereGeometry args={[0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, -drop - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(color)}><torusGeometry args={[0.38, 0.03, 6, 20]} /></mesh>
      <mesh position={[0, -drop - 0.06, 0]} material={glow()}><sphereGeometry args={[0.13, 12, 8]} /></mesh>
    </group>
  )
}

export function Clock({ pos, rotY = 0, r = 0.32 }: { pos: V3; rotY?: number; r?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(C.plum)}><cylinderGeometry args={[r + 0.05, r + 0.05, 0.08, 24]} /></mesh>
      <mesh position={[0, 0, 0.045]} material={mat(C.cream)}><circleGeometry args={[r, 24]} /></mesh>
      <mesh position={[0, r * 0.25, 0.06]} material={mat(C.plum)}><boxGeometry args={[0.03, r * 0.5, 0.01]} /></mesh>
      <mesh position={[r * 0.2, 0, 0.06]} rotation={[0, 0, Math.PI / 2]} material={mat(C.plum)}><boxGeometry args={[0.03, r * 0.4, 0.01]} /></mesh>
    </group>
  )
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
  return (
    <group position={pos}>
      <Puck r={0.26} h={0.12} pos={[0, 0.62, 0]} color={color} />
      {[0, 2.09, 4.18].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.15, 0.3, Math.cos(a) * 0.15]} rotation={[Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]} material={mat(C.woodDark)} castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.62, 8]} />
        </mesh>
      ))}
    </group>
  )
}

export function RoundTable({ pos, top = C.cream }: { pos: V3; top?: string }) {
  return (
    <group position={pos}>
      <Puck r={0.62} h={0.08} pos={[0, 0.82, 0]} color={top} />
      <mesh position={[0, 0.42, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.06, 0.08, 0.8, 10]} /></mesh>
      <mesh position={[0, 0.04, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.32, 0.36, 0.08, 18]} /></mesh>
      {/* little cup + cake on top */}
      <mesh position={[0.18, 0.93, 0.05]} material={mat(C.white)}><cylinderGeometry args={[0.08, 0.06, 0.12, 12]} /></mesh>
      <mesh position={[-0.15, 0.92, -0.1]} material={mat(C.counter)}><cylinderGeometry args={[0.12, 0.12, 0.1, 14]} /></mesh>
      <mesh position={[-0.15, 0.99, -0.1]} material={mat(C.cream)}><cylinderGeometry args={[0.12, 0.12, 0.03, 14]} /></mesh>
      <mesh position={[-0.15, 1.04, -0.1]} material={mat('#e0405e')}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
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
