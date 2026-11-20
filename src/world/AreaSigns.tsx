import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { STREET as S } from './streetLayout'
import { AREAS, isOpen, whyClosed } from '../systems/unlocks'
import { bubbleShows, setShown } from '../systems/bubbles'
import { mat } from './mats'

// A signpost at each town road: the town's name, and (while it's closed) why and what opens it. No invisible walls.
const ROAD_Z = (S.padA[0] + S.padB[1]) / 2
function Sign({ id, x }: { id: string; x: number }) {
  const a = AREAS.find((r) => r.id === id)!, ref = useRef<HTMLDivElement>(null)
  useFrame(({ camera }) => setShown(ref.current, bubbleShows(camera, x, ROAD_Z, 30)))
  return (
    <group position={[x, 0, ROAD_Z + 4.5]}>
      <mesh position={[0, 1.4, 0]} material={mat('#5e2a75')}><cylinderGeometry args={[0.1, 0.12, 2.8, 8]} /></mesh>
      <Html position={[0, 3.1, 0]} center zIndexRange={[18, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={ref} className="areasign"><b>{a.icon} {a.name}</b>{!isOpen(id) && <small>{whyClosed(id)}</small>}</div>
      </Html>
    </group>
  )
}
export function AreaSigns() { return <group><Sign id="hollow" x={-(S.X - 2)} /><Sign id="notebook" x={S.X - 2} /></group> }
