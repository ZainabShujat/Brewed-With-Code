import { useEffect, useState } from 'react'
import { useShop } from '../systems/shop'
import { cafe } from '../world/Customers'
import { CAP, SHOT_ML, filled } from '../data/recipes'
import { drinkSvg } from './drinkSvg'
import { nextStep, orderSteps, STEP_LABEL } from '../systems/targets'
import { useTutorial } from '../systems/tutorial'
import { hoverTip } from '../systems/drag'
import { useGuide } from '../systems/guide'

// The coffee bar's HUD for making drinks by hand: the order ticket, a live recipe card that ticks itself off as you
// work, a hint for what to do next, and the result when you serve. No meters: the objects are the meters
// (the shot glass line, the foam in the pitcher, the level in your glass).
const picCache = new Map<string, string>()
const picFor = (w: Parameters<typeof drinkSvg>[0]) => { const k = JSON.stringify(w); let v = picCache.get(k); if (!v) { v = drinkSvg(w, 150); picCache.set(k, v) } return v }
export function RecipeCard() {
  // read on our own 4×/s tick, NOT as a subscription: steaming / pouring update the shop every frame, and re-rendering
  // this card (and its drink picture) 60×/s froze the game at the milk steps
  const s = useShop.getState()
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
  const step = nextStep(), next = s.hint || step.text
  const steps = orderSteps(), at = steps.indexOf(step.id)
  // HOLD / DRAG / LET GO stand out, so you know at a glance which kind of move it is
  const words = next.split(/(HOLD|DRAG|LET GO)/).map((t, i) => (t === 'HOLD' || t === 'DRAG' || t === 'LET GO') ? <b key={i} className={'verb v-' + t.replace(' ', '').toLowerCase()}>{t === 'HOLD' ? '👆 hold' : t === 'DRAG' ? '✋ drag' : 'let go'}</b> : t)
  const tutOn = useTutorial((t) => t.lesson < 2), guide = useGuide()

  const fresh = s.last && performance.now() / 1000 - s.last.t < 2.5
  const cheering = s.cheer && performance.now() / 1000 - s.cheer.t < 1.3
  return (
    <>
      <div className="ticket">
        <div className="tk-h">order</div>
        {order ? <><div className="cc-pic" dangerouslySetInnerHTML={{ __html: picFor(order.want) }} /><div className="cc-name">{order.label}</div></>
          : <div className="tk-note">{cafe.line.size ? 'customer walking up…' : 'waiting for customers…'}</div>}
        {rows.length > 0 && (
          <div className="recipe">
            {rows.map((r) => <div key={r.label} className={'rc-row' + (r.ok ? ' ok' : '')}><i>{r.ok ? '✓' : '○'}</i>{r.label}{!r.ok && r.now ? <em> · now {r.now}</em> : null}</div>)}
            {s.cup && <div className="rc-fill"><b style={{ width: `${Math.min(100, fill * 100)}%` }} className={fill > 1 ? 'over' : fill >= 0.75 ? 'good' : ''} /><span>glass {Math.round(fill * 100)}%</span></div>}
          </div>
        )}
      </div>
      <div className="coins">💰 {s.coins} · served {s.served}</div>
      {!tutOn && <button className="guidetoggle" onClick={guide.toggle} title="step-by-step help at the bar">🎓 guide {guide.on ? 'on' : 'off'}</button>}{/* from the 3rd order (after Kozie's two), guidance is optional */}
      <div className={'brew-next' + (ready ? ' ready' : '')} style={!tutOn && !guide.on ? { display: 'none' } : undefined}>
        {at >= 0 && <div className="stepbar"><b style={{ width: `${(at / Math.max(1, steps.length - 1)) * 100}%` }} /></div>}
        {!tutOn && <div className="brew-say">{at >= 0 && <em>step {at + 1} of {steps.length} · </em>}{words}</div>}
        {!tutOn && hoverTip.text && <div className="brew-tip">👆 {hoverTip.text}</div>}
      </div>
      {fresh && s.last && (
        <div className="brewpop" key={s.last.t}>
          {s.last.mood} {s.last.pct}% right · +{s.last.coins}💰
          {s.last.stations && <div className="stars">{(['brew', 'milk', 'finish', 'service'] as const).map((k) => { const v = s.last!.stations![k]; return v === null ? null :
            <span key={k}><small>{k}</small>{'★'.repeat(v)}{'☆'.repeat(3 - v)}</span> })}</div>}
        </div>
      )}
      {cheering && s.cheer && <div className={'cheer' + (s.cheer.good ? '' : ' off')} key={s.cheer.t}>{s.cheer.text}</div>}
      {s.cup && <button className="brew-bin" onClick={() => s.trash()} title="bin this glass and start again">🗑 start over</button>}
    </>
  )
}
