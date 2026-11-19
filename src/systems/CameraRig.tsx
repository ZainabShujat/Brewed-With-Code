import { groundY } from '../world/streetLayout'
import { RR } from '../world/layout'
import { BAR_VIEW } from '../world/barLayout'
import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type CamMode } from './store'
import { step, stick, keys, goTo } from './movement'
// PHONE / TABLET = the main pointer is a finger. A laptop with a touchscreen still has a mouse/trackpad as its main
// pointer, so it stays a laptop: phone controls and phone layout never leak onto it.
export const TOUCH = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches))
if (typeof document !== 'undefined') document.documentElement.classList.toggle('phone', TOUCH) // all phone-only CSS lives under .phone
import { anim, stepTweens, frozen } from './anim'
import { WORLD } from '../world/layout'
import { machine } from '../world/CakeMachine'

// Fixed shots per mode. Walk mode follows the barista instead.
const SHOTS: Record<Exclude<CamMode, 'walk' | 'fp' | 'vlog'>, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  // straight on to the front door (square, level, symmetrical); slid left so the pot sits right of the menu panel
  exterior: { pos: new THREE.Vector3(-13, 13, 78), look: new THREE.Vector3(-13, 8.5, 0) },
  // outro: pull back from the dollhouse to the full exterior while the pot walls fade in
  outro: { pos: new THREE.Vector3(42, 24.5, 69), look: new THREE.Vector3(0, 9.4, 5.8) },
  // the cake bench in the kitchen: close, slightly above, like leaning over the turntable
  cake: { pos: new THREE.Vector3(-6.95, 3.6, -3.4), look: new THREE.Vector3(-6.95, 1.95, -9.1) }, // the whole cake machine: canopy, dispensers, belt // stepped back: the whole bakery corner, calm and roomy // the bakery corner: cake, backsplash, shelf
  dollhouse: { pos: new THREE.Vector3(17.5, 19, 23.5), look: new THREE.Vector3(-0.3, 0.2, -0.6) },
  pov: { pos: new THREE.Vector3(0.1, 3.9, -14.3), look: new THREE.Vector3(0.1, 0.95, -6.7) } // looking down at the workspace: every tool readable,
}

