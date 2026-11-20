import { useDrawers, type DrawerId } from '../systems/drawers'
import { BAR } from './barLayout'
import { useMemo } from 'react'
import { HQ } from './Lighting'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { C } from '../data/palette'
import { mat, glass, glow } from './mats'
import { PlusSpot } from './PlusSpot'
import { RBox, Puck } from './Soft'
import { Reveal } from './Reveal'
import { Bar } from './Bar'
import { CakeBench } from './Cake'
import { Swing, Slide } from './Swing'
import { useGame } from '../systems/store'
import { Model } from './Models'
import { Steam } from './Props'
import { ArchWindow, Chalkboard, Clock, PendantLamp, Plant, RoundTable, Rug, Shelf, Stool, StringLights } from './Props'
import { BACK_DZ, COUNTER, FRIDGE_DX, FRIDGE_DZ, H, KITCHEN_DX, KITCHEN_DZ, PLUS_SPOTS, ROOM, RR, TABLES, TABLE_SCALE, WALL_H } from './layout'

const T = 0.3 // wall thickness

// Diorama base + mauve plank floor (like a little dollhouse slab)
// staggered planks: every 1 m row is cut into boards of 2.5 to 4.5 m, offset row to row (deterministic, no Math.random)
// furniture scale: matches the ~2 m customers/barista and the 1.7 m Kozie
const FURN = 1.6

// The café is the inside of the coffee pot: a round room (radius RR) with one flat wall at the back
// for the kitchen and bakery (a chord of the circle at z = -H). The door is at the front, like outside.
const PLANKS = (() => {
  const out: { x: number; z: number; len: number; c: string }[] = []
  const cols = [C.plank1, C.plank2, C.plank3, C.plank4]
  for (let i = 0; i < RR * 2; i++) {
    const x = -RR + i + 0.5, half = Math.sqrt(Math.max(0, RR * RR - x * x))
    let z = Math.max(-H, -half), k = 0
    const end = half, first = 1 + ((i * 7) % 5) * 0.6
    while (z < end - 0.05) {
      const want = k === 0 ? first : 2.5 + ((i * 13 + k * 5) % 5) * 0.5
      const len = Math.min(want, end - z)
      out.push({ x, z: z + len / 2, len, c: cols[(i * 3 + k) % 4] })
      z += len; k++
    }
  }
  return out
})()

// polished brass for handles and trims
const BRASS = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.9, roughness: 0.3 })

function Floor() {
  return (
    <group>
      {/* the pot's base: a round slab, flattened at the back */}
      <mesh position={[0, -0.22, 0]} material={mat(C.plum)} receiveShadow><cylinderGeometry args={[RR + 0.35, RR + 0.35, 0.5, 72]} /></mesh>
      {PLANKS.map((p, i) => (
        <RBox key={i} size={[0.95, 0.08, p.len - 0.05]} pos={[p.x, 0.05, p.z]} color={p.c} r={0.025} shadow={false} />
      ))}
    </group>
  )
}

// angle round the pot (0 = front door, +x side positive): the back chord meets the circle at ±TH
const TH = Math.acos(-H / RR)
const onRing = (th: number, r = RR) => [Math.sin(th) * r, Math.cos(th) * r] as const
const facing = (th: number) => Math.atan2(-Math.sin(th), -Math.cos(th)) // rotation that faces the centre

// a curved wall section from angle a to b (thin open cylinder, both faces drawn)
function Arc({ a, b, y = WALL_H / 2, h = WALL_H, r = RR, color = C.wall }: { a: number; b: number; y?: number; h?: number; r?: number; color?: string }) {
  const m = useMemo(() => { const x = mat(color).clone(); x.side = THREE.DoubleSide; return x }, [color])
  return <mesh position={[0, y, 0]} material={m} receiveShadow><cylinderGeometry args={[r, r, h, 64, 1, true, a, b - a]} /></mesh>
}

