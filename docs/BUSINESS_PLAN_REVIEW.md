# Review: business management, customer flow & expansion

18 Nov 2026. A review of the "café → café + bakery business" plan (inspired by how Supermarket Together makes running a
shop fun; we adapt principles only, no stock management). Written after reading the code at commit e9afe94.

**Verdict: a good fit. About 70% of the foundations already exist in some form.** The plan can be built on the current
stack (Vite + React 18 + React Three Fiber + drei + three.js + zustand, no physics engine, no navmesh). Nothing needs
rewriting; three things need reshaping (business hours, one order system, furniture as data). Phases 1–2 fit before
launch (1 Dec), phases 3–5 fit in December, phase 6 in January, co-op is the one part that probably won't fit by 12 Jan.

---

## 1. Audit

### Already implemented
| System | Where | Notes |
|---|---|---|
| A business day: idle → open → closing → results → next day | `systems/day.ts`, `ui/DayHud.tsx` | open for `DAY_LEN` = 180 s; closing waits for the line to empty; results screen; stars |
| Day stats | `DayStats` | served, perfect, coins, tips, walkouts, cakes |
| Saving | `day.ts` (localStorage, sanitised) | day, bank, best, stars, `unlocks: string[]` (saved but unused) |
| Time of day | `systems/clock.ts`, `Lighting.tsx` | 1 game hour = 1 real minute (or real clock); sun, night, lamps |
| Customers | `world/Customers.tsx` | pool of 8; walk in → line (priority queue, "in a hurry" cut-ins) → served → sit at a free seat (read / phone / sip) → leave; patience bar; walk-outs recorded |
| Seats | `SEATS` from `TABLES` | 7 tables × 4 chairs; a `taken` set; customers never share a chair |
| Coffee | `systems/shop.ts`, `world/Bar.tsx` | made by hand (ml, shots, milk, toppings), craft score, tips |
| Cakes | `systems/cake.ts`, `world/CakeMachine.tsx`, `Cake.tsx` | tin → layers → fillings → frosting → piping → topping → box, scored |
| Walking + collision | `systems/movement.ts`, `layout.ts BLOCKERS` | box blockers (counter, fridge, kitchen, every table) |
| Cameras | `systems/CameraRig.tsx` | outside, dollhouse, walk, barista, cakes; fade cuts |
| The street + neighbours | `Street.tsx`, `Neighbours.tsx` | the level-1 coffee cart, a "For Lease" unit next door |
| Tests | `tests/*.test.ts`, `tests/playthrough.py` | 26 unit + 13 browser checks |

### Partly implemented
| What | What's missing |
|---|---|
| Opening/closing | the day runs on its own 180 s timer, **not on the clock**; you can't walk around a closed café preparing; no "open" sign |
| Orders | coffee orders live on customers (`shop.orders`), **cake orders are a separate single order** not tied to anyone; no combined order |
| Payment | happens silently on serve; no cashier step, no bill |
| Progression | `unlocks[]` is saved but nothing reads it; Story/Chill modes are planned, not built |
| Seating | fixed seats; customers pick any free chair; no groups, no table service, no dirty tables |
| Customer paths | hand-written waypoints (lanes), fine for a fixed room, **won't adapt to moved furniture** |

### Visual only (no gameplay yet)
- Pastry cases on the counter (`PastryCase`), the fridge, the kitchen corner, plants, lamps, rugs.
- The "+" markers in the room (`PLUS_SPOTS`): built for reels, a natural "buy something here" hook.
- The "For Lease" shop next door; the coffee cart (level 1 is a model, not a playable stage yet).
- The teapot's lid (the building is a teapot: **its lid is a ready-made second floor**).

### Completely new
Furniture shop + placement mode, groups + table assignment + table cleaning, a cashier station, one shared order
system across stations, reputation + demand, expansion stages, stairs + a second floor, the bakery department, co-op.

## 2. Reuse / modify / new

| Reuse as is | Modify | New |
|---|---|---|
| day phases + stats + results | business hours on the game clock (open at 8:00, close at 18:00), closed state, a sign to flip | furniture catalogue + placement mode |
| priority-queue line, patience, walk-outs | one order system: a customer's order = coffee items + cake items | cashier station + bill |
| customer bodies + sit animations | seats come from placed furniture, not a constant | groups, table assignment, dirty tables |
| coffee + cake gameplay | cake orders come from customers, not a random generator | reputation + demand curve |
| `blocked()` collision | blockers come from placed furniture | expansion stages + floor 2 + stairs |
| save + `unlocks[]` | save placed furniture + stage | bakery department |
| cameras (dollhouse = placement view) | a placement camera (top-down dollhouse) | co-op (later) |

