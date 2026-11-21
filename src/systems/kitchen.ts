import { create } from 'zustand'
import { usePantry } from './pantry'
import { USE, type IngredientId } from '../data/ingredients'
import { sfx } from './sound'
const play = (k: 'tap' | 'bell') => { try { sfx[k]() } catch { /* no audio (tests, old browsers) */ } }

// The prep kitchen (21 Nov): sponge batter is made HERE, by hand, and the cake bench pours it into tins.
// One bowl = batter for 3 sponge layers. Pick a flavour, add one scoop of each ingredient per layer (3 of each),
// hold the whisk to stir, and the bowl goes onto the batter shelf. The half-made bowl is saved, so you can
// walk away (to serve a coffee) and finish it later. Ingredients are only ever used here, not again at the bench.
export type Flavour = 'vanilla' | 'chocolate' | 'strawberry'
export type Part = 'flour' | 'sugar' | 'eggs' | 'butter' | 'extra'
export const LAYERS_PER_BOWL = 3
export const PARTS: Part[] = ['flour', 'sugar', 'eggs', 'butter', 'extra']
export const EXTRA: Record<Flavour, [IngredientId, number] | null> = { vanilla: null, chocolate: USE.spongeExtra.chocolate, strawberry: USE.spongeExtra.strawberry }
/** what one scoop of a part takes from the pantry */
export function scoop(f: Flavour, p: Part): [IngredientId, number] | null {
  if (p === 'extra') return EXTRA[f]
  return [p, USE.layer[p]]
}
export const needs = (f: Flavour, p: Part) => (p === 'extra' && !EXTRA[f] ? 0 : LAYERS_PER_BOWL)

export type Bowl = { flavour: Flavour | null; added: Record<Part, number>; stir: number }
const EMPTY_BOWL = (): Bowl => ({ flavour: null, added: { flour: 0, sugar: 0, eggs: 0, butter: 0, extra: 0 }, stir: 0 })
type Saved = { bowl: Bowl; batter: Record<Flavour, number> }
const KEY = 'bwc.kitchen'
const load = (): Saved => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.bowl && s.batter) return { bowl: { ...EMPTY_BOWL(), ...s.bowl, added: { ...EMPTY_BOWL().added, ...s.bowl.added } }, batter: { vanilla: 0, chocolate: 0, strawberry: 0, ...s.batter } } } catch { /* fresh */ }
  return { bowl: EMPTY_BOWL(), batter: { vanilla: 0, chocolate: 0, strawberry: 0 } }
}
type K = Saved & {
  stirring: boolean; pour: { part: Part; t: number } | null; msg: { text: string; t: number; good?: boolean } | null
  choose: (f: Flavour) => void; add: (p: Part) => void; setStirring: (on: boolean) => void; stirBy: (dt: number) => void
  ready: () => boolean; takeLayer: (f: Flavour) => boolean; tip: () => void
  hold: { part: Part; t: number } | null; poured: Record<Part, number>
  startPour: (p: Part) => void; holdTick: (dt: number) => void; stopPour: () => void
  next: () => { at: Part | 'whisk' | 'flavour'; text: string }
}
const persist = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify({ bowl: s.bowl, batter: s.batter })) } catch { /* private mode */ } }
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
export const POUR_MS = 900 // how long one scoop's pour animation takes
const say = (text: string, good = false) => ({ msg: { text, t: performance.now(), good } })
export const STIR_SECONDS = 2.5

