// Interior layout from references/sketches/01-interior-dollhouse-and-barista-pov.jpg
// Room is ROOM x ROOM, centred on the pot. Back wall at -z, left wall at -x, door in front (+z).
export const ROOM = 9.2
export const H = ROOM / 2

// Axis-aligned blockers the barista can't walk through: [minX, minZ, maxX, maxZ]
export type Box = [number, number, number, number]
export const BLOCKERS: Box[] = [
  [-2.6, -3.95, 3.0, -2.15], // counter + pastry cases (gap at x 3.0..3.7 to get behind)
  [3.7, -4.6, 4.6, -3.4],    // fridge
  [-4.6, -2.5, -3.3, -2.3],  // kitchen partition, left part
  [-2.7, -2.5, -2.6, -2.3],  // kitchen partition stub (doorway between -3.3 and -2.7)
  [-2.9, 0.6, -1.1, 2.4],    // table A
  [1.0, 1.2, 2.8, 3.0],      // table B
]
export const TABLES: [number, number][] = [[-2, 1.5], [1.9, 2.1]]
export const PLUS_SPOTS: [number, number][] = [[3.6, 3.6], [-3.6, 3.8], [0, 4.0], [4.0, 0.2]]
export const COUNTER = { x0: -2.6, x1: 3.0, z: -3.2, depth: 1.2, top: 1.05 }
