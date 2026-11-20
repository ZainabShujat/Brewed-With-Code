import { create } from 'zustand'
import { anim } from './anim'
import { sfx } from './sound'

// The bar's drawers hold the extras (20 Nov): click a drawer and it slides open, its things pop up onto the counter
// in front of it; once you've used one, the drawer closes again. One drawer open at a time. The counter stays tidy.
//   sprinkles drawer → the topping shakers (cocoa, cinnamon, sprinkles)
//   fillers drawer   → chocolate sauce and whipped cream
export type DrawerId = 'fillers' | 'sprinkles' | 'ingredients' | 'food'
export const DRAWER_X: Record<DrawerId, number> = { fillers: 2.2, sprinkles: 0.8, ingredients: -0.6, food: -2.0 } // (matches Interior's Counter)
export const DRAWER_OF: Record<string, DrawerId> = { cocoa: 'sprinkles', cinnamon: 'sprinkles', sprinkles: 'sprinkles', whipped: 'fillers', choc: 'fillers' }
type Drawers = { open: DrawerId | ''; toggle: (id: DrawerId) => void; close: () => void }
export const useDrawers = create<Drawers>((set, get) => ({
  open: '',
  toggle: (id) => { sfx.tap(); set({ open: get().open === id ? '' : id }) },
  close: () => set({ open: '' }),
}))
/** ease each drawer towards open / shut (called every frame from the bar) */
export function tickDrawers(dt: number) {
  const open = useDrawers.getState().open
  for (const id of Object.keys(DRAWER_X) as DrawerId[]) {
    const want = open === id ? 1 : 0, cur = anim.drawers[id] ?? 0
    anim.drawers[id] = cur + (want - cur) * Math.min(1, dt * 10)
  }
}
if (typeof window !== 'undefined') (window as unknown as { __drawers: typeof useDrawers }).__drawers = useDrawers
