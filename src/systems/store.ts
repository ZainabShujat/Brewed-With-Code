import { create } from 'zustand'

export type CamMode = 'exterior' | 'dollhouse' | 'walk' | 'pov'

export type BaristaLook = { skin: string; hair: string; apron: string; shirt: string; cap: string }

type State = {
  mode: CamMode
  setMode: (m: CamMode) => void
  // Player position on the café floor (walk mode). Kept in a plain object
  // so per-frame movement doesn't re-render React.
  player: { x: number; z: number; facing: number; moving?: boolean }
  barista: BaristaLook
  setBarista: (p: Partial<BaristaLook>) => void
}

export const useGame = create<State>((set) => ({
  mode: 'exterior',
  setMode: (mode) => set({ mode }),
  player: { x: 0.5, z: 1.2, facing: Math.PI },
  barista: { skin: '#f6cdb4', hair: '#5a3166', apron: '#ef9fc3', shirt: '#fff6ee', cap: '#9d6fd0' },
  setBarista: (p) => set((s) => ({ barista: { ...s.barista, ...p } })),
}))
