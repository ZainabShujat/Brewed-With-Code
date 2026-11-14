import { create } from 'zustand'

export type CamMode = 'exterior' | 'dollhouse' | 'walk' | 'pov' | 'outro' | 'vlog' | 'cake'

export type BaristaLook = { skin: string; hair: string; apron: string; shirt: string; cap: string }

type State = {
  mode: CamMode
  setMode: (m: CamMode) => void
  // Player position on the café floor (walk mode). Kept in a plain object
  // so per-frame movement doesn't re-render React.
  player: { x: number; z: number; facing: number; moving?: boolean }
  barista: BaristaLook
  setBarista: (p: Partial<BaristaLook>) => void
  // Reel "build-up" mode: null = everything visible (normal game).
  // A Set = only these pieces are built; the reel adds ids as code lines finish.
  revealed: Set<string> | null
  kozie: boolean // Kozie on set (reels)
  reveal: (...ids: string[]) => void
  startBuild: () => void
}

export const useGame = create<State>((set) => ({
  mode: 'exterior',
  setMode: (mode) => set((s) => {
    // entering walk from the barista view: step out onto the café floor
    if (mode === 'walk' && s.mode === 'pov') Object.assign(s.player, { x: 0.4, z: 2.4, facing: Math.PI })
    return { mode }
  }),
  player: { x: 0.4, z: 2.4, facing: Math.PI },
  barista: { skin: '#f6cdb4', hair: '#5a3166', apron: '#ef9fc3', shirt: '#fff6ee', cap: '#9d6fd0' },
  setBarista: (p) => set((s) => ({ barista: { ...s.barista, ...p } })),
  revealed: null,
  kozie: false,
  reveal: (...ids) => set((s) => ({ revealed: new Set([...(s.revealed ?? []), ...ids]) })),
  startBuild: () => set({ revealed: new Set() }),
}))
