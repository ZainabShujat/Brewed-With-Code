import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mat } from './mats'
import { useGame } from '../systems/store'
import { objective, WHERE_AT } from '../systems/objective'

// The pink arrow over wherever the goal line says to go (the door, the counter, the kitchen, the cake bench).
// Café layout units (inside the café group). Only on foot; a soft ring pulses on the floor under it.
export function Waypoint() {
  const g = useRef<THREE.Group>(null), ring = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const o = g.current; if (!o) return
    const m = useGame.getState().mode, w = objective().where, on = (m === 'walk' || m === 'fp' || m === 'dollhouse') && !!w
    o.visible = on; if (!on || !w) return
    const [x, y, z] = WHERE_AT[w], t = performance.now() / 1000
    o.position.set(x, y + Math.abs(Math.sin(t * 2.6)) * 0.35, z); o.rotation.y = t * 1.4
    if (ring.current) { ring.current.position.set(0, -y - Math.abs(Math.sin(t * 2.6)) * 0.35 + 0.03, 0); ring.current.scale.setScalar(1 + (t % 1.2) * 0.6) ; (ring.current.material as THREE.MeshStandardMaterial).opacity = 0.6 * (1 - (t % 1.2) / 1.2) }
  })
  return (
    <group ref={g} visible={false}>
      <mesh rotation={[Math.PI, 0, 0]} material={mat('#ff7fb6', { emissive: '#ff4f9a' })}><coneGeometry args={[0.32, 0.6, 4]} /></mesh>
      <mesh position={[0, 0.45, 0]} material={mat('#ff7fb6', { emissive: '#ff4f9a' })}><cylinderGeometry args={[0.1, 0.1, 0.5, 8]} /></mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} material={mat('#ff7fb6', { opacity: 0.6 })}><ringGeometry args={[0.55, 0.75, 32]} /></mesh>
    </group>
  )
}
