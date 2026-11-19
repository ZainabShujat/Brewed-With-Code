import { useMemo } from 'react'
import * as THREE from 'three'
import { STREET as S, GARDEN as G, ROUND } from './streetLayout'
import { RBox } from './Soft'
import { mat } from './mats'
import { C } from '../data/palette'
import { rng } from './folk/specs'
import { Instanced, type Spot } from './Ground'
import { Path, forestEdge } from './Terrain'

// Landscaping prototypes (19 Nov), to agree the look before applying it everywhere:
//   · SugarGarden — one building's surroundings: Sugar Plum's side garden (picket fence and gate onto the pavement,
//     stepping stones, a flagstone patio with café tables and a parasol, flower borders, lollipop topiaries, a
//     candy display by the side door, a stone step);
//   · ForestEdge — one stretch of the forest's edge behind the back wall (x −62…2): the treeline wanders, and
//     clusters of ferns, rocks, wildflowers, mushrooms and fallen logs blend the forest floor into the lawn.

const PICKET = mat('#fbe6ee'), SOIL = mat('#6e5038', { rough: 1 })
const by = () => { const m = new Map<string, Spot[]>(); return { m, add: (f: string, s: Spot) => { if (!m.has(f)) m.set(f, []); m.get(f)!.push(s) } } }

function fence(x0: number, z0: number, x1: number, z1: number, gap?: [number, number]) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.32), out: [number, number][] = []
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gap && x > gap[0] && x < gap[1]) continue; out.push([x, z]) }
  return out
}
const PATIO = { x0: 46.4, x1: 52.8, z: 38.4 }
const TABLES: [number, number][] = [[47.8, 38.0], [51.2, 38.9]]
for (const [x, z] of TABLES) ROUND.push([x, z, 0.95])

