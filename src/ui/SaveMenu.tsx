import { useState } from 'react'
import { SLOT_IDS, summary, newGame, switchTo, deleteSlot, listSlots, latest, type Mode, type SlotId, type Summary } from '../systems/saves'
import { sfx } from '../systems/sound'

// S1: New Game (pick an empty slot → Story or Zen) and Load Game (all three slots), in the game's own menu style.
// Every change of playthrough reloads the page, so each system starts clean from the slot's own data;
// `bwc.boot` (sessionStorage) tells the menu what to do after that reload.
export type Boot = 'new' | 'continue'
const BOOT = 'bwc.boot'
export function takeBoot(): Boot | null { try { const b = sessionStorage.getItem(BOOT) as Boot | null; sessionStorage.removeItem(BOOT); return b } catch { return null } }
function reloadInto(b: Boot) { try { sessionStorage.setItem(BOOT, b) } catch { /* private mode: lands on the title */ } location.reload() }

const MODES: { id: Mode; title: string; sub: string }[] = [
  { id: 'story', title: '📖 Story Mode', sub: 'meet Mira, Theo and Juno, borrow, build, grow. Story chapters arrive in December; this save keeps its own Story progress' },
  { id: 'zen', title: '🌿 Zen Mode', sub: 'no pressure, no loans: just your café, your town and a good cup' },
]
export const modeLabel = (m: Mode | null) => m === 'story' ? '📖 Story' : m === 'zen' ? '🌿 Zen' : 'Mode not set (older save)'
const date = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** Continue: the most recently played valid slot. Already loaded → just play; otherwise switch and reload. */
export function continueGame(play: () => void) {
  const l = latest(); if (!l) return
  if (listSlots().active === l.id) { play(); return }
  switchTo(l.id); reloadInto('continue')
}

function SlotCard({ s, n, children, onClick, pick }: { s: Summary | null; n: SlotId; children?: React.ReactNode; onClick?: () => void; pick?: boolean }) {
  const active = listSlots().active === n
  return (
    <div className={`slot ${s ? '' : 'empty'} ${pick ? 'pick' : ''}`} data-slot={n} onClick={onClick}>
      <div className="slot-h">Slot {n}{active && s && <span className="slot-now">playing</span>}</div>
      {s ? <>
        <div className="slot-name">{s.name || 'Kozie'}</div>
        <div className={`slot-mode ${s.meta.mode ?? 'none'}`}>{modeLabel(s.meta.mode)}</div>
        {s.ok ? <div className="slot-prog">Day {s.day} · 💰 {s.bank} · ⭐ {s.stars}</div> : <div className="slot-prog bad">⚠ this save can't be read</div>}
        <div className="slot-dates">started {date(s.meta.created)}<br />played {date(s.meta.lastPlayed)}</div>
      </> : <div className="slot-free">empty</div>}
      <div className="slot-btns">{children}</div>
    </div>
  )
}

function Confirm({ text, yes, onYes, onNo }: { text: string; yes: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="slot-confirm" role="alertdialog">
      <p>{text}</p>
      <div className="row"><button className="danger" onClick={onYes}>{yes}</button><button onClick={onNo}>Cancel</button></div>
    </div>
  )
}

export function NewGame({ onBack }: { onBack: () => void }) {
  const [slot, setSlot] = useState<SlotId | null>(null), [ask, setAsk] = useState<SlotId | null>(null)
  const all = SLOT_IDS.map((n) => summary(n))
  const begin = (mode: Mode) => {
    if (!slot) return
    sfx.tap()
    if (summary(slot)) deleteSlot(slot) // replacing: confirmed already
    newGame(slot, mode); reloadInto('new')
  }
  return (
    <div className="panel slots-panel">
      <div className="logo small">{slot ? 'Story or Zen?' : 'New game: pick a slot'}</div>
      {!slot && <div className="slots">{all.map((s, i) => {
        const n = SLOT_IDS[i]
        return <SlotCard key={n} s={s} n={n} pick={!s} onClick={!s ? () => { sfx.tap(); setSlot(n) } : undefined}>
          {s ? <button className="danger" onClick={(e) => { e.stopPropagation(); setAsk(n) }}>Replace…</button> : <button>Start here</button>}
        </SlotCard>
      })}</div>}
      {slot && <div className="modes">{MODES.map((m) => <button key={m.id} className="big" data-mode={m.id} onClick={() => begin(m.id)}><b>{m.title}</b><span>{m.sub}</span></button>)}</div>}
      {ask && <Confirm text={`Replace Slot ${ask}? ${all[ask - 1]?.name || 'Kozie'}'s ${modeLabel(all[ask - 1]?.meta.mode ?? null)} café (Day ${all[ask - 1]?.day}) will be deleted. This can't be undone.`}
        yes="Yes, replace it" onYes={() => { setSlot(ask); setAsk(null) }} onNo={() => setAsk(null)} />}
      <div className="row"><button onClick={() => (slot ? setSlot(null) : onBack())}>← Back</button></div>
    </div>
  )
}

export function LoadGame({ onBack, play }: { onBack: () => void; play: () => void }) {
  const [, redraw] = useState(0), [ask, setAsk] = useState<SlotId | null>(null)
  const all = SLOT_IDS.map((n) => summary(n))
  const load = (n: SlotId) => { sfx.tap(); if (listSlots().active === n) { play(); return } switchTo(n); reloadInto('continue') }
  const del = (n: SlotId) => { const wasActive = listSlots().active === n; deleteSlot(n); setAsk(null); if (wasActive) location.reload(); else redraw((x) => x + 1) }
  return (
    <div className="panel slots-panel">
      <div className="logo small">Load game</div>
      <div className="slots">{all.map((s, i) => {
        const n = SLOT_IDS[i]
        return <SlotCard key={n} s={s} n={n}>
          {s && <><button disabled={!s.ok} onClick={() => load(n)}>Load</button><button className="danger" onClick={() => setAsk(n)}>Delete…</button></>}
        </SlotCard>
      })}</div>
      {ask && <Confirm text={`Delete Slot ${ask}? ${all[ask - 1]?.name || 'Kozie'}'s café (Day ${all[ask - 1]?.day}) will be gone for good.`} yes="Yes, delete it" onYes={() => del(ask)} onNo={() => setAsk(null)} />}
      <div className="row"><button onClick={onBack}>← Back</button></div>
    </div>
  )
}
