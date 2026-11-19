import { useEffect, useState } from 'react'
import { TOUCH } from '../systems/CameraRig'
import { sfx } from '../systems/sound'

// How to play, shown with real pictures of the game: what the café is, the coffee bar, the cake bench, the town,
// the three views, and the end of the day. First-time players see it before making their character, so they
// know what this is and what to do; it's also in the menu.
const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
const img = (n: string) => `${BASE}howto/${n}.jpg`
type Slide = { pic: string | string[]; title: string; text: string; caps?: string[] }
const SLIDES: Slide[] = [
  { pic: 'cafe', title: 'Your café lives in a teapot ☕', text: 'Townsfolk come in for coffee, sit down, sip and gossip. You run the whole place.' },
  { pic: 'coffee', title: 'Take an order, brew it by hand', text: TOUCH ? 'Drag a glass onto the mat, hold the machine for a shot, steam the milk, pour, then serve. Kozie teaches your first two.' : 'Drag a glass onto the mat, hold the machine for a shot, steam the milk, pour, then serve. Kozie teaches your first two.' },
  { pic: 'cake', title: 'Bake cakes to order 🎂', text: TOUCH ? 'Slide the cake along the belt with ◀ ▶ and tap the dispensers: tin, sponge, filling, frosting, toppings.' : 'Slide the cake along the belt with ◀ ▶ and click the dispensers: tin, sponge, filling, frosting, toppings.' },
  { pic: 'town', title: 'Step out into the town', text: 'Real shops sell your beans, milk and flour. Marshmallows live to the west, notebooks to the east.' },
  { pic: ['view-explore', 'view-fp', 'view-dollhouse'], caps: ['🚶 Explore', '👁 First person', '🏠 Dollhouse'], title: 'Three ways to look',
    text: TOUCH ? 'Tap the floor to walk. Drag one finger to look around. Switch views at the top right.' : 'W A S D to walk, drag to look around, E to do things. Switch views with 1 / 2 / 3.' },
  { pic: 'night', title: 'Close up, wind down 🌙', text: 'At closing time flip the sign, then wipe a table and say goodnight to your regulars.' },
]

export function HowTo({ onDone, doneLabel }: { onDone: () => void; doneLabel: string }) {
  const [i, setI] = useState(0), s = SLIDES[i], last = i === SLIDES.length - 1
  const go = (d: number) => { const n = i + d; if (n < 0) return; if (n >= SLIDES.length) { onDone(); return } sfx.tap(); setI(n) }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') go(1); if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })
  // swipe on phones
  const [x0, setX0] = useState<number | null>(null)
  return (
    <div className="howto" onPointerDown={(e) => { e.stopPropagation(); setX0(e.clientX) }} onPointerUp={(e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1); setX0(null) }}>
      <div className="ht-card" key={i}>
        <div className={'ht-pic' + (Array.isArray(s.pic) ? ' trio' : '')}>
          {(Array.isArray(s.pic) ? s.pic : [s.pic]).map((p, k) => <figure key={p}><img src={img(p)} alt="" draggable={false} />{s.caps && <figcaption>{s.caps[k]}</figcaption>}</figure>)}
        </div>
        <div className="ht-body">
          <div className="ht-step">how to play · {i + 1} / {SLIDES.length}</div>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
          <div className="ht-nav">
            <div className="ht-dots">{SLIDES.map((_, k) => <i key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
            {i > 0 && <button className="ht-back" onClick={() => go(-1)}>‹ back</button>}
            <button className="ht-next" onClick={() => go(1)}>{last ? doneLabel : 'next ›'}</button>
          </div>
          {!last && <button className="ht-skip" onClick={onDone}>skip</button>}
        </div>
      </div>
    </div>
  )
}
