import { useEffect, useState } from 'react'
import { useGame, type CamMode } from '../systems/store'
import { useShop } from '../systems/shop'
import { useClock } from '../systems/clock'
import { view, setSens } from '../systems/CameraRig'
import { CREDITS } from '../data/credits'
import { useAvatar } from '../systems/avatar'
import { Creator } from './Creator'
import { autoFullscreen } from './FullscreenButton'
import { HowTo } from './HowTo'
import { TitleBoard } from './TitleBoard'
import { PlayTri, Spark, Load, Book, Gear } from './icons'
import { useBook } from './TodaysMenu'
import { useTodayMenu } from '../systems/todaymenu'
import { NewGame, LoadGame, continueGame, takeBoot, modeLabel } from './SaveMenu'
import { latest, listSlots } from '../systems/saves'

// ── The game's front end: title screen → main menu → play, with a pause menu (Esc) ──────────
export type Screen = 'title' | 'main' | 'howto' | 'settings' | 'credits' | 'playing' | 'paused' | 'creator' | 'newgame' | 'load'

const load = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }
// phones and tablets start on Low (cooler, longer battery); laptops on High. Either can be changed in Settings.
const COARSE = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
export const quality = { high: load('quality', COARSE ? 'low' : 'high') === 'high' }

// the places you can play, each with its own camera
const PLAY: { id: CamMode; title: string; sub: string; shop?: boolean }[] = [
  { id: 'walk', title: '▶ Play', sub: 'Step into your café: open up, serve the town, explore the street' },
  { id: 'pov', title: 'Open the Café', sub: 'Stand behind the bar and make drinks for customers', shop: true },
  { id: 'cake', title: 'Bake Cakes', sub: 'Bake, fill, frost and decorate cakes to order', shop: true },
  { id: 'dollhouse', title: 'Café View', sub: 'See the whole café from above, spin it round' },
]

