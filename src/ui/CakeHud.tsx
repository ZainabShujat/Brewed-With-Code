import { TOUCH } from '../systems/CameraRig'
import { useEffect, useState } from 'react'
import { useCake, nextCakeStep, SPONGE_COL, FILL_COL, FROST_COL, PIPE_COL, type Cake } from '../systems/cake'
import { useGame } from '../systems/store'
import { cakeSvg } from './cakeSvg'
import { machine, STEP_NO } from '../world/CakeMachine'
import { Sprinkles, Cherry, Strawberry, Candle, Coin } from './icons'

// The cake machine's panel (21 Nov, readability pass): the order as a picture + a short checklist with colour swatches,
// and a bottom bar that always says the ONE next thing to do: roll the cake to a dispenser, or tap a choice on it.
export const TIN_ICON: Record<string, string> = { round: '', square: '', heart: '', none: '' } // (kept for older imports)
const STOPS = ['start', 'tin', 'sponge', 'filling', 'frosting', 'rosettes', 'toppings', 'serve']
const IDX: Record<string, number> = { tin: 1, layer: 2, fill: 3, frost: 4, pipe: 5, top: 6, star: 7 }
const NAME: Record<string, string> = { tin: 'Tin', layer: 'Sponge', fill: 'Filling', frost: 'Frosting', pipe: 'Rosettes', top: 'Toppings' }
const CHOOSE: Record<string, string> = { tin: 'a tin shape', layer: 'a sponge colour', fill: 'a filling', frost: 'a frosting', pipe: 'a rosette colour', top: 'a topping' }

const TinShape = ({ t }: { t: string }) => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>{t === 'square' ? <rect x="2" y="2" width="12" height="12" rx="2" fill="#f2c66a" stroke="#3d1846" strokeWidth="1.3" />
  : t === 'heart' ? <path d="M8 14 C2 10 1 6 3.5 3.8 C5.5 2 7.5 3.2 8 4.6 C8.5 3.2 10.5 2 12.5 3.8 C15 6 14 10 8 14z" fill="#ff8fb5" stroke="#3d1846" strokeWidth="1.3" />
  : <circle cx="8" cy="8" r="6" fill="#8ec9e8" stroke="#3d1846" strokeWidth="1.3" />}</svg>
const Sw = ({ c }: { c: string }) => <i className="sw" style={{ background: c }} />
const TOP_ICON: Record<string, (p: { size?: number }) => JSX.Element> = { sprinkles: Sprinkles, cherries: Cherry, strawberries: Strawberry, candles: Candle }

/** the order as six short lines, each with its colour / shape; finished steps are ticked off */
function Checklist({ want, done }: { want: Cake; done: number }) {
  const T = TOP_ICON[want.top]
  const rows: [string, JSX.Element, string][] = [
    ['tin', <TinShape t={want.tin} />, `${want.tin} tin`],
    ['layer', <Sw c={SPONGE_COL[want.layers[0]]} />, `${want.layers.length} × ${want.layers[0]} sponge`],
    ['fill', <Sw c={FILL_COL[want.fillings[0] ?? 'cream']} />, `${want.fillings[0] ?? 'no'} filling`],
    ['frost', want.frosting === 'none' ? <Sw c="#eee" /> : <Sw c={FROST_COL[want.frosting]} />, `${want.frosting} frosting`],
    ['pipe', want.piping === 'none' ? <Sw c="#eee" /> : <Sw c={PIPE_COL[want.piping]} />, `${want.piping} rosettes`],
    ['top', T ? <T size={16} /> : <Sw c="#eee" />, want.top],
  ]
  return <ol className="cc-list">{rows.map(([id, icon, text]) => <li key={id} className={IDX[id] <= done ? 'done' : ''}><b>{STEP_NO[id]}</b>{icon}<span>{text}</span></li>)}</ol>
}

export function CakeHud() {
  const mode = useGame((s) => s.mode)
  const k = useCake()
  const [, force] = useState(0)
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 200); return () => clearInterval(id) }, [])
  useEffect(() => { if (mode === 'cake') useCake.getState().showFor() }, [mode])
  useEffect(() => {
    if (mode !== 'cake') return
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') machine.step(1); if (e.key === 'ArrowLeft') machine.step(-1) }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [mode])
  if (mode !== 'cake') return null
  const fresh = k.last && performance.now() / 1000 - k.last.t < 3.5
  const why = k.why && performance.now() - k.why.t < 2600 ? k.why.text : ''
  const yay = k.yay && performance.now() - k.yay.t < 1600 ? k.yay.text : ''
  const g = nextCakeStep(k.cake, k.order.want), at = machine.idx, goal = IDX[g.at], showing = performance.now() < k.orderUntil
  // the ONE thing to do now
  const tap = TOUCH ? 'Tap' : 'Click'
  const doNow = machine.busy ? 'Working…'
    : g.at === 'star' ? (at === goal ? `${tap} ▶ to box it and serve` : 'All done: roll it ▶ to the star to serve')
    : `${STEP_NO[g.at]} · ${NAME[g.at]}: ${tap.toLowerCase()} ${CHOOSE[g.at]} on the buttons below it`
  return (
    <>
      <div className="beltnav">
        <button className="navbtn" onClick={() => machine.step(-1)} aria-label="roll the cake left">◀</button>
        <div className="navstop"><small>cake at: {STOPS[machine.idx]}</small><span className="donow">{doNow}</span></div>
        <button className={`navbtn ${at < goal && !machine.busy ? 'pulse' : ''}`} onClick={() => machine.step(1)} aria-label="roll the cake right">▶</button>
        {k.cake.layers.length > 0 && <button className="redo" onClick={() => k.reset()} title="start over" aria-label="start over">↺</button>}
      </div>
      {why && <div className="cheer off" key={k.why!.t}>{why}</div>}
      {!why && yay && <div className="cheer" key={k.yay!.t}>{yay}</div>}
      {fresh && k.last && <div className="result">{k.last.pct === 100 ? 'Perfect cake!' : `${k.last.pct}%`} · <Coin size={16} /> +{k.last.coins}{k.last.misses.length ? <small>wanted: {k.last.misses.join(', ')}</small> : null}</div>}
    </>
  )
}
