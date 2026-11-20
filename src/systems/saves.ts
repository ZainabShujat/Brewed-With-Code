// Save slots (S0, 20 Nov). Three playthroughs, each Story or Zen, one active at a time.
//
// How it's stored (localStorage):
//   bwc.slots           index: { version, active, slots: { "1": meta, "2": meta, "3": meta } }
//   bwc.slot.<n>        that slot's progress: { "<progress key>": "<raw stored string>", ... }
//   bwc.backup.legacy   a byte-for-byte copy of the old single save, made BEFORE migrating (never overwritten)
//   bwc.backup.slot.<n> the slot's previous copy, kept each time it is overwritten
//
// The game's systems (day, pantry, avatar, clock, tutorials) still read and write their own keys: those keys
// are the *working copy* of the active slot. `commitActive()` copies them into the slot; `switchTo()` saves
// the current slot, loads another slot's keys in, and the page reloads so every system starts fresh.
// Settings (music, sensitivity, guide on/off) are not per playthrough and are never touched.

export const SAVE_VERSION = 1
export type Mode = 'story' | 'zen'
export type SlotId = 1 | 2 | 3
export const SLOT_IDS: SlotId[] = [1, 2, 3]
export type SlotMeta = {
  mode: Mode | null // null = an old save from before modes existed; we don't guess which it was
  legacy: boolean
  created: number
  lastPlayed: number
  version: number
}
export type Index = { version: number; active: SlotId | null; slots: Partial<Record<SlotId, SlotMeta>> }

/** everything that belongs to one playthrough */
export const PROGRESS_KEYS = [
  'brewed-with-code-save-v1', // day, bank, best, unlocks, stars
  'brewed-with-code-pantry-v1',
  'brewed-with-code-avatar-v1',
  'brewed-with-code-clock-v1',
  'bwc.tutorial.done',
  'bwc.navtut.done',
  'bwc.menu', // today's menu + presets (S4/S5)
] as const

const INDEX = 'bwc.slots', SLOT = (n: SlotId) => `bwc.slot.${n}`, SLOT_BAK = (n: SlotId) => `bwc.backup.slot.${n}`
export const LEGACY_BACKUP = 'bwc.backup.legacy'

export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const WORKING = 'bwc.working' // which slot the live progress keys belong to ('' = mid-switch)

// The write lock (S1). While a switch is under way (and until the page reloads), the game's own late saves
// (debounced pantry, day end, clock...) are dropped, so the slot you just left can't spill into the next one.
// In the browser, Storage.prototype.setItem/removeItem consult `blocked()`; the save system's own writes pass.
export const lock = { on: false, internal: 0 }
export const blocked = (key: string) => lock.on && lock.internal === 0 && (PROGRESS_KEYS as readonly string[]).includes(key)
function inside<T>(f: () => T): T { lock.internal++; try { return f() } finally { lock.internal-- } }
const browser = (): Store | null => { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }

function readIndex(st: Store): Index | null {
  const raw = st.getItem(INDEX); if (!raw) return null
  const ix = JSON.parse(raw) as Index
  if (!ix || typeof ix !== 'object' || typeof ix.version !== 'number' || !ix.slots) throw new Error('save index is damaged')
  return ix
}
const writeIndex = (st: Store, ix: Index) => st.setItem(INDEX, JSON.stringify(ix))

/** the working copy as { key: raw string } (only keys that exist) */
function snapshot(st: Store): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of PROGRESS_KEYS) { const v = st.getItem(k); if (v !== null) out[k] = v }
  return out
}
/** write a value and read it back; throws if storage didn't keep it (full / blocked) */
function setChecked(st: Store, k: string, v: string) { st.setItem(k, v); if (st.getItem(k) !== v) throw new Error(`could not write ${k}`) }

export type MigrateResult =
  | { status: 'fresh' } // no old save, nothing to do
  | { status: 'already' } // slots exist already
  | { status: 'migrated'; keys: string[] }
  | { status: 'failed'; error: string } // the old save is untouched and the backup (if written) stays

