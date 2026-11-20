import test from 'node:test';
import assert from 'node:assert/strict';
import { faces, verts, qmat, apply, dot, lowest, restPose, restOn, planRoll, sample, DURATION, GATHER } from '../public/tools/sindie/motion.js';

test('D14 has 14 planar outward faces, two per sin', () => {
  assert.equal(faces.length, 14);
  for (let s = 0; s < 7; s++) assert.equal(faces.filter(f => f.sin === s).length, 2);
  for (const f of faces) {
    for (const i of f.idx) assert.ok(Math.abs(dot(f.n, verts[i]) - dot(f.n, f.c)) < 1e-9);
    assert.ok(dot(f.n, f.c) > 0);
  }
});

test('rest pose puts the face up with its numeral pointing away from the camera', () => {
  for (const f of faces) {
    const m = qmat(restPose(f, 0));
    assert.ok(dot(apply(m, f.n), [0, 0, 1]) > 1 - 1e-9);
    assert.ok(dot(apply(m, f.u), [0, 1, 0]) > 1 - 1e-9);
  }
});

test('every throw ends resting on the decided face, touching the table', () => {
  let q = restPose(faces[0]), pos = restOn(q);
  const history = [];
  for (let n = 0; n < 300; n++) {
    const plan = planRoll(history, pos, q);
    history.push(plan.sin); if (history.length > 2) history.shift();
    let landed = 0, s;
    for (let t = 0; ; t += 1 / 60) {
      s = sample(plan, t);
      assert.ok(s.pos[2] + lowest(qmat(s.quat)) >= -1e-9, 'never sinks into the table');
      assert.ok(s.landed >= landed); landed = s.landed;
      if (t > GATHER) assert.ok(Math.abs(Math.hypot(...s.quat) - 1) < 1e-9);
      if (s.done) break;
      assert.ok(t < DURATION + .1);
    }
    assert.equal(landed, 4);
    const m = qmat(s.quat);
    const up = faces.reduce((best, f) => (apply(m, f.n)[2] > apply(m, best.n)[2] ? f : best));
    assert.equal(up, plan.face);
    assert.equal(up.sin, plan.sin);
    assert.ok(apply(m, up.n)[2] > .9999);
    assert.ok(Math.abs(s.pos[2] + lowest(m)) < 1e-9);
    q = s.quat; pos = s.pos;
  }
});
