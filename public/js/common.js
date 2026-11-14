// أدوات مشتركة بين صفحة اللعبة ولوحة المعلمة

export const APP = {
  title: 'أبطال الجداول',
  initiative: 'Smart Math | رياضيات بذكاء',
  author: 'إعداد أ. نوف الحربي',
  roundSize: 10,
  journeyRounds: 12, // عدد الجولات المكتملة (١٠ أسئلة) للحصول على شهادة «بطلة الجداول»
};

// رحلة البطلة: كلمة تعزيز خاصة بكل جولة مكتملة
export const ORDINALS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'];
export const ENCOURAGEMENTS = [
  'بداية رائعة! خطوتك الأولى في رحلة البطلات',
  'أحسنتِ! أنتِ تتقدمين بثبات',
  'ممتاز! التدريب يجعلكِ أقوى',
  'رائع! أنهيتِ ثلث الرحلة',
  'استمري، أنتِ على الطريق الصحيح',
  'نصف الرحلة! أنتِ مثابرة حقًا',
  'تفكيرك يزداد سرعة ودقة',
  'مدهش! الجداول أصبحت صديقتك',
  'أنتِ قريبة جدًا من القمة',
  'عشر جولات! يا لكِ من بطلة مجتهدة',
  'بقيت جولة واحدة فقط على الشهادة',
  'مبارك! أكملتِ الرحلة وأصبحتِ بطلة الجداول',
];
export const encouragementFor = (n) => ENCOURAGEMENTS[Math.min(n, ENCOURAGEMENTS.length) - 1] || 'أحسنتِ! واصلي التدريب لتصبحي أمهر';
export const ordinal = (n) => ORDINALS[n - 1] || toAr(n);
// نجوم الجولة حسب الإجابات الصحيحة
export const starsFor = (correct) => (correct >= 9 ? 3 : correct >= 6 ? 2 : 1);

// المجالات الستة (الترتيب من اليمين إلى اليسار)
export const TABLES = [
  { key: '0', category: 'جدول ٠', hint: 'تذكّري: ناتج ضرب أي عدد في ٠ هو ٠ دائمًا، فالمجموعات الفارغة لا تحتوي على شيء.' },
  { key: '1', category: 'جدول ١', hint: 'تذكّري: ناتج ضرب أي عدد في ١ هو العدد نفسه (العنصر المحايد).' },
  { key: '2', category: 'جدول ٢', hint: 'تذكّري: الضرب في ٢ يعني مضاعفة العدد، أي العدد + العدد.' },
  { key: '4', category: 'جدول ٤', hint: 'تذكّري: الضرب في ٤ يعني مضاعفة العدد ثم مضاعفته مرة أخرى.' },
  { key: '5', category: 'جدول ٥', hint: 'تذكّري: نواتج الضرب في ٥ آحادها ٠ أو ٥، ونعدّ قفزيًا: ٥، ١٠، ١٥…' },
  { key: '10', category: 'جدول ١٠', hint: 'تذكّري: عند الضرب في ١٠ نكتب العدد ونضع ٠ في خانة الآحاد.' },
];
export const tableByCategory = (c) => TABLES.find((t) => t.category === c);

export const DIFFICULTIES = [
  { name: 'سهل', points: 10 },
  { name: 'متوسط', points: 20 },
  { name: 'صعب', points: 30 },
];
export const pointsFor = (difficulty) => (DIFFICULTIES.find((d) => d.name === difficulty) || DIFFICULTIES[1]).points;

export const QUESTION_TYPES = ['حقائق الضرب', 'خصائص الضرب والتفكير الرياضي', 'مسائل لفظية ومجموعات متساوية', 'الأنماط العددية'];

// صفوف لوحة الأسئلة (مثل الصور المرجعية: قيمتان لكل مستوى)
export const BOARD_ROWS = [10, 10, 20, 20, 30, 30];

