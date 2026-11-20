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
    set({ bowl, batter, stirring: false, ...say(`${f} batter ready: 3 layers on the shelf for the cake bench 🎂`, true) }); persist({ bowl, batter }); play('bell') },
  /** the cake bench pours one layer's worth */
  takeLayer: (f) => { const s = get(); if (s.batter[f] < 1) return false
    const batter = { ...s.batter, [f]: s.batter[f] - 1 }; set({ batter }); persist({ ...s, batter }); return true },
  tip: () => { const bowl = EMPTY_BOWL(); set({ bowl, stirring: false, ...say('bowl tipped out') }); persist({ ...get(), bowl }) },
}))
if (typeof window !== 'undefined') (window as unknown as { __kitchen: typeof useKitchen }).__kitchen = useKitchen
