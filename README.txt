INFINIA MATH PRACTICE
=====================

Static GitHub Pages web app built from the Infinia Academy Math Fluency
worksheet bundle in this project: A1-A13 and M1-M9.

CONTENTS
- index.html                 App entry point
- assets/styles.css          Mobile-first styling
- assets/app.js              Client-side practice, scoring, timer and storage
- data/math-practice.json    Canonical web practice data (150 sets / 3,412 questions)
- data/content-manifest.json Level/set summary
- downloads/                 Printable student and level PDFs + teacher answer key

DEPLOYMENT
The site uses only relative project paths and hash routes, so it is compatible
with a GitHub Pages project site such as:
https://infinia-academy.github.io/math-practice/

No backend and no build step are required.

KATEX
Math is rendered using KaTeX loaded from the official jsDelivr CDN. If KaTeX
cannot load, the app displays a readable text fallback rather than breaking.

TIMER / DEVICE STORAGE
- Each practice set has an elapsed-time timer.
- Active session state, answers and timer are stored in localStorage.
- Timer elapsed time and current question are also mirrored to a small
  first-party cookie (infinia_math_timer_v1) as a restoration fallback.
- The timer is stopped and saved when leaving a practice screen, then resumes
  when the same set is opened again.
- Progress is local to the student's browser/device. No student data is sent
  to a server by this app.

CACHE
No service worker is included, so there is no application cache version to bump
when publishing normal updates. GitHub Pages/browser HTTP caching can be bypassed
for testing with a URL such as ?v=2.
