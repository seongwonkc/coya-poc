# Choose Your American Adventure

Built by **Patrick Kim** — Governor's Academy, Class of 2027.

A life simulator about which parts of an outcome were chosen and which were
assigned. You create a character, make two decisions in high school, and then
live from eighteen to retirement at sixty-five through a series of decisions —
college, work, housing, a home, your health — with the years in between played
out automatically: pay, rent, debt, layoffs, police stops, emergencies.

Static site, no build step. Open `index.html`, or `npm start`. The only network
call is the optional narration function described below; without it the game
plays the same on its written text.

---

## The thing that makes it not just a game

Most sims of this kind hand you a "background" dropdown that quietly sets your
stats. That encodes a bad claim: that being a particular kind of person *is*
being poor, or *is* attending an underfunded school.

This one splits the two:

- **Identity is chosen.** It drives only what other people do to you — callback
  rates on applications, rate of involuntary police contact, how much a record
  costs you afterward, whether reported pain is treated.
- **Circumstance is rolled.** School district, household income, neighbourhood,
  family cushion and health coverage are sampled from distributions that are
  *conditioned* on identity, never set by it.

Then it shows you the roll. The conditions panel tells you which cell you landed
in, how often people with your identity land there, and how often everyone does.
An unlucky draw reads as an unlucky draw.

**Every biased roll reports its counterfactual.** When an application is screened
at 0.67×, the game prints both the odds you got and the odds you would have had
without it. Hiding the bias inside the math would defeat the entire exercise.

---

## What the numbers are

**Tuned for play, not estimated.** No figure in `data.js` should be quoted as a
statistic. Coefficients are shaped by the direction and rough magnitude of
published findings — Bertrand & Mullainathan (2004) on callback gaps, Pager
(2003) on the interaction of race and criminal records, EdBuild (2019) on
district funding — and each anchor is named in a comment next to the parameter
it informed.

The limitations are documented at the top of `data.js` and are worth reading
before drawing any conclusion from a playthrough. The short version: every
identity row is an aggregate, the circumstance tracks are modelled as
independent when in reality they arrive together, and nothing here is causal.

---

## Files

| File | What it holds |
|---|---|
| `index.html` | Shell — HUD, event feed, action dock, sheets |
| `style.css` | All styling; icon slots bound via `[data-icon]` |
| `data.js` | Model parameters, distributions, stages, jobs, actions, events, prose |
| `script.js` | Engine — rolls, odds, stages, the yearly ledger, rendering |
| `tools/simulate.js` | Headless playthroughs for testing and measuring outcomes |
| `netlify/functions/narrate.js` | Optional AI narration endpoint |
| `assets/icons/` | 48×48 pixel icons, displayed at 24px (exact 2:1) |
| `assets/icons/raw/` | Unmodified generator output, before contrast lifting |

Icons were generated with PixelLab and then post-processed: the generator was
asked for black outlines, which disappear on a dark panel, so outline pixels are
lifted to a slate tone and each icon is raised until it clears ~3.4:1 against
the panel background. Originals are kept in `raw/` so the step is reversible.

---

## Life stages

Play is not a free-form menu. A life is a sequence of stage decisions defined
in `stages` in `data.js`. At each one the game stops and asks one question with
a small number of answers, and ageing is blocked until it is answered.

| When | Decision |
|---|---|
| 14 | How to spend high school (hardest classes, a job, a team, coast) |
| 16 | How to prepare for college (tutor, prep course, self-study, more shifts) |
| 18 | College, a job, a union apprenticeship, the military, or nothing |
| On graduating | Professional jobs, or whatever is hiring |
| On a two-year degree | Transfer to a state university, or technician work |
| When an enlistment ends | Re-enlist, GI Bill, or a civilian job |
| When out of work | Look for work, apply higher, enroll, or wait |
| 25 | Your own place, roommates, or stay home |
| 30 | Promotion, a better job, night school, a business, or stay |
| 33 | Buy a home, or keep renting |
| 40, 50 | Health, retraining, saving |
| 65 | Retirement, and the end-of-life summary |

Age Up plays one year; "Skip ahead" plays years until the next decision, and
stops early when something happens you'd want to respond to (a layoff, an
arrest, leaving college). The "Other things you could do" menu holds actions
for in between — a doctor, a side hustle, a diversion program — each usable
once a year.

**Closed doors are content.** A choice you cannot take still appears, with the
reason stated in the player's own terms — "your school offered no AP or
honours courses, and the application reads that as you" — rather than being
silently absent. A rejection closes that door for the year and leaves the
others open.

Gates live in `STAGE_GATES` in `script.js`. They are deliberately tuned so that
disadvantage is a headwind rather than a wall: state universities are open to
nearly everyone, and elite admission is the gated one.

