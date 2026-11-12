// Interior layout from references/sketches/01-interior-dollhouse-and-barista-pov.jpg
// Room is ROOM x ROOM, centred on the pot. Back wall at -z, left wall at -x, door in front (+z).
// s02: room grew from 9.2 to 14 so it feels like a real café. Furniture kept its size.
export const ROOM = 14
export const H = ROOM / 2

// The back zone (counter, kitchen, fridge) was designed for the old room and is shifted as a block.
export const BACK_DZ = -2.4          // counter/kitchen/fridge move toward the new back wall
export const KITCHEN_DX = -2.4       // kitchen follows the left wall
export const FRIDGE_DX = 2.9         // fridge follows the right wall

// Axis-aligned blockers the barista can't walk through: [minX, minZ, maxX, maxZ]
export type Box = [number, number, number, number]
const Z = BACK_DZ
export const BLOCKERS: Box[] = [
  [-2.6, -3.95 + Z, 3.0, -2.0 + Z],             // counter + pastry case (gap at x 3.0..6.5 to get behind)
  [-4.2, -2.4 + Z, -2.6, -0.9 + Z],              // angled pastry case
  [3.7 + FRIDGE_DX, -4.6 + Z, 4.6 + FRIDGE_DX, -3.4 + Z], // fridge
  [-H, -2.5 + Z, -3.3 + KITCHEN_DX, -2.3 + Z],          // kitchen partition (doorway after it)
  [-2.7 + KITCHEN_DX, -2.5 + Z, -2.6 + KITCHEN_DX, -2.3 + Z], // partition stub
]
// Tables (x, z); each gets two stools. Spread over the bigger floor.
export const TABLES: [number, number][] = [[-3.6, 0.2], [0.4, 0.8], [4.4, -0.4], [-2.2, 4.0], [2.6, 4.2]]
for (const [x, z] of TABLES) BLOCKERS.push([x - 1.3, z - 0.8, x + 1.3, z + 0.8])
export const PLUS_SPOTS: [number, number][] = [[5.6, 5.6], [-5.6, 5.8], [0.2, 6.2], [6.1, 2.2]]
export const COUNTER = { x0: -2.6, x1: 3.0, z: -3.2, depth: 1.2, top: 1.05 } // in back-zone local space
