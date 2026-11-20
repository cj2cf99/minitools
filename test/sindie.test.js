import test from 'node:test';
import assert from 'node:assert/strict';
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
