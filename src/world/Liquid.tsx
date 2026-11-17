import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Realistic drink parts: built in code (live geometry + PBR materials), not static models ──
// Liquids need to MOVE (fill, ripple, slosh, stream), which no downloaded asset does by itself.

const T = () => performance.now() / 1000

// glossy liquid (coffee / milk / chocolate): physically-based, with a wet clearcoat sheen
export function liquidMat(color: string, opts: { clear?: boolean } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08,
    transparent: !!opts.clear, opacity: opts.clear ? 0.7 : 1,
  })
}

// crema / foam / latte-art textures, painted on a canvas once
function canvasTex(draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s
  draw(c.getContext('2d')!, s); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
const texCache: Record<string, THREE.Texture> = {}
export function surfaceTex(kind: 'crema' | 'foam' | 'art' | 'plain', base: string) {
  const key = kind + base
  return (texCache[key] ??= canvasTex((g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s)
    if (kind === 'crema') {
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + Math.random() * 80},${45 + Math.random() * 40},20,${Math.random() * 0.35})`; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, Math.random() * 3, 0, 7); g.fill() }
      const r = g.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(70,30,10,0.55)'); g.fillStyle = r; g.fillRect(0, 0, s, s)
    } else if (kind === 'foam') {
      for (let i = 0; i < 1400; i++) { g.strokeStyle = `rgba(200,180,160,${Math.random() * 0.25})`; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 0.5 + Math.random() * 2.5, 0, 7); g.stroke() }
    } else if (kind === 'art') {
      g.fillStyle = '#a8703f'; g.fillRect(0, 0, s, s)
      const r = g.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(80,40,15,0.6)'); g.fillStyle = r; g.fillRect(0, 0, s, s)
      g.fillStyle = base; g.beginPath(); const cx = s / 2, cy = s * 0.55, k = s * 0.26
      g.moveTo(cx, cy + k); g.bezierCurveTo(cx - k * 1.6, cy - k * 0.2, cx - k * 0.6, cy - k * 1.3, cx, cy - k * 0.45); g.bezierCurveTo(cx + k * 0.6, cy - k * 1.3, cx + k * 1.6, cy - k * 0.2, cx, cy + k); g.fill()
      g.strokeStyle = '#a8703f'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - k * 0.5); g.lineTo(cx, cy + k * 0.95); g.stroke()
    }
  }))
}

// the drink's top surface: rises as it fills, ripples outward after every pour, sloshes a little
export function Surface({ r, y, tex, last }: { r: number; y: number; tex: THREE.Texture; last: number }) {
  const geo = useMemo(() => new THREE.CircleGeometry(r, 40), [r])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  const ref = useRef<THREE.Mesh>(null), cur = useRef(y)
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 }), [tex])
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return
    cur.current += (y - cur.current) * (1 - Math.exp(-dt * 1.8)); m.position.y = cur.current
    const age = T() - last, amp = age > 0 && age < 4 ? 0.012 * Math.exp(-age * 1.2) : 0
    if (amp === 0 && m.userData.flat) return
    m.userData.flat = amp === 0
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const d = Math.hypot(base[i * 3], base[i * 3 + 1])
      p.setZ(i, amp * Math.sin(d * 60 - age * 14) * (1 - d / r))
    }
    p.needsUpdate = true; geo.computeVertexNormals()
    m.rotation.set(-Math.PI / 2 + Math.sin(age * 9) * amp * 3, 0, Math.cos(age * 7) * amp * 3)
  })
  return <mesh ref={ref} geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} />
}

// a pouring stream that wobbles and necks like real liquid, with droplets splashing where it lands
export function Stream({ color, w, top, bottom, on, x = 0, seed = 0 }: { color: string; w: number; top: number; bottom: number; on: () => number; x?: number; seed?: number }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 12, 24, true), [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  const ref = useRef<THREE.Mesh>(null), drops = useRef<THREE.Group>(null)
  const mat = useMemo(() => liquidMat(color, { clear: color === '#bfe3f2' }), [color])
  useFrame(() => {
    const m = ref.current; if (!m) return
    const k = on(); m.visible = k > 0.01
    if (!m.visible) { if (drops.current) drops.current.visible = false; return }
    if (drops.current) drops.current.visible = true
    const len = (top - bottom) * Math.min(1, k * 1.5), t = T() + seed
    m.position.set(x, top - len / 2, 0); m.scale.set(w, Math.max(0.001, len), w)
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2]
      const along = 0.5 - by
      const neck = (1 - along * 0.45) * (0.85 + 0.15 * Math.sin(along * 25 - t * 30)) * Math.min(1, k)
      p.setXYZ(i, bx * neck + Math.sin(t * 13 + along * 6) * 0.25 * along, by, bz * neck)
    }
    p.needsUpdate = true
    drops.current?.children.forEach((c, i) => {
      const ph = (t * 2.2 + i * 0.37) % 1
      c.visible = k > 0.5
      c.position.set(x + Math.cos(i * 2.1) * ph * 0.09, bottom + Math.sin(ph * Math.PI) * 0.06, Math.sin(i * 2.1) * ph * 0.09)
    })
  })
  return (
    <group>
      <mesh ref={ref} geometry={geo} material={mat} visible={false} />
      <group ref={drops}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} material={mat} visible={false}><sphereGeometry args={[w * 0.35, 6, 4]} /></mesh>)}</group>
    </group>
  )
}

// whipped cream piped as a real spiral that winds up into a peak as it's sprayed
export function WhipSpiral({ y, progress }: { y: number; progress: () => number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const turns = 3.2, N = 220
    for (let i = 0; i <= N; i++) {
      const f = i / N, a = f * turns * Math.PI * 2, rr = 0.15 * (1 - f * 0.92)
      pts.push(new THREE.Vector3(Math.cos(a) * rr, f * 0.24, Math.sin(a) * rr))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, 0.05, 10, false)
  }, [])
  const total = geo.index ? geo.index.count : 0
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#fffaf3', roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5 }), [])
  useFrame(() => {
    const k = progress()
    geo.setDrawRange(0, Math.floor((total * k) / 6) * 6)
    if (ref.current) ref.current.visible = k > 0.01
  })
  return <mesh ref={ref} geometry={geo} material={mat} position={[0, y + 0.01, 0]} scale={[0.72, 0.6, 0.72]} castShadow /> // a neat swirl sized to the glass
}

// a real cup shape: lathe-turned profile with wall thickness, a rolled rim and a foot
export function useCupGeometry() {
  return useMemo(() => {
    const P = (x: number, y: number) => new THREE.Vector2(x, y)
    const prof = [P(0, -0.15), P(0.17, -0.15), P(0.19, -0.13), P(0.2, -0.1), P(0.225, 0.08), P(0.235, 0.15), P(0.245, 0.158), P(0.24, 0.165), P(0.222, 0.15), P(0.21, 0.08), P(0.185, -0.1), P(0.17, -0.12), P(0, -0.12)]
    return new THREE.LatheGeometry(prof, 48)
  }, [])
}
export const ceramic = new THREE.MeshPhysicalMaterial({ color: '#fbf7f2', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide })
