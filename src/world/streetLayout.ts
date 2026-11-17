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
  // things you can't walk through outside (x0, z0, x1, z1): the locked glass wings beside the pot
  blockers: [[19.8, -8.9, 34.6, 8.9], [-34.6, -8.9, -19.8, 8.9]] as [number, number, number, number][],
  // tree trunks (x, z, radius)
  trees: [[-56, -14.75, 2.4], [-50, 14.75, 2.0], [56, -17.7, 2.6], [53, 11.8, 2.1], [-23.6, -41.3, 2.6], [26.5, -41.3, 2.8]] as [number, number, number][],
}
