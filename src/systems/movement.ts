import { BLOCKERS, H, RR } from '../world/layout'
import { STREET as S, STORE_SHOPS, shopBlocks, inShop, walkable, inPond, ROUND } from '../world/streetLayout'

// Keyboard state for walk mode (WASD / arrows).
export const keys = new Set<string>()
import { folkSpots } from './murmur'
// townsfolk are solid: you can't step INTO one (moving away from one you're touching is always fine)
const FOLK_R = 0.75
function bumpsFolk(x: number, z: number, fx: number, fz: number) { for (const f of folkSpots()) { const d = Math.hypot(f.x - x, f.z - z); if (d < FOLK_R && d < Math.hypot(f.x - fx, f.z - fz)) return true } return false }
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
  window.addEventListener('blur', () => keys.clear())
}

// on-screen joystick (phones): x/y in -1..1
export const stick = { x: 0, y: 0 }
// tap-to-walk (phones, like a life sim): tap the floor and you walk there; any stick / key input takes over
export const goTo = { x: 0, z: 0, on: false }

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
  if (z > S.padB[1] && Math.abs(x) > S.side.pad - R) {                                      // beyond the side street's pavements:
    if (!walkable(x, z, R)) return true                                                            //   only the park and the garden
    if (inPond(x, z) || ROUND.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + R)) return true // not into the water / fountain
  }
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
  if (dx || dz) goTo.on = false // you're steering yourself
  else if (goTo.on) { const ex = goTo.x - p.x, ez = goTo.z - p.z; if (Math.hypot(ex, ez) < 0.3) goTo.on = false; else { dx = ex; dz = ez } }
  p.moving = dx !== 0 || dz !== 0
  if (!p.moving) return
  const len = Math.hypot(dx, dz), speed = 3.2 * (keys.has('shift') ? 1.8 : 1) * dt * Math.min(1, len) // Shift = sprint
  const nx = p.x + (dx / len) * speed, nz = p.z + (dz / len) * speed
  const ox = p.x, oz = p.z
  const solid = (x: number, z: number) => blocked(x, z) || bumpsFolk(x, z, ox, oz)
  if (!solid(nx, p.z)) p.x = nx
  if (!solid(p.x, nz)) p.z = nz
  if (goTo.on && p.x === ox && p.z === oz) goTo.on = false // walked into a wall/table: stop there
  const target = Math.atan2(dx, dz)
  let d = target - p.facing
  d = Math.atan2(Math.sin(d), Math.cos(d))
  p.facing += d * Math.min(1, dt * 12)
}
