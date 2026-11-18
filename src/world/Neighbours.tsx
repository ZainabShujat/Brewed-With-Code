import { useMemo } from 'react'
import * as THREE from 'three'
import { C } from '../data/palette'
import { mat, glow } from './mats'
import { RBox } from './Soft'
import { nightGlow, shopGlass } from './Lighting'
import { STREET as S, SHOPS, SHOP_DEPTH, PARK, BUS_STOP, CART, type Shop } from './streetLayout'

// The neighbours: shopfronts along the street (human scale, 1 unit ≈ 1 m). Four of them are REAL shops that sell
// the café's ingredients (The Daily Grind, Moo & Oat, Flour & Co., Sugar Plum: walk up to the door to buy);
// the bookshop and the florist are just lovely neighbours. Each building has its own roof (pitched gable, mansard
// with dormers, a curvy Dutch gable, or flat with a parapet), pilasters and a cornice, a hanging icon sign, a
// striped scalloped awning, a lit window full of what it sells, goods out on the pavement, and upstairs windows.

// ── canvas textures: shop signs, round icon signs, awning stripes, burlap ──
function canvas(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t
}
const signTex = (text: string, bg: string, fg = '#fbf3e6') => canvas(512, 128, (x) => {
  x.fillStyle = bg; x.fillRect(0, 0, 512, 128); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(10, 10, 492, 108)
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'
  let size = 70; x.font = `bold ${size}px 'Trebuchet MS', sans-serif`
  while (x.measureText(text).width > 440 && size > 30) { size -= 4; x.font = `bold ${size}px 'Trebuchet MS', sans-serif` }
  x.fillText(text, 256, 68)
})
const iconTex = (icon: string, bg: string) => canvas(256, 256, (x) => {
  x.fillStyle = bg; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill()
  x.strokeStyle = '#fbf3e6'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 110, 0, Math.PI * 2); x.stroke()
  x.font = "140px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(icon, 128, 138)
})
const stripeTex = (a: string, b: string, n: number) => { const t = canvas(256, 16, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 32, 0, 32, 16) } }); if (t) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(n / 8, 1) } return t }

// signs made once and shared (never inside a condition)
const once = <T,>(make: () => T) => { let v: T | undefined; return () => (v ??= make()) }
const toLetMat = once(() => new THREE.MeshStandardMaterial({ map: signTex('TO LET', '#fbf3e6', '#d4364f') }))
const busMat = once(() => new THREE.MeshStandardMaterial({ map: signTex('BUS', '#e98fa6') }))
const burlap = '#b98d5f', beanC = '#4a2c20'
const darker = (hex: string, k = 0.72) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString()

