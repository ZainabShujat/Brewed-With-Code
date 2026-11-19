import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { nightGlow } from './Lighting'
import { quality } from '../ui/Menu'
import { WORLD } from './layout'

// Real lamp light after dark: walls, trees, benches and townsfolk round a lamp get lit, not just the ground.
// A real light on every lamp would cost every lit surface a lot (and recompile shaders as lamps come and go), so a
// FIXED pool of lights (4 on High, 2 on Low) hops to the lamps nearest the camera a few times a second. Far lamps
// keep their glowing halo, which is all you can see of them from there anyway.
// Lamps register themselves (layout units, the height of their light): useLampSpot(x, y, z).
type Spot = { x: number; y: number; z: number; k: number }
const SPOTS = new Set<Spot>()
export function useLampSpot(x: number, y: number, z: number, k = 1) { // k = how strong (tall street lamps need more)
  useEffect(() => { const s = { x, y, z, k }; SPOTS.add(s); return () => { SPOTS.delete(s) } }, [x, y, z, k])
}

const N = quality.high ? 4 : 2
const _c = new THREE.Vector3()
/** mount inside the WORLD-scaled group (positions are in layout units, like the lamps) */
export function LampLights() {
  const refs = useRef<(THREE.PointLight | null)[]>([])
  const slots = useMemo(() => Array.from({ length: N }, (_, i) => i), [])
  let n = 0
  useFrame(({ camera }) => {
    const night = nightGlow.opacity / 0.85
    if (++n % 8 === 0 || n === 1) { // re-pick the nearest lamps ~5×/s (cheap: a few dozen distances)
      _c.copy(camera.position).divideScalar(WORLD)
      const near = [...SPOTS].sort((a, b) => (a.x - _c.x) ** 2 + (a.z - _c.z) ** 2 - ((b.x - _c.x) ** 2 + (b.z - _c.z) ** 2)).slice(0, N)
      refs.current.forEach((l, i) => { if (!l) return; const s = near[i]; if (s) l.position.set(s.x, s.y, s.z); l.userData.k = s ? s.k : 0 })
    }
    refs.current.forEach((l) => { if (l) l.intensity = night * 6 * (l.userData.k ?? 0) })
  })
  return <>{slots.map((i) => <pointLight key={i} ref={(l) => { refs.current[i] = l }} color="#ffc98a" intensity={0} distance={30} decay={1.2} />)}</>
}
