import { RECIPES, type Order } from '../data/recipes'

// A customer who wants a cake (from Day 7, about 1 in 4): taking the order sends you to the cake bench,
// and boxing a cake there serves them.
export const cakeOrder = (): Order => ({ recipe: { ...RECIPES[0], name: 'Cake', price: 9 }, want: { ...RECIPES[0].base }, label: '🎂 a cake to order', cake: true })
