import { WORLD } from './world/layout'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { useGame, type CamMode } from './systems/store'
import { CameraRig } from './systems/CameraRig'
import { Exterior } from './world/Exterior'
import { Interior } from './world/Interior'
import { Hotspots } from './world/Hotspots'
import { Barista } from './world/Barista'
import { Reveal } from './world/Reveal'
import { Lighting } from './world/Lighting'
import { Kozie } from './world/Kozie'
import { Customers, cafe as cafeLine } from './world/Customers'
import { ShopHud } from './ui/ShopHud'
import { BrewHud } from './ui/BrewHud'
import { CakeHud } from './ui/CakeHud'
import { Joystick } from './ui/Joystick'
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
cafeLine.auto = !location.pathname.includes('reel')

const MODES: { id: CamMode; label: string; key: string }[] = [
  { id: 'exterior', label: 'Outside', key: '1' },
  { id: 'dollhouse', label: 'Dollhouse', key: '2' },
  { id: 'walk', label: 'Walk', key: '3' },
  { id: 'pov', label: 'Barista', key: '4' },
  { id: 'cake', label: 'Cakes', key: '5' },
]

export function World() {
  const mode = useGame((s) => s.mode)
  const inside = mode !== 'exterior'
  const outro = mode === 'outro'
  const kozie = useGame((s) => s.kozie)
  return (
    <>
      <Lighting />
      <group scale={WORLD}>
      <Exterior showPot={!inside || outro} fadeIn={outro} />
      {inside && <Interior cutaway={mode === 'dollhouse' || outro} pov={mode === 'pov'} />}
      {inside && mode !== 'pov' && mode !== 'vlog' && mode !== 'walk' && <Reveal id="barista" at={[0.4, 0, 2.4]}><Barista /></Reveal>}
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
  const tick = (t: number) => { if (t - last >= cap - 1) { last = t; s.advance(t) } requestAnimationFrame(tick) }
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
      {playing && mode === 'pov' && <BrewHud />}
      {playing && mode !== 'cake' && mode !== 'pov' && <ShopHud />}
      {playing && <CakeHud />}
      {SNAP && <Credits />}
      {playing && (TOUCH ? mode !== 'cake' && mode !== 'pov' && <Joystick /> : mode !== 'pov' && <LookHint mode={mode} />)}
      {playing && mode === 'walk' && <div className="crosshair" />}
      {!SNAP && <Menu screen={screen} setScreen={setScreen} />}
      <div className="fps">{shownFps} fps</div>
    </>
  )
}
