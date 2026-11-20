import { useState } from 'react'
import { create } from 'zustand'
import { MENU, CATEGORIES, STATION_NAME, unlocked, missing, type MenuItem, type Line } from '../data/menu'
import { INGREDIENTS, fmt } from '../data/ingredients'
import { useTodayMenu } from '../systems/todaymenu'
import { useDay } from '../systems/day'
import { usePantry } from '../systems/pantry'
import { sfx } from '../systems/sound'

// Today's Menu (before opening) and the Recipe Book (any time). Both read data/menu.ts: one recipe source.
export const useBook = create<{ open: boolean; item: string | null; show: (id?: string) => void; close: () => void }>((set) => ({
  open: false, item: null, show: (id) => set({ open: true, item: id ?? null }), close: () => set({ open: false, item: null }),
}))

function Status({ m }: { m: MenuItem }) {
  const day = useDay((d) => d.day), stock = usePantry((p) => p.stock)
  if (!unlocked(m, day)) return <span className="tm-tag lock">🔒 Day {m.unlockDay}</span>
  const miss = missing(m, stock)
  if (miss.length) return <span className="tm-tag low">needs {miss.map((l) => INGREDIENTS[l.id].label).join(', ')}</span>
  return <span className="tm-tag ok">✓ can make</span>
}

/** one recipe, shared by the menu and the book: ingredients (tap one for a closer look) and the steps, per station */
export function RecipeView({ m }: { m: MenuItem }) {
  const [focus, setFocus] = useState<Line | null>(null)
  return (
    <div className="rv">
      <div className="rv-h"><span className="rv-icon">{m.icon}</span><div><b>{m.name}</b><span>{m.about}</span>
        <span className="rv-meta">💰 {m.price} · ⏱ ~{m.minutes} min · {m.stations.map((s) => STATION_NAME[s]).join(' → ')}</span></div></div>
      <div className="rv-cols">
        <div className="rv-ing">
          <div className="rv-sub">Ingredients <small>(for one, medium)</small></div>
          {m.ingredients.map((l) => (
            <button key={l.id} className={`rv-line ${focus?.id === l.id ? 'on' : ''}`} onClick={() => { sfx.tap(); setFocus(focus?.id === l.id ? null : l) }}>
              <span className="rv-i">{INGREDIENTS[l.id].icon}</span><span className="rv-n">{INGREDIENTS[l.id].label}</span><span className="rv-q">{fmt(l.id, l.qty)}</span>
            </button>))}
          {focus && <div className="rv-focus"><span>{INGREDIENTS[focus.id].icon}</span><b>{INGREDIENTS[focus.id].label}</b><em>{fmt(focus.id, focus.qty)}</em><p>{focus.role}</p></div>}
        </div>
        <ol className="rv-steps">{m.steps.map((s, i) => <li key={i}><span className={`rv-st ${s.at}`}>{STATION_NAME[s.at]}</span>{s.text}{s.equipment && <small> · {s.equipment}</small>}</li>)}</ol>
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
        <div className="tm-top"><div><div className="tm-h">Today's Menu · Day {day}</div><div className="tm-sub">pick what you'll sell today: customers only order these</div></div>
          <button className="tm-x" onClick={t.close} aria-label="close">✕</button></div>
        {item ? <><RecipeView m={item} /><div className="tm-foot"><button onClick={() => setPeek(null)}>← back to the menu</button></div></> : <>
          <div className="tm-list">{cats.map((c) => (
            <section key={c.id}><div className="tm-cat">{c.label}</div>
              <div className="tm-grid">{MENU.filter((m) => m.category === c.id).map((m) => {
                const can = unlocked(m, day), on = t.ids.includes(m.id) && can
                return (
                  <div key={m.id} className={`tm-item ${on ? 'on' : ''} ${can ? '' : 'locked'}`} data-item={m.id}>
                    <button className="tm-pick" disabled={!can} onClick={() => { sfx.tap(); t.toggle(m.id) }}>
                      <span className="tm-icon">{m.icon}</span><span className="tm-name">{m.name}</span><span className="tm-tick">{on ? '✓' : '+'}</span></button>
                    <div className="tm-row"><Status m={m} /><button className="tm-peek" onClick={() => setPeek(m.id)}>recipe</button></div>
                  </div>)
              })}</div>
            </section>))}
          </div>
          <div className="tm-presets">
            {t.presets.map((p) => <button key={p.name} onClick={() => { sfx.tap(); t.setIds(p.ids) }}>{p.name}</button>)}
            {naming ? <span className="tm-name-in"><input autoFocus maxLength={20} value={pname} onChange={(e) => setPname(e.target.value)} placeholder="name it" />
              <button disabled={!pname.trim()} onClick={() => { t.savePreset(pname.trim()); setNaming(false); setPname('') }}>save</button></span>
              : <button className="ghost" onClick={() => setNaming(true)}>＋ save this menu</button>}
          </div>
          <div className="tm-foot">
            <span className="tm-count">{chosen.length} item{chosen.length === 1 ? '' : 's'} on today's menu</span>
            <button className="tm-go" disabled={!chosen.length} onClick={() => { sfx.bell(); t.confirm(day) }}>Confirm &amp; open the café ☕</button>
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
        <div className="tm-top"><div><div className="tm-h">📖 Recipe Book</div><div className="tm-sub">every recipe you've unlocked ({known.length})</div></div>
          <button className="tm-x" onClick={b.close} aria-label="close">✕</button></div>
        <div className="book-cols">
          <div className="book-index">{known.map((m) => <button key={m.id} className={m.id === item?.id ? 'on' : ''} onClick={() => { sfx.tap(); b.show(m.id) }}>{m.icon} {m.name}</button>)}</div>
          {item && <RecipeView m={item} />}
        </div>
      </div>
    </div>
  )
}
if (typeof window !== 'undefined') (window as unknown as { __book: typeof useBook }).__book = useBook