function Walls({ cutaway, hideBack }: { cutaway: boolean; hideBack: boolean }) {
  const DOOR = 0.13 // half-angle of the door opening
  return (
    <group>
      {!hideBack && (
        <group>
          <RBox size={[2 * Math.sqrt(RR * RR - H * H) + T, WALL_H, T]} pos={[0, WALL_H / 2, -H]} color={C.wall} r={0.1} />
          <RBox size={[2 * Math.sqrt(RR * RR - H * H), 1.1, 0.08]} pos={[0, 0.6, -H + T / 2]} color={C.wallTrim} r={0.03} />
          <RBox size={[2 * Math.sqrt(RR * RR - H * H) + T + 0.1, 0.18, T + 0.12]} pos={[0, WALL_H, -H]} color={C.wood} r={0.07} />
        </group>
      )}
      {/* the curved pot wall: in the dollhouse only the back half shows, like a cut-open pot */}
      {cutaway ? <>
        <Arc a={Math.PI / 2 - 0.25} b={TH} /><Arc a={-TH} b={-Math.PI / 2 + 0.25} />
        <Arc a={Math.PI / 2 - 0.25} b={TH} y={0.6} h={1.1} r={RR - 0.05} color={C.wallTrim} /><Arc a={-TH} b={-Math.PI / 2 + 0.25} y={0.6} h={1.1} r={RR - 0.05} color={C.wallTrim} />
      </> : <>
        <Arc a={DOOR} b={TH} /><Arc a={-TH} b={-DOOR} />
        <Arc a={DOOR} b={TH} y={0.6} h={1.1} r={RR - 0.05} color={C.wallTrim} /><Arc a={-TH} b={-DOOR} y={0.6} h={1.1} r={RR - 0.05} color={C.wallTrim} />
        <Arc a={-DOOR} b={DOOR} y={WALL_H - 0.5} h={1.0} />
        {/* front doors swing inward (anim.doorIn) */}
        <Swing pos={[-1.04, 0, RR - 0.15]} dir={1} src="doorIn"><RBox size={[1.0, 3.0, 0.1]} pos={[0.52, 1.5, 0]} color={C.purple} r={0.05} /></Swing>
        <Swing pos={[1.04, 0, RR - 0.15]} dir={-1} src="doorIn"><RBox size={[1.0, 3.0, 0.1]} pos={[-0.52, 1.5, 0]} color={C.purple} r={0.05} /></Swing>
        {/* round plaster ceiling with wooden beams */}
        <mesh position={[0, WALL_H + 0.12, 0]} material={mat(C.wall)}><cylinderGeometry args={[RR, RR, 0.16, 64]} /></mesh>
        {[-8, -4, 0, 4, 8].map((z) => { const w = 2 * Math.sqrt(Math.max(0, RR * RR - z * z)); return <RBox key={z} size={[w, 0.28, 0.32]} pos={[0, WALL_H - 0.08, z]} color={C.wood} r={0.08} shadow={false} /> })}
      </>}
      {/* wooden rim along the top of the curved wall */}
      {!cutaway && <mesh position={[0, WALL_H, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.wood)}><torusGeometry args={[RR, 0.1, 8, 96, Math.PI * 2]} /></mesh>}

      {/* three arched windows along the curve on the left */}
      {WIN.map((th) => { const [x, z] = onRing(th, RR - 0.12); return <ArchWindow key={th} pos={[x, 2.4, z]} rotY={facing(th)} /> })}
      {!hideBack && <StringLights from={[-H + 0.3, WALL_H - 0.1, -H + 0.25]} to={[H - 0.3, WALL_H - 0.1, -H + 0.25]} n={18} />}
    </group>
  )
}
export const WIN = [-1.72, -1.42, -1.12]

// The old boxed-in kitchen corner was replaced by the open bakery corner (world/Cake.tsx: BakeryCorner)
function Kitchen() {
  return <group />
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
          <group key={i} position={[x, y - 0.08, 0]}><Model name="croissant" scale={1.4} rot={[0, 0.4, 0]} /></group>
        ) : (
          // cake slice
          <group key={i} position={[x, y - 0.09, 0]}><Model name={i % 2 ? 'carrot_cake' : 'strawberry_chocolate_cake'} scale={1.1} /></group>
        )
      })}
    </group>
  )
}

