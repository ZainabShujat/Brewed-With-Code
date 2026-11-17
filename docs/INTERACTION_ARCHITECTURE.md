# Brewed With Code — Interactions, Motion & Physics Architecture

Status: proposal (17 Nov 2026). Nothing in here is implemented yet unless the audit says it already exists.
Stack stays as is: **Vite + React + TypeScript + React Three Fiber (three r169) + drei + zustand**. No engine change.

---

## 1. Audit of what exists today

| Area | What's there | Where | Verdict |
|---|---|---|---|
| Rendering | R3F `<Canvas>`, drei helpers, three r169. Custom rAF loop capped at 40 fps (30 on Low), shadows redrawn ~6×/s, no env map in-game, per-view zone culling. HQ path for reels. | `App.tsx`, `world/Lighting.tsx` | **Keep.** Solid, laptop-friendly. |
| Game state | zustand stores: `useShop` (drink, pours, orders, coins), `useCake`, `useDay`, `useGame` (mode, player), `useMusic`, `useClock`. | `systems/*.ts` | **Keep**, but the *world objects* have no store of their own (see gaps). |
| Per-frame state | A mutable `anim` object read in `useFrame`, no React re-renders. Reels stay frame-exact on a virtual clock. | `systems/anim.ts`, `trailer/clock.js` | **Keep.** This is the right pattern for motion. |
| Pick-up | `Grab` (click → tool sticks to the cursor via a ray–plane hit → click a target). `DropTarget` = radius check around a named point, glowing ring. One global `held`. | `systems/drag.tsx` | Good start. **Gaps:** tools are visuals only (not objects with state), one global holder, nothing can be put down anywhere except "use it on a target". |
| Tool "performances" | `Flyer`: a tool lifts, arcs to the glass, acts (tilt/shake/invert), flies home, all computed from the pour's start time `t0`. | `world/Bar.tsx` | **Keep the idea.** Time-from-`t0` is deterministic, which is great for reels and co-op. Generalise it. |
| Continuous input | Hold-to-fill meters (grind, shot, steam, pour) in the HUD. | `ui/BrewHud.tsx` | Works, but it's a UI bar, not the object. **Move the input onto the object** (hold on the pitcher to pour). |
| Sequence games | Coffee steps in `BrewHud`; cake machine with belt, stations and dispensers. | `BrewHud.tsx`, `world/CakeMachine.tsx`, `systems/cake.ts` | **Keep.** Scoring should read the finished *object*, not the HUD. |
| Liquids/FX | Wobbling pour streams, rippling surfaces, layered fill, whipped spiral, sprinkles as individual spheres. | `world/Liquid.tsx`, `Bar.tsx` | Keep. Sprinkles/steam should become **instanced** particles. |
| Tweens/easing | `tween()` with smoothstep; exponential smoothing for the camera and liquid layers. | `systems/anim.ts`, `CameraRig.tsx` | Keep; add springs and named easing profiles. |
| Characters | Code-built bodies. Customers follow waypoint paths, sit on fixed seats, turn heads. Kozie is fully procedural (bob, hop, waddle). | `world/Customers.tsx`, `world/Kozie.tsx` | Customers are the weakest visual. **Swap in rigged CC0 models** with clips. Kozie stays procedural (that's her charm). |
| Physics | **None.** Player collision = axis-aligned boxes (`BLOCKERS`) plus the round wall, with axis-separated sliding. Objects never collide. | `systems/movement.ts`, `world/layout.ts` | Correct for now. See §5. |
| Models | Static glTF (Poly Haven CC0, Sketchfab CC-BY), auto-fitted by height. No animation clips used. | `world/Models.tsx` | Keep. Add sockets (named attach points) per model. |

**The single biggest gap:** objects aren't *things* yet. A glass is a flag in `useShop` (`cup: true`), the cake is a store, and tools are props that animate. To get "a coherent simulation", every interactable object needs an identity, a location and state.

---

## 2. Interaction taxonomy

Six categories. Every object declares which of these capabilities it has (one object can have several).

| | Category | Controls | Feedback | Animation | Object states | Failure |
|---|---|---|---|---|---|---|
| **A** | **Drag & place** (furniture, decorating) | Press-drag on desktop, long-press-drag on touch. R or a scroll wheel rotates in 45° steps. Release to place. | Ghost preview snapped to the grid/slot, green when valid and red when it overlaps. | Follows with a spring (weight), settles with a small squash. | `placed` → `dragging` → `placed` | Invalid spot: springs back home with a soft "bonk". |
| **B** | **Pick up & use** (cups, jugs, cakes, trays, cloths) | Click/tap to pick up (goes to the hand). Click a slot to put it down, or click a target to use it. Esc puts it back. | Hover lift and outline. Valid slots glow while holding. | Pick-up arc (ease-out), held sway, put-down settle. | `in-slot(id)` / `held(by player)` | Wrong target: a shake "no" and the item stays held. |
| **C** | **Click & activate** (machine, register, fridge, door, lights, order board) | Click/tap, or E when near in walk mode. | Button press-in, a light or sound, the state flips. | Keyframed/tweened part (door swing, button depress). | Discrete toggles (`open/closed`, `on/off`, `brewing`). | Busy: a wiggle plus a "busy" chip. |
| **D** | **Continuous** (pour, pipe, mix, stir, wash, wipe, sprinkle) | Hold to run, release to stop. Drag direction or speed matters for stir, wipe and pipe. | A live fill line or level, the sound pitch follows the rate, a "perfect zone" glow. | The tool's tilt/shake follows the input in real time, plus a stream or particles. | A quantity that grows (`ml`, `frosting %`, `clean %`). | Overfill spills, under-fill underscores. Graded, never a hard fail. |
| **E** | **Sequence mini-game** (coffee recipe, cake machine, baking) | A station view plus B/C/D actions in an order. | A step list, per-step stars, the order ticket. | Station camera, step transitions. | The recipe progress lives **on the object** (the drink's contents, the cake's layers). | Wrong step order or ingredients lower the score, read from the object at serve time. |
| **F** | **Autonomous** (customers, Kozie, doors that auto-open, the radio) | None directly. They react to the world. | Mood bubbles, patience. | Skeletal clips (people), procedural (Kozie). | AI state machine (`enter → queue → order → wait → receive → sit → leave`). | Patience runs out → walks out. |

---

## 3. The café object interaction matrix

Legend for physics: **none** = positioned by code; **kin** = kinematic (code-driven but registered for overlap checks); **rb** = rigid body (later, optional).

| Object | Type(s) | Input | Behaviour | Animation | Physics | Resulting state |
|---|---|---|---|---|---|---|
| Glass (S/M/L) | B | click shelf → click coaster/tray/pass | Becomes a real object holding contents | pick arc, settle, liquid slosh on move | none | `contents{layers}`, `slot` |
| Glass shelf | C (dispenser) | click | Spawns a new glass into the hand | stack shrinks | none | stock count |
| Shot glass | B + D | held under the machine group head; machine fills it; click glass → pour | Carries espresso | fill level, tilt pour | none | `ml`, then empties |
| Espresso machine | C + D | click to start a pull; hold for longer extraction | Pulls into whatever is under the head | group-head light, stream, steam puff | none | `pulling`, `shots` |
| Grinder | D | hold | Grinds a dose | shake, grounds particles | none | `dose g` |
| Milk bottles | B | click → click pitcher | Pours milk into the pitcher | tilt pour | none | pitcher `milk ml/type` |
| Milk pitcher | B + D | hold on the steam wand (steam); hold over a glass (pour) | Texture from steam time, amount from pour time | wand vibration, steam particles, pour tilt by hold | none | `temp`, `foam`, `ml` |
| Kettle | B + D | hold over the glass | Hot water | tilt, steam | none | `ml` |
| Chocolate / syrups | B + D | hold over the glass | Sauce or syrup | invert, squeeze | none | layer added |
| Shakers (cocoa, cinnamon, sprinkles) | B + D | hold and shake (mouse jiggle or hold) | Dusting amount | shake, instanced particles | none | `topping amount` |
| Whipped cream can | B + D | hold over the drink | Builds the swirl | invert, spiral growth | none | swirl % |
| Service bell / pass | C + slot | click / place an item on the pass | Calls the customer to collect | bell bob, ding | none | order delivered |
| Cash register | C | click | Takes payment, shows coins | drawer slide, coin pop | none | coins |
| Order board / tickets | C | click a ticket | Selects the active order | ticket lift | none | `activeOrder` |
| Cake machine dispensers | E (C per bulb) | ◀ ▶ + click a colour | Adds a layer at the current station | dispenser drop, belt move | none | cake `layers` |
| Finished cake | B | click at ★ → box it → carry | Becomes a carryable box | lid close, pick arc | none | `boxed`, `slot` |
| Cake box | B | click → pass / table slot | Delivered to the customer | carry sway | none | delivered |
| Oven | C + E | click door, click timer | Bakes sponges (future) | door hinge tween, glow | none | `baking`, timer |
| Mixer | D | hold | Mixes batter | bowl spin, batter swirl shader | none | `mix %` |
| Fridge | C | click | Opens and shows stock | door hinge tween, interior light | none | `open`, stock |
| Plates / trays | B + slot container | click to pick up; drop items onto the tray | Carry several items at once | carry sway | none | `items[]` |
| Tables | A (decorate) + slot host | drag in decorate mode; place items on it | Furniture with item slots | drag spring, settle | kin | layout, `items` |
| Chairs / stools | A + seat | drag; customers sit | Seat anchor for customers | drag spring | kin | `occupied` |
| Plants, lamps, rugs, decor | A | drag/rotate in decorate mode | Pure layout | sway (shader), settle | kin | layout |
| Front door | C / F | auto when someone passes; click to prop open | Opens for customers | hinge tween (ease in/out) | none | `open` |
| Lights | C | click a switch | Lamps on/off (also by the clock) | emissive fade | none | `on` |
| Radio | C | click | Opens the music panel | needle bob | none | track |
| Cleaning cloth | B + D | hold and rub on a table | Cleans the spill decal | wipe arc follows the pointer | none | `clean %` |
| Dirty cups (future) | B | pick up from a table → sink | Dish loop | pick arc | none | `dirty` |
| Sink | D | hold to wash the item placed in it | Cleans dishes | water stream, bubbles | none | `clean` |
| Customers | F (+ receive items) | none; serve through the pass/table | Take, pay, sit, leave | skeletal clips plus look-at | kin capsule | mood, paid |
| Kozie | F | none (reels/tutorial) | Mascot, tutorial pointer | procedural | none | — |

---

## 4. Motion & animation architecture

Rule: **everything that moves has an owner that computes its transform each frame from state plus time**, with no React re-render per frame (the existing `anim`/`useFrame` pattern).

| Technique | Use it for | Café examples | How (our stack) |
|---|---|---|---|
| Transform tweens + easing | One-shot moves between known poses | Cup to coaster, fridge door, drawer, button press | Extend `systems/anim.ts`: named easing profiles (`ease.out`, `ease.back`, `ease.inOut`) and `tween(target, prop, to, dur, profile)`. Already deterministic. |
| **Time-from-`t0` performances** (what `Flyer` does) | Tool actions that must be identical in reels and co-op | Pitcher lift → tilt → pour → return; shaker shake | Generalise `Flyer` into `performances.ts`: `{phases:[{name,dur,pose}], loop?}` evaluated as `pose(t - t0)`. Pure function of time = replayable and syncable. |
| Springs (critically damped) | Anything following live input; weight | Held cup following the cursor, dragged chair, camera | `damp`/`damp3` from **maath** (tiny, three-native), or a 10-line in-house version, stepped by the frame `dt` (virtual clock safe). Stiffness by weight class. |
| Keyframe tracks | Multi-part rigid sequences | Register drawer + bell + coin pop | three `AnimationClip` built in code (`VectorKeyframeTrack`), or chained tweens. Rarely needed. |
| **Skeletal + imported clips** | People | Customer walk, idle, sit-down, sip, wave, carry | Rigged CC0 characters (Quaternius / Kenney) via `useGLTF` plus drei `useAnimations` → `AnimationMixer`, crossfades between clips. **Never hand-code human gait.** |
| Procedural | Small life and secondary motion | Kozie, head look-at, plant sway, liquid slosh, pendant swing, steam wobble | Sin/noise in `useFrame` (already used), or the vertex shader for plants (free). |
| Particles | Many small things | Steam, coffee grounds, sprinkles, cocoa dust, sparkles on a perfect order | One `InstancedMesh` (or `Points`) per effect with a ring-buffer pool, updated in one loop. Replaces today's per-sphere meshes. |
| Shaders | Effects that would be costly as geometry | Liquid fill level (clip plane), surface ripple, latte art, crema swirl, wet/clean table decal, plant sway | `onBeforeCompile` patches on standard materials, or small `ShaderMaterial`s. Keep them few and shared. |
| Physics | Things that genuinely tumble or collide | Dropped cup bouncing, knocked-over stool (later) | §5. Not for anything the player places on purpose. |

**Coded vs imported vs physics:**
- **Coded:** tools, machines, doors, drawers, UI-ish props, liquids, held objects, camera, Kozie.
- **Imported clips:** human bodies only (walk, sit, idle, sip, carry, wave).
- **Physics:** only accidental motion (drops, knocks), and only later.

**Café examples:**

| Example | How it's done |
|---|---|
| Cup picked up | performance `pickup`: 0.18s ease-out arc to the hand socket, then spring-follow |
| Fridge door | hinge tween, 0.45s `ease.inOut`, a light fades in |
| Coffee/milk pouring | the pitcher's tilt is driven by hold time (continuous); stream mesh plus rising fill level (shader clip) |
| Steam | an instanced particle emitter on hot drinks, 12–20 quads |
| Character walking / sitting | skeletal clips; root moved along the path by code; a `sit` clip blended when it reaches the seat anchor |
| Cake on a table | `place` performance: ease-in to the slot plus a 4% squash-settle |
| Dragging furniture | spring-follow on the drag plane plus grid snap preview |
| Carrying a tray | items parented to the tray's slots; the tray goes to the hand socket; procedural sway from velocity |

---

## 5. Physics architecture

**Recommendation: no physics engine in the MVP.** Snapping to slots is what makes placement feel *good* in a café game (the Papa's style). Real rigid bodies make cups slide off counters, jitter in stacks and cost CPU. Everything the player places on purpose uses **slots and kinematic snapping**.

| Need | Solution now | Later (if needed) |
|---|---|---|
| Gravity on placed items | none: items snap to slot height | — |
| Dropping an item onto nothing | not allowed: it returns to the hand or home | Rapier rigid body for "oops, dropped it" moments |
| Collision between objects | slot occupancy (one item per slot) | Rapier sensors |
| Player vs furniture | existing AABB blockers plus the round wall, axis sliding | Capsule-vs-AABB, same code |
| Player vs player (co-op) | circle–circle push-apart (a few lines) | — |
| Customers | waypoint paths plus seat anchors (exists) | Simple steering around players |
| Furniture placement | grid snap plus overlap check against a footprint | — |
| Hand/object constraint | parent the object to a hand socket and spring the transform | — |

**Rapier (`@react-three/rapier`)** is compatible with our stack (WASM, roughly 1–2 MB, and it lazy-loads). It's appropriate **only** if we add accidental-drop gameplay, knock-over props or a physics toy mode. If we add it, load it lazily and keep it to a "props" layer that never touches recipe objects.

---

## 6. Reusable interaction framework

```
Input (pointer/touch/keys)
   │
   ▼
InteractionController ── per player: hover, held item, active continuous action
   │  emits Commands
   ▼
applyCommand(world, cmd)  ← the ONLY place world state changes  ← (later: network relay)
   │
   ├── World store: entities { id, kind, location, state, owner }
   ├── Stations: read entities in their slots, run recipe rules
   ├── Orders: score the delivered entity's contents
   ├── Camera: station focus, follows the held item on phones
   └── Motion: starts performances keyed by the command's time t0
```

**Entity** (serialisable, no three objects inside):
```ts
type Entity = {
  id: string; kind: 'glass' | 'pitcher' | 'cakeBox' | 'tray' | 'chair' | ...
  location: { slot: string } | { heldBy: PlayerId } | { free: [x, y, z, rotY] }
  state: Record<string, unknown>      // contents, ml, clean%, open, boxed…
  owner?: PlayerId; lockUntil?: number // co-op: who may touch it right now
}
```

**Interactable definition** (data, one per kind):
```ts
const DEFS: Record<Kind, InteractableDef> = {
  glass:   { pickup: true, drop: ['coaster', 'tray', 'pass', 'table'], profile: 'light', range: 1.2 },
  pitcher: { pickup: true, continuous: { verb: 'pour', on: ['glass'], rate: 40 /*ml/s*/ }, profile: 'medium' },
  fridge:  { activate: 'toggleOpen', profile: 'heavyDoor' },
  chair:   { drag: { grid: 0.25, rotate: 45 }, footprint: [0.6, 0.6], profile: 'heavy' },
}
```
Components only *render* an entity: `<Entity id>` looks up its def plus model and places it from `location` (slot transform, the hand socket or a free pose), with motion from the active performance or spring.

**Slots** are named anchors (`coaster`, `pass-1`, `table-3/spot-a`, `shelf-glass-2`, `tray/0..3`) with `accepts: Kind[]` and `occupiedBy`. Snapping is "move to the slot", so there's no physics.

**How it talks to the rest:**
- **Order system:** an order is fulfilled by `deliver(entity, customer)`. The score compares `entity.state.contents` with the order, so whatever path made the drink is scored.
- **Inventory:** stock counts on dispenser entities (shelf, fridge, bottles); unlocks add kinds.
- **Stations:** coffee bar, cake machine, oven and register each subscribe to their slots and expose steps for the HUD.
- **Camera:** listens for `focusStation` / `heldChanged` (phones keep the held item framed).
- **Animation:** every command carries `t0`, and the renderer evaluates performances from it.

---

## 7. Motion quality & polish (cheaply)

- **Never teleport.** Every location change plays a profile: `pickup`, `place`, `swap`, `return`.
- **Durations by weight:** light 0.15–0.2s, medium 0.22–0.3s, heavy 0.35–0.45s. Heavier = softer spring and lower stiffness, so it lags the cursor slightly (believable weight).
- **Easing vocabulary:** ease-out for pick-ups (snappy), ease-in-out for doors, back-out for "pop" UI, plus a 3–4% squash-settle on landing.
- **Secondary motion:** liquids tilt against acceleration (slosh), held items sway with velocity, pendant lamps swing when brushed. All procedural and cheap.
- **Responsive feedback within 1 frame:** hover lift and outline, cursor change, a sound on every contact.
- **Performance rules:**
  - no per-frame React state (refs and mutable state only, as today)
  - instanced particles
  - idle objects *sleep* (no `useFrame` work until a command wakes them)
  - shared materials
  - plant sway in the vertex shader
  - animation mixers only for on-screen characters, updated at 20–30 Hz when far away
  - keep the 40 fps cap and throttled shadows

---

## 8. Co-op compatibility (designed in, built later)

- **Commands, not direct mutation.** `applyCommand` is pure-ish and ordered, so later the same commands go through a relay (PartyKit/Colyseus-style room or WebRTC) and every client applies them in order.
- **Ownership:** `heldBy` and `lockUntil` on entities and stations, so two players can't grab the same cup. Stations have `user` locks (one person at the cake machine, two at the bar if it has two coasters).
- **No singletons per player:** today's global `held`/`drag` becomes `players[id].held`.
- **Shared clock:** performances are keyed by `t0`. With a server time offset, every client renders the same pour at the same moment (the reel exporter already proves this works).
- **Serialisable world:** entities hold plain data, so a joining player gets a snapshot.
- **Player collision:** circle push-apart, as in §5.

---

## 9. Libraries

| Library | Use | Why it fits |
|---|---|---|
| three / R3F / drei / zustand | keep | Already working; drei gives `useAnimations`, `useGLTF`, `Instances`, `Outlines` |
| **maath** | springs (`damp3`, `dampE`), easing | Tiny, three-native, works with a supplied `dt` (deterministic) |
| drei `useAnimations` (existing) | skeletal clips | No new dependency |
| drei `Outlines` or a postprocessing-free rim | hover highlight | Cheap; avoids a full postprocessing pass |
| `@react-three/rapier` | **later, optional** | Only for accidental drops/knocks |
| Rigged CC0 characters (Quaternius "Ultimate Animated Character" / Kenney) | customers | Ready clips: walk, idle, sit, wave, carry |
| Avoid `react-spring` / `framer-motion-3d` for gameplay | — | They run on their own clock and break frame-exact reels and synced co-op |

---

## 10. Folder & component structure

```
src/
  engine/        loop.ts, clock.ts (exists), input.ts, ease.ts, spring.ts, tween.ts (from anim.ts)
  world/
    entities/    store.ts (useWorld), types.ts, defs.ts (InteractableDef per kind), slots.ts
    Entity.tsx   renders any entity from its def + location
    ...existing scene files (Interior, Exterior, Bar, CakeMachine) become slot hosts
  interaction/   controller.ts (per player), commands.ts (applyCommand), Hover.tsx, targets.ts
  motion/        performances.ts (generalised Flyer), profiles.ts, particles/{Steam,Sprinkles,Grounds}.tsx, liquid/
  characters/    Character.tsx (rig + clips), brain.ts (customer state machine), sockets.ts
  stations/      coffee/, cake/, oven/, register/, sink/   (each: slots + rules + HUD steps)
  gameplay/      orders.ts, scoring.ts, day.ts, economy.ts, unlocks.ts
  net/           (later) relay.ts, snapshot.ts
  ui/  reel/  data/   (as today)
```

---

## 11. Roadmap (dependency order; MVP = before the 1 Dec launch)

| # | Milestone | Depends on | MVP? |
|---|---|---|---|
| 1 | **Entity store + slots + `applyCommand`**; the glass becomes an entity (replaces `cup: true`) | — | ✅ |
| 2 | **Interaction controller v2:** pick up / put down / use on any entity; per-player held; hover outline | 1 | ✅ |
| 3 | **Motion kit:** profiles, springs (maath), generalised performances, settle; tools migrate from `Flyer` | 1–2 | ✅ |
| 4 | **Carry & serve:** the pass slot, cake → box → carry → customer collects; drinks scored from contents | 1–3 | ✅ (your cake-to-customer request) |
| 5 | **Continuous on the object:** hold the pitcher to pour, hold the wand to steam (HUD meters become feedback, not the input) | 2–3 | ✅ (light) |
| 6 | Instanced particles (steam, sprinkles, grounds) | 3 | ✅ (cheap win) |
| 7 | Rigged customers with clips (walk/sit/sip/carry) | 1, 4 | after launch |
| 8 | Decorate mode: drag/rotate/snap furniture + the bakery unlock | 1–3 | after launch |
| 9 | Cleaning loop (dirty cups, cloth, sink) | 1–5 | after launch |
| 10 | Physics props (Rapier, lazy) | 1 | optional |
| 11 | **Co-op** (relay, snapshots, locks) | 1–4 | after launch |

---

## 12. Prototype milestone: "The Pass"

The smallest slice that proves the whole architecture:

1. A **glass entity** spawned from the shelf into the player's hand → placed on the **coaster slot**.
2. **Chocolate** (continuous: hold to pour) and the **shot glass** (machine fills it, then pour) change `glass.state.contents`.
3. A **cake box entity** taken off the cake machine's ★.
4. Both carried to the **pass slot**. The customer at the front **collects**, the order is **scored from the entity's contents**, and coins and a tip pop.
5. Every action goes through `applyCommand`, and a debug toggle **records and replays the command log**. A replay producing the identical result proves the co-op path and the reel path at once.

**Done when:** no `cup: true`-style flags remain for these objects; the glass and box never teleport (all moves animated); replay is frame-identical; the frame rate stays at the current cap on the UHD 620 laptop.
