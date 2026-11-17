import { useEffect, useState } from 'react'
import { useGame, type CamMode } from '../systems/store'
import { useShop } from '../systems/shop'
import { useClock } from '../systems/clock'
import { view, setSens } from '../systems/CameraRig'
import { CREDITS } from '../data/credits'

// ── The game's front end: title screen → main menu → play, with a pause menu (Esc) ──────────
export type Screen = 'title' | 'main' | 'howto' | 'settings' | 'credits' | 'playing' | 'paused'

const load = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }
export const quality = { high: load('quality', 'high') === 'high' }

// the places you can play, each with its own camera
const PLAY: { id: CamMode; title: string; sub: string; shop?: boolean }[] = [
  { id: 'pov', title: 'Open the Café', sub: 'Stand behind the bar and make drinks for customers', shop: true },
  { id: 'cake', title: 'Bake Cakes', sub: 'Bake, fill, frost and decorate cakes to order', shop: true },
  { id: 'walk', title: 'Explore', sub: 'Walk around the café in first person' },
  { id: 'dollhouse', title: 'Café View', sub: 'See the whole café from above, spin it round' },
]

export function Menu({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const setMode = useGame((s) => s.setMode), mode = useGame((s) => s.mode)
  const [sens, set] = useState(view.sens)
  const [hq, setHq] = useState(quality.high)
  const realTime = useClock((st) => st.real)

  // title screen: the camera slowly circles the café; any key / click continues
  useEffect(() => {
    if (screen !== 'title' && screen !== 'main' && screen !== 'howto' && screen !== 'settings' && screen !== 'credits') return
    setMode('exterior')
    const t0 = performance.now(); view.zoom = 1.15
    const id = setInterval(() => { view.yaw = Math.sin((performance.now() - t0) / 9000) * 0.45 }, 16) // a slow sway, never into the trees
    const go = () => screen === 'title' && setScreen('main')
    window.addEventListener('keydown', go)
    return () => { clearInterval(id); window.removeEventListener('keydown', go) }
  }, [screen, setMode, setScreen])

  // Esc pauses / resumes; Tab hops to the next station while playing
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.pointerLockElement) { if (screen === 'playing') setScreen('paused'); else if (screen === 'paused') setScreen('playing') }
      if (e.key === 'Tab' && screen === 'playing') { e.preventDefault(); const i = PLAY.findIndex((p) => p.id === mode); start(PLAY[(i + 1) % PLAY.length]) }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  const start = (p: typeof PLAY[number]) => { setMode(p.id); if (p.shop && !useShop.getState().open) useShop.getState().openShop(true); setScreen('playing') } // the day starts from the 'Open the café' button

  if (screen === 'playing') return (
    <button className="menubtn" onClick={() => setScreen('paused')}>☰ Menu <span>Esc</span></button>
  )

  return (
    <div className={`gmenu ${screen === 'title' ? 'title-screen' : ''}`} onClick={() => screen === 'title' && setScreen('main')}>
      {screen === 'title' && (
        <div className="title-wrap">
          <div className="logo">Brewed<br />With Code</div>
          <div className="tagline">a cosy café you run yourself</div>
          <div className="press">click or press any key</div>
        </div>
      )}

      {screen === 'main' && (
        <div className="panel">
          <div className="logo small">Brewed With Code</div>
          {PLAY.map((p) => (
            <button key={p.id} className="big" onClick={() => start(p)}><b>{p.title}</b><span>{p.sub}</span></button>
          ))}
          <div className="row">
            <button onClick={() => setScreen('howto')}>How to play</button>
            <button onClick={() => setScreen('settings')}>Settings</button>
            <button onClick={() => setScreen('credits')}>Credits</button>
            <button onClick={() => setScreen('title')}>← Title</button>
          </div>
        </div>
      )}

      {screen === 'paused' && (
        <div className="panel">
          <div className="logo small">Paused</div>
          <button className="big" onClick={() => setScreen('playing')}><b>Resume</b><span>back to where you were</span></button>
          <div className="row">{PLAY.map((p) => <button key={p.id} className={p.id === mode ? 'on' : ''} onClick={() => start(p)}>{p.title}</button>)}</div>
          <div className="row">
            <button onClick={() => setScreen('howto')}>How to play</button>
            <button onClick={() => setScreen('settings')}>Settings</button>
            <button onClick={() => { useShop.getState().openShop(false); setScreen('main') }}>Main menu</button>
            <button onClick={() => { useShop.getState().openShop(false); setMode('exterior'); setScreen('title') }}>Title screen</button>
          </div>
        </div>
      )}

      {screen === 'howto' && (
        <div className="panel text">
          <div className="logo small">How to play</div>
          <p><b>Café:</b> a customer walks up and their order shows on the ticket. Click a tool to pick it up, then click your glass to use it: a glass from the shelf, chocolate, the shot glass under the machine, the milk pitcher, a topping. Follow the steps at the bottom, then serve.</p>
          <p><b>Cakes:</b> memorise the order (peek costs 5%). Move the cake along the belt with ◀ ▶ and click a colour on the dispenser above it: tin, sponge, filling, frosting, rosettes, toppings.</p>
          <p><b>Explore:</b> click to look with the mouse, <b>WASD</b> to walk.</p>
          <p><b>Keys:</b> <b>Esc</b> pause (or the ☰ Menu button, top-left) · <b>Esc</b> again puts a held tool back.</p>
          <button onClick={() => setScreen(mode === 'exterior' ? 'main' : 'paused')}>Back</button>
        </div>
      )}

      {screen === 'settings' && (
        <div className="panel text">
          <div className="logo small">Settings</div>
          <label>Mouse sensitivity <input type="range" min={0.3} max={3} step={0.1} value={sens} onChange={(e) => { const v = Number(e.target.value); set(v); setSens(v) }} /> {sens.toFixed(1)}</label>
          <label>Graphics
            <button className={hq ? 'on' : ''} onClick={() => { save('quality', 'high'); setHq(true); location.reload() }}>High</button>
            <button className={!hq ? 'on' : ''} onClick={() => { save('quality', 'low'); setHq(false); location.reload() }}>Low (cooler, faster)</button>
          </label>
          <label>Time of day
            <button className={!realTime ? 'on' : ''} onClick={() => useClock.getState().setReal(false)}>Game time (1 min = 1 hour)</button>
            <button className={realTime ? 'on' : ''} onClick={() => useClock.getState().setReal(true)}>Real time (your clock)</button>
          </label>
          <button onClick={() => setScreen(mode === 'exterior' ? 'main' : 'paused')}>Back</button>
        </div>
      )}

      {screen === 'credits' && (
        <div className="panel text">
          <div className="logo small">Credits</div>
          {CREDITS.map((c) => <p key={c.url}><b>{c.what}</b>: <a href={c.url} target="_blank" rel="noreferrer">“{c.title}”</a> by {c.author} · {c.license}</p>)}
          <button onClick={() => setScreen('main')}>Back</button>
        </div>
      )}
    </div>
  )
}
