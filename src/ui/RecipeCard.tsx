import { useEffect, useState } from 'react'
import { useShop } from '../systems/shop'
import { cafe } from '../world/Customers'
import { CAP, SHOT_ML, filled } from '../data/recipes'
import { drinkSvg } from './drinkSvg'

// The coffee bar's HUD for making drinks by hand: the order ticket, a live recipe card that ticks itself off as you
// work, a hint for what to do next, and the result when you serve. No meters: the objects are the meters
// (the shot glass line, the foam in the pitcher, the level in your glass).
export function RecipeCard() {
  const s = useShop()
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  const front = cafe.line.peek(), order = front ? s.orders[front.id] : undefined, w = order?.want
  const d = s.drink, ml = s.ml
  const shotsNow = ml.espresso / SHOT_ML, fill = s.cup ? filled(ml) / CAP[d.size] : 0
  const p = s.pitcher, inPitcher = p.milk + p.foam

  type Row = { label: string; ok: boolean; now?: string }
  const rows: Row[] = w ? [
    { label: `${w.size} glass`, ok: s.cup && d.size === w.size, now: s.cup ? d.size : '—' },
    ...(w.chocolate ? [{ label: 'chocolate', ok: d.chocolate }] : []),
    { label: `${w.shots} shot${w.shots > 1 ? 's' : ''}`, ok: s.cup && d.shots === w.shots, now: `${shotsNow.toFixed(1)}` },
    ...(w.water ? [{ label: 'hot water', ok: d.water }] : []),
    ...(w.milk !== 'none' ? [{ label: `${w.milkType} milk, ${w.milk === 'micro' ? 'silky microfoam' : w.milk === 'foamy' ? 'lots of foam' : 'steamed'}`, ok: d.milk === w.milk && d.milkType === w.milkType, now: d.milk !== 'none' ? `${d.milkType} ${d.milk}` : undefined }] : []),
    ...(w.topping !== 'none' ? [{ label: w.topping, ok: d.topping === w.topping }] : []),
  ] : []
  const ready = rows.length > 0 && rows.every((r) => r.ok)

  // the next thing to do, in plain words (or why the last action did nothing)
  const next = !w ? (cafe.line.size ? 'a customer is walking up…' : 'waiting for customers…')
    : s.hint ? s.hint
    : !s.cup ? 'click a glass on the shelf, then the coaster'
    : w.chocolate && !d.chocolate ? 'chocolate first: click the bottle, then your glass'
    : d.shots < w.shots && s.shotGlass < 5 ? 'hold the espresso machine: let go when the shot glass reaches the line (one shot = one line)'
    : d.shots < w.shots ? 'click the shot glass, then your glass to pour it in'
    : w.water && !d.water ? 'click the kettle, then your glass'
    : w.milk !== 'none' && d.milk === 'none' && inPitcher < 20 ? `hold the ${w.milkType} milk bottle to fill the pitcher`
    : w.milk !== 'none' && d.milk === 'none' && p.at !== 'wand' && p.stretch === 0 ? 'click the pitcher, then the steam wand'
    : w.milk !== 'none' && d.milk === 'none' && p.at === 'wand' && p.stretch < 0.3 ? `hold the steam wand: ${w.milk === 'micro' ? 'just a moment, for silky microfoam' : w.milk === 'foamy' ? 'a good while, for lots of foam' : 'a little while, for steamed milk'}`
    : w.milk !== 'none' && fill < 0.75 ? 'click the pitcher, then HOLD over your glass to pour'
    : w.topping !== 'none' && d.topping === 'none' ? `click the ${w.topping}, then your glass`
    : 'pick up your glass and put it on the pass 🔔'

  const fresh = s.last && performance.now() / 1000 - s.last.t < 2.5
  return (
    <>
      <div className="ticket">
        <div className="tk-h">order</div>
        {order ? <><div className="cc-pic" dangerouslySetInnerHTML={{ __html: drinkSvg(order.want, 150) }} /><div className="cc-name">{order.label}</div></>
          : <div className="tk-note">{cafe.line.size ? 'customer walking up…' : 'waiting for customers…'}</div>}
        {rows.length > 0 && (
          <div className="recipe">
            {rows.map((r) => <div key={r.label} className={'rc-row' + (r.ok ? ' ok' : '')}><i>{r.ok ? '✓' : '○'}</i>{r.label}{!r.ok && r.now ? <em> · now {r.now}</em> : null}</div>)}
            {s.cup && <div className="rc-fill"><b style={{ width: `${Math.min(100, fill * 100)}%` }} className={fill > 1 ? 'over' : fill >= 0.75 ? 'good' : ''} /><span>glass {Math.round(fill * 100)}%</span></div>}
          </div>
        )}
      </div>
      <div className="coins">💰 {s.coins} · served {s.served}</div>
      <div className={'brew-next' + (ready ? ' ready' : '')}>{next}</div>
      {fresh && s.last && (
        <div className="brewpop" key={s.last.t}>
          {s.last.mood} {s.last.pct}% right{s.last.craft !== undefined ? ` · craft ${'★'.repeat(Math.round(s.last.craft * 3))}${'☆'.repeat(3 - Math.round(s.last.craft * 3))}` : ''} · +{s.last.coins}💰
        </div>
      )}
      {s.cup && <button className="brew-bin" onClick={() => s.trash()} title="bin this glass and start again">🗑 start over</button>}
    </>
  )
}
