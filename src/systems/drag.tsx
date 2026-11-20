import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { mat } from '../world/mats'
import { C } from '../data/palette'

// ── Drag & drop for the café ─────────────────────────────────────────────────────────────
// Grab something, it lifts and follows the mouse across the counter; let go over a drop
// target and that target's action runs. Let go anywhere else and it floats home.
// How it follows the mouse: the pointer's ray is intersected with a flat plane at the
// counter's height (ray–plane intersection), then converted into the item's local space.

type Target = { obj: THREE.Object3D; r: number }
const targets = new Map<string, Target>()
export const hoverTip = { text: '' } // what the pointer is over: shown in the bottom bar, not over the item
export const drag = { active: '' as string, over: '' as string }

// a place things can be dropped onto (the cup, the pitcher, the turntable…)
export function DropTarget({ id, pos, r = 0.3, show = true }: { id: string; pos: [number, number, number]; r?: number; show?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => { if (ref.current) targets.set(id, { obj: ref.current, r }); return () => { targets.delete(id) } }, [id, r])
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (ring.current) { const on = drag.active !== '' && show && !!held.drops?.[id]; ring.current.visible = on; ring.current.scale.setScalar(drag.over === id ? 1.15 + Math.sin(clock.elapsedTime * 8) * 0.05 : 1) } })
  return (
    <group ref={ref} position={pos} name={`drop:${id}`}>
      {/* a soft glowing ring shows where you can drop while you're carrying something */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} visible={false} material={mat(C.butter, { emissive: C.butter, opacity: 0.55 })}><ringGeometry args={[r * 0.8, r, 32]} /></mesh>
    </group>
  )
}

const _p = new THREE.Vector3(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _w = new THREE.Vector3(), _t = new THREE.Vector3()

function nearestTarget(world: THREE.Vector3, accepts: string[]) {
  let best = '', bd = Infinity
  for (const id of accepts) {
    const t = targets.get(id); if (!t) continue
    t.obj.getWorldPosition(_t)
    const d = Math.hypot(_t.x - world.x, _t.z - world.z)
    if (d < t.r * 1.6 && d < bd) { bd = d; best = id }
  }
  return best
}

// Anything you can pick up (and optionally click). `drops` maps a target id → what happens when used there.
// CLICK AND PICK (Papa's-style): click a tool and it sticks to your cursor, floating over the counter;
// click the glass (or another target) to use it there. Click anywhere else, or press Esc, to put it back.
// DRAG AND DROP works too: press on a tool, drag it over the target and let go. Pours and shakes (holdDrops) start the
// moment you drag over your glass with the button still down, and stop when you let go, like a real pour.
const dwell = { on: '', t: 0 }
const held = { id: '', drops: null as Record<string, () => void> | null, hold: [] as string[], pressed: false, moved: false, x: 0, y: 0 }
export function putBack() { held.id = ''; held.drops = null; held.hold = []; held.pressed = false; held.moved = false; drag.active = ''; drag.over = ''; document.body.style.cursor = '' }
function use(t: string) { const d = held.drops; putBack(); if (t && d?.[t]) d[t]() }
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') putBack() })
  // the click that USES the held tool: whatever target it's hovering over, or put it back
  window.addEventListener('pointerdown', (e) => {
    if (!held.id || e.button !== 0) return
    if ((e.target as HTMLElement)?.tagName !== 'CANVAS') return
    use(drag.over)
    e.stopPropagation()
  }, true)
  window.addEventListener('pointermove', (e) => {
    if (!held.id || !held.pressed) return
    if (!held.moved && Math.hypot(e.clientX - held.x, e.clientY - held.y) > 12) held.moved = true
    // (a pour starts over the glass with the button still down, but only after a short pause there: see Grab's frame loop.
    //  Passing over the glass on the way to the steam wand used to start a pour and the jug never reached the wand.)
  })
  window.addEventListener('pointerup', () => {
    if (!held.id || !held.pressed) return
    held.pressed = false
    if (held.moved) use(drag.over) // dragged and let go: drop it there (or it floats home)
    // not moved: it was a click, so the tool stays on your cursor (click-and-pick)
  })
}