export const useKitchen = create<K>((set, get) => ({
  ...(typeof localStorage === 'undefined' ? { bowl: EMPTY_BOWL(), batter: { vanilla: 0, chocolate: 0, strawberry: 0 } } : load()),
  stirring: false, pour: null, msg: null,
  choose: (f) => { const b = get().bowl
    if (b.flavour && b.flavour !== f && PARTS.some((p) => b.added[p] > 0)) return set(say(`this bowl is already ${b.flavour}: finish it (or tip it out) first`))
    const bowl = { ...b, flavour: f }; set({ bowl }); persist({ ...get(), bowl }); play('tap') },
  add: (p) => { const b = get().bowl
    if (!b.flavour) return set(say('pick a flavour first: vanilla, chocolate or strawberry'))
    const need = needs(b.flavour, p)
    if (!need) return set(say(`${b.flavour} batter doesn't need that`))
    if (b.added[p] >= need) return set(say(`that's enough ${p === 'extra' ? 'of that' : p}`))
    if (b.stir > 0) return set(say("you've started stirring: it's all in"))
    const pr = get().pour; if (pr && now() - pr.t < POUR_MS) return // still pouring the last scoop
    const sc = scoop(b.flavour, p)!
    if (!usePantry.getState().useAll([sc])) return set(say(`out of ${sc[0]}: buy more in town`))
    const bowl = { ...b, added: { ...b.added, [p]: b.added[p] + 1 } }; set({ bowl, pour: { part: p, t: now() } }); persist({ ...get(), bowl }); play('tap') },
  ready: () => { const b = get().bowl; return !!b.flavour && PARTS.every((p) => b.added[p] >= needs(b.flavour!, p)) },
  setStirring: (on) => { if (on && !get().ready()) { set({ stirring: false, ...say(get().bowl.flavour ? 'add everything before you stir' : 'pick a flavour first') }); return } set(on ? { stirring: true, msg: null } : { stirring: false }) },
  stirBy: (dt) => { const s = get(); if (!s.stirring || !s.ready()) return
    const stir = Math.min(1, s.bowl.stir + dt / STIR_SECONDS)
    if (stir < 1) { set({ bowl: { ...s.bowl, stir } }); return }
    const f = s.bowl.flavour!, batter = { ...s.batter, [f]: s.batter[f] + LAYERS_PER_BOWL }, bowl = EMPTY_BOWL()
    set({ bowl, batter, stirring: false, poured: { flour: 0, sugar: 0, eggs: 0, butter: 0, extra: 0 }, ...say(`${f} batter ready: 3 layers on the shelf for the cake bench 🎂`, true) }); persist({ bowl, batter }); play('bell') },
  /** the cake bench pours one layer's worth */
  takeLayer: (f) => { const s = get(); if (s.batter[f] < 1) return false
    const batter = { ...s.batter, [f]: s.batter[f] - 1 }; set({ batter }); persist({ ...s, batter }); return true },
  tip: () => { const bowl = EMPTY_BOWL(); set({ bowl, stirring: false, hold: null, poured: { flour: 0, sugar: 0, eggs: 0, butter: 0, extra: 0 }, ...say('bowl tipped out') }); persist({ ...get(), bowl }) },

  // ── HOLD TO POUR (21 Nov, "the kitchen is too vague"): flour, sugar and cocoa pour while you hold them, onto a
  //    kitchen scale. Let go near the target weight. Short? hold again to top up. Eggs, butter, strawberries stay taps.
  hold: null, poured: { flour: 0, sugar: 0, eggs: 0, butter: 0, extra: 0 },
  startPour: (p) => { const s = get(), b = s.bowl
    if (!b.flavour) return set(say('pick a flavour first: vanilla, chocolate or strawberry'))
    if (!pours(b.flavour, p)) return s.add(p)
    if (b.added[p] >= needs(b.flavour, p)) return set(say(`that's enough ${partLabel(b.flavour, p)}`))
    if (b.stir > 0) return set(say("you've started stirring: it's all in"))
    set({ hold: { part: p, t: now() }, pour: { part: p, t: now() }, msg: null }) },
  holdTick: (dt) => { const s = get(); if (!s.hold || !s.bowl.flavour) return
    const p = s.hold.part, tgt = target(s.bowl.flavour, p)
    if (now() - s.hold.t < POUR_MS * 0.38) return // still lifting it over the bowl
    set({ poured: { ...s.poured, [p]: Math.min(tgt * 1.6, s.poured[p] + tgt / POUR_SECONDS * dt) } }) },
  stopPour: () => { const s = get(), h = s.hold; if (!h || !s.bowl.flavour) return set({ hold: null })
    const f = s.bowl.flavour, p = h.part, tgt = target(f, p), g = s.poured[p], sc = scoop(f, p)!
    const r = now() - h.t, k = Math.max(0, Math.min(0.75, r / POUR_MS)) // the sack rights itself and goes home from where it is
    const base = { hold: null, pour: { part: p, t: now() - Math.max(k, 0.75) * POUR_MS } }
    if (g < tgt * 0.85) return set({ ...base, ...say(g < 1 ? `hold the ${partLabel(f, p)} to pour` : `${Math.round(g)} of ${tgt} g: hold again to top up`) })
    if (!usePantry.getState().useAll([[sc[0], g]])) return set({ ...base, ...say(`out of ${sc[0]}: buy more in town`) }) // exactly what you poured
    const bowl = { ...s.bowl, added: { ...s.bowl.added, [p]: needs(f, p) } }
    const off = g / tgt, good = off <= 1.15
    set({ ...base, bowl, ...say(good ? `Perfect! ${Math.round(g)} g of ${partLabel(f, p)}` : `a bit heavy (${Math.round(g)} g), it'll do`, good) }); persist({ ...get(), bowl }); play(good ? 'bell' : 'tap') },
  /** what to do next, for the arrow and the instruction line */
  next: () => { const b = get().bowl
    if (!b.flavour) return { at: 'flavour' as const, text: 'Pick a flavour' }
    for (const p of PARTS) { const need = needs(b.flavour, p); if (b.added[p] < need) {
      const l = partLabel(b.flavour, p)
      return { at: p, text: pours(b.flavour, p) ? `Hold the ${l} · pour ${target(b.flavour, p)} g` : `Tap the ${l} · ${p === 'eggs' ? 'crack' : p === 'butter' ? 'cut' : 'chop'} ${need - b.added[p]} more` } } }
    return { at: 'whisk' as const, text: b.stir > 0 ? 'Keep whisking until it’s smooth' : 'Hold the whisk · stir until smooth' } },
}))
/** which parts are poured by weight (held) rather than tapped */
export const pours = (f: Flavour, p: Part) => p === 'flour' || p === 'sugar' || (p === 'extra' && f === 'chocolate')
export const partLabel = (f: Flavour, p: Part) => p === 'extra' ? (f === 'chocolate' ? 'cocoa' : 'strawberries') : p
/** the weight a whole bowl needs of a poured part (3 layers' worth) */
export const target = (f: Flavour, p: Part) => { const sc = scoop(f, p); return sc ? Math.round(sc[1] * LAYERS_PER_BOWL) : 0 }
export const POUR_SECONDS = 2.2 // holding this long pours exactly the target
if (typeof window !== 'undefined') (window as unknown as { __kitchen: typeof useKitchen }).__kitchen = useKitchen
