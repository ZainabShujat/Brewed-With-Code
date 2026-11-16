import * as THREE from 'three'
import type { Tin } from '../systems/cake'

// Cake tins: round, square or heart. Every cake part (sponge, filling, frosting) uses the same
// outline, so the whole cake takes the tin's shape.

function heartShape(r: number) {
  const s = new THREE.Shape(), k = r / 16.5
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2
    const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    i ? s.lineTo(x * k, (y + 2.5) * k) : s.moveTo(x * k, (y + 2.5) * k) // shifted so the heart sits centred
  }
  return s
}

const cache = new Map<string, THREE.BufferGeometry>()
// a solid cake part of this tin shape: radius r (roughly), height h, centred on y = 0
export function bodyGeo(tin: Tin, r: number, h: number) {
  const key = `${tin}:${r.toFixed(3)}:${h.toFixed(3)}`
  let g = cache.get(key)
  if (g) return g
  if (tin === 'square') g = new THREE.BoxGeometry(r * 1.8, h, r * 1.8)
  else if (tin === 'heart') {
    g = new THREE.ExtrudeGeometry(heartShape(r * 1.12), { depth: h, bevelEnabled: false, curveSegments: 6 })
    g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0) // lie flat; point of the heart faces the front
  } else g = new THREE.CylinderGeometry(r, r, h, 48)
  cache.set(key, g)
  return g
}

// how far the edge is from the centre at angle a (for drips and rosettes round the rim)
export function edge(tin: Tin, a: number, r: number) {
  if (tin === 'square') return (r * 0.9) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)))
  if (tin === 'heart') {
    // sample the heart outline in this direction (approximate: lobes are wider, point is longer)
    const t = a - Math.PI / 2, c = Math.cos(t)
    return r * (0.95 + 0.12 * Math.cos(2 * t) - 0.08 * c)
  }
  return r
}
