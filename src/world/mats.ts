import * as THREE from 'three'
import { C } from '../data/palette'

// One shared material per colour: fewer GPU state changes (UHD 620 friendly).
// Smooth shading by default: soft and toy-like, not faceted.
const cache = new Map<string, THREE.MeshStandardMaterial>()
export function mat(color: string, opts: { flat?: boolean; opacity?: number; emissive?: string; rough?: number } = {}) {
  const key = `${color}|${opts.flat ?? false}|${opts.opacity ?? 1}|${opts.emissive ?? ''}|${opts.rough ?? 0.65}`
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.65,
      metalness: 0,
      flatShading: opts.flat ?? false,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissive ? 0.9 : 0,
    })
    cache.set(key, m)
  }
  return m
}
export const glass = () => mat(C.glass, { opacity: 0.35, rough: 0.1 })
export const glow = (c: string = C.butter) => mat(c, { emissive: c })
