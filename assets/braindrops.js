(() => {
  'use strict';

  const STORAGE_KEY = 'infinia.math.braindrops.v1';
  const GAME_VERSION = 1;
  let runtime = null;

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: GAME_VERSION, levels: {}, lastLevel: null };
      const parsed = JSON.parse(raw);
      parsed.levels ||= {};
      return parsed;
    } catch (_) {
      return { version: GAME_VERSION, levels: {}, lastLevel: null };
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function brainSvg(extraClass = '') {
    return `
      <svg class="brain-svg ${extraClass}" viewBox="0 0 120 104" aria-hidden="true">
        <path class="brain-body" d="M59 97c-15 0-27-7-33-18-13-1-23-12-22-25 0-9 5-17 13-21-4-14 5-29 19-32 8-9 23-9 32-1 11-8 27-4 33 7 13 2 21 15 17 27 8 5 12 14 10 23-2 12-12 21-24 22-7 12-20 19-35 18-4 0-7 0-10 0z"/>
        <path class="brain-mid" d="M60 13v70"/>
        <path class="brain-fold" d="M39 15c-8 7-8 18-1 24-10 3-14 16-7 24-7 7-5 18 4 23M81 15c8 6 9 17 2 24 10 4 14 16 7 24 7 7 5 18-4 23M20 42c9-2 17 3 20 11M99 41c-9-1-17 5-19 13M25 69c9-5 20-2 25 7M95 70c-9-5-20-1-24 7"/>
      </svg>`;
  }

  function renderHomeCard() {
    return `
      <button class="braindrops-home-card" type="button" data-braindrops-home>
        <span class="braindrops-home-art" aria-hidden="true">${brainSvg('home-brain')}</span>
        <span class="braindrops-home-copy">
          <span class="braindrops-home-kicker">ARCADE FLUENCY · เกมฝึกความคล่อง</span>
          <strong>Braindrops <span lang="th">(เกมสมองแตก)</span></strong>
          <span>Solve the falling maths before the brains reach the neural floor.</span>
          <span lang="th">คิดคำตอบให้ทันก่อนสมองตกถึงด้านล่าง</span>
        </span>
        <span class="braindrops-home-cta">PLAY →</span>
      </button>`;
  }

  function renderLanding(view, data, opts) {
    destroy();
    document.body.classList.remove('braindrops-active');
    const state = loadState();
    const levels = data.levels || [];
    const last = state.lastLevel && levels.some(l => l.code === state.lastLevel) ? state.lastLevel : 'A1';
    view.innerHTML = `
      <section class="bd-landing">
        <div class="page-top">
          <button class="icon-btn" type="button" data-bd-back aria-label="Back">←</button>
          <div class="page-heading">
            <span class="code-pill">BRAINDROPS</span>
            <h1>Braindrops <span class="bd-th-title" lang="th">เกมสมองแตก</span></h1>
            <div class="th">เกมฝึกคณิตคิดเร็วจาก Level เดียวกับ Infinia Math Practice</div>
          </div>
        </div>

        <section class="bd-intro-card">
          <div class="bd-intro-art" aria-hidden="true">${brainSvg('intro-brain')}</div>
          <div>
            <h2>Think. Type. Pop.</h2>
            <p>Brains carry questions from the selected Infinia level. Enter an answer before they reach the neural floor.</p>
            <p class="thai">สมองแต่ละก้อนจะมีโจทย์จาก Level ที่เลือก พิมพ์คำตอบให้ทันก่อนตกถึงด้านล่าง</p>
            <div class="bd-rule-chips">
              <span>3 lives</span><span>500 pts / brain</span><span>Multi-pop combos</span>
            </div>
          </div>
        </section>

        <section class="bd-rules">
          <strong>How it works · วิธีเล่น</strong>
          <ol>
            <li>Solve any falling brain and type its answer. · คิดคำตอบของสมองก้อนไหนก็ได้</li>
            <li>The same answer clears every matching brain on screen. · คำตอบเดียวกันจะเคลียร์ทุกก้อนที่ตอบเท่ากัน</li>
            <li>A brain reaching the bottom costs one life. Three misses end the round. · สมองตกถึงล่างเสีย 1 ชีวิต ครบ 3 ครั้งจบรอบ</li>
          </ol>
        </section>

        <div class="section-row"><div><h2>Choose a level</h2><p>เลือกทักษะที่ต้องการฝึก</p></div></div>
        <div class="bd-level-tabs" role="tablist">
          <button class="active" type="button" data-bd-strand="addition-subtraction">+ − A1–A13</button>
          <button type="button" data-bd-strand="multiplication">× ÷ M1–M9</button>
        </div>
        <section class="bd-level-grid" data-bd-level-grid>
          ${levelCards(levels.filter(l => l.strand === 'addition-subtraction'), state, last)}
        </section>
      </section>`;

    view.querySelector('[data-bd-back]').addEventListener('click', () => opts.navigate('#/'));
    view.querySelectorAll('[data-bd-strand]').forEach(btn => btn.addEventListener('click', () => {
      view.querySelectorAll('[data-bd-strand]').forEach(x => x.classList.toggle('active', x === btn));
      const strand = btn.dataset.bdStrand;
      view.querySelector('[data-bd-level-grid]').innerHTML = levelCards(levels.filter(l => l.strand === strand), state, last);
      bindLevelButtons(view, opts);
    }));
    bindLevelButtons(view, opts);
  }

  function levelCards(levels, state, last) {
    return levels.map(level => {
      const record = state.levels?.[level.code] || {};
      return `
        <button class="bd-level-card ${last === level.code ? 'recommended' : ''}" type="button" data-bd-level="${esc(level.code)}">
          <span class="bd-level-code">${esc(level.code)}</span>
          <span class="bd-level-name"><strong>${esc(level.title_en)}</strong><small>${esc(level.title_th)}</small></span>
          <span class="bd-level-best">${record.bestScore ? `Best<br><strong>${Number(record.bestScore).toLocaleString()}</strong>` : 'PLAY'}</span>
        </button>`;
    }).join('');
  }

  function bindLevelButtons(view, opts) {
    view.querySelectorAll('[data-bd-level]').forEach(btn => btn.addEventListener('click', () => opts.navigate(`#/braindrops/${btn.dataset.bdLevel}`)));
  }

  function buildPool(level) {
    const seen = new Set();
    const pool = [];
    for (const set of level.sets || []) {
      for (const q of set.questions || []) {
        const key = `${q.fallback}|${q.answer}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push({ id: q.id, fallback: q.fallback, latex: q.latex, answer: Number(q.answer) });
      }
    }
    return pool;
  }

  function renderGame(view, level, opts) {
    destroy();
    document.body.classList.add('braindrops-active');
    const state = loadState();
    state.lastLevel = level.code;
    saveState(state);

    view.innerHTML = `
      <section class="bd-game" aria-label="Braindrops game ${esc(level.code)}">
        <div class="bd-neural-glow" aria-hidden="true"></div>
        <div class="bd-hud">
          <button class="bd-hud-btn" type="button" data-bd-pause aria-label="Pause">Ⅱ</button>
          <div class="bd-hud-center"><span>${esc(level.code)}</span><small>${esc(level.title_en)}</small></div>
          <div class="bd-score"><span>SCORE</span><strong data-bd-score>0</strong></div>
        </div>
        <div class="bd-lives" aria-label="Lives" data-bd-lives></div>
        <div class="bd-stage" data-bd-stage aria-live="off"></div>
        <div class="bd-toast" data-bd-toast aria-live="polite"></div>
        <div class="bd-controls">
          <div class="bd-answer-display"><span data-bd-answer></span><button type="button" data-bd-clear aria-label="Clear answer">×</button></div>
          <div class="bd-keypad" aria-label="Number keypad">
            ${[7,8,9,4,5,6,1,2,3].map(n => `<button type="button" data-bd-key="${n}">${n}</button>`).join('')}
            <button type="button" data-bd-key="0">0</button>
            <button class="bd-enter" type="button" data-bd-enter>ENTER</button>
          </div>
        </div>
        <div class="bd-overlay" data-bd-ready>
          <div class="bd-overlay-card">
            <div class="bd-ready-brain" aria-hidden="true">${brainSvg('ready-brain')}</div>
            <span class="code-pill">${esc(level.code)}</span>
            <h1>Ready?</h1>
            <p>${esc(level.title_en)}</p><p class="thai">${esc(level.title_th)}</p>
            <button class="bd-main-btn" type="button" data-bd-start>Start · เริ่ม</button>
            <button class="bd-text-btn" type="button" data-bd-exit>Change level · เปลี่ยน Level</button>
          </div>
        </div>
        <div class="bd-overlay hidden" data-bd-pause-overlay>
          <div class="bd-overlay-card">
            <h1>Paused</h1><p class="thai">หยุดชั่วคราว</p>
            <button class="bd-main-btn" type="button" data-bd-resume>Resume · เล่นต่อ</button>
            <button class="bd-text-btn" type="button" data-bd-exit>Exit round · ออกจากเกม</button>
          </div>
        </div>
        <div class="bd-overlay hidden" data-bd-result></div>
      </section>`;

    const stage = view.querySelector('[data-bd-stage]');
    runtime = createRuntime(view, stage, level, buildPool(level), state, opts);
    renderLives(runtime);
    bindGameControls(runtime);
  }

  function createRuntime(view, stage, level, pool, savedState, opts) {
    return {
      view, stage, level, pool, savedState, opts,
      running: false, paused: true, ended: false,
      score: 0, lives: 3, cleared: 0, missed: 0,
      submissions: 0, correctSubmissions: 0, streak: 0, bestStreak: 0,
      answer: '', drops: [], usedQueue: [],
      nextDropId: 1, lastFrame: 0, spawnClock: 0, elapsed: 0,
      wrongBurst: 0, wrongBurstAt: 0, inputLockedUntil: 0,
      animationId: 0, resizeObserver: null,
      stageWidth: 0, stageHeight: 0,
      startedAt: 0, visibilityHandler: null
    };
  }

  function bindGameControls(g) {
    const v = g.view;
    v.querySelector('[data-bd-start]').addEventListener('click', () => startRound(g));
    v.querySelectorAll('[data-bd-exit]').forEach(btn => btn.addEventListener('click', () => g.opts.navigate('#/braindrops')));
    v.querySelector('[data-bd-pause]').addEventListener('click', () => pauseRound(g));
    v.querySelector('[data-bd-resume]').addEventListener('click', () => resumeRound(g));
    v.querySelectorAll('[data-bd-key]').forEach(btn => btn.addEventListener('click', () => appendDigit(g, btn.dataset.bdKey)));
    v.querySelector('[data-bd-clear]').addEventListener('click', () => clearAnswer(g));
    v.querySelector('[data-bd-enter]').addEventListener('click', () => submitAnswer(g));
    window.addEventListener('keydown', keyboardHandler);
    g.resizeObserver = new ResizeObserver(() => measureStage(g));
    g.resizeObserver.observe(g.stage);
    g.visibilityHandler = () => { if (document.visibilityState === 'hidden' && g.running && !g.paused && !g.ended) pauseRound(g); };
    document.addEventListener('visibilitychange', g.visibilityHandler);
    measureStage(g);
  }

  function keyboardHandler(ev) {
    const g = runtime;
    if (!g || g.ended || g.paused) return;
    if (/^[0-9]$/.test(ev.key)) { appendDigit(g, ev.key); ev.preventDefault(); }
    else if (ev.key === 'Enter') { submitAnswer(g); ev.preventDefault(); }
    else if (ev.key === 'Backspace' || ev.key === 'Escape') { clearAnswer(g); ev.preventDefault(); }
  }

  function measureStage(g) {
    const r = g.stage.getBoundingClientRect();
    g.stageWidth = r.width;
    g.stageHeight = r.height;
  }

  function startRound(g) {
    g.view.querySelector('[data-bd-ready]').classList.add('hidden');
    g.running = true;
    g.paused = false;
    g.startedAt = performance.now();
    g.lastFrame = performance.now();
    g.spawnClock = 9999;
    g.animationId = requestAnimationFrame(frame);
  }

  function pauseRound(g) {
    if (!g.running || g.paused || g.ended) return;
    g.paused = true;
    g.view.querySelector('[data-bd-pause-overlay]').classList.remove('hidden');
  }

  function resumeRound(g) {
    if (!g.running || !g.paused || g.ended) return;
    g.paused = false;
    g.lastFrame = performance.now();
    g.view.querySelector('[data-bd-pause-overlay]').classList.add('hidden');
  }

  function frame(now) {
    const g = runtime;
    if (!g || g.ended) return;
    const dt = Math.min(40, Math.max(0, now - g.lastFrame));
    g.lastFrame = now;
    if (!g.paused) {
      g.elapsed += dt;
      g.spawnClock += dt;
      updateDrops(g, dt);
      const spawnEvery = Math.max(1550, 3300 - g.cleared * 26 - Math.floor(g.elapsed / 30000) * 130);
      const maxDrops = g.elapsed < 18000 ? 2 : g.elapsed < 55000 ? 3 : 4;
      if (g.spawnClock >= spawnEvery && g.drops.length < maxDrops) {
        spawnDrop(g);
        g.spawnClock = 0;
      }
    }
    g.animationId = requestAnimationFrame(frame);
  }

  function speedFor(g) {
    const base = Math.max(42, g.stageHeight * 0.075);
    const ramp = Math.min(1.2, (g.cleared * 0.018) + (g.elapsed / 180000));
    return base * (1 + ramp);
  }

  function chooseQuestion(g) {
    if (!g.pool.length) return null;
    // About one quarter of spawns intentionally reuse a visible answer when the source pool supports it.
    if (g.drops.length && Math.random() < 0.26) {
      const target = g.drops[Math.floor(Math.random() * g.drops.length)].q.answer;
      const matches = g.pool.filter(q => q.answer === target && !g.drops.some(d => d.q.id === q.id));
      if (matches.length) return matches[Math.floor(Math.random() * matches.length)];
    }
    if (!g.usedQueue.length) g.usedQueue = shuffle(g.pool.slice());
    let q = g.usedQueue.pop();
    let guard = 0;
    while (q && g.drops.some(d => d.q.id === q.id) && guard < 8) { g.usedQueue.unshift(q); q = g.usedQueue.pop(); guard += 1; }
    return q || g.pool[Math.floor(Math.random() * g.pool.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function spawnDrop(g) {
    measureStage(g);
    const q = chooseQuestion(g);
    if (!q) return;
    const wide = String(q.fallback).length > 13;
    const size = wide ? Math.min(150, Math.max(126, g.stageWidth * .37)) : Math.min(126, Math.max(104, g.stageWidth * .28));
    const laneCount = g.stageWidth < 480 ? 3 : 4;
    const laneWidth = g.stageWidth / laneCount;
    let laneChoices = Array.from({ length: laneCount }, (_, i) => i);
    shuffle(laneChoices);
    let lane = laneChoices.find(l => !g.drops.some(d => d.y < size * 1.2 && d.lane === l));
    if (lane == null) lane = laneChoices[0];
    const x = Math.max(3, Math.min(g.stageWidth - size - 3, lane * laneWidth + (laneWidth - size) / 2));
    const el = document.createElement('div');
    el.className = `brain-drop${wide ? ' wide' : ''}`;
    el.style.width = `${size}px`;
    el.style.height = `${size * .88}px`;
    el.style.transform = `translate3d(${x}px, ${-size}px, 0)`;
    el.innerHTML = `${brainSvg()}<div class="brain-expression">${formatPrompt(q.fallback)}</div>`;
    g.stage.appendChild(el);
    g.drops.push({ id: g.nextDropId++, q, el, x, y: -size, size, lane, speed: speedFor(g) * (0.92 + Math.random() * .16) });
  }

  function formatPrompt(fallback) {
    const s = esc(String(fallback).replaceAll(' ', ''));
    if (s.length <= 9) {
      const m = s.match(/^(\d+)([+−\-×÷])(\d+)=□$/);
      if (m) return `<span class="brain-stacked"><span>${m[1]}</span><span><b>${m[2] === '-' ? '−' : m[2]}</b>${m[3]}</span></span>`;
    }
    const display = s.replaceAll('-', '−');
    if (display.length > 13 && display.includes('=')) {
      const parts = display.split('=');
      return `<span class="brain-multiline">${parts.map((part, i) => `<span>${i ? '=' : ''}${part}</span>`).join('')}</span>`;
    }
    return `<span class="brain-inline">${display}</span>`;
  }

  function updateDrops(g, dt) {
    const floor = g.stageHeight - 6;
    const missed = [];
    for (const d of g.drops) {
      d.y += d.speed * dt / 1000;
      d.el.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
      if (d.y + d.size * .72 >= floor) missed.push(d);
    }
    for (const d of missed) missDrop(g, d);
  }

  function missDrop(g, drop) {
    removeDrop(g, drop, 'miss');
    g.lives -= 1;
    g.missed += 1;
    g.streak = 0;
    renderLives(g);
    toast(g, 'Brain dropped! · หลุด 1 ก้อน', 'bad');
    // A miss eases the current board slightly rather than punishing the learner with more speed.
    g.drops.forEach(d => d.speed *= .9);
    if (g.lives <= 0) endRound(g);
  }

  function removeDrop(g, drop, reason = 'pop') {
    const idx = g.drops.indexOf(drop);
    if (idx >= 0) g.drops.splice(idx, 1);
    if (reason === 'pop') {
      drop.el.classList.add('popped');
      setTimeout(() => drop.el.remove(), 230);
    } else {
      drop.el.classList.add('missed');
      setTimeout(() => drop.el.remove(), 220);
    }
  }

  function appendDigit(g, digit) {
    if (!g.running || g.paused || g.ended || performance.now() < g.inputLockedUntil) return;
    if (g.answer.length >= 3) return;
    if (g.answer === '0') g.answer = '';
    g.answer += String(digit);
    updateAnswer(g);
  }

  function clearAnswer(g) {
    if (!g || g.ended) return;
    g.answer = '';
    updateAnswer(g);
  }

  function updateAnswer(g) {
    const el = g.view.querySelector('[data-bd-answer]');
    if (el) el.textContent = g.answer;
  }

  function submitAnswer(g) {
    if (!g.running || g.paused || g.ended || performance.now() < g.inputLockedUntil || !g.answer) return;
    const value = Number(g.answer);
    g.answer = '';
    updateAnswer(g);
    g.submissions += 1;
    const matches = g.drops.filter(d => d.q.answer === value);
    if (!matches.length) {
      g.streak = 0;
      const now = performance.now();
      g.wrongBurst = now - g.wrongBurstAt < 2200 ? g.wrongBurst + 1 : 1;
      g.wrongBurstAt = now;
      const lockMs = g.wrongBurst >= 3 ? 1200 : 0;
      if (lockMs) {
        g.inputLockedUntil = now + lockMs;
        g.view.querySelector('.bd-controls').classList.add('locked');
        setTimeout(() => g.view.querySelector('.bd-controls')?.classList.remove('locked'), lockMs);
      }
      shakeControls(g);
      toast(g, lockMs ? 'Too many guesses — think first. · คิดก่อนตอบ' : 'No matching brain · ยังไม่มีคำตอบนี้', 'bad');
      return;
    }

    g.correctSubmissions += 1;
    g.wrongBurst = 0;
    g.streak += 1;
    g.bestStreak = Math.max(g.bestStreak, g.streak);
    const multiplier = Math.min(2, 1 + Math.floor(g.streak / 5) * .2);
    const base = matches.length * 500;
    const combo = Math.max(0, matches.length - 1) * 250;
    const gained = Math.round((base + combo) * multiplier);
    g.score += gained;
    g.cleared += matches.length;
    matches.forEach(d => removeDrop(g, d, 'pop'));
    updateScore(g);
    const msg = matches.length > 1 ? `MULTI-POP ×${matches.length}  +${gained.toLocaleString()}` : `+${gained.toLocaleString()}`;
    toast(g, msg, 'good');
    // Correct play gradually accelerates only future/remaining drops, not as an abrupt per-answer jump.
    g.drops.forEach(d => d.speed = Math.max(d.speed, speedFor(g) * .94));
    if (!g.drops.length) g.spawnClock = 9999;
  }

  function shakeControls(g) {
    const el = g.view.querySelector('.bd-answer-display');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function updateScore(g) {
    const el = g.view.querySelector('[data-bd-score]');
    if (el) el.textContent = g.score.toLocaleString();
  }

  function renderLives(g) {
    const el = g.view.querySelector('[data-bd-lives]');
    if (!el) return;
    el.innerHTML = Array.from({ length: 3 }, (_, i) => `<span class="bd-life ${i < g.lives ? 'alive' : ''}" aria-hidden="true">${brainSvg('life-brain')}</span>`).join('');
  }

  function toast(g, text, kind) {
    const el = g.view.querySelector('[data-bd-toast]');
    if (!el) return;
    el.textContent = text;
    el.className = `bd-toast show ${kind || ''}`;
    clearTimeout(g.toastTimer);
    g.toastTimer = setTimeout(() => { if (el) el.className = 'bd-toast'; }, 850);
  }

  function endRound(g) {
    if (g.ended) return;
    g.ended = true;
    g.running = false;
    g.paused = true;
    if (g.animationId) cancelAnimationFrame(g.animationId);
    const accuracy = g.submissions ? Math.round(g.correctSubmissions * 100 / g.submissions) : 0;
    const state = loadState();
    const prev = state.levels[g.level.code] || { plays: 0, bestScore: 0, bestCleared: 0 };
    const isBest = g.score > (prev.bestScore || 0);
    prev.plays = (prev.plays || 0) + 1;
    prev.bestScore = Math.max(prev.bestScore || 0, g.score);
    prev.bestCleared = Math.max(prev.bestCleared || 0, g.cleared);
    prev.lastScore = g.score;
    prev.lastAccuracy = accuracy;
    prev.lastPlayedAt = new Date().toISOString();
    state.levels[g.level.code] = prev;
    state.lastLevel = g.level.code;
    saveState(state);

    const overlay = g.view.querySelector('[data-bd-result]');
    overlay.innerHTML = `
      <div class="bd-overlay-card bd-result-card">
        <span class="code-pill">${esc(g.level.code)}</span>
        <h1>${isBest ? 'New best!' : 'Round complete'}</h1>
        <p class="thai">${isBest ? 'สถิติใหม่!' : 'จบรอบแล้ว'}</p>
        <div class="bd-final-score">${g.score.toLocaleString()}</div>
        <div class="bd-result-grid">
          <div><strong>${g.cleared}</strong><span>Brains solved<br>แก้ได้</span></div>
          <div><strong>${accuracy}%</strong><span>Answer accuracy<br>ความแม่นยำ</span></div>
          <div><strong>${g.bestStreak}</strong><span>Best streak<br>ต่อเนื่องสูงสุด</span></div>
        </div>
        <p class="bd-best-line">Best score · สถิติสูงสุด: <strong>${prev.bestScore.toLocaleString()}</strong></p>
        <button class="bd-main-btn" type="button" data-bd-again>Play again · เล่นอีกครั้ง</button>
        <button class="bd-secondary-btn" type="button" data-bd-practice>Practice ${esc(g.level.code)} · ฝึกแบบปกติ</button>
        <button class="bd-text-btn" type="button" data-bd-change>Change level · เปลี่ยน Level</button>
      </div>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('[data-bd-again]').addEventListener('click', () => renderGame(g.view, g.level, g.opts));
    overlay.querySelector('[data-bd-practice]').addEventListener('click', () => g.opts.navigate(`#/level/${g.level.code}`));
    overlay.querySelector('[data-bd-change]').addEventListener('click', () => g.opts.navigate('#/braindrops'));
  }

  function destroy() {
    if (runtime) {
      if (runtime.animationId) cancelAnimationFrame(runtime.animationId);
      if (runtime.resizeObserver) runtime.resizeObserver.disconnect();
      if (runtime.visibilityHandler) document.removeEventListener('visibilitychange', runtime.visibilityHandler);
      clearTimeout(runtime.toastTimer);
      runtime = null;
    }
    window.removeEventListener('keydown', keyboardHandler);
    document.body.classList.remove('braindrops-active');
  }

  window.InfiniaBraindrops = {
    renderHomeCard,
    renderLanding,
    renderGame,
    destroy
  };
})();
