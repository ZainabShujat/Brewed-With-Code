import { useEffect, useState } from 'react'
import { useCake, SPONGE_COL, FILL_COL, FROST_COL, PIPE_COL } from '../systems/cake'
import { useGame } from '../systems/store'

// The cake bench controls: one row per step, coloured like what they add.
export function CakeHud() {
  const mode = useGame((s) => s.mode)
  const k = useCake()
  const [, force] = useState(0)
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 300); return () => clearInterval(id) }, [])
  if (mode !== 'cake') return null
  const c = k.cake
  const fresh = k.last && performance.now() / 1000 - k.last.t < 3.5
  const sw = (col: string) => ({ background: col, color: ['#6b3f2a', '#5a3424', '#4a2a1c', '#c2324f'].includes(col) ? '#fff' : '#3a2230' })
  const canLayer = c.frosting === 'none' && c.layers.length < 4 && c.layers.length === c.fillings.length
  const canFill = c.frosting === 'none' && c.layers.length > c.fillings.length && c.layers.length > 0
  const canFrost = c.layers.length > 0 && c.frosting === 'none' && c.fillings.length < c.layers.length
  return (
    <>
      <div className="ticket cake-ticket">
        <div className="tk-h">cake order</div>
        <div className="tk-name" style={{ fontSize: 16 }}>{k.order.label}</div>
        <div className="tk-h" style={{ marginTop: 10 }}>on the turntable</div>
        <div className="tk-cup">{c.layers.length ? `${c.layers.length} layer${c.layers.length > 1 ? 's' : ''}${c.frosting !== 'none' ? ` · ${c.frosting} frosting` : ''}${c.piping !== 'none' ? ` · ${c.piping} rosettes` : ''}${c.top !== 'none' ? ` · ${c.top}` : ''}` : 'empty plate'}</div>
        <div className="tk-row"><button onClick={() => k.box()} disabled={!c.layers.length}>📦 box it</button><button onClick={() => k.reset()} disabled={!c.layers.length}>🗑 start over</button></div>
        <div className="tk-milk">cake coins: {k.coins}</div>
      </div>
      <div className="cakebar">
        <div className="cb-row"><span>1 · sponge</span>{(['vanilla', 'chocolate', 'strawberry'] as const).map((s) => <button key={s} disabled={!canLayer} style={sw(SPONGE_COL[s])} onClick={() => k.addLayer(s)}>{s}</button>)}</div>
        <div className="cb-row"><span>2 · filling</span>{(['cream', 'jam'] as const).map((f) => <button key={f} disabled={!canFill} style={sw(FILL_COL[f])} onClick={() => k.addFilling(f)}>{f}</button>)}</div>
        <div className="cb-row"><span>3 · frosting</span>{(['pink', 'white', 'chocolate', 'lavender'] as const).map((f) => <button key={f} disabled={!canFrost} style={sw(FROST_COL[f])} onClick={() => k.frost(f)}>{f}</button>)}</div>
        <div className="cb-row"><span>4 · rosettes</span>{(['white', 'pink', 'chocolate'] as const).map((p) => <button key={p} disabled={c.frosting === 'none' || c.piping !== 'none'} style={sw(PIPE_COL[p])} onClick={() => k.pipe(p)}>{p}</button>)}</div>
        <div className="cb-row"><span>5 · top</span>{(['sprinkles', 'cherries', 'strawberries', 'candles'] as const).map((t) => <button key={t} disabled={c.frosting === 'none' || c.top !== 'none'} onClick={() => k.topWith(t)}>{t}</button>)}</div>
      </div>
      {fresh && k.last && <div className="result">{k.last.pct === 100 ? '🎂' : k.last.pct >= 60 ? '🙂' : '😐'} {k.last.pct}% · +{k.last.coins}💰{k.last.misses.length ? <small>wanted: {k.last.misses.join(', ')}</small> : <small>perfect cake!</small>}</div>}
    </>
  )
}
