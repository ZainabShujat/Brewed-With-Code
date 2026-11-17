import { useEffect, useState } from 'react'
import { useMusic, TRACKS } from '../systems/music'

// 🎵 in the corner: café radio. Pick a track or shuffle, volume, on/off.
export function MusicButton() {
  const m = useMusic()
  const [open, setOpen] = useState(false)
  // browsers only allow sound after a click, so start the music on the first one
  useEffect(() => { const go = () => useMusic.getState().start(); window.addEventListener('pointerdown', go); return () => window.removeEventListener('pointerdown', go) }, [])
  const now = TRACKS.find((t) => t.id === m.playing)?.title
  return (
    <>
      <button className="musicbtn" onClick={() => setOpen((o) => !o)} title="music">{m.on ? '🎵' : '🔇'}</button>
      {open && (
        <div className="musicpanel">
          <div className="mp-h">Café radio {m.on && now ? <span>· now playing {now}</span> : null}</div>
          <button className={'mp-row' + (m.track === 'shuffle' ? ' on' : '')} onClick={() => m.setTrack('shuffle')}>🔀 Shuffle all</button>
          {TRACKS.map((t) => <button key={t.id} className={'mp-row' + (m.track === t.id ? ' on' : '')} onClick={() => m.setTrack(t.id)}>{m.playing === t.id && m.on ? '▶ ' : ''}{t.title}</button>)}
          <label className="mp-vol">🔉 <input type="range" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} /></label>
          <button className="mp-row off" onClick={() => m.toggle()}>{m.on ? 'Turn music off' : 'Turn music on'}</button>
          <div className="mp-cr">Music by Kevin MacLeod (incompetech.com), CC BY 4.0</div>
        </div>
      )}
    </>
  )
}
