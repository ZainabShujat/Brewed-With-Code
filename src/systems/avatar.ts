import { create } from 'zustand'
import { PAPER_MODELS, MALLOW_MODELS, rollFace, type FolkSpec } from '../world/folk/specs'

// You: Kozie by default (the notebook from the reels), or your own character, a notebook or a marshmallow of any
// model, colour and face, with your own name. Saved in the browser; the creator opens the first time you play.
export type AvatarKind = 'kozie' | 'paper' | 'mallow'
export type Avatar = { kind: AvatarKind; model: number; colour: number; faceSeed: number; name: string; made: boolean }
const KEY = 'brewed-with-code-avatar-v1'
const DEFAULT: Avatar = { kind: 'kozie', model: 0, colour: 0, faceSeed: 7, name: '', made: false }
const load = (): Avatar => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); if (a && typeof a === 'object') return { ...DEFAULT, ...a, model: Math.max(0, Math.min(9, a.model | 0)), colour: Math.max(0, Math.min(4, a.colour | 0)), name: String(a.name ?? '').slice(0, 18) } } catch { /* fresh */ } return { ...DEFAULT } }

type Store = Avatar & { set: (p: Partial<Avatar>) => void; save: () => void }
export const useAvatar = create<Store>((set, get) => ({
  ...(typeof localStorage === 'undefined' ? DEFAULT : load()),
  set: (p) => set(p),
  save: () => { const { kind, model, colour, faceSeed, name } = get(); set({ made: true }); try { localStorage.setItem(KEY, JSON.stringify({ kind, model, colour, faceSeed, name, made: true })) } catch { /* private mode */ } },
}))

/** the townsperson spec for a notebook / marshmallow avatar (Kozie has her own model) */
export function avatarSpec(a: Avatar): FolkSpec | null {
  if (a.kind === 'kozie') return null
  const face = rollFace(a.faceSeed)
  return a.kind === 'paper'
    ? { kind: 'paper', model: PAPER_MODELS[a.model], colour: a.colour, face, seed: a.faceSeed, ribbon: a.faceSeed % 2 === 0, sticker: false }
    : { kind: 'mallow', model: MALLOW_MODELS[a.model], colour: a.colour, face, seed: a.faceSeed, squish: 1 }
}
export const displayName = (a: Avatar) => a.name.trim() || 'Kozie'
if (typeof window !== 'undefined') (window as unknown as { __avatar: typeof useAvatar }).__avatar = useAvatar
