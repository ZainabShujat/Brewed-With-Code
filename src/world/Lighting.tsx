import { useEffect, useRef } from 'react'
import { tickClock } from '../systems/clock'
import { glow, mat } from './mats'
import { C } from '../data/palette'
import { useGame } from '../systems/store'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// "Cozy-realistic" lighting, all generated in code (no downloaded HDRIs):
//  • image-based light from a procedural studio room → soft fill + real reflections on glossy things
//  • neutral filmic tone mapping → highlights roll off like a camera, colours stay true
//  • soft PCF shadows from a warm low sun, with bias tuned to avoid shadow acne
// night-only materials: stars and the warm spill of light from the doorway (faded in by the clock)
const glowTex = (() => { if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,150,1)'); g.addColorStop(0.45, 'rgba(255,190,120,.45)'); g.addColorStop(1, 'rgba(255,170,110,0)')
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c) })()
// shop windows: a warm lit-glass look that brightens after dark (the clock drives it)
export const shopGlass = new THREE.MeshStandardMaterial({ color: '#f3dfc0', emissive: '#ffcf8a', emissiveIntensity: 0.2, roughness: 0.15 })
export const nightGlow = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
const starMat = new THREE.PointsMaterial({ color: '#fff3d6', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })
const starGeo = (() => { const g = new THREE.BufferGeometry(), n = 420, p = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { const u = Math.random(), v = Math.random() * 0.9, th = u * Math.PI * 2, ph = Math.acos(1 - v), r = 160
    p[i * 3] = Math.sin(ph) * Math.cos(th) * r; p[i * 3 + 1] = Math.cos(ph) * r + 6; p[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g })()
// reel pages (reel.html?embed) get the fixed, art-directed HQ light; the real game (index/play, even embedded) keeps the live day/night
export const HQ = typeof location !== 'undefined' && ((location.search.includes('embed') && location.pathname.includes('reel')) || location.search.includes('hq'))

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
    // indoors after dark the lamps are on: warm, cosy fill. Outdoors stays moonlit (walking out on the street = outdoors).
    const g = useGame.getState(), inside = g.mode !== 'exterior' && !((g.mode === 'walk' || g.mode === 'fp') && Math.hypot(g.player.x, g.player.z) > 14.5), dark = 1 - k.day
    if (hemi.current) { hemi.current.intensity = 0.55 + 0.7 * k.day + (inside ? 0.35 * dark : 0); hemi.current.color.copy(k.fill) }
    if (amb.current) {
      if (inside) { amb.current.intensity = 0.2 + 0.15 * k.day + 0.75 * dark; amb.current.color.copy(_a.set('#ffe9f0').lerp(_warm, dark)) }
      else { amb.current.intensity = 0.2 + 0.15 * k.day + 0.3 * dark; amb.current.color.copy(_a.set('#ffe9f0').lerp(_n3, dark)) }
    }
    // after dark the bulbs, string lights and the window glow brighter; the arched windows show the sky outside
    const night = 1 - k.day
    starMat.opacity = Math.max(0, night * 1.2 - 0.2); nightGlow.opacity = night * 0.85
    shopGlass.emissiveIntensity = 0.2 + 1.3 * night
    glow().emissiveIntensity = glow('#ffc4dd').emissiveIntensity = 1 + 1.8 * night
    const win = mat(C.sky, { emissive: '#f4e6ff' }) as THREE.MeshStandardMaterial
    win.emissive.copy(_w.copy(k.sky).lerp(_n, night * 0.35)); win.color.copy(k.sky)
    if (hemi.current) hemi.current.groundColor.copy(_g.set('#7a5a6e').lerp(_n2, night))
  })
  const map = HQ ? 4096 : 1024 // reels render offline, so they can afford sharper shadows
  return (
    <>
      {!HQ && <points geometry={starGeo} material={starMat} frustumCulled={false} />}
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
const _a = new THREE.Color(), _b = new THREE.Color(), _w = new THREE.Color(), _g = new THREE.Color(), _n = new THREE.Color('#0d1030'), _n2 = new THREE.Color('#2a2448'), _n3 = new THREE.Color('#6c78c8'), _warm = new THREE.Color('#ffc890')
const out = { sky: new THREE.Color(), sun: new THREE.Color(), fill: new THREE.Color(), day: 1 }
function sky(h: number) {
  let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++
  const [h0, ...c0] = K[i], [h1, ...c1] = K[i + 1], t = (h - h0) / (h1 - h0)
  ;(['sky', 'sun', 'fill'] as const).forEach((k, j) => out[k].copy(_a.set(c0[j])).lerp(_b.set(c1[j]), t))
  out.day = h < 5.5 || h > 20.5 ? 0 : h < 7.5 ? (h - 5.5) / 2 : h > 18.5 ? (20.5 - h) / 2 : 1
  return out
}
