import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/palette'
import { mat } from './mats'

// ⊕ expansion spot from the sketches: a bobbing ring with a plus. Bought later with coins.
export function PlusSpot({ position, size = 0.6 }: { position: [number, number, number]; size?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.25 * size + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.08 * size
  })
  return (
    <group position={position}>
      <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={mat(C.white)}><torusGeometry args={[size, size * 0.1, 6, 20]} /></mesh>
        <mesh material={mat(C.white)}><boxGeometry args={[size * 1.1, size * 0.18, size * 0.1]} /></mesh>
        <mesh material={mat(C.white)}><boxGeometry args={[size * 0.18, size * 1.1, size * 0.1]} /></mesh>
      </group>
    </group>
  )
}
