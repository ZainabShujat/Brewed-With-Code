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
export type ShopKind = 'books' | 'flowers' | 'lease' | 'records' | 'stationery' | 'laundry' | 'icecream'
export type Shop = { kind: ShopKind; name: string; x0: number; x1: number; side: 'a' | 'b'; h: number; wall: string; trim: string; awning: [string, string] }
export const SHOPS: Shop[] = [
  { kind: 'books', name: 'Chapter & Crumb', x0: -57, x1: -43, side: 'a', h: 8.5, wall: '#e3b892', trim: '#8a4f3a', awning: ['#8a4f3a', '#f2e3cf'] },
  { kind: 'flowers', name: 'Petal Post', x0: -41, x1: -29, side: 'a', h: 7.5, wall: '#a8c4d6', trim: '#4f6f8f', awning: ['#e98fa6', '#fbeff2'] },
  { kind: 'lease', name: 'FOR LEASE', x0: 24, x1: 38, side: 'a', h: 8, wall: '#e9d7a8', trim: '#a68a52', awning: ['#e9d7a8', '#e9d7a8'] },
  { kind: 'records', name: 'Spin City', x0: 40, x1: 54, side: 'a', h: 9, wall: '#c7b6e0', trim: '#5a3f86', awning: ['#5a3f86', '#efe7fa'] },
  { kind: 'stationery', name: 'Inkwell', x0: -57, x1: -44, side: 'b', h: 8, wall: '#d8a7a0', trim: '#7a3b33', awning: ['#7a3b33', '#f7e6e2'] },
  { kind: 'laundry', name: 'Suds & Co.', x0: 14, x1: 28, side: 'b', h: 7.5, wall: '#b8d8cf', trim: '#3f7a6e', awning: ['#3f7a6e', '#eaf6f2'] },
  { kind: 'icecream', name: 'Scoops', x0: 30, x1: 43, side: 'b', h: 7, wall: '#f6c8d6', trim: '#c4527e', awning: ['#f2c66a', '#fff6e0'] },
]
export const SHOP_DEPTH = 11
// the little park across the road (left of the side street), the bus stop and the level-1 coffee cart
export const PARK = { x0: -40, x1: -12, z0: STREET.padB[1], z1: STREET.padB[1] + 14 }
export const BUS_STOP = { x: 50, z: STREET.padB[0] + 2.2 }
export const CART = { x: -9, z: STREET.padB[0] + 2.0 }
for (const sh of SHOPS) {
  const z0 = sh.side === 'a' ? STREET.padA[0] - SHOP_DEPTH : STREET.padB[1], z1 = sh.side === 'a' ? STREET.padA[0] : STREET.padB[1] + SHOP_DEPTH
  STREET.blockers.push([sh.x0, z0, sh.x1, z1])
}
STREET.blockers.push([PARK.x0, PARK.z0, PARK.x1, PARK.z1])                 // the park is fenced (you look over the railings)
STREET.blockers.push([BUS_STOP.x - 2.2, BUS_STOP.z - 0.7, BUS_STOP.x + 2.2, BUS_STOP.z + 0.9])
STREET.blockers.push([CART.x - 1.3, CART.z - 0.8, CART.x + 1.3, CART.z + 0.8])
