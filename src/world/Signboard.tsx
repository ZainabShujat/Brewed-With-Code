import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import fontJson from 'three/examples/fonts/helvetiker_bold.typeface.json'
import { mat, glow } from './mats'
import { nightGlow } from './Lighting'
import { useGame } from '../systems/store'
import { STREET as S } from './streetLayout'
import { Instanced } from './Ground'

// "Brewed With Code": the café's own signboard, mounted on the teapot's pink front above the door (19 Nov).
// Built from real geometry (no painted texture): a scalloped plaque (purple frame, pink border, cream panel,
// gold beads), raised plum lettering, a coffee cup with a heart and steam, little flowers and leaves, a </>
// medallion and two small lamps. Everything is modelled flat in "sign space" (x right, y up, z out of the wall)
// and then BENT round the pot's curve (radius R about the pot's vertical axis), so it hugs the wall instead of
// floating in front of it or clipping into it. In the Dollhouse the pot's shell is cut away, so the sign stands on
// two purple posts on the entrance passage instead.
//
// The pot's surface above the door (measured by ray in the running game, layout units): z ≈ 18.13 at y 6.5,
// 18.24 at 7.5, 18.28 at 8.5; at y 7.5 and x 2.5 it is 18.07, i.e. a horizontal circle of radius ≈ 18.25.
const Y0 = 8.1   // the sign's centre in modelling space (bend() moves it up to YC on the wall)
const PLUM = mat('#3d1846'), PURPLE = mat('#5e2a75'), PINK = mat('#f07fa8'), CREAM = mat('#fff1dc', { rough: 0.8 }), GOLD = new THREE.MeshStandardMaterial({ color: '#e8b54a', metalness: 0.55, roughness: 0.35 })
// night: the board lights itself (a backlit cream panel, gold beads like bulbs, a soft pink rim); dark plum letters stay dark
const PANEL = new THREE.MeshStandardMaterial({ color: '#fff1dc', roughness: 0.8, emissive: '#ffe2b0', emissiveIntensity: 0 })
const RIM = new THREE.MeshStandardMaterial({ color: '#f07fa8', roughness: 0.65, emissive: '#ff8fb8', emissiveIntensity: 0 })
const BEAD = new THREE.MeshStandardMaterial({ color: '#e8b54a', metalness: 0.3, roughness: 0.35, emissive: '#ffd27a', emissiveIntensity: 0 })
const LEAF = mat('#7cbf7a'), CUP = mat('#fffaf2', { rough: 0.5 })

// measured surface (layout units): height → distance from the pot's axis
const SURF: [number, number][] = [[6, 18.04], [8, 18.28], [10, 18.19], [12, 17.82], [13, 17.54], [14, 17.18], [15, 16.74], [16, 16.24]]
const surf = (y: number) => { if (y <= SURF[0][0]) return SURF[0][1]; for (let i = 1; i < SURF.length; i++) if (y <= SURF[i][0]) { const [y0, r0] = SURF[i - 1], [y1, r1] = SURF[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0) } return SURF[SURF.length - 1][1] }
// the sign is modelled small (about 7.4 wide around Y0) and blown up K× about its centre, to the reference's size
// (half the teapot's width, top up near the bulbs); depth grows less, so it stays a plaque, not a block
const K = 2.05, KZ = 1.5, YC = 10.0, ZF = 18.85 // the board's back: just in front of the teapot's belt band (max 18.28 + its bulge)
/** sign space → the pot's front: scale about the centre and place it flat in front of the wall */
function bend(g: THREE.BufferGeometry, tx = 0, ty = 0, tz = 0) {
  g.translate(tx, ty, tz)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) * K, y = YC + (p.getY(i) - Y0) * K, z = p.getZ(i) * KZ, zf = ZF + z; p.setXYZ(i, x, y, zf) /* flat and upright, out in front of the wall */ }
  p.needsUpdate = true; g.computeVertexNormals(); return g
}

