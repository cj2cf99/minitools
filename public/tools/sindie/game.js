import { FACES } from './core.js';
import { add, mul, dot, unit, apply, qmat, verts, faces, restPose, restOn, planRoll, sample } from './motion.js';

// 告解骰：点击后先定结果（不显示），整段动画收束到结果面朝上，落定后再揭示。
const EMBLEMS = [
  'M4 17 3 8l5 4 4-7 4 7 5-4-1 9zM4 20h16',                                   // 冠冕：傲慢
  'M7 9a5 2 0 1 0 10 0a5 2 0 1 0-10 0M7 9v4c0 1.1 2.2 2 5 2s5-.9 5-2V9m-10 4v4c0 1.1 2.2 2 5 2s5-.9 5-2v-4', // 钱币：贪婪
  'M12 21v-7m0 0c-3 0-5-2-5-5 2 0 3 .6 3 .6S10 5 12 3c2 2 2 6.6 2 6.6s1-.6 3-.6c0 3-2 5-5 5zm-3 4c-1-1-3-1-4 0m10 2c1-1 3-1 4 0', // 玫瑰：色欲
  'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', // 眼：嫉妒
  'M6 3h12c0 6-2.7 9-6 9s-6-3-6-9zm6 9v6m-4 3h8m-4-3v3',                     // 圣杯：暴食
  'M12 22c4 0 7-2.6 7-6.5 0-4-3-5.5-3-9.5-2 1-3 3-3 5-1.5-1.5-2-4-1.5-8C8 5 5 9.5 5 15.5 5 19.4 8 22 12 22z', // 火焰：暴怒
  'M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22m10 0c0-6-10-6-10-10s10-4 10-10', // 沙漏：懒惰
];

// ---------- 画布与镜头 ----------
const canvas = document.getElementById('stage'), ctx = canvas.getContext('2d');
const PHI = 62 * Math.PI / 180, SP = Math.sin(PHI), CP = Math.cos(PHI), CAM = [0, -CP, SP], LIGHT = unit([.15, .35, 1]);
let W = 0, Ht = 0, DPR = 1, K = 60, CX = 0, CY = 0;
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; Ht = innerHeight;
  canvas.width = W * DPR; canvas.height = Ht * DPR;
  K = Math.min(W, Ht) * (W < 600 ? .13 : .09); CX = W / 2; CY = Ht * (W < 600 ? .42 : .46);
  const root = document.documentElement.style;
  root.setProperty('--u', K + 'px'); root.setProperty('--cy', CY + 'px'); root.setProperty('--sin', SP);
}
addEventListener('resize', resize); resize();
function project(p) {
  const f = 16 / (16 - (-p[1] * CP + p[2] * SP));
  return [CX + p[0] * K * f, CY - (p[1] * SP + p[2] * CP) * K * f];
}

