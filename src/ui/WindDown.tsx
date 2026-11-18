import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { create } from 'zustand'
import { useGame } from '../systems/store'
import { useDay } from '../systems/day'
import { cafe } from '../world/Customers'
import { TABLES } from '../world/layout'
import { sfx } from '../systems/sound'

// Winding down after closing: you walk the quiet café, a couple of regulars linger over their last cup, and a few
// small, optional things glow: flip the sign, wipe a table, say goodnight, step out for some air. No score, no clock.
// "Start Day N+1" (or Next day) ends it.
type Chore = { id: string; label: string; how: string; done: string; near: (x: number, z: number) => boolean }
const CHORES: Chore[] = [
  { id: 'wipe', label: 'wipe a table', how: 'wipe this table', done: 'Sparkly clean ✨', near: (x, z) => TABLES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 2.6) },
  { id: 'bye', label: 'say goodnight to a guest', how: 'say goodnight', done: 'They waved back. 👋', near: (x, z) => cafe.pool.some((c) => c.phase === 'sit' && Math.hypot(c.pos.x - x, c.pos.z - z) < 2.6) },
  { id: 'air', label: 'step outside', how: 'take a breath of night air', done: 'The lid lights look lovely from out here.', near: (_x, z) => z > 16 },
]
const HOW: Record<string, string> = { bye: 'walk up to a guest with 🌙 over them, then press E (or tap)', wipe: 'stand by any table, press E', air: 'walk out of the front door' }
type Wind = { on: boolean; done: string[]; say: string; sayT: number; open: boolean; wipe: { x: number; z: number; t: number } | null }
export const useWind = create<Wind>(() => ({ on: false, done: [], say: '', sayT: 0, open: true, wipe: null }))

export function windDown() {
  useWind.setState({ on: true, done: [], say: 'Lovely day! A couple of guests are still finishing their drinks: walk up to one with a 🌙 over their head to say goodnight.', sayT: performance.now() })
  cafe.seed(2) // a couple of regulars linger over their last cup
  useGame.getState().setMode('walk')
}
function endWind() { useWind.setState({ on: false, wipe: null }); useDay.getState().next(); sfx.tap() }

export function WindDown() {
  const w = useWind(), day = useDay((s) => s.day)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(id) }, [])
  const p = useGame.getState().player
  const here = w.on ? CHORES.find((c) => !w.done.includes(c.id) && c.near(p.x, p.z)) : undefined
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return // typing a name, not doing things
      const st = useWind.getState(); if (!st.on) return
      const pl = useGame.getState().player, c = CHORES.find((c) => !st.done.includes(c.id) && c.near(pl.x, pl.z)); if (!c) return
      sfx.tap()
      if (c.id === 'wipe') { // the cloth goes round the nearest table first, then the sparkle
        const [tx, tz] = TABLES.reduce((b, t) => Math.hypot(t[0] - pl.x, t[1] - pl.z) < Math.hypot(b[0] - pl.x, b[1] - pl.z) ? t : b)
        useWind.setState({ wipe: { x: tx, z: tz, t: performance.now() } })
        setTimeout(() => { const s2 = useWind.getState(); useWind.setState({ done: [...s2.done, 'wipe'], say: c.done, sayT: performance.now() }) }, 1700)
        return
      }
      if (c.id === 'bye') { const r = cafe.pool.filter((p) => p.phase === 'sit').sort((a, b) => Math.hypot(a.pos.x - pl.x, a.pos.z - pl.z) - Math.hypot(b.pos.x - pl.x, b.pos.z - pl.z))[0]; if (r) r.byeT = 3.5 }
      useWind.setState({ done: [...st.done, c.id], say: c.done, sayT: performance.now() })
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  if (!w.on) return null
  const talking = performance.now() - w.sayT < (w.say.length > 60 ? 8000 : 4000) // long lines stay up longer
  return (
    <>
      <div className={'wind' + (w.open ? '' : ' shut')}>
        <div className="wd-h" onClick={() => useWind.setState({ open: !w.open })}>🌙 Winding down <small>{w.open ? '▾' : '▸'}</small></div>
        {w.open && <>
          <div className="wd-sub">little things, if you feel like it</div>
          {CHORES.map((c) => <div key={c.id} className={'wd-row' + (w.done.includes(c.id) ? ' ok' : '')}><i>{w.done.includes(c.id) ? '✓' : '○'}</i>{c.label}{!w.done.includes(c.id) && HOW[c.id] && <div className="wd-how">{HOW[c.id]}</div>}</div>)}
        </>}
        <button className="wd-go" onClick={endWind}>Start Day {day + 1} →</button>
      </div>
      {here && !w.wipe && <div className="wd-prompt">press <b>E</b> to {here.how}</div>}
      {talking && <div className="wd-say" key={w.sayT}><b>Kozie</b>{w.say}</div>}
    </>
  )
}

// the cloth: a little folded towel going round the tabletop, then sparkles (rendered in the café floor's space)
const TOP_Y = 1.13 // the tabletop (measured: 1.35 world ÷ 1.2)
export function WipeFx() {
  const cloth = useRef<THREE.Mesh>(null), spark = useRef<THREE.Group>(null)
  useFrame(() => {
    const wp = useWind.getState().wipe, c = cloth.current, g = spark.current; if (!c || !g) return
    const k = wp ? (performance.now() - wp.t) / 1000 : 9
    c.visible = !!wp && k < 1.6; g.visible = !!wp && k > 1.2 && k < 2.6
    if (!wp) return
    if (c.visible) { const a = k * 9, r = 0.35 + Math.sin(k * 4) * 0.1; c.position.set(wp.x + Math.cos(a) * r, TOP_Y + 0.03, wp.z + Math.sin(a) * r * 0.8); c.rotation.y = -a }
    if (g.visible) { const q = (k - 1.2) / 1.4; g.position.set(wp.x, TOP_Y + 0.1 + q * 0.6, wp.z); g.children.forEach((m, i) => { m.position.set(Math.cos(i * 1.3) * 0.4 * (0.5 + q), Math.sin(i * 2.1) * 0.15, Math.sin(i * 1.3) * 0.4 * (0.5 + q)); m.scale.setScalar(Math.max(0.01, 1 - q)) }) }
    if (k > 3) useWind.setState({ wipe: null })
  })
  return (
    <group>
      <mesh ref={cloth} visible={false}><boxGeometry args={[0.46, 0.05, 0.32]} /><meshStandardMaterial color="#8fd0ea" roughness={0.9} /></mesh>
      <group ref={spark} visible={false}>{Array.from({ length: 7 }, (_, i) => <mesh key={i}><octahedronGeometry args={[0.09]} /><meshStandardMaterial color="#fff6c8" emissive="#ffe08a" emissiveIntensity={1.5} /></mesh>)}</group>
    </group>
  )
}
if (typeof window !== 'undefined') (window as unknown as { __wind: typeof useWind }).__wind = useWind // capture/testing
