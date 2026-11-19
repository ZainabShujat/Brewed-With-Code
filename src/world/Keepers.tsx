import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { bubbleShows, setShown } from '../systems/bubbles'
import { Html } from '@react-three/drei'
import { KEEPERS } from '../data/shopkeepers'
import { SHOPS, keeperSpot, shopDoor, type Shop } from './streetLayout'
import { Townsperson } from './folk/Townsperson'

// The six shopkeepers: behind the counter in the four ingredient shops, out by the door at the bookshop and the
// florist. A touch bigger than everyone else, with their name over their head. Walk up and press T to chat.
export function keeperPos(sh: Shop): [number, number, number] {
  if (sh.store) { const [x, z] = keeperSpot(sh); return [x, z, sh.side === 'a' ? 0 : Math.PI] }
  const [x, z] = shopDoor(sh), off = sh.side === 'a' ? -1.5 : 1.5
  return [x + off, z, sh.side === 'a' ? 0 : Math.PI]
}
export const KEEPER_SHOPS = SHOPS.filter((s) => KEEPERS[s.kind])

// the name over each shopkeeper: only near them and never from inside the café (it showed through every wall)
function KeeperTag({ x, z, text }: { x: number; z: number; text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useFrame(({ camera }) => setShown(ref.current, bubbleShows(camera, x, z, 18)))
  return <Html zIndexRange={[19, 0]} position={[0, 4.4, 0]} center distanceFactor={14}><div ref={ref} className="nametag keeper">{text}</div></Html>
}
export function Keepers() {
  return (
    <group>
      {KEEPER_SHOPS.map((sh) => {
        const k = KEEPERS[sh.kind]!, [x, z, face] = keeperPos(sh)
        return (
          <group key={sh.kind} position={[x, 0, z]} rotation={[0, face, 0]}>
            <group scale={2.1}><Townsperson spec={k.spec} pose="wait" phase={x} /></group>
            <KeeperTag x={x} z={z} text={`${sh.icon} ${k.name}`} />
          </group>
        )
      })}
    </group>
  )
}
