import { test } from 'node:test'
import assert from 'node:assert/strict'

// a fake browser storage, set up before the store module loads
const mem: Record<string, string> = {}
;(globalThis as any).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v } }

test('EDGE: a corrupt or tampered save never breaks the game', async () => {
  mem['brewed-with-code-save-v1'] = '{"day":"three","bank":null,"best":-5,"unlocks":"nope","stars":1e999}'
  const { useDay } = await import('../src/systems/day')
  const s = useDay.getState()
  assert.ok(Number.isInteger(s.day) && s.day >= 1, `day = ${s.day}`)
  assert.ok(Number.isFinite(s.bank) && s.bank >= 0, `bank = ${s.bank}`)
  assert.ok(Number.isFinite(s.best) && s.best >= 0, `best = ${s.best}`)
  assert.ok(Array.isArray(s.unlocks))
  assert.ok(Number.isFinite(s.stars), `stars = ${s.stars}`)
})
