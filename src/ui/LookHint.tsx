import { useState } from 'react'
import { view, setSens } from '../systems/CameraRig'

// Controls, folded away: a small 🎮 chip in the corner. Click it for the full list + mouse sensitivity.
// (Kozie's tour teaches the basics, so this is only for when you forget.)
export function LookHint({ mode }: { mode: string }) {
  const [sens, set] = useState(view.sens), [open, setOpen] = useState(false)
  const how = mode === 'dollhouse' ? ['drag: move around', 'right-drag or Q / E: turn', 'scroll: zoom']
    : mode === 'walk' || mode === 'fp' ? ['drag or ← →: look around', 'W A S D: walk · Shift: run', 'E: do things (open up, take orders…)', '1 / 2 / 3: views', 'in a shop: T to chat, F to buy']
    : mode === 'pov' ? ['drag tools onto your glass', 'hold the machine / milk / wand', 'scroll: zoom · hold ↑: look up']
    : mode === 'cake' ? ['hold right-click + move: look'] : ['scroll: zoom']
  if (!open) return <button className="lookchip" onClick={() => setOpen(true)} title="controls">🎮</button>
  return (
    <div className="lookhint" onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') setOpen(false) }}>
      {how.map((h) => <div key={h}>{h}</div>)}
      {mode !== 'dollhouse' && mode !== 'exterior' && (
        <label>mouse sensitivity <input type="range" min={0.3} max={3} step={0.1} value={sens} onChange={(e) => { const v = Number(e.target.value); set(v); setSens(v) }} /></label>
      )}
      <small>click to close</small>
    </div>
  )
}
