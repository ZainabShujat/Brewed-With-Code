// The street block, in café-floor units (≈ metres, before the WORLD render scale). Shared by the street
// meshes and by movement (what you can walk on), so the two can never disagree.
//
//   z   BACK (-50) ── brick wall ──────────────────────────────────────────
//       …  the café (teapot, base radius 14.45; its wall bulges out to ~18.3 at head height)
//   17.6 front of the door passage (the pot's thick wall is a short tunnel: 13.6 → 17.6)
//   17.6 ── pavement A ── 21.6
//   21.6 ── main road (zebra at x = 0) ── 29.1
//   29.1 ── pavement B ── 33.1
//   33.1 … side street (|x| < 3.75, pavements to 6.75) runs to FRONT (64): a gate
//   x = ±62: walls, with gates across the road ends
export const STREET = {
  X: 62, BACK: -50, FRONT: 64,
  passage: [13.6, 17.6] as [number, number],
  padA: [17.6, 21.6] as [number, number],
  road: [21.6, 29.1] as [number, number],
  padB: [29.1, 33.1] as [number, number],
  side: { road: 3.75, pad: 6.75 },
  potClear: 18.6, // outside, keep this far from the pot's centre (its bulge)
  // things you can't walk through outside (x0, z0, x1, z1); the shops' footprints are added below
  blockers: [] as [number, number, number, number][],
  // tree trunks (x, z, radius)
  trees: [[-56, -14.75, 2.4], [56, -17.7, 2.6], [-23.6, -41.3, 2.6], [26.5, -41.3, 2.8]] as [number, number, number][],
}

// ── Day 3: the neighbours ──
// Shopfronts face the street. `side: 'a'` = the café's side (front edge on pavement A, facing +z);
// `side: 'b'` = across the road (front edge on pavement B, facing -z). x0..x1 = width along the street.
export type ShopKind = 'books' | 'flowers' | 'lease' | 'coffee' | 'dairy' | 'baking' | 'sweets'
export type Roof = 'gable' | 'mansard' | 'dutch' | 'flat'
// `store`: the ingredient shops sell real coffee and cake ingredients (data/ingredients.ts); the others are neighbours
export type Shop = { kind: ShopKind; name: string; x0: number; x1: number; side: 'a' | 'b'; h: number; wall: string; trim: string; awning: [string, string]; roof: Roof; store?: 'coffee' | 'dairy' | 'baking' | 'sweets'; icon: string }
export const SHOPS: Shop[] = [
  { kind: 'books', name: 'Chapter & Crumb', x0: -57, x1: -43, side: 'a', h: 8.5, wall: '#e3b892', trim: '#8a4f3a', awning: ['#8a4f3a', '#f2e3cf'], roof: 'gable', icon: '📚' },
  { kind: 'flowers', name: 'Petal Post', x0: -41, x1: -29, side: 'a', h: 8.5, wall: '#a8c4d6', trim: '#4f6f8f', awning: ['#e98fa6', '#fbeff2'], roof: 'flat', icon: '🌷' },
  { kind: 'lease', name: 'FOR LEASE', x0: 24, x1: 38, side: 'a', h: 8.5, wall: '#e9d7a8', trim: '#a68a52', awning: ['#e9d7a8', '#e9d7a8'], roof: 'flat', icon: '' },
  { kind: 'coffee', name: 'The Daily Grind', x0: 40, x1: 54, side: 'a', h: 9, wall: '#c9a27e', trim: '#4a2c20', awning: ['#4a2c20', '#f2e3cf'], roof: 'mansard', store: 'coffee', icon: '☕' },
  { kind: 'baking', name: 'Flour & Co.', x0: -57, x1: -44, side: 'b', h: 8.5, wall: '#f1e4cc', trim: '#9a6b3c', awning: ['#9a6b3c', '#fbf3e6'], roof: 'dutch', store: 'baking', icon: '🥖' },
  { kind: 'dairy', name: 'Moo & Oat', x0: 14, x1: 28, side: 'b', h: 8.5, wall: '#cfe4f2', trim: '#3c6f9a', awning: ['#3c6f9a', '#ffffff'], roof: 'gable', store: 'dairy', icon: '🥛' },
  { kind: 'sweets', name: 'Sugar Plum', x0: 30, x1: 43, side: 'b', h: 8.5, wall: '#f6c8d6', trim: '#a63f78', awning: ['#f2c66a', '#fff6e0'], roof: 'dutch', store: 'sweets', icon: '🍬' },
]
export const SHOP_DEPTH = 11
// the little park across the road (left of the side street), the bus stop and the level-1 coffee cart
export const PARK = { x0: -40, x1: -12, z0: STREET.padB[1], z1: STREET.padB[1] + 14 }
export const BUS_STOP = { x: 50, z: STREET.padB[0] + 2.2 }
export const CART = { x: -9, z: STREET.padB[0] + 2.0 }
for (const sh of SHOPS) {
  const z0 = sh.side === 'a' ? STREET.padA[0] - SHOP_DEPTH : STREET.padB[1], z1 = sh.side === 'a' ? STREET.padA[0] : STREET.padB[1] + SHOP_DEPTH
  if (!sh.store) STREET.blockers.push([sh.x0, z0, sh.x1, z1]) // the ingredient shops are hollow: you can walk in (see shopInside)
}
STREET.blockers.push([PARK.x0, PARK.z0, PARK.x1, PARK.z1])                 // the park is fenced (you look over the railings)
STREET.blockers.push([BUS_STOP.x - 2.2, BUS_STOP.z - 0.7, BUS_STOP.x + 2.2, BUS_STOP.z + 0.9])
STREET.blockers.push([CART.x - 1.3, CART.z - 0.8, CART.x + 1.3, CART.z + 0.8])

