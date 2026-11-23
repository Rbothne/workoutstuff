# One Move Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the published One Move page into a four-view personal fitness site: Today, Read, Log, Week.

**Architecture:** One artifact page (`index.html`) with hash-routed views. Content lives in JSON files published beside the page. All rules that can be wrong (daily line, weight suggestion, weekly credits) live in one pure module that runs in both the browser and Node, so they are tested without a browser.

**Tech Stack:** Hand-written HTML, CSS and JavaScript (no framework, no build step). Node's built-in test runner (`node --test`). Claude Artifact tool for publishing. Artifact `db` capability for storage if the account has it.

**Spec:** `docs/2026-11-22-onemove-design.md`

## Global Constraints

- The library starts at the twenty moves in Task 1's table. Every move must be learnable from one two-pose drawing.
- Categories: legs, hips, core, push, pull, jump, mobility, cardio. The category shows on each card.
- Equipment keys: none, dumbbells, bench, pullup-bar, band, step, treadmill.
- Dumbbells: he ticks the weights he owns from 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70 lb. Ticking any weight turns the `dumbbells` key on.
- Every dumbbell move has a `load` of `light`, `medium` or `heavy`, shown on its card as "Wants a light / medium / heavy weight". Before he has logged a move, a suitable weight is at most 15 lb for light and at most 35 lb for medium; any weight suits heavy. These cut-offs are the builder's starting guess and are labelled so. Once a move has a log, his own last weight replaces the guess.
- A dumbbell move with no suitable owned weight stays visible with the note "Your lightest dumbbell is {n} lb, which is heavy for this move."
- Articles: each has at least 5 sources, at least 2 of them from a health authority or a peer-reviewed journal, and a BLUF of 3 to 5 actionable goals written after the body. Influencer or vendor material is never cited as evidence.
- Articles give a holistic view of health, not a programme. BLUF goals are lightly actionable: small things a normal person can do, none requiring tracking. Each article includes a short "What's normal" section that grounds the reader in typical healthy ranges or behaviour for that topic, with sources.
- The healthy-eating article draws on the national dietary guidelines of Japan, South Korea, China and Germany and on WHO, and states that a country's good health has many causes besides diet.
- Types: strength, power, cardio, mobility. Effort: light, moderate, hard, shown as "typical effort".
- Muscles: quads, glutes, hamstrings, calves, abs, obliques, lower-back, chest, shoulders, triceps, lats, upper-back, biceps, forearms, hip-flexors, shins, adductors.
- Muscle to bar: quads to `quads`; glutes and hamstrings to `hips`; abs, obliques and lower-back to `core`; chest, shoulders and triceps to `push`; lats, upper-back, biceps and forearms to `pull`; calves and shins to `jump`; adductors to `hips`; hip-flexors to no bar.
- Bars: `quads`, `hips`, `core`, `push`, `pull`, `jump`. Weekly target: 4 sets each. Labelled on the page as a starting point, not a researched figure.
- No calories-burned figure, no food or calorie tracking, no notifications, no streak counter, no record of missed days.
- No daily screen may need typing to complete.
- Weights are in pounds. Dumbbell step is 5 lb.
- A finding is published only after its source link has been opened and found to support it. Otherwise it is dropped or labelled "unverified".
- Evidence labels: `strong` (meta-analysis or large trial), `moderate` (single trial or cohort), `weak` (small study, review or expert opinion).
- Volleyball credits are labelled "estimate" wherever they are shown.
- Follow the Artifact page contract: no doctype or html/head/body tags, theme tokens on `:root` with both dark blocks, 16px side gutters, script hosts from the allowlist only, storage calls wrapped in try/catch.
- Publish to the existing artifact by republishing `onemove/index.html`. Keep the title "One Move".

## Review Focus

