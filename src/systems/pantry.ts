import { create } from 'zustand'
import { INGREDIENTS, packAmount, packPrice, PACKS, levelFromStars, STORE_NAME, fmt, type IngredientId, type PackKind } from '../data/ingredients'
import { useDay } from './day'

// The café's pantry: what you have of every ingredient (saved). Making orders uses it up; the shops on the street
// sell more for coins from your bank. If something runs out, the step just doesn't happen and a friendly note
// says where to buy it (cozy: nothing spoils, nothing is lost).

type Stock = Record<IngredientId, number>
const KEY = 'brewed-with-code-pantry-v1'
const START = Object.fromEntries(Object.values(INGREDIENTS).map((i) => [i.id, i.start])) as Stock
const load = (): Stock => {
  try { const p = JSON.parse(localStorage.getItem(KEY) || '{}'); const s = { ...START }
    for (const k of Object.keys(START) as IngredientId[]) if (typeof p[k] === 'number' && Number.isFinite(p[k]) && p[k] >= 0) s[k] = p[k]
    return s } catch { return { ...START } }
}

type Pantry = {
  stock: Stock
  note: { text: string; t: number } | null
  /** use `n` of an ingredient; false (and a note) if there isn't enough */
  use: (id: IngredientId, n: number) => boolean
  /** use several at once, all or nothing */
  useAll: (items: [IngredientId, number][]) => boolean
  has: (id: IngredientId, n: number) => boolean
  /** buy a pack with coins from the bank; returns why it failed, or '' */
  buy: (id: IngredientId, kind: PackKind) => string
  level: () => number
  fill: () => void // tests / chill mode: a full pantry
  save: () => void
}
const now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0)

export const usePantry = create<Pantry>((set, get) => ({
  stock: typeof localStorage === 'undefined' ? { ...START } : load(),
  note: null,
  has: (id, n) => get().stock[id] >= n - 1e-6,
  use: (id, n) => {
    if (n <= 0) return true
    if (!get().has(id, n)) { const i = INGREDIENTS[id]; set({ note: { text: `out of ${i.label}: buy more at ${STORE_NAME[i.store]}`, t: now() } }); return false }
    set((s) => ({ stock: { ...s.stock, [id]: s.stock[id] - n } })); return true
  },
  useAll: (items) => {
    const short = items.find(([id, n]) => !get().has(id, n))
    if (short) { const i = INGREDIENTS[short[0]]; set({ note: { text: `out of ${i.label}: buy more at ${STORE_NAME[i.store]}`, t: now() } }); return false }
    set((s) => { const stock = { ...s.stock }; for (const [id, n] of items) stock[id] -= n; return { stock } }); return true
  },
  buy: (id, kind) => {
    const lvl = get().level(), need = PACKS[kind].level
    if (lvl < need) return `unlocks at level ${need}`
    const cost = packPrice(id, kind), D = useDay.getState()
    if (D.bank < cost) return 'not enough coins in the bank'
    useDay.setState({ bank: D.bank - cost }); D.save()
    set((s) => ({ stock: { ...s.stock, [id]: s.stock[id] + packAmount(id, kind) }, note: { text: `+${fmt(id, packAmount(id, kind))} ${INGREDIENTS[id].label}`, t: now() } }))
    get().save(); return ''
  },
  level: () => levelFromStars(useDay.getState().stars),
  fill: () => set({ stock: Object.fromEntries(Object.keys(START).map((k) => [k, 1e9])) as Stock }),
  save: () => { try { localStorage.setItem(KEY, JSON.stringify(get().stock)) } catch { /* private mode */ } },
}))
if (typeof window !== 'undefined') (window as unknown as { __pantry: typeof usePantry }).__pantry = usePantry
// save a moment after the pantry changes (not every frame while you pour)
let saveT: ReturnType<typeof setTimeout> | null = null
usePantry.subscribe(() => { if (saveT || typeof localStorage === 'undefined') return; saveT = setTimeout(() => { saveT = null; usePantry.getState().save() }, 1500) })
