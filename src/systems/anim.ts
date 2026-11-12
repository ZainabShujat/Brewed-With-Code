import * as THREE from 'three'

// Mutable animation state read every frame (no React re-renders), so reels driven by the
// exporter's virtual clock stay frame-exact. Tweens are advanced by <AnimDriver/> in World.
export const anim = {
  doorOut: 0,          // exterior arch doors: 0 shut → 1 open (outward)
  doorIn: 0,           // interior front doors: 0 shut → 1 open (inward)
  drawers: { fillers: 0, sprinkles: 0, ingredients: 0, food: 0 } as Record<string, number>,
  // Kozie free-roam (vlog). When `free` is false Kozie uses her fixed on-set spots.
  kozie: { free: false, pos: new THREE.Vector3(), s: 1, heading: 0, walking: false, faceCam: true },
  // Camera override. `follow` = trail Kozie like a handheld vlog cam; otherwise glide to pos/look.
  cam: { active: false, follow: false, pos: new THREE.Vector3(), look: new THREE.Vector3(), off: new THREE.Vector3(0, 2.6, 4.2), sway: 1, speed: 3, fov: 62, dist: 1.4 }, // dist: pull every vlog shot further back from its subject
}

type Tw = { set: (v: number) => void; from: number; to: number; t: number; dur: number; ease: (x: number) => number; done?: () => void }
const tweens: Tw[] = []
const smooth = (x: number) => x * x * (3 - 2 * x)

export function tween(get: () => number, set: (v: number) => void, to: number, dur: number, done?: () => void, ease = smooth) {
  tweens.push({ set, from: get(), to, t: 0, dur: Math.max(0.001, dur), ease, done })
}

export function stepTweens(dt: number) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i]
    w.t = Math.min(w.dur, w.t + dt)
    w.set(w.from + (w.to - w.from) * w.ease(w.t / w.dur))
    if (w.t >= w.dur) { tweens.splice(i, 1); w.done?.() }
  }
}

// Kozie walks to (x, z) in `dur` seconds, turning to face where she's going.
export function walkTo(x: number, z: number, dur: number) {
  const k = anim.kozie
  k.walking = true; k.faceCam = false
  k.heading = Math.atan2(x - k.pos.x, z - k.pos.z)
  let left = 2
  const fin = () => { if (--left === 0) { k.walking = false } }
  tween(() => k.pos.x, (v) => (k.pos.x = v), x, dur, fin, (t) => t)
  tween(() => k.pos.z, (v) => (k.pos.z = v), z, dur, fin, (t) => t)
}