/** One-time: turn the old single save into slot 1. Never changes or deletes the old keys. Safe to run every boot. */
export function migrate(st: Store | null = browser(), now = Date.now()): MigrateResult {
  if (!st) return { status: 'fresh' }
  try { if (readIndex(st)) return { status: 'already' } } catch (e) { return { status: 'failed', error: String((e as Error).message ?? e) } }
  const old = snapshot(st)
  const keys = Object.keys(old)
  if (!keys.length) return { status: 'fresh' }
  try {
    // 1. backup first, verified. An existing backup is never overwritten.
    const bak = JSON.stringify({ version: 0, taken: now, data: old })
    if (st.getItem(LEGACY_BACKUP) === null) setChecked(st, LEGACY_BACKUP, bak)
    // 2. the slot's data, verified
    setChecked(st, SLOT(1), JSON.stringify(old))
    setChecked(st, WORKING, '1')
    // 3. the index last: until it exists, the migration hasn't happened and will simply run again next boot
    setChecked(st, INDEX, JSON.stringify({ version: SAVE_VERSION, active: 1, slots: { 1: { mode: null, legacy: true, created: now, lastPlayed: now, version: SAVE_VERSION } } } satisfies Index))
    return { status: 'migrated', keys }
  } catch (e) {
    try { st.removeItem(SLOT(1)); st.removeItem(INDEX); st.removeItem(WORKING) } catch { /* nothing more we can do */ }
    return { status: 'failed', error: String((e as Error).message ?? e) }
  }
}

export function listSlots(st: Store | null = browser()): Index {
  const empty: Index = { version: SAVE_VERSION, active: null, slots: {} }
  if (!st) return empty
  try { return readIndex(st) ?? empty } catch { return empty }
}

/** copy the working copy into the active slot (keeps the slot's previous copy as its backup) */
export function commitActive(st: Store | null = browser(), now = Date.now()): boolean {
  if (!st || lock.on) return false // mid-switch: nothing in the live keys may be trusted any more
  const ix = listSlots(st); const n = ix.active; if (!n || !ix.slots[n]) return false
  if (st.getItem(WORKING) !== String(n)) return false // the live keys aren't this slot's (never cross-write)
  const prev = st.getItem(SLOT(n)); if (prev !== null) st.setItem(SLOT_BAK(n), prev)
  setChecked(st, SLOT(n), JSON.stringify(snapshot(st)))
  ix.slots[n]!.lastPlayed = now; writeIndex(st, ix); return true
}

function loadWorking(st: Store, data: Record<string, string>) {
  for (const k of PROGRESS_KEYS) { if (k in data) st.setItem(k, data[k]); else st.removeItem(k) }
}

/** start a new playthrough in an EMPTY slot. Mode is fixed for the life of the slot. */
export function newGame(n: SlotId, mode: Mode, st: Store | null = browser(), now = Date.now()) {
  if (!st) throw new Error('no storage')
  const ix = listSlots(st)
  if (ix.slots[n]) throw new Error(`slot ${n} is in use: delete it first`)
  if (ix.active) commitActive(st, now)
  lock.on = true
  inside(() => {
    setChecked(st, SLOT(n), '{}'); st.setItem(WORKING, '')
    loadWorking(st, {}); st.setItem(WORKING, String(n))
    ix.slots[n] = { mode, legacy: false, created: now, lastPlayed: now, version: SAVE_VERSION }
    ix.active = n; writeIndex(st, ix)
  })
}

/** make another existing slot the active one (caller reloads the page afterwards) */
export function switchTo(n: SlotId, st: Store | null = browser(), now = Date.now()) {
  if (!st) throw new Error('no storage')
  const ix = listSlots(st); if (!ix.slots[n]) throw new Error(`slot ${n} is empty`)
  if (ix.active === n) return
  const data = JSON.parse(st.getItem(SLOT(n)) ?? '{}') as Record<string, string> // parse first: a damaged slot changes nothing
  if (ix.active) commitActive(st, now)
  lock.on = true
  inside(() => {
    st.setItem(WORKING, ''); loadWorking(st, data); st.setItem(WORKING, String(n))
    const ix2 = listSlots(st); ix2.active = n; ix2.slots[n]!.lastPlayed = now; writeIndex(st, ix2)
  })
}

/** delete one slot (its data and its backup). Other slots and the legacy backup are untouched. */
export function deleteSlot(n: SlotId, st: Store | null = browser()) {
  if (!st) return
  const ix = listSlots(st); if (!ix.slots[n]) return
  if (ix.active === n) lock.on = true // the running game belongs to this slot: stop it saving
  inside(() => {
    delete ix.slots[n]; st.removeItem(SLOT(n)); st.removeItem(SLOT_BAK(n))
    if (ix.active === n) { ix.active = null; st.setItem(WORKING, ''); loadWorking(st, {}) }
    writeIndex(st, ix)
  })
}

