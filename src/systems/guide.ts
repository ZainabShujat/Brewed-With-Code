import { create } from 'zustand'

// The bar's step-by-step guidance (floating labels, the arrow, the step hints). Kozie's first two orders always guide
// you; from the third order on it's an option you can switch off (20 Nov). Remembered.
const KEY = 'bwc.guide'
const load = () => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const useGuide = create<{ on: boolean; toggle: () => void }>((set, get) => ({
  on: load(),
  toggle: () => { const on = !get().on; try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode */ } set({ on }) },
}))
