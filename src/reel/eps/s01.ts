import type { CamMode } from '../../systems/store'

// One step = some code lines typed in, then the café pieces they build pop in.
export type Step = { at: number; file?: string; lines: string[]; reveal?: string[]; cam?: CamMode }
export type Episode = { id: string; title: string; end: number; steps: Step[] }

// s01 pitch: "this whole café is one curved line"
export const s01: Episode = {
  id: 's01',
  title: 'BUILDS #001 · Brewed With Code',
  end: 31,
  steps: [
    { at: 0.2, file: 'Exterior.tsx', cam: 'exterior', lines: ['// a whole café... from one curved line'] },
    { at: 1.2, lines: ['const profile = [[4.9, 0], [5.9, 1.2], [6.2, 2.8], [5.3, 5.8]]'] },
    { at: 2.8, lines: ['const curve = new SplineCurve(profile)'] },
    { at: 4.0, lines: ['const pot = new LatheGeometry(curve.getPoints(40), 48)', '// spin it like a potter\'s wheel'], reveal: ['pot'] },
    { at: 7.0, lines: ['<Lid />', '<Chimney />'], reveal: ['lid', 'chimney'] },
    { at: 8.8, lines: ['<Porthole />', '<ArchDoor />'], reveal: ['window', 'door', 'band'] },
    { at: 10.6, lines: ['<Path />  <Parking />  <Road />'], reveal: ['path', 'parking', 'road', 'trees', 'flowers', 'wings'] },
    { at: 13.0, file: 'Interior.tsx', cam: 'dollhouse', lines: ['// inside: straight from a notebook sketch', '<Floor />', '<Walls />'], reveal: ['floor', 'walls'] },
    { at: 15.8, lines: ['<Counter />', '<PastryCases />', '<Fridge />'], reveal: ['counter', 'kitchen', 'fridge'] },
    { at: 18.2, lines: ['TABLES.map(([x, z]) => <Table at={[x, z]} />)'], reveal: ['tables'] },
    { at: 20.4, lines: ['<Lamps />  <Plants />  <Shelves />', '<Barista />'], reveal: ['decor', 'barista'] },
    { at: 23.0, cam: 'pov', lines: ['<Drawers items={["fillers", "sprinkles",', '  "ingredients", "food"]} />'] },
    { at: 25.6, cam: 'dollhouse', lines: ['PLUS_SPOTS.forEach(spot => lock(spot))'], reveal: ['plus'] },
    { at: 27.6, lines: ['const menu = []  // ← you decide'] },
  ],
}

export const EPISODES: Record<string, Episode> = { s01 }
