import type { Camera } from 'three'
import { useGame } from './store'
import { WORLD, RR } from '../world/layout'

// Speech bubbles and name tags are HTML drawn on top of everything, so they showed straight through walls:
// café chatter floating over the outside of the teapot, and street / park chatter floating over the café's
// interior. Rule: a bubble shows only when its speaker and the camera are on the same side of the café wall
// (both inside, or both outside). The Dollhouse cuts the walls away, so it shows everyone. Menus show none.
// Speaker positions are layout units; the camera is in world units.
const inCafe = (x: number, z: number) => Math.hypot(x, z) < RR + 0.4
export function bubbleShows(camera: Camera, x: number, z: number, maxDist = Infinity) {
  if ((window as unknown as { __menuIdle?: boolean }).__menuIdle) return false
  const mode = useGame.getState().mode, cx = camera.position.x / WORLD, cz = camera.position.z / WORLD
  if (mode === 'dollhouse') return true
  const camIn = mode === 'pov' || mode === 'cake' || inCafe(cx, cz)
  if (camIn !== inCafe(x, z)) return false
  return Math.hypot(cx - x, cz - z) < maxDist
}
/** hide / show a bubble without fighting drei (it resets its own wrapper's display every frame) */
export function setShown(el: HTMLElement | null | undefined, on: boolean) {
  if (!el) return; const v = on ? '' : 'hidden'; if (el.style.visibility !== v) el.style.visibility = v
}