1. Storage is missing or throws (private window, no `db` capability): Today and Read still work, and Log and Week show a plain message. Pinned in Task 5.
2. Last session has sets with different weights or a blank rep count: the suggestion uses the lowest weight and ignores unusable sets. Pinned in Task 2.
3. "Did it as written" is tapped twice: one session is logged, not two. Pinned in Task 5.
4. Week boundary in local time (Sunday 23:59 against Monday 00:00), and day 366 in a leap year. Pinned in Task 2.
5. A data file fails to load: the view shows a plain message and the rest of the page keeps working. Pinned in Task 3.

---

## File structure

| File | Responsibility |
|---|---|
| `index.html` | Shell, styles, nav, the ten move cards with drawings, view containers |
| `js/logic.js` | Pure rules. Exposes `OneMove` global in the browser and `module.exports` in Node |
| `js/store.js` | Storage: `db` capability backend, browser-storage backend, memory backend |
| `js/app.js` | Routing, rendering, event handlers |
| `data/moves.json` | Move metadata: category, credits, rep range |
| `data/reading.json` | Topic and sport pages with sourced findings |
| `data/lines.json` | 365 daily lines |
| `tests/*.test.js` | Node tests for logic, store and data files |
| `docs/source-check.md` | One row per source: link, claim, opened yes/no, verdict |

---

### Task 1: Shell, routing and the ten-move library

**Files:**
- Modify: `index.html`
- Create: `js/app.js`, `data/moves.json`, `tests/moves.test.js`

**Interfaces:**
- Produces: `data/moves.json` as an array of `{ id, name, category, equipment, type, effort, primary, secondary, credits, min, max, step, unit, logged }`. `equipment`, `primary` and `secondary` are arrays. `unit` is `reps` or `seconds`. `logged` is false for moves that take no log.
- `credits` maps bar keys to a number per set and is derived: a bar gets 1 if any primary muscle maps to it, otherwise 0.5 if any secondary muscle does. Moves with `logged: false` have empty credits. Volleyball's credits are set by hand.
- Produces: `OneMove.visibleMoves(moves, owned: string[]): move[]`, the card moves whose every equipment key is `none` or in `owned`. It lives in `js/logic.js`, which this task creates.
- Produces: hash routes `#today` (default), `#read`, `#log`, `#week`; each view is a `<section data-view="...">` and exactly one is visible.

Move table (exact values; min, max and step are 0 where a move is not logged):

| id | name | category | equipment | type | effort | primary | secondary | min | max | step | unit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| squat | Squat | legs | none | strength | moderate | quads | glutes | 8 | 12 | 5 | reps |
| bridge | Glute bridge | hips | none | strength | light | glutes | hamstrings | 10 | 15 | 0 | reps |
| deadbug | Dead bug | core | none | strength | light | abs | obliques | 6 | 10 | 0 | reps |
| hipflexor | Hip-flexor stretch | mobility | none | mobility | light | hip-flexors | | not logged | | | |
| landing | Soft landing | jump | none | power | moderate | calves | quads | 5 | 5 | 0 | reps |
| row | Supported row | pull | dumbbells | strength | moderate | lats, upper-back | biceps | 8 | 12 | 5 | reps |
| stack | Stand stacked | mobility | none | mobility | light | | | not logged | | | |
| kneewall | Knee-to-wall check | mobility | none | mobility | light | | | not logged | | | |
| pushup | Push-up | push | none | strength | moderate | chest | triceps, shoulders, abs | 5 | 12 | 0 | reps |
| hinge | Hip hinge | hips | dumbbells | strength | moderate | hamstrings, glutes | lower-back | 8 | 12 | 5 | reps |
| splitsquat | Split squat | legs | none | strength | moderate | quads | glutes | 6 | 10 | 5 | reps |
| calfraise | Calf raise | jump | none | strength | light | calves | | 10 | 20 | 0 | reps |
| plank | Plank | core | none | strength | moderate | abs | obliques | 20 | 60 | 0 | seconds |
| sideplank | Side plank | core | none | strength | moderate | obliques | abs | 15 | 40 | 0 | seconds |
| overheadpress | Overhead press | push | dumbbells | strength | moderate | shoulders | triceps | 8 | 12 | 5 | reps |
| benchpress | Dumbbell bench press | push | dumbbells, bench | strength | hard | chest | triceps, shoulders | 8 | 12 | 5 | reps |
| lateralraise | Lateral raise | push | dumbbells | strength | light | shoulders | | 10 | 15 | 5 | reps |
| deadhang | Dead hang | pull | pullup-bar | strength | moderate | forearms | lats | 10 | 30 | 0 | seconds |
| bandpullapart | Band pull-apart | pull | band | strength | light | upper-back | shoulders | 12 | 20 | 0 | reps |
| boxjump | Box jump | jump | step | power | hard | calves, quads | glutes | 3 | 5 | 0 | reps |
| inclinewalk | Incline walk intervals | cardio | treadmill | cardio | moderate | | | not logged | | | |

