import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useShop, SHOT_FILL } from '../src/systems/shop'

const S = () => useShop.getState()
const fresh = () => { S().trash(); useShop.setState({ pours: [] }) }


test('nothing happens without a glass (no crash, no state change)', () => {
  fresh(); S().shot(); S().choc(); S().water(); S().milk('steamed'); S().top('cocoa'); S().serve()
  assert.equal(S().cup, false); assert.equal(S().drink.shots, 0); assert.equal(S().pours.length, 0)
})
test('extras only go in once', () => {
  fresh(); S().takeCup('large'); S().choc(); S().choc(); S().top('cocoa'); S().top('whipped'); S().milk('steamed'); S().milk('foamy')
  assert.equal(S().drink.chocolate, true); assert.equal(S().drink.topping, 'cocoa'); assert.equal(S().drink.milk, 'steamed')
})
test('a second glass does not replace the one on the coaster', () => {
  fresh(); S().takeCup('small'); S().choc(); S().takeCup('large')
  assert.equal(S().drink.size, 'small'); assert.equal(S().drink.chocolate, true)
})
test('shots land in the glass after the pull', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const settle = () => t.mock.timers.tick((SHOT_FILL + 1) * 1000)
  fresh(); S().takeCup('medium'); S().shot(); S().shot(); settle()
  assert.equal(S().drink.shots, 2)
})
test('EDGE: mashing the machine never gives more than 4 shots', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const settle = () => t.mock.timers.tick((SHOT_FILL + 1) * 1000)
  fresh(); S().takeCup('medium'); for (let i = 0; i < 10; i++) S().shot(); settle()
  assert.ok(S().drink.shots <= 4, `got ${S().drink.shots} shots`)
})
test('EDGE: a shot pulled for a binned glass never lands in the next glass', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const settle = () => t.mock.timers.tick((SHOT_FILL + 1) * 1000)
  fresh(); S().takeCup('medium'); S().shot(); S().trash(); S().takeCup('small'); settle()
  assert.equal(S().drink.shots, 0, 'the new glass got a ghost shot')
})
