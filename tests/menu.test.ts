import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MENU, byId, preparable, missing, unlocked } from '../src/data/menu'
import { RECIPES } from '../src/data/recipes'
import { useTodayMenu, orderable } from '../src/systems/todaymenu'
import { menuOrder } from '../src/systems/orders'
import { randomCakeOrder } from '../src/systems/cake'
import { useDay } from '../src/systems/day'
import { usePantry } from '../src/systems/pantry'
import { USE } from '../src/data/ingredients'

// S4/S5: one recipe source; Today's Menu; customers only order what's on it and can be made.
const lcg = (s = 7) => () => (s = (s * 16807) % 2147483647) / 2147483647

test('every drink recipe is on the menu, built from the same recipe object', () => {
  for (const r of RECIPES) { const m = byId(r.id); assert.ok(m, r.id); assert.equal(m!.order.kind === 'drink' && m!.order.recipe, r) }
})
test('menu quantities come from the same usage table the game uses', () => {
  const latte = byId('latte')!, beans = latte.ingredients.find((l) => l.id === 'beans')!
  assert.equal(beans.qty, Math.round(2 * 30 * USE.beansPerMl))
  const choc = byId('cake-chocolate')!.ingredients.find((l) => l.id === 'cocoa')!
  assert.equal(choc.qty, USE.spongeExtra.chocolate[1] * 3)
})
test('cakes unlock on day 7, drinks from day 1; cakes start in the kitchen', () => {
  assert.equal(unlocked(byId('cake-vanilla')!, 6), false); assert.equal(unlocked(byId('cake-vanilla')!, 7), true)
  assert.equal(unlocked(byId('espresso')!, 1), true); assert.deepEqual(byId('cake-vanilla')!.stations, ['kitchen', 'cake'])
})
test('only preparable items: an empty pantry ingredient takes an item off', () => {
  const stock = { ...usePantry.getState().stock }
  assert.ok(preparable(byId('mocha')!, 1, stock))
  stock.chocSauce = 0
  assert.equal(preparable(byId('mocha')!, 1, stock), false); assert.deepEqual(missing(byId('mocha')!, stock).map((l) => l.id), ['chocSauce'])
  assert.ok(preparable(byId('latte')!, 1, stock), 'latte needs no chocolate')
})
test('customers only order drinks on today\'s menu', () => {
  useDay.setState({ day: 3 }); useTodayMenu.setState({ ids: ['latte', 'flatwhite'] })
  const r = lcg(); for (let i = 0; i < 200; i++) assert.ok(['latte', 'flatwhite'].includes(menuOrder(r).recipe.id))
})
test('no cake orders unless a cake is on the menu; with one, cakes come up and use its flavour', () => {
  useDay.setState({ day: 9 }); useTodayMenu.setState({ ids: ['espresso'] })
  const r = lcg(3); for (let i = 0; i < 200; i++) assert.equal(menuOrder(r).cake, undefined)
  useTodayMenu.setState({ ids: ['espresso', 'cake-strawberry'] })
  let cakes = 0; for (let i = 0; i < 400; i++) if (menuOrder(r).cake) cakes++
  assert.ok(cakes > 40 && cakes < 200, `cakes ${cakes}/400`)
  for (let i = 0; i < 50; i++) assert.equal(randomCakeOrder().want.layers[0], 'strawberry')
})
test('a locked cake on the menu is never ordered before day 7', () => {
  useDay.setState({ day: 2 }); useTodayMenu.setState({ ids: ['americano', 'cake-chocolate'] })
  assert.deepEqual(orderable(2, usePantry.getState().stock).map((m) => m.id), ['americano'])
  const r = lcg(11); for (let i = 0; i < 200; i++) assert.equal(menuOrder(r).recipe.id, 'americano')
})
test('menu presets save and apply', () => {
  useTodayMenu.setState({ ids: ['espresso', 'mocha'] }); useTodayMenu.getState().savePreset('Mine')
  useTodayMenu.getState().setIds([]); const p = useTodayMenu.getState().presets.find((x) => x.name === 'Mine')!
  useTodayMenu.getState().setIds(p.ids); assert.deepEqual(useTodayMenu.getState().ids, ['espresso', 'mocha'])
})
test('confirming the menu runs the opening and marks the day', () => {
  let opened = 0; useTodayMenu.getState().ask(() => { opened++ }); assert.equal(useTodayMenu.getState().open, true)
  useTodayMenu.getState().confirm(4); assert.equal(opened, 1); assert.equal(useTodayMenu.getState().confirmedDay, 4); assert.equal(useTodayMenu.getState().open, false)
})
test('every menu item lists ingredients and steps at real stations', () => {
  for (const m of MENU) { assert.ok(m.ingredients.length > 0, m.id); assert.ok(m.steps.length >= 2, m.id); for (const s of m.steps) assert.ok(m.stations.includes(s.at), `${m.id}: ${s.at}`) }
})
