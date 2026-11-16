import { Html } from '@react-three/drei'
import { useGame, type CamMode } from '../systems/store'
import { useShop } from '../systems/shop'
import { BACK_DZ, COUNTER } from './layout'

// Dollhouse view: little floating signs over each station. Click one and the camera glides in
// (the rig eases between shots) and you're working there.
const SPOTS: { id: CamMode; label: string; at: [number, number, number] }[] = [
  { id: 'pov', label: '☕ Coffee bar', at: [0.4, 2.6, BACK_DZ + COUNTER.z] },
  { id: 'cake', label: '🎂 Cake bench', at: [-7.0, 2.8, -9.0] },
  { id: 'walk', label: '🚶 Walk in', at: [0, 1.6, 8.6] },
]

export function Hotspots() {
  const mode = useGame((s) => s.mode), setMode = useGame((s) => s.setMode)
  if (mode !== 'dollhouse') return null
  return (
    <>
      {SPOTS.map((s) => (
        <Html key={s.id} position={s.at} center zIndexRange={[20, 0]}>
          <button className="hotspot" onClick={() => { if (s.id !== 'walk' && !useShop.getState().open) useShop.getState().openShop(true); setMode(s.id) }}>{s.label}</button>
        </Html>
      ))}
    </>
  )
}