/** a slot's mode can't change: Story and Zen progress never mix */
export const modeOf = (n: SlotId, st: Store | null = browser()) => listSlots(st).slots[n]?.mode ?? null

/** put the old single save back exactly as it was (undoes migration; slots are left alone unless `dropSlots`) */
export function restoreLegacy(st: Store | null = browser(), dropSlots = false): boolean {
  if (!st) return false
  const raw = st.getItem(LEGACY_BACKUP); if (!raw) return false
  const { data } = JSON.parse(raw) as { data: Record<string, string> }
  loadWorking(st, data)
  if (dropSlots) { for (const n of SLOT_IDS) { st.removeItem(SLOT(n)); st.removeItem(SLOT_BAK(n)) } st.removeItem(INDEX); st.removeItem(WORKING) }
  return true
}

/** restore a slot from its previous copy */
export function restoreSlotBackup(n: SlotId, st: Store | null = browser()): boolean {
  if (!st) return false
  const b = st.getItem(SLOT_BAK(n)); if (b === null) return false
  st.setItem(SLOT(n), b); if (listSlots(st).active === n) loadWorking(st, JSON.parse(b)); return true
}

/** boot: if a switch was cut off half-way (crash, closed tab), put the active slot's own data back in the live keys */
export function repair(st: Store | null = browser()): 'ok' | 'repaired' {
  if (!st) return 'ok'
  const ix = listSlots(st), n = ix.active
  if (!n || st.getItem(WORKING) === String(n)) return 'ok'
  const raw = st.getItem(SLOT(n)); if (raw === null) return 'ok'
  loadWorking(st, JSON.parse(raw)); st.setItem(WORKING, String(n)); return 'repaired'
}

export type Summary = { id: SlotId; meta: SlotMeta; name: string; day: number; bank: number; stars: number; ok: boolean }
/** what the menu shows for a slot (the active slot reads the live keys: they're the freshest) */
export function summary(n: SlotId, st: Store | null = browser()): Summary | null {
  if (!st) return null
  const ix = listSlots(st), meta = ix.slots[n]; if (!meta) return null
  let data: Record<string, string> = {}, ok = true
  try { data = ix.active === n && st.getItem(WORKING) === String(n) ? snapshot(st) : JSON.parse(st.getItem(SLOT(n)) ?? 'null') ?? (ok = false, {}) } catch { ok = false }
  const j = (k: string) => { try { return JSON.parse(data[k] ?? '{}') ?? {} } catch { ok = false; return {} } }
  const d = j('brewed-with-code-save-v1'), a = j('brewed-with-code-avatar-v1')
  return { id: n, meta, ok, name: String(a.name || ''), day: Number(d.day) || 1, bank: Number(d.bank) || 0, stars: Number(d.stars) || 0 }
}
/** Continue = the most recently played slot that reads cleanly */
export function latest(st: Store | null = browser()): Summary | null {
  return SLOT_IDS.map((n) => summary(n, st)).filter((x): x is Summary => !!x && x.ok).sort((a, b) => b.meta.lastPlayed - a.meta.lastPlayed)[0] ?? null
}

// in the browser: migrate on boot, keep the active slot in step as you play and when you leave
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  // the write lock: the game's own late saves are dropped mid-switch (see `lock`)
  const set0 = Storage.prototype.setItem, rm0 = Storage.prototype.removeItem
  Storage.prototype.setItem = function (k: string, v: string) { if (this === localStorage && blocked(k)) return; set0.call(this, k, v) }
  Storage.prototype.removeItem = function (k: string) { if (this === localStorage && blocked(k)) return; rm0.call(this, k) }
  const r = migrate(); repair(); if (r.status === 'failed') console.warn('[saves] migration failed, old save untouched:', r.error)
  const save = () => { try { commitActive() } catch (e) { console.warn('[saves] could not save slot', e) } }
  window.addEventListener('pagehide', save)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save() })
  setInterval(save, 30000)
  ;(window as unknown as { __saves: object }).__saves = { listSlots, newGame, switchTo, deleteSlot, restoreLegacy, migrate, commitActive, summary, latest, lock }
}
