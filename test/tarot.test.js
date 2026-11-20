import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { readTarot } from '../tarot-reading.js';
import major from '../public/tools/magiccard/deck.js';
import minor from '../public/tools/magiccard/minor.js';
import { access } from 'node:fs/promises';
import { TOOLS } from '../public/tools/index.js';

const cards = [0, 22, 77].map((id, i) => ({ id, orientation: i === 1 ? 'reversed' : 'upright' }));
const round = { topic: '前路', cards };
const url = 'https://example.test/api/reading';
const post = (body, headers = {}) => new Request(url, {method:'POST', headers:{'Content-Type':'application/json', ...headers}, body:JSON.stringify(body)});

test('小游戏入口与全套牌面、短片、正逆位释义齐全', async () => {
  assert.deepEqual(TOOLS.filter(t => t.group === 'games').map(t => t.id), ['dice', 'magiccard', 'sindie']);
  assert.equal(major.length, 22);
  assert.equal(minor.length, 56);
  for (const [id, card] of [...major, ...minor].entries()) {
    assert.equal(card.id, id);
    assert.ok(card.upright.meaning && card.reversed.meaning);
    for (const path of [card.art, 'assets/performances/' + String(id).padStart(2,'0') + '.mp4']) {
      await access(new URL('../public/tools/magiccard/' + path, import.meta.url));
    }
  }
});

test('解读接口校验同源、方法、大小和牌阵', async () => {
  for (const [request, status] of [
    [new Request(url), 405], [post(round, {Origin:'https://other.test'}), 403],
    [post(round, {'Content-Type':'text/plain'}), 415], [post('x'.repeat(2200)), 413],
    [post({...round, topic:{}}), 400], [post({...round, cards:[cards[0], cards[0], cards[1]]}), 400],
    [post({...round, cards:[cards[0], cards[1], {id:78, orientation:'upright'}]}), 400],
    [post(round), 503],
  ]) assert.equal((await worker.fetch(request, {})).status, status);
});

test('解读采用同一副牌的本地牌义，模型不支持结构化输出时重试', async () => {
  const calls = [];
  const env = {AI_BASE_URL:'https://model.test/v1', AI_MODEL:'local'};
  const response = await readTarot(post(round), env, async (endpoint, init) => {
    assert.equal(endpoint, env.AI_BASE_URL + '/chat/completions');
    calls.push(JSON.parse(init.body));
    if (calls.length === 1) return new Response(null, {status:422});
    return Response.json({choices:[{message:{content:JSON.stringify({advice:'建议：给自己一点时间。',action:'行动：写下一件小事。'})}}]});
  });
  assert.ok(calls[0].response_format);
  assert.equal(calls[1].response_format, undefined);
  assert.ok(calls[1].messages[1].content.includes(minor[0].reversed.meaning));
  assert.deepEqual(await response.json(), {text:'给自己一点时间。\n\n写下一件小事。'});
});
