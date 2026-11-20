import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/palette'
import { mat } from './mats'
import { RBox } from './Soft'
import { Plant } from './Props'
import { useGame } from '../systems/store'
import { useKitchen, PARTS, needs, type Part, type Flavour } from '../systems/kitchen'
import { SPONGE_COL } from '../systems/cake'

// The prep kitchen (21 Nov): tucked between the coffee counter and the fridge, behind pink curtains.
// Layout units (the café group is scaled by WORLD). Back wall at z = -10; the curtain rod runs along z = KZ_FRONT.
export const KX0 = 4.5, KX1 = 8.8, KZ_FRONT = -6.75, KZ_BACK = -9.95
export const KITCHEN_DOOR: [number, number] = [7.0, 8.0] // the gap in the curtains you walk through
const TOP = 1.0, CZ = -9.45 // prep counter top height, its centre line

const inKitchen = () => useGame.getState().mode === 'kitchen'
const hover = (on: boolean) => () => { if (inKitchen()) document.body.style.cursor = on ? 'pointer' : '' }
const click = (f: () => void) => (e: ThreeEvent<MouseEvent>) => { if (!inKitchen()) return; e.stopPropagation(); f() }

/** curtain: a cloth with soft folds (a displaced plane), hanging from a rod */
function Curtain({ from, to, h = 2.95, color, rotY = 0 }: { from: [number, number]; to: [number, number]; h?: number; color: string; rotY?: number }) {
  const geo = useMemo(() => {
    const w = Math.hypot(to[0] - from[0], to[1] - from[1]), g = new THREE.PlaneGeometry(w, h, Math.max(8, Math.round(w * 10)), 6), p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 7.5) * 0.07 * (0.75 + 0.25 * (y / h + 0.5))) }
    g.computeVertexNormals(); return g
  }, [from, to, h])
  const m = useMemo(() => { const x = mat(color, { rough: 0.9 }).clone(); x.side = THREE.DoubleSide; return x }, [color])
  const cx = (from[0] + to[0]) / 2, cz = (from[1] + to[1]) / 2
  return <mesh geometry={geo} material={m} position={[cx, 0.18 + h / 2, cz]} rotation={[0, rotY, 0]} castShadow />
}