// ── the plaque outline: a wide rounded board with scalloped top and bottom edges and a raised arch in the middle
//    of the top (where the cup sits). `inset` shrinks it for the inner layers. ──
const W = 7.4, H = 2.3
function plaqueShape(inset: number) {
  const s = new THREE.Shape(), w = W / 2 - inset, h = H / 2 - inset, c = 0.55 - inset * 0.6, sc = 0.16 * (1 - inset / 0.6)
  const archW = 1.05 - inset * 0.5, archH = 0.55 - inset * 0.4
  s.moveTo(-w + c, -h)
  // bottom edge: scallops
  const nB = 9; for (let i = 0; i < nB; i++) { const x0 = -w + c + (i * (2 * (w - c))) / nB, x1 = -w + c + ((i + 1) * (2 * (w - c))) / nB; s.quadraticCurveTo((x0 + x1) / 2, -h - sc, x1, -h) }
  s.quadraticCurveTo(w, -h, w, -h + c)                         // bottom-right corner
  s.bezierCurveTo(w + 0.22 - inset * 0.3, -h * 0.35, w + 0.22 - inset * 0.3, h * 0.35, w, h - c) // a soft outward bulge on the ends
  s.quadraticCurveTo(w, h, w - c, h)                           // top-right corner
  // top edge: scallops, then the arch for the cup in the middle
  const nT = 3; const xa = archW
  for (let i = 0; i < nT; i++) { const x0 = w - c - (i * (w - c - xa)) / nT, x1 = w - c - ((i + 1) * (w - c - xa)) / nT; s.quadraticCurveTo((x0 + x1) / 2, h + sc, x1, h) }
  s.bezierCurveTo(xa * 0.75, h, xa * 0.75, h + archH, 0, h + archH); s.bezierCurveTo(-xa * 0.75, h + archH, -xa * 0.75, h, -xa, h)
  for (let i = 0; i < nT; i++) { const x0 = -xa - (i * (w - c - xa)) / nT, x1 = -xa - ((i + 1) * (w - c - xa)) / nT; s.quadraticCurveTo((x0 + x1) / 2, h + sc, x1, h) }
  s.quadraticCurveTo(-w, h, -w, h - c)                         // top-left corner
  s.bezierCurveTo(-w - 0.22 + inset * 0.3, h * 0.35, -w - 0.22 + inset * 0.3, -h * 0.35, -w, -h + c)
  s.quadraticCurveTo(-w, -h, -w + c, -h)
  return s
}
function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y)
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y); return s
}
const ext = (shape: THREE.Shape, depth: number, bevel: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 })

// the board itself: purple frame → pink border → cream panel, each a little proud of the last, with gold beads
function Plaque() {
  const g = useMemo(() => ({
    frame: bend(ext(plaqueShape(0), 0.5, 0.06), 0, Y0, -0.34), // deep: from the face back to the wall behind the belt
    border: bend(ext(roundRect(W - 0.42, H - 0.36, 0.5), 0.06, 0.03), 0, Y0, 0.2), // clean rounded layers inside the scalloped frame (an inset scallop outline crossed itself)
    panel: bend(ext(roundRect(W - 0.86, H - 0.78, 0.32), 0.04, 0.02), 0, Y0, 0.27), // a clean rounded panel (an inset of the scalloped outline crossed itself)
    beads: (() => { const out: THREE.BufferGeometry[] = []; const n = 14
      for (let i = 0; i <= n; i++) { const x = -W / 2 + 0.55 + (i * (W - 1.1)) / n; if (Math.abs(x) < 1.1) continue; for (const y of [-H / 2 + 0.11, H / 2 - 0.11]) out.push(bend(new THREE.SphereGeometry(0.055, 8, 6), x, Y0 + y, 0.25)) }
      return out })(),
  }), [])
  return (
    <group>
      <mesh geometry={g.frame} material={PURPLE} castShadow />
      <mesh geometry={g.border} material={RIM} />
      <mesh geometry={g.panel} material={PANEL} />
      {g.beads.map((b, i) => <mesh key={i} geometry={b} material={BEAD} />)}
    </group>
  )
}

// raised lettering, centred on the panel (rounded by a generous bevel)
const FONT = new FontLoader().parse(fontJson as never)
function textGeo(t: string, size: number, depth: number) {
  const g = new TextGeometry(t, { font: FONT, size, depth, curveSegments: 5, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.022, bevelSegments: 2 } as never)
  g.computeBoundingBox(); const b = g.boundingBox!; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0); return g
}
function Lettering() {
  const g = useMemo(() => bend(textGeo('Brewed With Code', 0.47, 0.07), 0, Y0 - 0.06, 0.32), [])
  return <mesh geometry={g} material={PLUM} castShadow />
}

