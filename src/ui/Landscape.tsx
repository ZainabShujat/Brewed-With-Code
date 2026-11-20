import { useEffect, useState } from 'react'
import { enterFullscreen, autoFullscreen } from './FullscreenButton'

// Phones play sideways, like any mobile game: on tap we go fullscreen and lock to landscape
// (Android Chrome allows this; iPhone Safari doesn't, so a portrait phone gets a "turn your phone" card).
// the browser's own install offer (Chrome on Android fires this when the site is installable)
type Bip = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: Bip | null = null
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as Bip })
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
const iOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
export function Landscape() {
  const [canInstall, setCanInstall] = useState(!!deferred)
  useEffect(() => { const f = () => setCanInstall(true); window.addEventListener('beforeinstallprompt', f); return () => window.removeEventListener('beforeinstallprompt', f) }, [])
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

  // portrait phone: rather than "turn your phone", invite them to INSTALL it: the app opens full-screen and sideways
  // on its own (manifest: standalone + landscape). Already installed → just the turn-sideways hint.
  if (standalone()) return (
    <div className="rotate"><div className="rot-phone">📱</div><b>Turn your phone sideways</b><span>Brewed With Code plays in landscape</span></div>
  )
  return (
    <div className="rotate install">
      <img className="rot-board" src="./title-board.webp" alt="Brewed With Code" />
      <b>Install it as an app ☕</b>
      <span>It opens full-screen and sideways, like a real game, right from your home screen.</span>
      {canInstall && deferred
        ? <button className="rot-btn" onClick={async (e) => { e.stopPropagation(); const d = deferred; if (!d) return; await d.prompt(); deferred = null; setCanInstall(false) }}>📲 Install app</button>
        : <div className="rot-steps">{iOS()
            ? <>tap <b>Share</b> <span className="ico">⬆️</span> then <b>Add to Home Screen</b></>
            : <>tap the <b>⋮</b> menu (top right) then <b>Install app</b> or <b>Add to Home screen</b></>}</div>}
      <button className="rot-skip" onClick={(e) => { e.stopPropagation(); enterFullscreen() }}>or turn your phone sideways to play here</button>
    </div>
  )
}
