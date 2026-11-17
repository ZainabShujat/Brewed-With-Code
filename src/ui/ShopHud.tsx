import { useEffect, useState } from 'react'
import { useShop } from '../systems/shop'
import { useGame } from '../systems/store'
import { cafe } from '../world/Customers'
import type { Drink } from '../data/recipes'

// What's in the cup, in words
function describe(d: Drink) {
  const p: string[] = []
  if (d.shots) p.push(`${d.shots} shot${d.shots > 1 ? 's' : ''}`)
  if (d.chocolate) p.push('chocolate')
  if (d.water) p.push('hot water')
  if (d.milk !== 'none') p.push(`${d.milk === 'micro' ? 'microfoam' : d.milk} ${d.milkType} milk`)
  if (d.topping !== 'none') p.push(d.topping)
  return p.length ? p.join(' · ') : 'empty cup'
}

type Tab = 'shots' | 'extras' | 'milk' | 'topping'
const TABS: Tab[] = ['shots', 'extras', 'milk', 'topping']

function Swatch({ color, label, onClick, icon, on }: { color?: string; label: string; onClick: () => void; icon?: string; on?: boolean }) {
  return (
    <button className={'sw' + (on ? ' picked' : '')} onClick={onClick}>
      <span className="dot" style={{ background: color ?? '#fff6ee' }}>{icon}</span>
      <span className="lbl">{label}</span>
    </button>
  )
}

export function ShopHud() {
  const shop = useShop()
  const mode = useGame((s) => s.mode), setMode = useGame((s) => s.setMode)
  const [tab, setTab] = useState<Tab>('shots')
  const [, force] = useState(0)
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 250); return () => clearInterval(id) }, [])
  // clicking the steel pitcher in 3D jumps the tray to the milk step
  useEffect(() => { if (shop.menu === 'milk') { setTab('milk'); shop.setMenu(null) } }, [shop.menu])
  useEffect(() => { if (shop.cup) setTab('shots') }, [shop.cup])

  if (!shop.open) return null // the day system's "Open the café" button does this now
  const front = cafe.line.peek()
  const order = front ? shop.orders[front.id] : undefined
  const fresh = shop.last && performance.now() / 1000 - shop.last.t < 3
  const d = shop.drink
  return (
    <>
      <div className="cake-card">
        <div className="tk-h">order</div>
        {order ? <><div className="cc-name">{order.label}</div><div className="tk-note">{order.recipe.note}</div></>
               : <div className="tk-note">{cafe.line.size ? 'customer walking up…' : 'waiting for customers…'}</div>}
        <div className="tk-h" style={{ marginTop: 8 }}>your cup</div>
        <div className="tk-cup">{shop.cup ? describe(d) : '—'}</div>
      </div>
      <div className="coins">💰 {shop.coins} · served {shop.served}</div>
      {mode === 'pov' && (
        <div className="tray">
          {!shop.cup ? (
            <div className="opts"><button className="boxbtn" onClick={() => shop.takeCup()}>☕ take a cup</button></div>
          ) : (
            <>
              <div className="steps">{TABS.map((t) => <span key={t} className={t === tab ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setTab(t)}>{t}</span>)}</div>
              <div className="opts">
                {tab === 'shots' && <Swatch color="#5b2e1c" icon="☕" label={`add a shot (${d.shots})`} onClick={() => shop.shot()} />}
                {tab === 'extras' && <>
                  <Swatch color="#bfe3f2" icon="💧" label="hot water" on={d.water} onClick={() => shop.water()} />
                  <Swatch color="#5a3424" icon="🍫" label="chocolate" on={d.chocolate} onClick={() => shop.choc()} />
                </>}
                {tab === 'milk' && <>
                  {(['whole', 'oat', 'almond'] as const).map((m) => <Swatch key={m} color={m === 'whole' ? '#fbf8f2' : m === 'oat' ? '#eedcb8' : '#f2e6d2'} label={m} on={shop.milkType === m} onClick={() => shop.pickMilk(m)} />)}
                  <span className="or">then →</span>
                  <Swatch color="#d8b48c" label="steamed" on={d.milk === 'steamed'} onClick={() => shop.milk('steamed')} />
                  <Swatch color="#fffaf2" label="thick foam" on={d.milk === 'foamy'} onClick={() => shop.milk('foamy')} />
                  <Swatch color="#efe2cf" label="microfoam" on={d.milk === 'micro'} onClick={() => shop.milk('micro')} />
                </>}
                {tab === 'topping' && <>
                  <Swatch color="#5b2e1c" label="cocoa" on={d.topping === 'cocoa'} onClick={() => shop.top('cocoa')} />
                  <Swatch color="#b0602a" label="cinnamon" on={d.topping === 'cinnamon'} onClick={() => shop.top('cinnamon')} />
                  <Swatch icon="🌈" label="sprinkles" on={d.topping === 'sprinkles'} onClick={() => shop.top('sprinkles')} />
                  <Swatch color="#ffffff" label="whipped" on={d.topping === 'whipped'} onClick={() => shop.top('whipped')} />
                </>}
                <button className="boxbtn" disabled={!order} onClick={() => shop.serve()}>🔔 serve</button>
                <button className="redo" onClick={() => shop.trash()} title="bin it">↺</button>
              </div>
            </>
          )}
        </div>
      )}
      {fresh && shop.last && (
        <div className="result">{shop.last.mood} {shop.last.pct}% · +{shop.last.coins}💰{shop.last.misses.length ? <small>wanted: {shop.last.misses.join(', ')}</small> : <small>perfect!</small>}</div>
      )}
      {mode !== 'pov' && <button className="openbtn small" onClick={() => setMode('pov')}>back behind the bar</button>}
    </>
  )
}