**The end screen** lists every decision made, how many rolls were tilted
against the player and how many in their favour, and what the world assigned
them. It closes by suggesting the same choices with a different identity.

## AI narration

The AI writes prose. It does not decide anything.

The engine rolls every outcome and applies every bias multiplier first; the
model is then handed the settled result and asked for two or three sentences
describing it. This keeps the odds display, the counterfactuals and the whole
measurement apparatus true — a probability shown to the player is a probability
that actually ran. If the call fails, times out, or is disabled, play continues
on the written templates and the player sees nothing missing. Three consecutive
failures switch it off for the session.

### The endpoint

`netlify/functions/narrate.js`, exposed at `/api/narrate`.

An earlier version of this project shipped a function that took `userInput` from
the request body and passed it straight to the model. That is a free,
unauthenticated LLM for anyone who finds the URL, billed to whatever key is
configured. It sat live for about eleven months before being removed.

The rule that prevents a repeat: **the caller never supplies prompt text.** The
body carries structured game state, every field is checked against a closed set
of allowed values, and the prompt is assembled inside the function. The allowed
values (jobs, education levels, stage choices) are read from `data.js` itself,
so adding a stage cannot silently break narration. There is no
field for prose to land in, so a caller cannot steer the model. The player's
name is the one free-text value and is stripped to letters and length-capped.
Also enforced: a 2KB body cap, a per-IP rate limit, capped output tokens, and
provider errors that are logged but never echoed to the client.

If you extend this function, keep that property.

## The lives counter

The creation screen shows a "lives lived" count, seeded at 200 and incremented
each time a life is started.

**It is currently per-device, not universal.** It reads and writes
`localStorage`, so every visitor sees their own count stacked on the same seed —
two people who each start one life will both see 201, not 202. Making it a true
global counter means storing the number somewhere shared. `readLives()` and
`bumpLives()` in `script.js` are the only two functions that would need to
change; the natural fit here is a Netlify Function backed by Netlify Blobs,
since `netlify.toml` already declares a functions directory.

## Model notes

- **Money is in today's dollars.** Raises are real raises and costs don't
  inflate. Earnings are taxed at a flat 20%.
- **Employment persists.** Jobs pay every year; promotion is a hiring decision,
  so identity bias applies there too. A one-shot payout would make hiring bias
  a rounding error; a recurring salary lets it compound across a career, which
  is where the real gap lives.
- **Spending rises with income.** Once rent and debt are covered, most of what
  is left is spent (`lifestyleShare`). Surplus pays down debt before it becomes
  savings; cash above a small buffer earns a modest return.
- **Money cannot go negative.** A shortfall becomes debt at 6%. A year in the
  red with real debt forces a move down — your own place to roommates, then
  back home if your family can take you; a homeowner sells.
- **Family money shows up where it does in life:** it pays a share of tuition,
  absorbs part of each emergency, puts money toward a down payment, fronts a
  business, and lowers the chance of leaving college without the degree.
- **Health recovers** a little each year, faster with better coverage.

## Testing

`npm run simulate` plays lives headless through the real page (jsdom, a dev
dependency), clicking the same buttons a player would. It fails on a runtime
error, a decision with no open option, a life that never ends, or a `NaN` in
the feed, and prints outcomes by identity:

```
node tools/simulate.js 150 best     # same ambitious choices every life
node tools/simulate.js 100 random   # random choices, for finding bugs
```

Running the "best" strategy — the same ambitious choices every life — for 150
lives per identity, eighteen to sixty-five (net worth = cash + home equity −
debt, in today's dollars):

| identity | median net worth | bachelor's | owns a home | criminal record | died before 65 |
|---|---|---|---|---|---|
| White | $1,023,259 | 93% | 61% | 7% | 0% |
| Asian | $908,635 | 92% | 49% | 13% | 0% |
| Hispanic / Latino | $810,460 | 80% | 48% | 29% | 1% |
| Black | $543,299 | 83% | 37% | 27% | 3% |
| Native American | $505,821 | 84% | 35% | 28% | 7% |

The same choices, and roughly half the wealth at the bottom of the table. The
degree rate barely moves; the gap opens through admission tier, the family
share of tuition, callbacks, promotions, the down payment, and the record. As
before: the medians are noisy at this sample size and the ordering of the
middle rows is not stable run to run, so read the spread, not the rank.

## Multiplayer (planned)

Every player meets the same decisions at the same ages, which is what makes a
table version possible: a room of players, each with their own identity and
rolls, advancing stage by stage together while a game master reads the
decisions aloud, then comparing end screens. The lives counter would move to a
shared store at the same time.
