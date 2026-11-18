import { useEffect, useState } from 'react'
import { useGame } from '../systems/store'
import { usePantry } from '../systems/pantry'
import { useDay } from '../systems/day'
import { SHOPS, shopDoor, type Shop } from '../world/streetLayout'
import { INGREDIENTS, PACKS, packAmount, packPrice, fmt, type IngredientId, type PackKind } from '../data/ingredients'

// Walk up to an ingredient shop's door on the street: a prompt appears; press F (or tap it) to go in.
// Inside: what this shop sells, how much you have, and the packs you can buy with coins from your bank.
// Bigger packs (bulk, wholesale) are cheaper per gram and unlock as the café levels up.
const STORES = SHOPS.filter((s) => s.store)
const near = (p: { x: number; z: number }) => STORES.find((s) => { const [x, z] = shopDoor(s); return Math.hypot(p.x - x, p.z - z) < 3.6 })

export function StreetShop() {
  const [at, setAt] = useState<Shop | undefined>()
  const [open, setOpen] = useState<Shop | null>(null)
  useEffect(() => {
    const id = setInterval(() => { const s = near(useGame.getState().player); setAt(s); if (!s) setOpen(null) }, 200)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') { const s = near(useGame.getState().player); if (s) setOpen((o) => (o ? null : s)) }
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  if (open) return <ShopCounter shop={open} close={() => setOpen(null)} />
  if (!at) return null
  return <button className="shop-prompt" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(at)}>{at.icon} shop at <b>{at.name}</b> <kbd>F</kbd></button>
}

function ShopCounter({ shop, close }: { shop: Shop; close: () => void }) {
  const stock = usePantry((s) => s.stock), bank = useDay((s) => s.bank), level = usePantry.getState().level()
  const [msg, setMsg] = useState('')
  const items = (Object.keys(INGREDIENTS) as IngredientId[]).filter((id) => INGREDIENTS[id].store === shop.store)
  const buy = (id: IngredientId, k: PackKind) => { const why = usePantry.getState().buy(id, k); setMsg(why ? `can't buy: ${why}` : `bought ${fmt(id, packAmount(id, k))} of ${INGREDIENTS[id].label} ✨`) }
  return (
    <div className="shop-counter" onPointerDown={(e) => e.stopPropagation()}>
      <div className="sc-head">
        <div><span className="sc-icon">{shop.icon}</span><b>{shop.name}</b></div>
        <div className="sc-bank">🏦 {Math.floor(bank)} coins · café level {level}</div>
        <button className="sc-x" onClick={close} title="leave the shop (Esc)">✕</button>
      </div>
      <div className="sc-list">
        {items.map((id) => { const it = INGREDIENTS[id]
          return (
            <div key={id} className="sc-row">
              <div className="sc-name"><span>{it.icon}</span>{it.label}<small>you have {fmt(id, stock[id])}</small></div>
              <div className="sc-packs">
                {(Object.keys(PACKS) as PackKind[]).map((k) => { const locked = level < PACKS[k].level, price = packPrice(id, k)
                  return (
                    <button key={k} className={'sc-pack' + (locked ? ' locked' : '')} disabled={locked || bank < price} onClick={() => buy(id, k)}
                      title={locked ? `unlocks at café level ${PACKS[k].level}` : `${PACKS[k].label}${PACKS[k].discount ? ` (${Math.round(PACKS[k].discount * 100)}% off)` : ''}`}>
                      <i>{PACKS[k].label}</i><b>{fmt(id, packAmount(id, k))}</b><em>{locked ? `🔒 lv ${PACKS[k].level}` : `${price} 💰`}</em>
                    </button>)
                })}
              </div>
            </div>)
        })}
      </div>
      <div className="sc-foot">{msg || 'bigger packs are cheaper, and unlock as your café levels up'}</div>
    </div>
  )
}

// a friendly note when something runs out (and where to buy it), or when you've just bought something
export function PantryNote() {
  const note = usePantry((s) => s.note)
  const [, tick] = useState(0)
  useEffect(() => { if (!note) return; const id = setTimeout(() => tick((n) => n + 1), 2700); return () => clearTimeout(id) }, [note])
  if (!note || performance.now() / 1000 - note.t > 2.6) return null
  return <div className="pantry-note" key={note.t}>{note.text}</div>
}
