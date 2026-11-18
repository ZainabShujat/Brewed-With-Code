import { create } from 'zustand'
import { EMPTY, randomOrder, score, craft as craftScore, CAP, SHOT_ML, NO_CONTENTS, filled, type Contents, type Drink, type MilkType, type Order, type Topping } from '../data/recipes'
import { cafe } from '../world/Customers'
import { useDay } from './day'

// The café's gameplay state: who ordered what, what's in the cup right now, coins, and the last result.
export type Pour = { kind: 'shot' | 'water' | 'choc' | 'milk' | 'sprinkle' | 'whip'; t0: number; color: string; tag?: string; dur?: number } // dur: how long the pour lasts (hold-to-pour); default per kind
export type Result = { pct: number; misses: string[]; coins: number; mood: string; t: number; craft?: number; tip?: number }
export type Texture = Exclude<Drink['milk'], 'none'>
// the milk pitcher (made by hand): what's in it, where it sits, and how long it's been steamed
export type Pitcher = { milk: number; foam: number; type: MilkType; at: 'home' | 'wand'; stretch: number }

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
  // ── made by hand ──
  ml: Contents                   // what's really in the glass
  spilled: boolean               // overfilled at some point (costs craft)
  texture: Texture | null        // the milk texture that went into the glass
  shotGlass: number              // ml of espresso waiting in the shot glass under the machine
  pulling: boolean; steaming: boolean; pouringMilk: boolean
  pitcher: Pitcher
  pullTick: (dt: number) => void      // hold the machine
  pourShotGlass: () => void           // tip the shot glass into your glass
  fillPitcher: (t: MilkType, dt: number) => void // hold a milk bottle
  placePitcher: (at: Pitcher['at']) => void
  steamTick: (dt: number) => void     // hold the steam wand (pitcher on it)
  pourMilkTick: (dt: number) => void  // hold the pitcher over your glass
  hint: string                        // why the last action did nothing (shown on the recipe card)
  filling: boolean                    // holding a milk bottle over the pitcher
  cheer: { text: string; t: number; good: boolean } | null // a sweet-spot release: a ding and a little "spot on"
  shake: number                       // seconds of shaking a topping onto this glass (how much lands)
  grains: [number, number][]          // where each grain landed on the drink (glass space, within r 0.15)
  shakeAt: [number, number]           // where the shaker's mouth is over the glass right now (glass space)
  shaking: string | null              // which shaker is being held over the glass right now
  shakeTick: (t: Topping, dt: number) => void
}

const now = () => performance.now() / 1000
export const SHOT_FILL = 1.6 // seconds the machine takes to pull the shot into the shot glass
// every glass gets an id: a shot still being pulled only ever lands in the glass it was pulled for,
// and shots in flight count toward the 4-shot limit (mashing the machine can't overfill)
let glass = 0, pending = 0
// texture from steaming time: a short stretch = silky microfoam, longer = steamed latte milk, long = a big foam cap
export const textureOf = (stretch: number): Texture => (stretch < 1.0 ? 'micro' : stretch < 2.2 ? 'steamed' : 'foamy')
const foamFrac = (t: Texture) => (t === 'micro' ? 0.06 : t === 'steamed' ? 0.12 : 0.45)
// the Drink fields follow from what's really in the glass
const derive = (d: Drink, c: Contents, texture: Texture | null): Drink => ({ ...d, shots: Math.round(c.espresso / SHOT_ML), chocolate: c.choc > 0, water: c.water > 0, milk: c.milk + c.foam > 15 ? texture ?? 'steamed' : 'none' })
const fresh = () => ({ ml: { ...NO_CONTENTS }, spilled: false, texture: null as Texture | null, shake: 0, grains: [] as [number, number][], shakeAt: [0, 0] as [number, number] })
const pour = (kind: Pour['kind'], color: string, tag?: string): Pour => ({ kind, t0: now(), color, tag })

// a glass counts as full at 95% (just under the rim): milk and water stop pouring there
export const FULL = 0.95

