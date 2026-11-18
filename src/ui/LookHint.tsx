import { useState } from 'react'
import { view, setSens } from '../systems/CameraRig'

// bottom-left: how to look around + a mouse sensitivity slider
export function LookHint({ mode }: { mode: string }) {
  const [sens, set] = useState(view.sens)
  const how = mode === 'dollhouse' ? 'drag to move around · right-drag or Q / E to turn · scroll to zoom · click a station to work there'
    : mode === 'walk' || mode === 'fp' ? 'drag or ← → to look around · WASD to walk · Shift to run · E to do things · in a shop: T to chat, F to buy'
    : mode === 'pov' ? 'scroll to zoom in / out · hold ↑ (or right-drag) to look up at customers · drag tools onto your glass'
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
