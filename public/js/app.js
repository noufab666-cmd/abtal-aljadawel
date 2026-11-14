import {
  APP, TABLES, TEAMS, teamBadge, ordinal, encouragementFor, starsFor, HELPS, ICONS, BOARD_ROWS, teamById, tableByCategory, toAr, toEn, fmtDate, pct, esc, shuffle,
  $, $$, toast, loadBuiltInQuestions, registerSW,
} from './common.js';
import { getStore, StoreError } from './store.js';
import { drawCertificate } from './certificate.js';

const app = $('#app');
const modalRoot = $('#modal-root');
let store;
let me = null; // ملف الطالبة الحالية
let pool = []; // كل الأسئلة
let round = null; // الجولة الحالية
let teamTotals = {};

const roundKey = () => `abtal-round-${me.uid}`;
const pendingKey = () => `abtal-pending-${me.uid}`;
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function logoSvg() { return ICONS.times; }

function header(extra = '') {
  return `
  <header class="topbar">
    <div class="brand">
      <div class="logo">${logoSvg()}</div>
      <div><h1>${APP.title}</h1><small>${APP.initiative}</small></div>
    </div>
    <div class="top-actions">${extra}</div>
  </header>`;
}

function render(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
  const h = app.querySelector('h1, h2'); if (h) h.setAttribute('tabindex', '-1');
}

const teamIcon = (t, size = 28) => teamBadge(t, size);

// ================= شاشة البداية: الاسم والرمز فقط =================
function teamButtons() {
  return TEAMS.map((t) => `<button type="button" data-team="${t.id}" aria-pressed="false">${teamIcon(t, 44)}${t.name}<small>${t.about}</small></button>`).join('');
}

function showWelcome(preset = {}) {
  render(`
    <section class="hero" style="padding-top:12px">
      <div class="mark">${logoSvg()}</div>
      <h1>${APP.title}</h1>
      <p class="initiative">${APP.initiative}</p>
      <p>${APP.author}</p>
    </section>
    <div class="center-col panel light" style="margin-top:12px">
      <form class="stack" id="auth-form" novalidate>
        <label class="field">اكتبي اسمك
          <input id="name" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" required placeholder="الاسم الأول واسم العائلة" value="${esc(preset.name || '')}">
        </label>
        <label class="field">الرمز السري (٤ أرقام)
          <input id="pin" class="pin-input" inputmode="numeric" autocomplete="off" maxlength="4" required>
          <span class="help">أول مرة؟ اختاري ٤ أرقام تحفظينها، وأخبري بها ولي أمرك.</span>
        </label>
        <div id="auth-error" class="error hidden" role="alert"></div>
        <button class="btn primary block" type="submit" id="auth-submit" style="min-height:68px;font-size:24px">ابدئي</button>
      </form>
    </div>
    <p class="footer"><a class="linkbtn" href="teacher.html">لوحة المعلمة</a></p>`);
  const pinEl = $('#pin');
  pinEl.addEventListener('input', () => { pinEl.value = toAr(toEn(pinEl.value).replace(/\D/g, '').slice(0, 4)); });
  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#auth-error'); err.classList.add('hidden');
    const btn = $('#auth-submit'); btn.disabled = true;
    const name = $('#name').value; const pin = pinEl.value;
    try {
      me = await store.signIn(name, pin);
      if (me.needsProfile) return showChooseTeam();
      await afterLogin();
    } catch (ex) {
      if (ex.code === 'not-found' || ex.code === 'not-found-or-wrong-pin') return showNewStudent(name, pin, ex.code === 'not-found-or-wrong-pin');
      err.textContent = ex instanceof StoreError ? ex.message : 'تعذر الاتصال، حاولي مرة أخرى';
      err.classList.remove('hidden');
      if (!(ex instanceof StoreError)) console.error(ex);
    } finally { const b2 = $('#auth-submit'); if (b2) b2.disabled = false; }
  };
  (preset.name ? pinEl : $('#name')).focus();
}

