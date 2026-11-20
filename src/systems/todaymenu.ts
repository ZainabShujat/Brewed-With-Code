import { create } from 'zustand'
import { MENU, byId, preparable, type MenuItem } from '../data/menu'

// Today's Menu: what the café sells today. Chosen before opening; customers only order from it.
// Saved per playthrough (a progress key in systems/saves.ts), with favourite combinations as presets.
const KEY = 'bwc.menu'
export type Preset = { name: string; ids: string[] }
type Saved = { ids: string[]; confirmedDay: number; presets: Preset[] }
const DEFAULT_PRESETS: Preset[] = [
  { name: 'Morning coffee', ids: ['espresso', 'americano', 'latte', 'cappuccino', 'flatwhite'] },
  { name: 'Afternoon treats', ids: ['latte', 'mocha', 'cake-vanilla', 'cake-chocolate', 'cake-strawberry'] },
]
const load = (): Saved => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.ids)) return { ids: s.ids, confirmedDay: s.confirmedDay | 0, presets: Array.isArray(s.presets) ? s.presets : DEFAULT_PRESETS } } catch { /* fresh */ }
  return { ids: MENU.filter((m) => m.unlockDay <= 1).map((m) => m.id), confirmedDay: 0, presets: DEFAULT_PRESETS }
}
type S = Saved & {
  open: boolean; onConfirm: (() => void) | null
  toggle: (id: string) => void; setIds: (ids: string[]) => void
  confirm: (day: number) => void; ask: (then: () => void) => void; close: () => void
  savePreset: (name: string) => void; deletePreset: (name: string) => void
}
const persist = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify({ ids: s.ids, confirmedDay: s.confirmedDay, presets: s.presets })) } catch { /* private mode */ } }
export const useTodayMenu = create<S>((set, get) => ({
  ...(typeof localStorage === 'undefined' ? { ids: [], confirmedDay: 0, presets: DEFAULT_PRESETS } : load()),
  open: false, onConfirm: null,
  toggle: (id) => { const ids = get().ids.includes(id) ? get().ids.filter((x) => x !== id) : [...get().ids, id]; set({ ids }); persist({ ...get(), ids }) },
  setIds: (ids) => { set({ ids }); persist({ ...get(), ids }) },
  confirm: (day) => { const then = get().onConfirm; set({ confirmedDay: day, open: false, onConfirm: null }); persist({ ...get(), confirmedDay: day }); then?.() },
  ask: (then) => set({ open: true, onConfirm: then }),
  close: () => set({ open: false, onConfirm: null }),
  savePreset: (name) => { const presets = [...get().presets.filter((p) => p.name !== name), { name, ids: [...get().ids] }]; set({ presets }); persist({ ...get(), presets }) },
  deletePreset: (name) => { const presets = get().presets.filter((p) => p.name !== name); set({ presets }); persist({ ...get(), presets }) },
}))

/** the items customers may order right now: on today's menu AND preparable (unlocked, enough in the pantry) */
export function orderable(day: number, stock: Parameters<typeof preparable>[2], ids = useTodayMenu.getState().ids): MenuItem[] {
  return ids.map(byId).filter((m): m is MenuItem => !!m && preparable(m, day, stock))
}
if (typeof window !== 'undefined') (window as unknown as { __menu: typeof useTodayMenu }).__menu = useTodayMenu
