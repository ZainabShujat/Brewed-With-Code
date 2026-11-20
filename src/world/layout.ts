// Interior layout from references/sketches/01-interior-dollhouse-and-barista-pov.jpg
// Room is ROOM x ROOM, centred on the pot. Back wall at -z, left wall at -x, door in front (+z).
// s03: room grew 14 -> 20 m with real breathing room (user: "everything is smushed together").
// Furniture keeps its size; only the gaps grew.
export const ROOM = 20
export const H = ROOM / 2
export const WALL_H = 4.2
// 16 Nov: the room is round, the inside of the coffee pot (radius RR), with a flat back wall at z = -H
export const RR = 14

// The back-zone pieces were modelled in "old room" local space; these offsets place them in the new room.
export const BACK_DZ = -4.2          // counter: leaves a 2 m barista aisle in front of the back wall
export const KITCHEN_DX = -5.4       // kitchen tucked into the back-left corner
export const KITCHEN_DZ = -5.4
export const FRIDGE_DX = 5.4         // fridge against the right wall, back corner
export const FRIDGE_DZ = -5.4

// Axis-aligned blockers the barista can't walk through: [minX, minZ, maxX, maxZ]
export type Box = [number, number, number, number]
const Z = BACK_DZ
export const BLOCKERS: Box[] = [
  [-2.6, -3.95 + Z, 3.0, -2.0 + Z],             // counter + pastry case (walk round either end)
  [-4.2, -2.4 + Z, -2.6, -0.9 + Z],              // angled pastry case
  [3.7 + FRIDGE_DX, -4.6 + FRIDGE_DZ, 4.6 + FRIDGE_DX, -3.4 + FRIDGE_DZ], // fridge
  [-H, -2.5 + KITCHEN_DZ, -3.3 + KITCHEN_DX, -2.3 + KITCHEN_DZ],          // kitchen partition (doorway after it)
  [-2.7 + KITCHEN_DX, -2.5 + KITCHEN_DZ, -2.6 + KITCHEN_DX, -2.3 + KITCHEN_DZ], // partition stub
  // the prep kitchen (21 Nov, world/KitchenRoom): back counter, batter shelf, curtains with a doorway at x 7.0-8.0
  [4.6, -10, 8.8, -9.0], [4.6, -9.0, 5.3, -7.4], [4.2, -6.9, 7.0, -6.6], [8.0, -6.9, 8.9, -6.6], [4.2, -10, 4.5, -6.6],
]
// Tables (x, z); each gets two stools. ~5 m apart so you can walk between them.
// window seats follow the curve under the three windows; a centre cluster; a group corner on the right
// 18 Nov: bigger table sets (TABLE_SCALE) in two calm clusters: by the windows on the left, and on the right,
// with the middle aisle (door to counter, where the queue walks) kept clear and ~1.2 m walkways between tables
export const TABLE_SCALE = 1.9
export const TABLES: [number, number][] = [[-10.6, -1.6], [-11.0, 3.4], [-6.2, -0.6], [-6.0, 5.2], [8.6, -2.0], [10.6, 2.8], [6.4, 4.8]]
for (const [x, z] of TABLES) BLOCKERS.push([x - 1.6, z - 1.1, x + 1.6, z + 1.1]) // a table + its four chairs (chairs on the x sides)
export const PLUS_SPOTS: [number, number][] = [[8, 8], [-8, 8.2], [0.4, 8.6], [8.6, 0.8]]
export const COUNTER = { x0: -2.6, x1: 3.0, z: -3.2, depth: 1.2, top: 1.05 } // in back-zone local space

// 16 Nov: the whole café is drawn 20% bigger (more room, everything easier to see); the camera scales with it
export const WORLD = 1.2
