import { useEffect, useState } from 'react'
import { useShop } from '../systems/shop'
import { CAP, filled } from '../data/recipes'
import { want, shotTarget, coverage, STEAM_ZONES, STEAM_MAX } from '../systems/targets'

// While you hold something at the bar (pull a shot, fill the pitcher, steam, pour, shake), a ring follows your
// cursor and fills up as you go, with a tick where the order wants you to stop. Pure feedback: never blocks a click.
const C = 2 * Math.PI * 40
const EMBED = typeof location !== 'undefined' && location.search.includes('embed') // videos draw their own cursor + ring
export function HoldRing() {
  const s = useShop()
  const [pos, setPos] = useState<[number, number] | null>(null)
  const [, tick] = useState(0)
  useEffect(() => {
    const f = (e: PointerEvent) => setPos([e.clientX, e.clientY])
    window.addEventListener('pointermove', f); window.addEventListener('pointerdown', f)
    const id = setInterval(() => tick((n) => n + 1), 60)
    return () => { window.removeEventListener('pointermove', f); window.removeEventListener('pointerdown', f); clearInterval(id) }
  }, [])
  const w = want()
  let label = '', prog = 0, mark: number | null = null
  if (s.pulling) { const t = shotTarget() || 30; label = 'pull'; prog = s.shotGlass / (t * 1.25); mark = 1 / 1.25 }
  else if (s.steaming) { label = 'steam'; prog = s.pitcher.stretch / STEAM_MAX; if (w && w.milk !== 'none') mark = (STEAM_ZONES[w.milk][0] + STEAM_ZONES[w.milk][1]) / 2 / STEAM_MAX }
  else if (s.pouringMilk) { label = 'pour'; prog = s.cup ? filled(s.ml) / (CAP[s.drink.size] * 0.95) : 0; mark = 1 }
  else if (s.shaking) { label = 'shake'; prog = coverage(s.grains); mark = 0.6 }
  else if (s.filling) { label = 'fill'; prog = (s.pitcher.milk + s.pitcher.foam) / 360 }
  if (!label || !pos || EMBED) return null
  const p = Math.max(0, Math.min(1, prog)), a = mark === null ? 0 : mark * 2 * Math.PI - Math.PI / 2
  return (
    <div className="holdring" style={{ left: pos[0], top: pos[1] }}>
      <svg viewBox="0 0 96 96" width="96" height="96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(42,24,48,.45)" strokeWidth="10" />
        <circle cx="48" cy="48" r="40" fill="none" stroke={mark !== null && p >= mark - 0.04 ? '#8ee0a0' : '#f2c66a'} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 48 48)" />
        {mark !== null && <line x1={48 + Math.cos(a) * 30} y1={48 + Math.sin(a) * 30} x2={48 + Math.cos(a) * 50} y2={48 + Math.sin(a) * 50} stroke="#fff6ee" strokeWidth="5" strokeLinecap="round" />}
      </svg>
      <b>{label}</b>
    </div>
  )
}
