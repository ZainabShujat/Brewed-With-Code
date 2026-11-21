import { useEffect, useState } from 'react'
import { objective } from '../systems/objective'
import { Cup, Bowl, CakeIcon } from './icons'

// The goal line: one sentence at the top of the screen saying what to do next (with the pink arrow in the world
// showing where). On foot only: the stations have their own step-by-step guides.
const DoorIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><path d="M8 28 V8 a8 8 0 0 1 16 0 V28z" fill="#7a4a8c" stroke="#3d1846" strokeWidth="1.6" /><circle cx="20" cy="18" r="1.6" fill="#f7c948" /></svg>
const ICON: Record<string, (p: { size?: number }) => JSX.Element> = { cup: Cup, bowl: Bowl, cake: CakeIcon, door: DoorIcon }
export function GoalLine() {
  const [o, setO] = useState(objective())
  useEffect(() => { const id = setInterval(() => setO((p) => { const n = objective(); return n.text === p.text ? p : n }), 300); return () => clearInterval(id) }, [])
  const I = ICON[o.icon] ?? Cup
  return <div className="goalline" key={o.text}><I size={22} /><span>{o.text}</span></div>
}
