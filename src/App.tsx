import { WORLD } from './world/layout'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { useGame, type CamMode } from './systems/store'
import { CameraRig } from './systems/CameraRig'
import { Exterior } from './world/Exterior'
import { Interior } from './world/Interior'
import { Hotspots } from './world/Hotspots'
import { Barista } from './world/Barista'
import { PlayerAvatar } from './world/PlayerAvatar'
import { StreetLife } from './world/StreetLife'
import { RR as ROOM_R } from './world/layout'
import { Reveal } from './world/Reveal'
import { Lighting } from './world/Lighting'
import { Kozie } from './world/Kozie'
import { Customers, cafe as cafeLine } from './world/Customers'
import { ShopHud } from './ui/ShopHud'
import { HoldRing } from './ui/HoldRing'
import { FolkLineup, FolkGallery, SHOW_FOLK } from './world/Folk'
import { StreetShop, PantryNote } from './ui/StreetShop'
import { RecipeCard } from './ui/RecipeCard' // made by hand (the old meter HUD, ui/BrewHud.tsx, is kept for reference)
import { DayHud } from './ui/DayHud'
import { MusicButton } from './ui/MusicButton'
import { CakeHud } from './ui/CakeHud'
import { Joystick } from './ui/Joystick'
import { Landscape } from './ui/Landscape'
import { Street } from './world/Street'
import { Neighbours } from './world/Neighbours'
import { ClockChip } from './ui/ClockChip'
import { Credits } from './ui/Credits'
import { TOUCH } from './systems/CameraRig'
import { LookHint } from './ui/LookHint'
import { useCake } from './systems/cake'
import { useShop } from './systems/shop'
import { Menu, quality, type Screen } from './ui/Menu'
const SNAP = location.search.includes('snap')
;(window as any).game = { shop: useShop, line: cafeLine } // handy for testing in the console
;(window as any).__cake = useCake

// the playable game: customers arrive and get served on their own
const REEL = location.pathname.includes('reel') // reels film from angles the player never sees: draw everything
cafeLine.auto = !REEL

const MODES: { id: CamMode; label: string; key: string }[] = [
  { id: 'exterior', label: 'Outside', key: '1' },
  { id: 'dollhouse', label: 'Dollhouse', key: '2' },
  { id: 'walk', label: 'Walk', key: '3' },
  { id: 'pov', label: 'Barista', key: '4' },
  { id: 'cake', label: 'Cakes', key: '5' },
]

export function World() {
  const mode = useGame((s) => s.mode)
  useEffect(() => { if (!REEL) document.body.classList.toggle('notags', mode === 'walk') }, [mode])
  useEffect(() => { document.body.classList.toggle('station-cursor', mode === 'pov' || mode === 'cake') }, [mode]) // the game's own arrow cursor at the stations
  const inside = mode !== 'exterior'
  const outro = mode === 'outro'
  const kozie = useGame((s) => s.kozie)
  // Explore is third person: inside the café the roof cuts away (you look in from above); outside the pot shows
  const [indoors, setIndoors] = useState(true)
  useFrame(() => { const p = useGame.getState().player, i = Math.hypot(p.x, p.z) < ROOM_R - 0.5; if (i !== indoors) setIndoors(i) })
  const walkIn = mode === 'walk' && indoors
  return (
    <>
      <Lighting />
      <group scale={WORLD}>
      {/* zone culling (like occlusion culling): rooms you can't see from this view aren't drawn at all.
          Behind the bar or at the cake machine you face a wall, so the whole outdoors is skipped. */}
      <group visible={REEL || (mode !== 'pov' && mode !== 'cake')}><Exterior showPot={!inside || outro || (mode === 'walk' && !indoors)} fadeIn={outro} />{!outro && <><Street /><Neighbours /><StreetLife /></>}</group>
      {inside && SHOW_FOLK && <FolkLineup />}
      {SHOW_FOLK && <FolkGallery />}
      {inside && <Interior cutaway={mode === 'dollhouse' || outro || walkIn} pov={mode === 'pov'} only={REEL ? '' : mode === 'pov' ? 'bar' : mode === 'cake' ? 'kitchen' : ''} />}
      {REEL && inside && mode !== 'pov' && mode !== 'vlog' && mode !== 'walk' && <Reveal id="barista" at={[0.4, 0, 2.4]}><Barista /></Reveal>}
      {!REEL && (mode === 'walk' || mode === 'dollhouse') && <PlayerAvatar />}
      {inside && <Customers />}
      {inside && <Hotspots />}
      {kozie && <Kozie />}
      </group>
      <CameraRig />
      <FpsProbe />
    </>
  )
}

