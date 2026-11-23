# One Move: design

Date: 2026-11-22. Status: awaiting approval.

## Intent

A personal fitness site for one person who has a good plan and has not started it. He plays volleyball about three nights a week on shifting days, wants to lift twice a week, may start climbing, overeats late at night at his desk, ignores alarms, and acts on things he can see. Reading about why health matters motivates him, so the site gives him sourced things to read and makes the first action each day very small.

## Goals

1. Keep "today's move" as the front page: one small exercise, with a drawing, how to do it and where to feel it.
2. Give him sourced reading: topic pages and sport pages, every claim linked to its source with a plain evidence label.
3. Show one sourced line a day for a year.
4. Let him log lifts with almost no effort and get a weight and rep suggestion for next time.
5. Show how balanced his week is across muscle groups, and name what to do next.

## Non-goals

- Calorie or food tracking.
- Notifications, alarms or reminders.
- Streak counters or anything that resets on a missed day.
- Reading data from a watch or phone health app. A web page cannot do this.
- Other users, sharing or social features.

## Anti-goals

- Any daily screen that needs typing to complete.
- Any screen for planning or configuring before he can act.
- Numbers presented as evidence when they are estimates.

## Constraints

- It is a Claude artifact page, opened in Firefox on a laptop and on a phone.
- No server of its own. No device sensors. No file downloads from the page.
- Source links must be opened and checked against the claim before a claim is published. A claim whose source cannot be opened is dropped or labelled as unverified.

## Approaches considered for the balance view

| Option | How it works | Trade-off |
|---|---|---|
| A. Sets per muscle group (chosen) | Each logged set credits its main muscle 1 and helpers 0.5. Bars fill through the week. | The unit is real. The emptiest bar says what to do next. |
| B. Abstract points per category | Each exercise has scores for strength, power, cardio and so on. | Feels like a game, but the scores would be invented. |
| C. Fixed routines, no scoring | Two preset lift days, log only. | Simplest, but cannot show what is neglected. |

He deferred to the recommendation, which was A, shipped with a default routine so nothing has to be designed by him.

## Decided with him

- Today's move stays the front page.
- Build order: reading pages, then the lifting log, then the balance view.
- The daily line is a mix of sourced findings and traceable quotes, not 365 unchecked quotes.
- Logging must be close to automatic.

## Design

### Views

One page with a small set of views, switched by a top bar: Today, Read, Log, Week.

### Today

As built. Adds the daily line under the move, and a "played volleyball" tap.

### Read

- Topic pages: energy and fatigue, sleep and appetite, strength, weight, habits, injury prevention.
- Sport pages: volleyball, climbing, strength training, walking.
- Each page is a short list of findings. Each finding has one or two sentences, a source link, and a label: strong (meta-analysis or large trial), moderate (single trial or cohort), weak (small study, review or expert opinion).
- The volleyball page says plainly that health-outcome data for volleyball is thin and leans on jump training and injury prevention.

### Daily line

365 lines chosen by day of year, so every device shows the same line. Each line links to its reading page or source.

### Log

- Log by exception. Opening a lift day shows every set already filled with the suggested weight and reps. One tap on "Did it as written" logs the session. He edits a number only when it differed.
- Suggestion rule (double progression): each lift has a rep range. When every set reached the top of the range, suggest the next weight up at the bottom of the range. Otherwise suggest the same weight and one more rep.
- First session of a lift: no suggestion. He picks a weight that feels about 7 out of 10.
- He can also tell Claude in chat what he lifted, and Claude writes it to the log.

### Week

- Six bars: quads, glutes and hamstrings, core, push, pull, calves and jumping.
- Each bar fills toward a weekly target of sets and resets each Monday with no carry-over penalty and no history of misses shown.
- Under the bars, one line names the emptiest bar and the exercise that fills it.
- A volleyball night credits quads, glutes and hamstrings, and calves and jumping. These credits are estimates and are labelled as such.

### Exercise library

The existing eight moves plus a push (push-up) and a hip hinge (dumbbell Romanian deadlift), each with the same drawing and cue format, so all six bars can be filled.

Decided with him on approval (2026-11-22):

- Moves stay simple. There is no hard cap on the count (he corrected an earlier reading of his comment), but the library starts at twenty and grows only with moves that are easy to learn from one drawing.
- Equipment filter: he ticks the equipment he has or wants to use, and the library shows only moves whose equipment is all ticked. "None" is always on.
- Every move carries tags: category, equipment, type of activity, typical effort, and muscles.
- Category (legs, hips, core, push, pull, jump, mobility, cardio) shows on each card.
- Muscles are tagged at a finer grain than the six bars, as primary or secondary: quads, glutes, hamstrings, calves, abs, obliques, lower back, chest, shoulders, triceps, lats, upper back, biceps, forearms, hip flexors. Each muscle rolls up into one bar, so the Week view stays six bars and a tap on a bar shows the muscles inside it.
- Type of activity: strength, power, cardio, mobility.
- Typical effort: light, moderate, hard. It is labelled "typical" because the real effort depends on the load and how the move is done.
- Dumbbells (his correction): he ticks the weights he owns. Each dumbbell move says whether it wants a light, medium or heavy weight, and the site tells him when nothing he owns suits a move. His example: a 50 lb dumbbell suits squats and does not suit arm raises. Weight suggestions step to the next weight he owns.
- Reading pages are articles (his direction): each opens with a BLUF paragraph of actionable goals for a normal person, written after the article body. Each cites at least five sources, some of them trusted health sources and none of them influencers used as evidence.
- A healthy-eating article synthesises many sources, including the national dietary guidelines of countries known for good health: Japan, South Korea, China and Germany. It contains no calorie targets.
- He can mark any move "in my routine". The Log view lists his routine. A default routine ships so he never has to build one.
- No calories-burned estimate anywhere on the site. He found the numbers disheartening, and they are inaccurate for this kind of exercise.
- No calorie or food tracking. He handles that himself.

## Builder's calls

- Starting weekly target: 4 sets per bar. This is a beginner starting point chosen by the builder, not a researched figure.
- Volleyball credit per night: quads 2, glutes and hamstrings 1, calves and jumping 3. Estimate.
- Storage: the artifact's shared database if the account has it, so phone and laptop agree. If not, browser storage plus a copy-to-clipboard backup.
- Content lives in data files beside the page, so findings and lines can be added without touching the layout.
- Rep ranges: 8 to 12 for most lifts, 5 for landings, time-based for stretches.

## Left to the builder

Layout, visual design, drawing style for the two new moves, wording of findings, and which 365 lines make the cut.
