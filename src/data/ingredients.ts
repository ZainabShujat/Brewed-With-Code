// Real ingredients, bought from the real shops on the street (in real units), used up as you make orders.
// Light by design (see docs/BUSINESS_PLAN_REVIEW.md): no expiry, no deliveries, no warehouse. Just a pantry,
// four friendly shops, and bigger, cheaper packs as you level up.

export type IngredientId =
  | 'beans' | 'chocSauce'
  | 'milkWhole' | 'milkOat' | 'milkAlmond' | 'cream' | 'butter'
  | 'flour' | 'sugar' | 'eggs' | 'jam'
  | 'sprinkles' | 'cocoa' | 'cinnamon' | 'strawberries' | 'cherries' | 'candles'

export type StoreId = 'coffee' | 'dairy' | 'baking' | 'sweets'
export type Unit = 'g' | 'ml' | 'pcs'
export type Ingredient = { id: IngredientId; label: string; icon: string; store: StoreId; unit: Unit; pack: number; price: number; start: number }

// pack = the regular pack size; price = coins for that pack; start = what a new café's pantry holds
export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  beans: { id: 'beans', label: 'coffee beans', icon: '☕', store: 'coffee', unit: 'g', pack: 250, price: 6, start: 1000 },
  chocSauce: { id: 'chocSauce', label: 'chocolate sauce', icon: '🍫', store: 'coffee', unit: 'ml', pack: 500, price: 4, start: 500 },
  milkWhole: { id: 'milkWhole', label: 'whole milk', icon: '🥛', store: 'dairy', unit: 'ml', pack: 1000, price: 2, start: 4000 },
  milkOat: { id: 'milkOat', label: 'oat milk', icon: '🌾', store: 'dairy', unit: 'ml', pack: 1000, price: 3, start: 2000 },
  milkAlmond: { id: 'milkAlmond', label: 'almond milk', icon: '🌰', store: 'dairy', unit: 'ml', pack: 1000, price: 3, start: 2000 },
  cream: { id: 'cream', label: 'cream', icon: '🍦', store: 'dairy', unit: 'ml', pack: 500, price: 3, start: 1000 },
  butter: { id: 'butter', label: 'butter', icon: '🧈', store: 'dairy', unit: 'g', pack: 250, price: 3, start: 500 },
  flour: { id: 'flour', label: 'flour', icon: '🌾', store: 'baking', unit: 'g', pack: 1000, price: 2, start: 2000 },
  sugar: { id: 'sugar', label: 'sugar', icon: '🍚', store: 'baking', unit: 'g', pack: 1000, price: 2, start: 2000 },
  eggs: { id: 'eggs', label: 'eggs', icon: '🥚', store: 'baking', unit: 'pcs', pack: 6, price: 2, start: 18 },
  jam: { id: 'jam', label: 'strawberry jam', icon: '🍓', store: 'baking', unit: 'ml', pack: 340, price: 3, start: 340 },
  sprinkles: { id: 'sprinkles', label: 'sprinkles', icon: '✨', store: 'sweets', unit: 'g', pack: 100, price: 3, start: 200 },
  cocoa: { id: 'cocoa', label: 'cocoa powder', icon: '🟤', store: 'sweets', unit: 'g', pack: 100, price: 3, start: 200 },
  cinnamon: { id: 'cinnamon', label: 'cinnamon', icon: '🪵', store: 'sweets', unit: 'g', pack: 50, price: 3, start: 100 },
  strawberries: { id: 'strawberries', label: 'strawberries', icon: '🍓', store: 'sweets', unit: 'pcs', pack: 12, price: 4, start: 24 },
  cherries: { id: 'cherries', label: 'cherries', icon: '🍒', store: 'sweets', unit: 'pcs', pack: 12, price: 4, start: 24 },
  candles: { id: 'candles', label: 'birthday candles', icon: '🕯️', store: 'sweets', unit: 'pcs', pack: 24, price: 2, start: 24 },
}

// pack sizes: regular from day one; bulk and wholesale unlock as the café levels up (cheaper per unit)
export type PackKind = 'regular' | 'bulk' | 'wholesale'
export const PACKS: Record<PackKind, { label: string; times: number; discount: number; level: number }> = {
  regular: { label: 'regular', times: 1, discount: 0, level: 1 },
  bulk: { label: 'bulk', times: 5, discount: 0.25, level: 3 },
  wholesale: { label: 'wholesale', times: 20, discount: 0.4, level: 6 },
}
export const packAmount = (id: IngredientId, k: PackKind) => INGREDIENTS[id].pack * PACKS[k].times
export const packPrice = (id: IngredientId, k: PackKind) => Math.round(INGREDIENTS[id].price * PACKS[k].times * (1 - PACKS[k].discount))

// the café's level comes from the stars you've earned (good days level you up)
export const levelFromStars = (stars: number) => 1 + Math.floor(Math.max(0, stars) / 6)

// how much each step uses
export const USE = {
  beansPerMl: 0.6,         // 18 g per 30 ml shot
  chocPerDrink: 20,        // ml
  topping: { cocoa: 3, cinnamon: 2, sprinkles: 5 } as Record<string, number>, // g per drink
  whipCream: 30,           // ml
  layer: { flour: 60, sugar: 40, eggs: 1, butter: 25 },
  spongeExtra: { strawberry: ['strawberries', 2], chocolate: ['cocoa', 6] } as Record<string, [IngredientId, number]>,
  filling: { cream: ['cream', 30], jam: ['jam', 30] } as Record<string, [IngredientId, number]>,
  frosting: { sugar: 40, butter: 25 },
  piping: { sugar: 20, cream: 20 },
  cakeTop: { strawberries: ['strawberries', 3], cherries: ['cherries', 3], sprinkles: ['sprinkles', 5], candles: ['candles', 4] } as Record<string, [IngredientId, number]>,
}
export const milkId = (t: 'whole' | 'oat' | 'almond'): IngredientId => (t === 'oat' ? 'milkOat' : t === 'almond' ? 'milkAlmond' : 'milkWhole')
export const fmt = (id: IngredientId, n: number) => { const u = INGREDIENTS[id].unit; n = Math.max(0, n)
  return u === 'pcs' ? `${Math.floor(n)}` : n >= 1000 ? `${+(n / 1000).toFixed(2)} ${u === 'g' ? 'kg' : 'L'}` : `${Math.round(n)} ${u}` }
export const STORE_NAME: Record<StoreId, string> = { coffee: 'The Daily Grind', dairy: 'Moo & Oat', baking: 'Flour & Co.', sweets: 'Sugar Plum' }
