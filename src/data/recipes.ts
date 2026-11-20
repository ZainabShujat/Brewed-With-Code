// Real café drinks, simplified into the steps the player performs.
// Ratios follow common specialty-café builds (espresso shot ≈ 30 ml; a double = 2 shots):
//   espresso      2 shots, nothing else
//   americano     2 shots + hot water (~120 ml)
//   latte         2 shots + lots of steamed milk (~180 ml) + a thin layer of foam
//   cappuccino    2 shots + steamed milk and a thick foam cap in roughly equal parts
//   flat white    2 shots + a little velvety microfoam (~110 ml), smaller and stronger than a latte
//   mocha         2 shots + chocolate + steamed milk, often topped with whipped cream
// Owner can add drinks here without touching any other code.

export type Milk = 'none' | 'steamed' | 'foamy' | 'micro'
export type MilkType = 'whole' | 'oat' | 'almond'
export type Topping = 'none' | 'cocoa' | 'cinnamon' | 'sprinkles' | 'whipped'
export type CupSize = 'small' | 'medium' | 'large'

export type Drink = {
  size: CupSize          // which glass from the shelf
  shots: number          // espresso shots pulled
  water: boolean         // hot water added (americano)
  chocolate: boolean     // chocolate sauce (mocha)
  milk: Milk             // how the milk was steamed
  milkType: MilkType
  topping: Topping
}

export type Recipe = { id: string; name: string; price: number; base: Drink; note: string }

const D = (p: Partial<Drink>): Drink => ({ size: 'medium', shots: 2, water: false, chocolate: false, milk: 'none', milkType: 'whole', topping: 'none', ...p })

export const RECIPES: Recipe[] = [
  { id: 'espresso', name: 'Espresso', price: 3, base: D({}), note: '2 shots, that\'s it' },
  { id: 'americano', name: 'Americano', price: 4, base: D({ water: true }), note: '2 shots + hot water' },
  { id: 'latte', name: 'Latte', price: 5, base: D({ milk: 'steamed' }), note: '2 shots + lots of steamed milk' },
  { id: 'cappuccino', name: 'Cappuccino', price: 5, base: D({ milk: 'foamy', topping: 'cocoa' }), note: '2 shots + thick foam, cocoa dust' },
  { id: 'flatwhite', name: 'Flat White', price: 5, base: D({ milk: 'micro' }), note: '2 shots + a little velvety microfoam' },
  { id: 'mocha', name: 'Mocha', price: 6, base: D({ chocolate: true, milk: 'steamed', topping: 'whipped' }), note: '2 shots + chocolate + milk, whipped cream' },
]

// customers sometimes customise: oat/almond milk, an extra shot, a different topping
export type Order = { recipe: Recipe; want: Drink; label: string; cake?: boolean }

export function randomOrder(rand: () => number = Math.random, pool: Recipe[] = RECIPES): Order {
  const list = pool.length ? pool : RECIPES, r = list[Math.floor(rand() * list.length)]
  const want = { ...r.base }
  want.size = r.id === 'espresso' ? 'small' : (['small', 'medium', 'large'] as const)[Math.floor(rand() * 3)]
  const extras: string[] = []
  if (want.milk !== 'none' && rand() < 0.4) { want.milkType = rand() < 0.5 ? 'oat' : 'almond'; extras.push(`${want.milkType} milk`) }
  if (rand() < 0.25) { want.shots = 3; extras.push('extra shot') }
  if (want.milk !== 'none' && want.topping === 'none' && rand() < 0.3) { want.topping = rand() < 0.5 ? 'cinnamon' : 'sprinkles'; extras.push(want.topping) }
  return { recipe: r, want, label: [`${want.size[0].toUpperCase()}${want.size.slice(1)} ${r.name}`, ...extras].join(' · ') }
}

