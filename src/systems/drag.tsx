import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
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
export const drag = { active: '' as string, over: '' as string }

// a place things can be dropped onto (the cup, the pitcher, the turntable…)
export function DropTarget({ id, pos, r = 0.3, show = true }: { id: string; pos: [number, number, number]; r?: number; show?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => { if (ref.current) targets.set(id, { obj: ref.current, r }); return () => { targets.delete(id) } }, [id, r])
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (ring.current) { const on = drag.active !== '' && show; ring.current.visible = on; ring.current.scale.setScalar(drag.over === id ? 1.15 + Math.sin(clock.elapsedTime * 8) * 0.05 : 1) } })
  return (
    <group ref={ref} position={pos}>
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

// Anything you can grab (and optionally click). `drops` maps a target id → what happens when dropped there.
export function Grab({ id, pos, size, children, tip, onClick, drops }: {
  id: string; pos: [number, number, number]; size: [number, number, number]; children?: ReactNode; tip?: string
  onClick?: () => void; drops?: Record<string, () => void>
}) {
  const [hover, setHover] = useState(false)
  const [dragging, setDragging] = useState(false)
  const outer = useRef<THREE.Group>(null), inner = useRef<THREE.Group>(null)
  const st = useRef({ moved: 0, lift: 0, home: new THREE.Vector3(), down: false })
  useFrame(({ clock }, dt) => {
    const g = inner.current; if (!g) return
    if (!st.current.down) {
      // float back home (or bob a little when hovered)
      g.position.lerp(_w.set(0, hover ? Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.04 : 0, 0), 1 - Math.exp(-dt * 12))
    }
  })
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    st.current = { ...st.current, moved: 0, down: true }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    if (drops) { drag.active = id; setDragging(true) }
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!st.current.down || !drops || !outer.current || !inner.current) return
    outer.current.getWorldPosition(_w)
    _plane.constant = -(_w.y + 0.25)                       // carry it a little above the counter
    if (!e.ray.intersectPlane(_plane, _p)) return
    const local = outer.current.worldToLocal(_p.clone())
    st.current.moved += inner.current.position.distanceTo(local)
    inner.current.position.copy(local)
    inner.current.getWorldPosition(_w)
    drag.over = nearestTarget(_w, Object.keys(drops))
    document.body.style.cursor = 'grabbing'
  }
  const up = (e: ThreeEvent<PointerEvent>) => {
    if (!st.current.down) return
    st.current.down = false
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    const wasDrag = st.current.moved > 0.05
    if (drops && wasDrag && inner.current) {
      inner.current.getWorldPosition(_w)
      const t = nearestTarget(_w, Object.keys(drops))
      if (t) drops[t]()
    } else if (onClick) onClick()                          // a plain click (no real drag) still works
    drag.active = ''; drag.over = ''; setDragging(false)
    document.body.style.cursor = hover ? 'grab' : ''
  }
  return (
    <group ref={outer} position={pos}>
      <group ref={inner}>{children}</group>
      <mesh name={`station:${id}`} visible={false} onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = drops ? 'grab' : 'pointer' }}
        onPointerOut={() => { setHover(false); if (!st.current.down) document.body.style.cursor = '' }}>
        <boxGeometry args={size} />
      </mesh>
      {hover && !dragging && tip && <Html position={[0, size[1] / 2 + 0.08, 0]} center className="tag tool">{tip}</Html>}
    </group>
  )
}
