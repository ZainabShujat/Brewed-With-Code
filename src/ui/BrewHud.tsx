import { useEffect, useRef, useState } from 'react'
import { useShop } from '../systems/shop'
import { cafe } from '../world/Customers'
import { loop, sfx } from '../systems/sound'
import type { Milk, MilkType } from '../data/recipes'
import { drinkSvg } from './drinkSvg'

// ── The coffee bar as a sequence of short, skill-based steps (Papa's-style stations) ─────────
// Grind → Pull the shot → Extras → Steam the milk → Pour → Top → Serve.
// Held steps use a meter: hold the button (or Space) and let go in the green zone.
// The camera glides to each part of the bar; every step gets 0–3 stars; nothing is a hard fail.

type Step = 'start' | 'cup' | 'grind' | 'shot' | 'extras' | 'milk' | 'pour' | 'top' | 'serve' | 'done'
const STEPS: Step[] = ['cup', 'grind', 'shot', 'extras', 'milk', 'pour', 'top', 'serve']
const LABEL: Record<Step, string> = { start: '', cup: 'Cup', grind: 'Grind', shot: 'Pull shot', extras: 'Extras', milk: 'Steam milk', pour: 'Pour', top: 'Top', serve: 'Serve', done: '' }

// a held meter: how fast it fills, and its green zone(s)
type Meter = { speed: number; zones: { from: number; to: number; label?: string; value?: string }[] }
const METERS: Partial<Record<Step, Meter>> = {
  grind: { speed: 0.45, zones: [{ from: 0.78, to: 0.95 }] },
  shot: { speed: 0.32, zones: [{ from: 0.62, to: 0.8 }] }, // ~25–30 s extraction, squeezed
  // the steam gauge: how far you take it decides the texture
  milk: { speed: 0.3, zones: [{ from: 0.28, to: 0.45, label: 'micro', value: 'micro' }, { from: 0.5, to: 0.68, label: 'steamed', value: 'steamed' }, { from: 0.72, to: 0.9, label: 'foamy', value: 'foamy' }] },
  pour: { speed: 0.4, zones: [{ from: 0.82, to: 0.94 }] },
}
const stars = (v: number, z: { from: number; to: number }) => {
  if (v >= z.from && v <= z.to) { const mid = (z.from + z.to) / 2, half = (z.to - z.from) / 2; return Math.abs(v - mid) < half * 0.45 ? 3 : 2 }
  return Math.abs(v - (v < z.from ? z.from : z.to)) < 0.08 ? 1 : 0
}

