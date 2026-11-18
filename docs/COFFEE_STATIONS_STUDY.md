# Coffee stations study: what a four-station restaurant game teaches our coffee bar

18 Nov 2026 (Day 3.5). A study of the *interaction design* of the station-based restaurant genre (Papa's Freezeria is
the reference), translated into Brewed With Code. We take principles, never assets, UI, art or presentation.

**Bottom line:** polish coffee before cake. One coffee that feels good to make is the heart of the game. The cake
station v2 can reuse everything built here (stations, tickets, per-station scores).

---

## 1. Audit of what we have (commit 77719fa)

| Area | What exists | Where | Verdict |
|---|---|---|---|
| Orders | One customer at the front of `cafe.line`; `orders[id].want` is a full Drink (size, shots, choc, water, milk + type + texture, topping) | `systems/shop.ts`, `world/Customers.tsx` | Good data, but one order at a time and the ticket only lives in the HUD |
| Ticket | Recipe card with live ✓ rows, glass fill bar, a hint line | `ui/RecipeCard.tsx` | Readable; not a physical object, can't be pinned or reordered |
| Glass | 3 sizes (240/330/450 ml), contents in ml, layers drawn bottom-up, fits the glass taper | `Bar.tsx Cup`, `data/recipes.ts` | Strong: the glass *is* the meter |
| Espresso | Hold the machine → shot glass fills at 25 ml/s → pick up shot glass → drop on glass | `pullTick`, `pourShotGlass` | Good feel; no grind / dose / tamp / portafilter yet |
| Milk | Hold bottle → pitcher; pitcher on wand; hold wand (stretch → texture); hold-pour into glass | `fillPitcher`, `steamTick`, `pourMilkTick` | Good; temperature isn't modelled, texture is timing only |
| Toppings | Shaker: hold over glass, grains fall from the mouth and stay; whip; choc sauce | `startShake`, `ToppingFx` | Better since today; no placement (left/centre/right) or evenness |
| Serving | Pick up glass → drop on the pass → serve front customer | `serve` | Works; no tray, no "which customer" |
| Scoring | `pct` correctness + `craft` (shots, fill, spill) → coins + tip | `craft()`, `serve` | Single blended number; not per station |
| Interaction kit | `Grab` (click-pick-drop), `Hold` (press-hold-release), `DropTarget`, `Flyer` motion (tilt / invert / shake) | `systems/drag.tsx`, `Bar.tsx` | Enough for all of the below; no physics needed |
| Layout | One table `barLayout.ts`, measured from the real machine | `world/barLayout.ts` | New today: nothing drifts out of line again |

**Missing vs the genre:** several orders in flight, a physical ticket rail, separate stations with their own view,
per-station scores, a timing "sweet spot" you aim for, ingredient unlocks, upgrades.

## 2. Reference mechanics → ours

| Genre mechanic | Why it works | Brewed With Code version |
|---|---|---|
| Order station + persistent tickets | You always know what's wanted; tickets are objects you manage | Paper tickets on a **ticket rail** above the bar, one per customer, click one to make it "active" |
| Build station: cup size + timed dispensing | Quantity is a skill (stop at the line) | Choose glass from the shelf; **hold to dispense** espresso/milk/syrup, let go at the line |
| Mix station: start → progress → stop at target | Many targets (light/regular/chunky); you choose when to stop | **Steam wand**: three texture targets (silky / steamed / foamy) shown as a band on the pitcher; stop inside it |
| Several orders progressing at once | Juggling = the fun at higher days | Shot pulls and steaming **run while you do other things** (start, walk away, come back) from Day 2+ |
| Topping station: continuous dispensing while moving | Even coverage is a visible skill | **Shaker follows the mouse** over the glass while held; grains land where it is; evenness is scored |
| Individual placed toppings (L/C/R) | Precision + order of application | Marshmallows, biscuit, cinnamon stick: **drag and drop** onto a spot on the foam |
| Independent station scores | You see exactly where you lost points | Four stars: **Brew · Milk · Finish · Service** on the result card |
| Upgrades / unlocks | Progress feels earned | Syrups, oat/almond milk, new toppings, a second group head, a faster grinder (Story mode) |

## 3. Interaction matrix

