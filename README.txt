INFINIA MATH PRACTICE
=====================

Static GitHub Pages web app built from the Infinia Academy Math Fluency
worksheet bundle in this project: A1-A13 and M1-M9.

CONTENTS
- index.html                    App entry point
- assets/styles.css             Existing mobile-first practice styling
- assets/app.js                 Existing practice, scoring, timer and storage
- assets/braindrops.css         Braindrops game layout and visual design
- assets/braindrops.js          Braindrops game engine and level integration
- assets/neural-brain-bg.svg    Original neural-network / brain background art
- data/math-practice.json       Canonical web practice data (150 sets / 3,412 questions)
- data/content-manifest.json    Level/set summary
- downloads/                    Printable student and level PDFs + teacher answer key

BRAINDROPS (เกมสมองแตก)
- The normal practice mode remains intact; Braindrops is a separate game route.
- Students choose any existing A1-A13 or M1-M9 level.
- Falling brains use questions only from that selected level's existing source bank.
- Entering one answer clears every visible brain with the same answer.
- Each cleared brain is worth 500 base points; clearing multiple matching brains gives
  an additional combo bonus, and consecutive correct submissions build a multiplier.
- A brain reaching the neural floor costs one of three lives. Three misses end the round.
- A miss slightly eases the remaining falling speed; correct play gradually raises the challenge.
- Repeated rapid guessing temporarily locks the keypad.
- Pause/resume, transparent touch keypad, clear-X button, keyboard input, local best scores,
  replay, level change, and return-to-normal-practice actions are included.
- Switching away from the browser automatically pauses an active round.

DEPLOYMENT
The site uses only relative project paths and hash routes, so it is compatible
with a GitHub Pages project site such as:
https://infinia-academy.github.io/math-practice/

No backend and no build step are required.

KATEX
Normal Math Practice equations are rendered using KaTeX loaded from the official
jsDelivr CDN. If KaTeX cannot load, the app displays a readable text fallback.
Braindrops uses crisp stacked/inline arithmetic typography optimized for moving objects.

TIMER / DEVICE STORAGE
- Each normal practice set has an elapsed-time timer.
- Active practice session state, answers and timer are stored in localStorage.
- Practice timer elapsed time and current question are also mirrored to a small
  first-party cookie (infinia_math_timer_v1) as a restoration fallback.
- Braindrops high scores and recent-level state are stored locally under
  infinia.math.braindrops.v1.
- Progress is local to the student's browser/device. No student data is sent
  to a server by this app.

CACHE
No service worker is included, so there is no application cache version to bump
when publishing normal updates. GitHub Pages/browser HTTP caching can be bypassed
for testing with a URL such as ?v=2.

V3 ADAPTIVE BRAINDROPS
- Adaptive Addition/Subtraction and Multiplication modes added while Focus Practice remains available.
- Rolling memory keeps the latest 10 completed games per strand; game 11 replaces the oldest.
- New rounds use a 30% weakness-review / 70% fluency-and-progress curation model.
- Easier unresolved levels receive extra review weight before higher-level progression.
- First-ever adaptive play starts at A1/M1 and rises after fluent correct streaks; repeated misses ease the frontier and game pressure.
- Large deterministic question pools are generated from the A1-A13/M1-M9 curriculum rules and cached in localStorage (cookie stores pool version metadata only).
- Each falling brain is labelled with its A/M level code.
- Long expressions are forced to remain on one line per expression segment with smaller responsive type; derived-fact equations use deliberate multi-line segments.