// ---------- 材质（取自 CSS 变量） ----------
let mat = {};
const probe = document.createElement('canvas').getContext('2d');
function rgb(c) { probe.fillStyle = '#000'; probe.fillStyle = c; const h = probe.fillStyle; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function readMaterial() {
  const s = getComputedStyle(document.body), v = n => s.getPropertyValue(n).trim();
  mat = { lit: rgb(v('--die-lit')), shade: rgb(v('--die-shade')), edge: v('--die-edge'), ink: v('--die-ink'), gild: v('--gild'), ray: v('--ray').split(/\s+/).map(Number) };
}

// ---------- 状态 ----------
const history = [];
let quat = restPose(faces[0], .12), pos = restOn(quat), plan = null, t = 0, landed = 0, top = null, glow = 0, shake = 0;
const dust = [], motes = Array.from({ length: 46 }, () => ({ x: Math.random() * 2 - 1, y: Math.random(), s: Math.random(), p: Math.random() * 6 }));

function land(i) {
  const count = [22, 12, 7, 3][i];
  for (let n = 0; n < count; n++) {
    const a = Math.random() * Math.PI * 2, v = (.6 + Math.random()) * (1.6 - i * .3);
    dust.push({ x: pos[0], y: pos[1], z: .02, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: Math.random() * .9, life: 1, size: .04 + Math.random() * .07 });
  }
  dust.push({ ring: true, x: pos[0], y: pos[1], life: 1, r: .6, grow: 2.6 - i * .5 });
  if (i === 0) shake = 1;
}

function reveal() {
  const f = FACES[plan.sin];
  top = plan.face; plan = null; glow = 0;
  document.getElementById('emblem').setAttribute('d', EMBLEMS[f.n - 1]);
  document.getElementById('numeral').textContent = f.numeral;
  const latin = document.getElementById('latin');
  latin.innerHTML = [...f.latin].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('');
  latin.setAttribute('aria-label', f.latin);
  document.getElementById('zh').textContent = f.zh;
  document.body.dataset.phase = 'reveal';
  cast.disabled = false;
}

// ---------- 绘制 ----------
function draw(now) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, Ht);
  if (shake > 0) ctx.translate((Math.random() - .5) * 10 * shake, (Math.random() - .5) * 8 * shake);
  const [r, g, b] = mat.ray, tint = a => `rgb(${r} ${g} ${b} / ${a})`;

  for (const m of motes) { // 光柱中的浮尘
    m.y -= .00025 + m.s * .0004; if (m.y < 0) { m.y = 1; m.x = Math.random() * 2 - 1; }
    const spread = .25 + m.y * .75;
    ctx.fillStyle = tint((.15 + .45 * m.s) * (.5 + .5 * Math.sin(now / 700 + m.p)));
    ctx.beginPath(); ctx.arc(CX + m.x * K * 3.2 * spread, m.y * (CY + K), .6 + m.s * 1.4, 0, 7); ctx.fill();
  }

  const lift = Math.max(0, pos[2] - .4); // 投影：越高越淡越大
  const [sx, sy] = project([pos[0] + lift * .15, pos[1] + lift * .25, 0]), sr = K * 1.3 * (1 + lift * .25);
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, SP);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
  sg.addColorStop(0, `rgb(0 0 0 / ${.6 / (1 + lift)})`); sg.addColorStop(1, 'rgb(0 0 0 / 0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, sr, 0, 7); ctx.fill(); ctx.restore();

  for (const d of dust) { // 尘埃与落地环
    if (d.ring) {
      const [x, y] = project([d.x, d.y, 0]);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, SP);
      ctx.strokeStyle = tint(d.life * .5); ctx.lineWidth = 1.5 * d.life;
      ctx.beginPath(); ctx.arc(0, 0, K * (d.r + (1 - d.life) * d.grow), 0, 7); ctx.stroke(); ctx.restore();
    } else {
      const [x, y] = project([d.x, d.y, d.z]);
      ctx.fillStyle = tint(d.life * .45);
      ctx.beginPath(); ctx.arc(x, y, K * d.size * (1.6 - d.life * .6), 0, 7); ctx.fill();
    }
  }

  // 骰子：凸体只画朝向镜头的面，无需排序
  const m = qmat(quat), screen = verts.map(v => project(add(apply(m, v), pos)));
  ctx.lineJoin = 'round';
  for (const f of faces) {
    const n = apply(m, f.n);
    if (dot(n, CAM) <= 0) continue;
    const lam = Math.max(0, dot(n, LIGHT)), spec = Math.max(0, dot(n, unit(add(LIGHT, CAM)))) ** 24, l = .22 + .78 * lam;
    const col = mat.lit.map((c, i) => Math.min(255, Math.round(mat.shade[i] + (c - mat.shade[i]) * l + 128 * spec)));
    ctx.beginPath();
    f.idx.forEach((i, j) => j ? ctx.lineTo(...screen[i]) : ctx.moveTo(...screen[i]));
    ctx.closePath();
    ctx.fillStyle = `rgb(${col.join(' ')})`; ctx.fill();
    ctx.strokeStyle = mat.edge; ctx.globalAlpha = .55 + .45 * lam; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
    // 刻字：把面的局部坐标（右 = r，下 = -u）映射成屏幕仿射
    const c = add(apply(m, add(f.c, mul(f.u, -.1))), pos), o = project(c);
    const ex = project(add(c, apply(m, f.r))), ey = project(add(c, apply(m, mul(f.u, -1))));
    const lit = f === top && !plan && glow > 0;
    ctx.save();
    ctx.transform(ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]);
    ctx.scale(.01, .01);
    ctx.font = '600 34px "Palatino Linotype", "Book Antiqua", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = FACES[f.sin].numeral;
    ctx.fillStyle = `rgb(255 255 255 / ${.3 * lam})`; ctx.fillText(label, 1.4, 1.8);
    if (lit) { ctx.shadowColor = mat.gild; ctx.shadowBlur = 18 * glow; }
    ctx.fillStyle = lit ? mat.gild : mat.ink; ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (plan) {
    t += dt;
    const s = sample(plan, t);
    pos = s.pos; quat = s.quat;
    while (landed < s.landed) land(landed++);
    if (s.done) reveal();
  }
  for (const d of dust) {
    d.life -= dt * (d.ring ? 1.6 : 1.4);
    if (!d.ring) { d.x += d.vx * dt; d.y += d.vy * dt; d.z = Math.max(0, d.z + d.vz * dt); d.vz -= 2.2 * dt; d.vx *= .94; d.vy *= .94; }
  }
  for (let i = dust.length - 1; i >= 0; i--) if (dust[i].life <= 0) dust.splice(i, 1);
  shake = Math.max(0, shake - dt * 4);
  if (top && !plan) glow = Math.min(1, glow + dt * 1.5);
  draw(now);
  requestAnimationFrame(frame);
}

// ---------- 交互 ----------
const cast = document.getElementById('cast');
cast.addEventListener('click', () => {
  if (plan) return;
  cast.disabled = true; top = null; glow = 0; t = 0; landed = 0;
  document.body.dataset.phase = 'rolling';
  plan = planRoll(history, pos, quat); // 结果在此刻已定
  history.push(plan.sin); if (history.length > 2) history.shift();
});

readMaterial();
requestAnimationFrame(frame);