function PastryCase({ x, z, w, rot = 0, body = C.wood }: { x: number; z: number; w: number; rot?: number; body?: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <RBox size={[w, 0.95, 0.6]} pos={[0, 0.48, 0]} color={body} r={0.1} />
      <RBox size={[w - 0.1, 0.06, 0.5]} pos={[0, 0.98, 0]} color={C.counterTop} r={0.02} shadow={false} />
      {/* 19 Nov: a low glass case (it used to stand 0.7 tall and hid the customer you're serving from the bar) */}
      <RBox size={[w, 0.36, 0.6]} pos={[0, 1.16, 0]} material={glass()} r={0.1} shadow={false} />
      <RBox size={[w + 0.04, 0.06, 0.64]} pos={[0, 1.36, 0]} color={C.plum} r={0.03} />
      <Treats w={w} y={1.1} />
    </group>
  )
}

function Counter({ showDrawerTags }: { showDrawerTags: boolean }) {
  const { x0, x1, z, depth, top } = COUNTER
  const w = x1 - x0, cx = (x0 + x1) / 2
  const drawers: [string, number, string][] = [['fillers', 2.2, '#8fb8a8'], ['sprinkles', 0.8, '#d8b86a'], ['ingredients', -0.6, '#a996c4'], ['food', -2.0, '#c99078']]
  return (
    <group>
      <RBox size={[w, top, depth]} pos={[cx, top / 2, z]} color={C.woodDark} r={0.05} />
      <RBox size={[w + 0.15, 0.1, depth + 0.15]} pos={[cx, top + 0.04, z]} color={C.counterTop} r={0.02} />
      {/* drawers on the barista side = the customisation menu */}
      {drawers.map(([label, x, col]) => (
        <group key={label} position={[x, 0.55, z - depth / 2 - 0.03]}
          onClick={(e) => { if (useGame.getState().mode !== 'pov') return; e.stopPropagation(); useDrawers.getState().toggle(label as DrawerId) }}
          onPointerOver={() => { if (useGame.getState().mode === 'pov') document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}><Slide id={label}>
          <RBox size={[1.2, 0.7, 0.08]} color={col} r={0.025} />
          <RBox size={[1.08, 0.58, 0.02]} pos={[0, 0, -0.045]} color={col} r={0.01} shadow={false} />
          {/* drawer body + contents, seen when it slides open */}
          <RBox size={[1.1, 0.5, 0.55]} pos={[0, -0.02, 0.3]} color={C.counterTop} r={0.04} shadow={false} />
          {[-0.3, 0, 0.3].map((dx, i) => <mesh key={dx} position={[dx, 0.25, 0.3]} material={mat([C.counter, C.butter, C.mint, C.lilac][(i + label.length) % 4])}><sphereGeometry args={[0.13, 10, 8]} /></mesh>)}
          <mesh position={[0, 0.16, -0.08]} rotation={[0, 0, Math.PI / 2]} material={BRASS}>
            <capsuleGeometry args={[0.022, 0.36, 4, 10]} />
          </mesh>
        </Slide></group>
      ))}
      <CounterTop />
      <PastryCase x={0.25} z={-2.3} w={5.3} />
      <PastryCase x={-3.2} z={-1.65} w={1.5} rot={0.75} />
    </group>
  )
}

// Barista's left→right facing +z: milk jug, glass, cream, shot glass, espresso machine
function CounterTop() {
  const y = COUNTER.top + 0.1, z = COUNTER.z - 0.1
  return (
    <group>
      {/* espresso machine: a real two-group machine, facing the barista (-z) */}
      {/* the real espresso machine (Sketchfab, CC BY: KWojcik), with a grinder beside it */}
      <Model name="sf:espresso" fit={0.85} pos={BAR.machine} rot={[0, Math.PI, 0]} />
      <Model name="sf:grinder" fit={0.5} pos={BAR.grinder} />
      <Steam pos={[BAR.machine[0], y + 0.9, BAR.machine[2]]} />
      <group position={[-1.6, y, z - 0.05]} visible={false}>
        {/* brushed-steel body with a pastel enamel side panel, sitting on short feet */}
        <RBox size={[1.34, 0.95, 0.8]} pos={[0, 0.62, 0]} color={C.steel} r={0.07} />
        <RBox size={[1.36, 0.6, 0.6]} pos={[0, 0.66, 0.03]} color={C.counter} r={0.05} />
        {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 0.07, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.05, 0.06, 0.14, 10]} /></mesh>)}
        {/* cup-warmer rail on top with three warming cups */}
        <RBox size={[1.24, 0.05, 0.68]} pos={[0, 1.12, 0]} color={C.steel} r={0.02} />
        {[-0.62, 0.62].map((x) => <RBox key={x} size={[0.04, 0.14, 0.68]} pos={[x, 1.2, 0]} color={C.steel} r={0.015} />)}
        {[-0.32, 0, 0.32].map((x) => (
          <group key={x} position={[x, 1.24, 0]}>
            <mesh material={mat(C.cream)}><cylinderGeometry args={[0.1, 0.075, 0.13, 18]} /></mesh>
            <mesh position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.cream)}><torusGeometry args={[0.04, 0.012, 6, 12]} /></mesh>
          </group>
        ))}
        {/* two group heads + portafilters with wooden handles, pointing at the barista */}
        {[-0.32, 0.32].map((x) => (
          <group key={x} position={[x, 0.42, -0.44]}>
            <mesh material={mat(C.steel)}><cylinderGeometry args={[0.11, 0.1, 0.12, 20]} /></mesh>
            <mesh position={[0, -0.09, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.1, 0.08, 0.08, 20]} /></mesh>
            <mesh position={[0, -0.09, -0.2]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.woodDark)}><capsuleGeometry args={[0.035, 0.28, 4, 10]} /></mesh>
            <mesh position={[0, -0.18, -0.02]} material={mat(C.steel)}><cylinderGeometry args={[0.015, 0.012, 0.06, 8]} /></mesh>
          </group>
        ))}
        {/* steam wand (angled) + hot-water spout */}
        <group position={[0.56, 0.62, -0.42]} rotation={[0.35, 0, -0.2]}>
          <mesh position={[0, -0.22, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.022, 0.018, 0.48, 10]} /></mesh>
          <mesh position={[0, 0.05, 0]} material={mat(C.steel)}><sphereGeometry args={[0.04, 10, 8]} /></mesh>
        </group>
        <mesh position={[-0.58, 0.5, -0.43]} rotation={[0.25, 0, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.02, 0.02, 0.24, 10]} /></mesh>
        {/* pressure gauge + two buttons on the front */}
        <group position={[0, 0.84, -0.41]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(C.steel)}><cylinderGeometry args={[0.1, 0.1, 0.04, 24]} /></mesh>
          <mesh position={[0, 0, -0.022]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.cream)}><cylinderGeometry args={[0.085, 0.085, 0.01, 24]} /></mesh>
          <mesh position={[0.02, 0.02, -0.03]} rotation={[0, 0, -0.8]} material={mat(C.plum)}><boxGeometry args={[0.012, 0.07, 0.005]} /></mesh>
        </group>
        {[-0.32, 0.32].map((x) => <mesh key={x} position={[x, 0.84, -0.41]} rotation={[Math.PI / 2, 0, 0]} material={glow(C.butter)}><cylinderGeometry args={[0.03, 0.03, 0.02, 12]} /></mesh>)}
        {/* drip tray with a grate */}
        <RBox size={[1.2, 0.06, 0.3]} pos={[0, 0.14, -0.5]} color={C.steel} r={0.02} />
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-0.52 + i * 0.13, 0.175, -0.5]} material={mat(C.plum)}><boxGeometry args={[0.03, 0.01, 0.26]} /></mesh>)}
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
      {TABLES.map(([x, z], i) => <PendantLamp key={`${x},${z}`} pos={[x, WALL_H + 0.1, z]} color={i % 2 ? C.counter : C.lilac} drop={0.8} />)}
      <Plant pos={[-9.2, 0, -3.8]} s={1.3} />
      <Plant pos={[-9.2, 0, 9.2]} s={1.1} pot={C.counter} />
      <Plant pos={[9.2, 0, -4.2]} s={1.2} pot={C.lilac} />
      <Plant pos={[9.2, 0, 9.2]} s={0.9} pot={C.mint} />
      <Rug pos={[-6.1, 0.1, 2.3]} r={3.6} />
      <Rug pos={[-10.8, 0.1, 0.9]} r={3.2} color={C.counter} />
      <Rug pos={[8.6, 0.1, 1.9]} r={3.9} color={C.mint} />
      {/* window bench: a long cushioned seat under the arched windows, with cushions and a plant at each end */}
      {Array.from({ length: 9 }, (_, i) => { const th = -2.0 + i * 0.13, x = Math.sin(th) * (RR - 0.65), z = Math.cos(th) * (RR - 0.65); return (
        <group key={i} position={[x, 0, z]} rotation={[0, th, 0]}>
          <RBox size={[1.9, 0.5, 0.8]} pos={[0, 0.25, 0]} color={C.mint} r={0.08} />
          <RBox size={[1.92, 0.14, 0.84]} pos={[0, 0.57, 0]} color={C.lilac} r={0.07} />
          {i % 2 === 0 && <RBox size={[0.6, 0.5, 0.18]} pos={[0, 0.85, 0.25]} color={i % 4 ? C.counter : C.butter} r={0.12} />}
        </group>) })}
      {/* hanging plants at different heights between the windows */}
      {[[-1.87, 3.0], [-1.57, 2.6], [-1.27, 3.1], [-0.95, 2.8], [1.4, 2.7]].map(([th, y]) => [Math.sin(th) * (RR - 0.8), y, Math.cos(th) * (RR - 0.8)]).map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, (WALL_H - y) / 2, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.01, 0.01, WALL_H - y, 4]} /></mesh>
          <Plant pos={[0, -0.45, 0]} s={0.5} pot={i % 2 ? C.lilac : C.counter} />
        </group>
      ))}
      {/* bar stools along the side of the counter */}
      <group position={[4.2, 0, -7.6]} scale={FURN}><Stool pos={[0, 0, 0]} /></group>
      <group position={[4.2, 0, -6.2]} scale={FURN}><Stool pos={[0, 0, 0]} color={C.purple} /></group>
    </group>
  )
}