// ── window displays (what each shop sells) ──
function Shelves({ w }: { w: number }) {
  return <group>{[1.25, 2.05].map((y) => <mesh key={y} position={[0, y, 0.18]} material={mat(C.wood)}><boxGeometry args={[w, 0.05, 0.3]} /></mesh>)}</group>
}
function Display({ shop, w }: { shop: Shop; w: number }) {
  const cols = [C.counter, C.mint, C.butter, C.lilac, C.purple, '#e98fa6', '#8ab6d6']
  const n = Math.max(3, Math.floor(w / 0.5)), xs = (k: number) => Array.from({ length: k }, (_, i) => -w / 2 + 0.3 + i * (w - 0.6) / Math.max(1, k - 1))
  switch (shop.kind) {
    case 'books': return (
      <group>{[0.95, 1.55, 2.15].map((y, r) => Array.from({ length: n }, (_, i) => (
        <mesh key={`${r}-${i}`} position={[-w / 2 + 0.25 + i * (w - 0.5) / (n - 1), y + ((i * 7 + r) % 3) * 0.04, 0.12]} material={mat(cols[(i * 3 + r) % cols.length])}><boxGeometry args={[0.16, 0.42 + ((i + r) % 3) * 0.06, 0.24]} /></mesh>
      )))}</group>)
    case 'coffee': return ( // jars of beans on the shelves, burlap sacks below, a little roaster drum
      <group>
        <Shelves w={w} />
        {[1.28, 2.08].map((y) => xs(Math.floor(w / 0.55)).map((x, i) => (
          <group key={`${y}${i}`} position={[x, y + 0.2, 0.18]}>
            <mesh material={mat('#e9f1f2', { opacity: 0.5 })}><cylinderGeometry args={[0.15, 0.15, 0.36, 12]} /></mesh>
            <mesh position={[0, -0.04, 0]} material={mat(i % 3 ? beanC : '#6b3f2a')}><cylinderGeometry args={[0.135, 0.135, 0.26, 12]} /></mesh>
            <mesh position={[0, 0.2, 0]} material={mat(i % 2 ? C.butter : '#c9a27e')}><cylinderGeometry args={[0.16, 0.16, 0.05, 12]} /></mesh>
          </group>)))}
        {xs(3).map((x, i) => <group key={i} position={[x, 0.85, 0.2]}><RBox size={[0.55, 0.42, 0.35]} pos={[0, 0, 0]} color={burlap} r={0.12} /><mesh position={[0, 0.2, 0]} material={mat(beanC)}><sphereGeometry args={[0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh></group>)}
      </group>)
    case 'dairy': return ( // rows of milk bottles with coloured caps, cream jugs, butter blocks
      <group>
        <Shelves w={w} />
        {[1.28, 2.08].map((y, r) => xs(Math.floor(w / 0.32)).map((x, i) => (
          <group key={`${y}${i}`} position={[x, y + 0.2, 0.18]}>
            <mesh material={mat('#fbfbf6')}><cylinderGeometry args={[0.09, 0.1, 0.34, 12]} /></mesh>
            <mesh position={[0, 0.2, 0]} material={mat(['#3c6f9a', '#7fbf8f', '#d9b58a'][(i + r) % 3])}><cylinderGeometry args={[0.055, 0.055, 0.06, 10]} /></mesh>
          </group>)))}
        {xs(4).map((x, i) => i % 2 ? <RBox key={i} size={[0.4, 0.16, 0.22]} pos={[x, 0.78, 0.2]} color="#f6d977" r={0.04} />
          : <mesh key={i} position={[x, 0.86, 0.2]} material={mat('#ffffff')}><cylinderGeometry args={[0.14, 0.17, 0.32, 14]} /></mesh>)}
      </group>)
    case 'baking': return ( // flour sacks, egg boxes, sugar jars and a couple of loaves
      <group>
        <Shelves w={w} />
        {xs(Math.floor(w / 0.7)).map((x, i) => (
          <group key={`e${i}`} position={[x, 1.38, 0.18]}>
            <mesh material={mat('#d6c3a4')}><boxGeometry args={[0.5, 0.12, 0.26]} /></mesh>
            {[-0.16, -0.05, 0.06, 0.17].map((ex) => <mesh key={ex} position={[ex, 0.09, 0]} material={mat(i % 2 ? '#f6ead8' : '#e8c9a0')}><sphereGeometry args={[0.055, 10, 8]} /></mesh>)}
          </group>))}
        {xs(Math.floor(w / 0.6)).map((x, i) => i % 2
          ? <mesh key={`l${i}`} position={[x, 2.2, 0.18]} rotation={[0, 0, Math.PI / 2]} material={mat('#c98a4b')}><capsuleGeometry args={[0.1, 0.3, 4, 10]} /></mesh>
          : <mesh key={`l${i}`} position={[x, 2.25, 0.18]} material={mat('#f4f1ec', { opacity: 0.85 })}><cylinderGeometry args={[0.13, 0.13, 0.36, 12]} /></mesh>)}
        {xs(3).map((x, i) => <group key={i} position={[x, 0.85, 0.2]}><RBox size={[0.5, 0.5, 0.32]} pos={[0, 0, 0]} color="#f4ecd8" r={0.1} /><mesh position={[0, 0.02, 0.17]} material={mat('#3c6f9a')}><planeGeometry args={[0.42, 0.08]} /></mesh></group>)}
      </group>)
    case 'sweets': return ( // jars of sprinkles and sweets, baskets of strawberries and cherries, lollipops
      <group>
        <Shelves w={w} />
        {[1.28, 2.08].map((y, r) => xs(Math.floor(w / 0.42)).map((x, i) => (
          <group key={`${y}${i}`} position={[x, y + 0.18, 0.18]}>
            <mesh material={mat('#eef6f8', { opacity: 0.45 })}><cylinderGeometry args={[0.14, 0.14, 0.32, 12]} /></mesh>
            {[0, 1, 2].map((j) => <mesh key={j} position={[0, -0.1 + j * 0.08, 0]} material={mat(cols[(i + j + r) % cols.length])}><cylinderGeometry args={[0.125, 0.125, 0.08, 12]} /></mesh>)}
            <mesh position={[0, 0.18, 0]} material={mat('#e98fa6')}><sphereGeometry args={[0.07, 10, 8]} /></mesh>
          </group>)))}
        {xs(3).map((x, i) => (
          <group key={i} position={[x, 0.82, 0.2]}>
            <mesh material={mat('#c99a63')}><cylinderGeometry args={[0.28, 0.22, 0.2, 14]} /></mesh>
            {Array.from({ length: 7 }, (_, j) => <mesh key={j} position={[Math.cos(j * 0.9) * 0.15, 0.13 + (j % 2) * 0.04, Math.sin(j * 0.9) * 0.1]} material={mat(i === 1 ? '#a3122e' : '#e0324f')}><sphereGeometry args={[0.065, 10, 8]} /></mesh>)}
          </group>))}
      </group>)
    default: return null
  }
}

// goods out on the pavement, in front of the window
function StreetGoods({ shop, w }: { shop: Shop; w: number }) {
  const x0 = -w * 0.14 // in front of the window
  if (shop.kind === 'flowers') return <FlowerBuckets w={w * 0.5} />
  if (shop.kind === 'coffee') return (
    <group position={[x0, 0.16, 0.75]}>
      {[-1.4, -0.75, 1.3].map((x, i) => <group key={x} position={[x, 0, (i % 2) * 0.15]}><RBox size={[0.6, 0.75, 0.45]} pos={[0, 0.38, 0]} color={burlap} r={0.16} /><mesh position={[0, 0.78, 0]} material={mat(beanC)}><sphereGeometry args={[0.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh></group>)}
    </group>)
  if (shop.kind === 'dairy') return (
    <group position={[x0, 0.16, 0.75]}>
      {[-1.2, 1.2].map((x) => <group key={x} position={[x, 0, 0]}>
        {[0, 0.42].map((y) => <group key={y} position={[0, y, 0]}><mesh position={[0, 0.2, 0]} material={mat('#3c6f9a')}><boxGeometry args={[0.7, 0.4, 0.5]} /></mesh>
          {[-0.2, 0, 0.2].map((bx) => <mesh key={bx} position={[bx, 0.45, 0]} material={mat('#fbfbf6')}><cylinderGeometry args={[0.07, 0.08, 0.28, 10]} /></mesh>)}</group>)}
      </group>)}
    </group>)
  if (shop.kind === 'baking') return (
    <group position={[x0, 0.16, 0.75]}>
      <mesh position={[0, 0.07, 0]} material={mat(C.wood)}><boxGeometry args={[2.2, 0.14, 0.9]} /></mesh>
      {[-0.65, 0, 0.65].map((x, i) => <RBox key={x} size={[0.55, 0.7 - (i % 2) * 0.08, 0.4]} pos={[x, 0.5, 0]} color="#f4ecd8" r={0.14} />)}
    </group>)
  if (shop.kind === 'sweets') return (
    <group position={[x0, 0.16, 0.8]}>
      <mesh position={[0, 0.55, 0]} rotation={[-0.35, 0, 0]} material={mat('#c99a63')}><boxGeometry args={[2.2, 0.12, 0.8]} /></mesh>
      {[-0.8, -0.27, 0.27, 0.8].map((x, i) => <group key={x} position={[x, 0.7, 0.05]} rotation={[-0.35, 0, 0]}>
        {Array.from({ length: 6 }, (_, j) => <mesh key={j} position={[(j % 3 - 1) * 0.13, 0, (Math.floor(j / 3) - 0.5) * 0.2]} material={mat(i % 2 ? '#a3122e' : '#e0324f')}><sphereGeometry args={[0.08, 10, 8]} /></mesh>)}</group>)}
      {[-1.2, 1.2].map((x) => <mesh key={x} position={[x, 0.27, 0]} material={mat('#9a6b3c')}><boxGeometry args={[0.08, 0.55, 0.6]} /></mesh>)}
    </group>)
  return null
}
// flower buckets out on the pavement in front of the florist
function FlowerBuckets({ w }: { w: number }) {
  const cols = ['#e98fa6', C.butter, C.lilac, '#ffffff', '#f2a2c0', C.mint]
  return (
    <group position={[0, 0, 0.75]}>{Array.from({ length: Math.floor(w / 0.9) }, (_, i) => (
      <group key={i} position={[-w / 2 + 0.6 + i * 0.9, 0.16, (i % 2) * 0.3]}>
        <mesh position={[0, 0.25, 0]} material={mat('#8a8f99', { rough: 0.4 })}><cylinderGeometry args={[0.24, 0.19, 0.5, 14]} /></mesh>
        {Array.from({ length: 6 }, (_, j) => <mesh key={j} position={[Math.cos(j) * 0.12, 0.62 + (j % 3) * 0.08, Math.sin(j) * 0.12]} material={mat(cols[(i + j) % cols.length])}><sphereGeometry args={[0.1, 10, 8]} /></mesh>)}
      </group>))}</group>)
}

// ── roofs: each building gets its own silhouette ──
function RoofShape({ shop, w }: { shop: Shop; w: number }) {
  const h = shop.h, D = SHOP_DEPTH, tile = darker(shop.trim, 0.85)
  const geo = useMemo(() => {
    if (shop.roof === 'gable') { // pitched roof, gable end facing the street
      const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.3, 0); s.lineTo(w / 2 + 0.3, 0); s.lineTo(0, Math.min(3.2, w * 0.24)); s.closePath()
      const g = new THREE.ExtrudeGeometry(s, { depth: D + 0.3, bevelEnabled: false }); g.translate(0, 0, -D - 0.15); return g }
    if (shop.roof === 'mansard') { // steep lower slope + flat top, front to back
      const s = new THREE.Shape(); s.moveTo(0.35, 0); s.lineTo(-0.7, 2.3); s.lineTo(-D + 0.7, 2.3); s.lineTo(-D - 0.35, 0); s.closePath()
      const g = new THREE.ExtrudeGeometry(s, { depth: w + 0.3, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-w / 2 - 0.15, 0, 0); return g }
    if (shop.roof === 'dutch') { // a curvy stepped gable on the facade
      const s = new THREE.Shape(), a = w / 2 + 0.1, t = Math.min(2.8, w * 0.2)
      s.moveTo(-a, 0); s.lineTo(-a, t * 0.3); s.quadraticCurveTo(-a * 0.62, t * 0.32, -a * 0.55, t * 0.62); s.lineTo(-a * 0.32, t * 0.66)
      s.quadraticCurveTo(-a * 0.28, t, 0, t * 1.05); s.quadraticCurveTo(a * 0.28, t, a * 0.32, t * 0.66); s.lineTo(a * 0.55, t * 0.62)
      s.quadraticCurveTo(a * 0.62, t * 0.32, a, t * 0.3); s.lineTo(a, 0); s.closePath()
      return new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }) }
    return null
  }, [shop.roof, w, D])
  return (
    <group position={[0, h + 0.42, 0]}>
      {shop.roof === 'gable' && geo && <mesh geometry={geo} material={mat(tile)} castShadow />}
      {shop.roof === 'mansard' && geo && <>
        <mesh geometry={geo} material={mat(tile)} castShadow />
        {[-w * 0.25, w * 0.25].map((x) => <group key={x} position={[x, 1.05, -0.2]}>
          <mesh material={mat(shop.trim)}><boxGeometry args={[1.2, 1.25, 0.9]} /></mesh>
          <mesh position={[0, 0.78, 0]} rotation={[0, Math.PI / 4, 0]} material={mat(tile)}><coneGeometry args={[0.95, 0.5, 4]} /></mesh>
          <mesh position={[0, -0.05, 0.46]} material={shopGlass}><planeGeometry args={[0.8, 0.85]} /></mesh>
        </group>)}
      </>}
      {shop.roof === 'dutch' && geo && <>
        <mesh geometry={geo} position={[0, 0, -0.35]} material={mat(shop.wall)} castShadow />
        <mesh position={[0, Math.min(2.8, w * 0.2) * 0.55, 0.07]} material={mat(shop.trim)}><circleGeometry args={[0.45, 20]} /></mesh>
      </>}
      {shop.roof === 'flat' && [-w / 2, w / 2].map((x) => <mesh key={x} position={[x, 0.3, -0.05]} material={mat(shop.trim)}><boxGeometry args={[0.4, 0.6, 0.6]} /></mesh>)}
    </group>
  )
}

// a round icon sign hanging off a bracket, readable from down the street
function BladeSign({ shop, w }: { shop: Shop; w: number }) {
  const m = useMemo(() => shop.icon ? new THREE.MeshStandardMaterial({ map: iconTex(shop.icon, shop.trim), roughness: 0.6 }) : null, [shop.icon, shop.trim])
  if (!m) return null
  return (
    <group position={[-w / 2 + 0.55, 5.4, 0]}>
      <mesh position={[0, 0.55, 0.55]} material={mat(C.plum)}><boxGeometry args={[0.06, 0.06, 1.1]} /></mesh>
      <mesh position={[0, 0, 0.85]} rotation={[0, Math.PI / 2, 0]} material={m}><circleGeometry args={[0.5, 28]} /></mesh>
      <mesh position={[0, 0, 0.85]} rotation={[0, -Math.PI / 2, 0]} material={m}><circleGeometry args={[0.5, 28]} /></mesh>
      <mesh position={[0, 0, 0.85]} rotation={[0, 0, Math.PI / 2]} material={mat(shop.trim)}><torusGeometry args={[0.5, 0.04, 6, 28]} /></mesh>
    </group>
  )
}

function Shop({ shop }: { shop: Shop }) {
  const w = shop.x1 - shop.x0, h = shop.h, D = SHOP_DEPTH, lease = shop.kind === 'lease'
  const sign = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(shop.name, lease ? '#c4527e' : shop.trim), roughness: 0.6 }), [shop.name, shop.trim, lease])
  const awning = useMemo(() => new THREE.MeshStandardMaterial({ map: stripeTex(shop.awning[0], shop.awning[1], Math.round(w * 2)), roughness: 0.8, side: THREE.DoubleSide }), [shop.awning, w])
  const win = w * 0.56, winX = -w * 0.14, doorX = w * 0.32, ups = Math.max(2, Math.floor(w / 4.5))
  // local: shopfront at z = 0 facing +z; the building runs back to z = -D
  const cx = (shop.x0 + shop.x1) / 2
  const pos: [number, number, number] = shop.side === 'a' ? [cx, 0, S.padA[0]] : [cx, 0, S.padB[1]]
  return (
    <group position={pos} rotation={[0, shop.side === 'a' ? 0 : Math.PI, 0]}>
      <mesh position={[0, h / 2, -D / 2]} material={mat(shop.wall)} castShadow receiveShadow><boxGeometry args={[w, h, D]} /></mesh>
      {/* pilasters at the corners, a string course between the floors and a cornice with little dentils */}
      {[-w / 2, w / 2].map((x) => <mesh key={x} position={[x, h / 2, 0.1]} material={mat(shop.trim)}><boxGeometry args={[0.45, h, 0.3]} /></mesh>)}
      <mesh position={[0, 3.75, 0.1]} material={mat(shop.trim)}><boxGeometry args={[w + 0.1, 0.18, 0.28]} /></mesh>
      <mesh position={[0, h + 0.2, -0.05]} material={mat(shop.trim)}><boxGeometry args={[w + 0.4, 0.45, 0.6]} /></mesh>
      {Array.from({ length: Math.floor(w / 0.6) }, (_, i) => -w / 2 + 0.3 + i * 0.6).map((x) => <mesh key={x} position={[x, h - 0.08, 0.2]} material={mat(darker(shop.trim))}><boxGeometry args={[0.18, 0.16, 0.18]} /></mesh>)}
      <mesh position={[0, 0.25, 0.08]} material={mat(shop.trim)}><boxGeometry args={[w + 0.05, 0.5, 0.2]} /></mesh>
      <RoofShape shop={shop} w={w} />
      {/* the shop window (glows warmly at night) with mullions, and what's in it */}
      <group position={[winX, 0, 0.03]}>
        <mesh position={[0, 1.9, 0]} material={mat(shop.trim)}><boxGeometry args={[win + 0.3, 2.9, 0.12]} /></mesh>
        <mesh position={[0, 1.9, 0.07]} material={lease ? mat('#efe4cf') : shopGlass}><planeGeometry args={[win, 2.6]} /></mesh>
        {!lease && [-win / 4, win / 4].map((x) => <mesh key={x} position={[x, 1.9, 0.1]} material={mat(shop.trim)}><boxGeometry args={[0.07, 2.6, 0.05]} /></mesh>)}
        {!lease && <mesh position={[0, 2.75, 0.1]} material={mat(shop.trim)}><boxGeometry args={[win, 0.06, 0.05]} /></mesh>}
        {lease ? (
          <group position={[0, 1.9, 0.09]}>
            {[0.55, -0.55].map((r) => <mesh key={r} rotation={[0, 0, r]} material={mat('#d2c0a2')}><planeGeometry args={[win * 1.05, 0.12]} /></mesh>)}
          </group>
        ) : <Display shop={shop} w={win - 0.3} />}
        <mesh position={[0, 0.62, 0.22]} material={mat(shop.trim)}><boxGeometry args={[win + 0.3, 0.1, 0.4]} /></mesh>
      </group>
      {/* the door, with a step and a little lamp */}
      <group position={[doorX, 0, 0.04]}>
        <mesh position={[0, 1.3, 0]} material={mat(shop.trim)}><boxGeometry args={[1.5, 2.7, 0.14]} /></mesh>
        <mesh position={[0, 1.25, 0.08]} material={mat(lease ? '#b9a98c' : C.plum)}><boxGeometry args={[1.15, 2.4, 0.06]} /></mesh>
        {!lease && <mesh position={[0, 1.75, 0.12]} material={shopGlass}><planeGeometry args={[0.7, 0.8]} /></mesh>}
        <mesh position={[0.38, 1.2, 0.13]} material={mat(C.butter)}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
        <mesh position={[0, 0.06, 0.35]} material={mat('#d8cfc2')}><boxGeometry args={[1.7, 0.12, 0.6]} /></mesh>
        {!lease && <mesh position={[0, 2.95, 0.25]} material={glow()}><sphereGeometry args={[0.1, 10, 8]} /></mesh>}
      </group>
      {/* sign + striped, scalloped awning (the empty unit has a FOR LEASE board instead of an awning) */}
      <mesh position={[0, 4.3, 0.12]} material={sign}><planeGeometry args={[Math.min(w * 0.62, 7.5), Math.min(w * 0.62, 7.5) / 4.6]} /></mesh>
      <BladeSign shop={shop} w={w} />
      {!lease && (
        <group position={[winX * 0.4, 3.4, 0.05]}>
          <mesh position={[0, 0, 0.7]} rotation={[0.42, 0, 0]} material={awning}><planeGeometry args={[w * 0.92, 1.55]} /></mesh>
          {Array.from({ length: Math.round(w * 0.92 / 0.5) }, (_, i) => -w * 0.46 + 0.25 + i * 0.5).map((x, i) => (
            <mesh key={x} position={[x, -0.33, 1.42]} rotation={[0, 0, 0]} material={mat(i % 2 ? shop.awning[1] : shop.awning[0])}><circleGeometry args={[0.25, 12, Math.PI, Math.PI]} /></mesh>
          ))}
        </group>
      )}
      {lease && (
        <group position={[doorX - 2.6, 2.6, 0.5]}>
          <mesh position={[0, -1.3, 0]} material={mat(C.plum)}><boxGeometry args={[0.08, 2.6, 0.08]} /></mesh>
          <RBox size={[1.9, 0.9, 0.08]} pos={[0, 0, 0.05]} color="#fbf3e6" r={0.06} />
          <mesh position={[0, 0, 0.1]} material={toLetMat()}><planeGeometry args={[1.7, 0.42]} /></mesh>
        </group>
      )}
      {/* upstairs windows with shutters and flower boxes */}
      {Array.from({ length: ups }, (_, i) => -w / 2 + (w / ups) * (i + 0.5)).map((x) => (
        <group key={x} position={[x, h - 2.3, 0.03]}>
          <mesh material={mat(shop.trim)}><boxGeometry args={[1.5, 1.9, 0.12]} /></mesh>
          <mesh position={[0, 0, 0.07]} material={lease ? mat('#d8ccb6') : shopGlass}><planeGeometry args={[1.25, 1.65]} /></mesh>
          <mesh position={[0, 0, 0.09]} material={mat(shop.trim)}><boxGeometry args={[0.06, 1.65, 0.03]} /></mesh>
          {!lease && [-0.98, 0.98].map((sx) => <mesh key={sx} position={[sx, 0, 0.06]} material={mat(darker(shop.awning[0] === shop.trim ? shop.trim : shop.awning[0], 0.9))}><boxGeometry args={[0.42, 1.8, 0.05]} /></mesh>)}
          {!lease && <mesh position={[0, -1.05, 0.2]} material={mat(shop.trim)}><boxGeometry args={[1.5, 0.25, 0.35]} /></mesh>}
          {!lease && [-0.5, -0.17, 0.17, 0.5].map((fx, j) => <mesh key={fx} position={[fx, -0.86, 0.22]} material={mat([C.counter, C.butter, C.lilac, '#e98fa6'][j])}><sphereGeometry args={[0.13, 10, 8]} /></mesh>)}
        </group>
      ))}
      <StreetGoods shop={shop} w={w} />
    </group>
  )
}