// طالبة جديدة: تختار فريقها مرة واحدة فقط
function showNewStudent(name, pin, maybeWrongPin) {
  let team = null;
  render(`
    ${header()}
    <div class="center-col panel light stack">
      <h2 class="section-title" style="color:var(--ink);margin:0">أهلًا يا ${esc(name)}!</h2>
      <p style="margin:0">${maybeWrongPin ? 'لم نجد حسابًا بهذا الاسم وهذا الرمز. إن كانت هذه أول مرة لكِ فاختاري فريقك:' : 'هذه أول مرة لكِ في اللعبة. اختاري فريقك:'}</p>
      <div class="team-pick" id="team-pick">${teamButtons()}</div>
      <div id="auth-error" class="error hidden" role="alert"></div>
      <button class="btn primary block" id="create" style="min-height:64px;font-size:22px" disabled>ابدئي اللعب</button>
      <button class="btn ghost block" id="back" style="color:var(--navy-700);border-color:#d5dbf2">${maybeWrongPin ? 'لدي حساب، أريد تصحيح الاسم أو الرمز' : 'رجوع لتصحيح الاسم'}</button>
    </div>`);
  $('#back').onclick = () => showWelcome({ name });
  $$('#team-pick button').forEach((b) => {
    b.onclick = () => {
      team = b.dataset.team;
      $$('#team-pick button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#create').disabled = false;
    };
  });
  $('#create').onclick = async () => {
    const err = $('#auth-error'); err.classList.add('hidden');
    $('#create').disabled = true;
    try {
      me = await store.signUp(name, pin, team);
      await afterLogin();
    } catch (ex) {
      err.textContent = ex instanceof StoreError ? ex.message : 'تعذر الاتصال، حاولي مرة أخرى';
      err.classList.remove('hidden');
      const c = $('#create'); if (c) c.disabled = false;
    }
  };
}

// إذا حذفت المعلمة بيانات الطالبة ثم عادت للدخول
function showChooseTeam() {
  render(`
    ${header()}
    <div class="center-col panel light stack">
      <h2 class="section-title" style="color:var(--ink)">اختاري فريقك</h2>
      <div class="team-pick">${teamButtons()}</div>
    </div>`);
  $$('.team-pick button').forEach((b) => {
    b.onclick = async () => {
      me = await store.createProfile(me.uid, me.name, me.pin, b.dataset.team);
      await afterLogin();
    };
  });
}

async function afterLogin() {
  await flushPending();
  await showHome();
}

// إعادة محاولة حفظ جولة لم تُحفظ بسبب انقطاع الاتصال
async function flushPending() {
  const pending = lsGet(pendingKey());
  if (!pending) return;
  if (me.lastRoundId === pending.id) { lsSet(pendingKey(), null); return; }
  try {
    me = await store.saveRound(me, pending);
    lsSet(pendingKey(), null);
    toast('تم حفظ نتيجة جولتك السابقة', 'ok');
  } catch (e) { console.warn('pending save failed', e); }
}

async function refreshTeamTotals() {
  teamTotals = Object.fromEntries(TEAMS.map((t) => [t.id, 0]));
  try {
    const lb = await store.leaderboard();
    lb.forEach((r) => { if (teamTotals[r.team] != null) teamTotals[r.team] += r.total || 0; });
    return lb;
  } catch (e) { console.warn(e); return []; }
}

