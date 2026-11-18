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
test('fill: 85–100% cheers, a spill does not', () => {
  setup(); hold(S().pullTick, 2.4); S().pourShotGlass(); hold((dt) => S().fillPitcher('oat', dt), 3); S().placePitcher('wand'); hold(S().steamTick, 0.6)
  hold(S().pourMilkTick, 2.6); judgeFill(); assert.equal(S().cheer?.good, true, `fill ${JSON.stringify(S().ml)}`)
  hold(S().pourMilkTick, 3); judgeFill(); assert.equal(S().cheer?.good, false)
})
