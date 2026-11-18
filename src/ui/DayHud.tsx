import { useEffect, useState } from 'react'
import { useDay, DAY_LEN } from '../systems/day'
import { useShop } from '../systems/shop'
import { sfx } from '../systems/sound'
import { cafe } from '../world/Customers'
import { useGame, onFoot } from '../systems/store'
import { useTutorial } from '../systems/tutorial'
import { windDown, useWind } from './WindDown'
import { useNavTut } from './NavTutorial'
import { TOUCH } from '../systems/CameraRig'

// Top-centre day clock while the café is open, the "open for the day" button, and the results card.
export function DayHud() {
  const d = useDay()
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  useEffect(() => { if (d.phase === 'results') sfx.perfect() }, [d.phase])

  const winding = useWind((w) => w.on), navDone = useNavTut((t) => t.done), mode = useGame((s) => s.mode)
  if (winding) return null
  const pl = useGame.getState().player, nearDoor = Math.hypot(pl.x, pl.z - 12.2) < 2.8 // the door's own prompt says it
  if (d.phase === 'idle') return (
    <div className="dayopen">
      <div className="dayopen-top">
        <span className="dayno">Day {d.day}</span>
        <span className="daybank">💰 {d.bank} saved · ⭐ {d.stars}</span>
      </div>
      {navDone && !nearDoor && <div className="dayhint">
        🪧 the café is closed · {TOUCH ? 'walk to door & tap sign to OPEN' : <span>walk to the door and press <b>E</b> to flip the sign to OPEN</span>}
      </div>}
      {!onFoot(mode) && <button className="brew-go daygo-btn" onClick={() => { const g = useGame.getState(); g.setMode('walk'); Object.assign(g.player, { x: 0, z: 10.4, facing: 0 }) }}>🚪 go to the door</button>}
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
      <b>Day {d.day}</b> · {d.phase === 'closing' ? (cafe.line.size ? 'closing time · serve the last guests' : 'closing time · flip the door sign to CLOSED (E)') : `${m}:${String(s).padStart(2, '0')}`}
      <i style={{ width: `${(d.left / DAY_LEN) * 100}%` }} />
    </div>
  )
}
