import type { Drink } from '../data/recipes'

// The drink order picture: a clear glass with the layers the customer wants, like the cake order card.
// Same layer colours and order as the 3D glass (world/Bar.tsx Cup).
export function drinkLayers(d: Drink) {
  const L: { h: number; c: string; name: string }[] = []
  if (d.chocolate) L.push({ h: 6, c: '#3b1d12', name: 'chocolate' })
  if (d.shots) L.push({ h: 6 * d.shots, c: '#4a2414', name: `${d.shots} shots` })
  if (d.water) L.push({ h: 14, c: '#7a4a2c', name: 'hot water' })
  const milkC = d.milkType === 'oat' ? '#efdcbc' : d.milkType === 'almond' ? '#f3e6cf' : '#f6eadb'
  if (d.milk === 'steamed') L.push({ h: 17, c: '#d8b48c', name: `steamed ${d.milkType}` }, { h: 4, c: milkC, name: '' })
  if (d.milk === 'foamy') L.push({ h: 9, c: '#d8b48c', name: `${d.milkType} milk` }, { h: 13, c: '#fffaf2', name: 'thick foam' })
  if (d.milk === 'micro') L.push({ h: 10, c: '#c89c70', name: `${d.milkType} microfoam` }, { h: 4, c: milkC, name: '' })
  return L
}

export function drinkSvg(d: Drink, w = 180) {
  const L = drinkLayers(d), H = 120, x0 = 40, x1 = 120, base = 108
  let y = base, bands = ''
  for (const l of L) { const h = l.h * 1.5; y -= h; bands += `<rect x="${x0 + 2}" y="${y}" width="${x1 - x0 - 4}" height="${h}" fill="${l.c}"/>` }
  let top = ''
  if (d.topping === 'whipped') top = `<path d="M${x0 + 6} ${y} q34 -38 74 0 z" fill="#fffaf3" stroke="#eadfd2"/><circle cx="80" cy="${y - 24}" r="7" fill="#fffaf3"/>`
  else if (d.topping === 'cocoa') top = Array.from({ length: 14 }, (_, i) => `<circle cx="${x0 + 8 + (i * 37) % 64}" cy="${y - 2 + (i % 3)}" r="1.6" fill="#5b2e1c"/>`).join('')
  else if (d.topping === 'cinnamon') top = Array.from({ length: 14 }, (_, i) => `<circle cx="${x0 + 8 + (i * 37) % 64}" cy="${y - 2 + (i % 3)}" r="1.6" fill="#b0602a"/>`).join('')
  else if (d.topping === 'sprinkles') top = Array.from({ length: 12 }, (_, i) => `<rect x="${x0 + 8 + (i * 29) % 64}" y="${y - 4 + (i % 3)}" width="5" height="2" rx="1" fill="${['#ff7fb6', '#8ee0c4', '#ffcf5c', '#b892ef'][i % 4]}"/>`).join('')
  return `<svg viewBox="0 ${-10} 160 ${H + 14}" width="${w}" xmlns="http://www.w3.org/2000/svg">
    ${bands}${top}
    <path d="M${x0 - 4} 6 L${x0} ${base + 2} Q80 ${base + 8} ${x1} ${base + 2} L${x1 + 4} 6" fill="rgba(220,240,245,.18)" stroke="#9fb7c2" stroke-width="2.5"/>
    <ellipse cx="80" cy="${base + 5}" rx="44" ry="4" fill="rgba(0,0,0,.08)"/>
  </svg>`
}
