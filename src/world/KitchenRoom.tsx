import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/palette'
import { mat } from './mats'
import { RBox } from './Soft'
import { Model } from './Models'
import { useGame } from '../systems/store'
import { useKitchen, PARTS, needs, POUR_MS, type Part, type Flavour } from '../systems/kitchen'
import { SPONGE_COL } from '../systems/cake'

// The prep kitchen (21 Nov): tucked between the coffee counter and the fridge, behind pink curtains.
// Props are Kenney's Food Kit (CC0, one shared 512 px palette texture: light on memory) plus a few hand-made pieces.
// Each scoop is ANIMATED: the sack / jar lifts, tilts over the bowl and pours a stream; an egg flies over and cracks;
// a pat of butter drops in. Layout units (the café group is scaled by WORLD). Back wall at z = -10.
export const KX0 = 4.5, KX1 = 8.8, KZ_FRONT = -6.75, KZ_BACK = -9.95
export const KITCHEN_DOOR: [number, number] = [7.0, 8.0]
const TOP = 1.0, CZ = -9.45
const BOWL: [number, number, number] = [6.6, TOP, CZ + 0.05]

const inKitchen = () => useGame.getState().mode === 'kitchen'
const hover = (on: boolean) => () => { if (inKitchen()) document.body.style.cursor = on ? 'pointer' : '' }
const click = (f: () => void) => (e: ThreeEvent<MouseEvent>) => { if (!inKitchen()) return; e.stopPropagation(); f() }
const ease = (x: number) => x * x * (3 - 2 * x)

/** one scoop's animation clock for this part: 0..1 while it plays, null otherwise */
function pourPhase(part: Part) {
  const p = useKitchen.getState().pour
  if (!p || p.part !== part) return null
  const k = (performance.now() - p.t) / POUR_MS
  return k >= 0 && k < 1 ? k : null
}
const seg = (k: number, a: number, b: number) => Math.min(1, Math.max(0, (k - a) / (b - a))) // 0..1 inside [a, b]
const GRAIN: Record<string, { color: string; r: number }> = {
  flour: { color: '#fbf8f1', r: 0.012 }, sugar: { color: '#ffffff', r: 0.014 }, cocoa: { color: '#5b2e1c', r: 0.012 },
}

/** falling grains (flour dust, sugar, cocoa): a little column of specks that keeps streaming while `on` */
function useGrains(n: number) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({ ph: i / n, dx: (Math.sin(i * 12.9) * 0.5), dz: (Math.cos(i * 7.3) * 0.5) })), [n])
  const place = (on: boolean, x: number, top: number, z: number, bottom: number, spread: number) => {
    const t = performance.now() / 1000
    seeds.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = on; if (!on) return
      const f = (t * 2.2 + s.ph) % 1; m.position.set(x + s.dx * spread, top - f * (top - bottom), z + s.dz * spread) })
  }
  return { refs, place, seeds }
}
function Grains({ g, kind }: { g: ReturnType<typeof useGrains>; kind: keyof typeof GRAIN }) {
  const m = useMemo(() => mat(GRAIN[kind].color), [kind])
  return <>{g.seeds.map((_, i) => <mesh key={i} ref={(r) => { g.refs.current[i] = r }} visible={false} material={m}><sphereGeometry args={[GRAIN[kind].r, 6, 4]} /></mesh>)}</>
}

/** a container that pours: it travels UPRIGHT to the bowl, tips about its MOUTH (opening towards the bowl), the grains
 *  fall, it rights itself and goes home. `sift` = the flour goes through a sieve that shakes over the bowl. */
