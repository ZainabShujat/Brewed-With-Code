import { useEffect, useState } from 'react'
import { useDay, DAY_LEN } from '../systems/day'
import { useShop } from '../systems/shop'
import { sfx } from '../systems/sound'
import { cafe } from '../world/Customers'
import { useGame } from '../systems/store'
import { useTutorial } from '../systems/tutorial'
import { windDown, useWind } from './WindDown'

// Top-centre day clock while the café is open, the "open for the day" button, and the results card.
export function DayHud() {
  const d = useDay()
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  useEffect(() => { if (d.phase === 'results') sfx.perfect() }, [d.phase])

  const winding = useWind((w) => w.on)
  if (winding) return null
  if (d.phase === 'idle') return (
    <div className="dayopen">
      <div className="dayno">Day {d.day}</div>
      <button className="brew-go" onClick={() => { useShop.getState().openShop(true); d.start(); sfx.bell(); cafe.seed(3); if (useTutorial.getState().lesson >= 2) useGame.getState().setMode('walk') }}>☕ Open the café</button>
      <div className="daybank">💰 {d.bank} saved · ⭐ {d.stars}</div>
    </div>
  )

  if (d.phase === 'results') {
    const t = d.today, total = t.coins + t.tips
    const stars = Math.min(3, Math.round(((t.perfect + 0.5) / Math.max(1, t.served + t.walkouts)) * 3))
    return (
      <div className="dayresults">
        <div className="card">
          <div className="h">Day {d.day} done!</div>
          <div className="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div className="rows">
            <div><span>Drinks served</span><b>{t.served}</b></div>
            <div><span>Cakes made</span><b>{t.cakes}</b></div>
            <div><span>Perfect orders</span><b>{t.perfect}</b></div>
            <div><span>Walked out</span><b>{t.walkouts}</b></div>
            <div><span>Earned</span><b>💰 {t.coins}</b></div>
            <div><span>Tips</span><b>💰 {t.tips}</b></div>
            <div className="tot"><span>Today</span><b>💰 {total}</b></div>
          </div>
          <div className="bank">Saved so far: 💰 {d.bank} · best day 💰 {d.best}</div>
          <div className="dr-btns"><button className="brew-go wd-btn" onClick={() => { windDown(); sfx.tap() }}>🌙 Wind down</button><button className="brew-go" onClick={() => { d.next(); sfx.tap() }}>Next day →</button></div>
        </div>
      </div>
    )
  }

  const m = Math.floor(d.left / 60), s = Math.floor(d.left % 60)
  return (
    <div className={'dayclock' + (d.phase === 'closing' ? ' closing' : d.left < 20 ? ' late' : '')}>
      <b>Day {d.day}</b> · {d.phase === 'closing' ? 'closing up… serve the last customers' : `${m}:${String(s).padStart(2, '0')}`}
      <i style={{ width: `${(d.left / DAY_LEN) * 100}%` }} />
    </div>
  )
}