const GLIDE = new Set(['walk', 'fp', 'dollhouse'])
let glideT = 0
const EYE = 2.3 // eye height on foot (the townsfolk are ~2-2.5 m tall at this scale)
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
const tapAt = { x: 0, y: 0, on: false }, _floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _rc = new THREE.Raycaster(), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2()
export function useMouseLook() {
  const { gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    let down = -1, lx = 0, ly = 0, grabbed = false
    // phones: two fingers pinch to zoom
    const pts = new Map<number, [number, number]>(); let pinch = 0
    const span = () => { const [a, b] = [...pts.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]) }
    el.style.touchAction = 'none'
    let mid: [number, number] | null = null, tap0 = { t: 0, x: 0, y: 0 }
    const midOf = (): [number, number] => { const [a, b] = [...pts.values()]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }
    const pd = (e: PointerEvent) => {
      pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { pinch = span(); mid = midOf(); down = -1; return }
      down = e.button; lx = e.clientX; ly = e.clientY
      // MOUSE LOOK, like any first-person game: hold the RIGHT button and move the mouse to turn your head.
      // In Walk view a left click on the scene locks the mouse for full look (Esc to let go).
      if (e.pointerType === 'touch') { grabbed = document.body.style.cursor === 'pointer'; tap0 = { t: performance.now(), x: e.clientX, y: e.clientY }; return } // fingers: no pointer lock, just drag to look
      if (view.mode !== 'dollhouse' && view.mode !== 'exterior' && (e.button === 2 || ((view.mode === 'walk' || view.mode === 'fp') && e.button === 0)) && (view.mode !== 'pov' || e.button === 2)) {
        el.requestPointerLock?.(); view.looking = true; return
      }
      grabbed = document.body.style.cursor === 'grab' || document.body.style.cursor === 'grabbing' || document.body.style.cursor === 'pointer'
    }
    const pm = (e: PointerEvent) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY])
      if (pts.size === 2 && pinch) {
        const d = span(); zoomBy(pinch / d); pinch = d
        // two fingers dragging together pan the dollhouse
        const m = midOf(); if (mid && view.mode === 'dollhouse') { const a = view.yaw + view.spin, k = 0.03 * view.zoom, dx = m[0] - mid[0], dy = m[1] - mid[1]
          view.panX = Math.max(-72, Math.min(72, view.panX - (Math.cos(a) * dx + Math.sin(a) * dy) * k)); view.panZ = Math.max(-30, Math.min(56, view.panZ - (-Math.sin(a) * dx + Math.cos(a) * dy) * k)) }
        mid = m; return
      }
      if (document.pointerLockElement === el) {
        const k = 0.0022 * view.sens
        view.yaw -= e.movementX * k; view.pitch -= e.movementY * k
        view.pitch = Math.max(-1.1, Math.min(1.0, view.pitch))
        if (view.mode === 'cake') view.yaw = Math.max(-2.2, Math.min(2.2, view.yaw))
        if (view.mode === 'pov') { view.yaw = Math.max(-0.6, Math.min(0.6, view.yaw)); view.pitch = Math.max(-0.15, Math.min(0.6, view.pitch)) } // the bar: a glance, not a spin
        return
      }
      if (down < 0) return
      if (e.pointerType === 'touch') { // one finger: turn the camera (on foot and in the dollhouse); stations keep their drags
        if (grabbed || !(view.mode === 'walk' || view.mode === 'fp' || view.mode === 'dollhouse')) return
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY
        view.yaw -= dx * 0.008 * view.sens
        if (view.mode !== 'dollhouse') view.pitch = Math.max(-1.1, Math.min(1.0, view.pitch - dy * 0.006 * view.sens))
        return
      }
      const orbit = view.mode === 'dollhouse'
      if (down === 0 && grabbed) return                   // dragging an item, not the view
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY
      if (view.mode === 'walk' || view.mode === 'fp') { // drag to look around in Walk / first person: turn all the way round, like any first-person game
        view.yaw -= dx * 0.005 * view.sens; view.pitch = Math.max(-1.1, Math.min(1.0, view.pitch - dy * 0.004 * view.sens)); return }
      if (!orbit) return                                  // only the dollhouse is dragged round; elsewhere you turn your head with Q / E
      if (down === 0) {
        // pan across the miniature, like sliding a diorama on a table
        const a = view.yaw + view.spin, k = 0.03 * view.zoom
        // the whole street block can be reached: slide from the café out to the shops at either end and across the road
        view.panX = Math.max(-72, Math.min(72, view.panX - (Math.cos(a) * dx + Math.sin(a) * dy) * k))
        view.panZ = Math.max(-30, Math.min(56, view.panZ - (-Math.sin(a) * dx + Math.cos(a) * dy) * k))
        return
      }
      view.yaw -= dx * (orbit ? 0.006 : 0.003); view.pitch += dy * (orbit ? 0.004 : 0.003)
      view.pitch = orbit ? Math.max(-0.6, Math.min(0.5, view.pitch)) : Math.max(-0.7, Math.min(0.7, view.pitch))
      if (!orbit) view.yaw = Math.max(-1.4, Math.min(1.4, view.yaw))
    }
    const pu = (e: PointerEvent) => {
      // a quick tap (not a drag) on the floor while on foot: walk there
      if (e.pointerType === 'touch' && pts.size === 1 && (view.mode === 'walk' || view.mode === 'fp') && performance.now() - tap0.t < 320 && Math.hypot(e.clientX - tap0.x, e.clientY - tap0.y) < 14) {
        const r = el.getBoundingClientRect(); tapAt.x = ((e.clientX - r.left) / r.width) * 2 - 1; tapAt.y = -((e.clientY - r.top) / r.height) * 2 + 1; tapAt.on = true }
      if (e.button === 2 && document.pointerLockElement === el) document.exitPointerLock()
      if (document.pointerLockElement !== el) view.looking = false
      pts.delete(e.pointerId); if (pts.size < 2) { pinch = 0; mid = null } down = -1 }
    window.addEventListener('pointercancel', pu)
    const zoomBy = (f: number) => { view.zoom = Math.max(view.mode === 'dollhouse' ? 0.35 : view.mode === 'pov' ? 0.45 : 0.6, Math.min(view.mode === 'dollhouse' ? 3.4 : view.mode === 'pov' ? 1.2 : 1.3, view.zoom * f)) } // dollhouse: zoom far enough out to see the whole street
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
    const walk = mode === 'walk' || mode === 'fp'
    const turn = walk ? (keys.has('arrowleft') ? 1 : 0) - (keys.has('arrowright') ? 1 : 0) : (keys.has('q') ? 1 : 0) - (keys.has('e') ? 1 : 0) // on foot, E is for doing things (it used to spin you round)
    if (turn) view.yaw = walk ? view.yaw + turn * dt * 2.2 : Math.max(-1.3, Math.min(1.3, view.yaw + turn * dt * 1.6)) // Walk: turn all the way round
  }
  if (mode !== 'walk' && mode !== 'fp' && (stick.x || stick.y)) {
    const orbit = mode === 'dollhouse' || mode === 'exterior'
    view.yaw -= stick.x * dt * (orbit ? 1.2 : 0.8); view.pitch += stick.y * dt * (orbit ? 0.6 : 0.6)
    view.pitch = orbit ? Math.max(-0.6, Math.min(0.5, view.pitch)) : Math.max(-0.7, Math.min(0.7, view.pitch))
    if (!orbit) view.yaw = Math.max(-1.4, Math.min(1.4, view.yaw))
  }
  if (view.mode !== mode) { const keep = (view.mode === 'walk' || view.mode === 'fp') && (mode === 'walk' || mode === 'fp'); view.mode = mode; if (!keep) view.yaw = 0; view.pitch = 0; view.zoom = 1; view.panX = 0; view.panZ = 0; view.spin = 0; spinTo = 0; keys.clear() } // each view starts fresh (and no key stays 'held' across the switch)
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
  } else if (mode !== 'walk' && mode !== 'fp') { // (Explore's third-person camera is placed directly from yaw / pitch / zoom)
    // turn the head: swing the look point round the eye; the wheel leans closer / back
    _off.copy(wantLook).sub(wantPos); _sph.setFromVector3(_off)
    _sph.theta += view.yaw; _sph.phi = Math.max(0.2, Math.min(2.9, _sph.phi - view.pitch))
    const lean = 1 - view.zoom
    wantPos.addScaledVector(_off.normalize(), lean * 3)
    _off.setFromSpherical(_sph); wantLook.copy(wantPos).add(_off)
  }
}