// the door of a shop, on the pavement (where you stand to go in): the door sits at 0.32 of the width from the centre
export function shopDoor(sh: Shop): [number, number] {
  const cx = (sh.x0 + sh.x1) / 2, dx = (sh.x1 - sh.x0) * 0.32
  return sh.side === 'a' ? [cx + dx, STREET.padA[0] + 1.2] : [cx - dx, STREET.padB[1] - 1.2]
}

// ── shop interiors (the four ingredient shops) ──
// In each shop's own frame: the shopfront is at z = 0 facing the street (+z), the room runs back to z = -SHOP_DEPTH.
export const WALL_T = 0.35, DOOR_W = 1.3, COUNTER_DEPTH = 6.2
export const STORE_SHOPS = SHOPS.filter((s) => s.store)
/** world (x, z) → the shop's local frame (lx along the front, lz into the shop = negative) */
export function toLocal(sh: Shop, x: number, z: number): [number, number] {
  const cx = (sh.x0 + sh.x1) / 2
  return sh.side === 'a' ? [x - cx, z - STREET.padA[0]] : [-(x - cx), -(z - STREET.padB[1])]
}
export function toWorld(sh: Shop, lx: number, lz: number): [number, number] {
  const cx = (sh.x0 + sh.x1) / 2
  return sh.side === 'a' ? [cx + lx, STREET.padA[0] + lz] : [cx - lx, STREET.padB[1] - lz]
}
/** is this point inside the shop's room (between its walls)? */
export function inShop(sh: Shop, x: number, z: number) {
  const [lx, lz] = toLocal(sh, x, z), w = sh.x1 - sh.x0
  return Math.abs(lx) < w / 2 - WALL_T && lz < -WALL_T && lz > -SHOP_DEPTH + WALL_T
}
/** walls (with a gap at the door) and the counter, in the shop's local frame: true = you can't stand here */
export function shopBlocks(sh: Shop, x: number, z: number, r: number) {
  const [lx, lz] = toLocal(sh, x, z), w = sh.x1 - sh.x0, doorX = w * 0.32
  if (Math.abs(lx) > w / 2 + r || lz > r || lz < -SHOP_DEPTH - r) return false          // nowhere near this shop
  if (Math.abs(lx) > w / 2 - WALL_T - r) return true                                     // side walls
  if (lz < -SHOP_DEPTH + WALL_T + r) return true                                         // back wall
  if (lz > -WALL_T - r && Math.abs(lx - doorX) > DOOR_W / 2 - r) return true              // the shopfront, except the doorway
  if (lz < -COUNTER_DEPTH + 0.5 + r && lz > -COUNTER_DEPTH - 0.5 - r && Math.abs(lx) < w * 0.32 + r) return true // the counter
  return false
}
/** where you stand to be served (in front of the counter) and where the shopkeeper stands (behind it) */
export const counterSpot = (sh: Shop) => toWorld(sh, 0, -COUNTER_DEPTH + 1.4)
export const keeperSpot = (sh: Shop) => toWorld(sh, 0, -COUNTER_DEPTH - 1.1)
