import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useShop } from '../src/systems/shop'
import { cafe } from '../src/world/Customers'
import { shotTarget, judgeShot, judgeSteam, judgeFill } from '../src/systems/targets'
import { EMPTY } from '../src/data/recipes'

const S = () => useShop.getState()
// one customer at the front wanting a medium oat latte (2 shots, silky microfoam)
function setup() {
  cafe.reset(); const c = cafe.pool[0]; cafe.line.enqueue(c)
  useShop.setState({ orders: { [c.id]: { want: { ...EMPTY, size: 'medium', shots: 2, milk: 'micro', milkType: 'oat' }, label: 'oat latte' } } as never,
    pours: [], shotGlass: 0, cheer: null, pitcher: { milk: 0, foam: 0, type: 'oat', at: 'home', stretch: 0 } })
  S().trash(); S().takeCup('medium')
}
const hold = (fn: (dt: number) => void, secs: number) => { for (let t = 0; t < secs; t += 0.05) fn(0.05) }

test('the shot line sits at the espresso the order still needs', () => {
  setup(); assert.equal(shotTarget(), 60)
  hold(S().pullTick, 2.4); S().pourShotGlass(); assert.equal(shotTarget(), 0, 'both shots in: no more line')
})
test('letting go on the line cheers; overshooting says so; nothing when there is no target', () => {
  setup(); hold(S().pullTick, 2.4); judgeShot(); assert.equal(S().cheer?.good, true)
  setup(); hold(S().pullTick, 3.4); judgeShot(); assert.equal(S().cheer?.good, false)
  cafe.reset(); useShop.setState({ cheer: null }); hold(S().pullTick, 1); judgeShot(); assert.equal(S().cheer, null)
})
test('steam: stopping in the wanted zone cheers, too long does not, too early waits', () => {
  setup(); hold((dt) => S().fillPitcher('oat', dt), 2); S().placePitcher('wand')
  hold(S().steamTick, 0.1); judgeSteam(); assert.equal(S().cheer, null, 'too early: no verdict yet')
  hold(S().steamTick, 0.5); judgeSteam(); assert.equal(S().cheer?.good, true)
  useShop.setState({ cheer: null }); hold(S().steamTick, 2); judgeSteam(); assert.equal(S().cheer?.good, false)
})
test('fill: a full glass cheers, and pouring on never overflows it', () => {
  setup(); hold(S().pullTick, 2.4); S().pourShotGlass(); hold((dt) => S().fillPitcher('oat', dt), 3); S().placePitcher('wand'); hold(S().steamTick, 0.6)
  hold(S().pourMilkTick, 2.6); judgeFill(); assert.equal(S().cheer?.good, true, `fill ${JSON.stringify(S().ml)}`)
  useShop.setState({ cheer: null }); hold(S().pourMilkTick, 3); judgeFill(); assert.equal(S().cheer?.good, true); assert.equal(S().spilled, false)
})

test('station stars: each part of the drink is judged on its own', async () => {
  const { stationStars, EMPTY: E } = await import('../src/data/recipes')
  const want = { ...E, size: 'medium' as const, shots: 2, milk: 'micro' as const, milkType: 'oat' as const, topping: 'cocoa' as const }
  const even: [number, number][] = []; for (let x = -0.14; x <= 0.14; x += 0.035) for (let z = -0.14; z <= 0.14; z += 0.035) if (Math.hypot(x, z) < 0.15) even.push([x, z])
  const great = stationStars(want, want, { espresso: 60, choc: 0, water: 0, milk: 200, foam: 40 }, even, 0.9)
  assert.deepEqual(great, { brew: 3, milk: 3, finish: 3, service: 3 })
  const meh = stationStars({ ...want, milk: 'foamy', topping: 'cinnamon' }, want, { espresso: 85, choc: 0, water: 0, milk: 200, foam: 40 }, [[0, 0]], 0.2)
  assert.deepEqual(meh, { brew: 1, milk: 2, finish: 1, service: 1 })
  const espresso = stationStars({ ...E, shots: 1 }, { ...E, shots: 1 }, { espresso: 30, choc: 0, water: 0, milk: 0, foam: 0 }, [], 0.5)
  assert.equal(espresso.milk, null); assert.equal(espresso.finish, null); assert.equal(espresso.service, 2)
})