// a small fenced park: grass, railings, a bench, trees and a lamp
function Park() {
  const { x0, x1, z0, z1 } = PARK, w = x1 - x0, d = z1 - z0
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0.06, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#86b86a')} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      {Array.from({ length: Math.round(w / 1.2) + 1 }, (_, i) => x0 + i * (w / Math.round(w / 1.2))).map((x) => <mesh key={x} position={[x, 0.55, z0 + 0.15]} material={mat(C.plum)}><cylinderGeometry args={[0.03, 0.03, 1.1, 6]} /></mesh>)}
      {[0.3, 1.0].map((y) => <mesh key={y} position={[(x0 + x1) / 2, y, z0 + 0.15]} material={mat(C.plum)}><boxGeometry args={[w, 0.06, 0.06]} /></mesh>)}
      {[[x0 + 6, z0 + 7, '#e98fa6'], [x0 + 15, z0 + 9.5, C.leaf], [x0 + 23, z0 + 6, '#c9a6e6']].map(([x, z, c]) => (
        <group key={String(x)} position={[x as number, 0, z as number]}>
          <mesh position={[0, 1.5, 0]} material={mat(C.woodDark)} castShadow><cylinderGeometry args={[0.22, 0.32, 3, 10]} /></mesh>
          <mesh position={[0, 4.0, 0]} material={mat(c as string)} castShadow><sphereGeometry args={[2.0, 18, 14]} /></mesh>
          <mesh position={[0.9, 4.7, 0.3]} material={mat(c as string)}><sphereGeometry args={[1.3, 14, 10]} /></mesh>
        </group>
      ))}
      <group position={[x0 + 11, 0, z0 + 3.2]}>
        <RBox size={[2.2, 0.12, 0.6]} pos={[0, 0.5, 0]} color={C.wood} r={0.04} />
        <RBox size={[2.2, 0.55, 0.1]} pos={[0, 0.85, -0.28]} color={C.wood} r={0.04} />
        {[-0.95, 0.95].map((x) => <mesh key={x} position={[x, 0.25, 0]} material={mat(C.plum)}><boxGeometry args={[0.08, 0.5, 0.5]} /></mesh>)}
      </group>
    </group>
  )
}

