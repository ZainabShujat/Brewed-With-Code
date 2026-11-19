import { WORLD } from './world/layout'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { useGame, onFoot, type CamMode } from './systems/store'
import { CameraRig } from './systems/CameraRig'
import { Exterior } from './world/Exterior'
import { Interior } from './world/Interior'
// import { Hotspots } from './world/Hotspots' (retired: stations come from Take order, views from the view bar)
import { Barista } from './world/Barista'
import { TapMarker, PlayerAvatar } from './world/PlayerAvatar'
import { StreetLife } from './world/StreetLife'
import { ParkLife } from './world/ParkLife'
import { Terrain } from './world/Terrain'
import { SugarGarden, ForestEdge } from './world/Landscape'
import { Forest, Townships, TreeBelts } from './world/Scenery'
import { GrassScatter, DistanceCull } from './world/Ground'
import { LampLights } from './world/LampLights'
import { Outskirts } from './world/Outskirts'
import { Keepers } from './world/Keepers'
import { RR as ROOM_R } from './world/layout'
import { Reveal } from './world/Reveal'
import { Lighting } from './world/Lighting'
import { Kozie } from './world/Kozie'
import { Customers, cafe as cafeLine } from './world/Customers'
// import { ShopHud } from './ui/ShopHud' (retired)
import { HoldRing } from './ui/HoldRing'
import { FolkLineup, FolkGallery, SHOW_FOLK } from './world/Folk'
import { StreetShop, PantryNote } from './ui/StreetShop'
import { ModeFade } from './ui/ModeFade'
import { ViewBar } from './ui/ViewBar'
import { TakeOrder, ServeReturn } from './ui/TakeOrder'
import { WindDown } from './ui/WindDown'
import { NavTutorial, useNavTut } from './ui/NavTutorial'
import { Interact } from './ui/Interact'
import { TutorialBubble } from './ui/TutorialBubble'
import { RecipeCard } from './ui/RecipeCard' // made by hand (the old meter HUD, ui/BrewHud.tsx, is kept for reference)
import { DayHud } from './ui/DayHud'
import { MusicButton } from './ui/MusicButton'
import { CakeHud } from './ui/CakeHud'
import { Joystick } from './ui/Joystick'
import { Landscape } from './ui/Landscape'
import { Street } from './world/Street'
import { Neighbours } from './world/Neighbours'
import { ClockChip } from './ui/ClockChip'
import { FullscreenButton } from './ui/FullscreenButton'
import { Credits } from './ui/Credits'
import { TOUCH } from './systems/CameraRig'
import { LookHint } from './ui/LookHint'
import { useCake } from './systems/cake'
import { useShop } from './systems/shop'
import { Menu, quality, type Screen } from './ui/Menu'
const SNAP = location.search.includes('snap')
const SHOW_FPS = location.search.includes('fps') // a dev readout, not for players
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
  useEffect(() => { if (!REEL) document.body.classList.toggle('notags', mode === 'walk' || mode === 'fp') }, [mode])
  useEffect(() => { if (!REEL) document.body.classList.toggle('not-cake', mode !== 'cake') }, [mode]) // the cake machine's labels only at the cake bench
  useEffect(() => { document.body.classList.toggle('station-cursor', mode === 'pov' || mode === 'cake') }, [mode]) // the game's own arrow cursor at the stations
  const inside = mode !== 'exterior'
  const outro = mode === 'outro'
  const kozie = useGame((s) => s.kozie)
  // Explore is third person: inside the café the roof cuts away (you look in from above); outside the pot shows
  const [indoors, setIndoors] = useState(true)
  useFrame(() => { const p = useGame.getState().player, i = Math.hypot(p.x, p.z) < ROOM_R - 0.5; if (i !== indoors) setIndoors(i) })
  const walkIn = mode === 'walk' && indoors // (first person keeps the roof on: you're inside)
  return (
    <>
      <Lighting />
      <group scale={WORLD}>
      {/* zone culling (like occlusion culling): rooms you can't see from this view aren't drawn at all.
          Behind the bar or at the cake machine you face a wall, so the whole outdoors is skipped. */}
      <group visible={REEL || (mode !== 'pov' && mode !== 'cake')}><Exterior showPot={!inside || outro || ((mode === 'walk' || mode === 'fp') && !indoors)} fadeIn={outro} lawn={outro} />{!outro && <><DistanceCull /><LampLights /><group name="p:terrain"><Terrain /></group><group name="p:garden"><SugarGarden /></group><group name="p:edge"><ForestEdge /></group><group name="p:street"><Street /></group><group name="p:neigh"><Neighbours /></group><group name="p:streetlife"><StreetLife /></group><group name="p:park"><ParkLife /></group><group name="p:keepers"><Keepers /></group><group name="p:forest"><Forest /></group><group name="p:belts"><TreeBelts /></group><group name="p:towns"><Townships /></group><group name="p:grass"><GrassScatter /></group><group name="p:outskirts"><Outskirts /></group></>}</group>
      {inside && SHOW_FOLK && <FolkLineup />}
      {SHOW_FOLK && <FolkGallery />}
      {inside && <Interior cutaway={mode === 'dollhouse' || outro || walkIn} pov={mode === 'pov'} only={REEL ? '' : mode === 'pov' ? 'bar' : mode === 'cake' ? 'kitchen' : ''} />}
      {REEL && inside && mode !== 'pov' && mode !== 'vlog' && mode !== 'walk' && <Reveal id="barista" at={[0.4, 0, 2.4]}><Barista /></Reveal>}
      {!REEL && (mode === 'walk' || mode === 'dollhouse') && <PlayerAvatar />}
      {!REEL && (mode === 'walk' || mode === 'fp') && <TapMarker />}
      {inside && <Customers />}
      {/* station hotspots retired */}
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
  const cap = 1000 / (quality.high ? 60 : 30); let last = 0 // even steps of the screen's refresh (40 on a 60 Hz screen juddered)
  const tick = (t: number) => { if (t - last >= ((window as any).__menuIdle ? 50 : cap) - 1) { last = t; s.advance(t / 1000) } requestAnimationFrame(tick) } // advance() takes SECONDS (ms made everything shake)
  requestAnimationFrame(tick)
}

