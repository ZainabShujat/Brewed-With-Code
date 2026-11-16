import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Real, scanned/photo-textured CC0 models from Poly Haven (public/assets, see scripts/fetch_assets.py).
// Each use gets its own clone so the same model can sit in many places.
const BIG = new Set(['coffee_table_round_01', 'bar_chair_round_01', 'potted_plant_01'])
type V3 = [number, number, number]
const url = (n: string) => `${(import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL}assets/${n}/model.gltf`

function Inner({ name, scale = 1, pos = [0, 0, 0], rot = [0, 0, 0] }: { name: string; scale?: number | V3; pos?: V3; rot?: V3 }) {
  const { scene } = useGLTF(url(name))
  const obj = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = BIG.has(name); m.receiveShadow = BIG.has(name) } })
    return c
  }, [scene, name])
  return <primitive object={obj} position={pos} rotation={rot} scale={scale} />
}

export function Model(p: { name: string; scale?: number | V3; pos?: V3; rot?: V3 }) {
  return <Suspense fallback={null}><Inner {...p} /></Suspense>
}
