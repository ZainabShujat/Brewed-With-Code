# Story Mode design: companions, real stakes, Foamfeed

Draft 1, 18 Nov 2026. For review before any code. Zen Mode (today's Chill) stays the opposite: no money worries, no
failure, just coffee, cakes and the café.

**The promise of Story Mode:** you're responsible for a real little business. Money, customers, marketing, staff and
expansion all matter. You'll sometimes win, sometimes fail, and always be able to recover. Cozy doesn't mean nothing bad can happen;
it means nothing bad is ever *unfair*.

---

## 1. The three companions (authored, never AI-generated)

You pick one at the start. They're your business partner for the whole story: same café, different friendship,
different advice, different events. Names, looks and pronouns are first drafts for the creator to change.

### Mira Okafor: the Creative One (she/her)
- **Who:** left pastry school after one term because "they wanted me to pipe the same rose 400 times". Sketchbook
  in her apron pocket, paint on her sleeves, hums when she's concentrating.
- **Look:** curly hair tied up with a pencil through it, sage apron covered in doodles, a terracotta cardigan.
- **Voice:** quick, vivid, a little dramatic. "Okay but what if the latte art was a *moon*?"
- **Strengths:** decorated items (latte art, cake toppings) earn +1 star more easily; unlocks new recipes a week
  earlier; her café-look ideas raise **Charm** (see §6).
- **Weaknesses:** loves the expensive option. Her upgrade suggestions cost ~20% more; she resists cutting menu
  items ("but people LOVE the lavender one", nobody does).
- **Arc:** *A menu is for the customers, not for me.* She learns to test ideas small before going big. Her
  last chapter: a signature drink that's finally hers *and* a bestseller.

### Theo Marsh: the Practical One (he/him)
- **Who:** spent six years as a bank teller watching people's small businesses come and go. Keeps a spreadsheet
  called "Fun.xlsx" (it isn't fun). Brings his own lunch every day.
- **Look:** neat cardigan, rolled sleeves, reading glasses on a cord, a walnut clipboard.
- **Voice:** calm, dry, kind. "We *can* afford it. The question is whether we can afford it *and* rent."
- **Strengths:** operating costs −10%; warns you before decisions that would leave you short ("this leaves us
  with 40 coins on Sunday"); suppliers give him small discounts.
- **Weaknesses:** cautious. He argues against expansions and big marketing spends; with him, growth is slower and
  some once-only opportunities pass by.
- **Arc:** *Sometimes you have to take the risk.* His last chapter is the one gamble he pushes for himself.

### Juno Reyes: the Social One (they/them)
- **Who:** knows every shopkeeper on the street by first name and their dog's name. Was "basically the
  neighbourhood's group chat" before the café existed. Runs the café's Foamfeed account.
- **Look:** dusty-rose bomber jacket, a phone that's always at 3%, a different enamel pin every day.
- **Voice:** warm, fast, lots of plans. "Hear me out: open-mic night. On a *Tuesday*."
- **Strengths:** posts reach +30% further; unlocks neighbour events (florist workshop, bookshop reading) a
  chapter early; regulars return more often.
- **Weaknesses:** pitches publicity stunts that can backfire (a giveaway that empties the pantry, a trend that
  doesn't fit the café); ignores costs when excited.
- **Arc:** *Hype isn't loyalty.* They learn the difference between a viral week and regulars who come every day.

**Balance rule:** each companion is the best partner for one style of play and the hardest for another. Nobody is
"the right pick". Tested by simulating the same 4-week run with each (see §10).

## 2. How your choice changes the story

| Same for everyone | Different per companion |
|---|---|
| The café, the street, the core chapters and their big decisions | Their advice on every decision card, and which option they lean towards |
| The finances and the rules | Their stat bonuses and weaknesses (above) |
| The neighbours | Their own events: Mira's moon latte, Theo's supplier deal, Juno's open-mic night |
| | How they react to setbacks: Mira gets dramatic then inspired; Theo goes quiet then makes a plan; Juno panics, then rallies the street |
| | Which neighbours they're close to: Mira with the florist, Theo with the record shop, Juno with everyone |
| | Their personal arc and the ending cutscene |

**Trust (0–100):** the relationship meter. It goes up when you follow their advice *and it works*, or when you ignore it
and it works anyway (they respect being proven wrong). It goes down for ignoring advice that then fails, or for
borrowing their savings. High trust unlocks their personal chapters; low trust means more disagreements, never
a breakup.

## 3. Decisions and consequences

Decisions arrive as **cards**, never more than 2–3 a week: at the Sunday review, when an event triggers, or when you
try to buy something big. Each card has 2–3 options, and each option shows:
- **What you know:** the cost, and what it does for sure.
- **What might happen:** shown as "likely / maybe / small chance", never hidden.
- **Your companion's take:** a line of dialogue plus which option they lean to.

The outcome then plays out over the next days. Every decision is logged in the **café diary**, so you can see later
why something happened.

### Example decisions

**"The espresso machine is struggling."**

| Option | Sure | Might happen |
|---|---|---|
| Buy the pro model (200) | shots 30% faster, +1 brew star cap | maybe you can't make rent this week |
| Wait | 0 coins | likely jams on busy days (a short hold-to-fix mini-moment) |
| Second-hand (90) | cheaper, faster | small chance it breaks in week 3 (repair 60) |

Mira: "The pro one has a *copper* group head." · Theo: "Second-hand. I know the seller." · Juno: "Wait, then we'll
post the jam. People love a struggle story."

**"Hire Sam for weekends?"**
- **Yes:** customers wait less (patience +25%) and +40 coins of capacity, but 35 coins/week in wages forever. Only
  worth it above ~12 customers a day.
- **Not yet:** nothing changes.
- **Trial week:** pay one week, then decide again with real numbers.

**"Open the window nook (expansion)?"** +4 seats and higher demand cap, but 250 coins and +20 rent/week. Too early
means a strained month; right on time and it pays for itself in ~3 weeks.

**"A customer left a 1-star review: 'waited 10 minutes'."**
- **Reply kindly** (free): reputation recovers faster.
- **Ignore:** reputation −2, and a small chance the review spreads.
- **Offer a free coffee next visit** (−4 coins): they might come back and change it to 4 stars.

**"Half-price Tuesdays?"** More customers on Tuesdays (likely), less profit per order (sure), and some regulars only
come on Tuesdays afterwards (maybe).

## 4. Finances (light, readable)

**The weekly rhythm.** You play days; the business is settled every Sunday.

- **Every day:** you make coffee and cakes. Takings come in, and ingredients come out of the pantry, which you buy in the
  street shops (already built).
- **Every Sunday:** the **ledger** card. Takings − ingredients − rent − wages − marketing − repairs = **savings**.
  One screen, coloured bars and three plain numbers: *this week*, *savings*, *next rent*.

| Number | Starts at | Notes |
|---|---|---|
| Savings | 150 coins | your starting capital (Relaxed 250 / Challenging 80) |
| Rent | 40 / week | rises when you expand; the clock that makes money matter |
| Wages | 0 | per hire, weekly |
| Ingredients | ~ what you use | bulk packs save money once unlocked |
| Marketing | 0 | boosts on Foamfeed, flyers, events |
| Repairs | rare | from risky choices (the second-hand machine) |

No taxes, loans with interest or price per item to set. You can add a menu item and choose "regular" or "premium"
price (premium = more coins, slightly fewer orders). That's the whole financial toolkit.

## 5. Foamfeed: the café's social media (fictional platform)

Our own app, our own look: a cream card feed with foam-bubble likes. It lives on the café's tablet by the till
and on your phone in Walk mode.

**What you can do (2 post slots a week, plus replies whenever you like):**
- **Take a photo:** a photo mode at the bar or cake station frames your *actual* drink or cake. Its stars, fill,
  toppings and the time of day all count.
- **Post** in a category: new drink, new cake, seasonal, the café, behind the scenes, a promotion, thank you
  customers, an event.
- **Pick a caption style:** cozy, funny, informative, or hype. Each suits some categories better than others.
- **Boost** a post (spend coins) to reach more people. It doesn't guarantee visits.
- **Reply** to comments and reviews.
- **Collab** with a neighbour (unlocked through neighbour events).

**The metrics, kept apart on purpose:**

| Metric | Means | Grows from |
|---|---|---|
| Followers | people who see your posts by default | good posts, collabs, events |
| Reach | how many saw this post | followers, boost, timing, category fit, a bit of luck |
| Engagement | likes, comments, shares | photo quality, caption fit, novelty |
| Local awareness | how many people *on this street* know you | local posts, neighbour collabs, word of mouth |
| Reputation | what people think of you | reviews, replies, service quality, consistency |
| Visits | people who actually came because of marketing | **local awareness × relevance × reputation**, *not* reach |

**Performance formula (readable, with a little luck):**
`engagement = photoQuality × captionFit × novelty × (1 ± 15% luck)` and
`visits = reach × localShare × relevance × reputationFactor`. So a viral post from a far-away audience brings few
customers, while a modest post about the florist collab can fill the café. The player learns what works by
reading the post's results card: *"Lots of likes, few visits: most people who saw it don't live nearby."*

**Story events from Foamfeed:** a local creator visits (if engagement is high); a drink goes viral (demand spike,
make sure you have beans!); a bad photo of an under-filled glass gets roasted (reputation dip unless you reply
well); a review thread about wait times.

**Not a chore:** no streaks and no daily-post pressure. Skipping a week costs nothing except the chance of growth.

## 6. Reputation and demand

Demand (customers per day) = **base for the café's stage × reputation × local awareness × charm × day-of-week** ×
any active promotion, capped by seats and service speed. In plain terms:
- **Reputation** (0–5 ★): built from served-order stars (already scored per station), reviews and replies.
  It changes slowly; it's the long game.
- **Local awareness** (0–100%): marketing and word of mouth. It fades slowly without activity.
- **Charm:** decor, the café's look and Mira's ideas. Lifts reviews and photo quality a little.
- **Capacity:** seats, staff and equipment speed. Too many customers for your capacity means long waits, walk-outs and bad
  reviews. That's how growing too fast hurts, *visibly*.

## 7. Failure and recovery (fair, never a soft-lock)

**Warning signs come first.** Theo-style warnings come from any companion when savings would go below next week's rent.
The ledger turns amber, then red.

**A rough patch** starts when savings stay below zero at two Sundays in a row. It's a short chapter, not a game
over. You pick one or more recovery cards:
- Cut opening hours (lower costs and takings).
- Pause an expansion area (rent drops; those seats close).
- Let a hire go, with a sad but kind scene.
- Run a promotion (more customers, less profit each).
- Focus the menu on the high-margin items.
- Borrow your companion's savings: it saves you this time, costs trust, and must be paid back.

**What failure looks like:** money runs out, regulars leave, a campaign flops, an expansion strains you. Each comes with a
**"what happened"** card in plain words: *"We expanded in week 2 with 8 customers a day; the new rent was more
than the new seats earned."*

**Worst case:** if a rough patch isn't recovered within 2 weeks, the chapter ends with *"The café closes for a week"*
and reloads the **last Sunday checkpoint**, with the "what happened" card still visible. You never lose more than
a week of play.

**Difficulty** (Story only): Relaxed (more savings, gentler rent, luck tilted your way), Standard, Challenging
(tighter margins, sharper reviews). It can be changed between chapters.

## 8. How it plugs into what's already built

| Already built | Story Mode uses it for |
|---|---|
| Coffee by hand + station stars | order quality feeds reputation and photo quality |
| Cake machine + scoring | the same, for cakes |
| Customers, queue, patience, walk-outs | demand, service speed, bad reviews from long waits |
| Day loop (open, close, results) | days; Sunday adds the ledger card |
| Bank + pantry + street shops | savings, ingredient costs, bulk discounts by level |
| Stars, levels | chapter gates and unlock pacing |
| Business plan (hours, furniture, seats, expansion, upstairs bakery) | the things decisions spend money on |
| The street and its neighbours | collabs, events, and where local awareness lives |
| Kozie | stays the game's narrator: chapter cards, the diary and tutorials. The companions are the people. |

## 9. Architecture

Small separate stores that talk through **events**, never one giant manager:

```
gameplay (bar, cakes, customers) ──emits──► events: served{stars}, walkout, review, dayEnd, purchase …
                                             │
   ┌────────────── story/director.ts (chapter + event rules, data-driven) ◄──┘
   │        reads conditions, queues decision cards + dialogue, applies effects
   ▼
 finances.ts (ledger, rent, wages)    reputation.ts (★, awareness, charm, reviews)
 foamfeed.ts (posts, metrics)        demand.ts (customers/day from the above)
 companion.ts (who, trust, flags)    diary.ts (decision log + "what happened")
```

- **Content is data:** `story/companions/{mira,theo,juno}.ts` with dialogue lines keyed by event + condition,
  `story/chapters/*.ts` with events, decision cards and effects. Writers edit data, not code.
- **Dialogue nodes:** `{ id, speaker, line, when?: condition, choices?: [{ text, effects, next }] }`.
- **Effects** are plain commands (`spend(200)`, `trust(+5)`, `rep(-1)`, `flag('nookOpen')`): easy to test, easy to
  sync for co-op later.
- **Cutscenes** for big moments only: camera rail + two characters + dialogue boxes, built with the reel camera
  tools that already exist.
- **Saves:** a Story save stores the chapter, flags, trust, ledger history, followers and the decision diary, plus a
  Sunday checkpoint.
- Zen Mode simply doesn't mount the director, finances or failure systems.

**Dependencies to build first:** business hours on the clock, the shared order system, and the furniture/expansion
basics from `BUSINESS_PLAN_REVIEW.md`; the companion 3D characters (rigged, a few poses: idle, talk, cheer,
worry); a photo mode for Foamfeed.

## 10. Phased roadmap

| Phase | Contents | When |
|---|---|---|
| **S0 · Design sign-off** | this doc: characters approved, names and looks chosen | now |
| **S1 · Prologue (launch slice)** | choose a companion (3 portraits + intro scene); week 1 with rent, the Sunday ledger, 3–4 decision cards, warnings, the diary; ~60 lines per companion; Zen vs Story on the menu | by 1 Dec |
| **S2 · Foamfeed** | photo mode, posts, the metrics, results cards, reviews and replies | early Dec |
| **S3 · Growth chapters** | staff and wages, expansion decisions, neighbour collabs and events, rough patch + recovery, difficulty settings | mid Dec |
| **S4 · Arcs** | each companion's personal chapters and ending; the upstairs bakery chapter | late Dec – 12 Jan |
| **S5 · Balance** | simulate 4-week runs per companion and difficulty; tune so no pick is "the right one" | alongside S3–S4 |

**Writing load (the real cost):** about 60 lines per companion for the prologue, then about 250 each by the end, plus the
neighbours. The creator approves voice and tone for each companion before more is written.

## Open questions for the creator
1. Are Mira, Theo and Juno the right three, or do you want to change names, looks, pronouns or backstories?
2. Should the companion appear in the bar view while you work, or only in Walk and in scenes?
3. Foamfeed: is the name OK? Should it echo the creator's own reel journey (the café account grows like yours did)?
4. Launch slice: is the prologue (week 1) enough for 1 Dec?

---

## Decisions from the creator (18 Nov 2026)
1. **Companions approved:** Mira (Creative), Theo (Practical), Juno (Social), as drafted.
2. **The bite is right:** real consequences, never shattering. **Recovery length varies:** a rough patch lasts as
   long as the situation does (a quick promo can fix a bad week, while an over-expansion can take a month to dig out of).
3. **Loans + a bank:** a bank on the street (see below).
4. **Launch on 1 Dec is Zen Mode only.** Story Mode ships later as a big update (S1 moves to December).
5. **The meta twist is in:** the café's Foamfeed account grows the way the creator's own reels did, with
   milestone posts that echo real build-log moments.

### The bank: "Copper Kettle Savings & Loans" (a new building on the street)
- **Savings account:** park spare coins, earn a little each Sunday (1%). Safe and boring, Theo's favourite.
- **Loans:** three sizes, unlocked by reputation and your repayment history.

| Loan | Amount | Repay | Total cost | Unlocks |
|---|---|---|---|---|
| Starter | 200 | 4 weeks | +5% | from week 1 |
| Growth | 600 | 8 weeks | +8% | reputation 3★, no missed payments |
| Expansion | 1500 | 12 weeks | +12% | reputation 4★, one loan repaid |

- **Repayments come out on Sunday** in the ledger. A missed payment adds a late fee and lowers your **bank trust**,
  which means smaller loans and worse rates later. It's never a repossession: the bank just restructures (longer term,
  higher cost) and the companion has words about it.
- **The bank is a recovery tool, not a trap:** a rough patch can be bridged with a loan, but borrowing to cover rent
  week after week shows up in the "what happened" card.
- **Companion takes:** Mira wants the Expansion loan for the pretty upstairs; Theo says take the Starter and repay
  it early to build trust; Juno says paperwork is "a vibe killer" but will happily spend it on an event.
- **Where:** a narrow bank between Petal Post and the café on the café's side (x −27…−19), with columns, a clock
  and a brass sign. It sits in the visual-upgrade backlog and comes with Story Mode.

### More decisions (18 Nov, later)
- **A furniture & equipment shop** on the street for Story Mode: tables, chairs, sofas, lamps, decor, and coffee/cake
  equipment upgrades (pro espresso machine, second grinder, faster oven). Prices feed the decision cards ("buy the pro
  machine or save?"). In Zen Mode the same items unlock for free as you play.
- **Customer interaction** is its own workstream (see ROADMAP): customers you can talk to, regulars with names and
  favourite orders, reactions to your drinks, small requests, and table service.
