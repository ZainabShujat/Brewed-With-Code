import { useEffect, useRef } from 'react'
import { tickClock } from '../systems/clock'
import { glow } from './mats'
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
    if (!HQ) return // game: no environment map (halves the cost of every pixel on laptop GPUs)
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    ;(scene as any).environmentIntensity = HQ ? 0.42 : 0.55
    return () => { env.dispose(); pmrem.dispose(); scene.environment = null }
  }, [gl, scene])
  let n = 0
  const hemi = useRef<THREE.HemisphereLight>(null), amb = useRef<THREE.AmbientLight>(null), sun = useRef<THREE.DirectionalLight>(null)
  useFrame(() => {
    if (!HQ && ++n % 6 === 0) gl.shadowMap.needsUpdate = true
    if (HQ) return // reels keep their fixed, art-directed light
    // time of day: sky colour, sun height + warmth, and lamps glowing brighter as it gets dark
    const h = tickClock(), k = sky(h)
    if (scene.background instanceof THREE.Color) scene.background.copy(k.sky)
    if (sun.current) { const a = ((h - 6) / 12) * Math.PI; sun.current.position.set(Math.cos(a) * 22, Math.max(2, Math.sin(a) * 22), 9); sun.current.color.copy(k.sun); sun.current.intensity = 2.3 * k.day + 0.25 }
    if (hemi.current) { hemi.current.intensity = 0.55 + 0.7 * k.day; hemi.current.color.copy(k.fill) }
    if (amb.current) amb.current.intensity = 0.2 + 0.15 * k.day
    glow().emissiveIntensity = 1 + 1.6 * (1 - k.day)
  })
  const map = HQ ? 4096 : 1024 // reels render offline, so they can afford sharper shadows
  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff1f7', '#7a5a6e', HQ ? 0.35 : 1.25]} />
      {!HQ && <ambientLight ref={amb} intensity={0.35} color="#ffe9f0" />}
      <directionalLight ref={sun}
        position={[14, 20, 9]} intensity={2.3} color="#ffe4cf" castShadow
        shadow-mapSize={[map, map]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={HQ ? 4 : 1}
        shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24}
      />
    </>
  )
}

// sky keyframes through the day (hour → sky, sun and fill colours); everything in between is blended
const K: [number, string, string, string][] = [
  [0, '#1c2242', '#6f7fb8', '#5a6aa8'], [5, '#2a2c52', '#8a7fb8', '#6a6aa8'], [6.5, '#f3bfae', '#ffb48a', '#f6d2d8'],
  [9, '#dfccf6', '#ffe4cf', '#fff1f7'], [15, '#dfccf6', '#fff0dc', '#fff1f7'], [17.5, '#f6c08e', '#ffb067', '#ffe0cc'],
  [19, '#7a5a8e', '#ff8a6a', '#b896c8'], [20.5, '#262a52', '#7f86c0', '#6a6aa8'], [24, '#1c2242', '#6f7fb8', '#5a6aa8'],
]
const _a = new THREE.Color(), _b = new THREE.Color()
const out = { sky: new THREE.Color(), sun: new THREE.Color(), fill: new THREE.Color(), day: 1 }
function sky(h: number) {
  let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++
  const [h0, ...c0] = K[i], [h1, ...c1] = K[i + 1], t = (h - h0) / (h1 - h0)
  ;(['sky', 'sun', 'fill'] as const).forEach((k, j) => out[k].copy(_a.set(c0[j])).lerp(_b.set(c1[j]), t))
  out.day = h < 5.5 || h > 20.5 ? 0 : h < 7.5 ? (h - 5.5) / 2 : h > 18.5 ? (20.5 - h) / 2 : 1
  return out
}
