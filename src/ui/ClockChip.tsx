import { useEffect, useState } from 'react'
import { hourNow, fmtHour, useClock } from '../systems/clock'

// The time in the café, next to the music button: ☀️ 9:30 am / 🌅 / 🌙. Click it to switch game time ↔ your real clock.
export function ClockChip() {
  const real = useClock((s) => s.real)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(id) }, [])
  const h = hourNow()
  const icon = h < 5.5 || h >= 20.5 ? '🌙' : h < 7.5 ? '🌅' : h >= 17 ? '🌇' : '☀️'
  return (
    <button className={'clockchip' + (location.search.includes('snap') ? ' corner' : '')} title={real ? 'following your clock (click for game time)' : '1 minute = 1 hour (click to follow your clock)'}
      onClick={() => useClock.getState().setReal(!real)}>{icon} {fmtHour(h)}{real && <i> · real</i>}</button>
  )
}
