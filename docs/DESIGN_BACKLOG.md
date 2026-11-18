# Design backlog (queued, not started)

Design questions the user asked for, saved to answer later (17 Nov 2026). Each needs an analysis of the
current code first, then a written proposal, before any implementation.

## 1. Integrated gameplay loop (cake station → order → carry → serve → pay)
- Cake making becomes part of the café day: customer orders → bake at the cake station → the finished cake
  becomes a 3D object → carry it to the customer or their table → they receive it, pay, and satisfaction updates.
- Co-op roles later: player 1 runs the bakery, player 2 the coffee bar, both serve.
- Longer term: table service, more prep stations, queue management, café expansion.
- Asked for: feasibility vs the current code, how the cake station integrates, the order/pickup/carry/serve design,
  co-op-safe decisions now, and an MVP vs expansion roadmap.
- **Mostly answered already** in `INTERACTION_ARCHITECTURE.md` (§1 audit, §6 framework, §8 co-op, §11 roadmap,
  §12 "The Pass" prototype). Still to write: the order/customer state machine in detail (table orders vs counter
  orders, satisfaction/reputation formula, how cake orders mix with drink orders in one ticket).

## 2. Camera, POV, movement & controls
- Perspectives: third-person follow (with camera collision), first-person (mouse look, visible hands and held
  items, interaction targeting), isometric/management (the dollhouse), and station cameras with smooth transitions.
- Controls to evaluate: WASD, Shift sprint, mouse look, Space jump?, E interact, click to manipulate, G drop,
  V switch POV, Tab management. Plus acceleration, walk vs run, sensitivity, smoothing, collision in narrow spaces,
  pickup/carry, placement/rotation, interaction range and prompts, pickup/drop animations.
- Immersive interactions: first-person "reach and grab" with mouse vs real VR (headset + controllers). Evaluate
  whether immersive first-person gives most of the feel without VR complexity (WebXR is possible with R3F via @react-three/xr).
- A gameplay-to-camera mapping for each activity: entering, walking, taking orders, cakes, coffee, carrying,
  serving, cleaning, inventory, furniture, stats. Decide automatic vs player-controlled transitions; avoid disorienting switches.
- Co-op: independent cameras/POV per player, simultaneous stations, shared orders/objects, ownership, player collision.
- Asked for first: a report on the current camera system (`systems/CameraRig.tsx`: fixed shots per mode, the dollhouse
  orbit, first-person walk, the fixed top-down bar, fade-cuts), movement (`systems/movement.ts`), interactions
  (`systems/drag.tsx`), what can be added without restructuring, and what needs changes.
- Then: camera/POV spec, movement/controls spec, interaction spec, gameplay-to-camera mapping, architecture, phased roadmap.

## Backdrop beyond the street (requested 18 Nov, do later)
Outside the café and the shop street, the far background should show random buildings and a residential area (houses, flats, rooftops) instead of empty space: a cheap backdrop ring of low-poly building blocks/cards past the walls, instanced, no collision, lit by the day/night clock (windows glow at night).