A twenty-first entry, `volleyball` ("Volleyball night", credits quads 2, hips 1, jump 3, `logged: false`), is in the file for crediting only. It is not a card.

Default routine, in order: landing, squat, hinge, row, pushup, deadbug, bridge.

`load` per dumbbell move: squat heavy (optional weight), splitsquat heavy (optional weight), hinge heavy, row medium, overheadpress medium, benchpress medium, lateralraise light. Other moves have `load: null`. With the lateral raise the library is twenty-one cards and the file has 22 entries.

- Produces: `OneMove.suitableWeights(move, owned: number[], lastWeight: number | null): number[]`. With `lastWeight` null it applies the cut-offs in Global Constraints; otherwise it returns owned weights from half of `lastWeight` up to the next owned weight above it.

- [ ] **Step 1:** Run `git init` in `onemove/` and commit the current files.
- [ ] **Step 2:** Write `tests/moves.test.js`: the file parses; it has 22 entries with unique ids; every dumbbell move has a `load` and no other move does; `suitableWeights` for lateralraise with owned `[50]` and no log returns `[]`, and for squat returns `[50]`; every category, equipment key, type, effort, muscle and unit is from the Global Constraints lists; every move's `credits` equals the derivation from its muscles (volleyball excepted); `min <= max`; every id in the default routine exists and is logged. Also test `visibleMoves`: with `owned = []` it returns the 12 no-equipment cards and never volleyball; with `['dumbbells']` it adds row, hinge, overheadpress and lateralraise but not benchpress; with `['dumbbells', 'bench']` it adds benchpress.
- [ ] **Step 3:** Run `node --test tests/` and confirm it fails because `data/moves.json` is missing.
- [ ] **Step 4:** Create `data/moves.json` from the table, and `js/logic.js` with `visibleMoves`.
- [ ] **Step 5:** Add the nav bar and four view sections to `index.html`. Move the existing content into `data-view="today"`. Each card's summary shows its category; the open card shows equipment, typical effort, and its muscles marked primary or secondary.
- [ ] **Step 6:** Add the twelve new cards in the existing card format: two-pose drawing, How, Feel it here, Not this. Cards for dumbbell moves that have a sensible no-equipment version say so (row: a loaded backpack; hinge: hands sliding down the thighs; push-up easier version: hands on a counter).
- [ ] **Step 6a:** Add an equipment row above the library: one toggle per equipment key except `none`. Cards not returned by `visibleMoves` are hidden. The choice is kept in browser storage for now and moves to the Store in Task 5. With nothing ticked, the page says how many more moves each piece of equipment would add.
- [ ] **Step 6b:** Today's move is chosen only from visible moves tagged `none` equipment and `light` or `moderate` effort that are logged or mobility, in file order, rotating by day.
- [ ] **Step 7:** Write the router in `js/app.js`: show the view named by `location.hash`, default `today`, update on `hashchange`.
- [ ] **Step 8:** Run `node --test tests/`. Expected: pass.
- [ ] **Step 9:** Publish with `files` for `js/app.js` and `data/moves.json`. Open the artifact and confirm each nav item shows one view and the two new cards open.
- [ ] **Step 10:** Commit.