function Pourer({ part, home, h, tip = 2.0, kind, sift, lid, children, name, size, when }: {
  part: Part; home: [number, number, number]; h: number; tip?: number; kind: keyof typeof GRAIN; sift?: boolean; lid?: React.ReactNode
  name: string; size: [number, number, number]; children: React.ReactNode; when?: () => boolean
}) {
  const g = useRef<THREE.Group>(null), tilt = useRef<THREE.Group>(null), lidRef = useRef<THREE.Group>(null), sieve = useRef<THREE.Group>(null)
  const grains = useGrains(sift ? 22 : 14)
  useFrame(() => {
    let k = pourPhase(part); if (k !== null && when && !when()) k = null
    const o = g.current, tl = tilt.current; if (!o || !tl) return
    if (lidRef.current) lidRef.current.visible = k === null || k > 0.9
    if (sieve.current) sieve.current.visible = false
    if (k === null) { o.position.set(...home); tl.rotation.set(0, 0, 0); grains.place(false, 0, 0, 0, 0, 0); return }
    const side = home[0] < BOWL[0] ? 1 : -1
    // travel there upright (0-.3), pour (.3-.78), come back upright (.78-1); a small arc so it never drags through things
    const go = k < 0.3 ? ease(k / 0.3) : k > 0.78 ? 1 - ease((k - 0.78) / 0.22) : 1
    const mouthAt: [number, number, number] = [BOWL[0] - side * (sift ? 0.05 : 0.16), BOWL[1] + (sift ? 0.78 : 0.62), BOWL[2]]
    const tx = mouthAt[0], ty = mouthAt[1] - h, tz = mouthAt[2]
    o.position.set(home[0] + (tx - home[0]) * go, home[1] + (ty - home[1]) * go + Math.sin(go * Math.PI) * 0.12, home[2] + (tz - home[2]) * go)
    // tip about the mouth: ramp in, hold, ramp out (rotation is on the inner group whose origin IS the mouth)
    const tipK = ease(seg(k, 0.3, 0.42)) * (1 - ease(seg(k, 0.72, 0.8)))
    tl.rotation.z = -side * tip * tipK
    const mouthX = o.position.x, mouthY = o.position.y + h
    const pouring = k > 0.38 && k < 0.74
    if (sift && sieve.current) {
      // the sieve over the bowl: shakes side to side; fine flour drifts down from its whole mesh
      const show = k > 0.22 && k < 0.86; sieve.current.visible = show
      const shake = Math.sin(performance.now() / 1000 * 32) * 0.03
      sieve.current.position.set(BOWL[0] + shake, BOWL[1] + 0.42, BOWL[2])
      grains.place(pouring || (k > 0.4 && k < 0.84), BOWL[0] + shake, BOWL[1] + 0.4, BOWL[2], BOWL[1] + 0.14, 0.16)
    } else grains.place(pouring, mouthX + side * 0.03, mouthY - 0.02, BOWL[2], BOWL[1] + 0.14, 0.025)
  })
  return (
    <>
      <group ref={g} position={home} name={name} onClick={click(() => useKitchen.getState().add(part))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        {/* the inner pivot sits at the mouth (height h): tipping happens around the opening, like a real pour */}
        <group position={[0, h, 0]}><group ref={tilt}><group position={[0, -h, 0]}>{children}{lid && <group ref={lidRef}>{lid}</group>}</group></group></group>
        <mesh position={[0, size[1] / 2, 0]} visible={false}><boxGeometry args={size} /></mesh>
      </group>
      {sift && <group ref={sieve} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(C.steel)}><torusGeometry args={[0.2, 0.018, 8, 28]} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} material={mat('#c9c3cf', { opacity: 0.55 })}><circleGeometry args={[0.19, 24]} /></mesh>
        <mesh position={[0.32, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.purple)}><cylinderGeometry args={[0.02, 0.02, 0.26, 8]} /></mesh>
      </group>}
      <Grains g={grains} kind={kind} />
    </>
  )
}

