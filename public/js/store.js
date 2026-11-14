// طبقة الحفظ: Firebase (للحفظ بين الأجهزة) أو وضع تجريبي محلي إن لم تُضبط إعدادات Firebase بعد
import { firebaseConfig } from './firebase-config.js';
import { normalizeName, cleanName, sha256Hex, toEn, TABLES, APP } from './common.js';

export const TEACHER_EMAIL = 'teacher@abtal-aljadawel.app';
const STUDENT_DOMAIN = 'students.abtal-aljadawel.app';
const pinToPassword = (pin) => `aj-${pin}-tbl`;

export class StoreError extends Error {
  constructor(msg, code = '') { super(msg); this.code = code; }
}

export function emptyProfile(uid, name, team, pin) {
  const tableStats = {};
  TABLES.forEach((t) => { tableStats[t.key] = { c: 0, n: 0 }; });
  return {
    uid, name: cleanName(name), nameKey: normalizeName(name), team, pin: String(pin),
    totalScore: 0, roundsPlayed: 0, totalCorrect: 0, totalAnswered: 0,
    bestScore: 0, bestCorrect: 0, certificates: 0, lastCertificate: null,
    tableStats, seen: {}, createdAt: Date.now(), lastPlayed: 0,
  };
}

export function validatePin(pin) {
  const p = toEn(pin).trim();
  if (!/^\d{4}$/.test(p)) throw new StoreError('الرمز السري يجب أن يكون ٤ أرقام');
  return p;
}
export function validateName(name) {
  const n = cleanName(name);
  if (n.length < 2) throw new StoreError('اكتبي اسمك (حرفان على الأقل)');
  if (n.length > 40) throw new StoreError('الاسم طويل جدًا');
  return n;
}

// يحسب الملف الجديد للطالبة بعد انتهاء الجولة
export function applyRound(profile, round) {
  const p = structuredClone(profile);
  p.totalScore += round.score;
  p.roundsPlayed += 1;
  p.totalCorrect += round.correct;
  p.totalAnswered += round.answered;
  p.bestScore = Math.max(p.bestScore || 0, round.score);
  p.bestCorrect = Math.max(p.bestCorrect || 0, round.correct);
  p.lastPlayed = round.finishedAt;
  p.lastRoundId = round.id;
  p.tableStats = p.tableStats || {};
  p.seen = p.seen || {};
  for (const a of round.answers) {
    const t = TABLES.find((x) => x.category === a.category);
    if (t) {
      const s = p.tableStats[t.key] || { c: 0, n: 0 };
      s.n += 1; if (a.correct) s.c += 1;
      p.tableStats[t.key] = s;
    }
    p.seen[a.qid] = a.correct ? 1 : 0;
  }
  if (round.correct >= APP.certificateMin) {
    p.certificates = (p.certificates || 0) + 1;
    p.lastCertificate = { at: round.finishedAt, score: round.score, correct: round.correct };
  }
  return p;
}

const lbEntry = (p) => ({ name: p.name, team: p.team, total: p.totalScore, rounds: p.roundsPlayed, updatedAt: p.lastPlayed || p.createdAt });

function friendlyAuthError(e) {
  const code = e?.code || '';
  if (code.includes('email-already-in-use')) return new StoreError('هذا الاسم مسجّل من قبل برمز سري مختلف. ارجعي وتأكدي من الرمز، أو أضيفي اسم العائلة إن لم يكن هذا حسابك.', 'name-taken');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-login')) return new StoreError('الاسم أو الرمز السري غير صحيح');
  if (code.includes('too-many-requests')) return new StoreError('محاولات كثيرة، انتظري قليلًا ثم حاولي مرة أخرى');
  if (code.includes('network')) return new StoreError('لا يوجد اتصال بالإنترنت، تأكدي من الاتصال ثم حاولي مرة أخرى');
  if (code.includes('operation-not-allowed')) return new StoreError('تسجيل الدخول غير مفعّل بعد في Firebase (راجعي دليل الإعداد)');
  if (code.includes('permission-denied')) return new StoreError('لا توجد صلاحية لهذه العملية (راجعي قواعد الحماية في دليل الإعداد)');
  return new StoreError('حدث خطأ غير متوقع: ' + (e?.message || code));
}

// ======================= Firebase =======================
class FirebaseStore {
  constructor() { this.mode = 'firebase'; }

