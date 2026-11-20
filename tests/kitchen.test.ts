import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useKitchen, LAYERS_PER_BOWL, STIR_SECONDS } from '../src/systems/kitchen'
import { usePantry } from '../src/systems/pantry'
import { useCake } from '../src/systems/cake'
import { USE } from '../src/data/ingredients'

// The prep kitchen: batter is made by hand here and poured at the cake bench.
const K = () => useKitchen.getState()
const fresh = () => {
  usePantry.setState((s) => ({ stock: Object.fromEntries(Object.keys(s.stock).map((k) => [k, 999])) as typeof s.stock }))
  K().tip(); useKitchen.setState({ batter: { vanilla: 0, chocolate: 0, strawberry: 0 }, msg: null })
}
// each scoop has a short pour animation (adds are ignored mid-pour); tests skip the wait
const add = (p: 'flour' | 'sugar' | 'eggs' | 'butter' | 'extra') => { useKitchen.setState({ pour: null }); K().add(p) }
const fill = (parts: ('flour' | 'sugar' | 'eggs' | 'butter' | 'extra')[]) => { for (const p of parts) for (let i = 0; i < 3; i++) add(p) }
const stir = (s: number) => { K().setStirring(true); for (let t = 0; t < s; t += 0.1) K().stirBy(0.1); K().setStirring(false) }

test('a vanilla bowl: 3 scoops each of flour, sugar, eggs, butter, stirred → 3 layers of batter', () => {
  fresh(); const st = { ...usePantry.getState().stock }
  K().choose('vanilla'); fill(['flour', 'sugar', 'eggs', 'butter']); assert.ok(K().ready())
  assert.equal(usePantry.getState().stock.flour, st.flour - USE.layer.flour * 3); assert.equal(usePantry.getState().stock.eggs, st.eggs - 3)
  stir(STIR_SECONDS + 0.2)
  assert.equal(K().batter.vanilla, LAYERS_PER_BOWL); assert.equal(K().bowl.flavour, null, 'bowl emptied onto the shelf')
})
test('chocolate needs cocoa; vanilla refuses the extra', () => {
  fresh(); K().choose('chocolate'); fill(['flour', 'sugar', 'eggs', 'butter']); assert.equal(K().ready(), false)
  fill(['extra']); assert.ok(K().ready())
  fresh(); K().choose('vanilla'); add('extra'); assert.match(K().msg!.text, /doesn't need/)
})
test('no stirring until everything is in; no more than 3 scoops of anything', () => {
  fresh(); K().choose('vanilla'); add('flour'); K().setStirring(true); assert.equal(K().stirring, false); assert.match(K().msg!.text, /add everything/)
  add('flour'); add('flour'); add('flour'); assert.equal(K().bowl.added.flour, 3); assert.match(K().msg!.text, /enough flour/)
})
test('a half-made bowl survives leaving (state is kept); switching flavour mid-bowl is refused', () => {
  fresh(); K().choose('strawberry'); add('flour'); add('sugar'); K().choose('vanilla')
  assert.equal(K().bowl.flavour, 'strawberry'); assert.equal(K().bowl.added.flour, 1); assert.match(K().msg!.text, /already strawberry/)
})
test('half-stirred bowls keep their progress', () => {
  fresh(); K().choose('vanilla'); fill(['flour', 'sugar', 'eggs', 'butter']); stir(1)
  assert.ok(K().bowl.stir > 0.3 && K().bowl.stir < 1); stir(STIR_SECONDS); assert.equal(K().batter.vanilla, 3)
})
test('out of eggs: the scoop is refused and nothing else is used', () => {
  fresh(); usePantry.setState({ stock: { ...usePantry.getState().stock, eggs: 0 } }); K().choose('vanilla'); add('eggs')
  assert.equal(K().bowl.added.eggs, 0); assert.match(K().msg!.text, /out of eggs/)
})
test('the cake bench pours the kitchen’s batter: one bowl = a 3-tier cake', () => {
  fresh(); K().choose('vanilla'); fill(['flour', 'sugar', 'eggs', 'butter']); stir(STIR_SECONDS + 0.2)
  const C = () => useCake.getState(); C().reset(); C().setTin('round')
  for (let i = 0; i < 3; i++) { C().addLayer('vanilla'); if (i < 2) C().addFilling('cream') }
  assert.equal(C().cake.layers.length, 3); assert.equal(K().batter.vanilla, 0)
  C().addFilling('cream'); C().addLayer('vanilla'); assert.equal(C().cake.layers.length, 3); assert.match(C().why!.text, /kitchen/)
})
test('a scoop pours for a moment: a second tap mid-pour is ignored', () => {
  fresh(); K().choose('vanilla'); useKitchen.setState({ pour: null }); K().add('flour'); K().add('flour')
  assert.equal(K().bowl.added.flour, 1); assert.equal(K().pour?.part, 'flour')
})
