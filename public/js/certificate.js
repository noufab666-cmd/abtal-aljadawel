// رسم شهادة «بطلة الجداول» على لوحة رسم (Canvas) لحفظها صورة أو طباعتها
import { APP, toAr, fmtDate } from './common.js';

const W = 1600;
const H = 1130;
const NAVY = '#16297a';
const NAVY2 = '#2643a8';
const GOLD = '#d9a400';

function star(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function fitText(ctx, text, maxW, size, weight = 800) {
  let s = size;
  do { ctx.font = `${weight} ${s}px Tajawal, 'Segoe UI', Tahoma, sans-serif`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 20);
}

export async function drawCertificate({ name, team, score, correct, answered, rounds, date }) {
  try {
    await Promise.all([document.fonts.load("800 60px Tajawal"), document.fonts.load("500 30px Tajawal"), document.fonts.load("700 30px Tajawal")]);
  } catch {}
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // الخلفية والإطار
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, NAVY); g.addColorStop(1, NAVY2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 34); ctx.fillRect(0, H - 34, W, 34); ctx.fillRect(0, 0, 34, H); ctx.fillRect(W - 34, 0, 34, H);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 6; ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.strokeRect(78, 78, W - 156, H - 156);
  [[110, 110], [W - 110, 110], [110, H - 110], [W - 110, H - 110]].forEach(([x, y]) => star(ctx, x, y, 22, GOLD));

  // الشعار: علامة الضرب
  ctx.save();
  ctx.translate(W / 2, 175);
  ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = NAVY2; ctx.font = "700 34px Tajawal, sans-serif";
  ctx.fillText('شهادة تميّز', W / 2, 275);
  ctx.fillStyle = NAVY; ctx.font = "800 104px Tajawal, sans-serif";
  ctx.fillText('بطلة الجداول', W / 2, 375);

  ctx.fillStyle = '#334155'; ctx.font = "500 36px Tajawal, sans-serif";
  ctx.fillText('تُمنح هذه الشهادة للطالبة المتميزة', W / 2, 480);

  fitText(ctx, name, 1100, 92);
  ctx.fillStyle = GOLD; ctx.fillText(name, W / 2, 580);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 - 420, 640); ctx.lineTo(W / 2 + 420, 640); ctx.stroke();

  ctx.fillStyle = '#334155'; ctx.font = "500 36px Tajawal, sans-serif";
  ctx.fillText(`من ${team}، لإتمامها رحلة جداول الضرب في لعبة «${APP.title}»`, W / 2, 700);
  const acc = answered ? Math.round((correct / answered) * 100) : 0;
  ctx.fillText(`بإكمال ${toAr(rounds || APP.journeyRounds)} جولة، ومجموع ${toAr(score)} نقطة، ونسبة إجابات صحيحة ${toAr(acc)}٪`, W / 2, 760);
  ctx.fillStyle = NAVY; ctx.font = "700 32px Tajawal, sans-serif";
  ctx.fillText(`التاريخ: ${fmtDate(date)}`, W / 2, 830);

  // التذييل
  ctx.fillStyle = NAVY; ctx.font = "800 36px Tajawal, sans-serif";
  ctx.fillText(APP.initiative, W / 2 + 380, 950);
  ctx.fillText(APP.author, W / 2 - 380, 950);
  ctx.fillStyle = '#64748b'; ctx.font = "500 26px Tajawal, sans-serif";
  ctx.fillText('المبادرة', W / 2 + 380, 1000);
  ctx.fillText('المعلمة', W / 2 - 380, 1000);
  star(ctx, W / 2, 965, 36, GOLD);
  return c;
}
