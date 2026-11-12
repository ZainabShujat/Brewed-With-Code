import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type CamMode } from './store'
import { step } from './movement'

// Fixed shots per mode. Walk mode follows the barista instead.
const SHOTS: Record<Exclude<CamMode, 'walk'>, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  exterior: { pos: new THREE.Vector3(15, 9, 25), look: new THREE.Vector3(0, 3.5, 2) },
  dollhouse: { pos: new THREE.Vector3(11.5, 12.5, 15.5), look: new THREE.Vector3(-0.3, 0.6, -0.3) },
  pov: { pos: new THREE.Vector3(0.1, 3.4, -9.8), look: new THREE.Vector3(0.1, 0.8, -2.9) },
}

const SNAP = typeof location !== 'undefined' && location.search.includes('snap')
const look = new THREE.Vector3()
const wantPos = new THREE.Vector3()
const wantLook = new THREE.Vector3()

// Smoothly glides between shots: no hard cuts (design bible).
export function CameraRig() {
  const { camera } = useThree()
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const { mode, player } = useGame.getState()
    if (mode === 'walk') {
      step(player, dt)
      // stay inside the room so the front wall never blocks the view
      wantPos.set(player.x * 0.85, 3.9, Math.min(player.z + 4.2, 4.0))
      wantLook.set(player.x, 1.2, player.z - 0.6)
    } else if (mode === 'pov') {
      // POV = the barista standing behind the counter
      player.x = 0.3; player.z = -4.4; player.facing = 0
      wantPos.copy(SHOTS.pov.pos); wantLook.copy(SHOTS.pov.look)
    } else {
      wantPos.copy(SHOTS[mode].pos); wantLook.copy(SHOTS[mode].look)
    }
    // ?snap = jump straight to the shot (used for footage capture and tests)
    const k = SNAP ? 1 : 1 - Math.exp(-dt * 4)
    camera.position.lerp(wantPos, k)
    look.lerp(wantLook, k)
    camera.lookAt(look)
  })
  return null
}
