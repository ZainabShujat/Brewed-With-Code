import { useMemo } from 'react'
import * as THREE from 'three'
import { mat } from '../mats'

// Signature details: every model has its own thing (like Kozie's pencil, antenna and gold corners), so each
// townsperson reads as a character, not a box with a face. Positions are relative to the body:
//   paper: centred on the book (top = h/2, front = d/2)   marshmallow: on the base (top = H, radius R)
const gold = mat('#d8b14a', { rough: 0.3 }), ink = mat('#2a1830', { rough: 0.6 }), wood = mat('#9a6b3c', { rough: 0.7 }), plum = mat('#4a2a4e', { rough: 0.6 })
const red = mat('#d8344a', { rough: 0.4 }), leaf = mat('#5fae6e', { rough: 0.7 }), cream = mat('#fff6e6', { rough: 0.8 })

function Pencil({ len = 0.34 }: { len?: number }) {
  return (
    <group>
      <mesh material={mat('#f2c66a', { rough: 0.5 })}><cylinderGeometry args={[0.022, 0.022, len, 6]} /></mesh>
      <mesh position={[0, len / 2 + 0.03, 0]} material={mat('#e8c9a0')}><coneGeometry args={[0.022, 0.06, 6]} /></mesh>
      <mesh position={[0, len / 2 + 0.058, 0]} material={ink}><coneGeometry args={[0.007, 0.018, 6]} /></mesh>
      <mesh position={[0, -len / 2 - 0.02, 0]} material={mat('#ff9db5')}><cylinderGeometry args={[0.022, 0.022, 0.04, 8]} /></mesh>
    </group>
  )
}
function Beret({ c }: { c: string }) {
  return <group rotation={[0, 0, 0.25]}><mesh scale={[1, 0.38, 1]} material={mat(c, { rough: 0.9 })}><sphereGeometry args={[0.2, 18, 12]} /></mesh><mesh position={[0, 0.08, 0]} material={mat(c)}><cylinderGeometry args={[0.012, 0.012, 0.05, 6]} /></mesh></group>
}
function Scarf({ r, c, c2 }: { r: number; c: string; c2: string }) {
  const tex = useMemo(() => { if (typeof document === 'undefined') return null; const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const x = cv.getContext('2d')!
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? c2 : c; x.fillRect(i * 8, 0, 8, 8) } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1); return t }, [c, c2])
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), [tex])
  return <group><mesh rotation={[Math.PI / 2, 0, 0]} material={m}><torusGeometry args={[r, 0.055, 8, 28]} /></mesh><mesh position={[r * 0.55, -0.16, r * 0.75]} rotation={[0.2, 0, 0.15]} material={m}><boxGeometry args={[0.1, 0.28, 0.04]} /></mesh></group>
}
function Star({ c = '#f2c66a', s = 1 }: { c?: string; s?: number }) {
  const geo = useMemo(() => { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.035 : 0.08; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r) } return new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }) }, [])
  return <mesh geometry={geo} scale={s} material={mat(c, { rough: 0.35 })} />
}
function Heart({ c, s = 1 }: { c: THREE.Material; s?: number }) {
  const geo = useMemo(() => { const h = new THREE.Shape(); h.moveTo(0, -0.06); h.bezierCurveTo(-0.09, 0.0, -0.06, 0.08, 0, 0.035); h.bezierCurveTo(0.06, 0.08, 0.09, 0.0, 0, -0.06); return new THREE.ExtrudeGeometry(h, { depth: 0.025, bevelEnabled: false }) }, [])
  return <mesh geometry={geo} scale={s} material={c} />
}

