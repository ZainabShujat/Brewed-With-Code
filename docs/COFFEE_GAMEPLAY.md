# Coffee gameplay: audit and redesign

Status: proposal (18 Nov 2026). Nothing in the redesign is built yet. The audit describes the code as it is today.

---

## 1. Audit: what the code actually does

| Part | How it works today | Where |
|---|---|---|
| **Orders** | When the front customer reaches the counter, `tick()` gives them `randomOrder()`: one of 6 recipes (espresso, americano, latte, cappuccino, flat white, mocha), a random glass size (espresso is always small), sometimes oat or almond milk, an extra shot or a changed topping. The ticket shows the name, a note and a picture of the glass. | `data/recipes.ts`, `systems/shop.ts` |
| **The flow** | A fixed 8-step track in the HUD: cup → grind → shot → extras → milk → pour → top → serve. **Every drink runs the same track.** Espresso just presses "no milk" to skip. | `ui/BrewHud.tsx` |
| **Cup** | Click a glass on the shelf, then click the coaster (real click-and-pick). The step advances when a glass is down. | `Bar.tsx`, `drag.tsx` |
| **Grind** | Hold a HUD button or Space and stop the meter in the green zone. **Nothing happens in the world:** the grinder model never moves and no grounds appear. The result is only stars. | `BrewHud.tsx` |
| **Shot** | Hold the meter. On release the HUD calls `shot()` **exactly as many times as the order asks**. The player never decides the shot count. The shot glass fills under the machine and is carried over and poured (visual). | `BrewHud.tsx`, `shop.ts` |
| **Extras** | Pick up the chocolate or kettle and click the glass (real click-and-pick), then press "next". | `Bar.tsx` |
| **Milk** | Choose whole/oat/almond with **HUD chips**, then hold the steam meter. The zone you stop in decides micro/steamed/foamy. A good idea, but there's no steam wand animation and no foam growing in a pitcher. | `BrewHud.tsx` |
| **Pour** | Hold the meter. The pour **starts at the press with a fixed amount**, so releasing early or late only changes the stars, never how much milk goes in. | `BrewHud.tsx`, `shop.ts` |
| **Top** | Pick up a shaker or the cream can and click the glass. | `Bar.tsx` |
| **Serve** | The "Serve" button. `serve()` scores **correctness only** (size, shots, water, chocolate, milk style, milk type, topping) and pays coins plus a tip based on the customer's patience. **The meter stars never affect money.** | `shop.ts` |
| **After** | The glass flag clears and the customer walks off with an invisible drink. Nothing is handed over. | `shop.ts`, `Customers.tsx` |
| **Representation** | The glass is a flag (`cup: true`) drawn at a fixed spot. Drink contents are booleans and enums, not amounts. The layers you see are sized from the recipe, not from what you poured. | `shop.ts`, `Bar.tsx` |

