import { BLOCKERS, H } from '../world/layout'

// Keyboard state for walk mode (WASD / arrows).
export const keys = new Set<string>()
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
  window.addEventListener('blur', () => keys.clear())
}

const R = 0.35 // barista radius
function blocked(x: number, z: number) {
  if (Math.abs(x) > H - 0.3 - R || Math.abs(z) > H - 0.3 - R) return true
  return BLOCKERS.some(([x0, z0, x1, z1]) => x > x0 - R && x < x1 + R && z > z0 - R && z < z1 + R)
}

// Moves the player; tries each axis separately so you slide along counters instead of sticking.
export function step(p: { x: number; z: number; facing: number; moving?: boolean }, dt: number) {
  let dx = 0, dz = 0
  if (keys.has('w') || keys.has('arrowup')) dz -= 1
  if (keys.has('s') || keys.has('arrowdown')) dz += 1
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1
  if (keys.has('d') || keys.has('arrowright')) dx += 1
  p.moving = dx !== 0 || dz !== 0
  if (!p.moving) return
  const len = Math.hypot(dx, dz), speed = 3.2 * dt
  const nx = p.x + (dx / len) * speed, nz = p.z + (dz / len) * speed
  if (!blocked(nx, p.z)) p.x = nx
  if (!blocked(p.x, nz)) p.z = nz
  const target = Math.atan2(dx, dz)
  let d = target - p.facing
  d = Math.atan2(Math.sin(d), Math.cos(d))
  p.facing += d * Math.min(1, dt * 12)
}