### Task 2: Rules module

**Files:**
- Modify: `js/logic.js` (created in Task 1)
- Create: `tests/logic.test.js`

**Interfaces (all pure, all on `OneMove`):**
- `dayOfYear(date: Date): number` (1 to 366, local time)
- `pickLine(lines: object[], date: Date): object` returns `lines[(dayOfYear(date) - 1) % lines.length]`
- `weekStart(date: Date): Date` returns the Monday 00:00 local on or before `date`
- `dateKey(date: Date): string` returns `YYYY-MM-DD` in local time
- `suggestNext(move, lastSets): { weight: number, reps: number } | null`
- `weekCredits(entries, moves, weekStartDate): { quads, hips, core, push, pull, jump }`
- `nextMove(credits, target: number, moves): { bar: string, moveId: string }`

An entry is `{ id: string, date: 'YYYY-MM-DD', moveId: string, sets: [{ weight: number, reps: number }] }`. A volleyball entry has `moveId: 'volleyball'` and one set `{ weight: 0, reps: 1 }`.

`suggestNext` rule:

1. Usable sets are those with a finite `reps` greater than 0. No usable sets returns `null`.
2. `w` is the lowest weight among usable sets. `low` is the lowest reps among them.
3. If `low >= move.max` and `move.step > 0`: the next weight is the smallest value in `owned` above `w` when the move uses dumbbells and `owned` is not empty, otherwise `w + move.step`. Return `{ weight: next, reps: move.min }`. If the move uses dumbbells and no owned weight is above `w`, return `{ weight: w, reps: move.max }`. The signature becomes `suggestNext(move, lastSets, owned = [])`. Tests: squat, last all `{20,12}`, owned `[20, 30]` returns `{30, 8}`; owned `[20]` returns `{20, 12}`.
4. If `low >= move.max` and `move.step === 0`: return `{ weight: w, reps: move.max }`.
5. Otherwise return `{ weight: w, reps: Math.min(move.max, low + inc) }`, where `inc` is 5 when `move.unit` is `seconds` and 1 otherwise. Test: plank, last `[{0,20}]` returns `{0, 25}`.

`weekCredits`: for each entry dated from `weekStartDate` up to but not including seven days later, add `move.credits[bar] * sets.length` to each bar. Entries with an unknown `moveId` are skipped.

`nextMove`: the bar with the lowest `credits[bar] / target`, ties broken in the order quads, hips, core, push, pull, jump. `moveId` is the first card move (not volleyball) whose credit for that bar is 1.

- [ ] **Step 1:** Write `tests/logic.test.js` with these cases:
  - `pickLine` with 365 lines: 1 Jan returns index 0; 31 Dec 2027 returns index 364; 31 Dec 2028 (day 366) returns index 0.
  - `weekStart`: Sunday 2026-11-22 23:59 returns Monday 2026-11-16; Monday 2026-11-23 00:00 returns 2026-11-23.
  - `suggestNext` squat, last `[{20,12},{20,12},{20,12}]` returns `{25, 8}`; last `[{20,12},{20,10}]` returns `{20, 11}`; last `[{25,9},{20,9}]` returns `{20, 10}`; last `[]` returns `null`; last `[{20,NaN}]` returns `null`.
  - `suggestNext` push-up, last `[{0,12},{0,12}]` returns `{0, 12}`.
  - `weekCredits`: one squat entry of 3 sets and one volleyball entry in the week gives quads 5, hips 2.5, jump 3; an entry dated the previous Sunday is excluded; an unknown `moveId` is skipped.
  - `nextMove` with all bars at 0 returns `{ bar: 'quads', moveId: 'squat' }`; with only `pull` at 0 returns `{ bar: 'pull', moveId: 'row' }`.
- [ ] **Step 2:** Run `node --test tests/`. Expected: fail, `OneMove` not defined.
- [ ] **Step 3:** Implement `js/logic.js` with the signatures above, exported for both environments.
- [ ] **Step 4:** Run `node --test tests/`. Expected: pass.
- [ ] **Step 5:** Commit.