// الفرق بأسماء علماء رياضيات مسلمين (المعرّفات الداخلية ثابتة لأنها مستخدمة في قواعد الحماية)
export const TEAMS = [
  { id: 'stars', name: 'فريق الخوارزمي', short: 'الخوارزمي', letter: 'خ', color: '#fbbf24', about: 'مؤسس علم الجبر' },
  { id: 'moons', name: 'فريق البيروني', short: 'البيروني', letter: 'ب', color: '#93c5fd', about: 'عالم الرياضيات والفلك' },
  { id: 'pearls', name: 'فريق ابن الهيثم', short: 'ابن الهيثم', letter: 'هـ', color: '#f9a8d4', about: 'عالم الرياضيات والبصريات' },
  { id: 'flowers', name: 'فريق الكاشي', short: 'الكاشي', letter: 'ك', color: '#86efac', about: 'عالم الحساب والكسور العشرية' },
];
// شارة الفريق: دائرة ملوّنة بأول حرف من اسم العالِم (بدون صور أو شخصيات)
export const teamBadge = (t, size = 28) => `<span class="team-badge" aria-hidden="true" style="background:${t.color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px">${t.letter}</span>`;
export const teamById = (id) => TEAMS.find((t) => t.id === id) || TEAMS[0];

export const HELPS = [
  { id: 'fifty', name: 'حذف إجابتين', short: '½' },
  { id: 'hint', name: 'تلميح', short: '؟' },
  { id: 'retry', name: 'محاولة ثانية', short: '↺' },
];

// أيقونات بسيطة (أشكال فقط، بدون شخصيات)
export const ICONS = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
  pearl: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="currentColor"/><circle cx="9" cy="9" r="2.4" fill="#fff" opacity=".7"/></svg>',
  flower: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="12" cy="6" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="12" cy="18" r="4"/><circle cx="6" cy="12" r="4"/></g><circle cx="12" cy="12" r="3" fill="#fff"/></svg>',
  times: '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 1 1.7zm10 0v2.7A2 2 0 0 0 18 8V7z"/></svg>',
};

// ===== الأرقام العربية =====
const AR = '٠١٢٣٤٥٦٧٨٩';
export const toAr = (v) => String(v ?? '').replace(/[0-9]/g, (d) => AR[d]);
export const toEn = (v) => String(v ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
export const fmtDate = (ms) => {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleDateString('ar-SA-u-ca-gregory-nu-arab', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return toAr(new Date(ms).toISOString().slice(0, 10)); }
};
export const fmtDateTime = (ms) => {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('ar-SA-u-ca-gregory-nu-arab', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return fmtDate(ms); }
};
export const pct = (c, n) => (n ? Math.round((c / n) * 100) : 0);

// ===== أسماء الطالبات =====
export function cleanName(s) {
  return String(s || '').replace(/[ـ]/g, '').replace(/\s+/g, ' ').trim();
}
// توحيد الكتابة حتى لا يختلف الدخول بسبب الهمزة أو التاء المربوطة أو التشكيل
export function normalizeName(s) {
  return cleanName(s)
    .replace(/[ً-ْٰ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ی/g, 'ي')
    .replace(/ک/g, 'ك')
    // الأرقام العربية (٢) والإنجليزية (2) تُعامل كرقم واحد، فلوحة مفاتيح اللابتوب تكتب 2 والجوال يكتب ٢
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase();
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function toast(msg, kind = '') {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.className = 'show ' + kind;
  clearTimeout(box._t);
  box._t = setTimeout(() => { box.className = ''; }, 3200);
}

// ===== الأسئلة =====
export async function loadBuiltInQuestions() {
  const res = await fetch('data/questions.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('تعذر تحميل ملف الأسئلة');
  const list = await res.json();
  return list.map((q) => ({ ...q, id: String(q.id), builtIn: true }));
}

export function validateQuestion(q) {
  const errors = [];
  if (!TABLES.some((t) => t.category === q.category)) errors.push('اختاري المجال');
  if (!QUESTION_TYPES.includes(q.type)) errors.push('اختاري نوع السؤال');
  if (!q.question || q.question.trim().length < 3) errors.push('اكتبي نص السؤال');
  if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !String(o).trim())) errors.push('اكتبي الخيارات الأربعة');
  else if (new Set(q.options.map((o) => String(o).trim())).size !== 4) errors.push('الخيارات يجب أن تكون مختلفة');
  if (!(q.correctIndex >= 0 && q.correctIndex <= 3)) errors.push('حددي الإجابة الصحيحة');
  if (!DIFFICULTIES.some((d) => d.name === q.difficulty)) errors.push('اختاري مستوى الصعوبة');
  return errors;
}

export function registerSW() {
  // إذا أعاد المتصفح عرض الصفحة من ذاكرته دون تحميل (زر الرجوع أو العودة إلى التبويب) نعيد تحميلها لنحصل على أحدث نسخة
  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]emulator=1/.test(location.search)) {
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    // عند تثبيت نسخة جديدة من اللعبة نعيد تحميل الصفحة مرة واحدة تلقائيًا
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
  }
}
