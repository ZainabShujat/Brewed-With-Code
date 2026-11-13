import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// "This café is N lines of code": every mesh of the interior pops in one after another,
// floor first in a diagonal sweep, then walls, furniture and props from the ground up.
type Item = { o: THREE.Object3D; s: THREE.Vector3; key: number }
export const cascade = {
  items: [] as Item[],
  start: -1, dur: 10, pop: 0.28, dir: 1 as 1 | -1, // dir -1 = fold away in reverse (for the loop)
  scene: null as THREE.Scene | null,
  prepare() {
    const root = this.scene?.getObjectByName('interior'); if (!root) return 0
    const w = new THREE.Vector3(), box = new THREE.Box3()
    const items: Item[] = []
    root.updateMatrixWorld(true)
    root.traverse((o: any) => {
      if (!o.isMesh) return
      box.setFromObject(o); box.getCenter(w)
      const flat = box.max.y < 0.2 // floor boards + base slab
      // floor sweeps corner to corner first; everything else rises from the ground up
      const key = flat ? (w.x + w.z) * 0.05 : 2 + box.min.y * 1.2 + (w.x + w.z) * 0.02
      // remember the true scale once, so preparing twice never 'remembers' a hidden (0) scale
      if (!o.userData.cs) o.userData.cs = o.scale.clone()
      items.push({ o, s: o.userData.cs, key })
    })
    items.sort((a, b) => a.key - b.key)
    this.items = items
    items.forEach((it) => it.o.scale.setScalar(0.0001))
    this.start = -1
    return items.length
  },
  play(dur: number, dir: 1 | -1 = 1) { this.dur = dur; this.dir = dir; this.start = performance.now() / 1000 },
}

const backOut = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2)

export function CascadeDriver() {
  const { scene } = useThree()
  cascade.scene = scene
  useFrame(() => {
    const c = cascade; if (c.start < 0 || !c.items.length) return
    const t = performance.now() / 1000 - c.start, n = c.items.length
    for (let i = 0; i < n; i++) {
      const it = c.items[i]
      const order = c.dir === 1 ? i : n - 1 - i
      const at = (order / n) * c.dur
      const x = Math.min(1, Math.max(0, (t - at) / c.pop))
      const s = c.dir === 1 ? (x <= 0 ? 0.0001 : backOut(x)) : Math.max(0.0001, 1 - x * x)
      it.o.scale.copy(it.s).multiplyScalar(s)
    }
  })
  return null
}
