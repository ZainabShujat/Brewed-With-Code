import { COUNTER } from './layout'

// ONE place for every coffee-bar position (counter-local units ≈ metres), built from measurements of the real models,
// so the shot glass, streams, wand and tools can never drift out of line with the machine again.
//
// Measured 18 Nov in the running game: the espresso machine is the Willoughsby lever machine (Sketchfab, fit 0.85,
// rotated π). Its two brew heads ("flasks") sit side by side along z, ±0.275 from the model's centre, and the bottom
// of the spout is 0.28 above the counter top. The grinder is 0.46 wide.
export const TOP = COUNTER.top + 0.1
export const BZ = COUNTER.z - 0.32   // front row (the barista's side)
export const RZ = COUNTER.z + 0.22   // back row (the customer's side)
type V3 = [number, number, number]

export const MACHINE = { x: -0.95, z: COUNTER.z - 0.15 }
export const SPOUT_Y = TOP + 0.28                     // bottom of the brew head's spout
const HEAD_Z = MACHINE.z - 0.275                      // the front brew head (nearest the barista)

export const BAR = {
  machine: [MACHINE.x, TOP, MACHINE.z] as V3,
  grinder: [MACHINE.x - 0.5, TOP, MACHINE.z + 0.3] as V3,
  shot: [MACHINE.x, TOP + 0.06, HEAD_Z] as V3,        // the shot glass, right under the front brew head
  wand: [MACHINE.x + 0.36, TOP, MACHINE.z - 0.2] as V3, // the steam wand off the machine's side; the pitcher sits under it
  cup: [-0.1, TOP + 0.06, COUNTER.z - 0.3] as V3,     // your glass on its coaster
  pitcher: [0.42, TOP + 0.12, BZ] as V3,
  milks: [0.76, 1.0, 1.24],                           // milk bottles (x), front row
  choc: [-0.48, TOP + 0.14, RZ] as V3,
  kettle: [-0.16, TOP + 0.12, RZ] as V3,
  shakers: { cocoa: 0.2, cinnamon: 0.44, sprinkles: 0.68 } as Record<string, number>, // back row (x)
  whip: [0.93, TOP + 0.17, RZ] as V3,
  syrups: [1.1, 1.24],
  shelf: { x: 1.66, stacks: [1.44, 1.66, 1.88] },
  pass: [1.48, TOP + 0.06, BZ] as V3,                // where a finished drink goes (the bell)
}
// the barista's camera frames this workstation (not the whole 5.6 m counter)
export const BAR_VIEW = { x: 0.32, eyeY: 2.75, eyeZ: -9.4, lookY: 1.3, lookZ: -6.95 } // 19 Nov: back + up a touch, so the customer you're serving shows over the (lowered) pastry case
