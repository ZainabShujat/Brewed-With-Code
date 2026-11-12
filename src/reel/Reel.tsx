import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { World } from '../App'
import { useGame } from '../systems/store'
import { EPISODES, type Step } from './eps/s01'

// 1080x1920 split screen: code typing on top, the café building itself below.
// Driven by performance.now(), so the notes-brain frame-stepped exporter can capture it exactly.
const CPS = 34 // typing speed, characters per second

type Line = { text: string; file: string; start: number; end: number }

function layout(steps: Step[]) {
  const lines: Line[] = []
  let file = ''
  for (const st of steps) {
    if (st.file) file = st.file
    let t = st.at
    for (const text of st.lines) {
      const end = t + text.length / CPS
      lines.push({ text, file, start: t, end })
      t = end + 0.12
    }
  }
  return lines
}

// Tiny highlighter: comments, strings, numbers, JSX tags, keywords
function paint(text: string) {
  if (text.trimStart().startsWith('//')) return [<span key="c" className="c">{text}</span>]
  const re = /("[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|<\/?[A-Z]\w*|\/?>|\b(?:const|new|return|map|forEach)\b|\/\/.*$)/g
  const out: JSX.Element[] = []
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={i++}>{text.slice(last, m.index)}</span>)
    const tok = m[0]
    const cls = tok.startsWith('//') ? 'c' : /^["']/.test(tok) ? 's' : /^\d/.test(tok) ? 'n' : /^<|>$/.test(tok) ? 't' : 'k'
    out.push(<span key={i++} className={cls}>{tok}</span>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(<span key={i++}>{text.slice(last)}</span>)
  return out
}

export function Reel() {
  const ep = EPISODES[new URLSearchParams(location.search).get('ep') ?? 's01']
  const lines = useMemo(() => layout(ep.steps), [ep])
  const [t, setT] = useState(0)

  useEffect(() => {
    const { startBuild, setMode } = useGame.getState()
    startBuild()
    setMode('exterior')
    const t0 = performance.now()
    const fired = new Set<number>()
    let raf = 0
    const tick = () => {
      const now = (performance.now() - t0) / 1000
      setT(now)
      ep.steps.forEach((st, i) => {
        if (fired.has(i)) return
        // reveal once this step's last line has finished typing
        const myLines = lines.filter((l) => st.lines.includes(l.text) && l.start >= st.at - 0.001)
        const doneAt = myLines.length ? Math.max(...myLines.map((l) => l.end)) : st.at
        if (st.cam && now >= st.at) useGame.getState().mode !== st.cam && setMode(st.cam)
        if (now >= doneAt) {
          fired.add(i)
          if (st.reveal?.length) useGame.getState().reveal(...st.reveal)
        }
      })
      if (now < ep.end) raf = requestAnimationFrame(tick)
      else (window as any).__reelDone = true
    }
    raf = requestAnimationFrame(tick)
    ;(window as any).__endAt = ep.end * 1000
    return () => cancelAnimationFrame(raf)
  }, [ep, lines])

  const visible = lines.filter((l) => t >= l.start)
  const shown = visible.slice(-13)
  const file = visible.length ? visible[visible.length - 1].file : ''
  const firstNo = visible.length - shown.length + 1

  return (
    <div className="reel">
      <div className="code">
        <div className="tabs">
          <span className="dot r" /><span className="dot y" /><span className="dot g" />
          <span className="file">{file}</span>
          <span className="brand">{ep.title}</span>
        </div>
        <pre>
          {shown.map((l, i) => {
            const typed = t >= l.end ? l.text : l.text.slice(0, Math.floor((t - l.start) * CPS))
            const active = t < l.end
            return (
              <div key={firstNo + i} className={'ln' + (active ? ' active' : '')}>
                <span className="no">{firstNo + i}</span>
                <span className="src">{paint(typed)}{active && <span className="caret" />}</span>
              </div>
            )
          })}
        </pre>
      </div>
      <div className="seam"><span>code</span><span className="arrow">▼</span><span>café</span></div>
      <div className="stage">
        <Canvas flat shadows dpr={1} resize={{ offsetSize: true }} camera={{ fov: 45, position: [20, 12, 33] }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
          <color attach="background" args={['#e2c9fb']} />
          <World />
        </Canvas>
      </div>
    </div>
  )
}
