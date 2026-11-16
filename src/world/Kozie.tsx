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
  const costume = useRef<THREE.Group>(null), cape = useRef<THREE.Group>(null), brows = useRef<THREE.Group>(null)
  useFrame(() => {
    const v = anim.villain, f = v.fall
    if (costume.current) costume.current.visible = v.on
    // the disguise falls apart: cape drops and flops, brows slide off and tumble
    if (cape.current) { cape.current.position.y = -f * f * 2.2; cape.current.rotation.x = f * 1.3; cape.current.rotation.z = f * 0.6 }
    if (brows.current) { brows.current.position.y = 0.32 - f * 1.6; brows.current.position.x = f * 0.5; brows.current.rotation.z = f * 3 }
  })
  return (
    <>
      <group ref={ref}>
        <primitive object={m.group} />
        {/* villain disguise (hidden unless a reel turns it on) */}
        <group ref={costume} visible={false}>
          <group ref={cape}>
            <mesh position={[0, -0.05, -0.2]} rotation={[0.08, 0, 0]}><boxGeometry args={[1.5, 1.9, 0.04]} /><meshStandardMaterial color="#1c0f24" roughness={0.6} /></mesh>
            <mesh position={[0, -0.05, -0.17]} rotation={[0.08, 0, 0]}><boxGeometry args={[1.38, 1.8, 0.02]} /><meshStandardMaterial color="#9b1430" roughness={0.4} /></mesh>
            {/* tall pointy collar */}
            {[-1, 1].map((k) => <mesh key={k} position={[k * 0.55, 0.95, -0.12]} rotation={[0.25, k * 0.35, k * -0.35]}><boxGeometry args={[0.45, 0.6, 0.03]} /><meshStandardMaterial color="#1c0f24" /></mesh>)}
          </group>
          <group ref={brows} position={[0, 0.32, 0.2]}>
            {[-1, 1].map((k) => <mesh key={k} position={[k * 0.2, 0, 0]} rotation={[0, 0, k * -0.45]}><boxGeometry args={[0.26, 0.06, 0.05]} /><meshStandardMaterial color="#1a0d10" /></mesh>)}
          </group>
        </group>
      </group>
      <VillainChair />
    </>
  )
}

// a huge wingback villain chair that can spin (and fling whoever's in it)
function VillainChair() {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { const v = anim.villain; if (!g.current) return; g.current.visible = v.chair; g.current.position.copy(v.chairPos); g.current.rotation.y = v.chairSpin; g.current.scale.setScalar(1.5) }) // a proper throne: Kozie fits in it
  const red = <meshStandardMaterial color="#7a0f22" roughness={0.55} />, gold = <meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} />
  return (
    <group ref={g} visible={false}>
      <mesh position={[0, 0.55, 0]}>{<boxGeometry args={[1.5, 0.35, 1.2]} />}{red}</mesh>
      <mesh position={[0, 1.55, -0.55]}><boxGeometry args={[1.5, 2.1, 0.3]} />{red}</mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[k * 0.82, 1.0, -0.15]}><boxGeometry args={[0.2, 0.8, 1.1]} />{red}</mesh>)}
      {[-1, 1].map((k) => <mesh key={k} position={[k * 0.9, 2.45, -0.5]} rotation={[0, 0, k * -0.5]}><boxGeometry args={[0.5, 0.7, 0.32]} />{red}</mesh>)}
      <mesh position={[0, 2.68, -0.55]}><sphereGeometry args={[0.12, 12, 8]} />{gold}</mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.08, 0.08, 0.4, 10]} />{gold}</mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.6, 0.6, 0.04, 20]} />{gold}</mesh>
    </group>
  )
}
