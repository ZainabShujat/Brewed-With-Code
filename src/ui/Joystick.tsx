import { useRef, useState } from 'react'
import { stick } from '../systems/movement'

// Phones: a thumb stick (a circle in a circle). Walk = move; other views = look around.
export function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const [k, setK] = useState({ x: 0, y: 0 })
  const id = useRef(-1)
  const set = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect(), R = r.width / 2
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l }
    stick.x = Math.abs(x) < 0.12 ? 0 : x; stick.y = Math.abs(y) < 0.12 ? 0 : y; setK({ x, y })
  }
  const end = () => { id.current = -1; stick.x = 0; stick.y = 0; setK({ x: 0, y: 0 }) }
  return (
    <div ref={base} className="stick"
      onPointerDown={(e) => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); set(e) }}
      onPointerMove={(e) => { if (e.pointerId === id.current) set(e) }}
      onPointerUp={end} onPointerCancel={end}>
      <div className="knob" style={{ transform: `translate(${k.x * 34}px, ${k.y * 34}px)` }} />
    </div>
  )
}
