import { Html } from '@react-three/drei'
import { C } from '../data/palette'
import { mat, glass, glow } from './mats'
import { PlusSpot } from './PlusSpot'
import { RBox, Puck } from './Soft'
import { Reveal } from './Reveal'
import { Bar } from './Bar'
import { Swing, Slide } from './Swing'
import { useGame } from '../systems/store'
import { ArchWindow, Chalkboard, Clock, PendantLamp, Plant, RoundTable, Rug, Shelf, Stool, StringLights } from './Props'
import { BACK_DZ, COUNTER, FRIDGE_DX, FRIDGE_DZ, H, KITCHEN_DX, KITCHEN_DZ, PLUS_SPOTS, ROOM, TABLES, WALL_H } from './layout'

const T = 0.3 // wall thickness

// Diorama base + mauve plank floor (like a little dollhouse slab)
// staggered planks: every 1 m row is cut into boards of 2.5 to 4.5 m, offset row to row (deterministic, no Math.random)
// furniture scale: matches the ~2 m customers/barista and the 1.7 m Kozie
const FURN = 1.3

const PLANKS = (() => {
  const out: { x: number; z: number; len: number; c: string }[] = []
  const cols = [C.plank1, C.plank2, C.plank3, C.plank4]
  const rows = ROOM, w = ROOM / rows
  for (let i = 0; i < rows; i++) {
    let z = -H, k = 0
    const first = 1 + ((i * 7) % 5) * 0.6            // stagger the first board in each row
    while (z < H - 0.01) {
      const want = k === 0 ? first : 2.5 + ((i * 13 + k * 5) % 5) * 0.5
      const len = Math.min(want, H - z)
      out.push({ x: -H + (i + 0.5) * w, z: z + len / 2, len, c: cols[(i * 3 + k) % 4] })
      z += len; k++
    }
  }
  return out
})()