  async init() {
    const fb = await import('../vendor/firebase.js');
    this.fb = fb;
    this.app = fb.initializeApp(activeConfig());
    this.auth = fb.getAuth(this.app);
    this.db = fb.getFirestore(this.app);
    if (/[?&]emulator=1/.test(location.search)) {
      fb.connectAuthEmulator(this.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      fb.connectFirestoreEmulator(this.db, '127.0.0.1', 8080);
    }
    await new Promise((resolve) => { const un = fb.onAuthStateChanged(this.auth, () => { un(); resolve(); }); });
  }

  d(...path) { return this.fb.doc(this.db, ...path); }

  async studentEmail(name) {
    return `s${(await sha256Hex(normalizeName(name))).slice(0, 24)}@${STUDENT_DOMAIN}`;
  }

  async currentStudent() {
    const u = this.auth.currentUser;
    if (!u || u.email === TEACHER_EMAIL) return null;
    const snap = await this.fb.getDoc(this.d('students', u.uid));
    return snap.exists() ? snap.data() : { uid: u.uid, needsProfile: true };
  }

  async signUp(name, pin, team) {
    name = validateName(name); pin = validatePin(pin);
    let cred;
    try {
      cred = await this.fb.createUserWithEmailAndPassword(this.auth, await this.studentEmail(name), pinToPassword(pin));
    } catch (e) { throw friendlyAuthError(e); }
    return this.createProfile(cred.user.uid, name, pin, team);
  }

  async createProfile(uid, name, pin, team) {
    const p = emptyProfile(uid, name, team, pin);
    try {
      const b = this.fb.writeBatch(this.db);
      b.set(this.d('students', uid), p);
      b.set(this.d('leaderboard', uid), lbEntry(p));
      await b.commit();
    } catch (e) { throw friendlyAuthError(e); }
    return p;
  }

  async signIn(name, pin) {
    name = validateName(name); pin = validatePin(pin);
    try {
      await this.fb.signInWithEmailAndPassword(this.auth, await this.studentEmail(name), pinToPassword(pin));
    } catch (e) {
      const err = friendlyAuthError(e);
      // Firebase لا يفرّق بين «لا يوجد حساب» و«الرمز خطأ» لأسباب أمنية
      if (err.message.includes('غير صحيح')) err.code = 'not-found-or-wrong-pin';
      throw err;
    }
    const p = await this.currentStudent();
    if (p?.needsProfile) Object.assign(p, { name, pin });
    return p;
  }

  async signOut() { await this.fb.signOut(this.auth); }

  async saveRound(profile, round) {
    const next = applyRound(profile, round);
    const uid = profile.uid;
    try {
      const b = this.fb.writeBatch(this.db);
      b.set(this.d('students', uid, 'rounds', round.id), round);
      b.set(this.d('students', uid), next);
      b.set(this.d('leaderboard', uid), lbEntry(next));
      await b.commit();
    } catch (e) { throw friendlyAuthError(e); }
    return next;
  }

  async leaderboard() {
    const snap = await this.fb.getDocs(this.fb.collection(this.db, 'leaderboard'));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  }

  async customQuestions({ includeDisabled = false } = {}) {
    try {
      const snap = await this.fb.getDocs(this.fb.collection(this.db, 'questions'));
      return snap.docs.map((d) => ({ ...d.data(), id: 'c-' + d.id, docId: d.id, builtIn: false }))
        .filter((q) => includeDisabled || q.enabled !== false);
    } catch { return []; }
  }

  // ---------- المعلمة ----------
  isTeacher() { return this.auth.currentUser?.email === TEACHER_EMAIL; }
  async teacherSignIn(password) {
    try { await this.fb.signInWithEmailAndPassword(this.auth, TEACHER_EMAIL, password); }
    catch (e) {
      const err = friendlyAuthError(e);
      if (err.message.includes('غير صحيح')) throw new StoreError('كلمة المرور غير صحيحة');
      throw err;
    }
  }
  async changeTeacherPassword(pw) {
    try { await this.fb.updatePassword(this.auth.currentUser, pw); }
    catch (e) {
      if (String(e?.code).includes('requires-recent-login')) throw new StoreError('سجّلي الخروج ثم الدخول من جديد، ثم أعيدي المحاولة');
      throw friendlyAuthError(e);
    }
  }
  async listStudents() {
    const snap = await this.fb.getDocs(this.fb.collection(this.db, 'students'));
    return snap.docs.map((d) => d.data());
  }
  async listRounds(uid) {
    const q = this.fb.query(this.fb.collection(this.db, 'students', uid, 'rounds'), this.fb.orderBy('finishedAt', 'desc'));
    const snap = await this.fb.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async setStudentTeam(uid, team) {
    const b = this.fb.writeBatch(this.db);
    b.update(this.d('students', uid), { team });
    b.update(this.d('leaderboard', uid), { team });
    await b.commit();
  }
  async deleteStudent(uid) {
    const rounds = await this.fb.getDocs(this.fb.collection(this.db, 'students', uid, 'rounds'));
    const b = this.fb.writeBatch(this.db);
    rounds.docs.forEach((r) => b.delete(r.ref));
    b.delete(this.d('students', uid));
    b.delete(this.d('leaderboard', uid));
    await b.commit();
  }
  async addQuestion(q) {
    const ref = await this.fb.addDoc(this.fb.collection(this.db, 'questions'), { ...q, enabled: true, createdAt: Date.now() });
    return ref.id;
  }
  async updateQuestion(docId, patch) { await this.fb.updateDoc(this.d('questions', docId), patch); }
  async deleteQuestion(docId) { await this.fb.deleteDoc(this.d('questions', docId)); }
}

// ======================= الوضع التجريبي (على هذا الجهاز فقط) =======================
const LS_KEY = 'abtal-demo-db-v1';
export const DEMO_TEACHER_PASSWORD = '123456';

class LocalStore {
  constructor() { this.mode = 'local'; }
  load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  }
  save(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch {} }
  get db() {
    const db = this.load();
    db.users ||= {}; db.students ||= {}; db.rounds ||= {}; db.leaderboard ||= {}; db.questions ||= {};
    return db;
  }
  async init() {}
  async currentStudent() {
    const db = this.db; const uid = db.session;
    if (!uid || uid === 'teacher') return null;
    return db.students[uid] || null;
  }
  async signUp(name, pin, team) {
    name = validateName(name); pin = validatePin(pin);
    const db = this.db; const key = normalizeName(name);
    if (db.users[key]) throw new StoreError('هذا الاسم مسجّل من قبل برمز سري مختلف. ارجعي وتأكدي من الرمز، أو أضيفي اسم العائلة إن لم يكن هذا حسابك.', 'name-taken');
    const uid = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    db.users[key] = { uid, pin };
    const p = emptyProfile(uid, name, team, pin);
    db.students[uid] = p; db.leaderboard[uid] = lbEntry(p); db.session = uid;
    this.save(db); return p;
  }
  async signIn(name, pin) {
    name = validateName(name); pin = validatePin(pin);
    const db = this.db; const u = db.users[normalizeName(name)];
    if (!u) throw new StoreError('لم نجد حسابًا بهذا الاسم', 'not-found');
    if (u.pin !== pin) throw new StoreError('الرمز السري غير صحيح، حاولي مرة أخرى', 'wrong-pin');
    db.session = u.uid; this.save(db);
    return db.students[u.uid] || { uid: u.uid, needsProfile: true, name, pin };
  }
  async createProfile(uid, name, pin, team) {
    const db = this.db; const p = emptyProfile(uid, name, team, pin);
    db.students[uid] = p; db.leaderboard[uid] = lbEntry(p); this.save(db); return p;
  }
  async signOut() { const db = this.db; delete db.session; this.save(db); }
  async saveRound(profile, round) {
    const db = this.db; const next = applyRound(profile, round);
    (db.rounds[profile.uid] ||= []).push({ ...round });
    db.students[profile.uid] = next; db.leaderboard[profile.uid] = lbEntry(next);
    this.save(db); return next;
  }
  async leaderboard() { return Object.entries(this.db.leaderboard).map(([uid, v]) => ({ uid, ...v })); }
  async customQuestions({ includeDisabled = false } = {}) {
    return Object.entries(this.db.questions).map(([docId, q]) => ({ ...q, id: 'c-' + docId, docId, builtIn: false }))
      .filter((q) => includeDisabled || q.enabled !== false);
  }
  isTeacher() { return this.db.session === 'teacher'; }
  async teacherSignIn(password) {
    const db = this.db;
    if (password !== (db.teacherPassword || DEMO_TEACHER_PASSWORD)) throw new StoreError('كلمة المرور غير صحيحة');
    db.session = 'teacher'; this.save(db);
  }
  async changeTeacherPassword(pw) { const db = this.db; db.teacherPassword = pw; this.save(db); }
  async listStudents() { return Object.values(this.db.students); }
  async listRounds(uid) { return [...(this.db.rounds[uid] || [])].sort((a, b) => b.finishedAt - a.finishedAt); }
  async setStudentTeam(uid, team) {
    const db = this.db; db.students[uid].team = team; db.leaderboard[uid].team = team; this.save(db);
  }
  async deleteStudent(uid) {
    const db = this.db;
    delete db.students[uid]; delete db.leaderboard[uid]; delete db.rounds[uid];
    this.save(db);
  }
  async addQuestion(q) {
    const db = this.db; const id = 'q' + Date.now().toString(36);
    db.questions[id] = { ...q, enabled: true, createdAt: Date.now() }; this.save(db); return id;
  }
  async updateQuestion(docId, patch) { const db = this.db; Object.assign(db.questions[docId], patch); this.save(db); }
  async deleteQuestion(docId) { const db = this.db; delete db.questions[docId]; this.save(db); }
}

const USE_EMULATOR = typeof location !== 'undefined' && /[?&]emulator=1/.test(location.search);
const activeConfig = () => firebaseConfig || (USE_EMULATOR ? { apiKey: 'demo-key', projectId: 'demo-abtal', authDomain: 'demo-abtal.firebaseapp.com' } : null);
export const isFirebaseConfigured = () => { const c = activeConfig(); return !!(c && c.apiKey && c.projectId); };

let storePromise;
export function getStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const s = isFirebaseConfigured() ? new FirebaseStore() : new LocalStore();
      await s.init();
      return s;
    })();
  }
  return storePromise;
}