function Jar({ x, part, label, color, lid }: { x: number; part: Part; label: string; color: string; lid: string }) {
  return (
    <group position={[x, TOP, CZ - 0.12]} name={`kitchen:${part}`} onClick={click(() => useKitchen.getState().add(part))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      <mesh position={[0, 0.2, 0]} material={mat('#f3eef7', { opacity: 0.55 })}><cylinderGeometry args={[0.17, 0.17, 0.4, 18]} /></mesh>
      <mesh position={[0, 0.14, 0]} material={mat(color)}><cylinderGeometry args={[0.15, 0.15, 0.27, 18]} /></mesh>
      <mesh position={[0, 0.43, 0]} material={mat(lid)}><cylinderGeometry args={[0.18, 0.18, 0.06, 18]} /></mesh>
      <mesh position={[0, 0.2, 0.172]} material={mat(C.white)}><planeGeometry args={[0.24, 0.12]} /></mesh>
      <mesh position={[0, 0.2, 0.18]} visible={false} userData={{ label }}><planeGeometry args={[0.01, 0.01]} /></mesh>
    </group>
  )
}
function Eggs({ x }: { x: number }) {
  return (
    <group position={[x, TOP, CZ - 0.1]} name="kitchen:eggs" onClick={click(() => useKitchen.getState().add('eggs'))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      <RBox size={[0.42, 0.08, 0.3]} pos={[0, 0.04, 0]} color={C.butter} r={0.03} shadow={false} />
      {[[-0.12, -0.07], [0, -0.07], [0.12, -0.07], [-0.12, 0.07], [0, 0.07], [0.12, 0.07]].map(([dx, dz], i) =>
        <mesh key={i} position={[dx, 0.13, dz]} scale={[1, 1.3, 1]} material={mat('#fbf3e6')}><sphereGeometry args={[0.055, 12, 10]} /></mesh>)}
    </group>
  )
}
function Butter({ x }: { x: number }) {
  return (
    <group position={[x, TOP, CZ - 0.1]} name="kitchen:butter" onClick={click(() => useKitchen.getState().add('butter'))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      <mesh position={[0, 0.02, 0]} material={mat(C.white)}><cylinderGeometry args={[0.2, 0.2, 0.03, 20]} /></mesh>
      <RBox size={[0.24, 0.1, 0.14]} pos={[0, 0.08, 0]} color="#f7dd77" r={0.02} shadow={false} />
    </group>
  )
}
/** the extra: cocoa for chocolate, strawberries for strawberry (both sit out; the bowl's flavour decides if it's needed) */
function Extra({ x }: { x: number }) {
  return (
    <group position={[x, TOP, CZ - 0.1]} name="kitchen:extra" onClick={click(() => useKitchen.getState().add('extra'))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      <mesh position={[-0.12, 0.09, 0]} material={mat('#6b3f2a')}><cylinderGeometry args={[0.09, 0.1, 0.18, 14]} /></mesh>
      <mesh position={[0.14, 0.04, 0]} material={mat(C.white)}><cylinderGeometry args={[0.13, 0.1, 0.07, 14]} /></mesh>
      {[[0.1, 0.02], [0.18, -0.03], [0.13, -0.06]].map(([dx, dz], i) => <mesh key={i} position={[dx, 0.11, dz]} material={mat('#d83a4c')}><sphereGeometry args={[0.045, 10, 8]} /></mesh>)}
    </group>
  )
}

const MIX = new THREE.Color(), PALE = new THREE.Color('#efe2c8')
function Bowl() {
  const fill = useRef<THREE.Mesh>(null), flecks = useRef<THREE.Group>(null), whisk = useRef<THREE.Group>(null)
  const fillMat = useMemo(() => mat('#efe2c8').clone(), [])
  useFrame((_, dt) => {
    const k = useKitchen.getState(); k.stirBy(Math.min(dt, 0.1))
    const b = k.bowl, f = b.flavour
    const total = f ? PARTS.reduce((a, p) => a + needs(f, p), 0) : 1, got = PARTS.reduce((a, p) => a + b.added[p], 0)
    const lvl = f ? got / total : 0
    if (fill.current) { fill.current.visible = lvl > 0; fill.current.position.y = 0.06 + lvl * 0.2; fill.current.scale.setScalar(0.7 + lvl * 0.3) }
    MIX.copy(PALE).lerp(new THREE.Color(f ? SPONGE_COL[f] : '#efe2c8'), b.stir); fillMat.color.copy(MIX)
    if (flecks.current) { flecks.current.visible = lvl > 0 && b.stir < 0.95; flecks.current.position.y = 0.07 + lvl * 0.2; flecks.current.rotation.y += k.stirring ? dt * 9 : 0; flecks.current.scale.setScalar(1 - b.stir * 0.8) }
    if (whisk.current) { const t = performance.now() / 1000; whisk.current.rotation.z = k.stirring ? Math.sin(t * 18) * 0.35 : 0.5; whisk.current.position.x = k.stirring ? Math.sin(t * 9) * 0.05 : 0.32 }
  })
  const down = (e: ThreeEvent<PointerEvent>) => { if (!inKitchen()) return; e.stopPropagation(); useKitchen.getState().setStirring(true); const up = () => { useKitchen.getState().setStirring(false); window.removeEventListener('pointerup', up) }; window.addEventListener('pointerup', up) }
  return (
    <group position={[6.6, TOP, CZ + 0.05]}>
      <mesh position={[0, 0.17, 0]} material={mat(C.lilac, { rough: 0.5 })}><cylinderGeometry args={[0.36, 0.22, 0.34, 28, 1, true]} /></mesh>
      <mesh position={[0, 0.01, 0]} material={mat(C.lilac)}><cylinderGeometry args={[0.22, 0.22, 0.02, 24]} /></mesh>
      <mesh ref={fill} material={fillMat} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.3, 28]} /></mesh>
      <group ref={flecks}>{[['#fff', 0.12, 0.05], ['#f7dd77', -0.1, 0.08], ['#fbf3e6', 0.02, -0.12], ['#e9e2d0', -0.13, -0.06]].map(([c, x, z], i) =>
        <mesh key={i} position={[x as number, 0, z as number]} material={mat(c as string)}><sphereGeometry args={[0.05, 8, 6]} /></mesh>)}</group>
      {/* the whisk: press and hold it to stir */}
      <group ref={whisk} position={[0.32, 0.3, 0.05]} name="kitchen:whisk" onPointerDown={down} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <mesh position={[0, 0.25, 0]} material={mat(C.purple)}><cylinderGeometry args={[0.025, 0.03, 0.3, 10]} /></mesh>
        {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.02, 0]} rotation={[0, i * Math.PI / 3, 0]} scale={[1, 1.7, 0.5]} material={mat(C.steel)}><torusGeometry args={[0.07, 0.008, 6, 16]} /></mesh>)}
        <mesh position={[0, 0.05, 0]} visible={false}><boxGeometry args={[0.3, 0.6, 0.3]} /></mesh>
      </group>
    </group>
  )
}

