import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type CamMode } from './store'
import { step, stick, keys } from './movement'
export const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
import { anim, stepTweens, frozen } from './anim'
import { WORLD } from '../world/layout'
import { machine } from '../world/CakeMachine'

// Fixed shots per mode. Walk mode follows the barista instead.
const SHOTS: Record<Exclude<CamMode, 'walk' | 'vlog'>, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  // straight on to the front door (square, level, symmetrical); slid left so the pot sits right of the menu panel
  exterior: { pos: new THREE.Vector3(-13, 13, 78), look: new THREE.Vector3(-13, 8.5, 0) },
  // outro: pull back from the dollhouse to the full exterior while the pot walls fade in
  outro: { pos: new THREE.Vector3(42, 24.5, 69), look: new THREE.Vector3(0, 9.4, 5.8) },
  // the cake bench in the kitchen: close, slightly above, like leaning over the turntable
  cake: { pos: new THREE.Vector3(-6.95, 3.6, -3.4), look: new THREE.Vector3(-6.95, 1.95, -9.1) }, // the whole cake machine: canopy, dispensers, belt // stepped back: the whole bakery corner, calm and roomy // the bakery corner: cake, backsplash, shelf
  dollhouse: { pos: new THREE.Vector3(17.5, 19, 23.5), look: new THREE.Vector3(-0.3, 0.2, -0.6) },
  pov: { pos: new THREE.Vector3(0.1, 3.9, -14.3), look: new THREE.Vector3(0.1, 0.95, -6.7) } // looking down at the workspace: every tool readable,
}

const SNAP = typeof location !== 'undefined' && location.search.includes('snap')
const look = new THREE.Vector3()
const setFov = (cam: THREE.PerspectiveCamera, f: number) => { if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix() } }
const wantPos = new THREE.Vector3()
const wantLook = new THREE.Vector3()