### Task 3: Reading pages

**Files:**
- Create: `data/reading.json`, `docs/source-check.md`, `tests/reading.test.js`
- Modify: `index.html`, `js/app.js`

**Interfaces:**
- Produces: `data/reading.json` as an array of articles `{ id, kind, title, bluf, sections, sources }`. `kind` is `topic` or `sport`. `bluf` is an array of 3 to 5 goals, each `{ text, cites }`. A section is `{ heading, paragraphs }` and a paragraph is `{ text, cites, strength }`. `cites` is an array of source numbers. A source is `{ n, title, publisher, url, kind, country }` with `kind` one of `authority`, `journal`, `other`.
- Page ids: `eating`, `energy`, `sleep-appetite`, `strength`, `weight`, `habits`, `injury`, `volleyball`, `climbing`, `strength-training`, `walking`.
- The page shows the BLUF first under the heading "Bottom line", then the sections, then the numbered sources.

- [ ] **Step 1:** Write `tests/reading.test.js`: eleven articles with exactly those ids; every article has at least 5 sources, at least 2 of kind `authority` or `journal`; `bluf` has 3 to 5 goals and each cites at least one source; every cite number exists in that article's sources; every paragraph that states a finding has a cite and a `strength` of `strong`, `moderate`, `weak` or `unverified`; every `url` starts with `https://` and appears in `docs/source-check.md`; the `eating` article has sources with `country` of JP, KR, CN and DE.
- [ ] **Step 2:** Run it. Expected: fail, file missing.
- [ ] **Step 3:** For each candidate finding in the research report, open the source link and record a row in `docs/source-check.md`: link, the claim, whether it opened, whether it supports the claim. Prefer the primary paper over a news summary where one can be found.
- [ ] **Step 3a:** For the `eating` article, find and open the current official dietary guidelines of Japan, South Korea, China and Germany (the national health ministry or nutrition society, in English where an official version exists) and WHO's healthy-diet guidance. Add any cohort study found on following those guidelines. Record each in `docs/source-check.md`. If an official source for a country cannot be opened, say so in the article and drop that country from the test rather than cite a secondhand summary.
- [ ] **Step 4:** Write each article's sections from the rows that passed, then write its BLUF last, from the sections. A BLUF goal is one thing a person can do, stated as an action. The volleyball article states that health-outcome data for volleyball is thin. The weight article includes muscle's effect on resting calorie burn only if a source is found and checked. The eating article gives what the four national guidelines and WHO share, where they differ, and a paragraph saying a country's health has many causes besides diet. It contains no calorie targets.
- [ ] **Step 5:** Build the Read view: a list of article titles grouped as Topics and Sports; an article shows "Bottom line", the sections with evidence labels and numbered cites, and the numbered source list with publisher and country.
- [ ] **Step 6:** Add a load-failure path in `js/app.js`: if `reading.json` fails to load, the Read view shows "Couldn't load the reading pages. Reload to try again." and other views keep working.
- [ ] **Step 7:** Run `node --test tests/`. Expected: pass.
- [ ] **Step 8:** Publish with the new files. Open the artifact, open two pages, follow one source link.
- [ ] **Step 9:** Commit.

### Task 4: Daily line

**Files:**
- Create: `data/lines.json`, `tests/lines.test.js`
- Modify: `index.html`, `js/app.js`

**Interfaces:**
- Consumes: `OneMove.pickLine`, page ids from Task 3.
- Produces: `data/lines.json` as an array of 365 `{ text, by, page, url }`. `by` is empty for a finding. Exactly one of `page` (a reading page id) or `url` is set.

