# Brewed With Code — Project Brief

**Notes From a B.Tech Brain | BUILDS · project #001**

An original, low-poly, cute 3D café game that runs in the browser and is built in public. Kozie narrates the build, and "us" means Kozie and the viewer. The finished game is playable on the web, with source on GitHub.

## What the player does
- Runs a café shaped like a **coffee pot**, from one room to a café with glass conservatory wings.
- Makes **real drinks and food**, with recipe ratios that are fact-checked, not invented.
- **Customises** every order: size, shots, milk, temperature, syrups, sweetness, foam, toppings, latte art.
- **Café mode:** customers walk in, order (often combos), wait, react, and pay coins and tips.
- **Zen mode:** no customers. Practise any recipe and get scored on accuracy.
- **Levels up** to unlock recipes, expansion lots (⊕ spots), a **buddy helper**, **barista customisation**, **café customisation** and decor.

## Hard constraints
- **Deadline:** v1 public by **12 Dec 2026**. After that the owner maintains it alone, so content lives in data files they can edit.
- **Hardware:** it must run smoothly on an i7-8565U with Intel UHD 620 integrated graphics and 16 GB RAM. If it runs here, it runs for viewers.
- **No AI slop:** the owner is creative director. Layouts come from their sketches in `references/sketches/`. One art style, everywhere.

## Stack
TypeScript · Vite · React · React Three Fiber (Three.js) · Zustand. Deployed on Vercel later. GitHub repo once it goes public.

## Plan
| Week | Build | Playable result |
|---|---|---|
| 1 (Nov 13–19) | Coffee-pot exterior, corner-room interior, camera modes, art style, customisable barista base | Walk around your café |
| 2 (Nov 20–26) | Drink + food stations, real recipes, customisation drawers, scoring | **Zen mode** |
| 3 (Nov 27–Dec 3) | Customers, combos, coins, levels + unlocks, café customisation | **Café mode** |
| 4 (Dec 4–10) | Buddy helper, decor in ⊕ spots, save game, title screen, deploy, content guide | **v1 public** |
| Dec 11–12 | Buffer + RUNBOOK | Hand-off |

If a week overruns, cut decor content, never the drink system.

## Content
- Each session ends with a git tag (`sNN-feature`), a log in `devlog/sNN.md` (feature, the 4–8 lines worth showing, what broke and the fix) and recorded footage.
- Reels are made in the `notes-brain` repo (`trailer/builds/`): code on top, real game footage below, Kozie narrating.
- Each episode teaches one real B.Tech concept hidden in the café (queue = the customer line, state machine = an order's life, the game loop, and so on).
