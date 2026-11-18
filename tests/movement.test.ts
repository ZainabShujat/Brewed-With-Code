import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blocked } from '../src/systems/movement'
import { STREET as S } from '../src/world/streetLayout'

test('you can walk out through the front door, along the passage, onto the pavement', () => {
  for (let z = 6; z <= 20; z += 0.25) assert.equal(blocked(0, z), false, `stuck at z=${z}`)
})
test('EDGE: you can only leave through the door, not through the teapot wall', () => {
  for (const x of [-6, -3, 3, 6]) assert.equal(blocked(x, 15.5), true, `walked through the wall at x=${x}`)
  assert.equal(blocked(0, -16), true) // the pot from behind (no back door)
})
test('the street, crossing and side street are walkable', () => {
  assert.equal(blocked(10, 19.5), false); assert.equal(blocked(-30, 25), false); assert.equal(blocked(20, 31), false)
  assert.equal(blocked(0, 50), false); assert.equal(blocked(5, 50), false)
})
test('EDGE: nothing gets past the brick walls and gates', () => {
  assert.equal(blocked(S.X + 1, 25), true); assert.equal(blocked(-S.X - 1, 25), true)
  assert.equal(blocked(0, S.FRONT + 1), true); assert.equal(blocked(0, S.BACK - 1), true)
  assert.equal(blocked(12, 45), true) // off the side street's pavement
})

// ── Day 3: the neighbours ──
import { SHOPS, SHOP_DEPTH, CART, BUS_STOP, PARK } from '../src/world/streetLayout'
test('EDGE: you can never walk into a shop', () => {
  for (const s of SHOPS) {
    const cx = (s.x0 + s.x1) / 2, z = s.side === 'a' ? S.padA[0] - SHOP_DEPTH / 2 : S.padB[1] + SHOP_DEPTH / 2
    assert.equal(blocked(cx, z), true, `walked into ${s.name}`)
  }
})
test('the whole café-side pavement is walkable end to end (past every shopfront)', () => {
  for (let x = -S.X + 2; x <= S.X - 2; x += 0.5) {
    if (Math.abs(x) < 1.2) continue // the door passage meets the pavement here
    assert.equal(blocked(x, S.padA[0] + 1.8), false, `stuck on the pavement at x=${x}`)
  }
})
test('EDGE: the cart, the bus shelter and the park railings block you, but you can step round them on the road', () => {
  assert.equal(blocked(CART.x, CART.z), true); assert.equal(blocked(CART.x, S.road[1] - 1), false)
  assert.equal(blocked(BUS_STOP.x, BUS_STOP.z), true); assert.equal(blocked(BUS_STOP.x, S.road[1] - 1), false)
  assert.equal(blocked((PARK.x0 + PARK.x1) / 2, PARK.z0 + 5), true)
})
