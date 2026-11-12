import { Html } from '@react-three/drei'
import { C } from '../data/palette'
import { mat, glass, glow } from './mats'
import { PlusSpot } from './PlusSpot'
import { RBox, Puck } from './Soft'
import { ArchWindow, Chalkboard, Clock, PendantLamp, Plant, RoundTable, Rug, Shelf, Stool, StringLights } from './Props'
import { COUNTER, H, PLUS_SPOTS, ROOM, TABLES } from './layout'

const WALL_H = 4.2
const T = 0.3 // wall thickness

// Diorama base + mauve plank floor (like a little dollhouse slab)
function Floor() {
  const n = 14
  return (
    <group>
      <RBox size={[ROOM + 0.5, 0.5, ROOM + 0.5]} pos={[0, -0.26, 0]} color={C.plum} r={0.15} />
      {Array.from({ length: n }, (_, i) => (
        <RBox key={i} size={[ROOM / n - 0.04, 0.08, ROOM]} pos={[-H + (i + 0.5) * (ROOM / n), -0.02, 0]}
          color={i % 2 ? C.wood : C.woodDark} r={0.03} shadow={false} />
      ))}
    </group>
  )
}

function Walls({ cutaway, hideBack }: { cutaway: boolean; hideBack: boolean }) {
  return (
    <group>
      {!hideBack && (
        <group>
          <RBox size={[ROOM + T, WALL_H, T]} pos={[0, WALL_H / 2, -H]} color={C.wall} r={0.1} />
          <RBox size={[ROOM + T, 1.1, 0.08]} pos={[0, 0.6, -H + T / 2]} color={C.wallTrim} r={0.03} />
          <RBox size={[ROOM + T + 0.1, 0.18, T + 0.12]} pos={[0, WALL_H, -H]} color={C.wood} r={0.07} />
        </group>
      )}
      <RBox size={[T, WALL_H, ROOM + T]} pos={[-H, WALL_H / 2, 0]} color={C.wall} r={0.1} />
      <RBox size={[0.08, 1.1, ROOM]} pos={[-H + T / 2, 0.6, 0]} color={C.wallTrim} r={0.03} />
      <RBox size={[T + 0.12, 0.18, ROOM + T + 0.1]} pos={[-H, WALL_H, 0]} color={C.wood} r={0.07} />
      {/* corner post */}
      <RBox size={[0.42, WALL_H + 0.2, 0.42]} pos={[-H, WALL_H / 2, -H]} color={C.wood} r={0.1} />

      <ArchWindow pos={[-H + T / 2 + 0.02, 2.2, 0.6]} rotY={Math.PI / 2} />
      <ArchWindow pos={[-H + T / 2 + 0.02, 2.2, 2.9]} rotY={Math.PI / 2} />
      <StringLights from={[-H + 0.25, WALL_H - 0.1, -H + 0.3]} to={[-H + 0.25, WALL_H - 0.1, H - 0.3]} n={18} />
      {!hideBack && <StringLights from={[-H + 0.3, WALL_H - 0.1, -H + 0.25]} to={[H - 0.3, WALL_H - 0.1, -H + 0.25]} n={18} />}

      {!cutaway && (
        <group>
          <RBox size={[ROOM / 2 - 1.2, WALL_H, T]} pos={[-(ROOM / 4 + 0.6), WALL_H / 2, H]} color={C.wall} r={0.1} />
          <RBox size={[ROOM / 2 - 1.2, WALL_H, T]} pos={[ROOM / 4 + 0.6, WALL_H / 2, H]} color={C.wall} r={0.1} />
          <RBox size={[2.4, 1.0, T]} pos={[0, WALL_H - 0.5, H]} color={C.wall} r={0.1} />
          <RBox size={[1.0, 3.0, 0.1]} pos={[-0.52, 1.5, H]} color={C.purple} r={0.05} />
          <RBox size={[1.0, 3.0, 0.1]} pos={[0.52, 1.5, H]} color={C.purple} r={0.05} />
          <RBox size={[T, WALL_H, ROOM + T]} pos={[H, WALL_H / 2, 0]} color={C.wall} r={0.1} />
        </group>
      )}
    </group>
  )
}