export function PaperAccessory({ model, w, h, d, cover, spine }: { model: string; w: number; h: number; d: number; cover: string; spine: string }) {
  const top = h / 2, front = d / 2
  switch (model) {
    case 'classic': return <group>
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => <mesh key={`${sx}${sy}`} position={[sx * (w / 2 - 0.035), sy * (h / 2 - 0.035), front + 0.004]} rotation={[0, 0, sx * sy > 0 ? 0 : Math.PI / 2]} material={gold}><boxGeometry args={[0.07, 0.07, 0.012]} /></mesh>)}
      <group position={[w / 2 - 0.08, top + 0.05, -0.02]} rotation={[0, 0, -0.5]}><Pencil len={0.3} /></group></group>
    case 'slim': return <group position={[0, top - 0.24, 0]}><Scarf r={Math.max(w, d) * 0.62} c="#e98fa6" c2="#fff6ee" /></group>
    case 'journal': return <group>
      <mesh position={[w * 0.3, -0.05, front + 0.012]} material={gold}><boxGeometry args={[0.07, 0.06, 0.015]} /></mesh>
      <group position={[-w * 0.2, top + 0.06, 0]} rotation={[0, 0, 0.3]}><mesh material={leaf}><cylinderGeometry args={[0.008, 0.008, 0.2, 5]} /></mesh>{[0, 1, 2].map((k) => <mesh key={k} position={[0.02 * (k - 1), 0.1 + k * 0.015, 0]} material={mat(['#e98fa6', '#b9a3ea', '#f2c66a'][k])}><sphereGeometry args={[0.025, 8, 6]} /></mesh>)}</group></group>
    case 'spiral': return <group position={[0, top + 0.02, 0]}>
      <mesh rotation={[0, 0, 0]} material={plum}><torusGeometry args={[w * 0.52, 0.025, 8, 24, Math.PI]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * w * 0.52, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#ff9db5', { rough: 0.5 })}><cylinderGeometry args={[0.075, 0.075, 0.07, 16]} /></mesh>)}</group>
    case 'open': return <group>
      {[[-0.22, 0.25], [0.24, 0.22], [-0.25, -0.22]].map(([x, y], k) => <group key={k} position={[x * w / 0.84, y, 0.075]} rotation={[0, x < 0 ? 0.32 : -0.32, 0]}>{k === 1 ? <Heart c={mat('#e98fa6')} s={0.6} /> : <Star c={k ? '#8ab6d6' : '#f2c66a'} s={0.6} />}</group>)}
      <group position={[w / 2 + 0.16, -0.18, 0.05]} rotation={[0.2, 0, 0.6]}><Pencil len={0.26} /></group></group>
    case 'riffled': return <group position={[w * 0.22, top + 0.12, 0.05]} rotation={[0, 0, 0.3]}><Star c="#ff9db5" s={0.9} /></group>
    case 'sticky': return <group position={[0, top + 0.2, 0]}>{['#ff9db5', '#8ed1b8', '#f2c66a'].map((c, k) => <mesh key={c} position={[(k - 1) * 0.04, k * 0.03, (k - 1) * 0.05]} rotation={[0.3 * (k - 1), 0, (k - 1) * 0.25]} material={mat(c, { rough: 0.8 })}><boxGeometry args={[0.2, 0.16, 0.01]} /></mesh>)}</group>
    case 'composition': return <group position={[0, -h * 0.24, front + 0.02]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.055, 0, 0]} rotation={[0, 0, s * Math.PI / 2]} material={mat(spine, { rough: 0.6 })}><coneGeometry args={[0.045, 0.1, 4]} /></mesh>)}
      <mesh material={mat(spine)}><sphereGeometry args={[0.025, 8, 6]} /></mesh></group>
    case 'pocket': return <group position={[0, top + 0.04, 0]}><Beret c={spine} /></group>
    case 'diary': return <group>
      <group position={[w / 2 + 0.005, -0.06, front - 0.01]}><Heart c={gold} s={0.9} /></group>
      <mesh position={[w / 2 - 0.02, -0.06, 0]} material={mat(spine)}><boxGeometry args={[0.07, 0.07, d + 0.03]} /></mesh></group>
    default: return null
  }
}

