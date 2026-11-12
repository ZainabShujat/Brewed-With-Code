# Design Bible

The source of truth for how Brewed With Code looks and feels. Change it deliberately, not by accident.

## Look: low-poly cute, not lame — soft, rounded, candy-coloured
- **No boxes.** Every solid uses rounded boxes (`RBox`), pucks, capsules and spheres with smooth shading. Chunky, toy-like proportions.
- **Busy, lived-in sets** (owner's references: cozy isometric café dioramas): shelves of jars, trailing vines, pendant lamps, wall clocks, string lights, plants, rugs, stools, cakes on tables. Empty space feels unfinished.
- **Dollhouse diorama:** the interior sits on a thick rounded base slab with wood caps along the wall tops.
- **Lighting:** warm sun + pink-tinted hemisphere + one soft interior point light. Emissive bulbs for glow. No bloom or post-processing (UHD 620).
- **Mood:** whimsical candy toy-town (Purble Place-like *shades*), but all models and the layout are ours.

## Palette — pinks, purples, mauves (source of truth: `src/data/palette.ts`)
| Token | Hex | Use |
|---|---|---|
| wall | `#f7e3ec` | blush walls |
| wallTrim | `#c99ad8` | lilac wainscot |
| wood / woodDark | `#c98b9b` / `#a96f82` | mauve floor planks, shelves |
| plum | `#6e3f78` | darkest accent: frames, trims, doors |
| counter | `#ef9fc3` | candy pink |
| purple | `#9d6fd0` | espresso machine, lid, cases |
| lilac | `#d8b8f0` | rugs, dome, lamps |
| mint | `#9fe0cf` | fresh accent (fridge, drawer) |
| butter / peach | `#ffd98a` / `#ffb59a` | warm lights, treats |
| potBody | `#f6b8d2` | the coffee-pot building |
| sky / glass | `#ecdcf7` / `#e6d4ff` | sky, glass |

## The world (from `references/sketches/`)
**Exterior (sketch 02):**
- The main café is a **coffee pot**: a rounded belly body, a lid rim, a **spout chimney** on top, a **round porthole window** at the right and an **arched double door** at the front.
- **Extensions:** glass conservatories. The left wing is boxy, the right has an arched greenhouse roof. Each unlocks on level-up.
- A **winding path** runs from the door to the entrance, with **parking** on both sides (cars appear as the café gets popular) and the **main road** in front.

**Interior (sketch 01, dollhouse view):**
- A corner room with two walls, open to the camera.
- **Kitchen** at the back-left (a small walkable back room: oven + toaster).
- **Counter** along the back with the barista behind it. **Glass pastry cases** run along its front, the left section angled forward.
- **Fridge** at the right end of the counter.
- **Round tables** with chairs.
- **⊕ spots:** expansion lots, bought with coins after levelling up. They open floor space and new wings.

**Barista POV (sketch 01, bottom):**
- Counter top, left to right: milk jug, glass, cream, espresso shot glass, espresso machine.
- **Drawers below = the customisation menu:** fillers · sprinkles · ingredients · food. No floating UI panels. You open a drawer and pick.

## Cameras
| Mode | When |
|---|---|
| Exterior | arrival, expansion reveals |
| Dollhouse | interior overview, decorating, buying ⊕ |
| Walk | moving between stations |
| Barista POV | making drinks and food |

Transitions are smooth camera moves, never cuts.

## Content rules
- Recipes: real ratios with sources, kept in `src/data/recipes.ts`.
- New drinks, food, outfits and decor are added as data, not new code.