export function Interior({ cutaway, pov, only = '' }: { cutaway: boolean; pov: boolean; only?: '' | 'bar' | 'kitchen' }) {
  return (
    <group name="interior">
      <Reveal id="floor"><Floor /></Reveal>
      <Reveal id="walls"><Walls cutaway={cutaway} hideBack={pov} /></Reveal>
      <Reveal id="kitchen" at={[-8.5, 0, -8.5]}><group visible={only !== 'bar'} position={[KITCHEN_DX, 0, KITCHEN_DZ]}><Kitchen /></group></Reveal>
      <Reveal id="counter" at={[0.2, 0, -7.2]}><group visible={only !== 'kitchen'} position={[0, 0, BACK_DZ]}><Counter showDrawerTags={pov} /><Bar /></group></Reveal>
      <Reveal id="fridge" at={[9.5, 0, -9.4]}><group visible={only === ''} position={[FRIDGE_DX, 0, FRIDGE_DZ]}><Fridge /></group></Reveal>
      <Reveal id="decor"><Decor hideBack={pov} /></Reveal>
      <CakeBench />
      {TABLES.map(([x, z], i) => (
        <Reveal key={`${x},${z}`} id="tables" at={[x, 0, z]}>
          {/* FURN: tables + stools sized for ~2 m characters (table ~1.05 m, seat ~0.8 m) */}
          <group position={[x, 0, z]} scale={TABLE_SCALE}>
            <RoundTable pos={[0, 0, 0]} top={i ? C.cream : C.counterTop} />
          </group>
        </Reveal>
      ))}
      {PLUS_SPOTS.map(([x, z]) => <Reveal key={`${x}${z}`} id="plus" at={[x, 0, z]}><PlusSpot position={[x, 0, z]} /></Reveal>)}
      {HQ && <pointLight position={[-4, 4.2, -4]} intensity={4.5} distance={13} color="#ffd9c2" />}
      {HQ && <pointLight position={[4, 4.2, -4]} intensity={4.5} distance={13} color="#ffd9c2" />}
      {HQ && <pointLight position={[-3, 4.2, 5]} intensity={4} distance={13} color="#ffe2c8" />}
      {HQ && <pointLight position={[4, 4.2, 5]} intensity={4} distance={13} color="#ffe2c8" />}
    </group>
  )
}

export { Puck }
