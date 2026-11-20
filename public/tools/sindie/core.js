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

// 32 位随机字（页面用）。
export const cryptoWord = () => crypto.getRandomValues(new Uint32Array(1))[0];

// 用 32 位随机字取 0..limit-1 的等概率整数，拒绝采样无取模偏差。
function uniform(limit, word) {
  const cutoff = 2 ** 32 - (2 ** 32 % limit);
  let w;
  do w = word(); while (w >= cutoff);
  return w % limit;
}

// history：最近的结果下标（0–6），只看最后两项。word：随机字来源，API 传入按小时确定的来源。
export function nextFace(history = [], word = cryptoWord) {
  const [a, b] = history.slice(-2);
  const face = uniform(7, word);
  if (history.length < 2 || a !== b || face !== a) return face;
  const other = uniform(6, word);
  return other >= a ? other + 1 : other;
}
