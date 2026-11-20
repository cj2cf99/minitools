import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { FACES, nextFace } from '../public/tools/sindie/core.js';

test('never three identical results in a row, all faces appear', () => {
  const history = [];
  const seen = new Set();
  for (let i = 0; i < 20000; i += 1) {
    const face = nextFace(history);
    assert.ok(Number.isInteger(face) && face >= 0 && face < FACES.length);
    if (history.length >= 2) assert.ok(!(history.at(-1) === history.at(-2) && history.at(-1) === face));
    history.push(face);
    seen.add(face);
  }
  assert.equal(seen.size, 7);
});

test('a repeated pair is followed by one of the other six faces', () => {
  for (let face = 0; face < 7; face += 1) {
    for (let i = 0; i < 200; i += 1) assert.notEqual(nextFace([face, face]), face);
  }
});

test('repeats of two are still allowed', () => {
  let pairs = 0;
  for (let i = 0; i < 5000; i += 1) if (nextFace([3]) === 3) pairs += 1;
  assert.ok(pairs > 400 && pairs < 1050);
});

// 改内核时必须同步 subscriptions-api 的副本及其测试中的同一哈希
test('kernel hash matches the copy pinned in subscriptions-api', async () => {
  const text = (await readFile(new URL('../public/tools/sindie/core.js', import.meta.url), 'utf8')).split(String.fromCharCode(13)).join('');
  assert.equal(createHash('sha256').update(text).digest('hex'), 'e9fb9a022f17501d524d9d60e598b62122429edca5358ada972af99f4a6e7fd8');
});

test('a fixed word source gives a fixed result', () => {
  const words = seq => { let i = 0; return () => seq[i++]; };
  assert.equal(nextFace([], words([3])), 3);
  assert.equal(nextFace([2, 2], words([2, 2])), 3); // 三连候选改从其余 6 面取
});
