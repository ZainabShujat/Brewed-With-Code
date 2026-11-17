# Brewed With Code: day-by-day roadmap (from 17 Nov 2026)

Hard dates: **public launch 1 Dec 2026**; Claude access ends **12 Dec 2026** (the game must be maintainable alone after that).
## The game's spine: grow from a cart to a two-storey café
| Level | You run | Unlocked by |
|---|---|---|
| 1 · Coffee cart | a cart on the street: espresso drinks, one queue, outdoors | start |
| 2 · Mini café | the "For lease" unit next door: counter, pastry case, 2 tables, first cake orders | coins + level |
| 3 · The café | the teapot café: full bar, cake machine v2, tables | coins + level |
| 4 · Two storeys | upstairs seating + bakery, stairs, more staff / co-op roles | after launch |

## Cake machine v2 (Purble Place-style mechanics, our own look)
One belt; ◀ ▶ moves **every** pan together. New orders drop a fresh empty pan in at the start while you're
mid-way through others. A dispenser click works on whatever cake is under it (careless clicks ruin the wrong
cake). A cake at ★ is boxed onto the pass as a real object. Levels: 1 cake → 2 cakes, more layers → 3–4 cakes,
faster. Memorising the order with a peek becomes an optional hard mode.

Every build day ships one feature, is captured as it's built (before / during / after) and becomes one BUILD LOG reel.

## Testing runs every day (not a phase at the end)
The 17 Nov glass crash (a blank screen the moment you placed a glass) went unnoticed until a reel showed it. That must not reach players.

**Set up once (Day 2 morning):**
1. **Unit tests (vitest)** for the pure rules: drink/cake scoring, recipes, the queue, coins/tips/patience, the day clock, the save file. Later `applyCommand` for objects.
2. **Automated play-through (Playwright, already installed for reels):** opens the real game, plays a full day through the game's hooks (open café → customer → drink → cake → serve → results). Fails on any console error, crash or stuck state. Screenshots every mode at desktop, phone landscape and phone portrait.
3. **Crash safety in the game:** an error boundary (a crash shows "something went wrong, reload" with your save kept, never a blank screen), a global error logger, versioned saves with a safe fallback if the save is corrupt.
4. **Edge-case list per feature**, written before building it and turned into tests.

**Every build day ends with:** tests + play-through green → commit → then the reel. Red means fix first, no reel.

**Standing edge cases** (grow this list every day):
- clicking things twice or very fast; clicking during an animation
- serving an empty or wrong glass; serving with no customer; a customer leaving while being served
- pressing Esc, switching area or pausing mid-pour / mid-cake
- holding a tool and opening the menu; losing window focus while holding
- max shots, double toppings, a second glass while one is on the coaster
- the day ending mid-order; results then "next day"; reload mid-day (save)
- phone: portrait card, rotate mid-game, touch double-tap, tiny screens
- low graphics mode; no audio permission; private mode (no localStorage)
- real-clock mode at midnight; game clock wrapping 23:59 → 0:00

## Build week (each day promised in the announcement reel)
| Day | Date | Build | Build log |
|---|---|---|---|
| 1 ✅ | Tue 17 Nov | Time of day (sun, stars, warm night, real-clock option) | #02 "I made the sun move" |
| 2 | Wed 18 | **The street:** road, pavements, crossing, brick wall + gates, walkable in Explore | #03 "my café was floating in a field" |
| 3 | Thu 19 | **Neighbours + the coffee cart:** CC0 kit shopfronts in our palette, streetlamps, the empty "For lease" unit, and the level-1 cart | #04 "I started with a coffee cart" |
| 4 | Fri 20 | **Cake machine v2 + real orders** ("The Pass"): several pans on one belt, boxed cakes as objects, the pass, customers collect and pay | #05 "my cake station was just a mini-game" |
| 5 | Sat 21 | **Coffee on the same system:** pour by holding the tool, drinks scored from what's in the glass, one ticket for cake + drink | #06 "no more menus" |
| 6 | Sun 22 | **Customers who act like people:** rigged CC0 characters (walk, queue, sit, sip, wave) + carrying orders to tables | #07 "they finally sit like people" |
| 7 | Mon 23 | **Real surfaces + polish:** textures inside, lamp light, steam particles, performance pass | #08 "flat → real" (the week's before/after) |

## Launch run-up
| Date | Build | Reel |
|---|---|---|
| Tue 24 | **Progression:** cart → mini café → café, unlocked with coins and levels; players start at the cart | #09 "from a coffee cart to a café" |
| Wed 25 | **Walk & serve camera:** third-person walk mode, E to interact, smooth station transitions (camera backlog, MVP slice) | #10 |
| Thu 26 | **Kozie tutorial:** first-day guided order; How to play; saving; mobile pass | #11 |
| Fri 27 | Playtest day: difficulty, coins, patience, bugs | gameplay clips |
| Sat 28 | Bugs + credits + settings + sound check | — |
| Sun 29 | Deploy privately (Netlify Drop, anonymous), test the link on laptop and phone | "3 days" teaser |
| Mon 30 | Buffer | "tomorrow" teaser |
| **Tue 1 Dec** | **Public launch** | launch reel ("it's playable · link in bio") |

## After launch (until 12 Dec)
| Dates | Work |
|---|---|
| 2–4 Dec | Fix what players report; small content (new cakes/drinks) |
| 5–9 Dec | **Co-op prototype:** two players, bakery + café roles (online needs a relay service account, user's decision) |
| 10–11 Dec | **Handoff:** runbooks for building reels, deploying, adding recipes/models; everything committed and documented |

Level 4 (two storeys) comes after launch.
Deliberately later (after 12 Dec, or never): physics props, decorate mode, cleaning loop, VR.
