import { TOUCH } from '../systems/CameraRig'
import { useEffect, useState } from 'react'
import { useCake } from '../systems/cake'
import { useGame } from '../systems/store'
import { cakeSvg } from './cakeSvg'
import { machine } from '../world/CakeMachine'

// The cake machine needs almost no UI: the order card (from memory), and ◀ ▶ to roll the cake
// along the belt. Everything else is clicking the coloured bulbs on the dispensers themselves.
export const TIN_ICON: Record<string, string> = { round: '⚪', square: '⬜', heart: '🤍', none: '' }
const STOPS = ['start', 'tin', 'sponge', 'filling', 'frosting', 'rosettes', 'toppings', 'serve ⭐']

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
  return (
    <>
      <div className="cake-card">
        <div className="tk-h">cake order</div>
        {performance.now() < k.orderUntil ? <>
          <div className="cc-pic" dangerouslySetInnerHTML={{ __html: cakeSvg(k.order.want, 180) }} />
          <div className="tinbadge">{TIN_ICON[k.order.want.tin]} {k.order.want.tin} tin</div>
          <div className="cc-name">{k.order.label}</div>
          <div className="tk-note">remember it, it'll hide in a moment!</div>
        </> : <>
          <div className="cc-name">Make it from memory 🧠</div>
          <button className="chip" style={{ marginTop: 8 }} onClick={() => k.peek()}>👀 peek (−5%)</button>
        </>}
      </div>
      <div className="beltnav">
        <button className="navbtn" onClick={() => machine.step(-1)}>◀</button>
        <div className="navstop"><small>cake is at</small>{STOPS[machine.idx]}<small>{TOUCH ? 'tap' : 'click'} a colour or shape on the dispenser above it</small></div>
        <button className="navbtn" onClick={() => machine.step(1)}>▶</button>
        {k.cake.layers.length > 0 && <button className="redo" onClick={() => k.reset()} title="start over">↺</button>}
      </div>
      {why && <div className="cheer off" key={k.why!.t}>{why}</div>}
      {fresh && k.last && <div className="result">{k.last.pct === 100 ? '🎂' : k.last.pct >= 60 ? '🙂' : '😐'} {k.last.pct}% · +{k.last.coins}💰{k.last.misses.length ? <small>wanted: {k.last.misses.join(', ')}</small> : <small>perfect cake!</small>}</div>}
    </>
  )
}
