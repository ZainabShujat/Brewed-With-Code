import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { anim } from '../systems/anim'

// A door leaf hinged at `pos`; swings by dir * 1.65 rad as anim[src] goes 0 → 1.
export function Swing({ pos, dir, src, children }: { pos: [number, number, number]; dir: 1 | -1; src: 'doorOut' | 'doorIn'; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) ref.current.rotation.y = dir * anim[src] * 1.65 })
  return <group position={pos} ref={ref}>{children}</group>
}

// Slides its children toward -z (out of the counter, toward the barista) as the drawer opens.
export function Slide({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) ref.current.position.z = -0.55 * (anim.drawers[id] ?? 0) })
  return <group ref={ref}>{children}</group>
}