/** the batter shelf: one tub per flavour, filled to how many layers wait for the cake bench */
function BatterShelf() {
  const tubs = useRef<Record<Flavour, THREE.Mesh | null>>({ vanilla: null, chocolate: null, strawberry: null })
  useFrame(() => { const b = useKitchen.getState().batter; for (const f of ['vanilla', 'chocolate', 'strawberry'] as Flavour[]) { const m = tubs.current[f]; if (m) { const n = Math.min(6, b[f]); m.visible = n > 0; m.scale.y = Math.max(0.05, n / 6); m.position.y = 0.05 + (n / 6) * 0.13 } } })
  return (
    <group position={[KX0 + 0.45, 0, -8.2]}>
      <RBox size={[0.7, 1.2, 1.6]} pos={[0, 0.6, 0]} color={C.counter} r={0.06} />
      {(['vanilla', 'chocolate', 'strawberry'] as Flavour[]).map((f, i) => (
        <group key={f} position={[0, 1.2, -0.5 + i * 0.5]} name={`kitchen:batter-${f}`}>
          <mesh position={[0, 0.14, 0]} material={mat(C.white, { opacity: 0.6 })}><cylinderGeometry args={[0.17, 0.15, 0.28, 18, 1, true]} /></mesh>
          <mesh ref={(m) => { tubs.current[f] = m }} material={mat(SPONGE_COL[f])}><cylinderGeometry args={[0.16, 0.14, 0.26, 18]} /></mesh>
        </group>))}
    </group>
  )
}

export function KitchenRoom() {
  return (
    <group name="prep-kitchen">
      {/* the prep counter along the back wall, cupboards below */}
      <RBox size={[KX1 - KX0 - 0.3, TOP, 0.9]} pos={[(KX0 + KX1) / 2 + 0.05, TOP / 2, CZ]} color={C.mint} r={0.06} />
      <RBox size={[KX1 - KX0 - 0.2, 0.06, 1.0]} pos={[(KX0 + KX1) / 2 + 0.05, TOP + 0.01, CZ]} color={C.counterTop} r={0.03} />
      {[5.2, 6.2, 7.2, 8.1].map((x) => <RBox key={x} size={[0.8, 0.7, 0.03]} pos={[x, 0.45, CZ + 0.46]} color={C.lilac} r={0.04} shadow={false} />)}
      <Jar x={5.0} part="flour" label="flour" color="#fbf8f1" lid={C.butter} />
      <Jar x={5.45} part="sugar" label="sugar" color="#ffffff" lid={C.counter} />
      <Eggs x={5.95} />
      <Bowl />
      <Butter x={7.35} />
      <Extra x={7.85} />
      {/* scales + cutting board + a rolling pin: the kitchen's tools */}
      <group position={[8.35, TOP, CZ + 0.05]}>
        <RBox size={[0.42, 0.04, 0.3]} pos={[0, 0.02, 0]} color="#e7c79a" r={0.02} shadow={false} />
        <mesh position={[0, 0.07, 0.02]} rotation={[0, 0, Math.PI / 2]} material={mat(C.wood)}><cylinderGeometry args={[0.035, 0.035, 0.4, 10]} /></mesh>
      </group>
      <group position={[5.0, TOP, CZ + 0.3]}>
        <RBox size={[0.3, 0.07, 0.26]} pos={[0, 0.035, 0]} color={C.steel} r={0.02} shadow={false} />
        <mesh position={[0, 0.08, 0]} material={mat(C.white)}><cylinderGeometry args={[0.1, 0.1, 0.015, 16]} /></mesh>
      </group>
      {/* a wall shelf of spare jars and a little plant */}
      <RBox size={[2.4, 0.06, 0.32]} pos={[6.6, 2.15, -9.78]} color={C.wood} r={0.02} shadow={false} />
      {[5.7, 6.1, 6.5, 7.1, 7.5].map((x, i) => <mesh key={x} position={[x, 2.32, -9.78]} material={mat([C.butter, C.peach, C.lilac, C.mint, C.counter][i])}><cylinderGeometry args={[0.1, 0.1, 0.28, 12]} /></mesh>)}
      <Plant pos={[7.85, 2.18, -9.78]} s={0.45} pot={C.counter} />
      <BatterShelf />
      {/* curtains: a rod across the front with a gap to walk through, and down the side facing the bar */}
      <mesh position={[(KX0 + KX1) / 2, 3.18, KZ_FRONT]} rotation={[0, 0, Math.PI / 2]} material={mat(C.plum)}><cylinderGeometry args={[0.035, 0.035, KX1 - KX0 + 0.2, 8]} /></mesh>
      <mesh position={[KX0 - 0.1, 3.18, (KZ_FRONT + KZ_BACK) / 2]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.035, 0.035, KZ_FRONT - KZ_BACK, 8]} /></mesh>
      <Curtain from={[KX0 - 0.1, KZ_FRONT]} to={[KITCHEN_DOOR[0], KZ_FRONT]} color="#f4b6c8" />
      <Curtain from={[KITCHEN_DOOR[1], KZ_FRONT]} to={[KX1, KZ_FRONT]} color="#f4b6c8" />
      <Curtain from={[KX0 - 0.1, KZ_BACK]} to={[KX0 - 0.1, KZ_FRONT]} color="#cdb8e6" rotY={Math.PI / 2} />
      {/* tie-back bows either side of the doorway */}
      {KITCHEN_DOOR.map((x) => <mesh key={x} position={[x, 1.6, KZ_FRONT + 0.05]} material={mat(C.purple)}><torusGeometry args={[0.09, 0.03, 8, 16]} /></mesh>)}
    </group>
  )
}
