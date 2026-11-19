import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useGame, onFoot } from '../systems/store'
import { useDay } from '../systems/day'
import { view, TOUCH } from '../systems/CameraRig'
import { sfx } from '../systems/sound'
import { KozieAvatar } from './TutorialBubble'

// Kozie shows you round, one small thing at a time, the first time you're on your feet: look around, walk, the three
// views, then open up at the door and take your first order. Every step waits for you to actually do it (no walls of
// text), and the words match your device: mouse + keys on a PC, fingers on a phone. Saved, so it runs once.
const KEY = 'bwc.navtut.done'
const saved = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
const q = typeof location !== 'undefined' ? location.search : ''
type NavTut = { step: number; done: boolean; skip: () => void; next: () => void }
export const useNavTut = create<NavTut>((set, get) => ({
  step: 0, done: q.includes('snap') || q.includes('embed') ? true : saved(),
  skip: () => { try { localStorage.setItem(KEY, '1') } catch { /* private mode */ } set({ done: true }) },
  next: () => { const n = get().step + 1; sfx.good(); if (n >= STEPS.length) get().skip(); else set({ step: n }) },
}))
if (typeof window !== 'undefined') (window as unknown as { __navtut: typeof useNavTut }).__navtut = useNavTut

type Step = { pc: string; phone: string; done: (s: Snap) => boolean; spot?: string }
type Snap = { yaw: number; moved: number; mode: string; phase: string; order: boolean }
const STEPS: Step[] = [
  { pc: "Hi, I'm Kozie! This is your café. First, look around: drag with the mouse (or use ← →).", phone: "Hi, I'm Kozie! This is your café. First, look around: drag one finger across the screen.", done: (s) => Math.abs(s.yaw) > 0.9 },
  { pc: 'Now walk: W A S D (hold Shift to run).', phone: 'Now walk: tap the floor anywhere and you walk there.', done: (s) => s.moved > 1.2 },
  { pc: 'Three ways to see your café, up in the top right. Try 👁 First person (or press 2).', phone: 'Three ways to see your café, top right. Tap 👁 First person.', done: (s) => s.mode === 'fp', spot: 'fp' },
  { pc: "Now you're seeing through your own eyes! Try 🏠 Dollhouse (3) to see the whole café.", phone: "You're seeing through your own eyes! Now tap 🏠 Dollhouse to see the whole café.", done: (s) => s.mode === 'dollhouse', spot: 'dollhouse' },
  { pc: 'And 🚶 Explore (1) puts you back on your feet.', phone: 'And 🚶 Explore puts you back on your feet.', done: (s) => s.mode === 'walk', spot: 'walk' },
  { pc: 'Ready to open? Walk to the front door and press E to flip the sign to OPEN.', phone: 'Ready to open? Walk to the front door and tap the button that pops up to flip the sign to OPEN.', done: (s) => s.phase === 'open' },
  { pc: "We're open! ☕ When a guest reaches the counter, a bell rings: press E or click Take order.", phone: "We're open! ☕ When a guest reaches the counter, a bell rings: tap Take order.", done: (s) => s.mode === 'pov' || s.mode === 'cake' },
]
/** which view button Kozie wants you to press (it glows) */
export const navSpot = () => { const t = useNavTut.getState(); return t.done ? '' : STEPS[t.step]?.spot ?? '' }

export function NavTutorial() {
  const t = useNavTut(), mode = useGame((s) => s.mode)
  const [, tick] = useState(0), base = useRef({ yaw: view.yaw, x: 0, z: 0, step: -1 })
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 150); return () => clearInterval(id) }, [])
  const g = useGame.getState(), p = g.player
  if (base.current.step !== t.step) base.current = { yaw: view.yaw, x: p.x, z: p.z, step: t.step } // each step measures from where you were
  useEffect(() => {
    if (t.done) return
    const s: Snap = { yaw: view.yaw - base.current.yaw, moved: Math.hypot(p.x - base.current.x, p.z - base.current.z), mode, phase: useDay.getState().phase, order: false }
    if (STEPS[t.step].done(s)) t.next()
  })
  const phase = useDay.getState().phase, winding = !!(window as unknown as { __wind?: { getState: () => { on: boolean } } }).__wind?.getState().on
  if (t.done || !(onFoot(mode) || mode === 'dollhouse') || phase === 'results' || winding) return null // never on top of the day's end
  const st = STEPS[t.step]
  return (
    <div className="tut navtut">
      <div className="tut-kozie"><KozieAvatar /></div>
      <div className="tut-bubble">
        <div className="tut-name">Kozie<span> · getting around {t.step + 1}/{STEPS.length}</span></div>
        <div className="tut-text" key={t.step}>{TOUCH ? st.phone : st.pc}</div>
        <div className="tut-acts"><button className="tut-next" onClick={t.next}>next ›</button><button className="tut-skip" onClick={t.skip}>skip the tour</button></div>
      </div>
    </div>
  )
}
