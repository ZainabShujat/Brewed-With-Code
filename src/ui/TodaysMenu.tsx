import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { MENU, CATEGORIES, STATION_NAME, unlocked, missing, type MenuItem, type Line, type Category } from '../data/menu'
import { INGREDIENTS, fmt } from '../data/ingredients'
import { useTodayMenu } from '../systems/todaymenu'
import { useDay } from '../systems/day'
import { usePantry } from '../systems/pantry'
import { sfx } from '../systems/sound'
import { drinkSvg } from './drinkSvg'
import { cakeSvg } from './cakeSvg'
import type { Cake } from '../systems/cake'
import { IngIcon, STATION_ICON, Cup, CakeIcon, Croissant, Coin, Clock, Lock, Tick, Info, Close, Back, Book } from './icons'
import { TOUCH } from '../systems/CameraRig'

// Today's Menu (before opening) and the Recipe Book (any time). Both read data/menu.ts: one recipe source.
// Products are drawn (the game's own drink / cake pictures), ingredients and stations are illustrated: no emoji.
export const useBook = create<{ open: boolean; item: string | null; show: (id?: string) => void; close: () => void }>((set) => ({
  open: false, item: null, show: (id) => set({ open: true, item: id ?? null }), close: () => set({ open: false, item: null }),
}))

const CAKE_LOOK: Record<string, Omit<Cake, 'tin' | 'layers' | 'fillings'>> = {
  vanilla: { frosting: 'white', piping: 'pink', top: 'sprinkles' },
  chocolate: { frosting: 'chocolate', piping: 'white', top: 'cherries' },
  strawberry: { frosting: 'pink', piping: 'white', top: 'strawberries' },
}
/** a picture of the finished product, from the same data the game makes and scores */
function picture(m: MenuItem, w: number) {
  if (m.order.kind === 'drink') return drinkSvg(m.order.recipe.base, w)
  const s = m.order.sponge
  return cakeSvg({ tin: 'round', layers: [s, s, s], fillings: ['cream', 'cream'], ...CAKE_LOOK[s] }, w)
}
const Pic = ({ m, w }: { m: MenuItem; w: number }) => { const html = useMemo(() => picture(m, w), [m, w]); return <span className="pic" dangerouslySetInnerHTML={{ __html: html }} /> }
const CAT_ICON: Partial<Record<Category, (p: { size?: number }) => JSX.Element>> = { hot: Cup, cold: Cup, cakes: CakeIcon, pastries: Croissant, breakfast: Croissant, food: Croissant }

function Status({ m }: { m: MenuItem }) {
  const day = useDay((d) => d.day), stock = usePantry((p) => p.stock)
  if (!unlocked(m, day)) return <span className="tm-st lock"><Lock size={13} />Day {m.unlockDay}</span>
  const miss = missing(m, stock)
  if (miss.length) return <span className="tm-st low" title={`needs ${miss.map((l) => INGREDIENTS[l.id].label).join(', ')}`}>needs {INGREDIENTS[miss[0].id].label}{miss.length > 1 ? ' +' : ''}</span>
  return null
}

/** one recipe, shared by the menu and the book: picture, ingredients (tap one for a closer look), the steps per station */
export function RecipeView({ m }: { m: MenuItem }) {
  const [focus, setFocus] = useState<Line | null>(null)
  return (
    <div className="rv">
      <div className="rv-h"><Pic m={m} w={TOUCH ? 64 : 96} /><div><b>{m.name}</b><span>{m.about}</span>
        <span className="rv-meta"><Coin size={14} />{m.price}<Clock size={14} />~{m.minutes} min{m.stations.map((s) => { const I = STATION_ICON[s]; return <em key={s}><I size={15} />{STATION_NAME[s]}</em> })}</span></div></div>
      <div className="rv-cols">
        <div className="rv-ing">
          <div className="rv-sub">Ingredients</div>
          {m.ingredients.map((l) => (
            <button key={l.id} className={`rv-line ${focus?.id === l.id ? 'on' : ''}`} onClick={() => { sfx.tap(); setFocus(focus?.id === l.id ? null : l) }}>
              <IngIcon id={l.id} size={20} /><span className="rv-n">{INGREDIENTS[l.id].label}</span><span className="rv-q">{fmt(l.id, l.qty)}</span>
            </button>))}
          {focus && <div className="rv-focus"><IngIcon id={focus.id} size={52} /><div><b>{INGREDIENTS[focus.id].label}</b><em>{fmt(focus.id, focus.qty)}</em><p>{focus.role}</p></div></div>}
        </div>
        <div><div className="rv-sub">Steps</div>
          <ol className="rv-steps">{m.steps.map((s, i) => { const I = STATION_ICON[s.at]; return <li key={i}><span className={`rv-st ${s.at}`} title={STATION_NAME[s.at]}><I size={16} /></span><span>{s.text}</span></li> })}</ol></div>
      </div>
    </div>
  )
}

