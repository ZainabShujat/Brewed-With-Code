import { useEffect, useState } from 'react'
import { useGame } from '../systems/store'
import { useKitchen, PARTS, needs, scoop, type Flavour, type Part } from '../systems/kitchen'
import { INGREDIENTS } from '../data/ingredients'
import { TOUCH } from '../systems/CameraRig'
import { SPONGE_COL } from '../systems/cake'
import { IngIcon, Whisk, Bowl, Back } from './icons'

// The kitchen's panel: which batter you're making, what's in the bowl, what's on the shelf for the cake bench.
// The work itself happens in the room (tap the ingredients, hold the whisk). Desktop: a small card.
// Phones: a slim rail down the left edge, pictures only, so the counter stays in view.
const FL: Flavour[] = ['vanilla', 'chocolate', 'strawberry']
const partName = (f: Flavour, p: Part) => p === 'extra' ? (f === 'chocolate' ? 'cocoa' : 'strawberries') : p
const Pips = ({ n, of }: { n: number; of: number }) => <span className="kh-pips">{Array.from({ length: of }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>

export function KitchenHud() {
  const k = useKitchen(), [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  const f = k.bowl.flavour, ready = k.ready(), msg = k.msg && performance.now() - k.msg.t < 3500 ? k.msg : null
  const parts = f ? PARTS.filter((p) => needs(f, p)) : []
  const hint = !f ? 'Pick a flavour' : ready ? (TOUCH ? 'Hold the whisk to stir' : 'Hold the whisk to stir') : (TOUCH ? 'Tap the ingredients' : 'Click the ingredients')
  return (
    <>
      <div className={`khud ${TOUCH ? 'rail' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
        {!TOUCH && <div className="kh-h"><Bowl size={20} /> Sponge batter</div>}
        <div className="kh-fl">{FL.map((x) => (
          <button key={x} className={f === x ? 'on' : ''} data-flavour={x} onClick={() => k.choose(x)} aria-label={`${x} batter`} title={x}>
            <i style={{ background: SPONGE_COL[x] }} />{!TOUCH && <span>{x}</span>}
          </button>))}</div>
        {f && <div className="kh-list">{parts.map((p) => {
          const sc = scoop(f, p)!, n = k.bowl.added[p], need = needs(f, p)
          return <div key={p} className={`kh-row ${n >= need ? 'done' : ''}`} title={partName(f, p)}>
            <IngIcon id={sc[0]} size={TOUCH ? 22 : 20} />{!TOUCH && <span className="kh-n">{partName(f, p)}</span>}<Pips n={n} of={need} />
          </div>
        })}
          <div className={`kh-row stir ${k.bowl.stir >= 1 ? 'done' : ''}`} title="stir"><Whisk size={TOUCH ? 22 : 20} />{!TOUCH && <span className="kh-n">stir</span>}
            <span className="kh-bar"><b style={{ width: `${Math.round(k.bowl.stir * 100)}%` }} /></span></div>
        </div>}
        {!TOUCH && <div className="kh-tip">{hint}</div>}
        <div className="kh-shelf" title="batter on the shelf for the cake bench (layers)">
          {FL.map((x) => <span key={x}><i style={{ background: SPONGE_COL[x] }} />{k.batter[x]}</span>)}
        </div>
        <div className="kh-foot">
          {f && !TOUCH && <button className="link" onClick={() => k.tip()}>tip out</button>}
          <button className="kh-back" onClick={() => useGame.getState().setMode('walk')} aria-label="back to the café"><Back size={16} />{!TOUCH && 'Café'}</button>
        </div>
      </div>
      {(msg || TOUCH) && <div className={`kh-toast ${msg?.good ? 'good' : ''} ${msg ? '' : 'quiet'}`}>{msg ? msg.text : hint}</div>}
    </>
  )
}
// (INGREDIENTS kept for labels in tooltips elsewhere)
void INGREDIENTS
