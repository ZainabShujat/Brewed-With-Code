import { create } from 'zustand'
import { useDay } from './day'
import { usePantry } from './pantry'
import { useKitchen } from './kitchen'
import { USE, type IngredientId } from '../data/ingredients'
const use = (items: [IngredientId, number][]) => usePantry.getState().useAll(items)

// The cake bench: stack sponges, fill, frost, pipe rosettes, top, box. Every step is data,
// so the 3D cake (world/Cake.tsx) just draws whatever is in this state, animating new parts in.
export type Sponge = 'vanilla' | 'chocolate' | 'strawberry'
export type Filling = 'cream' | 'jam'
export type Frosting = 'none' | 'pink' | 'white' | 'chocolate' | 'lavender'
export type Pipe = 'none' | 'white' | 'pink' | 'chocolate'
export type CakeTop = 'none' | 'sprinkles' | 'cherries' | 'strawberries' | 'candles'

export type Tin = 'none' | 'round' | 'square' | 'heart'
export type Cake = { tin: Tin; layers: Sponge[]; fillings: Filling[]; frosting: Frosting; piping: Pipe; top: CakeTop }
export type CakeOrder = { want: Cake; label: string }

export const SPONGE_COL: Record<Sponge, string> = { vanilla: '#f1d6a2', chocolate: '#6b3f2a', strawberry: '#f2a7b4' }
export const FILL_COL: Record<Filling, string> = { cream: '#fff6ec', jam: '#c2324f' }
export const FROST_COL: Record<Exclude<Frosting, 'none'>, string> = { pink: '#f4b6c8', white: '#fbf6ef', chocolate: '#5a3424', lavender: '#cdb8e6' }
export const PIPE_COL: Record<Exclude<Pipe, 'none'>, string> = { white: '#fffaf3', pink: '#ef93b1', chocolate: '#4a2a1c' }

// the flavours on Today's Menu (set by systems/orders to avoid an import loop)
let spongesOnMenu: () => Sponge[] = () => []
export const setCakeMenu = (f: () => Sponge[]) => { spongesOnMenu = f }
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
export function randomCakeOrder(): CakeOrder {
  const n = pick([2, 3, 3])
  const onMenu = spongesOnMenu(), sponge = pick(onMenu.length ? onMenu : (['vanilla', 'chocolate', 'strawberry'] as const))
  const tin = pick(['round', 'square', 'heart'] as const)
  const want: Cake = {
    tin,
    layers: Array(n).fill(sponge), fillings: Array(n - 1).fill(pick(['cream', 'jam'] as const)),
    frosting: pick(['pink', 'white', 'chocolate', 'lavender'] as const), piping: pick(['white', 'pink', 'chocolate'] as const),
    top: pick(['sprinkles', 'cherries', 'strawberries', 'candles'] as const),
  }
  return { want, label: `${tin} tin · ${n}-layer ${sponge} · ${want.fillings[0]} · ${want.frosting} frosting · ${want.piping} rosettes · ${want.top}` }
}

export function scoreCake(made: Cake, want: Cake) {
  const misses: string[] = []
  if (made.tin !== want.tin) misses.push(`${want.tin} tin`)
  if (made.layers.length !== want.layers.length) misses.push(`${want.layers.length} layers`)
  else if (made.layers.some((l, i) => l !== want.layers[i])) misses.push(`${want.layers[0]} sponge`)
  if (made.fillings.join() !== want.fillings.join()) misses.push(`${want.fillings[0]} filling`)
  if (made.frosting !== want.frosting) misses.push(`${want.frosting} frosting`)
  if (made.piping !== want.piping) misses.push(`${want.piping} rosettes`)
  if (made.top !== want.top) misses.push(want.top)
  return { pct: Math.max(0, 100 - misses.length * 17), misses }
}

const EMPTY: Cake = { tin: 'none', layers: [], fillings: [], frosting: 'none', piping: 'none', top: 'none' }
const now = () => performance.now() / 1000

type CakeState = {
  cake: Cake
  order: CakeOrder
  t: Record<string, number>   // when each part was added (drives the 3D animations)
  coins: number
  last: { pct: number; misses: string[]; coins: number; t: number } | null
  spin: boolean
  orderUntil: number   // the order screen shows the cake until this time (ms), then you work from memory
  peeks: number
  why: { text: string; t: number } | null // why the last dispenser did nothing
  yay: { text: string; t: number } | null // a dispenser just finished (a little ✓ pop)
  peek: () => void
  showFor: () => void
  setTin: (t: Exclude<Tin, 'none'>) => void
  addLayer: (s: Sponge) => void
  addFilling: (f: Filling) => void
  frost: (f: Exclude<Frosting, 'none'>) => void
  pipe: (p: Exclude<Pipe, 'none'>) => void
  topWith: (t: Exclude<CakeTop, 'none'>) => void
  box: () => void
  reset: () => void
  newOrder: () => void
}

