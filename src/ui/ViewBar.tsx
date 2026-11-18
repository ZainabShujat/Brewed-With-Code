import { useGame, type CamMode } from '../systems/store'

// Three ways to look at your café, any time (even mid-day): Explore (third person), First person (your own eyes)
// and the Dollhouse. The camera glides between them. At a station (the bar, the cake bench) there's no bar here:
// you got there by taking an order, and you leave by serving it.
const VIEWS: { id: CamMode; icon: string; label: string; key: string }[] = [
  { id: 'walk', icon: '🚶', label: 'Explore', key: '1' },
  { id: 'fp', icon: '👁', label: 'First person', key: '2' },
  { id: 'dollhouse', icon: '🏠', label: 'Dollhouse', key: '3' },
]
export let lastFoot: CamMode = 'walk' // where serving a drink brings you back to
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => {
  const g = useGame.getState(); if (!VIEWS.some((v) => v.id === g.mode)) return
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return
  const v = VIEWS.find((v) => v.key === e.key); if (v) { if (v.id !== 'dollhouse') lastFoot = v.id; g.setMode(v.id) }
})
export function ViewBar() {
  const mode = useGame((s) => s.mode), setMode = useGame((s) => s.setMode)
  if (!VIEWS.some((v) => v.id === mode)) return null
  return (
    <div className="viewbar">
      {VIEWS.map((v) => <button key={v.id} className={v.id === mode ? 'on' : ''} onClick={() => { if (v.id !== 'dollhouse') lastFoot = v.id; setMode(v.id) }}>
        <span className="vb-i">{v.icon}</span>{v.label}<kbd>{v.key}</kbd></button>)}
    </div>
  )
}
