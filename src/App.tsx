import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { useGame, type CamMode } from './systems/store'
import { CameraRig } from './systems/CameraRig'
import { Exterior } from './world/Exterior'
import { Interior } from './world/Interior'
import { Barista } from './world/Barista'
import { Reveal } from './world/Reveal'
import { Kozie } from './world/Kozie'

const MODES: { id: CamMode; label: string; key: string }[] = [
  { id: 'exterior', label: 'Outside', key: '1' },
  { id: 'dollhouse', label: 'Dollhouse', key: '2' },
  { id: 'walk', label: 'Walk', key: '3' },
  { id: 'pov', label: 'Barista', key: '4' },
]

export function World() {
  const mode = useGame((s) => s.mode)
  const inside = mode !== 'exterior'
  const outro = mode === 'outro'
  const kozie = useGame((s) => s.kozie)
  return (
    <>
      <hemisphereLight args={['#ffe6f6', '#b48ac0', 0.75]} />
      <directionalLight
        position={[12, 18, 10]} intensity={1.35} color="#ffe9e0" castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20}
      />
      <Exterior showPot={!inside || outro} fadeIn={outro} />
      {inside && <Interior cutaway={mode === 'dollhouse' || mode === 'pov' || outro} pov={mode === 'pov'} />}
      {inside && mode !== 'pov' && <Reveal id="barista" at={[0.4, 0, 2.4]}><Barista /></Reveal>}
      {kozie && <Kozie />}
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

export default function App() {
  const mode = useGame((s) => s.mode)
  const setMode = useGame((s) => s.setMode)
  const [shownFps, setShownFps] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setShownFps(fps), 500)
    const onKey = (e: KeyboardEvent) => { const m = MODES.find((m) => m.key === e.key); if (m) setMode(m.id) }
    window.addEventListener('keydown', onKey)
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey) }
  }, [setMode])

  return (
    <>
      <Canvas flat shadows dpr={[1, 1.5]} camera={{ fov: 45, position: [15, 9, 25] }} gl={{ antialias: true }}>
        <color attach="background" args={['#e2c9fb']} />
        <World />
      </Canvas>
      <div className="hud">
        <div className="title">Brewed With Code</div>
        <div className="modes">
          {MODES.map((m) => (
            <button key={m.id} className={m.id === mode ? 'on' : ''} onClick={() => setMode(m.id)}>
              <span>{m.key}</span>{m.label}
            </button>
          ))}
        </div>
        {mode === 'walk' && <div className="hint">WASD / arrows to walk</div>}
      </div>
      <div className="fps">{shownFps} fps</div>
    </>
  )
}
