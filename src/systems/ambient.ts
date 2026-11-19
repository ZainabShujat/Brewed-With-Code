// Ambient sound of the outdoors, synthesised (no files) and placed in the world:
//   · the grand fountain: a soft rush of falling water, louder as you walk up to it, gone across town;
//   · birds: little chirps now and then near the park, the trees and the forest edge, by day only.
// Heard on foot and in the Dollhouse (from where the player stands); silent at the bar / cake station.
import { useGame, onFoot } from './store'
import { hourNow } from './clock'
import { FOUNTAIN, POND, STREET as S } from '../world/streetLayout'

let ctx: AudioContext | null = null, master: GainNode | null = null, water: GainNode | null = null
function ac() {
  if (ctx) return ctx
  ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination)
  // falling water: looped noise through two bands (a low rush and a bright splash), slowly breathing
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
  water = ctx.createGain(); water.gain.value = 0; water.connect(master)
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 900
  const hi = ctx.createBiquadFilter(); hi.type = 'bandpass'; hi.frequency.value = 2600; hi.Q.value = 0.7
  const hiG = ctx.createGain(); hiG.gain.value = 0.35
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.23; lfoG.gain.value = 0.08; lfo.connect(lfoG).connect(hiG.gain); lfo.start()
  src.connect(low).connect(water); src.connect(hi).connect(hiG).connect(water); src.start()
  return ctx
}
export const ambientVolume = (v: number) => { ac(); if (master) master.gain.value = v }

function chirp(vol: number) {
  const a = ctx!, n = 2 + Math.floor(Math.random() * 4), base = 2600 + Math.random() * 1800
  let t = a.currentTime + 0.02
  for (let i = 0; i < n; i++) {
    const o = a.createOscillator(), g = a.createGain(), dur = 0.05 + Math.random() * 0.07
    o.type = 'sine'; o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + dur)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(master!); o.start(t); o.stop(t + dur + 0.02)
    t += dur + 0.03 + Math.random() * 0.08
  }
}

let last = 0
export function ambientTick(now: number) {
  if (now - last < 0.25) return; last = now
  const a = ac(); if (a.state === 'suspended') { a.resume().catch(() => {}); return } // only after the player has interacted
  const g = useGame.getState(), on = onFoot(g.mode) || g.mode === 'dollhouse'
  const p = g.player, d = Math.hypot(p.x - FOUNTAIN.x, p.z - FOUNTAIN.z)
  const near = on ? Math.pow(Math.max(0, 1 - Math.max(0, d - FOUNTAIN.r) / 32), 2) : 0 // full at the rim, silent ~40 m away
  water!.gain.setTargetAtTime(near * 0.22, a.currentTime, 0.4)
  const h = hourNow(); if (!on || h < 6 || h > 19.5) return
  // birds: likelier near the park, the pond and the forest behind the back wall
  const park = Math.max(0, 1 - Math.hypot(p.x - POND.x, p.z - (FOUNTAIN.z + POND.z) / 2) / 40), forest = Math.max(0, 1 - (p.z - S.BACK) / 30)
  const k = Math.max(park, forest, 0.15)
  if (Math.random() < 0.12 * k) chirp(0.025 + 0.05 * k * Math.random())
}
