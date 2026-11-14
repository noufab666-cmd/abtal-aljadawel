import {
  APP, TABLES, TEAMS, teamBadge, DIFFICULTIES, QUESTION_TYPES, ICONS, teamById, toAr, fmtDateTime, pct, esc, $, $$, toast,
  loadBuiltInQuestions, validateQuestion, pointsFor, registerSW,
} from './common.js';
import { getStore, StoreError, DEMO_TEACHER_PASSWORD } from './store.js';

const app = $('#app');
const modalRoot = $('#modal-root');
let store;
let tab = 'results';
let students = [];
let sortKey = 'totalScore';
let teamFilter = '';

const pctBadge = (c, n) => {
  if (!n) return '<span class="pct na">—</span>';
  const p = pct(c, n);
  return `<span class="pct ${p >= 80 ? 'hi' : p >= 50 ? 'mid' : 'lo'}">${toAr(p)}٪</span>`;
};

function header() {
  return `
  <header class="topbar">
    <div class="brand">
      <div class="logo">${ICONS.times}</div>
      <div><h1>لوحة المعلمة</h1><small>${APP.title} · ${APP.initiative}</small></div>
    </div>
    <div class="top-actions">
      <a class="btn ghost small" href="./">صفحة اللعبة</a>
      ${store.isTeacher() ? '<button class="btn ghost small" id="logout">خروج</button>' : ''}
    </div>
  </header>`;
}

function showLogin() {
  app.innerHTML = `
    ${header()}
    <div class="center-col panel light">
      <h2 class="section-title" style="color:var(--ink)">دخول المعلمة</h2>
      <form class="stack" id="f" novalidate>
        <label class="field">كلمة المرور
          <input id="pw" type="password" autocomplete="current-password" required>
          ${store.mode === 'local' ? `<span class="help">في الوضع التجريبي كلمة المرور: ${DEMO_TEACHER_PASSWORD}</span>` : ''}
        </label>
        <div id="err" class="error hidden" role="alert"></div>
        <button class="btn primary block" id="go">دخول</button>
      </form>
    </div>`;
  $('#pw').focus();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    $('#go').disabled = true;
    try { await store.teacherSignIn($('#pw').value); await showDashboard(); }
    catch (ex) {
      $('#err').textContent = ex instanceof StoreError ? ex.message : 'تعذر الدخول';
      $('#err').classList.remove('hidden');
    } finally { const b = $('#go'); if (b) b.disabled = false; }
  };
}