export function SugarGarden() {
  const pickets = useMemo(() => {
    const pts = [...fence(G.x0 - 1.2, G.z0 + 0.2, G.x1, G.z0 + 0.2, G.gate), ...fence(G.x1 - 0.1, G.z0 + 0.2, G.x1 - 0.1, G.z1 - 0.1), ...fence(G.x0 - 1.2, G.z1 - 0.1, G.x1, G.z1 - 0.1)]
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1.0, 0.05), PICKET, pts.length), m = new THREE.Matrix4()
    pts.forEach(([x, z], i) => { m.makeTranslation(x, 0.5, z); im.setMatrixAt(i, m) }); return im
  }, [])
  const greens = useMemo(() => {
    const r = rng(616), { m, add } = by()
    const FL = ['nature/Flower_3_Group.gltf', 'nature/Flower_4_Group.gltf', 'nature/Bush_Common_Flowers.gltf']
    // borders inside the fence (soil strips, planted in drifts, not in a line)
    for (let x = G.x0 + 0.6; x < G.x1 - 0.6; x += 0.9) { if (x > G.gate[0] - 0.6 && x < G.gate[1] + 0.6) continue; add(FL[r() < 0.2 ? 2 : Math.floor(r() * 2)], { x: x + (r() - 0.5) * 0.4, z: G.z0 + 0.9 + r() * 0.5, h: 0.45 + r() * 0.35, rot: r() * 6.28 }) }
    for (let z = G.z0 + 1.2; z < G.z1 - 0.8; z += 0.9) add(FL[r() < 0.25 ? 2 : Math.floor(r() * 2)], { x: G.x1 - 0.9 - r() * 0.5, z, h: 0.45 + r() * 0.4, rot: r() * 6.28 })
    for (let x = G.x0; x < G.x1 - 0.6; x += 1.0) add(FL[r() < 0.3 ? 2 : Math.floor(r() * 2)], { x, z: G.z1 - 0.9 - r() * 0.4, h: 0.5 + r() * 0.4, rot: r() * 6.28 })
    // stepping stones: gate → patio, patio → the side door
    const stones: [number, number][] = [[56.9, 34.3], [56.2, 35.3], [55.2, 36.2], [54.2, 37.1], [45.5, 39.2], [44.4, 39.4]]
    stones.forEach(([x, z], i) => add(`nature/RockPath_Round_Small_${1 + (i % 3)}.gltf`, { x, z, h: 0.05, rot: r() * 6.28, y: -0.02 }))
    // clover and tufts where feet don't go
    for (let i = 0; i < 26; i++) add(r() < 0.5 ? 'nature/Clover_1.gltf' : 'nature/Grass_Common_Short.gltf', { x: 53.5 + r() * 6.5, z: 39.5 + r() * 4.8, h: 0.2 + r() * 0.2, rot: r() * 6.28 })
    return [...m.entries()]
  }, [])
  return (
    <group>
      <primitive object={pickets} />
      {/* fence rails and the gate (swung open, inward) */}
      {[[G.x0 - 1.2, G.gate[0]], [G.gate[1], G.x1]].flatMap(([a, b]) => [0.3, 0.75].map((y) => <mesh key={a + ':' + y} position={[(a + b) / 2, y, G.z0 + 0.17]} material={PICKET}><boxGeometry args={[b - a, 0.07, 0.04]} /></mesh>))}
      {[0.3, 0.75].map((y) => <mesh key={'e' + y} position={[G.x1 - 0.13, y, (G.z0 + G.z1) / 2]} material={PICKET}><boxGeometry args={[0.04, 0.07, G.z1 - G.z0]} /></mesh>)}
      {[0.3, 0.75].map((y) => <mesh key={'n' + y} position={[(G.x0 - 1.2 + G.x1) / 2, y, G.z1 - 0.13]} material={PICKET}><boxGeometry args={[G.x1 - G.x0 + 1.2, 0.07, 0.04]} /></mesh>)}
      {[G.gate[0], G.gate[1]].map((x) => <mesh key={x} position={[x, 0.65, G.z0 + 0.2]} material={mat('#e98fb0')}><boxGeometry args={[0.18, 1.3, 0.18]} /></mesh>)}
      <group position={[G.gate[0] + 0.1, 0, G.z0 + 0.2]} rotation={[0, -1.25, 0]}>{[0.3, 0.75].map((y) => <mesh key={y} position={[1.3, y, 0]} material={PICKET}><boxGeometry args={[2.6, 0.07, 0.04]} /></mesh>)}{Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0.2 + i * 0.32, 0.5, 0]} material={PICKET}><boxGeometry args={[0.1, 1.0, 0.05]} /></mesh>)}</group>
      {/* soil under the borders */}
      <mesh position={[(G.x0 + G.x1) / 2, 0.025, G.z0 + 1.15]} rotation={[-Math.PI / 2, 0, 0]} material={SOIL}><planeGeometry args={[G.x1 - G.x0 - 0.4, 1.2]} /></mesh>
      <mesh position={[G.x1 - 1.0, 0.025, (G.z0 + G.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={SOIL}><planeGeometry args={[1.1, G.z1 - G.z0 - 1]} /></mesh>
      <mesh position={[(G.x0 + G.x1) / 2 - 0.6, 0.025, G.z1 - 1.0]} rotation={[-Math.PI / 2, 0, 0]} material={SOIL}><planeGeometry args={[G.x1 - G.x0 + 0.6, 1.1]} /></mesh>
      {/* the patio: irregular flagstones */}
      <Path pts={[[PATIO.x0, PATIO.z], [PATIO.x1, PATIO.z]]} w={4.6} kind="flag" tile={3} />
      {TABLES.map(([x, z], k) => (
        <group key={k} position={[x, 0.04, z]}>
          <mesh position={[0, 0.74, 0]} material={mat('#fff6ee')} castShadow><cylinderGeometry args={[0.55, 0.55, 0.05, 20]} /></mesh>
          <mesh position={[0, 0.37, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.05, 0.08, 0.74, 8]} /></mesh>
          {[0, 1, 2].map((c) => { const a = c * 2.1 + k; return <group key={c} position={[Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95]} rotation={[0, -a - Math.PI / 2, 0]}>
            <RBox size={[0.46, 0.06, 0.46]} pos={[0, 0.46, 0]} color="#e98fb0" r={0.03} /><RBox size={[0.46, 0.5, 0.05]} pos={[0, 0.72, -0.22]} color="#e98fb0" r={0.03} />
            {[[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].map(([lx, lz], j) => <mesh key={j} position={[lx, 0.23, lz]} material={mat(C.plum)}><boxGeometry args={[0.04, 0.46, 0.04]} /></mesh>)}</group> })}
          {k === 1 && <group><mesh position={[0, 1.4, 0]} material={mat('#f4efe9')}><cylinderGeometry args={[0.035, 0.035, 2.8, 6]} /></mesh>
            {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 2.62, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]} material={mat(i % 2 ? '#fff6e0' : '#f2c66a', { flat: true })}><coneGeometry args={[1.7, 0.55, 2, 1, true, 0, Math.PI / 4]} /></mesh>)}</group>}
        </group>
      ))}
      {/* lollipop topiaries either side of the gate and at the patio's corners */}
      {[[G.gate[0] - 0.7, G.z0 + 0.9], [G.gate[1] + 0.7, G.z0 + 0.9], [PATIO.x0 - 0.2, 41.4], [PATIO.x1 + 0.4, 41.4]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.2, 0]} material={mat('#f6c8d6')}><cylinderGeometry args={[0.32, 0.26, 0.4, 14]} /></mesh>
          <mesh position={[0, 0.85, 0]} material={mat('#8a5a3c')}><cylinderGeometry args={[0.04, 0.05, 1.0, 6]} /></mesh>
          <mesh position={[0, 1.55, 0]} material={mat('#5fae62')} castShadow><sphereGeometry args={[0.48, 16, 12]} /></mesh>
          {[0, 1, 2, 3, 4].map((j) => <mesh key={j} position={[Math.cos(j * 1.3) * 0.44, 1.55 + Math.sin(j * 2.1) * 0.28, Math.sin(j * 1.3) * 0.44]} material={mat(['#ff8fb5', '#fff6e0', '#c9a6e6'][j % 3])}><sphereGeometry args={[0.07, 6, 5]} /></mesh>)}
        </group>
      ))}
      {/* the side door (on Sugar Plum's east wall), a stone step, and a little candy display */}
      <group position={[S.X * 0 + 43.02, 0, 39.4]}>
        <mesh position={[0.06, 1.15, 0]} material={mat('#a63f78')}><boxGeometry args={[0.1, 2.3, 1.3]} /></mesh>
        <mesh position={[0.09, 1.1, 0]} material={mat('#f6c8d6')}><boxGeometry args={[0.06, 2.1, 1.1]} /></mesh>
        <mesh position={[0.14, 1.1, 0.38]} material={mat(C.butter)}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
        <mesh position={[0.55, 0.08, 0]} material={mat('#d8cfc6')} receiveShadow><boxGeometry args={[0.8, 0.16, 1.6]} /></mesh>
        <group position={[0.75, 0, 1.5]}>
          <RBox size={[0.6, 0.9, 1.2]} pos={[0, 0.45, 0]} color="#c58a4f" r={0.04} />
          {[-0.35, 0, 0.35].map((dz, j) => <mesh key={j} position={[0, 1.05, dz]} material={mat(['#ff8fb5', '#f2c66a', '#9ed8c9'][j], { opacity: 0.85 })}><cylinderGeometry args={[0.13, 0.13, 0.3, 12]} /></mesh>)}
        </group>
      </group>
      {/* a bench by the north fence, looking over the patio */}
      <group position={[57.6, 0.04, G.z1 - 1.0]} rotation={[0, Math.PI, 0]}>
        <RBox size={[1.9, 0.1, 0.5]} pos={[0, 0.48, 0]} color="#fbe6ee" r={0.04} /><RBox size={[1.9, 0.5, 0.08]} pos={[0, 0.8, -0.24]} color="#fbe6ee" r={0.04} />
        {[-0.8, 0.8].map((x) => <mesh key={x} position={[x, 0.24, 0]} material={mat(C.plum)}><boxGeometry args={[0.07, 0.48, 0.44]} /></mesh>)}
      </group>
      {greens.map(([file, items]) => <Instanced key={file} file={file} items={items} />)}
    </group>
  )
}