/** eggs: one egg hops to the rim, TAPS it (crack), the shell splits in two halves, the yolk and white drop in */
function Eggs({ home }: { home: [number, number, number] }) {
  const egg = useRef<THREE.Group>(null), a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null), yolk = useRef<THREE.Group>(null)
  useFrame(() => {
    const k = pourPhase('eggs'), e = egg.current, ha = a.current, hb = b.current, y = yolk.current; if (!e || !ha || !hb || !y) return
    if (k === null) { e.visible = ha.visible = hb.visible = y.visible = false; return }
    const rim: [number, number, number] = [BOWL[0] - 0.3, BOWL[1] + 0.34, BOWL[2]]
    // fly to just above the rim, upright (0-.3)
    const f = ease(seg(k, 0, 0.3))
    let ex = home[0] + (rim[0] - home[0]) * f, ey = home[1] + 0.15 + (rim[1] + 0.12 - home[1] - 0.15) * f + Math.sin(f * Math.PI) * 0.3
    const ez = home[2] + (rim[2] - home[2]) * f
    // tap down on the rim twice (.3-.45): that's the crack
    if (k > 0.3 && k < 0.45) ey = rim[1] + 0.12 - Math.abs(Math.sin(seg(k, 0.3, 0.45) * Math.PI * 2)) * 0.1
    e.visible = k < 0.47; e.position.set(ex, ey, ez); e.rotation.set(0, 0, k > 0.3 ? -0.5 : 0)
    // split (.47-.7): two half shells over the bowl centre swing apart; the yolk + white fall (.5-.8)
    const s = seg(k, 0.47, 0.7), show = k >= 0.47 && k < 0.82
    ha.visible = hb.visible = show
    ha.position.set(BOWL[0] - 0.05 - s * 0.06, rim[1] + 0.1, BOWL[2]); ha.rotation.set(0, 0, 0.3 + s * 1.2)
    hb.position.set(BOWL[0] + 0.05 + s * 0.06, rim[1] + 0.1, BOWL[2]); hb.rotation.set(0, 0, -0.3 - s * 1.2)
    const d = ease(seg(k, 0.5, 0.8)); y.visible = k > 0.5 && k < 0.84
    y.position.set(BOWL[0], rim[1] + 0.06 - d * 0.28, BOWL[2]); y.scale.set(1 + d * 0.6, 1 - d * 0.5, 1 + d * 0.6)
  })
  const shell = mat('#fbf3e6')
  return (
    <>
      <group position={home} name="kitchen:eggs" onClick={click(() => useKitchen.getState().add('eggs'))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <RBox size={[0.46, 0.08, 0.32]} pos={[0, 0.04, 0]} color="#d9c3a5" r={0.03} shadow={false} />
        {[[-0.14, -0.08], [0, -0.08], [0.14, -0.08], [-0.14, 0.08], [0, 0.08], [0.14, 0.08]].map(([dx, dz], i) => <Model key={i} name="fk:egg" pos={[dx, 0.06, dz]} scale={0.9} />)}
        <mesh position={[0, 0.15, 0]} visible={false}><boxGeometry args={[0.5, 0.3, 0.4]} /></mesh>
      </group>
      <group ref={egg} visible={false}><mesh scale={[1, 1.3, 1]} material={shell}><sphereGeometry args={[0.06, 14, 10]} /></mesh></group>
      {/* two half shells (open side facing each other / down) */}
      <group ref={a} visible={false}><mesh rotation={[0, 0, Math.PI / 2]} scale={[1.3, 1, 1]} material={shell}><sphereGeometry args={[0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh></group>
      <group ref={b} visible={false}><mesh rotation={[0, 0, -Math.PI / 2]} scale={[1.3, 1, 1]} material={shell}><sphereGeometry args={[0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh></group>
      <group ref={yolk} visible={false}>
        <mesh material={mat('#f7b733')}><sphereGeometry args={[0.04, 12, 10]} /></mesh>
        <mesh position={[0, -0.01, 0]} scale={[1.6, 0.4, 1.6]} material={mat('#fffaf0', { opacity: 0.8 })}><sphereGeometry args={[0.05, 12, 8]} /></mesh>
      </group>
    </>
  )
}

/** a little knife (blade + handle), used for the butter and the strawberries */
function Knife({ r }: { r: React.RefObject<THREE.Group> }) {
  return (
    <group ref={r} visible={false}>
      <mesh position={[0, 0.07, 0]} material={mat('#e4e4ea')}><boxGeometry args={[0.012, 0.14, 0.2]} /></mesh>
      <mesh position={[0, 0.2, 0]} material={mat(C.woodDark)}><boxGeometry args={[0.03, 0.12, 0.05]} /></mesh>
    </group>
  )
}

/** butter: the knife CUTS a slice off the end of the block; the slice drops into the bowl */
function Butter({ home }: { home: [number, number, number] }) {
  const knife = useRef<THREE.Group>(null), slice = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const k = pourPhase('butter'), kn = knife.current, sl = slice.current; if (!kn || !sl) return
    if (k === null) { kn.visible = false; sl.visible = false; return }
    const endX = home[0] - 0.08
    // the knife comes down through the block, upright, edge first (.0-.35), then lifts away (.35-.5)
    kn.visible = k < 0.55
    const down = ease(seg(k, 0.08, 0.35)), up = ease(seg(k, 0.38, 0.55))
    kn.position.set(endX, home[1] + 0.32 - down * 0.27 + up * 0.35, home[2]); kn.rotation.set(0, Math.PI / 2, 0)
    // the slice tips away from the block (.35-.45), then arcs to the bowl and drops in (.45-.9)
    sl.visible = k > 0.33 && k < 0.92
    const tipAway = seg(k, 0.35, 0.45), fly = ease(seg(k, 0.45, 0.9))
    const sx = endX - 0.03 - tipAway * 0.03, sy = home[1] + 0.08
    sl.position.set(sx + (BOWL[0] - sx) * fly, sy + (BOWL[1] + 0.16 - sy) * fly + Math.sin(fly * Math.PI) * 0.35, home[2] + (BOWL[2] - home[2]) * fly)
    sl.rotation.set(0, 0, tipAway * 0.4 + fly * 2)
  })
  return (
    <>
      <group position={home} name="kitchen:butter" onClick={click(() => useKitchen.getState().add('butter'))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <mesh position={[0, 0.02, 0]} material={mat(C.white)}><cylinderGeometry args={[0.18, 0.18, 0.03, 20]} /></mesh>
        <RBox size={[0.22, 0.1, 0.13]} pos={[0, 0.08, 0]} color="#f7dd77" r={0.02} shadow={false} />
        <mesh position={[0, 0.12, 0]} visible={false}><boxGeometry args={[0.4, 0.25, 0.4]} /></mesh>
      </group>
      <Knife r={knife} />
      <mesh ref={slice} visible={false} material={mat('#f7dd77')}><boxGeometry args={[0.035, 0.1, 0.13]} /></mesh>
    </>
  )
}

/** the flavour extra: chocolate → the cocoa tin tips (powder falls); strawberry → a berry is CHOPPED on the board
 *  and the halves drop in. (Clicking either adds the extra for the bowl's flavour.) */
function Extra({ home }: { home: [number, number, number] }) {
  const berry = useRef<THREE.Group>(null), h1 = useRef<THREE.Mesh>(null), h2 = useRef<THREE.Mesh>(null), knife = useRef<THREE.Group>(null)
  const isStraw = () => useKitchen.getState().bowl.flavour === 'strawberry'
  const BOARD: [number, number, number] = [8.35, TOP + 0.06, CZ + 0.1]
  useFrame(() => {
    let k = pourPhase('extra'); if (k !== null && !isStraw()) k = null
    const b = berry.current, a1 = h1.current, a2 = h2.current, kn = knife.current; if (!b || !a1 || !a2 || !kn) return
    if (k === null) { b.visible = a1.visible = a2.visible = kn.visible = false; return }
    // hop onto the board (0-.2), chop chop chop (.2-.5), halves fly into the bowl (.52-.9)
    const hop = ease(seg(k, 0, 0.2)); b.visible = k < 0.5
    b.position.set(home[0] + 0.15 + (BOARD[0] - home[0] - 0.15) * hop, home[1] + (BOARD[1] - home[1]) * hop + Math.sin(hop * Math.PI) * 0.2, home[2] + (BOARD[2] - home[2]) * hop)
    kn.visible = k > 0.18 && k < 0.55
    const chop = Math.abs(Math.sin(seg(k, 0.2, 0.5) * Math.PI * 3))
    kn.position.set(BOARD[0], BOARD[1] + 0.03 + chop * 0.14, BOARD[2]); kn.rotation.set(0, 0, 0)
    const fly = ease(seg(k, 0.52, 0.9)), show = k >= 0.5 && k < 0.92; a1.visible = a2.visible = show
    for (const [m, dx] of [[a1, -0.03], [a2, 0.03]] as const) {
      const sx = BOARD[0] + dx, sy = BOARD[1] + 0.03
      m.position.set(sx + (BOWL[0] + dx - sx) * fly, sy + (BOWL[1] + 0.16 - sy) * fly + Math.sin(fly * Math.PI) * 0.3, BOARD[2] + (BOWL[2] - BOARD[2]) * fly)
      m.rotation.set(0, 0, dx > 0 ? -fly * 2 : fly * 2) }
  })
  const red = mat('#d83a4c')
  return (
    <>
      {/* the cocoa tin pours like the others (only when the bowl is chocolate) */}
      <Pourer part="extra" name="kitchen:extra" home={[home[0] - 0.1, home[1], home[2]]} h={0.13} tip={2.2} kind="cocoa" size={[0.3, 0.3, 0.35]} when={() => !isStraw()}>
        <Model name="fk:can-small" scale={0.8} />
      </Pourer>
      <group position={[home[0] + 0.15, home[1], home[2]]} name="kitchen:berries" onClick={click(() => useKitchen.getState().add('extra'))} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        {[[-0.03, 0.02], [0.05, -0.05], [-0.01, -0.1]].map(([dx, dz], i) => <Model key={i} name="fk:strawberry" pos={[dx, 0, dz]} scale={0.8} />)}
        <mesh position={[0, 0.1, -0.04]} visible={false}><boxGeometry args={[0.25, 0.22, 0.3]} /></mesh>
      </group>
      <group ref={berry} visible={false}><Model name="fk:strawberry" scale={0.8} /></group>
      <mesh ref={h1} visible={false} material={red}><sphereGeometry args={[0.045, 10, 8, 0, Math.PI]} /></mesh>
      <mesh ref={h2} visible={false} material={red}><sphereGeometry args={[0.045, 10, 8, Math.PI, Math.PI]} /></mesh>
      <Knife r={knife} />
    </>
  )
}

const MIX = new THREE.Color(), PALE = new THREE.Color('#efe2c8'), TO = new THREE.Color()
function Bowl() {
  const fill = useRef<THREE.Mesh>(null), flecks = useRef<THREE.Group>(null), whisk = useRef<THREE.Group>(null), swirl = useRef<THREE.Mesh>(null)
  const fillMat = useMemo(() => mat('#efe2c8').clone(), [])
  useFrame((_, dt) => {
    const k = useKitchen.getState(); k.stirBy(Math.min(dt, 0.1))
    const b = k.bowl, f = b.flavour
    const total = f ? PARTS.reduce((a, p) => a + needs(f, p), 0) : 1, got = PARTS.reduce((a, p) => a + b.added[p], 0)
    const lvl = f ? got / total : 0, y = 0.07 + lvl * 0.17
    if (fill.current) { fill.current.visible = lvl > 0; fill.current.position.y = y; fill.current.scale.setScalar(0.62 + lvl * 0.33) }
    TO.set(f ? SPONGE_COL[f] : '#efe2c8'); MIX.copy(PALE).lerp(TO, b.stir); fillMat.color.copy(MIX)
    if (flecks.current) { flecks.current.visible = lvl > 0 && b.stir < 0.95; flecks.current.position.y = y + 0.01; flecks.current.rotation.y += k.stirring ? dt * 9 : 0; flecks.current.scale.setScalar(1 - b.stir * 0.8) }
    if (swirl.current) { swirl.current.visible = k.stirring; swirl.current.position.y = y + 0.012; swirl.current.rotation.z += dt * 10 }
    if (whisk.current) { const t = performance.now() / 1000
      // stirring: stand it up in the bowl, head down, circling; at rest: lying on the counter beside the bowl
      if (k.stirring) { whisk.current.position.set(Math.cos(t * 12) * 0.08, 0.6, Math.sin(t * 12) * 0.08); whisk.current.rotation.set(Math.sin(t * 12) * 0.2, 0, Math.PI / 2 + Math.cos(t * 12) * 0.2) }
      else { whisk.current.position.set(0.12, 0.0, 0.36); whisk.current.rotation.set(0, 0.15, 0) } } // in front of the bowl, clear of the butter
  })
  const down = (e: ThreeEvent<PointerEvent>) => { if (!inKitchen()) return; e.stopPropagation(); useKitchen.getState().setStirring(true); const up = () => { useKitchen.getState().setStirring(false); window.removeEventListener('pointerup', up) }; window.addEventListener('pointerup', up) }
  return (
    <group position={BOWL}>
      <Model name="fk:bowl" scale={1.3} />
      <mesh ref={fill} material={fillMat} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.3, 28]} /></mesh>
      <mesh ref={swirl} rotation={[-Math.PI / 2, 0, 0]} material={mat('#ffffff', { opacity: 0.35 })}><ringGeometry args={[0.08, 0.13, 24, 1, 0, Math.PI * 1.3]} /></mesh>
      <group ref={flecks}>{[['#ffffff', 0.12, 0.05], ['#f7dd77', -0.1, 0.08], ['#fbf3e6', 0.02, -0.12], ['#f7b733', -0.13, -0.06]].map(([c, x, z], i) =>
        <mesh key={i} position={[x as number, 0, z as number]} material={mat(c as string)}><sphereGeometry args={[0.045, 8, 6]} /></mesh>)}</group>
      {/* the whisk: press and hold it to stir (it rises into the bowl and circles) */}
      <group ref={whisk} name="kitchen:whisk" onPointerDown={down} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <Model name="fk:whisk" scale={0.75} pos={[-0.27, 0, 0]} />
        <mesh position={[0, 0.15, 0]} visible={false}><boxGeometry args={[0.45, 0.45, 0.35]} /></mesh>
      </group>
    </group>
  )
}

/** the batter shelf: one tub per flavour, filled to how many layers wait for the cake bench */
function BatterShelf() {
  const tubs = useRef<Record<Flavour, THREE.Mesh | null>>({ vanilla: null, chocolate: null, strawberry: null })
  useFrame(() => { const b = useKitchen.getState().batter; for (const f of ['vanilla', 'chocolate', 'strawberry'] as Flavour[]) { const m = tubs.current[f]; if (m) { const n = Math.min(6, b[f]); m.visible = n > 0; m.scale.y = Math.max(0.05, n / 6); m.position.y = 0.05 + (n / 6) * 0.13 } } })
  return (
    <group position={[KX0 + 0.3, 0, -8.45]}>
      <RBox size={[0.45, 0.95, 1.2]} pos={[0, 0.475, 0]} color={C.lilac} r={0.05} />
      {(['vanilla', 'chocolate', 'strawberry'] as Flavour[]).map((f, i) => (
        <group key={f} position={[0, 0.95, -0.38 + i * 0.38]} scale={0.8} name={`kitchen:batter-${f}`}>
          <mesh position={[0, 0.14, 0]} material={mat(C.white, { opacity: 0.6 })}><cylinderGeometry args={[0.17, 0.15, 0.28, 18, 1, true]} /></mesh>
          <mesh ref={(m) => { tubs.current[f] = m }} material={mat(SPONGE_COL[f])}><cylinderGeometry args={[0.16, 0.14, 0.26, 18]} /></mesh>
        </group>))}
    </group>
  )
}

/** curtain: a cloth with soft folds (a displaced plane), hanging from a rod */
function Curtain({ from, to, h = 2.95, color, rotY = 0 }: { from: [number, number]; to: [number, number]; h?: number; color: string; rotY?: number }) {
  const geo = useMemo(() => {
    const w = Math.hypot(to[0] - from[0], to[1] - from[1]), g = new THREE.PlaneGeometry(w, h, Math.max(8, Math.round(w * 10)), 6), p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 7.5) * 0.07 * (0.75 + 0.25 * (y / h + 0.5))) }
    g.computeVertexNormals(); return g
  }, [from, to, h])
  const m = useMemo(() => { const x = mat(color, { rough: 0.9 }).clone(); x.side = THREE.DoubleSide; return x }, [color])
  return <mesh geometry={geo} material={m} position={[(from[0] + to[0]) / 2, 0.18 + h / 2, (from[1] + to[1]) / 2]} rotation={[0, rotY, 0]} castShadow />
}