async function showDashboard() {
  app.innerHTML = `
    ${header()}
    <nav class="tabs" role="tablist">
      ${[['results', 'نتائج الطالبات'], ['teams', 'الفرق'], ['questions', 'الأسئلة'], ['settings', 'الإعدادات']]
        .map(([id, n]) => `<button role="tab" data-tab="${id}" aria-selected="${tab === id}">${n}</button>`).join('')}
    </nav>
    <section id="view"><div class="loading">جارٍ التحميل…</div></section>`;
  $('#logout').onclick = async () => { await store.signOut(); showLogin(); };
  $$('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; showDashboard(); }; });
  try {
    if (tab === 'results') await viewResults();
    else if (tab === 'teams') await viewTeams();
    else if (tab === 'questions') await viewQuestions();
    else viewSettings();
  } catch (e) {
    console.error(e);
    $('#view').innerHTML = `<div class="error">تعذر تحميل البيانات: ${esc(e.message || e)}</div>`;
  }
}

// ================= النتائج =================
async function viewResults() {
  students = await store.listStudents();
  const totalRounds = students.reduce((s, x) => s + (x.roundsPlayed || 0), 0);
  const c = students.reduce((s, x) => s + (x.totalCorrect || 0), 0);
  const n = students.reduce((s, x) => s + (x.totalAnswered || 0), 0);
  const certs = students.filter((x) => x.certificates > 0).length;
  $('#view').innerHTML = `
    <div class="kpis">
      <div class="kpi"><b>${toAr(students.length)}</b><span>طالبة مسجّلة</span></div>
      <div class="kpi"><b>${toAr(totalRounds)}</b><span>جولة مكتملة</span></div>
      <div class="kpi"><b>${toAr(pct(c, n))}٪</b><span>متوسط الإجابات الصحيحة</span></div>
      <div class="kpi"><b>${toAr(certs)}</b><span>حصلن على شهادة «بطلة الجداول»</span></div>
    </div>
    <div class="toolbar">
      <select id="team-filter" aria-label="تصفية حسب الفريق">
        <option value="">كل الفرق</option>
        ${TEAMS.map((t) => `<option value="${t.id}" ${teamFilter === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
      <input id="search" placeholder="بحث بالاسم" aria-label="بحث بالاسم">
      <button class="btn small" id="csv">تنزيل النتائج (Excel)</button>
      <button class="btn ghost small" id="reload">تحديث</button>
    </div>
    <div class="table-scroll"><table class="data">
      <thead><tr>
        <th data-sort="name">الاسم</th><th data-sort="team">الفريق</th><th data-sort="roundsPlayed">الجولات</th>
        <th data-sort="totalScore">النقاط</th><th data-sort="bestScore">أفضل جولة</th><th data-sort="acc">الدقة</th>
        ${TABLES.map((t) => `<th>${t.category}</th>`).join('')}
        <th data-sort="lastPlayed">آخر لعب</th><th></th>
      </tr></thead>
      <tbody id="rows"></tbody>
    </table></div>`;
  $('#team-filter').onchange = (e) => { teamFilter = e.target.value; drawRows(); };
  $('#search').oninput = drawRows;
  $('#reload').onclick = showDashboard;
  $('#csv').onclick = exportCsv;
  $$('[data-sort]').forEach((th) => { th.onclick = () => { sortKey = th.dataset.sort; drawRows(); }; });
  drawRows();
}

function filtered() {
  const q = ($('#search')?.value || '').trim();
  const list = students.filter((s) => (!teamFilter || s.team === teamFilter) && (!q || s.name.includes(q)));
  const val = (s) => (sortKey === 'acc' ? pct(s.totalCorrect, s.totalAnswered) : s[sortKey] ?? 0);
  return list.sort((a, b) => {
    const x = val(a); const y = val(b);
    return typeof x === 'string' ? x.localeCompare(y, 'ar') : y - x;
  });
}

function drawRows() {
  const list = filtered();
  $('#rows').innerHTML = list.length ? list.map((s) => {
    const t = teamById(s.team);
    return `<tr>
      <td><strong>${esc(s.name)}</strong></td>
      <td><span class="team-dot" style="background:${t.color}"></span>${t.name}</td>
      <td>${toAr(s.roundsPlayed || 0)}</td>
      <td><strong>${toAr(s.totalScore || 0)}</strong></td>
      <td>${toAr(s.bestScore || 0)}</td>
      <td>${pctBadge(s.totalCorrect, s.totalAnswered)}</td>
      ${TABLES.map((tb) => { const st = s.tableStats?.[tb.key] || {}; return `<td>${pctBadge(st.c, st.n)}</td>`; }).join('')}
      <td>${fmtDateTime(s.lastPlayed)}</td>
      <td><button class="btn small" data-uid="${s.uid}">التفاصيل</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="${9 + TABLES.length}" style="text-align:center;padding:30px">لا توجد طالبات بعد. شاركي رابط اللعبة مع الطالبات.</td></tr>`;
  $$('[data-uid]').forEach((b) => { b.onclick = () => showStudent(b.dataset.uid); });
}

async function showStudent(uid) {
  const s = students.find((x) => x.uid === uid);
  modalRoot.innerHTML = `<div class="modal"><div class="modal-card wide"><div class="loading" style="color:#334">جارٍ التحميل…</div></div></div>`;
  let rounds = [];
  try { rounds = await store.listRounds(uid); } catch (e) { console.error(e); }
  const t = teamById(s.team);
  modalRoot.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-card wide stack">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 style="margin:0">${esc(s.name)}</h2>
          <button class="btn small" id="close">إغلاق</button>
        </div>
        <div class="detail-grid">
          <div class="chip">الرمز السري: <b>${toAr(s.pin || '—')}</b></div>
          <div class="chip">${t.name}</div>
          <div class="chip">تاريخ التسجيل: ${fmtDateTime(s.createdAt)}</div>
          <div class="chip">مجموع النقاط: <b>${toAr(s.totalScore)}</b></div>
          <div class="chip">الشهادات: <b>${toAr(s.certificates || 0)}</b></div>
          <div class="chip">الدقة: <b>${toAr(pct(s.totalCorrect, s.totalAnswered))}٪</b></div>
        </div>
        <h3 style="margin:8px 0 0">الجولات (${toAr(rounds.length)})</h3>
        <div class="table-scroll" style="border:1px solid #e5e9f6">
          <table class="data" style="min-width:600px"><thead><tr><th>التاريخ</th><th>النقاط</th><th>الصحيحة</th><th>المساعدات</th><th>الأخطاء</th></tr></thead><tbody>
          ${rounds.map((r) => `<tr>
            <td>${fmtDateTime(r.finishedAt)}</td><td><b>${toAr(r.score)}</b></td><td>${toAr(r.correct)} / ${toAr(r.answered)}</td>
            <td>${toAr((r.helpsUsed || []).length)}</td>
            <td>${(r.answers || []).filter((a) => !a.correct).map((a) => `<span class="chip" style="font-size:12px">${esc(a.category)} · سؤال ${toAr(String(a.qid).replace('c-', 'م-'))}</span>`).join(' ') || '—'}</td>
          </tr>`).join('') || '<tr><td colspan="5">لم تلعب أي جولة بعد</td></tr>'}
          </tbody></table>
        </div>
        <div class="toolbar" style="margin:0">
          <label>تغيير الفريق:
            <select id="team-sel" style="border:1px solid #ccd">${TEAMS.map((x) => `<option value="${x.id}" ${x.id === s.team ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
          </label>
          <button class="btn small" id="save-team">حفظ الفريق</button>
          <button class="btn danger small" id="del">حذف بيانات الطالبة</button>
        </div>
      </div>
    </div>`;
  $('#close').onclick = () => { modalRoot.innerHTML = ''; };
  $('#save-team').onclick = async () => {
    await store.setStudentTeam(uid, $('#team-sel').value);
    toast('تم تغيير الفريق', 'ok'); modalRoot.innerHTML = ''; showDashboard();
  };
  $('#del').onclick = async () => {
    if (!confirm(`حذف كل نتائج «${s.name}»؟ لا يمكن التراجع.`)) return;
    await store.deleteStudent(uid);
    toast('تم الحذف', 'ok'); modalRoot.innerHTML = ''; showDashboard();
  };
}

function exportCsv() {
  const head = ['الاسم', 'الفريق', 'الجولات', 'النقاط', 'أفضل جولة', 'الإجابات الصحيحة', 'عدد الإجابات', 'الدقة %', ...TABLES.map((t) => t.category + ' %'), 'الشهادات', 'آخر لعب'];
  const rows = filtered().map((s) => [
    s.name, teamById(s.team).name, s.roundsPlayed, s.totalScore, s.bestScore, s.totalCorrect, s.totalAnswered, pct(s.totalCorrect, s.totalAnswered),
    ...TABLES.map((t) => { const st = s.tableStats?.[t.key] || {}; return st.n ? pct(st.c, st.n) : ''; }),
    s.certificates || 0, s.lastPlayed ? new Date(s.lastPlayed).toLocaleString('ar-SA-u-ca-gregory') : '',
  ]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'نتائج-أبطال-الجداول.csv';
  document.body.appendChild(a); a.click(); a.remove();
}

// ================= الفرق =================
async function viewTeams() {
  const lb = await store.leaderboard();
  const totals = Object.fromEntries(TEAMS.map((t) => [t.id, { total: 0, count: 0 }]));
  lb.forEach((r) => { if (totals[r.team]) { totals[r.team].total += r.total || 0; totals[r.team].count += 1; } });
  const sorted = [...TEAMS].sort((a, b) => totals[b.id].total - totals[a.id].total);
  $('#view').innerHTML = `
    <div class="team-rank">
      ${sorted.map((t, i) => `<div class="team-row ${i === 0 && totals[t.id].total ? 'first' : ''}">
        <span class="ticon">${teamBadge(t, 32)}</span>
        <span><strong>${toAr(i + 1)}. ${t.name}</strong><br><small style="color:var(--muted)">${toAr(totals[t.id].count)} طالبة</small></span>
        <b>${toAr(totals[t.id].total)}</b>
      </div>`).join('')}
    </div>`;
}

// ================= الأسئلة =================
async function viewQuestions() {
  const [builtIn, custom] = await Promise.all([loadBuiltInQuestions(), store.customQuestions({ includeDisabled: true })]);
  $('#view').innerHTML = `
    <div class="panel light" style="margin-bottom:16px">
      <h2 class="section-title" style="color:var(--ink)">إضافة سؤال جديد</h2>
      <form id="qf" class="stack" novalidate>
        <div class="form-grid">
          <label class="field">المجال<select id="q-cat">${TABLES.map((t) => `<option>${t.category}</option>`).join('')}</select></label>
          <label class="field">نوع السؤال<select id="q-type">${QUESTION_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></label>
          <label class="field">الصعوبة<select id="q-diff">${DIFFICULTIES.map((d) => `<option value="${d.name}" ${d.name === 'متوسط' ? 'selected' : ''}>${d.name} (${toAr(d.points)} نقطة)</option>`).join('')}</select></label>
          <label class="field full">نص السؤال<textarea id="q-text" placeholder="مثال: ما ناتج ٦ × ٥؟"></textarea></label>
        </div>
        <div class="field">الخيارات الأربعة (اختاري الدائرة بجانب الإجابة الصحيحة)
          <div class="opt-inputs">
            ${[0, 1, 2, 3].map((i) => `<label><input type="radio" name="right" value="${i}" ${i === 0 ? 'checked' : ''} aria-label="الإجابة الصحيحة ${toAr(i + 1)}"><input type="text" class="q-opt" placeholder="الخيار ${toAr(i + 1)}"></label>`).join('')}
          </div>
        </div>
        <div id="q-err" class="error hidden"></div>
        <button class="btn primary">إضافة السؤال</button>
      </form>
    </div>
    <div class="toolbar">
      <select id="q-filter"><option value="">كل المجالات</option>${TABLES.map((t) => `<option>${t.category}</option>`).join('')}</select>
      <span>الأسئلة الأساسية: ${toAr(builtIn.length)} · أسئلة أضفتِها: ${toAr(custom.length)}</span>
    </div>
    <div class="q-list" id="q-list"></div>`;

  const draw = () => {
    const f = $('#q-filter').value;
    const all = [...custom, ...builtIn].filter((q) => !f || q.category === f);
    $('#q-list').innerHTML = all.map((q) => `
      <div class="q-item ${q.enabled === false ? 'off' : ''}">
        <div class="q-top">
          <span class="chip">${q.builtIn ? 'أساسي ' + toAr(q.id) : 'مضاف'}</span>
          <span class="chip">${esc(q.category)}</span><span class="chip">${esc(q.type)}</span>
          <span class="chip pts">${esc(q.difficulty)} · ${toAr(q.points)}</span>
          ${q.builtIn ? '' : `
            <button class="btn small" data-toggle="${q.docId}" data-on="${q.enabled !== false}">${q.enabled === false ? 'تفعيل' : 'إيقاف'}</button>
            <button class="btn danger small" data-del="${q.docId}">حذف</button>`}
        </div>
        <div style="font-weight:800;font-size:19px">${esc(q.question)}</div>
        <div class="q-opts">${q.options.map((o, i) => `<span class="${i === q.correctIndex ? 'right' : ''}">${esc(o)}</span>`).join('')}</div>
      </div>`).join('');
    $$('[data-toggle]').forEach((b) => { b.onclick = async () => { await store.updateQuestion(b.dataset.toggle, { enabled: b.dataset.on !== 'true' }); viewQuestions(); }; });
    $$('[data-del]').forEach((b) => { b.onclick = async () => { if (confirm('حذف هذا السؤال؟')) { await store.deleteQuestion(b.dataset.del); toast('تم حذف السؤال', 'ok'); viewQuestions(); } }; });
  };
  $('#q-filter').onchange = draw;
  draw();

  $('#qf').onsubmit = async (e) => {
    e.preventDefault();
    const q = {
      category: $('#q-cat').value,
      type: $('#q-type').value,
      difficulty: $('#q-diff').value,
      question: $('#q-text').value.trim(),
      options: $$('.q-opt').map((i) => i.value.trim()),
      correctIndex: Number($('input[name=right]:checked').value),
    };
    q.points = pointsFor(q.difficulty);
    q.source = 'أضافته المعلمة';
    const errs = validateQuestion(q);
    if (errs.length) { $('#q-err').textContent = errs.join('، '); $('#q-err').classList.remove('hidden'); return; }
    try {
      await store.addQuestion(q);
      toast('تمت إضافة السؤال', 'ok');
      viewQuestions();
    } catch (ex) { $('#q-err').textContent = 'تعذر الحفظ: ' + (ex.message || ex); $('#q-err').classList.remove('hidden'); }
  };
}

// ================= الإعدادات =================
function viewSettings() {
  const url = new URL('./', location.href).href;
  $('#view').innerHTML = `
    <div class="home-grid">
      <div class="panel light stack">
        <h2 class="section-title" style="color:var(--ink)">رابط اللعبة للطالبات</h2>
        <input readonly value="${esc(url)}" style="direction:ltr;padding:12px;border-radius:12px;border:2px solid #d5dbf2;font-size:16px" id="link">
        <button class="btn" id="copy">نسخ الرابط</button>
        <p class="note">حفظ النتائج: ${store.mode === 'firebase' ? 'مرتبط بقاعدة البيانات (تُحفظ النتائج بين الأجهزة) ✓' : 'وضع تجريبي على هذا الجهاز فقط — أكملي خطوات ربط Firebase في دليل النشر'}</p>
      </div>
      <form class="panel light stack" id="pwf">
        <h2 class="section-title" style="color:var(--ink)">تغيير كلمة مرور المعلمة</h2>
        <label class="field">كلمة المرور الجديدة<input type="password" id="np" autocomplete="new-password" minlength="6"></label>
        <button class="btn">حفظ كلمة المرور</button>
      </form>
    </div>`;
  $('#copy').onclick = async () => { try { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط', 'ok'); } catch { $('#link').select(); } };
  $('#pwf').onsubmit = async (e) => {
    e.preventDefault();
    const pw = $('#np').value;
    if (pw.length < 6) return toast('كلمة المرور ٦ أحرف على الأقل', 'bad');
    try { await store.changeTeacherPassword(pw); toast('تم تغيير كلمة المرور', 'ok'); $('#np').value = ''; }
    catch (ex) { toast(ex.message || 'تعذر التغيير', 'bad'); }
  };
}

(async function main() {
  registerSW();
  try {
    store = await getStore();
    if (store.mode === 'local') $('#demo-banner').classList.remove('hidden');
    if (store.isTeacher()) await showDashboard(); else showLogin();
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="loading">تعذر التحميل. تحققي من الاتصال ثم أعيدي تحميل الصفحة.</div>';
  }
})();