## 3. Each feature: player, world, system, link, minimum version

| Feature | Player does | World does | System | Links to | Minimum version |
|---|---|---|---|---|---|
| Open / close | flips the door sign | lights warm up; customers start/stop arriving; last ones finish | `business.ts` (on `clock.ts`) | `day.ts` phases, `Customers` spawn | sign at the door; hours fixed 8–18; closing = no new arrivals |
| Prepare before opening | walks around, moves furniture, warms the machine | nobody enters | `business.phase = 'prep'` | placement mode | prep phase = placement allowed, no customers |
| Customer arrival | — | customers arrive faster with reputation and time of day | `demand.ts` | `cafe.spawn` | arrivals/min = base × reputation × hour curve |
| Order at the till | clicks the customer at the till | a ticket prints: coffee + cake lines | `orders.ts` | `shop.orders`, `useCake.order` | one order = up to 1 drink + 1 cake |
| Station tasks | takes a ticket at the bar or the cake station | the ticket shows only that station's items | `orders.ts` (item → station) | bar recipe card, cake HUD | stations read `orders` filtered by station |
| Combine + serve | puts both items on a tray, carries it to the table (or the pass) | the customer gets the full order | `serving.ts` | `Grab`/drop, `Customers` | the pass collects items; complete order → served |
| Payment | presses the till for the bill (or auto at first) | coins pop, receipt | `cashier.ts` | `day.record` | pay at order time (simplest, cozy) |
| Daily summary | reads, taps "next day" | — | `day.ts` results | already exists | add revenue, abandoned orders, rating |
| Furniture shop | opens the catalogue (a cozy menu book) | — | `furniture.ts` (catalogue + placed list) | `bank` | 6 items: small table, big table, chair, sofa, plant, lamp |
| Placement | drags a ghost item, R to rotate, click to place; green/red outline | item appears in the world | placement mode in `CameraRig` dollhouse view | `blocked()`, `BLOCKERS` | 0.5 m grid, 90° turns, box collisions, move/sell back |
| Seats from furniture | — | every placed chair/sofa seat is a seat | `seating.ts` | `Customers` | seats derived from placed furniture each change |
| Groups | — | 1–4 customers arrive together, need a table that fits | `seating.ts` | demand | groups of 2 from reputation 2; table for 4 needed for groups of 3–4 |
| Dirty tables | clicks a table to clear it | cups disappear, table "free" again | `seating.ts` | serving | a table can't seat anyone until cleared |
| Reputation | serves well, decorates | more + bigger groups come | `reputation.ts` | craft score, decor value | 0–5 hearts from the last 3 days' satisfaction + decor |
| Expansion | buys the next stage | walls open / patio appears / lid floor opens | `stages.ts` | `unlocks[]`, layout | stage = which zones are walkable + placeable |
| Second floor | walks up the stairs | camera cuts to the lid floor | floors in `movement` + `CameraRig` | stages | stairs as a trigger box → teleport + fade (no ramp physics) |
| Bakery | runs the cake department upstairs | cake orders route upstairs | station registry | cake machine | move the cake station into the lid; orders route by station id |

## 4. Architecture (small stores, one direction of data)

```
clock.ts ──► business.ts (prep / open / closing / closed, hours)
                 │ spawns while open
                 ▼
demand.ts ──► Customers (bodies, paths) ──► orders.ts  (order = items[], each item has a station)
                     ▲                         │
               seating.ts ◄── furniture.ts      ├─► coffee station (shop.ts)   ─┐
               (seats, groups, dirty tables)    ├─► cake station  (cake.ts)    ─┤─► serving.ts ─► cashier.ts ─► day.ts (stats, bank)
                                                └─► (later) bakery stations    ─┘                                │
reputation.ts ◄──────────────── satisfaction + decor ◄────────────────────────────────────────────────────────┘
stages.ts (unlocks[]) ─► which zones/floors exist ─► furniture placement + movement + camera
```

