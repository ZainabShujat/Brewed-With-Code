import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RECIPES, randomOrder, score } from '../src/data/recipes'
import { scoreCake, randomCakeOrder } from '../src/systems/cake'
import { PriorityQueue } from '../src/systems/queue'
import { fmtHour } from '../src/systems/clock'

test('every random drink order is makeable', () => {
  for (let i = 0; i < 500; i++) {
    const o = randomOrder()
    assert.ok(['small', 'medium', 'large'].includes(o.want.size))
    if (o.recipe.id === 'espresso') assert.equal(o.want.size, 'small')
    assert.ok(o.want.shots >= 1 && o.want.shots <= 4)
    assert.ok(o.label.length > 0)
  }
})
test('a perfect drink scores 100, a wrong size does not', () => {
  for (const r of RECIPES) {
    assert.equal(score(r.base, r.base).pct, 100)
    assert.ok(score({ ...r.base, size: r.base.size === 'large' ? 'small' : 'large' }, r.base).pct < 100)
  }
})
test('cake orders are consistent (fillings sit between layers) and a perfect cake scores 100', () => {
  for (let i = 0; i < 500; i++) {
    const { want } = randomCakeOrder()
    assert.notEqual(want.tin, 'none')
    assert.equal(want.fillings.length, want.layers.length - 1)
    assert.equal(scoreCake(want, want).pct, 100)
    assert.ok(scoreCake({ ...want, tin: want.tin === 'heart' ? 'round' : 'heart' }, want).pct < 100)
  }
})
test('queue: in-a-hurry customers go first, otherwise first come first served', () => {
  const q = new PriorityQueue<string>(); q.enqueue('a', 0); q.enqueue('b', 0); q.enqueue('rush', 1)
  assert.equal(q.dequeue(), 'rush'); assert.equal(q.dequeue(), 'a'); assert.equal(q.dequeue(), 'b'); assert.equal(q.dequeue(), undefined)
})
test('clock labels midnight and noon correctly, and wraps', () => {
  assert.equal(fmtHour(0), '12:00 am'); assert.equal(fmtHour(12), '12:00 pm'); assert.equal(fmtHour(23.999), '11:59 pm'); assert.equal(fmtHour(13.5), '1:30 pm')
})
test('EDGE: a rushed customer never cuts in front of the one already being served', () => {
  const q = new PriorityQueue<string>(); q.enqueue('at-counter', 0); q.enqueue('waiting', 0)
  q.enqueue('rush', 1, 1) // the front is locked
  assert.equal(q.at(0), 'at-counter'); assert.equal(q.at(1), 'rush'); assert.equal(q.at(2), 'waiting')
})
