import { Canvas } from '@react-three/fiber'
import { SignFace, SIGN_CENTRE } from '../world/Signboard'

// The title: the café's own 3D signboard (the very same geometry as the one over the door), in a small
// transparent canvas of its own, lit straight on with a gentle sway.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
function Sway() {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (g.current) { g.current.rotation.y = Math.sin(t * 0.6) * 0.06; g.current.rotation.x = Math.sin(t * 0.45) * 0.025 } })
  const [x, y, z] = SIGN_CENTRE
  return <group ref={g}><group position={[-x, -y, -z]}><SignFace /></group></group>
}
export function TitleBoard() {
  return (
    <div className="titleboard">
      <Canvas flat dpr={[1, 2]} camera={{ fov: 30, position: [0, 0.4, 15.5] }} gl={{ alpha: true, antialias: true }}>
        <hemisphereLight args={['#fff6ee', '#7a5a6e', 1.6]} />
        <directionalLight position={[4, 6, 10]} intensity={1.7} color="#fff0e0" />
        <Sway />
      </Canvas>
    </div>
  )
}
