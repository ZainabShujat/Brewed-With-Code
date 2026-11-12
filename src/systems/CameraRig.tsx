import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type CamMode } from './store'
import { step } from './movement'

// Fixed shots per mode. Walk mode follows the barista instead.
const SHOTS: Record<Exclude<CamMode, 'walk'>, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  exterior: { pos: new THREE.Vector3(29, 17, 48), look: new THREE.Vector3(0, 6.5, 4) },
  // outro: pull back from the dollhouse to the full exterior while the pot walls fade in
  outro: { pos: new THREE.Vector3(29, 17, 48), look: new THREE.Vector3(0, 6.5, 4) },
  dollhouse: { pos: new THREE.Vector3(16.5, 17.5, 22), look: new THREE.Vector3(-0.3, 0.4, -0.3) },
  pov: { pos: new THREE.Vector3(0.1, 3.4, -12.2), look: new THREE.Vector3(0.1, 0.8, -5.3) },
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
      wantPos.set(player.x * 0.85, 6.0, Math.min(player.z + 5.0, 6.6))
      wantLook.set(player.x, 1.0, player.z - 1.2)
    } else if (mode === 'pov') {
      // POV = the barista standing behind the counter
      player.x = 0.3; player.z = -6.6; player.facing = 0
      wantPos.copy(SHOTS.pov.pos); wantLook.copy(SHOTS.pov.look)
    } else {
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