export function TodaysMenu() {
  const t = useTodayMenu(), day = useDay((d) => d.day), stock = usePantry((p) => p.stock)
  const [peek, setPeek] = useState<string | null>(null), [naming, setNaming] = useState(false), [pname, setPname] = useState('')
  if (!t.open) return null
  const item = peek ? MENU.find((m) => m.id === peek) : null
  const cats = CATEGORIES.filter((c) => MENU.some((m) => m.category === c.id))
  const chosen = t.ids.filter((id) => { const m = MENU.find((x) => x.id === id); return m && unlocked(m, day) && !missing(m, stock).length })
  return (
    <div className="tmenu" onPointerDown={(e) => e.stopPropagation()}>
      <div className="tm-panel">
        <div className="tm-top">
          {item ? <button className="tm-icon-btn" onClick={() => setPeek(null)} aria-label="back to the menu"><Back size={18} /></button> : null}
          <div className="tm-title"><div className="tm-h">{item ? 'Recipe' : `Today's Menu`}</div>{!item && <div className="tm-sub">Day {day} · customers only order what you pick</div>}</div>
          <button className="tm-icon-btn" onClick={t.close} aria-label="close"><Close size={16} /></button>
        </div>
        {item ? <RecipeView m={item} /> : <>
          <div className="tm-list">{cats.map((c) => { const CI = CAT_ICON[c.id] ?? Cup; return (
            <section key={c.id}><div className="tm-cat"><CI size={16} />{c.label}</div>
              <div className="tm-grid">{MENU.filter((m) => m.category === c.id).map((m) => {
                const can = unlocked(m, day), on = t.ids.includes(m.id) && can
                return (
                  <div key={m.id} className={`tm-item ${on ? 'on' : ''} ${can ? '' : 'locked'}`} data-item={m.id}>
                    <button className="tm-pick" disabled={!can} onClick={() => { sfx.tap(); t.toggle(m.id) }} aria-pressed={on}>
                      <Pic m={m} w={TOUCH ? 34 : 44} />
                      <span className="tm-name">{m.name}<small><Coin size={11} />{m.price}</small></span>
                      <span className="tm-tick">{on ? <Tick size={20} /> : null}</span>
                    </button>
                    <div className="tm-row"><Status m={m} /><button className="tm-peek" onClick={() => setPeek(m.id)} aria-label={`${m.name} recipe`}><Info size={18} /></button></div>
                  </div>)
              })}</div>
            </section>) })}
          </div>
          <div className="tm-foot">
            <div className="tm-presets">
              {t.presets.map((p) => <button key={p.name} onClick={() => { sfx.tap(); t.setIds(p.ids) }}>{p.name}</button>)}
              {naming ? <span className="tm-name-in"><input autoFocus maxLength={20} value={pname} onChange={(e) => setPname(e.target.value)} placeholder="name it" />
                <button disabled={!pname.trim()} onClick={() => { t.savePreset(pname.trim()); setNaming(false); setPname('') }}>save</button></span>
                : <button className="ghost" onClick={() => setNaming(true)}>+ save</button>}
            </div>
            <button className="tm-go" disabled={!chosen.length} onClick={() => { sfx.bell(); t.confirm(day) }}>Open with {chosen.length}</button>
          </div>
        </>}
      </div>
    </div>
  )
}

export function RecipeBook() {
  const b = useBook(), day = useDay((d) => d.day)
  if (!b.open) return null
  const known = MENU.filter((m) => unlocked(m, day)), item = known.find((m) => m.id === b.item) ?? known[0]
  return (
    <div className="tmenu" onPointerDown={(e) => e.stopPropagation()}>
      <div className="tm-panel book">
        <div className="tm-top"><div className="tm-title"><div className="tm-h"><Book size={22} /> Recipe Book</div></div>
          <button className="tm-icon-btn" onClick={b.close} aria-label="close"><Close size={16} /></button></div>
        <div className="book-cols">
          <div className="book-index">{known.map((m) => <button key={m.id} className={m.id === item?.id ? 'on' : ''} onClick={() => { sfx.tap(); b.show(m.id) }}><Pic m={m} w={22} />{m.name}</button>)}</div>
          {item && <RecipeView m={item} />}
        </div>
      </div>
    </div>
  )
}
if (typeof window !== 'undefined') (window as unknown as { __book: typeof useBook }).__book = useBook