// ── the forest edge (prototype stretch) ──
export const EDGE_X: [number, number] = [-62, 2]
function Log({ x, z, rot, len }: { x: number; z: number; rot: number; len: number }) {
  return (
    <group position={[x, 0.24, z]} rotation={[0, rot, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={mat('#7a5233')} castShadow><cylinderGeometry args={[0.26, 0.3, len, 10]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[(s * len) / 2 + s * 0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#d9b98a')}><circleGeometry args={[0.27, 10]} /></mesh>)}
      <mesh position={[len * 0.15, 0.22, 0.05]} material={mat('#6f9a4c')}><sphereGeometry args={[0.18, 8, 6]} /></mesh>
    </group>
  )
}
export function ForestEdge() {
  const { groups, logs } = useMemo(() => {
    const r = rng(5353), { m, add } = by(), logs: { x: number; z: number; rot: number; len: number }[] = []
    const put = (files: string[], x: number, z: number, n: number, rad: number, h: [number, number]) => { for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad; add(files[Math.floor(r() * files.length)], { x: x + Math.cos(a) * d, z: Math.min(S.BACK - 0.6, z + Math.sin(a) * d), h: h[0] + r() * (h[1] - h[0]), rot: r() * 6.28 }) } }
    for (let x = EDGE_X[0]; x < EDGE_X[1]; x += 2.6 + r() * 2.4) {
      const z = forestEdge(x) + 1.5 - r() * 4.5, k = r()
      if (k < 0.38) { put(['nature/Fern_1.gltf'], x, z, 6, 1.6, [0.6, 1.1]); put(['nature/Grass_Wispy_Short.gltf'], x, z, 4, 2, [0.4, 0.7]) }                      // a fern patch
      else if (k < 0.62) { put(['nature/Rock_Medium_1.gltf', 'nature/Rock_Medium_2.gltf', 'nature/Rock_Medium_3.gltf'], x, z, 2, 0.8, [0.5, 1.1]); put(['nature/Fern_1.gltf', 'nature/Mushroom_Common.gltf'], x, z, 4, 1.4, [0.25, 0.8]); put(['nature/Pebble_Round_2.gltf', 'nature/Pebble_Round_4.gltf'], x, z, 3, 1.4, [0.12, 0.22]) }
      else if (k < 0.88) { put(['nature/Flower_3_Single.gltf', 'nature/Flower_4_Single.gltf', 'nature/Clover_2.gltf'], x, z + 1.2, 9, 1.8, [0.3, 0.55]) }   // wildflowers at the sunny edge
      else { logs.push({ x, z: z - 1, rot: r() * 3, len: 2.2 + r() * 1.6 }); put(['nature/Mushroom_Common.gltf'], x, z - 1, 4, 1.1, [0.18, 0.35]) }
      if (r() < 0.55) put(['nature/Bush_Common.gltf', 'nature/Bush_Common_Flowers.gltf'], x + 1.2, z - 2.5, 1, 0.5, [1.4, 2.4]) // shrubs just inside the treeline
    }
    return { groups: [...m.entries()], logs }
  }, [])
  return (
    <group>
      {groups.map(([file, items]) => <Instanced key={file} file={file} items={items} />)}
      {logs.map((l, i) => <Log key={i} {...l} />)}
    </group>
  )
}
