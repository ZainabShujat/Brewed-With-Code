import { useEffect, useState } from 'react'
import { useCake, SPONGE_COL, FILL_COL, FROST_COL, PIPE_COL } from '../systems/cake'
import { useGame } from '../systems/store'

// A slim step-by-step tray: only the choices that make sense right now, as colour swatches.
const STEPS = ['sponge', 'filling', 'frosting', 'rosettes', 'topping', 'box'] as const
const TOPS: Record<string, string> = { sprinkles: '🌈', cherries: '🍒', strawberries: '🍓', candles: '🕯️' }

function Swatch({ color, label, onClick, icon }: { color?: string; label: string; onClick: () => void; icon?: string }) {
  return (
    <button className="sw" onClick={onClick}>
      <span className="dot" style={{ background: color ?? '#fff6ee' }}>{icon}</span>
      <span className="lbl">{label}</span>
    </button>
  )
}

export function CakeHud() {
  const mode = useGame((s) => s.mode)
  const k = useCake()
  const [, force] = useState(0)
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 300); return () => clearInterval(id) }, [])
  if (mode !== 'cake') return null
  const c = k.cake
  const canLayer = c.frosting === 'none' && c.layers.length < 4 && c.layers.length === c.fillings.length
  const canFill = c.frosting === 'none' && c.layers.length > c.fillings.length && c.layers.length > 0
  const canFrost = c.layers.length > 0 && c.frosting === 'none' && c.fillings.length < c.layers.length
  const step = c.frosting === 'none' ? (canFill && !canLayer && c.layers.length > c.fillings.length && c.layers.length < 2 ? 'filling' : c.layers.length ? (canFill ? 'filling' : 'sponge') : 'sponge')
    : c.piping === 'none' ? 'rosettes' : c.top === 'none' ? 'topping' : 'box'
  const shownStep = canFrost && c.layers.length >= 2 ? 'frosting' : step
  const fresh = k.last && performance.now() / 1000 - k.last.t < 3.5
  return (
    <>
      <div className="cake-card">
        <div className="tk-h">cake order</div>
        <div className="cc-name">{k.order.label}</div>
      </div>
      <div className="tray">
        <div className="steps">{STEPS.map((s) => <span key={s} className={s === shownStep ? 'on' : STEPS.indexOf(s) < STEPS.indexOf(shownStep) ? 'done' : ''}>{s}</span>)}</div>
        <div className="opts">
          {canLayer && (['vanilla', 'chocolate', 'strawberry'] as const).map((s) => <Swatch key={s} color={SPONGE_COL[s]} label={s} onClick={() => k.addLayer(s)} />)}
          {canFill && (['cream', 'jam'] as const).map((f) => <Swatch key={f} color={FILL_COL[f]} label={f} onClick={() => k.addFilling(f)} />)}
          {canFrost && <span className="or">frost it →</span>}
          {canFrost && (['pink', 'white', 'chocolate', 'lavender'] as const).map((f) => <Swatch key={f} color={FROST_COL[f]} label={f} onClick={() => k.frost(f)} />)}
          {c.frosting !== 'none' && c.piping === 'none' && (['white', 'pink', 'chocolate'] as const).map((p) => <Swatch key={p} color={PIPE_COL[p]} label={`${p} rosettes`} onClick={() => k.pipe(p)} />)}
          {c.frosting !== 'none' && c.top === 'none' && (['sprinkles', 'cherries', 'strawberries', 'candles'] as const).map((t) => <Swatch key={t} icon={TOPS[t]} label={t} onClick={() => k.topWith(t)} />)}
          {c.layers.length > 0 && <button className="boxbtn" onClick={() => k.box()}>📦 box it</button>}
          {c.layers.length > 0 && <button className="redo" onClick={() => k.reset()} title="start over">↺</button>}
        </div>
      </div>
      {fresh && k.last && <div className="result">{k.last.pct === 100 ? '🎂' : k.last.pct >= 60 ? '🙂' : '😐'} {k.last.pct}% · +{k.last.coins}💰{k.last.misses.length ? <small>wanted: {k.last.misses.join(', ')}</small> : <small>perfect cake!</small>}</div>}
    </>
  )
}
