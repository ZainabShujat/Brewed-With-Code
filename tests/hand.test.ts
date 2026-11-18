import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useShop } from '../src/systems/shop'
import { CAP, filled } from '../src/data/recipes'

const S = () => useShop.getState()
const reset = () => { S().trash(); useShop.setState({ pours: [], shotGlass: 0, hint: '', pitcher: { milk: 0, foam: 0, type: 'whole', at: 'home', stretch: 0 } }) }
const hold = (fn: (dt: number) => void, secs: number) => { for (let t = 0; t < secs; t += 0.05) fn(0.05) }

test('a latte by hand: two shots pulled and poured, milk filled, steamed and poured', () => {
  reset(); S().takeCup('medium')
  hold(S().pullTick, 2.4)                                   // 25 ml/s → 60 ml in the shot glass
  assert.ok(Math.abs(S().shotGlass - 60) < 2, `shot glass ${S().shotGlass}`)
  S().pourShotGlass()
  assert.equal(S().drink.shots, 2); assert.equal(S().shotGlass, 0)
  hold((dt) => S().fillPitcher('oat', dt), 3)              // 90 ml/s
  S().placePitcher('wand'); hold(S().steamTick, 1.6)        // a little while → steamed
  assert.ok(S().pitcher.foam > 0, 'steaming makes foam')
  hold(S().pourMilkTick, 3)
  const d = S().drink
  assert.equal(d.milk, 'steamed'); assert.equal(d.milkType, 'oat')
  assert.ok(filled(S().ml) / CAP.medium > 0.75, 'glass well filled')
})
test('steam time decides the texture: short = microfoam, long = foamy', () => {
  for (const [secs, want] of [[0.6, 'micro'], [1.6, 'steamed'], [3.0, 'foamy']] as const) {
    reset(); S().takeCup('large'); S().placePitcher('wand')
    hold((dt) => S().fillPitcher('whole', dt), 2); hold(S().steamTick, secs); hold(S().pourMilkTick, 1)
    assert.equal(S().drink.milk, want, `${secs}s of steam`)
  }
})
test('EDGE: nothing happens (and you get a hint) when the step is impossible', () => {
  reset(); hold(S().pullTick, 1.3); S().pourShotGlass()              // no glass yet
  assert.match(S().hint, /glass/); assert.equal(S().drink.shots, 0)
  reset(); S().placePitcher('wand'); hold(S().steamTick, 1)          // empty pitcher
  assert.match(S().hint, /empty/)
  reset(); hold((dt) => S().fillPitcher('whole', dt), 1); hold(S().steamTick, 1) // not on the wand
  assert.match(S().hint, /wand/)
  reset(); S().takeCup('small'); hold(S().pourMilkTick, 1)            // nothing in the pitcher
  assert.match(S().hint, /empty/); assert.equal(filled(S().ml), 0)
})
test('EDGE: pouring for too long just stops at the brim (every glass ends up full, nothing spills)', () => {
  reset(); S().takeCup('small')
  hold((dt) => S().fillPitcher('whole', dt), 4); S().placePitcher('wand'); hold(S().steamTick, 1.5)
  hold(S().pourMilkTick, 6)
  assert.ok(Math.abs(filled(S().ml) - 0.95 * CAP.small) < 1, `full to the brim: ${filled(S().ml)}`); assert.equal(S().spilled, false)
})
test('hot water tops the glass up to the brim', () => {
  reset(); S().takeCup('medium'); hold(S().pullTick, 2.4); S().pourShotGlass(); S().water()
  assert.ok(Math.abs(filled(S().ml) - 0.95 * CAP.medium) < 1)
})
test('EDGE: the pitcher never overflows, and a shot glass caps at 95 ml', () => {
  reset(); hold((dt) => S().fillPitcher('whole', dt), 10); assert.ok(S().pitcher.milk + S().pitcher.foam <= 360.01)
  reset(); hold(S().pullTick, 10); assert.ok(S().shotGlass <= 95)
})
test('EDGE: an empty glass on the pass is never served', () => {
  reset(); S().takeCup('medium'); const before = S().served
  S().serve()
  assert.equal(S().served, before); assert.equal(S().cup, true)
})