// ================= الشاشة الرئيسية =================
async function showHome() {
  const t = teamById(me.team);
  const saved = lsGet(roundKey());
  const acc = pct(me.totalCorrect, me.totalAnswered);
  render(`
    ${header('<button class="btn ghost small" id="logout">خروج</button>')}
    <div class="home-grid">
      <section class="panel">
        <div class="welcome">
          <h2>أهلًا يا ${esc(me.name)}</h2>
          <div style="display:flex;align-items:center;gap:8px;font-weight:700">${teamIcon(t)} ${t.name}</div>
        </div>
        <div class="stats">
          <div class="stat"><b>${toAr(me.totalScore)}</b><span>مجموع نقاطي</span></div>
          <div class="stat"><b>${toAr(me.roundsPlayed)}</b><span>جولات لعبتها</span></div>
          <div class="stat"><b>${toAr(acc)}٪</b><span>إجابات صحيحة</span></div>
        </div>
        <div class="menu">
          <button class="btn primary block" id="play" style="min-height:72px;font-size:26px">${saved ? 'أكملي جولتك' : 'ابدئي جولة جديدة'}</button>
          ${saved ? '<button class="btn ghost block" id="new-round">ابدئي جولة جديدة بدلًا منها</button>' : ''}
          <button class="btn block" id="lb">${ICONS.trophy} لوحة النتائج</button>
          <button class="btn block" id="cert" ${me.certificates ? '' : 'disabled'}>شهادة «بطلة الجداول»</button>
        </div>
      </section>
      <section class="panel" style="grid-column:1/-1">
        <h2 class="section-title">رحلة البطلة</h2>
        ${journeyPath(me.fullRounds || 0)}
        <p style="margin:10px 0 0;color:var(--muted);font-size:15px">${me.certificates
          ? 'أكملتِ الرحلة وحصلتِ على شهادة «بطلة الجداول». يمكنك مواصلة اللعب لزيادة نقاط فريقك.'
          : `أكملي ${toAr(APP.journeyRounds)} جولة (كل جولة ${toAr(APP.roundSize)} أسئلة) لتحصلي على شهادة «بطلة الجداول». بقي لكِ ${toAr(APP.journeyRounds - (me.fullRounds || 0))}.`}</p>
      </section>
      <section class="panel">
        <h2 class="section-title">تقدّمي في الجداول</h2>
        <div class="mastery">
          ${TABLES.map((tb) => {
            const s = me.tableStats?.[tb.key] || { c: 0, n: 0 };
            const p = pct(s.c, s.n);
            return `<div class="m-row"><span>${tb.category}</span><div class="bar"><i style="width:${p}%"></i></div><span>${s.n ? toAr(p) + '٪' : '—'}</span></div>`;
          }).join('')}
        </div>
        <p style="color:var(--muted);font-size:15px;margin-bottom:0">كل جولة فيها ${toAr(APP.roundSize)} أسئلة تختارينها من اللوحة. يمكنك اللعب في أي وقت، وتُحفظ نتيجتك تلقائيًا.</p>
      </section>
    </div>
    <p class="footer">${APP.initiative} — ${APP.author}</p>`);
  $('#logout').onclick = async () => { await store.signOut(); me = null; showWelcome(); };
  $('#play').onclick = () => startRound(false);
  if (saved) $('#new-round').onclick = () => { if (confirm('هل تريدين ترك الجولة الحالية والبدء من جديد؟')) startRound(true); };
  $('#lb').onclick = showLeaderboard;
  $('#cert').onclick = () => showCertificate();
}

// ================= الجولة =================
async function startRound(fresh) {
  if (!pool.length) await loadPool();
  await refreshTeamTotals();
  const saved = !fresh && lsGet(roundKey());
  round = saved || { startedAt: Date.now(), cells: {}, answers: [], score: 0, helps: {} };
  saveRoundLocal();
  showBoard();
}
const saveRoundLocal = () => lsSet(roundKey(), round);

async function loadPool() {
  const [builtIn, custom] = await Promise.all([loadBuiltInQuestions(), store.customQuestions()]);
  pool = [...builtIn, ...custom];
}

function pickQuestion(category, points) {
  const used = new Set(round.answers.map((a) => a.qid));
  const inCat = pool.filter((q) => q.category === category && !used.has(q.id));
  let cands = inCat.filter((q) => q.points === points);
  if (!cands.length) cands = inCat;
  if (!cands.length) return null;
  // الأولوية: أسئلة لم ترها ← أسئلة أخطأت فيها ← أسئلة أجابت عنها صحيحًا
  const seen = me.seen || {};
  const rank = (q) => (seen[q.id] === undefined ? 0 : seen[q.id] === 0 ? 1 : 2);
  const best = Math.min(...cands.map(rank));
  return shuffle(cands.filter((q) => rank(q) === best))[0];
}

