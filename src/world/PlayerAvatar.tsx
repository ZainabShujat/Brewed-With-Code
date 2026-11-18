import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { makeMascot3D } from './kozie/notey3d.js'
import { useGame } from '../systems/store'
import { useAvatar, avatarSpec, displayName, type Avatar } from '../systems/avatar'
import { Townsperson, type Pose } from './folk/Townsperson'

// You, in the world: Kozie (the notebook from the reels) or the character you made, walking where you walk,
// with your name above your head. Shown in Explore (third person) and in the Dollhouse.
const FOLK_SCALE = 1.5

export function KozieBody({ walking }: { walking: () => boolean }) {
  const m = useMemo(() => { const k = makeMascot3D(THREE, { RoundedBoxGeometry }); k.pencil.visible = true; k.group.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true }); k.pose('idle'); return k }, [])
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, w = walking(), s = 0.82
    if (g.current) { g.current.position.y = s * 0.95 + (w ? Math.abs(Math.sin(t * 9)) * 0.08 : 0); g.current.rotation.z = w ? Math.sin(t * 9) * 0.08 : 0; g.current.scale.setScalar(s) }
    m.update(t)
  })
  return <group ref={g}><primitive object={m.group} /></group>
}

export function AvatarBody({ a, walking }: { a: Avatar; walking: () => boolean }) {
  const spec = useMemo(() => avatarSpec(a), [a.kind, a.model, a.colour, a.faceSeed]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!spec) return <KozieBody walking={walking} />
  const pose = (): Pose => (walking() ? 'walk' : 'wait')
  return <group scale={FOLK_SCALE}><Townsperson key={`${a.kind}${a.model}${a.colour}${a.faceSeed}`} spec={spec} getPose={pose} /></group>
}

export function PlayerAvatar() {
  const a = useAvatar()
  const ref = useRef<THREE.Group>(null)
  const walking = () => !!useGame.getState().player.moving
  useFrame(() => {
    const p = useGame.getState().player, g = ref.current; if (!g) return
    g.position.set(p.x, 0, p.z)
    // face where you're walking (Kozie's model faces +z like the townsfolk)
    let d = p.facing - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * 0.25
  })
  return (
    <group ref={ref}>
      <AvatarBody a={a} walking={walking} />
      <Html zIndexRange={[19, 0]} position={[0, 3.0, 0]} center distanceFactor={12}><div className="nametag">{displayName(a)}</div></Html>
    </group>
  )
}