// Tiny FPS meter: the UHD 620 budget check from CLAUDE.md
let fps = 0
function FpsProbe() {
  const acc = useRef({ t: 0, n: 0 })
  useFrame((_, dt) => {
    acc.current.t += dt; acc.current.n++
    if (acc.current.t > 0.5) { fps = Math.round(acc.current.n / acc.current.t); acc.current = { t: 0, n: 0 } }
  })
  return null
}

// our own game loop: at most 40 frames a second (30 on Low), so the GPU isn't flat out and the laptop stays cool
function startLoop(s: { advance: (t: number) => void }) {
  const cap = 1000 / (quality.high ? 40 : 30); let last = 0
  const tick = (t: number) => { if (t - last >= cap - 1) { last = t; s.advance(t / 1000) } requestAnimationFrame(tick) } // advance() takes SECONDS (ms made everything shake)
  requestAnimationFrame(tick)
}

export default function App() {
  const mode = useGame((s) => s.mode)
  const setMode = useGame((s) => s.setMode)
  const [shownFps, setShownFps] = useState(0)
  const [screen, setScreen] = useState<Screen>(SNAP ? 'playing' : 'title')
  const playing = SNAP || screen === 'playing'
  useEffect(() => {
    const id = setInterval(() => setShownFps(fps), 500)
    const onKey = (e: KeyboardEvent) => { if (!SNAP) return; const m = MODES.find((m) => m.key === e.key); if (m) setMode(m.id) }
    window.addEventListener('keydown', onKey)
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey) }
  }, [setMode])

  return (
    <>
      <Canvas frameloop={SNAP ? 'always' : 'never'} onCreated={(s) => { (window as any).__r3f = s; if (!SNAP) startLoop(s) }} flat shadows={quality.high} dpr={quality.high ? 1 : 0.75} camera={{ fov: 45, position: [15, 9, 25] }} gl={{ antialias: quality.high, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#dfccf6']} />
        <World />
      </Canvas>
      {/* tests (?snap) skip the menus and keep the old mode bar */}
      {SNAP && <div className="hud"><div className="modes">
        {MODES.map((m) => <button key={m.id} className={m.id === mode ? 'on' : ''} onClick={() => setMode(m.id)}><span>{m.key}</span>{m.label}</button>)}
      </div></div>}
      {playing && !SNAP && (mode === 'pov' || mode === 'cake' || mode === 'dollhouse' || mode === 'walk') && <DayHud />}
      {playing && mode === 'pov' && <RecipeCard />}
      {playing && mode === 'pov' && <HoldRing />}
      {playing && mode === 'walk' && <StreetShop />}
      {playing && <PantryNote />}
      {playing && mode !== 'cake' && mode !== 'pov' && <ShopHud />}
      {playing && <CakeHud />}
      {SNAP && <Credits />}
      {playing && (TOUCH ? mode !== 'cake' && mode !== 'pov' && <Joystick /> : mode !== 'pov' && <LookHint mode={mode} />)}
      {playing && mode === 'walk' && <div className="crosshair" />}
      {!SNAP && <MusicButton />}
      {(!SNAP || location.pathname.includes('play')) && <ClockChip />}
      {!SNAP && <Landscape />}
      {!SNAP && <Menu screen={screen} setScreen={setScreen} />}
      <div className="fps">{shownFps} fps</div>
    </>
  )
}
