// 告解骰内核：页面与 subscriptions-api 共用，复制时保持原样。
// 七面等概率；若会与前两次连成三次相同，就从其余 6 面重抽。
export const FACES = [
  { n: 1, numeral: 'I', latin: 'SVPERBIA', zh: '傲慢' },
  { n: 2, numeral: 'II', latin: 'AVARITIA', zh: '贪婪' },
  { n: 3, numeral: 'III', latin: 'LVXVRIA', zh: '色欲' },
  { n: 4, numeral: 'IV', latin: 'INVIDIA', zh: '嫉妒' },
  { n: 5, numeral: 'V', latin: 'GVLA', zh: '暴食' },
  { n: 6, numeral: 'VI', latin: 'IRA', zh: '暴怒' },
  { n: 7, numeral: 'VII', latin: 'ACEDIA', zh: '懒惰' },
];

function uniform(limit) {
  const word = new Uint32Array(1);
  const cutoff = 2 ** 32 - (2 ** 32 % limit);
  do crypto.getRandomValues(word); while (word[0] >= cutoff);
  return word[0] % limit;
}

// history：最近的结果下标（0–6），只看最后两项。返回新的下标。
export function nextFace(history = []) {
  const [a, b] = history.slice(-2);
  const face = uniform(7);
  if (history.length < 2 || a !== b || face !== a) return face;
  const other = uniform(6);
  return other >= a ? other + 1 : other;
}
