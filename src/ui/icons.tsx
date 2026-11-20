import type { IngredientId } from '../data/ingredients'
import type { Station } from '../data/menu'

// Small flat illustrations in the café palette (plum outline, soft fills), used instead of emoji in the kitchen,
// Today's Menu and the Recipe Book. All drawn on a 32×32 grid so they line up at any size.
const PLUM = '#3d1846', S = { stroke: PLUM, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
type P = { size?: number; className?: string; title?: string }
const Svg = ({ size = 22, className, title, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>{children}</svg>
)

export const Flour = (p: P) => <Svg {...p}><path d="M9 8 L11 5 H21 L23 8 L24 27 H8 Z" fill="#f6ead8" {...S} /><path d="M11 5 L13 8 M21 5 L19 8 M9 8 H23" fill="none" {...S} /><path d="M12 15 q4 -3 8 0 q-4 5 -8 0z" fill="#e8c98f" {...S} strokeWidth={1.2} /></Svg>
export const Sugar = (p: P) => <Svg {...p}><rect x="9" y="5" width="14" height="4" rx="1.5" fill="#f07fa8" {...S} /><rect x="8" y="9" width="16" height="18" rx="3" fill="#f3eef7" {...S} /><rect x="10" y="15" width="12" height="10" rx="2" fill="#fff" stroke="none" /><path d="M12 18h2M16 21h2M13 23h2M18 17h2" stroke="#c9c3cf" strokeWidth={1.4} strokeLinecap="round" /></Svg>
export const Egg = (p: P) => <Svg {...p}><path d="M16 4 C10 4 7 13 7 19 a9 9 0 0 0 18 0 C25 13 22 4 16 4z" fill="#fbf3e6" {...S} /><ellipse cx="13" cy="13" rx="2" ry="3" fill="#fff" /></Svg>
export const Butter = (p: P) => <Svg {...p}><ellipse cx="16" cy="23" rx="13" ry="4.5" fill="#fff" {...S} /><path d="M7 21 V14 L11 10 H25 V18 L21 22 H7z" fill="#f7dd77" {...S} /><path d="M7 14 H21 L25 10 M21 14 V22" fill="none" {...S} /></Svg>
export const Cocoa = (p: P) => <Svg {...p}><ellipse cx="16" cy="8" rx="9" ry="3" fill="#cdb8e6" {...S} /><path d="M7 8 V24 a9 3 0 0 0 18 0 V8" fill="#7a4a8c" {...S} /><rect x="10" y="13" width="12" height="7" rx="1.5" fill="#f6ead8" stroke="none" /><path d="M12 16.5h8" stroke="#6b3f2a" strokeWidth={2} strokeLinecap="round" /></Svg>
export const Strawberry = (p: P) => <Svg {...p}><path d="M16 28 C9 23 6 17 8 12 C10 8 22 8 24 12 C26 17 23 23 16 28z" fill="#e0475a" {...S} /><path d="M10 9 L16 12 L22 9 L19 6 L16 8 L13 6z" fill="#6aa36f" {...S} /><g fill="#ffe8a8">{[[12, 15], [17, 14], [20, 18], [14, 20], [17, 23]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={0.9} />)}</g></Svg>
export const Cream = (p: P) => <Svg {...p}><path d="M10 12 h12 l-1.5 15 h-9z" fill="#cdb8e6" {...S} /><path d="M9 12 c0 -4 3 -5 4 -6 c1 2 4 2 5 0 c2 1 5 3 5 6z" fill="#fff" {...S} /></Svg>
export const Beans = (p: P) => <Svg {...p}><ellipse cx="12" cy="16" rx="5.5" ry="7.5" transform="rotate(-25 12 16)" fill="#8b5a3c" {...S} /><path d="M9 11 q4 5 6 10" fill="none" stroke="#5a3424" strokeWidth={1.4} /><ellipse cx="21" cy="17" rx="5" ry="7" transform="rotate(20 21 17)" fill="#a06a45" {...S} /><path d="M19 11 q-1 6 3 12" fill="none" stroke="#5a3424" strokeWidth={1.4} /></Svg>
export const Milk = (p: P) => <Svg {...p}><path d="M11 4 h10 v4 l3 5 v14 h-16 v-14 l3 -5z" fill="#fff" {...S} /><path d="M8 17 h16 v10 h-16z" fill="#bde3f3" {...S} /></Svg>
export const Sauce = (p: P) => <Svg {...p}><rect x="13" y="3" width="6" height="5" rx="1" fill="#f07fa8" {...S} /><path d="M12 8 h8 l2 4 v15 h-12 v-15z" fill="#6b3f2a" {...S} /><rect x="11" y="15" width="10" height="6" rx="1" fill="#f6ead8" stroke="none" /></Svg>
export const Spice = (p: P) => <Svg {...p}><rect x="10" y="4" width="12" height="5" rx="1.5" fill="#cdb8e6" {...S} /><rect x="9" y="9" width="14" height="18" rx="3" fill="#f6ead8" {...S} /><circle cx="16" cy="18" r="4" fill="#b0602a" {...S} strokeWidth={1.2} /></Svg>
export const Sprinkles = (p: P) => <Svg {...p}><rect x="9" y="8" width="14" height="19" rx="3" fill="#fff" {...S} /><rect x="10" y="4" width="12" height="4" rx="1.5" fill="#f07fa8" {...S} />{[[12, 13, '#f07fa8'], [17, 12, '#7fc8a9'], [20, 16, '#f7dd77'], [13, 19, '#a47fe0'], [18, 21, '#f07fa8'], [14, 24, '#7fc8a9']].map(([x, y, c]) => <rect key={`${x}${y}`} x={x as number} y={y as number} width={3} height={1.4} rx={0.7} fill={c as string} transform={`rotate(30 ${x} ${y})`} />)}</Svg>
export const Cherry = (p: P) => <Svg {...p}><path d="M16 5 q-2 8 -6 13 M16 5 q3 8 6 12" fill="none" stroke="#3a7a4a" strokeWidth={1.6} /><circle cx="10" cy="21" r="5" fill="#c2324f" {...S} /><circle cx="22" cy="20" r="5" fill="#c2324f" {...S} /></Svg>
export const Candle = (p: P) => <Svg {...p}><path d="M16 4 q3 4 0 6 q-3 -2 0 -6z" fill="#f7b733" {...S} strokeWidth={1.2} /><rect x="13" y="11" width="6" height="16" rx="1.5" fill="#cdb8e6" {...S} /><path d="M13 15 l6 -2 M13 20 l6 -2 M13 25 l6 -2" stroke="#f07fa8" strokeWidth={1.4} /></Svg>
export const Jam = (p: P) => <Svg {...p}><rect x="9" y="5" width="14" height="5" rx="1.5" fill="#fff" {...S} /><path d="M8 10 h16 v13 a4 4 0 0 1 -4 4 h-8 a4 4 0 0 1 -4 -4z" fill="#c2324f" {...S} /><circle cx="16" cy="18" r="3.5" fill="#f6ead8" stroke="none" /></Svg>

export const Whisk = (p: P) => <Svg {...p}><path d="M16 4 v8" stroke="#a47fe0" strokeWidth={3.4} strokeLinecap="round" /><path d="M16 12 C9 15 9 27 16 28 C23 27 23 15 16 12z M16 12 C12.5 16 12.5 26 16 28 C19.5 26 19.5 16 16 12z" fill="none" {...S} /></Svg>
export const Bowl = (p: P) => <Svg {...p}><path d="M4 14 h24 a12 11 0 0 1 -24 0z" fill="#cdb8e6" {...S} /><ellipse cx="16" cy="14" rx="12" ry="2.5" fill="#f1d6a2" {...S} /></Svg>
export const Cup = (p: P) => <Svg {...p}><path d="M7 11 h16 v8 a8 8 0 0 1 -16 0z" fill="#fff6ee" {...S} /><path d="M23 13 h2 a3 3 0 0 1 0 6 h-2" fill="none" {...S} /><path d="M12 4 q2 2 0 4 M17 4 q2 2 0 4" fill="none" stroke="#c9a8d8" strokeWidth={1.4} strokeLinecap="round" /><ellipse cx="15" cy="27" rx="10" ry="2" fill="#f3dfe9" {...S} /></Svg>
export const CakeIcon = (p: P) => <Svg {...p}><path d="M6 15 h20 v11 h-20z" fill="#f1d6a2" {...S} /><path d="M6 15 c2 -5 18 -5 20 0 c-2 3 -3 0 -5 2 c-2 -2 -3 1 -5 -1 c-2 2 -3 -1 -5 1 c-2 -2 -3 1 -5 -2z" fill="#f4b6c8" {...S} /><path d="M6 21 h20" stroke="#fff6ec" strokeWidth={2} /><circle cx="16" cy="9" r="2.2" fill="#c2324f" {...S} strokeWidth={1.2} /></Svg>
export const Croissant = (p: P) => <Svg {...p}><path d="M4 20 C6 10 26 10 28 20 C24 18 22 22 16 22 C10 22 8 18 4 20z" fill="#e8b05c" {...S} /><path d="M11 13 l2 8 M16 12 v10 M21 13 l-2 8" stroke="#b07a35" strokeWidth={1.3} /></Svg>
export const Coin = (p: P) => <Svg {...p}><circle cx="16" cy="16" r="11" fill="#f7c948" {...S} /><circle cx="16" cy="16" r="7" fill="none" stroke="#c99a1e" strokeWidth={1.4} /><path d="M16 11 v10" stroke="#c99a1e" strokeWidth={2} strokeLinecap="round" /></Svg>
export const Clock = (p: P) => <Svg {...p}><circle cx="16" cy="16" r="11" fill="#fff6ee" {...S} /><path d="M16 9 v7 l5 3" fill="none" {...S} /></Svg>
export const Lock = (p: P) => <Svg {...p}><path d="M10 14 v-3 a6 6 0 0 1 12 0 v3" fill="none" {...S} /><rect x="7" y="14" width="18" height="13" rx="3" fill="#cdb8e6" {...S} /><circle cx="16" cy="20" r="2" fill={PLUM} /></Svg>
export const Tick = (p: P) => <Svg {...p}><circle cx="16" cy="16" r="12" fill="#7fc8a9" {...S} /><path d="M10 16.5 l4 4 l8 -9" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
export const Plus = (p: P) => <Svg {...p}><circle cx="16" cy="16" r="12" fill="#f3dfe9" {...S} /><path d="M16 10 v12 M10 16 h12" stroke={PLUM} strokeWidth={2.4} strokeLinecap="round" /></Svg>
export const Info = (p: P) => <Svg {...p}><circle cx="16" cy="16" r="12" fill="#f3dfe9" {...S} /><circle cx="16" cy="10.5" r="1.7" fill={PLUM} /><path d="M16 15 v8" stroke={PLUM} strokeWidth={2.4} strokeLinecap="round" /></Svg>
export const Back = (p: P) => <Svg {...p}><path d="M19 7 l-9 9 l9 9" fill="none" stroke={PLUM} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
export const Close = (p: P) => <Svg {...p}><path d="M9 9 l14 14 M23 9 l-14 14" stroke={PLUM} strokeWidth={2.6} strokeLinecap="round" /></Svg>
export const Book = (p: P) => <Svg {...p}><path d="M4 8 c4 -2 9 -2 12 1 c3 -3 8 -3 12 -1 v17 c-4 -2 -9 -2 -12 1 c-3 -3 -8 -3 -12 -1z" fill="#fff6ee" {...S} /><path d="M16 9 v17" {...S} /><path d="M7 13 h6 M7 17 h6 M19 13 h6 M19 17 h6" stroke="#c9a8d8" strokeWidth={1.3} strokeLinecap="round" /></Svg>

/** each pantry ingredient's picture */
export const INGREDIENT_ICON: Record<IngredientId, (p: P) => JSX.Element> = {
  beans: Beans, chocSauce: Sauce, milkWhole: Milk, milkOat: Milk, milkAlmond: Milk, cream: Cream, butter: Butter,
  flour: Flour, sugar: Sugar, eggs: Egg, jam: Jam, sprinkles: Sprinkles, cocoa: Cocoa, cinnamon: Spice,
  strawberries: Strawberry, cherries: Cherry, candles: Candle,
}
export const IngIcon = ({ id, ...p }: P & { id: IngredientId }) => { const I = INGREDIENT_ICON[id]; return <I {...p} /> }
export const STATION_ICON: Record<Station, (p: P) => JSX.Element> = { bar: Cup, kitchen: Bowl, cake: CakeIcon }

export const PlayTri = (p: P) => <Svg {...p}><path d="M10 6 L25 16 L10 26z" fill="#5e2a75" {...S} /></Svg>
export const Folder = (p: P) => <Svg {...p}><path d="M4 9 a2 2 0 0 1 2 -2 h7 l3 3 h10 a2 2 0 0 1 2 2 v13 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2z" fill="#fff6ee" {...S} /><path d="M4 13 h24" {...S} /></Svg>
export const Load = (p: P) => <Svg {...p}><path d="M16 5 v14 M10 13 l6 6 l6 -6" fill="none" {...S} strokeWidth={2.2} /><path d="M6 22 v4 h20 v-4" fill="none" {...S} strokeWidth={2.2} /></Svg>
export const Gear = (p: P) => <Svg {...p}><path d="M16 4 l2.2 3.2 l3.8 -0.8 l0.8 3.8 l3.2 2.2 l-2 3.6 l2 3.6 l-3.2 2.2 l-0.8 3.8 l-3.8 -0.8 L16 28 l-2.2 -3.2 l-3.8 0.8 l-0.8 -3.8 l-3.2 -2.2 l2 -3.6 l-2 -3.6 l3.2 -2.2 l0.8 -3.8 l3.8 0.8z" fill="#fff6ee" {...S} /><circle cx="16" cy="16" r="4" fill="#cdb8e6" {...S} /></Svg>
export const Spark = (p: P) => <Svg {...p}><path d="M16 4 l2.6 8.4 L27 15 l-8.4 2.6 L16 26 l-2.6 -8.4 L5 15 l8.4 -2.6z" fill="#f7c948" {...S} /></Svg>
export const Star = (p: P) => <Svg {...p}><path d="M16 4 l3.6 7.6 l8.2 1 l-6 5.8 l1.6 8.2 L16 22.6 l-7.4 4 l1.6 -8.2 l-6 -5.8 l8.2 -1z" fill="#f7c948" {...S} /></Svg>