export default function App() {
  const mode = useGame((s) => s.mode)
  const setMode = useGame((s) => s.setMode)
  const navDone = useNavTut((t) => t.done)
  const [shownFps, setShownFps] = useState(0)
  const [screen, setScreen] = useState<Screen>(SNAP ? 'playing' : 'title')
  const playing = SNAP || screen === 'playing'
  useEffect(() => { (window as any).__menuIdle = !playing; document.documentElement.classList.toggle('menuidle', !playing) }, [playing]) // menus: a calm 20 fps (see startLoop) and no floating tags
  useEffect(() => {
    const id = setInterval(() => setShownFps(fps), 500)
    const onKey = (e: KeyboardEvent) => { if (!SNAP) return; const m = MODES.find((m) => m.key === e.key); if (m) setMode(m.id) }
    window.addEventListener('keydown', onKey)
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey) }
  }, [setMode])

  return (
    <>
      <Canvas frameloop={SNAP ? 'always' : 'never'} onCreated={(s) => { (window as any).__r3f = s; if (!SNAP) startLoop(s) }} flat shadows={quality.high} dpr={quality.high ? [1, 1.5] : 0.75} camera={{ fov: 45, position: [15, 9, 25] }} gl={{ antialias: quality.high, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#dfccf6']} />
        <World />
      </Canvas>
      {/* tests (?snap) skip the menus and keep the old mode bar */}
      {SNAP && <div className="hud"><div className="modes">
        {MODES.map((m) => <button key={m.id} className={m.id === mode ? 'on' : ''} onClick={() => setMode(m.id)}><span>{m.key}</span>{m.label}</button>)}
      </div></div>}
      {playing && !SNAP && (mode === 'pov' || mode === 'cake' || mode === 'dollhouse' || mode === 'walk' || mode === 'fp') && <DayHud />}
      {playing && mode === 'pov' && <RecipeCard />}
      {playing && mode === 'pov' && <TutorialBubble />}
      {playing && !SNAP && <ModeFade />}
      {playing && !SNAP && <TakeOrder />}
      {playing && <ServeReturn />}
      {playing && <WindDown />}
      {playing && !SNAP && <NavTutorial />}
      {playing && !SNAP && <Interact />}
      {playing && mode === 'pov' && <HoldRing />}
      {playing && (mode === 'walk' || mode === 'fp') && <StreetShop />}
      {playing && <PantryNote />}
      {/* the old ShopHud (order card + 'back behind the bar') is retired: Take order replaces it */}
      {playing && <CakeHud />}
      {SNAP && <Credits />}
      {playing && (TOUCH ? null /* phones: tap to walk, like a life sim (no joystick) */ : mode !== 'pov' && navDone && <LookHint mode={mode} />)}
      {playing && mode === 'fp' && <div className="crosshair" />}
      {playing && !SNAP && <ViewBar />}
      {!SNAP && <MusicButton />}
      {(!SNAP || location.pathname.includes('play')) && <ClockChip />}
      {!SNAP && <FullscreenButton />}
      {!SNAP && <Landscape />}
      {!SNAP && <Menu screen={screen} setScreen={setScreen} />}
      {SHOW_FPS && <div className="fps">{shownFps} fps</div>}
    </>
  )
}