export function MallowAccessory({ model, R, H, accent }: { model: string; R: number; H: number; accent: string }) {
  switch (model) {
    case 'classic': return <group position={[0, H * 0.32, 0]}><Scarf r={R + 0.02} c={accent} c2="#ffffff" /></group>
    case 'tall': return <group position={[0, H + 0.02, 0]} rotation={[0, 0, -0.12]}>
      <mesh position={[0, 0.005, 0]} material={plum}><cylinderGeometry args={[R * 0.75, R * 0.75, 0.025, 24]} /></mesh>
      <mesh position={[0, 0.15, 0]} material={plum}><cylinderGeometry args={[R * 0.48, R * 0.5, 0.28, 24]} /></mesh>
      <mesh position={[0, 0.05, 0]} material={mat('#e98fa6')}><cylinderGeometry args={[R * 0.505, R * 0.505, 0.05, 24]} /></mesh></group>
    case 'mini': return <group position={[0, H, 0]}><mesh position={[0, 0.06, 0]} material={leaf}><cylinderGeometry args={[0.01, 0.012, 0.12, 6]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.05, 0.12, 0]} rotation={[0, 0, -s * 0.7]} scale={[1, 0.45, 0.6]} material={leaf}><sphereGeometry args={[0.06, 10, 8]} /></mesh>)}</group>
    case 'cube': return <group position={[R * 0.4, H + 0.12, 0]} rotation={[0, 0, -0.15]}><mesh material={wood}><cylinderGeometry args={[0.008, 0.008, 0.26, 5]} /></mesh><mesh position={[0.05, 0.08, 0]} material={red}><boxGeometry args={[0.1, 0.06, 0.005]} /></mesh></group>
    case 'twist': return <group position={[R + 0.12, H * 0.5, 0.05]} rotation={[0, 0, -0.3]}><mesh position={[0, -0.12, 0]} material={cream}><cylinderGeometry args={[0.008, 0.008, 0.22, 5]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mat('#ff7fb6', { rough: 0.3 })}><cylinderGeometry args={[0.08, 0.08, 0.025, 20]} /></mesh><mesh position={[0, 0, 0.014]} material={mat('#ffffff')}><torusGeometry args={[0.045, 0.01, 6, 16]} /></mesh></group>
    case 'puck': return <group position={[0, H + 0.02, 0]}><Beret c={accent} /></group>
    case 'campfire': return <group position={[0, H * 0.55, 0]} rotation={[0, 0.4, 0.95]}><mesh material={wood}><cylinderGeometry args={[0.018, 0.022, 1.3, 6]} /></mesh></group>
    case 'sprinkled': return <group position={[0, H - 0.02, 0]}><mesh rotation={[0, 0, 0]} material={mat('#ff7fb6')}><torusGeometry args={[R * 0.82, 0.025, 6, 24, Math.PI]} /></mesh>
      <group position={[R * 0.55, R * 0.62, 0]}>{[-1, 1].map((s) => <mesh key={s} position={[s * 0.05, 0, 0]} rotation={[0, 0, s * Math.PI / 2]} material={mat('#ff7fb6')}><coneGeometry args={[0.04, 0.09, 4]} /></mesh>)}</group></group>
    case 'dipped': return <group position={[0, H + 0.06, 0]}><mesh material={red}><sphereGeometry args={[0.07, 14, 12]} /></mesh><mesh position={[0.02, 0.09, 0]} rotation={[0, 0, -0.3]} material={leaf}><cylinderGeometry args={[0.006, 0.006, 0.1, 5]} /></mesh></group>
    case 'swirl': return <group position={[0.08, H + 0.32, 0]} rotation={[0, 0, -0.35]}><mesh material={mat('#e8b06a', { rough: 0.6 })}><boxGeometry args={[0.05, 0.22, 0.03]} /></mesh></group>
    default: return null
  }
}
