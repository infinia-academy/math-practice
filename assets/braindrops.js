(() => {
  'use strict';

  const STORAGE_KEY = 'infinia.math.braindrops.v2';
  const POOL_KEY = 'infinia.math.braindrops.pool.v2';
  const POOL_VERSION = 2;
  const GAME_VERSION = 2;
  const MAX_RECORDS = 10;
  const REVIEW_RATIO = 0.30;
  let runtime = null;

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  const rand = arr => arr[Math.floor(Math.random()*arr.length)];

  function blankState(){ return {version:GAME_VERSION, levels:{}, lastLevel:null, histories:{'addition-subtraction':[], multiplication:[]}, adaptive:{}}; }
  function loadState(){
    try { const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||blankState(); p.levels||={}; p.histories||={}; p.histories['addition-subtraction']||=[]; p.histories.multiplication||=[]; p.adaptive||={}; return p; }
    catch(_){ return blankState(); }
  }
  function saveState(s){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(s)); }catch(_){} }
  function setPoolCookie(){ try{ document.cookie=`infinia_bd_pool=v${POOL_VERSION}; Max-Age=31536000; Path=./; SameSite=Lax`; }catch(_){} }

  function brainSvg(extraClass=''){ return `<svg class="brain-svg ${extraClass}" viewBox="0 0 120 104" aria-hidden="true"><path class="brain-body" d="M59 97c-15 0-27-7-33-18-13-1-23-12-22-25 0-9 5-17 13-21-4-14 5-29 19-32 8-9 23-9 32-1 11-8 27-4 33 7 13 2 21 15 17 27 8 5 12 14 10 23-2 12-12 21-24 22-7 12-20 19-35 18-4 0-7 0-10 0z"/><path class="brain-mid" d="M60 13v70"/><path class="brain-fold" d="M39 15c-8 7-8 18-1 24-10 3-14 16-7 24-7 7-5 18 4 23M81 15c8 6 9 17 2 24 10 4 14 16 7 24 7 7 5 18-4 23M20 42c9-2 17 3 20 11M99 41c-9-1-17 5-19 13M25 69c9-5 20-2 25 7M95 70c-9-5-20-1-24 7"/></svg>`; }

  function renderHomeCard(){ return `<button class="braindrops-home-card" type="button" data-braindrops-home><span class="braindrops-home-art" aria-hidden="true">${brainSvg('home-brain')}</span><span class="braindrops-home-copy"><span class="braindrops-home-kicker">ADAPTIVE ARCADE FLUENCY · เกมฝึกความคล่อง</span><strong>Braindrops <span lang="th">(เกมสมองแตก)</span></strong><span>The game remembers your last 10 rounds and adapts to you.</span><span lang="th">เกมจำ 10 รอบล่าสุดและปรับโจทย์ให้เหมาะกับผู้เล่น</span></span><span class="braindrops-home-cta">PLAY →</span></button>`; }

  function renderLanding(view,data,opts){
    destroy(); document.body.classList.remove('braindrops-active'); ensurePools(data);
    const state=loadState(); const levels=data.levels||[];
    view.innerHTML=`<section class="bd-landing"><div class="page-top"><button class="icon-btn" type="button" data-bd-back aria-label="Back">←</button><div class="page-heading"><span class="code-pill">BRAINDROPS</span><h1>Braindrops <span class="bd-th-title" lang="th">เกมสมองแตก</span></h1><div class="th">เกมคณิตคิดเร็วที่ปรับระดับตามการเล่นของนักเรียน</div></div></div>
    <section class="bd-intro-card"><div class="bd-intro-art" aria-hidden="true">${brainSvg('intro-brain')}</div><div><h2>Think. Type. Pop.</h2><p>Adaptive mode starts gently, remembers the last 10 rounds, reviews weak skills and moves up when you are ready.</p><p class="thai">โหมด Adaptive เริ่มจากพื้นฐาน จำ 10 รอบล่าสุด ทบทวนจุดที่ยังไม่คล่อง และค่อย ๆ เพิ่มระดับเมื่อพร้อม</p><div class="bd-rule-chips"><span>3 lives</span><span>30% review</span><span>70% progress</span></div></div></section>
    <section class="bd-mode-grid"><button class="bd-mode-card primary" type="button" data-bd-adaptive="addition-subtraction"><span>+ −</span><strong>Adaptive Addition & Subtraction</strong><small>ปรับระดับอัตโนมัติ A1 → A13</small></button><button class="bd-mode-card primary" type="button" data-bd-adaptive="multiplication"><span>× ÷</span><strong>Adaptive Multiplication</strong><small>ปรับระดับอัตโนมัติ M1 → M9</small></button></section>
    <section class="bd-rules"><strong>Adaptive rules · วิธีปรับระดับ</strong><ol><li>First game starts easy and climbs after a fluent correct streak. · เกมแรกเริ่มง่ายและค่อย ๆ เพิ่มระดับ</li><li>Later games use the last 10 rounds: about 30% weakness review and 70% fluency/progress. · รอบต่อไปใช้ประวัติ 10 เกมล่าสุด</li><li>Lower-level weaknesses receive priority before harder material. · ถ้าพื้นฐานยังไม่แน่น ระบบจะให้น้ำหนักระดับง่ายก่อน</li></ol></section>
    <details class="bd-focus"><summary>Focus Practice · เลือก Level เอง</summary><div class="bd-level-tabs" role="tablist"><button class="active" type="button" data-bd-strand="addition-subtraction">+ − A1–A13</button><button type="button" data-bd-strand="multiplication">× ÷ M1–M9</button></div><section class="bd-level-grid" data-bd-level-grid>${levelCards(levels.filter(l=>l.strand==='addition-subtraction'),state)}</section></details></section>`;
    view.querySelector('[data-bd-back]').addEventListener('click',()=>opts.navigate('#/'));
    view.querySelectorAll('[data-bd-adaptive]').forEach(b=>b.addEventListener('click',()=>opts.navigate(`#/braindrops/adaptive/${b.dataset.bdAdaptive}`)));
    view.querySelectorAll('[data-bd-strand]').forEach(btn=>btn.addEventListener('click',()=>{ view.querySelectorAll('[data-bd-strand]').forEach(x=>x.classList.toggle('active',x===btn)); view.querySelector('[data-bd-level-grid]').innerHTML=levelCards(levels.filter(l=>l.strand===btn.dataset.bdStrand),state); bindLevelButtons(view,opts); })); bindLevelButtons(view,opts);
  }

  function levelCards(levels,state){ return levels.map(l=>{const r=state.levels?.[l.code]||{};return `<button class="bd-level-card" type="button" data-bd-level="${esc(l.code)}"><span class="bd-level-code">${esc(l.code)}</span><span class="bd-level-name"><strong>${esc(l.title_en)}</strong><small>${esc(l.title_th)}</small></span><span class="bd-level-best">${r.bestScore?`Best<br><strong>${Number(r.bestScore).toLocaleString()}</strong>`:'PLAY'}</span></button>`}).join(''); }
  function bindLevelButtons(view,opts){ view.querySelectorAll('[data-bd-level]').forEach(b=>b.addEventListener('click',()=>opts.navigate(`#/braindrops/${b.dataset.bdLevel}`))); }

  function q(code,id,prompt,answer,kind='fact'){ return {id:`${code}-P-${id}`,level:code,fallback:prompt,answer:Number(answer),kind}; }
  function generateLevelPool(code){
    const out=[]; let id=1; const add=(p,a,k)=>out.push(q(code,String(id++).padStart(4,'0'),p,a,k));
    if(code==='A1'){ for(let n=0;n<=19;n++) add(`${n}+1=□`,n+1); for(let n=1;n<=20;n++) add(`${n}-1=□`,n-1); }
    else if(code==='A2'){ for(let n=0;n<=18;n++) add(`${n}+2=□`,n+2); for(let n=2;n<=20;n++) add(`${n}-2=□`,n-2); }
    else if(code==='A3'){ for(let n=0;n<=10;n++){ add(`${n}+□=10`,10-n,'bond'); add(`□+${n}=10`,10-n,'bond'); add(`10-${n}=□`,10-n,'bond'); } }
    else if(code==='A4'){ for(let a=0;a<=10;a++) for(let b=0;b<=10-a;b++) add(`${a}+${b}=□`,a+b); }
    else if(code==='A5'){ for(let a=0;a<=10;a++) for(let b=0;b<=a;b++) add(`${a}-${b}=□`,a-b); }
    else if(code==='A6'){ for(let a=6;a<=9;a++) for(let b=2;b<=9;b++) if(a+b>10){ add(`${a}+${b}=□`,a+b,'make10'); const need=10-a; add(`${a}+${b}=10+□`,b-need,'make10'); } }
    else if(code==='A7'){ for(let a=2;a<=9;a++) for(let b=2;b<=9;b++) if(a+b>10) add(`${a}+${b}=□`,a+b,'cross10'); }
    else if(code==='A8'){ for(let a=11;a<=20;a++) for(let b=2;b<=9;b++) if(a-b<10 && a-b>=0) add(`${a}-${b}=□`,a-b,'cross10'); }
    else if(code==='A9'){ for(let a=11;a<=19;a++) for(let b=1;b<=9;b++) add(`${a}+${b}=□`,a+b,'teen'); }
    else if(code==='A10'){ for(let a=11;a<=20;a++) for(let b=1;b<=9;b++) if(a>=b) add(`${a}-${b}=□`,a-b,'teen'); }
    else if(code==='A11'){ for(let a=0;a<=20;a++) for(let b=0;b<=20;b++) if(a>=7||b>=7) add(`${a}+${b}=□`,a+b,'add20'); }
    else if(code==='A12'){ for(let a=0;a<=20;a++) for(let b=0;b<=a;b++) add(`${a}-${b}=□`,a-b,'sub20'); }
    else if(code==='A13'){ for(let a=0;a<=20;a++) for(let b=0;b<=20;b++){ if(a+b<=40) add(`${a}+${b}=□`,a+b,'mixed'); if(a>=b) add(`${a}-${b}=□`,a-b,'mixed'); } for(let a=10;a<=20;a++) for(let ans=0;ans<=a;ans+=Math.max(1,Math.floor(a/5))) add(`${a}-□=${ans}`,a-ans,'missing'); }
    else if(code==='M1'){ for(const a of [1,2,5,10]) for(let b=1;b<=12;b++){add(`${a}×${b}=□`,a*b); if(a!==b)add(`${b}×${a}=□`,a*b);} }
    else if(code==='M2'){ for(const a of [3,4]) for(let b=1;b<=12;b++){add(`${a}×${b}=□`,a*b); if(a!==b)add(`${b}×${a}=□`,a*b);} }
    else if(/^M[3456]$/.test(code)){ const map={M3:[6],M4:[9],M5:[7,8],M6:[11,12]}; for(const a of map[code]) for(let b=1;b<=12;b++){add(`${a}×${b}=□`,a*b); if(a!==b)add(`${b}×${a}=□`,a*b);} }
    else if(code==='M7'){ for(let a=1;a<=12;a++) for(let b=1;b<=12;b++) add(`${a}×${b}=□`,a*b,'mixed-times'); }
    else if(code==='M8'){ for(let a=1;a<=12;a++) for(let b=1;b<=12;b++){ const p=a*b; add(`${p}÷${a}=□`,b,'inverse'); add(`${a}×□=${p}`,b,'missing-factor'); add(`□×${b}=${p}`,a,'missing-factor'); } }
    else if(code==='M9'){ for(let a=6;a<=12;a++) for(let b=6;b<=12;b++){ const p=a*b; if(b>=6&&b<=8) add(`${a}×${b}=(${a}×5)+(${a}×${b-5})=□`,p,'derived'); if(b===9) add(`${a}×9=(${a}×10)-(${a}×1)=□`,p,'derived'); if(b===10) add(`${a}×10=2×(${a}×5)=□`,p,'derived'); if(b===11||b===12) add(`${a}×${b}=(${a}×10)+(${a}×${b-10})=□`,p,'derived'); } }
    return dedupe(out);
  }
  function dedupe(a){const s=new Set();return a.filter(x=>{const k=x.fallback+'|'+x.answer;if(s.has(k))return false;s.add(k);return true;});}
  function ensurePools(data){
    let pools=null; try{const raw=localStorage.getItem(POOL_KEY); if(raw){const p=JSON.parse(raw); if(p.version===POOL_VERSION)pools=p.pools;}}catch(_){}
    if(!pools){ pools={}; for(const l of data.levels||[]) pools[l.code]=generateLevelPool(l.code); try{localStorage.setItem(POOL_KEY,JSON.stringify({version:POOL_VERSION,createdAt:new Date().toISOString(),pools}));}catch(_){} setPoolCookie(); }
    return pools;
  }
  function sourcePool(level){ const generated=generateLevelPool(level.code); if(generated.length)return generated; const seen=new Set(),out=[]; for(const s of level.sets||[])for(const x of s.questions||[]){const k=x.fallback+'|'+x.answer;if(!seen.has(k)){seen.add(k);out.push({id:x.id,level:level.code,fallback:x.fallback,answer:Number(x.answer),kind:'source'});}} return out; }

  function historyStats(state,strand,levelCodes){
    const histories=(state.histories?.[strand]||[]).slice(-MAX_RECORDS); const stats={}; levelCodes.forEach(c=>stats[c]={correct:0,incorrect:0,slow:0,seen:0,lastWrong:0});
    histories.forEach((game,gi)=>{ const recency=.45+.55*((gi+1)/Math.max(1,histories.length)); (game.attempts||[]).forEach(a=>{if(!stats[a.level])return;stats[a.level].seen+=recency;if(a.outcome==='correct'){stats[a.level].correct+=recency;if(a.responseMs&&a.responseMs>6500)stats[a.level].slow+=.35*recency;}else{stats[a.level].incorrect+=recency;stats[a.level].lastWrong=Math.max(stats[a.level].lastWrong,gi+1);}}); }); return {histories,stats};
  }
  function inferFrontier(state,strand,levels){
    const codes=levels.map(l=>l.code), {histories,stats}=historyStats(state,strand,codes); if(!histories.length)return 0;
    let frontier=clamp(state.adaptive?.[strand]?.frontierIndex ?? 0,0,levels.length-1);
    for(let i=0;i<levels.length;i++){const s=stats[codes[i]], total=s.correct+s.incorrect;if(total>=3){const acc=s.correct/total;if(acc<.72){frontier=Math.min(frontier,i+1);break;} if(acc>=.86&&s.correct>=3)frontier=Math.max(frontier,Math.min(i+1,levels.length-1));}}
    return clamp(frontier,0,levels.length-1);
  }
  function weightedPick(items,weightFn){ const ws=items.map(x=>Math.max(0,weightFn(x))), total=ws.reduce((a,b)=>a+b,0); if(!total)return rand(items); let r=Math.random()*total; for(let i=0;i<items.length;i++){r-=ws[i];if(r<=0)return items[i];} return items.at(-1); }

  function renderAdaptiveGame(view,strand,data,opts){
    const levels=(data.levels||[]).filter(l=>l.strand===strand); if(!levels.length){opts.navigate('#/braindrops');return;}
    const state=loadState(), pools=ensurePools(data), frontier=inferFrontier(state,strand,levels);
    renderGameShell(view,{mode:'adaptive',strand,levels,pools,state,frontier,opts});
  }
  function renderGame(view,level,opts){
    const state=loadState(); state.lastLevel=level.code; saveState(state);
    renderGameShell(view,{mode:'focus',strand:level.strand,levels:[level],pools:{[level.code]:sourcePool(level)},state,frontier:0,opts,focusLevel:level});
  }

  function renderGameShell(view,cfg){
    destroy(); document.body.classList.add('braindrops-active'); const level=cfg.levels[cfg.frontier]||cfg.levels[0];
    view.innerHTML=`<section class="bd-game" aria-label="Braindrops game"><div class="bd-neural-glow" aria-hidden="true"></div><div class="bd-hud"><button class="bd-hud-btn" type="button" data-bd-pause aria-label="Pause">Ⅱ</button><div class="bd-hud-center"><span data-bd-current-level>${esc(level.code)}</span><small>${cfg.mode==='adaptive'?'ADAPTIVE · ปรับระดับอัตโนมัติ':esc(level.title_en)}</small></div><div class="bd-score"><span>SCORE</span><strong data-bd-score>0</strong></div></div><div class="bd-lives" data-bd-lives></div><div class="bd-stage" data-bd-stage></div><div class="bd-toast" data-bd-toast aria-live="polite"></div><div class="bd-controls"><div class="bd-answer-display"><span data-bd-answer></span><button type="button" data-bd-clear aria-label="Clear answer">×</button></div><div class="bd-keypad">${[7,8,9,4,5,6,1,2,3].map(n=>`<button type="button" data-bd-key="${n}">${n}</button>`).join('')}<button type="button" data-bd-key="0">0</button><button class="bd-enter" type="button" data-bd-enter>ENTER</button></div></div>
    <div class="bd-overlay" data-bd-ready><div class="bd-overlay-card"><div class="bd-ready-brain">${brainSvg('ready-brain')}</div><span class="code-pill">${cfg.mode==='adaptive'?'ADAPTIVE':esc(level.code)}</span><h1>Ready?</h1><p>${cfg.mode==='adaptive'?'Starts at '+esc(level.code)+' and adapts as you play.':esc(level.title_en)}</p><p class="thai">${cfg.mode==='adaptive'?'เริ่มจากระดับที่เหมาะสมและปรับตามการเล่น':'เน้นความถูกต้องก่อน แล้วค่อยเพิ่มความเร็ว'}</p><button class="bd-main-btn" type="button" data-bd-start>Start · เริ่ม</button><button class="bd-text-btn" type="button" data-bd-exit>Back · กลับ</button></div></div>
    <div class="bd-overlay hidden" data-bd-pause-overlay><div class="bd-overlay-card"><h1>Paused</h1><p class="thai">หยุดชั่วคราว</p><button class="bd-main-btn" type="button" data-bd-resume>Resume · เล่นต่อ</button><button class="bd-text-btn" type="button" data-bd-exit>Exit round · ออกจากเกม</button></div></div><div class="bd-overlay hidden" data-bd-result></div></section>`;
    const stage=view.querySelector('[data-bd-stage]'); runtime=createRuntime(view,stage,cfg); renderLives(runtime); bindGameControls(runtime);
  }

  function createRuntime(view,stage,cfg){
    const codes=cfg.levels.map(l=>l.code), hs=historyStats(cfg.state,cfg.strand,codes);
    return {view,stage,...cfg, historyStats:hs.stats, hasHistory:hs.histories.length>0, currentIndex:cfg.frontier, running:false,paused:true,ended:false,score:0,lives:3,cleared:0,missed:0,submissions:0,correctSubmissions:0,streak:0,bestStreak:0,answer:'',drops:[],recentIds:[],nextDropId:1,lastFrame:0,spawnClock:0,elapsed:0,wrongBurst:0,wrongBurstAt:0,inputLockedUntil:0,animationId:0,stageWidth:0,stageHeight:0,attempts:[],levelStreak:0,levelErrors:0,spawnCount:0};
  }
  function bindGameControls(g){const v=g.view;v.querySelector('[data-bd-start]').addEventListener('click',()=>startRound(g));v.querySelectorAll('[data-bd-exit]').forEach(b=>b.addEventListener('click',()=>g.opts.navigate('#/braindrops')));v.querySelector('[data-bd-pause]').addEventListener('click',()=>pauseRound(g));v.querySelector('[data-bd-resume]').addEventListener('click',()=>resumeRound(g));v.querySelectorAll('[data-bd-key]').forEach(b=>b.addEventListener('click',()=>appendDigit(g,b.dataset.bdKey)));v.querySelector('[data-bd-clear]').addEventListener('click',()=>clearAnswer(g));v.querySelector('[data-bd-enter]').addEventListener('click',()=>submitAnswer(g));window.addEventListener('keydown',keyboardHandler);g.resizeObserver=new ResizeObserver(()=>measureStage(g));g.resizeObserver.observe(g.stage);g.visibilityHandler=()=>{if(document.visibilityState==='hidden'&&g.running&&!g.paused&&!g.ended)pauseRound(g)};document.addEventListener('visibilitychange',g.visibilityHandler);measureStage(g);}
  function keyboardHandler(ev){const g=runtime;if(!g||g.ended||g.paused)return;if(/^[0-9]$/.test(ev.key)){appendDigit(g,ev.key);ev.preventDefault()}else if(ev.key==='Enter'){submitAnswer(g);ev.preventDefault()}else if(ev.key==='Backspace'||ev.key==='Escape'){clearAnswer(g);ev.preventDefault()}}
  function measureStage(g){const r=g.stage.getBoundingClientRect();g.stageWidth=r.width;g.stageHeight=r.height;}
  function startRound(g){g.view.querySelector('[data-bd-ready]').classList.add('hidden');g.running=true;g.paused=false;g.startedAt=performance.now();g.lastFrame=performance.now();g.spawnClock=9999;g.animationId=requestAnimationFrame(frame);}
  function pauseRound(g){if(!g.running||g.paused||g.ended)return;g.paused=true;g.view.querySelector('[data-bd-pause-overlay]').classList.remove('hidden');}
  function resumeRound(g){if(!g.running||!g.paused||g.ended)return;g.paused=false;g.lastFrame=performance.now();g.view.querySelector('[data-bd-pause-overlay]').classList.add('hidden');}
  function frame(now){const g=runtime;if(!g||g.ended)return;const dt=Math.min(40,Math.max(0,now-g.lastFrame));g.lastFrame=now;if(!g.paused){g.elapsed+=dt;g.spawnClock+=dt;updateDrops(g,dt);const pressure=Math.max(0,g.cleared-g.missed*2);const spawnEvery=Math.max(1650,3350-pressure*20-Math.floor(g.elapsed/35000)*110);const maxDrops=g.elapsed<18000?2:g.elapsed<55000?3:4;if(g.spawnClock>=spawnEvery&&g.drops.length<maxDrops){spawnDrop(g);g.spawnClock=0;}}g.animationId=requestAnimationFrame(frame);}
  function speedFor(g,q){const base=Math.max(40,g.stageHeight*.071),ramp=Math.min(1.0,(g.cleared*.014)+(g.elapsed/210000));const complex=q.kind==='derived'?.72:(q.kind==='missing'||q.kind==='missing-factor'||q.kind==='inverse')?.88:1;return base*(1+ramp)*complex;}

  function chooseLevelAdaptive(g){
    if(g.mode!=='adaptive')return 0;
    const n=g.levels.length, current=g.currentIndex;
    if(!g.hasHistory){const first=[...new Set([Math.max(0,current-1),current])];return weightedPick(first,i=>i===current?7:2);}
    if(Math.random()<REVIEW_RATIO){
      const candidates=g.levels.map((l,i)=>({i,s:g.historyStats[l.code]})).filter(x=>x.s&&x.s.incorrect>0);
      if(candidates.length)return weightedPick(candidates,x=>{const easier=1+(n-1-x.i)/Math.max(1,n-1)*1.25;const repeat=1+x.s.incorrect*1.35;const errorRate=(x.s.incorrect+1)/(x.s.correct+x.s.incorrect+2);return easier*repeat*errorRate;}).i;
    }
    const inds=[Math.max(0,current-1),current,Math.min(n-1,current+1)];
    return weightedPick([...new Set(inds)],i=>i===current?7:i<current?2.5:1.6);
  }
  function chooseQuestion(g){
    const idx=chooseLevelAdaptive(g), level=g.levels[idx], pool=g.pools[level.code]||[]; if(!pool.length)return null;
    if(g.drops.length&&Math.random()<.24){const target=rand(g.drops).q.answer;const m=pool.filter(x=>x.answer===target&&!g.drops.some(d=>d.q.id===x.id)&&!g.recentIds.includes(x.id));if(m.length)return {...rand(m),levelIndex:idx};}
    let candidates=pool.filter(x=>!g.drops.some(d=>d.q.id===x.id)&&!g.recentIds.includes(x.id));if(!candidates.length)candidates=pool.filter(x=>!g.drops.some(d=>d.q.id===x.id));if(!candidates.length)candidates=pool;
    return {...rand(candidates),levelIndex:idx};
  }
  function maybeAdaptFrontier(g,outcome,levelIndex){
    if(g.mode!=='adaptive')return;
    if(outcome==='correct'&&levelIndex>=g.currentIndex){g.levelStreak++;g.levelErrors=Math.max(0,g.levelErrors-1);}else if(outcome!=='correct'&&levelIndex<=g.currentIndex){g.levelErrors++;g.levelStreak=0;}
    if(g.levelStreak>=4&&g.currentIndex<g.levels.length-1){g.currentIndex++;g.levelStreak=0;g.levelErrors=0;toast(g,`Level up → ${g.levels[g.currentIndex].code} · เก่งขึ้นแล้ว`,'good');g.drops.forEach(d=>d.speed*=.90);}
    else if(g.levelErrors>=3&&g.currentIndex>0){g.currentIndex--;g.levelErrors=0;g.levelStreak=0;toast(g,`Foundation boost → ${g.levels[g.currentIndex].code}`,'good');g.drops.forEach(d=>d.speed*=.88);}
    const e=g.view.querySelector('[data-bd-current-level]');if(e)e.textContent=g.levels[g.currentIndex].code;
  }

  function spawnDrop(g){measureStage(g);const q=chooseQuestion(g);if(!q)return;const prompt=String(q.fallback).replaceAll(' ','');const complex=prompt.length>12;const size=complex?Math.min(148,Math.max(124,g.stageWidth*.36)):Math.min(124,Math.max(102,g.stageWidth*.275));const laneCount=g.stageWidth<480?3:4,laneWidth=g.stageWidth/laneCount;let lanes=shuffle([...Array(laneCount).keys()]);let lane=lanes.find(l=>!g.drops.some(d=>d.y<size*1.2&&d.lane===l));if(lane==null)lane=lanes[0];const x=clamp(lane*laneWidth+(laneWidth-size)/2,3,g.stageWidth-size-3);const el=document.createElement('div');el.className=`brain-drop${complex?' wide':''}`;el.style.width=`${size}px`;el.style.height=`${size*.88}px`;el.style.transform=`translate3d(${x}px,${-size}px,0)`;el.innerHTML=`${brainSvg()}<span class="brain-level-tag">${esc(q.level)}</span><div class="brain-expression">${formatPrompt(q.fallback)}</div>`;g.stage.appendChild(el);const d={id:g.nextDropId++,q,el,x,y:-size,size,lane,speed:speedFor(g,q)*(0.94+Math.random()*.12),spawnedAt:performance.now()};g.drops.push(d);g.recentIds.push(q.id);if(g.recentIds.length>18)g.recentIds.shift();g.spawnCount++;}
  function formatPrompt(fallback){const s=esc(String(fallback).replaceAll(' ','').replaceAll('-','−'));const m=s.match(/^(\d+)([+−×÷])(\d+)=□$/);if(m)return `<span class="brain-stacked"><span>${m[1]}</span><span><b>${m[2]}</b>${m[3]}</span></span>`;const bond=s.match(/^(□|\d+)\+(□|\d+)=10$/);if(bond)return `<span class="brain-inline brain-fit">${s}</span>`;if(s.length<=12)return `<span class="brain-inline brain-fit">${s}</span>`;if(s.includes('=')){const parts=s.split('=');return `<span class="brain-multiline">${parts.map((p,i)=>`<span>${i?'=':''}${p}</span>`).join('')}</span>`;}return `<span class="brain-inline brain-fit">${s}</span>`;}
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function updateDrops(g,dt){const floor=g.stageHeight-6,missed=[];for(const d of g.drops){d.y+=d.speed*dt/1000;d.el.style.transform=`translate3d(${d.x}px,${d.y}px,0)`;if(d.y+d.size*.72>=floor)missed.push(d);}missed.forEach(d=>missDrop(g,d));}
  function recordAttempt(g,d,outcome,responseMs=null,entered=null){g.attempts.push({questionId:d.q.id,level:d.q.level,prompt:d.q.fallback,answer:d.q.answer,outcome,responseMs:responseMs?Math.round(responseMs):null,entered,at:new Date().toISOString()});}
  function missDrop(g,d){recordAttempt(g,d,'missed',performance.now()-d.spawnedAt);removeDrop(g,d,'miss');g.lives--;g.missed++;g.streak=0;maybeAdaptFrontier(g,'missed',d.q.levelIndex);renderLives(g);toast(g,'Brain dropped! · หลุด 1 ก้อน','bad');g.drops.forEach(x=>x.speed*=.88);if(g.lives<=0)endRound(g);}
  function removeDrop(g,d,reason='pop'){const i=g.drops.indexOf(d);if(i>=0)g.drops.splice(i,1);d.el.classList.add(reason==='pop'?'popped':'missed');setTimeout(()=>d.el.remove(),230);}
  function appendDigit(g,d){if(!g.running||g.paused||g.ended||performance.now()<g.inputLockedUntil)return;if(g.answer.length>=3)return;if(g.answer==='0')g.answer='';g.answer+=String(d);updateAnswer(g);}
  function clearAnswer(g){if(!g||g.ended)return;g.answer='';updateAnswer(g);}
  function updateAnswer(g){const e=g.view.querySelector('[data-bd-answer]');if(e)e.textContent=g.answer;}
  function submitAnswer(g){if(!g.running||g.paused||g.ended||performance.now()<g.inputLockedUntil||!g.answer)return;const value=Number(g.answer);g.answer='';updateAnswer(g);g.submissions++;const matches=g.drops.filter(d=>d.q.answer===value);if(!matches.length){g.streak=0;const now=performance.now();g.wrongBurst=now-g.wrongBurstAt<2200?g.wrongBurst+1:1;g.wrongBurstAt=now;const lock=g.wrongBurst>=3?1200:0;if(lock){g.inputLockedUntil=now+lock;g.view.querySelector('.bd-controls').classList.add('locked');setTimeout(()=>g.view.querySelector('.bd-controls')?.classList.remove('locked'),lock);}g.attempts.push({questionId:null,level:null,outcome:'wrong-entry',entered:value,visibleLevels:[...new Set(g.drops.map(d=>d.q.level))],at:new Date().toISOString()});shakeControls(g);toast(g,lock?'Too many guesses — think first. · คิดก่อนตอบ':'No matching brain · ยังไม่มีคำตอบนี้','bad');return;}
    g.correctSubmissions++;g.wrongBurst=0;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);const multiplier=Math.min(2,1+Math.floor(g.streak/5)*.2),base=matches.length*500,combo=Math.max(0,matches.length-1)*250,gained=Math.round((base+combo)*multiplier);g.score+=gained;g.cleared+=matches.length;matches.forEach(d=>{recordAttempt(g,d,'correct',performance.now()-d.spawnedAt,value);maybeAdaptFrontier(g,'correct',d.q.levelIndex);removeDrop(g,d,'pop');});updateScore(g);toast(g,matches.length>1?`MULTI-POP ×${matches.length}  +${gained.toLocaleString()}`:`+${gained.toLocaleString()}`,'good');g.drops.forEach(d=>d.speed=Math.max(d.speed,speedFor(g,d.q)*.92));if(!g.drops.length)g.spawnClock=9999;
  }
  function shakeControls(g){const e=g.view.querySelector('.bd-answer-display');e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake');}
  function updateScore(g){const e=g.view.querySelector('[data-bd-score]');if(e)e.textContent=g.score.toLocaleString();}
  function renderLives(g){const e=g.view.querySelector('[data-bd-lives]');if(e)e.innerHTML=Array.from({length:3},(_,i)=>`<span class="bd-life ${i<g.lives?'alive':''}">${brainSvg('life-brain')}</span>`).join('');}
  function toast(g,text,kind){const e=g.view.querySelector('[data-bd-toast]');if(!e)return;e.textContent=text;e.className=`bd-toast show ${kind||''}`;clearTimeout(g.toastTimer);g.toastTimer=setTimeout(()=>{if(e)e.className='bd-toast'},900);}

  function endRound(g){if(g.ended)return;g.ended=true;g.running=false;g.paused=true;if(g.animationId)cancelAnimationFrame(g.animationId);const accuracy=g.submissions?Math.round(g.correctSubmissions*100/g.submissions):0,state=loadState();
    const primary=g.mode==='focus'?g.levels[0].code:g.levels[g.currentIndex].code,prev=state.levels[primary]||{plays:0,bestScore:0,bestCleared:0},isBest=g.score>(prev.bestScore||0);prev.plays=(prev.plays||0)+1;prev.bestScore=Math.max(prev.bestScore||0,g.score);prev.bestCleared=Math.max(prev.bestCleared||0,g.cleared);prev.lastScore=g.score;prev.lastAccuracy=accuracy;prev.lastPlayedAt=new Date().toISOString();state.levels[primary]=prev;
    const record={id:`BD-${Date.now()}`,playedAt:new Date().toISOString(),mode:g.mode,strand:g.strand,startLevel:g.levels[g.frontier]?.code,endLevel:primary,score:g.score,accuracy,cleared:g.cleared,missed:g.missed,bestStreak:g.bestStreak,attempts:g.attempts.slice(-180)};state.histories[g.strand]=(state.histories[g.strand]||[]).concat(record).slice(-MAX_RECORDS);state.adaptive[g.strand]={frontierIndex:g.currentIndex,updatedAt:new Date().toISOString()};saveState(state);
    const weak=weakSummary(record);const overlay=g.view.querySelector('[data-bd-result]');overlay.innerHTML=`<div class="bd-overlay-card bd-result-card"><span class="code-pill">${g.mode==='adaptive'?'ADAPTIVE · '+esc(primary):esc(primary)}</span><h1>${isBest?'New best!':'Round complete'}</h1><p class="thai">${isBest?'สถิติใหม่!':'จบรอบแล้ว'}</p><div class="bd-final-score">${g.score.toLocaleString()}</div><div class="bd-result-grid"><div><strong>${g.cleared}</strong><span>Brains solved<br>แก้ได้</span></div><div><strong>${accuracy}%</strong><span>Accuracy<br>ความแม่นยำ</span></div><div><strong>${g.bestStreak}</strong><span>Best streak<br>ต่อเนื่อง</span></div></div>${weak?`<p class="bd-best-line">Review priority · ควรทบทวน: <strong>${esc(weak)}</strong></p>`:''}<p class="bd-history-line">Saved in rolling 10-game memory · บันทึกในประวัติ 10 เกมล่าสุด</p><button class="bd-main-btn" type="button" data-bd-again>Play adaptive again · เล่นอีกครั้ง</button><button class="bd-text-btn" type="button" data-bd-levels>Back to Braindrops · กลับ</button></div>`;overlay.classList.remove('hidden');overlay.querySelector('[data-bd-again]').addEventListener('click',()=>{if(g.mode==='adaptive')g.opts.navigate(`#/braindrops/adaptive/${g.strand}/${Date.now()}`);else g.opts.navigate(`#/braindrops/${g.levels[0].code}/${Date.now()}`)});overlay.querySelector('[data-bd-levels]').addEventListener('click',()=>g.opts.navigate('#/braindrops'));
  }
  function weakSummary(record){const m={};for(const a of record.attempts||[]){if(a.level&&(a.outcome==='missed'))m[a.level]=(m[a.level]||0)+1;}return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';}
  function destroy(){const g=runtime;if(g){if(g.animationId)cancelAnimationFrame(g.animationId);if(g.resizeObserver)g.resizeObserver.disconnect();if(g.visibilityHandler)document.removeEventListener('visibilitychange',g.visibilityHandler);clearTimeout(g.toastTimer);}window.removeEventListener('keydown',keyboardHandler);runtime=null;document.body.classList.remove('braindrops-active');}

  window.InfiniaBraindrops={renderHomeCard,renderLanding,renderGame,renderAdaptiveGame,destroy,ensurePools,_test:{generateLevelPool,inferFrontier,historyStats}};
})();
