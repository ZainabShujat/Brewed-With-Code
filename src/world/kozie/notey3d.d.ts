// Kozie, the Notes From a B.Tech Brain mascot (copied from notes-brain/trailer/mascot/notey3d.js)
export type Mascot = {
  group: import('three').Group
  update(t: number): void
  pose(name: 'idle' | 'wave' | 'think' | 'excited' | 'oops'): void
  say(seconds: number): Mascot
  pencil: import('three').Object3D
}
export function makeMascot3D(three: typeof import('three'), deps: { RoundedBoxGeometry: any }): Mascot