const no = (set: (p: Partial<CakeState>) => void, text: string) => set({ why: { text, t: performance.now() } })
export const useCake = create<CakeState>((set, get) => ({
  cake: { ...EMPTY }, order: randomCakeOrder(), t: {}, coins: 0, last: null, spin: true, orderUntil: 0, peeks: 0, why: null, yay: null,
  showFor: () => set({ orderUntil: performance.now() + 8000 }),
  peek: () => set((s) => ({ orderUntil: performance.now() + 2500, peeks: s.peeks + 1 })),
  // the tin comes first: it decides the cake's shape
  setTin: (tin) => { const c = get().cake; if (c.layers.length) return; set({ cake: { ...c, tin }, t: { ...get().t, tin: now() } }) },
  // a sponge can only go on bare cake or on a filling (fillings sit *between* layers)
  addLayer: (s) => { const c = get().cake
    if (c.tin === 'none') return no(set, 'pick a tin first ⚪')
    if (c.frosting !== 'none') return no(set, "it's frosted: no more sponge on top")
    if (c.layers.length >= 4) return no(set, "that's the tallest cake the machine makes (4 tiers)")
    if (c.layers.length > c.fillings.length) return no(set, 'add a filling before the next sponge')
    // the batter comes from the kitchen (flour, sugar, eggs, butter were used there): pour one layer's worth
    if (!useKitchen.getState().takeLayer(s)) return no(set, `no ${s} batter: make a bowl in the kitchen 🥣`)
    set({ cake: { ...c, layers: [...c.layers, s] }, t: { ...get().t, [`L${c.layers.length}`]: now() } }) },
  addFilling: (f) => { const c = get().cake
    if (!c.layers.length) return no(set, 'add a sponge first 🍰')
    if (c.frosting !== 'none') return no(set, "it's frosted already")
    if (c.fillings.length >= c.layers.length) return no(set, 'add a sponge on top of that filling (or frost it)')
    if (!use([USE.filling[f]])) return
    set({ cake: { ...c, fillings: [...c.fillings, f] }, t: { ...get().t, [`F${c.fillings.length}`]: now() } }) },
  frost: (f) => { const c = get().cake
    if (!c.layers.length) return no(set, 'add a sponge first 🍰')
    if (c.frosting !== 'none') return no(set, 'already frosted ✨')
    if (!use([['sugar', USE.frosting.sugar], ['butter', USE.frosting.butter]])) return
    set({ cake: { ...c, frosting: f }, t: { ...get().t, frost: now() } }) },
  pipe: (p) => { const c = get().cake
    if (c.frosting === 'none') return no(set, 'frost the cake first, then rosettes')
    if (c.piping !== 'none') return no(set, 'it has rosettes already')
    if (!use([['sugar', USE.piping.sugar], ['cream', USE.piping.cream]])) return
    set({ cake: { ...c, piping: p }, t: { ...get().t, pipe: now() } }) },
  topWith: (tp) => { const c = get().cake
    if (c.frosting === 'none') return no(set, 'frost the cake first, then toppings')
    if (c.top !== 'none') return no(set, 'it has toppings already')
    if (!use([USE.cakeTop[tp]])) return
    set({ cake: { ...c, top: tp }, t: { ...get().t, top: now() } }) },
  box: () => { const s = get(); if (!s.cake.layers.length) return
    const r0 = scoreCake(s.cake, s.order.want), r = { ...r0, pct: Math.max(0, r0.pct - s.peeks * 5) } // each peek at the order costs a little
    const coins = Math.round(12 * r.pct / 100) + (r.pct === 100 ? 4 : 0)
    useDay.getState().record('cakes'); useDay.getState().record('coins', coins); if (r.pct === 100) useDay.getState().record('perfect')
    set({ coins: s.coins + coins, last: { ...r, coins, t: now() }, cake: { ...EMPTY }, t: {}, order: randomCakeOrder(), orderUntil: performance.now() + 8000, peeks: 0 }) },
  reset: () => set({ cake: { ...EMPTY }, t: {} }),
  newOrder: () => set({ order: randomCakeOrder(), orderUntil: performance.now() + 8000, peeks: 0 }),
}))

/** what to do next at the cake machine (new-player guidance): the station, and which choice the order wants there */
export type CakeStation = 'tin' | 'layer' | 'fill' | 'frost' | 'pipe' | 'top' | 'star'
export function nextCakeStep(c: Cake, want: Cake): { at: CakeStation; want: string } {
  if (c.tin === 'none') return { at: 'tin', want: want.tin }
  const n = want.layers.length
  if (c.frosting === 'none') {
    if (!c.layers.length) return { at: 'layer', want: want.layers[0] }
    if (c.layers.length < n) return c.layers.length > c.fillings.length ? { at: 'fill', want: want.fillings[c.fillings.length] ?? want.fillings[0] } : { at: 'layer', want: want.layers[c.layers.length] }
    return { at: 'frost', want: want.frosting }
  }
  if (c.piping === 'none') return { at: 'pipe', want: want.piping }
  if (c.top === 'none') return { at: 'top', want: want.top }
  return { at: 'star', want: '' }
}