export function Grab({ id, pos, size, children, tip, onClick, drops, holdDrops = [], disabled = false }: {
  id: string; pos: [number, number, number]; size: [number, number, number]; children?: ReactNode; tip?: string
  onClick?: () => void; drops?: Record<string, () => void>; holdDrops?: string[]; disabled?: boolean
}) {
  const [hover, setHover] = useState(false)
  const outer = useRef<THREE.Group>(null), inner = useRef<THREE.Group>(null)
  useFrame(({ clock, raycaster, pointer, camera }, dt) => {
    const g = inner.current, o = outer.current; if (!g || !o) return
    if (held.id === id) {
      // follow the cursor: the pointer's ray meets a flat plane a little above the counter
      raycaster.setFromCamera(pointer, camera)
      o.getWorldPosition(_w); _plane.constant = -(_w.y + 0.3)
      if (raycaster.ray.intersectPlane(_plane, _p)) {
        g.position.lerp(o.worldToLocal(_p.clone()), 1 - Math.exp(-dt * 25))
        // the drop spot is where the cursor meets the COUNTER (targets sit on it), not the carry plane above it
        _plane.constant = -(_w.y - 0.1)
        if (raycaster.ray.intersectPlane(_plane, _p)) drag.over = drops ? nearestTarget(_p, Object.keys(drops)) : ''
        // dwell to pour: hovering a hold-target (your glass) for ~0.22 s with the button down starts the pour
        if (drag.over !== dwell.on) { dwell.on = drag.over; dwell.t = performance.now() }
        else if (held.pressed && held.moved && drag.over && held.hold.includes(drag.over) && performance.now() - dwell.t > 220) use(drag.over)
      }
      return
    }
    // home (or bob a little when hovered)
    g.position.lerp(_w.set(0, hover ? Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.04 : 0, 0), 1 - Math.exp(-dt * 12))
  })
  const down = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (drops) { Object.assign(held, { id, drops, hold: holdDrops, pressed: true, moved: false, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }); drag.active = id; document.body.style.cursor = 'none'; return }
    onClick?.()
  }
  const holding = held.id === id
  return (
    <group ref={outer} position={pos}>
      <group ref={inner}>{children}</group>
      {!disabled && <mesh name={`station:${id}`} visible={false} onPointerDown={down}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); hoverTip.text = disabled ? '' : (tip ?? ''); if (!held.id) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); hoverTip.text = ''; if (!held.id) document.body.style.cursor = '' }}>
        <boxGeometry args={size} />
      </mesh>}
    </group>
  )
}

// Press and HOLD on something to keep doing it (pull a shot, fill the pitcher, steam): `onHold(dt)` runs every
// frame while the button is down. Ignored while you're carrying a tool (that click belongs to the tool).
export function Hold({ id, pos, size, tip, onHold, onStart, onEnd, children }: {
  id: string; pos: [number, number, number]; size: [number, number, number]; tip?: string
  onHold: (dt: number) => void; onStart?: () => void; onEnd?: () => void; children?: ReactNode
}) {
  const [hover, setHover] = useState(false)
  const down = useRef(false)
  useFrame((_, dt) => { if (down.current) onHold(Math.min(dt, 0.1)) })
  const start = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0 || held.id) return
    e.stopPropagation(); down.current = true; onStart?.()
    const up = () => { down.current = false; onEnd?.(); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointerup', up)
  }
  return (
    <group position={pos}>
      {children}
      <mesh name={`hold:${id}`} visible={false} onPointerDown={start}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); hoverTip.text = tip ?? ''; if (!held.id) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); hoverTip.text = ''; if (!held.id) document.body.style.cursor = '' }}>
        <boxGeometry args={size} />
      </mesh>
    </group>
  )
}