- [ ] **Step 1:** Write `tests/lines.test.js`: length is 365; no two `text` values are equal; every `text` is under 200 characters; every `page` is a real reading page id; every line with a `by` has a `url`.
- [ ] **Step 2:** Run it. Expected: fail.
- [ ] **Step 3:** Write the lines. Findings are restated from checked rows in `docs/source-check.md`. A quote is included only when its attribution was found in a source that was opened, and that source is its `url`.
- [ ] **Step 4:** Show today's line under the move on the Today view, linking to its page or source.
- [ ] **Step 5:** Run `node --test tests/`. Expected: pass.
- [ ] **Step 6:** Publish, confirm the line shows, commit.

### Task 5: Storage and the Log view

**Files:**
- Create: `js/store.js`, `tests/store.test.js`
- Modify: `index.html`, `js/app.js`

**Interfaces:**
- Consumes: `OneMove.suggestNext`, `OneMove.dateKey`, `data/moves.json`.
- Produces: `OneMoveStore.open(): Promise<Store>`, where a Store has `list(): Promise<entry[]>`, `add(entry): Promise<entry>`, `remove(id): Promise<void>`, and `kind: 'db' | 'browser' | 'memory'`.
- `add` with an entry whose `date` and `moveId` match an existing entry replaces it. This is what makes a double tap harmless.

- [ ] **Step 1:** Load the `artifact-capabilities` skill and find out whether the account has the `db` capability. Record the answer at the top of `js/store.js` in a comment.
- [ ] **Step 2:** Write `tests/store.test.js` against the memory backend: `add` then `list` returns the entry; adding the same `date` and `moveId` twice leaves one entry holding the second value; `remove` deletes it; a backend whose reads throw makes `open()` fall back to memory with `kind: 'memory'`.
- [ ] **Step 3:** Run it. Expected: fail.
- [ ] **Step 4:** Implement `js/store.js`. `open()` tries `db` (if available), then browser storage, then memory.
- [ ] **Step 4a:** Add `getSettings(): Promise<{ equipment: string[], dumbbells: number[], routine: string[] }>` and `setSettings(settings): Promise<void>` to the Store, tested on the memory backend. Defaults: `equipment: []`, `dumbbells: []`, `routine` is the default routine. Move the equipment choice from Task 1 into it. Each logged card gets an "In my routine" toggle.
- [ ] **Step 5:** Build the Log view. It lists the moves in his routine that are visible with his equipment, in routine order. Each shows three sets pre-filled from `suggestNext` of the last entry for that move, or empty with the text "Pick a weight that feels about 7 out of 10" when there is none. One button, "Did it as written", logs every pre-filled move for today. Each number has plus and minus buttons, so no typing is needed.
- [ ] **Step 6:** When `kind` is `memory`, show "This browser isn't saving. What you log here lasts until you close the page."
- [ ] **Step 7:** Run `node --test tests/`. Expected: pass.
- [ ] **Step 8:** Publish (with `capabilities` if `db` is used). Log a session, reload, confirm it is still there and next time's suggestion changed. If `db` is used, read the stored entry back once with the ArtifactData tool.
- [ ] **Step 9:** Commit.

### Task 6: Week view and the volleyball tap

**Files:**
- Modify: `index.html`, `js/app.js`

**Interfaces:**
- Consumes: `OneMove.weekCredits`, `OneMove.nextMove`, `OneMove.weekStart`, the Store.

- [ ] **Step 1:** Add a "Played volleyball" button to the Today view. It adds a volleyball entry for today; tapping again removes it.
- [ ] **Step 2:** Make "Mark done" on Today add an entry for today's move with one set at its `min` reps, so the daily move fills the bars. The seven dots read from the Store.
- [ ] **Step 3:** Build the Week view: six labelled bars filling toward 4, capped visually at full; under them one line, "Emptiest: {bar}. {move name} fills it.", linking to that card. Add the note "4 sets is a starting point. Volleyball credit is an estimate."
- [ ] **Step 4:** Confirm in the published page: log a squat session and a volleyball night, see quads, hips and jump move by the amounts in the Task 2 test; the Week view shows nothing about earlier weeks.
- [ ] **Step 5:** Run `node --test tests/`. Expected: pass. Commit.
