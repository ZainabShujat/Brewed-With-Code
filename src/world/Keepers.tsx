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

export function Keepers() {
  return (
    <group>
      {KEEPER_SHOPS.map((sh) => {
        const k = KEEPERS[sh.kind]!, [x, z, face] = keeperPos(sh)
        return (
          <group key={sh.kind} position={[x, 0, z]} rotation={[0, face, 0]}>
            <group scale={1.65}><Townsperson spec={k.spec} pose="wait" phase={x} /></group>
            <Html zIndexRange={[19, 0]} position={[0, 3.5, 0]} center distanceFactor={14}><div className="nametag keeper">{sh.icon} {k.name}</div></Html>
          </group>
        )
      })}
    </group>
  )
}