function SideCurtain() {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current) g.current.visible = useGame.getState().mode !== 'kitchen' })
  return <group ref={g}><Curtain from={[KX0 - 0.1, KZ_BACK]} to={[KX0 - 0.1, KZ_FRONT]} color="#cdb8e6" rotY={Math.PI / 2} /></group>
}

export function KitchenRoom() {
  const z = CZ - 0.1
  return (
    <group name="prep-kitchen">
      {/* the prep counter along the back wall, cupboards below, a tiled splashback */}
      <RBox size={[KX1 - KX0 - 0.3, TOP, 0.9]} pos={[(KX0 + KX1) / 2 + 0.05, TOP / 2, CZ]} color={C.mint} r={0.06} />
      <RBox size={[KX1 - KX0 - 0.2, 0.06, 1.0]} pos={[(KX0 + KX1) / 2 + 0.05, TOP + 0.01, CZ]} color={C.counterTop} r={0.03} />
      {[5.2, 6.2, 7.2, 8.1].map((x) => <RBox key={x} size={[0.8, 0.7, 0.03]} pos={[x, 0.45, CZ + 0.46]} color={C.lilac} r={0.04} shadow={false} />)}
      {[5.2, 6.2, 7.2, 8.1].map((x) => <mesh key={`k${x}`} position={[x, 0.62, CZ + 0.49]} material={mat(C.butter)}><sphereGeometry args={[0.035, 10, 8]} /></mesh>)}
      {Array.from({ length: 20 }, (_, i) => <mesh key={`t${i}`} position={[4.75 + (i % 10) * 0.4, TOP + 0.3 + Math.floor(i / 10) * 0.32, -9.93]} material={mat(i % 3 ? '#fff6ee' : '#ffe1ec')}><planeGeometry args={[0.37, 0.29]} /></mesh>)}
      {/* the ingredients: tap / click one and it does its job (pour, sift, crack, cut, chop) into the bowl */}
      <Pourer part="flour" name="kitchen:flour" home={[5.0, TOP, z]} h={0.5} tip={2.1} kind="flour" sift size={[0.4, 0.6, 0.45]}>
        <Model name="fk:bag" scale={0.62} />
      </Pourer>
      <Pourer part="sugar" name="kitchen:sugar" home={[5.5, TOP, z]} h={0.4} tip={1.9} kind="sugar" size={[0.35, 0.45, 0.35]}
        lid={<mesh position={[0, 0.42, 0]} material={mat(C.counter)}><cylinderGeometry args={[0.16, 0.16, 0.05, 18]} /></mesh>}>
        <mesh position={[0, 0.2, 0]} material={mat('#f3eef7', { opacity: 0.5 })}><cylinderGeometry args={[0.15, 0.15, 0.4, 18]} /></mesh>
        <mesh position={[0, 0.14, 0]} material={mat('#ffffff')}><cylinderGeometry args={[0.135, 0.135, 0.26, 18]} /></mesh>
      </Pourer>
      <Eggs home={[6.0, TOP, z + 0.02]} />
      <Bowl />
      <Butter home={[7.3, TOP, z]} />
      <Extra home={[7.8, TOP, z]} />
      {/* the tools: board, rolling pin, knife block, spoon, a pot */}
      <Model name="fk:cutting-board" pos={[8.35, TOP + 0.02, CZ + 0.1]} rot={[0, Math.PI / 2, 0]} scale={0.7} />
      <Model name="fk:rollingPin" pos={[8.35, TOP + 0.1, CZ + 0.1]} scale={0.5} />
      <Model name="fk:knife-block" pos={[8.4, TOP + 0.18, -9.78]} scale={0.6} />
      <Model name="fk:cooking-spoon" pos={[6.0, TOP + 0.02, CZ + 0.32]} rot={[0, 0.4, 0]} scale={0.6} />
      {/* a wall shelf: bread, pastries, jars */}
      <RBox size={[2.6, 0.06, 0.34]} pos={[6.6, 2.15, -9.78]} color={C.wood} r={0.02} shadow={false} />
      <Model name="fk:loaf" pos={[5.6, 2.18, -9.78]} scale={0.55} />
      <Model name="fk:croissant" pos={[6.15, 2.18, -9.78]} scale={0.6} />
      <Model name="fk:muffin" pos={[6.6, 2.18, -9.78]} scale={0.6} />
      <Model name="fk:cupcake" pos={[7.0, 2.18, -9.78]} scale={0.6} />
      <Model name="fk:honey" pos={[7.45, 2.18, -9.78]} scale={0.55} />
      <Model name="fk:peanut-butter" pos={[7.85, 2.18, -9.78]} scale={0.6} />
      <Model name="fk:pot" pos={[8.35, 0.02, -7.4]} scale={0.7} />
      <BatterShelf />
      {/* curtains: a rod across the front with a doorway, and down the side facing the bar */}
      <mesh position={[(KX0 + KX1) / 2, 3.18, KZ_FRONT]} rotation={[0, 0, Math.PI / 2]} material={mat(C.plum)}><cylinderGeometry args={[0.035, 0.035, KX1 - KX0 + 0.2, 8]} /></mesh>
      <mesh position={[KX0 - 0.1, 3.18, (KZ_FRONT + KZ_BACK) / 2]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.035, 0.035, KZ_FRONT - KZ_BACK, 8]} /></mesh>
      <Curtain from={[KX0 - 0.1, KZ_FRONT]} to={[KITCHEN_DOOR[0], KZ_FRONT]} color="#f4b6c8" />
      <Curtain from={[KITCHEN_DOOR[1], KZ_FRONT]} to={[KX1, KZ_FRONT]} color="#f4b6c8" />
      <SideCurtain />
      {KITCHEN_DOOR.map((x) => <mesh key={x} position={[x, 1.6, KZ_FRONT + 0.05]} material={mat(C.purple)}><torusGeometry args={[0.09, 0.03, 8, 16]} /></mesh>)}
      {/* a warm lamp over the counter */}
      <pointLight position={[6.6, 3.0, -8.6]} intensity={2.2} distance={5.5} color="#ffe2c4" />
    </group>
  )
}
