import { useEffect, useRef, useState } from 'react'
import { cafe } from '../world/Customers'
import { useShop } from '../systems/shop'
import { useDay } from '../systems/day'
import { useGame } from '../systems/store'
import { useTutorial } from '../systems/tutorial'
import { sfx } from '../systems/sound'
import { TOUCH } from '../systems/CameraRig'
import { lastFoot } from './ViewBar'
import { currentAct } from './Interact'

// A real café: while it's open you're free to walk around. When someone reaches the counter a bell rings and a
// "Take order" button comes up (or press E); taking it walks you to the right station (bar or cake bench).
// Once they're served and nobody else is waiting, you're back on your feet.
const front = () => { const f = cafe.line.peek(); return f && f.phase === 'line' ? f : undefined }
export const frontOrder = () => { const f = front(); return f ? useShop.getState().orders[f.id] : undefined }

export function takeOrder() {
  const o = frontOrder(); if (!o) return
  useGame.getState().setMode(o.cake ? 'cake' : 'pov')
}
/** boxing a cake at the bench serves the cake customer at the front */
export function serveCake() {
  const f = front(), s = useShop.getState(), o = f && s.orders[f.id]
  if (!f || !o?.cake) return
  const orders = { ...s.orders }; delete orders[f.id]
  cafe.serve(); useDay.getState().record('served'); useDay.getState().record('cakes')
  useShop.setState({ orders, served: s.served + 1 })
}

export function TakeOrder() {
  const mode = useGame((s) => s.mode), phase = useDay((s) => s.phase)
  const [, tick] = useState(0), rang = useRef(-1)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  const f = front(), o = frontOrder(), atStation = mode === 'pov' || mode === 'cake'
  // the bell, once per customer
  useEffect(() => { if (f && o && rang.current !== f.id) { rang.current = f.id; if (!atStation) sfx.bell() } })
  if (atStation || !o || (phase !== 'open' && phase !== 'closing') || currentAct()) return null
  return (
    <button className="takeorder" onClick={takeOrder}>
      <span className="to-bell">🔔</span>
      <span><b>Take order</b><small>{o.label} · {TOUCH ? 'tap to brew' : 'press E'}</small></span>
    </button>
  )
}

// after serving you STAY at the station (being thrown back into Explore after every order was annoying, 19 Nov);
// when nobody is waiting, a button lets you step away whenever you like
export function ServeReturn() {
  const mode = useGame((g) => g.mode), phase = useDay((d) => d.phase), lesson = useTutorial((t) => t.lesson)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 400); return () => clearInterval(id) }, [])
  const atStation = mode === 'pov' || mode === 'cake', s = useShop.getState()
  if (!atStation || frontOrder() || lesson < 2 || s.cup) return null
  return <button className="stepaway" onClick={() => useGame.getState().setMode(lastFoot)}>🚶 walk around<small>{phase === 'open' ? 'the bell rings when someone comes' : ''}</small></button>
}
