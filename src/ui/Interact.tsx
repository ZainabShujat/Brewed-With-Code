import { useEffect, useState } from 'react'
import { useGame, onFoot } from '../systems/store'
import { useDay } from '../systems/day'
import { useShop } from '../systems/shop'
import { cafe, dirty } from '../world/Customers'
import { sfx } from '../systems/sound'
import { TOUCH } from '../systems/CameraRig'
import { frontOrder, takeOrder } from './TakeOrder'

// One key for doing things on your feet: E. Whatever you're standing next to wins: the door sign (open up in the
// morning, close up at night), an empty cup on a table, a guest asking for a refill. Otherwise E takes the order.
type Act = { label: string; run: () => void }
const near = (x: number, z: number, r: number) => { const p = useGame.getState().player; return Math.hypot(p.x - x, p.z - z) < r }
const tip = (n: number) => { useShop.setState((s) => ({ coins: s.coins + n })); useDay.getState().record('tips', n) }
export function currentAct(): Act | null {
  const g = useGame.getState(); if (!onFoot(g.mode)) return null
  const d = useDay.getState()
  if (near(0, 12.2, 2.8)) {
    if (d.phase === 'idle') return { label: 'flip the sign to OPEN', run: () => { useShop.getState().openShop(true); d.start(); cafe.seed(2); cafe._spawnT = cafe.spawnEvery - 6; sfx.bell() } }
    if (d.phase === 'closing' && cafe.line.size === 0) return { label: 'flip the sign to CLOSED', run: () => { useShop.getState().openShop(false); d.closeUp(); sfx.tap() } }
  }
  if (d.phase === 'open' || d.phase === 'closing') {
    const g2 = cafe.pool.find((c) => c.phase === 'sit' && c.refill === 'ask' && near(c.pos.x, c.pos.z, 2.4))
    if (g2) return { label: 'top up their coffee ☕', run: () => { g2.refill = 'done'; g2.thankT = 3; tip(2); sfx.tap() } }
  }
  const i = dirty.findIndex((c) => near(c.x, c.z, 2.0))
  if (i >= 0) return { label: 'clear the empty cup', run: () => { dirty.splice(i, 1); tip(1); sfx.tap() } }
  return null
}
export function Interact() {
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(id) }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return // typing a name, not doing things
      const a = currentAct(); if (a) { a.run(); return }
      if (onFoot(useGame.getState().mode) && frontOrder()) takeOrder()
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  const a = currentAct()
  if (!a) return null
  return TOUCH ? (
    <button className="wd-prompt touch-interact" onClick={a.run}>
      👆 tap to {a.label}
    </button>
  ) : (
    <div className="wd-prompt">press <b>E</b> to {a.label}</div>
  )
}
