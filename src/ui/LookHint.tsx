import { useState } from 'react'
import { view, setSens } from '../systems/CameraRig'

// bottom-left: how to look around + a mouse sensitivity slider
export function LookHint({ mode }: { mode: string }) {
  const [sens, set] = useState(view.sens)
  const how = mode === 'dollhouse' ? 'drag to spin the café · scroll to zoom'
    : mode === 'walk' ? 'click to look with the mouse (Esc to stop) · WASD to walk'
    : mode === 'pov' ? 'hold right-click + move mouse to look · A / D to step along the bar'
    : mode === 'cake' ? 'hold right-click + move mouse to look' : 'scroll to zoom'
  return (
    <div className="lookhint">
      <div>{how}</div>
      {mode !== 'dollhouse' && mode !== 'exterior' && (
        <label>mouse sensitivity <input type="range" min={0.3} max={3} step={0.1} value={sens} onChange={(e) => { const v = Number(e.target.value); set(v); setSens(v) }} /></label>
      )}
    </div>
  )
}