**Genuinely interactive:** picking up and placing the glass, the chocolate, kettle, shakers and cream can; choosing the milk type; the stop-in-the-zone meters (as a timing test).
**Visual or scripted only:** the grinder, tamping (it doesn't exist), the number of shots, the steam wand, the milk amount, the serve hand-off.

---

## 2. Shortcomings (being critical)

1. **Skill doesn't pay.** The meters give stars, but coins and tips ignore them. Players learn the meters don't matter.
2. **Few real decisions.** The shot count is filled in for you, and the milk amount is fixed. The only real choices are glass size, extras, milk type, steam zone and topping.
3. **You watch a bar, not the coffee.** Grind, shot, steam and pour are all the same HUD meter, detached from the objects.
4. **Two control styles fight.** Some steps are world clicks, others HUD buttons. The player keeps switching between "the bar" and "the panel".
5. **Every drink is the same track.** A mocha and a flat white feel identical to make; only toggles differ.
6. **No ending.** The drink vanishes on "Serve". No handing over, no carrying.
7. **No recovery.** The only fix for a mistake is "start over" (bin the glass).
8. **No growth.** Day 10 plays like day 1. Difficulty never rises.
9. **Repetitive rhythm:** hold, release, hold, release, the same bar four times.

What's good and worth keeping: the click-and-pick tools, the shot glass carried from the machine, the see-through glass showing layers, the steam-zone idea (stop early = microfoam, late = foam), the drink picture on the ticket, and patience-based tips.

---

## 3. Redesigned loop (cozy, tactile, varied)

Every step happens **on the object**, and what you see in the glass is what you actually poured.

```
read the ticket → take a glass → (drink-specific base) → espresso by hand → milk by hand → finish → glass to the pass → customer collects
```

- **Espresso by hand:** click the grinder and *hold* to grind (a grounds mound grows in the portafilter, with a dose ring); click to tamp (a satisfying squash, no fail state); click the group head to lock in; *hold* the brew button. The stream runs into the shot glass, and you let go when it reaches the line. **Shots = how many times you pull**, which is your decision.
- **Milk by hand:** pick the pitcher; *hold* a milk bottle over it to fill (the level rises); put it on the wand and *hold* to steam. The foam visibly rises, and stopping early gives silky microfoam, late gives a big foam cap. Pick it up and *hold* over the glass to pour; the glass fills by the real amount.
- **Finish:** shake toppings (hold, or jiggle the mouse), spiral the cream (hold). Latte art is an optional flourish for tips (see §4).
- **Serve:** pick up the finished glass (now a real object) and place it on **the pass**. The customer whose ticket matches collects it, pays and tips.

**Which proposed mechanics add real gameplay value:**

| Mechanic | Value | Keep? |
|---|---|---|
| Pulling shots by holding, watching the shot glass | high: the decision (how many) plus a readable timing skill | ✅ MVP |
| Milk amount + steam time → texture | high: it's what makes latte, cappuccino and flat white different | ✅ MVP |
| Pouring with the glass level rising | high: the satisfying middle | ✅ MVP |
| Glass as an object to the pass | high: connects to customers and the cake orders | ✅ MVP |
| Grind dose + tamp | medium: tactile rhythm, keep it short (1–1.5 s), forgiving | ✅ MVP (light) |
| Drink-specific bases (water tap, sauce, ice, powder) | high: makes drinks different | ✅ phase 2 |
| Latte art gesture | medium: a cozy bonus, never required | phase 3 |
| Bean selection | low now: extra UI, little decision | later (an unlock: decaf, house, single origin) |
| Tray | low until multi-drink or table orders | with table service |

---

## 4. Drinks that play differently

| Drink | What makes it different to make |
|---|---|
| **Espresso** | Small glass, pull 1–2 shots, done. Pure shot timing: the quick, crisp one. |
| **Americano** | Shots plus **hot water from the machine tap** (hold to the line). Too much water = weak. |
| **Latte** | Shots plus a **big, short-steamed** pitcher (silky), poured to the top; thin foam. Optional art. |
| **Cappuccino** | Shots plus a **long stretch** (lots of foam), roughly a third each; cocoa dust. |
| **Flat white** | Small glass, **microfoam only** (stop steaming early), a little milk. Art earns tips. |
| **Mocha** | **Chocolate sauce in the glass first**, then shots, steamed milk, a whipped cream spiral. |
| **Iced coffee** *(new)* | **Scoop ice** (cubes clink in and float), pour shots over ice, then **cold milk with no steaming**. Optional syrup pump. |
| **Hot chocolate** *(new)* | **No espresso.** Count powder scoops (2–3), steamed milk, **stir in circles** (circular mouse motion), marshmallows. |

New actions this adds: the water tap, the ice scoop, powder scoops, a stir gesture, the syrup pump. Each is used by only one or two drinks, so drinks feel distinct.

---

## 5. Interaction by interaction

| Action | Type | Object motion and feedback |
|---|---|---|
| Take a glass | pick up and use | The glass lifts off the stack (ease-out arc), lands on the coaster with a 4% squash and a clink |
| Grind | click and activate, then **hold** | The grinder shakes; grounds fall in a stream and a mound grows; the dose ring fills; motor hum |
| Tamp | click | The tamper presses down (0.2 s), the mound flattens, a soft thunk |
| Lock in the portafilter | click | It slides to the group head and twists (a 0.3 s rotation) |
| Pull a shot | **hold** (timed) | Two thin streams run from the spout; the shot glass level rises; crema forms at the top; "the line" marks the target |
| Pour a shot into the glass | pick up and use | The shot glass flies over, tilts and pours; the glass level rises |
| Fill the pitcher | pick up the bottle, **hold** over the pitcher | The bottle tilts; a milk stream; the pitcher level rises |
| Steam | place the pitcher on the wand, **hold** | Steam particles; the pitcher wobbles; a foam layer rises (silky first, then bubbly); the hiss changes pitch |
| Pour milk | pick up the pitcher, **hold** over the glass | Tilt follows the hold; the stream widens; the glass liquid rises and the foam sits on top; a surface ripple |
| Water / ice / sauce / powder | click and activate, or hold | Tap stream / cubes drop and bob / sauce drizzle / powder puff |
| Stir | **continuous** (circular mouse) | A spoon circles; the colour blends from layered to mixed |
| Toppings | pick up, then **hold** (shake) | Instanced particles fall and settle on the surface |
| Latte art (optional) | **continuous** (drag through) | The milk stream draws onto the surface; a heart forms if the drag is roughly right |
| Serve | pick up the glass, place it on the pass | The glass slides onto the pass; the customer's hand takes it; a coin pop |

Rule: **no HUD meters for these.** The object is the meter: the shot glass line, the pitcher foam, the glass fill line. The HUD keeps only the ticket and a light "next step" hint.

---

## 6. Camera

- **Keep the fixed overhead bar view as the base.** It's readable, works on phones, and suits the Papa's-style cozy pace. First-person preparation would lose the overview and be harder on touch screens, so I wouldn't do it at the bar.
- **Add a gentle "lean in" during holds:** while you hold a continuous action (pull, steam, pour), the camera eases about 30% toward that station and back on release. That's not a cut, so your eye stays oriented. This is the only camera change worth adding: it exists so you can *see* the shot level and the foam.
- **Leaving the bar:** Esc or a "← back to the café" button returns to walking (third-person walking arrives on 25 Nov in the roadmap).

---

## 7. Quality without stress

- **Score = correctness 60% + craft 40%.**
  - Correctness: right drink, size, milk type, extras.
  - Craft: shot volume, milk texture, fill level, art.
- **Wide "good" zones, a small "perfect" sweet spot.** Good gets full price; perfect adds tips. Nothing hard-fails.
- **Mistakes are fixable:** pour milk back out into the sink, pull another shot, bin a glass. Cost: a few seconds, not a failed order.
- **Patience stays gentle;** tips reward quick plus perfect.
- **Difficulty grows by recipes and customisations unlocked over days** (iced and hot chocolate later, oat-milk and extra-shot requests), not by tighter timing.
- **Chill mode** (see roadmap) turns patience off entirely.

---

## 8. Technical architecture (our stack)

- **Containers with contents in millilitres** (glass, shot glass, pitcher, portafilter), as plain data in a store:
  `contents: { espresso, milk, foam, water, chocolate, ice, syrup }` plus `temp`, `stretch`, `crema`.
  These become the "objects" from `INTERACTION_ARCHITECTURE.md` (glass first), so they work with the pass, cakes and co-op later.
- **One transfer rule:** `pour(from, to, ml)`, run every frame while a hold is active at a rate (ml/s). Shot pull, milk fill, pour, water and ice all use it.
- **Rendering liquid:** keep today's layered cylinders, but size each layer from its ml relative to the glass volume. Foam stays a separate top layer; the surface texture comes from the top component (crema, foam, art). Streams reuse `Liquid.tsx`, with width from the pour rate. Ice uses instanced cubes with a small bob; steam and toppings use instanced particles.
- **Machine and grinder:** small state machines (`idle → grinding → dosed → tamped → locked → pulling`) driven by click and hold commands.
- **Scoring:** `scoreDrink(glass.contents, recipe.targets)` with tolerances (min, max, sweet spot) per component, replacing the booleans in `score()`. Recipes become targets: espresso 60 ml, milk 180 ml ± 30, foam 10–20 ml.
- **Orders and customers:** `deliver(glass, customer)` at the pass. The order system only sees the glass's contents, so how it was made doesn't matter. Cakes reuse the same path on Day 4.
- **Keep:** click-and-pick (`drag.tsx`), the tool performances (`Flyer`), the shot glass, streams and surfaces, the drink picture on the ticket, patience and tips, the play-through tests (extended to the new flow).
- **Improve:** `shop.ts` (booleans → contents), `score()` (→ targets with tolerances), the glass (flag → object).
- **Build new:** the hold-to-pour transfer, grinder and steam-wand states, the foam growth visual, the pass hand-off, ice, powder and stir.

---

## 9. MVP roadmap

1. **Contents model.** The glass, shot glass and pitcher become containers with ml contents. An adapter keeps today's HUD working while it changes.
2. **Shots by hand.** Hold the machine; the shot glass fills to a line. The player decides how many. The shot meter goes.
3. **Milk by hand.** Fill the pitcher, steam with foam growth, pour with a rising glass level. The steam and pour meters go.
4. **The pass.** Pick up the finished glass, put it on the pass, the customer collects. Score = correctness + craft, and craft feeds tips.
5. **Drink paths.** Americano (water tap), mocha (sauce first), iced (ice + cold milk), hot chocolate (powder + stir).
6. **Optional polish.** Grind and tamp, latte art, beans as unlocks, a tray for table service.

## 10. First prototype: "one latte, by hand"

Glass from the shelf → hold the machine to pull 2 shots (watch the shot glass) → pour them in → fill the pitcher → hold to steam (watch the foam) → hold to pour (watch the glass fill, foam on top) → put it on the pass → the customer collects, with the score shown as correctness + craft.

**No HUD meters at any point.** Test it two ways:
- **Automatically:** the play-through makes one latte by hand and expects a pass, plus edge cases: pouring with nothing in the pitcher, steaming an empty pitcher, overfilling the glass, putting an empty glass on the pass.
- **By you:** does it feel better than the meters?
