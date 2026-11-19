import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Real models: CC0 from Poly Haven (public/assets/<name>/model.gltf) and CC-BY from Sketchfab
// (public/assets/sketchfab/<name>/scene.gltf, credited in src/data/credits.ts).
// Each use gets its own clone. `fit` = scale the model so it is exactly this tall, sitting on y = 0,
// centred in x/z (Sketchfab models arrive in all sorts of units and offsets).
type V3 = [number, number, number]
const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
const url = (n: string) => n.startsWith('sf:') ? `${BASE}assets/sketchfab/${n.slice(3)}/scene.gltf` : `${BASE}assets/${n}/model.gltf`
const BIG = new Set(['coffee_table_round_01', 'bar_chair_round_01', 'potted_plant_01', 'sf:espresso', 'sf:table'])
const _b = new THREE.Box3(), _s = new THREE.Vector3(), _c = new THREE.Vector3()

type P = { name: string; scale?: number | V3; pos?: V3; rot?: V3; fit?: number }
function Inner({ name, scale = 1, pos = [0, 0, 0], rot = [0, 0, 0], fit }: P) {
  const { scene } = useGLTF(url(name))
  const obj = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = BIG.has(name); m.receiveShadow = BIG.has(name) } })
    // the espresso machine is all metal in its texture, and with no environment map (the game skips it to save the
    // GPU) metal has nothing to reflect, so it rendered almost black: make it a glossy non-metal, a touch lifted
    if (name === 'sf:espresso') c.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial, k = src.clone(); k.metalnessMap = null; k.metalness = 0.15; k.roughness = 0.42
      k.emissive = new THREE.Color('#3a2a33'); k.emissiveMap = src.map; k.emissiveIntensity = 0.55; m.material = k })
    if (!fit) return c
    // normalise: measure, then wrap so the model is `fit` tall with its base at 0 and centred
    c.updateMatrixWorld(true); _b.setFromObject(c); _b.getSize(_s); _b.getCenter(_c)
    const k = fit / Math.max(1e-6, _s.y)
    const wrap = new THREE.Group(); c.position.set(-_c.x, -_b.min.y, -_c.z); wrap.add(c); wrap.scale.setScalar(k)
    return wrap
  }, [scene, name, fit])
  return <group position={pos} rotation={rot} scale={scale}><primitive object={obj} /></group>
}

export function Model(p: P) {
  return <Suspense fallback={null}><Inner {...p} /></Suspense>
}
