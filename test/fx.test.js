import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, convert, formatAmount } from '../public/tools/fx.js';

const rates = { JPY: 150, USD: 1, CNY: 7 };

test('parseAmount 区分空、合法、非法', () => {
	assert.equal(parseAmount(''), null);
	assert.equal(parseAmount('1,234.5'), 1234.5);
	assert.equal(parseAmount('１２３．５'), 123.5);
	assert.equal(parseAmount('12.'), 12);
	assert.equal(parseAmount('.5'), 0.5);
	for (const bad of ['.', '1.2.3', '-1', '12a', '1e3', '9'.repeat(16)]) assert.ok(Number.isNaN(parseAmount(bad)), bad);
});

test('convert 日元无小数，美元人民币两位', () => {
	assert.deepEqual(convert(1000, 'JPY', rates), { JPY: 1000, USD: 6.67, CNY: 46.67 });
	assert.deepEqual(convert(10.5, 'USD', rates), { JPY: 1575, USD: 10.5, CNY: 73.5 });
	assert.deepEqual(convert(7, 'CNY', rates), { JPY: 150, USD: 1, CNY: 7 });
});

test('convert 来源金额先按本币精度取整', () => {
	assert.equal(convert(1000.6, 'JPY', rates).JPY, 1001);
	assert.equal(convert(1.239, 'USD', rates).USD, 1.24);
});

test('formatAmount 千分位与固定小数', () => {
	assert.equal(formatAmount(1234567, 'JPY'), '1,234,567');
	assert.equal(formatAmount(1234.5, 'USD'), '1,234.50');
});
