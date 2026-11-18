import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { KozieBody } from '../world/PlayerAvatar'
import { useTutorial } from '../systems/tutorial'
import { nextStep, type Step } from '../systems/targets'
import { useShop } from '../systems/shop'

// Kozie, the café's mascot (even when you play as someone else), teaches your first two orders from the corner
// of the screen. Each line follows nextStep(), the same logic that moves the glowing arrow on the counter.
const LINES: Record<number, Partial<Record<Step, string>>> = {
  0: {
    wait: "Hi, I'm Kozie! Your very first customer is coming. Let's make it together ☕",
    glass: 'They want a SMALL espresso. Drag a small glass from shelf ① onto the glowing mat.',
    pull: 'Now press and HOLD the espresso machine ②. Let go when the shot reaches the gold line!',
    pourShot: 'Lovely shot! Drag the shot glass onto your glass.',
    serve: "That's an espresso! Drag your glass to the pass ⑥ 🔔",
  },
  1: {
    wait: 'You made your first drink! 🎉 Next customer wants a latte: milk time.',
    glass: 'A MEDIUM glass this time. Drag it onto the mat.',
    pull: 'One shot again: hold the machine, let go on the gold line.',
    pourShot: 'Pour the shot into your glass.',
    fillPitcher: 'Now HOLD the milk bottle ③ to fill the pitcher.',
    pitcherToWand: 'Drag the pitcher onto the steam wand.',
    steam: 'HOLD the steam wand until the needle sits in the glowing zone.',
    pourMilk: 'Silky! Drag the pitcher over your glass and keep holding to pour.',
    serve: 'A real latte! Off to the pass ⑥ 🔔',
  },
}

function Spin({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = 0.35 + Math.sin(clock.elapsedTime * 1.3) * 0.25; g.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.04 } })
  return <group ref={g}>{children}</group>
}

export function TutorialBubble() {
  const { lesson, skip, t } = useTutorial()
  const pouring = useShop((s) => s.pouringMilk || !!s.shaking)
  const [step, setStep] = useState<Step>('wait')
  const [bye, setBye] = useState(false)
  useEffect(() => { const id = setInterval(() => setStep(nextStep().id), 150); return () => clearInterval(id) }, [])
  // a goodbye line for a few seconds after the last lesson
  useEffect(() => { if (lesson === 2 && t) { setBye(true); const id = setTimeout(() => setBye(false), 5000); return () => clearTimeout(id) } }, [lesson, t])
  if (lesson >= 2 && !bye) return null
  const text = lesson >= 2 ? "You're a barista now! ✨ The glowing arrows stay on whenever you need them."
    : pouring ? 'Keep holding… let go when it looks right!'
    : LINES[lesson][step] ?? nextStep().text
  return (
    <div className="tut">
      <div className="tut-kozie">
        <Canvas camera={{ position: [0, 0.9, 5.2], fov: 30 }} dpr={1} gl={{ alpha: true }}>
          <hemisphereLight args={['#fff3e6', '#5a3a70', 1.6]} />
          <directionalLight position={[3, 4, 5]} intensity={2.2} />
          <group position={[0, -0.9, 0]}><Spin><KozieBody walking={() => false} /></Spin></group>
        </Canvas>
      </div>
      <div className="tut-bubble">
        <div className="tut-name">Kozie{lesson < 2 && <span> · lesson {lesson + 1} of 2</span>}</div>
        <div className="tut-text" key={text}>{text}</div>
        {lesson < 2 && <button className="tut-skip" onClick={skip}>skip tutorial</button>}
      </div>
    </div>
  )
}
