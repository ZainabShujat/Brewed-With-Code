import { useEffect } from 'react'
import { enterFullscreen, autoFullscreen } from './FullscreenButton'

// Phones play sideways, like any mobile game: on tap we go fullscreen and lock to landscape
// (Android Chrome allows this; iPhone Safari doesn't, so a portrait phone gets a "turn your phone" card).
export function Landscape() {
  useEffect(() => {
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    if (!isTouch) return

    // only the FIRST tap asks for fullscreen + landscape. Asking on every tap resized the screen in the middle of
    // a drag at the coffee bar (the touch targets slid out from under your finger). The ⛶ button does it after that.
    const tryFs = () => {
      window.removeEventListener('click', tryFs); window.removeEventListener('touchend', tryFs)
      const doc = document as any
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) autoFullscreen()
    }

    window.addEventListener('click', tryFs)
    window.addEventListener('touchend', tryFs)
    return () => {
      window.removeEventListener('click', tryFs)
      window.removeEventListener('touchend', tryFs)
    }
  }, [])

  return (
    <div className="rotate" onClick={enterFullscreen}>
      <div className="rot-phone">📱</div>
      <b>Turn your phone sideways</b>
      <span>Brewed With Code plays in landscape</span>
      <button
        className="rot-btn"
        onClick={(e) => {
          e.stopPropagation()
          enterFullscreen()
        }}
      >
        Play Fullscreen ⛶
      </button>
    </div>
  )
}
