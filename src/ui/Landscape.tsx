import { useEffect } from 'react'

// Phones play sideways, like any mobile game: on the first tap we go fullscreen and lock to landscape
// (Android Chrome allows this; iPhone Safari doesn't, so a portrait phone gets a "turn your phone" card).
export function Landscape() {
  useEffect(() => {
    if (!matchMedia('(pointer: coarse)').matches) return
    const go = async () => {
      try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }) } catch { /* not allowed */ }
      try { await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape') } catch { /* iOS: the card below asks instead */ }
    }
    window.addEventListener('pointerdown', go, { once: true })
    return () => window.removeEventListener('pointerdown', go)
  }, [])
  return <div className="rotate"><div className="rot-phone">📱</div><b>Turn your phone sideways</b><span>Brewed With Code plays in landscape</span></div>
}
