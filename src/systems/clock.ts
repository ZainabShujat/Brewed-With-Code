import { create } from 'zustand'

// The world clock: what time of day it is in the café's street.
// Game time: 1 real minute = 1 in-game hour, so a full day/night cycle takes 24 minutes. It starts at 8 am.
// Real time (a setting): follows the computer's own clock, so playing at 9 pm means night in the café too.
// The time keeps going while you play; it's saved, so you come back to the same hour.
const KEY = 'brewed-with-code-clock-v1'
const MIN_PER_HOUR = 1 // real minutes per game hour
type Saved = { real: boolean; hour: number }
const load = (): Saved => { try { return { real: false, hour: 8, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { real: false, hour: 8 } } }

type Clock = { real: boolean; setReal: (on: boolean) => void }
export const useClock = create<Clock>((set) => ({
  real: load().real,
  setReal: (real) => { set({ real }); save() },
}))

let gameHour = load().hour
let speed = 1 // capture/testing only: how many times faster than 1 min = 1 hour
let last = typeof performance !== 'undefined' ? performance.now() : 0
let saved = 0
function save() { try { localStorage.setItem(KEY, JSON.stringify({ real: useClock.getState().real, hour: gameHour })) } catch { /* private mode */ } }

// call once per frame; returns the hour as a decimal (13.5 = 1:30 pm)
export function tickClock(): number {
  const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now
  gameHour = (gameHour + (dt * speed) / (MIN_PER_HOUR * 60)) % 24
  if (now - saved > 10000) { saved = now; save() }
  return hourNow()
}
export function hourNow(): number {
  if (useClock.getState().real) { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 }
  return gameHour
}
export const fmtHour = (h: number) => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); const ap = hh < 12 ? 'am' : 'pm'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}` }

// capture/testing hook (reels drive a time-lapse with it): __clock.set(19.5), __clock.speed(240)
if (typeof window !== 'undefined') (window as unknown as { __clock: object }).__clock = {
  set: (h: number) => { useClock.getState().setReal(false); gameHour = ((h % 24) + 24) % 24 },
  speed: (x: number) => { speed = x },
  get: () => hourNow(),
}

/** jump the world clock (game time only): a new business day starts at opening time */
export function setHour(h: number) { if (!useClock.getState().real) { gameHour = ((h % 24) + 24) % 24; save() } }
