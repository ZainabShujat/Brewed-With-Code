import { useEffect, useRef, useState } from 'react'
import { useGame } from '../systems/store'

// A short cozy loading card while switching views (Outside / Dollhouse / Walk / Barista / Cakes): it covers the
// camera cut and the first heavy frames of the new view, then fades away.
const NAMES: Record<string, string> = { exterior: 'Outside', dollhouse: 'Dollhouse', walk: 'Exploring', fp: 'First person', pov: 'The coffee bar', cake: 'The cake bench' }
const GLIDE = ['walk', 'fp', 'dollhouse']
export function ModeFade() {
  const mode = useGame((s) => s.mode)
  const first = useRef(true), prev = useRef(mode), [show, setShow] = useState<string | null>(null)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const from = prev.current; prev.current = mode
    if (GLIDE.includes(from) && GLIDE.includes(mode)) return // these glide smoothly instead
    setShow(NAMES[mode] ?? '')
    const t = setTimeout(() => setShow(null), 550) // (a timer, not rAF: rAF never fires in a hidden tab, and the card would stick)
    return () => clearTimeout(t)
  }, [mode])
  return <div className={'modefade' + (show !== null ? ' on' : '')}><div className="mf-cup">☕</div><div className="mf-name">{show}</div></div>
}
