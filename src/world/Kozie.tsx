import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { makeMascot3D, type Mascot } from './kozie/notey3d.js'
import { useGame } from '../systems/store'

// Kozie on set: stands in the café (on the path outside, on the floor inside), turns to face the camera.
// The reel page drives talking/poses through window.cafe.kozie.
const SPOT = {
  exterior: { pos: new THREE.Vector3(-2.6, 0, 12.6), s: 1.4 }, // world outside is scaled 1.4x
  inside: { pos: new THREE.Vector3(4.3, 0.12, 4.6), s: 1.0 }, // same height as the barista
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
    const t = clock.elapsedTime
    if (kozieCtl.hopReq) { kozieCtl.hopT = t; kozieCtl.hopReq = false }
    const spot = useGame.getState().mode === 'exterior' ? SPOT.exterior : SPOT.inside
    const hop = Math.max(0, Math.sin(Math.min(1, (t - kozieCtl.hopT) / 0.45) * Math.PI))
    g.position.copy(spot.pos)
    g.position.y += spot.s * 0.95 + hop * 0.5 * spot.s
    g.scale.setScalar(spot.s)
    // face the camera (yaw only), with a little sway
    tmp.copy(camera.position).sub(g.position)
    g.rotation.y = Math.atan2(tmp.x, tmp.z) + Math.sin(t * 0.9) * 0.12
    m.update(t)
  })
  return <group ref={ref}><primitive object={m.group} /></group>
}
