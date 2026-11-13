import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { makeMascot3D, type Mascot } from './kozie/notey3d.js'
import { useGame } from '../systems/store'
import { anim, frozen } from '../systems/anim'

// Kozie on set: stands in the café (on the path outside, on the floor inside), turns to face the camera.
// The reel page drives talking/poses through window.cafe.kozie.
const SPOT = {
  exterior: { pos: new THREE.Vector3(-5.5, 0, 26.5), s: 2.07 }, // 0.7 x the 2.95x outside scale
  inside: { pos: new THREE.Vector3(2.8, 0.12, 7.2), s: 0.7 }, // ~1.7 m: human-sized next to tables (0.8) and stools (0.6)
}
export const kozieCtl: { m?: Mascot; hopT: number; hopReq: boolean } = { hopT: -9, hopReq: false }

export function Kozie() {
  const m = useMemo(() => {
    const k = makeMascot3D(THREE, { RoundedBoxGeometry })
    k.pencil.visible = true
    k.group.traverse((o: any) => { if (o.isMesh) o.castShadow = true })
    k.pose('excited')
    return k
  }, [])
  kozieCtl.m = m
  const ref = useRef<THREE.Group>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, clock }) => {
    const g = ref.current; if (!g) return
    if (frozen()) return // stutter: Kozie holds her pose too
    g.visible = !anim.kozie.hidden
    const t = clock.elapsedTime
    if (kozieCtl.hopReq) { kozieCtl.hopT = t; kozieCtl.hopReq = false }
    const hop = Math.max(0, Math.sin(Math.min(1, (t - kozieCtl.hopT) / 0.45) * Math.PI))
    const k = anim.kozie
    if (k.free) {
      // vlog: Kozie walks her own path; waddles while walking, turns to camera when talking
      g.position.copy(k.pos)
      g.position.y += k.s * 0.95 + hop * 0.5 * k.s + (k.walking ? Math.abs(Math.sin(t * 9)) * 0.1 * k.s : 0)
      g.scale.setScalar(k.s)
      g.rotation.z = k.walking ? Math.sin(t * 9) * 0.1 : 0
      tmp.copy(camera.position).sub(g.position)
      const want = k.faceCam ? Math.atan2(tmp.x, tmp.z) : k.heading
      let d = want - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d))
      g.rotation.y += d * 0.15
    } else {
      const spot = ['exterior', 'outro'].includes(useGame.getState().mode) ? SPOT.exterior : SPOT.inside
      g.position.copy(spot.pos)
      g.position.y += spot.s * 0.95 + hop * 0.5 * spot.s
      g.scale.setScalar(spot.s)
      // face the camera (yaw only), with a little sway
      tmp.copy(camera.position).sub(g.position)
      g.rotation.y = Math.atan2(tmp.x, tmp.z) + Math.sin(t * 0.9) * 0.12
    }
    m.update(t)
  })
  return <group ref={ref}><primitive object={m.group} /></group>
}
