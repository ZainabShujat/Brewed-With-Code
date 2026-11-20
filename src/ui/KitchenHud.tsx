import { useEffect, useState } from 'react'
import { useGame } from '../systems/store'
import { useKitchen, PARTS, needs, scoop, type Flavour, type Part } from '../systems/kitchen'
import { INGREDIENTS } from '../data/ingredients'
import { TOUCH } from '../systems/CameraRig'

// The kitchen's little panel: which batter you're making, what's in the bowl, what's on the shelf for the cake
// bench. The work itself is in the room: click / tap the jars, then hold the whisk.
const FL: { id: Flavour; label: string }[] = [{ id: 'vanilla', label: '🍰 vanilla' }, { id: 'chocolate', label: '🍫 chocolate' }, { id: 'strawberry', label: '🍓 strawberry' }]
const PART_LABEL = (f: Flavour, p: Part) => p === 'extra' ? (f === 'chocolate' ? 'cocoa' : 'strawberries') : p
export function KitchenHud() {
  const k = useKitchen(), [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  const f = k.bowl.flavour, ready = k.ready(), msg = k.msg && performance.now() - k.msg.t < 3500 ? k.msg : null
  return (
    <div className="khud" onPointerDown={(e) => e.stopPropagation()}>
      <div className="kh-h">🥣 Kitchen · sponge batter</div>
      <div className="kh-fl">{FL.map((x) => <button key={x.id} className={f === x.id ? 'on' : ''} data-flavour={x.id} onClick={() => k.choose(x.id)}>{x.label}</button>)}</div>
      {f ? <ul className="kh-list">{PARTS.filter((p) => needs(f, p)).map((p) => {
        const sc = scoop(f, p)!, n = k.bowl.added[p], need = needs(f, p)
        return <li key={p} className={n >= need ? 'done' : ''}><span>{INGREDIENTS[sc[0]].icon} {PARTS && PART_LABEL(f, p)}</span><b>{n}/{need}</b></li>
      })}<li className={k.bowl.stir >= 1 ? 'done' : ''}><span>🌀 stir</span><b>{Math.round(k.bowl.stir * 100)}%</b></li></ul>
        : <div className="kh-tip">pick a flavour, then {TOUCH ? 'tap' : 'click'} the jars on the counter</div>}
      <div className="kh-tip">{!f ? '' : ready ? `${TOUCH ? 'press and hold' : 'hold the mouse on'} the whisk to stir` : `${TOUCH ? 'tap' : 'click'} a jar to add one scoop`}</div>
      {msg && <div className={`kh-msg ${msg.good ? 'good' : ''}`}>{msg.text}</div>}
      <div className="kh-shelf">batter shelf: {FL.map((x) => <span key={x.id}>{x.label.split(' ')[0]} {k.batter[x.id]}</span>)} <small>(layers)</small></div>
      <div className="kh-row">{f && <button className="ghost" onClick={() => k.tip()}>tip out</button>}
        <button onClick={() => useGame.getState().setMode('walk')}>↩ back to the café</button></div>
    </div>
  )
}