let lastMode = ''
function fadeCut() {
  if (typeof document === 'undefined') return
  let el = document.querySelector('.cutfade') as HTMLDivElement | null
  if (!el) { el = document.createElement('div'); el.className = 'cutfade'; document.body.appendChild(el) }
  el.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => el!.classList.remove('on')))
}

// Glides within an area; switching areas is a quick fade-cut.
export function CameraRig() {
  const { camera } = useThree()
  useMouseLook()
  useFrame(({ pointer }, dtRaw) => {
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
    // switching area: fade to plum, jump the camera straight there, fade back (no slow, tilted fly-through)
    let cut = false
    // switching between Explore / first person / Dollhouse GLIDES (no cut); going to a station cuts with a fade
    let glide = false
    if (lastMode !== mode) { glide = GLIDE.has(lastMode) && GLIDE.has(mode); cut = lastMode !== '' && !glide; if (glide) glideT = 1.2; lastMode = mode; if (cut) fadeCut() }
    if (glideT > 0) glideT -= dt
    const asp = (camera as THREE.PerspectiveCamera).aspect
    setFov(camera as THREE.PerspectiveCamera, mode === 'cake' && asp < 1 ? 58 : (mode === 'pov' ? 50 : mode === 'dollhouse' ? 19 : 45) * (asp < 1 ? Math.min(1.7, 1 / asp * 0.95) : 1)) // portrait phone = wider lens // barista view: a slightly wider, human field of view
    if (mode === 'walk') {
      // Explore = third person, from above at a slight slant: the camera follows you (Kozie or your own character).
      // Drag / Q E / arrows circle it round you, the wheel zooms, W walks away from the camera.
      if (tapAt.on) { tapAt.on = false; _rc.setFromCamera(_ndc.set(tapAt.x, tapAt.y), camera); if (_rc.ray.intersectPlane(_floor, _hit)) Object.assign(goTo, { x: _hit.x / WORLD, z: _hit.z / WORLD, on: true }) }
      step(player, dt, view.mode === 'walk' ? view.yaw : 0)
      const indoors = Math.hypot(player.x, player.z) < RR - 0.5
      const dist = (indoors ? 8 : 10) * view.zoom, elev = Math.max(0.4, Math.min(1.3, 0.82 + view.pitch))
      wantLook.set(player.x, 1.0, player.z)
      wantPos.set(player.x + Math.sin(view.yaw) * Math.cos(elev) * dist, 1.0 + Math.sin(elev) * dist, player.z + Math.cos(view.yaw) * Math.cos(elev) * dist)
    } else if (mode === 'fp') {
      // first person: you ARE the character; the camera is your eyes, W walks where you look
      if (tapAt.on) { tapAt.on = false; _rc.setFromCamera(_ndc.set(tapAt.x, tapAt.y), camera); if (_rc.ray.intersectPlane(_floor, _hit)) Object.assign(goTo, { x: _hit.x / WORLD, z: _hit.z / WORLD, on: true }) }
      step(player, dt, view.mode === 'fp' ? view.yaw : 0)
      const pitch = Math.max(-1.0, Math.min(0.9, view.pitch))
      const gy = groundY(player.x, player.z); wantPos.set(player.x, EYE + gy, player.z)
      wantLook.set(player.x - Math.sin(view.yaw) * Math.cos(pitch) * 4, EYE + gy - Math.sin(pitch) * 4, player.z - Math.cos(view.yaw) * Math.cos(pitch) * 4)
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
      wantPos.set(BAR_VIEW.x, BAR_VIEW.eyeY, BAR_VIEW.eyeZ); wantLook.set(BAR_VIEW.x, BAR_VIEW.lookY, BAR_VIEW.lookZ) // framing the workstation, close
      // look up at your customers: hold the up arrow (or right-drag), arrows left/right glance sideways; it all eases back to the bar when you let go
      if (keys.has('arrowup')) view.pitch = Math.min(0.6, view.pitch + dt * 1.6)
      else if (!view.looking) view.pitch *= Math.max(0, 1 - dt * 3)
      const glance = (keys.has('arrowleft') ? 1 : 0) - (keys.has('arrowright') ? 1 : 0)
      if (glance) view.yaw = Math.max(-0.6, Math.min(0.6, view.yaw + glance * dt * 1.4)); else if (!view.looking) view.yaw *= Math.max(0, 1 - dt * 3)
      wantLook.y += view.pitch * 2.6; wantLook.z += view.pitch * 3.5; wantLook.x += Math.sin(view.yaw) * 2.5
      // scroll zooms the bar view: in towards whatever the mouse is over, or out a little for the whole counter
      if (view.zoom !== 1) {
        const inK = Math.max(0, 1 - view.zoom) * 1.6 // how far in we are: follow the pointer that much
        _off.set(pointer.x * inK * 1.4, pointer.y * inK * 0.5, 0); wantLook.add(_off); wantPos.add(_off)
        wantPos.sub(wantLook).multiplyScalar(view.zoom).add(wantLook)
      }
      { const asp = (camera as THREE.PerspectiveCamera).aspect; setFov(camera as THREE.PerspectiveCamera, Math.min(100, 2 * Math.atan(Math.tan(25 * Math.PI / 180) * Math.max(1, 1.75 / asp)) * 180 / Math.PI)) } // narrower screens: a wider lens so the whole bar fits (the wall is right behind you)
    }
    // portrait phone: step back from the stations so the whole machine / bar fits the narrow screen
    // portrait phone at the cake machine: don't squeeze the whole machine in; follow the cake and
    // frame the dispenser it's under, gliding left/right as ◀ ▶ move it along the belt
    if ((camera as THREE.PerspectiveCamera).aspect < 1 && mode === 'cake') { const x = machine.target; wantLook.set(x, 1.85, -9.05); wantPos.set(x + 0.15, 2.75, -5.8) }
    wantPos.multiplyScalar(WORLD); wantLook.multiplyScalar(WORLD)
    if (mode !== 'pov') applyLook(mode, dt); else if (view.mode !== mode) { view.mode = mode; view.yaw = 0; view.pitch = 0; view.zoom = 1 } // (pov keeps its zoom while you work)
    // ?snap = jump straight to the shot (used for footage capture and tests)
    const k = SNAP || cut ? 1 : glideT > 0 ? 1 - Math.exp(-dt * 3.2) : 1 - Math.exp(-dt * (mode === 'fp' ? 18 : mode === 'walk' ? 7 : mode === 'outro' ? 1.4 : view.looking ? 30 : 4)) // Explore: a smooth follow cam // mouse look = instant, like a game
    camera.position.lerp(wantPos, k)
    look.lerp(wantLook, k)
    camera.lookAt(look)
  })
  return null
}
// testing / capture hook: turn the camera from tests and reels
if (typeof window !== 'undefined') (window as unknown as { __view: typeof view }).__view = view