function BusStop() {
  return (
    <group position={[BUS_STOP.x, 0.16, BUS_STOP.z]}>
      <mesh position={[0, 1.2, 0.6]} material={mat('#cfe7f2', { opacity: 0.45 })}><boxGeometry args={[4, 2.2, 0.06]} /></mesh>
      <RBox size={[4.4, 0.15, 1.6]} pos={[0, 2.4, 0.1]} color={C.purple} r={0.05} />
      {[-2, 2].map((x) => <mesh key={x} position={[x, 1.2, 0.6]} material={mat(C.plum)}><boxGeometry args={[0.1, 2.4, 0.1]} /></mesh>)}
      <RBox size={[2.6, 0.1, 0.45]} pos={[0, 0.5, 0.3]} color={C.wood} r={0.03} />
      <group position={[2.6, 0, -0.5]}>
        <mesh position={[0, 1.5, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.05, 0.05, 3, 8]} /></mesh>
        <mesh position={[0, 2.9, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat('#e98fa6')}><cylinderGeometry args={[0.38, 0.38, 0.06, 24]} /></mesh>
        <mesh position={[0, 2.9, -0.04]} rotation={[Math.PI / 2, 0, 0]} material={busMat()}><circleGeometry args={[0.36, 24]} /></mesh>
      </group>
    </group>
  )
}

// level 1: where it all begins. A little coffee cart on the corner, with a striped umbrella and a chalkboard
function CoffeeCart() {
  const stripes = useMemo(() => new THREE.MeshStandardMaterial({ map: stripeTex('#e98fa6', '#fbf3e6', 16), roughness: 0.8, side: THREE.DoubleSide }), [])
  const board = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex('coffee ☕', '#2f2a35') }), [])
  return (
    <group position={[CART.x, 0.16, CART.z]} rotation={[0, Math.PI, 0]}>
      <RBox size={[2.3, 0.95, 1.1]} pos={[0, 0.85, 0]} color={C.mint} r={0.08} />
      <RBox size={[2.5, 0.08, 1.25]} pos={[0, 1.36, 0]} color={C.wood} r={0.03} />
      {[-0.85, 0.85].map((x) => <mesh key={x} position={[x, 0.36, 0.58]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.36, 0.36, 0.1, 20]} /></mesh>)}
      <RBox size={[0.55, 0.5, 0.45]} pos={[-0.55, 1.65, -0.15]} color={C.steel} r={0.06} />
      <mesh position={[-0.55, 1.95, -0.15]} material={mat(C.steel)}><sphereGeometry args={[0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0.45, 1.45 + i * 0.09, 0.1]} material={mat('#fbf3e6')}><cylinderGeometry args={[0.07, 0.055, 0.12, 12]} /></mesh>)}
      <mesh position={[0, 2.5, 0]} material={mat(C.plum)}><cylinderGeometry args={[0.035, 0.035, 2.4, 8]} /></mesh>
      <mesh position={[0, 3.55, 0]} material={stripes}><coneGeometry args={[1.6, 0.6, 16, 1, true]} /></mesh>
      <group position={[1.6, 0, -0.6]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.55, 0.15]} rotation={[0.18, 0, 0]} material={mat(C.wood)}><boxGeometry args={[0.7, 1.1, 0.05]} /></mesh>
        <mesh position={[0, 0.62, 0.19]} rotation={[0.18, 0, 0]} material={board}><planeGeometry args={[0.6, 0.6]} /></mesh>
      </group>
      <Glowing />
    </group>
  )
}
function Glowing() {
  return <mesh position={[0, 3.1, 0]} material={glow()}><sphereGeometry args={[0.12, 10, 8]} /></mesh>
}

export function Neighbours() {
  return (
    <group>
      {SHOPS.map((s) => <Shop key={s.kind} shop={s} />)}
      <Park />
      <BusStop />
      <CoffeeCart />
      {/* a soft pool of light at each shopfront at night */}
      {SHOPS.filter((s) => s.kind !== 'lease').map((s) => (
        <mesh key={`g${s.kind}`} position={[(s.x0 + s.x1) / 2, 0.18, s.side === 'a' ? S.padA[0] + 1.6 : S.padB[1] - 1.6]} rotation={[-Math.PI / 2, 0, 0]} material={nightGlow}><planeGeometry args={[s.x1 - s.x0, 3.5]} /></mesh>
      ))}
    </group>
  )
}
