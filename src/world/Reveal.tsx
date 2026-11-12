import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../systems/store'

// Wraps a piece of the café. In build-up mode it stays hidden until its id is
// revealed, then pops in with a springy overshoot. In the normal game it's just there.
export function Reveal({ id, at = [0, 0, 0], children }: { id: string; at?: [number, number, number]; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  // read the store every frame (not via a React re-render) so reel timing is frame-exact
  const isOn = () => { const r = useGame.getState().revealed; return r === null || r.has(id) }
  const t = useRef(isOn() ? 1 : 0)
  useFrame((_, dt) => {
    if (!ref.current) return
    const target = isOn() ? 1 : 0
    t.current = Math.min(1, Math.max(0, t.current + (target ? dt : -dt) * 2.2))
    const x = t.current
    // easeOutBack: overshoots a little, then settles = "pop"
    const s = x === 0 ? 0 : 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2)
    ref.current.scale.setScalar(Math.max(0.0001, s))
    ref.current.visible = x > 0
  })
  // pivot around `at` so each piece grows from its own spot, not the café centre
  return (
    <group position={at}>
      <group ref={ref}><group position={[-at[0], -at[1], -at[2]]}>{children}</group></group>
    </group>
  )
}
