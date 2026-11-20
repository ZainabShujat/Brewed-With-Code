import { test } from 'node:test'
import assert from 'node:assert/strict'
import { usePantry } from '../src/systems/pantry'
import { useShop } from '../src/systems/shop'
import { useKitchen } from '../src/systems/kitchen'
import { useCake } from '../src/systems/cake'
import { useDay } from '../src/systems/day'
import { INGREDIENTS, packPrice, packAmount, levelFromStars } from '../src/data/ingredients'

const Pn = () => usePantry.getState(), S = () => useShop.getState()
const fresh = () => usePantry.setState({ stock: Object.fromEntries(Object.values(INGREDIENTS).map((i) => [i.id, i.start])) as never, note: null })
const hold = (fn: (dt: number) => void, secs: number) => { for (let t = 0; t < secs; t += 0.05) fn(0.05) }

test('buying a regular pack takes coins from the bank and fills the pantry', () => {
  fresh(); useDay.setState({ bank: 100, stars: 0 })
  const before = Pn().stock.beans
  assert.equal(Pn().buy('beans', 'regular'), '')
  assert.equal(Pn().stock.beans, before + packAmount('beans', 'regular'))
  assert.equal(useDay.getState().bank, 100 - packPrice('beans', 'regular'))
})
test('bulk is locked until level 3, cheaper per unit once unlocked; no coins, no sale', () => {
  fresh(); useDay.setState({ bank: 1000, stars: 0 })
  assert.match(Pn().buy('flour', 'bulk'), /level 3/)
  useDay.setState({ stars: 12 }); assert.equal(levelFromStars(12), 3)
  assert.equal(Pn().buy('flour', 'bulk'), '')
  assert.ok(packPrice('flour', 'bulk') / packAmount('flour', 'bulk') < packPrice('flour', 'regular') / packAmount('flour', 'regular'))
  useDay.setState({ bank: 0 }); assert.match(Pn().buy('flour', 'regular'), /coins/)
})
test('a shot uses 18 g of beans; an empty pantry stops the shot and says where to buy', () => {
  fresh(); useShop.setState({ shotGlass: 0 })
  const b = Pn().stock.beans; hold(S().pullTick, 1.2)
  assert.ok(Math.abs((b - Pn().stock.beans) - S().shotGlass * 0.6) < 0.01, 'beans used match the espresso pulled')
  usePantry.setState({ stock: { ...Pn().stock, beans: 0 } }); useShop.setState({ shotGlass: 0 })
  hold(S().pullTick, 1); assert.equal(S().shotGlass, 0)
  assert.match(Pn().note?.text ?? '', /Daily Grind/)
})
test('a cake layer pours kitchen batter and takes nothing more from the pantry', () => {
  fresh(); useCake.getState().reset(); useCake.getState().setTin('round'); useKitchen.setState({ batter: { vanilla: 1, chocolate: 0, strawberry: 0 } })
  const st = { ...Pn().stock }; useCake.getState().addLayer('vanilla')
  assert.equal(useCake.getState().cake.layers.length, 1); assert.equal(useKitchen.getState().batter.vanilla, 0)
  assert.equal(Pn().stock.eggs, st.eggs); assert.equal(Pn().stock.flour, st.flour)
  useCake.getState().addFilling('cream'); useCake.getState().addLayer('vanilla')
  assert.equal(useCake.getState().cake.layers.length, 1, 'no batter, no layer'); assert.match(useCake.getState().why!.text, /kitchen/)
})
