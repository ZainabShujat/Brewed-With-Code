import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mat } from '../mats'

// A face, drawn flat on whatever it sits on (facing +z). Every townsperson gets their own: how far apart the eyes
// are, their size and style, where the mouth sits, how wide it is and its shape, the eyebrows, blush, freckles, glasses.
export type EyeStyle = 'dot' | 'oval' | 'happy' | 'sleepy' | 'sparkle' | 'wink'
export type MouthStyle = 'smile' | 'grin' | 'o' | 'cat' | 'flat' | 'open'
export type BrowStyle = 'none' | 'arch' | 'flat' | 'worried' | 'bold'
export type FaceSpec = {
  gap: number; eyeY: number; eyeR: number; eye: EyeStyle
  mouthY: number; mouthW: number; mouth: MouthStyle
  brow: BrowStyle; browY: number; blush: number; freckles: boolean; glasses: boolean; ink: string
}

const white = mat('#ffffff', { rough: 0.4 }), blushM = mat('#ff9db5', { rough: 0.8 }), tongue = mat('#ff7f9e', { rough: 0.6 }), gold = mat('#c9a24a', { rough: 0.3 })
const arc = (r: number, t: number) => new THREE.TorusGeometry(r, t, 6, 16, Math.PI)

function Eye({ f, side }: { f: FaceSpec; side: number }) {
  const ink = mat(f.ink, { rough: 0.5 }), r = f.eyeR
  const style = f.eye === 'wink' ? (side > 0 ? 'happy' : 'dot') : f.eye
  if (style === 'happy') return <mesh rotation={[0, 0, 0]} material={ink} geometry={arc(r * 0.9, r * 0.28)} /> // ^ closed, smiling eyes
  if (style === 'sleepy') return <mesh rotation={[0, 0, Math.PI / 2]} material={ink}><capsuleGeometry args={[r * 0.28, r * 1.3, 3, 8]} /></mesh>
  const sy = style === 'oval' ? 1.45 : 1
  return (
    <group>
      <mesh scale={[1, sy, 0.45]} material={ink}><sphereGeometry args={[r, 14, 10]} /></mesh>
      <mesh position={[r * 0.32, r * 0.38 * sy, r * 0.42]} material={white}><sphereGeometry args={[r * (style === 'sparkle' ? 0.42 : 0.3), 8, 6]} /></mesh>
      {style === 'sparkle' && <mesh position={[-r * 0.3, -r * 0.3, r * 0.42]} material={white}><sphereGeometry args={[r * 0.16, 6, 5]} /></mesh>}
    </group>
  )
}

function Mouth({ f }: { f: FaceSpec }) {
  const ink = mat(f.ink, { rough: 0.5 }), w = f.mouthW
  switch (f.mouth) {
    case 'smile': return <mesh rotation={[0, 0, Math.PI]} material={ink} geometry={arc(w, w * 0.22)} />
    case 'grin': return <group><mesh rotation={[0, 0, Math.PI]} material={ink} geometry={arc(w * 1.25, w * 0.2)} /><mesh position={[0, -w * 0.6, -0.002]} material={tongue}><circleGeometry args={[w * 0.6, 14, Math.PI, Math.PI]} /></mesh></group>
    case 'o': return <mesh material={ink}><torusGeometry args={[w * 0.45, w * 0.16, 6, 14]} /></mesh>
    case 'cat': return <group>{[-1, 1].map((s) => <mesh key={s} position={[s * w * 0.48, 0, 0]} rotation={[0, 0, Math.PI]} material={ink} geometry={arc(w * 0.5, w * 0.17)} />)}</group>
    case 'flat': return <mesh rotation={[0, 0, Math.PI / 2]} material={ink}><capsuleGeometry args={[w * 0.16, w * 1.3, 3, 8]} /></mesh>
    case 'open': return <group><mesh material={ink}><circleGeometry args={[w * 0.8, 16, Math.PI, Math.PI]} /></mesh><mesh position={[0, -w * 0.45, 0.002]} material={tongue}><circleGeometry args={[w * 0.4, 12, Math.PI, Math.PI]} /></mesh></group>
  }
}

function Brow({ f, side }: { f: FaceSpec; side: number }) {
  const ink = mat(f.ink, { rough: 0.5 }), r = f.eyeR
  switch (f.brow) {
    case 'none': return null
    case 'arch': return <mesh material={ink} geometry={arc(r * 1.1, r * 0.2)} />
    case 'flat': return <mesh rotation={[0, 0, Math.PI / 2]} material={ink}><capsuleGeometry args={[r * 0.18, r * 1.4, 3, 8]} /></mesh>
    case 'worried': return <mesh rotation={[0, 0, Math.PI / 2 + side * 0.35]} material={ink}><capsuleGeometry args={[r * 0.18, r * 1.3, 3, 8]} /></mesh>
    case 'bold': return <mesh rotation={[0, 0, Math.PI / 2 - side * 0.12]} material={ink}><capsuleGeometry args={[r * 0.32, r * 1.5, 3, 8]} /></mesh>
  }
}

export function Face({ f, s = 1, z = 0, y = 0, x = 0 }: { f: FaceSpec; s?: number; z?: number; y?: number; x?: number }) {
  const eyes = useRef<THREE.Group[]>([])
  const every = 2.6 + (f.gap * 97 % 1) * 2.4, off = f.eyeR * 211 % every // each face blinks on its own rhythm
  useFrame(({ clock }) => { const t = (clock.elapsedTime + off) % every, k = t < 0.12 ? 0.12 : 1; eyes.current.forEach((e) => { if (e && f.eye !== 'happy' && f.eye !== 'sleepy') e.scale.y = k }) })
  return (
    <group position={[x, y, z]} scale={s}>
      {[-1, 1].map((side, i) => (
        <group key={side}>
          <group position={[side * f.gap, f.eyeY, 0]} ref={(g) => { if (g) eyes.current[i] = g }}><Eye f={f} side={side} /></group>
          <group position={[side * f.gap, f.eyeY + f.browY, 0.002]}><Brow f={f} side={side} /></group>
          {f.blush > 0 && <mesh position={[side * (f.gap + f.eyeR * 1.6), f.eyeY - f.eyeR * 1.9, -0.004]} scale={[1, 0.6, 0.3]} material={blushM}><sphereGeometry args={[0.03 * f.blush, 10, 8]} /></mesh>}
          {f.freckles && [0, 1, 2].map((k) => <mesh key={k} position={[side * (f.gap + f.eyeR * (1.0 + k * 0.5)), f.eyeY - f.eyeR * (1.6 + (k % 2) * 0.4), 0.001]} material={mat('#c98a5a')}><circleGeometry args={[0.0065, 6]} /></mesh>)}
          {f.glasses && <mesh position={[side * f.gap, f.eyeY, 0.012]} material={gold}><torusGeometry args={[f.eyeR * 2.1, 0.006, 6, 20]} /></mesh>}
        </group>
      ))}
      {f.glasses && <mesh position={[0, f.eyeY + f.eyeR * 0.4, 0.012]} rotation={[0, 0, Math.PI / 2]} material={gold}><cylinderGeometry args={[0.005, 0.005, Math.max(0.01, f.gap * 2 - f.eyeR * 4.2), 5]} /></mesh>}
      <group position={[0, f.mouthY, 0.002]}><Mouth f={f} /></group>
    </group>
  )
}
