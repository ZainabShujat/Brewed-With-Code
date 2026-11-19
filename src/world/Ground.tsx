import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { STREET as S, SHOPS, SHOP_DEPTH, PARK } from './streetLayout'
import { rng } from './folk/specs'
import { quality } from '../ui/Menu'

// Ground that isn't a flat green sheet: a painted grass texture (soft lighter and darker patches, mown-looking
// strokes, little clover and daisy dots), plus real tufts of grass and clumps of flowers scattered over the lawns,
// the township gardens and the forest floor (instanced, so thousands cost one draw call per kind).
function paintGrass() {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N
  const g = c.getContext('2d')!, r = rng(4321)
  g.fillStyle = '#86b86a'; g.fillRect(0, 0, N, N)
  // big soft patches (tile-safe: drawn wrapped)
  const blob = (x: number, y: number, rad: number, col: string) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2) } }
  for (let i = 0; i < 26; i++) blob(r() * N, r() * N, 40 + r() * 110, r() < 0.5 ? 'rgba(150,200,110,.45)' : 'rgba(96,150,78,.42)')
  for (let i = 0; i < 10; i++) blob(r() * N, r() * N, 30 + r() * 50, 'rgba(178,206,120,.35)') // sunny, slightly dry spots
  // grass strokes
  for (let i = 0; i < 5200; i++) { const x = r() * N, y = r() * N, l = 3 + r() * 5, a = -Math.PI / 2 + (r() - 0.5) * 0.9
    g.strokeStyle = r() < 0.5 ? 'rgba(70,128,60,.45)' : 'rgba(170,215,130,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke() }
  // clover + tiny daisies
  for (let i = 0; i < 70; i++) { const x = r() * N, y = r() * N; g.fillStyle = 'rgba(74,140,70,.7)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + Math.cos(k * 2.1) * 2.4, y + Math.sin(k * 2.1) * 2.4, 2.2, 0, 7); g.fill() } }
  for (let i = 0; i < 46; i++) { const x = r() * N, y = r() * N; g.fillStyle = ['#fff8ec', '#ffd6e4', '#fff1a8', '#e6dcff'][i % 4]; g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); g.fillStyle = '#f2c66a'; g.beginPath(); g.arc(x, y, 0.8, 0, 7); g.fill() }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
let _grass: THREE.MeshStandardMaterial | null = null
/** the shared grass material; `tiles` = how many times the painting repeats across a 100 m stretch */
export function grassMat(size: [number, number]) {
  if (!_grass) { _grass = new THREE.MeshStandardMaterial({ map: paintGrass(), roughness: 0.95 }) }
  const m = _grass.clone(); m.map = _grass.map!.clone(); m.map.needsUpdate = true; m.map.repeat.set(size[0] / 9, size[1] / 9); return m
}

// ── scattered tufts + flower clumps (instanced) ──
const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
function onGrass(x: number, z: number) {
  if (z > S.padA[0] - 1 && z < S.padB[1] + 1 && Math.abs(x) < S.X) return false   // the street + pavements
  if (z > S.padB[1] && Math.abs(x) < S.side.pad + 1 && z < S.FRONT) return false  // the side street
  if (Math.hypot(x, z) < 17.5) return false                                         // the café (pot + garden lanterns)
  if (x > PARK.x0 - 0.5 && x < PARK.x1 + 0.5 && z > PARK.z0 - 0.5 && z < PARK.z1 + 0.5) return false
  for (const sh of SHOPS) { const z0 = sh.side === 'a' ? S.padA[0] - SHOP_DEPTH : S.padB[1], z1 = sh.side === 'a' ? S.padA[0] : S.padB[1] + SHOP_DEPTH; if (x > sh.x0 - 1 && x < sh.x1 + 1 && z > z0 - 1 && z < z1 + 1) return false }
  return true
}
function ScatterInner({ file, count, seed, size }: { file: string; count: number; seed: number; size: [number, number] }) {
  const { scene } = useGLTF(`${BASE}assets/${file}`)
  const meshes = useMemo(() => {
    const parts: THREE.Mesh[] = []; scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) parts.push(o as THREE.Mesh) })
    const box = new THREE.Box3().setFromObject(scene), h = box.max.y - box.min.y || 1
    const r = rng(seed), mats: THREE.Matrix4[] = [], q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3()
    let tries = 0
    while (mats.length < count && tries++ < count * 8) {
      const x = -100 + r() * 200, z = -90 + r() * 170
      if (!onGrass(x, z)) continue
      const k = (size[0] + r() * (size[1] - size[0])) / h
      mats.push(new THREE.Matrix4().compose(v.set(x, -box.min.y * k, z), q.setFromEuler(e.set(0, r() * 6.28, 0)), sc.set(k, k, k)))
    }
    return parts.map((p) => { const im = new THREE.InstancedMesh(p.geometry, p.material, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m.clone().multiply(p.matrixWorld))); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; return im })
  }, [scene, count, seed, size])
  return <group>{meshes.map((m, i) => <primitive key={i} object={m} />)}</group>
}
export function GrassScatter() {
  const k = quality.high ? 1 : 0.45
  return (
    <Suspense fallback={null}>
      <ScatterInner file="nature/Grass_Common_Tall.gltf" count={Math.round(900 * k)} seed={11} size={[0.5, 0.9]} />
      <ScatterInner file="nature/Flower_3_Group.gltf" count={Math.round(220 * k)} seed={12} size={[0.35, 0.6]} />
      <ScatterInner file="nature/Flower_4_Group.gltf" count={Math.round(220 * k)} seed={13} size={[0.35, 0.6]} />
      <ScatterInner file="nature/Bush_Common_Flowers.gltf" count={Math.round(60 * k)} seed={14} size={[0.9, 1.5]} />
    </Suspense>
  )
}
