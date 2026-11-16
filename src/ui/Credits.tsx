import { useState } from 'react'
import { CREDITS } from '../data/credits'

// "Credits" button (top-right of the mode bar) → a card listing every model and its licence
export function Credits() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="creditsbtn" onClick={() => setOpen(true)}>credits</button>
      {open && (
        <div className="credits" onClick={() => setOpen(false)}>
          <div className="credits-card" onClick={(e) => e.stopPropagation()}>
            <h2>Credits</h2>
            {CREDITS.map((c) => (
              <p key={c.url}><b>{c.what}</b>: <a href={c.url} target="_blank" rel="noreferrer">“{c.title}”</a> by {c.author} · {c.license}</p>
            ))}
            <button onClick={() => setOpen(false)}>close</button>
          </div>
        </div>
      )}
    </>
  )
}