function teamsBar() {
  return `<div class="teams-bar">${TEAMS.map((t) => {
    const mine = t.id === me.team;
    const total = (teamTotals[t.id] || 0) + (mine ? round.score : 0);
    return `<div class="team-card ${mine ? 'mine' : ''}">
      ${mine ? '<span class="tag">فريقك</span>' : ''}
      <div class="tname"><i style="background:${t.color}"></i>${t.name}</div>
      <div class="tscore">${toAr(total)}</div>
      ${mine ? `<div class="helps" aria-label="المساعدات">${HELPS.map((h) => `<span class="help-btn" title="${h.name}" style="${round.helps[h.id] ? 'opacity:.35;text-decoration:line-through' : ''}"><b>${h.short}</b></span>`).join('')}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function showBoard() {
  const done = round.answers.length;
  const finished = done >= APP.roundSize;
  render(`
    ${header('<button class="btn ghost small" id="home">الرئيسية</button>')}
    ${teamsBar()}
    <div class="board" role="grid" aria-label="لوحة الأسئلة">
      ${TABLES.map((tb) => `
        <div class="col" role="row">
          <div class="cat" role="columnheader"><div><span class="cnum">× ${toAr(tb.key)}</span>${tb.category}</div></div>
          ${BOARD_ROWS.map((pts, r) => {
            const k = `${tb.key}-${r}`;
            const c = round.cells[k];
            if (c) return `<button class="cell done ${c.correct ? 'ok' : 'bad'}" disabled aria-label="تمت الإجابة">${c.correct ? '✓ ' + toAr(c.points) : '✗'}</button>`;
            return `<button class="cell" data-k="${k}" data-cat="${tb.category}" data-pts="${pts}" ${finished ? 'disabled' : ''} aria-label="${tb.category} ${toAr(pts)} نقطة">${toAr(pts)}</button>`;
          }).join('')}
        </div>`).join('')}
    </div>
    <div class="board-foot">
      <div class="progress-pill">السؤال <b>${toAr(Math.min(done + 1, APP.roundSize))}</b> من ${toAr(APP.roundSize)} · نقاط الجولة: <b>${toAr(round.score)}</b></div>
      <button class="btn ${finished ? 'primary' : 'ghost'} small" id="finish" ${done ? '' : 'disabled'}>إنهاء الجولة وعرض النتيجة</button>
    </div>
    <p style="color:var(--muted);font-size:15px">اختاري أي مربع. الأرقام تعني النقاط: ${toAr(10)} سهل، ${toAr(20)} متوسط، ${toAr(30)} صعب. لديك ثلاث مساعدات في كل جولة.</p>`);
  $('#home').onclick = showHome;
  $('#finish').onclick = () => {
    if (round.answers.length < APP.roundSize && !confirm(`أجبتِ عن ${toAr(round.answers.length)} من ${toAr(APP.roundSize)} أسئلة. هل تريدين إنهاء الجولة الآن؟`)) return;
    finishRound();
  };
  $$('.cell[data-k]').forEach((b) => { b.onclick = () => openQuestion(b.dataset.k, b.dataset.cat, Number(b.dataset.pts)); });
  if (finished) setTimeout(finishRound, 400);
}

function openQuestion(cellKey, category, pts) {
  const q = pickQuestion(category, pts);
  if (!q) { toast('انتهت أسئلة هذا المجال، اختاري مجالًا آخر'); return; }
  const tb = tableByCategory(category);
  const state = { removed: new Set(), retryArmed: false, wrongTries: new Set(), locked: false };
  const helpBtns = () => HELPS.map((h) => `<button class="help-btn" data-help="${h.id}" ${round.helps[h.id] ? 'disabled' : ''}><b>${h.short}</b> ${h.name}</button>`).join('');
  modalRoot.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="q-text">
      <div class="modal-card">
        <div class="q-meta">
          <span class="chip">${esc(q.category)}</span>
          <span class="chip">${esc(q.type)}</span>
          <span class="chip pts">${toAr(q.points)} نقطة</span>
        </div>
        <div class="q-text" id="q-text">${esc(q.question)}</div>
        <div class="options">
          ${q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}
        </div>
        <div class="q-helps" id="q-helps">${helpBtns()}</div>
        <div id="hint" class="hint-box hidden"></div>
        <div id="fb"></div>
      </div>
    </div>`;
  const opts = $$('.opt', modalRoot);
  opts[0].focus({ preventScroll: true });

  $$('[data-help]', modalRoot).forEach((b) => {
    b.onclick = () => {
      if (state.locked) return;
      const id = b.dataset.help;
      round.helps[id] = true; saveRoundLocal();
      b.disabled = true;
      if (id === 'fifty') {
        const wrong = shuffle([0, 1, 2, 3].filter((i) => i !== q.correctIndex && !state.wrongTries.has(i))).slice(0, 2);
        wrong.forEach((i) => { state.removed.add(i); opts[i].classList.add('removed'); opts[i].disabled = true; });
      } else if (id === 'hint') {
        const h = $('#hint', modalRoot); h.textContent = tb ? tb.hint : 'اقرئي السؤال بهدوء وفكّري في معنى الضرب.'; h.classList.remove('hidden');
      } else if (id === 'retry') {
        state.retryArmed = true; b.classList.add('active'); b.disabled = false; b.onclick = null;
        toast('مُفعّلة: إن أخطأتِ يمكنك المحاولة مرة ثانية');
      }
    };
  });

  opts.forEach((b) => {
    b.onclick = () => {
      if (state.locked) return;
      const i = Number(b.dataset.i);
      const correct = i === q.correctIndex;
      if (!correct && state.retryArmed) {
        state.retryArmed = false; state.wrongTries.add(i);
        b.classList.add('bad'); b.disabled = true;
        $('[data-help="retry"]', modalRoot).classList.remove('active');
        $('[data-help="retry"]', modalRoot).disabled = true;
        $('#fb', modalRoot).innerHTML = '<div class="feedback info">ليست هذه الإجابة، حاولي مرة أخرى</div>';
        return;
      }
      state.locked = true;
      opts.forEach((o) => { o.disabled = true; });
      opts[q.correctIndex].classList.add('ok');
      if (!correct) b.classList.add('bad');
      $$('[data-help]', modalRoot).forEach((x) => { x.disabled = true; });
      const gained = correct ? q.points : 0;
      round.score += gained;
      round.answers.push({ qid: q.id, category: q.category, type: q.type, difficulty: q.difficulty, points: q.points, correct, chosen: i, cell: cellKey });
      round.cells[cellKey] = { qid: q.id, correct, points: gained };
      saveRoundLocal();
      const last = round.answers.length >= APP.roundSize;
      $('#fb', modalRoot).innerHTML = `
        <div class="feedback ${correct ? 'ok' : 'bad'}">
          <span>${correct ? `إجابة صحيحة! +${toAr(q.points)} نقطة` : `الإجابة الصحيحة: ${esc(q.options[q.correctIndex])}`}</span>
          <button class="btn primary" id="next">${last ? 'عرض النتيجة' : 'متابعة'}</button>
        </div>`;
      const next = $('#next', modalRoot); next.focus();
      next.onclick = () => { modalRoot.innerHTML = ''; if (last) finishRound(); else showBoard(); };
    };
  });
}

let finishing = false;
async function finishRound() {
  if (finishing || !round) return;
  finishing = true;
  const r = {
    id: 'r' + round.startedAt.toString(36) + Math.random().toString(36).slice(2, 7),
    startedAt: round.startedAt,
    finishedAt: Date.now(),
    score: round.score,
    correct: round.answers.filter((a) => a.correct).length,
    answered: round.answers.length,
    answers: round.answers.map(({ qid, category, type, difficulty, points, correct, chosen }) => ({ qid, category, type, difficulty, points, correct, chosen })),
    helpsUsed: Object.keys(round.helps).filter((k) => round.helps[k]),
    name: me.name,
    team: me.team,
  };
  lsSet(pendingKey(), r);
  lsSet(roundKey(), null);
  round = null;
  showResult(r);
  finishing = false;
}

function journeyPath(done) {
  const n = APP.journeyRounds;
  return `<div class="journey" role="img" aria-label="أكملتِ ${toAr(Math.min(done, n))} من ${toAr(n)} جولة">
    ${Array.from({ length: n }, (_, i) => {
      const last = i === n - 1;
      const cls = i < done ? 'done' : i === done ? 'next' : '';
      return `<span class="step ${cls} ${last ? 'goal' : ''}">${last ? ICONS.trophy : toAr(i + 1)}</span>`;
    }).join('')}
  </div>`;
}

function starsHtml(k) {
  return `<div class="stars" aria-label="${toAr(k)} من ٣ نجوم">${[0, 1, 2].map((i) => `<span class="${i < k ? 'on' : ''}">${ICONS.star}</span>`).join('')}</div>`;
}

async function showResult(r) {
  const full = r.answered >= APP.roundSize;
  const before = me.fullRounds || 0;
  const num = full ? before + 1 : before; // رقم هذه الجولة في رحلة البطلة
  const earned = full && !me.certificates && num >= APP.journeyRounds;
  const msg = !full ? 'أنهيتِ الجولة مبكرًا'
    : num <= APP.journeyRounds ? `الجولة ${ordinal(num)}: ${encouragementFor(num)}`
    : 'أحسنتِ! واصلي التدريب لتزيدي نقاط فريقك';
  render(`
    ${header()}
    <div class="center-col panel result">
      ${full ? starsHtml(starsFor(r.correct)) : ''}
      <h2 style="margin:0">${msg}</h2>
      <div class="big">${toAr(r.score)}</div>
      <div style="font-size:20px;font-weight:700">نقطة · ${toAr(r.correct)} إجابات صحيحة من ${toAr(r.answered)}</div>
      <div style="margin:14px 0"><span id="save-status" class="save-status saving">جارٍ حفظ النتيجة…</span></div>
      ${me.certificates && !earned ? '' : `<div style="margin:6px 0 16px">${journeyPath(Math.min(num, APP.journeyRounds))}</div>`}
      <div class="stack">
        ${earned ? '<button class="btn primary block" id="cert" style="min-height:64px">مبارك! اعرضي شهادة «بطلة الجداول»</button>'
          : !full ? `<p class="note">الجولة تُحسب في رحلتك عندما تجيبين عن الأسئلة ${toAr(APP.roundSize)} كلها.</p>`
          : me.certificates ? '' : `<p class="note">${APP.journeyRounds - num === 1 ? 'بقيت جولة واحدة' : `بقي ${toAr(APP.journeyRounds - num)} من ${toAr(APP.journeyRounds)} جولة`} على شهادة «بطلة الجداول».</p>`}
        <button class="btn block" id="again">جولة جديدة</button>
        <button class="btn ghost block" id="lb">لوحة النتائج</button>
        <button class="btn ghost block" id="home">الرئيسية</button>
      </div>
      <ul class="answers-list">
        ${r.answers.map((a, i) => {
          const q = pool.find((x) => x.id === a.qid);
          return `<li><span>${toAr(i + 1)}. ${esc(q ? q.question : '')}</span><span>${a.correct ? '✓' : '✗'}</span></li>`;
        }).join('')}
      </ul>
    </div>`);
  $('#again').onclick = () => startRound(true);
  $('#lb').onclick = showLeaderboard;
  $('#home').onclick = showHome;
  if (earned) $('#cert').onclick = () => showCertificate();
  await saveResult(r);
}

async function saveResult(r) {
  const el = $('#save-status');
  const btns = $$('#again, #lb, #home, #cert');
  btns.forEach((b) => { b.disabled = true; });
  try {
    me = await store.saveRound(me, r);
    lsSet(pendingKey(), null);
    if (el) { el.className = 'save-status saved'; el.textContent = '✓ تم حفظ النتيجة'; }
  } catch (e) {
    console.error(e);
    if (el) {
      el.className = 'save-status failed';
      el.innerHTML = 'لم تُحفظ النتيجة بعد (تحققي من الإنترنت) <button class="btn small" id="retry-save">إعادة المحاولة</button>';
      $('#retry-save').onclick = () => { el.className = 'save-status saving'; el.textContent = 'جارٍ حفظ النتيجة…'; saveResult(r); };
    }
  } finally { btns.forEach((b) => { b.disabled = false; }); }
}

// ================= لوحة النتائج =================
async function showLeaderboard() {
  render(`${header('<button class="btn ghost small" id="home">الرئيسية</button>')}<div class="loading">جارٍ تحميل النتائج…</div>`);
  $('#home').onclick = showHome;
  const lb = await refreshTeamTotals();
  const teams = [...TEAMS].sort((a, b) => teamTotals[b.id] - teamTotals[a.id]);
  const top = [...lb].sort((a, b) => b.total - a.total).slice(0, 10);
  render(`
    ${header('<button class="btn ghost small" id="home">الرئيسية</button>')}
    <div class="home-grid">
      <section class="panel">
        <h2 class="section-title">ترتيب الفرق</h2>
        <div class="team-rank">
          ${teams.map((t, i) => `<div class="team-row ${i === 0 && teamTotals[t.id] > 0 ? 'first' : ''}">
            <span class="ticon">${teamIcon(t, 32)}</span>
            <span><strong>${toAr(i + 1)}. ${t.name}</strong>${t.id === me.team ? ' <span class="chip" style="font-size:12px">فريقك</span>' : ''}</span>
            <b>${toAr(teamTotals[t.id])}</b>
          </div>`).join('')}
        </div>
      </section>
      <section class="panel">
        <h2 class="section-title">أبطال الجداول</h2>
        ${top.length ? `<table class="lb"><thead><tr><th>#</th><th>الاسم</th><th>الفريق</th><th>النقاط</th></tr></thead><tbody>
          ${top.map((s, i) => { const t = teamById(s.team); return `<tr ${s.uid === me.uid ? 'style="background:rgba(251,191,36,.15)"' : ''}><td class="rank">${toAr(i + 1)}</td><td>${esc(s.name.split(' ')[0])}</td><td><span class="team-dot" style="background:${t.color}"></span>${t.short}</td><td><b>${toAr(s.total)}</b></td></tr>`; }).join('')}
        </tbody></table>` : '<p>لا توجد نتائج بعد. كوني أول بطلة!</p>'}
      </section>
    </div>`);
  $('#home').onclick = showHome;
}

// ================= الشهادة =================
async function showCertificate() {
  const c = me.lastCertificate;
  if (!c) return toast('لم تحصلي على الشهادة بعد');
  render(`
    ${header('<button class="btn ghost small" id="home">الرئيسية</button>')}
    <div class="panel">
      <div class="cert-wrap"><img id="cert-img" alt="شهادة بطلة الجداول"></div>
      <div class="cert-actions">
        <button class="btn primary" id="dl">حفظ الشهادة صورة</button>
        <button class="btn" id="print">طباعة</button>
      </div>
    </div>`);
  $('#home').onclick = showHome;
  const canvas = await drawCertificate({ name: me.name, team: teamById(me.team).name, score: c.score, correct: c.correct, answered: c.answered, rounds: c.rounds, date: c.at });
  const url = canvas.toDataURL('image/png');
  $('#cert-img').src = url;
  $('#print').onclick = () => window.print();
  $('#dl').onclick = async () => {
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], 'شهادة-بطلة-الجداول.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'شهادة بطلة الجداول' });
        return;
      }
    } catch (e) { if (e?.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = url; a.download = 'شهادة-بطلة-الجداول.png';
    document.body.appendChild(a); a.click(); a.remove();
  };
}

// ================= التشغيل =================
(async function main() {
  registerSW();
  try {
    store = await getStore();
    if (store.mode === 'local') $('#demo-banner').classList.remove('hidden');
    me = await store.currentStudent();
    if (me?.needsProfile) { await store.signOut(); me = null; }
    if (me) await afterLogin(); else showWelcome();
  } catch (e) {
    console.error(e);
    render(`<div class="loading">تعذر تشغيل اللعبة. تأكدي من الاتصال بالإنترنت ثم أعيدي تحميل الصفحة.<br><button class="btn" onclick="location.reload()">إعادة التحميل</button></div>`);
  }
})();

window.__abtal = { get me() { return me; }, get round() { return round; }, get pool() { return pool; } };