// the coffee cup in the top arch: a cup, a saucer, a pink heart on its side, three curls of steam
function CupEmblem() {
  const g = useMemo(() => {
    const y = Y0 + H / 2 + 0.05, z = 0.4
    const cup = new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.27, 0.06], [0.3, 0.36], [0.3, 0.4], [0.27, 0.4], [0.25, 0.08], [0, 0.08]].map(([x, yy]) => new THREE.Vector2(x, yy)), 20)
    const saucer = new THREE.CylinderGeometry(0.42, 0.34, 0.05, 22)
    const handle = new THREE.TorusGeometry(0.11, 0.035, 8, 14, Math.PI * 1.3)
    const heart = new THREE.Shape(); heart.moveTo(0, -0.1); heart.bezierCurveTo(-0.16, 0.02, -0.12, 0.13, 0, 0.06); heart.bezierCurveTo(0.12, 0.13, 0.16, 0.02, 0, -0.1)
    const steam = [-0.12, 0, 0.12].map((dx, i) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0], [0.05, 0.12], [-0.04, 0.24], [0.03, 0.36]].map(([sx, sy]) => new THREE.Vector3(dx + sx, sy + (i === 1 ? 0.04 : 0), 0))), 16, 0.022, 6))
    return {
      cup: bend(cup, 0, y - 0.32, z), saucer: bend(saucer, 0, y - 0.33, z),
      handle: bend(handle.rotateZ(-Math.PI * 0.65), 0.33, y - 0.13, z),
      heart: bend(new THREE.ExtrudeGeometry(heart, { depth: 0.03, bevelEnabled: false }), 0, y - 0.13, z + 0.3),
      steam: steam.map((s) => bend(s, 0, y + 0.12, z)),
    }
  }, [])
  return (
    <group>
      <mesh geometry={g.saucer} material={CUP} /><mesh geometry={g.cup} material={CUP} castShadow /><mesh geometry={g.handle} material={CUP} />
      <mesh geometry={g.heart} material={PINK} />
      {g.steam.map((s, i) => <mesh key={i} geometry={s} material={mat('#fff6ee', { opacity: 0.85 })} />)}
    </group>
  )
}

// little cream / blush flowers with gold hearts and soft green leaves, tucked on the corners
function Flower({ x, y, k = 1, petal = '#fff6ee' }: { x: number; y: number; k?: number; petal?: string }) {
  const g = useMemo(() => ({
    petals: Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI * 2; return bend(new THREE.SphereGeometry(0.11 * k, 10, 8).scale(1, 0.7, 0.45), x + Math.cos(a) * 0.12 * k, y + Math.sin(a) * 0.12 * k, 0.36) }),
    heart: bend(new THREE.SphereGeometry(0.065 * k, 10, 8), x, y, 0.42),
  }), [x, y, k])
  return <group>{g.petals.map((p, i) => <mesh key={i} geometry={p} material={mat(petal)} />)}<mesh geometry={g.heart} material={GOLD} /></group>
}
function Leaf({ x, y, rot, k = 1 }: { x: number; y: number; rot: number; k?: number }) {
  const g = useMemo(() => { const l = new THREE.SphereGeometry(0.16 * k, 10, 6).scale(1, 0.42, 0.25); l.rotateZ(rot); return bend(l, x, y, 0.33) }, [x, y, rot, k])
  return <mesh geometry={g} material={LEAF} />
}
function Garnish() {
  const ends: [number, number][] = [[-1, 1], [1, 1], [-1, -1], [1, -1]]
  return (
    <group>
      {ends.map(([sx, sy], i) => { const x = sx * (W / 2 - 0.75), y = Y0 + sy * (H / 2 - 0.12)
        return <group key={i}>
          <Flower x={x} y={y} k={1.1} petal={i % 2 ? '#ffd3e2' : '#fff6ee'} />
          <Flower x={x - sx * 0.42} y={y - sy * 0.05} k={0.75} petal={i % 2 ? '#fff6ee' : '#ffd3e2'} />
          <Leaf x={x + sx * 0.36} y={y + sy * 0.05} rot={sx * 0.5} />
          <Leaf x={x - sx * 0.2} y={y - sy * 0.26} rot={-sx * 0.9} k={0.85} />
          <Leaf x={x - sx * 0.78} y={y + sy * 0.08} rot={sx * 2.6} k={0.8} />
        </group> })}
    </group>
  )
}

