import { useShop } from './shop'
import { cafe } from '../world/Customers'
import { CAP, SHOT_ML, filled, type Drink } from '../data/recipes'
import { textureOf } from './shop'
import { sfx } from './sound'

// Sweet spots: every hold has a target you can SEE on the object (a line on the shot glass, a zone on the pitcher's
// thermometer, a band on your glass). Letting go inside it plays a ding and a little "spot on". Cozy: missing it
// never blocks you, it just doesn't sparkle.

export const want = (): Drink | undefined => { const f = cafe.line.peek(); return f ? useShop.getState().orders[f.id]?.want : undefined }

/** ml the shot glass should hold right now: the shots still missing from the glass */
export function shotTarget() {
  const w = want(), s = useShop.getState()
  if (!w || !s.cup) return 0
  return Math.max(0, w.shots - s.drink.shots) * SHOT_ML
}
/** steam time windows per texture (seconds of stretch), matching textureOf() */
export const STEAM_ZONES = { micro: [0.3, 1.0], steamed: [1.0, 2.2], foamy: [2.2, 3.4] } as const
export const STEAM_MAX = 3.4
/** a good fill: 85–100% of the glass */
export const FILL_ZONE = [0.85, 1.0] as const

const cheer = (text: string, good = true) => { useShop.setState({ cheer: { text, t: performance.now() / 1000, good } }); try { (good ? sfx.good : sfx.meh)() } catch { /* no audio (tests, blocked autoplay) */ } }

export function judgeShot() {
  const s = useShop.getState(), target = shotTarget()
  if (!target || s.shotGlass < 3) return
  const off = s.shotGlass - target
  if (Math.abs(off) <= 6) cheer('spot on ✨')
  else if (off > 15) cheer('a little too much', false)
}
export function judgeSteam() {
  const s = useShop.getState(), w = want()
  if (!w || w.milk === 'none' || s.pitcher.at !== 'wand' || s.pitcher.milk + s.pitcher.foam < 1) return
  const got = textureOf(s.pitcher.stretch)
  if (s.pitcher.stretch < STEAM_ZONES[w.milk][0]) return // still going: no verdict yet
  if (got === w.milk) cheer(w.milk === 'micro' ? 'silky ✨' : w.milk === 'foamy' ? 'so foamy ✨' : 'nicely steamed ✨')
  else if (s.pitcher.stretch > STEAM_ZONES[w.milk][1]) cheer('steamed a bit long', false)
}
export function judgeFill() {
  const s = useShop.getState(); if (!s.cup) return
  const f = filled(s.ml) / CAP[s.drink.size]
  if (s.spilled) cheer('oops, spilled', false)
  else if (f >= FILL_ZONE[0] && f <= FILL_ZONE[1]) cheer('perfect fill ✨')
}

/** how evenly the topping covers the drink: the share of an 8x8 grid (inside the surface circle) that got a grain */
export function coverage(grains: [number, number][]) {
  const R = 0.15, N = 8, cell = (2 * R) / N, hit = new Set<number>(); let total = 0
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const cx = -R + (i + 0.5) * cell, cz = -R + (j + 0.5) * cell; if (Math.hypot(cx, cz) <= R) total++ }
  for (const [x, z] of grains) { const i = Math.floor((x + R) / cell), j = Math.floor((z + R) / cell); if (i >= 0 && j >= 0 && i < N && j < N) hit.add(i * N + j) }
  return total ? hit.size / total : 0
}
