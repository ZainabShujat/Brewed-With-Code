import { useEffect, useState } from 'react'
import { useGame } from '../systems/store'
import { usePantry } from '../systems/pantry'
import { useDay } from '../systems/day'
import { SHOPS, type Shop } from '../world/streetLayout'
import { KEEPERS } from '../data/shopkeepers'
import { keeperPos, KEEPER_SHOPS } from '../world/Keepers'
import { INGREDIENTS, PACKS, packAmount, packPrice, fmt, type IngredientId, type PackKind } from '../data/ingredients'

// Walk up to an ingredient shop's door on the street: a prompt appears; press F (or tap it) to go in.
// Inside: what this shop sells, how much you have, and the packs you can buy with coins from your bank.
// Bigger packs (bulk, wholesale) are cheaper per gram and unlock as the café levels up.
void SHOPS
// who's close enough to talk to: a shopkeeper within reach (across the counter, or by their door)
const near = (p: { x: number; z: number }) => KEEPER_SHOPS.find((s) => { const [x, z] = keeperPos(s); return Math.hypot(p.x - x, p.z - z) < 3.1 })

export function StreetShop() {
  const [at, setAt] = useState<Shop | undefined>()
  const [open, setOpen] = useState<Shop | null>(null)
  const [talk, setTalk] = useState<{ shop: Shop; i: number } | null>(null)
  useEffect(() => {
    const id = setInterval(() => { const s = near(useGame.getState().player); setAt(s); if (!s) { setOpen(null); setTalk(null) } }, 200)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const s = near(useGame.getState().player)
      if ((e.key === 'f' || e.key === 'F') && s?.store) { setTalk(null); setOpen((o) => (o ? null : s)) }
      if ((e.key === 't' || e.key === 'T') && s) { setOpen(null); setTalk((t) => ({ shop: s, i: t && t.shop === s ? t.i + 1 : 0 })) }
      if (e.key === 'Escape') { setOpen(null); setTalk(null) }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  if (open) return <ShopCounter shop={open} close={() => setOpen(null)} />
  if (!at) return null
  const k = KEEPERS[at.kind]!
  return (
    <>
      {talk && <div className="talkbox" onPointerDown={(e) => e.stopPropagation()}>
        <b>{at.icon} {k.name}</b><span>{k.lines[talk.i % k.lines.length]}</span><small>T: more · Esc: bye</small>
      </div>}
      <div className="shop-prompt" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => setTalk((t) => ({ shop: at, i: t ? t.i + 1 : 0 }))}>💬 talk to <b>{k.name}</b> <kbd>T</kbd></button>
        {at.store && <button onClick={() => setOpen(at)}>🛒 buy <kbd>F</kbd></button>}
      </div>
    </>
  )
}

function ShopCounter({ shop, close }: { shop: Shop; close: () => void }) {
  const stock = usePantry((s) => s.stock), bank = useDay((s) => s.bank), level = usePantry.getState().level()
  const [msg, setMsg] = useState('')
  const items = (Object.keys(INGREDIENTS) as IngredientId[]).filter((id) => INGREDIENTS[id].store === shop.store)
  const buy = (id: IngredientId, k: PackKind) => { const why = usePantry.getState().buy(id, k); setMsg(why ? `can't buy: ${why}` : `bought ${fmt(id, packAmount(id, k))} of ${INGREDIENTS[id].label} ✨`) }
  return (
    <div className="shop-counter" onPointerDown={(e) => e.stopPropagation()}>
      <div className="sc-head">
        <div><span className="sc-icon">{shop.icon}</span><b>{shop.name}</b><small className="sc-keeper"> · {KEEPERS[shop.kind]?.name} at the counter</small></div>
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
