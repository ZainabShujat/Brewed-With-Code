import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useGame } from '../systems/store'
import { useDay } from '../systems/day'
import { cafe } from '../world/Customers'
import { TABLES } from '../world/layout'
import { sfx } from '../systems/sound'

// Winding down after closing: you walk the quiet café, a couple of regulars linger over their last cup, and a few
// small, optional things glow: flip the sign, wipe a table, say goodnight, step out for some air. No score, no clock.
// "Start Day N+1" (or Next day) ends it.
type Chore = { id: string; label: string; done: string; near: (x: number, z: number) => boolean }
const CHORES: Chore[] = [
  { id: 'sign', label: 'flip the door sign to Closed', done: 'Closed for tonight. 🌙', near: (x, z) => Math.hypot(x, z - 12.4) < 2.4 },
  { id: 'wipe', label: 'wipe down a table', done: 'Sparkly clean ✨', near: (x, z) => TABLES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 2.6) },
  { id: 'bye', label: 'say goodnight to a regular', done: '"Night! See you tomorrow ☕"', near: (x, z) => cafe.pool.some((c) => c.phase === 'sit' && Math.hypot(c.pos.x - x, c.pos.z - z) < 2.6) },
  { id: 'air', label: 'step outside for some air', done: 'The lid lights look lovely from out here.', near: (_x, z) => z > 16 },
]
type Wind = { on: boolean; done: string[]; say: string; sayT: number }
export const useWind = create<Wind>(() => ({ on: false, done: [], say: '', sayT: 0 }))

export function windDown() {
  useWind.setState({ on: true, done: [], say: 'Lovely day. Take a breath, have a little wander. 🌙', sayT: performance.now() })
  cafe.seed(2) // a couple of regulars linger over their last cup
  useGame.getState().setMode('walk')
}
function endWind() { useWind.setState({ on: false }); useDay.getState().next(); sfx.tap() }

export function WindDown() {
  const w = useWind(), day = useDay((s) => s.day)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(id) }, [])
  const p = useGame.getState().player
  const here = w.on ? CHORES.find((c) => !w.done.includes(c.id) && c.near(p.x, p.z)) : undefined
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      const st = useWind.getState(); if (!st.on) return
      const pl = useGame.getState().player, c = CHORES.find((c) => !st.done.includes(c.id) && c.near(pl.x, pl.z)); if (!c) return
      sfx.tap(); useWind.setState({ done: [...st.done, c.id], say: c.done, sayT: performance.now() })
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  if (!w.on) return null
  const talking = performance.now() - w.sayT < 4000
  return (
    <>
      <div className="wind">
        <div className="wd-h">🌙 Winding down</div>
        {CHORES.map((c) => <div key={c.id} className={'wd-row' + (w.done.includes(c.id) ? ' ok' : '')}><i>{w.done.includes(c.id) ? '✓' : '○'}</i>{c.label}</div>)}
        <button className="brew-go" onClick={endWind}>Start Day {day + 1} →</button>
      </div>
      {here && <div className="wd-prompt">press <b>E</b> to {here.label}</div>}
      {talking && <div className="wd-say" key={w.sayT}><b>Kozie</b>{w.say}</div>}
    </>
  )
}
