// Townsfolk murmur: when you're near people chatting (in the café, on the street, in the park) you hear soft,
// wordless babble, like a real café. Synthesised (no files): a few quick "syllables" through a voice-ish filter,
// higher and bouncier for marshmallows, lower and drier for notebooks; quieter with distance; none at night.
import { useGame, onFoot } from './store'
import { hourNow } from './clock'

type Talker = { x: number; z: number; kind: 'mallow' | 'paper'; chatty: () => boolean }
const talkers = new Map<string, Talker>()
export const registerTalker = (id: string, t: Talker) => { talkers.set(id, t); return () => { talkers.delete(id) } }
/** everyone standing or walking somewhere (for not walking through each other) */
export function* folkSpots(): Generator<{ id: string; x: number; z: number }> { for (const [id, t] of talkers) yield { id, x: t.x, z: t.z } }

let ctx: AudioContext | null = null, master: GainNode | null = null
const ac = () => { if (!ctx) { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination) } return ctx }
export const murmurVolume = (v: number) => { ac(); if (master) master.gain.value = v }

function syllables(vol: number, kind: 'mallow' | 'paper') {
  const a = ac(); if (a.state === 'suspended') return // only once the player has interacted (browsers block audio before that)
  const base = kind === 'mallow' ? 300 + Math.random() * 120 : 170 + Math.random() * 70
  const n = 3 + Math.floor(Math.random() * 5), bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'mallow' ? 1300 : 900; bp.Q.value = 1.4
  bp.connect(master!)
  let t = a.currentTime + 0.02
  for (let i = 0; i < n; i++) {
    const o = a.createOscillator(), g = a.createGain(), d = 0.07 + Math.random() * 0.09
    o.type = kind === 'mallow' ? 'triangle' : 'sawtooth'
    const f = base * (0.85 + Math.random() * 0.35); o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.25), t + d)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * (kind === 'paper' ? 0.35 : 0.5), t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(g).connect(bp); o.start(t); o.stop(t + d + 0.02)
    t += d + 0.02 + Math.random() * 0.05
  }
}

// a gentle scheduler: a couple of times a second, someone nearby says something
let last = 0
export function murmurTick(now: number) {
  if (now - last < 0.45) return; last = now
  const g = useGame.getState(); if (!onFoot(g.mode) && g.mode !== 'dollhouse' && g.mode !== 'pov') return
  const h = hourNow(); if (h < 7 || h > 22) return
  const p = g.player, near: { t: Talker; d: number }[] = []
  for (const t of talkers.values()) { const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < 11 && t.chatty()) near.push({ t, d }) }
  if (!near.length || Math.random() < 0.35) return
  const { t, d } = near[Math.floor(Math.random() * near.length)]
  syllables(Math.max(0.04, 0.22 * (1 - d / 11)), t.kind)
}