- Each system is its own small zustand store (the project's existing pattern), talking through plain actions, never
  one giant manager.
- **Commands, not direct mutation**: `placeFurniture`, `takeOrder`, `deliver`, `pay`… are the network messages later
  (co-op), as already set out in `INTERACTION_ARCHITECTURE.md`.
- **Stations are data**: `{ id, floor, items: ['drink'] | ['cake'] }`; the bakery is just a station on floor 2.
- Furniture is a list `{ id, kind, x, z, rot, floor }` saved with the game; `TABLES`, `SEATS` and table `BLOCKERS`
  become derived from it, so the existing seating and collision keep working.

## 5. Risks and conflicts

1. **Customer paths** are hard-coded lanes. Once furniture moves, customers can walk through it. Fix: a small grid
   path-finder (A* on a 0.5 m grid built from the blockers): ~1 day, needed in phase 2.
2. **Two timers**: the 180 s day vs the clock. Business hours must run on the clock; reels that rely on `DAY_LEN`
   need checking.
3. **The round room** (the inside of the pot) makes rectangular expansion odd. Expansion = opening zones (patio
   outside the door, the kitchen corner, a window nook) and the lid floor, not making the room bigger.
4. **Bakery: DECIDED 18 Nov: upstairs in the teapot lid.** (The earlier plan had it next door in the "For Lease"
   unit; that unit becomes a later, unrelated shop.) To avoid running upstairs for every slice: bake upstairs, sell from a
   display case downstairs; only custom cakes need the trip.
5. **Cake orders**: the cake station has its own order generator; routing customer orders to it changes its HUD
   flow (small).
6. **Several orders at once** (also flagged in the coffee study): the bar assumes one glass at a time.
7. **Performance**: more furniture + customers on phones; instanced chairs/tables needed (Day 7 pass).
8. **Scope vs time**: launch 1 Dec. Placement mode is the biggest single piece.

## 6. Phased roadmap (with time estimates)

| Phase | Contents | Estimate | When |
|---|---|---|---|
| 0 | Coffee polish ("one perfect latte"), cake v2 | 3–4 days | 18–22 Nov |
| 1 Core loop | hours on the clock, prep/closed state + door sign, one order system (drink + cake), pay at the till, richer day summary | 2–3 days | 22–25 Nov |
| 2 Furniture + seating (MVP) | catalogue of 6 items, placement (grid, rotate, collisions, move, sell), seats + blockers from furniture, A* paths, dirty tables | 3–4 days | 25–29 Nov |
| — Launch prep | tutorial, Story/Chill, test pass, deploy | 2 days | 29 Nov–1 Dec |
| 3 Growth | reputation, demand curve, groups, milestones, equipment upgrades | 2 days | early Dec |
| 4 Expansion | stage unlocks: patio, kitchen nook, window nook; more catalogue | 2–3 days | Dec |
| 5 Floor 2 foundation | the lid floor, stairs + camera, move the cake station up | 3 days | Dec |
| 6 Bakery gameplay | oven, pastries, display counter, custom cake orders, two-floor order routing | 5+ days | late Dec–Jan |
| 7 Co-op | shared stores over a network | 1–2 weeks | probably after 12 Jan; architecture ready |

Cut from launch if time runs out: groups, dirty tables, A* (keep furniture to fixed spots = `PLUS_SPOTS`).

## 7. What to prototype first

**"Buy a table, a customer sits at it."** The smallest slice that proves the whole plan:
1. A café that starts **closed**: you flip the sign to open (hours on the clock).
2. A catalogue with one table + chairs; place it on one of the `+` spots (fixed spots first, free placement after).
3. Seats come from placed furniture: the new table is used by the next customer.
4. One order with a drink **and** a cake, paid at the till, shown in the day summary.

If that feels good, everything else is more items, more rules and more space.

## Update 18 Nov: ingredients from the street shops (light version, by request)
Four neighbours are now real ingredient shops (The Daily Grind, Moo & Oat, Flour & Co., Sugar Plum). A pantry in real units
(`systems/pantry.ts`, `data/ingredients.ts`) is used up by every shot, pour, layer and topping and refilled by buying packs
with coins from the bank. Bulk (5x, 25% off) unlocks at café level 3 and wholesale (20x, 40% off) at level 6
(level = 1 + stars / 6). Still not a warehouse: no expiry, no deliveries, no shelves, and a friendly note when something runs out.
Next: show low stock in the day summary; Chill mode = an always-full pantry.
