# أبطال الجداول

لعبة تعليمية تفاعلية لجداول الضرب (٠، ١، ٢، ٤، ٥، ١٠) لطالبات الصف الثالث الابتدائي.
**Smart Math | رياضيات بذكاء** — إعداد أ. نوف الحربي.

- رابط اللعبة (بعد النشر): https://noufab666-cmd.github.io/abtal-aljadawel/
- لوحة المعلمة: https://noufab666-cmd.github.io/abtal-aljadawel/teacher.html
- خطوات الإعداد والنشر بلغة بسيطة: [docs/دليل-النشر.md](docs/دليل-النشر.md)

## محتويات المشروع
| المسار | الوصف |
|---|---|
| `public/` | ملفات اللعبة المنشورة (HTML/CSS/JS بدون أدوات بناء) |
| `public/data/questions.json` | بنك الأسئلة الأساسي (١٢٠ سؤالًا) كما هو دون تعديل |
| `public/js/firebase-config.js` | إعدادات Firebase (إن كانت `null` تعمل اللعبة في وضع تجريبي محلي) |
| `firestore.rules` | قواعد حماية قاعدة البيانات |
| `.github/workflows/pages.yml` | النشر التلقائي على GitHub Pages عند التحديث في الفرع `main` |

## للتجربة على الحاسب
```bash
npm install
npm start                     # يفتح اللعبة على http://127.0.0.1:5173 (وضع تجريبي)
npm run emulators             # (اختياري) محاكي Firebase، ثم افتحي الرابط مع ?emulator=1
```
