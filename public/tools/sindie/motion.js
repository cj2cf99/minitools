// 告解骰的几何与抛掷时间线（纯计算，无 DOM）。姿态在终点收束到「结果面朝上」。
import { nextFace } from './core.js';

// ---------- 向量与四元数 ----------
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = a => mul(a, 1 / Math.hypot(...a));
const qmul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const qaxis = (ax, ang) => { const s = Math.sin(ang / 2); return [Math.cos(ang / 2), ax[0] * s, ax[1] * s, ax[2] * s]; };
export const qmat = ([w, x, y, z]) => [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
  [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
export const apply = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
function qfrom(m) {
  const t = m[0][0] + m[1][1] + m[2][2];
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; return [s / 4, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s]; }
  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; return [(m[2][1] - m[1][2]) / s, s / 4, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s]; }
  if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; return [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, s / 4, (m[1][2] + m[2][1]) / s]; }
  const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; return [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, s / 4];
}

// ---------- 七边形偏方面体（D14）：14 个共面风筝面，每罪两面 ----------
const N = 7, A = Math.PI / N, Z0 = .05, H = Z0 * (1 + Math.cos(A)) / (1 - Math.cos(A));
const ring = (k, z, off) => [Math.cos((2 * k + off) * A), Math.sin((2 * k + off) * A), z];
export const verts = [[0, 0, H], [0, 0, -H]];
for (let k = 0; k < N; k++) verts.push(ring(k, Z0, 0));
for (let k = 0; k < N; k++) verts.push(ring(k, -Z0, 1));
const U = k => 2 + (k % N), L = k => 2 + N + (k % N);
export const faces = [];
for (let k = 0; k < N; k++) faces.push({ idx: [0, U(k), L(k), U(k + 1)], sin: k });
for (let k = 0; k < N; k++) faces.push({ idx: [1, L(k), U(k + 1), L(k + 1)], sin: (k + 5) % N });
for (const f of faces) {
  const p = f.idx.map(i => verts[i]);
  f.c = mul(p.reduce(add), 1 / 4);
  let n = unit(cross(sub(p[1], p[0]), sub(p[3], p[0])));
  if (dot(n, f.c) < 0) { n = mul(n, -1); f.idx.reverse(); }
  f.n = n;
  f.u = unit(sub(verts[f.idx.includes(0) ? 0 : 1], f.c)); // 指向顶点 = 数字的「上」
  f.r = cross(f.u, f.n);                                   // 从面外看是「右」
}

// 让面 f 朝上、数字的上方远离镜头（+y），再偏航 yaw
export function restPose(f, yaw = 0) {
  const u2 = [-Math.sin(yaw), Math.cos(yaw), 0], r2 = cross(u2, [0, 0, 1]);
  const T = [u2, r2, [0, 0, 1]], B = [f.u, f.r, f.n];
  return qfrom([0, 1, 2].map(i => [0, 1, 2].map(j => T[0][i] * B[0][j] + T[1][i] * B[1][j] + T[2][i] * B[2][j])));
}
export const lowest = m => Math.min(...verts.map(v => apply(m, v)[2]));
export const restOn = q => [0, 0, -lowest(qmat(q))];

// ---------- 时间线 ----------
export const GATHER = .3;
const FLIGHTS = [.66, .42, .26, .16], PEAKS = [1.15, .66, .25, .08], REACH = [.6, .82, .93, .975], ROLL = .5, WOBBLE = .62;
const THROW = FLIGHTS.reduce((a, b) => a + b) + ROLL;
export const DURATION = GATHER + THROW + WOBBLE;
const easeIn = t => t * t * t, easeOut = t => 1 - (1 - t) ** 3;

// 先由内核定结果，再生成一条收束到该结果的轨迹
export function planRoll(history, from, fromQ, rand = Math.random) {
  const sin = nextFace(history);
  const face = faces.filter(f => f.sin === sin)[rand() < .5 ? 0 : 1];
  const side = rand() < .5 ? -1 : 1;
  const end = [(rand() - .5) * .7, (rand() - .5) * .5, 0];
  const start = [side * (2.4 + rand()), -8, 1.4];
  const dir = unit([end[0] - start[0], end[1] - start[1], 0]);
  return {
    sin, face, from, fromQ, start, end,
    final: restPose(face, (rand() - .5) * .5),
    rollAxis: [-dir[1], dir[0], 0], rollTurns: Math.PI * 2 * (2.6 + rand() * 1.4),
    tumbleAxis: unit([rand() - .5, rand() - .5, rand() - .5]), tumbleTurns: Math.PI * 2 * (1 + rand() * 1.2),
    wobbleAxis: unit([-dir[1] + (rand() - .5), dir[0], 0]),
  };
}

// t 秒时的位置与姿态；landed = 已完成的落地次数
export function sample(plan, t) {
  if (t < GATHER) { // 收回手中：加速向镜头下方离场
    const s = easeIn(t / GATHER);
    return { pos: add(plan.from, mul(sub([plan.from[0] * .5, -7.5, 2.4], plan.from), s)), quat: qmul(qaxis([1, 0, 0], -s * 2.2), plan.fromQ), landed: 0 };
  }
  t -= GATHER;
  let reach = 1, height = 0, acc = 0, prev = 0, landed = FLIGHTS.length;
  for (let i = 0; i < FLIGHTS.length; i++) {
    if (t < acc + FLIGHTS[i]) { // 空中：水平匀速，竖直抛物线
      const s = (t - acc) / FLIGHTS[i];
      reach = prev + (REACH[i] - prev) * s;
      height = i === 0 ? plan.start[2] * (1 - s) + 4 * PEAKS[0] * s * (1 - s) : 4 * PEAKS[i] * s * (1 - s);
      landed = i;
      break;
    }
    acc += FLIGHTS[i]; prev = REACH[i];
  }
  if (landed === FLIGHTS.length) reach = prev + (1 - prev) * easeOut(Math.min(1, (t - acc) / ROLL));
  const ground = add(plan.start, mul(sub(plan.end, plan.start), reach));
  // 三项旋转在终点同时归零，所以必然停在结果面
  const roll = -plan.rollTurns * (1 - Math.min(1, t / THROW)) ** 2.4;
  const tumble = -plan.tumbleTurns * (1 - Math.min(1, t / (FLIGHTS[0] + FLIGHTS[1]))) ** 2;
  const w = Math.max(0, t - THROW);
  const wobble = w > 0 ? .24 * Math.exp(-5.5 * w) * Math.sin(17 * w) * (1 - Math.min(1, w / WOBBLE)) : 0;
  const quat = qmul(qaxis(plan.wobbleAxis, wobble), qmul(qaxis(plan.rollAxis, roll), qmul(qaxis(plan.tumbleAxis, tumble), plan.final)));
  return { pos: [ground[0], ground[1], height - lowest(qmat(quat))], quat, landed, done: w >= WOBBLE };
}
