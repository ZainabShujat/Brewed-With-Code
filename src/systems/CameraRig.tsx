import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type CamMode } from './store'
import { step } from './movement'
import { anim, stepTweens, frozen } from './anim'

// Fixed shots per mode. Walk mode follows the barista instead.
const SHOTS: Record<Exclude<CamMode, 'walk' | 'vlog'>, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  exterior: { pos: new THREE.Vector3(42, 24.5, 69), look: new THREE.Vector3(0, 9.4, 5.8) },
  // outro: pull back from the dollhouse to the full exterior while the pot walls fade in
  outro: { pos: new THREE.Vector3(42, 24.5, 69), look: new THREE.Vector3(0, 9.4, 5.8) },
  dollhouse: { pos: new THREE.Vector3(23.5, 25, 31.5), look: new THREE.Vector3(-0.3, 0.4, -0.3) },
  pov: { pos: new THREE.Vector3(0.1, 3.4, -14.0), look: new THREE.Vector3(0.1, 0.8, -7.1) },
}

const SNAP = typeof location !== 'undefined' && location.search.includes('snap')
const look = new THREE.Vector3()
const setFov = (cam: THREE.PerspectiveCamera, f: number) => { if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix() } }
const wantPos = new THREE.Vector3()
const wantLook = new THREE.Vector3()

// Smoothly glides between shots: no hard cuts (design bible).
export function CameraRig() {
  const { camera } = useThree()
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
      const T = performance.now() / 1000
      wantPos.x += Math.sin(T * 1.3) * 0.06 * c.sway; wantPos.y += Math.sin(T * 1.9 + 1) * 0.05 * c.sway
      const kk = SNAP || c.speed >= 100 ? 1 : 1 - Math.exp(-dt * c.speed) // speed >= 100 = cut, not glide
      camera.position.lerp(wantPos, kk); look.lerp(wantLook, kk); camera.lookAt(look)
      setFov(camera as THREE.PerspectiveCamera, c.fov)   // vlog = wider lens (tall 9:16 frame)
      return
    }
    setFov(camera as THREE.PerspectiveCamera, 45)
    if (mode === 'walk') {
      step(player, dt)
      // stay inside the room so the front wall never blocks the view
      wantPos.set(player.x * 0.85, 4.4, Math.min(player.z + 5.0, 9.4)) // under the 5 m ceiling, above the lamps
      wantLook.set(player.x, 1.0, player.z - 1.2)
    } else if (mode === 'pov') {
      // POV = the barista standing behind the counter
      player.x = 0.3; player.z = -8.4; player.facing = 0
      wantPos.copy(SHOTS.pov.pos); wantLook.copy(SHOTS.pov.look)
    } else if (mode !== 'vlog') {
      wantPos.copy(SHOTS[mode].pos); wantLook.copy(SHOTS[mode].look)
    }
    // ?snap = jump straight to the shot (used for footage capture and tests)
    const k = SNAP ? 1 : 1 - Math.exp(-dt * (mode === 'outro' ? 1.4 : 4))
    camera.position.lerp(wantPos, k)
    look.lerp(wantLook, k)
    camera.lookAt(look)
  })
  return null
}
