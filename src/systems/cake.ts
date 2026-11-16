import { create } from 'zustand'

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

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
export function randomCakeOrder(): CakeOrder {
  const n = pick([2, 3, 3])
  const sponge = pick(['vanilla', 'chocolate', 'strawberry'] as const)
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

export const useCake = create<CakeState>((set, get) => ({
  cake: { ...EMPTY }, order: randomCakeOrder(), t: {}, coins: 0, last: null, spin: true, orderUntil: 0, peeks: 0,
  showFor: () => set({ orderUntil: performance.now() + 8000 }),
  peek: () => set((s) => ({ orderUntil: performance.now() + 2500, peeks: s.peeks + 1 })),
  // the tin comes first: it decides the cake's shape
  setTin: (tin) => { const c = get().cake; if (c.layers.length) return; set({ cake: { ...c, tin }, t: { ...get().t, tin: now() } }) },
  // a sponge can only go on bare cake or on a filling (fillings sit *between* layers)
  addLayer: (s) => { const c = get().cake; if (c.tin === 'none' || c.frosting !== 'none' || c.layers.length >= 4 || c.layers.length > c.fillings.length) return
    set({ cake: { ...c, layers: [...c.layers, s] }, t: { ...get().t, [`L${c.layers.length}`]: now() } }) },
  addFilling: (f) => { const c = get().cake; if (c.frosting !== 'none' || !c.layers.length || c.fillings.length >= c.layers.length) return
    set({ cake: { ...c, fillings: [...c.fillings, f] }, t: { ...get().t, [`F${c.fillings.length}`]: now() } }) },
  frost: (f) => { const c = get().cake; if (!c.layers.length || c.frosting !== 'none' || c.fillings.length >= c.layers.length) return
    set({ cake: { ...c, frosting: f }, t: { ...get().t, frost: now() } }) },
  pipe: (p) => { const c = get().cake; if (c.frosting === 'none' || c.piping !== 'none') return
    set({ cake: { ...c, piping: p }, t: { ...get().t, pipe: now() } }) },
  topWith: (tp) => { const c = get().cake; if (c.frosting === 'none' || c.top !== 'none') return
    set({ cake: { ...c, top: tp }, t: { ...get().t, top: now() } }) },
  box: () => { const s = get(); if (!s.cake.layers.length) return
    const r0 = scoreCake(s.cake, s.order.want), r = { ...r0, pct: Math.max(0, r0.pct - s.peeks * 5) } // each peek at the order costs a little
    const coins = Math.round(12 * r.pct / 100) + (r.pct === 100 ? 4 : 0)
    set({ coins: s.coins + coins, last: { ...r, coins, t: now() }, cake: { ...EMPTY }, t: {}, order: randomCakeOrder(), orderUntil: performance.now() + 8000, peeks: 0 }) },
  reset: () => set({ cake: { ...EMPTY }, t: {} }),
  newOrder: () => set({ order: randomCakeOrder(), orderUntil: performance.now() + 8000, peeks: 0 }),
}))
