import { BLOCKERS, H, RR } from '../world/layout'
import { STREET as S, STORE_SHOPS, shopBlocks, inShop } from '../world/streetLayout'

// Keyboard state for walk mode (WASD / arrows).
export const keys = new Set<string>()
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
  window.addEventListener('blur', () => keys.clear())
}

// on-screen joystick (phones): x/y in -1..1
export const stick = { x: 0, y: 0 }

const R = 0.35 // barista radius
// Where you can stand. Inside: the round room (flat back wall) minus counters and tables. The front door is a short
// passage through the teapot's thick wall. Outside: the street block, kept clear of the pot's bulge, the glass
// wings and tree trunks, inside the brick walls.
export function blocked(x: number, z: number) {
  const r = Math.hypot(x, z)
  if (Math.abs(x) < 1.15 - R && z > RR - 1.5 && z < S.passage[1] + 1.2) return false               // the doorway passage
  if (r < RR - 0.5 - R) {                                                                         // inside the café
    if (z < -H + 0.3 + R) return true
    return BLOCKERS.some(([x0, z0, x1, z1]) => x > x0 - R && x < x1 + R && z > z0 - R && z < z1 + R)
  }
  for (const sh of STORE_SHOPS) { if (shopBlocks(sh, x, z, R)) return true; if (inShop(sh, x, z)) return false } // inside a shop: only its walls + counter
  if (r < S.potClear + R) return true                                                             // the pot's walls
  if (Math.abs(x) > S.X - 0.5 - R || z < S.BACK + 0.5 + R || z > S.FRONT - 0.5 - R) return true     // the block's walls
  if (z > S.padB[1] && Math.abs(x) > S.side.pad - R) return true                                   // beyond the side street's pavements
  if (S.blockers.some(([x0, z0, x1, z1]) => x > x0 - R && x < x1 + R && z > z0 - R && z < z1 + R)) return true
  return S.trees.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < tr * 0.35 + R)                // trunks, not canopies
}

// Moves the player; tries each axis separately so you slide along counters instead of sticking.
export function step(p: { x: number; z: number; facing: number; moving?: boolean }, dt: number, heading?: number) {
  let dx = 0, dz = 0
  if (heading !== undefined) {
    // first person: W walks where you're looking, A/D strafe
    let f = 0, r = 0
    if (keys.has('w') || keys.has('arrowup')) f += 1
    if (keys.has('s') || keys.has('arrowdown')) f -= 1
    if (keys.has('a')) r -= 1   // A / D sidestep; ← → turn (CameraRig)
    if (keys.has('d')) r += 1
    if (stick.x || stick.y) { r = stick.x; f = -stick.y }
    dx = Math.cos(heading) * r - Math.sin(heading) * f
    dz = -Math.sin(heading) * r - Math.cos(heading) * f
  } else {
    if (keys.has('w') || keys.has('arrowup')) dz -= 1
    if (keys.has('s') || keys.has('arrowdown')) dz += 1
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1
    if (keys.has('d') || keys.has('arrowright')) dx += 1
    if (stick.x || stick.y) { dx = stick.x; dz = stick.y }
  }
  p.moving = dx !== 0 || dz !== 0
  if (!p.moving) return
  const len = Math.hypot(dx, dz), speed = 3.2 * (keys.has('shift') ? 1.8 : 1) * dt * Math.min(1, len) // Shift = sprint
  const nx = p.x + (dx / len) * speed, nz = p.z + (dz / len) * speed
  if (!blocked(nx, p.z)) p.x = nx
  if (!blocked(p.x, nz)) p.z = nz
  const target = Math.atan2(dx, dz)
  let d = target - p.facing
  d = Math.atan2(Math.sin(d), Math.cos(d))
  p.facing += d * Math.min(1, dt * 12)
}
