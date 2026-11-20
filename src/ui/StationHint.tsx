import { useEffect, useState } from 'react'
import { useGame } from '../systems/store'
import { stationAt, TOUCH } from '../systems/CameraRig'

// On foot at the bar or the cake bench: say how to step in (a click, a tap or E), so nobody needs to find Escape.
export function StationHint() {
  const mode = useGame((g) => g.mode), [st, setSt] = useState<'' | 'pov' | 'cake'>('')
  useEffect(() => { const id = setInterval(() => setSt(stationAt()), 250); return () => clearInterval(id) }, [])
  if (!st || (mode !== 'walk' && mode !== 'fp')) return null
  return <div className="stationhint">{st === 'pov' ? '☕' : '🎂'} {TOUCH ? 'tap' : 'click'} to {st === 'pov' ? 'make coffee' : 'bake cakes'}</div>
}
