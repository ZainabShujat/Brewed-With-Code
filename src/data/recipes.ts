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
export type Order = { recipe: Recipe; want: Drink; label: string }

export function randomOrder(rand: () => number = Math.random): Order {
  const r = RECIPES[Math.floor(rand() * RECIPES.length)]
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
