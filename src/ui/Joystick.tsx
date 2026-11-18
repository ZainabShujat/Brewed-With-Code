import { useEffect, useRef, useState } from 'react'
import { stick } from '../systems/movement'

// Phones: a FLOATING thumb stick. Put your thumb down anywhere in the lower-left of the screen and the stick
// appears right there (no hunting for a tiny circle in the corner); lift it and you stop. It resets on every way a
// touch can end (lift, cancel, the finger sliding off, the app losing focus), so it can never stay stuck pushing.
const R = 46 // px: how far the knob can travel
export function Joystick() {
  const zone = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<[number, number] | null>(null), [k, setK] = useState<[number, number]>([0, 0])
  const id = useRef(-1), origin = useRef<[number, number]>([0, 0])
  const end = () => { id.current = -1; stick.x = 0; stick.y = 0; setK([0, 0]); setAt(null) }
  useEffect(() => {
    const up = (e: PointerEvent) => { if (e.pointerId === id.current) end() }
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); window.addEventListener('blur', end)
    document.addEventListener('visibilitychange', end)
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('blur', end); document.removeEventListener('visibilitychange', end); end() }
  }, [])
  const move = (x: number, y: number) => {
    let dx = (x - origin.current[0]) / R, dy = (y - origin.current[1]) / R
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l }
    stick.x = Math.abs(dx) < 0.12 ? 0 : dx; stick.y = Math.abs(dy) < 0.12 ? 0 : dy; setK([dx, dy])
  }
  return (
    <div ref={zone} className="stickzone"
      onPointerDown={(e) => { if (id.current >= 0) return; id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); origin.current = [e.clientX, e.clientY]; setAt([e.clientX, e.clientY]); move(e.clientX, e.clientY) }}
      onPointerMove={(e) => { if (e.pointerId === id.current) move(e.clientX, e.clientY) }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      {at ? <div className="stick live" style={{ left: at[0] - 60, top: at[1] - 60 }}><div className="knob" style={{ transform: `translate(${k[0] * R}px, ${k[1] * R}px)` }} /></div>
          : <div className="stick idle"><div className="knob" /></div>}
    </div>
  )
}
