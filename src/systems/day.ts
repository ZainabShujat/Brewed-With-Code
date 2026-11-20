import { create } from 'zustand'
import { hourNow, setHour, useClock } from './clock'

// ── The game loop: a café "day" ───────────────────────────────────────────────────────────
// Open the doors → customers arrive for DAY_LEN seconds → doors close → results → next day.
// Everything you earn is saved in the browser, so tomorrow picks up where you left off.

export const DAY_LEN = 480 // seconds of opening hours: ~8-10 guests, with quiet spells in between (real-time clock players)
// Café hours (playtest 20 Nov): business days run 10:00 → 20:00 on the WORLD clock. The world clock keeps going after
// closing (explore all night), but the next business day always starts at opening time, never at 2 am.
export const OPEN_H = 10, CLOSE_H = 20
const realClock = () => useClock.getState().real
/** how long today's opening hours are, in the same units as `left` (for progress bars) */
export const daySpan = () => (realClock() ? DAY_LEN : (CLOSE_H - OPEN_H) * 60)

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
  closeUp: () => void
  record: (k: keyof DayStats, n?: number) => void
  next: () => void
  save: () => void
}

export const useDay = create<DayState>((set, get) => ({
  ...load(), phase: 'idle', left: DAY_LEN, today: { ...ZERO },
  start: () => {
    if (!realClock()) { const h = hourNow(); if (h < OPEN_H || h >= CLOSE_H) setHour(OPEN_H) } // a new business day opens at 10 am
    set({ phase: 'open', left: realClock() ? DAY_LEN : (CLOSE_H - hourNow()) * 60, today: { ...ZERO } })
  },
  // the clock runs while open; at 0 the doors close, and once the last customer is served → results
  tick: (dt, _lineEmpty) => {
    const s = get()
    if (s.phase !== 'open') return
    if (realClock()) { const left = Math.max(0, s.left - dt); set({ left, phase: left === 0 ? 'closing' : 'open' }); return }
    // game time: close automatically at 8 pm (no new customers; finish who's here, then flip the sign)
    const h = hourNow(), left = Math.max(0, (CLOSE_H - h) * 60), closed = h >= CLOSE_H || h < OPEN_H
    set({ left: closed ? 0 : left, phase: closed ? 'closing' : 'open' })
  },
  // closing time: once the last guest is served, YOU flip the door sign to CLOSED (that's what ends the day)
  closeUp: () => {
    const s = get(); if (s.phase !== 'closing') return
    {
      const t = s.today, stars = Math.min(3, Math.round(((t.perfect + 0.5) / Math.max(1, t.served + t.walkouts)) * 3))
      set({ phase: 'results', bank: s.bank + t.coins + t.tips, best: Math.max(s.best, t.coins + t.tips), stars: s.stars + stars }); get().save()
    }
  },
  record: (k, n = 1) => set((s) => ({ today: { ...s.today, [k]: s.today[k] + n } })),
  next: () => { set((s) => ({ day: s.day + 1, phase: 'idle', left: DAY_LEN, today: { ...ZERO } })); get().save() },
  save: () => { const { day, bank, best, unlocks, stars } = get(); try { localStorage.setItem(KEY, JSON.stringify({ day, bank, best, unlocks, stars })) } catch { /* private mode */ } },
}))
if (typeof window !== 'undefined') (window as unknown as { __day: typeof useDay }).__day = useDay