export function BrewHud() {
  const shop = useShop()
  const [step, setStep] = useState<Step>('start')
  const [val, setVal] = useState(0)
  const [holding, setHolding] = useState(false)
  const [score, setScore] = useState<Partial<Record<Step, number>>>({})
  const [pop, setPop] = useState<{ text: string; t: number } | null>(null)
  const [milkType, setMilkType] = useState<MilkType>('whole')
  const snd = useRef<ReturnType<typeof loop> | null>(null)
  const raf = useRef(0)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 300); return () => clearInterval(id) }, [])

  const front = cafe.line.peek()
  const order = front ? shop.orders[front.id] : undefined
  const want = order?.want

  // the cup step finishes when you actually pick a glass off the shelf and set it on the coaster
  const cupNow = shop.cup, size = shop.drink.size
  useEffect(() => { if (step === 'cup' && cupNow) { setScore((o) => ({ ...o, cup: want && want.size === size ? 3 : 0 })); sfx.tap(); setTimeout(() => setStep('grind'), 350) } }, [step, cupNow, size])

  const flash = (s: number) => { setPop({ text: s === 3 ? 'Perfect!' : s === 2 ? 'Nice' : s === 1 ? 'Close' : 'Oops', t: performance.now() }); (s === 3 ? sfx.perfect : s >= 2 ? sfx.good : sfx.meh)() }
  const next = (from: Step) => {
    const i = STEPS.indexOf(from) + 1 // ("no milk" jumps straight past steaming + pouring)
    setStep(STEPS[i] ?? 'done'); setVal(0)
  }

  // ── held meter ──
  const press = () => {
    const m = METERS[step]; if (!m || holding) return
    setHolding(true); setVal(0)
    snd.current = loop(step === 'grind' ? 'grind' : step === 'milk' ? 'steam' : step === 'pour' ? 'pour' : 'shot')
    if (step === 'pour') useShop.getState().milk(milkStyle.current)
    const t0 = performance.now()
    const run = () => { const v = Math.min(1.15, ((performance.now() - t0) / 1000) * m.speed); setVal(v); snd.current?.set(v); raf.current = requestAnimationFrame(run) }
    raf.current = requestAnimationFrame(run)
  }
  const milkStyle = useRef<Exclude<Milk, 'none'>>('steamed')
  const release = () => {
    if (!holding) return
    cancelAnimationFrame(raf.current); snd.current?.stop(); setHolding(false)
    const m = METERS[step]!; const v = val
    let s = 0
    if (step === 'milk') {
      // the zone you stopped in decides the milk texture; scored against the order
      const z = m.zones.find((z) => v >= z.from - 0.04 && v <= z.to + 0.04) ?? m.zones.reduce((a, b) => (Math.abs(v - (a.from + a.to) / 2) < Math.abs(v - (b.from + b.to) / 2) ? a : b))
      milkStyle.current = z.value as Exclude<Milk, 'none'>
      useShop.getState().pickMilk(milkType)
      s = stars(v, z); if (want && want.milk !== z.value) s = Math.min(s, 1)
    } else {
      s = stars(v, m.zones[0])
      if (step === 'shot') { const n = want?.shots ?? 2; for (let i = 0; i < n; i++) useShop.getState().shot() }
    }
    setScore((o) => ({ ...o, [step]: s })); flash(s)
    setTimeout(() => next(step), 650)
  }
  useEffect(() => {
    const d = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); press() } }
    const u = (e: KeyboardEvent) => { if (e.code === 'Space') release() }
    window.addEventListener('keydown', d); window.addEventListener('keyup', u)
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u) }
  })

  const begin = () => { useShop.getState().trash(); setScore({}); setMilkType('whole'); sfx.tap(); setStep('cup') }
  const skipMilk = () => { setScore((o) => ({ ...o, milk: want && want.milk !== 'none' ? 0 : 3 })); setStep('top') }
  const serve = () => {
    const st = Object.values(score); const avg = st.length ? st.reduce((a, b) => a + (b ?? 0), 0) / st.length : 0
    useShop.getState().serve(); sfx.bell(); setTimeout(sfx.coins, 350)
    setPop({ text: `${'★'.repeat(Math.round(avg))}${'☆'.repeat(3 - Math.round(avg))}`, t: performance.now() })
    setStep('start')
  }

  const fresh = pop && performance.now() - pop.t < 1100
  const m = METERS[step]
  const d = shop.drink
  return (
    <>
      {/* the ticket, pinned top-right */}
      <div className="ticket">
        <div className="tk-h">order</div>
        {order ? <><div className="cc-pic" dangerouslySetInnerHTML={{ __html: drinkSvg(order.want, 150) }} /><div className="cc-name">{order.label}</div><div className="tk-note">{order.recipe?.note}</div></>
          : <div className="tk-note">{cafe.line.size ? 'customer walking up…' : 'waiting for customers…'}</div>}
        {step !== 'start' && <div className="tk-steps">{STEPS.map((s) => <span key={s} className={s === step ? 'on' : score[s] !== undefined ? 'done' : ''}>{LABEL[s]}{score[s] !== undefined ? ' ' + '★'.repeat(score[s]!) : ''}</span>)}</div>}
      </div>
      <div className="coins">💰 {shop.coins} · served {shop.served}</div>
      {fresh && <div className="brewpop" key={pop!.t}>{pop!.text}</div>}

      <div className="brew">
        {step === 'start' && (order
          ? <button className="brew-go" onClick={begin}>Start this order ☕</button>
          : <div className="brew-wait">Waiting for the next customer…</div>)}

        {m && (
          <>
            <div className="brew-title">{step === 'grind' ? 'Hold to grind: stop when the basket is full' : step === 'shot' ? `Hold to pull ${want?.shots ?? 2} shots: let go in the green` : step === 'milk' ? `Hold to steam ${milkType} milk: stop in the right zone (${want?.milk === 'none' ? 'no milk needed' : want?.milk})` : 'Hold to pour: stop at the line'}</div>
            {step === 'milk' && !holding && val === 0 && (
              <div className="brew-row">{(['whole', 'oat', 'almond'] as const).map((t) => <button key={t} className={'chip' + (milkType === t ? ' on' : '')} onClick={() => { setMilkType(t); sfx.tap() }}>{t}</button>)}
                <button className="chip ghost" onClick={skipMilk}>no milk</button></div>
            )}
            <div className="meter">
              {m.zones.map((z, i) => <div key={i} className="zone" style={{ left: `${z.from * 100}%`, width: `${(z.to - z.from) * 100}%` }}>{z.label && <span>{z.label}</span>}</div>)}
              <div className="fill" style={{ width: `${Math.min(100, val * 100)}%` }} />
              <div className="needle" style={{ left: `${Math.min(100, val * 100)}%` }} />
            </div>
            <button className={'brew-hold' + (holding ? ' on' : '')} onPointerDown={press} onPointerUp={release} onPointerLeave={release}>{holding ? 'let go!' : 'HOLD'} <small>or Space</small></button>
          </>
        )}

        {step === 'cup' && (
          <>
            <div className="brew-title">Click a {want?.size ?? ''} glass on the shelf (right), then click the coaster</div>
          </>
        )}

        {step === 'extras' && (
          <>
            <div className="brew-title">Extras? Pick up the 🍫 chocolate or 💧 kettle and click your glass {d.chocolate ? '· 🍫 in' : ''}{d.water ? ' · 💧 in' : ''}</div>
            <div className="brew-row">
              <button className="chip go" onClick={() => { setScore((o) => ({ ...o, extras: want && d.water === want.water && d.chocolate === want.chocolate ? 3 : 0 })); next('extras') }}>next →</button>
            </div>
          </>
        )}

        {step === 'top' && (
          <>
            <div className="brew-title">Finish it: pick up a shaker or the cream can and click your glass {d.topping !== 'none' ? `· ${d.topping} ✓` : ''}</div>
            <div className="brew-row">
              <button className="chip go" onClick={() => { setScore((o) => ({ ...o, top: want && useShop.getState().drink.topping === want.topping ? 3 : 0 })); setStep('serve') }}>next →</button>
            </div>
          </>
        )}

        {step === 'serve' && (
          <>
            <div className="brew-title">Hand it over</div>
            <div className="brew-row">
              <button className="brew-go" onClick={serve}>🔔 Serve</button>
              <button className="chip ghost" onClick={begin}>↺ start over</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
