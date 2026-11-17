import { create } from 'zustand'

// ── The game loop: a café "day" ───────────────────────────────────────────────────────────
// Open the doors → customers arrive for DAY_LEN seconds → doors close → results → next day.
// Everything you earn is saved in the browser, so tomorrow picks up where you left off.

export const DAY_LEN = 180 // seconds of customers per day

export type DayStats = { served: number; perfect: number; coins: number; tips: number; walkouts: number; cakes: number }
const ZERO: DayStats = { served: 0, perfect: 0, coins: 0, tips: 0, walkouts: 0, cakes: 0 }

type Save = { day: number; bank: number; best: number; unlocks: string[]; stars: number }
const KEY = 'brewed-with-code-save-v1'
// a save from an older version, a hand-edited one or a corrupt one must never break the game: keep only sane values
const num = (v: unknown, d: number, min = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : d)
const load = (): Save => {
  let raw: Record<string, unknown> = {}
  try { const p = JSON.parse(localStorage.getItem(KEY) || '{}'); if (p && typeof p === 'object') raw = p } catch { /* corrupt: start fresh */ }
  return { day: Math.floor(num(raw.day, 1, 1)), bank: num(raw.bank, 0), best: num(raw.best, 0), stars: num(raw.stars, 0),
    unlocks: Array.isArray(raw.unlocks) ? raw.unlocks.filter((u): u is string => typeof u === 'string') : [] }
}

type DayState = Save & {
  phase: 'idle' | 'open' | 'closing' | 'results'
  left: number           // seconds left in today's opening hours
  today: DayStats
  start: () => void
  tick: (dt: number, lineEmpty: boolean) => void
  record: (k: keyof DayStats, n?: number) => void
  next: () => void
  save: () => void
}

export const useDay = create<DayState>((set, get) => ({
  ...load(), phase: 'idle', left: DAY_LEN, today: { ...ZERO },
  start: () => set({ phase: 'open', left: DAY_LEN, today: { ...ZERO } }),
  // the clock runs while open; at 0 the doors close, and once the last customer is served → results
  tick: (dt, lineEmpty) => {
    const s = get()
    if (s.phase === 'open') { const left = Math.max(0, s.left - dt); set({ left, phase: left === 0 ? 'closing' : 'open' }) }
    else if (s.phase === 'closing' && lineEmpty) {
      const t = s.today, stars = Math.min(3, Math.round(((t.perfect + 0.5) / Math.max(1, t.served + t.walkouts)) * 3))
      set({ phase: 'results', bank: s.bank + t.coins + t.tips, best: Math.max(s.best, t.coins + t.tips), stars: s.stars + stars }); get().save()
    }
  },
  record: (k, n = 1) => set((s) => ({ today: { ...s.today, [k]: s.today[k] + n } })),
  next: () => { set((s) => ({ day: s.day + 1, phase: 'idle', left: DAY_LEN, today: { ...ZERO } })); get().save() },
  save: () => { const { day, bank, best, unlocks, stars } = get(); try { localStorage.setItem(KEY, JSON.stringify({ day, bank, best, unlocks, stars })) } catch { /* private mode */ } },
}))
if (typeof window !== 'undefined') (window as unknown as { __day: typeof useDay }).__day = useDay