// the </> medallion hanging under the board's centre
function Medallion() {
  const g = useMemo(() => {
    const y = Y0 - H / 2 - 0.12
    return {
      disc: bend(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 30).rotateX(Math.PI / 2), 0, y, 0.25),
      rim: bend(new THREE.TorusGeometry(0.46, 0.04, 8, 30), 0, y, 0.31),
      code: bend(textGeo('</>', 0.32, 0.05), 0, y, 0.33),
    }
  }, [])
  return <group><mesh geometry={g.disc} material={PURPLE} castShadow /><mesh geometry={g.rim} material={GOLD} /><mesh geometry={g.code} material={mat('#fff1dc')} /></group>
}

// two small brass lamps at the ends, glowing with the rest of the town's lights after dark
function SignLamps() {
  const g = useMemo(() => [-1, 1].map((sx) => { const x = sx * (W / 2 + 0.3), y = Y0 + 0.3
    return {
      arm: bend(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6).rotateX(Math.PI / 2), x, y + 0.42, 0.25),
      cap: bend(new THREE.ConeGeometry(0.2, 0.18, 6), x, y + 0.56, 0.5),
      bulb: bend(new THREE.BoxGeometry(0.22, 0.28, 0.22), x, y + 0.33, 0.5),
      plate: bend(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12).rotateX(Math.PI / 2), x, y + 0.42, 0.02),
    } }), [])
  return <group>{g.map((l, i) => <group key={i}><mesh geometry={l.plate} material={GOLD} /><mesh geometry={l.arm} material={GOLD} /><mesh geometry={l.cap} material={PURPLE} /><mesh geometry={l.bulb} material={glow()} /></group>)}</group>
}

// Dollhouse: the shell is cut away, so the sign stands on two posts standing either side of the door
function Posts() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) ref.current.visible = useGame.getState().mode === 'dollhouse' })
  return (
    <group ref={ref} visible={false}>
      {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 5.5, 3.9, 18.5]} material={PURPLE} castShadow><cylinderGeometry args={[0.16, 0.22, 7.8, 10]} /></mesh>)}
    </group>
  )
}

// big flower planters either side of the door (like the reference): terracotta pots of flowering bushes
const PLANT_X = 3.3, PLANT_Z = 19.4
for (const sx of [-1, 1]) S.trees.push([sx * PLANT_X, PLANT_Z, 1.7]) // solid (trunk-style blocker, radius ≈ 0.6)
function DoorPlanters() {
  const pot = useMemo(() => new THREE.LatheGeometry([[0, 0], [0.42, 0], [0.5, 0.08], [0.62, 0.8], [0.7, 0.86], [0.7, 0.96], [0.58, 0.96], [0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y)), 22), [])
  const items = useMemo(() => [-1, 1].flatMap((sx) => [
    { x: sx * PLANT_X, z: PLANT_Z, h: 1.5, y: 0.85, rot: sx },
    { x: sx * PLANT_X + 0.22, z: PLANT_Z - 0.15, h: 0.9, y: 0.9, rot: sx * 2 },
  ]), [])
  return (
    <group>
      {[-1, 1].map((sx) => <group key={sx} position={[sx * PLANT_X, 0, PLANT_Z]}><mesh geometry={pot} material={mat('#c9774f', { rough: 0.85 })} castShadow /><mesh position={[0, 0.91, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#5a3d2b')}><circleGeometry args={[0.6, 20]} /></mesh></group>)}
      <Instanced file="nature/Bush_Common_Flowers.gltf" items={items} />
    </group>
  )
}

function NightGlow() {
  useFrame(() => { const n = nightGlow.opacity / 0.85; PANEL.emissiveIntensity = n * 0.75; RIM.emissiveIntensity = n * 0.35; BEAD.emissiveIntensity = n * 1.6 })
  return null
}
export function Signboard() {
  // sign space has its origin on the wall (x 0, the pot's axis R behind it): move it out to the pot's front
  return (
    <group>
      <Plaque /><Lettering /><CupEmblem /><Garnish /><Medallion /><SignLamps /><Posts /><DoorPlanters /><NightGlow />
    </group>
  )
}
export const SIGN_FRONT = S.passage[1] // (for reference: the door's outer face is just below the sign)
