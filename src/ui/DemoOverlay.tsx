import { useDemo } from '../systems/demo'

// The demo's captions: what's happening and why, one step at a time, with a Skip that's always there.
export function DemoOverlay() {
  const d = useDemo()
  if (!d.on) return null
  return (
    <div className="demo" onPointerDown={(e) => e.stopPropagation()}>
      <div className="demo-top"><span className="demo-tag">DEMO</span>
        <span className="demo-dots">{Array.from({ length: d.total }, (_, i) => <i key={i} className={i + 1 < d.step ? 'done' : i + 1 === d.step ? 'on' : ''} />)}</span>
        <button className="demo-skip" onClick={() => d.stop()}>Skip demo</button></div>
      {d.caption && <div className="demo-cap" key={d.caption}><b>{d.caption}</b>{d.sub && <span>{d.sub}</span>}</div>}
    </div>
  )
}