| Action | Type | Controls | Feedback / motion | State change |
|---|---|---|---|---|
| Take a ticket | Click | click a ticket on the rail | ticket slides down, glows | `active = order.id` |
| Pick a glass | Pick up + drop | click glass stack → click coaster | glass flies in an arc, clinks | `cup = size` |
| Grind (later) | Hold | hold grinder | grounds pile up in the portafilter | `dose` g (target 18) |
| Tamp (later) | Click-timed | click when the ring meets the line | press animation, puck flattens | `tamp` quality 0–1 |
| Lock portafilter (later) | Drag + drop | drag to group head | snaps in with a twist | `locked` |
| Pull shot | Hold + release | hold machine, let go at the line | two streams from the spout, crema rises | `shotGlass` ml, extraction time |
| Pour shot | Pick up + drop | shot glass → glass | tilt pour, layer rises | `ml.espresso` |
| Fill pitcher | Hold | hold milk bottle | bottle tilts, pitcher level rises | `pitcher.milk` |
| Steam | Hold + release (target band) | pitcher on wand, hold | steam puffs, foam rises, band on pitcher | `stretch` → texture |
| Pour milk | Hold (continuous) | hold pitcher over glass | stream, level rises, foam on top | `ml.milk/foam` |
| Syrup | Click-per-pump | click pump N times | pump press + drip | `syrup[n]` |
| Shake topping | Continuous movement while held | hold + move over glass | grains fall from the mouth where you are | grid coverage |
| Place a topping | Drag + drop | drag item to a spot | it lands and settles | `placed[]` |
| Latte art (later) | Sequence mini-game | wiggle while pouring | heart / tulip forms | `art` 0–1 |
| Serve | Pick up + carry + drop | glass → pass (later: tray → table) | bell, customer reacts | result + coins |

## 4. Station workflow

One room, one counter, **four zones the camera can slide between** (number keys / swipe), each framed close like
today's barista view:

1. **Order** (till + ticket rail): take orders, pin tickets.
2. **Brew** (machine + grinder): espresso.
3. **Milk** (fridge + wand + pitcher): fill, steam, pour.
4. **Finish** (shakers, syrups, sauces, toppings) → **pass**.

The glass travels with you between zones (it sits on the active coaster in each). Day 1 has only Order + Brew +
Finish; Milk unlocks on day 2 (Story mode). Chill mode has everything from the start.

## 5. Animation and feedback

- Every hold shows its target as an object, not a meter: the line on the shot glass, the band on the pitcher, the brim.
- Streams always start at a real spout (`barLayout.SPOUT_Y`) and end at the liquid surface.
- Layers rise smoothly (≈1.8/s ease); foam domes slightly; grains stay where they land.
- Sound per action (grind, hiss, pour, clink, bell); a soft "ding" when you let go inside the sweet spot.
- Result card: four stars that pop one by one, then coins and tip counting up.

## 6. Scoring (cozy)

Each station gives 0–3 stars, never below 1 for a finished step:

| Station | Measured | Full marks |
|---|---|---|
| Brew | shots ml vs wanted (±5 ml), later extraction time 25–30 s game-scaled | within the line |
| Milk | texture matches, glass fill 85–100%, no spill | right texture, no spill |
| Finish | right topping, coverage evenness (grid), right placement | even + correct |
| Service | correct order, waiting time | served before the patience bar turns red |

Tip = average stars × a small multiplier. A wrong drink is still paid (cozy), just without the tip.

## 7. Architecture

- **Stations** become data: `stations.ts` lists zones (camera framing from `barLayout`, tools in that zone).
- **Tickets**: `orders` already holds the want; add `rail: id[]` and `active` to the shop store.
- **Commands** stay as shop actions (`pullTick`, `steamTick`, …). Each records a `StationResult` so scoring per
  station is just a fold over results: easy to sync for co-op later (commands are the network messages).
- **Interaction kit** stays `Grab` / `Hold` / `DropTarget` + `Flyer`; add one new primitive: `Follow` (a held tool
  follows the pointer over a surface, for shakers and latte art).
- **Coverage** = an 8×8 grid on the glass top: grains mark cells; evenness = filled cells / target cells. No physics.
- **Customers / inventory**: untouched for the prototype; inventory hooks in with unlocks later.
- **Co-op**: two players can own different stations; the glass is an entity with an owner (see
  `INTERACTION_ARCHITECTURE.md`).

## 8. Roadmap (smallest satisfying coffee first)

**Prototype "one perfect latte" (1 day):**
1. Sweet-spot targets: a line on the shot glass, a texture band on the pitcher, a brim mark on the glass; letting go
   inside one gives a ding.
2. Shaker `Follow` + coverage grid + evenness.
3. Result card with four station stars.
4. Ticket rail with 2 orders in flight (shots keep pulling while you steam).

Then: grind / tamp / lock portafilter (feeds Brew stars) → syrups → latte art → station camera slides → cake v2
reusing tickets + stars.
