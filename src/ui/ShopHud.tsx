import { useEffect, useState } from 'react'
import { useShop } from '../systems/shop'
import { useGame } from '../systems/store'
import { anim } from '../systems/anim'
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

const MENUS = {
  milk: { title: 'steam the milk', opts: [['steamed', 'steamed (latte)'], ['foamy', 'thick foam (cappuccino)'], ['micro', 'microfoam (flat white)']] },
  fillers: { title: 'fridge: pick a milk', opts: [['whole', '🥛 whole'], ['oat', '🌾 oat'], ['almond', '🌰 almond']] },
  ingredients: { title: 'ingredients', opts: [['water', '💧 hot water'], ['choc', '🍫 chocolate']] },
  sprinkles: { title: 'toppings', opts: [['cocoa', 'cocoa dust'], ['cinnamon', 'cinnamon'], ['sprinkles', '🌈 sprinkles']] },
} as const

export function ShopHud() {
  const shop = useShop()
  const mode = useGame((s) => s.mode), setMode = useGame((s) => s.setMode)
  const [, force] = useState(0)
  // re-read the queue a few times a second (it lives outside React)
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 250); return () => clearInterval(id) }, [])
  // the drawer you're using slides open
  useEffect(() => { Object.keys(anim.drawers).forEach((k) => (anim.drawers[k] = k === shop.menu ? 1 : 0)) }, [shop.menu])

  if (!shop.open) return (
    <button className="openbtn" onClick={() => { shop.openShop(true); setMode('pov') }}>☕ Open the café</button>
  )
  const front = cafe.line.peek()
  const order = front ? shop.orders[front.id] : undefined
  const fresh = shop.last && performance.now() / 1000 - shop.last.t < 3
  const pick = (k: string) => {
    const m = shop.menu
    if (m === 'milk') shop.milk(k as Drink['milk'])
    else if (m === 'fillers') shop.pickMilk(k as Drink['milkType'])
    else if (m === 'ingredients') k === 'water' ? shop.water() : shop.choc()
    else if (m === 'sprinkles') shop.top(k as Drink['topping'])
    shop.setMenu(null)
  }
  return (
    <>
      <div className="ticket">
        <div className="tk-h">order</div>
        {order ? <><div className="tk-name">{order.label}</div><div className="tk-note">{order.recipe.note}</div></>
               : <div className="tk-note">{cafe.line.size ? 'customer walking up…' : 'waiting for customers…'}</div>}
        <div className="tk-h" style={{ marginTop: 12 }}>your cup</div>
        <div className="tk-cup">{shop.cup ? describe(shop.drink) : 'no cup yet: click the cups'}</div>
        <div className="tk-milk">next milk: {shop.milkType}</div>
        <div className="tk-row">
          <button onClick={() => shop.serve()} disabled={!shop.cup || !order}>🔔 serve</button>
          <button onClick={() => shop.trash()} disabled={!shop.cup}>🗑 bin</button>
        </div>
      </div>
      <div className="coins">💰 {shop.coins} · served {shop.served}</div>
      {fresh && shop.last && (
        <div className="result">{shop.last.mood} {shop.last.pct}% · +{shop.last.coins}💰{shop.last.misses.length ? <small>wanted: {shop.last.misses.join(', ')}</small> : <small>perfect!</small>}</div>
      )}
      {shop.menu && (
        <div className="menu">
          <div className="menu-h">{MENUS[shop.menu].title}</div>
          {MENUS[shop.menu].opts.map(([k, l]) => <button key={k} onClick={() => pick(k)}>{l}</button>)}
          <button className="x" onClick={() => shop.setMenu(null)}>close</button>
        </div>
      )}
      {mode !== 'pov' && <button className="openbtn small" onClick={() => setMode('pov')}>back behind the bar</button>}
      <div className="howto">click: cups → machine (shots) → milk jug / drawers → 🔔</div>
    </>
  )
}