export const useShop = create<Shop>((set, get) => ({
  open: false, orders: {}, cup: false, drink: { ...EMPTY }, milkType: 'whole', milkStyle: 'steamed', pours: [],
  coins: 0, served: 0, last: null, menu: null,
  ...fresh(), shotGlass: 0, pulling: false, steaming: false, pouringMilk: false, hint: '', shaking: null, cheer: null, filling: false,
  pitcher: { milk: 0, foam: 0, type: 'whole', at: 'home', stretch: 0 },
  setMenu: (menu) => set({ menu }),
  openShop: (on) => { cafe.auto = on; cafe.serveEvery = 1e9; set({ open: on }) }, // customers arrive on their own; YOU serve them
  takeCup: (size = 'medium') => { if (!get().cup) { glass++; pending = 0; set({ cup: true, drink: { ...EMPTY, size }, ...fresh(), hint: '' }) } },
  // a shot is pulled under the machine first (SHOT_FILL s), then carried over and poured: the glass gets it after that.
  // Presses within a moment of each other are one double/triple shot in the same shot glass.
  shot: () => { const s = get(); if (!s.cup || s.drink.shots + pending >= 4) return
    pending++; const g = glass
    const last = s.pours[s.pours.length - 1], same = last?.kind === 'shot' && last.t0 - now() > SHOT_FILL - 0.3
    set({ pours: same ? s.pours : [...s.pours, { ...pour('shot', '#5b2e1c'), t0: now() + SHOT_FILL }] })
    setTimeout(() => { if (g !== glass) return; pending--; const st = get(); if (st.cup) { const ml = { ...st.ml, espresso: st.ml.espresso + SHOT_ML }; set({ ml, drink: derive(st.drink, ml, st.texture) }) } }, (SHOT_FILL + 0.35) * 1000) },
  water: () => { const s = get(); if (!s.cup || s.drink.water) return; const ml = { ...s.ml, water: Math.max(0, FULL * CAP[s.drink.size] - filled(s.ml)) } /* hot water tops the glass up to the brim */; set({ ml, drink: derive(s.drink, ml, s.texture), pours: [...s.pours, pour('water', '#bfe3f2')] }) },
  choc: () => { const s = get(); if (!s.cup || s.drink.chocolate) return; const ml = { ...s.ml, choc: 20 }; set({ ml, drink: derive(s.drink, ml, s.texture), pours: [...s.pours, pour('choc', '#3b1d12')] }) },
  // one-click milk (reels and the old flow): tops the glass up to ~90% with milk of that texture
  milk: (kind) => { const s = get(); if (!s.cup || s.drink.milk !== 'none' || kind === 'none') return
    const room = Math.max(0, CAP[s.drink.size] * 0.9 - filled(s.ml)), f = foamFrac(kind as Texture)
    const ml = { ...s.ml, milk: s.ml.milk + room * (1 - f), foam: s.ml.foam + room * f }
    set({ ml, texture: kind as Texture, drink: { ...derive(s.drink, ml, kind as Texture), milkType: s.milkType }, pours: [...s.pours, pour('milk', s.milkType === 'oat' ? '#f1e2c6' : s.milkType === 'almond' ? '#f5ead8' : '#fffaf2')] }) },
  pickMilk: (t) => set({ milkType: t, menu: null }),
  cycleMilkStyle: () => set((s) => ({ milkStyle: s.milkStyle === 'steamed' ? 'foamy' : s.milkStyle === 'foamy' ? 'micro' : 'steamed' })),
  top: (t) => { const s = get(); if (!s.cup || s.drink.topping !== 'none') return; set({ shake: 0.7, drink: { ...s.drink, topping: t }, menu: null, pours: [...s.pours, pour(t === 'whipped' ? 'whip' : 'sprinkle', t === 'cocoa' ? '#5b2e1c' : t === 'cinnamon' ? '#b0602a' : '#ff7fb6', t)] }) },
  trash: () => { glass++; pending = 0; set({ cup: false, drink: { ...EMPTY }, ...fresh() }) },
  serve: () => {
    const s = get(), front = cafe.line.peek()
    if (!s.cup) return
    if (!front || front.phase !== 'line') { set({ hint: 'nobody is waiting at the counter yet' }); return }
    const order = s.orders[front.id]; if (!order) return
    if (filled(s.ml) < 10) { set({ hint: 'that glass is empty!' }); return }
    const r = score(s.drink, order.want)
    // right order = full price; craft (shot volume, fill level, no spills) and speed earn the tip
    const cr = craftScore(s.ml, s.drink.size, order.want.shots, s.spilled, order.want.milk !== 'none' || order.want.water)
    const tip = r.pct === 100 ? 1 + Math.round(front.patience * 2 + cr * 3) : r.pct >= 75 ? Math.round(front.patience * 2 + cr) : 0
    const coins = Math.round((order.recipe?.price ?? 5) * r.pct / 100) + tip
    const D = useDay.getState(); D.record('served'); D.record('coins', coins - tip); D.record('tips', tip); if (r.pct === 100) D.record('perfect')
    const mood = r.pct === 100 ? '😍' : r.pct >= 75 ? '🙂' : r.pct >= 50 ? '😐' : '😤'
    const orders = { ...s.orders }; delete orders[front.id]
    glass++; pending = 0
    cafe.serve() // dequeue: the front of the line leaves first
    set({ cup: false, drink: { ...EMPTY }, ...fresh(), hint: '', coins: s.coins + coins, served: s.served + 1, orders, last: { ...r, coins, mood, t: now(), craft: cr, tip } })
  },
  // ── made by hand ──
  shakeTick: (t, dt) => { const s = get(); if (!s.cup) return; const shake = s.shake + dt
    // ~40 grains a second land right under the shaker's mouth (a little scatter), so where you shake is where it goes
    const grains = s.grains.slice(), n = Math.floor(shake * 40) - Math.floor(s.shake * 40)
    for (let i = 0; i < n && grains.length < 90; i++) { const k = grains.length, a = k * 2.39996, r = 0.012 + ((k * 37) % 23) / 23 * 0.03
      let x = s.shakeAt[0] + Math.cos(a) * r, z = s.shakeAt[1] + Math.sin(a) * r; const d = Math.hypot(x, z); if (d > 0.15) { x *= 0.15 / d; z *= 0.15 / d }
      grains.push([x, z]) }
    set(s.drink.topping === 'none' && shake >= 0.35 ? { shake, grains, drink: { ...s.drink, topping: t } } : { shake, grains }) },
  pullTick: (dt) => { const s = get(); if (s.shotGlass >= 95) return; set({ shotGlass: Math.min(95, s.shotGlass + 25 * dt) }) },
  pourShotGlass: () => { const s = get()
    if (!s.cup) { set({ hint: 'put a glass on the coaster first' }); return }
    if (s.shotGlass < 3) { set({ hint: 'the shot glass is empty: hold the machine to pull a shot' }); return }
    const room = CAP[s.drink.size] - filled(s.ml), ml = { ...s.ml, espresso: s.ml.espresso + Math.min(s.shotGlass, room) }
    set({ ml, spilled: s.spilled || s.shotGlass > room, shotGlass: 0, hint: '', drink: derive(s.drink, ml, s.texture), pours: [...s.pours, pour('shot', '#5b2e1c')] }) },
  fillPitcher: (t, dt) => { const s = get(), p = s.pitcher, have = p.milk + p.foam
    if (have >= 360) return
    // a different milk into a part-full pitcher just takes over (it's a cozy game)
    set({ milkType: t, hint: '', pitcher: { ...p, type: t, milk: p.milk + Math.min(90 * dt, 360 - have) } }) },
  placePitcher: (at) => set((s) => ({ pitcher: { ...s.pitcher, at } })),
  steamTick: (dt) => { const s = get(), p = s.pitcher, have = p.milk + p.foam
    if (p.at !== 'wand' || have < 5) { set({ hint: p.at !== 'wand' ? 'put the pitcher on the steam wand first' : 'the pitcher is empty: hold a milk bottle to fill it' }); return }
    const stretch = p.stretch + dt, f = Math.min(0.55, Math.max(0, (stretch - 0.3) * 0.22))
    set({ hint: '', pitcher: { ...p, stretch, foam: have * f, milk: have * (1 - f) } }) },
  pourMilkTick: (dt) => { const s = get(), p = s.pitcher
    if (!s.cup) return
    if (p.milk + p.foam < 1) { set({ hint: 'the pitcher is empty' }); return }
    const room = FULL * CAP[s.drink.size] - filled(s.ml), amt = 90 * dt
    if (room <= 0.01) return // full to the brim: the pour stops by itself (no spills, every glass ends up full)
    // the silky milk pours first; the foam slides out last and sits on top
    const fromMilk = Math.min(p.milk, amt), fromFoam = Math.min(p.foam, amt - fromMilk), k = Math.min(1, room / Math.max(0.0001, fromMilk + fromFoam))
    const texture = s.texture ?? textureOf(p.stretch), ml = { ...s.ml, milk: s.ml.milk + fromMilk * k, foam: s.ml.foam + fromFoam * k }
    const left = p.milk - fromMilk * k + p.foam - fromFoam * k
    set({ ml, texture, milkType: p.type, hint: '', drink: { ...derive(s.drink, ml, texture), milkType: p.type },
      pitcher: { ...p, milk: p.milk - fromMilk * k, foam: p.foam - fromFoam * k, stretch: left < 1 ? 0 : p.stretch } }) },
  // every frame: give the customer at the front an order once they reach the counter
  tick: () => {
    const s = get(), front = cafe.line.peek()
    if (front && front.phase === 'line' && !s.orders[front.id]) set({ orders: { ...s.orders, [front.id]: randomOrder() } })
    // finished pour animations are tidied away (a hold-to-pour stays until it's released and done)
    const keep = (p: Pour) => now() - p.t0 < 3 + (p.dur === undefined ? 0 : Number.isFinite(p.dur) ? p.dur : 1e9)
    if (s.pours.length && !keep(s.pours[0])) set({ pours: s.pours.filter(keep) })
  },
}))

// handle for headless tests / reels
if (typeof window !== 'undefined') (window as unknown as { __shop: typeof useShop }).__shop = useShop