// Mouse look: dollhouse = orbit all the way round (drag) + zoom (wheel).
// Walk / barista / cakes = turn your head (right-drag, or drag on empty space), wheel leans in/out.
const loadSens = () => { try { return Number(localStorage.getItem('sens')) || 1 } catch { return 1 } }
export const view = { yaw: 0, pitch: 0, zoom: 1, mode: '' as string, sens: loadSens(), looking: false, panX: 0, panZ: 0, spin: 0 }
export const setSens = (v: number) => { view.sens = v; try { localStorage.setItem('sens', String(v)) } catch { /* private mode */ } }
const _off = new THREE.Vector3(), _sph = new THREE.Spherical()
export function useMouseLook() {
  const { gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    let down = -1, lx = 0, ly = 0, grabbed = false
    // phones: two fingers pinch to zoom
    const pts = new Map<number, [number, number]>(); let pinch = 0
    const span = () => { const [a, b] = [...pts.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]) }
    el.style.touchAction = 'none'
    const pd = (e: PointerEvent) => {
      pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { pinch = span(); down = -1; return }
      down = e.button; lx = e.clientX; ly = e.clientY
      // MOUSE LOOK, like any first-person game: hold the RIGHT button and move the mouse to turn your head.
      // In Walk view a left click on the scene locks the mouse for full look (Esc to let go).
      if (view.mode !== 'dollhouse' && view.mode !== 'exterior' && view.mode !== 'pov' && (e.button === 2 || (view.mode === 'walk' && e.button === 0))) {
        el.requestPointerLock?.(); view.looking = true; return
      }
      grabbed = document.body.style.cursor === 'grab' || document.body.style.cursor === 'grabbing' || document.body.style.cursor === 'pointer'
    }
    const pm = (e: PointerEvent) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY])
      if (pts.size === 2 && pinch) { const d = span(); zoomBy(pinch / d); pinch = d; return }
      if (document.pointerLockElement === el) {
        const k = 0.0022 * view.sens
        view.yaw -= e.movementX * k; view.pitch -= e.movementY * k
        view.pitch = Math.max(-1.1, Math.min(1.0, view.pitch))
        if (view.mode === 'pov' || view.mode === 'cake') view.yaw = Math.max(-2.2, Math.min(2.2, view.yaw))
        return
      }
      if (down < 0 || TOUCH) return
      const orbit = view.mode === 'dollhouse'
      if (down === 0 && grabbed) return                   // dragging an item, not the view
      if (!orbit) return                                  // only the dollhouse is dragged round; elsewhere you turn your head with Q / E
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY
      if (down === 0) {
        // pan across the miniature, like sliding a diorama on a table
        const a = view.yaw + view.spin, k = 0.03 * view.zoom
        view.panX = Math.max(-11, Math.min(11, view.panX - (Math.cos(a) * dx + Math.sin(a) * dy) * k))
        view.panZ = Math.max(-11, Math.min(11, view.panZ - (-Math.sin(a) * dx + Math.cos(a) * dy) * k))
        return
      }
      view.yaw -= dx * (orbit ? 0.006 : 0.003); view.pitch += dy * (orbit ? 0.004 : 0.003)
      view.pitch = orbit ? Math.max(-0.6, Math.min(0.5, view.pitch)) : Math.max(-0.7, Math.min(0.7, view.pitch))
      if (!orbit) view.yaw = Math.max(-1.4, Math.min(1.4, view.yaw))
    }
    const pu = (e: PointerEvent) => {
      if (e.button === 2 && document.pointerLockElement === el) document.exitPointerLock()
      if (document.pointerLockElement !== el) view.looking = false
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; down = -1 }
    window.addEventListener('pointercancel', pu)
    const zoomBy = (f: number) => { view.zoom = Math.max(view.mode === 'dollhouse' ? 0.35 : 0.6, Math.min(view.mode === 'dollhouse' ? 1.8 : 1.3, view.zoom * f)) }
    const wh = (e: WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 0.9) }
    const cm = (e: Event) => e.preventDefault()
    el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu)
    el.addEventListener('wheel', wh, { passive: false }); el.addEventListener('contextmenu', cm)
    return () => { el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); el.removeEventListener('wheel', wh); el.removeEventListener('contextmenu', cm) }
  }, [gl])
}
let spinTo = 0, qe = false
export const brewCam = { x: null as number | null } // set by the coffee flow: which station to stand at
function applyLook(mode: string, dt: number) {
  // Q / E (or ← → in barista view) turn your head like a person would; it eases back when you let go
  if (mode !== 'dollhouse' && mode !== 'exterior') {
    const turn = (keys.has('q') ? 1 : 0) - (keys.has('e') ? 1 : 0)
    if (turn) view.yaw = Math.max(-1.3, Math.min(1.3, view.yaw + turn * dt * 1.6))
  }
  if (mode !== 'walk' && (stick.x || stick.y)) {
    const orbit = mode === 'dollhouse' || mode === 'exterior'
    view.yaw -= stick.x * dt * (orbit ? 1.2 : 0.8); view.pitch += stick.y * dt * (orbit ? 0.6 : 0.6)
    view.pitch = orbit ? Math.max(-0.6, Math.min(0.5, view.pitch)) : Math.max(-0.7, Math.min(0.7, view.pitch))
    if (!orbit) view.yaw = Math.max(-1.4, Math.min(1.4, view.yaw))
  }
  if (view.mode !== mode) { view.mode = mode; view.yaw = 0; view.pitch = 0; view.zoom = 1; view.panX = 0; view.panZ = 0; view.spin = 0 } // each view starts fresh
  if (mode === 'dollhouse') {
    if (keys.has('q') && !qe) { qe = true; spinTo += Math.PI / 2 } else if (keys.has('e') && !qe) { qe = true; spinTo -= Math.PI / 2 } else if (!keys.has('q') && !keys.has('e')) qe = false
    view.spin += (spinTo - view.spin) * Math.min(1, dt * 5)
  } else { spinTo = 0; view.spin = 0 }
  if (mode === 'dollhouse' || mode === 'exterior') {
    _off.copy(wantPos).sub(wantLook); _sph.setFromVector3(_off)
    _sph.theta += view.yaw + view.spin; _sph.phi = Math.max(0.15, Math.min(1.45, _sph.phi + view.pitch)); _sph.radius *= view.zoom
    // dollhouse = a long, narrow lens from far away: almost orthographic, like an isometric diorama
    if (mode === 'dollhouse') _sph.radius *= 2.4
    wantPos.copy(wantLook).add(_off.setFromSpherical(_sph))
    if (mode === 'dollhouse') { wantLook.x += view.panX; wantLook.z += view.panZ; wantPos.x += view.panX; wantPos.z += view.panZ }
  } else {
    // turn the head: swing the look point round the eye; the wheel leans closer / back
    _off.copy(wantLook).sub(wantPos); _sph.setFromVector3(_off)
    _sph.theta += view.yaw; _sph.phi = Math.max(0.2, Math.min(2.9, _sph.phi - view.pitch))
    const lean = 1 - view.zoom
    wantPos.addScaledVector(_off.normalize(), lean * 3)
    _off.setFromSpherical(_sph); wantLook.copy(wantPos).add(_off)
  }
}

