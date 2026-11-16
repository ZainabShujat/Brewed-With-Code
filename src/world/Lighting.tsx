import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// "Cozy-realistic" lighting, all generated in code (no downloaded HDRIs):
//  • image-based light from a procedural studio room → soft fill + real reflections on glossy things
//  • neutral filmic tone mapping → highlights roll off like a camera, colours stay true
//  • soft PCF shadows from a warm low sun, with bias tuned to avoid shadow acne
export const HQ = typeof location !== 'undefined' && (location.search.includes('embed') || location.search.includes('hq'))

export function Lighting() {
  const { gl, scene } = useThree()
  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping
    gl.toneMappingExposure = HQ ? 0.74 : 1.05 // reels: a touch darker so whites (tiles, plates, frosting) never clip
    gl.shadowMap.type = HQ ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap
    gl.shadowMap.autoUpdate = HQ // game: shadows redraw ~6×/s (below), the biggest GPU saving
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    ;(scene as any).environmentIntensity = HQ ? 0.42 : 0.55
    return () => { env.dispose(); pmrem.dispose(); scene.environment = null }
  }, [gl, scene])
  let n = 0
  useFrame(() => { if (!HQ && ++n % 6 === 0) gl.shadowMap.needsUpdate = true })
  const map = HQ ? 4096 : 1024 // reels render offline, so they can afford sharper shadows
  return (
    <>
      <hemisphereLight args={['#fff1f7', '#7a5a6e', 0.35]} />
      <directionalLight
        position={[14, 20, 9]} intensity={2.3} color="#ffe4cf" castShadow
        shadow-mapSize={[map, map]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={HQ ? 4 : 1}
        shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24}
      />
    </>
  )
}
