import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrate, listSlots, newGame, switchTo, deleteSlot, commitActive, restoreLegacy, restoreSlotBackup, modeOf, repair, summary, latest, blocked, lock, LEGACY_BACKUP, PROGRESS_KEYS, type Store } from '../src/systems/saves'

// S0 acceptance: three slots, safe migration of the old single save, versioning, backup + recovery, isolation.
const reload = () => { lock.on = false } // the game reloads after every switch, which lifts the write lock
function mem(init: Record<string, string> = {}, opts: { failOn?: string } = {}) {
  const m = new Map(Object.entries(init))
  const st: Store & { m: Map<string, string> } = {
    m,
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { if (opts.failOn && k === opts.failOn) throw new Error('QuotaExceededError'); m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
  }
  return st
}
const OLD = {
  'brewed-with-code-save-v1': JSON.stringify({ day: 7, bank: 412, best: 90, unlocks: ['cakes'], stars: 21 }),
  'brewed-with-code-pantry-v1': JSON.stringify({ beans: 30, whole: 12 }),
  'brewed-with-code-avatar-v1': JSON.stringify({ kind: 'notebook', name: 'Zee', made: true }),
  'bwc.tutorial.done': '1',
  'brewed-with-code-music-v1': JSON.stringify({ volume: 0.2 }), // a setting, not progress
}

test('fresh player: nothing to migrate, no slots invented', () => {
  const st = mem(); assert.deepEqual(migrate(st), { status: 'fresh' }); assert.equal(st.getItem('bwc.slots'), null)
})

test('old single save becomes slot 1, byte for byte, with a backup taken first', () => {
  const st = mem(OLD), r = migrate(st, 1000)
  assert.equal(r.status, 'migrated')
  const ix = listSlots(st); assert.equal(ix.active, 1); assert.equal(ix.version, 1)
  const slot = JSON.parse(st.getItem('bwc.slot.1')!)
  for (const k of PROGRESS_KEYS) if (k in OLD) assert.equal(slot[k], (OLD as Record<string, string>)[k], k)
  assert.equal(slot['brewed-with-code-music-v1'], undefined, 'settings are not per slot')
  const bak = JSON.parse(st.getItem(LEGACY_BACKUP)!); assert.equal(bak.data['brewed-with-code-save-v1'], OLD['brewed-with-code-save-v1'])
  for (const [k, v] of Object.entries(OLD)) assert.equal(st.getItem(k), v, `original ${k} untouched`)
})

test('legacy save gets NO invented mode', () => {
  const st = mem(OLD); migrate(st); const m = listSlots(st).slots[1]!
  assert.equal(m.mode, null); assert.equal(m.legacy, true); assert.equal(modeOf(1, st), null)
})

test('migration runs once: second boot is a no-op, backup never overwritten', () => {
  const st = mem(OLD); migrate(st, 1); const bak = st.getItem(LEGACY_BACKUP)
  st.setItem('brewed-with-code-save-v1', '{"day":99}')
  assert.deepEqual(migrate(st, 2), { status: 'already' }); assert.equal(st.getItem(LEGACY_BACKUP), bak)
})

test('migration failure (storage full) leaves the original save recoverable and no half-made slots', () => {
  const st = mem(OLD, { failOn: 'bwc.slots' }), r = migrate(st)
  assert.equal(r.status, 'failed')
  assert.equal(st.getItem('bwc.slots'), null); assert.equal(st.getItem('bwc.slot.1'), null)
  for (const [k, v] of Object.entries(OLD)) assert.equal(st.getItem(k), v)
  assert.ok(st.getItem(LEGACY_BACKUP), 'backup kept')
})

test('failure while writing the backup changes nothing', () => {
  const st = mem(OLD, { failOn: LEGACY_BACKUP }); assert.equal(migrate(st).status, 'failed')
  assert.equal(st.m.size, Object.keys(OLD).length)
})

test('a damaged index is reported, not overwritten', () => {
  const st = mem({ ...OLD, 'bwc.slots': '{"nope":1}' }); assert.equal(migrate(st).status, 'failed'); assert.equal(st.getItem('bwc.slots'), '{"nope":1}')
})

test('three slots stay isolated: Story and Zen never mix', () => {
  const st = mem(OLD); migrate(st)
  newGame(2, 'story', st); reload(); assert.equal(st.getItem('brewed-with-code-save-v1'), null, 'new game starts empty')
  st.setItem('brewed-with-code-save-v1', '{"day":2,"bank":5}')
  newGame(3, 'zen', st); reload(); st.setItem('brewed-with-code-save-v1', '{"day":3,"bank":800}')
  switchTo(2, st); reload(); assert.equal(st.getItem('brewed-with-code-save-v1'), '{"day":2,"bank":5}')
  switchTo(1, st); reload(); assert.equal(st.getItem('brewed-with-code-save-v1'), OLD['brewed-with-code-save-v1'])
  switchTo(3, st); reload(); assert.equal(st.getItem('brewed-with-code-save-v1'), '{"day":3,"bank":800}')
  assert.equal(modeOf(2, st), 'story'); assert.equal(modeOf(3, st), 'zen')
  assert.equal(st.getItem('brewed-with-code-music-v1'), OLD['brewed-with-code-music-v1'], 'settings shared')
})

test('a used slot cannot be restarted in another mode', () => {
  const st = mem(); newGame(1, 'story', st); reload(); assert.throws(() => newGame(1, 'zen', st)); assert.equal(modeOf(1, st), 'story')
})

test('deleting one slot leaves the others and the legacy backup intact', () => {
  const st = mem(OLD); migrate(st); newGame(2, 'zen', st); reload(); st.setItem('brewed-with-code-save-v1', '{"day":4}'); commitActive(st)
  switchTo(1, st); reload(); deleteSlot(2, st)
  assert.equal(listSlots(st).slots[2], undefined); assert.ok(listSlots(st).slots[1]); assert.ok(st.getItem(LEGACY_BACKUP))
  assert.equal(st.getItem('brewed-with-code-save-v1'), OLD['brewed-with-code-save-v1'])
})

test('each commit keeps the previous copy; a slot can be rolled back', () => {
  const st = mem(OLD); migrate(st)
  st.setItem('brewed-with-code-save-v1', '{"day":8}'); commitActive(st)
  st.setItem('brewed-with-code-save-v1', '{"day":9,"broken":true}'); commitActive(st)
  assert.ok(restoreSlotBackup(1, st)); assert.equal(st.getItem('brewed-with-code-save-v1'), '{"day":8}')
})

test('the original single save can be restored exactly', () => {
  const st = mem(OLD); migrate(st); st.setItem('brewed-with-code-save-v1', '{"day":50}'); commitActive(st)
  assert.ok(restoreLegacy(st, true))
  for (const k of PROGRESS_KEYS) assert.equal(st.getItem(k), (OLD as Record<string, string>)[k] ?? null)
  assert.equal(st.getItem('bwc.slots'), null)
  assert.equal(migrate(st).status, 'migrated', 'and it can be migrated again')
})

// ── S1 pre-checks: delayed writes and rapid switching ─────────────────────────────
test('after a switch, the old game’s late saves are blocked until reload', () => {
  const st = mem(OLD); migrate(st); newGame(2, 'zen', st)
  assert.equal(blocked('brewed-with-code-pantry-v1'), true, 'progress keys locked mid-switch')
  assert.equal(blocked('brewed-with-code-music-v1'), false, 'settings still save')
  assert.equal(commitActive(st), false, 'no commit while locked'); reload()
  assert.equal(blocked('brewed-with-code-pantry-v1'), false)
})
test('a commit never writes one slot’s live keys into another slot', () => {
  const st = mem(OLD); migrate(st); newGame(2, 'story', st); reload()
  st.setItem('bwc.working', '1') // pretend the live keys still belonged to slot 1
  st.setItem('brewed-with-code-save-v1', '{"day":66}')
  assert.equal(commitActive(st), false); assert.equal(JSON.parse(st.getItem('bwc.slot.2')!)['brewed-with-code-save-v1'], undefined)
})
test('rapid switching 1→2→3→1→3→2 keeps every slot’s own progress', () => {
  const st = mem(OLD); migrate(st)
  newGame(2, 'story', st); reload(); st.setItem('brewed-with-code-save-v1', '{"day":2}')
  newGame(3, 'zen', st); reload(); st.setItem('brewed-with-code-save-v1', '{"day":3}')
  for (const n of [1, 3, 1, 2, 3, 2, 1, 3] as const) { switchTo(n, st); reload() }
  const day = (n: 1 | 2 | 3) => summary(n, st)!.day
  assert.equal(day(1), 7); assert.equal(day(2), 2); assert.equal(day(3), 3)
})
test('a switch cut off half-way is repaired on the next boot from the slot itself', () => {
  const st = mem(OLD); migrate(st); newGame(2, 'zen', st); reload(); st.setItem('brewed-with-code-save-v1', '{"day":5}'); commitActive(st)
  st.setItem('bwc.working', ''); st.setItem('brewed-with-code-save-v1', 'garbage') // crashed mid-load
  assert.equal(repair(st), 'repaired'); assert.equal(st.getItem('brewed-with-code-save-v1'), '{"day":5}')
})
test('summaries: legacy stays unassigned; Continue = most recently played valid slot', () => {
  const st = mem(OLD); migrate(st, 100)
  const s1 = summary(1, st)!; assert.equal(s1.meta.mode, null); assert.equal(s1.name, 'Zee'); assert.equal(s1.day, 7); assert.equal(s1.bank, 412)
  newGame(2, 'zen', st, 200); reload(); assert.equal(latest(st)!.id, 2)
  switchTo(1, st, 300); reload(); assert.equal(latest(st)!.id, 1)
  st.setItem('bwc.slot.2', '{broken'); switchTo(1, st, 400); reload()
  assert.equal(summary(2, st)!.ok, false); assert.equal(latest(st)!.id, 1)
})
test('a damaged slot can’t be switched into, and nothing changes', () => {
  const st = mem(OLD); migrate(st); newGame(2, 'zen', st); reload(); switchTo(1, st); reload(); st.setItem('bwc.slot.2', '{broken')
  assert.throws(() => switchTo(2, st)); assert.equal(lock.on, false); assert.equal(listSlots(st).active, 1)
  assert.equal(st.getItem('brewed-with-code-save-v1'), OLD['brewed-with-code-save-v1'])
})