// Smoothly glides between shots: no hard cuts (design bible).
export function CameraRig() {
  const { camera } = useThree()
  useMouseLook()
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const { mode, player } = useGame.getState()
    stepTweens(dt)
    if (frozen()) return // stutter: the camera holds, like a dropped frame
    const c = anim.cam
    if (c.active) {
      // reel camera: follow Kozie like a handheld vlog cam, or glide to a set shot; plus handheld sway
      if (c.follow) {
        const k = anim.kozie
        wantPos.copy(k.pos).add(c.off)
        wantLook.set(k.pos.x, k.pos.y + 1.3 * k.s, k.pos.z)
      } else { wantPos.copy(c.pos); wantLook.copy(c.look) }
      wantPos.sub(wantLook).multiplyScalar(c.dist).add(wantLook)
      wantPos.multiplyScalar(WORLD); wantLook.multiplyScalar(WORLD)
      const T = performance.now() / 1000
      wantPos.x += Math.sin(T * 1.3) * 0.06 * c.sway; wantPos.y += Math.sin(T * 1.9 + 1) * 0.05 * c.sway
      const kk = SNAP || c.speed >= 100 ? 1 : 1 - Math.exp(-dt * c.speed) // speed >= 100 = cut, not glide
      camera.position.lerp(wantPos, kk); look.lerp(wantLook, kk); camera.lookAt(look)
      setFov(camera as THREE.PerspectiveCamera, c.fov)   // vlog = wider lens (tall 9:16 frame)
      return
    }
    const asp = (camera as THREE.PerspectiveCamera).aspect
    setFov(camera as THREE.PerspectiveCamera, mode === 'cake' && asp < 1 ? 58 : (mode === 'pov' ? 50 : mode === 'dollhouse' ? 19 : 45) * (asp < 1 ? Math.min(1.7, 1 / asp * 0.95) : 1)) // portrait phone = wider lens // barista view: a slightly wider, human field of view
    if (mode === 'walk') {
      // first person at eye height (~1.65 m): the mouse turns you, W walks where you look
      step(player, dt, view.mode === 'walk' ? view.yaw : 0)
      const bob = player.moving ? Math.sin(performance.now() / 160) * 0.025 : 0
      wantPos.set(player.x, 1.65 + bob, player.z)
      wantLook.set(player.x, 1.65, player.z - 1)
    } else if (mode === 'pov') {
      // POV = the barista standing behind the counter
      player.x = 0.3; player.z = -8.4; player.facing = 0
      wantPos.copy(SHOTS.pov.pos); wantLook.copy(SHOTS.pov.look)
    } else if (mode !== 'vlog') {
      wantPos.copy(SHOTS[mode].pos); wantLook.copy(SHOTS[mode].look)
    }
    if (mode === 'pov' || mode === 'cake') wantPos.sub(wantLook).multiplyScalar(0.9).add(wantLook)
    if (mode === 'pov') {
      // the coffee bar is played like Papa's: ONE fixed view of the whole workspace, the camera never moves
      wantPos.set(0.2, 3.9, -9.6); wantLook.set(0.2, 1.05, -7.45)
      { const asp = (camera as THREE.PerspectiveCamera).aspect; setFov(camera as THREE.PerspectiveCamera, Math.min(100, 2 * Math.atan(Math.tan(25 * Math.PI / 180) * Math.max(1, 1.75 / asp)) * 180 / Math.PI)) } // narrower screens: a wider lens so the whole bar fits (the wall is right behind you)
    }
    // portrait phone: step back from the stations so the whole machine / bar fits the narrow screen
    // portrait phone at the cake machine: don't squeeze the whole machine in; follow the cake and
    // frame the dispenser it's under, gliding left/right as ◀ ▶ move it along the belt
    if ((camera as THREE.PerspectiveCamera).aspect < 1 && mode === 'cake') { const x = machine.target; wantLook.set(x, 1.85, -9.05); wantPos.set(x + 0.15, 2.75, -5.8) }
    wantPos.multiplyScalar(WORLD); wantLook.multiplyScalar(WORLD)
    if (mode !== 'pov') applyLook(mode, dt); else if (view.mode !== mode) { view.mode = mode; view.yaw = 0; view.pitch = 0; view.zoom = 1 }
    // ?snap = jump straight to the shot (used for footage capture and tests)
    const k = SNAP ? 1 : 1 - Math.exp(-dt * (mode === 'outro' ? 1.4 : view.looking ? 30 : 4)) // mouse look = instant, like a game
    camera.position.lerp(wantPos, k)
    look.lerp(wantLook, k)
    camera.lookAt(look)
  })
  return null
}
