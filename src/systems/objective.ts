import { useDay } from './day'
import { useShop } from './shop'
import { useKitchen } from './kitchen'
import { useCake } from './cake'
import { cafe } from '../world/Customers'

// What should I do now? (21 Nov: "everywhere, every time, it should be easy to grasp what we have to do")
// One plain sentence + WHERE to go (a spot in café layout units, for the in-world arrow). Read every frame by
// the goal line and the arrow; derived from the game's own state, so it can never drift out of sync.
export type Where = 'door' | 'counter' | 'kitchen' | 'cake' | null
export const WHERE_AT: Record<Exclude<Where, null>, [number, number, number]> = {
  door: [0, 3.2, 12.6], counter: [0.3, 2.6, -5.2], kitchen: [7.5, 3.4, -6.9], cake: [-7.0, 3.2, -7.6],
}
export type Objective = { text: string; where: Where; icon: string }

export function objective(): Objective {
  const d = useDay.getState(), shop = useShop.getState()
  if (d.phase === 'idle') return { text: 'Open your café: walk to the door and flip the sign', where: 'door', icon: 'door' }
  const f = cafe.line.peek(), o = f && f.phase === 'line' ? shop.orders[f.id] : undefined
  if (o?.cake) {
    const sponge = useCake.getState().order.want.layers[0], b = useKitchen.getState().batter[sponge] ?? 0, n = useCake.getState().order.want.layers.length
    if (b < n) return { text: `Cake order! Mix ${sponge} batter in the kitchen`, where: 'kitchen', icon: 'bowl' }
    return { text: 'Cake order! Bake it at the cake bench', where: 'cake', icon: 'cake' }
  }
  if (o) return { text: `A customer wants ${/^[AEIOU]/i.test(o.recipe.name) ? 'an' : 'a'} ${o.recipe.name}: take their order`, where: 'counter', icon: 'cup' }
  if (d.phase === 'closing') return cafe.line.size === 0
    ? { text: 'Closing time: flip the sign at the door', where: 'door', icon: 'door' }
    : { text: 'Last customers: serve them before you close', where: 'counter', icon: 'cup' }
  return { text: 'Waiting for customers: clear cups for tips, or explore', where: null, icon: 'cup' }
}
