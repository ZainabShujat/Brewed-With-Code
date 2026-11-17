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
