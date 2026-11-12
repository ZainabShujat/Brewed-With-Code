import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Fades its children in from invisible (own material copies, so shared materials stay untouched).
// Used for the outro: the coffee-pot walls appear around the finished interior.
export function FadeIn({ delay = 0.5, dur = 1.8, children }: { delay?: number; dur?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const st = useRef<{ t: number; mats: THREE.Material[] } | null>(null)
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return
    if (!st.current) {
      const mats: THREE.Material[] = []
      g.traverse((o: any) => {
        if (!o.isMesh) return
        o.material = (o.material as THREE.Material).clone()
        o.material.transparent = true; o.material.opacity = 0; o.material.depthWrite = false
        mats.push(o.material)
      })
      st.current = { t: 0, mats }
    }
    const s = st.current
    s.t += dt
    const a = Math.min(1, Math.max(0, (s.t - delay) / dur))
    const e = a * a * (3 - 2 * a) // smoothstep
    for (const m of s.mats) {
      m.opacity = e
      if (a >= 1 && m.transparent) { m.transparent = false; m.depthWrite = true; m.needsUpdate = true }
    }
  })
  return <group ref={ref}>{children}</group>
}
