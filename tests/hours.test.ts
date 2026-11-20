import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useDay, OPEN_H, CLOSE_H } from '../src/systems/day'
import { setHour, hourNow, useClock } from '../src/systems/clock'

// Café hours (playtest 20 Nov): business days run 10 am - 8 pm on the world clock; the world keeps going at night,
// but the next business day always opens at 10 am.
const D = () => useDay.getState()
test('opening after a night out starts the business day at 10 am, not 2 am', () => {
  useClock.setState({ real: false }); setHour(2); useDay.setState({ phase: 'idle' }); D().start()
  assert.equal(Math.floor(hourNow()), OPEN_H); assert.equal(D().phase, 'open')
})
test('opening mid-afternoon keeps the time (no jump back to 10)', () => {
  setHour(14.5); useDay.setState({ phase: 'idle' }); D().start(); assert.equal(hourNow(), 14.5)
})
test('the café closes itself at 8 pm; still open at 7:59', () => {
  setHour(CLOSE_H - 0.02); useDay.setState({ phase: 'open' }); D().tick(0.016, true); assert.equal(D().phase, 'open')
  setHour(CLOSE_H + 0.01); D().tick(0.016, true); assert.equal(D().phase, 'closing'); assert.equal(D().left, 0)
})
test('real-time clock players keep the timed day', () => {
  useClock.setState({ real: true }); useDay.setState({ phase: 'idle' }); D().start(); assert.ok(D().left > 400); useClock.setState({ real: false })
})
