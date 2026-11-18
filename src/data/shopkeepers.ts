import { folk, rng, type FolkSpec } from '../world/folk/specs'
import type { ShopKind } from '../world/streetLayout'

// The six shopkeepers: townsfolk picked at random (seeded, so they never change), each with a name and their own
// lines. You can walk up and chat (T); at the four ingredient shops they serve you at the counter (F).
type Keeper = { name: string; spec: FolkSpec; lines: string[] }
const MALLOW_NAMES = ['Puffington', 'Toasty Mae', 'Mallory', 'Squishy Sam', 'Coco Fluff', 'Rae of Sugar']
const PAPER_NAMES = ['Margo Margin', 'Inky', 'Spiral Steve', 'Folio', 'Dot Grid', 'Page Turner']
const LINES: Partial<Record<ShopKind, string[]>> = {
  coffee: ['Fresh roast this morning! Smell that? ☕', 'I hear your café pulls a lovely shot.', 'Bulk beans are cheaper. Just saying.', "I've been grinding since sunrise. Literally.", 'Come back when you run out of beans!'],
  dairy: ["Whole, oat or almond? I don't judge 🥛", 'Steam it slow and it goes all silky.', 'Cream for the whipped tops, darling.', 'The marshmallows love our oat milk.', "Milk keeps forever here. Don't ask how."],
  baking: ['Flour on everything. Occupational hazard 🥖', 'Eggs by the half dozen, or a whole crate?', 'Strawberry sponge needs extra berries, you know.', 'My grandmother was a recipe book. True story.', 'Butter makes everything better.'],
  sweets: ['Sprinkles! So many sprinkles! ✨', 'Cherries or strawberries? Why not both 🍒', 'Candles for birthday cakes, right this way.', 'Cocoa dusting is very in this season.', "Don't tell the dentist 🍬"],
  books: ['Shh… just kidding. Welcome! 📚', 'A new cookbook came in. Interested?', 'Notebooks from the east side love poetry.', 'Read anything good lately?', "Mind the crumbs, it's in the name."],
  flowers: ['Tulips for your tables? 🌷', 'A café needs flowers. Trust me.', 'I deliver! Well, I will one day.', 'The marshmallows always buy lavender.', "Stop and smell the roses. They're right there."],
}
const r = rng(777)
const used = { mallow: 0, paper: 0 }
export const KEEPERS: Partial<Record<ShopKind, Keeper>> = Object.fromEntries((['coffee', 'dairy', 'baking', 'sweets', 'books', 'flowers'] as ShopKind[]).map((kind) => {
  const k = r() < 0.5 ? 'mallow' : 'paper'
  const name = (k === 'mallow' ? MALLOW_NAMES : PAPER_NAMES)[used[k]++]
  return [kind, { name, spec: folk(k, Math.floor(r() * 50)), lines: LINES[kind] ?? ['Hello!'] }]
}))