export function Menu({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const setMode = useGame((s) => s.setMode), mode = useGame((s) => s.mode)
  const [sens, set] = useState(view.sens)
  const [hq, setHq] = useState(quality.high)
  const realTime = useClock((st) => st.real)
  const [pending, setPending] = useState<typeof PLAY[number] | null>(null), [firstRun, setFirstRun] = useState(false)

  // title + menu screens: a still front view of the café (no sway: a moving camera made the menu stutter);
  // the game also draws at a calmer 20 fps here (see startLoop), so the laptop / phone stays cool. Any key / click continues
  useEffect(() => {
    if (screen !== 'title' && screen !== 'main' && screen !== 'howto' && screen !== 'settings' && screen !== 'credits' && screen !== 'newgame' && screen !== 'load') return
    setMode('exterior')
    view.yaw = 0; view.pitch = 0; view.zoom = 1.15
    const go = () => screen === 'title' && leaveTitle()
    window.addEventListener('keydown', go)
    return () => window.removeEventListener('keydown', go)
  }, [screen, setMode, setScreen])

  // after a New Game / Load / Continue reload: go straight on (new → how to play → creator; continue → your café)
  useEffect(() => {
    const b = takeBoot(); if (!b) return
    if (b === 'new') { setPending(PLAY[0]); setFirstRun(true); setScreen('howto') } else start(PLAY[0])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Esc pauses / resumes; Tab hops to the next station while playing
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.pointerLockElement) { if (screen === 'playing') setScreen('paused'); else if (screen === 'paused') setScreen('playing') }
      if (e.key === 'Tab' && screen === 'playing') { e.preventDefault(); const i = PLAY.findIndex((p) => p.id === mode); start(PLAY[(i + 1) % PLAY.length]) }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  // first visit: straight from the title to making your character, then into your café (Kozie's tour starts there).
  // Returning players get the menu.
  const leaveTitle = () => { autoFullscreen(); setScreen('main') }
  const start = (p: typeof PLAY[number]) => {
    autoFullscreen()
    if (!useAvatar.getState().made) { setPending(p); setScreen('creator'); return } // first time: make your character
    setMode(p.id); if (p.shop && !useShop.getState().open) useShop.getState().openShop(true); setScreen('playing') } // the day starts from the 'Open the café' button

  if (screen === 'creator') return <Creator onDone={() => { const p = pending; setPending(null); if (p) start(p); else setScreen(mode === 'exterior' ? 'main' : 'paused') }} />

  // first visit: how to play (with pictures) → make your character → your café
  if (screen === 'howto') return <HowTo doneLabel={firstRun ? 'make your character ✨' : 'back to the menu'} onDone={() => { if (firstRun) { setFirstRun(false); setScreen('creator') } else setScreen(mode === 'exterior' ? 'main' : 'paused') }} />

  if (screen === 'playing') return (
    <button className="menubtn" onClick={() => setScreen('paused')}>☰ Menu <span>Esc</span></button>
  )

  return (
    <div className={`gmenu ${screen === 'title' ? 'title-screen' : ''}`} onClick={() => { if (screen === 'title') leaveTitle() }}>
      {screen === 'title' && (
        <div className="title-wrap">
          <h1 className="sr-only">Brewed With Code</h1><TitleBoard />
          <div className="tagline">a cosy café you run yourself</div>
          <div className="press">tap or press any key</div>
        </div>
      )}

      {screen === 'main' && (() => {
        const l = latest(), playing = l && listSlots().active === l.id
        return (
          <div className="panel title-menu">
            <TitleBoard />
            {l ? <button className="tmb primary" data-act="continue" onClick={() => continueGame(() => start(PLAY[0]))}>
              <PlayTri size={22} /><span>Continue<small>{l.name || 'Kozie'} · Day {l.day}</small></span></button>
              : <button className="tmb primary" data-act="new" onClick={() => setScreen('newgame')}><PlayTri size={22} /><span>New Game</span></button>}
            {l && <button className="tmb" data-act="new" onClick={() => setScreen('newgame')}><Spark size={22} /><span>New Game</span></button>}
            <button className="tmb" data-act="load" onClick={() => setScreen('load')}><Load size={22} /><span>Load Game</span></button>
            <button className="tmb" data-act="howto" onClick={() => setScreen('howto')}><Book size={22} /><span>How to Play</span></button>
            <button className="tmb" data-act="settings" onClick={() => setScreen('settings')}><Gear size={22} /><span>Settings</span></button>
            <div className="tm-links"><button onClick={() => setScreen('credits')}>Credits</button><button onClick={() => setScreen('title')}>Title screen</button></div>
          </div>
        )
      })()}

      {screen === 'newgame' && <NewGame onBack={() => setScreen('main')} />}
      {screen === 'load' && <LoadGame onBack={() => setScreen('main')} play={() => start(PLAY[0])} />}

      {screen === 'paused' && (
        <div className="panel">
          <div className="logo small">Paused</div>
          <button className="big" onClick={() => setScreen('playing')}><b>Resume</b><span>back to where you were</span></button>
          <div className="row">{PLAY.map((p) => <button key={p.id} className={p.id === mode ? 'on' : ''} onClick={() => start(p)}>{p.title}</button>)}</div>
          <div className="row">
            <button onClick={() => setScreen('creator')}>Your character</button>
            <button onClick={() => setScreen('howto')}>How to play</button>
            <button data-act="book" onClick={() => useBook.getState().show()}>📖 Recipe Book</button>
            <button data-act="todaymenu" onClick={() => useTodayMenu.getState().ask(() => {})}>🗒 Today's Menu</button>
            <button onClick={() => setScreen('settings')}>Settings</button>
            <button onClick={() => { useShop.getState().openShop(false); setScreen('main') }}>Main menu</button>
            <button onClick={() => { useShop.getState().openShop(false); setMode('exterior'); setScreen('title') }}>Title screen</button>
          </div>
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
