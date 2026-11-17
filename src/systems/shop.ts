import { create } from 'zustand'
import { EMPTY, randomOrder, score, type Drink, type MilkType, type Order, type Topping } from '../data/recipes'
import { cafe } from '../world/Customers'
import { useDay } from './day'

// The café's gameplay state: who ordered what, what's in the cup right now, coins, and the last result.
export type Pour = { kind: 'shot' | 'water' | 'choc' | 'milk' | 'sprinkle' | 'whip'; t0: number; color: string; tag?: string }
export type Result = { pct: number; misses: string[]; coins: number; mood: string; t: number }

type Shop = {
  open: boolean                  // café mode on: customers arrive and need serving
  orders: Record<number, Order>  // customer id → their order
  cup: boolean                   // a cup is on the counter
  drink: Drink
  milkType: MilkType             // milk poured into the pitcher (drag a bottle onto it)
  milkStyle: Exclude<Drink['milk'], 'none'> // how the pitcher steams it: click the pitcher to change
  cycleMilkStyle: () => void
  pours: Pour[]                  // running pour/sprinkle animations
  coins: number
  served: number
  last: Result | null
  menu: null | 'fillers' | 'sprinkles' | 'ingredients' | 'milk'
  setMenu: (m: Shop['menu']) => void
  openShop: (on: boolean) => void
  takeCup: (size?: import('../data/recipes').CupSize) => void
  shot: () => void
  water: () => void
  choc: () => void
  milk: (kind: Drink['milk']) => void
  pickMilk: (t: MilkType) => void
  top: (t: Topping) => void
  trash: () => void
  serve: () => void
  tick: (now: number) => void
}

const now = () => performance.now() / 1000
export const SHOT_FILL = 1.6 // seconds the machine takes to pull the shot into the shot glass
// every glass gets an id: a shot still being pulled only ever lands in the glass it was pulled for,
// and shots in flight count toward the 4-shot limit (mashing the machine can't overfill)
let glass = 0, pending = 0
const pour = (kind: Pour['kind'], color: string, tag?: string): Pour => ({ kind, t0: now(), color, tag })

export const useShop = create<Shop>((set, get) => ({
  open: false, orders: {}, cup: false, drink: { ...EMPTY }, milkType: 'whole', milkStyle: 'steamed', pours: [],
  coins: 0, served: 0, last: null, menu: null,
  setMenu: (menu) => set({ menu }),
  openShop: (on) => { cafe.auto = on; cafe.serveEvery = 1e9; set({ open: on }) }, // customers arrive on their own; YOU serve them
  takeCup: (size = 'medium') => { if (!get().cup) { glass++; pending = 0; set({ cup: true, drink: { ...EMPTY, size } }) } },
  // a shot is pulled under the machine first (SHOT_FILL s), then carried over and poured: the glass gets it after that.
  // Presses within a moment of each other are one double/triple shot in the same shot glass.
  shot: () => { const s = get(); if (!s.cup || s.drink.shots + pending >= 4) return
    pending++; const g = glass
    const last = s.pours[s.pours.length - 1], same = last?.kind === 'shot' && last.t0 - now() > SHOT_FILL - 0.3
    set({ pours: same ? s.pours : [...s.pours, { ...pour('shot', '#5b2e1c'), t0: now() + SHOT_FILL }] })
    setTimeout(() => { if (g !== glass) return; pending--; const d = get().drink; if (get().cup) set({ drink: { ...d, shots: d.shots + 1 } }) }, (SHOT_FILL + 0.35) * 1000) },
  water: () => { const s = get(); if (!s.cup || s.drink.water) return; set({ drink: { ...s.drink, water: true }, pours: [...s.pours, pour('water', '#bfe3f2')] }) },
  choc: () => { const s = get(); if (!s.cup || s.drink.chocolate) return; set({ drink: { ...s.drink, chocolate: true }, pours: [...s.pours, pour('choc', '#3b1d12')] }) },
  milk: (kind) => { const s = get(); if (!s.cup || s.drink.milk !== 'none') return; set({ drink: { ...s.drink, milk: kind, milkType: s.milkType }, pours: [...s.pours, pour('milk', s.milkType === 'oat' ? '#f1e2c6' : s.milkType === 'almond' ? '#f5ead8' : '#fffaf2')] }) },
  pickMilk: (t) => set({ milkType: t, menu: null }),
  cycleMilkStyle: () => set((s) => ({ milkStyle: s.milkStyle === 'steamed' ? 'foamy' : s.milkStyle === 'foamy' ? 'micro' : 'steamed' })),
  top: (t) => { const s = get(); if (!s.cup || s.drink.topping !== 'none') return; set({ drink: { ...s.drink, topping: t }, menu: null, pours: [...s.pours, pour(t === 'whipped' ? 'whip' : 'sprinkle', t === 'cocoa' ? '#5b2e1c' : t === 'cinnamon' ? '#b0602a' : '#ff7fb6', t)] }) },
  trash: () => { glass++; pending = 0; set({ cup: false, drink: { ...EMPTY } }) },
  serve: () => {
    const s = get(), front = cafe.line.peek()
    if (!s.cup || !front || front.phase !== 'line') return
    const order = s.orders[front.id]; if (!order) return
    const r = score(s.drink, order.want)
    const tip = r.pct === 100 ? 1 + Math.round(front.patience * 3) : r.pct >= 75 ? Math.round(front.patience * 2) : 0 // quick + right = bigger tip
    const coins = Math.round(order.recipe.price * r.pct / 100) + tip
    const D = useDay.getState(); D.record('served'); D.record('coins', coins - tip); D.record('tips', tip); if (r.pct === 100) D.record('perfect')
    const mood = r.pct === 100 ? '😍' : r.pct >= 75 ? '🙂' : r.pct >= 50 ? '😐' : '😤'
    const orders = { ...s.orders }; delete orders[front.id]
    glass++; pending = 0
    cafe.serve() // dequeue: the front of the line leaves first
    set({ cup: false, drink: { ...EMPTY }, coins: s.coins + coins, served: s.served + 1, orders, last: { ...r, coins, mood, t: now() } })
  },
  // every frame: give the customer at the front an order once they reach the counter
  tick: () => {
    const s = get(), front = cafe.line.peek()
    if (front && front.phase === 'line' && !s.orders[front.id]) set({ orders: { ...s.orders, [front.id]: randomOrder() } })
    if (s.pours.length && now() - s.pours[0].t0 > 3) set({ pours: s.pours.filter((p) => now() - p.t0 < 3) })
  },
}))

// handle for headless tests / reels
if (typeof window !== 'undefined') (window as unknown as { __shop: typeof useShop }).__shop = useShop
