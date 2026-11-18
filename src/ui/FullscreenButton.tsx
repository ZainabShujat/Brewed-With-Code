import { useEffect, useState } from 'react'

/** fullscreen on its own (title tap, Play): phones only, and never inside an embed (reels, other pages) */
export function autoFullscreen() {
  if (typeof window === 'undefined' || window.self !== window.top || location.search.includes('embed')) return
  if (!document.documentElement.classList.contains('phone')) return // laptops: the player decides (⛶ or F11)
  enterFullscreen()
}
export async function enterFullscreen() {
  if (window.self !== window.top) return // inside an iframe it would cover the whole parent page
  const doc = document as any
  const el = document.documentElement as any
  try {
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' }).catch(() => el.requestFullscreen())
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      }
    }
  } catch (e) {}
  try {
    if (screen.orientation && (screen.orientation as any).lock) {
      await (screen.orientation as any).lock('landscape').catch(() => {})
    }
  } catch {}
}

export async function toggleFullscreen() {
  const doc = document as any
  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
    await enterFullscreen()
  } else {
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
    } catch {}
  }
}

export function FullscreenButton() {
  const [fs, setFs] = useState(false)

  useEffect(() => {
    const onFs = () => {
      const doc = document as any
      setFs(!!(doc.fullscreenElement || doc.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('webkitfullscreenchange', onFs)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('webkitfullscreenchange', onFs)
    }
  }, [])

  return (
    <button
      className="fullscreenbtn"
      title={fs ? 'Exit fullscreen' : 'Enter fullscreen'}
      onClick={(e) => {
        e.stopPropagation()
        toggleFullscreen()
      }}
    >
      {fs ? '🗗' : '⛶'}
    </button>
  )
}