// how close is the drink to the order? each wrong detail costs points
export function score(made: Drink, want: Drink) {
  const misses: string[] = []
  if (made.size !== want.size) misses.push(`${want.size} cup`)
  if (made.shots !== want.shots) misses.push(`${want.shots} shots`)
  if (made.water !== want.water) misses.push(want.water ? 'hot water' : 'no water')
  if (made.chocolate !== want.chocolate) misses.push(want.chocolate ? 'chocolate' : 'no chocolate')
  if (made.milk !== want.milk) misses.push(want.milk === 'none' ? 'no milk' : `${want.milk} milk`)
  else if (want.milk !== 'none' && made.milkType !== want.milkType) misses.push(`${want.milkType} milk`)
  if (made.topping !== want.topping) misses.push(want.topping === 'none' ? 'no topping' : want.topping)
  const pct = Math.max(0, 100 - misses.length * 25)
  return { pct, misses }
}

export const EMPTY: Drink = { size: 'medium', shots: 0, water: false, chocolate: false, milk: 'none', milkType: 'whole', topping: 'none' }

// ── made by hand: real amounts (ml) ──
// What's actually in the glass. The Drink fields above (shots, milk, …) are derived from these, so scoring and the
// old one-click actions keep working while the hand-made path fills glasses for real.
export type Contents = { espresso: number; choc: number; water: number; milk: number; foam: number }
export const NO_CONTENTS: Contents = { espresso: 0, choc: 0, water: 0, milk: 0, foam: 0 }
export const CAP: Record<CupSize, number> = { small: 240, medium: 330, large: 450 } // glass capacity, ml
export const SHOT_ML = 30
export const filled = (c: Contents) => c.espresso + c.choc + c.water + c.milk + c.foam
// craft: how well it was made (0..1), separate from whether it was the right order.
// shots close to 30 ml each, and the glass filled to 75–100% without spilling.
export function craft(c: Contents, size: CupSize, wantShots: number, spilled: boolean, topUp = true) {
  const shotErr = wantShots ? Math.min(1, Math.abs(c.espresso - wantShots * SHOT_ML) / (wantShots * SHOT_ML)) : 0
  const fill = filled(c) / CAP[size]
  const fillErr = topUp && fill < 0.75 ? Math.min(1, (0.75 - fill) / 0.5) : 0 // a plain espresso isn't 'underfilled'
  return Math.max(0, 1 - shotErr * 0.6 - fillErr * 0.5 - (spilled ? 0.25 : 0))
}

/** how evenly the topping covers the drink: the share of an 8x8 grid (inside the surface circle) that got a grain */
export function coverage(grains: [number, number][]) {
  const R = 0.15, N = 8, cell = (2 * R) / N, hit = new Set<number>(); let total = 0
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const cx = -R + (i + 0.5) * cell, cz = -R + (j + 0.5) * cell; if (Math.hypot(cx, cz) <= R) total++ }
  for (const [x, z] of grains) { const i = Math.floor((x + R) / cell), j = Math.floor((z + R) / cell); if (i >= 0 && j >= 0 && i < N && j < N) hit.add(i * N + j) }
  return total ? hit.size / total : 0
}

/** per-station stars (1–3): how each part of the drink went. null = that station wasn't part of the order. */
export type Stations = { brew: number; milk: number | null; finish: number | null; service: number }
export function stationStars(made: Drink, want: Drink, c: Contents, grains: [number, number][], patience: number): Stations {
  const off = Math.abs(c.espresso - want.shots * SHOT_ML)
  const brew = !want.shots ? 3 : made.shots !== want.shots && off > 15 ? 1 : off <= 6 ? 3 : off <= 15 ? 2 : 1
  const milk = want.milk === 'none' ? null : made.milk === want.milk ? (made.milkType === want.milkType ? 3 : 2) : made.milk === 'none' ? 1 : 2
  const finish = want.topping === 'none' ? null : made.topping !== want.topping ? 1
    : want.topping === 'whipped' || !grains.length ? 3 : coverage(grains) >= 0.45 ? 3 : 2
  const service = patience > 0.6 ? 3 : patience > 0.3 ? 2 : 1
  return { brew, milk, finish, service }
}
