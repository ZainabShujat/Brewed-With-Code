import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { World } from '../App'
import { useGame } from '../systems/store'
import { EPISODES, type Step } from './eps/s01'
import { kozieCtl } from '../world/Kozie'
import { anim, tween, walkTo } from '../systems/anim'
import { cafe as line } from '../world/Customers'
import { cascade, CascadeDriver } from './Cascade'
import { useCake } from '../systems/cake'
import { cakeSvg } from '../ui/cakeSvg'
import { machine, ST } from '../world/CakeMachine'

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

const r3f: { state?: any } = {}

// ?embed: only the café, full size, remote-controlled by the parent reel page via window.cafe
function Embedded() {
  useEffect(() => {
    const g = useGame.getState()
    g.startBuild(); g.setMode('exterior'); useGame.setState({ kozie: true })
    ;(window as any).cafe = {
      // flushSync: commit the React update right now, so the exporter's virtual
      // clock and the café never drift apart (React would otherwise render later, in real time)
      reveal: (...ids: string[]) => flushSync(() => useGame.getState().reveal(...ids)),
      mode: (m: any) => flushSync(() => useGame.getState().setMode(m)),
      kozie: {
        say: (sec: number) => kozieCtl.m?.say(sec),
        pose: (p: any) => kozieCtl.m?.pose(p),
        hop: () => { kozieCtl.hopReq = true },
      },
      // BUILDS #003: show every triangle (wireframe), fake frame drops, and the real per-frame numbers
      wire: (on: boolean) => r3f.state?.scene.traverse((o: any) => { if (o.isMesh) [].concat(o.material).forEach((m: any) => { m.wireframe = on }) }),
      stutter: (on: boolean) => { anim.stutter = on },
      stats: () => { const gl = r3f.state.gl; return { triangles: gl.info.render.triangles, calls: gl.info.render.calls } },
      // BUILDS #004: the customer queue
      q: {
        spawn: (hurry = false) => line.spawn(hurry),
        serve: () => line.serve(),
        auto: (on: boolean, spawnEvery = 3.2, serveEvery = 3.8) => Object.assign(line, { auto: on, spawnEvery, serveEvery }),
        reset: () => line.reset(),
        fill: (n: number) => line.fill(n),
        order: () => line.order(),
        size: () => line.line.size,
      },
      // BUILDS #00A: the café assembles itself, piece by piece
      cascade: {
        prepare: () => { document.body.classList.add('notags'); return cascade.prepare() },
        play: (dur: number) => cascade.play(dur, 1),
        fold: (dur: number) => cascade.play(dur, -1),
      },
      kozieHidden: (on: boolean) => { anim.kozie.hidden = on },
      // cake bench (flushSync: commit right away so the frame-stepped render never lags the state)
      cake: {
        layer: (x: any) => flushSync(() => useCake.getState().addLayer(x)),
        fill: (x: any) => flushSync(() => useCake.getState().addFilling(x)),
        frost: (x: any) => flushSync(() => useCake.getState().frost(x)),
        pipe: (x: any) => flushSync(() => useCake.getState().pipe(x)),
        top: (x: any) => flushSync(() => useCake.getState().topWith(x)),
        reset: () => flushSync(() => useCake.getState().reset()),
        spin: (on: boolean) => useCake.setState({ spin: on }),
        // the order picture (SVG) for a given cake, so reel pages can show the expected output
        picture: (cake: any, w = 260) => cakeSvg(cake, w),
        setOrder: (cake: any, label: string) => flushSync(() => useCake.setState({ order: { want: cake, label } })),
        // the cake machine (BUILDS #008): roll to a station, dip a dispenser, show/hide the order screen
        go: (station: string) => { const i = ['start', 'layer', 'frost', 'pipe', 'top', 'star'].indexOf(station); machine.idx = i; machine.target = (ST as any)[station] },
        dropAt: (station: string, fn: () => void) => machine.run(station as any, () => flushSync(fn)),
        showOrder: (ms: number) => flushSync(() => useCake.setState({ orderUntil: performance.now() + ms })),
        resetMachine: () => { machine.queue.length = 0; machine.dipT = -1; machine.active = ''; machine.idx = 0; machine.target = machine.x = ST.start },
      },
      showAll: () => flushSync(() => useGame.setState({ revealed: null })),
      // vlog controls (BUILDS #002 tour)
      vlog: {
        door: (which: 'doorOut' | 'doorIn', to: number, dur = 0.8) => tween(() => anim[which], (v) => (anim[which] = v), to, dur),
        drawer: (id: string, to: number, dur = 0.35) => tween(() => anim.drawers[id], (v) => (anim.drawers[id] = v), to, dur),
        place: (x: number, z: number, s = 1, y = 0) => { Object.assign(anim.kozie, { free: true, s, walking: false }); anim.kozie.pos.set(x, y, z) },
        walk: (x: number, z: number, dur: number) => walkTo(x, z, dur),
        face: (cam: boolean, heading?: number) => { anim.kozie.faceCam = cam; if (heading !== undefined) anim.kozie.heading = heading },
        follow: (ox: number, oy: number, oz: number, speed = 3) => Object.assign(anim.cam, { active: true, follow: true, speed, dist: 1.4, off: anim.cam.off.set(ox, oy, oz) }),
        shot: (p: number[], l: number[], speed = 3, dist = 1.4, fov = 62) => { Object.assign(anim.cam, { active: true, follow: false, speed, dist, fov }); anim.cam.pos.set(p[0], p[1], p[2]); anim.cam.look.set(l[0], l[1], l[2])
          // a cut (speed >= 100) moves the real camera right now, so even the very first frame is framed
          const cam = r3f.state?.camera
          if (cam && speed >= 100) { cam.position.set(p[0], p[1], p[2]).sub(anim.cam.look).multiplyScalar(dist).add(anim.cam.look); cam.lookAt(anim.cam.look); cam.fov = anim.cam.fov; cam.updateProjectionMatrix() }
        },
        sway: (v: number) => (anim.cam.sway = v),
        off: () => { anim.cam.active = false; anim.kozie.free = false },
      },
      state: () => { const s = useGame.getState(); return { mode: s.mode, revealed: s.revealed && [...s.revealed] } },
      reset: () => flushSync(() => { useGame.getState().startBuild(); useGame.getState().setMode('exterior') }),
    }
    ;(window as any).__cafeReady = true
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas onCreated={(s) => { r3f.state = s }} flat shadows dpr={1} camera={{ fov: 45, position: [20, 12, 33] }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#dfccf6']} />
        <World />
        <CascadeDriver />
      </Canvas>
    </div>
  )
}

export function Reel() {
  if (location.search.includes('embed')) return <Embedded />
  return <SplitReel />
}

function SplitReel() {
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
          <color attach="background" args={['#dfccf6']} />
          <World />
        </Canvas>
      </div>
    </div>
  )
}
