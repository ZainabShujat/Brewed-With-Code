import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../systems/store'
import { mat } from './mats'

// Customisable barista: every part reads its colour from the store (unlocks swap these later).
export function Barista() {
  const ref = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const look = useGame((s) => s.barista)
  useFrame(({ clock }) => {
    const p = useGame.getState().player
    if (!ref.current || !body.current) return
    ref.current.position.set(p.x, 0, p.z)
    ref.current.rotation.y = p.facing
    const moving = !!p.moving
    const t = clock.elapsedTime
    body.current.position.y = moving ? Math.abs(Math.sin(t * 10)) * 0.08 : Math.sin(t * 2) * 0.02
  })
  return (
    <group ref={ref}>
      <group ref={body}>
        {/* legs */}
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, 0.3, 0]} material={mat('#4a4a5a')} castShadow><capsuleGeometry args={[0.09, 0.35, 3, 6]} /></mesh>
        ))}
        {/* body + apron */}
        <mesh position={[0, 0.95, 0]} material={mat(look.shirt)} castShadow><capsuleGeometry args={[0.3, 0.45, 4, 8]} /></mesh>
        <mesh position={[0, 0.85, 0.24]} material={mat(look.apron)}><boxGeometry args={[0.46, 0.6, 0.08]} /></mesh>
        {/* head, a little oversized = cute */}
        <mesh position={[0, 1.65, 0]} material={mat(look.skin)} castShadow><sphereGeometry args={[0.36, 12, 10]} /></mesh>
        <mesh position={[0, 1.75, -0.05]} scale={[1.04, 0.8, 1.04]} material={mat(look.hair)}><sphereGeometry args={[0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 1.65, 0.33]} material={mat('#2b2024')}><sphereGeometry args={[0.04, 6, 4]} /></mesh>
        ))}
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 1.56, 0.3]} material={mat('#f2a7a0', { opacity: 0.8 })}><circleGeometry args={[0.05, 8]} /></mesh>
        ))}
        {/* cap */}
        <mesh position={[0, 1.95, 0]} material={mat(look.cap)}><cylinderGeometry args={[0.3, 0.34, 0.14, 12]} /></mesh>
        <mesh position={[0, 1.9, 0.28]} material={mat(look.cap)}><boxGeometry args={[0.4, 0.04, 0.22]} /></mesh>
      </group>
    </group>
  )
}
