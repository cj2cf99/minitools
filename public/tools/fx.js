export const CURRENCIES = [
	{ code: 'JPY', name: '日元', symbol: '¥', flag: 'JP', digits: 0 },
	{ code: 'USD', name: '美元', symbol: '$', flag: 'US', digits: 2 },
	{ code: 'CNY', name: '人民币', symbol: '¥', flag: 'CN', digits: 2 },
];
const DIGITS = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.digits]));
const REFRESH_MS = 60_000;

/** 空串返回 null，非法或超大返回 NaN，否则返回数字。支持千分位和全角数字。 */
export function parseAmount(text) {
	const s = text.normalize('NFKC').replace(/[,\s]/g, '');
	if (s === '') return null;
	if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
	const n = Number(s);
	return n < 1e15 ? n : NaN;
}

export const roundTo = (n, code) => Number(n.toFixed(DIGITS[code]));

/** 先按来源币种精度取整，再经美元换算；rates 为每 1 美元的各币种数额。 */
export function convert(amount, from, rates) {
	const usd = roundTo(amount, from) / rates[from];
	return Object.fromEntries(Object.keys(rates).map((code) =>
		[code, code === from ? roundTo(amount, from) : roundTo(usd * rates[code], code)]));
}

export const formatAmount = (n, code) =>
	n.toLocaleString('en-US', { minimumFractionDigits: DIGITS[code], maximumFractionDigits: DIGITS[code] });

const timeJst = (ms) => new Date(ms).toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function trend(pct) {
	if (pct == null) return '';
	const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : '';
	return `<b class="trend ${cls}">${pct > 0 ? '▲' : pct < 0 ? '▼' : '·'} ${Math.abs(pct).toFixed(2)}%</b>`;
}

export function mount(root) {
	root.innerHTML = `<section class="fx">
		<div class="fields">${CURRENCIES.map((c) => `
			<label class="field" data-code="${c.code}">
				<span class="flag flag-${c.flag}">${c.flag}</span>
				<span class="unit"><b>${c.name}</b><small>${c.code}</small></span>
				<span class="amount"><em>${c.symbol}</em><input inputmode="decimal" autocomplete="off" placeholder="0" aria-label="${c.name}金额" disabled></span>
			</label>`).join('')}
		</div>
		<div class="rates" aria-live="polite">
			<div class="rates-head">
				<span class="live" data-state="loading"><i></i><span class="live-text">—</span></span>
				<button class="refresh" type="button" title="刷新汇率" aria-label="刷新汇率"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14-4.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.5l2-2.5M20 20v-5h-5"/></svg></button>
			</div>
			<div class="rate"><small>USD/JPY</small><b data-rate="jpy" class="skeleton">000.00</b><span data-trend="jpy"></span></div>
			<div class="rate"><small>USD/CNY</small><b data-rate="cny" class="skeleton">0.0000</b><span data-trend="cny"></span></div>
			<div class="rate"><small>100 JPY/CNY</small><b data-rate="cross" class="skeleton">0.0000</b><span></span></div>
		</div>
	</section>`;

	const fields = Object.fromEntries([...root.querySelectorAll('.field')].map((el) => [el.dataset.code, el]));
	const inputOf = (code) => fields[code].querySelector('input');
	const live = root.querySelector('.live');
	const refreshBtn = root.querySelector('.refresh');
	let rates = null;
	let source = null; // 最后编辑的币种；换算只从它出发，赋 value 不触发 input 事件，因此不会循环

	function recalc() {
		if (!rates || !source) return;
		const amount = parseAmount(inputOf(source).value);
		fields[source].classList.toggle('invalid', Number.isNaN(amount));
		const result = amount === null || Number.isNaN(amount) ? null : convert(amount, source, rates);
		for (const { code } of CURRENCIES) {
			if (code === source) continue;
			const input = inputOf(code);
			const next = result ? formatAmount(result[code], code) : '';
			if (input.value === next) continue;
			input.value = next;
			fields[code].classList.remove('invalid', 'flash');
			void input.offsetWidth; // 重启闪烁动画
			if (next) fields[code].classList.add('flash');
		}
	}

	function onInput(e) {
		source = e.target.closest('.field').dataset.code;
		recalc();
	}

	function onBlur(e) {
		const code = e.target.closest('.field')?.dataset.code;
		if (!code) return;
		const amount = parseAmount(e.target.value);
		if (code === source && amount !== null && !Number.isNaN(amount)) e.target.value = formatAmount(roundTo(amount, code), code);
	}

	function showRates({ usdjpy, usdcny }) {
		const set = (key, text) => {
			const el = root.querySelector(`[data-rate="${key}"]`);
			el.classList.remove('skeleton');
			if (el.textContent === text) return;
			el.textContent = text;
			el.classList.remove('tick');
			void el.offsetWidth;
			el.classList.add('tick');
		};
		set('jpy', usdjpy.rate.toFixed(3));
		set('cny', usdcny.rate.toFixed(4));
		set('cross', ((usdcny.rate / usdjpy.rate) * 100).toFixed(4));
		root.querySelector('[data-trend="jpy"]').innerHTML = trend(usdjpy.changePct);
		root.querySelector('[data-trend="cny"]').innerHTML = trend(usdcny.changePct);
	}

	let seq = 0;
	async function refresh() {
		const mine = ++seq;
		refreshBtn.classList.add('spin');
		try {
			const res = await fetch('/api/fx', { cache: 'no-store' });
			if (!res.ok) throw Error();
			const data = await res.json();
			if (mine !== seq) return;
			const first = !rates;
			rates = { JPY: data.usdjpy.rate, USD: 1, CNY: data.usdcny.rate };
			showRates(data);
			live.dataset.state = 'ok';
			live.querySelector('.live-text').textContent = `${timeJst(Math.max(data.usdjpy.time, data.usdcny.time))} JST`;
			recalc();
			if (first) {
				for (const { code } of CURRENCIES) inputOf(code).disabled = false;
				inputOf('JPY').focus();
			}
		} catch {
			if (mine !== seq) return;
			live.dataset.state = 'error'; // 保留上次汇率继续算
			live.querySelector('.live-text').textContent = rates ? '刷新失败·旧汇率' : '获取失败';
		} finally {
			if (mine === seq) refreshBtn.classList.remove('spin');
		}
	}

	const onVisible = () => { if (!document.hidden) refresh(); };
	const timer = setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
	root.addEventListener('input', onInput);
	root.addEventListener('focusout', onBlur);
	refreshBtn.addEventListener('click', refresh);
	document.addEventListener('visibilitychange', onVisible);
	refresh();

	return () => {
		seq++;
		clearInterval(timer);
		root.removeEventListener('input', onInput);
		root.removeEventListener('focusout', onBlur);
		document.removeEventListener('visibilitychange', onVisible);
	};
}