function Kitchen() {
  return (
    <group>
      <RBox size={[1.3, WALL_H, 0.22]} pos={[-3.95, WALL_H / 2, -2.4]} color={C.wall} r={0.08} />
      <RBox size={[0.8, 1.0, 0.22]} pos={[-2.95, WALL_H - 0.5, -2.4]} color={C.wall} r={0.08} />
      <mesh position={[-2.95, WALL_H - 1.0, -2.4]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.wood)}>
        <torusGeometry args={[0.36, 0.06, 8, 16, Math.PI]} />
      </mesh>
      {/* oven, toaster, little sign */}
      <RBox size={[1.0, 1.4, 1.0]} pos={[-4.0, 0.7, -4.0]} color={C.lilac} r={0.12} />
      <RBox size={[0.7, 0.45, 0.06]} pos={[-4.0, 0.7, -3.48]} color={C.plum} r={0.05} />
      <mesh position={[-4.0, 0.7, -3.44]} material={glow(C.peach)}><planeGeometry args={[0.5, 0.25]} /></mesh>
      <RBox size={[0.9, 0.9, 0.7]} pos={[-3.0, 0.45, -4.2]} color={C.counter} r={0.1} />
      <RBox size={[0.55, 0.4, 0.38]} pos={[-3.0, 1.1, -4.2]} color={C.mint} r={0.12} />
      <Html position={[-3.6, 3.1, -2.25]} center className="tag">kitchen</Html>
    </group>
  )
}

function Treats({ w, y }: { w: number; y: number }) {
  const n = Math.floor(w / 0.38)
  const cols = [C.counter, C.butter, C.peach, C.lilac, C.mint]
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + 0.25 + i * 0.38, c = cols[i % cols.length]
        return i % 3 === 0 ? (
          // macaron
          <group key={i} position={[x, y, 0]}>
            <mesh material={mat(c)}><sphereGeometry args={[0.11, 12, 8]} /></mesh>
          </group>
        ) : i % 3 === 1 ? (
          // cupcake
          <group key={i} position={[x, y, 0]}>
            <mesh position={[0, -0.03, 0]} material={mat(C.cream)}><cylinderGeometry args={[0.09, 0.07, 0.1, 12]} /></mesh>
            <mesh position={[0, 0.05, 0]} material={mat(c)}><sphereGeometry args={[0.1, 12, 8]} /></mesh>
            <mesh position={[0, 0.15, 0]} material={mat('#e0405e')}><sphereGeometry args={[0.03, 8, 6]} /></mesh>
          </group>
        ) : (
          // cake slice
          <group key={i} position={[x, y - 0.02, 0]}>
            <RBox size={[0.22, 0.14, 0.16]} color={c} r={0.03} shadow={false} />
            <RBox size={[0.22, 0.04, 0.16]} pos={[0, 0.08, 0]} color={C.cream} r={0.02} shadow={false} />
          </group>
        )
      })}
    </group>
  )
}

function PastryCase({ x, z, w, rot = 0, body = C.purple }: { x: number; z: number; w: number; rot?: number; body?: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <RBox size={[w, 0.95, 0.6]} pos={[0, 0.48, 0]} color={body} r={0.1} />
      <RBox size={[w - 0.1, 0.06, 0.5]} pos={[0, 0.98, 0]} color={C.counterTop} r={0.02} shadow={false} />
      <RBox size={[w, 0.7, 0.6]} pos={[0, 1.32, 0]} material={glass()} r={0.12} shadow={false} />
      <RBox size={[w + 0.04, 0.08, 0.64]} pos={[0, 1.7, 0]} color={C.plum} r={0.04} />
      <Treats w={w} y={1.1} />
    </group>
  )
}

