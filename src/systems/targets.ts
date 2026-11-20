import { useShop } from './shop'
import { cafe } from '../world/Customers'
import { CAP, SHOT_ML, filled, type Drink } from '../data/recipes'
import { textureOf } from './shop'
import { sfx } from './sound'

// Sweet spots: every hold has a target you can SEE on the object (a line on the shot glass, a zone on the pitcher's
// thermometer, a band on your glass). Letting go inside it plays a ding and a little "spot on". Cozy: missing it
// never blocks you, it just doesn't sparkle.

export const want = (): Drink | undefined => { const f = cafe.line.peek(), o = f ? useShop.getState().orders[f.id] : undefined; return o && !o.cake ? o.want : undefined }

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

export { coverage } from '../data/recipes'

// ── the next thing to do, worked out from the ticket and what's already in your glass ──
// One source of truth for the glowing hint on the counter, the hint line and Kozie's tutorial.
export type Step = 'wait' | 'glass' | 'choc' | 'pull' | 'pourShot' | 'water' | 'fillPitcher' | 'pitcherToWand' | 'steam' | 'pourMilk' | 'topping' | 'serve'
export function nextStep(): { id: Step; text: string } {
  const s = useShop.getState(), w = want(), d = s.drink, p = s.pitcher, inPitcher = p.milk + p.foam
  const fill = s.cup ? filled(s.ml) / CAP[d.size] : 0
  if (!w) return { id: 'wait', text: cafe.line.size ? 'a customer is walking up…' : 'waiting for customers…' }
  if (!s.cup) return { id: 'glass', text: `DRAG a ${w.size} glass onto the mat` }
  if (w.chocolate && !d.chocolate) return { id: 'choc', text: 'open the fillers drawer, then DRAG the chocolate sauce onto your glass' }
  if (d.shots < w.shots && s.shotGlass < 5) return { id: 'pull', text: 'HOLD the espresso machine · LET GO on green' }
  if (d.shots < w.shots) return { id: 'pourShot', text: 'DRAG the shot glass onto your glass' }
  if (w.water && !d.water) return { id: 'water', text: 'DRAG the kettle onto your glass' }
  if (w.milk !== 'none' && d.milk === 'none') {
    if (inPitcher < 20) return { id: 'fillPitcher', text: `HOLD the ${w.milkType} milk to fill the jug` }
    if (p.at !== 'wand' && p.stretch === 0) return { id: 'pitcherToWand', text: 'DRAG the milk jug under the steam wand' }
    if (p.at === 'wand' && p.stretch < STEAM_ZONES[w.milk][0]) return { id: 'steam', text: 'HOLD the steam knob · LET GO on green' }
  }
  if (w.milk !== 'none' && fill < 0.75) return { id: 'pourMilk', text: 'DRAG the jug onto your glass and HOLD to pour' }
  if (w.topping !== 'none' && d.topping === 'none') return { id: 'topping', text: w.topping === 'whipped' ? 'open the fillers drawer, then DRAG the cream onto your glass' : `open the sprinkles drawer, then DRAG the ${w.topping} over your glass` }
  return { id: 'serve', text: 'DRAG your glass onto the pass 🔔' }
}
/** the whole order as a short list of steps (for the step tracker): icon + short name, in the order you do them */
// (emoji that exist everywhere: the 'pouring' one shows as an empty box on Windows and older Android)
export const STEP_LABEL: Record<Step, [string, string]> = { wait: ['⏳', 'wait'], glass: ['🥛', 'glass'], choc: ['🍫', 'chocolate'], pull: ['☕', 'pull shot'], pourShot: ['⬇️', 'shot in'], water: ['💧', 'hot water'],
  fillPitcher: ['🐄', 'fill milk'], pitcherToWand: ['➡️', 'to wand'], steam: ['♨️', 'steam'], pourMilk: ['⬇️', 'pour milk'], topping: ['✨', 'topping'], serve: ['🔔', 'serve'] }
export function orderSteps(): Step[] {
  const w = want(); if (!w) return []
  return ['glass', ...(w.chocolate ? ['choc'] : []), 'pull', 'pourShot', ...(w.water ? ['water'] : []), ...(w.milk !== 'none' ? ['fillPitcher', 'pitcherToWand', 'steam', 'pourMilk'] : []), ...(w.topping !== 'none' ? ['topping'] : []), 'serve'] as Step[]
}
/** which tools this order needs out on the counter (no order: everything) */
export function needs() {
  const w = want()
  if (!w) return { choc: true, water: true, milk: true, milkType: null as string | null, topping: null as string | null, all: true }
  return { choc: w.chocolate, water: w.water, milk: w.milk !== 'none', milkType: w.milk !== 'none' ? w.milkType : null, topping: w.topping !== 'none' ? w.topping : 'none', all: false }
}

if (typeof window !== 'undefined') (window as unknown as { __tutStep: () => Step }).__tutStep = () => nextStep().id // for the tutorial recorder
