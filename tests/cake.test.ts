import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useCake } from '../src/systems/cake'
import { usePantry } from '../src/systems/pantry'
import { useKitchen } from '../src/systems/kitchen'

// Regression (playtest 19 Nov): topping machines stopped working after the third tier. Every tier count, with a
// sponge or a filling on top, must frost, pipe and top.
const C = () => useCake.getState()
const stock = () => { usePantry.setState((s) => ({ stock: Object.fromEntries(Object.keys(s.stock).map((k) => [k, 999])) as typeof s.stock })); useKitchen.setState({ batter: { vanilla: 99, chocolate: 99, strawberry: 99 } }) }
for (const tiers of [1, 2, 3, 4]) for (const fillingOnTop of [false, true]) {
  test(`${tiers} tier${tiers > 1 ? 's' : ''}${fillingOnTop ? ' with a filling on top' : ''}: frost, rosettes and toppings all work`, () => {
    stock(); C().reset(); C().setTin('round')
    for (let i = 0; i < tiers; i++) { C().addLayer('vanilla'); if (i < tiers - 1 || fillingOnTop) C().addFilling('jam') }
    assert.equal(C().cake.layers.length, tiers)
    C().frost('pink'); assert.equal(C().cake.frosting, 'pink', 'frosting')
    C().pipe('white'); assert.equal(C().cake.piping, 'white', 'rosettes')
    C().topWith('cherries'); assert.equal(C().cake.top, 'cherries', 'toppings')
  })
}
test('EDGE: a refused dispenser always says why (never silent)', () => {
  stock(); C().reset(); useCake.setState({ why: null }); C().topWith('cherries')
  assert.ok(C().why && C().why!.text.length > 0); assert.equal(C().cake.top, 'none')
})
test('EDGE: no fifth tier, and it says so', () => {
  stock(); C().reset(); C().setTin('round'); for (let i = 0; i < 4; i++) { C().addLayer('vanilla'); C().addFilling('jam') }
  C().addLayer('vanilla'); assert.equal(C().cake.layers.length, 4); assert.match(C().why!.text, /4 tiers/)
})

import { nextCakeStep } from '../src/systems/cake'
test('the guide walks a new player through the machine in order', () => {
  stock(); C().reset(); const want = { tin: 'heart', layers: ['chocolate', 'chocolate'], fillings: ['jam'], frosting: 'white', piping: 'pink', top: 'cherries' } as const
  const W = { ...want, layers: [...want.layers], fillings: [...want.fillings] }
  const at = () => nextCakeStep(C().cake, W)
  assert.deepEqual(at(), { at: 'tin', want: 'heart' }); C().setTin('heart')
  assert.deepEqual(at(), { at: 'layer', want: 'chocolate' }); C().addLayer('chocolate')
  assert.deepEqual(at(), { at: 'fill', want: 'jam' }); C().addFilling('jam')
  assert.deepEqual(at(), { at: 'layer', want: 'chocolate' }); C().addLayer('chocolate')
  assert.deepEqual(at(), { at: 'frost', want: 'white' }); C().frost('white')
  assert.deepEqual(at(), { at: 'pipe', want: 'pink' }); C().pipe('pink')
  assert.deepEqual(at(), { at: 'top', want: 'cherries' }); C().topWith('cherries')
  assert.equal(at().at, 'star')
})
