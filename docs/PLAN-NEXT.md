# Brewed With Code: the plan from 19 Nov

Launch: **1 Dec 2026 (Zen Mode)**, 12 days away. Story Mode is a December update.

## Where things stand (end of 18 Nov)

- **Live:** brewed-with-code.vercel.app (GitHub `main` deploys on push). All tests pass:
  - 36 unit tests
  - `tests/playthrough.py`: 13/13
  - `tests/day_flow.py`: 27/27
  - `tests/touch_bar.py`: 6/6
- **The day loop:**
  - flip the door sign to open
  - guests come in waves with quiet spells between them
  - Take order sends you to the bar or the cake bench
  - empty cups and refills give tips
  - flip the sign to close
  - results, then Wind down (wipe a table, say goodnight)
- **Views:** Explore, First person and Dollhouse (keys 1/2/3), gliding between them.
- **Phones:** tap to walk (no joystick), one-finger look, pinch and two-finger pan, finger drag at the bar. The phone layout is kept separate from the laptop one (`.phone` class).
- **Kozie teaches:**
  - a 7-step getting-around tour
  - the first two coffee orders
  - goodnight hints in Wind down
- **Reels:**
  - #07 (townsfolk) is done
  - #03 and #04 have new hooks
  - the full tour is done in landscape and portrait
  - the covers and captions for all of the above are done

## Tomorrow (19 Nov), in this order

1. **Kozie teaches the whole game.** Each lesson fires the first time that thing matters, waits for you to actually do it, and runs only once.
   - **First cake order:** step along the belt, use the dispensers in order, box the cake.
   - **First ingredient running out:** "we're out of beans!", then walk to the shop, T to chat, F to buy, and what bulk packs are.
   - **First empty cup or refill request** during the day.
   - **First closing time:** serve the last guests, then flip the sign to CLOSED.
   - Tutorial test: `day_flow.py` gets a step for each lesson.
2. **Sound you can feel.**
   - Townsfolk murmur when they're near you, so there's always some chatter.
   - Reward sounds everywhere: sweet spots, serving, tips, coins, levelling up, door sign, wipe sparkle, buying.
   - Murmurs get quieter with distance and stop at night.
3. **Re-render #05 and #06** with the "day 4" taken out of their tags. The scripts stay the same.
4. **Reel #08: "it's live"**, the deployment reel. The game is now playable in a browser and on phones, so show a phone playing it (script for your OK first).

## Next (20 Nov – 1 Dec, before launch)

- **A map**, so people know what every building is: a small minimap or a map screen, with the café, shops, park and bus stop labelled.
- **The marshmallow township (west/left) and the notebook township (east/right):** little homes on their sides of the street, with walkers coming from and going home to them.
- **A forest behind the café boundary:** trees of different sizes, so the world feels full and rich. Smoothness comes first.
- **The lag:** profile on a real phone and a laptop, then add Low / Medium / High presets, a resolution that adapts to the frame rate, and cheaper shadows.
  - Townsfolk far from you update less often, and the game pauses while the tab is hidden.
  - This is part of mobile phase 5.
- **Mobile phase 2:** tap a guest, townsperson, station or table → a bottom action panel with only the actions that fit (talk, take order, top up, clear cup…).
- **Mobile phase 3:** a compact top bar, bottom navigation, and the bar view rearranged for landscape phones.
- **Remake #02** (and look again at #01) to the build-log standard:
  - hook in 1 s
  - payoff before 10 s
  - 25 s or less
  - before → code → after
  - Kozie on screen
  - a question at the end
- **Launch week:**
  - a launch reel
  - pin the full tour
  - tidy the README
  - a final pass on phone and laptop

## After launch (December, access until 12 Jan)

- **Story Mode** (the December update):
  - companions Mira, Theo and Juno
  - the weekly ledger and decision cards
  - Copper Kettle Savings & Loans
  - Foamfeed with the meta twist
  - a furniture and equipment shop
- **A character registry:** named regulars with routines, lines and how well you know them, plus their profiles.
- **Furniture placement** (mobile phase 6): a catalogue, a drag preview with a fits / doesn't-fit check, rotate, confirm, move and store.
- **Cake v2** (on hold), and changing stations mid-order (park an order, come back to it).
- **Looks:**
  - the café interior benchmark with the downloaded textures
  - a paper/stationery look for the menus
  - homes in the background beyond the wall
- **Low-stock warnings** in the day summary.

## Rules to keep

- Phone and laptop layouts stay separate. Phones walk by tapping, like The Sims Mobile.
- Every reel:
  - Kozie on screen and Ava's lively voice
  - café music, no chiptune
  - a PLAYABLE 1 DEC pill and launch card
  - checked against the code
  - the script shown first
  - a cover and caption delivered with it
  - numbered #xx, never by day
- Commit with no AI attribution. Push only when asked.
