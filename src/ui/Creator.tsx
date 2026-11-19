import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAvatar, type AvatarKind } from '../systems/avatar'
import { AvatarBody } from '../world/PlayerAvatar'
import { PAPER_MODELS, MALLOW_MODELS, PAPER_COLOURS, MALLOW_COLOURS } from '../world/folk/specs'

// Make your own character: Kozie (the notebook from the reels) by default, or any notebook or marshmallow
// you like, with your own name. Skipping keeps you as Kozie, under your own name.
const KINDS: { id: AvatarKind; label: string; sub: string }[] = [
  { id: 'kozie', label: '📖 Kozie', sub: 'the notebook from the reels' },
  { id: 'paper', label: '📓 Notebook', sub: 'from the east side of town' },
  { id: 'mallow', label: '🍡 Marshmallow', sub: 'from the west side of town' },
]

// the preview turns on its own (a little faster now); drag it to spin it yourself, it carries on from where you let go
const spin = { v: 1.4, drag: false, last: 0, dx: 0 }
function Spin({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (!g.current) return; if (!spin.drag) { spin.v += (1.4 - spin.v) * Math.min(1, dt * 1.5); g.current.rotation.y += dt * spin.v } })
  useEffect(() => {
    const up = () => { spin.drag = false }
    window.addEventListener('pointerup', up); return () => window.removeEventListener('pointerup', up)
  }, [])
  useFrame(() => { if (g.current && spin.drag) { g.current.rotation.y += spin.dx * 0.02; spin.dx = 0 } })
  return <group ref={g}>{children}</group>
}

export function Creator({ onDone }: { onDone: () => void }) {
  const a = useAvatar()
  const models = a.kind === 'mallow' ? MALLOW_MODELS : PAPER_MODELS
  const colours = a.kind === 'mallow' ? MALLOW_COLOURS.map((c) => c.body) : PAPER_COLOURS.map((c) => c.cover)
  const finish = (asKozie: boolean) => { if (asKozie) a.set({ kind: 'kozie' }); a.save(); onDone() }
  return (
    <div className="creator" onPointerDown={(e) => e.stopPropagation()}>
      <div className="cr-panel">
        <div className="cr-h">who are you? ☕</div>{!a.made && <div className="cr-welcome">welcome to your café! make yourself, then Kozie will show you round 📓</div>}
        <div className="cr-grid">
          <div className="cr-preview" style={{ touchAction: 'none', cursor: 'grab' }} title="drag to spin" onPointerDown={(e) => { spin.drag = true; spin.last = e.clientX }} onPointerMove={(e) => { if (!spin.drag) return; const dx = e.clientX - spin.last; spin.last = e.clientX; spin.dx += dx; spin.v = dx * 1.2 }}>
            <Canvas camera={{ position: [0, 1.4, 4.2], fov: 35 }} dpr={1}>
              <hemisphereLight args={['#fff3e6', '#5a3a70', 1.6]} />
              <directionalLight position={[3, 4, 5]} intensity={2.2} />
              <group position={[0, -0.95, 0]}><Spin><AvatarBody a={a} walking={() => false} /></Spin></group>
            </Canvas>
            <div className="cr-name-show">{a.name.trim() || 'Kozie'}</div>
          </div>
          <div className="cr-controls">
            <label className="cr-label">your name</label>
            <input className="cr-input" maxLength={18} placeholder="type your name" value={a.name} onChange={(e) => a.set({ name: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
            <label className="cr-label">be…</label>
            <div className="cr-kinds">{KINDS.map((k) => (
              <button key={k.id} className={a.kind === k.id ? 'on' : ''} onClick={() => a.set({ kind: k.id })}><b>{k.label}</b><span>{k.sub}</span></button>))}</div>
            {a.kind !== 'kozie' && <>
              <label className="cr-label">shape</label>
              <div className="cr-chips">{models.map((m, i) => <button key={m} className={a.model === i ? 'on' : ''} onClick={() => a.set({ model: i })}>{m}</button>)}</div>
              <label className="cr-label">colour</label>
              <div className="cr-swatches">{colours.map((c, i) => <button key={c} className={a.colour === i ? 'on' : ''} style={{ background: c }} onClick={() => a.set({ colour: i })} aria-label={`colour ${i + 1}`} />)}</div>
              <button className="cr-roll" onClick={() => a.set({ faceSeed: Math.floor(Math.random() * 1e6) })}>🎲 a new face</button>
            </>}
          </div>
        </div>
        <div className="cr-foot">
          <button className="cr-skip" onClick={() => finish(true)}>skip, I'll be Kozie</button>
          <button className="cr-go" onClick={() => finish(false)}>let's go{a.name.trim() ? `, ${a.name.trim()}` : ''} ✨</button>
        </div>
      </div>
    </div>
  )
}
