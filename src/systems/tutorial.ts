import { create } from 'zustand'
import { RECIPES, type Order, type Drink } from '../data/recipes'

// Kozie's first-day tutorial: the first two customers order a small espresso, then a medium latte, and Kozie talks
// you through each step. Saved in localStorage, so it only runs once. `?tutorial` in the URL replays it;
// test/capture pages (`?snap`, `?embed`) skip it unless asked.
const KEY = 'bwc.tutorial.done'
const q = typeof location !== 'undefined' ? location.search : ''
const FORCE = q.includes('tutorial')
const SKIP_PAGE = q.includes('snap') || q.includes('embed')
const saved = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

export type TutState = { lesson: number; t: number; skip: () => void; next: () => void }
// lesson 0 = espresso, 1 = latte, 2 = done
export const useTutorial = create<TutState>((set, get) => ({
  lesson: FORCE ? 0 : SKIP_PAGE || saved() ? 2 : 0,
  t: 0,
  skip: () => { try { localStorage.setItem(KEY, '1') } catch { /* private mode */ } set({ lesson: 2, t: performance.now() }) },
  next: () => { const l = get().lesson; if (l >= 2) return; if (l + 1 >= 2) get().skip(); else set({ lesson: l + 1, t: performance.now() }) },
}))

const D = (p: Partial<Drink>): Drink => ({ size: 'medium', shots: 1, water: false, chocolate: false, milk: 'none', milkType: 'whole', topping: 'none', ...p })
/** the order Kozie wants you to practise on, or null once the tutorial is done */
export function tutorialOrder(): Order | null {
  const l = useTutorial.getState().lesson
  if (l === 0) return { recipe: RECIPES.find((r) => r.id === 'espresso')!, want: D({ size: 'small' }), label: 'Small Espresso' }
  if (l === 1) return { recipe: RECIPES.find((r) => r.id === 'latte')!, want: D({ milk: 'steamed' }), label: 'Medium Latte' }
  return null
}
