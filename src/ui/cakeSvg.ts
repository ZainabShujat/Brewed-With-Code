import { FILL_COL, FROST_COL, PIPE_COL, SPONGE_COL, type Cake } from '../systems/cake'

// The "expected output" picture on a cake order: a side view of the finished cake, drawn as SVG
// from the same data the game scores against. Used by the in-game order card and by reels.
export function cakeSvg(c: Cake, w = 200) {
  const W = 200, cx = 100, R = 62, lh = 26, fh = 6
  const n = c.layers.length || 1
  const stackH = n * lh + (n - 1) * fh
  const base = 160, top = base - stackH
  const out: string[] = []
  // crop the picture to the cake (taller cakes get a taller picture, never empty space)
  const vy = top - 44, vh = base + 20 - vy
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${vy} ${W} ${vh}" width="${w}" height="${(w * vh) / W}">`)
  // plate
  out.push(`<ellipse cx="${cx}" cy="${base + 6}" rx="${R + 22}" ry="10" fill="#f3eef2" stroke="#d9cfd8" stroke-width="2"/>`)
  // layers + fillings, bottom-up
  let y = base
  c.layers.forEach((s, i) => {
    y -= lh
    out.push(`<rect x="${cx - R}" y="${y}" width="${R * 2}" height="${lh}" fill="${SPONGE_COL[s]}"/>`)
    if (c.fillings[i] && i < c.layers.length - 1) { y -= fh; out.push(`<rect x="${cx - R}" y="${y}" width="${R * 2}" height="${fh}" fill="${FILL_COL[c.fillings[i]]}"/>`) }
  })
  // top ellipse of the cake (sponge colour if unfrosted)
  const topCol = c.frosting !== 'none' ? FROST_COL[c.frosting] : SPONGE_COL[c.layers[n - 1] ?? 'vanilla']
  if (c.frosting !== 'none') {
    // collar + uneven drips running part-way down
    out.push(`<rect x="${cx - R}" y="${top}" width="${R * 2}" height="9" fill="${topCol}"/>`)
    const drips = [0.55, 0.3, 0.75, 0.4, 0.65, 0.25, 0.5, 0.8, 0.35]
    drips.forEach((d, i) => {
      const x = cx - R + 7 + i * ((R * 2 - 14) / (drips.length - 1)), len = 8 + d * stackH * 0.55
      out.push(`<rect x="${x - 4}" y="${top}" width="8" height="${len}" rx="4" fill="${topCol}"/>`)
    })
  }
  out.push(`<ellipse cx="${cx}" cy="${top}" rx="${R}" ry="12" fill="${topCol}"/>`)
  // rosettes along the back and front rim
  if (c.piping !== 'none') {
    const pc = PIPE_COL[c.piping]
    for (let i = 0; i < 7; i++) { const x = cx - R + 9 + i * ((R * 2 - 18) / 6); out.push(`<circle cx="${x}" cy="${top - 2}" r="7" fill="${pc}"/><path d="M${x - 4} ${top - 6} Q${x} ${top - 17} ${x + 4} ${top - 6}Z" fill="${pc}"/>`) }
  }
  // toppings
  if (c.top === 'cherries' || c.top === 'strawberries') {
    for (let i = 0; i < 4; i++) { const x = cx - 40 + i * 27
      out.push(c.top === 'cherries'
        ? `<circle cx="${x}" cy="${top - 15}" r="6" fill="#b3122e"/><path d="M${x} ${top - 21} q3 -7 7 -9" stroke="#4b6b2a" stroke-width="2" fill="none"/>`
        : `<path d="M${x - 7} ${top - 20} L${x + 7} ${top - 20} L${x} ${top - 6}Z" fill="#d8344a"/><path d="M${x - 6} ${top - 21} L${x + 6} ${top - 21} L${x} ${top - 26}Z" fill="#5a8a3a"/>`) }
  } else if (c.top === 'candles') {
    for (let i = 0; i < 3; i++) { const x = cx - 22 + i * 22
      out.push(`<rect x="${x - 3}" y="${top - 34}" width="6" height="26" rx="2" fill="${i % 2 ? '#b892ef' : '#f07aac'}"/><ellipse cx="${x}" cy="${top - 38}" rx="4" ry="6" fill="#ffb347"/>`) }
  } else if (c.top === 'sprinkles') {
    const cols = ['#f07aac', '#6ed3b4', '#fcc84a', '#b892ef', '#ffffff']
    for (let i = 0; i < 18; i++) { const x = cx - R + 12 + ((i * 37) % (R * 2 - 24)), yy = top - 4 + ((i * 13) % 9) - 4
      out.push(`<rect x="${x}" y="${yy}" width="7" height="2.4" rx="1.2" fill="${cols[i % cols.length]}" transform="rotate(${(i * 47) % 180} ${x + 3} ${yy + 1})"/>`) }
  }
  out.push('</svg>')
  return out.join('')
}