function Counter({ showDrawerTags }: { showDrawerTags: boolean }) {
  const { x0, x1, z, depth, top } = COUNTER
  const w = x1 - x0, cx = (x0 + x1) / 2
  const drawers: [string, number, string][] = [['fillers', 2.2, C.mint], ['sprinkles', 0.8, C.butter], ['ingredients', -0.6, C.lilac], ['food', -2.0, C.peach]]
  return (
    <group>
      <RBox size={[w, top, depth]} pos={[cx, top / 2, z]} color={C.counter} r={0.12} />
      <RBox size={[w + 0.15, 0.1, depth + 0.15]} pos={[cx, top + 0.04, z]} color={C.counterTop} r={0.05} />
      {/* drawers on the barista side = the customisation menu */}
      {drawers.map(([label, x, col]) => (
        <group key={label} position={[x, 0.55, z - depth / 2 - 0.03]}>
          <RBox size={[1.2, 0.7, 0.08]} color={col} r={0.06} />
          <mesh position={[0, 0.18, -0.07]} rotation={[0, 0, Math.PI / 2]} material={mat(C.plum)}>
            <capsuleGeometry args={[0.035, 0.3, 4, 8]} />
          </mesh>
          {showDrawerTags && <Html position={[0, -0.12, -0.12]} center className="tag">{label}</Html>}
        </group>
      ))}
      <CounterTop />
      <PastryCase x={0.25} z={-2.3} w={5.3} />
      <PastryCase x={-3.2} z={-1.65} w={1.5} rot={0.75} body={C.counter} />
    </group>
  )
}

// Barista's left→right facing +z: milk jug, glass, cream, shot glass, espresso machine
function CounterTop() {
  const y = COUNTER.top + 0.1, z = COUNTER.z - 0.1
  return (
    <group>
      <group position={[2.2, y, z]}>
        <mesh position={[0, 0.25, 0]} material={mat(C.steel, { rough: 0.3 })} castShadow><cylinderGeometry args={[0.18, 0.24, 0.5, 18]} /></mesh>
        <mesh position={[0.24, 0.28, 0]} material={mat(C.steel)}><torusGeometry args={[0.11, 0.03, 6, 12]} /></mesh>
      </group>
      <mesh position={[1.3, y + 0.25, z]} material={glass()}><cylinderGeometry args={[0.2, 0.15, 0.5, 18]} /></mesh>
      <group position={[0.4, y, z]}>
        <mesh position={[0, 0.3, 0]} material={mat(C.white)} castShadow><capsuleGeometry args={[0.12, 0.35, 4, 12]} /></mesh>
        <mesh position={[0, 0.62, 0]} material={mat(C.counter)}><coneGeometry args={[0.07, 0.16, 10]} /></mesh>
      </group>
      <mesh position={[-0.4, y + 0.1, z]} material={glass()}><cylinderGeometry args={[0.09, 0.075, 0.2, 14]} /></mesh>
      {/* espresso machine: rounded, chunky */}
      <group position={[-1.6, y, z - 0.05]}>
        <RBox size={[1.3, 1.1, 0.85]} pos={[0, 0.55, 0]} color={C.purple} r={0.2} />
        <RBox size={[1.1, 0.12, 0.7]} pos={[0, 1.16, 0]} color={C.steel} r={0.05} />
        {[-0.3, 0.3].map((x) => (
          <group key={x} position={[x, 0.45, 0.45]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.08, 0.08, 0.2, 12]} /></mesh>
            <mesh position={[0, 0, 0.12]} rotation={[0, 0, Math.PI / 2]} material={mat(C.plum)}><capsuleGeometry args={[0.03, 0.22, 4, 8]} /></mesh>
          </group>
        ))}
        {[-0.35, 0, 0.35].map((x, i) => (
          <mesh key={x} position={[x, 0.85, 0.43]} material={i === 1 ? glow(C.mint) : mat(C.plum)}><sphereGeometry args={[0.06, 10, 8]} /></mesh>
        ))}
        {/* cups warming on top */}
        {[-0.3, 0, 0.3].map((x) => (
          <mesh key={x} position={[x, 1.3, 0]} material={mat(C.cream)}><cylinderGeometry args={[0.09, 0.07, 0.14, 12]} /></mesh>
        ))}
      </group>
    </group>
  )
}

