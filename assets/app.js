(() => {
  'use strict';

  const DATA_URL = './data/math-practice.json';
  const PROGRESS_KEY = 'infinia.math.practice.progress.v1';
  const ACTIVE_KEY = 'infinia.math.practice.active.v1';
  const RESULT_KEY = 'infinia.math.practice.lastResult.v1';
  const PREF_KEY = 'infinia.math.practice.preferences.v1';
  const TIMER_COOKIE = 'infinia_math_timer_v1';

  let data = null;
  let levelMap = new Map();
  let progress = loadJSON(PROGRESS_KEY, { sets: {} });
  let prefs = loadJSON(PREF_KEY, { lang: 'both', track: 'addition-subtraction' });
  let timer = null;
  let renderToken = 0;

  const view = document.getElementById('view');
  const versionEl = document.getElementById('app-version');
  const homeBtn = document.getElementById('brand-home');

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function appBasePath() {
    const p = location.pathname || '/';
    if (p.endsWith('/')) return p;
    const i = p.lastIndexOf('/');
    return i >= 0 ? p.slice(0, i + 1) : '/';
  }

  function setTimerCookie(summary) {
    try {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      const encoded = encodeURIComponent(JSON.stringify(summary));
      document.cookie = `${TIMER_COOKIE}=${encoded}; Max-Age=2592000; Path=${appBasePath()}; SameSite=Lax${secure}`;
    } catch (_) {}
  }

  function getTimerCookie() {
    try {
      const prefix = `${TIMER_COOKIE}=`;
      const item = document.cookie.split('; ').find(x => x.startsWith(prefix));
      if (!item) return null;
      return JSON.parse(decodeURIComponent(item.slice(prefix.length)));
    } catch (_) {
      return null;
    }
  }

  function clearTimerCookie() {
    try {
      document.cookie = `${TIMER_COOKIE}=; Max-Age=0; Path=${appBasePath()}; SameSite=Lax`;
    } catch (_) {}
  }

  function setLanguage(lang) {
    if (!['en', 'both', 'th'].includes(lang)) lang = 'both';
    prefs.lang = lang;
    saveJSON(PREF_KEY, prefs);
    document.body.classList.remove('lang-en', 'lang-th', 'lang-both');
    document.body.classList.add(`lang-${lang}`);
    document.documentElement.lang = lang === 'th' ? 'th' : 'en';
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
      btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
    });
  }

  function setTrack(track) {
    if (!['addition-subtraction', 'multiplication'].includes(track)) return;
    prefs.track = track;
    saveJSON(PREF_KEY, prefs);
  }

  function bilingual(en, th, extraClass = '') {
    return `<span class="bi-en ${extraClass}">${esc(en)}</span><span class="bi-th th ${extraClass}">${esc(th)}</span>`;
  }

  function bilingualBlock(en, th, tag = 'p') {
    return `<${tag} class="bi-en">${esc(en)}</${tag}><${tag} class="bi-th thai">${esc(th)}</${tag}>`;
  }

  function formatTime(ms) {
    ms = Math.max(0, Number(ms) || 0);
    const total = Math.floor(ms / 1000);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat(prefs.lang === 'th' ? 'th-TH' : 'en-GB', {
        day: 'numeric', month: 'short'
      }).format(new Date(iso));
    } catch (_) {
      return '';
    }
  }

  function currentElapsedMs() {
    if (!timer) return 0;
    return timer.elapsedMs + (timer.running ? Date.now() - timer.startedAt : 0);
  }

  function persistActiveTimer() {
    if (!timer || !timer.session) return;
    const elapsed = currentElapsedMs();
    timer.session.elapsedMs = elapsed;
    timer.elapsedMs = elapsed;
    timer.startedAt = Date.now();
    saveJSON(ACTIVE_KEY, timer.session);
    setTimerCookie({
      setKey: timer.session.setKey,
      elapsedMs: elapsed,
      currentIndex: timer.session.currentIndex,
      updatedAt: Date.now()
    });
  }

  function stopTimer({ persist = true } = {}) {
    if (!timer) return;
    if (persist) persistActiveTimer();
    if (timer.interval) clearInterval(timer.interval);
    timer.running = false;
    timer = null;
  }

  function startTimer(session) {
    stopTimer({ persist: true });
    const cookie = getTimerCookie();
    if ((!session.elapsedMs || session.elapsedMs < 1) && cookie && cookie.setKey === session.setKey) {
      session.elapsedMs = Math.max(0, Number(cookie.elapsedMs) || 0);
      if (Number.isInteger(cookie.currentIndex) && cookie.currentIndex >= 0) {
        session.currentIndex = Math.min(cookie.currentIndex, session.questionIds.length - 1);
      }
    }
    timer = {
      session,
      elapsedMs: Math.max(0, Number(session.elapsedMs) || 0),
      startedAt: Date.now(),
      running: true,
      interval: null,
      ticks: 0
    };
    setTimerCookie({
      setKey: session.setKey,
      elapsedMs: timer.elapsedMs,
      currentIndex: session.currentIndex,
      updatedAt: Date.now()
    });
    const update = () => {
      if (!timer) return;
      timer.ticks += 1;
      const el = document.getElementById('timer-value');
      if (el) el.textContent = formatTime(currentElapsedMs());
      if (timer.ticks % 5 === 0) persistActiveTimer();
    };
    timer.interval = setInterval(update, 1000);
    update();
  }

  function renderMath(container = document) {
    container.querySelectorAll('[data-latex]').forEach(el => {
      const latex = el.dataset.latex || '';
      const fallback = el.dataset.fallback || latex;
      if (window.katex && typeof window.katex.render === 'function') {
        try {
          window.katex.render(latex, el, {
            throwOnError: false,
            displayMode: false,
            output: 'htmlAndMathml',
            strict: 'ignore'
          });
          el.classList.remove('math-fallback');
          el.dataset.rendered = 'katex';
          return;
        } catch (_) {}
      }
      el.textContent = fallback;
      el.classList.add('math-fallback');
      el.dataset.rendered = 'fallback';
    });
  }

  function navigate(hash) {
    const target = hash.startsWith('#') ? hash : `#${hash}`;
    if (location.hash === target) route();
    else location.hash = target;
  }

  function parseRoute() {
    const raw = (location.hash || '#/').slice(1);
    const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'level' && parts[1]) return { name: 'level', levelCode: parts[1].toUpperCase() };
    if (parts[0] === 'practice' && parts[1] && parts[2]) return { name: 'practice', levelCode: parts[1].toUpperCase(), setNumber: Number(parts[2]) };
    if (parts[0] === 'result' && parts[1] && parts[2]) return { name: 'result', levelCode: parts[1].toUpperCase(), setNumber: Number(parts[2]) };
    return { name: 'home' };
  }

  function getLevel(code) {
    return levelMap.get(String(code).toUpperCase());
  }

  function getSet(level, setNumber) {
    return level?.sets?.find(s => s.set_number === Number(setNumber));
  }

  function setProgressKey(levelCode, setNumber) {
    return `${levelCode}-S${String(setNumber).padStart(2, '0')}`;
  }

  function activeSessionMatches(levelCode, setNumber) {
    const s = loadJSON(ACTIVE_KEY, null);
    return !!s && s.levelCode === levelCode && Number(s.setNumber) === Number(setNumber) && !s.completed;
  }

  function createSession(level, set, questionIds = null, mode = 'full', preserveTimerCookie = false) {
    const ids = questionIds?.length ? questionIds : set.questions.map(q => q.id);
    const session = {
      version: 1,
      setKey: `${set.code}:${mode}`,
      levelCode: level.code,
      setNumber: set.set_number,
      mode,
      questionIds: ids,
      currentIndex: 0,
      responses: {},
      elapsedMs: 0,
      createdAt: new Date().toISOString(),
      completed: false
    };
    saveJSON(ACTIVE_KEY, session);
    if (!preserveTimerCookie) clearTimerCookie();
    return session;
  }

  function loadOrCreateSession(level, set) {
    const existing = loadJSON(ACTIVE_KEY, null);
    if (existing && !existing.completed && existing.levelCode === level.code && Number(existing.setNumber) === set.set_number) {
      existing.questionIds = Array.isArray(existing.questionIds) && existing.questionIds.length ? existing.questionIds : set.questions.map(q => q.id);
      existing.responses = existing.responses || {};
      existing.currentIndex = Math.max(0, Math.min(Number(existing.currentIndex) || 0, existing.questionIds.length - 1));
      return existing;
    }
    const cookie = getTimerCookie();
    const expectedKey = `${set.code}:full`;
    const canRestoreTimer = cookie && cookie.setKey === expectedKey;
    const fresh = createSession(level, set, null, 'full', !!canRestoreTimer);
    if (canRestoreTimer) {
      fresh.elapsedMs = Math.max(0, Number(cookie.elapsedMs) || 0);
      if (Number.isInteger(cookie.currentIndex) && cookie.currentIndex >= 0) {
        fresh.currentIndex = Math.min(cookie.currentIndex, fresh.questionIds.length - 1);
      }
      saveJSON(ACTIVE_KEY, fresh);
    }
    return fresh;
  }

  function questionById(set, id) {
    return set.questions.find(q => q.id === id);
  }

  function firstAttemptCorrect(response) {
    return !!response?.firstCorrect;
  }

  function resolved(response) {
    return !!response?.resolved;
  }

  function sessionStats(session) {
    const total = session.questionIds.length;
    const correct = session.questionIds.reduce((n, id) => n + (firstAttemptCorrect(session.responses[id]) ? 1 : 0), 0);
    const resolvedCount = session.questionIds.reduce((n, id) => n + (resolved(session.responses[id]) ? 1 : 0), 0);
    return { total, correct, resolvedCount, pct: total ? Math.round(correct * 100 / total) : 0 };
  }

  function recordProgress(result) {
    if (result.mode !== 'full') return;
    const key = setProgressKey(result.levelCode, result.setNumber);
    const prev = progress.sets[key] || {
      attempts: 0,
      bestCorrect: 0,
      bestPct: 0,
      bestTimeAtBestScoreMs: null,
      bestPerfectMs: null
    };
    prev.attempts += 1;
    prev.completed = true;
    prev.lastCompletedAt = result.completedAt;
    prev.lastCorrect = result.correct;
    prev.lastTotal = result.total;
    prev.lastElapsedMs = result.elapsedMs;
    prev.lastIncorrectQuestionIds = result.incorrectQuestionIds;

    if (result.correct > (prev.bestCorrect ?? -1)) {
      prev.bestCorrect = result.correct;
      prev.bestPct = result.pct;
      prev.bestTimeAtBestScoreMs = result.elapsedMs;
    } else if (result.correct === prev.bestCorrect && (prev.bestTimeAtBestScoreMs == null || result.elapsedMs < prev.bestTimeAtBestScoreMs)) {
      prev.bestTimeAtBestScoreMs = result.elapsedMs;
    }
    if (result.correct === result.total) {
      if (prev.bestPerfectMs == null || result.elapsedMs < prev.bestPerfectMs) prev.bestPerfectMs = result.elapsedMs;
    }
    progress.sets[key] = prev;
    saveJSON(PROGRESS_KEY, progress);
  }

  function completeSession(level, set, session) {
    const elapsed = currentElapsedMs() || session.elapsedMs || 0;
    stopTimer({ persist: false });
    const stats = sessionStats(session);
    const incorrectQuestionIds = session.questionIds.filter(id => !firstAttemptCorrect(session.responses[id]));
    const result = {
      version: 1,
      levelCode: level.code,
      setNumber: set.set_number,
      setCode: set.code,
      mode: session.mode || 'full',
      questionIds: session.questionIds,
      responses: session.responses,
      elapsedMs: elapsed,
      correct: stats.correct,
      total: stats.total,
      pct: stats.pct,
      incorrectQuestionIds,
      completedAt: new Date().toISOString()
    };
    recordProgress(result);
    saveJSON(RESULT_KEY, result);
    try { localStorage.removeItem(ACTIVE_KEY); } catch (_) {}
    clearTimerCookie();
    navigate(`#/result/${level.code}/${set.set_number}`);
  }

  function homeStats() {
    const sets = Object.values(progress.sets || {});
    const completed = sets.filter(x => x.completed).length;
    const perfect = sets.filter(x => x.completed && x.bestPerfectMs != null).length;
    return { completed, perfect };
  }

  function renderHome() {
    const stats = homeStats();
    const track = prefs.track || 'addition-subtraction';
    const strand = data.strands.find(s => s.id === track) || data.strands[0];
    const levels = strand.level_codes.map(getLevel).filter(Boolean);
    const totalSets = data.levels.reduce((n, l) => n + l.set_count, 0);

    view.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Daily fluency · แบบฝึกความคล่องรายวัน</div>
        <h1>Infinia Math Practice</h1>
        <p class="bi-en">Short, focused arithmetic practice built from the Infinia A1–A13 and M1–M9 fluency worksheets. Work accurately first; speed follows with practice.</p>
        <p class="bi-th hero-th">แบบฝึกคณิตศาสตร์สั้น ๆ จากชุด Infinia A1–A13 และ M1–M9 เน้นทำให้ถูกต้องก่อน แล้วค่อยพัฒนาความเร็วด้วยการฝึกสม่ำเสมอ</p>
      </section>
      <section class="home-meta" aria-label="Practice summary">
        <div class="stat-card"><span class="stat-value">22</span><span class="stat-label">Levels · ระดับ</span></div>
        <div class="stat-card"><span class="stat-value">${totalSets}</span><span class="stat-label">Practice sets · ชุด</span></div>
        <div class="stat-card"><span class="stat-value">${stats.completed}</span><span class="stat-label">Completed · ทำแล้ว</span></div>
      </section>
      <div class="track-tabs" role="tablist" aria-label="Practice strand">
        <button type="button" data-track="addition-subtraction" class="${track === 'addition-subtraction' ? 'active' : ''}" role="tab" aria-selected="${track === 'addition-subtraction'}">
          + − Addition & Subtraction<small>การบวกและการลบ</small>
        </button>
        <button type="button" data-track="multiplication" class="${track === 'multiplication' ? 'active' : ''}" role="tab" aria-selected="${track === 'multiplication'}">
          × ÷ Times Tables<small>สูตรคูณและครอบครัวข้อเท็จจริง</small>
        </button>
      </div>
      <div class="section-row">
        <div><h2>${esc(strand.title_en)}</h2><p>${esc(strand.title_th)}</p></div>
        <div class="mini-progress">${stats.perfect ? `${stats.perfect} perfect` : ''}</div>
      </div>
      <section class="level-grid">
        ${levels.map(level => renderLevelCard(level)).join('')}
      </section>
      <section class="home-print">
        <div>
          <strong>Prefer paper? · ต้องการแบบกระดาษ?</strong>
          <span>Download the full printable student workbook.</span>
        </div>
        <a class="secondary-btn" href="./downloads/Student_Workbook_All_Levels.pdf" target="_blank" rel="noopener">Open workbook PDF</a>
      </section>
    `;

    view.querySelectorAll('[data-track]').forEach(btn => btn.addEventListener('click', () => {
      setTrack(btn.dataset.track);
      renderHome();
    }));
    view.querySelectorAll('[data-level]').forEach(btn => btn.addEventListener('click', () => navigate(`#/level/${btn.dataset.level}`)));
  }

  function renderLevelCard(level) {
    const setStates = level.sets.map(s => progress.sets[setProgressKey(level.code, s.set_number)]).filter(Boolean);
    const done = setStates.filter(x => x.completed).length;
    const perfect = setStates.filter(x => x.bestPerfectMs != null).length;
    return `
      <button class="level-card" type="button" data-level="${esc(level.code)}" data-strand="${esc(level.strand)}">
        <span class="level-code">${esc(level.code)}</span>
        <span class="level-title">
          <strong class="bi-en">${esc(level.title_en)}</strong>
          <span class="bi-th th">${esc(level.title_th)}</span>
          <span class="level-meta">${level.set_count} sets · ${level.questions_per_set} questions/set · 3–5 min</span>
        </span>
        <span class="level-progress"><strong>${done}/${level.set_count}</strong><span>${perfect ? `${perfect} perfect` : 'completed'}</span></span>
      </button>
    `;
  }

  function renderLevel(level) {
    const nextIncomplete = level.sets.find(s => !progress.sets[setProgressKey(level.code, s.set_number)]?.completed) || level.sets[0];
    view.innerHTML = `
      <div class="page-top">
        <button class="icon-btn" type="button" data-back aria-label="Back to levels">←</button>
        <div class="page-heading">
          <span class="code-pill">${esc(level.code)}</span>
          <h1 class="bi-en">${esc(level.title_en)}</h1>
          <div class="bi-th th">${esc(level.title_th)}</div>
        </div>
      </div>
      <section class="concept-card">
        <h3>Remember · ทบทวนแนวคิด</h3>
        ${bilingualBlock(level.note_en, level.note_th)}
        <div class="example-line">
          <strong>Example · ตัวอย่าง</strong>
          <span class="math-display" data-latex="${esc(level.example_latex)}" data-fallback="${esc(level.example_fallback)}"></span>
        </div>
      </section>
      <section class="tip-card">
        <h3>How to think · วิธีคิด</h3>
        ${bilingualBlock(level.tip_en, level.tip_th)}
      </section>
      <div class="level-actions">
        <button class="primary-btn" type="button" data-start-next>Start ${esc(nextIncomplete.code)}</button>
        <a class="secondary-btn" href="${esc(level.print_pdf)}" target="_blank" rel="noopener">Printable ${esc(level.code)} PDF</a>
      </div>
      <div class="section-row"><div><h2>Practice sets</h2><p>ชุดฝึก · Each set is designed for about 3–5 minutes.</p></div></div>
      <section class="set-grid">
        ${level.sets.map(set => renderSetCard(level, set)).join('')}
      </section>
    `;
    renderMath(view);
    view.querySelector('[data-back]').addEventListener('click', () => navigate('#/'));
    view.querySelector('[data-start-next]').addEventListener('click', () => navigate(`#/practice/${level.code}/${nextIncomplete.set_number}`));
    view.querySelectorAll('[data-set]').forEach(btn => btn.addEventListener('click', () => navigate(`#/practice/${level.code}/${btn.dataset.set}`)));
  }

  function renderSetCard(level, set) {
    const key = setProgressKey(level.code, set.set_number);
    const p = progress.sets[key];
    const resumed = activeSessionMatches(level.code, set.set_number);
    let best = 'Not attempted · ยังไม่ได้ทำ';
    if (p?.completed) {
      if (p.bestPerfectMs != null) best = `Perfect · ${formatTime(p.bestPerfectMs)}`;
      else best = `Best ${p.bestCorrect}/${p.lastTotal || set.question_count}`;
    }
    return `
      <button type="button" class="set-card" data-set="${set.set_number}">
        <span class="set-card-top"><strong>Set ${String(set.set_number).padStart(2, '0')}</strong><span class="status-dot ${p?.completed ? 'done' : ''}" aria-hidden="true"></span></span>
        <small>${set.question_count} questions · 3–5 min</small>
        <span class="set-best">${resumed ? 'Resume · ทำต่อ' : esc(best)}</span>
      </button>
    `;
  }

  function renderPractice(level, set) {
    const session = loadOrCreateSession(level, set);
    const questionId = session.questionIds[session.currentIndex];
    const q = questionById(set, questionId);
    if (!q) {
      createSession(level, set);
      return renderPractice(level, set);
    }
    const stats = sessionStats(session);
    const response = session.responses[q.id] || null;
    const pct = Math.round((session.currentIndex + (resolved(response) ? 1 : 0)) * 100 / session.questionIds.length);
    const isLast = session.currentIndex === session.questionIds.length - 1;

    view.innerHTML = `
      <section class="practice-shell">
        <div class="practice-top">
          <div class="practice-top-row">
            <button class="icon-btn compact" type="button" data-exit aria-label="Leave practice">←</button>
            <div class="practice-title"><strong>${esc(level.code)} · Set ${String(set.set_number).padStart(2, '0')}</strong><small>${bilingual(level.title_en, level.title_th)}</small></div>
            <div class="timer" aria-label="Elapsed time"><span aria-hidden="true">⏱</span> <span id="timer-value">${formatTime(session.elapsedMs)}</span></div>
          </div>
          <div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>

        <details class="practice-concept">
          <summary>Need a reminder? · ต้องการทบทวน? <span>⌄</span></summary>
          <div class="practice-concept-body">
            ${bilingualBlock(level.note_en, level.note_th)}
            <div class="example-line"><strong>Example · ตัวอย่าง</strong><span class="math-display" data-latex="${esc(level.example_latex)}" data-fallback="${esc(level.example_fallback)}"></span></div>
          </div>
        </details>

        <article class="question-card">
          <div class="question-kicker"><span>${session.mode === 'retry' ? 'Retry · แก้ข้อที่พลาด' : 'Practice · แบบฝึก'}</span><span>${session.currentIndex + 1} / ${session.questionIds.length}</span></div>
          <div class="question-math math-display" data-latex="${esc(q.latex)}" data-fallback="${esc(q.fallback)}"></div>
          <form class="answer-row" id="answer-form" autocomplete="off">
            <label for="answer-input">Your answer · คำตอบ</label>
            <input class="answer-input" id="answer-input" name="answer" inputmode="numeric" pattern="-?[0-9]*" enterkeyhint="done" aria-describedby="feedback" ${resolved(response) ? 'disabled' : ''} value="${response?.lastValue != null ? esc(response.lastValue) : ''}">
          </form>
          <div id="feedback" class="feedback ${response ? feedbackClass(response) : ''}" role="status">${response ? feedbackText(response, q) : ''}</div>
          <div class="question-actions">
            <button class="primary-btn" type="submit" form="answer-form" id="check-btn" ${resolved(response) ? 'disabled' : ''}>${response?.attempts === 1 ? 'Try again · ลองอีกครั้ง' : 'Check answer · ตรวจคำตอบ'}</button>
            <button class="secondary-btn" type="button" data-next ${resolved(response) ? '' : 'disabled'}>${isLast ? 'Finish · เสร็จสิ้น' : 'Next · ข้อต่อไป →'}</button>
          </div>
          <div class="secondary-actions">
            <button type="button" data-hint>Hint · คำใบ้</button>
            ${response?.attempts === 1 && !response.resolved ? '<button type="button" data-show-answer>Show answer · ดูคำตอบ</button>' : ''}
          </div>
        </article>
        <div class="practice-nav">
          <button class="ghost-btn" type="button" data-prev ${session.currentIndex === 0 ? 'disabled' : ''}>← Previous</button>
          <button class="ghost-btn" type="button" data-jump-next ${isLast ? 'disabled' : ''}>Next question →</button>
        </div>
        <p class="timer-note">Timer is saved on this device and resumes after refresh. · เวลาจะถูกบันทึกในอุปกรณ์นี้และทำต่อได้หลังรีเฟรช</p>
      </section>
    `;
    renderMath(view);
    startTimer(session);
    const input = document.getElementById('answer-input');
    if (input && !input.disabled) setTimeout(() => input.focus({ preventScroll: true }), 50);

    document.querySelector('[data-exit]').addEventListener('click', () => {
      persistActiveTimer();
      navigate(`#/level/${level.code}`);
    });
    document.getElementById('answer-form').addEventListener('submit', ev => {
      ev.preventDefault();
      submitAnswer(level, set, session, q);
    });
    document.querySelector('[data-next]').addEventListener('click', () => advance(level, set, session));
    document.querySelector('[data-prev]').addEventListener('click', () => {
      if (session.currentIndex > 0) {
        persistActiveTimer();
        session.currentIndex -= 1;
        saveJSON(ACTIVE_KEY, session);
        renderPractice(level, set);
      }
    });
    document.querySelector('[data-jump-next]').addEventListener('click', () => {
      if (session.currentIndex < session.questionIds.length - 1) {
        persistActiveTimer();
        session.currentIndex += 1;
        saveJSON(ACTIVE_KEY, session);
        renderPractice(level, set);
      }
    });
    document.querySelector('[data-hint]').addEventListener('click', () => showHint(level));
    const show = document.querySelector('[data-show-answer]');
    if (show) show.addEventListener('click', () => revealAnswer(level, set, session, q));
  }

  function feedbackClass(r) {
    if (r.resolved && r.finalCorrect) return 'good';
    if (r.resolved && !r.finalCorrect) return 'bad';
    return 'bad';
  }

  function feedbackText(r, q) {
    if (r.resolved && r.finalCorrect && r.firstCorrect) return '✓ Correct! · ถูกต้อง!';
    if (r.resolved && r.finalCorrect) return `✓ Correct now. Keep this fact in mind. · ตอนนี้ถูกแล้ว จำข้อนี้ไว้ให้แม่น`;
    if (r.resolved && !r.finalCorrect) return `Answer: ${esc(q.answer)} · คำตอบ: ${esc(q.answer)}`;
    return 'Not yet. Check the operation and try once more. · ยังไม่ถูก ลองดูเครื่องหมายและคิดอีกครั้ง';
  }

  function submitAnswer(level, set, session, q) {
    const input = document.getElementById('answer-input');
    if (!input || input.disabled) return;
    const raw = input.value.trim();
    if (!/^-?\d+$/.test(raw)) {
      const fb = document.getElementById('feedback');
      fb.className = 'feedback hint';
      fb.textContent = 'Enter a number first. · กรุณาใส่ตัวเลขก่อน';
      input.focus();
      return;
    }
    const value = Number(raw);
    const correct = value === Number(q.answer);
    const prev = session.responses[q.id] || { attempts: 0, firstCorrect: false, resolved: false };
    prev.attempts += 1;
    prev.lastValue = value;
    if (prev.attempts === 1) prev.firstCorrect = correct;
    if (correct) {
      prev.finalCorrect = true;
      prev.resolved = true;
    } else if (prev.attempts >= 2) {
      prev.finalCorrect = false;
      prev.resolved = true;
    } else {
      prev.finalCorrect = false;
      prev.resolved = false;
    }
    session.responses[q.id] = prev;
    persistActiveTimer();
    saveJSON(ACTIVE_KEY, session);
    renderPractice(level, set);
  }

  function revealAnswer(level, set, session, q) {
    const prev = session.responses[q.id] || { attempts: 1, firstCorrect: false };
    prev.attempts = Math.max(1, prev.attempts || 1);
    prev.finalCorrect = false;
    prev.resolved = true;
    session.responses[q.id] = prev;
    persistActiveTimer();
    saveJSON(ACTIVE_KEY, session);
    renderPractice(level, set);
  }

  function showHint(level) {
    const fb = document.getElementById('feedback');
    if (!fb) return;
    fb.className = 'feedback hint';
    if (prefs.lang === 'th') fb.textContent = level.tip_th;
    else if (prefs.lang === 'en') fb.textContent = level.tip_en;
    else fb.textContent = `${level.tip_en} / ${level.tip_th}`;
  }

  function advance(level, set, session) {
    const id = session.questionIds[session.currentIndex];
    if (!resolved(session.responses[id])) return;
    persistActiveTimer();
    if (session.currentIndex >= session.questionIds.length - 1) {
      completeSession(level, set, session);
      return;
    }
    session.currentIndex += 1;
    saveJSON(ACTIVE_KEY, session);
    renderPractice(level, set);
  }

  function renderResult(level, set) {
    const result = loadJSON(RESULT_KEY, null);
    if (!result || result.levelCode !== level.code || Number(result.setNumber) !== set.set_number) {
      view.innerHTML = `<div class="empty-state"><h2>No saved result for this set.</h2><p>ไม่มีผลการทำชุดนี้ที่บันทึกไว้</p><button class="primary-btn" type="button" data-go-level>Back to ${esc(level.code)}</button></div>`;
      view.querySelector('[data-go-level]').addEventListener('click', () => navigate(`#/level/${level.code}`));
      return;
    }
    const perfect = result.correct === result.total;
    const incorrect = result.incorrectQuestionIds.map(id => questionById(set, id)).filter(Boolean);
    const p = progress.sets[setProgressKey(level.code, set.set_number)];
    const heading = result.mode === 'retry' ? 'Review complete' : perfect ? 'Perfect accuracy!' : 'Set complete';
    const headingTh = result.mode === 'retry' ? 'ทบทวนเสร็จแล้ว' : perfect ? 'ถูกต้องครบทุกข้อ!' : 'ทำแบบฝึกเสร็จแล้ว';

    view.innerHTML = `
      <section class="result-card">
        <span class="code-pill">${esc(level.code)} · ${esc(set.code)}</span>
        <h1 class="bi-en">${heading}</h1>
        <h1 class="bi-th th">${headingTh}</h1>
        <p class="subtitle bi-en">Accuracy comes first. Use your time as a personal benchmark, not a race against other students.</p>
        <p class="subtitle bi-th">ความถูกต้องมาก่อน ใช้เวลาเป็นสถิติของตนเอง ไม่ใช่การแข่งขันกับเพื่อน</p>
        <div class="result-score">
          <div class="result-metric"><strong>${result.correct}/${result.total}</strong><small>First-try score · คะแนนครั้งแรก</small></div>
          <div class="result-metric"><strong>${result.pct}%</strong><small>Accuracy · ความถูกต้อง</small></div>
          <div class="result-metric"><strong>${formatTime(result.elapsedMs)}</strong><small>Time · เวลา</small></div>
        </div>
        ${p?.bestPerfectMs != null && result.mode === 'full' ? `<p class="personal-best">Best perfect time · เวลาที่ดีที่สุดเมื่อถูกทุกข้อ: <strong>${formatTime(p.bestPerfectMs)}</strong></p>` : ''}
        ${incorrect.length ? `
          <div class="section-row"><div><h2>Review these facts</h2><p>ข้อที่ควรทบทวนจากคำตอบครั้งแรก</p></div></div>
          <div class="review-list">
            ${incorrect.map(q => `<div class="review-item"><span class="math-display" data-latex="${esc(q.latex)}" data-fallback="${esc(q.fallback)}"></span><strong>${esc(q.answer)}</strong></div>`).join('')}
          </div>
        ` : `<div class="perfect-note">✓ Every answer was correct on the first try. · ตอบถูกทุกข้อในครั้งแรก</div>`}
        <div class="result-actions">
          ${incorrect.length ? '<button class="primary-btn" type="button" data-retry>Retry incorrect · แก้ข้อที่พลาด</button>' : '<button class="primary-btn" type="button" data-again>Practice this set again · ทำชุดนี้อีกครั้ง</button>'}
          <button class="secondary-btn" type="button" data-level>Back to level · กลับระดับ</button>
          <button class="ghost-btn" type="button" data-home>All levels · ทุกระดับ</button>
          ${incorrect.length ? '<button class="ghost-btn" type="button" data-again>Restart full set · เริ่มชุดใหม่</button>' : ''}
        </div>
      </section>
    `;
    renderMath(view);
    view.querySelector('[data-level]').addEventListener('click', () => navigate(`#/level/${level.code}`));
    view.querySelector('[data-home]').addEventListener('click', () => navigate('#/'));
    view.querySelectorAll('[data-again]').forEach(btn => btn.addEventListener('click', () => {
      createSession(level, set);
      navigate(`#/practice/${level.code}/${set.set_number}`);
    }));
    const retry = view.querySelector('[data-retry]');
    if (retry) retry.addEventListener('click', () => {
      createSession(level, set, result.incorrectQuestionIds, 'retry');
      navigate(`#/practice/${level.code}/${set.set_number}`);
    });
  }

  function renderLoadError(message) {
    view.innerHTML = `<div class="load-error"><strong>Could not load the practice data.</strong><p>${esc(message)}</p><p>ไม่สามารถโหลดข้อมูลแบบฝึกได้ กรุณารีเฟรชหน้าอีกครั้ง</p></div>`;
  }

  function route() {
    if (!data) return;
    renderToken += 1;
    stopTimer({ persist: true });
    const r = parseRoute();
    if (r.name === 'home') renderHome();
    else {
      const level = getLevel(r.levelCode);
      if (!level) return renderHome();
      if (r.name === 'level') renderLevel(level);
      else {
        const set = getSet(level, r.setNumber);
        if (!set) return renderLevel(level);
        if (r.name === 'practice') renderPractice(level, set);
        else if (r.name === 'result') renderResult(level, set);
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function init() {
    setLanguage(prefs.lang || 'both');
    homeBtn.addEventListener('click', () => navigate('#/'));
    document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      route();
    }));
    window.addEventListener('hashchange', route);
    window.addEventListener('beforeunload', () => persistActiveTimer());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persistActiveTimer();
    });

    try {
      if (window.__INFINIA_MATH_DATA__ && Array.isArray(window.__INFINIA_MATH_DATA__.levels)) {
        data = window.__INFINIA_MATH_DATA__;
      } else {
        const response = await fetch(DATA_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        data = await response.json();
      }
      if (!Array.isArray(data.levels) || !data.levels.length) throw new Error('Practice data is empty.');
      levelMap = new Map(data.levels.map(level => [level.code, level]));
      versionEl.textContent = `Content ${data.app_version}`;
      route();
    } catch (err) {
      renderLoadError(err?.message || 'Unknown error');
    }
  }

  init();
})();