function Floor() {
  return (
    <group>
      <RBox size={[ROOM + 0.5, 0.5, ROOM + 0.5]} pos={[0, -0.22, 0]} color={C.plum} r={0.15} />
      {PLANKS.map((p, i) => (
        <RBox key={i} size={[ROOM / ROOM - 0.05, 0.08, p.len - 0.05]} pos={[p.x, 0.05, p.z]} color={p.c} r={0.025} shadow={false} />
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

      <ArchWindow pos={[-H + T / 2 + 0.02, 2.4, -2.0]} rotY={Math.PI / 2} />
      <ArchWindow pos={[-H + T / 2 + 0.02, 2.4, 1.8]} rotY={Math.PI / 2} />
      <ArchWindow pos={[-H + T / 2 + 0.02, 2.4, 5.6]} rotY={Math.PI / 2} />
      <StringLights from={[-H + 0.25, WALL_H - 0.1, -H + 0.3]} to={[-H + 0.25, WALL_H - 0.1, H - 0.3]} n={18} />
      {!hideBack && <StringLights from={[-H + 0.3, WALL_H - 0.1, -H + 0.25]} to={[H - 0.3, WALL_H - 0.1, -H + 0.25]} n={18} />}

      {!cutaway && (
        <group>
          <RBox size={[ROOM / 2 - 1.2, WALL_H, T]} pos={[-(ROOM / 4 + 0.6), WALL_H / 2, H]} color={C.wall} r={0.1} />
          <RBox size={[ROOM / 2 - 1.2, WALL_H, T]} pos={[ROOM / 4 + 0.6, WALL_H / 2, H]} color={C.wall} r={0.1} />
          <RBox size={[2.4, 1.0, T]} pos={[0, WALL_H - 0.5, H]} color={C.wall} r={0.1} />
          {/* front doors swing inward (anim.doorIn) */}
          <Swing pos={[-1.04, 0, H]} dir={1} src="doorIn"><RBox size={[1.0, 3.0, 0.1]} pos={[0.52, 1.5, 0]} color={C.purple} r={0.05} /></Swing>
          <Swing pos={[1.04, 0, H]} dir={-1} src="doorIn"><RBox size={[1.0, 3.0, 0.1]} pos={[-0.52, 1.5, 0]} color={C.purple} r={0.05} /></Swing>
          {/* the café ceiling: soft plaster with mauve wood beams */}
          <RBox size={[ROOM + T, 0.16, ROOM + T]} pos={[0, WALL_H + 0.12, 0]} color={C.wall} r={0.05} shadow={false} />
          {[-8, -4, 0, 4, 8].map((z) => <RBox key={z} size={[ROOM, 0.28, 0.32]} pos={[0, WALL_H - 0.08, z]} color={C.wood} r={0.08} shadow={false} />)}
          <StringLights from={[H - 0.25, WALL_H - 0.1, -H + 0.3]} to={[H - 0.25, WALL_H - 0.1, H - 0.3]} n={18} />
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
      <RBox size={[0.4, WALL_H, 0.22]} pos={[-4.75, WALL_H / 2, -2.4]} color={C.wall} r={0.08} />
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
      {!useGame((s) => s.mode === 'outro') && <Html position={[-3.6, 3.1, -2.25]} center className="tag">kitchen</Html>}
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
        <group key={label} position={[x, 0.55, z - depth / 2 - 0.03]}><Slide id={label}>
          <RBox size={[1.2, 0.7, 0.08]} color={col} r={0.06} />
          {/* drawer body + contents, seen when it slides open */}
          <RBox size={[1.1, 0.5, 0.55]} pos={[0, -0.02, 0.3]} color={C.counterTop} r={0.04} shadow={false} />
          {[-0.3, 0, 0.3].map((dx, i) => <mesh key={dx} position={[dx, 0.25, 0.3]} material={mat([C.counter, C.butter, C.mint, C.lilac][(i + label.length) % 4])}><sphereGeometry args={[0.13, 10, 8]} /></mesh>)}
          <mesh position={[0, 0.18, -0.07]} rotation={[0, 0, Math.PI / 2]} material={mat(C.plum)}>
            <capsuleGeometry args={[0.035, 0.3, 4, 8]} />
          </mesh>
          {showDrawerTags && <Html position={[0, -0.12, -0.12]} center className="tag">{label}</Html>}
        </Slide></group>
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
          <Shelf pos={[-1.6, 3.1, -H + 0.35]} w={2.6} />
          <Shelf pos={[2.4, 2.6, -H + 0.35]} w={1.8} />
          <Shelf pos={[-8.4, 3.4, -H + 0.35]} w={1.6} />
          <Clock pos={[5.0, 3.7, -H + 0.2]} />
          <Clock pos={[6.1, 3.7, -H + 0.2]} r={0.26} />
          <Chalkboard pos={[5.6, 2.3, -H + 0.2]} />
        </group>
      )}
      <Shelf pos={[-H + 0.35, 3.8, -0.1]} w={1.2} rotY={Math.PI / 2} />
      <Shelf pos={[-H + 0.35, 3.8, 3.7]} w={1.4} rotY={Math.PI / 2} />
      {/* lamps over the counter */}
      <PendantLamp pos={[-1.6, WALL_H + 0.1, -6.2]} color={C.counter} drop={0.9} />
      <PendantLamp pos={[0.4, WALL_H + 0.1, -6.2]} color={C.purple} drop={0.9} />
      <PendantLamp pos={[2.4, WALL_H + 0.1, -6.2]} color={C.counter} drop={0.9} />
      {/* one lamp per table */}
      {TABLES.map(([x, z], i) => <PendantLamp key={x} pos={[x, WALL_H + 0.1, z]} color={i % 2 ? C.counter : C.lilac} drop={0.8} />)}
      <Plant pos={[-9.2, 0, -3.8]} s={1.3} />
      <Plant pos={[-9.2, 0, 9.2]} s={1.1} pot={C.counter} />
      <Plant pos={[9.2, 0, -4.2]} s={1.2} pot={C.lilac} />
      <Plant pos={[9.2, 0, 9.2]} s={0.9} pot={C.mint} />
      <Rug pos={[-0.8, 0.1, -1.2]} r={2.4} />
      <Rug pos={[0.4, 0.1, 4.8]} r={2.8} color={C.counter} />
      {/* bar stools along the side of the counter */}
      <group position={[4.2, 0, -7.6]} scale={FURN}><Stool pos={[0, 0, 0]} /></group>
      <group position={[4.2, 0, -6.2]} scale={FURN}><Stool pos={[0, 0, 0]} color={C.purple} /></group>
    </group>
  )
}

export function Interior({ cutaway, pov }: { cutaway: boolean; pov: boolean }) {
  return (
    <group name="interior">
      <Reveal id="floor"><Floor /></Reveal>
      <Reveal id="walls"><Walls cutaway={cutaway} hideBack={pov} /></Reveal>
      <Reveal id="kitchen" at={[-8.5, 0, -8.5]}><group position={[KITCHEN_DX, 0, KITCHEN_DZ]}><Kitchen /></group></Reveal>
      <Reveal id="counter" at={[0.2, 0, -7.2]}><group position={[0, 0, BACK_DZ]}><Counter showDrawerTags={pov} /><Bar /></group></Reveal>
      <Reveal id="fridge" at={[9.5, 0, -9.4]}><group position={[FRIDGE_DX, 0, FRIDGE_DZ]}><Fridge /></group></Reveal>
      <Reveal id="decor"><Decor hideBack={pov} /></Reveal>
      {TABLES.map(([x, z], i) => (
        <Reveal key={x} id="tables" at={[x, 0, z]}>
          {/* FURN: tables + stools sized for ~2 m characters (table ~1.05 m, seat ~0.8 m) */}
          <group position={[x, 0, z]} scale={FURN}>
            <RoundTable pos={[0, 0, 0]} top={i ? C.cream : C.counterTop} />
            <Stool pos={[-0.95, 0, 0.2]} color={C.purple} />
            <Stool pos={[0.95, 0, -0.2]} color={C.counter} />
          </group>
        </Reveal>
      ))}
      {PLUS_SPOTS.map(([x, z]) => <Reveal key={`${x}${z}`} id="plus" at={[x, 0, z]}><PlusSpot position={[x, 0, z]} /></Reveal>)}
      <pointLight position={[-4, 4.2, -4]} intensity={11} distance={15} color="#ffd7e8" />
      <pointLight position={[4, 4.2, -4]} intensity={11} distance={15} color="#ffd7e8" />
      <pointLight position={[-3, 4.2, 5]} intensity={10} distance={15} color="#ffe6f2" />
      <pointLight position={[4, 4.2, 5]} intensity={10} distance={15} color="#ffe6f2" />
    </group>
  )
}

export { Puck }
