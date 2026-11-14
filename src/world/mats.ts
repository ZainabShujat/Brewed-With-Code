import * as THREE from 'three'
import { C } from '../data/palette'
import { brushedTex, marbleTex, plasterTex, woodTex } from './textures'

// One shared material per colour: fewer GPU state changes (UHD 620 friendly).
// "Cozy-realistic" pass: certain palette colours automatically get a real surface
// (wood grain, plaster, marble, brushed steel, glazed ceramic) instead of flat plastic,
// so every existing object picks it up without touching its code.
type Surface = { map?: () => THREE.Texture; rough: number; metal?: number; repeat?: [number, number] }
const SURFACES: Record<string, Surface> = {
  [C.plank1]: { map: woodTex, rough: 0.55 }, [C.plank2]: { map: woodTex, rough: 0.55 },
  [C.plank3]: { map: woodTex, rough: 0.55 }, [C.plank4]: { map: woodTex, rough: 0.55 },
  [C.wood]: { map: woodTex, rough: 0.6 }, [C.woodDark]: { map: woodTex, rough: 0.6 },
  [C.wall]: { map: plasterTex, rough: 0.92, repeat: [3, 1.5] },
  [C.potBody]: { map: plasterTex, rough: 0.88, repeat: [4, 2] },
  [C.counterTop]: { map: marbleTex, rough: 0.28 },
  [C.steel]: { map: brushedTex, rough: 0.32, metal: 0.85 },
  [C.cream]: { rough: 0.3 },   // glazed ceramic: cups, plates, table tops get a soft sheen
  [C.white]: { rough: 0.35 },
}

const cache = new Map<string, THREE.MeshStandardMaterial>()
export function mat(color: string, opts: { flat?: boolean; opacity?: number; emissive?: string; rough?: number } = {}) {
  const key = `${color}|${opts.flat ?? false}|${opts.opacity ?? 1}|${opts.emissive ?? ''}|${opts.rough ?? ''}`
  let m = cache.get(key)
  if (!m) {
    const surf = SURFACES[color]
    let map: THREE.Texture | undefined
    if (surf?.map) { map = surf.map(); if (surf.repeat) { map = map.clone(); map.repeat.set(...surf.repeat); map.needsUpdate = true } }
    m = new THREE.MeshStandardMaterial({
      color,
      map,
      roughness: opts.rough ?? surf?.rough ?? 0.65,
      metalness: surf?.metal ?? 0,
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