function Fridge() {
  return (
    <group position={[4.1, 0, -4.0]}>
      <RBox size={[1.0, 2.8, 1.0]} pos={[0, 1.4, 0]} color={C.mint} r={0.18} />
      <RBox size={[0.9, 0.04, 0.04]} pos={[0, 1.9, 0.5]} color={C.white} r={0.015} shadow={false} />
      <mesh position={[-0.33, 2.3, 0.53]} material={mat(C.white)}><capsuleGeometry args={[0.03, 0.35, 4, 8]} /></mesh>
      <mesh position={[-0.33, 1.3, 0.53]} material={mat(C.white)}><capsuleGeometry args={[0.03, 0.55, 4, 8]} /></mesh>
      <Plant pos={[0.1, 2.8, 0]} s={0.55} pot={C.counter} />
    </group>
  )
}

function Decor({ hideBack }: { hideBack: boolean }) {
  return (
    <group>
      {!hideBack && (
        <group>
          <Shelf pos={[-1.0, 2.75, -H + 0.35]} w={2.6} />
          <Shelf pos={[2.1, 2.35, -H + 0.35]} w={1.8} />
          <Clock pos={[1.4, 3.35, -H + 0.2]} />
          <Clock pos={[2.3, 3.35, -H + 0.2]} r={0.26} />
          <Chalkboard pos={[3.6, 3.0, -H + 0.2]} />
        </group>
      )}
      <Shelf pos={[-H + 0.35, 3.3, 1.75]} w={1.2} rotY={Math.PI / 2} />
      <PendantLamp pos={[-1.6, WALL_H + 0.1, -1.4]} color={C.counter} />
      <PendantLamp pos={[0.4, WALL_H + 0.1, -1.4]} color={C.purple} />
      <PendantLamp pos={[2.4, WALL_H + 0.1, -1.4]} color={C.counter} />
      <PendantLamp pos={[-2.0, WALL_H + 0.1, 1.5]} color={C.lilac} drop={1.4} />
      <PendantLamp pos={[1.9, WALL_H + 0.1, 2.1]} color={C.lilac} drop={1.4} />
      <Plant pos={[-3.9, 0, -1.6]} s={1.3} />
      <Plant pos={[-3.9, 0, 4.0]} s={1.1} pot={C.counter} />
      <Rug pos={[0, 0.03, 2.0]} r={2.1} />
      {/* bar stools at the angled case */}
      <Stool pos={[3.4, 0, -1.2]} />
      <Stool pos={[3.4, 0, -0.3]} color={C.purple} />
    </group>
  )
}

export function Interior({ cutaway, pov }: { cutaway: boolean; pov: boolean }) {
  return (
    <group>
      <Floor />
      <Walls cutaway={cutaway} hideBack={pov} />
      <Kitchen />
      <Counter showDrawerTags={pov} />
      <Fridge />
      <Decor hideBack={pov} />
      {TABLES.map(([x, z], i) => (
        <group key={x}>
          <RoundTable pos={[x, 0, z]} top={i ? C.cream : C.counterTop} />
          <Stool pos={[x - 0.85, 0, z + 0.2]} color={C.purple} />
          <Stool pos={[x + 0.85, 0, z - 0.2]} color={C.counter} />
        </group>
      ))}
      {PLUS_SPOTS.map(([x, z]) => <PlusSpot key={`${x}${z}`} position={[x, 0, z]} />)}
      <pointLight position={[0, 3.2, 0]} intensity={8} distance={9} color="#ffd7e8" />
    </group>
  )
}

export { Puck }
