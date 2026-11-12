import { RoundedBox } from '@react-three/drei'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { mat } from './mats'

type V3 = [number, number, number]

// Rounded box: the basic "soft toy" building block. Nothing in the café has sharp edges.
export function RBox({ size, pos = [0, 0, 0], rot, color, r = 0.08, material, shadow = true }: {
  size: V3; pos?: V3; rot?: V3; color?: string; r?: number; material?: THREE.Material; shadow?: boolean
}) {
  const rr = Math.min(r, size[0] / 2.01, size[1] / 2.01, size[2] / 2.01)
  return (
    <RoundedBox args={size} radius={rr} smoothness={3} position={pos} rotation={rot}
      material={material ?? mat(color ?? '#fff')} castShadow={shadow} receiveShadow />
  )
}

// Rounded cylinder-ish: a cylinder with a torus lip, reads as a soft puck.
export function Puck({ r, h, pos = [0, 0, 0], color }: { r: number; h: number; pos?: V3; color: string }) {
  return (
    <group position={pos}>
      <mesh material={mat(color)} castShadow receiveShadow><cylinderGeometry args={[r, r, h, 24]} /></mesh>
      <mesh position={[0, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(color)}><torusGeometry args={[r - 0.02, Math.min(0.04, h / 2), 8, 24]} /></mesh>
    </group>
  )
}

export function G({ pos, rot, scale, children }: { pos?: V3; rot?: V3; scale?: number | V3; children: ReactNode }) {
  return <group position={pos} rotation={rot} scale={scale}>{children}</group>
}
