import { useEffect, useState } from 'react'
import { TOUCH } from '../systems/CameraRig'
import { sfx } from '../systems/sound'

// How to play, shown with real pictures of the game: what the café is, the coffee bar, the cake bench, the town,
// the three views, and the end of the day. First-time players see it before making their character, so they
// know what this is and what to do; it's also in the menu.
const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
const img = (n: string) => `${BASE}howto/${n}.jpg`
type Slide = { pic: string | string[]; title: string; text: string; caps?: string[] }
const T = TOUCH ? 'Tap' : 'Click', t = TOUCH ? 'tap' : 'click'
const SLIDES: Slide[] = [
  { pic: 'cafe', title: 'Your café lives in a teapot', text: 'Townsfolk come in for coffee and cake, sit down, sip and chat. You run the whole place: the coffee counter, the kitchen and the cake bench.' },
  { pic: 'menu', title: "Plan today's menu", text: `Walk to the door and flip the sign to OPEN. First you pick what to sell today: customers only order what's on it. ${T} the (i) on any item to see its recipe.` },
  { pic: 'coffee', title: 'Brew coffee by hand', text: 'Drag a glass onto the mat, hold the machine for a shot, steam the milk at the wand, pour, then drag it to the pass to serve. Kozie walks you through your first two.' },
  { pic: 'kitchen', title: 'Mix batter in the kitchen', text: `Go through the pink curtains next to the coffee counter. Pick a flavour, ${t} the flour, sugar, eggs and butter (and cocoa or strawberries), then hold the whisk to stir. The batter goes on the shelf for the cake bench.` },
  { pic: 'cake', title: 'Bake cakes to order', text: `The order shows on the board on the left, so remember it. ${T} the picture buttons under each machine in order, 1 to 6: the cake rolls there and gets it. Roll it onto the star to serve.` },
  { pic: 'town', title: 'Step out into the town', text: 'Real shops sell your beans, milk and flour. Marshmallows live to the west, notebooks to the east.' },
  { pic: ['view-explore', 'view-fp', 'view-dollhouse'], caps: ['Explore', 'First person', 'Dollhouse'], title: 'Three ways to look',
    text: TOUCH ? 'Tap the floor (or drag one finger) to walk. Two fingers to look around, pinch to zoom. Switch views with the button.' : 'W A S D to walk, drag to look around, E to do things. Switch views with 1 / 2 / 3.' },
  { pic: 'night', title: 'Close up, wind down', text: 'At 8 pm the café closes. Flip the sign, clear the last cups and say goodnight to your regulars.' },
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
