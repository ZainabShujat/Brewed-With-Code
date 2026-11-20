import { RECIPES, randomOrder, type Order, type Recipe } from '../data/recipes'
import { useTodayMenu, orderable } from './todaymenu'
import { byId } from '../data/menu'
import { useDay } from './day'
import { usePantry } from './pantry'
import { setCakeMenu } from './cake'

// A customer who wants a cake (from Day 7, about 1 in 4): taking the order sends you to the cake bench,
// and boxing a cake there serves them.
export const cakeOrder = (): Order => ({ recipe: { ...RECIPES[0], name: 'Cake', price: 9 }, want: { ...RECIPES[0].base }, label: '🎂 a cake to order', cake: true })

/** Customers only order what's on Today's Menu (and can be made now). Cakes come up about 1 in 4 when the menu has any. */
export function menuOrder(rand: () => number = Math.random): Order {
  const day = useDay.getState().day, items = orderable(day, usePantry.getState().stock)
  // nothing preparable (pantry empty)? still only what's on the menu, the pantry warning will show at the bar
  const pool = items.length ? items : useTodayMenu.getState().ids.map(byId).filter((m) => !!m)
  const drinks = pool.flatMap((m) => (m!.order.kind === 'drink' ? [m!.order.recipe] : [])) as Recipe[]
  const cakes = pool.filter((m) => m!.order.kind === 'cake')
  if (cakes.length && (!drinks.length || rand() < 0.25)) return cakeOrder()
  return randomOrder(rand, drinks)
}
/** the cake flavours on today's menu (the cake bench picks from these) */
export function menuSponges(): ('vanilla' | 'chocolate' | 'strawberry')[] {
  return useTodayMenu.getState().ids.map(byId).flatMap((m) => (m && m.order.kind === 'cake' ? [m.order.sponge] : []))
}
setCakeMenu(menuSponges)
