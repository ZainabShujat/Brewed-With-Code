import { RECIPES, CAP, SHOT_ML, type Recipe } from './recipes'
import { INGREDIENTS, USE, type IngredientId } from './ingredients'

// ONE place for everything the café can sell (21 Nov). Today's Menu, the Recipe Book and the customers' orders all
// read from here, so a change to a recipe changes all three. Drinks wrap the brewing rules in data/recipes.ts;
// cakes describe the kitchen → cake bench chain. New categories (pastries, breakfast, sandwiches) slot in as data.

export type Category = 'hot' | 'cold' | 'cakes' | 'pastries' | 'breakfast' | 'food'
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'hot', label: '☕ Hot drinks' }, { id: 'cold', label: '🧊 Cold drinks' }, { id: 'cakes', label: '🎂 Cakes' },
  { id: 'pastries', label: '🥐 Pastries & desserts' }, { id: 'breakfast', label: '🍳 Breakfast' }, { id: 'food', label: '🥪 Sandwiches & food' },
]
export type Station = 'bar' | 'kitchen' | 'cake'
export const STATION_NAME: Record<Station, string> = { bar: 'coffee counter', kitchen: 'kitchen', cake: 'cake bench' }

export type Line = { id: IngredientId; qty: number; role: string }
export type Step = { at: Station; text: string; equipment?: string }
export type MenuItem = {
  id: string; name: string; category: Category; icon: string; price: number; about: string
  ingredients: Line[]; steps: Step[]; minutes: number
  unlockDay: number
  stations: Station[]                // every station it passes through, in order
  order: { kind: 'drink'; recipe: Recipe } | { kind: 'cake'; sponge: 'vanilla' | 'chocolate' | 'strawberry' }
}

const M = 'medium' as const
function drink(r: Recipe, icon: string, minutes: number, unlockDay = 1): MenuItem {
  const b = r.base, shotMl = b.shots * SHOT_ML, milk = b.milk !== 'none' ? CAP[M] - shotMl - (b.chocolate ? 20 : 0) : 0
  const ing: Line[] = [{ id: 'beans', qty: Math.round(shotMl * USE.beansPerMl), role: `ground for ${b.shots} espresso shots (${shotMl} ml)` }]
  if (b.chocolate) ing.push({ id: 'chocSauce', qty: USE.chocPerDrink, role: 'chocolate sauce in the bottom of the glass' })
  if (milk) ing.push({ id: 'milkWhole', qty: milk, role: b.milk === 'foamy' ? 'steamed into a thick foam cap' : b.milk === 'micro' ? 'steamed into silky microfoam' : 'steamed and poured in' })
  if (b.topping === 'whipped') ing.push({ id: 'cream', qty: USE.whipCream, role: 'whipped cream on top' })
  else if (b.topping !== 'none') ing.push({ id: b.topping as IngredientId, qty: USE.topping[b.topping], role: 'dusted on top' })
  const steps: Step[] = [{ at: 'bar', text: 'put a glass on the mat', equipment: 'glass' }, { at: 'bar', text: `hold the machine to pull ${b.shots} shots, pour them in`, equipment: 'espresso machine' }]
  if (b.water) steps.push({ at: 'bar', text: 'top up with hot water', equipment: 'kettle' })
  if (b.chocolate) steps.push({ at: 'bar', text: 'add the chocolate sauce' })
  if (milk) steps.push({ at: 'bar', text: 'fill the jug with milk, steam it at the wand, pour', equipment: 'milk jug + steam wand' })
  if (b.topping !== 'none') steps.push({ at: 'bar', text: b.topping === 'whipped' ? 'add whipped cream' : `dust with ${b.topping}` })
  steps.push({ at: 'bar', text: 'drag it onto the pass to serve' })
  return { id: r.id, name: r.name, category: 'hot', icon, price: r.price, about: r.note, ingredients: ing, steps, minutes, unlockDay, stations: ['bar'], order: { kind: 'drink', recipe: r } }
}

function cake(sponge: 'vanilla' | 'chocolate' | 'strawberry', name: string, icon: string, about: string): MenuItem {
  const L = 3, extra = USE.spongeExtra[sponge]
  const ing: Line[] = [
    { id: 'flour', qty: USE.layer.flour * L, role: 'batter (kitchen)' }, { id: 'sugar', qty: USE.layer.sugar * L + USE.frosting.sugar, role: 'batter + frosting' },
    { id: 'eggs', qty: USE.layer.eggs * L, role: 'batter (kitchen)' }, { id: 'butter', qty: USE.layer.butter * L + USE.frosting.butter, role: 'batter + frosting' },
  ]
  if (extra) ing.push({ id: extra[0], qty: extra[1] * L, role: sponge === 'chocolate' ? 'cocoa in the batter' : 'fresh strawberries in the batter' })
  ing.push({ id: 'cream', qty: USE.filling.cream[1] * (L - 1), role: 'filling between layers (or jam)' })
  return {
    id: `cake-${sponge}`, name, category: 'cakes', icon, price: 9, about, ingredients: ing, minutes: 6, unlockDay: 7, stations: ['kitchen', 'cake'],
    steps: [
      { at: 'kitchen', text: `weigh flour, sugar, butter${extra ? `, ${INGREDIENTS[extra[0]].label}` : ''} and crack the eggs into the bowl`, equipment: 'scales + mixing bowl' },
      { at: 'kitchen', text: 'stir until smooth: that bowl of batter goes to the cake bench', equipment: 'whisk' },
      { at: 'cake', text: 'pick the tin and pour in a layer of sponge per tier', equipment: 'cake tin' },
      { at: 'cake', text: 'fill between the layers, frost, pipe rosettes, add the topping' },
      { at: 'cake', text: 'box it and hand it over' },
    ],
    order: { kind: 'cake', sponge },
  }
}

const ICON: Record<string, string> = { espresso: '☕', americano: '🍵', latte: '🥛', cappuccino: '☁️', flatwhite: '🤍', mocha: '🍫' }
export const MENU: MenuItem[] = [
  ...RECIPES.map((r) => drink(r, ICON[r.id] ?? '☕', r.id === 'espresso' ? 1 : 2)),
  cake('vanilla', 'Vanilla Layer Cake', '🎂', 'light vanilla sponge in layers'),
  cake('chocolate', 'Chocolate Layer Cake', '🍫', 'rich cocoa sponge, the town favourite'),
  cake('strawberry', 'Strawberry Layer Cake', '🍓', 'pink sponge with real strawberries'),
]
export const byId = (id: string) => MENU.find((m) => m.id === id)

/** unlocked by the café's progress (day) */
export const unlocked = (m: MenuItem, day: number) => day >= m.unlockDay
/** what's missing from the pantry to make ONE of it (empty = can be made right now) */
export function missing(m: MenuItem, stock: Partial<Record<IngredientId, number>>): Line[] {
  return m.ingredients.filter((l) => (stock[l.id] ?? 0) < l.qty)
}
/** can it actually be prepared now: unlocked, and the pantry holds enough for at least one */
export const preparable = (m: MenuItem, day: number, stock: Partial<Record<IngredientId, number>>) => unlocked(m, day) && missing(m, stock).length === 0
